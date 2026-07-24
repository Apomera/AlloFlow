import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Reflection Prompts revised accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalReflectionPrompts(props) {');
  const end = source.indexOf('  function PersonalConceptMapMaker(props) {', start);
  const prompts = source.slice(start, end);

  it('uses stable headings and effect-based focus restoration across views', () => {
    for (const id of ['learning-lab-reflection-library-heading', 'learning-lab-reflection-answer-heading', 'learning-lab-reflection-history-heading']) expect(prompts).toContain("'" + id + "'");
    expect(prompts).toContain('document.getElementById(focusTarget)');
    expect(prompts).not.toContain('setTimeout(function()');
  });

  it('uses optional, private, non-clinical framing', () => {
    expect(prompts).toContain('Choose only prompts that feel useful.');
    expect(prompts).toContain('Saved responses remain in this browser until deleted.');
    expect(prompts).toContain('not an assessment, therapy, or a requirement to disclose personal experiences');
  });

  it('uses a named native answer form and bounded response', () => {
    expect(prompts).toContain("hh('form', { 'aria-labelledby': 'learning-lab-reflection-answer-heading'");
    expect(prompts).toContain("id: 'learning-lab-reflection-response', value: response, rows: 8, maxLength: 4000");
    expect(prompts).toContain("type: 'submit', 'data-ll-focusable': true");
  });

  it('connects prompt, privacy, and validation feedback to the textarea', () => {
    expect(prompts).toContain("htmlFor: 'learning-lab-reflection-response'");
    expect(prompts).toContain("'aria-describedby': 'learning-lab-reflection-prompt learning-lab-reflection-privacy'");
    expect(prompts).toContain("id: 'learning-lab-reflection-response-error', role: 'alert'");
    expect(prompts).toContain("setFocusTarget('learning-lab-reflection-response')");
  });

  it('preserves sibling data on save and delete', () => {
    expect(prompts).toContain("setData(Object.assign({}, data, { responses: [entry].concat(data.responses || []) }))");
    expect(prompts).toContain("setData(Object.assign({}, data, { responses: remaining }))");
    expect(prompts).not.toContain('setData({ responses:');
  });

  it('announces validation, save, navigation, and deletion outcomes', () => {
    expect(prompts).toContain("llAnnounce('A reflection response is required before saving.')");
    expect(prompts).toContain("returnToLibrary('Reflection response saved.')");
    expect(prompts).toContain("llAnnounce('Reflection response deleted.')");
  });

  it('uses semantic named category and prompt lists', () => {
    expect(prompts).toContain("return hh('section', { key: 'c-' + category.id, 'aria-labelledby': headingId");
    expect(prompts).toContain("hh('ul', { style:");
    expect(prompts).toContain("return hh('li', { key: 'p-' + prompt.id }");
  });

  it('uses higher-contrast category colors and hides decorative icons', () => {
    for (const color of ['#d8b4fe', '#f9a8d4', '#6ee7b7', '#fde68a']) expect(prompts).toContain(color);
    expect(prompts).toContain("hh('span', { 'aria-hidden': 'true' }, category.icon + ' ')");
  });

  it('uses semantic history articles, dates, safe wrapping, and explicit delete controls', () => {
    expect(prompts).toContain("hh('article', { 'aria-labelledby': 'learning-lab-reflection-entry-' + entry.id }");
    expect(prompts).toContain("hh('time', { dateTime: entry.date");
    expect(prompts).toContain("whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'");
    expect(prompts).toContain("'aria-label': 'Delete reflection response from ' + entry.date");
  });

  it('confirms deletion and restores meaningful focus', () => {
    expect(prompts).toContain("title: 'Delete this reflection response?', confirmText: 'Delete response'");
    expect(prompts).toContain("remaining.length ? 'learning-lab-reflection-history-heading' : 'learning-lab-reflection-history-back'");
  });

  it('uses less disclosure-heavy and less pressuring prompts', () => {
    expect(prompts).toContain('What strength, interest, or perspective do I want to recognize?');
    expect(prompts).toContain('What kind of support might be useful, if I choose to ask?');
    expect(prompts).not.toContain("most people don\\'t see");
    expect(prompts).not.toContain("Who is one person who genuinely sees me?");
    expect(prompts).not.toContain("What\\'s a mistake I made that I\\'m glad about");
  });

  it('updates catalog copy to disclose optional local saving', () => {
    expect(source).toContain('Optional reflection prompts across four categories; responses save locally.');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
