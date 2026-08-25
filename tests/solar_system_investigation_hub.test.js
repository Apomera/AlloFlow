import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const COPIES = [
  'stem_lab/stem_tool_solarsystem.js',
  'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js',
];
const source = readFileSync(COPIES[0], 'utf8');

describe('Solar System Investigation Hub', () => {
  it('keeps canonical and desktop assets identical', () => {
    expect(readFileSync(COPIES[1], 'utf8')).toBe(source);
  });

  it('presents five accessible, mutually exclusive evidence labs', () => {
    expect(source).toContain('data-solarsystem-investigation-hub');
    expect(source).toContain('"aria-labelledby": "solar-investigation-hub-title"');
    expect(source).toContain("{ id: 'compare'");
    expect(source).toContain("{ id: 'seasons'");
    expect(source).toContain("{ id: 'signal'");
    expect(source).toContain("{ id: 'gravity'");
    expect(source).toContain("{ id: 'moon'");
    expect(source).toContain('"data-solarsystem-gravity-toggle"');
    expect(source).toContain('"data-solarsystem-moon-toggle"');
    expect(source).toContain('"aria-expanded": open');
    expect(source).toContain('"aria-controls": card.controls');
    expect(source).toContain("showVisualCompare: false, showSeasonsLab: false, showSignalLab: false, showGravityLab: false, showMoonLab: false");
  });

  it('reports not-started, prediction, configured, and saved progress', () => {
    expect(source).toContain("id: 'not-started'");
    expect(source).toContain("id: 'prediction'");
    expect(source).toContain("id: 'configured'");
    expect(source).toContain("id: 'saved'");
    expect(source).toContain('"data-investigation-progress": progress.id');
    expect(source).toContain('d.seasonsEvidenceSaved');
    expect(source).toContain('d.signalEvidenceSaved');
    expect(source).toContain('d.gravityEvidenceSavedFor');
    expect(source).toContain('d.moonEvidenceSaved');
  });

  it('summarizes the existing labs as an accessible evidence constellation', () => {
    expect(source).toContain('data-solarsystem-evidence-constellation');
    expect(source).toContain('stem.solarsystem.evidence_constellation');
    expect(source).toContain('investigationEvidenceCount');
    expect(source).toContain('investigationEvidencePercent');
    expect(source).toContain('"aria-valuenow": investigationEvidenceCount');
    expect(source).toContain('"data-investigation-constellation-id"');
    expect(source).toContain('"data-investigation-next"');
    expect(source).toContain('Review evidence journal');
    expect(source).toContain('.solar-evidence-node[data-recommended="true"]{transform:none}');
    expect(source).toContain('solar-evidence-check');
    expect(source).toContain('"aria-current": recommended ? \'step\' : undefined');
    expect(source).toContain('"data-investigation-recommended": recommended');
    expect(source).toContain('Recommended next.');
    expect(source).toContain('stem.solarsystem.optional_guided_path');
    expect(source).toContain('stem.solarsystem.guided_path_description');
  });

  it('lets Visual Compare save evidence like the other existing labs', () => {
    expect(source).toContain('data-solarsystem-compare-save');
    expect(source).toContain('compareEvidenceSavedFor');
    expect(source).toContain('Save comparison evidence to journal');
    expect(source).toContain("addJournalEntry(compareP1.name + ' + ' + compareP2.name");
    expect(source).toContain('Diameter and surface gravity describe different physical properties');
  });

  it('uses readable step hierarchy and semantic saved-journal cards', () => {
    expect(source).toContain(':is(.text-\\\\[8px\\\\],.text-\\\\[9px\\\\]){font-size:10px!important');
    expect(source).toContain('.text-\\\\[10px\\\\]{font-size:11px!important');
    [
      'stem.solarsystem.compare_step_choose_worlds',
      'stem.solarsystem.compare_step_measurements',
      'stem.solarsystem.seasons_step_read_evidence',
      'stem.solarsystem.signal_step_commit_hypothesis',
      'stem.solarsystem.moon_step_commit_hypothesis',
    ].forEach((key) => expect(source).toContain(key));
    expect(source).toContain('"data-inquiry-stage"');
    expect(source).toContain('data-solar-journal-entry');
    expect(source).toContain('"data-journal-field": field.key');
    expect(source).toContain('React.createElement("dl", { className: "space-y-2" }');
    expect(source).toContain("style: { fontSize: '12px' }");
    expect(source).toContain('break-words px-2 py-1.5 text-right text-[11px]');
  });

  it('launches and closes Gravity Drop as a proper controlled investigation', () => {
    expect(source).toContain("if (!closing && cardId === 'gravity') patch.showGravityLab = true");
    expect(source).toContain('d.showGravityLab && sel && (function()');
    expect(source).toContain('id: "solar-gravity-lab"');
    expect(source).toContain('data-solarsystem-gravity-close');
    expect(source).toContain("upd('showGravityLab', false)");
    expect(source).toContain("matchMedia('(prefers-reduced-motion: reduce)')");
  });

  it('uses current challenge language and localization-ready investigation copy', () => {
    expect(source).toContain('Gravity Investigator');
    expect(source).toContain('Run the gravity-drop investigation');
    expect(source).not.toContain("'Weight Watcher'");
    expect(source).not.toContain("'Use the gravity calculator'");
    [
      'stem.solarsystem.investigation_hub',
      'stem.solarsystem.seasons_lab_instructions',
      'stem.solarsystem.signal_lab_instructions',
      'stem.solarsystem.gravity_lab_instruction',
      'stem.solarsystem.seasons_model_boundary',
      'stem.solarsystem.signal_model_boundary',
      'stem.solarsystem.gravity_model_boundary',
      'stem.solarsystem.moon_model_boundary',
    ].forEach((key) => expect(source).toContain(key));
  });
});
