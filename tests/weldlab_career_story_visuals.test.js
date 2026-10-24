import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const BASE = { view: 'careerStories', cs_mode: 'browse' };
let root, host;
const core = () => window.__WeldLabCore;
const workbench = (node = host) => node.querySelector('[data-career-milestone]');
const query = (hook, node = host) => node.querySelector(`[data-career-milestone-${hook}]`);

beforeEach(() => {
  delete window.__alloflowWeldLab;
  localStorage.clear();
  resetStemLab();
  loadTool(SRC, 'weldLab');
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(async () => {
  if (root) await React.act(() => root.unmount());
  root = null;
  host?.remove();
});
function render(extra = {}, contrast = false) {
  const node = document.createElement('div');
  node.innerHTML = renderTool('weldLab', { weldLab: { ...BASE, ...extra } }, { isContrast: contrast });
  return node;
}
async function mount(extra = {}) {
  let latest;
  function App() {
    const [data, setData] = React.useState({ weldLab: { ...BASE, ...extra } });
    latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({
      toolData: data, setToolData: setData,
      update: (tool, key, value) => setData(prev => ({ ...prev, [tool]: { ...prev[tool], [key]: value } })),
    }));
  }
  host = document.createElement('div');
  document.body.append(host);
  root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App)));
  return () => latest;
}
async function click(node) { expect(node).toBeTruthy(); await React.act(() => node.click()); }
async function change(node, value) { expect(node).toBeTruthy(); await React.act(() => Simulate.change(node, { target: { value: String(value) } })); }
const button = (text) => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === text);
const profileButton = (prefix) => [...host.querySelectorAll('button')].find(node => node.textContent.startsWith(prefix));
async function pick(index) { await click(host.querySelector(`[data-career-milestone-pick="${index}"]`)); }

describe('Career-story milestone workbench', () => {
  it('shows each profile stage with its exact authored ages, duration and pay from the original timeline', () => {
    core().CAR2_PROFILES.forEach((profile, index) => profile.segs.forEach((stage, stageIndex) => {
      const node = render({ cs_sel: index, cs_milestones: { [profile.id]: stageIndex } });
      const bench = workbench(node);
      expect(bench.dataset.careerMilestone).toBe(profile.id);
      expect(Number(bench.dataset.stageIndex)).toBe(stageIndex);
      expect(bench.dataset.stageKind).toBe(stage.kind);
      expect(Number(bench.dataset.ageFrom)).toBe(stage.from);
      expect(Number(bench.dataset.ageTo)).toBe(stage.to);
      expect(Number(query('duration', node).getAttribute('data-career-milestone-duration'))).toBe(stage.to - stage.from);
      const legend = node.querySelector(`[data-career-timeline="${profile.id}"]`).parentElement.querySelectorAll('ol li');
      expect(legend[stageIndex].textContent).toContain(query('pay', node).textContent);
      expect(node.querySelector(`[data-career-timeline-highlight="${stageIndex}"]`)).toBeTruthy();
      expect(node.querySelector('[data-career-timeline-highlight]').parentElement.dataset.milestoneSelected).toBe('true');
      expect(query('scene', node).getAttribute('data-career-milestone-scene')).toBe(stage.kind);
    }));
  });

  it('uses a distinct readable schematic for every existing stage category without adding a new salary model', () => {
    const seen = new Map();
    core().CAR2_PROFILES.forEach((profile, index) => profile.segs.forEach((stage, stageIndex) => {
      if (seen.has(stage.kind)) return;
      const node = render({ cs_sel: index, cs_milestones: { [profile.id]: stageIndex } });
      const image = query('scene', node);
      expect(image.getAttribute('role')).toBe('img');
      expect(image.getAttribute('aria-label')).toContain('Schematic illustration');
      expect(image.style.width).toBe('100%');
      expect(image.querySelector('animate, animateTransform, image, canvas')).toBeNull();
      expect(workbench(node).textContent).toContain('not salary forecasts');
      seen.set(stage.kind, image.innerHTML);
    }));
    expect([...seen.keys()].sort()).toEqual(['eng', 'farm', 'inspect', 'military', 'other', 'own', 'school', 'teach', 'train', 'weld']);
    expect(new Set(seen.values()).size).toBe(10);
  });

  it('moves native stage controls and the original chart highlight together', async () => {
    const latest = await mount({ cs_sel: 1 });
    expect(workbench().dataset.stageIndex).toBe('0');
    expect(query('prev').disabled).toBe(true);
    await click(query('next'));
    expect(latest().cs_milestones).toEqual({ sarah: 1 });
    expect(workbench().dataset.stageKind).toBe('school');
    expect(query('pay').textContent).toBe('unpaid');
    expect(host.querySelector('[data-career-timeline-highlight="1"]')).toBeTruthy();
    expect(host.querySelector('[data-career-milestone-pick="1"]').getAttribute('aria-pressed')).toBe('true');
    expect(query('before').dataset.careerMilestoneBefore).toBe('other');
    expect(query('after').dataset.careerMilestoneAfter).toBe('weld');
    await pick(2);
    expect(query('next').disabled).toBe(true);
    expect(query('after').dataset.careerMilestoneAfter).toBe('current');
    expect(host.querySelector('[data-career-timeline-highlight="2"]')).toBeTruthy();
    await click(query('prev'));
    expect(workbench().dataset.stageIndex).toBe('1');
    expect(query('next').disabled).toBe(false);
  });

  it('remembers separate milestones across profile changes and leaves fit, compare and reflection state untouched', async () => {
    const latest = await mount({ cs_sel: 1, cs_q_want: 'steady', cs_q_school: 'cc', cs_q_place: 'small', car2_cmp: [1, 9], car2_reflect: 'My existing question.' });
    await pick(1);
    await click(profileButton('Mike H.,'));
    await pick(1);
    expect(workbench().dataset.stageKind).toBe('teach');
    await click(profileButton('Sarah K.,'));
    expect(workbench().dataset.stageIndex).toBe('1');
    expect(workbench().dataset.stageKind).toBe('school');
    expect(latest()).toMatchObject({ cs_milestones: { sarah: 1, mike: 1 }, cs_q_want: 'steady', cs_q_school: 'cc', cs_q_place: 'small', car2_cmp: [1, 9], car2_reflect: 'My existing question.' });
  });

  it('keeps comparison timelines on their common scale with no stray selected-stage highlights', async () => {
    const latest = await mount({ cs_sel: 1, cs_milestones: { sarah: 1 }, car2_cmp: [1, 9], car2_reflect: 'Keep this.' });
    await click(button('⚖ Compare two'));
    expect(workbench()).toBeNull();
    expect(host.querySelectorAll('[data-career-timeline]')).toHaveLength(2);
    expect(host.querySelector('[data-career-timeline-highlight]')).toBeNull();
    const firstPayPolygon = host.querySelector('[data-career-timeline="sarah"] polygon');
    expect(firstPayPolygon).toBeTruthy();
    expect(host.textContent).toContain('Both timelines share one age scale and one pay scale');
    await change(host.querySelector('#car2-cmp-0'), 2);
    expect(latest().car2_cmp).toEqual([2, 9]);
    expect(latest().cs_milestones).toEqual({ sarah: 1 });
    await click(button('📖 Browse all profiles'));
    expect(workbench().dataset.careerMilestone).toBe('sarah');
    expect(workbench().dataset.stageIndex).toBe('1');
    expect(host.querySelector('#car2-reflect').value).toBe('Keep this.');
  });

  it('retains the fit quiz reveal gate and its deterministic matches when milestones are present', () => {
    const incomplete = render({ cs_mode: 'fit', cs_q_want: 'steady', cs_milestones: { sarah: 1 } });
    expect(workbench(incomplete)).toBeNull();
    expect(incomplete.textContent).not.toContain('Your top matches');
    const answers = { want: 'steady', school: 'cc', place: 'small' };
    const ranked = core().car2RankFit(core().CAR2_PROFILES, answers).slice(0, 3);
    const complete = render({ cs_mode: 'fit', cs_q_want: answers.want, cs_q_school: answers.school, cs_q_place: answers.place, cs_milestones: { sarah: 1 } });
    expect(complete.textContent).toContain('Your top matches');
    expect(complete.textContent).toContain('match: ' + ranked[0].sc + '/7');
    expect(complete.querySelectorAll('button').length).toBeGreaterThan(3);
    expect(workbench(complete)).toBeNull();
  });

  it('focuses the existing reflection on request without replacing or appending its contents', async () => {
    const latest = await mount({ cs_sel: 1, car2_reflect: 'How did Sarah afford time in school?' });
    await pick(1);
    await click(query('reflect'));
    expect(document.activeElement).toBe(host.querySelector('#car2-reflect'));
    expect(latest().car2_reflect).toBe('How did Sarah afford time in school?');
    await change(host.querySelector('#car2-reflect'), 'I would ask about her transition.');
    expect(latest().car2_reflect).toBe('I would ask about her transition.');
    expect(latest().cs_milestones).toEqual({ sarah: 1 });
  });

  it('normalizes malformed saved milestones and never renders an out-of-range stage or chart highlight', () => {
    for (const value of ['junk', 999, -2, null, {}, []]) {
      const node = render({ cs_sel: 1, cs_milestones: { sarah: value, fake_profile: 100 } });
      expect(workbench(node).dataset.stageIndex).toBe('0');
      expect(node.querySelector('[data-career-timeline-highlight="0"]')).toBeTruthy();
      expect(workbench(node).innerHTML).not.toMatch(/NaN|Infinity|\[object Object\]/);
    }
    for (const raw of ['junk', ['sarah'], null]) expect(workbench(render({ cs_milestones: raw })).dataset.stageIndex).toBe('0');
  });

  it('keeps manual controls and the illustration readable under explicit contrast colours', () => {
    const node = render({ cs_sel: 1, cs_milestones: { sarah: 1 } }, true);
    expect(workbench(node).style.background).toBe('rgb(0, 0, 0)');
    expect(workbench(node).style.color).toBe('rgb(255, 255, 255)');
    expect(query('scene', node).style.background).toBe('rgb(0, 0, 0)');
    expect(node.querySelector('[data-career-timeline-highlight]').getAttribute('stroke')).toBe('#ffff00');
    for (const control of workbench(node).querySelectorAll('button')) {
      expect(control.tagName).toBe('BUTTON');
      expect(control.style.minHeight).toBe('44px');
      const selected = control.getAttribute('aria-pressed') === 'true';
      expect(control.style.background).toBe(selected ? 'rgb(255, 255, 0)' : 'rgb(0, 0, 0)');
      expect(control.style.color).toBe(selected ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)');
    }
  });
});
