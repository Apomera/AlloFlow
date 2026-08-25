#!/usr/bin/env node
'use strict';

// Command/staleness lane payload (2026-08-21).
//
// This file deliberately does not edit language packs.  It describes the next
// integration batch and computes the current per-pack worklist from the
// canonical English sources and packs.  The integrator can use --json to
// capture a review artifact, or import buildPayload() from a focused test.
//
// Integration order:
//   1. Translate the 16 Full Pack / Blueprint command keys in every pack.
//   2. Re-translate the six session renames and the two newly stale tour keys.
//   3. Drain command/palette identity values from commandBacklog.keys in small
//      language-safe batches; keep palette.ctx.* and reviewed brand names out.
//   4. Run the command identity and stale ratchet gates, then bless only keys
//      that were reviewed across all eligible packs.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const LANG_DIR = path.join(ROOT, 'lang');
const UI_PATH = path.join(ROOT, 'ui_strings.js');
const CMD_EN_PATH = path.join(__dirname, 'cmd_keys_en.json');
const ALLOWLIST_PATH = path.join(__dirname, 'cmd_value_identical_allowlist.json');

const FULL_PACK_KEYS = [
  'cmd.generate_full_pack',
  'cmd.generate_full_pack_done',
  'cmd.generate_full_pack_failed',
  'cmd.generate_full_pack_hint',
  'cmd.generate_full_pack_review',
  'cmd.generate_full_pack_working',
  'cmd.plan_full_pack',
  'cmd.plan_full_pack_done',
  'cmd.plan_full_pack_failed',
  'cmd.plan_full_pack_hint',
  'cmd.plan_full_pack_working',
  'cmd.start_blueprint_mode',
  'cmd.start_blueprint_mode_done',
  'cmd.start_blueprint_mode_done_topic',
  'cmd.start_blueprint_mode_done_topic2',
  'cmd.start_blueprint_mode_hint',
];

// These six source edits landed in 11c236d90 after the 22,930 watermark.
const SESSION_STALE_KEYS = [
  'session.start',
  'session.code',
  'session.teacher_paced',
  'session.student_paced',
  'session.student_paced_desc',
  'session.start_tooltip',
];

// These two source edits landed in ea3fb05c3 after the 23,302 intermediate
// count. tour.fullpack_text was already stale at the prior watermark, so it is
// intentionally deferred from this immediate ratchet delta.
const TOUR_STALE_KEYS = [
  'tour.lesson_plan_text',
  'tour.utils_text',
];

const IMMEDIATE_STALE_KEYS = [...SESSION_STALE_KEYS, ...TOUR_STALE_KEYS];
const REFERENCE_BACKLOG_SLUG = 'spanish_castilian';
// Twelve non-Full-Pack identity keys were added after the original 207-key
// ledger snapshot: three command-blueprint labels and nine palette labels.
// Three exact command/UI catalog reuses were subsequently reviewed and
// applied, reducing the Spanish reference backlog from 219 to 216. Keep this
// pinned so source edits cannot silently change the worklist.
const EXPECTED_REFERENCE_BACKLOG_COUNT = 216;
const HELD_STALENESS_SLUGS = new Set(['maay_maay']);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function flatten(value, prefix = '', out = {}) {
  for (const [key, child] of Object.entries(value || {})) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, full, out);
    else out[full] = child;
  }
  return out;
}

function unique(values) {
  return [...new Set(values)];
}

function getPackFiles() {
  return fs.readdirSync(LANG_DIR)
    .filter((file) => file.endsWith('.js'))
    .sort();
}

function loadPacks() {
  const packs = {};
  for (const file of getPackFiles()) {
    const slug = file.slice(0, -3);
    packs[slug] = flatten(readJson(path.join(LANG_DIR, file)));
  }
  return packs;
}

function isAllowedIdentity(key, value, allowlist) {
  return key.startsWith('palette.ctx.')
    || (allowlist.keys || []).includes(key)
    || (allowlist.values || []).includes(value);
}

function identityKeys(pack, englishCommands, allowlist) {
  return Object.entries(englishCommands)
    .filter(([key, english]) => typeof english === 'string' && english.trim())
    .filter(([key, english]) => pack[key] === english)
    .filter(([key, english]) => !isAllowedIdentity(key, english, allowlist))
    .map(([key]) => key)
    .sort();
}

function statusFor(pack, key, source) {
  const value = pack[key];
  if (value === undefined) return 'missing';
  if (value === source) return 'english_passthrough';
  return 'translated_or_stale';
}

function unresolvedKeys(packs, keys, source, predicate) {
  const out = {};
  for (const [slug, pack] of Object.entries(packs)) {
    const unresolved = keys.filter((key) => predicate(statusFor(pack, key, source[key])));
    if (unresolved.length) out[slug] = unresolved;
  }
  return out;
}

function countsFor(packs, keys, source, predicate) {
  const counts = {};
  for (const [slug, pack] of Object.entries(packs)) {
    counts[slug] = keys.reduce((n, key) => n + (predicate(statusFor(pack, key, source[key])) ? 1 : 0), 0);
  }
  return counts;
}

function assertPayloadShape(payload) {
  const errors = [];
  const expectKeys = (label, actual, expected) => {
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
      errors.push(`${label}: expected ${expected.length} ordered keys, got ${actual.length}`);
    }
  };
  expectKeys('fullPackBlueprint.keys', payload.fullPackBlueprint.keys, FULL_PACK_KEYS);
  expectKeys('staleDelta.sessionKeys', payload.staleDelta.sessionKeys, SESSION_STALE_KEYS);
  expectKeys('staleDelta.tourKeys', payload.staleDelta.tourKeys, TOUR_STALE_KEYS);
  if (payload.fullPackBlueprint.keys.length !== 16) errors.push('Full Pack/Blueprint key count must remain 16');
  if (payload.staleDelta.sessionKeys.length !== 6) errors.push('session stale delta must remain 6 keys');
  if (payload.staleDelta.tourKeys.length !== 2) errors.push('tour stale delta must remain 2 keys');
  if (payload.commandBacklog.referenceCount !== EXPECTED_REFERENCE_BACKLOG_COUNT) {
    errors.push(`reference command backlog expected ${EXPECTED_REFERENCE_BACKLOG_COUNT}, got ${payload.commandBacklog.referenceCount}`);
  }
  if (payload.fullPackBlueprint.source['cmd.start_blueprint_mode_done_topic'] !== 'Blueprint Mode is open for “') {
    errors.push('done_topic must preserve the opening curly quote split fragment');
  }
  if (payload.fullPackBlueprint.source['cmd.start_blueprint_mode_done_topic2'] !== '”. Continue with AlloBot to review the resource plan before generating.') {
    errors.push('done_topic2 must preserve the closing curly quote split fragment');
  }
  if (errors.length) throw new Error(errors.join('\n'));
  return true;
}

let cachedPayload;

function buildPayload() {
  if (cachedPayload) return cachedPayload;
  const englishUi = flatten(readJson(UI_PATH));
  const englishCommands = readJson(CMD_EN_PATH);
  const allowlist = readJson(ALLOWLIST_PATH);
  const packs = loadPacks();
  const slugs = Object.keys(packs).sort();
  const eligibleSlugs = slugs.filter((slug) => !HELD_STALENESS_SLUGS.has(slug));

  const fullPackSource = Object.fromEntries(FULL_PACK_KEYS.map((key) => [key, englishCommands[key]]));
  const staleSource = Object.fromEntries(IMMEDIATE_STALE_KEYS.map((key) => [key, englishUi[key]]));
  // Keep the newly introduced Full Pack/Blueprint keys in their own P0 lane;
  // the command-value ledger is the 216-key set at this snapshot, before
  // those 16 additions.
  const referenceKeys = identityKeys(packs[REFERENCE_BACKLOG_SLUG], englishCommands, allowlist)
    .filter((key) => !FULL_PACK_KEYS.includes(key));

  const allPackIdentity = slugs.reduce((intersection, slug) => {
    const keys = new Set(identityKeys(packs[slug], englishCommands, allowlist)
      .filter((key) => !FULL_PACK_KEYS.includes(key)));
    return intersection.filter((key) => keys.has(key));
  }, Object.keys(englishCommands).sort());

  const fullPackUnresolved = unresolvedKeys(packs, FULL_PACK_KEYS, fullPackSource, (status) => status !== 'translated_or_stale');
  const staleUnresolved = unresolvedKeys(
    Object.fromEntries(eligibleSlugs.map((slug) => [slug, packs[slug]])),
    IMMEDIATE_STALE_KEYS,
    staleSource,
    // Every present non-English value is stale for this explicitly selected
    // source-delta batch. It must be reviewed/retranslated, not treated as a
    // completed translation merely because it differs from current English.
    (status) => status !== 'missing',
  );
  const backlogUnresolved = unresolvedKeys(packs, referenceKeys, englishCommands, (status) => status === 'english_passthrough' || status === 'missing');

  const payload = {
    schema: 'alloflow-command-staleness-payload/v1',
    generatedFrom: {
      commandEnglish: 'dev-tools/i18n/cmd_keys_en.json',
      uiEnglish: 'ui_strings.js',
      packs: 'lang/*.js',
      allowlist: 'dev-tools/i18n/cmd_value_identical_allowlist.json',
    },
    languagePacks: {
      count: slugs.length,
      slugs,
      stalenessEligibleCount: eligibleSlugs.length,
      stalenessHeld: [...HELD_STALENESS_SLUGS].filter((slug) => slugs.includes(slug)),
    },
    fullPackBlueprint: {
      keyCount: FULL_PACK_KEYS.length,
      keys: FULL_PACK_KEYS,
      source: fullPackSource,
      expectedTranslationSlots: FULL_PACK_KEYS.length * slugs.length,
      englishPassthroughCounts: countsFor(packs, FULL_PACK_KEYS, fullPackSource, (status) => status === 'english_passthrough'),
      unresolvedByPack: fullPackUnresolved,
      unresolvedEntries: Object.values(fullPackUnresolved).reduce((n, keys) => n + keys.length, 0),
      splitDoneTopic: {
        leftKey: 'cmd.start_blueprint_mode_done_topic',
        rightKey: 'cmd.start_blueprint_mode_done_topic2',
        rule: 'Keep the opening and closing curly quote fragments separate; do not merge or trim either fragment.',
      },
    },
    staleDelta: {
      sessionKeyCount: SESSION_STALE_KEYS.length,
      sessionKeys: SESSION_STALE_KEYS,
      tourKeyCount: TOUR_STALE_KEYS.length,
      tourKeys: TOUR_STALE_KEYS,
      source: staleSource,
      expectedRatchetIncrease: IMMEDIATE_STALE_KEYS.length * eligibleSlugs.length,
      staleEntriesAtCurrentSnapshot: IMMEDIATE_STALE_KEYS.length * eligibleSlugs.length,
      unresolvedByEligiblePack: staleUnresolved,
      unresolvedEntries: Object.values(staleUnresolved).reduce((n, keys) => n + keys.length, 0),
      heldPackReview: [...HELD_STALENESS_SLUGS].filter((slug) => slugs.includes(slug)).map((slug) => ({ slug, keys: IMMEDIATE_STALE_KEYS })),
    },
    commandBacklog: {
      referenceSlug: REFERENCE_BACKLOG_SLUG,
      referenceCount: referenceKeys.length,
      keys: referenceKeys,
      allPackIntersectionCount: allPackIdentity.length,
      allPackIntersectionKeys: allPackIdentity,
      englishIdentityCountsByPack: Object.fromEntries(slugs.map((slug) => [slug, identityKeys(packs[slug], englishCommands, allowlist).length])),
      unresolvedByPack: backlogUnresolved,
      unresolvedEntries: Object.values(backlogUnresolved).reduce((n, keys) => n + keys.length, 0),
      note: 'Reference backlog is the current 216-key Spanish baseline used by the command staleness ledger after the reviewed exact UI-catalog reuse batch. The all-pack intersection is reported separately so integration does not overstate universality when a pack has already translated a key.',
    },
    integrationOrder: [
      'Apply reviewed translations for fullPackBlueprint.keys across all 63 packs, including both split done_topic fragments.',
      'Apply reviewed translations for staleDelta.sessionKeys and staleDelta.tourKeys across the 62 eligible packs; route Maay Maay to native-language review.',
      'Drain commandBacklog.keys in bounded language batches and preserve palette.ctx.* / reviewed brand allowlist conventions.',
      'Run check_cmd_i18n, check_cmd_value_staleness, and check_lang_staleness --ratchet; bless only reviewed source keys.',
    ],
  };
  assertPayloadShape(payload);
  cachedPayload = payload;
  return payload;
}

if (require.main === module) {
  const payload = buildPayload();
  if (process.argv.includes('--json')) {
    process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
  } else {
    console.log(`command staleness payload: ${payload.languagePacks.count} packs`);
    console.log(`  Full Pack/Blueprint: ${payload.fullPackBlueprint.keyCount} keys; ${payload.fullPackBlueprint.unresolvedEntries} unresolved slots`);
    console.log(`  Ratchet delta: ${payload.staleDelta.sessionKeyCount} session + ${payload.staleDelta.tourKeyCount} tour = ${payload.staleDelta.expectedRatchetIncrease} eligible-pack entries`);
    console.log(`  Command reference backlog: ${payload.commandBacklog.referenceCount} keys; ${payload.commandBacklog.allPackIntersectionCount} identical in every pack`);
    console.log(`  Command unresolved identity entries: ${payload.commandBacklog.unresolvedEntries}`);
  }
}

module.exports = {
  FULL_PACK_KEYS,
  SESSION_STALE_KEYS,
  TOUR_STALE_KEYS,
  IMMEDIATE_STALE_KEYS,
  REFERENCE_BACKLOG_SLUG,
  EXPECTED_REFERENCE_BACKLOG_COUNT,
  buildPayload,
  assertPayloadShape,
};
