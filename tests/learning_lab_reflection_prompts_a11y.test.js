import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Reflection Prompts accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalReflectionPrompts(props) {');
  const end = source.indexOf('  function PersonalConceptMapMaker(props) {', start);
  const prompts = source.slice(start, end);

  it('associates the response label and prompt with the textarea', () => {
    expect(prompts).toContain("htmlFor: 'learning-lab-reflection-response'");
    expect(prompts).toContain("id: 'learning-lab-reflection-prompt'");
    expect(prompts).toContain("id: 'learning-lab-reflection-response'");
    expect(prompts).toContain("'aria-describedby': 'learning-lab-reflection-prompt'");
  });

  it('reports an empty response inline and moves focus to it', () => {
    expect(prompts).toContain("setResponseError('Write a response before saving.')");
    expect(prompts).toContain("document.getElementById('learning-lab-reflection-response')");
    expect(prompts).toContain("id: 'learning-lab-reflection-response-error', role: 'alert'");
    expect(prompts).not.toContain("alert('Pick a prompt + write something.')");
  });

  it('announces saved responses', () => {
    expect(prompts).toContain("llAnnounce('Reflection response saved.')");
  });

  it('uses headings for categories and saved questions', () => {
    expect(prompts).toContain("hh('h3', { style:");
    expect(prompts).toContain("'Question: ' + r.promptText");
    expect(prompts).toContain("cat.icon + ' ' + cat.label");
  });

  it('uses native, full-width prompt buttons with suitable targets', () => {
    expect(prompts).toContain("key: 'p-' + p.id, type: 'button'");
    expect(prompts).toContain("width: '100%', minHeight: 44");
  });

  it('provides 44-pixel answer and history actions', () => {
    expect(prompts).toContain("tkBtn('💾 Save my response', saveResponse, 'primary', { minHeight: 44 })");
    expect(prompts).toContain("tkBtn('📓 My history'");
    expect(prompts).toContain("'secondary', { minHeight: 44 })");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('prismflow-deploy/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
