// Minimal Streamable-HTTP MCP client for driving the alloflow-remediation connector.
//   node bridge.cjs init
//   node bridge.cjs call <tool> '<json>' | @args.json   [--out result.json] [--images dir]
// The server is started separately (see server.log). Session id persists in session.txt.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const here = __dirname;
const PORT = Number(process.env.BRIDGE_PORT || fs.readFileSync(path.join(here, 'port.txt'), 'utf8').trim());
const TOKEN = fs.readFileSync(path.join(here, 'token.txt'), 'utf8').trim();
const sessionFile = path.join(here, 'session.txt');
let nextId = Date.now();

function post(body, headers = {}) {
  return new Promise((res, rej) => {
    const data = JSON.stringify(body);
    const req = http.request({ host: '127.0.0.1', port: PORT, path: '/mcp', method: 'POST', headers: {
      'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream',
      'Authorization': 'Bearer ' + TOKEN, 'Content-Length': Buffer.byteLength(data), ...headers } }, (r) => {
      let b = ''; r.setEncoding('utf8'); r.on('data', (d) => b += d);
      r.on('end', () => {
        const ct = String(r.headers['content-type'] || '');
        let parsed = null;
        if (/json/.test(ct) && b) parsed = JSON.parse(b);
        else if (/event-stream/.test(ct) && b) {
          // take the last data: line carrying a JSON-RPC reply with our id
          for (const line of b.split('\n')) if (line.startsWith('data:')) { try { const j = JSON.parse(line.slice(5).trim()); if (j && (j.id !== undefined)) parsed = j; } catch (_) {} }
        }
        res({ status: r.statusCode, headers: r.headers, body: parsed, raw: b });
      });
    });
    req.on('error', rej); req.setTimeout(120000, () => req.destroy(new Error('timeout'))); req.end(data);
  });
}
function sessionHeaders() { try { return { 'Mcp-Session-Id': fs.readFileSync(sessionFile, 'utf8').trim() }; } catch (_) { return {}; } }

async function init() {
  const r = await post({ jsonrpc: '2.0', id: nextId++, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'claude-bridge', version: '1' } } });
  if (r.status !== 200) throw new Error('initialize failed: ' + r.status + ' ' + r.raw.slice(0, 300));
  const sid = r.headers['mcp-session-id']; if (sid) fs.writeFileSync(sessionFile, String(sid));
  await post({ jsonrpc: '2.0', method: 'notifications/initialized' }, sessionHeaders());
  console.log(JSON.stringify({ serverInfo: r.body.result.serverInfo, session: sid || null }));
}

async function call(tool, args, opts) {
  const r = await post({ jsonrpc: '2.0', id: nextId++, method: 'tools/call', params: { name: tool, arguments: args } }, sessionHeaders());
  if (!r.body) throw new Error('no JSON reply: status ' + r.status + ' ' + r.raw.slice(0, 500));
  const result = r.body.result || r.body.error;
  // save image blocks to disk instead of dumping base64 into the console
  const images = [];
  if (result && Array.isArray(result.content)) {
    let n = 0;
    for (const block of result.content) {
      if (block && block.type === 'image' && block.data) {
        const dir = opts.images || path.join(here, 'images'); fs.mkdirSync(dir, { recursive: true });
        const ext = /png/.test(block.mimeType || '') ? 'png' : 'jpg';
        const file = path.join(dir, (opts.prefix || 'img') + '-' + (n++) + '.' + ext);
        fs.writeFileSync(file, Buffer.from(block.data, 'base64'));
        images.push({ file, mimeType: block.mimeType, bytes: Buffer.byteLength(block.data, 'base64'), meta: block._meta || block.meta || null });
        block.data = '[saved:' + file + ']';
      }
    }
  }
  const out = { status: r.status, isError: !!(result && result.isError), structuredContent: result && result.structuredContent, images, error: r.body.error || null, content: result && result.content };
  if (opts.out) fs.writeFileSync(opts.out, JSON.stringify(out, null, 2));
  const brief = { status: out.status, isError: out.isError, error: out.error, images: images.map(i => ({ file: i.file, bytes: i.bytes, meta: i.meta })) };
  if (out.structuredContent !== undefined) brief.structuredContent = out.structuredContent;
  else if (result && result.content) brief.text = result.content.filter(c => c.type === 'text').map(c => c.text).join('\n');
  const s = JSON.stringify(brief, null, opts.compact ? 0 : 1);
  console.log(opts.max ? s.slice(0, opts.max) + (s.length > opts.max ? '\n…[truncated ' + s.length + ' chars; full result in ' + (opts.out || 'stdout') + ']' : '') : s);
}

(async () => {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === 'init') return init();
  if (cmd === 'call') {
    const tool = rest[0]; let argText = rest[1] || '{}'; const opts = { max: 6000 };
    for (let i = 2; i < rest.length; i++) { if (rest[i] === '--out') opts.out = rest[++i]; else if (rest[i] === '--images') opts.images = rest[++i]; else if (rest[i] === '--prefix') opts.prefix = rest[++i]; else if (rest[i] === '--max') opts.max = Number(rest[++i]); else if (rest[i] === '--compact') opts.compact = true; }
    if (argText.startsWith('@')) argText = fs.readFileSync(argText.slice(1), 'utf8');
    return call(tool, JSON.parse(argText), opts);
  }
  throw new Error('usage: init | call <tool> <json|@file> [--out f] [--images dir] [--prefix p] [--max n]');
})().catch((e) => { console.error('BRIDGE ERROR', e.message); process.exit(1); });
