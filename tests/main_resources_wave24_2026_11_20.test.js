import { describe, it, expect, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;

const read = (p) => fs.readFileSync(resolve(p), 'utf8');

describe('Round 6 Wave 24 hardening (8 modules)', () => {
  let host, root;

  afterEach(async () => {
    if (root) {
      await act(async () => root.unmount());
      root = null;
    }
    if (host) {
      host.remove();
      host = null;
    }
    delete window.__alloQrStudentMode;
    delete window.__alloStudentAiDisabled;
    delete window.__alloAiSecretsLocked;
    delete window.__alloFocusTrapStack;
    delete window.__alloScrollLockState;
    document.body.style.overflow = '';
  });

  it('1. image_asset_editor awaits async onApply and isolates Escape propagation', async () => {
    const src = read('image_asset_editor_source.jsx');
    expect(src).toContain('await props.onApply(');
    expect(src).toContain('event.preventDefault();');
    expect(src).toContain('event.nativeEvent?.stopPropagation?.();');

    // Runtime check: busy stays true while async onApply is pending
    global.IS_REACT_ACT_ENVIRONMENT = true;
    window.React = React;
    window.AlloModules = window.AlloModules || {};
    new Function(read('image_asset_editor_module.js'))();
    const { ImageAssetEditor } = window.AlloModules;

    let resolveApply;
    const onApply = vi.fn(() => new Promise((r) => { resolveApply = r; }));
    const onCancel = vi.fn();
    const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const fakeRenderer = vi.fn().mockResolvedValue({ dataUrl: tinyPng });

    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => {
      root.render(React.createElement(ImageAssetEditor, {
        sourceDataUrl: tinyPng,
        renderImageAsset: fakeRenderer,
        onApply,
        onCancel,
      }));
    });

    const applyBtn = [...host.querySelectorAll('button')].find((b) => /use edited image/i.test(b.textContent));
    expect(applyBtn).toBeTruthy();
    await act(async () => { applyBtn.click(); });
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(host.querySelector('section').getAttribute('aria-busy')).toBe('true');

    await act(async () => { resolveApply(); });
    expect(host.querySelector('section').getAttribute('aria-busy')).toBe('false');
  });

  it('2. resource_image_controls guards null quiz slots, defers popup-close cancel mid-save, and uses role="alert" for errors', async () => {
    const src = read('resource_image_controls_source.jsx');
    expect(src).toContain('if (!q || typeof q !== \'object\') return;');
    expect(src).toContain('if (popup.closed && !saving)');
    expect(src).toContain('onError?.(error, { recoverable: true })');
    expect(src).toContain("role={isError ? 'alert' : 'status'}");

    window.React = React;
    window.AlloModules = window.AlloModules || {};
    new Function(read('image_asset_editor_module.js'))();
    const helpers = window.AlloModules.ResourceImageTools;

    const slots = helpers.resourceImageSlots({
      id: 'q1',
      type: 'quiz',
      data: { questions: [null, { prompt: 'A', options: 'not-an-array' }, { prompt: 'B', options: ['x'] }] },
    });
    expect(slots.some((s) => s.label === 'Question 2')).toBe(true);
    expect(slots.some((s) => s.label === 'Question 3 — choice 1')).toBe(true);
  });

  it('3. glossary_image_controls enforces safe public HTTPS Mulberry URLs, hash-keyed credit bands, AI locks, and dialog scroll lock', () => {
    const src = read('glossary_image_controls_source.jsx');
    expect(src).toContain('_isSafeGlossaryMulberryUrl');
    expect(src).toContain('parsed.username || parsed.password');
    expect(src).toContain('169\\.254\\.');
    expect(src).toContain('_setGlossaryCreditBand');
    expect(src).toContain('glossaryCreditBands.size >= 40');
    expect(src).toContain('_isGlossaryAiBlocked()');
    expect(src).toContain('__alloScrollLockState');
    expect(src).toContain('allo-docsuite fixed inset-0');
    expect(src).toContain('window.getComputedStyle(element)');
    expect(src).toMatch(/try\s*\{\s*const url = new URL\(result\.url\)/);
  });

  it('4. persona_session_artifact validates privacy on list, extends revokeObjectURL, preserves roles, and guards reflection prompt', async () => {
    const src = read('persona_session_artifact_source.jsx');
    expect(src).toContain("typeof contract.parseReadAloudArtifact !== 'function'");
    expect(src).toContain("code: 'privacy-policy-violation'");
    expect(src).toContain('setTimeout(revoke, 15000)');
    expect(src).toContain(".turn.educator{");
    expect(src).toContain(".turn.narrator{");

    window.AlloModules = window.AlloModules || {};
    new Function(read('read_aloud_artifact_contract_module.js'))();
    new Function(read('persona_session_artifact_module.js'))();
    const PSA = window.AlloModules.PersonaSessionArtifact;

    // Reflection prompt handles non-array selectedCharacters and learner/student roles
    const prompt = PSA.buildSecureReflectionPrompt({
      mode: 'panel',
      selectedCharacters: 'not-an-array',
      chatHistory: [
        { role: 'learner', text: 'Why did it happen?' },
        { role: 'student', text: 'What happened next?' },
      ],
    }, ['CCSS.1'], 'DOK 2', 'English');
    expect(prompt).toContain('Student: Why did it happen?');
    expect(prompt).toContain('Student: What happened next?');

    // listPrivateSessionArtifacts flags tampered privacy metadata as unreadable
    const fakeContract = {
      TYPES: { PERSONA_SESSION: 'persona-session' },
      buildPrivatePersonaSessionArtifact: () => ({}),
      serializeReadAloudArtifact: () => '{}',
      validateReadAloudArtifact: (x) => x,
      stableIdFromParts: () => 'id1',
      parseReadAloudArtifact: () => ({
        artifactType: 'persona-session',
        artifactId: 'a1',
        title: 'Test',
        language: 'English',
        privacy: { ownerOnly: true, private: true, localOnly: false, shareable: true },
        session: { messages: [] },
      }),
    };
    const listed = await PSA.listPrivateSessionArtifacts({
      contract: fakeContract,
      deviceStorage: {
        list: async () => ['k1'],
        get: async () => '{"ok":true}',
      },
    });
    expect(listed.sessions).toHaveLength(0);
    expect(listed.unreadable).toEqual([{ key: 'k1', code: 'privacy-policy-violation' }]);
  });

  it('5. adventure_offline clears busy on epoch cancel, requires 2-tap remove, hides AI notice in student mode, and locks dialog', async () => {
    const src = read('adventure_offline_source.jsx');
    expect(src).toContain('backdropDownRef');
    expect(src).toContain('__alloScrollLockState');
    expect(src).toContain("child.setAttribute('inert', '')");
    expect(src).toContain('hideAiNotice');
    expect(src).toContain('data-offline-remove-confirm');
    expect(src).toContain('aiEpochRef.current++; setBusy(false);');

    global.IS_REACT_ACT_ENVIRONMENT = true;
    window.React = React;
    window.AlloModules = window.AlloModules || {};
    window.AlloIcons = new Proxy({}, { get: () => () => null });
    window.AlloLanguageContext = React.createContext({ t: (k) => k });
    window.__alloHooks = { useFocusTrap: () => {} };
    window.__alloStudentAiDisabled = true;
    window.AlloAiSetupNotice = () => React.createElement('span', { 'data-doorway': true });
    new Function(read('view_adventure_module.js'))();
    const Offline = window.AlloModules.AdventureOffline;

    const existing = {
      id: 'off1',
      type: 'adventure',
      data: {
        offlineStory: {
          version: 1, title: 'T', start: 's1',
          scenes: [
            { id: 's1', text: 'Start', choices: [{ label: 'Go', to: 's2' }] },
            { id: 's2', text: 'End', ending: true, choices: [] },
          ],
        },
      },
    };
    const setHistory = vi.fn();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => {
      root.render(React.createElement(Offline.Panel, {
        t: (k) => k, history: [existing], setHistory, callGemini: null, onClose: vi.fn(),
      }));
    });

    // Student-AI-disabled hides setup doorway notice
    expect(host.querySelector('[data-doorway]')).toBeNull();
    // 2-tap remove: first click asks confirmation, does not remove yet
    const removeBtn = host.querySelector('[data-offline-remove]');
    expect(removeBtn).toBeTruthy();
    await act(async () => { removeBtn.click(); });
    expect(setHistory).not.toHaveBeenCalled();
    const confirmBtn = host.querySelector('[data-offline-remove-confirm]');
    expect(confirmBtn).toBeTruthy();
    await act(async () => { confirmBtn.click(); });
    expect(setHistory).toHaveBeenCalledTimes(1);
  });

  it('6. lesson_board passes valid board to receiveSupport, stores ticket.timer, avoids selector injection, preserves openFile notice, and isolates live regions', () => {
    const src = read('lesson_board_source.jsx');
    expect(src).toContain('receiveSupport(saved.support,saved.revision,valid)');
    expect(src).toContain('ticket.timer=timer');
    expect(src).toContain("el.getAttribute('data-edit-location') === editTarget");
    expect(src).not.toContain('querySelector(\'[data-edit-location="\' + editTarget');
    expect(src).toContain('pendingNoticeRef.current = fileNotice');
    expect(src).toContain('<div className="lb-notice lb-row lb-between"><span role="status">');
    expect(src).toContain('const overlayVisible = state?.mode === \'lesson-board\' && !!state.isActive;');
  });

  it('7. onboarding_coach isolates Cancel outside aria-live, adds 2-tap Start over, aborts on close, and locks dialog', () => {
    const src = read('onboarding_coach_source.jsx');
    expect(src).toContain('Cancel button stays outside aria-live');
    expect(src).toContain("var events = ['alloflow:ai-config-changed', 'alloflow:student-ai-config-changed', 'alloflow:ai-key-lock-changed', 'online', 'offline']");
    expect(src).toContain('var closePanel = function ()');
    expect(src).toContain('backdropDownRef');
    expect(src).toContain('__alloScrollLockState');
    expect(src).toContain("minHeight: '44px'");
    expect(src).toContain('confirmReset');
    expect(src).toContain("color: '#475569'");
  });

  it('8. quickstart_wizard enforces type="button", trap stack + inert/scroll lock, live AI gates, and epoch guards', () => {
    const src = read('quickstart_source.jsx');
    expect(src).toContain("e('button', {\n          type: 'button',\n          key: b.slug,");
    expect(src).toContain('window.__alloFocusTrapStack = window.__alloFocusTrapStack || []');
    expect(src).toContain('window.__alloScrollLockState');
    expect(src).toContain("child.setAttribute('inert', '')");
    expect(src).toContain('window.__alloQrStudentMode === true');
    expect(src).toContain("alloflow:ai-config-changed");
    expect(src).toContain('standardsEpochRef');
    expect(src).toContain('fetchEpochRef');
    expect(src).toContain('goalEpochRef');
    expect(src).toContain('grid-cols-2 sm:grid-cols-4');
  });
});
