// Humanities lane (Inquiry Studio) golden master — assessment-integrity logic.
//
// Pins the load-bearing guards the 2026-06-07 review flagged:
//   1. scholarNameSuspected — the lane's strongest prohibition ("AI never names
//      a scholar"). Now catches single-surname mononyms (Foucault, Marx…),
//      honorifics, particle names, ALL-CAPS, and adjectival forms, WITHOUT
//      false-positiving on common words ("the author said"). Added 2026-06-07.
//   2. noAiStageSentinelGate — Stage 5 (positionality_reckoning) is structurally
//      NO-AI: the gate must refuse for ANY journal, always.
//   3. counterFramingVoicerValidate / sourceLateralProbeValidate — the AI-output
//      validators reject scholar names and malformed shapes.
//
// Logic only — no React render.

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import { setupLane, laneInternals } from './helpers/research_lane_harness.js';

beforeAll(() => setupLane('humanities'));
const H = () => laneInternals('humanities');

// ── scholarNameSuspected ──────────────────────────────────────────────────
describe('Humanities · scholarNameSuspected', () => {
  const FLAG = [
    'Foucault argues power is diffuse',
    'a Marxist reading of the archive',
    'Gramsci and the concept of hegemony',
    'Dr. Jane Smith makes this point',
    'as de Beauvoir wrote',
    'FOUCAULT looms large here',
    'As Derrida would say',
    'What did Said theorize about orientalism?',
    'Judith Butler on performativity',
    'consider a Kantian frame',
  ];
  const PASS = [
    'What does this framing foreground?',
    'Whose stake is unnamed here?',
    'What the author said about labor conditions', // lowercase "said" must NOT flag
    'How might an economic lens read this source?',
    'Which voices are absent from the record?',
    'What assumptions does your warrant leave implicit?',
    'A postcolonial framing of the yearbook archive',
  ];

  it('flags scholar names (mononyms, honorifics, particles, ALL-CAPS, adjectival)', () => {
    for (const s of FLAG) expect(H().scholarNameSuspected(s), s).toBe(true);
  });

  it('does not false-positive on legitimate framing questions or lowercase "said"', () => {
    for (const s of PASS) expect(H().scholarNameSuspected(s), s).toBe(false);
  });

  it('empty / non-string input is safe', () => {
    expect(H().scholarNameSuspected('')).toBe(false);
    expect(H().scholarNameSuspected(null)).toBe(false);
    expect(H().scholarNameSuspected(undefined)).toBe(false);
  });
});

// ── noAiStageSentinelGate (structural NO-AI Stage 5) ──────────────────────
describe('Humanities · noAiStageSentinelGate', () => {
  it('always refuses, for any journal', () => {
    for (const j of [{}, { devLevel: 'k2' }, { devLevel: 'ap', humanitiesPosition: { text: 'x' } }]) {
      const res = H().noAiStageSentinelGate(j);
      expect(res.ok).toBe(false);
      expect(res.bypass_signals).toContain('no_ai_stage');
    }
  });
});

// ── counterFramingVoicerValidate ──────────────────────────────────────────
describe('Humanities · counterFramingVoicerValidate', () => {
  it('accepts a well-formed, scholar-free output', () => {
    const out = { framing_kind_chips_not_yet_used: [], what_each_chip_would_foreground_questions: [] };
    const res = H().counterFramingVoicerValidate(out, {});
    expect(res.__rejected).toBeFalsy();
  });

  it('rejects a scholar name in the output (mononym the old 2-word check missed)', () => {
    const out = { framing_kind_chips_not_yet_used: [], what_each_chip_would_foreground_questions: ['What would Foucault foreground?'] };
    const res = H().counterFramingVoicerValidate(out, {});
    expect(res.__rejected).toBe(true);
    expect(res.rejectReason).toBe('scholar_name_in_output');
  });

  it('rejects a framing chip that is not in the taxonomy', () => {
    const out = { framing_kind_chips_not_yet_used: ['definitely_not_a_real_chip'], what_each_chip_would_foreground_questions: [] };
    const res = H().counterFramingVoicerValidate(out, {});
    expect(res.__rejected).toBe(true);
    expect(res.rejectReason).toBe('chip_not_in_taxonomy');
  });

  it('rejects a missing required key', () => {
    const res = H().counterFramingVoicerValidate({}, {});
    expect(res.__rejected).toBe(true);
    expect(res.rejectReason).toBe('missing_framing_kind_chips_not_yet_used');
  });
});

// ── sourceLateralProbeValidate ────────────────────────────────────────────
describe('Humanities · sourceLateralProbeValidate', () => {
  const ALL_KEYS = [
    'lateral_moves_still_missing_questions', 'whose_stake_in_publishing_this_questions',
    'independent_coverage_gaps_questions', 'absent_voice_kinds_not_yet_tracked',
    'presentism_risks_in_my_reading_questions', 'what_the_original_audience_would_have_heard_questions',
    'chain_of_transmission_blind_spots_questions',
  ];
  const withArrays = (overrides) => {
    const o = {};
    for (const k of ALL_KEYS) o[k] = [];
    return Object.assign(o, overrides || {});
  };

  it('rejects a missing required key (shape check, fires first)', () => {
    const res = H().sourceLateralProbeValidate({}, {});
    expect(res.__rejected).toBe(true);
    expect(String(res.rejectReason)).toMatch(/^missing_/);
  });

  it('rejects a scholar name in a question (scholar check fires before later checks)', () => {
    const out = withArrays({ lateral_moves_still_missing_questions: ['What would Foucault say about this archive?'] });
    const res = H().sourceLateralProbeValidate(out, {});
    expect(res.__rejected).toBe(true);
    expect(res.rejectReason).toBe('scholar_name_in_output');
  });

  // Regression: a realistic clean output is ACCEPTED. Before the 2026-06-07 fix
  // the quoted-text check ran on JSON.stringify(out) and matched the long
  // quoted KEY NAMES, so EVERY well-formed output was rejected with
  // quoted_text_in_output (the lateral-reading helper never returned usable
  // questions). This guards against that regression.
  it('accepts a realistic clean output (regression: key names must not trip the quoted-text check)', () => {
    const out = withArrays({
      lateral_moves_still_missing_questions: ['Why is this source surfacing now?'],
      whose_stake_in_publishing_this_questions: ['Who benefits from publishing it?'],
      independent_coverage_gaps_questions: ['Where is independent coverage thin?'],
    });
    const res = H().sourceLateralProbeValidate(out, {});
    expect(res.__rejected).toBeFalsy();
    expect(res).toBe(out); // validator returns the output object on success
  });

  it('still rejects genuine verbatim quoted text embedded in a question value', () => {
    const out = withArrays({
      lateral_moves_still_missing_questions: ['The source claims "a very long verbatim passage copied straight from the original article" — is that corroborated?'],
    });
    const res = H().sourceLateralProbeValidate(out, {});
    expect(res.__rejected).toBe(true);
    expect(res.rejectReason).toBe('quoted_text_in_output');
  });
});

describe('Humanities · inquiry method guidance', () => {
  const source = fs.readFileSync('research_lane_humanities_source.jsx', 'utf8');

  it('makes interpretive, qualitative, civic, and creative rigor explicit', () => {
    expect(source).toContain('data-humanities-method-guide=');
    expect(source).toContain('humanistic_interpretation');
    expect(source).toContain('community_qualitative');
    expect(source).toContain('civic_policy');
    expect(source).toContain('creative_cultural');
    expect(source).toContain('Rigor commitments');
    expect(source).toContain('Competing plausible interpretations');
    expect(source).toContain('Discrepant cases and absent voices');
  });

  it('provides actual qualitative and creative method-readiness scaffolds', () => {
    expect(source).toContain('data-qualitative-method-readiness="true"');
    expect(source).toContain('Approved evidence boundary');
    expect(source).toContain('Coding and memo plan');
    expect(source).toContain('Negative or discrepant case plan');
    expect(source).toContain('safeguardingAcknowledged');
    expect(source).toContain('data-creative-method-readiness="true"');
    expect(source).toContain('Creative-practice inquiry');
    expect(source).toContain('Attribution and cultural-position plan');
    expect(source).toContain('Critique and revision plan');
    expect(source).toContain('data-humanities-source-context="true"');
    expect(source).toContain('Edition, translation, transcription, or chain of transmission');
    expect(source).toContain('Historical and material context');
    expect(source).toContain('Creator, community authority, and permission to interpret');
    expect(source).toContain('Contested, translated, or historically shifting terms');
    expect(source).toContain('Archival silences, missing records, and preservation bias');
    expect(source).toContain('Primary record / contemporaneous artifact');
    expect(source).toContain('Scholarship / later analysis');
    expect(source).toContain('Testimony / lived account');
    expect(source).toContain('Creative or cultural artifact');
  });
  it('places an explicit consent boundary on community inquiry', () => {
    expect(source).toContain('Do not collect or upload identifiable interviews, images, or recordings without informed consent');
    expect(source).toContain('public or teacher-approved accounts');
    expect(source).toContain('Ethics and limits:');
  });
});
