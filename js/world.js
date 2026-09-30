// World: compact digital village. Procedural illustration, colliders, cables + packets.
const World = (() => {
  const W = 1800, H = 1150;
  const { rr, fillRR, C } = Robot;
  const P = { // palette
    ground: '#e8dbb6', groundDark: '#dccb9f', grass: '#b9d89a', grass2: '#a3cb87', path: '#7fc4e0', pathDark: '#4f8fb0',
    cream: '#f6ecd6', wall: '#f1e4c8', wallShade: '#d8c7a2', roof: '#3aa6a0', roofDark: '#2a807b', ink: '#2c3e50',
    orange: '#f29a3c', yellow: '#f5c84c', green: '#7fc26b', purple: '#8b6fc2', red: '#e2574c', blue: '#6fb9e6',
    glitch: '#d64fc1', water: '#9fd8e8', crate: '#d9a35b', crateDark: '#a9713a', metal: '#8d99a8', metalDark: '#5c6b7a', trace: 'rgba(46,156,149,.22)'
  };
  const NODES = {
    hub:      { id: 'hub', name: 'CENTRAL HUB', x: 900, y: 620 },
    core:     { id: 'core', name: 'CORE SERVER', x: 900, y: 250 },
    servers:  { id: 'servers', name: 'SERVER VILLAGE', x: 360, y: 560 },
    router:   { id: 'router', name: 'ROUTER HILL', x: 470, y: 230 },
    garden:   { id: 'garden', name: 'DATA GARDEN', x: 430, y: 930 },
    database: { id: 'database', name: 'DATABASE', x: 1440, y: 560 },
    factory:  { id: 'factory', name: 'PROCESSING FACTORY', x: 1380, y: 930 },
    cloud:    { id: 'cloud', name: 'CLOUD', x: 1400, y: 230 },
  };
  for (const n of Object.values(NODES)) { n.status = 'ok'; n.health = 100; }
  const EDGES = [
    ['hub', 'core'], ['hub', 'servers'], ['hub', 'database'], ['hub', 'garden'], ['hub', 'factory'],
    ['servers', 'router'], ['router', 'core'], ['database', 'cloud'], ['cloud', 'core'], ['garden', 'servers'], ['factory', 'database']
  ].map(([a, b], i) => ({ id: a + '-' + b, a, b, broken: false, packets: Array.from({ length: 4 }, (_, k) => k / 4 + Math.random() * 0.1), bend: (i % 2 ? 1 : -1) * 40 }));

  // seeded RNG for stable decorations
  let seed = 1337; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  const colliders = []; // {x,y,w,h}
  const drawables = []; // {y, draw(ctx,t,st)}
  const grassPatches = [], flowers = [], bushes = [], cubes = [], signs = [], traces = [], groundCables = [], motes = [], pebbles = [], groundProps = [];
  const butterflies = Array.from({ length: 12 }, (_, i) => ({ x: rnd() * W, y: rnd() * H, seed: i * 7.3, color: [P.yellow, P.blue, '#ff9fd6', P.green][i % 4] }));
  const miniBots = [
    { x: 820, y: 700, seed: 1, color: P.yellow, dir: 1, minX: 780, maxX: 1020, kind: 'sweeper' },
    { x: 1420, y: 640, seed: 2, color: P.orange, dir: -1, minX: 1360, maxX: 1520, kind: 'carrier' },
    { x: 320, y: 660, seed: 3, color: P.blue, dir: 1, minX: 260, maxX: 470, kind: 'roller' },
    { x: 1250, y: 1000, seed: 4, color: P.green, dir: 1, minX: 1180, maxX: 1330, kind: 'carrier' },
    { x: 760, y: 330, seed: 5, color: '#ff9fd6', dir: -1, minX: 700, maxX: 830, kind: 'sweeper' }
  ];
  // little villagers (idle in place)
  const npcs = [
    { x: 560, y: 590, color: P.roof, hat: 'cap', hatColor: P.orange, prop: 'tablet', seed: 1, facing: -1, emote: '!?' },
    { x: 210, y: 700, color: P.purple, hat: 'hard', prop: 'can', seed: 2, emote: '♥' },
    { x: 1010, y: 560, color: P.red, hat: 'ears', prop: 'cup', seed: 3, facing: -1, emote: 'zzz' },
    { x: 1330, y: 640, color: P.blue, prop: 'sign', seed: 4, emote: '→' },
    { x: 640, y: 1000, color: P.green, hat: 'cap', hatColor: P.yellow, prop: 'can', seed: 5, emote: '♪' },
    { x: 1520, y: 880, color: P.orange, hat: 'hard', prop: 'tablet', seed: 6, facing: -1, emote: '...' },
    { x: 1080, y: 330, color: P.roof, hat: 'ears', prop: 'cup', seed: 7, emote: '☕' },
    { x: 1560, y: 300, color: '#ff9fd6', prop: 'tablet', seed: 8, facing: -1, emote: '☁' }
  ];
  // tiny ambient glitches: harmless, wander in a small circle
  const tinyGlitches = [
    { x: 620, y: 860, cx: 620, cy: 860, seed: 1, scale: 0.5 }, { x: 1250, y: 1050, cx: 1250, cy: 1050, seed: 2, scale: 0.45 },
    { x: 1620, y: 420, cx: 1620, cy: 420, seed: 3, scale: 0.4 }, { x: 180, y: 380, cx: 180, cy: 380, seed: 4, scale: 0.45 }
  ];

  function edgeCurve(e) {
    const a = NODES[e.a], b = NODES[e.b];
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
    return { x0: a.x, y0: a.y, cx: mx + (-dy / len) * e.bend, cy: my + (dx / len) * e.bend, x1: b.x, y1: b.y };
  }
  function bez(c, t) {
    const u = 1 - t; return { x: u * u * c.x0 + 2 * u * t * c.cx + t * t * c.x1, y: u * u * c.y0 + 2 * u * t * c.cy + t * t * c.y1 };
  }
  function edgeStatus(e) {
    const a = NODES[e.a], b = NODES[e.b];
    if (a.status === 'corrupted' || b.status === 'corrupted') return 'corrupted';
    if (e.broken || a.status === 'offline' || b.status === 'offline') return 'broken';
    if (a.status === 'degraded' || b.status === 'degraded') return 'damaged';
    return 'ok';
  }

  // ---------- drawing helpers ----------
  function box(ctx, x, y, w, d, h, wall, top, shade) {
    // front face
    ctx.fillStyle = wall; ctx.strokeStyle = P.ink; ctx.lineWidth = 2.5;
    rr(ctx, x - w / 2, y - h, w, h, 4); ctx.fill(); ctx.stroke();
    // top face
    ctx.fillStyle = top; rr(ctx, x - w / 2, y - h - d, w, d + 6, 6); ctx.fill(); ctx.stroke();
    // shade strip
    if (shade) { ctx.fillStyle = shade; ctx.fillRect(x - w / 2 + 3, y - h + 3, 6, h - 6); }
  }
  function label(ctx, x, y, text, bg = P.ink, fg = P.cream, size = 11) {
    ctx.font = `700 ${size}px Fredoka, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width + 14;
    fillRR(ctx, x - w / 2, y - 9, w, 18, 6, bg, P.ink, 2);
    ctx.fillStyle = fg; ctx.fillText(text, x, y + 0.5);
  }
  function statusTint(status) {
    if (status === 'offline') return { win: '#3a4250', glow: null, dim: true };
    if (status === 'corrupted') return { win: P.glitch, glow: 'rgba(214,79,193,.5)', dim: false, glitchy: true };
    if (status === 'degraded') return { win: P.orange, glow: 'rgba(242,154,60,.4)', dim: false };
    return { win: P.yellow, glow: 'rgba(245,200,76,.45)', dim: false };
  }
  function windows(ctx, x, y, cols, rows, sx, sy, t, node, seedOff) {
    const tint = statusTint(node.status);
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const k = Math.sin(t * 2 + i * 1.7 + j * 2.3 + seedOff);
      let col = tint.win;
      if (!tint.dim && k > 0.6) col = tint.glitchy ? '#5ad6ff' : '#fff3c4';
      if (!tint.dim && k < -0.7) col = tint.glitchy ? '#ff5fb0' : '#e6a93c';
      if (tint.glitchy && Math.random() < 0.05) col = '#2c3e50';
      ctx.fillStyle = col; rr(ctx, x + i * sx, y + j * sy, 8, 8, 2); ctx.fill();
    }
  }
  function ring(ctx, x, y, r, col, lw = 2) { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.5, 0, 0, Math.PI * 2); ctx.stroke(); }
  function warnIcon(ctx, x, y, t) {
    const bob = Math.sin(t * 5) * 3;
    ctx.fillStyle = P.red; ctx.strokeStyle = P.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y - 20 + bob); ctx.lineTo(x + 11, y + bob); ctx.lineTo(x - 11, y + bob); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillRect(x - 1.5, y - 14 + bob, 3, 8); ctx.fillRect(x - 1.5, y - 4 + bob, 3, 3);
  }

  // ---------- structures ----------
  function addCollider(x, y, w, h) { colliders.push({ x, y, w, h }); }
  function serverBuilding(x, y, name, isTarget) {
    const node = NODES.servers;
    addCollider(x - 36, y - 30, 72, 34);
    drawables.push({ y, draw(ctx, t) {
      const status = isTarget && node.s3 ? node.s3 : node.status;
      const tint = statusTint(status);
      const glowing = !tint.dim && status === 'ok';
      if (tint.glow && !tint.dim) { ctx.fillStyle = tint.glow; ctx.beginPath(); ctx.ellipse(x, y + 2, 50, 16, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = 'rgba(40,30,20,.18)'; ctx.beginPath(); ctx.ellipse(x + 6, y + 3, 42, 10, 0, 0, Math.PI * 2); ctx.fill();
      box(ctx, x, y, 72, 22, 62, tint.dim ? '#a89c85' : P.wall, tint.dim ? '#4d6664' : P.roof, P.wallShade);
      // roof vents
      ctx.fillStyle = tint.dim ? '#3a4d4c' : P.roofDark; ctx.fillRect(x - 24, y - 62 - 16, 14, 6); ctx.fillRect(x + 8, y - 62 - 16, 14, 6);
      windows(ctx, x - 26, y - 54, 4, 3, 14, 13, t, { status }, x * 0.01);
      // door
      fillRR(ctx, x - 8, y - 20, 16, 20, 3, tint.dim ? '#33404d' : P.roofDark, P.ink, 2);
      ctx.fillStyle = glowing ? P.green : (status === 'corrupted' ? P.glitch : P.red); ctx.beginPath(); ctx.arc(x + 20, y - 10, 3, 0, Math.PI * 2); ctx.fill();
      label(ctx, x, y - 96, name, status !== 'ok' ? P.red : P.ink);
    } });
  }
  function tower(x, y, h, node) {
    addCollider(x - 14, y - 16, 28, 20);
    drawables.push({ y, draw(ctx, t) {
      ctx.fillStyle = 'rgba(40,30,20,.18)'; ctx.beginPath(); ctx.ellipse(x + 4, y + 2, 20, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = P.ink; ctx.lineWidth = 2.5;
      // legs
      ctx.fillStyle = '#8d99a8'; ctx.beginPath(); ctx.moveTo(x - 14, y); ctx.lineTo(x - 7, y - h); ctx.lineTo(x + 7, y - h); ctx.lineTo(x + 14, y); ctx.closePath(); ctx.fill(); ctx.stroke();
      // stripes
      for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? '#fff' : P.orange; const yy = y - (i + 1) * h / 5; const w = 14 - i * 1.6; ctx.fillRect(x - w, yy, w * 2, 6); }
      // dish
      fillRR(ctx, x - 10, y - h - 14, 20, 16, 7, P.wall, P.ink, 2);
      ctx.fillStyle = node.status === 'ok' ? P.blue : (node.status === 'degraded' ? P.orange : P.red); ctx.beginPath(); ctx.arc(x, y - h - 6, 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = P.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - h - 14); ctx.lineTo(x, y - h - 26); ctx.stroke();
      ctx.fillStyle = P.red; ctx.beginPath(); ctx.arc(x, y - h - 28, 3 + Math.sin(t * 6) * 1, 0, Math.PI * 2); ctx.fill();
      // signal rings
      if (node.status !== 'offline') {
        const speed = node.status === 'ok' ? 1 : 2.5;
        for (let i = 0; i < 3; i++) {
          const p = ((t * speed + i / 3) % 1);
          ctx.globalAlpha = (1 - p) * 0.7;
          ring(ctx, x, y - h - 26, 10 + p * 40, node.status === 'ok' ? P.blue : P.orange, 2.5);
        }
        ctx.globalAlpha = 1;
      }
    } });
  }
  function tree(x, y, size, hue) {
    addCollider(x - 10, y - 10, 20, 12);
    const cols = [[P.roof, '#5fc0b8'], [P.green, '#a6dd8c'], ['#6aa9d8', '#9ecdf0']][hue % 3];
    drawables.push({ y, draw(ctx, t) {
      const st = NODES.garden.status;
      const sway = Math.sin(t * 1.5 + x) * 2;
      ctx.fillStyle = 'rgba(40,30,20,.18)'; ctx.beginPath(); ctx.ellipse(x + 3, y + 2, size * 0.9, size * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      fillRR(ctx, x - 5, y - size * 1.2, 10, size * 1.2, 3, '#a9713a', P.ink, 2);
      const c0 = st === 'corrupted' ? '#6b4a9c' : (st === 'offline' ? '#7a8b86' : cols[0]);
      const c1 = st === 'corrupted' ? P.glitch : (st === 'offline' ? '#9aa8a2' : cols[1]);
      ctx.strokeStyle = P.ink; ctx.lineWidth = 2.5;
      for (const [ox, oy, r] of [[-size * 0.5, -size * 1.2, size * 0.6], [size * 0.5, -size * 1.25, size * 0.6], [0, -size * 1.7, size * 0.7]]) {
        ctx.fillStyle = c0; ctx.beginPath(); ctx.arc(x + ox + sway, y + oy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle = c1;
      for (let i = 0; i < 5; i++) { const a = i * 1.3 + x; ctx.fillRect(x + sway + Math.cos(a) * size * 0.5 - 3, y - size * 1.5 + Math.sin(a) * size * 0.4 - 3, 6, 6); }
    } });
  }

  // ---------- small props ----------
  function serverUnit(x, y, node, opts = {}) {
    const w = opts.w || 22, h = opts.h || 30, col = opts.col || P.wall;
    drawables.push({ y, draw(ctx, t) {
      const st = node ? node.status : 'ok'; const tint = statusTint(st);
      ctx.fillStyle = 'rgba(40,30,20,.16)'; ctx.beginPath(); ctx.ellipse(x + 2, y + 1, w * 0.7, 4, 0, 0, Math.PI * 2); ctx.fill();
      box(ctx, x, y, w, 7, h, tint.dim ? '#a89c85' : col, tint.dim ? '#4d6664' : (opts.top || P.roofDark), P.wallShade);
      const rows = Math.floor((h - 8) / 7);
      for (let j = 0; j < rows; j++) {
        ctx.fillStyle = '#22313f'; ctx.fillRect(x - w / 2 + 4, y - h + 6 + j * 7, w - 8, 4);
        for (let i = 0; i < 3; i++) {
          const k = Math.sin(t * (3 + i) + j * 1.7 + x * 0.05 + i * 2.1);
          ctx.fillStyle = tint.dim ? '#33404d' : (k > 0.2 ? (tint.glitchy ? P.glitch : i === 2 ? P.orange : P.green) : '#33404d');
          ctx.fillRect(x - w / 2 + 5 + i * 4, y - h + 7 + j * 7, 2.5, 2.5);
        }
      }
      if (opts.dish) { ctx.strokeStyle = P.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - h - 7); ctx.lineTo(x, y - h - 16); ctx.stroke(); ctx.fillStyle = P.red; ctx.beginPath(); ctx.arc(x, y - h - 17, 2.5 + Math.sin(t * 5 + x) * 0.8, 0, Math.PI * 2); ctx.fill(); }
    } });
  }
  function terminal(x, y, lines = 3) {
    drawables.push({ y, draw(ctx, t) {
      ctx.fillStyle = 'rgba(40,30,20,.16)'; ctx.beginPath(); ctx.ellipse(x + 2, y + 1, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
      fillRR(ctx, x - 5, y - 20, 10, 20, 2, P.metal, P.ink, 2);
      fillRR(ctx, x - 14, y - 40, 28, 22, 4, P.wall, P.ink, 2);
      fillRR(ctx, x - 11, y - 37, 22, 15, 2, '#22313f', P.ink, 1.5);
      for (let i = 0; i < lines; i++) { ctx.fillStyle = i === lines - 1 && Math.sin(t * 6) > 0 ? P.yellow : '#5ad6ff'; ctx.fillRect(x - 9, y - 34 + i * 4, 6 + Math.abs(Math.sin(t * 1.5 + i + x)) * 12, 2); }
      ctx.fillStyle = P.orange; ctx.fillRect(x + 6, y - 22, 4, 2);
    } });
  }
  function crate(x, y, sz = 16, col = P.crate, stacked = false, icon = 0) {
    drawables.push({ y, draw(ctx) {
      const draw1 = (yy, w) => {
        box(ctx, x, yy, w, w * 0.4, w, col, col === P.crate ? '#e6b873' : col, null);
        ctx.strokeStyle = 'rgba(44,62,80,.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - w / 2 + 3, yy - 3); ctx.lineTo(x + w / 2 - 3, yy - w + 3); ctx.moveTo(x + w / 2 - 3, yy - 3); ctx.lineTo(x - w / 2 + 3, yy - w + 3); ctx.stroke();
        ctx.fillStyle = icon === 1 ? P.blue : icon === 2 ? P.orange : P.yellow; ctx.fillRect(x - 3, yy - w / 2 - 2, 6, 4);
      };
      ctx.fillStyle = 'rgba(40,30,20,.16)'; ctx.beginPath(); ctx.ellipse(x + 2, y + 1, sz * 0.7, 4, 0, 0, Math.PI * 2); ctx.fill();
      draw1(y, sz);
      if (stacked) draw1(y - sz - sz * 0.4 + 4, sz * 0.75);
    } });
  }
  function dataPlant(x, y, col = P.blue, n = 3, size = 1) {
    drawables.push({ y, draw(ctx, t) {
      const st = NODES.garden.status;
      ctx.fillStyle = 'rgba(40,30,20,.14)'; ctx.beginPath(); ctx.ellipse(x, y + 1, 9 * size, 3 * size, 0, 0, Math.PI * 2); ctx.fill();
      // pot / base
      fillRR(ctx, x - 7 * size, y - 7 * size, 14 * size, 7 * size, 2, P.metalDark, P.ink, 1.5);
      ctx.fillStyle = '#5ad6ff'; ctx.fillRect(x - 4 * size, y - 5 * size, 8 * size, 1.5);
      for (let i = 0; i < n; i++) {
        const a = (i - (n - 1) / 2) * 0.55 + Math.sin(t * 1.6 + x + i) * 0.08;
        const len = (18 + (i % 2) * 6) * size;
        const tx = x + Math.sin(a) * len, ty = y - 7 * size - Math.cos(a) * len;
        ctx.strokeStyle = P.ink; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(x, y - 6 * size); ctx.quadraticCurveTo(x + Math.sin(a) * len * 0.3, y - 6 * size - len * 0.6, tx, ty); ctx.stroke();
        ctx.strokeStyle = st === 'corrupted' ? '#6b4a9c' : P.roof; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x, y - 6 * size); ctx.quadraticCurveTo(x + Math.sin(a) * len * 0.3, y - 6 * size - len * 0.6, tx, ty); ctx.stroke();
        // leaf
        ctx.fillStyle = st === 'corrupted' ? '#8b5fd6' : P.green; ctx.beginPath(); ctx.ellipse(x + Math.sin(a) * len * 0.45 + 3, y - 6 * size - len * 0.5, 4 * size, 2 * size, a + 0.6, 0, Math.PI * 2); ctx.fill();
        // glowing bulb
        const pulse = 0.7 + Math.sin(t * 3 + i * 1.4 + x) * 0.3;
        const bc = st === 'corrupted' ? P.glitch : col;
        ctx.fillStyle = bc; ctx.globalAlpha = 0.25 * pulse; ctx.beginPath(); ctx.arc(tx, ty, 7 * size, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.arc(tx, ty, 3.2 * size, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = P.ink; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(tx - 1.5, ty - 1.5, 1.5, 1.5);
      }
    } });
  }
  function machine(x, y, kind = 'fan') {
    drawables.push({ y, draw(ctx, t) {
      ctx.fillStyle = 'rgba(40,30,20,.16)'; ctx.beginPath(); ctx.ellipse(x + 2, y + 1, 18, 5, 0, 0, Math.PI * 2); ctx.fill();
      if (kind === 'fan') {
        box(ctx, x, y, 30, 8, 22, P.wallShade, P.metal, null);
        ctx.fillStyle = '#22313f'; ctx.beginPath(); ctx.arc(x, y - 11, 8, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.translate(x, y - 11); ctx.rotate(t * 6); ctx.fillStyle = P.metal; for (let i = 0; i < 3; i++) { ctx.rotate(Math.PI * 2 / 3); ctx.beginPath(); ctx.ellipse(0, -4, 2, 5, 0, 0, Math.PI * 2); ctx.fill(); } ctx.restore();
        ctx.fillStyle = Math.sin(t * 4 + x) > 0 ? P.green : '#33404d'; ctx.fillRect(x + 9, y - 19, 3, 3);
      } else if (kind === 'piston') {
        box(ctx, x, y, 26, 8, 14, P.metal, P.metalDark, null);
        const up = Math.abs(Math.sin(t * 3 + x)) * 8;
        fillRR(ctx, x - 4, y - 24 - up, 8, 12 + up, 2, P.orange, P.ink, 1.5);
        fillRR(ctx, x - 8, y - 28 - up, 16, 6, 2, P.metalDark, P.ink, 1.5);
        ctx.fillStyle = P.yellow; ctx.fillRect(x - 10, y - 12, 4, 3); ctx.fillRect(x + 6, y - 12, 4, 3);
      } else if (kind === 'tank') {
        fillRR(ctx, x - 9, y - 30, 18, 30, 8, '#c9d6de', P.ink, 2);
        ctx.fillStyle = P.blue; ctx.globalAlpha = .8; ctx.fillRect(x - 6, y - 14 + Math.sin(t * 2 + x) * 2, 12, 11 - Math.sin(t * 2 + x) * 2); ctx.globalAlpha = 1;
        for (let i = 0; i < 3; i++) { const p = ((t * 0.7 + i / 3) % 1); ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(x - 3 + i * 3, y - 6 - p * 20, 2, 2); }
        ctx.strokeStyle = P.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 9, y - 20); ctx.lineTo(x + 9, y - 20); ctx.stroke();
        ctx.fillStyle = P.metalDark; ctx.fillRect(x - 4, y - 34, 8, 5);
      } else if (kind === 'antenna') {
        fillRR(ctx, x - 6, y - 8, 12, 8, 2, P.metalDark, P.ink, 1.5);
        ctx.strokeStyle = P.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x, y - 34); ctx.stroke();
        ctx.strokeStyle = P.metal; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x, y - 34); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y - 30, 7, Math.PI * 1.1, Math.PI * 1.9); ctx.strokeStyle = P.ink; ctx.lineWidth = 2.5; ctx.stroke();
        for (let i = 0; i < 2; i++) { const p = ((t * 1.2 + i / 2) % 1); ctx.globalAlpha = 1 - p; ctx.strokeStyle = P.blue; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - 34, 4 + p * 14, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
        ctx.globalAlpha = 1;
      }
    } });
  }
  function lamp(x, y, col = P.yellow) {
    drawables.push({ y, draw(ctx, t) {
      ctx.strokeStyle = P.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 40); ctx.stroke();
      ctx.strokeStyle = P.metalDark; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 40); ctx.stroke();
      fillRR(ctx, x - 6, y - 4, 12, 4, 1.5, P.metalDark, P.ink, 1.5);
      const k = 0.85 + Math.sin(t * 2 + x) * 0.15;
      ctx.fillStyle = col; ctx.globalAlpha = 0.18 * k; ctx.beginPath(); ctx.arc(x, y - 44, 18, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      fillRR(ctx, x - 7, y - 50, 14, 12, 5, col, P.ink, 2);
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(x - 3, y - 47, 3, 3);
    } });
  }
  function bench(x, y) {
    drawables.push({ y, draw(ctx) {
      ctx.fillStyle = P.metalDark; ctx.fillRect(x - 12, y - 8, 3, 8); ctx.fillRect(x + 9, y - 8, 3, 8);
      fillRR(ctx, x - 15, y - 13, 30, 6, 2, P.crateDark, P.ink, 1.5);
      fillRR(ctx, x - 15, y - 22, 30, 4, 1.5, P.crateDark, P.ink, 1.5);
    } });
  }
  function bollard(x, y) {
    drawables.push({ y, draw(ctx, t) { fillRR(ctx, x - 3, y - 12, 6, 12, 2, P.wall, P.ink, 1.5); ctx.fillStyle = Math.sin(t * 2 + x) > -0.3 ? P.blue : '#33404d'; ctx.fillRect(x - 2, y - 10, 4, 2); } });
  }
  function pipe(x0, y0, x1, y1) {
    groundCables.push({ x0, y0, x1, y1, thick: true, speed: 0.3 + rnd() * 0.3, phase: rnd() });
  }
  function cable(x0, y0, x1, y1, col = P.metalDark) {
    groundCables.push({ x0, y0, x1, y1, col, speed: 0.4 + rnd() * 0.4, phase: rnd() });
  }
  function puddle(x, y, rx, ry) {
    groundProps.push({ draw(ctx, t) { ctx.fillStyle = P.water; ctx.globalAlpha = .7; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x - rx * 0.4 + Math.sin(t + x) * 3, y - 2, rx * 0.5, 2); } });
  }
  function build() {
    // grass patches
    for (let i = 0; i < 34; i++) grassPatches.push({ x: rnd() * W, y: rnd() * H, rx: 60 + rnd() * 120, ry: 30 + rnd() * 60, c: rnd() > 0.5 ? P.grass : P.grass2 });
    for (let i = 0; i < 90; i++) flowers.push({ x: rnd() * W, y: rnd() * H, c: [P.yellow, P.orange, '#ff9fd6', P.blue][Math.floor(rnd() * 4)], s: 3 + rnd() * 2 });
    for (let i = 0; i < 40; i++) bushes.push({ x: rnd() * W, y: rnd() * H, r: 8 + rnd() * 8 });
    for (let i = 0; i < 30; i++) cubes.push({ x: rnd() * W, y: rnd() * H, s: 6 + rnd() * 8, c: [P.blue, P.roof, P.purple][Math.floor(rnd() * 3)] });
    for (let i = 0; i < 60; i++) pebbles.push({ x: rnd() * W, y: rnd() * H, r: 2 + rnd() * 3 });
    // circuit traces etched in the ground (digital feel)
    for (let i = 0; i < 26; i++) {
      const x = rnd() * W, y = rnd() * H; const pts = [{ x, y }]; let cx = x, cy = y;
      for (let k = 0; k < 3; k++) { if (k % 2) cy += (rnd() - 0.5) * 120; else cx += (rnd() - 0.5) * 160; pts.push({ x: cx, y: cy }); }
      traces.push(pts);
    }
    // floating data motes near data-heavy places
    for (const [mx, my, r] of [[900, 250, 150], [1440, 560, 110], [360, 560, 130], [430, 930, 120], [1400, 230, 120], [1380, 930, 110], [900, 620, 90]])
      for (let i = 0; i < 7; i++) motes.push({ x: mx + (rnd() - 0.5) * r * 2, y: my + (rnd() - 0.5) * r, r, seed: rnd() * 10, col: [P.blue, P.yellow, '#fff', P.roof][Math.floor(rnd() * 4)] });

    // ---- village dressing (decorative, no colliders — layout unchanged) ----
    // hub plaza
    lamp(800, 590); lamp(1000, 590); lamp(830, 720, P.orange); lamp(980, 720, P.orange);
    bench(760, 650); bench(1040, 650);
    for (const [bx, by] of [[820, 560], [980, 560], [760, 700], [1040, 700]]) bollard(bx, by);
    terminal(840, 610, 4); crate(950, 690, 16, P.crate, true, 1);
    serverUnit(1000, 520, NODES.hub, { w: 22, h: 28 }); serverUnit(800, 520, NODES.hub, { w: 22, h: 28, dish: true });
    puddle(870, 700, 22, 8);
    cable(840, 612, 900, 620); cable(1000, 522, 920, 610, P.metalDark);
    // server village
    serverUnit(220, 590, NODES.servers, { w: 20, h: 26 }); serverUnit(246, 600, NODES.servers, { w: 20, h: 32, dish: true });
    serverUnit(420, 500, NODES.servers, { w: 24, h: 26 }); serverUnit(520, 560, NODES.servers, { w: 22, h: 36 }); serverUnit(500, 640, NODES.servers, { w: 22, h: 26 });
    serverUnit(300, 430, NODES.servers, { w: 22, h: 30 }); serverUnit(180, 500, NODES.servers, { w: 24, h: 34, dish: true });
    crate(400, 690, 18, P.crate, true, 0); crate(430, 700, 14, P.blue, false, 2); crate(190, 640, 16, P.crate, false, 1); crate(560, 500, 15, P.crate, true, 2);
    terminal(300, 700, 3); terminal(560, 440, 3);
    machine(160, 580, 'fan'); machine(600, 620, 'antenna'); machine(230, 460, 'tank');
    lamp(440, 730); lamp(260, 420, P.blue);
    dataPlant(150, 720, P.blue, 3); dataPlant(600, 700, P.yellow, 2); dataPlant(480, 430, P.blue, 3);
    pipe(270, 522, 330, 640); pipe(370, 482, 450, 600); cable(246, 602, 300, 700, P.metalDark); cable(520, 562, 560, 442, P.metalDark);
    puddle(500, 720, 18, 6);
    // router hill
    machine(380, 300, 'antenna'); machine(580, 210, 'antenna'); serverUnit(400, 320, NODES.router, { w: 20, h: 26 });
    crate(560, 340, 14, P.crate, false, 0); terminal(340, 260, 2); bollard(620, 300); bollard(300, 320);
    cable(430, 222, 470, 282); cable(520, 262, 470, 282); cable(400, 322, 470, 282);
    // core
    serverUnit(760, 300, NODES.core, { w: 24, h: 40, col: '#e9eef2', top: '#2b4a55' }); serverUnit(1040, 300, NODES.core, { w: 24, h: 40, col: '#e9eef2', top: '#2b4a55' });
    serverUnit(730, 360, NODES.core, { w: 22, h: 30, col: '#e9eef2', top: '#2b4a55', dish: true }); serverUnit(1070, 360, NODES.core, { w: 22, h: 30, col: '#e9eef2', top: '#2b4a55', dish: true });
    machine(800, 380, 'tank'); machine(1000, 380, 'tank'); terminal(700, 420, 4); terminal(1100, 420, 4);
    lamp(720, 250, P.blue); lamp(1080, 250, P.blue); bollard(780, 420); bollard(1020, 420); bollard(840, 440); bollard(960, 440);
    pipe(760, 302, 830, 262); pipe(1040, 302, 970, 262); cable(800, 382, 860, 300); cable(1000, 382, 940, 300);
    for (let i = 0; i < 6; i++) { const a = -0.3 + i * 0.22; dataPlant(900 + Math.cos(a) * 190 - 95, 420 + Math.sin(a) * 30 - 20, P.blue, 2, 0.8); }
    // data garden
    for (const [gx, gy, gc, gn, gs] of [[330, 860, P.blue, 3, 1], [400, 920, P.yellow, 4, 1.1], [470, 960, '#ff9fd6', 3, 1], [350, 1010, P.blue, 3, 0.9], [540, 990, P.yellow, 2, 1], [280, 920, '#ff9fd6', 3, 0.9], [560, 870, P.blue, 4, 1.2], [450, 1040, P.green, 3, 1], [620, 1010, P.blue, 2, 0.8], [250, 860, P.yellow, 2, 0.8]]) dataPlant(gx, gy, gc, gn, gs);
    machine(680, 900, 'tank'); machine(260, 1040, 'fan'); terminal(680, 1000, 3); crate(620, 1060, 14, P.green, false, 0); bench(600, 880);
    lamp(300, 800, P.green); lamp(700, 1040, P.green); puddle(660, 960, 14, 5);
    // database
    serverUnit(1560, 500, NODES.database, { w: 22, h: 30, col: '#dfe3f5', top: '#6f78c8' }); serverUnit(1590, 560, NODES.database, { w: 22, h: 36, col: '#dfe3f5', top: '#6f78c8', dish: true });
    serverUnit(1320, 500, NODES.database, { w: 22, h: 28, col: '#dfe3f5', top: '#6f78c8' }); serverUnit(1290, 560, NODES.database, { w: 22, h: 34, col: '#dfe3f5', top: '#6f78c8' });
    terminal(1360, 640, 4); terminal(1520, 640, 4); crate(1600, 660, 16, P.blue, true, 1); crate(1280, 660, 14, P.crate, false, 2);
    machine(1660, 600, 'fan'); machine(1230, 620, 'piston'); lamp(1300, 700, P.purple); lamp(1580, 700, P.purple);
    cable(1320, 502, 1400, 560, P.metalDark); cable(1560, 502, 1480, 560, P.metalDark); cable(1360, 642, 1440, 590, P.metalDark); cable(1520, 642, 1440, 590, P.metalDark);
    bollard(1360, 720); bollard(1520, 720);
    // factory
    machine(1260, 900, 'piston'); machine(1500, 900, 'piston'); machine(1540, 980, 'fan'); machine(1220, 980, 'tank');
    crate(1300, 1030, 18, P.crate, true, 2); crate(1330, 1045, 14, P.orange, false, 0); crate(1460, 1030, 16, P.crate, false, 1); crate(1490, 1045, 16, P.crate, true, 2);
    terminal(1240, 1050, 3); lamp(1200, 880, P.orange); lamp(1570, 880, P.orange); bollard(1380, 1060); bollard(1440, 1060); bollard(1320, 1060);
    pipe(1260, 902, 1330, 930); pipe(1500, 902, 1430, 930); cable(1220, 982, 1330, 940); cable(1540, 982, 1430, 940);
    puddle(1400, 1010, 16, 6);
    // cloud
    machine(1300, 300, 'antenna'); machine(1500, 300, 'antenna'); serverUnit(1250, 260, NODES.cloud, { w: 20, h: 26, col: '#eef6fb', top: '#6fb9e6' }); serverUnit(1550, 260, NODES.cloud, { w: 20, h: 26, col: '#eef6fb', top: '#6fb9e6' });
    terminal(1400, 330, 2); crate(1620, 330, 14, P.blue, false, 1); lamp(1330, 350, P.blue); lamp(1470, 350, P.blue);
    // far corners: outposts
    serverUnit(120, 200, null, { w: 22, h: 30, dish: true }); crate(160, 220, 14); terminal(200, 180, 2); machine(90, 300, 'antenna');
    serverUnit(1700, 120, null, { w: 22, h: 28 }); machine(1730, 200, 'fan'); crate(1680, 160, 14, P.crate, true, 0);
    serverUnit(120, 1080, null, { w: 22, h: 28 }); dataPlant(180, 1100, P.yellow, 2); machine(160, 1020, 'fan');
    serverUnit(1700, 1080, null, { w: 24, h: 34, dish: true }); crate(1740, 1030, 16, P.crate, true, 1);
    // signs
    signs.push({ x: 700, y: 760, text: '← GARDEN' }, { x: 1130, y: 760, text: 'FACTORY →' }, { x: 640, y: 380, text: '↑ ROUTER HILL' }, { x: 1200, y: 380, text: 'CLOUD ↑' });

    // ---- HUB: plaza + console kiosk ----
    {
      const n = NODES.hub;
      addCollider(n.x - 22, n.y - 18, 44, 22);
      drawables.push({ y: n.y, draw(ctx, t) {
        ctx.fillStyle = 'rgba(40,30,20,.18)'; ctx.beginPath(); ctx.ellipse(n.x + 4, n.y + 2, 26, 8, 0, 0, Math.PI * 2); ctx.fill();
        box(ctx, n.x, n.y, 44, 14, 36, P.wall, P.roof, P.wallShade);
        fillRR(ctx, n.x - 16, n.y - 30, 32, 16, 3, '#22313f', P.ink, 2);
        ctx.fillStyle = '#5ad6ff'; for (let i = 0; i < 3; i++) ctx.fillRect(n.x - 12, n.y - 27 + i * 4, 10 + Math.sin(t * 3 + i) * 6, 2);
        ctx.fillStyle = P.orange; ctx.beginPath(); ctx.arc(n.x + 10, n.y - 25 + Math.sin(t * 4) * 1, 3, 0, Math.PI * 2); ctx.fill();
        label(ctx, n.x, n.y - 60, 'HUB', P.roofDark);
      } });
      signs.push({ x: n.x - 70, y: n.y + 50, text: '← SERVERS' }, { x: n.x + 80, y: n.y + 50, text: 'DATABASE →' }, { x: n.x + 60, y: n.y - 90, text: '↑ CORE' });
    }
    // ---- CORE ----
    {
      const n = NODES.core;
      addCollider(n.x - 70, n.y - 40, 140, 44);
      drawables.push({ y: n.y, draw(ctx, t, st) {
        const stab = st.coreStability, unstable = stab < 60, critical = stab < 30;
        const jx = critical ? (Math.random() - 0.5) * 4 : (unstable ? (Math.random() - 0.5) * 1.5 : 0);
        const cx = n.x + jx, cy = n.y;
        const orb = st.coreSaved ? P.green : stab > 70 ? '#5ad6ff' : stab > 40 ? P.orange : P.red;
        // base platform
        ctx.fillStyle = 'rgba(40,30,20,.2)'; ctx.beginPath(); ctx.ellipse(cx + 6, cy + 4, 90, 26, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2b4a55'; ctx.strokeStyle = P.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, cy, 80, 24, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#3d6b78'; ctx.beginPath(); ctx.ellipse(cx, cy - 6, 80, 24, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        // pillars
        for (const s of [-1, 1]) { box(ctx, cx + s * 58, cy - 4, 18, 8, 50, P.wall, P.roof, P.wallShade); ctx.fillStyle = orb; ctx.fillRect(cx + s * 58 - 4, cy - 40, 8, 4); }
        // central tower
        ctx.fillStyle = P.wall; ctx.strokeStyle = P.ink; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(cx - 40, cy - 8); ctx.lineTo(cx - 28, cy - 100); ctx.lineTo(cx + 28, cy - 100); ctx.lineTo(cx + 40, cy - 8); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = P.wallShade; ctx.beginPath(); ctx.moveTo(cx - 37, cy - 10); ctx.lineTo(cx - 26, cy - 98); ctx.lineTo(cx - 18, cy - 98); ctx.lineTo(cx - 28, cy - 10); ctx.closePath(); ctx.fill();
        // panels/lights
        for (let i = 0; i < 4; i++) { const k = Math.sin(t * 3 + i); ctx.fillStyle = k > 0 ? orb : '#22313f'; rr(ctx, cx - 14 + i * 8, cy - 40, 5, 12, 1.5); ctx.fill(); }
        // cracks when unstable
        if (unstable) { ctx.strokeStyle = critical ? P.red : P.purple; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 20, cy - 60); ctx.lineTo(cx - 10, cy - 75); ctx.lineTo(cx - 14, cy - 88); ctx.moveTo(cx + 22, cy - 30); ctx.lineTo(cx + 12, cy - 50); ctx.stroke(); }
        // orb
        const oy = cy - 128 + Math.sin(t * 2) * 4;
        const rad = 26 + (critical ? Math.sin(t * 25) * 4 : Math.sin(t * 3) * 2);
        const g = ctx.createRadialGradient(cx, oy, 4, cx, oy, rad + 20); g.addColorStop(0, orb); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, oy, rad + 20, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = orb; ctx.beginPath(); ctx.arc(cx, oy, rad, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(cx - 8, oy - 8, 7, 0, Math.PI * 2); ctx.fill();
        // rings
        const rs = st.coreSaved ? 1 : unstable ? 3 : 1;
        for (let i = 0; i < 2; i++) { ctx.strokeStyle = orb; ctx.lineWidth = 3; ctx.globalAlpha = .8; ctx.beginPath(); ctx.ellipse(cx, oy, rad + 14 + i * 8, (rad + 14 + i * 8) * 0.35, Math.sin(t * rs + i) * 0.4, 0, Math.PI * 2); ctx.stroke(); }
        ctx.globalAlpha = 1;
        if (critical) { ctx.fillStyle = P.glitch; for (let i = 0; i < 6; i++) ctx.fillRect(cx + (Math.random() - .5) * 120, oy + (Math.random() - .5) * 120, 5, 5); }
        label(ctx, cx, cy - 175, 'CORE SERVER', critical ? P.red : unstable ? P.orange : P.roofDark, P.cream, 12);
      } });
    }
    // ---- SERVER VILLAGE ----
    serverBuilding(270, 520, 'SERVER-01'); serverBuilding(370, 480, 'SERVER-02');
    serverBuilding(330, 640, 'SERVER-03', true); serverBuilding(450, 600, 'SERVER-04');
    signs.push({ x: 520, y: 690, text: 'SERVER VILLAGE' });
    // ---- ROUTER HILL ----
    {
      const n = NODES.router;
      tower(430, 220, 90, n); tower(520, 260, 70, n);
      // hill drawn under everything via groundExtras
      signs.push({ x: 560, y: 320, text: 'ROUTER HILL' });
      // router box
      addCollider(n.x - 18, n.y + 30, 36, 20);
      drawables.push({ y: n.y + 52, draw(ctx, t) {
        box(ctx, n.x, n.y + 52, 36, 10, 26, P.wall, P.roofDark, P.wallShade);
        for (let i = 0; i < 4; i++) { ctx.fillStyle = n.status === 'ok' ? (Math.sin(t * 5 + i) > 0 ? P.green : '#22313f') : (Math.sin(t * 12 + i) > 0 ? P.red : '#22313f'); ctx.fillRect(n.x - 12 + i * 7, n.y + 34, 4, 4); }
        label(ctx, n.x, n.y + 14, 'ROUTER-02', n.status === 'ok' ? P.ink : P.red);
      } });
    }
    // junction box on the servers→router cable
    {
      const e = EDGES.find(e => e.id === 'servers-router'); const m = bez(edgeCurve(e), 0.5);
      NODES.router.junction = m;
      drawables.push({ y: m.y + 14, draw(ctx, t) {
        box(ctx, m.x, m.y + 14, 30, 8, 20, P.wall, e.broken ? P.red : P.roofDark, P.wallShade);
        ctx.fillStyle = e.broken ? (Math.sin(t * 10) > 0 ? P.red : '#22313f') : P.green; ctx.fillRect(m.x - 4, m.y + 2, 8, 4);
      } });
    }
    // ---- DATA GARDEN ----
    tree(360, 900, 22, 0); tree(440, 860, 26, 1); tree(520, 930, 20, 2); tree(400, 990, 24, 1); tree(300, 960, 18, 2); tree(490, 1010, 20, 0);
    signs.push({ x: 560, y: 1050, text: 'DATA GARDEN' });
    // ---- DATABASE ----
    {
      const n = NODES.database;
      addCollider(n.x - 48, n.y - 30, 96, 34);
      drawables.push({ y: n.y, draw(ctx, t) {
        const st = n.status; const tint = statusTint(st);
        ctx.fillStyle = 'rgba(40,30,20,.2)'; ctx.beginPath(); ctx.ellipse(n.x + 6, n.y + 3, 56, 16, 0, 0, Math.PI * 2); ctx.fill();
        const cols = st === 'corrupted' ? ['#6b4a9c', '#8b5fd6'] : st === 'offline' ? ['#6f7c8a', '#8d99a8'] : ['#6f78c8', '#8f9ae0'];
        for (let i = 0; i < 3; i++) {
          const yy = n.y - i * 30; ctx.strokeStyle = P.ink; ctx.lineWidth = 2.5;
          ctx.fillStyle = cols[0]; rr(ctx, n.x - 46, yy - 30, 92, 30, 6); ctx.fill(); ctx.stroke();
          ctx.fillStyle = cols[1]; ctx.beginPath(); ctx.ellipse(n.x, yy - 30, 46, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          for (let k = 0; k < 5; k++) { ctx.fillStyle = Math.sin(t * 3 + k + i) > 0 ? tint.win : '#22313f'; ctx.fillRect(n.x - 34 + k * 15, yy - 16, 8, 4); }
        }
        // floating data particles
        for (let i = 0; i < 8; i++) { const a = t * 1.2 + i * 0.8; const r = 60 + Math.sin(t + i) * 8; ctx.fillStyle = st === 'corrupted' ? P.glitch : [P.blue, P.yellow, '#fff'][i % 3]; ctx.globalAlpha = .9; ctx.fillRect(n.x + Math.cos(a) * r - 3, n.y - 60 + Math.sin(a) * r * 0.4 - 3 + Math.sin(t * 2 + i) * 6, 6, 6); }
        ctx.globalAlpha = 1;
        label(ctx, n.x, n.y - 130, 'DATABASE', st === 'ok' ? P.ink : P.red);
      } });
    }
    // ---- FACTORY ----
    {
      const n = NODES.factory;
      addCollider(n.x - 60, n.y - 34, 120, 38);
      drawables.push({ y: n.y, draw(ctx, t) {
        const st = n.status;
        ctx.fillStyle = 'rgba(40,30,20,.2)'; ctx.beginPath(); ctx.ellipse(n.x + 8, n.y + 3, 70, 18, 0, 0, Math.PI * 2); ctx.fill();
        box(ctx, n.x, n.y, 120, 22, 60, st === 'offline' ? '#a89c85' : '#e9d3b3', st === 'offline' ? '#4d6664' : P.orange, P.wallShade);
        // sawtooth roof
        ctx.fillStyle = P.roofDark; ctx.beginPath(); for (let i = 0; i < 4; i++) { const x0 = n.x - 60 + i * 30; ctx.moveTo(x0, n.y - 82); ctx.lineTo(x0 + 30, n.y - 82); ctx.lineTo(x0 + 30, n.y - 98); } ctx.fill();
        // chimney + smoke
        box(ctx, n.x + 38, n.y - 82, 16, 6, 30, P.wall, P.roofDark);
        if (st !== 'offline') for (let i = 0; i < 4; i++) { const p = (t * 0.5 + i / 4) % 1; ctx.fillStyle = st === 'corrupted' ? P.glitch : 'rgba(255,255,255,.8)'; ctx.globalAlpha = 1 - p; ctx.fillRect(n.x + 34 + Math.sin(p * 6) * 6, n.y - 120 - p * 50, 8 + p * 10, 8 + p * 10); }
        ctx.globalAlpha = 1;
        // gear
        const gx = n.x - 30, gy = n.y - 40; ctx.save(); ctx.translate(gx, gy); ctx.rotate(st === 'ok' ? t * 2 : 0);
        ctx.fillStyle = '#8d99a8'; ctx.strokeStyle = P.ink; ctx.lineWidth = 2; for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.fillRect(-4, -18, 8, 8); }
        ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = P.yellow; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        // conveyor
        fillRR(ctx, n.x - 10, n.y - 24, 66, 12, 4, '#3b4452', P.ink, 2);
        for (let i = 0; i < 4; i++) { const p = st === 'ok' ? ((t * 0.6 + i / 4) % 1) : i / 4; ctx.fillStyle = [P.blue, P.yellow, P.green, P.orange][i]; ctx.fillRect(n.x - 8 + p * 56, n.y - 32, 8, 8); ctx.strokeRect(n.x - 8 + p * 56, n.y - 32, 8, 8); }
        windows(ctx, n.x - 52, n.y - 56, 3, 1, 14, 12, t, n, 3);
        label(ctx, n.x, n.y - 125, 'FACTORY', st === 'ok' ? P.ink : P.red);
      } });
    }
    // ---- CLOUD ----
    {
      const n = NODES.cloud;
      addCollider(n.x - 50, n.y - 26, 100, 30);
      drawables.push({ y: n.y, draw(ctx, t) {
        const st = n.status; const bob = Math.sin(t * 1.5) * 6;
        ctx.fillStyle = 'rgba(40,30,20,.15)'; ctx.beginPath(); ctx.ellipse(n.x, n.y + 2, 60 - bob, 16 - bob * 0.3, 0, 0, Math.PI * 2); ctx.fill();
        const col = st === 'corrupted' ? '#c9a8f0' : st === 'offline' ? '#c4ccd3' : '#f4fbff';
        for (const [ox, oy, r] of [[-40, -30, 22], [-10, -44, 30], [30, -34, 24], [0, -26, 26]]) {
          ctx.fillStyle = col; ctx.strokeStyle = P.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(n.x + ox, n.y + oy + bob, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
        ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(n.x, n.y - 14 + bob, 68, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        // little platform houses
        fillRR(ctx, n.x - 24, n.y - 60 + bob, 20, 22, 4, P.blue, P.ink, 2); fillRR(ctx, n.x + 10, n.y - 66 + bob, 22, 28, 4, P.roof, P.ink, 2);
        windows(ctx, n.x - 20, n.y - 55 + bob, 1, 1, 0, 0, t, n, 5); windows(ctx, n.x + 15, n.y - 60 + bob, 1, 2, 0, 11, t, n, 6);
        // rain of data when ok
        if (st === 'ok') for (let i = 0; i < 6; i++) { const p = (t * 0.8 + i / 6) % 1; ctx.fillStyle = P.blue; ctx.globalAlpha = 1 - p; ctx.fillRect(n.x - 50 + i * 20, n.y - 10 + bob + p * 40, 3, 8); }
        ctx.globalAlpha = 1;
        label(ctx, n.x, n.y - 110 + bob, 'CLOUD', st === 'ok' ? P.ink : P.red);
      } });
    }
    // signs
    for (const s of signs) {
      drawables.push({ y: s.y, draw(ctx) {
        ctx.strokeStyle = P.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x, s.y - 22); ctx.stroke();
        label(ctx, s.x, s.y - 30, s.text, P.wall, P.ink, 10);
      } });
    }
    // bushes & cubes as drawables
    for (const b of bushes) drawables.push({ y: b.y, draw(ctx, t) {
      ctx.fillStyle = P.grass2; ctx.strokeStyle = P.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y - b.r * 0.6, b.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c9e8b0'; ctx.fillRect(b.x - b.r * 0.4, b.y - b.r * 1.1, 4, 4);
    } });
    for (const c of cubes) drawables.push({ y: c.y, draw(ctx, t) {
      const hov = Math.sin(t * 2 + c.x) * 3;
      ctx.fillStyle = 'rgba(40,30,20,.15)'; ctx.beginPath(); ctx.ellipse(c.x, c.y, c.s * 0.8, c.s * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      fillRR(ctx, c.x - c.s / 2, c.y - c.s - 6 + hov, c.s, c.s, 2, c.c, P.ink, 1.5);
    } });
  }

  // ---------- rendering ----------
  function drawGround(ctx, t) {
    ctx.fillStyle = P.ground; ctx.fillRect(0, 0, W, H);
    // subtle texture dots
    ctx.fillStyle = 'rgba(0,0,0,.03)';
    for (let x = 0; x < W; x += 40) for (let y = 0; y < H; y += 40) ctx.fillRect(x + ((y / 40) % 2) * 20, y, 6, 6);
    for (const g of grassPatches) { ctx.fillStyle = g.c; ctx.beginPath(); ctx.ellipse(g.x, g.y, g.rx, g.ry, 0, 0, Math.PI * 2); ctx.fill(); }
    // etched circuit traces
    ctx.strokeStyle = P.trace; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const tr of traces) { ctx.beginPath(); tr.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke(); ctx.fillStyle = P.trace; for (const p of tr) { ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); ctx.fill(); } }
    ctx.fillStyle = 'rgba(44,62,80,.12)'; for (const pb of pebbles) { ctx.beginPath(); ctx.ellipse(pb.x, pb.y, pb.r, pb.r * 0.6, 0, 0, Math.PI * 2); ctx.fill(); }
    // router hill mound
    ctx.fillStyle = P.grass2; ctx.strokeStyle = 'rgba(44,62,80,.35)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(470, 270, 170, 90, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = P.grass; ctx.beginPath(); ctx.ellipse(470, 250, 120, 60, 0, 0, Math.PI * 2); ctx.fill();
    // garden pond (data pool)
    ctx.fillStyle = P.water; ctx.beginPath(); ctx.ellipse(610, 940, 70, 34, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 3; i++) ctx.fillRect(580 + i * 20 + Math.sin(t + i) * 8, 930 + i * 9, 18, 3);
    ctx.fillStyle = '#c8e6b0'; ctx.beginPath(); ctx.ellipse(430, 940, 150, 80, 0, 0, Math.PI * 2); ctx.fill();
    // hub plaza
    ctx.fillStyle = '#d9c9a2'; ctx.beginPath(); ctx.ellipse(900, 640, 150, 85, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(44,62,80,.12)'; ctx.lineWidth = 1.5; for (let r = 40; r < 150; r += 36) { ctx.beginPath(); ctx.ellipse(900, 640, r, r * 0.57, 0, 0, Math.PI * 2); ctx.stroke(); }
    // cloud platform ground
    ctx.fillStyle = '#e3eef4'; ctx.beginPath(); ctx.ellipse(1400, 250, 130, 60, 0, 0, Math.PI * 2); ctx.fill();
    // factory yard
    ctx.fillStyle = '#d6c4a4'; ctx.beginPath(); ctx.ellipse(1380, 940, 150, 75, 0, 0, Math.PI * 2); ctx.fill();
    // flowers
    for (const f of flowers) {
      ctx.fillStyle = f.c; for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + t * 0.5; ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * f.s, f.y + Math.sin(a) * f.s, f.s * 0.7, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(f.x, f.y, f.s * 0.5, 0, Math.PI * 2); ctx.fill();
    }
    // ground puddles
    for (const d of groundProps) d.draw(ctx, t);
    // ground cables / pipes between props, with little data blips
    for (const c of groundCables) {
      const mx = (c.x0 + c.x1) / 2, my = (c.y0 + c.y1) / 2 + 14;
      ctx.lineCap = 'round'; ctx.strokeStyle = P.ink; ctx.lineWidth = c.thick ? 7 : 4; ctx.beginPath(); ctx.moveTo(c.x0, c.y0); ctx.quadraticCurveTo(mx, my, c.x1, c.y1); ctx.stroke();
      ctx.strokeStyle = c.thick ? P.metal : (c.col || P.metalDark); ctx.lineWidth = c.thick ? 4 : 2; ctx.beginPath(); ctx.moveTo(c.x0, c.y0); ctx.quadraticCurveTo(mx, my, c.x1, c.y1); ctx.stroke();
      const p = (t * c.speed + c.phase) % 1, u = 1 - p;
      const bx = u * u * c.x0 + 2 * u * p * mx + p * p * c.x1, by = u * u * c.y0 + 2 * u * p * my + p * p * c.y1;
      ctx.fillStyle = c.thick ? P.yellow : '#5ad6ff'; ctx.fillRect(bx - 2, by - 2, 4, 4);
    }
    // diorama edge
    ctx.strokeStyle = '#8b7a58'; ctx.lineWidth = 12; ctx.strokeRect(0, 0, W, H);
  }
  function drawEdges(ctx, t, dt) {
    for (const e of EDGES) {
      const c = edgeCurve(e); const status = edgeStatus(e);
      const col = status === 'ok' ? P.path : status === 'damaged' ? P.orange : status === 'broken' ? '#9a8f7a' : P.glitch;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(44,62,80,.45)'; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(c.x0, c.y0); ctx.quadraticCurveTo(c.cx, c.cy, c.x1, c.y1); ctx.stroke();
      ctx.strokeStyle = col; ctx.lineWidth = 9;
      if (status === 'broken') ctx.setLineDash([14, 12]);
      if (status === 'corrupted') ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(c.x0, c.y0); ctx.quadraticCurveTo(c.cx, c.cy, c.x1, c.y1); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(c.x0, c.y0); ctx.quadraticCurveTo(c.cx, c.cy, c.x1, c.y1); ctx.stroke();
      // packets
      if (status === 'ok' || status === 'damaged' || status === 'corrupted') {
        const speed = status === 'damaged' ? 0.12 : 0.3;
        for (let i = 0; i < e.packets.length; i++) {
          e.packets[i] = (e.packets[i] + dt * speed) % 1;
          if (status === 'damaged' && i > 1) continue;
          const p = bez(c, e.packets[i]);
          const jitter = status === 'corrupted' ? (Math.random() - .5) * 8 : 0;
          ctx.fillStyle = status === 'corrupted' ? (Math.random() > .5 ? P.glitch : '#5ad6ff') : (status === 'damaged' ? P.yellow : '#fff');
          ctx.strokeStyle = P.ink; ctx.lineWidth = 1.5;
          rr(ctx, p.x - 5 + jitter, p.y - 5 + jitter, 10, 10, 3); ctx.fill(); ctx.stroke();
        }
      }
      if (status === 'broken') { // spark at midpoint
        const m = bez(c, 0.5); ctx.fillStyle = P.yellow; if (Math.sin(t * 20) > 0) { ctx.fillRect(m.x - 3, m.y - 10, 6, 6); ctx.fillRect(m.x + 6, m.y - 4, 4, 4); }
      }
    }
  }
  function updateAmbient(t, dt) {
    for (const b of miniBots) {
      b.x += b.dir * 30 * dt; if (b.x > b.maxX) b.dir = -1; if (b.x < b.minX) b.dir = 1;
    }
    for (const g of tinyGlitches) { g.x = g.cx + Math.cos(t * 0.6 + g.seed * 2) * 36; g.y = g.cy + Math.sin(t * 0.9 + g.seed) * 18; }
  }
  function drawAmbient(ctx, t) {
    // drifting data motes
    for (const m of motes) {
      const p = (t * 0.18 + m.seed) % 1; const x = m.x + Math.sin(t * 0.8 + m.seed) * 10, y = m.y - p * 70;
      ctx.globalAlpha = Math.sin(p * Math.PI) * 0.85; ctx.fillStyle = m.col; ctx.fillRect(x - 2, y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;
    for (const b of butterflies) {
      const x = b.x + Math.sin(t * 0.7 + b.seed) * 60, y = b.y + Math.cos(t * 0.9 + b.seed) * 30 - 30;
      const flap = Math.abs(Math.sin(t * 12 + b.seed)) * 5 + 2;
      ctx.fillStyle = b.color; ctx.fillRect(x - flap - 2, y - 3, flap, 5); ctx.fillRect(x + 2, y - 3, flap, 5);
      ctx.fillStyle = P.ink; ctx.fillRect(x - 1, y - 3, 2, 6);
    }
  }
  function collide(x, y, r) {
    for (const c of colliders) if (x + r > c.x && x - r < c.x + c.w && y + r > c.y && y - r < c.y + c.h) return true;
    return x - r < 8 || y - r < 8 || x + r > W - 8 || y + r > H - 8;
  }
  return { W, H, P, NODES, EDGES, drawables, miniBots, npcs, tinyGlitches, build, drawGround, drawEdges, drawAmbient, updateAmbient, collide, edgeCurve, bez, edgeStatus, label, warnIcon, statusTint };
})();
