// Quick fixes from the 2026-11-16 walk of the Packets pages in a real browser.
// Each test names the bug it pins; the browser reproductions are in C:\tmp\overnight_1116\deepdive\ux\.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { sliceBetween } from './helpers/anchored_slice.js';

const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf8');

describe('Try it: the saved-place block reaches the file before its player starts', () => {
  // The player reads the block ONCE while it starts. After the script it found nothing: the preview said
  // "This browser cannot keep your work" on every screen and never reported its place, so the teacher bar
  // stayed on question 1 and "Remove question" removed question 1 whatever was showing.
  const source = read('packets-try.js');
  const body = sliceBetween(source, '  function withSnapshot(html, items) {', '\n  }\n', { file: 'packets-try.js' });
  // eslint-disable-next-line no-new-func
  const withSnapshot = new Function('STORE_KIND', body + '\n  }\n  return withSnapshot;')('alloflow-packet-store');
  const FILE = '<!doctype html><html><head><meta charset="utf-8"><title>T</title></head><body><main></main><script type="application/json" id="packet-manifest">{}</script><script>var player = 1;</script></body></html>';

  it('puts the block in the head, ahead of every script of the file', () => {
    const out = withSnapshot(FILE, { 'k': 'v' });
    const block = out.indexOf('id="packet-store-snapshot"');
    expect(block).toBeGreaterThan(-1);
    expect(block).toBeLessThan(out.indexOf('</head>'));
    expect(block).toBeLessThan(out.indexOf('var player = 1;'));
    expect(block).toBeLessThan(out.indexOf('id="packet-manifest"'));
    expect(JSON.parse(/id="packet-store-snapshot">([\s\S]*?)<\/script>/.exec(out)[1])).toEqual({ kind: 'alloflow-packet-store', items: { k: 'v' } });
  });

  it('replaces an earlier block instead of adding a second, and cannot be closed early by the data', () => {
    const once = withSnapshot(FILE, { a: '1' });
    const twice = withSnapshot(once, { a: '</script><script>alert(1)</script>' });
    expect(twice.split('id="packet-store-snapshot"').length - 1).toBe(1);
    expect(twice.split('<script').length).toBe(FILE.split('<script').length + 1);
    expect(twice).not.toContain('alert(1)</script><script type');
  });

  it('is done the same way as on the Open page', () => {
    expect(read('packets-open.js')).toContain("var at = html.search(/<\\/head\\s*>/i);");
    expect(source).toContain("var at = clean.search(/<\\/head\\s*>/i);");
    expect(source).not.toContain("lastIndexOf('</body>')");
  });
});

describe('Vocabulary maker: a typed name is not turned into another word', () => {
  // "Maria" is in the word list's table of irregular forms as a form of "mare", and the file asked students what
  // Maria means with the answer "A female horse".
  const require = createRequire(import.meta.url);
  const V = require('../packet_vocab_builder.js');
  const holder = {};
  // eslint-disable-next-line no-new-func
  new Function('window', 'module', read('packets_vocab_bank_en.js'))(holder, undefined);
  const bank = holder.AlloVocabBank;
  bank.shards.forEach((shard, i) => bank.add(JSON.parse(read(shard.url)), i + 1));
  const rows = (words) => V.draftRows({ words, bank });
  const row = (word) => rows([word])[0];

  it('the word list really does read maria as mare (the reason for the rule)', () => {
    expect(bank.head('maria')).toBe('mare');
    expect(bank.senses('Maria')[0].def).toMatch(/female horse/i);
  });

  it('keeps a capital word the list knows only as an irregular form as a name, with no meaning from the list', () => {
    for (const [word, readAs] of [['Maria', 'mare'], ['Drew', 'draw'], ['Mice', 'mouse']]) {
      const r = row(word);
      expect(r.word).toBe(word);
      expect(r.inBank).toBe(false);
      expect(r.senses).toEqual([]);
      expect(r.def || '').toBe('');
      expect(r.own).toBe(true);
      expect(r.asName).toBe(readAs);
    }
  });

  it('still finds the same words typed without a capital, and regular forms typed with one', () => {
    expect(row('mice')).toMatchObject({ inBank: true, base: 'mouse' });
    expect(row('mice').asName).toBeUndefined();
    expect(row('drew')).toMatchObject({ inBank: true, base: 'draw' });
    expect(row('Cats')).toMatchObject({ inBank: true, base: 'cat' });
    expect(row('Habitats')).toMatchObject({ inBank: true, base: 'habitat' });
    expect(row('Stories')).toMatchObject({ inBank: true, base: 'story' });
    expect(row('Habitat')).toMatchObject({ inBank: true, base: '' });
    expect(row('Habitat').asName).toBeUndefined();
  });

  it('a meaning the teacher types for the name is used', () => {
    const r = V.draftRows({ words: ['Maria'], bank, edits: { words: { maria: { def: 'A girl in our class story' } } } })[0];
    expect(r.def).toBe('A girl in our class story');
    expect(r.inBank).toBe(false);
  });

  it('step 1 names the word a meaning was found under, and says a name was not looked up', () => {
    const page = read('packets-vocab.js');
    expect(page).toContain("row.base ? 'Found as a form of ' + row.base + ': ' : 'Found: '");
    expect(page).toContain("row.asName ? 'Taken as a name, so no meaning was looked up. '");
  });
});

describe('Present: the Word Sounds maker hands over the title the teacher typed', () => {
  const source = read('packets-present-export.js');
  const body = sliceBetween(source, '  function readWordSoundsMakerSaved() {', '\n  }\n', { file: 'packets-present-export.js' });
  // eslint-disable-next-line no-new-func
  const reader = (saved) => new Function('root', body + '\n  }\n  return readWordSoundsMakerSaved();')({ localStorage: { getItem: (key) => (key === 'alloflow-packets-maker/1' ? JSON.stringify(saved) : null) } });

  it('uses the saved title, and the stand-in only when there is none', () => {
    expect(reader({ v: 1, title: '  Room 12 short a words ', words: ['Cat', 'sun'] })).toEqual({ title: 'Room 12 short a words', words: [{ word: 'cat' }, { word: 'sun' }] });
    expect(reader({ v: 1, title: '', words: ['cat'] }).title).toBe('Word Sounds packet words');
    expect(reader({ v: 1, title: 7, words: ['cat'] }).title).toBe('Word Sounds packet words');
    expect(reader({ v: 1, title: 'x'.repeat(200), words: ['cat'] }).title).toHaveLength(80);
  });

  it('both makers open Present in a new tab, so the maker stays where it was', () => {
    for (const file of ['packets-make.html', 'packets-vocab.html']) {
      const link = /<a [^>]*id="open-present-export"[^>]*>[\s\S]*?<\/a>/.exec(read(file))[0];
      expect(link, file).toContain('target="_blank"');
      expect(link, file).toContain('rel="noopener"');
      expect(link, file).toContain('(opens in a new tab)');
    }
  });
});
