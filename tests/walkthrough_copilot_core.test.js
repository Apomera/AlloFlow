import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const copilot = require('../walkthrough_copilot_module.js');
const fixtures = require('../walkthrough_copilot_fixtures.js');

const NOW = '2026-09-15T13:00:00.000Z';
const NOTES = fixtures.SAMPLE_NOTES;

function draft(overrides) {
  const report = copilot.createDraft(
    Object.assign(
      {
        framework: fixtures.PORTLAND_FRAMEWORK,
        sourceNotes: NOTES,
        context: fixtures.SAMPLE_CONTEXT,
      },
      overrides || {}
    ),
    { now: NOW }
  );
  if (!report.ok) throw new Error('fixture draft failed: ' + JSON.stringify(report.errors));
  return report.value;
}

function analyzed(overrides) {
  const report = copilot.validateSuggestions(draft(overrides), fixtures.goodSuggestions(NOTES));
  if (!report.ok) throw new Error('fixture analysis failed: ' + JSON.stringify(report.errors));
  return report.value;
}

function decideAll(source, decision) {
  return source.suggestions.reduce((current, suggestion) => {
    const report = copilot.decideSuggestion(current, suggestion.id, decision, 'Approved text.');
    if (!report.ok) throw new Error('decision failed: ' + JSON.stringify(report.errors));
    return report.value;
  }, source);
}

function codes(report) {
  return report.errors.map((entry) => entry.code);
}
function warningCodes(report) {
  return report.warnings.map((entry) => entry.code);
}

describe('walkthrough copilot framework configuration', () => {
  it('accepts the Portland structure and rejects malformed configurations', () => {
    const report = copilot.validateFramework(fixtures.PORTLAND_FRAMEWORK);
    expect(report.ok).toBe(true);
    expect(report.value.domains).toHaveLength(4);
    expect(report.value.components).toHaveLength(22);

    expect(codes(copilot.validateFramework(null))).toContain('framework-invalid');
    expect(codes(copilot.validateFramework({ id: 'x', domains: [], components: [] })))
      .toContain('framework-domains');
    expect(
      codes(
        copilot.validateFramework({
          id: 'x',
          domains: [{ id: 'a', label: 'A' }],
          components: [{ id: 'c1', domainId: 'nope', label: 'C' }],
        })
      )
    ).toContain('component-orphan');
  });

  it('carries no performance-level rubric language', () => {
    // Structure only. Descriptors are the district's to supply.
    const serialized = JSON.stringify(fixtures.PORTLAND_FRAMEWORK).toLowerCase();
    for (const level of ['unsatisfactory', 'needs improvement', 'proficient', 'excellent', 'distinguished', 'basic']) {
      expect(serialized, 'framework config should not embed rubric level text').not.toContain(level);
    }
  });

  it('works with a framework that does not have four domains', () => {
    const local = draft({ framework: fixtures.THREE_DOMAIN_FRAMEWORK });
    expect(local.framework.domains).toHaveLength(3);

    const analysis = copilot.validateSuggestions(local, [
      {
        id: 'local-1',
        componentId: 'inst-1',
        objectiveEvidence: 'The teacher asked a text-evidence question and waited before calling on anyone.',
        interpretation: 'Wait time was used.',
        sourceSpans: [fixtures.spanFor(NOTES, '9:07 T asks "what evidence in paragraph 2 supports that?" waits ~5 sec before calling on anyone.')],
      },
    ]);
    expect(analysis.ok).toBe(true);

    const output = copilot.buildFormOutput(decideAll(analysis.value, 'accepted'), {}, { now: NOW });
    expect(output.ok).toBe(true);
    expect(output.value.fields).toHaveLength(3);
    expect(output.value.fields.map((field) => field.domainId)).toEqual(['env', 'inst', 'prof']);
  });
});

describe('walkthrough copilot note integrity', () => {
  it('refuses a fabricated quotation whose offsets do not match the notes', () => {
    const report = copilot.validateSuggestions(draft(), [fixtures.badSuggestions(NOTES).fabricatedQuote]);
    expect(report.ok).toBe(false);
    expect(codes(report)).toContain('span-mismatch');
  });

  it('refuses a claim that cites nothing', () => {
    const report = copilot.validateSuggestions(draft(), [fixtures.badSuggestions(NOTES).uncitedClaim]);
    expect(report.ok).toBe(false);
    expect(codes(report)).toContain('span-absent');
  });

  it('refuses a component outside the configured framework', () => {
    const report = copilot.validateSuggestions(draft(), [fixtures.badSuggestions(NOTES).unknownComponent]);
    expect(report.ok).toBe(false);
    expect(codes(report)).toContain('component-unknown');
  });

  it('refuses a suggestion whose domain contradicts its component', () => {
    const report = copilot.validateSuggestions(draft(), [fixtures.badSuggestions(NOTES).mismatchedDomain]);
    expect(report.ok).toBe(false);
    expect(codes(report)).toContain('domain-mismatch');
  });

  it('refuses any suggestion carrying a rating or employment recommendation', () => {
    const report = copilot.validateSuggestions(draft(), [fixtures.badSuggestions(NOTES).carriesRating]);
    expect(report.ok).toBe(false);
    expect(codes(report)).toContain('field-forbidden');

    for (const key of ['score', 'performanceLevel', 'recommendation', 'act13', 'annualRating']) {
      const smuggled = Object.assign({}, fixtures.badSuggestions(NOTES).carriesRating);
      delete smuggled.rating;
      smuggled[key] = 'anything';
      expect(codes(copilot.validateSuggestions(draft(), [smuggled])), key).toContain('field-forbidden');
    }
  });

  it('keeps the frozen notes byte-identical through analyze, decide, and export', () => {
    const start = draft();
    expect(start.sourceNotesOriginal).toBe(NOTES);

    const afterAnalysis = analyzed();
    expect(afterAnalysis.sourceNotesOriginal).toBe(NOTES);

    const afterDecisions = decideAll(afterAnalysis, 'accepted');
    expect(afterDecisions.sourceNotesOriginal).toBe(NOTES);

    copilot.buildFormOutput(afterDecisions, fixtures.SAMPLE_FIELD_MAP, { now: NOW });
    copilot.exportDraft(afterDecisions, fixtures.SAMPLE_FIELD_MAP, { now: NOW });
    expect(afterDecisions.sourceNotesOriginal).toBe(NOTES);
  });

  it('does not mutate the draft it was given', () => {
    const source = analyzed();
    const before = JSON.stringify(source);
    copilot.decideSuggestion(source, 's-3b', 'rejected');
    copilot.buildFormOutput(source, {}, { now: NOW });
    expect(JSON.stringify(source)).toBe(before);
  });

  it('never rewrites a cited excerpt when a suggestion is edited', () => {
    const source = analyzed();
    const original = JSON.stringify(source.suggestions.find((entry) => entry.id === 's-3b').sourceSpans);
    const report = copilot.decideSuggestion(source, 's-3b', 'edited', 'Reworded feedback that says something different.');
    expect(report.ok).toBe(true);
    const edited = report.value.suggestions.find((entry) => entry.id === 's-3b');
    expect(JSON.stringify(edited.sourceSpans)).toBe(original);
    expect(edited.approvedText).toBe('Reworded feedback that says something different.');
  });
});

describe('walkthrough copilot evidence and interpretation', () => {
  it('warns when judgment language is presented as observed evidence', () => {
    const report = copilot.validateSuggestions(draft(), [fixtures.badSuggestions(NOTES).judgmentAsEvidence]);
    expect(report.ok).toBe(true);
    expect(warningCodes(report)).toContain('evidence-judgment');
  });

  it('warns when a claim generalizes past the moment it cites', () => {
    const report = copilot.validateSuggestions(draft(), [fixtures.badSuggestions(NOTES).overGeneralized]);
    expect(report.ok).toBe(true);
    expect(warningCodes(report)).toContain('generalization-unsupported');
  });

  it('keeps an explicit insufficient-evidence result without inventing a component', () => {
    const result = analyzed().suggestions.find((entry) => entry.id === 's-insufficient');
    expect(result.result).toBe('insufficient_evidence');
    expect(result.componentId).toBeNull();
    expect(result.sourceSpans).toHaveLength(0);
    expect(result.note).toMatch(/do not establish/i);
  });

  it('flags domains with no recorded evidence', () => {
    const analysis = copilot.validateSuggestions(draft(), fixtures.goodSuggestions(NOTES));
    const empty = analysis.value.globalWarnings.filter((entry) => entry.code === 'domain-empty');
    // The fixture notes support Domains 2 and 3 only.
    expect(empty.map((entry) => entry.path).sort()).toEqual(['domains.d1', 'domains.d4']);
  });
});

describe('walkthrough copilot export gating', () => {
  it('blocks export while any suggestion is still pending', () => {
    const report = copilot.exportReadiness(analyzed());
    expect(report.ok).toBe(false);
    expect(codes(report)).toContain('decisions-pending');
  });

  it('blocks export when everything was rejected', () => {
    const report = copilot.exportReadiness(decideAll(analyzed(), 'rejected'));
    expect(codes(report)).toContain('nothing-approved');
  });

  it('blocks export when the disclosure has been emptied', () => {
    const source = decideAll(
      analyzed({ disclosure: { text: '   ', includeFormativeSentence: false } }),
      'accepted'
    );
    const report = copilot.exportReadiness(source);
    expect(report.ok).toBe(false);
    expect(codes(report)).toContain('disclosure-empty');
    expect(copilot.buildFormOutput(source, {}, { now: NOW }).ok).toBe(false);
  });

  it('allows export once every suggestion is decided and something is approved', () => {
    expect(copilot.exportReadiness(decideAll(analyzed(), 'accepted')).ok).toBe(true);
  });
});

describe('walkthrough copilot disclosure', () => {
  it('defaults to naming AI assistance without implying endorsement', () => {
    const line = copilot.disclosureLine(copilot.normalizeDisclosure({}));
    expect(line).toContain('AI assistance');
    expect(line).toContain('reviewed, and approved');
    expect(line.toLowerCase()).not.toContain('verified');
    expect(line.toLowerCase()).not.toContain('agrees');
  });

  it('distinguishes an absent disclosure from one the user cleared', () => {
    // Absent means initialization, so it takes the default.
    expect(copilot.normalizeDisclosure({}).text).toBe(copilot.DEFAULT_DISCLOSURE);
    expect(copilot.normalizeDisclosure(undefined).text).toBe(copilot.DEFAULT_DISCLOSURE);
    // Cleared means deliberate, so it stays cleared and blocks export rather
    // than silently restoring wording the user meant to replace.
    expect(copilot.normalizeDisclosure({ text: '' }).text).toBe('');
    expect(copilot.normalizeDisclosure({ text: '   ' }).text).toBe('');
    expect(copilot.disclosureLine(copilot.normalizeDisclosure({ text: '   ' }))).toBe('');
  });

  it('lets the formative sentence be removed separately without emptying the disclosure', () => {
    const without = copilot.normalizeDisclosure({ includeFormativeSentence: false });
    const line = copilot.disclosureLine(without);
    expect(line).toBe(copilot.DEFAULT_DISCLOSURE);
    expect(line).not.toContain('summative');
  });

  it('travels with every copied field, not just the combined copy', () => {
    const output = copilot.buildFormOutput(decideAll(analyzed(), 'accepted'), fixtures.SAMPLE_FIELD_MAP, { now: NOW });
    expect(output.ok).toBe(true);
    for (const field of output.value.fields) {
      expect(field.text, field.label).toContain('AI assistance');
    }
    expect(output.value.copyAll).toContain('AI assistance');
  });
});

describe('walkthrough copilot mode gate', () => {
  it('opens in demo mode', () => {
    expect(draft().mode).toBe('demo');
    expect(draft().approval).toBeNull();
  });

  it('refuses approved mode without a complete affirmation', () => {
    const partial = copilot.createDraft(
      {
        framework: fixtures.PORTLAND_FRAMEWORK,
        sourceNotes: NOTES,
        mode: 'approved',
        approval: { providerApproved: true, scopeConfirmed: false, affirmedBy: 'Someone' },
      },
      { now: NOW }
    );
    expect(partial.ok).toBe(false);
    expect(codes(partial)).toContain('approval-missing');

    const anonymous = copilot.createDraft(
      {
        framework: fixtures.PORTLAND_FRAMEWORK,
        sourceNotes: NOTES,
        mode: 'approved',
        approval: { providerApproved: true, scopeConfirmed: true },
      },
      { now: NOW }
    );
    expect(codes(anonymous)).toContain('approval-missing');
  });

  it('records who affirmed approved mode', () => {
    const approved = copilot.createDraft(
      {
        framework: fixtures.PORTLAND_FRAMEWORK,
        sourceNotes: NOTES,
        mode: 'approved',
        approval: { providerApproved: true, scopeConfirmed: true, affirmedBy: 'Named approver' },
      },
      { now: NOW }
    );
    expect(approved.ok).toBe(true);
    expect(approved.value.approval.affirmedBy).toBe('Named approver');
    expect(approved.value.approval.affirmedAt).toBe(NOW);
  });

  it('watermarks demo output and removes only the watermark in approved mode', () => {
    const demo = copilot.buildFormOutput(decideAll(analyzed(), 'accepted'), {}, { now: NOW });
    expect(demo.value.watermark).toBe(copilot.DEMO_WATERMARK);
    expect(demo.value.copyAll).toContain('DEMO DRAFT');

    const approvedDraft = decideAll(
      copilot.validateSuggestions(
        draft({ mode: 'approved', approval: { providerApproved: true, scopeConfirmed: true, affirmedBy: 'Named approver' } }),
        fixtures.goodSuggestions(NOTES)
      ).value,
      'accepted'
    );
    const live = copilot.buildFormOutput(approvedDraft, {}, { now: NOW });
    expect(live.value.watermark).toBe('');
    expect(live.value.copyAll).not.toContain('DEMO DRAFT');

    // Approved mode is an authorization statement, not a feature unlock: the
    // analysis and the approved feedback must be identical either way.
    const strip = (value) => value.replace(copilot.DEMO_WATERMARK + '\n', '');
    expect(strip(demo.value.copyAll)).toBe(live.value.copyAll);
  });
});

describe('walkthrough copilot draft and record separation', () => {
  it('omits rejected suggestions from the record', () => {
    let source = analyzed();
    source = copilot.decideSuggestion(source, 's-3b', 'rejected').value;
    source = copilot.decideSuggestion(source, 's-2c', 'accepted').value;
    source = copilot.decideSuggestion(source, 's-3d', 'accepted').value;
    source = copilot.decideSuggestion(source, 's-insufficient', 'rejected').value;

    const output = copilot.buildFormOutput(source, fixtures.SAMPLE_FIELD_MAP, { now: NOW });
    expect(output.ok).toBe(true);
    expect(output.value.copyAll).not.toContain('paragraph 2');
    expect(output.value.copyAll).toContain('Do Now');
  });

  it('omits confidence values, warnings, and raw notes from the exported record', () => {
    const exported = copilot.exportDraft(decideAll(analyzed(), 'accepted'), fixtures.SAMPLE_FIELD_MAP, { now: NOW });
    expect(exported.ok).toBe(true);
    const serialized = JSON.stringify(exported.value);
    expect(serialized).not.toContain('confidence');
    expect(serialized).not.toContain('globalWarnings');
    expect(serialized).not.toContain('sourceNotesOriginal');
    expect(serialized).not.toContain('9:05 entered');
    expect(exported.value.containsDraftArtifacts).toBe(false);
    expect(exported.value.principalApproval.approvedSuggestionIds).toContain('s-2c');
  });

  it('records an insufficient-evidence result in the draft but not in the record', () => {
    const source = decideAll(analyzed(), 'accepted');
    expect(source.suggestions.some((entry) => entry.result === 'insufficient_evidence')).toBe(true);
    const output = copilot.buildFormOutput(source, {}, { now: NOW });
    expect(output.value.copyAll).not.toContain('do not establish');
  });

  it('clears the working draft on teardown', () => {
    const cleared = copilot.clearDraft(decideAll(analyzed(), 'accepted'));
    expect(cleared.ok).toBe(true);
    expect(cleared.value.sourceNotesOriginal).toBe('');
    expect(cleared.value.suggestions).toHaveLength(0);
    expect(cleared.value.cleared).toBe(true);
  });
});

describe('walkthrough copilot form mapping', () => {
  it('maps to configurable field names and marks empty domains', () => {
    const output = copilot.buildFormOutput(decideAll(analyzed(), 'accepted'), fixtures.SAMPLE_FIELD_MAP, { now: NOW });
    expect(output.value.fields.map((field) => field.key)).toEqual([
      'Domain 1 - Planning',
      'Domain 2 - Classroom Environment',
      'Domain 3 - Instruction',
      'Domain 4 - Professional Responsibilities',
    ]);
    const planning = output.value.fields.find((field) => field.domainId === 'd1');
    expect(planning.empty).toBe(true);
    expect(planning.text).toContain('No evidence was recorded');
  });

  it('falls back to domain labels when no field map is supplied', () => {
    const output = copilot.buildFormOutput(decideAll(analyzed(), 'accepted'), {}, { now: NOW });
    expect(output.value.fields[0].key).toBe('Domain 1: Planning and Preparation');
  });

  it('carries the collection type so the record can be identified', () => {
    const source = decideAll(
      copilot.validateSuggestions(draft({ collectionType: 'additional-collection' }), fixtures.goodSuggestions(NOTES)).value,
      'accepted'
    );
    const output = copilot.buildFormOutput(source, {}, { now: NOW });
    expect(output.value.collectionType).toBe('additional-collection');
  });
});

describe('walkthrough copilot synthetic fixtures', () => {
  it('contains no real identifying information', () => {
    const serialized = JSON.stringify({
      notes: fixtures.SAMPLE_NOTES,
      context: fixtures.SAMPLE_CONTEXT,
    });
    expect(serialized).toContain('synthetic');
    expect(serialized).not.toMatch(/@[a-z]+\.(org|com|edu)/i);
  });

  it('rejects notes that are empty or oversized', () => {
    expect(codes(copilot.createDraft({ framework: fixtures.PORTLAND_FRAMEWORK, sourceNotes: '   ' }, { now: NOW })))
      .toContain('notes-empty');
    expect(
      codes(
        copilot.createDraft(
          { framework: fixtures.PORTLAND_FRAMEWORK, sourceNotes: 'x'.repeat(20001) },
          { now: NOW }
        )
      )
    ).toContain('notes-long');
  });
});
