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

    expect(source.match(/h\('(input|textarea|select)'/g)).toHaveLength(26);
    expect(source).toContain(
      "'aria-label': __alloT('stem.cephalopodlab.audio_volume', 'Audio volume')"
    );
    const container = renderSection('hunt', { _threeLoaded: true });
    ['Mode', 'Graphics', 'World seed'].forEach(name => {
      const label = Array.from(container.querySelectorAll('label')).find(element =>
        Array.from(element.childNodes)
          .filter(node => node.nodeType === 3)
          .map(node => node.textContent).join('').trim() === name
      );
      expect(label).toBeTruthy();
      expect(label.control).toBeTruthy();
      expect(label.control.labels).toHaveLength(1);
      expect(label.control.labels[0]).toBe(label);
      expect(label.control.hasAttribute('aria-label')).toBe(false);
    });
    expect(source).toContain("htmlFor: 'ch-explanation'");
    expect(source).toContain("id: 'ch-explanation'");
    expect(source).toContain("'aria-pressed': active");
    expect(source).toContain('wcag_2_2_aa_changes_apply_on_next_dive');
  });

  it.each([
    [false, 'Last dive'],
    [true, 'Reef mission complete'],
  ])('exposes the dive debrief title as a heading (mission complete: %s)', (missionComplete, title) => {
    const container = renderSection('hunt', {
      _threeLoaded: true,
      huntLastRun: {
        missionComplete, species: 'Common octopus', speciesId: 'commonOcto',
        seconds: 30, score: 0, seed: 2741,
        stats: { crabs: 0, clams: 0, fish: 0 }, events: [],
      },
    });
    const heading = Array.from(container.querySelectorAll('h3'))
      .find(element => element.textContent === title);
    expect(heading).toBeTruthy();
    expect(heading.parentElement.hasAttribute('aria-label')).toBe(false);
  });

  it('preserves byte-for-byte deploy parity', () => {
    expect(readFileSync(DEPLOY, 'utf8')).toBe(readFileSync(SOURCE, 'utf8'));
  });
});
