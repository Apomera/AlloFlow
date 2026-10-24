import { describe, it, expect, beforeEach } from 'vitest';
import { loadTool, resetStemLab, renderTool, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const act = React.act;

// Coral Reef Survey Lab renders every section under every host theme, and the
// survey can be driven end to end with the keyboard-reachable controls.

const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const SECTIONS = ['hub', 'explore', 'guide', 'methods', 'survey', 'compare', 'model', 'science', 'teacher'];

beforeEach(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'coralReef'); });

describe('Coral Reef Survey Lab renders', () => {
  it.each(SECTIONS)('%s renders in light, dark and contrast themes', (section) => {
    for (const theme of ['light', 'dark', 'contrast']) {
      const html = renderTool('coralReef', { coralReef: { section } }, { theme });
      expect(html.includes('data-coralreef-root'), section + ' ' + theme).toBe(true);
      expect(html.includes('undefined'), section + ' ' + theme + ' printed undefined').toBe(false);
      expect(html.includes('NaN'), section + ' ' + theme + ' printed NaN').toBe(false);
    }
  });

  it('renders each survey stage', () => {
    for (const surveyStage of ['points', 'fish', 'results']) {
      const html = renderTool('coralReef', { coralReef: { section: 'survey', surveyStage, fishView: 'list' } });
      expect(html.includes('NaN'), surveyStage).toBe(false);
    }
  });

  it('shows a restoration run beside the same reef without help', () => {
    const html = renderTool('coralReef', { coralReef: { section: 'model', model: window.__RR_TEST_EXPORTS__.coralReef.scenarioSettings('rubble'), modelRevealedFor: { rubble: true } } });
    expect(html.includes('Without actions'), 'comparison label').toBe(true);
    expect(html.includes('With the restoration actions') || html.includes('made little difference'), 'saved sentence').toBe(true);
    expect(html.includes('NaN')).toBe(false);
  });

  it('renders every dive site and the species guide filters', () => {
    for (const diveSiteId of ['healthy', 'restoration', 'heatwave', 'damaged']) {
      const html = renderTool('coralReef', { coralReef: { section: 'explore', diveSiteId } });
      expect(html.includes('Start the dive'), diveSiteId).toBe(true);
    }
    for (const guideFilter of ['all', 'found', 'missing']) expect(renderTool('coralReef', { coralReef: { section: 'guide', guideFilter } }).includes('NaN')).toBe(false);
  });

  it('renders a revealed model run and the custom controls', () => {
    const html = renderTool('coralReef', { coralReef: { section: 'model', modelRevealedFor: { recent: true }, modelPredictions: { recent: { choice: 'lower' } } } });
    expect(html.includes('role="img"')).toBe(true);
    expect(html.includes('NaN')).toBe(false);
  });
});

describe('a survey can be completed with the on-screen controls', () => {
  it('records 40 points, counts fish, and saves to the log', async () => {
    const X = window.__RR_TEST_EXPORTS__.coralReef;
    const site = X.SITES[0];
    const layout = X.buildTransect(site, site.seed);
    let data = { coralReef: { section: 'survey', autoAdvance: true } };
    const ctxBase = { React, t: (k, f) => f || k, announceToSR: () => {}, setStemLabTool: () => {} };
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    const cfg = window.StemLab._registry.coralReef;
    function Shell() {
      const [toolData, setToolData] = React.useState(data);
      data = toolData;
      return cfg.render(Object.assign({}, ctxBase, { toolData, setToolData }));
    }
    await act(async () => { root.render(React.createElement(Shell)); });
    const CN = { hard_coral: 'Live hard coral', bleached_coral: 'Bleached coral (alive)', recently_dead_coral: 'Recently dead coral', macroalgae: 'Fleshy seaweed (macroalgae)', rock: 'Rock', rubble: 'Rubble', sand: 'Sand' };
    const recordGroup = () => [...host.querySelectorAll('[role="group"]')].find((g) => /^Record point/.test(g.getAttribute('aria-label') || ''));
    for (let i = 0; i < 40; i++) {
      const name = CN[layout.points[i].category];
      const btn = [...recordGroup().querySelectorAll('button')].find((b) => b.textContent.startsWith(name));
      expect(btn, 'button for ' + name).toBeTruthy();
      await act(async () => { btn.click(); });
    }
    expect(Object.keys(data.coralReef.records).length).toBe(40);
    const toFish = [...host.querySelectorAll('button')].find((b) => b.textContent === 'Go to the fish count');
    await act(async () => { toFish.click(); });
    const truth = X.fishInBelt(layout);
    for (const fam of X.FISH_FAMILIES) {
      const input = host.querySelector('input[aria-label="' + fam.charAt(0).toUpperCase() + fam.slice(1) + ' count"]');
      expect(input, fam).toBeTruthy();
      for (let n = 0; n < truth[fam]; n++) {
        const plus = host.querySelector('button[aria-label="One more ' + fam.charAt(0).toUpperCase() + fam.slice(1) + '"]');
        await act(async () => { plus.click(); });
      }
    }
    const toResults = [...host.querySelectorAll('button')].find((b) => b.textContent === 'See my results');
    await act(async () => { toResults.click(); });
    expect(host.textContent.includes('Your records match the reef key at 40 of 40 points.')).toBe(true);
    const save = [...host.querySelectorAll('button')].find((b) => b.textContent === 'Save to my survey log');
    await act(async () => { save.click(); });
    expect(data.coralReef.surveyLog.length).toBe(1);
    expect(data.coralReef.surveyLog[0].agreement).toBe(40);
    for (const fam of X.FISH_FAMILIES) expect(data.coralReef.surveyLog[0].fish[fam]).toBe(truth[fam]);
    await act(async () => { root.unmount(); });
    host.remove();
  });

  it('moves along the tape with the arrow keys and keeps focus on the current point', async () => {
    let data = { coralReef: { section: 'survey' } };
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    const cfg = window.StemLab._registry.coralReef;
    function Shell() {
      const [toolData, setToolData] = React.useState(data);
      data = toolData;
      return cfg.render({ React, t: (k, f) => f || k, announceToSR: () => {}, toolData, setToolData });
    }
    await act(async () => { root.render(React.createElement(Shell)); });
    const toolbar = host.querySelector('[role="toolbar"]');
    const current = () => toolbar.querySelector('button[aria-current="true"]');
    current().focus();
    await act(async () => { current().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); });
    expect(data.coralReef.pointIndex).toBe(1);
    expect(document.activeElement).toBe(current());
    await act(async () => { current().dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true })); });
    expect(data.coralReef.pointIndex).toBe(39);
    expect(toolbar.querySelectorAll('button[tabindex="0"]').length).toBe(1);
    await act(async () => { root.unmount(); });
    host.remove();
  });
});
