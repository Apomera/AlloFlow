// Student tools' Read / Define / Explain work like the reader's own toolbar.
//
// WHY (2026-09-24): the floating Student tools panel repeats the reader's
// reading modes so they can be reached from anywhere in a long passage. The
// reader keeps Both (original and adapted side by side) open for these tools and
// shows them pressed there; the floating copies closed Both and showed nothing
// pressed in it.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, FabStack, container, root;
const noop = () => {};

function props(extra = {}) {
  return { activeView: 'simplified', addToast: noop, focusMode: false, generatedContent: { id: 'a', type: 'simplified', data: 'Text.' }, handleSetIsSyntaxGameToTrue: noop, handleSetShowStudyTimerModalToTrue: noop, handleToggleFocusMode: noop, handleToggleIsFabExpanded: noop, handleToggleReadingRuler: noop, handleToggleShowSocraticChat: noop, handleToggleVisualSupports: noop, interactionMode: 'read', isCompareMode: true, isDictationMode: false, dictationStatus: null, isFabExpanded: true, isFluencyMode: false, isLineFocusMode: false, isStudyTimerRunning: false, isTeacherMode: false, readingRuler: false, runTour: false, setFocusedParagraphIndex: noop, setInteractionMode: vi.fn(), setIsCompareMode: vi.fn(), setIsDictationMode: noop, setIsFluencyMode: vi.fn(), setIsLineFocusMode: noop, setRevisionData: noop, setSelectionMenu: noop, showSocraticChat: false, showVisualSupports: false, stopPlayback: noop, studentProjectSettings: { allowSocraticTutor: false, allowDictation: false }, studentAiFeaturesHidden: false, t: key => key, ...extra };
}
async function mount(p) {
  container = document.createElement('div'); document.body.appendChild(container);
  root = ReactDOMClient.createRoot(container);
  await act(async () => root.render(React.createElement(FabStack, p)));
}
const tool = key => container.querySelector(`[data-help-key="${key}"]`);

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule(process.env.ALLO_FAB_CANDIDATE || 'view_fab_stack_module.js');
  FabStack = window.AlloModules.FabStack.FabStack;
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

describe('reading tools in Student tools, while Both is open', () => {
  it.each(['tool_read_mode', 'tool_define_mode', 'tool_explain_mode'])('%s keeps Both open', async key => {
    const p = props();
    await mount(p);
    await act(async () => tool(key).click());
    expect(p.setInteractionMode).toHaveBeenCalled();
    expect(p.setIsCompareMode).not.toHaveBeenCalled();
  });
  it('shows the active tool pressed', async () => {
    await mount(props({ interactionMode: 'define' }));
    expect(tool('tool_define_mode').getAttribute('aria-pressed')).toBe('true');
    expect(tool('tool_read_mode').getAttribute('aria-pressed')).toBe('false');
  });
});
