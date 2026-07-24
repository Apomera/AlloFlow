import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Personal Career Explorer accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalCareerExplorer(props) {');
  const end = source.indexOf('  function PersonalMoodTracker(props) {', start);
  const explorer = source.slice(start, end);

  it('uses a named native form for the career quiz', () => {
    expect(explorer).toContain("hh('form', { onSubmit: showResults, 'aria-labelledby': 'learning-lab-career-quiz-heading' }");
    expect(explorer).toContain("id: 'learning-lab-career-quiz-heading'");
    expect(explorer).toContain("hh('button', { type: 'submit'");
  });

  it('uses fieldsets and legends for mutually exclusive question groups', () => {
    expect(explorer).toContain("return hh('fieldset', { key: 'qq-' + question.id");
    expect(explorer).toContain("hh('legend'");
    expect(explorer).toContain("type: 'radio'");
    expect(explorer).toContain("name: 'learning-lab-career-' + question.id");
  });

  it('associates every radio with a visible label', () => {
    expect(explorer).toContain("var optionId = 'learning-lab-career-' + question.id + '-' + option.v");
    expect(explorer).toContain("htmlFor: optionId");
    expect(explorer).toContain("id: optionId, type: 'radio'");
  });

  it('exposes checked state through native radio properties', () => {
    expect(explorer).toContain("checked: selected");
    expect(explorer).toContain("onChange: function() { answer(question.id, option.v); }");
    expect(explorer).not.toContain("onClick: function() { answer(q.id, o.v); }");
  });

  it('provides a live, atomic quiz progress status', () => {
    expect(explorer).toContain("id: 'learning-lab-career-progress', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'");
    expect(explorer).toContain("answeredCount + ' of ' + QUESTIONS.length + ' questions answered.'");
    expect(explorer).toContain("'aria-describedby': 'learning-lab-career-progress'");
  });

  it('keeps the submit action present and disables it until complete', () => {
    expect(explorer).toContain("disabled: !completed");
    expect(explorer).toContain("var completed = answeredCount === QUESTIONS.length");
    expect(explorer).toContain("'See career suggestions'");
  });

  it('announces and focuses the results view', () => {
    expect(explorer).toContain("llAnnounce('Career suggestions ready. Showing your top matches.')");
    expect(explorer).toContain("focusById('learning-lab-career-results-heading')");
    expect(explorer).toContain("id: 'learning-lab-career-results-heading', tabIndex: -1");
  });

  it('resets the quiz with an announcement and focus restoration', () => {
    expect(explorer).toContain("llAnnounce('Career quiz reset. Five questions are ready.')");
    expect(explorer).toContain("focusById('learning-lab-career-q1-people')");
    expect(explorer).toContain("hh('button', { type: 'button', onClick: retakeQuiz");
  });

  it('uses a semantic result list with labeled articles', () => {
    expect(explorer).toContain("hh('ul', { 'aria-label': 'Career suggestions'");
    expect(explorer).toContain("return hh('li', { key: 'cr-' + career.id");
    expect(explorer).toContain("hh('article', { 'aria-labelledby': headingId }");
    expect(explorer).toContain("hh('h4', { id: headingId");
  });

  it('explains that suggestions are not predictions or ability measures', () => {
    expect(explorer).toContain('Use it as a starting point, not a decision or prediction.');
    expect(explorer).toContain('not a measure of ability or a recommendation');
  });

  it('communicates theme matching without relying on color', () => {
    expect(explorer).toContain("'Matched ' + career.score + ' of ' + career.match.length + ' career themes.'");
  });

  it('implements save controls with label-based state instead of aria-pressed on a changing label', () => {
    expect(explorer).toContain("'aria-label': (isSaved ? 'Remove ' : 'Save ') + career.label");
    expect(explorer).toContain("isSaved ? 'Saved — remove' : 'Save to explore'");
    expect(explorer).not.toContain("'aria-pressed'");
    expect(explorer).toContain("onClick: function() { toggleCareer(career, isSaved); }");
  });

  it('handles malformed legacy saved-career data without crashing', () => {
    expect(explorer).toContain('var rawSaved = (Array.isArray(data.saved) ? data.saved : []).filter(isRecord);');
    expect(explorer).toContain("savedAt: textValue(saved.savedAt).trim()");
    expect(source).toContain("stat: (Array.isArray((data.mytkCareer || {}).saved) ? (data.mytkCareer || {}).saved.length : 0) + ' saved'");
  });

  it('explains local-only saving without external communication', () => {
    expect(explorer).toContain('Answers and saved careers stay only in your Personal Toolkit; nothing here is shared with or sent to a teacher, school, counselor, or family member.');
  });

  it('announces career save and removal state changes', () => {
    expect(explorer).toContain("career.label + ' saved to careers to explore.'");
    expect(explorer).toContain("career.label + ' removed from careers to explore.'");
  });

  it('preserves unrelated section data and prevents duplicate saves', () => {
    expect(explorer).toContain("setData(Object.assign({}, data, { saved: saved }))");
    expect(explorer).toContain("if (!saved.some(function(item) { return item.id === career.id; }))");
  });

  it('uses a semantic saved-career list with machine-readable dates', () => {
    expect(explorer).toContain("'aria-labelledby': 'learning-lab-career-saved-heading'");
    expect(explorer).toContain("key: 'saved-' + item.career.id");
    expect(explorer).toContain("hh('time', { dateTime: item.savedAt }");
  });

  it('provides 44-pixel option and action targets', () => {
    expect(explorer).toContain("minHeight: 44, padding: '8px 10px'");
    expect(explorer).toContain("minHeight: 44, padding: '10px 16px'");
    expect(explorer).toContain("minHeight: 44, padding: '9px 12px'");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
