// Drag anywhere on screen: moves the whole window.
pet.addEventListener('pointerdown', (e) => {
  pet.setPointerCapture(e.pointerId);
  S.drag = { sx: e.screenX, sy: e.screenY, wx0: S.wx, wy0: S.wy, moved: false };
});
pet.addEventListener('pointermove', (e) => {
  if (!S.drag) return;
  const dx = e.screenX - S.drag.sx, dy = e.screenY - S.drag.sy;
  if (!S.drag.moved && Math.hypot(dx, dy) < 4) return;
  if (!S.drag.moved) { S.drag.moved = true; S.vy = 0; setState('held'); }
  const wa = S.env.wa;
  S.wx = S.tx = clamp(S.drag.wx0 + dx, minX(), maxX());
  S.wy = S.ty = clamp(S.drag.wy0 + dy, wa.y, wa.y + wa.height - H);
});
pet.addEventListener('pointerup', () => {
  if (!S.drag) return;
  const moved = S.drag.moved; S.justDragged = moved; S.drag = null;
  S.lastActivity = Date.now();
  if (moved) { S.vy = 0; if (S.wy < floorY() - 2) setState('fall'); else { S.wy = S.ty = floorY(); setState('idle'); } }
  setTimeout(() => { S.justDragged = false; }, 0);
});

// Click = poke; wakes up. Also shows the pomodoro status.
pet.addEventListener('click', () => S.justDragged || onEvent({ msg: (S.state === 'sleep' ? 'yaaawn… oh, hi! · ' : '') + pomoStatus(), mood: 'happy', ttl: 3000, manual: true }));

// --- right-click menu (native, built in main) ---
const hhmm = (t) => new Date(t).toTimeString().slice(0, 5);
pet.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  if (!window.petHost) return;
  petHost.openMenu({
    status: pomoStatus() + (S.dnd ? ' · DND on' : ''),
    dnd: S.dnd,
    history: history.slice(-15).reverse().map((h) => ({ label: `${hhmm(h.t)}  ${h.msg}`.slice(0, 70) })),
  });
});
if (window.petHost) petHost.onMenu(({ id, i }) => {
  const recent = history.slice(-15).reverse();
  if (id === 'dnd') { S.dnd = !S.dnd; if (S.dnd) { queue.length = 0; } else if (S.state === 'sleep') setState('idle'); onEvent({ msg: S.dnd ? 'Do Not Disturb on 🤫' : 'Do Not Disturb off 🔔', mood: 'happy', ttl: 2500, manual: true }); }
  else if (id === 'skip') { pomo.end = Date.now(); pomoTick(); }
  else if (id === 'reset') { Object.assign(pomo, { phase: 'work', round: 1, end: Date.now() + WORK_MIN * 60000 }); onEvent({ msg: `pomodoro reset 🍅 ${pomoStatus()}`, mood: 'happy', ttl: 3000, manual: true }); }
  else if (id === 'show' && recent[i] && recent[i].nid != null && recent[i].sid) fetch('/open', { method: 'POST', body: JSON.stringify({ id: recent[i].nid, sid: recent[i].sid }) }).catch(() => {});
  else if (id === 'show' && recent[i]) onEvent({ msg: recent[i].msg, mood: recent[i].mood, ttl: 6000, manual: true });
  else if (id === 'clear') history.length = 0;
  save();
});

// --- petting: hover the pointer and stroke back and forth over the pet ---
const strokes = []; let lastX = null, lastSign = 0, pettedT;
pet.addEventListener('pointermove', (e) => {
  if (S.drag || e.buttons) return;
  if (lastX !== null) {
    const dx = e.screenX - lastX, sign = Math.sign(dx);
    if (Math.abs(dx) >= 3 && sign !== lastSign) { if (lastSign) strokes.push(Date.now()); lastSign = sign; lastX = e.screenX; }
    else if (Math.abs(dx) >= 3) lastX = e.screenX;
  } else lastX = e.screenX;
  while (strokes.length && Date.now() - strokes[0] > 1500) strokes.shift();
  if (strokes.length >= 3) startPetting();
  if (S.state === 'petted') { clearTimeout(pettedT); pettedT = setTimeout(stopPetting, 1200); }
});
pet.addEventListener('pointerleave', () => { lastX = null; lastSign = 0; strokes.length = 0; if (S.state === 'petted') stopPetting(); });
function startPetting() {
  S.lastPoke = S.lastActivity = Date.now();
  if (S.state === 'petted' || S.drag || S.state === 'fall' || S.state === 'land') return;
  S.lock = false; setState('petted');
  if (!S.showing) say(['purr~ 😽', 'so nice… 😌', 'mrrrr 💗'][Math.floor(Math.random() * 3)], 2500);
  clearTimeout(pettedT); pettedT = setTimeout(stopPetting, 1200);
}
function stopPetting() { strokes.length = 0; lastSign = 0; if (S.state === 'petted') setState('idle'); }
