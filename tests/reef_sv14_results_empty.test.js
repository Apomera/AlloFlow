import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import path from 'node:path';

// Lane sv14: Results with no point recorded showed a table of 0% rows, a bar that
// was 100% "Not recorded" and four 0% lines, which read like a measured, empty
// reef. Now one short card says nothing is recorded yet and offers point 1.
// With one or more points recorded, Results is as before.

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
let loadTool, resetStemLab, renderTool, React, ReactDOMClient, X;
beforeAll(async () => {
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ loadTool, resetStemLab, renderTool, React, ReactDOMClient } = mod);
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef;
});
const mounted = [];
afterEach(async () => { while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); } });
const parse = (html) => new DOMParser().parseFromString('<!doctype html><body>' + html + '</body>', 'text/html');
const results = (records, extra, theme) => parse(renderTool('coralReef', { coralReef: Object.assign({ section: 'survey', surveySiteId: 'reserve', surveySeed: X.siteById('reserve').seed, records, surveyStage: 'results' }, extra || {}) }, theme ? { theme } : undefined));
const coverSection = (doc) => [...doc.querySelectorAll('section')].find((s) => { const h3 = s.querySelector('h3'); return h3 && h3.textContent === 'Percent cover'; });
const goButtons = (root) => [...root.querySelectorAll('button')].filter((b) => b.textContent === 'Go to this point');

describe('sv14 Results with nothing recorded', () => {
  it('shows one short card, not a table of zeros, a Not recorded bar or 0% lines', () => {
    for (const theme of [undefined, 'dark', 'contrast']) {
      const doc = results({}, null, theme);
      expect(doc.querySelector('[data-sv9-band]'), 'the Results band is still there').toBeTruthy();
      const card = coverSection(doc);
      expect(card, 'a Percent cover card').toBeTruthy();
      expect(card.getAttribute('data-sv14-empty-cover')).toBe('true');
      expect(card.textContent.includes('Nothing is recorded yet')).toBe(true);
      expect(card.querySelector('table'), 'no table').toBe(null);
      expect(card.querySelector('.crb-bar'), 'no stacked bar').toBe(null);
      expect(card.querySelector('ul'), 'no indicator lines').toBe(null);
      expect(/%/.test(card.textContent), 'no percent anywhere in the card').toBe(false);
      // Nothing on the page reads as a measured 0% cover.
      expect(doc.querySelector('.crb-bar[data-bar="yours"]')).toBe(null);
      expect(doc.body.textContent.includes('You recorded 0 of 40 points')).toBe(false);
      // One way to start, not two of the same button.
      const go = goButtons(doc);
      expect(go.length).toBe(1);
      expect(card.contains(go[0])).toBe(true);
      expect(go[0].className.includes('pf11-go')).toBe(true);
      expect(card.textContent.includes('Next point to record: point 1 (0 m).')).toBe(true);
      // The key stays hidden: its card and strip are still there, with no answers.
      expect(doc.querySelector('[data-srv-key-hidden]')).toBeTruthy();
      expect(doc.querySelectorAll('[data-transect-strip] button').length).toBe(40);
      expect(doc.querySelector('[data-strip="key"]')).toBe(null);
    }
  });

  it('takes the student to point 1 with the point heading focused', async () => {
    let data = { coralReef: { section: 'survey', surveySiteId: 'reserve', records: {}, surveyStage: 'results' } };
    const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOMClient.createRoot(host);
    function Shell() {
      const [state, setState] = React.useState(data); data = state;
      return window.StemLab._registry.coralReef.render({ React, toolData: state, setToolData: setState, t: (k, f) => f || k, reduceMotion: true });
    }
    mounted.push({ host, root });
    await React.act(async () => root.render(React.createElement(Shell)));
    const go = goButtons(host);
    expect(go.length).toBe(1);
    await React.act(async () => { go[0].focus(); go[0].click(); });
    expect(data.coralReef.surveyStage).toBe('points');
    expect(data.coralReef.pointIndex).toBe(0);
    expect(document.activeElement).toBe(host.querySelector('#cr-point-title'));
  });

  it('keeps Results as before once one point is recorded', () => {
    const L = X.buildTransect(X.siteById('reserve'), X.siteById('reserve').seed);
    const doc = results({ 0: L.points[0].category });
    const card = coverSection(doc);
    expect(card.getAttribute('data-sv14-empty-cover')).toBe(null);
    expect(card.querySelector('table')).toBeTruthy();
    expect(card.querySelector('.crb-bar[data-bar="yours"]')).toBeTruthy();
    const lines = [...card.querySelectorAll(':scope > ul')].pop();
    expect(lines.querySelectorAll('li').length).toBe(4);
    expect(lines.textContent.includes('Live coral (healthy plus bleached)')).toBe(true);
    expect(doc.body.textContent.includes('You recorded 1 of 40 points')).toBe(true);
    expect(doc.querySelector('[data-sv14-empty-cover]')).toBe(null);
    // The hidden-key card still offers the next point.
    const go = goButtons(doc.querySelector('[data-srv-key-hidden]'));
    expect(go.length).toBe(1);
  });
});
