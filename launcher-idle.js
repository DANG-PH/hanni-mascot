/* Occasional six-image gestures; the last cel rests until the next gesture. */
(() => {
  class LauncherIdle {
    constructor(player, bundle, { enabled = () => true, onActivity = () => {}, onError = () => {}, random = Math.random, now = () => performance.now(), setTimer = (fn,delay) => window.setTimeout(fn,delay), clearTimer = (id) => window.clearTimeout(id), page = document } = {}) {
      Object.assign(this, {player,bundle,enabled,onActivity,onError,random,now,setTimer,clearTimer,page});
      this.timer=null;this.busy=false;this.dead=false;this.ticket=0;this.lastStart=-Infinity;this.sequence=0;
      this.visibility=()=>{
        this.cancelTimer();
        if(!this.page.hidden&&!this.busy)this.schedule(4500);
      };
      this.page.addEventListener('visibilitychange',this.visibility);
    }
    async init() {
      await this.player.play(this.bundle.clips.blink,{size:256,loop:false});
      this.player.paused=true;
      this.onActivity('rest');
      this.schedule(this.bundle.initial_delay_ms||5000);
    }
    cancelTimer(){if(this.timer!==null)this.clearTimer(this.timer);this.timer=null;}
    schedule(delay){
      this.cancelTimer();
      if(this.dead||this.page.hidden||!this.enabled())return;
      if(delay===undefined){const [min,max]=this.bundle.idle_interval_ms||[12000,20000];delay=min+this.random()*(max-min);}
      this.timer=this.setTimer(()=>{
        this.timer=null;
        const order=['blink','wave','peek','blink'];
        const id=order[this.sequence++%order.length];
        void this.trigger(id);
      },delay);
    }
    async trigger(id,{manual=false}={}){
      if(this.dead||this.busy||this.page.hidden||!this.enabled()||!this.bundle.clips[id])return false;
      if(!manual&&this.now()-this.lastStart<8000){this.schedule();return false;}
      this.cancelTimer();this.busy=true;this.lastStart=this.now();
      const ticket=++this.ticket;
      this.onActivity(id);
      try {
        const played=await this.player.play(this.bundle.clips[id],{size:256,loop:false,onEnd:()=>{
          if(this.dead||ticket!==this.ticket)return;
          this.busy=false;this.onActivity('rest');this.schedule();
        }});
        return played&&!this.dead;
      } catch(error) {
        if(!this.dead&&ticket===this.ticket){this.busy=false;this.onActivity('rest');this.schedule();}
        this.onError(error);return false;
      }
    }
    refresh(){
      this.cancelTimer();
      if(!this.enabled()){
        ++this.ticket;this.busy=false;this.player.paused=true;this.player.seek(0);this.onActivity('rest');
      }else if(!this.busy)this.schedule(5000);
    }
    destroy(){this.dead=true;++this.ticket;this.cancelTimer();this.page.removeEventListener('visibilitychange',this.visibility);this.player.destroy();}
  }
  window.LauncherIdle=LauncherIdle;
})();
