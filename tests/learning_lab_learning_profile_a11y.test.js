import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Learning Profile accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalLearningProfile(props) {');
  const end = source.indexOf('  function PersonalReflectionPrompts(props) {', start);
  const profile = source.slice(start, end);

  it('associates each generated label with its field', () => {
    expect(profile).toContain("htmlFor: 'learning-lab-profile-' + f.id");
    expect(profile).toContain("id: 'learning-lab-profile-' + f.id, type: 'text'");
    expect(profile).toContain("id: 'learning-lab-profile-' + f.id, value: p[f.id] || '', rows: 3");
  });

  it('provides suitable minimum field sizes', () => {
    expect(profile).toContain("style: { width: '100%', minHeight: 44");
    expect(profile).toContain("style: { width: '100%', minHeight: 88");
  });

  it('reports print failures inline instead of using a native alert', () => {
    expect(profile).toContain("setPrintMessage('The print dialog could not open.");
    expect(profile).toContain("printMessage ? hh('div', { role: 'alert'");
    expect(profile).not.toContain("alert('Use your browser\\'s print function");
  });

  it('provides a 44-pixel print action', () => {
    expect(profile).toContain("tkBtn('🖨 Print my profile', print, 'secondary', { minHeight: 44 })");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('prismflow-deploy/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
