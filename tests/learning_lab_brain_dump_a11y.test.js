import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Personal Brain Dump accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalBrainDump(props) {');
  const end = source.indexOf('  // ── D. PERSONAL IF-THEN PLANNER', start);
  const brain = source.slice(start, end);

  it('uses a stable focusable heading and qualified optional framing', () => {
    expect(brain).toContain("'learning-lab-brain-dump-heading'");
    expect(brain).toContain('An optional space to write down thoughts, tasks, worries, ideas, or questions');
    expect(brain).not.toContain('Off your mind, into the system.');
  });

  it('uses a named native form and submit control', () => {
    expect(brain).toContain("hh('form', { 'aria-labelledby': 'learning-lab-brain-dump-entry-heading', onSubmit: add }");
    expect(brain).toContain("id: 'learning-lab-brain-dump-entry-heading'");
    expect(brain).toContain("type: 'submit', 'data-ll-focusable': true");
  });

  it('removes misleading Enter-key instructions for a multiline field', () => {
    expect(brain).toContain('choose a category, then save.');
    expect(brain).not.toContain('Press Enter to save.');
  });

  it('provides a persistent textarea label and help relationship', () => {
    expect(brain).toContain("htmlFor: 'learning-lab-brain-dump-entry'");
    expect(brain).toContain("id: 'learning-lab-brain-dump-entry-help'");
    expect(brain).toContain("id: 'learning-lab-brain-dump-entry', required: true, maxLength: 4000");
    expect(brain).toContain("'aria-describedby': 'learning-lab-brain-dump-entry-help'");
  });

  it('identifies empty submission errors and moves focus to the field', () => {
    expect(brain).toContain("setEntryError('Enter something to add to the brain dump.')");
    expect(brain).toContain("id: 'learning-lab-brain-dump-entry-error', role: 'alert'");
    expect(brain).toContain("'aria-invalid': entryError ? 'true' : undefined");
    expect(brain).toContain("setFocusTarget('learning-lab-brain-dump-entry')");
    expect(brain).toContain("llAnnounce('Brain dump text is required.')");
  });

  it('clears the validation error while the user edits', () => {
    expect(brain).toContain("if (entryError) setEntryError('')");
  });

  it('groups category choices in a named fieldset', () => {
    expect(brain).toContain("hh('fieldset'");
    expect(brain).toContain("'Item category'");
  });

  it('uses pressed native category buttons with full-size targets', () => {
    expect(brain).toContain("type: 'button', 'aria-pressed': active ? 'true' : 'false', 'data-ll-focusable': true");
    expect(brain).toContain("style: { minHeight: 44, padding: '6px 10px'");
  });

  it('hides decorative category icons', () => {
    expect(brain).toContain("hh('span', { 'aria-hidden': 'true' }, option.icon + ' ')");
  });

  it('preserves sibling state when adding, toggling, deleting, or clearing', () => {
    expect(brain).toContain("setData(Object.assign({}, data, { items: [item].concat(data.items || []) }))");
    expect(brain).toContain("setData(Object.assign({}, data, { items: items }))");
    expect(brain).toContain("setData(Object.assign({}, data, { items: remaining }))");
    expect(brain).toContain("setData(Object.assign({}, data, { items: [] }))");
    expect(brain).not.toContain('setData({ items:');
  });

  it('announces successful additions and completion changes', () => {
    expect(brain).toContain("llAnnounce('Brain dump item added to ' + selectedCategory.label + '.')");
    expect(brain).toContain("llAnnounce((nextDone ? 'Completed: ' : 'Marked incomplete: ') + item.text)");
  });

  it('renders category filters as a named pressed-button group', () => {
    expect(brain).toContain("role: 'group', 'aria-label': 'Filter brain dump items by category'");
    expect(brain).toContain("key: 'fi-' + option.id, type: 'button', 'aria-pressed': active ? 'true' : 'false'");
  });

  it('announces the selected filter and its count', () => {
    expect(brain).toContain("llAnnounce(option.label + ' filter selected. ' + count");
  });

  it('reports filtered results through a polite atomic status', () => {
    expect(brain).toContain("id: 'learning-lab-brain-dump-results', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'");
    expect(brain).toContain("filtered.length + (filtered.length === 1 ? ' item shown' : ' items shown')");
  });

  it('renders saved items as a named semantic list', () => {
    expect(brain).toContain("hh('section', { 'aria-labelledby': 'learning-lab-brain-dump-items-heading'");
    expect(brain).toContain("hh('ul', { 'aria-labelledby': 'learning-lab-brain-dump-items-heading'");
    expect(brain).toContain("return hh('li', { key: 'it-' + item.id");
  });

  it('uses a pressed completion button with an item-specific name', () => {
    expect(brain).toContain("'aria-pressed': item.done ? 'true' : 'false'");
    expect(brain).toContain("'aria-label': (item.done ? 'Mark incomplete: ' : 'Mark complete: ') + itemName");
  });

  it('gives completion and delete controls 44 by 44 pixel targets', () => {
    expect(brain.match(/minWidth: 44, minHeight: 44/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('uses an item-specific accessible name for deletion', () => {
    expect(brain).toContain("'aria-label': 'Delete brain dump item: ' + itemName");
    expect(brain).not.toContain("'aria-label': 'Delete'");
  });

  it('does not reduce completed-item contrast through opacity', () => {
    expect(brain).not.toContain('opacity: item.done');
    expect(brain).toContain("textDecoration: item.done ? 'line-through' : 'none'");
    expect(brain).toContain("item.done ? hh('span', null, ' · Completed')");
  });

  it('wraps long multiline item content', () => {
    expect(brain).toContain("overflowWrap: 'anywhere', whiteSpace: 'pre-wrap'");
  });

  it('uses machine-readable creation dates', () => {
    expect(brain).toContain("hh('time', { dateTime: createdDate.toISOString()");
  });

  it('confirms individual, completed, and full-list destructive actions', () => {
    expect(brain).toContain("title: 'Delete this brain dump item?'");
    expect(brain).toContain("title: 'Clear completed brain dump items?'");
    expect(brain).toContain("title: 'Clear the entire brain dump?'");
  });

  it('announces destructive-action completion and restores focus', () => {
    expect(brain).toContain("llAnnounce('Brain dump item deleted.')");
    expect(brain).toContain("llAnnounce('Completed brain dump items cleared.')");
    expect(brain).toContain("llAnnounce('All brain dump items cleared.')");
    expect(brain).toContain("setFocusTarget(remaining.length ? 'learning-lab-brain-dump-items-heading' : 'learning-lab-brain-dump-entry')");
  });

  it('uses a qualified evidence note without unsupported treatment claims', () => {
    expect(brain).toContain('Working-memory capacity is limited, although estimates and models vary.');
    expect(brain).toContain('may reduce the need to keep rehearsing it');
    expect(brain).toContain('not a treatment or a guarantee');
    expect(brain).not.toContain('the brain stops tracking them as "open loops"');
    expect(brain).not.toContain("David Allen's 2001 productivity research");
  });

  it('renders the evidence note as a named aside with a semantic heading', () => {
    expect(brain).toContain("hh('aside', { 'aria-labelledby': 'learning-lab-brain-dump-note-heading'");
    expect(brain).toContain("hh('h3', { id: 'learning-lab-brain-dump-note-heading'");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
