#!/usr/bin/env node
// dev-tools/gen_wcag_coverage.cjs
//
// Generates docs/wcag_sc_coverage.md — a reviewer-facing WCAG 2.2 coverage
// table for AlloFlow's document-remediation pipeline. Answers the question an
// institutional reviewer (UMaine/Garry, a district 508 office, PAC) actually
// asks: "which WCAG success criteria does this tool repair automatically, which
// need a human, and which simply don't apply to a static document?"
//
// Design for honesty (this is the whole point — see the credibility sweep):
//   - The "automated" column is derived LIVE from the real SURGICAL_TOOL_REGISTRY
//     in doc_pipeline_source.jsx (each fix_* tool already carries a `wcag:` tag),
//     so the report can never drift ahead of the code. Re-run after adding a tool.
//   - Document-applicability is curated + conservative: interactive-web criteria
//     (keyboard, timing, on-focus, pointer, status messages, hover) are marked
//     N/A for a static remediated document rather than counted as "failures",
//     and media criteria are "conditional" (only when the doc embeds media).
//   - We never mark a criterion "automated" without a tool or an evidenced
//     deterministic/structural mechanism. Unhandled-but-applicable → "Manual".
//
// Usage:
//   node dev-tools/gen_wcag_coverage.cjs            # writes docs/wcag_sc_coverage.md
//   node dev-tools/gen_wcag_coverage.cjs --check    # verify the committed doc is
//                                                   # up to date (exit 1 if stale)
//   node dev-tools/gen_wcag_coverage.cjs --json     # print the coverage JSON

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'doc_pipeline_source.jsx');
const OUT = path.join(ROOT, 'docs', 'wcag_sc_coverage.md');

// ── 1. Parse the live surgical-tool registry (wcag tag per fix_* tool) ──
function parseRegistry() {
  const s = fs.readFileSync(SRC, 'utf8');
  const start = s.indexOf('const SURGICAL_TOOL_REGISTRY = {');
  if (start === -1) throw new Error('SURGICAL_TOOL_REGISTRY not found in ' + SRC);
  const re = /^\s{4}(fix_[a-z0-9_]+):\s*\{/gm;
  re.lastIndex = start;
  const tools = [];
  let m;
  while ((m = re.exec(s))) {
    const name = m[1];
    const chunk = s.slice(m.index, m.index + 240);
    const cat = /category:\s*'([^']+)'/.exec(chunk);
    const wcag = /wcag:\s*'([^']+)'/.exec(chunk);
    tools.push({ name, category: cat ? cat[1] : '?', wcag: wcag ? wcag[1] : null });
    // Stop if we've clearly left the registry object (next top-level const).
    if (/\n\s{2}(const|function|var|return)\s/.test(s.slice(m.index, re.lastIndex + 4000)) && tools.length > 25) {
      // soft guard; the registry is ~30 entries
    }
  }
  return tools.filter((t) => t.wcag);
}

// ── 2. WCAG 2.2 Level A + AA master list, with conservative document-applicability ──
// applies: 'doc'  = applies to a static remediated document
//          'cond' = conditional (only when the doc embeds the relevant media/forms)
//          'na'   = interactive-web criterion, not meaningful for a static document
// Each criterion's automated status is filled from the registry in step 3.
const A = 'A', AA = 'AA', AAA = 'AAA';
const CRITERIA = [
  // 1.1
  { id: '1.1.1', name: 'Non-text Content', level: A, applies: 'doc' },
  // 1.2 (media)
  { id: '1.2.1', name: 'Audio-only and Video-only (Prerecorded)', level: A, applies: 'cond', note: 'only when the document embeds audio/video; AlloFlow transcribes media blocks' },
  { id: '1.2.2', name: 'Captions (Prerecorded)', level: A, applies: 'cond', note: 'media blocks only' },
  { id: '1.2.3', name: 'Audio Description or Media Alternative', level: A, applies: 'cond', note: 'media blocks only' },
  { id: '1.2.4', name: 'Captions (Live)', level: AA, applies: 'na', note: 'live media — not applicable to a static document' },
  { id: '1.2.5', name: 'Audio Description (Prerecorded)', level: AA, applies: 'cond', note: 'media blocks only' },
  // 1.3
  { id: '1.3.1', name: 'Info and Relationships', level: A, applies: 'doc' },
  { id: '1.3.2', name: 'Meaningful Sequence', level: A, applies: 'doc', mech: 'reading order is set by the PDF struct-tree build + linear HTML' },
  { id: '1.3.3', name: 'Sensory Characteristics', level: A, applies: 'doc', manual: true },
  { id: '1.3.4', name: 'Orientation', level: AA, applies: 'doc', mech: 'reflowable HTML does not restrict display orientation' },
  { id: '1.3.5', name: 'Identify Input Purpose', level: AA, applies: 'cond', note: 'forms only' },
  // 1.4
  { id: '1.4.1', name: 'Use of Color', level: A, applies: 'doc', manual: true },
  { id: '1.4.2', name: 'Audio Control', level: A, applies: 'na', note: 'auto-playing audio — not applicable to a static document' },
  { id: '1.4.3', name: 'Contrast (Minimum)', level: AA, applies: 'doc' },
  { id: '1.4.4', name: 'Resize Text', level: AA, applies: 'doc', mech: 'output is reflowable semantic HTML (relative units)' },
  { id: '1.4.5', name: 'Images of Text', level: AA, applies: 'doc', mech: 'image-of-text is OCR-extracted to real text during intake' },
  { id: '1.4.10', name: 'Reflow', level: AA, applies: 'doc', mech: 'semantic HTML reflows; no fixed two-dimensional layout is emitted' },
  { id: '1.4.11', name: 'Non-text Contrast', level: AA, applies: 'doc', manual: true },
  { id: '1.4.12', name: 'Text Spacing', level: AA, applies: 'doc' },
  { id: '1.4.13', name: 'Content on Hover or Focus', level: AA, applies: 'cond', note: 'interactive HTML controls only; requires runtime and manual review' },
  // 2.1 keyboard
  { id: '2.1.1', name: 'Keyboard', level: A, applies: 'cond', note: 'interactive HTML controls only; verify every function by keyboard' },
  { id: '2.1.2', name: 'No Keyboard Trap', level: A, applies: 'cond', note: 'interactive HTML controls only; requires runtime keyboard testing' },
  { id: '2.1.4', name: 'Character Key Shortcuts', level: A, applies: 'cond', note: 'interactive HTML controls with shortcuts only' },
  // 2.2 timing
  { id: '2.2.1', name: 'Timing Adjustable', level: A, applies: 'na', note: 'time limits — not applicable to a static document' },
  { id: '2.2.2', name: 'Pause, Stop, Hide', level: A, applies: 'na', note: 'moving content — not applicable to a static document' },
  // 2.3 seizures
  { id: '2.3.1', name: 'Three Flashes or Below Threshold', level: A, applies: 'cond', note: 'animated or embedded media only; requires manual review' },
  // 2.4 navigation
  { id: '2.4.1', name: 'Bypass Blocks', level: A, applies: 'doc' },
  { id: '2.4.2', name: 'Page Titled', level: A, applies: 'doc' },
  { id: '2.4.3', name: 'Focus Order', level: A, applies: 'cond', note: 'interactive HTML controls only; requires runtime keyboard testing' },
  { id: '2.4.4', name: 'Link Purpose (In Context)', level: A, applies: 'doc' },
  { id: '2.4.5', name: 'Multiple Ways', level: AA, applies: 'na', note: 'site-level navigation' },
  { id: '2.4.6', name: 'Headings and Labels', level: AA, applies: 'doc', mech: 'descriptive headings via fix_heading / fix_remove_empty_heading + AI heading review' },
  { id: '2.4.7', name: 'Focus Visible', level: AA, applies: 'cond', note: 'interactive HTML controls; sanitizer restores a visible baseline, runtime review required' },
  { id: '2.4.11', name: 'Focus Not Obscured (Minimum)', level: AA, applies: 'cond', note: 'interactive HTML controls only; WCAG 2.2 runtime/manual review' },
  // 2.5 input modalities
  { id: '2.5.1', name: 'Pointer Gestures', level: A, applies: 'cond', note: 'interactive HTML controls only' },
  { id: '2.5.2', name: 'Pointer Cancellation', level: A, applies: 'cond', note: 'interactive HTML controls only' },
  { id: '2.5.3', name: 'Label in Name', level: A, applies: 'cond', note: 'forms/controls only' },
  { id: '2.5.4', name: 'Motion Actuation', level: A, applies: 'cond', note: 'interactive HTML controls only' },
  { id: '2.5.7', name: 'Dragging Movements', level: AA, applies: 'cond', note: 'drag-enabled HTML only; a non-drag alternative must be verified' },
  { id: '2.5.8', name: 'Target Size (Minimum)', level: AA, applies: 'cond', note: 'interactive HTML controls only; axe WCAG 2.2 plus manual exception review' },
  // 3.1 readable
  { id: '3.1.1', name: 'Language of Page', level: A, applies: 'doc' },
  { id: '3.1.2', name: 'Language of Parts', level: AA, applies: 'doc' },
  // 3.2 predictable
  { id: '3.2.1', name: 'On Focus', level: A, applies: 'cond', note: 'interactive HTML controls only' },
  { id: '3.2.2', name: 'On Input', level: A, applies: 'cond', note: 'interactive HTML controls only' },
  { id: '3.2.3', name: 'Consistent Navigation', level: AA, applies: 'cond', note: 'multi-page or repeated-navigation HTML only' },
  { id: '3.2.4', name: 'Consistent Identification', level: AA, applies: 'cond', note: 'repeated interactive components only' },
  { id: '3.2.6', name: 'Consistent Help', level: A, applies: 'cond', note: 'HTML exports containing repeated help mechanisms only' },
  // 3.3 input assistance
  { id: '3.3.1', name: 'Error Identification', level: A, applies: 'cond', note: 'forms only' },
  { id: '3.3.2', name: 'Labels or Instructions', level: A, applies: 'doc' },
  { id: '3.3.3', name: 'Error Suggestion', level: AA, applies: 'cond', note: 'forms only' },
  { id: '3.3.4', name: 'Error Prevention (Legal, Financial, Data)', level: AA, applies: 'cond', note: 'transactional forms only' },
  { id: '3.3.7', name: 'Redundant Entry', level: A, applies: 'cond', note: 'multi-step forms only; WCAG 2.2 runtime/manual review' },
  { id: '3.3.8', name: 'Accessible Authentication (Minimum)', level: AA, applies: 'cond', note: 'authentication flows only; normally outside a remediated document' },
  // 4.1 compatible
  { id: '4.1.1', name: 'Parsing', level: A, applies: 'doc', note: 'obsolete in WCAG 2.2; AlloFlow still de-dupes ids' },
  { id: '4.1.2', name: 'Name, Role, Value', level: A, applies: 'doc' },
  { id: '4.1.3', name: 'Status Messages', level: AA, applies: 'cond', note: 'dynamic HTML controls only' },
];

// Bonus AAA criterion AlloFlow handles (surfaced so the tool isn't undersold).
const AAA_EXTRAS = [
  { id: '3.1.4', name: 'Abbreviations', level: AAA, applies: 'doc' },
];

function build() {
  const tools = parseRegistry();
  const bySc = {};
  for (const t of tools) (bySc[t.wcag] = bySc[t.wcag] || []).push(t.name);

  const rows = [...CRITERIA, ...AAA_EXTRAS].map((c) => {
    const toolList = bySc[c.id] || [];
    let status, detail;
    if (toolList.length) { status = 'Automated'; detail = toolList.join(', '); }
    else if (c.applies === 'na') { status = 'N/A'; detail = c.note || 'not applicable to a static document'; }
    else if (c.mech) { status = 'Structural'; detail = c.mech; }
    else if (c.applies === 'cond') { status = 'Conditional'; detail = c.note || 'applies only when relevant content is present'; }
    else { status = 'Manual'; detail = c.note || 'requires human review (no reliable automated repair)'; }
    return { ...c, status, detail, tools: toolList };
  });

  // honest denominators
  const docApplicable = rows.filter((r) => r.applies === 'doc' && r.level !== AAA);
  const automated = docApplicable.filter((r) => r.status === 'Automated');
  const structural = docApplicable.filter((r) => r.status === 'Structural');
  const manual = docApplicable.filter((r) => r.status === 'Manual');

  return { tools, rows, stats: {
    totalAA: CRITERIA.length,
    docApplicable: docApplicable.length,
    automated: automated.length,
    structural: structural.length,
    manual: manual.length,
    na: rows.filter((r) => r.status === 'N/A').length,
    conditional: rows.filter((r) => r.status === 'Conditional').length,
    tools: tools.length,
    scWithTool: Object.keys(bySc).length,
  } };
}

function md({ rows, stats }) {
  const STAMP = '<!-- GENERATED by dev-tools/gen_wcag_coverage.cjs — do not edit by hand; re-run after changing the fix registry. -->';
  const badge = (s) => ({ Automated: '✅ Automated', Structural: '🏗️ Structural', Manual: '✍️ Manual', Conditional: '◐ Conditional', 'N/A': '— N/A' }[s] || s);
  const tbl = (list) => [
    '| SC | Name | Lvl | Status | How |',
    '|----|------|-----|--------|-----|',
    ...list.map((r) => `| ${r.id} | ${r.name} | ${r.level} | ${badge(r.status)} | ${r.detail} |`),
  ].join('\n');
  const principles = { '1': 'Perceivable', '2': 'Operable', '3': 'Understandable', '4': 'Robust' };
  const sections = Object.entries(principles).map(([n, title]) =>
    `### Principle ${n}: ${title}\n\n` + tbl(rows.filter((r) => r.id.startsWith(n + '.'))));

  return `# AlloFlow — WCAG 2.2 Success-Criterion Coverage

${STAMP}

This table maps every automated repair AlloFlow's document-remediation pipeline performs to a WCAG 2.2 success criterion. The **Automated** column is generated directly from the live \`SURGICAL_TOOL_REGISTRY\` in \`doc_pipeline_source.jsx\` (each repair tool carries its own \`wcag:\` tag), so it cannot drift ahead of the code — re-run \`node dev-tools/gen_wcag_coverage.cjs\` after adding a tool.

## Honest summary

Of the **${stats.docApplicable}** WCAG 2.2 A/AA criteria that meaningfully apply to a *static remediated document*:

- **${stats.automated}** have a dedicated automated repair tool (✅ Automated) — ${stats.tools} tools across ${stats.scWithTool} criteria.
- **${stats.structural}** are satisfied structurally by how the output is built (🏗️ Structural — e.g. reading order from the PDF struct-tree, reflowable semantic HTML).
- **${stats.manual}** still need human review (✍️ Manual — e.g. "don't rely on color/shape alone"); AlloFlow flags but cannot reliably auto-repair these.
- **${stats.conditional}** apply only when the document contains the relevant content (◐ forms, media, or interactive HTML).

The remaining **${stats.na}** A/AA criteria do not apply to a static document. Interactive criteria are marked **Conditional**, because HTML exports can contain forms, media, annotation tools, or other controls — they are listed below as N/A rather than counted as gaps, because counting them would understate coverage dishonestly.

> **This is a self-reported capability map, not a conformance claim.** Per-document PDF/UA-1 conformance is checked independently by veraPDF (\`dev-tools/verapdf_diff.cjs\`, gated in \`verify_all\`); WCAG verification is the axe-core (Deque) deterministic axis plus a multi-pass AI self-consistency review. A criterion marked "Automated" means AlloFlow *attempts a repair* for it, not that every document passes it. Independent validation (veraPDF / PAC 2024 / a human audit) is always recommended for compliance-sensitive use.

${sections.join('\n\n')}

---

**Legend** — ✅ Automated: a \`fix_*\` surgical tool repairs it · 🏗️ Structural: satisfied by how the accessible output is constructed · ✍️ Manual: applies but needs human judgment · ◐ Conditional: applies only when relevant forms, media, or interactive HTML are present · — N/A: interactive-web criterion, not meaningful for a static document.
`;
}

const data = build();
if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify({ stats: data.stats, rows: data.rows.map((r) => ({ id: r.id, status: r.status, tools: r.tools })) }, null, 2) + '\n');
} else if (process.argv.includes('--check')) {
  const want = md(data);
  const have = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (want.trim() !== have.trim()) {
    console.error('✗ docs/wcag_sc_coverage.md is STALE — run: node dev-tools/gen_wcag_coverage.cjs');
    process.exit(1);
  }
  console.log('✓ wcag_sc_coverage.md is up to date (' + data.stats.tools + ' tools, ' + data.stats.automated + '/' + data.stats.docApplicable + ' doc-applicable AA criteria automated).');
} else {
  fs.writeFileSync(OUT, md(data));
  console.log('Wrote ' + path.relative(ROOT, OUT) + ' — ' + data.stats.tools + ' tools → ' + data.stats.scWithTool + ' SCs; ' +
    data.stats.automated + ' automated / ' + data.stats.structural + ' structural / ' + data.stats.manual + ' manual of ' + data.stats.docApplicable + ' doc-applicable A/AA.');
}
