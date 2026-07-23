import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  loadTool,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_cephalopodlab.js';
const DEPLOY =
  'prismflow-deploy/public/stem_lab/stem_tool_cephalopodlab.js';

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

describe('Cephalopod Lab form-control accessibility', () => {
  it('names the pre-dive audio volume and identifies WCAG 2.2 AA', () => {
    const container = renderSection('hunt', { _threeLoaded: true });
    const volume = container.querySelector(
      'input[type="range"][aria-label="Audio volume"]'
    );

    expect(volume).toBeTruthy();
    expect(container.textContent).toContain('WCAG 2.2 AA');
    expect(container.textContent).not.toContain('WCAG 2.1 AA');
  });

  it('associates the conditional camouflage explanation with a visible label', () => {
    const container = renderSection('camoHunt', {
      camoHunt: {
        substrate: 'sand',
        brightness: 50,
        hue: 50,
        coarseness: 50,
        hypothesis: '',
        stuckRevealed: false,
        understood: true,
        explanation: '',
        log: [],
      },
    });
    const explanation = container.querySelector('#ch-explanation');

    expect(explanation).toBeTruthy();
    expect(explanation.labels).toHaveLength(1);
    expect(explanation.labels[0].textContent).toBe('Explain your reasoning');
  });

  it('keeps the complete form inventory and repaired names explicit in source', () => {
    const source = readFileSync(SOURCE, 'utf8');

    expect(source.match(/h\('(input|textarea|select)'/g)).toHaveLength(21);
    expect(source).toContain(
      "'aria-label': __alloT('stem.cephalopodlab.audio_volume', 'Audio volume')"
    );
    expect(source).toContain("htmlFor: 'ch-explanation'");
    expect(source).toContain("id: 'ch-explanation'");
    expect(source).toContain('wcag_2_2_aa_changes_apply_on_next_dive');
  });

  it('preserves byte-for-byte deploy parity', () => {
    expect(readFileSync(DEPLOY, 'utf8')).toBe(readFileSync(SOURCE, 'utf8'));
  });
});
