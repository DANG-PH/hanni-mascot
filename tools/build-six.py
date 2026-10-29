#!/usr/bin/env python3
"""Publish six authored cels per emote; leave the approved four-cel bank intact."""
from __future__ import annotations
import hashlib
import json
import argparse
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw
from emote_catalogue import CATALOGUE
from source_images import clean_cell

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets/emotes/v6"


def head_center(array, top, bottom):
    color = array[..., :3].astype(np.float32)
    red = np.uint8((color[..., 0] > color[..., 1]*1.35) & (color[..., 0] > color[..., 2]*1.25) & (array[..., 3] > 100))
    red[round(top+(bottom-top)*.45):] = 0
    count, _, stats, _ = cv2.connectedComponentsWithStats(red)
    if count > 1:
        x, _, width, _, _ = stats[1+np.argmax(stats[1:, cv2.CC_STAT_AREA])]
        return x+width/2
    ys, xs = np.where(array[..., 3] > 100)
    return (xs.min()+xs.max())/2


def split_cells(path, rows=2):
    sheet = Image.open(path).convert("RGBA")
    if sheet.getchannel("A").getextrema()[0] > 0:
        raise ValueError(f"{path.name}: source has no transparent background")
    # Generated characters can extend past nominal grid boundaries. Extract
    # whole connected silhouettes, so the grid never amputates a waving paw.
    source = np.asarray(sheet)
    _, labels, stats, centers = cv2.connectedComponentsWithStats(np.uint8(source[..., 3] > 40))
    characters = [i for i in range(1, len(stats)) if stats[i, cv2.CC_STAT_AREA] > sheet.width*sheet.height*.025]
    if len(characters) != 6:
        raise ValueError(f"{path.name}: expected six separate characters, found {len(characters)}")
    characters.sort(key=lambda i: (min(rows-1,int(centers[i,1]/sheet.height*rows)), centers[i,0]))
    cells = []
    for component in characters:
        x, y, width, height, _ = stats[component]
        box = (max(0,x-3), max(0,y-3), min(sheet.width,x+width+3), min(sheet.height,y+height+3))
        cells.append(np.asarray(clean_cell(sheet.crop(box))))
    return cells


def extract(path, config, anchor="head"):
    cells = split_cells(path)
    heights = []
    for array in cells:
        ys, _ = np.where(array[..., 3] > 100)
        heights.append(ys.max()-ys.min()+1)
    scale = 410/float(np.median(heights))
    result = []
    for index, array in enumerate(cells):
        ys, _ = np.where(array[..., 3] > 100)
        top, bottom = ys.min(), ys.max()+1
        if anchor == "feet":
            # Normalize only the full cel's translation and uniform size.
            # No region warping, body-part compositing or generated inbetweens.
            if not config.get("stable_scale"):
                scale = 410/(bottom-top)
            colors = array[..., :3]
            feet = (array[...,3]>100) & (colors[...,0]<160) & (colors[...,1]<100) & (colors[...,2]<100)
            feet[:round(bottom-(bottom-top)*.055)] = False
            _, foot_x = np.where(feet)
            center = (foot_x.min()+foot_x.max())/2
        else:
            center = head_center(array, top, bottom)
        hop = [0, -5, -15, -8, 2, 0][index] if config.get("hop") and anchor != "feet" else 0
        matrix = np.float32([[scale, 0, 256-center*scale], [0, scale, 471-bottom*scale+hop]])
        moved = cv2.warpAffine(array, matrix, (512, 512), flags=cv2.INTER_CUBIC)
        moved[moved[..., 3] < 3] = 0
        result.append(Image.fromarray(moved))
    return result


def effects(frames, slug):
    if slug != "e02-suy-nghi":
        return
    for frame, count in zip(frames, [1, 2, 3, 3, 2, 1]):
        layer = Image.new("RGBA", frame.size)
        draw = ImageDraw.Draw(layer)
        for index in range(count):
            x, y = 95-index*18, 110-index*25
            draw.ellipse((x-8,y-8,x+8,y+8), fill="#FAEDE1", outline="#E8B25E", width=1)
        frame.alpha_composite(layer)


def export(frames, slug, timing, loop=True):
    atlases = {}
    webps = {}
    for size in (512, 256):
        resized = [frame.resize((size, size), Image.Resampling.LANCZOS) for frame in frames]
        frame_dir = OUTPUT/f"frames/{slug}@{size}"
        frame_dir.mkdir(parents=True, exist_ok=True)
        for index, frame in enumerate(resized):
            frame.save(frame_dir/f"frame-{index+1:02d}.png", optimize=True)
        poster = OUTPUT/f"png/hanni-fox-{slug}@{size}.png"
        poster.parent.mkdir(parents=True, exist_ok=True)
        resized[0].save(poster, optimize=True)
        webp = OUTPUT/f"webp/hanni-fox-{slug}-giu@{size}.webp"
        webp.parent.mkdir(parents=True, exist_ok=True)
        budget = (400 if size == 512 else 150)*1024
        for quality in (82, 72, 62, 52):
            resized[0].save(webp, save_all=True, append_images=resized[1:], duration=timing, loop=0 if loop else 1, quality=quality, method=4)
            if webp.stat().st_size <= budget:
                break
        atlas = Image.new("RGBA", (size*6, size))
        for index, frame in enumerate(resized):
            atlas.paste(frame, (index*size,0))
        atlas_path = OUTPUT/f"atlases/hanni-fox-{slug}@{size}.webp"
        atlas_path.parent.mkdir(parents=True, exist_ok=True)
        atlas.save(atlas_path, lossless=True, exact=True, method=4)
        atlas.save(atlas_path.with_suffix(".png"), optimize=True)
        revision = hashlib.sha256(atlas_path.read_bytes()).hexdigest()[:10]
        atlases[str(size)] = {"src": str(atlas_path.relative_to(ROOT))+"?v="+revision, "columns": 6, "size": size, "count": 6}
        webps[str(size)] = str(webp.relative_to(ROOT))
    png_frames = {str(size): [str((OUTPUT/f"frames/{slug}@{size}/frame-{index+1:02d}.png").relative_to(ROOT)) for index in range(6)] for size in (512,256)}
    return {"id": "giu", "duration": sum(timing)/1000, "durations_ms": timing, "frames": 6, "loop": loop, "atlases": atlases, "webp": webps, "png_frames": png_frames}


def main():
    global OUTPUT
    parser = argparse.ArgumentParser()
    parser.add_argument("--bank", choices=("v6","v8","v9","v10","v11"), default="v11")
    bank = parser.parse_args().bank
    OUTPUT = ROOT/f"assets/emotes/{bank}"
    sources = {slug: ROOT/f"assets/emotes/sheets/{bank}/hanni-fox-{slug}-six.png" for slug in CATALOGUE}
    missing = [str(path.relative_to(ROOT)) for path in sources.values() if not path.exists()]
    if missing:
        raise SystemExit("Missing source sheets: " + ", ".join(missing))
    manifest = {"version": f"{bank}-six-drawn-cels", "frame_count": 6, "playback": "six-drawn-images", "emotes": {}, "avatar": "nhan-vat/mat-cao-logo.png", "launcher": "assets/assistant-button/png/hanni-fox-n1-nghi@256.png"}
    if bank in ("v10","v11"):
        manifest["launcher_animation"] = "assets/assistant-button/manifest-v10.json"
    timing = {
        "e00-nghi":[1200,60,80,60,250,250], "e01-chao":[100,100,90,100,100,110],
        "e02-suy-nghi":[150]*6, "e04-vui-mung":[100]*6, "e05-co-len":[120]*6,
        "e09-lang-nghe":[160]*6,"e10-doc-mau":[90]*6,"e11-a-ha":[120]*6,
        "e16-doc-sach":[160]*6,"e19-tim-kiem":[150]*6,"e39-ghi-chu":[100,100,110,100,100,110],"e42-cham-chu":[250,180,180,180,70,220],
    }
    if bank == "v11":
        timing["e19-tim-kiem"] = [180,120,80,120,120,180]
        timing["e42-cham-chu"] = [700,100,100,80,120,300]
    for slug, config in CATALOGUE.items():
        config = dict(config)
        if bank == "v11" and slug in ("e19-tim-kiem","e42-cham-chu"):
            config["stable_scale"] = True
        frames = extract(sources[slug], config, anchor="head" if bank == "v6" else "feet")
        effects(frames, slug)
        clip = export(frames, slug, config["timing"] if bank == "v6" else timing[slug])
        manifest["emotes"][slug] = {key: value for key, value in config.items() if key != "timing"}
        manifest["emotes"][slug].update({"poster": f"assets/emotes/{bank}/png/hanni-fox-{slug}@256.png", "clips": [clip]})
        if bank != "v6":
            manifest["emotes"][slug]["hop"] = False
            manifest["emotes"][slug]["source_sheet"] = str(sources[slug].relative_to(ROOT))
            manifest["emotes"][slug]["action"] = {
                "e00-nghi":"Nháy mắt, liếc nhìn nhẹ; hai tay giữ sách.",
                "e01-chao":"Vẫy tay qua sáu tư thế và nháy mắt chào bạn.",
                "e02-suy-nghi":"Tay chạm cằm theo nhịp, mắt nhìn lên và ba chấm suy nghĩ.",
                "e04-vui-mung":"Giơ tay ăn mừng, cười híp mắt rồi trở lại nụ cười mở.",
                "e05-co-len":"Nắm tay đưa lên xuống động viên và đổi nét cười.",
                "e09-lang-nghe":"Tay đưa gần tai theo nhịp, nháy mắt và mỉm cười lắng nghe.",
                "e10-doc-mau":"Miệng mở, tròn, khép theo âm tiết; tay đưa ra giảng bài.",
                "e11-a-ha":"Chỉ ngón tay lên theo cung nhỏ, mắt sáng rồi nháy mắt vui.",
                "e16-doc-sach":"Mắt đọc theo dòng, góc trang sách chuyển động nhẹ.",
                "e19-tim-kiem":"Kính lúp di chuyển quanh cùng một mắt, giữ nguyên tay cầm.",
                "e39-ghi-chu":"Một tay giữ sổ, tay kia cầm bút viết qua sáu tư thế; có nháy mắt.",
                "e42-cham-chu":"Mắt theo dòng chữ đang gõ, chớp mi và đổi nụ cười nhẹ.",
            }[slug]
        if bank in ("v9","v10","v11"):
            revisions = {
                "e00-nghi":"Ôm sách thấp gọn, mỉm cười và nháy mắt tự nhiên.",
                "e02-suy-nghi":"Ngón tay chạm nhẹ bên má, mắt nhìn lên suy nghĩ; khuôn mặt thoáng rõ.",
                "e04-vui-mung":"Hai tay vỗ trước ngực theo sáu tư thế, cười vui và nháy mắt.",
                "e09-lang-nghe":"Bàn tay khum sau tai để lắng nghe, không che má; mắt sáng và nháy nhẹ.",
                "e16-doc-sach":"Sách mở gọn ngang eo, mắt nhìn xuống trang và góc giấy khẽ lật.",
                "e19-tim-kiem":"Kính lúp tìm theo vòng nhỏ bên ngoài mặt, không che hoặc phóng đại mắt.",
                "e42-cham-chu":"Giữ sách khép thấp bên hông, nhìn về ô nhập phía trước và nháy mắt chú ý.",
            }
            if slug in revisions:
                manifest["emotes"][slug]["action"] = revisions[slug]
            manifest["emotes"][slug]["prompt_source"] = "prompts/art-revision-seven.json" if slug in revisions else "prompts/emotes-drawn-six-frame.json"
        if bank in ("v10","v11") and slug in ("e19-tim-kiem","e42-cham-chu"):
            manifest["emotes"][slug]["prompt_source"] = "prompts/emotes-and-launcher-v10.json"
            manifest["emotes"][slug]["action"] = {
                "e19-tim-kiem":"Tra cứu trang sách bằng kính lúp nhỏ, mắt theo trang và gật nhẹ; kính luôn ở dưới mặt.",
                "e42-cham-chu":"Ngồi chăm chú, giữ sách trên đùi, nhìn về người học và gật đầu đáp nhẹ.",
            }[slug]
        if bank == "v11" and slug in ("e19-tim-kiem","e42-cham-chu"):
            manifest["emotes"][slug]["prompt_source"] = "prompts/reduced-motion-cels-v11.json"
            manifest["emotes"][slug]["action"] = {
                "e19-tim-kiem":"Sách và thân giữ ổn định, kính lúp quét ngang một đoạn ngắn trên trang; có nháy mắt.",
                "e42-cham-chu":"Ngồi chăm chú, nét mặt tươi và nháy mắt; giữ yên góc đầu, thân và sách.",
            }[slug]
        print(slug + ": six cels exported", flush=True)
    (ROOT/f"assets/manifest-{bank}.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+"\n")
    print("12 emotes, all six frames. Four-frame assets preserved.", flush=True)


if __name__ == "__main__":
    main()
