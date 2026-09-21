// Live session group profiles — the per-group row in TeacherLiveQuizControls.
//
// Defect (pre-existing at HEAD, found 2026-09-20 by extending check_free_vars
// past its hand-written file list): inside `activeGroups.map(([gid, group])`
// two reads use a bare `g` instead of `group`:
//
//     checked={g.profile?.useEmojis || false}
//     value={g.profile?.textFormat || 'Standard Text'}
//
// `g` is bound nowhere in that scope — the same block uses `group.` correctly
// seven times on the surrounding lines, including `group.karaokeMode` in the
// very same JSX element. The row renders once a live session has at least one
// group, so a teacher who groups a live class hits `ReferenceError: g is not
// defined` and the controls are replaced by the error boundary.
//
// Why nothing caught it: check_free_vars builds its file list from ten
// hand-listed sources plus a scan of stem_lab/. teacher_source.jsx is not in
// that list, so a bare `g` raised no flag — the same blind spot that shipped
// the Export CSV `s` bug (tests/teacher_dashboard_csv_export.test.js).
//
// This mounts the REAL built module: a grep for `group.profile` would pass
// against a file that still throws one line later.

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { sliceBetween } from './helpers/anchored_slice.js';

const require2 = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require2(resolve(MODULES_DIR, 'react'));
const ReactDOMClient = require2(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require2(resolve(MODULES_DIR, 'react-dom/test-utils'));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const ROOT = process.cwd();
const source = readFileSync(resolve(ROOT, 'teacher_source.jsx'), 'utf8');
const builtModule = readFileSync(resolve(ROOT, 'teacher_module.js'), 'utf8');

let TeacherLiveQuizControls;
const roots = [];

// The component reads groups off sessionData, so this is a live session with
// one group — the ordinary state once a teacher groups a class.
const SESSION = {
  groups: { g1: { name: 'Otters', color: 'indigo', karaokeMode: false, profile: { gradeLevel: '3rd Grade', useEmojis: true, textFormat: 'Bullet Points' } } },
  roster: {},
  quizState: {
    currentQuestionIndex: 0, phase: 'idle', responses: {}, responseReceipts: {},
    mode: 'standard', bossStats: null, teamScores: {}, scoringPolicy: 'standard',
    allResponses: {}, activityId: 'a1', roundId: 'r1',
  },
};

beforeAll(() => {
  window.React = React;
  globalThis.React = React;
  window.AlloModules = window.AlloModules || {};
  // Captured at module scope, so it must exist BEFORE the module body runs.
  window.AlloLanguageContext = React.createContext({ t: (key) => key });
  window.__alloT = (key) => key;
  window.AlloIcons = window.AlloIcons || {};
  // eslint-disable-next-line no-new-func
  new Function(builtModule)();
  TeacherLiveQuizControls = window.AlloModules.TeacherLiveQuizControls;
  if (!TeacherLiveQuizControls) throw new Error('TeacherLiveQuizControls did not register');
});

afterEach(() => {
  while (roots.length) {
    const { root, container } = roots.pop();
    try { act(() => root.unmount()); } catch (_) {}
    container.remove();
  }
});

function mountPanel() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = ReactDOMClient.createRoot(container);
  roots.push({ root, container });
  const noop = () => {};
  // Swallow React's own error logging so a crash shows up as our assertion,
  // not as pages of console noise.
  const realError = console.error;
  console.error = () => {};
  let thrown = null;
  try {
    act(() => {
      root.render(React.createElement(TeacherLiveQuizControls, {
        sessionData: SESSION,
        // A real question: the controls render the current question's media,
        // so an empty list leaves `question` undefined and the mount dies on
        // fixture shape rather than on the defect under test.
        generatedContent: { data: { resources: [], questions: [{ question: 'Q1', options: ['a', 'b'], correctAnswer: 'a', imageUrl: '' }] } },
        activeSessionCode: 'ABCD',
        appId: 'test',
        onGenerateImage: noop, onRefineImage: noop,
        onCreateGroup: noop, onAssignStudent: noop,
        onSetGroupResource: noop, onSetGroupLanguage: noop,
        onSetGroupProfile: noop, onDeleteGroup: noop,
        onUpdateQuestionRoutingRules: noop,
        history: [], callGemini: async () => '', addToast: noop,
      }));
    });
  } catch (error) {
    thrown = error;
  } finally {
    console.error = realError;
  }
  return { container, thrown };
}

describe('the group profile row renders for a teacher with a group', () => {
  it('does not throw ReferenceError on the bound-variable name', () => {
    const { thrown, container } = mountPanel();
    if (thrown) {
      expect.fail(`live session controls crashed on mount: ${thrown.message}`);
    }
    // A crash inside React surfaces as an empty container rather than a throw
    // when a boundary catches it, so assert the row actually rendered too.
    expect(container.innerHTML.length, 'the panel rendered nothing').toBeGreaterThan(0);
  });
});

describe('the source uses the name its own map binds', () => {
  it('has no bare `g.` inside the activeGroups map that binds `group`', () => {
    // Bound the region by REAL anchors, not a guessed character count. The
    // first version of this test used `start + 6000`, and the defect sits
    // 10,607 characters in — so it passed while checking nothing, which is the
    // exact vacuous-pin failure tests/helpers/anchored_slice.js exists to stop.
    const body = sliceBetween(
      source,
      'activeGroups.map(([gid, group])',
      "activeGroups.length === 0",
      { file: 'teacher_source.jsx', label: 'activeGroups map body' },
    );
    // Sanity: the region really is the block that binds `group`.
    expect(body).toContain('group.karaokeMode');
    const offenders = body.split('\n')
      .map((line, i) => ({ line, n: i }))
      .filter(({ line }) => /(^|[^A-Za-z0-9_.$'"`])g\.(profile|name|karaokeMode)/.test(line));
    expect(offenders.map((o) => o.line.trim().slice(0, 90)),
      'inside a map that binds `group`, a bare `g` is an undeclared identifier').toEqual([]);
  });
});
