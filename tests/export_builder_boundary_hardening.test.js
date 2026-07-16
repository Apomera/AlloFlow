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
    expect(addToast).toHaveBeenCalledWith('No valid multiple-choice questions are ready for QTI export.', 'error');
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
