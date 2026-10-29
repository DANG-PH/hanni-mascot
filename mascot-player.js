/* Decode once, then draw all animation frames from one atlas on the rAF clock. */
(() => {
  const cache = new Map();
  async function loadAtlas(src) {
    if (!cache.has(src)) {
      const promise = (async () => {
        const image = new Image();
        image.src = src;
        await image.decode();
        return image;
      })();
      cache.set(src, promise);
      promise.catch(() => cache.delete(src));
      // Bound decoded atlas memory while keeping recently played clips warm.
      if (cache.size > 8) cache.delete(cache.keys().next().value);
    }
    return cache.get(src);
  }

  class MascotPlayer {
    constructor(canvas, onFrame = () => {}) {
      this.canvas = canvas;
      this.context = canvas.getContext("2d");
      this.onFrame = onFrame;
      this.speed = 1;
      this.paused = false;
      this.position = 0;
      this.token = 0;
      this.lastTime = null;
      this.finished = true;
      this.tick = this.tick.bind(this);
      this.animation = requestAnimationFrame(this.tick);
    }

    async play(clip, { size = 512, loop = clip.loop, onEnd = null } = {}) {
      const ticket = ++this.token;
      const atlas = clip.atlases[String(size)] || Object.values(clip.atlases)[0];
      const image = await loadAtlas(atlas.src);
      if (ticket !== this.token) return false;
      this.clip = clip;
      this.atlas = atlas;
      this.image = image;
      this.loop = Boolean(loop);
      this.onEnd = onEnd;
      this.position = 0;
      this.paused = false;
      this.finished = false;
      this.lastTime = null;
      this.lastFrame = -1;
      this.canvas.width = atlas.size;
      this.canvas.height = atlas.size;
      this.draw(0);
      return true;
    }

    static preload(clip, size = 512) {
      const atlas = clip.atlases[String(size)] || Object.values(clip.atlases)[0];
      return loadAtlas(atlas.src);
    }

    draw(index) {
      if (!this.image) return;
      const { size, columns } = this.atlas;
      this.context.clearRect(0, 0, size, size);
      this.context.drawImage(this.image, (index % columns) * size, Math.floor(index / columns) * size, size, size, 0, 0, size, size);
      this.lastFrame = index;
      this.canvas.dataset.frame = String(index);
      this.onFrame({ index, count: this.atlas.count, progress: this.position / this.clip.duration });
    }

    frameAt(seconds) {
      if (!this.clip.durations_ms) return Math.min(this.atlas.count - 1, Math.floor(seconds / this.clip.duration * this.atlas.count));
      let end = 0;
      for (let index = 0; index < this.atlas.count; index++) {
        end += this.clip.durations_ms[index] / 1000;
        if (seconds < end) return index;
      }
      return this.atlas.count - 1;
    }

    seek(progress) {
      if (!this.clip) return;
      this.position = Math.min(1, Math.max(0, progress)) * this.clip.duration;
      this.lastTime = null;
      const index = this.frameAt(this.position);
      this.draw(Math.max(0, index));
    }

    tick(now) {
      this.animation = requestAnimationFrame(this.tick);
      if (!this.image || this.paused || this.finished || document.hidden) {
        this.lastTime = null;
        return;
      }
      // After a background tab resumes, restart the clock at the current pose.
      const elapsed = this.lastTime === null ? 0 : Math.min((now - this.lastTime) / 1000, .1);
      this.lastTime = now;
      this.position += elapsed * this.speed;
      if (this.position >= this.clip.duration) {
        if (this.loop) this.position %= this.clip.duration;
        else {
          this.position = this.clip.duration;
          this.draw(this.atlas.count - 1);
          this.finished = true;
          const onEnd = this.onEnd;
          this.onEnd = null;
          if (onEnd) onEnd();
          return;
        }
      }
      const index = this.frameAt(this.position);
      if (index !== this.lastFrame) this.draw(index);
    }

    destroy() {
      ++this.token;
      cancelAnimationFrame(this.animation);
    }
  }
  window.MascotPlayer = MascotPlayer;
})();
