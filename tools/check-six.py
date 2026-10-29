#!/usr/bin/env python3
"""Validate the delivered six-cel bank, including its circular closing step."""
import hashlib
import json
import sys
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
manifest_path = ROOT/(sys.argv[1] if len(sys.argv)>1 else 'assets/manifest-v11.json')
manifest = json.loads(manifest_path.read_text())
assert manifest['frame_count'] == 6 and len(manifest['emotes']) == 12
assert {'E00','E01','E02','E10','E39','E42'} <= {v['code'] for v in manifest['emotes'].values()}
report = {'emotes': {}, 'note': 'Pixel differences are diagnostics, not proof of perceptual smoothness.'}
for slug, item in manifest['emotes'].items():
    clip = item['clips'][0]
    assert clip['frames'] == 6 and clip['loop']
    assert len(clip['durations_ms']) == 6 and min(clip['durations_ms']) > 0
    assert abs(sum(clip['durations_ms'])/1000-clip['duration']) < .001
    sizes = {}
    for size in (512,256):
        bank = Path(item['poster']).parent.parent
        paths = sorted((ROOT/bank/f'frames/{slug}@{size}').glob('frame-*.png'))
        assert len(paths) == 6, slug
        assert len({hashlib.sha256(p.read_bytes()).digest() for p in paths}) == 6, f'{slug}: duplicate cels'
        frames = [np.asarray(Image.open(p).convert('RGBA')) for p in paths]
        feet = []
        for frame in frames:
            assert frame.shape == (size,size,4)
            alpha = frame[...,3]
            assert alpha.min() == 0 and alpha.max() > 240
            assert max(alpha[0].max(),alpha[-1].max(),alpha[:,0].max(),alpha[:,-1].max()) < 10, f'{slug}: clipped edge'
            feet.append(int(np.where(alpha > 100)[0].max()))
        assert max(feet)-min(feet) <= (19 if item.get('hop') else 2)*size/512, (slug,feet)
        colors = [f[...,:3].astype(float)*f[...,3:4]/255 for f in frames]
        steps = [round(float(np.abs(colors[(i+1)%6]-colors[i]).mean()),3) for i in range(6)]
        assert steps[-1] <= max(steps[:-1])*1.5, f'{slug}: unusually large 6→1 join {steps}'
        atlas = clip['atlases'][str(size)]
        assert atlas['count'] == atlas['columns'] == 6
        assert Image.open(ROOT/atlas['src'].split('?')[0]).size == (size*6,size)
        webp = ROOT/clip['webp'][str(size)]
        image = Image.open(webp)
        assert image.n_frames == 6 and image.info['loop'] == 0
        durations = []
        for index in range(6):
            image.seek(index); image.load(); durations.append(image.info['duration'])
        assert durations == clip['durations_ms'], (slug,durations)
        assert webp.stat().st_size <= (400 if size == 512 else 150)*1024
        body = [frame[round(size*365/512):round(size*430/512),round(size*245/512):round(size*320/512)] for frame in frames]
        body_change = max(float(np.abs(frame.astype(float)-body[0]).mean()) for frame in body)
        if manifest['playback'] == 'cyclic-joints':
            assert body_change == 0, f'{slug}: body texture changes'
            assert len(set(feet)) == 1, f'{slug}: feet move'
        sizes[size] = {'feet_y': feet, 'body_change_mae':body_change, 'step_mae_12_23_34_45_56_61': steps, 'webp_bytes': webp.stat().st_size, 'durations_ms': durations}
    report['emotes'][slug] = sizes
(ROOT/f'reports/{manifest_path.stem}-checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('12 emotes passed: six distinct cels, alpha, bounds, grounding, 6→1, WebP timing/loop/size, atlases.')
