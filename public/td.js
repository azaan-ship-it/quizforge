// QuizForge Tower Defense — right answers earn coins, coins build towers.
(function () {
  const W = 640, H = 400;
  const PATH = [[-20, 80], [160, 80], [160, 300], [340, 300], [340, 110], [520, 110], [520, 320], [660, 320]];
  const TOWERS = {
    bolt: { name: 'Bolt', icon: '⚡', cost: 100, range: 95, dmg: 9, rate: 0.45, color: '#48a6ff' },
    frost: { name: 'Frost', icon: '❄️', cost: 175, range: 85, dmg: 4, rate: 0.8, slow: 0.5, color: '#2ee6a8' },
    blaster: { name: 'Blaster', icon: '💥', cost: 250, range: 80, dmg: 30, rate: 1.3, splash: 45, color: '#ff5c7a' },
  };

  // precompute path segments
  const segs = [];
  let pathLen = 0;
  for (let i = 0; i < PATH.length - 1; i++) {
    const [x1, y1] = PATH[i], [x2, y2] = PATH[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1);
    segs.push({ x1, y1, x2, y2, len, start: pathLen });
    pathLen += len;
  }
  function posAt(d) {
    for (const s of segs) {
      if (d <= s.start + s.len) {
        const t = (d - s.start) / s.len;
        return [s.x1 + (s.x2 - s.x1) * t, s.y1 + (s.y2 - s.y1) * t];
      }
    }
    const last = PATH[PATH.length - 1];
    return [last[0], last[1]];
  }
  function distToPath(x, y) {
    let best = Infinity;
    for (const s of segs) {
      const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
      const t = Math.max(0, Math.min(1, ((x - s.x1) * dx + (y - s.y1) * dy) / (dx * dx + dy * dy)));
      best = Math.min(best, Math.hypot(x - (s.x1 + dx * t), y - (s.y1 + dy * t)));
    }
    return best;
  }

  let S = null; // game state

  function start(canvas, shopEl, hooks) {
    stop();
    S = {
      canvas, ctx: canvas.getContext('2d'), shopEl, hooks,
      coins: 150, lives: 20, wave: 0, score: 0, kills: 0,
      towers: [], enemies: [], beams: [], selected: 'bolt',
      spawnLeft: 0, spawnTimer: 0, spawnGap: 1, waveHp: 0, waveSpeed: 0,
      breakTimer: 20, started: false, over: false, last: performance.now(), raf: 0, reportTimer: 0,
    };
    renderShop();
    canvas.onclick = onClick;
    S.raf = requestAnimationFrame(loop);
    changed();
  }

  function stop() {
    if (!S) return;
    cancelAnimationFrame(S.raf);
    S.canvas.onclick = null;
    S = null;
  }

  function addCoins(n) {
    if (!S || S.over) return;
    S.coins += n;
    changed();
  }

  function changed() {
    if (!S) return;
    S.hooks.onChange && S.hooks.onChange({ coins: S.coins, lives: S.lives, wave: S.wave, score: S.score });
    renderShopState();
  }

  function report() {
    S.hooks.onReport && S.hooks.onReport({ score: S.score, wave: S.wave, lives: S.lives });
  }

  function renderShop() {
    S.shopEl.innerHTML = '';
    for (const [key, t] of Object.entries(TOWERS)) {
      const b = document.createElement('button');
      b.className = 'tower-btn';
      b.dataset.key = key;
      b.innerHTML = `${t.icon} ${t.name} <small>${t.cost}</small>`;
      b.onclick = () => { S.selected = S.selected === key ? null : key; renderShopState(); };
      S.shopEl.appendChild(b);
    }
    const tip = document.createElement('p');
    tip.className = 'td-tip';
    tip.textContent = 'Pick a tower, then click the map to build. Click a tower you own with nothing picked to upgrade it.';
    S.shopEl.appendChild(tip);
  }

  function renderShopState() {
    if (!S) return;
    for (const b of S.shopEl.querySelectorAll('.tower-btn')) {
      b.setAttribute('aria-pressed', String(S.selected === b.dataset.key));
      b.disabled = S.coins < TOWERS[b.dataset.key].cost;
    }
  }

  function canvasPoint(e) {
    const r = S.canvas.getBoundingClientRect();
    return [(e.clientX - r.left) * (W / r.width), (e.clientY - r.top) * (H / r.height)];
  }

  function upgradeCost(t) { return Math.round(TOWERS[t.type].cost * 0.75 * t.level); }

  function onClick(e) {
    if (!S || S.over) return;
    const [x, y] = canvasPoint(e);
    const hit = S.towers.find(t => Math.hypot(t.x - x, t.y - y) < 18);
    if (hit) {
      if (S.selected) return flash('A tower is already there');
      if (hit.level >= 3) return flash('That tower is maxed out');
      const cost = upgradeCost(hit);
      if (S.coins < cost) return flash(`Upgrade costs ${cost} coins`);
      S.coins -= cost;
      hit.level++;
      changed();
      return;
    }
    if (!S.selected) return flash('Pick a tower first');
    const type = TOWERS[S.selected];
    if (S.coins < type.cost) return flash('Answer questions to earn more coins');
    if (x < 16 || y < 16 || x > W - 16 || y > H - 16) return;
    if (distToPath(x, y) < 30) return flash('You cannot build on the path');
    if (S.towers.some(t => Math.hypot(t.x - x, t.y - y) < 34)) return flash('Too close to another tower');
    S.coins -= type.cost;
    S.towers.push({ type: S.selected, x, y, level: 1, cd: 0 });
    if (!S.started) { S.started = true; S.breakTimer = Math.min(S.breakTimer, 3); }
    changed();
  }

  function flash(text) { S.msg = { text, t: 1.6 }; }

  function startWave() {
    S.wave++;
    const n = S.wave;
    S.spawnLeft = 5 + n * 2;
    S.spawnGap = Math.max(0.35, 1 - n * 0.05);
    S.spawnTimer = 0;
    S.waveHp = Math.round((18 + n * 14) * (1 + n * 0.08));
    S.waveSpeed = 45 + n * 2.5;
    S.bossDue = n % 5 === 0;
    changed();
    report();
  }

  function spawn(boss) {
    const hp = boss ? S.waveHp * 8 : S.waveHp;
    S.enemies.push({ d: 0, hp, max: hp, speed: S.waveSpeed * (boss ? 0.7 : 1), slowUntil: 0, boss, r: boss ? 15 : 9 });
  }

  function update(dt, now) {
    // waves
    if (S.spawnLeft > 0) {
      S.spawnTimer -= dt;
      if (S.spawnTimer <= 0) {
        S.spawnLeft--;
        spawn(S.bossDue && S.spawnLeft === 0);
        S.spawnTimer = S.spawnGap;
      }
    } else if (S.enemies.length === 0) {
      S.breakTimer -= dt;
      if (S.breakTimer <= 0) { startWave(); S.breakTimer = 4; }
    }

    // enemies
    for (const e of S.enemies) {
      const slow = now < e.slowUntil ? 0.5 : 1;
      e.d += e.speed * slow * dt;
      if (e.d >= pathLen) {
        e.dead = true;
        S.lives = Math.max(0, S.lives - (e.boss ? 5 : 1));
        changed();
      }
    }

    // towers
    for (const t of S.towers) {
      const def = TOWERS[t.type];
      const range = def.range + (t.level - 1) * 10;
      t.cd -= dt;
      if (t.cd > 0) continue;
      let target = null;
      for (const e of S.enemies) {
        if (e.dead) continue;
        const [ex, ey] = posAt(e.d);
        if (Math.hypot(ex - t.x, ey - t.y) <= range && (!target || e.d > target.d)) target = e;
      }
      if (!target) continue;
      t.cd = def.rate;
      const dmg = def.dmg * Math.pow(1.5, t.level - 1);
      const [tx, ty] = posAt(target.d);
      S.beams.push({ x1: t.x, y1: t.y, x2: tx, y2: ty, color: def.color, t: 0.1 });
      if (def.splash) {
        for (const e of S.enemies) {
          const [ex, ey] = posAt(e.d);
          if (!e.dead && Math.hypot(ex - tx, ey - ty) <= def.splash) hit(e, dmg);
        }
      } else hit(target, dmg);
      if (def.slow) target.slowUntil = now + 1600;
    }

    S.enemies = S.enemies.filter(e => !e.dead);
    S.beams = S.beams.filter(b => (b.t -= dt) > 0);
    if (S.msg && (S.msg.t -= dt) <= 0) S.msg = null;

    S.reportTimer -= dt;
    if (S.reportTimer <= 0) { S.reportTimer = 2; report(); }

    if (S.lives <= 0 && !S.over) {
      S.over = true;
      report();
      S.hooks.onGameOver && S.hooks.onGameOver({ score: S.score, wave: S.wave });
    }
  }

  function hit(e, dmg) {
    if (e.dead) return;
    e.hp -= dmg;
    if (e.hp <= 0) {
      e.dead = true;
      S.kills++;
      S.score += (e.boss ? 100 : 10) + S.wave * 2;
      S.coins += e.boss ? 40 : 3;
      changed();
    }
  }

  function draw() {
    const c = S.ctx;
    c.clearRect(0, 0, W, H);
    // path
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.strokeStyle = '#3a2766';
    c.lineWidth = 40;
    c.beginPath();
    PATH.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.stroke();
    c.strokeStyle = '#4c3880';
    c.lineWidth = 2;
    c.setLineDash([8, 10]);
    c.stroke();
    c.setLineDash([]);
    // base
    c.font = '30px sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('🏰', 610, 320);
    // towers
    for (const t of S.towers) {
      const def = TOWERS[t.type];
      c.fillStyle = def.color;
      c.beginPath();
      c.arc(t.x, t.y, 16, 0, Math.PI * 2);
      c.fill();
      c.font = '16px sans-serif';
      c.fillText(def.icon, t.x, t.y + 1);
      for (let i = 0; i < t.level; i++) {
        c.fillStyle = '#ffc93c';
        c.beginPath();
        c.arc(t.x - 8 + i * 8, t.y + 22, 2.5, 0, Math.PI * 2);
        c.fill();
      }
    }
    // beams
    for (const b of S.beams) {
      c.strokeStyle = b.color;
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(b.x1, b.y1);
      c.lineTo(b.x2, b.y2);
      c.stroke();
    }
    // enemies
    const now = performance.now();
    for (const e of S.enemies) {
      const [x, y] = posAt(e.d);
      c.fillStyle = e.boss ? '#ff5c7a' : (now < e.slowUntil ? '#9ef5d7' : '#fff8e7');
      c.beginPath();
      c.arc(x, y, e.r, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#1a1033';
      c.fillRect(x - 12, y - e.r - 8, 24, 4);
      c.fillStyle = '#2ee6a8';
      c.fillRect(x - 12, y - e.r - 8, 24 * Math.max(0, e.hp / e.max), 4);
    }
    // text
    c.fillStyle = '#fff8e7';
    c.font = '600 15px Fredoka, sans-serif';
    c.textAlign = 'left';
    c.fillText(`Wave ${S.wave}   Lives ${S.lives}   Coins ${S.coins}`, 12, 20);
    if (!S.started) {
      c.textAlign = 'center';
      c.font = '600 18px Fredoka, sans-serif';
      c.fillText('Build a tower to start. Wave 1 also starts on its own soon.', W / 2, H - 24);
    }
    if (S.msg) {
      c.textAlign = 'center';
      c.fillStyle = '#ffc93c';
      c.font = '600 18px Fredoka, sans-serif';
      c.fillText(S.msg.text, W / 2, 200);
    }
    if (S.over) {
      c.fillStyle = 'rgba(26,16,51,.8)';
      c.fillRect(0, 0, W, H);
      c.fillStyle = '#ff5c7a';
      c.textAlign = 'center';
      c.font = '700 40px Fredoka, sans-serif';
      c.fillText('Base destroyed', W / 2, H / 2 - 10);
      c.fillStyle = '#fff8e7';
      c.font = '500 20px Fredoka, sans-serif';
      c.fillText(`You reached wave ${S.wave} with ${S.score} points`, W / 2, H / 2 + 30);
    }
  }

  function loop(now) {
    if (!S) return;
    const dt = Math.min(0.05, (now - S.last) / 1000);
    S.last = now;
    if (!S.over) update(dt, now);
    if (!S) return;
    draw();
    S.raf = requestAnimationFrame(loop);
  }

  window.TD = { start, stop, addCoins };
})();
