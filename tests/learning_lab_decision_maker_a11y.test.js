import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Decision Maker accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalDecisionMaker(props) {');
  const end = source.indexOf('  function PersonalVocabBuilder(props) {', start);
  const decision = source.slice(start, end);

  it('uses a named creation form with native submit behavior', () => {
    expect(decision).toContain("onSubmit: function(event) { event.preventDefault(); createDecision(); }");
    expect(decision).toContain("'aria-labelledby': 'learning-lab-decision-new-heading'");
    expect(decision).toContain("hh('button', { type: 'submit'");
  });

  it('labels and validates the required decision title', () => {
    expect(decision).toContain("htmlFor: 'learning-lab-decision-new-title'");
    expect(decision).toContain("id: 'learning-lab-decision-new-title', type: 'text'");
    expect(decision).toContain("setTitleError('Enter the decision you want to make.')");
    expect(decision).toContain("id: 'learning-lab-decision-title-error', role: 'alert'");
    expect(decision).toContain("focusById('learning-lab-decision-new-title')");
  });

  it('preserves unrelated section data for create, update, and deletion', () => {
    expect(decision).toContain("setData(Object.assign({}, data, { decisions: [decision].concat(data.decisions || []) }))");
    expect(decision).toContain("setData(Object.assign({}, data, {");
    expect(decision).toContain("setData(Object.assign({}, data, { decisions: (data.decisions || []).filter");
  });

  it('confirms decision, option, and criterion deletion in app dialogs', () => {
    expect(decision).toContain("title: 'Delete this decision?', confirmText: 'Delete decision'");
    expect(decision).toContain("title: 'Delete this option?', confirmText: 'Delete option'");
    expect(decision).toContain("title: 'Delete this criterion?', confirmText: 'Delete criterion'");
    expect(decision).not.toContain('confirm(');
  });

  it('labels option and criterion name inputs', () => {
    expect(decision).toContain("htmlFor: optionId");
    expect(decision).toContain("id: optionId, type: 'text'");
    expect(decision).toContain("'Option ' + (index + 1) + ' name'");
    expect(decision).toContain("htmlFor: criterionId");
    expect(decision).toContain("id: criterionId, type: 'text'");
  });

  it('labels and constrains criterion weights', () => {
    expect(decision).toContain("htmlFor: weightId");
    expect(decision).toContain("id: weightId, type: 'number', min: 1, max: 10, step: 1");
    expect(decision).toContain('Math.max(1, Math.min(10, parseInt(event.target.value, 10) || 1))');
  });

  it('keeps the minimum viable option and criterion structure', () => {
    expect(decision).toContain('disabled: activeDecision.options.length <= 2');
    expect(decision).toContain('disabled: activeDecision.criteria.length <= 1');
    expect(decision).toContain('A decision must keep at least two options.');
    expect(decision).toContain('A decision must keep at least one criterion.');
  });

  it('focuses newly added options and criteria', () => {
    expect(decision).toContain("focusById('learning-lab-decision-option-' + option.id)");
    expect(decision).toContain("focusById('learning-lab-decision-criterion-' + criterion.id)");
  });

  it('removes stale scores when structure is deleted', () => {
    expect(decision).toContain("if (key.indexOf(option.id + '|') !== 0) scores[key]");
    expect(decision).toContain("if (key.slice(-(criterion.id.length + 1)) !== '|' + criterion.id) scores[key]");
  });

  it('uses a captioned scoring table with scoped headers', () => {
    expect(decision).toContain("hh('caption', { style: hiddenLabelStyle }, 'Decision scoring matrix.");
    expect(decision).toContain("scope: 'col'");
    expect(decision).toContain("scope: 'row'");
    expect(decision).toContain('Criterion and weight');
  });

  it('labels and constrains every score input', () => {
    expect(decision).toContain("type: 'number', min: 0, max: 10, step: 1");
    expect(decision).toContain("'aria-label': 'Score ' + option.name + ' on ' + criterion.name + ', from 0 to 10'");
    expect(decision).toContain('Math.max(0, Math.min(10, Number(value) || 0))');
  });

  it('reports winners and ties in text rather than color alone', () => {
    expect(decision).toContain("' has the highest score: '");
    expect(decision).toContain("'Tie for highest score at '");
    expect(decision).toContain("' — highest score'");
  });

  it('announces calculated results in a concise live status', () => {
    expect(decision).toContain("role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'");
    expect(decision).toContain('resultSummary');
  });

  it('avoids reducing an empty options array for winner selection', () => {
    expect(decision).toContain("var totals = namedOptions.map(function(option)");
    expect(decision).toContain("var maximum = totals.length ? Math.max.apply");
    expect(decision).not.toContain('d.options.reduce(function(best');
  });

  it('uses semantic lists for editable and saved decision structures', () => {
    expect(decision).toContain("'aria-labelledby': 'learning-lab-decision-options-heading'");
    expect(decision).toContain("'aria-labelledby': 'learning-lab-decision-criteria-heading'");
    expect(decision).toContain("hh('ul', { 'aria-label': 'Saved decisions'");
  });

  it('moves focus into the editor and back to the saved decision', () => {
    expect(decision).toContain("focusById('learning-lab-decision-editor-heading')");
    expect(decision).toContain("id: 'learning-lab-decision-editor-heading', tabIndex: -1");
    expect(decision).toContain("focusById('learning-lab-decision-open-' + previousId)");
  });

  it('announces creation and structural changes', () => {
    expect(decision).toContain("llAnnounce('Decision created: '");
    expect(decision).toContain("llAnnounce('Decision option added.')");
    expect(decision).toContain("llAnnounce('Decision criterion added.')");
    expect(decision).toContain("llAnnounce('Decision deleted.')");
  });

  it('provides named 44-pixel editing and scoring controls', () => {
    expect(decision).toContain("'aria-label': 'Delete option '");
    expect(decision).toContain("'aria-label': 'Delete criterion '");
    expect(decision).toContain('minWidth: 44, minHeight: 44');
    expect(decision).toContain("width: 64, minHeight: 44");
    expect(decision).toContain("width: '100%', minHeight: 44");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('prismflow-deploy/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
