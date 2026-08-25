#!/usr/bin/env node
'use strict';

// Replace one exact residual-English BehaviorLens description in eight packs.
// Every change is guarded by the complete current value; this is not a broad
// heuristic rewrite. The wording remains concise and follows each pack's
// existing terminology for parent-friendly behavior logging.
//
// Usage:
//   node dev-tools/i18n/fix_homelog_quality.cjs
//   node dev-tools/i18n/fix_homelog_quality.cjs --apply

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const LANG_DIR = path.join(ROOT, 'lang');
const MIRROR_DIR = path.join(ROOT, 'desktop', 'web-app', 'public', 'lang');
const APPLY = process.argv.includes('--apply');
const KEY = 'homelog_desc';
const FIXES = {
  amharic: {
    old: 'Simplified ወላጅ-ወዳጃዊ ባህሪ logging ከ everyday ቋንቋ',
    next: 'ቀላል እና ለወላጆች ምቹ የባህሪ መዝገብ በዕለታዊ ቋንቋ',
  },
  burmese: {
    old: 'Simplified မိဘ-ဖော်ရွေ အပြုအမူ logging ဖြင့် everyday ဘာသာစကား',
    next: 'ရိုးရှင်းပြီး မိဘများအတွက် အဆင်ပြေသော အပြုအမူမှတ်တမ်းကို နေ့စဉ်သုံး ဘာသာစကားဖြင့်',
  },
  khmer: {
    old: 'Simplified ឪពុកម្តាយ-រួសរាយ អាកប្បកិរិយា logging ជាមួយ everyday ភាសា',
    next: 'កំណត់ត្រាអាកប្បកិរិយាដែលសាមញ្ញ និងងាយស្រួលសម្រាប់ឪពុកម្តាយ ដោយប្រើភាសាប្រចាំថ្ងៃ',
  },
  korean: {
    old: 'Simplified 학부모-친근 행동 logging 함께 everyday 언어',
    next: '간단하고 학부모에게 친근한 행동 기록을 일상적인 언어로',
  },
  nepali: {
    old: 'Simplified अभिभावक-मैत्रीपूर्ण व्यवहार logging सँग everyday भाषा',
    next: 'सरल र अभिभावक-मैत्रीपूर्ण व्यवहार अभिलेख, दैनिक भाषामा',
  },
  punjabi: {
    old: 'Simplified ਮਾਪੇ-ਦੋਸਤਾਨਾ ਵਿਵਹਾਰ logging ਨਾਲ everyday ਭਾਸ਼ਾ',
    next: 'ਸਧਾਰਨ, ਮਾਪਿਆਂ ਲਈ ਸੁਖਾਲੀ ਵਿਹਾਰ ਦਰਜਬੰਦੀ ਰੋਜ਼ਾਨਾ ਦੀ ਭਾਸ਼ਾ ਵਿੱਚ',
  },
  tamil: {
    old: 'Simplified பெற்றோர்-நட்பான நடத்தை logging உடன் everyday மொழி',
    next: 'எளிமையான, பெற்றோருக்கு ஏற்ற நடத்தைப் பதிவு அன்றாட மொழியில்',
  },
  telugu: {
    old: 'Simplified తల్లిదండ్రి-స్నేహపూర్వక ప్రవర్తన logging తో everyday భాష',
    next: 'సరళమైన, తల్లిదండ్రులకు అనుకూలమైన ప్రవర్తన నమోదు రోజువారీ భాషలో',
  },
};

function readPack(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function replaceFile(file, text) {
  const temporary = `${file}.homelog-quality-${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, text, 'utf8');
    fs.renameSync(temporary, file);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

const errors = [];
let changed = 0;
for (const [slug, { old, next }] of Object.entries(FIXES)) {
  const rootFile = path.join(LANG_DIR, `${slug}.js`);
  const mirrorFile = path.join(MIRROR_DIR, `${slug}.js`);
  if (!fs.existsSync(rootFile) || !fs.existsSync(mirrorFile)) {
    errors.push(`${slug}: missing root or deployed pack`);
    continue;
  }
  const rootText = fs.readFileSync(rootFile, 'utf8');
  const mirrorText = fs.readFileSync(mirrorFile, 'utf8');
  if (rootText !== mirrorText) {
    errors.push(`${slug}: root/public mirror drift; refusing to overwrite`);
    continue;
  }
  const pack = readPack(rootFile);
  const current = pack?.behavior_lens?.hub?.[KEY];
  if (current !== old && current !== next) {
    errors.push(`${slug}: current value changed unexpectedly: ${JSON.stringify(current)}`);
    continue;
  }
  if (current === next) continue;
  changed += 1;
  if (APPLY) {
    pack.behavior_lens.hub[KEY] = next;
    const output = JSON.stringify(pack, null, 2) + '\n';
    JSON.parse(output);
    replaceFile(rootFile, output);
    replaceFile(mirrorFile, output);
  }
  console.log(`  ${APPLY ? 'fixed' : 'would fix'} ${slug}`);
}

if (errors.length) {
  console.error(`fix_homelog_quality: ${errors.length} problem(s); nothing written.`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`fix_homelog_quality: ${changed} explicit correction(s)${APPLY ? ' applied' : ' pending'}.`);
