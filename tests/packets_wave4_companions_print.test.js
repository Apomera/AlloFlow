// Wave 4 Track A: Companion tools, Present & Export, Print Sheets, My Words & Hub CSS.
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';
import { fakeIndexedDB } from './helpers/packets_fake_indexeddb.js';

const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf8');
const opened = [];
afterEach(() => { while (opened.length) { try { opened.pop().close(); } catch (_) {} } });
const wait = (ms = 20) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, what) => {
  for (let i = 0; i < 300; i++) {
    if (fn()) return;
    await wait(15);
  }
  throw new Error('Timed out waiting for ' + what);
};

function wavBytes(ms = 250) {
  const samples = Math.round(24000 * ms / 1000), data = samples * 2, buf = Buffer.alloc(44 + data);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + data, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(24000, 24); buf.writeUInt32LE(48000, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(data, 40);
  return new Uint8Array(buf);
}
const WAV_URI = 'data:audio/wav;base64,' + Buffer.from(wavBytes(300)).toString('base64');

describe('1. Present & Export: compact bar, closed sheet fold, word-source sync & dynamic picture queue', () => {
  it('folds classroom sheets and links into closed #pe-more, adds .top-menu, syncs #pe-word-source on #words= and edits, and builds #pe-find-online queue', async () => {
    const html = read('packets-present-export.html');
    const dom = new JSDOM(html, {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://packets.test/packets-present-export.html#words=volcano,glacier,cat',
    });
    const w = dom.window, d = w.document;
    opened.push(w);

    expect(d.querySelector('header.top details.top-menu nav a[aria-current="page"]')?.getAttribute('href')).toBe('packets-present-export.html');
    const more = d.getElementById('pe-more');
    expect(more && more.tagName === 'DETAILS' && !more.open).toBe(true);
    expect(more.contains(d.getElementById('pe-sheet-type'))).toBe(true);
    expect(more.contains(d.getElementById('pe-find-online'))).toBe(true);
    expect(more.contains(d.getElementById('pe-open-symbol-runner'))).toBe(true);
    expect(d.getElementById('pe-word-source').closest('#pe-more')).toBeNull();

    w.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) });
    let mountedPack = null;
    w.AlloModules = {
      WordPractice: {
        mount(host, pack) {
          mountedPack = pack;
          host.innerHTML = '<div class="awp-grid"><div class="awp-fields"><input value="Custom"><textarea>volcano\nglacier\ncat</textarea></div></div>';
          return {
            setPack(p) { mountedPack = p; },
            getPack() { return mountedPack; },
          };
        },
        rasterizeImage: async () => 'data:image/png;base64,iVBORw0KGgo=',
      },
    };
    w.eval(read('packets_word_starters.js'));
    w.eval(read('packets-present-export.js'));
    await wait(30);

    // #words= hash sets #pe-word-source to 'custom' instead of staying stuck on starter:short-vowels.
    expect(d.getElementById('pe-word-source').value).toBe('custom');
    expect(d.getElementById('pe-custom-opt').hidden).toBe(false);
    expect(d.getElementById('pe-custom-opt').textContent).toContain('3');

    // #pe-find-online queues unpictured words dynamically, and #pe-more-now summarizes live state.
    expect(d.getElementById('pe-find-online').getAttribute('href')).toBe('packets-pictures.html#from=present&word=volcano&more=glacier%2Ccat');
    expect(d.getElementById('pe-more-now').textContent).toContain('2-sided flashcards');
    expect(d.getElementById('pe-more-now').textContent).toContain('3 words need pictures');

    // Switching to a starter hides custom option and syncs select value.
    w.AlloPacketsPresentExport.applyStarter('blends-digraphs');
    expect(d.getElementById('pe-word-source').value).toBe('starter:blends-digraphs');
    expect(d.getElementById('pe-custom-opt').hidden).toBe(true);

    // Editing words in the presenter textarea switches #pe-word-source back to custom.
    const area = d.querySelector('#present-export-host .awp-fields textarea');
    area.value = 'nebula\nquasar';
    area.dispatchEvent(new w.Event('input', { bubbles: true }));
    expect(d.getElementById('pe-word-source').value).toBe('custom');
    expect(d.getElementById('pe-custom-opt').textContent).toBe('Custom word list');

    // Changing sheet type updates the closed #pe-more-now summary.
    const sheetSel = d.getElementById('pe-sheet-type');
    sheetSel.value = 'bingo';
    sheetSel.dispatchEvent(new w.Event('change', { bubbles: true }));
    expect(d.getElementById('pe-more-now').textContent).toContain('Classroom Bingo boards');
  });
});

describe('2. Computer Voice: 25 voices in 3 optgroups, Hear sample, live batch redraw & Step 1 removal status', () => {
  it('groups 25 voices with am_adam, plays sample, redraws rows mid-batch, and announces removals in Step 1', async () => {
    const html = read('packets-voice.html');
    const dom = new JSDOM(html, {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://packets.test/packets-voice.html#words=zib,zop',
    });
    const w = dom.window, d = w.document;
    opened.push(w);

    expect(d.querySelector('header.top details.top-menu')).toBeTruthy();
    const groups = [...d.querySelectorAll('#f-voice optgroup')].map((g) => ({
      label: g.getAttribute('label'),
      values: [...g.querySelectorAll('option')].map((o) => o.value),
    }));
    expect(groups.map((g) => g.label)).toEqual(['Recommended', 'More US voices', 'More British voices']);
    const allValues = groups.flatMap((g) => g.values);
    expect(allValues).toHaveLength(25);
    expect(groups[0].values).toContain('am_adam');
    expect(d.getElementById('hear-sample').disabled).toBe(true);

    w.indexedDB = fakeIndexedDB();
    const played = [];
    w.Audio = class {
      constructor(src) { this.src = src; }
      play() { played.push(this.src); return Promise.resolve(); }
      pause() {}
    };

    let releaseSecond = null;
    const spoken = [];
    w.fetch = async (url) => {
      if (String(url) === 'engine_runtime_integrity.json') return { ok: true, json: async () => ({ schemaVersion: 1, assets: {}, graphs: {} }) };
      if (String(url).startsWith('blob:voice/')) return { ok: true, arrayBuffer: async () => wavBytes(300).buffer };
      return { ok: false, json: async () => ({}) };
    };
    const realAppend = w.HTMLHeadElement.prototype.appendChild;
    d.head.appendChild = function (node) {
      if (node && node.tagName === 'SCRIPT') {
        const src = node.getAttribute('src');
        if (src === 'packets_audio_kit.js') w.eval(read('packets_audio_kit.js'));
        if (src === 'runtime_graph_host.js') w._alloInstallRuntimeGraphHost = (_c, t) => { t.__alloCreateVerifiedWorker = () => {}; };
        if (src === 'kokoro_tts_loader.js') {
          w._kokoroTTS = {
            init: async () => true,
            speak: async (text, voice) => {
              spoken.push({ text, voice });
              if (text === 'zop') {
                await new Promise((r) => { releaseSecond = r; });
              }
              return 'blob:voice/' + text;
            },
          };
        }
        setTimeout(() => node.onload && node.onload(), 0);
        return node;
      }
      return realAppend.call(this, node);
    };

    w.eval(read('packets_my_words.js'));
    w.eval(read('packets_voice_engine.js'));
    w.eval(read('packets-voice.js'));
    await until(() => d.querySelectorAll('.voice-row').length === 2, 'rows loaded');

    d.getElementById('get-voice').click();
    await until(() => !d.getElementById('hear-sample').disabled, 'voice ready');

    // Hear sample plays selected voice and reports in #sample-said.
    d.getElementById('f-voice').value = 'bf_emma';
    d.getElementById('hear-sample').click();
    await until(() => d.getElementById('sample-said').textContent === 'Playing sample.', 'sample played');
    expect(spoken[0]).toEqual({ text: 'The quick fox jumped over the brown log.', voice: 'bf_emma' });
    expect(played.length).toBe(1);

    // Live per-word row redraw during makeSome: zib flips to recorded while zop is still in flight.
    d.getElementById('make-all').click();
    await until(() => typeof releaseSecond === 'function', 'zop in flight');
    await until(() => /computer-voice recording/.test(d.querySelector('[data-word="zib"] .voice-state').textContent), 'zib live redraw');
    expect(d.querySelector('[data-word="zop"] .voice-state').textContent).toBe('No recording yet.');
    releaseSecond();
    await until(() => /2 recordings made/.test(d.getElementById('make-said').textContent), 'batch done');

    // Removing a recording announces near Step 1 (#rows-said), not off-screen #make-said.
    const makeSaidBefore = d.getElementById('make-said').textContent;
    d.querySelector('[data-remove="zib"]').click();
    await until(() => d.getElementById('rows-said').textContent.includes('zib is removed'), 'step 1 removal status');
    expect(d.getElementById('rows-said').closest('section').querySelector('#word-rows')).toBeTruthy();
    expect(d.getElementById('make-said').textContent).toBe(makeSaidBefore);
  });
});

describe('3. Vocab Lookup & #step=2 return: stale clear, busy disable, consent .is-on, 404 Skip & Step 2 deep-link', () => {
  it('clears stale #found on input, disables #look while fetching, toggles .is-on, skips on 404, and links #back to #step=2', async () => {
    const html = read('packets-vocab-lookup.html');
    const dom = new JSDOM(html, {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://packets.test/packets-vocab-lookup.html#word=photosynthesis&more=unknownword,tundra',
    });
    const w = dom.window, d = w.document;
    opened.push(w);

    expect(d.querySelector('header.top details.top-menu')).toBeTruthy();
    expect(d.getElementById('back').getAttribute('href')).toBe('packets-vocab.html#step=2');

    let finishFetch = null;
    w.fetch = (url) => new Promise((resolve) => {
      finishFetch = () => {
        if (String(url).includes('unknownword')) {
          resolve({ ok: false, status: 404, json: async () => ({}) });
        } else {
          resolve({
            ok: true,
            status: 200,
            json: async () => ([{ meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'Making food from light.' }] }] }]),
          });
        }
      };
    });

    w.eval(read('packets-page.js'));
    w.eval(read('packets-vocab-lookup.js'));

    // Queue line and Skip button visible immediately for queued words.
    expect(d.getElementById('queue-line').hidden).toBe(false);
    expect(d.getElementById('queue-line').textContent).toContain('2 more');
    expect(d.getElementById('skip-word').hidden).toBe(false);

    // Consent switch toggles .is-on on parent .radio label.
    const box = d.getElementById('online-on');
    expect(box.parentNode.classList.contains('is-on')).toBe(false);
    box.checked = true;
    box.dispatchEvent(new w.Event('change', { bubbles: true }));
    expect(box.parentNode.classList.contains('is-on')).toBe(true);

    // #look disables while fetching and re-enables on completion.
    d.getElementById('look').click();
    expect(d.getElementById('look').disabled).toBe(true);
    expect(d.getElementById('look').getAttribute('aria-busy')).toBe('true');
    finishFetch();
    await wait(20);
    expect(d.getElementById('look').disabled).toBe(false);
    expect(d.getElementById('found').hidden).toBe(false);

    // Typing a new word clears & hides stale #found so old word cannot be saved.
    d.getElementById('word').value = 'unknownword';
    d.getElementById('word').dispatchEvent(new w.Event('input', { bubbles: true }));
    expect(d.getElementById('found').hidden).toBe(true);
    d.getElementById('use').click();
    expect(w.localStorage.getItem('alloflow-packets-vocab-edits/1')).toBeNull();

    // 404 mentions Skip to next word with queue count, and Skip advances to tundra.
    d.getElementById('look').click();
    finishFetch();
    await wait(20);
    expect(d.getElementById('look-line').textContent).toContain('Skip to next word');
    expect(d.getElementById('skip-word').hidden).toBe(false);
    d.getElementById('skip-word').click();
    expect(d.getElementById('word').value).toBe('unknownword');
    // Skip again to reach tundra (queue had [unknownword, tundra]).
    d.getElementById('skip-word').click();
    expect(d.getElementById('word').value).toBe('tundra');
    expect(d.getElementById('skip-word').hidden).toBe(true);
  });

  it('packets-vocab.html#step=2 opens directly on Step 2 after the word bank loads when >= 4 words are remembered', async () => {
    const dom = new JSDOM(read('packets-vocab.html'), {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://packets.test/packets-vocab.html#step=2',
    });
    const w = dom.window, d = w.document;
    opened.push(w);
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    w.URL.createObjectURL = () => 'blob:x';
    w.URL.revokeObjectURL = () => {};
    w.localStorage.setItem('alloflow-packets-vocab/1', JSON.stringify({
      v: 1,
      words: 'habitat\npredator\nprey\ncell',
      types: ['meaning', 'word'],
      mode: 'practice',
      title: 'Life science',
      readAloud: true,
      voices: true,
    }));
    w.fetch = (url) => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(read(String(url))) });
    const scripts = [...d.querySelectorAll('script[src]')].map((s) => s.getAttribute('src'));
    for (const src of scripts) {
      w.eval(src === 'packets_vocab_bank_en.js' ? read('tests/fixtures/packets_vocab_bank_fixture.js') : read(src));
    }
    await until(() => !d.getElementById('step-2').hidden, 'step 2 opened via #step=2');
    expect(d.getElementById('step-1').hidden).toBe(true);
    expect(d.getElementById('step-2').hidden).toBe(false);
    expect(d.querySelectorAll('#rows .v-row').length).toBe(4);
  });
});

describe('4. Find a Picture: AlloFlow AGPL-3.0 diagram credit, empty img alt, always-visible #from= back link & .top-menu', () => {
  it('stores AGPL-3.0 credit (not own:true), sets img.alt="", and shows #from-back immediately without saving first', async () => {
    const dom = new JSDOM(read('packets-pictures.html'), {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://packets.test/packets-pictures.html#from=present&word=volcano',
    });
    const w = dom.window, d = w.document;
    opened.push(w);
    w.TextEncoder = TextEncoder;
    Object.defineProperty(w, 'indexedDB', { value: fakeIndexedDB(), configurable: true });
    w.AlloWordPictureMatcher = {
      searchSymbolsWithDiagrams: () => [{ label: 'Volcano Diagram', word: 'volcano', svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>' }],
    };
    for (const f of ['packets-page.js', 'packets_my_words.js', 'packets-pictures.js']) w.eval(read(f));

    // Shared .top-menu present.
    expect(d.querySelector('header.top .top-row details.top-menu')).toBeTruthy();

    // Always-visible return link shown before any save!
    await until(() => !d.getElementById('from-back').hidden, 'from-back shown');
    expect(d.getElementById('saved').hidden).toBe(true);
    expect(d.getElementById('from-back-link').getAttribute('href')).toBe('packets-present-export.html');
    expect(d.getElementById('from-back-link').textContent).toBe('Back to Present & print word cards');

    await until(() => d.querySelectorAll('#pics-offline li').length === 1, 'diagram shown');
    expect(d.querySelector('#pics-offline img').getAttribute('alt')).toBe('');

    d.querySelector('#pics-offline button').click();
    await until(() => !d.getElementById('saved').hidden, 'diagram saved');
    const saved = await w.AlloPacketMyWords.get('volcano');
    expect(saved.picture.credit.own).toBeUndefined();
    expect(saved.picture.credit).toMatchObject({
      title: 'Volcano Diagram',
      author: 'AlloFlow',
      license: 'AGPL-3.0',
      source: 'AlloFlow Curriculum Diagrams',
    });
    expect(d.getElementById('saved-credit').textContent).toContain('AGPL-3.0');
    expect(d.getElementById('saved-credit').textContent).not.toContain("teacher's own");
  });
});

describe('5. My Words: clipSource, honest labels, voice shortcut, conditional search/filter > 6 words & Use in list', () => {
  it('exposes clipSource in rowOf(), distinguishes computer voice vs recording, shows voice link when unrecorded, and enables search/filter > 6 words + Use in list', async () => {
    const dom = new JSDOM(read('packets-make.html'), {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://packets.test/packets-make.html',
    });
    const w = dom.window, d = w.document;
    opened.push(w);
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    w.indexedDB = fakeIndexedDB();
    w.fetch = async () => ({ ok: false, status: 404, headers: { get: () => null }, text: async () => '' });
    w.HTMLElement.prototype.scrollIntoView = function () {};
    for (const s of d.querySelectorAll('script[src]')) w.eval(read(s.getAttribute('src')));
    await until(() => d.getElementById('loading').hidden, 'maker started');

    const store = w.AlloPacketMyWords;
    // Verify clipSource on rowOf()
    await store.put('zayden', { sounds: ['z', 'ay', 'd', 'e', 'n'], clip: { dataUri: WAV_URI, source: 'computer-voice', ms: 300 } });
    await store.put('din', { clip: { dataUri: WAV_URI, source: 'teacher', ms: 300 } });
    const rows = await store.list();
    expect(rows.find((r) => r.word === 'zayden').clipSource).toBe('computer-voice');
    expect(rows.find((r) => r.word === 'din').clipSource).toBe('teacher');

    // Step 2: <= 6 saved words keeps #my-words-tools hidden; honest labels shown in #my-words-list.
    d.getElementById('next-1').click();
    await until(() => d.querySelectorAll('#my-words-list li').length === 2, '2 my words');
    expect(d.getElementById('my-words-tools').hidden).toBe(true);
    const listText = [...d.querySelectorAll('#my-words-list li')].map((li) => li.querySelector('.mw-word').textContent + ':' + li.querySelector('.mw-what').textContent);
    expect(listText.find((t) => t.startsWith('zayden:'))).toContain('computer voice');
    expect(listText.find((t) => t.startsWith('din:'))).toContain('recording');

    // Edit this word panel distinguishes computer voice & shows voice shortcut when noRecording.
    const ownRadio = d.querySelector('input[name="mode"][value="own"]');
    ownRadio.checked = true;
    ownRadio.dispatchEvent(new w.Event('change', { bubbles: true }));
    d.getElementById('f-own').value = 'zayden zorblat';
    d.getElementById('f-own').dispatchEvent(new w.Event('input', { bubbles: true }));
    await until(() => d.querySelectorAll('#own-list > li').length === 2, 'own rows');

    const rowFor = (word) => [...d.querySelectorAll('#own-list > li')].find((li) => li.querySelector('.w').textContent === word);
    await until(() => /Ready\./.test(rowFor('zayden').querySelector('.s').textContent), 'zayden entry loaded from My words');
    rowFor('zayden').querySelector('.e button').click();
    await until(() => rowFor('zayden').querySelector('.wp') && rowFor('zayden').querySelector('.wp').textContent.includes('Computer voice, 0.3 seconds.'), 'zayden panel with computer voice');
    expect(rowFor('zayden').querySelector('[data-wp="remove-clip"]').textContent).toBe('Remove computer voice');
    expect(rowFor('zayden').querySelector('[data-wp="record"]').textContent).toBe('Record it yourself');

    rowFor('zorblat').querySelector('.e button').click();
    await until(() => rowFor('zorblat').querySelector('[data-wp="make-voice"]'), 'zorblat voice shortcut');
    const voiceShortcut = rowFor('zorblat').querySelector('[data-wp="make-voice"]');
    expect(voiceShortcut).toBeTruthy();
    expect(voiceShortcut.getAttribute('href')).toBe('packets-voice.html#words=zorblat');

    // Adding > 6 words reveals #my-words-tools search & filter; Use in list adds word to Step 2 list.
    for (const extra of ['alpha', 'bravo', 'charlie', 'delta', 'echo']) {
      await store.put(extra, { sounds: ['a'] });
    }
    await until(() => d.querySelectorAll('#my-words-list li').length === 7, '7 my words');
    expect(d.getElementById('my-words-tools').hidden).toBe(false);

    d.getElementById('my-words-filter').value = 'computer-voice';
    d.getElementById('my-words-filter').dispatchEvent(new w.Event('change', { bubbles: true }));
    expect([...d.querySelectorAll('#my-words-list .mw-word')].map((n) => n.textContent)).toEqual(['zayden']);

    d.getElementById('my-words-filter').value = 'all';
    d.getElementById('my-words-filter').dispatchEvent(new w.Event('change', { bubbles: true }));
    d.getElementById('my-words-find').value = 'brav';
    d.getElementById('my-words-find').dispatchEvent(new w.Event('input', { bubbles: true }));
    expect([...d.querySelectorAll('#my-words-list .mw-word')].map((n) => n.textContent)).toEqual(['bravo']);

    // Use in list appends 'bravo' into Step 2 own word list.
    d.querySelector('[data-mw-use="bravo"]').click();
    expect(d.getElementById('f-own').value).toContain('bravo');
    expect(d.getElementById('my-words-said').textContent).toBe('Added bravo to your word list.');
  });
});

describe('6. Print-sheet bug sweep & 7. packets.css 44px chip targets + 390px hero fold polish', () => {
  it('fixes print CSS defects across Cards, Read-Along, Check & Math Practice while honoring every pin', () => {
    const cardsCss = read('packets-print-cards.css');
    expect(cardsCss).toMatch(/\.pc-dot\s*\{[^}]*font-weight:\s*400;/);
    expect(cardsCss).toMatch(/\.pc-lines \.pc-grid\s*\{[^}]*padding:\s*0 0\.5mm 0\.5mm 0;/);
    expect(cardsCss).toMatch(/\.pc-sheet\.pc-list\s*\{[^}]*height:\s*auto;[^}]*overflow:\s*visible;/);
    expect(cardsCss).toMatch(/@media screen and \(max-width: 36rem\)\s*\{[^}]*\.pc-list-cols-3\s*\{\s*columns:\s*1;/);

    const raCss = read('packets-read-along-print.css');
    expect(raCss).not.toMatch(/\.paper-para\s*\{[^}]*break-inside:\s*avoid/);
    expect(raCss).toMatch(/\.paper-para\s*\{[^}]*orphans:\s*3;\s*widows:\s*3;/);
    expect(raCss).toMatch(/\.paper-head\s*\{[^}]*flex-wrap:\s*wrap;/);
    expect(raCss).toMatch(/\.paper-gloss h2\s*\{[^}]*break-after:\s*avoid;/);
    expect(raCss).not.toMatch(/#[0-9a-f]{3}/i);

    const checkCss = read('packets-check-print.css');
    expect(checkCss).not.toMatch(/\.paper-sheet\s*\{\s*break-after:\s*page;/);
    expect(checkCss).toContain('.paper-sheet + .paper-sheet { break-before: page;');
    expect(checkCss).toMatch(/\.pp\s*\{[^}]*height:\s*15\.5mm;/);
    expect(checkCss).toMatch(/\.paper-teacher h2,\s*\.paper-teacher h3,\s*\.paper-sub\s*\{[^}]*break-after:\s*avoid;/);

    const mathCss = read('packets-math-practice-print.css');
    expect(mathCss).not.toMatch(/\.paper-sheet\s*\{\s*break-after:\s*page;/);
    expect(mathCss).toContain('.paper-sheet + .paper-sheet { break-before: page;');
    expect(mathCss).toMatch(/\.paper-ccc \.pc-try\s*\{\s*width:\s*37%;/);
    expect(mathCss).toMatch(/\.paper-teacher h2,\s*\.paper-teacher h3,\s*\.paper-sub\s*\{[^}]*break-after:\s*avoid;/);
    expect(mathCss).not.toMatch(/#[0-9a-f]{3}/i);

    const packetsCss = read('packets.css');
    expect(packetsCss).toMatch(/\.chip button\s*\{[^}]*width:\s*2\.75rem;\s*height:\s*2\.75rem;/);
    expect(packetsCss).toMatch(/@media \(max-width: 29\.99rem\) \{\s*\.actions \.btn-primary \{ flex: 1 1 100%; \}[\s\S]*?\.hero \{ padding: 1\.25rem 0 1rem; \}/);
  });

  it('adds .noprint Print button, @page { margin: 12mm }, and portrait Bingo columns to all 7 standalone sheets in word_practice_media.js', () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only' });
    const w = dom.window;
    opened.push(w);
    w.eval(read('word_practice_core.js'));
    w.eval(read('word_practice_media.js'));
    const media = w.AlloWordPracticeMedia;
    const pack = {
      title: 'Solar System',
      words: [
        { word: 'orbit', definition: 'Path around a star', example: 'Planets orbit the sun.' },
        { word: 'comet', definition: 'Icy body in space', example: 'A bright comet passed by.' },
      ],
    };
    const builders = [
      'buildFlashcardsHtml',
      'buildFrayerHtml',
      'buildSortingCardsHtml',
      'buildWorksheetHtml',
      'buildBingoHtml',
      'buildLoopGameHtml',
      'buildWordWallHtml',
    ];
    for (const fn of builders) {
      const out = media[fn](pack);
      expect(out, fn).toContain('@page{margin:12mm}');
      expect(out, fn).toContain('.noprint{display:none}');
      expect(out, fn).toContain('class="noprint print-bar"');
      expect(out, fn).toContain('onclick="window.print()"');
      expect(out, fn).not.toMatch(/<script/i);
      expect(out.slice(15), fn).not.toContain('!');
    }
    const bingoOut = media.buildBingoHtml(pack);
    expect(bingoOut).toContain('minmax(280px,1fr)');
    expect(bingoOut).toContain('.bingo-boards{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}');
  });
});
