import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

beforeEach(() => resetStemLab());

describe('BirdLab field progression and scene engagement', () => {
  it('renders the durable rank, daily assignment, and condition controls in I-Spy', () => {
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
      },
    });

    expect(html).toContain('Field Birder');
    expect(html).toContain('425 XP');
    expect(html).toContain('Field assignment');
    expect(html).toContain('Find the ');
    expect(html).toContain('Field conditions');
    expect(html).toContain('Dusk watch');
    expect(html).toContain('birdlab-condition-button');
    expect(html).toContain('birdlab-scene-hud--condition');
    expect(html).toContain('Target:');
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
    expect(html).toContain('#3');
  });

  it('ships idempotent reward keys for every meaningful gameplay milestone', () => {
    const config = loadTool('stem_lab/stem_tool_birdlab.js', 'birdLab');
    expect(typeof config.render).toBe('function');
    const source = config.render.toString();
    expect(source).toContain("'spot:' + habitatId + ':' + bird.species");
    expect(source).toContain("'clean:' + habitatId + ':' + difficulty");
    expect(source).toContain("'lifer:' + bird.species");
    expect(source).toContain("'daily:' + dailyKey");
    expect(source).toContain("'assignment:' + dailyChallenge.date");
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
    expect(source).toContain("'aria-pressed': selected");
  });
});
