// Herdr integration: focus the agent pane a notification refers to.
// Herdr notifications carry no target, so the agent is picked from `herdr agent list`.
const { execFile } = require('child_process');

// Pure: the agent whose project dir or title appears in the notification text,
// otherwise the one that changed state most recently. Returns undefined for an empty list.
function pickAgent(agents, text) {
  const t = (text || '').toLowerCase();
  const hit = (a) => {
    const dir = (a.cwd || '').split('/').filter(Boolean).pop();
    const title = a.terminal_title_stripped || '';
    return (dir && t.includes(dir.toLowerCase())) || (title.length > 8 && t.includes(title.toLowerCase().slice(0, 40)));
  };
  const byRecent = (a, b) => (b.state_change_seq || 0) - (a.state_change_seq || 0);
  return agents.filter(hit).sort(byRecent)[0] || agents.slice().sort(byRecent)[0];
}

function focusHerdr(text) {
  execFile('herdr', ['agent', 'list'], { timeout: 5000 }, (err, out) => {
    if (err) return;
    let agents;
    try { agents = JSON.parse(out).result.agents; } catch { return; }
    const pick = pickAgent(agents, text);
    if (pick) execFile('herdr', ['agent', 'focus', pick.pane_id], () => {});
  });
}

module.exports = { pickAgent, focusHerdr };
