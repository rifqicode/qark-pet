// --- spot picking: stay out of the active (typing) window ---
function score(px, py) {
  return S.env.active ? PetLogic.overlap({ x: px, y: py, w: W, h: H }, S.env.active) : 0;
}
function pickSpot() {
  const c = [], fy = floorY();
  for (let i = 0; i < 14; i++) c.push([minX() + Math.random() * (maxX() - minX()), fy]);
  c.push([maxX(), fy], [minX(), fy]);
  return PetLogic.bestSpot(c, score, S.wx, S.wy, Math.random);
}
// Typing = an active window is under the pet and the mouse has been still for 3s.
const typingNow = () => !!S.env.active && Date.now() - S.lastMove > 3000 && score(S.wx, S.wy) > 0;
function goTo(p) { S.tx = p.x; S.ty = p.y; setState('walk'); }
