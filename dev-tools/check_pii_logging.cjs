#!/usr/bin/env node
// check_pii_logging.cjs — gate for error logging that carries what people wrote.
//
// The in-app bug reporter records every console.error / console.warn (and the
// host's warnLog). Since 2026-10-28 its default report sends none of that text,
// but a teacher-view user can opt into the full log, and the local log, Copy log
// and DevTools all show it. So the safe place to stop personal data is the call
// itself: log a length, a type, a status or an id, never the content.
//
// Flagged, in the non-literal part of console.error/console.warn/warnLog
// arguments and of `throw new Error(...)` messages:
//   * a text preview: .slice( / .substring( / .substr( on anything
//   * a value named like content: raw text or responses, result, text, content,
//     sentence, prompt, answer, essay, transcript, reflection, cleaned, parsed,
//     student or roster data, email
//   * a content property of a non-error object: .title .text .content .name
//     .answer .prompt .body .value .description .notes .textContent .innerText
// Not flagged: .length, typeof x, !!x, Array.isArray(x), an error's .message /
// .name / .code / .stack, a response's .status / .ok / .statusText.
//
// A reviewed exception carries `pii-safe: <reason>` on the call's line or the
// line above. dev-tools/pii_logging_baseline.json holds sites in files other
// sessions were editing when the gate landed; each must be fixed, not grown.
//
// Usage: node dev-tools/check_pii_logging.cjs [--quiet] [--selftest] [--list-json]

'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const QUIET = args.includes('--quiet');
const BASELINE_FILE = path.join(__dirname, 'pii_logging_baseline.json');

const CALL = /\b(console\.(?:error|warn)|warnLog|throw\s+new\s+\w*Error|reject\(\s*new\s+\w*Error)\s*\(/g;
const CONTENT_NAME = /^(?:raw(?:Text|Response|Content|Input|Json|JSON|Output|Result|Body|Data)?|\w+RawResponse|response(?:Text|Body)?|resp|body|result|results|text|rawText|safeText|sourceText|userText|inputText|draftText|content|sentences?|prompts?|\w+Prompt|answers?|\w+Answers?|essays?|transcripts?|reflections?|cleaned|parsed|students?|student(?:Name|Names|Text|Work|Answer|Answers|Data|Record)|roster|rosterKey|e?mails?|emailAddress|journal|submissions?)$/;
// Names that hold a size or a flag even when they mention content.
const MEASURE_NAME = /(?:Count|Counts|Length|Len|Chars|Size|Ratio|Pct|Percent|Id|Ids|Ok|Ms|KB|Kb|Bytes|Index|Idx)$/;
const CONTENT_PROP = /^(?:title|text|content|name|answer|prompt|body|value|description|notes?|caption|textContent|innerText|transcript|essay|studentName|displayName|fullName)$/;
const ERROR_ROOT = /^(?:e|e\d|err|error|ex|exc|reason|\w*Err|\w*Error)$/;
const SAFE_PROP = /^(?:length|size|byteLength|status|statusText|ok|type|kind|code|id|count|readyState|message|stack|error)$/;

// The call's arguments up to the matching paren, skipping string literals.
function argsOf(text, open) {
  let depth = 0, out = '', quote = null;
  for (let i = open; i < text.length && i < open + 4000; i++) {
    const c = text[i];
    if (quote) {
      out += c;
      if (c === '\\') { out += text[++i] || ''; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; out += c; continue; }
    if (c === '(') depth++;
    if (c === ')') { depth--; if (depth === 0) break; }
    out += c;
  }
  return out.slice(1);
}

// Literal text removed; template ${expressions} and code kept.
function codeOf(argText) {
  return argText
    .replace(/`(?:\\.|[^`\\])*`/g, (t) => ' ' + (t.match(/\$\{([^}]*)\}/g) || []).map((x) => x.slice(2, -1)).join(' ') + ' ')
    .replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    // Shapes that report a size or a kind, never the value.
    .replace(/\btypeof\s+[\w$.?]+/g, ' ')
    .replace(/!!\s*[\w$.?]+/g, ' ')
    .replace(/Array\.isArray\(\s*[\w$.?]+\s*\)/g, ' ')
    .replace(/String\(\s*[\w$.?]+\s*(?:\|\|\s*)?\)\s*\.length\b/g, ' ')
    // A value used only as a guard (`result && result.error`, `r.status ? a : b`).
    .replace(/\b[A-Za-z_$][\w$]*(?:\??\.[A-Za-z_$][\w$]*)*\s*(?:&&|\?(?![.?]))/g, ' ');
}

function findings(code) {
  const out = [];
  if (/\.(?:slice|substring|substr)\s*\(/.test(code)) out.push('text preview (.slice/.substring)');
  const re = /([A-Za-z_$][\w$]*(?:\??\.[A-Za-z_$][\w$]*)*)(\s*\()?/g;
  let m;
  while ((m = re.exec(code))) {
    const chain = m[1];
    if (m[2]) continue; // a function or method call, judged by its arguments
    const parts = chain.split(/\??\./);
    const root = parts[0];
    const last = parts[parts.length - 1];
    if (MEASURE_NAME.test(last)) continue;
    if (parts.length > 1 && SAFE_PROP.test(last)) continue;
    if (parts.length === 1 && CONTENT_NAME.test(root)) { out.push('content value `' + root + '`'); continue; }
    if (parts.length > 1 && !ERROR_ROOT.test(root) && CONTENT_PROP.test(last)) out.push('content property `' + chain + '`');
  }
  return [...new Set(out)];
}

function scanText(text) {
  const lines = text.split('\n');
  const hits = [];
  let m;
  CALL.lastIndex = 0;
  while ((m = CALL.exec(text))) {
    const argText = argsOf(text, m.index + m[0].length - 1);
    const why = findings(codeOf(argText));
    if (!why.length) continue;
    const line = text.slice(0, m.index).split('\n').length;
    // Embedded minified bundles (vendored libraries inside a tool) are not our logging.
    if ((lines[line - 1] || '').length > 3000) continue;
    if (/pii-safe:/.test(lines[line - 1] || '') || /pii-safe:/.test(lines[line - 2] || '')) continue;
    const call = (m[1] + '(' + argText + ')').replace(/\s+/g, ' ').trim();
    hits.push({ line, why, call, key: call.slice(0, 200) });
  }
  return hits;
}

function shippedFiles() {
  const out = execFileSync('git', ['ls-files', '--', '*_source.jsx', 'AlloFlowANTI.txt', 'stem_lab/stem_tool_*.js', 'sel_hub/*.js', 'error_reporter_module.js'], { cwd: ROOT, maxBuffer: 1 << 28 });
  // Shipped sources only: build mirrors and saved evidence copies are not code anyone runs.
  return out.toString().split('\n').filter((f) => f && !/^(?:desktop|reports|artifacts|tmp|tests|dev-tools|_archive)\//.test(f));
}

function selftest() {
  const bad = [
    "console.warn('Sentence TTS failed for:', sentence, error);",
    "console.error('[DBQ] parse failed', String(result || '').substring(0, 1000));",
    "console.error(`Resource ${i} (${r?.type}/${r?.title}) failed`);",
    "console.warn('Raw response:', rawResponse);",
    "warnLog('roster', rosterKey);",
    "throw new Error('No match for ' + studentName);",
  ];
  const good = [
    "console.warn('Sentence TTS failed (' + String(sentence || '').length + ' characters):', error);",
    "console.error('[TTS] API Error; HTTP status:', response.status);",
    "console.error('[X] failed:', err.message, e.name);",
    "console.warn('parsed type:', Array.isArray(poses) ? 'array' : typeof poses);",
    "console.error('Invalid roster JSON:', err);",
    "// pii-safe: app UI strings, not user data\nconsole.error('First 300 chars:', cleaned.substring(0, 300));",
  ];
  const failures = [];
  for (const s of bad) if (!scanText(s).length) failures.push('MISSED: ' + s);
  for (const s of good) if (scanText(s).length) failures.push('FALSE ALARM: ' + s + ' -> ' + scanText(s)[0].why.join('; '));
  if (failures.length) { console.error('check_pii_logging --selftest FAILED\n  ' + failures.join('\n  ')); process.exit(1); }
  console.log('check_pii_logging --selftest: ' + bad.length + ' bad shapes caught, ' + good.length + ' safe shapes passed.');
  process.exit(0);
}

if (args.includes('--selftest')) selftest();

let baseline = {};
try { baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8')).accepted || {}; } catch (_) {}
const fresh = [];
let accepted = 0;
for (const f of shippedFiles()) {
  let text;
  try { text = fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch (_) { continue; }
  for (const h of scanText(text)) {
    if ((baseline[f] || []).some((b) => b.key === h.key)) { accepted++; continue; }
    fresh.push({ f, ...h });
  }
}
if (args.includes('--list-json')) { console.log(JSON.stringify(fresh.map((h) => ({ file: h.f, line: h.line, why: h.why, key: h.key })), null, 1)); process.exit(0); }
if (fresh.length) {
  console.error('✗ error logging that can carry what people wrote (' + fresh.length + ' site(s)):');
  for (const h of fresh) console.error('  ' + h.f + ':' + h.line + '  ' + h.why.join('; ') + '\n      ' + h.call.slice(0, 180));
  console.error('\n  Log a length, type, status or id instead. If a site is genuinely safe, add');
  console.error('  `// pii-safe: <reason>` on the line above it.');
  process.exit(1);
}
if (!QUIET) console.log('✓ no error logging carries content (' + accepted + ' baselined site(s) awaiting a fix).');
