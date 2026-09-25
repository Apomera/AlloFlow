import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

// Word help on ADAPTED texts (2026-09-24): opt-in supports anchored to the
// adapted passage, stored apart from the original's readingSupports, and shown
// to students only when the teacher turns them on.

let api;
beforeAll(() => {
  // Mutation runs load a scratch copy so a mutant never reaches the shared file.
  if (process.env.ADAPTED_HELP_CONTRACT) new Function(readFileSync(process.env.ADAPTED_HELP_CONTRACT, 'utf8'))(); else loadAlloModule('instructional_context_module.js');
  loadAlloModule('firestore_sync_module.js');
  api = window.AlloModules.InstructionalContext;
});
const PASSAGE = 'The heron walked slowly in the shallow water.';
function pair(data = PASSAGE + '\n\n--- ENGLISH TRANSLATION ---\n\nEnglish words heron here.') {
  const original = api.createSupportedReading(api.createSourceSnapshot('The heron waded through the marsh.', { sourceArtifactId: 'src' }), { id: 'orig', sourceFamilyId: 'heron', unitId: 'birds' });
  const adapted = { id: 'adapted-1', type: 'simplified', data, instructionalText: { form: 'adapted', role: 'supplemental' },
    sourceSnapshot: original.sourceSnapshot, sourceFamilyId: 'heron', unitId: 'birds', config: { language: 'English' } };
  return { original, adapted };
}
const at = (text, quote, extra = {}) => { const start = text.indexOf(quote); return { id: 'a-' + start, start, end: start + quote.length, quote, text: 'Meaning of ' + quote, ...extra }; };

describe('adapted word help', () => {
  it('recognizes adapted readings only', () => {
    const { original, adapted } = pair();
    expect(api.isAdaptedReading(adapted)).toBe(true);
    expect(api.isAdaptedReading(original)).toBe(false);
    expect(api.isAdaptedReading({ ...adapted, type: 'quiz' })).toBe(false);
  });

  it('anchors to the adapted passage, never its English translation', () => {
    const { adapted } = pair();
    expect(api.getAdaptedSupportSnapshot(adapted).text).toBe(PASSAGE);
    const inTranslation = { id: 'x', start: adapted.data.lastIndexOf('heron'), end: adapted.data.lastIndexOf('heron') + 5, quote: 'heron', text: 'no' };
    const checked = api.validateAdaptedReadingSupports(adapted, { annotations: [inTranslation] });
    expect(checked.annotations).toEqual([]);
  });

  it('is off for students until the teacher shows it', () => {
    const { adapted } = pair();
    let help = api.upsertAdaptedReadingSupport(adapted, undefined, at(PASSAGE, 'shallow'));
    expect(help).toMatchObject({ shown: false, passageLength: PASSAGE.length });
    expect(help.annotations[0]).toMatchObject({ quote: 'shallow', origin: 'educator' });
    help = api.setAdaptedReadingSupportsShown(adapted, help, true);
    expect(api.validateAdaptedReadingSupports(adapted, help).shown).toBe(true);
    // Adding or editing a support while it is shown keeps it shown.
    help = api.upsertAdaptedReadingSupport(adapted, help, at(PASSAGE, 'heron'));
    expect(help.shown).toBe(true);
    help = api.removeAdaptedReadingSupport(adapted, help, help.annotations.find(entry => entry.quote === 'heron').id);
    // Editing, pinning and removing keep the teacher's choice.
    help = api.setAdaptedReadingSupportPinned(adapted, help, help.annotations[0].id, true);
    expect(help.shown).toBe(true);
    help = api.removeAdaptedReadingSupport(adapted, help, help.annotations[0].id);
    expect(help).toMatchObject({ shown: true, annotations: [] });
  });

  it('goes stale when the passage is edited, but not when text is added after it', () => {
    const { adapted } = pair();
    const help = api.setAdaptedReadingSupportsShown(adapted, api.upsertAdaptedReadingSupport(adapted, undefined, at(PASSAGE, 'heron')), true);
    const appended = { ...adapted, data: adapted.data + '\n\nReferences: Audubon (1840).' };
    expect(api.validateAdaptedReadingSupports(appended, help).annotations.map(entry => entry.quote)).toEqual(['heron']);
    const edited = { ...adapted, data: adapted.data.replace('slowly', 'quickly') };
    const stale = api.validateAdaptedReadingSupports(edited, help);
    expect(stale).toMatchObject({ status: 'stale', shown: false, annotations: [] });
    expect(() => api.upsertAdaptedReadingSupport(edited, help, at(edited.data, 'heron'))).toThrow(/adapted text changed/);
  });

  it('carries word help onto text added after the passage, so the new text can get word help too', () => {
    const { adapted } = pair(PASSAGE);
    const help = api.setAdaptedReadingSupportsShown(adapted, api.upsertAdaptedReadingSupport(adapted, undefined, at(PASSAGE, 'heron')), true);
    const longer = { ...adapted, data: PASSAGE + ' Then an egret landed beside it.' };
    expect(api.validateAdaptedReadingSupports(longer, help)).toMatchObject({ status: 'complete', shown: true, passageLength: longer.data.length, annotations: [{ quote: 'heron', start: 4 }] });
    expect(api.adaptedGenerationSnapshot(longer, help).text).toBe(longer.data);
    const egret = longer.data.indexOf('egret');
    const added = api.upsertAdaptedReadingSupport(longer, help, { id: 'e', start: egret, end: egret + 5, quote: 'egret', text: 'A white heron.' });
    expect(added.annotations.map(entry => entry.quote)).toEqual(['heron', 'egret']);
    expect(added.shown).toBe(true); // the teacher's own edit keeps it shown
    expect(api.validateAdaptedReadingSupports(longer, added).status).toBe('complete');
  });

  it('never touches the original or its supports', () => {
    const { original, adapted } = pair();
    const before = JSON.stringify(original);
    api.upsertAdaptedReadingSupport(adapted, undefined, at(PASSAGE, 'heron'));
    expect(JSON.stringify(original)).toBe(before);
    expect(() => api.upsertAdaptedReadingSupport(original, undefined, at(original.data, 'heron'))).toThrow(/adapted reading/);
  });

  it('carries teacher pictures like the original does', () => {
    const { adapted } = pair();
    const help = api.upsertAdaptedReadingSupport(adapted, undefined, at(PASSAGE, 'heron', { image: { src: 'data:image/png;base64,QUJD', alt: 'A heron.', source: 'mulberry' } }));
    expect(help.annotations[0].image).toMatchObject({ alt: 'A heron.', source: 'mulberry' });
  });

  it('keeps teacher edits when suggestions are refreshed, even after an edit left them stale', () => {
    const { adapted } = pair();
    let help = api.setAdaptedReadingSupportsShown(adapted, api.upsertAdaptedReadingSupport(adapted, undefined, at(PASSAGE, 'heron', { text: 'A tall wading bird.' })), true);
    const snapshot = api.adaptedGenerationSnapshot(adapted, help);
    const suggestions = api.validateReadingSupports(snapshot, [at(PASSAGE, 'heron', { text: 'AI text' }), at(PASSAGE, 'shallow')]);
    help = api.mergeAdaptedReadingSupports(adapted, help, suggestions);
    expect(help.annotations.map(entry => [entry.quote, entry.text, entry.origin])).toEqual([['heron', 'A tall wading bird.', 'educator'], ['shallow', 'Meaning of shallow', 'generated']]);
    // A new suggestion the teacher has not checked: hidden from students until shown again.
    expect(help.shown).toBe(false);
    const shownAgain = api.setAdaptedReadingSupportsShown(adapted, help, true);
    // A refresh that adds nothing new leaves it as the teacher set it.
    expect(api.mergeAdaptedReadingSupports(adapted, shownAgain, suggestions).shown).toBe(true);
    // The teacher removes the "shallow" suggestion, then edits the passage.
    help = api.removeAdaptedReadingSupport(adapted, help, help.annotations.find(entry => entry.quote === 'shallow').id);
    const edited = { ...adapted, data: 'A heron stood in the shallow pond.' };
    const fresh = api.adaptedGenerationSnapshot(edited, help);
    expect(fresh.text).toBe('A heron stood in the shallow pond.');
    const restarted = api.mergeAdaptedReadingSupports(edited, help, api.validateReadingSupports(fresh, [at(fresh.text, 'shallow'), at(fresh.text, 'pond')]));
    // Suggesting after an edit keeps the teacher's explanation and removal where their words survived.
    expect(restarted.annotations.map(entry => [entry.quote, entry.text])).toEqual([['heron', 'A tall wading bird.'], ['pond', 'Meaning of pond']]);
    expect(restarted.suppressedAnnotations.map(entry => entry.quote)).toEqual(['shallow']);
    // Even a refresh that adds nothing new keeps edited word help hidden until the teacher checks it.
    const quiet = api.mergeAdaptedReadingSupports(edited, api.setAdaptedReadingSupportsShown(adapted, help, true), api.validateReadingSupports(fresh, []));
    expect(quiet.annotations.map(entry => entry.quote)).toEqual(['heron']);
    expect(quiet.shown).toBe(false);
    expect(restarted.shown).toBe(false); // an edited passage needs the teacher to show it again
  });

  it('after an edit, keeps the explanations whose words are still there', () => {
    const TEXT = 'The heron walked slowly in the shallow water. The heron ate.';
    const { adapted } = pair(TEXT);
    const nth = (quote, n) => { let at = -1; for (let i = 0; i <= n; i++) at = TEXT.indexOf(quote, at + 1); return at; };
    const entry = (quote, n, text, extra = {}) => ({ id: quote + n, start: nth(quote, n), end: nth(quote, n) + quote.length, quote, text, ...extra });
    let help = api.upsertAdaptedReadingSupport(adapted, undefined, entry('heron', 1, 'The second heron.', { image: { src: 'data:image/png;base64,QUJD', alt: 'A heron.' } }));
    help = api.upsertAdaptedReadingSupport(adapted, help, entry('shallow', 0, 'Not deep.'));
    help = api.upsertAdaptedReadingSupport(adapted, help, entry('slowly', 0, 'Not fast.'));
    help = api.upsertAdaptedReadingSupport(adapted, help, entry('heron', 0, 'The first heron.'));
    help = api.setAdaptedReadingSupportsShown(adapted, api.removeAdaptedReadingSupport(adapted, help, 'heron0'), true);
    const edited = { ...adapted, data: 'Look! The heron walked carefully in the shallow water. The heron ate. Heronries are nests.' };
    expect(api.validateAdaptedReadingSupports(edited, help).status).toBe('stale');
    const kept = api.rebaseAdaptedReadingSupports(edited, help);
    // Each moves to the nearest whole-word match of its own words; a word that is gone is dropped.
    expect(kept.annotations.map(a => [a.quote, a.start, a.text])).toEqual([['shallow', 40, 'Not deep.'], ['heron', 59, 'The second heron.']]);
    expect(kept.annotations[1]).toMatchObject({ origin: 'educator', image: { alt: 'A heron.' } });
    // The removed first heron stays removed, so a refresh cannot bring it back.
    expect(kept.suppressedAnnotations).toEqual([{ start: 10, end: 15, quote: 'heron' }]);
    // An explanation can stop fitting when its sentence changes, so kept ones wait for the teacher.
    expect(kept.shown).toBe(false);
    expect(api.validateAdaptedReadingSupports(edited, kept)).toMatchObject({ status: 'complete', shown: false });
    // Only whole words count: "heron" inside "herons" is not a match.
    const plural = { ...adapted, data: 'The herons walked slowly in the shallow water.' };
    expect(api.rebaseAdaptedReadingSupports(plural, help).annotations.map(a => a.quote)).toEqual(['slowly', 'shallow']);
    // When the kept heron's own spot is gone, it takes the removed one's place and still shows.
    const one = { ...adapted, data: 'The heron walked slowly in the shallow water. It ate.' };
    const moved = api.rebaseAdaptedReadingSupports(one, help);
    expect(moved.annotations.find(a => a.quote === 'heron')).toMatchObject({ start: 4, text: 'The second heron.' });
    expect(moved.suppressedAnnotations).toEqual([]);
  });

  it('reuses explanations from the original for words the adapted text kept', () => {
    const { adapted } = pair('The heron walks in wet land. Herons are birds. The shallow water is warm.');
    const TEXT = adapted.data;
    const ORIGINAL = 'Herons wade through marshes. The heron stalks minnows in the shallows.';
    const from = (quote, text, extra = {}) => ({ id: 'o' + ORIGINAL.indexOf(quote), start: ORIGINAL.indexOf(quote), end: ORIGINAL.indexOf(quote) + quote.length, quote, text, ...extra });
    const originalHelp = [from('Herons', 'Tall wading birds.', { origin: 'educator', image: { src: 'data:image/png;base64,QUJD', alt: 'A heron.' } }), from('marshes', 'Wet land.'), from('heron', 'One heron.'), from('shallows', 'Shallow water.')];
    let help = api.upsertAdaptedReadingSupport(adapted, undefined, { id: 't', start: TEXT.indexOf('birds'), end: TEXT.indexOf('birds') + 5, quote: 'birds', text: 'Animals with feathers.' });
    help = api.upsertAdaptedReadingSupport(adapted, help, { id: 'w', start: TEXT.indexOf('water'), end: TEXT.indexOf('water') + 5, quote: 'water', text: 'x' });
    help = api.removeAdaptedReadingSupport(adapted, help, 'w');
    const withOriginal = api.importOriginalSupportsIntoAdapted(adapted, help, [...originalHelp, { ...originalHelp[0], id: 'dup' }]);
    expect(withOriginal.annotations.map(a => [a.quote, a.start, a.text, a.origin])).toEqual([
      ['heron', 4, 'One heron.', 'generated'], ['Herons', 29, 'Tall wading birds.', 'educator'], ['birds', 40, 'Animals with feathers.', 'educator']]);
    expect(withOriginal.annotations[1].image).toMatchObject({ alt: 'A heron.' });
    // Case does not matter; the anchor takes the adapted text's own spelling.
    const upper = api.importOriginalSupportsIntoAdapted(adapted, undefined, [from('heron', 'One heron.', { quote: 'HERON' })]);
    expect(upper.annotations.map(a => [a.quote, a.start])).toEqual([['heron', 4]]);
    // A word the teacher removed here is not brought back.
    expect(api.importOriginalSupportsIntoAdapted(adapted, help, [{ id: 'x', start: 0, end: 5, quote: 'water', text: 'Liquid.' }]).annotations.map(a => a.quote)).toEqual(['birds']);
    expect(withOriginal.status).toBe('complete');
    // A word already explained here is not added again at another spot.
    const twice = pair('The heron saw a heron.').adapted;
    const once = api.upsertAdaptedReadingSupport(twice, undefined, { id: 'h', start: 4, end: 9, quote: 'heron', text: 'Mine.' });
    expect(api.importOriginalSupportsIntoAdapted(twice, once, [from('heron', 'One heron.')]).annotations.map(a => [a.start, a.text])).toEqual([[4, 'Mine.']]);
    // Copied explanations wait for the teacher to check them.
    expect(api.importOriginalSupportsIntoAdapted(adapted, api.setAdaptedReadingSupportsShown(adapted, help, true), originalHelp).shown).toBe(false);
  });

  it('treats a last word that grew longer as an edit, not an addition', () => {
    const { adapted } = pair('The dog ran');
    const help = api.setAdaptedReadingSupportsShown(adapted, api.upsertAdaptedReadingSupport(adapted, undefined, { id: 'r', start: 8, end: 11, quote: 'ran', text: 'Moved fast.' }), true);
    expect(api.validateAdaptedReadingSupports({ ...adapted, data: 'The dog ranted loudly.' }, help)).toMatchObject({ status: 'stale', shown: false });
    expect(api.validateAdaptedReadingSupports({ ...adapted, data: 'The dog ran. Then it slept.' }, help)).toMatchObject({ status: 'complete', shown: true });
  });

  it('matches whole words in languages written without spaces, and by whole characters', () => {
    const cp = (...codes) => String.fromCodePoint(...codes);
    const riverbank = cp(0x6cb3, 0x8fb9);
    const zh = cp(0x5c0f, 0x72d7, 0x5728, 0x6cb3, 0x8fb9, 0x8dd1, 0x3002, 0x5c0f, 0x72d7, 0x5f88, 0x5feb, 0x4e50, 0x3002);
    const { adapted } = pair(zh);
    const chinese = { ...adapted, config: { language: 'Chinese' } };
    const help = api.upsertAdaptedReadingSupport(chinese, undefined, { id: 'g', start: zh.indexOf(riverbank), end: zh.indexOf(riverbank) + 2, quote: riverbank, text: 'river bank' });
    const edited = cp(0x4eca, 0x5929, 0xff0c, 0x5c0f, 0x72d7, 0x5728, 0x6cb3, 0x8fb9, 0x8dd1, 0x3002);
    expect(api.rebaseAdaptedReadingSupports({ ...chinese, data: edited }, help).annotations.map(entry => [entry.quote, entry.start])).toEqual([[riverbank, edited.indexOf(riverbank)]]);
    // A letter outside the basic range right before "cat" makes it part of a word.
    const astral = 'x ' + cp(0x1d400) + 'cat cat';
    expect(api.rebaseAdaptedReadingSupports({ ...adapted, data: astral }, { annotations: [{ id: 'c', start: 3, end: 6, quote: 'cat', text: 'x' }] }).annotations.map(entry => entry.start)).toEqual([astral.lastIndexOf('cat')]);
  });

  it('still finds whole words, character by character, where the browser has no word segmenter', () => {
    const saved = Intl.Segmenter;
    try {
      delete Intl.Segmenter;
      const astral = 'y ' + String.fromCodePoint(0x1d400) + 'cat cat, cats.';
      const { adapted } = pair(astral);
      expect(api.rebaseAdaptedReadingSupports(adapted, { annotations: [{ id: 'c', start: 3, end: 6, quote: 'cat', text: 'x' }] }).annotations.map(entry => entry.start)).toEqual([astral.indexOf('cat,')]);
    } finally { Intl.Segmenter = saved; }
  });

  it('keeps explanations for a word that now appears as a possessive', () => {
    const curly = String.fromCharCode(0x2019);
    for (const mark of ["'", curly]) {
      const text = 'The heron' + mark + 's legs are long.';
      const { adapted } = pair(text);
      expect(api.rebaseAdaptedReadingSupports(adapted, { annotations: [{ id: 'h', start: 4, end: 9, quote: 'heron', text: 'A bird.' }] }).annotations.map(entry => entry.start)).toEqual([4]);
    }
  });

  it('does not split the same texts into words again and again', () => {
    const Real = Intl.Segmenter;
    let made = 0;
    Intl.Segmenter = class extends Real { constructor(...args) { super(...args); made++; } };
    try {
      const a = 'The heron waded. '.repeat(50) + 'unique-a', b = 'The heron walked. '.repeat(50) + 'unique-b';
      for (let i = 0; i < 20; i++) { api.isWordEdge(a, 4); api.isWordEdge(b, 4); }
      expect(made).toBe(2);
    } finally { Intl.Segmenter = Real; }
  });

  it('ignores capitals word by word, whatever other letters the passage holds', () => {
    const text = 'Photosynthesis happens in ' + String.fromCodePoint(0x130) + 'zmir.';
    const { adapted } = pair(text);
    expect(api.importOriginalSupportsIntoAdapted(adapted, undefined, [{ id: 'p', start: 0, end: 14, quote: 'photosynthesis', text: 'Plants making food.' }]).annotations.map(entry => [entry.quote, entry.start])).toEqual([['Photosynthesis', 0]]);
  });

  it('takes first suggestions when there is no word help yet', () => {
    const { adapted } = pair();
    const snapshot = api.adaptedGenerationSnapshot(adapted, undefined);
    const help = api.mergeAdaptedReadingSupports(adapted, undefined, api.validateReadingSupports(snapshot, [at(PASSAGE, 'heron')]));
    expect(help).toMatchObject({ shown: false, passageLength: PASSAGE.length, annotations: [{ quote: 'heron', origin: 'generated' }] });
  });

  it('travels in cloud saves and live sessions (live sessions drop pictures, as for every image)', () => {
    const { adapted } = pair();
    adapted.adaptedReadingSupports = api.setAdaptedReadingSupportsShown(adapted,
      api.upsertAdaptedReadingSupport(adapted, undefined, at(PASSAGE, 'heron', { image: { src: 'data:image/png;base64,QUJD', alt: 'A heron.' } })), true);
    const cloud = window.sanitizeHistoryForCloud([adapted])[0];
    expect(api.validateAdaptedReadingSupports(cloud, cloud.adaptedReadingSupports)).toMatchObject({ shown: true, annotations: [{ quote: 'heron', image: { alt: 'A heron.' } }] });
    const live = window.prepareSessionResourcesForWrite([adapted]).resources[0];
    const liveHelp = api.validateAdaptedReadingSupports(live, live.adaptedReadingSupports);
    expect(liveHelp).toMatchObject({ shown: true, annotations: [{ quote: 'heron', text: 'Meaning of heron' }] });
    expect(liveHelp.annotations[0].image ?? null).toBe(null);
  });
});
