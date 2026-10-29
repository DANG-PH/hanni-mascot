const assert=require('node:assert/strict');
const {configs,sourcePoint}=require('../rig-motion.js');
let maximum=0,minimumDeterminant=1;
for(const [slug,config] of Object.entries(configs)) {
  for(let y=20;y<500;y+=20)for(let x=20;x<500;x+=20) {
    const a=sourcePoint(x,y,0,config.regions),b=sourcePoint(x,y,Math.PI*2,config.regions);
    assert(Math.hypot(a[0]-b[0],a[1]-b[1])<1e-9,slug+': loop position');
    const e=.0001;
    const before=sourcePoint(x,y,-e,config.regions),after=sourcePoint(x,y,e,config.regions);
    const end=sourcePoint(x,y,Math.PI*2-e,config.regions),start=sourcePoint(x,y,Math.PI*2+e,config.regions);
    assert(Math.hypot((after[0]-before[0])-(start[0]-end[0]),(after[1]-before[1])-(start[1]-end[1]))<1e-8,slug+': loop velocity');
    for(let phase=0;phase<24;phase++) {
      const t=phase*Math.PI/12,q=sourcePoint(x,y,t,config.regions);
      maximum=Math.max(maximum,Math.hypot(q[0]-x,q[1]-y));
      const qx=sourcePoint(x+.01,y,t,config.regions),qy=sourcePoint(x,y+.01,t,config.regions);
      const determinant=((qx[0]-q[0])*(qy[1]-q[1])-(qy[0]-q[0])*(qx[1]-q[1]))/.0001;
      minimumDeterminant=Math.min(minimumDeterminant,determinant);
      assert(determinant>.5,slug+': folded surface');
      if(y>=430)assert.deepEqual(q,[x,y]);
    }
  }
}
assert(maximum<12,'Excessive motion');
console.log(`12 rigs passed: closed position + velocity, fixed feet, no folded surfaces. Max displacement ${maximum.toFixed(2)}px at 512; min Jacobian ${minimumDeterminant.toFixed(3)}.`);
