#!/usr/bin/env node
'use strict';

// The offline definition bank for the non-AI vocabulary activities of AlloFlow Packets.
// Reads only data/vendor/vocab/ (filtered extracts of Simple English Wiktionary, English Wiktionary and
// Open English WordNet, plus the word lists; see data/vendor/vocab/README.md) and the corrections in
// data/packets_vocab_curation_en.json, and writes
//   packets_vocab_bank_en.js        the small index the site loads (window.AlloVocabBank)
//   packets_vocab/en-<n>.json       the senses, in files of at most about 1 MB
//
//   node dev-tools/build_packets_vocab_bank.cjs            re-make both
//   node dev-tools/build_packets_vocab_bank.cjs --check    fail when either is out of date
//   node dev-tools/build_packets_vocab_bank.cjs --report   print counts, write nothing
//   node dev-tools/build_packets_vocab_bank.cjs --view <word,word,...|@file> [--out f]
//                                                          the curation view of some words (JSON)
// No network, no clock, no randomness: the same inputs make the same bytes.
//
// Method (from the 2026-11-12 feasibility trial, C:/tmp/packets_build_1111/vocab/NOTES.md, improved):
//  - Definitions: Simple English Wiktionary first (written for learners); a part of speech with no usable
//    Simple sense falls back to WordNet glosses, then English Wiktionary. Clean-up is mechanical: first
//    sentence, no brackets, the "A habitat is ..." / "If you predict something, you ..." frame removed. When
//    a frame cannot be removed cleanly the word is replaced by ___ ("blank style").
//  - Safety: every sense's text is tested (labels are not enough). HARD words reject the sense; SOFT words
//    keep it as a definition, but it is never a wrong answer and never an example sentence.
//  - Wrong answers (distractors): senses of OTHER bank words with the same part of speech: WordNet siblings,
//    cousins, opposites, same-topic words, for adjectives words of neighbouring qualities, opposite clusters,
//    relational neighbours (urban: city ~ country: rural) and same-kind qualities; then words of the same
//    broad WordNet group. None may match ANY sense of the word (owner rule: "bat" the animal never gets "a
//    stick used to hit a ball"): synonyms in any sense, the broader/narrower chain of every sense, similar
//    adjectives, listed synonyms, the word family, text naming the word, or text too close to any of its
//    senses are all removed. A wrong answer can use a less common, distinct meaning of its word.
//  - Corrections in the curation file win over everything (order, text, rejects, distractor order).
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const VENDOR = path.join(ROOT, 'data/vendor/vocab');
const CURATION = path.join(ROOT, 'data/packets_vocab_curation_en.json');
const INDEX_FILE = path.join(ROOT, 'packets_vocab_bank_en.js');
const SHARD_DIR = path.join(ROOT, 'packets_vocab');
const SHARD_URL = 'packets_vocab/en-';
const EXT_DIR = path.join(ROOT, 'packets_vocab_ext');
const EXT_URL = 'packets_vocab_ext/';
const SHARD_LIMIT = 990 * 1024;
const BANK_VERSION = 1;
const JS_PROTO_KEYS = new Set(['__proto__', 'constructor', 'prototype', 'tostring', 'valueof', 'hasownproperty']);
const MAX_HEADWORDS = 10000;
// all shards together, uncompressed. Unit, NAWL and built-in Word Sounds words are always kept; the other
// common words are added while the bank stays within this.
const SIZE_BUDGET = +(process.env.VOCAB_BUDGET || 1640 * 1024);
const N_DISTRACTORS = 10, N_DISTRACTORS_UNCHECKED = 8, N_BLANKS = 10;

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const P1 = { noun: 'n', verb: 'v', adj: 'a', adv: 'r', adjective: 'a', adverb: 'r', n: 'n', v: 'v', a: 'a', r: 'r' };
const PNAME = { n: 'noun', v: 'verb', a: 'adjective', r: 'adverb' };
const PSRC = { n: 'noun', v: 'verb', a: 'adj', r: 'adv' }; // pos names in the Wiktionary extracts
const SRC = { simple: 's', wiktionary: 'w', wordnet: 'n', alloflow: 'a' };

// ---- content safety (the trial's lists) -----------------------------------------------------------
const HARD = /\b(sex|sexy|sexual|sexually|intercourse|naked|nude|nudity|genital\w*|penis|vagina|vulva|testicle\w*|scrotum|anus|prostitut\w*|porn\w*|rape\w*|raping|rapist|masturbat\w*|orgasm\w*|erotic\w*|condom\w*|cocaine|heroin|marijuana|cannabis|meth|narcotic\w*|drunk\w*|stoned|fuck\w*|shit\w*|bitch\w*|bastard\w*|whore\w*|slut\w*|cunt\w*|dick|cock|pussy|nigg\w*|negro\w*|fag\w*|retard(?:s|ed)?|dyke\w*|suicide\w*|torture\w*|lynch\w*|brothel\w*|lust(?:s|ful|y|ed|ing)?|seduc\w*|semen|sperm|ejaculat\w*|crotch|buttock\w*|bosom|nipple\w*|bra|underwear|pimp\w*|kinky|horny|arse|ass|asses|asshole\w*|piss\w*|wank\w*|bollock\w*|damn\w*|hell|crap\w*|mom's|your mom|spank\w*|master ?bait\w*|fart(?:s|ed|ing|y)?|butt|butts|bum|bums|pee|effeminate|blow ?jobs?|hand ?jobs?|boners?|dildo\w*|hookers?|tits|titties|boob\w*|jizz|cum|twat\w*|foreskin|clitor\w*|labia|pubic|pubes|anal|wet dream|make out|making out|69|hymen\w*)\b/i;
const SOFT = /\b(gay|gays|lesbian\w*|homosexual\w*|heterosexual\w*|bisexual\w*|transgender\w*|girlfriend\w*|boyfriend\w*|dating|virgin\w*|obscen\w*|profan\w*|swear\w*|curse\w*|pregnan\w*|nazi\w*|corpse\w*|embalm\w*|burial|funeral\w*|coffin\w*|grave|graves|ovum|ova|ovary|ovaries|ovulat\w*|reproduct\w*|menstru\w*|uterus|womb|puberty|hormone\w*|kill\w*|murder\w*|die|dies|died|dying|death|deaths|dead|blood\w*|bleed\w*|gun\w*|weapon\w*|bomb\w*|war|wars|warfare|shoot\w*|stab\w*|alcohol\w*|beer|wine|liquor|cigarette\w*|tobacco|smok\w*|drug\w*|poison\w*|god|gods|religio\w*|church\w*|pray\w*|devil|satan|demon\w*|fat|stupid|idiot\w*|ugly|slave\w*|enemy|violent\w*|violence|hurt\w*|injur\w*|attack\w*|fight\w*|crime\w*|criminal\w*|prison\w*|jail\w*|steal\w*|stole\w*|thief|thieves|gamble\w*|gambling|disease\w*|vomit\w*|toilet\w*|urine|feces|faeces|poo|breast\w*|pregnan\w*|marriage|married|marry|wife|husband|lover\w*|kiss\w*|race|racial|racist\w*|births?|give birth|gives birth|gave birth|giving birth|have babies|has babies|having babies|produce (?:eggs|children|offspring|babies)|offspring|fertil\w*|fetal|fetus\w*|foetus\w*|embryo\w*|mate|mates|mating|mated|castrat\w*|female's body|male cell|egg cell|underpants|knickers|panties|minimal attire|photographer's model|excret\w*|perspir\w*|papilloma\w*|internal organs|contents of the stomach|slang|informal(?! terms? for an? (?:father|mother|grandfather|grandmother|parent)\b))\b/i;
// (2026-11-12, owner rule for K-3) the second group above keeps reproduction and body-function meanings and slang
// labels out of WRONG answers and automatic examples ("egg: a cell in the female's body...", "female: ...can have
// babies"); a word's own school meaning (egg: what a bird lays) still stands as its definition. "informal" lets the
// everyday family words through (dad: "an informal term for a father"); other informal senses stay out.
const BAD_TAGS = /vulgar|offensive|derogat|slur|ethnic|swear|profan|disparag|sexual|euphemis|taboo|obscen|pejorat/i;
const SKIP_TAGS = /slang|informal|old, no longer used|obsolete|archaic|rare|dated|dialect|Internet|colloquial|nonstandard|humorous|Britain|British|UK|Scotland|Australia/i;
const safety = (t) => (HARD.test(t) ? 'hard' : SOFT.test(t) ? 'soft' : '');
// a verb meaning written in the past (saw: "Looked at something with your eyes") only gets wrong answers written in
// the past, and a "To ..." meaning none, so the form is no clue (2026-11-12)
function pastForm(t) { const f = (String(t).match(/^[A-Za-z]+/) || [''])[0].toLowerCase(); if (!f || f === 'to') return false; const I = inputs(); const b = I.formBase.get(f); return (!!b && /\bverb:[a-z -]*past/.test(I.formTag.get(b + '|' + f) || '')) || I.pastWords.has(f); }

// ---- inputs ---------------------------------------------------------------------------------------
const FORM_OF = /\b(plural|past tense|past participle|present participle|participle|third[- ]person|simple past|comparative|superlative|gerund|-ing form|spelling|alternative|archaic|obsolete) (form |spelling )?of\b|\b(singular|plural|tense|participle|present|past|comparative|superlative|indicative|-ing)\b[\w ,-]{0,40}\b(form|tense|participle) of\b|^(a |an |the )?(form|plural|past) of\b|^(see|compare|short for|abbreviation|another (word|name|spelling|form) for|same as|alternative|misspelling)\b|→/i;
function isFormEntry(e) { return (e.senses || []).every((s) => (s.form_of || []).length || FORM_OF.test(s.g || '')); }
function readJson(f) { return JSON.parse(fs.readFileSync(f, 'utf8')); }
let IN = null;
function inputs() {
  if (IN) return IN;
  const simple = readJson(path.join(VENDOR, 'simple_wiktionary_en.json'));
  const enw = readJson(path.join(VENDOR, 'wiktionary_en.json'));
  const wn = readJson(path.join(VENDOR, 'wordnet_en.json'));
  const lists = readJson(path.join(VENDOR, 'wordlists_en.json'));
  const curation = fs.existsSync(CURATION) ? readJson(CURATION) : { words: {} };
  // The curation file also supplies the school-unit words absent from the source lists.
  const unitWords = Object.entries(curation.words || {}).filter(([, entry]) => entry.unit);
  for (const [word, entry] of unitWords) {
    if (!P1[entry.unit]) throw new Error('Unknown unit part of speech for ' + word);
  }
  for (const S of Object.values(wn.synsets)) { S.hy = []; for (const k of ['sim', 'ant', 'dom', 'attr', 'pert', 'ex', 'm']) S[k] = S[k] || []; S.d = S.d || ''; }
  for (const id of Object.keys(wn.synsets).sort()) for (const h of wn.synsets[id].h) if (wn.synsets[h]) wn.synsets[h].hy.push(id);
  const zipf = new Map(Object.entries(lists.zipf));
  const common = new Set([...lists.common, ...unitWords.map(([w]) => w)]);
  // form -> base, from the forms tables of both Wiktionaries (first lemma claim wins, Simple first;
  // skip inflected-form entries such as "happier" or "ate" so they never shadow their own lemma)
  const formBase = new Map(), formTag = new Map(), pastWords = new Set();
  const addForm = (f, b, t) => { if (!/^[a-z]+$/.test(f) || f === b) return; if (!formBase.has(f)) formBase.set(f, b); const k = b + '|' + f; formTag.set(k, (formTag.get(k) || '') + ' ' + t); };
  for (const src of [simple, enw]) for (const w of Object.keys(src)) for (const e of src[w]) {
    if (isFormEntry(e)) continue;
    if ((e.forms || []).some(([f, t]) => /\b(canonical|positive|infinitive)\b/.test(t) && /^[a-z]+$/.test(f) && f !== w)) continue;
    for (const [f, t] of e.forms || []) {
      if (e.pos === 'verb' && /^[a-z]+$/.test(f) && /\bpast\b/.test(t)) pastWords.add(f);
      if (/plural|past|participle|third-person|comparative|superlative/.test(t)) addForm(f, w, e.pos + ':' + t);
    }
  }
  IN = { simple, enw, wn, lists, curation, unitWords, zipf, common, formBase, formTag, pastWords };
  return IN;
}

// ---- morphology -------------------------------------------------------------------------------------
const _forms = new Map();
function formsOf(word) {
  if (_forms.has(word)) return _forms.get(word);
  const { simple, enw } = inputs(); const f = new Set([word]); _forms.set(word, f);
  for (const src of [simple, enw]) for (const e of src[word] || []) for (const [x] of e.forms || []) if (/^[a-z]+$/i.test(x)) f.add(x.toLowerCase());
  for (const s of ['s', 'es', 'ed', 'd', 'ing', 'er', 'est']) f.add(word + s);
  if (/e$/.test(word)) f.add(word.slice(0, -1) + 'ing');
  if (/y$/.test(word)) for (const s of ['ies', 'ied', 'ier', 'iest']) f.add(word.slice(0, -1) + s);
  if (/[^aeiou][aeiou][bdgklmnprt]$/.test(word)) for (const s of ['ed', 'ing', 'er', 'est']) f.add(word + word.slice(-1) + s);
  return f;
}
function commonPrefix(a, b) { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; }
function related(a, b) {
  a = a.toLowerCase(); b = b.toLowerCase(); if (a === b) return true;
  const short = Math.min(a.length, b.length);
  if (short >= 4 && (a.startsWith(b) || b.startsWith(a))) return true;
  const cp = commonPrefix(a, b);
  if (cp >= 6) return true;
  if (cp >= 5 && short <= 7) return true;
  if (short >= 4 && cp >= short - 1 && Math.abs(a.length - b.length) <= 3) return true;
  return false;
}
const _cwf = new Map();
function containsWordForm(text, word) {
  const ck = word + '|' + text; if (_cwf.has(ck)) return _cwf.get(ck);
  const r = containsWordForm0(text, word); if (_cwf.size < 500000) _cwf.set(ck, r); return r;
}
function containsWordForm0(text, word) {
  const f = formsOf(word);
  return (text.toLowerCase().match(/[a-z]+/g) || []).some((t) => f.has(t) || (t.length >= 4 && related(t, word)));
}
// the base form a rule would give (cats -> cat): used at run time too, so the index carries the same rules
function ruleBases(w) {
  const out = [];
  const add = (x) => { if (x && x.length >= 2 && !out.includes(x)) out.push(x); };
  if (/ies$/.test(w)) add(w.slice(0, -3) + 'y');
  if (/(s|x|z|ch|sh|o)es$/.test(w)) add(w.slice(0, -2));
  if (/[^s]s$/.test(w)) add(w.slice(0, -1));
  if (/ied$/.test(w)) add(w.slice(0, -3) + 'y');
  if (/ed$/.test(w)) { add(w.slice(0, -2)); add(w.slice(0, -1)); if (/([bdgklmnprt])\1ed$/.test(w)) add(w.slice(0, -3)); }
  if (/ing$/.test(w)) { add(w.slice(0, -3)); add(w.slice(0, -3) + 'e'); if (/([bdgklmnprt])\1ing$/.test(w)) add(w.slice(0, -4)); }
  // Comparatives and superlatives use the dictionary forms table.
  // A guessed suffix can turn a noun like decomposer into a verb.
  return out;
}

// ---- readability ----------------------------------------------------------------------------------
function syllables(w) {
  w = w.toLowerCase().replace(/[^a-z]/g, ''); if (!w) return 0; if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const m = w.match(/[aeiouy]{1,2}/g); return Math.max(1, m ? m.length : 1);
}
const _read = new Map();
function readability(text) { if (_read.has(text)) return _read.get(text); const r = readability0(text); _read.set(text, r); return r; }
function readability0(text) {
  const words = text.match(/[A-Za-z']+/g) || []; if (!words.length) return { words: 0, grade: 0, hard: 0 };
  const syl = words.reduce((s, w) => s + syllables(w), 0);
  const { common, zipf } = inputs();
  const hard = words.filter((w) => { const l = w.toLowerCase(); return l.length > 3 && !common.has(l) && !(zipf.get(l) > 3); }).length;
  return { words: words.length, grade: Math.round((0.39 * words.length + 11.8 * (syl / words.length) - 15.59) * 10) / 10, hard };
}
const nwords = (t) => (t.match(/[A-Za-z']+/g) || []).length;

// ---- definition clean-up --------------------------------------------------------------------------
function firstSentence(t) { const m = t.match(/^(.+?[.!?])(\s+[A-Z(]|$)/); return m ? m[1] : t; }
// third-person verb -> base (goes -> go), for "If something rots, it goes bad" -> "To go bad"
const IRREG3 = { is: 'be', are: 'be', has: 'have', does: 'do', goes: 'go', was: 'be', were: 'be' };
function baseVerb(v) {
  const l = v.toLowerCase(); if (IRREG3[l]) return IRREG3[l];
  const { formBase, formTag } = inputs();
  const b = formBase.get(l); if (b && /third-person/.test(formTag.get(b + '|' + l) || '')) return b;
  if (/ies$/.test(l)) return l.slice(0, -3) + 'y';
  if (/(s|x|z|ch|sh|o)es$/.test(l)) return l.slice(0, -2);
  if (/[^s]s$/.test(l)) return l.slice(0, -1);
  return null;
}
// "you don't understand it" -> "not understand something"; returns null when it cannot be made into "to ..."
function youClause(rest, obj, thirdPerson) {
  let r = rest.trim();
  r = r.replace(/^(?:will|can|could|would|may|might|should|must)\s+/i, '');
  let m;
  if ((m = r.match(/^(?:do not|don't|does not|doesn't|cannot|can't|can not|will not|won't|did not|didn't)\s+(.+)$/i))) r = 'not ' + m[1];
  else if ((m = r.match(/^(?:are|is|am|'re)\s+(.+)$/i))) r = 'be ' + m[1];
  else if (thirdPerson) {
    const first = (r.match(/^([A-Za-z]+)/) || [])[1]; if (!first) return null;
    const b = baseVerb(first); if (!b) return null;
    r = b + r.slice(first.length);
  }
  // a pronoun that pointed back at the object becomes the object again
  if (obj) {
    const o = obj.replace(/^(?:a|an|the)\s+/i, (x) => x.toLowerCase());
    const pr = /\b(it|them|him or her|him|her)\b/i;
    if (pr.test(r)) r = r.replace(pr, o);
  } else if (/\b(it|them|him|her)\b/i.test(r)) return null;
  if (/^(mean|means|trying|try)\b/i.test(r)) return null;
  if (/\byou\b|\byour\b/i.test(r) && !/\byour own\b/i.test(r)) {
    // "you ... your hands" is fine as "your"; a second "you" means the frame did not end here
    if (/\byou\b/i.test(r)) return null;
  }
  return 'to ' + r;
}
function cleanDef(word, pos, gloss) {
  let g = String(gloss || '').trim();
  if (!g) return { reject: 'empty' };
  if (FORM_OF.test(g)) return { reject: 'form-of / cross-reference' };
  g = g.replace(/\s*\([^()]*\)/g, '').replace(/\s*\[[^\]]*\]/g, '').replace(/\s+([,.;:])/g, '$1').replace(/\s{2,}/g, ' ').trim();
  g = firstSentence(g).replace(/[.;:,]+$/, '').trim();
  const forms = formsOf(word);
  const W = '(?:' + [...forms].sort((a, b) => b.length - a.length || (a < b ? -1 : 1)).map(esc).join('|') + ')';
  let text = null, style = 'phrase', m;
  if (pos === 'n') {
    if ((m = g.match(new RegExp('^(?:A|An|The|Some)\\s+' + W + '\\s+(?:is|are|refers to|means|is called)\\s+(.+)$', 'i')))) text = m[1];
    else if ((m = g.match(new RegExp('^' + W + '\\s+(?:is|are|refers to|means|is called)\\s+(.+)$', 'i')))) text = m[1];
  } else if (pos === 'v') {
    if ((m = g.match(new RegExp('^(?:If|When)\\s+(you|someone|somebody|a person|people|something|a thing|things|an? \\w+)\\s+' + W + '\\b([^,]*),\\s*(?:then\\s+)?(you|they|he or she|he|she|it|that person|this)\\s+(.+)$', 'i')))) {
      const subj = m[1].toLowerCase(), obj = m[2].trim(), pron = m[3].toLowerCase();
      const third = !/^(you|they|people|things)$/.test(pron) && !/^(you|people|things)$/.test(subj);
      const objOk = !obj || /^(?:something|someone|somebody|a thing|things|a person|people|it|them|an? \w+|the \w+|some \w+|\w+)$/i.test(obj) && !/^(?:to|in|on|at|for|with|from|about|into|up|down|out|off|away|over|by|of|as)$/i.test(obj);
      const t = objOk ? youClause(m[4], obj && !/^(?:to|in|on|at|for|with|from|about|into|up|down|out|off|away|over|by|of|as)\b/i.test(obj) ? obj : '', third) : null;
      if (t && !(obj && /^(?:to|in|on|at|for|with|from|about|into|up|down|out|off|away|over|by|of|as)\b/i.test(obj))) text = t;
      else { style = 'blank'; text = g; }
    } else if ((m = g.match(new RegExp('^To\\s+' + W + '\\b.*?\\s+(?:is|means)\\s+(?:to\\s+)?(.+)$', 'i')))) {
      if (/^(an?|the)\s/i.test(m[1])) { style = 'blank'; text = g; } else text = 'to ' + m[1];
    } else if (/^to\s/i.test(g)) text = g;
  } else if (pos === 'a') {
    if ((m = g.match(new RegExp('^(?:If|When)\\s+(?:something|someone|somebody|a person|a thing|it|you|people|things|a place|an? \\w+(?: or \\w+)?)\\s+(?:is|are|feels?|looks?|seems?)\\s+' + W + ',\\s*(?:it|they|he or she|he|she|you|that person|this|that thing)\\s+(?:is|are|feels?|looks?)\\s+(.+)$', 'i')))) text = m[1];
    else if ((m = g.match(new RegExp('^(?:Something|Someone|A thing|A person|Things|People)\\s+(?:that|who)\\s+(?:is|are)\\s+' + W + '\\s+(?:is|are)\\s+(.+)$', 'i')))) text = m[1];
    else if (new RegExp('^' + W + '\\s+means\\s+(.+)$', 'i').test(g)) text = g.replace(new RegExp('^' + W + '\\s+means\\s+', 'i'), '');
  } else if (pos === 'r') {
    if ((m = g.match(new RegExp('^(?:If|When)\\s+(?:you|someone|something|a person|people)\\s+(?:do|does|did)\\s+(?:something|it)\\s+' + W + ',\\s*(?:you|they|he or she|it)\\s+(?:do|does|did)\\s+it\\s+(.+)$', 'i')))) text = m[1];
  }
  if (text == null) text = g;
  // "An open field or grassy area; meadows are often found near rivers": the side clause names the word, the
  // first part is the meaning; keep the first part rather than make a blank-style text out of a side note
  if (containsWordForm(text, word)) { const head = text.split(/;| – | — /)[0].trim(); if (head.length < text.length && nwords(head) >= 3 && !containsWordForm(head, word)) text = head; }
  if (containsWordForm(text, word)) {
    let hits = 0, derived = '';
    const out = text.split(/(\b)/).map((t) => { if (/^[A-Za-z]+$/.test(t)) { const l = t.toLowerCase(); if (forms.has(l)) { hits++; return '___'; } if (l.length >= 4 && related(l, word)) derived = l; } return t; }).join('');
    if (derived) return { reject: 'definition uses a related word (' + derived + ')' };
    if (hits > 1) return { reject: 'word appears more than once in the definition' };
    text = out; style = 'blank';
  }
  text = text.trim();
  if (!text) return { reject: 'empty after cleaning' };
  if (/^[:;,]|this (short )?section|needs someone to add|\bstub\b/i.test(text)) return { reject: 'not a definition (wiki note)' };
  let nw = nwords(text);
  if (nw > 22) {
    const cut = text.split(/;| – | — /)[0].trim();
    if (nwords(cut) <= 22 && cut.length < text.length) { text = cut; nw = nwords(cut); } else return { reject: 'too long (' + nw + ' words)' };
  }
  if (nw < 2) return { reject: 'too short' };
  // the style is what the final text shows (the cut above may have removed the ___): a style that did not
  // match the text mixed "___" wrong answers in with plain ones
  style = /___/.test(text) ? 'blank' : 'phrase';
  if (/^(I|I'm|My|We|Our)\b/.test(text) && !/^(If|When)\b/.test(g)) return { reject: 'reads like an example sentence' };
  if (/\b(see|compare)\b.*\b(also)\b|^see\b/i.test(text)) return { reject: 'cross-reference' };
  if (style === 'blank' && pos === 'a' && /^(?:An? \w+'s|The \w+'s)\s+___/i.test(text)) return { reject: 'not usable as a definition (blank in a noun phrase)' };
  if (/___\s*___/.test(text)) return { reject: 'garbled' };
  // a definition that does not fit its part of speech (Simple sometimes files a noun sense under the verb)
  if (style === 'phrase' && pos === 'v' && !/^to\s/i.test(text)) return { reject: 'not a verb definition' };
  if (style === 'phrase' && (pos === 'n' || pos === 'a') && /^to\s/i.test(text)) return { reject: 'not a ' + PNAME[pos] + ' definition' };
  if (/\b(?:of|the|a|an|and|or)$/i.test(text)) return { reject: 'unfinished' };
  text = text.charAt(0).toUpperCase() + text.slice(1);
  return { text, style };
}
// a WordNet gloss as a definition: first part before ";", no brackets
function cleanGloss(word, pos, d) {
  const g = String(d || '').split(/;\s/)[0].replace(/\s*\([^()]*\)/g, '').replace(/\s{2,}/g, ' ').trim();
  if (!g) return { reject: 'empty' };
  const pre = pos === 'v' && !/^to\s/i.test(g) ? 'to ' + g : g;
  const c = cleanDef(word, pos, pre);
  if (!c.reject && c.style === 'blank') return { reject: 'gloss names the word' };
  return c;
}

// ---- WordNet helpers --------------------------------------------------------------------------------
const STOP = new Set('a an the of to in on for and or is are be it that this with by as at from which who what when where how you your they their them something someone some any can not no do does has have had was were been being very more most other such than then so if but into out up down about over its his her he she we our us one ones thing things way kind type used use part made make lot lots many much often usually there place people person'.split(' '));
const stem = (t) => t.toLowerCase().replace(/[^a-z]/g, '').slice(0, 5);
const _stems = new Map();
const contentStems = (t) => { t = String(t); let r = _stems.get(t); if (!r) { r = new Set((t.match(/[A-Za-z]+/g) || []).map((x) => x.toLowerCase()).filter((x) => !STOP.has(x) && x.length > 2).map(stem)); if (_stems.size < 400000) _stems.set(t, r); } return r; };
function jacc(a, b) { const A = contentStems(a), B = contentStems(b); if (!A.size || !B.size) return 0; let i = 0; for (const x of A) if (B.has(x)) i++; return i / (A.size + B.size - i); }
function wnSynsets(word, p) { const { wn } = inputs(); return ((wn.lemmas[word] || {})[p] || []).filter((id) => wn.synsets[id]); }
const _wnAll = new Map();
function wnAll(word) { if (_wnAll.has(word)) return _wnAll.get(word); const { wn } = inputs(); const r = Object.values(wn.lemmas[word] || {}).flat().filter((id) => wn.synsets[id]); _wnAll.set(word, r); return r; }
function synBag(id) {
  const { wn } = inputs(); const S = wn.synsets[id];
  return new Set([...contentStems(S.d), ...contentStems(S.ex.join(' ')), ...S.m.flatMap((m) => [...contentStems(m)]), ...S.h.flatMap((h) => wn.synsets[h] ? wn.synsets[h].m.flatMap((m) => [...contentStems(m)]) : [])]);
}
function alignSynset(word, p, defText) {
  const ids = wnSynsets(word, p); if (!ids.length) return null;
  const ds = contentStems(defText || '');
  let best = ids[0], bestScore = -1;
  ids.forEach((id, i) => { const bag = synBag(id); let sc = 0; for (const x of ds) if (bag.has(x)) sc++; sc -= i * 0.01; if (sc > bestScore) { bestScore = sc; best = id; } });
  return { id: best, overlap: Math.round(bestScore) };
}
function closure(id, key, depth) {
  const { wn } = inputs(); const out = new Set(); let front = [id];
  for (let d = 0; d < depth && front.length; d++) { const nx = []; for (const f of front) for (const h of (wn.synsets[f] || {})[key] || []) if (!out.has(h)) { out.add(h); nx.push(h); } front = nx; }
  return out;
}
let _domIndex = null, _pertIndex = null, _attrIndex = null;
function indexes() {
  if (_domIndex) return;
  const { wn } = inputs(); _domIndex = new Map(); _pertIndex = new Map(); _attrIndex = new Map();
  for (const id of Object.keys(wn.synsets).sort()) {
    const S = wn.synsets[id];
    for (const d of S.dom) { if (!_domIndex.has(d)) _domIndex.set(d, []); _domIndex.get(d).push(id); }
    for (const n of S.pert) { if (!_pertIndex.has(n)) _pertIndex.set(n, []); _pertIndex.get(n).push(id); }
    if (S.p === 'a') for (const n of S.attr) { if (!_attrIndex.has(n)) _attrIndex.set(n, []); _attrIndex.get(n).push(id); }
  }
}
// the head adjective(s) of an adjective synset (a satellite points at its head with "similar")
function adjHeads(id) { const { wn } = inputs(); const S = wn.synsets[id]; if (!S.s) return [id]; return S.sim.filter((x) => wn.synsets[x] && !wn.synsets[x].s); }
// candidate words with a closeness score: 3 sibling, 2 cousin / opposite / topic / quality, 1.5 same kind of quality
const _cands = new Map();
function wnCandidates(word, p, sid, opts) {
  const ck = word + '|' + p + '|' + sid + '|' + !!(opts && opts.noAdjExtras); if (_cands.has(ck)) return _cands.get(ck);
  const { wn } = inputs(); indexes(); const S = wn.synsets[sid]; const cand = new Map(); _cands.set(ck, cand);
  const add = (id, score, via) => { const T = wn.synsets[id]; if (!T || T.p !== p) return; for (const lemma of T.m) { if (!/^[a-z]+$/.test(lemma) || lemma === word) continue; const c = cand.get(lemma); if (!c || c.score < score) cand.set(lemma, { score, via, syn: id }); } };
  const ups = new Set(S.h);
  for (const h of S.h) for (const sib of wn.synsets[h].hy) if (sib !== sid) add(sib, 3, 'sibling');
  for (const h of S.h) for (const g of wn.synsets[h].h) for (const au of wn.synsets[g].hy) if (!ups.has(au)) for (const c of wn.synsets[au].hy) add(c, 2, 'cousin');
  for (const a of S.ant) add(a, 2.5, 'opposite');
  for (const dom of S.dom) for (const id2 of _domIndex.get(dom) || []) if (id2 !== sid) add(id2, 2, 'same topic');
  if (p === 'a') {
    const heads = adjHeads(sid);
    for (const hd of heads) for (const a of wn.synsets[hd].ant) { add(a, 2.5, 'opposite'); if (!(opts && opts.noAdjExtras)) for (const s3 of wn.synsets[a].sim) add(s3, 2, 'opposite cluster'); }
    for (const s2 of S.sim) for (const a of wn.synsets[s2].ant) add(a, 2, 'opposite cluster');
    // quality nouns: same quality, neighbouring qualities
    const attrs = [...new Set([...S.attr, ...heads.flatMap((h) => wn.synsets[h].attr)])];
    for (const a of attrs) {
      const A = wn.synsets[a]; if (!A) continue;
      for (const adj of _attrIndex.get(a) || []) if (adj !== sid && !S.sim.includes(adj) && !heads.includes(adj)) add(adj, 2, 'same quality');
      for (const h of A.h) for (const sibN of wn.synsets[h].hy) if (sibN !== a) for (const adj of _attrIndex.get(sibN) || []) {
        add(adj, 2, 'neighbouring quality');
        if (!(opts && opts.noAdjExtras)) for (const s3 of wn.synsets[adj].hy.concat(wn.synsets[adj].sim)) add(s3, 1.5, 'neighbouring quality cluster');
      }
      // same kind of quality: other qualities two levels up (size, colour, temperature ... under "property")
      if (!(opts && opts.noAdjExtras)) for (const h of A.h) for (const g of wn.synsets[h].h) for (const au of wn.synsets[g].hy) if (au !== h) for (const n of wn.synsets[au].hy.concat([au])) for (const adj of _attrIndex.get(n) || []) add(adj, 1.5, 'same kind of quality');
    }
    // relational adjectives (urban: of a city): adjectives of the city's neighbours (country: rural)
    if (!(opts && opts.noAdjExtras)) for (const n of S.pert) { const N = wn.synsets[n]; if (!N) continue;
      for (const h of N.h) for (const sibN of wn.synsets[h].hy) if (sibN !== n) for (const adj of _pertIndex.get(sibN) || []) add(adj, 2, 'relational neighbour');
      for (const d of N.dom) for (const id2 of _domIndex.get(d) || []) add(id2, 1.5, 'same topic');
    }
  }
  return cand;
}
// every word that must never be a wrong answer for ANY sense of this word (owner rule)
const _excl = new Map();
function exclusionsFor(word, p) {
  const ck = word + '|' + p; if (_excl.has(ck)) return _excl.get(ck);
  const { wn } = inputs(); const ex = new Set(); _excl.set(ck, ex);
  for (const id of wnAll(word)) for (const m of wn.synsets[id].m) ex.add(m);
  for (const id of wnSynsets(word, p)) {
    for (const x of [...closure(id, 'h', 12), ...closure(id, 'hy', 12)]) for (const m of wn.synsets[x].m) ex.add(m);
    for (const s2 of wn.synsets[id].sim) { for (const m of wn.synsets[s2].m) ex.add(m); for (const s3 of wn.synsets[s2].sim) for (const m of wn.synsets[s3].m) ex.add(m); }
  }
  return ex;
}
const _allSet = new Map();
function sharesSynset(a, b) { let A = _allSet.get(a); if (!A) { A = new Set(wnAll(a)); _allSet.set(a, A); } return wnAll(b).some((x) => A.has(x)); }

// ---- tiny deterministic helpers ---------------------------------------------------------------------
function seedOf(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
function rng(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
const byKey = (f) => (a, b) => { const x = f(a), y = f(b); return x < y ? -1 : x > y ? 1 : 0; };

// ---- headwords ------------------------------------------------------------------------------------
function baseOf(word) {
  const { simple, enw, formBase } = inputs();
  if ((simple[word] || []).some((e) => !isFormEntry(e))) return word;
  for (const e of simple[word] || []) for (const s of e.senses) { if ((s.form_of || []).length) return s.form_of[0]; const m = (s.g || '').match(/form of (?:the (?:verb|noun|adjective) )?["“]?([a-z]+)/i); if (m && FORM_OF.test(s.g)) return m[1].toLowerCase(); }
  if ((enw[word] || []).some((e) => e.senses.some((s) => s.g))) return word;
  for (const e of enw[word] || []) for (const s of e.senses) if ((s.form_of || []).length) return s.form_of[0];
  return formBase.get(word) || word;
}
function headwordPlan() {
  const { lists, unitWords } = inputs();
  const blocked = new Set(lists.blocked);
  const plan = new Map(); // word -> { lists:Set, pos:[given] , order }
  const put = (w, list, pos) => {
    if (!/^[a-z]+(?:-[a-z]+)?$/.test(w) || (blocked.has(w) && (list === 'builtin' || list === 'common')) || HARD.test(w.replace(/-/g, ' '))) return;
    let r = plan.get(w); if (!r) { r = { w, lists: new Set(), pos: [] }; plan.set(w, r); }
    r.lists.add(list); if (pos && P1[pos] && !r.pos.includes(P1[pos])) r.pos.push(P1[pos]);
  };
  for (const k of ['science', 'social', 'ela']) for (const [w, p] of lists.unit[k]) put(w, 'unit', p);
  for (const [w, p] of lists.nawl) put(w, 'nawl', p);
  const z = (w) => lists.zipf[w] || 0;
  for (const w of lists.builtin.slice().sort((a, b) => z(b) - z(a) || (a < b ? -1 : 1))) put(baseOf(w), 'builtin', null);
  for (const [w, entry] of unitWords) put(w, 'unit', entry.unit);
  for (const w of lists.common) put(baseOf(w), 'common', null);
  return [...plan.values()];
}

// ---- senses of one headword -------------------------------------------------------------------------
function senseCandidates(word, posOrder) {
  const { simple, enw, wn } = inputs();
  const out = []; // { id, word, p, def, style, source, ex:[], syn:[], ant:[], soft, tags, rawText }
  const posSeen = [];
  const simplePos = [];
  for (const e of simple[word] || []) { const p = P1[e.pos]; if (p && !isFormEntry(e) && !simplePos.includes(p)) simplePos.push(p); }
  const enPos = []; for (const e of enw[word] || []) { const p = P1[e.pos]; if (p && e.senses.some((s) => s.g) && !enPos.includes(p)) enPos.push(p); }
  const wnPos = ['n', 'v', 'a', 'r'].filter((p) => wnSynsets(word, p).length);
  const order = [...posOrder, ...simplePos, ...enPos.filter((p) => wnPos.includes(p))].filter((p, i, a) => a.indexOf(p) === i);
  for (const p of order) {
    const got = [];
    let n = 0;
    for (const e of simple[word] || []) {
      if (P1[e.pos] !== p || isFormEntry(e)) continue;
      for (const s of e.senses) {
        n++;
        const tagStr = (s.tags || []).join(' ') + ' ' + (s.cats || []).join(' ');
        if (BAD_TAGS.test(tagStr) || SKIP_TAGS.test(tagStr)) continue;
        const c = cleanDef(word, p, s.g); if (c.reject) continue;
        if (safety(c.text) === 'hard' || safety(s.g) === 'hard') continue;
        got.push({ id: word + '|' + p + '|' + n, word, p, def: c.text, style: c.style, source: 'simple', ex: s.ex || [], syn: s.syn || [], ant: s.ant || [], soft: !!safety(c.text), tags: tagStr, raw: s.g });
      }
    }
    if (!got.length) { // WordNet gloss, then English Wiktionary
      wnSynsets(word, p).slice(0, 3).forEach((id, i) => {
        const c = cleanGloss(word, p, wn.synsets[id].d); if (c.reject || safety(c.text) === 'hard') return;
        got.push({ id: word + '|' + p + '|w' + (i + 1), word, p, def: c.text, style: c.style, source: 'wordnet', ex: wn.synsets[id].ex, syn: [], ant: [], soft: !!safety(c.text), tags: '', raw: wn.synsets[id].d, synset: id });
      });
    }
    if (!got.length) {
      let i = 0;
      for (const e of enw[word] || []) { if (P1[e.pos] !== p) continue; for (const s of e.senses) { if (!s.g) continue; i++; if (got.length >= 2) continue;
        const c = cleanDef(word, p, s.g); if (c.reject || safety(c.text) === 'hard' || safety(s.g) === 'hard') continue;
        got.push({ id: word + '|' + p + '|e' + i, word, p, def: c.text, style: c.style, source: 'wiktionary', ex: s.ex || [], syn: [], ant: [], soft: !!safety(c.text), tags: '', raw: s.g });
      } }
    }
    if (got.length) posSeen.push(p);
    out.push(...got);
  }
  return applySenseFixes(out);
}

// 2026-11-23: sense fixes (the curation file's "senseFixes": id -> { def, reason } or { reject: true, reason }) correct a
// meaning's wording, or drop the meaning, WITHOUT a curation entry for the word: a word with an entry counts as checked
// and is never trimmed from the core, so entries for hundreds of unchecked words would grow the core and move its wrong
// answers. The meaning shows as edited and still unchecked. Made for blanks the word as written does not fit ("If you
// are ___ on something" for prey needs "preying"). A meaning a checker saw keeps its verdict in "words" instead.
// 2026-11-23: why a meaning's blank (___) may not take the word as it is written, or '' (rough rules, by the words around
// the blank and the part of speech p: n v a r). A student sees the word as written and must be able to put it in the blank.
// The blank pass checked every blank meaning by reading it; these rules guard the bank afterwards
// (tests/packets_vocab_blank_fit_2026_11_23.test.js). A meaning that fits although a rule flags it is listed, with why,
// in the curation file's "blankFitOk".
function blankFitProblem(word, p, def) {
  const m = /_{2,}/.exec(def || '');
  if (!m) return '';
  const before = def.slice(0, m.index), after = def.slice(m.index + m[0].length), w = String(word);
  const plural = /(s|ae|i|a)$/.test(w) && !/(ss|us|is)$/.test(w);
  if (/^[a-z]/i.test(after)) return 'letters glued to the blank (___s, ___ed, ___ing)';
  if (p === 'v' && /\b(someone|somebody|something|a person|anyone|anything|one|a thing|an animal|a plant)\s+(who|that|which)\s*$/i.test(before)) return 'verb after a singular subject: needs the -s form';
  if (p === 'v' && /\b(of|by|for|from|about|without|while|keep|stop|start|like|enjoy)\s*$/i.test(before)) return 'verb after a word that needs -ing (or a circular frame)';
  if (/\ban\s*$/i.test(before) && /^[^aeiou]/i.test(w) && !/^(h[oe]n|hour|honest|heir|u[nm]|x)/i.test(w)) return '"an" before a word that needs "a"';
  if (/\ba\s*$/i.test(before) && /^[aeio]/i.test(w) && p !== 'v') return '"a" before a word that needs "an"';
  if (p === 'v' && /\b(something|someone|somebody|it|he|she|a person|a thing|a group|an animal|a plant|the person|the thing|one|anything|everything|nobody|everyone|a company|a liquid|water|the sun|the moon)\s*$/i.test(before)) return 'verb after a singular subject: needs the -s form';
  if (p === 'v' && /\b(is|are|was|were|be|been|being|am|'s|'re)\s*$/i.test(before)) return 'verb after "be": needs -ing or -ed';
  if (p === 'v' && /\b(has|have|had|having)\s*$/i.test(before)) return 'verb after "have": needs the -ed form';
  if (p === 'n' && !plural && (/\b(many|several|two|three|four|five|some|few|all|both|these|those|various|multiple)\s*$/i.test(before) || /^\s*(are|were|have)\b/i.test(after))) return 'noun used as plural';
  return '';
}

function applySenseFixes(list) {
  const fixes = inputs().curation.senseFixes || {};
  const out = [];
  for (const s of list) {
    const f = Object.prototype.hasOwnProperty.call(fixes, s.id) ? fixes[s.id] : null;
    if (!f) { out.push(s); continue; }
    // A dropped meaning stays in the list until the build has chosen which meanings a word shows, then goes (fixDrop):
    // dropping one must leave a gap, not let an unchecked meaning that was not shown before move up into view.
    if (f.reject) { out.push(Object.assign(s, { fixDrop: true })); continue; }
    if (typeof f.def === 'string' && f.def && safety(f.def) !== 'hard') { s.def = f.def; s.style = /___/.test(f.def) ? 'blank' : 'phrase'; s.edited = true; s.soft = !!safety(f.def); s.senseFix = true; }
    out.push(s);
  }
  return out;
}

// 2026-11-23: what a checker is shown for a word: every meaning the three sources give, not only the ones senseCandidates
// keeps for the automatic bank. senseCandidates drops a meaning that names the word or a related word ("a person who boxes",
// "containing cream") and then shows a rarer one, and it reads WordNet and English Wiktionary only when Simple English
// Wiktionary has nothing for that part of speech; the checker found the everyday meaning missing that way for many words.
// Ids follow senseCandidates exactly (Simple: <word>|<p>|<n>, WordNet: |w<n>, English Wiktionary: |e<n>), so a checker who
// picks one with verdict "fixed" and a "def" gets it shown with its source credited (curateExtended, build()).
// Each: { id, p, source, raw (the source text), def (cleaned, or null), usable (senseCandidates would keep it),
// needsRewording (why the clean-up drops it), notShownBecause (why a clean meaning is not in the bank), soft, ex }.
// Nothing here changes the bank.
function checkerCandidates(word) {
  const { simple, enw, wn } = inputs();
  const kept = new Map(senseCandidates(word, []).filter((s) => !s.fixDrop).map((s) => [s.id, s]));
  const out = [];
  const add = (id, p, source, raw, ex, tagStr) => {
    const k = kept.get(id);
    if (k) { out.push({ id, p, source, raw, def: k.def, usable: true, needsRewording: '', notShownBecause: '', soft: !!k.soft, ex: (k.ex || []).slice(0, 2) }); return; }
    const c = cleanDef(word, p, raw);
    const hard = safety(raw) === 'hard' || (!c.reject && safety(c.text) === 'hard');
    if (hard) return; // never shown to anyone
    const label = tagStr && SKIP_TAGS.exec(tagStr);
    out.push({ id, p, source, raw, def: c.reject ? null : c.text, usable: false, needsRewording: c.reject || '',
      notShownBecause: c.reject ? '' : label ? 'labelled ' + label[0] + ' in the source' : 'another source covered this part of speech', soft: !!safety(raw), ex: (ex || []).slice(0, 2) });
  };
  const pos = [];
  for (const e of simple[word] || []) { const p = P1[e.pos]; if (p && !pos.includes(p)) pos.push(p); }
  for (const e of enw[word] || []) { const p = P1[e.pos]; if (p && !pos.includes(p)) pos.push(p); }
  for (const p of ['n', 'v', 'a', 'r']) if (wnSynsets(word, p).length && !pos.includes(p)) pos.push(p);
  for (const p of pos) {
    let n = 0;
    for (const e of simple[word] || []) {
      if (P1[e.pos] !== p || isFormEntry(e)) continue;
      for (const s of e.senses) {
        n++;
        const tagStr = (s.tags || []).join(' ') + ' ' + (s.cats || []).join(' ');
        if (BAD_TAGS.test(tagStr)) continue;
        add(word + '|' + p + '|' + n, p, 'simple', s.g, s.ex, tagStr);
      }
    }
    wnSynsets(word, p).forEach((id, i) => { const syn = wn.synsets[id]; if (syn && syn.d) add(word + '|' + p + '|w' + (i + 1), p, 'wordnet', syn.d, syn.ex); });
    let i = 0;
    for (const e of enw[word] || []) { if (P1[e.pos] !== p) continue; for (const s of e.senses) { if (!s.g) continue; i++; add(word + '|' + p + '|e' + i, p, 'wiktionary', s.g, s.ex); } }
  }
  return out;
}

// ---- example sentences ---------------------------------------------------------------------------
const ARCHAIC = /\b(thee|thou|thy|thine|hath|doth|ye|'tis|whilst)\b/i;
const SUBJ_START = /^(the|a|an|he|she|they|we|i|you|it|his|her|their|this|that|these|those|my|our|its|there|some|many|most|all|every|each|one|two|people|children|[A-Z][a-z]+)\b/;
function exampleFor(sense) {
  const { enw, wn } = inputs();
  const word = sense.word, forms = formsOf(word); const cands = [];
  for (const t of sense.ex || []) cands.push([t, sense.source === 'wordnet' ? 'wordnet' : 'source']);
  if (sense.synset0) for (const t of wn.synsets[sense.synset0].ex) cands.push([t, 'wordnet']);
  { let best = null, bs = 0; const ds = contentStems(sense.def);
    for (const e of enw[word] || []) if (P1[e.pos] === sense.p) for (const s of e.senses) { if (!s.g || !(s.ex || []).length) continue; let sc = 0; for (const x of contentStems(s.g)) if (ds.has(x)) sc++; if (sc > bs && sc >= 2) { bs = sc; best = s; } }
    if (best) for (const t of best.ex) cands.push([t, 'wiktionary']); }
  for (let [t, kind] of cands) {
    t = String(t).replace(/\s+/g, ' ').trim();
    const toks = t.match(/[A-Za-z']+/g) || [];
    const hits = toks.filter((x) => forms.has(x.toLowerCase()));
    if (hits.length !== 1) continue;
    if (toks.some((x) => !forms.has(x.toLowerCase()) && x.length >= 4 && related(x.toLowerCase(), word))) continue;
    if (toks.length < 5 || toks.length > 20) continue;
    if (safety(t) || ARCHAIC.test(t) || /[“”"]/.test(t) && toks.length > 14 || /[<>{}|=_]/.test(t)) continue;
    if (kind === 'wordnet' && (toks.length < 6 || !SUBJ_START.test(t))) continue;
    let s = t.charAt(0).toUpperCase() + t.slice(1);
    if (!/[.!?]["”']?$/.test(s)) s += '.';
    return { text: s, form: hits[0].toLowerCase() };
  }
  return null;
}

// ---- inflect a word to match the form in a sentence --------------------------------------------
function inflect(word, p, targetWord, targetForm) {
  if (targetForm === targetWord) return word;
  const { simple, enw } = inputs(); const ps = PSRC[p];
  const tags = (w, f) => { const out = []; for (const e of [...(simple[w] || []), ...(enw[w] || [])]) if (e.pos === ps) for (const [x, t] of e.forms || []) if (x === f) out.push(t); return out.join(' '); };
  const t = tags(targetWord, targetForm);
  const pick = (re) => { for (const e of [...(simple[word] || []), ...(enw[word] || [])]) if (e.pos === ps) for (const [x, tg] of e.forms || []) if (re.test(tg) && /^[a-z]+$/.test(x)) return x; return null; };
  if (p === 'n' && /plural/.test(t)) return pick(/plural/);
  if (p === 'v') {
    if (/third-person/.test(t)) return pick(/third-person/);
    if (/present participle|participle present/.test(t) || /ing$/.test(targetForm)) return pick(/present participle|participle present/);
    if (/past/.test(t)) return pick(/past/);
  }
  if (p === 'a' && /comparative/.test(t)) return pick(/comparative/);
  if (p === 'a' && /superlative/.test(t)) return pick(/superlative/);
  return null;
}

// one wrong answer per word (two senses of "atom" in one list would be the same answer twice)
function oneEach(ids) { const seen = new Set(); return ids.filter((id) => { const w = id.split('|')[0]; if (seen.has(w)) return false; seen.add(w); return true; }); }

// ---- the whole bank -------------------------------------------------------------------------------
function build(opts) {
  opts = opts || {};
  const I = inputs(); const { wn, zipf, common, curation } = I;
  const cur = curation.words || {};
  const plan = headwordPlan();
  const stats = { curationStale: [], planned: plan.length, noSense: 0, rejectedByCuration: 0, fixed: 0, good: 0, unchecked: 0 };
  // 1. senses (curation applied)
  const entries = []; // { w, lists, senses:[...] }
  for (const r of plan) {
    const C = cur[r.w];
    let ss = senseCandidates(r.w, r.pos);
    if (C && C.add) for (const a of C.add) {
      if (ss.some((s) => s.id === a.id)) throw new Error('curation adds a sense that exists: ' + a.id);
      ss.push({ id: a.id, word: r.w, p: a.id.split('|')[1], def: a.def, style: /___/.test(a.def) ? 'blank' : 'phrase', source: a.source, ex: a.example ? [a.example] : [], syn: [], ant: [], soft: !!safety(a.def), tags: '', raw: a.def, added: true, addedEdited: a.edited !== false });
    }
    // every meaning the sources give (before the size cap and the checker's rejects): no wrong answer may match any
    const every = ss.map((s) => ({ def: s.def, syn: s.syn }));
    if (C && C.unit) for (const v of Object.values(C.senses || {})) if (v.def && !every.some((s) => s.def === v.def)) every.push({ def: v.def, syn: [] });
    for (const e of inputs().simple[r.w] || []) for (const s of e.senses) if (s.g && !FORM_OF.test(s.g)) every.push({ def: s.g, syn: s.syn || [] });
    if (C) {
      const sv = C.senses || {};
      // a checked sense the sources no longer give (or the safety filter now rejects) is listed, not fatal
      // ... unless the checker rewrote its text: then the rewrite stands on its own (a vandalised source line
      // that the safety filter now drops, like flexibility's, keeps its corrected meaning)
      for (const id of Object.keys(sv)) {
        if (ss.some((s) => s.id === id) || sv[id].verdict === 'reject') continue;
        const v = sv[id];
        if (v.verdict === 'fixed' && v.def && !safety(v.def) && id.split('|')[0] === r.w) {
          const n = id.split('|')[2];
          ss.push({ id, word: r.w, p: id.split('|')[1], def: v.def, style: /___/.test(v.def) ? 'blank' : 'phrase', source: /^w/.test(n) ? 'wordnet' : /^e/.test(n) ? 'wiktionary' : 'simple', ex: [], syn: [], ant: [], soft: false, tags: '', raw: v.def });
        } else stats.curationStale.push(id);
      }
      ss = ss.filter((s) => { const v = sv[s.id]; if (v && v.verdict === 'reject') { stats.rejectedByCuration++; return false; } return true; });
      for (const s of ss) {
        // a sense the checker never saw (the sources changed, or the view did not show it) stays unchecked
        if (!sv[s.id] && !s.added) { s.checked = ''; stats.unchecked++; continue; }
        const v = sv[s.id] || { verdict: 'fixed' };
        if (s.added) { s.edited = s.addedEdited; }
        if (v.verdict === 'fixed') { if (v.def) { s.def = v.def; s.style = /___/.test(v.def) ? 'blank' : 'phrase'; s.edited = true; s.soft = !!safety(v.def); } if (v.example !== undefined) { s.fixedExample = v.example; if (v.exampleEdited) s.edited = true; } s.checked = 'fixed'; stats.fixed++; }
        else if (v.verdict === 'good') { s.checked = 'good'; stats.good++; if (v.example !== undefined) s.fixedExample = v.example; }
        else throw new Error('unknown verdict ' + v.verdict + ' for ' + s.id);
        if (v.distractors) s.curDistractors = v.distractors;
        if (v.blanks) s.curBlanks = v.blanks;
        if (v.addDistractors) s.addDistractors = v.addDistractors;
        if (v.dropDistractors) s.dropDistractors = v.dropDistractors;
      }
      if (C.order) {
                const rank = new Map(C.order.map((id, i) => [id, i]));
        ss.sort((a, b) => (rank.has(a.id) ? rank.get(a.id) : 1e3 + ss.indexOf(a)) - (rank.has(b.id) ? rank.get(b.id) : 1e3 + ss.indexOf(b)));
        if (C.keepOnlyOrdered) ss = ss.filter((s) => rank.has(s.id));
      }
    } else {
      // unchecked: labelled-subject and soft senses after the plain ones? keep the source order, soft last
      const pord = []; for (const s of ss) if (!pord.includes(s.p)) pord.push(s.p);
      ss = pord.flatMap((p) => [...ss.filter((s) => s.p === p && !s.soft), ...ss.filter((s) => s.p === p && s.soft)]);
      ss.forEach((s) => { s.checked = ''; });
      stats.unchecked += ss.length;
    }
    if (!ss.length) { stats.noSense++; continue; }
    entries.push({ w: r.w, lists: r.lists, checked: !!C, senses: ss, every });
  }
  // US spelling before any rule reads the text (closeness, style); a British headword keeps its own spelling
  for (const e of entries) if (usSpell(e.w) === e.w) { for (const s of e.senses) s.def = usSpell(s.def); for (const v of e.every) v.def = usSpell(v.def); }
  // 2. size: unchecked words keep at most 2 senses per part of speech and 3 in all; then headwords by priority
  for (const e of entries) if (!e.checked && !(opts.blanksFor && opts.blanksFor.has(e.w))) {
    const per = {}; e.senses = e.senses.filter((s) => { per[s.p] = (per[s.p] || 0) + 1; return per[s.p] <= 2; }).slice(0, 3);
  }
  // meanings a sense fix drops go now, after the choice of what each word shows (applySenseFixes)
  for (const e of entries) e.senses = e.senses.filter((s) => !s.fixDrop);
  for (let i = entries.length - 1; i >= 0; i--) if (!entries[i].senses.length) { entries.splice(i, 1); stats.noSense++; }
  // Keep checked common words ahead of trimmable ones. A checked word near the
  // tail should not pin every unchecked word that comes before it.
  const prio = (e) => (e.lists.has('unit') ? 0 : e.lists.has('nawl') ? 1 : e.lists.has('builtin') ? 2 : e.checked ? 3 : 4);
  entries.sort((a, b) => prio(a) - prio(b) || 0);
  // rank inside a priority group: keep the plan order (lists are already ranked)
  const byWord = new Map();
  const sensesById = new Map();
  entries.forEach((e) => { byWord.set(e.w, e); e.senses.forEach((s, i) => { s.common = i + 1; sensesById.set(s.id, s); }); });
  // ALL senses that count for a word (its own, plus those of its base when it is itself a form)
  const allSensesOf = (w) => { const E = byWord.get(w); const out = E ? [...E.senses, ...E.every] : []; const b = I.formBase.get(w); if (b && b !== w && byWord.has(b)) { const B = byWord.get(b); out.push(...B.senses, ...B.every); } return out; };
  // 3. alignment to WordNet
  for (const e of entries) for (const s of e.senses) {
    if (s.synset) { s.synset0 = s.synset; continue; }
    const al = alignSynset(s.word, s.p, s.def); s.synset0 = al ? al.id : null; s.overlap = al ? al.overlap : 0;
  }
  // candidate senses per word and pos, in the word's order
  const lexPool = new Map();
  for (const e of entries) for (const p of ['n', 'v', 'a', 'r']) {
    if (!(zipf.get(e.w) >= 2.5 || common.has(e.w))) continue;
    const ids = wnSynsets(e.w, p); if (!ids.length || !e.senses.some((s) => s.p === p)) continue;
    const k = p + ':' + wn.synsets[ids[0]].lf; if (!lexPool.has(k)) lexPool.set(k, []); lexPool.get(k).push(e.w);
  }
  const uses = new Map(); let made_gone = 0, made_moved = 0, made_dropped = 0, made_topped = 0;
  const unitOf = new Map(); for (const k of ['science', 'social', 'ela']) for (const [w, p] of I.lists.unit[k]) unitOf.set(w, k);
  const nawlLf = new Map();
  for (const [w] of I.lists.nawl) for (const p of ['n', 'v', 'a']) { const ids = wnSynsets(w, p); if (ids.length) { const k = p + ':' + wn.synsets[ids[0]].lf; if (!nawlLf.has(k)) nawlLf.set(k, []); nawlLf.get(k).push(w); } }
  function unitMates(e, p) {
    const out = []; const u = unitOf.get(e.w);
    if (u) for (const [w, q] of I.lists.unit[u]) if (w !== e.w && P1[q] === p) out.push([w, 1.9, 'same unit']);
    if (e.lists.has('nawl') || u) { const ids = wnSynsets(e.w, p); if (ids.length) for (const w of nawlLf.get(p + ':' + wn.synsets[ids[0]].lf) || []) if (w !== e.w) out.push([w, 1.4, 'academic word, same group']); }
    return out;
  }
  const familiar = (w, target) => zipf.get(w) >= 2 || common.has(w) || (byWord.get(target) && byWord.get(target).lists.has('nawl') && byWord.get(w) && byWord.get(w).lists.has('nawl'));
  // the candidate's meaning: its sense of this pos that best matches the suggesting synset, among its first two
  function candSense(c, p, syn, strict) {
    const E = byWord.get(c); if (!E) return null;
    const ss = E.senses.filter((s) => s.p === p); if (!ss.length) return null;
    if (!syn) return ss[0];
    const bag = new Set([...contentStems(wn.synsets[syn].d), ...contentStems(wn.synsets[syn].ex.join(' '))]);
    let best = null, bs = 0;
    ss.slice(0, 2).forEach((s) => { let sc = 0; for (const x of contentStems(s.def)) if (bag.has(x)) sc++; if (s.synset0 === syn) sc += 2; if (sc > bs) { bs = sc; best = s; } });
    if (best) return best;
    return strict ? null : ss[0];
  }
  const dstats = { senses: 0, ge3: 0, ge3strong: 0, adj: 0, adjGe3: 0, adjGe3strong: 0, byPos: {} };
  for (const e of entries) {
    const allW = allSensesOf(e.w);
    for (const s of e.senses) {
      const p = s.p;
      const excl = exclusionsFor(e.w, p);
      const listedSyn = new Set(allW.flatMap((x) => x.syn || []));
      const cand = new Map();
      if (s.synset0) for (const [w, c] of wnCandidates(e.w, p, s.synset0, opts)) cand.set(w, c);
      if (s.synset0) {
        const k = p + ':' + wn.synsets[s.synset0].lf, tz = zipf.get(e.w) || 3;
        const pool = (lexPool.get(k) || []).slice().sort((a, b) => Math.abs((zipf.get(a) || 0) - tz) - Math.abs((zipf.get(b) || 0) - tz) || (a < b ? -1 : 1)).slice(0, 150);
        for (const w of pool) if (!cand.has(w)) cand.set(w, { score: 1, via: 'same broad group', syn: null });
      }
      // the other words of the same school unit are good wrong answers (predator: prey, habitat); NAWL words
      // of the same broad group are fair ones for an academic word
      for (const [w2, sc, via] of unitMates(e, p)) if (!cand.has(w2) || cand.get(w2).score < sc) cand.set(w2, { score: sc, via, syn: null });
      const keyLen = nwords(s.def), keyRead = readability(s.def);
      const good = [];
      for (const [w, c] of cand) {
        if (w === e.w || !byWord.has(w) || HARD.test(w) || SOFT.test(w)) continue;
        if (excl.has(w) || listedSyn.has(w) || related(w, e.w) || sharesSynset(w, e.w)) continue;
        if (I.formBase.get(w) === e.w || I.formBase.get(e.w) === w) continue;
        if (!familiar(w, e.w)) continue;
        let sc = c.score, d = candSense(w, p, c.syn, true);
        if (!d) { d = candSense(w, p, null); sc = Math.min(sc, 1); }
        if (!d || d.soft || d.style !== s.style || (p === 'v' && pastForm(d.def) !== pastForm(s.def))) continue;
        if ((d.syn || []).includes(e.w)) continue;
        if (containsWordForm(d.def, e.w) || allW.some((x) => containsWordForm(x.def, w))) continue;
        // owner rule: not close to ANY sense of the word, and no meaning of the candidate close to this sense
        let close = false;
        for (const x of allW) {
          if (jacc(d.def, x.def) > 0.34) { close = true; break; }
          const ds = contentStems(d.def), ks = contentStems(x.def); let sh = 0; for (const y of ds) if (ks.has(y)) sh++;
          if (sh >= 1 && ds.size <= 3) { close = true; break; }
        }
        if (!close) for (const y of byWord.get(w).senses) if (jacc(y.def, s.def) > 0.34) { close = true; break; }
        if (close) continue;
        const len = nwords(d.def);
        if (len < keyLen * 0.5 - 1 || len > keyLen * 2 + 1) continue;
        const rd = readability(d.def);
        if (Math.abs(rd.grade - keyRead.grade) > 5 || rd.hard > keyRead.hard + 2) continue;
        if (d.source !== s.source) sc -= 0.3;
        good.push({ w, d, score: sc, via: c.via, z: zipf.get(w) || 0 });
      }
      for (const g of good) g.rank = g.score - 0.35 * (uses.get(g.d.id) || 0);
      good.sort((a, b) => b.rank - a.rank || b.z - a.z || (a.w < b.w ? -1 : a.w > b.w ? 1 : 0));
      const picked = [];
      for (const g of good) {
        if (picked.length >= N_DISTRACTORS + 4) break;
        if (picked.some((q) => jacc(q.d.def, g.d.def) > 0.4 || related(q.w, g.w) || sharesSynset(q.w, g.w))) continue;
        picked.push(g);
      }
      s.auto = picked.map((g) => ({ id: g.d.id, score: g.score, via: g.via }));
      let ids;
      // a chosen wrong answer whose sense was later rejected: that word's first sense of the same part of speech
      const live = (list) => list.map((id) => { if (sensesById.has(id)) return id; const [w2, p2] = id.split('|'); const E2 = byWord.get(w2); const alt = E2 && E2.senses.find((x) => x.p === p2); if (alt) { made_moved++; return alt.id; } made_gone++; return null; }).filter(Boolean)
        // the same hard rules as for the automatic list, also for chosen ones: nothing sensitive, nothing that
        // names the word or is in the other style (___), nothing whose word one of the word's own meanings names, no copy of one of its meanings
        .filter((id) => { const d = sensesById.get(id); const ok = d.style === s.style && (p !== 'v' || pastForm(d.def) === pastForm(s.def)) && !d.soft && !HARD.test(d.word) && !SOFT.test(d.word) && !containsWordForm(d.def, e.w)
          && !allW.some((x) => containsWordForm(x.def, d.word) || x.def.toLowerCase() === d.def.toLowerCase()); if (!ok) made_dropped++; return ok; });
      if (s.curDistractors) {
        ids = live(s.curDistractors);
        // fewer than 4 chosen ones left after the rules: topped up from the automatic list (same rules), marked in stats
        if (ids.length < 4) { const more = s.auto.map((x) => x.id).filter((id) => !ids.includes(id)).slice(0, 4 - ids.length); if (more.length) { made_topped++; ids = [...ids, ...more]; } }
      }
      else {
        ids = s.auto.map((x) => x.id).filter((id) => !(s.dropDistractors || []).includes(id));
        if (s.addDistractors) { const ad = live(s.addDistractors); ids = [...ad, ...ids.filter((id) => !ad.includes(id))]; }
        ids = ids.slice(0, s.checked ? N_DISTRACTORS : N_DISTRACTORS_UNCHECKED);
      }
      s.distractors = oneEach(ids);
      s.full = s.distractors.slice(); // the list before the size trim drops words
      ids.slice(0, 3).forEach((id) => uses.set(id, (uses.get(id) || 0) + 1));
      dstats.senses++; const strong = picked.filter((g) => g.score >= 2).length;
      if (picked.length >= 3) dstats.ge3++; if (strong >= 3) dstats.ge3strong++;
      const bp = dstats.byPos[p] || (dstats.byPos[p] = { senses: 0, ge3: 0, ge3strong: 0, ge3mid: 0 });
      bp.senses++; if (picked.length >= 3) bp.ge3++; if (strong >= 3) bp.ge3strong++; if (picked.filter((g) => g.score >= 1.5).length >= 3) bp.ge3mid++;
    }
  }
  // 4. example sentences and their blanks
  const blankPool = new Map(); // pos -> [{w, lf}]
  for (const e of entries) for (const p of ['n', 'v', 'a']) {
    if (!(zipf.get(e.w) >= 3)) continue; const s0 = e.senses.find((s) => s.p === p); if (!s0 || s0 !== e.senses[0]) continue;
    const ids = wnSynsets(e.w, p); if (!ids.length) continue;
    if (!blankPool.has(p)) blankPool.set(p, []); blankPool.get(p).push({ w: e.w, lf: wn.synsets[ids[0]].lf, attr: p === 'a' ? (adjHeads(ids[0]).flatMap((h) => wn.synsets[h].attr)[0] || '') : '' });
  }
  for (const e of entries) for (const s of e.senses) {
    let ex = null;
    if (s.fixedExample !== undefined) ex = s.fixedExample ? { text: s.fixedExample, form: ((s.fixedExample.match(/[A-Za-z]+/g) || []).find((t) => formsOf(e.w).has(t.toLowerCase())) || '').toLowerCase() } : null;
    else ex = exampleFor(s);
    s.example = ex ? ex.text : '';
    s.blanks = [];
    if (!ex || !ex.form || !(s.checked || (opts.blanksFor && opts.blanksFor.has(e.w)))) continue;
    if (s.curBlanks) { s.blanks = s.curBlanks.slice(); continue; }
    const p = s.p; if (!blankPool.has(p)) continue;
    const lf = s.synset0 ? wn.synsets[s.synset0].lf : '';
    const myAttr = p === 'a' && s.synset0 ? (adjHeads(s.synset0).flatMap((h) => wn.synsets[h].attr)[0] || '') : '';
    const sentToks = new Set((ex.text.toLowerCase().match(/[a-z]+/g) || []));
    const prev = ((ex.text.slice(0, ex.text.toLowerCase().search(new RegExp('\\b' + esc(ex.form) + '\\b'))).match(/([A-Za-z]+)\s*$/) || [])[1] || '').toLowerCase();
    const near = new Set([...exclusionsFor(e.w, p), ...s.distractors.map((id) => id.split('|')[0])]);
    if (s.synset0) for (const [w] of wnCandidates(e.w, p, s.synset0, opts)) near.add(w);
    const tz = zipf.get(e.w) || 3; const r = rng(seedOf(s.id));
    const pool = blankPool.get(p).filter((x) => (p === 'a' ? !x.attr || !myAttr || x.attr !== myAttr : x.lf !== lf) && Math.abs((zipf.get(x.w) || 0) - tz) < 1.2)
      .map((x) => ({ ...x, k: r() })).sort((a, b) => a.k - b.k);
    for (const x of pool) {
      if (s.blanks.length >= N_BLANKS) break;
      const o = x.w;
      if (o === e.w || near.has(o) || related(o, e.w) || sharesSynset(o, e.w) || s.blanks.some((b) => related(b, o))) continue;
      const f = inflect(o, p, e.w, ex.form); if (!f) continue;
      if (f !== o && !(zipf.get(f) > 0)) continue;
      if (sentToks.has(f) || sentToks.has(o)) continue;
      if ((prev === 'a' || prev === 'an') && ((prev === 'an') !== /^[aeiou]/.test(f))) continue;
      if (HARD.test(o) || SOFT.test(o) || HARD.test(f) || SOFT.test(f)) continue;
      const fd = byWord.get(o).senses.find((q) => q.p === p);
      if (!fd || fd.soft) continue;
      s.blanks.push(f);
    }
  }
  // 5. trim to the size budget: whole headwords from the end of the priority order
  stats.curatedDistractorsGone = made_gone; stats.curatedDistractorsMoved = made_moved; stats.curatedDistractorsDroppedByRules = made_dropped; stats.curatedListsToppedUp = made_topped;
  return { entries, stats, dstats, sensesById, byWord };
}

// ---- output -----------------------------------------------------------------------------------------
const ABOUT = 'Word meanings from Simple English Wiktionary and English Wiktionary (CC BY-SA 4.0, https://creativecommons.org/licenses/by-sa/4.0/) and AlloFlow school vocabulary, word families from Open English WordNet 2025 (CC BY 4.0) and Princeton WordNet 3.1 (WordNet License). Checked and corrected in part with AI assistance on November 12, 13 and 14, 2026. Not reviewed by a person. A teacher can edit every item. This data stays under CC BY-SA 4.0. Made by dev-tools/build_packets_vocab_bank.cjs.';
const CREDITS = [
  { set: 'Simple English Wiktionary', author: 'Wiktionary contributors', license: 'CC BY-SA 4.0', url: 'https://simple.wiktionary.org', deed: 'https://creativecommons.org/licenses/by-sa/4.0/' },
  { set: 'English Wiktionary', author: 'Wiktionary contributors', license: 'CC BY-SA 4.0', url: 'https://en.wiktionary.org', deed: 'https://creativecommons.org/licenses/by-sa/4.0/' },
  { set: 'Open English WordNet 2025', author: 'the Open English WordNet team', license: 'CC BY 4.0', url: 'https://en-word.net', deed: 'https://creativecommons.org/licenses/by/4.0/' },
  { set: 'Princeton WordNet 3.1', author: 'Princeton University', license: 'WordNet License', url: 'https://wordnet.princeton.edu', deed: 'https://wordnet.princeton.edu/license-and-commercial-use' },
  { set: 'New Academic Word List 1.2 (word choice)', author: 'Charles Browne, Brent Culligan and Joseph Phillips', license: 'CC BY-SA 4.0', url: 'https://www.newgeneralservicelist.com', deed: 'https://creativecommons.org/licenses/by-sa/4.0/' },
];
const CHECKING = 'Checked and corrected with AI assistance on November 12, 13, 14 and 23, 2026 (the meanings marked checked). Not reviewed by a person. A teacher can edit every item.';

// US spelling for what students read (2026-11-12): the sources mix in British forms (colour, centre, theatre).
// A fixed list of whole words only; a headword that is itself British keeps its own spelling.
const US_SPELL = new Map(Object.entries({
  colour: 'color', colours: 'colors', coloured: 'colored', colouring: 'coloring', colourful: 'colorful', colourless: 'colorless',
  behaviour: 'behavior', behaviours: 'behaviors', favourite: 'favorite', favourites: 'favorites', flavour: 'flavor', flavours: 'flavors',
  honour: 'honor', honours: 'honors', harbour: 'harbor', harbours: 'harbors', neighbour: 'neighbor', neighbours: 'neighbors',
  neighbourhood: 'neighborhood', labour: 'labor', rumour: 'rumor', humour: 'humor', odour: 'odor', vapour: 'vapor', armour: 'armor',
  centre: 'center', centres: 'centers', theatre: 'theater', theatres: 'theaters', metre: 'meter', metres: 'meters',
  centimetre: 'centimeter', centimetres: 'centimeters', millimetre: 'millimeter', millimetres: 'millimeters',
  kilometre: 'kilometer', kilometres: 'kilometers', litre: 'liter', litres: 'liters', millilitre: 'milliliter', millilitres: 'milliliters',
  fibre: 'fiber', fibres: 'fibers', grey: 'gray', greyish: 'grayish', organisation: 'organization', organisations: 'organizations',
  organise: 'organize', organised: 'organized', organises: 'organizes', organising: 'organizing', recognise: 'recognize',
  recognised: 'recognized', recognises: 'recognizes', criticise: 'criticize', realise: 'realize', realised: 'realized',
  apologise: 'apologize', memorise: 'memorize', patronising: 'patronizing', travelling: 'traveling', travelled: 'traveled',
  traveller: 'traveler', travellers: 'travelers', jewellery: 'jewelry', programme: 'program', programmes: 'programs',
  cheque: 'check', cheques: 'checks', learnt: 'learned', mould: 'mold', aluminium: 'aluminum', tyre: 'tire', tyres: 'tires',
  pyjamas: 'pajamas', plough: 'plow', whilst: 'while', amongst: 'among', defence: 'defense', offence: 'offense', licence: 'license',
}));
function usSpell(text) {
  if (!text) return text;
  return text.replace(/[A-Za-z]+/g, (w) => {
    const us = US_SPELL.get(w.toLowerCase());
    if (!us) return w;
    return w === w.toUpperCase() && w.length > 1 ? us.toUpperCase() : w[0] === w[0].toUpperCase() ? us[0].toUpperCase() + us.slice(1) : us;
  });
}

// True when a sense's meaning is corroborated by at least one independent open dictionary source.
function isCrossVerified(word, p, defText, source, overlap) {
  if (source !== 'wordnet' && overlap >= 1) return true;
  const { simple, enw, wn } = inputs();
  const ds = contentStems(defText || '');
  if (!ds.size) return false;
  const sharesStem = (text) => {
    for (const st of contentStems(text || '')) if (ds.has(st)) return true;
    return false;
  };
  if (source !== 'wordnet') {
    for (const sid of wnSynsets(word, p)) {
      const syn = wn.synsets[sid];
      if (syn && sharesStem(syn.d)) return true;
    }
  }
  if (source !== 'simple') {
    for (const e of simple[word] || []) {
      if (P1[e.pos] !== p || isFormEntry(e)) continue;
      for (const s of e.senses || []) if (s.g && sharesStem(s.g)) return true;
    }
  }
  if (source !== 'wiktionary') {
    for (const e of enw[word] || []) {
      if (P1[e.pos] !== p) continue;
      for (const s of e.senses || []) if (s.g && sharesStem(s.g)) return true;
    }
  }
  return false;
}

// Curated K-12 curriculum multi-word phrases guaranteed in packets_vocab_ext/phrases.json.
const CURATED_K12_PHRASES = [
  ['absolute value', 'n', 'The distance of a number from zero on a number line, always zero or positive.'],
  ['cause and effect', 'n', 'A relationship where one event makes another event happen.'],
  ['cell membrane', 'n', 'The thin outer covering that controls what enters and leaves a living cell.'],
  ['cell wall', 'n', 'A stiff outer layer that surrounds and protects a plant cell.'],
  ['character trait', 'n', 'A quality that describes how a person or story character thinks, feels, or acts.'],
  ['checks and balances', 'n', 'A system where each branch of government can limit the power of the other branches.'],
  ['chemical reaction', 'n', 'A process in which substances change into one or more new substances.'],
  ['circulatory system', 'n', 'The heart and blood vessels that move blood, oxygen, and nutrients through the body.'],
  ['civil rights', 'n', 'Rights that guarantee fair and equal treatment under the law for all people.'],
  ['climate change', 'n', 'A long-term shift in Earth\'s average temperatures and weather patterns.'],
  ['common noun', 'n', 'A general name for a person, place, thing, or idea, not capitalized unless starting a sentence.'],
  ['context clues', 'n', 'Hints in nearby words or sentences that help you figure out an unfamiliar word.'],
  ['coordinate plane', 'n', 'A flat grid formed by a horizontal x-axis and a vertical y-axis used to plot points.'],
  ['digestive system', 'n', 'The organs that break down food into nutrients the body can absorb and use.'],
  ['electric circuit', 'n', 'A closed path through which electric current can flow.'],
  ['figure of speech', 'n', 'An expression whose meaning is different from the literal meanings of its words.'],
  ['food chain', 'n', 'A path showing how energy passes from one living thing to another as food.'],
  ['food web', 'n', 'A network of connected food chains in an ecosystem.'],
  ['fossil fuel', 'n', 'An energy source such as coal, oil, or natural gas formed from ancient living things.'],
  ['greenhouse effect', 'n', 'The trapping of heat in Earth\'s atmosphere by gases such as carbon dioxide.'],
  ['human rights', 'n', 'Basic freedoms and protections that belong to every person.'],
  ['inclined plane', 'n', 'A flat, slanted surface that makes it easier to move a heavy object upward.'],
  ['industrial revolution', 'n', 'A historic period of rapid shift from hand-made goods to factory machines.'],
  ['kinetic energy', 'n', 'The energy an object has because it is moving.'],
  ['life cycle', 'n', 'The series of stages a living thing goes through from birth to adulthood and reproduction.'],
  ['line of symmetry', 'n', 'A line that divides a shape into two matching mirror-image halves.'],
  ['magnetic field', 'n', 'The invisible region around a magnet where its pushing or pulling force acts.'],
  ['main idea', 'n', 'The most important point or message an author wants readers to understand.'],
  ['market economy', 'n', 'An economic system where prices and production are guided by buyers and sellers.'],
  ['natural resource', 'n', 'A material found in nature, such as water, trees, or minerals, that people use.'],
  ['natural selection', 'n', 'The process by which living things with helpful traits are more likely to survive and pass them on.'],
  ['nervous system', 'n', 'The brain, spinal cord, and nerves that send messages throughout the body.'],
  ['number line', 'n', 'A straight line with numbers placed in order at equal intervals.'],
  ['order of operations', 'n', 'The agreed rules for which math steps to calculate first in an expression.'],
  ['periodic table', 'n', 'A chart that organizes all known chemical elements by their atomic number and properties.'],
  ['place value', 'n', 'The value of a digit based on its position in a number, such as ones, tens, or hundreds.'],
  ['plate tectonics', 'n', 'The theory that Earth\'s outer shell is divided into large slabs that slowly move over time.'],
  ['point of view', 'n', 'The perspective from which a story is told or an opinion is formed.'],
  ['potential energy', 'n', 'Stored energy an object has because of its position or condition.'],
  ['primary source', 'n', 'An original document, object, or firsthand account created during the time being studied.'],
  ['prime number', 'n', 'A whole number greater than 1 that has only two factors: 1 and itself.'],
  ['proper noun', 'n', 'The specific capitalized name of a particular person, place, organization, or thing.'],
  ['renewable energy', 'n', 'Energy from sources that naturally replenish, such as sunlight, wind, or flowing water.'],
  ['respiratory system', 'n', 'The lungs and airways that bring oxygen into the body and remove carbon dioxide.'],
  ['right angle', 'n', 'An angle that measures exactly 90 degrees, like the corner of a square.'],
  ['rock cycle', 'n', 'The continuous process by which rocks change among igneous, sedimentary, and metamorphic forms.'],
  ['secondary source', 'n', 'An account or summary created later by someone who did not directly experience the event.'],
  ['simple machine', 'n', 'A basic mechanical device, such as a lever, pulley, or ramp, that changes the force needed for work.'],
  ['solar system', 'n', 'The sun and all the planets, moons, asteroids, and comets that orbit around it.'],
  ['sound wave', 'n', 'A vibration that travels through air, water, or solids and can be heard by the ear.'],
  ['square root', 'n', 'A number that produces a given number when multiplied by itself.'],
  ['states of matter', 'n', 'The distinct physical forms matter can take, most commonly solid, liquid, and gas.'],
  ['supply and demand', 'n', 'The relationship between how much of a good is available and how much people want to buy it.'],
  ['supporting detail', 'n', 'A fact, example, or explanation that helps prove or explain the main idea.'],
  ['surface area', 'n', 'The total area covering the outside faces of a three-dimensional shape.'],
  ['text evidence', 'n', 'Specific words, facts, or details taken directly from a reading to support an answer.'],
  ['thermal energy', 'n', 'Energy related to the temperature and motion of particles inside matter.'],
  ['thesis statement', 'n', 'A clear sentence that states the main claim or argument of an essay.'],
  ['topic sentence', 'n', 'A sentence that introduces the main idea of a paragraph.'],
  ['unit rate', 'n', 'A comparison of two measurements where the second quantity is equal to one unit.'],
  ['water cycle', 'n', 'The continuous movement of water on, above, and below Earth through evaporation, condensation, and precipitation.'],
  ['water table', 'n', 'The upper surface underground below which soil and rock are filled with water.'],
  ['wheel and axle', 'n', 'A simple machine made of a large wheel attached to a smaller rod that turns together with it.'],
];

// 2026-11-23: the checker's corrections for an extended word (curation entry with ext: true), by the core's rules (build(),
// "1. senses"): added meanings, rejects, rewritten text and examples, order (keepOnlyOrdered keeps only the listed ones).
// A meaning the checker never saw stays unchecked. At most three meanings, as for every extended word.
function curateExtended(w, ss, C, stats) {
  const sv = C.senses || {};
  // Copies: the sense objects may be shared with the rest of the build (senseCandidates), and a rewrite must not leak.
  ss = ss.map((s) => Object.assign({}, s));
  if (C.add) for (const a of C.add) {
    if (ss.some((s) => s.id === a.id)) throw new Error('curation adds a sense that exists: ' + a.id);
    ss.push({ id: a.id, word: w, p: a.id.split('|')[1], def: a.def, style: /___/.test(a.def) ? 'blank' : 'phrase', source: a.source || 'alloflow', ex: a.example ? [a.example] : [], syn: [], ant: [], soft: !!safety(a.def), tags: '', raw: a.def, added: true, addedEdited: a.edited !== false });
  }
  for (const id of Object.keys(sv)) {
    if (ss.some((s) => s.id === id) || sv[id].verdict === 'reject') continue;
    const v = sv[id];
    if (v.verdict === 'fixed' && v.def && !safety(v.def) && id.split('|')[0] === w) {
      const n = id.split('|')[2];
      ss.push({ id, word: w, p: id.split('|')[1], def: v.def, style: /___/.test(v.def) ? 'blank' : 'phrase', source: /^w/.test(n) ? 'wordnet' : /^e/.test(n) ? 'wiktionary' : 'simple', ex: [], syn: [], ant: [], soft: false, tags: '', raw: v.def });
    } else if (stats) (stats.extCurationStale = stats.extCurationStale || []).push(id);
  }
  ss = ss.filter((s) => !(sv[s.id] && sv[s.id].verdict === 'reject'));
  for (const s of ss) {
    if (!sv[s.id] && !s.added) { s.checked = ''; continue; }
    const v = sv[s.id] || { verdict: 'fixed' };
    if (s.added) s.edited = s.addedEdited;
    if (v.verdict === 'fixed') {
      if (v.def) { if (safety(v.def)) throw new Error('a checked rewrite fails the safety filter: ' + s.id); s.def = v.def; s.style = /___/.test(v.def) ? 'blank' : 'phrase'; s.edited = true; }
      if (v.example !== undefined) { s.fixedExample = v.example; if (v.exampleEdited) s.edited = true; }
      s.checked = 'fixed';
    } else if (v.verdict === 'good') { s.checked = 'good'; if (v.example !== undefined) s.fixedExample = v.example; }
    else throw new Error('unknown verdict ' + v.verdict + ' for ' + s.id);
  }
  if (C.order) {
    const rank = new Map(C.order.map((id, i) => [id, i]));
    ss.sort((a, b) => (rank.has(a.id) ? rank.get(a.id) : 1e3 + ss.indexOf(a)) - (rank.has(b.id) ? rank.get(b.id) : 1e3 + ss.indexOf(b)));
    if (C.keepOnlyOrdered) ss = ss.filter((s) => rank.has(s.id));
  }
  return ss.slice(0, 3);
}

function buildExtended(made, coreKeptWords) {
  const I = inputs();
  const { simple, enw, wn, lists, curation, formBase } = I;
  const blocked = new Set(lists.blocked);
  const cur = curation.words || {};
  const byLetter = new Map();
  for (let c = 97; c <= 122; c++) byLetter.set(String.fromCharCode(c), []);

  // Gather candidate headwords not in coreKeptWords:
  // 1) Trimmed entries from build() (already cleaned & curated!)
  // 2) All remaining clean lemmas in simple_wiktionary_en, wiktionary_en, wordnet_en
  const extWords = new Map(); // word -> { w, senses: [{ id, p, def, example, source, flags }] }
  const canAdd = (w) => {
    if (!w || coreKeptWords.has(w) || extWords.has(w) || JS_PROTO_KEYS.has(w)) return false;
    if (!/^[a-z]{2,28}(?:-[a-z]{2,20})?$/.test(w)) return false;
    if (blocked.has(w) || HARD.test(w.replace(/-/g, ' '))) return false;
    return true;
  };

  // First take any trimmed entries from made.allEntries (before fitBudget trimmed them)
  for (const e of made.allEntries || []) {
    if (!canAdd(e.w)) continue;
    const rows = e.senses.slice(0, 3).map((s) => {
      const n = s.id.split('|')[2];
      const cross = !s.checked && isCrossVerified(e.w, s.p, s.def, s.source, s.overlap || 0);
      const flags = (s.edited ? 1 : 0) + (s.checked === 'good' ? 2 : s.checked === 'fixed' ? 4 : 0) + (cross ? 8 : 0);
      const us = usSpell(e.w) === e.w ? usSpell : (x) => x;
      return [s.p + n, us(s.def), us(s.example || ''), SRC[s.source], flags];
    });
    if (rows.length) extWords.set(e.w, rows);
  }

  // Next scan all remaining lemmas in simple, enw, and wn.lemmas
  const pool = new Set([
    ...Object.keys(simple),
    ...Object.keys(enw),
    ...Object.keys(wn.lemmas || {}),
  ]);
  for (const rawW of [...pool].sort()) {
    const w = String(rawW || '').trim().toLowerCase();
    if (!canAdd(w)) continue;
    // Skip pure inflected-form entries (e.g. "abandoned" if only form_of "abandon", unless it has genuine adjective/noun senses)
    const hasSimpleDirect = (simple[w] || []).some((e) => !isFormEntry(e));
    const hasEnwDirect = (enw[w] || []).some((e) => !isFormEntry(e) && (e.senses || []).some((s) => s.g));
    const hasWnDirect = !!(wn.lemmas && wn.lemmas[w]);
    if (!hasSimpleDirect && !hasEnwDirect && !hasWnDirect) continue;
    // If word is an attested regular/irregular form of a core word AND lacks its own distinct POS/meaning in simple/wn, skip
    const fb = formBase.get(w);
    if (fb && (coreKeptWords.has(fb) || extWords.has(fb)) && !hasSimpleDirect && !hasWnDirect) continue;

    let ss = senseCandidates(w, []);
    if (!ss.length) continue;
    const C = cur[w];
    if (C && C.ext) {
      // 2026-11-23: a checked extended word (curation entry with ext: true): its order, rejects, rewrites, examples and added
      // meanings apply as in the core (build(), "1. senses"). An extended word has no wrong answers of its own, so the
      // distractor fields are not used; and it stays extended (a core word would be one the budget may never trim).
      ss = curateExtended(w, ss, C, made.stats);
      if (!ss.length) continue;
    } else {
      const pord = [];
      for (const s of ss) if (!pord.includes(s.p)) pord.push(s.p);
      ss = pord.flatMap((p) => [...ss.filter((s) => s.p === p && !s.soft), ...ss.filter((s) => s.p === p && s.soft)]);
      const per = {};
      ss = ss.filter((s) => { per[s.p] = (per[s.p] || 0) + 1; return per[s.p] <= 2; }).slice(0, 3);
    }
    ss = ss.filter((s) => !s.fixDrop);
    if (!ss.length) continue;
    const us = usSpell(w) === w ? usSpell : (x) => x;
    const rows = ss.map((s, idx) => {
      const al = s.synset ? { id: s.synset, overlap: 1 } : alignSynset(w, s.p, s.def);
      s.synset0 = al ? al.id : null;
      const cross = isCrossVerified(w, s.p, s.def, s.source, al ? al.overlap : 0);
      const humanRev = !!(C && C.senses && C.senses[s.id] && C.senses[s.id].humanReviewed);
      const flags = (s.edited ? 1 : 0) + (s.checked === 'good' ? 2 : s.checked === 'fixed' ? 4 : 0) + (cross && !s.checked ? 8 : 0) + (humanRev ? 16 : 0);
      // A checked example (even an empty one, meaning "no example") wins; otherwise the first meaning gets one from the sources.
      const exText = s.fixedExample !== undefined ? s.fixedExample : (idx === 0 ? ((exampleFor(s) || {}).text || '') : '');
      const n = s.id.split('|')[2];
      return [s.p + n, us(s.def), us(exText), SRC[s.source] || SRC.alloflow, flags];
    });
    if (rows.length) extWords.set(w, rows);
  }

  // Group extended words by first letter a-z
  for (const w of [...extWords.keys()].sort()) {
    const ch = w.charAt(0);
    if (byLetter.has(ch)) byLetter.get(ch).push([w, extWords.get(w)]);
  }

  // Gather extended irregular/inflected forms pointing to extended headwords (or core headwords not already in core forms)
  const allKept = new Set([...coreKeptWords, ...extWords.keys()]);
  const extFormsByLetter = new Map();
  for (let c = 97; c <= 122; c++) extFormsByLetter.set(String.fromCharCode(c), []);
  for (const [f, b] of [...formBase.entries()].sort(byKey((x) => x[0]))) {
    if (allKept.has(f) || !extWords.has(b) || JS_PROTO_KEYS.has(f)) continue;
    const rb = ruleBases(f).find((x) => allKept.has(x));
    if (rb === b) continue;
    const ch = f.charAt(0);
    if (extFormsByLetter.has(ch)) extFormsByLetter.get(ch).push(f + ' ' + b);
  }

  const extFiles = {};
  let extTotalWords = 0, extTotalSenses = 0;
  for (const [ch, rs] of byLetter.entries()) {
    const fList = extFormsByLetter.get(ch) || [];
    if (!rs.length && !fList.length) continue;
    const payload = { about: ABOUT, version: BANK_VERSION, key: ch, words: rs };
    if (fList.length) payload.forms = fList.join(',');
    const t = JSON.stringify(payload) + '\n';
    const senses = rs.reduce((a, r) => a + r[1].length, 0);
    extTotalWords += rs.length;
    extTotalSenses += senses;
    extFiles[ch] = { key: ch, url: EXT_URL + ch + '.json', text: t, bytes: Buffer.byteLength(t), sha256: sha256(t), words: rs.length, senses };
  }

  // Multi-word K-12 phrases shard (packets_vocab_ext/phrases.json)
  const phraseMap = new Map();
  for (const [ph, p, def] of CURATED_K12_PHRASES) {
    phraseMap.set(ph, [[p + '1', def, '', SRC.alloflow, 16]]);
  }
  for (const sid of Object.keys(wn.synsets).sort()) {
    const syn = wn.synsets[sid];
    if (!syn || !syn.d || !['n', 'v', 'a', 'r'].includes(syn.p)) continue;
    if (safety(syn.d)) continue;
    for (const rawM of syn.m || []) {
      const ph = String(rawM || '').trim().toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ');
      if (phraseMap.has(ph) || !/^[a-z]{2,16}(?: [a-z]{2,16}){1,2}$/.test(ph)) continue;
      if (HARD.test(ph) || SOFT.test(ph)) continue;
      const c = cleanGloss(ph, syn.p, syn.d);
      if (c.reject || safety(c.text)) continue;
      phraseMap.set(ph, [[syn.p + 'w1', usSpell(c.text), '', SRC.wordnet, 0]]);
    }
  }
  const phraseRows = [...phraseMap.entries()].sort(byKey((x) => x[0]));
  const phraseText = JSON.stringify({ about: ABOUT, version: BANK_VERSION, key: 'phrases', words: phraseRows }) + '\n';
  const phraseSenses = phraseRows.reduce((a, r) => a + r[1].length, 0);
  extFiles.phrases = {
    key: 'phrases',
    url: EXT_URL + 'phrases.json',
    text: phraseText,
    bytes: Buffer.byteLength(phraseText),
    sha256: sha256(phraseText),
    words: phraseRows.length,
    senses: phraseSenses,
  };
  extTotalWords += phraseRows.length;
  extTotalSenses += phraseSenses;

  return { extFiles, extTotalWords, extTotalSenses, extWordCount: extWords.size, phraseCount: phraseRows.length };
}

function encode(made) {
  const { entries } = made;
  const keptWords = new Set(entries.map((e) => e.w));
  // every sense gets a global number (order of entries, then senses): distractors refer to it
  const num = new Map(); let k = 0;
  for (const e of entries) for (const s of e.senses) num.set(s.id, k++);
  for (const e of entries) for (const s of e.senses) for (const id of s.distractors) {
    const d = made.sensesById.get(id);
    if (!d || !num.has(id)) throw new Error('distractor ' + id + ' of ' + s.id + ' is not in the bank');
    if (d.p !== s.p) throw new Error('distractor ' + id + ' of ' + s.id + ' has another part of speech');
    if (d.word === s.word) throw new Error('distractor ' + id + ' of ' + s.id + ' is the same word');
  }
  // irregular forms only (the rules in the index find the regular ones)
  const { formBase } = inputs();
  const forms = [];
  for (const [f, b] of [...formBase.entries()].sort(byKey((x) => x[0]))) {
    if (keptWords.has(f) || !keptWords.has(b)) continue;
    const rb = ruleBases(f).find((x) => keptWords.has(x));
    if (rb === b) continue;
    forms.push(f + ' ' + b);
  }
  const rows = entries.map((e) => [e.w, e.senses.map((s) => {
    const n = s.id.split('|')[2];
    const cross = !s.checked && isCrossVerified(e.w, s.p, s.def, s.source, s.overlap || 0);
    const flags = (s.edited ? 1 : 0) + (s.checked === 'good' ? 2 : s.checked === 'fixed' ? 4 : 0) + (cross ? 8 : 0);
    const us = usSpell(e.w) === e.w ? usSpell : (x) => x;
    const row = [s.p + n, us(s.def), us(s.example), SRC[s.source], flags, s.distractors.map((id) => num.get(id).toString(36)).join(' ')];
    if (s.blanks.length) row.push(s.blanks.map((b) => us(b)).join(' '));
    return row;
  })]);
  // shards: whole words, at most SHARD_LIMIT bytes each
  const shards = []; let cur = [];
  const text = (rs, part, extra) => JSON.stringify(Object.assign({ about: ABOUT, version: BANK_VERSION, part, words: rs }, extra || {})) + '\n';
  const head = Buffer.byteLength(text([], 99)) + Buffer.byteLength(JSON.stringify({ forms: forms.join(',') }));
  let size = head;
  for (const r of rows) {
    const b = Buffer.byteLength(JSON.stringify(r)) + 1;
    if (cur.length && size + b > SHARD_LIMIT) { shards.push(cur); cur = []; size = head; }
    cur.push(r); size += b;
  }
  if (cur.length) shards.push(cur);
  const files = shards.map((rs, i) => {
    const t = text(rs, i + 1, i === shards.length - 1 ? { forms: forms.join(',') } : null);
    return { url: SHARD_URL + (i + 1) + '.json', text: t, bytes: Buffer.byteLength(t), sha256: sha256(t), words: rs.length, senses: rs.reduce((a, r) => a + r[1].length, 0) };
  });
  return { files, forms: forms.length, senses: k };
}

function indexText(enc, ext) {
  const bytes = enc.files.reduce((a, f) => a + f.bytes, 0);
  const extFiles = (ext && ext.extFiles) || {};
  const extMeta = {};
  let extBytes = 0;
  for (const k of Object.keys(extFiles).sort()) {
    const f = extFiles[k];
    extMeta[k] = { url: f.url, bytes: f.bytes, sha256: f.sha256, words: f.words, senses: f.senses };
    extBytes += f.bytes;
  }
  return [
    '// Generated by dev-tools/build_packets_vocab_bank.cjs. Do not edit.',
    '// The offline definition bank for the vocabulary activities of AlloFlow Packets: what each word means,',
    '// an example sentence, and ranked wrong answers that fit no meaning of the word. The words and meanings',
    '// are from Simple English Wiktionary and English Wiktionary (CC BY-SA 4.0) and Open English WordNet',
    '// (CC BY 4.0, from Princeton WordNet); they stay under CC BY-SA 4.0 (credits below). This file has no',
    '// data of its own: load() fetches packets_vocab/en-<n>.json once, and loadLetter()/ensureForWords()',
    '// lazily fetch packets_vocab_ext/<a-z>.json and phrases.json on demand. Inputs: data/vendor/vocab/.',
    '(function (root) {',
    "  'use strict';",
    '  var shards = ' + JSON.stringify(enc.files.map((f) => ({ url: f.url, bytes: f.bytes, sha256: f.sha256, words: f.words, senses: f.senses }))) + ';',
    '  var extShards = Object.freeze(' + JSON.stringify(extMeta) + ');',
    '  var credits = ' + JSON.stringify(CREDITS) + ';',
    "  var POS = { n: 'noun', v: 'verb', a: 'adjective', r: 'adverb' }, SRC = { s: 'simple', w: 'wiktionary', n: 'wordnet', a: 'alloflow' };",
    '  var heads = null, all = [], byId = null, forms = Object.create(null), pending = null, got = Object.create(null);',
    '  var extHeads = Object.create(null), extForms = Object.create(null), phraseHeads = Object.create(null), extGot = Object.create(null), extPending = Object.create(null);',
    "  function key(w) { return String(w == null ? '' : w).trim().toLowerCase(); }",
    '  var own = Object.prototype.hasOwnProperty;',
    "  function provenanceOf(flags) { return (flags & 16) ? 'human-reviewed' : ((flags & 2) || (flags & 4)) ? 'ai-curated' : (flags & 8) ? 'cross-verified' : 'open-dict'; }",
    '  function makeSense(w, r, j, isExt) {',
    "    var p = r[0].charAt(0), flags = r[4] || 0;",
    "    var s = { id: w + '|' + p + '|' + r[0].slice(1), word: w, pos: POS[p], def: r[1], example: r[2] || '', source: SRC[r[3]],",
    "      edited: !!(flags & 1), checked: flags & 2 ? 'good' : flags & 4 ? 'fixed' : '', provenance: provenanceOf(flags), common: j + 1,",
    "      distractors: isExt ? [] : r[5], blanks: (!isExt && r[6]) ? r[6].split(' ') : [] };",
    '    if (isExt) { Object.freeze(s.distractors); Object.freeze(s.blanks); Object.freeze(s); }',
    '    return s;',
    '  }',
    '  // one data file, as parsed JSON (load() calls this; a test or a tool may call it with a file it read)',
    '  function add(data, part) {',
    '    if (!data || !Array.isArray(data.words) || data.version !== ' + BANK_VERSION + ') return 0;',
    '    var i = Number(part != null ? part : data.part) - 1;',
    '    if (!Number.isInteger(i) || i < 0 || i >= shards.length || own.call(got, i)) return 0;',
    '    got[i] = data;',
    '    if (Object.keys(got).length === shards.length) finish();',
    '    return data.words.length;',
    '  }',
    '  function addExt(data, shardKey) {',
    '    if (!data || !Array.isArray(data.words) || data.version !== ' + BANK_VERSION + ') return 0;',
    "    var k = String(shardKey != null ? shardKey : data.key || '').trim().toLowerCase();",
    '    if (!k || !own.call(extShards, k) || extGot[k]) return 0;',
    '    extGot[k] = true;',
    "    var target = k === 'phrases' ? phraseHeads : extHeads;",
    '    data.words.forEach(function (row) {',
    "      if (!Array.isArray(row) || typeof row[0] !== 'string' || !Array.isArray(row[1])) return;",
    '      var w = row[0], list = [];',
    '      row[1].forEach(function (r, j) {',
    '        var s = makeSense(w, r, j, true);',
    '        list.push(s);',
    '        if (byId && !own.call(byId, s.id)) byId[s.id] = s;',
    '      });',
    '      target[w] = Object.freeze(list);',
    '    });',
    "    if (typeof data.forms === 'string' && data.forms) {",
    "      data.forms.split(',').forEach(function (x) { var q = x.split(' '); if (q[0] && q[1] && !own.call(extForms, q[0])) extForms[q[0]] = q[1]; });",
    '    }',
    '    return data.words.length;',
    '  }',
    '  function finish() {',
    '    heads = Object.create(null); all = []; byId = Object.create(null); forms = Object.create(null);',
    '    for (var i = 0; i < shards.length; i++) {',
    '      var d = got[i];',
    '      d.words.forEach(function (row) {',
    '        var w = row[0], list = [];',
    '        row[1].forEach(function (r, j) {',
    '          var s = makeSense(w, r, j, false);',
    '          list.push(s); all.push(s); byId[s.id] = s;',
    '        });',
    '        heads[w] = list;',
    '      });',
    "      if (d.forms) d.forms.split(',').forEach(function (x) { var q = x.split(' '); if (q[0] && q[1]) forms[q[0]] = q[1]; });",
    '    }',
    "    all.forEach(function (s) { s.distractors = s.distractors ? s.distractors.split(' ').map(function (n) { return all[parseInt(n, 36)].id; }) : []; Object.freeze(s.distractors); Object.freeze(s.blanks); Object.freeze(s); });",
    '    for (var w in heads) Object.freeze(heads[w]);',
    '  }',
    '  function ruleCandidates(k) {',
    '    var c = [];',
    "    if (/ies$/.test(k)) c.push(k.slice(0, -3) + 'y');",
    '    if (/(s|x|z|ch|sh|o)es$/.test(k)) c.push(k.slice(0, -2));',
    '    if (/[^s]s$/.test(k)) c.push(k.slice(0, -1));',
    "    if (/ied$/.test(k)) c.push(k.slice(0, -3) + 'y');",
    '    if (/ed$/.test(k)) { c.push(k.slice(0, -2), k.slice(0, -1)); if (/([bdgklmnprt])\\1ed$/.test(k)) c.push(k.slice(0, -3)); }',
    "    if (/ing$/.test(k)) { c.push(k.slice(0, -3), k.slice(0, -3) + 'e'); if (/([bdgklmnprt])\\1ing$/.test(k)) c.push(k.slice(0, -4)); }",
    '    return c;',
    '  }',
    '  function headIn(map, formMap, k) {',
    '    if (!map || !k) return null;',
    '    if (own.call(map, k)) return k;',
    '    if (formMap && own.call(formMap, k) && own.call(map, formMap[k])) return formMap[k];',
    '    var c = ruleCandidates(k);',
    '    for (var i = 0; i < c.length; i++) if (c[i].length >= 2 && own.call(map, c[i])) return c[i];',
    '    return null;',
    '  }',
    '  // the headword for a word as typed: itself, an irregular form (ran: run), or a regular one (cats: cat)',
    '  // checks the core curated bank first, then any lazily loaded extended letter shards.',
    '  function head(word) {',
    '    var k = key(word); if (!k) return null;',
    '    if (heads) {',
    '      var core = headIn(heads, forms, k);',
    '      if (core) return core;',
    '    }',
    '    var ext = headIn(extHeads, extForms, k);',
    '    if (ext) return ext;',
    '    if (heads && own.call(extForms, k) && own.call(heads, extForms[k])) return extForms[k];',
    '    return null;',
    '  }',
    "  var base = '';",
    "  try { var cs = root && root.document && root.document.currentScript; if (cs && cs.src) base = cs.src.replace(/[^/]*$/, ''); } catch (e) { base = ''; }",
    '  function fetchJsonFile(url, options) {',
    '    var o = options || {}, f = o.fetch || (root && root.fetch && root.fetch.bind(root));',
    "    if (!f) return Promise.reject(new Error('AlloVocabBank needs fetch'));",
    '    var b = o.base != null ? o.base : base;',
    '    var ms = o.timeoutMs > 0 ? o.timeoutMs : 15000;',
    "    var AC = (root && typeof root.AbortController === 'function') ? root.AbortController : (typeof AbortController === 'function' ? AbortController : null);",
    '    var startTimer = function (fn, delay) {',
    "      if (root && typeof root.setTimeout === 'function') return root.setTimeout(fn, delay);",
    "      return typeof setTimeout === 'function' ? setTimeout(fn, delay) : null;",
    '    };',
    '    var stopTimer = function (id) {',
    '      if (id == null) return;',
    "      if (root && typeof root.clearTimeout === 'function') { root.clearTimeout(id); return; }",
    "      if (typeof clearTimeout === 'function') clearTimeout(id);",
    '    };',
    '    var ctrl = AC ? new AC() : null, timer = null;',
    '    return new Promise(function (resolve, reject) {',
    '      timer = startTimer(function () {',
    '        if (ctrl) { try { ctrl.abort(); } catch (_) {} }',
    "        reject(new Error('AlloVocabBank: ' + url + ' timed out'));",
    '      }, ms);',
    '      Promise.resolve().then(function () {',
    '        return ctrl ? f(b + url, { signal: ctrl.signal }) : f(b + url);',
    '      }).then(function (r) {',
    "        if (!r || !r.ok) throw new Error('AlloVocabBank: ' + url + ' ' + (r ? r.status : 0));",
    "        if (typeof r.text === 'function') return r.text().then(function (t) { return JSON.parse(t.charCodeAt(0) === 0xFEFF ? t.slice(1) : t); });",
    '        return r.json();',
    '      }).then(function (j) {',
    '        stopTimer(timer);',
    '        resolve(j);',
    '      }, function (err) {',
    '        stopTimer(timer);',
    '        reject(err);',
    '      });',
    '    });',
    '  }',
    '  // fetches the core data files once; options.base (a folder URL) and options.fetch (a fetch function) are optional',
    '  function load(options) {',
    '    if (heads) return Promise.resolve(api);',
    '    if (pending) return pending;',
    '    var o = options || {}, f = o.fetch || (root && root.fetch && root.fetch.bind(root));',
    "    if (!f) return Promise.reject(new Error('AlloVocabBank.load needs fetch'));",
    '    pending = Promise.all(shards.map(function (s, i) {',
    '      return fetchJsonFile(s.url, o).then(function (j) { add(j, i + 1); });',
    "    })).then(function () { if (!heads) throw new Error('AlloVocabBank: data incomplete'); return api; }, function (e) { pending = null; throw e; });",
    '    return pending;',
    '  }',
    '  function extReady(shardKey) {',
    "    var k = String(shardKey == null ? '' : shardKey).trim().toLowerCase();",
    "    if (k !== 'phrases') k = k.charAt(0);",
    '    if (!own.call(extShards, k)) return true;',
    '    return !!extGot[k];',
    '  }',
    '  function loadExtKey(k, options) {',
    '    if (!own.call(extShards, k) || extGot[k]) return Promise.resolve(true);',
    '    if (extPending[k]) return extPending[k];',
    '    extPending[k] = fetchJsonFile(extShards[k].url, options).then(function (j) {',
    '      addExt(j, k);',
    '      delete extPending[k];',
    '      return true;',
    '    }, function () {',
    '      delete extPending[k];',
    '      return false;',
    '    });',
    '    return extPending[k];',
    '  }',
    '  function loadLetter(ch, options) {',
    "    var k = String(ch == null ? '' : ch).trim().toLowerCase().charAt(0);",
    '    if (!/^[a-z]$/.test(k)) return Promise.resolve(false);',
    '    return loadExtKey(k, options);',
    '  }',
    '  function loadPhrases(options) {',
    "    return loadExtKey('phrases', options);",
    '  }',
    '  function loadExtBatch(keys, options) {',
    '    var todo = keys.filter(function (k) { return own.call(extShards, k) && !extGot[k]; });',
    '    if (!todo.length) return Promise.resolve(true);',
    '    var cursor = 0, limit = Math.min(6, todo.length);',
    '    var workers = Array.from({ length: limit }, function () {',
    '      return (function next() {',
    '        if (cursor >= todo.length) return Promise.resolve();',
    '        var k = todo[cursor++];',
    '        return loadExtKey(k, options).then(next);',
    '      })();',
    '    });',
    '    return Promise.all(workers).then(function () { return true; });',
    '  }',
    '  function ensureForWords(wordList, options) {',
    '    var needed = Object.create(null);',
    '    (Array.isArray(wordList) ? wordList : []).forEach(function (raw) {',
    '      var k = key(raw);',
    '      if (!k) return;',
    "      if (k.indexOf(' ') >= 0) { needed.phrases = true; return; }",
    '      if (heads && headIn(heads, forms, k)) return;',
    '      var ch = k.charAt(0);',
    '      if (/^[a-z]$/.test(ch)) needed[ch] = true;',
    '    });',
    '    return loadExtBatch(Object.keys(needed), options);',
    '  }',
    '  function loadAllExtended(options) {',
    '    return loadExtBatch(Object.keys(extShards), options);',
    '  }',
    '  function sensesOf(word) {',
    '    var h = head(word);',
    '    if (!h) return [];',
    '    if (heads && own.call(heads, h)) return heads[h].slice();',
    '    if (own.call(extHeads, h)) return extHeads[h].slice();',
    '    return [];',
    '  }',
    '  function phraseSenses(phrase) {',
    "    var k = key(phrase).replace(/[-_]+/g, ' ').replace(/\\s+/g, ' ');",
    '    return (k && own.call(phraseHeads, k)) ? phraseHeads[k].slice() : [];',
    '  }',
    '  var api = {',
    '    version: ' + BANK_VERSION + ',',
    '    bytes: ' + bytes + ',',
    '    extBytes: ' + extBytes + ',',
    '    extTotalWords: ' + ((ext && ext.extTotalWords) || 0) + ',',
    '    credits: credits,',
    '    checking: ' + JSON.stringify(CHECKING) + ',',
    '    shards: shards,',
    '    extShards: extShards,',
    '    load: load,',
    '    add: add,',
    '    addExt: addExt,',
    '    extReady: extReady,',
    '    loadLetter: loadLetter,',
    '    loadPhrases: loadPhrases,',
    '    ensureForWords: ensureForWords,',
    '    loadAllExtended: loadAllExtended,',
    '    phraseSenses: phraseSenses,',
    '    ready: function () { return !!heads; },',
    '    has: function (word) { return head(word) != null; },',
    '    head: head,',
    '    senses: sensesOf,',
    '    sense: function (id) { return byId && own.call(byId, id) ? byId[id] : null; },',
    '    words: function () { return heads ? Object.keys(heads) : []; },',
    '    allWords: function () { var a = heads ? Object.keys(heads) : []; var b = Object.keys(extHeads); return b.length ? a.concat(b) : a; }',
    '  };',
    '  if (root) root.AlloVocabBank = api;',
    "  if (typeof module !== 'undefined' && module.exports) module.exports = api;",
    "})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));",
    '',
  ].join('\n');
}

// trims whole headwords (lowest priority first) until the shards fit the budget; distractors that pointed
// at a dropped sense are re-filled from the auto list
function fitBudget(made) {
  made.allEntries = made.entries.slice();
  let enc = encode(made);
  const total = () => enc.files.reduce((a, f) => a + f.bytes, 0);
  if (total() <= SIZE_BUDGET || process.env.VOCAB_NO_TRIM) return enc;
  const { entries } = made;
  let lo = 0, hi = entries.length;
  const keepN = (n) => {
    const kept = entries.slice(0, n); const ids = new Set(kept.flatMap((e) => e.senses.map((s) => s.id)));
    for (const e of kept) for (const s of e.senses) {
      // the built list minus words the trim dropped; an automatic list is topped up from the rest of its candidates
      let list = s.full.filter((id) => ids.has(id));
      if (!s.curDistractors) list = [...list, ...s.auto.map((x) => x.id).filter((id) => ids.has(id) && !list.includes(id) && !(s.dropDistractors || []).includes(id))];
      s.distractors = oneEach(list).slice(0, s.checked ? N_DISTRACTORS : N_DISTRACTORS_UNCHECKED);
    }
    return encode({ ...made, entries: kept });
  };
  // checked, unit, NAWL and built-in words are never trimmed
  const minN = entries.reduce((m, e, i) => (e.checked || !e.lists.has('common') || e.lists.size > 1 ? i + 1 : m), 0);
  lo = minN;
  while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); const t = keepN(mid).files.reduce((a, f) => a + f.bytes, 0); if (t <= SIZE_BUDGET) lo = mid; else hi = mid - 1; }
  // a checked sense keeps at least 4 of its chosen wrong answers: the common words it needs come back ahead of
  // the other trimmable words (the trim alone left a fifth of the K-3 senses with under 4), and the rest re-fit
  const need = new Set();
  for (let round = 0; round < 6; round++) {
    const kept = new Set(entries.slice(0, lo).map((e) => e.w)); const before = need.size;
    for (const e of entries.slice(0, lo)) for (const s of e.senses) if (s.curDistractors) {
      let have = s.full.filter((id) => kept.has(id.split('|')[0])).length;
      for (const id of s.full) { if (have >= 4) break; const w = id.split('|')[0]; if (!kept.has(w)) { need.add(w); kept.add(w); have++; } }
    }
    if (need.size === before) break;
    const front = entries.slice(0, minN), back = entries.slice(minN);
    entries.length = 0; entries.push(...front, ...back.filter((e) => need.has(e.w)), ...back.filter((e) => !need.has(e.w)));
    lo = minN + need.size; hi = entries.length;
    while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); const t2 = keepN(mid).files.reduce((x, f2) => x + f2.bytes, 0); if (t2 <= SIZE_BUDGET) lo = mid; else hi = mid - 1; }
  }
  made.entries = entries.slice(0, lo);
  enc = keepN(lo);
  made.trimmedTo = lo;
  return enc;
}

function outputs(opts) {
  const made = build(opts);
  const enc = fitBudget(made);
  const coreKeptWords = new Set(made.entries.map((e) => e.w));
  const ext = buildExtended(made, coreKeptWords);
  return { made, enc, ext, index: indexText(enc, ext) };
}

// ---- the curation view (what a checker reads) ---------------------------------------------------
function view(words, made) {
  const out = [];
  for (const w of words) {
    const e = made.byWord.get(w); if (!e) { out.push({ w, missing: true, plan: !!headwordPlan().find((r) => r.w === w) }); continue; }
    out.push({ w, s: e.senses.map((s) => ({ id: s.id, src: s.source[0], def: s.def, ex: s.example, raw: s.raw !== s.def ? s.raw : undefined, d: s.distractors.slice(0, 8).map((id) => { const d = made.sensesById.get(id); return d ? d.word + ': ' + d.def : id; }), dids: s.distractors.slice(0, 8), more: s.auto.length, bl: s.blanks.join(' ') })) });
  }
  return out;
}

function main(argv) {
  const flag = (k) => argv.includes(k);
  const val = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
  if (flag('--view')) {
    let ws = val('--view'); ws = ws.startsWith('@') ? readJson(ws.slice(1)) : ws.split(',');
    const made = build({ blanksFor: new Set(ws) });
    const t = JSON.stringify(view(ws, made), null, 0).replace(/\},\{"w"/g, '},\n{"w"');
    if (val('--out')) fs.writeFileSync(val('--out'), t); else process.stdout.write(t + '\n');
    return;
  }
  const { made, enc, ext, index } = outputs({ noAdjExtras: flag('--no-adj-extras') });
  const total = enc.files.reduce((a, f) => a + f.bytes, 0);
  const extFilesList = Object.values(ext.extFiles);
  const extBytes = extFilesList.reduce((a, f) => a + f.bytes, 0);
  const summary = {
    headwords: made.entries.length,
    senses: enc.senses,
    shards: enc.files.length,
    bytes: total,
    extWords: ext.extWordCount,
    extPhrases: ext.phraseCount,
    extTotalWords: ext.extTotalWords,
    extSenses: ext.extTotalSenses,
    extShards: extFilesList.length,
    extBytes,
    totalOfflineHeadwords: made.entries.length + ext.extWordCount,
    indexBytes: Buffer.byteLength(index),
    irregularForms: enc.forms,
    ...made.stats,
    distractors: made.dstats,
  };
  if (flag('--report')) { console.log(JSON.stringify(summary, null, 1)); return; }
  const want = new Map([
    [INDEX_FILE, index],
    ...enc.files.map((f) => [path.join(ROOT, f.url), f.text]),
    ...extFilesList.map((f) => [path.join(ROOT, f.url), f.text]),
  ]);
  if (flag('--check')) {
    const stale = [];
    for (const [f, t] of want) if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== t) stale.push(path.relative(ROOT, f));
    if (fs.existsSync(SHARD_DIR)) for (const n of fs.readdirSync(SHARD_DIR)) if (/^en-\d+\.json$/.test(n) && !want.has(path.join(SHARD_DIR, n))) stale.push('packets_vocab/' + n + ' (extra)');
    if (fs.existsSync(EXT_DIR)) for (const n of fs.readdirSync(EXT_DIR)) if (/^(?:[a-z]|phrases)\.json$/.test(n) && !want.has(path.join(EXT_DIR, n))) stale.push('packets_vocab_ext/' + n + ' (extra)');
    if (stale.length) { console.error('Packets vocabulary bank is stale: ' + stale.join(', ')); process.exitCode = 1; return; }
    console.log('Packets vocabulary bank is up to date (' + summary.headwords + ' core + ' + summary.extWords + ' ext words + ' + summary.extPhrases + ' phrases, ' + total + ' core bytes, ' + extBytes + ' ext bytes).');
    return;
  }
  fs.mkdirSync(SHARD_DIR, { recursive: true });
  fs.mkdirSync(EXT_DIR, { recursive: true });
  for (const n of fs.readdirSync(SHARD_DIR)) if (/^en-\d+\.json$/.test(n) && !want.has(path.join(SHARD_DIR, n))) fs.unlinkSync(path.join(SHARD_DIR, n));
  for (const n of fs.readdirSync(EXT_DIR)) if (/^(?:[a-z]|phrases)\.json$/.test(n) && !want.has(path.join(EXT_DIR, n))) fs.unlinkSync(path.join(EXT_DIR, n));
  for (const [f, t] of want) { const tmp = f + '.tmp'; fs.writeFileSync(tmp, t); fs.renameSync(tmp, f); }
  console.log(JSON.stringify(summary, null, 1));
}

module.exports = { inputs, build, outputs, senseCandidates, checkerCandidates, curateExtended, applySenseFixes, blankFitProblem, cleanDef, pastForm, formsOf, related, containsWordForm, jacc, contentStems, safety, HARD, SOFT, ruleBases, exclusionsFor, sharesSynset, CREDITS };
if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.stack || error.message); process.exitCode = 1; }
}
