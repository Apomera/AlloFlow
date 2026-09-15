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

function actionTable() {
  const source = between('var TAKE_ACTION = {', '\n  // ─────');
  return vm.runInNewContext(`(function () { ${source}; return TAKE_ACTION; })()`);
}

function api() {
  const source = between('var ACTION_PLAN_MAX =', 'function normalizeCareerMatch(');
  return vm.runInNewContext(
    `(function () { ${source}; return { ACTION_PLAN_MAX, actionPlanIds, actionScaleOf, normalizeActionPlan, actionPlanProgress }; })()`,
    { TAKE_ACTION: actionTable() },
  );
}

const TAKE_ACTION = actionTable();
const API = api();
const ALL_IDS = API.actionPlanIds();

describe('Pets action plan — the actions', () => {
  it('spans every scale with usable, unique ids', () => {
    const scales = Object.keys(TAKE_ACTION);
    expect(scales.length).toBeGreaterThanOrEqual(4);
    expect(new Set(ALL_IDS).size, 'duplicate action ids').toBe(ALL_IDS.length);
    for (const scale of scales) {
      expect(TAKE_ACTION[scale].length, scale).toBeGreaterThan(0);
      for (const action of TAKE_ACTION[scale]) {
        expect(action.what.length, `${scale}.${action.id} what`).toBeGreaterThan(15);
        expect(action.how.length, `${scale}.${action.id} how`).toBeGreaterThan(40);
        expect(action.impact.length, `${scale}.${action.id} impact`).toBeGreaterThan(40);
      }
    }
  });

  it('resolves every action back to its scale', () => {
    for (const id of ALL_IDS) {
      expect(Object.keys(TAKE_ACTION), id).toContain(API.actionScaleOf(id));
    }
    expect(API.actionScaleOf('notAnAction')).toBeNull();
  });
});

describe('Pets action plan — state', () => {
  // The cap is the pedagogy: ticking everything is a list, not a plan.
  it('caps the plan and keeps the first choices', () => {
    const everything = API.normalizeActionPlan(ALL_IDS);
    expect(everything).toHaveLength(API.ACTION_PLAN_MAX);
    expect(everything).toEqual(ALL_IDS.slice(0, API.ACTION_PLAN_MAX));
  });

  it('drops unknown ids, duplicates and junk', () => {
    expect(API.normalizeActionPlan(['enrichment', 'enrichment', 'notAnAction', 42, null]))
      .toEqual(['enrichment']);
    expect(API.normalizeActionPlan(null)).toEqual([]);
    expect(API.normalizeActionPlan('enrichment')).toEqual([]);
    expect(API.normalizeActionPlan({ 0: 'enrichment' })).toEqual([]);
  });

  it('counts how many scales a plan reaches', () => {
    const oneScale = API.actionPlanProgress(TAKE_ACTION.home.slice(0, 2).map((a) => a.id));
    expect(oneScale.count).toBe(2);
    expect(oneScale.scales).toBe(1);
    expect(oneScale.ready).toBe(true);
    expect(oneScale.full).toBe(false);

    const spread = API.actionPlanProgress([
      TAKE_ACTION.home[0].id,
      TAKE_ACTION.civic[0].id,
    ]);
    expect(spread.scales).toBe(2);
  });

  it('is not ready on an empty plan and full at the cap', () => {
    const empty = API.actionPlanProgress([]);
    expect(empty.ready).toBe(false);
    expect(empty.count).toBe(0);

    const full = API.actionPlanProgress(ALL_IDS);
    expect(full.full).toBe(true);
    expect(full.count).toBe(API.ACTION_PLAN_MAX);
  });
});

describe('Pets action plan — wiring', () => {
  it('activity-gates action and registers it in every evidence table', () => {
    expect(between('var PETS_ACTIVITY_COMPLETION_MODULES = {', '};')).toContain('action: true');
    expect(between('var PETS_EVIDENCE_ACTIVITY_FIELDS = {', '};')).toContain('action:');
    expect(between('var PETS_EVIDENCE_ACTIVITY_SUMMARIES = {', '};')).toContain('action:');
    expect(between('var PETS_ACTIVITY_COMPLETION_REASONS = {', '};'))
      .toContain("action: ['Committed to a next action']");
  });

  it('persists the plan through the snapshot normalizer', () => {
    expect(PETS).toContain("'careerMatch', 'actionPlan'");
    expect(PETS).toContain('snapshot.actionPlan = normalizeActionPlan(snapshot.actionPlan);');
  });

  // A commitment is not a score. Nothing here should read as a grade.
  it('records no score and no criterion for a commitment', () => {
    const reconcile = between("} else if (moduleId === 'action') {", "} else if (moduleId === 'careers') {");
    expect(reconcile).toContain('delete details.criterionMet;');
    expect(reconcile).toContain('delete details.score;');
    expect(reconcile).toContain('delete details.scorePct;');
  });

  it('refuses to add past the cap rather than silently dropping a choice', () => {
    const toggle = between('function toggleAction(actionId) {', 'function clearPlan() {');
    expect(toggle).toContain('if (!already && plan.full) {');
    expect(toggle).toContain('petsAnnounce(');
    expect(toggle).toContain('next.length < ACTION_PLAN_MAX');
  });

  it('explains why the cap exists', () => {
    const panel = between("className: 'petslab-action-plan',", 'petslab-action-plan-list');
    expect(panel).toContain('The cap is the point');
  });
});
