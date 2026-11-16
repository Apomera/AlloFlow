import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const read = (file) => readFileSync(resolve(process.cwd(), file), 'utf8');

let React;
let ReactDOMClient;
let act;
let root;
let host;
const extraNodes = [];

const setControlledValue = (element, value) => {
  const proto = element.tagName === 'TEXTAREA'
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
};

const countUnclosedButtonsWithoutType = (jsxSource) => {
  const missing = [];
  let idx = 0;
  while ((idx = jsxSource.indexOf('<button', idx)) !== -1) {
    const nextChar = jsxSource[idx + 7];
    if (nextChar && !/[\s/>]/.test(nextChar)) {
      idx += 7;
      continue;
    }
    let i = idx + 7;
    let braceDepth = 0;
    let quote = null;
    while (i < jsxSource.length) {
      const ch = jsxSource[i];
      if (quote) {
        if (ch === '\\') { i += 2; continue; }
        if (ch === quote) quote = null;
      } else {
        if (ch === "'" || ch === '"' || ch === '`') quote = ch;
        else if (ch === '{') braceDepth++;
        else if (ch === '}') braceDepth = Math.max(0, braceDepth - 1);
        else if (ch === '>' && braceDepth === 0) break;
      }
      i++;
    }
    const openTag = jsxSource.slice(idx, i + 1);
    if (!/\btype\s*=/.test(openTag)) missing.push(openTag.slice(0, 80));
    idx = i + 1;
  }
  return missing;
};

const trackNode = (tagName = 'button', text = '') => {
  const el = document.createElement(tagName);
  if (tagName === 'button') el.type = 'button';
  if (text) el.textContent = text;
  document.body.appendChild(el);
  extraNodes.push(el);
  return el;
};

beforeAll(() => {
  React = require(resolve(MODULES_DIR, 'react'));
  ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
  act = React.act || require(resolve(MODULES_DIR, 'react-dom/test-utils')).act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  if (!window.matchMedia) {
    window.matchMedia = () => ({
      matches: false,
      media: '',
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    });
  }
});

afterEach(() => {
  if (root) {
    act(() => root.unmount());
    root = null;
  }
  host?.remove();
  host = null;
  while (extraNodes.length) extraNodes.pop()?.remove();
  window.__alloFocusTrapStack = [];
  delete window.__alloFirebase;
  delete window.callGemini;
  delete window.RTCPeerConnection;
  delete window.AlloThemeContext;
  delete window.__alloT;
  vi.restoreAllMocks();
});

const mount = (element) => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  act(() => {
    root.render(element);
  });
  return host;
};

describe('Phase 6 core UDL views, modals, overlays, and prompt hardening', () => {
  describe('Wave 1: Simplified Reader & Socratic Chat', () => {
    it('fences alignment/revision prompts, guards IME composition, and keeps 44px dark-contrast controls', () => {
      const src = read('view_simplified_source.jsx');
      expect(src).toContain('function _simplifiedSanitizeUntrusted');
      expect(src).toContain('function _simplifiedFenceUntrusted');
      for (const tag of [
        "_simplifiedFenceUntrusted('STANDARDS'",
        "_simplifiedFenceUntrusted('GRADE_LEVEL'",
        "_simplifiedFenceUntrusted('SOURCE_TEXT'",
        "_simplifiedFenceUntrusted('CURRENT_TEXT'",
        "_simplifiedFenceUntrusted('ALIGNMENT_FEEDBACK'",
        "_simplifiedFenceUntrusted('STANDARDS_CONTEXT'",
      ]) {
        expect(src).toContain(tag);
      }
      expect(src).toContain('!e.isComposing && !e.nativeEvent?.isComposing && e.keyCode !== 229');
      expect(src).toContain('min-h-11 min-w-11');
      expect(src).toContain('text-slate-200');
    });

    it('renders SocraticChat with 44px controls, IME composition suppression, and opener focus restoration', () => {
      loadAlloModule('view_socratic_chat_module.js');
      const { SocraticChat } = window.AlloModules.SocraticChat;
      expect(typeof SocraticChat).toBe('function');

      const toggleBtn = trackNode('button', 'Ask tutor');
      toggleBtn.setAttribute('data-help-key', 'socratic_toggle');
      toggleBtn.focus();

      const onSubmit = vi.fn();
      const setSocraticInput = vi.fn();

      mount(React.createElement(SocraticChat, {
        handleSetShowSocraticChatToFalse: vi.fn(),
        handleSocraticSubmit: onSubmit,
        handleToggleIsSocraticExpanded: vi.fn(),
        handleToggleSocraticAutoRead: vi.fn(),
        handleToggleSocraticAutoSend: vi.fn(),
        isSocraticDictating: false,
        isSocraticDragging: false,
        isSocraticExpanded: false,
        isSocraticThinking: false,
        recognitionRef: { current: null },
        renderFormattedText: (s) => s,
        setIsSocraticDictating: vi.fn(),
        setIsSocraticDragging: vi.fn(),
        setSocraticInput,
        showSocraticChat: true,
        socraticAutoRead: false,
        socraticAutoSend: false,
        socraticChatRef: { current: null },
        socraticDragOffset: { x: 0, y: 0 },
        socraticInput: 'Why does water evaporate?',
        socraticLivePos: null,
        socraticMessages: [],
        socraticPosition: { right: 16, bottom: 16 },
        socraticScrollRef: { current: null },
        t: (k) => k,
        warnLog: () => {},
      }));

      const buttons = [...host.querySelectorAll('button')];
      expect(buttons.length).toBeGreaterThanOrEqual(5);
      buttons.forEach((btn) => expect(btn.className).toContain('min-h-11'));
      expect(buttons.some((btn) => btn.className.includes('min-w-11'))).toBe(true);

      const input = host.querySelector('input[data-help-key="socratic_input"]');
      expect(input).toBeTruthy();
      expect(input.className).toContain('min-h-11');

      const form = host.querySelector('form');
      act(() => {
        input.dispatchEvent(new Event('compositionstart', { bubbles: true }));
        const keyEvt = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
        Object.defineProperty(keyEvt, 'isComposing', { value: true });
        input.dispatchEvent(keyEvt);
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });
      expect(onSubmit).not.toHaveBeenCalled();

      act(() => {
        input.dispatchEvent(new Event('compositionend', { bubbles: true }));
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });
      expect(onSubmit).toHaveBeenCalledTimes(1);

      // Move focus away from opener, then verify cleanup restores [data-help-key="socratic_toggle"] when previousFocus detached
      const tempOpener = document.createElement('button');
      document.body.appendChild(tempOpener);
      act(() => { root.unmount(); root = null; });
      expect(document.activeElement).toBe(toggleBtn);
      tempOpener.remove();
    });
  });

  describe('Wave 2: QuickStart Wizard & Visual Panel Grid', () => {
    it('hardens QuickStart prompts, 7 IME inputs, nested dialog focus, and DuplicateChoice tabIndex', () => {
      const src = read('quickstart_source.jsx');
      expect(src).toContain('function _qsSanitizeUntrusted');
      expect(src).toContain('function _qsFenceUntrusted');
      expect(src).toContain('_qsFenceUntrusted(\'SEARCH_QUERY\',');
      expect(src).toContain('_qsFenceUntrusted(\'TARGET_AUDIENCE\',');
      expect((src.match(/!_qsIsImeComposing\(e\)/g) || []).length).toBeGreaterThanOrEqual(7);
      expect(src).toContain("event.target.closest('[role=\"dialog\"]') !== dialog");
      expect(src).toContain('tabIndex={-1}');
    });

    it('fences all 3 VisualPanel Gemini prompts, guards 6 IME handlers, and runs accessible Label Challenge Results modal', () => {
      const src = read('visual_panel_source.jsx');
      expect((src.match(/_vpFenceUntrusted\(/g) || []).length).toBeGreaterThanOrEqual(3);
      expect((src.match(/if \(_vpIsImeComposing\(e\)\) return;/g) || []).length).toBeGreaterThanOrEqual(6);

      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }));

      loadAlloModule('visual_panel_module.js');
      const VisualPanelGrid = window.AlloModules.VisualPanelGrid;
      expect(['function', 'object']).toContain(typeof VisualPanelGrid);

      const outside = trackNode('button', 'Outside grid');
      const labels = {
        'common.label_challenge_results': 'Results',
        'visual_panel.challenge_results_title': 'Translated Challenge Results',
        'visual_panel.show_answer_key': 'Reveal Answer Key',
        'ui_common.close': 'Dismiss',
        'common.score': 'Score',
        'common.correct': 'Correct',
        'common.close_results': 'Close results',
      };

      mount(React.createElement(VisualPanelGrid, {
        visualPlan: {
          layout: 'grid',
          panels: [{ title: 'Stage 1', caption: 'Evaporation', imageUrl: 'data:image/png;base64,', labels: ['Evaporation'] }],
        },
        initialAnnotations: { challengeActive: true, challengeType: 'fill-blank' },
        isTeacherMode: false,
        language: 'English',
        t: (k) => labels[k] || k,
      }));

      const blankInput = host.querySelector('input');
      expect(blankInput).toBeTruthy();
      act(() => { setControlledValue(blankInput, 'Evaporation'); });

      const submitBtn = [...host.querySelectorAll('button')].find((b) => b.textContent.includes('Submit Answers'));
      expect(submitBtn && !submitBtn.disabled).toBe(true);
      act(() => { submitBtn.click(); });

      const dialog = host.querySelector('[role="dialog"][aria-modal="true"]');
      expect(dialog).toBeTruthy();
      expect(dialog.style.animation).toBe('none');
      expect(dialog.textContent).toContain('Translated Challenge Results');
      expect(dialog.textContent).toContain('Reveal Answer Key');
      expect(dialog.textContent).toContain('Dismiss');
      expect((window.__alloFocusTrapStack || []).length).toBeGreaterThanOrEqual(1);

      const modalBtns = [...dialog.querySelectorAll('button:not([disabled])')];
      expect(modalBtns.length).toBeGreaterThanOrEqual(3);
      const lastBtn = modalBtns[modalBtns.length - 1];
      lastBtn.focus();
      act(() => {
        lastBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
      });
      expect(dialog.contains(document.activeElement)).toBe(true);
      expect(document.activeElement).not.toBe(outside);
      expect(document.activeElement).toBe(modalBtns[0]);

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      });
      expect(host.querySelector('[role="dialog"]')).toBeNull();
    });
  });

  describe('Wave 3: Modals, Overlays, and Implicit Buttons', () => {
    it('runs VideoLibraryOverlay with aria-labelledby, standalone Tab/Escape trap, defaultPrevented guard, and opener restore', () => {
      loadAlloModule('view_video_library_module.js');
      const { VideoLibraryOverlay } = window.AlloModules.VideoLibrary;
      const opener = trackNode('button', 'Open library');
      const outside = trackNode('button', 'Outside');
      opener.focus();
      const onClose = vi.fn();

      mount(React.createElement(VideoLibraryOverlay, { onClose, t: (k) => k }));

      const dialog = host.querySelector('[role="dialog"][aria-modal="true"]');
      expect(dialog).toBeTruthy();
      expect(dialog.getAttribute('aria-labelledby')).toBe('video-library-title');
      expect(document.getElementById('video-library-title')).toBeTruthy();
      expect(dialog.contains(document.activeElement)).toBe(true);

      outside.focus();
      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
      });
      expect(dialog.contains(document.activeElement)).toBe(true);

      const preventedEsc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
      preventedEsc.preventDefault();
      act(() => { document.dispatchEvent(preventedEsc); });
      expect(onClose).not.toHaveBeenCalled();

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      });
      expect(onClose).toHaveBeenCalledTimes(1);

      act(() => { root.unmount(); root = null; });
      expect(document.activeElement).toBe(opener);
    });

    it('runs VideoRefPlayerOverlay focus trap and keeps object URLs intact across onClose callback re-renders', () => {
      loadAlloModule('view_video_ref_player_module.js');
      const { VideoRefPlayerOverlay } = window.AlloModules.VideoRefPlayer;
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      const opener = trackNode('button', 'Open video ref');
      opener.focus();

      const props = {
        item: { title: 'Sample video', data: { title: 'Sample video', durationSec: 25 } },
        onClose: vi.fn(),
        addToast: vi.fn(),
        t: () => '',
      };

      mount(React.createElement(VideoRefPlayerOverlay, props));

      const dialog = host.querySelector('[role="dialog"][aria-modal="true"]');
      expect(dialog).toBeTruthy();
      expect(dialog.contains(document.activeElement)).toBe(true);

      const nextOnClose = vi.fn();
      act(() => {
        root.render(React.createElement(VideoRefPlayerOverlay, { ...props, onClose: nextOnClose }));
      });
      expect(revokeSpy).not.toHaveBeenCalled();

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      });
      expect(props.onClose).not.toHaveBeenCalled();
      expect(nextOnClose).toHaveBeenCalledTimes(1);

      act(() => { root.unmount(); root = null; });
      expect(document.activeElement).toBe(opener);
    });

    it('guards StudyTimerModal custom minutes IME Enter and coordinates Escape with window.__alloFocusTrapStack', () => {
      loadAlloModule('view_study_timer_modal_module.js');
      const { StudyTimerModal } = window.AlloModules.StudyTimerModal;
      const setStudyDuration = vi.fn();
      const setStudyTimeLeft = vi.fn();
      const handleClose = vi.fn();

      mount(React.createElement(StudyTimerModal, {
        ConfettiExplosion: () => null,
        customTimerMinutes: '15',
        formatTime: (s) => `${s}s`,
        handleSetShowStudyTimerModalToFalse: handleClose,
        isStudyTimerRunning: false,
        setCustomTimerMinutes: vi.fn(),
        setIsStudyTimerRunning: vi.fn(),
        setStudyDuration,
        setStudyTaskLabel: vi.fn(),
        setStudyTimeLeft,
        showTimerConfetti: false,
        studyDuration: 1500,
        studyTaskLabel: '',
        studyTimeLeft: 1500,
        studyTimerRef: { current: null },
        t: (k) => k,
      }));

      const minsInput = host.querySelector('input[type="number"]');
      expect(minsInput).toBeTruthy();
      expect(minsInput.className).toContain('min-h-11');

      act(() => {
        const imeEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
        Object.defineProperty(imeEnter, 'isComposing', { value: true });
        minsInput.dispatchEvent(imeEnter);
      });
      expect(setStudyDuration).not.toHaveBeenCalled();

      act(() => {
        minsInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      });
      expect(setStudyDuration).toHaveBeenCalledWith(900);

      const nestedDialog = trackNode('div');
      nestedDialog.setAttribute('role', 'dialog');
      window.__alloFocusTrapStack.push({ root: nestedDialog });
      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      });
      expect(handleClose).not.toHaveBeenCalled();

      window.__alloFocusTrapStack.pop();
      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('keeps view_info_modal_source on __alloFocusTrapStack with reduced-motion and accessible arrow contrast', () => {
      const src = read('view_info_modal_source.jsx');
      expect(src).toContain('__alloFocusTrapStack');
      expect(src).toContain('event.defaultPrevented');
      expect(src).toContain('event.stopPropagation()');
      expect(src).toContain('motion-safe:animate-in motion-reduce:animate-none');
      expect(src).toContain('text-slate-600');
      expect(src).not.toContain('text-slate-400');
    });

    it('has zero implicit-submit buttons in ui_modals_source.jsx plus IME Enter and reduced-motion guards', () => {
      const src = read('ui_modals_source.jsx');
      expect(countUnclosedButtonsWithoutType(src)).toEqual([]);
      expect((src.match(/event\.isComposing \|\| event\.nativeEvent\?\.isComposing \|\| event\.keyCode === 229/g) || []).length).toBeGreaterThanOrEqual(2);
      expect((src.match(/animate-in motion-reduce:animate-none zoom-in duration-300/g) || []).length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Wave 4: Concept Pictionary, Lesson Board, and Seating Chart', () => {
    it('hardens Concept Pictionary prompts/doorway and runs GuestOverlay Tab, Escape, and guess IME guard', () => {
      const src = read('concept_pictionary_source.jsx');
      expect(src).toContain('<UNTRUSTED_SKETCH_CONTEXT>');
      expect(src).toContain("_cpFenceUntrusted('LESSON_SOURCE'");
      expect(src).toContain('const _cpAiUsable = (kind, fn) =>');

      let capturedDc = null;
      window.RTCPeerConnection = class {
        createDataChannel() {
          capturedDc = {
            readyState: 'open',
            send: vi.fn(),
            close: vi.fn(),
            onopen: null,
            onmessage: null,
            onclose: null,
          };
          return capturedDc;
        }
        async createOffer() { return { type: 'offer', sdp: 'x' }; }
        async setLocalDescription() {}
        async addIceCandidate() {}
        close() {}
      };
      window.__alloFirebase = {
        db: {},
        doc: (...segments) => ({ _path: segments.join('/') }),
        setDoc: async () => {},
        onSnapshot: () => () => {},
        deleteDoc: async () => {},
      };

      vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ setTransform() {}, clearRect() {}, fillRect() {}, save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {} });
      loadAlloModule('concept_pictionary_module.js');
      const { GuestOverlay } = window.AlloModules.ConceptPictionary;
      const onClose = vi.fn();
      const outside = trackNode('button', 'Outside guest');

      mount(React.createElement(GuestOverlay, {
        sessionCode: 'ABCD',
        userUid: 'stu-1',
        codename: 'River',
        onClose,
        t: (k) => k,
      }));

      expect(capturedDc).toBeTruthy();
      act(() => {
        capturedDc.onopen();
        capturedDc.onmessage({
          data: JSON.stringify({
            type: 'roundStart',
            payload: { roundId: 'round-1', isDrawer: false, concept: null },
          }),
        });
      });

      const dialog = host.querySelector('[role="dialog"][aria-modal="true"]');
      expect(dialog).toBeTruthy();
      const guessInput = dialog.querySelector('input[type="text"]');
      expect(guessInput).toBeTruthy();
      expect(guessInput.className).toContain('min-h-11');

      act(() => { setControlledValue(guessInput, 'condensation'); });
      act(() => {
        const imeEnter = new KeyboardEvent('keydown', { key: 'Enter', keyCode: 229, bubbles: true, cancelable: true });
        Object.defineProperty(imeEnter, 'isComposing', { value: true });
        guessInput.dispatchEvent(imeEnter);
      });
      expect(capturedDc.send).not.toHaveBeenCalled();

      act(() => {
        guessInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      });
      expect(capturedDc.send).toHaveBeenCalledTimes(1);
      expect(JSON.parse(capturedDc.send.mock.calls[0][0]).payload.text).toBe('condensation');

      const focusable = [...dialog.querySelectorAll('button:not([disabled]), input:not([disabled])')];
      expect(focusable.length).toBeGreaterThanOrEqual(2);
      const last = focusable[focusable.length - 1];
      last.focus();
      act(() => {
        last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
      });
      expect(dialog.contains(document.activeElement)).toBe(true);
      expect(document.activeElement).not.toBe(outside);

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('keeps Lesson Board XML fencing, shared Escape/Close teardown, and AI doorway gating', () => {
      const src = read('lesson_board_source.jsx');
      const engine = read('lesson_board_engine.js');
      expect(src).toContain("window.__alloAiUsable('text', callGemini)");
      expect(src).toContain('sceneryImagen');
      expect(src).toContain('const closeDialog = () => {');
      expect(src).toContain('onClick={closeDialog}');
      expect(engine).toContain('const _lbSanitize =');
      expect(engine).toContain('<UNTRUSTED_');
    });

    it('keeps Seating Chart standalone focus trap, confirm dialog isolation, XML fencing, and IME guards', () => {
      const src = read('seating_chart_source.jsx');
      expect(src).toContain('function _useSeatingFocusTrap');
      expect(src).toContain('__alloFocusTrapStack');
      expect(src).toContain('confirmRef');
      expect(src).toContain('role="alertdialog"');
      expect(src).toContain('<UNTRUSTED_UI_LABELS>');
      expect((src.match(/isComposing \|\| [^.]+\.nativeEvent\?\.isComposing \|\| [^.]+\.keyCode === 229/g) || []).length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Wave 5: Toast localization and reduced-motion guards', () => {
    it('localizes educator hub, math view, session modal, and preserves reduced motion in timeline', () => {
      const hub = read('view_educator_hub_modal_source.jsx');
      expect(hub).toContain("const tr = (key, fallback, params) => {");
      expect((hub.match(/addToast\([^;]*\btr\(['"]educator_hub\./g) || []).length).toBeGreaterThanOrEqual(15);
      expect(hub).toContain('{mb} MB per-file safety limit');
      expect(hub).toContain("addToast(t('educator_hub.pdf_project_one_at_a_time') || 'Open one saved PDF project at a time, on its own.'");

      const math = read('view_math_source.jsx');
      expect((math.match(/addToast\(_mathT\(/g) || []).length).toBe(7);
      const unguardedAnimateIn = math.split('\n').filter((l) => /animate-in/.test(l) && !/motion-reduce:animate-none/.test(l));
      expect(unguardedAnimateIn).toEqual([]);

      const session = read('view_session_modal_source.jsx');
      expect(session).toContain("tr('session.allow_popups_test_link'");
      expect(session).toContain("tr('session.wait_qr_load'");
      expect(session).toContain("tr('session.allow_popups_print_qr'");

      const timeline = read('view_timeline_source.jsx');
      expect((timeline.match(/className=\{reducedMotion \? '' : 'animate-spin'\}/g) || []).length).toBe(7);
      expect((timeline.match(/motion-safe:animate-in/g) || []).length).toBe(3);
      expect((timeline.match(/motion-reduce:animate-none/g) || []).length).toBe(3);
    });
  });
});
