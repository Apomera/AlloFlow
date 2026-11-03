import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const lanes = [['source', process.env.EXPORT_SOURCE || 'export_source.jsx'], ['runtime', 'export_module.js']]
  .filter(([lane]) => !process.env.EXPORT_SOURCE_ONLY || lane === 'source');
const output = process.env.GLOSSARY_CARD_ALIAS_OUTPUT || 'tmp/card-set-polish-20261101/export';
const factories = {};
const escapeXml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const names = locale => new Intl.DisplayNames([locale], { type: 'language', languageDisplay: 'standard', fallback: 'none' });
const longKey = 'Community-' + 'longalias'.repeat(26) + ' <saved> لغة';
let browser;
beforeAll(async () => {
  mkdirSync(output, { recursive: true });
  new Function(readFileSync('karaoke_audio_store_module.js', 'utf8'))();
  new Function(readFileSync('ui_font_library_module.js', 'utf8'))();
  for (const [lane, path] of lanes) { delete window.AlloModules.Export; new Function(readFileSync(path, 'utf8'))(); factories[lane] = window.AlloModules.createExport; }
  browser = await chromium.launch({ headless: true });
}, 60000);
afterAll(async () => { await browser?.close(); }, 60000);
afterEach(() => {
  document.body.replaceChildren(); document.documentElement.removeAttribute('lang'); document.documentElement.removeAttribute('dir');
  delete window.__alloReadingSettings; delete window.AlloModules.ModuleScopeExtras;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

const fixture = () => ({ id: 'alias-study', type: 'glossary', title: 'Plant words & meanings', titleLanguage: 'English', data: [{
  entryId: 'leaf', term: 'Leaf & stem', termLanguage: 'English', def: 'A plant part.', definitionLanguage: 'English',
  translations: { French: { term: 'Feuille A', def: 'Première version & sens.' }, fr: { term: 'Feuille B', def: 'Deuxième version <sens>.' }, 'fr-CA': { term: 'Feuille C', def: 'Version canadienne.' }, Empty: '  ' },
}] });
function setup(lane, { data = fixture(), locale = 'en', fontId = null, resolver = null } = {}) {
  document.documentElement.lang = locale; document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  if (resolver) window.AlloModules.ModuleScopeExtras = { getSpeechLangCode: resolver };
  const files = [], saved = JSON.stringify(data), toasts = [];
  vi.stubGlobal('Blob', class { constructor(parts) { this.text = parts.join(''); files.push(this); } });
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:set-aliases'); vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  if (fontId) {
    const fontClass = fontId === 'andika-bold-italic' ? 'font-andika-bold-italic' : 'font-andika-italic';
    window.__alloReadingSettings = { get: () => ({ fontId, fontClass, fontFamily: "'Andika', sans-serif", baseFontSize: 32, lineHeight: 1.6, letterSpacing: .04 }), set() {} };
    vi.spyOn(window.AlloModules.UIFontLibrary, 'exportFontFaceCss').mockResolvedValue({ head: '', css: '' });
  }
  const api = factories[lane]({ liveRef: { current: { generatedContent: data, t: key => key, addToast: (...args) => toasts.push(args) } }, escapeXml });
  return { data, files, toasts, assertSaved: () => expect(JSON.stringify(data)).toBe(saved), async run(mode = 'language', { includeAudio = false, useReadingSettings = !!fontId } = {}) {
    await api.handleExportFlashcards(mode, { includeAudio, useReadingSettings });
    return { html: files.at(-1)?.text, doc: files.length ? new DOMParser().parseFromString(files.at(-1).text, 'text/html') : null };
  } };
}
const profiles = ['standard', 'language'].flatMap(mode => ['en', 'ar'].map(locale => [mode, locale]));
describe.each(lanes)('Printed language-set aliases (%s)', lane => {
  it.each(profiles)('distinguishes saved aliases in %s/%s without combining cards', async (mode, locale) => {
    const run = setup(lane, { locale }); const { doc } = await run.run(mode);
    const friendly = names(locale), expected = [friendly.of('fr') + ' (French)', friendly.of('fr') + ' (fr)', friendly.of('fr-CA')];
    const captions = [...doc.querySelectorAll('.set-caption')].map(node => node.textContent);
    expect(captions).toEqual(expected.map(label => (mode === 'language' ? friendly.of('en') + ' ⟷ ' : '') + label + ' Study Set'));
    expect(new Set(captions).size).toBe(3); expect(doc.querySelectorAll('.card-container')).toHaveLength(3);
    const aliasKeys = [...doc.querySelectorAll('.set-caption .language-alias bdi')];
    expect(aliasKeys.map(node => node.textContent)).toEqual(['French', 'fr']);
    for (const node of aliasKeys) { expect(node.getAttribute('lang')).toBe(''); expect(node.dir).toBe('auto'); }
    const targetLabels = [...doc.querySelectorAll(mode === 'language' ? '.back > .lang-label' : '.front .lang-label:nth-of-type(4)')];
    if (mode === 'language') expect(targetLabels.map(node => node.textContent)).toEqual(expected);
    else {
      expect([...doc.querySelectorAll('.front .secondary-text + .lang-label')].map(node => node.textContent)).toEqual(expected);
      expect([...doc.querySelectorAll('.def-trans strong')].map(node => node.textContent)).toEqual(expected.map(label => label + ':'));
    }
    const translatedText = mode === 'language' ? '.back .primary-text' : '.front .secondary-text';
    expect([...doc.querySelectorAll(translatedText)].map(node => node.textContent)).toEqual(['Feuille A', 'Feuille B', 'Feuille C']);
    expect([...doc.querySelectorAll(mode === 'language' ? '.back .def-text' : '.def-trans > span')].map(node => node.textContent)).toEqual(['Première version & sens.', 'Deuxième version <sens>.', 'Version canadienne.']);
    expect(doc.querySelector('sens')).toBeNull(); run.assertSaved();
  });

  it.each(['standard', 'language'])('keeps unique %s labels unchanged when the alias has no usable translation', async mode => {
    const data = fixture(); data.data[0].translations.fr = '  '; delete data.data[0].translations['fr-CA'];
    const run = setup(lane, { data }); const { doc } = await run.run(mode);
    expect(doc.querySelectorAll('.set-header')).toHaveLength(1);
    expect(doc.querySelector('.set-caption').textContent).toBe((mode === 'language' ? 'English ⟷ ' : '') + 'French Study Set');
    expect(doc.querySelector('.language-alias')).toBeNull(); run.assertSaved();
  });

  it.each(['en', 'ar'])('escapes saved alias suffixes and isolates their direction in %s', async locale => {
    const raw = 'Community <img src=x onerror="bad()"> & لغة';
    const data = fixture(); data.data[0].translations = { French: 'Feuille: Sens.', [raw]: 'Autre: Autre sens.' };
    const run = setup(lane, { data, locale, resolver: value => value === raw ? 'fr' : 'en-US' });
    for (const mode of ['standard', 'language']) {
      const { doc } = await run.run(mode);
      const nodes = [...doc.querySelectorAll('.language-alias bdi')];
      expect(nodes.map(node => node.textContent)).toContain(raw);
      expect(doc.querySelector('[onerror], img, saved')).toBeNull();
      for (const node of nodes) { expect(node.getAttribute('lang')).toBe(''); expect(node.dir).toBe('auto'); }
      expect(doc.querySelector('.set-caption').textContent).toContain(names(locale).of('fr') + ' (French)');
      run.assertSaved();
    }
  });

  it('keeps each raw alias paired to its own prepared recording', async () => {
    const data = fixture(); delete data.data[0].translations['fr-CA'];
    const wav = seed => { const bytes = Buffer.alloc(48); bytes.write('RIFF'); bytes.writeUInt32LE(40, 4); bytes.write('WAVE', 8); bytes.write('fmt ', 12); bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22); bytes.writeUInt32LE(8000, 24); bytes.writeUInt32LE(16000, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34); bytes.write('data', 36); bytes.writeUInt32LE(4, 40); bytes.writeInt16LE(seed, 44); bytes.writeInt16LE(-seed, 46); return bytes.toString('base64'); };
    const clips = [wav(100), wav(200)];
    data.karaokeAudio = { version: 4, entries: Object.fromEntries(['French', 'fr'].map((key, i) => [key, { audio: clips[i], mime: 'audio/wav', synthesisProfile: { language: 'fr' }, identity: { identityVersion: 4, adapterId: 'alloflow.glossary.read-aloud', scopeId: 'main', segmentId: 'entry/leaf/translation/' + key.toLowerCase(), spokenText: i === 0 ? 'Feuille A: Première version & sens.' : 'Feuille B: Deuxième version <sens>.' } }])) };
    const run = setup(lane, { data }); const { doc } = await run.run('language', { includeAudio: true });
    const audio = JSON.parse(doc.getElementById('card-audio-data').textContent), buttons = [...doc.querySelectorAll('.back [data-card-audio]')];
    expect(buttons.map(node => node.getAttribute('aria-label'))).toEqual(['Play Leaf & stem in French (French)', 'Play Leaf & stem in French (fr)']);
    expect(buttons.map(node => audio[node.getAttribute('data-card-audio')])).toEqual(clips.map(clip => 'data:audio/wav;base64,' + clip));
    expect(new Set(buttons.map(node => node.getAttribute('data-card-audio'))).size).toBe(2); run.assertSaved();
  });

  it.each(profiles.flatMap(([mode, locale]) => [320, 1100].map(width => [mode, locale, width])))('renders %s/%s inherited type at 32px and width %i without alias overflow', async (mode, locale, width) => {
    const data = fixture(); data.data[0].translations[longKey] = { term: 'Feuille longue', def: 'Un sens séparé et conservé.' };
    const fontId = locale === 'ar' ? 'andika-bold-italic' : 'andika-italic';
    const run = setup(lane, { data, locale, fontId, resolver: value => value === longKey ? 'fr' : 'en-US' });
    const enabled = await run.run(mode), disabled = await run.run(mode, { useReadingSettings: false });
    const selectedLetterSpacing = window.__alloReadingSettings.get().letterSpacing;
    const page = await browser.newPage({ viewport: { width, height: 1000 } }), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => ['data:', 'blob:'].includes(new URL(route.request().url()).protocol) ? route.continue() : route.abort('blockedbyclient'));
    try {
      await page.setContent(enabled.html);
      const inspect = () => page.evaluate(() => {
        const luminance = color => { const rgb = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => { const channel = value / 255; return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4; }); return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722; };
        const contrast = (foreground, background) => { const a = luminance(foreground), b = luminance(background); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); };
        return { rootSize: getComputedStyle(document.documentElement).fontSize, fits: document.documentElement.scrollWidth <= innerWidth + 1,
          aliases: [...document.querySelectorAll('.language-alias')].map(node => { const css = getComputedStyle(node), header = node.closest('.set-header'), parentCss = getComputedStyle(node.parentElement); return { text: node.textContent, style: css.fontStyle, weight: css.fontWeight, font: css.fontFamily, size: parseFloat(css.fontSize), parentSize: parseFloat(parentCss.fontSize), letterSpacing: css.letterSpacing, parentLetterSpacing: parentCss.letterSpacing, headerContrast: header ? contrast(css.color, getComputedStyle(header).backgroundColor) : null, fits: node.getBoundingClientRect().right <= document.documentElement.clientWidth + 1 && node.getBoundingClientRect().left >= -1 }; }) };
      });
      for (const media of ['screen', 'print']) {
        await page.emulateMedia({ media }); const proof = await inspect();
        expect(proof.rootSize).toBe('32px'); expect(proof.fits).toBe(true); expect(proof.aliases.length).toBeGreaterThanOrEqual(6);
        expect(proof.aliases.filter(alias => alias.headerContrast !== null).length).toBeGreaterThan(0);
        expect(selectedLetterSpacing).toBeGreaterThan(0);
        for (const alias of proof.aliases) { expect(alias.fits).toBe(true); expect(alias.font).toContain('Andika'); expect(alias.style).toBe('italic'); expect(alias.size).toBeLessThan(alias.parentSize); expect(parseFloat(alias.letterSpacing) / alias.size).toBeCloseTo(selectedLetterSpacing, 5); if (alias.headerContrast !== null) expect(alias.headerContrast).toBeGreaterThanOrEqual(4.5); if (locale === 'ar') expect(alias.weight).toBe('700'); }
        writeFileSync(`${output}/native-${lane}-${mode}-${locale}-${width}-${media}.json`, JSON.stringify(proof, null, 2) + '\n');
      }
      expect(errors).toEqual([]);
      writeFileSync(`${output}/print-${lane}-${mode}-${locale}-${width}.html`, enabled.html);
      if (width === 320) await page.locator('.set-header').first().screenshot({ path: `${output}/caption-${lane}-${mode}-${locale}.png` });
      await page.setContent(disabled.html);
      expect(await page.locator('.language-alias').first().evaluate(node => getComputedStyle(node).fontStyle)).toBe('normal');
      run.assertSaved();
    } finally { await page.close(); }
  }, 60000);
});
