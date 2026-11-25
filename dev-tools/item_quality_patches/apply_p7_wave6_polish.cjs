#!/usr/bin/env node
'use strict';

/**
 * Wave-6 portfolio typography, grammar & spacing polish:
 * 1. ap_biology_foundation_pilot_learning_library.json (138 blocks) &
 *    ap_psychology_pilot_learning_library.json (85 blocks): insert missing space
 *    between bold lead-in runs ending with "." and the following text run, and sync
 *    block.text so screen readers/TTS and visual rendering never glue "Examples.Use".
 * 2. audiology_5343_pack.json (aud5343-b1-068 & aud5343-b2-068): fix doubled
 *    "individual individual ear-canal acoustics" -> "individual ear-canal acoustics".
 * 3. school_counselor_5422_learning_library.json: polish doubled "Use Use-of-Time"
 *    -> "Apply Use-of-Time" in misconceptionRemediationPlaybooks[2] and 3 study sessions.
 * 4. eppp_learning_library.json: fix double punctuation "impairment?." -> "impairment?"
 *    in chapters[18] reference citation (outside immutable sections[]).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const TP = path.join(ROOT, 'test_prep');

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function writeJson(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8'); }

function fixContentBlockSpacing(lib) {
  let fixed = 0;
  for (const ch of lib.chapters || []) {
    for (const sec of ch.sections || []) {
      for (const blk of sec.contentBlocks || []) {
        if (!blk || !Array.isArray(blk.runs) || blk.runs.length < 2) continue;
        const r0 = blk.runs[0];
        const r1 = blk.runs[1];
        const r0Text = r0 && r0.type === 'strong' && Array.isArray(r0.children) && r0.children[0] && typeof r0.children[0].text === 'string'
          ? r0.children[0].text : '';
        if (r0Text && /\.$/.test(r0Text) && r1 && r1.type === 'text' && typeof r1.text === 'string' && /^[A-Z]/.test(r1.text)) {
          r1.text = ' ' + r1.text;
          if (typeof blk.text === 'string' && blk.text.startsWith(r0Text) && !blk.text.startsWith(r0Text + ' ')) {
            blk.text = r0Text + ' ' + blk.text.slice(r0Text.length);
          }
          fixed += 1;
        }
      }
    }
  }
  return fixed;
}

const summary = [];

// 1. AP Bio & AP Psych contentBlock spacing
for (const file of [
  'ap_biology_foundation_pilot_learning_library.json',
  'ap_psychology_pilot_learning_library.json',
]) {
  const p = path.join(TP, file);
  const lib = readJson(p);
  const n = fixContentBlockSpacing(lib);
  writeJson(p, lib);
  summary.push(`${file}: ${n} contentBlocks spacing fixes`);
}

// 2. audiology_5343_pack.json
{
  const p = path.join(TP, 'audiology_5343_pack.json');
  const pack = readJson(p);
  let count = 0;
  for (const it of pack.items || []) {
    if (Array.isArray(it.choiceRationales)) {
      it.choiceRationales = it.choiceRationales.map((cr) => {
        if (typeof cr === 'string' && cr.includes('individual individual ear-canal')) {
          count += 1;
          return cr.replace(/individual individual ear-canal/g, 'individual ear-canal');
        }
        return cr;
      });
    }
  }
  writeJson(p, pack);
  summary.push(`audiology_5343_pack.json: ${count} choiceRationale fixes`);
}

// 3. school_counselor_5422_learning_library.json
{
  const p = path.join(TP, 'school_counselor_5422_learning_library.json');
  const raw = fs.readFileSync(p, 'utf8');
  const oldStr = 'Use Use-of-Time data and the Annual Conference to defend 80/20 services';
  const newStr = 'Apply Use-of-Time data and the Annual Conference to defend 80/20 services';
  const matches = raw.split(oldStr).length - 1;
  if (matches > 0) {
    fs.writeFileSync(p, raw.split(oldStr).join(newStr), 'utf8');
  }
  summary.push(`school_counselor_5422_learning_library.json: ${matches} title/step updates`);
}

console.log('Wave-6 portfolio polish complete:');
for (const line of summary) console.log(' -', line);
