import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const sourcePath = path.join(root, 'test_prep', 'eppp_option_feedback_diagnostics.json');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_option_feedback_diagnostics.json');

describe('EPPP incorrect-option feedback diagnostics', () => {
  it('mirrors a complete, warning-only all-bank audit', () => {
    const sourceText = fs.readFileSync(sourcePath, 'utf8');
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(sourceText);
    const report = JSON.parse(sourceText);
    expect(report.warningOnly).toBe(true);
    expect(report.summary.totalItems).toBe(1500);
    expect(report.summary.totalIncorrectOptions).toBe(4500);
    expect(report.summary.itemsWithWarnings).toBeGreaterThan(0);
    expect(report.summary.priorityDocketItems).toBe(100);
    expect(report.criteria.limitation).toMatch(/cannot prove conceptual accuracy/i);
    expect(report.currentWave).toEqual(report.waves['eppp-native-quality-wave-05']);
    expect(report.previousWave).toEqual(report.waves['eppp-native-quality-wave-06']);
    expect(report.latestWave).toEqual(report.waves['eppp-option-feedback-wave-07']);
    expect(report.activeWave).toEqual(report.waves['eppp-option-feedback-wave-08']);
    expect(report.mostRecentWave).toEqual(report.waves['eppp-option-feedback-wave-11']);
    expect(report.latestReviewWave).toBe('eppp-option-feedback-wave-11');
    expect(report.summary).toMatchObject({
      itemsWithWarnings: 1357,
      incorrectOptionsWithWarnings: 3924,
      insufficientDetailOptions: 1425,
      genericTemplateOptions: 2420,
      choiceRestatementOptions: 1722,
      fullKeyEchoOptions: 1489,
      wave10IncorrectOptions: 48,
      wave10OptionsWithWarnings: 0,
      wave11IncorrectOptions: 48,
      wave11OptionsWithWarnings: 0,
    });
  });

  it('confirms all 24 wave-05 incorrect explanations clear the feedback heuristics', () => {
    const report = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    const wave = report.waves['eppp-native-quality-wave-05'];
    expect(wave.ids).toHaveLength(8);
    expect(wave.status).toBe('pass');
    expect(wave.findings).toEqual([]);
    expect(wave.incorrectOptions).toBe(24);
    expect(wave.optionsWithWarnings).toBe(0);
  });

  it('confirms all 48 wave-10 incorrect explanations clear the feedback heuristics', () => {
    const report = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    const wave = report.waves['eppp-option-feedback-wave-10'];
    expect(wave.ids).toHaveLength(16);
    expect(wave.status).toBe('pass');
    expect(wave.findings).toEqual([]);
    expect(wave.incorrectOptions).toBe(48);
    expect(wave.optionsWithWarnings).toBe(0);
  });

  it('confirms all 48 wave-11 incorrect explanations clear the feedback heuristics', () => {
    const report = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    const wave = report.waves['eppp-option-feedback-wave-11'];
    expect(wave.ids).toHaveLength(16);
    expect(wave.status).toBe('pass');
    expect(wave.findings).toEqual([]);
    expect(wave.incorrectOptions).toBe(48);
    expect(wave.optionsWithWarnings).toBe(0);
  });
});
