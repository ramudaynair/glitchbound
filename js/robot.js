// The Network Keeper — procedurally drawn robot with expressions.
// Illustrated look: round cream head, big glowing lens eyes, digital mouth, teal utility coat, backpack, chunky limbs.
const Robot = (() => {
  const C = {
    cream: '#f4ecd8', creamDark: '#d9cbb0', creamLight: '#fffaf0', ink: '#2c3e50', teal: '#2e9c95', tealDark: '#1f6f6a',
    tealLight: '#5fc0b8', orange: '#f29a3c', orangeDark: '#c9741f', yellow: '#f5c84c', eye: '#5ad6ff', eyeGlow: 'rgba(90,214,255,.5)',
    eyeRim: '#1b2a4a', eyeIris: '#2f7de1', eyeCore: '#7fdcff', dark: '#3b4452', metal: '#8d99a8', screen: '#12191f', brown: '#a9713a', joint: '#4a5568'
  };
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function fillRR(ctx, x, y, w, h, r, fill, stroke, lw = 2) {
    rr(ctx, x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  }
  function circ(ctx, x, y, r, fill, stroke, lw = 2) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  }
  function joint(ctx, x, y, r, lit) {
    circ(ctx, x, y, r, C.joint, C.ink, 1.5);
    circ(ctx, x, y, r * 0.45, lit ? C.eye : C.metal);
  }
  // Limb segment: chunky rounded capsule with outline.
  function segment(ctx, x0, y0, x1, y1, w, col) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = C.ink; ctx.lineWidth = w + 3; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }

  // state: {x,y,scale,facing(1|-1),expr,walk(0..),moving,t,blink(0..1),speed}
  function draw(ctx, s) {
    const { x, y } = s; const sc = s.scale || 1; const t = s.t || 0; const expr = s.expr || 'idle';
    const facing = s.facing || 1;
    const moving = s.moving; const walk = s.walk || 0;
    const step = moving ? Math.sin(walk) : 0;
    const bob = moving ? Math.abs(Math.cos(walk)) * 3 : Math.sin(t * 2) * 1.2;
    const celebrate = expr === 'celebrating';
    const panic = expr === 'panicking';
    const repairing = expr === 'repairing';
    const interacting = expr === 'interacting';
    const jump = celebrate ? Math.abs(Math.sin(t * 6)) * 8 : 0;
    const shake = panic ? Math.sin(t * 40) * 1.5 : 0;

    ctx.save(); ctx.translate(x + shake, y); ctx.scale(sc, sc);
    // shadow
    ctx.fillStyle = 'rgba(40,30,20,.22)'; ctx.beginPath(); ctx.ellipse(0, 2, 22 - jump * 0.5, 7 - jump * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.translate(0, -jump);
    ctx.scale(facing, 1);

    // ---- legs (chunky, jointed) ----
    const legL = step * 7, legR = -step * 7;
    const liftL = Math.max(0, step) * 4, liftR = Math.max(0, -step) * 4;
    for (const [lx, lo, lift] of [[-8, legL, liftL], [8, legR, liftR]]) {
      const kx = lx + lo * 0.5, ky = -18 - lift;
      // thigh
      segment(ctx, lx, -32 - bob * 0.3, kx, ky, 9, C.cream);
      // shin
      segment(ctx, kx, ky, lx + lo, -7 - lift, 8, C.cream);
      ctx.fillStyle = C.creamDark; ctx.fillRect(kx - 1.5, ky + 3, 3, 6);
      joint(ctx, kx, ky, 4, true);
      // boot
      fillRR(ctx, lx - 7 + lo, -9 - lift, 15, 9, 4, C.cream, C.ink, 1.8);
      fillRR(ctx, lx - 7 + lo, -3 - lift, 15, 3.5, 1.5, C.dark, C.ink, 1.2);
      ctx.fillStyle = C.orange; ctx.fillRect(lx - 4 + lo, -7 - lift, 5, 2);
    }
    // hips
    fillRR(ctx, -13, -38 - bob * 0.5, 26, 9, 4, C.dark, C.ink, 2);
    ctx.fillStyle = C.orange; ctx.fillRect(-10, -36 - bob * 0.5, 20, 2);

    // ---- backpack (behind torso, on the back side) ----
    fillRR(ctx, -33, -76 - bob, 17, 32, 5, C.orange, C.ink, 2);
    fillRR(ctx, -31, -73 - bob, 13, 13, 2.5, C.screen, C.ink, 1.5);
    ctx.fillStyle = C.eye; ctx.fillRect(-29, -70 - bob, 2, 2); ctx.fillRect(-23, -70 - bob, 2, 2); ctx.fillRect(-28, -66 - bob, 6, 2);
    fillRR(ctx, -31, -56 - bob, 13, 7, 2, C.orangeDark, C.ink, 1.2);
    ctx.fillStyle = C.yellow; ctx.fillRect(-30, -54 - bob, 3, 3);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-27, -78 - bob); ctx.lineTo(-24, -82 - bob); ctx.lineTo(-20, -78 - bob); ctx.stroke(); // handle
    ctx.strokeStyle = C.dark; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-18, -70 - bob); ctx.lineTo(-10, -66 - bob); ctx.stroke(); // strap

    // ---- hood (behind head) ----
    fillRR(ctx, -19, -80 - bob, 38, 16, 8, C.teal, C.ink, 2);
    ctx.fillStyle = C.tealDark; rr(ctx, -15, -77 - bob, 30, 9, 5); ctx.fill();

    // ---- torso core ----
    fillRR(ctx, -15, -68 - bob, 30, 34, 8, C.cream, C.ink, 2.2);
    ctx.fillStyle = C.creamDark; ctx.fillRect(-13, -40 - bob, 26, 4);
    // chest screen
    fillRR(ctx, -8, -62 - bob, 16, 14, 3, '#3a6fd8', C.ink, 1.8);
    ctx.fillStyle = C.eyeCore;
    // pixel cat icon
    ctx.fillRect(-5, -59 - bob, 2, 2); ctx.fillRect(3, -59 - bob, 2, 2);
    ctx.fillRect(-4, -57 - bob, 8, 5);
    ctx.fillStyle = '#3a6fd8'; ctx.fillRect(-2, -55 - bob, 1.5, 1.5); ctx.fillRect(0.5, -55 - bob, 1.5, 1.5);
    if (Math.sin(t * 5) > 0.9) { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-8, -62 - bob + ((t * 30) % 14), 16, 2); }
    // belt/utility strap
    fillRR(ctx, -15, -44 - bob, 30, 4, 1.5, C.dark, C.ink, 1.2);
    // ---- jacket panels (open coat) ----
    for (const side of [-1, 1]) {
      ctx.save(); ctx.scale(side, 1);
      ctx.fillStyle = C.teal; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-19, -70 - bob); ctx.quadraticCurveTo(-21, -52 - bob, -20, -33 - bob);
      ctx.lineTo(-10, -33 - bob); ctx.quadraticCurveTo(-7, -50 - bob, -8, -64 - bob);
      ctx.quadraticCurveTo(-12, -70 - bob, -19, -70 - bob); ctx.closePath(); ctx.fill(); ctx.stroke();
      // inner shade
      ctx.fillStyle = C.tealDark; ctx.beginPath(); ctx.moveTo(-9, -60 - bob); ctx.quadraticCurveTo(-8, -48 - bob, -11, -35 - bob); ctx.lineTo(-13, -35 - bob); ctx.quadraticCurveTo(-11, -48 - bob, -11, -60 - bob); ctx.closePath(); ctx.fill();
      // seam highlight
      ctx.strokeStyle = C.tealLight; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-17, -64 - bob); ctx.quadraticCurveTo(-18, -50 - bob, -17, -38 - bob); ctx.stroke();
      // pocket
      fillRR(ctx, -18, -46 - bob, 7, 6, 1.5, C.tealDark, C.ink, 1.2);
      // shoulder pad
      fillRR(ctx, -22, -72 - bob, 12, 9, 4, C.tealLight, C.ink, 1.8);
      ctx.restore();
    }
    // utility case on hip (front side) + ID badge
    fillRR(ctx, 12, -47 - bob, 11, 13, 3, C.orange, C.ink, 1.8);
    ctx.fillStyle = C.yellow; ctx.fillRect(13, -46 - bob, 9, 2);
    ctx.fillStyle = C.cream; ctx.fillRect(15, -41 - bob, 5, 4); ctx.fillRect(15, -42 - bob, 1.5, 1.5); ctx.fillRect(18.5, -42 - bob, 1.5, 1.5);
    fillRR(ctx, -13, -50 - bob + Math.sin(t * 3) * 0.6, 6, 8, 1.5, C.creamLight, C.ink, 1.2);
    ctx.fillStyle = C.eye; ctx.fillRect(-11.5, -48 - bob + Math.sin(t * 3) * 0.6, 3, 3);
    // neck (mesh)
    fillRR(ctx, -5, -76 - bob, 10, 10, 3, C.dark, C.ink, 1.5);
    ctx.fillStyle = C.joint; ctx.fillRect(-3, -74 - bob, 2, 2); ctx.fillRect(1, -74 - bob, 2, 2); ctx.fillRect(-1, -71 - bob, 2, 2);

    // ---- arms (two segments) ----
    const swing = moving ? step * 10 : Math.sin(t * 2) * 2;
    const armUp = celebrate || panic;
    const tool = repairing || interacting;
    for (const side of [-1, 1]) {
      const sx = side * 19, sy = -64 - bob;
      let a1, a2; // upper arm angle (from down), forearm bend
      if (armUp) { a1 = side * (celebrate ? -2.5 + Math.sin(t * 8 + side) * 0.3 : -2.3 + Math.sin(t * 30) * 0.2); a2 = side * -0.4; }
      else if (tool && side === 1) { a1 = repairing ? -1.1 + Math.sin(t * 14) * 0.5 : -1.3; a2 = repairing ? -0.9 : -1.4; }
      else if (tool && side === -1) { a1 = 0.9; a2 = 1.3; }
      else { a1 = side * 0.12 + swing * side * 0.06; a2 = swing * side * 0.04 + (expr === 'concerned' ? side * 0.3 : 0); }
      const L1 = 12, L2 = 12;
      const ex = sx + Math.sin(a1) * L1, ey = sy + Math.cos(a1) * L1;
      const hx = ex + Math.sin(a1 + a2) * L2, hy = ey + Math.cos(a1 + a2) * L2;
      segment(ctx, sx, sy, ex, ey, 8, C.teal);
      segment(ctx, ex, ey, hx, hy, 7, C.cream);
      joint(ctx, ex, ey, 3.6, false);
      // hand: dark mitt with fingers
      circ(ctx, hx, hy, 5, C.dark, C.ink, 1.6);
      ctx.fillStyle = C.joint; ctx.fillRect(hx - 4, hy + 1, 2.5, 3); ctx.fillRect(hx - 1, hy + 2, 2.5, 3); ctx.fillRect(hx + 2, hy + 1, 2.5, 3);
      // cuff
      circ(ctx, ex + Math.sin(a1 + a2) * 3, ey + Math.cos(a1 + a2) * 3, 4.6, C.tealLight, C.ink, 1.4);
      if (repairing && side === 1) { // wrench
        ctx.save(); ctx.translate(hx, hy); ctx.rotate(a1 + a2 + 0.5);
        fillRR(ctx, -2, -16, 4, 18, 1.5, C.orange, C.ink, 1.2); fillRR(ctx, -5.5, -21, 11, 7, 2.5, C.metal, C.ink, 1.2);
        ctx.fillStyle = C.ink; ctx.fillRect(-1.5, -21, 3, 3);
        ctx.restore();
        if (Math.sin(t * 14) > 0.85) { ctx.fillStyle = C.yellow; ctx.fillRect(hx + 6, hy - 14, 3, 3); ctx.fillRect(hx + 10, hy - 9, 2, 2); }
      }
      if (interacting && side === 1) { // tablet
        ctx.save(); ctx.translate(hx - 2, hy - 6); ctx.rotate(-0.3);
        fillRR(ctx, -9, -6, 18, 13, 2.5, C.dark, C.ink, 1.5); fillRR(ctx, -7, -4, 14, 9, 1.5, '#3a6fd8', null);
        ctx.fillStyle = C.eyeCore; for (let i = 0; i < 3; i++) ctx.fillRect(-5, -2 + i * 2.5, 4 + Math.sin(t * 4 + i) * 3 + 3, 1.2);
        ctx.restore();
      }
    }

    // ---- head ----
    const hy = -96 - bob; const tilt = moving ? step * 0.04 : (expr === 'concerned' ? 0.1 : expr === 'happy' ? -0.06 : 0);
    ctx.save(); ctx.translate(0, hy + 14); ctx.rotate(tilt); ctx.translate(0, -(hy + 14));
    drawHead(ctx, 0, hy, expr, t, s.blink || 0, s.lookX || 0, moving ? -step * 0.35 : 0);
    ctx.restore();
    // exclamation for surprised
    if (expr === 'surprised') {
      ctx.fillStyle = C.orange; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
      const k = 1 + Math.sin(t * 12) * 0.08;
      ctx.save(); ctx.translate(22, hy - 22); ctx.scale(k, k); ctx.rotate(0.2);
      rr(ctx, -2.5, -12, 5, 10, 2); ctx.fill(); ctx.stroke(); rr(ctx, -2.5, 1, 5, 4, 2); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    ctx.restore();
  }

  // Full head drawn around (cx, cy) = head center. antSway: antenna lean.
  function drawHead(ctx, cx, cy, expr, t, blink, lookX, antSway = 0) {
    const panic = expr === 'panicking';
    const R = 24;
    // antenna
    const sway = antSway || Math.sin(t * 3) * 0.12;
    const ax = cx + 6, ay = cy - R + 2;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + Math.sin(sway) * 9, ay - 11); ctx.stroke();
    ctx.strokeStyle = C.metal; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + Math.sin(sway) * 9, ay - 11); ctx.stroke();
    const ballCol = panic ? '#ff6b5a' : C.orange;
    ctx.save(); ctx.shadowColor = ballCol; ctx.shadowBlur = 8;
    circ(ctx, ax + Math.sin(sway) * 9, ay - 13, 3.6 + (panic ? Math.sin(t * 20) : Math.sin(t * 4) * 0.3), ballCol, C.ink, 1.5);
    ctx.restore();
    // ear discs
    for (const side of [-1, 1]) {
      circ(ctx, cx + side * (R - 1), cy + 1, 7, C.cream, C.ink, 2);
      ctx.strokeStyle = C.eyeIris; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(cx + side * (R - 1), cy + 1, 3.8, 0, Math.PI * 2); ctx.stroke();
      circ(ctx, cx + side * (R - 1), cy + 1, 1.6, C.eye);
    }
    // skull
    ctx.beginPath(); ctx.ellipse(cx, cy, R, R - 1.5, 0, 0, Math.PI * 2); ctx.fillStyle = C.cream; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2.4; ctx.stroke();
    // lower shade + top highlight
    ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, R - 1.2, R - 2.7, 0, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = C.creamDark; ctx.beginPath(); ctx.ellipse(cx + 2, cy + 14, R + 4, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(cx - 9, cy - 15, 8, 3.5, -0.4, 0, Math.PI * 2); ctx.fill();
    // panel seam
    ctx.strokeStyle = 'rgba(44,62,80,.35)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(cx, cy + 6, R - 5, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    // screws / scuffs
    ctx.fillStyle = 'rgba(44,62,80,.4)'; ctx.fillRect(cx - 14, cy + 16, 1.8, 1.8); ctx.fillRect(cx + 12, cy - 12, 1.8, 1.8); ctx.fillRect(cx - 17, cy - 9, 3, 1.4);
    ctx.restore();
    // face
    drawFace(ctx, cx, cy, expr, t, blink, lookX);
  }

  function drawFace(ctx, cx, cy, expr, t, blink, lookX) {
    const panic = expr === 'panicking';
    const happy = expr === 'happy' || expr === 'celebrating';
    const eyeDX = 9.5, eyeY = cy - 3;
    let eyeR = 7.2;
    if (expr === 'surprised' || panic) eyeR = 8.2;
    if (expr === 'repairing' || expr === 'interacting') eyeR = 6.8;
    const bl = Math.max(0.08, 1 - blink);
    const lx = lookX * 1.4;
    for (const side of [-1, 1]) {
      const ex = cx + side * eyeDX + (panic ? Math.sin(t * 25 + side) * 1 : 0);
      ctx.save(); ctx.translate(ex, eyeY); ctx.scale(1, bl);
      // rim + glow
      ctx.save(); ctx.shadowColor = C.eye; ctx.shadowBlur = 10; circ(ctx, 0, 0, eyeR, C.eyeRim, C.ink, 1.6); ctx.restore();
      // iris with soft glow gradient, dark pupil, highlight
      const g = ctx.createRadialGradient(lx * 0.6, 0.6, 0.5, 0, 0, eyeR - 1.6);
      g.addColorStop(0, panic ? '#ffd27a' : C.eyeCore); g.addColorStop(0.55, panic ? '#ffb15a' : '#3f8ff0'); g.addColorStop(1, panic ? '#ff8a3a' : C.eyeIris);
      circ(ctx, 0, 0, eyeR - 1.6, g);
      circ(ctx, lx * 0.8, 0.8, eyeR * 0.36, panic ? '#c85a1a' : '#173f8f');
      circ(ctx, -eyeR * 0.38 + lx * 0.3, -eyeR * 0.42, 1.9, 'rgba(255,255,255,.95)');
      circ(ctx, eyeR * 0.3 + lx * 0.3, eyeR * 0.35, 1, 'rgba(255,255,255,.6)');
      ctx.restore();
      // lids (expressions) — cream shapes that partially cover the lens
      ctx.fillStyle = C.cream; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6;
      if (happy) { // lower lid pushed up: smiling eyes
        ctx.beginPath(); ctx.ellipse(ex, eyeY + eyeR * 0.8, eyeR + 1.8, eyeR * 0.75, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.ellipse(ex, eyeY + eyeR * 0.8, eyeR + 1.2, eyeR * 0.75, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
      } else if (expr === 'concerned') { // upper lids sloped inward
        ctx.save(); ctx.translate(ex, eyeY - eyeR * 0.55); ctx.rotate(side * -0.35);
        ctx.beginPath(); ctx.ellipse(0, 0, eyeR + 1.8, eyeR * 0.6, 0, Math.PI, 0, true); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0, 0, eyeR + 1.2, eyeR * 0.6, 0, Math.PI * 1.08, Math.PI * 1.92, true); ctx.stroke(); ctx.restore();
      } else if (expr === 'repairing' || expr === 'interacting') { // focused: flat upper lids
        ctx.beginPath(); ctx.ellipse(ex, eyeY - eyeR * 0.75, eyeR + 1.8, eyeR * 0.5, 0, Math.PI, 0, true); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.ellipse(ex, eyeY - eyeR * 0.75, eyeR + 1.2, eyeR * 0.5, 0, Math.PI * 1.08, Math.PI * 1.92, true); ctx.stroke();
      }
    }
    // digital mouth screen
    const my = cy + 9;
    fillRR(ctx, cx - 9.5, my - 4, 19, 8, 3, C.screen, C.ink, 1.6);
    ctx.save(); rr(ctx, cx - 9.5, my - 4, 19, 8, 3); ctx.clip();
    ctx.fillStyle = C.eye; ctx.strokeStyle = C.eye; ctx.lineWidth = 1.5;
    if (happy) { ctx.beginPath(); ctx.arc(cx, my - 2.5, 4, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
    else if (expr === 'surprised') { ctx.beginPath(); ctx.ellipse(cx, my, 2.4, 2.8, 0, 0, Math.PI * 2); ctx.fill(); }
    else if (expr === 'concerned' || panic) { for (let i = -2; i <= 2; i++) ctx.fillRect(cx + i * 2.2 - 1, my - 1 + (i % 2 ? -1.2 : 0.6) + (panic ? Math.sin(t * 20 + i) : 0), 1.8, 1.6); }
    else if (expr === 'repairing' || expr === 'interacting') { ctx.fillRect(cx - 3.5, my - 0.7, 7, 1.6); ctx.fillRect(cx + 4.5, my - 2.2, 1.8, 1.8); }
    else { const talk = Math.sin(t * 9) > 0.5 ? 2.4 : 1.6; ctx.fillRect(cx - 3.5, my - 0.8, 7, talk); }
    ctx.restore();
  }

  // Big head portrait for the HUD
  function drawPortrait(ctx, w, h, expr, t, blink) {
    ctx.clearRect(0, 0, w, h);
    ctx.save(); ctx.translate(w / 2, h / 2 + 8); ctx.scale(1.15, 1.15);
    // collar peek
    fillRR(ctx, -18, 14, 36, 14, 6, C.teal, C.ink, 2);
    drawHead(ctx, 0, 0, expr, t, blink, 0);
    ctx.restore();
  }

  // Glitch creature: cute corrupted blob (g.scale for tiny ambient glitches)
  function drawGlitch(ctx, g, t) {
    const { x, y } = g; const friendly = g.friendly; const sc = g.scale || 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    const jit = friendly ? 0 : 2;
    const j = () => (Math.random() - 0.5) * jit;
    ctx.fillStyle = 'rgba(40,30,20,.2)'; ctx.beginPath(); ctx.ellipse(0, 4, 18, 6, 0, 0, Math.PI * 2); ctx.fill();
    const hover = Math.sin(t * 4 + x) * 3;
    ctx.translate(j(), -14 + hover + j());
    // body blob
    const col = friendly ? '#7fc26b' : (Math.sin(t * 20) > 0.8 ? '#ff5fb0' : '#8b5fd6');
    ctx.fillStyle = col; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) {
      const a = i / 12 * Math.PI * 2; const r = 16 + Math.sin(a * 3 + t * 6) * 2.5 + (friendly ? 0 : Math.sin(t * 30 + i) * 1.5);
      const px = Math.cos(a) * r, py = Math.sin(a) * r * 0.85;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // glitch slice (displaced band)
    if (!friendly && Math.sin(t * 13 + x) > 0.6) { ctx.save(); ctx.beginPath(); ctx.rect(-20, -4, 40, 5); ctx.clip(); ctx.fillStyle = '#5ad6ff'; ctx.globalAlpha = .8; ctx.fillRect(-14 + 5, -4, 28, 5); ctx.restore(); }
    // highlight
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(-6, -9, 5, 2.5, -0.4, 0, Math.PI * 2); ctx.fill();
    // pixel bits floating off
    if (!friendly) {
      ctx.fillStyle = '#ff8ad0';
      for (let i = 0; i < 4; i++) { const a = t * 3 + i * 1.6; ctx.fillRect(Math.cos(a) * 22 + j(), Math.sin(a * 1.3) * 14 - 6, 4, 4); }
      ctx.fillStyle = '#5ad6ff'; ctx.fillRect(Math.sin(t * 5) * 18, -22 + Math.cos(t * 4) * 4, 3, 3);
    } else {
      ctx.fillStyle = '#f5c84c';
      for (let i = 0; i < 3; i++) { const a = t * 2 + i * 2.1; ctx.beginPath(); ctx.arc(Math.cos(a) * 22, Math.sin(a) * 10 - 8, 2, 0, Math.PI * 2); ctx.fill(); }
    }
    // eyes
    ctx.fillStyle = '#fff';
    const ew = friendly ? 4 : 4.5;
    ctx.beginPath(); ctx.ellipse(-6, -2, ew, ew + 1, 0, 0, Math.PI * 2); ctx.ellipse(6, -2, ew, ew + 1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.ink;
    const px = friendly ? 0 : Math.sin(t * 7) * 1.5;
    ctx.beginPath(); ctx.arc(-6 + px, -1, 2, 0, Math.PI * 2); ctx.arc(6 + px, -1 + (friendly ? 0 : 1), 2, 0, Math.PI * 2); ctx.fill();
    // mouth
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    ctx.beginPath();
    if (friendly) ctx.arc(0, 4, 4, 0.1 * Math.PI, 0.9 * Math.PI);
    else { ctx.moveTo(-5, 6); for (let i = 0; i <= 4; i++) ctx.lineTo(-5 + i * 2.5, 6 + (i % 2 ? -2 : 2)); }
    ctx.stroke();
    // little legs
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 8, 12); ctx.lineTo(s * 10 + Math.sin(t * 10 + s) * 2, 18); ctx.stroke(); }
    ctx.restore();
  }

  // Tiny helper/maintenance bots wandering around. b.kind: 'roller' (default) | 'sweeper' | 'carrier'
  function drawMiniBot(ctx, b, t) {
    ctx.save(); ctx.translate(b.x, b.y);
    const kind = b.kind || 'roller';
    ctx.fillStyle = 'rgba(40,30,20,.18)'; ctx.beginPath(); ctx.ellipse(0, 1, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
    const hop = Math.abs(Math.sin(t * 8 + b.seed)) * 1.5;
    const dir = b.dir || 1;
    ctx.scale(dir, 1);
    // wheels / treads
    ctx.fillStyle = C.dark; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
    rr(ctx, -9, -5, 18, 6, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.metal; for (let i = 0; i < 3; i++) { const p = ((t * 2 + i / 3) % 1); ctx.fillRect(-8 + p * 14, -4, 2, 4); }
    ctx.translate(0, -hop);
    // body
    fillRR(ctx, -9, -20, 18, 16, 5, b.color || C.yellow, C.ink, 1.8);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-7, -18, 6, 2);
    // face screen
    ctx.fillStyle = C.screen; rr(ctx, -6.5, -17, 13, 7, 2.5); ctx.fill();
    ctx.fillStyle = C.eye; const bl = Math.sin(t * 3 + b.seed) > 0.95 ? 0.3 : 1;
    ctx.beginPath(); ctx.ellipse(-3, -13.5, 1.6, 1.6 * bl, 0, 0, Math.PI * 2); ctx.ellipse(3, -13.5, 1.6, 1.6 * bl, 0, 0, Math.PI * 2); ctx.fill();
    // status light
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(0, -24); ctx.stroke();
    circ(ctx, 0, -25, 2.2, Math.sin(t * 6 + b.seed) > 0 ? C.orange : C.yellow, C.ink, 1);
    // little arm with tool
    const wag = Math.sin(t * 6 + b.seed) * 0.4;
    ctx.save(); ctx.translate(9, -12); ctx.rotate(wag);
    segment(ctx, 0, 0, 7, 4, 3, C.metal);
    if (kind === 'sweeper') { segment(ctx, 7, 4, 10, 12, 2, C.brown); ctx.fillStyle = C.yellow; ctx.fillRect(7, 11, 7, 3); }
    else if (kind === 'carrier') { fillRR(ctx, 5, -2, 8, 8, 1.5, C.brown, C.ink, 1.2); }
    else { fillRR(ctx, 6, 2, 3, 6, 1, C.orange, C.ink, 1); }
    ctx.restore();
    ctx.restore();
  }

  // Little villager NPCs: round-headed bots that idle in place. n: {x,y,color,hat,seed,prop}
  function drawNPC(ctx, n, t) {
    ctx.save(); ctx.translate(n.x, n.y);
    const bob = Math.sin(t * 2.2 + n.seed) * 1.2;
    ctx.fillStyle = 'rgba(40,30,20,.18)'; ctx.beginPath(); ctx.ellipse(0, 1, 10, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    if (n.facing) ctx.scale(n.facing, 1);
    // legs
    ctx.fillStyle = C.dark; ctx.fillRect(-5, -8, 4, 8); ctx.fillRect(1, -8, 4, 8);
    // body
    fillRR(ctx, -8, -24 - bob, 16, 18, 5, n.color || C.teal, C.ink, 1.8);
    ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(-1, -22 - bob, 2, 14);
    fillRR(ctx, 2, -16 - bob, 5, 4, 1, C.yellow, C.ink, 1);
    // arms
    segment(ctx, -8, -20 - bob, -12, -12 - bob + Math.sin(t * 3 + n.seed) * 2, 3.5, n.color || C.teal);
    segment(ctx, 8, -20 - bob, 12, -12 - bob, 3.5, n.color || C.teal);
    // prop
    if (n.prop === 'tablet') { fillRR(ctx, 9, -18 - bob, 10, 8, 1.5, C.dark, C.ink, 1.2); ctx.fillStyle = C.eye; ctx.fillRect(11, -16 - bob, 6, 4); }
    if (n.prop === 'can') { fillRR(ctx, 10, -16 - bob, 8, 7, 2, C.blue || '#6fb9e6', C.ink, 1.2); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(18, -14 - bob); ctx.lineTo(22, -18 - bob); ctx.stroke(); }
    if (n.prop === 'cup') { fillRR(ctx, 11, -16 - bob, 6, 6, 1.5, C.creamLight, C.ink, 1.2); if (Math.sin(t * 2 + n.seed) > 0) { ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(12, -22 - bob + Math.sin(t * 4) * 1, 2, 4); } }
    if (n.prop === 'sign') { ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(13, -12 - bob); ctx.lineTo(13, -34 - bob); ctx.stroke(); fillRR(ctx, 7, -40 - bob, 14, 9, 2, C.orange, C.ink, 1.2); ctx.fillStyle = C.ink; ctx.fillRect(10, -37 - bob, 8, 1.5); ctx.fillRect(10, -34 - bob, 5, 1.5); }
    // head
    const hy = -32 - bob;
    circ(ctx, 0, hy, 10, C.cream, C.ink, 1.8);
    ctx.fillStyle = C.screen; rr(ctx, -6, hy - 3, 12, 6, 2); ctx.fill();
    const blink = Math.sin(t * 2.5 + n.seed * 3) > 0.93 ? 0.3 : 1;
    ctx.fillStyle = C.eye; ctx.beginPath(); ctx.ellipse(-3, hy, 1.5, 1.5 * blink, 0, 0, Math.PI * 2); ctx.ellipse(3, hy, 1.5, 1.5 * blink, 0, 0, Math.PI * 2); ctx.fill();
    // hat / antenna variants
    if (n.hat === 'cap') { fillRR(ctx, -9, hy - 12, 18, 6, 3, n.hatColor || C.orange, C.ink, 1.5); ctx.fillStyle = n.hatColor || C.orange; ctx.strokeStyle = C.ink; rr(ctx, 2, hy - 9, 12, 3, 1.5); ctx.fill(); ctx.stroke(); }
    else if (n.hat === 'hard') { ctx.fillStyle = C.yellow; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, hy - 6, 10, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillRect(-11, hy - 7, 22, 2.5); }
    else if (n.hat === 'ears') { circ(ctx, -8, hy - 8, 4, n.color || C.teal, C.ink, 1.5); circ(ctx, 8, hy - 8, 4, n.color || C.teal, C.ink, 1.5); }
    else { ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, hy - 10); ctx.lineTo(0, hy - 15); ctx.stroke(); circ(ctx, 0, hy - 16, 2, Math.sin(t * 5 + n.seed) > 0 ? C.eye : C.orange, C.ink, 1); }
    // occasional thought/emote bubble
    const ph = (t * 0.25 + n.seed * 0.37) % 1;
    if (ph > 0.75 && ph < 0.95) {
      const k = Math.min(1, (ph - 0.75) * 12);
      ctx.save(); ctx.translate(12, hy - 22); ctx.scale(k, k);
      fillRR(ctx, -8, -8, 16, 12, 5, '#fff', C.ink, 1.5);
      ctx.fillStyle = C.ink; const em = n.emote || '…';
      ctx.font = '700 9px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(em, 0, -1.5);
      ctx.restore();
    }
    ctx.restore();
  }

  return { draw, drawPortrait, drawGlitch, drawMiniBot, drawNPC, drawHead, rr, fillRR, circ, segment, C };
})();
