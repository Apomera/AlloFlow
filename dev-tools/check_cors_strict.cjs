#!/usr/bin/env node
// check_cors_strict.cjs — Audit CORS configurations across AlloFlow backends and headers.
//
// Audited surfaces:
//   1. Firebase Cloud Functions       (desktop/web-app/functions/)         — authenticated API; zero wildcards allowed
//   2. Cloudflare Catalog Worker      (catalog/cloudflare-worker/)         — public intake wildcard allowlisted ONLY while admin routes stay isolated
//   3. Cloudflare Bug-Digest Worker   (catalog/bug-digest-worker/)         — admin-only worker; zero wildcards allowed
//   4. Remote MCP Service & Runner    (services/alloflow-remote-mcp/)      — OAuth/Access service; zero wildcards allowed
//   5. Local Python TTS Servers       (tts-server/)                        — loopback/token services; zero wildcards allowed, dynamic origin must be validated
//   6. Cloudflare Pages _headers      (_headers)                           — wildcard allowed ONLY on explicitly allowlisted public read-only vendor/asset routes
//
// Usage:
//   node dev-tools/check_cors_strict.cjs
//   node dev-tools/check_cors_strict.cjs --strict
//   node dev-tools/check_cors_strict.cjs --verbose
//   node dev-tools/check_cors_strict.cjs --quiet
//   node dev-tools/check_cors_strict.cjs --no-allowlist
//
// Exit codes:
//   0 — complete audit, zero blocking CORS violations
//   1 — one or more blocking CORS violations found
//   2 — incomplete audit (missing required file/dir, symlink, read error, or bad CLI flag)

'use strict';
const fs = require('node:fs');
const path = require('node:path');
const babelParser = require('@babel/parser');

const ROOT = path.resolve(__dirname, '..');

const BABEL_PLUGINS = [
  'jsx',
  'typescript',
  'classProperties',
  'classPrivateProperties',
  'classPrivateMethods',
  'topLevelAwait',
  'dynamicImport',
  'optionalChaining',
  'nullishCoalescingOperator',
  'numericSeparator',
  'objectRestSpread',
  'decorators-legacy',
];

const EXCLUDED_DIRS = new Set([
  'node_modules', 'vendor', 'vendors', 'dist', 'build', 'coverage',
  'test', 'tests', 'fixtures', '__pycache__', 'tmp', 'temp',
]);

// Intentionally public, read-only static vendor/asset routes in Cloudflare Pages `_headers`
// fetched cross-origin from Gemini Canvas's sandboxed origin (no auth, no PII, no credentials).
const ALLOWED_PUBLIC_HEADER_ROUTES = Object.freeze(new Set([
  '/axe-core/*',
  '/accessibility-checker-engine/*',
  '/pdfjs-dist/*',
  '/pdf-lib/*',
  '/mammoth/*',
  '/jszip/*',
  '/dompurify/*',
  '/song_library/*',
]));

// Intentionally public cross-origin worker helper (catalog/cloudflare-worker serves
// unauthenticated /search, /healthz, /pdIssuerKey, /verifyPd, and public intake routes
// from Gemini Canvas). Structural invariants below enforce that authenticated admin routes
// in this worker NEVER use this helper or emit wildcard CORS.
const ALLOWED_WORKER_WILDCARDS = Object.freeze(new Map([
  ['catalog/cloudflare-worker/src/index.js', { maxCount: 1, reason: 'public unauthenticated Canvas intake/search corsHeaders (admin routes verified isolated)' }],
]));

const SCOPES = Object.freeze([
  { id: 'firebase-functions', dir: 'desktop/web-app/functions', exts: /\.(?:js|cjs|mjs|ts)$/i, requiredFile: 'desktop/web-app/functions/index.js' },
  { id: 'catalog-worker', dir: 'catalog/cloudflare-worker', exts: /\.(?:js|cjs|mjs|ts)$/i, requiredFile: 'catalog/cloudflare-worker/src/index.js' },
  { id: 'bug-digest-worker', dir: 'catalog/bug-digest-worker', exts: /\.(?:js|cjs|mjs|ts)$/i, requiredFile: 'catalog/bug-digest-worker/src/index.js' },
  { id: 'remote-mcp', dir: 'services/alloflow-remote-mcp', exts: /\.(?:js|cjs|mjs|ts)$/i, requiredFile: 'services/alloflow-remote-mcp/src/pilot-index.ts' },
  { id: 'tts-server', dir: 'tts-server', exts: /\.py$/i, requiredFile: 'tts-server/edge_tts_server.py' },
]);

function toPosix(p) {
  return p.replace(/\\/g, '/');
}

function lineNumberAt(src, index) {
  let line = 1;
  for (let i = 0; i < index; i++) {
    if (src.charCodeAt(i) === 10) line++;
  }
  return line;
}

// Replace JS/TS line and block comments with spaces using @babel/parser's real lexer
// so regex literals (e.g. /"/), template literals, and URLs inside strings never
// desynchronize comment stripping. Preserves exact offsets and newlines.
function stripJsComments(src) {
  const ast = babelParser.parse(src, {
    sourceType: 'unambiguous',
    allowReturnOutsideFunction: true,
    allowAwaitOutsideFunction: true,
    allowImportExportEverywhere: true,
    allowSuperOutsideMethod: true,
    errorRecovery: false,
    plugins: BABEL_PLUGINS,
  });
  const comments = Array.isArray(ast.comments) ? ast.comments : [];
  if (comments.length === 0) return src;
  const chars = src.split('');
  for (const c of comments) {
    const start = Math.max(0, c.start);
    const end = Math.min(src.length, c.end);
    for (let i = start; i < end; i++) {
      if (chars[i] !== '\n' && chars[i] !== '\r') chars[i] = ' ';
    }
  }
  return chars.join('');
}

// Replace Python # comments with spaces while preserving quoted strings and newlines.
function stripPyComments(src) {
  let out = '';
  let i = 0;
  let str = null;
  while (i < src.length) {
    const ch = src[i];
    if (str) {
      if (str.length === 3) {
        if (src.slice(i, i + 3) === str) {
          out += str;
          i += 3;
          str = null;
          continue;
        }
        out += ch;
        if (ch === '\\' && i + 1 < src.length) { out += src[i + 1]; i += 2; continue; }
        i++;
        continue;
      }
      out += ch;
      if (ch === '\\' && i + 1 < src.length) { out += src[i + 1]; i += 2; continue; }
      if (ch === str || ch === '\n') str = null;
      i++;
      continue;
    }
    if ((ch === '"' || ch === "'")) {
      if (src.slice(i, i + 3) === ch + ch + ch) {
        str = ch + ch + ch;
        out += str;
        i += 3;
        continue;
      }
      str = ch;
      out += ch;
      i++;
      continue;
    }
    if (ch === '#') {
      while (i < src.length && src[i] !== '\n') { out += ' '; i++; }
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

function classifyOriginValue(rawValue) {
  const val = String(rawValue || '').trim();
  if (val === '"*"' || val === "'*'" || val === '`*`' || val === '*') return 'wildcard';
  if (/^['"`][^'"`]+['"`]$/.test(val)) return 'explicit';
  return 'dynamic';
}

function extractFunctionBody(src, fnHeaderRe) {
  const match = fnHeaderRe.exec(src);
  if (!match) return null;
  const braceStart = src.indexOf('{', match.index + match[0].length - 1);
  if (braceStart < 0) return null;
  let depth = 0;
  let inStr = null;
  for (let i = braceStart; i < src.length; i++) {
    const ch = src[i];
    if (inStr) {
      if (ch === '\\') { i++; continue; }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return { body: src.slice(braceStart, i + 1), start: match.index, openBrace: braceStart, end: i + 1 };
    }
  }
  return null;
}

function checkCatalogWorkerAdminIsolation(src, relPath) {
  const clean = stripJsComments(src);
  const violations = [];

  // 1. adminJsonResponse and adminBugResponse must never include corsHeaders or wildcard CORS.
  for (const helper of ['adminJsonResponse', 'adminBugResponse']) {
    const fn = extractFunctionBody(clean, new RegExp(`function\\s+${helper}\\s*\\([^)]*\\)\\s*\\{`));
    if (!fn) {
      violations.push({
        scope: 'catalog-worker',
        file: relPath,
        line: 1,
        kind: 'admin-cors-isolation',
        severity: 'violation',
        detail: `Expected helper ${helper}() not found; cannot verify admin CORS isolation.`,
      });
      continue;
    }
    if (/\bcorsHeaders\b/.test(fn.body) || /['"]Access-Control-Allow-Origin['"]\s*:\s*['"]\*['"]/i.test(fn.body)) {
      violations.push({
        scope: 'catalog-worker',
        file: relPath,
        line: lineNumberAt(clean, fn.start),
        kind: 'admin-wildcard-cors',
        severity: 'violation',
        detail: `${helper}() must never attach wildcard CORS or corsHeaders to admin responses.`,
      });
    }
  }

  // 2. Authenticated admin handlers must never call jsonResponse() (which spreads wildcard corsHeaders).
  for (const handler of ['handleBugList', 'handleBugInbox', 'handlePdList', 'handlePluginList']) {
    const fn = extractFunctionBody(clean, new RegExp(`(?:async\\s+)?function\\s+${handler}\\s*\\([^)]*\\)\\s*\\{`));
    if (!fn) continue;
    if (/\bjsonResponse\s*\(/.test(fn.body) || /\bcorsHeaders\b/.test(fn.body) || /['"]Access-Control-Allow-Origin['"]\s*:\s*['"]\*['"]/i.test(fn.body)) {
      violations.push({
        scope: 'catalog-worker',
        file: relPath,
        line: lineNumberAt(clean, fn.start),
        kind: 'admin-wildcard-cors',
        severity: 'violation',
        detail: `Authenticated admin handler ${handler}() must not emit wildcard CORS or use jsonResponse().`,
      });
    }
  }

  // 3. OPTIONS handler must gate ADMIN_ROUTES away from corsHeaders.
  const optionsMatch = /if\s*\(\s*request\.method\s*===\s*['"]OPTIONS['"]\s*\)\s*\{/.exec(clean);
  if (optionsMatch) {
    const fn = extractFunctionBody(clean, /if\s*\(\s*request\.method\s*===\s*['"]OPTIONS['"]\s*\)\s*\{/);
    if (fn && !/ADMIN_ROUTES\.has\(/.test(fn.body)) {
      violations.push({
        scope: 'catalog-worker',
        file: relPath,
        line: lineNumberAt(clean, fn.start),
        kind: 'admin-options-wildcard',
        severity: 'violation',
        detail: 'OPTIONS preflight handler must isolate ADMIN_ROUTES from wildcard corsHeaders.',
      });
    }
  }

  return violations;
}

function scanJsOrTsContent(src, relPath, scopeId, { allowlist = true } = {}) {
  const clean = stripJsComments(src);
  const findings = [];
  const seenKeys = new Set();

  function addSite(index, rawValue, extra = {}) {
    const line = lineNumberAt(clean, index);
    const kind = extra.kind || classifyOriginValue(rawValue);
    const key = `${line}:${kind}:${rawValue}`;
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    let severity = extra.severity || (kind === 'wildcard' ? 'violation' : 'ok');
    let detail = extra.detail || '';
    if (!extra.severity && kind === 'dynamic') {
      const windowBefore = clean.slice(Math.max(0, index - 500), index);
      if (!/(?:configuredOrigins|allowedOrigins|ALLOWED_ORIGINS|isAllowedOrigin|allowlist|\.has\s*\(|\.includes\s*\()/i.test(windowBefore)) {
        severity = 'violation';
        detail = 'Dynamic Access-Control-Allow-Origin reflection without an adjacent origin allowlist check.';
      }
    }
    findings.push({
      scope: scopeId,
      file: relPath,
      line,
      offset: index,
      value: rawValue.trim(),
      kind,
      severity,
      detail,
    });
  }

  // Pattern A: res.set / setHeader / header / headers.set('Access-Control-Allow-Origin', <val>)
  const setterRe = /\.\s*(?:set|setHeader|header|append)\s*\(\s*['"]Access-Control-Allow-Origin['"]\s*,\s*([^,)]+)\)/gi;
  let m;
  while ((m = setterRe.exec(clean)) !== null) {
    addSite(m.index, m[1]);
  }

  // Pattern B: Object header literal 'Access-Control-Allow-Origin': <val>
  const propRe = /['"]Access-Control-Allow-Origin['"]\s*:\s*([^,}\n]+)/gi;
  while ((m = propRe.exec(clean)) !== null) {
    addSite(m.index, m[1]);
  }

  // Pattern C: Wildcard in allowedOriginHostnames or CORS config objects (e.g., Remote MCP / middleware)
  const allowedOriginsRe = /\ballowedOriginHostnames\s*:\s*\[([^\]]*)\]/g;
  while ((m = allowedOriginsRe.exec(clean)) !== null) {
    if (/['"]\*['"]/.test(m[1])) {
      addSite(m.index, '"*"', {
        kind: 'wildcard',
        severity: 'violation',
        detail: 'allowedOriginHostnames must not include wildcard "*"',
      });
    }
  }
  const corsOptionWildcardRe = /\bcors(?:Options|Headers|Config)?\b[\s\S]{0,120}?\borigin\s*:\s*['"]\*['"]/gi;
  while ((m = corsOptionWildcardRe.exec(clean)) !== null) {
    addSite(m.index, '"*"', {
      kind: 'wildcard',
      severity: 'violation',
      detail: 'CORS options must not configure wildcard origin "*"',
    });
  }

  // Pattern D: Wildcard combined with Access-Control-Allow-Credentials: true in the same file
  const hasWildcard = findings.some(f => f.kind === 'wildcard');
  const credsMatch = /['"]Access-Control-Allow-Credentials['"]\s*[:,]\s*['"]?true['"]?/i.exec(clean);
  if (hasWildcard && credsMatch) {
    findings.push({
      scope: scopeId,
      file: relPath,
      line: lineNumberAt(clean, credsMatch.index),
      value: 'true (with wildcard origin)',
      kind: 'wildcard-with-credentials',
      severity: 'violation',
      detail: 'Wildcard Access-Control-Allow-Origin must never be paired with Access-Control-Allow-Credentials: true.',
    });
  }

  // Pattern E: Check allowlisted public worker wildcards + structural admin isolation
  if (scopeId === 'catalog-worker' && relPath === 'catalog/cloudflare-worker/src/index.js') {
    findings.push(...checkCatalogWorkerAdminIsolation(src, relPath));
  }

  if (allowlist && ALLOWED_WORKER_WILDCARDS.has(relPath)) {
    const rule = ALLOWED_WORKER_WILDCARDS.get(relPath);
    const corsHeadersBlock = extractFunctionBody(clean, /\bconst\s+corsHeaders\s*=\s*\{/);
    const blockStart = corsHeadersBlock ? corsHeadersBlock.openBrace : -1;
    const blockEnd = corsHeadersBlock ? corsHeadersBlock.end : -1;
    let allowCount = 0;
    for (const f of findings) {
      const insideCorsHeaders = blockStart >= 0 && typeof f.offset === 'number'
        && f.offset >= blockStart && f.offset <= blockEnd;
      if (f.kind === 'wildcard' && f.severity === 'violation' && insideCorsHeaders && allowCount < rule.maxCount) {
        if (!credsMatch) {
          f.severity = 'allowlisted';
          f.detail = rule.reason;
          allowCount++;
        }
      }
    }
  }

  return findings;
}

function scanPythonContent(src, relPath, scopeId) {
  const clean = stripPyComments(src);
  const findings = [];

  function checkPythonDynamicAllowlist(index) {
    const windowBefore = clean.slice(Math.max(0, index - 400), index);
    return /is_allowed_origin\s*\(|allowed_origins/i.test(windowBefore);
  }

  // Pattern A: send_header("Access-Control-Allow-Origin", <val>)
  const sendHeaderRe = /send_header\s*\(\s*['"]Access-Control-Allow-Origin['"]\s*,\s*([^)]+)\)/gi;
  let m;
  while ((m = sendHeaderRe.exec(clean)) !== null) {
    const val = m[1].trim();
    const kind = classifyOriginValue(val);
    let severity = kind === 'wildcard' ? 'violation' : 'ok';
    let detail = '';
    if (kind === 'dynamic' && !checkPythonDynamicAllowlist(m.index)) {
      severity = 'violation';
      detail = 'Dynamic Access-Control-Allow-Origin echo without an adjacent origin allowlist check.';
    }
    findings.push({ scope: scopeId, file: relPath, line: lineNumberAt(clean, m.index), value: val, kind, severity, detail });
  }

  // Pattern B: Dict literal "Access-Control-Allow-Origin": <val>
  const dictRe = /['"]Access-Control-Allow-Origin['"]\s*:\s*([^,}\n]+)/gi;
  while ((m = dictRe.exec(clean)) !== null) {
    const val = m[1].trim();
    const kind = classifyOriginValue(val);
    let severity = kind === 'wildcard' ? 'violation' : 'ok';
    let detail = kind === 'wildcard' ? 'Wildcard CORS is forbidden on local TTS servers.' : '';
    if (kind === 'dynamic' && !checkPythonDynamicAllowlist(m.index)) {
      severity = 'violation';
      detail = 'Dynamic Access-Control-Allow-Origin dict value without an adjacent origin allowlist check.';
    }
    findings.push({
      scope: scopeId,
      file: relPath,
      line: lineNumberAt(clean, m.index),
      value: val,
      kind,
      severity,
      detail,
    });
  }

  // Pattern C: FastAPI/Starlette/Flask CORS middleware wildcard (single string or any element in list/tuple/set)
  const mwRe = /\b(?:allow_origins|origins)\s*=\s*(?:[\[\(\{]([^\]\)\}]*)[\]\)\}]|(['"]\*['"]))/g;
  while ((m = mwRe.exec(clean)) !== null) {
    const hasStar = Boolean(m[2]) || (typeof m[1] === 'string' && /['"]\*['"]/.test(m[1]));
    if (hasStar) {
      findings.push({
        scope: scopeId,
        file: relPath,
        line: lineNumberAt(clean, m.index),
        value: '"*"',
        kind: 'wildcard',
        severity: 'violation',
        detail: 'Wildcard CORS middleware origin is forbidden on local TTS servers.',
      });
    }
  }

  return findings;
}

function scanHeadersContent(src, relPath = '_headers', { allowlist = true } = {}) {
  const lines = src.split(/\r?\n/);
  const findings = [];
  let currentRoute = null;
  let currentRouteSites = [];
  let currentRouteHasCredentials = false;

  function finalizeRoute() {
    if (currentRoute && currentRouteHasCredentials) {
      for (const site of currentRouteSites) {
        if (site.kind === 'wildcard') {
          site.severity = 'violation';
          site.kind = 'wildcard-with-credentials';
          site.detail = `Route ${currentRoute} pairs wildcard CORS with Access-Control-Allow-Credentials: true.`;
        }
      }
    }
    currentRouteSites = [];
    currentRouteHasCredentials = false;
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (!/^\s/.test(raw)) {
      finalizeRoute();
      currentRoute = trimmed;
      continue;
    }
    if (!currentRoute) continue;

    const headerMatch = /^([A-Za-z0-9-]+)\s*:\s*(.+)$/.exec(trimmed);
    if (!headerMatch) continue;
    const headerName = headerMatch[1].toLowerCase();
    const headerVal = headerMatch[2].trim();

    if (headerName === 'access-control-allow-credentials' && headerVal.toLowerCase() === 'true') {
      currentRouteHasCredentials = true;
      continue;
    }

    if (headerName === 'access-control-allow-origin') {
      const isWildcard = headerVal === '*';
      let severity = 'ok';
      let detail = '';
      if (isWildcard) {
        if (allowlist && ALLOWED_PUBLIC_HEADER_ROUTES.has(currentRoute)) {
          severity = 'allowlisted';
          detail = `Allowlisted public read-only vendor/asset route (${currentRoute})`;
        } else {
          severity = 'violation';
          detail = `Unallowlisted wildcard Access-Control-Allow-Origin: * on route "${currentRoute}"`;
        }
      }
      const site = {
        scope: 'pages-headers',
        file: relPath,
        route: currentRoute,
        line: i + 1,
        value: headerVal,
        kind: isWildcard ? 'wildcard' : 'explicit',
        severity,
        detail,
      };
      findings.push(site);
      currentRouteSites.push(site);
    }
  }
  finalizeRoute();

  return findings;
}

function collectScopeFiles(rootDir, scope, io, omissions) {
  const baseDir = path.join(rootDir, scope.dir);
  const files = [];
  const rel = p => toPosix(path.relative(rootDir, p));

  let rootStat;
  try {
    rootStat = io.lstatSync(baseDir);
  } catch (_) {
    omissions.push({ file: scope.dir, reason: 'required CORS audit directory is missing' });
    return files;
  }
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    omissions.push({ file: scope.dir, reason: 'CORS audit directory is not a regular directory' });
    return files;
  }

  function walk(dir) {
    let entries;
    try {
      entries = io.readdirSync(dir, { withFileTypes: true });
    } catch (_) {
      omissions.push({ file: rel(dir), reason: 'directory enumeration failed' });
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.') || EXCLUDED_DIRS.has(entry.name.toLowerCase())) continue;
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) {
        omissions.push({ file: rel(full), reason: 'symbolic link is not scanned' });
        continue;
      }
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && scope.exts.test(entry.name)
          && !/\.(?:test|spec)\.[^.]+$/i.test(entry.name)
          && !/^test_.*\.py$/i.test(entry.name)
          && entry.name !== 'smoke_test.mjs') {
        files.push(full);
      }
    }
  }

  walk(baseDir);

  if (scope.requiredFile) {
    const reqAbs = path.join(rootDir, scope.requiredFile);
    if (!files.some(f => path.resolve(f) === path.resolve(reqAbs))) {
      omissions.push({ file: scope.requiredFile, reason: 'mandatory CORS audit file is missing' });
    }
  }

  return files.sort();
}

function scanCors({ root = ROOT, io = fs, allowlist = true } = {}) {
  const findings = [];
  const omissions = [];
  let scannedFiles = 0;

  // 1. Backend / worker / TTS server source files
  for (const scope of SCOPES) {
    const files = collectScopeFiles(root, scope, io, omissions);
    for (const file of files) {
      const rel = toPosix(path.relative(root, file));
      let src;
      try {
        const st = io.lstatSync(file);
        if (!st.isFile() || st.isSymbolicLink()) {
          omissions.push({ file: rel, reason: 'not a regular file' });
          continue;
        }
        src = io.readFileSync(file, 'utf8');
      } catch (_) {
        omissions.push({ file: rel, reason: 'file read failed' });
        continue;
      }
      if (file.endsWith('.py')) {
        findings.push(...scanPythonContent(src, rel, scope.id));
        scannedFiles++;
      } else {
        try {
          findings.push(...scanJsOrTsContent(src, rel, scope.id, { allowlist }));
          scannedFiles++;
        } catch (err) {
          omissions.push({
            file: rel,
            reason: 'JS/TS parse error: ' + (err && err.message ? err.message.split('\n')[0] : 'parse failed'),
          });
        }
      }
    }
  }

  // 2. Cloudflare Pages _headers (root is mandatory; deploy mirror checked if present)
  const headerTargets = [
    { rel: '_headers', mandatory: true },
    { rel: 'desktop/web-app/public/_headers', mandatory: false },
  ];
  for (const target of headerTargets) {
    const abs = path.join(root, target.rel);
    let st;
    try {
      st = io.lstatSync(abs);
    } catch (_) {
      if (target.mandatory) omissions.push({ file: target.rel, reason: 'mandatory _headers file is missing' });
      continue;
    }
    if (!st.isFile() || st.isSymbolicLink()) {
      omissions.push({ file: target.rel, reason: '_headers is not a regular file' });
      continue;
    }
    try {
      const src = io.readFileSync(abs, 'utf8');
      scannedFiles++;
      findings.push(...scanHeadersContent(src, target.rel, { allowlist }));
    } catch (_) {
      omissions.push({ file: target.rel, reason: '_headers read failed' });
    }
  }

  const violations = findings.filter(f => f.severity === 'violation');
  const allowlisted = findings.filter(f => f.severity === 'allowlisted');
  const safe = findings.filter(f => f.severity === 'ok');

  const exitCode = omissions.length > 0 ? 2 : violations.length > 0 ? 1 : 0;
  return { scannedFiles, findings, violations, allowlisted, safe, omissions, exitCode };
}

function formatReport(result, { quiet = false, verbose = false, write = console.log } = {}) {
  const showHeader = !quiet || result.violations.length > 0 || result.omissions.length > 0;
  if (showHeader) {
    write('');
    write('╔══════════════════════════════════════════════════════════════════════╗');
    write('║   CORS Strict Origin Audit (Functions + Workers + TTS + _headers)    ║');
    write('╚══════════════════════════════════════════════════════════════════════╝');
    write('  Files scanned:          ' + result.scannedFiles);
    write('  CORS sites reviewed:    ' + result.findings.length);
    write('  Safe (explicit/checked): ' + result.safe.length);
    write('  Allowlisted public (*): ' + result.allowlisted.length);
    write('  Blocking violations:    ' + result.violations.length);
    if (result.omissions.length > 0) {
      write('  Incomplete/omissions:   ' + result.omissions.length);
    }
    write('');
  }

  if (result.omissions.length > 0) {
    write('═══ ✗ INCOMPLETE SCAN (' + result.omissions.length + ') ═══');
    for (const o of result.omissions) {
      write('  ✗ ' + o.file + ': ' + o.reason);
    }
    write('');
  }

  if (result.violations.length > 0) {
    write('═══ ❌ BLOCKING CORS VIOLATIONS (' + result.violations.length + ') ═══');
    for (const v of result.violations) {
      const loc = v.route ? `${v.file}:${v.line} [${v.route}]` : `${v.file}:${v.line}`;
      write('  ✗ ' + loc + '  (' + v.kind + ': ' + v.value + ')');
      if (v.detail) write('      ' + v.detail);
    }
    write('');
  }

  if (verbose && result.allowlisted.length > 0) {
    write('═══ ✓ ALLOWLISTED PUBLIC WILDCARDS (' + result.allowlisted.length + ') ═══');
    for (const a of result.allowlisted) {
      const loc = a.route ? `${a.file}:${a.line} [${a.route}]` : `${a.file}:${a.line}`;
      write('  ✓ ' + loc + '  → ' + (a.detail || a.value));
    }
    write('');
  }

  if (verbose && result.safe.length > 0) {
    write('═══ ✓ SAFE EXPLICIT / VALIDATED DYNAMIC ORIGINS (' + result.safe.length + ') ═══');
    for (const s of result.safe) {
      write('  ✓ ' + s.file + ':' + s.line + '  [' + s.kind + '] ' + s.value);
    }
    write('');
  }

  if (result.exitCode === 0) {
    if (!quiet) {
      write('  ✅ CORS strict audit passed (' + result.scannedFiles + ' files, ' + result.safe.length + ' validated/explicit, ' + result.allowlisted.length + ' allowlisted public, 0 violations).');
      write('');
    }
  } else if (result.exitCode === 2) {
    write('  ❌ CORS audit incomplete — failing closed.');
    write('');
  } else {
    write('  ❌ ' + result.violations.length + ' blocking CORS violation(s) found.');
    write('');
  }
}

function main(args = process.argv.slice(2), deps = {}) {
  const validFlags = new Set(['--verbose', '--quiet', '--strict', '--no-allowlist']);
  const bad = args.find(a => !validFlags.has(a));
  if (bad) {
    (deps.error || console.error)('Unknown option: ' + bad + '\nUsage: node dev-tools/check_cors_strict.cjs [--strict] [--verbose] [--quiet] [--no-allowlist]');
    return 2;
  }
  const result = scanCors({
    root: deps.root || ROOT,
    io: deps.io || fs,
    allowlist: !args.includes('--no-allowlist'),
  });
  formatReport(result, {
    quiet: args.includes('--quiet'),
    verbose: args.includes('--verbose'),
    write: deps.write || console.log,
  });
  return result.exitCode;
}

module.exports = {
  SCOPES,
  ALLOWED_PUBLIC_HEADER_ROUTES,
  ALLOWED_WORKER_WILDCARDS,
  scanJsOrTsContent,
  scanPythonContent,
  scanHeadersContent,
  scanCors,
  formatReport,
  main,
};

if (require.main === module) {
  process.exitCode = main();
}
