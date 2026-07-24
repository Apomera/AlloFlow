import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Curriculum Builder accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalCurriculum(props) {');
  const end = source.indexOf('  // ── JJJJ. PERSONAL TRANSITION PLANNER (Wave 20) ──', start);
  const curriculum = source.slice(start, end);

  it('uses flexible, non-competitive framing', () => {
    expect(curriculum).toContain('Organize an optional learning path for any topic, at your own pace.');
    expect(curriculum).toContain('A planning aid, not a measure of success');
    expect(curriculum).toContain('can contain any number of steps and can change or stop at any time');
    expect(curriculum).not.toContain('most successful adults');
    expect(curriculum).not.toContain("aren't the smartest ones");
    expect(curriculum).not.toContain('most important tool in this toolkit');
  });

  it('states accreditation, grading, and outcome boundaries', () => {
    expect(curriculum).toContain('does not provide accreditation, grading, expert review, or a guarantee of learning outcomes');
    expect(curriculum).toContain('Curricula save in this browser; avoid sensitive details on a shared device.');
  });

  it('uses a named curriculum form with native submit behavior', () => {
    expect(curriculum).toContain("hh('form', { onSubmit: function(event) { event.preventDefault(); createCurriculum(); }");
    expect(curriculum).toContain("'aria-labelledby': 'learning-lab-curriculum-form-heading'");
    expect(curriculum).toContain("type: 'submit'");
  });

  it('provides visible labels for every curriculum field', () => {
    expect(curriculum).toContain("htmlFor: 'learning-lab-curriculum-title'");
    expect(curriculum).toContain("htmlFor: 'learning-lab-curriculum-why'");
    expect(curriculum).toContain("htmlFor: 'learning-lab-curriculum-timespan'");
  });

  it('requires and bounds only the curriculum title', () => {
    expect(curriculum).toContain('Curriculum title (required)');
    expect(curriculum).toContain('required: true, maxLength: 1000');
    expect(curriculum).toContain('rows: 3, maxLength: 4000');
  });

  it('reports and focuses a missing title inline', () => {
    expect(curriculum).toContain("setTitleError('Enter a curriculum title before saving.')");
    expect(curriculum).toContain("id: 'learning-lab-curriculum-title-error', role: 'alert'");
    expect(curriculum).toContain("'aria-invalid': titleError ? 'true' : undefined");
    expect(curriculum).toContain("focusById('learning-lab-curriculum-title')");
  });

  it('trims saved curriculum text', () => {
    expect(curriculum).toContain('var title = newC.title.trim()');
    expect(curriculum).toContain('why: newC.why.trim(), timespan: newC.timespan.trim()');
  });

  it('preserves unrelated data while creating a curriculum', () => {
    expect(curriculum).toContain("setData(Object.assign({}, data, { curricula: [curriculum].concat(data.curricula || []) }))");
  });

  it('announces creation and opens the editor with heading focus', () => {
    expect(curriculum).toContain("llAnnounce('Curriculum saved: ' + title)");
    expect(curriculum).toContain("setActiveId(curriculum.id); setView('edit'); focusById('learning-lab-curriculum-detail-heading')");
  });

  it('always provides a named curriculum list and useful empty state', () => {
    expect(curriculum).toContain("hh('section', { 'aria-labelledby': 'learning-lab-curriculum-list-heading'");
    expect(curriculum).toContain("id: 'learning-lab-curriculum-list-heading', tabIndex: -1");
    expect(curriculum).toContain('No curricula saved yet. Create one if it would be useful.');
  });

  it('uses a semantic list of labeled curriculum articles', () => {
    expect(curriculum).toContain("hh('ul', { 'aria-label': 'Saved curricula'");
    expect(curriculum).toContain("hh('article', { 'aria-labelledby': headingId");
    expect(curriculum).toContain("hh('h3', { id: headingId");
  });

  it('hides decorative curriculum icons', () => {
    expect(curriculum).toContain("hh('span', { 'aria-hidden': 'true' }, '🎓 ')");
  });

  it('uses time semantics for curriculum creation dates', () => {
    expect(curriculum).toContain("hh('time', { dateTime: curriculum.createdAt }, relDate(curriculum.createdAt))");
  });

  it('uses native progress with text in list cards', () => {
    expect(curriculum).toContain("hh('progress', { value: done, max: Math.max(steps.length, 1)");
    expect(curriculum).toContain("'aria-label': 'Completion for '");
    expect(curriculum).toContain("done + ' of ' + steps.length + ' steps marked complete.'");
  });

  it('opens curricula with a contextual name and focus transfer', () => {
    expect(curriculum).toContain("'aria-label': 'Open curriculum: '");
    expect(curriculum).toContain("llAnnounce('Opened curriculum: '");
    expect(curriculum).toContain("focusById('learning-lab-curriculum-detail-heading')");
  });

  it('returns to the originating Open button', () => {
    expect(curriculum).toContain("llAnnounce('Returned to all curricula.')");
    expect(curriculum).toContain("focusById('learning-lab-curriculum-open-' + safeDomId(previous))");
  });

  it('handles a missing curriculum without changing state during render', () => {
    expect(curriculum).toContain('The selected curriculum is no longer available.');
    expect(curriculum).toContain('This curriculum could not be found.');
    expect(curriculum).not.toContain("if (!c) { setView('list'); return null; }");
  });

  it('frames the editor as flexible rather than contractual', () => {
    expect(curriculum).toContain('A flexible plan, not a contract');
    expect(curriculum).toContain('You can change, reorder, skip, or remove steps.');
    expect(curriculum).toContain('Completion is a personal note, not a grade or measure of ability.');
  });

  it('uses native progress with explicit text in the editor', () => {
    expect(curriculum).toContain("hh('progress', { value: done, max: progressMax");
    expect(curriculum).toContain("'aria-label': 'Curriculum completion: ' + progressText");
    expect(curriculum).toContain('No learning steps saved yet.');
  });

  it('uses a named step form instead of a blocking prompt', () => {
    expect(curriculum).toContain("hh('form', { onSubmit: function(event) { event.preventDefault(); addStep(); }");
    expect(curriculum).toContain("'aria-labelledby': 'learning-lab-curriculum-step-form-heading'");
    expect(curriculum).not.toContain('prompt(');
  });

  it('provides visible labels for step type and title', () => {
    expect(curriculum).toContain("htmlFor: 'learning-lab-curriculum-step-type'");
    expect(curriculum).toContain("htmlFor: 'learning-lab-curriculum-step-title'");
  });

  it('uses full-text native activity options', () => {
    expect(curriculum).toContain("hh('option', { key: type.id, value: type.id }, type.label)");
    expect(curriculum).toContain("label: 'Watch or listen'");
    expect(curriculum).toContain("label: 'Apply in context'");
    expect(curriculum).toContain("label: 'Explain to someone'");
  });

  it('requires and bounds the step title with inline feedback', () => {
    expect(curriculum).toContain('required: true, maxLength: 2000');
    expect(curriculum).toContain("setStepError('Enter a step title before saving.')");
    expect(curriculum).toContain("id: 'learning-lab-curriculum-step-error', role: 'alert'");
    expect(curriculum).toContain("focusById('learning-lab-curriculum-step-title')");
  });

  it('preserves unrelated curriculum data for every update', () => {
    expect(curriculum).toContain("setData(Object.assign({}, data, { curricula: (data.curricula || []).map");
  });

  it('announces step saving and restores form focus', () => {
    expect(curriculum).toContain("llAnnounce('Learning step saved: ' + label)");
    expect(curriculum).toContain("focusById('learning-lab-curriculum-step-title')");
  });

  it('uses a semantic ordered list for ordered learning steps', () => {
    expect(curriculum).toContain("hh('ol', { 'aria-label': 'Learning steps in order'");
    expect(curriculum).toContain("hh('article', { 'aria-labelledby': headingId");
    expect(curriculum).toContain("hh('h4', { id: headingId");
  });

  it('provides visible completion status rather than opacity alone', () => {
    expect(curriculum).toContain("step.done ? 'Marked complete' : 'Not marked complete'");
    expect(curriculum).not.toContain('opacity: s.done ? 0.6 : 1');
  });

  it('exposes completion programmatically with contextual text', () => {
    expect(curriculum).toContain("'aria-pressed': step.done ? 'true' : 'false'");
    expect(curriculum).toContain("'aria-label': (step.done ? 'Mark not complete: ' : 'Mark complete: ')");
    expect(curriculum).toContain("step.done ? 'Mark not complete' : 'Mark complete'");
  });

  it('announces completion changes and restores toggle focus', () => {
    expect(curriculum).toContain("llAnnounce('Step ' + (nextDone ? 'marked complete: ' : 'marked not complete: ')");
    expect(curriculum).toContain("focusById('learning-lab-curriculum-step-toggle-' + safeDomId(step.id))");
  });

  it('gives each saved step full labeled edit controls', () => {
    expect(curriculum).toContain("'Activity type for step ' + (index + 1)");
    expect(curriculum).toContain("htmlFor: 'learning-lab-curriculum-step-label-' + domId");
    expect(curriculum).toContain("htmlFor: 'learning-lab-curriculum-step-resource-' + domId");
    expect(curriculum).toContain("htmlFor: 'learning-lab-curriculum-step-notes-' + domId");
  });

  it('bounds step resource and note fields', () => {
    expect(curriculum).toContain('maxLength: 4000');
    expect(curriculum).toContain('rows: 3, maxLength: 6000');
    expect(curriculum).toContain("minHeight: 88, resize: 'vertical'");
  });

  it('discloses step autosave and associates it with edit fields', () => {
    expect(curriculum).toContain('Step titles, resources, notes, order, and completion state save automatically in this browser.');
    expect(curriculum).toContain("'aria-describedby': 'learning-lab-curriculum-autosave'");
  });

  it('uses contextual 44-pixel ordering controls', () => {
    expect(curriculum).toContain("'aria-label': 'Move earlier: '");
    expect(curriculum).toContain("'aria-label': 'Move later: '");
    expect(curriculum).toContain('disabled: index === 0');
    expect(curriculum).toContain('disabled: index === steps.length - 1');
    expect(curriculum).not.toContain("}, '▲')");
    expect(curriculum).not.toContain("}, '▼')");
  });

  it('announces reordering and restores the activated control', () => {
    expect(curriculum).toContain("llAnnounce('Moved ' + String(step.label || 'step')");
    expect(curriculum).toContain("focusById('learning-lab-curriculum-step-move-' + safeDomId(step.id)");
  });

  it('confirms step removal and restores step-section focus', () => {
    expect(curriculum).toContain("title: 'Remove this learning step?', confirmText: 'Remove step'");
    expect(curriculum).toContain("'aria-label': 'Remove learning step: '");
    expect(curriculum).toContain("llAnnounce('Learning step removed.')");
    expect(curriculum).toContain("focusById('learning-lab-curriculum-steps-heading')");
  });

  it('uses time semantics for step dates', () => {
    expect(curriculum).toContain("hh('time', { dateTime: step.addedAt }, relDate(step.addedAt))");
    expect(curriculum).toContain("hh('time', { dateTime: step.completedAt }, relDate(step.completedAt))");
  });

  it('gives curriculum notes a visible label, help, and bound', () => {
    expect(curriculum).toContain("htmlFor: 'learning-lab-curriculum-notes'");
    expect(curriculum).toContain("id: 'learning-lab-curriculum-notes-help'");
    expect(curriculum).toContain('rows: 5, maxLength: 8000');
  });

  it('confirms curriculum removal before leaving the editor', () => {
    expect(curriculum).toContain("title: 'Remove this curriculum?', confirmText: 'Remove curriculum'");
    expect(curriculum).toContain('This cannot be undone.');
    expect(curriculum).toContain("if (!accepted) return;");
    expect(curriculum).not.toContain("removeCurr(c.id); setView('list')");
  });

  it('announces curriculum removal and restores list focus', () => {
    expect(curriculum).toContain("llAnnounce('Curriculum and its steps removed.')");
    expect(curriculum).toContain("focusById('learning-lab-curriculum-list-heading')");
  });

  it('wraps long text and uses responsive 44-pixel controls', () => {
    expect(curriculum).toContain("whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'");
    expect(curriculum).toContain("gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))'");
    expect(curriculum).toContain('minWidth: 44, minHeight: 44');
    expect(curriculum).toContain("width: '100%', minHeight: 44");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
