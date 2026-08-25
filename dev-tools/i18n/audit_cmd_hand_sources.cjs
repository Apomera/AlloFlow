'use strict';

// Audit the reviewed, locally authored command-palette hand-translation
// batches against the current 63 language packs. This is deliberately
// read-only: the apply scripts that produced cmd_translations/*.json remain
// the only writers for these payloads.
//
// The audit catches a hand batch that is no longer present in a pack, a
// placeholder contract regression, an English hand value, or two reviewed
// sources disagreeing about the same pack/key. A current non-English value
// that differs from an older hand payload is reported as superseded rather
// than failed; later reviewed work may legitimately improve that translation.
//
// Usage:
//   node dev-tools/i18n/audit_cmd_hand_sources.cjs
//   node dev-tools/i18n/audit_cmd_hand_sources.cjs --quiet
//   node dev-tools/i18n/audit_cmd_hand_sources.cjs --gate --quiet
//   node dev-tools/i18n/audit_cmd_hand_sources.cjs --json

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const LANG_DIR = path.join(ROOT, 'lang');
const MIRROR_DIR = path.join(ROOT, 'desktop', 'web-app', 'public', 'lang');
const COMMAND_FILE = path.join(__dirname, 'cmd_keys_en.json');
const REPORT_DIR = path.join(__dirname, 'cmd_hand_source_audit');
const args = process.argv.slice(2);
const GATE = args.includes('--gate');
const QUIET = args.includes('--quiet');
const JSON_OUTPUT = args.includes('--json');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function getDeep(target, dottedKey) {
  return dottedKey.split('.').reduce((value, key) => value == null ? undefined : value[key], target);
}

function placeholderTokens(value) {
  return [...String(value)
    .matchAll(/\$\{[^}]+\}|\{[^{}]+\}|<\/?[a-zA-Z][^>]*>/g)]
    .map((match) => match[0])
    .sort();
}

function samePlaceholders(left, right) {
  const a = placeholderTokens(left);
  const b = placeholderTokens(right);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function replaceFile(file, text) {
  const temporary = `${file}.cmd-hand-audit-${process.pid}.tmp`;
  const transientCodes = new Set(['EPERM', 'EACCES', 'EBUSY', 'UNKNOWN', 'ENOSPC']);
  let lastError;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      fs.writeFileSync(temporary, text, 'utf8');
      try {
        fs.renameSync(temporary, file);
      } catch (error) {
        if (!transientCodes.has(error.code)) throw error;
        fs.copyFileSync(temporary, file);
      }
      return;
    } catch (error) {
      lastError = error;
      if (!transientCodes.has(error.code) || attempt === 7) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 350);
    } finally {
      if (fs.existsSync(temporary)) {
        try { fs.unlinkSync(temporary); } catch (error) { lastError = error; }
      }
    }
  }
  throw lastError;
}

const KEYS_20260801 = [
  'cmd.apply_lesson_template',
  'cmd.apply_lesson_template_done',
  'cmd.apply_lesson_template_hint',
  'cmd.apply_lesson_template_missing',
  'cmd.apply_lesson_template_which',
  'cmd.rebuild_lesson_step',
  'cmd.rebuild_lesson_step_done',
  'cmd.rebuild_lesson_step_hint',
  'cmd.rebuild_lesson_step_missing',
  'cmd.rebuild_lesson_step_none',
  'cmd.rebuild_lesson_step_which',
  'cmd.run_lesson_blueprint',
  'cmd.run_lesson_blueprint_done',
  'cmd.run_lesson_blueprint_hint',
];

const KEYS_20260816 = [
  ['cmd.describe_current_media'],
  ['cmd.describe_current_media_done'],
  ['cmd.describe_current_media_hint'],
  ['cmd.describe_current_media_none', 'cmd.read_media_descriptions_none'],
  ['cmd.open_learning_web_explorer'],
  ['cmd.open_learning_web_explorer_done'],
  ['cmd.open_learning_web_explorer_hint'],
  ['cmd.read_media_descriptions'],
  ['cmd.read_media_descriptions_count'],
  ['cmd.read_media_descriptions_hint'],
  ['cmd.suggest_contextual_next_steps'],
  ['cmd.suggest_contextual_next_steps_hint'],
  ['cmd.suggest_contextual_next_steps_working'],
  ['cmd.surprise_me_contextually'],
  ['cmd.surprise_me_contextually_hint'],
  ['cmd.surprise_me_contextually_working'],
  ['cmd.use_contextual_suggestion'],
  ['cmd.use_contextual_suggestion_hint'],
  ['cmd.use_contextual_suggestion_working'],
];

const KEYS_20260817 = [
  'cmd.use_gemini_canvas',
  'cmd.use_gemini_canvas_hint',
  'cmd.use_gemini_canvas_done',
  'cmd.open_brainstorm_modes',
  'cmd.open_brainstorm_modes_hint',
  'cmd.open_brainstorm_modes_done',
  'cmd.open_discussion_builder',
  'cmd.open_discussion_builder_hint',
  'cmd.open_discussion_builder_done',
  'cmd.open_jigsaw_builder',
  'cmd.open_jigsaw_builder_hint',
  'cmd.open_jigsaw_builder_done',
  'cmd.jump_to_lesson_plan',
  'cmd.jump_to_lesson_plan_hint',
  'cmd.jump_to_lesson_plan_done',
  'cmd.open_block_suggestions',
  'cmd.open_block_suggestions_hint',
  'cmd.open_block_suggestions_done',
];

const KEYS_20260817B = [
  'cmd.open_leadership_hub',
  'cmd.open_leadership_hub_hint',
  'cmd.open_leadership_hub_done',
];

const SOURCE_DEFINITIONS = [
  {
    id: 'cmd-delta-20260801',
    files: [
      'cmd_delta_hand_20260801_part1.cjs',
      'cmd_delta_hand_20260801_part2.cjs',
      'cmd_delta_hand_20260801_part3.cjs',
    ],
    kind: 'array',
    keys: KEYS_20260801,
  },
  {
    id: 'cmd-cancelled-20260801',
    files: ['cmd_cancelled_hand_20260801.cjs'],
    kind: 'field',
    fields: { value: 'cmd.cancelled' },
  },
  {
    id: 'cmd-delta-20260802',
    files: ['cmd_delta_hand_20260802.cjs'],
    kind: 'fields',
    fields: { cancel: 'cmd.cancel', retry: 'cmd.retry' },
  },
  {
    id: 'palette-delta-20260802',
    files: ['palette_delta_hand_20260802.cjs'],
    kind: 'fields',
    fields: { unavailable: 'palette.unavailable' },
  },
  {
    id: 'cmd-delta-20260816',
    files: [
      'cmd_delta_hand_20260816_part1.cjs',
      'cmd_delta_hand_20260816_part2.cjs',
      'cmd_delta_hand_20260816_part3.cjs',
    ],
    kind: 'array',
    keys: KEYS_20260816,
  },
  {
    id: 'cmd-delta-20260817',
    files: [
      'cmd_delta_hand_20260817_part1.cjs',
      'cmd_delta_hand_20260817_part2.cjs',
      'cmd_delta_hand_20260817_part3.cjs',
    ],
    kind: 'array',
    keys: KEYS_20260817,
  },
  {
    id: 'cmd-delta-20260817b',
    files: ['cmd_delta_hand_20260817b.cjs'],
    kind: 'array',
    keys: KEYS_20260817B,
  },
];

const english = readJson(COMMAND_FILE);
const files = fs.readdirSync(LANG_DIR)
  .filter((file) => file.endsWith('.js') && !file.startsWith('.'))
  .sort();
const slugs = files.map((file) => file.replace(/\.js$/, ''));
const packs = new Map(slugs.map((slug) => [slug, readJson(path.join(LANG_DIR, `${slug}.js`))]));
const records = [];
const sourceStats = {};
const errors = [];

function addRecord(source, slug, key, value) {
  records.push({ source: source.id, slug, key, value });
}

for (const source of SOURCE_DEFINITIONS) {
  const rows = {};
  try {
    for (const file of source.files) Object.assign(rows, require(path.join(__dirname, file)));
  } catch (error) {
    errors.push(`${source.id}: could not load hand source (${error.message})`);
    continue;
  }
  sourceStats[source.id] = { files: source.files, languageCount: Object.keys(rows).length, records: 0 };
  for (const slug of Object.keys(rows)) {
    if (!packs.has(slug)) {
      errors.push(`${source.id}: unknown language slug ${slug}`);
      continue;
    }
    const row = rows[slug];
    if (source.kind === 'array') {
      if (!Array.isArray(row) || row.length !== source.keys.length) {
        errors.push(`${source.id}/${slug}: expected ${source.keys.length} array slots`);
        continue;
      }
      source.keys.forEach((keyOrKeys, index) => {
        for (const key of (Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys])) addRecord(source, slug, key, row[index]);
      });
    } else if (source.kind === 'field') {
      if (typeof row !== 'string') {
        errors.push(`${source.id}/${slug}: expected one string value`);
        continue;
      }
      addRecord(source, slug, source.fields.value, row);
    } else {
      if (!row || typeof row !== 'object') {
        errors.push(`${source.id}/${slug}: expected an object of named values`);
        continue;
      }
      for (const [field, key] of Object.entries(source.fields)) addRecord(source, slug, key, row[field]);
    }
  }
  sourceStats[source.id].records = records.filter((record) => record.source === source.id).length;
}

const byTarget = new Map();
for (const record of records) {
  const target = `${record.slug}\u0000${record.key}`;
  const list = byTarget.get(target) || [];
  list.push(record);
  byTarget.set(target, list);
}

const duplicateConflicts = [];
for (const list of byTarget.values()) {
  const values = [...new Set(list.map((record) => record.value))];
  if (values.length > 1) duplicateConflicts.push({
    slug: list[0].slug,
    key: list[0].key,
    sources: list.map((record) => record.source),
    values,
  });
}

const missingPacks = [];
const invalidSource = [];
const englishPayload = [];
const placeholderMismatch = [];
const recoverable = [];
const superseded = [];
for (const record of records) {
  const expected = english[record.key];
  const current = getDeep(packs.get(record.slug), record.key);
  if (typeof record.value !== 'string' || !record.value.trim()) {
    invalidSource.push({ ...record, reason: 'blank or non-string' });
    continue;
  }
  if (typeof expected !== 'string') {
    invalidSource.push({ ...record, reason: 'key missing from cmd_keys_en.json' });
    continue;
  }
  if (record.value === expected) englishPayload.push({ ...record, english: expected });
  if (!samePlaceholders(record.value, expected)) {
    placeholderMismatch.push({ ...record, english: expected });
    continue;
  }
  if (current === undefined) {
    missingPacks.push({ ...record, english: expected });
    continue;
  }
  if (current === expected && record.value !== expected) {
    recoverable.push({ ...record, english: expected });
  } else if (current !== record.value) {
    superseded.push({ ...record, english: expected, current });
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  sourceCount: SOURCE_DEFINITIONS.length,
  languageCount: slugs.length,
  expectedLanguageCount: 63,
  sourceRecords: records.length,
  sourceStats,
  errors,
  missingPacks,
  invalidSource,
  englishPayload,
  placeholderMismatch,
  duplicateConflicts,
  recoverable,
  superseded,
  summary: {
    errors: errors.length,
    missingPacks: missingPacks.length,
    invalidSource: invalidSource.length,
    englishPayload: englishPayload.length,
    placeholderMismatch: placeholderMismatch.length,
    duplicateConflicts: duplicateConflicts.length,
    recoverable: recoverable.length,
    superseded: superseded.length,
  },
};

fs.mkdirSync(REPORT_DIR, { recursive: true });
replaceFile(path.join(REPORT_DIR, '_summary.json'), JSON.stringify(report, null, 2) + '\n');

if (JSON_OUTPUT) {
  console.log(JSON.stringify(report, null, 2));
} else if (QUIET) {
  console.log(`audit_cmd_hand_sources: ${records.length} records; recoverable=${recoverable.length}; invalid=${invalidSource.length}; placeholder-mismatch=${placeholderMismatch.length}; conflicts=${duplicateConflicts.length}; superseded=${superseded.length}`);
} else {
  console.log(`audit_cmd_hand_sources: ${SOURCE_DEFINITIONS.length} reviewed source batches; ${records.length} records across ${slugs.length} packs.`);
  console.log(`  recoverable=${recoverable.length}; invalid=${invalidSource.length}; english-payload=${englishPayload.length}; placeholder-mismatch=${placeholderMismatch.length}; conflicts=${duplicateConflicts.length}; superseded=${superseded.length}`);
  console.log(`  Report: ${path.relative(ROOT, path.join(REPORT_DIR, '_summary.json'))}`);
  if (superseded.length) console.log(`  Note: ${superseded.length} hand value(s) differ from a newer current pack value; these are informational.`);
}

if (GATE && (errors.length || missingPacks.length || invalidSource.length || englishPayload.length || placeholderMismatch.length || duplicateConflicts.length || recoverable.length)) {
  console.error('audit_cmd_hand_sources: gate failed; inspect cmd_hand_source_audit/_summary.json.');
  process.exit(1);
}

