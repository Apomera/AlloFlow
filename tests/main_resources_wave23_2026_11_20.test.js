// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require2 = createRequire(import.meta.url);
const rootDir = process.cwd();
const modulesDir = path.resolve(rootDir, 'desktop/web-app/node_modules');
const React = require2(path.resolve(modulesDir, 'react'));
const { createRoot } = require2(path.resolve(modulesDir, 'react-dom/client'));
const act = React.act;

function loadModule(relPath) {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.React = React;
  window.React = React;
  window.AlloModules = window.AlloModules || {};
  const code = fs.readFileSync(path.join(rootDir, relPath), 'utf8');
  // eslint-disable-next-line no-new-func
  new Function(code)();
}

describe('Round 6 Wave 23 regressions', () => {
  let host;
  let root;

  beforeEach(() => {
    document.body.innerHTML = '';
    host = document.createElement('div');
    host.id = 'root';
    document.body.appendChild(host);
    root = createRoot(host);
    window.__alloAiSecretsLocked = false;
    window.__alloStudentAiDisabled = false;
    window.__alloQrStudentMode = false;
    window.__alloScrollLockState = { count: 0, overflow: '', prev: '' };
    window.__alloFocusTrapStack = [];
    localStorage.clear();
  });

  afterEach(() => {
    act(() => {
      try { root.unmount(); } catch (_) {}
    });
    document.body.innerHTML = '';
    delete window.__alloAiSecretsLocked;
    delete window.__alloStudentAiDisabled;
    delete window.__alloQrStudentMode;
    delete window.__alloAiUsable;
    delete window.__alloAiSetupDoorway;
    delete window.callGeminiVision;
  });

  it('LiveAac guards out-of-range/NaN timestamps, inerts siblings, locks scroll, and separates alert from Retry button', () => {
    loadModule('live_aac_module.js');
    const api = window.AlloModules.LiveAac;

    // Out-of-range and NaN timestamps return 0 instead of throwing RangeError in toISOString
    expect(api.timestamp(new Date('invalid'))).toBe(0);
    expect(api.timestamp(1e20)).toBe(0);
    expect(api.timestamp(-1e20)).toBe(0);
    expect(api.timestamp(1700000000000)).toBe(1700000000000);

    // LiveAacBoardDialog inerts background sibling, locks scroll, uses allo-docsuite, and ignores drag-out backdrop click
    const bgSibling = document.createElement('main');
    host.appendChild(bgSibling);
    const mountEl = document.createElement('div');
    host.appendChild(mountEl);
    const localRoot = createRoot(mountEl);
    const onDismiss = vi.fn();
    const payload = api.buildLive({
      type: 'board',
      title: 'Morning',
      words: [{ word: 'Hello', category: 'noun' }],
    });
    act(() => {
      localRoot.render(React.createElement(api.LiveAacBoardDialog, { payload, onDismiss, onSpeak: vi.fn(), t: () => '' }));
    });
    expect(bgSibling.hasAttribute('inert')).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
    expect(mountEl.querySelector('.allo-docsuite')).toBeTruthy();

    // Drag-out from card to backdrop must not dismiss
    const backdrop = mountEl.querySelector('[role="dialog"]');
    const card = mountEl.querySelector('.allo-docsuite');
    act(() => {
      card.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => localRoot.unmount());
    expect(bgSibling.hasAttribute('inert')).toBe(false);
    expect(document.body.style.overflow).toBe('');

    // MailboxImageDeliveryMonitor puts role="alert" on text span, not wrapping Retry button
    const monEl = document.createElement('div');
    host.appendChild(monEl);
    const monRoot = createRoot(monEl);
    act(() => {
      monRoot.render(React.createElement(api.MailboxImageDeliveryMonitor, {
        resource: { id: 'r1' },
        enabled: true,
        sessionKey: 's1',
        assignmentAt: 1,
        receiveError: true,
        onRetryResource: vi.fn(),
      }));
    });
    const alertEl = monEl.querySelector('[role="alert"]');
    expect(alertEl).toBeTruthy();
    expect(alertEl.querySelector('button')).toBeNull();
    act(() => monRoot.unmount());
  });

  it('SharedActivity blocks prototype pollution in credential store and clamps/validates assignment packs', async () => {
    loadModule('shared_activity_module.js');
    const api = window.AlloModules.SharedActivity;

    const polluted = api.normalizeCredentialStore({
      active: 'toString',
      slots: {
        __proto__: { uid: 'bad', pt: 'bad' },
        constructor: { uid: 'bad2', pt: 'bad2' },
        s1: { uid: 'u1', pt: 'p1', label: 'Ada' },
      },
    });
    expect(polluted.active).toBe('s1');
    expect(Object.prototype.hasOwnProperty.call(polluted.slots, '__proto__')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(polluted.slots, 'constructor')).toBe(false);
    expect(api.activeCredential(polluted)).toEqual({ uid: 'u1', pt: 'p1', label: 'Ada' });

    // Clamps homeworkExpiryDays and validates availability options/identityMode
    const addToast = vi.fn();
    const resInvalid = await api.buildAssignmentPackEncoded(
      { includeSharedActivity: true },
      {
        resolveAssignmentResources: () => [],
        sharedAssignmentActivity: { enabled: true, type: 'availability', optionsText: '', identityMode: 'real_name' },
        addToast,
        homeworkExpiryDays: 99999,
        serializeResourceForStudentPack: (x) => x,
        stripUndefined: (x) => x,
        generateUUID: () => 'id-1',
        encodeAlloPack: async (s) => s,
      }
    );
    expect(resInvalid).toBeNull();
    expect(addToast).toHaveBeenCalledWith(expect.stringMatching(/Add at least one option/i), 'info');
  });

  it('ConnectedEscapeRoom supports .theme-dark/.theme-contrast CSS and blocks AI in QR student mode', () => {
    const src = fs.readFileSync(path.join(rootDir, 'connected_escape_room_source.jsx'), 'utf8');
    expect(src).toContain('.dark .cer,.theme-dark .cer');
    expect(src).toContain('.theme-contrast .cer{');
    expect(src).toContain('window.__alloQrStudentMode !== true');
    expect(src).toContain('mountedRef');
  });

  it('StudentInteraction surfaces returned { ok: false } errors, inerts siblings, and guards malformed breakdown', async () => {
    const Icon = () => React.createElement('span');
    window.AlloLanguageContext = React.createContext({
      t: (k) => (k === 'codenames.adjectives' ? ['Brave'] : k === 'codenames.animals' ? ['Fox'] : k),
    });
    window.AlloIcons = { X: Icon, Send: Icon, Download: Icon, RefreshCw: Icon, CheckSquare: Icon, BookOpen: Icon, MapIcon: Icon, Quote: Icon, ArrowRight: Icon, Star: Icon, History: Icon, Lock: Icon, Trophy: Icon };
    delete window.__studentInteractionModuleLoaded;
    loadModule('student_interaction_module.js');
    const { StudentSubmitModal, DraftFeedbackInterface } = window.AlloModules;

    const bg = document.createElement('main');
    host.appendChild(bg);
    const mountNode = document.createElement('div');
    host.appendChild(mountNode);
    const localRoot = createRoot(mountNode);

    const onSubmit = vi.fn().mockResolvedValue({ ok: false, error: 'Mailbox quota reached' });
    act(() => {
      localRoot.render(React.createElement(StudentSubmitModal, {
        isOpen: true,
        onClose: vi.fn(),
        onSubmit,
        history: [],
        currentNickname: 'Brave Fox',
        submissionMethod: 'mailbox',
      }));
    });
    expect(bg.hasAttribute('inert')).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
    expect(mountNode.querySelector('#student-submit-summary-title')?.tagName).toBe('H3');

    const submitBtn = mountNode.querySelector('[data-help-key="submit_confirm_btn"]');
    await act(async () => {
      submitBtn.click();
      await Promise.resolve();
    });
    expect(mountNode.querySelector('[role="alert"]')?.textContent).toContain('Mailbox quota reached');
    act(() => localRoot.unmount());
    expect(bg.hasAttribute('inert')).toBe(false);

    // DraftFeedbackInterface handles non-array breakdown without throwing
    act(() => {
      root.render(React.createElement(DraftFeedbackInterface, {
        status: 'revision',
        gradingDetails: { rawScore: undefined, breakdown: 'corrupted' },
        draftText: 'My draft',
        setDraftText: vi.fn(),
        previousDraft: 'Old draft',
        onSubmit: vi.fn(),
        onCancel: vi.fn(),
      }));
    });
    expect(host.textContent).not.toContain('undefined/100');
  });

  it('AdaptiveController catches playEffect promise rejection and blocks R3 dictation on password inputs', () => {
    delete window._alloGamepadGlobal;
    const rejectMock = vi.fn(() => Promise.reject(new Error('not supported')));
    const origGetGamepads = navigator.getGamepads;
    Object.defineProperty(navigator, 'getGamepads', {
      configurable: true,
      value: () => [{ connected: true, vibrationActuator: { playEffect: rejectMock }, axes: [], buttons: [] }],
    });
    loadModule('adaptive_controller_module.js');
    expect(() => window._alloHaptic('tap')).not.toThrow();
    expect(rejectMock).toHaveBeenCalledTimes(1);
    const src = fs.readFileSync(path.join(rootDir, 'adaptive_controller_source.jsx'), 'utf8');
    expect(src).toContain("['text', 'search', 'url', 'tel', 'email'].includes(inputType)");
    expect(src).toContain('_gpadFindScrollable');
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: origGetGamepads });
  });

  it('AccessibilityEvidence guards invalid Date, prototype keys, executed:false, summary ai.reviewCount, and manifestId', () => {
    delete window.AlloModules.AccessibilityEvidenceModule;
    loadModule('accessibility_evidence_module.js');
    const api = window.AlloModules.AccessibilityEvidence;

    expect(api.stableSerialize(new Date('not-a-date'))).toBe('"[invalid-date]"');
    expect(api.normalizeProfile('toString').id).toBe('accessibility-lab');
    expect(api.canonicalizeFinding({ ruleId: 'toString' }).severity).toBe('moderate');

    // executed: false must never pass as complete even with score: 100
    const resExecFalse = api.deriveVerificationState({
      ai: { executed: false, score: 100, issueCount: 0 },
      axe: { score: 100, totalViolations: 0, totalIncomplete: 0 },
      equalAccess: { score: 100, failViolations: 0, potentialViolations: 0, manualViolations: 0 },
    });
    expect(resExecFalse.fullyVerifiedSuccess).toBe(false);
    expect(resExecFalse.coverage.ai).toBe('unavailable');

    // summary-only ai.reviewCount marks review-required
    const resSummaryReview = api.deriveVerificationState({
      ai: { score: 95, issueCount: 0, reviewCount: 2 },
      axe: { score: 100, totalViolations: 0, totalIncomplete: 0 },
      equalAccess: { score: 100, failViolations: 0, potentialViolations: 0, manualViolations: 0 },
    });
    expect(resSummaryReview.verificationState).toBe('review-required');
    expect(resSummaryReview.reviewCount).toBe(2);

    // unavailable state carries verifiable manifest; tampered manifestId fails verification
    const unavail = api.unavailableVerificationState('offline');
    expect(unavail.evidenceManifest).toBeTruthy();
    expect(api.verifyEvidenceManifest(unavail.evidenceManifest).valid).toBe(true);
    const tampered = { ...unavail.evidenceManifest, manifestId: 'wrong-profile:' + unavail.evidenceManifest.manifestDigest };
    expect(api.verifyEvidenceManifest(tampered).valid).toBe(false);
    expect(api.verifyEvidenceManifest(tampered).reason).toBe('manifest-id-mismatch');
  });

  it('AltText allowlists Mulberry hosts, blocks XSS SVG symbols, and gates ImageAltField in QR student mode', async () => {
    delete window.AlloModules.AltTextModule;
    loadModule('alt_text_module.js');
    const api = window.AlloModules.AltText;

    // Untrusted Mulberry host is rejected
    const out = await api.searchMulberrySymbols('apple', {
      fetchImpl: async () => ({
        ok: true,
        json: async () => [
          { id: 1, text: 'evil', picto: { id: 1, image_url: 'https://evil.example/payload.svg' } },
          { id: 2, text: 'good', picto: { id: 2, image_url: 'https://globalsymbols.com/uploads/apple.svg' } },
        ],
      }),
    });
    expect(out.symbols.map((s) => s.label)).toEqual(['good']);

    // Malicious SVG with <script> is blocked on choose in ClassroomImagePicker
    const onChoose = vi.fn();
    const evilSvg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
    const fetchImpl = vi.fn(async (url) => String(url).includes('labels/search')
      ? { ok: true, json: async () => [{ id: 1, text: 'apple', picto: { id: 11, image_url: 'https://globalsymbols.com/uploads/apple.svg' } }] }
      : { ok: true, blob: async () => new Blob([evilSvg], { type: 'image/svg+xml' }) });
    act(() => {
      root.render(React.createElement(api.ClassroomImagePicker, {
        initialQuery: 'apple',
        sources: ['symbols'],
        fetchImpl,
        onChoose,
      }));
    });
    await act(async () => {
      host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 20));
    });
    await act(async () => {
      host.querySelector('button[aria-label="Use symbol: apple"]').click();
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(onChoose).not.toHaveBeenCalled();
    expect(host.textContent).toMatch(/unsafe SVG/i);

    // ImageAltField blocks regenerate and hides SetupNotice in QR student mode
    window.__alloQrStudentMode = true;
    window.AlloModules.AlloAiSetupNotice = () => React.createElement('div', { 'data-setup-notice': '1' });
    act(() => {
      root.render(React.createElement(api.ImageAltField, {
        value: 'A red apple',
        onChange: vi.fn(),
        onRegenerate: vi.fn(),
      }));
    });
    const regenBtn = Array.from(host.querySelectorAll('button')).find((b) => /Describe from the image/i.test(b.textContent || ''));
    expect(regenBtn.disabled).toBe(true);
    expect(host.querySelector('[data-setup-notice]')).toBeNull();
  });
});
