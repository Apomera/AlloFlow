#!/usr/bin/env node
// stem_string_inventory.cjs — Static (AST-based) inventory of hardcoded strings
// across stem_lab/stem_tool_*.js, classifying each string literal by context so
// you get a precise, prioritized localization worklist WITHOUT changing code.
//
//   node dev-tools/stem_string_inventory.cjs
//
// Categories (per string literal):
//   localized   — argument to t(...) / ts(...)            (already i18n-ready)
//   ai_prompt   — inside callGemini/askAI/getHint/etc OR  (must NOT be localized)
//                 content reads as an instruction-to-model
//   user_facing — JSX/createElement text child, OR value of a UI property
//                 (label/title/desc/hint/aria-label/...) that reads as natural
//                 language  → THESE need localization
//   data        — value of a "technical/data" property (symbol/formula/id/unit/
//                 css/color/key) or a short identifier-like token → judgment call
//   other       — code/CSS/keys/short tokens → ignore
//
// Outputs (under dev-tools/stem_i18n_report/):
//   summary.csv            per-tool counts
//   user_facing.csv        every user_facing string (tool,bucket,text)
//   inventory.json         machine-readable full inventory (capped samples)
// Plus a ranked console summary.

'use strict';
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const ROOT = path.resolve(__dirname, '..');
const STEM = path.join(ROOT, 'stem_lab');
const OUT = path.join(__dirname, 'stem_i18n_report');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// Property keys whose string value is shown to the user.
const UI_KEYS = new Set(['label', 'title', 'name', 'desc', 'description', 'hint', 'message',
  'tooltip', 'heading', 'subheading', 'subtitle', 'caption', 'placeholder', 'arialabel',
  'aria-label', 'alt', 'goal', 'fact', 'question', 'answer', 'instruction', 'instructions',
  'explanation', 'feedback', 'summary', 'note', 'tip', 'cta', 'buttontext', 'text', 'content',
  'prompt_label', 'header', 'footer', 'body', 'intro', 'detail', 'details', 'prompt']);
// Property keys that are technical/data — value is a judgment call to localize.
const DATA_KEYS = new Set(['symbol', 'formula', 'unit', 'units', 'id', 'key', 'type', 'icon',
  'color', 'colour', 'fill', 'stroke', 'class', 'classname', 'href', 'src', 'url', 'path',
  'value', 'code', 'tag', 'category', 'group', 'family', 'ipa', 'phoneme', 'sound', 'emoji']);
const AI_CALLEE = /callGemini|callImagen|callTTS|askAI|askGemini|getHint|geminiVision|generateContent|callAI/i;
const AI_CONTENT = /\b(You are |Do NOT |Reply with|Return ONLY|Respond with|strict JSON|as a JSON|the student|age-appropriate|one short|Use age|Output only)\b/;

function looksLikeNL(s) {
  s = s.trim();
  if (s.length < 3) return false;
  if (/^[#]?[0-9a-fA-F]{3,8}$/.test(s)) return false;            // hex
  if (/^(https?:|\/|\.\/|data:|mailto:|#)/.test(s)) return false; // url/path/anchor
  if (/\.(js|jsx|css|png|svg|json|jpe?g|gif|mp3|wav|webp|woff2?)$/i.test(s)) return false;
  if (/^[A-Z0-9_]+$/.test(s)) return false;                      // CONSTANT_CASE
  if (/^\d+(\.\d+)?(px|em|rem|%|vh|vw|s|ms|deg|x)?$/.test(s)) return false; // number/unit
  if (/^[a-z][a-zA-Z0-9]*$/.test(s) && !s.includes(' ')) return false; // single camel/lower token
  if (/^[a-z0-9-]+$/.test(s) && !s.includes(' ')) return false; // kebab/class token
  if (/[A-Za-z]{2,}[A-Z]/.test(s) && !s.includes(' ')) return false; // PascalCase/camelCase identifier (PlateConfig, OhmAce)
  if (s.includes(' ')) return true;                              // multi-word phrase
  // single word: keep only a plain Capitalized dictionary word (Vacuum, Diamond, Water)
  return /^[A-Z][a-z]+$/.test(s) && s.length >= 4;
}

function calleeName(callee) {
  if (!callee) return '';
  if (callee.type === 'Identifier') return callee.name;
  if (callee.type === 'MemberExpression') return (callee.property && (callee.property.name || callee.property.value)) || '';
  return '';
}

const TOOLS = fs.readdirSync(STEM).filter(f => /^stem_tool_.*\.js$/.test(f) && !f.endsWith('.bak'));
const rows = [];
const userFacingCsv = ['tool,bucket,chars,text'];
const inventory = {};

for (const file of TOOLS) {
  const tool = file.replace(/^stem_tool_|\.js$/g, '');
  const code = fs.readFileSync(path.join(STEM, file), 'utf8');
  let ast;
  try { ast = parser.parse(code, { sourceType: 'script', allowReturnOutsideFunction: true, errorRecovery: true }); }
  catch (e) { rows.push({ tool, parseError: true }); continue; }

  const counts = { localized: 0, ai_prompt: 0, user_facing: 0, data: 0, other: 0, template: 0 };
  const buckets = {};
  const samples = [];

  function classify(value, p, node) {
    // 1) t()/ts() argument
    if (p && p.type === 'CallExpression' && p.arguments[0] === node) {
      const cn = calleeName(p.callee);
      if (cn === 't' || cn === 'ts') { counts.localized++; return; }
    }
    // 2) AI prompt — nearest call ancestor is an AI call, or content reads like a prompt
    if (AI_CONTENT.test(value)) { counts.ai_prompt++; return; }
    // 3) createElement / h() text child (arg index >= 2)
    if (p && p.type === 'CallExpression') {
      const cn = calleeName(p.callee);
      if ((cn === 'createElement' || cn === 'h' || cn === 'jsx' || cn === 'jsxs')) {
        const idx = p.arguments.indexOf(node);
        if (idx >= 2 && looksLikeNL(value)) { counts.user_facing++; (buckets.jsx_text = (buckets.jsx_text || 0) + 1); if (samples.length < 60) samples.push(['jsx_text', value]); userFacingCsv.push(csv(tool, 'jsx_text', value)); return; }
      }
      if (AI_CALLEE.test(cn)) { counts.ai_prompt++; return; }
    }
    // 4) object property value
    if (p && p.type === 'ObjectProperty' && p.value === node) {
      const key = String((p.key && (p.key.name || p.key.value)) || '').toLowerCase();
      if (UI_KEYS.has(key) && looksLikeNL(value)) {
        counts.user_facing++; buckets[key] = (buckets[key] || 0) + 1;
        if (samples.length < 60) samples.push([key, value]);
        userFacingCsv.push(csv(tool, key, value));
        return;
      }
      if (DATA_KEYS.has(key)) { counts.data++; return; }
    }
    counts.other++;
  }

  traverse(ast, {
    StringLiteral(p) { classify(p.node.value, p.parent, p.node); },
    TemplateLiteral(p) {
      // static, non-interpolated template used as text → user-facing-ish; count separately
      if (p.node.expressions.length === 0 && p.node.quasis.length === 1) {
        return classify(p.node.quasis[0].value.cooked || '', p.parent, p.node);
      }
      counts.template++;
    }
  });

  rows.push({ tool, ...counts, parseError: false });
  inventory[tool] = { counts, buckets, samples };
}

// ── Outputs ──
function csv(...fields) { return fields.map(f => '"' + String(f).replace(/"/g, '""').replace(/\s+/g, ' ').slice(0, 300) + '"').join(','); }

const summaryCsv = ['tool,user_facing,ai_prompt,localized,data,other,template'];
rows.filter(r => !r.parseError).sort((a, b) => b.user_facing - a.user_facing).forEach(r =>
  summaryCsv.push([r.tool, r.user_facing, r.ai_prompt, r.localized, r.data, r.other, r.template].join(',')));
fs.writeFileSync(path.join(OUT, 'summary.csv'), summaryCsv.join('\n') + '\n');
fs.writeFileSync(path.join(OUT, 'user_facing.csv'), userFacingCsv.join('\n') + '\n');
fs.writeFileSync(path.join(OUT, 'inventory.json'), JSON.stringify(inventory, null, 2) + '\n');

const tot = rows.filter(r => !r.parseError).reduce((a, r) => {
  a.uf += r.user_facing; a.ai += r.ai_prompt; a.loc += r.localized; a.data += r.data; return a;
}, { uf: 0, ai: 0, loc: 0, data: 0 });
const parseErrors = rows.filter(r => r.parseError).map(r => r.tool);

console.log(`Scanned ${rows.length} STEM tools (${parseErrors.length} parse errors${parseErrors.length ? ': ' + parseErrors.join(', ') : ''}).\n`);
console.log(`TOTALS across the lab:`);
console.log(`  user_facing (NEED localization):  ${tot.uf}`);
console.log(`  already localized (t()/ts()):     ${tot.loc}`);
console.log(`  ai_prompt (do NOT localize):       ${tot.ai}`);
console.log(`  data (judgment call):              ${tot.data}\n`);
console.log(`Top 20 tools by user_facing string count:`);
console.log('  ' + 'tool'.padEnd(22) + 'user_facing  localized  ai_prompt');
rows.filter(r => !r.parseError).sort((a, b) => b.user_facing - a.user_facing).slice(0, 20).forEach(r =>
  console.log('  ' + r.tool.padEnd(22) + String(r.user_facing).padStart(8) + String(r.localized).padStart(11) + String(r.ai_prompt).padStart(11)));
console.log(`\nWrote: dev-tools/stem_i18n_report/{summary.csv, user_facing.csv, inventory.json}`);
