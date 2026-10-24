// Lane B: Document Builder glossary modes (bilingual table, word wall, student
// worksheet) through createDocPipeline().generateFullPackHTML, and the Builder's
// glossary options on the mounted ExportPreviewView.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, act } from './helpers/games_live_harness.js';

const DIR = process.env.LANE_DIR || '.';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
  window.React = React;
  new Function(readFileSync(DIR + '/doc_pipeline_module.js', 'utf8'))();
});

const cleanups = [];
afterEach(() => {
  cleanups.splice(0).reverse().forEach((fn) => fn());
  vi.restoreAllMocks();
});

const image = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>');
const glossary = () => [
  { term: 'Leaf', def: 'A plant part that makes food. It is usually green.', tier: 'Academic', image, translations: { Arabic: 'ورقة', Spanish: 'hoja', Karen: 'lah' } },
  { term: 'Root', def: 'The part under the ground.', image, imageAlt: 'A carrot-shaped root', imageAltHash: 'img-stale-00000000', translations: { Spanish: 'raíz' } },
  { term: 'Stem', def: 'Holds the plant up.', image, imageDecorative: true, translations: { Arabic: 'ساق' } },
  { term: 'Seed', def: 'A new plant starts here.', translations: {} },
  { term: 'Flower', def: 'Where seeds are made.', translations: { Spanish: 'flor' } },
];
function makePipeline(t = (key) => key) {
  window.AlloModules.ModuleScopeExtras = { getSpeechLangCode: (n) => ({ Arabic: 'ar-SA', Spanish: 'es-ES' })[n] || 'en-US', isRtlLang: (n) => n === 'Arabic' };
  cleanups.push(() => { delete window.AlloModules.ModuleScopeExtras; });
  return window.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t, isRtlLang: (n) => n === 'Arabic', updateExportPreview: () => {}, getDefaultTitle: () => 'Vocabulary', state: {} });
}
function pack(config, { data = glossary(), worksheet = false, t = (key) => key } = {}) {
  const pipeline = makePipeline(t);
  const html = pipeline.generateFullPackHTML([{ type: 'glossary', id: 'g1', title: 'Plant words', data }], 'Pack', worksheet, {}, { includeGlossary: true, includeTeacherKey: false, annotations: [], ...config });
  return new DOMParser().parseFromString(html, 'text/html');
}
// The student copy is everything outside the teacher appendix.
function studentPart(doc) {
  const copy = doc.body.cloneNode(true);
  copy.querySelectorAll('.teacher-view').forEach((node) => node.remove());
  return copy;
}

describe('bilingual table', () => {
  it('Term, Definition, then one column per language, each translation cell with its language and direction', () => {
    const doc = pack({ glossaryDisplayMode: 'bilingual' });
    const table = doc.querySelector('table[data-gloss-bilingual]');
    expect([...table.querySelectorAll('thead th')].map((th) => th.textContent)).toEqual(['Term', 'Definition', 'Arabic', 'Spanish', 'Karen']);
    const rows = [...table.querySelectorAll('tbody tr')];
    expect(rows).toHaveLength(5);
    expect(rows.every((row) => row.children.length === 5)).toBe(true);
    const leaf = rows[0].children;
    expect([leaf[2].getAttribute('lang'), leaf[2].getAttribute('dir'), leaf[2].textContent]).toEqual(['ar', 'rtl', 'ورقة']);
    expect([leaf[3].getAttribute('lang'), leaf[3].getAttribute('dir')]).toEqual(['es', 'ltr']);
    expect(leaf[4].hasAttribute('lang'), 'an unknown language is not labelled English').toBe(false);
    expect(leaf[4].getAttribute('dir')).toBe('auto');
    expect(rows[1].children[2].getAttribute('dir'), 'an empty Arabic cell still reads right to left').toBe('rtl');
    expect(rows[0].querySelector('th[scope="row"]').textContent).toBe('Leaf');
    const region = table.closest('[role="region"]');
    expect(region.getAttribute('tabindex'), 'a wide table scrolls by keyboard').toBe('0');
    expect(region.getAttribute('aria-label')).toBeTruthy();
  });
  it('honours the language subset chosen in the Builder', () => {
    const doc = pack({ glossaryDisplayMode: 'bilingual', glossaryBilingualLanguages: ['Spanish', 'Klingon'] });
    const table = doc.querySelector('table[data-gloss-bilingual]');
    expect([...table.querySelectorAll('thead th')].map((th) => th.textContent)).toEqual(['Term', 'Definition', 'Spanish']);
    expect(table.textContent.includes('ورقة')).toBe(false);
    const none = pack({ glossaryDisplayMode: 'bilingual', glossaryBilingualLanguages: [] });
    expect(none.querySelectorAll('table[data-gloss-bilingual] thead th')).toHaveLength(2);
  });
});

describe('word wall', () => {
  it('one large card per term, with the picture named like everywhere else, grouped two per printed page', () => {
    const doc = pack({ glossaryDisplayMode: 'word-wall' });
    const wall = doc.querySelector('.alloflow-word-wall');
    expect(wall.getAttribute('data-per-page')).toBe('2');
    const cards = [...wall.querySelectorAll('.alloflow-word-wall-card')];
    expect(cards.map((c) => c.querySelector('.alloflow-word-wall-term').textContent)).toEqual(['Leaf', 'Root', 'Stem', 'Seed', 'Flower']);
    expect([...wall.querySelectorAll('.alloflow-word-wall-page')].map((p) => p.children.length)).toEqual([2, 2, 1]);
    const imgs = [...wall.querySelectorAll('img')];
    expect(imgs.map((img) => img.getAttribute('alt')), 'stale description falls back to the term; decorative is silent').toEqual(['Leaf', 'Root', '']);
    expect(imgs.map((img) => img.getAttribute('role'))).toEqual([null, null, 'presentation']);
    expect(wall.querySelector('.alloflow-word-wall-def'), 'definitions are off unless chosen').toBeNull();
    const css = [...doc.querySelectorAll('style')].map((s) => s.textContent).join('\n');
    expect(/\.alloflow-word-wall-card \{[^}]*break-inside:avoid/.test(css), 'a card never splits').toBe(true);
    expect(/\.alloflow-word-wall-page \{[^}]*break-after:page/.test(css), 'each group ends its page').toBe(true);
  });
  it('the optional short definition is the first sentence; 4 per page makes 2 pages', () => {
    const doc = pack({ glossaryDisplayMode: 'word-wall', glossaryWordWallDefinition: true, glossaryWordWallPerPage: 4 });
    const wall = doc.querySelector('.alloflow-word-wall');
    expect(wall.getAttribute('data-per-page')).toBe('4');
    expect(wall.querySelectorAll('.alloflow-word-wall-page')).toHaveLength(2);
    expect(wall.querySelector('.alloflow-word-wall-def').textContent).toBe('A plant part that makes food.');
  });
});

describe('student worksheet', () => {
  const definitions = glossary().map((g) => g.def);
  const hasAny = (node, list) => list.filter((text) => node.textContent.includes(text));
  it('writing lines: the terms with lines to write on, and no definitions, translations or key in the student copy', () => {
    const doc = pack({ glossaryDisplayMode: 'worksheet', includeTeacherKey: true }, { worksheet: true });
    const student = studentPart(doc);
    const sheet = student.querySelector('[data-glossary-worksheet="lines"]');
    expect([...sheet.querySelectorAll('[data-glossary-worksheet-words] > li strong')].map((s) => s.textContent)).toEqual(['Leaf', 'Root', 'Stem', 'Seed', 'Flower']);
    expect(sheet.querySelectorAll('.alloflow-ruled-line').length).toBeGreaterThanOrEqual(10);
    expect(hasAny(student, definitions), 'no definition in the student copy').toEqual([]);
    expect(hasAny(student, ['ورقة', 'hoja', 'raíz']), 'no translation either').toEqual([]);
    expect(student.querySelector('[data-glossary-worksheet-key]')).toBeNull();
  });
  it('the key is only in the teacher copy, and only with Teacher Key on (never in assessment mode)', () => {
    const withKey = pack({ glossaryDisplayMode: 'worksheet', includeTeacherKey: true });
    const key = withKey.querySelector('.teacher-view [data-glossary-worksheet-key="lines"]');
    expect(key, 'the teacher key').not.toBeNull();
    expect([...key.querySelectorAll('li')].map((li) => li.textContent)).toEqual(glossary().map((g) => g.term + ': ' + g.def));
    const without = pack({ glossaryDisplayMode: 'worksheet', includeTeacherKey: false });
    expect(without.querySelector('[data-glossary-worksheet-key]')).toBeNull();
    expect(hasAny(without.body, definitions)).toEqual([]);
    const assessment = pack({ glossaryDisplayMode: 'worksheet', includeTeacherKey: true, assessmentMode: true });
    expect(assessment.querySelector('[data-glossary-worksheet-key]')).toBeNull();
    expect(hasAny(assessment.body, definitions)).toEqual([]);
  });
  it('rendered on its own, the teacher copy still needs Teacher Key on, and never in assessment mode', () => {
    const pipeline = makePipeline();
    const item = { type: 'glossary', id: 'g1', title: 'Plant words', data: glossary() };
    const render = (cfg) => pipeline.generateResourceHTML(item, true, {}, { includeGlossary: true, glossaryDisplayMode: 'worksheet', ...cfg });
    expect(render({ includeTeacherKey: true }).includes('data-glossary-worksheet-key="lines"')).toBe(true);
    for (const cfg of [{ includeTeacherKey: false }, {}, { includeTeacherKey: true, assessmentMode: true }]) {
      const html = render(cfg);
      expect(html.includes('data-glossary-worksheet-key'), JSON.stringify(cfg)).toBe(false);
      expect(definitions.filter((d) => html.includes(d)), JSON.stringify(cfg)).toEqual([]);
    }
  });
  it('on screen, each word has a labelled answer box that the file saves', () => {
    const doc = pack({ glossaryDisplayMode: 'worksheet' });
    const boxes = [...doc.querySelectorAll('[data-glossary-worksheet="lines"] textarea')];
    expect(boxes).toHaveLength(5);
    expect(boxes.map((box) => doc.querySelector('label[for="' + box.id + '"]').textContent)).toEqual(['Leaf', 'Root', 'Stem', 'Seed', 'Flower']);
    expect(new Set(boxes.map((box) => box.getAttribute('data-allo-response-key'))).size).toBe(5);
  });
  function matching(config = {}, data = glossary()) {
    const doc = pack({ glossaryDisplayMode: 'worksheet', glossaryWorksheetVariant: 'matching', includeTeacherKey: true, ...config }, { data, worksheet: true });
    const student = studentPart(doc);
    const terms = [...student.querySelectorAll('[data-glossary-worksheet-words] > li strong')].map((s) => s.textContent);
    const letters = {};
    student.querySelectorAll('[data-glossary-worksheet-definitions] > li').forEach((li) => {
      const letter = li.querySelector('strong').textContent.replace('.', '');
      letters[letter] = li.textContent.slice(li.querySelector('strong').textContent.length).trim();
    });
    const key = doc.querySelector('.teacher-view [data-glossary-worksheet-key="matching"]');
    return { doc, student, terms, letters, key };
  }
  it('matching: numbered words, lettered definitions in a shuffled order, and a key that agrees with the sheet', () => {
    const { student, terms, letters, key } = matching();
    expect(terms).toEqual(['Leaf', 'Root', 'Stem', 'Seed', 'Flower']);
    expect(Object.keys(letters)).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(Object.values(letters), 'the definitions are shuffled').not.toEqual(definitions);
    expect(Object.values(letters).slice().sort()).toEqual(definitions.slice().sort());
    expect(student.textContent.includes('Leaf: '), 'no term-to-definition pairing on the student sheet').toBe(false);
    const answers = [...key.querySelectorAll('li')].map((li) => li.textContent.split(': '));
    expect(answers.map(([term]) => term)).toEqual(terms);
    answers.forEach(([term, letter]) => expect(letters[letter], term).toBe(glossary().find((g) => g.term === term).def));
  });
  it('matching: the shuffle is the same on every render, and changes with a different seed', () => {
    const first = matching().letters;
    expect(matching().letters).toEqual(first);
    expect(matching({ glossaryWorksheetSeed: 'another class' }).letters).not.toEqual(first);
    const two = matching({}, glossary().slice(0, 2)).letters;
    expect(Object.values(two), 'two words are never left in order').toEqual([glossary()[1].def, glossary()[0].def]);
  });
  it('matching on screen: each word has a labelled letter box', () => {
    const doc = pack({ glossaryDisplayMode: 'worksheet', glossaryWorksheetVariant: 'matching' });
    const inputs = [...doc.querySelectorAll('[data-glossary-worksheet="matching"] input[type="text"]')];
    expect(inputs).toHaveLength(5);
    expect(doc.querySelector('label[for="' + inputs[0].id + '"]').textContent).toBe('1. Leaf');
  });
  it('the worksheet adds no print call of its own (the Builder prints through its own window)', () => {
    const doc = pack({ glossaryDisplayMode: 'worksheet', glossaryWorksheetVariant: 'matching' });
    const section = doc.querySelector('[data-glossary-worksheet]');
    expect(section.innerHTML.includes('print('), 'no window.print() in the section').toBe(false);
  });
  it('directions and the key title come from the language pack', () => {
    const t = (key) => ({ 'glossary.worksheet_lines_directions': 'Escribe qué significa cada palabra.', 'glossary.worksheet_key_title': 'Clave de respuestas: {title}' })[key] || key;
    const doc = pack({ glossaryDisplayMode: 'worksheet', includeTeacherKey: true }, { t });
    expect(doc.body.textContent.includes('Escribe qué significa cada palabra.')).toBe(true);
    expect(doc.querySelector('[data-glossary-worksheet-key] h3').textContent).toBe('Clave de respuestas: Plant words');
  });
});

// The Builder is a large view; a busy machine can take most of the default timeout to mount it.
describe('Builder glossary options', { timeout: 60000 }, () => {
  beforeAll(() => {
    if (!window.AlloModules.ExportPreviewView) new Function(readFileSync(DIR + '/view_export_preview_module.js', 'utf8'))();
  }, 60000);
  const FUNCTION_PROPS = ['_ensureDiffLib', 'addToast', 'applyExportPreset', 'auditOutputAccessibility', 'deleteExportPreset', 'executeExportFromPreview', 'generateCustomExportStyle', 'getExportPreviewHTML', 'handleExportH5P', 'handleExportIMS', 'handleExportQTI', 'openInAlloStudio', 'processExpertCommand', 'proposeRestyles', 'runAxeAudit', 'saveExportPreset', 'setAgentActivityLog', 'setAgentLogFullView', 'setCustomExportCSS', 'setDiffViewOpen', 'setExpertCommandInput', 'setExportAuditLoading', 'setExportAuditResult', 'setExportPreviewMode', 'setExportStylePrompt', 'setExportTheme', 'setIsAgentRunning', 'setShowBrandProfileEditor', 'setShowExportPreview', 'toggleA11yInspect', 'updateExportPreview', 'onBuilderDraftCapture', 'onExportSuccess', 'setBuilderWorkspaceMode', 'onAdvancedReviewSessionChange'];
  let latest = null;
  function mountBuilder(initial, { t = (k) => k, history = [{ id: 'g1', type: 'glossary', data: glossary() }] } = {}) {
    const View = window.AlloModules.ExportPreviewView;
    const base ={ showExportPreview: true, history, t, exportPreviewMode: 'html', exportPreviewRef: { current: null }, STYLE_SEEDS: {}, FONT_OPTIONS: [], BUILT_IN_PRESETS: [], exportPresets: [], agentActivityLog: [], exportTheme: 'professional', theme: 'light', exportStylePrompt: '', expertCommandInput: '', customExportCSS: '', selectedFont: 'default', exportPreviewSource: 'history', getSkippedResources: () => [] };
    FUNCTION_PROPS.forEach((name) => { base[name] = () => undefined; });
    function Builder() {
      const [config, setConfig] = React.useState({ includeGlossary: true, ...initial });
      latest = config;
      return React.createElement(View, { ...base, exportConfig: config, setExportConfigAndRefresh: (update) => setConfig((prev) => (typeof update === 'function' ? update(prev) : update)) });
    }
    const container = document.createElement('div');
    document.body.append(container);
    const root = ReactDOMClient.createRoot(container);
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    act(() => root.render(React.createElement(Builder)));
    cleanups.push(() => { act(() => root.unmount()); container.remove(); quiet.mockRestore(); });
    return container;
  }
  const group = (container) => container.querySelector('[role="radiogroup"][aria-labelledby="export-glossary-display-label"]');
  const radio = (container, text) => [...group(container).querySelectorAll('label')].find((l) => l.textContent.includes(text)).querySelector('input');
  it('offers the three new modes in the glossary group; bilingual needs translations', () => {
    const container = mountBuilder({});
    const labels = [...group(container).querySelectorAll('label')].map((l) => l.textContent.trim());
    expect(labels.slice(3)).toEqual(['Bilingual table (a column per language)', 'Word wall cards (large print)', 'Student worksheet (no answers)']);
    expect(radio(container, 'Bilingual').disabled).toBe(false);
    const bare = mountBuilder({}, { history: [{ id: 'g2', type: 'glossary', data: [{ term: 'Leaf', def: 'x' }] }] });
    expect(radio(bare, 'Bilingual').disabled).toBe(true);
    expect(radio(bare, 'Word wall').disabled).toBe(false);
  });
  it('bilingual lists the glossary languages, all on by default, and stores the subset', () => {
    const container = mountBuilder({});
    act(() => radio(container, 'Bilingual').click());
    expect(latest.glossaryDisplayMode).toBe('bilingual');
    const boxes = [...container.querySelectorAll('[data-export-glossary-languages] input[type="checkbox"]')];
    expect(boxes.map((b) => b.closest('label').textContent)).toEqual(['Arabic', 'Spanish', 'Karen']);
    expect(boxes.every((b) => b.checked)).toBe(true);
    expect(latest.glossaryBilingualLanguages, 'no stored choice means all').toBeUndefined();
    act(() => boxes[0].click());
    expect(latest.glossaryBilingualLanguages).toEqual(['Spanish', 'Karen']);
    act(() => boxes[0].click());
    expect(latest.glossaryBilingualLanguages, 'back in the glossary order').toEqual(['Arabic', 'Spanish', 'Karen']);
    expect(container.querySelector('[data-export-glossary-languages] legend').textContent).toBe('Languages to include');
  });
  it('word wall: the short-definition checkbox and cards per page', () => {
    const container = mountBuilder({ glossaryDisplayMode: 'word-wall' });
    const panel = container.querySelector('[data-export-glossary-word-wall]');
    const box = panel.querySelector('input[type="checkbox"]');
    expect(box.closest('label').textContent).toBe('Add a short definition');
    expect(box.checked).toBe(false);
    act(() => box.click());
    expect(latest.glossaryWordWallDefinition).toBe(true);
    const select = panel.querySelector('select');
    expect(select.closest('label').textContent.startsWith('Cards per printed page')).toBe(true);
    expect([...select.options].map((o) => o.value)).toEqual(['2', '3', '4']);
    expect(select.value).toBe('2');
    act(() => { select.value = '4'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(latest.glossaryWordWallPerPage).toBe(4);
  });
  it('worksheet: writing lines or matching, with a note that the key is teacher-only', () => {
    const container = mountBuilder({ glossaryDisplayMode: 'worksheet' });
    const panel = container.querySelector('[data-export-glossary-worksheet]');
    const radios = [...panel.querySelectorAll('[role="radiogroup"] input[type="radio"]')];
    expect(radios.map((r) => r.closest('label').textContent)).toEqual(['Write the definition', 'Match words to definitions']);
    expect(radios[0].checked).toBe(true);
    act(() => radios[1].click());
    expect(latest.glossaryWorksheetVariant).toBe('matching');
    expect(panel.textContent.includes('teacher copy')).toBe(true);
  });
  it('the new labels come from the language pack', () => {
    const t = (k) => ({ 'export.glossary_mode_word_wall': 'Tarjetas para el muro de palabras' })[k] || k;
    const container = mountBuilder({}, { t });
    expect(radio(container, 'Tarjetas para el muro').closest('label').textContent.trim()).toBe('Tarjetas para el muro de palabras');
  });
});
