import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require(resolve(modulesDir, 'react'));
const ReactDOMServer = require(resolve(modulesDir, 'react-dom/server'));
let formatInlineText;

beforeAll(() => {
  globalThis.React = window.React = React;
  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule('phase_k_helpers_module.js');
  formatInlineText = window.AlloModules.PhaseKHelpers.formatInlineText;
});

function renderMixedText(text) {
  const MathSymbol = ({ text: math }) => React.createElement('span', {
    'data-routed-math': math,
  }, math);
  const deps = {
    MathSymbol,
    warnLog: vi.fn(),
    focusMode: false,
  };
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement('div', null, formatInlineText(text, false, false, deps)),
  );
}

describe('unified semantic math rendering pipeline', () => {
  it('routes all standard inline and display delimiters through MathSymbol', () => {
    const html = renderMixedText('A $x+1$, B $$y^2$$, C \\(z/2\\), and D \\[\\frac{1}{x}\\].');

    expect((html.match(/data-routed-math=/g) || []).length).toBe(4);
    expect(html).toContain('data-routed-math="$x+1$"');
    expect(html).toContain('data-routed-math="$$y^2$$"');
    expect(html).toContain('data-routed-math="\\(z/2\\)"');
    expect(html).toContain('data-routed-math="\\[\\frac{1}{x}\\]"');
  });

  it('routes math nested inside rich-text emphasis through the same component', () => {
    const html = renderMixedText('**Use \\(x^2+1\\) here.**');
    expect(html).toContain('<strong');
    expect(html).toContain('data-routed-math="\\(x^2+1\\)"');
  });

  it('keeps the immediate custom fallback clean for backslash delimiters', () => {
    const processMathHTML = window.AlloModules.TextPipelineHelpers.processMathHTML;
    expect(processMathHTML('\\(x^2\\)')).toContain('<sup>2</sup>');
    expect(processMathHTML('\\(x^2\\)')).not.toContain('\\(');
    expect(processMathHTML('\\[\\frac{1}{2}\\]')).toContain('math-fraction');
    expect(processMathHTML('\\[\\frac{1}{2}\\]')).not.toContain('\\[');
  });

  it('ships complete offline visual assets and keeps grading/input responsibilities separate', () => {
    expect(statSync(resolve(process.cwd(), 'sre-assets/Temml-Local.css')).size).toBeGreaterThan(1000);
    expect(statSync(resolve(process.cwd(), 'sre-assets/Temml.woff2')).size).toBeGreaterThan(5000);

    const app = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
    const runtime = readFileSync(resolve(process.cwd(), 'sre_loader.js'), 'utf8');
    const algebra = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_algebracas.js'), 'utf8');
    expect(app).toContain("data-math-renderer={semanticMath ? 'temml-mathml' : 'custom-fallback'}");
    expect(runtime).toContain("role: 'semantic-math-renderer'");
    expect(runtime).toContain("'AlgebraCAS-grading'");
    expect(runtime).toContain("'MathLive-input'");
    expect(algebra).toContain('window.__alloCASPure = __alloCASPure');
  });
});
