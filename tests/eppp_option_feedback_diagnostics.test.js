import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const sourcePath = path.join(root, 'test_prep', 'eppp_option_feedback_diagnostics.json');
const deployPath = path.join(root, 'prismflow-deploy', 'public', 'test_prep', 'eppp_option_feedback_diagnostics.json');

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
});
