import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Achievement Wall accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalAchievementWall(props) {');
  const end = source.indexOf('  function PersonalAffirmations(props) {', start);
  const wall = source.slice(start, end);

  it('uses a named form with native submit behavior', () => {
    expect(wall).toContain("onSubmit: function(event) { event.preventDefault(); save(); }");
    expect(wall).toContain("'aria-labelledby': 'learning-lab-achievement-form-heading'");
    expect(wall).toContain("id: 'learning-lab-achievement-form-heading'");
    expect(wall).toContain("type: 'submit'");
  });

  it('associates visible labels with all entry fields', () => {
    expect(wall).toContain("htmlFor: 'learning-lab-achievement-title'");
    expect(wall).toContain("htmlFor: 'learning-lab-achievement-date'");
    expect(wall).toContain("htmlFor: 'learning-lab-achievement-reflection'");
    expect(wall).toContain("'Achievement (required)'");
    expect(wall).toContain("'Achievement date (required)'");
    expect(wall).toContain("'Reflection (optional)'");
  });

  it('uses native constraints and inline errors for a missing title', () => {
    expect(wall).toContain("id: 'learning-lab-achievement-title', type: 'text', value: form.title, required: true, maxLength: 500");
    expect(wall).toContain("nextErrors.title = 'Describe the achievement you want to record.'");
    expect(wall).toContain("id: 'learning-lab-achievement-title-error', role: 'alert'");
    expect(wall).toContain("'aria-invalid': errors.title ? 'true' : undefined");
    expect(wall).not.toContain("alert('Need a title.')");
  });

  it('constrains dates to today or earlier and validates scripted submissions', () => {
    expect(wall).toContain("type: 'date', value: form.date, required: true, max: todayISO()");
    expect(wall).toContain("else if (form.date > todayISO()) nextErrors.date = 'Choose today or an earlier date.'");
    expect(wall).toContain("id: 'learning-lab-achievement-date-error', role: 'alert'");
    expect(wall).toContain("focusById(nextErrors.title ? 'learning-lab-achievement-title' : 'learning-lab-achievement-date')");
  });

  it('uses a fieldset, legend, and native radios for category', () => {
    expect(wall).toContain("hh('fieldset'");
    expect(wall).toContain("hh('legend', { style: labelStyle }, 'Category')");
    expect(wall).toContain("type: 'radio', name: 'learning-lab-achievement-category'");
    expect(wall).toContain('checked: selected');
  });

  it('keeps category emoji decorative while preserving category text', () => {
    expect(wall).toContain("hh('span', { 'aria-hidden': 'true' }, category.icon), category.label");
    expect(wall).toContain("category.label");
  });

  it('trims entry text and preserves unrelated section data', () => {
    expect(wall).toContain('var title = form.title.trim();');
    expect(wall).toContain('reflection: form.reflection.trim()');
    expect(wall).toContain("setData(Object.assign({}, data, { achievements: [entry].concat(rawAchievements) }))");
  });

  it('announces saves and returns focus for another entry', () => {
    expect(wall).toContain("llAnnounce('Achievement saved: ' + title)");
    expect(wall).toContain("focusById('learning-lab-achievement-title')");
  });

  it('discloses local storage and shared-device privacy considerations', () => {
    expect(wall).toContain('Achievements save in this browser only; saving does not send them to or notify anyone.');
    expect(wall).toContain('Avoid private details if other people use this device.');
    expect(wall).toContain("'aria-describedby': 'learning-lab-achievement-privacy-note'");
  });

  it('uses neutral user-directed language without the unsupported imposter claim', () => {
    expect(wall).toContain('Keep a personal record of accomplishments that matter to you.');
    expect(wall).toContain('Use your own definition of achievement');
    expect(wall).not.toContain('counters imposter syndrome');
  });

  it('uses a named semantic gallery list with labeled articles', () => {
    expect(wall).toContain("'aria-labelledby': 'learning-lab-achievement-history-heading'");
    expect(wall).toContain("hh('ul', { 'aria-label': achievements.length");
    expect(wall).toContain("return hh('li', { key: 'av-' + entry.id }");
    expect(wall).toContain("hh('article', {");
    expect(wall).toContain("'aria-labelledby': headingId");
  });

  it('communicates category in text instead of relying on card color', () => {
    expect(wall).toContain("category.label");
    expect(wall).toContain("hh('dt', { style: { fontWeight: 800 } }, 'Category')");
    expect(wall).toContain("hh('dd', { style: { margin: 0 } }, category.label)");
  });

  it('uses definition-list and time semantics for details', () => {
    expect(wall).toContain("hh('dl', { 'aria-label': 'Achievement details'");
    expect(wall).toContain("hh('time', { dateTime: textValue(entry.date).trim() || undefined }, relDate(textValue(entry.date).trim()))");
  });

  it('presents reflections as a named section and preserves whitespace', () => {
    expect(wall).toContain("textValue(entry.reflection).trim() ? hh('section', { 'aria-label': 'Reflection'");
    expect(wall).toContain("whiteSpace: 'pre-wrap'");
  });

  it('provides a fallback title for legacy entries', () => {
    expect(wall).toContain("textValue(entry.title).trim() || 'Untitled achievement'");
  });

  it('confirms deletion through the accessible app dialog', () => {
    expect(wall).toContain("title: 'Remove this achievement?', confirmText: 'Remove achievement'");
    expect(wall).toContain('This cannot be undone.');
    expect(wall).not.toContain('confirm(');
  });

  it('names deletion, preserves data, announces removal, and restores focus', () => {
    expect(wall).toContain("'aria-label': 'Remove achievement: ' + (textValue(entry.title).trim() || 'Untitled achievement')");
    expect(wall).toContain("setData(Object.assign({}, data, { achievements: rawAchievements.filter");
    expect(wall).toContain("llAnnounce('Achievement removed.')");
    expect(wall).toContain("focusById('learning-lab-achievement-history-heading')");
  });

  it('provides responsive fields and 44-pixel control targets', () => {
    expect(wall).toContain("gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))'");
    expect(wall).toContain("width: '100%', minHeight: 44");
    expect(wall).toContain("minWidth: 44, minHeight: 44");
    expect(wall).toContain("minHeight: 88");
  });

  it('handles malformed legacy achievement data without crashing', () => {
    expect(wall).toContain('var rawAchievements = Array.isArray(data.achievements) ? data.achievements : [];');
    expect(wall).toContain('var achievements = rawAchievements.filter(isRecord);');
    expect(source).toContain("stat: (Array.isArray((data.mytkAchieve || {}).achievements) ? (data.mytkAchieve || {}).achievements.length : 0) + ' achievements'");
  });

  it('synchronizes focus with rendered state instead of a focus timer', () => {
    expect(wall).toContain('if (!pendingFocusId) return;');
    expect(wall).toContain('function focusById(id) { setPendingFocusId(id); }');
    expect(wall).not.toContain('setTimeout');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
