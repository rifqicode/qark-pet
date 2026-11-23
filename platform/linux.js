// Linux/X11-specific environment probes. Each is a plain function so another OS can provide the same shape.
const fs = require('fs');
const { execFile } = require('child_process');
let dbusNext = null;
try {
  dbusNext = require('dbus-next');
} catch {}

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

// Rect and details of the active window, or null.
async function activeWindow() {
  try {
    const id = ((await run('xprop', ['-root', '_NET_ACTIVE_WINDOW'])).match(/0x[0-9a-f]+/i) || [])[0];
    if (!id || /^0x0+$/i.test(id)) return null;
    const [info, props] = await Promise.all([
      run('xwininfo', ['-id', id]),
      run('xprop', ['-id', id, 'WM_CLASS', '_NET_WM_NAME', 'WM_NAME', '_NET_WM_STATE']),
    ]);
    const g = (re) => Number((info.match(re) || [])[1]);
    const a = { x: g(/Absolute upper-left X:\s+(-?\d+)/), y: g(/Absolute upper-left Y:\s+(-?\d+)/), w: g(/Width:\s+(\d+)/), h: g(/Height:\s+(\d+)/) };
    if (!Object.values(a).every(Number.isFinite)) return null;

    const clsMatch = props.match(/WM_CLASS\([A-Z_]+\)\s*=\s*"([^"]+)"/i);
    const cls = clsMatch ? clsMatch[1].toLowerCase() : '';
    const titleMatch = props.match(/(?:_NET_WM_NAME|WM_NAME)\([A-Z_]+\)\s*=\s*"([^"]+)"/);
    const title = titleMatch ? titleMatch[1] : '';
    const isTrueFullscreen = props.includes('_NET_WM_STATE_FULLSCREEN');
    const isMaximized = props.includes('_NET_WM_STATE_MAXIMIZED_HORZ') && props.includes('_NET_WM_STATE_MAXIMIZED_VERT');
    const fullscreen = isTrueFullscreen || isMaximized;

    return { ...a, id, cls, title, fullscreen };
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

// Count total managed client windows and browser renderer processes (tabs).
async function windowStats() {
  let windows = 0;
  try {
    const out = await run('xprop', ['-root', '_NET_CLIENT_LIST']);
    const ids = out.match(/0x[0-9a-f]+/gi) || [];
    windows = ids.length;
  } catch {}

  let tabs = 0;
  try {
    const procs = fs.readdirSync('/proc');
    for (const p of procs) {
      if (!/^\d+$/.test(p)) continue;
      try {
        const c = fs.readFileSync(`/proc/${p}/cmdline`, 'utf8');
        if (c.includes('type=renderer') || c.includes('-contentproc')) tabs++;
      } catch {}
    }
  } catch {}

  return { windows, tabs };
}

// Monitor active media player playback via MPRIS D-Bus.
function createMediaMonitor() {
  let bus = null;
  let current = null;
  if (dbusNext) {
    try {
      bus = dbusNext.sessionBus();
    } catch {}
  }

  async function poll() {
    if (!bus) return current;
    try {
      const obj = await bus.getProxyObject('org.freedesktop.DBus', '/org/freedesktop/DBus');
      const iface = obj.getInterface('org.freedesktop.DBus');
      const names = await iface.ListNames();
      const mprisNames = names.filter((n) => n.startsWith('org.mpris.MediaPlayer2.'));
      if (!mprisNames.length) {
        current = null;
        return null;
      }
      let found = null;
      for (const name of mprisNames) {
        try {
          const pObj = await bus.getProxyObject(name, '/org/mpris/MediaPlayer2');
          const props = pObj.getInterface('org.freedesktop.DBus.Properties');
          const statusV = await props.Get('org.mpris.MediaPlayer2.Player', 'PlaybackStatus');
          const status = statusV ? String(statusV.value) : 'Stopped';
          let title = '', artist = '';
          try {
            const metaV = await props.Get('org.mpris.MediaPlayer2.Player', 'Metadata');
            const meta = metaV ? metaV.value : {};
            const rawTitle = meta['xesam:title'];
            title = rawTitle ? String(rawTitle.value || rawTitle) : '';
            const rawArtist = meta['xesam:artist'];
            artist = rawArtist ? (Array.isArray(rawArtist.value) ? rawArtist.value.join(', ') : String(rawArtist.value || rawArtist)) : '';
          } catch {}
          const player = name.replace('org.mpris.MediaPlayer2.', '');
          found = { player, status, title, artist };
          if (status === 'Playing') break;
        } catch {}
      }
      current = found;
    } catch {
      current = null;
    }
    return current;
  }
  return { poll, getMedia: () => current };
}

module.exports = { battery, activeWindow, desktop, createLoadMonitor, windowStats, createMediaMonitor };
