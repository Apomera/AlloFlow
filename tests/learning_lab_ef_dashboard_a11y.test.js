import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Executive Function Dashboard accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalEFDashboard(props) {');
  const end = source.indexOf('  function PersonalIEPTracker(props) {', start);
  const dashboard = source.slice(start, end);

  it('associates every weekly rating slider with its dimension label', () => {
    expect(dashboard).toContain("var ratingId = 'learning-lab-ef-rating-' + dim.id");
    expect(dashboard).toContain("hh('label', { htmlFor: ratingId");
    expect(dashboard).toContain("id: ratingId, type: 'range'");
    expect(dashboard).toContain("'aria-hidden': 'true'");
  });

  it('provides understandable slider values and 44-pixel interaction height', () => {
    expect(dashboard).toContain("'aria-valuetext': ratingValue + ' out of 10'");
    expect(dashboard).toContain("hh('output', { htmlFor: ratingId, 'aria-live': 'polite'");
    expect(dashboard).toContain("maxWidth: '100%', minHeight: 44");
  });

  it('supports semantic form submission', () => {
    expect(dashboard).toContain("hh('form', { noValidate: true, onSubmit: function(event) { event.preventDefault(); rateAll(); }");
    expect(dashboard).toContain("'aria-labelledby': 'learning-lab-ef-rating-heading'");
    expect(dashboard).toContain("hh('button', { type: 'submit'");
  });

  it('stores the displayed default for untouched dimensions', () => {
    expect(dashboard).toContain("DIMENSIONS.forEach(function(dim) { values[dim.id] = newRating[dim.id] || 5; });");
    expect(dashboard).toContain("Object.assign({ id: tkId(), date: todayISO() }, values)");
  });

  it('uses semantic strategy lists and headings', () => {
    expect(dashboard).toContain("hh('ul', { 'aria-label': dim.label + ' strategies'");
    expect(dashboard).toContain("return hh('li', { key: 'str-' + index");
    expect(dashboard).toContain("hh('h3'");
    expect(dashboard).toContain("'← Back to dashboard'");
  });

  it('gives trend charts a text alternative and accessible navigation target', () => {
    expect(dashboard).toContain("'aria-label': dim.label + ': ' + val + ' out of 10. Open strategies. Recent ratings: ' + trendText");
    expect(dashboard).toContain("hh('span', { style: srOnlyStyle }, 'Recent ratings: ' + trendText)");
    expect(dashboard).toContain("'aria-hidden': 'true', style: { display: 'flex', gap: 1");
    expect(dashboard).toContain("minHeight: 80");
  });

  it('uses semantic rating history with named 44-pixel delete controls', () => {
    expect(dashboard).toContain("'aria-labelledby': 'learning-lab-ef-history-heading'");
    expect(dashboard).toContain("id: 'learning-lab-ef-history-heading'");
    expect(dashboard).toContain("'aria-label': 'Delete executive function rating from ' + rating.date");
    expect(dashboard).toContain("minWidth: 44, minHeight: 44");
  });

  it('confirms destructive deletion without a browser dialog', () => {
    expect(dashboard).toContain("title: 'Delete this weekly rating?', confirmText: 'Delete rating'");
    expect(dashboard).not.toContain("confirm('");
  });

  it('announces saved and deleted ratings', () => {
    expect(dashboard).toContain("llAnnounce('Executive function ratings saved.')");
    expect(dashboard).toContain("llAnnounce('Executive function rating deleted.')");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('prismflow-deploy/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
