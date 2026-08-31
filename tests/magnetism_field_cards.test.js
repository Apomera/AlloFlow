import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { resetStemLab, loadTool, renderTool, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const TOOL_RELATIVE_PATH = process.env.MAGNETISM_FIELD_CARD_TOOL || 'stem_lab/stem_tool_magnetism.js';
const TOOL_PATH = resolve(process.cwd(), TOOL_RELATIVE_PATH);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const axe = require(resolve(MODULES_DIR, 'axe-core'));
const physics = require(TOOL_PATH);
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function seed(tab, extra = {}) {
  return Object.assign({
    tab, learningMode: 'guided', labFocus: false,
    notebookOpen: false, notebookPrediction: '', notebookClaim: '', notebookTrials: [],
    missionId: 'power_path', missionStarted: false, missionPanelOpen: false,
  }, extra);
}

function electroSeed(extra = {}) {
  return seed('electro', Object.assign({
    electroView: '2d', turns: 100, current: 2, core: false,
    currentDir: 1, windingDir: 1, electroBaseline: null,
    magLastChange: null, magChangeSeq: 0,
  }, extra));
}

function withStaticHost(tab, extra, callback) {
  resetStemLab();
  loadTool(TOOL_RELATIVE_PATH, 'magnetism');
  const html = renderTool('magnetism', { magnetism: seed(tab, extra) });
  const host = document.createElement('main');
  host.innerHTML = html;
  document.body.appendChild(host);
  let result;
  try {
    result = callback(host, html);
  } catch (error) {
    host.remove();
    throw error;
  }
  if (result && typeof result.then === 'function') return result.finally(() => host.remove());
  host.remove();
  return result;
}

function mountInteractive(cfg, initialSeed) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  function Harness() {
    const [toolData, setToolData] = React.useState({ magnetism: initialSeed });
    return cfg.render({
      React, toolData, setToolData,
      addToast: () => {}, announceToSR: () => {}, awardXP: () => {},
      callGemini: null, aiHintsEnabled: false, gradeLevel: '7th Grade',
      t: (key, fallback) => fallback || key,
    });
  }
  act(() => { root.render(React.createElement(Harness)); });
  return {
    host,
    close() {
      try { act(() => root.unmount()); } catch (_) {}
      host.remove();
    },
  };
}

describe('magnetism Field Card visual system', () => {
  it('creates stable, readable, collision-resistant title ids', () => {
    const title = 'Earth dynamo and your compass';
    const first = physics.fieldCardTitleId(title);
    expect(first).toBe(physics.fieldCardTitleId(title));
    expect(first).toMatch(/^mag-card-title-earth-dynamo-and-your-compass-[a-z0-9]+$/);
    expect(physics.fieldCardTitleId('Earth dynamo and your compass!')).not.toBe(first);
    expect(physics.fieldCardTitleId('')).toMatch(/^mag-card-title-magnetism-investigation-/);
    expect(physics.fieldCardTitleId('A'.repeat(100)).length).toBeLessThan(80);
  });

  it('gives every station at least one visually branded, title-associated experiment region', () => {
    const tabs = ['field', 'electro', 'motor', 'induce', 'materials', 'crane', 'maze', 'transformer', 'earth', 'quiz'];
    tabs.forEach((tab) => {
      withStaticHost(tab, {}, (host) => {
        const panel = host.querySelector('#mag-panel-' + tab);
        const cards = [...panel.querySelectorAll('[data-magnetism-field-card="true"]')];
        expect(cards.length, tab + ' should render a Field Card').toBeGreaterThan(0);
        cards.forEach((card) => {
          const heading = card.querySelector(':scope > .mag-card-head > .mag-card-title');
          const signal = card.querySelector(':scope > .mag-card-head > .mag-card-signal');
          expect(card.getAttribute('role')).toBe('region');
          expect(card.getAttribute('aria-labelledby')).toBe(heading.id);
          expect(card.getAttribute('aria-label')).toBe(heading.textContent);
          expect(heading.textContent.trim().length).toBeGreaterThan(0);
          expect(signal.getAttribute('aria-hidden')).toBe('true');
          expect(signal.querySelectorAll('i')).toHaveLength(2);
          expect(card.style.getPropertyValue('--mag-accent')).toBeTruthy();
        });
      });
    });
  });

  it('keeps title ids unique within multi-card stations and preserves custom accent identity', () => {
    withStaticHost('transformer', {}, (host) => {
      const cards = [...host.querySelectorAll('#mag-panel-transformer [data-magnetism-field-card="true"]')];
      expect(cards.length).toBeGreaterThanOrEqual(3);
      const ids = cards.map((card) => card.querySelector('.mag-card-title').id);
      expect(new Set(ids).size).toBe(ids.length);
      const gridCard = cards.find((card) => card.textContent.includes('Why the grid transforms voltage'));
      expect(gridCard.style.getPropertyValue('--mag-accent')).toBe('#38bdf8');
      const standardCard = cards.find((card) => card.textContent.includes('Turns ratio'));
      expect(standardCard.style.getPropertyValue('--mag-accent')).toBe('#38bdf8');
    });
    withStaticHost('electro', {}, (host) => {
      const standardCard = host.querySelector('#mag-panel-electro [data-magnetism-field-card="true"]');
      expect(standardCard.style.getPropertyValue('--mag-accent')).toBe('#f59e0b');
    });
  });

  it('keeps the region-heading relationship stable through live experiment updates', () => {
    resetStemLab();
    const cfg = loadTool(TOOL_RELATIVE_PATH, 'magnetism');
    const live = mountInteractive(cfg, electroSeed());
    try {
      const initialCard = live.host.querySelector('#mag-panel-electro [data-magnetism-field-card="true"]');
      const initialTitleId = initialCard.getAttribute('aria-labelledby');
      expect(initialCard.querySelector('#' + initialTitleId).textContent).toBe('Build an electromagnet');

      const turnsLabel = [...live.host.querySelectorAll('label')].find((label) => label.textContent.includes('Turns of wire'));
      const turnsInput = live.host.querySelector('#' + turnsLabel.htmlFor);
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      act(() => {
        valueSetter.call(turnsInput, '150');
        turnsInput.dispatchEvent(new Event('input', { bubbles: true }));
        turnsInput.dispatchEvent(new Event('change', { bubbles: true }));
      });

      const updatedCard = live.host.querySelector('#mag-panel-electro [data-magnetism-field-card="true"]');
      expect(updatedCard.getAttribute('aria-labelledby')).toBe(initialTitleId);
      expect(updatedCard.querySelector('#' + initialTitleId).textContent).toBe('Build an electromagnet');
      expect(live.host.querySelector('.mag-range-value').textContent).toBe('150');
    } finally {
      live.close();
    }
  });

  it('includes layered, responsive, motion-safe, hover, and forced-color treatments', () => {
    const source = readFileSync(TOOL_PATH, 'utf8');
    expect(source).toContain('.mag-root .mag-card{--mag-accent:#f43f5e;position:relative;isolation:isolate');
    expect(source).toContain('background-image:radial-gradient(circle at 100% 0');
    expect(source).toContain('@keyframes mag-card-enter');
    expect(source).toContain('@keyframes mag-card-field-pulse');
    expect(source).toContain('@media(hover:hover){.mag-root .mag-card:hover');
    expect(source).toContain('@media(max-width:420px){.mag-root .mag-card{padding:11px');
    expect(source).toContain('@media(forced-colors:active){.mag-root .mag-card:before{background:CanvasText}');
    expect(source).toContain('@media(prefers-reduced-motion:reduce)');
  });

  it('passes automated WCAG A/AA checks as a multi-card station panel', async () => {
    await withStaticHost('induce', {}, async (host) => {
      const cards = [...host.querySelectorAll('#mag-panel-induce [role="region"][aria-labelledby]')];
      expect(cards.length).toBeGreaterThanOrEqual(2);
      const explainer = cards.find((card) => card.textContent.includes('Why this runs the world'));
      expect(explainer).toBeTruthy();
      const results = await axe.run(explainer, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
        rules: { 'color-contrast': { enabled: false } },
      });
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    });
  }, 15000);
});
