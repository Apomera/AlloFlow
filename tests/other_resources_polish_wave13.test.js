import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import axe from 'axe-core';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React;
let ReactDOMClient;
let act;
let HintsModal;
let PersonaWorkspaceView;
let ConceptQuestTeacherControls;
let LiveAacBoardDialog;

const mounted = [];

function mountEl(element) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  act(() => { root.render(element); });
  mounted.push({ root, host });
  return host;
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

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });

  delete window.AlloModules.HintsModal;
  loadAlloModule('view_hints_modal_module.js');
  HintsModal = window.AlloModules.HintsModal.HintsModal;

  delete window.AlloModules.PersonaWorkspace;
  loadAlloModule('view_persona_workspace_module.js');
  PersonaWorkspaceView = window.AlloModules.PersonaWorkspace.PersonaWorkspaceView;

  delete window.AlloModules.ConceptQuestEngine;
  loadAlloModule('concept_quest_engine.js');
  delete window.AlloModules.ConceptQuestTeacherModule;
  delete window.AlloModules.ConceptQuestTeacherControls;
  loadAlloModule('concept_quest_teacher_module.js');
  ConceptQuestTeacherControls = window.AlloModules.ConceptQuestTeacherControls;

  delete window.AlloModules.LiveAac;
  new Function(readFileSync(resolve(process.cwd(), 'live_aac_module.js'), 'utf8'))();
  LiveAacBoardDialog = window.AlloModules.LiveAac.LiveAacBoardDialog;
});

afterEach(() => {
  while (mounted.length) {
    const { root, host } = mounted.pop();
    act(() => { root.unmount(); });
    host.remove();
  }
  localStorage.clear();
  window.__alloFocusTrapStack = [];
  window.__alloScrollLockState = { count: 0, prev: '' };
  document.body.style.overflow = '';
  vi.restoreAllMocks();
});

describe('Wave 13 polish: Hints Modal, Persona Workspace, Concept Quest Teacher, Live AAC Board', () => {
  it('HintsModal displays idea count on Ideas tab, brainstorm/extension breakdown, message severity chips, and passes axe', async () => {
    const host = mountEl(React.createElement(HintsModal, {
      handleApplyHint: vi.fn(),
      handleGenerateLessonIdeas: vi.fn(),
      handleSaveExtensionToHistory: vi.fn(),
      handleSetShowHintsModalToFalse: vi.fn(),
      hintHistory: [
        { id: 'h1', isExtension: false, tool: 'Brainstorm', text: 'Use a visual model.', timestamp: Date.now() },
        { id: 'h2', isExtension: true, tool: 'Extension', text: 'Compare two habitats.', timestamp: Date.now() },
      ],
      history: [{ id: 'lesson-1' }],
      isGeneratingExtension: false,
      renderFormattedText: (text) => text,
      t: (k) => ({
        'hints.title': 'Teaching hints',
        'hints.tab_ideas': 'Ideas',
        'hints.tab_messages': 'Messages',
        'hints.save_to_history': 'Save to history',
        'hints.apply_brainstorm': 'Apply brainstorm',
        'hints.generate_extensions': 'Generate lesson ideas',
        'common.close': 'Close',
      }[k] || ''),
      toastHistory: [
        { id: 'm1', type: 'error', message: 'Save failed.', timestamp: Date.now() },
        { id: 'm2', type: 'success', message: 'Export ready.', timestamp: Date.now() },
      ],
      onClearToastHistory: vi.fn(),
    }));

    expect(host.textContent).toContain('Ideas (2)');
    expect(host.textContent).toContain('Messages (2)');
    const ideasSummary = host.querySelector('[data-testid="hints-ideas-summary"]');
    expect(ideasSummary).toBeTruthy();
    expect(ideasSummary.textContent).toContain('1 brainstorm hint');
    expect(ideasSummary.textContent).toContain('1 extension idea');
    await runAxe(host);

    // Switch to Messages tab and verify severity breakdown pills
    const msgTabBtn = Array.from(host.querySelectorAll('button')).find((b) => b.textContent.includes('Messages (2)'));
    await act(async () => { msgTabBtn.click(); });
    const msgSummary = host.querySelector('[data-testid="hints-messages-summary"]');
    expect(msgSummary).toBeTruthy();
    expect(msgSummary.textContent).toContain('1 error');
    expect(msgSummary.textContent).toContain('1 success');
    await runAxe(host);
  });

  it('PersonaWorkspaceView shows figure count pill, 2-slot panel readiness pills, editor char counts, and passes axe', async () => {
    const Icon = () => React.createElement('span', { 'aria-hidden': true });
    const ada = { name: 'Ada Lovelace', year: '1843', role: 'Mathematician', context: 'Analytical Engine notes.' };
    const grace = { name: 'Grace Hopper', year: '1952', role: 'Computer scientist', context: 'First compiler pioneer.' };

    const host = mountEl(React.createElement(PersonaWorkspaceView, {
      ErrorBoundary: ({ children }) => children,
      t: (k, params) => ({
        'persona.setup_title': 'Interview Figures',
        'persona.mode_single': 'Single',
        'persona.mode_panel': 'Panel',
        'persona.resume_retention': 'Resume retention',
        'persona.retention_off': 'Off',
        'persona.days': 'days',
        'persona.select': 'Interview',
        'persona.selected': 'Selected',
        'persona.add_to_panel': 'Add to panel',
        'persona.instruction_panel': `Selected ${params?.current ?? 0} of 2 figures`,
        'persona.start_panel': 'Start panel',
        'common.edit': 'Edit',
        'common.close': 'Close',
        'common.cancel': 'Cancel',
        'common.save': 'Save',
      }[k] || k),
      isProcessing: false,
      isGeneratingPersona: false,
      History: Icon,
      Sparkles: Icon,
      MessageCircleQuestion: Icon,
      CheckCircle2: Icon,
      Plus: Icon,
      RefreshCw: Icon,
      Users: Icon,
      personaState: { mode: 'panel', selectedCharacters: [ada, grace] },
      setPersonaState: vi.fn(),
      isTeacherMode: true,
      normalizePersonaResumeDays: () => 14,
      clearPersonaResumeSnapshots: vi.fn(async () => true),
      addToast: vi.fn(),
      generatedContent: { id: 'p1', type: 'persona', data: [ada, grace] },
      extractPersonaGroundingDisclosure: () => ({ links: [], queries: [] }),
      handleTogglePanelSelection: vi.fn(),
      openPersonaTeacherEditor: vi.fn(),
      handleSelectPersona: vi.fn(),
      handleStartPanelChat: vi.fn(),
      personaTeacherEditor: {
        candidateName: 'Ada Lovelace',
        role: 'Mathematician',
        voice: 'Default',
        context: 'Analytical Engine pioneer.',
        guardrails: 'Stay grounded in 1843 history.',
        quests: [{ id: 'q1', text: 'Ask about algorithms', difficulty: 20 }],
      },
      setPersonaTeacherEditor: vi.fn(),
      personaTeacherEditorRef: React.createRef(),
      updatePersonaTeacherEditor: vi.fn(),
      getPersonaVoiceOptions: () => ['Default'],
      savePersonaTeacherEditor: vi.fn(),
    }));

    const rosterBadge = host.querySelector('[data-persona-roster-count]');
    expect(rosterBadge).toBeTruthy();
    expect(rosterBadge.textContent).toContain('2 figures · 2/2');

    const slots = host.querySelector('[data-persona-panel-slots]');
    expect(slots).toBeTruthy();
    expect(slots.textContent).toContain('1. Ada Lovelace');
    expect(slots.textContent).toContain('2. Grace Hopper');
    expect(slots.textContent).toContain('Ready');

    expect(host.querySelector('[data-persona-context-count]').textContent).toBe('26/2000');
    expect(host.querySelector('[data-persona-guardrails-count]').textContent).toBe('30/1500');

    await runAxe(host);
  });

  it('ConceptQuestTeacherControls renders live readiness pill, leading vote badge, enemy HP bar, and passes axe', async () => {
    const engine = window.AlloModules.ConceptQuestEngine;
    const baseQuest = engine.createSession({
      title: 'Photosynthesis Quest',
      questions: [
        { question: 'What gas do plants absorb?', options: ['CO2', 'Oxygen', 'Nitrogen', 'Helium'], correctAnswer: 'CO2', concept: 'Gas Exchange', explanation: 'Plants take in carbon dioxide.' },
        { question: 'What pigment captures light?', options: ['Chlorophyll', 'Keratin', 'Melanin', 'Hemoglobin'], correctAnswer: 'Chlorophyll', concept: 'Light Capture', explanation: 'Chlorophyll absorbs sunlight.' },
      ],
    });
    const exploreQuest = { ...baseQuest, phase: 'explore', turn: 1 };
    const firstNeighbor = engine.getRoom(exploreQuest, exploreQuest.currentRoomId).neighbors[0];
    const exploreSession = {
      roster: { u1: { name: 'Ana' }, u2: { name: 'Bo' } },
      escapeRoomState: {
        isActive: true,
        isPaused: false,
        conceptQuest: exploreQuest,
        teamProgress: {
          All: {
            questVotes: { u1: firstNeighbor, u2: firstNeighbor },
            questVoteTurns: { u1: engine.getTurnKey(exploreQuest), u2: engine.getTurnKey(exploreQuest) },
            questActions: {},
            questRoles: { u1: 'scholar', u2: 'guardian' },
          },
        },
      },
    };

    const host = mountEl(React.createElement(ConceptQuestTeacherControls, {
      sessionData: exploreSession,
      activeSessionCode: 'ABCDE',
      appId: 'test-app',
      addToast: vi.fn(),
      t: () => '',
    }));

    const statusPill = host.querySelector('[data-testid="cq-live-status"]');
    expect(statusPill).toBeTruthy();
    expect(statusPill.textContent).toContain('All 2 ready ✓');
    expect(host.querySelector('[data-testid="cq-leading-vote"]')).toBeTruthy();
    await runAxe(host);

    // Battle phase renders enemy HP bar
    const battleRoom = exploreQuest.rooms.find((r) => r.enemy);
    const battleQuest = { ...exploreQuest, phase: 'battle', currentRoomId: battleRoom.id };
    const battleHost = mountEl(React.createElement(ConceptQuestTeacherControls, {
      sessionData: {
        ...exploreSession,
        escapeRoomState: { ...exploreSession.escapeRoomState, conceptQuest: battleQuest },
      },
      activeSessionCode: 'ABCDE',
      appId: 'test-app',
      addToast: vi.fn(),
      t: () => '',
    }));
    expect(battleHost.querySelector('[data-testid="cq-enemy-hp-bar"]')).toBeTruthy();
    await runAxe(battleHost);
  });

  it('LiveAacBoardDialog shows word-chip sentence strip + count, shortcut badges, scan speed selector, and passes axe', async () => {
    const onSpeak = vi.fn(() => true);
    const payload = {
      payloadId: 'aac-wave13',
      package: {
        board: { title: 'Core Words', locale: 'en-US', direction: 'ltr' },
        pages: [{
          id: 'p1',
          title: 'Main',
          cols: 2,
          cells: [
            { id: 'c1', displayLabel: 'More', vocalLabel: 'More', category: 'other' },
            { id: 'c2', displayLabel: 'Help', vocalLabel: 'Help please', category: 'verb' },
          ],
        }],
      },
    };

    const host = mountEl(React.createElement(LiveAacBoardDialog, {
      payload,
      onDismiss: vi.fn(),
      onSpeak,
      t: (_k, fb) => fb,
    }));

    // Scan speed selector defaults to 1400ms and updates cleanly
    const speedSelect = host.querySelector('[data-testid="live-aac-scan-speed"]');
    expect(speedSelect).toBeTruthy();
    expect(speedSelect.value).toBe('1400');
    act(() => {
      speedSelect.value = '2200';
      speedSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
    });
    expect(speedSelect.value).toBe('2200');

    // Selecting two symbols populates visual word chips & 2 / 24 counter
    const cells = host.querySelectorAll('button[data-aac-cell="true"]');
    expect(cells.length).toBe(2);
    expect(cells[0].textContent).toContain('1');
    await act(async () => { cells[0].click(); });
    await act(async () => { cells[1].click(); });

    const strip = host.querySelector('[aria-label="Sentence strip"]');
    expect(strip.textContent).toContain('More');
    expect(strip.textContent).toContain('Help');
    expect(host.querySelector('[data-testid="live-aac-word-count"]').textContent).toBe('2 / 24');

    await runAxe(host);
  });
});
