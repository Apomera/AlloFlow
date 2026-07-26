import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';

const LOADER_SOURCE = readFileSync(resolve(process.cwd(), 'mathlive_loader.js'), 'utf8');

function mockMathLiveDom() {
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'https://app.example.test/index.html',
    runScripts: 'outside-only',
  });
  const requested = [];
  Object.defineProperty(dom.window.document, 'currentScript', {
    configurable: true,
    get: () => ({ src: 'https://app.example.test/mathlive_loader.js' }),
  });
  const appendChild = dom.window.document.head.appendChild.bind(dom.window.document.head);
  dom.window.document.head.appendChild = (script) => {
    requested.push(script.src);
    appendChild(script);
    dom.window.queueMicrotask(() => {
      class MockMathfieldElement extends dom.window.HTMLElement {
        constructor() {
          super();
          this._value = '';
        }
        set value(value) { this._value = String(value || ''); }
        get value() { return this._value; }
        getValue(format) {
          if (format === 'latex') return this._value;
          if (format === 'math-ml') return '<mrow><mi>x</mi><mo>+</mo><mn>1</mn></mrow>';
          if (format === 'ascii-math' || format === 'plain-text') return 'x+1';
          if (format === 'spoken-text' || format === 'spoken') return 'x plus one';
          return this._value;
        }
      }
      dom.window.MathfieldElement = MockMathfieldElement;
      dom.window.MathLive = { MathfieldElement: MockMathfieldElement };
      if (!dom.window.customElements.get('math-field')) {
        dom.window.customElements.define('math-field', MockMathfieldElement);
      }
      script.onload();
    });
    return script;
  };
  dom.window.eval(LOADER_SOURCE);
  return { dom, requested, input: dom.window.AlloMathInput };
}

afterEach(() => {
  delete globalThis.window?.AlloMathInput;
});

describe('offline MathLive accessible input adapter', () => {
  it('loads the pinned local runtime and returns accessible formats for existing graders', async () => {
    const { dom, requested, input } = mockMathLiveDom();
    const formats = await input.fromLatex('x+1', { allowRemoteFallback: false, useSre: false });

    expect(requested).toEqual(['https://app.example.test/mathlive-assets/mathlive.min.js']);
    expect(formats).toMatchObject({
      latex: 'x+1',
      asciiMath: 'x+1',
      plainText: 'x+1',
      spoken: 'x plus one',
      engineText: 'x+1',
    });
    expect(formats.mathml).toBe('<math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mi>x</mi><mo>+</mo><mn>1</mn></mrow></math>');
    expect(input.diagnostics()).toMatchObject({
      ready: true,
      role: 'accessible-input-adapter',
      replaces: [],
      source: 'https://app.example.test/mathlive-assets/mathlive.min.js',
      fontsSource: 'https://app.example.test/mathlive-assets/fonts/',
    });
    dom.window.close();
  });

  it('provides a labeled modal and preserves the existing engine-text contract', async () => {
    const { dom, input } = mockMathLiveDom();
    const pending = input.promptEquation({
      initialLatex: 'x+1',
      allowRemoteFallback: false,
      useSre: false,
    });
    await new Promise((resolveDelay) => dom.window.setTimeout(resolveDelay, 0));

    const dialog = dom.window.document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.querySelector('math-field')?.getAttribute('aria-label')).toBe('Equation editor');
    expect(dialog.querySelector('[role="status"]')).not.toBeNull();
    [...dialog.querySelectorAll('button')].find((button) => button.textContent === 'Insert equation').click();

    await expect(pending).resolves.toMatchObject({ latex: 'x+1', engineText: 'x+1' });
    expect(input.toEngineText({ asciiMath: '3×x − 2÷y ** 2' })).toBe('3*x - 2/y ^ 2');
    dom.window.close();
  });

  it('is wired as input inside existing STEM Lab and Math workflows, not as another math tool', () => {
    const algebra = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_algebracas.js'), 'utf8');
    const mathView = readFileSync(resolve(process.cwd(), 'view_math_source.jsx'), 'utf8');

    expect(algebra).toContain('window.__alloCASPure = __alloCASPure');
    expect(algebra).toContain("'data-math-input-launch': 'algebraCAS'");
    expect(algebra).toContain('authoritative solver and grader');
    expect(mathView).toContain('data-math-input-launch="math-work"');
    expect(mathView).toContain('does not generate problems or grade answers');
    expect(mathView).toContain('handleStudentInput(');
    expect(mathView).toContain('handleMathProblemEdit(');
  });
});
