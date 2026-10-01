import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  artifacts,
  evidencePath,
  evidenceRoot,
  familyFiles,
  provenanceRoot,
  workspaceRoot,
} = require('../dev-tools/eppp_evidence_paths.cjs');
const { openEpppMigrationSourceArchive } = require('../dev-tools/eppp_migration_source_archive.cjs');

const manifestPath = path.join(evidenceRoot, 'manifest.json');
const legacyRoots = [
  path.join(workspaceRoot, 'test_prep', 'eppp_legacy'),
  path.join(workspaceRoot, 'desktop', 'web-app', 'public', 'test_prep', 'eppp_legacy'),
];
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

describe('EPPP non-runtime evidence provenance', () => {
  it('binds all 44 canonical artifacts with deterministic SHA-256 records', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(manifest).toMatchObject({
      schemaVersion: 2,
      provenanceRoot: 'quality/eppp_provenance',
      evidenceRoot: 'quality/eppp_provenance/evidence',
      relocationBaseline: {
        baselineId: 'eppp-evidence-relocation-v1',
        path: 'quality/eppp_provenance/relocation_baseline_v1.json',
        sourceCommit: 'e30337c715bc61879a09e637cdd3b144da07a783',
        artifactCount: 44,
        sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      },
      migrationSourceArchive: {
        archiveId: 'eppp-native-migration-source-v1',
        root: 'migration_sources/eppp/v1',
        payloadSha256: 'bc7be1d291b73727801870cdc7e6070574b4989ae64847eaf3c125f0c821bd3e',
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
    expect(artifacts).toHaveLength(44);
    expect(manifest.artifacts).toHaveLength(44);

    const expectedOrder = artifacts.map(({ family, file }) => `${family}/${file}`);
    expect(manifest.artifacts.map(({ family, file }) => `${family}/${file}`)).toEqual(expectedOrder);
    for (const record of manifest.artifacts) {
      const bytes = fs.readFileSync(evidencePath(record.family, record.file));
      expect(record.repositoryPath).toBe(`quality/eppp_provenance/evidence/${record.family}/${record.file}`);
      expect(record.bytes).toBe(bytes.length);
      expect(record.sha256).toBe(sha256(bytes));
      const original = fs.readFileSync(path.join(workspaceRoot, ...record.relocationOriginal.preservationPath.split('/')));
      expect(record.relocationOriginal.historicalSourcePath).toBe(`test_prep/eppp_legacy/${record.file}`);
      expect(record.relocationOriginal.historicalPublicPath).toBe(`desktop/web-app/public/test_prep/eppp_legacy/${record.file}`);
      expect(record.relocationOriginal.bytes).toBe(original.length);
      expect(record.relocationOriginal.sha256).toBe(sha256(original));
    }
    const advancing = manifest.artifacts.filter((record) => record.relocationOriginal.liveArtifactMayAdvance);
    expect(advancing.map((record) => record.file).sort()).toEqual([
      'content_audit.json',
      'content_audit.md',
      'content_inventory.json',
      'content_inventory.md',
    ]);
    expect(advancing.every((record) => record.relocationOriginal.preservationPath.startsWith('quality/eppp_provenance/history/v1/audit/'))).toBe(true);
  });

  it('keeps evidence out of both legacy runtime trees and rejects unmanifested family files', () => {
    for (const { file } of artifacts) {
      for (const legacyRoot of legacyRoots) expect(fs.existsSync(path.join(legacyRoot, file))).toBe(false);
    }
    for (const [family, files] of Object.entries(familyFiles)) {
      expect(fs.readdirSync(path.join(evidenceRoot, family)).sort()).toEqual([...files].sort());
    }
    expect(fs.existsSync(path.join(provenanceRoot, 'README.md'))).toBe(true);
  });

  it('records the verified frozen archive in foundational audit and inventory evidence', () => {
    const archive = openEpppMigrationSourceArchive({ workspaceRoot });
    for (const file of ['content_audit.json', 'content_inventory.json']) {
      const report = JSON.parse(fs.readFileSync(evidencePath('audit', file), 'utf8'));
      expect(report.sourceArchive).toEqual({
        archiveId: archive.manifest.archiveId,
        root: archive.archiveRootRelative,
        payloadSha256: archive.payloadSha256,
      });
    }
  });

  it('rebuilds the manifest byte-for-byte and keeps evidence builders free of runtime outputs', () => {
    const before = fs.readFileSync(manifestPath);
    execFileSync(process.execPath, ['dev-tools/build_eppp_evidence_manifest.cjs'], {
      cwd: workspaceRoot,
      stdio: 'pipe',
    });
    expect(fs.readFileSync(manifestPath)).toEqual(before);

    const builders = [
      'audit_eppp_content.cjs',
      'inventory_eppp_learning_content.cjs',
      'build_eppp_500_curation_manifest.cjs',
      'build_eppp_1000_curation_manifest.cjs',
      'build_eppp_1500_curation_manifest.cjs',
      ...Array.from({ length: 7 }, (_, index) => `build_eppp_adjudication_batch_${String(index + 1).padStart(2, '0')}.cjs`),
      'build_eppp_adjudication_index.cjs',
      'build_eppp_bulk_review_wave_01.cjs',
      'build_eppp_next_review_docket.cjs',
      'build_eppp_review_ledger.cjs',
    ];
    for (const builder of builders) {
      const source = fs.readFileSync(path.join(workspaceRoot, 'dev-tools', builder), 'utf8');
      expect(source, builder).not.toContain("desktop/web-app/public/test_prep/eppp_legacy");
      expect(source, builder).not.toMatch(/test_prep['"],\s*['"]eppp_legacy/);
      expect(source, builder).toContain('eppp_evidence_paths.cjs');
    }
  });
});
