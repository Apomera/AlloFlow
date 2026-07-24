import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

const escapeXml = (value) => String(value == null ? '' : value).replace(/[<>&'"]/g, (char) => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
}[char]));

let originalBlob;
let originalLang;
let originalDir;

beforeAll(() => {
  loadAlloModule('export_module.js');
  loadAlloModule('export_handlers_module.js');
  originalBlob = globalThis.Blob;
  originalLang = document.documentElement.lang;
  originalDir = document.documentElement.dir;
});

afterEach(() => {
  globalThis.Blob = originalBlob;
  window.Blob = originalBlob;
  document.documentElement.lang = originalLang;
  document.documentElement.dir = originalDir;
  vi.restoreAllMocks();
});

function createExport(live) {
  return window.AlloModules.createExport({
    liveRef: { current: live },
    warnLog: vi.fn(),
    debugLog: vi.fn(),
    escapeXml,
    generateUUID: () => '12345678-1234-1234-1234-123456789abc',
  });
}

function slideStub(writeFile) {
  return class MockPptx {
    constructor() {
      this.ShapeType = { rect: 'rect', ellipse: 'ellipse', line: 'line' };
      this.writeFile = writeFile;
    }
    defineSlideMaster() {}
    addSlide() {
      return {
        addNotes: vi.fn(), addText: vi.fn(), addShape: vi.fn(),
        addTable: vi.fn(), addImage: vi.fn(),
      };
    }
  };
}

describe('Document Builder export boundary hardening', () => {
  it('waits for the PPTX write and reports failure without a false success', async () => {
    const addToast = vi.fn();
    const writeFile = vi.fn().mockRejectedValue(new Error('write failed'));
    window.PptxGenJS = slideStub(writeFile);
    const api = createExport({
      history: [{ type: 'faq', title: 'FAQ', data: ['Answer'] }],
      sourceTopic: 'Topic', gradeLevel: '5', addToast, t: (key) => key,
    });

    await expect(api.handleExportSlides()).resolves.toBe(false);
    expect(writeFile).toHaveBeenCalledOnce();
    expect(addToast).toHaveBeenCalledWith('export_status.ppt_error', 'error');
    expect(addToast).not.toHaveBeenCalledWith('export_status.ppt_success', 'success');
  });

  it('returns failure when the PPTX library is unavailable', async () => {
    delete window.PptxGenJS;
    const addToast = vi.fn();
    const api = createExport({
      history: [{ type: 'faq', data: ['Answer'] }],
      sourceTopic: 'Topic', gradeLevel: '5', addToast, t: (key) => key,
    });

    await expect(api.handleExportSlides()).resolves.toBe(false);
    expect(addToast).toHaveBeenCalledWith('export_status.ppt_lib_loading', 'error');
  });

  it('keeps the Builder open when the real slide handler returns failure', async () => {
    const setShowExportPreview = vi.fn();
    const preview = document.implementation.createHTMLDocument('Slide preview');
    preview.body.innerHTML = '<main><h1>Ready</h1><p>Exportable content.</p></main>';
    const ok = await window.AlloModules.ExportHandlers.executeExportFromPreview({
      _docPipeline: {}, addToast: vi.fn(), t: (key) => key,
      exportPreviewMode: 'slides', exportPreviewRef: { current: { contentDocument: preview } },
      generateFullPackHTML: () => '', getExportableHistory: () => [],
      getSkippedResources: () => [], sourceTopic: 'Topic', studentResponses: {},
      exportConfig: {}, history: [], setShowExportPreview,
      handleExportSlides: vi.fn().mockResolvedValue(false),
    });

    expect(ok).toBe(false);
    expect(setShowExportPreview).not.toHaveBeenCalled();
  });

  it('escapes glossary data and carries language, direction, and headings into flashcard HTML', () => {
    let html = '';
    class CaptureBlob {
      constructor(parts) { html = parts.join(''); }
    }
    globalThis.Blob = CaptureBlob;
    window.Blob = CaptureBlob;
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';

    const api = createExport({
      generatedContent: {
        type: 'glossary',
        data: [{ term: '<img src=x onerror=alert(1)>', def: '<script>alert(2)</script>' }],
      },
      t: (key) => key,
    });
    api.handleExportFlashcards('standard');

    expect(html).toContain('<html lang="ar" dir="rtl">');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('&lt;script&gt;alert(2)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert(2)</script>');
    expect(html).toContain('<h1');
    expect(html).toContain('<h2 class="set-header">');
  });

  it('escapes story choices and feedback in the printable storybook', async () => {
    let html = '';
    vi.spyOn(window, 'open').mockReturnValue({
      document: { write: (value) => { html = value; }, close: vi.fn() },
    });
    window.callGemini = vi.fn().mockResolvedValue('A safe summary.');
    document.documentElement.lang = 'fr-CA';
    document.documentElement.dir = 'ltr';

    const api = createExport({
      adventureState: {
        history: [
          { type: 'scene', text: 'Opening scene' },
          { type: 'choice', text: '<script>alert(1)</script>' },
          { type: 'feedback', text: '<img src=x onerror=alert(2)>' },
        ],
        currentScene: null, imageCache: {}, level: 2,
      },
      sourceTopic: '<b>Unsafe title</b>',
      setShowStorybookExportModal: vi.fn(), setIsProcessing: vi.fn(),
      rehydrateHistoryWithImages: async (history) => history,
      parseMarkdownToHTML: (value) => `<p>${escapeXml(value)}</p>`,
      addToast: vi.fn(), t: (key) => key,
    });
    await api.handleExportStorybook(false);

    expect(html).toContain('<html lang="fr-CA" dir="ltr">');
    expect(html).toContain('&lt;b&gt;Unsafe title&lt;/b&gt;');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(2)&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
  });

  it('refuses to manufacture a false QTI answer when the declared answer matches no option', async () => {
    let zip;
    window.JSZip = class MockZip {
      constructor() { zip = this; this.generateAsync = vi.fn().mockResolvedValue(new Blob()); }
      file() {}
    };
    const addToast = vi.fn();
    const api = createExport({
      generatedContent: {
        type: 'quiz', title: 'Quiz',
        data: { questions: [{ question: 'Pick one', options: ['A', 'B'], correctAnswer: 'C' }] },
      },
      sourceTopic: 'Topic', addToast, t: (key) => key,
    });

    await api.handleExportQTI();

    expect(zip.generateAsync).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith('No valid assessment questions or reflections are ready for QTI export.', 'error');
  });

  it('exports the quiz explicitly selected by the Builder instead of stale generated content', async () => {
    let zip;
    window.JSZip = class MockZip {
      constructor() { zip = this; this.files = new Map(); this.generateAsync = vi.fn().mockResolvedValue(new Blob()); }
      file(name, value) { this.files.set(name, value); }
    };
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:qti-selected');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const addToast = vi.fn();
    const api = createExport({
      generatedContent: { type: 'faq', title: 'Stale content', data: [] },
      sourceTopic: 'Topic', addToast, t: (key) => key,
    });

    await api.handleExportQTI({ generatedContent: {
      type: 'quiz', title: 'Selected Quiz', data: { questions: [{ question: 'Selected question', options: ['Yes', 'No'], correctAnswer: 'Yes' }] },
    } });

    const assessment = zip.files.get('assessment.xml');
    expect(assessment).toContain('Selected question');
    expect(assessment).not.toContain('Stale content');
    expect(zip.generateAsync).toHaveBeenCalledOnce();

  });

  it('exports every Assess item type to QTI with scoring or manual-review metadata', async () => {
    let zip;
    window.JSZip = class MockZip {
      constructor() { zip = this; this.files = new Map(); this.generateAsync = vi.fn().mockResolvedValue(new Blob()); }
      file(name, value) { this.files.set(name, value); }
    };
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:qti-parity');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const addToast = vi.fn();
    const api = createExport({ sourceTopic: 'Earth science', addToast, t: (key) => key });

    await api.handleExportQTI({ generatedContent: {
      type: 'quiz',
      title: 'Mixed assessment',
      data: {
        scoringPolicy: { partialCredit: true },
        questions: [
          { type: 'mcq', question: 'Which layer is solid?', options: ['Crust', 'Core'], correctAnswer: 'Crust' },
          { type: 'multi-select', question: 'Select two rocks.', options: ['Granite', 'Basalt', 'Water'], correctAnswers: ['Granite', 'Basalt'] },
          { type: 'fill-blank', question: 'Molten rock below ground is ___.', expectedFill: 'magma', acceptableAlternatives: ['magma rock'] },
          { type: 'short-answer', question: 'Name one weathering process.', expectedAnswer: 'Erosion by water.' },
          { type: 'self-explanation', question: 'Explain why plates move.', rubric: 'Connect mantle convection to plate movement.' },
          { type: 'sequence-sense', question: 'Check the rock-cycle order.', items: ['Magma cools', 'Rock forms', 'Rock weathers'], presentedOrder: [1, 0, 2], intentionallyWrongIndex: 0, orderingPrinciple: 'Follow the process over time.' },
          { type: 'relation-mismatch', question: 'Find the mismatched layer.', pairs: [{ left: 'Crust', right: 'solid' }, { left: 'Mantle', right: 'liquid water' }, { left: 'Core', right: 'metallic' }], wrongPairIndex: 1, correctPartnerForWrong: 'slow-flowing rock', candidatePartners: ['slow-flowing rock', 'liquid water'] },
          { type: 'answer-evidence', question: 'Which claim is supported?', answerOptions: ['A', 'B'], correctAnswer: 'B', evidencePrompt: 'Choose the evidence.', evidenceOptions: ['E1', 'E2'], correctEvidence: 'E2' },
          { type: 'numeric-response', question: 'What is the measured distance?', correctValue: 12.5, tolerance: 0.2, unit: 'km', acceptableUnits: ['kilometers'] },
        ],
        reflections: [{ prompt: 'What evidence changed your thinking?' }],
      },
    } });

    const assessment = zip.files.get('assessment.xml');
    const parsedAssessment = new DOMParser().parseFromString(assessment, 'application/xml');
    expect(parsedAssessment.querySelector('parsererror')).toBeNull();
    for (const type of ['mcq', 'multi-select', 'fill-blank', 'short-answer', 'self-explanation', 'sequence-sense', 'relation-mismatch', 'answer-evidence', 'numeric-response', 'reflection']) {
      expect(assessment).toContain(`<fieldentry>${type}</fieldentry>`);
    }
    expect(assessment.match(/<item ident=/g)).toHaveLength(10);
    expect(assessment).toContain('rcardinality="Multiple"');
    expect(assessment).toContain('minnumber="1"');
    expect(assessment).toContain('<response_num ident="NUM_8"');
    expect(assessment).toContain('<vargte respident="NUM_8">12.3</vargte>');
    expect(assessment).toContain('<fieldlabel>alloflow_scoring_guide</fieldlabel>');
    expect(assessment).toContain('Displayed sequence:');
    expect(assessment).toContain('Mantle ↔ liquid water');
    expect(assessment).toContain('What evidence changed your thinking?');
    expect(zip.generateAsync).toHaveBeenCalledOnce();
    expect(addToast).not.toHaveBeenCalledWith(expect.stringContaining('omitted'), 'warning');
  });

  it('preserves all-or-nothing scoring for compound QTI item types', async () => {
    let zip;
    window.JSZip = class MockZip {
      constructor() { zip = this; this.files = new Map(); this.generateAsync = vi.fn().mockResolvedValue(new Blob()); }
      file(name, value) { this.files.set(name, value); }
    };
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:qti-all-or-nothing');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const api = createExport({ sourceTopic: 'Scoring', addToast: vi.fn(), t: (key) => key });

    await api.handleExportQTI({ generatedContent: {
      type: 'quiz', title: 'Strict scoring', data: {
        scoringPolicy: { partialCredit: false },
        questions: [
          { type: 'multi-select', question: 'Choose both.', options: ['A', 'B', 'C'], correctAnswers: ['A', 'B'] },
          { type: 'answer-evidence', question: 'Choose and support.', answerOptions: ['A', 'B'], correctAnswer: 'A', evidenceOptions: ['E1', 'E2'], correctEvidence: 'E1' },
          { type: 'numeric-response', question: 'Enter value and unit.', correctValue: 4, tolerance: 0, unit: 'm', acceptableUnits: ['meters'] },
        ],
      },
    } });

    const assessment = zip.files.get('assessment.xml');
    expect(assessment).toContain('title="All correct selections"');
    expect(assessment).toContain('<not><varequal respident="RESPONSE_0">OPT_2</varequal></not>');
    expect(assessment).toContain('title="Correct answer and evidence"');
    expect(assessment).toContain('title="Correct value and unit"');
    expect(assessment).not.toContain('<setvar action="Add" varname="SCORE">0.5</setvar>');
  });

  it('packages the current cleaned Builder document in IMS without rerendering stale history', async () => {
    let zip;
    window.JSZip = class MockZip {
      constructor() { zip = this; this.files = new Map(); this.generateAsync = vi.fn().mockResolvedValue(new Blob()); }
      file(name, value) { this.files.set(name, value); }
    };
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:ims-live');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const addToast = vi.fn();
    const generateResourceHTML = vi.fn(() => '<p>stale render</p>');
    const api = createExport({
      history: [{ id: 'old', type: 'simplified', title: 'Old', data: 'Old content' }],
      sourceTopic: 'Topic', studentResponses: {}, addToast, t: (key) => key,
      generateResourceHTML,
    });
    const liveHtml = '<!DOCTYPE html><html lang="en"><head><title>Edited lesson</title></head><body><main><h1>Live edit</h1></main></body></html>';

    await api.handleExportIMS({ liveHtml, liveTitle: 'Edited lesson' });

    expect(generateResourceHTML).not.toHaveBeenCalled();
    expect(zip.files.get('resource_0.html')).toBe(liveHtml);
    const manifest = zip.files.get('imsmanifest.xml');
    expect(manifest).toContain('Edited lesson');
    expect(manifest).toContain('resource_0.html');
    const packageProfile = JSON.parse(zip.files.get('alloflow-object-profile.json'));
    expect(packageProfile.packaged[0]).toEqual(expect.objectContaining({ type: 'builder-document', canExportIms: true, renderedInIms: true }));
    expect(packageProfile.skipped).toEqual([]);
    expect(addToast).toHaveBeenCalledWith('export_status.ims_success', 'success');
  });
  it('isolates IMS renderer failures, keeps identifiers unique, and discloses partial packages', async () => {
    let zip;
    window.JSZip = class MockZip {
      constructor() { zip = this; this.files = new Map(); this.generateAsync = vi.fn().mockResolvedValue(new Blob()); }
      file(name, value) { this.files.set(name, value); }
    };
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:ims');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const addToast = vi.fn();
    const history = [
      { id: 'duplicate', type: 'simplified', title: 'First\u0001 resource', data: 'One' },
      { id: 'broken', type: 'simplified', title: 'Broken resource', data: 'Two' },
      { id: 'duplicate', type: 'simplified', title: 'Third resource', data: 'Three' },
    ];
    const profile = {
      type: 'simplified', label: 'Reading', status: 'ready', html: 'static',
      canExportHtml: true, canExportIms: true, interactiveHtml: false, qti: false,
      tracking: 'none', fallback: 'static-html', notes: '',
    };
    const api = createExport({
      history, sourceTopic: 'Topic', studentResponses: {}, addToast, t: (key) => key,
      interactiveObjectProfileFor: () => profile,
      interactiveObjectManifestItem: (item, extra) => ({ id: item.id, type: item.type, title: item.title, ...profile, ...extra }),
      interactiveObjectProfileSummary: () => ({ total: history.length, imsReady: history.length }),
      generateResourceHTML: (item) => {
        if (item.id === 'broken') throw new Error('renderer exploded');
        return `<main><h1>${escapeXml(item.title)}</h1></main>`;
      },
    });

    await api.handleExportIMS();

    const manifest = zip.files.get('imsmanifest.xml');
    const xml = new DOMParser().parseFromString(manifest, 'application/xml');
    expect(xml.querySelector('parsererror')).toBeNull();
    const resourceIds = Array.from(xml.getElementsByTagNameNS('*', 'resource'), (node) => node.getAttribute('identifier'));
    const itemIds = Array.from(xml.getElementsByTagNameNS('*', 'item'), (node) => node.getAttribute('identifier'));
    expect(resourceIds).toHaveLength(2);
    expect(new Set(resourceIds).size).toBe(2);
    expect(new Set(itemIds).size).toBe(2);
    expect(manifest).not.toContain('\u0001');
    const packageProfile = JSON.parse(zip.files.get('alloflow-object-profile.json'));
    expect(packageProfile.skipped).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'broken', reason: 'render-error' })]));
    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('1 skipped resource'), 'warning');
    expect(addToast).not.toHaveBeenCalledWith('export_status.ims_success', 'success');
  });

  it('locks QTI and IMS package language metadata to the active document language', () => {
    const source = readFileSync('export_source.jsx', 'utf8');
    expect(source).toContain('<lom:string language="${_escapeExportText(exportLang)}">${title}</lom:string>');
    expect(source).toContain('<html lang="${_escapeExportText(exportLang)}" dir="${exportDir}">');
    expect(source).not.toContain('<lom:string language="en">${manifestTitle}</lom:string>');
    expect(source).not.toContain('correctIndex !== -1 ? `OPT_${correctIndex}` : "OPT_0"');
  });
  it('builds an accessible H5P Single Choice Set from the selected quiz', async () => {
    let zip;
    window.JSZip = class MockZip {
      constructor() { zip = this; this.files = new Map(); this.generateAsync = vi.fn().mockResolvedValue(new Blob()); }
      file(name, value) { this.files.set(name, value); return this; }
    };
    document.documentElement.lang = 'fr-CA';
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:h5p-quiz');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    let downloadName = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { downloadName = this.download; });
    const addToast = vi.fn();
    const api = createExport({ sourceTopic: 'Topic', addToast, t: (key) => key });

    const result = await api.handleExportH5P({ generatedContent: {
      type: 'quiz',
      title: 'Energy & Matter',
      data: { questions: [
        { question: 'Which is correct <now>?', options: ['Wrong', 'Right & safe'], correctAnswer: 'Right & safe' },
        { question: 'Too many', options: ['A', 'B', 'C', 'D', 'E'], correctAnswer: 'A' },
      ] },
    } });

    expect(result).toBe(true);
    expect([...zip.files.keys()].sort()).toEqual(['content/content.json', 'h5p.json']);
    const metadata = JSON.parse(zip.files.get('h5p.json'));
    expect(metadata).toMatchObject({
      title: 'Energy & Matter',
      language: 'fr',
      mainLibrary: 'H5P.SingleChoiceSet',
      embedTypes: ['iframe'],
      preloadedDependencies: [{ machineName: 'H5P.SingleChoiceSet', majorVersion: 1, minorVersion: 11 }],
    });
    const content = JSON.parse(zip.files.get('content/content.json'));
    expect(content.choices).toHaveLength(1);
    expect(content.choices[0].question).toBe('<p>Which is correct &lt;now&gt;?</p>');
    expect(content.choices[0].answers[0]).toBe('<p>Right &amp; safe</p>');
    expect(content.behaviour).toMatchObject({ autoContinue: false, soundEffectsEnabled: false, enableRetry: true });
    expect(content.l10n).toMatchObject({ nextButton: 'Next', a11yShowSolution: expect.stringContaining('correct solution'), correctAnswerIntroduction: 'Correct answer' });
    expect(downloadName).toBe('Energy-Matter-quiz.h5p');
    expect(addToast).toHaveBeenCalledWith('1 incompatible or incomplete item(s) were omitted from the H5P package.', 'warning');
    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('H5P.SingleChoiceSet 1.11'), 'success');
  });

  it('uses available AlloFlow translations for H5P runtime labels', async () => {
    let zip;
    window.JSZip = class MockZip {
      constructor() { zip = this; this.files = new Map(); this.generateAsync = vi.fn().mockResolvedValue(new Blob()); }
      file(name, value) { this.files.set(name, value); return this; }
    };
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:h5p-localized');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const labels = {
      'common.next': 'Suivant',
      'common.correct': 'Correct',
      'common.incorrect': 'Incorrect',
      'common.close': 'Fermer',
      'common.score': 'Résultat',
    };
    const api = createExport({ sourceTopic: 'Sujet', addToast: vi.fn(), t: (key) => labels[key] || key });

    expect(await api.handleExportH5P({ generatedContent: {
      type: 'quiz', title: 'Questionnaire',
      data: { questions: [{ question: 'Choisir', options: ['Oui', 'Non'], correctAnswer: 'Oui' }] },
    } })).toBe(true);

    const content = JSON.parse(zip.files.get('content/content.json'));
    expect(content.l10n).toMatchObject({
      nextButton: 'Suivant',
      correctText: 'Correct!',
      closeButtonLabel: 'Fermer',
      resultScoreTableHeader: 'Résultat',
    });
  });

  it('builds H5P Dialog Cards from glossary terms and omits incomplete pairs', async () => {
    let zip;
    window.JSZip = class MockZip {
      constructor() { zip = this; this.files = new Map(); this.generateAsync = vi.fn().mockResolvedValue(new Blob()); }
      file(name, value) { this.files.set(name, value); return this; }
    };
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:h5p-cards');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const addToast = vi.fn();
    const api = createExport({ sourceTopic: 'Vocabulary', addToast, t: (key) => key });

    expect(await api.handleExportH5P({ generatedContent: {
      type: 'glossary',
      title: 'Science terms',
      data: [
        { term: 'Atom <A>', def: 'Smallest & unit', imageAltText: 'Atom diagram', image: 'data:image/png;base64,aGVsbG8=', audio: 'data:audio/mpeg;base64,aGVsbG8=' },
        { term: 'Remote', def: 'External image', image: 'https://example.test/remote.png' },
        { term: 'Incomplete', def: '' },
      ],
    } })).toBe(true);

    const metadata = JSON.parse(zip.files.get('h5p.json'));
    expect(metadata.mainLibrary).toBe('H5P.Dialogcards');
    expect(metadata.preloadedDependencies).toEqual([{ machineName: 'H5P.Dialogcards', majorVersion: 1, minorVersion: 9 }]);
    const content = JSON.parse(zip.files.get('content/content.json'));
    expect(content.mode).toBe('normal');
    expect(content.dialogs).toHaveLength(2);
    expect(content.dialogs[0]).toMatchObject({
      text: '<p>Atom &lt;A&gt;</p>', answer: '<p>Smallest &amp; unit</p>', imageAltText: 'Atom diagram',
      image: { path: 'images/card-1.png', mime: 'image/png' },
      audio: [{ path: 'audios/card-1.mp3', mime: 'audio/mpeg' }],
    });
    expect(content.dialogs[1]).not.toHaveProperty('image');
    expect([...zip.files.keys()].sort()).toEqual(['content/audios/card-1.mp3', 'content/content.json', 'content/images/card-1.png', 'h5p.json']);
    expect(content.behaviour).toMatchObject({ enableRetry: true, randomCards: false });
    expect(content).toMatchObject({ answer: 'Turn', prev: 'Previous', progressText: 'Card @card of @total', cardFrontLabel: 'Card front', cardBackLabel: 'Card back' });
    expect(addToast).toHaveBeenCalledWith('1 incompatible or incomplete item(s) were omitted from the H5P package.', 'warning');
    expect(addToast).toHaveBeenCalledWith('1 external, unsupported, or oversized media asset(s) were omitted from the H5P package.', 'warning');
    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('2 embedded media asset(s) included.'), 'success');
  });

  it('exports mixed Assess formats as an H5P Question Set with honest adaptations', async () => {
    let zip;
    window.JSZip = class MockZip {
      constructor() { zip = this; this.files = new Map(); this.generateAsync = vi.fn().mockResolvedValue(new Blob()); }
      file(name, value) { this.files.set(name, value); return this; }
    };
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:h5p-mixed');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const addToast = vi.fn();
    const api = createExport({ sourceTopic: 'Mixed assessment', addToast, t: (key) => key });

    expect(await api.handleExportH5P({ generatedContent: {
      type: 'quiz',
      title: 'Mixed formats',
      data: { questions: [
        { type: 'multi-select', question: 'Select both', options: ['A', 'B', 'C'], correctAnswers: ['A', 'C'] },
        { type: 'fill-blank', question: 'Water freezes at ___ C.', expectedFill: '0', acceptableAlternatives: ['zero'] },
        { type: 'short-answer', question: 'Explain the change.', expectedAnswer: 'Particles slow down.' },
        { type: 'relation-mismatch', question: 'Find the mismatch.', pairs: [{ left: 'A', right: '1' }, { left: 'B', right: '9' }], wrongPairIndex: 1, candidatePartners: ['2', '9'], correctPartnerForWrong: '2' },
        { type: 'answer-evidence', question: 'Choose and support.', answerOptions: ['Yes', 'No'], correctAnswer: 'Yes', evidencePrompt: 'Best evidence?', evidenceOptions: ['Data', 'Guess'], correctEvidence: 'Data' },
        { type: 'numeric-response', question: 'Measure it.', correctValue: 10, tolerance: 0.5, unit: 'cm' },
        { type: 'sequence-sense', question: 'Check the order.', items: ['First', 'Second', 'Third'], presentedOrder: [1, 0, 2], orderingPrinciple: 'chronological' },
      ] },
    } })).toBe(true);

    const metadata = JSON.parse(zip.files.get('h5p.json'));
    expect(metadata.mainLibrary).toBe('H5P.QuestionSet');
    expect(metadata.preloadedDependencies).toEqual(expect.arrayContaining([
      { machineName: 'H5P.QuestionSet', majorVersion: 1, minorVersion: 21 },
      { machineName: 'H5P.MultiChoice', majorVersion: 1, minorVersion: 16 },
      { machineName: 'H5P.Blanks', majorVersion: 1, minorVersion: 14 },
      { machineName: 'H5P.Essay', majorVersion: 1, minorVersion: 5 },
    ]));
    const content = JSON.parse(zip.files.get('content/content.json'));
    expect(content.questions).toHaveLength(9);
    expect(content.questions.map((question) => question.library)).toEqual(expect.arrayContaining([
      'H5P.MultiChoice 1.16', 'H5P.Blanks 1.14', 'H5P.Essay 1.5',
    ]));
    expect(content.questions.find((question) => question.library === 'H5P.Blanks 1.14').params.questions[0]).toContain('*0/zero*');
    expect(content.questions.filter((question) => question.library === 'H5P.Essay 1.5').every((question) => question.params.behaviour.ignoreScoring)).toBe(true);
    expect(addToast).toHaveBeenCalledWith('4 assessment item(s) were adapted to equivalent H5P interactions.', 'info');
    expect(addToast).toHaveBeenCalledWith('3 exported written, sequence, or tolerance-based item(s) are ungraded and require manual review.', 'warning');
    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('H5P.QuestionSet 1.21'), 'success');
  });

  it('repairs blank H5P runtime labels before packaging and reports the accessibility pass', async () => {
    let zip;
    window.JSZip = class MockZip {
      constructor() { zip = this; this.files = new Map(); this.generateAsync = vi.fn().mockResolvedValue(new Blob()); }
      file(name, value) { this.files.set(name, value); return this; }
    };
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:h5p-repaired');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const addToast = vi.fn();
    const api = createExport({
      sourceTopic: 'Topic', addToast,
      t: (key) => key === 'common.next' ? '   ' : key,
    });

    expect(await api.handleExportH5P({ generatedContent: {
      type: 'quiz', title: 'Accessible labels',
      data: { questions: [{ question: 'Choose one', options: ['First', 'Second'], correctAnswer: 'First' }] },
    } })).toBe(true);

    const content = JSON.parse(zip.files.get('content/content.json'));
    expect(content.l10n).toMatchObject({ nextButtonLabel: 'Next', nextButton: 'Next' });
    expect(addToast).toHaveBeenCalledWith('2 H5P accessibility issue(s) were repaired automatically.', 'info');
    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('Accessibility check:'), 'success');
  });

  it('blocks H5P interactions with duplicate answer labels', async () => {
    const generated = vi.fn().mockResolvedValue(new Blob());
    window.JSZip = class MockZip {
      file() { return this; }
      generateAsync = generated;
    };
    const addToast = vi.fn();
    const api = createExport({ sourceTopic: 'Topic', addToast, t: (key) => key });

    expect(await api.handleExportH5P({ generatedContent: {
      type: 'quiz', title: 'Ambiguous answers',
      data: { questions: [{ question: 'Choose one', options: ['Same', ' same '], correctAnswer: 'Same' }] },
    } })).toBe(false);

    expect(generated).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('duplicate answer labels'), 'error');
  });

  it('flags derived image alt text and audio without transcripts for human review', async () => {
    let zip;
    window.JSZip = class MockZip {
      constructor() { zip = this; this.files = new Map(); this.generateAsync = vi.fn().mockResolvedValue(new Blob()); }
      file(name, value) { this.files.set(name, value); return this; }
    };
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:h5p-media-review');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const addToast = vi.fn();
    const api = createExport({ sourceTopic: 'Topic', addToast, t: (key) => key });

    expect(await api.handleExportH5P({ generatedContent: {
      type: 'flashcards', title: 'Media cards',
      data: [{
        front: 'Molecule', back: 'Two or more bonded atoms',
        image: 'data:image/png;base64,aGVsbG8=', audio: 'data:audio/mpeg;base64,aGVsbG8=',
      }],
    } })).toBe(true);

    const content = JSON.parse(zip.files.get('content/content.json'));
    expect(content.dialogs[0].imageAltText).toBe('Molecule');
    expect(addToast).toHaveBeenCalledWith(expect.stringMatching(/2 H5P accessibility item\(s\).*derived.*transcript/i), 'warning');
    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('2 to review'), 'success');
  });
  it('refuses unsupported H5P content instead of manufacturing a package', async () => {
    const generated = vi.fn();
    window.JSZip = class MockZip {
      constructor() { this.generateAsync = generated; }
      file() { return this; }
    };
    const addToast = vi.fn();
    const api = createExport({ sourceTopic: 'Topic', addToast, t: (key) => key });

    expect(await api.handleExportH5P({ generatedContent: { type: 'faq', data: [] } })).toBe(false);
    expect(generated).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith('H5P export supports quizzes, glossaries, and flashcards.', 'error');
  });
});
