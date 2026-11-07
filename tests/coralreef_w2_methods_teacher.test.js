import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, renderTool, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

// Wave 2: Survey methods in four tabbed parts with a one-at-a-time practice
// deck, and a teacher sequence that covers every section of the tool.
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let X, S;
beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'coralReef'); X = window.__RR_TEST_EXPORTS__.coralReef; S = window.__RR_TEST_EXPORTS__.coralReefSurvey; });
const dom = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d; };

const mounted = [];
afterEach(async () => { while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); } });
async function mount(seed) {
  let data = { coralReef: Object.assign({ section: 'methods' }, seed) };
  const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOMClient.createRoot(host);
  function Shell() { const [state, setState] = React.useState(data); data = state; return window.StemLab._registry.coralReef.render({ React, toolData: state, setToolData: setState, t: (k, f) => f || k }); }
  const t = { host, root, get data() { return data.coralReef; }, q: (s) => host.querySelector(s), all: (s) => [...host.querySelectorAll(s)] }; mounted.push(t);
  await React.act(async () => root.render(React.createElement(Shell))); return t;
}
const click = async (el) => { expect(el, 'control exists').toBeTruthy(); await React.act(async () => { el.focus(); el.click(); }); };
const key = async (el, k) => { await React.act(async () => { el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); }); };
const shownCard = (t) => t.all('[data-w2-pcard]').filter((c) => !c.hidden);

describe('survey methods in parts', () => {
  it('keeps every part, diagram and practice point in the page, one part shown', () => {
    const host = dom(renderTool('coralReef', { coralReef: { section: 'methods' } }));
    const tabs = [...host.querySelectorAll('[role="tab"]')].filter((b) => b.dataset.w2Mtab);
    expect(tabs.map((b) => b.dataset.w2Mtab)).toEqual(['bottom', 'fish', 'guide', 'practice']);
    const panels = [...host.querySelectorAll('[role="tabpanel"][data-w2-mpanel]')];
    expect(panels.map((p) => p.hidden)).toEqual([false, true, true, true]);
    for (const p of panels) expect(host.querySelector('#' + p.getAttribute('aria-labelledby')).getAttribute('aria-controls')).toBe(p.id);
    expect(host.querySelector('svg[aria-label^="Diagram from the side"]')).toBeTruthy();
    expect(host.querySelector('svg[aria-label^="Diagram from above"]')).toBeTruthy();
    expect(host.querySelectorAll('[data-w2-pcard]').length).toBe(8);
    expect(host.textContent).toContain('Indicator fish and what they tell you');
  });

  it('previews repeat transects with numbers from the survey code', () => {
    const site = X.siteById('reserve');
    const values = [0, 1, 2, 3, 4].map((k) => X.indicators(X.trueCover(X.buildTransect(site, S.simSeed(site, k, 0)))).liveCoral);
    const host = dom(renderTool('coralReef', { coralReef: { section: 'methods' } }));
    const box = host.querySelector('[data-w2-repeat]');
    expect(box.textContent).toContain(values.map((v) => v + '%').join(', '));
    expect(box.textContent).toContain('The whole reef has ' + S.siteTruth(site, 'live') + '%');
    expect(box.textContent).toContain('span ' + Math.min(...values) + '% to ' + Math.max(...values) + '%');
    // never the learner's own transects at that reef
    const own = [1, 2, 3, 4, 5].map((n) => X.indicators(X.trueCover(X.buildTransect(site, S.transectSeed(site, n)))).liveCoral);
    expect(values).not.toEqual(own);
  });

  it('moves between parts by keyboard and keeps the practice answers', async () => {
    const t = await mount({ practice: { 0: 'hard_coral' } });
    const tab = (id) => t.q('[data-w2-mtab="' + id + '"]');
    expect(tab('bottom').getAttribute('tabindex')).toBe('0'); expect(tab('fish').getAttribute('tabindex')).toBe('-1');
    tab('bottom').focus(); await key(tab('bottom'), 'ArrowRight');
    expect(t.data.w2MethodsPart).toBe('fish'); expect(document.activeElement).toBe(tab('fish'));
    expect(tab('fish').getAttribute('aria-selected')).toBe('true'); expect(t.q('[data-w2-mpanel="fish"]').hidden).toBe(false);
    await key(tab('fish'), 'End'); expect(t.data.w2MethodsPart).toBe('practice'); expect(document.activeElement).toBe(tab('practice'));
    await key(tab('practice'), 'ArrowRight'); expect(t.data.w2MethodsPart).toBe('bottom');
    await key(tab('bottom'), 'ArrowLeft'); expect(t.data.w2MethodsPart).toBe('practice');
    expect(t.data.practice).toEqual({ 0: 'hard_coral' });
    // "Next: ..." at the end of a part moves focus to the next part's heading
    await key(tab('practice'), 'Home');
    await click(t.q('[data-w2-mnext="fish"]'));
    expect(t.data.w2MethodsPart).toBe('fish'); expect(document.activeElement).toBe(t.q('#cr-w2-mh-fish'));
  });

  it('practice deck: one point at a time, first answer counts, progress kept', async () => {
    const t = await mount({ w2MethodsPart: 'practice', practice: { 0: 'hard_coral' } });
    expect(shownCard(t).map((c) => c.dataset.w2Pcard)).toEqual(['1']);
    const card = shownCard(t)[0];
    const truth = 'bleached_coral'; // practice point 2 is the bleached branching colony
    await click(card.querySelector('[data-cat="recently_dead_coral"]'));
    expect(t.data.practice).toEqual({ 0: 'hard_coral', 1: 'recently_dead_coral' });
    expect(document.activeElement).toBe(card.querySelector('[data-cat="recently_dead_coral"]'));
    await click(card.querySelector('[data-cat="' + truth + '"]'));
    expect(t.data.practice[1]).toBe('recently_dead_coral');
    expect(card.querySelector('[data-cat="' + truth + '"]').getAttribute('aria-disabled')).toBe('true');
    expect(card.textContent).toContain('Not quite: this is Bleached coral (alive).');
    await click(card.querySelector('[data-w2-next-point]'));
    expect(shownCard(t).map((c) => c.dataset.w2Pcard)).toEqual(['2']);
    expect(document.activeElement).toBe(shownCard(t)[0].querySelector('h4'));
    expect(document.activeElement.textContent).toBe('Practice point 3 of 8');
    // the strip names each point's state and jumps to it
    const strip = t.all('[data-w2-point]');
    expect(strip.length).toBe(8);
    expect(strip[0].getAttribute('aria-label')).toBe('Practice point 1: correct');
    expect(strip[1].getAttribute('aria-label')).toBe('Practice point 2: not quite');
    expect(strip[2].getAttribute('aria-current')).toBe('step');
    await click(strip[0]); expect(shownCard(t).map((c) => c.dataset.w2Pcard)).toEqual(['0']);
    // the Start page count keeps its meaning: answered points
    expect(Object.keys(t.data.practice).length).toBe(2);
    expect(t.q('[data-w2-mtab="practice"]').textContent).toContain('2 of 8 answered');
  });
});

describe('teacher sequence covers the whole tool', () => {
  it('names and opens every section of the tool, and lists every scenario', () => {
    const host = dom(renderTool('coralReef', { coralReef: { section: 'teacher' } }));
    const flow = host.querySelector('ol.cr-teacher-flow');
    const opens = [...flow.querySelectorAll('[data-w2-topen]')].map((b) => b.dataset.w2Topen);
    // every section a student uses (all but the Start page and this page)
    const nav = [...host.querySelectorAll('nav.cr-nav button')].map((b) => b.textContent);
    expect(nav.length).toBe(9);
    for (const id of ['explore', 'guide', 'methods', 'survey', 'compare', 'science', 'model']) expect(opens, id).toContain(id);
    const steps = [...flow.children];
    expect(steps.map((li) => li.dataset.w2Tstep)).toEqual(['explore', 'methods', 'survey', 'compare', 'science', 'model']);
    for (const li of steps) {
      const terms = [...li.querySelectorAll('dt')].map((d) => d.textContent);
      expect(terms, li.dataset.w2Tstep).toEqual(['Students', 'Goal', 'Ask']);
      expect(li.querySelector('.w2-ttime').textContent, li.dataset.w2Tstep).toMatch(/minutes/);
    }
    const last = steps[steps.length - 1];
    expect([...last.querySelectorAll('ul > li')].length).toBe(X.SCENARIOS.length);
    const text = host.textContent;
    for (const code of ['MS-LS2-1', 'MS-LS2-2', 'MS-LS2-3', 'MS-LS2-4', 'MS-LS2-5', 'MS-ESS3-3', 'HS-LS2-2', 'HS-LS2-6', 'HS-LS2-7']) expect(text, code).toContain(code);
    for (const m of ['"Bleached coral is dead."', '"One survey tells you how the whole reef is doing."', '"A model run is a forecast."']) expect(text, m).toContain(m);
    expect(text).toContain('Run it ' + window.__RR_TEST_EXPORTS__.coralReefModel.MDL_RUNS + ' times');
  });
});
