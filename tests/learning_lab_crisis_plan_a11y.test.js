import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Personal Crisis Plan accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalCrisisPlan(props) {');
  const end = source.indexOf('  function PersonalIdentityMap(props) {', start);
  const plan = source.slice(start, end);

  it('preserves unrelated section data during automatic saves', () => {
    expect(plan).toContain("setData(Object.assign({}, data, { plan: Object.assign({}, p, patch) }))");
    expect(plan).not.toContain('setData({ plan:');
  });

  it('uses a named static crisis-help section without forcing an alert announcement', () => {
    expect(plan).toContain("hh('section', { 'aria-labelledby': 'learning-lab-crisis-help-heading'");
    expect(plan).toContain("id: 'learning-lab-crisis-help-heading'");
    expect(plan).not.toContain("role: 'alert'");
  });

  it('provides actionable call and text links for current crisis resources', () => {
    expect(plan).toContain("href: 'tel:988'");
    expect(plan).toContain("href: 'sms:988'");
    expect(plan).toContain("href: 'tel:+18885681112'");
    expect(plan).toContain("href: 'sms:741741'");
    expect(plan).toContain("href: 'tel:911'");
  });

  it('gives every crisis link a descriptive accessible name', () => {
    expect(plan).toContain("'aria-label': 'Call the 988 Suicide and Crisis Lifeline'");
    expect(plan).toContain("'aria-label': 'Text the 988 Suicide and Crisis Lifeline'");
    expect(plan).toContain("'aria-label': 'Call the Maine Crisis Line at 1-888-568-1112'");
    expect(plan).toContain("'aria-label': 'Text HOME to Crisis Text Line at 741741'");
    expect(plan).toContain("'aria-label': 'Call 911 for immediate danger'");
  });

  it('groups crisis options in a semantic list', () => {
    expect(plan).toContain("hh('ul', { 'aria-label': 'Crisis contact options'");
    expect(plan).toContain("hh('li', null, hh('a'");
  });

  it('provides at least 44-pixel crisis link targets', () => {
    expect(plan).toContain("minHeight: 44, padding: '8px 10px'");
    expect(plan).toContain("textDecoration: 'underline'");
  });

  it('uses a semantic ordered list for the six planning steps', () => {
    expect(plan).toContain("hh('ol', { 'aria-label': 'Six-step personal crisis plan'");
    expect(plan).toContain("return hh('li', { key: 'cs-' + s.id");
  });

  it('associates each step label with its textarea', () => {
    expect(plan).toContain("var fieldId = 'learning-lab-crisis-' + s.id");
    expect(plan).toContain("hh('label', { htmlFor: fieldId");
    expect(plan).toContain("hh('textarea', { id: fieldId");
    expect(plan).not.toContain('tkTextarea(');
  });

  it('programmatically associates step prompts and the save note', () => {
    expect(plan).toContain("var promptId = fieldId + '-prompt'");
    expect(plan).toContain("'aria-describedby': promptId + ' learning-lab-crisis-save-note'");
    expect(plan).toContain("id: 'learning-lab-crisis-save-note'");
  });

  it('discloses automatic saving and sensitive local-data considerations', () => {
    expect(plan).toContain('Your entries save automatically in this browser.');
    expect(plan).toContain('private contact and safety information');
    expect(plan).toContain('use a device and account you trust');
  });

  it('announces a completed automatic save when a field loses focus', () => {
    expect(plan).toContain("onBlur: function() { llAnnounce(s.label + ' saved automatically.'); }");
    expect(plan).not.toContain('llAnnounce(event.target.value');
  });

  it('provides comfortably sized multiline response fields', () => {
    expect(plan).toContain("width: '100%', minHeight: 96");
    expect(plan).toContain("resize: 'vertical'");
    expect(plan).toContain("maxLength: 4000");
  });

  it('uses lighter text colors for small step labels on the dark surface', () => {
    for (const color of ['#fde68a', '#bfdbfe', '#a7f3d0', '#ddd6fe', '#fbcfe8', '#fecaca']) {
      expect(plan).toContain(`textColor: '${color}'`);
    }
  });

  it('labels the evidence note as a complementary region', () => {
    expect(plan).toContain("hh('aside', { 'aria-labelledby': 'learning-lab-crisis-evidence-heading'");
    expect(plan).toContain("id: 'learning-lab-crisis-evidence-heading'");
    expect(plan).toContain('does not replace professional care or emergency services');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('prismflow-deploy/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
