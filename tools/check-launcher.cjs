const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const sandbox={window:{}};
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'..','launcher-idle.js'),'utf8'),sandbox);
const clips=Object.fromEntries(['blink','wave','peek'].map(id=>[id,{id}]));
(async()=>{
  let time=0,enabled=true,nextId=0;
  const timers=new Map(),listeners=new Map(),events=[];
  const page={hidden:false,addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)};
  const calls=[];
  const player={async play(clip,options){calls.push({clip,options});this.paused=false;this.end=options.onEnd;return true;},seek(progress){this.progress=progress;},destroy(){this.destroyed=true;}};
  const idle=new sandbox.window.LauncherIdle(player,{clips,initial_delay_ms:5000,idle_interval_ms:[12000,20000]},{enabled:()=>enabled,onActivity:id=>events.push(id),random:()=>0,now:()=>time,setTimer:(fn,delay)=>{const id=++nextId;timers.set(id,{fn,delay});return id;},clearTimer:id=>timers.delete(id),page});
  await idle.init();
  assert(player.paused,'Initial image must stay still');
  assert.equal([...timers.values()][0].delay,5000);
  const [timerId,timer]=[...timers.entries()][0];timers.delete(timerId);time+=timer.delay;timer.fn();await Promise.resolve();await Promise.resolve();
  assert.equal(calls.at(-1).clip.id,'blink');assert.equal(calls.at(-1).options.loop,false);assert(idle.busy);
  assert.equal(await idle.trigger('wave',{manual:true}),false,'No overlapping gestures');
  player.end();assert.equal(events.at(-1),'rest');assert.equal([...timers.values()][0].delay,12000);
  assert.equal(await idle.trigger('wave'),false,'Hover cooldown prevents repeated distraction');
  assert.equal(await idle.trigger('wave',{manual:true}),true,'Demo preview can play on request');
  assert.equal(calls.at(-1).clip.id,'wave');player.end();
  page.hidden=true;listeners.get('visibilitychange')();assert.equal(timers.size,0);assert.equal(await idle.trigger('peek',{manual:true}),false);
  page.hidden=false;listeners.get('visibilitychange')();assert.equal(timers.size,1);
  enabled=false;idle.refresh();assert.equal(timers.size,0);assert(player.paused);assert.equal(player.progress,0);assert.equal(await idle.trigger('peek',{manual:true}),false);
  enabled=true;idle.refresh();assert.equal(timers.size,1);
  idle.destroy();assert.equal(timers.size,0);assert.equal(listeners.size,0);assert(player.destroyed);
  // Native browser timer methods require the Window receiver. Exercise the
  // default adapters too, rather than only the injected fake timer functions.
  let nativeTimer=false;
  sandbox.window.setTimeout=function(){assert.equal(this,sandbox.window);nativeTimer=true;return 99;};
  sandbox.window.clearTimeout=function(id){assert.equal(this,sandbox.window);assert.equal(id,99);nativeTimer=false;};
  const nativeIdle=new sandbox.window.LauncherIdle(player,{clips},{page});
  await nativeIdle.init();assert(nativeTimer);nativeIdle.destroy();assert(!nativeTimer);
  console.log('Launcher passed: idle hold, delayed one-shot, 12–20s rest, no overlap, cooldown, manual preview, hidden/reduced-motion handling and cleanup.');
})().catch(error=>{console.error(error);process.exitCode=1;});
