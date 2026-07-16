import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Strategy Wizard accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalStrategyWizard(props) {');
  const end = source.indexOf('  function PersonalCognitiveLoadMonitor(props) {', start);
  const wizard = source.slice(start, end);

  it('associates the subject and days labels with their controls', () => {
    for (const id of ['learning-lab-strategy-subject', 'learning-lab-strategy-days']) {
      expect(wizard).toContain(`htmlFor: '${id}'`);
      expect(wizard).toContain(`id: '${id}'`);
    }
  });

  it('groups assessment and knowledge choices with exposed selected state', () => {
    expect(wizard.match(/hh\('fieldset'/g)).toHaveLength(2);
    expect(wizard).toContain("}, 'What kind of assessment?')");
    expect(wizard).toContain("}, 'Current knowledge')");
    expect(wizard).toContain("'aria-pressed': form.assessment === a.id");
    expect(wizard).toContain("'aria-pressed': form.prior === p.id");
  });

  it('names icon-only knowledge choices without relying on title', () => {
    expect(wizard).toContain("type: 'button', 'aria-label': p.label");
    expect(wizard).toContain('minWidth: 44, minHeight: 44');
    expect(wizard).not.toContain('title: p.label');
  });

  it('announces generated and saved plans', () => {
    expect(wizard).toContain("llAnnounce('Study strategy plan generated. Recommendations are ready below.')");
    expect(wizard).toContain("llAnnounce('Study strategy plan saved.')");
  });

  it('structures recommendation results as a labelled list', () => {
    expect(wizard).toContain("id: 'learning-lab-strategy-results-title'");
    expect(wizard).toContain("role: 'list', 'aria-labelledby': 'learning-lab-strategy-results-title'");
    expect(wizard).toContain("role: 'listitem'");
  });

  it('confirms deletion and names its 44-pixel control', () => {
    expect(wizard).toContain("'aria-label': 'Delete saved plan: ' + p.subject");
    expect(wizard).toContain("title: 'Delete this saved plan?', confirmText: 'Delete plan'");
    expect(wizard).toContain('minWidth: 44, minHeight: 44');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('prismflow-deploy/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
