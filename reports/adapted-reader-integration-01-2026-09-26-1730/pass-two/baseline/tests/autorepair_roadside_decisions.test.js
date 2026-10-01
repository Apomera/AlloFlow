// Auto Repair Shop - roadside first-move safety practice.
//
// These tests pin the safety decisions and interaction contract, not styling.
// Roadside advice is condition-dependent: staying inside is usually protective
// beside fast traffic, but is the wrong response to a vehicle fire.

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_autorepair.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_autorepair.js';
const ID = 'autoRepair';
const SRC = readFileSync(resolve(process.cwd(), FILE), 'utf8');

function extractCollection(name, opener, closer) {
  const start = SRC.indexOf('var ' + name + ' = ' + opener);
  expect(start, name + ' not found').toBeGreaterThan(-1);
  const open = SRC.indexOf(opener, start);
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
    if (ch === opener) depth++;
    else if (ch === closer) {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  expect(end, name + ' closing delimiter not found').toBeGreaterThan(open);
  // eslint-disable-next-line no-new-func
  return new Function('return ' + SRC.slice(open, end + 1))();
}

function extractFunction(name) {
  const start = SRC.indexOf('function ' + name + '(');
  expect(start, name + ' not found').toBeGreaterThan(-1);
  const open = SRC.indexOf('{', start);
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
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  expect(end, name + ' closing brace not found').toBeGreaterThan(open);
  // eslint-disable-next-line no-new-func
  return new Function(SRC.slice(start, end + 1) + '\nreturn ' + name + ';')();
}

const CASES = extractCollection('ROADSIDE_DECISION_CASES', '[', ']');
const PROTOCOL = extractCollection('BREAKDOWN_PROTOCOL', '[', ']');
const evaluateDecision = extractFunction('arEvaluateRoadsideDecision');

function roadside(extra) {
  return renderTool(ID, {
    autoRepair: Object.assign({ view: 'roadside', rsView: 'decide' }, extra || {})
  });
}

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, ID);
});

describe('roadside decisions - pure evaluation and content', () => {
  it('defines four unique, single-answer cases backed by government sources', () => {
    expect(CASES).toHaveLength(4);
    expect(new Set(CASES.map((caseDef) => caseDef.id)).size).toBe(CASES.length);

    const allowedHosts = [
      'ops.fhwa.dot.gov',
      'www.usfa.fema.gov',
      'www.weather.gov',
      'presidio.gov'
    ];

    for (const caseDef of CASES) {
      expect(caseDef.choices).toHaveLength(3);
      expect(new Set(caseDef.choices.map((choice) => choice.id)).size).toBe(3);
      expect(caseDef.choices.filter((choice) => choice.correct)).toHaveLength(1);
      expect(allowedHosts).toContain(new URL(caseDef.sourceUrl).hostname);
      expect(caseDef.sourceUrl.startsWith('https://')).toBe(true);
      expect(caseDef.takeaway.length).toBeGreaterThan(70);
      for (const choice of caseDef.choices) {
        expect(choice.feedback.length, caseDef.id + '/' + choice.id).toBeGreaterThan(70);
      }
    }
  });

  it('evaluates listed choices without mutating the case definition', () => {
    const caseDef = CASES[0];
    const correct = caseDef.choices.find((choice) => choice.correct);
    const wrong = caseDef.choices.find((choice) => !choice.correct);
    const before = JSON.stringify(caseDef);

    expect(evaluateDecision(caseDef, correct.id)).toEqual({
      valid: true,
      correct: true,
      feedback: correct.feedback,
      correctId: correct.id
    });
    expect(evaluateDecision(caseDef, wrong.id)).toEqual({
      valid: true,
      correct: false,
      feedback: wrong.feedback,
      correctId: correct.id
    });
    expect(evaluateDecision(caseDef, 'not-a-choice')).toEqual({
      valid: false,
      correct: false,
      feedback: 'Choose one of the listed actions.',
      correctId: correct.id
    });
    expect(JSON.stringify(caseDef)).toBe(before);
  });

  it('teaches the vehicle-fire exception to stay-inside guidance', () => {
    const fire = CASES.find((caseDef) => caseDef.id === 'vehicle-fire');
    const answer = fire.choices.find((choice) => choice.correct);

    expect(answer.label).toMatch(/turn off the engine/i);
    expect(answer.label).toMatch(/get everyone out/i);
    expect(answer.label).toMatch(/at least 100 feet/i);
    expect(answer.label).toMatch(/call 911/i);
    expect(fire.takeaway).toMatch(/Never open the hood or trunk/i);
  });

  it('teaches winter carbon-monoxide controls as one complete action', () => {
    const winter = CASES.find((caseDef) => caseDef.id === 'winter-stranded');
    const answer = winter.choices.find((choice) => choice.correct);

    expect(answer.label).toMatch(/clear the exhaust/i);
    expect(answer.label).toMatch(/downwind window/i);
    expect(answer.label).toMatch(/10 minutes each hour/i);
    expect(winter.takeaway).toMatch(/Stay with the vehicle/i);
  });

  it('keeps occupants inside a power-line-contact vehicle unless fire forces exit', () => {
    const power = CASES.find((caseDef) => caseDef.id === 'power-line');
    const answer = power.choices.find((choice) => choice.correct);

    expect(answer.label).toMatch(/Remain inside/i);
    expect(answer.label).toMatch(/call 911/i);
    expect(answer.label).toMatch(/warn everyone nearby/i);
    expect(power.takeaway).toMatch(/If fire forces an exit, jump clear/i);
    expect(power.takeaway).toMatch(/shuffle away/i);
  });

  it('removes unsafe shoulder travel and improvised active-road towing advice', () => {
    const serialized = JSON.stringify(PROTOCOL);
    const winterWait = PROTOCOL.find((step) => step.step === 8);
    const callHelp = PROTOCOL.find((step) => step.step === 6);

    expect(serialized).not.toMatch(/Going 30mph with hazards/i);
    expect(serialized).not.toMatch(/Friend with truck \+ tow strap/i);
    expect(winterWait.do).toMatch(/Clear snow from the exhaust pipe/i);
    expect(winterWait.do).toMatch(/10 minutes each hour/i);
    expect(winterWait.do).toMatch(/downwind window cracked slightly/i);
    expect(callHelp.do).toMatch(/fire, injuries, a power line/i);
    expect(callHelp.avoid).toMatch(/Never use a tow strap in active roadside traffic/i);
  });
});

describe('roadside decisions - accessible rendered states', () => {
  it('renders the first unanswered case with three enabled real buttons', () => {
    const html = roadside();

    expect(html).toContain('Case 1 of 4');
    expect(html).toContain('Flat tire beside 65 mph traffic');
    expect(html).toContain('data-ar-roadside-choice="change-now"');
    expect(html).toContain('data-ar-choice-state="available"');
    expect(html).toContain('aria-disabled="false"');
    expect(html).not.toContain('data-ar-roadside-feedback=');
    expect(html).not.toContain('data-ar-roadside-source=');
  });

  it('locks an answer, reveals the correct action, rationale, and official source', () => {
    const html = roadside({
      rsDecisionIndex: 0,
      rsDecisionFor: 'highway-shoulder',
      rsDecisionPicked: 'change-now',
      rsDecisionScore: 0,
      rsDecisionAttempts: 1
    });

    expect(html).toContain('data-ar-choice-state="selected-incorrect"');
    expect(html).toContain('data-ar-choice-state="correct-answer"');
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('data-ar-roadside-feedback="incorrect"');
    expect(html).toContain('Safer move:');
    expect(html).toContain('data-ar-roadside-source="highway-shoulder"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('Next case');
  });

  it('does not let a stale answer from a different case lock the current case', () => {
    const html = roadside({
      rsDecisionIndex: 0,
      rsDecisionFor: 'vehicle-fire',
      rsDecisionPicked: 'exit-distance',
      rsDecisionScore: 1
    });

    expect(html).toContain('Flat tire beside 65 mph traffic');
    expect(html).toContain('aria-disabled="false"');
    expect(html).not.toContain('data-ar-roadside-feedback=');
  });

  it('renders every case and its correct feedback without throwing', () => {
    CASES.forEach((caseDef, index) => {
      const correct = caseDef.choices.find((choice) => choice.correct);
      const html = roadside({
        rsDecisionIndex: index,
        rsDecisionFor: caseDef.id,
        rsDecisionPicked: correct.id,
        rsDecisionScore: index + 1,
        rsDecisionAttempts: index + 1
      });

      expect(html).toContain(caseDef.title);
      expect(html).toContain('data-ar-roadside-feedback="correct"');
      expect(html).toContain('Correct first move.');
      expect(html).toContain('data-ar-roadside-source="' + caseDef.id + '"');
    });
  });

  it('renders distinct mastery and review summaries', () => {
    const passed = roadside({ rsDecisionIndex: CASES.length, rsDecisionScore: 3 });
    const review = roadside({ rsDecisionIndex: CASES.length, rsDecisionScore: 2 });

    expect(passed).toContain('data-ar-roadside-summary="passed"');
    expect(passed).toContain('3 / 4');
    expect(passed).toContain('Roadside Decision Ready earned');
    expect(passed).toContain('Run the four cases again');
    expect(review).toContain('data-ar-roadside-summary="review"');
    expect(review).toContain('2 / 4');
    for (const caseDef of CASES) {
      expect(passed).toContain('href="' + caseDef.sourceUrl + '"');
    }
  });

  it('gives all four tabs roving focus semantics and a labelled panel', () => {
    const html = renderTool(ID, { autoRepair: { view: 'roadside', rsView: 'overview' } });

    expect(html).toContain('role="tablist"');
    for (const id of ['overview', 'kit', 'protocol', 'decide']) {
      expect(html).toContain('id="autorepair-roadside-tab-' + id + '"');
      expect(html).toContain('aria-controls="autorepair-roadside-panel-' + id + '"');
    }
    expect(html).toContain('id="autorepair-roadside-panel-overview"');
    expect(html).toContain('aria-labelledby="autorepair-roadside-tab-overview"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('tabindex="0"');
  });

  it('renders the decision practice under every supported theme', () => {
    for (const theme of [{ isDark: true }, { isDark: false }, { isContrast: true }]) {
      expect(renderTool(ID, { autoRepair: { view: 'roadside', rsView: 'decide' } }, theme))
        .toContain('What is the safest first move?');
    }
  });
});

describe('roadside decisions - state and keyboard wiring', () => {
  it('locks repeat answers, persists one atomic result, and awards only at the threshold', () => {
    const start = SRC.indexOf('function chooseRoadsideDecision(');
    const end = SRC.indexOf('function advanceRoadsideDecision(', start);
    const handler = SRC.slice(start, end);

    expect(handler).toContain('if (answered)');
    expect(handler).toContain('var nextScore = score + (next.correct ? 1 : 0);');
    expect(handler).toContain('updMulti({');
    expect(handler).toContain('rsDecisionFor: caseDef.id');
    expect(handler).toContain('rsDecisionPicked: choiceId');
    expect(handler).toContain('rsDecisionScore: nextScore');
    expect(handler).toContain('if (index === total - 1 && nextScore >= passScore)');
    expect(handler).toContain("awardBadge('roadside-decisions', 'Roadside Decision Ready')");
  });

  it('supports Arrow keys, Home, and End in the tablist', () => {
    const start = SRC.indexOf('function rsTabKeyDown(');
    const end = SRC.indexOf('function tabBtn(', start);
    const handler = SRC.slice(start, end);

    for (const key of ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End']) {
      expect(handler).toContain("'" + key + "'");
    }
    expect(handler).toContain('nextTab.focus(); nextTab.click();');
  });

  it('lists the mastery badge and keeps the desktop copy byte-identical', () => {
    expect(SRC).toContain("{ id: 'roadside-decisions', icon: '🚨', name: 'Roadside Decision Ready'");
    expect(readFileSync(resolve(process.cwd(), MIRROR), 'utf8')).toBe(SRC);
  });
});
