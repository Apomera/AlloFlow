import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path, { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  ARCHIVE_ROOT_RELATIVE,
  archivePayloadSha256,
  openEpppMigrationSourceArchive,
} = require('../dev-tools/eppp_migration_source_archive.cjs');

const root = resolve(process.cwd());
const archiveRoot = path.join(root, ...ARCHIVE_ROOT_RELATIVE.split('/'));
const temporaryRoots = [];

afterEach(() => {
  for (const temporaryRoot of temporaryRoots.splice(0)) {
    const resolvedRoot = path.resolve(temporaryRoot);
    if (!resolvedRoot.startsWith(path.resolve(os.tmpdir()) + path.sep)) {
      throw new Error(`Refusing to remove unexpected test path: ${resolvedRoot}`);
    }
    fs.rmSync(resolvedRoot, { recursive: true, force: true });
  }
});

describe('immutable EPPP migration-source archive', () => {
  it('binds every regeneration input and its execution order to deterministic SHA-256 metadata', () => {
    const archive = openEpppMigrationSourceArchive({ workspaceRoot: root });
    const { manifest } = archive;
    const learningPaths = Object.values(manifest.execution.learningLibrary).flat();
    const questionAuditPaths = Object.values(manifest.execution.questionAudit).flat();
    const executionPaths = [...new Set([...learningPaths, ...questionAuditPaths])];

    expect(ARCHIVE_ROOT_RELATIVE).toBe('migration_sources/eppp/v1');
    expect(manifest).toMatchObject({
      schemaVersion: 1,
      archiveId: 'eppp-native-migration-source-v1',
      frozenFrom: {
        historicalRoot: 'test_prep/eppp_legacy',
        selection: 'native-regeneration-inputs-only',
      },
      metadataPaths: ['LICENSE', 'ORIGIN.md'],
    });
    expect(manifest.payloadSha256).toBe(archivePayloadSha256(manifest));
    expect(manifest.execution.learningLibrary).toMatchObject({
      baseData: ['js/data.js'],
      memoryAids: ['js/memory_aids.js'],
      diagrams: ['js/textbook_diagrams.js'],
      glossary: ['js/textbook_term_defs.js'],
    });
    expect(manifest.execution.questionAudit).toMatchObject({
      baseData: ['js/data.js'],
      questionBank: ['js/questions_bank.js'],
    });
    expect(manifest.execution.learningLibrary.flashcards).toHaveLength(5);
    expect(manifest.execution.learningLibrary.chapters).toHaveLength(49);
    expect(manifest.execution.questionAudit.dataBatches).toHaveLength(48);
    expect(manifest.execution.questionAudit.rationaleEnhancements).toHaveLength(2);
    expect(manifest.execution.questionAudit.referenceOverlays).toHaveLength(17);
    expect(learningPaths).toHaveLength(58);
    expect(questionAuditPaths).toHaveLength(69);
    expect(executionPaths).toHaveLength(126);
    expect(manifest.files).toHaveLength(128);
    expect(archive.readText('ORIGIN.md')).toContain('never refresh this directory in place');
    expect(archive.readText('LICENSE')).toContain('Copyright (c) 2026 Apomera');
  });

  it('contains migration inputs only, outside runtime and deploy asset roots', () => {
    const archive = openEpppMigrationSourceArchive({ workspaceRoot: root });
    const paths = archive.manifest.files.map((record) => record.path);

    expect(archive.archiveRoot).toBe(archiveRoot);
    expect(paths.some((entry) => /(?:review|audit|curation|adjudication|ledger)/i.test(entry))).toBe(false);
    expect(paths.some((entry) => /\.(?:html|css|json)$/i.test(entry))).toBe(false);
    expect(paths.some((entry) => /(?:renderer|analytics|app)\.js$/i.test(entry))).toBe(false);
    expect(fs.existsSync(path.join(root, 'desktop/web-app/public', ARCHIVE_ROOT_RELATIVE))).toBe(false);
  });

  it('fails closed when one archived byte changes', () => {
    const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'eppp-migration-archive-'));
    temporaryRoots.push(temporaryRoot);
    fs.cpSync(archiveRoot, temporaryRoot, { recursive: true });
    const target = path.join(temporaryRoot, 'js', 'data.js');
    fs.appendFileSync(target, '\n// tampered fixture\n', 'utf8');

    expect(() => openEpppMigrationSourceArchive({ archiveRoot: temporaryRoot }))
      .toThrow(/byte-length mismatch|SHA-256 mismatch/);
  });

  it('wires both build entry points to verification and archive-backed regeneration', () => {
    const compatibilityBuilder = fs.readFileSync(
      path.join(root, '_build_test_prep_hub_module.js'),
      'utf8',
    );
    const releaseBuilder = fs.readFileSync(
      path.join(root, 'dev-tools', 'build_test_prep_hub_release.cjs'),
      'utf8',
    );
    const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

    expect(compatibilityBuilder).toContain('build_eppp_migration_source_archive.cjs');
    expect(compatibilityBuilder).toContain('build_eppp_learning_library.cjs');
    expect(compatibilityBuilder).not.toMatch(/repair_eppp_diagram_quality_wave_\d+\.cjs/);
    expect(releaseBuilder).toContain('build_eppp_migration_source_archive.cjs');
    expect(releaseBuilder).toContain('build_eppp_learning_library.cjs');
    expect(packageJson.scripts['verify:eppp-archive'])
      .toBe('node dev-tools/build_eppp_migration_source_archive.cjs --verify');
    expect(packageJson.scripts['build:eppp-library'])
      .toBe('node dev-tools/build_eppp_learning_library.cjs');
    expect(packageJson.scripts['build:test-prep-hub'])
      .toBe('node dev-tools/build_test_prep_hub_release.cjs');
  });

  it('keeps archive creation explicit and refuses in-place replacement', () => {
    const source = fs.readFileSync(
      path.join(root, 'dev-tools', 'build_eppp_migration_source_archive.cjs'),
      'utf8',
    );
    expect(source).toContain("--create-from-legacy");
    expect(source).toContain('Refusing to overwrite immutable EPPP migration-source archive');
    expect(source).toContain("flag: 'wx'");
    expect(source).toContain("selection: 'native-regeneration-inputs-only'");
  });
});
