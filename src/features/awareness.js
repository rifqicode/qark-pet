// --- battery awareness ---
let prevCharging = null, lastLow = 0;
function batteryCheck(b) {
  document.body.classList.toggle('weak', !!b && !b.charging && b.pct <= 20);
  if (!b) return;
  if (prevCharging === false && b.charging) onEvent({ msg: `charging… ${b.pct}% 😋`, mood: 'happy', ttl: 3500 });
  prevCharging = b.charging;
  if (!b.charging && b.pct <= 20 && Date.now() - lastLow > 10 * 60000) {
    lastLow = Date.now();
    onEvent({ msg: `battery at ${b.pct}% 🔋 plug in the charger`, mood: 'alert', ttl: 6000 });
  }
}

// --- time awareness ---
const said = {}; let lastLate = 0;
function checkTime() {
  const d = new Date(), h = d.getHours(), day = d.toDateString();
  const once = (part, msg) => { if (said[part] === day) return; said[part] = day; onEvent({ msg, mood: 'happy', ttl: 4500 }); };
  if (h >= 5 && h < 10) once('morning', 'good morning! you got this 🌞');
  else if (h >= 12 && h < 14) once('lunch', "it's lunchtime, go eat 🍚");
  else if (h >= 17 && h < 19) once('evening', 'good evening~ remember to rest 🌇');
  else if (h < 4 && Date.now() - lastLate > 40 * 60000) { lastLate = Date.now(); onEvent({ msg: "it's past midnight, go to sleep 😾", mood: 'alert', ttl: 5000 }); }
}
setTimeout(checkTime, 5000); setInterval(checkTime, 30000);

// --- clutter awareness (windows and browser tabs) ---
const clutterTracker = { lastAlert: 0, lastCount: 0 };
function clutterCheck(stats) {
  const logic = window.PetLogic || (typeof PetLogic !== 'undefined' ? PetLogic : null);
  if (!stats || !logic || !logic.evaluateClutter) return;
  const ev = logic.evaluateClutter(stats, clutterTracker, Date.now());
  if (ev) onEvent(ev);
}

// --- app and work mode awareness ---
const appTracker = { category: '', start: Date.now(), lastNudge: 0 };
let fullscreenPendingExit = null;

function appCheck(active) {
  const logic = window.PetLogic || (typeof PetLogic !== 'undefined' ? PetLogic : null);
  if (!logic) return;

  const isFullscreen = !!(active && active.fullscreen);
  if (isFullscreen) {
    if (fullscreenPendingExit) {
      clearTimeout(fullscreenPendingExit);
      fullscreenPendingExit = null;
    }
    if (!S.fullscreen || (S.state !== 'peek' && S.state !== 'walk' && !busy())) {
      S.fullscreen = true;
      document.body.classList.add('peeking');
      if (typeof minX === 'function') {
        const spot = logic.getPeekSpot(S.wx, minX(), maxX(), floorY());
        S.peekDir = spot.dir;
        goTo(spot);
      }
    }
  } else if (S.fullscreen && !fullscreenPendingExit) {
    fullscreenPendingExit = setTimeout(() => {
      fullscreenPendingExit = null;
      if (!S.fullscreen) return;
      S.fullscreen = false;
      document.body.classList.remove('peeking', 'peek-left', 'peek-right');
      S.peekDir = 0;
      if (typeof minX === 'function') {
        const back = logic.getUnpeekSpot(S.wx, minX(), maxX(), floorY(), 80);
        goTo(back);
      } else {
        setState('idle');
      }
    }, 1200);
  }

  if (!active || !logic.evaluateAppMode) return;
  const ev = logic.evaluateAppMode(active, appTracker, Date.now());
  if (ev) onEvent(ev);
}

// --- media player awareness via mpris ---
const mediaTracker = { lastTrack: '', lastNudge: 0 };
function mediaCheck(media) {
  const logic = window.PetLogic || (typeof PetLogic !== 'undefined' ? PetLogic : null);
  if (!logic || !logic.evaluateMedia) return;
  const { isPlaying, event: ev } = logic.evaluateMedia(media, mediaTracker, Date.now());
  document.body.classList.toggle('jamming', !!isPlaying);
  if (ev) onEvent(ev);
}
