import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Personal Focus Timer accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalFocusTimer(props) {');
  const end = source.indexOf('  // ── C. PERSONAL BRAIN DUMP', start);
  const timer = source.slice(start, end);

  it('uses a stable focusable section heading and qualified purpose copy', () => {
    expect(timer).toContain("'learning-lab-focus-heading'");
    expect(timer).toContain('Optional focus and break intervals.');
    expect(timer).not.toContain('Custom Pomodoro intervals. Sessions log automatically.');
  });

  it('renders summary statistics as a named description list', () => {
    expect(timer).toContain("hh('dl', { 'aria-label': 'Focus summary'");
    expect(timer).toContain("hh('dt'");
    expect(timer).toContain("hh('dd'");
    expect(timer.indexOf("hh('dt'")).toBeLessThan(timer.indexOf("hh('dd'"));
  });

  it('uses explicit units in statistic labels instead of abbreviations', () => {
    expect(timer).toContain("label: 'Focus minutes today'");
    expect(timer).toContain("label: 'Current streak days'");
    expect(timer).toContain("label: 'All-time focus hours'");
    expect(timer).not.toContain("todayMinutes + 'm'");
    expect(timer).not.toContain("streak + 'd'");
  });

  it('hides decorative statistic icons', () => {
    expect(timer).toContain("hh('div', { 'aria-hidden': 'true', style: { fontSize: 14");
  });

  it('provides a persistent label and length limit for the optional task', () => {
    expect(timer).toContain("htmlFor: 'learning-lab-focus-task'");
    expect(timer).toContain("id: 'learning-lab-focus-task', maxLength: 240");
  });

  it('groups focus and break duration choices in named fieldsets', () => {
    expect(timer).toContain("hh('fieldset'");
    expect(timer).toContain("'Focus interval length'");
    expect(timer).toContain("'Break interval length'");
  });

  it('uses pressed native buttons for duration choices', () => {
    expect(timer).toContain("type: 'button', 'aria-pressed': workMin === minutes ? 'true' : 'false'");
    expect(timer).toContain("type: 'button', 'aria-pressed': breakMin === minutes ? 'true' : 'false'");
    expect(timer).toContain("'aria-label': minutes + ' minute focus interval'");
    expect(timer).toContain("'aria-label': minutes + ' minute break interval'");
  });

  it('gives duration and start controls visible focus and 44-pixel targets', () => {
    expect(timer).toContain("minWidth: 44, minHeight: 44");
    expect(timer).toContain("type: 'button', onClick: start, 'data-ll-focusable': true");
    expect(timer).toContain("style: { minHeight: 44, padding: '12px 32px'");
  });

  it('offers a persistent completion-sound preference', () => {
    expect(timer).toContain('var soundEnabled = data.soundEnabled !== false');
    expect(timer).toContain("'aria-pressed': soundEnabled ? 'true' : 'false'");
    expect(timer).toContain("setData(Object.assign({}, data, { soundEnabled: !soundEnabled }))");
    expect(timer).toContain("'Completion sound: ' + (soundEnabled ? 'on' : 'off')");
  });

  it('does not create audio when the preference is disabled', () => {
    expect(timer).toContain("if (!soundEnabled || typeof window === 'undefined') return");
    expect(timer).toContain('if (!AudioContextClass) return');
  });

  it('closes completion audio contexts', () => {
    expect(timer).toContain('oscillator.onended = function()');
    expect(timer).toContain('audioContext.close()');
  });

  it('uses a polite atomic phase status instead of announcing every second', () => {
    expect(timer).toContain("id: 'learning-lab-focus-phase-status', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'");
    expect(timer).toContain("phase === 'work' ? 'Focus interval in progress.'");
    expect(timer).toContain("'Focus interval paused.'");
  });

  it('announces interval start, completion, break, and reset events', () => {
    expect(timer).toContain("llAnnounce('Focus interval started for ' + workMin + ' minutes.')");
    expect(timer).toContain("llAnnounce('Focus interval complete. Break started for ' + breakMin + ' minutes.')");
    expect(timer).toContain("llAnnounce('Break complete. Focus session finished.')");
    expect(timer).toContain("llAnnounce('Focus timer reset.')");
  });

  it('implements a real paused phase without clearing remaining time', () => {
    expect(timer).toContain("setPausedPhase(phase)");
    expect(timer).toContain("setPhase('paused')");
    expect(timer).toContain("var effectivePhase = phase === 'paused' ? (pausedPhase || 'work') : phase");
    const pause = timer.slice(timer.indexOf('    function pause()'), timer.indexOf('    function resume()'));
    expect(pause).not.toContain('setSecondsLeft(0)');
  });

  it('resumes the exact paused focus or break phase', () => {
    expect(timer).toContain("var nextPhase = pausedPhase === 'break' ? 'break' : 'work'");
    expect(timer).toContain("setPhase(nextPhase)");
    expect(timer).toContain("' interval resumed.'");
  });

  it('restores focus after start, resume, reset, and history clearing', () => {
    expect(timer).toContain("setFocusTarget('learning-lab-focus-timer-value')");
    expect(timer).toContain("setFocusTarget('learning-lab-focus-task')");
    expect(timer).toContain("setFocusTarget('learning-lab-focus-heading')");
    expect(timer).toContain('}, [focusTarget])');
  });

  it('exposes circular countdown completion through a named progressbar', () => {
    expect(timer).toContain("role: 'progressbar', 'aria-label': phaseName + ' interval remaining'");
    expect(timer).toContain("'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': percentRemaining");
    expect(timer).toContain("'aria-valuetext': mins + ' minutes ' + secs + ' seconds remaining'");
  });

  it('exposes the remaining time through a focusable timer role', () => {
    expect(timer).toContain("id: 'learning-lab-focus-timer-value', role: 'timer', tabIndex: -1");
    expect(timer).toContain("'aria-label': phaseName + ' time remaining: '");
  });

  it('hides the decorative circular SVG from assistive technology', () => {
    expect(timer).toContain("hh('svg', { viewBox: '0 0 200 200', 'aria-hidden': 'true', focusable: 'false'");
  });

  it('inherits the global reduced-motion override for countdown transitions', () => {
    expect(source).toContain('@media (prefers-reduced-motion: reduce)');
    expect(source).toContain('transition-duration: 0.01ms !important');
  });

  it('uses explicit pause, resume, and reset action names', () => {
    expect(timer).toContain("tkBtn('Resume ' + phaseName.toLowerCase()");
    expect(timer).toContain("tkBtn('Pause ' + phaseName.toLowerCase()");
    expect(timer).toContain("tkBtn('Reset timer'");
    expect(timer).not.toContain("tkBtn('⏸ Pause'");
  });

  it('renders session history as a named section and ordered list', () => {
    expect(timer).toContain("hh('section', { 'aria-labelledby': 'learning-lab-focus-history-heading'");
    expect(timer).toContain("hh('h3', { id: 'learning-lab-focus-history-heading'");
    expect(timer).toContain("hh('ol', { 'aria-label': \"Today's focus sessions\"");
    expect(timer).toContain("return hh('li', { key: 's-' + session.id");
  });

  it('uses machine-readable completion times and explicit minute units', () => {
    expect(timer).toContain("hh('time', { dateTime: completedDate.toISOString()");
    expect(timer).toContain("session.workMin + ' minutes'");
    expect(timer).not.toContain("s.workMin + 'm'");
  });

  it('uses a descriptive empty task label', () => {
    expect(timer).toContain("'No task label'");
    expect(timer).not.toContain("'No label'");
  });

  it('retains app-controlled confirmation and announces history clearing', () => {
    expect(timer).toContain('askLearningLabConfirmation("Clear today\'s focus session history?');
    expect(timer).toContain('llAnnounce("Today\'s focus session history cleared.")');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
