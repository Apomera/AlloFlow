import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Mindfulness Practice accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalMindfulness(props) {');
  const end = source.indexOf('  function PersonalAnxietyToolkit(props) {', start);
  const mindfulness = source.slice(start, end);

  it('announces natural timer completion', () => {
    expect(mindfulness).toContain('if (seconds <= 0) {');
    expect(mindfulness).toContain("+ ' timer complete.'");
    expect(mindfulness).toContain('setPlaying(false);');
  });

  it('exposes remaining time with timer semantics', () => {
    expect(mindfulness).toContain("role: 'timer'");
    expect(mindfulness).toContain("'aria-label': minutes + ' minutes and ' + remainingSeconds + ' seconds remaining'");
  });

  it('exposes elapsed progress with complete value semantics', () => {
    expect(mindfulness).toContain("role: 'progressbar'");
    expect(mindfulness).toContain("'aria-label': practice.label + ' progress'");
    expect(mindfulness).toContain("'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': elapsedPercent");
    expect(mindfulness).toContain("'aria-valuetext': elapsedSeconds + ' seconds elapsed; ' + seconds + ' seconds remaining'");
  });

  it('states running, paused, and complete conditions in text', () => {
    expect(mindfulness).toContain("var statusText = seconds <= 0 ? 'Timer complete' : playing ? 'In practice' : 'Paused'");
    expect(mindfulness).toContain("hh('div', { role: 'status'");
  });

  it('restarts meaningfully after the timer reaches zero', () => {
    expect(mindfulness).toContain("var toggleLabel = seconds <= 0 ? 'Restart timer'");
    expect(mindfulness).toContain('setSeconds(practice.duration);');
    expect(mindfulness).toContain("llAnnounce(practice.label + ' timer restarted.')");
  });

  it('uses a named control group with label-based toggle state', () => {
    expect(mindfulness).toContain("role: 'group', 'aria-label': 'Mindfulness timer controls'");
    expect(mindfulness).toContain("var toggleLabel = seconds <= 0 ? 'Restart timer' : playing ? 'Pause timer' : 'Resume timer'");
    expect(mindfulness).not.toContain("'aria-pressed'");
    expect(mindfulness).toContain("type: 'button'");
  });

  it('moves focus into the active practice and back to its start control', () => {
    expect(mindfulness).toContain("focusById('learning-lab-mindfulness-active-heading')");
    expect(mindfulness).toContain("id: 'learning-lab-mindfulness-active-heading', tabIndex: -1");
    expect(mindfulness).toContain("focusById('learning-lab-mindfulness-start-' + practice.id)");
  });

  it('confirms cancellation in an accessible app dialog', () => {
    expect(mindfulness).toContain("title: 'Cancel this mindfulness session?', confirmText: 'Cancel session'");
    expect(mindfulness).not.toContain('confirm(');
  });

  it('preserves unrelated section data when saving a session', () => {
    expect(mindfulness).toContain("setData(Object.assign({}, data, { sessions: [session].concat(rawSessions) }))");
    expect(mindfulness).not.toContain('setData({ sessions:');
  });

  it('handles malformed legacy session data without crashing', () => {
    expect(mindfulness).toContain("var rawSessions = Array.isArray(data.sessions) ? data.sessions : [];");
    expect(mindfulness).toContain("Number(session && session.duration) || 0");
    expect(source).toContain("stat: (Array.isArray((data.mytkMind || {}).sessions) ? (data.mytkMind || {}).sessions.length : 0) + ' sessions'");
  });

  it('synchronizes focus with rendered state instead of a focus timer', () => {
    expect(mindfulness).toContain('if (!pendingFocusId) return;');
    expect(mindfulness).toContain('var target = document.getElementById(pendingFocusId);');
    expect(mindfulness).toContain("function focusById(id) { setPendingFocusId(id); }");
    expect(mindfulness).not.toContain('setTimeout(function() { var target = document.getElementById(id)');
  });

  it('explains optional use, local saving, and non-communication', () => {
    expect(mindfulness).toContain('These practices are optional.');
    expect(mindfulness).toContain('saving a session does not notify a teacher, school, employer, clinician, or family member');
    expect(mindfulness).toContain('Mindfulness practice is not therapy and does not replace professional support.');
    expect(mindfulness).toContain('If a practice brings up strong or uncomfortable feelings, it is okay to stop and choose a different kind of support.');
  });

  it('describes practices without unsupported clinical effect claims', () => {
    expect(mindfulness).toContain('about:');
    expect(mindfulness).not.toContain('research:');
    expect(mindfulness).not.toContain('Reduces anxiety and chronic pain');
    expect(mindfulness).not.toContain('parasympathetic');
    expect(mindfulness).not.toContain('Reduces rumination');
    expect(mindfulness).not.toContain('doubles retention');
    expect(mindfulness).not.toContain('Builds cognitive flexibility');
    expect(mindfulness).not.toContain('Trains attention');
  });

  it('announces start, pause or resume, save, and cancellation', () => {
    expect(mindfulness).toContain("llAnnounce(practice.label + ' started. '");
    expect(mindfulness).toContain("nextPlaying ? ' resumed.' : ' paused.'");
    expect(mindfulness).toContain("+ ' session saved. '");
    expect(mindfulness).toContain("+ ' session canceled.'");
  });

  it('uses semantic labeled instructions', () => {
    expect(mindfulness).toContain("'aria-labelledby': 'learning-lab-mindfulness-instructions-heading'");
    expect(mindfulness).toContain("id: 'learning-lab-mindfulness-instructions-heading'");
    expect(mindfulness).toContain("hh('p', { style: { margin: 0 } }, practice.instructions)");
  });

  it('uses a semantic list of named practice controls', () => {
    expect(mindfulness).toContain("hh('ul', { 'aria-label': 'Available mindfulness practices'");
    expect(mindfulness).toContain("return hh('li', { key: 'pr-' + practice.id }");
    expect(mindfulness).toContain("'aria-label': 'Start ' + practice.label + ', '");
  });

  it('does not use practice accent colors for essential small text', () => {
    expect(mindfulness).toContain("color: 'var(--allo-stem-text, #e2e8f0)'");
    expect(mindfulness).toContain("color: 'var(--allo-stem-text-soft, #94a3b8)'");
    expect(mindfulness).not.toContain('fontSize: 13, fontWeight: 800, color: practice.color');
  });

  it('provides named totals and hides decorative icons', () => {
    expect(mindfulness).toContain("'aria-label': 'Mindfulness practice totals'");
    expect(mindfulness).toContain("hh('span', { 'aria-hidden': 'true'");
  });

  it('provides 44-pixel timer and practice controls', () => {
    expect(mindfulness).toContain("minHeight: 44, padding: '9px 14px'");
    expect(mindfulness).toContain("width: '100%', minHeight: 44");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
