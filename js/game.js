// GLITCHBOUND — main game loop, events, consequences, HUD.
(() => {
  const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
  const portrait = document.getElementById('portrait'), pctx = portrait.getContext('2d');
  const titleCanvas = document.getElementById('title-robot'), tctx = titleCanvas.getContext('2d');
  const titleBg = document.getElementById('title-bg'), bctx = titleBg.getContext('2d');
  const $ = id => document.getElementById(id);
  const VW = 1280, VH = 720, DURATION = 60;
  const { NODES, EDGES, P } = World;
  const keys = new Set();
  let state = 'title'; // title | play | ending | result
  let G = null, lastTs = 0, globalT = 0;

  // ---------- setup ----------
  World.build();
  function fitStage() { const s = Math.min(window.innerWidth / VW, window.innerHeight / VH); document.getElementById('stage').style.setProperty('--scale', s.toFixed(4)); }
  window.addEventListener('resize', fitStage); fitStage();

  const EVENT_TYPES = ['server', 'connection', 'data', 'glitch', 'router'];
  const LINES = {
    problem: ['Uh-oh.', 'That doesn\'t look right.', 'Something\'s wrong over there.', 'Another one?!'],
    fixed: ['Got it!', 'Back online!', 'Nice.', 'Fixed!'],
    worse: ['That\'s... not good.', 'Oh no.', 'We lost that one.'],
    lowTime: ['We\'re running out of time!', 'Hurry, hurry!'],
    tips: ['The CORE is what matters. Everything else is optional.', 'Cables carry packets. No packets, no network.', 'Glitches aren\'t evil. Just... confused.', 'Servers restart. Databases recover. Routers need power.', 'I\'m a maintenance bot. I maintain.'],
  };
  const pick = a => a[Math.floor(Math.random() * a.length)];

  function newRun() {
    for (const n of Object.values(NODES)) { n.status = 'ok'; n.s3 = null; }
    for (const e of EDGES) e.broken = false;
    const count = 3 + (Math.random() < 0.5 ? 1 : 0);
    const types = EVENT_TYPES.slice().sort(() => Math.random() - 0.5).slice(0, count);
    const times = [2.5, 12, 21, 29];
    G = {
      t: 0, elapsed: 0, remaining: DURATION,
      player: { x: 900, y: 700, facing: 1, expr: 'idle', walk: 0, moving: false, blink: 0, blinkT: 1.5, exprOverride: null, exprTimer: 0, stepT: 0, lookX: 0 },
      cam: { x: 900 - VW / 2, y: 700 - VH / 2 },
      coreStability: 100, coreSaved: false, corePhase: false, corePower: 0.85,
      events: types.map((type, i) => ({ type, at: times[i], spawned: false, state: 'pending', deadline: times[i] + 20, inter: null })),
      glitches: [], interactables: [], dialogue: null, shake: 0, failed: 0, solved: 0,
      minigame: null, minigameEvent: null, alertT: 0, particles: [], lastSecond: 60, saidLowTime: false, endT: 0, result: null,
      hubTalk: 0
    };
    G.interactables.push({ id: 'hub', x: NODES.hub.x, y: NODES.hub.y + 16, label: 'INVESTIGATE', act: hubStatus });
    for (const b of World.miniBots) G.interactables.push({ id: 'bot', bot: b, get x() { return b.x; }, get y() { return b.y; }, label: 'TALK', act: () => { say(pick(LINES.tips), 2.6); Audio2.sfx.beep(); setExpr('happy', 1.2); } });
    for (const n of World.npcs) G.interactables.push({ id: 'npc', x: n.x, y: n.y, label: 'TALK', act: () => { n.facing = G.player.x < n.x ? -1 : 1; say(pick(LINES.tips), 2.6); Audio2.sfx.beep(); setExpr('happy', 1.2); } });
    G.interactables.push({ id: 'core', x: NODES.core.x, y: NODES.core.y + 26, label: 'STABILIZE CORE', act: openCore, enabled: () => G.corePhase && !G.coreSaved });
    updateHUD();
  }

  // ---------- helpers ----------
  function say(text, dur = 2.2) { G.dialogue = { text, t: dur }; }
  function setExpr(e, dur) { G.player.exprOverride = e; G.player.exprTimer = dur; }
  function showAlert(head, body, cls = '', dur = 2.4) {
    const a = $('alert'); a.className = cls; a.innerHTML = `<div class="alert-head">${head}</div><div class="alert-body">${body}</div>`; G.alertT = dur;
  }
  function networkHealth() {
    const w = { ok: 100, degraded: 60, corrupted: 30, offline: 10 };
    const ns = Object.values(NODES); return ns.reduce((s, n) => s + w[n.status], 0) / ns.length;
  }
  function addParticles(x, y, col, n = 14) { for (let i = 0; i < n; i++) G.particles.push({ x, y, vx: (Math.random() - .5) * 160, vy: -Math.random() * 160 - 40, life: 0.9, col }); }

  // ---------- events ----------
  function spawnEvent(ev) {
    ev.spawned = true; ev.state = 'active';
    Audio2.sfx.warn(); setExpr('surprised', 1.3); say(pick(LINES.problem));
    switch (ev.type) {
      case 'server':
        NODES.servers.s3 = 'offline'; NODES.servers.status = 'degraded';
        ev.inter = { id: 'ev', x: 330, y: 662, label: 'INVESTIGATE', act: () => openMinigame(ev, Minigames.server({ name: 'SERVER-03', onAction: () => setExpr('repairing', 99), onSuccess: () => succeed(ev), onClose: closeMinigame })) };
        showAlert('SERVER VILLAGE', 'SERVER-03 OFFLINE', 'danger'); break;
      case 'connection': {
        EDGES.find(e => e.id === 'servers-router').broken = true; const j = NODES.router.junction;
        ev.inter = { id: 'ev', x: j.x, y: j.y + 22, label: 'CONNECT', act: () => openMinigame(ev, Minigames.connection({ from: 'ROUTER-02', to: 'SERVER-04', onSuccess: () => succeed(ev), onClose: closeMinigame })) };
        showAlert('ROUTER HILL', 'CONNECTION BROKEN: ROUTER-02 → SERVER-04', 'danger'); break;
      }
      case 'data':
        NODES.database.status = 'corrupted';
        ev.inter = { id: 'ev', x: NODES.database.x, y: NODES.database.y + 22, label: 'INVESTIGATE', act: () => openMinigame(ev, Minigames.data({ onAction: () => setExpr('repairing', 99), onSuccess: () => succeed(ev), onMistake: () => { G.coreStability -= 2; }, onClose: closeMinigame })) };
        showAlert('DATABASE', 'CORRUPTED DATA DETECTED', 'danger'); break;
      case 'glitch': {
        const home = Math.random() < 0.5 ? 'garden' : 'factory';
        const pos = home === 'garden' ? { x: 470, y: 870 } : { x: 1300, y: 960 };
        const g = { x: pos.x, y: pos.y, hx: pos.x, hy: pos.y, friendly: false, escaped: false, node: home };
        G.glitches.push(g); NODES[home].status = 'corrupted'; ev.glitch = g;
        ev.inter = { id: 'ev', get x() { return g.x; }, get y() { return g.y + 6; }, label: 'DEBUG', act: () => openMinigame(ev, Minigames.glitch({ where: NODES[home].name, onAction: () => setExpr('repairing', 99), onSuccess: () => succeed(ev), onFail: () => fail(ev), onClose: closeMinigame })) };
        showAlert(NODES[home].name, 'GLITCH CREATURE DETECTED', 'danger'); Audio2.sfx.glitch(); break;
      }
      case 'router':
        NODES.router.status = 'degraded';
        ev.inter = { id: 'ev', x: NODES.router.x, y: NODES.router.y + 74, label: 'REPAIR', act: () => openMinigame(ev, Minigames.router({ onAction: () => setExpr('repairing', 99), onSuccess: (alloc) => succeed(ev, alloc), onClose: closeMinigame })) };
        showAlert('ROUTER HILL', 'ROUTER-02 OVERLOADED', 'danger'); break;
    }
    if (ev.inter) G.interactables.push(ev.inter);
  }
  function removeInter(ev) { G.interactables = G.interactables.filter(i => i !== ev.inter); }
  function succeed(ev, extra) {
    ev.state = 'solved'; G.solved++;
    closeMinigame();
    removeInter(ev);
    setExpr('happy', 1.6); say(pick(LINES.fixed));
    switch (ev.type) {
      case 'server': NODES.servers.s3 = null; NODES.servers.status = 'ok'; addParticles(330, 600, P.yellow); showAlert('SERVER VILLAGE', '✓ SERVER-03 RESTORED', 'good'); break;
      case 'connection': EDGES.find(e => e.id === 'servers-router').broken = false; addParticles(NODES.router.junction.x, NODES.router.junction.y, P.blue); showAlert('ROUTER HILL', '✓ CONNECTION RESTORED', 'good'); break;
      case 'data': NODES.database.status = 'ok'; addParticles(NODES.database.x, NODES.database.y - 60, '#8f9ae0'); showAlert('DATABASE', '✓ DATA RESTORED', 'good'); break;
      case 'glitch': ev.glitch.friendly = true; NODES[ev.glitch.node].status = 'ok'; addParticles(ev.glitch.x, ev.glitch.y - 20, P.green); showAlert(NODES[ev.glitch.node].name, '✓ GLITCH DEBUGGED', 'good'); break;
      case 'router': {
        NODES.router.status = 'ok';
        if (extra.CORE.ok) { G.corePower = 1; G.coreStability = Math.min(100, G.coreStability + 10); showAlert('ROUTER HILL', '✓ CORE POWERED', 'good'); }
        else { G.corePower = 0.35; G.coreStability -= 25; showAlert('CORE SERVER', '⚠ CORE UNDERPOWERED', 'danger'); say(pick(LINES.worse)); setExpr('concerned', 1.6); }
        if (!extra.SERVERS.ok && NODES.servers.status === 'ok') NODES.servers.status = 'degraded';
        if (!extra.DATABASE.ok && NODES.database.status === 'ok') NODES.database.status = 'degraded';
        break;
      }
    }
    Audio2.sfx.success(); checkCorePhase();
  }
  function fail(ev) {
    ev.state = 'failed'; G.failed++; G.coreStability -= 15; G.shake = 0.4;
    closeMinigame();
    removeInter(ev); setExpr('concerned', 2); say(pick(LINES.worse)); Audio2.sfx.alarm();
    switch (ev.type) {
      case 'server': NODES.servers.s3 = 'offline'; NODES.servers.status = 'offline'; showAlert('SERVER VILLAGE', 'SERVER-03 LOST — VILLAGE DARK', 'danger'); break;
      case 'connection': NODES.router.status = 'degraded'; showAlert('ROUTER HILL', 'LINK LOST — ROUTER-02 DEGRADED', 'danger'); break;
      case 'data': NODES.database.status = 'offline'; showAlert('DATABASE', 'DATA LOST — DATABASE OFFLINE', 'danger'); break;
      case 'glitch': {
        const g = ev.glitch; g.escaped = true;
        const targets = ['cloud', 'database', 'factory', 'garden', 'servers'].filter(k => NODES[k].status === 'ok' && k !== g.node);
        const dest = targets.length ? pick(targets) : 'cloud'; NODES[dest].status = 'corrupted'; g.hx = NODES[dest].x + 60; g.hy = NODES[dest].y + 20; g.node = dest;
        showAlert(NODES[dest].name, 'GLITCH ESCAPED — ' + NODES[dest].name + ' CORRUPTED', 'danger'); Audio2.sfx.glitch(); break;
      }
      case 'router': NODES.router.status = 'offline'; G.corePower = 0.3; G.coreStability -= 10; showAlert('ROUTER HILL', 'ROUTER-02 FAILED — CORE UNDERPOWERED', 'danger'); break;
    }
    checkCorePhase();
  }
  function checkCorePhase() {
    if (G.corePhase) return;
    const allDone = G.events.every(e => e.state === 'solved' || e.state === 'failed');
    if (G.elapsed >= 40 || (allDone && G.elapsed >= 24)) {
      G.corePhase = true; showAlert('CORE SERVER', 'SYSTEM FAILURE — STABILIZE THE CORE', 'danger', 3.2); say('Okay. One last fix.', 2.5); Audio2.sfx.alarm(); setExpr('surprised', 1.4);
    }
  }
  function coreStats() {
    const okCount = Object.values(NODES).filter(n => n.id !== 'core' && n.status === 'ok').length;
    return { power: G.corePower, network: okCount / 7, database: NODES.database.status === 'ok' ? 1 : NODES.database.status === 'degraded' ? 0.6 : 0.25 };
  }
  function openCore() {
    openMinigame(null, Minigames.core({
      stats: coreStats(), onClose: closeMinigame,
      onAction: () => setExpr('repairing', 99),
      onMistake: () => { G.coreStability = Math.max(1, G.coreStability - 4); G.shake = 0.25; setExpr('concerned', 0.8); },
      onSuccess: win
    }));
  }
  function hubStatus() {
    const bad = Object.values(NODES).filter(n => n.status !== 'ok');
    say(bad.length ? `Trouble at: ${bad.map(n => n.name).join(', ')}` : 'All systems nominal. For now.', 2.8); Audio2.sfx.beep(); setExpr('interacting', 1);
  }
  function openMinigame(ev, handle) {
    if (G.minigame) G.minigame.close();
    G.minigame = handle; G.minigameEvent = ev; Audio2.sfx.open(); $('action-bar').classList.add('hidden'); setExpr('interacting', 99);
    handle.anchor = ev ? ev.inter : { x: NODES.core.x, y: NODES.core.y - 60 };
    handle.side = null; positionPanel(true);
  }
  // Compact contextual panel: anchored beside the thing being repaired, clamped to the stage.
  function positionPanel(fresh) {
    const h = G && G.minigame; const p = $('panel'); if (!h || !h.anchor || p.classList.contains('hidden')) return;
    const ax = h.anchor.x - G.cam.x, ay = h.anchor.y - G.cam.y - 40;
    const w = p.offsetWidth || 380, ph = p.offsetHeight || 260;
    if (fresh || !h.side) h.side = ax + 90 + w < VW - 12 ? 'right' : 'left';
    let left = h.side === 'right' ? ax + 90 : ax - 90 - w;
    left = Math.max(12, Math.min(VW - w - 12, left));
    let top = ay - ph / 2; top = Math.max(196, Math.min(VH - ph - 16, top));
    p.style.left = left + 'px'; p.style.top = top + 'px';
    p.classList.toggle('tail-left', h.side === 'right'); p.classList.toggle('tail-right', h.side === 'left');
    p.style.setProperty('--tail-y', Math.max(24, Math.min(ph - 24, ay - top)) + 'px');
  }
  function closeMinigame() { if (!G || !G.minigame) return; G.minigame.close(); G.minigame = null; G.minigameEvent = null; G.player.exprOverride = null; Audio2.sfx.close(); }

  // ---------- end states ----------
  function win() {
    G.coreSaved = true; G.minigame = null; state = 'ending'; G.result = 'win'; G.endT = 2.4;
    for (const n of Object.values(NODES)) { n.status = 'ok'; n.s3 = null; } for (const e of EDGES) e.broken = false; for (const g of G.glitches) g.friendly = true;
    G.interactables = []; setExpr('celebrating', 99); say('Network saved!', 3); showAlert('CORE SERVER', 'NETWORK RESTORED', 'good', 3);
    addParticles(NODES.core.x, NODES.core.y - 120, P.yellow, 40); Audio2.sfx.victory(); Audio2.stopMusic();
  }
  function lose(reason) {
    closeMinigame(); state = 'ending'; G.result = 'lose'; G.endT = 2.4; G.loseReason = reason;
    G.interactables = []; setExpr('panicking', 99); say('No... no no no!', 3); showAlert('CORE SERVER', 'CORE FAILURE', 'danger', 3);
    $('glitch-overlay').classList.add('on'); Audio2.sfx.collapse(); Audio2.stopMusic(); G.shake = 1.2;
  }
  function showResult() {
    state = 'result'; $('glitch-overlay').classList.remove('on');
    const r = $('result'); r.classList.remove('hidden'); r.classList.toggle('lose', G.result === 'lose');
    const total = G.events.length;
    if (G.result === 'win') {
      $('result-title').textContent = 'NETWORK SAVED'; $('result-sub').textContent = pick(['"That was actually fun."', '"Never doubted us for a second."', '"Core stable. Coffee break."']);
      $('result-sys-label').textContent = 'SYSTEMS REPAIRED'; $('result-time-label').textContent = 'TIME REMAINING'; $('result-time').textContent = Math.max(0, G.remaining).toFixed(1) + 's';
      $('again-btn').textContent = '[ PLAY AGAIN ]';
    } else {
      $('result-title').textContent = 'THE NETWORK COLLAPSED'; $('result-sub').textContent = G.loseReason === 'core' ? 'The CORE destabilized before time ran out.' : 'Time ran out before the CORE was stabilized.';
      $('result-sys-label').textContent = 'SYSTEMS RESTORED'; $('result-time-label').textContent = 'TIME SURVIVED'; $('result-time').textContent = Math.min(DURATION, G.elapsed).toFixed(1) + 's';
      $('again-btn').textContent = '[ TRY AGAIN ]';
    }
    $('result-sys').textContent = `${G.solved}/${total}`;
  }

  // ---------- input ----------
  window.addEventListener('keydown', e => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    if (e.key === 'm' || e.key === 'M') { const m = Audio2.toggleMute(); $('hint').textContent = m ? 'MUTED · M unmute' : 'WASD / ARROWS move · E interact · M mute'; return; }
    if (state === 'title' && (e.key === 'Enter' || e.key === ' ')) { startGame(); return; }
    if (state === 'result' && (e.key === 'Enter' || e.key === ' ')) { startGame(); return; }
    if (state !== 'play') return;
    if (G.minigame) {
      if (e.key === 'Escape') { closeMinigame(); return; }
      if (e.key === 'e' || e.key === 'E') keys.add('e');
      G.minigame.onKey(e); return;
    }
    keys.add(e.key.toLowerCase());
    if ((e.key === 'e' || e.key === 'E') && !e.repeat) interact();
  });
  window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());
  $('start-btn').addEventListener('click', startGame);
  $('again-btn').addEventListener('click', startGame);

  function nearestInteractable() {
    let best = null, bd = 80;
    for (const i of G.interactables) {
      if (i.enabled && !i.enabled()) continue;
      const d = Math.hypot(i.x - G.player.x, (i.y - G.player.y) * 1.3);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
  function interact() { const i = nearestInteractable(); if (i) { G.player.facing = i.x >= G.player.x ? 1 : -1; i.act(); } }

  function startGame() {
    Audio2.init(); Audio2.resume();
    $('title').classList.add('hidden'); $('result').classList.add('hidden'); $('hud').classList.remove('hidden'); Minigames.hide(); $('glitch-overlay').classList.remove('on');
    newRun(); state = 'play'; keys.clear();
    showAlert('SYSTEM ALERT', 'CORE FAILURE IN 60 SECONDS', 'danger', 2.6); Audio2.sfx.alarm(); setExpr('surprised', 1.5);
    Audio2.setUrgency(0); Audio2.startMusic();
  }

  // ---------- update ----------
  function update(dt) {
    globalT += dt;
    if (state === 'title') return;
    G.t += dt;
    World.updateAmbient(G.t, dt);
    for (const p of G.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; }
    G.particles = G.particles.filter(p => p.life > 0);
    if (G.alertT > 0) { G.alertT -= dt; $('alert').classList.toggle('hidden', G.alertT <= 0); }
    if (G.dialogue) { G.dialogue.t -= dt; if (G.dialogue.t <= 0) G.dialogue = null; }
    G.shake = Math.max(0, G.shake - dt);
    const pl = G.player;
    pl.blinkT -= dt; if (pl.blinkT <= 0) { pl.blink = 1; pl.blinkT = 2 + Math.random() * 3; } else pl.blink = Math.max(0, pl.blink - dt * 8);
    if (pl.exprTimer > 0) { pl.exprTimer -= dt; if (pl.exprTimer <= 0) pl.exprOverride = null; }
    for (const g of G.glitches) { g.x += (g.hx - g.x) * dt * 3; g.y += (g.hy - g.y) * dt * 3; if (g.friendly) { g.hx += Math.sin(G.t * 1.3) * 0.4; } }

    if (state === 'ending') {
      G.endT -= dt;
      if (G.result === 'lose') { // corruption spreads
        const ns = Object.values(NODES); const k = Math.floor((2.4 - G.endT) / 2.4 * ns.length * 1.4); ns.slice(0, Math.min(ns.length, k)).forEach(n => n.status = 'offline'); for (const e of EDGES) e.broken = true;
        if (Math.random() < 0.2) addParticles(G.cam.x + Math.random() * VW, G.cam.y + Math.random() * VH, P.glitch, 3);
      } else { for (const e of EDGES) e.packets = e.packets.length < 8 ? e.packets.concat([Math.random()]) : e.packets; if (Math.random() < 0.3) addParticles(G.cam.x + Math.random() * VW, G.cam.y + Math.random() * VH * .5, pick([P.yellow, P.blue, P.green, '#ff9fd6']), 4); }
      if (G.endT <= 0) showResult();
      updateCamera(dt); return;
    }
    if (state !== 'play') { updateCamera(dt); return; }

    // ---- timer ----
    G.elapsed += dt; G.remaining = DURATION - G.elapsed;
    Audio2.setUrgency(G.elapsed / DURATION);
    const sec = Math.ceil(G.remaining);
    if (sec !== G.lastSecond) { G.lastSecond = sec; if (sec <= 10 && sec > 0) Audio2.sfx.tick(); if (sec === 10) { showAlert('WARNING', 'CORE CRITICAL — 10 SECONDS', 'danger'); Audio2.sfx.alarm(); } }
    if (G.remaining <= 15 && !G.saidLowTime && !G.dialogue) { G.saidLowTime = true; say(pick(LINES.lowTime), 2.4); }
    if (G.remaining <= 0) { G.remaining = 0; lose('time'); return; }

    // ---- events ----
    for (const ev of G.events) {
      if (!ev.spawned && G.elapsed >= ev.at) spawnEvent(ev);
      if (ev.state === 'active' && G.elapsed >= ev.deadline && G.minigameEvent !== ev) fail(ev);
    }
    checkCorePhase();
    // ---- core stability drain ----
    let drain = 0;
    if (G.elapsed > 25) drain = 0.6 + G.failed * 0.5;
    if (G.elapsed > 40) drain = 1.4 + G.failed * 0.7;
    if (G.corePower < 0.5) drain += 0.5;
    if (G.minigame && G.corePhase && G.minigameEvent === null) drain *= 0.5; // stabilizing slows the bleed
    G.coreStability = Math.max(0, G.coreStability - drain * dt);
    if (G.coreStability <= 0) { lose('core'); return; }

    // ---- player movement ----
    let dx = 0, dy = 0;
    if (!G.minigame) {
      if (keys.has('w') || keys.has('arrowup')) dy -= 1; if (keys.has('s') || keys.has('arrowdown')) dy += 1;
      if (keys.has('a') || keys.has('arrowleft')) dx -= 1; if (keys.has('d') || keys.has('arrowright')) dx += 1;
    }
    const len = Math.hypot(dx, dy); pl.moving = len > 0;
    if (pl.moving) {
      const sp = 240; dx /= len; dy /= len; if (dx) pl.facing = dx > 0 ? 1 : -1;
      const nx = pl.x + dx * sp * dt, ny = pl.y + dy * sp * dt;
      if (!World.collide(nx, pl.y, 11)) pl.x = nx; if (!World.collide(pl.x, ny, 11)) pl.y = ny;
      pl.walk += dt * 14; pl.stepT -= dt; if (pl.stepT <= 0) { pl.stepT = 0.22; Audio2.sfx.step(); }
      pl.lookX = dx;
    } else pl.lookX *= 0.9;
    // expression
    let expr = 'idle';
    const activeCount = G.events.filter(e => e.state === 'active').length;
    if (G.remaining < 10) expr = 'panicking'; else if (activeCount && G.remaining < 30) expr = 'concerned'; else if (pl.moving) expr = 'running';
    if (G.minigame) expr = 'interacting';
    pl.expr = pl.exprOverride || expr;
    if (G.minigame) { G.minigame.update(dt, keys); positionPanel(false); }
    // action bar
    const near = G.minigame ? null : nearestInteractable();
    $('action-bar').classList.toggle('hidden', !near); if (near) $('action-label').textContent = near.label;
    updateCamera(dt); updateHUD();
  }
  function updateCamera(dt) {
    const tx = Math.max(0, Math.min(World.W - VW, G.player.x - VW / 2)), ty = Math.max(0, Math.min(World.H - VH, G.player.y - VH / 2 + 10));
    G.cam.x += (tx - G.cam.x) * Math.min(1, dt * 5); G.cam.y += (ty - G.cam.y) * Math.min(1, dt * 5);
  }
  function updateHUD() {
    const t = Math.max(0, G.remaining); const mm = Math.floor(t / 60), ss = Math.floor(t % 60);
    const te = $('hud-time'); te.textContent = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`; te.className = 'hud-time' + (t <= 10 ? ' crit' : t <= 20 ? ' warn' : '');
    $('net-bar').style.width = networkHealth() + '%';
    $('hud-systems').textContent = `${G.solved}/${G.events.length}`;
    $('core-bar').style.width = G.coreStability + '%';
    const ce = $('hud-core');
    if (G.coreSaved) { ce.textContent = 'SAVED'; ce.className = 'core-saved'; }
    else if (G.coreStability < 30) { ce.textContent = 'CRITICAL'; ce.className = 'core-critical'; }
    else if (G.coreStability < 60 || G.corePhase) { ce.textContent = 'UNSTABLE'; ce.className = 'core-unstable'; }
    else { ce.textContent = 'STABLE'; ce.className = 'core-stable'; }
  }

  // ---------- render ----------
  function render() {
    if (state === 'title') {
      // A live slice of the village behind the title: server village, hub plaza, garden edge.
      World.updateAmbient(globalT, lastDt);
      const camX = 140 + Math.sin(globalT * 0.15) * 10, camY = 400 + Math.cos(globalT * 0.12) * 6;
      bctx.fillStyle = '#c9b78d'; bctx.fillRect(0, 0, VW, VH);
      bctx.save(); bctx.translate(-Math.round(camX), -Math.round(camY));
      World.drawGround(bctx, globalT);
      World.drawEdges(bctx, globalT, lastDt);
      const list = World.drawables.slice();
      for (const b of World.miniBots) list.push({ y: b.y, draw: (c) => Robot.drawMiniBot(c, b, globalT) });
      for (const n of World.npcs) list.push({ y: n.y, draw: (c) => Robot.drawNPC(c, n, globalT) });
      for (const g of World.tinyGlitches) list.push({ y: g.y, draw: (c) => Robot.drawGlitch(c, g, globalT) });
      list.sort((a, b) => a.y - b.y);
      const st = { coreStability: 100, coreSaved: false };
      for (const d of list) d.draw(bctx, globalT, st);
      World.drawAmbient(bctx, globalT);
      bctx.restore();
      tctx.clearRect(0, 0, titleCanvas.width, titleCanvas.height);
      Robot.draw(tctx, { x: 150, y: 400, scale: 2.6, facing: 1, expr: Math.sin(globalT * 0.7) > 0.3 ? 'happy' : 'idle', t: globalT, blink: Math.sin(globalT * 3) > 0.97 ? 1 : 0 });
      return;
    }
    const st = { coreStability: G.coreStability, coreSaved: G.coreSaved };
    let sx = 0, sy = 0;
    const crit = state === 'play' && G.remaining < 10;
    if (crit || G.shake > 0) { const a = (crit ? 2.5 : 0) + G.shake * 8; sx = (Math.random() - .5) * a; sy = (Math.random() - .5) * a; }
    ctx.fillStyle = '#c9b78d'; ctx.fillRect(0, 0, VW, VH);
    ctx.save(); ctx.translate(-Math.round(G.cam.x) + sx, -Math.round(G.cam.y) + sy);
    World.drawGround(ctx, G.t);
    World.drawEdges(ctx, G.t, lastDt);
    // y-sorted drawables
    const list = World.drawables.slice();
    list.push({ y: G.player.y, draw: (c) => Robot.draw(c, { ...G.player, t: G.t }) });
    for (const g of G.glitches) list.push({ y: g.y, draw: (c) => Robot.drawGlitch(c, g, G.t) });
    for (const b of World.miniBots) list.push({ y: b.y, draw: (c) => Robot.drawMiniBot(c, b, G.t) });
    for (const n of World.npcs) list.push({ y: n.y, draw: (c) => Robot.drawNPC(c, n, G.t) });
    for (const g of World.tinyGlitches) list.push({ y: g.y, draw: (c) => Robot.drawGlitch(c, g, G.t) });
    list.sort((a, b) => a.y - b.y);
    for (const d of list) d.draw(ctx, G.t, st);
    // event markers
    for (const ev of G.events) if (ev.state === 'active' && ev.inter) {
      const i = ev.inter; World.warnIcon(ctx, i.x, i.y - 70, G.t);
      const left = Math.max(0, (ev.deadline - G.elapsed) / 20);
      ctx.strokeStyle = 'rgba(44,62,80,.5)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(i.x, i.y - 80, 18, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = left < 0.3 ? P.red : P.yellow; ctx.beginPath(); ctx.arc(i.x, i.y - 80, 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left); ctx.stroke();
    }
    if (G.corePhase && !G.coreSaved && state === 'play') World.warnIcon(ctx, NODES.core.x, NODES.core.y - 190, G.t);
    // particles
    for (const p of G.particles) { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.col; ctx.fillRect(p.x - 3, p.y - 3, 6, 6); }
    ctx.globalAlpha = 1;
    World.drawAmbient(ctx, G.t);
    // dialogue bubble
    if (G.dialogue) {
      const pl = G.player; ctx.font = '700 14px Fredoka, sans-serif'; const w = ctx.measureText(G.dialogue.text).width + 20; const bx = Math.min(World.W - w / 2 - 10, Math.max(w / 2 + 10, pl.x)), by = pl.y - 118;
      Robot.fillRR(ctx, bx - w / 2, by - 14, w, 28, 10, '#fff', P.ink, 2.5);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(pl.x - 6, by + 13); ctx.lineTo(pl.x + 6, by + 13); ctx.lineTo(pl.x, by + 22); ctx.fill();
      ctx.strokeStyle = P.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(pl.x - 6, by + 14); ctx.lineTo(pl.x, by + 22); ctx.lineTo(pl.x + 6, by + 14); ctx.stroke();
      ctx.fillStyle = P.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(G.dialogue.text, bx, by + 1);
    }
    ctx.restore();
    // screen-space escalation effects
    if (state === 'play' && G.remaining < 20) {
      const k = (20 - G.remaining) / 20;
      ctx.fillStyle = P.glitch; for (let i = 0; i < k * 8; i++) if (Math.random() < 0.4) ctx.fillRect(Math.random() * VW, Math.random() * VH, 4 + Math.random() * 30, 3);
      const vg = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.45, VW / 2, VH / 2, VH * 0.9); vg.addColorStop(0, 'rgba(226,87,76,0)'); vg.addColorStop(1, `rgba(226,87,76,${0.25 + k * 0.3})`); ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);
    }
    if (state === 'ending' && G.result === 'lose') { ctx.fillStyle = `rgba(20,10,30,${(2.4 - G.endT) / 2.4 * 0.6})`; ctx.fillRect(0, 0, VW, VH); }
    Robot.drawPortrait(pctx, portrait.width, portrait.height, G.player.expr, G.t, G.player.blink);
  }

  let lastDt = 0.016;
  function loop(ts) {
    const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0.016); lastTs = ts; lastDt = dt;
    update(dt); render(); requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  window.__GB = { get G() { return G; }, get state() { return state; }, teleport(x, y) { G.player.x = x; G.player.y = y; }, interact, NODES, openCore, spawn(type) { let ev = G.events.find(e => e.type === type && !e.spawned); if (!ev) { ev = { type, at: G.elapsed, spawned: false, state: 'pending', deadline: G.elapsed + 20, inter: null }; G.events.push(ev); } ev.at = G.elapsed; ev.deadline = G.elapsed + 20; spawnEvent(ev); } };
})();
