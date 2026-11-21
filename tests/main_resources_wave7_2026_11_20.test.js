// Wave 7 regression suite (2026-11-20): AI-Off Parity & Teacher Manual Authoring Completeness
// across SidebarPanels, MiscPanels, SubmissionInbox, HostHandlers, ViewRenderers, Quiz, Brainstorm, Timeline, and AnchorCharts.
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modulesDir = path.resolve(ROOT, 'desktop/web-app/node_modules');

let React;
let ReactDOMClient;
let act;

beforeAll(() => {
  React = require(path.join(modulesDir, 'react'));
  ReactDOMClient = require(path.join(modulesDir, 'react-dom/client'));
  ({ act } = require(path.join(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Wave 7 — AI-Off Parity & Teacher Manual Authoring Completeness', () => {
  describe('1. HostHandlers Manual Authoring Mutations', () => {
    it('supports add-branch, remove-branch, add-item, and remove-item in handleOutlineChange', () => {
      loadAlloModule('host_handlers_module.js');
      let current = {
        id: 'out-1',
        type: 'outline',
        data: { main: 'Energy', branches: [{ title: 'Kinetic', items: ['Motion'], items_en: ['Motion'] }] },
      };
      let history = [current];
      const handlers = window.AlloModules.HostHandlers({
        get generatedContent() { return current; },
        setGeneratedContent: (next) => { current = next; },
        setHistory: (fn) => { history = fn(history); },
        addToast: vi.fn(),
      });

      handlers.handleOutlineChange(null, 'add-branch', 'Potential');
      expect(current.data.branches).toHaveLength(2);
      expect(current.data.branches[1].title).toBe('Potential');

      handlers.handleOutlineChange(0, 'add-item', 'Heat');
      expect(current.data.branches[0].items).toEqual(['Motion', 'Heat']);
      expect(current.data.branches[0].items_en).toEqual(['Motion', '']);

      handlers.handleOutlineChange(0, 'remove-item', null, 0);
      expect(current.data.branches[0].items).toEqual(['Heat']);
      expect(current.data.branches[0].items_en).toEqual(['']);

      handlers.handleOutlineChange(1, 'remove-branch');
      expect(current.data.branches).toHaveLength(1);
      // Refuses to delete the final remaining branch
      handlers.handleOutlineChange(0, 'remove-branch');
      expect(current.data.branches).toHaveLength(1);
      expect(history[0]).toBe(current);
    });

    it('supports progressionLabel edits in handleTimelineChange', () => {
      loadAlloModule('host_handlers_module.js');
      let current = {
        id: 'tl-1',
        type: 'timeline',
        data: { progressionLabel: 'Old Axis', items: [{ date: 'Step 1', event: 'Start' }] },
      };
      let history = [current];
      const handlers = window.AlloModules.HostHandlers({
        get generatedContent() { return current; },
        setGeneratedContent: (next) => { current = next; },
        setHistory: (fn) => { history = fn(history); },
      });

      handlers.handleTimelineChange(null, 'progressionLabel', 'Chronological Order');
      expect(current.data.progressionLabel).toBe('Chronological Order');
      expect(history[0].data.progressionLabel).toBe('Chronological Order');
    });

    it('supports add-card, remove-card, and rubric updates in handleBrainstormChange', () => {
      loadAlloModule('host_handlers_module.js');
      let current = {
        id: 'bs-1',
        type: 'brainstorm',
        data: [{ kind: 'idea', title: 'Gallery Walk', description: 'Post posters', connection: 'Visual' }],
      };
      let history = [current];
      const handlers = window.AlloModules.HostHandlers({
        get generatedContent() { return current; },
        setGeneratedContent: (next) => { current = next; },
        setHistory: (fn) => { history = fn(history); },
        _alloActivityDispatcher: () => null,
      });

      handlers.handleBrainstormChange(null, 'add-card');
      expect(current.data).toHaveLength(2);
      expect(current.data[1].title).toBe('New Activity');

      const customRubric = { title: 'Custom Rubric', criteria: [{ criterion: 'Evidence', weight: 100, levels: { '4': 'All', '3': 'Most', '2': 'Some', '1': 'Few' } }] };
      handlers.handleBrainstormChange(0, 'rubric', customRubric);
      expect(current.data[0].rubric.title).toBe('Custom Rubric');

      handlers.handleBrainstormChange(1, 'remove-card');
      expect(current.data).toHaveLength(1);
      // Refuses to remove the final remaining card
      handlers.handleBrainstormChange(0, 'remove-card');
      expect(current.data).toHaveLength(1);
    });
  });

  describe('2. AI-Off Parity across Sidebar, SourceGenPanel, SubmissionInbox, Renderers & Quiz', () => {
    it('gates all remaining AI controls and fixes Standards aria-label in SidebarPanels and MiscPanels', () => {
      const sbSrc = fs.readFileSync(path.join(ROOT, 'view_sidebar_panels_source.jsx'), 'utf8');
      expect(sbSrc).toContain("aria-label={t('common.find_relevant_standards') || 'Find relevant standards'}");
      expect(sbSrc).toContain('disabled={!aiStandardQuery.trim() || isFindingStandards || !aiTextAvailable}');
      expect(sbSrc).toContain('disabled={!urlSearchQuery.trim() || isExtracting || !aiTextAvailable}');
      expect(sbSrc).toContain('disabled={!hasSourceOrAnalysis || isProcessing || !aiTextAvailable}');
      expect(sbSrc).toContain('disabled={!hasSourceOrAnalysis || isGeneratingPersona || isProcessing || !aiTextAvailable}');
      expect(sbSrc).toContain('disabled={isProcessing || !aiTextAvailable}');

      const mpSrc = fs.readFileSync(path.join(ROOT, 'view_misc_panels_source.jsx'), 'utf8');
      expect(mpSrc).toContain("aria-label={t('standards.search_button_title') || 'Find relevant standards'}");
      expect(mpSrc).toContain('disabled={!aiStandardQuery.trim() || isFindingStandards || !aiTextAvailable}');
      expect(mpSrc).toContain('disabled={!aiTextAvailable || (reviewBeforeWriting ? ownSourceControlsBusy || !sourceTopic.trim() : !canGenerateSource)}');
    });

    it('gates SubmissionInbox AI grading and localization when text AI is off', () => {
      const siSrc = fs.readFileSync(path.join(ROOT, 'view_submission_inbox_source.jsx'), 'utf8');
      expect(siSrc).toContain("window.__alloAiAvailable('text') !== false");
      expect(siSrc).toContain("if (uiLang === 'English' || !aiTextAvailable) return undefined;");
      expect(siSrc).toContain('disabled: !bulkGrading && (!aiTextAvailable ||');
      expect(siSrc).toContain('disabled: gradingRow === idx || !aiTextAvailable');
      expect(siSrc).toContain("(totalFail > 0 && totalOk === 0) ? 'error'");
    });

    it('gates Generate Outcome and Frayer Model visual buttons in ViewRenderers when AI is off', () => {
      const rSrc = fs.readFileSync(path.join(ROOT, 'view_renderers_source.jsx'), 'utf8');
      expect(rSrc).toContain('disabled={isProcessing || outcomeAiOff}');
      expect(rSrc).toContain('disabled={isProcessing || frayerImageAiOff}');
    });
  });

  describe('3. Teacher Manual Authoring Controls across Organizers, Quiz, Brainstorm, Timeline & Anchor Charts', () => {
    it('wires organizer add/remove branch and item buttons in ViewRenderers', () => {
      const rSrc = fs.readFileSync(path.join(ROOT, 'view_renderers_source.jsx'), 'utf8');
      expect(rSrc).toContain('data-outline-add-branch="true"');
      expect(rSrc).toContain('data-outline-remove-branch={bIdx}');
      expect(rSrc).toContain('data-outline-add-item={bIdx}');
      expect(rSrc).toContain('data-outline-remove-item={`${bIdx}-${iIdx}`}');
    });

    it('wires MCQ add/remove choices, explanation editor, and AI-off Check my answer label in ViewQuiz', () => {
      const qSrc = fs.readFileSync(path.join(ROOT, 'view_quiz_source.jsx'), 'utf8');
      expect(qSrc).toContain('data-quiz-add-mcq-option={i}');
      expect(qSrc).toContain('data-quiz-remove-mcq-option={`${i}-${optIdx}`}');
      expect(qSrc).toContain('data-quiz-explanation-input');
      expect(qSrc).toContain("(!_quizAiOn(p.callGemini, 'text') ? _quizGradedCopy('quiz.student.check_my_answer', 'Check my answer')");
    });

    it('renders editable Rubric, blank rubric starter, and add/remove activity card controls in BrainstormView', async () => {
      loadAlloModule('view_brainstorm_module.js');
      const BrainstormView = window.AlloModules.BrainstormView.BrainstormView || window.AlloModules.BrainstormView;
      const onChange = vi.fn();
      const host = document.createElement('div');
      document.body.appendChild(host);
      const root = ReactDOMClient.createRoot(host);

      try {
        await act(async () => {
          root.render(React.createElement(BrainstormView, {
            t: (k) => k,
            isTeacherMode: true,
            isEditingBrainstorm: true,
            generatedContent: {
              id: 'bs-9',
              type: 'brainstorm',
              data: [
                {
                  kind: 'idea',
                  title: 'Lab Station',
                  description: 'Explore circuits',
                  connection: 'Hands-on',
                  rubric: { title: 'Lab Rubric', criteria: [{ criterion: 'Accuracy', weight: 50, levels: { '4': 'A', '3': 'B', '2': 'C', '1': 'D' } }] },
                },
                { kind: 'idea', title: 'Debate', description: 'Compare views', connection: 'Discussion' },
              ],
            },
            handleBrainstormChange: onChange,
            handleToggleIsEditingBrainstorm: vi.fn(),
            handleGenerateGuide: vi.fn(),
            handleGenerateBrainstormRubric: vi.fn(),
            handleGenerateWorksheet: vi.fn(),
            handleGenerateWorksheetCover: vi.fn(),
            isGeneratingGuide: {},
            isGeneratingBrainstormRubric: {},
            isGeneratingWorksheet: {},
            isGeneratingWorksheetCover: {},
            getRows: () => 2,
            renderFormattedText: (s) => s,
          }));
        });

        const rubricTitleInput = host.querySelector('[data-brainstorm-rubric-title="0"]');
        expect(rubricTitleInput).toBeTruthy();
        expect(rubricTitleInput.value).toBe('Lab Rubric');

        const blankRubricBtn = host.querySelector('[data-brainstorm-blank-rubric="1"]');
        expect(blankRubricBtn).toBeTruthy();
        await act(async () => { blankRubricBtn.click(); });
        expect(onChange).toHaveBeenCalledWith(1, 'rubric', expect.objectContaining({ criteria: expect.any(Array) }));

        const addCardBtn = host.querySelector('[data-brainstorm-add-card="true"]');
        expect(addCardBtn).toBeTruthy();
        await act(async () => { addCardBtn.click(); });
        expect(onChange).toHaveBeenCalledWith(null, 'add-card');

        const removeCardBtn = host.querySelector('[data-brainstorm-remove-card="1"]');
        expect(removeCardBtn).toBeTruthy();
        await act(async () => { removeCardBtn.click(); });
        expect(onChange).toHaveBeenCalledWith(1, 'remove-card');
      } finally {
        await act(async () => { root.unmount(); });
      }
    });

    it('wires progressionLabel editor and local image upload/clear in Timeline, and icon alt/upload/remove in AnchorCharts', () => {
      const tlSrc = fs.readFileSync(path.join(ROOT, 'view_timeline_source.jsx'), 'utf8');
      expect(tlSrc).toContain('data-timeline-progression-input');
      expect(tlSrc).toContain('data-timeline-upload-image={idx}');
      expect(tlSrc).toContain('data-timeline-remove-image={idx}');

      const acSrc = fs.readFileSync(path.join(ROOT, 'anchor_charts_source.jsx'), 'utf8');
      expect(acSrc).toContain('data-ac-icon-alt={sectionIndex}');
      expect(acSrc).toContain('data-ac-upload-icon={sectionIndex}');
      expect(acSrc).toContain('data-ac-remove-icon={sectionIndex}');
    });
  });
});
