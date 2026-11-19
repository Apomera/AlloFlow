import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';

// The questions' order in a Word Sounds file (2026-11-18, owner: "by default we should probably consider having mixed
// presentation on ... instead of doing all of the activity types in a row you can randomize them. it may also be good if
// teachers can custom edit the sequence as an advanced option").
// - The builder: opts.order 'mixed' (a seeded mix) or the teacher's own order ('activity|word' keys) gives
//   lesson.sequence, the item ids in the order shown; its revision follows the order. No order: the file is as before.
// - The player shows the questions in that order, each numbered within its activity; the directions come again when the
//   activity changes; the end screen counts each activity's questions by id.
// - The Preview page's bar follows the same order (packets_handoff.js), and "Open a file I made" reads it back.
const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const tool = require('../dev-tools/make_word_sounds_packet.cjs');
const { dictionary, core, loader, wordlist, builder } = tool.loadParts();
const BANKS = tool.loadBanks({ shards: false });
const verify = require('../packets_verify_core.js');
const reopen = require('../packets_reopen.js');
const { questionOrder, mixedOrder } = builder._internals;

const WORDS = ['cat', 'dog', 'sun', 'map', 'hat', 'pig'];
// In the builder's own order of activities, as the maker passes them (and as "Open a file I made" reads them back).
const ACTS = builder.SUPPORTED_ACTIVITIES.filter((id) => ['isolation', 'blending', 'counting'].includes(id));
const ENV = { verify, creditLine: builder.creditLine, codeName: builder.codeName, activities: builder.SUPPORTED_ACTIVITIES, wordSounds: core.activityIds(), labels: dictionary.labels, seeds: { A: 1, B: 2, C: 3 } };
const wav = (tag) => { const b = Buffer.alloc(64); b.write('RIFF', 0); b.writeUInt32LE(56, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(24000, 24); b.writeUInt32LE(48000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(20, 40); b.write(String(tag).slice(-20), 44); return 'data:audio/wav;base64,' + b.toString('base64'); };
const toWav = async (uri) => wav(String(uri || ''));
const build = (extra = {}) => builder.buildPacket({ words: WORDS, activities: ACTS, seed: 1, title: 'Order', core, dictionary, banks: BANKS, loader, wordlist, toWav, ...extra });
const blockIds = (lesson) => lesson.blocks.flatMap((b) => b.items.map((it) => String(it.id)));
const actOf = (lesson) => Object.fromEntries(lesson.blocks.flatMap((b) => b.items.map((it) => [String(it.id), b.activity])));
const keyOf = (lesson) => Object.fromEntries(lesson.blocks.flatMap((b) => b.items.map((it) => [String(it.id), b.activity + '|' + it.word])));

const opened = [];
afterEach(() => { while (opened.length) { try { opened.pop().close(); } catch (_) {} } });

// The file in jsdom, at question `index` (a saved place, as the file keeps it), or at the end screen.
function openAt(html, index, { firstTry = [] } = {}) {
  const lesson = JSON.parse(/var lesson=(.*);\nvar labels=/.exec(html)[1]);
  // The order the player uses: the sequence when it names each question once, else one activity at a time.
  const usual = blockIds(lesson);
  const whole = Array.isArray(lesson.sequence) && lesson.sequence.length === usual.length && [...lesson.sequence].map(String).sort().join() === [...usual].sort().join();
  const order = whole ? lesson.sequence.map(String) : usual;
  const acts = actOf(lesson);
  const saved = { name: 'Ana', index, startedAt: '2026-11-18T10:00:00.000Z', finishedAt: null, savedFile: null, sent: null,
    items: order.map((id, i) => ({ itemId: id, activity: acts[id], responses: [], attempts: i < index ? 1 : 0, firstTry: firstTry.includes(id), correct: i < index, done: i < index, supports: {} })) };
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/order.html', beforeParse(w) {
    w.Audio = class { play() { const me = this; setTimeout(() => { if (me.onended) me.onended(); }, 2); return Promise.resolve(); } pause() {} };
    w.localStorage.setItem('alloflow-take-home:' + lesson.lessonId + ':' + lesson.revision, JSON.stringify(saved));
  } });
  opened.push(dom.window);
  return { d: dom.window.document, lesson, w: dom.window };
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// The student's name again (the box does not fill itself in), then "Continue where I left off" (or Start, at question 1).
async function heading(page) {
  const name = page.d.getElementById('learner-name');
  if (name) name.value = 'Ana';
  const go = page.d.querySelector('[data-continue]') || [...page.d.querySelectorAll('#app button')].find((b) => b.textContent === 'Start');
  if (go) go.click();
  for (let i = 0; i < 100; i++) {
    const h = [...page.d.querySelectorAll('#app h2')].map((node) => node.textContent).find((text) => /: \d+ of \d+$|^You finished/.test(text));
    if (h) return h;
    await wait(10);
  }
  return [...page.d.querySelectorAll('#app h2')].map((node) => node.textContent).join(' | ');
}

describe('the order of the questions (builder)', () => {
  it('a mix: every question once, each activity in its own order, never three in a row of one while another has some', async () => {
    const plain = await build();
    const mixed = await build({ order: 'mixed' });
    const usual = blockIds(plain.lesson), seq = mixed.lesson.sequence;
    expect(plain.lesson.sequence).toBeUndefined();
    expect([...seq].sort()).toEqual([...usual].sort());
    expect(seq).not.toEqual(usual);
    const acts = actOf(mixed.lesson);
    for (const act of ACTS) expect(seq.filter((id) => acts[id] === act)).toEqual(usual.filter((id) => acts[id] === act));
    for (let i = 2; i < seq.length; i++) {
      const run = acts[seq[i]] === acts[seq[i - 1]] && acts[seq[i]] === acts[seq[i - 2]];
      if (run) expect(seq.slice(i + 1).every((id) => acts[id] === acts[seq[i]]), 'a run of three at ' + i).toBe(true);
    }
    // The same choices give the same mix; the file's id is the same, its revision is not (a saved place is per order).
    const again = await build({ order: 'mixed' });
    expect(again.lesson.sequence).toEqual(seq);
    expect(again.html).toBe(mixed.html);
    expect(mixed.lesson.lessonId).toBe(plain.lesson.lessonId);
    expect(mixed.lesson.revision).toMatch(new RegExp('^' + plain.lesson.revision + 'm[0-9a-f]{8}$'));
    expect(mixed.manifest.packet.version).toBe(mixed.lesson.revision);
    // "Mix again": another order seed, another mix, recorded for "Open a file I made".
    const other = await build({ order: 'mixed', orderSeed: 101 });
    expect(other.lesson.sequence).not.toEqual(seq);
    const embedded = (html) => JSON.parse(/<script type="application\/json" id="packet-manifest">([\s\S]*?)<\/script>/.exec(html)[1]);
    expect([embedded(mixed.html).builder.order, embedded(mixed.html).builder.orderSeed]).toEqual(['mixed', undefined]);
    expect([embedded(other.html).builder.order, embedded(other.html).builder.orderSeed]).toEqual(['mixed', 101]);
    expect(embedded(plain.html).builder.order).toBeUndefined();
    // The checker finds nothing unexpected in a mixed file.
    const v = verify.verifyPacket(mixed.html);
    expect([v.ok, v.counts.notExpected, v.counts.look]).toEqual([true, 0, 0]);
  });

  it('no order, or an order that is the usual one, leaves the file exactly as before; one activity is never mixed', async () => {
    const plain = await build();
    expect((await build({ order: undefined })).html).toBe(plain.html);
    expect((await build({ order: 'blocks' })).html).toBe(plain.html);
    const keys = keyOf(plain.lesson);
    expect((await build({ order: blockIds(plain.lesson).map((id) => keys[id]) })).html).toBe(plain.html);
    const one = await build({ activities: ['isolation'] });
    expect((await build({ activities: ['isolation'], order: 'mixed' })).html).toBe(one.html);
  });

  it('the teacher\'s own order: by activity and word, a word it does not name goes after the others, case does not matter', async () => {
    const plain = await build();
    const keys = keyOf(plain.lesson), byKey = Object.fromEntries(Object.entries(keys).map(([id, k]) => [k, id]));
    const own = ['counting|pig', 'isolation|CAT', 'blending|dog', 'nothing|zzz', 'counting|pig'];
    const made = await build({ order: own });
    const seq = made.lesson.sequence;
    expect(seq.slice(0, 3)).toEqual([byKey['counting|pig'], byKey['isolation|cat'], byKey['blending|dog']]);
    expect(seq.slice(3)).toEqual(blockIds(plain.lesson).filter((id) => !seq.slice(0, 3).includes(id)));
    expect(JSON.parse(/<script type="application\/json" id="packet-manifest">([\s\S]*?)<\/script>/.exec(made.html)[1]).builder.order).toBe('own');
  });

  it('questionOrder and mixedOrder alone: a check is never put in another order', () => {
    const lesson = { blocks: [{ activity: 'a', items: [{ id: 'a-0', word: 'x' }, { id: 'a-1', word: 'y' }] }, { activity: 'b', items: [{ id: 'b-0', word: 'x' }] }] };
    expect(questionOrder(Object.assign({ mode: 'probe' }, lesson), 'mixed', 1)).toBeNull();
    expect(questionOrder(lesson, 'mixed', 1)).not.toBeNull();
    expect(mixedOrder(lesson.blocks, 7).sort()).toEqual(['a-0', 'a-1', 'b-0']);
  });
});

describe('the order of the questions (the student\'s file)', () => {
  it('shows the questions in the file\'s order, each numbered within its activity', async () => {
    const mixed = await build({ order: 'mixed' });
    const seq = mixed.lesson.sequence, acts = actOf(mixed.lesson);
    const titles = mixed.lesson.activityTitles;
    const totals = Object.fromEntries(mixed.lesson.blocks.map((b) => [b.activity, b.items.length]));
    const seen = {};
    for (const [i, id] of seq.entries()) {
      seen[acts[id]] = (seen[acts[id]] || 0) + 1;
      if (i > 6) continue;
      const page = openAt(mixed.html, i);
      expect(await heading(page), 'question ' + (i + 1)).toBe(titles[acts[id]] + ': ' + seen[acts[id]] + ' of ' + totals[acts[id]]);
    }
  });

  it('the end screen counts each activity\'s first tries by question, not by place', async () => {
    const mixed = await build({ order: 'mixed' });
    const acts = actOf(mixed.lesson);
    // First try on every counting question and on the first isolation question only.
    const iso = mixed.lesson.blocks.find((b) => b.activity === 'isolation').items.map((it) => String(it.id));
    const cnt = mixed.lesson.blocks.find((b) => b.activity === 'counting').items.map((it) => String(it.id));
    const page = openAt(mixed.html, mixed.lesson.sequence.length, { firstTry: [iso[0], ...cnt] });
    expect(await heading(page)).toBe('You finished!');
    const tally = Object.fromEntries([...page.d.querySelectorAll('.tally li')].map((li) => [li.querySelector('b').textContent, li.querySelector('span').textContent]));
    const titles = mixed.lesson.activityTitles;
    expect(tally[titles.isolation]).toBe('1 of ' + iso.length);
    expect(tally[titles.counting]).toBe(cnt.length + ' of ' + cnt.length);
    expect(tally[titles.blending]).toMatch(/^0 of \d+$/);
    expect(Object.keys(acts).length).toBe(mixed.lesson.sequence.length);
  });

  it('with "directions once", a mixed file says the directions again when the activity changes, not on a repeat', async () => {
    const mixed = await build({ order: 'mixed', directionsOnce: true });
    const seq = mixed.lesson.sequence, acts = actOf(mixed.lesson);
    const items = Object.fromEntries(mixed.lesson.blocks.flatMap((b) => b.items.map((it) => [String(it.id), it])));
    const count = {}, nth = seq.map((id) => (count[acts[id]] = (count[acts[id]] || 0) + 1));
    // A switch back to an activity seen before (its 2nd question or later), and a 2nd question in a row of one activity.
    const back = seq.findIndex((id, i) => i > 0 && nth[i] > 1 && acts[seq[i - 1]] !== acts[id]);
    const same = seq.findIndex((id, i) => i > 0 && nth[i] > 1 && acts[seq[i - 1]] === acts[id]);
    expect(back).toBeGreaterThan(0);
    expect(same).toBeGreaterThan(0);
    const played = async (index) => {
      const page = openAt(mixed.html, index);
      const srcs = [];
      const Audio = page.w.Audio;
      page.w.Audio = class extends Audio { play() { srcs.push(this.src); return super.play(); } };
      await heading(page);
      await wait(400);
      const ids = Object.keys(page.lesson.audio || {});
      return srcs.map((src) => ids.find((k) => page.lesson.audio[k] === src) || src);
    };
    const directions = (id) => items[id].instruction || items[id].promptAudio;
    expect(directions(seq[back])).toBeTruthy();
    expect(await played(back), 'question ' + (back + 1) + ' after another activity').toContain(directions(seq[back]));
    expect(await played(same), 'question ' + (same + 1) + ' after one of its own').not.toContain(directions(seq[same]));
  });

  it('a sequence that does not name every question once is not used: the file shows one activity at a time', async () => {
    const mixed = await build({ order: 'mixed' });
    const broken = mixed.html.replace(/"sequence":\[[^\]]*\]/, (m) => m.replace(/,"[^"]+"\]$/, ']'));
    expect(broken).not.toBe(mixed.html);
    const page = openAt(broken, 1);
    const first = mixed.lesson.blocks[0];
    expect(await heading(page)).toBe(mixed.lesson.activityTitles[first.activity] + ': 2 of ' + first.items.length);
  });
});

describe('the order of the questions (Preview bar and Open a file I made)', () => {
  it('the Preview bar names the question the file shows, in the file\'s order', async () => {
    const mixed = await build({ order: 'mixed' });
    const ctx = { TextEncoder, TextDecoder, BroadcastChannel: class { constructor() { this.onmessage = null; } postMessage() {} close() {} } };
    ctx.window = ctx;
    new Function('window', read('packets_handoff.js')).call(ctx, ctx);
    // lessonInfo is inside hostPreview: its first bar is sent on hello; read it through a channel that answers.
    const sent = [];
    class Bus { constructor() { this.onmessage = null; Bus.all.push(this); } postMessage(m) { sent.push(m); } close() {} }
    Bus.all = [];
    const session = ctx.AlloPacketHandoff.hostPreview({ url: 'blob:https://packets.test/o', html: mixed.html, Channel: Bus });
    Bus.all[0].onmessage({ data: { type: 'preview-hello', id: 'blob:https://packets.test/o' } });
    const bar = sent.filter((m) => m.type === 'preview-bar').pop();
    const firstId = mixed.lesson.sequence[0], acts = actOf(mixed.lesson);
    const word = mixed.lesson.blocks.flatMap((b) => b.items).find((it) => String(it.id) === firstId).word;
    expect(bar.bar.where).toBe('Question 1 of ' + mixed.lesson.sequence.length + ': ' + word);
    expect(acts[firstId]).toBeTruthy();
    session.stop();
  });

  it('Open a file I made reads the order back, and the remade file is the same file', async () => {
    const plain = await build();
    expect(reopen.read(plain.html, ENV).order).toBe('blocks');
    const mixed = await build({ order: 'mixed', orderSeed: 55 });
    const r = reopen.read(mixed.html, ENV);
    expect([r.order, r.orderSeed]).toEqual(['mixed', 55]);
    const remade = await build({ words: r.words, activities: r.activities, title: r.title, order: r.order, orderSeed: r.orderSeed });
    expect(remade.lesson.sequence).toEqual(mixed.lesson.sequence);
    const own = await build({ order: ['counting|pig', 'isolation|cat'] });
    const back = reopen.read(own.html, ENV);
    expect(back.order.slice(0, 2)).toEqual(['counting|pig', 'isolation|cat']);
    const remadeOwn = await build({ words: back.words, activities: back.activities, title: back.title, order: back.order });
    expect(remadeOwn.lesson.sequence).toEqual(own.lesson.sequence);
  });
});
