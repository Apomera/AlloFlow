#!/usr/bin/env node
// One-shot: re-run the v2 audit logic and dump ALL findings for a single file.
const path = require('path');
const TOOL = process.argv[2] || 'stem_tool_microbiology.js';

// Reuse the v2 audit by requiring it would print to console; instead we replicate
// the minimal core: parse + walk + dump.
const fs = require('fs');
const parser = require('@babel/parser');

const ROOT = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const filePath = path.join(ROOT, 'stem_lab', TOOL);
const src = fs.readFileSync(filePath, 'utf-8');

const VAR_MAP = {
  light: {
    '--allo-stem-canvas': '#ffffff', '--allo-stem-panel': '#f8fafc',
    '--allo-stem-deeper': '#e2e8f0', '--allo-stem-text': '#0f172a',
    '--allo-stem-text-soft': '#475569', '--allo-stem-border': '#cbd5e1',
  },
  dark: {
    '--allo-stem-canvas': '#0f172a', '--allo-stem-panel': '#1e293b',
    '--allo-stem-deeper': '#020617', '--allo-stem-text': '#e2e8f0',
    '--allo-stem-text-soft': '#94a3b8', '--allo-stem-border': '#334155',
  },
};

function hexToRgb(hex) {
  hex = hex.replace('#', '').trim();
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  if (hex.length !== 6) return null;
  return { r: parseInt(hex.slice(0,2),16), g: parseInt(hex.slice(2,4),16), b: parseInt(hex.slice(4,6),16), a: 1 };
}
function parseColor(raw, theme) {
  if (raw == null) return null;
  let s = String(raw).trim().replace(/^['"`]|['"`]$/g, '').trim();
  if (!s) return null;
  const v = s.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*(.+))?\)$/);
  if (v) {
    const themed = VAR_MAP[theme]?.[v[1]];
    if (themed) return parseColor(themed, theme);
    if (v[2]) return parseColor(v[2], theme);
    return null;
  }
  const rgba = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)$/);
  if (rgba) return { r: Math.round(+rgba[1]), g: Math.round(+rgba[2]), b: Math.round(+rgba[3]), a: rgba[4]!==undefined ? +rgba[4]:1 };
  if (/^#[0-9a-fA-F]{3,6}$/.test(s)) return hexToRgb(s);
  if (s.toLowerCase() === 'transparent') return { r:0, g:0, b:0, a:0 };
  const NAMED = { white:'#fff', black:'#000' };
  if (NAMED[s.toLowerCase()]) return hexToRgb(NAMED[s.toLowerCase()]);
  return null;
}
function parseBgs(raw, theme) {
  if (raw==null) return [];
  let s = String(raw).trim().replace(/^['"`]|['"`]$/g, '').trim();
  if (/^(linear|radial|conic)-gradient\(/i.test(s)) {
    const inner = s.replace(/^(linear|radial|conic)-gradient\(/i,'').replace(/\)$/,'');
    const parts = []; let d=0, cur='';
    for (const ch of inner) {
      if (ch==='(') d++; else if (ch===')') d--;
      if (ch===',' && d===0) { parts.push(cur.trim()); cur=''; } else cur+=ch;
    }
    if (cur.trim()) parts.push(cur.trim());
    const colors = [];
    for (const p of parts) {
      const c = p.replace(/\s+\d+(\.\d+)?%\s*$/,'').trim();
      const parsed = parseColor(c, theme);
      if (parsed) colors.push(parsed);
    }
    return colors;
  }
  const single = parseColor(s, theme);
  return single ? [single] : [];
}
function compositeOver(fg, bg) {
  if (fg.a===undefined || fg.a>=1) return {r:fg.r,g:fg.g,b:fg.b,a:1};
  const a = Math.max(0, Math.min(1, fg.a));
  return { r:Math.round(fg.r*a+bg.r*(1-a)), g:Math.round(fg.g*a+bg.g*(1-a)), b:Math.round(fg.b*a+bg.b*(1-a)), a:1 };
}
function relLum(c) {
  const ch = [c.r,c.g,c.b].map(v=>{v=v/255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});
  return 0.2126*ch[0]+0.7152*ch[1]+0.0722*ch[2];
}
function contrast(a,b) { const L1=relLum(a),L2=relLum(b); const hi=Math.max(L1,L2),lo=Math.min(L1,L2); return (hi+0.05)/(lo+0.05); }

function evalNode(n, sym) {
  if (!n) return { unresolved:true };
  if (n.type==='StringLiteral') return { value:n.value };
  if (n.type==='Identifier') {
    if (sym[n.name]!==undefined) return { value:sym[n.name] };
    return { unresolved:true };
  }
  if (n.type==='TemplateLiteral' && n.expressions.length===0) return { value:n.quasis[0].value.cooked };
  if (n.type==='BinaryExpression' && n.operator==='+') {
    const l=evalNode(n.left,sym), r=evalNode(n.right,sym);
    if (l.unresolved||r.unresolved) return { unresolved:true };
    return { value: l.value+r.value };
  }
  if (n.type==='ConditionalExpression') {
    return { ternary:true, consequent:evalNode(n.consequent,sym), alternate:evalNode(n.alternate,sym) };
  }
  return { unresolved:true };
}

const ast = parser.parse(src, { sourceType:'unambiguous', errorRecovery:true });

// Symbol table
const sym = {};
(function walk(n) {
  if (!n||typeof n!=='object') return;
  if (n.type==='VariableDeclaration') for (const d of n.declarations) {
    if (d.id?.type==='Identifier' && d.init && sym[d.id.name]===undefined) {
      const v = evalNode(d.init, sym);
      if (!v.unresolved && !v.ternary && v.value) sym[d.id.name] = v.value;
    }
  }
  for (const k in n) { if (k==='loc'||k==='start'||k==='end') continue;
    const c=n[k]; if (Array.isArray(c)) c.forEach(walk); else if (c?.type) walk(c); }
})(ast);

const findings = [];
function extractStyle(props) {
  const out = {};
  if (!props || props.type!=='ObjectExpression') return out;
  let styleNode = null;
  for (const p of props.properties) if (p.type==='ObjectProperty' && !p.computed && (p.key.name||p.key.value)==='style' && p.value.type==='ObjectExpression') { styleNode=p.value; break; }
  if (!styleNode) return out;
  for (const p of styleNode.properties) {
    if (p.type!=='ObjectProperty' || p.computed) continue;
    const k = p.key.name||p.key.value;
    if (!['color','background','backgroundColor'].includes(k)) continue;
    const v = evalNode(p.value, sym);
    const slot = k==='color' ? 'color' : 'bg';
    if (v.ternary) out[slot+'T'] = v; else if (!v.unresolved) out[slot] = v.value;
  }
  return out;
}

function evalPair(fg, chain, theme, line) {
  const MODAL_ROOT = { light:'#ffffff', dark:'#1e293b' };
  const full = [...chain, MODAL_ROOT[theme]];
  const fgC = parseColor(fg, theme); if (!fgC) return;
  let bgs = [null];
  for (let i=full.length-1; i>=0; i--) {
    const cands = parseBgs(full[i], theme);
    if (!cands.length) continue;
    const next = [];
    for (const e of bgs) for (const layer of cands) {
      if (e===null) next.push({...layer, a:1});
      else next.push(compositeOver(layer, e));
    }
    bgs = next.slice(0, 16);
  }
  bgs = bgs.filter(c=>c!==null);
  if (!bgs.length) return;
  let worst = { ratio: Infinity };
  for (const bg of bgs) {
    const composed = (fgC.a!==undefined && fgC.a<1) ? compositeOver(fgC, bg) : fgC;
    const r = contrast(composed, bg);
    if (r < worst.ratio) worst = { ratio:r };
  }
  findings.push({ line, theme, fg, chain: chain.slice(), ratio:+worst.ratio.toFixed(2) });
}

function visit(n, stack) {
  if (!n||typeof n!=='object') return;
  if (n.type==='CallExpression' && n.callee?.name==='h') {
    const props = n.arguments[1], kids = n.arguments.slice(2);
    const style = extractStyle(props);
    let newStack = stack;
    if (style.bg) newStack = [style.bg, ...stack];
    const line = n.loc?.start?.line || 0;

    // Pair generation (positional ternary)
    const pairs = [];
    const chainWith = (b) => b!=null ? [b, ...stack] : stack;
    if (style.colorT && style.bgT) {
      const cC = !style.colorT.consequent.unresolved && !style.colorT.consequent.ternary ? style.colorT.consequent.value : null;
      const cA = !style.colorT.alternate.unresolved && !style.colorT.alternate.ternary ? style.colorT.alternate.value : null;
      const bC = !style.bgT.consequent.unresolved && !style.bgT.consequent.ternary ? style.bgT.consequent.value : null;
      const bA = !style.bgT.alternate.unresolved && !style.bgT.alternate.ternary ? style.bgT.alternate.value : null;
      if (cC) pairs.push({ color:cC, chain:chainWith(bC) });
      if (cA) pairs.push({ color:cA, chain:chainWith(bA) });
    } else if (style.colorT) {
      const c1 = !style.colorT.consequent.unresolved && !style.colorT.consequent.ternary ? style.colorT.consequent.value : null;
      const c2 = !style.colorT.alternate.unresolved && !style.colorT.alternate.ternary ? style.colorT.alternate.value : null;
      if (c1) pairs.push({ color:c1, chain:chainWith(style.bg||null) });
      if (c2) pairs.push({ color:c2, chain:chainWith(style.bg||null) });
    } else if (style.bgT && style.color) {
      const b1 = !style.bgT.consequent.unresolved && !style.bgT.consequent.ternary ? style.bgT.consequent.value : null;
      const b2 = !style.bgT.alternate.unresolved && !style.bgT.alternate.ternary ? style.bgT.alternate.value : null;
      if (b1) pairs.push({ color:style.color, chain:chainWith(b1) });
      if (b2) pairs.push({ color:style.color, chain:chainWith(b2) });
    } else if (style.color) {
      pairs.push({ color:style.color, chain:newStack });
    }
    for (const p of pairs) for (const t of ['light','dark']) if (p.chain.length) evalPair(p.color, p.chain, t, line);

    for (const k of kids) visit(k, newStack);
    if (props) visit(props, newStack);
    return;
  }
  for (const k in n) { if (k==='loc'||k==='start'||k==='end') continue;
    const c=n[k]; if (Array.isArray(c)) c.forEach(x=>visit(x,stack)); else if (c?.type) visit(c, stack); }
}
visit(ast, []);

// Filter to ratio < 4.5 (severe + near)
const fails = findings.filter(r => r.ratio < 4.5);
// Dedupe by (line, theme, fg, bg-string)
const seen = new Map();
for (const r of fails) {
  const key = r.line + '|' + r.theme + '|' + r.fg + '|' + JSON.stringify(r.chain);
  if (!seen.has(key)) seen.set(key, { ...r, count:1 });
  else seen.get(key).count++;
}
const uniq = Array.from(seen.values()).sort((a,b)=>a.line-b.line);

console.log('Findings for', TOOL, '— total unique', uniq.length, 'over', fails.length, 'instances');
console.log('Symbols resolved:', Object.keys(sym).length);
console.log('');
for (const r of uniq) {
  console.log('  L' + String(r.line).padStart(5) + '  [' + r.theme.padEnd(5) + ']  ratio=' + r.ratio.toFixed(2).padStart(5) +
              '  ×' + r.count + '  fg=' + r.fg + '  bg=' + JSON.stringify(r.chain));
}
