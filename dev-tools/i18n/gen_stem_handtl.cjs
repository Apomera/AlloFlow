'use strict';
// Generic tool-aware: node gen_tool.cjs <pack> <iso> <tool> <htModule.js>
// htModule exports { CORR:{}, HT:{} }. Reads tm_<tool>/<pack>.json + stem_<tool>_en.json.
const fs = require('fs');
const path = require('path');
const ROOT = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const [pack, iso, tool, htPath] = process.argv.slice(2);
const tm = require(path.join(ROOT, 'dev-tools/i18n/tm_' + tool + '/' + pack + '.json'));
const EN = require(path.join(ROOT, 'dev-tools/i18n/stem_' + tool + '_en.json'));
const { CORR = {}, HT = {} } = require(htPath);

const filled = Object.assign({}, tm.filled);
for (const k of Object.keys(CORR)) filled[k] = CORR[k];
const final = Object.assign({}, filled, HT);

const enKeys = Object.keys(EN);
const missing = enKeys.filter(k => !(k in final) || typeof final[k] !== 'string' || !final[k]);
const extra = Object.keys(final).filter(k => !(k in EN));
if (missing.length) { console.error('MISSING ' + missing.length + ':', missing.slice(0, 40)); process.exit(1); }
if (extra.length) { console.error('EXTRA ' + extra.length + ':', extra.slice(0, 40)); process.exit(1); }
console.log('OK all ' + enKeys.length + ' keys, 0 extra. (CORR ' + Object.keys(CORR).length + ', HT ' + Object.keys(HT).length + ')');

const out = {}; out[pack] = final;
fs.writeFileSync(path.join(ROOT, 'dev-tools/i18n/handtl_' + tool + '_' + iso + '.json'), JSON.stringify(out, null, 2) + '\n');
console.log('wrote handtl_' + tool + '_' + iso + '.json');
