#!/usr/bin/env node
'use strict';

// Makes the FILTERED source extracts in data/vendor/vocab/ that dev-tools/build_packets_vocab_bank.cjs reads.
// Run once by a person who has the downloads (each source.json says from where); the build itself needs no
// network and no raw dump. Only the entries for the words the bank could hold are kept.
//
//   node dev-tools/prepare_packets_vocab_vendor.cjs \
//     --simple  <simple-extract.jsonl.gz>        kaikki.org Simple English Wiktionary extract
//     --wiktionary <file>                         kaikki.org English extract (.jsonl.gz), or the compact
//                                                 en_wikt_filtered.jsonl the 2026-11-12 trial made from it
//     --wordnet <english-wordnet-2025.xml.gz>     Open English WordNet 2025 (WN-LMF XML)
//     --nawl    <NAWL_12_with_en_definitions.csv> New Academic Word List 1.2
//     --units   <unit_words.json>                 the hand-made K-8 unit list (science, social, ela)
//
// Writes data/vendor/vocab/{simple_wiktionary_en.json, wiktionary_en.json, wordnet_en.json, wordlists_en.json}.
// The word list and familiarity numbers come from word_sounds_wordlist_en.js (CYP-LEX Zipf, CC BY 4.0).
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'data/vendor/vocab');
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const need = (k) => { const v = arg(k); if (!v) throw new Error('missing ' + k); return v; };
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const readMaybeGz = (f) => { const b = fs.readFileSync(f); return (f.endsWith('.gz') ? zlib.gunzipSync(b) : b).toString('utf8'); };
const CONTENT = new Set(['noun', 'verb', 'adj', 'adv']);
const WORD = /^[a-z][a-z'-]*$/;
const SKIP_TAGS = /vulgar|offensive|derogat|slur|ethnic|swear|profan|disparag|sexual|euphemis|taboo|obscen|pejorat|slang|informal|obsolete|archaic|rare|dated|dialect|Internet|colloquial|nonstandard|humorous|Britain|British|UK|Scotland|Australia|misspelling|abbreviation|initialism|acronym/i;

function main() {
  const files = { simple: need('--simple'), wiktionary: need('--wiktionary'), wordnet: need('--wordnet'), nawl: need('--nawl'), units: need('--units') };
  // ---- word lists ----
  const ws = require(path.join(ROOT, 'word_sounds_wordlist_en.js'));
  const rows = ws.rows();
  const builtin = rows.filter((r) => r.hasClip && !r.blocked && !r.soft).map((r) => r.word);
  const common = rows.filter((r) => r.rank > 0 && !r.blocked && !r.soft && /^[a-z]+$/.test(r.word)).sort((a, b) => a.rank - b.rank || (a.word < b.word ? -1 : 1)).slice(0, 10000).map((r) => r.word);
  const units = JSON.parse(fs.readFileSync(files.units, 'utf8'));
  const PW = { n: 'noun', v: 'verb', adj: 'adj', adv: 'adv' };
  const unit = {};
  for (const k of ['science', 'social', 'ela']) unit[k] = units[k].map(([w, p]) => [w, PW[p] || p]);
  const nawl = [];
  for (const l of fs.readFileSync(files.nawl, 'utf8').split(/\r?\n/).slice(1)) {
    const cols = l.match(/("([^"]|"")*"|[^,]*)(,|$)/g); if (!cols) continue;
    const w = cols[0].replace(/,$/, '').replace(/^﻿/, '').trim().toLowerCase(); const p = (cols[2] || '').replace(/,$/, '').trim();
    if (!w || !/^[a-z-]+$/.test(w)) continue;
    nawl.push([w, PW[p] || p || '']);
  }
  const blocked = new Set(rows.filter((r) => r.blocked || r.soft).map((r) => r.word));
  const want = new Set([...builtin, ...common, ...nawl.map((x) => x[0]), ...Object.values(unit).flat().map((x) => x[0])]);

  // ---- Simple English Wiktionary ----
  const simpleRaw = readMaybeGz(files.simple);
  const simpleAll = {};
  for (const l of simpleRaw.split('\n')) {
    if (!l) continue; const o = JSON.parse(l); if (!o.word || !o.senses || o.lang_code !== 'en') continue;
    const e = { pos: o.pos, forms: (o.forms || []).filter((f) => f.tags).map((f) => [f.form, f.tags.join(' ')]),
      senses: o.senses.map((s) => ({ g: (s.glosses || [])[0] || '', tags: [...(s.tags || []), ...(s.raw_tags || [])], cats: s.categories || [],
        ex: (s.examples || []).map((x) => x.text).filter(Boolean), syn: (s.synonyms || []).map((x) => x.word), ant: (s.antonyms || []).map((x) => x.word), form_of: (s.form_of || []).map((x) => x.word) })).filter((s) => s.g) };
    if (!e.senses.length) continue;
    (simpleAll[o.word] || (simpleAll[o.word] = [])).push(e);
  }
  // inflected list words: add their base word (from form_of) to the wanted set
  const addBases = (src, isCompact) => {
    for (const w of [...want]) for (const e of src[w] || []) for (const s of e.senses) for (const b of s.form_of || []) if (WORD.test(b)) want.add(b);
  };
  addBases(simpleAll);

  // ---- English Wiktionary (compact lines, or raw kaikki lines) ----
  const enAll = {};
  for (const l of readMaybeGz(files.wiktionary).split('\n')) {
    if (!l) continue; let o; try { o = JSON.parse(l); } catch (e) { continue; }
    let c = o;
    if (o.lang_code !== undefined) { // raw kaikki line -> the same compact shape the trial used
      if (o.lang_code !== 'en') continue;
      c = { word: o.word, pos: o.pos,
        forms: (o.forms || []).filter((f) => f.tags && !f.tags.includes('obsolete') && !f.tags.includes('alternative')).map((f) => [f.form, f.tags.join(' ')]).slice(0, 12),
        senses: (o.senses || []).map((s) => ({ g: s.glosses || s.raw_glosses || [], tags: s.tags || [], raw_tags: s.raw_tags || [], form_of: (s.form_of || []).map((f) => f.word), alt_of: (s.alt_of || []).map((f) => f.word),
          cats: (s.categories || []).map((x) => typeof x === 'string' ? x : x.name).filter((n) => /vulgar|offensive|derogat|slur|sex|drug|slang|ethnic|swear|profan|disparag/i.test(n)).slice(0, 6),
          ex: (s.examples || []).map((x) => ({ t: x.text, ref: x.ref ? 1 : 0 })).slice(0, 8), syn: (s.synonyms || []).map((x) => x.word).slice(0, 10) })) };
    }
    if (!c.word || !(want.has(c.word))) continue;
    (enAll[c.word] || (enAll[c.word] = [])).push(c);
  }
  for (const w of [...want]) for (const e of enAll[w] || []) for (const s of e.senses) for (const b of s.form_of || []) if (WORD.test(b)) want.add(b);

  // ---- keep only what the bank can use ----
  const simpleOut = {};
  for (const w of [...want].sort()) {
    const es = simpleAll[w]; if (!es) continue;
    const kept = es.filter((e) => CONTENT.has(e.pos) || e.senses.some((s) => s.form_of.length));
    // categories are kept only when they carry a label the build acts on (subject, register, offensive)
    for (const e of kept) for (const s of e.senses) { s.cats = s.cats.filter((c) => SKIP_TAGS.test(c) || /biology|chemistry|physics|science|geography|mathematic|geometry|music|grammar|linguistic|politic|economic|history|medicine|anatomy|astronomy|geology|sport|computing/i.test(c)); for (const k of ['cats', 'ex', 'syn', 'ant', 'form_of', 'tags']) if (!s[k].length) delete s[k]; }
    for (const e of kept) if (!e.forms.length) delete e.forms;
    if (kept.length) simpleOut[w] = kept;
  }
  const enOut = {};
  for (const w of [...want].sort()) {
    const es = enAll[w]; if (!es) continue;
    const kept = [];
    for (const e of es) {
      if (!CONTENT.has(e.pos)) continue;
      // Senses labelled slang/old/rare/offensive and alternative spellings are dropped here; a form-of sense
      // keeps only its base word. At most 6 senses per entry and 2 usage examples (not quotations) per sense.
      const senses = [];
      for (const s of e.senses) {
        if (senses.length >= 6) break;
        const tags = [...(s.tags || []), ...(s.raw_tags || [])].join(' ') + ' ' + (s.cats || []).join(' ');
        if ((s.form_of || []).length) { senses.push({ form_of: s.form_of }); continue; }
        if ((s.alt_of || []).length || SKIP_TAGS.test(tags)) continue;
        const g = (s.g || [])[(s.g || []).length - 1] || ''; if (!g) continue;
        senses.push({ g, ex: (s.ex || []).filter((x) => !x.ref && x.t && x.type !== 'quotation').map((x) => x.t).slice(0, 2) });
      }
      if (senses.length) kept.push({ pos: e.pos, forms: e.forms || [], senses });
    }
    if (kept.length) enOut[w] = kept;
  }

  // ---- Open English WordNet ----
  const xml = readMaybeGz(files.wordnet);
  const dec = (s) => s.replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const posMap = { n: 'n', v: 'v', a: 'a', s: 'a', r: 'r' };
  const lemmas = {}, senseSyn = {}, senseRel = [];
  for (const m of xml.matchAll(/<LexicalEntry id="[^"]*">([\s\S]*?)<\/LexicalEntry>/g)) {
    const body = m[1];
    const lm = body.match(/<Lemma writtenForm="([^"]*)" partOfSpeech="([a-z])"/); if (!lm) continue;
    const lemma = dec(lm[1]), pos = posMap[lm[2]];
    const L = lemmas[lemma] || (lemmas[lemma] = {});
    for (const s of body.matchAll(/<Sense id="([^"]*)"[^>]*? synset="([^"]*)"[^>]*?(\/>|>([\s\S]*?)<\/Sense>)/g)) {
      (L[pos] || (L[pos] = [])).push(s[2]); senseSyn[s[1]] = s[2];
      if (s[4]) for (const r of s[4].matchAll(/relType="(antonym|pertainym)" target="([^"]*)"/g)) senseRel.push([s[2], r[1], r[2]]);
    }
  }
  const synsets = {};
  for (const m of xml.matchAll(/<Synset id="([^"]*)"[^>]*members="([^"]*)" partOfSpeech="([a-z])" lexfile="([^"]*)"[^>]*>([\s\S]*?)<\/Synset>/g)) {
    const [, id, , p, lf, body] = m;
    const d = (body.match(/<Definition>([\s\S]*?)<\/Definition>/) || [])[1] || '';
    const S = { p: posMap[p], s: p === 's' ? 1 : 0, lf, d: dec(d), m: [], h: [], hy: [], sim: [], ant: [], dom: [], attr: [], pert: [], ex: [] };
    for (const r of body.matchAll(/relType="([a-z_]+)" target="([^"]*)"/g)) {
      const k = { hypernym: 'h', instance_hypernym: 'h', hyponym: 'hy', instance_hyponym: 'hy', similar: 'sim', domain_topic: 'dom', attribute: 'attr' }[r[1]];
      if (k) S[k].push(r[2]);
    }
    for (const e of body.matchAll(/<Example>([\s\S]*?)<\/Example>/g)) S.ex.push(dec(e[1]));
    synsets[id] = S;
  }
  for (const [lemma, L] of Object.entries(lemmas)) for (const ids of Object.values(L)) for (const id of ids) if (synsets[id]) synsets[id].m.push(lemma);
  for (const [a, rel, sid] of senseRel) { const b = senseSyn[sid]; const k = rel === 'antonym' ? 'ant' : 'pert'; if (b && synsets[a] && !synsets[a][k].includes(b)) synsets[a][k].push(b); }
  // keep: synsets of wanted lemmas, everything they point at, and all their ancestors
  const S0 = new Set();
  for (const w of want) for (const ids of Object.values(lemmas[w] || {})) for (const id of ids) if (synsets[id]) S0.add(id);
  const keep = new Set(S0);
  for (const id of S0) for (const k of ['sim', 'ant', 'dom', 'attr', 'pert']) for (const t of synsets[id][k]) if (synsets[t]) keep.add(t);
  const front = [...keep];
  while (front.length) { const id = front.pop(); for (const h of synsets[id].h) if (synsets[h] && !keep.has(h)) { keep.add(h); front.push(h); } }
  const wnSyn = {};
  for (const id of [...keep].sort()) {
    const S = synsets[id]; const own = S0.has(id);
    const f = (a) => a.filter((t) => keep.has(t));
    // hyponyms are not stored: the build rebuilds them from the hypernym links. Synsets that only carry the
    // tree (no wanted word) keep their first 3 names and no gloss or examples.
    wnSyn[id] = { p: S.p, s: S.s, lf: S.lf, d: own ? S.d : '', m: own ? S.m : S.m.slice(0, 3), h: f(S.h), sim: f(S.sim), ant: f(S.ant), dom: f(S.dom), attr: f(S.attr), pert: f(S.pert), ex: own ? S.ex.slice(0, 3) : [] };
    if (!wnSyn[id].d) delete wnSyn[id].d;
    for (const k of ['sim', 'ant', 'dom', 'attr', 'pert', 'ex']) if (!wnSyn[id][k].length) delete wnSyn[id][k];
    if (!wnSyn[id].s) delete wnSyn[id].s;
  }
  // pertainym targets are keyed by the noun they point at: so a noun's "pertained by" list can be rebuilt
  const wnLem = {};
  for (const w of [...want].sort()) if (lemmas[w]) { const L = {}; for (const [p, ids] of Object.entries(lemmas[w])) { const k = ids.filter((id) => wnSyn[id]); if (k.length) L[p] = k; } if (Object.keys(L).length) wnLem[w] = L; }
  // all lemmas of kept synsets that are wanted are in wnLem; others stay only as members (names)

  // ---- familiarity ----
  const zipf = {};
  const formsWanted = new Set(want);
  for (const src of [simpleOut, enOut]) for (const es of Object.values(src)) for (const e of es) for (const [f] of e.forms || []) if (/^[a-z]+$/.test(f)) formsWanted.add(f);
  for (const r of rows) if (formsWanted.has(r.word) && r.zipf > 0) zipf[r.word] = r.zipf;

  fs.mkdirSync(OUT, { recursive: true });
  const write = (name, obj) => { const t = JSON.stringify(obj) + '\n'; fs.writeFileSync(path.join(OUT, name), t); console.log(name, Buffer.byteLength(t), 'bytes'); return sha256(t); };
  const sums = {};
  sums.simple = write('simple_wiktionary_en.json', simpleOut);
  sums.wiktionary = write('wiktionary_en.json', enOut);
  sums.wordnet = write('wordnet_en.json', { lemmas: wnLem, synsets: wnSyn });
  sums.lists = write('wordlists_en.json', { about: 'Word lists the bank is built from. unit: hand-made K-8 unit words (word, part of speech). nawl: New Academic Word List 1.2 headwords and part of speech (Browne, Culligan & Phillips 2013, CC BY-SA 4.0). builtin: Word Sounds words that have a recording and are not blocked. common: the 10,000 most common Word Sounds words by reading-library rank. blocked: Word Sounds blocked or soft words (never headwords). zipf: CYP-LEX Zipf frequency in children\'s books (CC BY 4.0), for these words and their forms.',
    unit, nawl, builtin, common, blocked: [...blocked].sort(), zipf });
  const inputs = {};
  for (const [k, f] of Object.entries(files)) inputs[k] = { file: path.basename(f), sha256: sha256(fs.readFileSync(f)) };
  console.log(JSON.stringify({ wanted: want.size, simpleWords: Object.keys(simpleOut).length, wiktionaryWords: Object.keys(enOut).length, wnLemmas: Object.keys(wnLem).length, wnSynsets: Object.keys(wnSyn).length, inputs, outputs: sums }, null, 1));
}

main();
