// @vitest-environment jsdom
// "Space between sounds" (2026-11-17, owner: "please do space between sounds"): the pause between the sounds of a word
// when it is sounded out (Blend Sounds), Some 500 ms (as before), More 800 ms, Less 250 ms.
//   - In a take-home practice file: a Reading tools group, shown only in a file with Blend Sounds, never in a check.
//     The choice is kept in the file's storage item and counted in an item's supports (soundsMore / soundsLess).
//   - In the app's Word Sounds: a choice beside the speed, kept on the device; never in a probe or a fixed-form session.
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const read = (file) => readFileSync(file, 'utf8');
const core = new Function(read('word_sounds_core.js') + ';return createWordSoundsCore();')();
delete window.AlloWordSoundsTakeHome;
new Function(read('word_sounds_take_home_loader.js'))();
const TH = window.AlloWordSoundsTakeHome;
delete window.AlloPacketChecks;
new Function(read('packet_check_builder.js'))();
const PC = window.AlloPacketChecks;

const wav = (tag) => { const b = Buffer.alloc(64); b.write('RIFF'); b.write('WAVE', 8); b.write(String(tag).slice(0, 8), 44); return b.toString('base64'); };
const uri = (tag) => 'data:audio/wav;base64,' + wav(tag);
const BANKS = { phonemes: { k: uri('k'), a: uri('a'), t: uri('t'), m: uri('m'), p: uri('p'), s: uri('s'), u: uri('u'), n: uri('n') }, instructions: { fb_great_job: uri('gj'), fb_try_again_listen: uri('ta') } };
const SAY = ['cat', 'map', 'sun', 'Which word did you hear?', 'Blend these sounds together!'];
const bw = (w, phonemes, options) => ({ word: w, targetWord: w, term: w, phonemes, _ttsAssets: Object.fromEntries(SAY.map((s) => [s, { mime: 'audio/wav', base64: wav(s) }])), activityItems: { blending: { options } } });
const blendLesson = () => {
  const made = TH.lessonFromPack([bw('cat', ['k', 'a', 't'], ['cat', 'map', 'sun']), bw('map', ['m', 'a', 'p'], ['map', 'cat', 'sun'])], { core, banks: BANKS, activities: ['blending'], title: 'Blend', lessonId: 'L-space' });
  made.lesson.createdAt = '2026-11-17T00:00:00.000Z';
  return made.lesson;
};
const BLEND = TH.buildHtml(blendLesson(), { core });
const CHECK = PC.buildCheckPacket({ lesson: PC.lessonFromMathProblems({ title: 'Facts', problems: PC.parseProblems('7+8,12-5'), timeLimitS: 60 }), loader: TH }).html;

const settle = (ms = 40) => new Promise((r) => setTimeout(r, ms));
const opened = [];
afterEach(() => { while (opened.length) { try { opened.pop().close(); } catch (_) {} } });
function open(html, { storage = null } = {}) {
  const waits = [], saved = [];
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/file.html', beforeParse(w) {
    w.Blob = class { constructor(parts, opts) { this.body = parts.join(''); this.type = opts && opts.type; } };
    w.URL.createObjectURL = (blob) => { saved.push(blob); return 'blob:results'; };
    w.URL.revokeObjectURL = () => {};
    w.HTMLAnchorElement.prototype.click = function () {};
    w.Audio = class { play() { const me = this; setTimeout(() => { if (me.onended) me.onended(); }, 1); return Promise.resolve(); } pause() {} };
    const real = w.setTimeout.bind(w);
    // Every wait the file asks for is noted, and runs at once (the test does not wait out the pauses).
    w.setTimeout = (fn, ms, ...rest) => { waits.push(ms); return real(fn, 0, ...rest); };
    if (storage) Object.keys(storage).forEach((k) => w.localStorage.setItem(k, storage[k]));
  } });
  const w = dom.window, d = w.document;
  opened.push(w);
  const q = (s) => d.querySelector(s);
  const button = (text) => [...d.querySelectorAll('#app button')].filter((b) => !b.closest('[hidden]')).find((b) => b.textContent === text);
  const json = () => { q('[data-save-json]').click(); return JSON.parse(saved[saved.length - 1].body); };
  return { w, d, q, waits, button, json, dump:() => Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, JSON.parse(w.localStorage.getItem(k))])) };
}
async function toFirstItem(t) {
  const find = (text) => [...t.d.querySelectorAll('button')].filter((b) => !b.closest('[hidden]')).find((b) => b.textContent === text);
  find('Start').click();
  await settle(40);
  const anon = find('Continue without a name');
  if (anon) { anon.click(); await settle(60); }
  t.q('[data-tools-open]').click();
}

describe('take-home practice file', () => {
  it('a file with Blend Sounds offers Space between sounds (Some, More, Less), Some chosen', () => {
    const t = open(BLEND);
    t.q('[data-tools-open]').click();
    const g = t.q('[data-tool-group="sounds"]');
    expect(g.hidden).toBe(false);
    expect(t.d.getElementById(g.getAttribute('aria-labelledby')).textContent).toBe('Space between sounds');
    expect([...g.querySelectorAll('button')].map((b) => b.textContent + '=' + b.getAttribute('aria-pressed'))).toEqual(['Some=true', 'More=false', 'Less=false']);
    expect(g.querySelector('p').textContent).toContain('More helps hear each sound');
  });

  it('a check has no such choice, and a file without Blend Sounds hides it', () => {
    const c = open(CHECK);
    c.q('[data-tools-open]').click();
    expect(c.q('[data-tool-group="sounds"]').hidden).toBe(true);
    expect(read('word_sounds_take_home_loader.js')).toContain("sounds: lesson.mode !== 'probe' && lesson.blocks.some(function (b) { return b.activity === 'blending'; }) }) : null;");
  });

  it('the sounds of a word are played with the chosen pause: Some 500 ms, More 800 ms, Less 250 ms', async () => {
    for (const [v, ms] of [[0, 500], [1, 800], [2, 250]]) {
      const t = open(BLEND);
      await toFirstItem(t);
      t.q('[data-tool="sounds-' + v + '"]').click();
      const hear = t.button('Hear the sounds');
      expect(hear, 'Hear the sounds').toBeTruthy();
      t.waits.length = 0;
      hear.click();
      await settle(120);
      // Three sounds (k, a, t), each followed by the pause; then the question.
      expect(t.waits.filter((x) => x === ms).length, 'pause ' + ms).toBeGreaterThanOrEqual(3);
      for (const other of [500, 800, 250].filter((x) => x !== ms)) expect(t.waits.filter((x) => x === other).length, 'no ' + other + ' with ' + ms).toBe(0);
    }
  });

  it('is kept in the file\'s storage item, comes back when the file is opened again, and counts in the supports', async () => {
    const t = open(BLEND);
    await toFirstItem(t);
    t.q('[data-tool="sounds-1"]').click();
    const kept = Object.values(t.dump()).find((v) => v && v.tools);
    expect(kept.tools).toEqual({ sounds: 1 });
    const again = open(BLEND, { storage: Object.fromEntries(Object.entries(t.dump()).map(([k, v]) => [k, JSON.stringify(v)])) });
    again.q('[data-tools-open]').click();
    expect(again.q('[data-tool="sounds-1"]').getAttribute('aria-pressed')).toBe('true');
    // Counted on the item on screen while it was on; Some (the usual pause) counts nothing.
    const play = async (set) => {
      const p = open(BLEND);
      p.d.getElementById('learner-name').value = 'Ana';
      p.button('Start').click();
      await settle(60);
      if (set != null) p.q('[data-tool="sounds-' + set + '"]').click();
      p.d.body.dispatchEvent(new p.w.KeyboardEvent('keydown', { key: '1', bubbles: true, cancelable: true }));
      await settle(60);
      p.button('Next').click();
      await settle(60);
      p.d.body.dispatchEvent(new p.w.KeyboardEvent('keydown', { key: '1', bubbles: true, cancelable: true }));
      await settle(60);
      p.button('See my results').click();
      return p.json().items.map((it) => it.supports);
    };
    expect(await play(1)).toEqual([{ soundsMore: 1 }, { soundsMore: 1 }]);
    expect(await play(2)).toEqual([{ soundsLess: 1 }, { soundsLess: 1 }]);
    expect(await play(null)).toEqual([{}, {}]);
  });
});

describe('the app\'s Word Sounds', () => {
  const src = read('word_sounds_module.js');
  it('a choice beside the speed, kept on the device, standard in a probe or a fixed-form session', () => {
    expect(src).toContain("const [soundSpace, setSoundSpace] = React.useState(() => { try { const v = localStorage.getItem('allo_ws_sound_space'); return v === 'more' || v === 'less' ? v : 'some'; } catch (_) { return 'some'; } });");
    expect(src).toContain("soundGapRef.current = isFixedForm ? 500 : soundSpace === 'more' ? 800 : soundSpace === 'less' ? 250 : 500;");
    expect(src).toContain('            await handleAudio(phoneme);\n            await new Promise((r) => setTimeout(r, soundGapRef.current));\n');
    expect(src).toContain('!isFixedForm &&\n                /*#__PURE__*/ React.createElement(\n                  "label",\n                  { className: "flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs", "data-testid": "ws-sound-space" },');
    // The order on screen: More, Some, Less; labels from the file's own words (one translation for both).
    const at = src.indexOf('"data-testid": "ws-sound-space"');
    const block = src.slice(at, src.indexOf('              );\n', at));
    expect([...block.matchAll(/value: "(more|some|less)"/g)].map((m) => m[1])).toEqual(['more', 'some', 'less']);
    expect(block).toContain('ts("word_sounds.take_home_player_tools_sounds")');
    // isFixedForm is defined before the choice reads it.
    expect(src.indexOf('const isFixedForm = isProbeMode || runtimeSessionConfig.fixedForm === true;')).toBeLessThan(src.indexOf('soundGapRef.current = isFixedForm'));
  });
});
