// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require2 = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require2(resolve(modulesDir, 'react'));
const { createRoot } = require2(resolve(modulesDir, 'react-dom/client'));
const act = React.act;

function loadModule(fileName) {
  window.React = React;
  global.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloModules = window.AlloModules || {};
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), fileName), 'utf8'))();
}

describe('Round 5 Wave 20 — System Modals & Language Selector', () => {
  beforeEach(() => {
    window.__alloStudentAiDisabled = false;
    window.__alloAiSecretsLocked = false;
    window.__alloQrStudentMode = false;
    delete window.__alloAiUsable;
    document.body.innerHTML = '';
    window.__alloFocusTrapStack = [];
    window.__alloScrollLockState = { count: 0, prev: '' };
  });

  it('ui_language_selector gates AI regeneration & custom AI translation when AI is locked/disabled and caps/sanitizes manual input', () => {
    window.AlloLanguageContext = React.createContext({});
    window.AlloIcons = {
      Globe: () => null,
      RefreshCw: () => null,
      FolderOpen: () => null,
      Download: () => null,
      ArrowRight: () => null,
    };
    loadModule('ui_language_selector_module.js');
    const UiLanguageSelector = window.AlloModules.UILanguageSelector;
    expect(typeof UiLanguageSelector).toBe('function');

    // When AI is locked in QR student mode, Regenerate button is hidden and custom unknown language submission is blocked
    window.__alloQrStudentMode = true;
    const setUiLanguage = vi.fn();
    const regenerateLanguage = vi.fn();
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const ctxVal = {
      t: (k) => k,
      currentUiLanguage: 'Spanish (Latin America)',
      setUiLanguage,
      isTranslating: false,
      progress: 0,
      statusMessage: '',
      regenerateLanguage,
      exportLanguagePack: () => {},
      importLanguagePack: () => {},
    };
    act(() => {
      root.render(
        React.createElement(
          window.AlloLanguageContext.Provider,
          { value: ctxVal },
          React.createElement(UiLanguageSelector)
        )
      );
    });
    expect(host.querySelector('[data-help-key="ui_lang_regenerate_btn"]')).toBeNull();
    const input = host.querySelector('[data-help-key="ui_lang_manual_input"]');
    expect(input.maxLength).toBe(60);
    const submitBtn = host.querySelector('[data-help-key="ui_lang_manual_submit"]');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    act(() => {
      setter.call(input, 'Klingon<script>');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    act(() => { submitBtn.click(); });
    expect(setUiLanguage).not.toHaveBeenCalled();

    // Deployed static language is still allowed even when AI is locked
    act(() => {
      setter.call(input, 'French');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    act(() => { submitBtn.click(); });
    expect(setUiLanguage).toHaveBeenCalledWith('French');
    act(() => { root.unmount(); });
  });

  it('ui_modals guards non-array codenames, keys StudentQuizOverlay image, separates role="status" from interactive/heading nodes, and aborts mic check on unmount', () => {
    const src = readFileSync(resolve(process.cwd(), 'ui_modals_source.jsx'), 'utf8');
    expect(src).toContain('Array.isArray(rawAdjectives)');
    expect(src).toContain('Array.isArray(rawAnimals)');
    expect(src).toContain('key={currentQuestion.imageUrl}');
    expect(src).toContain('onLoad={(event) => { event.currentTarget.hidden = false; }}');
    expect(src).toContain('<span role="status" aria-live="polite">{noticeText}</span>');
    expect(src).toContain('micRecognitionRef.current.abort()');
    expect(src).not.toContain('<h3 role="status"');
  });

  it('view_global_level_up isolates nested #root siblings and blocks drag-out backdrop dismissal', () => {
    loadModule('view_global_level_up_module.js');
    const GlobalLevelUpModal = window.AlloModules.GlobalLevelUpModal.GlobalLevelUpModal;
    const appRoot = document.createElement('div');
    const bgMain = document.createElement('main');
    bgMain.textContent = 'Background app content';
    const modalMount = document.createElement('div');
    appRoot.appendChild(bgMain);
    appRoot.appendChild(modalMount);
    document.body.appendChild(appRoot);

    const onClose = vi.fn();
    const root = createRoot(modalMount);
    act(() => {
      root.render(
        React.createElement(GlobalLevelUpModal, {
          AnimatedNumber: ({ value }) => React.createElement('span', null, String(value)),
          ConfettiExplosion: () => null,
          adventureState: { level: 3, xp: 40, xpToNextLevel: 100 },
          handleSetShowGlobalLevelUpToFalse: onClose,
          t: (k) => k,
        })
      );
    });
    // Nested sibling inside #root must be isolated
    expect(bgMain.getAttribute('aria-hidden')).toBe('true');
    expect(bgMain.hasAttribute('inert')).toBe(true);

    // Drag starting inside dialog and releasing on backdrop must NOT close
    const backdrop = modalMount.querySelector('[role="presentation"]');
    const dialog = modalMount.querySelector('[role="dialog"]');
    act(() => {
      dialog.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onClose).not.toHaveBeenCalled();

    // Direct click on backdrop closes normally
    act(() => {
      backdrop.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    act(() => { root.unmount(); });
    expect(bgMain.getAttribute('aria-hidden')).toBeNull();
    expect(bgMain.hasAttribute('inert')).toBe(false);
  });

  it('view_storybook_export_modal isolates nested #root siblings and blocks drag-out backdrop dismissal', () => {
    loadModule('view_storybook_export_modal_module.js');
    const StorybookExportModal = window.AlloModules.StorybookExportModal.StorybookExportModal;
    const appRoot = document.createElement('div');
    const bgMain = document.createElement('main');
    const modalMount = document.createElement('div');
    appRoot.appendChild(bgMain);
    appRoot.appendChild(modalMount);
    document.body.appendChild(appRoot);

    const onClose = vi.fn();
    const root = createRoot(modalMount);
    act(() => {
      root.render(
        React.createElement(StorybookExportModal, {
          handleExportStorybook: vi.fn(async () => false),
          handleSetShowStorybookExportModalToFalse: onClose,
          isProcessing: false,
          setShowStorybookExportModal: vi.fn(),
          t: (k) => k,
        })
      );
    });
    expect(bgMain.getAttribute('aria-hidden')).toBe('true');
    expect(bgMain.hasAttribute('inert')).toBe(true);

    const backdrop = modalMount.querySelector('[role="presentation"]');
    const dialog = modalMount.querySelector('[role="dialog"]');
    act(() => {
      dialog.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onClose).not.toHaveBeenCalled();
    act(() => { root.unmount(); });
    expect(bgMain.getAttribute('aria-hidden')).toBeNull();
  });

  it('view_video_library includes video[controls] in focus trap, removes duplicate aria-label, and enforces strict top trap', () => {
    const src = readFileSync(resolve(process.cwd(), 'view_video_library_source.jsx'), 'utf8');
    expect(src).toContain('video[controls], audio[controls]');
    expect(src).toContain('if (trapStack && trapStack[trapStack.length - 1] !== trap) return;');
    expect(src).not.toContain("aria-label={tr('video_library.title', 'Video library')}");
  });

  it('view_canvas_recovery_dialog guards optional canvasRecoveryVaultForm, uses role="alert" on error, and provides 44px model download targets', () => {
    const src = readFileSync(resolve(process.cwd(), 'view_canvas_recovery_dialog_source.jsx'), 'utf8');
    expect(src).toContain("canvasRecoveryVaultForm?.mode !== 'confirm-recovery-code'");
    expect(src).toContain('role="alert" className="mt-3 rounded-lg border border-amber-200');
    expect(src).toContain('className="shrink-0 min-h-11 rounded-md border border-indigo-300');
  });
});
