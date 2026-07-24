import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Hope Library accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalHope(props) {');
  const end = source.indexOf('  // ── GGGG. PERSONAL SCRIPT LIBRARY (Wave 18) ──', start);
  const hope = source.slice(start, end);

  it('uses flexible, non-prescriptive framing', () => {
    expect(hope).toContain('Keep optional reminders of things you may want to explore, make, learn, or experience.');
    expect(hope).toContain('Hopes can be small, uncertain, practical, private, or change over time.');
    expect(hope).toContain('You do not need to feel positive or complete an item for it to belong here.');
    expect(hope).not.toContain('Add 5 things');
  });

  it('states wellbeing, monitoring, and crisis boundaries', () => {
    expect(hope).toContain('An inspiration list, not a safety plan');
    expect(hope).toContain('does not assess wellbeing, monitor safety, contact anyone, or replace emergency or crisis support');
    expect(hope).toContain('For immediate or life-threatening danger');
  });

  it('uses a named form with native submit behavior', () => {
    expect(hope).toContain("hh('form', { onSubmit: function(event) { event.preventDefault(); add(); }");
    expect(hope).toContain("'aria-labelledby': 'learning-lab-hope-form-heading'");
    expect(hope).toContain("type: 'submit'");
  });

  it('provides visible labels for both form controls', () => {
    expect(hope).toContain("htmlFor: 'learning-lab-hope-category'");
    expect(hope).toContain("htmlFor: 'learning-lab-hope-text'");
  });

  it('uses a named native category select', () => {
    expect(hope).toContain("hh('select', { id: 'learning-lab-hope-category'");
    expect(hope).toContain("hh('option', { key: category.id, value: category.id }, category.label)");
    expect(hope).not.toContain("key: 'hc-' + c.id");
  });

  it('uses clear, inclusive category labels', () => {
    expect(hope).toContain("label: 'Skill or knowledge'");
    expect(hope).toContain("label: 'Person or relationship'");
    expect(hope).toContain("label: 'Way of being'");
  });

  it('requires and bounds the hope description', () => {
    expect(hope).toContain('Hope description (required)');
    expect(hope).toContain('required: true, maxLength: 4000');
    expect(hope).toContain("minHeight: 88, resize: 'vertical'");
  });

  it('reports and focuses an empty description inline', () => {
    expect(hope).toContain("setTextError('Describe a hope before saving.')");
    expect(hope).toContain("id: 'learning-lab-hope-text-error', role: 'alert'");
    expect(hope).toContain("'aria-invalid': textError ? 'true' : undefined");
    expect(hope).toContain("focusById('learning-lab-hope-text')");
  });

  it('trims text and normalizes unknown categories', () => {
    expect(hope).toContain('var text = form.text.trim()');
    expect(hope).toContain('category: categoryFor(form.category).id');
    expect(hope).toContain('return CATS.filter(function(category) { return category.id === id; })[0] || CATS[1]');
  });

  it('preserves unrelated data while saving', () => {
    expect(hope).toContain("setData(Object.assign({}, data, { hopes: [hope].concat(data.hopes || []) }))");
  });

  it('announces saving, features the new item, and restores form focus', () => {
    expect(hope).toContain('setFeaturedId(hope.id)');
    expect(hope).toContain("llAnnounce('Hope saved in this browser.')");
    expect(hope).toContain("focusById('learning-lab-hope-text')");
  });

  it('discloses local storage privacy', () => {
    expect(hope).toContain('Saved hopes stay in this browser.');
    expect(hope).toContain('Avoid names or private details if other people use this device.');
    expect(hope).toContain("'aria-describedby': 'learning-lab-hope-privacy'");
  });

  it('does not change featured content randomly during renders', () => {
    expect(hope).not.toContain('Math.random()');
    expect(hope).toContain("var featuredState = R.useState(null)");
    expect(hope).toContain('var featured = unfinished.filter');
  });

  it('uses a named section for featured content', () => {
    expect(hope).toContain("'aria-labelledby': 'learning-lab-hope-feature-heading'");
    expect(hope).toContain('Featured active hope');
  });

  it('changes featured content only through an explicit control', () => {
    expect(hope).toContain("id: 'learning-lab-hope-feature-next'");
    expect(hope).toContain('Show another active hope');
    expect(hope).toContain('unfinished.length > 1');
  });

  it('announces featured changes and retains button focus', () => {
    expect(hope).toContain("llAnnounce('Showing another saved hope.')");
    expect(hope).toContain("focusById('learning-lab-hope-feature-next')");
    expect(hope).toContain("llAnnounce('There is only one active hope to feature.')");
  });

  it('always provides named saved content and a non-pressuring empty state', () => {
    expect(hope).toContain("hh('section', { 'aria-labelledby': 'learning-lab-hope-list-heading'");
    expect(hope).toContain("id: 'learning-lab-hope-list-heading', tabIndex: -1");
    expect(hope).toContain('No hopes saved yet. Add one if it feels useful.');
  });

  it('uses semantic categories, lists, and labeled articles', () => {
    expect(hope).toContain("hh('h3', { id: categoryHeadingId");
    expect(hope).toContain("hh('ul', { 'aria-label': category.label + ' hopes'");
    expect(hope).toContain("hh('article', { 'aria-labelledby': headingId");
    expect(hope).toContain("hh('h4', { id: headingId");
  });

  it('keeps unknown legacy categories visible through the fallback group', () => {
    expect(hope).toContain('categoryFor(hope.category).id === category.id');
  });

  it('provides fulfilled state in visible text rather than color alone', () => {
    expect(hope).toContain("hope.done ? 'Marked fulfilled' : 'Active hope'");
    expect(hope).not.toContain("textDecoration: h.done ? 'line-through'");
  });

  it('exposes fulfilled state and contextual action programmatically', () => {
    expect(hope).toContain("'aria-pressed': hope.done ? 'true' : 'false'");
    expect(hope).toContain("'aria-label': (hope.done ? 'Return to active: ' : 'Mark fulfilled: ')");
    expect(hope).toContain("hope.done ? 'Return to active' : 'Mark fulfilled'");
  });

  it('preserves unrelated data when changing state', () => {
    expect(hope).toContain("setData(Object.assign({}, data, { hopes: (data.hopes || []).map");
    expect(hope).toContain("doneAt: nextDone ? todayISO() : null");
  });

  it('announces state changes and restores action focus', () => {
    expect(hope).toContain("llAnnounce((nextDone ? 'Hope marked fulfilled: ' : 'Hope returned to active: ')");
    expect(hope).toContain("focusById('learning-lab-hope-state-' + safeDomId(hope.id))");
  });

  it('uses time semantics for added and fulfilled dates', () => {
    expect(hope).toContain("hh('time', { dateTime: hope.addedAt || undefined }, relDate(hope.addedAt))");
    expect(hope).toContain("hh('time', { dateTime: hope.doneAt }, relDate(hope.doneAt))");
  });

  it('confirms removal while preserving unrelated data', () => {
    expect(hope).toContain("title: 'Remove this saved hope?', confirmText: 'Remove hope'");
    expect(hope).toContain('This cannot be undone.');
    expect(hope).toContain("setData(Object.assign({}, data, { hopes: (data.hopes || []).filter");
  });

  it('names removal, announces it, and restores list focus', () => {
    expect(hope).toContain("'aria-label': 'Remove saved hope: '");
    expect(hope).toContain("llAnnounce('Saved hope removed.')");
    expect(hope).toContain("focusById('learning-lab-hope-list-heading')");
  });

  it('wraps long content and uses responsive 44-pixel controls', () => {
    expect(hope).toContain("whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'");
    expect(hope).toContain("gridTemplateColumns: 'minmax(150px, 1fr) minmax(0, 2fr)'");
    expect(hope).toContain('minWidth: 44, minHeight: 44');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
