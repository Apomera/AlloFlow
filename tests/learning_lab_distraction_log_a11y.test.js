import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Distraction Log accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalDistractionLog(props) {');
  const end = source.indexOf('  function PersonalSearchHub(props) {', start);
  const log = source.slice(start, end);

  it('uses a named form with native submit behavior', () => {
    expect(log).toContain("onSubmit: function(event) { event.preventDefault(); logDistraction(); }");
    expect(log).toContain("'aria-labelledby': 'learning-lab-distraction-form-heading'");
    expect(log).toContain("hh('button', { type: 'submit'");
  });

  it('uses a fieldset and native radio group for distraction sources', () => {
    expect(log).toContain("hh('fieldset', { 'aria-invalid': sourceError ? 'true' : undefined");
    expect(log).toContain("hh('legend', { style: labelStyle }, 'Distraction source (required)')");
    expect(log).toContain("id: 'learning-lab-distraction-source-' + source.id, type: 'radio'");
    expect(log).toContain("name: 'learning-lab-distraction-source'");
    expect(log).toContain('checked: selected, required: true');
  });

  it('reports and focuses a missing source without a browser alert', () => {
    expect(log).toContain("setSourceError('Choose a distraction source before logging.')");
    expect(log).toContain("document.getElementById('learning-lab-distraction-source-phone')");
    expect(log).toContain("id: 'learning-lab-distraction-source-error', role: 'alert'");
    expect(log).not.toContain("alert('Pick a distraction source.')");
  });

  it('associates the context and duration fields with labels', () => {
    expect(log).toContain("htmlFor: 'learning-lab-distraction-context'");
    expect(log).toContain("id: 'learning-lab-distraction-context'");
    expect(log).toContain("htmlFor: 'learning-lab-distraction-duration'");
    expect(log).toContain("id: 'learning-lab-distraction-duration', type: 'range'");
  });

  it('connects the duration range to help and a live output', () => {
    expect(log).toContain("id: 'learning-lab-distraction-duration-output', htmlFor: 'learning-lab-distraction-duration', 'aria-live': 'polite'");
    expect(log).toContain("'aria-describedby': 'learning-lab-distraction-duration-help'");
    expect(log).toContain('Choose from 1 to 60 minutes.');
  });

  it('normalizes submitted duration and context values', () => {
    expect(log).toContain('context: form.context.trim()');
    expect(log).toContain('durationMin: Math.max(1, Math.min(60, Number(form.durationMin) || 5))');
  });

  it('preserves unrelated section data when saving and deleting', () => {
    expect(log).toContain("setData(Object.assign({}, data, { events: [entry].concat(data.events || []) }))");
    expect(log).toContain("setData(Object.assign({}, data, { events: (data.events || []).filter");
  });

  it('announces additions and deletions', () => {
    expect(log).toContain("llAnnounce('Distraction logged: '");
    expect(log).toContain("llAnnounce('Distraction entry deleted.')");
  });

  it('confirms deletion in an accessible app dialog', () => {
    expect(log).toContain("title: 'Delete this distraction entry?', confirmText: 'Delete entry'");
    expect(log).not.toContain('confirm(');
  });

  it('uses semantic sections and lists for rankings and history', () => {
    expect(log).toContain("'aria-labelledby': 'learning-lab-distraction-top-heading'");
    expect(log).toContain("hh('ol', { style:");
    expect(log).toContain("'aria-labelledby': 'learning-lab-distraction-recent-heading'");
    expect(log).toContain("hh('ul', { style:");
    expect(log).toContain("hh('article', { 'aria-label': source.label + ' distraction, '");
  });

  it('does not rely on color alone for source selection or ranking', () => {
    expect(log).toContain("type: 'radio'");
    expect(log).toContain("hh('span', null, hh('span', { 'aria-hidden': 'true' }, source.icon + ' '), source.label)");
    expect(log).toContain("'aria-label': 'Rank ' + (index + 1)");
    expect(log).toContain("item.count + (item.count === 1 ? ' event · ' : ' events · ')");
  });

  it('provides machine-readable event times', () => {
    expect(log).toContain("hh('time', { dateTime: eventDate.toISOString() }");
    expect(log).toContain("validDate ? hh('time'");
  });

  it('provides named 44-pixel controls and fields', () => {
    expect(log).toContain("'aria-label': 'Delete ' + source.label.toLowerCase() + ' distraction entry'");
    expect(log).toContain('minWidth: 44, minHeight: 44');
    expect(log).toContain('minHeight: 44, padding:');
    expect(log).toContain("width: '100%', minHeight: 44");
  });

  it('exposes explanatory guidance as a named aside', () => {
    expect(log).toContain("hh('aside', { 'aria-label': 'Why logging distractions helps'");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('prismflow-deploy/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
