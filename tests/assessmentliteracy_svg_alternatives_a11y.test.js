import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  loadTool,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_assessmentliteracy.js';
const DEPLOY =
  'prismflow-deploy/public/stem_lab/stem_tool_assessmentliteracy.js';

beforeEach(() => {
  window.localStorage.clear();
  resetStemLab();
  loadTool(SOURCE, 'assessmentLiteracy');
});

describe('Assessment Literacy SVG alternatives', () => {
  it('describes the live confidence interval with current values and state', () => {
    const container = document.createElement('div');
    container.innerHTML = renderTool('assessmentLiteracy', {
      assessmentLiteracy: {
        view: 'inquiry',
        relIQ: {
          reliability: 0.85,
          sem: 5,
          observed: 100,
          stakes: 5,
          hypothesis: '',
          stuckRevealed: false,
          understood: false,
          explanation: '',
          log: [],
        },
      },
    });

    const diagram = container.querySelector(
      'svg[aria-label^="Confidence interval diagram"]'
    );
    expect(diagram).toBeTruthy();
    expect(diagram.getAttribute('role')).toBe('img');
    expect(diagram.getAttribute('aria-label')).toBe(
      'Confidence interval diagram: observed score 100, 95% confidence interval 90.2 to 109.8, Use with CI.'
    );
  });

  it('classifies every SVG declaration with an accessible alternative', () => {
    const lines = readFileSync(SOURCE, 'utf8').split(/\r?\n/);
    const declarations = [];
    lines.forEach((line, index) => {
      if (/h\(\s*['"]svg['"]/.test(line)) {
        declarations.push({
          line: index + 1,
          context: lines.slice(Math.max(0, index - 1), index + 8).join(' '),
        });
      }
    });

    expect(declarations).toHaveLength(7);
    for (const declaration of declarations) {
      expect(
        /aria-label|aria-labelledby/.test(declaration.context),
        `unnamed SVG declaration at source line ${declaration.line}`
      ).toBe(true);
    }
  });

  it('preserves byte-for-byte deploy parity', () => {
    expect(readFileSync(DEPLOY, 'utf8')).toBe(readFileSync(SOURCE, 'utf8'));
  });
});
