// Linux/X11-specific environment probes. Each is a plain function so another OS can provide the same shape.
const fs = require('fs');
const { execFile } = require('child_process');

const run = (cmd, args) => new Promise((res) => execFile(cmd, args, { timeout: 1500 }, (err, out) => res(err ? '' : out)));

function battery() {
  try {
    const d = '/sys/class/power_supply', b = fs.readdirSync(d).find((n) => /^BAT/.test(n));
    if (!b) return null;
    const pct = Number(fs.readFileSync(`${d}/${b}/capacity`, 'utf8'));
    const st = fs.readFileSync(`${d}/${b}/status`, 'utf8').trim();
    return { pct, charging: st === 'Charging' || st === 'Full' };
  } catch { return null; }
}

// Rect of the active window, or null.
async function activeWindow() {
  try {
    const id = ((await run('xprop', ['-root', '_NET_ACTIVE_WINDOW'])).match(/0x[0-9a-f]+/i) || [])[0];
    if (!id || /^0x0+$/i.test(id)) return null;
    const info = await run('xwininfo', ['-id', id]);
    const g = (re) => Number((info.match(re) || [])[1]);
    const a = { x: g(/Absolute upper-left X:\s+(-?\d+)/), y: g(/Absolute upper-left Y:\s+(-?\d+)/), w: g(/Width:\s+(\d+)/), h: g(/Height:\s+(\d+)/) };
    return Object.values(a).every(Number.isFinite) ? a : null;
  } catch { return null; }
}

// Current virtual desktop index as a string, or undefined.
async function desktop() {
  return ((await run('xprop', ['-root', '_NET_CURRENT_DESKTOP'])).match(/=\s*(\d+)/) || [])[1];
}

// Overall CPU (delta of /proc/stat) and memory use. busy() is true while either is high, held for holdMs after the last high reading.
function createLoadMonitor({ cpu = 60, mem = 85, holdMs = 5000 } = {}) {
  let prev = null, lastBusy = 0;
  const load = { cpu: 0, mem: 0 };
  function poll() {
    try {
      const f = fs.readFileSync('/proc/stat', 'utf8').split('\n')[0].trim().split(/\s+/).slice(1).map(Number);
      const idle = f[3] + (f[4] || 0), total = f.reduce((a, b) => a + b, 0);
      if (prev) load.cpu = Math.round((1 - (idle - prev.idle) / Math.max(1, total - prev.total)) * 100);
      prev = { idle, total };
      const m = Object.fromEntries(fs.readFileSync('/proc/meminfo', 'utf8').split('\n').map((l) => l.split(/:\s+/)).filter((x) => x[1]).map(([k, v]) => [k, parseInt(v)]));
      load.mem = Math.round((1 - m.MemAvailable / m.MemTotal) * 100);
    } catch {}
    if (load.cpu > cpu || load.mem > mem) lastBusy = Date.now();
  }
  return { poll, busy: () => Date.now() - lastBusy < holdMs, load };
}

module.exports = { battery, activeWindow, desktop, createLoadMonitor };
