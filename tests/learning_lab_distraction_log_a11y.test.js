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

  it('frames attention entries as optional and non-diagnostic', () => {
    expect(log).toContain('Record an interruption, attention shift, or context only if useful.');
    expect(log).toContain('not diagnoses, behavior ratings, evidence of effort, or proof that something was a problem');
    expect(log).toContain('This log cannot determine a cause or recommend a support.');
  });

  it('provides privacy and data-control guidance', () => {
    expect(log).toContain('Contexts can reveal schedules, relationships, health information, work, or identity.');
    expect(log).toContain('does not itself notify a teacher, school, employer, clinician, or family member');
    expect(log).toContain('edit or delete entries you no longer want stored');
  });

  it('uses blank optional native controls rather than required causes or default time', () => {
    expect(log).toContain("var EMPTY_FORM = { source: '', context: '', durationMin: '' }");
    expect(log).toContain("hh('select', { id: 'learning-lab-distraction-source'");
    expect(log).toContain("hh('option', { value: '' }, 'Not recorded')");
    expect(log).toContain("id: 'learning-lab-distraction-duration', type: 'number'");
    expect(log).not.toContain('Distraction source (required)');
    expect(log).not.toContain('durationMin: 5');
    expect(log).not.toContain("type: 'range'");
  });

  it('uses neutral category labels while preserving stored category IDs', () => {
    expect(log).toContain("{ id: 'phone', label: 'Device or notification'");
    expect(log).toContain("{ id: 'thoughts', label: 'Thought or memory'");
    expect(log).toContain("{ id: 'hungry', label: 'Physical need or fatigue'");
    expect(log).toContain("{ id: 'bored', label: 'Task interest or fit'");
    expect(log).toContain("{ id: 'overwhelm', label: 'Stress or overload'");
  });

  it('requires only one detail and conditionally reports errors', () => {
    expect(log).toContain('Enter at least one optional detail before saving.');
    expect(log).toContain('Enter an approximate duration from 1 to 1,440 minutes, or leave it blank.');
    expect(log).toContain("errors.detail ? hh('p', { id: 'learning-lab-distraction-detail-error', role: 'alert'");
    expect(log).toContain("errors.duration ? hh('p', { id: 'learning-lab-distraction-duration-error', role: 'alert'");
    expect(log).toContain("queueFocus(nextErrors.detail ? 'learning-lab-distraction-source' : 'learning-lab-distraction-duration')");
  });

  it('supports editing, dirty cancellation, and focus recovery', () => {
    expect(log).toContain('function startEdit(entry)');
    expect(log).toContain("title: 'Discard unsaved changes?', confirmText: 'Discard changes'");
    expect(log).toContain("queueFocus('learning-lab-distraction-form-heading')");
    expect(log).toContain("queueFocus('learning-lab-distraction-entry-heading-' + entry.id)");
    expect(log).toContain("queueFocus('learning-lab-distraction-history-heading')");
  });

  it('preserves legacy identity, dates, and unrelated section data', () => {
    expect(log).toContain('var index = editing ? nextEvents.indexOf(editing.entry) : -1;');
    expect(log).toContain('events.filter(function(item) { return item !== entry; })');
    expect(log).toContain('setData(Object.assign({}, data, { events:');
    expect(log).not.toContain('setData({ events:');
  });

  it('uses fixed-order semantic counts without ranks or time-loss totals', () => {
    expect(log).toContain("'Saved entries by selected category'");
    expect(log).toContain("hh('dl'");
    expect(log).toContain('Counts are shown in the fixed category order, not ranked.');
    expect(log).not.toContain('Your top distractions');
    expect(log).not.toContain("'Rank ' +");
    expect(log).not.toContain('minutes total');
  });

  it('renders every history record with semantic articles and robust dates', () => {
    expect(log).toContain("'aria-label': 'All saved attention entries'");
    expect(log).toContain('events.map(function(entry, index)');
    expect(log).not.toContain('events.slice(0, 15)');
    expect(log).toContain("hh('article', { 'aria-labelledby': headingId }");
    expect(log).toContain("hh('time', { dateTime: date.dateTime }");
    expect(log).toContain("'Date not recorded'");
  });

  it('uses named 44-pixel edit and delete actions', () => {
    expect(log).toContain("'aria-label': 'Edit attention entry: ' + label");
    expect(log).toContain("'aria-label': 'Delete attention entry: ' + label");
    expect(log.match(/minWidth: 44, minHeight: 44/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('updates the catalog to neutral optional wording', () => {
    expect(source).toContain("desc: 'Optional attention-shift or interruption notes'");
    expect(source).toContain("'Optional attention-shift notes with neutral categories and editable history.'");
    expect(source).not.toContain('Surfaces YOUR pattern');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
