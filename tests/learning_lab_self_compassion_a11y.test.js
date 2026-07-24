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

  it('frames every reflection as optional, non-clinical, and stoppable', () => {
    expect(compassion).toContain('Use, adapt, or skip any prompt.');
    expect(compassion).toContain('not therapy, diagnosis, or emergency support');
    expect(compassion).toContain('Skip any prompt, keep your eyes open, remain still, or stop at any time.');
    expect(compassion).toContain('Touch, speaking aloud, and writing are all optional.');
  });

  it('provides privacy and data-use guidance for sensitive history', () => {
    expect(compassion).toContain('Saved history can reveal emotional or mental-health information.');
    expect(compassion).toContain('does not itself notify a teacher, school, counselor, clinician, or family member');
    expect(compassion).toContain('delete entries you no longer want stored');
  });

  it('qualifies research rather than promising a benefit', () => {
    expect(compassion).toContain('Later intervention reviews report possible benefits for some outcomes');
    expect(compassion).toContain('study heterogeneity, high risk of bias, and comparisons with passive controls');
    expect(compassion).toContain('do not promise an outcome');
    expect(compassion).not.toContain('correlates strongly with well-being and motivation');
    expect(compassion).not.toContain('Three guided exercises based on Neff (2003)');
  });

  it('moves focus to changed steps and exposes atomic progress', () => {
    expect(compassion).toContain("focusTargetRef.current = 'learning-lab-self-compassion-step-heading'");
    expect(compassion).toContain("id: 'learning-lab-self-compassion-step-heading', tabIndex: -1");
    expect(compassion).toContain("'aria-live': 'polite', 'aria-atomic': 'true'");
    expect(compassion).toContain("role: 'progressbar'");
    expect(compassion).toContain("'aria-valuetext': 'Step ' + currentStep + ' of ' + exercise.steps.length");
  });

  it('requires an explicit choice before adding personal history', () => {
    expect(compassion).toContain("'Finish without saving'");
    expect(compassion).toContain("'Save to personal history'");
    expect(compassion).toContain('function savePractice(exercise)');
    expect(compassion).toContain("llAnnounce('Practice history entry saved: '");
    expect(compassion).not.toContain('Self-compassion practice completed:');
  });

  it('restores focus after stopping, saving, and deletion', () => {
    expect(compassion).toContain("focusTargetRef.current = 'learning-lab-self-compassion-start-' + exerciseId");
    expect(compassion).toContain("focusTargetRef.current = 'learning-lab-self-compassion-session-heading-' + id");
    expect(compassion).toContain("focusTargetRef.current = 'learning-lab-self-compassion-history-heading'");
    expect(compassion).toContain('R.useLayoutEffect(function()');
  });

  it('renders all history with semantic articles and robust dates', () => {
    expect(compassion).toContain("'aria-label': 'All personal self-compassion history entries'");
    expect(compassion).toContain('sessions.map(function(session, index)');
    expect(compassion).not.toContain('sessions.slice(0, 15)');
    expect(compassion).toContain("hh('article', { 'aria-labelledby': headingId }");
    expect(compassion).toContain("hh('time', { dateTime: date.dateTime }");
    expect(compassion).toContain("'Date not recorded'");
  });

  it('supports deletion of legacy history records and preserves siblings', () => {
    expect(compassion).toContain('sessions.filter(function(item) { return item !== session; })');
    expect(compassion).toContain("title: 'Delete this practice history entry?', confirmText: 'Delete entry'");
    expect(compassion).toContain('setData(Object.assign({}, data, { sessions:');
    expect(compassion).not.toContain('setData({ sessions:');
  });

  it('uses named 44-pixel exercise and history controls', () => {
    expect(compassion).toContain("'aria-label': 'Start ' + exercise.label");
    expect(compassion).toContain("'aria-label': 'Delete self-compassion history entry: ' + label");
    expect(compassion.match(/minHeight: 44/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('updates the catalog without presenting a research citation as a promise', () => {
    expect(source).toContain("desc: 'Optional RAIN + supportive reflection prompts'");
    expect(source).toContain("'Optional RAIN, supportive coach, and self-kindness reflection prompts.'");
    expect(source).not.toContain('Self-Compassion Break (Neff 2003)');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
