import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;

let host, root;

beforeAll(() => {
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloModules = window.AlloModules || {};
  window.AlloIcons = window.AlloIcons || {};
  window.AlloLanguageContext = React.createContext({ t: k => k });
  window.Globe = () => null;
  window.RefreshCw = () => null;
  window.X = () => null;
  window.sanitizeHtml = html => String(html || '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove();
  host = root = null;
  delete window.__alloMuted;
  delete window.__alloAiSecretsLocked;
  delete window.__alloStudentAiDisabled;
});

describe('Wave 14: Visual/Media, Study Notes, Memory Aid, Math, DBQ & Cloze hardening', () => {
  it('view_image_source: gates teacher mutations, sanitizes warnings, and guards stale resource picker writes', () => {
    const src = readFileSync(resolve(process.cwd(), 'view_image_source.jsx'), 'utf8');
    expect(src).toContain('latestResourceIdRef');
    expect(src).toContain('imageViewMountedRef');
    expect(src).toMatch(/onRefinePanel=\{isTeacherMode\s*&&\s*!imageEditDoor\?\.disabled/);
    expect(src).toMatch(/onDeleteFrame=\{isTeacherMode\s*\?/);
    expect(src).toContain('window.sanitizeHtml');
  });

  it('visual_panel_source: protects challenge answer key, blocks SVG upload, and preserves exact 53-button WCAG contract', () => {
    const src = readFileSync(resolve(process.cwd(), 'visual_panel_source.jsx'), 'utf8');
    expect(src).toContain('answerKeyRevealed');
    expect(src).toContain('confirmClearDrawings');
    expect(src).toContain('altBusyMap');
    expect(src).toMatch(/\^image\\\/\(png\|jpeg\|gif\|webp\|avif\)\$/);
    expect(src).toContain('role="radiogroup"');
    const buttonCount = (src.match(/<button\b/g) || []).length;
    const typeButtonCount = (src.match(/<button\b[^>]*type="button"/g) || []).length;
    expect(buttonCount).toBe(53);
    expect(typeButtonCount).toBe(53);
  });

  it('note_taking_templates_module: handles invalid timestamps safely and resets Guided Notes reveal on resource switch', async () => {
    loadAlloModule('note_taking_templates_module.js');
    const NoteTakingView = window.AlloModules.NoteTakingView;
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);

    const makeProps = (id, before, answer, after) => ({
      generatedContent: {
        id,
        type: 'note-taking',
        timestamp: 'not-a-date',
        data: {
          templateType: 'guided-notes',
          title: 'Guided Notes ' + id,
          blanks: [{ id: id + '-b1', before, answer, after, studentAnswer: 'attempt' }],
          lessonRef: { generatedAt: 'not-a-date' },
        },
      },
      studentResponses: {},
      handleStudentInput: () => {},
      handleNoteUpdate: () => {},
      isTeacherMode: false,
      learnerReadOnly: true,
      t: () => '',
    });

    await act(async () => root.render(React.createElement(NoteTakingView, makeProps('gn-1', 'Water freezes at', '0 degrees', 'Celsius.'))));
    expect(host.textContent).not.toContain('Invalid Date');
    const blankInput = host.querySelector('input[aria-label="Blank 1"]');
    expect(blankInput).not.toBeNull();
    expect(blankInput.readOnly).toBe(true);
    expect(blankInput.style.maxWidth).toBe('100%');

    const revealBtn = [...host.querySelectorAll('button')].find(b => /check answers/i.test(b.textContent));
    expect(revealBtn).toBeTruthy();
    await act(async () => revealBtn.click());
    expect(host.textContent).toContain('0 degrees');

    await act(async () => root.render(React.createElement(NoteTakingView, makeProps('gn-2', 'Plants make', 'glucose', 'in light.'))));
    expect(host.textContent).not.toContain('glucose');
  });

  it('memory_aid_module: gates AI media helpers & visual controls in learnerReadOnly and adds 2-tap confirm on Remove visual', async () => {
    const src = readFileSync(resolve(process.cwd(), 'memory_aid_source.jsx'), 'utf8');
    expect(src).toContain('confirmRemoveVisualCardId');
    expect(src).toMatch(/const callImagen = allowRuntimeAi && !learnerReadOnly/);
    expect(src).toMatch(/const canManageVisual = !learnerReadOnly && \(isTeacherMode \|\| card\.mode === 'student-authored'\)/);
    expect(src).toMatch(/\[resourceActive, isTeacherMode, previewMode, resourceKey, cardsIdentity, currentPracticeOwnerIdentity\]/);
    expect(src).toContain('aria-disabled:opacity-50');
  });

  it('view_math_module: enables teacherSolutionEditing even when showMathAnswers is false, respects mute, and guards IME Ctrl+Enter', () => {
    const src = readFileSync(resolve(process.cwd(), 'view_math_source.jsx'), 'utf8');
    expect(src).toMatch(/var teacherSolutionEditing = isTeacherMode && !mathSelfGradeMode\s*\n\s*&& canHandleMathProblemEdit/);
    expect(src).toContain('spokenMathAudioRef');
    expect(src).toContain('window.__alloMuted === true');
    expect(src).toMatch(/if \(event\.isComposing \|\| event\.nativeEvent\?\.isComposing/);
  });

  it('view_dbq_module: tolerates missing data/docs, hides XP from teacher mode, and checks __alloAiSecretsLocked & __alloMuted', async () => {
    loadAlloModule('view_dbq_module.js');
    const DbqView = window.AlloModules.DbqView;
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);

    window.__alloAiSecretsLocked = true;
    await act(async () => root.render(React.createElement(DbqView, {
      generatedContent: { id: 'dbq-empty', data: { title: 'Empty Packet', documents: [], rubric: [] } },
      studentResponses: null,
      handleStudentInput: () => {},
      callGemini: async () => '{}',
      cleanJson: s => s,
      addToast: () => {},
      handleScoreUpdate: () => {},
      gradeLevel: '8th',
      t: () => undefined,
      isTeacherMode: false,
    })));
    expect(host.textContent).toContain('No documents are available in this DBQ packet yet.');
    expect(host.textContent).toContain('AI feedback is unavailable');
    expect(host.querySelector('[role="progressbar"]')).not.toBeNull();

    const src = readFileSync(resolve(process.cwd(), 'view_dbq_source.jsx'), 'utf8');
    expect(src).toContain('window.__alloAiSecretsLocked === true');
    expect(src).toContain('if (!isTeacherMode && typeof handleScoreUpdate === \'function\')');
    expect(src).toContain('const selfDone = rubricScores.length === rubric.length && rubric.length > 0;');
    expect(src).toContain('stopActiveDbqSpeech');
  });

  it('view_cloze_interaction_panel_module: safely renders when latestGlossary is null and ignores IME Enter on chips', async () => {
    loadAlloModule('view_cloze_interaction_panel_module.js');
    const ClozePanel = window.AlloModules.ClozeInteractionPanel.ClozeInteractionPanel;
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);

    await act(async () => root.render(React.createElement(ClozePanel, {
      t: k => k,
      activeView: 'simplified',
      interactionMode: 'cloze',
      latestGlossary: null,
      leveledTextLanguage: 'Spanish',
      activityScope: 'scope-null',
      completedBlankCount: 0,
      setClozeCompletedSet: () => {},
      setClozeInstanceSet: () => {},
      playSound: () => {},
      handleBankMouseDown: () => {},
      handleSetInteractionModeToRead: () => {},
      wordBankPosition: null,
      wordBankRef: React.createRef(),
    })));
    expect(host.querySelectorAll('[data-cloze-bank-chip]').length).toBe(0);

    await act(async () => root.render(React.createElement(ClozePanel, {
      t: k => k,
      activeView: 'simplified',
      interactionMode: 'cloze',
      latestGlossary: [{ term: 'atom', translations: { Spanish: 'átomo' } }],
      leveledTextLanguage: 'Spanish',
      activityScope: 'scope-1',
      completedBlankCount: 0,
      setClozeCompletedSet: () => {},
      setClozeInstanceSet: () => {},
      playSound: () => {},
      handleBankMouseDown: () => {},
      handleSetInteractionModeToRead: () => {},
      wordBankPosition: null,
      wordBankRef: React.createRef(),
    })));
    const chip = host.querySelector('[data-cloze-bank-chip]');
    expect(chip).not.toBeNull();
    expect(chip.className).toContain('min-h-11');
    await act(async () => {
      chip.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true, cancelable: true }));
    });
    expect(chip.getAttribute('aria-pressed')).toBe('false');
  });
});
