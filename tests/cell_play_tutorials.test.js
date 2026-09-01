import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const CELL_PLAY_PATHS = [
  'stem_lab/stem_tool_cell.js',
  'desktop/web-app/public/stem_lab/stem_tool_cell.js',
];

const ORGANISM_IDS = [
  'amoeba', 'paramecium', 'euglena', 'wbc', 'bacterium', 'plantcell',
  'diatom', 'volvox', 'stentor', 'tardigrade', 'spirillum',
];
function checkpointHtml(html, step) {
  const segment = html.split('data-cell-checkpoint-step="' + step + '"')[1];
  return segment ? segment.split('</article>')[0] : '';
}


describe('cell simulator organism play tutorials', () => {
  beforeEach(() => resetStemLab());

  it('keeps an organism-specific briefing for every playable model in both mirrors', () => {
    const source = readFileSync(CELL_PLAY_PATHS[0], 'utf8');
    const mirror = readFileSync(CELL_PLAY_PATHS[1], 'utf8');
    expect(mirror).toBe(source);

    const tutorialSection = source.split('var CELL_PLAY_TUTORIALS = {')[1].split('function cellPlayTutorialFor')[0];
    ORGANISM_IDS.forEach((id) => {
      expect(tutorialSection).toMatch(new RegExp('\\b' + id + ': \\{'));
    });
    expect(tutorialSection.match(/classification:/g)).toHaveLength(ORGANISM_IDS.length);
    expect(tutorialSection.match(/movement:/g)).toHaveLength(ORGANISM_IDS.length);
    expect(tutorialSection.match(/connection:/g)).toHaveLength(ORGANISM_IDS.length);
    expect(tutorialSection.match(/note:/g)).toHaveLength(ORGANISM_IDS.length);
    expect(tutorialSection.match(/targetVisual:/g)).toHaveLength(ORGANISM_IDS.length);
    const targetVisualSection = source.split('var CELL_PLAY_TARGET_VISUALS = {')[1].split('var CELL_PLAY_CONTROL_LOOPS')[0];
    ['food', 'nutrient', 'pathogen', 'light', 'structure'].forEach((kind) => {
      expect(targetVisualSection).toMatch(new RegExp('\\b' + kind + ': \\{'));
    });
    expect(targetVisualSection).toContain("food: { key: 'food'");
    expect(targetVisualSection).toContain("shape: 'diamond'");
    expect(targetVisualSection).toContain("shape: 'burst'");
    expect(tutorialSection).toContain("plantcell: { classification: 'Eukaryotic plant tissue cell'");
    expect(tutorialSection).toContain('stationary: true');
    const controlLoopSection = source.split('var CELL_PLAY_CONTROL_LOOPS = {')[1].split('var CELL_PLAY_PREDICTIONS')[0];
    ORGANISM_IDS.forEach((id) => expect(controlLoopSection).toMatch(new RegExp('\\b' + id + ': ')));
    expect(controlLoopSection.match(/input:/g)).toHaveLength(ORGANISM_IDS.length);
    expect(controlLoopSection.match(/idle:/g)).toHaveLength(ORGANISM_IDS.length);
    expect(controlLoopSection.match(/action:/g)).toHaveLength(ORGANISM_IDS.length);
    expect(controlLoopSection.match(/outcome:/g)).toHaveLength(ORGANISM_IDS.length);
    expect(controlLoopSection.match(/visual:/g)).toHaveLength(ORGANISM_IDS.length);
    expect(controlLoopSection.match(/evidence:/g)).toHaveLength(ORGANISM_IDS.length);
    expect(controlLoopSection).toContain("plantcell: { input: 'Select a label'");
    expect(controlLoopSection).toContain("amoeba: { input: 'Direction input', idle: 'Pseudopods ready', action: 'Pseudopods extend', outcome: 'Cell crawls', short: 'Pseudopods', visual: 'pseudopod'");
    expect(controlLoopSection).toContain("paramecium: { input: 'Direction input', idle: 'Cilia ready', action: 'Cilia beat together', outcome: 'Cell swims', short: 'Cilia', visual: 'cilia'");
    expect(controlLoopSection).toContain("spirillum: { input: 'Direction input', idle: 'Bipolar flagella ready', action: 'Bipolar flagella rotate', outcome: 'Body corkscrews', short: 'Flagella', visual: 'bipolar_flagella'");
    expect(controlLoopSection).toContain("evidence: 'Pseudopods \\u2192 engulfment'");
    const predictionSection = source.split('var CELL_PLAY_PREDICTIONS = {')[1].split('var CELL_PLAY_EVIDENCE_STATES')[0];
    ORGANISM_IDS.forEach((id) => expect(predictionSection).toMatch(new RegExp('\\b' + id + ': ')));
    expect(predictionSection.match(/prompt:/g)).toHaveLength(ORGANISM_IDS.length);
    expect(predictionSection.match(/options:/g)).toHaveLength(ORGANISM_IDS.length);
    expect(predictionSection).toContain('What visible change should occur when food is captured?');
    const evidenceStateSection = source.split('var CELL_PLAY_EVIDENCE_STATES = {')[1].split('var CELL_PLAY_EXPLANATION_CHECKS')[0];
    ['food', 'nutrient', 'pathogen', 'light', 'structure'].forEach((kind) => {
      expect(evidenceStateSection).toMatch(new RegExp('\\b' + kind + ': \\{'));
    });
    expect(evidenceStateSection).toContain('Movement alone does not count as feeding evidence.');
    expect(evidenceStateSection).not.toContain(' ? ');
    expect(evidenceStateSection).toContain('Light exposure was interrupted.');
    const explanationCheckSection = source.split('var CELL_PLAY_EXPLANATION_CHECKS = {')[1].split('var CELL_PLAY_REFLECTIONS')[0];
    ORGANISM_IDS.forEach((id) => expect(explanationCheckSection).toMatch(new RegExp('\\b' + id + ': ')));
    expect(explanationCheckSection.match(/correct: true/g)).toHaveLength(ORGANISM_IDS.length);
    expect(explanationCheckSection.match(/correct: false/g)).toHaveLength(ORGANISM_IDS.length);
    const reflectionSection = source.split('var CELL_PLAY_REFLECTIONS = {')[1].split('function cellPlayTutorialFor')[0];
    ORGANISM_IDS.forEach((id) => expect(reflectionSection).toMatch(new RegExp('\\b' + id + ': ')));
    expect(reflectionSection).toContain('How does legged animal locomotion differ');
    const evidenceSection = source.split('var CELL_PLAY_EVIDENCE = {')[1].split('var CELL_PLAY_COMPARISONS')[0];
    ORGANISM_IDS.forEach((id) => expect(evidenceSection).toMatch(new RegExp('\\b' + id + ': ')));
    expect(evidenceSection.match(/: '/g)).toHaveLength(ORGANISM_IDS.length);
    const comparisonSection = source.split('var CELL_PLAY_COMPARISONS = {')[1].split('var CELL_PLAY_FOCUS_STRUCTURES')[0];
    ORGANISM_IDS.forEach((id) => expect(comparisonSection).toMatch(new RegExp('\\b' + id + ': ')));
    expect(comparisonSection.match(/with:/g)).toHaveLength(ORGANISM_IDS.length);
    const focusStructureSection = source.split('var CELL_PLAY_FOCUS_STRUCTURES = {')[1].split('function cellPlayTargetVisualFor')[0];
    ORGANISM_IDS.forEach((id) => expect(focusStructureSection).toMatch(new RegExp('\\b' + id + ': \\[')));
    expect(focusStructureSection.match(/: \[/g)).toHaveLength(ORGANISM_IDS.length);
    expect(focusStructureSection).toContain("plantcell: ['Cell Wall', 'Central Vacuole', 'Chloroplast']");
  });

  it('pairs mission targets with matching color, shape, copy, and canvas descriptions', () => {
    resetStemLab();
    loadTool(CELL_PLAY_PATHS[0], 'cell');
    const nutrientHtml = renderTool('cell', { cell: {
      mode: 'play',
      selectedOrganism: 'bacterium',
      playAsOrganism: 'bacterium',
      showPlayInstructions: true,
    } });
    expect(nutrientHtml).toContain('data-cell-target-visual="nutrient"');
    expect(nutrientHtml).toContain('data-cell-target-shape="diamond"');
    expect(nutrientHtml).toContain('Target key  |  Teal diamond nutrient');
    expect(nutrientHtml).toContain('NUTRIENT target  |  Teal diamond');
    expect(nutrientHtml).toContain('Collect 3 teal nutrient markers.');
    expect(nutrientHtml).toContain('Target key: Teal diamond nutrient');
    expect(nutrientHtml).toContain('Steer through teal diamond nutrient markers');
    expect(nutrientHtml).toContain('Playing as Bacterium');
    expect(nutrientHtml).toContain('Control models Rotary flagellum');

    resetStemLab();
    loadTool(CELL_PLAY_PATHS[0], 'cell');
    const pathogenHtml = renderTool('cell', { cell: {
      mode: 'play',
      selectedOrganism: 'wbc',
      playAsOrganism: 'wbc',
      showPlayInstructions: true,
    } });
    expect(pathogenHtml).toContain('data-cell-target-visual="pathogen"');
    expect(pathogenHtml).toContain('data-cell-target-shape="burst"');
    expect(pathogenHtml).toContain('Target key  |  Red spiky pathogen');
    expect(pathogenHtml).toContain('PATHOGEN target  |  Red spiky burst');
    expect(pathogenHtml).toContain('Red spiky pathogen targets');
    expect(pathogenHtml).toContain('Target key: Red spiky pathogen');
    expect(pathogenHtml).toContain('Playing as Neutrophil (White Blood Cell)');

    const source = readFileSync(CELL_PLAY_PATHS[0], 'utf8');
    expect(source).toContain("particleVisual.key === 'pathogen'");
    expect(source).toContain("particleVisual.key === 'nutrient'");
    expect(source).toContain("var particleCueKind = tutorial.targetVisual || kind;");
    expect(source).toContain("shape: lastPlayTargetGuide.shape");
    expect(source).toContain('var CELL_PLAY_NEAR_GAP = 35;');
    expect(source).toContain("(cueTarget ? cueTarget.proximity : '')");
    expect(source).toContain("(cueTarget ? cueTarget.direction : '')");
    expect(source).toContain('function describePlayerMissionTarget(target)');
    expect(source).toContain("var guideLabel = guideTargetLabel + ' \\u00B7 ' + target.proximityLabel + ' \\u00B7 ' + target.directionShortLabel;");
    expect(source).toContain('proximity: lastPlayTargetGuide.proximity');
    expect(source).toContain('directionLabel: lastPlayTargetGuide.directionLabel');
    expect(source).toContain('guideLabel: lastPlayTargetGuide.guideLabel');
  });


  it('renders a clear mobile-friendly mission briefing and learning link for a moving organism', () => {
    CELL_PLAY_PATHS.forEach((filePath) => {
      resetStemLab();
      loadTool(filePath, 'cell');
      const html = renderTool('cell', { cell: {
        mode: 'play',
        selectedOrganism: 'amoeba',
        playAsOrganism: 'amoeba',
        showPlayInstructions: true,
        playMission: { organismId: 'amoeba', startSuccess: 0, predictionSkipped: false },
      } });
      expect(html).toContain('data-cell-control-loop="true"');
      expect(html).toContain('id="cell-live-biology-loop"');
      expect(html).toContain('Prediction checkpoint. Choose what you expect, or start without a prediction. Controls and evidence unlock after this decision.');
      expect(html).toContain('data-cell-first-action-state="waiting"');
      expect(html).toContain('data-cell-control-title="true"');
      expect(html).toContain('>1 \u00B7 Predict first</span>');
      expect(html).toContain('data-cell-first-action-command="false"');
      expect(html).toContain('data-cell-control-phase="locked"');
      expect(html).toContain('data-cell-control-input="true"');
      expect(html).toContain('>Choose or skip</strong>');
      expect(html).toContain('data-cell-control-mechanism="true"');
      expect(html).toContain('>Controls unlock</strong>');
      expect(html).toContain('data-cell-control-observation="true"');
      expect(html).toContain('data-cell-control-lock="true"');
      expect(html).toContain('Predict or start without a prediction to unlock Amoeba controls');
      expect(html).not.toContain('data-cell-direction-pad="true"');
      expect(html).toContain('data-cell-play-tutorial-dialog="true"');
      expect(html).toContain('data-cell-tutorial-control-map="true"');
      expect(html).toContain('aria-label="Control model: Direction input, then Pseudopods extend, then Cell crawls. Evidence to collect: Pseudopods \u2192 engulfment."');
      expect(html).toContain('data-cell-tutorial-control-input="true"');
      expect(html).toContain('>Direction input</strong>');
      expect(html).toContain('data-cell-tutorial-control-mechanism="true"');
      expect(html).toContain('>Pseudopods extend</strong>');
      expect(html).toContain('data-cell-tutorial-control-result="true"');
      expect(html).toContain('>Cell crawls</strong>');
      expect(html).toContain('data-cell-tutorial-action-reminder="true" role="note"');
      expect(html).toContain('aria-label="Amoeba control reminder: Direction input; cell response: Pseudopods extend; observable result: Cell crawls."');
      expect(html).toMatch(/data-cell-tutorial-reminder-input="true"[^>]*>Direction input<\/strong>/);
      expect(html).toMatch(/data-cell-tutorial-reminder-mechanism="true"[^>]*>Pseudopods extend<\/strong>/);
      expect(html).toMatch(/data-cell-tutorial-reminder-result="true"[^>]*>Cell crawls<\/strong>/);
      expect(html).toContain('data-cell-tutorial-evidence-preview="true"');
      expect(html).toContain('3  |  Observe evidence');
      expect(html).toContain('Collect 3 observations:');
      expect(html).toContain('Pseudopods \u2192 engulfment');
      expect(html).toContain('data-cell-tutorial-prediction-handoff="true"');
      expect(html).toContain('Prediction check: compare this live cause-and-effect chain with the expectation you saved above.');
      expect(html).toContain('data-cell-play-tutorial-dialog="true" role="dialog" aria-modal="true" aria-labelledby="cell-playinstr-title" tabindex="-1"');
      expect(html).not.toMatch(/data-cell-play-tutorial-dialog="true"[^>]*autofocus/);
      expect(html).not.toMatch(/data-cell-tutorial-primary="true"[^>]*autofocus/);
      expect(html).toMatch(/data-cell-tutorial-primary="true"[^>]*disabled=""/);
      expect(html).toContain('Choose a prediction to start');
      expect(html).toContain('data-cell-skip-prediction="true"');
      expect(html).toContain('Start without prediction');
      expect(html).toContain('Start Amoeba mission without a prediction');
      expect(readFileSync(filePath, 'utf8')).toContain("if (panel) panel.scrollTop = 0;");
      expect(readFileSync(filePath, 'utf8')).toContain("if (scrollBody) scrollBody.scrollTop = 0;");
      expect(readFileSync(filePath, 'utf8')).toContain("dialog.scrollIntoView({ behavior: cellRenderPrefersReducedMotion ? 'auto' : 'smooth', block: 'center' })");
      expect(readFileSync(filePath, 'utf8')).toContain("maxHeight: 'min(94%, calc(100dvh - 24px))'");
      expect(readFileSync(filePath, 'utf8')).toContain("dialog.focus({ preventScroll: true });");
      expect(readFileSync(filePath, 'utf8')).toContain("function recordCellPlayFirstAction(snapshot)");
      expect(html).toContain('After 3 observations, choose the explanation that best connects this structure to its function.');
      expect(html).toContain('data-cell-explanation-locked="true"');

      expect(html).toContain('60-second mission briefing: Amoeba');
      expect(html).toContain('Mission goal  |  Phagocytosis');
      expect(html).toContain('data-cell-tutorial-scroll-body="true"');
      expect(html).toContain('data-cell-tutorial-action-bar="true"');
      expect(html.indexOf('data-cell-tutorial-action-bar="true"')).toBeLessThan(html.indexOf('data-cell-tutorial-action-reminder="true"'));
      expect(html.indexOf('data-cell-tutorial-action-reminder="true"')).toBeLessThan(html.indexOf('data-cell-tutorial-primary="true"'));
      expect(html).toContain('data-cell-tutorial-learning-path="true"');
      expect(html).toContain('data-cell-tutorial-phase="predict"');
      expect(html).toContain('Learning loop. Current step: predict.');
      expect(html).toContain('data-cell-tutorial-step="predict"');
      expect(html).toContain('data-cell-tutorial-step-state="current"');
      expect(html).toContain('Start here: choose what you expect before collecting evidence.');
      expect(html).toContain('1  |  Predict before play');
      expect(html).toContain('2  |  Control the biology');
      expect(html).toContain('4  |  Explain with evidence');
      expect(html).toContain('data-cell-prediction-checkpoint="true"');
      expect(html.indexOf('data-cell-prediction-checkpoint="true"')).toBeLessThan(html.indexOf('data-cell-tutorial-control-map="true"'));
      expect(html).toContain('What visible change should occur when food is captured?');
      expect(html).toContain('Prediction option 1: The flexible edge will extend around the particle.');
      expect(html).toContain('Predictions are not graded; evidence can confirm or revise your thinking.');
      expect(html).toContain('Engulf 3 green food particles.');
      expect(html).toContain('data-cell-control-lock-state="waiting"');
      expect(html).toContain('>Unlock controls</strong>');
      expect(html).toContain('Choose what you expect or start without a prediction.');
      expect(html).toContain('data-cell-target-state="locked"');
      expect(html).toContain('data-cell-proximity="waiting"');
      expect(html).toContain('PREDICT FIRST');
      expect(html).toContain('data-cell-approach-state="locked"');
      expect(html).toContain('data-cell-step-state="upcoming"');
      expect(html).toContain('data-cell-play-hud="true"');
      expect(html).toContain('aria-label="Open Amoeba mission tutorial"');
      expect(html).toContain('data-cell-stage-hud="true"');
      expect(html).toContain('data-cell-hud-heading="true"');
      expect(html).toContain('data-cell-hud-actions="true"');
      expect(html).toContain('data-cell-hud-summary="true"');
      expect(html).toContain('data-cell-hud-organism="true"');
      expect(html).toContain('data-cell-hud-objective="true"');
      expect(html).toContain('data-cell-hud-mechanism="true"');
      expect(html).toContain('Control models');
      expect(html).toContain('data-cell-target-legend="true"');
      expect(html).toContain('data-cell-target-key-full="true"');
      expect(html).toContain('data-cell-target-name-full="true"');
      expect(html).toContain('data-cell-target-key-compact="true"');
      expect(html).toContain('FOOD target  |  Green circle');
      expect(html).toContain('data-cell-control-lead="true"');
      expect(html).toContain('data-cell-ultra-narrow-style="true"');
      expect(html).toContain('data-cell-approach-meter="true"');
      expect(html).toContain('data-cell-approach-current="0"');
      expect(html).toContain('Mission path locked. Make a prediction or choose to start without one before Locate, then Approach, then Contact.');
      expect(html).toContain('aria-label="Locate, upcoming"');
      expect(html).toContain('data-cell-target-guide-note="true"');
      expect(html).toContain('data-cell-target-proximity="true"');
      expect(html).toContain('data-cell-proximity="waiting"');
      expect(html).toContain('Make the Predict decision; target guidance begins when controls unlock.');
      expect(html).toContain('data-cell-mission-progress="true"');
      expect(html).toContain('data-cell-mission-progress-state="predict"');
      expect(html).toContain('data-cell-learning-phase="predict"');
      expect(html).toContain('data-cell-learning-step="1"');
      expect(html).toContain('data-cell-hud-phase="predict"');
      expect(html).toContain('Learning loop \u00B7 1/4');
      expect(html).toContain('aria-label="Learning step 1 of 4, Predict. Evidence 0 of 3. Make a prediction or choose to start without one."');
      expect(html).toContain('data-cell-learning-phase-label="true">Predict</span>');
      expect(html).toContain('data-cell-predict-cue="true">Choose now</span>');
      expect(html).toContain('data-cell-prediction-handoff="true"');
      const initialPredictionCheckpoint = checkpointHtml(html, 'predict');
      const initialControlCheckpoint = checkpointHtml(html, 'control');
      const initialObserveCheckpoint = checkpointHtml(html, 'observe');
      const initialExplainCheckpoint = checkpointHtml(html, 'explain');
      expect(initialPredictionCheckpoint).toContain('data-cell-checkpoint-state="current"');
      expect(initialPredictionCheckpoint).toContain('aria-current="step"');
      expect(initialPredictionCheckpoint).toContain('data-cell-checkpoint-status="predict"');
      expect(initialPredictionCheckpoint).toContain('>Choose now</span>');
      expect(initialPredictionCheckpoint).toContain('data-cell-prediction-action="true"');
      expect(initialPredictionCheckpoint).toContain('Make prediction');
      expect(initialControlCheckpoint).toContain('data-cell-checkpoint-state="upcoming"');
      expect(initialControlCheckpoint).not.toContain('aria-current="step"');
      expect(initialControlCheckpoint).toContain('data-cell-checkpoint-status="control"');
      expect(initialControlCheckpoint).toContain('>Next</span>');
      expect(initialObserveCheckpoint).toContain('data-cell-checkpoint-state="upcoming"');
      expect(initialObserveCheckpoint).not.toContain('aria-current="step"');
      expect(initialObserveCheckpoint).toContain('data-cell-checkpoint-status="observe"');
      expect(initialObserveCheckpoint).toContain('>Next</span>');
      expect(initialExplainCheckpoint).toContain('data-cell-checkpoint-state="locked"');
      expect(initialExplainCheckpoint).not.toContain('aria-current="step"');
      expect(initialExplainCheckpoint).toContain('data-cell-checkpoint-status="explain"');
      expect(initialExplainCheckpoint).toContain('>Locked</span>');
      expect(html).toContain('data-cell-sim-state="predict"');
      expect(html).not.toContain('data-cell-explain-handoff="true"');
      expect(html).toContain('data-cell-mission-checkpoint="true"');
      expect(html).toContain('data-cell-prediction-stage="true"');
      expect(html).toContain('data-cell-learning-step="predict"');
      expect(html).toContain('data-cell-prediction-stage-state="ready"');
      expect(html).toContain('data-cell-prediction-stage-status="true"');
      expect(html).toContain('Choose now');
      expect(html).toContain('Prediction question:');
      expect(html).toContain('What visible change should occur when food is captured?');
      expect(html).toContain('Choose what you expect before collecting evidence; predictions are not graded.');
      expect(html).toContain('1  |  Predict');
      expect(html).toContain('2  |  Control');
      expect(html).toContain('3  |  Observe');
      expect(html).toContain('4  |  Explain');
      expect(html).toContain('data-cell-organism-chooser="true"');
      expect(html).toContain('data-cell-organism-grid="true"');
      expect(html).toContain('data-cell-chooser-mobile-hint="true"');
      expect(html).toContain('Tap any compact card to reveal its learning map.');
      expect((html.match(/data-cell-organism-card-detail="true"/g) || [])).toHaveLength(ORGANISM_IDS.length);
      expect((html.match(/data-cell-organism-priority="current"/g) || [])).toHaveLength(1);
      expect((html.match(/data-cell-organism-priority="standard"/g) || [])).toHaveLength(ORGANISM_IDS.length - 1);
      expect(html).toContain('id="cell-organism-summary-amoeba" class="sr-only">Status: 0 of 3 evidence. Control mapping: Direction input, then Pseudopods extend, producing Cell crawls. Mission: Engulf 3 green food particles.</span>');
      expect((html.match(/data-cell-card-control-map="true"/g) || [])).toHaveLength(ORGANISM_IDS.length);
      expect(html).toContain('Compare what you do, how the cell responds, and each mission goal');
      expect(html).toContain('Your input');
      expect(html).toContain('Cell response');
      expect(html).toContain('aria-label="Amoeba control mapping: Direction input, then Pseudopods extend."');
      expect(html).toContain('data-cell-card-control-input="true"');
      expect(html).toContain('data-cell-card-control-response="true"');
      expect(html).toContain('aria-label="Spirillum control mapping: Direction input, then Bipolar flagella rotate."');
      expect(html).toContain('data-cell-learning-link="true"');
      expect(html).toContain('data-cell-selected-organism-card="true"');
      expect(html).toContain('data-cell-selected-organism="amoeba"');
      expect(html).toContain('data-cell-selected-organism-state="current"');
      expect(html).toContain('data-cell-selected-organism-eyebrow="true"');
      expect(html).toContain('Current organism');
      expect(html).toContain('data-cell-selected-organism-actions="true"');
      expect(html).toContain('data-cell-back-to-organisms="true"');
      expect(html).toContain('aria-label="Return to organism choices from Amoeba details"');
      expect(html).toContain('data-cell-selected-organism-action="true"');
      expect(html).toContain('All organisms');
      expect(html).toContain('data-cell-center-player="true"');
      expect(html).toContain('aria-label="Center Amoeba in the live dish"');
      expect(html).toContain('data-cell-center-player-label="true"');
      expect(html).toContain('aria-label="Amoeba gameplay learning map"');
      expect(html).toContain('data-cell-structure-spotlight="true"');
      expect(html).toContain('aria-label="Amoeba mission anatomy: Pseudopods, Cell Membrane, Food Vacuole"');
      expect((html.match(/data-cell-focus-structure=/g) || [])).toHaveLength(3);
      expect(html).toContain('data-cell-focus-structure="Pseudopods"');
      expect(html).toContain('data-cell-focus-structure="Cell Membrane"');
      expect(html).toContain('data-cell-focus-structure="Food Vacuole"');
      expect(html).toContain('data-cell-anatomy-explorer="true"');
      expect((html.match(/data-cell-mission-focus="true"/g) || [])).toHaveLength(3);
      expect(html).toContain('data-cell-anatomy-jump="true"');
      expect(html).toContain('aria-label="Show Pseudopods in the Amoeba live dish. Mission focus structure. Moves focus to the simulation."');
      expect(html).toContain('Explore structures');
      expect(html).toContain('Select a row \u2192 live dish');
      expect(html).toContain('Show in live dish');
      expect(html).toContain('How the gameplay teaches the biology');
      expect(html).toContain('Control \u2192 Observe \u2192 Explain');
      expect(html).toContain('0/3 evidence');
      expect(html).toContain('Current player');
      expect(html).toContain('data-cell-mastery-summary="true"');
      expect(html).toContain('0 / 11 missions complete');
      expect(html).toContain('aria-labelledby="cell-organism-chooser-title"');
      expect(html).toContain('data-cell-next-step="true"');
      expect(html).toContain('data-cell-next-step-state="predict"');
      expect(html).toContain('data-cell-recommended-organism="amoeba"');
      expect(html).toContain('Predict for Amoeba before play');
      expect(html).toContain('Control unlocks after you predict or explicitly skip.');
      expect(html).toContain('aria-label="Make an Amoeba prediction before collecting evidence"');
      expect(html).toContain('>Make prediction</button>');
      expect(html).toContain('Touching a particle models phagocytosis');
      expect(html).toContain('Control loop: Direction input \u2192 Pseudopods extend \u2192 Cell crawls');
      expect(html).toContain('data-cell-organism-option="amoeba"');
      expect(html).toContain('aria-label="Preview Amoeba mission"');
      expect(html).toContain('data-cell-card-status="New"');
      expect(html).not.toContain('aria-label="Cell type visibility filters"');
    });
  });

  it('distinguishes a selected mission preview from the current organism', () => {
    CELL_PLAY_PATHS.forEach((filePath) => {
      resetStemLab();
      loadTool(filePath, 'cell');
      const html = renderTool('cell', { cell: {
        mode: 'play',
        selectedOrganism: 'paramecium',
        playAsOrganism: 'amoeba',
        showPlayInstructions: false,
      } });
      expect(html).toContain('data-cell-selected-organism="paramecium"');
      expect(html).toContain('data-cell-selected-organism-state="preview"');
      expect(html).toContain('Mission preview');
      expect(html).toContain('aria-label="Play as Paramecium"');
      expect(html).toContain('aria-label="Paramecium mission anatomy: Cilia, Oral Groove"');
      expect((html.match(/data-cell-focus-structure=/g) || [])).toHaveLength(2);
    });
  });

  it('surfaces biology evidence, saved mastery, and the next unfinished organism', () => {
    CELL_PLAY_PATHS.forEach((filePath) => {
      resetStemLab();
      loadTool(filePath, 'cell');
      const recordedHtml = renderTool('cell', { cell: {
        mode: 'play',
        selectedOrganism: 'amoeba',
        playAsOrganism: 'amoeba',
        showPlayInstructions: false,
        playMission: { organismId: 'amoeba', startSuccess: 9, firstActionRegistered: true },
        playFeedback: { organismId: 'amoeba', count: 1, text: 'Particle engulfed: pseudopods model phagocytosis.', evidenceComplete: false },
        playCue: {
          organismId: 'amoeba', kind: 'food', phase: 'evidence',
          key: 'amoeba:evidence:particle-0:100', targetKey: 'particle-0',
          text: 'Move clear, then approach a new target to collect the next piece of evidence.',
          announcement: '', progressPct: 100,
        },
        _cellExt: { successByOrganism: { amoeba: 10 } },
      } });
      expect(recordedHtml).toContain('data-cell-target-state="recorded"');
      expect(recordedHtml).toContain('data-cell-proximity="recorded"');
      expect(recordedHtml).toContain('RECORDED');
      expect(recordedHtml).toContain('Move clear for the next target');
      expect(recordedHtml).toContain('data-cell-approach-state="complete"');
      expect(recordedHtml).toContain('Mission path complete: Locate, then Approach, then Contact. Evidence recorded. Next action: Move clear for the next target.');
      const recordedPathHtml = recordedHtml.split('data-cell-approach-meter="true"')[1].split('id="cell-live-biology-loop"')[0];
      expect(recordedPathHtml).toContain('aria-label="Locate, complete"');
      expect(recordedPathHtml).toContain('aria-label="Approach, complete"');
      expect(recordedPathHtml).toContain('aria-label="Contact, complete"');
      expect(recordedPathHtml).not.toContain('aria-current="step"');
      expect(recordedHtml).toContain('data-cell-evidence-feedback="true"');
      expect(recordedHtml).toContain('data-cell-evidence-layout="consolidated"');
      expect(recordedHtml).toContain('data-cell-cue-layout="consolidated"');
      expect(recordedHtml).not.toContain('data-cell-cue-layout="standalone"');
      expect(recordedHtml).toContain('Next action: Move clear, then approach a new target');
      expect(recordedHtml).toContain('data-cell-evidence-chain="true"');
      expect(recordedHtml).toContain('Evidence 1/3');
      expect(recordedHtml).toContain('data-cell-learning-phase="observe"');
      expect(recordedHtml).toContain('data-cell-learning-step="3"');
      expect(recordedHtml).toContain('data-cell-hud-phase="observe"');
      expect(recordedHtml).toContain('Learning loop \u00B7 3/4');
      expect(recordedHtml).toContain('aria-label="Learning step 3 of 4, Observe. Evidence 1 of 3."');
      expect(recordedHtml).toContain('data-cell-learning-phase-label="true">Observe</span>');
      const recordedControlCheckpoint = checkpointHtml(recordedHtml, 'control');
      const recordedObserveCheckpoint = checkpointHtml(recordedHtml, 'observe');
      const recordedExplainCheckpoint = checkpointHtml(recordedHtml, 'explain');
      expect(recordedControlCheckpoint).toContain('data-cell-checkpoint-state="complete"');
      expect(recordedControlCheckpoint).not.toContain('aria-current="step"');
      expect(recordedControlCheckpoint).toContain('>\u2713 Complete</span>');
      expect(recordedObserveCheckpoint).toContain('data-cell-checkpoint-state="current"');
      expect(recordedObserveCheckpoint).toContain('aria-current="step"');
      expect(recordedObserveCheckpoint).toContain('data-cell-checkpoint-status="observe"');
      expect(recordedObserveCheckpoint).toContain('>Now \u00B7 1/3</span>');
      expect(recordedExplainCheckpoint).toContain('data-cell-checkpoint-state="locked"');
      expect(recordedExplainCheckpoint).not.toContain('aria-current="step"');
      expect(recordedExplainCheckpoint).toContain('>Locked</span>');
      expect(recordedHtml).not.toContain('data-cell-evidence-to-explain="true"');

      const html = renderTool('cell', { cell: {
        mode: 'play',
        selectedOrganism: 'amoeba',
        playAsOrganism: 'amoeba',
        showPlayInstructions: false,
        playMission: { organismId: 'amoeba', startSuccess: 9, predictionChoice: 0, predictionText: 'The flexible edge will extend around the particle.', explanationChoice: 0, explanationCorrect: true, reflected: true },
        playFeedback: {
          organismId: 'amoeba',
          count: 3,
          text: 'Particle engulfed: pseudopods model phagocytosis.',
          evidenceComplete: true,
        },
        playCue: {
          organismId: 'amoeba',
          kind: 'food',
          phase: 'evidence',
          key: 'amoeba:evidence:particle-2:100',
          targetKey: 'particle-2',
          text: 'Three pieces of evidence collected \u2014 use the mission card to explain the biology.',
          announcement: '',
          progressPct: 100,
        },
        _cellExt: {
          successByOrganism: { amoeba: 12 },
          completedMissions: { amoeba: true },
        },
      } });

      expect(html).toContain('data-cell-mission-progress-state="complete"');
      expect(html).toContain('data-cell-learning-phase="complete"');
      expect(html).toContain('data-cell-learning-step="4"');
      expect(html).toContain('data-cell-hud-phase="complete"');
      expect(html).toContain('Learning loop complete');
      expect(html).toContain('aria-label="Learning loop complete. Evidence 3 of 3."');
      const completeControlCheckpoint = checkpointHtml(html, 'control');
      const completeObserveCheckpoint = checkpointHtml(html, 'observe');
      const completeExplainCheckpoint = checkpointHtml(html, 'explain');
      expect(completeControlCheckpoint).toContain('data-cell-checkpoint-state="complete"');
      expect(completeControlCheckpoint).toContain('>\u2713 Complete</span>');
      expect(completeControlCheckpoint).not.toContain('aria-current="step"');
      expect(completeObserveCheckpoint).toContain('data-cell-checkpoint-state="complete"');
      expect(completeObserveCheckpoint).toContain('>\u2713 3/3</span>');
      expect(completeObserveCheckpoint).not.toContain('aria-current="step"');
      expect(completeExplainCheckpoint).toContain('data-cell-checkpoint-state="complete"');
      expect(completeExplainCheckpoint).toContain('>\u2713 Complete</span>');
      expect(completeExplainCheckpoint).not.toContain('aria-current="step"');
      expect(html).not.toContain('data-cell-explain-handoff="true"');
      expect(html).toContain('data-cell-target-state="mastered"');
      expect(html).toContain('data-cell-sim-state="complete"');
      expect(html).toContain('data-cell-proximity="mastered"');
      expect(html).toContain('LOOP COMPLETE');
      expect(html).toContain('Replay or compare another organism');
      expect(html).toContain('Evidence and explanation matched.');
      expect(html).not.toContain('data-cell-evidence-to-explain="true"');
      expect(html).not.toContain('data-cell-evidence-feedback="true"');
      expect(html).not.toContain('data-cell-mission-cue="true"');
      expect(html).not.toContain('data-cell-control-loop="true"');
      expect(html).not.toContain('data-cell-direction-pad="true"');
      expect(html).not.toContain('data-cell-prediction-compare="true"');
      expect(html).toContain('data-cell-prediction-summary="true"');
      expect(html).toContain('Your prediction:');
      expect(html).toContain('data-cell-prediction-stage-state="reviewed"');
      expect(html).toContain('\u2713 Reviewed');
      expect(html).toContain('Evidence and explanation completed the test of this prediction.');
      expect(html).toContain('The flexible edge will extend around the particle.');
      expect(html).toContain('1 / 11 missions complete');
      expect(html).toContain('data-cell-mission-mastered="amoeba"');
      expect(html).toContain('data-cell-strategy-contrast="true"');
      expect(html).toContain('Strategy contrast: Amoeba reshapes its flexible edge with pseudopods');
      expect(html).toContain('data-cell-next-step-state="compare"');
      expect(html).toContain('data-cell-recommended-organism="paramecium"');
      expect(html).toContain('Recommended comparison');
      expect(html).toContain('Why this is next: Amoeba reshapes its flexible edge with pseudopods');
      expect(html).toContain('aria-label="Start recommended comparison: Paramecium"');
      expect(html).toContain('data-cell-recommended-card="paramecium"');
      expect(html).toContain('Compare next: Paramecium');
      expect(html).toContain('Compare movement strategies: Amoeba and Paramecium');
      expect(html).toContain('data-cell-explanation-result="true"');
      expect(html).toContain('Evidence matched');
      expect(html).toContain('Pseudopods reshape the flexible membrane to crawl and can wrap around food to form a vacuole.');

      const fallbackHtml = renderTool('cell', { cell: {
        mode: 'play',
        selectedOrganism: 'amoeba',
        playAsOrganism: 'amoeba',
        showPlayInstructions: false,
        playMission: { organismId: 'amoeba', startSuccess: 9, reflected: true },
        _cellExt: {
          successByOrganism: { amoeba: 12 },
          completedMissions: { amoeba: true, paramecium: true },
        },
      } });
      expect(fallbackHtml).toContain('Compare next: Euglena');
      expect(fallbackHtml).toContain('Amoeba uses Pseudopods; Euglena uses Flagellum + phototaxis.');
      expect(fallbackHtml).toContain('This run used evidence and explanation without a saved prediction. Replay to practice the full cycle.');
    });
  });

  it('requires an evidence-matched explanation and gives actionable misconception feedback', () => {
    resetStemLab();
    loadTool(CELL_PLAY_PATHS[0], 'cell');
    const evidenceState = {
      mode: 'play',
      selectedOrganism: 'amoeba',
      playAsOrganism: 'amoeba',
      showPlayInstructions: false,
      playMission: { organismId: 'amoeba', startSuccess: 9 },
      _cellExt: { successByOrganism: { amoeba: 12 } },
    };
    const unlockedHtml = renderTool('cell', { cell: evidenceState });
    expect(unlockedHtml).toContain('data-cell-prediction-stage-state="skipped"');
    expect(unlockedHtml).toContain('Not recorded');
    expect(unlockedHtml).toContain('No prediction was recorded before evidence collection.');
    expect(unlockedHtml).toContain('restart to practice the full cycle');
    expect(unlockedHtml).toContain('data-cell-explanation-check="true"');
    expect(unlockedHtml).toContain('Which explanation best matches the evidence from your mission?');
    expect(unlockedHtml).toContain('Explanation A: Pseudopods reshape the flexible membrane');
    expect(unlockedHtml).toContain('Explanation B: A rigid cell wall pushes the amoeba');
    expect(unlockedHtml).not.toContain('Amoeba mission complete');
    expect(unlockedHtml).toContain('data-cell-next-step-state="explain"');
    expect(unlockedHtml).toContain('Finish the Amoeba explanation');
    expect(unlockedHtml).toContain('data-cell-mission-progress-state="explain"');
    expect(unlockedHtml).toContain('data-cell-learning-phase="explain"');
    expect(unlockedHtml).toContain('data-cell-learning-step="4"');
    expect(unlockedHtml).toContain('data-cell-hud-phase="explain"');
    expect(unlockedHtml).toContain('Learning loop \u00B7 4/4');
    expect(unlockedHtml).toContain('data-cell-explain-handoff="true"');
    expect(unlockedHtml).toContain('aria-label="Learning step 4 of 4, Explain. Evidence 3 of 3. Open Amoeba evidence explanation."');
    expect(unlockedHtml).toContain('data-cell-learning-phase-label="true">Explain \u2193</span>');
    const explainControlCheckpoint = checkpointHtml(unlockedHtml, 'control');
    const explainObserveCheckpoint = checkpointHtml(unlockedHtml, 'observe');
    const explainCurrentCheckpoint = checkpointHtml(unlockedHtml, 'explain');
    expect(explainControlCheckpoint).toContain('data-cell-checkpoint-state="complete"');
    expect(explainControlCheckpoint).toContain('>\u2713 Complete</span>');
    expect(explainObserveCheckpoint).toContain('data-cell-checkpoint-state="complete"');
    expect(explainObserveCheckpoint).toContain('>\u2713 3/3</span>');
    expect(explainCurrentCheckpoint).toContain('data-cell-checkpoint-state="current"');
    expect(explainCurrentCheckpoint).toContain('aria-current="step"');
    expect(explainCurrentCheckpoint).toContain('data-cell-checkpoint-status="explain"');
    expect(explainCurrentCheckpoint).toContain('>Now</span>');
    expect(explainControlCheckpoint + explainObserveCheckpoint).not.toContain('aria-current="step"');
    expect(unlockedHtml).toContain('Explain ↓');
    expect(unlockedHtml).toContain('data-cell-explanation-evidence-summary="true"');
    expect(unlockedHtml).toContain('Evidence to use');
    expect(unlockedHtml).toContain('3/3 observed');
    expect(unlockedHtml).toContain('data-cell-target-state="complete"');
    expect(unlockedHtml).toContain('data-cell-sim-state="explain"');
    expect(unlockedHtml).toContain('data-cell-proximity="complete"');
    expect(unlockedHtml).toContain('Open Explain 3/3 to finish');
    expect(unlockedHtml).toContain('data-cell-evidence-to-explain="true"');
    expect(unlockedHtml).toContain('data-cell-evidence-ready-chain="true"');
    expect(unlockedHtml).toContain('3/3 observations');
    expect(unlockedHtml).not.toContain('data-cell-mission-cue="true"');
    expect(unlockedHtml).not.toContain('data-cell-control-loop="true"');
    expect(unlockedHtml).not.toContain('data-cell-direction-pad="true"');
    expect(unlockedHtml).toContain('Evidence ready: use your 3 observations');
    expect(unlockedHtml).toContain('aria-label="Finish Amoeba explanation"');
    expect(unlockedHtml).toContain('data-cell-card-status="Explain"');

    const explainTutorialHtml = renderTool('cell', { cell: {
      ...evidenceState,
      showPlayInstructions: true,
    } });
    const explainTutorialPath = explainTutorialHtml
      .split('data-cell-tutorial-learning-path="true"')[1]
      .split('data-cell-prediction-checkpoint="true"')[0];
    expect(explainTutorialHtml).toContain('data-cell-tutorial-phase="explain"');
    expect(explainTutorialPath).toContain('data-cell-tutorial-step="predict" data-cell-tutorial-step-state="skipped"');
    expect(explainTutorialPath).toContain('data-cell-tutorial-step="control" data-cell-tutorial-step-state="complete"');
    expect(explainTutorialPath).toContain('data-cell-tutorial-step="observe" data-cell-tutorial-step-state="complete"');
    expect(explainTutorialPath).toContain('data-cell-tutorial-step="explain" data-cell-tutorial-step-state="current" aria-current="step"');
    expect(explainTutorialHtml).toContain('Now: use your 3 observations to choose the explanation supported by evidence.');
    expect(explainTutorialHtml).toContain('aria-label="Go to Amoeba evidence explanation"');
    expect(explainTutorialHtml).toContain('Go to explanation</button>');
    expect(readFileSync(CELL_PLAY_PATHS[0], 'utf8')).toContain("focusCellPlayRegion('[data-cell-mission-checkpoint]', '[data-cell-explanation-option]')");

    const savedHtml = renderTool('cell', { cell: {
      ...evidenceState,
      playMission: {
        organismId: 'amoeba',
        startSuccess: 9,
        predictionChoice: 0,
        predictionText: 'The flexible edge will extend around the particle.',
      },
      _cellExt: { successByOrganism: { amoeba: 10 } },
    } });
    expect(savedHtml).toContain('data-cell-prediction-stage-state="saved"');
    expect(savedHtml).toContain('\u2713 Saved before play');
    expect(savedHtml).toContain('Keep this prediction fixed while you collect evidence.');

    const compareHtml = renderTool('cell', { cell: {
      ...evidenceState,
      playMission: {
        organismId: 'amoeba',
        startSuccess: 9,
        predictionChoice: 0,
        predictionText: 'The flexible edge will extend around the particle.',
      },
    } });
    expect(compareHtml).toContain('data-cell-prediction-stage-state="compare"');
    expect(compareHtml).toContain('Compare now');
    expect(compareHtml).toContain('Compare this prediction with all 3 observations before you explain.');

    const misconceptionHtml = renderTool('cell', { cell: {
      ...evidenceState,
      playMission: {
        organismId: 'amoeba',
        startSuccess: 9,
        explanationChoice: 1,
        explanationCorrect: false,
        explanationFeedback: 'Try again: amoebas use a flexible membrane and pseudopods, not a rigid wall or cilia.',
        reflected: false,
      },
    } });
    expect(misconceptionHtml).toContain('data-cell-explanation-feedback="true"');
    expect(misconceptionHtml).toContain('Try again: amoebas use a flexible membrane and pseudopods');
    expect(misconceptionHtml).not.toContain('Amoeba mission complete');
  });

  it('renders neutral light progress and keeps lifetime successes locked without a mission', () => {
    resetStemLab();
    loadTool(CELL_PLAY_PATHS[0], 'cell');
    const cueHtml = renderTool('cell', { cell: {
      mode: 'play',
      selectedOrganism: 'euglena',
      playAsOrganism: 'euglena',
      showPlayInstructions: false,
      playMission: { organismId: 'euglena', startSuccess: 0, predictionSkipped: true },
      playCue: {
        organismId: 'euglena',
        kind: 'light',
        phase: 'holding',
        key: 'euglena:holding:light-zone-0:70',
        proximity: 'inside',
        proximityLabel: 'INSIDE',
        direction: 'here',
        directionLabel: 'here',
        directionGlyph: '\u25CE',
        text: 'Inside light \u2014 hold position while photosynthetic structures capture energy.',
        announcement: 'Entered a light zone. Hold position to build photosynthesis evidence.',
        progressPct: 70,
      },
      _cellExt: { successByOrganism: { euglena: 0 } },
    } });
    expect(cueHtml).toContain('data-cell-mission-cue="true"');
    expect(cueHtml).toContain('data-cell-cue-layout="standalone"');
    expect(cueHtml).toContain('data-cell-proximity="inside"');
    expect(cueHtml).toContain('data-cell-direction="here"');
    expect(cueHtml).toContain('Target status');
    expect(cueHtml).toContain('INSIDE');
    expect(cueHtml).toContain('Hold position');
    expect(cueHtml).toContain('Holding light');
    expect(cueHtml).toContain('Inside light');
    expect(cueHtml).toContain('role="progressbar"');
    expect(cueHtml).toContain('aria-valuenow="70"');
    expect(cueHtml).toContain('70 percent of one light-energy evidence cycle');
    expect(cueHtml).toContain('data-cell-approach-current="2"');
    expect(cueHtml).toContain('Mission path: Find light, then Enter zone, then Hold. Current step: Hold.');
    expect(cueHtml).toContain('aria-label="Hold, current step"');

    const lockedHtml = renderTool('cell', { cell: {
      mode: 'play',
      selectedOrganism: 'amoeba',
      playAsOrganism: 'amoeba',
      showPlayInstructions: false,
      playMission: null,
      _cellExt: { successByOrganism: { amoeba: 99 } },
    } });
    expect(lockedHtml).toContain('0/3 evidence');
    expect(lockedHtml).toContain('data-cell-explanation-locked="true"');
    expect(lockedHtml).not.toContain('data-cell-explanation-check="true"');
    expect(lockedHtml).toContain('data-cell-next-step-state="start"');

    const partialHtml = renderTool('cell', { cell: {
      mode: 'play',
      selectedOrganism: 'amoeba',
      playAsOrganism: 'amoeba',
      showPlayInstructions: false,
      playMission: { organismId: 'amoeba', startSuccess: 9 },
      _cellExt: { successByOrganism: { amoeba: 10 } },
    } });
    expect(partialHtml).toContain('data-cell-next-step-state="continue"');
    expect(partialHtml).toContain('Continue Amoeba \u00B7 1/3 evidence');
    expect(partialHtml).toContain('aria-label="Return to Amoeba mission in the dish"');
    expect(partialHtml).toContain('data-cell-card-status="1/3"');

    const masteredHtml = renderTool('cell', { cell: {
      mode: 'play',
      selectedOrganism: 'amoeba',
      showPlayInstructions: false,
      _cellExt: {
        completedMissions: Object.fromEntries(ORGANISM_IDS.map((id) => [id, true])),
      },
    } });
    expect(masteredHtml).toContain('data-cell-next-step-state="mastered"');
    expect(masteredHtml).toContain('All 11 organism missions mastered');
    expect(masteredHtml).toContain('Predict \u2192 Control \u2192 Observe \u2192 Explain loop');
  });

  it('uses inspection rather than movement for plant cells and wires all play feedback paths', () => {
    resetStemLab();
    loadTool(CELL_PLAY_PATHS[0], 'cell');
    const plantHtml = renderTool('cell', { cell: {
      mode: 'play',
      selectedOrganism: 'plantcell',
      playAsOrganism: 'plantcell',
      showPlayInstructions: true,
    } });
    expect(plantHtml).toContain('60-second mission briefing: Plant Cell');
    expect(plantHtml).toContain('Locate 3 different structures.');
    expect(plantHtml).toContain('inspection controls instead of movement controls');
    expect(plantHtml).not.toContain('data-cell-direction-pad="true"');
    expect(plantHtml).toContain('data-cell-proximity="select"');
    expect(plantHtml).toContain('Compass names the next structure and where to select it.');
    expect(plantHtml).toContain('First action: Select a glowing anatomy label. Cell response: Structure highlighted. Watch for: Function revealed. This cue will confirm when your input is registered.');
    expect(plantHtml).toContain('>Select a glowing label</strong>');
    expect(plantHtml).toContain('aria-label="Control model: Select a label, then Structure highlighted, then Function revealed. Evidence to collect: Structure \u2192 function identified."');
    expect(plantHtml).toContain('data-cell-tutorial-control-input="true"');
    expect(plantHtml).toContain('>Select a label</strong>');
    expect(plantHtml).toContain('>Structure highlighted</strong>');
    expect(plantHtml).toContain('>Function revealed</strong>');
    expect(plantHtml).toContain('aria-label="Plant Cell control reminder: Select a label; cell response: Structure highlighted; observable result: Function revealed."');
    expect(plantHtml).toMatch(/data-cell-tutorial-reminder-input="true"[^>]*>Select a label<\/strong>/);
    expect(plantHtml).toMatch(/data-cell-tutorial-reminder-mechanism="true"[^>]*>Structure highlighted<\/strong>/);
    expect(plantHtml).toMatch(/data-cell-tutorial-reminder-result="true"[^>]*>Function revealed<\/strong>/);
    expect(plantHtml).toContain('aria-label="Plant Cell control mapping: Select a label, then Structure highlighted."');
    expect(plantHtml).toContain('aria-label="Plant Cell mission anatomy: Cell Wall, Central Vacuole, Chloroplast"');
    expect((plantHtml.match(/data-cell-focus-structure=/g) || [])).toHaveLength(3);
    expect(plantHtml).toContain('data-cell-focus-structure="Cell Wall"');
    expect(plantHtml).toContain('data-cell-focus-structure="Central Vacuole"');
    expect(plantHtml).toContain('data-cell-focus-structure="Chloroplast"');
    expect(plantHtml).toContain('aria-label="Show Cell Wall in the Plant Cell live dish. Mission focus structure. Moves focus to the simulation."');

    CELL_PLAY_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain("var spd = def.id === 'plantcell' ? 0 : def.speed * 1.5;");
      expect(source).toContain("if (kind === 'food' || kind === 'pathogen')");
      expect(source).toContain("if (kind === 'light')");
      expect(source).toContain('function rewardPlantStructure(o, anatomy)');
      expect(source).toContain('canvasEl._cellSimMoveKey = function (key, pressed)');
      expect(source).toContain('A short fading path makes movement style and direction easier to read.');
      expect(source).toContain('successByOrganism: {}');
      expect(source).toContain('function beginCellPlayMission(organismId)');
      expect(source).toContain('function recordCellPlayReflection(organismId)');
      expect(source).toContain("canvasEl._cellSimSetPlayAs = function (orgId, resetMission)");
      expect(source).toContain("height: '680px'");
      expect(source).toContain('completedMissions: {}');
      expect(source).toContain('nextExt.completedMissions[organismId] = true');
      expect(source).toContain('cel.playFeedback = {');
      expect(source).toContain('var CELL_PLAY_EVIDENCE = {');
      expect(source).toContain('data-cell-evidence-feedback');
      expect(source).toContain('function resolvePlayerMissionTarget()');
      expect(source).toContain('function drawPlayerMissionGuide()');
      expect(source).toContain('function describePlayerMissionTarget(target)');
      expect(source).toContain('proximity: lastPlayTargetGuide.proximity');
      expect(source).toContain('direction: lastPlayTargetGuide.direction');
      expect(source).toContain('data-cell-target-proximity');
      expect(source).toContain('canvasEl._cellSimGetTargetGuide = function ()');
      expect(source).toContain('var CELL_PLAY_COMPARISONS = {');
      expect(source).toContain('data-cell-strategy-contrast');
      expect(source).toContain('var CELL_PLAY_CONTROL_LOOPS = {');
      expect(source).toContain('var CELL_PLAY_EXPLANATION_CHECKS = {');
      expect(source).toContain('function recordCellPlayExplanation(organismId, choiceIndex)');
      expect(source).toContain('canvasEl._cellSimGetControlResponse = function ()');
      expect(source).toContain('var CELL_PLAY_EVIDENCE_PULSE_MS = 3000;');
      expect(source).toContain('function activePlayerEvidencePulse(o)');
      expect(source).toContain('function startPlayerEvidencePulse(o, tutorial, targetKey)');
      expect(source).toContain("startPlayerEvidencePulse(o, tutorial, 'particle-' + contact.index);");
      expect(source).toContain('pulseAnimated: evidenceActive && evidencePulse.animated');
      expect(source).toContain('var playControlTraceState = React.useState(null);');
      expect(source).toContain("var controlTracePhase = evidenceActive ? 'evidence' : controlResponse.moving ? 'input' : 'ready';");
      expect(source).toContain("controlResponse.direction.toUpperCase() + ' input'");
      expect(source).toContain('moving: !!controlResponse.moving,');
      expect(source).toContain("direction: controlResponse.direction || 'idle',");
      expect(source).toContain("controlTraceInput = controlResponse.targetKind === 'light' ? 'Light held'");
      expect(source).toContain('if (canvasEl._onControlTrace) canvasEl._onControlTrace(controlTrace);');
      expect(source).toContain('playControlTraceCallbackRef.current(snapshot);');
      expect(source).toContain('"data-cell-control-phase": activePlayControlPhase');
      expect(source).toContain('"aria-live": "polite", "aria-atomic": "true"');
      expect(source).toContain('"aria-pressed": isActiveDirection ? "true" : "false"');
      expect(source).toContain('"data-cell-move-active": isActiveDirection ? "true" : "false"');
      expect(source).toContain('"data-cell-pad-readout": true');
      expect(source).toContain('"aria-describedby": "cell-live-biology-loop"');
      expect(source).toContain('"data-cell-stage-hud": true');
      expect(source).toContain("gridTemplateColumns: 'minmax(0, 1fr) auto'");
      expect(source).toContain("style: { gridColumn: '1 / -1' }");
      expect(source).toContain('"data-cell-hud-mechanism": true');
      expect(source).toContain('function readCellMissionOverlaySafeBand()');
      expect(source).toContain('"data-cell-mission-ribbon": true');
      expect(source).toContain('"data-cell-ribbon-state": activePlayMissionRibbonState');
      expect(source).toContain('"data-cell-mission-ribbon-primary": true');
      expect(source).toContain('"data-cell-mission-ribbon-secondary": true');
      expect(source).toContain('"data-cell-mission-ribbon-announcement": true');
      expect(source).toContain('"data-cell-mission-ribbon-light-progress": true');
      expect(source).toContain("activePlayLightHoldActive ? 'observe'");
      expect(source).toContain('"aria-keyshortcuts": activePlayDef');
      expect(source).toContain('onBlur: function (e) { setPadDirection(key, false, e); }');
      const anatomyButtonStart = source.indexOf('"data-cell-anatomy-jump": true');
      const anatomyButtonMarkup = source.slice(anatomyButtonStart, anatomyButtonStart + 1800);
      expect(anatomyButtonMarkup).toContain('focus-visible:outline-violet-700');
      expect(source).toContain('var labelFollowRate = prefersReducedCellMotion ? 1 : 0.08;');
      expect(source).toContain('var anatomySafeBand = readCellMissionOverlaySafeBand();');
      expect(source).toContain('Math.min(labelSafeBottom - pillH, pillY)');
      expect(source).toContain('cctx.lineDashOffset = prefersReducedCellMotion ? 0 : -(tNow * 0.8);');
      expect(source).toContain('var pulse = prefersReducedCellMotion ? 0.6 : 0.6 + Math.sin');
      expect(source).toContain('if (playAsOrg && o !== playAsOrg) {\n                  cctx.globalAlpha = 0.34;');
      expect(source).toContain("containerType: 'inline-size'");
      expect(source).toContain('@container (max-width: 340px)');
      expect(source).toContain('@container (max-width: 420px)');
      expect(source).toContain('[data-cell-organism-card-detail] { display: none !important; }');
      expect(source).toContain("compactKeyline: 'Green circle'");
      expect(source).toContain("var padStyle = { bottom: '44px' };");
      expect(source).toContain('style: padStyle, role: "group"');
      expect(source).toContain('data-cell-control-loop');
      expect(source).toContain('data-cell-evidence-chain');
      expect(source).toContain('var CELL_PLAY_PREDICTIONS = {');
      expect(source).toContain('function recordCellPlayPrediction(organismId, choiceIndex)');
      expect(source).toContain('if (runSuccessCount > 0) return cel;');
      expect(source).toContain('data-cell-prediction-checkpoint');
      expect(source).toContain('data-cell-prediction-compare');
      expect(source).toContain('data-cell-prediction-summary');
      expect(source).toContain('data-cell-explanation-check');
      expect(source).toContain('data-cell-play-tutorial-dialog');
      expect(source).toContain('data-cell-restart-attempt');
      expect(source).toContain('var CELL_PLAY_EVIDENCE_STATES = {');
      expect(source).toContain('function recordCellPlayCue(snapshot)');
      expect(source).toContain('function samplePlayerMissionEvidence(o, tutorial, elapsedOverrideMs)');
      expect(source).toContain('missionEvidenceRuntime.particleContactLatched');
      expect(source).toContain('function missionEvidenceNextStep(o, tutorial)');
      expect(source).toContain('Move clear, then approach a new target to collect the next piece of evidence.');
      expect(source).toContain('CELL_PLAY_LIGHT_HOLD_MS = 1000');
      expect(source).not.toContain('world.tick % 60 === 0');
      expect(source).toContain('canvasEl._cellSimGetMissionEvidenceState = function ()');
      expect(source).toContain('function restockPlayerMissionTargets()');
      expect(source).toContain('canvasEl._cellSimRestockMissionTargets = function ()');
      expect(source).toContain('canvasEl._cellSimRestockMissionTargets = null');
      expect(source).toContain('data-cell-recover-targets');
      expect(source).toContain('data-cell-next-step');
      expect(source).toContain('function focusCellNextStepAction()');
      expect(source).toContain('canvasMissionProgressRef');
      expect(source).toContain('function playerMissionEvidenceComplete(o)');
      expect(source).toContain('data-cell-explain-handoff');
      expect(source).toContain('data-cell-explanation-evidence-summary');
      expect(source).toContain('data-cell-organism-option');
      expect(source).toContain('canvasEl._cellSimTestSetMissionScenario = function (scenario)');
      expect(source).toContain('canvasEl._cellSimTestAdvanceMission = function (elapsedMs)');
      expect(source).toContain('data-cell-mission-cue');
      expect(source).toContain('cel.showPlayInstructions !== false');
      expect(source).toContain('activePlayDef && activePlayMission ? Math.max(0, activePlayLifetimeSuccesses - activePlayMissionStart) : 0');
    });
  });
});
