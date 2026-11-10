// Small synthesized sound effects and a gentle looping night tune (WebAudio, no files).
// Audio only starts after a player gesture, and every sound has an on-screen caption elsewhere.

export class Audio {
  constructor() {
    this.ctx = null; this.music = null; this.sfxGain = null; this.musicGain = null;
    this.musicVol = 0.4; this.sfxVol = 0.7; this.muted = false;
    this.musicTimer = null; this.step = 0; this.lastFoot = 0;
  }

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain(); this.sfxGain.connect(this.master);
    this.musicGain = this.ctx.createGain(); this.musicGain.connect(this.master);
    this.apply();
  }

  apply() {
    if (!this.ctx) return;
    this.master.gain.value = this.muted ? 0 : 1;
    this.sfxGain.gain.value = this.sfxVol;
    this.musicGain.gain.value = this.musicVol * 0.35;
  }

  set({ musicVol, sfxVol, muted }) {
    if (musicVol != null) this.musicVol = musicVol;
    if (sfxVol != null) this.sfxVol = sfxVol;
    if (muted != null) this.muted = muted;
    this.apply();
  }

  tone(freq, dur, { type = 'square', vol = 0.15, slide = 0, delay = 0, dest } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
  }

  noise(dur, vol = 0.1, delay = 0) {
    if (!this.ctx) return;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = this.ctx.createBufferSource(); s.buffer = buf;
    const g = this.ctx.createGain(); g.gain.value = vol;
    s.connect(g); g.connect(this.sfxGain); s.start(this.ctx.currentTime + delay);
  }

  play(name) {
    switch (name) {
      case 'fob': this.tone(1200,.08,{vol:.08});this.tone(1600,.08,{vol:.08,delay:.12});break;
      case 'caralarm': this.tone(660,.24,{type:'square',vol:.11});this.tone(880,.24,{type:'square',vol:.11,delay:.27});break;
      case 'carbump': this.noise(.12,.09);this.tone(90,.15,{vol:.08});break;
      case 'click': this.tone(660, 0.06, { vol: 0.08 }); break;
      case 'select': this.tone(520, 0.07, { vol: 0.1 }); this.tone(780, 0.09, { vol: 0.1, delay: 0.06 }); break;
      case 'foot': this.tone(140 + Math.random() * 40, 0.04, { type: 'triangle', vol: 0.05 }); break;
      case 'gate': this.tone(220, 0.15, { type: 'sawtooth', vol: 0.08, slide: 200 }); this.tone(440, 0.2, { vol: 0.08, delay: 0.12 }); break;
      case 'gateClose': this.tone(300, 0.15, { type: 'sawtooth', vol: 0.08, slide: -200 }); break;
      case 'alert': this.tone(880, 0.12, { vol: 0.14 }); this.tone(1100, 0.18, { vol: 0.14, delay: 0.12 }); break;
      case 'suspicious': this.tone(500, 0.1, { type: 'triangle', vol: 0.08, slide: 200 }); break;
      case 'capture': this.tone(500, 0.2, { vol: 0.12, slide: -300 }); this.tone(300, 0.3, { vol: 0.12, delay: 0.2, slide: -150 }); break;
      case 'rescue': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.12, { vol: 0.1, delay: i * 0.08, type: 'triangle' })); break;
      case 'complete': [523, 659, 784, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.18, { vol: 0.12, delay: i * 0.13, type: 'triangle' })); break;
      case 'chew': this.noise(0.08, 0.08); break;
      case 'crunch': this.noise(0.25, 0.15); this.tone(120, 0.2, { type: 'sawtooth', vol: 0.06 }); break;
      case 'kick': this.noise(0.18, 0.2); this.tone(90, 0.15, { vol: 0.12 }); break;
      case 'climb': this.tone(400, 0.08, { type: 'triangle', vol: 0.08, slide: 300 }); break;
      case 'push': this.tone(80, 0.2, { type: 'sawtooth', vol: 0.07 }); break;
      case 'reach': this.tone(700, 0.08, { type: 'triangle', vol: 0.08, slide: 400 }); break;
      case 'slide': this.tone(900, 0.3, { type: 'sine', vol: 0.06, slide: -500 }); break;
      case 'splash': this.noise(0.3, 0.12); break;
      case 'dig': this.noise(0.1, 0.07); break;
      case 'tunnel': this.tone(200, 0.3, { type: 'sine', vol: 0.08, slide: 300 }); break;
      case 'shell': this.tone(260, 0.08, { type: 'square', vol: 0.06 }); break;
      case 'lookout': this.tone(600, 0.25, { type: 'sine', vol: 0.08, slide: 300 }); break;
      case 'sprint': this.tone(300, 0.15, { type: 'square', vol: 0.06, slide: 300 }); break;
      case 'pickup': this.tone(880, 0.06, { vol: 0.08 }); this.tone(1320, 0.08, { vol: 0.08, delay: 0.05 }); break;
      case 'power': [262, 392, 523].forEach((f, i) => this.tone(f, 0.25, { vol: 0.1, delay: i * 0.1, type: 'sawtooth' })); break;
      case 'clang': this.tone(1200, 0.25, { type: 'square', vol: 0.06 }); this.noise(0.2, 0.12); break;
      case 'error': this.tone(200, 0.15, { vol: 0.08 }); break;
      case 'emote': this.tone(1000, 0.05, { vol: 0.06 }); this.tone(1200, 0.05, { vol: 0.06, delay: 0.05 }); break;
    }
  }

  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    const notes = [57, 60, 64, 60, 62, 65, 69, 65, 55, 59, 62, 59, 57, 60, 64, 67];
    const bass = [45, 45, 41, 41, 43, 43, 45, 45];
    const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
    this.musicTimer = setInterval(() => {
      if (!this.ctx || this.musicVol <= 0 || this.muted) { this.step++; return; }
      const i = this.step % notes.length;
      this.tone(midi(notes[i] + 12), 0.28, { type: 'triangle', vol: 0.12, dest: this.musicGain });
      if (i % 2 === 0) this.tone(midi(bass[(i / 2) % bass.length]), 0.5, { type: 'sine', vol: 0.18, dest: this.musicGain });
      this.step++;
    }, 340);
  }
  stopMusic() { clearInterval(this.musicTimer); this.musicTimer = null; }
}
