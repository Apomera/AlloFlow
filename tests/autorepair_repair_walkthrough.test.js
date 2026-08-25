// Auto Repair Shop — safety-gated repair walkthroughs.
//
// These tests pin the learning contract rather than the visual styling:
// hazards must be actively acknowledged, procedure completion must be
// contiguous, and an old out-of-order click cannot earn a completion badge.

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
  for (let i = open; i < SRC.length; i++) {
    if (SRC[i] === '{') depth++;
    else if (SRC[i] === '}') {
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

const REPAIRS = extractCollection('REPAIR_SCENARIOS', '[', ']');
const SAFETY_LABELS = extractCollection('REPAIR_SAFETY_LABELS', '{', '}');
const safetyStatus = extractFunction('arRepairSafetyStatus');
const stepProgress = extractFunction('arRepairStepProgress');
const battery = REPAIRS.find((repair) => repair.id === 'battery');

function checksFor(repair) {
  return Object.fromEntries(repair.safety.map((code) => [code, true]));
}

function repair(id, extra) {
  return renderTool(ID, {
    autoRepair: Object.assign({
      view: 'repair',
      repairPicked: id,
      repairSafetyFor: id,
      repairSafetyChecks: {}
    }, extra || {})
  });
}

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, ID);
});

describe('repair walkthrough — pure progress rules', () => {
  it('counts only required safety items and de-duplicates requirements', () => {
    const required = ['stands', 'glasses', 'stands'];
    const confirmed = { stands: true, unrelated: true };
    const before = JSON.stringify(confirmed);

    expect(safetyStatus(required, confirmed)).toEqual({
      done: 1,
      total: 2,
      complete: false
    });
    expect(JSON.stringify(confirmed)).toBe(before);
    expect(safetyStatus(required, { stands: true, glasses: true })).toEqual({
      done: 2,
      total: 2,
      complete: true
    });
  });

  it('does not count gaps as completed procedure progress', () => {
    const viewed = { 1: true, 3: true, 4: true };
    const before = JSON.stringify(viewed);

    expect(stepProgress(4, viewed)).toEqual({
      done: 1,
      total: 4,
      next: 2,
      complete: false
    });
    expect(JSON.stringify(viewed)).toBe(before);
  });

  it('reports completion only for an unbroken sequence', () => {
    expect(stepProgress(4, { 1: true, 2: true, 3: true, 4: true })).toEqual({
      done: 4,
      total: 4,
      next: null,
      complete: true
    });
  });
});

describe('repair walkthrough — safety content', () => {
  it('covers all 12 repair scenarios', () => {
    expect(REPAIRS).toHaveLength(12);
  });

  it('gives every safety code a clear sentence instead of exposing an internal slug', () => {
    const codes = [...new Set(REPAIRS.flatMap((repair) => repair.safety))];
    expect(codes.length).toBeGreaterThan(20);
    for (const code of codes) {
      expect(SAFETY_LABELS[code], 'missing safety explanation for ' + code).toBeTruthy();
      expect(SAFETY_LABELS[code].length, 'safety explanation is too short for ' + code).toBeGreaterThan(35);
      expect(SAFETY_LABELS[code], 'internal slug leaked for ' + code).not.toContain(code);
    }
  });

  it('distinguishes the federal MVAC venting and paid-service rules', () => {
    const label = SAFETY_LABELS['epa-section-609-rules'];
    expect(label).toMatch(/Section 608/);
    expect(label).toMatch(/most MVAC refrigerants/);
    expect(label).toMatch(/Section 609 certification and approved equipment/);
  });

  it('uses OSHA brake-dust controls instead of generic mask advice', () => {
    const label = SAFETY_LABELS['asbestos-old-pads-mask'];
    expect(label).toMatch(/HEPA-vacuum/);
    expect(label).toMatch(/low-pressure wet-cleaning/);
    expect(SRC).not.toMatch(/mask up/i);
  });
  it('keeps the deployed desktop copy byte-identical', () => {
    expect(readFileSync(resolve(process.cwd(), MIRROR), 'utf8')).toBe(SRC);
  });
});

describe('repair walkthrough — rendered gate and ordered review', () => {
  it('starts with safety controls and procedure review locked', () => {
    const html = repair('battery');

    expect(html).toContain('Safety check: 0 / 4 understood');
    expect(html).toContain('data-ar-safety-item="battery-disconnect-required"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('data-ar-step-state="locked-safety"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('This learning check cannot verify a real vehicle');
  });

  it('unlocks only step 1 after every hazard is acknowledged', () => {
    const html = repair('battery', { repairSafetyChecks: checksFor(battery) });

    expect(html).toContain('Safety check: 4 / 4 understood');
    expect(html).toContain('data-ar-repair-step="1" data-ar-step-state="next"');
    expect(html).toContain('data-ar-repair-step="2" data-ar-step-state="locked-order"');
  });

  it('ignores old out-of-order clicks when rendering progress', () => {
    const html = repair('battery', {
      repairSafetyChecks: checksFor(battery),
      stepsViewed: { battery: { 1: true, 3: true } }
    });

    expect(html).toContain('1 / 14 reviewed (7%)');
    expect(html).toContain('data-ar-repair-step="1" data-ar-step-state="reviewed"');
    expect(html).toContain('data-ar-repair-step="2" data-ar-step-state="next"');
    expect(html).toContain('data-ar-repair-step="3" data-ar-step-state="locked-order"');
  });

  it('renders a complete contiguous walkthrough accurately', () => {
    const viewed = Object.fromEntries(battery.steps.map((step) => [step.n, true]));
    const html = repair('battery', {
      repairSafetyChecks: checksFor(battery),
      stepsViewed: { battery: viewed }
    });

    expect(html).toContain('14 / 14 reviewed (100%)');
    expect(html).not.toContain('data-ar-step-state="next"');
  });

  it('wires lock checks before progress mutation and awards only on contiguous completion', () => {
    const start = SRC.indexOf('function reviewRepairStep(');
    const end = SRC.indexOf("return h('div'", start);
    const handler = SRC.slice(start, end);

    expect(handler.indexOf('if (!safetyStatus.complete)')).toBeGreaterThan(-1);
    expect(handler.indexOf('if (step.n !== progress.next)')).toBeGreaterThan(-1);
    expect(handler.indexOf("nv[step.n] = true")).toBeGreaterThan(handler.indexOf('if (step.n !== progress.next)'));
    expect(handler).toContain('if (nextProgress.complete)');
    expect(handler).toContain("awardBadge('rep-' + pickedRepair.id");
    expect(SRC).not.toContain('Object.keys(viewedForThis).length');
  });

  it('resets the safety gate whenever a repair scenario is opened', () => {
    expect(SRC).toContain(
      'updMulti({ repairPicked: s.id, repairSafetyFor: s.id, repairSafetyChecks: {} });'
    );
  });

  it('binds safety clicks to the current repair for older saved states', () => {
    const start = SRC.indexOf('function toggleRepairSafety(');
    const end = SRC.indexOf('function reviewRepairStep(', start);
    const handler = SRC.slice(start, end);
    expect(handler).toContain('updMulti({ repairSafetyFor: pickedRepair.id, repairSafetyChecks: next });');
    expect(handler).toContain("'Safety check complete. Step ' + progress.next + ' is ready for review.'");
  });
});

