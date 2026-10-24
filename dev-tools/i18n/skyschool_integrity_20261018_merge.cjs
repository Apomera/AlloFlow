'use strict';
// Update one existing mission criterion without rewriting unrelated translations.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const data = require('./skyschool_integrity_20261018_translations.json');
const key = data.key, leaf = key.slice('stem.flightsim.'.length);
const held = ['acholi', 'chin_falam', 'chin_hakha', 'karen', 'lingala', 'marshallese', 'maay_maay'];
const apply = process.argv.includes('--apply'), check = process.argv.includes('--check');
assert.ok(!(apply && check), 'Choose apply or check');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const slots = value => (value.match(/\{[^{}]+\}/g) || []).sort();
const reportDir = path.join(root, 'reports/skyschool-integrity-2026-10-18');
const baselineFile = path.join(reportDir, 'localization-baseline.json');
const maintained = fs.readdirSync(path.join(root, 'lang')).filter(file => file.endsWith('.js'))
  .map(file => file.slice(0, -3)).filter(locale => !held.includes(locale)).sort();
assert.equal(maintained.length, 56);
assert.deepEqual(Object.keys(data.translations).sort(), maintained);
assert.deepEqual(slots(data.english), ['{distance}', '{fpm}', '{speed}', '{target}']);
const plan = [];
function prepare(relative, previous, value, format) {
  const file = path.join(root, relative), raw = fs.readFileSync(file, 'utf8');
  let next;
  if (format === 'block') {
    const parsed = JSON.parse(raw);
    const prior = parsed.flightsim[leaf];
    assert.ok(prior === undefined || prior === previous || prior === value, relative + ': concurrent value');
    if (check) assert.equal(prior, value, relative + ': missing criterion');
    parsed.flightsim[leaf] = value;
    const newline = raw.includes('\r\n') ? '\r\n' : '\n';
    next = JSON.stringify(parsed, null, 2).replace(/\n/g, newline) + newline;
  } else {
    const field = format === 'overlay' ? key : leaf;
    const pattern = new RegExp('^(\\s*"' + field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '": )("(?:[^"\\\\]|\\\\.)*")(,?)(\\r?)$', 'gm');
    const matches = [...raw.matchAll(pattern)];
    assert.equal(matches.length, 1, relative + ': ambiguous key');
    const current = JSON.parse(matches[0][2]);
    assert.ok(current === previous || current === value, relative + ': concurrent value');
    if (check) assert.equal(current, value, relative + ': criterion drift');
    next = raw.replace(pattern, (_all, prefix, _old, comma, cr) => prefix + JSON.stringify(value) + comma + cr);
  }
  JSON.parse(next);
  // Retain compact UTF-8 bytes rather than ropes that keep both large input
  // and output strings alive while preflighting the language packs.
  plan.push({ file, relative, rawHash: digest(raw), next: Buffer.from(next, 'utf8') });
}
prepare('dev-tools/i18n/skyschool_missions_20261018_keys_en.json', data.previousEnglish, data.english, 'overlay');
prepare('dev-tools/stem_i18n_report/ui_strings_stem_flightsim.json', data.previousEnglish, data.english, 'block');
for (const prefix of ['', 'desktop/web-app/public/']) prepare(prefix + 'ui_strings.js', data.previousEnglish, data.english);
for (const locale of maintained) {
  const entry = data.translations[locale];
  assert.equal(typeof entry.value, 'string', locale);
  assert.ok(entry.value.trim() && !entry.value.includes('\uFFFD') && entry.value !== data.english, locale + ': invalid text or English filler');
  assert.deepEqual(slots(entry.value), slots(data.english), locale + ': placeholders');
  assert.ok(entry.value.includes(' kt') && entry.value.includes(' fpm') && entry.value.includes(' nm'), locale + ': simulation units');
  prepare('dev-tools/i18n/skyschool_missions_20261018_translations/' + locale + '.json', entry.previous, entry.value, 'overlay');
  for (const prefix of ['', 'desktop/web-app/public/']) prepare(prefix + 'lang/' + locale + '.js', entry.previous, entry.value);
}
const heldFiles = held.flatMap(locale => ['', 'desktop/web-app/public/'].map(prefix => {
  const relative = prefix + 'lang/' + locale + '.js';
  return { relative, sha256: digest(fs.readFileSync(path.join(root, relative))) };
}));
if (apply) {
  fs.mkdirSync(reportDir, { recursive: true });
  if (!fs.existsSync(baselineFile)) fs.writeFileSync(baselineFile, Buffer.from(JSON.stringify({ heldFiles }, null, 2) + '\n'));
  // All strings and destinations are validated before writing the first file.
  for (const item of plan) {
    assert.equal(digest(fs.readFileSync(item.file)), item.rawHash, 'Concurrent file edit: ' + item.relative);
    if (digest(item.next) !== item.rawHash) fs.writeFileSync(item.file, item.next);
  }
}
if (check) {
  const baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
  assert.deepEqual(heldFiles, baseline.heldFiles, 'Existing language holds changed');
  const source = fs.readFileSync(path.join(root, 'stem_lab/stem_tool_flightsim.js'), 'utf8');
  assert.ok(source.includes(data.key) && source.includes(data.english), 'Simulator fallback does not match canonical criterion');
  const records = maintained.map(locale => {
    const rootBytes = fs.readFileSync(path.join(root, 'lang/' + locale + '.js'));
    const publicBytes = fs.readFileSync(path.join(root, 'desktop/web-app/public/lang/' + locale + '.js'));
    assert.equal(digest(rootBytes), digest(publicBytes), locale + ': mirror drift');
    return { locale, rootSha256: digest(rootBytes), publicSha256: digest(publicBytes) };
  });
  const report = { key, canonicalEnglish: data.english, maintainedLocales: maintained.length, translatedEntries: maintained.length,
    heldLocales: held, checks: { sourceFallback: true, canonicalRegistries: true, stemRegistry: true, canonicalMissionOverlays: true,
      exactPlaceholders: true, nonemptyText: true, unicode: true, noEnglishFillers: true, mirrorParity: true, heldFilesUnchanged: true },
    method: 'Agent-authored working translations distinguish ground speed from vertical descent rate. Native-speaker review has not been performed.', records };
  fs.writeFileSync(path.join(reportDir, 'localization-validation.json'), Buffer.from(JSON.stringify(report, null, 2) + '\n'));
}
console.log(JSON.stringify({ mode: apply ? 'apply' : check ? 'check' : 'preflight', keys: 1, locales: maintained.length, plannedFiles: plan.length }));
