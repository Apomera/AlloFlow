import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Daily 3 accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalDaily3(props) {');
  const end = source.indexOf('  // ── EEEE. PERSONAL CONFIDENCE BUILDER (Wave 17) ──', start);
  const daily3 = source.slice(start, end);

  it('frames all three slots as optional and changeable', () => {
    expect(daily3).toContain('Use up to three optional slots for today; plans can change.');
    expect(daily3).toContain('you may use zero, one, two, or three slots');
    expect(daily3).toContain('Unfinished items and changed plans are information, not failure.');
    expect(daily3).not.toContain('Resist the urge for more');
    expect(daily3).not.toContain('Three is the sweet spot');
  });

  it('uses a named current-day section', () => {
    expect(daily3).toContain("hh('section', { 'aria-labelledby': 'learning-lab-daily3-today-heading'");
    expect(daily3).toContain("id: 'learning-lab-daily3-today-heading'");
  });

  it('uses time semantics for today', () => {
    expect(daily3).toContain("hh('time', { dateTime: today }, today)");
  });

  it('gives every priority a visible stable label', () => {
    expect(daily3).toContain("var inputId = 'learning-lab-daily3-priority-' + index");
    expect(daily3).toContain("hh('label', { htmlFor: inputId");
    expect(daily3).toContain("hh('input', { id: inputId");
    expect(daily3).toContain("'Priority slot ' + (index + 1) + ' (optional)'");
  });

  it('associates help and autosave information with every priority', () => {
    expect(daily3).toContain("var helpId = inputId + '-help'");
    expect(daily3).toContain("hh('p', { id: helpId");
    expect(daily3).toContain("'aria-describedby': helpId + ' learning-lab-daily3-autosave'");
  });

  it('bounds priority length', () => {
    expect(daily3).toContain('maxLength: 2000');
  });

  it('gives the reflection a visible label and associated help', () => {
    expect(daily3).toContain("htmlFor: 'learning-lab-daily3-reflection'");
    expect(daily3).toContain("id: 'learning-lab-daily3-reflection-help'");
    expect(daily3).toContain("'aria-describedby': 'learning-lab-daily3-reflection-help learning-lab-daily3-autosave'");
  });

  it('bounds multiline reflection input', () => {
    expect(daily3).toContain('rows: 3, maxLength: 6000');
    expect(daily3).toContain("minHeight: 88, resize: 'vertical'");
  });

  it('discloses browser autosave and privacy', () => {
    expect(daily3).toContain('Changes save automatically in this browser.');
    expect(daily3).toContain('Avoid sensitive details if other people use this device.');
    expect(daily3).toContain("'aria-describedby': 'learning-lab-daily3-autosave'");
  });

  it('uses a live text count based only on listed priorities', () => {
    expect(daily3).toContain("role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'");
    expect(daily3).toContain("doneCount + ' of ' + filledCount + ' listed priorities marked complete.'");
    expect(daily3).toContain('No priorities entered yet.');
  });

  it('exposes completion state programmatically', () => {
    expect(daily3).toContain("'aria-pressed': isDone ? 'true' : 'false'");
    expect(daily3).toContain("isDone ? 'Completed' : 'Mark complete'");
  });

  it('gives every completion control a contextual accessible name', () => {
    expect(daily3).toContain("'aria-label': (isDone ? 'Mark not complete: ' : 'Mark complete: ')");
  });

  it('disables completion for empty slots and clears stale completion on empty text', () => {
    expect(daily3).toContain('disabled: !hasText');
    expect(daily3).toContain("if (!String(value || '').trim()) done[index] = false");
  });

  it('announces completion changes and restores toggle focus', () => {
    expect(daily3).toContain("llAnnounce('Priority ' + (index + 1)");
    expect(daily3).toContain("focusById('learning-lab-daily3-toggle-' + index)");
  });

  it('preserves unrelated top-level and day data during autosave', () => {
    expect(daily3).toContain('return Object.assign({}, source, { items: items, done: done, reflection:');
    expect(daily3).toContain("setData(Object.assign({}, data, { days: Object.assign({}, data.days || {}, dayUpdate) }))");
  });

  it('normalizes missing legacy arrays and values', () => {
    expect(daily3).toContain('Array.isArray(source.items) ? source.items : []');
    expect(daily3).toContain('Array.isArray(source.done) ? source.done : []');
    expect(daily3).toContain("String(source.reflection || '')");
  });

  it('always provides named history and useful empty state', () => {
    expect(daily3).toContain("hh('section', { 'aria-labelledby': 'learning-lab-daily3-history-heading'");
    expect(daily3).toContain('No past Daily 3 entries saved yet.');
  });

  it('uses a semantic newest-first list without hiding older entries', () => {
    expect(daily3).toContain("hh('ul', { 'aria-label': 'Past Daily 3 entries, newest first'");
    expect(daily3).toContain('pastDates.map(function(date)');
    expect(daily3).not.toContain('slice(0, 14)');
  });

  it('uses labeled history articles and date semantics', () => {
    expect(daily3).toContain("hh('article', { 'aria-labelledby': headingId");
    expect(daily3).toContain("hh('h3', { id: headingId");
    expect(daily3).toContain("hh('time', { dateTime: date }, date)");
  });

  it('provides completion state in text for every historical priority', () => {
    expect(daily3).toContain("'aria-label': 'Priorities and completion status'");
    expect(daily3).toContain("item.done ? 'Marked complete: ' : 'Not marked complete: '");
  });

  it('keeps every historical reflection keyboard-accessible', () => {
    expect(daily3).toContain("hh('details'");
    expect(daily3).toContain("hh('summary'");
    expect(daily3).toContain('Review reflection');
    expect(daily3).toContain("alignItems: 'center', minHeight: 44");
  });

  it('preserves whitespace and wraps long historical content', () => {
    expect(daily3).toContain("whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'");
  });

  it('uses 44-pixel inputs and completion controls', () => {
    expect(daily3).toContain("width: '100%', minHeight: 44");
    expect(daily3).toContain('minWidth: 44, minHeight: 44');
    expect(daily3).not.toContain('width: 24, height: 24');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
