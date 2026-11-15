// Makes the pet the desktop's notification server (org.freedesktop.Notifications).
// Stops the system daemon (io.elementary.notifications on Pantheon) while running and starts it again on exit.
// Every Notify() call is forwarded to the pet as an event. Enabled with PET_OWN_NOTIFY=1.
const dbus = require('dbus-next');
const http = require('http');
const { execFile, spawn } = require('child_process');
const { focusHerdr } = require('./integrations/herdr.js');

const { Interface } = dbus.interface;
const PORT = process.env.PET_PORT || 7777;
const NAME = 'org.freedesktop.Notifications';
const DAEMON = 'io.elementary.notifications';
const IGNORE_APPS = (process.env.PET_IGNORE_APPS || '').split(',').filter(Boolean);

const post = (ev) => {
  const req = http.request({ host: '127.0.0.1', port: PORT, path: '/event', method: 'POST' }, (r) => r.resume());
  req.on('error', () => {});
  req.end(JSON.stringify(ev));
};

let nextId = 1;
const SESSION = Date.now(); // ids restart each run; lets stale history entries be told apart
const history = []; // last 50 notifications, for a future "history" menu
const meta = new Map(); // id -> { app, entry, hasDefault }, so a bubble click can open the sender

class Notifications extends Interface {
  Notify(app, replacesId, icon, summary, body, actions, hints, timeout) {
    const id = replacesId || nextId++;
    const text = [summary, body].filter(Boolean).join(' - ').replace(/<[^>]+>/g, '').slice(0, 400);
    if (text && !IGNORE_APPS.includes(app)) {
      const urgency = hints.urgency ? Number(hints.urgency.value) : 1;
      history.push({ id, app, text, t: Date.now() });
      if (history.length > 50) history.shift();
      const entry = hints['desktop-entry'] ? String(hints['desktop-entry'].value) : '';
      meta.set(id, { app, entry, text, hasDefault: actions.includes('default') });
      if (meta.size > 100) meta.delete(meta.keys().next().value);
      post({ msg: `${app ? app + ': ' : ''}${text}`, mood: urgency === 2 ? 'alert' : 'happy', ttl: 6000, nid: id, sid: SESSION });
    }
    return id;
  }
  CloseNotification() {}
  GetCapabilities() { return ['body']; }
  GetServerInformation() { return ['desktop-pet', 'desktop-pet', '0.1.0', '1.2']; }
  NotificationClosed(id, reason) { return [id, reason]; }
  ActionInvoked(id, key) { return [id, key]; }
}
Notifications.configureMembers({
  methods: {
    Notify: { inSignature: 'susssasa{sv}i', outSignature: 'u' },
    CloseNotification: { inSignature: 'u' },
    GetCapabilities: { outSignature: 'as' },
    GetServerInformation: { outSignature: 'ssss' },
  },
  signals: {
    NotificationClosed: { signature: 'uu' },
    ActionInvoked: { signature: 'us' },
  },
});

const run = (cmd, args) => new Promise((res) => execFile(cmd, args, () => res()));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let bus = null, stopped = false, iface = null;

// Bubble clicked: tell the app (ActionInvoked 'default', which most apps use to raise their window),
// and if it has no default action fall back to launching/focusing its .desktop entry.
require('./server.js').onOpen(({ id, sid }) => {
  if (sid !== undefined && sid !== SESSION) return; // notification from a previous run
  const m = meta.get(id);
  if (!m || !iface) return;
  if (m.app === 'Herdr') { focusHerdr(m.text || ''); iface.NotificationClosed(id, 2); return; }
  if (m.hasDefault) { iface.ActionInvoked(id, 'default'); iface.NotificationClosed(id, 2); return; }
  const name = m.entry || m.app.toLowerCase().replace(/\s+/g, '-');
  if (name) { const p = spawn('gtk-launch', [name], { detached: true, stdio: 'ignore' }); p.on('error', () => {}); p.unref(); }
  iface.NotificationClosed(id, 2);
});

async function start() {
  await run('pkill', ['-f', DAEMON]);
  await sleep(500);
  bus = dbus.sessionBus();
  iface = new Notifications(NAME);
  bus.export('/org/freedesktop/Notifications', iface);
  for (let i = 0; i < 5; i++) {
    const r = await bus.requestName(NAME, 0); // 1 = primary owner
    if (r === 1) { console.log('pet is now the notification server'); return; }
    await sleep(1000);
  }
  console.error(`could not take ${NAME}; leaving the system daemon alone`);
  restoreDaemon();
}

function restoreDaemon() {
  if (stopped) return;
  stopped = true;
  try { if (bus) bus.disconnect(); } catch {}
  const p = spawn(DAEMON, [], { detached: true, stdio: 'ignore' });
  p.on('error', () => {});
  p.unref();
}

for (const s of ['SIGINT', 'SIGTERM', 'SIGUSR2']) process.on(s, () => { restoreDaemon(); process.exit(0); });
process.on('exit', restoreDaemon);

start().catch((e) => { console.error('notify-server failed:', e.message); restoreDaemon(); });
