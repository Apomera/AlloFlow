import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

beforeEach(() => resetStemLab());

describe('BirdLab field progression and scene engagement', () => {
  it('renders the durable rank, optional Target Search, and condition controls in I-Spy', () => {
    loadTool('stem_lab/stem_tool_birdlab.js', 'birdLab');
    const html = renderTool('birdLab', {
      birdLab: {
        view: 'ispy',
        blXp: 425,
        blXpLedger: {},
        blFieldCondition: 'dusk',
        foundByHabitat: { forest: { chickadee: true, nuthatch: true } },
        blRoundCounts: { forest: 2 },
        blEvidenceLog: {
          chickadee: { cues: { movement: true, call: true }, note: 'Moved headfirst down the trunk.' },
          nuthatch: { cues: { movement: true } },
        },
        blRecordFilter: 'found',
        blReportHistory: { forest: { habitatName: 'Forest' } },
      },
    });

    expect(html).toContain('Field Birder');
    expect(html).toContain('425 XP');
    expect(html).toContain('Target Search');
    expect(html).toContain('Free discovery active');
    expect(html).toContain('data-birdlab-target-search="free"');
    expect(html).toContain('Field conditions');
    expect(html).toContain('Dusk watch');
    expect(html).toContain('birdlab-condition-button');
    expect(html).toContain('birdlab-scene-hud--condition');
    expect(html).toContain('data-birdlab-target-search-state="free"');
    expect(html).toContain('Shape and flight behavior matter more than color');
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('Restart round');
    expect(html).toContain('Habitat evidence mastery');
    expect(html).toContain('1/7 species backed by field cues');
    expect(html).toContain('IDs need evidence');
    expect(html).toContain('Field journal note saved');
    expect(html).toContain('Review next evidence ID (1)');
    expect(html).toContain('Habitat field report');
    expect(html).toContain('19% compiled');
    expect(html).toContain('Overall habitat field report completion');
    expect(html).toContain('+40 XP');
    expect(html).toContain('Copy field report');
    expect(html).toContain('Copies a plain-text report for sharing or teacher feedback.');
    expect(html).toContain('Organize field records');
    expect(html).toContain('Showing 2 of 7');
    expect(html).toContain('Needs evidence 1');
    expect(html).toContain('Filter habitat bird records');
    expect(html).toContain('role="radio"');
    expect(html).toContain('Interactive Forest habitat scene');
    expect(html).toContain('role="region"');
    expect(html).toContain('1/5');
    expect(html).toContain('Habitats documented');
    expect(html).toContain('Report archive');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="birdlab-report-archive"');
    expect(html).toContain('Field Guide Passport');
    expect(html).toContain('1/5 documented');
    expect(html).toContain('Next passport stamp: Marsh');
    expect(html).toContain('Field guide habitat stamps');
    expect(html).toContain('Today&#x27;s expedition');
    expect(html).toContain('Daily expedition route progress');
    expect(html).toContain('Today&#x27;s expedition stops');
    expect(html).toContain('Complete all three for +25 field XP.');
    expect(html).toContain('Scene lens');
    expect(html).toContain('Choose scene lens');
    expect(html).toContain('Wide sweep');
    expect(html).toContain('Left sweep');
    expect(html).toContain('bird species in view');
    expect(html).toContain('Pause scene motion');
    expect(html).toContain('Previous scene lens');
    expect(html).toContain('Next scene lens');
    expect(html).toContain('Guided sweep');
    expect(html).toContain('Manual lens navigation.');
    expect(html).toContain('birdlab-scope-corners');
    expect(html).toContain('Next best field move');
    expect(html).toContain('Scan the habitat');
    expect(html).toContain('Adaptive field session');
    expect(html).toContain('data-birdlab-field-session');
    expect(html).toContain('Start adaptive field session');
    expect(html).toContain('Optional guidance - start when you want a focused field pass.');
    expect(html).toContain('Field report path');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain('#3');
  });

  it('renders an accessible persisted binocular hold independent of hint difficulty and conditions', () => {
    loadTool('stem_lab/stem_tool_birdlab.js', 'birdLab');
    const cases = [
      { mode: 'steady', seconds: '1.0', difficulty: 'expert', condition: 'dusk' },
      { mode: 'standard', seconds: '1.5', difficulty: 'easy', condition: 'dawn' },
      { mode: 'extended', seconds: '2.5', difficulty: 'normal', condition: 'day' },
    ];

    for (const testCase of cases) {
      const host = document.createElement('div');
      host.innerHTML = renderTool('birdLab', {
        birdLab: {
          view: 'ispy',
          activeHabitat: 'forest',
          blBinocularHoldMode: testCase.mode,
          blDifficulty: testCase.difficulty,
          blFieldCondition: testCase.condition,
        },
      });
      const holdControl = host.querySelector('[data-birdlab-binocular-hold="' + testCase.mode + '"]');
      expect(holdControl, testCase.mode + ' hold control').toBeTruthy();
      const select = holdControl.matches('select#birdlab-binocular-hold-select')
        ? holdControl
        : holdControl.querySelector('select#birdlab-binocular-hold-select');
      expect(select, testCase.mode + ' native hold select').toBeTruthy();
      expect(host.querySelector('label[for="birdlab-binocular-hold-select"]')).toBeTruthy();
      const options = [...select.querySelectorAll('option[data-birdlab-binocular-hold-option]')];
      expect(options.map((option) => option.getAttribute('data-birdlab-binocular-hold-option'))).toEqual([
        'steady', 'standard', 'extended',
      ]);
      expect(select.value).toBe(testCase.mode);
      expect(options.filter((option) => option.selected)).toHaveLength(1);
      expect(host.textContent).toContain('Hold steady for ' + testCase.seconds + ' seconds to identify.');
    }

    const defaultHost = document.createElement('div');
    defaultHost.innerHTML = renderTool('birdLab', {
      birdLab: { view: 'ispy', activeHabitat: 'forest', blDifficulty: 'expert', blFieldCondition: 'dusk' },
    });
    expect(defaultHost.querySelector('[data-birdlab-binocular-hold="standard"]')).toBeTruthy();
    expect(defaultHost.textContent).toContain('Hold steady for 1.5 seconds to identify.');
  });

  it('keeps Target Search opt-in while exposing one deterministic target when active', () => {
    loadTool('stem_lab/stem_tool_birdlab.js', 'birdLab');
    const assignmentDate = '2032-04-12';
    const renderSearchState = (assignmentSearchActive, assignmentComplete = false, extraData = {}) => renderTool('birdLab', {
      birdLab: Object.assign({
        view: 'ispy',
        activeHabitat: 'forest',
        blHintMode: false,
      }, extraData),
    }, {
      props: {
        birdLabVisualQa: {
          assignmentDate,
          assignmentSearchActive,
          assignmentComplete,
          lifecycleMs: 4000,
        },
      },
    });

    const freeHost = document.createElement('div');
    freeHost.innerHTML = renderSearchState(false);
    const freeCard = freeHost.querySelector('[data-birdlab-target-search="free"]');
    const freeRail = freeHost.querySelector('[data-birdlab-target-search-state="free"]');
    expect(freeCard).toBeTruthy();
    expect(freeRail).toBeTruthy();
    expect(freeCard.hasAttribute('data-birdlab-target-species')).toBe(false);
    expect(freeRail.hasAttribute('data-birdlab-target-species')).toBe(false);
    expect(freeCard.querySelector('button[aria-pressed="false"]')?.textContent).toContain('Start Target Search');
    expect(freeRail.textContent).toContain('Free discovery');
    expect(freeHost.querySelectorAll('[data-birdlab-assignment-target="true"]')).toHaveLength(0);

    const activeHost = document.createElement('div');
    activeHost.innerHTML = renderSearchState(true);
    const activeCard = activeHost.querySelector('[data-birdlab-target-search="active"]');
    const activeRail = activeHost.querySelector('[data-birdlab-target-search-state="active"]');
    expect(activeCard).toBeTruthy();
    expect(activeRail).toBeTruthy();
    expect(activeCard.querySelector('button[aria-pressed="true"]')?.textContent).toContain('Return to free scan');
    const targetSpecies = activeCard.getAttribute('data-birdlab-target-species');
    expect(targetSpecies).toBeTruthy();
    expect(activeRail.getAttribute('data-birdlab-target-species')).toBe(targetSpecies);
    const targetNodes = [...activeHost.querySelectorAll('[data-birdlab-assignment-target="true"]')];
    expect(targetNodes.length).toBeGreaterThanOrEqual(2);
    expect(targetNodes.every((node) => node.getAttribute('data-birdlab-species') === targetSpecies)).toBe(true);
    const targetName = activeRail.querySelector('strong')?.textContent.replace(/^Target:\s*/, '');
    expect(targetName).toBeTruthy();
    expect(activeCard.textContent).toContain('Find the ' + targetName);
    expect(freeRail.textContent).not.toContain(targetName);

    const repeatedHost = document.createElement('div');
    repeatedHost.innerHTML = renderSearchState(true);
    expect(repeatedHost.querySelector('[data-birdlab-target-search="active"]')?.getAttribute('data-birdlab-target-species')).toBe(targetSpecies);

    const knownTargetHost = document.createElement('div');
    knownTargetHost.innerHTML = renderSearchState(true, false, {
      foundByHabitat: { forest: { [targetSpecies]: true } },
    });
    expect(knownTargetHost.querySelector('button[data-birdlab-kind="bird"][data-birdlab-assignment-target="true"]')?.getAttribute('data-birdlab-found')).toBe('false');
    expect(knownTargetHost.querySelector('button[aria-label*="the active Target Search bird"][aria-label*="directly"]')).toBeTruthy();

    const completeHost = document.createElement('div');
    completeHost.innerHTML = renderSearchState(true, true);
    expect(completeHost.querySelector('[data-birdlab-target-search="complete"]')).toBeTruthy();
    expect(completeHost.querySelector('[data-birdlab-target-search-state="complete"]')).toBeTruthy();
    expect(completeHost.querySelectorAll('[data-birdlab-assignment-target="true"]')).toHaveLength(0);
  });

  it('persists a difficulty-specific Target Search clue ladder by assignment key', () => {
    const rawSource = fs.readFileSync('stem_lab/stem_tool_birdlab.js', 'utf8');
    const orderStart = rawSource.indexOf('TARGET_SEARCH_CLUE_ORDER');
    const laddersStart = rawSource.indexOf('TARGET_SEARCH_CLUE_LADDERS', orderStart);
    const fieldMarksStart = rawSource.indexOf('TARGET_SEARCH_FIELD_MARK_CLUES', laddersStart);
    expect(orderStart).toBeGreaterThan(-1);
    expect(laddersStart).toBeGreaterThan(orderStart);
    expect(fieldMarksStart).toBeGreaterThan(laddersStart);
    const clueConfigSource = rawSource.slice(orderStart, fieldMarksStart + 5000);
    expect(clueConfigSource).toMatch(/TARGET_SEARCH_CLUE_ORDER\s*=\s*\[\s*'habitat'\s*,\s*'silhouette'\s*,\s*'behavior'\s*,\s*'field-mark'\s*,\s*'spatial'\s*\]/);
    expect(clueConfigSource).toMatch(/easy\s*:\s*\[\s*'habitat'\s*,\s*'silhouette'\s*,\s*'behavior'\s*,\s*'field-mark'\s*,\s*'spatial'\s*\]/);
    expect(clueConfigSource).toMatch(/normal\s*:\s*\[\s*'habitat'\s*,\s*'field-mark'\s*,\s*'spatial'\s*\]/);
    expect(clueConfigSource).toMatch(/hard\s*:\s*\[\s*'spatial'\s*\]/);
    expect(clueConfigSource).toMatch(/expert\s*:\s*\[\s*\]/);

    const renderSource = loadTool('stem_lab/stem_tool_birdlab.js', 'birdLab').render.toString();
    expect(renderSource).toContain('d.blAssignmentClueProgress');
    expect(renderSource).toContain('assignmentClueProgress[assignmentKey]');
    expect(renderSource).toContain("upd('blAssignmentClueProgress'");
    expect(rawSource).toContain('assignmentClueProgress: d.blAssignmentClueProgress');
    expect(rawSource).toContain("upd('blAssignmentClueProgress', w.assignmentClueProgress");
    expect(renderSource).not.toContain('assignmentClueStage + 1');
    const clueDerivationStart = renderSource.indexOf('var assignmentClueLadderIds');
    const clueDerivationEnd = renderSource.indexOf('function setAssignmentSearchMode', clueDerivationStart);
    expect(clueDerivationStart).toBeGreaterThan(-1);
    expect(clueDerivationEnd).toBeGreaterThan(clueDerivationStart);
    const clueDerivationSource = renderSource.slice(clueDerivationStart, clueDerivationEnd);
    expect(clueDerivationSource).toContain('var assignmentClueRound = roundCounts[habitatId] || 0;');
    expect(clueDerivationSource).toContain('assignmentClueEntry.round === assignmentClueRound');
    expect(clueDerivationSource).toContain('assignmentClueEntry.revealed.filter');
    expect(clueDerivationSource).toContain('TARGET_SEARCH_CLUE_ORDER.indexOf(id) >= 0');

    const functionSlice = (name) => {
      const start = renderSource.indexOf('function ' + name + '(');
      expect(start, name + ' is missing').toBeGreaterThan(-1);
      const rest = renderSource.slice(start + 12);
      const nextFunction = rest.search(/\n\s*function\s+[A-Za-z0-9_]+\s*\(/);
      return nextFunction < 0 ? renderSource.slice(start) : renderSource.slice(start, start + 12 + nextFunction);
    };
    for (const boundary of ['setAssignmentSearchMode', 'switchHabitat', 'startNewRound']) {
      const boundarySource = functionSlice(boundary);
      expect(boundarySource, boundary + ' should preserve clue history').not.toContain('setAssignmentClueProgress(');
      expect(boundarySource, boundary + ' should preserve clue history').not.toContain("upd('blAssignmentClueProgress'");
    }

    const assignmentDate = '2032-04-12';
    const renderStage = (difficulty, assignmentClueStage) => renderTool('birdLab', {
      birdLab: { view: 'ispy', activeHabitat: 'forest', blDifficulty: difficulty, blHintMode: true },
    }, {
      props: { birdLabVisualQa: { assignmentDate, assignmentSearchActive: true, assignmentClueStage, lifecycleMs: 4000 } },
    });
    const stageHost = document.createElement('div');
    stageHost.innerHTML = renderStage('normal', 'field-mark');
    const textClue = stageHost.querySelector('[data-birdlab-target-clue-stage="field-mark"]');
    expect(textClue).toBeTruthy();
    expect(textClue.getAttribute('data-birdlab-target-clue-kind')).toBe('text');
    expect(textClue.getAttribute('data-birdlab-target-clue-spatial')).not.toBe('true');
    const activeCard = stageHost.querySelector('[data-birdlab-target-search="active"]');
    expect(activeCard.querySelector('[aria-live="polite"], [role="status"]')).toBeTruthy();
    expect([...activeCard.querySelectorAll('button')].some((button) => /clue/i.test(button.getAttribute('aria-label') || button.textContent))).toBe(true);

    const baselineHost = document.createElement('div');
    baselineHost.innerHTML = renderStage('normal', 'habitat');
    const stageScene = stageHost.querySelector('[data-birdlab-realistic-scene]');
    const baselineScene = baselineHost.querySelector('[data-birdlab-realistic-scene]');
    expect(stageScene).toBeTruthy();
    expect(stageScene.outerHTML).toBe(baselineScene.outerHTML);

    const spatialHost = document.createElement('div');
    spatialHost.innerHTML = renderStage('hard', 'spatial');
    const spatialClue = spatialHost.querySelector('[data-birdlab-target-clue-stage="spatial"]');
    expect(spatialClue).toBeTruthy();
    expect(spatialClue.getAttribute('data-birdlab-target-clue-kind')).toBe('spatial');
    expect(spatialClue.getAttribute('data-birdlab-target-clue-spatial')).toBe('true');

    const expertHost = document.createElement('div');
    expertHost.innerHTML = renderStage('expert', null);
    const expertCard = expertHost.querySelector('[data-birdlab-target-search="active"]');
    expect(expertCard.querySelector('[data-birdlab-target-clue-kind]')).toBeNull();
    expect([...expertCard.querySelectorAll('button')].some((button) => /use.*clue/i.test(button.textContent))).toBe(false);
  });
  it('hydrates restored gameplay state before mount without replaying clue side effects', () => {
    const rawSource = fs.readFileSync('stem_lab/stem_tool_birdlab.js', 'utf8');
    const renderSource = loadTool('stem_lab/stem_tool_birdlab.js', 'birdLab').render.toString();

    const hydrationStart = rawSource.indexOf('var _hydratedRef = useRef(false);');
    const hydrationEnd = rawSource.indexOf('var viewState =', hydrationStart);
    expect(hydrationStart).toBeGreaterThan(-1);
    expect(hydrationEnd).toBeGreaterThan(hydrationStart);
    const hydrationSource = rawSource.slice(hydrationStart, hydrationEnd);
    for (const marker of ['snapshotHasXp', 'snapshotHasXpLedger', 'snapshotHasRoundCounts']) {
      expect(hydrationSource).toContain(marker);
    }
    const orderedHydrationFallback = (snapshotBranch, localBranch) => {
      const snapshotAt = hydrationSource.indexOf(snapshotBranch);
      const localAt = hydrationSource.indexOf(localBranch);
      expect(snapshotAt, snapshotBranch).toBeGreaterThan(-1);
      expect(localAt, localBranch).toBeGreaterThan(snapshotAt);
    };
    orderedHydrationFallback("if (snapshotHasXp) upd('blXp'", "else if (savedProgress) upd('blXp'");
    orderedHydrationFallback("if (snapshotHasXpLedger) upd('blXpLedger'", "else if (savedProgress) upd('blXpLedger'");
    orderedHydrationFallback("if (snapshotHasRoundCounts) upd('blRoundCounts'", "else if (savedRounds) upd('blRoundCounts'");
    for (const field of ['blXp', 'blXpLedger', 'blRoundCounts']) {
      expect(hydrationSource).toContain('if (d.' + field + ' === undefined)');
    }

    const initialFallback = (marker, dataField, snapshotField, length = 420) => {
      const start = renderSource.indexOf('var ' + marker);
      expect(start, marker).toBeGreaterThan(-1);
      const initialSource = renderSource.slice(start, start + length);
      expect(initialSource).toContain('d.' + dataField + ' !== undefined');
      expect(initialSource).toContain('birdLabWindowSnapshot.' + snapshotField);
      expect(initialSource.indexOf('d.' + dataField)).toBeLessThan(initialSource.indexOf('birdLabWindowSnapshot.' + snapshotField));
    };
    initialFallback('initialAssignmentSearchActive', 'blAssignmentSearchActive', 'assignmentSearchActive');
    initialFallback('initialRoundCounts', 'blRoundCounts', 'roundCounts');
    initialFallback('initialHintsUsed', 'blHintsUsed', 'hintsUsed');
    initialFallback('initialAssignmentClueProgress', 'blAssignmentClueProgress', 'assignmentClueProgress');
    initialFallback('initialSpotStreak', 'blSpotStreak', 'spotStreak');
    initialFallback('initialHabitatHinted', 'blHabitatHinted', 'habitatHinted');
    initialFallback('initialFieldXp', 'blXp', 'xp');
    initialFallback('initialXpLedger', 'blXpLedger', 'xpLedger');
    initialFallback('initialHintMode', 'blHintMode', 'hintMode');
    const difficultyInitialStart = renderSource.indexOf('var initialDifficulty');
    expect(difficultyInitialStart).toBeGreaterThan(-1);
    const difficultyInitialSource = renderSource.slice(difficultyInitialStart, difficultyInitialStart + 420);
    expect(difficultyInitialSource).toContain('DIFFICULTY_BUDGETS[d.blDifficulty]');
    expect(difficultyInitialSource).toContain('birdLabWindowSnapshot.difficulty');
    expect(difficultyInitialSource.indexOf('d.blDifficulty')).toBeLessThan(difficultyInitialSource.indexOf('birdLabWindowSnapshot.difficulty'));

    const holdInitialStart = renderSource.indexOf('var savedBinocularHoldMode');
    expect(holdInitialStart).toBeGreaterThan(-1);
    const holdInitialSource = renderSource.slice(holdInitialStart, holdInitialStart + 700);
    expect(holdInitialSource).toContain('d.blBinocularHoldMode && BINOCULAR_HOLD_DURATIONS[d.blBinocularHoldMode]');
    expect(holdInitialSource).toContain('birdLabWindowSnapshot.binocularHoldMode');
    expect(holdInitialSource).toContain('d.blBinocularHoldMode === undefined');

    const mirrorStart = rawSource.indexOf('window.__alloflowBirdLab = Object.assign({}, current, {');
    const mirrorEnd = rawSource.indexOf('// Hot-reload from a project-JSON load mid-session.', mirrorStart);
    expect(mirrorStart).toBeGreaterThan(-1);
    expect(mirrorEnd).toBeGreaterThan(mirrorStart);
    const mirrorSource = rawSource.slice(mirrorStart, mirrorEnd);
    expect(mirrorSource).toMatch(/assignmentSearchActive:\s*d\.blAssignmentSearchActive !== undefined[\s\S]{0,140}current\.assignmentSearchActive === true/);
    expect(mirrorSource).toMatch(/binocularHoldMode:\s*d\.blBinocularHoldMode\s*\|\|\s*current\.binocularHoldMode\s*\|\|\s*'standard'/);
    expect(mirrorSource).toMatch(/difficulty:\s*d\.blDifficulty\s*\|\|\s*current\.difficulty\s*\|\|\s*'normal'/);
    expect(mirrorSource).toMatch(/hintMode:\s*d\.blHintMode !== undefined[\s\S]{0,120}current\.hintMode !== false/);
    expect(mirrorSource).toContain('d.blDifficulty, d.blHintMode');

    for (const guardedSync of [
      'if (qaAssignmentSearchActive != null || d.blAssignmentSearchActive === undefined) return;',
      'if (d.blRoundCounts !== undefined && d.blRoundCounts !== roundCounts)',
      'if (d.blHintsUsed !== undefined && d.blHintsUsed !== hintsUsed)',
      'if (d.blAssignmentClueProgress && d.blAssignmentClueProgress !== assignmentClueProgress)',
      'if (d.blSpotStreak !== undefined',
      'if (d.blHabitatHinted !== undefined',
      'if (d.blXp === undefined && d.blXpLedger === undefined) return;',
      'if (qaBinocularHoldMode || d.blBinocularHoldMode === undefined) return;',
      'if (d.blDifficulty === undefined) return;',
      'if (d.blHintMode === undefined) return;',
    ]) {
      expect(renderSource, guardedSync).toContain(guardedSync);
    }
    expect(renderSource).toContain('useEffect(function() { hintsUsedRef.current = hintsUsed; }, [hintsUsed]);');
    expect(renderSource).toContain('hintsUsedRef.current = d.blHintsUsed || {};');

    const restoreStart = rawSource.indexOf('function onRestore()');
    const restoreEnd = rawSource.indexOf("window.addEventListener('alloflow-birdlab-restored', onRestore);", restoreStart);
    expect(restoreStart).toBeGreaterThan(-1);
    expect(restoreEnd).toBeGreaterThan(restoreStart);
    const restoreSource = rawSource.slice(restoreStart, restoreEnd);
    for (const restoredField of [
      'blXp', 'blXpLedger', 'blRoundCounts', 'blAssignmentSearchActive',
      'blAssignmentClueProgress', 'blHintsUsed', 'blHabitatHinted',
      'blSpotStreak', 'blBinocularHoldMode', 'blDifficulty', 'blHintMode',
    ]) {
      expect(restoreSource).toContain("upd('" + restoredField + "'");
    }
    for (const replayedEffect of ['consumeHintUse(', 'fireHint(', 'activateSpatialHint(']) {
      expect(restoreSource, 'restore must not replay ' + replayedEffect).not.toContain(replayedEffect);
    }

    const assignmentDate = '2032-04-12';
    delete window.__alloflowBirdLab;
    const seedHost = document.createElement('div');
    seedHost.innerHTML = renderTool('birdLab', {
      birdLab: { view: 'ispy', activeHabitat: 'forest', blDifficulty: 'normal', blHintMode: true },
    }, {
      props: { birdLabVisualQa: { assignmentDate, assignmentSearchActive: true, lifecycleMs: 4000 } },
    });
    const targetSpecies = seedHost.querySelector('[data-birdlab-target-search="active"]')?.getAttribute('data-birdlab-target-species');
    expect(targetSpecies).toBeTruthy();
    const assignmentKey = 'assignment:' + assignmentDate + ':forest:' + targetSpecies;

    window.__alloflowBirdLab = {
      assignmentSearchActive: true,
      roundCounts: { forest: 3 },
      assignmentClueProgress: { [assignmentKey]: { version: 1, round: 3, revealed: ['spatial'] } },
      hintsUsed: { forest: 2 },
      habitatHinted: { forest: true },
      spotStreak: 4,
      xp: 777,
      xpLedger: { 'restore:seed': true },
      binocularHoldMode: 'extended',
      difficulty: 'hard',
      hintMode: false,
    };
    try {
      const restoredHost = document.createElement('div');
      restoredHost.innerHTML = renderTool('birdLab', {
        birdLab: { view: 'ispy', activeHabitat: 'forest' },
      }, {
        props: { birdLabVisualQa: { assignmentDate, lifecycleMs: 4000 } },
      });
      expect(restoredHost.querySelector('[data-birdlab-target-search="active"]')).toBeTruthy();
      expect(restoredHost.querySelector('[data-birdlab-target-cue="hard"]')).toBeTruthy();
      expect(restoredHost.querySelector('[data-birdlab-target-clue-stage="spatial"]')).toBeTruthy();
      expect(restoredHost.textContent).toContain('Accessibility mode');
      expect(restoredHost.querySelector('[aria-label="Hint budget difficulty"]')).toBeNull();
      expect(restoredHost.querySelector('[data-birdlab-binocular-hold="extended"]')).toBeTruthy();
      expect(restoredHost.textContent).toContain('777 XP');
      expect(restoredHost.textContent).toContain('#4');

      const explicitHost = document.createElement('div');
      explicitHost.innerHTML = renderTool('birdLab', {
        birdLab: {
          view: 'ispy',
          activeHabitat: 'forest',
          blDifficulty: 'easy',
          blHintMode: true,
          blAssignmentSearchActive: false,
          blRoundCounts: { forest: 0 },
          blAssignmentClueProgress: {},
          blHintsUsed: { forest: 0 },
          blHabitatHinted: {},
          blSpotStreak: 0,
          blXp: 123,
          blXpLedger: {},
          blBinocularHoldMode: 'steady',
        },
      }, {
        props: { birdLabVisualQa: { assignmentDate, lifecycleMs: 4000 } },
      });
      expect(explicitHost.querySelector('[data-birdlab-target-search="free"]')).toBeTruthy();
      expect(explicitHost.querySelector('[data-birdlab-target-clue-stage]')).toBeNull();
      expect(explicitHost.textContent).toContain('Hint mode');
      expect(explicitHost.querySelector('[aria-label="Hint budget difficulty"] [role="radio"][aria-checked="true"]')?.textContent).toContain('Easy');
      expect(explicitHost.querySelector('[data-birdlab-binocular-hold="steady"]')).toBeTruthy();
      expect(explicitHost.textContent).toContain('123 XP');
    } finally {
      delete window.__alloflowBirdLab;
    }
  });

  it('keys daily content by the learner-local date while preserving the QA assignment seam', () => {
    const rawSource = fs.readFileSync('stem_lab/stem_tool_birdlab.js', 'utf8');
    const helperStart = rawSource.indexOf('function birdLabLocalDateKey');
    const helperEnd = rawSource.indexOf('// BirdLab', helperStart);
    expect(helperStart).toBeGreaterThan(-1);
    expect(helperEnd).toBeGreaterThan(helperStart);
    const helperSource = rawSource.slice(helperStart, helperEnd);
    expect(helperSource).toContain('date.getFullYear()');
    expect(helperSource).toContain('date.getMonth() + 1');
    expect(helperSource).toContain('date.getDate()');
    expect(helperSource).not.toContain('toISOString');
    const localDateKey = Function(helperSource + '; return birdLabLocalDateKey;')();
    expect(localDateKey(new Date(2031, 5, 15, 23, 30))).toBe('2031-06-15');
    expect(localDateKey('not-a-date')).toBe('');

    const renderSource = loadTool('stem_lab/stem_tool_birdlab.js', 'birdLab').render.toString();
    const dailyStart = renderSource.indexOf('function getDailyChallenge()');
    const dailyEnd = renderSource.indexOf('var dailyChallenge = getDailyChallenge()', dailyStart);
    expect(dailyStart).toBeGreaterThan(-1);
    expect(dailyEnd).toBeGreaterThan(dailyStart);
    const dailySource = renderSource.slice(dailyStart, dailyEnd);
    expect(dailySource).toContain('birdLabLocalDateKey()');
    expect(dailySource).not.toContain('toISOString');
    expect(renderSource).toContain('birdLabVisualQa.assignmentDate ? String(birdLabVisualQa.assignmentDate) : dailyChallenge.date');
  });
  it('ships idempotent reward keys for every meaningful gameplay milestone', () => {
    const config = loadTool('stem_lab/stem_tool_birdlab.js', 'birdLab');
    expect(typeof config.render).toBe('function');
    const source = config.render.toString();
    expect(source).toContain("'spot:' + habitatId + ':' + bird.species");
    expect(source).toContain("'clean:' + habitatId + ':' + difficulty");
    expect(source).toContain("'lifer:' + bird.species");
    expect(source).toContain("'daily:' + dailyKey");
    expect(source).toContain("'assignment:' + assignmentDate");
    expect(source).toContain('function startNewRound(nextDifficulty)');
    expect(source).toContain('delete nextHinted[habitatId]');
    expect(source).toContain('if (!isFirstFind)');
    expect(source).toContain('&& isFirstFind');
    expect(source).toContain('if (foundCount > 0) startNewRound(nextDifficulty)');
    expect(source).toContain("lsSet('birdLab.rounds.v1', nextCounts)");
    expect(source).toContain('roundCounts: d.blRoundCounts');
    expect(source).toContain('FIELD_EVIDENCE');
    expect(source).toContain("'evidence:' + speciesKey");
    expect(source).toContain("lsSet('birdLab.evidence.v1', nextEvidenceLog)");
    expect(source).toContain('evidenceLog: d.blEvidenceLog');
    expect(source).toContain("'evidence-habitat:' + habitatId");
    expect(source).toContain('evidenceMasteryPct');
    expect(source).toContain("'aria-label': 'Evidence-backed species in this habitat'");
    expect(source).toContain('speciesEvidenceReady');
    expect(source).toContain('function updateFieldNote(value)');
    expect(source).toContain("'note:' + speciesKey");
    expect(source).toContain('maxLength: 240');
    expect(source).toContain('Notes save automatically');
    expect(source).toContain('Object.assign({}, existing, { cues: nextCues');
    expect(source).toContain('speciesHasNote');
    expect(source).toContain('function openNextFieldRecord()');
    expect(source).toContain('var incompleteEvidenceBirds = []');
    expect(source).toContain('var incompleteNoteBirds = []');
    expect(source).toContain('Continue scanning');
    expect(source).toContain('Open the next unfinished bird record');
    expect(source).toContain('function checkHabitatFieldReport(nextEvidenceLog)');
    expect(source).toContain("'field-report:' + habitatId");
    expect(source).toContain('checkHabitatFieldReport(nextEvidenceLog)');
    expect(source).toContain('FIELD_REPORT_STAGES');
    expect(source).toContain('fieldReportPct');
    expect(source).toContain('journalMasteredCount');
    expect(source).toContain('function buildHabitatFieldReportText()');
    expect(source).toContain('function copyHabitatFieldReport()');
    expect(source).toContain("'BirdLab Habitat Field Report'");
    expect(source).toContain("'Species records'");
    expect(source).toContain("'NOT FOUND'");
    expect(source).toContain('navigator.clipboard.writeText(reportText)');
    expect(source).toContain("document.execCommand('copy')");
    expect(source).toContain('function switchRecordFilter(nextFilter)');
    expect(source).toContain("upd('blRecordFilter', nextFilter)");
    expect(source).toContain('var RECORD_FILTERS = [');
    expect(source).toContain('var habitatSpecies = habitatSpeciesBirds(habitat);');
    expect(source).toContain('var visibleRecordBirds = habitatSpecies.filter');
    expect(source).toContain('visibleRecordBirds.map(function(b, i)');
    expect(source).toContain("key: 'kbd-' + b.species");
    expect(source).toContain('No records in ');
    expect(source).toContain('function focusBirdLabRefSoon(targetRef)');
    expect(source).toContain("lsSet('birdLab.reports.v1', nextReportHistory)");
    expect(source).toContain('reportHistory: d.blReportHistory');
    expect(source).toContain('savedReportHistory');
    expect(source).toContain('reportHistoryCount');
    expect(source).toContain('Habitats documented');
    expect(source).toContain('reportArchiveOpen_state');
    expect(source).toContain('setReportArchiveOpen(true)');
    expect(source).toContain('Submitted habitat report archive');
    expect(source).toContain('Object.keys(reportHistory).sort()');
    expect(source).toContain('passportHabitatStats');
    expect(source).toContain('passportSummary');
    expect(source).toContain("data-birdlab-passport");
    expect(source).toContain('Field guide habitat stamps');
    expect(source).toContain('switchHabitat(passportItem.id)');
    expect(source).toContain('maybeCompleteExpeditionRoute');
    expect(source).toContain('expeditionRouteIds');
    expect(source).toContain('expeditionKey');
    expect(source).toContain('data-birdlab-expedition');
    expect(source).toContain('Daily expedition route');
    expect(source).toContain('switchHabitat(stop.id)');
    expect(source).toContain('expeditionCelebration_state');
    expect(source).toContain('data-birdlab-expedition-celebration');
    expect(source).toContain('Daily expedition complete');
    expect(source).toContain('Dismiss expedition celebration and keep exploring');
    expect(source).toContain('fieldActionStage');
    expect(source).toContain('fieldActionHandler');
    expect(source).toContain('Next best field move');
    expect(source).toContain('Support the next ID');
    expect(source).toContain('function openBirdRecord(species, message)');
    expect(source).toContain('function continueHabitatScanning()');
    expect(source).toContain('focusBirdLabRefSoon(revealHeadingRef)');
    expect(source).toContain('focusBirdLabRefSoon(habitatSceneRef)');
    expect(source).toContain("setRecordFilter('all')");
    expect(source).toContain("id: 'birdlab-revealed-species-title'");
    expect(source).toContain("'aria-current': pickedSpeciesKey === b.species");
    expect(source).toContain('var fieldReportCelebration_state = useState(null)');
    expect(source).toContain('if (reportAwarded)');
    expect(source).toContain('setFieldReportCelebration({ habitatId: habitatId');
    expect(source).toContain('setFieldReportCelebration(null); }, 4800');
    expect(source).toContain("'data-birdlab-report-celebration': 'true'");
    expect(source).toContain('Field report submitted');
    expect(source).toContain('+40 field XP');
    expect(source).toContain('Dismiss field report celebration and keep exploring');
    expect(source).toContain("'aria-pressed': selected");
    expect(source).toContain('sceneLens_state');
    expect(source).toContain('sceneMotion_state');
    expect(source).toContain('SCENE_LENSES');
    expect(source).toContain('function sceneLensForBird(bird)');
    expect(source).toContain('function switchSceneLens(nextLens)');
    expect(source).toContain('function toggleSceneMotion()');
    expect(source).toContain('sceneViewBox');
    expect(source).toContain('function renderSceneBirds(layer, keyPrefix)');
    expect(source).toContain("var motionClass = 'birdlab-motion-subject birdlab-' + motionName");
    expect(source).toContain('data-birdlab-scene-controls');
    expect(source).toContain('function stepSceneLens(delta)');
    expect(source).toContain('sceneLensContainsBird');
    expect(source).toContain('sceneLensStats');
    expect(source).toContain('setSceneLens(sceneLensForBird(bird))');
    expect(source).toContain('Previous scene lens');
    expect(source).toContain('Next scene lens');
    expect(source).toContain('IntersectionObserver');
    expect(source).toContain('sceneInView_state');
    expect(source).toContain('sceneActive');
    expect(source).toContain('birdlab-scene--motion-off');
    expect(source).toContain('birdlab-bird-found');
    expect(source).toContain('birdlab-picked-ring');
    expect(source).toContain('picked-reticle');
    expect(source).toContain('Selected-bird reticle');
    expect(source).toContain('birdlab-scope-corners');
    expect(source).toContain('birdlab-selected-label');
    expect(source).toContain('selectedSpecies');
    expect(source).toContain('sceneSweep_state');
    expect(source).toContain('function toggleSceneSweep()');
    expect(source).toContain('function nextSceneSweepLensId(currentId)');
    expect(source).toContain('function shouldAdvanceSceneSweep()');
    expect(source).toContain('Finish a zone to move to the next lens.');
    expect(source).toContain("if (sceneSweep && shouldAdvanceSceneSweep())");
    expect(source).not.toContain("sceneSweep ? 'left'");
    expect(source).toContain("var firstSweepLens = nextSceneSweepLensId('right')");
    expect(source).toContain("var roundStartLens = sceneSweep ? nextSceneSweepLensId('right') : 'wide'");
    expect(source).toContain("upd('blSceneLens', roundStartLens)");
    expect(source).toContain('fieldSession_state');
    expect(source).toContain('fieldSessionHistory_state');
    expect(source).toContain("birdLab.session.v1");
    expect(source).toContain("birdLab.sessions.v1");
    expect(source).toContain('function startFieldSession()');
    expect(source).toContain('sessionSteps');
    expect(source).toContain('sessionCoach');
    expect(source).toContain('sessionProgressPct');
    expect(source).toContain('sessionComplete');
    expect(source).toContain('completedAt');
    expect(source).toContain('data-birdlab-field-session');
    expect(source).toContain('investigation habits logged');
  });
});
