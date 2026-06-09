#!/usr/bin/env node
// Classify each stem tool's native theme based on audit-finding distribution.
//
// Heuristic:
//   - Run the v2 contrast pass (parsed AST, alpha composited, etc.)
//   - For each tool, count {severe-light, severe-dark, near-light, near-dark}
//   - Classify:
//     dark-designed   → severe-light > severe-dark × 3
//     light-designed  → severe-dark > severe-light × 3
//     theme-flexible  → roughly balanced and low counts in both
//     broken-in-both  → many failures in both
//     no-findings     → 0 in both
//
// This gives us a triage list — fix strategies differ per category.

const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');

const TOOL_DIR = path.join(__dirname, 'stem_lab');

// Reuse minimal v2 logic (inline rather than re-import)
const VAR_MAP = {
  light: { '--allo-stem-canvas':'#ffffff','--allo-stem-panel':'#f8fafc','--allo-stem-deeper':'#e2e8f0','--allo-stem-text':'#0f172a','--allo-stem-text-soft':'#475569','--allo-stem-border':'#cbd5e1' },
  dark:  { '--allo-stem-canvas':'#0f172a','--allo-stem-panel':'#1e293b','--allo-stem-deeper':'#020617','--allo-stem-text':'#e2e8f0','--allo-stem-text-soft':'#94a3b8','--allo-stem-border':'#334155' },
};
const MODAL_ROOT = { light: '#ffffff', dark: '#1e293b' };

function hexToRgb(h) {
  h = h.replace('#','').trim();
  if (h.length===3) h = h.split('').map(c=>c+c).join('');
  if (h.length!==6) return null;
  return { r:parseInt(h.slice(0,2),16), g:parseInt(h.slice(2,4),16), b:parseInt(h.slice(4,6),16), a:1 };
}
function parseColor(raw, theme) {
  if (raw==null) return null;
  let s = String(raw).trim().replace(/^['"`]|['"`]$/g,'').trim();
  if (!s) return null;
  const v = s.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*(.+))?\)$/);
  if (v) { const t = VAR_MAP[theme]?.[v[1]]; if (t) return parseColor(t, theme); if (v[2]) return parseColor(v[2], theme); return null; }
  const rgba = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)$/);
  if (rgba) return { r:Math.round(+rgba[1]), g:Math.round(+rgba[2]), b:Math.round(+rgba[3]), a:rgba[4]!==undefined?+rgba[4]:1 };
  if (/^#[0-9a-fA-F]{3,6}$/.test(s)) return hexToRgb(s);
  if (s.toLowerCase()==='transparent') return { r:0,g:0,b:0,a:0 };
  return null;
}
function parseBgs(raw, theme) {
  if (raw==null) return [];
  let s = String(raw).trim().replace(/^['"`]|['"`]$/g,'').trim();
  if (/^(linear|radial|conic)-gradient\(/i.test(s)) {
    const inner = s.replace(/^(linear|radial|conic)-gradient\(/i,'').replace(/\)$/,'');
    const parts = []; let d=0, cur='';
    for (const ch of inner) { if (ch==='(') d++; else if (ch===')') d--;
      if (ch===',' && d===0) { parts.push(cur.trim()); cur=''; } else cur+=ch; }
    if (cur.trim()) parts.push(cur.trim());
    return parts.map(p => parseColor(p.replace(/\s+\d+(\.\d+)?%\s*$/,'').trim(), theme)).filter(Boolean);
  }
  const single = parseColor(s, theme);
  return single ? [single] : [];
}
function compositeOver(fg, bg) {
  if (fg.a===undefined||fg.a>=1) return {r:fg.r,g:fg.g,b:fg.b,a:1};
  const a = Math.max(0,Math.min(1,fg.a));
  return { r:Math.round(fg.r*a+bg.r*(1-a)), g:Math.round(fg.g*a+bg.g*(1-a)), b:Math.round(fg.b*a+bg.b*(1-a)), a:1 };
}
function relLum(c) { const ch=[c.r,c.g,c.b].map(v=>{v=v/255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);}); return 0.2126*ch[0]+0.7152*ch[1]+0.0722*ch[2]; }
function contrast(a,b) { const L1=relLum(a),L2=relLum(b); const hi=Math.max(L1,L2),lo=Math.min(L1,L2); return (hi+0.05)/(lo+0.05); }

function evalNode(n, sym) {
  if (!n) return { unresolved:true };
  if (n.type==='StringLiteral') return { value:n.value };
  if (n.type==='Identifier') { if (sym[n.name]!==undefined) return { value:sym[n.name] }; return {unresolved:true}; }
  if (n.type==='TemplateLiteral' && n.expressions.length===0) return { value:n.quasis[0].value.cooked };
  if (n.type==='BinaryExpression'&&n.operator==='+') { const l=evalNode(n.left,sym),r=evalNode(n.right,sym); if (l.unresolved||r.unresolved) return {unresolved:true}; return {value:l.value+r.value}; }
  if (n.type==='ConditionalExpression') return { ternary:true, consequent:evalNode(n.consequent,sym), alternate:evalNode(n.alternate,sym) };
  return { unresolved:true };
}
function buildSym(ast) {
  const s = {};
  (function w(n){if(!n||typeof n!=='object')return;if(n.type==='VariableDeclaration')for(const d of n.declarations){if(d.id?.type==='Identifier'&&d.init&&s[d.id.name]===undefined){const v=evalNode(d.init,s);if(!v.unresolved&&!v.ternary&&v.value)s[d.id.name]=v.value;}}for(const k in n){if(k==='loc'||k==='start'||k==='end')continue;const c=n[k];if(Array.isArray(c))c.forEach(w);else if(c?.type)w(c);}})(ast);
  return s;
}
function extractStyle(props, sym) {
  const out = {};
  if (!props||props.type!=='ObjectExpression') return out;
  let style=null;
  for (const p of props.properties) if (p.type==='ObjectProperty'&&!p.computed&&(p.key.name||p.key.value)==='style'&&p.value.type==='ObjectExpression') { style=p.value; break; }
  if (!style) return out;
  for (const p of style.properties) {
    if (p.type!=='ObjectProperty'||p.computed) continue;
    const k = p.key.name||p.key.value;
    if (!['color','background','backgroundColor'].includes(k)) continue;
    const v = evalNode(p.value, sym);
    const slot = k==='color'?'color':'bg';
    if (v.ternary) out[slot+'T'] = v; else if (!v.unresolved) out[slot] = v.value;
  }
  return out;
}
function evalPair(fg, chain, theme) {
  const fgC = parseColor(fg, theme); if (!fgC) return null;
  const full = [...chain, MODAL_ROOT[theme]];
  let bgs = [null];
  for (let i=full.length-1; i>=0; i--) {
    const cands = parseBgs(full[i], theme);
    if (!cands.length) continue;
    const next = [];
    for (const e of bgs) for (const layer of cands) { if (e===null) next.push({...layer,a:1}); else next.push(compositeOver(layer,e)); }
    bgs = next.slice(0,16);
  }
  bgs = bgs.filter(c=>c!==null); if (!bgs.length) return null;
  let worst = Infinity;
  for (const bg of bgs) {
    const composed = (fgC.a!==undefined&&fgC.a<1)?compositeOver(fgC,bg):fgC;
    const r = contrast(composed, bg);
    if (r < worst) worst = r;
  }
  return worst;
}

const files = fs.readdirSync(TOOL_DIR).filter(f=>/^stem_tool_.*\.js$/.test(f));
const classifications = [];

for (const file of files) {
  const src = fs.readFileSync(path.join(TOOL_DIR, file), 'utf-8');
  let ast; try { ast = parser.parse(src, {sourceType:'unambiguous',errorRecovery:true}); } catch { continue; }
  const sym = buildSym(ast);
  const counts = { severeLight:0, severeDark:0, nearLight:0, nearDark:0 };

  (function visit(n, stack) {
    if (!n||typeof n!=='object') return;
    if (n.type==='CallExpression'&&n.callee?.name==='h') {
      const props=n.arguments[1], kids=n.arguments.slice(2);
      const st = extractStyle(props, sym);
      let newStack = st.bg ? [st.bg, ...stack] : stack;

      const chainWith = b => b!=null ? [b,...stack] : stack;
      const pairs = [];
      if (st.colorT && st.bgT) {
        const cC = !st.colorT.consequent.unresolved&&!st.colorT.consequent.ternary?st.colorT.consequent.value:null;
        const cA = !st.colorT.alternate.unresolved&&!st.colorT.alternate.ternary?st.colorT.alternate.value:null;
        const bC = !st.bgT.consequent.unresolved&&!st.bgT.consequent.ternary?st.bgT.consequent.value:null;
        const bA = !st.bgT.alternate.unresolved&&!st.bgT.alternate.ternary?st.bgT.alternate.value:null;
        if (cC) pairs.push({color:cC,chain:chainWith(bC)});
        if (cA) pairs.push({color:cA,chain:chainWith(bA)});
      } else if (st.colorT) {
        const c1=!st.colorT.consequent.unresolved&&!st.colorT.consequent.ternary?st.colorT.consequent.value:null;
        const c2=!st.colorT.alternate.unresolved&&!st.colorT.alternate.ternary?st.colorT.alternate.value:null;
        if (c1) pairs.push({color:c1,chain:chainWith(st.bg||null)});
        if (c2) pairs.push({color:c2,chain:chainWith(st.bg||null)});
      } else if (st.bgT && st.color) {
        const b1=!st.bgT.consequent.unresolved&&!st.bgT.consequent.ternary?st.bgT.consequent.value:null;
        const b2=!st.bgT.alternate.unresolved&&!st.bgT.alternate.ternary?st.bgT.alternate.value:null;
        if (b1) pairs.push({color:st.color,chain:chainWith(b1)});
        if (b2) pairs.push({color:st.color,chain:chainWith(b2)});
      } else if (st.color) pairs.push({color:st.color,chain:newStack});

      for (const p of pairs) for (const theme of ['light','dark']) {
        if (!p.chain.length) continue;
        const r = evalPair(p.color, p.chain, theme);
        if (r==null) continue;
        if (r < 3) counts[theme==='light'?'severeLight':'severeDark']++;
        else if (r < 4.5) counts[theme==='light'?'nearLight':'nearDark']++;
      }
      for (const k of kids) visit(k, newStack);
      if (props) visit(props, newStack);
      return;
    }
    for (const k in n) { if (k==='loc'||k==='start'||k==='end') continue;
      const c=n[k]; if (Array.isArray(c)) c.forEach(x=>visit(x,stack)); else if (c?.type) visit(c, stack); }
  })(ast, []);

  const totalLight = counts.severeLight + counts.nearLight;
  const totalDark  = counts.severeDark + counts.nearDark;
  let cls;
  if (totalLight === 0 && totalDark === 0) cls = 'clean';
  else if (totalLight > totalDark * 3 && totalDark < 10) cls = 'dark-designed';
  else if (totalDark > totalLight * 3 && totalLight < 10) cls = 'light-designed';
  else if (totalLight + totalDark < 20) cls = 'mostly-clean';
  else if (Math.abs(totalLight - totalDark) < Math.max(totalLight, totalDark) * 0.3) cls = 'theme-flexible';
  else cls = totalLight > totalDark ? 'dark-leaning' : 'light-leaning';

  classifications.push({ file, cls, sL:counts.severeLight, sD:counts.severeDark, nL:counts.nearLight, nD:counts.nearDark, totalL:totalLight, totalD:totalDark });
}

// Group + display
const groups = {};
for (const c of classifications) { groups[c.cls] = groups[c.cls] || []; groups[c.cls].push(c); }

console.log('Per-tool native-theme classification (' + classifications.length + ' tools)');
console.log('');
const order = ['clean','dark-designed','light-designed','theme-flexible','dark-leaning','light-leaning','mostly-clean'];
for (const grp of order) {
  if (!groups[grp]) continue;
  console.log('--- ' + grp + ' (' + groups[grp].length + ') ---');
  groups[grp].sort((a,b)=>(b.totalL+b.totalD)-(a.totalL+a.totalD));
  for (const c of groups[grp]) {
    console.log('  light: ' + String(c.sL).padStart(4) + 's/' + String(c.nL).padStart(3) + 'n   ' +
                'dark: ' + String(c.sD).padStart(4) + 's/' + String(c.nD).padStart(3) + 'n   ' + c.file);
  }
  console.log('');
}
