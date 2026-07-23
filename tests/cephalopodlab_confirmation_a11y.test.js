import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  loadTool,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_cephalopodlab.js';
const DEPLOY =
  'prismflow-deploy/public/stem_lab/stem_tool_cephalopodlab.js';

function renderConfirmation() {
  const container = document.createElement('div');
  container.innerHTML = renderTool('cephalopodLab', {
    cephalopodLab: {
      activeSection: 'hub',
      dayAbandonConfirmOpen: true,
    },
  });
  return container;
}

beforeEach(() => {
  window.localStorage.clear();
  resetStemLab();
  loadTool(SOURCE, 'cephalopodLab');
});

describe('Cephalopod Lab abandon-day confirmation accessibility', () => {
  it('renders a labelled modal alert dialog with safe action order', () => {
    const container = renderConfirmation();
    const dialog = container.querySelector('[role="alertdialog"]');
    const title = container.querySelector('#cephalopod-day-abandon-title');
    const message = container.querySelector(
      '#cephalopod-day-abandon-message'
    );
    const buttons = Array.from(dialog.querySelectorAll('button'));

    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe(title.id);
    expect(dialog.getAttribute('aria-describedby')).toBe(message.id);
    expect(title.textContent).toBe('Abandon this day?');
    expect(message.textContent).toBe('Your current day progress will be lost.');
    expect(buttons.map((button) => button.textContent)).toEqual([
      'Cancel',
      'Abandon day',
    ]);
  });

  it('implements focus entry, trapping, Escape cancellation, and restoration', () => {
    const source = readFileSync(SOURCE, 'utf8');

    expect(source).toContain('autoFocus: true');
    expect(source).toContain("event.key === 'Escape'");
    expect(source).toContain("event.key !== 'Tab'");
    expect(source).toContain('document.activeElement === first');
    expect(source).toContain('document.activeElement === last');
    expect(source).toContain('restoreDayAbandonFocus(trigger)');
    expect(source).toContain('tabIndex: -1, style: rootStyle');
  });

  it('removes the native confirmation API and retains explicit dialog state', () => {
    const source = readFileSync(SOURCE, 'utf8');

    expect(source).not.toMatch(/\bconfirm\s*\(/);
    expect(source).toContain('dayAbandonConfirmOpen: false');
    expect(source).toContain("role: 'alertdialog'");
  });

  it('preserves byte-for-byte deploy parity', () => {
    expect(readFileSync(DEPLOY, 'utf8')).toBe(readFileSync(SOURCE, 'utf8'));
  });
});
