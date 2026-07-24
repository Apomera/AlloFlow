import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Transition Planner accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalTransitionPlanner(props) {');
  const end = source.indexOf('  function PersonalAccomRequest(props) {', start);
  const planner = source.slice(start, end);

  it('frames the planner as optional and flexible', () => {
    expect(planner).toContain('Create an optional, flexible plan for an upcoming or ongoing change.');
    expect(planner).toContain('A flexible reflection aid, not a required path');
    expect(planner).toContain('there is no correct emotional response, pace, or outcome');
  });

  it('does not stereotype neurodivergent people or prescribe a universal path', () => {
    expect(planner).not.toContain('Especially for ND students who struggle with change');
    expect(planner).not.toContain('Knowing where you are helps you know what to do next');
    expect(planner).not.toContain('each phase has its own work');
  });

  it('states the model and advice limitations', () => {
    expect(planner).toContain('A change may overlap, repeat, skip, or not fit these phases');
    expect(planner).toContain('does not assess readiness or provide medical, mental-health, legal, school, or workplace advice');
  });

  it('discloses browser storage and sensitive-information risk', () => {
    expect(planner).toContain('Plans save in this browser and may contain sensitive information; avoid private details on a shared device.');
    expect(planner).toContain('These optional notes save automatically in this browser and may be sensitive.');
  });

  it('declares every hook at the component top level', () => {
    expect(planner).toContain("var cs = R.useState('');");
    expect(planner).toContain("var es = R.useState({ title: '', checklist: '' });");
    expect(planner.indexOf("var es = R.useState")).toBeLessThan(planner.indexOf("if (view === 'edit')"));
    expect(planner).not.toContain("(function() {\n                var inp = R.useState");
  });

  it('uses a named native creation form', () => {
    expect(planner).toContain("hh('form', { onSubmit: createTransition");
    expect(planner).toContain("'aria-labelledby': 'learning-lab-transition-form-heading'");
    expect(planner).toContain("type: 'submit'");
  });

  it('provides visible labels for the plan name, type, and date', () => {
    expect(planner).toContain("htmlFor: 'learning-lab-transition-title'");
    expect(planner).toContain("htmlFor: 'learning-lab-transition-kind'");
    expect(planner).toContain("htmlFor: 'learning-lab-transition-date'");
  });

  it('uses a native select with full-text change types', () => {
    expect(planner).toContain("hh('select', { id: 'learning-lab-transition-kind'");
    expect(planner).toContain("hh('option', { key: kind.id, value: kind.id }, kind.label)");
    expect(planner).toContain("label: 'Relationship change'");
    expect(planner).toContain("label: 'Medical event'");
  });

  it('requires and bounds only the plan name', () => {
    expect(planner).toContain('Plan name (required)');
    expect(planner).toContain("required: true, maxLength: 1000");
    expect(planner).toContain('Planned or approximate date (optional)');
  });

  it('reports and focuses an empty plan name inline', () => {
    expect(planner).toContain("title: 'Enter a name for this transition plan.'");
    expect(planner).toContain("id: 'learning-lab-transition-title-error', role: 'alert'");
    expect(planner).toContain("'aria-invalid': errors.title ? 'true' : undefined");
    expect(planner).toContain("focusById('learning-lab-transition-title')");
  });

  it('preserves unrelated data whenever transition records change', () => {
    expect(planner).toContain("setData(Object.assign({}, data, { transitions: nextTransitions }))");
  });

  it('announces creation and transfers focus to the editor heading', () => {
    expect(planner).toContain("llAnnounce('Transition plan created. The plan editor is open.')");
    expect(planner).toContain("focusById('learning-lab-transition-editor-heading')");
  });

  it('always exposes a named saved-plan section', () => {
    expect(planner).toContain("hh('section', { 'aria-labelledby': 'learning-lab-transition-list-heading'");
    expect(planner).toContain("id: 'learning-lab-transition-list-heading', tabIndex: -1");
    expect(planner).toContain('No transition plans saved. Create one only if it would be useful.');
  });

  it('renders saved plans as a semantic list of labeled articles', () => {
    expect(planner).toContain("hh('ul', { 'aria-label': 'Saved transition plans'");
    expect(planner).toContain("hh('article', { 'aria-labelledby': headingId");
    expect(planner).toContain("hh('h3', { id: headingId");
  });

  it('keeps Open and Remove as separate contextual buttons', () => {
    expect(planner).toContain("'aria-label': 'Open transition plan: '");
    expect(planner).toContain("'aria-label': 'Remove transition plan: '");
    expect(planner).not.toContain("hh('span', { onClick:");
  });

  it('opens plans with an announcement and heading focus', () => {
    expect(planner).toContain("llAnnounce('Transition plan opened.')");
    expect(planner).toContain("focusById('learning-lab-transition-editor-heading')");
  });

  it('returns focus to the originating Open button', () => {
    expect(planner).toContain("llAnnounce('Returned to saved transition plans.')");
    expect(planner).toContain("focusById('learning-lab-transition-open-' + safeDomId(previousId))");
  });

  it('handles a missing record without changing state during render', () => {
    expect(planner).toContain('This transition plan could not be found');
    expect(planner).toContain('It may have been removed in another window.');
    expect(planner).not.toContain("if (!t) { setView('list'); return null; }");
  });

  it('uses a native radio group for the phase prompts', () => {
    expect(planner).toContain("hh('fieldset'");
    expect(planner).toContain("hh('legend'");
    expect(planner).toContain("type: 'radio', name: 'learning-lab-transition-phase'");
    expect(planner).toContain('checked: selected');
  });

  it('provides visible descriptions and selected text for phases', () => {
    expect(planner).toContain("selected ? ' — selected' : ''");
    expect(planner).toContain('Choose the prompt that feels most useful now. You can change it at any time.');
    expect(planner).toContain("label: 'Moving out or integrating'");
  });

  it('announces phase changes', () => {
    expect(planner).toContain("llAnnounce('Current reflection phase changed to ' + phase.label + '.')");
  });

  it('associates visible labels with all preparation textareas', () => {
    expect(planner).toContain("htmlFor: 'learning-lab-transition-prework'");
    expect(planner).toContain("htmlFor: 'learning-lab-transition-concerns'");
    expect(planner).toContain("htmlFor: 'learning-lab-transition-supports'");
  });

  it('bounds preparation text and associates autosave help', () => {
    expect(planner).toContain("rows: 3, maxLength: 6000");
    expect(planner).toContain("'aria-describedby': 'learning-lab-transition-autosave-help'");
  });

  it('provides a named native checklist form', () => {
    expect(planner).toContain("hh('form', { onSubmit: addChecklistItem");
    expect(planner).toContain("'aria-labelledby': 'learning-lab-transition-checklist-add-heading'");
    expect(planner).toContain('Item (required)');
  });

  it('bounds checklist text and reports validation inline', () => {
    expect(planner).toContain("required: true, maxLength: 2000");
    expect(planner).toContain("checklist: 'Enter a checklist item.'");
    expect(planner).toContain("id: 'learning-lab-transition-checklist-error', role: 'alert'");
    expect(planner).toContain("focusById('learning-lab-transition-checklist-new')");
  });

  it('announces checklist creation and restores form focus', () => {
    expect(planner).toContain("llAnnounce('Checklist item added.')");
    expect(planner).toContain("focusById('learning-lab-transition-checklist-new')");
  });

  it('uses native checkboxes in a semantic checklist', () => {
    expect(planner).toContain("hh('ul', { 'aria-label': 'Transition checklist'");
    expect(planner).toContain("type: 'checkbox', checked: !!item.done");
    expect(planner).toContain("htmlFor: itemId");
  });

  it('provides visible checklist state text', () => {
    expect(planner).toContain("item.done ? 'Marked complete' : 'Not marked complete'");
  });

  it('announces checklist state changes with item context', () => {
    expect(planner).toContain("nextDone ? ' marked complete.' : ' marked not complete.'");
  });

  it('confirms checklist removal and returns focus', () => {
    expect(planner).toContain("title: 'Remove checklist item?', confirmText: 'Remove item'");
    expect(planner).toContain("'aria-label': 'Remove checklist item: '");
    expect(planner).toContain("llAnnounce('Checklist item removed.')");
    expect(planner).toContain("if (!accepted) return;");
  });

  it('shows textual checklist progress with a native progress element', () => {
    expect(planner).toContain("done + ' of ' + checklist.length + ' checklist items marked complete.'");
    expect(planner).toContain("hh('progress', { value: done, max: Math.max(checklist.length, 1)");
    expect(planner).toContain("'aria-label': progressText");
  });

  it('associates every reflection label and description with its textarea', () => {
    expect(planner).toContain("htmlFor: reflectionId");
    expect(planner).toContain("id: reflectionId + '-help'");
    expect(planner).toContain("'aria-describedby': reflectionId + '-help learning-lab-transition-autosave-help'");
  });

  it('bounds every reflection field', () => {
    expect(planner).toContain("rows: 2, maxLength: 6000");
    expect(planner).toContain("minHeight: 76, resize: 'vertical'");
  });

  it('confirms plan removal and leaves the editor only after acceptance', () => {
    expect(planner).toContain("title: 'Remove transition plan?', confirmText: 'Remove plan'");
    expect(planner).toContain("if (!accepted) return;");
    expect(planner).not.toContain("removeTrans(t.id); setView('list')");
  });

  it('announces plan removal and focuses the plan list', () => {
    expect(planner).toContain("llAnnounce('Transition plan removed.')");
    expect(planner).toContain("focusById('learning-lab-transition-list-heading')");
  });

  it('uses time semantics for saved and planned dates', () => {
    expect(planner).toContain("hh('time', { dateTime: transition.startDate }, transition.startDate)");
    expect(planner).toContain("hh('time', { dateTime: transition.createdAt }, relDate(transition.createdAt))");
  });

  it('removes blocking browser confirmation and silent title failure', () => {
    expect(planner).not.toContain("confirm('Delete this transition plan?')");
    expect(planner).not.toContain("if (!newT.title.trim()) return;");
  });

  it('uses responsive layouts and 44-pixel controls', () => {
    expect(planner).toContain("gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))'");
    expect(planner).toContain("gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))'");
    expect(planner).toContain('minWidth: 44, minHeight: 44');
    expect(planner).toContain("width: '100%', minHeight: 44");
  });

  it('wraps long user-authored text', () => {
    expect(planner).toContain("whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
