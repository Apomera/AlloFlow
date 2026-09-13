import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, setupBehaviorLens } from './helpers/behavior_lens_harness.js';

const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { Simulate } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const { act } = React;
const source = readFileSync(resolve('behavior_lens_module.js'), 'utf8');
let components;
let mounted;
const originalNow = Date.now;
const originalRandom = Math.random;
const noop = () => {};

beforeAll(() => {
  setupBehaviorLens();
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.AlloModules.BehaviorLens;
  // Expose closure components only inside this test's in-memory evaluation.
  new Function(source.replace(/\}\)\(\);\s*$/, 'window.__blUxTests = { ABCModal, FrequencyCounter, LiveObsOverlay, IntervalGrid, ChoiceBoard, ToolSelectionWizard, behaviorLensToolPrerequisite };})();'))();
  components = window.__blUxTests;
});

afterEach(async () => {
  if (mounted) await act(async () => mounted.unmount());
  mounted = null;
  document.body.innerHTML = '';
  sessionStorage.clear();
  vi.restoreAllMocks();
});

async function mount(name, props = {}) {
  document.body.innerHTML = '<div class="bl-root"><button id="opener">Open observation</button><div id="mount"></div></div>';
  document.getElementById('opener').focus();
  mounted = createRoot(document.getElementById('mount'));
  await act(async () => mounted.render(React.createElement(components[name], {
    onClose: noop, onSave: noop, onSaveSession: noop, onSelectTool: noop,
    studentName: 'Test Student', studentDraftId: 'student-id-1', t: () => undefined, addToast: noop, targetBehaviors: [], ...props
  })));
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 5)); });
}
const byName = name => document.querySelector(`[aria-label="${name}"]`);
const button = text => Array.from(document.querySelectorAll('button')).find(el => el.textContent.trim() === text);
async function click(el) { expect(el).toBeTruthy(); await act(async () => el.click()); }
async function change(el, value) { expect(el).toBeTruthy(); await act(async () => Simulate.change(el, { target: { value } })); }
const draftKey = (kind, id = 'student-id-1') => 'behaviorLens_observation_draft_v1_' + kind + '_' + encodeURIComponent(id);
function seed(kind, data, id) { sessionStorage.setItem(draftKey(kind, id), JSON.stringify({ version: 1, savedAt: Date.now(), data })); }

describe('BehaviorLens ABC entry review and accessible selection', () => {
  it('shows custom narratives and retains dates, phase, metadata, zero duration and unrated intensity on edit', async () => {
    const onSave = vi.fn();
    const entry = { id: 'abc-custom', antecedent: 'Fractions worksheet was introduced', behavior: 'Covered ears and stepped back', consequence: 'Moved to a quiet desk', timestamp: '2026-09-01T15:07:21.000Z', occurredAt: '2026-09-01T15:07:21.000Z', recordedAt: '2026-09-02T17:00:00.000Z', phase: 'Baseline', metadata: { importBatch: 'one' }, intensity: null, duration: 0 };
    await mount('ABCModal', { entry, onSave });
    expect(byName('Antecedent narrative').value).toBe(entry.antecedent);
    expect(byName('Behavior narrative').value).toBe(entry.behavior);
    expect(byName('Consequence narrative').value).toBe(entry.consequence);
    expect(byName('Behavior intensity rating 1 to 5').value).toBe('');
    await click(button('Save Entry'));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining(entry));
  });

  it('changes occurrence time without rewriting the original recorded time', async () => {
    const onSave = vi.fn();
    const recordedAt = '2026-09-02T17:00:00.000Z';
    await mount('ABCModal', { onSave, entry: { id: 'time-edit', antecedent: 'Transition', behavior: 'Elopement', consequence: 'Given break', occurredAt: '2026-09-01T15:07:21.000Z', recordedAt } });
    await change(document.getElementById('bl-abc-occurred-at'), '2026-09-01T08:30');
    await click(button('Save Entry'));
    expect(onSave.mock.calls[0][0]).toMatchObject({ occurredAt: new Date('2026-09-01T08:30').toISOString(), recordedAt, intensity: null });
  });

  it('uses the visible ABC option names and announces the selected option', async () => {
    await mount('ABCModal');
    expect(byName('Toggle value')).toBeNull();
    const transition = byName('Transition');
    expect(transition.getAttribute('aria-pressed')).toBe('false');
    await click(transition);
    expect(transition.getAttribute('aria-pressed')).toBe('true');
    expect(byName('Antecedent narrative').value).toBe('Transition');
    await change(byName('Antecedent narrative'), 'A custom transition');
    expect(transition.getAttribute('aria-pressed')).toBe('false');
    expect(byName('Antecedent narrative').value).toBe('A custom transition');
  });

  it('exposes meaningful wizard answers and consistent tool prerequisites', async () => {
    await mount('ToolSelectionWizard');
    expect(byName('Figure out WHY a behavior happens')).toBeTruthy();
    expect(byName('Select')).toBeNull();
    expect(components.behaviorLensToolPrerequisite('abc', '', 0)).toMatch(/Choose a student/);
    expect(components.behaviorLensToolPrerequisite('wizard', '', 0)).toBe('');
    expect(components.behaviorLensToolPrerequisite('analysis', 'Student', 2)).toMatch(/3 ABC/);
    expect(components.behaviorLensToolPrerequisite('abc', 'Student', 0)).toBe('');
  });
});

describe('BehaviorLens recording recovery and modal lifecycle', () => {
  it('traps Tab at both ends and restores the opener after unmount', async () => {
    await mount('FrequencyCounter');
    const opener = document.getElementById('opener');
    expect(opener.hasAttribute('inert')).toBe(true);
    const controls = Array.from(document.querySelector('[role="dialog"]').querySelectorAll('button,input,select'));
    const first = controls[0], last = controls.at(-1);
    last.focus();
    last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(first);
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(last);
    await act(async () => mounted.unmount()); mounted = null;
    expect(document.activeElement).toBe(opener);
    expect(opener.hasAttribute('inert')).toBe(false);
  });

  it('requires a keep-draft decision on Escape and restores the paused recording', async () => {
    const onClose = vi.fn();
    await mount('FrequencyCounter', { onClose });
    await click(byName('Add one to unlabeled behavior'));
    await act(async () => document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    expect(onClose).not.toHaveBeenCalled();
    expect(document.querySelector('[role="alertdialog"]')).toBeTruthy();
    await click(button('Keep draft and close'));
    expect(onClose).toHaveBeenCalledOnce();
    await act(async () => mounted.unmount()); mounted = null;
    await mount('FrequencyCounter');
    expect(byName('Start recording').getAttribute('aria-pressed')).toBe('false');
    expect(JSON.parse(sessionStorage.getItem(draftKey('frequency'))).data.counters[0].count).toBe(1);
    expect(document.querySelector('.bl-freq-count-solo').textContent).toBe('1');
  });

  it('saves and clears a restored zero-event timed session', async () => {
    seed('frequency', { elapsed: 120, counters: [{ id: 'counter', label: 'Target behavior', count: 0 }] });
    const onSaveSession = vi.fn();
    await mount('FrequencyCounter', { onSaveSession });
    await click(button('Save'));
    expect(onSaveSession).toHaveBeenCalledWith(expect.objectContaining({ duration: 120, data: expect.objectContaining({ count: 0 }) }));
    expect(sessionStorage.getItem(draftKey('frequency'))).toBeNull();
  });

  it('isolates drafts by student and confirms deliberate discard', async () => {
    seed('frequency', { elapsed: 20, counters: [{ id: 'counter', label: 'Private target', count: 8 }] }, 'another-student');
    await mount('FrequencyCounter');
    expect(byName('Behavior counter label').value).toBe('');
    await click(byName('Add one to unlabeled behavior'));
    await click(button('Discard draft'));
    expect(sessionStorage.getItem(draftKey('frequency'))).not.toBeNull();
    await click(button('Discard observation'));
    expect(sessionStorage.getItem(draftKey('frequency'))).toBeNull();
    expect(sessionStorage.getItem(draftKey('frequency', 'another-student'))).not.toBeNull();
  });

  it('does not dismiss a recording when draft storage is unavailable', async () => {
    const onClose = vi.fn(), addToast = vi.fn();
    await mount('FrequencyCounter', { onClose, addToast });
    await click(byName('Add one to unlabeled behavior'));
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });
    await click(byName('Close Frequency Counter'));
    expect(onClose).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('could not keep'), 'error');
  });
});
