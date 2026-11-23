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

  /* Feature label badge on top-right */
  #feature-pill {
    position: absolute;
    top: 10px;
    right: 18px;
    background: rgba(30, 32, 48, 0.9);
    border: 1px solid #494d64;
    color: #eed49f;
    font-size: 10px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 12px;
    letter-spacing: 0.3px;
    text-transform: uppercase;
    z-index: 150;
    backdrop-filter: blur(4px);
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  }

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
    transition: transform 0.1s, height 0.1s;
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

  /* Drag & Drop States */
  .held #flip {
    transform-origin: 50% 0;
    animation: dangle .7s ease-in-out infinite;
  }
  @keyframes dangle {
    0%, 100% { transform: rotate(-7deg) scale(.95, 1.12); }
    50% { transform: rotate(7deg) scale(.95, 1.12); }
  }
  .held .eye, .fall .eye { height: 15px !important; width: 11px !important; margin-top: -3px; }
  .held .mouth, .fall .mouth { height: 8px !important; border: 2px solid #222 !important; border-radius: 50% !important; }
  
  .fall #flip {
    animation: none;
    transform: scale(.9, 1.15);
  }
  .land #flip {
    animation: squash .45s ease-out;
  }
  @keyframes squash {
    0% { transform: scale(1.35, .62); }
    45% { transform: scale(.94, 1.1); }
    100% { transform: scale(1, 1); }
  }

  /* Petting State & Heart */
  .petted #flip { animation: nuzzle .6s ease-in-out infinite; }
  @keyframes nuzzle { 50% { transform: scale(1.06, .94) rotate(-3deg); } }
  .petted .eye { height: 3px !important; margin-top: 4px; }
  .petted .blush { opacity: 1 !important; transform: scale(1.2); }
  #heart {
    position: absolute;
    top: -4px;
    left: 42%;
    font-size: 16px;
    opacity: 0;
    pointer-events: none;
    color: #f38ba8;
  }
  .petted #heart { animation: floatHeart 1.1s ease-out infinite; }
  @keyframes floatHeart {\n    0% { opacity: 1; transform: translateY(0) scale(0.8); }\n    100% { opacity: 0; transform: translateY(-24px) scale(1.2); }\n  }

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
  #bubble.alert {
    background: #fff3ef;
    border-color: #ff8a6b;
  }
  #bubble.alert::before {
    border-right-color: #ff8a6b;
  }

  /* Animated Simulated Cursor */
  #mouse-cursor {
    position: absolute;
    width: 18px;
    height: 18px;
    z-index: 200;
    opacity: 0;
    pointer-events: none;
    transition: transform 0.05s ease;
  }
  #mouse-cursor svg {
    filter: drop-shadow(0 2px 5px rgba(0,0,0,0.5));
  }
</style>
</head>
<body>
  <div id="feature-pill">qark-pet Companion</div>

  <div class="mock-window" id="mockWin">
    <div class="window-bar">
      <div class="dot red"></div>
      <div class="dot yellow"></div>
      <div class="dot green"></div>
      <span class="window-title">main.js - workspace</span>
    </div>
    <div class="code-lines">
      <span class="kw">const</span> pet = <span class="fn">createPet</span>({ name: <span class="str">'qark-pet'</span> });<br>
      <span class="cm">// Watching active window, drag physics &amp; reminders...</span><br>
      pet.<span class="fn">startHealthReminders</span>();<br>
      pet.<span class="fn">enableEdgePeeking</span>();
    </div>
  </div>

  <div class="screen-bezel"></div>

  <div id="pet-container" class="idle">
    <div id="heart">&#9829;</div>
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
    <div id=\"bubble\">focus 1/4, 25m left</div>
  </div>

  <!-- Simulated SVG Cursor -->
  <div id="mouse-cursor">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M4 3L11.5 21L14.5 13.5L22 10.5L4 3Z" fill="#ffffff" stroke="#1e2030" stroke-width="2" stroke-linejoin="round"/>
    </svg>
  </div>

  <script>
    const pet = document.getElementById('pet-container');
    const flip = document.getElementById('flip');
    const bubble = document.getElementById('bubble');
    const mockWin = document.getElementById('mockWin');
    const cursor = document.getElementById('mouse-cursor');
    const pill = document.getElementById('feature-pill');

    window.updateScene = function(frame) {
      // ----------------------------------------------------
      // SCENE 1: DRAG & DROP PHYSICS (frames 0 - 32)
      // ----------------------------------------------------
      if (frame < 8) {
        pill.textContent = 'Drag & Drop Physics';
        pill.style.color = '#f5bde6';
        mockWin.className = 'mock-window';
        pet.className = 'idle';
        pet.style.left = '215px';
        pet.style.bottom = '16px';
        flip.style.scale = '1 1';
        bubble.className = '';
        cursor.style.opacity = '1';
        const p = frame / 8;
        cursor.style.transform = 'translate(' + (180 + p * 75) + 'px, ' + (150 + p * 70) + 'px)';
      } else if (frame < 22) {
        // Dragging upward and right
        pill.textContent = 'Drag & Drop Physics';
        pill.style.color = '#f5bde6';
        pet.className = 'held';
        const p = (frame - 8) / 14;
        const curX = 215 + Math.sin(p * Math.PI) * 20;
        const curY = 16 + p * 80;
        pet.style.left = curX + 'px';
        pet.style.bottom = curY + 'px';
        cursor.style.opacity = '1';
        cursor.style.transform = 'translate(' + (curX + 40) + 'px, ' + (300 - curY - 75) + 'px)';
      } else if (frame < 27) {
        // Falling down under gravity
        pill.textContent = 'Gravity Fall';
        pill.style.color = '#f5bde6';
        pet.className = 'fall';
        const p = (frame - 22) / 5;
        // Ease in quad for gravity acceleration
        const fallBottom = 96 - (p * p) * 80;
        pet.style.bottom = Math.max(16, fallBottom) + 'px';
        cursor.style.opacity = '0.3';
      } else if (frame < 33) {
        // Landed with squash bounce
        pill.textContent = 'Squash & Land Physics';
        pill.style.color = '#a6da95';
        pet.className = 'land';
        pet.style.bottom = '16px';
        cursor.style.opacity = '0';
      }
      // ----------------------------------------------------
      // SCENE 2: PETTING INTERACTION (frames 33 - 54)
      // ----------------------------------------------------
      else if (frame < 55) {
        pill.textContent = 'Petting Interaction';
        pill.style.color = '#f38ba8';
        pet.className = 'petted';
        pet.style.left = '215px';
        pet.style.bottom = '16px';
        flip.style.scale = '1 1';
        cursor.style.opacity = '1';
        const strokeX = 245 + Math.sin((frame - 33) * 0.45) * 22;
        const strokeY = 225 + Math.cos((frame - 33) * 0.45) * 4;
        cursor.style.transform = 'translate(' + strokeX + 'px, ' + strokeY + 'px)';
        bubble.className = '';
      }
      // ----------------------------------------------------
      // SCENE 3: POMODORO TIMER STATUS (frames 55 - 75)
      // ----------------------------------------------------
      else if (frame < 75) {
        pill.textContent = 'Pomodoro Timer';
        pill.style.color = '#8aadf4';
        cursor.style.opacity = '1';
        cursor.style.transform = 'translate(255px, 225px) scale(0.9)';
        pet.className = 'idle';
        pet.style.left = '215px';
        bubble.textContent = 'focus 1/4, 25m left';
        bubble.className = 'show';
      }
      // ----------------------------------------------------
      // SCENE 4: HYDRATION REMINDER (frames 75 - 94)
      // ----------------------------------------------------
      else if (frame < 94) {
        pill.textContent = 'Hydration Reminder';
        pill.style.color = '#8bd5ca';
        cursor.style.opacity = '0';
        pet.className = 'idle';
        pet.style.left = '215px';
        bubble.textContent = 'time for some water';
        bubble.className = 'show alert';
      }
      // ----------------------------------------------------
      // SCENE 5: 20-20-20 EYE STRAIN REST (frames 94 - 114)
      // ----------------------------------------------------
      else if (frame < 114) {
        pill.textContent = '20-20-20 Eye Rest';
        pill.style.color = '#a6da95';
        cursor.style.opacity = '0';
        pet.className = 'idle';
        pet.style.left = '215px';
        bubble.textContent = '20-20-20: look 20ft away for 20s';
        bubble.className = 'show';
      }
      // ----------------------------------------------------
      // SCENE 6: WORKSPACE ROAMING (frames 114 - 134)
      // ----------------------------------------------------
      else if (frame < 134) {
        pill.textContent = 'Workspace Roaming';
        pill.style.color = '#c6a0f6';
        cursor.style.opacity = '0';
        bubble.className = '';
        pet.className = 'walk';
        if (frame < 124) {
          // Hop left
          const p = (frame - 114) / 10;
          pet.style.left = (215 - p * 65) + 'px';
          flip.style.scale = '-1 1';
        } else {
          // Hop right
          const p = (frame - 124) / 10;
          pet.style.left = (150 + p * 110) + 'px';
          flip.style.scale = '1 1';
        }
      }
      // ----------------------------------------------------
      // SCENE 7: CLUTTER AWARENESS (frames 134 - 152)
      // ----------------------------------------------------
      else if (frame < 152) {
        pill.textContent = 'Clutter Awareness';
        pill.style.color = '#f5a97f';
        pet.className = 'idle';
        pet.style.left = '260px';
        flip.style.scale = '1 1';
        bubble.textContent = 'Whoa, 24 browser tabs open! Keep it up!';
        bubble.className = 'show';
        mockWin.className = 'mock-window';
      }
      // ----------------------------------------------------
      // SCENE 8: FULLSCREEN DETECTION & SCURRY (frames 152 - 170)
      // ----------------------------------------------------
      else if (frame < 170) {
        pill.textContent = 'Fullscreen Detection';
        pill.style.color = '#ed8796';
        mockWin.className = 'mock-window fullscreen';
        bubble.className = '';
        pet.className = 'walk';
        const p = (frame - 152) / 18;
        pet.style.left = (260 + p * 212) + 'px';
        flip.style.scale = '1 1';
      }
      // ----------------------------------------------------
      // SCENE 9: EDGE PEEKING MODE (frames 170 - 186)
      // ----------------------------------------------------
      else if (frame < 186) {
        pill.textContent = 'Edge Peeking Mode';
        pill.style.color = '#eed49f';
        mockWin.className = 'mock-window fullscreen';
        pet.className = 'peeking-mode';
        pet.style.left = '472px';
        flip.style.scale = '1 1';
        bubble.className = '';
      }
      // ----------------------------------------------------
      // SCENE 10: PEEKING NOTIFICATION - MPRIS MEDIA (frames 186 - 205)
      // ----------------------------------------------------
      else {
        pill.textContent = 'Peeking Notification';
        pill.style.color = '#8aadf4';
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

  const totalFrames = 205;
  fs.mkdirSync('/tmp/demo_frames', { recursive: true });
  console.log(`Recording ${totalFrames} frames...`);

  for (let i = 0; i < totalFrames; i++) {
    await win.webContents.executeJavaScript(`window.updateScene(${i});`);
    await new Promise(r => setTimeout(r, 30));
    const img = await win.capturePage();
    fs.writeFileSync(`/tmp/demo_frames/frame_${String(i).padStart(3, '0')}.png`, img.toPNG());
  }

  console.log('Compiling assets/demo.gif...');
  execSync('convert -delay 7 -loop 0 /tmp/demo_frames/frame_*.png -layers Optimize assets/demo.gif');
  execSync('rm -rf /tmp/demo_frames');
  console.log('assets/demo.gif updated successfully!');
  app.quit();
});
