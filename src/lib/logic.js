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

  // Detect general category of an active application class.
  function detectAppCategory(cls) {
    if (!cls) return 'other';
    const c = String(cls).toLowerCase();
    if (/(?:code|cursor|vscodium|sublime|atom|nvim|vim|emacs|terminal|kitty|alacritty|wezterm|tilix|xterm|konsole|urxvt)/.test(c)) return 'code';
    if (/(?:chrome|chromium|firefox|brave|edge|opera|vivaldi)/.test(c)) return 'browser';
    if (/(?:figma|inkscape|gimp|blender|krita)/.test(c)) return 'design';
    if (/(?:slack|discord|telegram|whatsapp|teams)/.test(c)) return 'chat';
    return 'other';
  }

  // Evaluate desktop clutter (too many open browser tabs or windows).
  // Cooldown defaults to 20 minutes.
  function evaluateClutter(stats, tracker, now, cooldownMs = 20 * 60000) {
    if (!stats || !tracker) return null;
    const tabs = Number(stats.tabs) || 0;
    const windows = Number(stats.windows) || 0;
    if (tracker.lastAlert && now - tracker.lastAlert < cooldownMs) return null;

    if (tabs >= 20) {
      tracker.lastAlert = now;
      tracker.lastCount = tabs;
      return { msg: `Whoa, ${tabs} browser tabs open! Super busy today, keep it up!`, mood: 'happy', ttl: 5500 };
    }
    if (windows >= 12) {
      tracker.lastAlert = now;
      tracker.lastCount = windows;
      return { msg: `You have ${windows} windows open, heavy multitasking mode today!`, mood: 'happy', ttl: 5000 };
    }
    return null;
  }

  // Evaluate active application usage (e.g. continuous coding streak).
  function evaluateAppMode(active, tracker, now, streakMs = 45 * 60000) {
    if (!active || !tracker) return null;
    const category = detectAppCategory(active.cls);
    if (tracker.category !== category) {
      tracker.category = category;
      tracker.start = now;
      return null;
    }

    const last = tracker.lastNudge || 0;
    if (category === 'code' && now - tracker.start >= streakMs && (!last || now - last >= streakMs)) {
      tracker.lastNudge = now;
      return { msg: 'Coding streak for 45 minutes! Save a commit and give your eyes a short break', mood: 'happy', ttl: 5500 };
    }
    return null;
  }

  // Evaluate media player track changes and playback status.
  function evaluateMedia(media, tracker, now, cooldownMs = 3 * 60000) {
    if (!media || media.status !== 'Playing') {
      return { isPlaying: false, event: null };
    }
    const title = (media.title || '').trim();
    const artist = (media.artist || '').trim();
    const trackKey = `${title}::${artist}`;

    if (!tracker) return { isPlaying: true, event: null };
    const isNew = trackKey && trackKey !== tracker.lastTrack;
    const last = tracker.lastNudge || 0;

    let event = null;
    if (isNew && (!last || now - last >= cooldownMs)) {
      tracker.lastTrack = trackKey;
      tracker.lastNudge = now;
      const cleanTitle = title.length > 35 ? `${title.slice(0, 32)}...` : title;
      const text = artist ? `Now jamming: ${cleanTitle} (${artist})` : `Now jamming: ${cleanTitle}`;
      event = { msg: text, mood: 'happy', ttl: 4000 };
    }

    return { isPlaying: true, event };
  }

  // Compute peek coordinates along the screen edge for fullscreen/maximized mode.
  function getPeekSpot(wx, minXVal, maxXVal, floorYVal) {
    const dLeft = Math.abs(wx - minXVal);
    const dRight = Math.abs(wx - maxXVal);
    if (dLeft <= dRight) {
      return { x: minXVal, y: floorYVal, dir: 1, side: 'left' };
    }
    return { x: maxXVal, y: floorYVal, dir: -1, side: 'right' };
  }

  // Compute safe recovery coordinates when leaving fullscreen mode.
  function getUnpeekSpot(wx, minXVal, maxXVal, floorYVal, margin = 80) {
    const mid = (minXVal + maxXVal) / 2;
    return { x: wx < mid ? minXVal + margin : maxXVal - margin, y: floorYVal };
  }

  const api = { overlap, bestSpot, advancePomo, detectAppCategory, evaluateClutter, evaluateAppMode, evaluateMedia, getPeekSpot, getUnpeekSpot };
  if (typeof module !== 'undefined') module.exports = api; else root.PetLogic = api;
})(globalThis);
