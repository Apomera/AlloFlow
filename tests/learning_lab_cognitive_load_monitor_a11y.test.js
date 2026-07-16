import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Cognitive Load Monitor accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalCognitiveLoadMonitor(props) {');
  const end = source.indexOf('  function PersonalMotivationAudit(props) {', start);
  const monitor = source.slice(start, end);

  it('associates each load slider with its label and help text', () => {
    expect(monitor).toContain("htmlFor: 'learning-lab-load-' + s.id");
    expect(monitor).toContain("id: 'learning-lab-load-help-' + s.id");
    expect(monitor).toContain("id: 'learning-lab-load-' + s.id, type: 'range'");
    expect(monitor).toContain("'aria-describedby': 'learning-lab-load-help-' + s.id");
    expect(monitor).toContain("'aria-valuetext': form[s.id] + ' out of 10'");
  });

  it('groups trigger choices and exposes their selected state', () => {
    expect(monitor).toContain("hh('fieldset', { style:");
    expect(monitor).toContain("hh('legend', { style:");
    expect(monitor).toContain("type: 'button', 'aria-pressed': on");
    expect(monitor).toContain('style: { minHeight: 44');
  });

  it('associates the notes label with its textarea', () => {
    expect(monitor).toContain("htmlFor: 'learning-lab-load-notes'");
    expect(monitor).toContain("id: 'learning-lab-load-notes'");
  });

  it('announces a saved check-in', () => {
    expect(monitor).toContain("llAnnounce('Cognitive load check-in saved.')");
  });

  it('provides an accessible seven-day trend summary', () => {
    expect(monitor).toContain("role: 'img', 'aria-label': 'Last 7 days cognitive load: '");
    expect(monitor).toContain("key: 'd-' + d.date, 'aria-hidden': 'true'");
  });

  it('labels history values and safely confirms deletion', () => {
    expect(monitor).toContain("'aria-label': 'Intrinsic ' + e.intrinsic");
    expect(monitor).toContain("'aria-label': 'Delete cognitive load check-in from ' + e.date");
    expect(monitor).toContain("title: 'Delete this check-in?', confirmText: 'Delete check-in'");
    expect(monitor).toContain('minWidth: 44, minHeight: 44');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('prismflow-deploy/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
