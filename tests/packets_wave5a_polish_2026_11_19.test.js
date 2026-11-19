// @vitest-environment jsdom
// Wave 5A High-Impact Polish (2026-11-19): covers all 12 zero-UI-complexity reliability, theme/HC/forced-colors,
// iPad/Safari touch & mic, and builder edge-case improvements across Packets & main-app Break it Down.
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const core = new Function(read('word_sounds_core.js') + ';return createWordSoundsCore();')();
delete window.AlloWordSoundsTakeHome;
new Function(read('word_sounds_take_home_loader.js'))();
const TH = window.AlloWordSoundsTakeHome;
const MP = require('../packet_math_practice_builder.js');
const RA = require('../packet_read_along_builder.js');
const VB = require('../packet_vocab_builder.js');
const SR = require('../packet_symbol_runner_builder.js');
const PC = require('../packet_check_builder.js');
const verify = require('../packets_verify_core.js');
const vbank = require('./fixtures/packets_vocab_bank_fixture.js');

const wav = (tag) => { const b = Buffer.alloc(64); b.write('RIFF'); b.write('WAVE', 8); b.write(String(tag).slice(0, 8), 44); return b.toString('base64'); };
const uri = (tag) => 'data:audio/wav;base64,' + wav(tag);
const opened = [];
afterEach(() => { while (opened.length) { try { opened.pop().close(); } catch (_) {} } });

function openFile(html, beforeParseExtra) {
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'https://packet.test/file.html',
    beforeParse(w) {
      w.Audio = class { play() { return Promise.resolve(); } pause() {} };
      if (typeof beforeParseExtra === 'function') beforeParseExtra(w);
    },
  });
  opened.push(dom.window);
  return { w: dom.window, d: dom.window.document };
}

describe('Wave 5A Tier 1: Theme, High Contrast, Forced Colors & Picture Mattes', () => {
  it('1. Math Practice (math_ccc & math_rehearsal) uses var(--soft) on covered answer slots so High Contrast is never 1:1 white-on-white', () => {
    for (const mode of ['ccc', 'rehearsal']) {
      const lesson = MP.lessonFromMathPractice({ loader: TH, mode, factSet: 'mul-7' });
      const { html } = MP.buildMathPracticePacket({ lesson, loader: TH });
      const { d } = openFile(html);
      d.documentElement.setAttribute('data-lt-colors', '1');
      d.getElementById('learner-name').value = 'Sam';
      d.querySelector('#app button.primary').click();
      const cover = d.querySelector('[data-cover]');
      if (cover && !cover.hidden) cover.click();
      const slot = d.querySelector('[data-slot]');
      expect(slot, mode).toBeTruthy();
      expect(slot.style.background, mode).toBe('var(--soft)');
      expect(slot.style.background, mode).not.toBe('var(--line)');
    }
  });

  it('2 & 3 & 7a. Player CSS fixes HC progress/timebar contrast, forced-colors badges/star, dark hover, picture white matte, and button touch-action', () => {
    const lesson = MP.lessonFromMathPractice({ loader: TH, mode: 'ccc', factSet: 'mul-2' });
    const { html } = MP.buildMathPracticePacket({ lesson, loader: TH });
    const css = /<style>([\s\S]*?)<\/style>/.exec(html)[1];
    expect(css).toContain('[data-lt-colors="1"] .progress{background:var(--soft);border:1px solid var(--line)}');
    expect(css).not.toContain('.timebar');
    const checkHtml = PC.buildCheckPacket({ lesson: PC.lessonFromMathProblems({ title: 'Facts', problems: PC.parseProblems('2+3,4+5'), timeLimitS: 60 }), loader: TH }).html;
    expect(checkHtml).toContain('[data-lt-colors="1"] .timebar{background:var(--soft);border:1px solid var(--line)}');
    expect(css).toContain('[data-feedback]:not(:empty)::before,.done-star::after{forced-color-adjust:none;background:Highlight;color:HighlightText}');
    expect(css).toContain('touch-action:manipulation');
    expect(css).toContain('.picture{max-width:160px;max-height:160px;border-radius:12px;background:#fff;padding:4px}');
    expect(css).toContain('linear-gradient(var(--hover),var(--hover))');
    expect(css).toContain('[data-lt-colors="1"]{');
    expect(css).toContain('--hover:#ffffff28');
    expect(css).toContain('--hover:#ffffff1c');
  });

  it('3b. Sentence Match placed slot image keeps white matte for dark-line Mulberry SVGs', () => {
    const src = read('word_sounds_take_home/adapters/sentence_match.js');
    expect(src).toContain("background:#fff;border-radius:8px;padding:4px");
  });

  it('4. Letter Trace uses var(--card) + theme tokens and rejects secondary/palm pointers and right-clicks', () => {
    const src = read('word_sounds_take_home/adapters/letter_tracing.js');
    expect(src).toContain('background:var(--card)');
    expect(src).not.toContain('background:#fff');
    expect(src).toContain("attributeFilter: ['data-lt-colors']");
    // Live multi-touch palm rejection test with stubbed 2d canvas context.
    const strokes = [];
    const word = { word: 'cat', targetWord: 'cat', term: 'cat', _ttsAssets: { cat: { mime: 'audio/wav', base64: wav('cat') } }, activityItems: { letter_tracing: { letter: 'c', cases: 'capital' } } };
    const banks = { instructions: { fb_great_job: uri('gj'), fb_try_again_listen: uri('ta'), trace_letter: uri('tl'), letter_c: uri('lc'), for: uri('for') } };
    const { lesson } = TH.lessonFromPack([word], { core, banks, activities: ['letter_tracing'] });
    const html = TH.buildHtml(lesson, { core });
    const { w, d } = openFile(html, (win) => {
      win.HTMLCanvasElement.prototype.getContext = function () {
        const isPen = this.hasAttribute('data-trace-pen');
        return {
          setTransform() {}, clearRect() {}, save() {}, restore() {}, beginPath() {}, setLineDash() {},
          moveTo(x, y) { if (isPen) strokes.push(['M', Math.round(x), Math.round(y)]); },
          lineTo(x, y) { if (isPen) strokes.push(['L', Math.round(x), Math.round(y)]); },
          stroke() {}, fill() {}, arc() {}, closePath() {}, fillText() {}, strokeText() {}, fillRect() {},
          getImageData() { return { data: new Uint8ClampedArray(4) }; },
        };
      };
    });
    d.getElementById('learner-name').value = 'Sam';
    d.querySelector('#app button.primary').click();
    const wrap = d.querySelector('[data-trace-box]');
    expect(wrap.style.background).toBe('var(--card)');
    const pen = d.querySelector('[data-trace-pen]');
    pen.getBoundingClientRect = () => ({ left: 0, top: 0, width: 280, height: 280 });
    const fire = (type, opts) => {
      const ev = new w.MouseEvent(type, { bubbles: true, cancelable: true, clientX: opts.x, clientY: opts.y, button: opts.button ?? 0 });
      Object.defineProperty(ev, 'pointerId', { value: opts.id });
      Object.defineProperty(ev, 'isPrimary', { value: opts.primary });
      Object.defineProperty(ev, 'pointerType', { value: opts.pointerType || 'touch' });
      pen.dispatchEvent(ev);
    };
    // Right mouse button ignored
    fire('pointerdown', { x: 10, y: 10, id: 1, primary: true, pointerType: 'mouse', button: 2 });
    expect(strokes).toEqual([]);
    // Primary touch starts at (50, 50); palm rest (id 2, primary false) at (250, 250) must be ignored and NOT end stroke 1!
    fire('pointerdown', { x: 50, y: 50, id: 1, primary: true });
    fire('pointerdown', { x: 250, y: 250, id: 2, primary: false });
    fire('pointermove', { x: 255, y: 255, id: 2, primary: false });
    fire('pointerup', { x: 255, y: 255, id: 2, primary: false });
    fire('pointermove', { x: 80, y: 80, id: 1, primary: true });
    fire('pointerup', { x: 80, y: 80, id: 1, primary: true });
    expect(strokes).toEqual([['M', 50, 50], ['L', 50, 50], ['M', 50, 50], ['L', 80, 80]]);
  });

  it('5. Main app Break it Down chips remove hardcoded inline pastel colors & #475569 ink so app themes remap them cleanly', () => {
    const ws = read('word_sounds_module.js');
    const segIdx = ws.indexOf('"data-seg-box": i');
    expect(segIdx).toBeGreaterThan(0);
    const segSlice = ws.slice(segIdx, segIdx + 7000);
    expect(segSlice).not.toContain('backgroundColor: chip');
    expect(segSlice).not.toContain('color: "#475569"');
    expect(segSlice).toContain('bg-violet-50 border-2 border-violet-400 text-slate-800');
    expect(segSlice).toContain('touchAction: "none"');
  });

  it('6. Symbol Runner uses var(--soft) track, var(--warn) quantity_stroop distractor, and HC/mobile live styles', () => {
    const { lesson } = SR.lessonFromSymbolRunner({ loader: TH, mode: 'quantity_stroop', length: 4 });
    const { html } = SR.buildSymbolRunnerPacket({ lesson, loader: TH });
    const { d } = openFile(html);
    d.getElementById('learner-name').value = 'Sam';
    d.querySelector('#app button.primary').click();
    const track = d.querySelector('[data-sr-lanes]');
    expect(track.style.background).toBe('var(--soft)');
    const css = read('packets-symbol-runner.css');
    expect(css).toContain('.asr-hc .asr-input');
    expect(css).toContain('.asr-hc .asr-summary');
    expect(css).toContain('grid-template-columns: repeat(4, minmax(0, 1fr))');
  });
});

describe('Wave 5A Tier 2: Touch Ergonomics, Safari Mic & Non-ASCII Spelling Bee', () => {
  it('7b. Word Scramble guards focus on touch (detail > 0) and highlights empty boxes while holding a tile', () => {
    const w = { word: 'cat', targetWord: 'cat', term: 'cat', _ttsAssets: { cat: { mime: 'audio/wav', base64: wav('cat') } }, activityItems: { word_scramble: { letters: ['t', 'c', 'a'], answer: 'cat' } } };
    const banks = { instructions: { fb_great_job: uri('gj'), fb_try_again_listen: uri('ta'), inst_word_scramble: uri('inst') } };
    const { lesson } = TH.lessonFromPack([w], { core, banks, activities: ['word_scramble'] });
    const { w: win, d } = openFile(TH.buildHtml(lesson, { core }));
    d.getElementById('learner-name').value = 'Sam';
    d.querySelector('#app button.primary').click();
    const tile = d.querySelector('ul button.primary');
    const boxes = [...d.querySelectorAll('ol.slots button.slot')];
    // Touch/mouse click (detail: 1) picks tile, lights empty boxes with var(--accent), and does NOT steal focus to box 0.
    tile.focus();
    tile.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
    expect(d.activeElement).toBe(tile);
    expect(boxes.every((b) => b.style.borderColor === 'var(--accent)' && /var\(--accent\)/.test(b.style.boxShadow))).toBe(true);
    // Drop and re-pick via keyboard (detail: 0) -> moves focus straight to box 0.
    tile.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
    expect(boxes.every((b) => b.style.boxShadow === '')).toBe(true);
    tile.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, detail: 0 }));
    expect(d.activeElement).toBe(boxes[0]);
  });

  it('8. Read-Along and My Words mic recorders negotiate MediaRecorder MIME (Safari audio/mp4), guard empty chunks, and Read-Along cancels mic on edit', () => {
    const ra = read('packets-read-along.js');
    expect(ra).toContain("'audio/mp4'");
    expect(ra).toContain('isTypeSupported');
    expect(ra).toContain('if (!rec.chunks.length)');
    expect(ra).toMatch(/var Offline = win\.OfflineAudioContext/);
    expect(ra).toContain("$('f-text').addEventListener('input', function () { cancelMic();");
    const pw = read('packets-words.js');
    expect(pw).toContain("'audio/mp4'");
    expect(pw).toContain('isTypeSupported');
    expect(pw).toContain('if (!rec.chunks.length)');
  });

  it('9. Spelling Bee keeps inputmode="none" for ASCII words and switches to "text" for accented non-ASCII words', () => {
    const banks = { instructions: { fb_great_job: uri('gj'), fb_try_again_listen: uri('ta'), inst_spelling_bee: uri('inst') } };
    const mk = (word) => {
      const w = { word, targetWord: word, term: word, _ttsAssets: { [word]: { mime: 'audio/wav', base64: wav(word) } } };
      const { lesson } = TH.lessonFromPack([w], { core, banks, activities: ['spelling_bee'] });
      const { d } = openFile(TH.buildHtml(lesson, { core }));
      d.getElementById('learner-name').value = 'Sam';
      d.querySelector('#app button.primary').click();
      return d.querySelector('#app input[type="text"]').getAttribute('inputmode');
    };
    expect(mk('cat')).toBe('none');
    expect(mk('niño')).toBe('text');
  });
});

describe('Wave 5A Tier 3: Check Start Over, Read-Along List & Mixed Attribution, Vocab Quotes', () => {
  it('10. Check finish Start over checks s.sent || s.savedFile and Escape closes confirmation', () => {
    const loaderSrc = read('word_sounds_take_home_loader.js');
    expect(loaderSrc).toContain('if (s.sent || s.savedFile) { doAgain(); return; }');
    expect(loaderSrc).toContain("if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); againNo.click(); }");
  });

  it('11. Read-Along keeps numbered list markers attached and round-trips mixed teacher/computer clip attribution', () => {
    const rows = RA.splitPassage('1. First, mix the flour. 2. Next, bake the bread.');
    expect(rows.map((r) => r.text)).toEqual(['1. First, mix the flour.', '2. Next, bake the bread.']);
    const clip1 = 'data:audio/mpeg;base64,SUQzAw==';
    const clip2 = 'data:audio/mpeg;base64,SUQzBA==';
    const made = RA.lessonFromReadAlong({
      loader: TH,
      title: 'Baking',
      sentences: rows,
      clips: {
        '1. First, mix the flour.': { uri: clip1, source: 'teacher' },
        '2. Next, bake the bread.': { uri: clip2, source: 'computer' },
      },
      voice: 'af_heart',
    });
    const built = RA.buildReadAlongPacket({ made, loader: TH });
    const parts = verify.readParts(built.html);
    const back = RA.readBack(parts);
    expect(back.ok).toBe(true);
    expect(back.clipSources['1. First, mix the flour.']).toBe('teacher');
    expect(back.clipSources['2. Next, bake the bread.']).toBe('computer');
  });

  it('12. Vocab normalizeWord strips matched outer single quotes and blankSentence detects quoted leading articles', async () => {
    await vbank.load();
    expect(VB.normalizeWord("'habitat'")).toBe('habitat');
    expect(VB.normalizeWord('‘habitat’')).toBe('habitat');
    expect(VB.normalizeWord('"\'habitat\'"')).toBe('habitat');
    expect(VB.normalizeWord("don't")).toBe("don't");
    const b = VB.blankSentence('"A predator hunts prey."', 'predator', { bank: vbank, base: 'predator', pos: 'noun' });
    expect(b.article).toBe('a');
    expect(b.ask).toBe('"A ___ hunts prey."');
  });
});
