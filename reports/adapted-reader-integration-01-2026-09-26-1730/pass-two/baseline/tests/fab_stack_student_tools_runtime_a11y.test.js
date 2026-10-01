import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React;
let ReactDOMClient;
let act;
let FabStack;
let container;
let root;

const noop = () => {};

function propsFor(isFabExpanded, handleToggleIsFabExpanded) {
  return {
    activeView: 'dashboard',
    addToast: noop,
    focusMode: false,
    generatedContent: null,
    handleSetIsSyntaxGameToTrue: noop,
    handleSetShowStudyTimerModalToTrue: noop,
    handleToggleFocusMode: noop,
    handleToggleIsFabExpanded,
    handleToggleReadingRuler: noop,
    handleToggleShowSocraticChat: noop,
    handleToggleVisualSupports: noop,
    interactionMode: 'read',
    isCompareMode: false,
    isDictationMode: false,
    dictationStatus: null,
    isFabExpanded,
    isFluencyMode: false,
    isLineFocusMode: false,
    isStudyTimerRunning: false,
    isTeacherMode: false,
    readingRuler: false,
    runTour: false,
    setFocusedParagraphIndex: noop,
    setInteractionMode: noop,
    setIsCompareMode: noop,
    setIsDictationMode: noop,
    setIsFluencyMode: noop,
    setIsLineFocusMode: noop,
    setRevisionData: noop,
    setSelectionMenu: noop,
    showSocraticChat: false,
    showVisualSupports: false,
    stopPlayback: noop,
    studentProjectSettings: { allowSocraticTutor: false, allowDictation: false },
    studentAiFeaturesHidden: false,
    t: (key) => key,
  };
}

function Harness() {
  const [expanded, setExpanded] = React.useState(false);
  return React.createElement(FabStack, propsFor(expanded, () => setExpanded((value) => !value)));
}

async function click(element) {
  await act(async () => {
    element.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  });
}

async function flushFocusTimer() {
  await act(async () => {
    await new Promise((resolveTimer) => window.setTimeout(resolveTimer, 0));
  });
}

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('view_fab_stack_module.js');
  FabStack = window.AlloModules.FabStack.FabStack;
});

beforeEach(async () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = ReactDOMClient.createRoot(container);
  await act(async () => root.render(React.createElement(Harness)));
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe('Student Tools popover keyboard behavior', () => {
  it('conditionally mounts a non-modal dialog and focuses the first available tool', async () => {
    const launcher = container.querySelector('[data-help-key="fab_toggle"]');
    expect(launcher.getAttribute('aria-expanded')).toBe('false');
    expect(launcher.getAttribute('aria-controls')).toBe('alloflow-student-tools-panel');
    expect(container.querySelector('[role="dialog"]')).toBeNull();

    await click(launcher);
    await flushFocusTimer();

    const dialog = container.querySelector('[role="dialog"]');
    const firstTool = container.querySelector('[data-help-key="fab_ruler"]');
    expect(dialog).toBeTruthy();
    expect(dialog.hasAttribute('aria-modal')).toBe(false);
    expect(launcher.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(firstTool);
  });

  it('returns focus to the launcher after Escape and the explicit close button', async () => {
    const launcher = container.querySelector('[data-help-key="fab_toggle"]');

    await click(launcher);
    await flushFocusTimer();
    const firstTool = container.querySelector('[data-help-key="fab_ruler"]');
    await act(async () => {
      firstTool.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    await flushFocusTimer();
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(launcher);

    await click(launcher);
    await flushFocusTimer();
    const closeButton = container.querySelector('.alloflow-student-tools-close');
    await click(closeButton);
    await flushFocusTimer();
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(launcher);
  });
});
