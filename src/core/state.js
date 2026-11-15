if (location.search.includes('bare')) document.body.classList.add('bare');
const pet = document.getElementById('pet'), flip = document.getElementById('flip'), bubble = document.getElementById('bubble'), btxt = document.getElementById('btxt');
const eyes = document.querySelectorAll('.eye');
// Window is W x H; the pet sits at a fixed spot inside it. The window itself is what moves on screen.
const { W, H, PAD } = PET_CONFIG;
const PET_CX = W / 2, PET_CY = H - 24 - 40;
let bubbleT;
let lastSent = '';
let lastCur = null;
// Mutable state shared across modules, in one place (the rest of each file's top-level is module-private).
const S = {
  state: 'idle', dir: 1, lock: false, thinking: false, showing: false, dnd: false, drinkN: 0,
  lastActivity: Date.now(), lastMove: 0, lastPoke: Date.now(),
  wx: 0, wy: 0, tx: 0, ty: 0, vy: 0, synced: false,
  env: { cursor: { x: 0, y: 0 }, active: null, wa: { x: 0, y: 0, width: 1920, height: 1080 } },
  drag: null, justDragged: false,
};
// The window has empty space on each side of the pet (see PAD); let it hang off-screen so the pet itself reaches the edges.
const minX = () => S.env.wa.x - PAD, maxX = () => S.env.wa.x + S.env.wa.width - W + PAD;
const floorY = () => S.env.wa.y + S.env.wa.height - H;
const busy = () => S.drag || S.state === 'fall' || S.state === 'land' || S.state === 'petted';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function setState(s) { S.state = s; pet.className = s; }
