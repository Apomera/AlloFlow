import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Personal Question Log accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalQuestionLog(props) {');
  const end = source.indexOf('  function PersonalSuccessLog(props) {', start);
  const questionLog = source.slice(start, end);

  it('uses a named capture form with native submit behavior', () => {
    expect(questionLog).toContain("hh('form', {");
    expect(questionLog).toContain("onSubmit: function(event) { event.preventDefault(); save(); }");
    expect(questionLog).toContain("'aria-labelledby': 'learning-lab-question-form-heading'");
    expect(questionLog).toContain("id: 'learning-lab-question-form-heading'");
    expect(questionLog).toContain("type: 'submit'");
  });

  it('associates visible labels with all capture fields', () => {
    expect(questionLog).toContain("htmlFor: 'learning-lab-question-text'");
    expect(questionLog).toContain("id: 'learning-lab-question-text', value: form.text, required: true");
    expect(questionLog).toContain("htmlFor: 'learning-lab-question-subject'");
    expect(questionLog).toContain("id: 'learning-lab-question-subject', type: 'text'");
    expect(questionLog).toContain("htmlFor: 'learning-lab-question-context'");
    expect(questionLog).toContain("id: 'learning-lab-question-context', type: 'text'");
  });

  it('identifies required and optional capture fields in visible text', () => {
    expect(questionLog).toContain("'Question (required)'");
    expect(questionLog).toContain("'Subject or class (optional)'");
    expect(questionLog).toContain("'Context (optional)'");
  });

  it('reports an empty required question inline and moves focus to it', () => {
    expect(questionLog).toContain("setFormError('Enter the question you want to remember.')");
    expect(questionLog).toContain("focusById('learning-lab-question-text')");
    expect(questionLog).toContain("id: 'learning-lab-question-text-error', role: 'alert'");
    expect(questionLog).toContain("'aria-invalid': formError ? 'true' : undefined");
  });

  it('trims saved values and preserves unrelated section data', () => {
    expect(questionLog).toContain('var questionText = form.text.trim();');
    expect(questionLog).toContain('subject: form.subject.trim()');
    expect(questionLog).toContain('context: form.context.trim()');
    expect(questionLog).toContain("setData(Object.assign({}, data, { questions: [q].concat(rawQuestions) }))");
  });

  it('announces a saved question and restores a predictable capture focus', () => {
    expect(questionLog).toContain("llAnnounce('Question saved: ' + questionText)");
    expect(questionLog).toContain("setForm(emptyForm)");
  });

  it('discloses browser storage and shared-device privacy considerations', () => {
    expect(questionLog).toContain('Questions and answers save in this browser only; saving does not send them to or notify anyone.');
    expect(questionLog).toContain('if other people use this device.');
    expect(questionLog).toContain("'aria-describedby': 'learning-lab-question-privacy-note'");
  });

  it('uses a fieldset, legend, and native radios for filters', () => {
    expect(questionLog).toContain("hh('fieldset'");
    expect(questionLog).toContain("hh('legend'");
    expect(questionLog).toContain("'Filter questions'");
    expect(questionLog).toContain("type: 'radio', name: 'learning-lab-question-filter'");
    expect(questionLog).toContain('checked: active');
  });

  it('shows counts in filter names and announces filter results', () => {
    expect(questionLog).toContain("option.label + ' (' + option.count + ')'");
    expect(questionLog).toContain("llAnnounce('Showing ' + count + ' ' + filterName(nextFilter)");
    expect(questionLog).toContain("role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'");
  });

  it('keeps answer drafts in component-level state instead of calling hooks in a list', () => {
    expect(questionLog).toContain("var ad = R.useState({}); var answerDrafts = ad[0]");
    expect(questionLog).not.toContain("var fs2 = R.useState('')");
    expect(questionLog).not.toContain("prompt('Answer:')");
  });

  it('uses a labeled answer form with native required validation', () => {
    expect(questionLog).toContain("onSubmit: function(event) { event.preventDefault(); answerQuestion(q); }");
    expect(questionLog).toContain("htmlFor: answerId");
    expect(questionLog).toContain("'Answer (required to mark answered)'");
    expect(questionLog).toContain("rows: 3, maxLength: 2000, required: true");
  });

  it('reports and focuses an empty answer inline', () => {
    expect(questionLog).toContain("'Enter the answer before marking this question answered.'");
    expect(questionLog).toContain("focusById('learning-lab-question-answer-' + q.id)");
    expect(questionLog).toContain("id: answerErrorId, role: 'alert'");
    expect(questionLog).toContain("'aria-invalid': answerError ? 'true' : undefined");
  });

  it('saves a trimmed answer while preserving unrelated section data', () => {
    expect(questionLog).toContain("var answerText = String(answerDrafts[q.id] || '').trim()");
    expect(questionLog).toContain("setData(Object.assign({}, data, { questions: rawQuestions.map");
    expect(questionLog).toContain("answered: true, answer: answerText, answeredAt: todayISO()");
  });

  it('announces status changes and restores focus after an item leaves the open view', () => {
    expect(questionLog).toContain("llAnnounce('Question marked answered: ' + textValue(q.text))");
    expect(questionLog).toContain("focusById(filter === 'open' ? 'learning-lab-question-results-heading'");
  });

  it('uses a named semantic history list and labeled articles', () => {
    expect(questionLog).toContain("'aria-labelledby': 'learning-lab-question-results-heading'");
    expect(questionLog).toContain("hh('ul', { 'aria-label': resultText");
    expect(questionLog).toContain("return hh('li', { key: 'q-' + q.id }");
    expect(questionLog).toContain("hh('article', {");
    expect(questionLog).toContain("'aria-labelledby': headingId");
  });

  it('communicates open and answered status with text in addition to color', () => {
    expect(questionLog).toContain("q.answered ? 'Answered question' : 'Open question'");
    expect(questionLog).toContain("q.answered ? '#34d399' : '#22d3ee'");
  });

  it('uses definition-list and time semantics for question details', () => {
    expect(questionLog).toContain("hh('dl', { 'aria-label': 'Question details'");
    expect(questionLog).toContain("hh('time', { dateTime: textValue(q.createdAt).trim() || undefined }");
    expect(questionLog).toContain("hh('time', { dateTime: textValue(q.answeredAt).trim() }");
  });

  it('presents recorded answers as a named section without losing whitespace', () => {
    expect(questionLog).toContain("hh('section', { 'aria-label': 'Answer'");
    expect(questionLog).toContain("whiteSpace: 'pre-wrap'");
    expect(questionLog).toContain("textValue(q.answer).trim() || 'No answer recorded.'");
  });

  it('confirms deletion through the accessible app dialog', () => {
    expect(questionLog).toContain("title: 'Remove this question?', confirmText: 'Remove question'");
    expect(questionLog).toContain('This cannot be undone.');
    expect(questionLog).not.toContain('confirm(');
  });

  it('names removal controls, preserves data, announces removal, and restores focus', () => {
    expect(questionLog).toContain("'aria-label': 'Remove question: ' + (textValue(q.text).trim() || 'Untitled question')");
    expect(questionLog).toContain("setData(Object.assign({}, data, { questions: rawQuestions.filter");
    expect(questionLog).toContain("llAnnounce('Question removed.')");
    expect(questionLog).toContain("focusById('learning-lab-question-results-heading')");
  });

  it('provides responsive fields and 44-pixel input and control targets', () => {
    expect(questionLog).toContain("gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))'");
    expect(questionLog).toContain("width: '100%', minHeight: 44");
    expect(questionLog).toContain("minWidth: 44, minHeight: 44");
    expect(questionLog).toContain("minHeight: 88");
  });

  it('handles malformed legacy question data without crashing', () => {
    expect(questionLog).toContain('var rawQuestions = Array.isArray(data.questions) ? data.questions : [];');
    expect(questionLog).toContain('var questions = rawQuestions.filter(isRecord);');
    expect(questionLog).toContain("textValue(q.text).trim() || 'Untitled question'");
    expect(source).toContain("stat: (Array.isArray((data.mytkQuest || {}).questions) ? (data.mytkQuest || {}).questions.filter(function(q) { return !!q && typeof q === 'object' && !q.answered; }).length : 0) + ' open'");
  });

  it('synchronizes focus with rendered state instead of a focus timer', () => {
    expect(questionLog).toContain('if (!pendingFocusId) return;');
    expect(questionLog).toContain('function focusById(id) { setPendingFocusId(id); }');
    expect(questionLog).not.toContain('setTimeout');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
