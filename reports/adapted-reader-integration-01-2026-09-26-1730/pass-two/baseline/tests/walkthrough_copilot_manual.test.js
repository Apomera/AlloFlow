import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const copilot = require('../walkthrough_copilot_module.js');
const fixtures = require('../walkthrough_copilot_fixtures.js');

const NOW = '2026-09-15T13:00:00.000Z';
const NOTES = fixtures.SAMPLE_NOTES;
const CIRCULATES = '9:14 T circulates, stops at four desks, quiet check-ins.';
const QUESTION = '9:07 T asks "what evidence in paragraph 2 supports that?" waits ~5 sec before calling on anyone.';

function approval(overrides) {
  return Object.assign({ providerApproved: true, scopeConfirmed: true, affirmedBy: 'A. Principal' }, overrides || {});
}

function approvedDraft() {
  const report = copilot.createDraft(
    { framework: fixtures.PORTLAND_FRAMEWORK, sourceNotes: NOTES, mode: 'approved', approval: approval() },
    { now: NOW }
  );
  if (!report.ok) throw new Error(JSON.stringify(report.errors));
  return report.value;
}

function codes(report) {
  return report.errors.map((e) => e.code);
}

describe('walkthrough copilot approval affirmation', () => {
  it('describes what is being affirmed, in the affirmer words not the product', () => {
    const described = copilot.describeApproval();
    expect(described.terms).toHaveLength(2);
    expect(described.requiresName).toBe(true);
    const text = described.terms.map((t) => t.text).join(' ');
    expect(text).toMatch(/approved the AI provider and data flow/i);
    expect(text).toMatch(/how a walkthrough is treated in our evaluation system/i);
  });

  it('states plainly that approval is not remembered and unlocks no capability', () => {
    const described = copilot.describeApproval();
    expect(described.remembered).toBe(false);
    expect(described.note).toMatch(/changes no analysis/i);
    expect(described.note).toMatch(/not remembered after this session/i);
  });

  it('refuses approved mode unless every term is affirmed by a named person', () => {
    for (const missing of [
      { providerApproved: false },
      { scopeConfirmed: false },
      { affirmedBy: '' },
    ]) {
      const report = copilot.createDraft(
        { framework: fixtures.PORTLAND_FRAMEWORK, sourceNotes: NOTES, mode: 'approved', approval: approval(missing) },
        { now: NOW }
      );
      expect(codes(report), JSON.stringify(missing)).toContain('approval-missing');
    }
  });

  it('records who affirmed and when', () => {
    const draft = approvedDraft();
    expect(draft.approval.affirmedBy).toBe('A. Principal');
    expect(draft.approval.affirmedAt).toBe(NOW);
    expect(draft.approval.providerApproved).toBe(true);
    expect(draft.approval.scopeConfirmed).toBe(true);
  });
});

describe('walkthrough copilot manual evidence entry', () => {
  it('locates a quote the observer actually wrote', () => {
    const found = copilot.locateQuote(NOTES, CIRCULATES);
    expect(found.ok).toBe(true);
    expect(NOTES.slice(found.value.start, found.value.end)).toBe(CIRCULATES);
  });

  it('refuses a quote that is not in the notes, however plausible', () => {
    const invented = copilot.locateQuote(NOTES, 'The teacher praised three students by name.');
    expect(invented.ok).toBe(false);
    expect(codes(invented)).toContain('quote-missing');
    expect(codes(copilot.locateQuote(NOTES, '   '))).toContain('quote-empty');
  });

  it('refuses an ambiguous quote rather than guessing which one was meant', () => {
    const repeated = copilot.createDraft(
      { framework: fixtures.PORTLAND_FRAMEWORK, sourceNotes: 'moved on\nsomething else\nmoved on' },
      { now: NOW }
    ).value;
    const report = copilot.locateQuote(repeated.sourceNotesOriginal, 'moved on');
    expect(report.ok).toBe(false);
    expect(codes(report)).toContain('quote-ambiguous');
  });

  it('adds a hand-written claim with a verified citation', () => {
    const report = copilot.addManualSuggestion(approvedDraft(), {
      componentId: '3d',
      quote: CIRCULATES,
      objectiveEvidence: 'The teacher circulated and stopped at four desks for quiet check-ins.',
      interpretation: 'Checking for understanding happened in conversation rather than on paper.',
    });
    expect(report.ok).toBe(true);
    const added = report.value.suggestions[0];
    expect(added.componentId).toBe('3d');
    expect(added.domainId).toBe('d3');
    expect(added.sourceSpans[0].text).toBe(CIRCULATES);
    expect(added.decision).toBe('pending');
  });

  it('holds hand-written claims to the same rules as generated ones', () => {
    const draft = approvedDraft();
    // Unknown component.
    expect(codes(copilot.addManualSuggestion(draft, {
      componentId: 'zz', quote: CIRCULATES, objectiveEvidence: 'Something.',
    }))).toContain('component-unknown');
    // No evidence text.
    expect(codes(copilot.addManualSuggestion(draft, {
      componentId: '3d', quote: CIRCULATES, objectiveEvidence: '   ',
    }))).toContain('evidence-empty');
    // A fabricated quotation cannot be smuggled in by hand either.
    expect(codes(copilot.addManualSuggestion(draft, {
      componentId: '3d', quote: 'the teacher said it would be on the test', objectiveEvidence: 'Stated.',
    }))).toContain('quote-missing');
  });

  it('still warns a human about their own judgment language', () => {
    const report = copilot.addManualSuggestion(approvedDraft(), {
      componentId: '3c',
      quote: CIRCULATES,
      objectiveEvidence: 'Students were engaged throughout the lesson.',
      interpretation: 'Good climate.',
    });
    expect(report.ok).toBe(true);
    const flags = report.value.suggestions[0].warnings.map((w) => w.code);
    expect(flags).toContain('evidence-judgment');
    expect(flags).toContain('generalization-unsupported');
  });

  it('keeps earlier decisions when more evidence is added', () => {
    let draft = copilot.addManualSuggestion(approvedDraft(), {
      componentId: '3d', quote: CIRCULATES, objectiveEvidence: 'The teacher circulated and stopped at four desks.',
    }).value;
    const firstId = draft.suggestions[0].id;
    draft = copilot.decideSuggestion(draft, firstId, 'accepted').value;
    expect(draft.suggestions[0].decision).toBe('accepted');

    draft = copilot.addManualSuggestion(draft, {
      componentId: '3b', quote: QUESTION, objectiveEvidence: 'The teacher asked for text evidence and waited.',
    }).value;

    expect(draft.suggestions).toHaveLength(2);
    const kept = draft.suggestions.find((s) => s.id === firstId);
    expect(kept.decision, 'an earlier decision must not be reset by adding evidence').toBe('accepted');
    expect(draft.suggestions.find((s) => s.id !== firstId).decision).toBe('pending');
  });

  it('refuses a duplicate evidence id rather than overwriting', () => {
    const first = copilot.addManualSuggestion(approvedDraft(), {
      id: 'ev-1', componentId: '3d', quote: CIRCULATES, objectiveEvidence: 'The teacher circulated.',
    }).value;
    const clash = copilot.addManualSuggestion(first, {
      id: 'ev-1', componentId: '3b', quote: QUESTION, objectiveEvidence: 'The teacher asked for evidence.',
    });
    expect(clash.ok).toBe(false);
    expect(codes(clash)).toContain('suggestion-duplicate');
    expect(first.suggestions, 'the original must be untouched').toHaveLength(1);
  });

  it('leaves every existing suggestion object identical when appending', () => {
    // The append path must not rebuild prior entries, which is what used to
    // reset their decisions.
    let draft = copilot.addManualSuggestion(approvedDraft(), {
      componentId: '3d', quote: CIRCULATES, objectiveEvidence: 'The teacher circulated and stopped at four desks.',
    }).value;
    draft = copilot.decideSuggestion(draft, draft.suggestions[0].id, 'edited', 'My own wording.').value;
    const before = JSON.stringify(draft.suggestions[0]);

    const after = copilot.addManualSuggestion(draft, {
      componentId: '3b', quote: QUESTION, objectiveEvidence: 'The teacher asked for text evidence and waited.',
    }).value;

    expect(JSON.stringify(after.suggestions[0])).toBe(before);
    expect(after.suggestions[0].approvedText).toBe('My own wording.');
    expect(after.suggestions[1].decision).toBe('pending');
  });

  it('never alters the frozen notes', () => {
    const draft = approvedDraft();
    const after = copilot.addManualSuggestion(draft, {
      componentId: '3d', quote: CIRCULATES, objectiveEvidence: 'The teacher circulated.',
    }).value;
    expect(after.sourceNotesOriginal).toBe(NOTES);
    expect(draft.suggestions, 'the input draft must not be mutated').toHaveLength(0);
  });

  it('carries hand-written evidence through to the exported record', () => {
    let draft = copilot.addManualSuggestion(approvedDraft(), {
      componentId: '3d',
      quote: CIRCULATES,
      objectiveEvidence: 'The teacher circulated and stopped at four desks for quiet check-ins.',
    }).value;
    draft = copilot.decideSuggestion(draft, draft.suggestions[0].id, 'accepted').value;

    const output = copilot.buildFormOutput(draft, fixtures.SAMPLE_FIELD_MAP, { now: NOW });
    expect(output.ok).toBe(true);
    expect(output.value.copyAll).toContain('stopped at four desks');
    // Approved mode, so no practice watermark.
    expect(output.value.watermark).toBe('');
    expect(output.value.copyAll).not.toContain('DEMO DRAFT');
  });

  it('works with no AI provider and no network at all', () => {
    // The whole point: an approved observation is usable before any provider
    // decision, because the observer writes the evidence themselves.
    const draft = approvedDraft();
    const report = copilot.addManualSuggestion(draft, {
      componentId: '3b', quote: QUESTION, objectiveEvidence: 'The teacher asked for evidence and waited about five seconds.',
    });
    expect(report.ok).toBe(true);
    expect(typeof copilot.addManualSuggestion).toBe('function');
  });
});
