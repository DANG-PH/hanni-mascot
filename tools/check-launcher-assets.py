#!/usr/bin/env python3
"""Check genuine six-cel button gestures and their stationary red bowl."""
from pathlib import Path
import json
import hashlib
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
bundle=json.loads((ROOT/'assets/assistant-button/manifest-v10.json').read_text())
assert set(bundle['clips'])=={'blink','wave','peek'}
report={}
for id,clip in bundle['clips'].items():
    assert clip['frames']==6 and not clip['loop']
    assert sum(clip['durations_ms'])==round(clip['duration']*1000)
    sizes={}
    for size in (512,256):
        paths=[ROOT/p for p in clip['png_frames'][str(size)]]
        assert len(paths)==len({hashlib.sha256(p.read_bytes()).digest() for p in paths})==6
        anchors=[]
        for path in paths:
            im=Image.open(path).convert('RGBA');assert im.size==(size,size)
            a=np.asarray(im);alpha=a[...,3]
            assert max(alpha[0].max(),alpha[-1].max(),alpha[:,0].max(),alpha[:,-1].max())<10,(id,'clipped')
            yy,xx=np.where(alpha>100);bottom=int(yy.max())
            color=a[...,:3].astype(float)
            red=(alpha>100)&(color[...,0]>145)&(color[...,1]<color[...,0]*.48)&(color[...,2]<color[...,0]*.45)
            red[:round(size*430/512)]=False
            _,rx=np.where(red)
            anchors.append([round(float((rx.min()+rx.max())/2),2),int(rx.max()-rx.min()+1),bottom])
        assert max(a[0] for a in anchors)-min(a[0] for a in anchors)<=3*size/512,(id,anchors)
        assert max(a[1] for a in anchors)-min(a[1] for a in anchors)<=12*size/512,(id,anchors)
        assert max(a[2] for a in anchors)-min(a[2] for a in anchors)<=2,(id,anchors)
        atlas=ROOT/clip['atlases'][str(size)]['src'].split('?')[0]
        assert Image.open(atlas).size==(size*6,size)
        webp=ROOT/clip['webp'][str(size)];im=Image.open(webp)
        assert im.n_frames==6 and im.info['loop']==1
        for i,duration in enumerate(clip['durations_ms']):
            im.seek(i);im.load();assert im.info['duration']==duration
        assert webp.stat().st_size<=(400 if size==512 else 150)*1024
        sizes[size]={'red_bowl_center_width_bottom':anchors,'bytes':webp.stat().st_size}
    report[id]=sizes
(ROOT/'reports/launcher-v10-checks.json').write_text(json.dumps(report,indent=2)+'\n')
print('Launcher assets passed: 3 × 6 distinct PNGs, alpha/bounds, stationary red bowl, play-once WebPs, atlases and size budgets.')
