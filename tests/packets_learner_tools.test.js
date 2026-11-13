// @vitest-environment jsdom
// Reading tools in every packet file (2026-11-12): text size, colors, spacing, a reading focus and a magnifier
// (takeHomeTools in word_sounds_take_home_loader.js). They change how the page looks, never the task, so no teacher
// setting turns them off. Each tool that is on while an item is shown counts once in that item's supports (the CSV
// "supports" cell); a check's "#score" row lists them as tools_used, outside the integrity value. The settings are kept
// in the file's one storage item. Also here: [hidden] wins over every display rule, the CSV is the main save
// button, and "About this file" says what the results record.
// Every screen test runs a REAL built file in jsdom; the look in a real browser is a separate Playwright run.
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const core = new Function(read('word_sounds_core.js') + ';return createWordSoundsCore();')();
delete window.AlloWordSoundsTakeHome;
new Function(read('word_sounds_take_home_loader.js'))();
const TH = window.AlloWordSoundsTakeHome;
delete window.AlloPacketChecks;
new Function(read('packet_check_builder.js'))();
const PC = window.AlloPacketChecks;
const MP = require('../packet_math_practice_builder.js');
const verify = require('../packets_verify_core.js');
const reader = require('../packets_results_reader.js');

const wav = (tag) => { const b = Buffer.alloc(64); b.write('RIFF'); b.write('WAVE', 8); b.write(String(tag).slice(0, 8), 44); return b.toString('base64'); };
const uri = (tag) => 'data:audio/wav;base64,' + wav(tag);
const BANKS = {
  isolation: { '1st': uri('q1'), '2nd': uri('q2'), '3rd': uri('q3') },
  phonemes: { k: uri('k'), a: uri('a'), t: uri('t'), m: uri('m'), p: uri('p'), s: uri('s') },
  instructions: { fb_great_job: uri('gj'), fb_try_again_listen: uri('ta') },
};
const word = (w, position, correct, options) => ({ word: w, targetWord: w, term: w, _ttsAssets: { [w]: { mime: 'audio/wav', base64: wav(w) } }, activityItems: { isolation: { position, correctSound: correct, options } } });
const practiceLesson = () => {
  const lesson = TH.lessonFromPack([word('cat', 0, 'k', ['k', 'a', 't', 'm']), word('map', 2, 'p', ['m', 'a', 'p', 's'])], { core, banks: BANKS, title: 'Short a', lessonId: 'L-tools' }).lesson;
  lesson.createdAt = '2026-11-12T00:00:00.000Z';
  return lesson;
};
// Running text: Finish the Sentence and Read the Story, each with its prompt and read-back clips.
const SAY = ['cat', 'Read the sentence. Which word finishes it?', 'Read the story. Which word finishes it?', 'The cat sat on the mat.', 'A cat sat. The cat ran. It hid.', 'A cat sat.', 'The cat ran.', 'It hid.'];
const readingLesson = () => {
  const w = { word: 'cat', targetWord: 'cat', term: 'cat', _ttsAssets: Object.fromEntries(SAY.map((t) => [t, { mime: 'audio/wav', base64: wav(t) }])),
    activityItems: { read_sentence: { sentence: 'The cat sat on the mat.', before: 'The', after: 'sat on the mat.', options: ['cat', 'dog', 'sun', 'pig'] },
      read_passage: { story: 'A cat sat. The cat ran. It hid.', parts: [{ before: 'A', after: 'sat.' }, { before: 'The', after: 'ran.' }, { text: 'It hid.' }], options: ['cat', 'dog', 'sun'] } } };
  const made = TH.lessonFromPack([w, word('map', 2, 'p', ['m', 'a', 'p', 's'])], { core, banks: BANKS, activities: ['read_sentence', 'read_passage', 'isolation'], title: 'Read it', lessonId: 'L-read' });
  return made;
};
const OWN = PC.lessonFromMathProblems({ title: 'Facts to 20', problems: PC.parseProblems('7+8,12-5,6x4,20/4'), timeLimitS: 90 });
const FILES = {
  practice: TH.buildHtml(practiceLesson(), { core }),
  reading: TH.buildHtml(readingLesson().lesson, { core }),
  check: PC.buildCheckPacket({ lesson: OWN, loader: TH }).html,
  facts: MP.buildMathPracticePacket({ lesson: MP.lessonFromMathPractice({ loader: TH, mode: 'ccc', factSet: 'mul-7' }), loader: TH }).html,
};
const manifestOf = (html) => JSON.parse(/<script type="application\/json" id="packet-manifest">(.*?)<\/script>/.exec(html)[1]);
const scriptOf = (html) => [...new JSDOM(html).window.document.querySelectorAll('script')].find((node) => !node.type).textContent;

// RFC 4180 reader: every cell quoted, "" for a quote, CRLF between rows.
function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = false; else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; } else if (c === '\r' && text[i + 1] === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; i++; } else cell += c;
  }
  return rows;
}
const settle = (ms = 40) => new Promise((r) => setTimeout(r, ms));

const opened = [];
afterEach(() => { while (opened.length) { try { opened.pop().close(); } catch (_) {} } });
// Opens a built file with its script running; the test holds both clocks (a check ignores taps in its first 250 ms).
function open(html, { storage = null } = {}) {
  const saved = [];
  const time = { t: 1000, wall: Date.UTC(2026, 10, 12, 14, 0, 0) };
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/file.html', beforeParse(w) {
    w.Audio = class { play() { return Promise.resolve(); } pause() {} };
    w.Blob = class { constructor(parts, opts) { this.body = parts.join(''); this.type = opts && opts.type; } };
    w.URL.createObjectURL = (blob) => { saved.push(blob); return 'blob:results'; };
    w.URL.revokeObjectURL = () => {};
    w.HTMLAnchorElement.prototype.click = function () { saved[saved.length - 1].name = this.getAttribute('download'); };
    Object.defineProperty(w.performance, 'now', { configurable: true, value: () => time.t });
    w.Date.now = () => time.wall;
    if (storage) Object.keys(storage).forEach((k) => w.localStorage.setItem(k, storage[k]));
  } });
  const w = dom.window, d = w.document;
  opened.push(w);
  const q = (selector) => d.querySelector(selector);
  const tick = (ms) => { time.t += ms; time.wall += ms; };
  const button = (text) => [...d.querySelectorAll('#app button')].filter((b) => !b.closest('[hidden]')).find((b) => b.textContent === text);
  const tool = (key, v) => q('[data-tool="' + key + '-' + v + '"]').click();
  const key = (name, target) => target.dispatchEvent(new w.KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));
  const dump = () => Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, JSON.parse(w.localStorage.getItem(k))]));
  const csv = () => { q('[data-save-csv]').click(); return saved[saved.length - 1].body; };
  const json = () => { q('[data-save-json]').click(); return JSON.parse(saved[saved.length - 1].body); };
  return { w, d, q, tick, saved, button, tool, key, dump, csv, json, html: d.documentElement };
}

describe('every file carries the reading tools', () => {
  it('practice, running text, a check and math facts: the same tools, "Check a file" finds nothing to look at, and the tools add under 16.5 KB', () => {
    for (const [name, html] of Object.entries(FILES)) {
      expect(html, name).toContain('\ntools:function takeHomeTools(o) {\n');
      const r = verify.verifyPacket(html);
      expect([r.ok, r.kind, r.result, r.script.verdict], name).toEqual([true, 'packet', 'closed', 'agree']);
      expect(r.counts, name).toMatchObject({ notExpected: 0, look: 0 });
      const script = scriptOf(html);
      for (const banned of [/\binnerHTML\b/, /\bspeechSynthesis\b/, /\bgetUserMedia\b/, /https?:\/\//, /<link\b/i, /@font-face/, /\bsessionStorage\b/, /\bopen\s*\(/]) expect(script, name + ' ' + banned).not.toMatch(banned);
      // One storage item, under the one name the manifest gives.
      const names = [...script.matchAll(/localStorage\.(\w+)\(([^,)]*)/g)].map((m) => m[2].trim());
      expect(new Set(names), name).toEqual(new Set(['storageKey']));
      expect(manifestOf(html).stores).toHaveLength(1);
    }
    // What the tools add to a file: their function (as embedded), their style rules and their words.
    const html = FILES.practice;
    const fn = html.slice(html.indexOf('\ntools:function takeHomeTools'), html.indexOf('\nmailbox:'));
    const style = /<style>([\s\S]*?)<\/style>/.exec(html)[1].split('\n').filter((rule) => /lt-|data-lt/.test(rule)).join('\n');
    const words = JSON.stringify(Object.fromEntries(Object.entries(TH.DEFAULT_LABELS).filter(([k]) => /^tools_/.test(k))));
    const bytes = Buffer.byteLength(fn) + Buffer.byteLength(style) + Buffer.byteLength(words);
    // Re-pinned 2026-11-12 (look pass) from 15000: the four new colors, their dots and their words (+1.4 KB; 14.4 KB before).
    expect(bytes).toBeLessThan(16500);
    // The copy in the file is the loader's own function, without its indentation.
    expect(fn.slice('\ntools:'.length, -1)).toBe(TH._tools.toString().replace(/\n +/g, '\n'));
  });

  it('uses only its argument, and says only plain words', () => {
    const own = new Function('return (' + TH._tools.toString() + ');')();
    expect(typeof own).toBe('function');
    expect(TH._tools.toString()).not.toMatch(/\b(?:window|document|localStorage|globalThis)\b/);
    const words = Object.entries(TH.DEFAULT_LABELS).filter(([k]) => /^tools_|^about_records$|^more_saves$/.test(k)).map(([, v]) => v).join('\n');
    expect(words).not.toMatch(/\b(?:checks?|tests?|probes?|quiz(?:zes)?|assessments?|scores?|secure|certified|guaranteed)\b/i);
    expect(words).not.toMatch(/colour|centre|licence|practis/i);
  });
});

describe('the button and the panel', () => {
  // 2026-11-12, deliberately (dev-tools/check_packets_a11y.cjs): "Aa" was the first thing in <main>, before the screen
  // heading the file moves the focus to, so Tab never reached it (only Shift+Tab). Each screen now puts the bar and the
  // panel right after its heading, before the activity.
  it('one "Aa" button right after the screen heading, before the activity, opens a labelled panel of pressed-state buttons; Esc closes it', () => {
    const t = open(FILES.practice);
    const aa = t.q('[data-tools-open]');
    const heading = t.q('#app > h2');
    expect(heading.nextElementSibling.className).toBe('lt-bar');
    expect(heading.nextElementSibling.firstElementChild).toBe(aa);
    expect(heading.nextElementSibling.nextElementSibling.id).toBe('lt-panel');
    expect(t.d.querySelectorAll('[data-tools-open]')).toHaveLength(1);
    expect(aa.textContent).toBe('Aa Reading tools');
    expect([aa.getAttribute('aria-expanded'), aa.getAttribute('aria-controls')]).toEqual(['false', 'lt-panel']);
    const panel = t.q('#lt-panel');
    expect(panel.hidden).toBe(true);
    aa.click();
    expect([panel.hidden, aa.getAttribute('aria-expanded')]).toEqual([false, 'true']);
    expect(panel.tagName).toBe('SECTION');
    expect(t.d.getElementById(panel.getAttribute('aria-labelledby')).textContent).toBe('Reading tools');
    const groups = [...panel.querySelectorAll('[role=group]')];
    expect(groups.map((g) => [g.getAttribute('data-tool-group'), t.d.getElementById(g.getAttribute('aria-labelledby')).textContent, [...g.querySelectorAll('button')].map((b) => b.textContent + '=' + b.getAttribute('aria-pressed'))])).toEqual([
      ['size', 'Text size', ['Normal=true', 'Larger=false', 'Largest=false']],
      // 2026-11-12 (look pass), deliberately: four more colors a student may choose (Dark whatever the device says, Ocean,
      // Sunny, Forest), in the same one group, each with a dot of its color.
      ['colors', 'Colors', ['Usual=true', 'High contrast=false', 'Soft=false', 'Dark=false', 'Ocean=false', 'Sunny=false', 'Forest=false']],
      ['spacing', 'Spacing', ['Normal=true', 'Wider=false']],
      ['focus', 'Reading focus', ['Off=true', 'On=false']],
      ['lens', 'Magnifier', ['Off=true', 'On=false']],
      // 2026-11-12, deliberately: "Read the choices when a question opens" (hearAllIn; tests/packets_hear_all.test.js). Off by
      // default; shown in this Find Sounds file, whose opening does not play its sound choices.
      ['choices', 'Read the choices when a question opens', ['Off=true', 'On=false']],
    ]);
    expect(groups[5].hidden).toBe(false);
    // No running text on the start screen: the reading focus is not offered.
    expect(groups[3].hidden).toBe(true);
    t.tool('size', 1);
    expect([...groups[0].querySelectorAll('button')].map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false']);
    t.key('Escape', groups[0].querySelector('button'));
    expect(panel.hidden).toBe(true);
    expect(t.d.activeElement).toBe(aa);
  });

  it('each setting is an attribute on <html>; the colors swap the shell\'s own variables', () => {
    const t = open(FILES.practice);
    t.tool('size', 2); t.tool('colors', 1); t.tool('spacing', 1);
    expect(['data-lt-size', 'data-lt-colors', 'data-lt-spacing'].map((a) => t.html.getAttribute(a))).toEqual(['2', '1', '1']);
    t.tool('colors', 2);
    expect(t.html.getAttribute('data-lt-colors')).toBe('2');
    t.q('[data-tools-reset]').click();
    expect(['data-lt-size', 'data-lt-colors', 'data-lt-spacing'].map((a) => t.html.hasAttribute(a))).toEqual([false, false, false]);
    const css = /<style>([\s\S]*?)<\/style>/.exec(FILES.practice)[1];
    expect(css).toContain('[data-lt-size="1"]{font-size:125%}[data-lt-size="2"]{font-size:150%}[data-lt-size] body{font-size:1.125rem}');
    expect(css).toContain('[data-lt-spacing] main *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}[data-lt-spacing] main p{margin-bottom:2em!important}');
    expect(css).toMatch(/@media \(forced-colors:active\)\{\[data-tool-group=colors\]\{display:none!important\}/);
    expect(css).toMatch(/\.lt-lens\{position:fixed;[^}]*pointer-events:none/);
  });

  // 2026-11-12 (look pass): the four new colors too (3 Dark, 4 Ocean, 5 Sunny, 6 Forest), the usual light and dark ones, and the
  // pairs the new look uses: helper buttons on --soft, the tick and feedback badges (--card on --ok and --warn), text on a right
  // choice (--ok-bg). A card's own border (--line) is 1.5:1 or more in every theme but high contrast, as the usual one is (1.6).
  it('every color choice keeps text at 4.5:1 or more, and the focus ring and borders at 3:1', () => {
    const css = /<style>([\s\S]*?)<\/style>/.exec(FILES.practice)[1];
    const lum = (hex) => {
      const h = hex.replace('#', ''), full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
    const blocks = { usual: /^:root\{([^}]*)\}/m.exec(css)[1], dark: /prefers-color-scheme:dark\)\{:root\{([^}]*)\}/.exec(css)[1] };
    for (const v of ['1', '2', '3', '4', '5', '6']) blocks[v] = new RegExp('\\[data-lt-colors="' + v + '"\\]\\{([^}]*)\\}').exec(css)[1];
    for (const [v, block] of Object.entries(blocks)) {
      const c = Object.fromEntries(block.split(';').map((d) => d.split(':')).map(([k, val]) => [k.replace('--', ''), val]));
      for (const [fg, bg] of [['ink', 'card'], ['ink', 'bg'], ['muted', 'card'], ['muted', 'bg'], ['accent-ink', 'accent'], ['ok', 'ok-bg'], ['warn', 'warn-bg'], ['ok', 'card'],
        ['ink', 'soft'], ['ink', 'ok-bg'], ['card', 'ok'], ['card', 'warn']]) expect(ratio(c[fg], c[bg]), v + ' ' + fg + '/' + bg).toBeGreaterThanOrEqual(4.5);
      for (const [fg, bg] of [['focus', 'bg'], ['focus', 'card'], ['focus', 'soft'], ['accent', 'card'], ['accent', 'soft'], ['line', 'card']]) expect(ratio(c[fg], c[bg]), v + ' ' + fg + '/' + bg).toBeGreaterThanOrEqual(v !== '1' && fg === 'line' ? 1.5 : 3);
    }
  });
});

describe('the settings are kept in the file\'s one storage item', () => {
  it('chosen on the start screen, kept before Start, then inside the saved state; a reopened file has them; Reset forgets them', () => {
    const t = open(FILES.practice);
    const keyName = manifestOf(FILES.practice).stores[0].key;
    expect(t.dump()).toEqual({});
    t.tool('size', 1); t.tool('lens', 1);
    expect(t.dump()).toEqual({ [keyName]: { tools: { size: 1, lens: 1 } } });
    t.d.getElementById('learner-name').value = 'Ana';
    t.button('Start').click();
    const kept = t.dump();
    expect(Object.keys(kept)).toEqual([keyName]);
    expect(kept[keyName].tools).toEqual({ size: 1, lens: 1 });
    expect(kept[keyName].items).toHaveLength(2);
    const again = open(FILES.practice, { storage: { [keyName]: JSON.stringify(kept[keyName]) } });
    expect(again.html.getAttribute('data-lt-size')).toBe('1');
    expect(again.q('[data-tool="lens-1"]').getAttribute('aria-pressed')).toBe('true');
    expect(again.q('[data-lens]').hidden).toBe(false);
    again.q('[data-tools-reset]').click();
    expect(again.html.hasAttribute('data-lt-size')).toBe(false);
    expect(again.q('[data-lens]').hidden).toBe(true);
    // Reset on the start screen: the place reached stays, the settings go.
    expect(again.dump()[keyName]).not.toHaveProperty('tools');
    expect(again.dump()[keyName].items).toHaveLength(2);
  });

  it('values that are not settings are ignored; a file with no settings stores nothing new', () => {
    const keyName = manifestOf(FILES.practice).stores[0].key;
    const t = open(FILES.practice, { storage: { [keyName]: JSON.stringify({ tools: { size: 9, colors: '2', spacing: -1, focus: 'x', lens: {} } }) } });
    expect([t.html.getAttribute('data-lt-size'), t.html.getAttribute('data-lt-colors'), t.html.getAttribute('data-lt-spacing')]).toEqual([null, '2', null]);
    const plain = open(FILES.practice);
    plain.d.getElementById('learner-name').value = 'Ana';
    plain.button('Start').click();
    expect(Object.values(plain.dump())[0]).not.toHaveProperty('tools');
  });
});

describe('what was used is recorded', () => {
  const AC = (() => {
    const analytics = read('student_analytics_module.js');
    const cut = (source, start, end) => { const a = source.indexOf(start), b = source.indexOf(end, a + start.length); if (a < 0 || b < 0) throw Error('not found: ' + start); return source.slice(a, b); };
    return new Function(cut(analytics, '  function _acTrimStudentData(data) {', '  function _acRestoreImportedStudents(raw) {') + cut(analytics, '  function _acWsSoundMastered(entry) {', '  async function _acCanonicalStudentName(')
      + '\nreturn {readFile: _acThReadFile};')();
  })();

  it('a practice item counts each tool that was on while it was shown, once; the readers read the rows and the check value holds', async () => {
    const t = open(FILES.practice);
    t.tool('size', 1);
    t.d.getElementById('learner-name').value = 'Ana';
    t.button('Start').click();
    // Turned on and off again on the same item: still once.
    t.tool('lens', 1); t.tool('lens', 0); t.tool('lens', 1); t.tool('lens', 0);
    t.key('1', t.d.body);
    t.button('Next').click();
    t.tool('colors', 1); t.tool('spacing', 1);
    t.key('3', t.d.body);
    // On after the item is answered: not counted.
    t.tool('size', 2);
    t.button('See my results').click();
    const file = t.json();
    expect(file.items.map((it) => it.supports)).toEqual([{ textLarger: 1, magnifier: 1 }, { textLarger: 1, contrastHigh: 1, spacingWide: 1 }]);
    expect(TH.parseResult(file).integrity).toBe('ok');
    const text = t.csv();
    const rows = parseCsv(text.slice(1));
    const at = rows[0].indexOf('supports');
    expect([rows[1][at], rows[2][at]]).toEqual(['textLarger:1;magnifier:1', 'textLarger:1;contrastHigh:1;spacingWide:1']);
    for (const [body, name] of [[text, 'results.csv'], [JSON.stringify(file), 'results.json']]) {
      const got = await reader.read(body, { name, lastModified: Date.UTC(2026, 10, 12) });
      expect(got.ok, name).toBe(true);
      const s = got.sessions[0];
      expect([s.integrity, s.items.map((it) => it.supports)], name).toEqual(['ok', ['textLarger:1;magnifier:1', 'textLarger:1;contrastHigh:1;spacingWide:1']]);
      const imported = await AC.readFile(new File([body], name, { type: 'text/plain', lastModified: Date.UTC(2026, 10, 12) }));
      expect([imported.reason, imported.sessions.length, imported.sessions[0].integrity], name).toEqual(['', 1, 'ok']);
    }
  });

  it('a check lists the tools used on its scored items in the "#score" row (tools_used) and on the teacher\'s screen; the integrity value is made as before', async () => {
    const t = open(FILES.check);
    t.d.getElementById('learner-name').value = 'Ana';
    t.button('Next').click();
    if (t.q('[data-check-begin]') == null) throw new Error('no Start screen');
    t.q('[data-check-begin]').click();
    t.tool('size', 2); t.tool('colors', 2);
    const answers = [15, 7, 24, 5];
    answers.forEach((n, i) => {
      if (i === 2) t.tool('lens', 1);
      t.tick(1500);
      String(n).split('').forEach((ch) => t.q('[data-key="' + ch + '"]').click());
      t.q('[data-key="next"]').click();
    });
    const file = t.json();
    expect(file.score.tools).toEqual(['textLargest', 'contrastSoft', 'magnifier']);
    expect(file.items.map((it) => Object.keys(it.supports).join(';'))).toEqual(['textLargest;contrastSoft', 'textLargest;contrastSoft', 'textLargest;contrastSoft;magnifier', 'textLargest;contrastSoft;magnifier']);
    const text = t.csv();
    const rows = parseCsv(text.slice(1));
    const score = rows.find((r) => r[0] === '#score');
    expect(score[score.length - 1]).toBe('tools_used=textLargest;contrastSoft;magnifier');
    expect(score.slice(-2, -1)[0]).toMatch(/^flags=/);
    // The value covers the id line and the item rows only, the same as before the tools existed.
    expect(TH.resultsCsv(file).basis).toBe([file.packet.id, file.packet.version, file.packet.form, file.sessionId].join('|') + '\n' + text.slice(1).split('\r\n').slice(1, 5).join('\n'));
    expect(TH.parseResult(file).integrity).toBe('ok');
    for (const [body, name] of [[text, 'check.csv'], [JSON.stringify(file), 'check.json']]) {
      const got = await reader.read(body, { name, lastModified: Date.UTC(2026, 10, 12) });
      expect([got.ok, got.sessions[0].integrity], name).toEqual([true, 'ok']);
      const imported = await AC.readFile(new File([body], name, { type: 'text/plain', lastModified: Date.UTC(2026, 10, 12) }));
      expect([imported.reason, imported.sessions[0].integrity], name).toEqual(['', 'ok']);
    }
    t.q('[data-teacher-open]').click();
    expect(t.q('[data-review]').textContent).toContain('Reading tools used: Text size: Largest; Colors: Soft; Magnifier.');
  });

  // 2026-11-12 (look pass): the colors a student may choose are kept, recorded and named like the others.
  it('Dark, Ocean, Sunny and Forest are kept in the storage item, counted in the supports and named on a check\'s teacher screen', () => {
    const keyName = manifestOf(FILES.practice).stores[0].key;
    const t = open(FILES.practice);
    t.tool('colors', 4);
    expect([t.html.getAttribute('data-lt-colors'), t.dump()[keyName].tools]).toEqual(['4', { colors: 4 }]);
    t.d.getElementById('learner-name').value = 'Ana';
    t.button('Start').click();
    t.key('1', t.d.body);
    t.button('Next').click();
    t.tool('colors', 3);
    t.key('3', t.d.body);
    t.button('See my results').click();
    expect(t.json().items.map((it) => it.supports)).toEqual([{ colorsOcean: 1 }, { colorsOcean: 1, colorsDark: 1 }]);
    const again = open(FILES.practice, { storage: { [keyName]: JSON.stringify({ tools: { colors: 6 } }) } });
    expect([again.html.getAttribute('data-lt-colors'), again.q('[data-tool="colors-6"]').getAttribute('aria-pressed')]).toEqual(['6', 'true']);
    expect(open(FILES.practice, { storage: { [keyName]: JSON.stringify({ tools: { colors: 7 } }) } }).html.hasAttribute('data-lt-colors')).toBe(false);
    const c = open(FILES.check);
    c.d.getElementById('learner-name').value = 'Ana';
    c.button('Next').click();
    c.q('[data-check-begin]').click();
    c.tool('colors', 5);
    [15, 7, 24, 5].forEach((n) => { c.tick(1500); String(n).split('').forEach((ch) => c.q('[data-key="' + ch + '"]').click()); c.q('[data-key="next"]').click(); });
    expect(c.json().score.tools).toEqual(['colorsSunny']);
    c.q('[data-teacher-open]').click();
    expect(c.q('[data-review]').textContent).toContain('Reading tools used: Colors: Sunny.');
  });
});

describe('the reading focus', () => {
  it('is offered only where an item has running text, marks it, and counts there only', () => {
    const made = readingLesson();
    expect(made.lesson.blocks.map((b) => b.activity)).toEqual(['read_sentence', 'read_passage', 'isolation']);
    const t = open(FILES.reading);
    const group = t.q('[data-tool-group=focus]');
    t.d.getElementById('learner-name').value = 'Ana';
    t.button('Start').click();
    expect(group.hidden).toBe(false);
    t.tool('focus', 1);
    const text = t.q('#app [data-read]');
    expect(text.tagName).toBe('P');
    expect([text.classList.contains('lt-read'), text.getAttribute('tabindex'), !!text.querySelector('.lt-shade[aria-hidden=true]'), !!text.querySelector('.lt-line[aria-hidden=true]')]).toEqual([true, '0', true, true]);
    // The arrow keys on the text move the band; the shell's own keys still work.
    t.key('ArrowDown', text);
    t.q('#app button[aria-label="Choose cat"]').click();
    t.button('Next').click();
    const story = t.q('#app [data-read]');
    expect([story.getAttribute('role'), story.classList.contains('lt-read')]).toEqual(['group', true]);
    t.q('#app button[aria-label="Choose cat"]').click();
    t.button('Next').click();
    // An item with no running text: the option goes, and nothing is counted for it.
    expect(t.q('#app [data-read]')).toBeNull();
    expect(group.hidden).toBe(true);
    t.key('3', t.d.body);
    t.button('See my results').click();
    expect(t.json().items.map((it) => it.supports.readingFocus || 0)).toEqual([1, 1, 0]);
    t.tool('focus', 0);
    expect(t.d.querySelector('.lt-shade')).toBeNull();
  });

  it('the shell finds running text by data-read, which the three reading adapters set', () => {
    for (const id of ['read_sentence', 'read_passage', 'sentence_match']) expect(TH.ADAPTERS[id].render.toString(), id).toContain("'data-read': ''");
    for (const id of Object.keys(TH.ADAPTERS).filter((a) => !['read_sentence', 'read_passage', 'sentence_match'].includes(a))) expect(TH.ADAPTERS[id].render.toString(), id).not.toContain('data-read');
  });
});

describe('the magnifier', () => {
  it('a copy of the page in a lens: hidden from screen readers, inert, no ids, names or tab stops, refreshed when the item changes; Esc closes it', async () => {
    const t = open(FILES.practice);
    t.tool('lens', 1);
    await settle();
    const lens = t.q('[data-lens]');
    expect(lens.parentNode).toBe(t.d.body);
    expect([lens.getAttribute('aria-hidden'), lens.hidden]).toEqual(['true', false]);
    let copy = lens.firstElementChild;
    expect([copy.tagName, copy.hasAttribute('inert')]).toEqual(['MAIN', true]);
    expect(copy.querySelectorAll('[id],[name]')).toHaveLength(0);
    expect([...copy.querySelectorAll('button,input')].every((b) => b.getAttribute('tabindex') === '-1')).toBe(true);
    expect(copy.querySelector('.lt-grip')).toBeNull();
    expect(copy.textContent).toContain('Your code name or first name');
    expect(copy.style.transform).toMatch(/^translate\(-?\d+(\.\d+)?px, ?-?\d+(\.\d+)?px\) scale\(2\)$/);
    const grip = t.q('[data-lens-grip]');
    expect([grip.hidden, grip.getAttribute('aria-label'), t.d.getElementById(grip.getAttribute('aria-describedby')).textContent]).toEqual([false, 'Move the magnifier', TH.DEFAULT_LABELS.tools_lens_hint]);
    // Typing and moving to the first item: the copy follows.
    t.d.getElementById('learner-name').value = 'Ana';
    t.button('Start').click();
    await settle();
    copy = lens.firstElementChild;
    expect(copy.textContent).toContain('1 of 2');
    // The arrow keys move it while its handle has the focus.
    grip.focus();
    await settle();
    const before = lens.style.left;
    t.key('ArrowRight', grip);
    await settle();
    expect(parseFloat(lens.style.left)).toBe(parseFloat(before) + 20);
    t.key('Escape', grip);
    expect([lens.hidden, grip.hidden, t.q('[data-tool="lens-0"]').getAttribute('aria-pressed')]).toEqual([true, true, 'true']);
    expect(t.d.activeElement).toBe(t.q('[data-tools-open]'));
    expect(lens.childNodes).toHaveLength(0);
  });
});

describe('the engine fixes of 2026-11-12', () => {
  it('"hidden" wins over every display rule: a placed tile (li.row) and a hidden reading-focus option disappear', () => {
    const css = /<style>([\s\S]*?)<\/style>/.exec(FILES.practice)[1];
    expect(css).toContain('[hidden]{display:none!important}');
    const t = open(FILES.practice);
    const li = t.d.createElement('li');
    li.className = 'row';
    t.q('#app').appendChild(li);
    expect(t.w.getComputedStyle(li).display).toBe('flex');
    li.hidden = true;
    expect(t.w.getComputedStyle(li).display).toBe('none');
    expect(t.w.getComputedStyle(t.q('[data-tool-group=focus]')).display).toBe('none');
  });

  it('the finish screen: the spreadsheet file is the one main button; the JSON and the copy are under "Other ways to save"', () => {
    for (const html of [FILES.practice, FILES.check]) {
      const t = open(html);
      t.d.getElementById('learner-name').value = 'Ana';
      if (html === FILES.practice) { t.button('Start').click(); t.key('1', t.d.body); t.button('Next').click(); t.key('3', t.d.body); t.button('See my results').click(); }
      else {
        t.button('Next').click(); t.q('[data-check-begin]').click();
        [15, 7, 24, 5].forEach((n) => { t.tick(1500); String(n).split('').forEach((ch) => t.q('[data-key="' + ch + '"]').click()); t.q('[data-key="next"]').click(); });
      }
      const primary = [...t.d.querySelectorAll('#app button.primary')].filter((b) => !b.closest('[hidden]'));
      expect(primary.map((b) => b.textContent)).toEqual(['Save results as a spreadsheet file (CSV)']);
      const more = t.q('[data-more-saves]');
      expect([more.tagName, more.open, more.querySelector('summary').textContent]).toEqual(['DETAILS', false, 'Other ways to save']);
      expect([...more.querySelectorAll('button')].map((b) => b.textContent)).toEqual(['Save my work as a file', 'Copy for a spreadsheet']);
      expect(more.previousElementSibling.contains(t.q('[data-save-csv]'))).toBe(true);
    }
  });

  it('"About this file" says what the results record; a check says what more it records', () => {
    const practice = open(FILES.practice);
    const items = (t) => [...t.q('[data-about]').querySelectorAll('li')].map((li) => li.textContent);
    const p = items(practice);
    expect(p).toContain(TH.DEFAULT_LABELS.about_records);
    expect(p[p.indexOf(TH.DEFAULT_LABELS.about_records) - 1]).toMatch(/^When you finish, it can save two files/);
    const check = open(FILES.check);
    const c = items(check);
    expect(c[c.indexOf(TH.DEFAULT_LABELS.about_records) + 1]).toBe(TH.CHECK_LABELS.check_about_records);
    expect(TH.DEFAULT_LABELS.about_records).toMatch(/name or code name, each answer, the number of tries, the time on each item, how often each help was used \(the reading tools too\), the start and finish times with this device's time zone, and a random session number/);
    expect(TH.CHECK_LABELS.check_about_records).toMatch(/seconds away from the page, the try number, and whether the page was left for more than 3 seconds, reloaded, or the device clock was set back/);
    expect(manifestOf(FILES.practice).stores[0].holds).toContain('how often each help and reading tool was used');
    expect(manifestOf(FILES.check).stores[0].holds.length).toBeLessThanOrEqual(300);
  });

  it('the four copies of the loader are the same file', () => {
    const loader = read('word_sounds_take_home_loader.js');
    for (const copy of ['desktop/web-app/public', 'desktop/app-build', 'desktop/web-app/build']) {
      const file = copy + '/word_sounds_take_home_loader.js';
      if (copy === 'desktop/web-app/public' || existsSync(file)) expect(read(file) === loader, file).toBe(true);
    }
  });
});

// 2026-11-12 (look pass): the refreshed look of every file (C:/tmp/packets_build_1111/look/NOTES.md). Right and wrong are
// said in words and with a mark, never by color alone; nothing moves (tests/packet_check_mode.test.js: the files are calm).
describe('the look', () => {
  it('a tick on the right choice and a badge on the feedback line; a quiet progress bar; no movement anywhere', () => {
    const t = open(FILES.practice);
    t.d.getElementById('learner-name').value = 'Ana';
    t.button('Start').click();
    const fb = t.q('#app [data-feedback]');
    expect([fb.getAttribute('role'), fb.className, fb.textContent]).toEqual(['status', 'status', '']);
    const bar = t.q('#app .progress');
    expect([bar.getAttribute('aria-hidden'), bar.firstElementChild.style.width]).toEqual(['true', '50%']);
    t.key('2', t.d.body);
    expect([fb.className, fb.hasAttribute('data-missed'), fb.textContent]).toEqual(['status warn', false, TH.DEFAULT_LABELS.try_again]);
    t.key('3', t.d.body);
    expect([fb.className, fb.hasAttribute('data-missed')]).toEqual(['status warn', true]);
    expect([...t.d.querySelectorAll('#app li.choice')].map((li) => li.className)).toEqual(['choice right', 'choice tried', 'choice tried', 'choice']);
    t.button('Next').click();
    expect(t.q('#app .progress span').style.width).toBe('100%');
    t.key('3', t.d.body);
    expect(t.q('#app [data-feedback]').className).toBe('status ok');
    const css = /<style>([\s\S]*?)<\/style>/.exec(FILES.practice)[1];
    expect(css).toContain('.choice.right::after{content:"\\2713";content:"\\2713"/""');
    expect(css).toContain('[data-feedback].ok:not(:empty)::before{content:"\\2713";content:"\\2713"/""');
    expect(css).toContain('[data-feedback].warn:not(:empty)::before{content:"\\21bb";content:"\\21bb"/""');
    expect(css).toMatch(/@media \(forced-colors:active\)\{[^\n]*\.choice\.right::after,\.progress span\{forced-color-adjust:none;background:Highlight;color:HighlightText\}/);
    // 2026-11-13 (Aaron): the right-answer tick pops in, only without reduced motion; nothing else moves.
    for (const html of Object.values(FILES)) { const css = /<style>([\s\S]*?)<\/style>/.exec(html)[1]; expect(css).toContain("@media (prefers-reduced-motion:no-preference){.choice.right::after{animation:lt-pop .25s ease-out}}@keyframes lt-pop{from{transform:scale(.3);opacity:0}to{transform:none;opacity:1}}"); expect(css.replace("@media (prefers-reduced-motion:no-preference){.choice.right::after{animation:lt-pop .25s ease-out}}@keyframes lt-pop{from{transform:scale(.3);opacity:0}to{transform:none;opacity:1}}", '')).not.toMatch(/@keyframes|animation:(?!none)|transition:(?!none)/); }
  });

  it('the end screen: a star for finishing, the student\'s own results, and each activity\'s when there are several', () => {
    const one = open(FILES.practice);
    one.d.getElementById('learner-name').value = 'Ana';
    one.button('Start').click();
    one.key('1', one.d.body); one.button('Next').click(); one.key('3', one.d.body); one.button('See my results').click();
    // Drawn by two style rules (clip-path), so the file names no address and carries no image.
    const star = one.q('#app .hero .done-star');
    expect([star.tagName, star.getAttribute('aria-hidden'), star.textContent]).toEqual(['SPAN', 'true', '']);
    expect(one.q('#app .hero p.letters').textContent).toBe('Right on the first try: 2 of 2.');
    expect(one.q('#app .tally')).toBeNull();
    const t = open(FILES.reading);
    t.d.getElementById('learner-name').value = 'Ana';
    t.button('Start').click();
    for (let n = 0; n < 40 && !t.button('See my results'); n++) {
      if (t.button('Next')) { t.button('Next').click(); continue; }
      t.key('1', t.d.body); t.key('2', t.d.body);
    }
    t.button('See my results').click();
    const rows = [...t.q('#app .tally').children].map((li) => li.firstElementChild.textContent + ' | ' + li.lastElementChild.textContent);
    expect(rows).toHaveLength(3);
    for (const row of rows) expect(row).toMatch(/^.+ \| Right on the first try: \d of \d\.$/);
  });
});
