// Tool labels by role (2026-09-28). Teachers see the floating supports as
// "Reading tools" (they preview what students get on their own screen), students
// keep "Student tools". The Educator tools header button carries a visible label
// wherever it shows, instead of an unlabeled graduation-cap icon.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const noop = () => {};
let React, ReactDOMClient, act, FabStack, container, root;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('view_fab_stack_module.js');
  FabStack = window.AlloModules.FabStack.FabStack;
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

async function mount(extra) {
  const props = { activeView: 'input', addToast: noop, focusMode: false, generatedContent: null, handleSetIsSyntaxGameToTrue: noop,
    handleSetShowStudyTimerModalToTrue: noop, handleToggleFocusMode: noop, handleToggleIsFabExpanded: noop, handleToggleReadingRuler: noop,
    handleToggleShowSocraticChat: noop, handleToggleVisualSupports: noop, interactionMode: 'read', isCompareMode: false, isDictationMode: false,
    dictationStatus: null, isFabExpanded: true, isFluencyMode: false, isLineFocusMode: false, isStudyTimerRunning: false, readingRuler: false,
    runTour: false, setFocusedParagraphIndex: noop, setInteractionMode: noop, setIsCompareMode: noop, setIsDictationMode: noop, setIsFluencyMode: noop,
    setIsLineFocusMode: noop, setRevisionData: noop, setSelectionMenu: noop, showSocraticChat: false, showVisualSupports: false, stopPlayback: noop,
    studentProjectSettings: { allowSocraticTutor: false, allowDictation: false }, studentAiFeaturesHidden: false, t: () => '', ...extra };
  container = document.createElement('div'); document.body.appendChild(container);
  root = ReactDOMClient.createRoot(container);
  await act(async () => root.render(React.createElement(FabStack, props)));
}
const launcher = () => container.querySelector('[data-help-key="fab_toggle"]');
const heading = () => container.querySelector('#alloflow-student-tools-title');

describe('floating tools label by role', () => {
  it('teachers see Reading tools, framed as a preview of student supports', async () => {
    await mount({ isTeacherMode: true });
    expect(launcher().textContent).toContain('Reading tools');
    expect(launcher().textContent).not.toContain('Student tools');
    expect(launcher().getAttribute('aria-label')).toBe('Close reading tools');
    expect(heading().textContent).toBe('Reading tools');
    expect(container.textContent).toContain('Try the supports your students get');
  });

  it('students keep Student tools', async () => {
    await mount({ isTeacherMode: false });
    expect(launcher().textContent).toContain('Student tools');
    expect(heading().textContent).toBe('Student tools');
    expect(container.textContent).toContain('Read, focus, and practice your way');
  });
});

describe('Educator tools header button is labeled', () => {
  const header = fs.readFileSync('view_header_source.jsx', 'utf8');
  const buttons = header.split('data-help-key="header_educator_hub"').slice(1).map(rest => rest.slice(0, 900));

  it('both header layouts show the words, not just an icon', () => {
    expect(buttons).toHaveLength(2);
    for (const b of buttons) {
      expect(b).toContain("{t('header.nav_educator_tools') || 'Educator tools'}</span>");
      expect(b.slice(0, b.indexOf("'Educator tools'"))).not.toMatch(/<span className="hidden [a-z0-9]*:inline/);
    }
  });

  it('keeps the top-bar copy at 1280px and up, where it fits', () => {
    // Measured 2026-09-28: at 1024-1279px the labeled button overflows the bar.
    // Narrower windows reach it, labeled, through More information.
    expect(buttons[0]).toContain('className="hidden xl:inline-flex');
    expect(buttons[1]).not.toMatch(/^[^>]*className="hidden /);
  });
});
