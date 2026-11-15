// Pure logic shared by the renderer and the tests (no DOM, no timers).
(function (root) {
  const overlap = (a, b) => {
    const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    return w > 0 && h > 0 ? w * h : 0;
  };

  // Lowest-cost candidate: cover score + distance from (wx, wy) + a little randomness so the pet doesn't always pick the same spot.
  function bestSpot(cands, score, wx, wy, rand) {
    let best = null;
    for (const [x, y] of cands) {
      const s = score(x, y) + Math.hypot(x - wx, y - wy) * 0.3 + rand() * 300;
      if (!best || s < best.s) best = { x, y, s };
    }
    return best;
  }

  // Advance the pomodoro when its phase has ended. Mutates `p` ({phase, round, end}); returns the event to show, or null.
  // cfg: { work, brk, long, rounds } (minutes / count)
  function advancePomo(p, now, cfg) {
    if (now < p.end) return null;
    if (p.phase === 'work') {
      const long = p.round >= cfg.rounds, mins = long ? cfg.long : cfg.brk;
      p.phase = long ? 'long' : 'break'; p.end = now + mins * 60000;
      return { msg: long ? `${cfg.rounds} rounds done! long break ${mins}m, step away from the screen` : `Done! ${mins}m break, stand up & stretch`, mood: 'alert', ttl: 6000 };
    }
    p.round = p.phase === 'long' ? 1 : p.round + 1;
    p.phase = 'work'; p.end = now + cfg.work * 60000;
    return { msg: `break over! focus round ${p.round}/${cfg.rounds} 💪`, mood: 'happy', ttl: 5000 };
  }

  const api = { overlap, bestSpot, advancePomo };
  if (typeof module !== 'undefined') module.exports = api; else root.PetLogic = api;
})(globalThis);
