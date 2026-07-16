import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Weekly Reflection accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalWeeklyReflection(props) {');
  const end = source.indexOf('  function PersonalStrategyWizard(props) {', start);
  const reflection = source.slice(start, end);

  it('associates the overall-week label with its range control', () => {
    expect(reflection).toContain("htmlFor: 'learning-lab-reflection-overall'");
    expect(reflection).toContain("id: 'learning-lab-reflection-overall', type: 'range'");
    expect(reflection).toContain("'aria-valuetext': form.overall + ' out of 10'");
    expect(reflection).toContain("style: { width: '100%', minHeight: 44");
  });

  it('associates every reflection prompt and help text with its textarea', () => {
    expect(reflection).toContain("htmlFor: 'learning-lab-reflection-' + p.id");
    expect(reflection).toContain("id: 'learning-lab-reflection-help-' + p.id");
    expect(reflection).toContain("id: 'learning-lab-reflection-' + p.id");
    expect(reflection).toContain("'aria-describedby': 'learning-lab-reflection-help-' + p.id");
  });

  it('uses headings for saved prompt-response sections', () => {
    expect(reflection).toContain("hh('h3', { style:");
    expect(reflection).toContain("}, p.icon + ' ' + p.label)");
  });

  it('uses an accessible confirmation for reflection deletion', () => {
    expect(reflection).toContain("title: 'Delete this reflection?', confirmText: 'Delete reflection'");
    expect(reflection).toContain("'bad', { minHeight: 44 }");
    expect(reflection).not.toContain("confirm('Delete this reflection?')");
  });

  it('gives the current-week action a descriptive name and target size', () => {
    expect(reflection).toContain("tkBtn('View this week\\'s reflection'");
    expect(reflection).toContain("{ minHeight: 44, padding: '8px 12px', fontSize: 10 }");
  });

  it('keeps history controls native buttons and statistic icons decorative', () => {
    expect(reflection).toContain("key: 'h-' + e.id, type: 'button'");
    expect(reflection).toContain("'aria-hidden': 'true', style: { fontSize: 14");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('prismflow-deploy/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
