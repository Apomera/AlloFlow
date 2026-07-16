import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Motivation Audit accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalMotivationAudit(props) {');
  const end = source.indexOf('  function PersonalLearningProfile(props) {', start);
  const audit = source.slice(start, end);

  it('associates the required activity field and reports errors inline', () => {
    expect(audit).toContain("htmlFor: 'learning-lab-motivation-activity'");
    expect(audit).toContain("id: 'learning-lab-motivation-activity', type: 'text', value: form.activity, required: true");
    expect(audit).toContain("id: 'learning-lab-motivation-error', role: 'alert'");
    expect(audit).toContain("document.getElementById('learning-lab-motivation-activity')");
    expect(audit).not.toContain("alert('Need an activity name.')");
  });

  it('associates each motivation slider with its label and help text', () => {
    expect(audit).toContain("htmlFor: 'learning-lab-motivation-' + dim.id");
    expect(audit).toContain("id: 'learning-lab-motivation-help-' + dim.id");
    expect(audit).toContain("id: 'learning-lab-motivation-' + dim.id, type: 'range'");
    expect(audit).toContain("'aria-describedby': 'learning-lab-motivation-help-' + dim.id");
    expect(audit).toContain("'aria-valuetext': form[dim.id] + ' out of 10'");
  });

  it('associates the notes label and announces saved audits', () => {
    expect(audit).toContain("htmlFor: 'learning-lab-motivation-notes'");
    expect(audit).toContain("id: 'learning-lab-motivation-notes'");
    expect(audit).toContain("llAnnounce('Motivation audit saved.')");
  });

  it('structures the adaptive recommendation as a labelled section', () => {
    expect(audit).toContain("hh('section', { 'aria-labelledby': 'learning-lab-motivation-suggestion-title'");
    expect(audit).toContain("hh('h3', { id: 'learning-lab-motivation-suggestion-title'");
  });

  it('expands abbreviated history values for assistive technology', () => {
    expect(audit).toContain("role: 'img', 'aria-label': 'Autonomy ' + a.autonomy");
    expect(audit).toContain("', competence ' + a.competence");
    expect(audit).toContain("', relatedness ' + a.relatedness");
  });

  it('confirms deletion and names its 44-pixel control', () => {
    expect(audit).toContain("'aria-label': 'Delete motivation audit: ' + a.activity");
    expect(audit).toContain("title: 'Delete this motivation audit?', confirmText: 'Delete audit'");
    expect(audit).toContain('minWidth: 44, minHeight: 44');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('prismflow-deploy/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
