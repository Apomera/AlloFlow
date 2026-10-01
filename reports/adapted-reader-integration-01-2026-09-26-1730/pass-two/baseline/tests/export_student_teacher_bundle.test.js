import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

let separateStudentTeacherHtml;
let handlersApi;

beforeAll(() => {
  loadAlloModule('export_handlers_module.js');
  handlersApi = window.AlloModules.ExportHandlers;
  separateStudentTeacherHtml = handlersApi.separateStudentTeacherHtml;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  document.getElementById('allo-private-teacher-download')?.remove();
  document.getElementById('allo-project-backup-download')?.remove();
});

describe('student and teacher HTML export bundle', () => {
  it('removes the complete teacher appendix from the student copy and marks the teacher copy', () => {
    const source = '<!DOCTYPE html><html><head><title>Energy lesson</title></head><body>' +
      '<main><h1>Energy lesson</h1><p>Student reading</p><div class="page-break"></div>' +
      '<div class="teacher-view"><h1>Teacher key</h1><p class="answer-key">SECRET ANSWER</p></div></main>' +
      '</body></html>';
    const copies = separateStudentTeacherHtml(source);
    const student = new DOMParser().parseFromString(copies.studentHtml, 'text/html');
    const teacher = new DOMParser().parseFromString(copies.teacherHtml, 'text/html');

    expect(student.querySelector('.teacher-view')).toBeNull();
    expect(student.querySelector('.answer-key')).toBeNull();
    expect(student.body.textContent).not.toContain('SECRET ANSWER');
    expect(student.querySelector('.page-break')).toBeNull();
    expect(teacher.body.textContent).toContain('SECRET ANSWER');
    expect(teacher.title).toBe('TEACHER COPY — Energy lesson');
    expect(teacher.querySelector('.alloflow-teacher-copy-banner')?.textContent).toContain('DO NOT SHARE WITH STUDENTS');
  });

  it('fails closed when it cannot verify an answer-key section', () => {
    expect(() => separateStudentTeacherHtml('<html><body><main>Student only</main></body></html>')).toThrow(/could not be verified/i);
  });

  it('sanitizes stale edited assessment HTML before download', () => {
    const unsafe = '<html><head><title>TEACHER COPY — Test</title></head><body><main>' +
      '<div class="question" data-correct="2">Question</div><div class="alloflow-cs-strip" data-category-id="answer-a">Card</div>' +
      '<div class="alloflow-tl-controls"><button class="alloflow-tl-check-btn">Check order</button></div>' +
      '<div class="alloflow-tl-strips"><div class="alloflow-tl-strip" data-original-index="0">FIRST</div><div class="alloflow-tl-strip" data-original-index="1">SECOND</div><div class="alloflow-tl-strip" data-original-index="2">THIRD</div></div>' +
      '<div class="quiz-controls">Check</div><section class="teacher-view"><p class="answer-key">SECRET_STALE_KEY</p></section>' +
      '</main></body></html>';
    const safe = handlersApi.sanitizeAssessmentStudentHtml(unsafe);
    const doc = new DOMParser().parseFromString(safe, 'text/html');
    expect(doc.body.textContent).not.toContain('SECRET_STALE_KEY');
    expect(doc.querySelector('.teacher-view')).toBeNull();
    expect(doc.querySelector('.question')?.getAttribute('data-correct')).toBe('');
    expect(doc.querySelector('.alloflow-cs-strip')?.getAttribute('data-category-id')).toBe('');
    expect(doc.querySelector('[data-original-index]')).toBeNull();
    expect(doc.querySelector('.alloflow-tl-check-btn')).toBeNull();
    expect(Array.from(doc.querySelectorAll('.alloflow-tl-strip')).map((node) => node.textContent)).not.toEqual(['FIRST', 'SECOND', 'THIRD']);
    expect(doc.getElementById('alloflow-assessment-export-safety')?.textContent).toContain('.quiz-controls');
    expect(doc.title).toBe('Test');
  });

  it('sanitizes stale assessment content before worksheet print handoff', async () => {
    const unsafe = '<!DOCTYPE html><html><head><title>Worksheet</title></head><body><main><p>Student prompt</p>' +
      '<div class="question" data-correct="1">Question</div><section class="teacher-view">SECRET_PRINT_KEY</section>' +
      '</main></body></html>';
    const writes = [];
    const fakeWindow = {
      document: {
        fonts: { ready: Promise.resolve() }, images: [],
        write: (value) => writes.push(String(value)), close: () => {},
      },
      focus: () => {},
      print: vi.fn(),
    };
    vi.spyOn(window, 'open').mockReturnValue(fakeWindow);
    const result = await handlersApi.executeExportFromPreview({
      _docPipeline: {},
      exportPreviewMode: 'worksheet',
      exportPreviewRef: { current: null },
      generateFullPackHTML: () => unsafe,
      getExportableHistory: () => [{}],
      getSkippedResources: () => [],
      exportConfig: { assessmentMode: true, includeTeacherKey: true },
      history: [{}],
      addToast: () => {},
      t: (key) => key,
      setShowExportPreview: () => {},
    });
    expect(result).toBe(true);
    expect(fakeWindow.__alloflowPrintExport).toBe(true);
    expect(fakeWindow.print).toHaveBeenCalledOnce();
    expect(writes.join('')).not.toContain('SECRET_PRINT_KEY');
    expect(writes.join('')).toContain('data-correct=""');
  });

  it('removes teacher-only text from standard and structured narration sources', () => {
    const doc = new DOMParser().parseFromString(
      '<html><body><main><section><h1>Student heading</h1><p>Visible student reading.</p></section>' +
      '<section class="teacher-view" data-ka-readable><h2>Teacher notes</h2><p>SECRET_RUBRIC_917</p></section></main></body></html>',
      'text/html'
    );
    const standard = handlersApi.audioReadyTextFromRoot(doc.documentElement, { studentSafe: true });
    const structured = handlersApi.structuredAudioTextFromRoot(doc.documentElement, { studentSafe: true });
    expect(standard).toContain('Visible student reading');
    expect(structured).toContain('Visible student reading');
    expect(standard).not.toContain('SECRET_RUBRIC_917');
    expect(structured).not.toContain('SECRET_RUBRIC_917');
    expect(handlersApi.audioReadyTextFromRoot(doc.documentElement)).toContain('SECRET_RUBRIC_917');
  });

  it('never sends a teacher-only readable passage to inline TTS', async () => {
    const doc = new DOMParser().parseFromString(
      '<html><head></head><body><main><section data-ka-readable><p>Student passage sentence.</p></section>' +
      '<section class="teacher-view" data-ka-readable><p>SECRET_INLINE_AUDIO_442.</p></section></main></body></html>',
      'text/html'
    );
    const spoken = [];
    await handlersApi.karaokeProcess(doc.documentElement, {
      mode: { quality: 'embedded', variants: ['standard'], inlinePassageAudio: true },
      singleFile: true,
      studentSafeAudio: true,
      callTTS: async (text) => { spoken.push(String(text)); return 'data:audio/wav;base64,UklGRgAAAAA='; },
      selectedVoice: 'Puck',
      addToast: () => {},
    });
    expect(spoken.join('\n')).toContain('Student passage sentence');
    expect(spoken.join('\n')).not.toContain('SECRET_INLINE_AUDIO_442');
  });

  it('adds sentence highlighting without flattening links, notation, ruby, or citations', async () => {
    const doc = new DOMParser().parseFromString(
      '<html><head></head><body><main><section data-ka-readable><h2>Science</h2><p id="reading">' +
      'Water is <a id="source-link" href="#source"><em>H<sub>2</sub>O</em></a>, written with ' +
      '<ruby id="term"><rb>漢</rb><rt>kan</rt></ruby> and <math id="formula" aria-label="x squared"><msup><mi>x</mi><mn>2</mn></msup></math> in <cite id="citation">the source</cite>.' +
      '<sup><a id="note-link" role="doc-noteref" href="#note">1</a></sup> A second sentence stays readable.</p>' +
      '<aside id="note">Footnote text.</aside></section></main></body></html>',
      'text/html'
    );
    const paragraph = doc.getElementById('reading');
    const sourceLink = doc.getElementById('source-link');
    const ruby = doc.getElementById('term');
    const math = doc.getElementById('formula');
    const citation = doc.getElementById('citation');
    const noteLink = doc.getElementById('note-link');
    const originalText = paragraph.textContent;
    const rubyMarkup = ruby.innerHTML;
    const mathMarkup = math.innerHTML;
    const spoken = [];

    await handlersApi.karaokeProcess(doc.documentElement, {
      mode: { quality: 'embedded', variants: ['standard'], inlinePassageAudio: true },
      singleFile: true,
      studentSafeAudio: true,
      callTTS: async (text) => { spoken.push(String(text)); return 'data:audio/wav;base64,UklGRgAAAAA='; },
      selectedVoice: 'Puck',
      addToast: () => {},
    });

    expect(paragraph.textContent).toBe(originalText);
    expect(doc.getElementById('source-link')).toBe(sourceLink);
    expect(doc.getElementById('term')).toBe(ruby);
    expect(doc.getElementById('formula')).toBe(math);
    expect(doc.getElementById('citation')).toBe(citation);
    expect(doc.getElementById('note-link')).toBe(noteLink);
    expect(ruby.innerHTML).toBe(rubyMarkup);
    expect(math.innerHTML).toBe(mathMarkup);
    expect(ruby.querySelector('.ka-s')).toBeNull();
    expect(math.querySelector('.ka-s')).toBeNull();
    expect(ruby.parentElement?.matches('.ka-s[data-ka-s="0"]')).toBe(true);
    expect(math.parentElement?.matches('.ka-s[data-ka-s="0"]')).toBe(true);
    expect(paragraph.querySelectorAll('.ka-s[data-ka-s="0"]').length).toBeGreaterThan(4);
    expect(paragraph.querySelector('.ka-s[data-ka-s="0"][data-ka-text]')?.getAttribute('data-ka-text')).toContain('x squared');
    expect(spoken[0]).toContain('H2O');
    expect(spoken[0]).toContain('x squared');
    expect(spoken[0]).not.toContain('kan');
    expect(spoken[1]).toContain('second sentence');
  });

  it('keeps partial passage audio usable and explains missing sentences in the exported file', async () => {
    const doc = new DOMParser().parseFromString(
      '<html><head><script type="application/json" id="alloflow-runtime-copy">{"readAloudPartial":"Audio disponible para {ready} de {total} oraciones. Lee el texto de las partes que faltan."}</script></head><body><main><section data-ka-readable><h2>Reading</h2>' +
      '<p>First sentence. Second sentence. Third sentence.</p></section></main></body></html>',
      'text/html'
    );
    const toasts = [];
    let calls = 0;

    await handlersApi.karaokeProcess(doc.documentElement, {
      mode: { quality: 'embedded', variants: ['standard'], inlinePassageAudio: true },
      singleFile: true,
      studentSafeAudio: true,
      callTTS: async () => {
        calls++;
        return calls === 2 ? null : 'data:audio/wav;base64,UklGRgAAAAA=';
      },
      selectedVoice: 'Puck',
      addToast: (message) => toasts.push(String(message)),
    });

    const bar = doc.querySelector('.allo-ka-bar');
    const note = bar?.querySelector('.allo-ka-status[role="note"]');
    const button = bar?.querySelector('.allo-ka-play');
    expect(doc.querySelectorAll('.allo-ka-audios audio')).toHaveLength(2);
    expect(note?.textContent).toContain('2 de 3 oraciones');
    expect(note?.textContent).toContain('partes que faltan');
    expect(button?.getAttribute('aria-describedby')).toBe(note?.id);
    expect(toasts.join('\n')).toContain('1 of 3 sentences');
  });

  it('downloads the STUDENT HTML separately from a teacher-only ZIP', async () => {
    const source = '<!DOCTYPE html><html><head><title>Energy lesson</title></head><body><main><p>Student reading</p>' +
      '<section class="teacher-view"><p>SECRET ANSWER</p></section></main></body></html>';
    const zipEntries = [];
    class FakeZip {
      file(name, value) { zipEntries.push({ name, value }); return this; }
      async generateAsync() { return new Blob(['teacher-only']); }
    }
    const oldZip = window.JSZip;
    window.JSZip = FakeZip;
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => 'blob:test-' + blob.size);
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const downloads = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { downloads.push(this.download); });
    try {
      await handlersApi.downloadSeparatedStudentTeacher({ htmlContent: source, htmlName: 'Energy lesson', history: [{ secret: true }] });
    } finally {
      window.JSZip = oldZip;
    }
    expect(downloads).toHaveLength(1);
    expect(downloads[0]).toBe('Energy lesson-STUDENT.html');
    const privateLink = document.querySelector('#allo-private-teacher-download a[download]');
    expect(privateLink?.download).toMatch(/^Energy lesson-TEACHER-MATERIALS-\d{4}-\d{2}-\d{2}\.zip$/);
    expect(zipEntries.map((entry) => entry.name)).toEqual([
      'Energy lesson-TEACHER-KEY.html',
      'Energy lesson-TEACHER-PROJECT-DO-NOT-SHARE.json',
    ]);
    expect(zipEntries.some((entry) => entry.name.includes('STUDENT'))).toBe(false);
  });

  it('auto-downloads generic HTML once and keeps the editable project behind a user gesture', async () => {
    vi.useFakeTimers();
    let objectUrlIndex = 0;
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:generic-' + (++objectUrlIndex));
    const revokeUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const downloads = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { downloads.push(this.download); });
    const toasts = [];

    const result = await handlersApi.handleExport('html', {
      _docPipeline: {},
      generateFullPackHTML: () => '<!doctype html><html><head><title>Energy lesson</title></head><body><main>Student lesson</main></body></html>',
      getExportableHistory: () => [{}],
      getSkippedResources: () => [],
      exportConfig: { includeTeacherKey: false, assessmentMode: false, separateTeacherStudentFiles: false },
      history: [{ id: 'editable-project' }],
      addToast: (message, tone) => toasts.push([message, tone]),
      t: (key) => key,
    });

    expect(result).toBe(true);
    expect(downloads).toEqual(['Energy lesson.html']);
    const projectLink = document.querySelector('#allo-project-backup-download a[download]');
    expect(projectLink?.download).toBe('Energy lesson-project.json');
    expect(createUrl).toHaveBeenCalledTimes(2);
    expect(revokeUrl).not.toHaveBeenCalled();
    expect(toasts.some(([message]) => /Project backup is ready/i.test(message))).toBe(true);

    vi.advanceTimersByTime(4000);
    expect(revokeUrl).toHaveBeenCalledWith('blob:generic-1');
    expect(revokeUrl).not.toHaveBeenCalledWith('blob:generic-2');
    projectLink.dispatchEvent(new Event('click'));
    vi.advanceTimersByTime(3999);
    expect(revokeUrl).not.toHaveBeenCalledWith('blob:generic-2');
    vi.advanceTimersByTime(1);
    expect(revokeUrl).toHaveBeenCalledWith('blob:generic-2');
  });

  it('exports assessment preview HTML without any raw project artifact', async () => {
    const assessment = '<!DOCTYPE html><html><head><title>Secure assessment</title></head><body><main><h1>Assessment</h1><p>Student-safe questions.</p></main></body></html>';
    const oldZip = window.JSZip;
    window.JSZip = class UnexpectedZip { constructor() { throw new Error('assessment must not zip'); } };
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:assessment');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const downloads = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { downloads.push(this.download); });
    try {
      const promise = handlersApi.executeExportFromPreview({
        _docPipeline: {},
        exportPreviewMode: 'html',
        exportPreviewRef: { current: null },
        generateFullPackHTML: () => assessment,
        getExportableHistory: () => [{ correctAnswer: 'SECRET' }],
        getSkippedResources: () => [],
        exportConfig: { assessmentMode: true, includeTeacherKey: false },
        history: [{ correctAnswer: 'SECRET' }],
        addToast: () => {},
        t: (key) => key,
        setShowExportPreview: () => {},
      });
      document.querySelector('[data-r="no"]')?.click();
      expect(await promise).toBe(true);
    } finally {
      window.JSZip = oldZip;
    }
    expect(downloads).toEqual(['Secure assessment.html']);
    expect(downloads.some((name) => /project|zip/i.test(name))).toBe(false);
  });

  it('exports direct assessment HTML without any raw project artifact', async () => {
    const assessment = '<!DOCTYPE html><html><head><title>Direct assessment</title></head><body><main><p>Student-safe questions.</p></main></body></html>';
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:direct-assessment');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const downloads = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { downloads.push(this.download); });
    const result = await handlersApi.handleExport('html', {
      _docPipeline: {},
      generateFullPackHTML: () => assessment,
      getExportableHistory: () => [{ correctAnswer: 'SECRET' }],
      getSkippedResources: () => [],
      exportConfig: { assessmentMode: true, includeTeacherKey: false },
      history: [{ correctAnswer: 'SECRET' }],
      addToast: () => {},
      t: (key) => key,
    });
    expect(result).toBe(true);
    expect(downloads).toEqual(['Direct assessment.html']);
    expect(downloads.some((name) => /project|zip/i.test(name))).toBe(false);
  });

  it('uses the same fail-closed split in the direct no-preview HTML path', async () => {
    const malformed = '<!DOCTYPE html><html><head><title>Unsafe lesson</title></head><body><main><p>Combined content but no teacher marker.</p></main></body></html>';
    const oldZip = window.JSZip;
    window.JSZip = undefined;
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:unexpected');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const safeDownloadBlob = vi.fn();
    let result;
    try {
      result = await handlersApi.handleExport('html', {
        _docPipeline: {},
        generateFullPackHTML: () => malformed,
        getExportableHistory: () => [{}],
        getSkippedResources: () => [],
        exportConfig: { includeTeacherKey: true, assessmentMode: false, separateTeacherStudentFiles: true },
        history: [],
        t: (key) => key,
        addToast: () => {},
        safeDownloadBlob,
      });
    } finally {
      window.JSZip = oldZip;
    }
    expect(result).toBe(false);
    expect(clickSpy).not.toHaveBeenCalled();
    expect(safeDownloadBlob).not.toHaveBeenCalled();
  });

  it('defaults the safety option on and exposes a clear Builder toggle', () => {
    const host = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
    const preview = readFileSync(resolve(process.cwd(), 'view_export_preview_source.jsx'), 'utf8');
    const handlers = readFileSync(resolve(process.cwd(), 'export_handlers_module.js'), 'utf8');
    expect(host).toContain('separateTeacherStudentFiles: true');
    expect(host).toContain('const _EXPORT_PRESET_SCHEMA_VERSION = 6');
    expect(host).toContain("worksheetResponseSpace: 'standard'");
    expect(preview).toContain('Separate student + teacher files');
    expect(preview).toContain('separateTeacherStudentFiles !== false');
    expect(preview).toContain('Embed generated audio in HTML');
    expect(handlers).toContain("htmlName + '-STUDENT.html'");
    expect(handlers).toContain("htmlName + '-TEACHER-KEY.html'");
    expect(handlers).toContain("htmlName + '-TEACHER-PROJECT-DO-NOT-SHARE.json'");
    expect(handlers).toContain('studentSafeAudio: _separateTeacherStudent');
    expect(handlers).toContain('if (_alloShouldSeparateStudentTeacher(exportConfig))');
    expect(handlers).toContain('if (_assessmentStudentOnly)');
    expect(handlers).toContain('Assessment HTML downloaded without answer-bearing project data.');
  });
});
