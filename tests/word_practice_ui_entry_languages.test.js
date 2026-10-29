import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const lanes = {
  source: ['word_practice_core.js', 'word_practice_media.js', 'word_practice_ui.js'].map(file => fs.readFileSync(file, 'utf8')).join('\n'),
  runtime: fs.readFileSync('word_practice_module.js', 'utf8')
};
const windows = [];
afterEach(() => { while (windows.length) windows.pop().close(); });
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const wav = marker => 'data:audio/wav;base64,' + Buffer.from('RIFF' + '\0'.repeat(4) + 'WAVE' + marker + '\0'.repeat(40)).toString('base64');
const english = wav('english'), french = wav('french'), first = wav('financial'), second = wav('river');
const button = (doc, text) => [...doc.querySelectorAll('button')].find(node => node.textContent === text && !node.parentElement.closest('[hidden]'));
const checkboxes = doc => [...doc.querySelectorAll('.awp-meaning-choices input')];
const sameWords = () => [
  { entryId: 'financial', term: 'bank', termLanguage: 'English', def: 'A financial institution.', definitionLanguage: 'English', wordAudio: first },
  { entryId: 'river', term: 'bank', termLanguage: 'English', def: 'The land beside a river.', definitionLanguage: 'English', wordAudio: second }
];
function load(lane) {
  const dom = new JSDOM('<!doctype html><html lang="en"><body><button>Launch</button></body></html>', { runScripts: 'outside-only', url: 'https://alloflow.example/' });
  const win = dom.window; windows.push(win); win.eval(lanes[lane]);
  const blobs = [];
  win.URL.createObjectURL = blob => { blobs.push(blob); return 'blob:entry-' + blobs.length; }; win.URL.revokeObjectURL = () => {};
  win.HTMLAnchorElement.prototype.click = function () {};
  return { win, doc: win.document, ui: win.AlloModules.WordPractice, core: win.AlloWordPracticeCore, blobs };
}
async function blobText(context) {
  return new Promise((resolve, reject) => { const reader = new context.win.FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsText(context.blobs.at(-1)); });
}
async function save(context) { button(context.doc, 'Save word set').click(); await tick(); return JSON.parse(await blobText(context)); }
function edit(context, value) { const input = context.doc.querySelector('.awp-fields textarea'); input.value = value; input.dispatchEvent(new context.win.Event('change', { bubbles: true })); }
function offline(context, input, options = {}, labels, uiLanguage) {
  const dom = new JSDOM(context.ui.buildHtml(input, { mode: 'vocabulary', repetitions: 1, includeAudio: false, ...options }, undefined, labels, undefined, uiLanguage), { runScripts: 'dangerously' });
  windows.push(dom.window); return dom.window.document;
}
const stale = () => ({ language: 'French', currentUiLanguage: 'English', words: [{ word: 'pain', _ttsAssets: { pain: { mime: 'audio/wav', base64: english.split(',')[1], provenance: { language: 'English', resolvedVoice: 'Kore', source: 'synthesized' } } } }], options: { repetitions: 1 } });

describe.each(Object.keys(lanes))('Practice entry identity and interface languages (%s)', lane => {
  it('keeps both meanings and recordings through real Save/Open actions', async () => {
    const c = load(lane); c.ui.open({ words: sameWords(), options: { mode: 'vocabulary', repetitions: 1 } });
    expect(c.doc.querySelector('textarea').value).toBe('bank\nbank'); expect(checkboxes(c.doc).map(node => node.checked)).toEqual([true, true]);
    const saved = await save(c); expect(saved.items.map(item => item.entryId)).toEqual(['financial', 'river']);
    expect(saved.items.map(item => item.wordAudio)).toEqual([first, second]);
    const ids = saved.items.map(item => item.id), file = c.doc.querySelector('input[type=file]');
    Object.defineProperty(file, 'files', { configurable: true, value: [{ size: 10000, text: async () => JSON.stringify(saved) }] }); file.dispatchEvent(new c.win.Event('change', { bubbles: true })); await tick();
    expect((await save(c)).items.map(item => item.id)).toEqual(ids);
  });

  it('lets the teacher select and restore a particular meaning without losing keyboard focus', async () => {
    const c = load(lane); c.ui.open({ words: sameWords(), options: { repetitions: 1 } });
    const firstChoice = checkboxes(c.doc)[0]; firstChoice.focus(); firstChoice.click();
    expect(c.doc.activeElement.dataset.entryId).toBe('entry:financial');
    expect((await save(c)).items.map(item => item.entryId)).toEqual(['river']);
    checkboxes(c.doc).find(node => node.dataset.entryId === 'entry:financial').click();
    const restored = await save(c); expect(restored.items.map(item => item.entryId).sort()).toEqual(['financial', 'river']);
    expect(restored.items.find(item => item.entryId === 'financial').wordAudio).toBe(first);
  });

  it('restores a chosen meaning even after all same-spelling entries have been removed', async () => {
    const c = load(lane); c.ui.open({ words: sameWords() }); checkboxes(c.doc).find(node => node.dataset.entryId === 'entry:financial').click(); checkboxes(c.doc).find(node => node.dataset.entryId === 'entry:river').click();
    expect(c.doc.querySelector('textarea').value).toBe('');
    checkboxes(c.doc).find(node => node.dataset.entryId === 'entry:river').click();
    expect((await save(c)).items.map(item => item.definition)).toEqual(['The land beside a river.']);
  });

  it('preserves removed entries while assigning collision-free identities to newly typed words', async () => {
    const c = load(lane); c.ui.open({ words: [{ word: 'ship', definition: 'A boat.', wordAudio: first }] });
    const original = (await save(c)).items[0]; edit(c, 'rain'); const added = (await save(c)).items[0]; expect(added.id).not.toBe(original.id);
    edit(c, 'ship\nrain'); const both = await save(c); expect(both.items[0]).toEqual(original); expect(both.items[1].id).toBe(added.id);
    edit(c, 'rain\nrain'); expect((await save(c)).items).toHaveLength(1);
  });

  it('keeps distinct meanings when other words are removed or reordered', async () => {
    const c = load(lane); c.ui.open({ words: [...sameWords(), { word: 'river', definition: 'Flowing water.' }] });
    edit(c, 'river\nbank\nbank'); const saved = await save(c);
    expect(saved.items.map(item => item.definition)).toEqual(['Flowing water.', 'A financial institution.', 'The land beside a river.']);
  });

  it('keeps same-spelling words in different languages distinct and names each language beside its meaning', async () => {
    const c = load(lane);
    c.ui.open({ currentUiLanguage: 'French', words: [
      { word: 'gift', termLanguage: 'English', definition: 'A present.', wordAudio: first },
      { word: 'Gift', termLanguage: 'German', definition: 'A poison.', wordAudio: second },
    ], options: { mode: 'vocabulary', repetitions: 1, shuffle: false } });
    expect(checkboxes(c.doc)).toHaveLength(2);
    expect([...c.doc.querySelectorAll('.awp-meaning-language')].map(node => [node.textContent, node.lang])).toEqual([['anglais', 'fr'], ['allemand', 'fr']]);
    expect(c.doc.querySelector('.awp-meaning-choices').textContent).toContain('A present.'); expect(c.doc.querySelector('.awp-meaning-choices').textContent).toContain('A poison.');
    const original = await save(c), ids = original.items.map(item => item.id);
    expect(original.items.map(item => item.termLanguage)).toEqual(['English', 'German']);
    expect(original.items.map(item => item.wordAudio)).toEqual([first, second]);
    edit(c, 'gift\nGift'); expect((await save(c)).items.map(item => item.id)).toEqual(ids);
    checkboxes(c.doc)[0].click(); const selected = await save(c);
    expect(selected.items).toHaveLength(1); expect(selected.items[0]).toMatchObject({ id: ids[1], termLanguage: 'German', definition: 'A poison.', wordAudio: second });
    checkboxes(c.doc).find(node => node.dataset.entryId === ids[0]).click();
    const restored = await save(c), file = c.doc.querySelector('input[type=file]');
    Object.defineProperty(file, 'files', { configurable: true, value: [{ size: 10000, text: async () => JSON.stringify(restored) }] }); file.dispatchEvent(new c.win.Event('change', { bubbles: true })); await tick();
    const reopened = await save(c); expect(reopened.items.map(item => [item.id, item.termLanguage, item.wordAudio])).toEqual(restored.items.map(item => [item.id, item.termLanguage, item.wordAudio]));
  });

  it('reports an over-capacity meaning restoration without an uncaught error or a misleading checked state', async () => {
    const c = load(lane); c.ui.open({ words: [...sameWords(), ...Array.from({ length: 198 }, (_, index) => ({ word: 'word-' + index }))] });
    checkboxes(c.doc).find(node => node.dataset.entryId === 'entry:financial').click();
    edit(c, c.doc.querySelector('textarea').value + '\nnew-word');
    checkboxes(c.doc).find(node => node.dataset.entryId === 'entry:financial').click();
    expect(checkboxes(c.doc).find(node => node.dataset.entryId === 'entry:financial').checked).toBe(false);
    expect(c.doc.querySelector('.awp-status').textContent).toContain('200'); expect((await save(c)).items).toHaveLength(200);
  });

  it('warns about stale recordings, retains provenance in Save JSON and keeps them out of offline HTML bytes/playback', async () => {
    const c = load(lane); c.ui.open(stale());
    expect(c.doc.querySelector('.awp-audio-warning').hidden).toBe(false);
    const saved = await save(c); expect(saved.items[0].wordAudio).toBe(''); expect(saved.items[0].wordAudioOriginal.audio).toBe(english); expect(saved.items[0].wordAudioOriginal.provenance.language).toBe('English');
    button(c.doc, 'Download HTML').click(); await tick(); const html = await blobText(c); expect(html).not.toContain(english);
    const dom = new JSDOM(html, { runScripts: 'dangerously' }); windows.push(dom.window);
    expect(button(dom.window.document, 'Hear word').disabled).toBe(true); expect(dom.window.document.querySelector('.awp-audio-warning').textContent).toContain('1 saved recording');
  });

  it('refreshes stale playable audio without discarding the retained original recording', async () => {
    const c = load(lane), requests = []; c.ui.open({ ...stale(), callTTS: async (word, voice, speed, options) => { requests.push(options.language); options.onResolvedProfile({ language: 'French', provider: 'gemini', resolvedVoice: 'Kore' }); return french; } });
    button(c.doc, 'Prepare audio').click(); await tick(); await tick();
    const saved = await save(c); expect(requests).toEqual(['French']); expect(saved.items[0].wordAudio).toBe(french); expect(saved.items[0].wordAudioOriginal.audio).toBe(english); expect(c.doc.querySelector('.awp-audio-warning').hidden).toBe(true);
  });

  it('honors the explicit no-audio option for both playable and retained recordings', async () => {
    const c = load(lane); c.ui.open(stale());
    const option = [...c.doc.querySelectorAll('label')].find(label => label.textContent === 'Include prepared audio').querySelector('input'); option.click();
    const saved = await save(c); expect(JSON.stringify(saved)).not.toContain(english); expect(saved.items[0].wordAudioOriginal).toBeUndefined();
    button(c.doc, 'Download HTML').click(); await tick(); const html = await blobText(c); expect(html).not.toContain(english);
  });

  it.each(['presenter', 'offline'])('keeps French UI separate from Arabic words and English definitions in the %s', async surface => {
    const c = load(lane), input = { language: 'Arabic', currentUiLanguage: 'French', words: [{ entryId: 'leaf', word: 'ورقة', termLanguage: 'ar', definition: 'A plant part.', definitionLanguage: 'English', example: 'Une feuille.', exampleLanguage: 'French' }] };
    const values = { next: 'Suivant', show_meaning: 'Afficher le sens', card_progress: 'Carte {n} sur {total}', card_announce: 'Carte {n} sur {total}. {visible}' };
    let doc;
    if (surface === 'presenter') { c.ui.open({ ...input, t: key => values[key.replace('word_practice.', '')] || key, options: { mode: 'vocabulary', repetitions: 1, includeAudio: false } }); button(c.doc, 'Present').click(); await tick(); doc = c.doc; }
    else doc = offline(c, input, {}, values, 'French');
    const host = doc.querySelector('.awp-player'); expect(host.lang).toBe('fr'); expect(host.dir).toBe('ltr');
    expect(button(doc, 'Suivant').lang).toBe('fr'); expect(button(doc, 'Full screen').lang).toBe('en');
    button(doc, 'Afficher le sens').click(); expect(doc.querySelector('.awp-word').lang).toBe('ar'); expect(doc.querySelector('.awp-word').dir).toBe('rtl');
    for (const scope of ['.awp-card', '.awp-sr']) { expect(doc.querySelector(scope + ' .awp-definition').lang).toBe('en'); expect(doc.querySelector(scope + ' .awp-example').lang).toBe('fr'); }
    if (surface === 'offline') { expect(doc.documentElement.lang).toBe('fr'); expect(doc.documentElement.dir).toBe('ltr'); }
  });

  it('uses neutral metadata for unknown UI/content languages and English for readable fallback controls', () => {
    const c = load(lane), doc = offline(c, { language: 'Unlisted language', words: ['word'] }, {}, { next: 'Translated control' }, 'Unlisted UI');
    expect(doc.documentElement.lang).toBe('und'); expect(doc.documentElement.dir).toBe('auto'); expect(doc.querySelector('.awp-word').lang).toBe('und'); expect(doc.querySelector('.awp-word').dir).toBe('auto');
    expect(button(doc, 'Translated control').lang).toBe('und'); expect(button(doc, 'Full screen').lang).toBe('en');
  });

  it('keeps English defaults in the compatible HTML API while tagging Arabic lesson content independently', () => {
    const c = load(lane), doc = offline(c, { language: 'ar-Latn', words: ['waraqa'] });
    expect(doc.documentElement.lang).toBe('en'); expect(doc.documentElement.dir).toBe('ltr'); expect(doc.querySelector('.awp-word').lang).toBe('ar-Latn'); expect(doc.querySelector('.awp-word').dir).toBe('ltr');
  });

  it('keeps sentence prompt and answer languages independent without announcing a concealed answer', () => {
    const c = load(lane), doc = offline(c, { language: 'Spanish', words: [{ word: 'hoja', termLanguage: 'Spanish', sentenceActivity: { prompt: 'Find the ____.', language: 'English', choices: ['hoja', 'mesa'], answer: 'hoja' } }] }, { mode: 'sentence' }, undefined, 'French');
    expect(doc.querySelector('.awp-card .awp-detail').lang).toBe('en'); expect([...doc.querySelectorAll('.awp-choices button')].map(node => node.lang)).toEqual(['es', 'es']); expect(doc.querySelector('.awp-sr').textContent).not.toContain('hoja');
    button(doc, 'Reveal answer').click(); expect(doc.querySelector('.awp-feedback span').lang).toBe('es'); expect(doc.querySelector('.awp-sr').textContent).toContain('hoja'); expect(doc.querySelector('.awp-sr span[lang="es"]').textContent).toBe('hoja');
  });

  it('tags authored titles as content and dynamic English fallback messages independently of the French interface', async () => {
    const c = load(lane), doc = offline(c, { title: 'أوراق', language: 'Arabic', words: ['ورقة'] }, {}, { next: 'Suivant' }, 'French');
    expect(doc.querySelector('h1').lang).toBe('ar');
    button(doc, 'Full screen').click(); await tick(); expect(doc.querySelector('.awp-status').lang).toBe('en');
  });
});
