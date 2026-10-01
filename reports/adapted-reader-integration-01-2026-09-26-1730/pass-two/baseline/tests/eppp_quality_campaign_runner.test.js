import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  CAMPAIGN_MODES,
  assertMetricCeilings,
  assertMetricMonotonicity,
  buildRevision,
  cloneJson,
  prepareCampaign,
  validateBank,
  writePairedFiles,
} = require('../dev-tools/eppp_quality_campaign_core.cjs');

const longText = (label) => `${label} ${'This explanation distinguishes the relevant construct from adjacent alternatives using the evidence supplied in the scenario. '.repeat(2)}`.trim();

function makeItem(id, answerIndex, promptSuffix = '') {
  const choices = [
    `${id} response alpha`,
    `${id} response beta`,
    `${id} response gamma`,
    `${id} response delta`,
  ];
  const rationale = longText(`${id} keyed rationale.`);
  return {
    id,
    type: 'single-choice',
    domainId: answerIndex ? 'assessment' : 'intervention',
    difficulty: 'advanced',
    prompt: `A source-reviewed scenario asks for the best distinction involving ${id}${promptSuffix}.`,
    choices,
    answerIndex,
    rationale,
    choiceRationales: choices.map((_choice, index) => (
      index === answerIndex ? rationale : longText(`${id} option ${index} is a neighboring but unsupported interpretation.`)
    )),
    references: [`https://example.test/${id}`],
    sourceDetails: [{
      url: `https://example.test/${id}`,
      title: `Authoritative source record for ${id}`,
      organization: 'Example Professional Research Organization',
      summary: longText(`The source directly documents the construct tested by ${id}.`),
      credibility: longText('This stable fixture represents a reviewed professional or peer-reviewed source record.'),
    }],
    reviewStatus: 'source-reviewed',
    qaStatus: 'qa-passed',
    qaReviewedAt: '2026-07-25',
  };
}

function makeBank() {
  return [
    makeItem('campaign-fixture-a', 0),
    makeItem('campaign-fixture-b', 1),
  ];
}

function feedbackRevision(item) {
  const choiceRationales = item.choiceRationales.map((feedback, index) => (
    index === item.answerIndex
      ? item.rationale
      : longText(`Reviewed feedback for ${item.id} option ${index} identifies its specific misconception.`)
  ));
  return buildRevision(item, {
    mode: CAMPAIGN_MODES.FEEDBACK_ONLY,
    set: {
      choiceRationales,
      optionFeedbackRefinementWave: 'eppp-quality-halving-feedback-01',
      optionFeedbackRefinedAt: '2026-07-25',
      qaReviewedAt: '2026-07-25',
    },
  });
}

const validationOptions = {
  expectedItemCount: 2,
  expectedAnswerPositions: [1, 1, 0, 0],
};

describe('EPPP quality campaign safety core', () => {
  it('rejects duplicate bank IDs and duplicate campaign revision IDs', () => {
    const bank = makeBank();
    expect(() => validateBank([bank[0], cloneJson(bank[0])], validationOptions)).toThrow(/duplicate item id/i);

    const revision = feedbackRevision(bank[0]);
    expect(() => prepareCampaign({
      bank,
      revisions: [revision, cloneJson(revision)],
      validateOptions: validationOptions,
    })).toThrow(/duplicate revision id/i);
  });

  it('fails closed when an item no longer matches its reviewed preimage', () => {
    const bank = makeBank();
    const revision = feedbackRevision(bank[0]);
    const drifted = cloneJson(bank);
    drifted[0].prompt += ' The prompt changed after review.';

    expect(() => prepareCampaign({
      bank: drifted,
      revisions: [revision],
      validateOptions: validationOptions,
    })).toThrow(/preimage drifted/i);
  });

  it('rejects fields that the selected repair mode is not allowed to mutate', () => {
    const item = makeBank()[0];
    expect(() => buildRevision(item, {
      mode: CAMPAIGN_MODES.FEEDBACK_ONLY,
      set: { prompt: 'A feedback-only repair must not replace the prompt.' },
    })).toThrow(/forbidden field.*prompt/i);
  });

  it('recognizes the exact after-state and makes replay idempotent', () => {
    const bank = makeBank();
    const revision = feedbackRevision(bank[0]);
    const first = prepareCampaign({ bank, revisions: [revision], validateOptions: validationOptions });
    const second = prepareCampaign({ bank: first.bank, revisions: [revision], validateOptions: validationOptions });

    expect(first.appliedIds).toEqual([bank[0].id]);
    expect(first.alreadyAppliedIds).toEqual([]);
    expect(second.appliedIds).toEqual([]);
    expect(second.alreadyAppliedIds).toEqual([bank[0].id]);
    expect(second.bank).toEqual(first.bank);
    expect(second.bank.map((item) => item.answerIndex)).toEqual([0, 1]);
  });

  it('rejects metric regression and missed campaign ceilings', () => {
    expect(() => assertMetricMonotonicity(
      { lexical: 141, extreme: 295 },
      { lexical: 142, extreme: 294 },
    )).toThrow(/lexical increased from 141 to 142/i);

    expect(() => assertMetricCeilings(
      { lexical: 71, extreme: 147 },
      { lexical: 70, extreme: 147 },
    )).toThrow(/lexical is 71.*at most 70/i);

    expect(assertMetricMonotonicity(
      { lexical: 141, extreme: 295 },
      { lexical: 70, extreme: 147 },
    )).toMatchObject({
      lexical: { reduction: 71 },
      extreme: { reduction: 148 },
    });
  });

  it('recovers a partial source/deploy transaction using only the matching journal', () => {
    const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'eppp-campaign-core-'));
    const sourcePath = path.join(temporaryRoot, 'source.json');
    const deployPath = path.join(temporaryRoot, 'deploy.json');
    const journalPath = path.join(temporaryRoot, 'paired-write-journal.json');
    const before = '{"version":"before"}\n';
    const after = '{"version":"after"}\n';

    try {
      fs.writeFileSync(sourcePath, before, 'utf8');
      fs.writeFileSync(deployPath, before, 'utf8');
      expect(() => writePairedFiles({
        sourcePath,
        deployPath,
        journalPath,
        contents: after,
        hooks: {
          afterSourceWrite() {
            throw new Error('simulated interruption after source write');
          },
        },
      })).toThrow(/simulated interruption/i);

      expect(fs.readFileSync(sourcePath, 'utf8')).toBe(after);
      expect(fs.readFileSync(deployPath, 'utf8')).toBe(before);
      expect(fs.existsSync(journalPath)).toBe(true);

      const recovery = writePairedFiles({ sourcePath, deployPath, journalPath, contents: after });
      expect(recovery).toMatchObject({ status: 'recovered', recovered: true });
      expect(fs.readFileSync(sourcePath, 'utf8')).toBe(after);
      expect(fs.readFileSync(deployPath, 'utf8')).toBe(after);
      expect(fs.existsSync(journalPath)).toBe(false);
    } finally {
      fs.rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });
});
