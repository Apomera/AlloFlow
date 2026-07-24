import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Personal Study Planner accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalStudyPlanner(props) {');
  const end = source.indexOf('  function PersonalExamPrep(props)', start);
  const planner = source.slice(start, end);

  it('uses stable headings for the weekly and authoring views', () => {
    expect(planner).toContain("'learning-lab-study-heading'");
    expect(planner).toContain("'learning-lab-study-form-heading'");
    expect(planner).toContain("'learning-lab-study-schedule-heading'");
  });

  it('moves focus after every view transition through an effect', () => {
    expect(planner).toContain('document.getElementById(focusTarget)');
    expect(planner).toContain("setFocusTarget('learning-lab-study-form-heading')");
    expect(planner).toContain("setFocusTarget('learning-lab-study-heading')");
    expect(planner).toContain("setFocusTarget('learning-lab-study-schedule-heading')");
  });

  it('uses accurate instructions instead of claiming empty cells are clickable', () => {
    expect(planner).toContain('Use the Add study block button to create an entry.');
    expect(planner).not.toContain('Click a cell to add.');
  });

  it('uses full day names and unambiguous time formatting', () => {
    expect(planner).toContain("{ short: 'Sun', full: 'Sunday' }");
    expect(planner).toContain("{ short: 'Sat', full: 'Saturday' }");
    expect(planner).toContain("return (value % 12 || 12) + ':00 ' + suffix");
    expect(planner).not.toContain("+ (h < 12 ? 'a' : 'p')");
  });

  it('spells out hour and minute units in summaries and controls', () => {
    expect(planner).toContain("minutes + (minutes === 1 ? ' minute' : ' minutes')");
    expect(planner).toContain("hours + (hours === 1 ? ' hour' : ' hours')");
    expect(planner).not.toContain("totalWeekHr + 'h'");
    expect(planner).not.toContain("m + ' min'");
  });

  it('uses a named native form and submit control for block creation', () => {
    expect(planner).toContain("hh('form', { 'aria-labelledby': 'learning-lab-study-form-heading', onSubmit: addBlock }");
    expect(planner).toContain("type: 'submit', 'data-ll-focusable': true");
  });

  it('groups day choices in a fieldset and exposes pressed state', () => {
    expect(planner).toContain("'Day of week'");
    expect(planner).toContain("'aria-pressed': selected ? 'true' : 'false', 'data-ll-focusable': true");
    expect(planner).toContain('}, day.full)');
  });

  it('gives every day choice at least a 44 by 44 pixel target', () => {
    expect(planner).toContain('minWidth: 44, minHeight: 44');
  });

  it('provides explicit labels and 44-pixel controls for time and duration', () => {
    expect(planner).toContain("htmlFor: 'learning-lab-study-start-time'");
    expect(planner).toContain("htmlFor: 'learning-lab-study-duration'");
    expect(planner).toContain("id: 'learning-lab-study-start-time'");
    expect(planner).toContain("id: 'learning-lab-study-duration'");
    expect(planner.match(/minHeight: 44/g)?.length).toBeGreaterThanOrEqual(8);
  });

  it('uses an adaptive two-control grid instead of fixed narrow columns', () => {
    expect(planner).toContain("gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))'");
    expect(planner).not.toContain("gridTemplateColumns: '1fr 1fr'");
  });

  it('groups subjects and exposes selected state without color alone', () => {
    expect(planner).toContain("id: 'learning-lab-study-subject-heading', tabIndex: -1");
    expect(planner).toContain("'aria-pressed': selected ? 'true' : 'false'");
    expect(planner).toContain('}, subject)');
  });

  it('uses a high-contrast subject palette for dark backgrounds', () => {
    expect(planner).toContain("'#c4b5fd', '#fca5a5', '#6ee7b7', '#fde68a', '#67e8f9'");
    expect(planner).not.toContain("['#9333ea', '#ef4444', '#10b981'");
  });

  it('uses the accessible shared dialog to add bounded subject names', () => {
    expect(planner).toContain("title: 'Add a study subject'");
    expect(planner).toContain("fields: [{ name: 'name', label: 'Subject name', required: true, maxLength: 60 }]");
    expect(planner).toContain('That subject is already in the planner.');
  });

  it('selects and announces a newly added subject', () => {
    expect(planner).toContain("setForm(Object.assign({}, form, { subject: name }))");
    expect(planner).toContain("setFocusTarget('learning-lab-study-subject-heading')");
    expect(planner).toContain("llAnnounce('Study subject added and selected: ' + name + '.')");
  });

  it('labels and bounds the optional task field', () => {
    expect(planner).toContain("htmlFor: 'learning-lab-study-task'");
    expect(planner).toContain("id: 'learning-lab-study-task', maxLength: 500");
  });

  it('provides a labeled, full-row recurring checkbox target', () => {
    expect(planner).toContain("htmlFor: 'learning-lab-study-recurring'");
    expect(planner).toContain("id: 'learning-lab-study-recurring', type: 'checkbox'");
    expect(planner).toContain('minHeight: 44');
    expect(planner).toContain('Repeat this block each week');
  });

  it('preserves sibling planner data when blocks or subjects change', () => {
    expect(planner).toContain("setData(Object.assign({}, data, { blocks: blocks.concat([block]) }))");
    expect(planner).toContain("setData(Object.assign({}, data, { blocks: remaining }))");
    expect(planner).toContain("setData(Object.assign({}, data, { subjects: subjects.concat([name]) }))");
    expect(planner).not.toContain('setData({ blocks:');
    expect(planner).not.toContain('setData({ subjects:');
  });

  it('announces block creation and cancellation', () => {
    expect(planner).toContain("llAnnounce('Study block added for ' + DAYS[block.day].full");
    expect(planner).toContain("llAnnounce('Study block creation canceled.')");
  });

  it('renders weekly summary metrics as a named semantic list', () => {
    expect(planner).toContain("hh('ul', { 'aria-label': 'Weekly study summary'");
    expect(planner).toContain("return hh('li', { key: 'ws-' + index");
  });

  it('hides decorative summary icons', () => {
    expect(planner).toContain("hh('span', { 'aria-hidden': 'true', style:");
  });

  it('renders the weekly schedule as a named and described native table', () => {
    expect(planner).toContain("hh('table', { 'aria-labelledby': 'learning-lab-study-schedule-heading', 'aria-describedby': 'learning-lab-study-schedule-help'");
    expect(planner).toContain("hh('thead'");
    expect(planner).toContain("hh('tbody'");
    expect(planner).not.toContain("gridTemplateColumns: '50px repeat(7");
  });

  it('uses scoped column and row headers for day and time relationships', () => {
    expect(planner).toContain("scope: 'col'");
    expect(planner).toContain("scope: 'row'");
    expect(planner).toContain('}, day.full)');
    expect(planner).toContain('}, formatHour(value))');
  });

  it('renders multiple blocks in a cell as a named semantic list', () => {
    expect(planner).toContain("hh('ul', { 'aria-label': day.full + ' at ' + formatHour(value)");
    expect(planner).toContain("return hh('li', { key: 'block-' + block.id");
  });

  it('states duration and recurrence without relying on color or layout', () => {
    expect(planner).toContain("formatMinutes(block.duration) + ' · ' + (block.recurring ? 'Repeats weekly' : 'This week only')");
  });

  it('uses item-specific full-size remove controls', () => {
    expect(planner).toContain("'aria-label': 'Remove study block: ' + blockName");
    expect(planner).toContain("width: '100%', minHeight: 44");
  });

  it('confirms removal, announces completion, and restores meaningful focus', () => {
    expect(planner).toContain("title: 'Remove this study block?', confirmText: 'Remove block'");
    expect(planner).toContain("llAnnounce('Study block removed.')");
    expect(planner).toContain("setFocusTarget(remaining.length ? 'learning-lab-study-schedule-heading' : 'learning-lab-study-add-button')");
  });

  it('renders the subject breakdown as a named semantic list', () => {
    expect(planner).toContain("'aria-labelledby': 'learning-lab-study-breakdown-heading'");
    expect(planner).toContain("hh('ul', { 'aria-labelledby': 'learning-lab-study-breakdown-heading'");
    expect(planner).toContain("return hh('li', { key: 'sb-' + item.subject");
  });

  it('exposes percentage bars as named progressbars with numeric values', () => {
    expect(planner).toContain("role: 'progressbar'");
    expect(planner).toContain("'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': percent");
    expect(planner).toContain("percent + ' percent of scheduled time'");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
