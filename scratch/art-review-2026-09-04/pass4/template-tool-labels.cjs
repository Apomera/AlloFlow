// Turn a tool's ASSEMBLED aria-labels ("Plot " + n + ": " + name) into
// templates filled by an interpolation helper, so word order can change
// between languages. Installs the helper next to the tool's __alloT if it has
// none, using the same shape Art Studio uses.
//
// Conservative: converts a label only when every interpolated operand is free
// of string literals. An operand holding a literal is choosing an English word
// and needs its own key, so it is left alone.
//
//   node template-tool-labels.cjs <tool> [--dry-run]
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..', '..');
const tool = process.argv[2];
if (!tool || tool.startsWith('--')) throw new Error('usage: template-tool-labels.cjs <tool> [--dry-run]');
const DRY = process.argv.includes('--dry-run');
const PRIMARY = path.join(ROOT, 'stem_lab', 'stem_tool_' + tool + '.js');
const MIRROR = path.join(ROOT, 'desktop', 'web-app', 'public', 'stem_lab', 'stem_tool_' + tool + '.js');
let src = fs.readFileSync(PRIMARY, 'utf8');
if (fs.readFileSync(MIRROR, 'utf8') !== src) throw new Error('primary and mirror differ; refusing');
if (!/var __alloT\s*=/.test(src)) throw new Error(tool + ': only tools whose helper is __alloT are safe (t is shadowed in some tools)');

const nsRe = /(?:^|[^\w$.])__alloT\('([a-z_]+\.[a-z_]+)\./g;
const ns = [...new Set([...src.matchAll(nsRe)].map((m) => m[1]))];
if (ns.length !== 1) throw new Error('expected one namespace, found: ' + (ns.join(', ') || 'none'));
const NS = ns[0];

// Install the interpolation helper if absent, right after the __alloT declaration.
// A tool may declare __alloT in SEVERAL scopes (bird lab has three), and a
// helper declared beside only the first is not in scope for the rest -- that
// is a ReferenceError at render, not a test-pin nuisance. Declare it beside
// every one; `var` in separate function scopes is fine.
const HELPER_NAME = '__alloFill';
const declRe = /^([ \t]*)var __alloT = .*$/gm;
const decls = [...src.matchAll(declRe)];
if (!decls.length) throw new Error('could not locate an __alloT declaration');
const body = 'var ' + HELPER_NAME + ' = function (template, values) { return String(template).replace(/\\{([A-Za-z0-9_]+)\\}/g, function (m, k) { return Object.prototype.hasOwnProperty.call(values, k) ? String(values[k]) : m; }); };';
for (const d of decls.reverse()) {
  const after = src.slice(d.index + d[0].length, d.index + d[0].length + 400);
  if (after.includes('var ' + HELPER_NAME)) continue;      // already beside this one
  const indent = d[1];
  const helper = '\n' + indent + '// Fills {value1}-style placeholders, so a translation can reorder them.\n' + indent + body;
  src = src.slice(0, d.index + d[0].length) + helper + src.slice(d.index + d[0].length);
}

const uiPath = path.join(ROOT, 'ui_strings.js');
const section = NS.split('.').reduce((o, k) => (o || {})[k], JSON.parse(fs.readFileSync(uiPath, 'utf8')));
if (!section) throw new Error('no ui_strings section ' + NS);
const keys = {};
function keyFor(text, prefix) {
  let base = (prefix || 'a11y_') + text.toLowerCase().replace(/\{[a-z0-9_]+\}/g, ' ').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (base.length > 52) base = base.slice(0, 52).replace(/_+$/, '');
  let key = base, n = 2;
  while ((key in section && section[key] !== text) || (keys[key] && keys[key] !== text)) key = base + '_' + n++;
  keys[key] = text;
  return key;
}
function splitPlus(body) {
  const parts = [];
  let depth = 0, inStr = null, last = 0;
  for (let k = 0; k < body.length; k++) {
    const c = body[k];
    if (inStr) { if (c === '\\') k++; else if (c === inStr) inStr = null; continue; }
    if (c === "'" || c === '"') inStr = c;
    else if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (c === '+' && depth === 0) { parts.push(body.slice(last, k)); last = k + 1; }
  }
  parts.push(body.slice(last));
  return parts.map((p) => p.trim());
}
const asLiteral = (p) => {
  if (/^'(?:[^'\\]|\\.)*'$/.test(p)) return p.slice(1, -1).replace(/\\'/g, "'");
  if (/^"(?:[^"\\]|\\.)*"$/.test(p)) return p.slice(1, -1).replace(/\\"/g, '"');
  return null;
};
function sites(text) {
  const out = [];
  const re = /["']aria-label["']\s*:\s*/g;
  let m;
  while ((m = re.exec(text))) {
    const start = m.index + m[0].length;
    if (text[start] !== "'" && text[start] !== '"') continue;
    let depth = 0, inStr = null, end = -1;
    for (let j = start; j < text.length; j++) {
      const c = text[j];
      if (inStr) { if (c === '\\') j++; else if (c === inStr) inStr = null; continue; }
      if (c === "'" || c === '"') { inStr = c; continue; }
      if (c === '(' || c === '[' || c === '{') depth++;
      else if (c === ')' || c === ']' || c === '}') { if (depth === 0) { end = j; break; } depth--; }
      else if (c === ',' && depth === 0) { end = j; break; }
    }
    if (end < 0) continue;
    if (!text.slice(start, end).includes('+')) continue;
    out.push({ start, end, value: text.slice(start, end) });
  }
  return out;
}

// Assembled announcements have the same problem as assembled labels, so give
// them the same treatment. The announcing function keeps its own name.
const ANNOUNCE_HELPERS = ['announceToSR', 'announce', 'srAnnounce', 'announceLive', 'sayToSR'];

// ...plus whatever this file calls its own. Most tools wrap the live region in a
// helper named for themselves - announceBee, rhAnnounce, arAnnounce, llAnnounce -
// and a fixed list silently templates NONE of their announcements while
// reporting success on the labels. dev-tools/scan_untranslated_a11y.cjs was
// blind the same way and now discovers helpers by shape; this matches it.
const ANNOUNCE_DECL = /(?:function\s+([A-Za-z_$][\w$]*)\s*\(|(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?function\s*\()/g;
function announceHelpers(text) {
  const names = new Set(ANNOUNCE_HELPERS);
  for (const m of text.matchAll(ANNOUNCE_DECL)) {
    const name = m[1] || m[2];
    if (/announce/i.test(name)) names.add(name);
  }
  return [...names];
}

function announcementSites(text) {
  const out = [];
  for (const fn of announceHelpers(text)) {
    let i = 0;
    const needle = fn + '(';
    while ((i = text.indexOf(needle, i)) !== -1) {
      if (/[\w$.]/.test(text[i - 1] || ' ')) { i += needle.length; continue; }
      const open = i + needle.length;
      let depth = 1, j = open, inStr = null;
      for (; j < text.length && depth > 0; j++) {
        const c = text[j];
        if (inStr) { if (c === '\\') j++; else if (c === inStr) inStr = null; continue; }
        if (c === "'" || c === '"') inStr = c;
        else if (c === '(') depth++;
        else if (c === ')') depth--;
      }
      const value = text.slice(open, j - 1);
      // ★ Only a SINGLE-argument call. This captures the whole argument list, so
      // `announceBee('Step ' + n, false)` would be rewritten to
      // `announceBee(__alloFill(...), { value1: n, false })`, which does not
      // parse. Beehive has exactly that shape. A top-level comma means extra
      // arguments, so leave the call alone.
      let commaDepth = 0, extraArgs = false, q = null;
      for (let k = 0; k < value.length; k++) {
        const c = value[k];
        if (q) { if (c === '\\') k++; else if (c === q) q = null; continue; }
        if (c === "'" || c === '"' || c === '`') { q = c; continue; }
        if (c === '(' || c === '[' || c === '{') commaDepth++;
        else if (c === ')' || c === ']' || c === '}') commaDepth--;
        else if (c === ',' && commaDepth === 0) { extraArgs = true; break; }
      }
      if (/^\s*['"]/.test(value) && value.includes('+') && !extraArgs) out.push({ start: open, end: j - 1, value, fn });
      i = j;
    }
  }
  return out;
}

const found = [...sites(src), ...announcementSites(src)];
const edits = [];
let skipped = 0;
for (const site of found) {
  const parts = splitPlus(site.value);
  let template = '', v = 0, clean = true;
  const values = [];
  for (const part of parts) {
    const lit = asLiteral(part);
    if (lit !== null) { template += lit; continue; }
    if (/['"]/.test(part)) { clean = false; break; }
    v += 1;
    template += '{value' + v + '}';
    values.push(['value' + v, part]);
  }
  if (!clean || !values.length || template.includes("'")) { skipped += 1; continue; }
  const key = keyFor(template, site.fn ? 'sr_' : 'a11y_');
  const obj = '{ ' + values.map(([n2, e]) => n2 + ': ' + e).join(', ') + ' }';
  edits.push({ ...site, replacement: HELPER_NAME + "(__alloT('" + NS + '.' + key + "', '" + template + "'), " + obj + ')' });
}
if (!edits.length) throw new Error('nothing convertible (' + skipped + ' skipped)');
edits.sort((a, b) => b.start - a.start);
for (const e of edits) src = src.slice(0, e.start) + e.replacement + src.slice(e.end);

function addKeys(file) {
  const text = fs.readFileSync(file, 'utf8');
  const parsed = JSON.parse(text);
  const parts = NS.split('.');
  const anchor = '\n    "' + parts[parts.length - 1] + '": {\n';
  if (text.split(anchor).length - 1 !== 1) throw new Error('section anchor not unique in ' + file);
  const block = Object.entries(keys).map(([k, v]) => '      ' + JSON.stringify(k) + ': ' + JSON.stringify(v) + ',').join('\n') + '\n';
  const out = text.replace(anchor, () => anchor + block);
  const after = JSON.parse(out);
  const target = parts.reduce((o, k) => o[k], after);
  for (const [k, v] of Object.entries(keys)) if (target[k] !== v) throw new Error('verify failed ' + k);
  const lost = [];
  (function walk(a, b, p) {
    for (const k of Object.keys(a || {})) {
      const x = a[k], y = b ? b[k] : undefined;
      if (x && typeof x === 'object') { if (!y || typeof y !== 'object') lost.push(p + '/' + k); else walk(x, y, p + '/' + k); }
      else if (JSON.stringify(x) !== JSON.stringify(y)) lost.push(p + '/' + k);
    }
  })(parsed, after, '');
  if (lost.length) throw new Error(file + ' would lose ' + lost.length + ' key(s)');
  if (!DRY) { fs.writeFileSync(file, out, 'utf8'); if (fs.readFileSync(file, 'utf8') !== out) throw new Error('verify after write failed'); }
}
if (!DRY) for (const f of [PRIMARY, MIRROR]) { fs.writeFileSync(f, src, 'utf8'); if (fs.readFileSync(f, 'utf8') !== src) throw new Error('verify after write failed for ' + f); }
addKeys(uiPath);
addKeys(path.join(ROOT, 'desktop', 'web-app', 'public', 'ui_strings.js'));
console.log((DRY ? '[dry-run] ' : '') + tool + ': templated ' + edits.length + ' assembled labels, ' + Object.keys(keys).length + ' keys; ' + skipped + ' left (they choose an English word)');
