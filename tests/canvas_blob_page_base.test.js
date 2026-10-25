// Gemini Canvas serves AlloFlow from a blob: URL. The boot-time delivery
// policies require an http(s) base, so passing location.href there threw
// "Verified runtime: invalid base URL" and the whole app failed to start
// (2026-10-25). This runs the real top-level declarations from the host on a
// blob: page, an https page and the Desktop loopback page.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const HOST = process.env.CANVAS_BASE_HOST || 'AlloFlowANTI.txt';

function bootCode(src) {
  const ast = parser.parse(src, { sourceType: 'module', plugins: ['jsx'] });
  const decls = new Map();
  for (const node of ast.program.body) {
    if (node.type === 'FunctionDeclaration' && node.id) decls.set(node.id.name, node);
    if (node.type === 'VariableDeclaration') for (const d of node.declarations) if (d.id.type === 'Identifier') decls.set(d.id.name, node);
  }
  const need = new Set();
  const queue = ['_alloInstallRuntimeGraphHost', '_alloRuntimeGraphManifest', '_alloOptionalBrowserPolicyForPage', '_alloTrustedPageBase'].filter(n => decls.has(n));
  while (queue.length) {
    const name = queue.pop();
    if (need.has(name)) continue;
    need.add(name);
    const node = decls.get(name);
    traverse(parser.parse(src.slice(node.start, node.end), { sourceType: 'module', plugins: ['jsx'] }), {
      Identifier(p) { if (decls.has(p.node.name) && !need.has(p.node.name) && p.isReferencedIdentifier()) queue.push(p.node.name); }
    });
  }
  return [...new Set([...need].map(n => decls.get(n)))].sort((a, b) => a.start - b.start).map(n => src.slice(n.start, n.end)).join('\n');
}

const code = bootCode(readFileSync(HOST, 'utf8'));
function boot(href, hostname, pathname) {
  const location = { href, hostname, pathname, port: '' };
  const win = { location, fetch: () => Promise.reject(new Error('offline')), crypto: globalThis.crypto, Blob, URL, Worker: function () {},
    AbortController, setTimeout, clearTimeout, btoa: s => Buffer.from(s, 'binary').toString('base64'), TextDecoder, document: { baseURI: href } };
  win.window = win;
  const ctx = vm.createContext({ window: win, location, document: win.document, URL, Blob, TextDecoder, AbortController, setTimeout, clearTimeout, console });
  return vm.runInContext(code + `
    ;(function () {
      _alloInstallRuntimeGraphHost(_alloRuntimeGraphManifest, window);
      _alloOptionalBrowserPolicyForPage();
      return typeof _alloTrustedPageBase === 'function' ? _alloTrustedPageBase(location) : null;
    })()`, ctx, { timeout: 20000 });
}

describe('boot-time delivery policies accept the page they run on', () => {
  it('a Gemini Canvas blob: page boots and resolves assets against the CDN', () => {
    expect(boot('blob:https://abc-h998661601.scf.usercontent.goog/d1e1c429-f5fc-446a-9fdb-c4df264cb30d', '', '/d1e1c429'))
      .toBe('https://alloflow-cdn.pages.dev/');
  });
  it('an https page keeps its own address as the base', () => {
    const href = 'https://apomera.github.io/AlloFlow/app/index.html';
    expect(boot(href, 'apomera.github.io', '/AlloFlow/app/index.html')).toBe(href);
  });
  it('the Desktop loopback page keeps its own address as the base', () => {
    const href = 'http://127.0.0.1:41234/app/index.html';
    expect(boot(href, '127.0.0.1', '/app/index.html')).toBe(href);
  });
});
