// Zero-dependency event hub + static server for the pet.
// POST /event  {"msg":"herdr done","mood":"happy","ttl":5000}  -> pushed to pet via SSE
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PET_PORT || 7777;
const ROOT = path.join(__dirname, 'src');
const clients = new Set();
const openHandlers = []; // subscribers to bubble clicks (POST /open), see onOpen()

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };

http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/event') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      let ev;
      try { ev = JSON.parse(body || '{}'); } catch { res.writeHead(400); return res.end('bad json'); }
      const data = `data: ${JSON.stringify(ev)}\n\n`;
      clients.forEach((c) => c.write(data));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, listeners: clients.size }));
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/open') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try { const m = JSON.parse(body || '{}'); openHandlers.forEach((fn) => fn(m)); } catch {}
      res.writeHead(200); res.end('ok');
    });
    return;
  }

  if (req.url === '/stream') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(': hi\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  const pathname = req.url.split('?')[0];
  const file = path.join(ROOT, pathname === '/' ? 'index.html' : pathname);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
}).listen(PORT, '127.0.0.1', () => console.log(`pet on http://127.0.0.1:${PORT}`));

// Register a handler for bubble clicks: fn({ id }).
module.exports = { onOpen: (fn) => openHandlers.push(fn) };
