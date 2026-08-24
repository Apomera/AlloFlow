#!/usr/bin/env node
/**
 * Split audio_bank.json into per-category files under audio_bank/ plus an
 * index, and mirror the results to desktop/web-app/public/.
 *
 * Why: the whole bank is ~15 MB with a single 10.8 MB 'words' category, and
 * it used to download and JSON.parse on every boot. The app's split loader
 * (AlloFlowANTI.txt, _requestAudioCategory) fetches one category on first
 * getAudio() demand and falls back to the legacy whole file if audio_bank/
 * is unreachable, so audio_bank.json itself STAYS deployed and must remain
 * the source of truth. Re-run this script after any change to audio_bank.json.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'audio_bank.json');
const TARGETS = [
    path.join(ROOT, 'audio_bank'),
    path.join(ROOT, 'desktop', 'web-app', 'public', 'audio_bank'),
];

const bank = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
const categories = Object.keys(bank);
const index = { generatedFrom: 'audio_bank.json', categories: {} };

for (const dir of TARGETS) fs.mkdirSync(dir, { recursive: true });

for (const category of categories) {
    const body = JSON.stringify(bank[category]);
    index.categories[category] = {
        keys: Object.keys(bank[category]).length,
        bytes: Buffer.byteLength(body),
    };
    for (const dir of TARGETS) fs.writeFileSync(path.join(dir, category + '.json'), body);
}
const indexBody = JSON.stringify(index, null, 2) + '\n';
for (const dir of TARGETS) fs.writeFileSync(path.join(dir, 'index.json'), indexBody);

// Verify: reassembling the split files must reproduce the source bank exactly.
const rebuilt = {};
for (const category of categories) {
    rebuilt[category] = JSON.parse(fs.readFileSync(path.join(TARGETS[0], category + '.json'), 'utf8'));
}
const same = JSON.stringify(rebuilt) === JSON.stringify(bank);
if (!same) {
    console.error('[split_audio_bank] VERIFICATION FAILED: reassembled bank differs from source.');
    process.exit(1);
}
console.log('[split_audio_bank] Split', categories.length, 'categories into', TARGETS.length, 'trees; reassembly verified.');
for (const category of categories) {
    console.log('  ' + category + ': ' + index.categories[category].keys + ' keys, ' + (index.categories[category].bytes / 1048576).toFixed(2) + ' MB');
}
