#!/usr/bin/env node
// check_student_ai_gating.cjs - keep the "student AI-off" sweep fixed.
//
// When a learner has no usable AI (no backend, or teacher policy off) the host
// swaps window.callGemini / Vision / ImageEdit for BLOCKED functions: they are
// truthy, carry fn._alloQrBlocked === true and reject with 'allo-qr-ai-disabled'.
// So `typeof callGemini === 'function'` says "AI available" for a student who
// has none, and the control it gates renders dead (or hangs). The correct check
// is window.__alloAiUsable(kind, fn), a module `_aiUsable` helper, or the
// ctx/prop flag the host computes (ctx.aiAvailable). See
// C:/tmp/ai_off_sweep_2026-11-03/LANE_RULES.md (2026-11-03 sweep).
//
// Scope: the modules the app ACTUALLY loads, derived from AlloFlowANTI.txt
// (loadModule('X', 'https://alloflow-cdn.pages.dev/<file>') calls plus the
// `var stemToolModules` / `var selToolModules` / `var arcadeModes` plugin
// manifests). Not readdirSync: a file the host never fetches is not reachable.
//
// Rules:
//   typeof-ai-gate   typeof <AI fn> === / !== 'function'  (fn: callGemini, callImagen,
//                    callGeminiVision, callGeminiImageEdit, callGeminiAudio, onCallGemini,
//                    and *Fn aliases). Exempt when the same statement also checks
//                    _alloQrBlocked or __alloAiUsable (the sanctioned helper fallback),
//                    or when the receiver is a trusted ctx whose provider is PROVEN to
//                    null unusable fns (allowlist "trustedContexts", proof re-checked).
//   ai-global-alias  `|| window.callGemini`, `window.callGemini ||`, `x.callGemini || callGemini`
//                    (an alias re-reads the global and defeats a host that passed null).
//   raw-gemini-fetch generativelanguage.googleapis.com, or a `:generateContent` URL with
//                    `?key=`, outside the files listed as sanctioned transport.
//   typeof-tts-gate  ADVISORY (never fails): typeof callTTS === 'function'. Expected to stay
//                    non-zero: callTTS itself enforces the student AI-off voice policy
//                    (2026-11-04: no cloud voice, returns no URL, callers use the device
//                    voice), so a callTTS presence check is not an AI gate. Listed for audits.
//
// Allowlist: dev-tools/student_ai_gating_allowlist.json. Findings are keyed by
// file + rule + a normalized snippet (substring of the whitespace-collapsed
// line), never by line number; `max` caps how many findings one entry absorbs,
// so a NEW copy of an allowlisted line still fails.
//
// Usage:
//   node dev-tools/check_student_ai_gating.cjs [--quiet] [--json]
//   node dev-tools/check_student_ai_gating.cjs --write-allowlist-draft   (stdout only)
//   node dev-tools/check_student_ai_gating.cjs --files a.js b.js         (explicit files)
//   options: --root <dir> --host <file> --allowlist <file> --strict-stale
// Exit: 0 clean, 1 non-allowlisted finding(s) (or stale entries with --strict-stale),
//       2 configuration error (host unreadable, empty module list, bad allowlist).
'use strict';
const fs = require('fs');
const path = require('path');

const DEFAULT_ROOT = path.resolve(__dirname, '..');
const DEFAULT_HOST = 'AlloFlowANTI.txt';
const DEFAULT_ALLOWLIST = 'dev-tools/student_ai_gating_allowlist.json';

const AI_FNS = ['callGemini', 'callImagen', 'callGeminiVision', 'callGeminiImageEdit', 'callGeminiAudio', 'onCallGemini'];
const TTS_FNS = ['callTTS'];
const ADVISORY_RULES = new Set(['typeof-tts-gate']);
const RULES = ['typeof-ai-gate', 'ai-global-alias', 'raw-gemini-fetch', 'typeof-tts-gate'];

const FN_ALT = AI_FNS.concat(TTS_FNS).join('|');
const AI_ALT = AI_FNS.join('|');
// typeof <recv.>name[Fn] ===|!==|==|!= 'function'
const TYPEOF_RE = new RegExp(
  "typeof\\s*\\(?\\s*((?:[A-Za-z_$][\\w$]*\\s*\\??\\.\\s*)*)(" + FN_ALT + ")(Fn)?\\s*\\)?\\s*([!=]==?)\\s*(['\"`])function\\5", 'g');
// 'function' ===|!== typeof <recv.>name
const TYPEOF_REV_RE = new RegExp(
  "(['\"`])function\\1\\s*([!=]==?)\\s*typeof\\s*\\(?\\s*((?:[A-Za-z_$][\\w$]*\\s*\\??\\.\\s*)*)(" + FN_ALT + ")(Fn)?\\b", 'g');
// || window.fn   / ?? (typeof window !== 'undefined' && window.fn)
const ALIAS_RIGHT_RE = new RegExp(
  "(?:\\|\\||\\?\\?)\\s*\\(?\\s*(?:typeof\\s+window\\s*!==?\\s*['\"]undefined['\"]\\s*&&\\s*)?window\\s*(?:\\.\\s*(" + AI_ALT + ")|\\[\\s*['\"](" + AI_ALT + ")['\"]\\s*\\])(?![\\w$])", 'g');
// window.fn || ...   (not a negation / typeof test)
const ALIAS_LEFT_RE = new RegExp("(^|[^!\\w$.])window\\s*\\.\\s*(" + AI_ALT + ")\\s*(?:\\|\\||\\?\\?)", 'g');
// x.fn || fn   (bare global fallback of the same name)
const ALIAS_BARE_RE = new RegExp("[\\w$]\\s*\\.\\s*(" + AI_ALT + ")\\s*(?:\\|\\||\\?\\?)\\s*\\1(?![\\w$])", 'g');
// A statement that also consults the real answer is fine: the blocked-fn tag, the host
// helper, or a module helper CALL named like _aiUsable / wsAiUsable / _alloAiUsableKind.
const SANCTIONED_CHECK_RE = /_alloQrBlocked|__alloAiUsable|\b[\w$]*[Aa]i[\w$]*Usable[\w$]*\s*\(/;
const RAW_HOST_RE = /generativelanguage\.googleapis\.com/g;
const RAW_KEY_RE = /:(?:stream)?[gG]enerateContent\b[^\n]{0,160}[?&]key=|[?&]key=[^\n]{0,160}:(?:stream)?[gG]enerateContent\b/g;

function normalize(s) { return String(s).replace(/\s+/g, ' ').trim(); }

function toPosix(p) { return String(p).split(path.sep).join('/').replace(/\\/g, '/'); }

function globToRegExp(glob) {
  const esc = String(glob).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]').replace(/\u0000/g, '.*');
  return new RegExp('^' + esc + '$');
}
function matchesAny(file, globs) { return (globs || []).some((g) => globToRegExp(g).test(file)); }

/*
 * Pull a plugin manifest array out of the host by BRACKET MATCHING (the array
 * holds comment prose; indexOf(']') would stop early and under-report).
 */
function readArray(src, varName) {
  const at = src.indexOf('var ' + varName);
  if (at < 0) return null;
  const start = src.indexOf('[', at);
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) {
        const out = [];
        for (const raw of src.slice(start + 1, i).split('\n')) {
          const line = raw.replace(/(^|\s)\/\/.*$/, '');
          const re = /'([^']+\.js)'|"([^"]+\.js)"/g;
          let m;
          while ((m = re.exec(line)) !== null) out.push(m[1] || m[2]);
        }
        return out;
      }
    }
  }
  return null;
}

/* Modules the host loads: loadModule CDN calls + the three plugin manifests. */
function deriveStudentModules(hostSrc) {
  const files = new Map(); // rel -> source label
  const lines = hostSrc.split('\n');
  const loadRe = /loadModule\(\s*['"][^'"]+['"]\s*,\s*['"`]https:\/\/alloflow-cdn\.pages\.dev\/([^'"`?#\s]+\.js)/g;
  lines.forEach((line) => {
    const t = line.trim();
    if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;
    let m;
    loadRe.lastIndex = 0;
    while ((m = loadRe.exec(line)) !== null) {
      const cut = line.slice(0, m.index);
      if (/(^|\s)\/\//.test(cut)) continue; // trailing comment
      if (!files.has(m[1])) files.set(m[1], 'loadModule');
    }
  });
  const manifests = {};
  for (const v of ['stemToolModules', 'selToolModules', 'arcadeModes']) {
    const arr = readArray(hostSrc, v);
    manifests[v] = arr;
    for (const f of arr || []) if (!files.has(f)) files.set(f, v);
  }
  return { files: [...files.keys()].sort(), sourceOf: files, manifests };
}

/* Marks, per line, whether the line sits inside a block comment opened at line start. */
function commentMask(lines) {
  const mask = new Array(lines.length).fill(false);
  let inBlock = false;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (inBlock) {
      mask[i] = true;
      if (t.includes('*/')) inBlock = false;
      continue;
    }
    if (t.startsWith('//') || t.startsWith('*')) { mask[i] = true; continue; }
    if (t.startsWith('/*')) {
      mask[i] = true;
      const close = t.indexOf('*/', 2);
      if (close < 0) inBlock = true;
      else if (t.slice(close + 2).trim()) mask[i] = false; // code after an inline header comment
    }
  }
  return mask;
}

/* True when the match index sits after a `//` line comment (not a URL's //). */
function inTrailingComment(line, idx) {
  const before = line.slice(0, idx);
  const re = /(^|[\s;,{}()])\/\//g;
  return re.test(before) && !/['"`][^'"`]*$/.test(before.slice(before.search(/(^|[\s;,{}()])\/\//)));
}
function inInlineBlockComment(line, idx) {
  const open = line.lastIndexOf('/*', idx);
  if (open < 0) return false;
  const close = line.indexOf('*/', open + 2);
  return close < 0 || close > idx;
}

/* The logical statement around line i: follows && / || / ( / , continuations. */
function statementText(lines, i) {
  let a = i;
  let b = i;
  while (a > 0 && i - a < 4 && (/^\s*(&&|\|\||\?|:)/.test(lines[a]) || /(&&|\|\||\(|,|\?|=)\s*$/.test(lines[a - 1]))) a--;
  while (b < lines.length - 1 && b - i < 4 && (/(&&|\|\||\(|,|\?)\s*$/.test(lines[b]) || /^\s*(&&|\|\||\?|:)/.test(lines[b + 1]))) b++;
  return lines.slice(a, b + 1).join('\n');
}

function snippetFor(line, start, end) {
  const n = normalize(line);
  if (n.length <= 180) return n;
  const s = Math.max(0, start - 70);
  const e = Math.min(line.length, end + 70);
  return normalize(line.slice(s, e));
}

/*
 * Trusted contexts: a receiver (e.g. STEM `ctx`) whose provider nulls unusable AI
 * fns, so `typeof ctx.callGemini === 'function'` IS correct there. Trust applies
 * only while every proof string is still present in the provider file.
 */
function resolveTrust(allowlist, root, readFile) {
  const out = [];
  const errors = [];
  for (const tc of (allowlist && allowlist.trustedContexts) || []) {
    let ok = true;
    const proof = tc.proof || {};
    let txt = null;
    try { txt = readFile(path.join(root, proof.file || '')); } catch (_) { txt = null; }
    if (txt == null) { ok = false; errors.push('trustedContexts: proof file missing: ' + proof.file); }
    else {
      const norm = normalize(txt);
      for (const s of proof.mustContain || []) {
        if (!norm.includes(normalize(s))) { ok = false; errors.push('trustedContexts: proof no longer holds in ' + proof.file + ': ' + s); }
      }
      if (!(proof.mustContain || []).length) { ok = false; errors.push('trustedContexts: entry without proof strings for ' + proof.file); }
    }
    if (ok) out.push(tc);
  }
  return { trusted: out, errors };
}

function isTrusted(trusted, file, receiver, fn, localTrust) {
  const recv = normalize(receiver).replace(/\s+/g, '').replace(/\?\./g, '.').replace(/\.$/, '');
  if (!recv && localTrust && localTrust.has(fn)) return true;
  return trusted.some((tc) => matchesAny(file, tc.files) && (tc.receivers || []).includes(recv) && (tc.fns || []).includes(fn));
}

/*
 * trustLocalBindings: in a trusted file, a bare `callGemini` is trusted when EVERY
 * `var|let|const callGemini = <rhs>` binding reads the trusted receiver (or a local
 * that does, one hop) and never `window.`. `var callGemini = ctx.callGemini || window.callGemini`
 * is NOT trusted (and ai-global-alias fires on it anyway).
 */
function localTrustFor(text, file, trusted) {
  const out = new Set();
  const tcs = trusted.filter((tc) => tc.trustLocalBindings && matchesAny(file, tc.files));
  if (!tcs.length) return out;
  const rhsOf = (name) => {
    const re = new RegExp('(?:^|[^\\w$.])(?:var|let|const)\\s+' + name.replace(/\$/g, '\\$') + '\\s*=\\s*([^;\\n]*(?:\\n[^;\\n]*){0,3})', 'g');
    const list = [];
    let m;
    while ((m = re.exec(text)) !== null) list.push(m[1]);
    return list;
  };
  for (const tc of tcs) {
    const recvRe = new RegExp('(?:^|[^\\w$.])(?:' + (tc.receivers || []).map((r) => r.replace(/[.$]/g, '\\$&')).join('|') + ')\\s*\\.');
    for (const fn of tc.fns || []) {
      const rhs = rhsOf(fn);
      if (!rhs.length) continue;
      const ok = rhs.every((r) => {
        if (/\bwindow\s*[.[]/.test(r)) return false;
        if (recvRe.test(r)) return true;
        const id = r.trim().match(/^([A-Za-z_$][\w$]*)\s*$/);
        if (!id) return false;
        const inner = rhsOf(id[1]);
        return inner.length > 0 && inner.every((x) => !/\bwindow\s*[.[]/.test(x) && recvRe.test(x));
      });
      if (ok) out.add(fn);
    }
  }
  return out;
}

/* Scan one file's text. `opts.trusted` = resolved trusted contexts; `opts.sanctioned` = Set of files. */
function scanText(text, file, opts) {
  opts = opts || {};
  const trusted = opts.trusted || [];
  const sanctioned = opts.sanctioned || new Set();
  const lines = String(text).split('\n');
  const mask = commentMask(lines);
  const localTrust = localTrustFor(String(text), file, trusted);
  const findings = [];
  const add = (rule, i, m0, mEnd, extra) => {
    findings.push(Object.assign({ file, line: i + 1, rule, snippet: snippetFor(lines[i], m0, mEnd), advisory: ADVISORY_RULES.has(rule) }, extra || {}));
  };
  for (let i = 0; i < lines.length; i++) {
    if (mask[i]) continue;
    const line = lines[i];
    if (line.length > 20000) continue; // inlined data blobs / source maps
    const skip = (idx) => inTrailingComment(line, idx) || inInlineBlockComment(line, idx);

    // Rule 1: typeof availability checks.
    const seen = new Set();
    const handleTypeof = (idx, end, receiver, name, fnSuffix, op) => {
      if (seen.has(idx) || skip(idx)) return;
      seen.add(idx);
      const stmt = statementText(lines, i);
      if (SANCTIONED_CHECK_RE.test(stmt)) return; // the sanctioned helper (or its fallback)
      const isTts = TTS_FNS.includes(name);
      if (!isTts && !fnSuffix && isTrusted(trusted, file, receiver, name, localTrust)) return;
      const negated = op[0] === '!';
      const after = line.slice(end, end + 40);
      const shape = negated && /^\s*\)?\s*(\{?\s*)?(return|throw)\b/.test(after) ? 'call-guard' : (negated ? 'negated' : 'positive');
      add(isTts ? 'typeof-tts-gate' : 'typeof-ai-gate', i, idx, end, { fn: normalize(receiver).replace(/\s+/g, '') + name + (fnSuffix || ''), shape });
    };
    let m;
    TYPEOF_RE.lastIndex = 0;
    while ((m = TYPEOF_RE.exec(line)) !== null) handleTypeof(m.index, m.index + m[0].length, m[1], m[2], m[3], m[4]);
    TYPEOF_REV_RE.lastIndex = 0;
    while ((m = TYPEOF_REV_RE.exec(line)) !== null) handleTypeof(m.index, m.index + m[0].length, m[3], m[4], m[5], m[2]);

    // Rule 2: global aliases.
    const aliasSeen = new Set();
    for (const re of [ALIAS_RIGHT_RE, ALIAS_LEFT_RE, ALIAS_BARE_RE]) {
      re.lastIndex = 0;
      while ((m = re.exec(line)) !== null) {
        const idx = m.index + (re === ALIAS_LEFT_RE ? m[1].length : 0);
        if (skip(idx)) continue;
        const name = re === ALIAS_RIGHT_RE ? (m[1] || m[2]) : (re === ALIAS_LEFT_RE ? m[2] : m[1]);
        const key = name + '@' + Math.floor(idx / 60);
        if (aliasSeen.has(key)) continue;
        aliasSeen.add(key);
        if (SANCTIONED_CHECK_RE.test(statementText(lines, i))) continue;
        add('ai-global-alias', i, idx, m.index + m[0].length, { fn: name });
      }
    }

    // Rule 3: raw Gemini transport.
    if (!sanctioned.has(file)) {
      const rawSeen = new Set();
      for (const re of [RAW_HOST_RE, RAW_KEY_RE]) {
        re.lastIndex = 0;
        while ((m = re.exec(line)) !== null) {
          if (skip(m.index)) continue;
          if (rawSeen.size) break; // one finding per line
          rawSeen.add(m.index);
          add('raw-gemini-fetch', i, m.index, m.index + m[0].length);
        }
      }
    }
  }
  return findings;
}

function loadAllowlist(file, readFile) {
  let txt;
  try { txt = readFile(file); } catch (_) { return { allowlist: { findings: [] }, missing: true }; }
  const allowlist = JSON.parse(txt);
  if (!allowlist || typeof allowlist !== 'object') throw new Error('allowlist is not an object');
  for (const k of ['findings', 'skipFiles', 'sanctionedTransport', 'trustedContexts']) {
    if (allowlist[k] != null && !Array.isArray(allowlist[k])) throw new Error('allowlist.' + k + ' must be an array');
  }
  for (const e of allowlist.findings || []) {
    if (!e || typeof e.file !== 'string' || typeof e.snippet !== 'string' || !RULES.includes(e.rule)) {
      throw new Error('bad allowlist finding entry: ' + JSON.stringify(e));
    }
    if (!normalize(e.snippet)) throw new Error('empty snippet in allowlist entry for ' + e.file);
    if (!e.reason) throw new Error('allowlist entry without reason: ' + e.file + ' ' + e.snippet);
  }
  for (const k of ['skipFiles', 'sanctionedTransport']) {
    for (const e of allowlist[k] || []) if (!e || typeof e.file !== 'string' || !e.reason) throw new Error('bad allowlist.' + k + ' entry: ' + JSON.stringify(e));
  }
  return { allowlist, missing: false };
}

/* Splits findings into allowed/unallowed; reports entries that matched nothing. */
function applyAllowlist(findings, allowlist) {
  const entries = ((allowlist && allowlist.findings) || []).map((e) => ({ e, snip: normalize(e.snippet), max: Number.isInteger(e.max) && e.max > 0 ? e.max : 1, used: 0 }));
  const allowed = [];
  const unallowed = [];
  for (const f of findings) {
    const norm = normalize(f.snippet);
    const hit = entries.find((x) => x.e.file === f.file && x.e.rule === f.rule && x.used < x.max && (norm.includes(x.snip) || x.snip.includes(norm)));
    if (hit) { hit.used++; allowed.push(Object.assign({}, f, { allowReason: hit.e.reason, allowClass: hit.e.class })); }
    else unallowed.push(f);
  }
  const stale = entries.filter((x) => x.used === 0).map((x) => x.e);
  const underused = entries.filter((x) => x.used > 0 && x.used < x.max).map((x) => Object.assign({}, x.e, { used: x.used }));
  return { allowed, unallowed, stale, underused };
}

function buildDraft(findings, allowlist) {
  const prev = (allowlist && allowlist.findings) || [];
  const groups = new Map();
  for (const f of findings) {
    const k = f.file + '\u0000' + f.rule + '\u0000' + normalize(f.snippet);
    if (!groups.has(k)) groups.set(k, { file: f.file, rule: f.rule, snippet: normalize(f.snippet), lines: [], fn: f.fn, shape: f.shape });
    groups.get(k).lines.push(f.line);
  }
  const out = [];
  for (const g of groups.values()) {
    const old = prev.find((e) => e.file === g.file && e.rule === g.rule && (normalize(e.snippet) === g.snippet || g.snippet.includes(normalize(e.snippet))));
    const entry = { file: g.file, rule: g.rule, snippet: g.snippet };
    if (g.lines.length > 1) entry.max = g.lines.length;
    entry.class = old && old.class ? old.class : 'review';
    entry.reason = old && old.reason ? old.reason : 'TODO classify (line ' + g.lines.join(', ') + (g.shape ? ', ' + g.shape : '') + ')';
    out.push(entry);
  }
  out.sort((a, b) => a.file.localeCompare(b.file) || a.rule.localeCompare(b.rule) || a.snippet.localeCompare(b.snippet));
  const draft = Object.assign({}, allowlist || {});
  draft.findings = out;
  return draft;
}

function parseArgs(argv) {
  const args = { quiet: false, json: false, draft: false, strictStale: false, files: null, root: null, host: null, allowlist: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--quiet') args.quiet = true;
    else if (a === '--json') args.json = true;
    else if (a === '--write-allowlist-draft') args.draft = true;
    else if (a === '--strict-stale') args.strictStale = true;
    else if (a === '--root') args.root = argv[++i];
    else if (a === '--host') args.host = argv[++i];
    else if (a === '--allowlist') args.allowlist = argv[++i];
    else if (a === '--files') { args.files = []; while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) args.files.push(argv[++i]); }
    else throw new Error('unknown argument: ' + a);
  }
  return args;
}

/* Programmatic entry: returns { code, report, text }. Never writes files. */
function run(argv, io) {
  io = io || {};
  const readFile = io.readFile || ((p) => fs.readFileSync(p, 'utf8'));
  const exists = io.exists || ((p) => fs.existsSync(p));
  let args;
  try { args = parseArgs(argv || []); } catch (e) { return { code: 2, text: 'check_student_ai_gating: ' + e.message + '\n', report: null }; }
  const root = path.resolve(args.root || DEFAULT_ROOT);
  const hostPath = path.resolve(root, args.host || DEFAULT_HOST);
  const allowPath = path.resolve(root, args.allowlist || DEFAULT_ALLOWLIST);
  const errors = [];
  const warnings = [];

  let allowlist;
  try {
    const r = loadAllowlist(allowPath, readFile);
    allowlist = r.allowlist;
    if (r.missing) warnings.push('allowlist not found: ' + toPosix(path.relative(root, allowPath)) + ' (treating as empty)');
  } catch (e) {
    return { code: 2, text: 'check_student_ai_gating: bad allowlist ' + allowPath + ': ' + e.message + '\n', report: null };
  }

  let files;
  let derivedFrom = 'host';
  if (args.files) {
    files = args.files.map((f) => toPosix(path.relative(root, path.resolve(root, f))));
    derivedFrom = 'explicit';
  } else {
    let hostSrc;
    try { hostSrc = readFile(hostPath); } catch (_) { return { code: 2, text: 'check_student_ai_gating: cannot read host ' + hostPath + '\n', report: null }; }
    const d = deriveStudentModules(hostSrc);
    for (const v of ['stemToolModules', 'selToolModules', 'arcadeModes']) {
      if (!d.manifests[v] || !d.manifests[v].length) errors.push('could not parse `var ' + v + '` from the host (parser wrong, not the app)');
    }
    if (d.files.length < 20) errors.push('derived only ' + d.files.length + ' modules from the host; the loader parser is broken');
    if (errors.length) return { code: 2, text: 'check_student_ai_gating: ' + errors.join('\n') + '\n', report: null };
    files = d.files;
  }

  const skipFiles = new Map(((allowlist.skipFiles) || []).map((e) => [e.file, e.reason]));
  const sanctioned = new Set(((allowlist.sanctionedTransport) || []).map((e) => e.file));
  const trust = resolveTrust(allowlist, root, readFile);
  trust.errors.forEach((e) => warnings.push(e));

  const scanned = [];
  const skipped = [];
  const missingFiles = [];
  let findings = [];
  for (const f of files) {
    if (skipFiles.has(f)) { skipped.push({ file: f, reason: skipFiles.get(f) }); continue; }
    const abs = path.join(root, f);
    if (!exists(abs)) { missingFiles.push(f); continue; }
    let txt;
    try { txt = readFile(abs); } catch (_) { missingFiles.push(f); continue; }
    scanned.push(f);
    findings = findings.concat(scanText(txt, f, { trusted: trust.trusted, sanctioned }));
  }
  if (missingFiles.length) warnings.push(missingFiles.length + ' host-loaded file(s) not on disk: ' + missingFiles.join(', '));
  for (const f of skipFiles.keys()) if (!files.includes(f)) warnings.push('skipFiles entry is not a host-loaded module: ' + f);

  const failing = findings.filter((f) => !f.advisory);
  const advisory = findings.filter((f) => f.advisory);
  const applied = applyAllowlist(failing, allowlist);
  const report = {
    derivedFrom, scanned: scanned.length, skipped, missingFiles, warnings,
    totals: { findings: failing.length, allowed: applied.allowed.length, unallowed: applied.unallowed.length, advisory: advisory.length, stale: applied.stale.length },
    unallowed: applied.unallowed, allowed: applied.allowed, advisory, stale: applied.stale, underused: applied.underused,
  };

  if (args.draft) {
    return { code: 0, report, text: JSON.stringify(buildDraft(failing, allowlist), null, 2) + '\n' };
  }
  let code = applied.unallowed.length ? 1 : 0;
  if (args.strictStale && (applied.stale.length || applied.underused.length)) code = 1;
  if (args.json) return { code, report, text: JSON.stringify(report, null, 2) + '\n' };

  const lines = [];
  if (!args.quiet) {
    lines.push('check_student_ai_gating: scanned ' + scanned.length + ' host-loaded module(s)' + (skipped.length ? ', skipped ' + skipped.length + ' teacher-only' : '') + '.');
    lines.push('  findings ' + failing.length + ' (allowlisted ' + applied.allowed.length + ', NEW ' + applied.unallowed.length + '); advisory typeof-tts-gate ' + advisory.length + '.');
    warnings.forEach((w) => lines.push('  warning: ' + w));
    if (applied.stale.length) {
      lines.push('  ' + applied.stale.length + ' allowlist entr' + (applied.stale.length === 1 ? 'y matches' : 'ies match') + ' nothing (fixed? prune them):');
      applied.stale.forEach((e) => lines.push('    - ' + e.file + ' [' + e.rule + '] ' + e.snippet.slice(0, 110)));
    }
  }
  if (applied.unallowed.length) {
    lines.push('');
    lines.push(applied.unallowed.length + ' student AI gating finding(s) not in ' + toPosix(path.relative(root, allowPath)) + ':');
    for (const f of applied.unallowed) {
      lines.push('  ' + f.file + ':' + f.line + '  [' + f.rule + ']' + (f.shape ? ' (' + f.shape + ')' : ''));
      lines.push('      ' + f.snippet.slice(0, 200));
    }
    lines.push('');
    lines.push('Fix: gate on window.__alloAiUsable(kind, fn) / the module _aiUsable helper / ctx.aiAvailable, never on');
    lines.push("typeof fn === 'function' (blocked host fns are truthy); drop `|| window.callGemini` aliases; route");
    lines.push('Gemini through the host (callGemini), never a raw generativelanguage fetch. A genuinely teacher-only');
    lines.push('use goes in the allowlist with a reason (keyed by snippet, not line).');
  }
  if (args.strictStale && (applied.stale.length || applied.underused.length)) lines.push('--strict-stale: allowlist has stale or over-sized entries.');
  return { code, report, text: lines.join('\n') + (lines.length ? '\n' : '') };
}

module.exports = {
  AI_FNS, TTS_FNS, RULES,
  normalize, readArray, deriveStudentModules, scanText, loadAllowlist, applyAllowlist, buildDraft, resolveTrust, run,
};

if (require.main === module) {
  const r = run(process.argv.slice(2));
  if (r.text) process.stdout.write(r.text);
  process.exitCode = r.code;
}
