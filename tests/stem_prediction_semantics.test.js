import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const LIVE_OUTPUT_TOOLS = [
  'stem_tool_allobotsage.js',
  'stem_tool_applab.js',
  'stem_tool_assessmentliteracy.js',
  'stem_tool_atctower.js',
  'stem_tool_behaviorlab.js',
  'stem_tool_brainatlas.js',
  'stem_tool_circuit.js',
  'stem_tool_coding.js',
  'stem_tool_dataplot.js',
  'stem_tool_dissection.js',
  'stem_tool_dna.js',
  'stem_tool_economicslab.js',
  'stem_tool_llm_literacy.js',
  'stem_tool_migration.js',
  'stem_tool_money.js',
  'stem_tool_nutritionlab.js',
  'stem_tool_optics.js',
  'stem_tool_pets.js',
  'stem_tool_printingpress.js',
  'stem_tool_schoolbehaviortoolkit.js',
  'stem_tool_skatelab.js',
  'stem_tool_solarsystem.js',
  'stem_tool_statslab.js',
  'stem_tool_stewardship.js',
  'stem_tool_worldbuilder.js'
];

const PEDAGOGY_TARGETS = [
  'stem_tool_dna.js',
  'stem_tool_circuit.js',
  'stem_tool_aquarium.js',
  'stem_tool_calculus.js',
  'stem_tool_physics.js',
  'stem_tool_heatlab.js',
  'stem_tool_skatelab.js',
  'stem_tool_cell.js',
  'stem_tool_throwlab.js',
  'stem_tool_magnetism.js',
  'stem_tool_watercycle.js',
  'stem_tool_coasterlab.js',
  'stem_tool_ecosystem.js',
  'stem_tool_epidemic.js',
  'stem_tool_geometryworld.js'
];

function source(name) {
  return fs.readFileSync(path.join(process.cwd(), 'stem_lab', name), 'utf8');
}

describe('STEM prediction semantics', () => {
  it('does not call a visible live-output sandbox a hidden prediction', () => {
    for (const name of LIVE_OUTPUT_TOOLS) {
      const text = source(name);
      expect(text, name).not.toMatch(/Predict[^\r\n]{0,240}No score, no reveal/i);
    }
  });

  it('uses objective electrical quantities in the Circuit POE scenarios', () => {
    const text = source('stem_tool_circuit.js');
    const start = text.indexOf('var POE_SCENARIOS = [');
    const end = text.indexOf('function renderPoebulbSection', start);
    const block = text.slice(start, end);
    expect(block).toContain('How much electrical power will the bulb use?');
    expect(block).toContain('How much power does each bulb use compared with scenario 1?');
    expect(block).toContain('Approximately how much voltage is across the 10 Ω bulb?');
    expect(block).toContain('power as a consistent brightness proxy');
    expect(block).not.toContain('How bright');
    expect(block).not.toContain("'Medium'");
    expect(text).toContain("'aria-disabled': stg.picked == null || stg.revealed ? 'true' : 'false'");
    expect(text).toContain('if (stg.picked == null || stg.revealed) return;');
  });

  it('gives Solar System learners a complete, ungraded claim-explanation-revise cycle', () => {
    const text = source('stem_tool_solarsystem.js');
    expect(text).toContain('solar-poe-prediction-');
    expect(text).toContain('data-solar-poe-inquiry');
    expect(text).toContain('MAKE A CLAIM BEFORE THE EXPLANATION');
    expect(text).toContain('Use what you observed to make an ungraded claim.');
    expect(text).not.toContain('PREDICT BEFORE YOU EXPLORE');
    expect(text).toContain("value: d['poe_prediction_' + sel.name] || ''");
    expect(text).toContain("disabled: !String(d['poe_prediction_' + sel.name] || '').trim()");
    expect(text).toContain("\"aria-disabled\": String(d['poe_prediction_' + sel.name] || '').trim() ? \"false\" : \"true\"");
    expect(text).toContain('if (!prediction) return;');
    expect(text).toContain('data-solar-locked-prediction');
    expect(text).toContain('data-solar-locked-claim');
    expect(text).toContain('data-solar-prediction-comparison');
    expect(text).toContain('data-solar-claim-comparison');
    expect(text).toContain('Reveal model explanation');
    expect(text).not.toContain('Reveal model evidence');
    expect(text).not.toContain('Reveal the answer');
    expect(text).toContain('data-solar-poe-revision');
    expect(text).toContain("d['poe_revision_' + sel.name]");
    expect(text).toContain("d['poe_revision_reason_' + sel.name]");
    expect(text).toContain('poeReason.trim().length >= 12');
    expect(text).toContain('No option is graded as correct.');
    expect(text).toContain('Save inquiry cycle');
    expect(text).not.toContain('I have a prediction!');
  });

  it('matches Solar System task labels and reveal timing to what learners actually do', () => {
    const text = source('stem_tool_solarsystem.js');
    expect(text).toContain('data-solar-season-evidence-check');
    expect(text).toContain('This is an evidence-reading check, not a prediction.');
    expect(text).toContain('Save interpretation + evidence to journal');
    expect(text).toContain("var moonOutcomeVisible = !!predictionChoice;");
    expect(text).toContain("'data-moon-alignment-result': moonOutcomeVisible ? eclipseAlignment : 'hidden'");
    expect(text).toContain('Outcome hidden until you commit');
    expect(text).toContain("disabled: moonOutcomeVisible, 'aria-disabled': moonOutcomeVisible ? 'true' : 'false'");
    expect(text).toContain('var dropHasRun = dropNonce > 0 && !!predictionChoice;');
    expect(text).toContain("if (!predictionChoice) return;");
    expect(text).toContain("dropHasRun ? fallTime.toFixed(2) + \" s\"");
    expect(text).toContain('disabled: !predictionChoice');
    expect(text).toContain('dropHasRun && predictionChoice ? React.createElement');
  });

  it('awards inquiry credit for committing, testing, and revising rather than matching', () => {
    const dna = source('stem_tool_dna.js');
    expect(dna).toContain('data-dna-inquiry-credit');
    expect(dna).toContain('Your prediction is a hypothesis, not a graded answer.');
    expect(dna).toContain("var score = (committedPrediction ? 1 : 0) + (explanationComplete ? 1 : 0) + (revisionComplete ? 1 : 0);");
    expect(dna).not.toContain('var score = (predictionCorrect ? 1 : 0)');

    const circuit = source('stem_tool_circuit.js');
    expect(circuit).toContain('data-circuit-inquiry-credit');
    expect(circuit).toContain('data-circuit-poe-revision');
    expect(circuit).toContain('Prediction accuracy is not graded');
    const poeBlock = circuit.slice(circuit.indexOf('function renderPoebulbSection'), circuit.indexOf('function renderFailDxSection'));
    expect(poeBlock).not.toContain("score: (state.score || 0) +");
    expect(poeBlock).not.toContain('Correct!');

    const aquarium = source('stem_tool_aquarium.js');
    expect(aquarium).toContain('predictionMatched: predictionMatched');
    expect(aquarium).toContain('var stars = success ? 1 + (fairTestComplete ? 1 : 0) + (vitalityProtected ? 1 : 0) : 0;');
    expect(aquarium).toContain('this does not affect stars');
    expect(aquarium).toContain('Prediction revision and evidence');
  });

  it('labels numerical accuracy activities as estimation challenges with accuracy-independent reflection', () => {
    const physics = source('stem_tool_physics.js');
    expect(physics).toContain('data-physics-estimation-challenge');
    expect(physics).toContain('data-physics-estimation-reflection');
    expect(physics).toContain('Closeness earns estimation XP here because numerical calibration is the skill.');
    expect(physics).toContain('Your reflection earns completion credit regardless of the error.');
    expect(physics).toContain("'Calculate the Landing'");
    expect(physics).toContain("'Generate range calculation quiz'");

    const heat = source('stem_tool_heatlab.js');
    expect(heat).toContain('data-heat-estimation-challenge');
    expect(heat).toContain('data-heat-estimation-reflection');
    expect(heat).toContain('reflection credit never depends on matching the model');
    expect(heat).toContain("disabled: !mixEstimateReady || revealed");
    expect(heat).toContain('This completion credit is independent of accuracy.');
  });

  it('distinguishes numerical estimates, concept checks, and ungraded hypotheses', () => {
    const skate = source('stem_tool_skatelab.js');
    expect(skate).toContain("data-skatelab-overhaul': 'physics-first'");
    expect(skate).toContain('estimateChallenge');
    expect(skate).toContain('Require estimate');
    expect(skate).toContain('Enter an estimate of zero or greater before running.');
    expect(skate).toContain('errorPct');
    expect(skate).toContain('stats.withinTen');
    expect(skate).toContain('Skate flight hang-time hypothesis');
    expect(skate).toContain('Your hypothesis: what controls hang time most?');
    expect(skate).not.toContain('callGemini');

    const cell = source('stem_tool_cell.js');
    expect(cell).toContain('data-cell-concept-check');
    expect(cell).toContain('data-cell-concept-feedback');
    expect(cell).toContain('This is a concept check, not an experiment prediction.');
    expect(cell).toContain('Check your reasoning before reveal');
    // Negative lookahead: data-cell-prediction-checkPOINT is the tutorial's
    // legitimate predict-before-play experiment lane, not the retired marker.
    expect(cell).not.toMatch(/data-cell-prediction-check(?!point)/);

    const throwlab = source('stem_tool_throwlab.js');
    expect(throwlab).toContain('ungraded hypothesis · optional');
    expect(throwlab).toContain('A match is not a score; both matches and surprises can guide the next test.');
    expect(throwlab).toContain('descriptive, not scored');
    expect(throwlab).toContain('Call compared with the evidence');
    expect(throwlab).not.toContain('Prediction matched the evidence');
  });

  it('keeps the Magnetism distance estimate ungraded and hides explanatory evidence until the test', () => {
    const magnetism = source('stem_tool_magnetism.js');
    const optionStart = magnetism.indexOf('var FORCE_BENCH_PREDICTIONS = [');
    const optionEnd = magnetism.indexOf('function forceBenchEvidenceState', optionStart);
    const optionBlock = magnetism.slice(optionStart, optionEnd);

    expect(magnetism).toContain("'data-magnetism-estimation-inquiry': 'true'");
    expect(magnetism).toContain('Make an ungraded estimate. Then reveal the controlled evidence.');
    expect(magnetism).toContain('Completion counts the controlled comparison, not whether the estimate matched.');
    expect(optionBlock).not.toMatch(/fourth power|inverse-fourth|2⁴/i);
    expect(magnetism).toContain("evidence.resultCaptured ? h('polyline', { className: 'mag-force-distance-curve'");
    expect(magnetism).toContain("evidence.resultCaptured ? h('div', { className: 'mag-force-metric', 'data-metric': 'comparison'");
    expect(magnetism).toContain("slider(evidence.resultCaptured ? 'Gap between magnets' : 'Gap between magnets · locked for estimate'");
    expect(magnetism).toContain('!evidence.resultCaptured),');
  });

  it('identifies Water Cycle as a post-evidence interpretation rather than a scored prediction', () => {
    const water = source('stem_tool_watercycle.js');
    const interpretationIndex = water.indexOf('"data-watercycle-evidence-interpretation": "true"');

    expect(interpretationIndex).toBeGreaterThan(water.indexOf('"aria-label": "Evaporation baseline '));
    expect(interpretationIndex).toBeGreaterThan(water.indexOf('"aria-label": "Runoff baseline '));
    expect(interpretationIndex).toBeGreaterThan(water.indexOf('"aria-label": "Infiltration baseline '));
    expect(water).toContain('Choose one claim before the comparison is revealed. This is evidence-reading practice, not a score.');
    expect(water).toContain('wcPredictionMatched ? "is-agrees" : "is-differs"');
    expect(water).not.toContain('"aria-label": "Prediction check"');
    expect(water).not.toContain('"Predict first"');
  });

  it('awards CoasterLab hypothesis credit for the inquiry cycle, not agreement', () => {
    const coaster = source('stem_tool_coasterlab.js');
    const inquiryStart = coaster.indexOf('function guidedInquiryCycleEvidence');
    const inquiryEnd = coaster.indexOf('/* @clab-inquiry-rubric-end */', inquiryStart);
    const inquiryBlock = coaster.slice(inquiryStart, inquiryEnd);

    expect(coaster).toContain('data-clab-hypothesis-credit="commit-test-explain-revise"');
    expect(coaster).toContain('data-clab-explore-inquiry="commit-test-explain-revise"');
    expect(coaster).toContain('Commit an ungraded hypothesis first. Match or difference is evidence, not a score.');
    expect(inquiryBlock).toContain("typeof entry.speedCorrect === 'boolean' && typeof entry.forceCorrect === 'boolean'");
    expect(inquiryBlock).toContain('score: compared ? (revisionCount > 0 || explained ? 2 : 1) : 0');
    expect(inquiryBlock).not.toContain('entry.speedCorrect && entry.forceCorrect');
    expect(coaster).toContain('Agreement is ungraded.');
    expect(coaster).toContain('Explore = ungraded pre-ride hypotheses, Engineer = calculation concept checks.');
    expect(coaster).toContain("rq.tag.textContent = 'Concept check · '");
  });

  it('requires an immutable Ecosystem commitment before graph evidence', () => {
    const ecosystem = source('stem_tool_ecosystem.js');

    expect(ecosystem).toContain("'data-ecosystem-committed-inquiry': 'true'");
    expect(ecosystem).toContain("'data-ecosystem-commit-prediction': 'true'");
    expect(ecosystem).toContain("'data-ecosystem-run-committed': 'true'");
    expect(ecosystem).toContain("'data-ecosystem-plan-next': 'true'");
    expect(ecosystem).toContain('runEcoPopulationModel(runCommitment.parameters)');
    expect(ecosystem).toContain('var completedCommitment = Object.assign({}, runCommitment');
    expect(ecosystem).toContain('Agreement is not a score');
    expect(ecosystem).toContain("'data-ecosystem-prediction-comparison': 'descriptive-ungraded'");
    expect(ecosystem).toContain('var reportCommitment = completedRunCommitment || null');
    expect(ecosystem).toContain("evidenceMode: 'post-observation-pattern-explanation'");
    expect(ecosystem).toContain('This map displays evidence from 121 completed runs');
    expect(ecosystem).toContain('Your evidence-based pattern explanation (not a prediction)');
    expect(ecosystem).not.toContain('Select a cell, make a prediction, then open that exact setup in Explore.');
  });

  it('binds each Geometry World estimate to an unmeasured structure before reveal', () => {
    const geometry = source('stem_tool_geometryworld.js');

    expect(geometry).toContain("'data-geometry-estimation-challenge': 'draft-commit-measure-reflect'");
    expect(geometry).toContain('This is an ungraded estimate. Aim at one unmeasured structure');
    expect(geometry).toContain("'data-geometry-estimate-action': volumeEstimateCommitment ? 'change' : 'commit'");
    expect(geometry).toContain('function commitVolumeEstimateDraft(draft, targetKey, observedTargetKeys)');
    expect(geometry).toContain('function resolveVolumeEstimateMeasurement(measurement, commitment, observedTargetKeys)');
    expect(geometry).toContain("status: 'target_mismatch'");
    expect(geometry).toContain("status: 'already_observed'");
    expect(geometry).toContain('Difference is described only for an estimate committed before measurement; it is not scored.');
    expect(geometry).toContain("'data-geometry-estimate-result': 'committed-before-measurement'");
    expect(geometry).toContain("'Committed estimate ' + formatVolume(predictionResult.prediction) + ' \\u2192 Measured '");
    expect(geometry).toContain("policy: 'descriptive-ungraded'");
    expect(geometry).toContain("engine.performMeasurement('surface')");
    expect(geometry).toContain("'aria-describedby': 'gw-volume-estimate-status'");
    expect(geometry).toContain("'aria-invalid': String(volumePrediction || '').trim() && !volumeEstimateDraftValid");
    expect(geometry).not.toContain('Predictions within 10%');
    expect(geometry).not.toContain('Avg prediction error');
    expect(geometry).not.toContain("'aria-label': 'Predicted volume in cubic units'");
  });

  it('keeps every changed source file synchronized with its desktop mirror', () => {
    for (const name of Array.from(new Set(LIVE_OUTPUT_TOOLS.concat(PEDAGOGY_TARGETS)))) {
      const canonical = fs.readFileSync(path.join(process.cwd(), 'stem_lab', name), 'utf8');
      const mirror = fs.readFileSync(path.join(process.cwd(), 'desktop', 'web-app', 'public', 'stem_lab', name), 'utf8');
      expect(mirror, name).toBe(canonical);
    }
  });
});
