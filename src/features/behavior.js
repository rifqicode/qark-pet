// Brain tick (~30fps): walk toward target, sleep when you've been away from the mouse for a while.
setInterval(() => {
  if (!S.synced) return;
  if (S.state === 'fall') {
    S.vy += 1.1; S.wy += S.vy;
    if (S.wy >= floorY()) {
      S.wy = S.ty = floorY(); S.vy = 0; setState('land');
      setTimeout(() => { if (S.state === 'land') setState('idle'); }, 450);
    }
  }
  if (!S.lock && !S.drag) {
    if (S.state === 'idle' && (S.dnd || (!S.thinking && Date.now() - S.lastActivity > 90000))) setState('sleep');
    if (S.state === 'walk') {
      const dx = S.tx - S.wx, dy = S.ty - S.wy, d = Math.hypot(dx, dy);
      if (d < 4) { S.wx = S.tx; S.wy = S.ty; setState('idle'); }
      else { S.wx += (dx / d) * 4; S.wy += (dy / d) * 4; S.dir = dx >= 0 ? 1 : -1; }
    }
  }
  flip.style.scale = S.dir < 0 ? '-1 1' : '1 1';
  send();
}, 33);

// Wander or do something spontaneous now and then. Mood (from time since last interaction) shifts the odds.
const mood = () => { const m = (Date.now() - S.lastPoke) / 60000; return m > 30 ? 'grumpy' : m > 10 ? 'bored' : 'happy'; };
const ACTS = { scratch: [2200, null], yawn: [2000, 'yaaawn~'], stretch: [2000, null], chase: [2600, null] };
function doAct(name) {
  const [ms, line] = ACTS[name];
  setState(name);
  if (line && !S.showing) say(line, 1800);
  setTimeout(() => { if (S.state === name) setState('idle'); }, ms);
}
setInterval(() => {
  if (!S.synced || S.lock || busy() || S.state !== 'idle' || typingNow()) return;
  const m = mood(), r = Math.random();
  if (r < 0.35) return goTo(pickSpot());
  if (r < 0.75) {
    const pool = m === 'bored' ? ['yawn', 'yawn', 'stretch', 'scratch'] : m === 'grumpy' ? ['stretch', 'scratch'] : ['scratch', 'stretch', 'chase', 'chase', 'yawn'];
    if (m === 'grumpy' && Math.random() < 0.3 && !S.showing) say('hmph, you keep ignoring me 😾', 3000);
    doAct(pool[Math.floor(Math.random() * pool.length)]);
  }
}, 4000);

// Active window moved/changed onto the pet: step aside (only if a clearly better spot exists).
setInterval(() => {
  if (!S.synced || S.lock || busy() || !S.env.active) return;
  const ref = S.state === 'walk' ? score(S.tx, S.ty) : score(S.wx, S.wy);
  if (ref === 0) return;
  const b = pickSpot();
  if (b.s < ref * 0.7) goTo(b);
}, 700);

// Typing over the pet: slip to the less-covered bottom corner, then fade out and go click-through.
// Any mouse move (or a bubble showing) brings it back.
let ghosted = false, wasTyping = false;
// Cursor over the pet's body (window coords come from main; click-through windows don't get hover events on Linux).
const hovering = () => {
  const c = S.env.cursor, x = c.x - S.wx, y = c.y - S.wy;
  return x >= PET_CX - 55 && x <= PET_CX + 55 && y >= PET_CY - 55 && y <= PET_CY + 45;
};
setInterval(() => {
  if (!S.synced) return;
  // Faded by default; solid only while a bubble shows, you're touching it, or it's mid-action.
  const want = !S.showing && !S.drag && !hovering() && !['held', 'fall', 'land', 'petted'].includes(S.state);
  if (want !== ghosted) {
    ghosted = want;
    document.body.classList.toggle('ghost', want);
    if (window.petHost) petHost.setIgnore(want);
  }
  const typing = typingNow();
  document.body.classList.toggle('typing', typing);
  if (typing && !wasTyping && !S.lock && (S.state === 'idle' || S.state === 'walk')) {
    const fy = floorY();
    const corners = [[minX(), fy], [maxX(), fy]].sort((a, b) => score(...a) - score(...b));
    if (score(...corners[0]) < score(S.wx, S.wy) * 0.7) goTo({ x: corners[0][0], y: corners[0][1] });
  }
  wasTyping = typing;
}, 150);

// Blink
setInterval(() => { if (S.state === 'idle' || S.state === 'walk') { pet.classList.add('blinking'); setTimeout(() => pet.classList.remove('blinking'), 140); } }, 3500);
