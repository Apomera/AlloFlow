#!/usr/bin/env node
'use strict';
// Machine Lab translation-key hygiene.
//
//   node dev-tools/ml_i18n_hygiene.cjs [file...]
//
// The tool carries ~860 translatable strings written as __alloT(key, english).
// Four things can go wrong in a way no rendering test notices, because the
// English fallback keeps the screen looking right while the translated build
// is broken:
//
//   1. a call with no English fallback  -> every pack that lacks the key shows
//      the raw key to the learner;
//   2. a key outside the stem.machinelab. namespace -> the pack pipeline never
//      collects it, so it is never translated;
//   3. one key used with two different English strings -> a pack can hold only
//      one of them, so one of the two screens is wrong in every language;
//   4. a fallback that is blank or only whitespace -> there is nothing for a
//      translator to translate, and nothing to show if the key is missing.
//
// checkSource() is exported so a test can run it on this file AND on a sample
// that is known to be bad: a gate that has never failed is not a gate.

function checkSource(src, label) {
  var where = label || 'source';
  var problems = [];
  var seen = new Map();
  var i = 0;
  var CALL = '__alloT(';
  while (true) {
    var at = src.indexOf(CALL, i);
    if (at === -1) break;
    i = at + CALL.length;
    // Walk to the matching close paren, tracking quotes and escapes, so that a
    // comma or a paren inside a string is not read as syntax.
    var j = i, depth = 1, quote = null, args = [], buf = '';
    while (j < src.length && depth > 0) {
      var c = src[j];
      if (quote) {
        if (c === '\\') { buf += c + src[j + 1]; j += 2; continue; }
        if (c === quote) quote = null;
        buf += c;
      } else if (c === '\'' || c === '"' || c === '`') {
        quote = c; buf += c;
      } else if (c === '(') { depth++; buf += c; }
      else if (c === ')') {
        depth--;
        if (depth === 0) break;
        buf += c;
      } else if (c === ',' && depth === 1) { args.push(buf); buf = ''; }
      else buf += c;
      j++;
    }
    args.push(buf);
    var line = src.slice(0, at).split('\n').length;
    var keyRaw = (args[0] || '').trim();
    var key = /^'([^']*)'$|^"([^"]*)"$/.exec(keyRaw);
    key = key ? (key[1] != null ? key[1] : key[2]) : null;

    if (args.length < 2) {
      problems.push(where + ':' + line + ' __alloT(' + keyRaw.slice(0, 60) + ') has no English fallback');
      continue;
    }
    if (key == null) continue;            // a computed key: nothing to check here
    if (key.indexOf('stem.machinelab.') !== 0) {
      problems.push(where + ':' + line + ' key "' + key + '" is outside the stem.machinelab. namespace');
    }
    var fbRaw = (args[1] || '').trim();
    var fb = /^'((?:[^'\\]|\\.)*)'$|^"((?:[^"\\]|\\.)*)"$/.exec(fbRaw);
    if (!fb) continue;                    // a computed fallback: leave it alone
    var text = fb[1] != null ? fb[1] : fb[2];
    if (!text.trim()) {
      problems.push(where + ':' + line + ' key "' + key + '" has a blank English string (' + JSON.stringify(text) + ')');
    }
    if (!seen.has(key)) seen.set(key, { text: text, line: line });
    else if (seen.get(key).text !== text) {
      problems.push(where + ':' + line + ' key "' + key + '" is also used at line ' + seen.get(key).line +
        ' with different English:\n      "' + seen.get(key).text.slice(0, 70) + '"\n      "' + text.slice(0, 70) + '"');
    }
  }
  return { keys: seen.size, problems: problems };
}

module.exports = { checkSource: checkSource };

if (require.main === module) {
  var fs = require('fs');
  var files = process.argv.slice(2);
  if (!files.length) files = ['stem_lab/stem_tool_machinelab.js'];
  var failed = 0, total = 0;
  files.forEach(function (f) {
    var res = checkSource(fs.readFileSync(f, 'utf8'), f);
    total += res.keys;
    if (res.problems.length) {
      failed += res.problems.length;
      console.log('FAIL ' + f + ' (' + res.keys + ' keys)');
      res.problems.forEach(function (p) { console.log('  ' + p); });
    } else {
      console.log('ok   ' + f + ' (' + res.keys + ' keys)');
    }
  });
  console.log('\n' + total + ' keys checked, ' + failed + ' problem' + (failed === 1 ? '' : 's'));
  process.exit(failed ? 2 : 0);
}
