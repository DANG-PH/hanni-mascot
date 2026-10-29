#!/usr/bin/env python3
"""Extract three six-cel launcher gestures with a stationary red badge anchor."""
import importlib.util
import json
from pathlib import Path
import cv2
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('cel_exporter',Path(__file__).with_name('build-six.py'))
exporter=importlib.util.module_from_spec(spec);spec.loader.exec_module(exporter)
OUTPUT=ROOT/'assets/assistant-button/v10'
exporter.OUTPUT=OUTPUT

def extract(path):
    cells=exporter.split_cells(path,rows=3)
    anchors=[]
    for array in cells:
        alpha=array[...,3]
        ys,_=np.where(alpha>100);bottom=int(ys.max()+1)
        # The lower red bowl is stationary even when the head/paw rises.
        color=array[...,:3].astype(float)
        base=(alpha>100)&(color[...,0]>145)&(color[...,1]<color[...,0]*.48)&(color[...,2]<color[...,0]*.45)
        band=round(np.median([c.shape[0] for c in cells])*.25)
        base[:bottom-band]=False
        _,xs=np.where(base)
        if len(xs)==0:raise ValueError(f'{path}: cannot locate red bowl')
        anchors.append(((xs.min()+xs.max())/2,bottom,int(xs.max()-xs.min()+1)))
    frames=[]
    for array,(center,bottom,width) in zip(cells,anchors):
        # A whole-cel uniform resize/translation only, no character deformation.
        scale=340/width
        matrix=np.float32([[scale,0,256-center*scale],[0,scale,482-bottom*scale]])
        moved=cv2.warpAffine(array,matrix,(512,512),flags=cv2.INTER_CUBIC)
        moved[moved[...,3]<3]=0
        alpha=moved[...,3]
        if max(alpha[0].max(),alpha[-1].max(),alpha[:,0].max(),alpha[:,-1].max())>10:
            raise ValueError(f'{path}: gesture clipped; decrease launcher scale')
        frames.append(Image.fromarray(moved))
    return frames,anchors

def main():
    config={
        'blink':[180,70,90,70,160,200],
        'wave':[160,120,160,160,120,180],
        'peek':[160,140,180,140,140,200],
    }
    clips={};alignment={}
    for id,timing in config.items():
        frames,anchors=extract(ROOT/f'assets/assistant-button/sheets/v10/{id}-six.png')
        clip=exporter.export(frames,id,timing,loop=False)
        clip['id']=id;clip['loop']=False
        clips[id]=clip;alignment[id]=anchors
        print(id+': six drawn cels, play once',flush=True)
    bundle={'version':'v10-occasional-gestures','poster':'assets/assistant-button/v10/png/hanni-fox-blink@256.png','initial_delay_ms':5000,'idle_interval_ms':[12000,20000],'clips':clips}
    (ROOT/'assets/assistant-button/manifest-v10.json').write_text(json.dumps(bundle,ensure_ascii=False,indent=2)+'\n')
    (ROOT/'reports/launcher-v10-alignment.json').write_text(json.dumps(alignment,indent=2)+'\n')

if __name__=='__main__':main()
