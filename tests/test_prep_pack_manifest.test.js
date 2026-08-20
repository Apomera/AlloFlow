import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
const registryPath = resolve(root, 'test_prep/pack_registry.json');
const manifestPath = resolve(root, 'test_prep/pack_manifest.json');
const deployManifestPath = resolve(root, 'desktop/web-app/public/test_prep/pack_manifest.json');
const modulePath = resolve(root, 'test_prep_hub_module.js');
const deployModulePath = resolve(root, 'desktop/web-app/public/test_prep_hub_module.js');
const supportedCategories = [
  'professional-school-personnel',
  'workforce-vocational',
  'k12-college-readiness',
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

const companionFields = [
  ['learningLibraryUrl', 'learningLibrarySha256'],
  ['learningLibraryQaUrl', 'learningLibraryQaSha256'],
  ['nativeQaUrl', 'nativeQaSha256'],
];

function repoPathFromAssetUrl(assetUrl) {
  const value = String(assetUrl || '');
  if (/^\.\/test_prep\/[a-zA-Z0-9_.-]+\.json$/.test(value)) return value.slice(2);
  const cdnMatch = value.match(/^https:\/\/alloflow-cdn\.pages\.dev\/(test_prep\/[a-zA-Z0-9_.-]+\.json)$/);
  return cdnMatch ? cdnMatch[1] : '';
}

describe('Test Prep pack registry and generated manifest', () => {
  it('uses an explicit, uniquely keyed registry with the three portfolio categories', () => {
    const registry = readJson(registryPath);
    const categoryIds = registry.categories.map((category) => category.id);
    const entryIds = registry.entries.map((entry) => entry.id);

    expect(registry.schemaVersion).toBe(1);
    expect(new Set(categoryIds)).toEqual(new Set(supportedCategories));
    expect(new Set(categoryIds).size).toBe(categoryIds.length);
    expect(registry.categories.every((category) => category.label.trim())).toBe(true);
    expect(new Set(entryIds).size).toBe(entryIds.length);

    for (const entry of registry.entries) {
      expect(entry.id).toMatch(/^[a-z0-9][a-z0-9-]{2,99}$/);
      expect(['bundled', 'lazy']).toContain(entry.loadMode);
      expect(['public', 'preview', 'internal']).toContain(entry.visibility);
      expect(entry.portfolioCategories.length).toBeGreaterThan(0);
      expect(entry.portfolioCategories.every((category) => supportedCategories.includes(category))).toBe(true);

      if (entry.embedded === true) {
        expect(entry.sourcePath).toBeUndefined();
        continue;
      }

      expect(entry.sourcePath).toMatch(/^test_prep\/[a-zA-Z0-9_.-]+\.json$/);
      const sourcePath = resolve(root, ...entry.sourcePath.split('/'));
      expect(fs.existsSync(sourcePath), entry.sourcePath).toBe(true);
      expect(readJson(sourcePath).id).toBe(entry.id);
    }
  }, 180_000);

  it('keeps AP-native pilots outside legacy *_pack.json discovery', () => {
    const registry = readJson(registryPath);
    const apEntry = registry.entries.find((entry) => entry.id === 'ap-psychology-pilot');
    const biologyEntry = registry.entries.find((entry) => entry.id === 'ap-biology-foundation-pilot');

    expect(apEntry).toMatchObject({
      pipelineFamily: 'ap-native',
      loadMode: 'lazy',
      visibility: 'internal',
      portfolioCategories: ['k12-college-readiness'],
    });
    expect(apEntry.sourcePath).toBe('test_prep/ap_psychology_pilot.json');
    expect(apEntry.sourcePath).not.toMatch(/_pack\.json$/i);
    expect(biologyEntry).toMatchObject({
      pipelineFamily: 'ap-native',
      loadMode: 'lazy',
      visibility: 'internal',
      portfolioCategories: ['k12-college-readiness'],
    });
    expect(biologyEntry.sourcePath).toBe('test_prep/ap_biology_foundation_pilot.json');
    expect(biologyEntry.sourcePath).not.toMatch(/_pack\.json$/i);
  }, 180_000);

  it('generates a complete manifest whose source-backed descriptors match their packs', () => {
    const registry = readJson(registryPath);
    const manifest = readJson(manifestPath);
    const registryById = new Map(registry.entries.map((entry) => [entry.id, entry]));

    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.catalogVersion).toBe(registry.catalogVersion);
    expect(manifest.categories).toEqual(registry.categories);
    expect(manifest.entries.map((entry) => entry.id)).toEqual(registry.entries.map((entry) => entry.id));
    expect(new Set(manifest.entries.map((entry) => entry.id)).size).toBe(manifest.entries.length);

    for (const descriptor of manifest.entries) {
      const registryEntry = registryById.get(descriptor.id);
      expect(registryEntry).toBeDefined();
      expect(descriptor).toMatchObject({
        loadMode: registryEntry.loadMode,
        visibility: registryEntry.visibility,
        portfolioCategories: registryEntry.portfolioCategories,
      });
      expect(descriptor.title.trim()).not.toBe('');
      expect(descriptor.shortTitle.trim()).not.toBe('');
      expect(descriptor.version.trim()).not.toBe('');

      let companionOwner = registryEntry;
      if (registryEntry.embedded !== true) {
        const sourcePath = resolve(root, ...registryEntry.sourcePath.split('/'));
        const sourceBuffer = fs.readFileSync(sourcePath);
        const sourcePack = JSON.parse(sourceBuffer.toString('utf8'));
        companionOwner = sourcePack;
        expect(descriptor.itemCount).toBe(sourcePack.items.length);
        expect(descriptor.domainCount).toBe(sourcePack.domains.length);
        expect(descriptor.version).toBe(sourcePack.version);
        if (registryEntry.loadMode === 'lazy') {
          expect(descriptor.packUrl).toBe('./' + registryEntry.sourcePath);
          expect(descriptor.sha256).toBe(sha256(sourceBuffer));
        } else {
          expect(descriptor.packUrl).toBeUndefined();
          expect(descriptor.sha256).toBeUndefined();
        }
      }

      for (const [urlField, hashField] of companionFields) {
        const declaredUrl = String(companionOwner[urlField] || '').trim();
        expect(descriptor[urlField] || '', descriptor.id + ' ' + urlField).toBe(declaredUrl);
        if (!declaredUrl) continue;
        const repoPath = repoPathFromAssetUrl(descriptor[urlField]);
        expect(repoPath, descriptor.id + ' ' + urlField).not.toBe('');
        const companionSource = resolve(root, ...repoPath.split('/'));
        const companionDeploy = resolve(root, 'desktop/web-app/public', ...repoPath.split('/'));
        const sourceBuffer = fs.readFileSync(companionSource);
        expect(descriptor[hashField], descriptor.id + ' ' + hashField).toMatch(/^[a-f0-9]{64}$/);
        expect(descriptor[hashField]).toBe(sha256(sourceBuffer));
        expect(fs.existsSync(companionDeploy), descriptor.id + ' ' + repoPath).toBe(true);
        expect(fs.readFileSync(companionDeploy).equals(sourceBuffer)).toBe(true);
      }
    }

    const epppRegistryEntry = registry.entries.find((entry) => entry.id === 'eppp-part-one');
    const epppDescriptor = manifest.entries.find((entry) => entry.id === 'eppp-part-one');
    const epppLibraryUrl = 'https://alloflow-cdn.pages.dev/test_prep/eppp_learning_library.json';
    const epppLibraryQaUrl = 'https://alloflow-cdn.pages.dev/test_prep/eppp_learning_library_qa.json';
    const epppNativeQaUrl = 'https://alloflow-cdn.pages.dev/test_prep/eppp_native_qa.json';
    const epppPackPath = resolve(root, 'test_prep/eppp_part_one_pack.json');
    const epppPackBuffer = fs.readFileSync(epppPackPath);
    expect(epppRegistryEntry).toMatchObject({
      loadMode: 'lazy',
      visibility: 'public',
      sourcePath: 'test_prep/eppp_part_one_pack.json',
      learningLibraryUrl: epppLibraryUrl,
      learningLibraryQaUrl: epppLibraryQaUrl,
      nativeQaUrl: epppNativeQaUrl,
    });
    expect(epppRegistryEntry.embedded).toBeUndefined();
    expect(epppDescriptor).toMatchObject({
      loadMode: 'lazy',
      packUrl: './test_prep/eppp_part_one_pack.json',
      itemCount: 1500,
      domainCount: 8,
    });
    expect(epppDescriptor.sha256).toBe(sha256(epppPackBuffer));
    expect(epppDescriptor.learningLibraryUrl).toBe(epppLibraryUrl);
    expect(epppDescriptor.learningLibraryQaUrl).toBe(epppLibraryQaUrl);
    expect(epppDescriptor.nativeQaUrl).toBe(epppNativeQaUrl);
    expect(epppDescriptor.learningLibrarySha256).toBe(
      sha256(fs.readFileSync(resolve(root, 'test_prep/eppp_learning_library.json'))),
    );
    expect(epppDescriptor.learningLibraryQaSha256).toBe(
      sha256(fs.readFileSync(resolve(root, 'test_prep/eppp_learning_library_qa.json'))),
    );
    expect(epppDescriptor.nativeQaSha256).toBe(
      sha256(fs.readFileSync(resolve(root, 'test_prep/eppp_native_qa.json'))),
    );

    const apPack = readJson(resolve(root, 'test_prep/ap_psychology_pilot.json'));
    const apDescriptor = manifest.entries.find((entry) => entry.id === apPack.id);
    const libraryPath = resolve(root, 'test_prep/ap_psychology_pilot_learning_library.json');
    const libraryBuffer = fs.readFileSync(libraryPath);
    expect(apPack.learningLibraryUrl).toBe('./test_prep/ap_psychology_pilot_learning_library.json');
    expect(apDescriptor.learningLibraryUrl).toBe(apPack.learningLibraryUrl);
    expect(apDescriptor.learningLibrarySha256).toBe(sha256(libraryBuffer));

    const qaReportPath = resolve(root, 'test_prep/ap_psychology_pilot_qa.json');
    const qaReportBuffer = fs.readFileSync(qaReportPath);
    expect(apPack.nativeQaUrl).toBe('./test_prep/ap_psychology_pilot_qa.json');
    expect(apDescriptor.nativeQaUrl).toBe(apPack.nativeQaUrl);
    expect(apDescriptor.nativeQaSha256).toBe(sha256(qaReportBuffer));
  }, 120000);

  it('keeps generated manifests and every lazy pack body byte-identical in the deploy mirror', () => {
    const registry = readJson(registryPath);

    expect(fs.readFileSync(deployManifestPath).equals(fs.readFileSync(manifestPath))).toBe(true);
    for (const entry of registry.entries.filter((candidate) => candidate.loadMode === 'lazy')) {
      const sourcePath = resolve(root, ...entry.sourcePath.split('/'));
      const deployPath = resolve(root, 'desktop/web-app/public', ...entry.sourcePath.split('/'));
      expect(fs.existsSync(deployPath), entry.id).toBe(true);
      expect(fs.readFileSync(deployPath).equals(fs.readFileSync(sourcePath))).toBe(true);
    }
  }, 180_000);

  it('keeps every large lazy bank external and the mirrored runtime comfortably below the deployment limit', () => {
    const registry = readJson(registryPath);
    const moduleBuffer = fs.readFileSync(modulePath);
    const moduleText = moduleBuffer.toString('utf8');
    const deployModuleBuffer = fs.readFileSync(deployModulePath);

    expect(moduleBuffer.byteLength).toBeLessThan(10 * 1024 * 1024);
    expect(deployModuleBuffer.equals(moduleBuffer)).toBe(true);
    for (const entry of registry.entries.filter((candidate) => candidate.sourcePath)) {
      const sourcePath = resolve(root, ...entry.sourcePath.split('/'));
      if (fs.statSync(sourcePath).size > 1024 * 1024) expect(entry.loadMode, entry.id).toBe('lazy');
      if (entry.loadMode !== 'lazy') continue;
      const pack = readJson(sourcePath);
      const itemIds = [pack.items?.[0]?.id, pack.items?.at(-1)?.id].filter(Boolean);
      for (const itemId of itemIds) expect(moduleText, entry.id + ' item ' + itemId).not.toContain(JSON.stringify(itemId));
    }
    expect(moduleText).not.toContain('"ap-psychology-pilot"');
    expect(moduleText).not.toContain('"ap-psych-u1-001"');
    expect(moduleText).not.toContain('EPPP_NATIVE_ITEMS');
    expect(moduleText).not.toContain('EPPP_PART_ONE_SCAFFOLD');
    expect(moduleText).not.toContain('"eppp-v3-biological-001"');
  }, 180_000);
});
