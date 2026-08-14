import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const copilot = require('../walkthrough_copilot_module.js');
const fixtures = require('../walkthrough_copilot_fixtures.js');
const scenarios = require('../walkthrough_copilot_scenarios.js');

const NOW = '2026-09-15T13:00:00.000Z';

function draftFor(scenario) {
  const report = copilot.createDraft(
    { framework: fixtures.PORTLAND_FRAMEWORK, sourceNotes: scenario.notes },
    { now: NOW }
  );
  if (!report.ok) throw new Error(scenario.id + ' draft failed: ' + JSON.stringify(report.errors));
  return report.value;
}

function analyzedFor(scenario) {
  const report = copilot.validateSuggestions(draftFor(scenario), scenario.candidates);
  if (!report.ok) throw new Error(scenario.id + ' candidates failed: ' + JSON.stringify(report.errors));
  return report.value;
}

function decide(source, decisions) {
  return source.suggestions.reduce((current, suggestion) => {
    const decision = decisions[suggestion.id] || 'rejected';
    const report = copilot.decideSuggestion(current, suggestion.id, decision, 'Approved text.');
    if (!report.ok) throw new Error('decision failed: ' + JSON.stringify(report.errors));
    return report.value;
  }, source);
}

function keepOnly(source, ids) {
  const decisions = {};
  source.suggestions.forEach((suggestion) => {
    decisions[suggestion.id] = ids.includes(suggestion.id) ? 'accepted' : 'rejected';
  });
  return decide(source, decisions);
}

// The reading the scenario author considers defensible, expressed as the set of
// candidate ids a careful observer would keep.
function referenceKeepIds(scenario) {
  const ids = [];
  scenario.candidates.forEach((candidate) => {
    if (candidate.result === 'insufficient_evidence') {
      if (scenario.reference.expectInsufficient) ids.push(candidate.id);
      return;
    }
    const supported = scenario.reference.support.includes(candidate.componentId);
    if (!supported) return;
    const pair = scenario.reference.preferBetweenPair;
    if (pair && pair.componentId === candidate.componentId && candidate.id !== pair.prefer) return;
    ids.push(candidate.id);
  });
  return ids;
}

describe('walkthrough copilot practice scenarios', () => {
  it('offers a scenario for each distinct habit, with no duplicate ids', () => {
    const list = scenarios.listScenarios();
    expect(list.length).toBeGreaterThanOrEqual(5);
    expect(new Set(list.map((entry) => entry.id)).size).toBe(list.length);
    for (const entry of list) {
      expect(entry.title, entry.id).toBeTruthy();
      expect(entry.teaches, entry.id).toBeTruthy();
      expect(entry.setting, entry.id).toBeTruthy();
    }
  });

  it('runs every scenario through the real validators with no provider', () => {
    for (const meta of scenarios.listScenarios()) {
      const scenario = scenarios.getScenario(meta.id);
      const report = copilot.validateSuggestions(draftFor(scenario), scenario.candidates);
      expect(report.ok, meta.id + ' candidates should be well-formed').toBe(true);
      expect(report.value.suggestions.length, meta.id).toBeGreaterThan(0);
    }
  });

  it('cites every candidate span exactly against the scenario notes', () => {
    for (const meta of scenarios.listScenarios()) {
      const scenario = scenarios.getScenario(meta.id);
      for (const candidate of scenario.candidates) {
        for (const span of candidate.sourceSpans || []) {
          expect(scenario.notes.slice(span.start, span.end), meta.id + '/' + candidate.id).toBe(span.text);
        }
      }
    }
  });

  it('returns an independent copy so a learner attempt cannot corrupt the scenario', () => {
    const first = scenarios.getScenario('thin-notes');
    first.notes = 'mutated';
    first.candidates.length = 0;
    const second = scenarios.getScenario('thin-notes');
    expect(second.notes).not.toBe('mutated');
    expect(second.candidates.length).toBeGreaterThan(0);
  });

  it('does not reference any real person, school, or contact detail', () => {
    const serialized = JSON.stringify(scenarios.scenarioIds.map((id) => scenarios.getScenario(id)));
    expect(serialized).not.toMatch(/@[a-z0-9-]+\.(org|com|edu|net)/i);
    expect(serialized).not.toMatch(/\bKing Middle\b/i);
    expect(serialized).not.toMatch(/\bPortland\b/i);
    expect(serialized).not.toMatch(/\bNauhaus\b/i);
  });
});

describe('walkthrough copilot scenario traps', () => {
  it('each scenario contains a candidate the validators actually flag', () => {
    // A practice scenario with nothing to catch teaches nothing.
    for (const meta of scenarios.listScenarios()) {
      const scenario = scenarios.getScenario(meta.id);
      const report = copilot.validateSuggestions(draftFor(scenario), scenario.candidates);
      expect(report.warnings.length, meta.id + ' should surface at least one warning').toBeGreaterThan(0);
    }
  });

  it('flags the generalization trap where one student becomes the class', () => {
    const scenario = scenarios.getScenario('one-student-generalization');
    const report = copilot.validateSuggestions(draftFor(scenario), scenario.candidates);
    const codes = report.warnings.map((entry) => entry.code);
    expect(codes).toContain('generalization-unsupported');
    expect(codes).toContain('evidence-judgment');
  });

  it('flags judgment language carried forward from the observer own notes', () => {
    const scenario = scenarios.getScenario('judgment-in-notes');
    const report = copilot.validateSuggestions(draftFor(scenario), scenario.candidates);
    expect(report.warnings.map((entry) => entry.code)).toContain('evidence-judgment');
  });

  it('offers the thin-notes scenario an explicit insufficient-evidence route', () => {
    const scenario = scenarios.getScenario('thin-notes');
    expect(scenario.candidates.some((candidate) => candidate.result === 'insufficient_evidence')).toBe(true);
    expect(scenario.reference.expectInsufficient).toBe(true);
  });

  it('pairs a grounded candidate against a conclusion-quoting one where that is the lesson', () => {
    for (const id of ['judgment-in-notes', 'contradiction']) {
      const scenario = scenarios.getScenario(id);
      const pair = scenario.reference.preferBetweenPair;
      expect(pair, id + ' should teach a preference between two candidates').toBeTruthy();
      const ids = scenario.candidates.map((candidate) => candidate.id);
      expect(ids).toContain(pair.prefer);
      expect(ids).toContain(pair.over);
    }
  });
});

describe('walkthrough copilot reference comparison', () => {
  it('reports agreement when the learner matches the reference reading', () => {
    for (const meta of scenarios.listScenarios()) {
      const scenario = scenarios.getScenario(meta.id);
      const attempt = keepOnly(analyzedFor(scenario), referenceKeepIds(scenario));
      const report = copilot.compareToReference(scenario, attempt);
      expect(report.ok, meta.id).toBe(true);
      expect(report.value.divergences, meta.id + ' should fully agree').toHaveLength(0);
      expect(report.value.agreements.length, meta.id).toBeGreaterThan(0);
    }
  });

  it('names the divergence when the learner keeps something the reference declines', () => {
    const scenario = scenarios.getScenario('one-student-generalization');
    const attempt = keepOnly(analyzedFor(scenario), ['gen-c1', 'gen-c2']);
    const report = copilot.compareToReference(scenario, attempt);
    expect(report.ok).toBe(true);
    const kinds = report.value.divergences.map((entry) => entry.kind);
    expect(kinds).toContain('you-kept-reference-did-not');
    expect(report.value.divergences.find((entry) => entry.kind === 'you-kept-reference-did-not').componentId).toBe('3c');
  });

  it('names the divergence when the learner drops something the reference keeps', () => {
    const scenario = scenarios.getScenario('one-student-generalization');
    const attempt = keepOnly(analyzedFor(scenario), ['gen-c1']);
    const report = copilot.compareToReference(scenario, attempt);
    expect(report.value.divergences.map((entry) => entry.kind)).toContain('reference-kept-you-did-not');
  });

  it('notices when the honest answer was that the notes establish little', () => {
    const scenario = scenarios.getScenario('thin-notes');
    const attempt = keepOnly(analyzedFor(scenario), ['thin-c1']);
    const report = copilot.compareToReference(scenario, attempt);
    expect(report.value.divergences.map((entry) => entry.kind)).toContain('insufficient-not-declared');
  });

  it('prefers the candidate that quotes an action over the one that quotes a conclusion', () => {
    const scenario = scenarios.getScenario('judgment-in-notes');
    const weaker = keepOnly(analyzedFor(scenario), ['judg-c1', 'judg-c3']);
    const weakerReport = copilot.compareToReference(scenario, weaker);
    expect(weakerReport.value.divergences.map((entry) => entry.kind)).toContain('weaker-of-pair');

    const stronger = keepOnly(analyzedFor(scenario), ['judg-c2', 'judg-c3']);
    const strongerReport = copilot.compareToReference(scenario, stronger);
    expect(strongerReport.value.divergences.map((entry) => entry.kind)).not.toContain('weaker-of-pair');
  });

  it('refuses to compare while suggestions are still undecided', () => {
    const scenario = scenarios.getScenario('contradiction');
    const report = copilot.compareToReference(scenario, analyzedFor(scenario));
    expect(report.ok).toBe(false);
    expect(report.errors.map((entry) => entry.code)).toContain('decisions-pending');
  });
});

describe('walkthrough copilot practice integrity claims', () => {
  it('produces no score, percentage, or pass mark', () => {
    const scenario = scenarios.getScenario('contradiction');
    const attempt = keepOnly(analyzedFor(scenario), referenceKeepIds(scenario));
    const report = copilot.compareToReference(scenario, attempt);
    const serialized = JSON.stringify(report.value).toLowerCase();
    for (const banned of ['score', 'percent', 'passed', 'failed', 'grade', 'rating', 'correct']) {
      expect(serialized, 'practice output should not contain "' + banned + '"').not.toContain(banned);
    }
  });

  it('marks results self-reported and explicitly not a calibration instrument', () => {
    const scenario = scenarios.getScenario('thin-notes');
    const attempt = keepOnly(analyzedFor(scenario), referenceKeepIds(scenario));
    const report = copilot.compareToReference(scenario, attempt);
    expect(report.value.selfReported).toBe(true);
    expect(report.value.isCalibration).toBe(false);
    expect(report.value.trustModel).toBe('learner-device-unverified');
    expect(report.value.disclaimer).toMatch(/not an answer key/i);
  });

  it('states plainly that the reference is one defensible reading', () => {
    expect(scenarios.DISCLAIMER).toMatch(/one defensible reading/i);
    expect(scenarios.DISCLAIMER).toMatch(/not a calibration instrument/i);
    expect(scenarios.DISCLAIMER).toMatch(/inter-rater reliability/i);
  });

  it('carries discussion prompts rather than verdicts', () => {
    for (const meta of scenarios.listScenarios()) {
      const scenario = scenarios.getScenario(meta.id);
      expect(scenario.discussion.length, meta.id).toBeGreaterThanOrEqual(2);
      for (const prompt of scenario.discussion) {
        expect(prompt.trim().length, meta.id).toBeGreaterThan(10);
      }
    }
  });
});
