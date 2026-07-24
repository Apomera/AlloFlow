import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Personal Energy Tracker accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalEnergyTracker(props) {');
  const end = source.indexOf('  function PersonalQuestionLog(props) {', start);
  const tracker = source.slice(start, end);

  it('uses a named form with native submit behavior', () => {
    expect(tracker).toContain("hh('form', { onSubmit: function(event) { event.preventDefault(); save(); }, 'aria-labelledby': 'learning-lab-energy-form-heading' }");
    expect(tracker).toContain("hh('button', { type: 'submit'");
    expect(tracker).toContain("id: 'learning-lab-energy-form-heading'");
  });

  it('associates visible labels with every input', () => {
    expect(tracker).toContain("htmlFor: 'learning-lab-energy-hour'");
    expect(tracker).toContain("id: 'learning-lab-energy-hour', type: 'number'");
    expect(tracker).toContain("htmlFor: 'learning-lab-energy-level'");
    expect(tracker).toContain("id: 'learning-lab-energy-level', type: 'range'");
    expect(tracker).toContain("htmlFor: 'learning-lab-energy-activity'");
    expect(tracker).toContain("id: 'learning-lab-energy-activity', type: 'text'");
  });

  it('explains 24-hour input and enforces the full valid range', () => {
    expect(tracker).toContain('Use 24-hour time: 0 is midnight, 12 is noon, and 23 is 11 PM.');
    expect(tracker).toContain("type: 'number', min: 0, max: 23, step: 1");
  });

  it('reports and focuses an invalid hour inline', () => {
    expect(tracker).toContain("setHourError('Enter an hour from 0 through 23.')");
    expect(tracker).toContain("focusById('learning-lab-energy-hour')");
    expect(tracker).toContain("id: 'learning-lab-energy-hour-error', role: 'alert'");
    expect(tracker).toContain("'aria-invalid': hourError ? 'true' : undefined");
  });

  it('exposes numeric energy output and descriptive range value text', () => {
    expect(tracker).toContain("hh('output', { htmlFor: 'learning-lab-energy-level'");
    expect(tracker).toContain("'aria-valuetext': form.level + ' out of 10, from very low energy to very high energy'");
    expect(tracker).toContain("form.level + ' / 10'");
  });

  it('visibly identifies the optional activity field', () => {
    expect(tracker).toContain("'Activity or context (optional)'");
    expect(tracker).toContain("maxLength: 500");
  });

  it('discloses local saving and private-note considerations', () => {
    expect(tracker).toContain('Energy logs save in this browser only');
    expect(tracker).toContain('if your activity notes are private');
    expect(tracker).toContain("'aria-describedby': 'learning-lab-energy-privacy-note'");
  });

  it('trims activity text and preserves unrelated section data', () => {
    expect(tracker).toContain('what: form.what.trim()');
    expect(tracker).toContain("setData(Object.assign({}, data, { logs: [entry].concat(rawEnergyLogs) }))");
    expect(tracker).toContain("setData(Object.assign({}, data, { logs: rawEnergyLogs.filter");
  });

  it('announces saved energy value and time', () => {
    expect(tracker).toContain("llAnnounce('Energy log saved for ' + formatHour(entry.hour) + ': ' + entry.level + ' out of 10.')");
  });

  it('includes every valid hour in the chart calculation', () => {
    expect(tracker).toContain('for (var hour = 0; hour <= 23; hour++)');
    expect(tracker).not.toContain('for (var h = 6; h <= 23; h++)');
  });

  it('ignores invalid legacy hours when calculating averages', () => {
    expect(tracker).toContain('if (!Number.isFinite(hour) || hour < 0 || hour > 23) return;');
  });

  it('uses a named semantic list for the 24-hour chart', () => {
    expect(tracker).toContain("'aria-labelledby': 'learning-lab-energy-chart-heading'");
    expect(tracker).toContain("hh('ul', { 'aria-label': 'Average energy across all 24 hours'");
    expect(tracker).toContain("return hh('li', { key: 'eh-' + item.hour");
  });

  it('provides hour, average, and count text for every chart column', () => {
    expect(tracker).toContain("'aria-label': formatHour(item.hour)");
    expect(tracker).toContain("'Average energy ' + averageText + ' out of 10 from '");
    expect(tracker).toContain("item.count === 1 ? ' log' : ' logs'");
  });

  it('marks visual bars decorative and removes motion', () => {
    expect(tracker).toContain("hh('div', { 'aria-hidden': 'true', style: { height: 56");
    expect(tracker).not.toContain("transition: 'height 300ms ease'");
    expect(tracker).not.toContain('title: h.hour');
  });

  it('explains that color is supplemental', () => {
    expect(tracker).toContain('Color is only an additional cue.');
  });

  it('presents the highest average as a named, non-prescriptive observation', () => {
    expect(tracker).toContain("'aria-labelledby': 'learning-lab-energy-peak-heading'");
    expect(tracker).toContain("id: 'learning-lab-energy-peak-heading'");
    expect(tracker).toContain('not a fixed prescription');
  });

  it('uses a semantic recent-history list with labeled articles', () => {
    expect(tracker).toContain("'aria-labelledby': 'learning-lab-energy-history-heading'");
    expect(tracker).toContain("return hh('li', { key: 'el-' + log.id");
    expect(tracker).toContain("hh('article', { 'aria-labelledby': headingId");
  });

  it('uses definition-list and time semantics for log details', () => {
    expect(tracker).toContain("hh('time', { dateTime: dateTime }");
    expect(tracker).toContain("Math.max(0, Math.min(10, Number(log.level) || 0)) + ' out of 10'");
    expect(tracker).toContain("'Activity or context'");
  });

  it('confirms deletion through the accessible app dialog', () => {
    expect(tracker).toContain("title: 'Remove this energy log?', confirmText: 'Remove log'");
    expect(tracker).not.toContain('confirm(');
  });

  it('names deletion controls and restores focus after removal', () => {
    expect(tracker).toContain("'aria-label': 'Remove energy log from ' + whenText");
    expect(tracker).toContain("llAnnounce('Energy log removed.')");
    expect(tracker).toContain("focusById('learning-lab-energy-history-heading')");
  });

  it('provides 44-pixel fields and controls', () => {
    expect(tracker).toContain("width: '100%', minHeight: 44");
    expect(tracker).toContain("minWidth: 44, minHeight: 44");
    expect(tracker).toContain("minHeight: 44, padding: '9px 14px'");
  });

  it('handles malformed legacy energy data and renders all logs without a cap', () => {
    expect(tracker).toContain('var rawEnergyLogs = Array.isArray(data.logs) ? data.logs : [];');
    expect(tracker).toContain('var logs = rawEnergyLogs.filter(isRecord);');
    expect(tracker).toContain("if (!Number.isFinite(normalized) || normalized < 0 || normalized > 23) return 'an unrecorded time';");
    expect(tracker).toContain("var whenText = (logDate || 'Date not recorded') + ' at ' + formatHour(log.hour);");
    expect(tracker).toContain('logs.map(function(log)');
    expect(tracker).not.toContain('.slice(0, 20)');
    expect(source).toContain("stat: (Array.isArray((data.mytkEnergy || {}).logs) ? (data.mytkEnergy || {}).logs.length : 0) + ' logs'");
  });

  it('states that saving never sends or notifies anyone', () => {
    expect(tracker).toContain('saving does not send them to or notify anyone');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
