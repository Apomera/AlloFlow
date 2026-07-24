import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Recovery Kit accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalRecoveryKit(props) {');
  const end = source.indexOf('  function PersonalCurrentReading(props) {', start);
  const kit = source.slice(start, end);

  it('presents the checklist as an optional reflection aid', () => {
    expect(kit).toContain('Choose any ideas that feel useful');
    expect(kit).toContain("'Optional reflection ideas'");
    expect(kit).toContain('There is no required number or order.');
  });

  it('uses neutral guidance without unsupported physiological promises', () => {
    expect(kit).not.toContain('Reset the parasympathetic system');
    expect(kit).not.toContain('Discharge stress hormones');
    expect(kit).not.toContain("Your nervous system needs fuel. Don't skip.");
    expect(kit).not.toContain('Recovery happens here.');
  });

  it('supports adaptation for disability, culture, access, and health guidance', () => {
    expect(kit).toContain('based on your needs, culture, access, disability, and health guidance');
    expect(kit).toContain('Text, speech, symbols, or no reflection are all options.');
  });

  it('uses a named form with native submit behavior', () => {
    expect(kit).toContain("onSubmit: function(event) { event.preventDefault(); logSession(); }");
    expect(kit).toContain("'aria-labelledby': 'learning-lab-recovery-checklist-heading'");
    expect(kit).toContain("type: 'submit'");
  });

  it('uses a fieldset, legend, and native checkboxes', () => {
    expect(kit).toContain("hh('fieldset'");
    expect(kit).toContain("hh('legend'");
    expect(kit).toContain("type: 'checkbox', checked: on");
    expect(kit).toContain("onChange: function(event) { toggle(step.id, event.target.checked); }");
  });

  it('associates every checkbox with its visible label and description', () => {
    expect(kit).toContain("htmlFor: inputId");
    expect(kit).toContain("'aria-describedby': helpId");
    expect(kit).toContain("hh('span', { id: helpId");
  });

  it('marks step icons decorative while retaining complete text labels', () => {
    expect(kit).toContain("hh('span', { 'aria-hidden': 'true' }, step.icon + ' ')");
    expect(kit).toContain('step.label');
    expect(kit).toContain('step.why');
  });

  it('announces a complete textual selected count', () => {
    expect(kit).toContain("role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'");
    expect(kit).toContain("doneCount === 1 ? ' idea selected out of ' : ' ideas selected out of '");
  });

  it('reports and focuses a zero-selection save error', () => {
    expect(kit).toContain("setSaveError('Select at least one idea before saving this reflection.')");
    expect(kit).toContain("llAnnounce('Reflection not saved. Select at least one idea first.')");
    expect(kit).toContain("focusById('learning-lab-recovery-step-water-food')");
    expect(kit).toContain("id: 'learning-lab-recovery-save-error', role: 'alert'");
  });

  it('counts only known checklist choices', () => {
    expect(kit).toContain("return STEPS.filter(function(step) { return !!checks[step.id]; }).map");
    expect(kit).toContain('var done = completedIds()');
  });

  it('preserves unrelated data when saving a reflection', () => {
    expect(kit).toContain("setData(Object.assign({}, data, { recoveries: [entry].concat(data.recoveries || []) }))");
    expect(kit).toContain("var entry = { id: tkId(), date: todayISO(), time: Date.now(), completed: done }");
  });

  it('announces successful saving, clears choices, and focuses history', () => {
    expect(kit).toContain("setChecks({}); setSaveError('')");
    expect(kit).toContain("llAnnounce('Recovery reflection saved with '");
    expect(kit).toContain("focusById('learning-lab-recovery-history-heading')");
  });

  it('renders a named semantic history list of labeled articles', () => {
    expect(kit).toContain("'aria-labelledby': 'learning-lab-recovery-history-heading'");
    expect(kit).toContain("hh('ul', { 'aria-label': 'Most recent recovery reflections'");
    expect(kit).toContain("hh('article', { 'aria-labelledby': headingId");
    expect(kit).toContain("hh('h3', { id: headingId");
  });

  it('uses machine-readable time semantics with a textual date label', () => {
    expect(kit).toContain('function entryDateTime(entry)');
    expect(kit).toContain("hh('time', { dateTime: entryDateTime(entry) }, entryDateLabel(entry))");
  });

  it('makes selected ideas reviewable as a semantic list', () => {
    expect(kit).toContain("}, 'Review selected ideas')");
    expect(kit).toContain("knownSteps.map(function(step) { return hh('li'");
    expect(kit).toContain('No current idea labels match this older saved reflection.');
  });

  it('confirms removal while preserving unrelated data', () => {
    expect(kit).toContain("title: 'Remove this reflection?', confirmText: 'Remove reflection'");
    expect(kit).toContain("setData(Object.assign({}, data, { recoveries: (data.recoveries || []).filter");
  });

  it('names removal controls, announces removal, and restores focus', () => {
    expect(kit).toContain("'aria-label': 'Remove recovery reflection from ' + entryDateLabel(entry)");
    expect(kit).toContain("llAnnounce('Saved recovery reflection removed.')");
    expect(kit).toContain("focusById('learning-lab-recovery-history-heading')");
  });

  it('discloses local storage and shared-device privacy', () => {
    expect(kit).toContain('Selected ideas and save times stay in this browser.');
    expect(kit).toContain('on a shared device.');
    expect(kit).toContain("'aria-describedby': 'learning-lab-recovery-privacy-note'");
  });

  it('states the health and crisis-care boundary', () => {
    expect(kit).toContain('does not provide health care or monitor your safety');
    expect(kit).toContain('contact local emergency or crisis services now');
  });

  it('provides 44-pixel checkbox labels, buttons, and disclosure targets', () => {
    expect(kit).toContain("width: '100%', minHeight: 44");
    expect(kit).toContain("minWidth: 44, minHeight: 44");
    expect(kit).toContain("alignItems: 'center', minHeight: 44");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
