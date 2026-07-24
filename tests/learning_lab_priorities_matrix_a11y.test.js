import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Priorities Matrix accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalPriorities(props) {');
  const end = source.indexOf('  function PersonalParentMessage(props) {', start);
  const priorities = source.slice(start, end);

  it('uses a named add-task form with native submit behavior', () => {
    expect(priorities).toContain("onSubmit: function(event) { event.preventDefault(); add(); }");
    expect(priorities).toContain("'aria-labelledby': 'learning-lab-priorities-form-heading'");
    expect(priorities).toContain("id: 'learning-lab-priorities-form-heading'");
    expect(priorities).toContain("type: 'submit'");
  });

  it('associates a visible required label with the task input', () => {
    expect(priorities).toContain("htmlFor: 'learning-lab-priorities-task'");
    expect(priorities).toContain("'Task name (required)'");
    expect(priorities).toContain("id: 'learning-lab-priorities-task', type: 'text', value: form.text, required: true, maxLength: 1000");
  });

  it('reports and focuses an empty task name inline', () => {
    expect(priorities).toContain("setFormError('Enter a task name before adding it.')");
    expect(priorities).toContain("focusById('learning-lab-priorities-task')");
    expect(priorities).toContain("id: 'learning-lab-priorities-task-error', role: 'alert'");
    expect(priorities).toContain("'aria-invalid': formError ? 'true' : undefined");
  });

  it('gives the starting category select a visible label', () => {
    expect(priorities).toContain("htmlFor: 'learning-lab-priorities-quadrant'");
    expect(priorities).toContain("id: 'learning-lab-priorities-quadrant'");
    expect(priorities).toContain("'Starting category'");
  });

  it('provides complete textual quadrant names in native options', () => {
    expect(priorities).toContain("'Q1: Urgent and important'");
    expect(priorities).toContain("'Q2: Important, not urgent'");
    expect(priorities).toContain("'Q3: Urgent, not important'");
    expect(priorities).toContain("'Q4: Not urgent or important'");
    expect(priorities).toContain("hh('option', { key: 'op-' + quadrant.id, value: quadrant.id }, quadrant.label)");
  });

  it('preserves unrelated data when adding a normalized task', () => {
    expect(priorities).toContain("var text = form.text.trim()");
    expect(priorities).toContain("quadrant: quadrantFor(form.quadrant).id");
    expect(priorities).toContain("setData(Object.assign({}, data, { tasks: [task].concat(data.tasks || []) }))");
  });

  it('announces a successful add and restores task-input focus', () => {
    expect(priorities).toContain("llAnnounce('Task added to ' + quadrantFor(task.quadrant).label + ': ' + text)");
    expect(priorities).toContain("setForm({ text: '', quadrant: 'q2' }); setFormError('')");
  });

  it('uses a named semantic matrix region and heading hierarchy', () => {
    expect(priorities).toContain("hh('section', { 'aria-labelledby': 'learning-lab-priorities-matrix-heading' }");
    expect(priorities).toContain("id: 'learning-lab-priorities-matrix-heading', tabIndex: -1");
    expect(priorities).toContain("hh('h3', { id: headingId, tabIndex: -1");
  });

  it('does not rely on color alone to identify a category', () => {
    expect(priorities).toContain("}, quadrant.label)");
    expect(priorities).toContain("quadrant.description + ' '");
    expect(priorities).toContain("'aria-label': quadrant.label + ' tasks'");
  });

  it('uses neutral, nonjudgmental category guidance', () => {
    expect(priorities).toContain('Urgency and importance are personal judgments');
    expect(priorities).not.toContain('Crisis mode');
    expect(priorities).not.toContain('stop living here');
    expect(priorities).not.toContain('time-wasters');
    expect(priorities).not.toContain('AVOID.');
  });

  it('keeps tasks with missing or unknown category data visible', () => {
    expect(priorities).toContain("return QUADRANTS.filter(function(quadrant) { return quadrant.id === id; })[0] || QUADRANTS[1]");
    expect(priorities).toContain("quadrantFor(task.quadrant).id === quadrant.id");
  });

  it('uses semantic task lists and labeled task articles', () => {
    expect(priorities).toContain("hh('ul', { 'aria-label': quadrant.label + ' tasks'");
    expect(priorities).toContain("return hh('li', { key: 't-' + task.id }");
    expect(priorities).toContain("hh('article', { 'aria-labelledby': taskHeadingId");
    expect(priorities).toContain("hh('h4', { id: taskHeadingId");
  });

  it('uses time semantics when an added date is available', () => {
    expect(priorities).toContain("task.createdAt ? hh('p'");
    expect(priorities).toContain("hh('time', { dateTime: task.createdAt }, relDate(task.createdAt))");
  });

  it('uses a named form and explicit submit to move each task', () => {
    expect(priorities).toContain("onSubmit: function(event) { event.preventDefault(); moveTask(task, moveValue); }");
    expect(priorities).toContain("'aria-label': 'Move task: ' + taskText");
    expect(priorities).toContain("}, 'Move task')");
    expect(priorities).not.toContain("onChange: function(e) { moveTask");
  });

  it('visibly labels each task move selector', () => {
    expect(priorities).toContain("htmlFor: moveId");
    expect(priorities).toContain("'Move task to a different category'");
    expect(priorities).toContain("id: moveId, value: moveValue");
  });

  it('preserves unrelated data and task fields when moving', () => {
    expect(priorities).toContain("setData(Object.assign({}, data, { tasks: (data.tasks || []).map");
    expect(priorities).toContain("Object.assign({}, item, { quadrant: target.id })");
  });

  it('announces a move and sends focus to the destination category', () => {
    expect(priorities).toContain("llAnnounce('Task moved to ' + target.label + ': '");
    expect(priorities).toContain("focusById('learning-lab-priorities-heading-' + target.id)");
    expect(priorities).toContain("llAnnounce('Task is already in ' + target.label + '.')");
  });

  it('confirms task removal before changing stored data', () => {
    expect(priorities).toContain("title: 'Remove this task?', confirmText: 'Remove task'");
    expect(priorities).toContain('This cannot be undone.');
    expect(priorities).not.toContain("function remove(id) { setData");
  });

  it('names remove controls, announces removal, and restores focus', () => {
    expect(priorities).toContain("'aria-label': 'Remove task: ' + taskText");
    expect(priorities).toContain("llAnnounce('Task removed from the priorities matrix.')");
    expect(priorities).toContain("focusById('learning-lab-priorities-matrix-heading')");
  });

  it('discloses local storage and shared-device privacy considerations', () => {
    expect(priorities).toContain('Tasks save in this browser.');
    expect(priorities).toContain('if other people use this device.');
    expect(priorities).toContain("'aria-describedby': 'learning-lab-priorities-privacy-note'");
  });

  it('explains that the matrix is a flexible aid rather than an assessment', () => {
    expect(priorities).toContain("'aria-labelledby': 'learning-lab-priorities-about-heading'");
    expect(priorities).toContain('reflection aid, not a rule or assessment');
    expect(priorities).toContain('different people may categorize the same task differently');
  });

  it('uses responsive grids and 44-pixel fields and controls', () => {
    expect(priorities).toContain("gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))'");
    expect(priorities).toContain("gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))'");
    expect(priorities).toContain("width: '100%', minHeight: 44");
    expect(priorities).toContain("minWidth: 44, minHeight: 44");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
