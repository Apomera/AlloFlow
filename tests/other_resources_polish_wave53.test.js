import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import axe from 'axe-core';

const require = createRequire(import.meta.url);
const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
const ReactDOMServer = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/server'));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.React = React;
window.AlloIcons = new Proxy({}, {
  get: () => (props) => React.createElement('span', { 'aria-hidden': 'true', ...(props && props.className ? { className: props.className } : {}) }, ''),
});

const roots = [];

function readRepoFile(relPath) {
  return readFileSync(resolve(process.cwd(), relPath), 'utf8');
}

function assertMirrorsMatch(relPath) {
  const src = readRepoFile(relPath);
  for (const prefix of ['desktop/web-app/public/', 'desktop/web-app/build/', 'desktop/app-build/']) {
    expect(readRepoFile(prefix + relPath), prefix + relPath).toBe(src);
  }
  return src;
}

function loadViewModule(relPath, exportName) {
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules[exportName];
  new Function('window', readRepoFile(relPath))(window);
  expect(typeof window.AlloModules[exportName]).toBe('function');
  return window.AlloModules[exportName];
}

async function runAxe(container) {
  const result = await axe.run(container, {
    iframes: false,
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    },
  });
  expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
}

function mountHost(Component, props = {}) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  roots.push({ root, host });
  return {
    host,
    async render(nextProps = props) {
      await React.act(async () => {
        root.render(React.createElement(Component, nextProps));
      });
    },
    async unmount() {
      const idx = roots.findIndex((entry) => entry.root === root);
      if (idx !== -1) roots.splice(idx, 1);
      await React.act(async () => { root.unmount(); });
      host.remove();
    },
  };
}

afterEach(async () => {
  while (roots.length) {
    const { root, host } = roots.pop();
    await React.act(async () => { root.unmount(); });
    host.remove();
  }
  delete window.__alloMuted;
  delete window.AlloSpeechPlayer;
  delete window.AlloLanguageContext;
  document.body.innerHTML = '';
  document.body.style.overflow = '';
  document.documentElement.style.overflow = '';
  document.body.classList.remove('alloflow-launchpad-active');
  vi.restoreAllMocks();
});

describe('Other resources polish wave 53 (Timeline, FAQ, Launch Pad, DBQ)', () => {
  it('polishes view_timeline_module.js across mirrors (0 SSR useLayoutEffect warnings, 44px controls, slider aria-valuetext, IME-safe revise/refine shortcuts, SR announcements, non-empty fallbacks, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('view_timeline_module.js');
    expect(src).toContain('data-timeline-view');
    expect(src).toContain('touch-action:manipulation;box-sizing:border-box');
    expect(src).toContain('.theme-contrast [data-timeline-view="true"] :focus-visible');
    expect(src).toContain('@media(prefers-reduced-motion:reduce)');
    expect(src).not.toContain('useLayoutEffect');
    expect(src).not.toContain('text-amber-600');

    const TimelineView = loadViewModule('view_timeline_module.js', 'TimelineView');
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const sampleContent = {
      id: 'tl-53',
      type: 'timeline',
      data: {
        mode: 'chronological',
        autoDetected: true,
        progressionLabel: 'Chronological',
        validationIssues: [{ message: 'Check step 2 date order.' }],
        items: [
          { id: 'a', date: '1775', event: 'Lexington and Concord', image: 'data:image/png;base64,iVBORw0KGgo=', verification: { factual: true, position: true, rationale: 'Matches chronology.' } },
          { id: 'b', date: '1776', event: 'Declaration of Independence', verification: { factual: false, position: true, concern: 'Verify date.' } },
        ],
      },
    };

    // 1. SSR render must emit ZERO React useLayoutEffect warnings
    const ssrHtml = ReactDOMServer.renderToStaticMarkup(React.createElement(TimelineView, {
      t: () => '',
      generatedContent: sampleContent,
      isTeacherMode: true,
      isEditingTimeline: true,
    }));
    expect(ssrHtml).toContain('data-timeline-view="true"');
    expect(errSpy).not.toHaveBeenCalled();

    // 2. Student Launch View with t: () => '' has non-empty heading & start button + 0 axe violations
    const studentMount = mountHost(() => React.createElement(TimelineView, {
      t: () => '',
      generatedContent: sampleContent,
      isTeacherMode: false,
      isIndependentMode: false,
      handleSetIsTimelineGameToTrue: vi.fn(),
    }));
    await studentMount.render();
    expect(studentMount.host.querySelector('h3').textContent.trim()).toBe('Ready to Order the Timeline?');
    expect(studentMount.host.textContent).toContain('Start Timeline Activity');
    await runAxe(studentMount.host);
    await studentMount.unmount();

    // 3. Teacher Read-Only View: 44px controls, slider aria-valuetext, IME-safe revision input, SR announcements
    const announcements = [];
    const reviseSpy = vi.fn();
    function TeacherReadHost() {
      const [rev, setRev] = React.useState('Add 1781 Yorktown');
      return React.createElement(TimelineView, {
        t: () => '',
        generatedContent: sampleContent,
        isTeacherMode: true,
        isEditingTimeline: false,
        timelineImageSize: 112,
        timelineRevisionInput: rev,
        setTimelineRevisionInput: setRev,
        handleTimelineRevision: reviseSpy,
        handleAutoFixTimeline: vi.fn(),
        handleVerifyTimelineAccuracy: vi.fn(),
        handleLockTimelineMode: vi.fn(),
        setDismissedVerifications: vi.fn(),
        TIMELINE_MODE_DEFINITIONS: { chronological: { label: 'Chronological' } },
        announceToSR: (m) => announcements.push(m),
      });
    }
    const readMount = mountHost(TeacherReadHost);
    await readMount.render();

    const range = readMount.host.querySelector('input[type="range"]');
    expect(range.getAttribute('aria-valuetext')).toBe('112 pixels');
    expect(range.className).toContain('min-h-11');

    // Study self-test mode button is 44px and announces politely
    const hideLabelsBtn = readMount.host.querySelector('button[data-timeline-mask-mode="labels"]');
    expect(hideLabelsBtn.className).toContain('min-h-11');
    await React.act(async () => { hideLabelsBtn.click(); });
    expect(announcements.some((m) => /Hide labels/i.test(m))).toBe(true);

    // IME composition Enter must NOT trigger revision; normal Enter DOES; Escape clears
    const revInput = readMount.host.querySelector('input[type="text"]');
    expect(revInput.className).toContain('min-h-11');
    await React.act(async () => {
      revInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, keyCode: 229, bubbles: true }));
    });
    expect(reviseSpy).not.toHaveBeenCalled();
    await React.act(async () => {
      revInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    expect(reviseSpy).toHaveBeenCalledTimes(1);
    await React.act(async () => {
      revInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(revInput.value).toBe('');
    await runAxe(readMount.host);
    await readMount.unmount();

    // 4. Teacher Edit Mode: 44px row actions & 0 axe violations
    const editMount = mountHost(() => React.createElement(TimelineView, {
      t: () => '',
      generatedContent: sampleContent,
      isTeacherMode: true,
      isEditingTimeline: true,
      timelineRefinementInputs: { 0: 'brighter colors' },
      setTimelineRefinementInputs: vi.fn(),
      handleTimelineMove: vi.fn(),
      handleTimelineChange: vi.fn(),
      handleDeleteTimelineStep: vi.fn(),
      handleAddTimelineStep: vi.fn(),
      handleGenerateTimelineItemImage: vi.fn(),
    }));
    await editMount.render();
    expect(editMount.host.querySelector('[data-timeline-upload-image="0"]').className).toContain('min-h-11');
    expect(editMount.host.querySelector('[data-timeline-remove-image="0"]').className).toContain('min-h-11');
    await runAxe(editMount.host);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes view_faq_module.js across mirrors (expanded scoped CSS, 44px speed slider, IME-safe search Escape, polite SR announcements, non-empty fallbacks, 0 React warnings & 0 axe violations)', async () => {
    const src = assertMirrorsMatch('view_faq_module.js');
    expect(src).toContain('touch-action: manipulation; box-sizing: border-box;');
    expect(src).toContain('.theme-contrast [data-faq-view] :focus-visible');
    expect(src).toContain('@media (forced-colors: active)');
    expect(src).toContain('@media (prefers-reduced-motion: reduce)');

    const FaqView = loadViewModule('view_faq_module.js', 'FaqView');
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const announcements = [];

    const faqContent = {
      id: 'faq-53',
      type: 'faq',
      data: [
        { question: 'What is osmosis?', answer: 'Water moves across a semipermeable membrane.' },
        { question: 'What is diffusion?', answer: 'Particles spread from high to low concentration.' },
        { question: 'What is active transport?', answer: 'Cells use energy to move solutes against a gradient.' },
      ],
    };

    const readMount = mountHost(() => React.createElement(FaqView, {
      t: () => '',
      generatedContent: faqContent,
      isTeacherMode: true,
      isEditingFaq: false,
      isPlaying: true,
      playingContentId: 'faq-active',
      voiceSpeed: 1.2,
      setVoiceSpeed: vi.fn(),
      setIsPlaying: vi.fn(),
      setPlayingContentId: vi.fn(),
      handleToggleIsEditingFaq: vi.fn(),
      announceToSR: (m) => announcements.push(m),
    }));
    await readMount.render();

    // 44px speed slider + non-empty aria-label
    const speedSlider = readMount.host.querySelector('input[type="range"]');
    expect(speedSlider.className).toContain('min-h-11');
    expect(speedSlider.getAttribute('aria-label')).toBe('Speed');

    // Non-empty Edit FAQ toggle when t: () => ''
    const editBtn = readMount.host.querySelector('button[data-help-key="faq_edit_toggle"]');
    expect(editBtn.textContent.trim()).toBe('Edit FAQ');

    // Show all triggers polite SR announcement
    const toggleAllBtn = readMount.host.querySelector('button[data-faq-toggle-all]');
    await React.act(async () => { toggleAllBtn.click(); });
    expect(announcements.some((m) => /All answers shown/i.test(m))).toBe(true);

    // Search input: darkened placeholder + IME-safe Escape clears query
    const searchInput = readMount.host.querySelector('input[data-faq-search]');
    expect(searchInput.className).toContain('placeholder:text-slate-600');
    await React.act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(searchInput, 'osmosis');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(searchInput.value).toBe('osmosis');
    await React.act(async () => {
      searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', isComposing: true, keyCode: 229, bubbles: true }));
    });
    expect(searchInput.value).toBe('osmosis');
    await React.act(async () => {
      searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(searchInput.value).toBe('');

    await runAxe(readMount.host);
    await readMount.unmount();

    // Teacher edit mode: focus-visible outlines + Add/Remove SR announcements + 0 axe violations
    const listChange = vi.fn();
    listChange.supportsList = true;
    const editMount = mountHost(() => React.createElement(FaqView, {
      t: () => '',
      generatedContent: faqContent,
      isTeacherMode: true,
      isEditingFaq: true,
      handleFaqChange: listChange,
      handleToggleIsEditingFaq: vi.fn(),
      announceToSR: (m) => announcements.push(m),
    }));
    await editMount.render();
    const editTextarea = editMount.host.querySelector('textarea');
    expect(editTextarea.className).toContain('focus-visible:outline-2');
    await React.act(async () => { editMount.host.querySelector('button[data-faq-add]').click(); });
    expect(announcements.some((m) => /Added new question/i.test(m))).toBe(true);
    await runAxe(editMount.host);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes view_launch_pad_module.js across mirrors (AA+ #cbd5e1 contrast, touch-action, .theme-contrast, forced-colors focus/borders, IME-safe Escape in student panel & language menu, 0 React warnings & 0 axe violations)', async () => {
    const src = assertMirrorsMatch('view_launch_pad_module.js');
    expect(src).toContain('.lp-root button, .lp-root input, .lp-root summary { touch-action: manipulation; }');
    expect(src).toContain('.theme-contrast .lp-root :focus-visible');
    expect(src).toContain('.lp-root :focus-visible { outline: 3px solid Highlight !important; outline-offset: 3px !important; }');
    expect(src).toContain('event.nativeEvent.keyCode === 229');

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });
    window.AlloLanguageContext = React.createContext({ currentUiLanguage: 'English', setUiLanguage: vi.fn(), isTranslating: false });
    const LaunchPadView = loadViewModule('view_launch_pad_module.js', 'LaunchPadView');
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const lpMount = mountHost(() => React.createElement(LaunchPadView, {
      t: () => '',
      uiLanguage: 'English',
      setUiLanguage: vi.fn(),
      onChooseRole: vi.fn(),
      setHasSelectedMode: vi.fn(),
      setGuidedMode: vi.fn(),
      setShowLearningHub: vi.fn(),
      setShowEducatorHub: vi.fn(),
      setIsTeacherMode: vi.fn(),
      setShowWizard: vi.fn(),
      setHasSelectedRole: vi.fn(),
      setPendingRole: vi.fn(),
      setIsGateOpen: vi.fn(),
    }));
    await lpMount.render();

    // Open student door & test IME-safe Escape
    const studentDoor = lpMount.host.querySelector('button[data-pathway="student"]');
    expect(studentDoor).toBeTruthy();
    await React.act(async () => { studentDoor.click(); });
    const studentPanel = lpMount.host.querySelector('#launch-pad-student-panel');
    expect(studentPanel).toBeTruthy();

    await React.act(async () => {
      studentPanel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', isComposing: true, keyCode: 229, bubbles: true }));
    });
    expect(lpMount.host.querySelector('#launch-pad-student-panel')).toBeTruthy();

    await React.act(async () => {
      studentPanel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(lpMount.host.querySelector('#launch-pad-student-panel')).toBeNull();

    // Open language menu & test Escape closes it cleanly
    const langTrigger = lpMount.host.querySelector('button.lp-lang-trigger');
    await React.act(async () => { langTrigger.click(); });
    expect(lpMount.host.querySelector('#launch-pad-language-list')).toBeTruthy();
    await React.act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(lpMount.host.querySelector('#launch-pad-language-list')).toBeNull();

    await runAxe(lpMount.host);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('polishes view_dbq_module.js across mirrors (scoped CSS, AA contrast, IME-safe tablist navigation, progressbar aria-valuetext, 44px print banner buttons, non-empty fallbacks across tabs & timer, 0 React warnings & 0 axe violations)', async () => {
    const src = assertMirrorsMatch('view_dbq_module.js');
    expect(src).toContain('data-dbq-view');
    expect(src).toContain('.theme-contrast [data-dbq-view="true"] :focus-visible');
    expect(src).toContain('@media(forced-colors:active)');
    expect(src).toContain('min-height:44px;min-width:44px;');
    expect(src).not.toContain('text-amber-600');
    expect(src).not.toContain('text-orange-600');

    const DbqView = loadViewModule('view_dbq_module.js', 'DbqView');
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const dbqContent = {
      id: 'dbq-53',
      type: 'dbq',
      data: {
        title: 'Industrial Revolution Perspectives',
        historicalContext: 'Factories reshaped urban life in the 1800s.',
        synthesisPrompt: 'Evaluate how industrialization affected workers.',
        documents: [
          { id: 'A', title: 'Mill Worker Diary', documentType: 'visual', source: 'Archive', excerpt: 'We worked twelve hours a day.', sourcingQuestions: ['Who wrote this?'], analysisQuestions: ['What condition is described?'] },
          { id: 'B', title: 'Factory Owner Ledger', documentType: 'primary', source: 'Ledger', excerpt: 'Output doubled this season.' },
        ],
        perspectives: [
          { label: 'Labor Reformers', description: 'Focus on worker safety.', docIds: ['A'] },
          { label: 'Industrialists', description: 'Focus on growth.', docIds: ['B'] },
        ],
        corroborationClaims: [
          { claim: 'Conditions were harsh.', supportingDocs: ['A'], challengingDocs: ['B'] },
        ],
        rubric: [
          { criteria: 'Thesis', 1: 'Missing', 2: 'Basic', 3: 'Clear', 4: 'Nuanced' },
        ],
      },
    };

    function DbqHost() {
      const [responses, setResponses] = React.useState({
        'dbq-53': {
          _dbqTimerEnd: Date.now() - 5000,
          _selfScores: { Thesis: '3' },
        },
      });
      return React.createElement(DbqView, {
        generatedContent: dbqContent,
        studentResponses: responses,
        handleStudentInput: (resId, key, val) => setResponses((prev) => ({ ...prev, [resId]: { ...(prev[resId] || {}), [key]: val } })),
        callGemini: null,
        cleanJson: (s) => s,
        addToast: vi.fn(),
        handleScoreUpdate: vi.fn(),
        gradeLevel: '9',
        t: () => '',
        isTeacherMode: false,
      });
    }

    const dbqMount = mountHost(DbqHost);
    await dbqMount.render();

    // Non-empty tablist label + expired timer Dismiss fallback + descriptive progressbar aria-valuetext
    const tablist = dbqMount.host.querySelector('[role="tablist"]');
    expect(tablist.getAttribute('aria-label')).toBe('DBQ sections');
    expect(dbqMount.host.textContent).toContain('Dismiss');

    const progressbars = Array.from(dbqMount.host.querySelectorAll('[role="progressbar"]'));
    expect(progressbars.length).toBeGreaterThanOrEqual(2);
    for (const bar of progressbars) {
      expect(bar.getAttribute('aria-valuetext')).toBeTruthy();
    }

    // IME composition ArrowRight must NOT switch tabs; real ArrowRight DOES
    const tabs = Array.from(dbqMount.host.querySelectorAll('[role="tab"]'));
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    await React.act(async () => {
      tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', isComposing: true, keyCode: 229, bubbles: true }));
    });
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    await React.act(async () => {
      tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    await runAxe(dbqMount.host);

    // Cycle to Essay and Rubric tabs and verify 0 axe violations on each
    await React.act(async () => { tabs[2].click(); });
    await runAxe(dbqMount.host);
    await React.act(async () => { tabs[3].click(); });
    expect(dbqMount.host.textContent).toContain('Your Self-Assessment');
    await runAxe(dbqMount.host);
    expect(errSpy).not.toHaveBeenCalled();
  });
});
