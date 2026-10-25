import { stripWeldlabWcagFixes } from './helpers/weldlab_wcag_restore.js';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { stripStoryAgeProbe } from './helpers/weldlab_story_age_restore.js';
const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const BASE = { view: 'careerStories', cs_mode: 'compare', car2_cmp: [1, 9] };
let host, root;
const core = () => window.__WeldLabCore;
const controls = (node = host) => node.querySelector('[data-career-age-controls]');
const num = (node, name) => Number(node.getAttribute(name));
const marker = id => host.querySelector(`[data-career-age-marker="${id}"]`);
const reading = id => host.querySelector(`[data-career-age-reading="${id}"]`);
const named = text => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === text);
const sourceRegion = () => { const source = readFileSync(resolve(SRC), 'utf8').replace(/\r\n/g, '\n'); return source.slice(source.indexOf('function CareerStories('), source.indexOf('      // overlay so the toast', source.indexOf('function CareerStories('))); };
function pureHelper(name, next) {
  const source = sourceRegion(), start = source.indexOf('        function ' + name + '('), end = source.indexOf('        function ' + next + '(', start);
  expect(start).toBeGreaterThan(0); expect(end).toBeGreaterThan(start);
  return runInNewContext('(' + source.slice(start, end).trim() + ')', {}, { timeout: 100 });
}
beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; delete window.__alloflowWeldLab; localStorage.clear(); resetStemLab(); loadTool(SRC, 'weldLab'); });
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; host?.remove(); host = null; });
function render(extra = {}, contrast = false) { const node = document.createElement('div'); node.innerHTML = renderTool('weldLab', { weldLab: { ...BASE, ...extra } }, { isContrast: contrast }); return node; }
async function mount(extra = {}, contrast = false) {
  let latest; const writes = [];
  function App() {
    const [data, setData] = React.useState({ weldLab: { ...BASE, ...extra } }); latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({ toolData: data, setToolData: setData, isContrast: contrast,
      update: (tool, key, value) => { writes.push([key, value]); setData(prev => ({ ...prev, [tool]: { ...prev[tool], [key]: value } })); }
    }));
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App))); return { latest: () => latest, writes };
}
async function click(node) { expect(node).toBeTruthy(); await React.act(() => node.click()); }
async function change(node, value) { expect(node).toBeTruthy(); await React.act(() => Simulate.change(node, { target: { value } })); }
async function age(value) { await change(controls().querySelector('[data-career-age-slider]'), String(value)); }
function originalChartChildren(svg) { const copy = svg.cloneNode(true); copy.querySelector('[data-career-age-marker]')?.remove(); return copy.innerHTML; }
function expectedStage(profile, age) {
  if (age < profile.segs[0].from) return { state: 'before', index: -1 };
  if (age > profile.age) return { state: 'after', index: -1 };
  if (age === profile.age) return { state: 'endpoint', index: profile.segs.length - 1 };
  return { state: 'stage', index: profile.segs.findIndex(stage => stage.from <= age && age < stage.to) };
}
function assertPair(pair, ageValue) {
  const profiles = pair.map(index => core().CAR2_PROFILES[index]), a0 = Math.min(...profiles.map(profile => profile.segs[0].from)), a1 = Math.max(...profiles.map(profile => profile.age));
  const x = 54 + (ageValue - a0) / Math.max(1, a1 - a0) * 354;
  expect(num(controls(), 'data-age')).toBe(ageValue); expect(num(controls(), 'data-min')).toBe(a0); expect(num(controls(), 'data-max')).toBe(a1);
  profiles.forEach(profile => {
    const result = expectedStage(profile, ageValue), mark = marker(profile.id), output = reading(profile.id), svg = mark.closest('svg');
    for (const node of [mark, output]) { expect(num(node, 'data-age')).toBe(ageValue); expect(node.dataset.state).toBe(result.state); expect(num(node, 'data-stage-index')).toBe(result.index); }
    expect(svg.getAttribute('viewBox')).toBe('0 0 420 200'); expect(num(mark.querySelector('line'), 'x1')).toBeCloseTo(x, 12); expect(num(mark.querySelector('line'), 'x2')).toBeCloseTo(x, 12);
    expect(num(mark.querySelector('line'), 'y1')).toBe(14); expect(num(mark.querySelector('line'), 'y2')).toBe(170); expect(num(mark.querySelector('circle'), 'cx')).toBeCloseTo(x, 12);
    expect(x).toBeGreaterThanOrEqual(54); expect(x).toBeLessThanOrEqual(408);
    if (result.index < 0) {
      expect(output.querySelector('[data-career-age-pay],[data-career-age-kind],[data-career-age-span]')).toBeNull(); expect(output.querySelector('[data-career-age-outside]')).toBeTruthy();
      expect(output.textContent).toContain('No stage is recorded here.');
    } else {
      const stage = profile.segs[result.index], span = output.querySelector('[data-career-age-span]'); expect(output.querySelector('[data-career-age-kind]').dataset.careerAgeKind).toBe(stage.kind);
      expect(num(span, 'data-from')).toBe(stage.from); expect(num(span, 'data-to')).toBe(stage.to); expect(span.textContent).toContain(`(${stage.to - stage.from} years)`);
      const legend = [...svg.parentElement.querySelectorAll('ol li')][result.index].textContent;
      const pay = output.querySelector('[data-career-age-pay]').textContent.replace('Whole-stage pay context: ', ''); expect(legend).toContain(pay);
      expect(!!output.querySelector('[data-career-age-endpoint]')).toBe(result.state === 'endpoint');
    }
  });
}

describe('Career Stories same-age comparison probe', () => {
  it('selects half-open stages at every original profile boundary and explicitly separates endpoints and unrecorded ages using only the extracted pure helper', () => {
    const select = pureHelper('storyAgeStage', 'storyProbeAge'); expect(core().CAR2_PROFILES).toHaveLength(14);
    for (const profile of core().CAR2_PROFILES) {
      expect(select(profile, profile.segs[0].from - 0.25)).toEqual({ state: 'before', index: -1 });
      profile.segs.forEach((stage, index) => {
        expect(select(profile, stage.from)).toEqual({ state: 'stage', index }); expect(select(profile, (stage.from + stage.to) / 2)).toEqual({ state: 'stage', index });
        expect(select(profile, stage.to - 0.25)).toEqual({ state: 'stage', index });
        expect(select(profile, stage.to)).toEqual(index === profile.segs.length - 1 ? { state: 'endpoint', index } : { state: 'stage', index: index + 1 });
      });
      expect(select(profile, profile.age + 0.25)).toEqual({ state: 'after', index: -1 });
    }
  });

  it('derives sorted unique navigation boundaries from the two existing profiles without inventing intermediate milestones', () => {
    const boundaries = pureHelper('storyAgeBoundaries', 'renderCompareAgeControls'), profiles = core().CAR2_PROFILES;
    expect(Array.from(boundaries(profiles[4], profiles[9]))).toEqual([16, 18, 20, 22, 23, 55, 58]);
    expect(Array.from(boundaries(profiles[1], profiles[1]))).toEqual([18, 24, 26, 34]);
  });

  it.each([
    { pair: [1, 9], ages: [18, 20, 24, 26, 34, 34.25, 55, 58] },
    { pair: [4, 10], ages: [16, 18, 19, 22, 22.25, 23] }
  ])('links the existing charts and whole-stage readings at critical ages for $pair while preserving every old chart child', async ({ pair, ages }) => {
    await mount({ car2_cmp: pair }); const original = [...host.querySelectorAll('[data-career-timeline]')].map(originalChartChildren);
    expect(host.querySelector('[data-career-age-comparison]')).toBeTruthy();
    for (const value of ages) { await age(value); assertPair(pair, value); expect([...host.querySelectorAll('[data-career-timeline]')].map(originalChartChildren)).toEqual(original); }
    expect(controls().textContent).toContain('whole-stage range or amount, not pay at the selected age');
  });

  it('provides bounded quarter-year range and exact previous/next union-boundary controls with safe malformed-event handling', async () => {
    await mount({ car2_cmp: [4, 9] }); const input = controls().querySelector('input'); expect(input.step).toBe('0.25');
    await age(16); expect(controls().querySelector('[data-career-age-prev]').disabled).toBe(true);
    for (const target of [18, 20, 22, 23, 55, 58]) { await click(controls().querySelector('[data-career-age-next]')); assertPair([4, 9], target); }
    expect(controls().querySelector('[data-career-age-next]').disabled).toBe(true); await click(controls().querySelector('[data-career-age-prev]')); assertPair([4, 9], 55);
    for (const invalid of ['', ' ', null, undefined, {}, [], 'bad', 'Infinity']) { await change(input, invalid); assertPair([4, 9], 55); }
    await age(19.62); assertPair([4, 9], 19.5); await age(-100); assertPair([4, 9], 16); await age(100); assertPair([4, 9], 58);
  });

  it('keeps cursor exploration local with zero saved writes and preserves actual pair changes, clamping and same-profile comparisons', async () => {
    const app = await mount({ car2_cmp: [1, 9], cs_sel: 1, cs_milestones: { sarah: 1 }, car2_reflect: 'Keep this question.', cs_q_want: 'steady', cs_q_school: 'cc', cs_q_place: 'small' });
    const snapshot = JSON.stringify(app.latest()), count = app.writes.length; for (const value of [24, 26, 34.25, 55]) await age(value);
    expect(JSON.stringify(app.latest())).toBe(snapshot); expect(app.writes.length - count).toBe(0);
    await change(host.querySelector('#car2-cmp-0'), '0'); await change(host.querySelector('#car2-cmp-1'), '4');
    expect(app.latest().car2_cmp).toEqual([0, 4]); assertPair([0, 4], 24);
    await change(host.querySelector('#car2-cmp-1'), '0'); expect(app.latest().car2_cmp).toEqual([0, 0]);
    expect(host.querySelectorAll('[data-career-age-marker="marcus"]')).toHaveLength(2); expect(host.querySelectorAll('[data-career-age-reading="marcus"]')).toHaveLength(2);
    expect(app.writes.slice(count).every(([key]) => key === 'car2_cmp')).toBe(true);
    expect(app.latest()).toMatchObject({ cs_sel: 1, cs_milestones: { sarah: 1 }, car2_reflect: 'Keep this question.', cs_q_want: 'steady', cs_q_school: 'cc', cs_q_place: 'small' });
  });

  it('leaves Browse milestones and reflections intact and adds no marker to the original full-size timeline', async () => {
    const app = await mount({ cs_sel: 1, cs_milestones: { sarah: 1 }, car2_reflect: 'Original reflection.' }); await age(26);
    await click(named('📖 Browse all profiles')); expect(controls()).toBeNull(); expect(host.querySelector('[data-career-age-marker],[data-career-age-reading]')).toBeNull();
    expect(host.querySelector('[data-career-milestone]').dataset.stageIndex).toBe('1'); expect(host.querySelector('[data-career-timeline-highlight="1"]')).toBeTruthy(); expect(host.querySelector('#car2-reflect').value).toBe('Original reflection.');
    await click(host.querySelector('[data-career-milestone-next]')); expect(app.latest().cs_milestones).toEqual({ sarah: 2 });
    await change(host.querySelector('#car2-reflect'), 'Edited reflection.'); await click(named('⚖ Compare two')); assertPair([1, 9], 26);
    expect(app.latest().car2_reflect).toBe('Edited reflection.'); expect(app.latest().cs_milestones).toEqual({ sarah: 2 });
  });

  it('preserves all profile/pay data and the incomplete Fit reveal, deterministic rank and actual reset flow', async () => {
    expect(createHash('sha256').update(JSON.stringify(core().CAR2_PROFILES)).digest('hex')).toBe('117ffe09ccdff1d42f92cc6331f6be12dbff1a857631729ed07021199d23f1f0');
    const app = await mount({ cs_q_want: 'steady', cs_q_school: 'cc', car2_reflect: 'Keep.' }); await age(34); await click(named('🎯 Find Your Fit'));
    expect(controls()).toBeNull(); expect(host.querySelector('[data-career-age-marker]')).toBeNull(); expect(host.textContent).not.toContain('Your top matches');
    const place = [...host.querySelectorAll('button')].find(node => /^[○●]/.test(node.textContent) && node.textContent.includes('Small shop or boatyard')); await click(place);
    const ranked = core().car2RankFit(core().CAR2_PROFILES, { want: 'steady', school: 'cc', place: 'small' });
    expect(host.querySelector('[data-career-fit-evidence]').dataset.careerFitEvidence).toBe(ranked[0].id); expect(app.latest().cs_q_place).toBe('small');
    await click(named('↺ Start over')); expect(host.textContent).not.toContain('Your top matches'); expect(app.latest()).toMatchObject({ cs_q_want: null, cs_q_school: null, cs_q_place: null, car2_reflect: 'Keep.' });
  });

  it.each([false, true])('provides native44px controls, full HTML stage context and explicit focus/marker contrast without adding small SVG text (contrast=%s)', contrast => {
    const node = render({}, contrast), panel = controls(node), input = panel.querySelector('input'), mark = node.querySelector('[data-career-age-marker]');
    expect(panel.style.color).toBe(contrast ? 'rgb(255, 255, 255)' : 'rgb(15, 23, 42)'); expect(panel.style.background).toBe(contrast ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)'); expect(parseInt(input.style.minHeight)).toBeGreaterThanOrEqual(44); expect(input.closest('label').classList.contains('text-base')).toBe(true);
    for (const button of panel.querySelectorAll('button')) { expect(button.type).toBe('button'); expect(parseInt(button.style.minHeight)).toBeGreaterThanOrEqual(44); expect(button.style.fontSize).toBe('16px'); }
    const output = node.querySelector('[data-career-age-reading]'); expect(output.classList.contains('text-base')).toBe(true); expect(output.getAttribute('aria-live')).toBe('polite'); expect(mark.querySelector('text')).toBeNull();
    expect(mark.querySelector('line').getAttribute('stroke')).toBe(contrast ? '#ffff00' : '#67e8f9'); expect(panel.querySelector('style').textContent).toContain(`outline:3px solid ${contrast ? '#ffff00' : '#86198f'}!important`);
    expect(panel.querySelector('style').textContent).toContain('transition:none!important;animation:none!important');
    expect(node.querySelector('[data-career-timeline]').getAttribute('viewBox')).toBe('0 0 420 200'); expect(node.querySelectorAll('[data-career-timeline] text[font-size="14"]').length).toBeGreaterThan(0);
    expect(node.querySelector('[data-career-age-comparison]').className).toBe('space-y-4');
  });

  it('reverses only this round’s additions to recover all original career prose, profiles, chart children, pay functions and gates exactly', () => {
    const region = stripWeldlabWcagFixes(sourceRegion()), restored = stripStoryAgeProbe(region);
    expect(restored).not.toBe(region); expect(createHash('sha256').update(restored).digest('hex')).toBe('46595a07c907e3cb9ba4a5e8277d105f54673e28c502454778dd5d3491e2f057');
    const helpers = region.slice(region.indexOf('        function storyAgeStage('), region.indexOf('        function renderCompare() {'));
    expect(helpers).not.toMatch(/usePersisted|\bupd\(|\bsetCmp\(|\bsetQWant\(|\bsetQSchool\(|\bsetQPlace\(|\bsetMilestones\(|\bsetReflect\(|requestAnimationFrame|setTimeout|setInterval|car2SegK\(/);
    expect(region.match(/var storyAgeState = useState\(18\);/g)).toHaveLength(1);
  });
});
