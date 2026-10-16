import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let React, createRoot, act, View, root, host;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act || require(resolve('desktop/web-app/node_modules/react-dom/test-utils')).act;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.React = globalThis.React = React;
  ['resource_content_fingerprint_module.js', 'lesson_teaching_script_module.js', 'view_lesson_teaching_script_module.js'].forEach(loadAlloModule);
  View = window.AlloModules.LessonTeachingScriptView;
});
beforeEach(() => sessionStorage.clear());
afterEach(() => {
  if (root) act(() => root.unmount());
  root = null; host?.remove(); host = null;
  vi.restoreAllMocks();
});
const memory = { stage: 'chunking', completedChunks: 1, totalChunks: 3, persistence: 'memory' };
function props(extra = {}) {
  return {
    generatedContent: { id: 'plan', type: 'lesson-plan', data: { objectives: ['Compare fractions'], directInstruction: 'Compare equal parts.' } },
    history: [{ id: 'material', type: 'source', title: 'Fraction strips', data: { text: 'Fold strips into equal halves and fourths.' } }],
    isTeacherMode: true, draftScope: 'teacher', t: () => '', capabilities: { canGenerate: true, canResearch: true },
    defaultSettings: { grade: '4th Grade', subject: 'mathematics', topic: 'Fractions', language: 'English', suggestedDuration: { segment: 15 } },
    onGenerateTeachingScript: vi.fn().mockResolvedValue({ ok: true }), onGetTeachingScriptRecovery: () => memory,
    ...extra
  };
}
function render(p) { act(() => root.render(React.createElement(View, p))); }
function mount(p = props()) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); render(p);
}
function button(text) { return [...host.querySelectorAll('button')].find(node => node.textContent.trim() === text); }
function click(text) { act(() => button(text).click()); }
function reloadPrevented() {
  const event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); return event.defaultPrevented;
}
const warning = 'could not keep a recovery copy of the latest generated work';

describe('generation progress that could not be persisted', () => {
  it('shows the storage warning even when collapsed and protects unsaved generated work on reload', () => {
    mount(); expect(host.textContent).toContain(warning); expect(reloadPrevented()).toBe(true);
    click('Teaching script+'); expect(button('Resume script').disabled).toBe(false);
    expect(host.textContent).toContain('switching workspaces');
  });
  it.each(['session', undefined])('does not warn or block reload for %s persistence', persistence => {
    mount(props({ onGetTeachingScriptRecovery: () => ({ ...memory, persistence }) }));
    expect(host.textContent).not.toContain(warning); expect(reloadPrevented()).toBe(false);
  });
  it('removes and restores protection as the latest checkpoint becomes durable or fails to persist', () => {
    const p = props(); mount(p); expect(reloadPrevented()).toBe(true);
    render({ ...p, onGetTeachingScriptRecovery: () => ({ ...memory, persistence: 'session' }) });
    expect(host.textContent).not.toContain(warning); expect(reloadPrevented()).toBe(false);
    render(p); expect(reloadPrevented()).toBe(true);
    render({ ...p, onGetTeachingScriptRecovery: () => null }); expect(reloadPrevented()).toBe(false);
  });
  it('keeps hidden incompatible progress protected while settings are being edited', () => {
    const get = vi.fn(settings => !settings || settings.goal === 'Compare fractions' ? memory : null);
    mount(props({ onGetTeachingScriptRecovery: get })); click('Teaching script+');
    const label = [...host.querySelectorAll('label')].find(node => node.textContent.trim() === 'Learning goal');
    const field = document.getElementById(label.htmlFor);
    act(() => {
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(field, 'A different learning goal');
      field.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(button('Resume script')).toBeUndefined(); expect(get).toHaveBeenCalledWith();
    expect(host.textContent).toContain(warning); expect(reloadPrevented()).toBe(true);
  });
  it('clears the warning after finishing a completed save without requiring AI access', async () => {
    let pending = { ...memory, stage: 'ready', completedChunks: 3 };
    const p = props({ capabilities: { canGenerate: false, canResearch: false }, onGetTeachingScriptRecovery: () => pending,
      onGenerateTeachingScript: vi.fn(async () => { pending = null; return { ok: true }; }) });
    mount(p); click('Teaching script+'); expect(button('Finish saving').disabled).toBe(false);
    await act(async () => host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(p.onGenerateTeachingScript).toHaveBeenCalledTimes(1); expect(host.textContent).not.toContain(warning); expect(reloadPrevented()).toBe(false);
  });
  it('protects prepared generation even before the first section is complete', () => {
    mount(props({ onGetTeachingScriptRecovery: () => ({ ...memory, stage: 'generating', completedChunks: 0 }) }));
    expect(host.textContent).toContain(warning); expect(reloadPrevented()).toBe(true);
  });
  it.each([{ completedChunks: -1 }, { totalChunks: 0 }, { stage: 'unknown' }])('ignores malformed recovery status %j', invalid => {
    mount(props({ onGetTeachingScriptRecovery: () => ({ ...memory, ...invalid }) }));
    expect(host.textContent).not.toContain(warning); expect(reloadPrevented()).toBe(false);
  });
  it('removes the reload listener when leaving teacher mode or unmounting', () => {
    const p = props(); mount(p); expect(reloadPrevented()).toBe(true);
    render({ ...p, isTeacherMode: false }); expect(reloadPrevented()).toBe(false);
    render(p); expect(reloadPrevented()).toBe(true);
    act(() => root.unmount()); root = null; expect(reloadPrevented()).toBe(false);
  });
});
