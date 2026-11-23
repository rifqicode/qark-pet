// --- cursor / active window feed from main ---
let seenDesk = null;
function onEnv(e) {
  S.env = e;
  // Resolution / monitor changed: keep standing on the bottom of the (new) work area.
  if (S.synced && !S.drag && !['fall', 'held'].includes(S.state) && Math.abs(S.wy - floorY()) > 2) S.wy = S.ty = floorY();
  if (seenDesk !== null && e.deskSeq !== seenDesk) S.lastMove = Date.now(); // desktop switched: not 'typing' for a few seconds
  seenDesk = e.deskSeq;
  S.thinking = !!e.sysBusy; document.body.classList.toggle('thinking', S.thinking);
  if (!S.synced && e.pos) {
    S.synced = true;
    const logic = window.PetLogic || (typeof PetLogic !== 'undefined' ? PetLogic : null);
    if (e.active && e.active.fullscreen && logic && typeof minX === 'function') {
      const spot = logic.getPeekSpot(e.pos[0], minX(), maxX(), floorY());
      S.wx = S.tx = spot.x;
      S.wy = S.ty = spot.y;
      S.fullscreen = true;
      S.peekDir = spot.dir;
      document.body.classList.add('peeking');
      document.body.classList.toggle('peek-left', spot.dir === 1);
      document.body.classList.toggle('peek-right', spot.dir === -1);
      setState('peek');
      send();
    } else {
      S.wx = S.tx = e.pos[0];
      S.wy = S.ty = floorY();
    }
  }
  const c = e.cursor;
  if (lastCur && (c.x !== lastCur.x || c.y !== lastCur.y)) {
    S.lastActivity = Date.now(); S.lastMove = Date.now();
    if (S.state === 'sleep' && !S.lock && !S.dnd) setState('idle');
  }
  lastCur = c;
  batteryCheck(e.battery);
  if (typeof clutterCheck === 'function') clutterCheck(e.stats);
  if (typeof appCheck === 'function') appCheck(e.active);
  if (typeof mediaCheck === 'function') mediaCheck(e.media);
  look();
}
// Eyes follow the cursor; face it while standing still.
function look() {
  if (S.state === 'sleep') { eyes.forEach((e) => (e.style.transform = '')); return; }
  // Mouse recently moved: look at it. Otherwise assume you're typing: look at the active window's center.
  const a = S.env.active, typing = a && Date.now() - S.lastMove > 3000;
  const gx = typing ? a.x + a.w / 2 : S.env.cursor.x, gy = typing ? a.y + a.h / 2 : S.env.cursor.y;
  const dx = gx - (S.wx + PET_CX), dy = gy - (S.wy + PET_CY);
  if (S.state === 'idle' && Math.abs(dx) > 30) S.dir = dx > 0 ? 1 : -1;
  const ex = clamp(dx / 80, -3, 3) * S.dir, ey = clamp(dy / 80, -2, 2);
  eyes.forEach((e) => (e.style.transform = `translate(${ex}px, ${ey}px)`));
}

function send() {
  if (S.drag && S.drag.moved) return; // main moves the window while dragging
  if (bubble.classList.contains('show')) placeBubble();
  const k = Math.round(S.wx) + ',' + Math.round(S.wy);
  if (k !== lastSent) { lastSent = k; if (window.petHost) petHost.setPos(Math.round(S.wx), Math.round(S.wy)); }
}
