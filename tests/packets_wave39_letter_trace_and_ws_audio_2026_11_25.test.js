// Wave 39 (2026-11-25):
// 1. Upgraded Letter Tracing feedback: stroke directionality coaching, multi-stroke dot cues,
//    one-tap "Show how" animated/stepped demo (reduced-motion safe), and missed-spot visual highlight.
// 2. CTOPP-2-style Word Sounds Worksheet Audio Companion: 1-to-1 worksheet item plan, live in-page
//    player overlay, and standalone offline single-file HTML audio companion (zero AI, zero network).
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf8');
const verifyCore = require('../packets_verify_core.js');
const tool = require('../dev-tools/make_word_sounds_packet.cjs');
const opened = [];
afterEach(() => { while (opened.length) { try { opened.pop().close(); } catch (_) {} } });
const wait = (ms = 15) => new Promise((r) => setTimeout(r, ms));

function wavB64(tag = 'clip') {
  const buf = Buffer.alloc(96);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(88, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(24000, 24);
  buf.writeUInt32LE(48000, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(52, 40);
  buf.write(String(tag).slice(0, 12), 44);
  return buf.toString('base64');
}
const wavUri = (tag) => 'data:audio/wav;base64,' + wavB64(tag);

function loadWordSoundsRuntime() {
  const core = new Function(read('word_sounds_core.js') + '\nreturn createWordSoundsCore();')();
  delete window.AlloWordSoundsTakeHome;
  new Function(read('word_sounds_take_home_loader.js'))();
  return { core, TH: window.AlloWordSoundsTakeHome };
}

async function buildRealMultiActivityLesson() {
  const { dictionary, core, loader, wordlist, builder } = tool.loadParts();
  const tiny = (label) => wavUri(label);
  const shrink = (val, p) => typeof val === 'string'
    ? (val.startsWith('data:audio') ? tiny(p) : val)
    : (val && typeof val === 'object' ? Object.fromEntries(Object.entries(val).map(([k, v]) => [k, shrink(v, p + '/' + k)])) : val);
  const rawBanks = tool.loadBanks({ shards: false });
  const banks = shrink(rawBanks, 'b');
  const res = await builder.buildPacket({
    words: ['cat', 'top', 'sun', 'hat'],
    activities: ['letter_tracing', 'isolation', 'blending', 'rhyming', 'orthography'],
    seed: 7,
    title: 'Short Vowel Check',
    core,
    dictionary,
    banks,
    loader,
    wordlist,
    allowUnconverted: true,
  });
  return { core, TH: loader, lesson: res.lesson, html: res.html };
}

function attachFakeCanvas(win, opts = {}) {
  const { coveredCells = 1 } = opts;
  win.HTMLCanvasElement.prototype.getContext = function () {
    const self = this;
    return {
      canvas: self,
      save() {},
      restore() {},
      setTransform() {},
      clearRect() {},
      beginPath() {},
      closePath() {},
      moveTo() {},
      lineTo() {},
      arc() {},
      stroke() {},
      fill() {},
      fillText() {},
      setLineDash() {},
      drawImage() {},
      getImageData(_x, _y, w, h) {
        const data = new Uint8ClampedArray(w * h * 4);
        // Temporary offscreen canvases (mask/halo) have no data-trace-pen attribute -> fill 4 cells;
        // trace canvas ([data-trace-pen]) fills only `coveredCells` cells so measure() finds missed regions!
        const isPen = !!(self.hasAttribute && self.hasAttribute('data-trace-pen'));
        const cells = isPen ? coveredCells : 4;
        for (let c = 0; c < cells; c++) {
          const cx = Math.floor((c + 0.5) * (w / 7));
          const cy = Math.floor(2.5 * (h / 7));
          for (let dy = -6; dy <= 6; dy++) {
            for (let dx = -6; dx <= 6; dx++) {
              const px = Math.max(0, Math.min(w - 1, cx + dx));
              const py = Math.max(0, Math.min(h - 1, cy + dy));
              data[(py * w + px) * 4 + 3] = 255;
            }
          }
        }
        return { data, width: w, height: h };
      },
      lineCap: 'round',
      lineJoin: 'round',
      lineWidth: 2,
      strokeStyle: '#000',
      fillStyle: '#000',
      font: '12px sans-serif',
      textAlign: 'center',
      textBaseline: 'middle',
    };
  };
}

function drawOnCanvas(win, canvas, points) {
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 280, height: 280, right: 280, bottom: 280 });
  canvas.setPointerCapture = () => {};
  const mk = (type, pt) => {
    const ev = new win.Event(type, { bubbles: true, cancelable: true });
    ev.clientX = pt[0];
    ev.clientY = pt[1];
    ev.pointerId = 1;
    ev.button = 0;
    return ev;
  };
  canvas.dispatchEvent(mk('pointerdown', points[0]));
  for (let i = 1; i < points.length; i++) canvas.dispatchEvent(mk('pointermove', points[i]));
  canvas.dispatchEvent(mk('pointerup', points[points.length - 1]));
}

describe('Wave 39A: Upgraded Letter Tracing coaching, Show how demo, and missed-spot highlight', () => {
  it('builds a verified Letter Trace packet with Show how demo (respecting reduced motion), directionality coaching, multi-stroke cues, and missed-spot hint', async () => {
    const { core, TH } = loadWordSoundsRuntime();
    const mkWord = (w, board) => ({
      word: w, targetWord: w, term: w,
      _ttsAssets: { [w]: { mime: 'audio/wav', base64: wavB64(w) } },
      activityItems: { letter_tracing: board },
    });
    const { lesson } = TH.lessonFromPack(
      [mkWord('top', { letter: 't', cases: 'lowercase' }), mkWord('cat', { letter: 'c', cases: 'lowercase' })],
      { core, banks: { instructions: { fb_great_job: wavUri('gj'), fb_try_again_listen: wavUri('ta') } }, activities: ['letter_tracing'], title: 'Trace Lab' }
    );
    const html = TH.buildHtml(lesson, { core });
    const report = verifyCore.verifyPacket(html);
    expect(report.counts.notExpected).toBe(0);
    expect(report.counts.look).toBe(0);

    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://packets.test/trace.html',
      beforeParse(w) {
        attachFakeCanvas(w, { coveredCells: 1 });
        w.Audio = class {
          play() { setTimeout(() => { if (typeof this.onended === 'function') this.onended(); }, 0); return Promise.resolve(); }
          pause() {}
        };
        w.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
      },
    });
    const win = dom.window;
    const doc = win.document;
    opened.push(win);
    const button = (text) => [...doc.querySelectorAll('#app button')].filter((b) => !b.closest('[hidden]') && !b.hidden).find((b) => b.textContent === text);

    doc.getElementById('learner-name').value = 'Sam';
    button('Start').click();

    // First item is lowercase 't' (2 strokes: vertical down M 22 0 L 22 100, then crossbar M 4 50 L 40 50).
    const demoBtn = doc.querySelector('[data-trace-demo]');
    expect(demoBtn).toBeTruthy();
    expect(demoBtn.textContent).toBe('Show how');

    const note = doc.querySelector('[data-trace-note]');
    const canvas = doc.querySelector('[data-trace-pen]');
    expect(note && canvas).toBeTruthy();

    // 1. Clicking "Show how" announces the stepped/animated demo without throwing (reduced-motion active).
    demoBtn.click();
    expect(note.textContent).toMatch(/Watch how to trace the letter t/i);

    // 2. Draw a backwards vertical stroke (bottom-to-top) -> directionality coaching fires!
    drawOnCanvas(win, canvas, [[140, 210], [140, 160], [140, 110], [140, 60]]);
    expect(note.textContent).toMatch(/starting at the top and pulling down/i);

    // 3. Undo and draw a clean top-to-bottom stroke 1 near dot 1 (x=140, y=53 -> y=200).
    doc.querySelector('[data-trace-undo]').click();
    drawOnCanvas(win, canvas, [[140, 56], [140, 105], [140, 155], [140, 198]]);
    expect(note.textContent).toMatch(/Nice stroke 1! Now start at green dot 2/i);

    // 4. Tap "I traced it" with 1 of 4 cells covered (25% < 60%) -> missed-region highlight feedback!
    doc.querySelector('[data-trace-done]').click();
    expect(note.textContent).toMatch(/highlighted spots/i);

    // 5. Move to 'cat' (lowercase 'c', magic-c counterclockwise curve).
    button('Skip (not traced)').click();
    doc.querySelector('[data-next]').click();
    const cCanvas = doc.querySelector('[data-trace-pen]');
    const cNote = doc.querySelector('[data-trace-note]');
    expect(doc.querySelector('[data-trace-question]').textContent).toContain('c');

    // Draw a CLOCKWISE arc (starting top-right, curving right/down/left) -> magic-c curve tip!
    drawOnCanvas(win, cCanvas, [
      [165, 132], [190, 160], [180, 196], [140, 205], [104, 190],
    ]);
    expect(cNote.textContent).toMatch(/Curve around to the left/i);
  });

  it('keeps standard non-tracing packets compact and strictly under the 176,000-byte size cap', () => {
    const { core, TH } = loadWordSoundsRuntime();
    const mathBuilder = read('packet_math_practice_builder.js');
    expect(mathBuilder).not.toContain('letter_tracing_demo');
    const { lesson } = TH.lessonFromPack([
      { word: 'cat', targetWord: 'cat', term: 'cat', _ttsAssets: { cat: { mime: 'audio/wav', base64: wavB64('cat') } }, activityItems: { isolation: { position: 0, correctSound: 'k', options: ['k', 's'] } } },
    ], { core, banks: { instructions: { fb_great_job: wavUri('gj'), fb_try_again_listen: wavUri('ta') }, isolation: { '1st': wavUri('q1') }, phonemes: { k: wavUri('k'), s: wavUri('s') } }, activities: ['isolation'] });
    const nonTraceHtml = TH.buildHtml(lesson, { core });
    expect(nonTraceHtml.length).toBeLessThan(176000);
  });
});

describe('Wave 39B: CTOPP-2-style Word Sounds Worksheet Audio Companion', () => {
  function loadPrintCards(domWin) {
    domWin.eval(read('packets-print-cards.js'));
    return domWin.AlloPacketPrintCards;
  }

  it('builds a 1-to-1 worksheet audio plan with segmented blending clips and minimal bundled audio', async () => {
    const { lesson } = await buildRealMultiActivityLesson();
    const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only', url: 'https://packets.test/packets-make.html' });
    opened.push(dom.window);
    const PC = loadPrintCards(dom.window);

    // Add an unused clip to lesson.audio to ensure plan bundles ONLY referenced clips.
    const lessonWithExtra = {
      ...lesson,
      audio: { ...lesson.audio, unused_orphan_clip: wavUri('orphan') },
    };

    const plan = PC.buildWordSoundsAudioPlan({ title: 'Short Vowel Check', lesson: lessonWithExtra, audio: lessonWithExtra.audio });
    const wsHtml = PC.buildWordSoundsWorksheetHtml({ title: 'Short Vowel Check', lesson: lessonWithExtra });

    expect(plan.sections.length).toBeGreaterThanOrEqual(4);
    expect(plan.audio.unused_orphan_clip).toBeUndefined();
    expect(plan.clipCount).toBeGreaterThan(0);

    // Confirm section order and activity IDs match the printed worksheet 1-to-1.
    const wsSections = [...wsHtml.matchAll(/data-activity="([^"]+)"/g)].map((m) => m[1]);
    expect(plan.sections.map((s) => s.activity)).toEqual(wsSections);

    const blendSec = plan.sections.find((s) => s.activity === 'blending');
    expect(blendSec).toBeTruthy();
    expect(blendSec.items[0].segmented).toBe(true);
    expect(blendSec.items[0].mainClips.length).toBeGreaterThanOrEqual(2);

    // Spelling / orthography script does NOT leak the spelling word before teacher answers are toggled on.
    const spellSec = plan.sections.find((s) => s.activity === 'orthography');
    expect(spellSec).toBeTruthy();
    expect(spellSec.items[0].script.toLowerCase()).not.toContain(spellSec.items[0].word.toLowerCase());
    expect(spellSec.items[0].answer.toLowerCase()).toContain(spellSec.items[0].word.toLowerCase());
  }, 30000);

  it('generates a strict offline standalone Audio Companion HTML that mounts, plays clips at 0.8x, toggles answers, and navigates items', async () => {
    const { lesson } = await buildRealMultiActivityLesson();
    const hostDom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only', url: 'https://packets.test/packets-make.html' });
    opened.push(hostDom.window);
    const PC = loadPrintCards(hostDom.window);

    const companionHtml = PC.buildWordSoundsAudioCompanionHtml({ title: 'Short Vowel Check', lesson, audio: lesson.audio });
    expect(companionHtml).toContain("connect-src 'none'");
    expect(companionHtml).toContain('media-src data:');
    expect(companionHtml).not.toMatch(/innerHTML|document\.write|https?:\/\//i);

    const playerDom = new JSDOM(companionHtml, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://packets.test/audio.html' });
    const pw = playerDom.window;
    const pd = pw.document;
    opened.push(pw);
    const playedUris = [];
    pw.Audio = class {
      constructor(src) { this.src = src; this.playbackRate = 1; }
      play() {
        playedUris.push({ src: this.src, rate: this.playbackRate });
        setTimeout(() => { if (typeof this.onended === 'function') this.onended(); }, 0);
        return Promise.resolve();
      }
      pause() {}
    };
    for (const s of [...pd.querySelectorAll('script')]) {
      if (s.textContent.trim()) pw.eval(s.textContent);
    }

    expect(pd.querySelector('h1').textContent).toContain('Short Vowel Check');
    expect(pd.querySelector('.item-title').textContent).toContain('#1');
    const ansBox = pd.querySelector('.ans');
    expect(ansBox.hidden).toBe(true);

    // Toggle Slow (0.8x) and "Show teacher answers".
    const checkboxes = [...pd.querySelectorAll('input[type="checkbox"]')];
    expect(checkboxes).toHaveLength(2);
    checkboxes[0].checked = true;
    checkboxes[0].dispatchEvent(new pw.Event('change', { bubbles: true }));
    checkboxes[1].checked = true;
    checkboxes[1].dispatchEvent(new pw.Event('change', { bubbles: true }));
    expect(ansBox.hidden).toBe(false);

    // Click Play item and await promise microtask chain to confirm slow 0.8x audio clip fires.
    const playBtn = pd.querySelector('button.primary');
    playBtn.click();
    await wait(25);
    expect(playedUris.length).toBeGreaterThan(0);
    expect(playedUris[0].src.startsWith('data:audio/wav;base64,')).toBe(true);
    expect(playedUris[0].rate).toBe(0.8);

    // Advance with Next button.
    const nextBtn = [...pd.querySelectorAll('.stage button')].find((b) => b.textContent === 'Next');
    nextBtn.click();
    expect(pd.querySelector('.counter').textContent).toContain('Item 2 of');
  }, 30000);

  it('wires #worksheet-audio on packets-make.html and opens/downloads/closes the live overlay cleanly', async () => {
    const { lesson } = await buildRealMultiActivityLesson();
    const html = read('packets-make.html');
    const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://packets.test/packets-make.html' });
    const w = dom.window;
    const d = w.document;
    opened.push(w);
    w.scrollTo = () => {};

    const btn = d.getElementById('worksheet-audio');
    expect(btn).toBeTruthy();
    expect(btn.hidden).toBe(true);

    const PC = loadPrintCards(w);
    const downloads = [];
    w.URL.createObjectURL = (blob) => { downloads.push(blob); return 'blob:ws-audio-test'; };
    w.URL.revokeObjectURL = () => {};
    w.Audio = class {
      play() { setTimeout(() => { if (typeof this.onended === 'function') this.onended(); }, 0); return Promise.resolve(); }
      pause() {}
    };

    PC.wireWorksheetAudio(btn, () => ({ title: 'Short Vowel Check', lesson, audio: lesson.audio }), { show: true });
    expect(btn.hidden).toBe(false);

    btn.click();
    const view = d.getElementById('worksheet-audio-view');
    expect(view && !view.hidden).toBe(true);
    expect(d.body.classList.contains('pc-on')).toBe(true);
    expect(d.getElementById('pc-audio-show-ans').checked).toBe(false);
    expect(view.querySelector('.pc-audio-answer').hidden).toBe(true);

    d.getElementById('pc-audio-show-ans').checked = true;
    d.getElementById('pc-audio-show-ans').dispatchEvent(new w.Event('change', { bubbles: true }));
    expect(view.querySelector('.pc-audio-answer').hidden).toBe(false);

    // Trigger offline HTML download.
    d.getElementById('pc-audio-download').click();
    expect(downloads).toHaveLength(1);

    // Escape closes the overlay cleanly.
    d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(view.hidden).toBe(true);
    expect(d.body.classList.contains('pc-on')).toBe(false);
  }, 30000);
});
