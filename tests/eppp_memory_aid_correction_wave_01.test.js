import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const data = require('../dev-tools/eppp_memory_aid_correction_wave_01_data.cjs');
const read = (relativePath) => JSON.parse(fs.readFileSync(resolve(process.cwd(), relativePath), 'utf8'));
const artifactPath = 'test_prep/eppp_memory_aid_correction_wave_01.json';
const cleanText = (value) => String(value || '')
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/g, "'")
  .replace(/\s+/g, ' ')
  .trim();
const stableId = (prefix, parts) => `${prefix}-${crypto.createHash('sha256').update(parts.map(cleanText).join('\n')).digest('hex').slice(0, 16)}`;
const legacyContext = vm.createContext({ console: { log() {}, warn() {}, error() {} } });
vm.runInContext(fs.readFileSync(resolve(process.cwd(), 'test_prep/eppp_legacy/js/memory_aids.js'), 'utf8'), legacyContext);
const legacyById = new Map(vm.runInContext('MemoryAids.aids', legacyContext).map((aid) => [
  stableId('memory-aid', [aid.domainId, aid.title, aid.type, aid.content]),
  aid,
]));
const numberedReviewById = new Map();
for (const filename of fs.readdirSync(resolve(process.cwd(), 'test_prep')).filter((entry) => /^eppp_memory_aid_review_wave_\d+\.json$/i.test(entry))) {
  for (const item of read(`test_prep/${filename}`).items || []) numberedReviewById.set(item.legacyId, item);
}

describe('EPPP memory-aid correction Wave 01', () => {
  const artifact = read(artifactPath);
  const catalog = read('test_prep/eppp_learning_library.json');
  const catalogById = new Map(catalog.memoryAids.map((item) => [item.id, item]));
  const byId = new Map(artifact.items.map((item) => [item.legacyId, item]));

  it('is a deterministic 42-record overlay with exact audit counts', () => {
    expect(artifact.waveId).toBe('eppp-memory-aid-correction-wave-01');
    expect(artifact.status).toContain('independent-expert-review-pending');
    expect(artifact.summary).toEqual({
      items: 42,
      titleCurrentnessRecords: 6,
      learnerContentUnicodeRecords: 14,
      sourceMetadataUnicodeRecords: 5,
      sourceUrlMetadataAlignmentRecords: 3,
      currentnessRecords: 1,
      stableIdProvenanceRecords: 8,
      duplicateTopicPairsDifferentiated: 7,
      duplicateTopicRecordsDifferentiated: 14,
      sourceDirectnessRecords: 3,
    });
    expect(artifact.items).toHaveLength(42);
    expect(new Set(artifact.items.map((item) => item.legacyId)).size).toBe(42);
  });

  it('targets only known source-reviewed records and keeps evidence and release gates explicit', () => {
    for (const item of artifact.items) {
      const original = catalogById.get(item.legacyId);
      const legacy = legacyById.get(item.legacyId);
      expect(original, item.legacyId).toBeTruthy();
      expect(legacy, item.legacyId).toBeTruthy();
      const reviewedBase = numberedReviewById.get(item.legacyId) || original;
      expect(reviewedBase.reviewStatus, item.legacyId).toBe('source-reviewed-editorial-pass');
      expect(item.expectedTitle, item.legacyId).toBe(cleanText(legacy.title));
      expect(original.title, item.legacyId).toBe(
        original.reviewArtifact === 'eppp_memory_aid_correction_wave_01.json' ? item.title : item.expectedTitle,
      );
      expect(item.supersedesArtifact, item.legacyId).toBeTruthy();
      expect(item.correctionTypes.length, item.legacyId).toBeGreaterThan(0);
      expect(item.reviewStatus, item.legacyId).toBe('source-reviewed-editorial-pass');
      expect(item.independentExpertStatus, item.legacyId).toBe('not-started');
      expect(item.productionStatus, item.legacyId).toBe('not-production-validated');
      expect(item.content.length, item.legacyId).toBeGreaterThan(100);
      expect(item.reviewNote.length, item.legacyId).toBeGreaterThan(20);
      expect(item.references, item.legacyId).toEqual(item.sourceDetails.map((source) => source.url));
      for (const source of item.sourceDetails) {
        expect(source.title, item.legacyId).toBeTruthy();
        expect(source.organization, item.legacyId).toBeTruthy();
        expect(source.whyReputable.length, item.legacyId).toBeGreaterThan(30);
      }
    }
  });

  it('restores every confirmed learner-content and source-metadata glyph deterministically', () => {
    for (const [id, replacements] of Object.entries(data.UNICODE_CONTENT_REPLACEMENTS)) {
      const item = byId.get(id);
      expect(item.correctionTypes).toContain('learner-content-unicode-restoration');
      for (const [oldText, newText] of replacements) {
        expect(item.content, `${id}: ${oldText}`).not.toContain(oldText);
        expect(item.content, `${id}: ${newText}`).toContain(newText);
      }
    }
    for (const [id, replacements] of Object.entries(data.UNICODE_METADATA_REPLACEMENTS)) {
      const item = byId.get(id);
      const metadata = JSON.stringify(item.sourceDetails);
      expect(item.correctionTypes).toContain('source-metadata-unicode-restoration');
      for (const [oldText, newText] of replacements) {
        expect(metadata, `${id}: ${oldText}`).not.toContain(oldText);
        expect(metadata, `${id}: ${newText}`).toContain(newText);
      }
    }
  });

  it('gives all eight title-keyed manual reviews stable-ID correction provenance', () => {
    expect(data.MANUAL_PROVENANCE_IDS).toHaveLength(8);
    for (const id of data.MANUAL_PROVENANCE_IDS) {
      const item = byId.get(id);
      expect(item.supersedesArtifact, id).toBe('eppp_learning_review_overrides.json');
      expect(item.correctionTypes, id).toContain('stable-id-provenance');
    }
  });

  it('aligns the three audited reference/source-detail mismatches exactly', () => {
    for (const id of [
      'memory-aid-93e9d82228226719',
      'memory-aid-65cce325295440e1',
      'memory-aid-9992bd978c9152fa',
    ]) {
      const item = byId.get(id);
      expect(item.correctionTypes).toContain('source-url-metadata-alignment');
      expect(item.references).toEqual(item.sourceDetails.map((source) => source.url));
    }
  });

  it('uses the official 2025 ILAE classification instead of calling 2017 terminology current', () => {
    const item = byId.get('memory-aid-c4ee337cb0ae9dc8');
    expect(item.correctionTypes).toContain('accuracy-and-currency');
    expect(item.content).toContain('The 2025 ILAE classification uses four main classes');
    expect(item.content).toContain('Consciousness replaces awareness');
    expect(item.content).not.toContain('Current ILAE language first classifies onset');
    expect(item.references).toContain('https://www.ilae.org/files/dmfile/updated-classification-of-epileptic-seizures-2025.pdf');
    expect(item.references.some((url) => url.includes('operational-classification-2017'))).toBe(false);
  });

  it('differentiates seven material duplicate-topic pairs by learner purpose', () => {
    const ids = Object.keys(data.DUPLICATE_PURPOSE_TITLES);
    expect(ids).toHaveLength(14);
    expect(new Set(ids.map((id) => byId.get(id).title)).size).toBe(14);
    for (const id of ids) {
      expect(byId.get(id).title).toBe(data.DUPLICATE_PURPOSE_TITLES[id]);
      expect(byId.get(id).correctionTypes).toContain('learner-purpose-differentiation');
    }
    expect(byId.get('memory-aid-1709f623adcd8ca3').content).toContain('Procedure first');
    expect(byId.get('memory-aid-a9466a34b18904da').content).toContain('reunion classifications');
  });

  it('replaces all six stale DSM-5-only titles without inflating duplicate-pair counts', () => {
    expect(Object.keys(data.TITLE_CURRENTNESS_OVERRIDES)).toHaveLength(6);
    for (const [id, title] of Object.entries(data.TITLE_CURRENTNESS_OVERRIDES)) {
      expect(byId.get(id).title).toBe(title);
      expect(byId.get(id).correctionTypes).toContain('title-currentness');
    }
    const finalById = new Map(catalog.memoryAids.map((item) => [item.id, { ...item }]));
    for (const item of read('test_prep/eppp_memory_aid_review_wave_08.json').items) {
      finalById.set(item.legacyId, { ...finalById.get(item.legacyId), ...item, id: item.legacyId });
    }
    for (const item of artifact.items) {
      finalById.set(item.legacyId, {
        ...finalById.get(item.legacyId),
        ...item,
        id: item.legacyId,
        reviewArtifact: artifactPath.split('/').at(-1),
      });
    }
    const stale = [...finalById.values()].filter((item) => (
      item.reviewStatus === 'source-reviewed-editorial-pass' && /DSM-5(?!-TR)/.test(item.title)
    ));
    expect(stale).toEqual([]);
  });

  it('adds direct topical sources for the three clear source-scope gaps', () => {
    for (const id of data.SOURCE_DIRECTNESS_IDS) {
      expect(byId.get(id).correctionTypes).toContain('source-directness');
    }
    expect(byId.get('memory-aid-975f2d9055198688').references[0]).toContain('/cognitive-behavioral');
    expect(byId.get('memory-aid-52975d7ab9dc4cfb').references).toEqual(expect.arrayContaining([
      'https://www.nice.org.uk/guidance/cg31/chapter/Recommendations',
      'https://www.nice.org.uk/guidance/ng222/chapter/Recommendations',
    ]));
    expect(byId.get('memory-aid-28fd96d344b9008e').references[0]).toContain('APA_DSM-5-Schizophrenia.pdf');
    expect(byId.get('memory-aid-28fd96d344b9008e').title).toBe('Schizophrenia Criteria: DSM-5-TR Cue');
  });

  it('is consumed after numbered waves and before catalog projection in normal builds', () => {
    const builder = fs.readFileSync(resolve(process.cwd(), 'dev-tools/build_eppp_learning_library.cjs'), 'utf8');
    const wrapper = fs.readFileSync(resolve(process.cwd(), 'dev-tools/build_eppp_learning_library_with_reviews.cjs'), 'utf8');
    expect(builder).toContain('const memoryAidCorrectionWavePattern = /^eppp_memory_aid_correction_wave_\\d+\\.json$/i;');
    expect(builder.indexOf('const memoryAidWaveRecords = new Map();')).toBeLessThan(builder.indexOf('const memoryAidCorrectionRecords = new Map();'));
    expect(builder.indexOf('const memoryAidCorrectionRecords = new Map();')).toBeLessThan(builder.indexOf('const aidRecords = memoryAids.map'));
    expect(builder).toContain('const override = { ...manualOverride, ...waveOverride, ...correctionOverride };');
    expect(builder).toContain('Corrected memory aids lack reviewArtifact');
    expect(builder).toContain('Released memory aids lack complete artifact, source, or pending-gate metadata');
    const composeIndex = wrapper.indexOf("require('./compose_eppp_memory_aid_review_wave_08.cjs')");
    const correctionIndex = wrapper.indexOf("require('./build_eppp_memory_aid_correction_wave_01.cjs')");
    const catalogIndex = wrapper.indexOf("require('./build_eppp_learning_library.cjs')");
    expect(composeIndex).toBeLessThan(correctionIndex);
    expect(correctionIndex).toBeLessThan(catalogIndex);
  });

  it('projects all 255 reviewed aids through the real builder without writing shared catalogs', () => {
    const paths = [
      resolve(process.cwd(), 'test_prep/eppp_learning_library.json'),
      resolve(process.cwd(), 'desktop/web-app/public/test_prep/eppp_learning_library.json'),
    ];
    const before = paths.map((file) => fs.existsSync(file) ? fs.readFileSync(file) : null);
    const result = spawnSync(process.execPath, ['dev-tools/build_eppp_learning_library.cjs'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: { ...process.env, EPPP_LIBRARY_VALIDATE_ONLY: '1' },
    });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('255/255 memory aids pass projection guards; no catalog files written');
    const after = paths.map((file) => fs.existsSync(file) ? fs.readFileSync(file) : null);
    for (let index = 0; index < paths.length; index += 1) {
      if (before[index] === null) expect(after[index]).toBeNull();
      else expect(after[index].equals(before[index]), paths[index]).toBe(true);
    }
  }, 30_000);

  it('reconstructs the same artifact with no prior output after a corrected-catalog projection', () => {
    const tempRoot = fs.mkdtempSync(resolve(os.tmpdir(), 'eppp-correction-wave01-'));
    try {
      const projected = JSON.parse(JSON.stringify(catalog));
      const projectedById = new Map(projected.memoryAids.map((item) => [item.id, item]));
      for (const item of artifact.items) {
        Object.assign(projectedById.get(item.legacyId), item, {
          id: item.legacyId,
          reviewArtifact: 'eppp_memory_aid_correction_wave_01.json',
          correctionArtifact: 'eppp_memory_aid_correction_wave_01.json',
        });
      }
      const fixtureCatalog = resolve(tempRoot, 'catalog.json');
      const fixtureOutput = resolve(tempRoot, 'correction.json');
      fs.writeFileSync(fixtureCatalog, `${JSON.stringify(projected, null, 2)}\n`, 'utf8');
      const result = spawnSync(process.execPath, ['dev-tools/build_eppp_memory_aid_correction_wave_01.cjs'], {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: {
          ...process.env,
          EPPP_MEMORY_AID_CORRECTION_CATALOG_PATH: fixtureCatalog,
          EPPP_MEMORY_AID_CORRECTION_OUTPUT_PATH: fixtureOutput,
        },
      });
      expect(result.status, result.stderr).toBe(0);
      expect(fs.readFileSync(fixtureOutput).equals(fs.readFileSync(resolve(process.cwd(), artifactPath)))).toBe(true);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('regenerates the committed correction artifact byte-for-byte into isolated output', () => {
    const tempRoot = fs.mkdtempSync(resolve(os.tmpdir(), 'eppp-correction-idempotent-'));
    try {
      const fixtureOutput = resolve(tempRoot, 'correction.json');
      const result = spawnSync(process.execPath, ['dev-tools/build_eppp_memory_aid_correction_wave_01.cjs'], {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: { ...process.env, EPPP_MEMORY_AID_CORRECTION_OUTPUT_PATH: fixtureOutput },
      });
      expect(result.status, result.stderr).toBe(0);
      expect(fs.readFileSync(fixtureOutput).equals(fs.readFileSync(resolve(process.cwd(), artifactPath)))).toBe(true);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
