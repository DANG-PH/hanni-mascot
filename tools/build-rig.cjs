/* Deterministic animation export from the retained ImageGen character art. */
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const sharp=require('sharp');
const {configs,sourcePoint}=require('../rig-motion.js');
const ROOT=path.resolve(__dirname,'..');
const out='assets/emotes/v7';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex').slice(0,10);

async function save(relative,buffer) {
  const target=path.join(ROOT,relative);
  await fs.mkdir(path.dirname(target),{recursive:true}); await fs.writeFile(target,buffer);
}
function render(source,size,phase,regions) {
  const pixels=Buffer.alloc(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const [u,v]=sourcePoint((x+.5)*512/size,(y+.5)*512/size,phase,regions);
    const fx=u-.5,fy=v-.5,ix=Math.floor(fx),iy=Math.floor(fy),tx=fx-ix,ty=fy-iy;
    const accum=[0,0,0,0];
    for(let j=0;j<2;j++)for(let i=0;i<2;i++) {
      const px=ix+i,py=iy+j;if(px<0||py<0||px>=512||py>=512)continue;
      const k=(py*512+px)*4,w=(i?tx:1-tx)*(j?ty:1-ty),a=source[k+3]/255;
      for(let c=0;c<3;c++)accum[c]+=source[k+c]*a*w;
      accum[3]+=a*w;
    }
    const k=(y*size+x)*4;
    if(accum[3]>.003) {for(let c=0;c<3;c++)pixels[k+c]=Math.round(accum[c]/accum[3]);pixels[k+3]=Math.round(accum[3]*255);}
  }
  return pixels;
}
(async()=>{
  const previous=JSON.parse(await fs.readFile(path.join(ROOT,'assets/manifest-v6.json')));
  const manifest={...previous,version:'stable-joint-v1',playback:'cyclic-joints',emotes:{}};
  for(const [slug,config] of Object.entries(configs)) {
    const basePath=`${out}/base/hanni-fox-${slug}@512.png`;
    const base=await fs.readFile(path.join(ROOT,basePath)).catch(()=>fs.readFile(path.join(ROOT,`assets/emotes/v6/frames/${slug}@512/frame-01.png`)));
    await save(basePath,base);
    const source=await sharp(base).ensureAlpha().raw().toBuffer();
    const atlases={},webp={};
    for(const size of [512,256]) {
      const frames=[];
      for(let i=0;i<6;i++) {
        const raw=render(source,size,i*Math.PI/3,config.regions);
        const buffer=await sharp(raw,{raw:{width:size,height:size,channels:4}}).png().toBuffer();
        frames.push(buffer);await save(`${out}/frames/${slug}@${size}/frame-${String(i+1).padStart(2,'0')}.png`,buffer);
      }
      await save(`${out}/png/hanni-fox-${slug}@${size}.png`,frames[0]);
      const atlas=await sharp({create:{width:size*6,height:size,channels:4,background:'#00000000'}}).composite(frames.map((input,i)=>({input,left:i*size,top:0}))).png().toBuffer();
      await save(`${out}/atlases/hanni-fox-${slug}@${size}.png`,atlas);
      const encoded=await sharp(atlas).webp({lossless:true,effort:4}).toBuffer();
      const atlasPath=`${out}/atlases/hanni-fox-${slug}@${size}.webp`;
      await save(atlasPath,encoded);
      atlases[size]={src:atlasPath+'?v='+hash(encoded),columns:6,size,count:6};
      // Sharp's animation encoder consumes a vertical stack with pageHeight.
      const vertical=await sharp({create:{width:size,height:size*6,channels:4,background:'#00000000'}}).composite(frames.map((input,i)=>({input,left:0,top:i*size}))).raw().toBuffer();
      let animated;
      for(const quality of [82,72,62,52]) {
        animated=await sharp(vertical,{raw:{width:size,height:size*6,channels:4,pageHeight:size}}).webp({quality,loop:0,delay:Array(6).fill(config.duration/6),effort:4}).toBuffer();
        if(animated.length<=(size===512?400:150)*1024)break;
      }
      const animPath=`${out}/webp/hanni-fox-${slug}-giu@${size}.webp`;
      await save(animPath,animated);webp[size]=animPath;
    }
    const item={...previous.emotes[slug],action:config.action,hop:false,poster:`${out}/png/hanni-fox-${slug}@256.png`};
    item.clips=[{id:'giu',duration:config.duration/1000,durations_ms:Array(6).fill(config.duration/6),frames:6,loop:true,atlases,webp,rig:{base:basePath+'?v='+hash(base),regions:config.regions}}];
    manifest.emotes[slug]=item;
    console.log(`${slug}: six stable joint poses + cyclic live rig`);
  }
  await save('assets/manifest-v7.json',JSON.stringify(manifest,null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1;});
