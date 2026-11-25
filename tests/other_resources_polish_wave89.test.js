import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const modulesDir = path.resolve(ROOT, 'desktop/web-app/node_modules');
const MIRRORS = ['', 'desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build'];

let React;
let ReactDOMClient;
let act;
let axe;
let acorn;

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function assertFourWayParity(relPath) {
  const expected = sha256(path.resolve(ROOT, relPath));
  for (const prefix of MIRRORS) {
    const full = path.resolve(ROOT, prefix, relPath);
    expect(fs.existsSync(full), `missing mirror ${full}`).toBe(true);
    expect(sha256(full), `hash mismatch for ${full}`).toBe(expected);
  }
}

function walkAst(node, fn) {
  if (!node || typeof node !== 'object') return;
  fn(node);
  for (const k of Object.keys(node)) {
    const v = node[k];
    if (Array.isArray(v)) v.forEach((c) => walkAst(c, fn));
    else if (v && typeof v.type === 'string') walkAst(v, fn);
  }
}

function auditModuleAst(relPath) {
  const src = fs.readFileSync(path.resolve(ROOT, relPath), 'utf8');
  const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', allowHashBang: true });
  let reactBtnTotal = 0;
  let reactBtnUntyped = 0;
  let reactBtnDupType = 0;
  let sliderTotal = 0;
  let sliderWithValuetext = 0;

  walkAst(ast, (n) => {
    if (n.type !== 'CallExpression') return;
    const callee = n.callee;
    const name =
      callee.type === 'Identifier'
        ? callee.name
        : callee.type === 'MemberExpression' && callee.property && callee.property.name
          ? callee.property.name
          : '';
    const arg0 = n.arguments && n.arguments[0];
    if ((name === 'createElement' || name === 'ce' || name === 'h') && arg0 && arg0.type === 'Literal' && arg0.value === 'button' && n.arguments.length >= 2) {
      reactBtnTotal++;
      const props = n.arguments[1];
      let typeCount = 0;
      if (props && props.type === 'ObjectExpression') {
        for (const p of props.properties) {
          const pk = p.key && (p.key.name || p.key.value);
          if (pk === 'type') typeCount++;
        }
      }
      if (typeCount === 0) reactBtnUntyped++;
      if (typeCount > 1) reactBtnDupType++;
    }
    if ((name === 'createElement' || name === 'ce' || name === 'h') && arg0 && arg0.type === 'Literal' && arg0.value === 'input' && n.arguments.length >= 2) {
      const props = n.arguments[1];
      if (props && props.type === 'ObjectExpression') {
        let isRange = false;
        let hasVT = false;
        for (const p of props.properties) {
          const pk = p.key && (p.key.name || p.key.value);
          if (pk === 'type' && p.value && p.value.value === 'range') isRange = true;
          if (pk === 'aria-valuetext') hasVT = true;
        }
        if (isRange) {
          sliderTotal++;
          if (hasVT) sliderWithValuetext++;
        }
      }
    }
  });

  return { src, reactBtnTotal, reactBtnUntyped, reactBtnDupType, sliderTotal, sliderWithValuetext };
}

async function runAxe(container) {
  const res = await axe.run(container, {
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    },
  });
  return res.violations;
}

describe('Other Resources Polish — Wave 89 (SubmissionInbox, WordSoundsSetup, PersonaChat, LessonTeachingScript)', () => {
  let root;
  let mountEl;
  let errorSpy;

  beforeAll(() => {
    React = require(path.resolve(modulesDir, 'react'));
    ReactDOMClient = require(path.resolve(modulesDir, 'react-dom/client'));
    act = React.act || require(path.resolve(modulesDir, 'react-dom/test-utils')).act;
    axe = require(path.resolve(modulesDir, 'axe-core'));
    acorn = require(path.resolve(modulesDir, 'acorn'));
    global.React = window.React = React;
    global.IS_REACT_ACT_ENVIRONMENT = true;
    window.AlloLanguageContext = React.createContext({ t: (k) => k });
  });

  afterEach(async () => {
    if (root) {
      await act(async () => root.unmount());
      root = null;
    }
    if (mountEl) {
      mountEl.remove();
      mountEl = null;
    }
    window.__alloFocusTrapStack = [];
    window.__alloScrollLockState = { count: 0, prev: '', overflow: '' };
    document.body.style.overflow = '';
    if (errorSpy) {
      errorSpy.mockRestore();
      errorSpy = null;
    }
    localStorage.clear();
  });

  it('1. view_submission_inbox_module.js: 4-way mirror, 61/61 typed buttons, 1/1 range aria-valuetext, scoped WCAG CSS, and 0 axe violations', async () => {
    assertFourWayParity('view_submission_inbox_module.js');
    const audit = auditModuleAst('view_submission_inbox_module.js');
    expect(audit.reactBtnTotal).toBe(61);
    expect(audit.reactBtnUntyped).toBe(0);
    expect(audit.reactBtnDupType).toBe(0);
    expect(audit.sliderTotal).toBe(1);
    expect(audit.sliderWithValuetext).toBe(1);

    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    loadAlloModule('view_submission_inbox_module.js');
    const SubmissionInbox = window.AlloModules.SubmissionInbox.SubmissionInbox;

    mountEl = document.createElement('div');
    document.body.appendChild(mountEl);
    root = ReactDOMClient.createRoot(mountEl);

    await act(async () => {
      root.render(React.createElement(SubmissionInbox, {
        isOpen: true,
        onClose: vi.fn(),
        rosterKey: { classId: 'class-w89', students: {}, learnerIds: {} },
        t: (_k, fallback) => fallback || _k,
        addToast: vi.fn(),
        onOpenAlloSheet: vi.fn(),
      }));
      await new Promise((r) => setTimeout(r, 10));
    });

    const dialog = mountEl.querySelector('[data-si-dialog="true"][role="dialog"]');
    expect(dialog).not.toBeNull();
    const styleEl = dialog.querySelector('style');
    expect(styleEl).not.toBeNull();
    expect(styleEl.textContent).toContain('touch-action:manipulation');
    expect(styleEl.textContent).toContain(':focus-visible');
    expect(styleEl.textContent).toContain('forced-colors: active');
    expect(styleEl.textContent).toContain('prefers-reduced-motion:reduce');

    expect(errorSpy).not.toHaveBeenCalled();
    expect(await runAxe(dialog)).toEqual([]);
  });

  it('2. word_sounds_setup_module.js: 4-way mirror, 109/109 typed buttons, 1/1 range aria-valuetext, scoped WCAG CSS, modifier Escape guard, and 0 axe violations', async () => {
    assertFourWayParity('word_sounds_setup_module.js');
    const audit = auditModuleAst('word_sounds_setup_module.js');
    expect(audit.reactBtnTotal).toBe(109);
    expect(audit.reactBtnUntyped).toBe(0);
    expect(audit.reactBtnDupType).toBe(0);
    expect(audit.sliderTotal).toBe(1);
    expect(audit.sliderWithValuetext).toBe(1);

    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    document.getElementById('allo-ws-setup-a11y-css')?.remove();
    window.__wordSoundsSetupModuleLoaded = false;
    window.WORD_FAMILY_PRESETS = {};
    window.SIGHT_WORD_PRESETS = {};
    loadAlloModule('word_sounds_setup_module.js');
    const WordSoundsGenerator = window.AlloModules.WordSoundsGenerator;
    expect(WordSoundsGenerator).toBeTruthy();

    const closeSpy = vi.fn();
    mountEl = document.createElement('div');
    document.body.appendChild(mountEl);
    root = ReactDOMClient.createRoot(mountEl);

    await act(async () => {
      root.render(React.createElement(WordSoundsGenerator, {
        glossaryTerms: [],
        preloadedWords: [{ word: 'cat', targetWord: 'cat', phonemes: ['k', 'a', 't'] }],
        isTeacherMode: true,
        isProbeMode: false,
        probeActivity: 'counting',
        selectedVoice: 'af_heart',
        wordSoundsLanguage: 'English',
        gradeLevel: 'K',
        t: (k) => k,
        ttsSpeed: 0.5,
        onStartGame: vi.fn(),
        onClose: closeSpy,
      }));
      await Promise.resolve();
    });

    const dialog = mountEl.querySelector('[data-ws-setup-dialog="true"][role="dialog"]');
    expect(dialog).not.toBeNull();
    const styleEl = document.getElementById('allo-ws-setup-a11y-css');
    expect(styleEl).not.toBeNull();
    expect(styleEl.textContent).toContain('[data-ws-setup-dialog="true"]');
    expect(styleEl.textContent).toContain('touch-action:manipulation');
    expect(styleEl.textContent).toContain(':focus-visible');
    expect(styleEl.textContent).toContain('forced-colors: active');
    expect(styleEl.textContent).toContain('prefers-reduced-motion: reduce');

    // Ctrl+Escape / IME Escape must not close; plain Escape closes
    await act(async () => {
      dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', ctrlKey: true, bubbles: true }));
      dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', altKey: true, bubbles: true }));
      dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 229, bubbles: true }));
    });
    expect(closeSpy).not.toHaveBeenCalled();

    expect(errorSpy).not.toHaveBeenCalled();
    expect(await runAxe(dialog)).toEqual([]);

    await act(async () => {
      dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('3. view_persona_chat_module.js: 4-way mirror, 68/68 typed buttons, scoped WCAG CSS, IME/modifier Escape guard, and 0 axe violations', async () => {
    assertFourWayParity('view_persona_chat_module.js');
    const audit = auditModuleAst('view_persona_chat_module.js');
    expect(audit.reactBtnTotal).toBe(68);
    expect(audit.reactBtnUntyped).toBe(0);
    expect(audit.reactBtnDupType).toBe(0);

    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    document.getElementById('allo-persona-chat-a11y-css')?.remove();
    loadAlloModule('view_persona_chat_module.js');
    const View = window.AlloModules.PersonaChatView;

    window.__alloAiUsable = () => true;
    window.alloDeviceStorage = { ready: async () => {}, get: async () => null, set: async () => {}, remove: async () => {} };
    const srcText = fs.readFileSync(path.resolve(ROOT, 'view_persona_chat_source.jsx'), 'utf8');
    const propNames = [...new Set([...srcText.matchAll(/var \w+ = props\.(\w+)/g)].map((m) => m[1]))];
    const props = {};
    for (const name of propNames) {
      props[name] = /^(handle|set|generate|stop)/.test(name) ? vi.fn() : /Ref$/.test(name) ? React.createRef() : false;
    }
    const people = [
      { name: 'Ada', year: '1843', role: 'Mathematician', context: 'Computing', quests: [] },
      { name: 'Grace', year: '1952', role: 'Computer scientist', context: 'Compilers', quests: [] },
    ];
    Object.assign(props, {
      t: () => undefined,
      appId: 'w89-app',
      studentNickname: 'learner',
      theme: 'light',
      isTeacherMode: false,
      ErrorBoundary: ({ children }) => children,
      CharacterColumn: () => null,
      HarmonyMeter: () => null,
      studentProjectSettings: {},
      generatedContent: { id: 'w89-resource', type: 'persona', data: people },
      personaState: {
        mode: 'single',
        selectedCharacter: people[0],
        selectedCharacters: people,
        chatHistory: [{ role: 'model', text: 'Welcome to the interview.', speakerName: 'Ada' }],
        suggestions: [],
        panelSuggestions: [],
        earnedBadges: [],
        isLoading: false,
      },
      personaInput: '',
      isPersonaFreeResponse: true,
      playbackState: {},
      panelTtsPending: [],
      personaReflectionInput: '',
      formatInteractiveText: (text) => text,
      splitTextToSentences: (text) => [text],
      extractPersonaGroundingDisclosure: () => ({ links: [], queries: [] }),
      isPersonaReflectionOpen: false,
      reflectionFeedback: null,
    });

    mountEl = document.createElement('div');
    document.body.appendChild(mountEl);
    root = ReactDOMClient.createRoot(mountEl);

    await act(async () => {
      root.render(React.createElement(View, props));
      await Promise.resolve();
    });

    const dialog = mountEl.querySelector('[data-persona-chat-dialog="true"][role="dialog"]');
    expect(dialog).not.toBeNull();
    const styleEl = document.getElementById('allo-persona-chat-a11y-css');
    expect(styleEl).not.toBeNull();
    expect(styleEl.textContent).toContain('[data-persona-chat-dialog="true"]');
    expect(styleEl.textContent).toContain('touch-action:manipulation');
    expect(styleEl.textContent).toContain(':focus-visible');
    expect(styleEl.textContent).toContain('forced-colors: active');
    expect(styleEl.textContent).toContain('prefers-reduced-motion: reduce');

    const firstBtn = dialog.querySelector('button');
    expect(firstBtn).not.toBeNull();
    await act(async () => {
      firstBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', ctrlKey: true, bubbles: true, cancelable: true }));
      firstBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', altKey: true, bubbles: true, cancelable: true }));
      firstBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 229, bubbles: true, cancelable: true }));
    });
    expect(props.handleClosePersonaChat).not.toHaveBeenCalled();

    expect(errorSpy).not.toHaveBeenCalled();
    expect(await runAxe(dialog)).toEqual([]);

    await act(async () => {
      firstBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(props.handleClosePersonaChat).toHaveBeenCalledTimes(1);
    delete window.alloDeviceStorage;
    delete window.__alloAiUsable;
  });

  it('4. view_lesson_teaching_script_module.js: 4-way mirror, 44/44 typed buttons, scoped WCAG CSS, and 0 axe violations', async () => {
    assertFourWayParity('view_lesson_teaching_script_module.js');
    const audit = auditModuleAst('view_lesson_teaching_script_module.js');
    expect(audit.reactBtnTotal).toBe(44);
    expect(audit.reactBtnUntyped).toBe(0);
    expect(audit.reactBtnDupType).toBe(0);

    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    document.getElementById('allo-teaching-script-a11y-css')?.remove();
    loadAlloModule('resource_content_fingerprint_module.js');
    loadAlloModule('lesson_teaching_script_module.js');
    loadAlloModule('view_lesson_teaching_script_module.js');
    const View = window.AlloModules.LessonTeachingScriptView;

    mountEl = document.createElement('div');
    document.body.appendChild(mountEl);
    root = ReactDOMClient.createRoot(mountEl);

    await act(async () => {
      root.render(React.createElement(View, {
        generatedContent: {
          id: 'plan-w89',
          type: 'lesson-plan',
          data: { essentialQuestion: 'How do fractions compare?', objectives: ['Compare fractions'], teachingScripts: [] },
        },
        history: [],
        isTeacherMode: true,
        isParentMode: false,
        isIndependentMode: false,
        t: () => '',
        capabilities: { canGenerate: true, canResearch: true },
        defaultSettings: {
          grade: '4th Grade',
          gradeSource: 'plan',
          subject: 'mathematics',
          subjectDetected: true,
          topic: 'Comparing fractions',
          language: 'English',
          standard: '',
          phases: ['directInstruction'],
          suggestedDuration: { segment: 15, lesson: 45 },
        },
        onGenerateTeachingScript: vi.fn().mockResolvedValue({ ok: true }),
        onCancelTeachingScript: vi.fn(),
        onUpdateTeachingScript: vi.fn().mockResolvedValue({ ok: true }),
        onOpenTeachingMaterial: vi.fn(),
      }));
      await Promise.resolve();
    });

    const section = mountEl.querySelector('[data-teaching-script-plan="plan-w89"]');
    expect(section).not.toBeNull();
    const styleEl = document.getElementById('allo-teaching-script-a11y-css');
    expect(styleEl).not.toBeNull();
    expect(styleEl.textContent).toContain('[data-teaching-script-plan]');
    expect(styleEl.textContent).toContain('[data-spoken-directions]');
    expect(styleEl.textContent).toContain('touch-action:manipulation');
    expect(styleEl.textContent).toContain(':focus-visible');
    expect(styleEl.textContent).toContain('forced-colors: active');
    expect(styleEl.textContent).toContain('prefers-reduced-motion: reduce');

    // Expand panel to exercise full interactive controls under axe
    const toggleBtn = section.querySelector('button[aria-expanded="false"]');
    expect(toggleBtn).not.toBeNull();
    await act(async () => { toggleBtn.click(); });

    expect(errorSpy).not.toHaveBeenCalled();
    expect(await runAxe(section)).toEqual([]);
  });
});
