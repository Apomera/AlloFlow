#!/usr/bin/env node
'use strict';

/**
 * Wave-5 portfolio punctuation, grammar & precision polish:
 * 1. Eliminate ALL remaining corrupted ?quote? mojibake across the entire
 *    15,980-item + 31-library portfolio:
 *    - test_prep/eppp_learning_library.json (4 knowledgeChecks in both chapters[] & top-level)
 *    - test_prep/eppp_knowledge_check_review_wave_02.json (matching 4 wave-02 review records)
 *    - test_prep/eppp_native_items.json + test_prep/eppp_part_one_pack.json +
 *      dev-tools/eppp_native_quality_wave_12_data.cjs (eppp-b020-intervention-2)
 *    - test_prep/reading_specialist_5302_pack.json (4 source items: 141, 159, 162, 196)
 * 2. audiology_5343_learning_library.json (aud5343-ch-01-check-01): fix subject-verb
 *    agreement between singular "the ossicular chain" and plural "They..." choices.
 * 3. parapro_learning_library.json:
 *    - parapro-ch-06-section-2: "2a squared and the square of 2a" -> "2a² and (2a)²"
 *    - parapro-ch-09-check-2: "In The box of books is heavy, why is is singular?" ->
 *      "In “The box of books is heavy,” why is “is” singular?"
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const TP = path.join(ROOT, 'test_prep');

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function writeJson(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8'); }

function fixEpppQuotes(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/\?unavoidable\?/g, '“unavoidable”')
    .replace(/\?pseudodementia\?/g, '“pseudodementia”')
    .replace(/\?hot\?/g, '“hot”')
    .replace(/\?double-blind\?/g, '“double-blind”');
}

const summary = [];

// 1a. eppp_learning_library.json
{
  const p = path.join(TP, 'eppp_learning_library.json');
  const lib = readJson(p);
  let count = 0;
  const patchKc = (kc) => {
    for (const field of ['rationale', 'reviewNote']) {
      if (typeof kc[field] === 'string') {
        const next = fixEpppQuotes(kc[field]);
        if (next !== kc[field]) { kc[field] = next; count += 1; }
      }
    }
  };
  for (const ch of lib.chapters || []) for (const kc of ch.knowledgeChecks || []) patchKc(kc);
  for (const kc of lib.knowledgeChecks || []) patchKc(kc);
  writeJson(p, lib);
  summary.push(`eppp_learning_library.json: ${count} field updates`);
}

// 1b. eppp_knowledge_check_review_wave_02.json
{
  const p = path.join(TP, 'eppp_knowledge_check_review_wave_02.json');
  const wave = readJson(p);
  let count = 0;
  for (const item of wave.items || []) {
    for (const field of ['rationale', 'reviewNote']) {
      if (typeof item[field] === 'string') {
        const next = fixEpppQuotes(item[field]);
        if (next !== item[field]) { item[field] = next; count += 1; }
      }
    }
  }
  writeJson(p, wave);
  summary.push(`eppp_knowledge_check_review_wave_02.json: ${count} field updates`);
}

// 1c. eppp-b020-intervention-2 across eppp_native_items.json, eppp_part_one_pack.json, and wave 12 data
{
  const oldFrag = '?A mistake proves I am worthless,?';
  const newFrag = '“A mistake proves I am worthless,”';

  const nativePath = path.join(TP, 'eppp_native_items.json');
  const nativeItems = readJson(nativePath);
  const nItem = nativeItems.find((x) => x.id === 'eppp-b020-intervention-2');
  if (nItem && nItem.prompt.includes(oldFrag)) {
    nItem.prompt = nItem.prompt.replace(oldFrag, newFrag);
    writeJson(nativePath, nativeItems);
    summary.push('eppp_native_items.json: 1 update (eppp-b020-intervention-2)');
  }

  const packPath = path.join(TP, 'eppp_part_one_pack.json');
  const pack = readJson(packPath);
  const pItem = (pack.items || []).find((x) => x.id === 'eppp-b020-intervention-2');
  if (pItem && pItem.prompt.includes(oldFrag)) {
    pItem.prompt = pItem.prompt.replace(oldFrag, newFrag);
    writeJson(packPath, pack);
    summary.push('eppp_part_one_pack.json: 1 update (eppp-b020-intervention-2)');
  }

  const w12Path = path.join(ROOT, 'dev-tools', 'eppp_native_quality_wave_12_data.cjs');
  const w12Raw = fs.readFileSync(w12Path, 'utf8');
  if (w12Raw.includes(oldFrag)) {
    fs.writeFileSync(w12Path, w12Raw.replace(oldFrag, newFrag), 'utf8');
    summary.push('dev-tools/eppp_native_quality_wave_12_data.cjs: 1 update');
  }
}

// 1d. reading_specialist_5302_pack.json (4 source items: 141, 159, 162, 196)
{
  const p = path.join(TP, 'reading_specialist_5302_pack.json');
  const pack = readJson(p);
  const replacements = new Map([
    ['read5302-b2-042', ['?use a strategy?', '“use a strategy”']],
    ['read5302-b2-060', ['?map.?', '“map.”']],
    ['read5302-b2-063', ['?jumped? as ?jumpt? and ?running? as ?runing.?', '“jumped” as “jumpt” and “running” as “runing.”']],
    ['read5302-b2-097', ['?research based.?', '“research based.”']],
  ]);
  let count = 0;
  for (const item of pack.items || []) {
    const pair = replacements.get(item.id);
    if (pair && item.prompt.includes(pair[0])) {
      item.prompt = item.prompt.replace(pair[0], pair[1]);
      count += 1;
    }
  }
  writeJson(p, pack);
  summary.push(`reading_specialist_5302_pack.json: ${count} source prompt updates`);
}

// 2. audiology_5343_learning_library.json (aud5343-ch-01-check-01)
{
  const p = path.join(TP, 'audiology_5343_learning_library.json');
  const lib = readJson(p);
  const chk = lib.chapters[0].knowledgeChecks.find((c) => c.id === 'aud5343-ch-01-check-01');
  if (!chk) throw new Error('aud5343-ch-01-check-01 not found');
  chk.choices = [
    'It transforms acoustic energy and improves impedance matching between ear-canal air and cochlear fluid.',
    'It generates electrical action potentials directly and sends them along the eighth nerve to the brainstem.',
    'It decodes complex speech phonology and extracts word meaning before signals reach the auditory cortex.',
    'It pumps ions across cochlear membranes to equalize endolymph and perilymph chemical concentrations.',
  ];
  writeJson(p, lib);
  summary.push('audiology_5343_learning_library.json: 1 check updated (aud5343-ch-01-check-01)');
}

// 3. parapro_learning_library.json
{
  const p = path.join(TP, 'parapro_learning_library.json');
  const lib = readJson(p);
  const sec62 = lib.chapters[5].sections[1];
  if (sec62 && sec62.id === 'parapro-ch-06-section-2') {
    sec62.content = sec62.content.replace('2a squared and the square of 2a', '2a² and (2a)²');
  }
  const chk92 = lib.chapters[8].knowledgeChecks[1];
  if (chk92 && chk92.id === 'parapro-ch-09-check-2') {
    chk92.prompt = 'In “The box of books is heavy,” why is “is” singular?';
  }
  writeJson(p, lib);
  summary.push('parapro_learning_library.json: 2 updates (parapro-ch-06-section-2, parapro-ch-09-check-2)');
}

console.log('Wave-5 portfolio polish complete:');
for (const line of summary) console.log(' -', line);
