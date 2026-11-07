import { describe, it, expect, beforeAll, vi } from 'vitest';
import path from 'node:path';

// Round 13 lane pages: the weakest screens brought up to the rest of the tool.
// Plan a reef rescue: "What moved the coral" is drawn as bars either side of zero,
// from the same rescueEvaluate numbers the table prints; table cells no longer
// break a number in two on a phone; action cards show their cost as budget tokens.
// My reef report: every prediction is a boxed entry and the matched / surprise
// line carries an ink-only mark. Reef science: lead lines on Tough corals and What
// helps reefs, and a gap before Sources.

vi.setConfig({ testTimeout: 60000 });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
let renderTool, R, M;
beforeAll(async () => {
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  renderTool = mod.renderTool;
  mod.resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; mod.loadTool(TOOL, 'coralReef');
  R = window.__RR_TEST_EXPORTS__.coralReefRescue; M = window.__RR_TEST_EXPORTS__.coralReefModel;
});
const dom = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d; };
const view = (seed, theme) => dom(renderTool('coralReef', { coralReef: seed }, theme ? { theme } : undefined));
const css = (host) => [...host.querySelectorAll('style')].map((s) => s.textContent).join('\n');
const pts = (v) => { const p = Math.round(Math.abs(v) * 100 * 10) / 10; return p < 0.05 ? '0' : (v < 0 ? '-' : '+') + p; };
const P1 = { id: 'plan-1', n: 1, start: 'rubble', stars: true, garden: true, predict: 30, criterion: 'coral' };
const results = (plan, theme) => view({ section: 'model', mdlView: 'rescue', mdlRescue: { draft: { start: plan.start }, plans: [plan], nextN: 2, activeId: plan.id } }, theme);
const CAUSES = ['regrowth', 'planted', 'heat', 'background', 'overgrowth'];

describe('rescue: what moved the coral, as a picture', () => {
  it('draws one row per cause with the same numbers as rescueEvaluate, losses left of zero and gains right', () => {
    const host = results(P1), ev = R.rescueEvaluate(P1);
    const chart = host.querySelector('[data-pg13-causes]');
    expect(chart, 'cause chart on the results view').toBeTruthy();
    const rows = [...chart.querySelectorAll('[data-pg13-cz-row]')];
    expect(rows.map((r) => r.getAttribute('data-pg13-cz-row'))).toEqual(CAUSES);
    let lo = 0, hi = 0;
    for (const id of CAUSES) for (const v of [ev.causes[id] || 0, ev.noneCauses[id] || 0]) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    const span = hi - lo, zero = Math.round(-lo / span * 1000) / 10;
    for (const row of rows) {
      const id = row.getAttribute('data-pg13-cz-row');
      for (const [kind, v] of [['mine', ev.causes[id] || 0], ['none', ev.noneCauses[id] || 0]]) {
        const line = row.querySelector('[data-pg13-cz="' + kind + '"]');
        expect(line.querySelector('.pg13-cz-val').textContent, id + ' ' + kind).toBe(pts(v));
        const bar = line.querySelector('.pg13-cz-bar');
        if (pts(v) === '0') { expect(bar, id + ' ' + kind + ' zero has no bar').toBeNull(); continue; }
        const w = Math.round(Math.abs(v) / span * 1000) / 10;
        expect(bar.style.width, id + ' ' + kind + ' width').toBe(String(w) + '%');
        expect(bar.style.minWidth).toBe('3px');
        if (v < 0) expect(parseFloat(bar.style.right)).toBeCloseTo(100 - zero, 0);
        else expect(parseFloat(bar.style.left)).toBeCloseTo(zero, 0);
      }
    }
    // The picture is one image for screen readers, and it names every number.
    const img = chart.querySelector('[role="img"]'), label = img.getAttribute('aria-label');
    for (const id of CAUSES) { expect(label.includes(pts(ev.causes[id] || 0)), id).toBe(true); }
    expect(label.includes('averaged across 20 runs')).toBe(true);
  });

  it('keeps the table, with its caption and cause rows, under "Show the numbers"', () => {
    const host = results(P1);
    const details = host.querySelector('details[data-pg13-cz-numbers]');
    expect(details).toBeTruthy();
    expect(details.querySelector('summary').textContent).toBe('Show the numbers');
    expect(details.querySelector('table[data-rc-causes] caption')).toBeTruthy();
    expect(details.querySelectorAll('[data-rc-cause]').length).toBe(5);
  });

  it('a plan with no actions draws the same bars twice and adds nothing for planting', () => {
    const plan = { id: 'plan-1', n: 1, start: 'rubble', predict: 3, criterion: 'coral' };
    const host = results(plan), ev = R.rescueEvaluate(plan);
    const planted = host.querySelector('[data-pg13-cz-row="planted"]');
    expect(planted.querySelector('[data-pg13-cz="mine"] .pg13-cz-bar')).toBeNull();
    for (const id of ['regrowth', 'heat', 'background']) {
      const row = host.querySelector('[data-pg13-cz-row="' + id + '"]');
      expect(row.querySelector('[data-pg13-cz="mine"] .pg13-cz-val').textContent).toBe(row.querySelector('[data-pg13-cz="none"] .pg13-cz-val').textContent);
      expect(row.querySelector('[data-pg13-cz="mine"] .pg13-cz-val').textContent).toBe(pts(ev.noneCauses[id]));
    }
  });

  it('shows nothing of it before the plan is tested', () => {
    const host = view({ section: 'model', mdlView: 'rescue', mdlRescue: { draft: { start: 'rubble', stars: true, garden: true }, plans: [], nextN: 1 } });
    expect(host.querySelector('[data-pg13-causes]')).toBeNull();
    expect(host.querySelector('[data-pg13-cz-row]')).toBeNull();
  });

  it('reads in dark and contrast themes from the palette, not fixed colours', () => {
    for (const theme of ['dark', 'contrast']) {
      const host = results(P1, theme);
      const bar = host.querySelector('[data-pg13-cz-row="regrowth"] [data-pg13-cz="mine"] .pg13-cz-bar');
      expect(bar.style.background.length > 0, theme).toBe(true);
      expect(css(host).includes('.pg13-cz-bar'), theme).toBe(true);
    }
  });
});

describe('rescue: numbers do not break on a phone', () => {
  it('number cells in the cause table never wrap inside a number, and column heads never split a word', () => {
    const host = results(P1);
    expect(css(host).includes('[data-coralreef-root] .rc-table[data-rc-causes] td:not(:first-child){white-space:nowrap}')).toBe(true);
    expect(css(host).includes('[data-coralreef-root] .rc-table th{overflow-wrap:normal;word-break:normal}')).toBe(true);
  });
});

describe('rescue planner: cost as budget tokens', () => {
  it('each action card shows as many tokens as its point cost', () => {
    const host = view({ section: 'model', mdlView: 'rescue', mdlRescue: { draft: { start: 'fished' }, plans: [], nextN: 1 } });
    for (const id of ['stars', 'garden', 'structures', 'fish', 'runoff']) {
      const pips = host.querySelector('[data-rc-action="' + id + '"] [data-pg13-pips]');
      expect(pips, id).toBeTruthy();
      expect(pips.querySelectorAll('svg').length, id).toBe(R.RESCUE_COST[id]);
      expect([...pips.querySelectorAll('svg')].every((s) => s.getAttribute('aria-hidden') === 'true')).toBe(true);
    }
    expect(css(host).includes('.rc-act-head .pg13-pips svg{display:block;flex:none;width:12px;height:9px}')).toBe(true);
  });
});

describe('my reef report: predictions as entries', () => {
  it('a matched guess and a surprise each carry their own ink-only mark, with the words unchanged', () => {
    const got = M.mdlOutcome(M.runScenario(M.scenarioSettings('recent'), 11)), miss = ['higher', 'same', 'lower'].find((p) => p !== got);
    const host = view({ section: 'report', modelPredictions: { recent: { choice: miss }, reserve: { choice: M.mdlOutcome(M.runScenario(M.scenarioSettings('reserve'), 11)) } }, modelRevealedFor: { recent: true, reserve: true } });
    const diff = host.querySelector('[data-rep-model="recent"] [data-rep-frame]'), same = host.querySelector('[data-rep-model="reserve"] [data-rep-frame]');
    expect(diff.querySelector('svg[data-pg13-verdict]').getAttribute('data-pg13-verdict')).toBe('different');
    expect(same.querySelector('svg[data-pg13-verdict]').getAttribute('data-pg13-verdict')).toBe('same');
    expect(diff.querySelector('svg').getAttribute('aria-hidden')).toBe('true');
    expect(diff.textContent).toBe('This was different from what I expected. A surprise like this shows what to look into next.');
    expect(same.textContent).toBe('This matched what I expected. What made me expect it?');
    // Ink only: it must print black on white like the rest of the paper.
    expect(diff.querySelector('svg').innerHTML.includes('currentColor')).toBe(true);
  });

  it('the paper CSS boxes each prediction and is scoped to the predictions block', () => {
    const host = view({ section: 'report', modelPredictions: { recent: { choice: 'lower' } }, modelRevealedFor: { recent: true } });
    const text = css(host);
    // (Static markup escapes ">" inside the style text, so match after it.)
    expect(text.includes('li,[data-rep-block=predictions] [data-rep-extra]{margin:8px 0 6px;padding:6px 10px;border:1px solid currentColor')).toBe(true);
    expect(text.includes('[data-rep-block=predictions] .rep-list{list-style:none;padding-inline-start:0}')).toBe(true);
  });
});

describe('reef science: lead lines and spacing', () => {
  it('Tough corals and What helps reefs open with a lead line, and the help page leaves a gap before Sources', () => {
    const fut = view({ section: 'science', sciTopic: 'future' });
    expect(fut.querySelector('p.pg13-lead')).toBeTruthy();
    const help = view({ section: 'science', sciTopic: 'help' });
    expect(help.querySelector('p.pg13-lead')).toBeTruthy();
    const end = help.querySelector('.pg13-help-end');
    expect(end).toBeTruthy();
    expect(end.style.margin).toBe('0px 0px 16px');
    expect(end.querySelectorAll('button').length).toBe(2);
  });
});
