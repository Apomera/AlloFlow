import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Cognitive Load Monitor revised accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalCognitiveLoadMonitor(props) {');
  const end = source.indexOf('  function PersonalMotivationAudit(props) {', start);
  const monitor = source.slice(start, end);

  it('uses stable headings and effect-based focus restoration', () => {
    for (const id of ['learning-lab-load-heading', 'learning-lab-load-form-heading', 'learning-lab-load-today-heading', 'learning-lab-load-history-heading']) expect(monitor).toContain("'" + id + "'");
    expect(monitor).toContain('document.getElementById(focusTarget)');
  });

  it('uses optional private self-report framing and shared-device guidance', () => {
    expect(monitor).toContain('An optional private self-report for noticing task demands and context over time.');
    expect(monitor).toContain('Check-ins save in this browser.');
    expect(monitor).toContain('avoid details you would not want another user to see');
    expect(monitor).toContain('You may skip any context factor or note.');
  });

  it('uses a native named form with labelled, described rating controls', () => {
    expect(monitor).toContain("hh('form', { 'aria-labelledby': 'learning-lab-load-form-heading'");
    expect(monitor).toContain("htmlFor: 'learning-lab-load-' + scale.id");
    expect(monitor).toContain("id: 'learning-lab-load-' + scale.id, type: 'range'");
    expect(monitor).toContain("'aria-describedby': 'learning-lab-load-help-' + scale.id + ' learning-lab-load-scale-help'");
    expect(monitor).toContain("'aria-valuetext': form[scale.id] + ' out of 10'");
    expect(monitor).toContain("type: 'submit', 'data-ll-focusable': true");
  });

  it('does not add subjective dimensions into an overload label', () => {
    expect(monitor).toContain('These ratings are not added into a clinical or diagnostic score.');
    expect(monitor).not.toContain('var totalLoad');
    expect(monitor).not.toContain('overload zone');
    expect(monitor).not.toContain("totalLoad + '/30'");
  });

  it('uses non-causal optional context framing and visible pressed choices', () => {
    expect(monitor).toContain('Context factors (optional; select any that fit)');
    expect(monitor).toContain('they do not identify a cause or diagnosis');
    expect(monitor).toContain("'aria-pressed': selected");
    expect(monitor).toContain("hh('span', { 'aria-hidden': 'true' }, trigger.icon + ' ')");
    expect(monitor).not.toContain('Overwhelm triggers (select all that apply)');
  });

  it('bounds and describes optional notes', () => {
    expect(monitor).toContain("id: 'learning-lab-load-notes', value: form.notes, rows: 3, maxLength: 2000");
    expect(monitor).toContain("'aria-describedby': 'learning-lab-load-notes-help'");
    expect(monitor).toContain('Avoid sensitive details on a shared device.');
  });

  it('edits or replaces one entry for today while preserving sibling state', () => {
    expect(monitor).toContain('var existing = todayEntry || null');
    expect(monitor).toContain('entries.filter(function(candidate) { return candidate.date !== today; })');
    expect(monitor).toContain("setData(Object.assign({}, data, { entries: [entry].concat(remaining) }))");
    expect(monitor).not.toContain('setData({ entries:');
  });

  it('announces edit, save, cancel, and delete outcomes', () => {
    expect(monitor).toContain("llAnnounce('Today\\'s check-in opened for editing.')");
    expect(monitor).toContain("llAnnounce('Check-in editing canceled.')");
    expect(monitor).toContain("llAnnounce(existing ? 'Cognitive-load check-in changes saved.' : 'Cognitive-load check-in saved.')");
    expect(monitor).toContain("llAnnounce('Cognitive-load check-in deleted.')");
  });

  it('uses date-only UTC-safe history calculations', () => {
    expect(monitor).toContain('Date.UTC(parts[0], parts[1] - 1, parts[2])');
    expect(monitor).toContain('isoFromDayNumber(currentDay - dayOffset)');
    expect(monitor).not.toContain('dt.toISOString().slice(0, 10)');
  });

  it('exposes exact seven-day ratings in a semantic table', () => {
    expect(monitor).toContain("hh('table', { style:");
    expect(monitor).toContain("hh('caption'");
    expect(monitor).toContain("scope: 'col'");
    expect(monitor).toContain("scope: 'row'");
    expect(monitor).toContain("hh('time', { dateTime: day.date }");
    expect(monitor).toContain("hh('div', { 'aria-hidden': 'true'");
    expect(monitor).not.toContain("role: 'img'");
  });

  it('uses semantic history with explicit units, machine-readable dates, and safe wrapping', () => {
    expect(monitor).toContain("'aria-labelledby': 'learning-lab-load-history-heading'");
    expect(monitor).toContain("hh('time', { dateTime: entry.date }");
    expect(monitor).toContain("entry[scale.id] + ' out of 10'");
    expect(monitor).toContain("whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'");
  });

  it('confirms deletion, preserves siblings, announces it, and restores focus', () => {
    expect(monitor).toContain("title: 'Delete this check-in?', confirmText: 'Delete check-in'");
    expect(monitor).toContain("setData(Object.assign({}, data, { entries: remaining }))");
    expect(monitor).toContain("setFocusTarget('learning-lab-load-form-heading')");
  });

  it('provides a qualified evidence-and-limits disclosure and accurate catalog copy', () => {
    expect(monitor).toContain("'aria-labelledby': 'learning-lab-load-evidence-heading'");
    expect(monitor).toContain('terminology and measurement approaches have evolved');
    expect(monitor).toContain('not validated scales');
    expect(monitor).toContain('not a medical, mental-health, or learning-disability assessment');
    expect(source).toContain('Optional self-report on task demands and context; not a diagnostic score.');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
