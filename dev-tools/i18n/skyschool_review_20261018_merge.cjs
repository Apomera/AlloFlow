'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const crypto = require('crypto');
const root = path.resolve(__dirname, '../..');
const canonical = require('./skyschool_review_20261018_keys_en.json');
const keys = Object.keys(canonical);
const retired = [];
const held = ['acholi', 'chin_falam', 'chin_hakha', 'karen', 'lingala', 'marshallese', 'maay_maay'];
const slots = text => (text.match(/\{[^{}]+\}/g) || []).sort();
const digest = text => crypto.createHash('sha256').update(text).digest('hex');
const apply = process.argv.includes('--apply');
const check = process.argv.includes('--check');
const source = fs.readFileSync(path.join(root, 'stem_lab/stem_tool_flightsim.js'), 'utf8');
for (const key of keys) assert.ok(source.includes(key), 'Unreferenced key: ' + key);
if (process.argv.includes('--register')) {
  for (const dir of ['', 'desktop/web-app/public/']) {
    const file = path.join(root, dir + 'ui_strings.js');
    const raw = fs.readFileSync(file, 'utf8');
    const updated = mergedText(raw, canonical, file);
    assert.equal(fs.readFileSync(file, 'utf8'), raw, 'Concurrent registry edit');
    fs.writeFileSync(file, Buffer.from(updated, 'utf8'));
  }
  console.log('Registered ' + keys.length + ' SkySchool strings in both canonical registries.');
  process.exit(0);
}
for (const dir of ['', 'desktop/web-app/public/']) {
  const registry = JSON.parse(fs.readFileSync(path.join(root, dir + 'ui_strings.js'), 'utf8'));
  for (const [key, value] of Object.entries(canonical)) assert.equal(registry.stem.flightsim[key.slice(15)], value, key);
}
const locales = fs.readdirSync(path.join(root, 'lang')).filter(file => file.endsWith('.js'))
  .map(file => file.slice(0, -3)).filter(slug => !held.includes(slug)).sort();
assert.equal(locales.length, 56);
const records = [];
function mergedText(raw, overlay, slug) {
  const pack = JSON.parse(raw);
  const matches = [...raw.matchAll(/^    "flightsim": (\{)/gm)];
  assert.equal(matches.length, 1, slug + ': ambiguous flightsim block');
  const start = matches[0].index + matches[0][0].length - 1;
  let depth = 0, quoted = false, escaped = false, end = -1;
  for (let i = start; i < raw.length; i++) {
    const char = raw[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === '{') depth++;
    else if (char === '}' && --depth === 0) { end = i + 1; break; }
  }
  assert.ok(end > start, slug + ': unterminated block');
  const flight = JSON.parse(raw.slice(start, end));
  assert.deepEqual(flight, pack.stem.flightsim, slug + ': wrong flightsim block');
  for (const key of retired) {
    if (check) assert.equal(flight[key], undefined, slug + ': retired key remains ' + key);
    delete flight[key];
  }
  for (const [key, value] of Object.entries(overlay)) {
    const leaf = key.slice(15), current = flight[leaf];
    assert.ok(current === undefined || current === canonical[key] || current === value, slug + ': concurrent translation conflict ' + key);
    if (check) assert.equal(current, value, slug + ': missing pack value ' + key);
    flight[leaf] = value;
  }
  const newline = raw.includes('\r\n') ? '\r\n' : '\n';
  const replacement = JSON.stringify(flight, null, 2).replace(/\n/g, newline + '    ');
  return raw.slice(0, start) + replacement + raw.slice(end);
}
// Preflight every overlay and both packs before making any changes.
for (const slug of locales) {
  const overlay = JSON.parse(fs.readFileSync(path.join(__dirname, 'skyschool_review_20261018_translations', slug + '.json'), 'utf8'));
  assert.deepEqual(Object.keys(overlay).sort(), [...keys].sort(), slug + ': key set');
  for (const [key, value] of Object.entries(overlay)) {
    assert.equal(typeof value, 'string');
    assert.ok(value.trim() && !value.includes('\uFFFD') && value !== canonical[key], slug + ': empty, invalid Unicode or English filler');
    assert.deepEqual(slots(value), slots(canonical[key]), slug + ': placeholders ' + key);
  }
  const packs = ['lang', 'desktop/web-app/public/lang'].map(dir => {
    const file = path.join(root, dir, slug + '.js');
    const raw = fs.readFileSync(file, 'utf8');
    mergedText(raw, overlay, slug);
    return { file, hash: digest(raw) };
  });
  records.push({ slug, packs, overlay });
}
if (apply) for (const record of records) for (const pack of record.packs) {
  const raw = fs.readFileSync(pack.file, 'utf8');
  assert.equal(digest(raw), pack.hash, 'Concurrent pack edit: ' + pack.file);
  const merged = mergedText(raw, record.overlay, record.slug);
  if (digest(merged) !== pack.hash) fs.writeFileSync(pack.file, Buffer.from(merged, 'utf8'));
}
if (check) {
  const report = {
    activeKeys: keys.length, maintainedLocales: locales.length, translatedEntries: keys.length * locales.length,
    retiredKeys: retired,
    heldLocales: held, method: 'Agent-authored translations; exact keys, placeholders, nonempty text, Unicode, English-filler and pack-value checks. Not a native-speaker review.',
    checks: { canonicalRegistries: true, sourceReferences: true, exactPlaceholders: true, englishFiller: true, packValues: true },
    records: records.map(record => ({ locale: record.slug, rootSha256: record.packs[0].hash,
      publicSha256: record.packs[1].hash }))
  };
  assert.ok(report.records.every(record => record.rootSha256 === record.publicSha256), 'Mirror drift');
  report.checks.mirrorParity = true;
  const directory = path.join(root, 'reports/skyschool-review-2026-10-18');
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'localization-validation.json'), Buffer.from(JSON.stringify(report, null, 2) + '\n'));
}
console.log(JSON.stringify({ mode: apply ? 'apply' : check ? 'check' : 'preflight', keys: keys.length, locales: locales.length }));
