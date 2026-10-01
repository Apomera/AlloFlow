'use strict';
const fs = require('node:fs');
const crypto = require('node:crypto');
const source = fs.readFileSync('word_sounds_core.js', 'utf8');
const sha256 = crypto.createHash('sha256').update(source).digest('hex');
const core = new Function(source + '\nreturn createWordSoundsCore();')();
const terms = ['constructor', '__proto__', 'tostring'];
const results = terms.map(term => {
  try { return { term, task: core.resolveManipulationTask(term, null, 'en') }; }
  catch (error) { return { term, error: error.message }; }
});
fs.writeFileSync(__dirname + '/word-sounds-inherited-term-check.json', JSON.stringify({ at: new Date().toISOString(), sha256, results }, null, 2) + '\n');
console.log(JSON.stringify(results));
