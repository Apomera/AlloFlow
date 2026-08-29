import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_fisherlab.js');

function loadFisherCore() {
  resetStemLab();
  loadTool('stem_lab/stem_tool_fisherlab.js', 'fisherLab');
  return window.__FisherLabCore;
}

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

describe('Fisher Lab accessibility persistence contract', () => {
  it('uses safe defaults and accepts only literal true preference values', () => {
    const { getCoreAccessibilityPreferences } = loadFisherCore();

    expect(getCoreAccessibilityPreferences()).toEqual({
      staticCamera: false,
      captionMode: false,
      largeText: false
    });
    expect(getCoreAccessibilityPreferences(null)).toEqual({
      staticCamera: false,
      captionMode: false,
      largeText: false
    });
    expect(getCoreAccessibilityPreferences({
      staticCamera: true,
      captionMode: 'true',
      largeText: 1,
      contrastMode: true
    })).toEqual({
      staticCamera: true,
      captionMode: false,
      largeText: false
    });
  });

  it('returns detached canonical updates without mutating input or adding unknown keys', () => {
    const { setCoreAccessibilityPreference } = loadFisherCore();
    const current = { staticCamera: true, captionMode: false, largeText: true };

    const updated = setCoreAccessibilityPreference(current, 'captionMode', true);
    expect(updated).toEqual({ staticCamera: true, captionMode: true, largeText: true });
    expect(updated).not.toBe(current);
    expect(current).toEqual({ staticCamera: true, captionMode: false, largeText: true });

    const unknown = setCoreAccessibilityPreference(current, 'contrastMode', true);
    expect(unknown).toEqual(current);
    expect(unknown).not.toBe(current);
    expect(unknown).not.toHaveProperty('contrastMode');
    expect(setCoreAccessibilityPreference(current, 'largeText', 'true')).toMatchObject({ largeText: false });
  });

  it('normalizes saved accessibility data through the shared helper contract', () => {
    const { getCoreAccessibilityPreferences, normalizeFisherLabState } = loadFisherCore();
    const input = { a11y: { staticCamera: true, captionMode: 1, largeText: true } };
    const normalized = normalizeFisherLabState(input);

    expect(normalized.a11y).toEqual(getCoreAccessibilityPreferences(input.a11y));
    expect(normalized.a11y).not.toBe(input.a11y);
    input.a11y.staticCamera = false;
    expect(normalized.a11y.staticCamera).toBe(true);

    const source = fs.readFileSync(sourcePath, 'utf8');
    const start = source.indexOf('function normalizeFisherLabState');
    const end = source.indexOf('\n  function loadState', start);
    expect(source.slice(start, end)).toContain('a11y: getCoreAccessibilityPreferences(input.a11y)');
  });

  it('persists preference changes and passes reduced motion into each simulator launch', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const render = source.slice(source.indexOf('function _renderFisherLab'));
    const launchStart = render.indexOf('harborRef.current = initHarborSim');
    const launchEnd = render.indexOf('});', launchStart);
    const launchBlock = render.slice(launchStart, launchEnd);

    expect(render).toContain('var accessibilityHook = useState(getCoreAccessibilityPreferences(stateInit.a11y));');
    expect(render).toContain('s.a11y = getCoreAccessibilityPreferences(accessibilityPreferences);');
    expect(render).toContain('[accessibilityPreferences.staticCamera, accessibilityPreferences.captionMode, accessibilityPreferences.largeText]');
    expect(launchStart).toBeGreaterThan(-1);
    expect(launchBlock).toContain('staticCamera: accessibilityPreferences.staticCamera');
  });
});

describe('Fisher Lab corrupted persistence recovery', () => {
  it('renders safely after malformed JSON and invalid saved collection shapes', () => {
    const cases = [
      '{not-json',
      JSON.stringify({
        region: 'toString',
        lifeLog: { speciesId: 'cod' },
        completedMissions: [],
        speciesCaught: 'cod',
        coreVoyageMode: '__proto__',
        a11y: null
      })
    ];

    try {
      cases.forEach((raw) => {
        window.localStorage.setItem('fisherLab.state.v1', raw);
        resetStemLab();
        loadTool('stem_lab/stem_tool_fisherlab.js', 'fisherLab');
        expect(() => renderTool('fisherLab')).not.toThrow();
      });
    } finally {
      window.localStorage.removeItem('fisherLab.state.v1');
    }
  });
});
