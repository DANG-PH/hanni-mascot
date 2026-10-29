#!/usr/bin/env python3
"""Build four-cel looping animations. No generated in-between frames."""
from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

from source_images import clean_cell, remove_blue_chroma

ROOT = Path(__file__).resolve().parents[1]

# A -> B -> C -> B is a four-cel outward/return cycle. The return cel is
# intentionally reused, so 4->1 is the same small step as 1->2, reversed.
EMOTES = {
    "e00-nghi": {"poses": [0, 2, 3, 2], "timing": [900, 80, 100, 80]},
    "e01-chao": {"poses": [4, 5, 6, 5], "timing": [150]*4},
    "e02-suy-nghi": {"poses": [4, 5, 6, 5], "timing": [300]*4},
    "e10-doc-mau": {"poses": [3, 4, 5, 4], "timing": [130]*4},
    "e39-ghi-chu": {"poses": [4, 5, 4, 5], "timing": [200]*4},
    "e42-cham-chu": {"poses": [3, 4, 5, 4], "timing": [200]*4},
}
AVATARS = {
    "a1-vui": [0, 1, 0, 1], "a2-suy-nghi": [2, 3, 2, 3],
    "a3-ngac-nhien": [4, 5, 4, 5], "a4-tiec": [6, 7, 6, 7],
}
BUTTONS = ["n1-nghi", "n2-lo-len-chao", "n3-duoc-cham", "n4-thut-xuong", "n5-lo-lai", "n6-co-tin-moi", "n7-dang-tra-loi"]


def png(image, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, optimize=True)


def load_sheet(path):
    image = Image.open(path).convert("RGBA")
    cells = []
    for index in range(9):
        column, row = index % 3, index // 3
        crop = image.crop((round(column*image.width/3), round(row*image.height/3), round((column+1)*image.width/3), round((row+1)*image.height/3)))
        cells.append(clean_cell(remove_blue_chroma(crop)))
    return cells


def plate_frames(cells, sequence):
    selected = [cells[index].convert("RGBA") for index in sequence]
    first = selected[0]
    # All cels use one transform, obtained from the first cel. The alpha
    # bounds of later cels never independently determine their scale.
    alpha = np.asarray(first.getchannel("A"))
    _, labels, stats, _ = cv2.connectedComponentsWithStats(np.uint8(alpha > 100))
    main = stats[1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])]
    x, y, width, height = map(int, main[:4])
    scale = 410 / height
    normalized = []
    for image in selected:
        array = np.asarray(image)
        opaque = np.uint8(array[..., 3] > 100)
        ys, xs = np.where(opaque)
        top, bottom = ys.min(), ys.max() + 1
        head = opaque.copy()
        head[round(top + (bottom-top)*.39):] = 0
        _, head_x = np.where(head)
        center = (head_x.min() + head_x.max()) / 2
        transform = np.float32([[scale, 0, 256 - center*scale], [0, scale, 471 - bottom*scale]])
        moved = cv2.warpAffine(array, transform, (512, 512), flags=cv2.INTER_CUBIC)
        normalized.append(Image.fromarray(moved))
    return normalized


def export_cycle(frames, folder, slug, timing, sizes):
    atlases = {}
    for size in sizes:
        resized = [frame.resize((size, size), Image.Resampling.LANCZOS) for frame in frames]
        for index, frame in enumerate(resized):
            png(frame, ROOT/f"assets/{folder}/frames/{slug}@{size}/frame-{index+1:02d}.png")
        png(resized[0], ROOT/f"assets/{folder}/png/hanni-fox-{slug}@{size}.png")
        webp = ROOT/f"assets/{folder}/webp/hanni-fox-{slug}-giu@{size}.webp"
        webp.parent.mkdir(parents=True, exist_ok=True)
        resized[0].save(webp, save_all=True, append_images=resized[1:], duration=timing, loop=0, quality=82, method=4)
        atlas = Image.new("RGBA", (size*4, size))
        for index, frame in enumerate(resized):
            atlas.paste(frame, (index*size, 0))
        atlas_path = ROOT/f"assets/{folder}/atlases/hanni-fox-{slug}@{size}.webp"
        atlas_path.parent.mkdir(parents=True, exist_ok=True)
        atlas.save(atlas_path, lossless=True, method=4, exact=True)
        png(atlas, ROOT/f"assets/{folder}/atlases/hanni-fox-{slug}@{size}.png")
        revision = hashlib.sha256(atlas_path.read_bytes()).hexdigest()[:8]
        atlases[str(size)] = {"src": str(atlas_path.relative_to(ROOT))+"?v="+revision, "size": size, "columns": 4, "count": 4}
    return {"id": "giu", "duration": sum(timing)/1000, "durations_ms": timing, "frames": 4, "loop": True, "atlases": atlases}


def button_frames(slug):
    image = Image.open(ROOT/"assets/assistant-button/source/hanni-fox-n1-nghi.png").convert("RGBA").resize((512, 512))
    # Four small, symmetric cels, using a fixed badge and a moving face only.
    base = np.asarray(image)
    grid_x, grid_y = np.meshgrid(np.arange(512, dtype=np.float32), np.arange(512, dtype=np.float32))
    local = np.exp(-(((grid_x-268)/125)**2 + ((grid_y-180)/100)**2)*2)
    output = []
    amplitude = {"n1-nghi": .4, "n2-lo-len-chao": 2, "n3-duoc-cham": 1.2, "n4-thut-xuong": 2.8, "n5-lo-lai": 2.8}.get(slug, .5)
    phases = [0, 1, 0, -1] if slug not in ["n4-thut-xuong", "n5-lo-lai"] else [0, .5, 1, .5]
    for phase in phases:
        moved = cv2.remap(base, grid_x - phase*amplitude*local, grid_y - phase*amplitude*local, cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT)
        output.append(Image.fromarray(moved))
    return output


def main():
    # Only generated delivery folders are replaced. Source PNGs and sheets stay.
    for folder in ["emotes", "avatars", "assistant-button"]:
        for name in ["frames", "png", "webp", "atlases"]:
            target = ROOT/f"assets/{folder}/{name}"
            if target.exists():
                shutil.rmtree(target)
    manifest = {"frame_count": 4, "playback": "four-cel-loop", "emotes": {}, "avatars": {}, "buttons": {}}
    for slug, config in EMOTES.items():
        cells = load_sheet(ROOT/f"assets/emotes/sheets/hanni-fox-{slug}-sheet.png")
        frames = plate_frames(cells, config["poses"])
        if slug == "e02-suy-nghi":
            for frame, count in zip(frames, [1, 2, 3, 2]):
                overlay = Image.new("RGBA", (512, 512))
                draw = ImageDraw.Draw(overlay)
                for index in range(count):
                    x, y = 100-index*18, 125-index*26
                    draw.ellipse((x-9, y-9, x+9, y+9), fill="#FAEDE1", outline="#E8B25E", width=1)
                frame.alpha_composite(overlay)
        clip = export_cycle(frames, "emotes", slug, config["timing"], [512, 256])
        manifest["emotes"][slug] = {"clips": [clip]}
        print(slug + ": 4 frames", flush=True)
    avatars = load_sheet(ROOT/"assets/avatars/source/hanni-avatar-poses-sheet.png")
    for slug, sequence in AVATARS.items():
        frames = plate_frames(avatars, sequence)
        manifest["avatars"][slug] = export_cycle(frames, "avatars", slug, [500, 90, 500, 90], [128, 64])
    for slug in BUTTONS:
        frames = button_frames(slug)
        if slug in ["n6-co-tin-moi", "n7-dang-tra-loi"]:
            for index, frame in enumerate(frames):
                overlay = Image.new("RGBA", (512, 512))
                draw = ImageDraw.Draw(overlay)
                if slug == "n6-co-tin-moi":
                    radius = [17, 19, 17, 15][index]
                    draw.ellipse((425-radius, 105-radius, 425+radius, 105+radius), fill="#C71E1A", outline="white", width=4)
                else:
                    for dot in range([1, 2, 3, 2][index]):
                        draw.ellipse((210+dot*30, 62, 226+dot*30, 78), fill="#FAEDE1")
                frame.alpha_composite(overlay)
        manifest["buttons"][slug] = export_cycle(frames, "assistant-button", slug, [180]*4, [512, 256])
    (ROOT/"assets/manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+"\n")
    print("Done: 17 cycles, exactly 4 cels each.", flush=True)


if __name__ == "__main__":
    main()
