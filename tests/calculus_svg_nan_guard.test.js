import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE_FILE = 'stem_lab/stem_tool_calculus.js';
const PUBLIC_FILE = 'desktop/web-app/public/stem_lab/stem_tool_calculus.js';

function read(path) {
  return readFileSync(path, 'utf8');
}

function renderCalculus(toolData) {
  loadTool(SOURCE_FILE, 'calculus');
  return renderTool('calculus', toolData || {});
}

function expectCleanRender(toolData) {
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  let html;
  let errors;
  try {
    html = renderCalculus(toolData);
    errors = errorSpy.mock.calls.map((args) => args.join(' ')).join('\n');
  } finally {
    errorSpy.mockRestore();
  }

  expect(html).not.toMatch(/\bNaN\b|Infinity/);
  expect(errors).not.toMatch(/Received NaN/);
  return html;
}

describe('Calculus SVG numeric guards', () => {
  beforeEach(() => resetStemLab());

  it('keeps source and public copies aligned', () => {
    expect(read(PUBLIC_FILE)).toBe(read(SOURCE_FILE));
  });

  it('does not leak NaN into the default SVG render', () => {
    expectCleanRender({});
  });

  it('falls back safely when numeric state is blank, malformed, or degenerate', () => {
    expectCleanRender({
      calculus: {
        a: '',
        b: 'bad',
        c: null,
        xMin: '',
        xMax: '',
        x0: 'nope',
        n: 0,
        secantH: 0,
        tab: 'derivative'
      }
    });
  });

  it('keeps every primary calculus tab free of non-finite SVG coordinates', () => {
    ['integral', 'derivative', 'visualize', 'challenge', 'discover'].forEach((tab) => {
      const html = expectCleanRender({ calculus: { tab } });
      expect(html).toContain('Calculus');
    });
  });

  it('handles all integral approximation modes with awkward ranges', () => {
    ['left', 'midpoint', 'right', 'trapezoid', 'simpson'].forEach((mode) => {
      expectCleanRender({
        calculus: {
          tab: 'integral',
          mode,
          xMin: 2,
          xMax: 2,
          n: mode === 'simpson' ? 3 : 0
        }
      });
    });
  });
});
