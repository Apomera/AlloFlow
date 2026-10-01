import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  loadTool,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_chembalance.js';
const DEPLOY = 'desktop/web-app/public/stem_lab/stem_tool_chembalance.js';
const sourceText = readFileSync(SOURCE, 'utf8');

function renderSubtool(subtool, data = {}) {
  const container = document.createElement('div');
  container.innerHTML = renderTool('chemBalance', {
    chemBalance: { subtool, _everPicked: true, ...data },
  });
  return container;
}

beforeEach(() => {
  window.localStorage.clear();
  resetStemLab();
  loadTool(SOURCE, 'chemBalance');
});

describe('Chemistry Lab browser-like accessibility regressions', () => {
  it('provides a keyboard-ready guided learning path on the hub', () => {
    const hub = document.createElement('div');
    hub.innerHTML = renderTool('chemBalance', { chemBalance: {} });
    const region = hub.querySelector('#chem-learning-path-title')?.parentElement;
    const steps = region ? Array.from(region.querySelectorAll('button')) : [];

    expect(region).toBeTruthy();
    expect(steps).toHaveLength(4);
    for (const step of steps) {
      expect(step.type).toBe('button');
      expect(step.textContent.trim()).not.toBe('');
      expect(step.className).toContain('min-h-[64px]');
      expect(step.className).toContain('focus-visible:ring-2');
    }
  });

  it('adapts the path to grade band and exposes unique competency progress', () => {
    const k2 = document.createElement('div');
    k2.innerHTML = renderTool('chemBalance', { chemBalance: {} }, { gradeLevel: '2nd Grade' });
    const pathButtons = Array.from(k2.querySelectorAll('#chem-learning-path-title + ol button'));
    const progress = k2.querySelector('[aria-labelledby="chem-progress-title"]');

    expect(pathButtons[0]?.textContent).toContain('See matter');
    expect(progress).toBeTruthy();
    expect(progress.textContent).toContain('unique completed items');
    expect(progress.querySelectorAll('[role="progressbar"]')).toHaveLength(3);
    for (const bar of progress.querySelectorAll('[role="progressbar"]')) {
      expect(Number(bar.getAttribute('aria-valuemax'))).toBeGreaterThan(0);
      expect(Number(bar.getAttribute('aria-valuenow'))).toBeGreaterThanOrEqual(0);
    }
  });

  it('marks the active category item for assistive technology', () => {
    const reference = renderSubtool('periodic', { _activeCategory: 'reference' });
    const current = reference.querySelector('nav[aria-label="Chemistry Lab sections"] [aria-current="page"]');

    expect(current).toBeTruthy();
    expect(current.type).toBe('button');
    expect(current.className).toContain('min-h-[40px]');
  });

  it('keeps challenge and battle answers keyboard-operable with state semantics', () => {
    const challengeAnswers = Array.from(renderSubtool('challenge').querySelectorAll('button[aria-disabled]'));
    const battleAnswers = Array.from(renderSubtool('battle', { _battleActive: true }).querySelectorAll('button[aria-disabled]'));

    expect(challengeAnswers.length).toBeGreaterThan(0);
    expect(battleAnswers.length).toBeGreaterThan(0);
    for (const answer of challengeAnswers.concat(battleAnswers)) {
      expect(answer.type).toBe('button');
      expect(answer.getAttribute('aria-disabled')).toBe('false');
      expect(answer.className).toContain('min-h-[40px]');
      expect(answer.className).toContain('focus-visible:ring-2');
    }
  });

  it('exposes AI loading and verification semantics', () => {
    const ai = renderSubtool('balance', { _showAI: true, _chemAIResp: 'Use atom conservation.' });
    const panel = ai.querySelector('#chem-ai-panel');
    const response = panel?.querySelector('div[role="status"][aria-live="polite"]');

    expect(panel).toBeTruthy();
    expect(panel.getAttribute('aria-busy')).toBe('false');
    expect(response).toBeTruthy();
    expect(response.getAttribute('aria-live')).toBe('polite');
    expect(panel.textContent).toContain('AI-generated guidance is a study hint');
  });

  it('keeps the source and deploy copies byte-identical and derives overview counts from data', () => {
    expect(readFileSync(DEPLOY, 'utf8')).toBe(sourceText);
    expect(sourceText).toContain("ALL_PRESETS.length + ' equation presets across '");
    expect(sourceText).toContain("FAMOUS_REACTIONS.length + ' Famous Reactions");
    expect(sourceText).toContain("CHEM_HISTORY.length + ' major events'");
  });
});