// Fraction Lab advertised seven nav destinations whose render functions have
// never existed in this file's history — the tabs were added without the views.
// Because the calls sit in the returned element tree rather than in an event
// handler, clicking any of them threw during render and blanked the WHOLE tool,
// not just the panel:
//
//   Practice ▸ Op proofs   → renderVisualOperationProofs is not defined
//   Practice ▸ Decimals    → renderDecimalsTab is not defined
//   Practice ▸ Percents    → renderPercentsTab is not defined
//   Explorers ▸ Eq chain   → renderEquivChainTab is not defined
//   Drill ▸ Benchmarks     → renderBenchmarkTab is not defined
//   My account ▸ Settings  → renderSettingsTab is not defined
//   My account ▸ Sessions  → renderSessionsTab is not defined
//
// Nothing caught it: check_free_vars does not cover stem_lab (see
// tests/stem_ctx_binding_integrity.test.js), and a default render normalises
// `tab` to the first tab of the current mode, so a smoke test that sets `tab`
// WITHOUT the matching `navMode` silently exercises the default tab instead.
// That normalisation is why my own first pass reported all tabs healthy.
//
// The entries and their dispatch lines were withdrawn together. Restore them
// together too, once a view exists.

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_fractions.js';
const SRC = readFileSync(resolve(process.cwd(), FILE), 'utf8');

const GHOSTS = ['renderVisualOperationProofs', 'renderEquivChainTab', 'renderDecimalsTab',
  'renderPercentsTab', 'renderBenchmarkTab', 'renderSessionsTab', 'renderSettingsTab'];

describe('Fraction Lab — no tab dispatches to a function that does not exist', () => {
  it('calls nothing undefined', () => {
    for (const name of GHOSTS) {
      const declared = new RegExp('(?:function|var|let|const)\\s+' + name + '\\b|' + name + '\\s*=\\s*function').test(SRC);
      const called = new RegExp('[^\\w.$]' + name + '\\s*\\(').test(SRC);
      expect(called && !declared,
        name + ' is called but never declared — that call throws during render and blanks the tool')
        .toBe(false);
    }
  });

  it('advertises no tab id that has no dispatch', () => {
    // Every id offered in the live `tabs` registry must have a matching branch.
    const start = SRC.indexOf('var tabs = [');
    const end = SRC.indexOf('];', start);
    const ids = [...SRC.slice(start, end).matchAll(/id: *'([A-Za-z]+)'/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(5);
    for (const id of ids) {
      expect(new RegExp("tab === '" + id + "'").test(SRC),
        "tab '" + id + "' is offered in the nav but nothing renders it").toBe(true);
    }
  });
});

describe('Fraction Lab — every nav destination renders', () => {
  beforeEach(() => { resetStemLab(); loadTool(FILE, 'fractions'); });

  // ★ navMode must accompany tab. The render snaps `tab` to the first tab of
  // the current mode when it does not belong there, so setting tab alone tests
  // the default tab over and over and always passes.
  const MAIN = [['learn', 'practice'], ['learn', 'models'], ['learn', 'numberline'], ['learn', 'cra'],
    ['learn', 'wall'], ['learn', 'manip'], ['learn', 'reference'], ['learn', 'curiosities'],
    ['learn', 'aboutSuper'], ['practice', 'compare'], ['practice', 'operations'],
    ['practice', 'equivalents'], ['practice', 'converter'], ['practice', 'explorers'],
    ['practice', 'drill'], ['apply', 'wordproblems'], ['teacher', 'myAccount']];

  for (const [navMode, tab] of MAIN) {
    it('renders ' + navMode + ' / ' + tab, () => {
      expect(() => renderTool('fractions', { _fractions: { navMode, tab } })).not.toThrow();
    });
  }

  const SUBS = [['practice', 'explorers', { expSub: 'calc' }],
    ['practice', 'explorers', { expSub: 'factfam' }],
    ['practice', 'drill', { drillSub: 'pbank' }],
    ['teacher', 'myAccount', { acctSub: 'goals' }]];

  for (const [navMode, tab, extra] of SUBS) {
    it('renders ' + tab + ' ▸ ' + Object.values(extra)[0], () => {
      expect(() => renderTool('fractions', { _fractions: Object.assign({ navMode, tab }, extra) })).not.toThrow();
    });
  }

  it('survives a stale sub-view id left in saved state', () => {
    // The withdrawn ids may still sit in a student's saved tool data. They must
    // render as nothing rather than take the tool down.
    for (const extra of [{ expSub: 'equivchain' }, { drillSub: 'benchmarks' },
      { acctSub: 'settings' }, { acctSub: 'sessions' }]) {
      resetStemLab();
      loadTool(FILE, 'fractions');
      expect(() => renderTool('fractions', { _fractions: Object.assign({ navMode: 'practice', tab: 'explorers' }, extra) }),
        'stale ' + JSON.stringify(extra) + ' still crashes').not.toThrow();
    }
  });
});
