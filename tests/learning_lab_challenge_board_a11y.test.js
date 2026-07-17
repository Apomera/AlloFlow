import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Challenge Board accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalChallengeBoard(props) {');
  const end = source.indexOf('  function PersonalTimeEstimator(props) {', start);
  const board = source.slice(start, end);

  it('uses a named creation form with submit and cancel controls', () => {
    expect(board).toContain("onSubmit: function(event) { event.preventDefault(); addChallenge(); }");
    expect(board).toContain("'aria-labelledby': 'learning-lab-challenge-form-heading'");
    expect(board).toContain("hh('button', { type: 'submit'");
  });

  it('associates all challenge creation fields', () => {
    for (const field of ['title', 'action', 'why', 'start', 'days']) {
      expect(board).toContain(`htmlFor: 'learning-lab-challenge-${field}'`);
      expect(board).toContain(`id: 'learning-lab-challenge-${field}'`);
    }
  });

  it('reports missing title and daily action independently', () => {
    expect(board).toContain("title: form.title.trim() ? '' : 'Challenge name is required.'");
    expect(board).toContain("dailyAction: form.dailyAction.trim() ? '' : 'Daily action is required.'");
    expect(board).toContain("id: 'learning-lab-challenge-title-error', role: 'alert'");
    expect(board).toContain("id: 'learning-lab-challenge-action-error', role: 'alert'");
    expect(board).not.toContain("alert('Need title + daily action.')");
  });

  it('focuses the first invalid required field', () => {
    expect(board).toContain("document.getElementById(nextErrors.title ? 'learning-lab-challenge-title' : 'learning-lab-challenge-action')");
    expect(board).toContain("'aria-invalid': errors.title ? 'true' : undefined");
    expect(board).toContain("'aria-invalid': errors.dailyAction ? 'true' : undefined");
  });

  it('uses semantic challenge lists and articles', () => {
    expect(board).toContain("hh('ul', { 'aria-label': 'Personal challenges'");
    expect(board).toContain("return hh('li', { key: 'ch-' + challenge.id");
    expect(board).toContain("hh('article', { 'aria-label': challenge.title");
  });

  it('gives each challenge progressbar semantics', () => {
    expect(board).toContain("role: 'progressbar'");
    expect(board).toContain("'aria-label': challenge.title + ' completion'");
    expect(board).toContain("'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct");
    expect(board).toContain("'aria-valuetext': doneCount + ' of ' + challenge.days + ' days complete'");
  });

  it('provides a concise alternative for daily completion history', () => {
    expect(board).toContain("role: 'img', 'aria-label': 'Daily completion history. '");
    expect(board).toContain("' days logged. Today is ' + (todayDone ? 'complete.' : 'not complete.')");
    expect(board).toContain("'aria-hidden': 'true'");
  });

  it('does not rely on color alone for daily history', () => {
    expect(board).toContain("done ? '✓' : '·'");
    expect(board).toContain("'✓ complete · · not complete · outlined square is today'");
    expect(board).not.toContain("title: iso");
  });

  it('exposes today completion as a large toggle', () => {
    expect(board).toContain("'aria-pressed': todayDone ? 'true' : 'false'");
    expect(board).toContain("todayDone ? '✓ Done today — select to undo' : '+ Log today'");
    expect(board).toContain("minHeight: 44, padding: '6px 14px'");
  });

  it('provides named 44-pixel confirmed deletion', () => {
    expect(board).toContain("'aria-label': 'Delete challenge: ' + challenge.title");
    expect(board).toContain("minWidth: 44, minHeight: 44");
    expect(board).toContain("title: 'Delete this challenge?', confirmText: 'Delete challenge'");
    expect(board).not.toContain("confirm('Delete this challenge?')");
  });

  it('announces creation, daily changes, and deletion while preserving data', () => {
    expect(board).toContain("llAnnounce('Challenge started: '");
    expect(board).toContain("' marked incomplete for today.' : ' marked complete for today.'");
    expect(board).toContain("llAnnounce('Challenge deleted.')");
    expect(board).toContain("setData(Object.assign({}, data, { challenges:");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('prismflow-deploy/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
