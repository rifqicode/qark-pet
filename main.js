// Electron shell: small transparent always-on-top window that the renderer moves around the screen.
// Main also feeds the renderer the cursor position, the active window rect and system state (via platform/linux.js)
// so the pet can stay out of the way and look at what you're doing.
const { app, BrowserWindow, screen, ipcMain, Menu } = require('electron');
const path = require('path');
const { W, H } = require('./src/lib/config.js');
const linux = require('./platform/linux.js');

const PORT = process.env.PET_PORT || 7777;

app.commandLine.appendSwitch('enable-transparent-visuals');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.disableHardwareAcceleration(); // software rendering: no separate GPU process, less RAM

// An already-running server.js on the same port is fine: just reuse it.
process.on('uncaughtException', (e) => { if (e.code !== 'EADDRINUSE') throw e; });
require('./server.js');
if (process.env.PET_OWN_NOTIFY === '1') require('./notify-server.js');

let battery = linux.battery(), active = null, stats = { windows: 0, tabs: 0 };
const load = linux.createLoadMonitor();
const media = linux.createMediaMonitor();
(async () => { try { active = await linux.activeWindow(); } catch {} })();
setInterval(() => { battery = linux.battery(); }, 30000);
setInterval(load.poll, 2000);
let nullCount = 0;
setInterval(async () => {
  const next = await linux.activeWindow();
  if (next) { active = next; nullCount = 0; }
  else { nullCount++; if (nullCount >= 2) active = null; }
}, 250);
setInterval(async () => { stats = await linux.windowStats(); }, 4000);
setInterval(media.poll, 2500);

app.whenReady().then(() => {
  // Work area of the monitor the pet is on (follows it across monitors and picks up resolution changes).
  const petDisplay = () => {
    if (typeof win === 'undefined' || win.isDestroyed()) return screen.getPrimaryDisplay();
    const [x, y] = win.getPosition();
    return screen.getDisplayNearestPoint({ x: Math.round(x + W / 2), y: Math.round(y + H - 40) });
  };
  const wa0 = screen.getPrimaryDisplay().workArea;
  const win = new BrowserWindow({
    x: wa0.x + Math.round(wa0.width / 2 - W / 2), y: wa0.y + wa0.height - H, width: W, height: H,
    transparent: true, frame: false, hasShadow: false, resizable: false,
    skipTaskbar: true, focusable: false, alwaysOnTop: true, type: 'dock',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), backgroundThrottling: false },
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true);
  win.webContents.on('console-message', (_e, _level, message) => console.log('RENDERER:', message));
  win.loadURL(`http://127.0.0.1:${PORT}/?bare`);

  // On startup: remap to make sure compositor paints transparent window on Pantheon
  [150, 600].forEach((ms) => setTimeout(() => {
    if (win.isDestroyed()) return;
    win.hide();
    setTimeout(() => {
      if (!win.isDestroyed()) {
        win.showInactive();
        win.setAlwaysOnTop(true, 'screen-saver');
      }
    }, 60);
  }, ms));

  // Drag runs here: poll the cursor and move the window directly (no renderer round trip per move).
  let dragT = null;
  const stopDrag = () => { clearInterval(dragT); dragT = null; };
  ipcMain.on('pet:drag', (_e, b) => {
    stopDrag();
    const c0 = screen.getCursorScreenPoint(), clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    dragT = setInterval(() => {
      if (win.isDestroyed()) return stopDrag();
      const c = screen.getCursorScreenPoint();
      win.setPosition(Math.round(clamp(b.x0 + c.x - c0.x, b.minX, b.maxX)), Math.round(clamp(b.y0 + c.y - c0.y, b.minY, b.maxY)));
    }, 8);
  });
  ipcMain.handle('pet:drag-end', () => { stopDrag(); return win.getPosition(); });
  ipcMain.on('pet:pos', (_e, x, y) => win.setPosition(Math.round(x), Math.round(y)));

  // Click-through while the pet is ghosted (you're typing over it); mouse moves are still tracked via getCursorScreenPoint.
  ipcMain.on('pet:ignore', (_e, v) => { if (!win.isDestroyed()) win.setIgnoreMouseEvents(!!v, { forward: true }); });

  // Right-click menu: the renderer sends its current state, we pop up a native menu and send the choice back.
  ipcMain.on('pet:menu', (_e, m) => {
    const act = (a) => () => { if (!win.isDestroyed()) win.webContents.send('pet:menu-action', a); };
    const hist = (m.history || []).map((h, i) => ({ label: h.label, click: act({ id: 'show', i }) }));
    Menu.buildFromTemplate([
      { label: m.status, enabled: false },
      { type: 'separator' },
      { label: 'Do Not Disturb', type: 'checkbox', checked: !!m.dnd, click: act({ id: 'dnd' }) },
      { label: 'Skip pomodoro phase', click: act({ id: 'skip' }) },
      { label: 'Reset pomodoro', click: act({ id: 'reset' }) },
      { type: 'separator' },
      { label: `History (${hist.length})`, submenu: hist.length ? hist : [{ label: '(empty)', enabled: false }] },
      { label: 'Clear history', enabled: hist.length > 0, click: act({ id: 'clear' }) },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    ]).popup({ window: win });
  });

  // Desktop switch: tell the renderer so the pet shows up solid for a moment instead of staying at typing-fade opacity.
  let desk = null, deskSeq = 0;
  setInterval(async () => {
    const d = await linux.desktop();
    if (d === undefined || d === desk) return;
    if (desk !== null) {
      deskSeq++;
      // The compositor can leave the transparent window unpainted after a desktop switch until it gets input:
      // unmap and remap it (without stealing focus) so it is drawn fresh on the new desktop.
      [100, 600].forEach((ms) => setTimeout(() => {
        if (win.isDestroyed()) return;
        win.hide();
        setTimeout(() => { if (!win.isDestroyed()) { win.showInactive(); win.setAlwaysOnTop(true, 'screen-saver'); } }, 60);
      }, ms));
    }
    desk = d;
  }, 400);

  setInterval(() => {
    if (win.isDestroyed()) return;
    win.webContents.send('pet:env', {
      cursor: screen.getCursorScreenPoint(),
      pos: win.getPosition(),
      active,
      deskSeq,
      sysBusy: load.busy(),
      battery,
      stats,
      media: media.getMedia(),
      wa: petDisplay().workArea,
    });
  }, 120);
});

app.on('window-all-closed', () => app.quit());
