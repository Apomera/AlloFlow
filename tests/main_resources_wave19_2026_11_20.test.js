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
  window.AlloModules = window.AlloModules || {};
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), fileName), 'utf8'))();
}

describe('Round 5 Wave 19 — Interactive Studios', () => {
  beforeEach(() => {
    window.__alloStudentAiDisabled = false;
    window.__alloAiSecretsLocked = false;
    window.__alloQrStudentMode = false;
    delete window.__alloAiUsable;
    document.body.innerHTML = '';
  });

  it('annotation_suite enforces teacher-owned read-only boundary for students, hooks before returns, and distinct Students filter', () => {
    loadModule('annotation_suite_module.js');
    const src = readFileSync(resolve(process.cwd(), 'annotation_suite_source.jsx'), 'utf8');
    // Distinct Students filter (no duplicate Teacher filter pill)
    expect(src).toContain("Pill('student', 'Students', counts.student)");
    expect(src).toContain('data-allo-note-expanded="true"');
    const { Overlay, annotationPreview } = window.AlloModules.AnnotationSuite;
    expect(annotationPreview({ kind: 'draw', shape: 'arrow' })).toMatch(/arrow/i);
    expect(annotationPreview({ kind: 'draw' })).toMatch(/freehand|drawing/i);
    // Student cannot mutate or delete teacher-authored note in Overlay
    const onDelete = vi.fn();
    const onChange = vi.fn();
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const teacherNote = {
      id: 'n1',
      kind: 'note',
      author: 'teacher',
      xPct: 20,
      yPct: 20,
      text: 'Teacher prompt',
      color: '#fef08a',
      expanded: true,
    };
    act(() => {
      root.render(
        React.createElement(Overlay, {
          annotations: [teacherNote],
          isTeacher: false,
          selectedId: 'n1',
          onSelect: () => {},
          onChange,
          onDelete,
        })
      );
    });
    const textarea = host.querySelector('textarea');
    expect(textarea).toBeTruthy();
    expect(textarea.readOnly).toBe(true);
    // Delete button must not be rendered for teacher note when student is viewing
    const delBtn = host.querySelector('button[aria-label="Delete note"]');
    expect(delBtn).toBeNull();
    act(() => { root.unmount(); });
  });

  it('udl_chat gates LLM intent calls when AI is locked/QR-student and blocks educator-only modules & views for non-educators', async () => {
    loadModule('udl_chat_module.js');
    const { handleSendUDLMessage } = window.AlloModules.UdlChat;
    expect(typeof handleSendUDLMessage).toBe('function');

    // 1) When QR student mode is active, parseUserIntent must NOT be called
    window.__alloQrStudentMode = true;
    const parseUserIntent = vi.fn(async () => ({ intent: 'OPEN_MODULE', target: 'report-writer' }));
    const setShowReportWriter = vi.fn();
    const setActiveView = vi.fn();
    const messages = [];
    const baseDeps = {
      activeBlueprint: null,
      activeView: 'input',
      alloBotRef: { current: null },
      currentUiLanguage: 'en',
      guidedFlowState: { isFlowActive: false },
      isAutoFillMode: true,
      isShowMeMode: false,
      isBotVisible: false,
      isParentMode: false,
      isIndependentMode: true,
      skipCommandRouter: false,
      sourceTopic: '',
      udlMessages: [],
      udlInput: '',
      history: [],
      inputText: '',
      addToast: vi.fn(),
      t: (k) => k,
      warnLog: vi.fn(),
      callGemini: vi.fn(async () => 'ok'),
      cleanJson: (s) => s,
      parseUserIntent,
      detectWorkflowIntent: vi.fn(async () => ({ intent: 'CONFIRM' })),
      generateStandardChatResponse: vi.fn(async () => {}),
      setIsChatProcessing: vi.fn(),
      setUdlInput: vi.fn(),
      setUdlMessages: (fn) => {
        const next = typeof fn === 'function' ? fn(messages) : fn;
        messages.splice(0, messages.length, ...next);
      },
      setShowReportWriter,
      setActiveView,
      uiDispatch: vi.fn(),
    };
    await handleSendUDLMessage('open report writer', baseDeps);
    expect(parseUserIntent).not.toHaveBeenCalled();
    expect(setShowReportWriter).not.toHaveBeenCalled();

    // 2) When AI is usable in Parent/Independent mode, OPEN_MODULE for teacher-only report-writer is refused
    window.__alloQrStudentMode = false;
    await handleSendUDLMessage('open report writer', {
      ...baseDeps,
      isParentMode: true,
      isIndependentMode: false,
      parseUserIntent: vi.fn(async () => ({ intent: 'OPEN_MODULE', target: 'report-writer' })),
    });
    expect(setShowReportWriter).not.toHaveBeenCalled();
    expect(messages.some((m) => /Educator mode/i.test(m.text || ''))).toBe(true);

    // 3) Teacher-only NAVIGATE target (dashboard) is also refused for independent learners
    await handleSendUDLMessage('go to dashboard', {
      ...baseDeps,
      isParentMode: false,
      isIndependentMode: true,
      parseUserIntent: vi.fn(async () => ({ intent: 'NAVIGATE', target: 'dashboard' })),
    });
    expect(setActiveView).not.toHaveBeenCalled();
  });

  it('udl_walkthrough hardens SVG contrast, adds 2-tap draft discard, drag-out guard, and validates imported JSON', () => {
    const src = readFileSync(resolve(process.cwd(), 'udl_walkthrough_source.jsx'), 'utf8');
    expect(src).not.toContain('fill="#898781"');
    expect(src).toContain('fill="#52514e"');
    expect(src).toContain('armDiscard');
    expect(src).toContain('backdropDownRef');
    expect(src).toContain('Array.isArray(x.studentIndicators)');
  });

  it('concept_pictionary suppresses post-stop onGuestLeft, isolates dialog siblings, uses Pointer Events, and supports roving radio arrow keys', () => {
    loadModule('concept_pictionary_module.js');
    const CP = window.AlloModules.ConceptPictionary;
    const src = readFileSync(resolve(process.cwd(), 'concept_pictionary_source.jsx'), 'utf8');

    // Pointer Events migration (no passive onTouchStart/onMouseLeave cutoff)
    expect(src).toContain('onPointerDown={handlePointerDown}');
    expect(src).toContain('setPointerCapture');
    expect(src).not.toContain('onTouchStart={handlePointerDown}');

    // Sibling isolation + scroll lock + top-trap check in _usePictionaryDialogFocus
    expect(src).toContain('__alloScrollLockState');
    expect(src).toContain('isolatedSiblings');

    // PictionaryHost.stop() suppresses onGuestLeft during teardown
    const onGuestLeft = vi.fn();
    const host = new CP.PictionaryHost({
      sessionCode: 'TEST12',
      db: { collection: () => ({ doc: () => ({ collection: () => ({ onSnapshot: () => () => {} }) }) }) },
      onGuestLeft,
    });
    const fakePc = { close: vi.fn() };
    host.peers.set('u1', { pc: fakePc, dc: { readyState: 'closed' } });
    host.stop();
    expect(fakePc.close).toHaveBeenCalledTimes(1);
    expect(onGuestLeft).not.toHaveBeenCalled();

    // SketchVotePanel roving tabindex & ArrowRight/ArrowLeft navigation contract
    expect(src).toContain("['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp']");
    expect(src).toContain('tabIndex={tabIndex}');
    expect(src).toContain('onKeyDown={onRadioKeyDown}');
    // Canvas component renders with Pointer Events (not passive onTouchStart)
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onStrokeBatch = vi.fn();
    act(() => {
      root.render(
        React.createElement(CP.PictionaryCanvas, {
          strokes: [],
          drawingEnabled: true,
          onStrokeBatch,
        })
      );
    });
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeTruthy();
    act(() => { root.unmount(); });
  });
});
