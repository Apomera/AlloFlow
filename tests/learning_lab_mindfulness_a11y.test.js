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

  it('uses a named control group and exposes pause state', () => {
    expect(mindfulness).toContain("role: 'group', 'aria-label': 'Mindfulness timer controls'");
    expect(mindfulness).toContain("'aria-pressed': playing ? 'true' : 'false'");
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
    expect(mindfulness).toContain("setData(Object.assign({}, data, { sessions: [session].concat(data.sessions || []) }))");
    expect(mindfulness).not.toContain('setData({ sessions:');
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
    expect(source).toBe(read('prismflow-deploy/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
