/* WebGL renders the same periodic deformation as the six exported PNGs.
   Only joint coordinates change; the character texture never changes. */
(() => {
  const images=new Map();
  function image(src) {
    if(!images.has(src))images.set(src,(async()=>{const im=new Image();im.src=src;await im.decode();return im;})());
    return images.get(src);
  }
  const vertex=`attribute vec2 aPosition; varying vec2 vUv; void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}`;
  const fragment=`precision highp float;
  varying vec2 vUv; uniform sampler2D uImage; uniform float uPhase;
  uniform vec2 uCenter[4]; uniform vec2 uRadius[4]; uniform vec2 uPivot[4]; uniform vec4 uMotion[4];
  void main(){
    vec2 p=vec2(vUv.x,1.-vUv.y)*512.; vec2 q=p;
    if(p.y<430.)for(int i=0;i<4;i++){
      vec2 delta=(p-uCenter[i])/uRadius[i];float d=dot(delta,delta);
      float w=pow(max(0.,1.-d),2.);vec4 m=uMotion[i];
      float wave=sin(uPhase+m.w);float a=m.x*wave;float c=cos(a),s=sin(a);
      vec2 r=p-uPivot[i];
      q+=w*(vec2((c-1.)*r.x+s*r.y,-s*r.x+(c-1.)*r.y)-vec2(m.y*wave,m.z*cos(uPhase+m.w)));
    }
    gl_FragColor=texture2D(uImage,q/512.);
  }`;

  class RigPlayer {
    constructor(canvas,onFrame=()=>{}) {
      this.canvas=canvas;this.onFrame=onFrame;this.speed=1;this.paused=false;this.position=0;this.token=0;this.finished=true;this.lastTime=null;this.continuous=true;
      this.gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false});
      if(this.gl)this.setup();else this.context=canvas.getContext('2d');
      this.tick=this.tick.bind(this);this.animation=requestAnimationFrame(this.tick);
    }
    setup() {
      const gl=this.gl;
      const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
      const p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(p);
      if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));
      gl.useProgram(p);this.program=p;
      const buffer=gl.createBuffer();this.buffer=buffer;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const a=gl.getAttribLocation(p,'aPosition');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
      this.texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.texture);
      for(const axis of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,axis,gl.CLAMP_TO_EDGE);
      for(const type of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,type,gl.LINEAR);
      gl.uniform1i(gl.getUniformLocation(p,'uImage'),0);
    }
    async play(clip,{size=512,loop=clip.loop,onEnd=null,continuous=true}={}) {
      const ticket=++this.token;
      const atlas=clip.atlases[String(size)];
      const im=await image(this.gl?clip.rig.base:atlas.src);
      if(ticket!==this.token)return false;
      Object.assign(this,{clip,atlas,image:im,loop,onEnd,continuous,position:0,paused:false,finished:false,lastTime:null,lastFrame:-1});
      this.canvas.width=this.canvas.height=size;
      if(this.gl){
        const gl=this.gl;gl.viewport(0,0,size,size);gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im);
        const regions=Array.from({length:4},(_,i)=>clip.rig.regions[i]||{center:[0,0],radius:[1,1],pivot:[0,0],motion:[0,0,0,0]});
        for(const [uniform,key] of [['uCenter','center'],['uRadius','radius'],['uPivot','pivot']])gl.uniform2fv(gl.getUniformLocation(this.program,uniform+'[0]'),new Float32Array(regions.flatMap(r=>r[key])));
        gl.uniform4fv(gl.getUniformLocation(this.program,'uMotion[0]'),new Float32Array(regions.flatMap(r=>r.motion)));
      }
      this.draw();return true;
    }
    frameAt(seconds){return Math.min(5,Math.floor(seconds/this.clip.duration*6));}
    draw(){
      if(!this.image)return;
      const index=this.frameAt(this.position);
      const phase=(this.continuous?this.position/this.clip.duration:index/6)*Math.PI*2;
      if(this.gl){this.gl.uniform1f(this.gl.getUniformLocation(this.program,'uPhase'),phase);this.gl.drawArrays(this.gl.TRIANGLES,0,6);}
      else {const s=this.atlas.size;this.context.clearRect(0,0,s,s);this.context.drawImage(this.image,index*s,0,s,s,0,0,s,s);}
      this.canvas.dataset.frame=String(index);this.lastFrame=index;
      this.onFrame({index,count:6,progress:this.position/this.clip.duration});
    }
    seek(progress){if(!this.clip)return;this.position=Math.min(1,Math.max(0,progress))*this.clip.duration;this.lastTime=null;this.draw();}
    tick(now){
      this.animation=requestAnimationFrame(this.tick);
      if(!this.image||this.paused||this.finished||document.hidden){this.lastTime=null;return;}
      const elapsed=this.lastTime===null?0:Math.min((now-this.lastTime)/1000,.1);this.lastTime=now;
      this.position+=elapsed*this.speed;
      if(this.position>=this.clip.duration){
        if(this.loop)this.position%=this.clip.duration;
        else {this.position=this.clip.duration;this.draw();this.finished=true;const done=this.onEnd;this.onEnd=null;if(done)done();return;}
      }
      if(this.continuous||this.frameAt(this.position)!==this.lastFrame)this.draw();
    }
    destroy(){++this.token;cancelAnimationFrame(this.animation);if(this.gl){this.gl.deleteTexture(this.texture);this.gl.deleteBuffer(this.buffer);this.gl.deleteProgram(this.program);}}
  }
  window.RigPlayer=RigPlayer;
})();
