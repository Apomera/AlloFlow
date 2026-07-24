import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Ethical Decision Reflection accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalEthical(props) {');
  const end = source.indexOf('  function PersonalResources(props) {', start);
  const ethical = source.slice(start, end);

  it('frames the tool as a reflection aid rather than moral authority', () => {
    expect(ethical).toContain("'A reflection aid, not a moral authority'");
    expect(ethical).toContain('does not rank moral development, determine a correct answer');
    expect(ethical).not.toContain('the highest involves balancing universal principles');
  });

  it('recognizes cultural, community, and situational differences', () => {
    expect(ethical).toContain('differs across people, cultures, communities, roles, and circumstances');
  });

  it('uses a named form with native submit behavior', () => {
    expect(ethical).toContain("onSubmit: function(event) { event.preventDefault(); save(); }");
    expect(ethical).toContain("'aria-labelledby': 'learning-lab-ethical-form-heading'");
    expect(ethical).toContain("type: 'submit'");
  });

  it('associates each prompt label and help text with its textarea', () => {
    expect(ethical).toContain('htmlFor: inputId');
    expect(ethical).toContain("'aria-describedby': helpId");
    expect(ethical).toContain("hh('p', { id: helpId");
  });

  it('uses native requirements and bounded input length', () => {
    expect(ethical).toContain("required: step.id === 'situation'");
    expect(ethical).toContain('maxLength: 6000');
    expect(ethical).toContain("'Situation (required)'");
  });

  it('uses optional non-prescriptive prompts', () => {
    expect(ethical).toContain('List any number of possibilities');
    expect(ethical).toContain('A decision can remain uncertain or change');
    expect(ethical).not.toContain('List at least 3');
    expect(ethical).not.toContain('Will I be at peace with this in a year?');
  });

  it('reports and focuses an empty situation inline without alert', () => {
    expect(ethical).toContain("setSituationError('Describe the situation before saving this reflection.')");
    expect(ethical).toContain("id: 'learning-lab-ethical-situation-error', role: 'alert'");
    expect(ethical).toContain("focusById('learning-lab-ethical-situation')");
    expect(ethical).not.toContain("alert('Need a situation.')");
  });

  it('trims all responses and preserves unrelated data', () => {
    expect(ethical).toContain("log[step.id] = String(form[step.id] || '').trim()");
    expect(ethical).toContain("setData(Object.assign({}, data, { logs: [log].concat(data.logs || []) }))");
  });

  it('announces saving and restores form focus', () => {
    expect(ethical).toContain("llAnnounce('Decision reflection saved in this browser.')");
    expect(ethical).toContain("focusById('learning-lab-ethical-situation')");
  });

  it('discloses sensitive local storage and immediate-safety boundaries', () => {
    expect(ethical).toContain('Reflections save in this browser and may contain sensitive information.');
    expect(ethical).toContain('Avoid names or private details on a shared device.');
    expect(ethical).toContain('contact an appropriate trusted, emergency, or crisis resource');
  });

  it('uses a named semantic history list with labeled articles', () => {
    expect(ethical).toContain("'aria-labelledby': 'learning-lab-ethical-history-heading'");
    expect(ethical).toContain("hh('ul', { 'aria-label': 'Most recent ethical decision reflections'");
    expect(ethical).toContain("hh('article', { 'aria-labelledby': headingId");
    expect(ethical).toContain("hh('h3', { id: headingId");
  });

  it('uses time semantics for saved reflection dates', () => {
    expect(ethical).toContain("hh('time', { dateTime: log.date || undefined }, relDate(log.date))");
  });

  it('makes all nonempty saved responses available', () => {
    expect(ethical).toContain('function savedDetails(log)');
    expect(ethical).toContain("'aria-label': 'Decision reflection responses'");
    expect(ethical).toContain("hh('dt'");
    expect(ethical).toContain("hh('dd'");
  });

  it('uses a keyboard-operable disclosure for complete sensitive records', () => {
    expect(ethical).toContain("hh('details'");
    expect(ethical).toContain("}, 'Review complete reflection')");
    expect(ethical).toContain("alignItems: 'center', minHeight: 44");
  });

  it('preserves response whitespace and wraps long text', () => {
    expect(ethical).toContain("whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'");
  });

  it('confirms removal while preserving unrelated data', () => {
    expect(ethical).toContain("title: 'Remove this reflection?', confirmText: 'Remove reflection'");
    expect(ethical).toContain('This cannot be undone.');
    expect(ethical).toContain("setData(Object.assign({}, data, { logs: (data.logs || []).filter");
  });

  it('names removal controls, announces removal, and restores focus', () => {
    expect(ethical).toContain("'aria-label': 'Remove decision reflection: '");
    expect(ethical).toContain("llAnnounce('Saved decision reflection removed.')");
    expect(ethical).toContain("focusById('learning-lab-ethical-history-heading')");
  });

  it('uses 44-pixel fields and controls', () => {
    expect(ethical).toContain("width: '100%', minHeight: 88");
    expect(ethical).toContain("minWidth: 44, minHeight: 44");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
