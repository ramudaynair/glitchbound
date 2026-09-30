// Tiny synthesized audio: SFX + escalating music. No assets.
const Audio2 = (() => {
  let ctx = null, master = null, muted = false, musicTimer = null, musicStep = 0, urgency = 0, musicOn = false;
  function init() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    } catch (e) { ctx = null; }
  }
  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }
  function tone(freq, dur, type = 'square', vol = 0.15, slide = 0, delay = 0) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol = 0.1, delay = 0) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + delay;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = ctx.createBufferSource(); s.buffer = buf;
    const g = ctx.createGain(); g.gain.value = vol;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1200 + Math.random() * 800;
    s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }
  const sfx = {
    step() { tone(140 + Math.random() * 40, 0.05, 'triangle', 0.05, -40); },
    beep() { tone(880, 0.08, 'square', 0.08); tone(1320, 0.1, 'square', 0.06, 0, 0.08); },
    open() { tone(520, 0.07, 'triangle', 0.1); tone(780, 0.1, 'triangle', 0.1, 0, 0.07); },
    close() { tone(600, 0.07, 'triangle', 0.08); tone(400, 0.1, 'triangle', 0.08, 0, 0.06); },
    error() { tone(220, 0.15, 'sawtooth', 0.1, -80); tone(160, 0.2, 'sawtooth', 0.1, -60, 0.12); },
    success() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.12, 0, i * 0.07)); },
    boot() { tone(200, 0.4, 'sawtooth', 0.08, 600); tone(880, 0.15, 'square', 0.06, 0, 0.4); },
    cable() { tone(300, 0.06, 'square', 0.1, 200); noise(0.05, 0.08); },
    glitch() { for (let i = 0; i < 4; i++) tone(200 + Math.random() * 900, 0.05, 'square', 0.06, 0, i * 0.05); noise(0.12, 0.1); },
    warn() { tone(660, 0.12, 'square', 0.08); tone(660, 0.12, 'square', 0.08, 0, 0.18); },
    alarm() { tone(880, 0.2, 'sawtooth', 0.07, -300); },
    tick() { tone(1200, 0.03, 'square', 0.05); },
    charge(p) { tone(200 + p * 600, 0.06, 'triangle', 0.05); },
    victory() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.25, 'triangle', 0.14, 0, i * 0.11)); },
    collapse() { tone(400, 1.2, 'sawtooth', 0.15, -350); noise(0.8, 0.15, 0.3); },
    pop() { tone(700, 0.06, 'sine', 0.1, 300); },
  };
  // music: gentle arpeggio; urgency 0..1 raises tempo and pitch
  const scaleCalm = [261.6, 329.6, 392.0, 493.9, 523.3, 659.3];
  const scaleTense = [246.9, 293.7, 349.2, 415.3, 493.9, 587.3];
  function startMusic() {
    if (!ctx || musicOn) return;
    musicOn = true; musicStep = 0;
    const loop = () => {
      if (!musicOn) return;
      const scale = urgency > 0.5 ? scaleTense : scaleCalm;
      const pattern = [0, 2, 4, 2, 1, 3, 5, 3];
      const n = scale[pattern[musicStep % pattern.length]] * (urgency > 0.8 && musicStep % 2 ? 2 : 1);
      if (!muted) {
        tone(n, 0.3, 'triangle', 0.045 + urgency * 0.02);
        if (musicStep % 4 === 0) tone(n / 2, 0.5, 'sine', 0.05);
        if (urgency > 0.6 && musicStep % 2 === 0) tone(80, 0.1, 'square', 0.04 * urgency);
      }
      musicStep++;
      const interval = 420 - urgency * 260;
      musicTimer = setTimeout(loop, interval);
    };
    loop();
  }
  function stopMusic() { musicOn = false; clearTimeout(musicTimer); }
  function setUrgency(u) { urgency = Math.max(0, Math.min(1, u)); }
  function toggleMute() { muted = !muted; return muted; }
  return { init, resume, sfx, startMusic, stopMusic, setUrgency, toggleMute, get muted() { return muted; } };
})();
