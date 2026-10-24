import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
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
  host = document.createElement('div'); document.body.append(host);
  root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App)));
  return () => latest;
}
const core = () => window.__WeldLabCore.proc;
const ledger = () => host.querySelector('[data-proc-ledger]');
const rows = () => [...host.querySelectorAll('[data-proc-ledger-row]')];
async function pick(id) { await React.act(() => host.querySelector('[data-proc-ledger-pick="' + id + '"]').click()); }
async function choice(group, text) {
  const g = host.querySelector('[aria-label="' + group + '"]');
  const b = [...g.querySelectorAll('[role="radio"]')].find(x => x.textContent.includes(text));
  expect(b).toBeTruthy(); await React.act(() => b.click());
}

describe('Job Matcher visual score ledger', () => {
  it('preserves exact model ranking, totals and one symmetric scale across all seven processes', async () => {
    await mount({ proc2_job: { mat: 'stainless', thk: 'sheet', look: 'sanitary' } });
    const expected = core().rank(core().normJob({ mat: 'stainless', thk: 'sheet', look: 'sanitary' }));
    const max = Math.max(1, ...expected.map(r => Math.abs(r.score)));
    expect(rows().map(r => r.dataset.procLedgerRow)).toEqual(expected.map(r => r.id));
    expect(Number(ledger().dataset.scoreLimit)).toBe(max);
    expect(ledger().dataset.procLedger).toBe(expected[0].id);
    for (const [i, r] of expected.entries()) {
      const row = rows()[i], plot = row.querySelector('[data-proc-ledger-score-plot]');
      expect(row.dataset.score).toBe(String(r.score));
      expect(row.dataset.out).toBe(String(r.out));
      expect(row.dataset.rank).toBe(String(i + 1));
      expect(Number(plot.dataset.limit)).toBe(max);
      const bar = plot.querySelector('[data-proc-ledger-score-bar]');
      if (r.score) {
        expect(Number(bar.dataset.value)).toBe(r.score);
        expect(Number(bar.dataset.from)).toBe(0);
        expect(Number(bar.dataset.to)).toBe(r.score);
        expect(Number(bar.getAttribute('x'))).toBeCloseTo(Math.min(150, 150 + r.score / max * 142));
        expect(Number(bar.getAttribute('width'))).toBeCloseTo(Math.abs(r.score / max * 142));
      } else expect(bar).toBeNull();
    }
  });

  it('traces every process through all nine exact model cells, including zero and exclusion marks', async () => {
    await mount({ proc2_job: { mat: 'aluminum', thk: 'heavy', loc: 'wind', pos: 'over', vol: 'line', look: 'visible', surf: 'dirty', budget: 'low', port: 'carry' } });
    const job = core().normJob({ mat: 'aluminum', thk: 'heavy', loc: 'wind', pos: 'over', vol: 'line', look: 'visible', surf: 'dirty', budget: 'low', port: 'carry' });
    const limit = Math.max(1, ...core().IDS.flatMap(id => core().FACTOR_KEYS.map(f => Math.abs(core().cell(f, job[f], id).d || 0))));
    let sawNegative = false, sawZero = false, sawExclusion = false;
    for (const id of core().IDS) {
      await pick(id);
      const detail = ledger().querySelector('[data-proc-ledger-breakdown]');
      expect(detail.dataset.procLedgerBreakdown).toBe(id);
      expect(Number(detail.dataset.factorLimit)).toBe(limit);
      const factors = [...detail.querySelectorAll('[data-proc-ledger-factor]')];
      expect(factors.map(el => el.dataset.procLedgerFactor)).toEqual(core().FACTOR_KEYS);
      let sum = 0, excluded = false;
      for (const el of factors) {
        const f = el.dataset.procLedgerFactor, cell = core().cell(f, job[f], id);
        expect(el.dataset.choice).toBe(job[f]);
        expect(el.dataset.points).toBe(cell.d === null ? 'out' : String(cell.d));
        const plot = el.querySelector('svg');
        expect(Number(plot.dataset.limit)).toBe(limit);
        if (cell.d === null) {
          sawExclusion = excluded = true;
          expect(el.querySelector('[data-proc-ledger-exclusion]')).toBeTruthy();
          expect(el.textContent).toContain('Ruled out');
        } else {
          sum += cell.d;
          if (cell.d < 0) sawNegative = true;
          if (cell.d === 0) {
            sawZero = true;
            expect(el.querySelector('[data-proc-ledger-zero]')).toBeTruthy();
          } else expect(Number(el.querySelector('[data-proc-ledger-factor-bar]').dataset.value)).toBe(cell.d);
        }
      }
      const model = core().rank(job).find(r => r.id === id);
      expect(sum).toBe(model.score); expect(excluded).toBe(model.out);
    }
    expect(sawNegative && sawZero && sawExclusion).toBe(true);
  });

  it('keeps a positive subtotal excluded and explains that points cannot cancel an exclusion', async () => {
    await mount({ proc2_job: { mat: 'steel', thk: 'plate', vol: 'line', budget: 'high' } });
    const spot = rows().find(r => r.dataset.procLedgerRow === 'spot');
    expect(Number(spot.dataset.score)).toBeGreaterThan(0);
    expect(spot.dataset.out).toBe('true');
    expect(spot.querySelector('[data-proc-ledger-total]').textContent).toMatch(/Ruled out · subtotal \+/);
    expect(spot.querySelector('[data-proc-ledger-pick]').textContent).not.toContain('Best match');
    expect(spot.querySelector('[data-proc-ledger-score-bar]').getAttribute('fill')).toBe('#ffffff');
    await pick('spot');
    expect(host.querySelector('[data-proc-ledger-summary="spot"]').textContent).toContain('cannot cancel an exclusion');
    expect(spot.querySelector('[data-proc-ledger-factor="thk"]').dataset.points).toBe('out');
    expect(rows().findIndex(r => r.dataset.out === 'true')).toBeGreaterThan(rows().findLastIndex(r => r.dataset.out === 'false'));
  });

  it('uses local inspection state and retains an inspected process when job choices rerank the list', async () => {
    const saved = { proc2_job: { mat: 'steel', thk: 'plate' }, proc2_guess: { g1: 0 } };
    const latest = await mount(saved);
    await pick('oxy'); await pick('stick');
    expect(latest()).toEqual({ view: 'processCompare', ...saved });
    await choice('Material', 'Stainless steel');
    await choice('Thickness', 'Sheet');
    await choice('Appearance', 'Sanitary');
    const expected = core().rank(core().normJob(latest().proc2_job));
    expect(rows().map(r => r.dataset.procLedgerRow)).toEqual(expected.map(r => r.id));
    expect(rows()[0].dataset.procLedgerRow).toBe('tig');
    expect(ledger().dataset.procLedger).toBe('stick');
    expect(host.querySelector('[data-proc-ledger-breakdown="stick"] [data-proc-ledger-factor="look"]').dataset.points).toBe('out');
    expect(latest().proc2_guess).toEqual(saved.proc2_guess);
  });

  it('follows a new leader before explicit inspection and keeps guide first-pick locking intact', async () => {
    const latest = await mount();
    await choice('Material', 'Stainless steel'); await choice('Thickness', 'Sheet'); await choice('Appearance', 'Sanitary');
    expect(ledger().dataset.procLedger).toBe('tig');
    expect(latest().proc2_guess).toBeUndefined();
    const guide = host.querySelector('[aria-label="Your process for job 1"]');
    const opts = [...guide.querySelectorAll('button')];
    await React.act(() => opts[0].click());
    const first = { ...latest().proc2_guess };
    await pick('spot'); await pick('mig');
    await React.act(() => opts[1].click());
    expect(latest().proc2_guess).toEqual(first);
    expect([...guide.querySelectorAll('button')].every(b => b.getAttribute('aria-disabled') === 'true')).toBe(true);
  });

  it('keeps every existing scoring explanation available in native disclosures', async () => {
    await mount({ proc2_job: { mat: 'stainless', thk: 'sheet', look: 'sanitary' } });
    expect(ledger().querySelectorAll('details[data-proc-ledger-prose]')).toHaveLength(7);
    const tig = host.querySelector('[data-proc-ledger-prose="tig"]');
    expect(tig.textContent).toContain('Why it rises');
    expect(tig.textContent).toContain('Sanitary specs (food, dairy, pharma) are written around TIG');
    expect(host.querySelector('[data-proc-ledger-prose="stick"]').textContent).toContain('Ruled out because');
    expect(tig.querySelector('summary').textContent).toBe('Read the scoring explanation');
    await pick('stick');
    expect(tig.textContent).toContain('Sanitary specs');
  });

  it('normalizes malformed saved jobs without rewriting them during score inspection', async () => {
    const latest = await mount({ proc2_job: { mat: '__proto__', thk: 1, loc: 'constructor' }, proc2_guess: { g1: 999 } });
    expect(rows().map(r => r.dataset.procLedgerRow)).toEqual(core().rank(core().DEFAULT_JOB).map(r => r.id));
    await pick('spot');
    expect(latest().proc2_job).toEqual({ mat: '__proto__', thk: 1, loc: 'constructor' });
    expect(latest().proc2_guess).toEqual({ g1: 999 });
    expect(ledger().innerHTML).not.toMatch(/NaN|Infinity|undefined/);
  });

  it('provides native expanded controls, decorative plots and a readable contrast palette without animation', async () => {
    await mount({}, true); await pick('tig');
    expect(ledger().style.background).toBe('rgb(0, 0, 0)');
    expect(ledger().style.color).toBe('rgb(255, 255, 255)');
    for (const button of ledger().querySelectorAll('[data-proc-ledger-pick]')) {
      expect(button.tagName).toBe('BUTTON'); expect(button.style.minHeight).toBe('44px');
      expect(button.className).toContain('focus:ring-4');
      const controlled = host.querySelector('#' + button.getAttribute('aria-controls'));
      expect(controlled.hidden).toBe(button.getAttribute('aria-expanded') !== 'true');
    }
    const active = ledger().querySelector('[data-proc-ledger-pick="tig"]');
    expect(active.style.background).toBe('rgb(0, 0, 0)'); expect(active.style.color).toBe('rgb(255, 255, 255)');
    for (const plot of ledger().querySelectorAll('svg')) expect(plot.getAttribute('aria-hidden')).toBe('true');
    expect(ledger().querySelector('animate,animateTransform')).toBeNull();
    const factors = ledger().querySelector('[data-proc-ledger-breakdown="tig"] dl');
    expect(factors.style.gridTemplateColumns).toContain('auto-fit');
  });

  it('opens every retained explanation with explicit readable contrast text and signs on the black cards', async () => {
    await mount({ proc2_job: { mat: 'stainless', thk: 'sheet', look: 'sanitary', loc: 'wind', surf: 'dirty', budget: 'low', port: 'carry' } }, true);
    const disclosures = [...ledger().querySelectorAll('[data-proc-ledger-prose]')];
    expect(disclosures).toHaveLength(7);
    let signs = 0, headings = 0, readings = 0;
    for (const disclosure of disclosures) {
      await React.act(() => disclosure.querySelector('summary').click());
      expect(disclosure.open).toBe(true);
      const text = [...disclosure.querySelectorAll('[class*="text-slate-"], [class*="text-emerald-"], [class*="text-rose-"]')];
      expect(text.length).toBeGreaterThan(0);
      for (const node of text) {
        expect(['rgb(255, 255, 255)', 'rgb(255, 255, 0)']).toContain(node.style.color);
        if (node.className.includes('font-mono')) { signs++; expect(node.style.color).toBe('rgb(255, 255, 0)'); }
        else if (node.className.includes('uppercase')) { headings++; expect(node.style.color).toBe('rgb(255, 255, 0)'); }
        else if (node.className.includes('text-slate-800')) { readings++; expect(node.style.color).toBe('rgb(255, 255, 255)'); }
      }
    }
    expect(signs).toBeGreaterThan(0); expect(headings).toBeGreaterThan(0); expect(readings).toBeGreaterThan(0);
    expect(ledger().textContent).toContain('Why it rises');
    expect(ledger().textContent).toContain('Why it drops');
    expect(ledger().textContent).toContain('Ruled out because');
  });

});
