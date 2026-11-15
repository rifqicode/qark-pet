// --- health reminders: drink water + pomodoro (25 work / 5 break, 15 long break after 4 rounds) ---
const DRINK_MIN = 30, WORK_MIN = 25, BREAK_MIN = 5, LONG_MIN = 15, ROUNDS = 4;
const DRINKS = ['time for some water 💧', 'have you had a drink yet? 🥤', 'hydrate! glug glug 💦', 'water break 🚰'];
setInterval(() => onEvent({ msg: DRINKS[S.drinkN++ % DRINKS.length], mood: 'alert', ttl: 5000, soft: true }), DRINK_MIN * 60000);

// Resume a saved timer unless it expired more than a minute ago (app was off); then start fresh.
const sp = saved.pomo;
const pomo = sp && sp.end > Date.now() - 60000 ? sp : { phase: 'work', round: 1, end: Date.now() + WORK_MIN * 60000 };
function pomoStatus() {
  const m = Math.max(0, Math.ceil((pomo.end - Date.now()) / 60000));
  return pomo.phase === 'work' ? `🍅 focus ${pomo.round}/${ROUNDS}, ${m}m left` : `☕ break, ${m}m left`;
}
const POMO = { work: WORK_MIN, brk: BREAK_MIN, long: LONG_MIN, rounds: ROUNDS };
function pomoTick() {
  const ev = PetLogic.advancePomo(pomo, Date.now(), POMO);
  if (ev) onEvent({ ...ev, soft: true });
}
setInterval(() => { pomoTick(); save(); }, 5000);

// Touching the pet counts as interaction (resets mood).
pet.addEventListener('pointerdown', () => { S.lastPoke = Date.now(); });
