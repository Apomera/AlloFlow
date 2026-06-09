#!/usr/bin/env node
// Survey color frequency across all stem tools — what literal hex colors
// appear as `color:` values, sorted by frequency. Helps scope the light-theme
// palette by showing which colors need a variable counterpart.

const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');

const TOOL_DIR = path.join(__dirname, 'stem_lab');
const files = fs.readdirSync(TOOL_DIR).filter(f => /^stem_tool_.*\.js$/.test(f));

const colorCount = {};
const colorFiles = {};

function evalLiteral(node) {
  if (!node) return null;
  if (node.type === 'StringLiteral') return node.value;
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) return node.quasis[0].value.cooked;
  return null;
}

for (const file of files) {
  const src = fs.readFileSync(path.join(TOOL_DIR, file), 'utf-8');
  let ast;
  try { ast = parser.parse(src, { sourceType:'unambiguous', errorRecovery:true }); } catch { continue; }

  (function walk(n) {
    if (!n || typeof n !== 'object') return;
    if (n.type === 'ObjectProperty' && !n.computed) {
      const k = n.key.name || n.key.value;
      if (k === 'color') {
        const v = evalLiteral(n.value);
        if (v && /^#[0-9a-fA-F]{3,6}$/.test(v)) {
          const norm = v.toLowerCase();
          colorCount[norm] = (colorCount[norm] || 0) + 1;
          if (!colorFiles[norm]) colorFiles[norm] = new Set();
          colorFiles[norm].add(file);
        }
      }
    }
    for (const key in n) {
      if (key === 'loc' || key === 'start' || key === 'end') continue;
      const c = n[key];
      if (Array.isArray(c)) c.forEach(walk);
      else if (c && typeof c === 'object' && c.type) walk(c);
    }
  })(ast);
}

const sorted = Object.entries(colorCount)
  .filter(([, c]) => c >= 5) // ignore one-offs
  .sort((a, b) => b[1] - a[1]);

console.log('Hex colors used as `color:` values, frequency ≥5, across', files.length, 'stem tools');
console.log('');
console.log('count  files  hex          tailwind-rough-name');
for (const [hex, count] of sorted) {
  const fileCount = colorFiles[hex].size;
  console.log(String(count).padStart(5) + '  ' + String(fileCount).padStart(5) + '  ' + hex.padEnd(11) + '  ' + tailwindName(hex));
}

function tailwindName(hex) {
  // Best-effort labeling — rough match to common Tailwind palette stops
  const MAP = {
    '#ffffff':'white','#fff':'white','#000':'black','#000000':'black',
    '#f8fafc':'slate-50','#f1f5f9':'slate-100','#e2e8f0':'slate-200','#cbd5e1':'slate-300','#94a3b8':'slate-400','#64748b':'slate-500','#475569':'slate-600','#334155':'slate-700','#1e293b':'slate-800','#0f172a':'slate-900','#020617':'slate-950',
    '#6ee7b7':'emerald-300','#34d399':'emerald-400','#10b981':'emerald-500','#059669':'emerald-600','#047857':'emerald-700','#065f46':'emerald-800','#064e3b':'emerald-900','#a7f3d0':'emerald-200',
    '#86efac':'green-300','#4ade80':'green-400','#22c55e':'green-500','#16a34a':'green-600','#15803d':'green-700','#bbf7d0':'green-200','#dcfce7':'green-100','#d1fae5':'emerald-100','#f0fdf4':'green-50',
    '#fde68a':'amber-200','#fcd34d':'amber-300','#fbbf24':'amber-400','#f59e0b':'amber-500','#d97706':'amber-600','#b45309':'amber-700','#92400e':'amber-800','#fef3c7':'amber-100','#fffbeb':'amber-50',
    '#fb923c':'orange-400','#f97316':'orange-500','#ea580c':'orange-600','#fed7aa':'orange-200','#ffedd5':'orange-100','#fed7c1':'orange-200',
    '#fca5a5':'red-300','#f87171':'red-400','#ef4444':'red-500','#dc2626':'red-600','#b91c1c':'red-700','#fee2e2':'red-100','#fecaca':'red-200','#ffe4e6':'rose-100',
    '#fbcfe8':'pink-200','#f9a8d4':'pink-300','#ec4899':'pink-500','#db2777':'pink-600','#fdf2f8':'pink-50',
    '#d8b4fe':'purple-300','#c4b5fd':'violet-300','#a78bfa':'violet-400','#8b5cf6':'violet-500','#7c3aed':'violet-600','#6d28d9':'violet-700','#a855f7':'purple-500','#9333ea':'purple-600','#7e22ce':'purple-700','#581c87':'purple-900','#e9d5ff':'purple-200','#f3e8ff':'purple-100','#4c1d95':'violet-900','#1e1b4b':'indigo-950',
    '#c7d2fe':'indigo-200','#a5b4fc':'indigo-300','#818cf8':'indigo-400','#6366f1':'indigo-500','#4f46e5':'indigo-600','#4338ca':'indigo-700','#3730a3':'indigo-800','#312e81':'indigo-900','#e0e7ff':'indigo-100',
    '#7dd3fc':'sky-300','#38bdf8':'sky-400','#0ea5e9':'sky-500','#0284c7':'sky-600','#0369a1':'sky-700','#bae6fd':'sky-200','#e0f2fe':'sky-100',
    '#93c5fd':'blue-300','#60a5fa':'blue-400','#3b82f6':'blue-500','#2563eb':'blue-600','#1d4ed8':'blue-700','#1e40af':'blue-800','#1e3a8a':'blue-900',
    '#67e8f9':'cyan-300','#22d3ee':'cyan-400','#06b6d4':'cyan-500','#0891b2':'cyan-600','#0e7490':'cyan-700',
    '#5eead4':'teal-300','#2dd4bf':'teal-400','#14b8a6':'teal-500','#0d9488':'teal-600','#0f766e':'teal-700','#134e4a':'teal-900',
  };
  return MAP[hex] || '?';
}
