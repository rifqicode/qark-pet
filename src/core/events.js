// Event from hub: react for a few seconds, then go back to normal.
// Events are queued and shown one at a time. Alerts jump ahead of normal ones; duplicates are dropped;
// a long backlog gets shorter display times and a "(+N)" hint so nothing overlaps.
// Persisted across restarts (localStorage on the hub origin): DND flag, drink counter, pomodoro, notification history.
const saved = (() => { try { return JSON.parse(localStorage.getItem('pet') || '{}'); } catch { return {}; } })();
S.dnd = !!saved.dnd; S.drinkN = saved.drinkN || 0;
const history = Array.isArray(saved.history) ? saved.history : [];
const save = () => { try { localStorage.setItem('pet', JSON.stringify({ dnd: S.dnd, drinkN: S.drinkN, pomo, history })); } catch {} };

const queue = [];
// ev.manual = pet's own reaction or a replay from the menu: not recorded, not muted by DND.
function onEvent(ev) {
  S.lastActivity = Date.now();
  const msg = ev.msg || '!';
  if (!ev.manual) {
    history.push({ msg, mood: ev.mood, t: Date.now(), nid: ev.nid, sid: ev.sid });
    if (history.length > 50) history.shift();
    save();
    if (S.dnd) return;
  }
  if (queue.some((q) => q.msg === msg)) return;
  const item = { ...ev, msg, t: Date.now() };
  if (ev.mood === 'alert') {
    const i = queue.findIndex((q) => q.mood !== 'alert');
    queue.splice(i < 0 ? queue.length : i, 0, item);
  } else queue.push(item);
  while (queue.length > 20) { const i = queue.findIndex((q) => q.mood !== 'alert'); queue.splice(i < 0 ? 0 : i, 1); }
  pump();
}
// Soft events (drink / pomodoro) wait while you're typing under the pet, but never longer than 90s.
let pumpT;
function pump() {
  if (S.showing) return;
  clearTimeout(pumpT);
  const i = queue.findIndex((q) => !q.soft || (!typingNow() && !S.fullscreen) || Date.now() - q.t > 90000);
  if (i < 0) { if (queue.length) pumpT = setTimeout(pump, 2000); return; }
  const ev = queue.splice(i, 1)[0];
  S.showing = true;
  const ms = queue.length > 3 ? 2500 : Math.min(Math.max(ev.ttl || 5000, 2500), 6000);
  const isPeeking = S.fullscreen || S.state === 'peek';
  const reacts = !busy() && !isPeeking;
  if (reacts) { S.lock = true; setState(ev.mood === 'alert' ? 'alert' : 'happy'); }
  say(queue.length ? `${ev.msg} (+${queue.length})` : ev.msg, ms, ev.mood, ev.nid, ev.sid);
  setTimeout(() => {
    if (reacts && !busy()) { S.lock = false; setState(S.fullscreen ? 'peek' : 'idle'); }
    else if (reacts) S.lock = false;
    S.showing = false;
    setTimeout(pump, 400);
  }, ms);
}
