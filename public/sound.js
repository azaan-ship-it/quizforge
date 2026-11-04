// QuizForge audio — sound effects and a different competitive soundtrack for every game mode.
// Everything is synthesized with Web Audio, so there are no audio files to ship.
(function () {
  let ctx = null;
  let master = null;
  let musicBus = null;
  const prefs = { sound: true, music: true, volume: 0.8 };
  try { Object.assign(prefs, JSON.parse(localStorage.getItem('qf-audio') || '{}')); } catch {}

  function ac() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = prefs.volume;
      master.connect(ctx.destination);
      musicBus = ctx.createGain();
      musicBus.gain.value = 0.55;
      musicBus.connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // ---------- instruments ----------
  function osc(freq, t, dur, { type = 'square', vol = 0.08, slide = 0, dest, attack = 0.005 } = {}) {
    const c = ac();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest || master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  let noiseBuf = null;
  function noise(t, dur, { vol = 0.1, hp = 0, bp = 0, dest } = {}) {
    const c = ac();
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = c.createBufferSource();
    src.buffer = noiseBuf;
    let node = src;
    if (hp) { const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; node.connect(f); node = f; }
    if (bp) { const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = bp; f.Q.value = 0.8; node.connect(f); node = f; }
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    node.connect(g).connect(dest || master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  const kick = (t, d) => { osc(150, t, 0.22, { type: 'sine', vol: 0.5, slide: -110, dest: d }); };
  const snare = (t, d) => { noise(t, 0.16, { vol: 0.22, bp: 1800, dest: d }); osc(190, t, 0.08, { type: 'triangle', vol: 0.12, dest: d }); };
  const hat = (t, d, open) => noise(t, open ? 0.12 : 0.04, { vol: open ? 0.07 : 0.05, hp: 7000, dest: d });
  const clap = (t, d) => { [0, 0.012, 0.024].forEach(o => noise(t + o, 0.09, { vol: 0.12, bp: 1400, dest: d })); };

  // ---------- sound effects ----------
  const now = () => ac().currentTime;
  const SFX = {
    correct: () => { const t = now(); osc(660, t, 0.09); osc(880, t + 0.08, 0.14); },
    wrong: () => { osc(220, now(), 0.25, { type: 'sawtooth', vol: 0.06, slide: -80 }); },
    click: () => osc(520, now(), 0.04, { vol: 0.04 }),
    chest: () => { const t = now(); [523, 659, 784, 1047].forEach((f, i) => osc(f, t + i * 0.06, 0.12, { type: 'triangle', vol: 0.09 })); },
    hit: () => osc(140, now(), 0.2, { type: 'sawtooth', vol: 0.08, slide: -60 }),
    ko: () => { const t = now(); osc(400, t, 0.15); osc(200, t + 0.12, 0.3, { slide: -120 }); },
    join: () => osc(780, now(), 0.08, { type: 'triangle', vol: 0.06 }),
    start: () => { const t = now(); [392, 523, 659, 784].forEach((f, i) => osc(f, t + i * 0.09, 0.16, { type: 'triangle', vol: 0.1 })); },
    win: () => { const t = now(); [523, 659, 784, 1047, 784, 1047].forEach((f, i) => osc(f, t + i * 0.11, 0.18, { type: 'triangle', vol: 0.1 })); },
    tick: () => osc(1200, now(), 0.03, { vol: 0.03 }),
    unlock: () => { const t = now(); [784, 988, 1175, 1568].forEach((f, i) => osc(f, t + i * 0.08, 0.2, { type: 'triangle', vol: 0.1 })); },
    coin: () => { const t = now(); osc(988, t, 0.06, { vol: 0.06 }); osc(1319, t + 0.06, 0.12, { vol: 0.06 }); },
    splash: () => noise(now(), 0.35, { vol: 0.12, bp: 900 }),
    spin: () => { const t = now(); for (let i = 0; i < 10; i++) osc(500 + i * 60, t + i * 0.04, 0.04, { vol: 0.04 }); },
  };

  function play(name) {
    if (!prefs.sound || !SFX[name]) return;
    try { SFX[name](); } catch {}
  }

  // ---------- music ----------
  // Patterns are 16 steps (one bar of 16th notes). Bass and lead digits are scale degrees, '-' is a rest.
  const SCALES = {
    minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10],
    major: [0, 2, 4, 5, 7, 9, 11], harmonic: [0, 2, 3, 5, 7, 8, 11], mixolydian: [0, 2, 4, 5, 7, 9, 10],
    pentatonic: [0, 3, 5, 7, 10],
  };
  const D = { four: 'x...x...x...x...', drive: 'x..x..x.x..x..x.', broken: 'x.....x...x.....', half: 'x.......x.......', gallop: 'x..xx..xx..xx..x', double: 'x.x.x...x.x.x...' };
  const SN = { back: '....x.......x...', fill: '....x.......x.xx', trap: '........x.......', busy: '....x..x....x..x', none: '................' };
  const HH = { eighth: 'x.x.x.x.x.x.x.x.', sixteenth: 'xxxxxxxxxxxxxxxx', off: '..x...x...x...x.', trap: 'x.xxx.x.xxxxx.x.' };

  const TRACKS = {
    lobby: { bpm: 104, root: 57, scale: 'dorian', prog: [0, 3, 4, 3], kick: D.half, snare: SN.none, hat: HH.off, bass: '0-------0---4---', lead: '4-2-0---4-5-4---', leadWave: 'triangle', bassWave: 'sine', pad: true },
    classic: { bpm: 140, root: 57, scale: 'minor', prog: [0, 5, 3, 4], kick: D.four, snare: SN.back, hat: HH.eighth, bass: '0-0-0-0-7-7-0-0-', lead: '0-2-4-7-6-4-2-4-', leadWave: 'square', bassWave: 'sawtooth' },
    gold: { bpm: 128, root: 55, scale: 'mixolydian', prog: [0, 6, 3, 0], kick: D.double, snare: SN.back, hat: HH.off, bass: '0--0--0-4--4--5-', lead: '7-9-7-4-2-4-7---', leadWave: 'square', bassWave: 'square', clap: true },
    td: { bpm: 132, root: 50, scale: 'phrygian', prog: [0, 1, 0, 6], kick: D.drive, snare: SN.fill, hat: HH.sixteenth, bass: '0000000011110000', lead: '0---1---3---1---', leadWave: 'sawtooth', bassWave: 'sawtooth' },
    clash: { bpm: 150, root: 52, scale: 'harmonic', prog: [0, 5, 6, 4], kick: D.gallop, snare: SN.back, hat: HH.eighth, bass: '0-00-00-0-00-00-', lead: '4-4-5-4-3-2-1-2-', leadWave: 'sawtooth', bassWave: 'sawtooth' },
    royale: { bpm: 156, root: 53, scale: 'phrygian', prog: [0, 1, 6, 5], kick: D.four, snare: SN.busy, hat: HH.sixteenth, bass: '0-0-1-0-0-0-6-5-', lead: '7-6-5-4-5-4-3-1-', leadWave: 'square', bassWave: 'sawtooth' },
    race: { bpm: 164, root: 59, scale: 'major', prog: [0, 4, 5, 3], kick: D.four, snare: SN.back, hat: HH.sixteenth, bass: '0-0-7-0-0-0-7-0-', lead: '0-2-4-5-7-5-4-2-', leadWave: 'square', bassWave: 'square' },
    climb: { bpm: 120, root: 50, scale: 'dorian', prog: [0, 3, 4, 6], kick: D.broken, snare: SN.back, hat: HH.eighth, bass: '0---0-3-4---3---', lead: '0-1-2-3-4-5-6-7-', leadWave: 'triangle', bassWave: 'sawtooth' },
    boss: { bpm: 146, root: 45, scale: 'harmonic', prog: [0, 1, 0, 6], kick: D.drive, snare: SN.fill, hat: HH.eighth, bass: '00-000-000-00-00', lead: '7---6---5---6-4-', leadWave: 'sawtooth', bassWave: 'sawtooth', pad: true },
    fishing: { bpm: 112, root: 60, scale: 'pentatonic', prog: [0, 3, 2, 4], kick: D.broken, snare: SN.trap, hat: HH.off, bass: '0-----0---2-----', lead: '4-3---2-0---2-3-', leadWave: 'triangle', bassWave: 'sine' },
    factory: { bpm: 126, root: 52, scale: 'minor', prog: [0, 0, 5, 4], kick: D.four, snare: SN.back, hat: HH.sixteenth, bass: '0-0-0-0-0-0-0-0-', lead: '0-0-7-0-0-7-5-3-', leadWave: 'square', bassWave: 'square', clap: true },
    dig: { bpm: 118, root: 55, scale: 'mixolydian', prog: [0, 3, 6, 3], kick: D.double, snare: SN.back, hat: HH.eighth, bass: '0-4-0-4-0-4-5-6-', lead: '2---4---2-1-0---', leadWave: 'triangle', bassWave: 'square' },
    territory: { bpm: 134, root: 57, scale: 'major', prog: [0, 5, 3, 4], kick: D.four, snare: SN.back, hat: HH.off, bass: '0--0--0-0--0--0-', lead: '4-4-5-7-7-5-4-2-', leadWave: 'square', bassWave: 'sawtooth', clap: true },
    blitz: { bpm: 172, root: 54, scale: 'minor', prog: [0, 6, 5, 4], kick: D.drive, snare: SN.busy, hat: HH.sixteenth, bass: '0000777700005555', lead: '0-3-5-7-0-3-5-6-', leadWave: 'square', bassWave: 'sawtooth' },
    sudden: { bpm: 96, root: 48, scale: 'phrygian', prog: [0, 1, 0, 1], kick: D.half, snare: SN.trap, hat: HH.trap, bass: '0-------1-------', lead: '----4---3---1---', leadWave: 'sine', bassWave: 'sawtooth', pad: true },
    spin: { bpm: 138, root: 60, scale: 'major', prog: [0, 3, 4, 4], kick: D.four, snare: SN.back, hat: HH.eighth, bass: '0-0-4-4-5-5-4---', lead: '7-6-5-4-3-4-5-7-', leadWave: 'square', bassWave: 'square', clap: true },
    tug: { bpm: 142, root: 50, scale: 'minor', prog: [0, 3, 0, 4], kick: D.gallop, snare: SN.back, hat: HH.eighth, bass: '0-0-0-0-3-3-4-4-', lead: '0---0---3-4-0---', leadWave: 'sawtooth', bassWave: 'sawtooth', clap: true },
  };

  const midi = n => 440 * Math.pow(2, (n - 69) / 12);

  function degree(track, chordRoot, deg) {
    const sc = SCALES[track.scale];
    const idx = chordRoot + deg;
    const oct = Math.floor(idx / sc.length);
    return track.root + sc[((idx % sc.length) + sc.length) % sc.length] + 12 * oct;
  }

  const music = { track: null, name: null, step: 0, next: 0, timer: null, intense: false };

  function scheduleStep(t, stepDur) {
    const tr = music.track;
    const s = music.step % 16;
    const bar = Math.floor(music.step / 16);
    const chord = tr.prog[bar % tr.prog.length];
    const d = musicBus;
    if (tr.kick[s] === 'x') kick(t, d);
    if (tr.snare[s] === 'x') (tr.clap ? clap : snare)(t, d);
    if (tr.hat[s] === 'x' || (music.intense && s % 2 === 1)) hat(t, d, s === 14);
    const b = tr.bass[s];
    if (b !== '-') osc(midi(degree(tr, chord, Number(b)) - 24), t, stepDur * 1.8, { type: tr.bassWave, vol: 0.09, dest: d });
    const l = tr.lead[s];
    // the lead plays every other bar so the groove has room; when time is running out it plays every bar
    if (l !== '-' && (bar % 2 === 1 || music.intense)) osc(midi(degree(tr, chord, Number(l)) + 12), t, stepDur * 1.6, { type: tr.leadWave, vol: 0.045, dest: d });
    if (tr.pad && s === 0) [0, 2, 4].forEach(k => osc(midi(degree(tr, chord, k)), t, stepDur * 15, { type: 'triangle', vol: 0.025, attack: 0.3, dest: d }));
    if (music.intense && s === 0 && bar % 2 === 0) noise(t, stepDur * 8, { vol: 0.04, hp: 3000, dest: d });
  }

  function pump() {
    if (!music.track) return;
    const c = ac();
    const bpm = music.track.bpm * (music.intense ? 1.08 : 1);
    const stepDur = 60 / bpm / 4;
    if (music.next < c.currentTime - 0.5) music.next = c.currentTime + 0.05; // tab was asleep: don't burst-play
    while (music.next < c.currentTime + 0.12) {
      scheduleStep(music.next, stepDur);
      music.next += stepDur;
      music.step++;
    }
  }

  function playTrack(name) {
    if (music.name === name && music.timer) return;
    stopMusic();
    music.name = name;
    if (!prefs.music || !TRACKS[name]) return;
    try {
      const c = ac();
      music.track = TRACKS[name];
      music.step = 0;
      music.intense = false;
      music.next = c.currentTime + 0.08;
      musicBus.gain.cancelScheduledValues(c.currentTime);
      musicBus.gain.setValueAtTime(0.0001, c.currentTime);
      musicBus.gain.linearRampToValueAtTime(0.55, c.currentTime + 0.6);
      music.timer = setInterval(pump, 25);
    } catch {}
  }

  function stopMusic() {
    clearInterval(music.timer);
    music.timer = null;
    music.track = null;
    music.name = null;
    music.intense = false;
  }

  function setIntense(on) { music.intense = !!on; }

  function set(key, value) {
    prefs[key] = key === 'volume' ? Number(value) : !!value;
    try { localStorage.setItem('qf-audio', JSON.stringify(prefs)); } catch {}
    if (key === 'volume' && master) master.gain.value = prefs.volume;
    if (key === 'music') {
      const name = music.name || music.wanted;
      if (!value) { music.wanted = name; stopMusic(); }
      else if (name) playTrack(name);
    }
  }

  // browsers block audio until the first click, so start the wanted track then
  document.addEventListener('pointerdown', () => {
    if (prefs.music && music.name && !music.timer) { const n = music.name; music.name = null; playTrack(n); }
  });

  window.SFX = { play, set, prefs, playTrack, stopMusic, setIntense, tracks: Object.keys(TRACKS) };
})();
