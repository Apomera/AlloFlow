// Lane B: glossary word lists (CSV, Quizlet, Anki), the in-page chooser and
// Quizlet dialog, and the teacher-tools entry point, on the built modules.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { React, ReactDOMClient, act } from './helpers/games_live_harness.js';

const DIR = process.env.LANE_DIR || '.';
const require = createRequire(import.meta.url);
const { glossaryMediaProps } = require('./helpers/glossary_media_fixture.cjs');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
  window.React = React;
  new Function(readFileSync(DIR + '/export_module.js', 'utf8'))();
  new Function(readFileSync(DIR + '/view_glossary_module.js', 'utf8'))();
});

const cleanups = [];
afterEach(() => {
  cleanups.splice(0).reverse().forEach((fn) => fn());
  document.querySelectorAll('.agx-overlay').forEach((node) => node.remove());
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete window.alloCopyText;
  delete document.execCommand;
});

const BIDI_CONTROLS = new RegExp('[' + String.fromCharCode(0x200e, 0x200f, 0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069) + ']');
const words = () => [
  { entryId: 'leaf', term: 'Leaf', def: 'A plant part, "green".', tier: 'Academic Vocabulary', translations: { Arabic: 'ورقة: جزء من النبات', Spanish: 'hoja' } },
  { entryId: 'sum', term: '=SUM(A1)', def: '-5 degrees\nsecond line', tier: 'Domain-Specific', translations: { Spanish: '+ más' } },
  { entryId: 'home', term: '@home', def: '\ttabbed\tdefinition', tier: 'Academic Vocabulary' },
];
function exporter(data = words(), extra = {}, title = 'Plants: Leaves') {
  const addToast = vi.fn();
  const api = window.AlloModules.createExport({
    liveRef: { current: { generatedContent: { id: 'g1', type: 'glossary', title, data }, t: (key) => key, addToast, ...extra } },
    escapeXml: (s) => String(s),
  });
  return { api, addToast };
}
// Captures the Blob text, the file name and the object-URL lifecycle.
function captureDownloads() {
  const files = [];
  vi.stubGlobal('Blob', class { constructor(parts, options) { this.text = parts.join(''); this.type = options && options.type; files.push(this); } });
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:word-list');
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { files[files.length - 1].name = this.download; });
  return { files, revoke };
}
// RFC 4180 reader, to check the CSV round-trips rather than eyeballing strings.
function parseCsv(text) {
  const rows = [[]];
  let field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; } else if (c === '"') quoted = false; else field += c;
    } else if (c === '"' && field === '') quoted = true;
    else if (c === ',') { rows[rows.length - 1].push(field); field = ''; }
    else if (c === '\r' && text[i + 1] === '\n') { rows[rows.length - 1].push(field); field = ''; rows.push([]); i++; }
    else field += c;
  }
  if (field || rows[rows.length - 1].length) rows[rows.length - 1].push(field);
  return rows.filter((row) => row.length);
}
const dialog = () => document.querySelector('.agx-overlay [role="dialog"]');
const buttonIn = (root, text) => [...root.querySelectorAll('button')].find((b) => b.textContent === text);
const key = (el, k, shiftKey = false) => { const ev = new KeyboardEvent('keydown', { key: k, shiftKey, bubbles: true, cancelable: true }); el.dispatchEvent(ev); return ev; };

describe('CSV word list', () => {
  it('starts with a BOM, has Term, Definition, Tier and one column per language, and round-trips', () => {
    vi.useFakeTimers();
    const { files, revoke } = captureDownloads();
    const { api, addToast } = exporter();
    expect(api.handleExportGlossaryFile('csv')).toBe(true);
    const csv = files[0];
    expect(csv.type).toBe('text/csv;charset=utf-8');
    expect(csv.text.charCodeAt(0), 'UTF-8 byte order mark').toBe(0xfeff);
    expect(csv.text.endsWith('\r\n'), 'CRLF record ends').toBe(true);
    const rows = parseCsv(csv.text.slice(1));
    expect(rows[0]).toEqual(['Term', 'Definition', 'Tier', 'Arabic', 'Spanish']);
    expect(rows.every((row) => row.length === 5), JSON.stringify(rows)).toBe(true);
    expect(rows[1]).toEqual(['Leaf', 'A plant part, "green".', 'Academic Vocabulary', 'ورقة: جزء من النبات', 'hoja']);
    expect(addToast).toHaveBeenCalledWith('Word list downloaded.', 'success');
    expect(revoke, 'the object URL lives on past the click').not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(600);
    expect(revoke).toHaveBeenCalledWith('blob:word-list');
  });
  it('formula guard on = + - @ and a leading tab; a newline stays inside its quoted cell', () => {
    const { files } = captureDownloads();
    exporter().api.handleExportGlossaryFile('csv');
    const rows = parseCsv(files[0].text.slice(1));
    expect(rows[2][0]).toBe("'=SUM(A1)");
    expect(rows[2][1], 'quoted, with its newline kept').toBe("'-5 degrees\nsecond line");
    expect(rows[2][4]).toBe("'+ más");
    expect(rows[3][0]).toBe("'@home");
    expect(rows[3][1]).toBe("'\ttabbed\tdefinition");
    expect(files[0].text.includes('"\'-5 degrees\nsecond line"'), 'RFC 4180 quoting around the newline').toBe(true);
    expect(rows[1][0], 'an ordinary cell is left alone').toBe('Leaf');
  });
  it('right-to-left text is written as is, with no direction marks added', () => {
    const { files } = captureDownloads();
    exporter().api.handleExportGlossaryFile('csv');
    expect(files[0].text.includes('ورقة: جزء من النبات')).toBe(true);
    expect(BIDI_CONTROLS.test(files[0].text)).toBe(false);
  });
  it('names the file after the glossary in any script, with the local date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 2, 23, 30));
    const { files } = captureDownloads();
    exporter().api.handleExportGlossaryFile('csv');
    expect(files[0].name, 'local date, not the UTC one').toBe('Plants-Leaves-word-list-2026-01-02.csv');
    exporter(words(), {}, 'النباتات والأوراق').api.handleExportGlossaryFile('anki', { back: 'definition' });
    expect(files[1].name).toBe('النباتات-والأوراق-anki-2026-01-02.txt');
  });
  it('an empty glossary says so instead of downloading', () => {
    const { files } = captureDownloads();
    const { api, addToast } = exporter([{ term: '  ', def: 'x' }]);
    expect(api.handleExportGlossaryFile('csv')).toBe(false);
    expect(files).toHaveLength(0);
    expect(addToast).toHaveBeenCalledWith('Add glossary terms before exporting a word list.', 'info');
  });
});

describe('Quizlet and Anki lines', () => {
  it('Quizlet: one card per line, term TAB definition; tabs and newlines inside a definition become spaces', () => {
    exporter().api.handleExportGlossaryFile('quizlet', { back: 'definition' });
    const area = dialog().querySelector('textarea');
    const lines = area.value.split('\n');
    expect(lines).toEqual(['Leaf\tA plant part, "green".', '=SUM(A1)\t-5 degrees second line', '@home\ttabbed definition']);
    expect(lines.every((line) => line.split('\t').length === 2)).toBe(true);
  });
  it('Quizlet: term / translation in the chosen language, skipping words without one', () => {
    exporter().api.handleExportGlossaryFile('quizlet', { back: 'Spanish' });
    expect(dialog().querySelector('textarea').value).toBe('Leaf\thoja\n=SUM(A1)\t+ más');
    expect(dialog().querySelector('[role="status"]').textContent).toBe('2 cards ready.');
  });
  it('Anki: file headers, Front TAB Back TAB Tags, tier as one tag, quotes escaped', () => {
    const { files } = captureDownloads();
    expect(exporter().api.handleExportGlossaryFile('anki', { back: 'definition' })).toBe(true);
    const lines = files[0].text.split('\n');
    expect(files[0].type).toBe('text/plain;charset=utf-8');
    expect(files[0].text.charCodeAt(0), 'no BOM in front of the Anki headers').toBe('#'.charCodeAt(0));
    expect(lines.slice(0, 3)).toEqual(['#separator:tab', '#html:false', '#columns:Front\tBack\tTags']);
    const cards = lines.filter((line) => line && !line.startsWith('#'));
    expect(cards).toEqual([
      'Leaf\t"A plant part, ""green""."\tAcademic_Vocabulary',
      '=SUM(A1)\t-5 degrees second line\tDomain-Specific',
      '@home\ttabbed definition\tAcademic_Vocabulary',
    ]);
    expect(cards.every((line) => line.split('\t').length === 3)).toBe(true);
  });
  it('Anki with an Arabic back keeps the text intact', () => {
    const { files } = captureDownloads();
    exporter().api.handleExportGlossaryFile('anki', { back: 'Arabic' });
    const cards = files[0].text.split('\n').filter((line) => line && !line.startsWith('#'));
    expect(cards).toEqual(['Leaf\tورقة: جزء من النبات\tAcademic_Vocabulary']);
    expect(BIDI_CONTROLS.test(files[0].text)).toBe(false);
  });
});

describe('the word-list dialogs', () => {
  function openChooser() {
    const opener = document.createElement('button');
    opener.textContent = 'Export word list…';
    document.body.append(opener);
    cleanups.push(() => opener.remove());
    opener.focus();
    const result = exporter();
    result.api.handleExportGlossaryFile('chooser', { opener });
    return { opener, ...result };
  }
  it('is a labelled modal dialog that starts on the first choice and labels every control', () => {
    openChooser();
    const box = dialog();
    expect(box.getAttribute('aria-modal')).toBe('true');
    expect(document.getElementById(box.getAttribute('aria-labelledby')).textContent).toBe('Export word list');
    expect(document.activeElement).toBe(box.querySelector('input[type="radio"][value="csv"]'));
    const radios = [...box.querySelectorAll('input[type="radio"]')];
    expect(radios.map((r) => r.closest('label').textContent)).toEqual(['Spreadsheet (CSV)', 'Quizlet (copy and paste)', 'Anki (text file)']);
    const select = box.querySelector('select');
    expect(box.querySelector('label[for="' + select.id + '"]').textContent).toBe('Back of each card');
    expect([...select.options].map((o) => o.textContent)).toEqual(['Definition', 'Arabic translation', 'Spanish translation']);
    expect(select.closest('[hidden]'), 'no card back for a spreadsheet').not.toBeNull();
    radios[1].click();
    expect(select.closest('[hidden]'), 'Quizlet shows the card back choice').toBeNull();
    expect([...box.querySelectorAll('button')].every((b) => b.type === 'button')).toBe(true);
  });
  it('traps Tab at both ends, leaves other keys alone, and Escape returns focus to the opener', () => {
    const { opener } = openChooser();
    const box = dialog();
    const buttons = [...box.querySelectorAll('button')];
    const last = buttons[buttons.length - 1];
    const first = box.querySelector('input[type="radio"][value="csv"]');
    last.focus();
    expect(key(last, 'Tab').defaultPrevented, 'Tab on the last control is claimed').toBe(true);
    expect(document.activeElement).toBe(first);
    expect(key(first, 'Tab', true).defaultPrevented, 'Shift+Tab on the first control is claimed').toBe(true);
    expect(document.activeElement).toBe(last);
    buttons[0].focus();
    expect(key(buttons[0], 'Tab').defaultPrevented, 'Tab in the middle is left to the browser').toBe(false);
    expect(key(first, 'a').defaultPrevented).toBe(false);
    key(first, 'Escape');
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
  it('Cancel closes and returns focus too', () => {
    const { opener } = openChooser();
    buttonIn(dialog(), 'Cancel').click();
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
  it('choosing Quizlet and a language opens the copy dialog; closing it goes back to the opener', () => {
    const { opener } = openChooser();
    const box = dialog();
    box.querySelector('input[value="quizlet"]').click();
    box.querySelector('select').value = 'Spanish';
    buttonIn(box, 'Export').click();
    const copy = dialog();
    expect(copy, 'the Quizlet dialog').not.toBeNull();
    expect(document.getElementById(copy.getAttribute('aria-labelledby')).textContent).toBe('Copy for Quizlet');
    const area = copy.querySelector('textarea');
    expect(area.readOnly).toBe(true);
    expect(area.getAttribute('dir')).toBe('auto');
    expect(copy.querySelector('label[for="' + area.id + '"]').textContent).toBe('Text to paste into Quizlet');
    expect(area.value).toBe('Leaf\thoja\n=SUM(A1)\t+ más');
    expect(document.activeElement.textContent).toBe('Copy');
    buttonIn(copy, 'Close').click();
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
  it('choosing the spreadsheet downloads it and puts focus back', () => {
    const { files } = captureDownloads();
    const { opener } = openChooser();
    buttonIn(dialog(), 'Export').click();
    expect(dialog()).toBeNull();
    expect(files.map((f) => f.type)).toEqual(['text/csv;charset=utf-8']);
    expect(document.activeElement).toBe(opener);
  });
  it('Copy uses the host helper first (Canvas blocks the Clipboard API)', async () => {
    window.alloCopyText = vi.fn(async () => true);
    exporter().api.handleExportGlossaryFile('quizlet', { back: 'definition' });
    const copy = dialog();
    await act(async () => { buttonIn(copy, 'Copy').click(); });
    expect(window.alloCopyText).toHaveBeenCalledWith(copy.querySelector('textarea').value);
    expect(copy.querySelector('[role="status"]').textContent).toBe('Copied. Paste it into the Import box in Quizlet.');
  });
  it('when every copy path fails, the text is selected for the teacher to copy by hand', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn(async () => { throw new Error('blocked by permissions policy'); }) } });
    document.execCommand = vi.fn(() => false);
    exporter().api.handleExportGlossaryFile('quizlet', { back: 'definition' });
    const copy = dialog();
    const area = copy.querySelector('textarea');
    await act(async () => { buttonIn(copy, 'Copy').click(); });
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(document.activeElement).toBe(area);
    expect([area.selectionStart, area.selectionEnd]).toEqual([0, area.value.length]);
    expect(copy.querySelector('[role="status"]').textContent.includes('Ctrl+C')).toBe(true);
  });
  it('Download .txt from the Quizlet dialog saves the same text', () => {
    const { files } = captureDownloads();
    exporter().api.handleExportGlossaryFile('quizlet', { back: 'definition' });
    buttonIn(dialog(), 'Download .txt').click();
    expect(files[0].text).toBe(dialog().querySelector('textarea').value);
    expect(files[0].name.startsWith('Plants-Leaves-quizlet-')).toBe(true);
  });
  it('strings come from the language pack, with the English fallback', () => {
    const t = (k) => ({ 'export.word_list_title': 'Exportar lista de palabras', 'export.word_list_csv': 'Hoja de cálculo (CSV)' })[k] || k;
    window.AlloModules.createExport({ liveRef: { current: { generatedContent: { type: 'glossary', data: words() }, t, addToast: vi.fn() } }, escapeXml: String }).handleExportGlossaryFile('chooser');
    const box = dialog();
    expect(box.querySelector('h2').textContent).toBe('Exportar lista de palabras');
    expect(box.querySelector('input[value="csv"]').closest('label').textContent).toBe('Hoja de cálculo (CSV)');
    expect(box.querySelector('input[value="anki"]').closest('label').textContent).toBe('Anki (text file)');
  });
});

describe('teacher tools entry point', () => {
  function mount(props) {
    const container = document.createElement('div');
    document.body.append(container);
    const root = ReactDOMClient.createRoot(container);
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    act(() => root.render(React.createElement(window.AlloModules.GlossaryView, glossaryMediaProps({ t: (k) => k, isTeacherMode: true, ...props }))));
    cleanups.push(() => { act(() => root.unmount()); container.remove(); quiet.mockRestore(); });
    act(() => container.querySelector('button[aria-controls="glossary-teacher-tools"]').click());
    return container;
  }
  it('one "Export word list…" button after the flash-card exports opens the chooser and returns focus to it', () => {
    const { api } = exporter();
    const container = mount({ handleExportGlossaryFile: api.handleExportGlossaryFile });
    const tools = container.querySelector('[id="glossary-teacher-tools"]');
    const buttons = [...tools.querySelectorAll('button')];
    const index = buttons.findIndex((b) => b.hasAttribute('data-glossary-export-word-list'));
    expect(index, 'the button').toBeGreaterThan(0);
    expect(buttons[index].textContent.trim()).toBe('Export word list…');
    expect(buttons[index - 1].getAttribute('data-help-key')).toMatch(/^glossary_export_(standard|language)$/);
    expect(buttons[index].getAttribute('aria-haspopup')).toBe('dialog');
    buttons[index].focus();
    act(() => buttons[index].click());
    expect(dialog()).not.toBeNull();
    key(document.activeElement, 'Escape');
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(buttons[index]);
  });
  it('an older app shell without the handler shows no dead button', () => {
    const container = mount({});
    expect(container.querySelector('[data-glossary-export-word-list]')).toBeNull();
  });
});
