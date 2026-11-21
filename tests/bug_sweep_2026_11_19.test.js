import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf8');

const dispatcherSrc = read('generate_dispatcher_source.jsx');
const teacherSrc = read('teacher_source.jsx');
const commandsSrc = read('allo_commands_source.jsx');
const renderersSrc = read('view_renderers_source.jsx');
const exportSrc = read('export_source.jsx');
const previewSrc = read('view_export_preview_source.jsx');

describe('Bug sweep 2026-11-19: Alignment Report, Glossary alt text, and Live Quiz Presenter', () => {
  const helperPrefix = dispatcherSrc.slice(0, dispatcherSrc.indexOf('const handleGenerate'));
  const audit = new Function(helperPrefix + '\nreturn { harvestExistingAuditSignals, computeContentAccessibility };')();

  it('inspects quiz optionImageUrls and memory-aid visualImage in audit signals and accessibility checks', () => {
    const artifacts = [
      {
        id: 'q-vis',
        type: 'quiz',
        data: {
          questions: [{
            type: 'mcq',
            question: 'Which cell has a cell wall?',
            options: ['Plant', 'Animal'],
            optionImageUrls: ['data:image/png;base64,AAA', 'data:image/png;base64,BBB'],
            optionImageAltTexts: ['Rectangular green plant cell', 'Round animal cell'],
          }],
        },
      },
      {
        id: 'ma-vis',
        type: 'memory-aid',
        data: {
          cards: [
            { target: 'Mitosis', visualImage: 'data:image/png;base64,CCC', visualAlt: 'One cell dividing into two identical cells' },
            { target: 'Meiosis', visualImage: 'data:image/png;base64,DDD' },
          ],
        },
      },
    ];
    const harvest = audit.harvestExistingAuditSignals([artifacts[0]]);
    expect(harvest.multimodal.image).toBe(true);

    const maHarvest = audit.harvestExistingAuditSignals([artifacts[1]]);
    expect(maHarvest.multimodal.image).toBe(true);

    const a11y = audit.computeContentAccessibility(artifacts, {}, '5th Grade');
    expect(a11y.totalImages).toBe(4);
    expect(a11y.imagesWithAlt).toBe(3);
    expect(a11y.altCoveragePct).toBe(75);
  });

  it('drafts alt text for generated glossary icons', () => {
    expect(dispatcherSrc).toMatch(/All \$\{processedContent\.length\} glossary images processed![\s\S]{0,400}_draftAltsFor\(processedContent\.filter/);
  });

  it('uses question.imageAltText first in Live Quiz Presenter', () => {
    expect(teacherSrc).toContain("alt={String(question.imageAltText || question.imageAlt || question.question || t('quiz.question_image') || 'Question image')}");
  });
});

describe('Bug sweep 2026-11-19: Commands and Voice Routing', () => {
  const loadCommands = () => {
    const mod = read('allo_commands_module.js');
    const prevWindow = globalThis.window;
    const fakeReact = {
      createElement: () => null,
      Fragment: Symbol('Fragment'),
      useState: (v) => [v, () => {}],
      useEffect: () => {},
      useRef: (v) => ({ current: v }),
      useMemo: (f) => f(),
      useCallback: (f) => f,
    };
    const fakeWindow = { React: fakeReact, AlloModules: {}, AlloCommands: null };
    globalThis.window = fakeWindow;
    try {
      new Function('window', 'self', 'React', mod)(fakeWindow, fakeWindow, fakeReact);
      return fakeWindow.AlloCommands || fakeWindow.AlloModules.AlloCommands;
    } finally {
      globalThis.window = prevWindow;
    }
  };

  it('registers generate_applied_challenge and routes "use option 1/2/3" deterministically', async () => {
    const api = loadCommands();
    const generateAppliedChallenge = vi.fn(() => Promise.resolve('ok'));
    const useContextualSuggestion = vi.fn((opt) => `Ran option ${opt}`);
    const ctx = {
      isTeacherMode: true,
      hasSourceOrAnalysis: true,
      contextualSuggestionCount: 3,
      generateAppliedChallenge,
      useContextualSuggestion,
    };
    const cmds = api.buildAlloCommands(ctx);
    expect(cmds.some((c) => c.id === 'generate_applied_challenge')).toBe(true);
    expect(cmds.filter((c) => c.id === 'use_contextual_suggestion')).toHaveLength(1);

    const routed = await api.routeUtterance(ctx, 'use option 2', { preview: false });
    expect(routed && routed.handled).toBe(true);
    expect(routed.commandId).toBe('use_contextual_suggestion');
    expect(useContextualSuggestion).toHaveBeenCalledWith('2');
  });

  it('exposes Math voice-editable fields from data.problems using MathView stable keys', () => {
    const api = loadCommands();
    const handleStudentInput = vi.fn();
    const fields = api.listMainVoiceEditableFields({
      generatedContent: {
        id: 'math-1',
        type: 'math',
        data: {
          title: 'Fractions',
          problems: [
            { id: 'prob-a', question: '1/2 + 1/4 = ?' },
            { question: '3/4 - 1/2 = ?', answer: '1/4', taskType: 'compute' },
          ],
        },
      },
      studentResponses: { 'math-1': { 'prob-a': '3/4' } },
      handleStudentInput,
    });
    const mathFields = fields.filter((f) => f.id.startsWith('math-work-'));
    expect(mathFields).toHaveLength(2);
    expect(mathFields[0].value).toBe('3/4');
    mathFields[0].setValue('0.75');
    expect(handleStudentInput).toHaveBeenCalledWith('math-1', 'prob-a', '0.75');
    mathFields[1].setValue('1/4');
    const writtenKey = handleStudentInput.mock.calls[1][1];
    expect(writtenKey).toMatch(/^problem-[a-z0-9]+-1$/);
  });

  it('ignores numeric citations and Markdown links in Paragraph Frame voice fields', () => {
    const api = loadCommands();
    const handleStudentInput = vi.fn();
    const fields = api.listMainVoiceEditableFields({
      generatedContent: {
        id: 'sf-1',
        type: 'sentence-frames',
        data: {
          text: 'Plants use [sunlight](https://example.org) [1] to make [glucose] and release [oxygen].',
        },
      },
      studentResponses: { 'sf-1': { 'paragraph-1': 'sugar', 'paragraph-3': 'O2' } },
      handleStudentInput,
    });
    const frameFields = fields.filter((f) => f.id.startsWith('sentence-frame-'));
    expect(frameFields).toHaveLength(2);
    expect(frameFields[0].id).toBe('sentence-frame-1');
    expect(frameFields[0].value).toBe('sugar');
    expect(frameFields[1].id).toBe('sentence-frame-3');
    expect(frameFields[1].value).toBe('O2');
  });
});

describe('Bug sweep 2026-11-19: Core Renderers', () => {
  it('fixes Flow Chart zoom-out/collapse glyphs, Cause & Effect chains/editing, and ConceptSpace3D normalization', () => {
    expect(renderersSrc).not.toContain("title={t('outline.zoom_out') || 'Zoom out'}>?<");
    expect(renderersSrc).not.toContain("t('outline.rendering') || 'Rendering?'");
    expect(renderersSrc).not.toContain("{isCollapsed ? '+' : '?'}");
    expect(renderersSrc).toContain("if (type === 'Cause and Effect' && !isEditingOutline)");
    expect(renderersSrc).toContain('{chains.length > 0 && (');
    expect(renderersSrc).toContain('const _normalizedOrganizerViewBase = { ...generatedContent.data, ...organizerData };');
    expect(renderersSrc).not.toContain("(typeof it === 'object' ? it.text : it)");
  });
});

describe('Bug sweep 2026-11-19: Export & Preview Fixes', () => {
  const compatStart = previewSrc.indexOf('function _builderH5PCompatibility(');
  const compatEnd = previewSrc.indexOf('function _builderEditorPageCss(');
  const { _builderH5PCompatibility } = new Function(
    previewSrc.slice(compatStart, compatEnd) + '\nreturn { _builderH5PCompatibility };'
  )();

  it('marks cornell-notes, lab-report, and fresh reading-response note-taking templates ready for H5P', () => {
    const cornell = _builderH5PCompatibility({
      type: 'note-taking',
      data: { templateType: 'cornell-notes', cues: ['Main idea'], notes: ['Key detail'], summary: 'Wrap up.' },
    }, []);
    expect(cornell.ready).toBe(true);
    expect(cornell.valid).toBe(2);

    const lab = _builderH5PCompatibility({
      type: 'note-taking',
      data: { templateType: 'lab-report', title: 'Plant Growth', question: 'Does light affect growth?', hypothesis: '', conclusion: '' },
    }, []);
    expect(lab.ready).toBe(true);
    expect(lab.valid).toBeGreaterThanOrEqual(3);

    const reading = _builderH5PCompatibility({
      type: 'note-taking',
      data: { templateType: 'reading-response', title: 'Chapter 1', favoriteLine: '', thinkings: '', connection: { type: 'text-to-self', text: '' }, question: '' },
    }, []);
    expect(reading.ready).toBe(true);
    expect(reading.valid).toBe(4);
  });

  it('tracks quiz reflections and optionImageUrls in H5P compatibility', () => {
    const quizWithReflections = _builderH5PCompatibility({
      type: 'quiz',
      data: {
        questions: [{
          type: 'mcq',
          question: 'Pick the plant cell.',
          options: ['A', 'B'],
          correctIndex: 0,
          optionImageUrls: ['data:image/png;base64,AAA', 'data:image/png;base64,BBB'],
        }],
        reflections: [{ prompt: 'Explain why cell walls help plants stand upright.' }],
      },
    }, []);
    expect(quizWithReflections.library).toBe('Question Set 1.21');
    expect(quizWithReflections.total).toBe(2);
    expect(quizWithReflections.valid).toBe(2);
    expect(quizWithReflections.omittedMedia).toBe(2);
    expect(quizWithReflections.manualReview).toBe(1);
  });

  it('eliminates broken template literals, prompt leaks, and object-translation bugs in export sources', () => {
    expect(exportSrc).not.toContain("t('common.reflection_i_1')");
    expect(exportSrc).not.toContain("tx('common.question_i_1'");
    expect(exportSrc).not.toContain('item.data.caption || item.data.alt || item.data.prompt');
    expect(exportSrc).toContain('imgData.altText || imgData.alt || imgData.description');
    expect(exportSrc).toContain('const _gxTerm = item =>');
    expect(exportSrc).toContain("tt === 'lab-report'");
    expect(previewSrc).toContain("'cornell-notes'");
    expect(previewSrc).toContain("'lab-report'");
    expect(previewSrc).toContain('### Reflection Prompts');
    expect(previewSrc).not.toContain("Object.values(g.translations).map(trv => esc(trv))");
  });
});
