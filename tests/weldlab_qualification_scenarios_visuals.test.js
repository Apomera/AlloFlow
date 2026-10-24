import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const BASE = { view: 'qualPrep', qp_view: 'matrix' };
const ROWS = ['plateGroove', 'fillet', 'pipeGroove', 'tyk'];
const POS = ['F', 'H', 'V', 'OH'];
let root, host;
const core = () => window.__WeldLabCore;
const lens = (el, scope = 'matrix') => el.querySelector(`[data-qp-coverage-inspector="${scope}"]`);
const expectedState = (q, row, pos) => q[row].includes(pos) ? 'yes' : row === 'pipeGroove' && q.pipeLarge.includes(pos) ? 'large' : 'no';

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.__alloflowWeldLab;
  localStorage.clear();
  resetStemLab();
  loadTool(SRC, 'weldLab');
});
afterEach(async () => {
  if (root) await React.act(() => root.unmount());
  root = null; host?.remove(); host = null;
});
function render(extra = {}, contrast = false) {
  const el = document.createElement('div');
  el.innerHTML = renderTool('weldLab', { weldLab: { ...BASE, ...extra } }, { isContrast: contrast });
  return el;
}
async function mount(extra = {}, contrast = false) {
  let latest;
  function App() {
    const [data, setData] = React.useState({ weldLab: { ...BASE, ...extra } }); latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({ toolData: data, setToolData: setData, isContrast: contrast,
      update: (id, key, value) => setData(prev => ({ ...prev, [id]: { ...prev[id], [key]: value } })) }));
  }
  host = document.createElement('div'); document.body.append(host);
  root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App)));
  return () => latest;
}
async function click(selector) {
  const button = host.querySelector(selector); expect(button, selector).toBeTruthy();
  await React.act(() => button.click());
}
async function named(text) {
  const button = [...host.querySelectorAll('button')].find(b => b.textContent.trim() === text);
  expect(button, text).toBeTruthy(); await React.act(() => button.click());
}
const choices = () => host.querySelectorAll('[aria-label="Choose the qualification test"] button');

describe('Qualification position provenance and scenario inspector', () => {
  it('keeps every matrix cell exactly aligned to the existing qualification model for all tests and authored pairs', () => {
    const sets = core().PIPE2_QUAL_TESTS.map(t => [t.id]).concat([['plate3G', 'plate4G'], ['pipe2G', 'pipe5G'], ['fillet3F', 'fillet4F']]);
    for (const ids of sets) {
      const el = render({ pipe2_qtest: ids.join('+') }), q = core().pipe2Qualifies(ids);
      expect(el.querySelectorAll('[data-qp-cell]')).toHaveLength(16);
      for (const row of ROWS) for (const pos of POS) {
        const cell = el.querySelector(`[data-qp-cell="${row}:${pos}"]`);
        expect(cell.dataset.state, `${ids}/${row}/${pos}`).toBe(expectedState(q, row, pos));
        expect(cell.tagName).toBe('BUTTON'); expect(cell.style.minHeight).toBe('44px');
      }
      const inspect = lens(el);
      expect(inspect.dataset.state).toBe(expectedState(q, 'plateGroove', 'V'));
      for (const item of inspect.querySelectorAll('[data-qp-provenance-test]')) {
        expect(item.dataset.state).toBe(expectedState(core().pipe2Qualifies([item.dataset.qpProvenanceTest]), 'plateGroove', 'V'));
      }
    }
  });

  it('selects any production weld cell and keeps the schematic, named position and source tests synchronized without changing answers', async () => {
    const saved = { 0: 1 }, quiz = { 2: 3 };
    const latest = await mount({ pipe2_qtest: 'pipe6GR', pipe2_scn: saved, qp_ans: quiz });
    for (const row of ROWS) for (const pos of POS) {
      await click(`[data-qp-cell="${row}:${pos}"]`);
      const inspect = lens(host), specimen = inspect.querySelector('[data-qp-specimen]');
      expect(inspect.dataset.row).toBe(row); expect(inspect.dataset.position).toBe(pos); expect(inspect.dataset.state).toBe('yes');
      expect(specimen.dataset.qpSpecimen).toBe(row); expect(specimen.dataset.position).toBe(pos);
      expect(specimen.querySelector('[data-qp-weld-mark]')).toBeTruthy();
      expect(inspect.querySelector('[data-qp-cell-reading]').dataset.qpCellReading).toBe(`${row}:${pos}`);
      expect(host.querySelectorAll('[data-qp-cell][aria-pressed="true"]')).toHaveLength(1);
    }
    expect(latest().pipe2_qtest).toBe('pipe6GR'); expect(latest().pipe2_scn).toEqual(saved); expect(latest().qp_ans).toEqual(quiz);
    expect(lens(host).textContent).toContain('not an orientation or test setup');
  });

  it('shows the exact contribution of each plate test when their union covers all four positions', async () => {
    await mount({ pipe2_qtest: 'plate4G' });
    await click('[data-qp-cell="plateGroove:V"]'); expect(lens(host).dataset.state).toBe('no');
    await named('3G + 4G');
    expect(lens(host).dataset.state).toBe('yes');
    expect(lens(host).querySelector('[data-qp-provenance-test="plate3G"]').dataset.state).toBe('yes');
    expect(lens(host).querySelector('[data-qp-provenance-test="plate4G"]').dataset.state).toBe('no');
    await click('[data-qp-cell="plateGroove:OH"]');
    expect(lens(host).querySelector('[data-qp-provenance-test="plate3G"]').dataset.state).toBe('no');
    expect(lens(host).querySelector('[data-qp-provenance-test="plate4G"]').dataset.state).toBe('yes');
    expect(lens(host).textContent).toContain('combines the positions covered by each test');
  });

  it('keeps conditional large-pipe coverage distinct from unrestricted coverage for a mixed saved test set', async () => {
    await mount({ pipe2_qtest: 'plate3G+pipe1G' });
    await click('[data-qp-cell="pipeGroove:F"]');
    expect(lens(host).dataset.state).toBe('yes');
    expect(lens(host).querySelector('[data-qp-provenance-test="plate3G"]').dataset.state).toBe('large');
    expect(lens(host).querySelector('[data-qp-provenance-test="pipe1G"]').dataset.state).toBe('yes');
    await click('[data-qp-cell="pipeGroove:V"]');
    expect(lens(host).dataset.state).toBe('large');
    expect(lens(host).textContent).toContain('only at 24 in. OD and up');
    await click('[data-qp-cell="tyk:V"]'); expect(lens(host).dataset.state).toBe('no');
  });

  it('never mounts answer-set or requirement coverage before a valid first answer for that scenario', () => {
    for (const value of [undefined, [], { 0: 8 }, { 0: -1 }, { 0: 1.5 }, { 0: '1' }, { 1: 2 }]) {
      const el = render({ pipe2_scn: value });
      expect(el.querySelector('[data-qp-job-inspector]')).toBeNull();
      expect(el.querySelector('[data-qp-job-source]')).toBeNull();
      expect(el.querySelector('[data-qp-job-cell]')).toBeNull();
      expect(lens(el, 'scenario')).toBeNull();
      expect([...el.querySelectorAll('[aria-label="Choose the qualification test"] button')].every(b => !b.disabled)).toBe(true);
    }
  });

  it('uses exactly each authored scenario requirement, submitted tests and already-held tests after commitment', () => {
    core().PIPE2_QUAL_SCENARIOS.forEach((s, index) => s.opts.forEach((opt, pick) => {
      const el = render({ pipe2_scnidx: index, pipe2_scn: { [index]: pick } });
      const inspect = lens(el, 'scenario'), q = core().pipe2Qualifies(s.has.concat(opt));
      const needed = ROWS.flatMap(row => (s.need[row] || []).map(pos => `${row}:${pos}`));
      const buttons = [...inspect.querySelectorAll('[data-qp-job-cell]')];
      expect(buttons.map(b => b.dataset.qpJobCell)).toEqual(needed);
      expect(Number(inspect.dataset.required)).toBe(needed.length);
      expect(Number(inspect.dataset.covered)).toBe(needed.length - core().pipe2Covers(s.has.concat(opt), s.need).missing.length);
      expect([...inspect.querySelectorAll('[data-qp-provenance-test]')].map(el => el.dataset.qpProvenanceTest)).toEqual(s.has.concat(opt));
      for (const button of buttons) {
        const [row, pos] = button.dataset.qpJobCell.split(':');
        expect(button.dataset.state).toBe(expectedState(q, row, pos));
      }
      expect(el.querySelectorAll('[data-qp-job-source][aria-pressed="true"]')).toHaveLength(1);
      expect(el.querySelector('[data-qp-job-source="picked"]').getAttribute('aria-pressed')).toBe('true');
    }));
  });

  it('compares a wrong submitted set with the answer set while preserving the first-answer lock and score', async () => {
    const latest = await mount();
    await React.act(() => choices()[0].click());
    expect(latest().pipe2_scn).toEqual({ 0: 0 }); expect([...choices()].every(b => b.disabled)).toBe(true);
    expect(Number(lens(host, 'scenario').dataset.covered)).toBe(2);
    await click('[data-qp-job-cell="plateGroove:V"]'); expect(lens(host, 'scenario').dataset.state).toBe('no');
    await click('[data-qp-job-source="key"]');
    expect(Number(lens(host, 'scenario').dataset.covered)).toBe(4); expect(lens(host, 'scenario').dataset.state).toBe('yes');
    expect(lens(host, 'scenario').querySelector('[data-qp-provenance-test="plate3G"]').dataset.state).toBe('yes');
    expect(lens(host, 'scenario').querySelector('[data-qp-provenance-test="plate4G"]').dataset.state).toBe('no');
    await React.act(() => choices()[1].click());
    expect(latest().pipe2_scn).toEqual({ 0: 0 });
    expect(host.textContent).toContain('0 right first time');
    await click('[data-qp-job-source="picked"]'); expect(lens(host, 'scenario').dataset.state).toBe('no');
    expect(latest().pipe2_qtest).toBeUndefined();
    await named('Next →'); expect(lens(host, 'scenario')).toBeNull();
    await React.act(() => choices()[2].click());
    expect(latest().pipe2_scn).toEqual({ 0: 0, 1: 2 });
    expect(host.querySelector('[data-qp-job-source="picked"]').getAttribute('aria-pressed')).toBe('true');
    expect(host.textContent).toContain('1 right first time');
  });

  it('separates the already-held 6G from an added 6GR for the mixed upgrade job', async () => {
    const latest = await mount({ pipe2_scnidx: 5, pipe2_scn: { 5: 0 } });
    expect(Number(lens(host, 'scenario').dataset.covered)).toBe(2); expect(Number(lens(host, 'scenario').dataset.required)).toBe(6);
    await click('[data-qp-job-cell="tyk:F"]');
    expect(lens(host, 'scenario').dataset.state).toBe('no');
    expect(lens(host, 'scenario').querySelector('[data-qp-provenance-test="pipe6G"]').textContent).toContain('already held');
    await click('[data-qp-job-source="key"]');
    expect(Number(lens(host, 'scenario').dataset.covered)).toBe(6);
    expect(lens(host, 'scenario').querySelector('[data-qp-provenance-test="pipe6G"]').dataset.state).toBe('no');
    expect(lens(host, 'scenario').querySelector('[data-qp-provenance-test="pipe6GR"]').dataset.state).toBe('yes');
    await click('[data-qp-job-cell="pipeGroove:H"]');
    expect(lens(host, 'scenario').querySelector('[data-qp-provenance-test="pipe6G"]').dataset.state).toBe('yes');
    expect(latest().pipe2_scn).toEqual({ 5: 0 });
  });

  it('does not count a large-pipe-only cell as meeting the fixed 8 in. pipe scenario', async () => {
    await mount({ pipe2_scnidx: 3, pipe2_scn: { 3: 3 } });
    const inspect = lens(host, 'scenario');
    expect(inspect.dataset.state).toBe('large'); expect(Number(inspect.dataset.covered)).toBe(0);
    expect(inspect.textContent).toContain('does not meet the pipe requirement in this job');
    await click('[data-qp-job-cell="pipeGroove:OH"]'); expect(lens(host, 'scenario').dataset.state).toBe('no');
    await click('[data-qp-job-source="key"]'); expect(Number(lens(host, 'scenario').dataset.covered)).toBe(3);
  });

  it('normalizes malformed saved test/scenario selections and keeps the explorer out of quiz and bend records', async () => {
    const latest = await mount({ pipe2_qtest: 'missing+plate3G+not-real', pipe2_scnidx: 999, pipe2_scn: { 99: 0, 0: 'bad' }, qp_ans: { 0: 1 } });
    expect(lens(host).querySelectorAll('[data-qp-provenance-test]')).toHaveLength(1);
    expect(lens(host).querySelector('[data-qp-provenance-test]').dataset.qpProvenanceTest).toBe('plate3G');
    expect(host.querySelector('[data-qp-job-inspector]')).toBeNull();
    await click('[data-qp-cell="fillet:H"]');
    await named('↩ Bend test');
    expect(host.querySelector('[data-pipe2-journey-stage]')).toBeTruthy(); expect(lens(host)).toBeNull();
    const quizButton = [...host.querySelectorAll('button')].find(b => b.textContent.includes('Practice Quiz'));
    await React.act(() => quizButton.click()); expect(lens(host)).toBeNull(); expect(latest().qp_ans).toEqual({ 0: 1 });
    await named('🧩 What a test qualifies');
    expect(lens(host).dataset.row).toBe('fillet'); expect(lens(host).dataset.position).toBe('H');
    expect(latest().pipe2_scn).toEqual({ 99: 0, 0: 'bad' });
  });

  it('clears the scenario result explorer with the existing reset without changing matrix inspection', async () => {
    const latest = await mount({ pipe2_scnidx: 5, pipe2_scn: { 5: 0 }, pipe2_qtest: 'pipe6GR' });
    await click('[data-qp-cell="tyk:OH"]'); await click('[data-qp-job-source="key"]');
    await named('↺ Reset');
    expect(latest().pipe2_scn).toEqual({}); expect(latest().pipe2_scnidx).toBe(0);
    expect(lens(host, 'scenario')).toBeNull(); expect(lens(host).dataset.row).toBe('tyk'); expect(lens(host).dataset.position).toBe('OH');
    expect([...choices()].every(b => !b.disabled)).toBe(true);
  });

  it('provides distinct contrast selection, readable actual specimen strokes and wrapping native controls', async () => {
    await mount({ pipe2_scn: { 0: 0 } }, true);
    for (const scope of ['matrix', 'scenario']) {
      const inspect = lens(host, scope);
      expect(inspect.style.background).toBe('rgb(0, 0, 0)'); expect(inspect.style.color).toBe('rgb(255, 255, 255)');
      expect(inspect.querySelector('h4').style.color).toBe('rgb(255, 255, 0)');
      expect(inspect.querySelector('[data-qp-weld-mark]').getAttribute('fill')).toBe('#ffff00');
      expect(inspect.querySelector('[data-qp-weld-mark]').getAttribute('stroke')).toBe('#ffffff');
      expect(inspect.querySelector('svg').style.background).toBe('rgb(0, 0, 0)');
      expect(inspect.querySelector('svg').getAttribute('role')).toBe('img');
      expect(inspect.querySelector('animate,animateTransform')).toBeNull();
    }
    const active = host.querySelector('[data-qp-cell][aria-pressed="true"]'), inactive = host.querySelector('[data-qp-cell][aria-pressed="false"]');
    expect(active.style.background).toBe('rgb(255, 255, 0)'); expect(active.style.color).toBe('rgb(0, 0, 0)');
    expect(inactive.style.background).toBe('rgb(0, 0, 0)'); expect(inactive.style.color).toBe('rgb(255, 255, 255)');
    const source = host.querySelector('[data-qp-job-source="picked"]');
    expect(source.style.background).toBe('rgb(255, 255, 0)'); expect(source.style.color).toBe('rgb(0, 0, 0)');
    expect(source.parentElement.style.flexWrap).toBe('wrap');
    for (const b of host.querySelectorAll('[data-qp-cell], [data-qp-job-cell], [data-qp-job-source]')) {
      expect(b.tagName).toBe('BUTTON'); expect(b.style.minHeight).toBe('44px'); expect(b.className).toContain('focus:ring-4');
    }
    await click('[data-qp-job-source="key"]');
    expect(source.style.background).toBe('rgb(0, 0, 0)');
    expect(host.querySelector('[data-qp-job-source="key"]').style.background).toBe('rgb(255, 255, 0)');
  });
});
