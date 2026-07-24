import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Life Map accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalLifeMap(props) {');
  const end = source.indexOf('  function PersonalOpenLetter(props) {', start);
  const map = source.slice(start, end);

  it('uses nonjudgmental personal-reflection framing', () => {
    expect(map).toContain("'Personal reflection, not an assessment'");
    expect(map).toContain('You decide what 0 through 10 means.');
    expect(map).not.toContain('0 = struggling, 10 = thriving');
  });

  it('allows areas to be excluded without implying a missing-area score', () => {
    expect(map).toContain('Exclude any area that does not fit your life');
    expect(map).toContain('type: \'checkbox\', checked: !!included[dimension.id]');
    expect(map).toContain("included[dimension.id] ? value + ' out of 10' : 'Not included'");
  });

  it('uses a named form with native submit behavior', () => {
    expect(map).toContain("onSubmit: function(event) { event.preventDefault(); save(); }");
    expect(map).toContain("'aria-labelledby': 'learning-lab-life-map-heading'");
    expect(map).toContain("type: 'submit'");
  });

  it('groups controls in a fieldset and legend', () => {
    expect(map).toContain("hh('fieldset'");
    expect(map).toContain("hh('legend'");
    expect(map).toContain("'Areas to include and rate'");
  });

  it('associates visible labels with inclusion and rating controls', () => {
    expect(map).toContain('htmlFor: includeId');
    expect(map).toContain('htmlFor: rangeId');
    expect(map).toContain("dimension.label + ' rating: ' + value + ' out of 10'");
  });

  it('uses bounded native ranges with linked textual outputs', () => {
    expect(map).toContain("type: 'range', min: 0, max: 10, step: 1");
    expect(map).toContain("hh('output', { htmlFor: rangeId");
    expect(map).toContain("'aria-describedby': 'learning-lab-life-map-scale-help'");
  });

  it('preserves a selected zero instead of replacing it with five', () => {
    expect(map).toContain('Number.isInteger(number) && number >= 0 && number <= 10');
    expect(map).not.toContain('form[d.id] || 5');
    expect(map).toContain('normalizedRating(form[dimension.id])');
  });

  it('reports and focuses an all-excluded save error', () => {
    expect(map).toContain("setSaveError('Include at least one area before saving a snapshot.')");
    expect(map).toContain("id: 'learning-lab-life-map-error', role: 'alert'");
    expect(map).toContain("focusById('learning-lab-life-map-include-school')");
  });

  it('preserves unrelated data and only stores included ratings', () => {
    expect(map).toContain('if (included[dimension.id]) ratings[dimension.id]');
    expect(map).toContain("setData(Object.assign({}, data, { snapshots: [entry].concat(data.snapshots || []) }))");
  });

  it('announces snapshot saving and restores form focus', () => {
    expect(map).toContain("llAnnounce('Life Map snapshot saved with '");
    expect(map).toContain("focusById('learning-lab-life-map-heading')");
  });

  it('marks the radar chart decorative and provides text values', () => {
    expect(map).toContain("'aria-hidden': 'true', focusable: 'false'");
    expect(map).toContain('The complete text values are listed with each control above.');
    expect(map).toContain("'aria-label': 'Snapshot ratings'");
  });

  it('does not draw a misleading radar when areas are excluded', () => {
    expect(map).toContain('if (details.length !== DIMENSIONS.length) return null');
    expect(map).toContain('currentDetails.length === DIMENSIONS.length');
  });

  it('does not calculate averages that count missing ratings as zero', () => {
    expect(map).not.toContain('avg.toFixed');
    expect(map).not.toContain('sum + (s.ratings[d.id] || 0)');
  });

  it('uses a named semantic history list with labeled articles', () => {
    expect(map).toContain("'aria-labelledby': 'learning-lab-life-map-history-heading'");
    expect(map).toContain("hh('ul', { 'aria-label': 'Most recent Life Map snapshots'");
    expect(map).toContain("hh('article', { 'aria-labelledby': headingId");
    expect(map).toContain("hh('h3', { id: headingId");
  });

  it('uses time semantics and complete textual snapshot ratings', () => {
    expect(map).toContain("hh('time', { dateTime: snapshot.date || undefined }, relDate(snapshot.date))");
    expect(map).toContain("detail.value + ' out of 10'");
  });

  it('confirms snapshot removal while preserving unrelated data', () => {
    expect(map).toContain("title: 'Remove this snapshot?', confirmText: 'Remove snapshot'");
    expect(map).toContain('This cannot be undone.');
    expect(map).toContain("setData(Object.assign({}, data, { snapshots: (data.snapshots || []).filter");
  });

  it('names removal controls, announces removal, and restores focus', () => {
    expect(map).toContain("'aria-label': 'Remove Life Map snapshot with '");
    expect(map).toContain("llAnnounce('Life Map snapshot removed.')");
    expect(map).toContain("focusById('learning-lab-life-map-history-heading')");
  });

  it('discloses local storage and shared-device privacy', () => {
    expect(map).toContain('Snapshots save in this browser.');
    expect(map).toContain('if other people use this device.');
    expect(map).toContain("'aria-describedby': 'learning-lab-life-map-privacy-note'");
  });

  it('uses responsive 44-pixel controls and history cards', () => {
    expect(map).toContain("width: '100%', minHeight: 44");
    expect(map).toContain("minWidth: 44, minHeight: 44");
    expect(map).toContain("gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))'");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
