// Stage 2 — the plan<->resource join key.
//
// Before this, plan-entry identity was POSITIONAL and re-derived on every
// render, while `normalizePlanItems` REORDERS every plan (analysis first,
// lesson-plan last). So the array the blueprint card renders is not the array
// the executor runs, and any status board keyed on position lights up the
// wrong rows. A per-step "Rebuild" built on that would be a wrong-resource
// generator.
//
// The invariant: a row's uiId survives normalize, reorder, the legacy-config
// round-trip the chat's revise path forces, and the executor's plan flattening.

import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

let C;
beforeAll(() => {
  loadAlloModule('agent_core_contracts_module.js');
  C = window.AlloModules?.AgentCoreContracts;
  if (!C) throw new Error('AgentCoreContracts failed to register');
});

// A plan deliberately in the "wrong" order so the reorder actually moves rows.
const RAW_PLAN = [
  { tool: 'quiz', directive: 'five questions' },
  { tool: 'lesson-plan', directive: 'tie it together' },
  { tool: 'glossary', directive: 'tier 2 words' },
  { tool: 'analysis', directive: 'find key ideas' },
];

describe('plan rows carry a stable uiId', () => {
  it('mints a uiId for every row', () => {
    const legacy = C.toLegacyConfig({ plan: RAW_PLAN });
    expect(legacy.resourcePlan).toHaveLength(4);
    for (const row of legacy.resourcePlan) {
      expect(typeof row.uiId).toBe('string');
      expect(row.uiId.length).toBeGreaterThan(0);
    }
  });

  it('gives every row a DISTINCT uiId — two rows of the same tool stay apart', () => {
    const legacy = C.toLegacyConfig({
      plan: [
        { tool: 'image', directive: 'first diagram' },
        { tool: 'image', directive: 'second diagram' },
      ],
    });
    const ids = legacy.resourcePlan.map((r) => r.uiId);
    expect(new Set(ids).size).toBe(2);
  });

  // The reorder is the whole reason positional identity was unsafe.
  it('the uiId travels WITH its row through the analysis-first/lesson-plan-last reorder', () => {
    const legacy = C.toLegacyConfig({ plan: RAW_PLAN });
    const order = legacy.resourcePlan.map((r) => r.tool);
    expect(order[0]).toBe('analysis');
    expect(order[order.length - 1]).toBe('lesson-plan');
    // Each row's directive and uiId must still belong to each other.
    const byId = Object.fromEntries(legacy.resourcePlan.map((r) => [r.uiId, r]));
    const analysisRow = legacy.resourcePlan.find((r) => r.tool === 'analysis');
    expect(byId[analysisRow.uiId].directive).toBe('find key ideas');
    const quizRow = legacy.resourcePlan.find((r) => r.tool === 'quiz');
    expect(byId[quizRow.uiId].directive).toBe('five questions');
  });

  // The chat's revise path round-trips through the contract on every edit.
  it('survives a legacy round-trip unchanged (idempotent)', () => {
    const first = C.toLegacyConfig({ plan: RAW_PLAN });
    const second = C.toLegacyConfig({ plan: first.resourcePlan });
    const third = C.toLegacyConfig({ plan: second.resourcePlan });
    const ids1 = first.resourcePlan.map((r) => r.uiId);
    const ids2 = second.resourcePlan.map((r) => r.uiId);
    const ids3 = third.resourcePlan.map((r) => r.uiId);
    expect(ids2).toEqual(ids1);
    expect(ids3).toEqual(ids1);
  });

  it('preserves a uiId the caller already assigned', () => {
    const legacy = C.toLegacyConfig({
      plan: [{ tool: 'glossary', directive: 'x', uiId: 'teacher-made-this-row' }],
    });
    expect(legacy.resourcePlan[0].uiId).toBe('teacher-made-this-row');
  });
});

// ── Copy-sync + naming guardrails ──
const read = (f) => readFileSync(resolve(process.cwd(), f), 'utf8');

describe('join-key wiring guardrails', () => {
  it('the contract mints and carries uiId', () => {
    const src = read('agent_core_contracts_module.js');
    expect(src).toMatch(/uiId: String\(uiId\)/);
    expect(src).toMatch(/uiId: r\.uiId/);
  });

  it('the blueprint card stops dropping it on edit', () => {
    const src = read('persona_ui_source.jsx');
    // syncChanges used to emit only {tool, directive}.
    expect(src).toMatch(/uiId: i\.id/);
  });

  it.each(['phase_o_misc_handlers_source.jsx', 'phase_o_misc_handlers_module.js',
           'desktop/web-app/public/phase_o_misc_handlers_module.js'])(
    '%s carries uiId into the execution plan', (file) => {
      const src = read(file);
      expect(src).toMatch(/uiId: \(typeof item === 'object'/);
    });

  // getBlueprintResourcePlan resolves `item.tool || item.type || item.id`, so a
  // row keyed `id` would be read as a TOOL NAME. This is why it is not `id`.
  it('never names the join key `id` on a plan row', () => {
    const contracts = read('agent_core_contracts_module.js');
    const normalize = contracts.slice(
      contracts.indexOf('function normalizePlanItems'),
      contracts.indexOf('function requiredCapabilitiesForPlan'),
    );
    expect(normalize).not.toMatch(/items\.push\(\{[^}]*\bid:/);
  });

  // The executor's destructure is pinned byte-for-byte by
  // tests/blueprint_mode_guardrails.test.js — uiId must be read separately.
  it('leaves the pinned executor destructure untouched', () => {
    const src = read('phase_o_misc_handlers_source.jsx');
    expect(src).toContain('const { type, directive: aiDirective = "" } = finalResources[i];');
  });
});
