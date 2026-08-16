// Adventure mode is scoped to the current lesson (fleet 2026-08-16, C4).
//
// The device keeps exactly ONE adventure save at storage key
// 'allo_adventure_save'. Before this change, hasSavedAdventure was set true
// whenever that record existed with turnCount > 0, so a student opening a new
// lesson was offered "Resume Adventure" pointing at a previous lesson's story.
// The save now carries a lessonKey and the offer is filtered against the
// current lesson. Separately the whole Adventure section is dropped when the
// lesson does not carry one.

import { beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
const ReactDOMServer = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/server'));

let anti;
let handlers;
let lessonKey;
let Panel;

beforeAll(() => {
  anti = readFileSync('AlloFlowANTI.txt', 'utf8');
  handlers = readFileSync('adventure_handlers_source.jsx', 'utf8');

  const start = anti.indexOf('const _alloAdventureLessonKey = (history, inputText) => {');
  if (start < 0) throw new Error('_alloAdventureLessonKey not found');
  const end = anti.indexOf('window._alloAdventureLessonKey = _alloAdventureLessonKey;', start);
  if (end < 0) throw new Error('_alloAdventureLessonKey export not found');
  lessonKey = new Function(anti.slice(start, end) + '; return _alloAdventureLessonKey;')();

  global.window = global.window || {};
  window.React = React;
  // Same registry the host publishes at AlloFlowANTI.txt:11098. Supplying it is
  // what lets this panel render standalone: several icon names (History, Save)
  // collide with DOM globals, and jsdom's window.History is a class constructor
  // that React would call as a function component.
  const stubIcon = (name) => function Icon() { return React.createElement('span', { 'data-icon': name }); };
  window.AlloIcons = ['Save', 'FolderOpen', 'Download', 'Send', 'MapIcon', 'CheckCircle2',
    'Lock', 'RefreshCw', 'History', 'Sparkles', 'Wifi']
    .reduce((acc, name) => { acc[name] = stubIcon(name); return acc; }, {});
  loadAlloModule('view_student_save_adventure_module.js');
  Panel = window.AlloModules.StudentSaveAdventurePanel.StudentSaveAdventurePanel;
});

const t = (key) => key;

const baseProps = {
  activeSessionCode: null,
  globalPoints: 500,
  handleResumeAdventure: () => {},
  handleSetShowSubmitModalToTrue: () => {},
  handleStartAdventure: () => {},
  hasSavedAdventure: false,
  initiateSaveStudentProject: () => {},
  isResumingAdventure: false,
  isSaveActionPulsing: false,
  projectFileInputRef: { current: null },
  sessionData: null,
  studentProjectSettings: { adventureUnlockXP: 0, adventureEnabled: true },
  t,
};

const render = (props) => ReactDOMServer.renderToStaticMarkup(
  React.createElement(Panel, { ...baseProps, ...props })
);

describe('lesson key', () => {
  it('prefers the analysis record id, which survives small edits to the text', () => {
    const history = [
      { id: 'a1', type: 'analysis' },
      { id: 'g1', type: 'glossary' },
      { id: 'a2', type: 'analysis' },
    ];
    expect(lessonKey(history, 'anything at all')).toBe('analysis:a2');
    expect(lessonKey(history, 'different text entirely')).toBe('analysis:a2');
  });

  it('falls back to a hash of the source text when no analysis has been run', () => {
    const a = lessonKey([], 'The water cycle moves water around the Earth.');
    const b = lessonKey([], 'Photosynthesis turns sunlight into sugar.');
    expect(a).toMatch(/^text:/);
    expect(a).not.toBe(b);
  });

  it('ignores surrounding whitespace so a stray newline is not a new lesson', () => {
    expect(lessonKey([], '  same text  ')).toBe(lessonKey([], 'same text'));
  });

  it('is empty when there is no lesson at all', () => {
    expect(lessonKey([], '')).toBe('');
    expect(lessonKey(null, null)).toBe('');
  });

  it('distinguishes two lessons that differ only in one word', () => {
    expect(lessonKey([], 'the cat sat on the mat')).not.toBe(lessonKey([], 'the cat sat on the hat'));
  });
});

describe('the host only offers a save that belongs to this lesson', () => {
  it('computes hasSavedAdventureForLesson from the saved key and the current key', () => {
    expect(anti).toContain('const hasSavedAdventureForLesson = hasSavedAdventure');
    expect(anti).toContain("&& (!savedAdventureLessonKey || !adventureLessonKey || savedAdventureLessonKey === adventureLessonKey);");
  });

  it('stamps the lesson key into every autosave', () => {
    expect(anti).toContain('lessonKey: adventureLessonKeyRef.current');
  });

  it('passes the lesson-scoped flag to all three adventure surfaces', () => {
    // student panel, sidebar AdventurePanel, full AdventureView
    const passes = anti.match(/hasSavedAdventure[:=]\s*\{?hasSavedAdventureForLesson/g) || [];
    expect(passes.length).toBe(3);
    // and nothing still forwards the raw flag
    expect(anti).not.toContain('hasSavedAdventure={hasSavedAdventure}');
  });

  it('refuses a cross-lesson save in the resume handler as well as in the UI', () => {
    expect(handlers).toContain('const savedLessonKey = String(savedConfig.lessonKey || \'\');');
    expect(handlers).toContain("if (savedLessonKey && currentLessonKey && savedLessonKey !== currentLessonKey) {");
    expect(handlers).toContain("addToast(t('toasts.adventure_other_lesson'), \"error\");");
  });

  it('still allows a save written before the stamp existed', () => {
    // Both guards require savedLessonKey to be truthy before refusing.
    expect(handlers).toContain('if (savedLessonKey && currentLessonKey');
    expect(anti).toContain('!savedAdventureLessonKey ||');
  });
});

describe('the Adventure section only appears when the lesson carries one', () => {
  it('is hidden when the host says the lesson has no adventure', () => {
    const html = render({ isAdventureAvailable: false });
    expect(html).not.toContain('student-adventure-panel-title');
    // the save banner is untouched
    expect(html).toContain('student-save-panel-title');
  });

  it('is shown when the lesson has one', () => {
    const html = render({ isAdventureAvailable: true });
    expect(html).toContain('student-adventure-panel-title');
  });

  it('shows for an older host that does not send the prop', () => {
    const html = render({});
    expect(html).toContain('student-adventure-panel-title');
  });

  it('offers Resume only when there is a save for this lesson', () => {
    expect(render({ isAdventureAvailable: true, hasSavedAdventure: true })).toContain('adventure.resume');
    expect(render({ isAdventureAvailable: true, hasSavedAdventure: false })).not.toContain('adventure.resume');
  });

  it('reads icons from AlloIcons first, so DOM globals like window.History cannot leak in', () => {
    const view = readFileSync('view_student_save_adventure_source.jsx', 'utf8');
    expect(view).toContain("const icon = (name) => (window.AlloIcons && window.AlloIcons[name]) || window[name] || noop;");
    expect(view).not.toContain('const History = window.History || noop;');
  });

  it('keeps the built and deployed panel modules synchronized', () => {
    // This builder does not write the public copy, unlike most of the others.
    expect(readFileSync('desktop/web-app/public/view_student_save_adventure_module.js', 'utf8'))
      .toBe(readFileSync('view_student_save_adventure_module.js', 'utf8'));
  });

  it('gives the teacher a switch, defaulting to on for existing projects', () => {
    expect(anti).toContain('adventureEnabled: true,');
    expect(anti).toContain('adventureEnabled: source.adventureEnabled !== false,');
    expect(anti).toContain("studentProjectSettings.adventureEnabled !== false");
    const settings = readFileSync('view_project_settings_source.jsx', 'utf8');
    expect(settings).toContain("renderFeatureToggle('proj-adventure-enabled', 'adventureEnabled'");
  });
});
