import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Self-Compassion accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalSelfCompassion(props) {');
  const end = source.indexOf('  function PersonalProgressDashboard(props) {', start);
  const compassion = source.slice(start, end);

  it('moves focus to the step heading when guided content changes', () => {
    expect(compassion).toContain("document.getElementById('learning-lab-self-compassion-step-heading')");
    expect(compassion).toContain("id: 'learning-lab-self-compassion-step-heading', tabIndex: -1");
    expect(compassion).toContain('focusStepHeading()');
  });

  it('announces each guided step as an atomic region', () => {
    expect(compassion).toContain("'aria-labelledby': 'learning-lab-self-compassion-step-heading'");
    expect(compassion).toContain("'aria-live': 'polite', 'aria-atomic': 'true'");
    expect(compassion).toContain("'Step ' + currentStep + ' of ' + exercise.steps.length");
  });

  it('gives visual progress dots progressbar semantics', () => {
    expect(compassion).toContain("role: 'progressbar'");
    expect(compassion).toContain("'aria-label': exercise.label + ' progress'");
    expect(compassion).toContain("'aria-valuemin': 1, 'aria-valuemax': exercise.steps.length, 'aria-valuenow': currentStep");
    expect(compassion).toContain("'aria-valuetext': 'Step ' + currentStep + ' of ' + exercise.steps.length");
    expect(compassion).toContain("'aria-hidden': 'true'");
  });

  it('provides 44-pixel guided navigation controls', () => {
    expect(compassion).toContain("'← Cancel'");
    expect(compassion).toContain("'← Previous step'");
    expect(compassion).toContain("'Next step →'");
    expect(compassion).toContain("'✓ Finish practice'");
    expect(compassion.match(/minHeight: 44/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it('uses semantic exercise navigation with large targets', () => {
    expect(compassion).toContain("hh('ul', { 'aria-label': 'Self-compassion exercises'");
    expect(compassion).toContain("return hh('li', { key: 'ex-' + exercise.id }");
    expect(compassion).toContain("hh('button', { type: 'button', onClick: function() { openExercise(exercise, 0); }");
    expect(compassion).toContain("minHeight: 110");
  });

  it('uses semantic practice history', () => {
    expect(compassion).toContain("'aria-labelledby': 'learning-lab-self-compassion-history-heading'");
    expect(compassion).toContain("id: 'learning-lab-self-compassion-history-heading'");
    expect(compassion).toContain("return hh('li', { key: 'se-' + session.id");
  });

  it('marks exercise icons as decorative while retaining text names', () => {
    expect(compassion).toContain("'aria-hidden': 'true'");
    expect(compassion).toContain('exercise.label');
  });

  it('announces completed practices', () => {
    expect(compassion).toContain("llAnnounce('Self-compassion practice completed: ' + exercise.label + '.')");
  });

  it('preserves unrelated section data when logging sessions', () => {
    expect(compassion).toContain("setData(Object.assign({}, data, { sessions:");
    expect(compassion).not.toContain("setData({ sessions:");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('prismflow-deploy/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
