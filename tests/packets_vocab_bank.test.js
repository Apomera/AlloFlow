import { describe, expect, it } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

// The offline definition bank for the vocabulary activities of AlloFlow Packets (packets_vocab_bank_en.js +
// packets_vocab/en-<n>.json), built by dev-tools/build_packets_vocab_bank.cjs from data/vendor/vocab/ and the
// corrections in data/packets_vocab_curation_en.json. Runtime shape: C:\tmp\packets_build_1111\vocab\BANK_LAYOUT.md.
const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const build = require('../dev-tools/build_packets_vocab_bank.cjs');
const bank = require('../packets_vocab_bank_en.js');
bank.shards.forEach((s, i) => bank.add(JSON.parse(read(s.url)), i + 1));

const POS = { n: 'noun', v: 'verb', a: 'adjective', r: 'adverb' };
const words = bank.words();
const all = words.flatMap((w) => bank.senses(w));
const curation = JSON.parse(read('data/packets_vocab_curation_en.json'));

// the word itself or an obvious form of it (cats, hoping, accurate in "accurately")
function namesWord(text, word) {
  return (String(text).toLowerCase().match(/[a-z]+/g) || []).some((t) => t === word
    || (word.length >= 4 && t.startsWith(word) && t.length - word.length <= 3)
    || (t.length >= 5 && word.startsWith(t) && word.length - t.length <= 3)
    || (/e$/.test(word) && t === word.slice(0, -1) + 'ing')
    || (/y$/.test(word) && t === word.slice(0, -1) + 'ies'));
}

describe('Packets vocabulary bank', () => {
  it('loads every shard, and only through load(): the same files whatever words are wanted', async () => {
    const fresh = require('../packets_vocab_bank_en.js'); // the same object; load() resolves at once once added
    expect(fresh.ready()).toBe(true);
    // a second copy of the index, fed by a recording fetch
    const code = read('packets_vocab_bank_en.js');
    const fetched = [];
    const root = { fetch: (url) => { fetched.push(url); return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(read(url.replace(/^.*?packets_vocab\//, 'packets_vocab/')))) }); } };
    new Function('window', 'module', code)(root, undefined);
    const api = root.AlloVocabBank;
    expect(api.has('habitat')).toBe(false); // nothing before load()
    await api.load();
    await api.load(); // once
    expect(fetched.sort()).toEqual(bank.shards.map((s) => s.url).sort());
    expect(api.senses('habitat').length).toBeGreaterThan(0);
    expect(api.bytes).toBe(bank.shards.reduce((a, s) => a + s.bytes, 0));
    for (const s of bank.shards) {
      expect(statSync(s.url).size).toBe(s.bytes);
      expect(s.bytes).toBeLessThan(1024 * 1024);
    }
  });

  it('gives every sense the agreed shape', () => {
    expect(words.length).toBeGreaterThan(5000);
    for (const w of words) {
      const list = bank.senses(w);
      expect(list.length).toBeGreaterThan(0);
      list.forEach((s, i) => {
        const [iw, ip, n] = s.id.split('|');
        expect(iw).toBe(w);
        expect(s.word).toBe(w);
        expect(n).toMatch(/^[a-z]?\d+$/);
        expect(s.pos).toBe(POS[ip]);
        expect(typeof s.def).toBe('string');
        expect(s.def.length).toBeGreaterThan(3);
        expect(typeof s.example).toBe('string');
        expect(['simple', 'wiktionary', 'wordnet']).toContain(s.source);
        expect(typeof s.edited).toBe('boolean');
        expect(['good', 'fixed', '']).toContain(s.checked);
        expect(s.common).toBe(i + 1);
        expect(Array.isArray(s.distractors)).toBe(true);
        expect(Array.isArray(s.blanks)).toBe(true);
        expect(bank.sense(s.id)).toBe(s);
      });
    }
  });

  it('never names the word (or an obvious form of it) in its own definition', () => {
    const bad = all.filter((s) => namesWord(s.def, s.word)).map((s) => s.id + ': ' + s.def);
    expect(bad).toEqual([]);
  });

  it('puts the word in its example sentence, once', () => {
    const bad = all.filter((s) => s.example && !(s.example.toLowerCase().match(/[a-z]+/g) || []).some((t) => build.formsOf(s.word).has(t))).map((s) => s.id + ': ' + s.example);
    expect(bad).toEqual([]);
  });

  it('holds no unsafe words, and no sensitive words in examples or wrong answers', () => {
    const hard = all.filter((s) => build.HARD.test(s.def) || build.HARD.test(s.example) || build.HARD.test(s.word)).map((s) => s.id);
    expect(hard).toEqual([]);
    // an example the checking pass wrote or kept on purpose may use a school word on the "care" list (disease,
    // hormone, religions); the automatic choice never does
    const softExample = all.filter((s) => !s.checked && s.example && build.SOFT.test(s.example)).map((s) => s.id + ': ' + s.example);
    expect(softExample).toEqual([]);
    const softWrong = all.flatMap((s) => s.distractors.filter((id) => build.SOFT.test(bank.sense(id).def)).map((id) => s.id + ' -> ' + id));
    expect(softWrong).toEqual([]);
  });

  it('never mixes "___"-style wrong answers with plain ones, so the style is no clue', () => {
    const blank = (t) => /___/.test(t);
    const bad = all.filter((s) => s.distractors.slice(0, 3).some((id) => blank(bank.sense(id).def) !== blank(s.def))).map((s) => s.id);
    expect(bad).toEqual([]);
    // and further down the list too (a player may draw from any of them)
    expect(all.filter((s) => s.distractors.some((id) => blank(bank.sense(id).def) !== blank(s.def))).map((s) => s.id)).toEqual([]);
    // a side clause that names the word is cut, not blanked: "An open field or grassy area; meadows are ..."
    expect(build.cleanDef('meadow', 'n', 'An open field or grassy area; meadows are often found near rivers.')).toEqual({ text: 'An open field or grassy area', style: 'phrase' });
  });

  it('keeps reproduction, body-function and slang meanings out of wrong answers (young readers)', () => {
    for (const t of ["A cell in the female's body that can become a baby when it is joined by a male cell", 'A person, animal, or plant that can have babies or produce eggs',
      'A ___ person, animal, or plant is one that can produce children or offspring', 'To give birth to', 'Slang term for a woman', 'Stingless male bee whose sole function is to mate with the queen'])
      expect(build.SOFT.test(t), t).toBe(true);
    // everyday family and animal words stay usable
    for (const t of ['A male child of someone', 'A female bird', 'A bird that farmers raise for meat and eggs', 'The day you were born']) expect(build.SOFT.test(t), t).toBe(false);
    // "informal" keeps slang-like senses out but not the everyday family words (dad, mom, daddy)
    for (const t of ['An informal term for a father', 'Informal terms for a mother']) expect(build.SOFT.test(t), t).toBe(false);
    for (const t of ['Informal terms for a woman', 'Informal terms for the mouth', 'Slang term for a father']) expect(build.SOFT.test(t), t).toBe(true);
    const wrong = new Set(all.flatMap((s) => s.distractors));
    const shown = [...wrong].filter((id) => /female's body|have babies|give birth|offspring|\bmate\b|slang/i.test(bank.sense(id).def));
    expect(shown).toEqual([]);
    for (const id of ['egg|n|2', 'female|n|1', 'male|n|1']) expect(wrong.has(id), id).toBe(false);
  });

  it('keeps at least 4 wrong answers on the senses checked for young readers (the size trim never takes them)', () => {
    const k3 = Object.entries(curation.words).filter(([, C]) => C.batch > 30).map(([w]) => w);
    expect(k3.length).toBeGreaterThan(400);
    const thin = k3.flatMap((w) => bank.senses(w).filter((s) => s.word === w && s.distractors.length < 4).map((s) => s.id));
    expect(thin).toEqual([]);
    // a word-form headword with only rare meanings was left out, so the bank finds the base word
    expect(bank.head('said')).toBe('say');
    expect(bank.head('looking')).toBe('look');
    // a past form that is also a noun gives the past-form meaning first (saw: see, not only the tool)
    for (const [w, re] of [['saw', /^Looked at/], ['felt', /^Touched/], ['rose', /^Went up/], ['left', /^Went away/]]) {
      expect(bank.senses(w)[0].def, w).toMatch(re);
      expect(bank.senses(w)[0].id, w).toBe(w + '|v|x1');
      expect(bank.senses(w).length, w).toBeGreaterThan(1);
    }
  });

  it('writes past-form meanings in the past, with wrong answers in the same form (no "Past of see:" against "To ...")', () => {
    const verbs = all.filter((s) => s.checked && s.pos === 'verb');
    const past = verbs.filter((s) => build.pastForm(s.def));
    expect(past.length).toBeGreaterThanOrEqual(16);
    for (const s of past) expect(s.distractors.length, s.id).toBeGreaterThanOrEqual(4);
    // every wrong answer of a past-form key is in the past too, and a "To ..." key gets none in the past
    expect(verbs.filter((s) => s.distractors.some((id) => build.pastForm(bank.sense(id).def) !== build.pastForm(s.def))).map((s) => s.id)).toEqual([]);
    expect(all.filter((s) => s.checked && /^(simple )?past (tense )?(form )?of\b/i.test(s.def)).map((s) => s.id)).toEqual([]);
    expect(build.pastForm('Looked at something with your eyes')).toBe(true);
    expect(build.pastForm('To jump up into the air')).toBe(false);
  });

  it('spreads wrong answers out: no one meaning is a wrong answer in more than 2% of the checked lists', () => {
    const lists = all.filter((s) => s.checked);
    expect(lists.length).toBeGreaterThan(2000);
    const n = new Map();
    for (const s of lists) for (const id of s.distractors) n.set(id, (n.get(id) || 0) + 1);
    expect([...n].filter(([, c]) => c > lists.length * 0.02).map(([id, c]) => id + ' ' + c)).toEqual([]);
  });

  it('does not reject identity words or "carbon dating" (they are only kept out of wrong answers); slurs stay rejected', () => {
    for (const t of ['A way to find the age of old things, such as carbon dating', 'A gay man', 'A woman who is a lesbian', 'Her boyfriend gave her a flower', 'farther away', 'fire retardant'])
      expect(build.safety(t), t).not.toBe('hard');
    for (const t of ['A gay man', 'carbon dating', 'a transgender person']) expect(build.safety(t), t).toBe('soft');
    for (const t of ['nigger', 'faggot', 'a retarded plan', 'effeminate']) expect(build.safety(t), t).toBe('hard');
    // a sense whose text uses an identity word is left for the owner, not checked by the AI pass
    const id = /\b(gay|gays|lesbian\w*|homosexual\w*|heterosexual\w*|bisexual\w*|transgender\w*|girlfriend\w*|boyfriend\w*|dating)\b/i;
    expect(all.filter((s) => s.checked && id.test(s.def + ' ' + s.example)).map((s) => s.id)).toEqual([]);
  });

  it('only offers wrong answers that exist, share the part of speech and are other words', () => {
    let n = 0;
    for (const s of all) {
      const seen = new Set();
      for (const id of s.distractors) {
        const d = bank.sense(id);
        expect(d, s.id + ' -> ' + id).toBeTruthy();
        expect(d.pos, s.id + ' -> ' + id).toBe(s.pos);
        expect(d.word, s.id + ' -> ' + id).not.toBe(s.word);
        expect(build.related(d.word, s.word), s.id + ' -> ' + id).toBe(false);
        expect(seen.has(d.word), s.id + ' -> ' + id + ' twice').toBe(false);
        seen.add(d.word);
        n++;
      }
    }
    expect(n).toBeGreaterThan(50000);
    // most senses have enough to make a question
    expect(all.filter((s) => s.distractors.length >= 3).length / all.length).toBeGreaterThan(0.9);
  });

  it('keeps every wrong answer away from EVERY meaning of the word, not just the one asked (bat: no "stick used to hit a ball")', () => {
    const bad = [];
    for (const w of words) {
      const mine = bank.senses(w);
      for (const s of mine) for (const id of s.distractors) {
        const d = bank.sense(id);
        if (build.containsWordForm(d.def, w)) bad.push(s.id + ' -> ' + id + ' names the word');
        for (const x of mine) {
          if (d.def.toLowerCase() === x.def.toLowerCase()) bad.push(s.id + ' -> ' + id + ' is the text of ' + x.id);
          else if (!s.checked && build.jacc(d.def, x.def) > 0.34) bad.push(s.id + ' -> ' + id + ' is close to ' + x.id);
        }
      }
    }
    expect(bad).toEqual([]);
    const batStick = bank.senses('bat').find((s) => /stick/i.test(s.def));
    if (batStick) for (const s of bank.senses('bat')) for (const id of s.distractors) expect(build.jacc(bank.sense(id).def, batStick.def)).toBeLessThanOrEqual(0.34);
  });

  it('finds words through their base form, in any case', () => {
    expect(bank.senses('cats').map((s) => s.word)).toContain('cat');
    expect(bank.senses('ran')[0].word).toBe('run');
    expect(bank.senses('Habitats')[0].word).toBe('habitat');
    expect(bank.senses('  CELL ')[0].word).toBe('cell');
    expect(bank.has('evaporated')).toBe(true);
    expect(bank.senses('qzxv')).toEqual([]);
    expect(bank.sense('no|n|1')).toBe(null);
  });

  // 2026-11-13: an irregular form whose base word was trimmed out (algae, bred) gave head() a word with no entry,
  // and senses() threw. Every form in the file now leads to a headword, or to nothing.
  it('never sends an irregular form to a word that is not in the bank', () => {
    const forms = [];
    bank.shards.forEach((s) => { const d = JSON.parse(read(s.url)); if (d.forms) d.forms.split(',').forEach((x) => forms.push(x.split(' ')[0])); });
    expect(forms.length).toBeGreaterThan(100);
    const bad = forms.filter((f) => { try { const h = bank.head(f); bank.senses(f); return h !== null && !bank.words().includes(h); } catch (_) { return true; } });
    expect(bad).toEqual([]);
    expect(bank.senses('algae')).toEqual([]);
  });

  it('applies the corrections file: school meaning first, wrong text fixed, rejects left out', () => {
    expect(bank.senses('cell')[0].def).toMatch(/living/i);
    expect(bank.senses('conductor')[0].def).toMatch(/electricity|heat/i);
    expect(bank.senses('conductor').some((s) => /orchestra/i.test(s.def))).toBe(true);
    const condense = bank.senses('condense')[0];
    expect(condense.def).toMatch(/gas into a liquid/i);
    expect(condense.checked).toBe('fixed');
    expect(condense.edited).toBe(true);
    for (const [w, C] of Object.entries(curation.words)) {
      const ids = bank.senses(w).filter((s) => s.word === w).map((s) => s.id);
      for (const [id, v] of Object.entries(C.senses)) if (v.verdict === 'reject') expect(ids, id).not.toContain(id);
    }
    // vandalism found while checking never comes back
    expect(all.filter((s) => /spank|master ?bait|blow ?job|your mom/i.test(s.def)).map((s) => s.id)).toEqual([]);
  });

  it('credits its sources and says how it was checked', () => {
    const sets = bank.credits.map((c) => c.set + ' ' + c.license).join('; ');
    expect(sets).toMatch(/Simple English Wiktionary CC BY-SA 4\.0/);
    expect(sets).toMatch(/Open English WordNet 2025 CC BY 4\.0/);
    expect(sets).toMatch(/Princeton WordNet/);
    bank.credits.forEach((c) => { expect(c.url).toMatch(/^https:\/\//); expect(c.deed).toMatch(/^https:\/\//); expect(c.author).toBeTruthy(); });
    expect(bank.checking).toMatch(/AI assistance/);
    expect(bank.checking).toMatch(/Not reviewed by a person/);
    const readme = read('data/vendor/vocab/README.md');
    expect(readme).toMatch(/checked and corrected with AI assistance on 2026-11-12/i);
  });

  it('is rebuilt byte for byte from its inputs (--check)', () => {
    const r = spawnSync(process.execPath, ['dev-tools/build_packets_vocab_bank.cjs', '--check'], { encoding: 'utf8', timeout: 300000 });
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
  }, 320000);
});
