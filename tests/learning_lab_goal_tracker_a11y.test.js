import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Personal Goal Tracker accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalGoalTracker(props) {');
  const end = source.indexOf('  // ── B. PERSONAL FOCUS TIMER', start);
  const goal = source.slice(start, end);

  it('provides stable focusable headings for list, form, and detail views', () => {
    expect(source).toContain('function tkSectionHeader(icon, title, subtitle, accent, headingId)');
    expect(source).toContain("id: headingId || undefined, tabIndex: headingId ? -1 : undefined");
    expect(goal).toContain("'learning-lab-goals-heading'");
    expect(goal).toContain("'learning-lab-goal-form-heading'");
    expect(goal).toContain("'learning-lab-goal-detail-heading'");
  });

  it('moves focus after each local view is committed', () => {
    expect(goal).toContain('function focusGoalView(targetId)');
    expect(goal).toContain("view === 'new' ? 'learning-lab-goal-form-heading'");
    expect(goal).toContain("view === 'detail' ? 'learning-lab-goal-detail-heading' : 'learning-lab-goals-heading'");
    expect(goal).toContain('focusGoalView(targetId)');
    expect(goal).toContain('}, [view, detailId])');
  });

  it('requires a meaningful title instead of silently creating an untitled goal', () => {
    expect(goal).toContain("var title = String(form.title || '').trim()");
    expect(goal).toContain("setFormError('Enter a short goal title before saving.')");
    expect(goal).toContain("llAnnounce('Goal title is required.')");
    expect(goal).not.toContain("title: form.title || 'Untitled goal'");
  });

  it('associates the title label, native required state, and validation error', () => {
    expect(goal).toContain("htmlFor: 'learning-lab-goal-title'");
    expect(goal).toContain("id: 'learning-lab-goal-title', required: true, maxLength: 200");
    expect(goal).toContain("'aria-invalid': formError ? 'true' : undefined");
    expect(goal).toContain("'aria-describedby': formError ? 'learning-lab-goal-title-error' : undefined");
    expect(goal).toContain("id: 'learning-lab-goal-title-error', role: 'alert'");
  });

  it('clears the title error when the user edits the field', () => {
    expect(goal).toContain("if (formError) setFormError('')");
  });

  it('labels every optional SMART textarea and connects its help prompt', () => {
    expect(goal).toContain("htmlFor: 'learning-lab-goal-' + s.id");
    expect(goal).toContain("id: 'learning-lab-goal-' + s.id + '-help'");
    expect(goal).toContain("id: 'learning-lab-goal-' + s.id, 'aria-describedby': 'learning-lab-goal-' + s.id + '-help'");
  });

  it('uses qualified instructions rather than claiming every SMART prompt is required', () => {
    expect(goal).toContain('The five optional prompts can help make the goal more concrete.');
    expect(goal).not.toContain('All 5 fields make a goal runnable.');
  });

  it('hides decorative SMART icons', () => {
    expect(goal).toContain("hh('span', { 'aria-hidden': 'true', style: { fontSize: 14 } }, s.icon)");
  });

  it('announces creation and editing success', () => {
    expect(goal).toContain("llAnnounce(existing ? 'Goal changes saved.' : 'Goal created.')");
  });

  it('reports the live completeness score in explicit units', () => {
    expect(goal).toContain("role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'");
    expect(goal).toContain("score + ' out of 100'");
    expect(goal).not.toContain("score + '/100'");
  });

  it('labels the check-in progress range and exposes its current value', () => {
    expect(goal).toContain("htmlFor: 'learning-lab-goal-checkin-progress'");
    expect(goal).toContain("id: 'learning-lab-goal-checkin-progress', type: 'range'");
    expect(goal).toContain("'aria-describedby': 'learning-lab-goal-checkin-progress-value'");
    expect(goal).toContain("'aria-valuetext': chkForm.progress + ' percent'");
  });

  it('gives the range control a visible focus hook and 44-pixel target', () => {
    expect(goal).toContain("'data-ll-focusable': true");
    expect(goal).toContain("width: '100%', minHeight: 44, accentColor: '#10b981'");
  });

  it('provides a persistent label for the optional check-in note', () => {
    expect(goal).toContain("htmlFor: 'learning-lab-goal-checkin-note'");
    expect(goal).toContain("id: 'learning-lab-goal-checkin-note'");
  });

  it('announces successful check-ins and status changes', () => {
    expect(goal).toContain("llAnnounce('Check-in saved at ' + chkForm.progress + ' percent progress.')");
    expect(goal).toContain("llAnnounce('Goal status changed to ' + status + '.')");
  });

  it('exposes detail progress as a named progressbar', () => {
    expect(goal).toContain("role: 'progressbar', 'aria-label': 'Goal progress'");
    expect(goal).toContain("'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': g.progress || 0");
    expect(goal).toContain("'aria-valuetext': (g.progress || 0) + ' percent'");
  });

  it('uses semantic subheadings for SMART details and check-ins', () => {
    expect(goal).toContain("hh('h3'");
    expect(goal).toContain("id: 'learning-lab-goal-checkin-heading'");
    expect(goal).toContain("'Check-in history'");
  });

  it('renders check-in history as an ordered list with machine-readable dates', () => {
    expect(goal).toContain("hh('ol', { 'aria-label': 'Goal check-in history'");
    expect(goal).toContain("return hh('li', { key: 'ci-' + i");
    expect(goal).toContain("hh('time', { dateTime: c.date");
  });

  it('announces deletion and restores list focus', () => {
    expect(goal).toContain("llAnnounce('Goal deleted.')");
    expect(goal).toContain("setDetailId(null); setView('list')");
  });

  it('renders goal statistics as a named description list', () => {
    expect(goal).toContain("hh('dl', { 'aria-label': 'Goal status summary'");
    expect(goal).toContain("hh('dt'");
    expect(goal).toContain("hh('dd'");
    expect(goal.indexOf("hh('dt'")).toBeLessThan(goal.indexOf("hh('dd'"));
  });

  it('hides decorative statistic icons', () => {
    expect(goal).toContain("hh('div', { 'aria-hidden': 'true', style: { fontSize: 16");
  });

  it('uses a named pressed-button group instead of incomplete tab semantics', () => {
    expect(goal).toContain("role: 'group', 'aria-label': 'Filter goals by status'");
    expect(goal).toContain("type: 'button', 'aria-pressed': active ? 'true' : 'false'");
    expect(goal).not.toContain("role: 'tablist'");
    expect(goal).not.toContain("role: 'tab'");
  });

  it('gives every filter a 44-pixel target and visible focus hook', () => {
    expect(goal).toContain("'data-ll-focusable': true");
    expect(goal).toContain("style: { minHeight: 44, padding: '6px 12px'");
  });

  it('reports the filtered result count politely', () => {
    expect(goal).toContain("filtered.length + (filtered.length === 1 ? ' goal shown' : ' goals shown')");
  });

  it('renders goals as a named semantic list', () => {
    expect(goal).toContain("hh('ul', { 'aria-label': 'Goals'");
    expect(goal).toContain("return hh('li', { key: 'g-' + g.id }, hh('button'");
  });

  it('provides an informative name and full-size target for each goal card', () => {
    expect(goal).toContain("'aria-label': 'Open goal: ' + g.title + '. Status ' + g.status + '. Progress ' + (g.progress || 0) + ' percent.'");
    expect(goal).toContain("width: '100%', minHeight: 44");
  });

  it('exposes each goal-card progress bar with a goal-specific name', () => {
    expect(goal).toContain("role: 'progressbar', 'aria-label': g.title + ' progress'");
    expect(goal).toContain("'aria-valuetext': (g.progress || 0) + ' percent'");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
