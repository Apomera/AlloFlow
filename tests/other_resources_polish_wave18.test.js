import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import axe from 'axe-core';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React;
let ReactDOMClient;
let act;
let AssignmentCenterModal;
let HomeworkQrDialogView;
let ClassMailboxSetupView;
let GuidedModeBanner;
let ConceptPictionary;

const mounted = [];

function mountEl(element) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  act(() => { root.render(element); });
  mounted.push({ root, host });
  return host;
}

function setFieldValue(el, value) {
  const proto = Object.getPrototypeOf(el);
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  act(() => { el.dispatchEvent(new window.Event('input', { bubbles: true })); });
}

async function runAxe(container) {
  const result = await axe.run(container, {
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    },
  });
  expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
}

const Icon = () => null;
const shareIcons = {
  BookOpen: Icon,
  ClipboardList: Icon,
  Copy: Icon,
  ExternalLink: Icon,
  Eye: Icon,
  EyeOff: Icon,
  FolderDown: Icon,
  Maximize: Icon,
  Printer: Icon,
  Share2: Icon,
  Sparkles: Icon,
  Trash2: Icon,
  X: Icon,
};

const qrSvg = '<svg role="img" aria-labelledby="w18-qr-title" viewBox="0 0 10 10"><title id="w18-qr-title">Homework QR code</title><rect width="10" height="10"/></svg>';

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = React);
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
  if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};
  const AudioStub = function () {
    return { play: () => Promise.resolve(), pause() {}, set src(_v) {}, set onended(_v) {}, set onerror(_v) {} };
  };
  global.Audio = window.Audio = AudioStub;
  window.AlloIcons = new Proxy({}, { get: () => () => null });

  loadAlloModule('view_assignment_center_module.js');
  loadAlloModule('view_share_session_surfaces_module.js');
  loadAlloModule('view_guided_mode_banner_module.js');
  loadAlloModule('concept_pictionary_module.js');

  AssignmentCenterModal = window.AlloModules.AssignmentCenter.AssignmentCenterModal;
  HomeworkQrDialogView = window.AlloModules.HomeworkQrDialogView;
  ClassMailboxSetupView = window.AlloModules.ClassMailboxSetupView;
  GuidedModeBanner = window.AlloModules.GuidedModeBanner.GuidedModeBanner;
  ConceptPictionary = window.AlloModules.ConceptPictionary;
});

afterEach(async () => {
  while (mounted.length) {
    const { root, host } = mounted.pop();
    await act(async () => { root.unmount(); });
    host.remove();
  }
  delete window.callTTS;
  delete window.__alloFocusTrapStack;
  delete window.__alloScrollLockState;
  document.body.style.overflow = '';
  localStorage.clear();
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe('Wave 18 polish — AssignmentCenterModal, ShareSessionSurfaces, GuidedModeBanner, ConceptPictionary', () => {
  it('AssignmentCenterModal upgrades 44px targets, progressive search with IME-safe Escape, Copied status, inline Cancel confirm, and passes axe', async () => {
    const onClose = vi.fn();
    const onCopyLink = vi.fn();
    const onRemoveRecord = vi.fn();
    const rows = [
      { viewKey: 'r1', lifecycle: 'active', lifecycleLabel: 'Active', title: 'Photosynthesis Lab', resourceCount: 2, hasSharedActivity: true, activityType: 'survey', activityState: 'ready', participantCount: 4, pendingCount: 1, approvedCount: 3, hiddenCount: 0, expiresLabel: 'Oct 10', linkLabel: 'Private link', canExtend: true, canDuplicate: true, canRevoke: true, onManage: () => {}, onCopyLink, onExtend: () => {}, onDuplicate: () => {}, onRevoke: () => {}, onRemoveRecord },
      { viewKey: 'r2', lifecycle: 'active', lifecycleLabel: 'Active', title: 'Cell Division Reading', resourceCount: 1, hasSharedActivity: false, activityState: 'none', expiresLabel: 'Oct 12', linkLabel: 'Private link', canExtend: true, canDuplicate: true, canRevoke: true, onManage: () => {}, onCopyLink: () => {}, onExtend: () => {}, onDuplicate: () => {}, onRevoke: () => {}, onRemoveRecord: () => {} },
      { viewKey: 'r3', lifecycle: 'expired', lifecycleLabel: 'Expired', title: 'Ecology Exit Ticket', resourceCount: 3, hasSharedActivity: false, activityState: 'none', expiresLabel: 'Oct 1', linkLabel: 'Private link', canExtend: false, canDuplicate: true, canRevoke: false, onManage: () => {}, onCopyLink: () => {}, onExtend: () => {}, onDuplicate: () => {}, onRevoke: () => {}, onRemoveRecord: () => {} },
      { viewKey: 'r4', lifecycle: 'active', lifecycleLabel: 'Active', title: 'Genetics Reflection', resourceCount: 2, hasSharedActivity: false, activityState: 'none', expiresLabel: 'Oct 15', linkLabel: 'Private link', canExtend: true, canDuplicate: true, canRevoke: true, onManage: () => {}, onCopyLink: () => {}, onExtend: () => {}, onDuplicate: () => {}, onRevoke: () => {}, onRemoveRecord: () => {} },
    ];

    const host = mountEl(React.createElement(AssignmentCenterModal, {
      t: () => '',
      isOpen: true,
      activityEnabled: true,
      activityType: 'survey',
      activityPrompt: 'Share your thoughts',
      activityIdentityMode: 'codename',
      surveyItems: [
        { viewKey: 'q1', text: 'How confident do you feel?', type: 'likert', steps: 5 },
        { viewKey: 'q2', text: 'One question you still have', type: 'short_text' },
      ],
      surveyInfo: '',
      surveyHostingAvailable: true,
      hostedMutationAvailable: true,
      rowViews: rows,
      visibleRowViews: rows,
      filter: 'all',
      refreshing: false,
      onClose,
      onActivityChange: () => {},
      onSurveyItemChange: () => {},
      onSurveyItemRemove: () => {},
      onSurveyItemAdd: () => {},
      onPollAskChange: () => {},
      onSuggestPollTimes: () => {},
      onCreateLink: () => {},
      onFilterChange: () => {},
      onRefresh: () => {},
      onExportCsv: () => {},
    }));

    const dialog = host.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();

    // Live character/question counters
    expect(dialog.textContent).toContain('2/12 questions');
    expect(dialog.textContent).toContain('/240');

    // Close button & action buttons have 44px touch target classes
    const closeBtn = Array.from(dialog.querySelectorAll('button')).find((b) => (b.getAttribute('aria-label') || '').includes('Close'));
    expect(closeBtn).toBeTruthy();
    expect(closeBtn.className).toContain('min-h-11');
    expect(closeBtn.className).toContain('min-w-11');

    // Progressive search appears when >= 4 rows exist
    const searchInput = dialog.querySelector('#assignment-center-search');
    expect(searchInput).toBeTruthy();
    setFieldValue(searchInput, 'Genetics');
    expect(dialog.querySelectorAll('article[data-assignment-lifecycle]')).toHaveLength(1);
    expect(dialog.textContent).toContain('Showing 1 of 4');

    // Escape while search has text clears search without closing dialog
    act(() => {
      searchInput.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(searchInput.value).toBe('');
    expect(onClose).not.toHaveBeenCalled();
    expect(dialog.querySelectorAll('article[data-assignment-lifecycle]')).toHaveLength(4);

    // Copy active link shows Copied! state + polite role="status" announcement
    const copyBtn = Array.from(dialog.querySelectorAll('button')).find((b) => b.textContent.includes('Copy active link'));
    expect(copyBtn).toBeTruthy();
    expect(copyBtn.className).toContain('min-h-11');
    act(() => { copyBtn.click(); });
    expect(onCopyLink).toHaveBeenCalledTimes(1);
    expect(copyBtn.textContent).toContain('Copied!');
    const statusTexts = Array.from(dialog.querySelectorAll('[role="status"]')).map((el) => el.textContent).join(' ');
    expect(statusTexts).toContain('Assignment link copied to clipboard.');

    // Inline remove confirmation exposes sibling Cancel and Escape cancels it without closing dialog
    const removeBtn = Array.from(dialog.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Remove record');
    act(() => { removeBtn.click(); });
    const confirmRemoveBtn = Array.from(dialog.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Confirm remove');
    const cancelRemoveBtn = Array.from(dialog.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Cancel');
    expect(confirmRemoveBtn).toBeTruthy();
    expect(cancelRemoveBtn).toBeTruthy();
    expect(cancelRemoveBtn.className).toContain('min-h-11');

    act(() => {
      cancelRemoveBtn.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(Array.from(dialog.querySelectorAll('button')).some((b) => b.textContent.trim() === 'Confirm remove')).toBe(false);

    await runAxe(dialog);
  });

  it('HomeworkQrDialogView & ClassMailboxSetupView upgrade 44px controls, clipboard feedback, switch state text, explicit confirm Cancel, and pass axe', async () => {
    const copyToClipboard = vi.fn();
    const setMbShowAdmin = vi.fn();
    const setMbPanelOpen = vi.fn();

    // 1. HomeworkQrDialogView
    const qrHost = mountEl(React.createElement(HomeworkQrDialogView, {
      ...shareIcons,
      SharedAssignmentActivityPanel: () => null,
      addToast: () => {},
      copyToClipboard,
      createSelfContainedHomeworkLink: () => {},
      homeworkQrDialogRef: React.createRef(),
      hostPackOnMailbox: () => {},
      mbBusy: false,
      mbConfig: null,
      printQrSheet: () => {},
      qrShareError: false,
      qrShareModal: {
        type: 'assignment',
        title: 'Ecosystems Study Pack',
        resourceCount: 2,
        resourceTitles: ['Reading Guide', 'Flashcards'],
        aiPolicy: 'off',
        url: 'https://example.edu/hw/123',
        expiresAt: Date.now() + 86400000,
        noQr: false,
      },
      qrShareSvg: qrSvg,
      revokeHomeworkAssignment: () => {},
      setQrShareModal: () => {},
      t: () => '',
      testHomeworkAsStudent: () => {},
    }));

    const qrCopyBtn = Array.from(qrHost.querySelectorAll('button')).find((b) => b.textContent.includes('Copy homework link'));
    expect(qrCopyBtn).toBeTruthy();
    expect(qrCopyBtn.className).toContain('min-h-11');
    act(() => { qrCopyBtn.click(); });
    expect(copyToClipboard).toHaveBeenCalledWith('https://example.edu/hw/123');
    expect(qrCopyBtn.textContent).toContain('Link copied!');
    expect(Array.from(qrHost.querySelectorAll('[role="status"]')).map((n) => n.textContent).join(' ')).toContain('Homework link copied');
    await runAxe(qrHost);

    // 2. ClassMailboxSetupView
    const mbHost = mountEl(React.createElement(ClassMailboxSetupView, {
      ...shareIcons,
      addDirectionsToPack: () => {},
      alloPersistMailboxConfig: () => {},
      closeAllMailboxSessions: () => {},
      connectMailbox: () => {},
      copyMailboxScriptSource: () => {},
      copyToClipboard,
      deriveDirectionsDraft: () => {},
      directionsDeriving: false,
      exportMailboxConfig: () => {},
      importMailboxConfig: () => {},
      mailboxScriptState: { status: 'ready' },
      mbAdminInput: '',
      mbBusy: false,
      mbConfig: { url: 'https://script.google.com/macros/s/example/exec', admin: 'secret-admin', v: 20, latencyMs: 35 },
      mbDirectionsDraft: null,
      mbHwEvidence: {},
      mbLive: { code: 'XYZ789', joinUrl: 'https://example.edu/join', aiPolicy: 'off' },
      mbMode: 'sync',
      mbNow: Date.now(),
      mbQrSvg: qrSvg,
      mbResumable: [],
      mbRoster: {},
      mbShowAdmin: false,
      mbStatus: 'Connected',
      mbUrlInput: '',
      openStudentQrPreview: () => {},
      printQrSheet: () => {},
      requestEndLiveSession: () => {},
      resumeMailboxLiveSession: () => {},
      retryMailboxScriptSource: () => {},
      rotateMailboxAdmin: () => {},
      sendPackHome: () => {},
      setMbAdminInput: () => {},
      setMbConfig: () => {},
      setMbDirectionsDraft: () => {},
      setMbMode: () => {},
      setMbPanelOpen,
      setMbResumable: () => {},
      setMbShowAdmin,
      setMbStatus: () => {},
      setMbUrlInput: () => {},
      setShowDirectionsComposer: () => {},
      setShowSessionModal: () => {},
      shareFullPackToMailbox: () => {},
      startMailboxLiveSession: () => {},
      t: () => '',
    }));

    const mbDialog = mbHost.querySelector('[role="dialog"]') || mbHost;
    const closeBtn = mbDialog.querySelector('button[aria-label="Close"]');
    expect(closeBtn.className).toContain('min-w-11');
    expect(closeBtn.className).toContain('min-h-11');

    // Non-color-only state badge on sync switch
    const syncSwitch = mbDialog.querySelector('[role="switch"]');
    expect(syncSwitch).toBeTruthy();
    expect(syncSwitch.textContent).toContain('Sync');

    // Tap class code triggers Class code copied! feedback + polite status
    const codeBtn = Array.from(mbDialog.querySelectorAll('button')).find((b) => b.textContent.includes('XYZ789'));
    act(() => { codeBtn.click(); });
    expect(codeBtn.textContent).toContain('Class code copied!');
    expect(Array.from(mbDialog.querySelectorAll('[role="status"]')).map((n) => n.textContent).join(' ')).toContain('Class code copied');

    await runAxe(mbDialog);

    // 3. ClassMailboxSetupView (connected, idle — exposes admin token controls & Rotate token confirm)
    const mbIdleHost = mountEl(React.createElement(ClassMailboxSetupView, {
      ...shareIcons,
      addDirectionsToPack: () => {},
      alloPersistMailboxConfig: () => {},
      closeAllMailboxSessions: () => {},
      connectMailbox: () => {},
      copyMailboxScriptSource: () => {},
      copyToClipboard,
      deriveDirectionsDraft: () => {},
      directionsDeriving: false,
      exportMailboxConfig: () => {},
      importMailboxConfig: () => {},
      mailboxScriptState: { status: 'ready' },
      mbAdminInput: '',
      mbBusy: false,
      mbConfig: { url: 'https://script.google.com/macros/s/example/exec', admin: 'secret-admin', v: 20, latencyMs: 35 },
      mbDirectionsDraft: null,
      mbHwEvidence: {},
      mbLive: null,
      mbMode: 'sync',
      mbNow: Date.now(),
      mbQrSvg: qrSvg,
      mbResumable: [],
      mbRoster: {},
      mbShowAdmin: false,
      mbStatus: 'Connected',
      mbUrlInput: '',
      openStudentQrPreview: () => {},
      printQrSheet: () => {},
      requestEndLiveSession: () => {},
      resumeMailboxLiveSession: () => {},
      retryMailboxScriptSource: () => {},
      rotateMailboxAdmin: () => {},
      sendPackHome: () => {},
      setMbAdminInput: () => {},
      setMbConfig: () => {},
      setMbDirectionsDraft: () => {},
      setMbMode: () => {},
      setMbPanelOpen,
      setMbResumable: () => {},
      setMbShowAdmin,
      setMbStatus: () => {},
      setMbUrlInput: () => {},
      setShowDirectionsComposer: () => {},
      setShowSessionModal: () => {},
      shareFullPackToMailbox: () => {},
      startMailboxLiveSession: () => {},
      t: () => '',
    }));

    const mbIdleDialog = mbIdleHost.querySelector('[role="dialog"]') || mbIdleHost;

    // Reveal token button has 44px target + aria-pressed
    const revealBtn = mbIdleDialog.querySelector('button[aria-label="Reveal admin token"]');
    expect(revealBtn).toBeTruthy();
    expect(revealBtn.className).toContain('min-w-11');
    expect(revealBtn.getAttribute('aria-pressed')).toBe('false');

    // Rotate token confirmation reveals sibling Cancel button and Escape cancels without closing modal
    const rotateBtn = Array.from(mbIdleDialog.querySelectorAll('button')).find((b) => b.textContent.includes('Rotate token'));
    act(() => { rotateBtn.click(); });
    const cancelRotate = Array.from(mbIdleDialog.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Cancel');
    expect(cancelRotate).toBeTruthy();
    expect(cancelRotate.className).toContain('min-h-11');
    act(() => {
      cancelRotate.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(setMbPanelOpen).not.toHaveBeenCalled();
    expect(Array.from(mbIdleDialog.querySelectorAll('button')).some((b) => b.textContent.trim() === 'Cancel')).toBe(false);

    await runAxe(mbIdleDialog);
  });

  it('GuidedModeBanner upgrades 44px targets, progressbar aria-valuetext, ON/OFF switch cue, polite About TTS status, Quick Guide counter, and passes axe', async () => {
    let resolveTts;
    window.callTTS = vi.fn(() => new Promise((r) => { resolveTts = r; }));

    const steps = [
      { id: 'source-input', label: 'Source Material', action: 'Paste text.', success: 'Source ready.' },
      { id: 'analysis', label: 'Analyze Source Material', action: 'Run Analyze.', success: 'Analysis done.' },
      { id: 'faq', label: 'FAQ Generator', action: 'Generate FAQ.', success: 'FAQ ready.' },
    ];
    const tourSteps = [
      { id: 'tour-tool-analysis', title: 'About Analysis', text: 'Scans reading level and vocabulary.' },
    ];

    function Wrapper() {
      const [showTip, setShowTip] = React.useState(true);
      const [autoAdv, setAutoAdv] = React.useState(false);
      return React.createElement(GuidedModeBanner, {
        GUIDED_STEPS: steps,
        allGuidedSteps: steps,
        guidedSelectedIds: ['source-input', 'analysis', 'faq'],
        toggleGuidedStepId: () => {},
        GUIDED_TOUR_MAP: { 'source-input': 'tour-input-panel', analysis: 'tour-tool-analysis', faq: 'tour-tool-faq' },
        guidedStep: 1,
        guidedRect: null,
        guidedEngaged: false,
        wizardOpen: false,
        handleExitGuidedMode: () => {},
        handleGuidedSkip: () => {},
        setGuidedStep: () => {},
        setShowGuidedTip: setShowTip,
        showGuidedTip: showTip,
        guidedAutoAdvance: autoAdv,
        setGuidedAutoAdvance: setAutoAdv,
        t: () => '',
        tourSteps,
        history: [],
        getDefaultTitle: (type) => type,
        inputText: 'Plants convert light into chemical energy.',
        setInputText: () => {},
        guidedCompletedIds: ['source-input'],
        guidedSkippedIds: [],
        guidedCreatedHistoryIds: [],
        wordSoundsHistory: [],
        markGuidedStepDone: () => {},
        generateGuidedPlanFromGoal: vi.fn(async () => ({})),
      });
    }

    const host = mountEl(React.createElement(Wrapper));
    const banner = host.querySelector('.allo-guided-banner');
    expect(banner).toBeTruthy();

    // Progressbar has descriptive aria-valuetext
    const progress = banner.querySelector('[role="progressbar"]');
    expect(progress.getAttribute('aria-valuetext')).toContain('Phase');

    // Header Save & exit meets 44px height
    const saveExitBtn = Array.from(banner.querySelectorAll('button')).find((b) => b.textContent.includes('Save & exit'));
    expect(saveExitBtn.style.minHeight).toBe('44px');

    // Customize step picker includes non-color-only ON/OFF badge on auto-advance switch
    const customizeBtn = Array.from(banner.querySelectorAll('button')).find((b) => b.textContent.includes('Customize'));
    act(() => { customizeBtn.click(); });
    const autoState = banner.querySelector('[data-guided-auto-state]');
    expect(autoState?.textContent).toBe('OFF');
    const autoSwitch = banner.querySelector('button[role="switch"]');
    act(() => { autoSwitch.click(); });
    expect(banner.querySelector('[data-guided-auto-state]')?.textContent).toBe('ON');

    // About panel Listen button exposes aria-pressed/aria-busy and polite TTS status
    const listenBtn = Array.from(banner.querySelectorAll('button')).find((b) => b.textContent.includes('Listen'));
    expect(listenBtn).toBeTruthy();
    expect(listenBtn.getAttribute('aria-pressed')).toBe('false');
    await act(async () => { listenBtn.click(); });
    const ttsStatus = banner.querySelector('[data-guided-about-tts]');
    expect(ttsStatus?.getAttribute('role')).toBe('status');
    expect(ttsStatus?.getAttribute('data-guided-about-tts')).toBe('loading');
    expect(ttsStatus?.textContent).toContain('Loading voice');
    await act(async () => { resolveTts(null); await Promise.resolve(); });
    expect(banner.querySelector('[data-guided-about-tts]')?.getAttribute('data-guided-about-tts')).toBe('idle');

    // Quick Guide textarea shows live /400 counter and clears on Escape
    const quickGuide = banner.querySelector('textarea');
    expect(quickGuide).toBeTruthy();
    expect(banner.textContent).toContain('0/400');
    setFieldValue(quickGuide, 'How do I adapt this?');
    expect(banner.textContent).toContain('20/400');
    act(() => {
      quickGuide.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(quickGuide.value).toBe('');

    await runAxe(banner);
  });

  it('ConceptPictionary DrawerToolbox & SketchResponseGallery provide 44px swatches, active tool pill, progressbar, 4+ participant filter pills, feedback char counter, and pass axe', async () => {
    const setColor = vi.fn();
    const setMode = vi.fn();
    const onUndo = vi.fn();
    const onFeedbackDraftChange = vi.fn();

    function PictionaryHarness() {
      const [color, setCol] = React.useState(ConceptPictionary.PEN_COLORS[0].hex);
      const [mode, setMd] = React.useState('pen');
      const [drafts, setDrafts] = React.useState({ u1: 'Clear energy arrows!' });

      return React.createElement(
        'div',
        null,
        React.createElement(ConceptPictionary.DrawerToolbox, {
          color,
          setColor: (c) => { setColor(c); setCol(c); },
          mode,
          setMode: (m) => { setMode(m); setMd(m); },
          onUndo,
        }),
        React.createElement(ConceptPictionary.SketchResponseGallery, {
          participants: [
            { uid: 'u1', name: 'Blue Fox', groupId: 'g1' },
            { uid: 'u2', name: 'Quiet Star', groupId: 'g1' },
            { uid: 'u3', name: 'Bright Owl', groupId: 'g2' },
            { uid: 'u4', name: 'Swift Deer', groupId: 'g2' },
          ],
          strokesByUid: {
            u1: [{ strokeId: 's1', color: '#1a202c', points: [[10, 10], [30, 30]] }],
            u2: [{ strokeId: 's2', color: '#2b6cb0', points: [[15, 15], [40, 20]] }],
            u3: [],
            u4: [{ strokeId: 's4', color: '#2f855a', points: [[5, 5], [25, 25]] }],
          },
          statuses: { u1: 'submitted', u2: 'submitted', u3: 'drawing', u4: 'submitted' },
          moderation: { u1: 'approved', u2: 'unreviewed', u3: 'unreviewed', u4: 'approved' },
          attemptsByUid: { u1: 1, u2: 1, u3: 1, u4: 2 },
          feedbackByUid: {},
          feedbackDraftsByUid: drafts,
          feedbackBusyByUid: {},
          feedbackBusyKindByUid: {},
          visionNoticeByUid: {},
          criterion: 'Show energy transfer clearly',
          canStartShowcase: true,
          canPolishFeedback: false,
          canAnalyzeSketch: false,
          resources: [{ id: 'res-1', title: 'Energy Flow Guide' }],
          groups: { g1: { name: 'Table 1' }, g2: { name: 'Table 2' } },
          onApprove: () => {},
          onHold: () => {},
          onReveal: () => {},
          onFeedbackDraftChange: (uid, val) => {
            onFeedbackDraftChange(uid, val);
            setDrafts((prev) => ({ ...prev, [uid]: val }));
          },
          onSendFeedback: () => {},
        }),
      );
    }

    const host = mountEl(React.createElement(PictionaryHarness));

    // DrawerToolbox: 44px swatches in role="group", non-color-only active tool pill
    const colorGroup = host.querySelector('[role="group"][aria-label="Pen colors"]');
    expect(colorGroup).toBeTruthy();
    const swatches = colorGroup.querySelectorAll('button');
    expect(swatches.length).toBe(ConceptPictionary.PEN_COLORS.length);
    expect(swatches[0].className).toContain('min-w-11');
    expect(swatches[0].className).toContain('min-h-11');

    const toolPill = host.querySelector('[data-active-draw-tool]');
    expect(toolPill?.textContent).toContain('Tool: black pen');

    const redBtn = colorGroup.querySelector('button[aria-label="Pen color red"]');
    act(() => { redBtn.click(); });
    expect(host.querySelector('[data-active-draw-tool]')?.textContent).toContain('Tool: red pen');

    const eraserBtn = Array.from(host.querySelectorAll('button')).find((b) => b.textContent.includes('Eraser'));
    expect(eraserBtn.className).toContain('min-h-11');
    act(() => { eraserBtn.click(); });
    expect(host.querySelector('[data-active-draw-tool]')?.textContent).toContain('Tool: Eraser');

    // SketchResponseGallery: accessible progressbar + 4-participant progressive filter pills + live feedback char counter
    const progress = host.querySelector('[role="progressbar"]');
    expect(progress).toBeTruthy();
    expect(progress.getAttribute('aria-valuetext')).toContain('3 of 4');
    expect(progress.getAttribute('aria-valuetext')).toContain('75%');

    const filterButtons = host.querySelectorAll('[data-sketch-gallery-filter]');
    expect(filterButtons).toHaveLength(4);
    expect(filterButtons[0].className).toContain('min-h-11');

    // Filter to Drawing (pending — only u3)
    const drawingFilter = host.querySelector('[data-sketch-gallery-filter="pending"]');
    act(() => { drawingFilter.click(); });
    expect(host.textContent).toContain('Bright Owl');
    expect(host.textContent).not.toContain('Blue Fox');

    // Switch back to All
    const allFilter = host.querySelector('[data-sketch-gallery-filter="all"]');
    act(() => { allFilter.click(); });
    expect(host.textContent).toContain('Blue Fox');

    // Live feedback character counter (20 chars / 800)
    expect(host.textContent).toContain('20/800');

    await runAxe(host);
  });
});
