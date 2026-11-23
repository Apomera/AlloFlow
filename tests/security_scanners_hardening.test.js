import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const xssScanner = require('../dev-tools/check_xss_surface.cjs');
const evalScanner = require('../dev-tools/check_eval.cjs');
const corsScanner = require('../dev-tools/check_cors_strict.cjs');

function withTempWorkspace(prefix, setup, fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const put = (relPath, content) => {
    const abs = path.join(root, relPath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, 'utf8');
    return abs;
  };
  try {
    if (setup) setup(root, put);
    return fn(root, put);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

describe('dev-tools/check_xss_surface.cjs hardening', () => {
  const scaffoldCleanRepo = (root, put) => {
    put('AlloFlowANTI.txt', 'export function App() { return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(x) }} />; }\n');
    fs.mkdirSync(path.join(root, 'stem_lab'), { recursive: true });
    fs.mkdirSync(path.join(root, 'sel_hub'), { recursive: true });
    put('stem_lab/stem_tool_clean.js', 'const el = document.createElement("div"); el.innerHTML = "";\n');
    put('sel_hub/sel_tool_clean.js', 'const h = () => React.createElement("style", { dangerouslySetInnerHTML: { __html: ".a{color:red}" } });\n');
    put('baseline.json', JSON.stringify({ accepted: {} }));
  };

  it('passes clean static, sanitized, translation-key, inline-escaped, and comparison sites', () => {
    const src = `
      export function Safe({ userInput, orig }) {
        const a = <div dangerouslySetInnerHTML={{ __html: '<b>static</b>' }} />;
        const b = <div dangerouslySetInnerHTML={{ __html: \`<span>no interp</span>\` }} />;
        const c = <div dangerouslySetInnerHTML={{ __html: t('ui.welcome') }} />;
        const d = <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />;
        const e = <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(userInput) }} />;
        const f = <div dangerouslySetInnerHTML={{ __html: \`<p>\${escapeHtml(userInput)} (\${items.length})</p>\` }} />;
        const g = <div dangerouslySetInnerHTML={{ __html: userInput.replace(/&/g, '&amp;').replace(/</g, '&lt;') }} />;
        const h = React.createElement('div', { dangerouslySetInnerHTML: { __html: '<svg></svg>' } });
        el.innerHTML = '';
        el.innerHTML = '<span>' + escapeHtml(userInput) + '</span>';
        const same = el.outerHTML === orig;
        return same ? a : h;
      }
    `;
    const findings = xssScanner.scanSource(src, 'sample_source.jsx');
    expect(findings.length).toBeGreaterThanOrEqual(10);
    expect(findings.filter(f => f.severity === 'suspect')).toEqual([]);
  });

  it('catches compiled-JS dangerouslySetInnerHTML, interpolated templates, partial escapes, and raw DOM HTML sinks', () => {
    const src = `
      const a = React.createElement('div', { dangerouslySetInnerHTML: { __html: rawAiHtml } });
      const b = <div dangerouslySetInnerHTML={{ __html: \`<div>\${userInput}</div>\` }} />;
      el.innerHTML = \`<p>\${userInput}</p>\`;
      el.innerHTML += escapeHtml(safePart) + rawPart;
      el.outerHTML = dynamicHtml;
      el.insertAdjacentHTML('beforeend', \`<span>\${untrusted}</span>\`);
      document.write(untrustedDoc);
      printWin.document.writeln(\`<p>\${untrustedPrint}</p>\`);
    `;
    const findings = xssScanner.scanSource(src, 'bad_source.jsx');
    const suspect = findings.filter(f => f.severity === 'suspect');
    expect(suspect.map(f => f.sink)).toEqual([
      'js:dangerouslySetInnerHTML',
      'jsx:dangerouslySetInnerHTML',
      'dom:innerHTML',
      'dom:innerHTML',
      'dom:outerHTML',
      'dom:insertAdjacentHTML',
      'dom:document.write',
      'dom:document.writeln',
    ]);
    expect(suspect[1].kind).toBe('interpolated-template');
    expect(suspect[2].kind).toBe('interpolated-template');
    expect(suspect[3].kind).toBe('partially-escaped-concat');
    expect(suspect[5].kind).toBe('interpolated-template');
  });

  it('exits 0 on clean repo, exits 1 on new unbaselined compiled-JS/DOM XSS regressions, and exits 2 on parse errors', () => {
    withTempWorkspace('alloflow-xss-test-', scaffoldCleanRepo, (root, put) => {
      const logs = [];
      const baselinePath = path.join(root, 'baseline.json');

      expect(xssScanner.main(['--quiet', `--baseline=${baselinePath}`], { root, write: l => logs.push(l) })).toBe(0);

      // Inject a compiled-JS dangerouslySetInnerHTML regression in stem_lab/
      put('stem_lab/stem_tool_bad.js', 'const bad = h("div", { dangerouslySetInnerHTML: { __html: rawUserHtml } });\n');
      expect(xssScanner.main(['--quiet', `--baseline=${baselinePath}`], { root, write: l => logs.push(l) })).toBe(1);

      // Baseline that exact site -> passes; add a second site -> fails again (ratchet)
      expect(xssScanner.main(['--update-baseline', `--baseline=${baselinePath}`], { root, write: () => {} })).toBe(0);
      expect(xssScanner.main(['--quiet', `--baseline=${baselinePath}`], { root, write: () => {} })).toBe(0);

      put('stem_lab/stem_tool_bad.js', 'const bad = h("div", { dangerouslySetInnerHTML: { __html: rawUserHtml } });\nbox.innerHTML = `<p>${evil}</p>`;\n');
      expect(xssScanner.main(['--quiet', `--baseline=${baselinePath}`], { root, write: () => {} })).toBe(1);

      // Syntax error must fail closed with exit 2 (never silently skipped)
      put('stem_lab/stem_tool_broken.js', 'function broken( { return ;;;\n');
      expect(xssScanner.main(['--quiet', `--baseline=${baselinePath}`], { root, write: () => {} })).toBe(2);
    });
  });

  it('rejects red-team bypasses (prefix numeric regex, non-outermost replace, unsafe join separator, leaky IIFE, multi-arg document.write)', () => {
    const bypasses = [
      'el.innerHTML = `<p>${Number(count) + userInput}</p>`;',
      'el.innerHTML = `<p>${Math.floor(x) ? userInput : "ok"}</p>`;',
      'el.innerHTML = buildUnsafe(a.replace(/&/g, "&amp;").replace(/</g, "&lt;"), rawEvil);',
      'el.innerHTML = flag ? rawEvil : a.replace(/&/g, "&amp;").replace(/</g, "&lt;");',
      'el.innerHTML = `<ul>${items.map(x => escapeHtml(x)).join(rawEvil)}</ul>`;',
      'el.innerHTML = (() => { escapeHtml(a); return rawEvil; })();',
      'document.write("<p>", rawEvil, "</p>");',
      'document.writeln("<div>", escapeHtml(ok), rawEvil, "</div>");',
    ];
    for (const snippet of bypasses) {
      const findings = xssScanner.scanSource(snippet, 'redteam_source.jsx');
      expect(findings.length, `expected finding for: ${snippet}`).toBe(1);
      expect(findings[0].severity, `must be suspect for: ${snippet}`).toBe('suspect');
    }

    // Confirm safe counterparts STILL pass as safe
    const safeCounterparts = [
      'el.innerHTML = `<p>${Number(count)}</p>`;',
      'el.innerHTML = `<ul>${items.map(x => escapeHtml(x)).join("</li><li>")}</ul>`;',
      'el.innerHTML = (() => { return escapeHtml(a); })();',
      'document.write("<p>", escapeHtml(ok), "</p>");',
    ];
    for (const snippet of safeCounterparts) {
      const findings = xssScanner.scanSource(snippet, 'safe_source.jsx');
      expect(findings.length, `expected finding for: ${snippet}`).toBe(1);
      expect(findings[0].severity, `must be safe for: ${snippet}`).toBe('safe');
    }
  });
});

describe('dev-tools/check_eval.cjs hardening', () => {
  const scaffoldCleanRepo = (root, put) => {
    put('AlloFlowANTI.txt', 'export const App = () => <div>Clean</div>;\n');
    for (const dir of evalScanner.SOURCE_DIRS) {
      fs.mkdirSync(path.join(root, dir), { recursive: true });
      put(path.join(dir, 'clean.js'), 'export const ok = () => setTimeout(() => {}, 10);\n');
    }
    put('eval_baseline.json', JSON.stringify({ accepted: {} }));
  };

  it('detects direct eval, indirect eval, new Function, bare Function(), and string timers in JS/JSX/TS', () => {
    const jsx = `
      export function Bad({ code }: { code: string }) {
        eval(code);
        (0, eval)(code);
        window.eval(code);
        globalThis['eval'](code);
        new Function('a', code);
        Function('return ' + code)();
        setTimeout('alert(1)', 10);
        setTimeout('alert(' + code + ')', 10);
        window.setInterval(\`run(\${code})\`, 100);
        setTimeout(() => console.log('safe'), 10);
        return <span>ok</span>;
      }
    `;
    const findings = evalScanner.scanSource(jsx, 'bad_component.tsx');
    expect(findings.map(f => f.kind)).toEqual([
      'eval',
      'indirect-eval',
      'indirect-eval',
      'indirect-eval',
      'new Function',
      'Function()',
      'setTimeout(string)',
      'setTimeout(string)',
      'setInterval(string)',
    ]);
  });

  it('covers expanded directories (host, *_source.jsx, desktop/mcp, catalog, services, apps_script) and fails closed on parse errors', () => {
    withTempWorkspace('alloflow-eval-test-', scaffoldCleanRepo, (root, put) => {
      const baselinePath = path.join(root, 'eval_baseline.json');

      expect(evalScanner.main(['--strict', '--quiet', `--baseline=${baselinePath}`], { root, write: () => {} })).toBe(0);

      // Bare Function() inside a JSX source file
      put('sample_source.jsx', 'export const Calc = ({ x }) => <span>{Function("return " + x)()}</span>;\n');
      expect(evalScanner.main(['--strict', '--quiet', `--baseline=${baselinePath}`], { root, write: () => {} })).toBe(1);
      fs.unlinkSync(path.join(root, 'sample_source.jsx'));

      // eval inside desktop/mcp and apps_script
      put('apps_script/bad.gs', 'function run(x) { return eval(x); }\n');
      expect(evalScanner.main(['--strict', '--quiet', `--baseline=${baselinePath}`], { root, write: () => {} })).toBe(1);
      fs.unlinkSync(path.join(root, 'apps_script/bad.gs'));

      // eval inside TypeScript service
      put('services/svc.ts', 'export const run = (x: string): unknown => (0, eval)(x);\n');
      expect(evalScanner.main(['--strict', '--quiet', `--baseline=${baselinePath}`], { root, write: () => {} })).toBe(1);
      fs.unlinkSync(path.join(root, 'services/svc.ts'));

      // Parse error must fail closed with exit 2 (never silently skipped)
      put('catalog/broken.js', 'const broken = {{{;\n');
      expect(evalScanner.main(['--strict', '--quiet', `--baseline=${baselinePath}`], { root, write: () => {} })).toBe(2);
    });
  });
});

describe('dev-tools/check_cors_strict.cjs hardening', () => {
  const scaffoldCleanRepo = (root, put) => {
    put('desktop/web-app/functions/index.js', `
      function applyCors(req, res) {
        const origin = String(req.get("Origin") || "");
        if (!origin || !configuredOrigins().has(origin)) return false;
        res.set("Access-Control-Allow-Origin", origin);
        return true;
      }
    `);
    put('catalog/cloudflare-worker/src/index.js', `
      const corsHeaders = { 'Access-Control-Allow-Origin': '*' };
      function jsonResponse(body) { return new Response(JSON.stringify(body), { headers: { ...corsHeaders } }); }
      function adminJsonResponse(body) { return new Response(JSON.stringify(body), { headers: { 'Cross-Origin-Resource-Policy': 'same-origin' } }); }
      function adminBugResponse(body) { return new Response(JSON.stringify(body), { headers: { 'Cross-Origin-Resource-Policy': 'same-origin' } }); }
      async function handleBugList() { return adminBugResponse({ ok: true }); }
      const ADMIN_ROUTES = new Set(['/bugs']);
      export default { fetch(request) {
        const url = new URL(request.url);
        if (request.method === 'OPTIONS') {
          if (ADMIN_ROUTES.has(url.pathname)) return new Response(null, { status: 204 });
          return new Response(null, { status: 204, headers: { ...corsHeaders } });
        }
        return jsonResponse({ ok: true });
      }};
    `);
    put('catalog/bug-digest-worker/src/index.js', 'export default { fetch() { return new Response("ok"); } };\n');
    put('services/alloflow-remote-mcp/src/pilot-index.ts', 'export const cfg = { allowedOriginHostnames: ["claude.ai", "chatgpt.com"] };\n');
    put('tts-server/edge_tts_server.py', `
def is_allowed_origin(origin):
    return origin == "https://alloflow-cdn.pages.dev"
def add_cors(self):
    origin = self.headers.get("Origin")
    if origin and is_allowed_origin(origin):
        self.send_header("Access-Control-Allow-Origin", origin)
`);
    put('_headers', `
/*
  X-Content-Type-Options: nosniff
/axe-core/*
  Access-Control-Allow-Origin: *
/pdfjs-dist/*
  Access-Control-Allow-Origin: *
/app/*
  X-Frame-Options: SAMEORIGIN
`);
  };

  it('passes clean multi-surface repo with allowlisted static vendor routes and isolated worker CORS', () => {
    withTempWorkspace('alloflow-cors-clean-', scaffoldCleanRepo, (root) => {
      const result = corsScanner.scanCors({ root });
      expect(result.exitCode).toBe(0);
      expect(result.violations).toEqual([]);
      expect(result.omissions).toEqual([]);
      expect(result.allowlisted.length).toBe(3); // catalog corsHeaders + /axe-core/* + /pdfjs-dist/*
      expect(result.safe.length).toBe(2);        // firebase functions + edge_tts_server.py
    });
  });

  it('blocks wildcard CORS on Firebase Functions, admin worker routes, bug-digest, remote MCP, TTS servers, and non-public _headers routes', () => {
    // 1. Firebase Function wildcard
    withTempWorkspace('alloflow-cors-fn-', scaffoldCleanRepo, (root, put) => {
      put('desktop/web-app/functions/index.js', 'res.set("Access-Control-Allow-Origin", "*");\n');
      const res = corsScanner.scanCors({ root });
      expect(res.exitCode).toBe(1);
      expect(res.violations.some(v => v.scope === 'firebase-functions')).toBe(true);
    });

    // 2. Unvalidated dynamic origin echo in Firebase Functions
    withTempWorkspace('alloflow-cors-dyn-', scaffoldCleanRepo, (root, put) => {
      put('desktop/web-app/functions/index.js', 'res.set("Access-Control-Allow-Origin", req.get("Origin"));\n');
      const res = corsScanner.scanCors({ root });
      expect(res.exitCode).toBe(1);
      expect(res.violations.some(v => v.detail.includes('allowlist'))).toBe(true);
    });

    // 3. Bug-digest admin worker wildcard
    withTempWorkspace('alloflow-cors-digest-', scaffoldCleanRepo, (root, put) => {
      put('catalog/bug-digest-worker/src/index.js', "const h = { 'Access-Control-Allow-Origin': '*' };\n");
      const res = corsScanner.scanCors({ root });
      expect(res.exitCode).toBe(1);
      expect(res.violations.some(v => v.scope === 'bug-digest-worker')).toBe(true);
    });

    // 4. Remote MCP wildcard in allowedOriginHostnames
    withTempWorkspace('alloflow-cors-mcp-', scaffoldCleanRepo, (root, put) => {
      put('services/alloflow-remote-mcp/src/pilot-index.ts', 'export const cfg = { allowedOriginHostnames: ["*"] };\n');
      const res = corsScanner.scanCors({ root });
      expect(res.exitCode).toBe(1);
      expect(res.violations.some(v => v.scope === 'remote-mcp')).toBe(true);
    });

    // 5. Python TTS server wildcard
    withTempWorkspace('alloflow-cors-tts-', scaffoldCleanRepo, (root, put) => {
      put('tts-server/edge_tts_server.py', 'self.send_header("Access-Control-Allow-Origin", "*")\n');
      const res = corsScanner.scanCors({ root });
      expect(res.exitCode).toBe(1);
      expect(res.violations.some(v => v.scope === 'tts-server')).toBe(true);
    });

    // 6. _headers wildcard on /app/* or /* or wildcard + credentials on /axe-core/*
    withTempWorkspace('alloflow-cors-hdr-', scaffoldCleanRepo, (root, put) => {
      put('_headers', '/app/*\n  Access-Control-Allow-Origin: *\n/axe-core/*\n  Access-Control-Allow-Origin: *\n  Access-Control-Allow-Credentials: true\n');
      const res = corsScanner.scanCors({ root });
      expect(res.exitCode).toBe(1);
      expect(res.violations.some(v => v.route === '/app/*')).toBe(true);
      expect(res.violations.some(v => v.route === '/axe-core/*' && v.kind === 'wildcard-with-credentials')).toBe(true);
    });

    // 7. Catalog worker admin handler leaking corsHeaders / jsonResponse
    withTempWorkspace('alloflow-cors-admin-', scaffoldCleanRepo, (root, put) => {
      put('catalog/cloudflare-worker/src/index.js', `
        const corsHeaders = { 'Access-Control-Allow-Origin': '*' };
        function jsonResponse(b) { return new Response(b, { headers: { ...corsHeaders } }); }
        function adminJsonResponse(b) { return new Response(b, { headers: { ...corsHeaders } }); }
        function adminBugResponse(b) { return new Response(b); }
        async function handleBugList() { return jsonResponse({}); }
      `);
      const res = corsScanner.scanCors({ root });
      expect(res.exitCode).toBe(1);
      expect(res.violations.some(v => v.kind === 'admin-wildcard-cors')).toBe(true);
    });

    // 8. Missing mandatory file fails closed with exit 2
    withTempWorkspace('alloflow-cors-miss-', scaffoldCleanRepo, (root) => {
      fs.unlinkSync(path.join(root, '_headers'));
      const res = corsScanner.scanCors({ root });
      expect(res.exitCode).toBe(2);
      expect(res.omissions.some(o => o.file === '_headers')).toBe(true);
    });
  });

  it('rejects red-team CORS bypasses (regex-quote comment desync, wildcard outside corsHeaders, Python dict dynamic echo, multi-element allow_origins)', () => {
    // 1. Regex literal with quote followed by URL containing // before wildcard CORS
    const regexBypassSrc = 'const re = /"/; const x = "https://a.com"; res.set("Access-Control-Allow-Origin", "*");\n';
    const regexFindings = corsScanner.scanJsOrTsContent(regexBypassSrc, 'desktop/web-app/functions/index.js', 'firebase-functions');
    expect(regexFindings.some(f => f.kind === 'wildcard' && f.severity === 'violation')).toBe(true);

    // 2. Wildcard placed OUTSIDE `const corsHeaders = { ... }` in catalog/cloudflare-worker/src/index.js must NOT be allowlisted
    const outsideCorsSrc = `
      const corsHeaders = { 'Access-Control-Allow-Origin': 'https://alloflow-cdn.pages.dev' };
      function adminJsonResponse(b) { return new Response(b); }
      function adminBugResponse(b) { return new Response(b); }
      function leak() { return { 'Access-Control-Allow-Origin': '*' }; }
    `;
    const outsideFindings = corsScanner.scanJsOrTsContent(outsideCorsSrc, 'catalog/cloudflare-worker/src/index.js', 'catalog-worker', { allowlist: true });
    expect(outsideFindings.some(f => f.kind === 'wildcard' && f.severity === 'violation')).toBe(true);
    expect(outsideFindings.some(f => f.severity === 'allowlisted')).toBe(false);

    // 3. Python dict literal with unvalidated dynamic Origin reflection
    const pyDictSrc = 'def handle(req):\n    return {"Access-Control-Allow-Origin": req.headers.get("Origin")}\n';
    const pyDictFindings = corsScanner.scanPythonContent(pyDictSrc, 'tts-server/edge_tts_server.py', 'tts-server');
    expect(pyDictFindings.some(f => f.kind === 'dynamic' && f.severity === 'violation')).toBe(true);

    // 4. Python middleware multi-element allow_origins list containing "*"
    const pyListSrc = 'app.add_middleware(CORSMiddleware, allow_origins=["https://ok.example", "*"])\n';
    const pyListFindings = corsScanner.scanPythonContent(pyListSrc, 'tts-server/piper_server.py', 'tts-server');
    expect(pyListFindings.some(f => f.kind === 'wildcard' && f.severity === 'violation')).toBe(true);
  });
});
