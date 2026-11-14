// Sons synthétisés (aucun fichier audio) : ambiance de la pièce, sonnerie, papier, tampon, sirènes.
export function createAudio() {
  let ctx = null, master = null, enabled = true;
  let ringTimer = null, sirenNodes = null, humNodes = null, tickTimer = null;

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = enabled ? 0.8 : 0;
    master.connect(ctx.destination);
    ambient();
  }
  function noiseBuffer(seconds = 2, brown = false) {
    const len = ctx.sampleRate * seconds;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
    }
    return buf;
  }
  function ambient() {
    // Ronronnement de la pièce et vent derrière les vitres.
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(4, true);
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 380;
    const g = ctx.createGain();
    g.gain.value = 0.16;
    src.connect(lp).connect(g).connect(master);
    src.start();
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lg = ctx.createGain();
    lg.gain.value = 0.06;
    lfo.connect(lg).connect(g.gain);
    lfo.start();
    // Tic-tac de l'horloge, très discret.
    let tick = false;
    tickTimer = setInterval(() => { if (ctx.state === 'running') blip(tick ? 2600 : 2200, 0.012, 0.03, 'square'); tick = !tick; }, 1000);
  }
  function blip(freq, vol, dur, type = 'sine', when = 0) {
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  function burst(dur, f0, f1, vol, q = 1, when = 0) {
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(Math.max(0.1, dur + 0.05));
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = q;
    bp.frequency.setValueAtTime(f0, t);
    bp.frequency.linearRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g).connect(master);
    src.start(t);
    src.stop(t + dur + 0.05);
  }
  // Sonnerie électromécanique : timbre de cloche frappé à 20 Hz.
  function ringOnce() {
    if (!ctx) return;
    const t0 = ctx.currentTime;
    for (const [f, v] of [[1020, 0.06], [1530, 0.04], [2380, 0.025]]) {
      const o = ctx.createOscillator();
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = 0;
      for (let k = 0; k < 22; k++) {
        const t = t0 + k * 0.05;
        g.gain.setValueAtTime(v, t);
        g.gain.exponentialRampToValueAtTime(v * 0.25, t + 0.045);
      }
      g.gain.setValueAtTime(0, t0 + 1.12);
      o.connect(g).connect(master);
      o.start(t0);
      o.stop(t0 + 1.2);
    }
  }

  return {
    init,
    get enabled() { return enabled; },
    setEnabled(v) {
      enabled = v;
      if (master) master.gain.value = v ? 0.8 : 0;
    },
    resume() { if (ctx?.state === 'suspended') ctx.resume(); },
    ring() {
      if (!ctx || ringTimer) return;
      ringOnce();
      ringTimer = setInterval(ringOnce, 3000);
    },
    stopRing() { clearInterval(ringTimer); ringTimer = null; },
    pickup() { this.stopRing(); burst(0.06, 1800, 900, 0.25, 2); blip(140, 0.12, 0.08); },
    hangup() { burst(0.08, 1200, 500, 0.3, 2); blip(110, 0.15, 0.1); },
    click() { blip(1800, 0.03, 0.03, 'square'); },
    key() { burst(0.03, 3000, 2500, 0.08, 4); },
    paper() { burst(0.28, 2400, 4200, 0.12, 0.7); },
    stamp() { blip(85, 0.4, 0.22); burst(0.08, 800, 300, 0.3, 1); },
    night() { blip(110, 0.08, 2.5); blip(165, 0.05, 2.5, 'sine', 0.1); },
    setSiren(on) {
      if (!ctx) return;
      if (on && !sirenNodes) {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = 760;
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.35;
        const lg = ctx.createGain();
        lg.gain.value = 180;
        lfo.connect(lg).connect(o.frequency);
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 1100;
        const g = ctx.createGain();
        g.gain.value = 0.012;
        o.connect(lp).connect(g).connect(master);
        o.start(); lfo.start();
        sirenNodes = { o, lfo };
      } else if (!on && sirenNodes) {
        sirenNodes.o.stop(); sirenNodes.lfo.stop();
        sirenNodes = null;
      }
    },
    setHum(on) {
      if (!ctx) return;
      if (on && !humNodes) {
        const o = ctx.createOscillator();
        o.frequency.value = 50;
        const o2 = ctx.createOscillator();
        o2.frequency.value = 100;
        const g = ctx.createGain();
        g.gain.value = 0.02;
        o.connect(g); o2.connect(g); g.connect(master);
        o.start(); o2.start();
        humNodes = { o, o2 };
      } else if (!on && humNodes) {
        humNodes.o.stop(); humNodes.o2.stop();
        humNodes = null;
      }
    },
  };
}
