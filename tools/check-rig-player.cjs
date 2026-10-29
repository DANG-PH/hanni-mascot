const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const sandbox={window:{},document:{hidden:false},requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{},Image:class{async decode(){}}};
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'..','rig-player.js'),'utf8'),sandbox);
const clip={duration:1.2,loop:true,atlases:{256:{src:'atlas',size:256,columns:6,count:6}},rig:{base:'base',regions:[]}};
(async()=>{
  const draws=[];
  const canvas={dataset:{},getContext:type=>type==='webgl'?null:{clearRect(){},drawImage(_im,x){draws.push(x/256);}}};
  const player=new sandbox.window.RigPlayer(canvas);
  await player.play(clip,{size:256,continuous:false});
  for(let time=0;time<=1250;time+=25)player.tick(time);
  assert.deepEqual(draws.slice(0,7),[0,1,2,3,4,5,0]);
  player.seek(.75);assert.equal(canvas.dataset.frame,'4');
  player.paused=true;const held=draws.length;player.tick(1300);assert.equal(draws.length,held);
  player.paused=false;player.tick(150000);assert.equal(draws.length,held,'Resume must not advance using hidden time');
  sandbox.document.hidden=true;player.tick(160000);sandbox.document.hidden=false;player.tick(170000);assert.equal(draws.length,held);
  let completed=0;await player.play(clip,{size:256,loop:false,onEnd:()=>completed++});
  for(let time=0;time<=1500;time+=25)player.tick(time);
  assert.equal(completed,1);assert.equal(canvas.dataset.frame,'5');
  // Last request wins, even when two decoded clips resolve together.
  const second={...clip,duration:2};await Promise.all([player.play(clip,{size:256}),player.play(second,{size:256})]);
  assert.equal(player.clip,second);
  console.log('RigPlayer passed: six-frame fallback cycle, seek, pause/resume, background time, once-only callback, latest request wins.');
})().catch(error=>{console.error(error);process.exitCode=1;});
