import { beforeEach, describe, expect, it, vi } from 'vitest';
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
    expect(table).toContain('Enter at least two valid coordinate pairs');
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
    await React.act(async () => { check.click(); });
    expect(latest._ratioLab.solvedChallenges['ratio-paint']).toBe(true);
    expect(document.body.textContent).toContain('Correct!');
    expect(awardXP).toHaveBeenCalledWith('ratioLab', 15, 'Ratio Lab challenge');
    await React.act(async () => { root.unmount(); });
  });
});
