import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Study Planner accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalStudyPlanner(props) {');
  const end = source.indexOf('  function PersonalExamPrep(props) {', start);
  const planner = source.slice(start, end);

  it('uses the accessible form dialog for new subjects with inline duplicate validation', () => {
    expect(planner).toContain('var values = await askLearningLabForm({');
    expect(planner).toContain("fields: [{ name: 'name', label: 'Subject name', required: true, maxLength: 60 }]");
    expect(planner).toContain('That subject is already in the planner.');
    expect(planner).not.toContain("prompt('Subject name?')");
  });

  it('groups day and subject choices and exposes their selected state', () => {
    expect(planner.match(/hh\('fieldset'/g)).toHaveLength(2);
    expect(planner).toContain("hh('legend', { style:");
    expect(planner).toContain("}, 'Day of week')");
    expect(planner).toContain("}, 'Subject')");
    expect(planner).toContain("'aria-pressed': form.day === i");
    expect(planner).toContain("'aria-pressed': form.subject === s");
  });

  it('associates visible labels with the time, duration, and task controls', () => {
    for (const id of ['learning-lab-study-start-time', 'learning-lab-study-duration', 'learning-lab-study-task']) {
      expect(planner).toContain(`htmlFor: '${id}'`);
      expect(planner).toContain(`id: '${id}'`);
    }
  });

  it('provides generous targets for planner form controls', () => {
    expect(planner.match(/minHeight: 44/g)?.length).toBeGreaterThanOrEqual(5);
    expect(planner).toContain("key: 'd-' + i, type: 'button'");
    expect(planner).toContain("key: 'su-' + s, type: 'button'");
  });

  it('makes study-block removal keyboard accessible and app-confirmed', () => {
    expect(planner).toContain("'aria-label': 'Remove ' + firstHere.subject + ' study block on '");
    expect(planner).toContain("title: 'Remove this study block?', confirmText: 'Remove block'");
    expect(planner).toContain('minWidth: 24, minHeight: 24');
    expect(planner).not.toContain("confirm('Remove this block?')");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('prismflow-deploy/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
