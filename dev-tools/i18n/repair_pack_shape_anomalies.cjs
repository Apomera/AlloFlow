#!/usr/bin/env node
'use strict';

// Repair exact, lossless pack-shape anomalies found by the runtime/catalog audit:
//   1. stem.on/stem.off were serialized as {"0":"O", ...} character maps.
//   2. The Amharic deployed mirror lost the {n} placeholder for one toast.
//   3. stem.volume_label was serialized as a {"0":"V", ...} character map
//      in three packs after its canonical source was normalized to a string.
//
// This is dry-run by default. It refuses unexpected drift or values, and only
// normalizes the exact shapes/strings named above.

const fs = require('node:fs');
const path = require('node:path');
const { LANGUAGE_CODES } = require('./main_ui_i18n_manifest.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const LANG_DIR = path.join(ROOT, 'lang');
const MIRROR_DIR = path.join(ROOT, 'desktop', 'web-app', 'public', 'lang');
const APPLY = process.argv.includes('--apply');
const GATE = process.argv.includes('--gate');
const JSON_OUTPUT = process.argv.includes('--json');
const QUIET = process.argv.includes('--quiet');

const AMHARIC_PLACEHOLDER_PATH = ['behavior_lens', 'toast', 'added_n_entries_to_abc_data'];
const AMHARIC_ROOT_VALUE = '{n} ግቤቶችን ወደ ABC ውሂብ ታክለዋል!';
const AMHARIC_MIRROR_VALUE = 'N ግቤቶችን ወደ ABC ውሂብ ታክለዋል!';
const EXPECTED_STATUS = { on: 'ON', off: 'OFF' };
const EXPECTED_LABELS = { volume_label: 'Volume' };

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function getDeep(target, parts) {
  return parts.reduce((value, key) => value == null ? undefined : value[key], target);
}

function setDeep(target, parts, value) {
  let cursor = target;
  for (let index = 0; index < parts.length - 1; index += 1) cursor = cursor[parts[index]];
  cursor[parts[parts.length - 1]] = value;
}

function charMapValue(value, expected) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const keys = Object.keys(value).sort((left, right) => Number(left) - Number(right));
  if (keys.length !== expected.length || keys.some((key, index) => key !== String(index))) return null;
  if (keys.some((key) => typeof value[key] !== 'string' || [...value[key]].length !== 1)) return null;
  const joined = keys.map((key) => value[key]).join('');
  return joined === expected ? joined : null;
}

function replaceFile(file, text) {
  const temporary = `${file}.shape-repair-${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, text, 'utf8');
    let lastError = null;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        fs.renameSync(temporary, file);
        return;
      } catch (renameError) {
        if (!['EPERM', 'EACCES', 'EBUSY', 'UNKNOWN'].includes(renameError.code)) throw renameError;
        lastError = renameError;
        try {
          fs.copyFileSync(temporary, file);
          return;
        } catch (copyError) {
          lastError = copyError;
          if (!['EPERM', 'EACCES', 'EBUSY', 'UNKNOWN'].includes(copyError.code)) throw copyError;
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 350);
        }
      }
    }
    throw lastError;
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function fail(message, code = 2) {
  if (JSON_OUTPUT) console.log(JSON.stringify({ errors: [message] }, null, 2));
  else console.error(`repair_pack_shape_anomalies: ${message}`);
  process.exit(code);
}

const errors = [];
const plans = [];
let totalStatusRepairs = 0;
let totalLabelRepairs = 0;
let totalMirrorRepairs = 0;

for (const slug of Object.keys(LANGUAGE_CODES)) {
  const rootFile = path.join(LANG_DIR, `${slug}.js`);
  const mirrorFile = path.join(MIRROR_DIR, `${slug}.js`);
  if (!fs.existsSync(rootFile) || !fs.existsSync(mirrorFile)) {
    errors.push(`${slug}: root or deployed pack is missing`);
    continue;
  }
  const rootText = fs.readFileSync(rootFile, 'utf8');
  const mirrorText = fs.readFileSync(mirrorFile, 'utf8');
  const root = readJson(rootFile);
  const mirror = readJson(mirrorFile);
  let mirrorRepair = false;

  if (slug === 'amharic' && rootText !== mirrorText) {
    const rootValue = getDeep(root, AMHARIC_PLACEHOLDER_PATH);
    const mirrorValue = getDeep(mirror, AMHARIC_PLACEHOLDER_PATH);
    if (rootValue === AMHARIC_ROOT_VALUE && mirrorValue === AMHARIC_MIRROR_VALUE) {
      setDeep(mirror, AMHARIC_PLACEHOLDER_PATH, rootValue);
      mirrorRepair = true;
    } else {
      errors.push(`${slug}: unexpected mirror drift at ${AMHARIC_PLACEHOLDER_PATH.join('.')}`);
    }
  } else if (rootText !== mirrorText) {
    errors.push(`${slug}: root/public mirror drift`);
  }

  let statusRepairs = 0;
  let labelRepairs = 0;
  for (const [key, expected] of Object.entries(EXPECTED_STATUS)) {
    const rootValue = root.stem && root.stem[key];
    const mirrorValue = mirror.stem && mirror.stem[key];
    const rootJoined = charMapValue(rootValue, expected);
    const mirrorJoined = charMapValue(mirrorValue, expected);
    const rootIsExpected = rootValue === expected;
    const mirrorIsExpected = mirrorValue === expected;
    if (!rootIsExpected && !rootJoined) errors.push(`${slug}: unexpected stem.${key} root value`);
    if (!mirrorIsExpected && !mirrorJoined) errors.push(`${slug}: unexpected stem.${key} mirror value`);
    if (rootJoined || mirrorJoined) {
      root.stem[key] = expected;
      mirror.stem[key] = expected;
      statusRepairs += 1;
    }
  }
  totalStatusRepairs += statusRepairs;
  for (const [key, expected] of Object.entries(EXPECTED_LABELS)) {
    const rootValue = root.stem && root.stem[key];
    const mirrorValue = mirror.stem && mirror.stem[key];
    const rootJoined = charMapValue(rootValue, expected);
    const mirrorJoined = charMapValue(mirrorValue, expected);
    if (rootJoined || mirrorJoined) {
      if (!rootJoined || !mirrorJoined) {
        errors.push(`${slug}: unexpected root/public drift at stem.${key}`);
      } else {
        root.stem[key] = expected;
        mirror.stem[key] = expected;
        labelRepairs += 1;
      }
    }
  }
  totalLabelRepairs += labelRepairs;
  if (mirrorRepair) totalMirrorRepairs += 1;
  if (statusRepairs || labelRepairs || mirrorRepair) plans.push({ slug, rootFile, mirrorFile, root, mirror, statusRepairs, labelRepairs, mirrorRepair });
}

if (errors.length) {
  if (JSON_OUTPUT) console.log(JSON.stringify({ errors }, null, 2));
  else {
    console.error(`repair_pack_shape_anomalies: ${errors.length} problem(s); nothing written.`);
    errors.slice(0, 80).forEach((error) => console.error(`  - ${error}`));
  }
  process.exit(1);
}

if (APPLY) {
  for (const plan of plans) {
    const output = JSON.stringify(plan.root, null, 2) + '\n';
    replaceFile(plan.rootFile, output);
    replaceFile(plan.mirrorFile, output);
  }
}

const report = {
  apply: APPLY,
  packCount: Object.keys(LANGUAGE_CODES).length,
  affectedPacks: plans.length,
  statusRepairs: totalStatusRepairs,
  labelRepairs: totalLabelRepairs,
  mirrorRepairs: totalMirrorRepairs,
  plans: Object.fromEntries(plans.map((plan) => [plan.slug, { statusRepairs: plan.statusRepairs, mirrorRepair: plan.mirrorRepair }])),
};

if (JSON_OUTPUT) console.log(JSON.stringify(report, null, 2));
else if (!QUIET) {
  console.log(`repair_pack_shape_anomalies: ${report.packCount} pack(s)`);
  console.log(`  Character-map status repairs: ${totalStatusRepairs}`);
  console.log(`  Character-map label repairs: ${totalLabelRepairs}`);
  console.log(`  Known mirror repairs: ${totalMirrorRepairs}`);
  console.log(`  ${APPLY ? `Wrote ${plans.length} repaired pack pair(s).` : 'Dry run only; pass --apply to write.'}`);
} else {
  console.log(`repair_pack_shape_anomalies: statusRepairs=${totalStatusRepairs}; labelRepairs=${totalLabelRepairs}; mirrorRepairs=${totalMirrorRepairs}; affectedPacks=${plans.length}; written=${APPLY ? plans.length : 0}`);
}

if (GATE && plans.length) {
  if (!APPLY) console.error(`repair_pack_shape_anomalies: gate failed with ${plans.length} pending repair(s); run with --apply first.`);
  process.exit(1);
}
