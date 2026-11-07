// @vitest-environment jsdom
// Ecosystem, light and dark, measured in the real host 2026-11-05.
// 1. The notebook's four buttons really are disabled until a run exists, so WCAG exempts their 2.36-2.73:1. The defect was
//    that nothing told the student what turns them on.
// 2. The Conservation tab's tinted panels are translucent over the WHITE tool card, with inks written for a dark page:
//    1.02-1.9:1 in light and dark, including the whole Year 1 coaching tip. Pixel readings are in the lightdark report.
// ECOSYSTEM_LD_FILE=<path> runs against another copy, to show the failure on the old file.
import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.ECOSYSTEM_LD_FILE || 'stem_lab/stem_tool_ecosystem.js';
const src = fs.readFileSync(path.isAbsolute(FILE) ? FILE : path.join(process.cwd(), FILE), 'utf8');

const NOTEBOOK = ['Set current run as baseline', 'Save evidence', 'Complete explanation', 'Save named branch'];
function dom(data, ctx) {
  const host = document.createElement('div');
  host.innerHTML = renderTool('ecosystem', { ecosystem: Object.assign({ tutorialDismissed: true }, data) }, ctx);
  return host;
}
const button = (host, label) => [...host.querySelectorAll('button')].find((b) => b.textContent.trim() === label);
const run = [0, 1, 2, 3].map((i) => ({ t: i, step: i, time: i, prey: 40 + i, pred: 9 + i, producers: 100 }));

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, 'ecosystem');
});

describe('Ecosystem notebook: disabled buttons say what turns them on', () => {
  it('before a run: all four stay disabled and one line explains why', () => {
    const host = dom({});
    for (const label of NOTEBOOK) {
      const b = button(host, label);
      expect(b, label).toBeTruthy();
      expect(b.disabled, label).toBe(true);
      expect(b.getAttribute('aria-describedby'), label).toBe('eco-notebook-actions-hint');
    }
    const hint = host.querySelector('#eco-notebook-actions-hint');
    expect(hint, 'no hint').not.toBeNull();
    expect(hint.textContent).toBe('These buttons turn on after you run the graph.');
  });

  it('after a run: only Complete explanation waits, and the line says for what', () => {
    const host = dom({ data: run, steps: run.length });
    expect(button(host, 'Save evidence').disabled).toBe(false);
    expect(button(host, 'Save evidence').hasAttribute('aria-describedby')).toBe(false);
    expect(button(host, 'Complete explanation').disabled).toBe(true);
    expect(host.querySelector('#eco-notebook-actions-hint').textContent).toBe('Write your evidence explanation above to turn on Complete explanation.');
  });

  it('with an explanation written: nothing is disabled and the line is gone', () => {
    const host = dom({ data: run, steps: run.length, experimentReflection: 'The curves rise then fall.' });
    expect(button(host, 'Complete explanation').disabled).toBe(false);
    expect(host.querySelector('#eco-notebook-actions-hint')).toBeNull();
  });
});

describe('Ecosystem Conservation: tints and inks', () => {
  const region = src.slice(src.indexOf('function renderConservAIPanel'), src.indexOf('// ═══ INQUIRY TAB'));
  const setupPanel = (ctx) => [...dom({ tab: 'conserve' }, ctx).querySelectorAll('div')].find((e) => /rgba\(21, ?128, ?61, ?0\.18\)/.test(e.getAttribute('style') || ''));

  it('has no pale ink left as a bare colour', () => {
    const bare = region.match(/\bcolor: '#(86efac|bbf7d0|d1fae5|fde68a|e9d5ff|bae6fd|fbbf24|38bdf8|fca5a5|fecaca|a855f7)'/g) || [];
    expect(bare).toEqual([]);
  });

  it('keeps no translucent panel without the canvas under it, in light and dark', () => {
    for (const ctx of [{ isDark: false }, { isDark: true }]) {
      const style = setupPanel(ctx).getAttribute('style');
      expect(style.includes('var(--allo-stem-canvas'), style.slice(0, 160)).toBe(true);
    }
  });

  it('leaves the contrast theme on its old panel', () => {
    const style = setupPanel({ isContrast: true }).getAttribute('style');
    expect(style.includes('var(--allo-stem-canvas')).toBe(false);
  });

  it('heads the setup in a green that reads on the dark panel in dark, and on the pale one in light', () => {
    const h3 = (ctx) => dom({ tab: 'conserve' }, ctx).querySelector('h3[style*="font-size:22px"], h3[style*="font-size: 22px"]').getAttribute('style');
    expect(h3({ isDark: false })).toContain('#166534');
    expect(h3({ isDark: true })).toContain('#86efac');
  });
});

describe('Ecosystem: pale bands the host soft ink cannot read on', () => {
  it('prints the hero hint in the tool copy ink, which stays dark on the pale band', () => {
    const p = dom({}).querySelector('[role=tabpanel] p');
    expect(p.getAttribute('style')).toContain('var(--eco-copy)');
  });

  it('keeps the contrast theme hint where it was', () => {
    const p = dom({}, { isContrast: true }).querySelector('[role=tabpanel] p');
    expect(p.getAttribute('style')).toContain('--allo-stem-text-soft');
  });

  it('labels the prey line in a green that clears 4.5:1 on the pale chart', () => {
    const l = src.split('\n').find((x) => x.includes("\\u2014 prey solid'"));
    expect(l).toContain("fill: isContrast ? '#16a34a' : '#15803d'");
  });
});
