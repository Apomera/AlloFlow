import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';

// Round 19 pedagogy: an "I can" goal, a short spaced check and picture words at the top of each
// major section; next-step feedback on a wrong practice point; sentence starters in the claim
// builder; and a closing look back in My reef report. Nothing typed or answered is saved, the
// check gives nothing away before a pick, and every number comes from the lab's own functions.

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
let loadTool, resetStemLab, React, ReactDOMClient, X;
beforeAll(async () => {
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ loadTool, resetStemLab, React, ReactDOMClient } = mod);
  window.__RR_TEST_EXPORTS__ = {};
  resetStemLab(); loadTool(TOOL, 'coralReef');
  X = window.__RR_TEST_EXPORTS__;
});

const mounted = [];
afterEach(async () => {
  while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); }
});
async function mount(seed = {}) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const cfg = window.StemLab._registry.coralReef;
  const box = { data: null };
  function Shell() {
    const [toolData, setToolData] = React.useState({ coralReef: { ...seed } });
    box.data = toolData.coralReef;
    return cfg.render({ React, toolData, setToolData, t: (k, f) => f || k, announceToSR() {} });
  }
  mounted.push({ host, root });
  await React.act(async () => root.render(React.createElement(Shell)));
  return { host, box };
}
async function click(el) { await React.act(async () => { el.click(); }); }
async function type(el, value) {
  const set = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  await React.act(async () => { set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); });
}

// Two reefs, two transects at the first: enough to open the claim builder.
function savedLog() {
  const C = X.coralReef;
  const sites = C.SITES.map((s) => s.id).filter((id) => id !== 'model');
  const entry = (siteId, seed, transect, nLive) => {
    const records = {};
    for (let i = 0; i < C.constants.POINT_COUNT; i++) records[i] = i < nLive ? 'hard_coral' : 'sand';
    const cover = C.coverFromRecords(records, C.constants.POINT_COUNT);
    return { id: siteId + ':' + seed + ':', siteId, seed, transect, modelYear: null, at: transect, agreement: 40, recorded: 40, records, cover, indicators: C.indicators(cover),
      fish: { parrotfish: 4, surgeonfish: 3, butterflyfish: 2, grouper: 1, snapper: 1 }, modelRun: null };
  };
  return [entry(sites[0], 11, 1, 18), entry(sites[0], 12, 2, 16), entry(sites[1], 13, 1, 4)];
}
const SECTIONS = { methods: { section: 'methods' }, survey: { section: 'survey' }, compareEmpty: { section: 'compare' }, science: { section: 'science' }, model: { section: 'model' } };

describe('goal, check and words at the top of each major section', () => {
  it('shows one "I can" goal on each major section, and none on Start', async () => {
    for (const [name, seed] of Object.entries(SECTIONS)) {
      const { host } = await mount(seed);
      const cards = host.querySelectorAll('[data-pd19]');
      expect(cards.length, name).toBe(1);
      const goal = cards[0].querySelector('[data-pd19-goal]');
      expect(goal && /^Goal: I can /.test(goal.textContent), name).toBe(true);
      // Nothing is open until the student asks.
      expect(cards[0].querySelector('[data-pd19-panel]'), name).toBe(null);
    }
    const { host: hub } = await mount({ section: 'hub' });
    expect(hub.querySelector('[data-pd19]')).toBe(null);
  });

  it('gives nothing away before a pick: no feedback, no explanation, options marked only by position', async () => {
    for (const [name, seed] of Object.entries(SECTIONS)) {
      const { host } = await mount(seed);
      await click(host.querySelector('[data-pd19-open=check]'));
      const panel = host.querySelector('[data-pd19-panel=check]');
      const qs = X.coralReefPd19.questions({ t: (k, f) => f, fill: (s, v) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in v ? String(v[k]) : m)) }, name === 'compareEmpty' ? 'compare' : name);
      expect(panel.querySelectorAll('[data-pd19-q]').length, name).toBe(qs.length);
      expect(panel.querySelector('[data-pd19-fb], [data-pd19-explain]'), name).toBe(null);
      const html = panel.outerHTML;
      expect(html.includes('✓') || html.includes('✗'), name).toBe(false);
      for (const q of qs) {
        if (q.explain) expect(html.includes(q.explain), name + ' ' + q.id + ' explanation').toBe(false);
        if (q.equation) expect(html.includes(q.equation), name + ' ' + q.id + ' equation').toBe(false);
        // An option's id names the answer ("right"), so the markup must never carry it.
        expect(html.includes('data-pd19-opt="' + q.answer + '"'), name).toBe(false);
      }
      panel.querySelectorAll('[data-pd19-q]').forEach((li) => {
        expect(li.getAttribute('data-pd19-state')).toBe('open');
        const shapes = [...li.querySelectorAll('[data-pd19-opt]')].map((b) => [...b.attributes].filter((a) => a.name !== 'data-pd19-opt').map((a) => a.name + '=' + a.value).join(';'));
        expect(new Set(shapes).size, name).toBe(1);
      });
    }
  });

  it('a wrong pick names the answer and explains it; a right pick says Correct', async () => {
    const { host } = await mount({ section: 'survey' });
    await click(host.querySelector('[data-pd19-open=check]'));
    const code = host.querySelector('[data-pd19-q=code]');
    const wrong = [...code.querySelectorAll('[data-pd19-opt]')].find((b) => /Recently dead/.test(b.textContent));
    await click(wrong);
    const fb = code.querySelector('[data-pd19-fb]');
    expect(fb.getAttribute('data-pd19-fb')).toBe('wrong');
    expect(fb.textContent).toBe('Not quite. The answer is: Bleached coral (alive).');
    expect(code.querySelector('[data-pd19-explain]').textContent).toMatch(/still alive and can recover/);
    // The first pick counts.
    const right = [...code.querySelectorAll('[data-pd19-opt]')].find((b) => /Bleached/.test(b.textContent));
    await click(right);
    expect(code.querySelector('[data-pd19-fb]').getAttribute('data-pd19-fb')).toBe('wrong');
    const cover = host.querySelector('[data-pd19-q=cover]');
    const C = X.coralReef, recs = {};
    for (let i = 0; i < 40; i++) recs[i] = i < 14 ? 'hard_coral' : 'sand';
    const live = C.indicators(C.coverFromRecords(recs, 40)).liveCoral;
    expect(cover.querySelector('p').textContent).toBe('On a tape of 40 points, 14 points are live coral. What is the live coral cover?');
    await click([...cover.querySelectorAll('[data-pd19-opt]')].find((b) => b.textContent.trim() === live + '%'));
    expect(cover.querySelector('[data-pd19-fb]').textContent).toBe('Correct.');
    expect(cover.querySelector('[data-pd19-explain]').textContent).toBe('14 ÷ 40 × 100 = ' + live + '%');
  });

  it('the numbers in the checks come from the lab: practice tapes, Degree Heating Weeks', async () => {
    const { host: m } = await mount({ section: 'methods' });
    const vals = [...m.querySelectorAll('[data-mt10-tape]')].map((g) => Number(g.getAttribute('data-mt10-value')));
    expect(vals.length).toBeGreaterThan(1);
    const { host } = await mount({ section: 'compare' });
    await click(host.querySelector('[data-pd19-open=check]'));
    expect(host.querySelector('[data-pd19-q=tapes] p').textContent).toBe('Two tapes at the same reef read ' + Math.min(...vals) + '% and ' + Math.max(...vals) + '% live coral. Is one of them a mistake?');
    const { host: md } = await mount({ section: 'model' });
    await click(md.querySelector('[data-pd19-open=check]'));
    const q = md.querySelector('[data-pd19-q=dhw]');
    expect(q.querySelector('p').textContent).toBe('The water is 3 degrees C too warm for 2 weeks. How many Degree Heating Weeks is that?');
    // NOAA rule in the lab: each week at least 1 degree C too warm adds its extra degrees.
    await click([...q.querySelectorAll('[data-pd19-opt]')].find((b) => b.textContent.trim() === String(3 * 2)));
    expect(q.querySelector('[data-pd19-fb]').textContent).toBe('Correct.');
  });

  it('the check works on Compare with saved surveys too, and on the rescue view of Reef future', async () => {
    const { host } = await mount({ section: 'compare', surveyLog: savedLog() });
    expect(host.querySelector('.cp9-claim')).not.toBe(null);
    expect(host.querySelectorAll('[data-pd19=compare]').length).toBe(1);
    const { host: r } = await mount({ section: 'model', mdlView: 'rescue' });
    expect(r.querySelectorAll('[data-pd19=model]').length).toBe(1);
  });

  it('words to know: a picture for each word, and the cover picture draws the count in its sum', async () => {
    const { host } = await mount({ section: 'survey' });
    await click(host.querySelector('[data-pd19-open=words]'));
    const ids = [...host.querySelectorAll('[data-pd19-word]')].map((li) => li.getAttribute('data-pd19-word'));
    expect(ids).toEqual(['transect', 'cover', 'belt', 'grazers', 'bleached']);
    host.querySelectorAll('[data-pd19-word]').forEach((li) => {
      const svg = li.querySelector('svg[data-pd19-pic]');
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(li.querySelector('strong').textContent.length).toBeGreaterThan(2);
    });
    const cover = host.querySelector('[data-pd19-word=cover]');
    const on = Number(cover.querySelector('[data-pd19-dots=on]').getAttribute('data-n')), off = Number(cover.querySelector('[data-pd19-dots=off]').getAttribute('data-n'));
    const dots = (p) => (cover.querySelector('[data-pd19-dots=' + p + ']').getAttribute('d').match(/M/g) || []).length;
    expect([dots('on'), dots('off')]).toEqual([on, off]);
    expect(cover.textContent.includes(on + ' ÷ ' + (on + off) + ' × 100 = ' + (on / (on + off) * 100) + '%')).toBe(true);
    const belt = host.querySelector('[data-pd19-word=belt]');
    const area = X.coralReef.constants.BELT_AREA_M2;
    expect(belt.textContent.includes('= ' + area + ' m²')).toBe(true);
  });

  it('answers are not saved: the tool data does not change when a check is answered', async () => {
    const { host, box } = await mount({ section: 'methods' });
    const before = JSON.stringify(box.data);
    await click(host.querySelector('[data-pd19-open=check]'));
    await click(host.querySelector('[data-pd19-q] [data-pd19-opt]'));
    expect(host.querySelector('[data-pd19-fb]')).not.toBe(null);
    expect(JSON.stringify(box.data)).toBe(before);
  });
});

describe('practice points: what to do next after a wrong answer', () => {
  it('the step table matches the "Not sure? Ask in this order" card', async () => {
    const { host } = await mount({ section: 'methods', w2MethodsPart: 'guide' });
    const seen = {};
    host.querySelectorAll('[data-mt10-step]').forEach((li) => li.querySelectorAll('[data-mt10-outcome]').forEach((o) => { seen[o.getAttribute('data-mt10-outcome')] = Number(li.getAttribute('data-mt10-step')); }));
    expect(seen).toEqual(X.coralReefPd19.ASK_STEP);
  });
  it('a wrong answer points at the step where the two paths part; a right one adds nothing', async () => {
    const { host } = await mount({ section: 'methods', w2MethodsPart: 'practice', practice: { 1: 'recently_dead_coral', 0: 'hard_coral', 3: 'sand' } });
    const card = (n) => host.querySelector('[data-w2-pcard="' + n + '"]');
    const line = card(1).querySelector('[data-pd19-ask-step]');
    expect(line.getAttribute('data-pd19-ask-step')).toBe('2');
    expect(line.textContent).toBe('Next time, use step 2 of "Not sure? Ask in this order": If not: is there living coral tissue, with polyps?');
    expect(card(0).querySelector('[data-pd19-ask-step]')).toBe(null);
    // Macroalgae taken for sand: the paths part at step 1, is it loose?
    expect(card(3).querySelector('[data-pd19-ask-step]').getAttribute('data-pd19-ask-step')).toBe('1');
    // An unanswered point shows no feedback at all.
    expect(card(2).querySelector('[data-pd19-ask-step]')).toBe(null);
  });
});

describe('claim builder sentence starters', () => {
  it('a starter adds its words to the reasoning, which keeps the unsaved-typing note', async () => {
    const { host, box } = await mount({ section: 'compare', surveyLog: savedLog() });
    const group = host.querySelector('[data-pd19-starters]');
    expect(group).not.toBe(null);
    const ta = host.querySelector('.cp9-claim textarea');
    expect(group.querySelector('[data-pd19-starter]').getAttribute('aria-controls')).toBe(ta.id);
    expect(host.querySelector('.cp9-claim [data-rd12-typed]')).not.toBe(null);
    await click(group.querySelector('[data-pd19-starter="1"]'));
    expect(box.data.srvClaim.reasoning).toBe('My evidence shows that ');
    await type(host.querySelector('.cp9-claim textarea'), box.data.srvClaim.reasoning + 'reef A has more coral');
    await click(host.querySelector('[data-pd19-starter="2"]'));
    expect(box.data.srvClaim.reasoning).toBe('My evidence shows that reef A has more coral. This supports my claim because ');
    expect(host.querySelector('.cp9-claim textarea').value).toBe(box.data.srvClaim.reasoning);
  });
});

describe('My reef report: looking back, and monitoring for real', () => {
  it('two reflection boxes sit before the questions, and reef monitoring for real closes the report', async () => {
    const { host } = await mount({ section: 'report' });
    const order = [...host.querySelectorAll('[data-rep-block]')].map((b) => b.getAttribute('data-rep-block'));
    expect(order.slice(-3)).toEqual(['pd19look', 'questions', 'pd19real']);
    expect(host.querySelectorAll('[data-pd19-rep-input]').length).toBe(2);
    const real = host.querySelector('[data-rep-block=pd19real]').textContent;
    expect(real.includes('Reef Check')).toBe(true);
    expect(real.includes('NOAA Coral Reef Watch')).toBe(true);
  });
  it('typing keeps both the reflection and the questions, and the printed copy shows the words or blank lines', async () => {
    const { host, box } = await mount({ section: 'report' });
    await type(host.querySelector('[data-pd19-rep-input=learned]'), 'Bleached coral is alive.');
    await type(host.querySelector('[data-rep-questions]'), 'Why do some corals survive?');
    expect(box.data.myReport).toEqual({ learned: 'Bleached coral is alive.', questions: 'Why do some corals survive?' });
    await type(host.querySelector('[data-pd19-rep-input=changed]'), 'The spread between tapes.');
    expect(box.data.myReport.questions).toBe('Why do some corals survive?');
    const printed = host.querySelector('[data-pd19-rep-print=learned]');
    expect(printed.textContent.includes('Bleached coral is alive.')).toBe(true);
    await type(host.querySelector('[data-pd19-rep-input=changed]'), '');
    expect(host.querySelector('[data-pd19-rep-print=changed] .pr4-lines')).not.toBe(null);
  });
});

describe('new strings', () => {
  it('every pd19 string has an English fallback and no dashes', () => {
    const src = readFileSync(path.resolve(process.cwd(), TOOL), 'utf8');
    const keys = src.match(/stem\.coralreef\.pd19_[a-z0-9_]+/g) || [];
    const calls = src.match(/__alloT\('stem\.coralreef\.pd19_[a-z0-9_]+', '(?:[^'\\]|\\.)+'\)/g) || [];
    expect(calls.length).toBeGreaterThan(20);
    expect(calls.length).toBe(keys.length);
    calls.forEach((c) => expect(/[–—]/.test(c), c).toBe(false));
  });
});
