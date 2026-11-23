import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const SVG_DIAGRAM = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="14"/></svg>', 'utf8').toString('base64');
const WAV = 'data:audio/wav;base64,' + Buffer.from('RIFF' + '\0'.repeat(4) + 'WAVE' + '\0'.repeat(40)).toString('base64');

describe('Wave 5 Track B — 1. Reopen Regression & Fidelity (packets_reopen.js)', () => {
  const tool = require('../dev-tools/make_word_sounds_packet.cjs');
  const { dictionary, core, loader, wordlist, builder } = tool.loadParts();
  const BANKS = tool.loadBanks({ shards: false });
  const verify = require('../packets_verify_core.js');
  const reopen = require('../packets_reopen.js');
  const V = require('../packet_vocab_builder.js');

  const ENV = {
    verify,
    creditLine: builder.creditLine,
    codeName: builder.codeName,
    activities: builder.SUPPORTED_ACTIVITIES,
    wordSounds: core.activityIds(),
    labels: dictionary.labels,
    seeds: { A: 1, B: 2, C: 3 },
  };
  const fakeWav = async (uri) => 'data:audio/wav;base64,' + Buffer.concat([Buffer.from('RIFF0000WAVE'), Buffer.from(uri.slice(-48))]).toString('base64');

  it('accepts built-in AlloFlow Curriculum Diagrams (AGPL-3.0) in creditOf() and rejects arbitrary AGPL-3.0 credits', () => {
    const valid = [
      { title: 'Water Cycle', author: 'AlloFlow', license: 'AGPL-3.0', source: 'AlloFlow Curriculum Diagrams' },
      { author: 'AlloFlow', license: 'AGPL-3.0', source: 'AlloFlow Curriculum Diagrams' },
      { title: 'Plant Cell', author: 'AlloFlow', license: 'AGPL-3.0', source: 'AlloFlow Curriculum Diagrams', resized: true },
    ];
    for (const credit of valid) {
      const line = builder.creditLine(credit);
      const parsed = reopen.creditOf(line, builder.creditLine);
      expect(parsed, line).toBeTruthy();
      expect(parsed.license).toBe('AGPL-3.0');
      expect(parsed.author).toBe('AlloFlow');
      expect(parsed.source).toBe('AlloFlow Curriculum Diagrams');
      expect(builder.creditLine(parsed)).toBe(line);
    }

    const rejected = [
      { title: 'Water Cycle', author: 'Someone Else', license: 'AGPL-3.0', source: 'AlloFlow Curriculum Diagrams' },
      { title: 'Water Cycle', author: 'AlloFlow', license: 'AGPL-3.0', source: 'Other Site' },
      { title: 'Water Cycle', author: 'AlloFlow', license: 'agpl-3.0', source: 'AlloFlow Curriculum Diagrams' },
      { title: 'Water Cycle', author: 'AlloFlow', license: 'AGPL-3.0' },
    ];
    for (const bad of rejected) {
      const line = builder.creditLine(bad);
      expect(reopen.creditOf(line, builder.creditLine), line).toBeNull();
    }
  });

  it('reopens a Word Sounds file carrying a saved built-in AlloFlow diagram without dropping its picture', async () => {
    const diagramCredit = { title: 'Cat diagram', author: 'AlloFlow', license: 'AGPL-3.0', source: 'AlloFlow Curriculum Diagrams' };
    const built = await builder.buildPacket({
      words: ['cat', 'dog', 'sun'],
      activities: ['isolation', 'mapping'],
      seed: 1,
      title: 'Diagram reopen test',
      pictures: true,
      own: { cat: { picture: { dataUri: SVG_DIAGRAM, credit: diagramCredit } } },
      core,
      dictionary,
      banks: BANKS,
      loader,
      wordlist,
      toWav: fakeWav,
    });
    const r = reopen.read(built.html, ENV);
    expect(r.ok).toBe(true);
    expect(r.notes).toEqual([]);
    expect(r.own.cat && r.own.cat.picture).toBeTruthy();
    expect(r.own.cat.picture.dataUri).toBe(SVG_DIAGRAM);
    expect(builder.creditLine(r.own.cat.picture.credit)).toBe(builder.creditLine(diagramCredit));
  });

  it('readVocab() standalone fallback preserves Wave 1-4 order, orderSeed, repeatMissed, readAloud, voices, diagrams, and noPicture', async () => {
    const vocabBank = require('./fixtures/packets_vocab_bank_fixture.js');
    await vocabBank.load();
    const g = { crypto: globalThis.crypto };
    g.window = g;
    new Function('window', read('word_sounds_take_home_loader.js')).call(g, g);
    const th = g.AlloWordSoundsTakeHome;

    const rows = V.draftRows({
      words: ['habitat', 'predator', 'prey', 'cell'],
      bank: vocabBank,
      edits: { words: { prey: { noPicture: true } }, senses: {} },
    });
    const lesson = V.lessonFromVocab({
      loader: th,
      rows,
      types: ['meaning', 'word'],
      mode: 'practice',
      title: 'Science words',
      readAloud: false,
      order: 'mix',
      orderSeed: 7,
    });
    const built = V.buildVocabPacket({
      lesson,
      loader: th,
      rows,
      bank: vocabBank,
      voices: false,
      diagrams: true,
      repeatMissed: true,
      order: 'mix',
      orderSeed: 7,
    });

    const standalone = reopen.readVocab(built.html, { verify });
    expect(standalone.ok).toBe(true);
    expect(standalone.kind).toBe('vocab');
    expect(standalone.vocab).toMatchObject({
      ok: true,
      mode: 'practice',
      order: 'mix',
      orderSeed: 7,
      repeatMissed: true,
      readAloud: false,
      voices: false,
      diagrams: true,
      noPicture: ['prey'],
    });

    // Check mode forces order='blocks', orderSeed=null, repeatMissed=false.
    const checkLesson = V.lessonFromVocab({
      loader: th,
      rows,
      types: ['meaning', 'word'],
      mode: 'check',
      title: 'Science check',
      readAloud: true,
    });
    const checkBuilt = V.buildVocabPacket({
      lesson: checkLesson,
      loader: th,
      rows,
      bank: vocabBank,
      voices: true,
      diagrams: false,
      repeatMissed: true,
      order: 'mix',
      orderSeed: 3,
    });
    const checkStandalone = reopen.readVocab(checkBuilt.html, { verify });
    expect(checkStandalone.ok).toBe(true);
    expect(checkStandalone.vocab).toMatchObject({
      mode: 'check',
      order: 'blocks',
      orderSeed: null,
      repeatMissed: false,
      readAloud: true,
      voices: true,
      diagrams: false,
      noPicture: ['prey'],
    });
  });

  it('partsFor() routes empty-block malformed files to kind "other" instead of falling back to "words"', () => {
    const emptyBlockHtml = [
      '<!doctype html><html><head><title>Malformed</title></head><body>',
      '<script type="application/json" id="packet-manifest">{"packet":{"mode":"practice"}}</script>',
      '<script type="application/json" id="lesson-data">{"title":"Empty","blocks":[]}</script>',
      '</body></html>',
    ].join('');
    for (const fn of ['identify', 'readCheck', 'readMath', 'readVocab', 'readReadAlong']) {
      const res = reopen[fn](emptyBlockHtml, { verify });
      expect(res.ok, fn).toBe(false);
      expect(res.kind, fn).toBe('other');
      expect(res.page, fn).toBeNull();
    }
  });

  it('keeps American English and zero forbidden words in packets_reopen.js and packets_zip.js', () => {
    const combined = read('packets_reopen.js') + '\n' + read('packets_zip.js');
    expect(combined).not.toMatch(/practis|licence|colour|\bmarked\b|\btick(?:ed|s)?\b|favour|behaviour|\bcentre\b|\bAI\b/);
  });
});

describe('Wave 5 Track B — 2. Print Word Cards Bugs & Vocab noPicture Parity', () => {
  const cards = require('../packets-print-cards.js');
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

  function fakeSymbols(words, { ready = true } = {}) {
    const loaded = { ready };
    const index = {
      bytes: 2000000,
      credits: { mulberry: { set: 'Mulberry Symbols', author: 'Steve Lee', license: 'CC BY-SA 4.0', url: 'mulberrysymbols.org' } },
      has: (word) => Object.prototype.hasOwnProperty.call(words, word),
      set: (word) => words[word] || null,
      get: (word) => (loaded.ready && index.has(word) ? { svg: '<svg xmlns="http://www.w3.org/2000/svg"><title>' + word + '</title></svg>', set: words[word] } : null),
      ready: () => loaded.ready,
    };
    return { index, loaded };
  }

  function makeView() {
    const dom = new JSDOM('<!doctype html><html><body><main><button type="button" id="print-cards" hidden>Print word cards</button></main></body></html>', { pretendToBeVisual: true });
    const w = dom.window, d = w.document;
    w.print = () => {};
    w.scrollTo = () => {};
    const api = cards.create(d, w);
    const button = d.getElementById('print-cards');
    let state = { words: [], title: '', pictures: false };
    api.wire(button, () => state);
    return {
      dom, w, d, api, button,
      set(next) { state = next; },
      async open() { button.focus(); button.click(); await settle(); await settle(); },
      choose(name, value) {
        const radio = d.querySelector('input[name="pc-' + name + '"][value="' + value + '"]');
        radio.checked = true;
        radio.dispatchEvent(new w.Event('change', { bubbles: true }));
      },
      said: () => d.querySelector('.pc-said').textContent,
    };
  }

  it('closes on Escape bound to document even when focus is on body, and removes listener on close', async () => {
    const view = makeView();
    view.set({ words: ['cat'], pictures: false });
    await view.open();
    expect(view.api.view().hidden).toBe(false);
    // Move focus to body outside #print-cards-view and press Escape.
    view.d.body.focus();
    view.d.body.dispatchEvent(new view.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(view.api.view().hidden).toBe(true);
    expect(view.d.activeElement).toBe(view.button);
    // After close, Escape on document does not preventDefault.
    const afterEv = new view.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    view.d.dispatchEvent(afterEv);
    expect(afterEv.defaultPrevented).toBe(false);
    view.dom.window.close();
  });

  it('clears stale gotNone note when switching Each card shows back to "word"', async () => {
    const view = makeView();
    const { index } = fakeSymbols({ cat: 'mulberry' }, { ready: false });
    view.set({ words: ['cat'], pictures: true, symbols: index, loadPictures: () => Promise.reject(new Error('offline')) });
    await view.open();
    await settle();
    expect(view.said()).toContain(cards.TEXT.gotNone);
    view.choose('shows', 'word');
    expect(view.said()).not.toContain(cards.TEXT.gotNone);
    view.dom.window.close();
  });

  it('surfaces a plain status note in .pc-said when syllable_table_en.js fails or times out', async () => {
    const view = makeView();
    const timers = [];
    view.w.setTimeout = (fn) => { timers.push(fn); return timers.length; };
    view.w.clearTimeout = () => {};
    view.set({ words: ['elephant', 'cat'], pictures: false });
    await view.open();
    const sylBox = view.d.getElementById('pc-syllables');
    sylBox.checked = true;
    sylBox.dispatchEvent(new view.w.Event('change', { bubbles: true }));
    const script = view.d.querySelector('script[data-allo-syllable-table="1"]');
    expect(script).toBeTruthy();
    script.onerror();
    expect(view.said()).toContain(cards.TEXT.syllablesFailed);
    // Unchecking syllables clears the failure note; re-checking and timing out also surfaces the note.
    sylBox.checked = false;
    sylBox.dispatchEvent(new view.w.Event('change', { bubbles: true }));
    expect(view.said()).not.toContain(cards.TEXT.syllablesFailed);
    timers.length = 0;
    sylBox.checked = true;
    sylBox.dispatchEvent(new view.w.Event('change', { bubbles: true }));
    expect(timers.length).toBeGreaterThan(0);
    timers[0]();
    expect(view.said()).toContain(cards.TEXT.syllablesFailed);
    view.dom.window.close();
  });

  it('deduplicates words case-insensitively and looks up own pictures and symbols case-insensitively', async () => {
    const { index } = fakeSymbols({ cat: 'mulberry', dog: 'mulberry' });
    const pics = cards.picturesOf(['Cat', 'Dog', 'Sun'], {
      cat: { picture: { dataUri: PNG, credit: { own: true } } },
      dog: { picture: { none: true } },
      SUN: { picture: { dataUri: PNG, credit: { own: true } } },
    }, index);
    expect(pics.Cat).toMatchObject({ uri: PNG, set: 'own' });
    expect(pics.Dog).toBeNull();
    expect(pics.Sun).toMatchObject({ uri: PNG, set: 'own' });

    const view = makeView();
    view.set({
      words: ['Cat', 'cat', 'CAT', 'Dog', 'dog'],
      pictures: true,
      symbols: index,
      own: async () => ({ cat: { picture: { dataUri: PNG, credit: { own: true } } }, dog: { picture: { none: true } } }),
    });
    await view.open();
    const words = [...view.d.querySelectorAll('.pc-card .pc-word')].map((el) => el.textContent);
    expect(words).toEqual(['Cat', 'Dog']);
    const imgs = [...view.d.querySelectorAll('.pc-card')].map((card) => !!card.querySelector('img'));
    expect(imgs).toEqual([true, false]);
    view.dom.window.close();
  });

  it('packets-vocab.js passes { picture: { none: true } } in Print Cards own() when wordEdit(k).noPicture is true', async () => {
    const dom = new JSDOM(read('packets-vocab.html'), { runScripts: 'outside-only', url: 'https://packets.test/packets-vocab.html' });
    const w = dom.window;
    let wiredGetter = null;
    w.AlloWordSoundsTakeHome = {
      buildHtml() { return ''; },
      CHECK_ADAPTERS: { vocab_meaning: {}, vocab_word: {}, vocab_blank: {} },
    };
    w.AlloPacketPrintCards = { wire(_btn, getState) { wiredGetter = getState; return true; } };
    w.AlloVocabBank = { bytes: 100, credits: [], load: () => Promise.resolve(), senses: () => [] };
    w.localStorage.setItem('alloflow-packets-vocab-edits/1', JSON.stringify({
      v: 1,
      words: { cat: { noPicture: true }, dog: { def: 'A loyal pet.' } },
      senses: {},
    }));
    w.eval(read('packet_vocab_builder.js'));
    w.eval(read('packets-vocab.js'));
    await settle();

    expect(typeof wiredGetter).toBe('function');
    const state = wiredGetter();
    const ownMap = await state.own(['Cat', 'Dog', 'Sun']);
    expect(ownMap.Cat).toEqual({ picture: { none: true } });
    expect(ownMap.Dog).toBeUndefined();
    expect(ownMap.Sun).toBeUndefined();
    dom.window.close();
  });
});

describe('Wave 5 Track B — 3. Batch .zip Binary Resilience & Download Revoke Timeout', () => {
  const zipKit = require('../packets_zip.js');
  const join = (parts) => Buffer.concat(parts.map((p) => Buffer.from(p)));

  it('accepts DataView with byteOffset, TypedArrays, ArrayBuffer, and cross-realm Uint8Array in add() and readZip()', () => {
    const backing = new ArrayBuffer(20);
    const full = new Uint8Array(backing);
    full.set([99, 99, 65, 66, 67, 68, 99, 99], 0); // 'ABCD' at offset 2..6
    const dv = new DataView(backing, 2, 4);
    const crossRealm = vm.runInNewContext('new Uint8Array([72, 101, 108, 108, 111])'); // 'Hello'
    expect(crossRealm instanceof Uint8Array).toBe(false);
    expect(ArrayBuffer.isView(crossRealm)).toBe(true);

    const zip = zipKit.create();
    zip.add('from-dv.txt', dv);
    zip.add('from-vm.txt', crossRealm);
    zip.add('from-ab.txt', new Uint8Array([88, 89]).buffer);
    const raw = join(zip.finish());

    // Read back via cross-realm Uint8Array AND via offset DataView.
    const vmRaw = vm.runInNewContext('Uint8Array.from(src)', { src: Array.from(raw) });
    expect(vmRaw instanceof Uint8Array).toBe(false);
    const backVm = zipKit.readZip(vmRaw);
    expect(backVm.map((e) => [e.name, Buffer.from(e.bytes).toString('utf8'), e.crcOk])).toEqual([
      ['from-dv.txt', 'ABCD', true],
      ['from-vm.txt', 'Hello', true],
      ['from-ab.txt', 'XY', true],
    ]);

    const padded = new ArrayBuffer(raw.length + 8);
    new Uint8Array(padded).set(raw, 4);
    const backDv = zipKit.readZip(new DataView(padded, 4, raw.length));
    expect(backDv.map((e) => [e.name, Buffer.from(e.bytes).toString('utf8'), e.crcOk])).toEqual([
      ['from-dv.txt', 'ABCD', true],
      ['from-vm.txt', 'Hello', true],
      ['from-ab.txt', 'XY', true],
    ]);
  });

  it('sanitizes Windows reserved device names and strips trailing dots on path segments', () => {
    const zip = zipKit.create();
    zip.add('CON.html', '1');
    zip.add('con.html', '2');
    zip.add('prn', '3');
    zip.add('AUX.txt', '4');
    zip.add('NUL.tar.gz', '5');
    zip.add('COM1.html', '6');
    zip.add('lpt9.html', '7');
    zip.add('COM0.html', '8');
    zip.add('folder./file.html...', '9');
    zip.add('sub/CON/LPT2.html.', '10');
    const back = zipKit.readZip(join(zip.finish()));
    expect(back.map((e) => e.name)).toEqual([
      '_CON.html',
      '_con-2.html',
      '_prn',
      '_AUX.txt',
      '_NUL.tar.gz',
      '_COM1.html',
      '_lpt9.html',
      'COM0.html',
      'folder/file.html',
      'sub/_CON/_LPT2.html',
    ]);
    expect(back.every((e) => e.crcOk)).toBe(true);
  });

  it('raises .zip URL.revokeObjectURL timeout to 60000 ms across vocab, read-along, and math practice makers', () => {
    for (const file of ['packets-vocab.js', 'packets-read-along.js', 'packets-math-practice.js']) {
      const src = read(file);
      expect(src, file).toMatch(/revokeObjectURL\(url\)[^\n]*60000\)/);
      expect(src, file).not.toMatch(/revokeObjectURL\(url\)[^\n]*1000\)/);
    }
  });
});

describe('Wave 5 Track B — 4. Present & Export P0 Forget Bug & hideInlineSheetButtons', () => {
  it('removes alloflow_word_practice_setup (and legacy key) on Forget my choices, hides duplicate inline sheet buttons, and stays < 55 KB', async () => {
    const scriptSrc = read('packets-present-export.js');
    expect(Buffer.byteLength(scriptSrc, 'utf8')).toBeLessThan(55000);

    const dom = new JSDOM(read('packets-present-export.html'), { runScripts: 'outside-only', url: 'https://packets.test/packets-present-export.html' });
    const w = dom.window;
    w.HTMLElement.prototype.scrollIntoView = () => {};
    w.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) });
    w.localStorage.setItem('alloflow_word_practice_setup', JSON.stringify({ mode: 'spelling', cardTheme: 'cream' }));
    w.localStorage.setItem('alloflow-word-practice-setup-v1', JSON.stringify({ legacy: true }));
    for (const f of ['word_picture_matcher.js', 'word_practice_core.js', 'word_practice_media.js', 'word_practice_ui.js', 'packets_word_starters.js']) {
      w.eval(read(f));
    }
    w.eval(scriptSrc);
    await new Promise((r) => setTimeout(r, 30));

    // Inline presenter omits duplicate .awp-print-sheets because #pe-more already owns the 7 sheets.
    expect(w.document.querySelector('#present-export-host .awp-print-sheets')).toBeNull();
    expect(w.document.querySelectorAll('#present-export-host .awp-delivery button')).toHaveLength(3);
    expect(w.document.getElementById('pe-sheet-type')).toBeTruthy();

    // Clicking Forget my choices deletes BOTH keys.
    const clearBtn = w.document.getElementById('pe-clear-local');
    clearBtn.click();
    expect(w.localStorage.getItem('alloflow_word_practice_setup')).toBeNull();
    expect(w.localStorage.getItem('alloflow-word-practice-setup-v1')).toBeNull();
    expect(w.document.getElementById('pe-clear-status').textContent).toContain('Cleared saved choices');
    dom.window.close();
  });
});

describe('Wave 5 Track B — 5. Shared word_practice_ui.js Calm-UI, Projector, Keyboard & A11y Polish', () => {
  const coreSource = read('word_practice_core.js');
  const uiSource = read('word_practice_ui.js');
  const moduleSource = read('word_practice_module.js');
  const publicModuleSource = read('desktop/web-app/public/word_practice_module.js');
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

  function boot(html = '<!doctype html><html><body><div id="inline-host"></div></body></html>') {
    const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://alloflow.example' });
    const w = dom.window;
    w.HTMLElement.prototype.scrollIntoView = () => {};
    w.eval(coreSource);
    w.eval(uiSource);
    return { dom, w, d: w.document, ui: w.AlloModules.WordPractice };
  }

  it('declutters .awp-delivery to 3 buttons, collapses 7 sheets in .awp-print-sheets, omits when hideInlineSheetButtons is true, and hides inline header during Present', async () => {
    const { dom, d, ui } = boot();
    // Modal open: 3 primary buttons in .awp-delivery + 7 in collapsed .awp-print-sheets; modal header stays visible in Present.
    const modal = ui.open({ words: ['cat', 'dog'] });
    expect([...d.querySelectorAll('.awp-delivery button')].map((b) => b.textContent)).toEqual([
      'Present', 'Download HTML', 'Download PowerPoint',
    ]);
    const sheetDetails = d.querySelector('details.awp-print-sheets');
    expect(sheetDetails).toBeTruthy();
    expect(sheetDetails.open).toBe(false);
    expect(sheetDetails.querySelector('summary').textContent).toBe('Printable classroom sheets (7)');
    expect(sheetDetails.querySelectorAll('button')).toHaveLength(7);

    d.querySelector('.awp-delivery .awp-primary').click();
    await tick();
    expect(d.querySelector('.awp-dialog > .awp-head').hidden).toBe(false);
    modal.close();

    // Inline mount with hideInlineSheetButtons: true omits .awp-print-sheets and hides inline header while presenting.
    const host = d.getElementById('inline-host');
    ui.mount(host, { words: ['cat', 'dog'], hideInlineSheetButtons: true });
    expect(host.querySelector('details.awp-print-sheets')).toBeNull();
    expect(host.querySelectorAll('.awp-delivery button')).toHaveLength(3);
    const inlineHeader = host.querySelector('.awp-dialog > .awp-head');
    expect(inlineHeader.hidden).toBe(false);
    host.querySelector('.awp-delivery .awp-primary').click();
    await tick();
    expect(inlineHeader.hidden).toBe(true);
    const backBtn = [...host.querySelectorAll('button')].find((b) => b.textContent === 'Back to setup');
    backBtn.click();
    expect(inlineHeader.hidden).toBe(false);
    dom.window.close();
  });

  it('ships fullscreen projector CSS, 44px touch targets, flex .awp-symbol-search, and identical root/public word_practice_module.js', () => {
    for (const [name, src] of [['word_practice_ui.js', uiSource], ['word_practice_module.js', moduleSource]]) {
      expect(src, name).toContain('.awp:fullscreen .awp-stage{min-height:68dvh;max-height:78dvh}');
      expect(src, name).toContain('.awp:fullscreen .awp-picture img{max-height:48dvh}');
      expect(src, name).toContain('.awp-checks label{min-height:44px}');
      expect(src, name).toContain('.awp .awp-picture-actions button,.awp .awp-picture-toolbar button{min-height:44px;');
      expect(src, name).toContain('.awp .awp-symbol-search{flex:1 1 12rem;width:auto;');
    }
    expect(publicModuleSource).toBe(moduleSource);
  });

  it('supports H, S, F, M, PageDown/PageUp, and 1-9 sentence shortcuts with guards and unchanged Space', async () => {
    const { dom, w, d, ui } = boot();
    const played = [];
    w.Audio = class FakeAudio {
      constructor(src) { this.src = src; }
      play() { played.push(this.src); Promise.resolve().then(() => this.onended && this.onended()); return Promise.resolve(); }
      pause() {}
      removeAttribute() {}
      load() {}
    };
    let fullscreenCalls = 0;
    const words = [
      { word: 'ship', wordAudio: WAV, phonemes: [{ label: 'sh', audio: WAV }], sentenceActivity: { prompt: 'The ____ sails.', choices: ['rain', 'ship'], answer: 'ship' } },
      { word: 'rain', wordAudio: WAV, phonemes: [{ label: 'r', audio: WAV }], sentenceActivity: { prompt: 'The ____ falls.', choices: ['ship', 'rain'], answer: 'rain' } },
    ];
    ui.open({ words, options: { mode: 'popup', repetitions: 1, shuffle: false, includeAudio: true } });
    d.querySelector('.awp-delivery .awp-primary').click();
    await tick();

    const player = d.querySelector('.awp-player');
    const stage = d.querySelector('.awp-stage');
    player.requestFullscreen = async () => { fullscreenCalls++; };
    const press = (key, target = stage, extra = {}) => {
      const ev = new w.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...extra });
      target.dispatchEvent(ev);
      return ev;
    };

    // H = Hear word, S = Hear sounds
    press('h');
    await tick();
    expect(played).toHaveLength(1);
    press('S');
    await tick();
    expect(played).toHaveLength(2);

    // F = Full screen
    press('f');
    await tick();
    expect(fullscreenCalls).toBe(1);

    // M = Mark/unmark review
    const reviewBtn = [...d.querySelectorAll('button')].find((b) => /review/i.test(b.textContent) && b.classList.contains('awp-review'));
    expect(reviewBtn.getAttribute('aria-pressed')).toBe('false');
    press('m');
    expect(reviewBtn.getAttribute('aria-pressed')).toBe('true');
    press('m');
    expect(reviewBtn.getAttribute('aria-pressed')).toBe('false');

    // PageDown / PageUp move cards when stage is not scrollable
    expect(d.querySelector('.awp-progress').textContent).toBe('Card 1 of 2');
    press('PageDown');
    expect(d.querySelector('.awp-progress').textContent).toBe('Card 2 of 2');
    press('PageUp');
    expect(d.querySelector('.awp-progress').textContent).toBe('Card 1 of 2');

    // When stage IS scrollable, PageDown does not hijack scrolling
    Object.defineProperty(stage, 'scrollHeight', { configurable: true, value: 900 });
    Object.defineProperty(stage, 'clientHeight', { configurable: true, value: 300 });
    const scrollEv = press('PageDown');
    expect(scrollEv.defaultPrevented).toBe(false);
    expect(d.querySelector('.awp-progress').textContent).toBe('Card 1 of 2');
    Object.defineProperty(stage, 'scrollHeight', { configurable: true, value: 300 });

    // Modifier guard: Ctrl+F does not trigger fullscreen
    press('f', stage, { ctrlKey: true });
    await tick();
    expect(fullscreenCalls).toBe(1);

    // Space unchanged: advances on stage, does not preventDefault on button
    press(' ', stage);
    expect(d.querySelector('.awp-progress').textContent).toBe('Card 2 of 2');
    const prevBtn = [...d.querySelectorAll('button')].find((b) => b.textContent === 'Previous');
    const spaceBtnEv = press(' ', prevBtn);
    expect(spaceBtnEv.defaultPrevented).toBe(false);

    // Sentence mode: 1-9 picks choice; H does not leak answer before reveal
    const backBtn = [...d.querySelectorAll('button')].find((b) => b.textContent === 'Back to setup');
    backBtn.click();
    const modeSelect = [...d.querySelectorAll('label')].find((l) => l.querySelector('span')?.textContent === 'Practice activity').querySelector('select');
    modeSelect.value = 'sentence';
    modeSelect.dispatchEvent(new w.Event('change', { bubbles: true }));
    d.querySelector('.awp-delivery .awp-primary').click();
    await tick();

    const sStage = d.querySelector('.awp-stage');
    const beforePlayed = played.length;
    press('h', sStage);
    await tick();
    expect(played.length).toBe(beforePlayed); // withheld before reveal
    press('1', sStage); // 'rain' (wrong)
    expect(d.querySelector('.awp-feedback').textContent).toMatch(/Try another/);
    press('2', sStage); // 'ship' (correct)
    expect(d.querySelector('.awp-feedback').textContent).toMatch(/Yes/);
    dom.window.close();
  });

  it('restores and moves focus cleanly in Picture Manager across Choose symbol, Close, and Remove redraws', async () => {
    const { dom, d, ui } = boot();
    ui.open({
      words: [{ word: 'cat', image: PNG, imageAlt: 'cat' }],
      options: { mode: 'vocabulary', includePictures: true },
      searchSymbols: async () => [{ word: 'cat', label: 'Cat', src: PNG }],
    });
    const manager = d.querySelector('.awp-picture-manager');
    manager.open = true;

    const getRowBtn = (action) => d.querySelector('.awp-picture-row [data-pic-action="' + action + '"]');
    // Choose symbol… focuses search input
    getRowBtn('symbol').click();
    const searchInput = d.querySelector('.awp-symbol-search');
    expect(searchInput).toBeTruthy();
    expect(d.activeElement).toBe(searchInput);

    // Symbol picker Close returns focus to Choose symbol…
    const closeSym = d.querySelector('.awp-symbol-picker button');
    closeSym.click();
    expect(d.querySelector('.awp-symbol-picker')).toBeNull();
    expect(d.activeElement).toBe(getRowBtn('symbol'));

    // Remove moves focus to adjacent button (Edit meaning…) instead of dropping to body
    const removeBtn = getRowBtn('remove');
    expect(removeBtn).toBeTruthy();
    removeBtn.click();
    expect(getRowBtn('remove')).toBeNull();
    expect(d.activeElement).toBe(getRowBtn('edit'));
    expect(d.activeElement).not.toBe(d.body);
    dom.window.close();
  });
});
