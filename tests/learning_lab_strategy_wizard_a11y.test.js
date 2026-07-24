import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Strategy Wizard revised accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalStrategyWizard(props) {');
  const end = source.indexOf('  function PersonalCognitiveLoadMonitor(props) {', start);
  const wizard = source.slice(start, end);

  it('uses stable headings and effect-based focus restoration', () => {
    for (const id of ['learning-lab-strategy-heading', 'learning-lab-strategy-form-heading', 'learning-lab-strategy-results-title', 'learning-lab-strategy-saved-heading']) expect(wizard).toContain("'" + id + "'");
    expect(wizard).toContain('document.getElementById(focusTarget)');
  });

  it('uses a named native form with bounded, labelled controls', () => {
    expect(wizard).toContain("hh('form', { 'aria-labelledby': 'learning-lab-strategy-form-heading', onSubmit: generate }");
    expect(wizard).toContain("id: 'learning-lab-strategy-subject', type: 'text', value: form.subject, maxLength: 240");
    expect(wizard).toContain("id: 'learning-lab-strategy-days', type: 'number', min: 1, max: 60, required: true");
    expect(wizard).toContain("type: 'submit', 'data-ll-focusable': true");
    expect(wizard.match(/hh\('fieldset'/g)).toHaveLength(2);
  });

  it('provides inline day validation, announcement, and error focus', () => {
    expect(wizard).toContain("setFormError('Enter a number of days from 1 to 60.')");
    expect(wizard).toContain("id: 'learning-lab-strategy-days-error', role: 'alert'");
    expect(wizard).toContain("setFocusTarget('learning-lab-strategy-days')");
    expect(wizard).toContain("llAnnounce('Days until the assessment must be from 1 to 60.')");
  });

  it('uses non-stigmatizing visible familiarity labels and selected states', () => {
    for (const label of ['New to this', 'Some familiarity', 'Working knowledge', 'Strong familiarity']) expect(wizard).toContain(label);
    expect(wizard).not.toContain("label: 'No clue'");
    expect(wizard).toContain("'aria-pressed': selected");
    expect(wizard).toContain("hh('span', { 'aria-hidden': 'true' }, option.icon + ' ')");
  });

  it('invalidates stale results when an input changes', () => {
    expect(wizard).toContain('function updateForm(patch)');
    expect(wizard).toContain('setResult(null)');
    expect(wizard).toContain('setResultSaved(false)');
  });

  it('describes the output as a non-validated heuristic rather than personalization', () => {
    expect(wizard).toContain('simple, non-validated match heuristic');
    expect(wizard).toContain('not a prediction that a strategy will work for you');
    expect(wizard).toContain("'Heuristic match: ' + strategy.match + ' out of 10'");
    expect(wizard).not.toContain("'fit: ' + s.fit");
  });

  it('uses semantic context and recommendation lists without dimming lower ranks', () => {
    expect(wizard).toContain("hh('dl', { 'aria-label': 'Inputs used for this comparison'");
    expect(wizard).toContain("hh('ol', { 'aria-describedby': 'learning-lab-strategy-results-help'");
    expect(wizard).toContain("return hh('li', { key: 'rec-' + strategy.id");
    expect(wizard).not.toContain('opacity: rank > 6 ? 0.5 : 1');
  });

  it('uses qualified technique summaries and removes absolute efficacy claims', () => {
    expect(wizard).toContain('rated practice testing as high utility across varied learning conditions');
    expect(wizard).toContain('was not one of the ten techniques rated');
    for (const claim of ['Strongest single study finding', 'Spacing wins by 30-50%', 'almost no transfer', 'almost no benefit', 'Useless if <3 days']) expect(wizard).not.toContain(claim);
  });

  it('saves the generated snapshot, prevents duplicate saves, and preserves sibling state', () => {
    expect(wizard).toContain("subject: result.form.subject || 'Untitled plan'");
    expect(wizard).toContain('form: Object.assign({}, result.form)');
    expect(wizard).toContain("setData(Object.assign({}, data, { savedPlans: [plan].concat(data.savedPlans || []) }))");
    expect(wizard).toContain('disabled: resultSaved');
    expect(wizard).not.toContain('setData({ savedPlans:');
  });

  it('renders saved plans as a named list with dates and nested strategy lists', () => {
    expect(wizard).toContain("'aria-labelledby': 'learning-lab-strategy-saved-heading'");
    expect(wizard).toContain("hh('time', { dateTime: plan.savedAt }");
    expect(wizard).toContain("hh('ol', { 'aria-label': 'Top strategies for '");
  });

  it('confirms deletion, preserves siblings, announces it, and restores focus', () => {
    expect(wizard).toContain("title: 'Delete this saved plan?', confirmText: 'Delete plan'");
    expect(wizard).toContain("setData(Object.assign({}, data, { savedPlans: remaining }))");
    expect(wizard).toContain("llAnnounce('Saved strategy plan deleted.')");
    expect(wizard).toContain("remaining.length ? 'learning-lab-strategy-saved-heading' : 'learning-lab-strategy-form-heading'");
  });

  it('provides a named evidence-and-limits disclosure and accurate catalog copy', () => {
    expect(wizard).toContain("'aria-labelledby': 'learning-lab-strategy-evidence-heading'");
    expect(wizard).toContain('author-defined rules, not a validated assessment, diagnosis, or guarantee');
    expect(source).toContain('Optional comparison of study approaches using a disclosed heuristic.');
    expect(source).not.toContain('Adaptive study-plan generator based on Dunlosky 2013 + your context.');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
