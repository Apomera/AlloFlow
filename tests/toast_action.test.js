// Toasts can carry one action (2026-10-29). First use: the "?" Help Mode notice
// offers "Turn off this shortcut". An action toast stays up 5 s longer so a
// keyboard or switch user can reach the button, and the button must work while
// Help Mode is on, which otherwise turns every click into a help lookup.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { sliceBetween } from './helpers/anchored_slice.js';

const app = readFileSync(process.env.ANTI_CANDIDATE || 'AlloFlowANTI.txt', 'utf8');
const addToastSrc = sliceBetween(app, "  const addToast = (message, type = 'info', options = null) => {", '  // BEGIN LEARNING_WEB_HOST_BRIDGE', { file: 'AlloFlowANTI.txt' });

function host() {
  let toasts = [];
  const scheduled = [];
  const addToast = new Function('setToasts', 'clearToastTimer', 'setToastHistory', 'scheduleToastDismiss',
    addToastSrc + '\nreturn addToast;')(
    (fn) => { toasts = fn(toasts); }, () => {}, () => {}, (id, ms) => scheduled.push(ms));
  return { addToast, get toasts() { return toasts; }, scheduled };
}

describe('toast actions', () => {
  it('keeps a valid action and gives the toast 5 s more', () => {
    const h = host();
    const onClick = () => {};
    h.addToast('Plain note.', 'info');
    h.addToast('Plain note.', 'info', { action: { label: 'Undo', onClick } });
    expect(h.toasts[0].action).toBe(null);
    expect(h.toasts[1].action).toEqual({ label: 'Undo', onClick });
    expect(h.scheduled[1] - h.scheduled[0]).toBe(5000);
  });
  it('drops an action without a label or a handler, and old two-argument calls still work', () => {
    const h = host();
    h.addToast('A', 'info', { action: { label: '', onClick: () => {} } });
    h.addToast('B', 'info', { action: { label: 'Go' } });
    h.addToast('C');
    expect(h.toasts.map((t) => t.action)).toEqual([null, null, null]);
    expect(h.toasts[2].type).toBe('info');
  });
  it('renders the action as a 44 px button that works in Help Mode and dismisses its toast', () => {
    const button = sliceBetween(app, '{toast.action && (', '{toast.action.label}', { file: 'AlloFlowANTI.txt' });
    expect(button).toContain('data-help-ignore="true"');
    expect(button).toContain('onClick={() => { dismissToast(toast.id); toast.action.onClick(); }}');
    expect(button).toContain('min-h-[44px]');
  });
});
