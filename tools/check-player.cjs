const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const sandbox = {
  window: {}, document: { hidden: false },
  requestAnimationFrame: () => 1, cancelAnimationFrame: () => {},
  Image: class { async decode() {} },
};
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname, '..', 'mascot-player.js'), 'utf8'), sandbox);
(async () => {
  const frames = [];
  const canvas = { dataset: {}, getContext: () => ({ clearRect() {}, drawImage(_image, x, y, sw, sh, dx, dy, dw, dh) { assert.deepEqual([y,sw,sh,dx,dy,dw,dh],[0,256,256,0,0,256,256]); frames.push(x / 256); } }) };
  const player = new sandbox.window.MascotPlayer(canvas);
  const clip = { duration: .9, durations_ms: [150,150,150,150,150,150], loop: true, atlases: { 256: { src: 'test', size: 256, columns: 6, count: 6 } } };
  await player.play(clip, { size: 256 });
  for (let time = 0; time <= 950; time += 25) player.tick(time);
  assert.deepEqual(frames.slice(0, 7), [0,1,2,3,4,5,0]);
  player.seek(.5);
  assert.equal(canvas.dataset.frame, '3');
  const held = frames.length;
  player.paused = true;
  player.tick(1000);
  assert.equal(frames.length, held);
  assert.equal(player.frameAt(.149), 0);
  assert.equal(player.frameAt(.151), 1);
  player.paused = false;
  player.tick(100000);
  assert.equal(frames.length,held,'Resume ignores time spent paused');
  sandbox.document.hidden=true;player.tick(110000);sandbox.document.hidden=false;player.tick(120000);
  assert.equal(frames.length,held,'Background time does not skip ahead');
  let completed = 0;
  await player.play(clip, {size:256, loop:false, onEnd:()=>completed++});
  for (let time = 0; time <= 1500; time += 25) player.tick(time);
  assert.equal(completed,1);
  assert.equal(canvas.dataset.frame,'5');
  console.log('Player passed: real cel 1→2→3→4→5→6→1, fixed draw bounds, no transforms, pause/seek/background timing and play-once completion.');
})().catch(error => { console.error(error); process.exitCode = 1; });
