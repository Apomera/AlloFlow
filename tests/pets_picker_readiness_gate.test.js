import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { sliceBetween } from './helpers/anchored_slice.js';

const ROOT = process.cwd();
const PETS = fs.readFileSync(path.join(ROOT, 'stem_lab/stem_tool_pets.js'), 'utf8');

function between(startMarker, endMarker) {
  return sliceBetween(PETS, startMarker, endMarker, { file: 'stem_lab/stem_tool_pets.js' });
}

function readinessItems() {
  const source = between('var PICK_READINESS_ITEMS = [', '\n    function pickKidBand(');
  return vm.runInNewContext(`(function () { ${source}; return PICK_READINESS_ITEMS; })()`);
}

const ITEMS = readinessItems();

describe('Pets picker readiness — the checklist', () => {
  it('covers the four things that decide whether a home works', () => {
    expect(ITEMS.length).toBe(4);
    const ids = ITEMS.map((item) => item.id);
    expect(new Set(ids).size, 'duplicate readiness ids').toBe(ids.length);
    expect(ids.sort()).toEqual(['backup', 'budget', 'caregiver', 'housing']);
    for (const item of ITEMS) {
      expect(item.label.length, item.id + ' label').toBeGreaterThan(10);
      expect(item.detail.length, item.id + ' detail').toBeGreaterThan(50);
    }
  });

  // The caregiver item is the one welfare organisations are unanimous about,
  // and the one a student is most likely to answer for themselves.
  it('states that the primary caregiver is not a child', () => {
    const caregiver = ITEMS.filter((item) => item.id === 'caregiver')[0];
    expect(caregiver, 'no caregiver item').toBeTruthy();
    expect(caregiver.detail).toMatch(/not a child/i);
  });

  it('asks about emergency money, not just routine cost', () => {
    const budget = ITEMS.filter((item) => item.id === 'budget')[0];
    expect(budget.detail).toMatch(/emergency/i);
  });
});

describe('Pets picker readiness — the gate', () => {
  it('activity-gates the picker and registers it in every evidence table', () => {
    expect(between('var PETS_ACTIVITY_COMPLETION_MODULES = {', '};')).toContain('picker: true');
    // Without an ACTIVITY_FIELDS entry the stored reason silently downgrades
    // to 'Reviewed by learner'.
    expect(between('var PETS_EVIDENCE_ACTIVITY_FIELDS = {', '};')).toContain('picker:');
    expect(between('var PETS_EVIDENCE_ACTIVITY_SUMMARIES = {', '};')).toContain('picker:');
    expect(between('var PETS_ACTIVITY_COMPLETION_REASONS = {', '};'))
      .toContain("picker: ['Confirmed every readiness item']");
  });

  it('completes only when every readiness item is confirmed', () => {
    const setter = between('function setPickerReadiness(itemId, checked) {', 'return h(\'div\', {');
    expect(setter).toContain('confirmedCount === PICK_READINESS_ITEMS.length');
    expect(setter).toContain("completeModule('picker', 'Confirmed every readiness item'");
  });

  // The fit score is decision support, not a verdict. Gating on it would turn
  // "sometimes the responsible answer is to wait" into a failed criterion.
  it('never gates on the fit score', () => {
    const setter = between('function setPickerReadiness(itemId, checked) {', 'return h(\'div\', {');
    expect(setter).not.toMatch(/topScore|modelLeaders|leadMargin/);
  });

  it('records no score and no criterion', () => {
    const reconcile = between("} else if (moduleId === 'picker') {", "} else if (moduleId === 'cost') {");
    expect(reconcile).toContain('delete details.criterionMet;');
    expect(reconcile).toContain('delete details.score;');
    expect(reconcile).toContain('delete details.scorePct;');
  });

  // Completion is a record that the work happened. Unticking a box later is a
  // change of mind about the household, not a reason to erase the record.
  it('does not un-complete the module when an item is unticked', () => {
    const setter = between('function setPickerReadiness(itemId, checked) {', 'return h(\'div\', {');
    expect(setter).not.toMatch(/uncompleteModule|delete\s+modulesCompleted/);
  });
});

describe('Pets picker — the model stays honest about itself', () => {
  it('still says a high score is a question, not a recommendation', () => {
    expect(PETS).toMatch(/a question to investigate, not a pet recommendation/i);
  });

  it('still warns when nothing clears the comparison threshold', () => {
    expect(PETS).toMatch(/No option reaches the model.s \+2 comparison threshold/);
    expect(PETS).toMatch(/treating the least-low score as a recommendation/i);
  });

  it('still flags ties and thin margins rather than ranking through them', () => {
    expect(PETS).toMatch(/No single model leader/);
    expect(PETS).toMatch(/Close model result/);
  });
});
