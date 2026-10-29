#!/usr/bin/env python3
"""Validate the four actual PNG cels, including the circular 4->1 step."""
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT/"assets/manifest.json").read_text())
report = {"format": "4-frame-loop", "cycles": {}, "errors": []}

for group, folder in [("emotes", "emotes"), ("avatars", "avatars"), ("buttons", "assistant-button")]:
    for slug, entry in manifest[group].items():
        clip = entry["clips"][0] if group == "emotes" else entry
        if clip["frames"] != 4:
            report["errors"].append(slug+": expected 4 frames")
        largest = max(map(int, clip["atlases"]))
        paths = sorted((ROOT/f"assets/{folder}/frames/{slug}@{largest}").glob("frame-*.png"))
        if len(paths) != 4:
            report["errors"].append(slug+": expected exactly 4 PNG files")
            continue
        arrays = []
        bounds = []
        for path in paths:
            image = Image.open(path).convert("RGBA")
            box = image.getchannel("A").point(lambda value: 255 if value > 100 else 0).getbbox()
            bounds.append(box[3])
            array = np.asarray(image.resize((128, 128)), np.float32)/255
            array[..., :3] *= array[..., 3:4]
            arrays.append(array)
        steps = [float(np.abs(arrays[(index+1)%4]-arrays[index]).mean()*255) for index in range(4)]
        # In an outward/return cycle the wrap should be no larger than the
        # largest ordinary step; this catches a return-to-rest jump.
        if steps[3] > max(steps[:3])*1.10 + .05:
            report["errors"].append(slug+": wrap is a larger step than normal playback")
        if group == "emotes" and max(bounds)-min(bounds) > 2:
            report["errors"].append(slug+": feet baseline drifts by more than 2 px")
        if sum(clip["durations_ms"]) != round(clip["duration"]*1000):
            report["errors"].append(slug+": incorrect frame timing")
        for size, atlas in clip["atlases"].items():
            path = ROOT/atlas["src"].split("?")[0]
            if Image.open(path).size != (int(size)*4, int(size)):
                report["errors"].append(slug+": invalid atlas size")
            webp = ROOT/f"assets/{folder}/webp/hanni-fox-{slug}-giu@{size}.webp"
            image = Image.open(webp)
            if image.info.get("loop") != 0 or image.n_frames != 4:
                report["errors"].append(slug+": WebP is not a 4-frame loop")
            limit = 400*1024 if int(size) == 512 else 150*1024
            if webp.stat().st_size > limit:
                report["errors"].append(slug+": WebP exceeds delivery budget")
        report["cycles"][slug] = {"png_frames": 4, "steps_1_2_3_4_1": [round(value, 3) for value in steps], "baseline_range_px": max(bounds)-min(bounds)}

path = ROOT/"reports/four-frame-loops.json"
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(json.dumps(report, ensure_ascii=False, indent=2)+"\n")
print(json.dumps({"cycles": len(report["cycles"]), "errors": report["errors"]}, ensure_ascii=False))
if report["errors"]:
    raise SystemExit(1)
