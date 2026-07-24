import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Body Awareness accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalBodyCheck(props) {');
  const end = source.indexOf('  function PersonalAchievementWall(props) {', start);
  const body = source.slice(start, end);

  it('uses a named form with native submit behavior', () => {
    expect(body).toContain("onSubmit: function(event) { event.preventDefault(); save(); }");
    expect(body).toContain("'aria-labelledby': 'learning-lab-body-form-heading'");
    expect(body).toContain("id: 'learning-lab-body-form-heading', tabIndex: -1");
    expect(body).toContain("type: 'submit'");
  });

  it('provides a visible shared scale explanation', () => {
    expect(body).toContain('For every slider, 1 means very uncomfortable and 10 means very comfortable.');
    expect(body).toContain('Five is selected initially; change any rating that does not fit.');
    expect(body).toContain("id: 'learning-lab-body-scale-help'");
  });

  it('programmatically labels every body-area range', () => {
    expect(body).toContain("var inputId = 'learning-lab-body-area-' + area.id");
    expect(body).toContain("hh('label', { htmlFor: inputId");
    expect(body).toContain("id: inputId, type: 'range', min: 1, max: 10, step: 1");
  });

  it('exposes visible outputs and descriptive range value text', () => {
    expect(body).toContain("hh('output', { id: outputId, htmlFor: inputId");
    expect(body).toContain("value + ' out of 10'");
    expect(body).toContain("'aria-valuetext': ratingText(value)");
    expect(body).toContain('1 is very uncomfortable and 10 is very comfortable');
  });

  it('labels the overall range and exposes its numeric output', () => {
    expect(body).toContain("htmlFor: 'learning-lab-body-overall'");
    expect(body).toContain("id: 'learning-lab-body-overall-value', htmlFor: 'learning-lab-body-overall'");
    expect(body).toContain("id: 'learning-lab-body-overall', type: 'range'");
    expect(body).toContain("'aria-valuetext': ratingText(form.overall)");
  });

  it('associates a visible optional label with the notes field', () => {
    expect(body).toContain("htmlFor: 'learning-lab-body-note'");
    expect(body).toContain("'Notes (optional)'");
    expect(body).toContain("id: 'learning-lab-body-note', value: form.note, rows: 3, maxLength: 1500");
  });

  it('records explicit defaults for all eight body areas', () => {
    expect(body).toContain('BODY_AREAS.forEach(function(area) { areas[area.id] = normalizedRating((form.areas || {})[area.id]); });');
    expect(body).toContain("return Number.isFinite(number) && number >= 1 && number <= 10 ? number : 5;");
  });

  it('trims notes and preserves unrelated section data', () => {
    expect(body).toContain('note: form.note.trim()');
    expect(body).toContain("setData(Object.assign({}, data, { checks: [entry].concat(rawChecks) }))");
  });

  it('announces the saved value and moves focus to history', () => {
    expect(body).toContain("llAnnounce('Body comfort check saved. Overall comfort: ' + entry.overall + ' out of 10.')");
    expect(body).toContain("focusById('learning-lab-body-history-heading')");
  });

  it('discloses browser storage and shared-device privacy considerations', () => {
    expect(body).toContain('Checks save in this browser only; saving does not send them to or notify anyone.');
    expect(body).toContain('Avoid private health details if other people use this device.');
    expect(body).toContain("'aria-describedby': 'learning-lab-body-scale-help learning-lab-body-privacy-note'");
  });

  it('uses a named aside for non-diagnostic safety guidance', () => {
    expect(body).toContain("hh('aside', {");
    expect(body).toContain("'aria-labelledby': 'learning-lab-body-safety-heading'");
    expect(body).toContain('Personal reflection, not a medical assessment');
    expect(body).toContain('This check cannot explain or diagnose symptoms.');
  });

  it('removes unsupported trauma and emotional-regulation claims', () => {
    expect(body).not.toContain('van der Kolk');
    expect(body).not.toContain('trauma + chronic stress live in the body');
    expect(body).not.toContain('Better interoception = better emotional regulation');
  });

  it('communicates today status with text and a numeric value', () => {
    expect(body).toContain("'aria-labelledby': 'learning-lab-body-today-heading'");
    expect(body).toContain("'Today’s body check is recorded'");
    expect(body).toContain("'Overall comfort: ' + normalizedRating(todayCheck.overall) + ' out of 10.'");
  });

  it('uses a named semantic history list with labeled articles', () => {
    expect(body).toContain("'aria-labelledby': 'learning-lab-body-history-heading'");
    expect(body).toContain("hh('ul', { 'aria-label': 'Most recent body comfort checks'");
    expect(body).toContain("return hh('li', { key: 'bc-' + entry.id }");
    expect(body).toContain("hh('article', { 'aria-labelledby': headingId");
  });

  it('communicates historical scores with text rather than color alone', () => {
    expect(body).toContain("'Overall comfort: ' + overall + ' out of 10'");
    expect(body).not.toContain("var col = c.overall");
  });

  it('uses time semantics with a safe legacy timestamp fallback', () => {
    expect(body).toContain('if (!Number.isNaN(date.getTime())) return date.toISOString();');
    expect(body).toContain("hh('time', { dateTime: entryDateTime(entry) }, relDate(textValue(entry.date).trim()))");
  });

  it('makes complete area ratings available in a definition list', () => {
    expect(body).toContain("'Review area ratings'");
    expect(body).toContain("hh('dl', { 'aria-label': 'Body area comfort ratings'");
    expect(body).toContain("value + ' out of 10'");
  });

  it('explains the ten-check history limit', () => {
    expect(body).toContain('var recentChecks = checks.slice(0, 10);');
    expect(body).toContain("'Showing the 10 most recent checks out of ' + checks.length + '.'");
  });

  it('confirms deletion through the accessible app dialog', () => {
    expect(body).toContain("title: 'Remove this body check?', confirmText: 'Remove check'");
    expect(body).toContain('This cannot be undone.');
    expect(body).not.toContain('confirm(');
  });

  it('names deletion, preserves data, announces removal, and restores useful focus', () => {
    expect(body).toContain("'aria-label': 'Remove body check from ' + (textValue(entry.date).trim() || 'unknown date')");
    expect(body).toContain("setData(Object.assign({}, data, { checks: rawChecks.filter");
    expect(body).toContain("llAnnounce('Body comfort check removed.')");
    expect(body).toContain("entry.date === todayISO() ? 'learning-lab-body-form-heading' : 'learning-lab-body-history-heading'");
  });

  it('provides responsive fields and 44-pixel controls', () => {
    expect(body).toContain("gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))'");
    expect(body).toContain("width: '100%', minHeight: 44");
    expect(body).toContain("minWidth: 44, minHeight: 44");
    expect(body).toContain("width: '100%', minHeight: 88");
  });

  it('handles malformed legacy check data without crashing', () => {
    expect(body).toContain('var rawChecks = Array.isArray(data.checks) ? data.checks : [];');
    expect(body).toContain('var checks = rawChecks.filter(isRecord);');
    expect(source).toContain("stat: (Array.isArray((data.mytkBody || {}).checks) ? (data.mytkBody || {}).checks.length : 0) + ' scans'");
  });

  it('synchronizes focus with rendered state instead of a focus timer', () => {
    expect(body).toContain('if (!pendingFocusId) return;');
    expect(body).toContain('function focusById(id) { setPendingFocusId(id); }');
    expect(body).not.toContain('setTimeout');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
