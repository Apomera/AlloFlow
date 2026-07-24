import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Role Models accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalRoleModels(props) {');
  const end = source.indexOf('  function PersonalSelfAssessment(props) {', start);
  const models = source.slice(start, end);

  it('uses a named form with native submit behavior', () => {
    expect(models).toContain("onSubmit: function(event) { event.preventDefault(); save(); }");
    expect(models).toContain("'aria-labelledby': 'learning-lab-role-model-form-heading'");
    expect(models).toContain("id: 'learning-lab-role-model-form-heading'");
    expect(models).toContain("type: 'submit'");
  });

  it('associates visible labels with all four fields', () => {
    expect(models).toContain("htmlFor: 'learning-lab-role-model-icon'");
    expect(models).toContain("htmlFor: 'learning-lab-role-model-name'");
    expect(models).toContain("htmlFor: 'learning-lab-role-model-who'");
    expect(models).toContain("htmlFor: 'learning-lab-role-model-admire'");
  });

  it('visibly distinguishes required and optional fields', () => {
    expect(models).toContain("'Symbol (optional)'");
    expect(models).toContain("'Name (required)'");
    expect(models).toContain("'Description (optional)'");
    expect(models).toContain("'Qualities or actions you appreciate (optional)'");
  });

  it('reports and focuses a missing name inline', () => {
    expect(models).toContain("setNameError('Enter the role model’s name or character name.')");
    expect(models).toContain("focusById('learning-lab-role-model-name')");
    expect(models).toContain("id: 'learning-lab-role-model-name-error', role: 'alert'");
    expect(models).toContain("'aria-invalid': nameError ? 'true' : undefined");
    expect(models).not.toContain("alert('Need a name.')");
  });

  it('uses native constraints and reasonable length limits', () => {
    expect(models).toContain("required: true, maxLength: 300");
    expect(models).toContain("maxLength: 12");
    expect(models).toContain("maxLength: 500");
    expect(models).toContain("rows: 3, maxLength: 2000");
  });

  it('trims saved values and preserves unrelated section data', () => {
    expect(models).toContain('var name = form.name.trim();');
    expect(models).toContain('who: form.who.trim(), admire: form.admire.trim(), icon: form.icon.trim()');
    expect(models).toContain("setData(Object.assign({}, data, { models: [entry].concat(rawModels) }))");
  });

  it('announces saves and restores entry focus', () => {
    expect(models).toContain("llAnnounce('Role model saved: ' + name)");
    expect(models).toContain("focusById('learning-lab-role-model-name')");
  });

  it('discloses local storage and real-person privacy considerations', () => {
    expect(models).toContain('Role models and reflections save in this browser only; saving does not send them to or notify anyone.');
    expect(models).toContain('Avoid private details about real people if other people use this device.');
    expect(models).toContain("'aria-describedby': 'learning-lab-role-model-privacy-note'");
  });

  it('uses neutral language without claiming admiration proves values', () => {
    expect(models).toContain('Record people or characters and the qualities you appreciate in them.');
    expect(models).not.toContain('What you admire shows you what you value.');
  });

  it('uses a named semantic list with labeled articles', () => {
    expect(models).toContain("'aria-labelledby': 'learning-lab-role-model-history-heading'");
    expect(models).toContain("hh('ul', { 'aria-label': models.length");
    expect(models).toContain("return hh('li', { key: 'rm-' + entry.id }");
    expect(models).toContain("hh('article', { 'aria-labelledby': headingId");
  });

  it('marks symbols decorative and provides a legacy name fallback', () => {
    expect(models).toContain("hh('span', { 'aria-hidden': 'true'");
    expect(models).toContain("textValue(entry.name).trim() || 'Unnamed role model'");
  });

  it('uses definition-list and time semantics for details', () => {
    expect(models).toContain("hh('dl', { 'aria-label': 'Role model details'");
    expect(models).toContain("hh('time', { dateTime: textValue(entry.addedAt).trim() || undefined }, relDate(textValue(entry.addedAt).trim()))");
  });

  it('presents appreciation text in a named section and preserves whitespace', () => {
    expect(models).toContain("'aria-label': 'Qualities or actions I appreciate'");
    expect(models).toContain("whiteSpace: 'pre-wrap'");
  });

  it('confirms deletion through the accessible app dialog', () => {
    expect(models).toContain("title: 'Remove this role model?', confirmText: 'Remove role model'");
    expect(models).toContain('This cannot be undone.');
    expect(models).not.toContain('confirm(');
  });

  it('names deletion, preserves data, announces removal, and restores focus', () => {
    expect(models).toContain("'aria-label': 'Remove role model: ' + (textValue(entry.name).trim() || 'Unnamed role model')");
    expect(models).toContain("setData(Object.assign({}, data, { models: rawModels.filter");
    expect(models).toContain("llAnnounce('Role model removed.')");
    expect(models).toContain("focusById('learning-lab-role-model-history-heading')");
  });

  it('provides responsive fields and 44-pixel control targets', () => {
    expect(models).toContain("gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))'");
    expect(models).toContain("width: '100%', minHeight: 44");
    expect(models).toContain("minWidth: 44, minHeight: 44");
    expect(models).toContain("minHeight: 88");
  });

  it('handles malformed legacy role model data without crashing', () => {
    expect(models).toContain('var rawModels = Array.isArray(data.models) ? data.models : [];');
    expect(models).toContain('var models = rawModels.filter(isRecord);');
    expect(source).toContain("stat: (Array.isArray((data.mytkRole || {}).models) ? (data.mytkRole || {}).models.length : 0) + ' models'");
  });

  it('synchronizes focus with rendered state instead of a focus timer', () => {
    expect(models).toContain('if (!pendingFocusId) return;');
    expect(models).toContain('function focusById(id) { setPendingFocusId(id); }');
    expect(models).not.toContain('setTimeout');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
