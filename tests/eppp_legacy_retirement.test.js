import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  openEpppMigrationSourceArchive,
} = require('../dev-tools/eppp_migration_source_archive.cjs');
const {
  evidenceRoot,
  workspaceRoot,
} = require('../dev-tools/eppp_evidence_paths.cjs');

const archivePayloadSha256 = 'bc7be1d291b73727801870cdc7e6070574b4989ae64847eaf3c125f0c821bd3e';
const retiredRoots = [
  'test_prep/eppp_legacy',
  'desktop/web-app/test_prep/eppp_legacy',
  'desktop/web-app/public/test_prep/eppp_legacy',
];
const runtimeFiles = [
  'test_prep_hub_source.jsx',
  'test_prep_hub_module.js',
  'desktop/web-app/public/test_prep_hub_module.js',
  'test_prep/pack_registry.json',
  'test_prep/pack_manifest.json',
];
const normalBuilders = [
  '_build_test_prep_hub_module.js',
  'dev-tools/build_test_prep_hub_release.cjs',
  'dev-tools/build_eppp_learning_library.cjs',
  'dev-tools/build_eppp_memory_aid_correction_wave_01.cjs',
  'dev-tools/build_test_prep_pack_manifest.cjs',
];
const retiredRuntimePatterns = [
  /eppp_legacy/i,
  /<iframe\b/i,
  /\blegacy chapter fallback\b/i,
  /\bopen legacy chapter fallback\b/i,
  /\bselected EPPP legacy chapter fallback\b/i,
  /\bnative chapter prerequisites were not met\b/i,
];

const resolveWorkspace = (relativePath) => path.join(
  workspaceRoot,
  ...relativePath.split('/'),
);
const readWorkspace = (relativePath) => fs.readFileSync(resolveWorkspace(relativePath), 'utf8');

describe('EPPP legacy retirement contract', () => {
  it('keeps all three retired workspace trees absent', () => {
    for (const relativePath of retiredRoots) {
      expect(fs.existsSync(resolveWorkspace(relativePath)), relativePath).toBe(false);
    }
  });

  it('keeps source, generated modules, registry, and manifest free of retired runtime routes and UI', () => {
    for (const relativePath of runtimeFiles) {
      const source = readWorkspace(relativePath);
      for (const pattern of retiredRuntimePatterns) {
        expect(source, `${relativePath}: ${pattern}`).not.toMatch(pattern);
      }
    }

    for (const relativePath of ['test_prep/pack_registry.json', 'test_prep/pack_manifest.json']) {
      const catalog = JSON.parse(readWorkspace(relativePath));
      const epppEntries = catalog.entries.filter((entry) => String(entry.id).startsWith('eppp-'));
      expect(epppEntries.length, relativePath).toBeGreaterThan(0);
      for (const entry of epppEntries) {
        const serialized = JSON.stringify(entry);
        expect(entry, `${relativePath}:${entry.id}`).not.toHaveProperty('legacyUrl');
        for (const pattern of retiredRuntimePatterns) {
          expect(serialized, `${relativePath}:${entry.id}: ${pattern}`).not.toMatch(pattern);
        }
      }
    }
  });

  it('verifies the immutable 128-file archive outside runtime and deployment roots', () => {
    const archive = openEpppMigrationSourceArchive({ workspaceRoot });
    const actualPayloadFiles = fs.readdirSync(archive.archiveRoot, {
      recursive: true,
      withFileTypes: true,
    }).filter((entry) => entry.isFile() && entry.name !== 'manifest.json');

    expect(archive).toMatchObject({
      archiveRootRelative: 'migration_sources/eppp/v1',
      payloadSha256: archivePayloadSha256,
    });
    expect(archive.manifest).toMatchObject({
      schemaVersion: 1,
      archiveId: 'eppp-native-migration-source-v1',
      payloadSha256: archivePayloadSha256,
    });
    expect(archive.manifest.files).toHaveLength(128);
    expect(actualPayloadFiles).toHaveLength(128);

    const archiveRelative = path.relative(workspaceRoot, archive.archiveRoot)
      .replaceAll(path.sep, '/');
    expect(archiveRelative).toBe('migration_sources/eppp/v1');
    expect(archiveRelative).not.toMatch(/^(?:test_prep|desktop\/web-app)(?:\/|$)/);
    expect(fs.existsSync(resolveWorkspace('desktop/web-app/migration_sources/eppp/v1'))).toBe(false);
    expect(fs.existsSync(resolveWorkspace('desktop/web-app/public/migration_sources/eppp/v1'))).toBe(false);
  });

  it('binds all 44 non-runtime evidence artifacts to the verified archive', () => {
    const manifest = JSON.parse(fs.readFileSync(
      path.join(evidenceRoot, 'manifest.json'),
      'utf8',
    ));
    expect(manifest).toMatchObject({
      schemaVersion: 2,
      evidenceRoot: 'quality/eppp_provenance/evidence',
      migrationSourceArchive: {
        archiveId: 'eppp-native-migration-source-v1',
        root: 'migration_sources/eppp/v1',
        payloadSha256: archivePayloadSha256,
      },
      runtimePublished: false,
      artifactCount: 44,
      families: {
        audit: 4,
        curation: 6,
        adjudication: 16,
        review: 18,
      },
    });
    expect(manifest.artifacts).toHaveLength(44);
    expect(new Set(manifest.artifacts.map(
      (artifact) => `${artifact.family}/${artifact.file}`,
    )).size).toBe(44);
  });

  it('keeps normal builders archive-backed and unable to read the retired roots', () => {
    for (const relativePath of normalBuilders) {
      const source = readWorkspace(relativePath);
      expect(source, relativePath).not.toMatch(/eppp_legacy/i);
      expect(source, relativePath).not.toContain('--create-from-legacy');
    }

    const compatibilityBuilder = readWorkspace('_build_test_prep_hub_module.js');
    const releaseBuilder = readWorkspace('dev-tools/build_test_prep_hub_release.cjs');
    const libraryBuilder = readWorkspace('dev-tools/build_eppp_learning_library.cjs');
    expect(compatibilityBuilder).toContain('build_eppp_migration_source_archive.cjs');
    expect(compatibilityBuilder).toContain('--verify');
    expect(releaseBuilder).toContain('build_eppp_migration_source_archive.cjs');
    expect(releaseBuilder).toContain("'--verify'");
    expect(libraryBuilder).toContain('openEpppMigrationSourceArchive');
  });
});
