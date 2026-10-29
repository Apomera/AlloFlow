import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

let createExport, originalHelpers;
beforeAll(() => {
  new Function(readFileSync('export_source.jsx', 'utf8'))();
  createExport = window.AlloModules.createExport;
  originalHelpers = window.AlloModules.ModuleScopeExtras;
});
afterEach(() => {
  document.querySelector('.agx-dialog')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  document.body.replaceChildren();
  document.documentElement.removeAttribute('lang');
  document.documentElement.removeAttribute('dir');
  window.AlloModules.ModuleScopeExtras = originalHelpers;
  vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});
const attrs = node => [node.getAttribute('lang'), node.getAttribute('dir')];
const click = text => [...document.querySelectorAll('.agx-dialog button')].find(button => button.textContent === text).click();
function open(data, back = 'definition', extra = {}) {
  document.documentElement.lang = 'ar'; document.documentElement.dir = 'rtl';
  const liveRef = { current: { generatedContent: { type: 'glossary', title: 'Plants', data, ...extra }, t: key => key } };
  const api = createExport({ liveRef, escapeXml: String });
  api.handleExportGlossaryFile('quizlet', { back });
  return liveRef;
}

describe('Quizlet preview identity and language', () => {
  it.each(['replace resource', 'edit title in place'])('keeps the download filename with the captured text after %s', change => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 29, 12));
    const files = [];
    vi.stubGlobal('Blob', class { constructor(parts) { this.text = parts.join(''); files.push(this); } });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:quizlet');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { files.at(-1).filename = this.download; });
    const liveRef = open([{ term: 'Leaf', def: 'A plant part.', translations: { Spanish: 'Hoja' } }], 'Spanish');
    if (change === 'replace resource') liveRef.current.generatedContent = { type: 'glossary', title: 'Physics', data: [{ term: 'Force', def: 'A push or pull.' }] };
    else liveRef.current.generatedContent.title = 'Physics';
    vi.setSystemTime(new Date(2026, 9, 30, 1));
    click('Download .txt');
    expect(files[0]).toMatchObject({ filename: 'Plants-quizlet-2026-10-29.txt', text: 'Leaf\tHoja' });
    expect(document.querySelector('textarea').value).toBe(files[0].text);
  });

  it('labels saved term and definition languages independently after skipping an incomplete pair', () => {
    open([{ term: 'Skipped', termLanguage: 'German', def: '' }, { term: 'Hoja', termLanguage: 'Spanish', def: 'Une partie de la plante.', definitionLanguage: 'French (Canadian)' }]);
    expect(document.querySelector('.agx-sample dt').textContent).toBe('Hoja');
    expect(attrs(document.querySelector('.agx-sample dt'))).toEqual(['es', 'ltr']);
    expect(attrs(document.querySelector('.agx-sample dd'))).toEqual(['fr-CA', 'ltr']);
    expect(document.querySelector('.agx-dialog h3').closest('[lang]').lang).toBe('ar');
    expect(document.querySelector('textarea').value).toBe('Hoja\tUne partie de la plante.');
  });

  it.each([['pa-Arab', 'پتہ', 'rtl'], ['ar-Latn', 'waraqa', 'ltr']])('uses the selected %s translation language and script direction', (back, text, direction) => {
    open([{ term: 'Leaf', termLanguage: 'en-US', translations: { [back]: text } }], back);
    expect(attrs(document.querySelector('.agx-sample dt'))).toEqual(['en-US', 'ltr']);
    expect(attrs(document.querySelector('.agx-sample dd'))).toEqual([back, direction]);
    expect(document.querySelector('.agx-sample dd').textContent).toBe(text);
  });

  it('uses saved glossary language when entry fields omit it', () => {
    open([{ term: 'Feuille', def: 'Une partie de la plante.' }], 'definition', { baseLanguage: 'fr-CA' });
    expect(attrs(document.querySelector('.agx-sample dt'))).toEqual(['fr-CA', 'ltr']);
    expect(attrs(document.querySelector('.agx-sample dd'))).toEqual(['fr-CA', 'ltr']);
  });

  it('marks unknown metadata explicitly unknown instead of inheriting the UI language or a helper default', () => {
    window.AlloModules.ModuleScopeExtras = { getSpeechLangCode: () => 'en-US' };
    open([{ term: 'Unknown word', termLanguage: 'Unlisted language', def: 'Unknown meaning', definitionLanguage: 'ar" onclick="alert(1)' }]);
    expect(attrs(document.querySelector('.agx-sample dt'))).toEqual(['', 'auto']);
    expect(attrs(document.querySelector('.agx-sample dd'))).toEqual(['', 'auto']);
    expect(document.querySelector('.agx-sample [onclick]')).toBeNull();
  });
});
