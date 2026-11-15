// The bubble sits beside the pet: to its right on the left half of the screen, to its left on the right half.
function placeBubble() {
  const wa = S.env.wa;
  bubble.classList.toggle('left', S.wx + W / 2 > wa.x + wa.width / 2);
}
const BUBBLE_MAX = 100; // characters shown in a bubble; the full text stays in History
let bubbleNid = null, bubbleSid;
function say(msg, ms = 4000, kind, nid, sid) {
  btxt.textContent = msg.length > BUBBLE_MAX ? msg.slice(0, BUBBLE_MAX - 1).trimEnd() + '…' : msg; bubbleNid = nid ?? null; bubbleSid = sid;
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
