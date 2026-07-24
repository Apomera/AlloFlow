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

function renderSection(activeSection, data = {}) {
  const container = document.createElement('div');
  container.innerHTML = renderTool('cephalopodLab', {
    cephalopodLab: { activeSection, ...data },
  });
  return container;
}

beforeEach(() => {
  window.localStorage.clear();
  resetStemLab();
  loadTool(SOURCE, 'cephalopodLab');
});

describe('Cephalopod Lab SVG alternatives', () => {
  it('describes current counter-illumination values and verdict', () => {
    const container = renderSection('biolux', {
      bioluxView: 'counter',
      bioluxDepthFactor: 70,
      bioluxBellyIntensity: 40,
    });
    const diagram = container.querySelector('svg[role="img"]');

    expect(diagram.getAttribute('aria-label')).toBe(
      'Counter-illumination simulation: downwelling light 70 percent, ventral photophore intensity 40 percent, match 70 percent. Close, faint silhouette visible.'
    );
  });

  it('describes selected anatomy and timeline states with keyboard alternatives', () => {
    const anatomy = renderSection('anatomy').querySelector('svg[role="img"]');
    const timeline = renderSection('time').querySelector('svg[role="img"]');

    expect(anatomy.getAttribute('aria-label')).toContain('Selected region:');
    expect(anatomy.getAttribute('aria-label')).toContain(
      'Use the All regions buttons below to explore.'
    );
    expect(timeline.getAttribute('aria-label')).toContain(
      'Cephalopod evolutionary timeline from 538 million years ago to present'
    );
    expect(timeline.getAttribute('aria-label')).toContain(
      'Use the All eras buttons below to explore.'
    );
  });

  it('describes the camouflage inquiry values and discrete visual state', () => {
    const diagram = renderSection('camoHunt', {
      camoHunt: {
        substrate: 'sand',
        brightness: 75,
        hue: 40,
        coarseness: 15,
        hypothesis: '',
        stuckRevealed: false,
        understood: false,
        explanation: '',
        log: [],
      },
    }).querySelector('svg[role="img"]');

    expect(diagram.getAttribute('aria-label')).toContain(
      'brightness 75 percent, hue 40 percent, coarseness 15 percent, hidden.'
    );
  });

  it('classifies all five SVG declarations as informative or decorative', () => {
    const lines = readFileSync(SOURCE, 'utf8').split(/\r?\n/);
    const declarations = [];

    lines.forEach((line, index) => {
      if (/h\(\s*['"]svg['"]/.test(line)) {
        declarations.push(
          lines.slice(Math.max(0, index - 1), index + 8).join(' ')
        );
      }
    });

    expect(declarations).toHaveLength(5);
    for (const context of declarations) {
      const decorative = /aria-hidden/.test(context);
      const informative = /role:\s*['"]img['"]/.test(context) &&
        /aria-label/.test(context);
      expect(decorative || informative).toBe(true);
    }
  });

  it('preserves byte-for-byte deploy parity', () => {
    expect(readFileSync(DEPLOY, 'utf8')).toBe(readFileSync(SOURCE, 'utf8'));
  });
});
