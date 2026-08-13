import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_fisherlab.js');

describe('Fisher Lab integrity helpers are wired into gameplay', () => {
  it('persists observations instead of retained catch only', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const helperCalls = source.match(/appendCoreJournalObservation\s*\(/g) || [];

    // Definition plus at least one runtime call from a catch-decision path.
    expect(helperCalls.length).toBeGreaterThanOrEqual(2);
    expect(source).not.toContain("if (ev.type === 'fish' && ev.isKeeper)");
    expect(source).not.toContain("recordCatch('lobster', ev.length)");
  });

  it('routes the live cast, hookset, and fight through the guarded phase reducer', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const phaseCalls = source.split('advanceFishingPhase(').length - 1;

    expect(phaseCalls).toBeGreaterThanOrEqual(6);
    expect(source).toContain("var castTransition = advanceFishingPhase");
    expect(source).toContain("var hookTransition = advanceFishingPhase");
    expect(source).toContain("var fightTransition = advanceFishingPhase");
  });

  it('keeps voyage conditions read-only and carries difficulty into fishing assistance', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');

    expect(source).toContain("getFishingScenarioConditions(activeRegion, ev && ev.weather, ev && ev.timeOfDay)");
    expect(source).toContain("mode: voyageMode.id");
    expect(source).toContain("assistMode: !(ev && ev.mode && ev.mode !== 'guided')");
    expect(source).toContain("'aria-label': 'Observed voyage conditions'");
    expect(source).not.toContain("updateFishingSession({ tide: e.target.value })");
    expect(source).not.toContain("updateFishingSession({ current: e.target.value })");
  });

  it('persists conservation violations and recognizes only clean completed trips', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');

    expect(source).toContain("var conservationViolation = isCoreConservationViolation(action, fieldNote && fieldNote.legalToRetain)");
    expect(source).toContain("if (conservationViolation) boatState.regsViolations += 1");
    expect(source).not.toContain("if (regulationError) boatState.regsViolations += 1");
    expect(source).toContain("regsViolations: boatState.regsViolations");
    expect(source).toContain("saved.regsViolations = (Number(saved.regsViolations) || 0)");
    expect(source).toContain("if (ev.passed && (Number(ev.regsViolations) || 0) === 0) saved.cleanCoreTrips");
  });

  it('preserves new observations at the journal cap and varies identification order', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');

    expect(source).toContain("var appearsInNext = entryId && next.some");
    expect(source).not.toContain("if (next.length === priorLog.length) return");
    expect(source).toContain("var optionOffset = hashCoreFishingSeed");
  });
});
