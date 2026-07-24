import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Values Compass accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalValuesCompass(props) {');
  const end = source.indexOf('  // ── BBBB. PERSONAL MOMENTUM CALENDAR (Wave 16) ──', start);
  const compass = source.slice(start, end);

  it('frames the activity as flexible personal exploration', () => {
    expect(compass).toContain('Explore and narrow values at your own pace.');
    expect(compass).toContain('your priorities may change across settings and over time');
    expect(compass).not.toContain('Forces clarity');
  });

  it('states that the activity is not an assessment or moral authority', () => {
    expect(compass).toContain('A personal reflection, not an assessment');
    expect(compass).toContain('does not evaluate your character, diagnose a condition, or determine which values you should choose');
  });

  it('uses a named tablist and complete tab roles', () => {
    expect(compass).toContain("role: 'tablist', 'aria-label': 'Values Compass steps'");
    expect(compass).toContain("role: 'tab'");
    expect(compass).toContain("'aria-selected': active ? 'true' : 'false'");
    expect(compass).toContain("'aria-controls': 'learning-lab-values-panel'");
  });

  it('uses roving tab focus', () => {
    expect(compass).toContain('tabIndex: active ? 0 : -1');
  });

  it('supports Arrow, Home, and End tab navigation', () => {
    expect(compass).toContain("event.key === 'ArrowRight'");
    expect(compass).toContain("event.key === 'ArrowLeft'");
    expect(compass).toContain("event.key === 'Home'");
    expect(compass).toContain("event.key === 'End'");
    expect(compass).toContain('event.preventDefault()');
  });

  it('moves programmatic focus with keyboard tab changes', () => {
    expect(compass).toContain("focusById('learning-lab-values-tab-' + TABS[next].id)");
  });

  it('provides a focusable tabpanel labeled by the active tab', () => {
    expect(compass).toContain("id: 'learning-lab-values-panel', role: 'tabpanel'");
    expect(compass).toContain("'aria-labelledby': 'learning-lab-values-tab-' + activeTab.id");
    expect(compass).toContain('tabIndex: 0');
  });

  it('uses named groups for each set of value choices', () => {
    expect(compass).toContain("role: 'group', 'aria-label': label, 'aria-describedby': describedBy");
    expect(compass).toContain("'Values to consider'");
    expect(compass).toContain("'Values selected for the top five'");
    expect(compass).toContain("'Values selected for reflection'");
  });

  it('exposes selected state programmatically on every value button', () => {
    expect(compass).toContain("'aria-pressed': on ? 'true' : 'false'");
    expect(compass).toContain("type: 'button'");
  });

  it('keeps decorative selection marks out of accessible names', () => {
    expect(compass).toContain("hh('span', { 'aria-hidden': 'true' }, on ? '✓ ' : '')");
  });

  it('uses device-neutral, non-prescriptive selection instructions', () => {
    expect(compass).toContain('Select up to 10 values that feel important to you right now.');
    expect(compass).toContain('choose up to 3 values you want to reflect on now');
    expect(compass).not.toContain('Tap to pick');
    expect(compass).not.toContain('pick THE 3 that you live by');
  });

  it('provides live selection counts', () => {
    expect(compass).toContain("role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'");
    expect(compass).toContain("' of 10 selected.'");
    expect(compass).toContain("' of 5 selected.'");
    expect(compass).toContain("' of 3 selected.'");
  });

  it('reports selection limits inline and through the shared announcer', () => {
    expect(compass).toContain("setNotice(message); llAnnounce(message)");
    expect(compass).toContain("id: 'learning-lab-values-notice', role: 'alert'");
    expect(compass).toContain('Remove one before adding another.');
    expect(compass).not.toContain('alert(');
  });

  it('clears limit notices after a valid change', () => {
    expect(compass).toContain("setNotice('')");
  });

  it('preserves unrelated data for all selection updates', () => {
    expect(compass).toContain('setData(Object.assign({}, data, { selected: selected');
    expect(compass).toContain('setData(Object.assign({}, data, update))');
  });

  it('cascades removals so later steps do not retain unavailable values', () => {
    expect(compass).toContain("top5: (data.top5 || []).filter(function(item) { return item !== value; })");
    expect(compass).toContain("top3: (data.top3 || []).filter(function(item) { return item !== value; })");
    expect(compass).toContain("if (level === 'top5') update.top3");
  });

  it('provides useful empty guidance for incomplete later steps', () => {
    expect(compass).toContain('No values are available here yet. Return to the previous step to make selections.');
    expect(compass).toContain('No values are selected for reflection yet. Return to step 3 to choose values.');
  });

  it('gives every reflection textarea a visible programmatic label', () => {
    expect(compass).toContain("htmlFor: inputId");
    expect(compass).toContain("hh('textarea', { id: inputId");
    expect(compass).toContain("value + ' reflection'");
  });

  it('associates reflection help with each textarea', () => {
    expect(compass).toContain("var helpId = inputId + '-help'");
    expect(compass).toContain("hh('p', { id: helpId");
    expect(compass).toContain("'aria-describedby': helpId");
  });

  it('bounds reflection length and supports multiline resizing', () => {
    expect(compass).toContain('rows: 4, maxLength: 6000');
    expect(compass).toContain("resize: 'vertical'");
  });

  it('preserves unrelated data and existing reasoning when reflections update', () => {
    expect(compass).toContain("setData(Object.assign({}, data, { reasoning: Object.assign({}, data.reasoning || {}, update) }))");
  });

  it('makes reflection optional and explicitly non-graded', () => {
    expect(compass).toContain('Optionally describe what each selected value means to you. There is no required or correct response.');
  });

  it('discloses local storage privacy', () => {
    expect(compass).toContain('Selections and reflections save in this browser; avoid sensitive details on a shared device.');
  });

  it('uses responsive grids and 44-pixel tab and choice targets', () => {
    expect(compass).toContain("gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))'");
    expect(compass).toContain('minWidth: 44, minHeight: 44');
    expect(compass).toContain("width: '100%', minHeight: 110");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
