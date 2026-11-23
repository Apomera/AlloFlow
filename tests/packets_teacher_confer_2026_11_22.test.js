// @vitest-environment jsdom
// Show my teacher (2026-11-22): deskside conferencing card on practice end screens,
// glanceable "To go over together" callout on code-unlocked check reviews, and the
// Classroom/Drive .zip batch tip on packets-results.html.
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { webcrypto } from 'node:crypto';
import { TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const box = {};
box.window = box;
new Function('window', read('word_sounds_take_home_loader.js')).call(box, box);
const TH = box.AlloWordSoundsTakeHome;
const MP = require('../packet_math_practice_builder.js');
const PC = require('../packet_check_builder.js');
const verify = require('../packets_verify_core.js');
const BANK = JSON.parse(read('psychometric_math_probes.json'));
const lessonOf = (html) => JSON.parse(/var lesson=(.*);\nvar labels=/.exec(html)[1]);

const opened = [];
afterEach(() => { while (opened.length) { try { opened.pop().close(); } catch (_) {} } });

function openPractice(html) {
  let clock = 1000;
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'https://packet.test/practice.html',
    beforeParse(w) {
      Object.defineProperty(w, 'performance', { configurable: true, value: { now: () => clock } });
      w.Audio = class { play() { return Promise.resolve(); } pause() {} };
    },
  });
  opened.push(dom.window);
  const w = dom.window, d = w.document;
  const q = (sel) => d.querySelector(sel);
  const seen = (node) => !!node && !node.hidden && !node.closest('[hidden]');
  const button = (text) => [...d.querySelectorAll('#app button')].filter(seen).find((b) => b.textContent === text);
  const press = (key) => q('[data-key="' + key + '"]').click();
  return {
    w, d, q, seen, button,
    tick: (ms) => { clock += ms; },
    start: (name = 'BlueHeron7') => { d.getElementById('learner-name').value = name; button('Start').click(); },
    cover: () => q('[data-cover]').click(),
    type: (digits) => { String(digits).split('').forEach(press); press('next'); },
    next: () => (button('Next') || button('See my results')).click(),
  };
}

describe('Show my teacher conferencing card on practice end screen', () => {
  it('starts collapsed, lists missed items before retries with answered/expected values, reports supports, and passes Look inside a file', () => {
    const lesson = MP.lessonFromMathPractice({ loader: TH, mode: 'ccc', factSet: 'mul-7' });
    const built = MP.buildMathPracticePacket({ lesson, loader: TH });
    const checkVerify = verify.verifyPacket(built.html);
    expect([checkVerify.ok, checkVerify.result, checkVerify.counts.look, checkVerify.counts.notExpected]).toEqual([true, 'closed', 0, 0]);
    expect(built.html).not.toContain('check_teacher');
    expect(built.html).not.toContain('Teacher code');

    const answers = lessonOf(built.html).blocks[0].items.map((it) => it.answer);
    const t = openPractice(built.html);
    t.start('MayaB');
    // Turn on Larger text via Reading tools to confirm supports-used reporting.
    t.q('[data-tools-open]').click();
    t.q('[data-tool="size-1"]').click();
    t.q('[data-tools-close-top]').click();

    answers.forEach((answer, i) => {
      t.tick(1500);
      t.cover();
      t.tick(2000);
      if (i === 1) {
        // Retry item: wrong once, study/copy, then right on retry.
        t.type(Number(answer) + 1);
        t.tick(500); t.type(answer);
        t.tick(500); t.type(answer);
      } else {
        t.type(answer);
      }
      t.next();
    });

    const confer = t.q('[data-teacher-confer]');
    expect(confer).toBeTruthy();
    expect([confer.tagName, confer.open, confer.querySelector('summary').textContent]).toEqual(['DETAILS', false, 'Show my teacher']);

    // Student screen outside <details> stays uncluttered.
    const outside = [...t.d.querySelectorAll('#app .card button')].filter((b) => !b.closest('details') && t.seen(b)).map((b) => b.textContent);
    expect(outside).toEqual(['Save my work', 'Practice again']);

    const head = confer.querySelector('[data-confer-head]').textContent;
    expect(head).toContain('MayaB');
    expect(head).toContain('Active time:');
    expect(head).toContain('Right on the first try: 9 of 10.');

    const items = [...confer.querySelectorAll('[data-confer-item]')];
    expect(items).toHaveLength(1);
    expect(items[0].getAttribute('data-confer-item')).toBe('retry');
    expect(items[0].textContent).toContain('Right on retry');
    expect(items[0].textContent).toContain('answered');
    expect(items[0].textContent).toContain('expected ' + answers[1]);

    const supports = confer.querySelector('[data-confer-supports]').textContent;
    expect(supports).toContain('Supports used:');
    expect(supports).toContain('Text size');
    expect(supports).toContain('Copied fact');
    expect(confer.textContent).toContain('Shown on this device only. Nothing is sent anywhere.');
  });

  it('shows the all-first-try message and "Supports used: none." when no items were missed and no supports were used', () => {
    const lesson = MP.lessonFromMathPractice({ loader: TH, mode: 'ccc', factSet: 'mul-7' });
    const built = MP.buildMathPracticePacket({ lesson, loader: TH });
    const answers = lessonOf(built.html).blocks[0].items.map((it) => it.answer);
    const t = openPractice(built.html);
    t.start('SamK');
    answers.forEach((answer) => {
      t.tick(1000); t.cover(); t.tick(1000); t.type(answer); t.next();
    });
    const confer = t.q('[data-teacher-confer]');
    expect(confer.querySelector('[data-confer-focus]').textContent).toBe('All questions were right on the first try.');
    expect(confer.querySelector('[data-confer-supports]').textContent).toBe('Supports used: none.');
  });

  it('orders missed items ahead of retry items when both occur', () => {
    const core = new Function(read('word_sounds_core.js') + ';return createWordSoundsCore();')();
    const wav = (tag) => { const b = Buffer.alloc(64); b.write('RIFF'); b.write('WAVE', 8); b.write(tag, 44); return b.toString('base64'); };
    const uri = (tag) => 'data:audio/wav;base64,' + wav(tag);
    const banks = {
      isolation: { '1st': uri('q1') },
      phonemes: { k: uri('k'), a: uri('a'), t: uri('t'), m: uri('m'), d: uri('d'), o: uri('o'), g: uri('g') },
      instructions: { fb_great_job: uri('gj'), fb_try_again_listen: uri('ta') },
    };
    const pack = [
      { word: 'cat', targetWord: 'cat', term: 'cat', _ttsAssets: { cat: { mime: 'audio/wav', base64: wav('cat') } },
        activityItems: { isolation: { position: 0, correctSound: 'k', options: ['k', 'a', 't', 'm'] } } },
      { word: 'dog', targetWord: 'dog', term: 'dog', _ttsAssets: { dog: { mime: 'audio/wav', base64: wav('dog') } },
        activityItems: { isolation: { position: 0, correctSound: 'd', options: ['k', 'd', 'o', 'g'] } } },
    ];
    const html = TH.buildHtml(TH.lessonFromPack(pack, { core, banks }).lesson, { core });
    const t = openPractice(html);
    t.start('Leo');
    // Item 1 (cat): wrong once (option 2), then right (option 1) -> retry
    t.tick(1000);
    t.d.dispatchEvent(new t.w.KeyboardEvent('keydown', { key: '2', bubbles: true, cancelable: true }));
    t.tick(500);
    t.d.dispatchEvent(new t.w.KeyboardEvent('keydown', { key: '1', bubbles: true, cancelable: true }));
    t.next();
    // Item 2 (dog): wrong twice (options 1 then 3) -> missed
    t.tick(1000);
    t.d.dispatchEvent(new t.w.KeyboardEvent('keydown', { key: '1', bubbles: true, cancelable: true }));
    t.tick(500);
    t.d.dispatchEvent(new t.w.KeyboardEvent('keydown', { key: '3', bubbles: true, cancelable: true }));
    t.next();

    const rows = [...t.q('[data-teacher-confer]').querySelectorAll('[data-confer-item]')];
    expect(rows.map((r) => r.getAttribute('data-confer-item'))).toEqual(['missed', 'retry']);
    expect(rows[0].textContent).toContain('dog');
    expect(rows[0].textContent).toContain('Missed');
    expect(rows[1].textContent).toContain('cat');
    expect(rows[1].textContent).toContain('Right on retry');
  });
});

describe('Check mode teacher review focus callout', () => {
  const MC = PC.lessonFromMathForm({ bank: BANK, measure: 'math_computation', grade: '3', form: 'A' });
  const raws = (lesson) => lesson.blocks[0].items;
  const scored = (lesson) => raws(lesson).filter((p) => !p.practice);
  const expected = (p) => p.answer != null ? Number(p.answer) : p.op === 'add' ? p.a + p.b : p.op === 'sub' ? p.a - p.b : p.op === 'mul' ? p.a * p.b : Math.trunc(p.a / p.b);

  function runCheck(html, { wrong = [], skip = [] } = {}) {
    let clock = 1000, wall = Date.UTC(2026, 10, 22, 14, 0, 0);
    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://packet.test/check.html',
      beforeParse(w) {
        w.Audio = class { play() { return Promise.resolve(); } pause() {} };
        Object.defineProperty(w.performance, 'now', { configurable: true, value: () => clock });
        w.Date.now = () => wall;
        Object.defineProperty(w.crypto, 'subtle', { configurable: true, value: webcrypto.subtle });
        w.TextEncoder = TextEncoder;
      },
    });
    opened.push(dom.window);
    const w = dom.window, d = w.document;
    const q = (sel) => d.querySelector(sel);
    const button = (text) => [...d.querySelectorAll('#app button')].filter((b) => !b.closest('[hidden]')).find((b) => b.textContent === text);
    const type = (val) => { String(val).split('').forEach((c) => q('[data-key="' + (c === '-' ? 'minus' : c) + '"]').click()); q('[data-key="next"]').click(); };
    d.getElementById('learner-name').value = 'Ana';
    button('Next').click();
    raws(MC).filter((p) => p.practice).forEach((p) => { clock += 300; wall += 300; type(expected(p)); q('[data-practice-next]').click(); });
    q('[data-check-begin]').click();
    scored(MC).forEach((p, i) => {
      clock += 300; wall += 300;
      if (skip.includes(i)) q('[data-skip]').click();
      else type(wrong.includes(i) ? expected(p) + 1 : expected(p));
    });
    return { w, d, q };
  }

  it('keeps unlocked check review strictly score-only with no focus box or item details', () => {
    const built = PC.buildCheckPacket({ lesson: MC, loader: TH });
    const t = runCheck(built.html, { wrong: [1], skip: [3] });
    t.q('[data-teacher-open]').click();
    expect(t.q('[data-review]').getAttribute('data-review')).toBe('score-only');
    expect(t.q('[data-confer-focus]')).toBeNull();
  });

  it('shows a glanceable "To go over together" box above the table when unlocked with the teacher code', async () => {
    const built = PC.buildCheckPacket({ lesson: MC, loader: TH, teacherCode: 'tulip-47' });
    const t = runCheck(built.html, { wrong: [1], skip: [3] });
    t.q('#teacher-code').value = 'tulip-47';
    t.q('[data-teacher-show]').click();
    for (let i = 0; i < 200 && !t.q('[data-review]'); i++) await new Promise((r) => setTimeout(r, 20));
    const boxEl = t.q('[data-review] [data-confer-focus]');
    expect(boxEl).toBeTruthy();
    expect(boxEl.textContent).toContain('To go over together (2):');
    const [, s1, , s3] = scored(MC);
    expect(boxEl.textContent).toContain(s1.a + ' ' + s1.symbol + ' ' + s1.b);
    expect(boxEl.textContent).toContain('expected ' + s1.answer);
    expect(boxEl.textContent).toContain(s3.a + ' ' + s3.symbol + ' ' + s3.b);
    expect(boxEl.textContent).toContain('skipped');
  }, 30000);
});

describe('packets-results.html Classroom/Drive .zip batch tip', () => {
  it('explains the Classroom/Drive .zip download trick while keeping connect-src none and mirrored copies synced', () => {
    const html = read('packets-results.html');
    expect(html).toContain("connect-src 'none'");
    expect(html).toContain('Google Classroom or a shared Drive folder');
    expect(html).toContain('.zip');
    for (const mirror of ['desktop/web-app/public/packets-results.html', 'desktop/app-build/packets-results.html', 'desktop/web-app/build/packets-results.html']) {
      expect(read(mirror), mirror).toBe(html);
    }
  });
});
