import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;

let host, root;

beforeAll(() => {
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const Stub = () => null;
  window.AlloIcons = new Proxy({}, { get: () => Stub, has: () => true });
  ['Wifi', 'X', 'Copy', 'Users', 'ChevronRight', 'XCircle', 'ExternalLink', 'Printer', 'Maximize', 'Minimize', 'CheckCircle2', 'Save', 'FolderOpen', 'Download', 'Send', 'MapIcon', 'Lock', 'RefreshCw', 'History', 'Sparkles', 'ClipboardList', 'Settings', 'Layers', 'Plus', 'Pencil'].forEach(name => {
    window[name] = Stub;
  });
  window.AlloModules = window.AlloModules || {};

  for (const file of [
    'view_live_session_dock_module.js',
    'view_session_modal_module.js',
    'view_student_save_adventure_module.js',
    'view_teacher_history_tab_module.js',
  ]) {
    new Function(readFileSync(resolve(file), 'utf8'))();
  }
});

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  host?.remove();
  host = null;
  window.__alloFocusTrapStack = [];
  window.__alloScrollLockState = { count: 0, prev: '' };
  try { window.localStorage.clear(); } catch (_) {}
  try { window.sessionStorage.clear(); } catch (_) {}
  vi.restoreAllMocks();
});

function mount(element) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(element));
  return host;
}

function setInputValue(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}

describe('Other resources polish — Wave 7 (Live Session Dock, Session Modal, Student Save/Adventure, Teacher History Tab)', () => {
  it('LiveSessionDockView provides Needs-attention roster filter and live student codename search with recovery', () => {
    const LiveSessionDockView = window.AlloModules.LiveSessionDockView;
    const now = Date.now();
    const rosterEntries = {
      u1: { name: 'Azure Fox', lastSeen: now, viewingResourceId: 'res-1', viewingResourceAt: 1000, viewingResourceStatus: 'opened' },
      u2: { name: 'Cobalt Owl', lastSeen: now - 5 * 60 * 1000, viewingResourceId: 'res-1', viewingResourceAt: 1000, viewingResourceStatus: 'opened' },
      u3: { name: 'Emerald Elk', lastSeen: now, viewingResourceId: 'other', viewingResourceAt: 500, viewingResourceStatus: 'failed' },
      u4: { name: 'Golden Jay', lastSeen: now, viewingResourceId: 'res-1', viewingResourceAt: 1000, viewingResourceStatus: 'opened' },
    };

    mount(React.createElement(LiveSessionDockView, {
      ALLOHAVEN_CLASSROOM_REWARD_REASONS: [{ id: 'effort', label: 'Strong effort' }],
      ALLOHAVEN_RECOGNITION_CAPS: [3, 5],
      CLASS_GOAL_TEMPLATES: [],
      LIVE_SIGNAL_FRESH_MS: 60000,
      TEACHER_ONLY_TYPES: new Set(),
      _alloMbBridgeActive: () => false,
      _alloStudentSafeResources: (list) => list,
      activeSessionAppId: 'app-1',
      activeSessionCode: 'ABCDE',
      activeSignals: [],
      activeUnitId: 'all',
      activeView: 'simplified',
      addToast: () => {},
      adventureState: {},
      broadcastInteractiveOrganizer: () => {},
      checklistMarks: {},
      classGoalDraft: null,
      classifyLiveRosterPresence: ({ entry }) => ({ status: (now - entry.lastSeen) > 120000 ? 'disconnected' : 'connected' }),
      clearSignal: () => {},
      dockCardStyle: {},
      dockGroupLabel: {},
      dockNow: now,
      evaluateClassGoalProgress: () => ({}),
      formatTime: () => '0:00',
      generatedContent: { id: 'res-1', type: 'simplified', title: 'Cell Passage' },
      getAlloHavenSessionRecognitionTokens: () => 0,
      getDefaultTitle: (type) => type,
      getFilteredHistory: () => [],
      getIconForType: () => '',
      getWordSoundsPortableAudioCoverage: () => ({ complete: true }),
      handleAwardClassGoal: () => {},
      handleAwardIndependentGoal: () => {},
      handleRecognizeStudent: () => {},
      handleRecognizeStudents: () => {},
      handleReleaseStudentResources: () => {},
      handleRestoreView: () => {},
      handleSetGroupResource: () => {},
      handleSetIsZenModeToTrue: () => {},
      handleSetShowGroupModalToTrue: () => {},
      handleSetShowStudyTimerModalToTrue: () => {},
      handleSetStudentResource: () => {},
      handleSetStudentsResource: () => {},
      handleUpdateHavenRecognitionConfig: () => {},
      havenConfigBusy: false,
      havenRecognitionConfig: { enabled: false, perStudentTokenCap: 3 },
      havenRewardAmount: 1,
      havenRewardBusy: false,
      havenRewardDraftsRef: { current: {} },
      havenRewardReasonId: 'effort',
      havenRewardReceipt: null,
      history: [{ id: 'res-1', type: 'simplified', title: 'Cell Passage' }],
      interactiveOrganizerRetrying: false,
      interactiveOrganizerSync: {},
      isStudyTimerRunning: false,
      launchPreparedLiveInteraction: () => {},
      liveActivitySnapshots: [],
      liveAudioStatusNow: now,
      liveOrganizer: null,
      liveOrganizerSummary: {},
      livePresenterCuesByResourceId: {},
      liveSessionQaEnabled: false,
      normalizeClassGoal: (g) => g,
      normalizeClassGoals: () => [],
      normalizeLiveOrganizerProgress: () => null,
      openChecklistGoalId: '',
      openLiveActivityDashboard: () => {},
      recentHavenRecognition: [],
      resolveClassGoalTeamUids: () => [],
      resolveLiveStudentResourceTarget: () => ({ resourceId: 'res-1', resourceAt: 1000 }),
      resolveWordSoundsAudioDeliveryState: () => ({ status: 'ok', needsAttention: false, stalled: false, busy: false }),
      retryInteractiveOrganizerStudents: () => {},
      retryableLiveOrganizerUids: [],
      retryMailboxImagesForStudent: () => {},
      mailboxImageVersion: 0,
      rosterEntries,
      rosterKey: null,
      sessionData: { mode: 'sync', currentResourceId: 'res-1', roster: rosterEntries, groups: {} },
      setActiveView: () => {},
      setChecklistMarks: () => {},
      setClassGoalDraft: () => {},
      setHavenRewardAmount: () => {},
      setHavenRewardReasonId: () => {},
      setIsWordSoundsMode: () => {},
      setLivePollPreset: () => {},
      setLiveSessionQaEnabled: () => {},
      setOpenChecklistGoalId: () => {},
      setPictionaryInitialMode: () => {},
      setPictionaryPreparedInteraction: () => {},
      setRosterKey: () => {},
      setShowHavenRewardAudit: () => {},
      setShowLiveDock: () => {},
      setShowLivePollingPanel: () => {},
      setShowPictionaryHost: () => {},
      setShowSessionModal: () => {},
      setWordSoundsAutoReview: () => {},
      showHavenRewardAudit: false,
      signalMeta: () => ({ emoji: '✋', label: 'Help' }),
      studyTimeLeft: 0,
      t: () => '',
      toggleSessionMode: () => {},
      units: [],
      updateLivePresenterCue: () => {},
    }));

    expect(host.querySelector('[data-live-dock-roster-controls]')).toBeTruthy();
    const attentionBtn = host.querySelector('[data-live-dock-roster-filter="attention"]');
    expect(attentionBtn).toBeTruthy();
    expect(attentionBtn.textContent).toContain('2');

    // Filter to "Needs attention" -> only Cobalt Owl (disconnected) and Emerald Elk (failed/off-target) remain
    act(() => attentionBtn.click());
    expect(attentionBtn.getAttribute('aria-pressed')).toBe('true');
    expect(host.textContent).toContain('Cobalt Owl');
    expect(host.textContent).toContain('Emerald Elk');
    expect(host.textContent).not.toContain('Azure Fox');
    expect(host.textContent).not.toContain('Golden Jay');

    // Search for "Azure" while attention filter is active -> empty state recovery restores all
    const search = host.querySelector('[data-live-dock-roster-search]');
    setInputValue(search, 'Azure');
    expect(host.textContent).toContain('No students match this filter');
    const showAllBtn = Array.from(host.querySelectorAll('button')).find(b => b.textContent.includes('Show all students'));
    act(() => showAllBtn.click());
    expect(host.textContent).toContain('Azure Fox');
    expect(host.textContent).toContain('Golden Jay');
  });

  it('SessionModal confirms inline Copy feedback on code/join/host buttons and shows live joined pill in Projection Mode', async () => {
    const SessionModal = window.AlloModules.SessionModal.SessionModal;
    const copyToClipboard = vi.fn();

    mount(React.createElement(SessionModal, {
      activeSessionAppId: 'custom-host-1',
      activeSessionCode: 'ZX92K',
      addToast: () => {},
      appId: 'default-app',
      copyToClipboard,
      connectedStudentCount: 14,
      handleSetShowGroupModalToTrue: () => {},
      handleSetShowSessionModalToFalse: () => {},
      mailboxJoinUrl: 'https://example.org/join?code=ZX92K',
      isMailboxSession: false,
      sessionData: { mode: 'sync', joinUrls: ['http://192.168.1.10:3000/join'] },
      setActiveSessionCode: () => {},
      setConfirmDialog: () => {},
      setSessionData: () => {},
      setShowSessionModal: () => {},
      t: (k) => k,
      toggleSessionMode: () => {},
    }));
    await act(async () => { await Promise.resolve(); });

    // Inline copy feedback on code button
    const codeBtn = host.querySelector('[data-session-copy="code"]');
    act(() => codeBtn.click());
    expect(copyToClipboard).toHaveBeenCalledWith('ZX92K');
    expect(codeBtn.textContent).toContain('Copied');

    // Inline copy feedback on join link button
    const joinBtn = host.querySelector('[data-session-copy="join"]');
    act(() => joinBtn.click());
    expect(copyToClipboard).toHaveBeenCalledWith('https://example.org/join?code=ZX92K');
    expect(joinBtn.textContent).toContain('Student join link copied');

    // Inline copy feedback on Host ID button (retaining activeSessionAppId)
    const hostBtn = host.querySelector('[data-session-copy="host"]');
    act(() => hostBtn.click());
    expect(copyToClipboard).toHaveBeenCalledWith('custom-host-1');
    expect(hostBtn.textContent).toContain('custom-host-1');
    expect(hostBtn.textContent).toContain('Copied');

    // Projection Mode surfaces live joined student count pill
    expect(host.querySelector('[data-session-projection-count]')).toBeNull();
    const projBtn = host.querySelector('button[aria-label="Open projection mode"]');
    expect(projBtn).toBeTruthy();
    act(() => projBtn.click());
    const joinedPill = host.querySelector('[data-session-projection-count]');
    expect(joinedPill).toBeTruthy();
    expect(joinedPill.textContent).toContain('14 students joined');
  });

  it('StudentSaveAdventurePanel explains disabled Save state and shows remaining XP + percentage toward Adventure unlock', () => {
    const StudentSaveAdventurePanel = window.AlloModules.StudentSaveAdventurePanel.StudentSaveAdventurePanel;

    const baseProps = {
      activeSessionCode: null,
      globalPoints: 40,
      hasSaveableWork: false,
      handleResumeAdventure: () => {},
      handleSetShowSubmitModalToTrue: () => {},
      handleStartAdventure: () => {},
      hasSavedAdventure: false,
      initiateSaveStudentProject: () => {},
      isResumingAdventure: false,
      isSaveActionPulsing: false,
      projectFileInputRef: { current: null },
      sessionData: null,
      studentProjectSettings: { adventureUnlockXP: 100 },
      t: (k) => k,
    };

    mount(React.createElement(StudentSaveAdventurePanel, baseProps));
    expect(host.querySelector('[data-student-save-empty-hint]')).toBeTruthy();
    const remaining = host.querySelector('[data-student-adventure-remaining]');
    expect(remaining).toBeTruthy();
    expect(remaining.textContent).toContain('60 XP to go');
    expect(remaining.textContent).toContain('40%');

    // Once work exists, disabled-save explanation disappears
    act(() => root.render(React.createElement(StudentSaveAdventurePanel, { ...baseProps, hasSaveableWork: true })));
    expect(host.querySelector('[data-student-save-empty-hint]')).toBeNull();
  });

  it('TeacherHistoryTab shows group count, active applied group profile summary, and IME-safe Escape on Quick Add form', () => {
    const TeacherHistoryTab = window.AlloModules.TeacherHistoryTab.TeacherHistoryTab;
    const handleApplyRosterGroup = vi.fn();

    mount(React.createElement(TeacherHistoryTab, {
      handleApplyRosterGroup,
      hasSourceOrAnalysis: true,
      rosterKey: {
        classId: 'class-1',
        groups: {
          g1: { name: 'Blue Jays', color: '#2563eb', profile: { gradeLevel: '4th Grade', leveledTextLanguage: 'Spanish' } },
          g2: { name: 'Red Hawks', color: '#dc2626', profile: { gradeLevel: '6th Grade', leveledTextLanguage: 'English' } },
        },
      },
      setIsRosterKeyOpen: () => {},
      onDifferentiateByGroup: () => {},
      onQuickAddGroup: vi.fn(),
      defaultGrade: '5th Grade',
      defaultLanguage: 'English',
      gradeOptions: ['4th Grade', '5th Grade', '6th Grade'],
      languageOptions: ['English', 'Spanish'],
      t: () => '',
    }));

    expect(host.querySelector('[data-roster-group-count]').textContent.trim()).toBe('2');
    expect(host.querySelector('[data-roster-applied-status]')).toBeNull();

    const g1Btn = host.querySelector('[data-roster-group-pill="g1"]');
    act(() => g1Btn.click());
    expect(handleApplyRosterGroup).toHaveBeenCalledWith('g1');
    expect(g1Btn.getAttribute('aria-pressed')).toBe('true');

    const status = host.querySelector('[data-roster-applied-status]');
    expect(status).toBeTruthy();
    expect(status.textContent).toContain('Blue Jays');
    expect(status.textContent).toContain('4th Grade');
    expect(status.textContent).toContain('Spanish');

    // Open Quick Add form -> IME Escape ignored, normal Escape closes form cleanly
    const addBtn = Array.from(host.querySelectorAll('button')).find(b => b.textContent.includes('Add group'));
    act(() => addBtn.click());
    const form = host.querySelector('#roster-quick-group-form');
    expect(form).toBeTruthy();

    act(() => form.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', keyCode: 229, bubbles: true })));
    expect(host.querySelector('#roster-quick-group-form')).toBeTruthy();

    act(() => form.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(host.querySelector('#roster-quick-group-form')).toBeNull();
  });
});
