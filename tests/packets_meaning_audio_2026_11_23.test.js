// Meaning recordings made ahead of time (2026-11-23): dev-tools/build_packets_meaning_audio.cjs. The parts that need no
// voice: the text the voice is given, the key a recording is found by (the vocabulary maker computes the same key in the
// browser), the file it is in, the bank's meanings and ranked wrong answers, the pilot, and the store's save.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const M = require('../dev-tools/build_packets_meaning_audio.cjs');
const ROOT = path.resolve(__dirname, '..');

describe('the text the voice is given', () => {
  it('says a blank as "blank" with a pause each side, and ends every meaning as a sentence', () => {
    expect(M.spokenText('If something is ___, it is on fire')).toBe('If something is... blank... it is on fire.');
    expect(M.spokenText('To ___ something is to fix it')).toBe('To... blank... something is to fix it.');
    expect(M.spokenText('Something that is ___.')).toBe('Something that is... blank.');
    expect(M.spokenText('___ means to run fast')).toBe('Blank... means to run fast.');
    expect(M.spokenText('the space between  two sets of seats')).toBe('The space between two sets of seats.');
    expect(M.spokenText('Is it a bird?')).toBe('Is it a bird?');
  });
});

describe('the key and the file of a recording', () => {
  it('is sha256 of the shown text with spaces squeezed, and does not depend on extra spaces', () => {
    const text = 'The space between two sets of seats';
    const want = createHash('sha256').update('alloflow-meaning|' + text, 'utf8').digest('hex').slice(0, 16);
    expect(M.keyOf(text)).toBe(want);
    expect(M.keyOf('  The space  between two sets of seats ')).toBe(want);
    expect(M.keyOf(text + '.')).not.toBe(want);
  });
  it('puts every key in one of 8,192 files named m-0000 to m-1fff', () => {
    expect(M.BUCKETS).toBe(8192);
    expect(M.bucketOf('0000aaaaaaaaaaaa')).toBe('m-0000');
    expect(M.bucketOf('1fffaaaaaaaaaaaa')).toBe('m-1fff');
    expect(M.bucketOf('2000aaaaaaaaaaaa')).toBe('m-0000');
    expect(M.bucketOf('ffffaaaaaaaaaaaa')).toBe('m-1fff');
  });
});

describe('the bank as the maker loads it', () => {
  const collected = M.collectMeanings();
  it('has every meaning of the core and extended files, one entry per text', () => {
    let senses = 0;
    const texts = new Set();
    for (const dir of ['packets_vocab', 'packets_vocab_ext']) {
      for (const n of readdirSync(path.join(ROOT, dir)).filter((x) => /\.json$/.test(x) && (dir !== 'packets_vocab' || /^en-\d+\.json$/.test(x)))) {
        for (const [, ss] of JSON.parse(readFileSync(path.join(ROOT, dir, n), 'utf8')).words) for (const r of ss) { senses++; texts.add(M.shownText(r[1])); }
      }
    }
    texts.delete('');
    expect(collected.meanings.length).toBe(texts.size);
    expect(collected.meanings.reduce((n, m) => n + m.senses.length, 0)).toBeLessThanOrEqual(senses);
    expect(new Set(collected.meanings.map((m) => m.key)).size).toBe(collected.meanings.length);
  });
  it('reads the ranked wrong answers as positions in the core files, as packets_vocab_bank_en.js does', () => {
    const flat = [];
    for (const n of ['en-1.json', 'en-2.json']) for (const [w, ss] of JSON.parse(readFileSync(path.join(ROOT, 'packets_vocab', n), 'utf8')).words) for (const r of ss) flat.push({ id: w + '|' + r[0].charAt(0) + '|' + r[0].slice(1), r });
    expect(collected.core.length).toBe(flat.length);
    const i = flat.findIndex((x) => x.id === 'habitat|n|1');
    expect(i).toBeGreaterThanOrEqual(0);
    const want = flat[i].r[5].split(' ').map((p) => flat[parseInt(p, 36)].id);
    expect(collected.core[i].wrong.map((p) => collected.core[p].sense.id)).toEqual(want);
  });
  it('makes a pilot of whole questions: a checked word, its meaning and its 3 wrong answers, some with a blank', () => {
    const p = M.pilotOf(collected, 200);
    expect(p.meanings.length).toBeLessThanOrEqual(200);
    expect(p.meanings.length).toBeGreaterThan(150);
    const have = new Set(p.meanings.map((m) => m.text));
    for (const q of p.questions) { expect(have.has(q.right)).toBe(true); expect(q.wrong).toHaveLength(3); for (const w of q.wrong) expect(have.has(w.text)).toBe(true); }
    expect(p.questions.filter((q) => /_{2,}/.test(q.right)).length).toBeGreaterThan(5);
  });
});

describe('the store', () => {
  it('saves clips in their files, rebuilds the index from them, and reopens with every key', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'meaning-store-'));
    try {
      const s = M.openStore(dir);
      const texts = ['A small animal', 'To run fast', 'If something is ___, it is on fire'];
      for (const t of texts) s.add(M.keyOf(t), { text: t, spoken: M.spokenText(t), seconds: 1, audio: M.URI_PREFIX + 'AAAA' });
      expect(s.count()).toBe(3);
      s.flush({ voice: 'af_heart' });
      const index = JSON.parse(readFileSync(path.join(dir, 'index.json'), 'utf8'));
      expect(index.format).toBe(M.STORE_FORMAT);
      expect(index.counts.meanings).toBe(3);
      for (const t of texts) {
        const file = path.join(dir, M.bucketOf(M.keyOf(t)) + '.json');
        expect(existsSync(file)).toBe(true);
        const shard = JSON.parse(readFileSync(file, 'utf8'));
        expect(shard.format).toBe(M.SHARD_FORMAT);
        expect(shard.clips[M.keyOf(t)].text).toBe(t);
      }
      const again = M.openStore(dir);
      for (const t of texts) expect(again.has(M.keyOf(t))).toBe(true);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
  it('refuses a store inside the repository: the recordings are not kept in git', () => {
    expect(() => M.parseArgs(['--out', path.join(ROOT, 'packets_meaning_audio')])).toThrow(/outside the repository/);
    expect(() => M.parseArgs(['--out', path.join(tmpdir(), 'x')])).not.toThrow();
  });
  it('is copied into the site by build_packets_site.cjs --meaning-audio, index and files, and nothing else', () => {
    const S = require('../dev-tools/build_packets_site.cjs');
    const dir = mkdtempSync(path.join(tmpdir(), 'meaning-src-')), out = mkdtempSync(path.join(tmpdir(), 'meaning-out-'));
    try {
      const s = M.openStore(dir);
      for (const t of ['A small animal', 'To run fast']) s.add(M.keyOf(t), { text: t, spoken: M.spokenText(t), seconds: 1, audio: M.URI_PREFIX + 'AAAA' });
      s.flush({});
      require('node:fs').writeFileSync(path.join(dir, '.lock'), '1');
      const entries = [];
      S.copyMeaningAudio(dir, out, entries, () => {});
      const copied = readdirSync(path.join(out, S.MEANING_DIR)).sort();
      expect(copied).toEqual([...new Set(['A small animal', 'To run fast'].map((t) => M.bucketOf(M.keyOf(t)) + '.json'))].concat('index.json').sort());
      expect(entries.map((e) => e.path).every((p) => p.startsWith(S.MEANING_DIR + '/'))).toBe(true);
      require('node:fs').writeFileSync(path.join(dir, 'index.json'), JSON.stringify({ format: 'something-else' }));
      expect(() => S.copyMeaningAudio(dir, out, [], () => {})).toThrow(/not a meaning recording index/);
    } finally { rmSync(dir, { recursive: true, force: true }); rmSync(out, { recursive: true, force: true }); }
  });
  it('escapes the meaning text in the listening page', () => {
    const html = M.listenPage([{ word: 'a<b', right: 'x & <y>', wrong: [] }], new Map(), 'meta');
    expect(html).toContain('a&lt;b');
    expect(html).toContain('x &amp; &lt;y&gt;');
    expect(html).not.toContain('<y>');
  });
});
