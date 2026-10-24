import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const root = process.cwd();
const sourceBank = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'eppp_native_items.json'), 'utf8'));
const deployBank = JSON.parse(fs.readFileSync(path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_native_items.json'), 'utf8'));
const targetId = 'eppp-b006-biological-2';
// Question-quality wave 34 deliberately re-authored this wave-03 item as an advanced analysis
// item with the same key; its recorded preimage is the wave-03 glial-function prompt.
const wave34 = require('../dev-tools/eppp_native_quality_wave_34_data.cjs');

describe('EPPP distractor quality wave 03', () => {
  it('replaces the reported neuron-word giveaway with an application-level glial-function item', () => {
    const item = sourceBank.find((candidate) => candidate.id === targetId);
    const revision = wave34.revisions.find((candidate) => candidate.id === targetId);
    expect(item).toBeTruthy();
    expect(revision.expectedPrompt).toContain('central nervous system injury');
    expect(revision.expectedDifficulty).toBe('intermediate');
    expect(item.wordingReviewWave).toBe(wave34.reviewWave);
    expect(item.prompt).toBe(revision.prompt);
    expect(item.prompt).toMatch(/\bCNS injury\b/);
    expect(item.prompt).not.toMatch(/which cell is a neuron/i);
    expect(item.answerIndex).toBe(3);
    expect(revision.expectedAnswerIndex).toBe(3);
    expect(item.difficulty).toBe(revision.targetDifficulty);
    expect(['application', 'analysis']).toContain(item.cognitiveProcess);
    expect(item.learningObjectiveId).toMatch(/glial/);
    expect(item.choices).toHaveLength(4);
    expect(item.choices.every((choice) => !/\b(?:all|none) of the above\b/i.test(choice))).toBe(true);
    expect(item.choiceRationales).toHaveLength(4);
    expect(item.choiceRationales.every((feedback) => feedback.length >= 80)).toBe(true);
  });

  it('keeps full named sources and the deploy bank synchronized', () => {
    const sourceItem = sourceBank.find((candidate) => candidate.id === targetId);
    const deployItem = deployBank.find((candidate) => candidate.id === targetId);
    expect(deployItem).toEqual(sourceItem);
    expect(sourceItem.references).toHaveLength(2);
    expect(sourceItem.sourceDetails).toHaveLength(2);
    expect(sourceItem.sourceDetails.every((detail) => detail.title.length >= 12 && detail.organization && detail.credibility.length >= 80)).toBe(true);
  });

  it('preserves the 1,500-item bank and exact overall answer balance', () => {
    expect(sourceBank).toHaveLength(1500);
    expect([0, 1, 2, 3].map((position) => sourceBank.filter((item) => item.answerIndex === position).length)).toEqual([375, 375, 375, 375]);
  });
});
