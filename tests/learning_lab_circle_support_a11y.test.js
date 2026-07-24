import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Circle of Support accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalCircleSupport(props) {');
  const end = source.indexOf('  function PersonalRoutineBuilder(props) {', start);
  const support = source.slice(start, end);

  it('uses a named form with native submit behavior', () => {
    expect(support).toContain("onSubmit: function(event) { event.preventDefault(); save(); }");
    expect(support).toContain("'aria-labelledby': 'learning-lab-support-form-heading'");
    expect(support).toContain("id: 'learning-lab-support-form-heading'");
    expect(support).toContain("type: 'submit'");
  });

  it('associates visible labels with all entry fields', () => {
    expect(support).toContain("htmlFor: 'learning-lab-support-name'");
    expect(support).toContain("htmlFor: 'learning-lab-support-role'");
    expect(support).toContain("htmlFor: 'learning-lab-support-note'");
  });

  it('visibly identifies required and optional fields', () => {
    expect(support).toContain("'Name or label (required)'");
    expect(support).toContain("'Role or type of service (optional)'");
    expect(support).toContain("'Why or when you might contact them (optional)'");
  });

  it('reports and focuses a missing contact label inline', () => {
    expect(support).toContain("setNameError('Enter a name, nickname, service, or relationship label.')");
    expect(support).toContain("focusById('learning-lab-support-name')");
    expect(support).toContain("id: 'learning-lab-support-name-error', role: 'alert'");
    expect(support).toContain("'aria-invalid': nameError ? 'true' : undefined");
    expect(support).not.toContain("alert('Need a name.')");
  });

  it('uses a fieldset, legend, and native radios for support groups', () => {
    expect(support).toContain("hh('fieldset'");
    expect(support).toContain("hh('legend', { style: labelStyle }, 'Support group')");
    expect(support).toContain("type: 'radio', name: 'learning-lab-support-level'");
    expect(support).toContain('checked: selected');
  });

  it('shows full text descriptions for every support group', () => {
    expect(support).toContain('A person or service I would contact first');
    expect(support).toContain('Someone I often feel comfortable contacting');
    expect(support).toContain('A person or service that can offer information or support');
    expect(support).toContain('level.description');
  });

  it('trims saved values and preserves unrelated section data', () => {
    expect(support).toContain('var name = form.name.trim();');
    expect(support).toContain('role: form.role.trim()');
    expect(support).toContain('whyMatter: form.whyMatter.trim()');
    expect(support).toContain("setData(Object.assign({}, data, { people: [entry].concat(data.people || []) }))");
  });

  it('announces saves and restores entry focus', () => {
    expect(support).toContain("llAnnounce('Support contact saved: ' + name)");
    expect(support).toContain("focusById('learning-lab-support-name')");
  });

  it('discloses browser storage and suggests privacy-preserving labels', () => {
    expect(support).toContain('Names and notes save in this browser.');
    expect(support).toContain('Use a nickname or relationship label');
    expect(support).toContain("'aria-describedby': 'learning-lab-support-privacy-note'");
  });

  it('states that the tool does not contact or verify availability', () => {
    expect(support).toContain('Reference list only');
    expect(support).toContain('This tool does not contact anyone or confirm that a person is available.');
    expect(support).toContain("'aria-labelledby': 'learning-lab-support-about-heading'");
  });

  it('uses neutral copy rather than promising the list proves support exists', () => {
    expect(support).toContain('Make a private reference list of people or services you may choose to contact.');
    expect(support).not.toContain("visible reminder that you're not");
  });

  it('uses named semantic sections and lists for support groups', () => {
    expect(support).toContain("'aria-labelledby': 'learning-lab-support-list-heading'");
    expect(support).toContain("return hh('section', { key: 'cs-' + level.id, 'aria-labelledby': groupId");
    expect(support).toContain("hh('ul', { 'aria-label': level.label + ' contacts'");
  });

  it('uses semantic list items and labeled articles for contacts', () => {
    expect(support).toContain("return hh('li', { key: 'pe-' + entry.id }");
    expect(support).toContain("hh('article', { 'aria-labelledby': headingId");
    expect(support).toContain("String(entry.name || 'Unnamed contact')");
  });

  it('communicates support group in text rather than color alone', () => {
    expect(support).toContain("hh('p', { style: { margin: '0 0 4px', color: level.color");
    expect(support).toContain('level.label');
    expect(support).toContain('level.description');
  });

  it('uses definition-list and time semantics for contact details', () => {
    expect(support).toContain("hh('dl', { 'aria-label': 'Support contact details'");
    expect(support).toContain("hh('time', { dateTime: entry.addedAt || undefined }, relDate(entry.addedAt))");
  });

  it('presents contact notes in a named section and preserves whitespace', () => {
    expect(support).toContain("'aria-label': 'Contact note'");
    expect(support).toContain("whiteSpace: 'pre-wrap'");
  });

  it('confirms deletion through the accessible app dialog', () => {
    expect(support).toContain("title: 'Remove this support contact?', confirmText: 'Remove contact'");
    expect(support).toContain('This cannot be undone.');
    expect(support).not.toContain('confirm(');
  });

  it('names deletion, preserves data, announces removal, and restores focus', () => {
    expect(support).toContain("'aria-label': 'Remove support contact: ' + String(entry.name || 'Unnamed contact')");
    expect(support).toContain("setData(Object.assign({}, data, { people: (data.people || []).filter");
    expect(support).toContain("llAnnounce('Support contact removed.')");
    expect(support).toContain("focusById('learning-lab-support-list-heading')");
  });

  it('provides responsive fields and 44-pixel targets', () => {
    expect(support).toContain("gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))'");
    expect(support).toContain("gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))'");
    expect(support).toContain("width: '100%', minHeight: 44");
    expect(support).toContain("minWidth: 44, minHeight: 44");
    expect(support).toContain("minHeight: 88");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
