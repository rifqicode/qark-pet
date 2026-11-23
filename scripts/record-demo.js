const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 520,
    height: 300,
    show: false,
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    width: 520px;
    height: 300px;
    overflow: hidden;
    background: #181926;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif;
    position: relative;
    user-select: none;
  }
  /* Mock window on desktop */
  .mock-window {
    position: absolute;
    top: 25px;
    left: 30px;
    width: 440px;
    height: 200px;
    background: #1e2030;
    border-radius: 8px;
    border: 1px solid #363a4f;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    overflow: hidden;
    transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .mock-window.fullscreen {
    top: 0;
    left: 0;
    width: 520px;
    height: 300px;
    border-radius: 0;
    border: none;
  }
  .window-bar {
    height: 28px;
    background: #24273a;
    border-bottom: 1px solid #363a4f;
    display: flex;
    align-items: center;
    padding: 0 10px;
  }
  .dot { width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; }
  .dot.red { background: #ed8796; }
  .dot.yellow { background: #eed49f; }
  .dot.green { background: #a6da95; }
  .window-title { font-size: 11px; color: #8087a2; margin-left: 10px; font-weight: 500; }
  .code-lines { padding: 14px 18px; font-family: monospace; font-size: 11px; line-height: 1.6; color: #cad3f5; }
  .kw { color: #c6a0f6; }
  .fn { color: #8aadf4; }
  .str { color: #a6da95; }
  .cm { color: #6e738d; }

  /* Screen right bezel indicator */
  .screen-bezel {
    position: absolute;
    top: 0;
    right: 0;
    width: 5px;
    height: 100%;
    background: #0f101a;
    border-left: 1px solid #282a36;
    z-index: 99;
  }

  /* Desktop Pet Styles */
  #pet-container {
    position: absolute;
    bottom: 16px;
    left: 215px;
    width: 90px;
    height: 80px;
    z-index: 100;
  }
  #flip {
    width: 100%;
    height: 100%;
    transform-origin: 50% 100%;
  }
  .body {
    position: absolute;
    bottom: 0;
    left: 8px;
    width: 74px;
    height: 58px;
    background: #ffb86b;
    border-radius: 50% 50% 44% 44%;
    box-shadow: inset -6px -6px 0 #e89a4a;
  }
  .ear {
    position: absolute;
    top: 6px;
    width: 20px;
    height: 22px;
    background: #ffb86b;
    clip-path: polygon(50% 0, 0 100%, 100% 100%);
  }
  .ear.l { left: 12px; transform: rotate(-12deg); }
  .ear.r { right: 12px; transform: rotate(12deg); }
  .eye {
    position: absolute;
    top: 34px;
    width: 9px;
    height: 11px;
    background: #222;
    border-radius: 50%;
    transition: transform 0.1s;
  }
  .eye.l { left: 28px; }
  .eye.r { left: 52px; }
  .blush {
    position: absolute;
    top: 46px;
    width: 10px;
    height: 6px;
    background: #ff8a8a;
    border-radius: 50%;
    opacity: 0.7;
  }
  .blush.l { left: 20px; }
  .blush.r { left: 60px; }
  .mouth {
    position: absolute;
    top: 46px;
    left: 41px;
    width: 8px;
    height: 5px;
    border-bottom: 2px solid #222;
    border-radius: 0 0 8px 8px;
  }
  .tail {
    position: absolute;
    bottom: 8px;
    right: -2px;
    width: 22px;
    height: 10px;
    background: #e89a4a;
    border-radius: 10px;
    transform-origin: 0 50%;
    animation: wag 1.6s ease-in-out infinite;
  }
  @keyframes wag { 50% { transform: rotate(-35deg); } }

  /* States */
  .idle #flip { animation: breathe 2.4s ease-in-out infinite; }
  @keyframes breathe { 50% { transform: scale(1.03, .97); } }
  .walk #flip { animation: hop .38s ease-in-out infinite; }
  @keyframes hop { 50% { transform: translateY(-9px); } }

  /* Peeking on right edge */
  .peeking-mode #pet-container {
    left: 472px !important;
  }
  .peeking-mode #flip {
    transform-origin: 50% 95% !important;
    animation: peekLeanRight 4.6s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
  }
  @keyframes peekLeanRight {
    0%, 100% { transform: scaleX(-1) translateX(14px) translateY(-5px) rotate(13deg); }
    50% { transform: scaleX(-1) translateX(14px) translateY(-6px) rotate(13deg) scale(1.01, 0.99); }
  }
  .peeking-mode .ear.r {
    transform: rotate(22deg) scale(1.12);
    animation: earTwitch 3.5s ease-in-out infinite;
  }
  @keyframes earTwitch {
    0%, 20%, 60%, 100% { transform: rotate(22deg) scale(1.12); }
    25% { transform: rotate(28deg) scale(1.16); }
    30% { transform: rotate(21deg) scale(1.1); }
  }
  .peeking-mode .body::after {
    content: '';
    position: absolute;
    bottom: 2px;
    right: 18px;
    width: 13px;
    height: 11px;
    background: #ffb86b;
    border-radius: 6px 6px 4px 4px;
    box-shadow: inset -2px -2px 0 #e89a4a;
    transform: rotate(8deg);
  }

  /* Bubble */
  #bubble {
    position: absolute;
    bottom: 26px;
    left: 102px;
    background: #fffdf8;
    color: #2b2b36;
    padding: 7px 12px;
    border: 2px solid #f0c987;
    border-radius: 14px;
    font-size: 11px;
    font-weight: 600;
    box-shadow: 0 4px 14px rgba(0,0,0,0.35);
    white-space: nowrap;
    opacity: 0;
    transform: scale(0.85);
    transition: opacity 0.2s, transform 0.25s cubic-bezier(.34, 1.56, .64, 1);
    pointer-events: none;
    z-index: 101;
  }
  #bubble::before {
    content: '';
    position: absolute;
    top: 50%;
    left: -7px;
    margin-top: -6px;
    border: 6px solid transparent;
    border-left-width: 0;
    border-right-color: #f0c987;
  }
  #bubble.left-side {
    left: auto;
    right: 102px;
  }
  #bubble.left-side::before {
    left: auto;
    right: -7px;
    border-right-width: 0;
    border-left-width: 6px;
    border-left-color: #f0c987;
  }
  #bubble.show {
    opacity: 1;
    transform: scale(1);
  }
</style>
</head>
<body>
  <div class="mock-window" id="mockWin">
    <div class="window-bar">
      <div class="dot red"></div>
      <div class="dot yellow"></div>
      <div class="dot green"></div>
      <span class="window-title">main.js - workspace</span>
    </div>
    <div class="code-lines">
      <span class="kw">const</span> pet = <span class="fn">createPet</span>({ name: <span class="str">'qark-pet'</span> });<br>
      <span class="cm">// Watching active window &amp; media player...</span><br>
      pet.<span class="fn">on</span>(<span class="str">'fullscreen'</span>, () =&gt; pet.<span class="fn">peekEdge</span>());<br>
      pet.<span class="fn">startMonitoring</span>();
    </div>
  </div>

  <div class="screen-bezel"></div>

  <div id="pet-container" class="idle">
    <div id="flip">
      <div class="tail"></div>
      <div class="body"></div>
      <div class="ear l"></div>
      <div class="ear r"></div>
      <div class="eye l"></div>
      <div class="eye r"></div>
      <div class="blush l"></div>
      <div class="blush r"></div>
      <div class="mouth"></div>
    </div>
    <div id="bubble">Whoa, 24 browser tabs open! Keep it up!</div>
  </div>

  <script>
    const pet = document.getElementById('pet-container');
    const flip = document.getElementById('flip');
    const bubble = document.getElementById('bubble');
    const mockWin = document.getElementById('mockWin');

    window.updateScene = function(frame) {
      // 0 - 12: Idle in center
      if (frame < 12) {
        pet.className = 'idle';
        pet.style.left = '210px';
        flip.style.scale = '1 1';
        bubble.className = '';
        mockWin.className = 'mock-window';
      }
      // 12 - 28: Walk / hop to the left
      else if (frame < 28) {
        pet.className = 'walk';
        const p = (frame - 12) / 16;
        pet.style.left = (210 - p * 80) + 'px';
        flip.style.scale = '-1 1';
        bubble.className = '';
      }
      // 28 - 34: Pause & turn right
      else if (frame < 34) {
        pet.className = 'idle';
        pet.style.left = '130px';
        flip.style.scale = '1 1';
        bubble.className = '';
      }
      // 34 - 54: Walk / hop to the right
      else if (frame < 54) {
        pet.className = 'walk';
        const p = (frame - 34) / 20;
        pet.style.left = (130 + p * 130) + 'px';
        flip.style.scale = '1 1';
        bubble.className = '';
      }
      // 54 - 70: Notification appears!
      else if (frame < 70) {
        pet.className = 'idle';
        pet.style.left = '260px';
        flip.style.scale = '1 1';
        bubble.textContent = 'Whoa, 24 browser tabs open! Keep it up!';
        bubble.className = 'show';
        mockWin.className = 'mock-window';
      }
      // 70 - 88: Window goes fullscreen! Pet scurries to screen edge
      else if (frame < 88) {
        mockWin.className = 'mock-window fullscreen';
        bubble.className = '';
        pet.className = 'walk';
        const p = (frame - 70) / 18;
        pet.style.left = (260 + p * 212) + 'px';
        flip.style.scale = '1 1';
      }
      // 88 - 100: Tucks into Peeking Mode at bezel!
      else if (frame < 100) {
        mockWin.className = 'mock-window fullscreen';
        pet.className = 'peeking-mode';
        pet.style.left = '472px';
        flip.style.scale = '1 1';
        bubble.className = '';
      }
      // 100 - 120: Notification bubble appears while peeking
      else {
        mockWin.className = 'mock-window fullscreen';
        pet.className = 'peeking-mode';
        pet.style.left = '472px';
        bubble.textContent = 'Now jamming: Midnight City (M83)';
        bubble.className = 'left-side show';
      }
    };
  </script>
</body>
</html>`;

  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  await new Promise(r => setTimeout(r, 600));

  const totalFrames = 120;
  fs.mkdirSync('/tmp/demo_frames', { recursive: true });
  console.log(`Recording ${totalFrames} frames...`);

  for (let i = 0; i < totalFrames; i++) {
    await win.webContents.executeJavaScript(`window.updateScene(${i});`);
    await new Promise(r => setTimeout(r, 45));
    const img = await win.capturePage();
    fs.writeFileSync(`/tmp/demo_frames/frame_${String(i).padStart(3, '0')}.png`, img.toPNG());
  }

  console.log('Compiling assets/demo.gif...');
  execSync('convert -delay 7 -loop 0 /tmp/demo_frames/frame_*.png -layers Optimize assets/demo.gif');
  execSync('rm -rf /tmp/demo_frames');
  console.log('assets/demo.gif updated successfully!');
  app.quit();
});
