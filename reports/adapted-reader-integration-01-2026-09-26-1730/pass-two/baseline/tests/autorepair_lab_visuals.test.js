// Auto Repair Shop — Repair Lab visual, state, and accessibility contract.

import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const CANONICAL = 'stem_lab/stem_tool_autorepair.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_autorepair.js';
const FILE = process.env.AUTOREPAIR_LAB_FILE || CANONICAL;
const ID = 'autoRepair';
const SOURCE = readFileSync(resolve(process.cwd(), FILE), 'utf8');

function extractArray(source, name) {
  const marker = 'var ' + name + ' =';
  const markerAt = source.indexOf(marker);
  const start = source.indexOf('[', markerAt);
  if (markerAt < 0 || start < 0) throw new Error('Missing ' + name + ' fixture');

  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }
    if (character === '[') depth += 1;
    if (character === ']' && --depth === 0) {
      return Function('"use strict"; return (' + source.slice(start, index + 1) + ');')();
    }
  }
  throw new Error('Unterminated ' + name + ' fixture');
}

const LABS = extractArray(SOURCE, 'LAB_SCENARIOS');
const MISFIRE_RESULTS = [
  { grade: 'A', score: '50 / 50 (100%)', mastery: 'passed', answers: { s1: 'b', s2: 'a', s3: 'b', s4: 'a', s5: 'a' }, states: [5, 0, 0], alternatives: 0 },
  { grade: 'B', score: '40 / 50 (80%)', mastery: 'passed', answers: { s1: 'b', s2: 'b', s3: 'b', s4: 'a', s5: 'a' }, states: [4, 0, 1], alternatives: 1 },
  { grade: 'C', score: '35 / 50 (70%)', mastery: 'passed', answers: { s1: 'b', s2: 'b', s3: 'b', s4: 'b', s5: 'a' }, states: [3, 1, 1], alternatives: 2 },
  { grade: 'D', score: '30 / 50 (60%)', mastery: 'review', answers: { s1: 'a', s2: 'a', s3: 'b', s4: 'a', s5: 'a' }, states: [4, 0, 1], alternatives: 1 },
  { grade: 'F', score: '-25 / 50 (-50%)', mastery: 'review', answers: { s1: 'a', s2: 'c', s3: 'a', s4: 'b', s5: 'b' }, states: [0, 1, 4], alternatives: 5 }
];

function hostFor(html) {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

function lab(extra, theme) {
  const html = renderTool(ID, {
    autoRepair: Object.assign({ view: 'lab' }, extra || {})
  }, theme);
  return { html, host: hostFor(html) };
}

function bestChoice(step) {
  return step.choices.reduce((best, choice) => choice.score > best.score ? choice : best, step.choices[0]);
}

function answersBefore(scenario, stepIndex) {
  return Object.fromEntries(scenario.steps.slice(0, stepIndex).map((step) => [step.id, bestChoice(step).id]));
}

function mediaText(rule) {
  return rule.conditionText || rule.media?.mediaText || '';
}

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, ID);
});

describe('AutoRepair Repair Lab visual workbench', () => {
  it('renders a six-case catalog and deduplicates two known completions', () => {
    const completed = [LABS[0].id, LABS[0].id, 'retired-case', LABS[2].id];
    const { host } = lab({ labsCompleted: completed });
    const shell = host.querySelector('main.ar-lab-shell[data-ar-lab-state="picker"][data-ar-lab-view="catalog"]');
    const picker = shell.querySelector('[data-ar-lab-picker][aria-labelledby="autorepair-lab-picker-title"]');
    const cards = [...picker.querySelectorAll('button[data-ar-lab-scenario]')];
    const progress = shell.querySelector('[data-ar-lab-completion="2"][role="progressbar"]');

    expect(cards).toHaveLength(6);
    expect(cards.filter((card) => card.dataset.arScenarioState === 'completed')).toHaveLength(2);
    expect(cards.filter((card) => card.dataset.arScenarioState === 'available')).toHaveLength(4);
    expect(cards.map((card) => card.dataset.arLabScenario)).toEqual(LABS.map((scenario) => scenario.id));
    expect(cards.every((card) =>
      card.tagName === 'BUTTON' && card.type === 'button' && card.textContent.trim().length > 20
    )).toBe(true);
    expect(progress.getAttribute('aria-valuemin')).toBe('0');
    expect(progress.getAttribute('aria-valuemax')).toBe('6');
    expect(progress.getAttribute('aria-valuenow')).toBe('2');
    expect(progress.getAttribute('aria-valuetext')).toBe('2 of 6 cases complete');
    expect(progress.firstElementChild.style.width).toBe('33%');
  });

  it('renders all 24 authored decision states with evidence before labelled native choices', () => {
    let renderedStates = 0;
    for (const scenario of LABS) {
      for (let index = 0; index < scenario.steps.length; index += 1) {
        renderedStates += 1;
        const step = scenario.steps[index];
        const { html, host } = lab({
          labId: scenario.id,
          labStep: index,
          labAnswers: answersBefore(scenario, index)
        });
        const shell = host.querySelector('main[data-ar-lab-state="working"][data-ar-lab-view="decision"]');
        const workbench = shell.querySelector('[data-ar-lab-run="' + scenario.id + '"]');
        const decision = workbench.querySelector('[data-ar-lab-decision="' + step.id + '"]');
        const question = decision.querySelector('[data-ar-lab-question="' + step.id + '"]');
        const choices = decision.querySelector('[data-ar-lab-choices="' + step.id + '"][role="group"]');
        const buttons = [...choices.querySelectorAll('button[data-ar-lab-choice]')];
        const evidence = decision.querySelector('[data-ar-lab-evidence-summary]');
        const dossier = shell.querySelector('[data-ar-lab-case="' + scenario.id + '"][role="region"]');
        const stages = [...decision.querySelectorAll('[data-ar-lab-stage]')];
        const progress = decision.querySelector('[data-ar-lab-progress="' + index + '"][role="progressbar"]');

        expect([...workbench.children].indexOf(dossier)).toBeLessThan([...workbench.children].indexOf(decision));
        expect(question.getAttribute('tabindex')).toBe('-1');
        expect(choices.getAttribute('aria-labelledby')).toBe(question.querySelector('h2').id);
        expect(buttons).toHaveLength(3);
        expect(buttons.map((button) => button.dataset.arLabChoice)).toEqual(step.choices.map((choice) => choice.id));
        expect(buttons.every((button) =>
          button.tagName === 'BUTTON' && button.type === 'button' &&
          button.getAttribute('role') === null &&
          button.getAttribute('aria-checked') === null &&
          button.textContent.trim().length > 1 &&
          !Object.keys(button.dataset).some((key) => /score|correct|best/i.test(key))
        )).toBe(true);
        expect(evidence).toBeTruthy();
        expect([...decision.querySelectorAll('[data-ar-lab-evidence-summary], [data-ar-lab-choices]')][0]).toBe(evidence);
        expect(dossier.getAttribute('tabindex')).toBe('-1');
        expect(host.querySelector('#' + dossier.getAttribute('aria-labelledby'))).toBeTruthy();
        expect(dossier.querySelectorAll('.ar-lab-case-fact')).toHaveLength(6);
        expect(dossier.querySelectorAll('.ar-lab-symptoms li')).toHaveLength(scenario.symptoms.length);
        expect(stages).toHaveLength(scenario.steps.length);
        expect(stages.filter((stage) => stage.dataset.arStageState === 'complete')).toHaveLength(index);
        expect(stages.filter((stage) => stage.dataset.arStageState === 'current')).toHaveLength(1);
        expect(stages.filter((stage) => stage.dataset.arStageState === 'upcoming')).toHaveLength(scenario.steps.length - index - 1);
        expect(stages.find((stage) => stage.dataset.arStageState === 'current').getAttribute('aria-current')).toBe('step');
        expect(progress.getAttribute('aria-valuemax')).toBe(String(scenario.steps.length));
        expect(progress.getAttribute('aria-valuenow')).toBe(String(index));
        expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
      }
    }
    expect(renderedStates).toBe(24);
  });

  it('distinguishes excellent, acceptable, and costly prior moves', () => {
    for (const fixture of [
      { step: 1, answers: { s1: 'b' }, state: 'excellent', label: 'Excellent move' },
      { step: 4, answers: { s1: 'b', s2: 'a', s3: 'b', s4: 'b' }, state: 'acceptable', label: 'Acceptable move' },
      { step: 1, answers: { s1: 'a' }, state: 'costly', label: 'Costly move' }
    ]) {
      const { host } = lab({ labId: 'lab-misfire', labStep: fixture.step, labAnswers: fixture.answers });
      const move = host.querySelector('[data-ar-lab-last-move="' + fixture.state + '"]');
      expect(move).toBeTruthy();
      expect(move.textContent).toContain('Last move: ' + fixture.label);
    }
  });

  it('renders deterministic A/B/C/D/F misfire debriefs and decision trails', () => {
    for (const fixture of MISFIRE_RESULTS) {
      const { html, host } = lab({
        labId: 'lab-misfire',
        labStep: 5,
        labAnswers: fixture.answers,
        labsCompleted: ['lab-misfire']
      });
      const shell = host.querySelector('main[data-ar-lab-state="results"][data-ar-lab-view="results"]');
      expect(shell, 'Expected results shell for grade ' + fixture.grade + '; rendered state: ' +
        (host.querySelector('[data-ar-lab-shell]')?.dataset.arLabState || 'missing') + '; output: ' +
        host.textContent.trim().slice(0, 240)).toBeTruthy();
      const summary = shell.querySelector('[data-ar-lab-results="lab-misfire"]');
      const feedback = [...shell.querySelectorAll('[data-ar-lab-feedback]')];

      expect(summary.dataset.arLabMastery).toBe(fixture.mastery);
      expect(summary.querySelector('[data-ar-lab-grade]').dataset.arLabGrade).toBe(fixture.grade);
      expect(summary.querySelector('[data-ar-lab-score]').textContent.trim()).toBe(fixture.score);
      expect(feedback).toHaveLength(5);
      expect(feedback.filter((row) => row.dataset.arFeedbackState === 'best')).toHaveLength(fixture.states[0]);
      expect(feedback.filter((row) => row.dataset.arFeedbackState === 'acceptable')).toHaveLength(fixture.states[1]);
      expect(feedback.filter((row) => row.dataset.arFeedbackState === 'costly')).toHaveLength(fixture.states[2]);
      expect(shell.querySelectorAll('[data-ar-lab-best-choice]')).toHaveLength(fixture.alternatives);
      expect(shell.querySelectorAll('[data-ar-lab-best-confirmation]')).toHaveLength(5 - fixture.alternatives);
      expect(shell.querySelector('[data-ar-lab-review="lab-misfire"]')).toBeTruthy();
      expect(shell.querySelector('[data-ar-lab-truth="lab-misfire"]')).toBeTruthy();
      const scoreMeter = summary.querySelector('[role="progressbar"][aria-label="Lab attempt score"]');
      if (fixture.grade === 'F') {
        expect(scoreMeter.getAttribute('aria-valuenow')).toBe('0');
        expect(scoreMeter.getAttribute('aria-valuetext')).toContain('raw diagnostic score 50 percent below zero');
      }
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }
  });

  it('fails stale persisted state safely into a valid catalog, decision, or debrief', () => {
    const catalog = lab({
      labId: 'retired-case',
      labStep: 'not-a-step',
      labAnswers: 'not-an-object',
      labsCompleted: 'not-an-array'
    });
    expect(catalog.host.querySelector('[data-ar-lab-state="picker"]')).toBeTruthy();
    expect(catalog.host.querySelector('[data-ar-lab-completion="0"]')).toBeTruthy();

    const first = LABS[0];
    const decision = lab({ labId: first.id, labStep: -20, labAnswers: null });
    expect(decision.host.querySelector('[data-ar-lab-state="working"] [data-ar-lab-progress="0"]')).toBeTruthy();
    expect(decision.host.querySelector('[data-ar-lab-question="' + first.steps[0].id + '"]')).toBeTruthy();

    const clamped = lab({ labId: first.id, labStep: 999, labAnswers: { stale: 'retired-choice' } });
    expect(clamped.host.querySelector('[data-ar-lab-state="working"] [data-ar-lab-progress="0"]')).toBeTruthy();
    expect(clamped.host.querySelector('[data-ar-lab-state="results"]')).toBeFalsy();

    const debrief = lab({
      labId: first.id,
      labStep: 999,
      labAnswers: answersBefore(first, first.steps.length),
      labsCompleted: [first.id]
    });
    expect(debrief.host.querySelector('[data-ar-lab-state="results"]'),
      'Expected complete valid prefix to render results; rendered state: ' +
      (debrief.host.querySelector('[data-ar-lab-shell]')?.dataset.arLabState || 'missing') + '; output: ' +
      debrief.host.textContent.trim().slice(0, 240)).toBeTruthy();
    expect(debrief.host.querySelectorAll('[data-ar-feedback-state="best"]')).toHaveLength(first.steps.length);
    expect(debrief.html).not.toMatch(/\b(?:undefined|NaN)\b/);
  });

  it('preserves the workbench hierarchy in light, dark, and high-contrast themes', () => {
    for (const theme of [
      { isDark: false, isContrast: false },
      { isDark: true, isContrast: false },
      { isDark: false, isContrast: true }
    ]) {
      const expectedStrongText = theme.isDark || theme.isContrast ? '#000000' : '#ffffff';
      const { html, host } = lab({ labId: 'lab-misfire', labStep: 0, labAnswers: {} }, theme);
      const shell = host.querySelector('.ar-lab-shell');
      const stateChip = shell.querySelector('[data-ar-lab-state-chip]');

      expect(shell.querySelector('[data-ar-lab-hero]')).toBeTruthy();
      expect(shell.querySelector('[data-ar-lab-decision]')).toBeTruthy();
      expect(shell.querySelector('[data-ar-lab-evidence-summary]')).toBeTruthy();
      expect(shell.querySelector('[data-ar-lab-case]')).toBeTruthy();
      expect(stateChip.getAttribute('style')).toContain('color:' + expectedStrongText);
      expect(html).not.toMatch(/\b(?:undefined|NaN)\b/);
    }
  });

  it('guards responsive, touch, reduced-motion, forced-color, and print CSSOM rules', () => {
    lab({ labId: 'lab-misfire', labStep: 0, labAnswers: {} });
    const style = document.getElementById('allo-ar-flair-css');
    const topRules = [...style.sheet.cssRules];
    const touch = topRules.find((rule) => rule.selectorText === '.ar-lab-shell button, .ar-lab-case-link');
    expect(parseFloat(touch.style.getPropertyValue('min-height'))).toBeGreaterThanOrEqual(44);

    const mediaRules = (pattern) => topRules
      .filter((rule) => pattern.test(mediaText(rule)))
      .flatMap((rule) => [...(rule.cssRules || [])]);
    const mediumRules = mediaRules(/max-width:\s*860px/i);
    expect(mediumRules.some((rule) =>
      rule.selectorText === '.ar-lab-picker-grid, .ar-lab-workbench' &&
      rule.style.getPropertyValue('grid-template-columns') === '1fr'
    )).toBe(true);
    expect(mediumRules.some((rule) =>
      rule.selectorText === '.ar-lab-dossier' && rule.style.getPropertyValue('position') === 'static'
    )).toBe(true);

    const smallRules = mediaRules(/max-width:\s*560px/i);
    expect(smallRules.some((rule) =>
      rule.selectorText === '.ar-lab-vehicle-grid, .ar-lab-results-summary' &&
      rule.style.getPropertyValue('grid-template-columns') === '1fr'
    )).toBe(true);

    const reducedFill = mediaRules(/prefers-reduced-motion:\s*reduce/i)
      .find((rule) => rule.selectorText === '.ar-lab-progress-fill');
    expect(reducedFill.style.getPropertyValue('transition')).toBe('none');
    expect(reducedFill.style.getPropertyPriority('transition')).toBe('important');

    const forcedRules = mediaRules(/forced-colors:\s*active/i);
    const forcedBoundary = forcedRules.find((rule) => rule.selectorText?.includes('.ar-lab-scenario'));
    expect(forcedBoundary).toBeTruthy();
    expect(forcedBoundary.style.getPropertyPriority('border')).toBe('important');
    expect(forcedBoundary.style.getPropertyValue('box-shadow')).toBe('none');
    expect(forcedRules.some((rule) =>
      rule.selectorText?.includes('[data-ar-stage-state=current]') && rule.style.getPropertyValue('outline').includes('Highlight')
    )).toBe(true);
    expect(forcedRules.some((rule) =>
      rule.selectorText === '.ar-lab-choice:focus-visible, .ar-lab-case-link:focus-visible'
    )).toBe(true);

    const printRules = mediaRules(/^print$/i);
    expect(printRules.some((rule) =>
      rule.selectorText?.includes('[data-ar-lab-print-hide=true]') && rule.style.getPropertyValue('display') === 'none'
    )).toBe(true);
    expect(printRules.some((rule) =>
      rule.selectorText?.includes('.ar-lab-feedback') && rule.style.getPropertyValue('break-inside') === 'avoid'
    )).toBe(true);
  });

  it('keeps authored data, state hardening, atomic actions, and visual hooks intact', () => {
    expect(LABS.map((scenario) => [scenario.id, scenario.difficulty, scenario.symptoms.length, scenario.steps.length])).toEqual([
      ['lab-misfire', 2, 3, 5],
      ['lab-no-start', 1, 3, 4],
      ['lab-brakes', 2, 3, 4],
      ['lab-overheat', 3, 4, 4],
      ['lab-noise', 2, 3, 3],
      ['lab-leak', 4, 4, 4]
    ]);
    const steps = LABS.flatMap((scenario) => scenario.steps);
    const choices = steps.flatMap((step) => step.choices);
    expect(steps).toHaveLength(24);
    expect(choices).toHaveLength(72);
    expect(steps.every((step) => step.choices.length === 3 && step.choices.filter((choice) => choice.score === 10).length === 1)).toBe(true);
    expect(choices.reduce((counts, choice) => {
      counts[choice.score] = (counts[choice.score] || 0) + 1;
      return counts;
    }, {})).toEqual({ '-10': 10, '-5': 22, 0: 7, 5: 9, 10: 24 });

    expect(SOURCE.match(/function renderLab\(\)/g)).toHaveLength(1);
    expect(SOURCE).toContain("var answers = d.labAnswers && typeof d.labAnswers === 'object' ? d.labAnswers : {};");
    expect(SOURCE).toContain('var completedIds = Array.isArray(d.labsCompleted) ? d.labsCompleted : [];');
    expect(SOURCE).toContain('var stepIdx = isNaN(parsedStep) ? 0 : Math.max(0, parsedStep);');
    expect(SOURCE).toContain('updMulti({ labId: id, labStep: 0, labAnswers: {} });');
    expect(SOURCE).toContain('updMulti({ labId: null, labStep: 0, labAnswers: {} });');
    expect(SOURCE).toContain('updMulti({ labAnswers: nv, labStep: newStep });');
    expect(SOURCE).toContain("labFocusSoon(completing ? '[data-ar-lab-results]' : '[data-ar-lab-question]', completing ? 120 : 0);");
    expect(SOURCE).toContain('data-ar-lab-evidence-summary');
  });

  it('keeps the default canonical source and desktop mirror byte-identical', () => {
    if (resolve(process.cwd(), FILE) !== resolve(process.cwd(), CANONICAL)) return;
    const canonical = readFileSync(resolve(process.cwd(), CANONICAL));
    const mirror = readFileSync(resolve(process.cwd(), MIRROR));
    expect(Buffer.compare(canonical, mirror)).toBe(0);
  });
});
