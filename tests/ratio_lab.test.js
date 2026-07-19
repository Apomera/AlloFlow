import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_ratios.js';
const ID = 'ratioLab';

beforeEach(() => {
  resetStemLab();
  document.body.innerHTML = '<div id="root"></div>';
});

describe('Ratios, Rates & Proportions Lab', () => {
  it('registers and exposes reliable proportional-reasoning helpers', () => {
    const tool = loadTool(FILE, ID);
    expect(tool.label).toBe('Ratios, Rates & Proportions Lab');
    expect(tool.category).toBe('math');

    const pure = window.RatioLabPure;
    expect(pure.gcd(18, 24)).toBe(6);
    expect(pure.parsePairs('0,1,2', '0,3,6')).toEqual([
      { x: 0, y: 0 }, { x: 1, y: 3 }, { x: 2, y: 6 },
    ]);
    expect(pure.analyzeProportionalPairs([{ x: 0, y: 0 }, { x: 2, y: 7 }, { x: 4, y: 14 }])).toMatchObject({
      valid: true, proportional: true, constant: 3.5,
    });
    expect(pure.analyzeProportionalPairs([{ x: 0, y: 2 }, { x: 1, y: 3 }, { x: 2, y: 6 }])).toMatchObject({
      proportional: false, hasInvalidOrigin: true,
    });

    const mismatched = pure.parsePairInput('0,1,2', '0,3');
    expect(mismatched.complete).toBe(false);
    expect(mismatched.errors).toContain('Enter the same number of x-values and y-values.');
    expect(pure.analyzeProportionalPairs(mismatched).valid).toBe(false);
    const malformed = pure.parsePairInput('0,1,nope,2', '0,3,999,6');
    expect(malformed.errors).toContain('Row 3: use numbers only.');
    expect(pure.analyzeProportionalPairs(malformed)).toMatchObject({ valid: false, proportional: false });
    expect(pure.parsePairs('0,1,nope,2', '0,3,999,6')).toEqual([]);
    expect(pure.analyzeProportionalPairs(pure.parsePairs('0,1,nope,2', '0,3,999,6'))).toMatchObject({
      valid: false, proportional: false,
    });

    const explorer = tool.questHooks.find((hook) => hook.id === 'ratio_explorer');
    const challenger = tool.questHooks.find((hook) => hook.id === 'ratio_challenger');
    expect(explorer.progress({ modesVisited: { ratioTable: true, bogus: true } })).toBe('1/5 modes');
    expect(challenger.progress({ solvedChallenges: { bogus: true } })).toBe('0/5 solved');
  });

  it('renders all five representations without degraded output', () => {
    loadTool(FILE, ID);
    const expected = {
      ratioTable: 'Equivalent ratio table',
      numberLine: 'Double number line',
      unitRates: 'Cost for 1 unit',
      percent: 'Choose the unknown',
      proportional: 'Table and unit-rate evidence',
    };
    for (const [mode, anchor] of Object.entries(expected)) {
      const html = renderTool(ID, { _ratioLab: { mode } });
      expect(html).toContain('Ratios, Rates &amp; Proportions Lab');
      expect(html).toContain(anchor);
      expect(html).not.toContain('undefined');
      expect(html).not.toContain('NaN');
    }
  });

  it('handles zero-quantity unit rates and invalid table rows safely', () => {
    loadTool(FILE, ID);
    const rates = renderTool(ID, { _ratioLab: { mode: 'unitRates', amountA: 0, amountB: 0 } });
    expect(rates).toContain('Needs a quantity');
    expect(rates).not.toContain('Infinity');

    const table = renderTool(ID, { _ratioLab: { mode: 'proportional', propX: '0, nope', propY: '2, 4' } });
    expect(table).toContain('Row 2: use numbers only');
    expect(table).not.toContain('Proportional: the unit rate is constant');
    expect(table).not.toContain('NaN');
  });

  it('marks a deterministic mounted challenge solved and awards scoped XP', async () => {
    const tool = loadTool(FILE, ID);
    let latest;
    const awardXP = vi.fn();

    function App() {
      const [state, setState] = React.useState({
        _ratioLab: { mode: 'ratioTable', challengeAnswer: '12' },
      });
      latest = state;
      return tool.render(makeCtx({ toolData: state, setToolData: setState, awardXP }));
    }

    const root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => { root.render(React.createElement(App)); });
    const check = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Check answer');
    expect(check).toBeTruthy();
    await React.act(async () => { check.click(); check.click(); });
    expect(latest._ratioLab.solvedChallenges['ratio-paint']).toBe(true);
    expect(document.body.textContent).toContain('Correct!');
    expect(document.body.textContent).toContain('Solved');
    expect(awardXP).toHaveBeenCalledWith('ratioLab', 15, 'Ratio Lab challenge');
    expect(awardXP).toHaveBeenCalledTimes(1);
    await React.act(async () => { root.unmount(); });
  });
  it('refuses malformed coordinate verdicts and models omitted origins honestly', () => {
    loadTool(FILE, ID);
    const mismatched = renderTool(ID, { _ratioLab: { mode: 'proportional', propX: '0,1,2', propY: '0,3' } });
    expect(mismatched).toContain('Enter the same number of x-values and y-values');
    expect(mismatched).toContain('Row 3: enter both an x-value and a y-value');
    expect(mismatched).not.toContain('Proportional: the unit rate is constant');

    const negative = renderTool(ID, { _ratioLab: { mode: 'proportional', propX: '-1,-2', propY: '-3,-6' } });
    expect(negative).toContain('first-quadrant graph requires nonnegative values');
    expect(negative).toContain('No complete set of points is available to graph');
    expect(negative).not.toContain('Proportional: the unit rate is constant');

    const omittedOrigin = renderTool(ID, { _ratioLab: { mode: 'proportional', propX: '1,2', propY: '3,6' } });
    expect(omittedOrigin).toContain('data-proportional-ray="true"');
    expect(omittedOrigin).toContain('origin was not entered');
    expect(omittedOrigin).toContain('Graph of 2 plotted table points');
  });

  it('uses contrast-safe text and surfaces in high-contrast mode', () => {
    loadTool(FILE, ID);
    const html = renderTool(ID, { _ratioLab: { mode: 'percent', percentValue: 50 } }, { isContrast: true });
    expect(html).toContain('background:#ffff00;color:#000000');
    expect(html).not.toContain('background:#ffff00;color:#ffffff');
    expect(html).toContain('background:#000000;border:2px solid #ffff00');
    const table = renderTool(ID, { _ratioLab: { mode: 'ratioTable', ratioFactor: 4 } }, { isContrast: true });
    expect(table).toContain('background:#ffff00;color:#000000');
    expect(table).not.toContain('background:#eef2ff;color:#ffffff');
  });

  it('supports Arrow, Home, and End navigation in the mode tablist', async () => {
    const tool = loadTool(FILE, ID);

    function App() {
      const [state, setState] = React.useState({ _ratioLab: { mode: 'ratioTable' } });
      return tool.render(makeCtx({ toolData: state, setToolData: setState }));
    }

    const root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => { root.render(React.createElement(App)); });
    let tabs = [...document.querySelectorAll('[role="tab"]')];
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1, -1, -1]);
    for (const tab of tabs) {
      expect(document.getElementById(tab.getAttribute('aria-controls'))).toBeTruthy();
    }
    tabs[0].focus();
    await React.act(async () => { tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); });
    tabs = [...document.querySelectorAll('[role="tab"]')];
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tabs[1]);
    await React.act(async () => { tabs[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true })); });
    tabs = [...document.querySelectorAll('[role="tab"]')];
    expect(tabs[4].getAttribute('aria-selected')).toBe('true');
    expect(document.querySelector('[role="tabpanel"]').getAttribute('aria-labelledby')).toBe(tabs[4].id);
    await React.act(async () => { root.unmount(); });
  });

  it('is wired into the host catalog, plugin allowlist, lazy loader, and deployment mirrors', () => {
    const host = fs.readFileSync('stem_lab/stem_lab_module.js', 'utf8');
    const deployedHost = fs.readFileSync('prismflow-deploy/public/stem_lab/stem_lab_module.js', 'utf8');
    const app = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
    expect(host).toContain("id: 'ratioLab'");
    expect(host).toContain('ratioLab: true');
    expect(deployedHost).toBe(host);
    expect(app).toContain("'stem_lab/stem_tool_ratios.js'");
    expect(fs.readFileSync('prismflow-deploy/public/stem_lab/stem_tool_ratios.js', 'utf8')).toBe(fs.readFileSync(FILE, 'utf8'));
  });
});
