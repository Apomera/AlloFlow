// Auto Repair Shop — shared repair and roadside workflow visuals.

import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_autorepair.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_autorepair.js';
const ID = 'autoRepair';
const SRC = readFileSync(resolve(process.cwd(), FILE), 'utf8');

function extractArray(name) {
  const start = SRC.indexOf('var ' + name + ' = [');
  expect(start, name + ' not found').toBeGreaterThan(-1);
  const open = SRC.indexOf('[', start);
  let depth = 0;
  let end = -1;
  let quote = null;
  let escaped = false;
  for (let i = open; i < SRC.length; i++) {
    const ch = SRC[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  expect(end, name + ' closing bracket not found').toBeGreaterThan(open);
  // eslint-disable-next-line no-new-func
  return new Function('return ' + SRC.slice(open, end + 1))();
}

function hostFor(html) {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

const REPAIRS = extractArray('REPAIR_SCENARIOS');
const battery = REPAIRS.find((item) => item.id === 'battery');

function safetyChecksFor(repair) {
  return Object.fromEntries(repair.safety.map((code) => [code, true]));
}

function repair(extra, overrides) {
  return hostFor(renderTool(ID, {
    autoRepair: Object.assign({
      view: 'repair',
      repairPicked: 'battery',
      repairSafetyFor: 'battery',
      repairSafetyChecks: {}
    }, extra || {})
  }, overrides));
}

function roadside(extra, overrides) {
  return hostFor(renderTool(ID, {
    autoRepair: Object.assign({
      view: 'roadside',
      rsView: 'decide'
    }, extra || {})
  }, overrides));
}

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, ID);
});

describe('repair workflow visual states', () => {
  it('moves the three-stage rail from safety to procedure to complete', () => {
    const safety = repair();
    const safetyStages = [...safety.querySelectorAll('[data-ar-repair-stage-rail] [data-ar-workflow-stage]')];
    const safetyProgress = safety.querySelector('[data-ar-workflow-progress="repair"]');

    expect(safetyStages.map((node) => node.dataset.arStageState)).toEqual(['current', 'upcoming', 'upcoming']);
    expect(safetyStages[0].getAttribute('aria-current')).toBe('step');
    expect(safetyProgress.getAttribute('aria-valuenow')).toBe('0');
    expect(safety.querySelector('[data-ar-repair-stage-rail] [role="status"]').textContent).toMatch(/Safety setup/);

    const procedure = repair({ repairSafetyChecks: safetyChecksFor(battery) });
    const procedureStages = [...procedure.querySelectorAll('[data-ar-repair-stage-rail] [data-ar-workflow-stage]')];

    expect(procedureStages.map((node) => node.dataset.arStageState)).toEqual(['complete', 'current', 'upcoming']);
    expect(procedureStages[1].getAttribute('aria-current')).toBe('step');
    expect(procedure.querySelector('[data-ar-workflow-progress="repair"]').getAttribute('aria-valuenow')).toBe('1');
    expect(procedure.querySelector('[data-ar-repair-stage-rail] [role="status"]').textContent).toMatch(/Current task/);

    const reviewed = Object.fromEntries(battery.steps.map((step) => [step.n, true]));
    const complete = repair({
      repairSafetyChecks: safetyChecksFor(battery),
      stepsViewed: { battery: reviewed }
    });
    const completeStages = [...complete.querySelectorAll('[data-ar-repair-stage-rail] [data-ar-workflow-stage]')];

    expect(completeStages.map((node) => node.dataset.arStageState)).toEqual(['complete', 'complete', 'complete']);
    expect(completeStages.every((node) => !node.hasAttribute('aria-current'))).toBe(true);
    expect(complete.querySelector('[data-ar-workflow-progress="repair"]').getAttribute('aria-valuenow')).toBe('3');
    expect(complete.querySelector('[data-ar-repair-stage-rail] [role="status"]').textContent).toMatch(/every repair step has been reviewed/);
  });

  it('renders the ordered procedure as a readable current-step timeline', () => {
    const host = repair({
      repairSafetyChecks: safetyChecksFor(battery),
      stepsViewed: { battery: { 1: true } }
    });
    const list = host.querySelector('ol.ar-workflow-step-list');
    const reviewed = host.querySelector('[data-ar-repair-step="1"]');
    const current = host.querySelector('[data-ar-repair-step="2"]');
    const locked = host.querySelector('[data-ar-repair-step="3"]');
    const progress = host.querySelector('[data-ar-repair-progress="battery"]');

    expect(list).toBeTruthy();
    expect(list.children.length).toBe(battery.steps.length);
    expect(reviewed.dataset.arStepState).toBe('reviewed');
    expect(current.dataset.arStepState).toBe('next');
    expect(current.getAttribute('aria-current')).toBe('step');
    expect(locked.dataset.arStepState).toBe('locked-order');
    expect(current.querySelector('[data-ar-state-label="next"]').textContent).toBe('Do this now');
    expect(locked.querySelector('[data-ar-state-label="locked-order"]').textContent).toMatch(/Complete step/);
    expect(progress.getAttribute('aria-valuenow')).toBe('1');
    expect(progress.getAttribute('aria-valuemax')).toBe(String(battery.steps.length));
  });
});

describe('roadside incident drill visual states', () => {
  it('shows numeric case progress, hazard identity, and explicit answer states', () => {
    const initial = roadside();
    const initialStages = [...initial.querySelectorAll('[data-ar-roadside-stage]')];
    const initialProgress = initial.querySelector('[data-ar-roadside-progress] [role="progressbar"]');

    expect(initialStages).toHaveLength(4);
    expect(initialStages.map((node) => node.dataset.arStageState)).toEqual(['current', 'upcoming', 'upcoming', 'upcoming']);
    expect(initialProgress.getAttribute('aria-valuenow')).toBe('0');
    expect(initial.querySelector('[data-ar-roadside-hazard="highway-shoulder"]').textContent).toBe('High-speed traffic');
    expect(initial.textContent).not.toContain('Score 0 / 0');

    const wrong = roadside({
      rsDecisionIndex: 0,
      rsDecisionScore: 0,
      rsDecisionFor: 'highway-shoulder',
      rsDecisionPicked: 'change-now'
    });
    const wrongStage = wrong.querySelector('[data-ar-roadside-stage="highway-shoulder"]');
    const wrongChoice = wrong.querySelector('[data-ar-choice-state="selected-incorrect"]');
    const correctChoice = wrong.querySelector('[data-ar-choice-state="correct-answer"]');
    const lockedChoices = [...wrong.querySelectorAll('[data-ar-choice-state="locked"]')];

    expect(wrongStage.dataset.arStageState).toBe('resolved-incorrect');
    expect(wrongStage.getAttribute('aria-current')).toBe('step');
    expect(wrong.querySelector('[data-ar-roadside-progress] [role="progressbar"]').getAttribute('aria-valuenow')).toBe('1');
    expect(wrongChoice.querySelector('[data-ar-roadside-state-label]').textContent).toBe('Your choice');
    expect(correctChoice.querySelector('[data-ar-roadside-state-label]').textContent).toBe('Safest move');
    expect(lockedChoices.every((node) => node.querySelector('[data-ar-roadside-state-label]').textContent === 'Not selected')).toBe(true);
    expect([...wrong.querySelectorAll('[data-ar-roadside-choice]')].every((node) => node.style.opacity === '')).toBe(true);

    const correct = roadside({
      rsDecisionIndex: 1,
      rsDecisionScore: 1,
      rsDecisionFor: 'vehicle-fire',
      rsDecisionPicked: 'exit-distance'
    });
    expect(correct.querySelector('[data-ar-roadside-stage="vehicle-fire"]').dataset.arStageState).toBe('resolved-correct');
    expect(correct.querySelector('[data-ar-roadside-progress] [role="progressbar"]').getAttribute('aria-valuenow')).toBe('2');
  });

  it('preserves theme, responsive, focus, and source-pair contracts', () => {
    const themes = [
      { isDark: false, isContrast: false },
      { isDark: true, isContrast: false },
      { isDark: false, isContrast: true }
    ];
    for (const theme of themes) {
      const repairHtml = renderTool(ID, {
        autoRepair: {
          view: 'repair',
          repairPicked: 'battery',
          repairSafetyFor: 'battery',
          repairSafetyChecks: {}
        }
      }, theme);
      const roadsideHtml = renderTool(ID, {
        autoRepair: { view: 'roadside', rsView: 'decide' }
      }, theme);

      expect(repairHtml).toContain('data-ar-repair-stage-rail="true"');
      expect(roadsideHtml).toContain('data-ar-roadside-progress="true"');
      expect(repairHtml + roadsideHtml).not.toContain('undefined');
      expect(repairHtml + roadsideHtml).not.toContain('NaN');
    }

    const flair = document.getElementById('allo-ar-flair-css');
    expect(flair.textContent).toContain('@media (max-width: 640px)');
    expect(flair.textContent).toContain('.ar-workflow-stage-list { grid-template-columns: 1fr !important; }');
    expect(flair.textContent).toContain('@media (forced-colors: active)');
    expect(flair.textContent).toContain('.ar-workflow-tabs');
    expect(flair.textContent).toContain(':not([data-ar-roadside-choice]):not([data-ar-safety-item])');
    expect(SRC).toContain("document.querySelector('[data-ar-roadside-focus-target=\"true\"]')");
    expect(readFileSync(resolve(process.cwd(), MIRROR), 'utf8')).toBe(SRC);
  });
});

