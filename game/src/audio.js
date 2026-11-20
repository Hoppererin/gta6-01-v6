// Isla Fortuna — sound. Everything is synthesised with the Web Audio
// API: no audio files, no network. Engine hum, skids, punches, cash
// registers, sirens, boat wakes, rain patter and a lazy island music
// loop built from a few oscillators. All of it is optional: if audio is
// unavailable the game plays silent and every call is a no-op.

export function createAudio() {
  let ctx = null;
  let master = null;
  let musicTimer = null;
  let muted = false;
  let engineOsc = null;
  let engineGain = null;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type = 'sine', vol = 0.2, slideTo = null) {
    if (!ensure() || muted) return;
    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(g);
      g.connect(master);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    } catch { /* silent */ }
  }

  function noise(dur, vol = 0.15, lowpass = 1200) {
    if (!ensure() || muted) return;
    try {
      const t = ctx.currentTime;
      const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = lowpass;
      const g = ctx.createGain();
      g.gain.value = vol;
      src.connect(filt);
      filt.connect(g);
      g.connect(master);
      src.start(t);
    } catch { /* silent */ }
  }

  const api = {
    unlock() { if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {}); },
    setMuted(m) {
      muted = m;
      if (master) master.gain.value = m ? 0 : 0.5;
    },
    isMuted() { return muted; },
    click() { tone(660, 0.06, 'square', 0.08); },
    cash() { tone(880, 0.09, 'sine', 0.18); setTimeout(() => tone(1320, 0.14, 'sine', 0.18), 90); },
    punch() { noise(0.12, 0.25, 500); tone(120, 0.1, 'square', 0.15, 60); },
    crash() { noise(0.3, 0.35, 900); tone(90, 0.25, 'sawtooth', 0.2, 40); },
    skid() { noise(0.18, 0.1, 2400); },
    horn() { tone(370, 0.18, 'square', 0.12); tone(466, 0.18, 'square', 0.1); },
    siren() { tone(700, 0.4, 'sine', 0.1, 950); },
    scanner() { tone(1200, 0.07, 'sine', 0.1); setTimeout(() => tone(900, 0.07, 'sine', 0.1), 120); },
    splash() { noise(0.35, 0.2, 800); },
    rainTick() { noise(0.05, 0.03, 3000); },
    pickup() { tone(520, 0.08, 'triangle', 0.15); setTimeout(() => tone(780, 0.1, 'triangle', 0.15), 80); },
    missionOk() { [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'triangle', 0.16), i * 110)); },
    missionFail() { [392, 330, 262].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'triangle', 0.14), i * 130)); },
    busted() { tone(220, 0.5, 'sawtooth', 0.18, 110); },
    engine(speed01) {
      if (!ensure() || muted) return;
      try {
        if (!engineOsc) {
          engineOsc = ctx.createOscillator();
          engineGain = ctx.createGain();
          engineOsc.type = 'sawtooth';
          engineOsc.frequency.value = 60;
          engineGain.gain.value = 0;
          engineOsc.connect(engineGain);
          engineGain.connect(master);
          engineOsc.start();
        }
        engineOsc.frequency.setTargetAtTime(55 + speed01 * 160, ctx.currentTime, 0.05);
        engineGain.gain.setTargetAtTime(speed01 > 0.02 ? 0.05 + speed01 * 0.05 : 0, ctx.currentTime, 0.1);
      } catch { /* silent */ }
    },
    engineOff() {
      if (engineGain) engineGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
    },
    // A lazy island loop: a I–vi–IV–V walk in C, one soft note a beat.
    startMusic() {
      if (!ensure() || musicTimer) return;
      const chords = [[261.6, 329.6, 392.0], [220.0, 261.6, 329.6], [174.6, 220.0, 261.6], [196.0, 246.9, 293.7]];
      let step = 0;
      musicTimer = setInterval(() => {
        if (muted) return;
        const chord = chords[Math.floor(step / 2) % chords.length];
        tone(chord[step % 3], 0.5, 'triangle', 0.05);
        if (step % 4 === 0) tone(chord[0] / 2, 0.9, 'sine', 0.06);
        step++;
      }, 420);
    },
    stopMusic() {
      if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    },
  };
  return api;
}
