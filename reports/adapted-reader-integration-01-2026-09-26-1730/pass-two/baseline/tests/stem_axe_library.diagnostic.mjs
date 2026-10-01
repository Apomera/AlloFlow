// Library-wide accessibility smoke: render every STEM tool in its default
// state and run axe over it.
//
// 83 of 137 tools have some a11y test; 47 tools over 800 lines have none at
// all, including several over 20,000. This does not replace a per-tool suite —
// it renders ONE state and cannot reach anything behind a tab, a mode or a
// click. What it does catch is the structural class, which is what the per-tool
// axe sweep found in nuclearlab and which careful authoring does not reliably
// avoid: a role that kills the element it is on, an aria-* attribute invalid
// for its role, a duplicate id, a control with no accessible name.
//
// Rules needing computed style are OFF: jsdom has no stylesheet, so contrast
// here would be grading unstyled text. Canvas ink is covered by
// stem_canvas_ink_contrast; DOM contrast by the per-tool browser suites.
//
// DIAGNOSTIC, not a suite member — named .diagnostic.mjs so vitest's
// include ('tests/**/*.test.js') skips it. Run deliberately:
//
//   cp tests/stem_axe_library.diagnostic.mjs tests/zz_axe_tmp.test.js //     && npx vitest run tests/zz_axe_tmp.test.js; rm tests/zz_axe_tmp.test.js
//
// The copy is not ceremony: vitest.config.js sets include to
// 'tests/**/*.test.js', and a path argument FILTERS that list rather than
// adding to it, so a .mjs here is simply never collected. Renaming is the only
// way to run it without editing the shared config.
//
// It does not gate the suite for two reasons. It takes minutes over 137 tools,
// and axe-core is a SINGLETON: one oversized tool exceeding its budget leaves a
// run in flight, and every call after it fails with "Axe is already running" —
// which presents as ninety-odd failures and is really one timeout. Scanning
// sequentially in a single test with a generous budget avoids that entirely.

import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
let axe;

beforeAll(() => {
  axe = require(resolve(process.cwd(), 'desktop/web-app/node_modules', 'axe-core'));
});

const DISABLED = {
  'color-contrast': { enabled: false },
  region: { enabled: false },
  'page-has-heading-one': { enabled: false },
  'landmark-one-main': { enabled: false },
  'html-has-lang': { enabled: false },
  'heading-order': { enabled: false },
};

const TOOLS = fs.readdirSync('stem_lab')
  .filter((f) => /^stem_tool_.*\.js$/.test(f) && !f.endsWith('.bak'))
  .map((f) => {
    const src = fs.readFileSync('stem_lab/' + f, 'utf8');
    const id = (src.match(/registerTool\('([^']+)'/) || [])[1];
    return id ? { file: 'stem_lab/' + f, id, slug: f.replace(/^stem_tool_|\.js$/g, '') } : null;
  })
  .filter(Boolean);

// Violations that are a deliberate, documented choice rather than a defect.
// Empty on purpose: everything found should be fixed or justified in writing.
const ACCEPTED = {};

// No baseline or ratchet here, deliberately. A first version carried a
// hand-written KNOWN_BACKLOG so the scan could gate the suite; it was
// assembled from a truncated grep, attributed rules to the wrong tools, and
// turned a 30-tool finding into 94 spurious failures. A diagnostic reports —
// the report file is the artifact, and it is regenerated from scratch on every
// run, so it cannot drift out of date the way a hand-kept list does.
//
// Priority order for working the findings down, by what it costs a student:
//   1. aria-required-parent  — role="tab" with no tablist. Tab semantics gone.
//   2. aria-valid-attr-value — aria-controls pointing at ids that do not exist.
//   3. aria-allowed-attr     — aria-pressed on role="tab"; the role wins and
//                              the state is silently dropped.
//   4. aria-prohibited-attr  — aria-label on a role-less div. Ignored outright,
//                              so the label the author wrote is never announced.
//   5. nested-interactive    — controls inside role="img", unreachable.
//   6. aria-allowed-role     — role="listitem" on a <button>: the role replaces
//                              the button role. Same defect fixed in nuclearlab,
//                              and note the grep for it found ZERO tools while
//                              axe found ten — attribute order defeats grep.
//   7. landmark-*            — nesting and uniqueness; real but lower impact.

const results = [];   // { slug, items[] } | { slug, unrenderable }

describe('every STEM tool renders without structural axe violations', () => {
  it('found the tools to scan', () => {
    expect(TOOLS.length, 'no tools discovered — did the registerTool shape change?').toBeGreaterThan(120);
  });

  for (const t of TOOLS) {
    it(`${t.slug}`, async () => {
      resetStemLab();
      let html;
      try {
        loadTool(t.file, t.id);
        html = renderTool(t.id, {});
      } catch (e) {
        // Out of scope, NOT clean. Several tools need a real host or WebGL.
        // Recorded by name so the pass column is never mistaken for coverage.
        results.push({ slug: t.slug, unrenderable: String(e.message).slice(0, 80) });
        return;
      }
      const host = document.createElement('div');
      host.innerHTML = html;
      document.body.appendChild(host);
      try {
        const res = await axe.run(host, { rules: DISABLED, resultTypes: ['violations'] });
        const found = res.violations.filter((v) => !(ACCEPTED[t.slug] || []).includes(v.id));
        const items = found.map((v) => ({
          rule: v.id, impact: v.impact, count: v.nodes.length,
          sample: v.nodes[0].html.replace(/\s+/g, ' ').slice(0, 140),
        }));
        results.push({ slug: t.slug, items });

      } finally {
        host.remove();
      }
    }, 30000);
  }
});

afterAll(() => {
  if (!results.length) return;
  const unrenderable = results.filter((r) => r.unrenderable);
  const offending = results.filter((r) => r.items && r.items.length);
  const clean = results.filter((r) => r.items && !r.items.length);
  const byRule = new Map();
  for (const o of offending) {
    for (const i of o.items) {
      const k = `${i.impact}/${i.rule}`;
      byRule.set(k, (byRule.get(k) || 0) + 1);
    }
  }
  const summary = [
    `scanned ${results.length} tools: ${clean.length} clean, ${offending.length} with violations, ` +
      `${unrenderable.length} unrenderable in this harness`,
    '',
    'by rule (tools affected):',
    ...[...byRule.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `  ${String(n).padStart(3)}  ${k}`),
  ].join('\n');
  const detail = [
    summary, '',
    'PER TOOL:',
    ...offending.map((o) => `  ${o.slug}\n` +
      o.items.map((i) => `     [${i.impact}] ${i.rule} x${i.count}  ${i.sample}`).join('\n')),
    '', 'UNRENDERABLE IN THIS HARNESS (not audited):',
    ...unrenderable.map((u) => `  ${u.slug}: ${u.unrenderable}`),
  ].join('\n');
  try {
    fs.mkdirSync('test-results', { recursive: true });
    fs.writeFileSync('test-results/stem-axe-library-report.txt', detail);
  } catch { /* reporting must never fail the run */ }
  // eslint-disable-next-line no-console
  console.log('\n' + summary + '\n\nfull detail: test-results/stem-axe-library-report.txt');
});
