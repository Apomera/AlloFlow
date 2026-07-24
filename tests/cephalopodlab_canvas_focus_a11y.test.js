import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  loadTool,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_cephalopodlab.js';
const DEPLOY =
  'desktop/web-app/public/stem_lab/stem_tool_cephalopodlab.js';

function renderActiveHunt() {
  const container = document.createElement('div');
  container.innerHTML = renderTool('cephalopodLab', {
    cephalopodLab: {
      activeSection: 'hunt',
      _threeLoaded: true,
      hunt3DActive: true,
    },
  });
  return container;
}

beforeEach(() => {
  window.localStorage.clear();
  resetStemLab();
  loadTool(SOURCE, 'cephalopodLab');
});

describe('Cephalopod Lab canvas and focus accessibility', () => {
  it('names the gameplay canvas and links keyboard instructions', () => {
    const container = renderActiveHunt();
    const canvas = container.querySelector('canvas[role="application"]');
    const instructions = container.querySelector(
      '#cl-hunt-canvas-instructions'
    );

    expect(canvas).toBeTruthy();
    expect(canvas.getAttribute('aria-label')).toContain(
      '3D octopus hunt simulator'
    );
    expect(canvas.getAttribute('aria-describedby')).toBe(
      'cl-hunt-canvas-instructions'
    );
    expect(instructions.textContent).toContain('Tab to or click the canvas');
    expect(canvas.textContent).toContain('Interactive 3D octopus hunt');
  });

  it('retains explicit focus styling without suppressing the outline', () => {
    const source = readFileSync(SOURCE, 'utf8');

    expect(source).not.toContain("outline: 'none'");
    expect(source).toContain(
      "event.currentTarget.style.outline = '3px solid #fde68a'"
    );
    expect(source).toContain(
      "event.currentTarget.style.boxShadow = '0 0 0 6px rgba(15,23,42,0.9)'"
    );
  });

  it('classifies all four canvas declarations by purpose', () => {
    const lines = readFileSync(SOURCE, 'utf8').split(/\r?\n/);
    const declarations = [];

    lines.forEach((line, index) => {
      if (
        /h\(\s*['"]canvas['"]/.test(line) ||
        /createElement\(\s*['"]canvas['"]/.test(line)
      ) {
        declarations.push(
          lines.slice(Math.max(0, index - 1), index + 7).join(' ')
        );
      }
    });

    expect(declarations).toHaveLength(4);
    expect(
      declarations.filter((context) => /aria-hidden/.test(context))
    ).toHaveLength(2);
    expect(
      declarations.filter(
        (context) => /role/.test(context) && /aria-label/.test(context)
      )
    ).toHaveLength(2);
  });

  it('preserves byte-for-byte deploy parity', () => {
    expect(readFileSync(DEPLOY, 'utf8')).toBe(readFileSync(SOURCE, 'utf8'));
  });
});
