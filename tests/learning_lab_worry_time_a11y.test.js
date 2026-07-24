import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Personal Worry Time accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalWorryTime(props) {');
  const end = source.indexOf('  function PersonalEnergyTracker(props) {', start);
  const worry = source.slice(start, end);

  it('uses a named capture form with native submit behavior', () => {
    expect(worry).toContain("hh('form', { onSubmit: function(event) { event.preventDefault(); addWorry(); }, 'aria-labelledby': 'learning-lab-worry-capture-heading' }");
    expect(worry).toContain("hh('button', { type: 'submit'");
    expect(worry).toContain("id: 'learning-lab-worry-capture-heading'");
  });

  it('associates a visible required label with the worry input', () => {
    expect(worry).toContain("htmlFor: 'learning-lab-worry-input'");
    expect(worry).toContain("id: 'learning-lab-worry-input', type: 'text'");
    expect(worry).toContain("'Worry (required)'");
  });

  it('reports and focuses empty worry submissions inline', () => {
    expect(worry).toContain("setWorryError('Write the worry you want to save for later.')");
    expect(worry).toContain("focusById('learning-lab-worry-input')");
    expect(worry).toContain("id: 'learning-lab-worry-input-error', role: 'alert'");
    expect(worry).toContain("'aria-invalid': worryError ? 'true' : undefined");
  });

  it('preserves unrelated data when adding, processing, and deleting worries', () => {
    expect(worry).toContain("setData(Object.assign({}, data, { worries: [worry].concat(rawWorries) }))");
    expect(worry).toContain("setData(Object.assign({}, data, { worries: rawWorries.filter");
    expect(worry).toContain("setData(Object.assign({}, data, {");
  });

  it('announces saved and removed states', () => {
    expect(worry).toContain("llAnnounce('Worry saved for worry time.')");
    expect(worry).toContain("llAnnounce('Worry removed.')");
  });

  it('confirms removal through the accessible app dialog', () => {
    expect(worry).toContain("title: 'Remove this worry?', confirmText: 'Remove worry'");
    expect(worry).not.toContain('confirm(');
  });

  it('uses a named timer with second-by-second live announcements disabled', () => {
    expect(worry).toContain("hh('time', { role: 'timer', 'aria-live': 'off'");
    expect(worry).toContain("'aria-label': minutes + ' minutes and ' + seconds + ' seconds remaining'");
  });

  it('uses a named native-button group for timer controls', () => {
    expect(worry).toContain("role: 'group', 'aria-label': 'Worry-time timer controls'");
    expect(worry).toContain("id: 'learning-lab-worry-timer-toggle', type: 'button'");
    expect(worry).toContain("'aria-pressed': running ? 'true' : 'false'");
  });

  it('announces timer start, pause, reset, and completion', () => {
    expect(worry).toContain("'Worry-time timer started for '");
    expect(worry).toContain("'Worry-time timer paused with '");
    expect(worry).toContain("llAnnounce('Worry-time timer reset to 15 minutes.')");
    expect(worry).toContain("llAnnounce('Worry time is complete.");
  });

  it('restores focus after timer reset and completion', () => {
    expect(worry).toContain("focusById('learning-lab-worry-timer-toggle')");
  });

  it('does not mutate processor state during render', () => {
    expect(worry).toContain("var workingWorry = openWorries.filter");
    expect(worry).not.toContain("if (!w) { setWorking(null); return null; }");
  });

  it('presents the active worry in a named section and blockquote', () => {
    expect(worry).toContain("'aria-labelledby': 'learning-lab-worry-processor-heading'");
    expect(worry).toContain("id: 'learning-lab-worry-processor-heading', tabIndex: -1");
    expect(worry).toContain("hh('blockquote'");
  });

  it('uses native radio semantics for mutually exclusive control choices', () => {
    expect(worry).toContain("hh('fieldset'");
    expect(worry).toContain("hh('legend', { id: 'learning-lab-worry-control-heading'");
    expect(worry).toContain("type: 'radio'");
    expect(worry).toContain("name: 'learning-lab-worry-control'");
    expect(worry).toContain("checked: selected");
  });

  it('associates a visible optional label with the next-action field', () => {
    expect(worry).toContain("htmlFor: 'learning-lab-worry-next-action'");
    expect(worry).toContain("id: 'learning-lab-worry-next-action'");
    expect(worry).toContain("'Small next action (optional)'");
  });

  it('disables processing until a control choice is selected', () => {
    expect(worry).toContain("disabled: !selectedStatus");
    expect(worry).toContain("if (selectedStatus) processWorry");
  });

  it('moves focus into and back out of the processor', () => {
    expect(worry).toContain("focusById('learning-lab-worry-processor-heading')");
    expect(worry).toContain("focusById('learning-lab-worry-process-' + worryId)");
    expect(worry).toContain("llAnnounce('Returned to open worries without processing.')");
  });

  it('handles final-worry focus without targeting a removed heading', () => {
    expect(worry).toContain("focusById(openWorries.length > 1 ? 'learning-lab-worry-open-heading' : 'learning-lab-worry-input')");
  });

  it('uses semantic lists and labeled articles for open worries', () => {
    expect(worry).toContain("'aria-labelledby': 'learning-lab-worry-open-heading'");
    expect(worry).toContain("return hh('li', { key: 'ow-' + worry.id");
    expect(worry).toContain("hh('article', { 'aria-labelledby': headingId }");
  });

  it('provides named action groups and deletion controls for open worries', () => {
    expect(worry).toContain("'aria-label': 'Actions for worry: ' + worryText");
    expect(worry).toContain("'aria-label': 'Remove worry: ' + worryText");
    expect(worry).toContain("id: 'learning-lab-worry-process-' + worry.id");
  });

  it('uses semantic processed-worry history and definition lists', () => {
    expect(worry).toContain("'aria-labelledby': 'learning-lab-worry-processed-heading'");
    expect(worry).toContain("return hh('li', { key: 'rw-' + worry.id");
    expect(worry).toContain("hh('dl', { style: { display: 'grid'");
    expect(worry).toContain("'Next action'");
  });

  it('provides cautious mental-health and privacy guidance', () => {
    expect(worry).toContain('A self-help practice, not crisis support');
    expect(worry).toContain('Some people find it useful');
    expect(worry).toContain('If anxiety feels overwhelming, interferes with daily life, or involves immediate safety');
    expect(worry).not.toContain('Most worries lose intensity when contained.');
    expect(worry).not.toContain('The Serenity Prayer was written for this exact category.');
  });

  it('provides 44-pixel fields and controls', () => {
    expect(worry).toContain("width: '100%', minHeight: 44");
    expect(worry).toContain("minHeight: 44, padding: '9px 13px'");
    expect(worry).toContain("minWidth: 44, minHeight: 44");
  });

  it('handles malformed legacy worry data and renders all processed worries', () => {
    expect(worry).toContain('var rawWorries = Array.isArray(data.worries) ? data.worries : [];');
    expect(worry).toContain("var openWorries = rawWorries.filter(function(worry) { return isRecord(worry) && !worry.resolved; });");
    expect(worry).toContain("var resolvedWorries = rawWorries.filter(function(worry) { return isRecord(worry) && worry.resolved; });");
    expect(worry).toContain("var worryText = textValue(worry.text).trim() || 'Saved worry';");
    expect(worry).toContain('resolvedWorries.map(function(worry)');
    expect(worry).not.toContain('.slice(0, 10)');
  });

  it('states that saving never sends or notifies anyone', () => {
    expect(worry).toContain('saving does not send them to or notify anyone');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
