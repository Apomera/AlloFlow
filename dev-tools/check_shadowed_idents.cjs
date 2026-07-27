#!/usr/bin/env node
/**
 * check_shadowed_idents — the complement to check_free_vars.
 *
 * check_free_vars catches an identifier that resolves to NOTHING. It cannot
 * catch one that resolves to the WRONG thing. In the STEM tools, `t` is the
 * translation function and `d` is the tool-data object, both closed over by
 * render bodies thousands of lines long. A single
 *
 *     for (var t = 0; t < 100; t++) { ... }
 *
 * hoists over its entire enclosing function, so any t('key', 'English') in that
 * function throws "t is not a function" — at runtime, in whichever branch was
 * not exercised during review. Golden digests cannot see it either: the branch
 * has to render for the throw to happen.
 *
 * This reports only TRUE positives: a shadowing declaration inside a function
 * whose body ALSO uses the shadowed identifier in its shadowed sense
 * (`t(` as a call, `d.` as a property read). A loop counter named `t` in a
 * function that never translates anything is noise, and is not reported.
 *
 *   node dev-tools/check_shadowed_idents.cjs                 # all STEM/SEL tools
 *   node dev-tools/check_shadowed_idents.cjs <file> [<file>] # specific files
 *
 * Exits 1 if any live shadow is found.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const SELF_TEST = process.argv.includes('--self-test');

function toolFiles() {
  const dirs = ['stem_lab', 'sel_lab'];
  const out = [];
  for (const dir of dirs) {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const f of fs.readdirSync(abs)) {
      if (/^stem_tool_.*\.js$/.test(f) || /^sel_tool_.*\.js$/.test(f)) out.push(path.join(dir, f));
    }
  }
  return out;
}

// Two conditions must BOTH hold for a shadow to be worth reporting:
//
//   uses  — the enclosing function still uses the identifier in its original
//           sense, so the shadow actually bites.
//   wrong — the shadow binds a value of a different KIND. Re-declaring
//           `var h = React.createElement` inside a nested IIFE rebinds the same
//           thing and is this codebase's house idiom; flagging it would bury the
//           real findings. A loop counter, a Date or a DOM node is another
//           matter entirely.
const WATCHED = {
  t: {
    uses: (body) => /[^\w.$]t\s*\(\s*['"]/.test(body),          // t('key', 'English')
    wrong: (init) => /^\s*(?:\d|-|new\s|document\b|'|")/.test(init) || /^\s*$/.test(init)
  },
  d: {
    uses: (body) => /[^\w.$]d\s*\.(?:mode|trials|results|v3|_)/.test(body),
    wrong: (init) => /^\s*(?:new\s+Date|document\b|\d)/.test(init)
  },
  h: {
    uses: (body) => /[^\w.$]h\s*\(\s*['"]/.test(body),          // h('div', ...)
    // Rebinding createElement — directly, or passed down as props.h / opts.h /
    // ctx.h — is the same value under the same name. Not a shadow worth naming.
    wrong: (init) => !/createElement|\b(?:props|opts|ctx|p)\s*\.\s*h\b/.test(init)
  }
};

// Walk back from an index to the enclosing `function` keyword, then brace-match
// forward to get that function's body.
function enclosingFunction(src, at) {
  const kw = src.lastIndexOf('function', at);
  if (kw < 0) return null;
  const open = src.indexOf('{', src.indexOf(')', kw));
  if (open < 0 || open > at) return null;
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return { start: open, end: i, body: src.slice(open, i + 1) };
    }
  }
  return null;
}

// A detector that reports "clean" is worthless unless you can show it would
// speak up. These four cases pin both directions: it must catch a shadow that
// bites, and stay silent on one that cannot.
const FIXTURES = [
  { name: 'live t (loop counter + a t() call in the same function)', flag: true, src:
    "var t = function (k, fb) { return fb; };\n" +
    "function renderThing() {\n  var out = [];\n  for (var t = 0; t < 10; t++) { out.push(t); }\n" +
    "  return t('stem.x.label', 'Label');\n}\n" },
  { name: 'live d (Date shadowing tool data that is still read)', flag: true, src:
    "var d = toolData.probability || {};\n" +
    "function panel() {\n  var d = new Date();\n  return d.mode + ' at ' + d.getHours();\n}\n" },
  { name: 'inert t (loop counter, function never translates)', flag: false, src:
    "var t = function (k, fb) { return fb; };\n" +
    "function counterOnly() {\n  var n = 0;\n  for (var t = 0; t < 10; t++) { n += t; }\n  return n;\n}\n" },
  { name: 'house idiom (h rebound to createElement in a nested IIFE)', flag: false, src:
    "var h = React.createElement;\n" +
    "function inner() {\n  var h = React.createElement;\n  return h('div', null, 'ok');\n}\n" }
];

function scan(src) {
  const found = [];
  for (const name of Object.keys(WATCHED)) {
    const decl = new RegExp('(?:^|[;{(\\s])(?:var|let|const)\\s+' + name + '\\s*(?:=|of\\b|in\\b|;)', 'g');
    const sites = [];
    let m;
    while ((m = decl.exec(src))) sites.push(m.index);
    if (sites.length < 2) continue;
    for (const at of sites.slice(1)) {
      const fn = enclosingFunction(src, at);
      if (!fn) continue;
      const declLine = src.slice(at, src.indexOf('\n', at));
      const eq = declLine.indexOf('=');
      const init = eq < 0 ? '' : declLine.slice(eq + 1);
      if (!WATCHED[name].wrong(init)) continue;
      if (!WATCHED[name].uses(fn.body.replace(declLine + '\n', ''))) continue;
      found.push({ name, line: src.slice(0, at).split(/\r?\n/).length, snippet: declLine.trim().slice(0, 90) });
    }
  }
  return found;
}

if (SELF_TEST) {
  let bad = 0;
  for (const f of FIXTURES) {
    const got = scan(f.src).length > 0;
    const ok = got === f.flag;
    if (!ok) bad++;
    console.log('  ' + (ok ? '✓' : '✗') + ' ' + (f.flag ? 'flags  ' : 'ignores') + '  ' + f.name);
  }
  if (bad) { console.error('\ncheck_shadowed_idents --self-test: ' + bad + ' fixture(s) wrong.'); process.exit(1); }
  console.log('✓ check_shadowed_idents --self-test: all ' + FIXTURES.length + ' fixtures behave.');
  process.exit(0);
}

const files = args.length ? args : toolFiles();
let live = 0;
const report = [];

for (const rel of files) {
  const abs = path.isAbsolute(rel) ? rel : path.join(ROOT, rel);
  let src;
  try { src = fs.readFileSync(abs, 'utf8'); } catch { continue; }

  for (const name of Object.keys(WATCHED)) {
    // Declarations of the watched name that are NOT the file's first (canonical) one.
    const decl = new RegExp('(?:^|[;{(\\s])(?:var|let|const)\\s+' + name + '\\s*(?:=|of\\b|in\\b|;)', 'g');
    const sites = [];
    let m;
    while ((m = decl.exec(src))) sites.push(m.index);
    if (sites.length < 2) continue;          // only the canonical declaration exists
    const canonical = sites[0];

    for (const at of sites) {
      if (at === canonical) continue;
      const fn = enclosingFunction(src, at);
      if (!fn) continue;
      const declLine = src.slice(at, src.indexOf('\n', at));
      // What is being bound? Everything after the `=` on the declaration line.
      const eq = declLine.indexOf('=');
      const init = eq < 0 ? '' : declLine.slice(eq + 1);
      if (!WATCHED[name].wrong(init)) continue;   // same kind of value — house idiom
      // Does the SAME function still use the original meaning?
      const rest = fn.body.replace(declLine + '\n', '');
      if (!WATCHED[name].uses(rest)) continue;    // shadow is inert here
      live++;
      report.push({
        file: rel,
        line: src.slice(0, at).split(/\r?\n/).length,
        name,
        snippet: src.slice(at, src.indexOf('\n', at)).trim().slice(0, 90)
      });
    }
  }
}

if (report.length) {
  console.error('\n  ✗ check_shadowed_idents: ' + live + ' live shadow(s) — the enclosing function still uses the shadowed name, so it will throw or read the wrong object at runtime:\n');
  for (const r of report) {
    console.error('      ' + r.file + ':' + r.line + '  shadows `' + r.name + '`  ' + r.snippet);
  }
  console.error('\n  Rename the local. check_free_vars cannot see this class.\n');
  process.exit(1);
}
console.log('✓ check_shadowed_idents: ' + files.length + ' tool(s), no live shadows of t / d / h.');
