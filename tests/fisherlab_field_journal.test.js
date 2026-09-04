import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = 'stem_lab/stem_tool_fisherlab.js';

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_fisherlab.js', 'fisherLab');
});

function observations() {
  return [
    {
      observationId: 'cod-old',
      speciesId: 'cod',
      label: 'Atlantic cod',
      length: 22.5,
      action: 'release',
      identificationCorrect: true,
      ruleCorrect: true,
      correct: true,
      region: 'maine',
      mission: 'core-voyage',
      ts: 1000
    },
    {
      observationId: 'lobster-new',
      speciesId: 'lobster',
      length: 4.25,
      disposition: 'retained',
      identificationCorrect: true,
      ruleCorrect: false,
      correct: false,
      evidence: '4.25 in gauge | review the slot maximum',
      region: 'maine',
      mission: 'core-voyage',
      ts: 3000
    },
    {
      observationId: 'chinook-mid',
      speciesId: 'chinook',
      length: 31,
      action: 'release',
      identificationCorrect: true,
      region: 'pnw',
      mission: 'regional-practice',
      ts: 2000
    },
    {
      observationId: 'haddock-legacy',
      speciesId: 'haddock',
      length: null,
      action: 'release',
      region: 'maine',
      mission: 'field-observation',
      date: '2026-08-24'
    },
    { observationId: 'invalid', region: 'maine', action: 'release' }
  ];
}

describe('Fisher Lab field journal evidence model', () => {
  it('normalizes valid observations, preserves missing measurements, and sorts newest first', () => {
    const rows = window.__FisherLabCore.getCoreJournalRows(observations());

    expect(rows.map((row) => row.observationId)).toEqual([
      'lobster-new',
      'chinook-mid',
      'cod-old',
      'haddock-legacy'
    ]);
    expect(rows[0]).toMatchObject({
      observationId: 'lobster-new',
      evidenceStatus: 'review',
      correction: ''
    });
    expect(rows[1]).toMatchObject({
      label: 'Chinook Salmon (King)',
      region: 'pnw',
      disposition: 'released',
      evidenceStatus: 'confirmed',
      decisionCorrect: true
    });
    expect(rows[3]).toMatchObject({
      label: 'Haddock',
      length: null,
      evidenceStatus: 'unscored',
      decisionCorrect: null
    });
  });

  it('preserves focused-practice transfer metadata through persistence and journal normalization', () => {
    const { appendCoreJournalObservation, getCoreJournalRows } = window.__FisherLabCore;
    const observation = {
      observationId: 'haddock-transfer-practice',
      speciesId: 'haddock',
      label: 'Haddock',
      length: 18,
      action: 'release',
      identificationCorrect: true,
      ruleCorrect: true,
      correct: true,
      evidence: 'Applied the saved minimum-size correction on a newer catch.',
      region: 'maine',
      mission: 'focused-practice',
      practiceTargetSpeciesId: 'haddock',
      practiceFocusSkill: 'transfer',
      correctionReviewedAt: 17000,
      ts: 18000
    };

    const saved = appendCoreJournalObservation([], observation);
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      practiceTargetSpeciesId: 'haddock',
      practiceFocusSkill: 'transfer',
      correctionReviewedAt: 17000
    });

    const rows = getCoreJournalRows(saved);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      observationId: 'haddock-transfer-practice',
      mission: 'focused-practice',
      practiceTargetSpeciesId: 'haddock',
      practiceFocusSkill: 'transfer',
      correctionReviewedAt: 17000
    });
  });

  it('filters by water, disposition, and a case-insensitive evidence query', () => {
    const { getCoreJournalRows } = window.__FisherLabCore;
    const records = observations();

    expect(getCoreJournalRows(records, { region: 'maine' })).toHaveLength(3);
    expect(getCoreJournalRows(records, { region: 'maine', disposition: 'released' }).map((row) => row.speciesId)).toEqual(['cod', 'haddock']);
    expect(getCoreJournalRows(records, { query: 'CHINOOK' }).map((row) => row.observationId)).toEqual(['chinook-mid']);
    expect(getCoreJournalRows(records, { evidence: 'review' }).map((row) => row.observationId)).toEqual(['lobster-new']);
    expect(getCoreJournalRows(records, { evidence: 'confirmed' }).map((row) => row.observationId)).toEqual(['chinook-mid', 'cod-old']);
    expect(getCoreJournalRows(records, { evidence: 'unscored' }).map((row) => row.observationId)).toEqual(['haddock-legacy']);
    expect(getCoreJournalRows(records, { query: 'slot maximum' }).map((row) => row.observationId)).toEqual(['lobster-new']);
    expect(getCoreJournalRows(records, { query: 'no-such-species' })).toEqual([]);
  });

  it('keeps unscored legacy entries out of decision accuracy', () => {
    const { getCoreJournalSummary } = window.__FisherLabCore;

    expect(getCoreJournalSummary(observations())).toMatchObject({
      observations: 4,
      uniqueSpecies: 4,
      retained: 1,
      released: 3,
      scoredDecisions: 3,
      correctDecisions: 2,
      accuracy: 67
    });
    expect(getCoreJournalSummary(observations(), { region: 'maine' })).toMatchObject({
      observations: 3,
      uniqueSpecies: 3,
      retained: 1,
      released: 2,
      scoredDecisions: 2,
      correctDecisions: 1,
      accuracy: 50
    });
  });



  it('builds a regional species mastery map without treating one success as mastery', () => {
    const { getCoreSpeciesMastery } = window.__FisherLabCore;
    const records = [
      { observationId: 'cod-1', speciesId: 'cod', region: 'maine', identificationCorrect: true, ruleCorrect: true, correct: true, ts: 20000 },
      { observationId: 'cod-2', speciesId: 'cod', region: 'maine', identificationCorrect: true, ruleCorrect: true, correct: true, ts: 19000 },
      { observationId: 'lobster-review', speciesId: 'lobster', region: 'maine', identificationCorrect: true, ruleCorrect: false, correct: false, ts: 18000 },
      { observationId: 'haddock-correction', speciesId: 'haddock', region: 'maine', identificationCorrect: true, ruleCorrect: false, correct: false, correction: 'The measured fish does not meet the applicable minimum.', reviewedAt: 17000, ts: 16000 },
      { observationId: 'mackerel-1', speciesId: 'mackerel', region: 'maine', identificationCorrect: true, ruleCorrect: true, correct: true, ts: 15000 },
      { observationId: 'chinook-1', speciesId: 'chinook', region: 'pnw', identificationCorrect: true, ruleCorrect: true, correct: true, ts: 14000 }
    ];

    const mastery = getCoreSpeciesMastery(records, { region: 'maine' });
    const bySpecies = Object.fromEntries(mastery.rows.map((row) => [row.speciesId, row]));

    expect(bySpecies.cod).toMatchObject({ attempts: 2, hasProfile: true, stageId: 'secure', identificationAccuracy: 100, regulationAccuracy: 100 });
    expect(bySpecies.lobster).toMatchObject({ attempts: 1, stageId: 'review', needsReview: 1, focusSkill: 'regulation' });
    expect(bySpecies.haddock).toMatchObject({ stageId: 'rehearse', revisited: 1, transferVerified: false });
    expect(bySpecies.mackerel).toMatchObject({ attempts: 1, stageId: 'building' });
    expect(mastery.summary).toMatchObject({
      observedSpecies: 4,
      needsReview: 1,
      rehearse: 1,
      building: 1,
      secure: 1
    });
    expect(mastery.summary.notStarted).toBe(mastery.summary.totalSpecies - 4);
    expect(mastery.rows[0].speciesId).toBe('lobster');

    const pnwMastery = getCoreSpeciesMastery(records, { region: 'pnw' });
    expect(pnwMastery.rows.every((row) => row.region === 'pnw')).toBe(true);
    expect(pnwMastery.rows.find((row) => row.speciesId === 'chinook')).toMatchObject({ attempts: 1, stageId: 'building' });

    const withTransfer = records.concat([
      { observationId: 'haddock-transfer', speciesId: 'haddock', region: 'maine', identificationCorrect: true, ruleCorrect: true, correct: true, ts: 18000 }
    ]);
    expect(getCoreSpeciesMastery(withTransfer, { region: 'maine' }).rows.find((row) => row.speciesId === 'haddock')).toMatchObject({
      transferVerified: true,
      stageId: 'building'
    });
  });

  it('records audited corrections only for review-needed decisions without changing the original score', () => {
    const { appendCoreJournalCorrection, getCoreJournalRows } = window.__FisherLabCore;
    const original = observations();
    const correction = 'The slot minimum applies, so this catch should be released.';

    expect(appendCoreJournalCorrection(original, 'lobster-new', 'Too short', 9000)).toEqual(original);
    expect(appendCoreJournalCorrection(original, 'cod-old', correction, 9000)).toEqual(original);

    const corrected = appendCoreJournalCorrection(original, 'lobster-new', correction, 9000);
    const row = getCoreJournalRows(corrected, { evidence: 'revisited' })[0];

    expect(original[1]).not.toHaveProperty('correction');
    expect(row).toMatchObject({
      observationId: 'lobster-new',
      decisionCorrect: false,
      evidenceStatus: 'revisited',
      correction,
      reviewedTs: 9000,
      reviewedAt: new Date(9000).toISOString()
    });
    expect(getCoreJournalRows(corrected, { evidence: 'review' })).toEqual([]);
    expect(getCoreJournalRows(corrected, { query: 'slot minimum applies' }).map((item) => item.observationId)).toEqual(['lobster-new']);
  });

  it('exports filtered CSV newest first, escapes quotes, and neutralizes spreadsheet formulas', () => {
    const { serializeCoreJournalCsv } = window.__FisherLabCore;
    const records = observations().concat([{
      observationId: 'formula-label',
      speciesId: 'formula-fish',
      evidence: '+SUM(1,1)',
      correction: '@SUM(2,2) is not the corrected evidence',
      reviewedAt: 5000,
      label: '=HYPERLINK("https://example.invalid")',
      action: 'release',
      region: 'maine',
      ts: 4000
    }]);

    const csv = serializeCoreJournalCsv(records, { region: 'maine' });
    const lines = csv.split('\r\n');

    expect(lines[0]).toContain('"Recorded at","Region","Species"');
    expect(lines[0]).toContain('"Overall decision","Evidence status","Evidence","Correction","Reviewed at","Mission"');
    expect(lines[1]).toContain('"formula-label"');
    expect(lines[1]).toContain("'+SUM(1,1)");
    expect(lines[1]).toContain("'@SUM(2,2) is not the corrected evidence");
    expect(lines[1]).toContain('"\'=HYPERLINK(""https://example.invalid"")"');
    expect(csv).not.toContain('"chinook-mid"');
    expect(lines.at(-1)).toContain('"haddock-legacy"');
  });
  it('builds a deterministic review plan with skill focus, trend, and review queue', () => {
    const { appendCoreJournalCorrection, getCoreJournalReviewPlan } = window.__FisherLabCore;
    const ruleResults = [true, true, false, true, false, false, false, true];
    const speciesIds = ['cod', 'lobster', 'lobster', 'haddock', 'cod', 'lobster', 'lobster', 'mackerel'];
    const records = ruleResults.map((ruleCorrect, index) => ({
      observationId: 'coach-' + index,
      speciesId: speciesIds[index],
      action: 'release',
      identificationCorrect: true,
      ruleCorrect,
      correct: ruleCorrect,
      evidence: ruleCorrect ? 'Evidence confirmed' : 'Review the applicable measurement rule',
      region: 'maine',
      ts: 8000 - index * 1000
    }));

    const plan = getCoreJournalReviewPlan(records, { region: 'maine' });

    expect(plan).toMatchObject({
      observations: 8,
      scoredDecisions: 8,
      confirmedDecisions: 4,
      reviewDecisions: 4,
      needsReview: 4,
      revisitedDecisions: 0,
      overallAccuracy: 50,
      identification: { correct: 8, total: 8, accuracy: 100 },
      regulation: { correct: 4, total: 8, accuracy: 50 },
      recentAccuracy: 75,
      earlierAccuracy: 25,
      trendDelta: 50,
      trendId: 'improving',
      focusId: 'regulation',
      recommendation: { tab: 'regs', buttonLabel: 'Review practice rules' }
    });
    expect(plan.reviewSpecies[0]).toMatchObject({ speciesId: 'lobster', count: 3 });
    expect(plan.reviewQueue.map((row) => row.observationId)).toEqual([
      'coach-2',
      'coach-4',
      'coach-5',
      'coach-6'
    ]);
    const oneCorrected = appendCoreJournalCorrection(records, 'coach-2', 'The measurement rule requires release in this scenario.', 9000);
    const revisedPlan = getCoreJournalReviewPlan(oneCorrected, { region: 'maine' });
    expect(revisedPlan).toMatchObject({
      reviewDecisions: 4,
      needsReview: 3,
      revisitedDecisions: 1,
      overallAccuracy: 50,
      focusId: 'regulation'
    });
    expect(revisedPlan.reviewQueue.map((row) => row.observationId)).toEqual(['coach-4', 'coach-5', 'coach-6']);
    expect(revisedPlan.revisitedQueue.map((row) => row.observationId)).toEqual(['coach-2']);
    expect(revisedPlan.reviewSpecies[0]).toMatchObject({ speciesId: 'lobster', count: 2 });

    const fullyRevisited = ['coach-2', 'coach-4', 'coach-5', 'coach-6'].reduce((journal, observationId, index) => (
      appendCoreJournalCorrection(journal, observationId, 'Corrected evidence explanation for ' + observationId + ' using the applicable rule.', 10000 + index)
    ), records);
    expect(getCoreJournalReviewPlan(fullyRevisited, { region: 'maine' })).toMatchObject({
      confirmedDecisions: 4,
      reviewDecisions: 4,
      needsReview: 0,
      revisitedDecisions: 4,
      overallAccuracy: 50,
      focusId: 'balanced',
      recommendation: { tab: 'sim', buttonLabel: 'Test corrections in a voyage' }
    });

    expect(getCoreJournalReviewPlan([])).toMatchObject({
      focusId: 'baseline',
      trendId: 'building',
      recommendation: { tab: 'sim' }
    });
  });

});

describe('Fisher Lab shellfish evidence separation', () => {
  it('keeps an unassessed shellfish ID out of species mastery while retaining regulation evidence', () => {
    const { appendCoreJournalObservation, getCoreJournalRows, getCoreSpeciesMastery } = window.__FisherLabCore;
    let saved = [];
    [1000, 2000].forEach((ts, index) => {
      saved = appendCoreJournalObservation(saved, {
        observationId: `shellfish-${index + 1}`,
        speciesId: 'lobster',
        action: 'release',
        identificationCorrect: null,
        ruleCorrect: true,
        correct: true,
        region: 'maine',
        ts
      });
    });

    expect(saved[0].identificationCorrect).toBeNull();
    expect(getCoreJournalRows(saved)[0]).toMatchObject({
      identificationCorrect: null,
      ruleCorrect: true,
      decisionCorrect: true
    });
    expect(getCoreSpeciesMastery(saved, { region: 'maine' }).rows.find((row) => row.speciesId === 'lobster')).toMatchObject({
      attempts: 2,
      identificationCorrect: 0,
      identificationTotal: 0,
      identificationAccuracy: null,
      regulationCorrect: 2,
      regulationTotal: 2,
      stageId: 'building'
    });
  });

  it('wires shellfish inspections as unassessed identification evidence', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const block = source.slice(source.indexOf('function submitShellfishDecision(action)'), source.indexOf('function continueAfterShellfishReview()'));

    expect(block).toContain('identificationCorrect: null');
    expect(block).not.toContain('identificationCorrect: true');
  });
});

describe('Fisher Lab field journal UI wiring', () => {
  it('makes the journal discoverable, accessible, and exportable', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');

    expect(source).toContain("{ id: 'journal', label: 'Field Journal' }");
    expect(source).toContain("tab === 'journal' ? journalTab()");
    expect(source).toContain("'data-fisherlab-journal': 'true'");
    expect(source).toContain("h('caption', { className: 'sr-only' }");
    expect(source).toContain("h('th', { scope: 'col'");
    expect(source).toContain('Export visible CSV');
    expect(source).toContain("'data-fisherlab-review-coach': 'true'");
    expect(source).toContain("'data-fisherlab-review-queue': 'true'");
    expect(source).toContain("'data-fisherlab-correction-workshop': 'true'");
    expect(source).toContain("appendCoreJournalCorrection(priorLog, activeReviewRow.observationId");
    expect(source).toContain("'fl-journal-correction-help fl-journal-correction-count'");
    expect(source).toContain("'Save correction'");
    expect(source).toContain("'Revisited with correction'");
    expect(source).toContain("'Evidence status'");
    expect(source).toContain("getCoreJournalReviewPlan(lifeLog, { region: effectiveRegion })");
    expect(source).toContain("CATEGORIES[0].tabs.splice(1, 0, 'journal')");
  });


  it('routes mastery priorities into focused regional species profiles', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const speciesStart = source.indexOf('function speciesTab()');
    const speciesEnd = source.indexOf('function gearTab()', speciesStart);
    const speciesBlock = source.slice(speciesStart, speciesEnd);

    expect(source).toContain("'data-fisherlab-species-mastery': 'true'");
    expect(source).toContain("getCoreSpeciesMastery(lifeLog, { region: effectiveRegion })");
    expect(source).toContain("setRegion(masteryRow.region)");
    expect(source).toContain("setSpeciesFocusId(masteryRow.speciesId)");
    expect(source).toContain("'Species evidence stages ordered by learning priority'");
    expect(speciesBlock).toContain("filterCoreSpeciesProfiles(region, speciesQuery, speciesGroup)");
    expect(speciesBlock).toContain("regionalSpecies.map(function(s, i)");
    expect(speciesBlock).not.toContain('MAINE_SPECIES.map');
    expect(speciesBlock).toContain("regionProfile.label + ' Species ID'");
    expect(speciesBlock).toContain("'data-fisherlab-species-profile': s.id");
    expect(speciesBlock).toContain("id: 'fl-species-' + s.id");
    expect(speciesBlock).toContain('tabIndex: -1');
    expect(speciesBlock).toContain('Focused from your species evidence map');
    expect(speciesBlock).toContain("region === 'maine' ? h('div'");
  });


  it('turns a mastery priority into a transparent focused simulator plan', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');

    expect(source).toContain('function prepareMasteryPractice(masteryRow)');
    expect(source).toContain('setPracticeTargetSpeciesId(masteryRow.speciesId)');
    expect(source).toContain('setPracticeFocusSkill(masteryRow.focusSkill)');
    expect(source).toContain('practiceTargetRef.current = masteryRow.speciesId');
    expect(source).toContain('practiceFocusRef.current = masteryRow.focusSkill');
    expect(source).toContain("'data-fisherlab-prepare-practice': row.speciesId");
    expect(source).toContain('Prepare voyage');
    expect(source).toContain("'data-fisherlab-practice-plan': practiceTargetSpecies.id");
    expect(source).toContain('This optional catch target adds journal evidence');
    expect(source).toContain('The core mission still requires');
    expect(source).toContain('getCoreFishingPracticePlan(activeRegion, requestedTargetSpeciesId, observedConditions)');
    expect(source).toContain("fishingTargetSpecies.name + ' practice'");
    expect(source).toContain('Encounters remain probability-weighted, so bycatch is possible.');
  });

  it('labels observation totals honestly and scopes species counts to the active region', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');

    expect(source).toContain("'Journal observations'");
    expect(source).not.toContain("'Total keepers'");
    expect(source).toContain("caughtCount + '/' + getSpeciesForRegion(region).length");
    expect(source).toContain('getCoreJournalSummary(lifeLog, { region: region })');
    expect(source).toContain('var caughtCount = regionJournalSummary.observations ? regionJournalSummary.uniqueSpecies : legacyCaughtCount');
  });
});
