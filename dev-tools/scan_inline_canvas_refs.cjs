#!/usr/bin/env node
// scan_inline_canvas_refs.cjs — gate for the "inline callback ref re-initializes
// the canvas on every re-render" stutter class.
//
// React calls a callback ref with (null) then (node) on EVERY re-render when the
// ref function has a new identity, which an INLINE `ref: function(cv){...}`
// always does. If that ref body does setup work, the setup re-runs constantly.
// These tools push React state WHILE animating, so the loop is:
//   animate -> setState -> re-render -> ref re-init -> reset -> repeat.
//
// Three shipped incidents before any gate existed (see the stutter memory):
//   * DNA Lab: `cv.width = cv.offsetWidth*2` in setup. Assigning canvas.width
//     REALLOCATES and CLEARS the bitmap and resets the ctx transform, and
//     `var _tick = 0` restarted the animation -> visible snap/flicker.
//   * Ecosystem: the whole sim (creatures, vegetation, popHistory) lived in the
//     ref scope, so every render rebuilt and reset it.
//   * geometryWorld: the ref owned a full THREE engine, so every upd() did
//     destroy -> re-init. Aaron's report was "visuals aren't appearing".
//
// Every existing gate is blind to this: check_free_vars, check_stem_render,
// check_tdz_render and check_render_refs all pass on the broken code, because
// it parses, renders once, and only misbehaves on the SECOND render.
//
// FLAG = the ref body does re-initialization work with no idempotence guard.
//   work  : assigns node.width/.height, starts a rAF loop, constructs a
//           renderer/engine, or calls an init/build/setup-shaped function
//   guard : an early return keyed on a node-owned marker
//           (`if (cv._fooInit) return;`), a marker assignment (`cv._foo = true`),
//           or a dimension guard (`if (cv.width !== _tw) { ... }`)
// The fixed shape (geometryWorld's compass: `if (cv._compassStarted) return;`)
// therefore reads clean, and so do the repaired DNA/Ecosystem tools.
//
// Usage: node dev-tools/scan_inline_canvas_refs.cjs [--info] [--quiet] [files...]

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const acorn = require(path.join(ROOT, 'desktop/web-app/node_modules/acorn'));

const FN_TYPES = new Set(['FunctionExpression', 'ArrowFunctionExpression']);
const INIT_CALL_RE = /^(init|setup|build|create|start|mount|attach|boot)[A-Z_]?/;
const ENGINE_CALL_RE = /(Engine|Scene|Sim|Renderer|World|Canvas)$/;
// 2D-context factory methods. They match INIT_CALL_RE by spelling but are
// ordinary per-draw helpers, not initialization: making a gradient or an
// ImageData every render is normal drawing work, not a re-init to guard
// against. Left in, artstudio's depth-map thumbnails read as offenders.
const DRAW_HELPER_RE = /^create(ImageData|LinearGradient|RadialGradient|ConicGradient|Pattern|Element|ElementNS|ObjectURL)$/;

function isNode(v) { return v && typeof v === 'object' && typeof v.type === 'string'; }

function walk(node, visit, ancestors) {
  visit(node, ancestors);
  ancestors.push(node);
  for (const key of Object.keys(node)) {
    if (key === 'loc') continue;
    const v = node[key];
    if (Array.isArray(v)) { for (const c of v) if (isNode(c)) walk(c, visit, ancestors); }
    else if (isNode(v)) walk(v, visit, ancestors);
  }
  ancestors.pop();
}

function memberOf(node, paramName) {
  return node && node.type === 'MemberExpression'
    && node.object && node.object.type === 'Identifier' && node.object.name === paramName
    ? (node.property && (node.property.name || node.property.value)) || null
    : null;
}

// Any reference to `<param>.<something>` that looks like a private marker
// (leading underscore) counts toward the guard signal, whether it is being
// tested or set — both halves of the idempotence idiom use one.
function analyzeRef(fnNode, src) {
  const param = fnNode.params && fnNode.params[0] && fnNode.params[0].type === 'Identifier'
    ? fnNode.params[0].name : null;
  const work = [];
  let guard = false;

  walk(fnNode.body, (n, anc) => {
    if (param) {
      // marker test: if (cv._foo) ... / if (!cv._foo) ...
      if (n.type === 'IfStatement') {
        let t = n.test;
        while (t && t.type === 'UnaryExpression' && t.operator === '!') t = t.argument;
        const p = memberOf(t, param);
        if (p && p[0] === '_') guard = true;
        // dimension guard: if (cv.width !== X) { ... }
        if (t && t.type === 'BinaryExpression' && /^[!=]==?$/.test(t.operator)
            && (memberOf(t.left, param) === 'width' || memberOf(t.left, param) === 'height')) {
          guard = true;
        }
        if (t && t.type === 'LogicalExpression') {
          for (const side of [t.left, t.right]) {
            const q = side && (memberOf(side, param)
              || (side.type === 'BinaryExpression' ? memberOf(side.left, param) : null));
            if (q === 'width' || q === 'height' || (q && q[0] === '_')) guard = true;
          }
        }
      }
      // marker assignment: cv._foo = true
      if (n.type === 'AssignmentExpression') {
        const p = memberOf(n.left, param);
        if (p && p[0] === '_') guard = true;
        if (p === 'width' || p === 'height') {
          work.push('assigns ' + param + '.' + p + ' @' + n.loc.start.line);
        }
      }
    }
    if (n.type === 'CallExpression') {
      const callee = n.callee;
      const name = callee.type === 'Identifier' ? callee.name
        : (callee.type === 'MemberExpression' && callee.property
          ? (callee.property.name || callee.property.value) : null);
      if (name === 'requestAnimationFrame') work.push('starts rAF loop @' + n.loc.start.line);
      if (name && (INIT_CALL_RE.test(name) || ENGINE_CALL_RE.test(name)) && !DRAW_HELPER_RE.test(name)) {
        work.push('calls ' + name + '() @' + n.loc.start.line);
      }
    }
    if (n.type === 'NewExpression' && n.callee) {
      const nm = n.callee.type === 'Identifier' ? n.callee.name
        : (n.callee.property && n.callee.property.name) || '';
      if (/Renderer|Engine|Scene|Observer/.test(nm)) work.push('constructs ' + nm + ' @' + n.loc.start.line);
    }
  }, []);

  return { param, work, guard, line: fnNode.loc.start.line };
}

// A ref that only delegates (`ref: function(el){ if (el) initMap(el); }`) is
// safe when the DELEGATE is idempotent. geo's initMap reuses a live map when
// the container matches, and initGlobe stamps the node — both re-init only on
// a genuinely new node. Judging the ref body alone would flag them wrongly.
function delegateIsGuarded(fnNode) {
  const param = fnNode.params && fnNode.params[0] && fnNode.params[0].type === 'Identifier'
    ? fnNode.params[0].name : null;
  const r = analyzeRef(fnNode);
  if (r.guard) return true;
  let guarded = false;
  walk(fnNode.body, (n) => {
    if (n.type !== 'IfStatement' || !n.consequent) return;
    let hasReturn = false;
    walk(n.consequent, (c) => { if (c.type === 'ReturnStatement') hasReturn = true; }, []);
    if (!hasReturn) return;
    // A reuse/identity test rather than a bare null check: mentions the param
    // in a comparison, or consults a stored handle (.current / a marker prop).
    let reuseTest = false;
    walk(n.test, (t) => {
      if (t.type === 'BinaryExpression' && /^[!=]==?$/.test(t.operator)) reuseTest = true;
      if (t.type === 'MemberExpression' && t.property
          && (t.property.name === 'current' || String(t.property.name || '')[0] === '_')) reuseTest = true;
    }, []);
    if (reuseTest) guarded = true;
  }, []);
  return guarded;
}

function scanFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  let ast;
  try {
    ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', locations: true });
  } catch (e) {
    return { file, parseError: e.message, fails: [], infos: [] };
  }

  // Index locally-declared functions so a delegating ref can be followed.
  const byName = new Map();
  walk(ast, (n, anc) => {
    if (n.type === 'FunctionDeclaration' && n.id) byName.set(n.id.name, n);
    else if (n.type === 'VariableDeclarator' && n.id && n.id.name && n.init && FN_TYPES.has(n.init.type)) {
      byName.set(n.id.name, n.init);
    }
  }, []);

  const fails = [], infos = [];
  walk(ast, (node) => {
    if (node.type !== 'Property') return;
    const key = node.key && (node.key.name || node.key.value);
    if (key !== 'ref') return;
    if (!node.value || !FN_TYPES.has(node.value.type)) return; // ref: someStableRef -> fine
    const r = analyzeRef(node.value);
    if (!r.work.length) return;                       // no setup work -> harmless

    // Drop delegated work whose target guards itself.
    const work = r.work.filter((w) => {
      const m = /^calls (\w+)\(\)/.exec(w);
      if (!m) return true;
      const target = byName.get(m[1]);
      return !(target && delegateIsGuarded(target));
    });
    if (!work.length) return;

    const entry = { line: r.line, work: work.slice(0, 4), guard: r.guard };
    if (r.guard) infos.push(entry); else fails.push(entry);
  }, []);
  return { file, fails, infos };
}

const argv = process.argv.slice(2);
const showInfo = argv.includes('--info');
const quiet = argv.includes('--quiet');
const fileArgs = argv.filter((a) => !a.startsWith('--'));
const files = fileArgs.length ? fileArgs
  : fs.readdirSync(path.join(ROOT, 'stem_lab'))
      .filter((f) => /^stem_tool_.*\.js$/.test(f))
      .map((f) => path.join('stem_lab', f));

let failFiles = 0, failCount = 0, infoCount = 0, parseErrors = 0;
for (const rel of files) {
  const r = scanFile(path.resolve(ROOT, rel));
  if (r.parseError) { parseErrors++; console.log('PARSE FAIL ' + rel + ': ' + r.parseError); continue; }
  if (r.fails.length) {
    failFiles++; failCount += r.fails.length;
    console.log('FLAG ' + rel);
    for (const f of r.fails) console.log('   - inline ref @' + f.line + ' (NO guard): ' + f.work.join('; '));
  }
  infoCount += r.infos.length;
  if (showInfo && r.infos.length) {
    console.log('INFO ' + rel);
    for (const f of r.infos) console.log('   ~ inline ref @' + f.line + ' (guarded): ' + f.work.join('; '));
  }
}
if (!quiet || failFiles || parseErrors) {
  console.log('---');
  console.log('scan_inline_canvas_refs: ' + files.length + ' file(s), ' + failCount + ' unguarded re-init ref(s) in '
    + failFiles + ' file(s), ' + infoCount + ' guarded (' + (showInfo ? 'shown' : '--info to list') + '), '
    + parseErrors + ' parse failure(s).');
}
process.exit(failFiles || parseErrors ? 1 : 0);
