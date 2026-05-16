#!/usr/bin/env node
// _audit_help_anchors.cjs — Find UI surfaces that lack `data-help-key` entirely.
//
// Usage:  node _audit_help_anchors.cjs
//
// This is the "feature is help-mode-blind" gap class — distinct from
// _audit_help_keys.cjs (which finds key→string mismatches).
//
// Looks for React function components in *_source.jsx whose name ends in
// "Panel", "Modal", or "Card", and reports which ones have ZERO data-help-key
// occurrences inside their function body. A panel with no help anchor at all
// means a user activating help mode and clicking anywhere in that surface
// will get no help text — the feature is invisible to the help system.
//
// Also reports components with very low density (few help keys for their
// size) as a "thin coverage" warning.
//
// Heuristic limitations:
//   - Only flags components, not standalone JSX returned from custom hooks
//   - Doesn't analyze AlloFlowANTI.txt (too large; modules extracted from it
//     are scanned separately). Run grep manually for inline AlloFlowANTI panels.
//   - "Should have a help anchor" is subjective; this just surfaces candidates
//     for review.
//
// Sibling: _audit_help_keys.cjs (key/string sync), _check_tool_catalog.cjs.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

function listSourceFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (['node_modules','dist','_archive','prismflow-deploy','graphify-out',
           '.git','docker','tts-server','website','pilot','examples',
           'tests','test_data','a11y-audit','dev-tools','src',
           'my-video','sel_hub','stem_lab','Lesson JSONs','Phoneme library',
           'audio_banks','Letter Name audio','audio_input','audio_input2',
           'audio_input3','audio_input4','Feedback','Instructions List',
           'scripts'].includes(e.name)) continue;
      out.push(...listSourceFiles(path.join(dir, e.name)));
    } else if (/_source\.jsx$/.test(e.name)) {
      out.push(path.join(dir, e.name));
    }
  }
  return out;
}

// Find function components like:
//   function FooPanel(props) { ... }
//   const FooModal = (props) => { ... }
//   const FooCard = React.memo((props) => { ... })
//
// We bracket-match to find the function body. Returns array of
// { name, file, start, end, body }.
function extractComponents(filePath) {
  const txt = fs.readFileSync(filePath, 'utf8');
  const components = [];

  // Pattern A: function FooPanel(... { OR function FooModal(... { OR function FooCard(... {
  const reFn = /\bfunction\s+([A-Z]\w*(?:Panel|Modal|Card|View|Overlay))\s*\([^)]*\)\s*\{/g;
  let m;
  while ((m = reFn.exec(txt))) {
    const name = m[1];
    const openIdx = m.index + m[0].length - 1; // position of opening {
    const end = matchBrace(txt, openIdx);
    if (end > openIdx) {
      components.push({ name, file: filePath, start: m.index, end, body: txt.slice(openIdx + 1, end) });
    }
  }

  // Pattern B: const FooPanel = (...) => { ... } / React.memo((...)) variants
  // Match `const Name<Panel|Modal|Card|View|Overlay> = ... { ... }`
  const reArrow = /\bconst\s+([A-Z]\w*(?:Panel|Modal|Card|View|Overlay))\s*=\s*(?:React\.memo\(\s*)?\([^)]*\)\s*=>\s*\{/g;
  while ((m = reArrow.exec(txt))) {
    const name = m[1];
    const openIdx = m.index + m[0].length - 1;
    const end = matchBrace(txt, openIdx);
    if (end > openIdx) {
      components.push({ name, file: filePath, start: m.index, end, body: txt.slice(openIdx + 1, end) });
    }
  }

  return components;
}

function matchBrace(txt, openIdx) {
  // Returns index of the matching close brace for txt[openIdx] === '{'
  // Naive but works for well-formatted JSX: counts {} balance, ignoring those
  // inside single/double/backtick string literals and // line comments.
  let depth = 0;
  let i = openIdx;
  const N = txt.length;
  let inSingle = false, inDouble = false, inTpl = false, inLineComment = false;
  while (i < N) {
    const ch = txt[i];
    const prev = i > 0 ? txt[i - 1] : '';
    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      i++; continue;
    }
    if (prev !== '\\') {
      if (!inDouble && !inTpl && ch === "'") inSingle = !inSingle;
      else if (!inSingle && !inTpl && ch === '"') inDouble = !inDouble;
      else if (!inSingle && !inDouble && ch === '`') inTpl = !inTpl;
    }
    if (!inSingle && !inDouble && !inTpl) {
      if (ch === '/' && txt[i + 1] === '/') { inLineComment = true; i += 2; continue; }
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) return i;
      }
    }
    i++;
  }
  return -1;
}

// ─── Run ──────────────────────────────────────────────────────────
const files = listSourceFiles(ROOT);
const findings = [];

for (const file of files) {
  const components = extractComponents(file);
  for (const c of components) {
    const helpKeyCount = (c.body.match(/data-help-key/g) || []).length;
    const bodyLines = c.body.split('\n').length;
    const interactiveCount =
      (c.body.match(/<button\b/g) || []).length +
      (c.body.match(/<select\b/g) || []).length +
      (c.body.match(/<input\b/g) || []).length +
      (c.body.match(/<textarea\b/g) || []).length;

    findings.push({
      file: path.relative(ROOT, file).replace(/\\/g, '/'),
      name: c.name,
      lines: bodyLines,
      interactiveCount,
      helpKeyCount,
    });
  }
}

// Categorize
const blind = findings.filter(f => f.helpKeyCount === 0 && f.interactiveCount > 0);
const thin = findings.filter(f => f.helpKeyCount > 0 && f.helpKeyCount < Math.max(1, Math.floor(f.interactiveCount / 6)));
const wellCovered = findings.filter(f => f.helpKeyCount > 0 && !thin.includes(f));

// Sort each by interactive count descending so the biggest-impact gaps lead.
blind.sort((a, b) => b.interactiveCount - a.interactiveCount);
thin.sort((a, b) => (b.interactiveCount - b.helpKeyCount) - (a.interactiveCount - a.helpKeyCount));

const out = [];
out.push('===========================================================');
out.push('  HELP-ANCHOR COVERAGE AUDIT');
out.push('===========================================================');
out.push('');
out.push(`Components scanned (Panel/Modal/Card/View/Overlay in *_source.jsx): ${findings.length}`);
out.push(`  Help-mode BLIND (zero data-help-key, has interactive controls):   ${blind.length}`);
out.push(`  THIN coverage (<1 help key per ~6 interactive elements):          ${thin.length}`);
out.push(`  Well-covered:                                                     ${wellCovered.length}`);
out.push('');
out.push('--- BLIND components (HIGHEST priority — entire feature is help-mode-invisible) ---');
out.push('   sorted by interactive-element count (biggest impact first)');
out.push('');
for (const f of blind) {
  out.push(`  ${f.interactiveCount.toString().padStart(3,' ')} interactive  ${f.lines.toString().padStart(4,' ')} lines   ${f.name.padEnd(40,' ')} (${f.file})`);
}
out.push('');
out.push('--- THIN coverage (has some help anchors but ratio is low) ---');
out.push('');
for (const f of thin.slice(0, 30)) {
  out.push(`  ${f.helpKeyCount}/${f.interactiveCount} help/interactive  ${f.name.padEnd(40,' ')} (${f.file})`);
}
out.push('');

const reportPath = path.join(ROOT, 'a11y-audit', 'help_anchors_audit.txt');
try {
  if (!fs.existsSync(path.dirname(reportPath))) fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, out.join('\n'));
} catch (_) {
  fs.writeFileSync(path.join(ROOT, 'help_anchors_audit.txt'), out.join('\n'));
}
console.log(`Components: ${findings.length}, blind: ${blind.length}, thin: ${thin.length}, covered: ${wellCovered.length}`);
console.log('Report: a11y-audit/help_anchors_audit.txt');
