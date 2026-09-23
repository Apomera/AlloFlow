// Serve the AlloFlow working tree the way Cloudflare Pages serves the repo root,
// on http://localhost:3000 so the shell's own local mode (usesLocalModuleAssets)
// rewrites https://alloflow-cdn.pages.dev/<m> to ./<m>. Under /app/ that becomes
// /app/<m>, which we resolve to the repo root, as the CDN resolves the original URL.
//
// CDN semantics kept on purpose:
//  - a missing path returns the ROOT index.html (marketing page) as 200 text/html,
//    exactly what Pages does with no 404.html (the "404-as-HTML" behaviour);
//  - /app/vendor/<x> WITHOUT a ?v= pin is the shell's relative './vendor/...' request,
//    which the CDN resolves to /app/vendor/<x> (absent) -> fallback HTML. A pinned
//    /app/vendor/<x>?v= came from a localized CDN URL and maps to root vendor/<x>;
//  - brotli for text types, Cache-Control max-age=0 must-revalidate (Pages default).
// Plain HTTP/1.1 (browsers have no h2 without TLS); report that difference.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT = process.argv[2] || 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const PORT = Number(process.argv[3] || 3000);
const LOG = process.argv[4] || '';
const BR_QUALITY = Number(process.env.BR_QUALITY || 5);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.mjs': 'application/javascript',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
  '.onnx': 'application/octet-stream', '.bin': 'application/octet-stream', '.xml': 'application/xml', '.webmanifest': 'application/manifest+json',
};
const COMPRESSIBLE = /^(text\/|application\/(javascript|json|xml|manifest\+json)|image\/svg)/;
const brCache = new Map();
const stats = { app: 0, appFromRoot: 0, appFallback: 0, root: 0, rootFallback: 0 };
const logStream = LOG ? fs.createWriteStream(LOG, { flags: 'a' }) : null;

const safeJoin = (base, rel) => {
  const p = path.resolve(base, '.' + rel);
  return p.startsWith(path.resolve(base)) ? p : null;
};
const isFile = (p) => { try { return !!p && fs.statSync(p).isFile(); } catch (_) { return false; } };
const isDir = (p) => { try { return !!p && fs.statSync(p).isDirectory(); } catch (_) { return false; } };

function resolveRequest(pathname, search) {
  // returns { file, kind } ; kind: app | appFromRoot | appFallback | root | rootFallback | redirect
  if (pathname === '/app') return { redirect: '/app/' };
  if (pathname.startsWith('/app/')) {
    let rel = pathname.slice(4); // keep leading '/'
    if (rel.endsWith('/')) rel += 'index.html';
    const inApp = safeJoin(path.join(ROOT, 'app'), rel);
    if (isFile(inApp)) return { file: inApp, kind: 'app' };
    const pinned = /(^|&)v=/.test((search || '').replace(/^\?/, ''));
    if (rel.startsWith('/vendor/') && !pinned) return { file: path.join(ROOT, 'index.html'), kind: 'appFallback' };
    const inRoot = safeJoin(ROOT, rel);
    if (isFile(inRoot)) return { file: inRoot, kind: 'appFromRoot' };
    return { file: path.join(ROOT, 'index.html'), kind: 'appFallback' };
  }
  let rel = pathname;
  const p = safeJoin(ROOT, rel);
  if (isDir(p)) {
    if (!rel.endsWith('/')) return { redirect: rel + '/' };
    const idx = path.join(p, 'index.html');
    if (isFile(idx)) return { file: idx, kind: 'root' };
  }
  if (isFile(p)) return { file: p, kind: 'root' };
  if (isFile(p + '.html')) return { file: p + '.html', kind: 'root' };
  return { file: path.join(ROOT, 'index.html'), kind: 'rootFallback' };
}

function body(file, type, acceptEnc) {
  const st = fs.statSync(file);
  const raw = fs.readFileSync(file);
  if (!COMPRESSIBLE.test(type) || !/\bbr\b/.test(acceptEnc || '') || raw.length < 1024) return { buf: raw, enc: null, st };
  const key = file + ':' + st.mtimeMs + ':' + st.size;
  let buf = brCache.get(key);
  if (!buf) {
    buf = zlib.brotliCompressSync(raw, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: BR_QUALITY, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: raw.length } });
    brCache.set(key, buf);
  }
  return { buf, enc: 'br', st };
}

const server = http.createServer((req, res) => {
  const t0 = Date.now();
  let u;
  try { u = new URL(req.url, 'http://localhost'); } catch (_) { res.writeHead(400); res.end(); return; }
  let pathname;
  try { pathname = decodeURIComponent(u.pathname); } catch (_) { pathname = u.pathname; }
  const r = resolveRequest(pathname, u.search);
  if (r.redirect) { res.writeHead(308, { Location: r.redirect + u.search }); res.end(); return; }
  stats[r.kind]++;
  const ext = path.extname(r.file).toLowerCase();
  const type = TYPES[ext] || 'application/octet-stream';
  let out;
  try { out = body(r.file, type, req.headers['accept-encoding']); } catch (e) { res.writeHead(500); res.end(String(e)); return; }
  const etag = '"' + out.st.size.toString(16) + '-' + Math.round(out.st.mtimeMs).toString(16) + (out.enc ? '-br' : '') + '"';
  if (req.headers['if-none-match'] === etag) { res.writeHead(304, { ETag: etag }); res.end(); return; }
  const headers = { 'Content-Type': type, 'Cache-Control': 'public, max-age=0, must-revalidate', ETag: etag, 'Content-Length': out.buf.length, 'Access-Control-Allow-Origin': '*', Vary: 'Accept-Encoding' };
  if (out.enc) headers['Content-Encoding'] = out.enc;
  res.writeHead(200, headers);
  res.end(req.method === 'HEAD' ? undefined : out.buf);
  if (logStream) logStream.write(JSON.stringify({ t: t0, ms: Date.now() - t0, url: req.url, kind: r.kind, file: path.relative(ROOT, r.file), bytes: out.buf.length }) + '\n');
});
server.listen(PORT, '127.0.0.1', () => console.log(`[serve_tree] http://localhost:${PORT}/app/  root=${ROOT}  br=${BR_QUALITY}`));
process.on('SIGINT', () => { console.log('[serve_tree] stats', JSON.stringify(stats)); process.exit(0); });
setInterval(() => { if (logStream) logStream.write(JSON.stringify({ stats }) + '\n'); }, 60000).unref();
