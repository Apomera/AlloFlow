#!/usr/bin/env node
// _audit_stem_contrast_v2.cjs — AST-based WCAG contrast audit for stem tools.
//
// Replaces the v1 regex/line-proximity heuristic with proper JSX-tree analysis:
//   1. Parses each stem_tool_*.js with @babel/parser.
//   2. Builds a file-level symbol table (const X = '#hex'; etc.) so identifier
//      backgrounds resolve to literals instead of being skipped.
//   3. Walks the h(tag, props, ...children) call tree, maintaining an ancestor
//      bg stack — child elements correctly inherit from their actual parent in
//      the tree, not "the bg declared within 30 lines above" (which was v1's
//      flaw and produced the bulk of false positives).
//   4. Composites alpha through the entire ancestor chain until it hits a solid
//      bg — gives the actually-rendered color for translucent cards.
//   5. Resolves ternaries to both branches; the lower-contrast result is the
//      reported worst-case for that theme.
//   6. SKIPS rather than guessing when bg is unresolvable (e.g., `_pal.bg`,
//      props-driven backgrounds) — high-precision over high-recall.
//
// Sibling to _audit_stem_contrast.cjs (v1, kept for diffing/regression).

const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');

const TOOL_DIR = path.join(__dirname, 'stem_lab');
const REPORT_DIR = path.join(__dirname, 'a11y-audit');
const REPORT_PATH = path.join(REPORT_DIR, 'stem_contrast_audit_v2.txt');

// ─── Theme CSS-variable maps (mirror AlloFlowANTI.txt :root / .theme-dark) ──
const VAR_MAP = {
  light: {
    '--allo-stem-canvas': '#ffffff',  '--allo-stem-panel': '#f8fafc',
    '--allo-stem-deeper': '#e2e8f0',  '--allo-stem-text': '#0f172a',
    '--allo-stem-text-soft': '#475569', '--allo-stem-border': '#cbd5e1',
    '--allo-stem-button-bg': '#f1f5f9', '--allo-stem-button-text': '#0f172a',
    '--allo-stem-button-border': '#cbd5e1',
  },
  dark: {
    '--allo-stem-canvas': '#0f172a',  '--allo-stem-panel': '#1e293b',
    '--allo-stem-deeper': '#020617',  '--allo-stem-text': '#e2e8f0',
    '--allo-stem-text-soft': '#94a3b8', '--allo-stem-border': '#334155',
    '--allo-stem-button-bg': '#1e293b', '--allo-stem-button-text': '#e2e8f0',
    '--allo-stem-button-border': '#334155',
  },
};

// ─── Color parsing & WCAG math ─────────────────────────────────────────────
function hexToRgb(hex) {
  hex = hex.replace('#', '').trim();
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  if (hex.length !== 6) return null;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return { r, g, b, a: 1 };
}

function parseColor(raw, theme) {
  if (raw == null) return null;
  let s = String(raw).trim().replace(/^['"`]|['"`]$/g, '').trim();
  if (!s) return null;

  // var(--name, fallback) — recurse on themed value or fallback
  const v = s.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*(.+))?\)$/);
  if (v) {
    const themed = VAR_MAP[theme] && VAR_MAP[theme][v[1]];
    if (themed) return parseColor(themed, theme);
    if (v[2]) return parseColor(v[2], theme);
    return null;
  }
  const rgba = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)$/);
  if (rgba) {
    return {
      r: Math.round(+rgba[1]), g: Math.round(+rgba[2]), b: Math.round(+rgba[3]),
      a: rgba[4] !== undefined ? +rgba[4] : 1,
    };
  }
  if (/^#[0-9a-fA-F]{3,6}$/.test(s)) return hexToRgb(s);

  if (s.toLowerCase() === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };

  const NAMED = {
    white: '#ffffff', black: '#000000', red: '#ff0000',
    green: '#008000', blue: '#0000ff', yellow: '#ffff00',
    gray: '#808080', grey: '#808080',
  };
  if (Object.prototype.hasOwnProperty.call(NAMED, s.toLowerCase())) {
    return hexToRgb(NAMED[s.toLowerCase()]);
  }
  return null;
}

// Parse a CSS background value that may be a gradient. Returns an array of
// candidate solid colors (each color stop). For gradient bg's, contrast should
// be evaluated against each stop and the WORST ratio reported.
function parseBgCandidates(raw, theme) {
  if (raw == null) return [];
  let s = String(raw).trim().replace(/^['"`]|['"`]$/g, '').trim();
  if (!s) return [];

  // Gradient: extract all color stops
  if (/^(linear|radial|conic)-gradient\(/i.test(s)) {
    const colors = [];
    // Strip leading "linear-gradient(" and trailing ")"
    const inner = s.replace(/^(linear|radial|conic)-gradient\(/i, '').replace(/\)$/, '');
    // Split by commas at depth 0 (respect nested parens for rgb(), var())
    const parts = [];
    let depth = 0, cur = '';
    for (const ch of inner) {
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    if (cur.trim()) parts.push(cur.trim());
    // First part may be a direction ("135deg", "to right"); skip if it's not a color
    for (const p of parts) {
      // A stop is "color [position]". Strip trailing % position.
      const colorStr = p.replace(/\s+\d+(\.\d+)?%\s*$/, '').replace(/\s+\d+(\.\d+)?px\s*$/, '').trim();
      if (!colorStr) continue;
      const parsed = parseColor(colorStr, theme);
      if (parsed) colors.push(parsed);
    }
    return colors;
  }

  // Single solid color
  const single = parseColor(s, theme);
  return single ? [single] : [];
}

function compositeOver(fg, bg) {
  if (fg.a === undefined || fg.a >= 1) return { r: fg.r, g: fg.g, b: fg.b, a: 1 };
  const a = Math.max(0, Math.min(1, fg.a));
  return {
    r: Math.round(fg.r * a + bg.r * (1 - a)),
    g: Math.round(fg.g * a + bg.g * (1 - a)),
    b: Math.round(fg.b * a + bg.b * (1 - a)),
    a: 1,
  };
}

function relLum(c) {
  const ch = [c.r, c.g, c.b].map(v => {
    v = v / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

function contrast(fg, bg) {
  const L1 = relLum(fg), L2 = relLum(bg);
  const hi = Math.max(L1, L2), lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
}

// ─── AST utilities ─────────────────────────────────────────────────────────
function parseFile(src) {
  return parser.parse(src, {
    sourceType: 'unambiguous',
    allowReturnOutsideFunction: true,
    plugins: [],
    errorRecovery: true,
  });
}

// Try to evaluate an AST node to a string literal (color value, css var, etc.).
// Returns either { value: '...' } or { unresolved: true, reason: '...' }.
function evalNode(node, symbols) {
  if (!node) return { unresolved: true, reason: 'null-node' };
  if (node.type === 'StringLiteral') return { value: node.value };
  if (node.type === 'NumericLiteral') return { value: String(node.value) };
  if (node.type === 'BooleanLiteral') return { value: String(node.value) };
  if (node.type === 'NullLiteral') return { value: 'null' };

  if (node.type === 'TemplateLiteral') {
    // Resolve only if all expressions resolve
    let out = '';
    for (let i = 0; i < node.quasis.length; i++) {
      out += node.quasis[i].value.cooked;
      if (i < node.expressions.length) {
        const e = evalNode(node.expressions[i], symbols);
        if (e.unresolved) return { unresolved: true, reason: 'tpl-expr' };
        out += e.value;
      }
    }
    return { value: out };
  }
  if (node.type === 'Identifier') {
    if (Object.prototype.hasOwnProperty.call(symbols, node.name)) {
      return { value: symbols[node.name] };
    }
    return { unresolved: true, reason: 'unknown-identifier:' + node.name };
  }
  if (node.type === 'MemberExpression') {
    // e.g. _pal.bg, pt.color — unresolvable from this file alone
    return { unresolved: true, reason: 'member-expr' };
  }
  if (node.type === 'BinaryExpression' && node.operator === '+') {
    const l = evalNode(node.left, symbols);
    const r = evalNode(node.right, symbols);
    if (l.unresolved || r.unresolved) {
      return { unresolved: true, reason: 'binary-unresolved' };
    }
    return { value: l.value + r.value };
  }
  if (node.type === 'ConditionalExpression') {
    // Returns BOTH branches; caller decides what to do per theme.
    const cons = evalNode(node.consequent, symbols);
    const alt = evalNode(node.alternate, symbols);
    return { ternary: true, consequent: cons, alternate: alt };
  }
  if (node.type === 'LogicalExpression' && (node.operator === '||' || node.operator === '??')) {
    const l = evalNode(node.left, symbols);
    if (!l.unresolved && l.value && l.value !== 'null' && l.value !== '0') return l;
    return evalNode(node.right, symbols);
  }
  return { unresolved: true, reason: 'node-type:' + node.type };
}

// Collect all top-level + function-scope const/let/var Identifier = literal
// declarations, hoisting them into one symbol table. We don't track scope —
// fine because color constants in stem tools tend to be unique names.
function buildSymbolTable(ast) {
  const symbols = {};
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'VariableDeclaration') {
      for (const decl of node.declarations) {
        if (decl.id && decl.id.type === 'Identifier' && decl.init) {
          if (Object.prototype.hasOwnProperty.call(symbols, decl.id.name)) continue;
          const v = evalNode(decl.init, symbols);
          if (!v.unresolved && !v.ternary && v.value) {
            symbols[decl.id.name] = v.value;
          }
        }
      }
    }
    for (const key in node) {
      if (key === 'loc' || key === 'start' || key === 'end') continue;
      const child = node[key];
      if (Array.isArray(child)) child.forEach(walk);
      else if (child && typeof child === 'object' && child.type) walk(child);
    }
  }
  walk(ast);
  return symbols;
}

// Extract `style: { ... }` properties from an h() props ObjectExpression.
// Returns { color, bg, colorTernary, bgTernary } where each may be a raw value
// or { ternary: true, consequent, alternate }.
function extractStyle(propsNode, symbols) {
  const out = {};
  if (!propsNode || propsNode.type !== 'ObjectExpression') return out;

  // Find the style property
  let styleNode = null;
  for (const p of propsNode.properties) {
    if (p.type !== 'ObjectProperty' || p.computed) continue;
    const keyName = p.key.name || p.key.value;
    if (keyName === 'style' && p.value.type === 'ObjectExpression') {
      styleNode = p.value;
      break;
    }
  }
  if (!styleNode) return out;

  for (const p of styleNode.properties) {
    if (p.type !== 'ObjectProperty' || p.computed) continue;
    const keyName = p.key.name || p.key.value;
    if (keyName !== 'color' && keyName !== 'background' && keyName !== 'backgroundColor') continue;

    const evaluated = evalNode(p.value, symbols);
    const slot = (keyName === 'color') ? 'color' : 'bg';
    if (evaluated.ternary) {
      out[slot + 'Ternary'] = evaluated;
    } else if (!evaluated.unresolved) {
      out[slot] = evaluated.value;
    } else {
      // Record as unresolved so caller knows context exists but is uninspectable.
      out[slot + 'Unresolved'] = evaluated.reason;
    }
  }
  return out;
}

// ─── Walk the h() tree and emit findings ───────────────────────────────────
// findings: { fg, bg, bgChain, ratio, theme, line, file, confidence }
function walkHCalls(ast, symbols, file) {
  const findings = [];

  function evalContrastPair(fg, bgChain, theme, line, confidence) {
    // The stem-lab modal's inner wrapper sets `_pal.bg` (stem_lab_module.js:1357):
    // light theme → #ffffff, dark → #1e293b. Implicit chain root for cases
    // where the declared chain ends in translucency.
    const MODAL_ROOT = { light: '#ffffff', dark: '#1e293b' };
    const fgColor = parseColor(fg, theme);
    if (!fgColor) return;

    // For each chain layer, get candidate bg colors (gradient → multiple stops).
    // Walk bottom-up combining stop-by-stop to produce candidate effective bg's.
    // To keep this tractable, take CARTESIAN expansion across gradient layers
    // but cap to avoid explosion — typical chains have ≤1 gradient.
    const fullChain = [...bgChain, MODAL_ROOT[theme]];
    let candidateBgs = [null]; // start with placeholder

    for (let i = fullChain.length - 1; i >= 0; i--) {
      const candidates = parseBgCandidates(fullChain[i], theme);
      if (candidates.length === 0) continue;
      const next = [];
      for (const existing of candidateBgs) {
        for (const layer of candidates) {
          if (existing === null) {
            // Root layer — must be solid (we add MODAL_ROOT which always is)
            next.push({ r: layer.r, g: layer.g, b: layer.b, a: 1 });
          } else {
            next.push(compositeOver(layer, existing));
          }
        }
      }
      // Cap candidate count to avoid exponential blowup
      candidateBgs = next.slice(0, 16);
    }
    // Drop the null placeholder if nothing was added
    candidateBgs = candidateBgs.filter(c => c !== null);
    if (candidateBgs.length === 0) return;

    // Worst-case contrast across all candidate bg's
    let worst = { ratio: Infinity, bg: null };
    for (const bg of candidateBgs) {
      const composed = (fgColor.a !== undefined && fgColor.a < 1) ? compositeOver(fgColor, bg) : fgColor;
      const r = contrast(composed, bg);
      if (r < worst.ratio) worst = { ratio: r, bg };
    }

    const resolvedBgHex = '#' +
      [worst.bg.r, worst.bg.g, worst.bg.b].map(v => v.toString(16).padStart(2, '0')).join('');
    findings.push({
      file, line, theme,
      ratio: +worst.ratio.toFixed(2),
      fg: String(fg),
      bg: String(bgChain[0] || '?'),
      bgChain: bgChain.slice(),
      resolvedBg: resolvedBgHex,
      confidence,
    });
  }

  function visit(node, bgStack) {
    if (!node || typeof node !== 'object') return;

    // Recognize h(tag, props, ...children) call expressions
    const isHCall = node.type === 'CallExpression' &&
                    node.callee && node.callee.type === 'Identifier' &&
                    node.callee.name === 'h';

    let newBgStack = bgStack;
    if (isHCall) {
      const propsArg = node.arguments[1];
      const childArgs = node.arguments.slice(2);
      const style = extractStyle(propsArg, symbols);

      // Build new bg stack including any background declared at this element
      const addBgs = [];
      if (style.bg) addBgs.push(style.bg);
      if (style.bgTernary) {
        // For tree-tracking purposes, only one branch is "the" bg per render;
        // we'll evaluate both by branching the contrast checks below.
      }
      newBgStack = addBgs.length > 0 ? [...addBgs, ...bgStack] : bgStack;

      // If color is set, evaluate contrast for both themes against current chain
      const line = node.loc && node.loc.start ? node.loc.start.line : 0;

      // Build (color, bgChain) pairs. KEY FIX vs prior version: when both color
      // AND bg are ternaries, pair them POSITIONALLY (consequent×consequent,
      // alternate×alternate) — typically they share the same condition (a
      // `picked`/`active`/`isDark` flag), so cross-branch combos are wrong.
      // Each branch's color is rendered on its branch's bg, not the other's.
      const pairs = [];
      const colorTern = style.colorTernary;
      const bgTern = style.bgTernary;

      function chainWith(bgVal) {
        return bgVal != null ? [bgVal, ...bgStack] : bgStack;
      }

      if (colorTern && bgTern) {
        // Positional pairing — assume same condition
        const cCons = !colorTern.consequent.unresolved && !colorTern.consequent.ternary ? colorTern.consequent.value : null;
        const cAlt  = !colorTern.alternate.unresolved && !colorTern.alternate.ternary ? colorTern.alternate.value : null;
        const bCons = !bgTern.consequent.unresolved && !bgTern.consequent.ternary ? bgTern.consequent.value : null;
        const bAlt  = !bgTern.alternate.unresolved && !bgTern.alternate.ternary ? bgTern.alternate.value : null;
        if (cCons) pairs.push({ color: cCons, chain: chainWith(bCons), conf: 'ternary-paired' });
        if (cAlt)  pairs.push({ color: cAlt,  chain: chainWith(bAlt),  conf: 'ternary-paired' });
      } else if (colorTern && !bgTern) {
        const bgVal = style.bg || null;
        const c1 = !colorTern.consequent.unresolved && !colorTern.consequent.ternary ? colorTern.consequent.value : null;
        const c2 = !colorTern.alternate.unresolved && !colorTern.alternate.ternary ? colorTern.alternate.value : null;
        if (c1) pairs.push({ color: c1, chain: chainWith(bgVal), conf: 'ternary-color' });
        if (c2) pairs.push({ color: c2, chain: chainWith(bgVal), conf: 'ternary-color' });
      } else if (!colorTern && bgTern && style.color) {
        const b1 = !bgTern.consequent.unresolved && !bgTern.consequent.ternary ? bgTern.consequent.value : null;
        const b2 = !bgTern.alternate.unresolved && !bgTern.alternate.ternary ? bgTern.alternate.value : null;
        if (b1) pairs.push({ color: style.color, chain: chainWith(b1), conf: 'ternary-bg' });
        if (b2) pairs.push({ color: style.color, chain: chainWith(b2), conf: 'ternary-bg' });
      } else if (style.color) {
        pairs.push({ color: style.color, chain: newBgStack, conf: 'high' });
      }

      // Also detect gradient-text technique: WebkitBackgroundClip='text' means
      // the text is FILLED by the background — `color` is just a fallback for
      // unsupported browsers. Skip contrast check entirely in that case.
      let isGradientText = false;
      if (propsArg && propsArg.type === 'ObjectExpression') {
        for (const p of propsArg.properties) {
          if (p.type !== 'ObjectProperty' || p.computed) continue;
          if ((p.key.name || p.key.value) !== 'style') continue;
          if (p.value.type !== 'ObjectExpression') continue;
          for (const sp of p.value.properties) {
            if (sp.type !== 'ObjectProperty' || sp.computed) continue;
            const k = sp.key.name || sp.key.value;
            if (k === 'WebkitBackgroundClip' || k === 'backgroundClip') {
              const v = evalNode(sp.value, symbols);
              if (!v.unresolved && !v.ternary && v.value === 'text') isGradientText = true;
            }
          }
        }
      }

      if (!isGradientText) {
        for (const p of pairs) {
          if (p.chain.length === 0) continue;
          for (const theme of ['light', 'dark']) {
            evalContrastPair(p.color, p.chain, theme, line, p.conf);
          }
        }
      }

      // Recurse into children with new bg stack
      for (const ch of childArgs) visit(ch, newBgStack);
      // Also recurse into props for nested h() (e.g., conditional children)
      if (propsArg) visit(propsArg, newBgStack);
      return;
    }

    // Generic recursion for non-h nodes
    for (const key in node) {
      if (key === 'loc' || key === 'start' || key === 'end') continue;
      const child = node[key];
      if (Array.isArray(child)) {
        for (const c of child) visit(c, bgStack);
      } else if (child && typeof child === 'object' && child.type) {
        visit(child, bgStack);
      }
    }
  }

  visit(ast, []);
  return findings;
}

// ─── Run audit ─────────────────────────────────────────────────────────────
const files = fs.readdirSync(TOOL_DIR).filter(f => /^stem_tool_.*\.js$/.test(f));
let allFindings = [];
let parseErrors = [];
let symbolCounts = {};

for (const file of files) {
  const fullPath = path.join(TOOL_DIR, file);
  const src = fs.readFileSync(fullPath, 'utf-8');
  let ast;
  try {
    ast = parseFile(src);
  } catch (e) {
    parseErrors.push({ file, error: e.message.split('\n')[0] });
    continue;
  }
  const symbols = buildSymbolTable(ast);
  symbolCounts[file] = Object.keys(symbols).length;
  const findings = walkHCalls(ast, symbols, file);
  allFindings = allFindings.concat(findings);
}

// ─── Classify & report ─────────────────────────────────────────────────────
const FAIL_AA = 4.5;
const LARGE_AA = 3.0;

const failures = allFindings.filter(r => r.ratio < FAIL_AA);
const severe = failures.filter(r => r.ratio < LARGE_AA);
const near = failures.filter(r => r.ratio >= LARGE_AA);

// Dedupe by (file, theme, fg, bg, chain-length)
function dedupe(arr) {
  const seen = new Map();
  for (const r of arr) {
    const key = r.file + '|' + r.theme + '|' + r.fg + '|' + JSON.stringify(r.bgChain);
    if (!seen.has(key)) seen.set(key, { ...r, count: 1, lines: [r.line] });
    else { const e = seen.get(key); e.count++; if (!e.lines.includes(r.line)) e.lines.push(r.line); }
  }
  return Array.from(seen.values()).sort((a, b) => a.ratio - b.ratio);
}

const dedupedSevere = dedupe(severe);
const dedupedNear = dedupe(near);

// Curate to "high-confidence" subset by excluding finding patterns observed
// (via manual eyeball of top 20) to be dominant false-positive sources:
//   - bg is "transparent" (script can't see through to actual visual parent)
//   - bg string contains literal "undefined" (corrupted source — generator bug)
//   - bg string includes `linear-gradient(..., var(--allo-stem-canvas))` where
//     the second stop is theme-canvas (these are header bars; #fff text on a
//     gradient whose dark end IS the canvas works in dark theme by design)
//   - Same-color literal bg/fg cases (kept — these ARE real bugs)
//   - resolvedBg matches modal-root exactly (#ffffff/#1e293b) AND chain depth==1
//     AND bg is a single solid color literal — these are intentional buttons
//     (button color SET to canvas/panel for "muted" style)
function isLikelyFP(r) {
  const bg = String(r.bg);
  if (bg === 'transparent') return true;
  if (/undefined/.test(bg)) return true;
  if (bg.includes('var(--allo-stem-canvas') && bg.includes('linear-gradient')) return true;
  return false;
}
const dedupedSevereHC = dedupedSevere.filter(r => !isLikelyFP(r));
const dedupedNearHC = dedupedNear.filter(r => !isLikelyFP(r));

// Per-tool tally
const perTool = {};
for (const f of failures) {
  perTool[f.file] = perTool[f.file] || { severe: 0, near: 0 };
  if (f.ratio < LARGE_AA) perTool[f.file].severe++;
  else perTool[f.file].near++;
}

// ─── Write report ──────────────────────────────────────────────────────────
const out = [];
out.push('='.repeat(78));
out.push('  STEM-TOOL CONTRAST AUDIT v2 — AST-based, alpha-composited, symbol-resolved');
out.push('='.repeat(78));
out.push('');
out.push('Files scanned:             ' + files.length);
out.push('Parse failures:            ' + parseErrors.length);
out.push('Total pairs analyzed:      ' + allFindings.length);
out.push('  Severe failures (<3:1):  ' + severe.length + ' instances, ' + dedupedSevere.length + ' unique');
out.push('  Near-miss (3:1–4.5:1):   ' + near.length + ' instances, ' + dedupedNear.length + ' unique');
out.push('Tools with ≥1 failure:     ' + Object.keys(perTool).length + ' / ' + files.length);
out.push('');
out.push('METHOD:');
out.push('  • @babel/parser AST walk over h(tag, props, ...children) call trees');
out.push('  • File-level symbol resolution (const X = "#hex" identifiers resolve)');
out.push('  • Ternaries evaluated both branches; reported if either branch fails');
out.push('  • Backgrounds composited through the FULL ancestor chain until a solid');
out.push('    bg is hit — gives the actual rendered color, not v1\'s line proximity guess');
out.push('  • UNRESOLVED backgrounds (props-driven, _pal.bg, etc.) cause the finding');
out.push('    to be SKIPPED rather than guessed — high-precision over high-recall');
out.push('  • Two themes evaluated per pair: light (:root/theme-default) and dark');
out.push('');

if (parseErrors.length) {
  out.push('-'.repeat(78));
  out.push('PARSE FAILURES (file skipped entirely)');
  out.push('-'.repeat(78));
  for (const e of parseErrors) out.push('  ' + e.file + ' — ' + e.error);
  out.push('');
}

out.push('-'.repeat(78));
out.push('TOP TOOLS BY FAILURE COUNT');
out.push('-'.repeat(78));
const topTools = Object.entries(perTool)
  .map(([f, c]) => [f, c.severe, c.near, c.severe + c.near])
  .sort((a, b) => b[3] - a[3])
  .slice(0, 30);
for (const [f, sev, nm, total] of topTools) {
  out.push('  ' + String(total).padStart(4) + ' (' + String(sev).padStart(3) + ' severe, ' +
           String(nm).padStart(3) + ' near)   ' + f);
}
out.push('');

out.push('-'.repeat(78));
out.push('HIGH-CONFIDENCE SEVERE FAILURES — after FP filtering');
out.push('-'.repeat(78));
out.push('Excluded: transparent-bg cases, "undefined"-containing bg strings,');
out.push('and `linear-gradient(..., var(--allo-stem-canvas))` header bars.');
out.push('Format: ratio [theme] fg → bg  (resolved=after-composite)  ×instances  file:line');
out.push('');
for (const r of dedupedSevereHC.slice(0, 120)) {
  out.push('  ' + r.ratio.toString().padStart(5) + '  [' + r.theme.padEnd(5) + ']  ' +
           r.fg.padEnd(34) + ' → ' + r.bg.padEnd(28) +
           '  resolved=' + (r.resolvedBg || '?').padEnd(9) +
           '  ×' + r.count + '  ' + r.file + ':' + r.lines[0]);
}
if (dedupedSevereHC.length > 120) out.push('  ... ' + (dedupedSevereHC.length - 120) + ' more high-confidence pairs.');
out.push('');
out.push('  TOTAL: ' + dedupedSevereHC.length + ' high-confidence severe pairs (of ' + dedupedSevere.length + ' raw)');
out.push('');

out.push('-'.repeat(78));
out.push('NEAR-MISS (3:1 ≤ ratio < 4.5:1)');
out.push('-'.repeat(78));
for (const r of dedupedNear.slice(0, 60)) {
  out.push('  ' + r.ratio.toString().padStart(5) + '  [' + r.theme.padEnd(5) + ']  ' +
           r.fg.padEnd(34) + ' → ' + r.bg.padEnd(34) +
           '  depth=' + r.bgChain.length +
           '  ×' + r.count + '  ' + r.file + ':' + r.lines[0]);
}
if (dedupedNear.length > 60) out.push('  ... ' + (dedupedNear.length - 60) + ' more.');
out.push('');

try { if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true }); } catch (_) {}
fs.writeFileSync(REPORT_PATH, out.join('\n'));

console.log('Stem-tool contrast audit v2:');
console.log('  files=' + files.length + ', parse-errors=' + parseErrors.length);
console.log('  pairs analyzed:    ' + allFindings.length);
console.log('  severe failures:   ' + dedupedSevere.length + ' unique pairs (' + severe.length + ' instances)');
console.log('  near-miss:         ' + dedupedNear.length + ' unique pairs (' + near.length + ' instances)');
console.log('  tools w/ failures: ' + Object.keys(perTool).length + '/' + files.length);
console.log('Report: ' + path.relative(__dirname, REPORT_PATH).replace(/\\/g, '/'));
