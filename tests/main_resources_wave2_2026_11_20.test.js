import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const ReactDOMClient = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = require('../desktop/web-app/node_modules/react-dom/test-utils');

const readMod = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf8');

describe('AlloFlow Main Resources Wave 2 — AI Grounding, Keyless Parity & Authoring (2026-11-20)', () => {
  beforeAll(() => {
    window.React = globalThis.React = React;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    window.AlloLanguageContext = window.AlloLanguageContext || React.createContext({ t: (k) => k });
  });

  it('DBQ grounds Vocab, Reliability, Doc Analysis, and Corroboration in full excerpts and fixes Evidence Tracker regex', () => {
    const mod = readMod('view_dbq_module.js');
    // Prompt excerpt raised to 6000 chars across DBQ helpers
    expect(mod).toContain('promptDocExcerpt: 6000');
    // Corroboration now uses dbqEssayGrounding(docs, null) to pass actual document excerpts
    expect(mod).toContain('const corrobGrounding = dbqEssayGrounding(docs, null)');
    expect(mod).toContain("dbqUntrustedBlock('DOCUMENT_EXCERPTS', corrobSourcesJson");
    // Reliability prompt frames around "reliable for which question or claim?"
    expect(mod).toContain('reliable for which question or claim?');
    // Evidence Tracker word-boundary regex matches "Doc. A" and does not false-match "doc analysis"
    const fnMatch = mod.match(/function dbqEssayMentionsDoc\(essayText, docId\)[\s\S]*?\n\}/);
    expect(fnMatch).not.toBeNull();
    const dbqEssayMentionsDoc = new Function(`${fnMatch[0]}; return dbqEssayMentionsDoc;`)();
    expect(dbqEssayMentionsDoc('As shown in Document A, trade grew.', 'A')).toBe(true);
    expect(dbqEssayMentionsDoc('According to Doc. A, trade grew.', 'A')).toBe(true);
    expect(dbqEssayMentionsDoc('My doc analysis explains the event.', 'A')).toBe(false);
    expect(dbqEssayMentionsDoc('Document AB discusses factories.', 'A')).toBe(false);
  });

  it('Memory Aid feedback prompt expands source budget to 50,000 chars with explicit truncation disclosure', () => {
    loadAlloModule('memory_aid_module.js');
    const buildPrompt = window.AlloModules.MemoryAid?._testing?.buildMemoryAidFeedbackPrompt;
    expect(typeof buildPrompt).toBe('function');

    const longSource = 'A'.repeat(4000) + ' UNIQUE_FACT_PAST_3000 ' + 'B'.repeat(48000);
    const prompt = buildPrompt(
      { target: 'Mitosis', essentialFacts: ['Cells divide'], studentDraft: 'PMAT', studentReasoning: 'Order of phases' },
      { sourceExcerpt: longSource, gradeLevel: '7th Grade' }
    );
    expect(prompt).toContain('UNIQUE_FACT_PAST_3000');
    expect(prompt).toContain('Only the first 50000 of');
    expect(prompt).toContain('[...]');
  });

  it('Applied Challenge Hint/Stress-Test and Feedback prompts expand source coverage and include coverage disclosure', () => {
    loadAlloModule('applied_challenge_module.js');
    const T = window.AlloModules.AppliedChallenge?._testing;
    expect(typeof T?.appliedChallengePromptContextSnapshot).toBe('function');

    const longSource = 'X'.repeat(2500) + ' DETAIL_PAST_1400 ' + 'Y'.repeat(19000);
    const snap = JSON.parse(T.appliedChallengePromptContextSnapshot(
      { title: 'Water Plan', family: 'design', brief: { lockedLessonFacts: ['Watersheds filter runoff'] } },
      { sourceExcerpt: longSource }
    ));
    expect(snap.lessonSourceExcerpt).toContain('DETAIL_PAST_1400');
    expect(snap.lessonSourceCoverage).toContain('First 20000 of');
  });

  it('Writing Supports handleMasteryGrading fences untrusted inputs and raises relevance-gate limit', async () => {
    loadAlloModule('phase_n_misc_helpers_module.js');
    const PhaseN = window.AlloModules.PhaseNHelpers;
    const prompts = [];
    const callGemini = vi.fn(async (p) => {
      prompts.push(p);
      if (prompts.length === 1) return JSON.stringify({ isRelevant: true });
      return JSON.stringify({
        rawScore: 80,
        breakdown: [{ criterion: 'Evidence', score: 8, max: 10, reason: 'Solid quote' }],
        feedback: { strength: 'Good point', improvement: 'Add detail' },
      });
    });

    const longDraft = 'W'.repeat(2500) + ' EVIDENCE_PAST_2000';
    await PhaseN.handleMasteryGrading(
      longDraft,
      'Use text evidence',
      'Ecosystems',
      { draftCount: 1, previousDraft: '' },
      {
        validateDraftQuality: () => ({ isValid: true }),
        RELEVANCE_GATE_PROMPT: 'Check relevance.',
        callGemini,
        cleanJson: (s) => s,
        warnLog: vi.fn(),
        t: (k) => k,
      }
    );

    expect(prompts.length).toBe(2);
    expect(prompts[0]).toContain('<UNTRUSTED_STUDENT_SUBMISSION>');
    expect(prompts[0]).toContain('EVIDENCE_PAST_2000');
    expect(prompts[1]).toContain('<UNTRUSTED_RUBRIC>');
    expect(prompts[1]).toContain('<UNTRUSTED_STUDENT_SUBMISSION>');
    expect(prompts[1]).toContain('scaffolded sentence starters or paragraph frames');
  });

  it('Writing Supports student view provides "Copy my draft" even when student AI is disabled', () => {
    loadAlloModule('view_sentence_frames_module.js');
    const SentenceFramesView = window.AlloModules.SentenceFramesView;
    const prevDisabled = window.__alloStudentAiDisabled;
    window.__alloStudentAiDisabled = true;

    const copied = [];
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    try {
      act(() => {
        root.render(React.createElement(SentenceFramesView, {
          generatedContent: {
            id: 'sf-1',
            type: 'sentence-frames',
            data: { mode: 'list', items: [{ text: 'The author argues that', isSelected: true }] },
          },
          isTeacherMode: false,
          isEditingScaffolds: false,
          studentResponses: { 'sf-1': { 0: 'wetlands prevent flooding.' } },
          copyToClipboard: (text) => copied.push(text),
          handleResetScaffolds: vi.fn(),
          handleStudentInput: vi.fn(),
          getRows: () => 2,
          renderFormattedText: (s) => s,
          t: (k) => k,
        }));
      });

      // AI feedback button hidden when AI is off, but Copy my draft is enabled and works
      expect(host.querySelector('[data-help-key="scaffolds_grading"]')).toBeNull();
      const copyBtn = host.querySelector('[data-scaffolds-copy-draft]');
      expect(copyBtn).not.toBeNull();
      expect(copyBtn.disabled).toBe(false);

      act(() => { copyBtn.click(); });
      expect(copied).toEqual(['The author argues that wetlands prevent flooding.']);
    } finally {
      window.__alloStudentAiDisabled = prevDisabled;
      act(() => { root.unmount(); });
      host.remove();
    }
  });

  it('Glossary collapses unmatched dictionary fallback senses by default and gates Add Term on AI doorway', () => {
    const mod = readMod('view_glossary_module.js');
    expect(mod).toContain('open: senseMatched || !verifiedDef');
    expect(mod).toContain('disabled: !newGlossaryTerm.trim() || isAddingTerm || !!glossaryTextDoor?.disabled');
    expect(mod).toContain('hover:bg-yellow-300');
  });

  it('Note-Taking explains disabled AI feedback button in Teacher Mode', () => {
    const mod = readMod('note_taking_templates_module.js');
    expect(mod).toContain('data-notes-feedback-disabled-note');
    expect(mod).toContain('Student View only');
  });

  it('Adapted Text persists dismissing levelCheck/alignmentCheck to history and gates Apply & Regenerate on AI doorway', () => {
    const mod = readMod('view_simplified_module.js');
    expect(mod).toContain('delete updated.levelCheck');
    expect(mod).toContain('delete updated.alignmentCheck');
    expect(mod).toContain('rigorAiDoor?.disabled');
    const analysisMod = readMod('view_analysis_module.js');
    expect(analysisMod).not.toContain('spellCheck: "false"');
  });

  it('Concept Sort uses static Tailwind tone classes, Math auto-reveals key in edit mode, Venn exposes all items in edit mode, and Adventure preserves draft on hint starter', () => {
    const csMod = readMod('view_concept_sort_module.js');
    expect(csMod).toContain('_csToneMap');
    expect(csMod).not.toContain("cat.color.replace('bg-'");

    const mathMod = readMod('view_math_module.js');
    expect(mathMod).toContain('showMathAnswers || isMathEditing(pIdx, problem.__viewKey, mathResourceId)');

    const vrMod = readMod('view_renderers_module.js');
    expect(vrMod).toContain('isEditingOutline ? items : items.slice(0, 5)');

    const advMod = readMod('view_adventure_module.js');
    expect(advMod).toContain('renderDemocracyStatus(theme !== \'light\')');
    expect(advMod).toContain('renderStrategyHintCard(theme !== \'light\')');
    expect(advMod).toContain('whitespace-pre-line');
  });
});
