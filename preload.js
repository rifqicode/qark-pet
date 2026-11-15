const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('petHost', {
  dragStart: (b) => ipcRenderer.send('pet:drag', b),
  dragEnd: () => ipcRenderer.invoke('pet:drag-end'),
  setPos: (x, y) => ipcRenderer.send('pet:pos', x, y),
  setIgnore: (v) => ipcRenderer.send('pet:ignore', v),
  openMenu: (m) => ipcRenderer.send('pet:menu', m),
  onMenu: (cb) => ipcRenderer.on('pet:menu-action', (_e, a) => cb(a)),
  onEnv: (cb) => ipcRenderer.on('pet:env', (_e, env) => cb(env)),
});
