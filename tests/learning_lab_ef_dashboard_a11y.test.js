import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
const root = process.cwd(); const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
describe('Learning Lab Executive Function Reflection accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalEFDashboard(props) {');
  const end = source.indexOf('  function PersonalIEPTracker(props) {', start);
  const dashboard = source.slice(start, end);
  it('uses optional explicit selects with a true not-rated state', () => {
    expect(dashboard).toContain("hh('select', { id: ratingId, value: value");
    expect(dashboard).toContain("hh('option', { value: '' }, 'Not rated')");
    expect(dashboard).toContain("newRating[item.id] == null ? ''");
    expect(dashboard).not.toContain('newRating[dim.id] || 5');
    expect(dashboard).not.toContain("type: 'range'");
  });
  it('requires at least one deliberate rating and restores focus', () => {
    expect(dashboard).toContain("setRatingError('Choose at least one optional rating before saving.')");
    expect(dashboard).toContain("id: 'learning-lab-ef-rating-error', role: 'alert'");
    expect(dashboard).toContain("focusId('learning-lab-ef-rating-initiation')");
    expect(dashboard).toContain('R.useLayoutEffect(function()');
  });
  it('frames ratings as contextual non-diagnostic self-reflection with privacy control', () => {
    expect(dashboard).toContain('not tests of ability, diagnoses, clinical measures, or comparisons with other people');
    expect(dashboard).toContain('task, environment, disability, stress, health, support, culture, and access');
    expect(dashboard).toContain('Rate only dimensions that feel useful.');
    expect(dashboard).toContain('delete entries you no longer need');
  });
  it('removes composite averages and exposes every saved rating as text', () => {
    expect(dashboard).not.toContain("'average ' + avg");
    expect(dashboard).not.toContain('ratings.slice(0, 10)');
    expect(dashboard).toContain("ratings.map(function(rating)");
    expect(dashboard).toContain("'aria-label': 'Rated dimensions'");
    expect(dashboard).toContain("item.label + ': ' + item.value + ' out of 10'");
  });
  it('uses semantic robust timestamps and complete deletion access', () => {
    expect(dashboard).toContain("hh('time', { dateTime: date.toISOString()");
    expect(dashboard).toContain("return isNaN(date.getTime()) ? new Date() : date");
    expect(dashboard).toContain("title: 'Delete this reflection?', confirmText: 'Delete reflection'");
    expect(dashboard).toContain("llAnnounce('Executive function reflection deleted.')");
  });
  it('makes the strategy library independent of having a rating and restores launcher focus', () => {
    expect(dashboard).toContain("id: 'learning-lab-ef-dimension-' + item.id");
    expect(dashboard).toContain("latestValue == null ? 'Latest: not rated'");
    expect(dashboard).toContain("focusId('learning-lab-ef-detail-heading')");
    expect(dashboard).toContain("focusId('learning-lab-ef-dimension-' + id)");
    expect(dashboard).toContain('optional ideas, not prescriptions or treatment');
  });
  it('uses qualified strategy language and avoids unsupported numerical claims', () => {
    expect(dashboard).toContain('may help, have no effect, create barriers, or be inappropriate');
    expect(dashboard).toContain('fixed 25-minute interval is not required');
    expect(dashboard).not.toContain('Most students underestimate by 30-50%');
    expect(dashboard).not.toContain('activates regulation circuits');
    expect(dashboard).not.toContain('Particularly valuable for ADHD');
  });
  it('preserves sibling data and updates discovery copy and deployed mirror', () => {
    expect(dashboard.match(/setData\(Object\.assign\(\{\}, data,/g)).toHaveLength(2);
    expect(source).toContain("desc: 'Optional context-dependent reflection across 8 dimensions'");
    expect(source).toContain('Optional context-dependent self-reflection across eight dimensions with adaptable strategy ideas.');
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
