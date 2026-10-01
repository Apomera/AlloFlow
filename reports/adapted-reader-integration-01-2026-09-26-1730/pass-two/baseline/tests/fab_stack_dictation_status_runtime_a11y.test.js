import { beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React;
let ReactDOMServer;
let FabStack;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMServer = require(resolve(modulesDir, 'react-dom/server'));
  globalThis.React = window.React = React;
  loadAlloModule('view_fab_stack_module.js');
  FabStack = window.AlloModules.FabStack.FabStack;
});

function renderWithStatus(dictationStatus) {
  const noop = () => {};
  const props = {
    activeView: 'dashboard',
    addToast: noop,
    focusMode: false,
    generatedContent: null,
    handleSetIsSyntaxGameToTrue: noop,
    handleSetShowStudyTimerModalToTrue: noop,
    handleToggleFocusMode: noop,
    handleToggleIsFabExpanded: noop,
    handleToggleReadingRuler: noop,
    handleToggleShowSocraticChat: noop,
    handleToggleVisualSupports: noop,
    interactionMode: 'read',
    isCompareMode: false,
    isDictationMode: false,
    dictationStatus,
    isFabExpanded: true,
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
    studentProjectSettings: { allowSocraticTutor: false, allowDictation: true },
    studentAiFeaturesHidden: false,
    t: (key) => key,
  };
  return ReactDOMServer.renderToStaticMarkup(React.createElement(FabStack, props));
}

describe('FabStack dictation status announcements', () => {
  it('keeps an idle completion message in an atomic polite live region', () => {
    const html = renderWithStatus({
      state: 'idle',
      engine: 'browser-whisper',
      engineLabel: 'Browser Whisper',
      privacy: 'Audio stays in this browser.',
      message: 'Dictation added.',
    });

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-atomic="true"');
    expect(html).toContain('Dictation added.');
    expect(html).toContain('Audio stays in this browser.');
  });

  it('announces microphone errors assertively', () => {
    const html = renderWithStatus({
      state: 'error',
      engine: 'web-speech',
      engineLabel: 'Browser speech service',
      privacy: '',
      message: 'Microphone permission was not granted.',
    });

    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-live="assertive"');
    expect(html).toContain('aria-atomic="true"');
    expect(html).toContain('Microphone permission was not granted.');
  });

  it('does not render an empty idle announcement', () => {
    const html = renderWithStatus({
      state: 'idle',
      engine: null,
      engineLabel: '',
      privacy: '',
      message: '',
    });

    expect(html).not.toContain('role="status"');
  });
});
