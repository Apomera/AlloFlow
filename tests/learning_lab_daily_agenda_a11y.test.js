import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Daily Agenda accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalDailyAgenda(props) {');
  const end = source.indexOf('  function PersonalEmotionRegulator(props) {', start);
  const dailyAgenda = source.slice(start, end);

  it('labels the extra-item field and supports form submission', () => {
    expect(dailyAgenda).toContain("htmlFor: 'learning-lab-agenda-item'");
    expect(dailyAgenda).toContain("id: 'learning-lab-agenda-item', type: 'text'");
    expect(dailyAgenda).toContain("onSubmit: function(event) { event.preventDefault(); addCustom(newText); }");
    expect(dailyAgenda).toContain("tkBtn('Add item'");
  });

  it('reports blank-item errors inline and returns focus to the field', () => {
    expect(dailyAgenda).toContain("setItemError('Enter an item before adding it.')");
    expect(dailyAgenda).toContain("id: 'learning-lab-agenda-item-error', role: 'alert'");
    expect(dailyAgenda).toContain("document.getElementById('learning-lab-agenda-item')");
    expect(dailyAgenda).toContain("'aria-invalid': itemError ? 'true' : undefined");
  });

  it('announces the changing daily score', () => {
    expect(dailyAgenda).toContain("role: 'status', 'aria-live': 'polite'");
    expect(dailyAgenda).toContain("'aria-label': 'Today\\'s done rate: '");
    expect(dailyAgenda).toContain("score.done + ' of ' + score.total + ' planned items.'");
  });

  it('uses semantic section headings and lists for agenda summaries', () => {
    for (const section of ['schedule', 'habits', 'goals', 'tasks', 'extra']) {
      expect(dailyAgenda).toContain(`'aria-labelledby': 'learning-lab-agenda-${section}-heading'`);
      expect(dailyAgenda).toContain(`id: 'learning-lab-agenda-${section}-heading'`);
    }
    expect(dailyAgenda.match(/hh\('ul'/g)?.length).toBeGreaterThanOrEqual(5);
    expect(dailyAgenda.match(/hh\('li'/g)?.length).toBeGreaterThanOrEqual(5);
  });

  it('exposes habit completion without relying on color', () => {
    expect(dailyAgenda).toContain("done ? 'Completed' : 'Not completed'");
    expect(dailyAgenda).toContain("'aria-hidden': 'true'");
  });

  it('gives visual goal bars progress semantics', () => {
    expect(dailyAgenda).toContain("role: 'progressbar'");
    expect(dailyAgenda).toContain("'aria-label': g.title + ' progress'");
    expect(dailyAgenda).toContain("'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': progress");
  });

  it('provides named 44-pixel completion and delete controls', () => {
    expect(dailyAgenda).toContain("role: 'checkbox', 'aria-checked': it.done ? 'true' : 'false'");
    expect(dailyAgenda).toContain("'aria-label': (it.done ? 'Mark incomplete: ' : 'Mark complete: ') + it.text");
    expect(dailyAgenda).toContain("'aria-label': 'Delete agenda item: ' + it.text");
    expect(dailyAgenda.match(/minWidth: 44, minHeight: 44/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('confirms deletion and announces item changes', () => {
    expect(dailyAgenda).toContain("title: 'Delete this agenda item?', confirmText: 'Delete item'");
    expect(dailyAgenda).toContain("llAnnounce('Agenda item added: ' + text.trim() + '.')");
    expect(dailyAgenda).toContain("llAnnounce('Agenda item deleted.')");
    expect(dailyAgenda).toContain("marked complete.' : ' marked incomplete.'");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('prismflow-deploy/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
