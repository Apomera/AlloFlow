import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Personal If-Then Planner accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalIfThenPlanner(props) {');
  const end = source.indexOf('  function PersonalAccommodationCard(props)', start);
  const planner = source.slice(start, end);

  it('uses stable list and form headings for focus management', () => {
    expect(planner).toContain("'learning-lab-ifthen-heading'");
    expect(planner).toContain("'learning-lab-ifthen-form-heading'");
    expect(planner).toContain("setFocusTarget('learning-lab-ifthen-form-heading')");
    expect(planner).toContain("setFocusTarget('learning-lab-ifthen-heading')");
  });

  it('moves focus after view changes through an effect', () => {
    expect(planner).toContain("document.getElementById(focusTarget)");
    expect(planner).toContain("if (target && typeof target.focus === 'function') target.focus()");
    expect(planner).toContain('}, [focusTarget])');
  });

  it('uses a named native form with an explicit submit control', () => {
    expect(planner).toContain("hh('form', { 'aria-labelledby': 'learning-lab-ifthen-form-heading', onSubmit: savePlan }");
    expect(planner).toContain("type: 'submit', 'data-ll-focusable': true");
  });

  it('provides persistent labels for both textareas', () => {
    expect(planner).toContain("htmlFor: 'learning-lab-ifthen-trigger'");
    expect(planner).toContain("htmlFor: 'learning-lab-ifthen-action'");
    expect(planner).toContain("id: 'learning-lab-ifthen-trigger', required: true, maxLength: 2000");
    expect(planner).toContain("id: 'learning-lab-ifthen-action', required: true, maxLength: 2000");
  });

  it('connects both fields to persistent help and conditional errors', () => {
    expect(planner).toContain("id: 'learning-lab-ifthen-trigger-help'");
    expect(planner).toContain("id: 'learning-lab-ifthen-action-help'");
    expect(planner).toContain("'aria-describedby': 'learning-lab-ifthen-trigger-help' +");
    expect(planner).toContain("'aria-describedby': 'learning-lab-ifthen-action-help' +");
  });

  it('identifies each missing value with a separate inline alert', () => {
    expect(planner).toContain("ifPart: ifPart ? '' : 'Describe the cue or situation for this plan.'");
    expect(planner).toContain("thenPart: thenPart ? '' : 'Describe the response you choose for this plan.'");
    expect(planner).toContain("id: 'learning-lab-ifthen-trigger-error', role: 'alert'");
    expect(planner).toContain("id: 'learning-lab-ifthen-action-error', role: 'alert'");
  });

  it('marks invalid fields and focuses the first missing field', () => {
    expect(planner).toContain("'aria-invalid': formErrors.ifPart ? 'true' : undefined");
    expect(planner).toContain("'aria-invalid': formErrors.thenPart ? 'true' : undefined");
    expect(planner).toContain("setFocusTarget(errors.ifPart ? 'learning-lab-ifthen-trigger' : 'learning-lab-ifthen-action')");
  });

  it('announces validation without using a browser alert', () => {
    expect(planner).toContain("llAnnounce('The if-then plan has missing required information.')");
    expect(planner).not.toContain('alert(');
  });

  it('clears a field error when that field is edited', () => {
    expect(planner).toContain("if (formErrors.ifPart) setFormErrors(Object.assign({}, formErrors, { ifPart: '' }))");
    expect(planner).toContain("if (formErrors.thenPart) setFormErrors(Object.assign({}, formErrors, { thenPart: '' }))");
  });

  it('uses choice-based, non-guaranteeing form instructions', () => {
    expect(planner).toContain('Draft a cue and a response you choose. Both fields are required to save.');
    expect(planner).toContain('feels useful and realistic for you');
    expect(planner).not.toContain('link a trigger to a pre-decided action');
  });

  it('renders a named live plan preview with wrapping', () => {
    expect(planner).toContain("'aria-labelledby': 'learning-lab-ifthen-preview-heading'");
    expect(planner).toContain("role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'");
    expect(planner).toContain("overflowWrap: 'anywhere', whiteSpace: 'pre-wrap'");
  });

  it('hides decorative field and preview symbols', () => {
    expect(planner.match(/'aria-hidden': 'true'/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it('preserves sibling state whenever plans change', () => {
    expect(planner).toContain("setData(Object.assign({}, data, { plans: plans }))");
    expect(planner).not.toContain('setData({ plans:');
  });

  it('announces save, cancel, and recorded-use outcomes', () => {
    expect(planner).toContain("llAnnounce('If-then plan saved.')");
    expect(planner).toContain("llAnnounce('New if-then plan canceled.')");
    expect(planner).toContain("llAnnounce('Use recorded for plan: When ' + plan.ifPart + '.')");
  });

  it('reports the saved-plan count through a polite atomic status', () => {
    expect(planner).toContain("id: 'learning-lab-ifthen-count', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'");
    expect(planner).toContain("plans.length === 1 ? ' saved plan' : ' saved plans'");
  });

  it('renders saved plans in a named semantic list', () => {
    expect(planner).toContain("hh('section', { 'aria-labelledby': 'learning-lab-ifthen-saved-heading'");
    expect(planner).toContain("hh('ul', { 'aria-labelledby': 'learning-lab-ifthen-saved-heading'");
    expect(planner).toContain("return hh('li', { key: 'p-' + plan.id");
  });

  it('spells out recorded-use metadata and provides machine-readable dates', () => {
    expect(planner).toContain("'Recorded uses: ' + (plan.usedCount || 0)");
    expect(planner).toContain("hh('time', { dateTime: plan.lastUsed }");
    expect(planner).not.toContain("'used ' +");
    expect(planner).not.toContain("+ 'x'");
  });

  it('gives plan action buttons descriptive accessible names', () => {
    expect(planner).toContain("'aria-label': 'Record use for: ' + itemName");
    expect(planner).toContain("'aria-label': 'Delete if-then plan: ' + itemName");
  });

  it('gives plan actions at least 44 pixels of target height', () => {
    expect(planner.match(/minHeight: 44/g)?.length).toBeGreaterThanOrEqual(5);
  });

  it('confirms deletion, announces it, and restores heading focus', () => {
    expect(planner).toContain("title: 'Delete this if-then plan?', confirmText: 'Delete plan'");
    expect(planner).toContain("llAnnounce('If-then plan deleted.')");
    expect(planner).toContain("setFocusTarget('learning-lab-ifthen-heading')");
  });

  it('renders editable examples as a named semantic list', () => {
    expect(planner).toContain("'aria-labelledby': 'learning-lab-ifthen-templates-heading'");
    expect(planner).toContain("'aria-describedby': 'learning-lab-ifthen-templates-help'");
    expect(planner).toContain("return hh('li', { key: 't-' + index }");
  });

  it('frames templates as optional editable starting points', () => {
    expect(planner).toContain('These are optional starting points. Choose one only if it is useful');
    expect(planner).toContain('then edit either field before saving.');
  });

  it('uses explicit template button types, names, and full-size targets', () => {
    expect(planner).toContain("type: 'button', onClick: function() { openNew(template); }, 'aria-label': 'Use editable example: ' + templateName");
    expect(planner).toContain("width: '100%', minHeight: 44");
  });

  it('moves focus to the form after a template is chosen', () => {
    expect(planner).toContain("function openNew(template)");
    expect(planner).toContain("setFocusTarget('learning-lab-ifthen-form-heading')");
  });

  it('uses a named evidence aside with qualified research context', () => {
    expect(planner).toContain("hh('aside', { 'aria-labelledby': 'learning-lab-ifthen-evidence-heading'");
    expect(planner).toContain("hh('h3', { id: 'learning-lab-ifthen-evidence-heading'");
    expect(planner).toContain('with effects differing by study and population');
    expect(planner).toContain('does not guarantee follow-through or replace support');
  });

  it('removes the unsupported exact-effect and automatic-response claims', () => {
    expect(planner).not.toContain('medium-to-large effect sizes');
    expect(planner).not.toContain('d ≈ 0.65');
    expect(planner).not.toContain('automatically activates the planned response');
    expect(planner).not.toContain('Removes the in-the-moment decision cost');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
