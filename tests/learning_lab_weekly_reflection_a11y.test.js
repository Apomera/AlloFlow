import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Weekly Reflection revised accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalWeeklyReflection(props) {');
  const end = source.indexOf('  function PersonalStrategyWizard(props) {', start);
  const reflection = source.slice(start, end);

  it('uses stable view headings and effect-based focus restoration', () => {
    for (const id of ['learning-lab-reflection-heading', 'learning-lab-reflection-form-heading', 'learning-lab-reflection-detail-heading', 'learning-lab-reflection-history-heading']) expect(reflection).toContain("'" + id + "'");
    expect(reflection).toContain('document.getElementById(focusTarget)');
    expect(reflection).not.toContain("if (!e) { setView('list'); return null; }");
  });

  it('uses a named native form and validates an empty reflection', () => {
    expect(reflection).toContain("hh('form', { 'aria-labelledby': 'learning-lab-reflection-form-heading', onSubmit: saveReflection }");
    expect(reflection).toContain("setFormError('Write a response to at least one prompt before saving.')");
    expect(reflection).toContain("id: 'learning-lab-reflection-form-error', role: 'alert'");
    expect(reflection).toContain("setFocusTarget('learning-lab-reflection-went_well')");
    expect(reflection).toContain("type: 'submit', 'data-ll-focusable': true");
  });

  it('labels and bounds each prompt and describes the rating range', () => {
    expect(reflection).toContain("htmlFor: 'learning-lab-reflection-' + prompt.id");
    expect(reflection).toContain('rows: 3, maxLength: 4000');
    expect(reflection).toContain("'aria-describedby': describedBy");
    expect(reflection).toContain("'aria-invalid': formError ? 'true' : undefined");
    expect(reflection).toContain("'aria-describedby': 'learning-lab-reflection-overall-help'");
    expect(reflection).toContain("'aria-valuetext': form.overall + ' out of 10'");
    expect(reflection).toContain("hh('ol', { 'aria-label': 'Reflection prompts'");
  });

  it('preserves sibling state on save and delete', () => {
    expect(reflection).toContain("setData(Object.assign({}, data, { entries: entries }))");
    expect(reflection).toContain("setData(Object.assign({}, data, { entries: remaining }))");
    expect(reflection).not.toContain('setData({ entries:');
  });

  it('keeps original metadata when editing and trims saved responses', () => {
    expect(reflection).toContain('var existing = index >= 0 ? entries[index] : null');
    expect(reflection).toContain('var entry = Object.assign({}, existing || {}, form, {');
    expect(reflection).toContain("went_well: String(form.went_well || '').trim()");
  });

  it('uses UTC date-only ISO week calculations across timezones and year boundaries', () => {
    expect(reflection).toContain('Date.UTC(parts[0], parts[1] - 1, parts[2])');
    expect(reflection).toContain('date.getUTCDay() || 7');
    expect(reflection).toContain('date.setUTCDate(date.getUTCDate() + 4 - weekday)');
    expect(reflection).toContain('weekOf(isoFromDayNumber(currentDay - offset * 7))');
    expect(reflection).not.toContain('dt.toISOString().slice(0, 10)');
  });

  it('uses semantic summaries, responses, dates, units, and history controls', () => {
    expect(reflection).toContain("hh('ul', { 'aria-label': 'Reflection summary'");
    expect(reflection).toContain("hh('dl', { style:");
    expect(reflection).toContain("hh('dt', { style:");
    expect(reflection).toContain("hh('dd', { style:");
    expect(reflection).toContain("hh('time', { dateTime: entry.date");
    expect(reflection).toContain("'aria-label': 'View reflection from ' + entry.date + ', rating ' + rating");
  });

  it('uses higher-contrast prompt colors and hides their icons', () => {
    for (const color of ['#6ee7b7', '#fde68a', '#93c5fd', '#d8b4fe', '#fdba74']) expect(reflection).toContain(color);
    expect(reflection).toContain("hh('span', { 'aria-hidden': 'true' }, prompt.icon + ' ')");
  });

  it('confirms deletion and announces save, cancel, and delete outcomes', () => {
    expect(reflection).toContain("title: 'Delete this reflection?', confirmText: 'Delete reflection'");
    expect(reflection).toContain("'aria-label': 'Delete reflection from ' + detailEntry.date");
    expect(reflection).toContain("llAnnounce(existing ? 'Reflection changes saved.' : 'Reflection saved.')");
    expect(reflection).toContain("llAnnounce('Reflection editing canceled.')");
    expect(reflection).toContain("llAnnounce('Reflection deleted.')");
  });

  it('qualifies evidence claims and avoids prescriptive timing or guarantees', () => {
    expect(reflection).toContain("'Evidence and limits'");
    expect(reflection).toContain('effects vary by design, population, guidance');
    expect(reflection).toContain('not an assessment, treatment, or guarantee of metacognitive growth');
    expect(reflection).not.toContain('Highest-evidence');
    expect(reflection).not.toContain('5 minutes');
    expect(source).toContain('Optional structured journal for reviewing a week and planning next steps.');
    expect(source).not.toContain('Zimmerman 2002 metacognitive growth.');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
