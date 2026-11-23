// @vitest-environment jsdom
// Wave 9 Track A regression suite: Read-Along multi-page continuity (Crawl, Focus/RSVP + Intl.Segmenter,
// Chunk cross-page, Normal Play auto-page-turn + deviceVoice fallback/onboundary), tab-persistent Student Mic,
// Jump/Bookmark + full-passage student print, Maker multi-page live preview, and takeHomeTools shared polish.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { webcrypto } from 'node:crypto';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (f) => readFileSync(f, 'utf8');

delete window.AlloWordSoundsTakeHome;
new Function(read('word_sounds_take_home_loader.js'))();
const loader = window.AlloWordSoundsTakeHome;
const RA = require('../packet_read_along_builder.js');
const VERIFY = require('../packets_verify_core.js');
const SYL_TABLE = require('../syllable_table_en.js');
const sureSyl = (word) => {
  const f = SYL_TABLE.lookup(word);
  return f && !f.check ? f.parts : null;
};

const clipFor = (text) => 'data:audio/mpeg;base64,' + Buffer.from('ID3' + text).toString('base64');
const clipsFor = (sentences) => Object.fromEntries(sentences.map((row) => [RA.clipKey(row.text), clipFor(row.text)]));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (test, what, max = 300) => {
  for (let i = 0; i < max; i++) {
    if (test()) return;
    await wait(10);
  }
  throw new Error('Timed out waiting for ' + what);
};

async function openMakerPage() {
  const dom = new JSDOM(read('packets-read-along.html'), {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://packets.test/site/packets-read-along.html',
  });
  const w = dom.window, d = w.document;
  if (!w.TextEncoder) w.TextEncoder = TextEncoder;
  if (!w.TextDecoder) w.TextDecoder = TextDecoder;
  const page = { w, d, dom, blobs: [] };
  w.URL.createObjectURL = (blob) => { page.blobs.push(blob); return 'blob:https://packets.test/' + page.blobs.length; };
  w.URL.revokeObjectURL = () => {};
  const realAppend = w.HTMLHeadElement.prototype.appendChild;
  d.head.appendChild = function (node) {
    if (node && node.tagName === 'SCRIPT') {
      const src = node.getAttribute('src');
      if (src === 'packets_audio_kit.js') w.eval(read('packets_audio_kit.js'));
      if (src === 'lame.min.js') w.eval(read('lame.min.js'));
      setTimeout(() => node.onload && node.onload(), 0);
      return node;
    }
    return realAppend.call(this, node);
  };
  if (!w.crypto || !w.crypto.subtle) Object.defineProperty(w, 'crypto', { value: webcrypto });
  w.eval(read('word_sounds_take_home_loader.js'));
  w.eval(read('packet_read_along_builder.js'));
  w.eval(read('syllable_table_en.js'));
  w.eval(read('packets_voice_engine.js'));
  w.eval(read('packets_verify_core.js'));
  w.eval(read('packets_reopen.js'));
  w.eval(read('packets_handoff.js'));
  w.eval(read('packets_zip.js'));
  w.eval(read('packets-read-along.js'));
  page.$ = (id) => d.getElementById(id);
  page.until = async (test, what) => { for (let i = 0; i < 400; i++) { if (test()) return; await wait(15); } throw new Error('Timed out: ' + what); };
  page.type = (id, val) => { page.$(id).value = val; page.$(id).dispatchEvent(new w.Event('input', { bubbles: true })); };
  return page;
}

describe('Wave 9 Track A: Multi-page Crawl, Focus/RSVP (Intl.Segmenter), Chunk, Normal Play, Mic, Jump/Bookmark/Print, Preview, and takeHomeTools', () => {
  const THREE_PAGE_TEXT = [
    '# Chapter One',
    'The fox ran over the hill. It saw a bright kite.',
    '---',
    '# Chapter Two',
    'Mia smiled at the sunset.',
    '---',
    '## The Journey Home',
    'Clouds drifted past the moon. Everyone slept soundly.',
  ].join('\n');

  it('supports multi-page Crawl (From here default, Whole/This scopes, dividers, headings, 3D tilt preserved, reduced-motion flat, session cache, quiet Go to Page N)', async () => {
    const split = RA.splitPassage(THREE_PAGE_TEXT);
    const made = RA.lessonFromReadAlong({
      loader,
      title: 'Three Chapters',
      text: THREE_PAGE_TEXT,
      clips: clipsFor(split),
      syllables: sureSyl,
      pageMode: 'custom',
    });
    expect(made.pages).toBe(3);
    expect(made.lesson.blocks[0].items).toHaveLength(3);
    const built = RA.buildReadAlongPacket({ made, loader });
    const v = VERIFY.verifyPacket(built.html);
    expect([v.ok, v.result, v.counts.notExpected, v.counts.look]).toEqual([true, 'closed', 0, 0]);

    const rafQueue = [];
    const dom = new JSDOM(built.html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://packet.test/crawl-multi.html',
      beforeParse(w) {
        w.requestAnimationFrame = (cb) => { rafQueue.push(cb); return rafQueue.length; };
        w.cancelAnimationFrame = () => {};
      },
    });
    const w = dom.window, d = w.document;
    try {
      d.getElementById('learner-name').value = 'Ana';
      d.querySelector('#app button.primary').click();
      await until(() => d.querySelector('[data-read-along-jump]'), 'page 1 ready');

      // Jump to Page 2 so "From here" includes Page 2 + Page 3 (not Page 1).
      const jump = d.querySelector('[data-read-along-jump]');
      jump.value = '1';
      jump.dispatchEvent(new w.Event('change', { bubbles: true }));
      await until(() => d.querySelector('[data-read-along-page]').textContent === 'Page 2 of 3', 'page 2');

      d.querySelector('[data-read-along-crawl]').click();
      const dlg = d.querySelector('[data-crawl-dialog]');
      expect(dlg).toBeTruthy();

      // Default scope on multi-page is "From here" (Page 2 -> Page 3).
      const scopeSel = dlg.querySelector('[data-crawl-scope]');
      expect(scopeSel && scopeSel.value).toBe('from');
      expect(dlg.querySelector('[data-crawl-text]').textContent).toContain('Chapter Two');
      expect(dlg.querySelector('[data-crawl-text]').textContent).toContain('The Journey Home');
      expect(dlg.querySelector('[data-crawl-text]').textContent).not.toContain('Chapter One');
      // Subtle Page 3 divider and preserved heading hierarchy.
      expect(dlg.querySelector('[data-crawl-page-sep="3"]').textContent).toBe('Page 3');
      expect(dlg.querySelector('[data-crawl-heading="1"]').textContent).toBe('Chapter Two');
      expect(dlg.querySelector('[data-crawl-heading="2"]').textContent).toBe('The Journey Home');
      expect(dlg.querySelector('[data-crawl-end]').hidden).toBe(true);

      // Frame 1+ preserves 3D rotateX(18deg) alongside translateY(...)!
      expect(rafQueue.length).toBeGreaterThan(0);
      rafQueue.shift()(100);
      rafQueue.shift()(180);
      const tf = dlg.querySelector('[data-crawl-text]').style.transform;
      expect(tf).toMatch(/translateY\(-?\d+px\)\s+rotateX\(18deg\)/);

      // Switch to Whole passage -> includes all 3 pages with Page 2 & Page 3 dividers.
      scopeSel.value = 'all';
      scopeSel.dispatchEvent(new w.Event('change', { bubbles: true }));
      expect(dlg.querySelector('[data-crawl-text]').textContent).toContain('Chapter One');
      expect(dlg.querySelector('[data-crawl-page-sep="2"]')).toBeTruthy();
      expect(dlg.querySelector('[data-crawl-page-sep="3"]')).toBeTruthy();

      // Switch to This page -> Page 2 only, no dividers.
      scopeSel.value = 'this';
      scopeSel.dispatchEvent(new w.Event('change', { bubbles: true }));
      expect(dlg.querySelectorAll('[data-crawl-page-sep]')).toHaveLength(0);
      expect(dlg.querySelector('[data-crawl-text]').textContent).not.toContain('Journey Home');

      // Back to "From here", adjust speed/palette (persisted in RAM sessionCache), scroll into Page 3, then close!
      scopeSel.value = 'from';
      scopeSel.dispatchEvent(new w.Event('change', { bubbles: true }));
      const speedIn = dlg.querySelector('[data-crawl-speed]');
      speedIn.value = '120';
      speedIn.dispatchEvent(new w.Event('input', { bubbles: true }));
      const palSel = dlg.querySelector('[data-crawl-theme]');
      palSel.value = 'aqua';
      palSel.dispatchEvent(new w.Event('change', { bubbles: true }));

      // Advance frames until past final included page -> THE END reveals only at the end!
      let ts = 1000;
      for (let k = 0; k < 100 && dlg.querySelector('[data-crawl-end]').hidden; k++) {
        ts += 90;
        const cb = rafQueue.shift();
        if (cb) cb(ts);
      }
      expect(dlg.querySelector('[data-crawl-end]').hidden).toBe(false);
      expect(dlg.querySelector('[data-crawl-page]').textContent).toBe('Page 3 of 3');

      // Closing returns to opener Page 2 WITHOUT marking Page 2 or Page 3 done, and offers quiet "Go to Page 3".
      dlg.querySelector('[data-crawl-close]').click();
      expect(d.querySelector('[data-read-along-page]').textContent).toBe('Page 2 of 3');
      const jumpNote = d.querySelector('[data-read-along-overlay-jump]');
      expect(jumpNote && jumpNote.hidden).toBe(false);
      expect(jumpNote.querySelector('[data-overlay-jump-go]').textContent).toBe('Go to Page 3');

      // Verify skipped pages were NOT falsely marked read in localStorage.
      const saved = JSON.parse(w.localStorage.getItem(Object.keys(w.localStorage)[0]));
      expect(saved.items.filter((r) => r.done)).toHaveLength(0);

      // Clicking "Go to Page 3" jumps to Page 3, and Crawl remembers speed=120 & palette=aqua from sessionCache!
      jumpNote.querySelector('[data-overlay-jump-go]').click();
      await until(() => d.querySelector('[data-read-along-page]').textContent === 'Page 3 of 3', 'jumped to page 3');
      d.querySelector('[data-read-along-crawl]').click();
      const dlg2 = d.querySelector('[data-crawl-dialog]');
      expect(dlg2.querySelector('[data-crawl-speed]').value).toBe('120');
      expect(dlg2.querySelector('[data-crawl-theme]').value).toBe('aqua');
      dlg2.querySelector('[data-crawl-close]').click();

      // Enable Reading Tools -> Motion: Less (data-lt-motion="1") -> Crawl opens flat with transform: none and paused!
      d.querySelector('[data-tools-open]').click();
      d.querySelector('[data-tool="motion-1"]').click();
      expect(d.documentElement.getAttribute('data-lt-motion')).toBe('1');
      d.querySelector('[data-read-along-crawl]').click();
      const dlgFlat = d.querySelector('[data-crawl-dialog]');
      expect(dlgFlat.querySelector('[data-crawl-view]').classList.contains('is-flat')).toBe(true);
      expect(dlgFlat.querySelector('[data-crawl-text]').style.transform).toBe('none');
      expect(dlgFlat.querySelector('[data-crawl-play]').textContent).toBe('Play');
      dlgFlat.querySelector('[data-crawl-close]').click();
    } finally { w.close(); }

    // 1-page packet hides the scope <select> in both Crawl and Focus mode, and OS prefers-reduced-motion keeps Crawl flat.
    const oneBuilt = RA.buildReadAlongPacket({
      made: RA.lessonFromReadAlong({ loader, title: 'One Page', text: 'A single page story.', clips: {} }),
      loader,
    });
    const dom1 = new JSDOM(oneBuilt.html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://packet.test/one.html',
      beforeParse(w) {
        w.matchMedia = (q) => ({ matches: /prefers-reduced-motion/.test(q), media: q, addEventListener() {}, removeEventListener() {} });
      },
    });
    try {
      const d1 = dom1.window.document;
      d1.getElementById('learner-name').value = 'Ana';
      d1.querySelector('#app button.primary').click();
      await until(() => d1.querySelector('[data-read-along-crawl]'), '1-page ready');
      d1.querySelector('[data-read-along-crawl]').click();
      expect(d1.querySelector('[data-crawl-scope]')).toBeNull();
      expect(d1.querySelector('[data-crawl-view]').classList.contains('is-flat')).toBe(true);
      expect(d1.querySelector('[data-crawl-text]').style.transform).toBe('none');
      d1.querySelector('[data-crawl-close]').click();
      d1.querySelector('[data-read-along-rsvp]').click();
      expect(d1.querySelector('[data-rsvp-scope]')).toBeNull();
      d1.querySelector('[data-rsvp-close]').click();
    } finally { dom1.window.close(); }
  }, 60000);

  it('supports multi-page Focus/RSVP (scope, Page N of M header, session persistence, quiet Go to Page N) and Intl.Segmenter for CJK/Thai/NFD graphemes', async () => {
    const split = RA.splitPassage(THREE_PAGE_TEXT);
    const built = RA.buildReadAlongPacket({
      made: RA.lessonFromReadAlong({ loader, title: 'RSVP Multi', text: THREE_PAGE_TEXT, clips: clipsFor(split), pageMode: 'custom' }),
      loader,
    });
    const dom = new JSDOM(built.html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/rsvp-multi.html' });
    const w = dom.window, d = w.document;
    try {
      d.getElementById('learner-name').value = 'Sam';
      d.querySelector('#app button.primary').click();
      await until(() => d.querySelector('[data-read-along-jump]'), 'page 1');
      const jump = d.querySelector('[data-read-along-jump]');
      jump.value = '1';
      jump.dispatchEvent(new w.Event('change', { bubbles: true }));
      await until(() => d.querySelector('[data-read-along-page]').textContent === 'Page 2 of 3', 'page 2');

      d.querySelector('[data-read-along-rsvp]').click();
      const dlg = d.querySelector('[data-rsvp-dialog]');
      expect(dlg.querySelector('[data-rsvp-scope]').value).toBe('from');
      expect(dlg.querySelector('[data-rsvp-page]').textContent).toBe('Page 2 of 3');
      expect(dlg.querySelector('[data-rsvp-progress]')).toBeTruthy();

      // Persist WPM, chunkSize, theme, color, punctPauses in RAM sessionCache.
      const wpmIn = dlg.querySelector('[data-rsvp-wpm]');
      wpmIn.value = '400';
      wpmIn.dispatchEvent(new w.Event('input', { bubbles: true }));
      const themeSel = dlg.querySelector('[data-rsvp-theme]');
      themeSel.value = 'dark';
      themeSel.dispatchEvent(new w.Event('change', { bubbles: true }));
      dlg.querySelector('[data-rsvp-color="#16a34a"]').click();
      dlg.querySelector('[data-rsvp-punct]').click(); // toggle OFF
      const szIn = dlg.querySelector('[data-rsvp-chunk-size]');
      szIn.value = '3';
      szIn.dispatchEvent(new w.Event('input', { bubbles: true }));

      // Step forward into Page 3!
      for (let k = 0; k < 4; k++) dlg.querySelector('[data-rsvp-next]').click();
      expect(dlg.querySelector('[data-rsvp-page]').textContent).toBe('Page 3 of 3');
      dlg.querySelector('[data-rsvp-close]').click();

      // Returns to Page 2 with quiet Go to Page 3 banner.
      expect(d.querySelector('[data-read-along-page]').textContent).toBe('Page 2 of 3');
      const goBtn = d.querySelector('[data-overlay-jump-go]');
      expect(goBtn && goBtn.textContent).toBe('Go to Page 3');
      goBtn.click();
      await until(() => d.querySelector('[data-read-along-page]').textContent === 'Page 3 of 3', 'page 3');

      // Reopen RSVP on Page 3 -> all 5 settings persisted in sessionCache!
      d.querySelector('[data-read-along-rsvp]').click();
      const dlg2 = d.querySelector('[data-rsvp-dialog]');
      expect(dlg2.querySelector('[data-rsvp-wpm]').value).toBe('400');
      expect(dlg2.querySelector('[data-rsvp-chunk-size]').value).toBe('3');
      expect(dlg2.querySelector('[data-rsvp-theme]').value).toBe('dark');
      expect(dlg2.querySelector('[data-rsvp-punct]').getAttribute('aria-pressed')).toBe('false');
      expect(dlg2.querySelector('[data-rsvp-color="#16a34a"]').getAttribute('aria-pressed')).toBe('true');
      dlg2.querySelector('[data-rsvp-close]').click();
    } finally { w.close(); }

    // Intl.Segmenter: unspaced Japanese + NFD accented grapheme clusters never split combining marks!
    const jaBuilt = RA.buildReadAlongPacket({
      made: RA.lessonFromReadAlong({ loader, title: 'JA', text: '猫が庭で走った。', clips: {}, lang: 'ja' }),
      loader,
    });
    const domJa = new JSDOM(jaBuilt.html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/ja.html' });
    try {
      const dj = domJa.window.document;
      dj.getElementById('learner-name').value = 'Yuki';
      dj.querySelector('#app button.primary').click();
      await until(() => dj.querySelector('[data-read-along-rsvp]'), 'ja ready');
      dj.querySelector('[data-read-along-rsvp]').click();
      const total = Number(dj.querySelector('[data-rsvp-count]').textContent.split('/')[1].trim());
      expect(total).toBeGreaterThan(2);
      dj.querySelector('[data-rsvp-close]').click();
    } finally { domJa.window.close(); }

    const nfdBuilt = RA.buildReadAlongPacket({
      made: RA.lessonFromReadAlong({ loader, title: 'NFD', text: 're\u0301', clips: {}, lang: 'fr' }),
      loader,
    });
    const domNfd = new JSDOM(nfdBuilt.html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/nfd.html' });
    try {
      const dn = domNfd.window.document;
      dn.getElementById('learner-name').value = 'Luc';
      dn.querySelector('#app button.primary').click();
      await until(() => dn.querySelector('[data-read-along-rsvp]'), 'nfd ready');
      dn.querySelector('[data-read-along-rsvp]').click();
      expect(dn.querySelector('.ra-rsvp-orp').textContent).toBe('e\u0301');
      dn.querySelector('[data-rsvp-close]').click();
    } finally { domNfd.window.close(); }
  }, 60000);

  it('steps One-Sentence ("Chunk") mode seamlessly across page boundaries including 1-sentence pages and Auto-pace', async () => {
    const text = 'First sentence. Second sentence.\n---\nLone sentence on page two.\n---\nThird page line.';
    const built = RA.buildReadAlongPacket({
      made: RA.lessonFromReadAlong({ loader, title: 'Chunk Multi', text, clips: {}, pageMode: 'custom' }),
      loader,
    });
    const dom = new JSDOM(built.html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/chunk-multi.html' });
    const w = dom.window, d = w.document;
    try {
      d.getElementById('learner-name').value = 'Ana';
      d.querySelector('#app button.primary').click();
      await until(() => d.querySelector('button[data-read-along-chunk]'), 'page 1');
      d.querySelector('button[data-read-along-chunk]').click();
      expect(d.querySelector('[data-read-along-sentence]').textContent).toBe('Sentence 1 of 2');

      // Step to sentence 2 of Page 1, then Next sentence crosses to Page 2 sentence 1!
      d.querySelector('[data-read-along-sent-next]').click();
      expect(d.querySelector('[data-read-along-sentence]').textContent).toBe('Sentence 2 of 2');
      d.querySelector('[data-read-along-sent-next]').click();
      await until(() => d.querySelector('[data-read-along-page]').textContent === 'Page 2 of 3', 'crossed to page 2');
      // 1-sentence page MUST NOT hide Chunk mode on multi-page packets!
      expect(d.querySelector('button[data-read-along-chunk]').getAttribute('aria-pressed')).toBe('true');
      expect(d.querySelector('[data-read-along-chunk-nav]').hidden).toBe(false);
      expect(d.querySelector('[data-read-along-sentence]').textContent).toBe('Sentence 1 of 1');

      // ArrowLeft on sentence 1 of Page 2 crosses back to Page 1's LAST sentence (Sentence 2 of 2)!
      d.querySelector('#app h2').focus();
      d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
      await until(() => d.querySelector('[data-read-along-page]').textContent === 'Page 1 of 3', 'crossed back to page 1');
      expect(d.querySelector('[data-read-along-sentence]').textContent).toBe('Sentence 2 of 2');

      // Set pace to 1000ms and turn on Auto pace -> crosses automatically into Page 2 and keeps Auto pace active!
      const paceIn = d.querySelector('[data-chunk-pace]');
      paceIn.value = '1000';
      paceIn.dispatchEvent(new w.Event('input', { bubbles: true }));
      d.querySelector('[data-chunk-auto-timer]').click();
      await until(() => d.querySelector('[data-read-along-page]').textContent === 'Page 2 of 3', 'auto pace crossed to page 2', 250);
      expect(d.querySelector('[data-chunk-pace-out]').textContent).toBe('1.0s');
      expect(d.querySelector('[data-chunk-auto-timer]').getAttribute('aria-pressed')).toBe('true');
    } finally { w.close(); }
  }, 60000);

  it('auto-turns pages in Normal Play reusing one Audio element, falls back to deviceVoice on unrecorded lines, and highlights words via onboundary & timer fallback', async () => {
    const text = 'The fox ran fast. It hid quietly.\n---\nThen it trotted home.';
    const split = RA.splitPassage(text);
    // Partial recordings: record line 1 and line 3, leave line 2 unrecorded!
    const partialClips = {
      [RA.clipKey(split[0].text)]: clipFor(split[0].text),
      [RA.clipKey(split[2].text)]: clipFor(split[2].text),
    };
    const made = RA.lessonFromReadAlong({
      loader,
      title: 'Mixed Voice',
      text,
      clips: partialClips,
      pageMode: 'custom',
      deviceVoice: true,
    });
    const built = RA.buildReadAlongPacket({ made, loader });
    expect(VERIFY.verifyPacket(built.html).counts.notExpected).toBe(0);

    let audioCtors = 0;
    const events = [];
    const dom = new JSDOM(built.html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://packet.test/mixed-voice.html',
      beforeParse(w) {
        w.Audio = class {
          constructor() { audioCtors++; this.playbackRate = 1; this.currentTime = 0; this.duration = 1; }
          set src(v) { this._src = v; }
          get src() { return this._src; }
          play() {
            const label = Buffer.from(String(this._src).split(',')[1], 'base64').toString().slice(3);
            events.push({ kind: 'audio', text: label });
            setTimeout(() => { if (this.onended) this.onended(); }, 10);
            return Promise.resolve();
          }
          pause() {}
        };
        w.SpeechSynthesisUtterance = class {
          constructor(t) { this.text = t; this.lang = ''; this.rate = 1; this.voice = null; }
        };
        w.speechSynthesis = {
          getVoices: () => [{ name: 'Local English', lang: 'en-US', localService: true }],
          cancel: () => {},
          speak: (u) => {
            events.push({ kind: 'tts', text: u.text });
            // Emit native onboundary for word 2 ("hid" at charIndex 3) then end!
            setTimeout(() => {
              if (u.onboundary) u.onboundary({ name: 'word', charIndex: 3 });
              const active = w.document.querySelector('[data-word-active="true"]');
              if (active) events.push({ kind: 'word', text: active.textContent });
              setTimeout(() => { if (u.onend) u.onend(); }, 10);
            }, 10);
          },
        };
      },
    });
    const d = dom.window.document;
    try {
      d.getElementById('learner-name').value = 'Ana';
      d.querySelector('#app button.primary').click();
      await until(() => d.querySelector('[data-read-along-play]'), 'page 1 ready');

      // Line 2 has no audio clip, but deviceVoice is enabled so it MUST NOT be disabled!
      expect(d.querySelector('[data-read-along-line="2"]').getAttribute('aria-disabled')).toBeNull();

      // Press Read to me -> plays line 1 (Audio), line 2 (local TTS + onboundary word highlight),
      // auto-turns after ~700ms beat, plays line 3 on Page 2 (reusing the SAME unlocked Audio element)!
      d.querySelector('[data-read-along-play]').click();
      await until(() => d.querySelector('[data-read-along-page]').textContent === 'Page 2 of 2' && d.querySelector('[data-read-along-play]').textContent === 'Read to me' && events.some((e) => e.text === 'Then it trotted home.'), 'auto-turned and finished page 2');

      expect(audioCtors).toBe(1);
      expect(events.map((e) => e.kind + ':' + e.text)).toEqual([
        'audio:The fox ran fast.',
        'tts:It hid quietly.',
        'word:hid',
        'audio:Then it trotted home.',
      ]);
      // Page 1 marked read during auto-turn (1 of 2 items done).
      const saved = JSON.parse(dom.window.localStorage.getItem(Object.keys(dom.window.localStorage)[0]));
      expect(saved.items.filter((r) => r.done)).toHaveLength(1);
    } finally { dom.window.close(); }

    // Timer fallback when OS speechSynthesis never emits onboundary: still highlights words cleanly!
    const devOnlyBuilt = RA.buildReadAlongPacket({
      made: RA.lessonFromReadAlong({ loader, title: 'Dev Fallback', text: 'Bright sun.', clips: {}, deviceVoice: true }),
      loader,
    });
    const domFb = new JSDOM(devOnlyBuilt.html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://packet.test/dev-fb.html',
      beforeParse(w) {
        w.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
        w.speechSynthesis = {
          getVoices: () => [{ name: 'Local English', lang: 'en-US', localService: true }],
          cancel: () => {},
          speak: (u) => { setTimeout(() => { if (u.onend) u.onend(); }, 500); },
        };
      },
    });
    try {
      const df = domFb.window.document;
      df.getElementById('learner-name').value = 'Ana';
      df.querySelector('#app button.primary').click();
      await until(() => df.querySelector('[data-read-along-device-read]'), 'dev read button');
      df.querySelector('[data-read-along-device-read]').click();
      expect(df.querySelector('[data-word-active="true"]').textContent).toBe('Bright');
      await until(() => df.querySelector('[data-word-active="true"]')?.textContent === 'sun', 'timer fallback advanced to second word', 100);
    } finally { domFb.window.close(); }
  }, 60000);

  it('persists Student Mic takes across page turns in RAM sessionCache, tags page filenames, supports Whole page mode, guards active recording, and cleans unload listeners', async () => {
    const text = 'Page one sentence one. Page one sentence two.\n---\nPage two sentence one. Page two sentence two.';
    const split = RA.splitPassage(text);
    const built = RA.buildReadAlongPacket({
      made: RA.lessonFromReadAlong({ loader, title: 'Mic Multi', text, clips: clipsFor(split), pageMode: 'custom', studentMic: true }),
      loader,
    });
    expect(VERIFY.verifyPacket(built.html).counts.notExpected).toBe(0);

    let activeRec = null, blobN = 0, teacherPlays = 0, pagehideAdds = 0, pagehideRemoves = 0;
    const downloads = [];
    const dom = new JSDOM(built.html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://packet.test/mic-multi.html',
      beforeParse(w) {
        const origAdd = w.addEventListener.bind(w);
        const origRem = w.removeEventListener.bind(w);
        w.addEventListener = (type, fn, opts) => { if (type === 'pagehide') pagehideAdds++; return origAdd(type, fn, opts); };
        w.removeEventListener = (type, fn, opts) => { if (type === 'pagehide') pagehideRemoves++; return origRem(type, fn, opts); };
        w.navigator.mediaDevices = { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) };
        w.MediaRecorder = class {
          constructor() { this.state = 'inactive'; this.mimeType = 'audio/webm'; activeRec = this; }
          start() { this.state = 'recording'; }
          stop() {
            this.state = 'inactive';
            if (this.ondataavailable) this.ondataavailable({ data: new w.Blob([new Uint8Array([1, 2])], { type: 'audio/webm' }) });
            if (this.onstop) this.onstop();
          }
        };
        w.URL.createObjectURL = () => 'blob:https://packet.test/clip-' + (++blobN);
        w.URL.revokeObjectURL = () => {};
        w.Audio = class {
          constructor(src) { this.src = src || ''; }
          play() { if (!String(this.src).startsWith('blob:')) teacherPlays++; return Promise.resolve(); }
          pause() {}
        };
        w.HTMLAnchorElement.prototype.click = function () { if (this.download) downloads.push(this.download); };
      },
    });
    const w = dom.window, d = w.document;
    try {
      d.getElementById('learner-name').value = 'Sam';
      d.querySelector('#app button.primary').click();
      await until(() => d.querySelector('[data-student-rec]'), 'mic ready');

      // Record Page 1 Sentence 1, and while recording try tapping sentence 2 & Next page -> blocked cleanly!
      d.querySelector('[data-student-rec]').click();
      await until(() => activeRec && activeRec.state === 'recording', 'rec started');
      d.querySelector('[data-read-along-line="2"]').click();
      d.querySelector('[data-read-along-done]').click();
      expect(teacherPlays).toBe(0);
      expect(d.querySelector('[data-read-along-page]').textContent).toBe('Page 1 of 2');
      expect(d.querySelector('[data-student-rec-status]').textContent).toContain('Stop recording');

      // Finish Page 1 Sentence 1 take.
      d.querySelector('[data-student-rec]').click();
      await until(() => !d.querySelector('[data-student-rec-play]').hidden, 'p1s1 saved');

      // Turn to Page 2, record Sentence 1 -> save -> filename includes page-2-sentence-1!
      d.querySelector('[data-read-along-done]').click();
      await until(() => d.querySelector('[data-read-along-page]').textContent === 'Page 2 of 2', 'page 2');
      expect(d.querySelector('[data-student-rec-play]').hidden).toBe(true);
      d.querySelector('[data-student-rec]').click();
      await until(() => activeRec && activeRec.state === 'recording', 'p2s1 rec');
      d.querySelector('[data-student-rec]').click();
      await until(() => !d.querySelector('[data-student-rec-save]').hidden, 'p2s1 ready');
      d.querySelector('[data-student-rec-save]').click();
      expect(downloads).toContain('my-reading-page-2-sentence-1.webm');

      // Switch to Whole page mode inside .ra-mic-bar -> record & save -> my-reading-page-2-whole-page.webm!
      const modeSel = d.querySelector('[data-student-rec-mode]');
      expect(modeSel).toBeTruthy();
      modeSel.value = 'page';
      modeSel.dispatchEvent(new w.Event('change', { bubbles: true }));
      expect(d.querySelector('[data-student-rec-play]').hidden).toBe(true);
      d.querySelector('[data-student-rec]').click();
      await until(() => activeRec && activeRec.state === 'recording', 'p2 whole rec');
      d.querySelector('[data-student-rec]').click();
      await until(() => !d.querySelector('[data-student-rec-save]').hidden, 'p2 whole ready');
      d.querySelector('[data-student-rec-save]').click();
      expect(downloads).toContain('my-reading-page-2-whole-page.webm');

      // Turn back to Page 1 -> Page 1 Sentence 1 take is STILL preserved in RAM sessionCache!
      d.querySelector('[data-read-along-prev]').click();
      await until(() => d.querySelector('[data-read-along-page]').textContent === 'Page 1 of 2', 'back to page 1');
      // Switch back to sentence mode to see the sentence 1 take preserved across page turns!
      const modeSelBack = d.querySelector('[data-student-rec-mode]');
      modeSelBack.value = 'sentence';
      modeSelBack.dispatchEvent(new w.Event('change', { bubbles: true }));
      expect(d.querySelector('[data-student-rec-play]').hidden).toBe(false);

      // Zero audio stored in localStorage!
      const stored = Object.keys(w.localStorage).map((k) => w.localStorage.getItem(k)).join(' ');
      expect(stored).not.toContain('blob:');
      expect(stored).not.toContain('clip-');

      // Unmount cleans up per-page pagehide listeners (only tab-level cache revoker + current page remain).
      expect(pagehideRemoves).toBeGreaterThanOrEqual(2);
      expect(pagehideAdds - pagehideRemoves).toBeLessThanOrEqual(2);
    } finally { w.close(); }
  }, 60000);

  it('supports Page/Section Jump, single-state Bookmark, Full-Passage Student Print, and Start/Resume "(Page 2 of 3)" copy', async () => {
    const split = RA.splitPassage(THREE_PAGE_TEXT);
    const built = RA.buildReadAlongPacket({
      made: RA.lessonFromReadAlong({ loader, title: 'Jump Book Print', text: THREE_PAGE_TEXT, clips: clipsFor(split), syllables: sureSyl, pageMode: 'custom' }),
      loader,
    });
    const savedStorage = {};
    const dom1 = new JSDOM(built.html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/jbp.html' });
    try {
      const w = dom1.window, d = w.document;
      d.getElementById('learner-name').value = 'Ana';
      d.querySelector('#app button.primary').click();
      await until(() => d.querySelector('[data-read-along-jump]'), 'page 1');

      // Exact [data-read-along-page] preserved alongside Jump & Bookmark controls.
      expect(d.querySelector('[data-read-along-page]').textContent).toBe('Page 1 of 3');
      const opts = [...d.querySelectorAll('[data-read-along-jump] option')].map((o) => o.textContent);
      expect(opts[0]).toContain('Page 1');
      expect(opts[0]).toContain('Chapter One');
      expect(opts[2]).toContain('The Journey Home');

      // Full-passage print container holds all 3 pages and updates on beforeprint when Syllables toggles!
      const printAll = d.querySelector('[data-read-along-print-all]');
      expect(printAll.querySelectorAll('.ra-print-page')).toHaveLength(3);
      expect(printAll.textContent).toContain('Chapter One');
      expect(printAll.textContent).toContain('The Journey Home');
      d.querySelector('[data-read-along-syllables]').click();
      w.dispatchEvent(new w.Event('beforeprint'));
      expect(printAll.textContent).toContain('o\u00b7ver');

      // Jump to Page 3 and bookmark it; jump to Page 2 and click "Go to bookmark (Page 3)".
      const jump = d.querySelector('[data-read-along-jump]');
      jump.value = '2';
      jump.dispatchEvent(new w.Event('change', { bubbles: true }));
      await until(() => d.querySelector('[data-read-along-page]').textContent === 'Page 3 of 3', 'page 3');
      d.querySelector('[data-read-along-bookmark]').click();
      expect(d.querySelector('[data-read-along-bookmark]').getAttribute('aria-pressed')).toBe('true');

      const jump3 = d.querySelector('[data-read-along-jump]');
      jump3.value = '1';
      jump3.dispatchEvent(new w.Event('change', { bubbles: true }));
      await until(() => d.querySelector('[data-read-along-page]').textContent === 'Page 2 of 3', 'page 2');
      const bmGo = d.querySelector('[data-read-along-bookmark-go]');
      expect(bmGo.hidden).toBe(false);
      expect(bmGo.textContent).toBe('Go to bookmark (Page 3)');
      bmGo.click();
      await until(() => d.querySelector('[data-read-along-page]').textContent === 'Page 3 of 3', 'back to bookmark page 3');

      // Go to Page 1, mark Page 1 done so resume sits on Page 2 of 3, and snapshot localStorage!
      d.querySelector('[data-read-along-jump]').value = '0';
      d.querySelector('[data-read-along-jump]').dispatchEvent(new w.Event('change', { bubbles: true }));
      await until(() => d.querySelector('[data-read-along-page]').textContent === 'Page 1 of 3', 'page 1');
      d.querySelector('[data-read-along-done]').click();
      await until(() => d.querySelector('[data-read-along-page]').textContent === 'Page 2 of 3', 'page 2 saved');

      expect(Object.keys(w.localStorage)).toHaveLength(1);
      for (const k of Object.keys(w.localStorage)) savedStorage[k] = w.localStorage.getItem(k);
    } finally { dom1.window.close(); }

    // Reopen saved file -> Start/Resume screen says "(Page 2 of 3)" (NOT "Question 2 of 3")!
    const dom2 = new JSDOM(built.html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://packet.test/jbp.html',
      beforeParse(w) { for (const [k, v] of Object.entries(savedStorage)) w.localStorage.setItem(k, v); },
    });
    try {
      const d2 = dom2.window.document;
      await until(() => d2.querySelector('#app button.primary'), 'resume screen');
      const resumeText = d2.querySelector('#app').textContent;
      expect(resumeText).toContain('(Page 2 of 3)');
      expect(resumeText).not.toContain('Question 2 of 3');
    } finally { dom2.window.close(); }
  }, 60000);

  it('lets teachers inspect and Hide pictures on Page 2 inside Maker Step 4 #live-preview', async () => {
    const page = await openMakerPage();
    try {
      const svgFox = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="5"/></svg>';
      const svgMoon = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="8" height="8"/></svg>';
      page.w.AlloVocabBank = {
        ready: () => true,
        head: (x) => x,
        senses: (x) => ({
          fox: [{ word: 'fox', pos: 'noun', def: 'A small wild animal.', example: 'The fox ran.' }],
          moon: [{ word: 'moon', pos: 'noun', def: 'Earth natural satellite.', example: 'The moon glowed.' }],
        }[x] || []),
      };
      page.w.createWordSoundsSymbols = () => ({
        shards: [],
        ready: () => true,
        has: (x) => x === 'fox' || x === 'moon',
        get: (x) => x === 'fox' ? { svg: svgFox, label: 'fox', set: 'mulberry' } : (x === 'moon' ? { svg: svgMoon, label: 'moon', set: 'mulberry' } : null),
      });

      page.$('f-page-mode').value = 'custom';
      page.$('f-page-mode').dispatchEvent(new page.w.Event('change', { bubbles: true }));
      page.type('f-text', 'The fox ran fast.\n---\nThe moon glowed bright.');
      page.$('f-dict').checked = true;
      page.$('f-dict').dispatchEvent(new page.w.Event('change', { bubbles: true }));
      page.$('f-dict-pics').checked = true;
      page.$('f-dict-pics').dispatchEvent(new page.w.Event('change', { bubbles: true }));

      await page.until(() => !page.$('live-preview').hidden && !page.$('preview-page-wrap').hidden, 'multi-page preview selector shown');
      const sel = page.$('preview-page');
      expect([...sel.options].map((o) => o.textContent)).toEqual(['Page 1', 'Page 2']);
      expect(page.$('preview-card').textContent).toContain('The fox ran fast.');

      // Switch preview to Page 2 -> shows Page 2 text and "moon" picture chip!
      sel.value = '1';
      sel.dispatchEvent(new page.w.Event('change', { bubbles: true }));
      await page.until(() => page.$('preview-card').textContent.includes('The moon glowed bright.'), 'page 2 preview rendered');
      const hideBtn = [...page.$('preview-card').querySelectorAll('button')].find((b) => b.textContent === 'Hide');
      expect(hideBtn).toBeTruthy();

      // Clicking Hide removes "moon" from packet pictures AND keeps preview on Page 2!
      hideBtn.click();
      await page.until(() => !page.$('preview-card').querySelector('.ra-preview-pic-img'), 'moon picture hidden');
      expect(page.$('preview-page').value).toBe('1');
      expect(page.$('preview-card').textContent).toContain('The moon glowed bright.');
    } finally { page.dom.window.close(); }
  }, 60000);

  it('updates dark/light custom surface tokens in takeHomeTools, persists Reduced Motion, and forwards speedRate/toolPref to takeHomeCheck', async () => {
    const built = RA.buildReadAlongPacket({
      made: RA.lessonFromReadAlong({ loader, title: 'Tools Polish', text: 'A short reading line.', clips: {} }),
      loader,
    });
    const dom = new JSDOM(built.html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/tools.html' });
    const w = dom.window, d = w.document, html = d.documentElement;
    try {
      d.querySelector('[data-tools-open]').click();

      // Dark custom background automatically sets dark surface tokens & color-scheme: dark (not stale white!).
      const bgPick = d.querySelector('[data-tool-custom-bg]');
      const inkPick = d.querySelector('[data-tool-custom-ink]');
      bgPick.value = '#121622';
      bgPick.dispatchEvent(new w.Event('input', { bubbles: true }));
      inkPick.value = '#f5f7ff';
      inkPick.dispatchEvent(new w.Event('input', { bubbles: true }));
      expect(html.style.getPropertyValue('--bg')).toBe('#121622');
      expect(html.style.getPropertyValue('--card')).not.toBe('');
      expect(html.style.getPropertyValue('--card')).not.toBe('#ffffff');
      expect(html.style.getPropertyValue('--soft')).not.toBe('');
      expect(html.style.getPropertyValue('--muted')).not.toBe('');
      expect(html.style.getPropertyValue('--line')).not.toBe('');
      expect(html.style.colorScheme).toBe('dark');

      // Light custom background switches to light surface tokens & color-scheme: light.
      bgPick.value = '#eef7ff';
      bgPick.dispatchEvent(new w.Event('input', { bubbles: true }));
      expect(html.style.colorScheme).toBe('light');

      // Selecting a preset clears all custom CSS tokens cleanly.
      d.querySelector('[data-tool="colors-0"]').click();
      expect(html.style.getPropertyValue('--bg')).toBe('');
      expect(html.style.getPropertyValue('--card')).toBe('');
      expect(html.style.getPropertyValue('--soft')).toBe('');
      expect(html.style.getPropertyValue('--muted')).toBe('');
      expect(html.style.getPropertyValue('--line')).toBe('');
      expect(html.style.colorScheme).toBe('');

      // Motion toggle sets data-lt-motion="1" and persists in single localStorage state.tools.
      d.querySelector('[data-tool="motion-1"]').click();
      expect(html.getAttribute('data-lt-motion')).toBe('1');
      const saved = JSON.parse(w.localStorage.getItem(Object.keys(w.localStorage)[0]));
      expect(saved.tools.motion).toBe(1);
    } finally { w.close(); }

    // Verify takeHomeShell forwards speedRate & toolPref to takeHomeCheck.
    const src = read('word_sounds_take_home_loader.js');
    expect(src).toMatch(/kit\.check\(\{[\s\S]{0,900}speedRate:\s*function\s*\(\)\s*\{\s*return\s+tools\s*&&\s*tools\.speedRate/);
    expect(src).toMatch(/kit\.check\(\{[\s\S]{0,1100}toolPref:\s*function\s*\(k,\s*v\)/);
  }, 60000);
});
