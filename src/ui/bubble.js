// Keep the bubble on screen: when the window hangs off an edge, slide the bubble inward (tail keeps pointing at the pet).
function placeBubble() {
  const bw = bubble.offsetWidth, wa = S.env.wa, m = 6;
  const left = S.wx + W / 2 - bw / 2, right = left + bw;
  let sx = 0;
  if (left < wa.x + m) sx = wa.x + m - left;
  else if (right > wa.x + wa.width - m) sx = wa.x + wa.width - m - right;
  const lim = Math.max(0, Math.min(bw / 2 - 18, (W - bw) / 2 - 2)); // also stay inside the window
  bubble.style.setProperty('--sx', clamp(sx, -lim, lim) + 'px');
}
let bubbleNid = null, bubbleSid;
function say(msg, ms = 4000, kind, nid, sid) {
  btxt.textContent = msg; bubbleNid = nid ?? null; bubbleSid = sid;
  bubble.classList.toggle('alert', kind === 'alert'); bubble.classList.toggle('open', bubbleNid !== null); bubble.classList.add('show'); placeBubble();
  clearTimeout(bubbleT); bubbleT = setTimeout(() => bubble.classList.remove('show'), ms);
}

// Click a notification bubble: ask the hub to open the sending app.
bubble.addEventListener('pointerdown', (e) => e.stopPropagation());
bubble.addEventListener('click', (e) => {
  e.stopPropagation();
  if (bubbleNid === null) return;
  fetch('/open', { method: 'POST', body: JSON.stringify({ id: bubbleNid, sid: bubbleSid }) }).catch(() => {});
  bubble.classList.remove('show', 'open'); bubbleNid = null;
});
