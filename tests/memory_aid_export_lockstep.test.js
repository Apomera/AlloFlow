import { beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

// Memory Aid Studio export lockstep (2026-09-02).
//
// Bug class: the doc_pipeline export branch re-derived the module's rules by
// hand and drifted. It accepted the module's own alt-text placeholder as a
// "specific" description (shipping an unreviewed image on the accessible
// recall worksheet) and treated an unlocked card as verified. The slides
// preview dumped the raw resource JSON, including the private source excerpt.
//
// Contract now: every export lane reads window.AlloModules.MemoryAid.exportRules
// and fails SAFE when the module is absent. These tests pin agreement between
// the live view's verdicts and each export lane.

const require = createRequire(import.meta.url);
let H;
let rules;
let pipeline;
let handlers;

function makePipeline() {
  return window.AlloModules.createDocPipeline({
    callGemini: async () => '{}',
    callGeminiVision: async () => '{}',
    callImagen: async () => null,
    addToast: () => {},
    t: (key) => key,
    isRtlLang: () => false,
    updateExportPreview: () => {},
    getDefaultTitle: () => 'Document',
    state: {},
  });
}

function item(cards, extra = {}) {
  return {
    id: 'ma-lockstep',
    type: 'memory-aid',
    title: 'Remember Matter',
    data: {
      instructions: 'Use the cue before checking the facts.',
      reflectionLevel: 'quick',
      reasoningRequired: false,
      sourceExcerpt: 'PRIVATE_SOURCE_EXCERPT_TEXT',
      lessonRef: { sourceTextSnippet: 'PRIVATE_LESSON_SNIPPET' },
      cards,
      ...extra,
    },
  };
}

function section(html) {
  return new DOMParser().parseFromString(html, 'text/html').querySelector('.memory-aid-export');
}

const worksheet = (cards) => section(pipeline.generateFullPackHTML([item(cards)], 'Memory recall', true, {}, { includeTeacherKey: false, annotations: [] }));
const fullExport = (cards, cfg = {}) => pipeline.generateFullPackHTML([item(cards)], 'Memory recall', false, {}, { includeTeacherKey: false, annotations: [], ...cfg });

const verifiedCard = {
  id: 'c-verified',
  target: 'States of matter',
  essentialFacts: ['Solids retain shape.'],
  factLocked: true,
  factVerified: true,
  type: 'analogy-pattern',
  mode: 'generated',
  aiExample: 'A statue stays shaped; a guest fits the room.',
  studentDraft: 'My statue cue',
  studentReasoning: 'Statue is solid.',
};

beforeAll(() => {
  global.React = window.React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  loadAlloModule('memory_aid_module.js');
  loadAlloModule('doc_pipeline_module.js');
  loadAlloModule('export_handlers_module.js');
  H = window.AlloModules.MemoryAid._testing;
  rules = window.AlloModules.MemoryAid.exportRules;
  pipeline = makePipeline();
  handlers = window.AlloModules.ExportHandlers
    || Object.values(window.AlloModules).find((m) => m && typeof m.getSlidesPreviewHTML === 'function');
});

describe('Memory Aid export rules are shared with the live view', () => {
  it('publishes the rule set the export lanes consume', () => {
    expect(rules).toBeTruthy();
    for (const fn of ['isSpecificVisualAlt', 'isCardVerified', 'placeholderVisualAlt', 'normalizeImage', 'practiceCue']) {
      expect(typeof rules[fn]).toBe('function');
    }
    const card = { target: 'X', essentialFacts: ['F'], factLocked: false, factVerified: true, visualAlt: H.buildMemoryAidVisualAlt({ target: 'X' }) };
    expect(rules.isCardVerified(card)).toBe(H.normalizeMemoryAidCard(card, 0, {}).factVerified);
    expect(rules.isSpecificVisualAlt(card.visualAlt)).toBe(false);
    expect(rules.isSpecificVisualAlt('A gray statue beside a clear glass.')).toBe(true);
    expect(rules.placeholderVisualAlt(card)).toBe(H.buildMemoryAidVisualAlt(card));
    expect(rules.practiceCue(verifiedCard)).toBe(H.memoryAidPracticeCue(verifiedCard));
  });

  it('omits a visual whose stored description is the module placeholder from the accessible recall sheet', () => {
    const placeholder = H.buildMemoryAidVisualAlt({ target: 'States of matter' });
    const card = {
      ...verifiedCard,
      mode: 'student-authored',
      aiExample: '',
      studentDraft: '',
      studentReasoning: '',
      visualImage: 'data:image/png;base64,AAAA',
      visualSource: 'uploaded',
      visualAlt: placeholder + ' Extra word.',
    };
    expect(H.memoryAidVisualAltReady(card).ok).toBe(false);
    expect(H.memoryAidPracticeReady(card).ok).toBe(false);
    const sheet = worksheet([card]);
    expect(sheet.querySelector('img')).toBeNull();
    expect(sheet.textContent).toContain('Visual cue omitted');
  });

  it('prints an unlocked card as authoring-only even when a stale verified flag is set', () => {
    const card = { ...verifiedCard, factLocked: false };
    expect(H.memoryAidPracticeReady(card).ok).toBe(false);
    const sheet = worksheet([card]);
    expect(sheet.querySelector('.memory-aid-recall-sheet')).toBeNull();
    expect(sheet.querySelector('.memory-aid-authoring-sheet')).not.toBeNull();
    expect(sheet.textContent).toContain('Authoring only');
    expect(sheet.textContent).not.toContain('Recall practice · facts hidden');
  });

  it('still prints a locked, verified card as the answer-free recall sheet', () => {
    const sheet = worksheet([verifiedCard]);
    expect(sheet.querySelector('.memory-aid-recall-sheet')).not.toBeNull();
    expect(sheet.textContent).toContain('Recall practice · facts hidden');
    expect(sheet.textContent).not.toContain('Solids retain shape.');
  });

  it('uses the module placeholder wording for an image with no description in the full reference', () => {
    const card = { ...verifiedCard, visualImage: 'data:image/png;base64,AAAA', visualSource: 'ai-generated', visualAlt: '' };
    const doc = section(fullExport([card]));
    expect(doc.querySelector('img').getAttribute('alt')).toBe(H.buildMemoryAidVisualAlt(card));
    expect(doc.textContent).toContain('A specific description of visible details is still needed.');
  });

  it('fails safe when the Memory Aid module is not loaded', () => {
    const saved = window.AlloModules.MemoryAid;
    delete window.AlloModules.MemoryAid;
    try {
      const fresh = makePipeline();
      const card = { ...verifiedCard, visualImage: 'data:image/png;base64,AAAA', visualSource: 'uploaded', visualAlt: 'A gray statue beside a clear glass.' };
      const sheet = section(fresh.generateFullPackHTML([item([card])], 'Memory recall', true, {}, { includeTeacherKey: false, annotations: [] }));
      expect(sheet.querySelector('.memory-aid-recall-sheet')).toBeNull();
      expect(sheet.querySelector('.memory-aid-authoring-sheet')).not.toBeNull();
      expect(sheet.querySelector('img')).toBeNull();
      const full = section(fresh.generateFullPackHTML([item([card])], 'Memory recall', false, {}, { includeTeacherKey: false, annotations: [] }));
      expect(full.textContent).toContain('Your teacher is still checking these facts');
    } finally {
      window.AlloModules.MemoryAid = saved;
    }
  });
});

describe('Memory Aid interactive HTML export', () => {
  it('gives students real autosaving fields in the downloaded HTML but not on paper or in the teacher appendix', () => {
    const doc = section(fullExport([verifiedCard]));
    const draft = doc.querySelector('textarea.interactive-textarea[data-allo-response-key="ma-lockstep:card0:draft"]');
    const reasoning = doc.querySelector('textarea.interactive-textarea[data-allo-response-key="ma-lockstep:card0:reasoning"]');
    expect(draft).not.toBeNull();
    expect(draft.value).toBe('My statue cue');
    expect(draft.getAttribute('aria-label')).toContain('States of matter');
    expect(reasoning).not.toBeNull();
    expect(reasoning.value).toBe('Statue is solid.');

    const paper = worksheet([verifiedCard]);
    expect(paper.querySelector('textarea')).toBeNull();

    const teacherHtml = pipeline.generateFullPackHTML([item([verifiedCard])], 'Memory recall', true, {}, { includeTeacherKey: true, annotations: [] });
    const teacherDoc = new DOMParser().parseFromString(teacherHtml, 'text/html');
    const appendix = teacherDoc.querySelector('.teacher-view .memory-aid-export') || teacherDoc.querySelectorAll('.memory-aid-export')[1];
    expect(appendix).toBeTruthy();
    expect(appendix.querySelector('textarea')).toBeNull();
    expect(appendix.textContent).toContain('Solids retain shape.');
  });

  it('escapes the wrapper id and title', () => {
    const hostile = { ...item([verifiedCard]), id: 'x" onmouseover="alert(1)', title: 'Matter <script>alert(1)</script>' };
    const html = pipeline.generateFullPackHTML([hostile], 'Memory recall', false, {}, { includeTeacherKey: false, annotations: [] });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('id="x" onmouseover=');
    expect(html).toContain('Matter &lt;script&gt;alert(1)&lt;/script&gt;');
  });
});

describe('Memory Aid slides preview', () => {
  it('renders one cue-first slide per target and never the raw resource object', () => {
    expect(handlers).toBeTruthy();
    const unlocked = { ...verifiedCard, id: 'c2', target: 'Water cycle', factLocked: false, essentialFacts: ['Evaporation comes first.'], aiExample: 'Every Cloud Pours Rain', studentDraft: '' };
    const withImage = { ...verifiedCard, id: 'c3', target: 'Photosynthesis', visualImage: 'data:image/png;base64,' + 'A'.repeat(400) };
    const html = handlers.getSlidesPreviewHTML({ sourceTopic: 'Matter', gradeLevel: '5th Grade', getExportableHistory: () => [item([verifiedCard, unlocked, withImage])] });
    const body = new DOMParser().parseFromString(html, 'text/html').body;
    const text = body.textContent;
    expect(text).not.toContain('PRIVATE_SOURCE_EXCERPT_TEXT');
    expect(text).not.toContain('PRIVATE_LESSON_SNIPPET');
    expect(text).not.toContain('"schemaVersion"');
    expect(text).not.toMatch(/AAAAAAAAAAAAAAAA/);
    expect(text).toContain('States of matter');
    expect(text).toContain('My statue cue');
    expect(text).toContain('Water cycle');
    expect(text).toContain('Every Cloud Pours Rain');
    const slides = Array.from(body.querySelectorAll('.slide')).map((s) => s.textContent);
    const stateSlide = slides.find((s) => s.includes('States of matter'));
    const waterSlide = slides.find((s) => s.includes('Water cycle'));
    expect(stateSlide).toContain('Facts to remember');
    expect(waterSlide).toContain('Your teacher is still checking these facts');
    expect(stateSlide).not.toContain('Teacher-verified facts');
    expect(waterSlide).not.toContain('Teacher-verified facts');
  });
});

describe('B5 · every deck lane carries a cue, not bare facts', () => {
  // All three deck lanes rendered practiceCue alone. A scaffolded card whose
  // student has not drafted yet, and a card whose cue IS the picture, reached
  // the projector as a target and a fact list with nothing to recall from.
  const scaffolded = { id: 'c-scaffold', target: 'Order of operations', essentialFacts: ['Parentheses first.'], factLocked: true, factVerified: true, type: 'sequence-cue', mode: 'scaffolded', scaffoldSteps: ['Name each operation.', 'Give each one a word.'] };
  const pictureOnly = { id: 'c-picture', target: 'Cell wall', essentialFacts: ['A cell wall is rigid.'], factLocked: true, factVerified: true, type: 'analogy-pattern', mode: 'student-authored', visualImage: 'data:image/png;base64,' + 'A'.repeat(200), visualAlt: 'A brick wall around a green cell.', visualAltSource: 'vision' };
  const blank = { id: 'c-blank', target: 'Photosynthesis', essentialFacts: ['Plants use light.'], factLocked: true, factVerified: true, type: 'story-chain', mode: 'student-authored', coachPrompts: ['What familiar image could cue it?'] };

  it('fills exactly one rung of the ladder', () => {
    expect(rules.cueBlock(verifiedCard)).toMatchObject({ cue: 'My statue cue', steps: [], visualDescription: '', prompts: [] });
    expect(rules.cueBlock(scaffolded)).toMatchObject({ cue: '', steps: ['Name each operation.', 'Give each one a word.'], visualDescription: '', prompts: [] });
    expect(rules.cueBlock(pictureOnly)).toMatchObject({ cue: '', steps: [], visualDescription: 'A brick wall around a green cell.', prompts: [] });
    expect(rules.cueBlock(blank).prompts).toContain('What familiar image could cue it?');
    // A planning description is the brief written before the picture existed,
    // so it is not something a class can rely on; drop to coach questions.
    const planned = rules.cueBlock({ ...pictureOnly, visualAltSource: 'planning' });
    expect(planned.visualDescription).toBe('');
    expect(planned.prompts.length).toBeGreaterThan(0);
  });

  it('renders that rung on the slide', () => {
    const html = handlers.getSlidesPreviewHTML({ sourceTopic: 'Matter', gradeLevel: '5th Grade', getExportableHistory: () => [item([scaffolded, pictureOnly, blank])] });
    const slides = Array.from(new DOMParser().parseFromString(html, 'text/html').body.querySelectorAll('.slide')).map((s) => s.textContent);
    expect(slides.find((s) => s.includes('Order of operations'))).toContain('Name each operation.');
    expect(slides.find((s) => s.includes('Cell wall'))).toContain('A brick wall around a green cell.');
    expect(slides.find((s) => s.includes('Photosynthesis'))).toContain('What familiar image could cue it?');
  });
});

describe('Memory Aid translation namespace', () => {
  // A translator that marks every resolved memory_aid key so untranslated
  // English can be spotted, and returns undefined for other keys like the host.
  const marker = (key) => (typeof key === 'string' && key.indexOf('memory_aid.') === 0 ? '[' + key + ']' : undefined);

  it('defines every static key the module and export lanes reference', () => {
    const ui = JSON.parse(readFileSync(resolve(process.cwd(), 'ui_strings.js'), 'utf8')).memory_aid;
    expect(ui).toBeTruthy();
    const used = new Set();
    for (const file of ['memory_aid_source.jsx', 'doc_pipeline_source.jsx', 'export_handlers_module.js', 'view_export_preview_source.jsx']) {
      const source = readFileSync(resolve(process.cwd(), file), 'utf8');
      for (const match of source.matchAll(/\b(?:tr|T|_maT|maT)\('([a-z0-9_]+)'/g)) used.add(match[1]);
    }
    const missing = Array.from(used).filter((key) => !/_$/.test(key) && !(key in ui));
    expect(missing).toEqual([]);
    for (const id of ['acronym_acrostic', 'rhyme_rhythm', 'chunking', 'story_chain', 'keyword_association', 'visual_association', 'analogy_pattern', 'sequence_cue']) {
      for (const field of ['label', 'short', 'desc']) expect(ui['type_' + id + '_' + field]).toBeTruthy();
    }
    for (const id of ['generated', 'scaffolded', 'student_authored']) {
      for (const field of ['label', 'compact', 'desc']) expect(ui['mode_' + id + '_' + field]).toBeTruthy();
    }
    for (const id of ['unreviewed', 'approved', 'needs_revision']) expect(ui['visual_review_' + id + '_label']).toBeTruthy();
    for (const id of ['not_sure', 'somewhat', 'confident']) expect(ui['confidence_' + id + '_label']).toBeTruthy();
    for (const [english, key] of Object.entries(window.AlloModules.MemoryAid._testing.messageKeys || {})) {
      expect(ui[key]).toBe(english);
    }
  });

  it('renders the live view through the host translator', async () => {
    const ReactDOMClient = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
    global.IS_REACT_ACT_ENVIRONMENT = true;
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    try {
      await React.act(async () => root.render(React.createElement(window.AlloModules.MemoryAidView, {
        generatedContent: { type: 'memory-aid', data: { cards: [{ ...verifiedCard, visualImage: 'data:image/png;base64,AAAA', visualAlt: '' }] } },
        isTeacherMode: true, isProcessing: false, handleNoteUpdate: () => {}, addToast: () => {}, t: marker,
      })));
      const text = host.textContent;
      expect(text).toContain('[memory_aid.preview_worksheet]');
      expect(text).toContain('[memory_aid.practice_idle_title]');
      expect(text).toContain('[memory_aid.facts_verified]');
      expect(text).toContain('[memory_aid.type_analogy_pattern_short]');
      expect(text).toContain('[memory_aid.mode_generated_compact]');
      expect(text).toContain('[memory_aid.visual_review_unreviewed_label]');
      expect(text).toContain('[memory_aid.visual_source_line]');
      expect(text).not.toContain('Try it from memory');
      expect(text).not.toContain('Teacher-verified facts');
      expect(host.querySelector('[aria-label="[memory_aid.facts_verified]"]')).not.toBeNull();
      expect(host.querySelector('[aria-label="[memory_aid.feedback_region_aria]"]')).toBeNull();
      const panel = document.createElement('div');
      document.body.appendChild(panel);
      const panelRoot = ReactDOMClient.createRoot(panel);
      await React.act(async () => panelRoot.render(React.createElement(window.AlloModules.MemoryAidPanel, {
        expandedTools: ['memory-aid'], handleGenerate: () => {}, hasSourceOrAnalysis: true, isProcessing: false,
        memoryAidSelectionMode: 'manual', setMemoryAidSelectionMode: () => {}, memoryAidTypes: ['chunking'], setMemoryAidTypes: () => {},
        memoryAidAuthorshipMode: 'progressive', setMemoryAidAuthorshipMode: () => {}, memoryAidReflectionLevel: 'quick', setMemoryAidReflectionLevel: () => {},
        memoryAidReasoningRequired: false, setMemoryAidReasoningRequired: () => {}, memoryAidCount: 3, setMemoryAidCount: () => {},
        memoryAidCustomInstructions: '', setMemoryAidCustomInstructions: () => {}, t: marker,
      })));
      expect(panel.textContent).toContain('[memory_aid.panel_build]');
      expect(panel.textContent).toContain('[memory_aid.type_chunking_short]');
      expect(panel.textContent).not.toContain('Build Memory Aid Studio');
      await React.act(async () => panelRoot.unmount());
      panel.remove();
    } finally {
      await React.act(async () => root.unmount());
      host.remove();
    }
  });

  it('routes export labels through the same namespace in every lane', () => {
    const translated = window.AlloModules.createDocPipeline({
      callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {},
      t: marker, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Document', state: {},
    });
    const full = section(translated.generateFullPackHTML([item([verifiedCard])], 'Memory recall', false, {}, { includeTeacherKey: false, annotations: [] }));
    // Student-facing pack: the student heading key, through the same namespace.
    // (The teacher appendix wording is pinned in export_quiz_html_worksheet_parity.)
    expect(full.textContent).toContain('[memory_aid.facts_student_heading]');
    expect(full.textContent).toContain('[memory_aid.type_analogy_pattern_label]');
    expect(full.textContent).toContain('[memory_aid.export_create_remix_heading]');
    expect(full.textContent).not.toContain('Teacher-verified facts');
    const sheet = section(translated.generateFullPackHTML([item([verifiedCard])], 'Memory recall', true, {}, { includeTeacherKey: false, annotations: [] }));
    expect(sheet.textContent).toContain('[memory_aid.export_recall_kicker]');
    expect(sheet.textContent).toContain('[memory_aid.confidence_not_sure_label]');
    const slides = handlers.getSlidesPreviewHTML({ sourceTopic: 'Matter', gradeLevel: '5', t: marker, getExportableHistory: () => [item([verifiedCard])] });
    expect(slides).toContain('[memory_aid.facts_student_heading]');
    expect(slides).not.toContain('Teacher-verified facts');
  });
});

describe('Memory Aid host wiring and help', () => {
  it('passes the translator and the resource-sheet printer to the view', () => {
    const source = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
    const start = source.indexOf('window.AlloModules.MemoryAidView && window.AlloModules.StudioResponse && React.createElement');
    const wiring = source.slice(start, start + 2000);
    expect(start).toBeGreaterThan(-1);
    expect(wiring).toMatch(/\bt,/);
    expect(wiring).toContain('onPrint: (item, options) => handlePrintResourceSheet(item');
    expect(source).toContain('const handlePrintResourceSheet = (item, options = {}) => {');
  });

  it('documents both studio tiles in help mode', () => {
    const help = readFileSync(resolve(process.cwd(), 'help_strings.js'), 'utf8');
    const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
    for (const key of ['tool_memory_aid', 'tool_applied_challenge']) {
      expect(help).toMatch(new RegExp("^\\s*'" + key + "':\\s*\"", 'm'));
    }
    expect(anti).toContain('data-help-key="tool_memory_aid"');
  });

  it('exports a NotebookLM section instead of an empty heading', () => {
    const preview = readFileSync(resolve(process.cwd(), 'view_export_preview_source.jsx'), 'utf8');
    const branch = preview.indexOf("else if (ty === 'memory-aid' && d && typeof d === 'object')");
    const fallback = preview.indexOf("const tx = (d && (d.text || d.content || d.summary)) || '';");
    expect(branch).toBeGreaterThan(-1);
    expect(fallback).toBeGreaterThan(branch);
    const slice = preview.slice(branch, fallback);
    expect(slice).toContain('exportRules');
    expect(slice).not.toContain('sourceExcerpt');
    // The notebook lane reads the same cue ladder as the slide and PPTX lanes.
    expect(slice).toContain('cueBlock');
    expect(slice).toContain('export_visual_cue_described');
  });
});
