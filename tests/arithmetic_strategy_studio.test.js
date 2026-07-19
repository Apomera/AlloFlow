import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_arithmetic.js';
const ID = 'arithmeticStudio';

beforeEach(() => {
  resetStemLab();
  document.body.innerHTML = '<div id="root"></div>';
});

describe('Arithmetic Strategy Studio', () => {
  it('registers as a math tool and exposes deterministic pure helpers', () => {
    const tool = loadTool(FILE, ID);
    expect(tool.label).toBe('Arithmetic Strategy Studio');
    expect(tool.category).toBe('math');

    const pure = window.ArithmeticStrategyPure;
    expect(pure.calculate('add', 58, 27)).toEqual({ answer: 85, remainder: 0 });
    expect(pure.calculate('subtract', 402, 186)).toEqual({ answer: 216, remainder: 0 });
    expect(pure.calculate('multiply', 24, 13)).toEqual({ answer: 312, remainder: 0 });
    expect(pure.calculate('divide', 65, 6)).toEqual({ answer: 10, remainder: 5 });
    expect(pure.splitPlaceValue(1204)).toEqual([1000, 200, 4]);
    expect(pure.strategySteps('divide', 65, 6).join(' ')).toContain('remainder 5');
  });

  it('renders the default strategy workspace with accessible models and controls', () => {
    loadTool(FILE, ID);
    const html = renderTool(ID, {});
    expect(html).toContain('Arithmetic Strategy Studio');
    expect(html).toContain('Concrete');
    expect(html).toContain('Choose an operation');
    expect(html).toContain('Place-value table and text alternative');
    expect(html).toContain('role="tablist"');
    expect(html).not.toContain('undefined');
  });

  it('renders every learning section and all four operation models', () => {
    loadTool(FILE, ID);
    for (const tab of ['learn', 'practice', 'errors', 'apply']) {
      for (const operation of ['add', 'subtract', 'multiply', 'divide']) {
        const html = renderTool(ID, {
          _arithmeticStudio: { tab, operation, level: 3, a: 65, b: 6, showSteps: true },
        });
        expect(html.length).toBeGreaterThan(1000);
        expect(html).toContain('Arithmetic Strategy Studio');
        expect(html).not.toContain('render error');
      }
    }
  });

  it('keeps division quotient and remainder reasoning explicit', () => {
    loadTool(FILE, ID);
    const html = renderTool(ID, {
      _arithmeticStudio: { tab: 'learn', operation: 'divide', a: 65, b: 6, showSteps: true },
    });
    expect(html).toContain('10 remainder 5');
    expect(html).toContain('Equal-groups model');
    expect(html).toContain('with 5 left over');
  });

  it('updates progress after a correct mounted practice interaction', async () => {
    const tool = loadTool(FILE, ID);
    let latest;

    function App() {
      const [state, setState] = React.useState({
        _arithmeticStudio: { tab: 'practice', operation: 'add', level: 1, answerInput: '62', estimateInput: '60' },
      });
      latest = state;
      return tool.render(makeCtx({ toolData: state, setToolData: setState }));
    }

    const root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => { root.render(React.createElement(App)); });
    const check = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Check answer');
    expect(check).toBeTruthy();
    await React.act(async () => { check.click(); });
    expect(latest._arithmeticStudio.correct).toBe(1);
    expect(latest._arithmeticStudio.attempts).toBe(1);
    expect(document.body.textContent).toContain('Correct. Your exact answer is reasonable');
    await React.act(async () => { root.unmount(); });
  });
  it('is wired into the host catalog, plugin allowlist, and lazy loader', () => {
    const host = fs.readFileSync('stem_lab/stem_lab_module.js', 'utf8');
    const app = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
    const deployedHost = fs.readFileSync('prismflow-deploy/public/stem_lab/stem_lab_module.js', 'utf8');
    expect(host).toContain("id: 'arithmeticStudio'");
    expect(host).toContain('arithmeticStudio: true');
    expect(deployedHost).toBe(host);
    expect(app).toContain("'stem_lab/stem_tool_arithmetic.js'");
  });
});
