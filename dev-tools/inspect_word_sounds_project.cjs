#!/usr/bin/env node
/**
 * Why won't this saved project open in Word Sounds?
 *
 * The player shows "Loading your words… ⏳" when it has no words to draw from,
 * and the only way to tell a missing pack from a pack the loader failed to
 * recognise is to look at the file. This reports, for every word-sounds
 * resource in a project JSON, exactly which hydration branch the app would
 * take and what it would end up holding.
 *
 * Usage: node dev-tools/inspect_word_sounds_project.cjs <project.json>
 */
const fs = require('fs');

const path = process.argv[2];
if (!path) { console.error('usage: inspect_word_sounds_project.cjs <project.json>'); process.exit(2); }

const raw = fs.readFileSync(path, 'utf8');
console.log('file:', path);
console.log('bytes:', raw.length.toLocaleString());

let doc;
try {
  doc = JSON.parse(raw);
} catch (e) {
  console.error('\nJSON DID NOT PARSE:', e.message);
  const m = /position (\d+)/.exec(e.message);
  if (m) {
    const at = Number(m[1]);
    console.error('context:', JSON.stringify(raw.slice(Math.max(0, at - 80), at + 80)));
  }
  process.exit(1);
}

const topKeys = Object.keys(doc);
console.log('top-level keys:', topKeys.join(', '));

// Word-sounds resources can sit in history, in generatedContent, or (for a
// bare resource export) be the document itself.
const candidates = [];
const pushIf = (obj, where) => {
  if (obj && typeof obj === 'object' && obj.type === 'word-sounds') candidates.push({ where, item: obj });
};
pushIf(doc, 'document root');
pushIf(doc.generatedContent, 'generatedContent');
(Array.isArray(doc.history) ? doc.history : []).forEach((h, i) => pushIf(h, `history[${i}]`));
(Array.isArray(doc.resources) ? doc.resources : []).forEach((h, i) => pushIf(h, `resources[${i}]`));

if (!candidates.length) {
  console.log('\nNo resource with type === "word-sounds" found.');
  console.log('history length:', Array.isArray(doc.history) ? doc.history.length : '(no history array)');
  const types = (Array.isArray(doc.history) ? doc.history : []).map((h) => h && h.type).filter(Boolean);
  if (types.length) console.log('history types present:', [...new Set(types)].join(', '));
  console.log('\n→ The player would open with nothing to load. This is the "Loading your words" state.');
  process.exit(0);
}

const isRef = (v) => typeof v === 'string' && /^(ref::|jsonref::)/.test(v);
const sizeOf = (v) => { try { return JSON.stringify(v).length; } catch (_) { return -1; } };

for (const { where, item } of candidates) {
  console.log('\n──────────────────────────────────────────────');
  console.log('word-sounds resource at', where);
  console.log('  id:', item.id, '| title:', item.title);
  console.log('  keys:', Object.keys(item).join(', '));

  const wsp = item.wsPreloadedWords;
  const data = item.data;
  const wspOk = Array.isArray(wsp) && wsp.length > 0;
  const dataOk = Array.isArray(data) && data.length > 0;

  console.log('  wsPreloadedWords:', Array.isArray(wsp) ? wsp.length + ' words' : (wsp === undefined ? 'ABSENT' : typeof wsp));
  console.log('  data:', Array.isArray(data) ? data.length + ' words' : (data === undefined ? 'ABSENT' : typeof data));

  // This mirrors AlloFlowANTI's restore branch and hydrateWordSoundsFromSync.
  console.log('\n  HYDRATION:');
  if (wspOk) console.log('    → branch 1: restores', wsp.length, 'words from wsPreloadedWords (ttsReady forced false)');
  else if (dataOk) console.log('    → branch 2: restores', data.length, 'words from data');
  else {
    console.log('    → NEITHER BRANCH FIRES. wsPreloadedWords is empty/absent AND data is not a non-empty array.');
    console.log('    → The modal opens with preloadedWords = [] and shows "Loading your words… ⏳".');
    console.log('    ★ This is the failure. The words are not in the file in a shape the loader reads.');
  }

  const words = wspOk ? wsp : (dataOk ? data : []);
  if (!words.length) continue;

  let noPhonemes = 0, refImages = 0, packEdited = 0, fallbackUsed = 0, ttsReadyTrue = 0;
  for (const w of words) {
    if (!w || !Array.isArray(w.phonemes) || !w.phonemes.length) noPhonemes++;
    if (isRef(w && w.image)) refImages++;
    if (w && w._packEdited) packEdited++;
    if (w && w._fallbackUsed) fallbackUsed++;
    if (w && w.ttsReady === true) ttsReadyTrue++;
  }
  console.log('\n  WORDS:');
  console.log('    first five:', words.slice(0, 5).map((w) => (w && (w.targetWord || w.word || w.term)) || '?').join(', '));
  console.log('    without phonemes:', noPhonemes, '/', words.length);
  console.log('    ttsReady true in file:', ttsReadyTrue, '(the restore path resets these to false regardless)');
  if (packEdited) console.log('    edited since preparation:', packEdited);
  if (fallbackUsed) console.log('    sounds estimated from spelling:', fallbackUsed);
  if (refImages) console.log('    images still stored as ref:: markers:', refImages);

  // Portable media rides on the FIRST item by convention.
  const head = words[0] || {};
  console.log('\n  PORTABLE MEDIA (carried on word[0]):');
  for (const key of ['_ttsAssets', '_decodingAssets', '_aacAssets']) {
    const v = head[key];
    if (v === undefined) { console.log('   ', key, 'ABSENT'); continue; }
    if (isRef(v)) {
      console.log('   ', key, 'is a REF STRING:', String(v).slice(0, 60));
      console.log('      ★ Externalized to session_assets and NOT resolved. Those docs live with the');
      console.log('        session that wrote them and expire on a TTL, so another session cannot');
      console.log('        rehydrate them. The pack has no portable audio here.');
      continue;
    }
    if (v && typeof v === 'object') {
      const keys = Object.keys(v);
      const bytes = sizeOf(v);
      console.log('   ', key, keys.length, 'entries,', bytes.toLocaleString(), 'bytes');
      const sample = keys.slice(0, 4);
      console.log('      keys:', sample.join(' | '));
      const bad = keys.filter((k) => {
        const a = v[k];
        const s = typeof a === 'string' ? a : (a && (a.base64 || a.data)) || '';
        return !s || (typeof s === 'string' && s.length < 32);
      });
      if (bad.length) console.log('      ★', bad.length, 'entrie(s) look empty or truncated:', bad.slice(0, 5).join(', '));
    }
  }
  console.log('\n  _studentPackVersion:', head._studentPackVersion === undefined ? 'ABSENT' : head._studentPackVersion);
  console.log('  activityItems on word[0]:',
    head.activityItems && typeof head.activityItems === 'object'
      ? Object.keys(head.activityItems).join(', ') || '(empty object)'
      : 'ABSENT');
}

console.log('\n──────────────────────────────────────────────');
console.log('Reminder: the player builds its queue from the pack when one is present,');
console.log('but glossaryTerms is what feeds wordPool. A pack-only project is normal.');
