// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const cards = require('../packets-print-cards.js');
const docx = require('../packets_docx.js');
const zipLib = require('../packets_zip.js');
const matcher = require('../word_picture_matcher.js');
const semanticBridge = require('../word_picture_semantic_en.js');
const SYMBOLS = require('../word_sounds_symbols_en.js');
const EXT_SYMBOLS = require('../reading_symbols_ext_en.js');
const WORDLIST = require('../word_sounds_wordlist_en.js');

for (const shard of SYMBOLS.shards) SYMBOLS.add(JSON.parse(read(shard.url)));
for (const shard of EXT_SYMBOLS.shards) EXT_SYMBOLS.add(JSON.parse(read(shard.url)));

const PNG_1X1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function parseStoreZip(bytes) {
  const buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const dec = new TextDecoder('utf-8');
  const entries = {};
  let off = 0;
  while (off + 30 <= buf.length && view.getUint32(off, true) === 0x04034b50) {
    const compSize = view.getUint32(off + 18, true);
    const nameLen = view.getUint16(off + 26, true);
    const extraLen = view.getUint16(off + 28, true);
    const name = dec.decode(buf.subarray(off + 30, off + 30 + nameLen));
    const dataStart = off + 30 + nameLen + extraLen;
    entries[name] = buf.subarray(dataStart, dataStart + compSize);
    off = dataStart + compSize;
  }
  return entries;
}

const doms = [];
afterEach(() => {
  while (doms.length) {
    try { doms.pop().window.close(); } catch (_) {}
  }
  vi.restoreAllMocks();
});

describe('Wave 46 Goal 1: Full Offline Image Coverage & Stale Matcher/Loader Fixes', () => {
  it('loads reading_symbols_ext_en.js, word_picture_semantic_en.js, and word_picture_matcher.js in packets-make.html with strict CSP', () => {
    const html = read('packets-make.html');
    const doc = new JSDOM(html).window.document;
    const srcs = [...doc.querySelectorAll('script[src]')].map((s) => s.getAttribute('src'));
    const symIdx = srcs.indexOf('word_sounds_symbols_en.js');
    expect(symIdx).toBeGreaterThan(-1);
    expect(srcs.slice(symIdx, symIdx + 4)).toEqual([
      'word_sounds_symbols_en.js',
      'reading_symbols_ext_en.js',
      'word_picture_semantic_en.js',
      'word_picture_matcher.js',
    ]);
    expect(doc.querySelector('meta[http-equiv="Content-Security-Policy"]').getAttribute('content'))
      .toBe("default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src data:; connect-src 'self'; form-action 'none'; base-uri 'none'");
  });

  it('jumps offline picture coverage >3x via ReadingSymbolsExt + SemanticBridge + WordPictureMatcher and credits cleanly', () => {
    const allWords = WORDLIST.rows().map((r) => r.word);
    const baseExact = allWords.filter((w) => SYMBOLS.has(w)).length;
    // Sample + targeted check across full wordlist
    const sampleWords = allWords.filter((_, i) => i % 20 === 0);
    const sampleExact = sampleWords.filter((w) => SYMBOLS.has(w)).length;
    const sampleResolved = cards.picturesOf(sampleWords, null, SYMBOLS, matcher, EXT_SYMBOLS, semanticBridge);
    const sampleFull = sampleWords.filter((w) => !!sampleResolved[w]).length;

    expect(baseExact).toBeGreaterThan(1000);
    expect(sampleFull).toBeGreaterThan(sampleExact * 3);

    // Direct ReadingSymbolsExt hits + lemma + semantic + curriculum diagram
    const probeWords = ['happy', 'chicken', 'cats', 'jumping', 'gravity', 'abdomen'];
    const pics = cards.picturesOf(probeWords, null, SYMBOLS, matcher, EXT_SYMBOLS, semanticBridge);
    for (const w of probeWords) {
      expect(pics[w], `expected offline picture for "${w}"`).toBeTruthy();
      expect(pics[w].uri).toMatch(/^data:image\/svg\+xml/);
    }
    // Credits work even when primary symbols is null (ReadingSymbolsExt provides Mulberry/OpenMoji credits)
    const extOnlyPics = cards.picturesOf(['happy', 'chicken'], null, null, matcher, EXT_SYMBOLS, semanticBridge);
    const extCredits = cards.creditsFor(['happy', 'chicken'], extOnlyPics, null, null, EXT_SYMBOLS);
    expect(extCredits.some((l) => l.includes('Mulberry Symbols'))).toBe(true);
    expect(extCredits.some((l) => l.includes('OpenMoji'))).toBe(true);
    expect(extCredits.join('\n')).not.toMatch(/https?:\/\//i);
  });

  it('re-resolves root.AlloWordPictureMatcher and does not skip loadPictures() when 0 words are exact symbols.has() matches', async () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'https://packets.test/packets-make.html',
    });
    doms.push(dom);
    const w = dom.window;
    const d = w.document;
    w.scrollTo = () => {};
    w.AlloReadingSymbolsExt = EXT_SYMBOLS;
    w.AlloWordPictureSemantic = semanticBridge;
    // Simulate matcher not yet attached at openWorksheet() time, then attached during loadPictures()
    w.AlloWordPictureMatcher = null;

    let loadCalls = 0;
    let fakeReady = false;
    const fakeSymbols = {
      bytes: 100000,
      has: (word) => word === 'cat',
      get: (word) => (fakeReady && word === 'cat' ? SYMBOLS.get('cat') : null),
      ready: () => fakeReady,
      credits: SYMBOLS.credits,
      credit: SYMBOLS.credit,
    };

    const inst = cards.create(d, w);
    // Notice 'cats' and 'happy' are NOT exact matches in fakeSymbols.has()!
    await inst.openWorksheet({
      title: 'Delayed Matcher Test',
      words: ['cats', 'happy'],
      activities: ['rhyming'],
      pictures: true,
      symbols: fakeSymbols,
      matcher: null,
      loadPictures: async () => {
        loadCalls += 1;
        fakeReady = true;
        w.AlloWordPictureMatcher = matcher;
        return true;
      },
    });

    expect(loadCalls).toBe(1);
    const imgs = d.querySelectorAll('#print-worksheet-view img.pc-ws-pic');
    expect(imgs.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Wave 46 Goal 2: Pedagogical Worksheet Alignment & Giveaway Fixes (HTML, Live DOM, DOCX)', () => {
  function makeAuditLesson() {
    return {
      title: 'Pedagogy Audit Sheet',
      images: { p0: PNG_1X1 },
      blocks: [
        { activity: 'counting', items: [{ word: 'ship', target: '3', phonemes: ['sh', 'i', 'p'], values: ['1', '2', '3', '4', '5', '6'], wordPicture: 'p0' }] },
        { activity: 'isolation', items: [{ word: 'sun', position: 0, positionName: 'first', target: 's', choices: [{ label: 's' }, { label: 'm' }, { label: 't' }], wordPicture: 'p0' }] },
        { activity: 'segmentation', items: [{ word: 'frog', target: 'f r o g', sounds: ['f', 'r', 'o', 'g'], chips: [{ label: 'f' }, { label: 'r' }, { label: 'o' }, { label: 'g' }], wordPicture: 'p0' }] },
        { activity: 'syllable_counting', items: [{ word: 'rabbit', count: 2, target: '2', syllables: ['rab', 'bit'], wordPicture: 'p0' }] },
        { activity: 'blending', items: [{ word: 'cat', target: 'cat', phonemes: ['k', 'a', 't'], sounds: ['k', 'a', 't'], choices: [{ text: 'cat' }, { text: 'cot' }, { text: 'cut' }], wordPicture: 'p0' }] },
        { activity: 'syllable_blending', items: [{ word: 'sunset', target: 'sunset', syllables: ['sun', 'set'], choices: [{ text: 'sunset' }, { text: 'raincoat' }], wordPicture: 'p0' }] },
        { activity: 'mapping', items: [{ word: 'blarg', target: 'b l a r g', graphemes: ['b', 'l', 'ar', 'g'], phonemes: ['b', 'l', 'ar', 'g'] }] },
        { activity: 'missing_letter', items: [{ word: 'blarg', letters: ['b', '', 'arg'], hiddenIndex: 1, target: 'l', options: ['l', 'r', 's'] }] },
        { activity: 'word_scramble', items: [{ word: 'blarg', target: 'blarg', letters: ['g', 'b', 'a', 'r', 'l'] }] },
        {
          activity: 'decoding',
          items: [
            { word: 'fish', printed: 'fish', target: 'fish', choices: [{ text: 'fish', image: 'p0' }, { text: 'unpictured1' }, { text: 'unpictured2' }] },
            { word: 'cat', printed: 'cat', target: 'cat', choices: [{ text: 'cat', image: 'p0' }, { text: 'dog', image: 'p0' }, { text: 'sun', image: 'p0' }] },
          ],
        },
      ],
    };
  }

  it('hides spelled words and phoneme/syllable strings on listening tasks by default (showListeningWords=false) in HTML, keeping full Teacher Answer Key', () => {
    const html = cards.buildWordSoundsWorksheetHtml(makeAuditLesson(), {
      pictures: true,
      answerKey: true,
      hints: true,
      symbols: null,
      matcher: null,
    });
    const doc = new JSDOM(html).window.document;

    // 1. counting: no printed word "ship", neutral alt "Picture clue 1", listen cue present
    const cnt = doc.querySelector('section[data-activity="counting"]');
    expect(cnt.textContent).not.toContain('ship');
    expect(cnt.textContent).toContain('Listen to your teacher:');
    expect(cnt.querySelector('img.ws-pic').getAttribute('alt')).toBe('Picture clue 1');

    // 2. isolation: no printed word "sun", neutral alt "Picture clue 1"
    const iso = doc.querySelector('section[data-activity="isolation"]');
    expect(iso.textContent).not.toContain('sun');
    expect(iso.querySelector('.ws-prompt').textContent).toContain('Listen to your teacher:');
    expect(iso.querySelector('img.ws-pic').getAttribute('alt')).toBe('Picture clue 1');

    // 3. segmentation: no printed word "frog", neutral alt "Picture clue 1"
    const seg = doc.querySelector('section[data-activity="segmentation"]');
    expect(seg.textContent).not.toContain('frog');
    expect(seg.textContent).toContain('Listen to your teacher:');
    expect(seg.querySelector('img.ws-pic').getAttribute('alt')).toBe('Picture clue 1');

    // 4. syllable_counting: no printed word "rabbit", neutral alt "Picture clue 1"
    const sc = doc.querySelector('section[data-activity="syllable_counting"]');
    expect(sc.textContent).not.toContain('rabbit');
    expect(sc.textContent).toContain('Listen to your teacher:');
    expect(sc.querySelector('img.ws-pic').getAttribute('alt')).toBe('Picture clue 1');

    // 5. blending: no printed /k/ · /a/ · /t/ sequence, no spoiler picture, listen cue present
    const bl = doc.querySelector('section[data-activity="blending"]');
    expect(bl.querySelector('.ws-sounds-seq')).toBeNull();
    expect(bl.querySelector('img')).toBeNull();
    expect(bl.textContent).toContain('Listen to your teacher:');

    // 6. syllable_blending: no printed "sun · set" sequence, no spoiler picture
    const sb = doc.querySelector('section[data-activity="syllable_blending"]');
    expect(sb.querySelector('.ws-sounds-seq')).toBeNull();
    expect(sb.querySelector('img')).toBeNull();
    expect(sb.textContent).toContain('Listen to your teacher:');

    // 7. mapping / missing_letter / word_scramble with NO picture -> show "Listen to your teacher:"
    for (const act of ['mapping', 'missing_letter', 'word_scramble']) {
      const sec = doc.querySelector(`section[data-activity="${act}"]`);
      expect(sec.querySelector('img')).toBeNull();
      expect(sec.textContent).toContain('Listen to your teacher:');
    }

    // 8. decoding: item 1 has only 1 pictured choice -> omit choice list completely (no text fallback!)
    const decItems = doc.querySelectorAll('section[data-activity="decoding"] .ws-item');
    expect(decItems[0].querySelector('.ws-choices')).toBeNull();
    expect(decItems[0].textContent).toContain('Read aloud');
    expect(decItems[0].textContent).toContain('Read smoothly');
    expect(decItems[0].textContent).not.toContain('unpictured1');
    // item 2 has 3 pictured choices -> shows picture choices only (zero answer text inside .ws-choices)
    const dec2Choices = decItems[1].querySelector('.ws-choices');
    expect(dec2Choices).not.toBeNull();
    expect(dec2Choices.querySelectorAll('img')).toHaveLength(3);
    expect(dec2Choices.textContent.trim()).toBe('');

    // 9. Teacher Answer Key keeps full read-aloud words/sounds/syllables
    const keyText = doc.querySelector('section.ws-key').textContent;
    expect(keyText).toContain('ship');
    expect(keyText).toContain('sun');
    expect(keyText).toContain('frog');
    expect(keyText).toContain('rabbit');
    expect(keyText).toContain('Say: /k/ · /a/ · /t/');
    expect(keyText).toContain('Say: sun · set');
  });

  it('restores printed listening words when showListeningWords=true and wires #pc-ws-listening-words checkbox in live modal', async () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'https://packets.test/packets-make.html',
    });
    doms.push(dom);
    const w = dom.window;
    const d = w.document;
    w.scrollTo = () => {};

    const inst = cards.create(d, w);
    await inst.openWorksheet(makeAuditLesson());

    const toggle = d.getElementById('pc-ws-listening-words');
    expect(toggle).not.toBeNull();
    expect(toggle.checked).toBe(false);
    expect(d.querySelector('#print-worksheet-view section[data-activity="counting"]').textContent).not.toContain('ship');
    expect(d.querySelector('#print-worksheet-view section[data-activity="blending"] .pc-ws-sounds-seq')).toBeNull();

    // Check the toggle -> printed words and sound sequences appear in live preview
    toggle.checked = true;
    toggle.dispatchEvent(new w.Event('change', { bubbles: true }));
    expect(d.querySelector('#print-worksheet-view section[data-activity="counting"]').textContent).toContain('ship');
    expect(d.querySelector('#print-worksheet-view section[data-activity="blending"] .pc-ws-sounds-seq').textContent).toBe('/k/ · /a/ · /t/');

    // Standalone HTML with showListeningWords: true embeds option in <template>
    const htmlOn = cards.buildWordSoundsWorksheetHtml(makeAuditLesson(), {
      pictures: true,
      answerKey: true,
      showListeningWords: true,
      symbols: null,
      matcher: null,
    });
    const parsed = cards.extractWorksheetTemplate(htmlOn);
    expect(parsed.ok).toBe(true);
    expect(parsed.options.showListeningWords).toBe(true);
  });

  it('enforces neutral alt text, showListeningWords=false hiding, no-picture listen cues, and no decoding text giveaways in packets_docx.js', () => {
    const res = docx.buildWordSoundsDocx({
      title: 'DOCX Pedagogy Audit',
      answerKeyOn: false,
      hintsOn: true,
      showListeningWords: false,
      sections: [
        { activity: 'counting', label: 'Sound Counting', items: [{ word: 'shark', values: ['1', '2', '3'], pictureUri: PNG_1X1 }] },
        { activity: 'isolation', label: 'Find Sounds', items: [{ word: 'sun', positionName: 'first', choices: ['s', 'm'], pictureUri: PNG_1X1 }] },
        { activity: 'segmentation', label: 'Break It Down', items: [{ word: 'frog', slotCount: 4, sounds: ['f', 'r', 'o', 'g'], pictureUri: PNG_1X1 }] },
        { activity: 'syllable_counting', label: 'Syllable Counting', items: [{ word: 'rabbit', values: ['1', '2', '3'], pictureUri: PNG_1X1 }] },
        { activity: 'blending', label: 'Blend Sounds', items: [{ word: 'cat', sounds: ['k', 'a', 't'], pictureUri: PNG_1X1 }] },
        { activity: 'syllable_blending', label: 'Syllable Blending', items: [{ word: 'sunset', syllables: ['sun', 'set'], pictureUri: PNG_1X1 }] },
        { activity: 'mapping', label: 'Sound Mapping', items: [{ word: 'mapword', soundCount: 3, pictureUri: PNG_1X1 }, { word: 'nopicword', soundCount: 3, pictureUri: '' }] },
        { activity: 'missing_letter', label: 'Missing Letter', items: [{ word: 'cat', letters: ['c', 'a', 't'], hiddenIndex: 1, choices: ['a', 'e'], pictureUri: '' }] },
        { activity: 'word_scramble', label: 'Word Scramble', items: [{ word: 'frog', tiles: ['g', 'f', 'o', 'r'], pictureUri: '' }] },
        {
          activity: 'decoding',
          label: 'Word Reading',
          items: [
            { word: 'fish', pictureUri: PNG_1X1, choices: [{ text: 'fish', pictureUri: PNG_1X1 }, { text: 'secrettext' }] },
          ],
        },
      ],
    }, { zip: zipLib });

    const xml = new TextDecoder().decode(parseStoreZip(res.bytes)['word/document.xml']);
    // None of the hidden listening words or phoneme/syllable sequences should appear in student sheet XML (including image alt text!)
    expect(xml).not.toContain('shark');
    expect(xml).not.toContain('sun');
    expect(xml).not.toContain('frog');
    expect(xml).not.toContain('rabbit');
    expect(xml).not.toContain('mapword');
    expect(xml).not.toContain('/k/');
    expect(xml).not.toContain('secrettext');
    expect(xml).toContain('Picture clue 1');
    expect(xml).toContain('Listen to your teacher:');
    expect(xml).toContain('Read aloud');
    expect(xml).toContain('Read smoothly');

    // With showListeningWords: true, printed words appear as before
    const resShown = docx.buildWordSoundsDocx({
      title: 'DOCX Shown Words',
      answerKeyOn: false,
      showListeningWords: true,
      sections: [
        { activity: 'counting', label: 'Sound Counting', items: [{ word: 'shark', values: ['1', '2', '3'] }] },
        { activity: 'blending', label: 'Blend Sounds', items: [{ word: 'cat', sounds: ['k', 'a', 't'] }] },
      ],
    }, { zip: zipLib });
    const xmlShown = new TextDecoder().decode(parseStoreZip(resShown.bytes)['word/document.xml']);
    expect(xmlShown).toContain('shark');
    expect(xmlShown).toContain('/k/');
  });
});
