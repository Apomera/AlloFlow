import { afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const Pipeline = require(resolve(process.cwd(), 'dev-tools/lib/pd_publish_pipeline.cjs'));
const PdCore = require(resolve(process.cwd(), 'pd_core_module.js'));
const CLI = resolve(process.cwd(), 'dev-tools/check_pd_publish.cjs');
const temporaryRoots = [];
const temporaryOutputs = [];

afterEach(() => {
  while (temporaryOutputs.length) {
    const output = temporaryOutputs.pop();
    if (existsSync(output)) rmSync(output, { recursive: true, force: true });
  }
  while (temporaryRoots.length) rmSync(temporaryRoots.pop(), { recursive: true, force: true });
});


function freshReportPath(label = 'report') {
  const output = resolve(process.cwd(), 'reports', 'pd',
    'pd-publish-' + label + '-' + process.pid + '-' + Date.now() + '-' + Math.random().toString(16).slice(2) + '.json');
  temporaryOutputs.push(output);
  return output;
}
function fixtureModule() {
  return {
    schema_version: 'pd-1.0',
    kind: 'pd_module',
    metadata: {
      id: 'module-one',
      version: '1.0.0',
      language: 'en-US',
      title: 'Private title sentinel',
      topic: 'Instruction',
      summary: 'Private summary sentinel',
      estMinutes: 15,
      audience: 'educator',
      license: 'CC-BY-SA-4.0',
      credit: 'Private credit sentinel',
    },
    sections: [{
      title: 'Learn',
      activities: [{
        id: 'read-one',
        type: 'read',
        title: 'Read',
        content: { body: 'PRIVATE-STUDENT-CONTENT-207-555-0199' },
        gate: { kind: 'none' },
      }],
    }],
  };
}

function createCatalog({ mutateModule, mutateEntry, mutateManifest, orphanModule } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'alloflow-pd-publish-'));
  temporaryRoots.push(root);
  const approved = join(root, 'catalog', 'pd', 'approved');
  mkdirSync(approved, { recursive: true });

  const module = fixtureModule();
  if (mutateModule) mutateModule(module);
  const relativePath = 'catalog/pd/approved/module-one.json';
  const entry = Pipeline.recommendedManifestEntry(module, relativePath);
  if (mutateEntry) mutateEntry(entry);
  const manifest = {
    schema_version: 'pd-1.0',
    kind: 'pd_catalog',
    generated_at: '2026-07-16T00:00:00.000Z',
    entries: [entry],
    paths: [],
  };
  if (mutateManifest) mutateManifest(manifest);

  writeFileSync(join(root, relativePath), JSON.stringify(module, null, 2) + '\n');
  if (orphanModule) {
    const orphan = fixtureModule();
    orphan.metadata.id = 'orphan-module';
    writeFileSync(join(approved, 'orphan-module.json'), JSON.stringify(orphan, null, 2) + '\n');
  }
  writeFileSync(join(root, 'catalog', 'pd', 'index.json'), JSON.stringify(manifest, null, 2) + '\n');
  return { root, module, entry, manifest };
}

function allChecks(report) {
  return [
    ...(report.catalog ? report.catalog.checks : []),
    ...report.modules.flatMap((moduleReport) => moduleReport.checks),
  ];
}

function codesWithStatus(report, status) {
  return allChecks(report).filter((item) => item.status === status).map((item) => item.code);
}

describe('PD prepublish pipeline', () => {
  it('accepts the checked-in catalog while preserving the manual-review boundary', () => {
    const report = Pipeline.inspectPdCatalog({ root: process.cwd() });
    expect(report).toMatchObject({
      schema_version: 'pd-publish-report-1.0',
      kind: 'pd_publish_report',
      targetStandard: 'WCAG 2.2 AA',
      conformanceClaim: false,
      scope: 'catalog',
      summary: {
        modules: 3,
        blockingFailures: 0,
        manualReviewRequired: true,
        readinessStatus: 'ready-for-render-audit',
        releaseStatus: 'manual-review-required',
      },
    });
    expect(report.modules.every((moduleReport) => moduleReport.contentDigest.startsWith('sha256:'))).toBe(true);
  });

  it('is deterministic and never copies module content or display metadata into its report', () => {
    const { root } = createCatalog();
    const first = Pipeline.inspectPdCatalog({ root });
    const second = Pipeline.inspectPdCatalog({ root });
    expect(second).toEqual(first);
    const serialized = JSON.stringify(first);
    expect(serialized).not.toContain('PRIVATE-STUDENT-CONTENT');
    expect(serialized).not.toContain('207-555-0199');
    expect(serialized).not.toContain('Private title sentinel');
    expect(serialized).not.toContain('Private summary sentinel');
    expect(serialized).not.toContain('Private credit sentinel');
    expect(first.modules[0].sourcePath).toBe('catalog/pd/approved/module-one.json');
    expect(serialized).not.toMatch(/[A-Z]:\\/i);
  });

  it('derives a complete manifest entry from PdCore canonical binding', () => {
    const module = fixtureModule();
    const entry = Pipeline.recommendedManifestEntry(module, 'catalog/pd/approved/module-one.json');
    expect(entry).toMatchObject({
      slug: 'module-one',
      moduleId: 'module-one',
      version: '1.0.0',
      language: 'en-US',
      contentDigest: PdCore.moduleContentDigest(module),
      path: 'catalog/pd/approved/module-one.json',
    });
  });

  it('blocks stale immutable bindings and mismatched display metadata', () => {
    const { root } = createCatalog({
      mutateEntry(entry) {
        entry.version = '2.0.0';
        entry.moduleId = 'institution:other-module';
        entry.language = 'fr';
        entry.contentDigest = 'sha256:' + '0'.repeat(64);
        entry.title = 'Different title';
        entry.summary = '';
      },
    });
    const report = Pipeline.inspectPdCatalog({ root });
    expect(report.summary.releaseStatus).toBe('blocked');
    expect(codesWithStatus(report, 'fail')).toEqual(expect.arrayContaining([
      'manifest-version-binding',
      'manifest-module-id-binding',
      'manifest-language-binding',
      'manifest-digest-binding',
      'manifest-title-binding',
      'manifest-summary-present',
    ]));
  });

  it('blocks missing publishing metadata and accessibility authoring alternatives', () => {
    const { root } = createCatalog({
      mutateModule(module) {
        delete module.metadata.version;
        delete module.metadata.language;
        module.sections[0].activities = [{
          id: 'video-one',
          type: 'video',
          title: 'Watch',
          content: { url: 'https://example.org/video' },
          gate: { kind: 'none' },
        }];
      },
    });
    const report = Pipeline.inspectPdCatalog({ root });
    expect(codesWithStatus(report, 'fail')).toEqual(expect.arrayContaining([
      'publish-version',
      'publish-language',
      'accessibility-authoring-readiness',
      'accessibility-metadata-language-missing',
      'accessibility-video-captions-missing',
      'accessibility-video-alternative-missing',
    ]));
  });

  it('uses PdCore to block unsafe links and inaccessible restricted-paste policies', () => {
    const unsafe = createCatalog({
      mutateModule(module) {
        module.sections[0].activities[0].content.links = [{ label: 'Run', url: 'javascript:alert(1)' }];
      },
    });
    expect(codesWithStatus(Pipeline.inspectPdCatalog({ root: unsafe.root }), 'fail')).toContain('pd-core-schema');

    const restricted = createCatalog({
      mutateModule(module) {
        module.assessmentPolicy = { paste: { mode: 'restricted' } };
      },
    });
    expect(codesWithStatus(Pipeline.inspectPdCatalog({ root: restricted.root }), 'fail')).toContain('pd-core-schema');
  });

  it('blocks traversal, duplicate catalog identity, and unlisted approved files', () => {
    const traversal = createCatalog({
      mutateEntry(entry) { entry.path = '../outside.json'; },
      orphanModule: true,
    });
    const traversalCodes = codesWithStatus(Pipeline.inspectPdCatalog({ root: traversal.root }), 'fail');
    expect(traversalCodes).toContain('catalog-entry-safe-path');
    expect(traversalCodes).toContain('catalog-approved-file-listed');

    const duplicate = createCatalog({
      mutateManifest(manifest) {
        manifest.entries.push({ ...manifest.entries[0], slug: 'module-two' });
      },
    });
    const duplicateCodes = codesWithStatus(Pipeline.inspectPdCatalog({ root: duplicate.root }), 'fail');
    expect(duplicateCodes).toContain('catalog-entry-path-unique');
    expect(duplicateCodes).toContain('catalog-module-id-unique');
  });

  it('blocks learning paths that reference unpublished or repeated modules', () => {
    const { root } = createCatalog({
      mutateManifest(manifest) {
        manifest.paths = [{
          slug: 'starter-path',
          title: 'Starter',
          summary: 'A path.',
          moduleSlugs: ['module-one', 'module-one', 'not-published'],
        }];
      },
    });
    const failures = codesWithStatus(Pipeline.inspectPdCatalog({ root }), 'fail');
    expect(failures).toContain('catalog-learning-path-module-unique');
    expect(failures).toContain('catalog-learning-path-module-published');
  });
  it('blocks unknown pd-1.0 fields without copying field names or values into findings', () => {
    const { root } = createCatalog({
      mutateModule(module) {
        module.privateEnvelope = 'PRIVATE-UNKNOWN-MODULE-VALUE';
        module.metadata.privateMetadata = 'PRIVATE-UNKNOWN-METADATA-VALUE';
        module.sections[0].activities[0].content.privateContent = 'PRIVATE-UNKNOWN-CONTENT-VALUE';
      },
      mutateEntry(entry) {
        entry.privateEntry = 'PRIVATE-UNKNOWN-ENTRY-VALUE';
      },
      mutateManifest(manifest) {
        manifest.privateManifest = 'PRIVATE-UNKNOWN-MANIFEST-VALUE';
      },
    });
    const report = Pipeline.inspectPdCatalog({ root });
    expect(codesWithStatus(report, 'fail')).toEqual(expect.arrayContaining([
      'catalog-manifest-fields',
      'catalog-entry-fields',
      'schema-module-fields',
      'schema-metadata-fields',
      'schema-content-fields',
    ]));
    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain('privateEnvelope');
    expect(serialized).not.toContain('privateMetadata');
    expect(serialized).not.toContain('privateContent');
    expect(serialized).not.toContain('privateEntry');
    expect(serialized).not.toContain('privateManifest');
    expect(serialized).not.toContain('PRIVATE-UNKNOWN');
  });

  it('rejects oversized module and manifest inputs before parsing content', () => {
    const moduleReport = Pipeline.inspectPdModule({
      root: process.cwd(),
      filePath: resolve(process.cwd(), 'oversized-private-module.json'),
      moduleText: Buffer.alloc(Pipeline.LIMITS.MAX_MODULE_BYTES + 1, 0x41),
    });
    expect(moduleReport.checks.find((item) => item.code === 'module-size')).toMatchObject({ status: 'fail' });

    const { root } = createCatalog();
    const privateSentinel = 'PRIVATE-OVERSIZED-MANIFEST-VALUE';
    writeFileSync(join(root, 'catalog', 'pd', 'index.json'),
      ' '.repeat(Pipeline.LIMITS.MAX_MANIFEST_BYTES + 1) + privateSentinel);
    const catalogReport = Pipeline.inspectPdCatalog({ root });
    expect(codesWithStatus(catalogReport, 'fail')).toContain('catalog-manifest-size');
    expect(JSON.stringify(catalogReport)).not.toContain(privateSentinel);
  });

  it('rejects control characters in catalog paths without echoing the path', () => {
    const { root } = createCatalog({
      mutateEntry(entry) {
        entry.path = 'catalog/pd/approved/private-path\u0000sentinel.json';
      },
    });
    const report = Pipeline.inspectPdCatalog({ root });
    expect(codesWithStatus(report, 'fail')).toEqual(expect.arrayContaining([
      'catalog-control-characters',
      'catalog-entry-safe-path',
    ]));
    expect(JSON.stringify(report)).not.toContain('private-path');
    expect(JSON.stringify(report)).not.toContain('sentinel');
  });

  it('rejects approved-module symlink or junction traversal when the platform permits creating it', () => {
    const { root, module, entry, manifest } = createCatalog();
    const outside = mkdtempSync(join(tmpdir(), 'alloflow-pd-outside-'));
    temporaryRoots.push(outside);
    writeFileSync(join(outside, 'module-one.json'), JSON.stringify(module, null, 2) + '\n');
    const linked = join(root, 'catalog', 'pd', 'approved', 'linked');
    try {
      symlinkSync(outside, linked, process.platform === 'win32' ? 'junction' : 'dir');
    } catch (_error) {
      return;
    }
    entry.path = 'catalog/pd/approved/linked/module-one.json';
    writeFileSync(join(root, 'catalog', 'pd', 'index.json'), JSON.stringify(manifest, null, 2) + '\n');
    const report = Pipeline.inspectPdCatalog({ root });
    expect(codesWithStatus(report, 'fail')).toEqual(expect.arrayContaining([
      'catalog-entry-realpath',
      'catalog-approved-tree-no-reparse',
    ]));
  });

  it('exposes a binding-only rendered-surface contract and critical state inventory', () => {
    const report = Pipeline.inspectPdCatalog({ root: process.cwd() });
    expect(report.runtime).toMatchObject({
      component_profile_version: 'pd-runtime-components-1.0',
      conformanceClaim: false,
      rendered_surface: {
        contract_version: 'pd-rendered-surface-binding-1.0',
        verification_status: 'binding-only',
        automated_audit_status: 'not-evaluated-by-publisher',
        conformanceClaim: false,
      },
    });
    for (const digest of [
      report.runtime.runtime_build_digest,
      report.runtime.renderer_digest,
      report.runtime.styles_digest,
      report.runtime.state_inventory_digest,
    ]) expect(digest).toMatch(/^sha256:[a-f0-9]{64}$/);

    expect(Pipeline.PD_STATE_INVENTORY.activityStates.sim).toEqual(expect.arrayContaining([
      'idle', 'scoring', 'success', 'unavailable', 'error', 'edit-invalidated',
    ]));
    expect(Pipeline.PD_STATE_INVENTORY.activityStates.quiz).toEqual(expect.arrayContaining([
      'unanswered', 'partial', 'submitted-pass', 'submitted-fail',
    ]));
    expect(Pipeline.PD_STATE_INVENTORY.pastePolicyStates).toEqual(expect.arrayContaining([
      'allowed', 'monitored', 'restricted-blocked', 'accommodation-notice',
    ]));
    expect(Pipeline.PD_STATE_INVENTORY.runnerStates).toEqual(expect.arrayContaining([
      'loading', 'fresh', 'resumed', 'active', 'completed', 'fetch-error', 'validation-error',
    ]));
    expect(Pipeline.PD_STATE_INVENTORY.reviewExportStates).toEqual(expect.arrayContaining([
      'consent-unchecked', 'preview', 'second-confirmation', 'download-ready', 'error',
    ]));
    expect(Pipeline.PD_STATE_INVENTORY.catalogStates).toEqual(expect.arrayContaining([
      'loading', 'ready', 'fetch-error', 'validation-error',
    ]));
  });
});

describe('PD prepublish CLI', () => {
  it('emits machine-readable JSON and uses exit 0 for the checked-in catalog', () => {
    const result = spawnSync(process.execPath, [CLI, '--catalog', '--json'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    expect(result.status, result.stderr).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report).toMatchObject({
      schema_version: 'pd-publish-report-1.0',
      conformanceClaim: false,
      summary: { blockingFailures: 0 },
      runtime: {
        conformanceClaim: false,
        rendered_surface: { verification_status: 'binding-only', conformanceClaim: false },
      },
    });
  });

  it('uses exit 1 for blocking module findings and does not echo private content', () => {
    const { root } = createCatalog({
      mutateModule(module) { delete module.metadata.language; },
    });
    const modulePath = join(root, 'catalog', 'pd', 'approved', 'module-one.json');
    const result = spawnSync(process.execPath, [CLI, '--module', modulePath, '--json'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    expect(result.status).toBe(1);
    expect(result.stdout).not.toContain('PRIVATE-STUDENT-CONTENT');
    expect(JSON.parse(result.stdout).summary.blockingFailures).toBeGreaterThan(0);
  });

  it('keeps stdout quiet but prints actionable content-free findings on quiet failure', () => {
    const { root } = createCatalog({
      mutateModule(module) { delete module.metadata.language; },
    });
    const modulePath = join(root, 'catalog', 'pd', 'approved', 'module-one.json');
    const result = spawnSync(process.execPath, [CLI, '--module', modulePath, '--quiet'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('PD prepublish check: BLOCKED');
    expect(result.stderr).toContain('publish-language');
    expect(result.stderr).not.toContain('PRIVATE-STUDENT-CONTENT');
  });

  it('writes one new content-free report only below reports/pd', () => {
    const { root } = createCatalog();
    const modulePath = join(root, 'catalog', 'pd', 'approved', 'module-one.json');
    const original = readFileSync(modulePath, 'utf8');
    const outputPath = freshReportPath('success');
    const result = spawnSync(process.execPath, [CLI, '--module', modulePath, '--json', '--out', outputPath, '--quiet'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toBe('');
    expect(readFileSync(modulePath, 'utf8')).toBe(original);
    const report = JSON.parse(readFileSync(outputPath, 'utf8'));
    expect(report.conformanceClaim).toBe(false);
    expect(JSON.stringify(report)).not.toContain('PRIVATE-STUDENT-CONTENT');
  });

  it('refuses output outside reports/pd or through parent traversal', () => {
    const { root } = createCatalog();
    const modulePath = join(root, 'catalog', 'pd', 'approved', 'module-one.json');
    const outside = join(root, 'outside-report.json');
    const outsideResult = spawnSync(process.execPath, [CLI, '--module', modulePath, '--out', outside, '--quiet'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    expect(outsideResult.status).toBe(2);
    expect(outsideResult.stderr).toMatch(/strictly below reports\/pd/i);
    expect(existsSync(outside)).toBe(false);

    const traversalResult = spawnSync(process.execPath,
      [CLI, '--module', modulePath, '--out', 'reports/pd/../escaped-report.json', '--quiet'], {
        cwd: process.cwd(),
        encoding: 'utf8',
      });
    expect(traversalResult.status).toBe(2);
    expect(traversalResult.stderr).toMatch(/parent traversal/i);
  });

  it('uses exclusive creation and leaves an existing report unchanged', () => {
    const { root } = createCatalog();
    const modulePath = join(root, 'catalog', 'pd', 'approved', 'module-one.json');
    const outputPath = freshReportPath('exclusive');
    const first = spawnSync(process.execPath, [CLI, '--module', modulePath, '--out', outputPath, '--quiet'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    expect(first.status, first.stderr).toBe(0);
    const original = readFileSync(outputPath, 'utf8');
    const second = spawnSync(process.execPath, [CLI, '--module', modulePath, '--out', outputPath, '--quiet'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    expect(second.status).toBe(2);
    expect(second.stderr).toMatch(/refuses to overwrite/i);
    expect(readFileSync(outputPath, 'utf8')).toBe(original);
  });

  it('refuses linked or junction output parents when the platform permits creating one', () => {
    const { root } = createCatalog();
    const modulePath = join(root, 'catalog', 'pd', 'approved', 'module-one.json');
    const outside = mkdtempSync(join(tmpdir(), 'alloflow-pd-report-outside-'));
    temporaryRoots.push(outside);
    const linked = resolve(process.cwd(), 'reports', 'pd',
      'linked-' + process.pid + '-' + Date.now() + '-' + Math.random().toString(16).slice(2));
    mkdirSync(resolve(process.cwd(), 'reports', 'pd'), { recursive: true });
    try {
      symlinkSync(outside, linked, process.platform === 'win32' ? 'junction' : 'dir');
    } catch (_error) {
      return;
    }
    temporaryOutputs.push(linked);
    const result = spawnSync(process.execPath, [CLI, '--module', modulePath, '--out', join(linked, 'report.json'), '--quiet'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/linked, reparse, or non-directory/i);
    expect(existsSync(join(outside, 'report.json'))).toBe(false);
  });

  it('refuses to overwrite an approved module with --out', () => {
    const approvedPath = resolve(process.cwd(), 'catalog/pd/approved/udl-representation-quickstart.json');
    const original = readFileSync(approvedPath, 'utf8');
    const result = spawnSync(process.execPath, [CLI, '--catalog', '--out', approvedPath, '--quiet'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/strictly below reports\/pd/i);
    expect(readFileSync(approvedPath, 'utf8')).toBe(original);
  });

  it('includes PD tests in the default fast pipeline selector', () => {
    const selector = readFileSync(resolve(process.cwd(), 'dev-tools/check_pipeline_tests.cjs'), 'utf8');
    expect(selector).toContain("'pd_'");
    expect(selector).toContain("path.join(ROOT, 'node_modules', 'vitest', 'vitest.mjs')");
    expect(selector).toContain('spawnSync(process.execPath');
    expect(selector).toContain('shell: false');
    expect(selector).toContain('maxBuffer: 64 * 1024 * 1024');
  });
});
