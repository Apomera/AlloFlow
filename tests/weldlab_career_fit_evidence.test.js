import { stripWeldlabWcagFixes } from './helpers/weldlab_wcag_restore.js';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { stripStoryAgeProbe } from './helpers/weldlab_story_age_restore.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const baseline = JSON.parse(readFileSync(resolve('tests/fixtures/weldlab-career-fit-baseline.json'), 'utf8'));
const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const BASE = { view: 'careerStories', cs_mode: 'fit' };
const ANSWERS = { want: ['steady', 'creative', 'top_pay', 'helping'], school: ['fast', 'cc', 'apprentice', 'bachelor'], place: ['big', 'small', 'self', 'outdoor'] };
const DEFAULT = { want: 'steady', school: 'cc', place: 'big' };
const LABELS = {
  want: { steady: 'Steady work, great benefits', creative: 'Hands-on creative work, no boss', top_pay: 'Highest pay even if I travel', helping: 'Help or teach others' },
  school: { fast: 'Start working ASAP after HS', cc: '~2 years of community college', apprentice: 'Paid apprenticeship (3-5 yrs)', bachelor: '4-year bachelor\'s degree' },
  place: { big: 'Big shipyard or factory', small: 'Small shop or boatyard', self: 'My own truck, my own customers', outdoor: 'Outdoor, varied locations' },
};
const answerState = a => ({ cs_q_want: a.want, cs_q_school: a.school, cs_q_place: a.place });
const combinations = () => ANSWERS.want.flatMap(want => ANSWERS.school.flatMap(school => ANSWERS.place.map(place => ({ want, school, place }))));
const core = () => window.__WeldLabCore;
const ranked = a => core().car2RankFit(core().CAR2_PROFILES, a);
const panel = (node = host) => node.querySelector('[data-career-fit-evidence]');
const n = (node, attr) => Number(node.getAttribute(attr));
let host, root;

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
function render(extra = {}, contrast = false) {
  const node = document.createElement('div');
  node.innerHTML = renderTool('weldLab', { weldLab: { ...BASE, ...extra } }, { isContrast: contrast });
  return node;
}
async function mount(extra = {}, contrast = false) {
  let latest;
  const writes = [];
  function App() {
    const [data, setData] = React.useState({ weldLab: { ...BASE, ...extra } });
    latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({
      toolData: data, setToolData: setData, isContrast: contrast,
      update: (bucket, key, value) => { writes.push([key, value]); setData(prev => ({ ...prev, [bucket]: { ...prev[bucket], [key]: value } })); },
    }));
  }
  host = document.createElement('div');
  document.body.append(host);
  root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App)));
  return { latest: () => latest, writes };
}
async function click(node) { expect(node).toBeTruthy(); await React.act(() => node.click()); }
async function change(node, value) { expect(node).toBeTruthy(); await React.act(() => Simulate.change(node, { target: { value } })); }
const button = text => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === text);
async function choose(dim, value) { await click([...host.querySelectorAll('button')].find(node => /^[○●]/.test(node.textContent) && node.textContent.includes(LABELS[dim][value]))); }

function checkGeometry(node, match, answer) {
  const bench = panel(node), profile = core().CAR2_PROFILES[match.i];
  expect(bench.dataset.careerFitEvidence).toBe(match.id);
  expect(n(bench, 'data-score')).toBe(match.sc);
  let sum = 0;
  for (const dim of ['want', 'school', 'place']) {
    const max = baseline.weights[dim], points = profile.tags[dim].includes(answer[dim]) ? max : 0;
    const track = bench.querySelector(`[data-fit-lane="${dim}"]`), fill = bench.querySelector(`[data-fit-contribution="${dim}"]`);
    expect(n(track, 'x')).toBe(140);
    expect(n(track, 'width')).toBe(max * 72);
    expect(n(fill, 'x')).toBe(140);
    expect(n(fill, 'width')).toBe(points * 72);
    expect(n(fill, 'data-points')).toBe(points);
    expect(n(fill, 'data-max')).toBe(max);
    expect(n(fill, 'height')).toBe(n(track, 'height'));
    const reading = bench.querySelector(`[data-fit-reading="${dim}"]`);
    expect(reading.textContent).toContain(LABELS[dim][answer[dim]]);
    profile.tags[dim].forEach(tag => expect(reading.textContent).toContain(LABELS[dim][tag]));
    expect(reading.querySelector('[data-fit-html-points]').textContent).toBe(`${points ? 'Match' : 'No match'}: ${points} / ${max}`);
    sum += points;
  }
  expect(sum).toBe(match.sc);
  const total = bench.querySelector('[data-fit-total]');
  expect(n(total, 'x')).toBe(140);
  expect(n(total, 'width')).toBe(sum * 72);
  expect(n(bench.querySelector('[data-fit-total-track]'), 'width')).toBe(7 * 72);
  expect(bench.querySelector('[data-fit-html-total]').textContent).toBe(['want', 'school', 'place'].map(dim => profile.tags[dim].includes(answer[dim]) ? baseline.weights[dim] : 0).join(' + ') + ` = ${sum} / 7`);
  const ticks = [...bench.querySelectorAll('[data-fit-point-tick]')];
  expect(ticks).toHaveLength(8);
  ticks.forEach((tick, i) => { expect(n(tick.querySelector('line'), 'x1')).toBe(140 + i * 72); expect(tick.querySelector('text').textContent).toBe(String(i)); });
}
function checkTie(bench, selected, ranking) {
  const detail = bench.querySelector('[data-fit-tie-detail]');
  if (!selected.tieBreak) { expect(detail).toBeNull(); return; }
  expect(detail.dataset.fitTieDetail).toBe(selected.tieBreak);
  const peer = ranking.find(match => match.id === selected.nextId);
  expect(peer.sc).toBe(selected.sc);
  expect([...detail.querySelectorAll('[data-fit-tie-profile]')].map(node => node.dataset.fitTieProfile)).toEqual([selected.id, peer.id]);
  for (const match of [selected, peer]) {
    const card = detail.querySelector(`[data-fit-tie-profile="${match.id}"]`), profile = core().CAR2_PROFILES[match.i];
    let sum = 0;
    for (const dim of ['want', 'school', 'place']) {
      const row = card.querySelector(`[data-fit-tie-term="${dim}"]`), hit = match.hits.includes(dim), count = profile.tags[dim].length, term = hit ? 1 / count : 0;
      expect(n(row, 'data-tag-count')).toBe(count);
      expect(n(row, 'data-value')).toBe(term);
      expect(row.dataset.matched).toBe(String(hit));
      profile.tags[dim].forEach(tag => expect(row.textContent).toContain(LABELS[dim][tag]));
      sum += term;
    }
    expect(Math.round(sum * 1000) / 1000).toBe(match.close);
    expect(card.querySelector('[data-fit-tie-sum]').textContent).toContain(match.close.toFixed(3));
  }
  if (selected.tieBreak === 'alpha') expect(detail.querySelector('[data-fit-tie-alpha]').textContent).toBe(`${selected.id} < ${peer.id}`);
  else expect(detail.querySelector('[data-fit-tie-alpha]')).toBeNull();
}

describe('Career Fit contribution evidence', () => {
  it('uses exact original3+2+2 scores and common72px/point geometry for all64 answer combinations', () => {
    const cases = combinations();
    expect(cases).toHaveLength(64);
    const seenPoints = new Set(), seenTies = new Set();
    for (const answer of cases) {
      const ranking = ranked(answer), node = render(answerState(answer)), bench = panel(node);
      checkGeometry(node, ranking[0], answer);
      checkTie(bench, ranking[0], ranking);
      const options = [...bench.querySelector('select').options];
      expect(options.map(option => option.value)).toEqual(ranking.slice(0, 3).map(match => match.id));
      options.forEach((option, i) => expect(option.textContent).toContain(`${ranking[i].sc}/7`));
      for (const fill of bench.querySelectorAll('[data-fit-contribution]')) seenPoints.add(n(fill, 'data-points'));
      if (ranking[0].tieBreak) seenTies.add(ranking[0].tieBreak);
    }
    expect([...seenPoints].sort()).toEqual([0, 2, 3]);
    expect([...seenTies].sort()).toEqual(['alpha', 'closer']);
  });

  it('inspects all three actual top results without writing quiz scores, answers, comparison, milestones or reflection', async () => {
    const saved = { ...answerState(DEFAULT), car2_cmp: [2, 9], car2_reflect: 'Ask about the daily work.', cs_milestones: { sarah: 1 }, cs_sel: 4 };
    const app = await mount(saved), ranking = ranked(DEFAULT);
    for (const match of ranking.slice(0, 3)) {
      await change(panel().querySelector('[data-fit-inspect]'), match.id);
      checkGeometry(host, match, DEFAULT);
      checkTie(panel(), match, ranking);
      expect(panel().querySelector('[data-fit-context]').open).toBe(false);
      expect(panel().querySelector('[data-fit-context]').dataset.fitContext).toBe(match.id);
    }
    const last = panel().dataset.careerFitEvidence;
    await change(panel().querySelector('[data-fit-inspect]'), '__proto__');
    expect(panel().dataset.careerFitEvidence).toBe(last);
    expect(app.latest()).toEqual({ ...BASE, ...saved });
    expect(app.writes).toHaveLength(0);
    expect(host.querySelector('#car2-reflect').value).toBe(saved.car2_reflect);
  });

  it('preserves both original tie-break types and traces the fourth-ranked peer when inspecting result three', async () => {
    const cases = combinations();
    const fourth = cases.map(answer => ({ answer, ranking: ranked(answer) })).find(({ ranking }) => ranking[2].tieBreak && ranking[2].nextId === ranking[3].id);
    expect(fourth).toBeTruthy();
    await mount(answerState(fourth.answer));
    await change(panel().querySelector('[data-fit-inspect]'), fourth.ranking[2].id);
    checkTie(panel(), fourth.ranking[2], fourth.ranking);
    expect([...panel().querySelector('[data-fit-inspect]').options].map(option => option.value)).not.toContain(fourth.ranking[3].id);
    expect(panel().querySelector(`[data-fit-tie-profile="${fourth.ranking[3].id}"]`)).toBeTruthy();
    const note = panel().querySelector('[data-fit-tie-note]').textContent;
    expect([...host.querySelectorAll('div')].some(node => !panel().contains(node) && node.textContent === note)).toBe(true);
  });

  it('keeps arithmetic hidden until all three real answers and removes it on the existing reset', async () => {
    const app = await mount({ cs_q_want: 'steady', cs_q_school: 'cc', car2_reflect: 'Keep this question.' });
    expect(panel()).toBeNull();
    expect(host.textContent).not.toContain('Your top matches');
    await choose('place', 'big');
    expect(panel()).toBeTruthy();
    expect(host.textContent).toContain('Your top matches');
    await change(panel().querySelector('[data-fit-inspect]'), ranked(DEFAULT)[2].id);
    await click(button('↺ Start over'));
    expect(panel()).toBeNull();
    expect(host.textContent).not.toContain('Your top matches');
    expect(app.latest()).toMatchObject({ cs_q_want: null, cs_q_school: null, cs_q_place: null, car2_reflect: 'Keep this question.' });
    expect(app.writes.every(([key]) => ['cs_q_want', 'cs_q_school', 'cs_q_place'].includes(key))).toBe(true);
    for (const dim of ['want', 'school', 'place']) { await choose(dim, DEFAULT[dim]); if (dim !== 'place') expect(panel()).toBeNull(); }
    expect(panel()).toBeTruthy();
  });

  it('normalizes selection when new answers remove its profile from the top three while retaining the original result order', async () => {
    await mount(answerState(DEFAULT));
    const selected = ranked(DEFAULT)[2];
    await change(panel().querySelector('[data-fit-inspect]'), selected.id);
    const next = combinations().find(answer => !ranked(answer).slice(0, 3).some(match => match.id === selected.id));
    expect(next).toBeTruthy();
    for (const dim of ['want', 'school', 'place']) await choose(dim, next[dim]);
    const expected = ranked(next);
    checkGeometry(host, expected[0], next);
    expect([...panel().querySelector('select').options].map(option => option.value)).toEqual(expected.slice(0, 3).map(match => match.id));
  });

  it('uses complete original voice and advice as collapsed context for every one of the14 profiles', async () => {
    const found = new Map();
    for (const answer of combinations()) for (const match of ranked(answer).slice(0, 3)) if (!found.has(match.id)) found.set(match.id, { answer, match });
    expect([...found.keys()].sort()).toEqual(baseline.profileIds.slice().sort());
    for (const [id, { answer, match }] of found) {
      if (root) { await React.act(() => root.unmount()); root = null; host.remove(); }
      await mount(answerState(answer));
      await change(panel().querySelector('[data-fit-inspect]'), id);
      const contextVoice = panel().querySelector('[data-fit-context-voice]').textContent;
      const contextAdvice = panel().querySelector('[data-fit-context-advice]').textContent;
      expect(panel().querySelector('[data-fit-context]').open).toBe(false);
      const resultIndex = ranked(answer).slice(0, 3).findIndex(result => result.id === id);
      await click([...host.querySelectorAll('button')].filter(node => node.textContent.trim() === 'Read full profile →')[resultIndex]);
      expect(panel()).toBeNull();
      const voice = host.querySelector('p.italic'), advice = host.querySelector('.bg-amber-50.border-l-4 > p');
      expect(voice).toBeTruthy();
      expect(advice).toBeTruthy();
      expect(contextVoice).toBe(voice.textContent);
      expect(contextAdvice).toBe(advice.previousElementSibling.textContent + ': ' + advice.textContent);
    }
  });

  it('keeps the explorer absent from browse/compare and leaves those existing selections and reflection intact', async () => {
    const app = await mount({ ...answerState(DEFAULT), cs_sel: 1, car2_cmp: [2, 9], cs_milestones: { sarah: 1 }, car2_reflect: 'Original reflection.' });
    await change(panel().querySelector('[data-fit-inspect]'), ranked(DEFAULT)[2].id);
    await click(button('⚖ Compare two'));
    expect(panel()).toBeNull();
    expect(host.querySelectorAll('[data-career-timeline]')).toHaveLength(2);
    expect(host.textContent).toContain('Both timelines share one age scale and one pay scale');
    await click(button('📖 Browse all profiles'));
    expect(panel()).toBeNull();
    expect(host.querySelector('[data-career-milestone]').dataset.careerMilestone).toBe('sarah');
    expect(host.querySelector('[data-career-milestone]').dataset.stageIndex).toBe('1');
    expect(host.querySelector('#car2-reflect').value).toBe('Original reflection.');
    expect(app.latest()).toMatchObject({ car2_cmp: [2, 9], cs_sel: 1, cs_milestones: { sarah: 1 }, car2_reflect: 'Original reflection.', ...answerState(DEFAULT) });
    expect(app.writes.every(([key]) => key === 'cs_mode')).toBe(true);
  });

  it.each([false, true])('uses native44px controls, full HTML arithmetic, strong focus and explicit contrast (contrast=%s)', contrast => {
    const node = render(answerState(DEFAULT), contrast), bench = panel(node), select = bench.querySelector('select');
    expect(select.tagName).toBe('SELECT');
    expect(parseInt(select.style.minHeight)).toBeGreaterThanOrEqual(44);
    expect(bench.querySelector(`label[for="${select.id}"]`).textContent).toBeTruthy();
    expect(bench.style.background).toBe(contrast ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)');
    expect(bench.style.color).toBe(contrast ? 'rgb(255, 255, 255)' : 'rgb(15, 23, 42)');
    expect(select.style.background).toBe(bench.style.background);
    for (const summary of bench.querySelectorAll('summary')) expect(parseInt(summary.style.minHeight)).toBeGreaterThanOrEqual(44);
    expect(bench.querySelector('style').textContent).toContain(`:focus-visible{outline:3px solid ${contrast ? '#ffff00' : '#86198f'}!important;outline-offset:3px}`);
    expect(bench.querySelector('style').textContent).toContain('transition:none!important;animation:none!important');
    const svg = bench.querySelector('svg');
    expect(svg.getAttribute('viewBox')).toBe('0 0 720 292');
    expect(svg.getAttribute('aria-label')).toContain('Full answers and tags follow.');
    expect(svg.style.width).toBe('100%');
    expect(svg.style.height).toBe('auto');
    for (const text of svg.querySelectorAll('text')) expect(n(text, 'font-size')).toBeGreaterThanOrEqual(32);
    expect(bench.querySelector('[data-fit-html-total]').getAttribute('aria-live')).toBe('polite');
    expect(bench.querySelectorAll('[data-fit-reading]')).toHaveLength(3);
    expect(bench.querySelectorAll('animate,animateTransform,canvas')).toHaveLength(0);
  });

  it('restores all original CareerStories profiles, prose, ranking, result cards and saved fields by removing only the additive hook/helper/call', () => {
    const source = stripWeldlabWcagFixes(readFileSync(resolve(SRC), 'utf8'));
    const start = source.indexOf('function CareerStories('), end = source.indexOf('      // overlay so the toast', start);
    let region = source.slice(start, end);
    // Reverse only the later shared-age additions before the original Fit proof.
    region = stripStoryAgeProbe(region);
    const hook = "        var fitEvidenceState = useState('');\n", call = '                renderFitEvidenceExplorer(),\n';
    expect(region.split(hook)).toHaveLength(2);
    region = region.replace(hook, '');
    const a = region.indexOf('        function renderFitEvidenceExplorer() {'), b = region.indexOf('        function renderCompare() {', a);
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(a);
    region = region.slice(0, a) + region.slice(b);
    expect(region.split(call)).toHaveLength(2);
    region = region.replace(call, '');
    expect(createHash('sha256').update(region).digest('hex')).toBe(baseline.careerStoriesSha256);
  });
});
