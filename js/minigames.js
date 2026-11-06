// Mini-game panels (DOM). Each returns {close(), update(dt, keys), onKey(e)}.
// Pattern: INVESTIGATE → SEE INFORMATION → CHOOSE RESPONSE → PERFORM SMALL ACTION → SEE CONSEQUENCE.
const Minigames = (() => {
  const panel = () => document.getElementById('panel');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  let panelGen = 0;
  const finish = (cb, delay = 900) => { const g = panelGen; setTimeout(() => { if (panelGen === g) hide(); cb(); }, delay); };

  // ---- illustrated icons (inline SVG) ----
  const I = {
    server: '<svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="3" fill="#f6ecd6" stroke="#2c3e50" stroke-width="2"/><rect x="7" y="6" width="10" height="3" rx="1" fill="#2c3e50"/><rect x="7" y="11" width="10" height="3" rx="1" fill="#2c3e50"/><circle cx="9" cy="17.5" r="1.4" fill="#7fc26b"/><circle cx="13" cy="17.5" r="1.4" fill="#f5c84c"/><circle cx="17" cy="17.5" r="1.4" fill="#e2574c"/></svg>',
    link: '<svg viewBox="0 0 24 24"><path d="M3 12h5M16 12h5" stroke="#2c3e50" stroke-width="2.5" stroke-linecap="round"/><rect x="7" y="7" width="5" height="10" rx="2" fill="#6fb9e6" stroke="#2c3e50" stroke-width="2"/><rect x="12" y="7" width="5" height="10" rx="2" fill="#f5c84c" stroke="#2c3e50" stroke-width="2"/><path d="M12 9v6" stroke="#2c3e50" stroke-width="1.5" stroke-dasharray="1.5 1.5"/></svg>',
    db: '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="6" rx="8" ry="3" fill="#8f9ae0" stroke="#2c3e50" stroke-width="2"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6" fill="#6f78c8" stroke="#2c3e50" stroke-width="2"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" stroke="#2c3e50" stroke-width="2" fill="none"/><circle cx="16" cy="17" r="1.2" fill="#f5c84c"/></svg>',
    glitch: '<svg viewBox="0 0 24 24"><path d="M5 10c0-4 3-7 7-7s7 3 7 7c0 3-1 4-1 7l-2-2-2 3-2-3-2 3-2-3-2 2c0-3-1-4-1-7z" fill="#8b5fd6" stroke="#2c3e50" stroke-width="2" stroke-linejoin="round"/><circle cx="9.5" cy="10" r="1.8" fill="#fff"/><circle cx="14.5" cy="10" r="1.8" fill="#fff"/><circle cx="9.8" cy="10.3" r=".9" fill="#2c3e50"/><circle cx="14.8" cy="10.3" r=".9" fill="#2c3e50"/><rect x="17" y="3" width="3" height="3" fill="#ff5fb0"/></svg>',
    router: '<svg viewBox="0 0 24 24"><rect x="3" y="14" width="18" height="7" rx="2.5" fill="#f6ecd6" stroke="#2c3e50" stroke-width="2"/><circle cx="7" cy="17.5" r="1.3" fill="#7fc26b"/><circle cx="11" cy="17.5" r="1.3" fill="#f29a3c"/><path d="M17 14V6" stroke="#2c3e50" stroke-width="2.5" stroke-linecap="round"/><circle cx="17" cy="5" r="2" fill="#e2574c" stroke="#2c3e50" stroke-width="1.5"/><path d="M12.5 8.5a6 6 0 0 1 9 0" stroke="#6fb9e6" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
    core: '<svg viewBox="0 0 24 24"><circle cx="12" cy="11" r="6" fill="#5ad6ff" stroke="#2c3e50" stroke-width="2"/><circle cx="10" cy="9" r="1.8" fill="#fff"/><ellipse cx="12" cy="12" rx="10" ry="3.5" stroke="#2c3e50" stroke-width="1.8" fill="none"/><path d="M8 21h8" stroke="#2c3e50" stroke-width="2.5" stroke-linecap="round"/></svg>',
    ok: '<svg viewBox="0 0 16 16"><path d="M3 8.5l3 3 7-7" stroke="#2f8f3e" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    bad: '<svg viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="#e2574c" stroke-width="3" stroke-linecap="round"/></svg>'
  };

  // ---- panel shell ----
  let keyList = () => panel().querySelectorAll('.choice');
  let clickHandler = null;
  function show(title, tag, body, tagCls = '', icon = 'server') {
    panelGen++;
    const p = panel(); p.classList.remove('hidden'); p.classList.remove('shake');
    p.innerHTML = `<div class="panel-head"><div class="panel-icon">${I[icon] || ''}</div><div class="panel-title">${esc(title)}</div><span class="panel-tag ${tagCls}">${esc(tag)}</span></div><div class="panel-body">${body}</div><div class="panel-msg" id="panel-msg"></div><div class="panel-foot"><span class="rivet"></span>ESC to step back<span class="rivet"></span></div>`;
    keyList = () => p.querySelectorAll('.choice');
    return p;
  }
  function hide() { panelGen++; const p = panel(); p.classList.add('hidden'); p.innerHTML = ''; p.onclick = null; clickHandler = null; }
  function msg(text, cls = '') { const m = document.getElementById('panel-msg'); if (m) { m.textContent = text; m.className = 'panel-msg ' + cls; } }
  function shake() { const p = panel(); p.classList.remove('shake'); void p.offsetWidth; p.classList.add('shake'); }
  function bind(handler) { clickHandler = handler; panel().onclick = e => { const el = e.target.closest('[data-act]'); if (el && clickHandler) clickHandler(el); }; }
  function keyPress(e) {
    const n = parseInt(e.key);
    if (n >= 1 && n <= 9) { const el = keyList()[n - 1]; if (el) el.click(); return; }
    if (e.key === 'e' || e.key === 'E' || e.key === 'Enter' || e.key === ' ') { const b = panel().querySelector('#act-btn'); if (b) b.click(); }
  }
  const handleBase = () => ({ close: hide, update() {}, onKey: keyPress });

  // ---- building blocks ----
  function diag(rows, error, hint) {
    return `<div class="diag">
      <div class="diag-rows">${rows.map(([k, ok, extra]) => `<div class="diag-row"><span class="k">${esc(k)}</span><span class="v ${ok ? 'ok' : 'fail'}">${ok ? I.ok : I.bad}</span><span class="x">${extra ? esc(extra) : ''}</span></div>`).join('')}</div>
      ${error ? `<div class="diag-err"><b>ERROR</b>${esc(error)}</div>` : ''}${hint ? `<div class="diag-hint">${esc(hint)}</div>` : ''}</div>`;
  }
  const ask = (list, q = 'WHAT DO YOU DO?') => `<div class="ask">${q}</div><div class="choices">${list.map((a, i) => `<button class="choice" data-act="choose" data-a="${esc(a)}"><span class="num">${i + 1}</span>[ ${esc(a)} ]</button>`).join('')}</div>`;
  const actTitle = (t, sub) => `<div class="act-title">${esc(t)}${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;

  // Small actions. Each mounts into the panel body and calls onDone() when complete. Returns {update(dt), stop()}
  const ACTIONS = {
    // Hit ENGAGE when the sweeping marker is inside the green zone.
    timing(o) {
      const zone = o.zone || [0.58, 0.8]; const speed = o.speed || 1.3;
      panel().querySelector('.panel-body').innerHTML = actTitle(o.title, o.sub || 'hit ENGAGE while the marker is in the green') +
        `<div class="tbar"><div class="zone" style="left:${zone[0] * 100}%;width:${(zone[1] - zone[0]) * 100}%"></div><div class="marker" id="tmark"></div><div class="ticks"></div></div>
         <button class="choice act-btn" id="act-btn" data-act="engage">[ ${esc(o.btn || 'ENGAGE')} ]<span class="keycap">E</span></button>`;
      let pos = 0, dir = 1, hits = 0, done = false; const need = o.hits || 1;
      const upd = () => { const m = document.getElementById('tmark'); if (m) m.style.left = (pos * 100) + '%'; };
      bind(el => {
        if (done || el.dataset.act !== 'engage') return;
        if (pos >= zone[0] && pos <= zone[1]) {
          hits++; Audio2.sfx.cable(); const m = document.getElementById('tmark'); m && m.classList.add('hit');
          if (hits >= need) { done = true; o.onDone(); } else { msg(`LOCKED ${hits}/${need}`, 'good'); setTimeout(() => m && m.classList.remove('hit'), 200); }
        } else { msg('✗ MISSED — steady…', 'bad'); Audio2.sfx.error(); const m = document.getElementById('tmark'); m && (m.classList.add('miss'), setTimeout(() => m.classList.remove('miss'), 250)); o.onMiss && o.onMiss(); }
      });
      return { update(dt) { if (done) return; pos += dir * speed * dt; if (pos > 1) { pos = 1; dir = -1; } if (pos < 0) { pos = 0; dir = 1; } upd(); } };
    },
    // Click the flagged (blinking) tiles in a grid.
    targets(o) {
      const n = o.count || 3, total = o.total || 8; const bad = new Set(shuffle([...Array(total).keys()]).slice(0, n));
      panel().querySelector('.panel-body').innerHTML = actTitle(o.title, o.sub || `patch the ${n} damaged sectors`) +
        `<div class="tiles">${[...Array(total).keys()].map(i => `<div class="tile ${bad.has(i) ? 'bad' : ''}" data-act="tile" data-i="${i}"><span>${o.label ? o.label(i) : String(i).padStart(2, '0')}</span></div>`).join('')}</div>`;
      let fixed = 0, done = false;
      bind(el => {
        if (done || el.dataset.act !== 'tile') return; const i = +el.dataset.i;
        if (bad.has(i) && !el.classList.contains('fixed')) { el.classList.remove('bad'); el.classList.add('fixed'); fixed++; Audio2.sfx.pop(); msg(`PATCHED ${fixed}/${n}`, 'good'); if (fixed >= n) { done = true; o.onDone(); } }
        else if (!bad.has(i)) { el.classList.add('nope'); setTimeout(() => el.classList.remove('nope'), 300); Audio2.sfx.error(); msg('that sector is healthy', 'bad'); o.onMiss && o.onMiss(); }
      });
      return { update() {} };
    },
    // Flip switches in order (left → right).
    switches(o) {
      const n = o.count || 3; const labels = o.labels || [...Array(n).keys()].map(i => `LINK ${i + 1}`);
      panel().querySelector('.panel-body').innerHTML = actTitle(o.title, o.sub || 'flip the breakers in order, left to right') +
        `<div class="switches">${labels.map((l, i) => `<div class="sw" data-act="sw" data-i="${i}"><div class="sw-track"><div class="sw-knob"></div></div><span>${esc(l)}</span></div>`).join('')}</div>`;
      let next = 0, done = false;
      bind(el => {
        if (done || el.dataset.act !== 'sw') return; const i = +el.dataset.i;
        if (i === next) { el.classList.add('on'); next++; Audio2.sfx.cable(); msg(`${labels[i]} ${o.onWord || 'CUT'}`, 'good'); if (next >= n) { done = true; o.onDone(); } }
        else { panel().querySelectorAll('.sw').forEach(s => s.classList.remove('on')); next = 0; el.classList.add('nope'); setTimeout(() => el.classList.remove('nope'), 300); Audio2.sfx.error(); msg('✗ wrong order — breakers reset', 'bad'); o.onMiss && o.onMiss(); }
      });
      return { update() {} };
    },
    // Pick the right row from a small list.
    list(o) {
      panel().querySelector('.panel-body').innerHTML = actTitle(o.title, o.sub) +
        `<div class="rows">${o.rows.map((r, i) => `<div class="row choice ${r.cls || ''}" data-act="row" data-i="${i}"><span class="num">${i + 1}</span><span class="row-main">${esc(r.label)}</span><span class="row-meta ${r.metaCls || ''}">${esc(r.meta || '')}</span></div>`).join('')}</div>`;
      keyList = () => panel().querySelectorAll('.row');
      let done = false; const multi = o.rows.filter(r => r.ok).length > 1; let got = 0;
      bind(el => {
        if (done || el.dataset.act !== 'row') return; const r = o.rows[+el.dataset.i];
        if (r.ok && !el.classList.contains('right')) { el.classList.add('right'); got++; Audio2.sfx.pop(); if (!multi || got >= o.rows.filter(r => r.ok).length) { done = true; o.onDone(); } else msg(`${got}/${o.rows.filter(r => r.ok).length}`, 'good'); }
        else if (!r.ok) { el.classList.add('wrong'); setTimeout(() => el.classList.remove('wrong'), 400); Audio2.sfx.error(); shake(); msg(r.why || '✗ not that one', 'bad'); o.onMiss && o.onMiss(); }
      });
      return { update() {} };
    },
    // Catch the hopping glitch: click it N times as it jumps between cells.
    catchIt(o) {
      const cells = 6; let at = Math.floor(Math.random() * cells), caught = 0, done = false, timer = 0;
      panel().querySelector('.panel-body').innerHTML = actTitle(o.title, o.sub || 'tap the glitch before it hops away') +
        `<div class="cells-grid">${[...Array(cells).keys()].map(i => `<div class="gcell" data-act="cell" data-i="${i}"></div>`).join('')}</div>`;
      const render = () => panel().querySelectorAll('.gcell').forEach((c, i) => { c.classList.toggle('has', i === at); c.innerHTML = i === at ? '<div class="gblob"><i></i><i></i></div>' : ''; });
      render();
      bind(el => {
        if (done || el.dataset.act !== 'cell') return;
        if (+el.dataset.i === at) { caught++; el.classList.add('zap'); setTimeout(() => el.classList.remove('zap'), 250); Audio2.sfx.pop(); msg(`CAUGHT ${caught}/${o.count || 3}`, 'good'); if (caught >= (o.count || 3)) { done = true; o.onDone(); return; } at = (at + 1 + Math.floor(Math.random() * (cells - 1))) % cells; timer = 0; render(); }
        else { Audio2.sfx.error(); msg('missed! it giggles', 'bad'); o.onMiss && o.onMiss(); }
      });
      return { update(dt) { if (done) return; timer += dt; if (timer > (o.hop || 0.75)) { timer = 0; at = (at + 1 + Math.floor(Math.random() * (cells - 1))) % cells; render(); } } };
    }
  };

  // Reusable cable board. Mount into container; calls onAll() when every port is linked.
  function cableBoard(container, ports, from, to, onAll, onLinked) {
    const left = shuffle(ports), right = shuffle(ports);
    const portHTML = (p, side) => `<div class="port" data-side="${side}" data-k="${p.k}" style="--c:${p.c}"><span class="jack"></span><span class="pl">${p.k}</span></div>`;
    container.innerHTML = `<div class="cable-board" id="board">
        <div class="port-col-title left">${esc(from)}</div><div class="port-col-title right">${esc(to)}</div>
        <svg id="cables"></svg>
        <div class="port-col left">${left.map(p => portHTML(p, 'l')).join('')}</div>
        <div class="port-col right">${right.map(p => portHTML(p, 'r')).join('')}</div>
      </div><div class="term-hint">drag each cable from the left into its matching port on the right</div>`;
    const board = document.getElementById('board'), svg = document.getElementById('cables');
    let drag = null, linked = 0, dragLine = null;
    const center = (el) => { const b = board.getBoundingClientRect(), r = el.querySelector('.jack').getBoundingClientRect(); const sc = b.width / board.offsetWidth; return { x: (r.left + r.width / 2 - b.left) / sc, y: (r.top + r.height / 2 - b.top) / sc }; };
    const mkLine = (col) => { const l = document.createElementNS('http://www.w3.org/2000/svg', 'path'); l.setAttribute('stroke', col); l.setAttribute('stroke-width', '7'); l.setAttribute('fill', 'none'); l.setAttribute('stroke-linecap', 'round'); svg.appendChild(l); const o2 = l.cloneNode(); o2.setAttribute('stroke', '#2c3e50'); o2.setAttribute('stroke-width', '11'); svg.insertBefore(o2, l); return [o2, l]; };
    const setPath = (ls, a, b) => { const sag = 18 + Math.abs(b.x - a.x) * 0.08; const d = `M${a.x},${a.y} C${a.x + 50},${a.y + sag} ${b.x - 50},${b.y + sag} ${b.x},${b.y}`; ls.forEach(l => l.setAttribute('d', d)); };
    const toBoard = (e) => { const b = board.getBoundingClientRect(); const sc = b.width / board.offsetWidth; return { x: (e.clientX - b.left) / sc, y: (e.clientY - b.top) / sc }; };
    const spark = (pt) => { for (let i = 0; i < 6; i++) { const s = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); s.setAttribute('width', '5'); s.setAttribute('height', '5'); s.setAttribute('fill', i % 2 ? '#f5c84c' : '#ff8a7a'); s.setAttribute('class', 'spark'); s.style.setProperty('--dx', (Math.random() - .5) * 60 + 'px'); s.style.setProperty('--dy', (Math.random() - .8) * 60 + 'px'); s.setAttribute('x', pt.x - 2); s.setAttribute('y', pt.y - 2); svg.appendChild(s); setTimeout(() => s.remove(), 450); } };
    const flow = (path, col) => { const dots = []; for (let i = 0; i < 4; i++) { const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); c.setAttribute('r', '3.5'); c.setAttribute('fill', '#fff'); c.setAttribute('stroke', '#2c3e50'); c.setAttribute('stroke-width', '1.5'); svg.appendChild(c); dots.push({ c, t: i / 4 }); } const t0 = performance.now(); const step = () => { if (!svg.isConnected) return; const dt = (performance.now() - t0) / 1000; const L = path.getTotalLength(); for (const d of dots) { const pt = path.getPointAtLength(((d.t + dt * 0.7) % 1) * L); d.c.setAttribute('cx', pt.x); d.c.setAttribute('cy', pt.y); } requestAnimationFrame(step); }; step(); };
    board.addEventListener('pointerdown', e => {
      const port = e.target.closest('.port'); if (!port || port.dataset.side !== 'l' || port.classList.contains('linked')) return;
      drag = port; port.classList.add('hot'); dragLine = mkLine(port.style.getPropertyValue('--c')); setPath(dragLine, center(port), toBoard(e)); Audio2.sfx.pop();
      board.querySelector(`.port[data-side="r"][data-k="${port.dataset.k}"]`).classList.add('match');
      board.setPointerCapture(e.pointerId);
    });
    board.addEventListener('pointermove', e => {
      if (!drag) return; setPath(dragLine, center(drag), toBoard(e));
      const el = document.elementFromPoint(e.clientX, e.clientY); const over = el && el.closest('.port');
      board.querySelectorAll('.port.over').forEach(p => p.classList.remove('over'));
      if (over && over.dataset.side === 'r' && !over.classList.contains('linked')) over.classList.add('over');
    });
    const endDrag = e => {
      if (!drag) return;
      const el = document.elementFromPoint(e.clientX, e.clientY); const target = el && el.closest('.port');
      const src = drag; drag.classList.remove('hot'); drag = null;
      board.querySelectorAll('.port.match, .port.over').forEach(p => p.classList.remove('match', 'over'));
      if (target && target.dataset.side === 'r' && !target.classList.contains('linked')) {
        if (target.dataset.k === src.dataset.k) {
          setPath(dragLine, center(src), center(target)); src.classList.add('linked'); target.classList.add('linked', 'snap'); setTimeout(() => target.classList.remove('snap'), 300);
          linked++; Audio2.sfx.cable(); flow(dragLine[1], src.style.getPropertyValue('--c'));
          onLinked && onLinked(linked, ports.length, src.dataset.k);
          if (linked === ports.length) { Audio2.sfx.success(); onAll(); }
          dragLine = null; return;
        }
        target.classList.add('bad'); setTimeout(() => target.classList.remove('bad'), 350); spark(toBoard(e)); Audio2.sfx.error(); shake(); msg('⚡ WRONG PORT — sparks!', 'bad');
      }
      dragLine.forEach(l => l.remove()); dragLine = null;
    };
    board.addEventListener('pointerup', endDrag); board.addEventListener('pointercancel', endDrag);
  }

  // Generic diagnose → choose → act runner shared by server / data / core.
  // cs: {rows, err, hint, choices:[{a, ok, why}], act(onDone, onMiss)}
  function runCase(o, cs, ui) {
    let phase = 'diag', act = null, done = false;
    const render = () => show(ui.title, ui.tag, diag(cs.rows, cs.err, cs.hint) + ask(cs.choices.map(c => c.a)), ui.tagCls || 'bad', ui.icon);
    render();
    bind(el => {
      if (done || phase !== 'diag' || el.dataset.act !== 'choose') return;
      const c = cs.choices.find(c => c.a === el.dataset.a); if (!c) return;
      if (c.ok) {
        phase = 'act'; Audio2.sfx.beep(); const p = panel(); p.querySelector('.panel-tag').textContent = c.a; p.querySelector('.panel-tag').className = 'panel-tag warn';
        o.onAction && o.onAction();
        act = cs.act(() => { done = true; msg(ui.success, 'good'); Audio2.sfx.success(); o.onResolve && o.onResolve(); finish(o.onSuccess, ui.delay || 800); }, () => { o.onMistake && o.onMistake(); });
      } else { el.classList.add('wrong'); setTimeout(() => el.classList.remove('wrong'), 400); msg('✗ ' + (c.why || 'no effect'), 'bad'); Audio2.sfx.error(); shake(); o.onMistake && o.onMistake(); }
    });
    return { close: hide, update(dt) { act && act.update && act.update(dt); }, onKey: keyPress };
  }

  // ---------- EVENT 1: SERVER DOWN ----------
  function server(o) {
    const name = o.name || 'SERVER-03';
    const CASES = [
      { rows: [['POWER', 1], ['NETWORK', 1], ['PROCESS', 0, 'main service stopped']], err: 'PROCESS EXITED (code 137)', hint: 'disk: healthy · last update: 3 days ago · no intrusions',
        choices: [{ a: 'RESTART', ok: 1 }, { a: 'REPAIR', why: 'no hardware fault found' }, { a: 'ROLLBACK', why: 'last update was 3 days ago — not the cause' }, { a: 'ISOLATE', why: 'nothing is attacking it. it just… stopped' }],
        act: (d, m) => ACTIONS.timing({ title: 'REBOOT SEQUENCE', sub: 'hit ENGAGE while the marker is in the green', btn: 'ENGAGE', speed: 1.4, onDone: d, onMiss: m }) },
      { rows: [['POWER', 1], ['NETWORK', 1], ['DISK', 0, '3 bad sectors']], err: 'DISK I/O FAILURE', hint: 'process crash-loops on every disk read',
        choices: [{ a: 'RESTART', why: 'it restarts, reads the disk, crashes again' }, { a: 'REPAIR', ok: 1 }, { a: 'ROLLBACK', why: 'this isn\'t a software problem' }, { a: 'ISOLATE', why: 'isolating a broken disk fixes nothing' }],
        act: (d, m) => ACTIONS.targets({ title: 'DISK REPAIR', sub: 'patch the 3 damaged sectors', count: 3, total: 8, label: i => 'S' + (i + 1), onDone: d, onMiss: m }) },
      { rows: [['POWER', 1], ['NETWORK', 1], ['SERVICE', 0, 'crashing since v2.4']], err: 'UPDATE v2.4 INCOMPATIBLE', hint: 'v2.3 ran clean for 12 days',
        choices: [{ a: 'RESTART', why: 'v2.4 crashes again on boot' }, { a: 'REPAIR', why: 'hardware is fine' }, { a: 'ROLLBACK', ok: 1 }, { a: 'ISOLATE', why: 'no attack — a bad update' }],
        act: (d, m) => ACTIONS.list({ title: 'ROLLBACK', sub: 'pick the most recent stable version', rows: [{ label: 'v2.4', meta: 'CURRENT · CRASHING', metaCls: 'bad', why: 'that\'s the broken one' }, { label: 'v2.3', meta: 'STABLE · 12 days', metaCls: 'ok', ok: 1 }, { label: 'v2.1', meta: 'STABLE · 90 days · old schema', why: 'too old — it would lose recent data' }], onDone: d, onMiss: m }) },
      { rows: [['POWER', 1], ['NETWORK', 0, 'unknown outbound traffic'], ['PROCESS', 1]], err: 'SUSPICIOUS TRAFFIC ON 3 LINKS', hint: 'process is healthy but something is using it',
        choices: [{ a: 'RESTART', why: 'it comes right back — the intruder is still connected' }, { a: 'REPAIR', why: 'nothing is broken… yet' }, { a: 'ROLLBACK', why: 'the code is fine' }, { a: 'ISOLATE', ok: 1 }],
        act: (d, m) => ACTIONS.switches({ title: 'ISOLATE', sub: 'cut the external links, left to right', labels: ['EXT-1', 'EXT-2', 'EXT-3'], onWord: 'CUT', onDone: d, onMiss: m }) }
    ];
    return runCase(o, pick(CASES), { title: name, tag: 'OFFLINE', icon: 'server', success: `✓ ${name} BACK ONLINE` });
  }

  // ---------- EVENT 2: BROKEN CONNECTION (cable drag) ----------
  function connection(o) {
    const PORTS = [{ k: 'DATA', c: '#6fb9e6' }, { k: 'POWER', c: '#f5c84c' }, { k: 'CONTROL', c: '#f29a3c' }];
    const from = o.from || 'ROUTER-02', to = o.to || 'SERVER-04';
    show('LINK ' + from + ' → ' + to, 'LINK DOWN', diag([['SIGNAL', 0, 'no carrier'], ['CABLES', 0, '3 unplugged'], ['PORTS', 1, 'undamaged']], 'PHYSICAL DISCONNECT AT JUNCTION') + `<div id="board-wrap"></div>`, 'warn', 'link');
    cableBoard(document.getElementById('board-wrap'), PORTS, from, to, () => { msg('✓ LINK RESTORED — packets flowing', 'good'); finish(o.onSuccess, 1100); }, (n, total, k) => msg(`${k} LINKED (${n}/${total})`, 'good'));
    return handleBase();
  }

  // ---------- EVENT 3: CORRUPTED DATA ----------
  const PUZZLES = [
    { seq: '2 → 4 → 8 → ?', choices: ['10', '12', '16'], ans: '16' },
    { seq: 'A  B  C  ?', choices: ['D', 'F', 'Z'], ans: 'D' },
    { seq: '1 → 3 → 5 → ?', choices: ['6', '7', '9'], ans: '7' },
    { seq: '● ●● ●●● ?', choices: ['●●', '●●●●', '●'], ans: '●●●●' },
    { seq: '10 → 20 → 30 → ?', choices: ['35', '40', '50'], ans: '40' },
    { seq: '0 1 1 0 1 1 0 ?', choices: ['0', '1', '2'], ans: '1' },
    { seq: 'Z  Y  X  ?', choices: ['A', 'W', 'V'], ans: 'W' },
    { seq: '3 → 6 → 12 → ?', choices: ['18', '24', '15'], ans: '24' },
  ];
  function puzzleAction(onDone, onMiss) {
    const pz = pick(PUZZLES);
    panel().querySelector('.panel-body').innerHTML = actTitle('REPAIR RECORD', 'rebuild the missing value — what comes next?') +
      `<div class="puzzle-seq">${esc(pz.seq).replace('?', '<span class="q">?</span>')}</div>
       <div class="choices">${shuffle(pz.choices).map((c, i) => `<button class="choice" data-act="ans" data-v="${esc(c)}"><span class="num">${i + 1}</span>${esc(c)}</button>`).join('')}</div>`;
    let done = false;
    bind(el => { if (done || el.dataset.act !== 'ans') return; if (el.dataset.v === pz.ans) { done = true; el.classList.add('right'); onDone(); } else { el.classList.add('wrong'); msg('✗ CHECKSUM MISMATCH — try again', 'bad'); Audio2.sfx.error(); shake(); setTimeout(() => el.classList.remove('wrong'), 400); onMiss(); } });
    return { update() {} };
  }
  function data(o) {
    const hex = () => Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, '0');
    const good = hex();
    const CASES = [
      { rows: [['INTEGRITY', 0, 'record #0413'], ['BACKUP', 1, 'snapshot 2 min ago'], ['ACCESS', 1]], err: 'CHECKSUM MISMATCH · expected ' + good, hint: 'a fresh backup exists — use it',
        choices: [{ a: 'REPAIR', why: 'slow by hand when a backup exists' }, { a: 'RESTORE', ok: 1 }, { a: 'ISOLATE', why: 'nothing malicious here' }, { a: 'DELETE', why: 'that\'s customer data!' }],
        act: (d, m) => ACTIONS.list({ title: 'RESTORE', sub: 'pick the snapshot whose checksum matches ' + good, rows: shuffle([{ label: 'snapshot · 2 min', meta: good, metaCls: 'ok', ok: 1 }, { label: 'snapshot · 9 min', meta: hex(), why: 'checksum doesn\'t match' }, { label: 'snapshot · 31 min', meta: hex(), why: 'checksum doesn\'t match' }]), onDone: d, onMiss: m }) },
      { rows: [['INTEGRITY', 0, 'record #0791'], ['BACKUP', 0, 'none'], ['ACCESS', 1]], err: 'MISSING BYTES IN #0791', hint: 'no backup — the record must be rebuilt',
        choices: [{ a: 'REPAIR', ok: 1 }, { a: 'RESTORE', why: 'there is no backup to restore from' }, { a: 'ISOLATE', why: 'it\'s damaged, not dangerous' }, { a: 'DELETE', why: 'we\'d lose the record for good' }],
        act: (d, m) => puzzleAction(d, m) },
      { rows: [['INTEGRITY', 1], ['BACKUP', 1], ['ACCESS', 0, 'unknown writer']], err: 'MALICIOUS ENTRY DETECTED', hint: 'one record was written by something that isn\'t us',
        choices: [{ a: 'REPAIR', why: 'it isn\'t broken — it\'s hostile' }, { a: 'RESTORE', why: 'the backup contains it too' }, { a: 'ISOLATE', ok: 1 }, { a: 'DELETE', why: 'deleting it loses the evidence — quarantine it' }],
        act: (d, m) => ACTIONS.list({ title: 'ISOLATE', sub: 'quarantine the entry that doesn\'t belong', rows: shuffle([{ label: '#0210 user_profile', meta: 'by: SYSTEM', why: 'that one is ours' }, { label: '#0211 user_profile', meta: 'by: SYSTEM', why: 'that one is ours' }, { label: '#0212 ??_pr0file', meta: 'by: UNKNOWN', metaCls: 'bad', ok: 1 }, { label: '#0213 user_profile', meta: 'by: SYSTEM', why: 'that one is ours' }]), onDone: d, onMiss: m }) },
      { rows: [['INTEGRITY', 1], ['STORAGE', 0, '98% full'], ['ACCESS', 1]], err: 'DUPLICATE RECORDS FLOODING STORAGE', hint: 'identical copies are filling the disk',
        choices: [{ a: 'REPAIR', why: 'they aren\'t broken, there are just too many' }, { a: 'RESTORE', why: 'a restore would add even more' }, { a: 'ISOLATE', why: 'they\'re harmless copies — just remove them' }, { a: 'DELETE', ok: 1 }],
        act: (d, m) => ACTIONS.list({ title: 'DELETE', sub: 'remove the 2 duplicate copies (keep the original)', rows: [{ label: '#0500 inventory', meta: 'ORIGINAL', metaCls: 'ok', why: 'keep the original!' }, { label: '#0500 inventory', meta: 'COPY', metaCls: 'bad', ok: 1 }, { label: '#0501 inventory', meta: 'ORIGINAL', metaCls: 'ok', why: 'that\'s a different record' }, { label: '#0500 inventory', meta: 'COPY', metaCls: 'bad', ok: 1 }], onDone: d, onMiss: m }) }
    ];
    return runCase(o, pick(CASES), { title: 'DATABASE SCAN', tag: 'CORRUPTED', icon: 'db', success: '✓ DATA RESTORED' });
  }

  // ---------- EVENT 4: GLITCH CREATURE (debugging) ----------
  const GLITCH_CASES = [
    { action: 'PATCH', scan: 'a code fragment has a HOLE — one byte missing' },
    { action: 'DEBUG', scan: 'three lines of logic, one of them is LYING' },
    { action: 'PURGE', scan: 'pure noise. no valid code at all. flush it' },
    { action: 'QUARANTINE', scan: 'it keeps HOPPING between memory cells' },
    { action: 'ROLLBACK', scan: 'it appeared right after the last deploy' },
  ];
  const PATCHES = [
    { code: 'funct_on restore()', hole: 'i', choices: ['i', 'o', 'x'] }, { code: 'netw_rk.connect()', hole: 'o', choices: ['a', 'o', 'e'] },
    { code: 'core.stabil_ze()', hole: 'i', choices: ['y', 'e', 'i'] }, { code: 'server.rest_rt()', hole: 'a', choices: ['a', 'o', 'u'] },
  ];
  const DEBUGS = [
    ['power = ON', 'network = OK', 'core = NULL'], ['1 + 1 = 2', '2 + 2 = 5', '3 + 3 = 6'],
    ['status: STABLE', 'status: STABLE', 'status: BANANA'], ['link A → B', 'link B → C', 'link C → C'],
  ];
  const DEBUG_WRONG = [2, 1, 2, 2];
  function glitch(o) {
    const cs = pick(GLITCH_CASES); let mistakes = 0, corruption = 6, done = false, phase = 1, act = null;
    const bar = () => '█'.repeat(corruption) + '░'.repeat(9 - corruption);
    const rows = () => [['CORRUPTION', corruption < 7, bar()], ['CONTAINMENT', 0, 'loose'], ['MOOD', 1, 'mischievous']];
    const fail = () => { done = true; msg('✗ THE GLITCH ESCAPED!', 'bad'); Audio2.sfx.glitch(); finish(o.onFail, 800); };
    const mistake = (text) => { mistakes++; corruption = Math.min(9, corruption + 1); msg(text, 'bad'); Audio2.sfx.error(); shake(); if (mistakes >= 2) fail(); };
    const win = () => { done = true; msg('✓ GLITCH DEBUGGED — it looks friendly now!', 'good'); Audio2.sfx.success(); finish(o.onSuccess, 800); };
    const render1 = () => { show('GLITCH ENCOUNTER', 'CORRUPTED', diag(rows(), 'GLITCH CREATURE IN THE ' + (o.where || 'SYSTEM'), 'scan: ' + cs.scan) + ask(['PATCH', 'QUARANTINE', 'DEBUG', 'ROLLBACK', 'PURGE']), 'bad', 'glitch'); };
    const setTag = (a) => { const t = panel().querySelector('.panel-tag'); t.textContent = a; t.className = 'panel-tag warn'; };
    const render2 = () => {
      phase = 2; setTag(cs.action); o.onAction && o.onAction();
      const body = panel().querySelector('.panel-body');
      if (cs.action === 'PATCH') {
        const sub = pick(PATCHES);
        body.innerHTML = actTitle('PATCH', 'fill the hole in the code') + `<div class="codebox">${esc(sub.code).replace('_', '<span class="hole">_</span>')}</div><div class="choices">${shuffle(sub.choices).map((c, i) => `<button class="choice mono" data-act="v" data-v="${c}"><span class="num">${i + 1}</span>${c}</button>`).join('')}</div>`;
        bind(el => { if (done || el.dataset.act !== 'v') return; el.dataset.v === sub.hole ? (el.classList.add('right'), win()) : (el.classList.add('wrong'), mistake('✗ still broken')); });
      } else if (cs.action === 'DEBUG') {
        const idx = Math.floor(Math.random() * DEBUGS.length); const lines = DEBUGS[idx], wrong = DEBUG_WRONG[idx];
        body.innerHTML = actTitle('DEBUG', 'click the line that is lying') + `<div class="codebox">${lines.map((l, i) => `<div class="codeline choice" data-act="ln" data-i="${i}"><span class="num">${i + 1}</span>${esc(l)}</div>`).join('')}</div>`;
        keyList = () => panel().querySelectorAll('.codeline');
        bind(el => { if (done || el.dataset.act !== 'ln') return; +el.dataset.i === wrong ? (el.classList.add('right'), win()) : (el.classList.add('wrong'), mistake('✗ that line is fine')); });
      } else if (cs.action === 'PURGE') {
        body.innerHTML = actTitle('PURGE', 'flush the noise buffer — hit it in the green') + '';
        act = ACTIONS.timing({ title: 'PURGE', sub: 'flush the buffer: ENGAGE in the green zone', btn: 'FLUSH', speed: 1.6, zone: [0.6, 0.82], onDone: win, onMiss: () => mistake('✗ mistimed — noise spills back') });
      } else if (cs.action === 'QUARANTINE') {
        act = ACTIONS.catchIt({ title: 'QUARANTINE', sub: 'tap the glitch 3 times before it hops', count: 3, hop: 0.8, onDone: win, onMiss: () => mistake('✗ missed — it hops away giggling') });
      } else {
        act = ACTIONS.list({ title: 'ROLLBACK', sub: 'roll back to the last deploy that was stable', rows: [{ label: 'deploy #88', meta: 'NOW · glitchy', metaCls: 'bad', why: 'that\'s the deploy that brought it' }, { label: 'deploy #87', meta: '2h ago · STABLE', metaCls: 'ok', ok: 1 }, { label: 'deploy #80', meta: '3 days · STABLE', why: 'too far back — we\'d lose today\'s work' }], onDone: win, onMiss: () => mistake('✗ wrong snapshot — the glitch grows') });
      }
    };
    render1();
    bind(el => {
      if (done || phase !== 1 || el.dataset.act !== 'choose') return;
      const a = el.dataset.a;
      if (a === cs.action) { Audio2.sfx.beep(); render2(); } else { el.classList.add('wrong'); setTimeout(() => el.classList.remove('wrong'), 400); mistake(`✗ ${a} had no effect! the glitch wriggles.`); }
    });
    return { close: hide, update(dt) { act && act.update && act.update(dt); }, onKey: keyPress };
  }

  // ---------- EVENT 5: ROUTER OVERLOAD (redistribute capacity) ----------
  function router(o) {
    const TOTAL = 10; const sys = [{ k: 'SERVERS', need: 4, v: 0 }, { k: 'DATABASE', need: 3, v: 0 }, { k: 'CORE', need: 5, v: 0, core: true }];
    const used = () => sys.reduce((s, x) => s + x.v, 0);
    const row = (s, i) => `<div class="power-row"><div class="pname ${s.core ? 'core-name' : ''}">${s.k}<small>needs ${s.need}</small></div><div class="cells">${Array.from({ length: s.need }, (_, k) => `<div class="cell ${k < s.v ? 'on' : 'need'}"></div>`).join('')}<span class="pval ${s.v >= s.need ? 'status-ok' : 'status-bad'}">${s.v >= s.need ? 'OK' : 'LOW'}</span></div><div class="pbtns"><button class="pbtn" data-act="pw" data-i="${i}" data-d="-1">−</button><span class="pval">${s.v}</span><button class="pbtn" data-act="pw" data-i="${i}" data-d="1">+</button></div></div>`;
    let phase = 'diag';
    const render = () => {
      if (phase === 'diag') { show('ROUTER-02', 'OVERLOAD', diag([['UPLINK', 1], ['LOAD', 0, '140% — requests dropped'], ['CAPACITY', 1, TOTAL + ' units']], 'ROUTING TABLE OVERLOADED', 'three systems are asking for 12 units. only 10 exist.') + ask(['REDISTRIBUTE CAPACITY', 'REBOOT ROUTER'], 'WHAT DO YOU DO?'), 'warn', 'router'); return; }
      show('ROUTER-02', 'REDISTRIBUTE', `<div class="power-total">CAPACITY LEFT <b>${TOTAL - used()}</b> / ${TOTAL}</div><div class="power-rows">${sys.map(row).join('')}</div><div class="choices"><button class="choice act-btn" id="act-btn" data-act="apply">[ APPLY ]<span class="keycap">E</span></button></div>`, 'warn', 'router');
      msg('Not enough for everything. Choose what matters.', '');
    };
    render();
    bind(el => {
      if (el.dataset.act === 'choose') {
        if (el.dataset.a === 'REBOOT ROUTER') { el.classList.add('wrong'); setTimeout(() => el.classList.remove('wrong'), 400); msg('✗ it reboots into the same overload', 'bad'); Audio2.sfx.error(); shake(); return; }
        phase = 'dist'; Audio2.sfx.beep(); o.onAction && o.onAction(); render(); return;
      }
      if (el.dataset.act === 'pw') { const s = sys[+el.dataset.i], d = +el.dataset.d; if (d > 0 && (used() >= TOTAL || s.v >= s.need)) { Audio2.sfx.error(); return; } if (d < 0 && s.v <= 0) return; s.v += d; Audio2.sfx.pop(); render(); return; }
      if (el.dataset.act === 'apply') {
        const alloc = Object.fromEntries(sys.map(s => [s.k, { v: s.v, ok: s.v >= s.need }]));
        const coreOk = alloc.CORE.ok;
        msg(coreOk ? '✓ CORE POWERED — router balanced' : '⚠ CORE UNDERPOWERED — it will destabilize', coreOk ? 'good' : 'bad');
        coreOk ? Audio2.sfx.success() : Audio2.sfx.warn();
        finish(() => o.onSuccess(alloc), 900);
      }
    });
    return handleBase();
  }

  // ---------- FINAL: CORE DIAGNOSTIC ----------
  function core(o) {
    const s = o.stats; // {power, network, database} 0..1
    const P = s.power >= 0.5, N = s.network >= 0.7, D = s.database >= 0.6;
    const rows = [['POWER', P, P ? '' : Math.round(s.power * 100) + '%'], ['NETWORK', N, N ? '' : Math.round(s.network * 7) + '/7 nodes'], ['DATABASE', D, D ? '' : 'degraded']];
    let cs;
    if (!N) cs = { rows, err: 'ROUTER-04 CONNECTION TIMEOUT', hint: 'router answers ping · alternate routes: 0',
      choices: [{ a: 'RECONNECT', ok: 1 }, { a: 'REROUTE', why: 'there is no alternate route' }, { a: 'RESTART ROUTER', why: 'the router is alive — a restart drops the core' }],
      act: (d) => { panel().querySelector('.panel-body').innerHTML = actTitle('RECONNECT', 'plug the core back into ROUTER-04') + '<div id="board-wrap"></div>'; cableBoard(document.getElementById('board-wrap'), [{ k: 'DATA', c: '#6fb9e6' }, { k: 'SYNC', c: '#f29a3c' }], 'CORE', 'ROUTER-04', d, (n, t, k) => msg(`${k} LINKED (${n}/${t})`, 'good')); return { update() {} }; } };
    else if (!P) cs = { rows, err: 'POWER FEED UNDERVOLTAGE', hint: 'backup cell: CHARGED · nonessential load: 4%',
      choices: [{ a: 'BOOST FEED', why: 'the feed is already at max output' }, { a: 'SWITCH TO BACKUP', ok: 1 }, { a: 'CUT NONESSENTIALS', why: 'only 4% to cut — not enough' }],
      act: (d, m) => ACTIONS.switches({ title: 'SWITCH TO BACKUP', sub: 'throw the breakers in order', labels: ['MAIN OFF', 'BACKUP ON', 'ENGAGE'], onWord: 'SET', onDone: d, onMiss: m }) };
    else if (!D) cs = { rows, err: 'CORE.DB INDEX CORRUPTION', hint: 'records intact · snapshot: STALE (14 min old)',
      choices: [{ a: 'REBUILD INDEX', ok: 1 }, { a: 'RESTORE SNAPSHOT', why: '14 minutes of data would vanish' }, { a: 'PURGE TABLE', why: 'the records are fine! only the index is broken' }],
      act: (d, m) => ACTIONS.targets({ title: 'REBUILD INDEX', sub: 're-link the 3 broken index pages', count: 3, total: 8, label: i => 'IX' + (i + 1), onDone: d, onMiss: m }) };
    else cs = { rows, err: 'CLOCK SYNC DRIFT +340ms', hint: 'all subsystems nominal · sync pulse available',
      choices: [{ a: 'RESYNC CLOCK', ok: 1 }, { a: 'REBOOT CORE', why: 'a full reboot takes minutes. we have seconds' }, { a: 'IGNORE IT', why: 'the drift IS what\'s destabilizing the core' }],
      act: (d, m) => ACTIONS.timing({ title: 'RESYNC CLOCK', sub: 'catch the pulse: ENGAGE in the green', btn: 'SYNC', speed: 1.5, zone: [0.62, 0.8], hits: 2, onDone: d, onMiss: m }) };
    return runCase(o, cs, { title: 'CORE DIAGNOSTIC', tag: 'SYSTEM FAILURE', icon: 'core', success: '✓ CORE STABILIZED — NETWORK RESTORED', delay: 500 });
  }

  return { server, connection, data, glitch, router, core, hide };
})();
