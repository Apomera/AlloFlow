import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'stem_lab/stem_tool_kitchenlab.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_kitchenlab.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Kitchen Lab accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('lets learners pause, resume, and reset the handwash timer', () => {
    const text = source();
    expect(text).toContain('function pauseHandwashTimer()');
    expect(text).toContain('function startOrResumeHandwashTimer()');
    expect(text).toContain('function resetHandwashTimer()');
    expect(text).toContain("role: 'progressbar', 'aria-label': 'Handwash timer progress'");
    expect(text).toContain("started ? '⏸ Pause timer' : paused ? '▶ Resume timer'");
    expect(text).toContain("role: 'timer', 'aria-live': 'off'");
  });

  it('freezes recipe simulation and competition timing while paused', () => {
    const text = source();
    expect(text).toContain('function pauseRecipe()');
    expect(text).toContain('function resumeRecipe()');
    expect(text).toContain("setKL({ recipePhase: 'paused', recipePausedAt: pausedAt })");
    expect(text).toContain('competitionDeadline: shiftTimestamp(d.competitionDeadline)');
    expect(text).toContain("isPaused ? '▶ Resume cooking' : '⏸ Pause cooking'");
    expect(text).toContain("isPaused ? 'Cooking and competition timers are paused.'");
    expect(text).toContain("value: burnerLevel, disabled: isPaused");
    expect(text).toContain("key: ing.id, disabled: isPaused");
    expect(text).toContain("disabled: controlsDisabled || phase !== 'pasta-done'");
  });

  it('uses a focus-managed alert dialog for destructive confirmations', () => {
    const text = source();
    expect(text).not.toMatch(/\bconfirm\s*\(/);
    expect(text).toContain("role: 'alertdialog', 'aria-modal': 'true'");
    expect(text).toContain("'aria-labelledby': 'kitchen-confirm-title'");
    expect(text).toContain("trapDialogFocus(e, 'kitchen-confirm-dialog', closeConfirmation)");
    expect(text).toContain("if (e.key === 'Escape')");
    expect(text).toContain("openConfirmation('recipe')");
    expect(text).toContain("openConfirmation('tournament')");
    expect(text).toContain("document.getElementById('kitchen-lab-region')");
    expect(text).toContain("id: 'kitchen-lab-region', tabIndex: -1");
  });

  it('manages focus for the existing AI suggester dialog', () => {
    const text = source();
    expect(text).toContain("id: 'kitchen-suggester-dialog', role: 'dialog'");
    expect(text).toContain("id: 'kitchen-suggester-close', type: 'button'");
    expect(text).toContain("trapDialogFocus(e, 'kitchen-suggester-dialog', closeSuggester)");
    expect(text).toContain("htmlFor: 'kitchen-suggester-input'");
    expect(text).toContain("id: 'kitchen-suggester-input', value: inputVal");
  });

  it('names knife diagrams and preserves table and writing-field relationships', () => {
    const text = source();
    expect(text.match(/role: 'img', 'aria-label': label/g)).toHaveLength(4);
    expect(text.match(/h\('th', \{ scope: 'col'/g)).toHaveLength(3);
    expect(text).toContain("h('th', { scope: 'row'");
    expect(text).toContain("'aria-label': 'Maillard reaction hypothesis'");
    expect(text).toContain("'aria-label': 'Explain the chemistry of Maillard browning'");
  });
});
