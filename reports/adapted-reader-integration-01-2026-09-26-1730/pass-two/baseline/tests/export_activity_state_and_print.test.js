import { beforeAll, describe, expect, it } from 'vitest';
import { JSDOM, VirtualConsole } from 'jsdom';
import { loadAlloModule } from './setup.js';

let pipeline;

beforeAll(() => {
  loadAlloModule('doc_pipeline_module.js');
  const stub = async () => '{}';
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: stub,
    callGeminiVision: stub,
    callImagen: async () => null,
    addToast: () => {},
    t: (key) => key,
    isRtlLang: () => false,
    updateExportPreview: () => {},
    getDefaultTitle: () => 'Document',
    state: {},
  });
});

async function waitForRuntime(dom) {
  await new Promise((resolve) => {
    if (dom.window.document.readyState === 'complete') dom.window.setTimeout(resolve, 0);
    else dom.window.addEventListener('DOMContentLoaded', () => dom.window.setTimeout(resolve, 0), { once: true });
  });
}

function runtimeDom(html, stored = [], options = {}) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (error) => {
    const message = String(error?.stack || error?.message || error || '');
    if (/SyntaxError|Uncaught/i.test(message)) errors.push(message);
  });
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: options.url || 'https://example.test/activity-export.html?nickname=TestLearner',
    virtualConsole,
    beforeParse(win) {
      stored.forEach(([key, value]) => win.localStorage.setItem(key, value));
      if (options.printExport) win.__alloflowPrintExport = true;
      if (Array.isArray(options.storageOps)) {
        const storage = win.localStorage;
        const proto = Object.getPrototypeOf(storage);
        ['getItem', 'setItem', 'removeItem'].forEach((method) => {
          const original = proto[method];
          Object.defineProperty(proto, method, {
            configurable: true,
            writable: true,
            value: function (...args) {
              if (this === storage) options.storageOps.push([method, String(args[0] || '')]);
              return original.apply(this, args);
            },
          });
        });
      }
    },
  });
  return { dom, errors };
}

const vennItem = {
  type: 'outline', id: 'venn-save', title: 'Compare habitats',
  data: {
    main: 'Land and water', structureType: 'Venn Diagram',
    branches: [
      { title: 'Land', items: ['Dry soil'] },
      { title: 'Water', items: ['Ponds'] },
      { title: 'Both', items: ['Living things'] },
    ],
  },
};

const conceptItem = {
  type: 'concept-sort', id: 'concept-save', title: 'Sort matter',
  data: {
    categories: [{ id: 'solid', label: 'Solid' }, { id: 'liquid', label: 'Liquid' }],
    items: [{ id: 'rock', categoryId: 'solid', content: 'Rock' }, { id: 'water', categoryId: 'liquid', content: 'Water' }],
  },
};

describe('exported activity state and printable response space', () => {
  it('keeps one-time shared-device work live without reading or writing learner storage', async () => {
    const quiz = {
      type: 'quiz', id: 'shared-device-live', title: 'Private reflection',
      data: { questions: [{ type: 'self-explanation', question: 'What did you notice?' }], reflections: [] },
    };
    const html = pipeline.generateFullPackHTML([quiz], 'Shared device check', false, {}, {
      includeQuiz: true, includeTeacherKey: false, annotations: [],
    });
    const storageOps = [];
    const session = runtimeDom(html, [], {
      url: 'https://example.test/shared-device.html',
      storageOps,
    });
    await waitForRuntime(session.dom);

    const dialog = session.dom.window.document.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain('Who is working on this resource?');
    const oneTimeButton = Array.from(dialog?.querySelectorAll('button') || [])
      .find((button) => button.textContent.includes('Use once without autosave'));
    oneTimeButton.click();
    await new Promise((resolve) => session.dom.window.setTimeout(resolve, 0));

    const textarea = session.dom.window.document.querySelector('[data-allo-response-key]');
    textarea.value = 'A live answer that should still export.';
    textarea.dispatchEvent(new session.dom.window.Event('input', { bubbles: true }));
    const contract = session.dom.window.__alloflowSubmissionResponseContract;
    expect(session.dom.window.__alloflowLearnerWorkspace).toEqual({ nickname: '', persist: false });
    expect(Object.values(contract.collectAllResponses())).toContain('A live answer that should still export.');
    expect(storageOps.filter(([, key]) => /^(?:allo-response:|allo-ta:|allo-bx:|alloflow-annotations\|)/.test(key))).toEqual([]);
    expect(session.dom.window.localStorage.length).toBe(0);
    session.dom.window.close();
  });

  it('initializes print exports transiently without showing the learner prompt', async () => {
    const html = pipeline.generateFullPackHTML([conceptItem], 'Print privacy check', false, {}, {
      conceptSortInteractive: true, includeTeacherKey: false, annotations: [],
    });
    const printed = runtimeDom(html, [], {
      url: 'https://example.test/print-export.html',
      printExport: true,
    });
    await waitForRuntime(printed.dom);
    expect(printed.dom.window.document.querySelector('[role="dialog"]')).toBeNull();
    expect(printed.dom.window.__alloflowLearnerWorkspace).toEqual({ nickname: '', persist: false });
    expect(printed.dom.window.__alloflowSubmissionResponseContract?.collectNamedResponses).toBeTypeOf('function');
    printed.dom.window.close();
  });

  it('saves and restores Venn and concept-sort placements through the shared submission contract', async () => {
    const html = pipeline.generateFullPackHTML([vennItem, conceptItem], 'Activity pack', false, {}, {
      includeOutline: true,
      vennExportMode: 'activity',
      conceptSortInteractive: true,
      includeTeacherKey: false,
      annotations: [],
    });
    const first = runtimeDom(html);
    await waitForRuntime(first.dom);
    const doc = first.dom.window.document;

    const vennCard = doc.querySelector('.alloflow-venn-card');
    const vennZone = vennCard.getAttribute('data-answer-zone');
    vennCard.querySelector('.alloflow-venn-card-button').click();
    doc.querySelector(`[data-venn-place-zone="${vennZone}"]`).click();

    const conceptStrip = doc.querySelector('.alloflow-cs-strip');
    conceptStrip.click();
    doc.querySelector('.alloflow-cs-place-btn').click();

    const contract = first.dom.window.__alloflowSubmissionResponseContract;
    const responses = contract.collectNamedResponses();
    const manifest = contract.collectManifest();
    expect(first.errors).toEqual([]);
    expect(Object.values(responses)).toEqual(expect.arrayContaining([vennZone, 'solid']));
    expect(manifest.entries.some((entry) => entry.responseType === 'venn-sort' && entry.partLabel === 'Placement')).toBe(true);
    expect(manifest.entries.some((entry) => entry.responseType === 'concept-sort' && entry.valueLabels.solid === 'Solid')).toBe(true);

    const stored = Array.from({ length: first.dom.window.localStorage.length }, (_, index) => {
      const key = first.dom.window.localStorage.key(index);
      return [key, first.dom.window.localStorage.getItem(key)];
    });
    first.dom.window.close();

    const second = runtimeDom(html, stored);
    await waitForRuntime(second.dom);
    const restoredVennSelect = Array.from(second.dom.window.document.querySelectorAll('.alloflow-venn-response')).find((node) => node.value === vennZone);
    const restoredConceptSelect = Array.from(second.dom.window.document.querySelectorAll('.alloflow-cs-response')).find((node) => node.value === 'solid');
    const restoredVenn = restoredVennSelect?.closest('.alloflow-venn-card');
    const restoredConcept = restoredConceptSelect?.closest('.alloflow-cs-strip');
    expect(second.errors).toEqual([]);
    expect(restoredVenn?.parentElement.getAttribute('data-venn-zone-target')).toBe(vennZone);
    expect(restoredConcept?.parentElement.getAttribute('data-dropzone-for')).toBe('solid');
    second.dom.window.close();
  });

  it('keeps graded timeline answers out of source while saving and restoring the student order', async () => {
    const timeline = {
      type: 'timeline', id: 'timeline-assess', title: 'Sequence the events',
      data: { items: [
        { date: '1', event: 'FIRST_EVENT' },
        { date: '2', event: 'SECOND_EVENT' },
        { date: '3', event: 'THIRD_EVENT' },
      ] },
    };
    const html = pipeline.generateFullPackHTML([timeline], 'Timeline assessment', false, {}, {
      timelineDisplayMode: 'cuttable-strips',
      timelineInteractive: true,
      assessmentMode: true,
      includeTeacherKey: true,
      annotations: [],
    });
    const staticDoc = new DOMParser().parseFromString(html, 'text/html');
    const staticOrder = Array.from(staticDoc.querySelectorAll('.alloflow-tl-strip')).map((node) => node.textContent.match(/(?:FIRST|SECOND|THIRD)_EVENT/)?.[0]);
    expect(staticDoc.querySelector('[data-original-index]')).toBeNull();
    expect(staticDoc.querySelector('.alloflow-tl-check-btn')).toBeNull();
    expect(staticOrder).not.toEqual(['FIRST_EVENT', 'SECOND_EVENT', 'THIRD_EVENT']);
    expect(html).not.toContain('Answer Key (teacher reference)');

    const first = runtimeDom(html);
    await waitForRuntime(first.dom);
    const firstStrip = first.dom.window.document.querySelector('.alloflow-tl-strip');
    firstStrip.querySelector('.alloflow-tl-down').click();
    const firstOrder = Array.from(first.dom.window.document.querySelectorAll('.alloflow-tl-strip')).map((node) => node.getAttribute('data-tl-response-id'));
    const contract = first.dom.window.__alloflowSubmissionResponseContract;
    const responses = contract.collectNamedResponses();
    expect(JSON.parse(responses['allo-response:timeline-assess:timeline-order'])).toEqual(firstOrder);
    expect(contract.collectManifest().entries.find((entry) => entry.responseType === 'timeline-order')).toMatchObject({
      partLabel: 'Event order', manualReview: true,
    });
    const stored = Array.from({ length: first.dom.window.localStorage.length }, (_, index) => {
      const key = first.dom.window.localStorage.key(index);
      return [key, first.dom.window.localStorage.getItem(key)];
    });
    first.dom.window.close();

    const second = runtimeDom(html, stored);
    await waitForRuntime(second.dom);
    const restoredOrder = Array.from(second.dom.window.document.querySelectorAll('.alloflow-tl-strip')).map((node) => node.getAttribute('data-tl-response-id'));
    expect(second.errors).toEqual([]);
    expect(restoredOrder).toEqual(firstOrder);
    second.dom.window.close();
  });

  it('offers compact, standard, and extended handwriting space with page-safe print CSS', () => {
    const quiz = {
      type: 'quiz', id: 'writing-space', title: 'Reflection',
      data: { questions: [{ type: 'self-explanation', question: 'Explain your reasoning.' }], reflections: [] },
    };
    const render = (space) => pipeline.generateFullPackHTML([quiz], 'Writing space', true, {}, {
      worksheetResponseSpace: space,
      pageMargin: '1.5in',
      pageSize: 'letter',
      pageOrientation: 'landscape',
      includeTeacherKey: false,
      annotations: [],
    });
    const compact = new DOMParser().parseFromString(render('compact'), 'text/html');
    const standardHtml = render('standard');
    const standard = new DOMParser().parseFromString(standardHtml, 'text/html');
    const extended = new DOMParser().parseFromString(render('extended'), 'text/html');
    expect(compact.querySelectorAll('.alloflow-ruled-line')).toHaveLength(4);
    expect(standard.querySelectorAll('.alloflow-ruled-line')).toHaveLength(5);
    expect(extended.querySelectorAll('.alloflow-ruled-line')).toHaveLength(8);
    expect(extended.querySelector('.alloflow-ruled-response-long')).not.toBeNull();
    expect(standardHtml).toContain('@page { margin: 1.5in; }');
    expect(standardHtml).toContain('max-height: 5.25in');
    expect(standardHtml).toContain('figure img { max-height: 4.60in; }');
    expect(standardHtml).toContain('figure:not(.alloflow-captioned-figure) img { max-height: 5.25in; }');
    expect(standardHtml).not.toContain('figure:has(figcaption)');
    expect(standardHtml).toContain('.question.alloflow-question-long');
    expect(standardHtml).toContain('th, td { overflow-wrap: anywhere; word-break: normal; }');
    expect(standardHtml).toContain('.quiz-box, .alloflow-dbq-synthesis-worksheet');
    const a4Portrait = pipeline.generateFullPackHTML([quiz], 'A4 figure', true, {}, {
      worksheetResponseSpace: 'standard',
      pageMargin: '0.5in',
      pageSize: 'a4',
      pageOrientation: 'portrait',
      includeTeacherKey: false,
      annotations: [],
    });
    expect(a4Portrait).toContain('img { max-width: 100%; max-height: 10.44in');
    expect(a4Portrait).toContain('figure img { max-height: 9.79in; }');
    expect(a4Portrait).toContain('figure:not(.alloflow-captioned-figure) img { max-height: 10.44in; }');
  });

  it('uses worksheet-only print economy and adds identity strips after the first student resource', () => {
    const darkPipeline = window.AlloModules.createDocPipeline({
      callGemini: async () => '{}',
      callGeminiVision: async () => '{}',
      callImagen: async () => null,
      addToast: () => {},
      t: (key) => key,
      isRtlLang: () => false,
      updateExportPreview: () => {},
      getDefaultTitle: () => 'Document',
      state: { exportTheme: 'dark', currentUiLanguage: 'English' },
    });
    const quiz = {
      type: 'quiz', id: 'packet-quiz', title: 'Quick check',
      data: { questions: [{ type: 'self-explanation', question: 'Explain one connection.' }], reflections: [] },
    };
    const worksheetHtml = darkPipeline.generateFullPackHTML(
      [quiz, conceptItem, vennItem],
      'Identity packet',
      true,
      {},
      {
        includeQuiz: true,
        includeOutline: true,
        includeTeacherKey: true,
        conceptSortInteractive: true,
        vennExportMode: 'activity',
        annotations: [],
      },
    );
    const worksheetDom = new JSDOM(worksheetHtml, { runScripts: 'outside-only', pretendToBeVisual: true });
    const worksheetDoc = worksheetDom.window.document;
    const studentResources = Array.from(worksheetDoc.querySelectorAll('#main-export-content > .alloflow-resource-wrap'));
    const continuationStrips = studentResources.flatMap((resource) => Array.from(resource.querySelectorAll(':scope > .alloflow-worksheet-continuation')));

    expect(worksheetDoc.body.getAttribute('data-alloflow-output')).toBe('worksheet');
    expect(worksheetDoc.documentElement.getAttribute('data-alloflow-output')).toBe('worksheet');
    expect(studentResources).toHaveLength(3);
    expect(studentResources[0].querySelector('.alloflow-worksheet-continuation')).toBeNull();
    expect(continuationStrips).toHaveLength(2);
    expect(continuationStrips.every((strip) => strip.textContent.includes('Identity packet'))).toBe(true);
    expect(worksheetDoc.querySelector('.teacher-view .alloflow-worksheet-continuation')).toBeNull();
    expect(worksheetDom.window.getComputedStyle(worksheetDoc.body).backgroundColor).toBe('rgb(15, 23, 42)');
    expect(worksheetDom.window.getComputedStyle(continuationStrips[0]).display).toBe('none');
    expect(worksheetHtml).toContain('Final worksheet-only print layer');
    expect(worksheetHtml).toContain('body[data-alloflow-output="worksheet"]');
    expect(worksheetHtml).toContain('-webkit-print-color-adjust: economy !important');
    expect(worksheetHtml).toContain('.venn-print-wrapper, .flowchart-print-wrapper');
    expect(worksheetHtml).toContain('print-color-adjust: exact !important');

    const regularHtml = darkPipeline.generateFullPackHTML([quiz], 'Dark HTML', false, {}, {
      includeQuiz: true, includeTeacherKey: false, annotations: [],
    });
    const regularDom = new JSDOM(regularHtml, { runScripts: 'outside-only', pretendToBeVisual: true });
    expect(regularDom.window.document.body.hasAttribute('data-alloflow-output')).toBe(false);
    expect(regularDom.window.document.documentElement.getAttribute('data-alloflow-output')).toBe('interactive');
    expect(regularDom.window.getComputedStyle(regularDom.window.document.body).backgroundColor).toBe('rgb(15, 23, 42)');
    worksheetDom.window.close();
    regularDom.window.close();
  });

  it('localizes the learner save panels and encrypted save states', () => {
    const spanishPipeline = window.AlloModules.createDocPipeline({
      callGemini: async () => '{}',
      callGeminiVision: async () => '{}',
      callImagen: async () => null,
      addToast: () => {},
      t: (key) => key,
      isRtlLang: () => false,
      updateExportPreview: () => {},
      getDefaultTitle: () => 'Documento',
      state: { leveledTextLanguage: 'Spanish' },
    });
    const quiz = {
      type: 'quiz', id: 'localized-save', title: 'Comprobación',
      data: { questions: [{ type: 'self-explanation', question: 'Explica tu respuesta.' }], reflections: [] },
    };
    const html = spanishPipeline.generateFullPackHTML([quiz], 'Trabajo', false, {}, {
      includeQuiz: true,
      includeTeacherKey: false,
      classPublicJwk: { kty: 'RSA', n: 'test', e: 'AQAB' },
      annotations: [],
    });
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const runtimeCopy = JSON.parse(doc.getElementById('alloflow-runtime-copy').textContent);
    expect(doc.documentElement.lang).toBe('es');
    expect(doc.querySelector('a[href="#main-export-content"]')?.textContent).toBe('Saltar al contenido');
    expect(doc.querySelector('.alloflow-reading-tools-shell')?.getAttribute('aria-label')).toBe('Herramientas de lectura y anotación');
    expect(doc.querySelector('.alloflow-tools-toggle span')?.textContent).toBe('Herramientas');
    expect(doc.querySelector('.alloflow-export-save-tools')?.getAttribute('aria-label')).toBe('Guardar y entregar tu trabajo');
    expect(doc.getElementById('alloflow-save-cta')?.textContent).toContain('¿Terminaste tu trabajo?');
    expect(doc.getElementById('alloflow-save-submission-btn')?.textContent).toContain('Guardar mi trabajo');
    expect(runtimeCopy.saving).toBe('Guardando…');
    expect(runtimeCopy.mailboxFallback).toContain('buzón de clase');
    expect(doc.querySelector('.a11y-badge')?.getAttribute('aria-label')).toBe('Información de accesibilidad');
    expect(doc.querySelector('.a11y-badge strong')?.textContent).toContain('Funciones de accesibilidad');
    expect(doc.getElementById('alloflow-print-link-reference')?.getAttribute('aria-label')).toBe('Enlaces web de este recurso');
    expect(html).toContain('@media(prefers-color-scheme:dark)');
    expect(html).toContain('svg, canvas, video, iframe { max-width: 100% !important;');
  });

  it('numbers and deduplicates printable web-link references at runtime', async () => {
    const quiz = {
      type: 'quiz', id: 'print-links', title: 'Research links',
      data: { questions: [{ type: 'self-explanation', question: 'Summarize the source.' }], reflections: [] },
    };
    const generated = pipeline.generateFullPackHTML([quiz], 'Print links', false, {}, {
      includeQuiz: true, includeTeacherKey: false, annotations: [],
    });
    const html = generated.replace(
      '<div class="a11y-badge"',
      '<p data-print-link-fixture><a href="https://example.test/research?q=1">Research source</a> <a href="https://example.test/research?q=1">Same source</a> <a href="#main-export-content">Internal</a> <a href="mailto:teacher@example.test">Email</a></p><div class="a11y-badge"',
    );
    const session = runtimeDom(html, [], { printExport: true });
    await waitForRuntime(session.dom);
    const doc = session.dom.window.document;
    const reference = doc.getElementById('alloflow-print-link-reference');
    const links = Array.from(doc.querySelectorAll('[data-print-link-fixture] a'));
    expect(reference?.classList.contains('alloflow-has-links')).toBe(true);
    expect(reference?.querySelectorAll('li')).toHaveLength(1);
    expect(reference?.querySelector('li')?.textContent).toContain('https://example.test/research?q=1');
    expect(links[0].getAttribute('data-alloflow-print-link-number')).toBe('1');
    expect(links[1].getAttribute('data-alloflow-print-link-number')).toBe('1');
    expect(links[2].hasAttribute('data-alloflow-print-link-number')).toBe(false);
    expect(links[3].hasAttribute('data-alloflow-print-link-number')).toBe(false);
    expect(session.errors).toEqual([]);
    session.dom.window.close();
  });

  it('never places DBQ teacher notes in the student document', () => {
    const dbq = {
      type: 'dbq', id: 'dbq-private', title: 'Source analysis',
      data: { documents: [], synthesisPrompt: 'Write a claim.', rubric: [], teacherNotes: 'SECRET_DBQ_NOTE_9182' },
    };
    const student = pipeline.generateFullPackHTML([dbq], 'DBQ', false, {}, { includeDbq: true, includeTeacherKey: false, annotations: [] });
    const combined = pipeline.generateFullPackHTML([dbq], 'DBQ', false, {}, { includeDbq: true, includeTeacherKey: true, annotations: [] });
    const studentDoc = new DOMParser().parseFromString(student, 'text/html');
    const combinedDoc = new DOMParser().parseFromString(combined, 'text/html');
    expect(student).not.toContain('SECRET_DBQ_NOTE_9182');
    expect(studentDoc.querySelector('[data-allo-teacher-only]')).toBeNull();
    expect(combinedDoc.querySelector('.teacher-view [data-allo-teacher-only="1"]')?.textContent).toContain('SECRET_DBQ_NOTE_9182');
  });
});
