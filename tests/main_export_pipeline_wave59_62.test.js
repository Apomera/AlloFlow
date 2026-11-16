// Verification suite for Waves 59-62:
// - Wave 59: Spoken MathML (<mfrac>, <msup>, <msub>, <msubsup>, <msqrt>, <mroot>, compound scripts)
//            and accessible vs decorative <svg> parity across AlloNarrationText (naturalText,
//            accessibleText, languageRuns) and ExportHandlers (audioReadyTextFromRoot,
//            structuredAudioTextFromRoot, karaokeProcess)
// - Wave 60: Google Forms quiz export (_alloQuizToFormItems) deterministic shuffling for mcq,
//            multi-select, answer-evidence, and sequence-sense principleOptions, plus fill-blank
//            wordBank preservation
// - Wave 61: Live "Read This Page" (getReadableContent) markdown stripping, blank option filtering,
//            candidatePartners shuffling, sentence-frame isSelected filtering, and rubric gating
// - Wave 62: FERPA confirmation modal (askStudentAnalyticsConfirmation) concurrent re-entrancy,
//            non-content tag exclusion, dialog.tabIndex=-1, and Shift+Tab recovery

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const mdDir = resolve(ROOT, 'desktop/web-app/node_modules');

let AlloNarrationText;
let ExportHandlers;
let DriveDelivery;
let askStudentAnalyticsConfirmation;

function parseHtml(html) {
  return new DOMParser().parseFromString(String(html || ''), 'text/html');
}

function sha256(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function extractConfirmationFn() {
  const src = readFileSync(resolve(ROOT, 'student_analytics_module.js'), 'utf8');
  const start = src.indexOf('var studentAnalyticsConfirmSequence = 0;');
  const end = src.indexOf('var useCallback = React.useCallback;', start);
  if (start < 0 || end < 0) throw new Error('Confirmation markers missing');
  return new Function('document', `${src.slice(start, end)}\nreturn askStudentAnalyticsConfirmation;`)(document);
}

beforeAll(() => {
  const React = require(resolve(mdDir, 'react'));
  globalThis.React = window.React = React;
  globalThis.ReactDOM = window.ReactDOM = require(resolve(mdDir, 'react-dom'));

  const narrationSrc = readFileSync(resolve(ROOT, 'document_narration_text_module.js'), 'utf8');
  AlloNarrationText = new Function('DOMParser', `${narrationSrc}\nreturn AlloNarrationText;`)(DOMParser);

  loadAlloModule('export_handlers_module.js');
  ExportHandlers = window.AlloModules.ExportHandlers;

  loadAlloModule('view_export_preview_module.js');
  DriveDelivery = window.AlloModules.DriveDelivery;

  askStudentAnalyticsConfirmation = extractConfirmationFn();
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('Wave 59 — Spoken MathML & accessible SVG parity across narration and karaoke audio', () => {
  it('AlloNarrationText linearizes unlabelled MathML structures and ignores decorative SVGs across all modes', () => {
    const html = `<!DOCTYPE html><html lang="en"><body>
      <p>Solve <math><mfrac><mrow><mi>x</mi><mo>+</mo><mn>1</mn></mrow><mn>2</mn></mfrac><mo>=</mo><msup><mi>e</mi><mrow><mi>x</mi><mo>+</mo><mn>1</mn></mrow></msup><mo>+</mo><msubsup><mi>x</mi><mn>0</mn><mn>2</mn></msubsup><mo>+</mo><mroot><mi>y</mi><mn>3</mn></mroot><annotation encoding="application/x-tex">\\frac{RAW_TEX}{99}</annotation></math>.</p>
      <p>Diagram: <svg role="img" aria-label="Cell membrane cross-section"><title>Membrane</title><text>SVG_INNER_RAW</text></svg></p>
      <p>Decorative: <svg role="presentation"><text>SHOULD_NOT_SPEAK</text></svg></p>
      <p>Fallback: <math data-allo-latex="\\alpha + \\beta"></math></p>
    </body></html>`;

    const nat = AlloNarrationText.naturalText(html);
    expect(nat).toContain('(x+1)/(2)');
    expect(nat).toContain('e^(x+1)');
    expect(nat).toContain('x_0^2');
    expect(nat).toContain('root(3, y)');
    expect(nat).toContain('Cell membrane cross-section');
    expect(nat).toContain('\\alpha + \\beta');
    expect(nat).not.toContain('RAW_TEX');
    expect(nat).not.toContain('SVG_INNER_RAW');
    expect(nat).not.toContain('SHOULD_NOT_SPEAK');

    const acc = AlloNarrationText.accessibleText(html);
    expect(acc).toContain('(x+1)/(2)');
    expect(acc).toContain('root(3, y)');
    expect(acc).not.toContain('RAW_TEX');
    expect(acc).not.toContain('SHOULD_NOT_SPEAK');

    const runs = AlloNarrationText.naturalText(html, { languageRuns: true, language: 'en' });
    const runText = runs.map((r) => r.text).join(' ');
    expect(runText).toContain('(x+1)/(2)');
    expect(runText).toContain('e^(x+1)');
    expect(runText).toContain('root(3, y)');
    expect(runText).toContain('Cell membrane cross-section');
    expect(runText).not.toContain('RAW_TEX');
    expect(runText).not.toContain('SVG_INNER_RAW');
    expect(runText).not.toContain('SHOULD_NOT_SPEAK');
  });

  it('ExportHandlers audioReadyTextFromRoot, structuredAudioTextFromRoot, and karaokeProcess linearize MathML and filter decorative SVGs', async () => {
    const html = `<!DOCTYPE html><html lang="en"><body><main>
      <section class="section" data-ka-readable="1">
        <p>Energy identity: <math><msup><mi>a</mi><mn>2</mn></msup><mo>+</mo><msubsup><mi>x</mi><mn>0</mn><mn>3</mn></msubsup><mo>=</mo><mroot><mi>z</mi><mn>4</mn></mroot><annotation encoding="application/x-tex">\\sqrt[4]{TEX_SECRET}</annotation></math>.</p>
        <p>Visual cue: <svg role="img" aria-label="Energy cycle diagram"><text>SVG_RAW</text></svg><svg aria-hidden="false" role="none"><text>DECOR_SVG</text></svg></p>
      </section>
      <svg aria-label="Standalone flow diagram"><title>Flow</title></svg>
    </main></body></html>`;

    const doc = parseHtml(html);
    const nat = ExportHandlers.audioReadyTextFromRoot(doc.body, { studentSafe: true });
    expect(nat).toContain('a^2');
    expect(nat).toContain('x_0^3');
    expect(nat).toContain('root(4, z)');
    expect(nat).toContain('Energy cycle diagram');
    expect(nat).toContain('Standalone flow diagram');
    expect(nat).not.toContain('TEX_SECRET');
    expect(nat).not.toContain('SVG_RAW');
    expect(nat).not.toContain('DECOR_SVG');

    const str = ExportHandlers.structuredAudioTextFromRoot(doc.body, { studentSafe: true });
    expect(str).toContain('a^2');
    expect(str).toContain('x_0^3');
    expect(str).toContain('root(4, z)');
    expect(str).toContain('Energy cycle diagram');
    expect(str).toContain('Standalone flow diagram');
    expect(str).not.toContain('TEX_SECRET');
    expect(str).not.toContain('DECOR_SVG');

    const kaDoc = parseHtml(html);
    const spokenCalls = [];
    const tinyAudioDataUrl = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=';
    await ExportHandlers.karaokeProcess(kaDoc.documentElement, {
      mode: 'embedded',
      selectedVoice: 'Kore',
      callTTS: async (txt) => {
        spokenCalls.push(txt);
        return tinyAudioDataUrl;
      },
    });
    const spokenCombined = spokenCalls.join(' | ');
    expect(spokenCombined).toContain('a^2+x_0^3=root(4, z)');
    expect(spokenCombined).toContain('Energy cycle diagram');
    expect(spokenCombined).not.toContain('TEX_SECRET');
    expect(spokenCombined).not.toContain('SVG_RAW');
    expect(spokenCombined).not.toContain('DECOR_SVG');
  });
});

describe('Wave 60 — Google Forms quiz choice shuffling and fill-blank word-bank scaffolds', () => {
  const sampleQuiz = {
    id: 'quiz-w60',
    title: 'Cell Transport',
    questions: [
      {
        type: 'mcq',
        question: 'Which process uses ATP?',
        options: ['Diffusion', 'Active transport', 'Osmosis', 'Facilitated diffusion'],
        correctAnswer: 'Active transport',
      },
      {
        type: 'true-false',
        question: 'Water crosses semipermeable membranes.',
        correctAnswer: true,
      },
      {
        type: 'multi-select',
        question: 'Select passive transport types.',
        options: ['Simple diffusion', 'Ion pump', 'Osmosis', 'Endocytosis'],
        correctAnswers: ['Simple diffusion', 'Osmosis'],
      },
      {
        type: 'answer-evidence',
        question: 'Why does a cell shrink in salt water?',
        answerOptions: ['Water moves out', 'Salt enters rapidly', 'ATP stops'],
        correctAnswerIndex: 0,
        evidenceOptions: ['Paragraph 1 describes hypertonic water loss.', 'Paragraph 3 covers mitosis.', 'Paragraph 4 mentions cilia.'],
        correctEvidenceIndex: 0,
      },
      {
        type: 'sequence-sense',
        question: 'Order vesicular release.',
        items: ['Protein synthesized', 'Packaged in Golgi', 'Secreted via exocytosis'],
        correctOrder: ['Protein synthesized', 'Packaged in Golgi', 'Secreted via exocytosis'],
        principleOptions: ['Secretory pathway flow', 'Reverse osmosis', 'Anaerobic breakdown'],
        correctPrincipleIndex: 0,
      },
      {
        type: 'fill-blank',
        question: 'Water moves from high to ___ concentration during diffusion.',
        correctAnswer: 'low',
        wordBank: ['low', 'high', 'isotonic'],
        studentDirections: 'Choose a term from the bank.',
      },
    ],
  };

  it('deterministically shuffles student choices across mcq, multi-select, answer-evidence, and sequence-sense principleOptions while keeping keys synced', () => {
    const shuffledA = DriveDelivery.quizToFormItems(sampleQuiz, {
      includeTeacherKey: false,
      assessmentMode: true,
      shuffleChoices: true,
    });
    const shuffledB = DriveDelivery.quizToFormItems(sampleQuiz, {
      includeTeacherKey: false,
      assessmentMode: true,
      shuffleChoices: true,
    });
    expect(shuffledA).toEqual(shuffledB);

    const mcq = shuffledA[0];
    expect(mcq.type).toBe('mc');
    expect(mcq.options).not.toEqual(['Diffusion', 'Active transport', 'Osmosis', 'Facilitated diffusion']);
    expect(mcq.options[mcq.answer[0]]).toBe('Active transport');

    const tf = shuffledA[1];
    expect(tf.options).toEqual(['True', 'False']);
    expect(tf.answer).toEqual([0]);

    const ms = shuffledA[2];
    expect(ms.type).toBe('checkbox');
    expect(ms.options).not.toEqual(['Simple diffusion', 'Ion pump', 'Osmosis', 'Endocytosis']);
    expect(ms.answer.map((i) => ms.options[i]).sort()).toEqual(['Osmosis', 'Simple diffusion']);

    const aeAns = shuffledA[3];
    const aeEv = shuffledA[4];
    expect(aeAns.options).not.toEqual(['Water moves out', 'Salt enters rapidly', 'ATP stops']);
    expect(aeAns.options[aeAns.answer[0]]).toBe('Water moves out');
    expect(aeEv.options).not.toEqual([
      'Paragraph 1 describes hypertonic water loss.',
      'Paragraph 3 covers mitosis.',
      'Paragraph 4 mentions cilia.',
    ]);
    expect(aeEv.options[aeEv.answer[0]]).toBe('Paragraph 1 describes hypertonic water loss.');

    // sequence-sense emits 3 step items + 1 principle item at index 8
    const principleItem = shuffledA[8];
    expect(principleItem.prompt).toContain('Which principle explains this order?');
    expect(principleItem.options).not.toEqual(['Secretory pathway flow', 'Reverse osmosis', 'Anaerobic breakdown']);
    expect(principleItem.options[principleItem.answer[0]]).toBe('Secretory pathway flow');

    const fillItem = shuffledA[9];
    expect(fillItem.type).toBe('short');
    expect(fillItem.help).toContain('Word bank: low, high, isotonic');
    expect(fillItem.help).toContain('Choose a term from the bank.');

    // Teacher key mode preserves authored choice order when shuffleChoices is disabled
    const teacherItems = DriveDelivery.quizToFormItems(sampleQuiz, {
      includeTeacherKey: true,
      assessmentMode: false,
      shuffleChoices: false,
    });
    expect(teacherItems[0].options).toEqual(['Diffusion', 'Active transport', 'Osmosis', 'Facilitated diffusion']);
    expect(teacherItems[0].answer).toEqual([1]);
    expect(teacherItems[9].help).toContain('Word bank: low, high, isotonic');
  });
});

describe('Wave 61 — Live "Read This Page" (getReadableContent) hygiene and student rubric gating', () => {
  it('strips inline markdown, drops blank options cleanly, and shuffles relation-mismatch candidatePartners for students', () => {
    const items = ExportHandlers.getReadableContent({
      activeView: 'quiz',
      generatedContent: {
        type: 'quiz',
        data: {
          questions: [
            {
              type: 'mcq',
              passage: 'See **Table 1** on [page 2](https://example.test).',
              question: 'Which molecule carries *chemical* `ATP` energy?',
              options: ['**Glucose**', '   ', { text: '*Lipid*' }, ''],
            },
            {
              type: 'answer-evidence',
              question: 'Pick claim',
              answerOptions: ['**Active**', ''],
              evidenceOptions: ['  ', '*Line 2*', '`Quote 3`'],
            },
            {
              type: 'relation-mismatch',
              question: 'Fix pair',
              pairs: [{ left: '**Root**', right: 'Sunlight' }, { left: 'Leaf', right: 'Sunlight' }],
              candidatePartners: ['Water', 'Nitrogen', 'Helium'],
            },
          ],
        },
      },
    });
    const combined = items.map((x) => x.text).join('\n');
    expect(combined).toContain('Passage: See Table 1 on page 2.');
    expect(combined).toContain('Question 1: Which molecule carries chemical ATP energy?');
    expect(combined).toContain('Option A: Glucose');
    expect(combined).toContain('Option B: Lipid');
    expect(combined).not.toContain('**');
    expect(combined).not.toContain('`');
    expect(combined).not.toContain('https://example.test');
    expect(combined).toContain('Evidence A: Line 2');
    expect(combined).toContain('Evidence B: Quote 3');
    expect(items.some((x) => /Option B:\s*$/i.test(x.text))).toBe(false);

    const candOrder = items.filter((x) => /^Candidate partner /.test(x.text)).map((x) => x.text.replace(/^Candidate partner \d+:\s*/, ''));
    expect(candOrder).not.toEqual(['Water', 'Nitrogen', 'Helium']);
    expect(candOrder.sort()).toEqual(['Helium', 'Nitrogen', 'Water']);
  });

  it('filters deselected sentence frames and omits teacher rubric in student/assessment mode', () => {
    const sfContent = {
      type: 'sentence-frames',
      data: {
        mode: 'list',
        items: [
          { text: 'I claim that [X].', isSelected: true },
          { text: 'DESELECTED_FRAME', isSelected: false },
          'My evidence is [Y].',
        ],
        rubric: 'SECRET_TEACHER_RUBRIC',
      },
    };
    const studentItems = ExportHandlers.getReadableContent({
      activeView: 'sentence-frames',
      isStudentMode: true,
      generatedContent: sfContent,
    });
    const studentText = studentItems.map((x) => x.text).join('\n');
    expect(studentText).toContain('Frame 1: I claim that [X].');
    expect(studentText).toContain('Frame 2: My evidence is [Y].');
    expect(studentText).not.toContain('DESELECTED_FRAME');
    expect(studentText).not.toContain('SECRET_TEACHER_RUBRIC');

    const teacherItems = ExportHandlers.getReadableContent({
      activeView: 'sentence-frames',
      generatedContent: sfContent,
    });
    expect(teacherItems.map((x) => x.text).join('\n')).toContain('SECRET_TEACHER_RUBRIC');
  });
});

describe('Wave 62 — Student Analytics confirmation modal re-entrancy, focus recovery, and mirror parity', () => {
  it('closes any prior open confirmation without stranding inert, ignores script/style tags, and wraps Shift+Tab cleanly', async () => {
    const appRoot = document.createElement('div');
    appRoot.id = 'app-root';
    const opener = document.createElement('button');
    opener.textContent = 'Export';
    appRoot.appendChild(opener);
    const scriptEl = document.createElement('script');
    const styleEl = document.createElement('style');
    document.body.appendChild(appRoot);
    document.body.appendChild(scriptEl);
    document.body.appendChild(styleEl);
    opener.focus();

    const firstPromise = askStudentAnalyticsConfirmation('First prompt?', { title: 'First', confirmText: 'Yes 1' });
    expect(appRoot.hasAttribute('inert')).toBe(true);
    expect(scriptEl.hasAttribute('inert')).toBe(false);
    expect(styleEl.hasAttribute('inert')).toBe(false);

    const dialogsAfterFirst = document.querySelectorAll('[role="alertdialog"]');
    expect(dialogsAfterFirst).toHaveLength(1);
    expect(dialogsAfterFirst[0].tabIndex).toBe(-1);

    // Concurrent second confirmation must close the first cleanly rather than capturing inert state
    const secondPromise = askStudentAnalyticsConfirmation('Second prompt?', { title: 'Second', confirmText: 'Yes 2' });
    expect(await firstPromise).toBe(false);

    const dialogsAfterSecond = document.querySelectorAll('[role="alertdialog"]');
    expect(dialogsAfterSecond).toHaveLength(1);
    const activeDialog = dialogsAfterSecond[0];
    const buttons = activeDialog.querySelectorAll('button');
    const cancelBtn = buttons[0];
    const confirmBtn = buttons[1];

    // Simulate focus inside dialog whitespace followed by Shift+Tab and Tab
    activeDialog.focus();
    const shiftTabEvt = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    document.dispatchEvent(shiftTabEvt);
    expect(document.activeElement).toBe(confirmBtn);

    activeDialog.focus();
    const tabEvt = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: false, bubbles: true, cancelable: true });
    document.dispatchEvent(tabEvt);
    expect(document.activeElement).toBe(cancelBtn);

    confirmBtn.click();
    expect(await secondPromise).toBe(true);
    expect(appRoot.hasAttribute('inert')).toBe(false);
    expect(appRoot.getAttribute('aria-hidden')).toBeNull();
  });

  it('ships identical SHA-256 hashes across all 4 mirrors for Wave 59-62 artifacts', () => {
    const mirrors = ['.', 'desktop/web-app/public', 'desktop/app-build', 'desktop/web-app/build'];
    const files = [
      'view_pdf_audit_module.js',
      'document_narration_text_module.js',
      'view_export_preview_module.js',
      'export_handlers_module.js',
      'student_analytics_module.js',
    ];
    for (const f of files) {
      const base = sha256(resolve(ROOT, mirrors[0], f));
      for (const m of mirrors.slice(1)) {
        expect(sha256(resolve(ROOT, m, f))).toBe(base);
      }
    }
  });
});
