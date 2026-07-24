import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const sourceBank = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'eppp_native_items.json'), 'utf8'));
const deployBank = JSON.parse(fs.readFileSync(path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_native_items.json'), 'utf8'));
const targetId = 'eppp-b006-biological-2';

describe('EPPP distractor quality wave 03', () => {
  it('replaces the reported neuron-word giveaway with an application-level glial-function item', () => {
    const item = sourceBank.find((candidate) => candidate.id === targetId);
    expect(item).toBeTruthy();
    expect(item.prompt).toContain('central nervous system injury');
    expect(item.prompt).not.toMatch(/which cell is a neuron/i);
    expect(item.answerIndex).toBe(3);
    expect(item.difficulty).toBe('intermediate');
    expect(item.cognitiveProcess).toBe('application');
    expect(item.learningObjectiveId).toBe('biological-glial-function-discrimination');
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
