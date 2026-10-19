import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
let root, host;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.__alloflowWeldLab;
  localStorage.clear();
  resetStemLab();
  loadTool(SRC, 'weldLab');
});
afterEach(async () => {
  if (root) await React.act(() => root.unmount());
  root = null;
  host?.remove();
});
async function mount(extra = {}, contrast = false) {
  let latest;
  function App() {
    const [data, setData] = React.useState({ weldLab: { view: 'processCompare', ...extra } });
    latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({
      toolData: data, setToolData: setData, isContrast: contrast,
      update: (id, key, value) => setData(prev => ({ ...prev, [id]: { ...prev[id], [key]: value } })),
    }));
  }
  host = document.createElement('div');
  document.body.append(host);
  root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App)));
  return () => latest;
}
async function click(selector) {
  const button = host.querySelector(selector);
  expect(button, selector).toBeTruthy();
  await React.act(() => button.click());
}
async function reference(value) {
  await React.act(() => Simulate.change(host.querySelector('[data-proc-reference]'), { target: { value } }));
}
const card = slot => host.querySelector(`[data-proc-pair-card="${slot}"]`);
const highlight = el => el.querySelector('circle[r="11"]').parentElement.querySelector('text').textContent;
const primaryCards = () => host.querySelector('[aria-label="Choose a process to look inside"]');
const guide = index => host.querySelector(`[aria-label="Your process for job ${index}"]`);

describe('Synchronized process cutaway explorer', () => {
  it('opens two existing cutaways, ties their highlight to one question and returns to the original single view', async () => {
    await mount();
    expect(host.querySelectorAll('[data-proc2^="cutaway-"]')).toHaveLength(1);
    const originalLegend = [...host.querySelectorAll('ol button')];
    await React.act(() => originalLegend[2].click());
    expect(highlight(host.querySelector('[data-proc2="cutaway-mig"]'))).toBe('3');
    await click('[data-proc-compare-toggle]');
    expect(host.querySelectorAll('[data-proc2^="cutaway-"]')).toHaveLength(2);
    expect(card('primary').dataset.process).toBe('mig');
    expect(card('reference').dataset.process).toBe('tig');
    expect(highlight(card('primary'))).toBe('4');
    expect(highlight(card('reference'))).toBe('4');
    await click('[data-proc-focus="metal"]');
    expect(highlight(card('primary'))).toBe('2');
    expect(highlight(card('reference'))).toBe('5');
    expect(card('primary').querySelector('[data-proc-pair-reading]').textContent).toContain('melts and becomes the filler metal');
    expect(card('reference').querySelector('[data-proc-pair-reading]').textContent).toContain('fed by hand');
    expect(card('reference').querySelector('[data-proc-pair-context]').textContent).toContain('tungsten arc');
    await click('[data-proc-compare-toggle]');
    expect(host.querySelector('[data-proc-paired-explorer]')).toBeNull();
    expect(host.querySelectorAll('[data-proc2^="cutaway-"]')).toHaveLength(1);
    expect(highlight(host.querySelector('[data-proc2="cutaway-mig"]'))).toBe('3');
  });

  it('highlights equivalent actual parts for all process roles, including flame and resistance welding', async () => {
    await mount();
    await click('[data-proc-compare-toggle]');
    const checks = {
      tig: { heat: [4, 'Arc'], metal: [5, 'Filler rod'], shield: [3, 'Argon shielding gas'], joint: [7, 'no slag, no spatter'] },
      stick: { heat: [5, 'Arc'], metal: [2, 'becomes the filler'], shield: [4, 'burning coating'], joint: [8, 'under the slag'] },
      fcawg: { heat: [4, 'Arc'], metal: [2, 'Tubular wire'], shield: [3, 'from a cylinder'], joint: [7, 'under the slag'] },
      fcaws: { heat: [4, 'Arc'], metal: [2, 'Tubular wire'], shield: [3, 'made by the flux core'], joint: [7, 'under the slag'] },
      oxy: { heat: [2, 'Inner cone'], metal: [4, 'fed by hand'], shield: [3, 'Outer envelope'], joint: [6, 'no slag to remove'] },
      spot: { heat: [3, 'Welding current'], metal: [4, 'Two overlapping sheets'], shield: [5, 'sheet-to-sheet interface'], joint: [5, 'Nugget'] },
    };
    for (const [process, roles] of Object.entries(checks)) {
      await reference(process);
      for (const [role, [part, text]] of Object.entries(roles)) {
        await click(`[data-proc-focus="${role}"]`);
        expect(card('reference').dataset.process).toBe(process);
        expect(highlight(card('reference'))).toBe(String(part));
        expect(card('reference').querySelector('[data-proc-pair-reading]').textContent).toContain(text);
        expect(card('reference').querySelector('svg').getAttribute('aria-label')).toContain(text);
      }
    }
    await click('[data-proc-focus="shield"]');
    expect(card('reference').querySelector('[data-proc-pair-context]').textContent).toContain('Nothing to shield');
    expect(card('reference').querySelector('[data-proc-pair-context]').textContent).toContain('INSIDE the stack');
  });

  it('swaps the primary/reference processes while retaining the role and existing matcher/guide state', async () => {
    const job = { mat: 'stainless', thk: 'sheet', look: 'sanitary' }, guesses = { g1: 0 };
    const latest = await mount({ proc2_job: job, proc2_guess: guesses });
    await click('[data-proc-compare-toggle]');
    await click('[data-proc-focus="metal"]');
    await click('[data-proc-pair-swap]');
    expect(latest().proc2_sel).toBe('tig');
    expect(card('primary').dataset.process).toBe('tig');
    expect(card('reference').dataset.process).toBe('mig');
    expect(highlight(card('primary'))).toBe('5');
    expect(highlight(card('reference'))).toBe('2');
    expect(latest().proc2_job).toEqual(job);
    expect(latest().proc2_guess).toEqual(guesses);
    expect(host.querySelector('[data-proc-paired-explorer]').dataset.procPairedExplorer).toBe('metal');
  });

  it('keeps a distinct reference when the primary cards select the current reference', async () => {
    const latest = await mount();
    await click('[data-proc-compare-toggle]');
    const tig = [...primaryCards().querySelectorAll('[role="radio"]')].find(el => el.textContent.includes('TIG / GTAW'));
    await React.act(() => tig.click());
    expect(latest().proc2_sel).toBe('tig');
    expect(card('primary').dataset.process).toBe('tig');
    expect(card('reference').dataset.process).toBe('mig');
    expect([...host.querySelector('[data-proc-reference]').options].map(option => option.value)).not.toContain('tig');
  });

  it('leaves the decision guide unrevealed until an answer is committed and preserves its first pick', async () => {
    const latest = await mount();
    await click('[data-proc-compare-toggle]');
    await click('[data-proc-focus="shield"]');
    await reference('fcaws');
    expect(latest().proc2_guess).toBeUndefined();
    expect(host.textContent).not.toContain('Your prediction was right');
    expect(host.textContent).not.toContain('You predicted');
    const first = guide(1).querySelectorAll('button');
    await React.act(() => first[0].click());
    expect(latest().proc2_guess).toEqual({ g1: 0 });
    expect([...guide(1).querySelectorAll('button')].every(b => b.getAttribute('aria-disabled') === 'true')).toBe(true);
    await reference('oxy');
    await click('[data-proc-pair-swap]');
    await React.act(() => guide(1).querySelectorAll('button')[1].click());
    expect(latest().proc2_guess).toEqual({ g1: 0 });
    expect([...guide(2).querySelectorAll('button')].every(b => b.getAttribute('aria-disabled') === 'false')).toBe(true);
  });

  it('normalizes hostile saved primary/matcher/guess state and ignores invalid local reference input', async () => {
    const latest = await mount({ proc2_sel: '__proto__', proc2_job: 'invalid', proc2_guess: { g1: 900, g2: '1' } });
    await click('[data-proc-compare-toggle]');
    expect(card('primary').dataset.process).toBe('mig');
    expect(card('reference').dataset.process).toBe('tig');
    await reference('constructor');
    expect(card('reference').dataset.process).toBe('tig');
    expect(host.innerHTML).not.toMatch(/(?:NaN|Infinity|undefined)/);
    expect(host.textContent).not.toContain('Your prediction was right');
    expect(latest().proc2_sel).toBe('__proto__'); // inspecting does not rewrite unrelated saved data
  });

  it('renders readable native controls and contrast text in the paired view without motion', async () => {
    await mount({}, true);
    await click('[data-proc-compare-toggle]');
    const panel = host.querySelector('[data-proc-paired-explorer]');
    expect(panel.style.background).toBe('rgb(0, 0, 0)');
    expect(panel.style.color).toBe('rgb(255, 255, 255)');
    expect(panel.querySelector('h4').style.color).toBe('rgb(255, 255, 0)');
    for (const button of panel.querySelectorAll('button')) {
      expect(button.tagName).toBe('BUTTON');
      expect(button.style.minHeight).toBe('44px');
      expect(button.className).toContain('focus:ring-4');
    }
    const active = panel.querySelector('[data-proc-focus][aria-pressed="true"]');
    expect(active.style.background).toBe('rgb(255, 255, 0)');
    expect(active.style.color).toBe('rgb(0, 0, 0)');
    expect(panel.querySelector('label').htmlFor).toBe(panel.querySelector('select').id);
    expect(panel.querySelector('[data-proc-pair-card]').parentElement.style.flexWrap).toBe('wrap');
    for (const reading of panel.querySelectorAll('[data-proc-pair-reading]')) expect(reading.style.color).toBe('rgb(255, 255, 255)');
    expect(panel.querySelector('animate,animateTransform')).toBeNull();
  });
});
