#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {
  CONTENT_OVERRIDES,
  DUPLICATE_PURPOSE_TITLES,
  MANUAL_PROVENANCE_IDS,
  REVIEW_NOTE_REPLACEMENTS,
  SOURCE_DIRECTNESS_IDS,
  SOURCE_OVERRIDES,
  TITLE_CURRENTNESS_OVERRIDES,
  UNICODE_CONTENT_REPLACEMENTS,
  UNICODE_METADATA_REPLACEMENTS,
} = require('./eppp_memory_aid_correction_wave_01_data.cjs');
const {
  openEpppMigrationSourceArchive,
} = require('./eppp_migration_source_archive.cjs');

const root = path.resolve(__dirname, '..');
const migrationArchive = openEpppMigrationSourceArchive({ workspaceRoot: root });
const memoryAidSourcePath = migrationArchive.manifest.execution.learningLibrary.memoryAids[0];
const catalogPath = process.env.EPPP_MEMORY_AID_CORRECTION_CATALOG_PATH
  ? path.resolve(process.env.EPPP_MEMORY_AID_CORRECTION_CATALOG_PATH)
  : path.join(root, 'test_prep', 'eppp_learning_library.json');
const outputPath = process.env.EPPP_MEMORY_AID_CORRECTION_OUTPUT_PATH
  ? path.resolve(process.env.EPPP_MEMORY_AID_CORRECTION_OUTPUT_PATH)
  : path.join(root, 'test_prep', 'eppp_memory_aid_correction_wave_01.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const catalogById = new Map((catalog.memoryAids || []).map((item) => [item.id, item]));

function cleanText(value) {
  return String(value || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function stableId(prefix, parts) {
  const digest = crypto.createHash('sha256').update(parts.map(cleanText).join('\n')).digest('hex').slice(0, 16);
  return `${prefix}-${digest}`;
}

const legacyContext = vm.createContext({ console: { log() {}, warn() {}, error() {} } });
vm.runInContext(
  migrationArchive.readText(memoryAidSourcePath),
  legacyContext,
  { filename: memoryAidSourcePath, timeout: 15000 },
);
const legacyAids = vm.runInContext('MemoryAids.aids', legacyContext);
const immutableLegacyById = new Map(legacyAids.map((aid) => [
  stableId('memory-aid', [aid.domainId, aid.title, aid.type, aid.content]),
  aid,
]));
const numberedReviewRecordById = new Map();
for (const filename of fs.readdirSync(path.join(root, 'test_prep')).filter((entry) => /^eppp_memory_aid_review_wave_\d+\.json$/i.test(entry)).sort()) {
  const wave = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', filename), 'utf8'));
  for (const item of Array.isArray(wave.items) ? wave.items : []) {
    if (numberedReviewRecordById.has(item.legacyId)) throw new Error(`Reviewed memory aid ${item.legacyId} appears in multiple numbered waves.`);
    numberedReviewRecordById.set(item.legacyId, { item, artifact: filename });
  }
}

const sourceMismatchIds = new Set([
  'memory-aid-93e9d82228226719',
  'memory-aid-65cce325295440e1',
  'memory-aid-9992bd978c9152fa',
]);
const currentnessIds = new Set(['memory-aid-c4ee337cb0ae9dc8']);
const unicodeIds = new Set([
  ...Object.keys(UNICODE_CONTENT_REPLACEMENTS),
  ...Object.keys(UNICODE_METADATA_REPLACEMENTS),
  ...Object.keys(REVIEW_NOTE_REPLACEMENTS),
]);
const targetIds = [...new Set([
  ...unicodeIds,
  ...MANUAL_PROVENANCE_IDS,
  ...Object.keys(DUPLICATE_PURPOSE_TITLES),
  ...Object.keys(CONTENT_OVERRIDES),
  ...Object.keys(SOURCE_OVERRIDES),
  ...Object.keys(TITLE_CURRENTNESS_OVERRIDES),
  ...SOURCE_DIRECTNESS_IDS,
])].sort();

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function applyReplacements(value, replacements, context) {
  let result = String(value || '');
  for (const [from, to] of replacements || []) {
    if (!result.includes(from)) {
      if (result.includes(to)) continue;
      throw new Error(`${context} no longer contains expected text: ${from}`);
    }
    result = result.split(from).join(to);
  }
  return result;
}

function correctionTypes(id) {
  const types = [];
  if (Object.prototype.hasOwnProperty.call(UNICODE_CONTENT_REPLACEMENTS, id)) types.push('learner-content-unicode-restoration');
  if (Object.prototype.hasOwnProperty.call(UNICODE_METADATA_REPLACEMENTS, id)) types.push('source-metadata-unicode-restoration');
  if (Object.prototype.hasOwnProperty.call(REVIEW_NOTE_REPLACEMENTS, id)) types.push('review-note-unicode-restoration');
  if (MANUAL_PROVENANCE_IDS.includes(id)) types.push('stable-id-provenance');
  if (sourceMismatchIds.has(id)) types.push('source-url-metadata-alignment');
  if (currentnessIds.has(id)) types.push('accuracy-and-currency');
  if (Object.prototype.hasOwnProperty.call(DUPLICATE_PURPOSE_TITLES, id)) types.push('learner-purpose-differentiation');
  if (SOURCE_DIRECTNESS_IDS.includes(id)) types.push('source-directness');
  if (Object.prototype.hasOwnProperty.call(TITLE_CURRENTNESS_OVERRIDES, id)) types.push('title-currentness');
  return types;
}

function applySourceOverride(item, sourceOverride) {
  if (!sourceOverride) return;
  if (sourceOverride.title) item.title = sourceOverride.title;
  if (Array.isArray(sourceOverride.references)) item.references = clone(sourceOverride.references);
  if (Array.isArray(sourceOverride.sourceDetails)) item.sourceDetails = clone(sourceOverride.sourceDetails);
  if (sourceOverride.replaceReference) {
    const { from, to } = sourceOverride.replaceReference;
    const index = item.references.indexOf(from);
    if (index < 0) {
      if (!item.references.includes(to)) throw new Error(`${item.legacyId} is missing the expected superseded reference ${from}.`);
    } else {
      item.references[index] = to;
    }
  }
  if (sourceOverride.replaceSourceDetail) {
    const { url, value } = sourceOverride.replaceSourceDetail;
    const index = item.sourceDetails.findIndex((source) => source.url === url);
    if (index < 0) {
      if (!item.sourceDetails.some((source) => source.url === value.url)) {
        throw new Error(`${item.legacyId} is missing the expected superseded source detail ${url}.`);
      }
    } else {
      item.sourceDetails[index] = clone(value);
    }
  }
}

const items = targetIds.map((legacyId) => {
  const catalogItem = catalogById.get(legacyId);
  if (!catalogItem) throw new Error(`Correction wave targets unknown memory aid ${legacyId}.`);
  const legacyItem = immutableLegacyById.get(legacyId);
  if (!legacyItem) throw new Error(`Correction wave cannot derive immutable legacy title for ${legacyId}.`);
  const numberedReview = numberedReviewRecordById.get(legacyId);
  const base = clone(numberedReview ? numberedReview.item : catalogItem);
  const expectedTitle = cleanText(legacyItem.title);
  const supersedesArtifact = (numberedReview && numberedReview.artifact)
    || (MANUAL_PROVENANCE_IDS.includes(legacyId) ? 'eppp_learning_review_overrides.json' : '');
  if (!expectedTitle || !supersedesArtifact) throw new Error(`Correction ${legacyId} lacks a guarded title or superseded artifact.`);
  if (base.reviewStatus !== 'source-reviewed-editorial-pass') {
    throw new Error(`Correction ${legacyId} cannot supersede non-reviewed status ${base.reviewStatus}.`);
  }

  const item = {
    legacyId,
    expectedTitle,
    supersedesArtifact,
    title: base.title,
    domainId: base.domainId,
    reviewStatus: 'source-reviewed-editorial-pass',
    content: base.content,
    references: clone(base.references || []),
    sourceDetails: clone(base.sourceDetails || []),
    reviewNote: base.reviewNote,
    reviewDate: '2026-07-28',
    reviewMode: 'stable-id-correction-overlay',
    correctionTypes: correctionTypes(legacyId),
    independentExpertStatus: 'not-started',
    productionStatus: 'not-production-validated',
  };

  item.content = applyReplacements(
    item.content,
    UNICODE_CONTENT_REPLACEMENTS[legacyId],
    `${legacyId} content`,
  );
  item.reviewNote = applyReplacements(
    item.reviewNote,
    REVIEW_NOTE_REPLACEMENTS[legacyId],
    `${legacyId} review note`,
  );
  for (const [from, to] of UNICODE_METADATA_REPLACEMENTS[legacyId] || []) {
    let matched = false;
    for (const source of item.sourceDetails) {
      for (const key of ['title', 'organization', 'whyReputable']) {
        if (String(source[key] || '').includes(from)) {
          source[key] = String(source[key]).split(from).join(to);
          matched = true;
        } else if (String(source[key] || '').includes(to)) {
          matched = true;
        }
      }
    }
    if (!matched) throw new Error(`${legacyId} source metadata no longer contains expected text: ${from}`);
  }
  if (CONTENT_OVERRIDES[legacyId]) item.content = CONTENT_OVERRIDES[legacyId];
  if (DUPLICATE_PURPOSE_TITLES[legacyId]) item.title = DUPLICATE_PURPOSE_TITLES[legacyId];
  if (TITLE_CURRENTNESS_OVERRIDES[legacyId]) item.title = TITLE_CURRENTNESS_OVERRIDES[legacyId];
  applySourceOverride(item, SOURCE_OVERRIDES[legacyId]);

  if (!item.correctionTypes.length) throw new Error(`Correction ${legacyId} has no declared correction type.`);
  if (!item.content || !item.reviewNote || !item.references.length || !item.sourceDetails.length) {
    throw new Error(`Correction ${legacyId} is missing learner content or review evidence.`);
  }
  const sourceUrls = item.sourceDetails.map((source) => source.url);
  if (JSON.stringify(item.references) !== JSON.stringify(sourceUrls)) {
    throw new Error(`Correction ${legacyId} references do not exactly match sourceDetails URLs.`);
  }
  return item;
});

const artifact = {
  schemaVersion: 1,
  waveId: 'eppp-memory-aid-correction-wave-01',
  generatedAt: '2026-07-28T00:00:00.000Z',
  status: 'source-reviewed-editorial-corrections-independent-expert-review-pending',
  summary: {
    items: items.length,
    titleCurrentnessRecords: Object.keys(TITLE_CURRENTNESS_OVERRIDES).length,
    learnerContentUnicodeRecords: Object.keys(UNICODE_CONTENT_REPLACEMENTS).length,
    sourceMetadataUnicodeRecords: Object.keys(UNICODE_METADATA_REPLACEMENTS).length,
    sourceUrlMetadataAlignmentRecords: sourceMismatchIds.size,
    currentnessRecords: currentnessIds.size,
    stableIdProvenanceRecords: MANUAL_PROVENANCE_IDS.length,
    duplicateTopicPairsDifferentiated: Object.keys(DUPLICATE_PURPOSE_TITLES).length / 2,
    duplicateTopicRecordsDifferentiated: Object.keys(DUPLICATE_PURPOSE_TITLES).length,
    sourceDirectnessRecords: SOURCE_DIRECTNESS_IDS.length,
  },
  safeguards: [
    'Historical numbered review-wave and manual-override evidence remains unchanged.',
    'Corrections target known source-reviewed memory aids by stable legacy ID and verify the expected pre-correction title and artifact.',
    'Correction waves are applied after numbered review waves and may not overlap another correction wave.',
    'References and sourceDetails URLs must match exactly for every correction record.',
    'Independent qualified expert review and production validation remain pending.',
  ],
  items,
};

fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ output: path.relative(root, outputPath), summary: artifact.summary }, null, 2));
