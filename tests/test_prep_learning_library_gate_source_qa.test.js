import fs from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync(resolve(process.cwd(), 'test_prep_hub_source.jsx'), 'utf8');

describe('Test Prep learning-library load gate source QA', () => {
  it('gates network work behind an open Learning library tab and retains successful same-identity data', () => {
    expect(source).toContain("if (!isOpen || tab !== 'library' || !selectedPack) return undefined;");
    expect(source).toContain("learningLibraryState.status === 'ready' && learningLibraryState.payload) return undefined;");
    expect(source).toContain("if (packManifestStatus === 'idle' || packManifestStatus === 'loading') return undefined;");
    expect(source).toContain("setLearningLibraryState({ identity: requestIdentity, status: 'ready', payload: catalog });");
    expect(source).toContain("setLearningLibraryRetry((value) => value + 1)");
    expect(source).toContain('Retry learning library');
    expect(source).toContain('const availableSkills = testPrepPackSkillCatalog(selectedPack, learningLibrary);');
    expect(source).toContain('function testPrepItemSkillIds(value)');
    expect(source).toContain('testPrepItemSkillIds(item).includes(normalizedSkillId)');
    expect(source).toContain("['study-routes', 'Study routes']");
    expect(source).toContain('function startStudyRoute(route)');
    expect(source).toContain("libraryMode === 'study-routes'");
    expect(source).toContain('const topicDrills = sectionRoute');
    expect(source).toContain('Open topic drills');
    expect(source).toContain("['quick-reference', 'Quick reference']");
    expect(source).toContain("libraryMode === 'quick-reference'");
    expect(source).toContain('AP Statistics quick reference');
    expect(source).toContain('Read reference aloud');
  });

  it('binds visible content and validation to pack, version, visibility, URL, and manifest digest identity', () => {
    expect(source).toContain('function testPrepLearningLibraryIdentity(pack, value)');
    expect(source).toContain('entry ? String(entry.learningLibrarySha256 || \'\') : \'\'');
    expect(source).toContain('const learningLibrary = learningLibraryStateMatches ? learningLibraryState.payload : null;');
    expect(source).toContain('expectedSha256: expectedDigest');
    expect(source).toContain("String(catalog.version || '') === String(selectedPack.version)");
    expect(source).toContain("String(catalog.visibility || '') === String(selectedPack.visibility)");
  });

  it('returns a blank search result before normalizing or traversing the selected pack', () => {
    const searchStart = source.indexOf('function testPrepSearchPack(');
    const searchEnd = source.indexOf('function normalizeTestPrepFlashcardSchedule(', searchStart);
    const searchSource = source.slice(searchStart, searchEnd);
    expect(searchSource.indexOf("if (!normalizedQuery) return { query: '', total: 0, counts: {}, results: [], limit };"))
      .toBeLessThan(searchSource.indexOf('const normalizedPack = normalizeTestPrepPack(pack);'));
  });

  it('keeps cancellation, timeout, identity mismatch, and explicit retry safeguards in the gated path', () => {
    expect(source).toContain('const controller = typeof AbortController');
    expect(source).toContain('timeoutMs: assetFetchTimeoutMs');
    expect(source).toContain('if (controller) controller.abort();');
    expect(source).toContain('testPrepNormalizeRepoAssetUrl(libraryUrl) !== libraryEntry.learningLibraryUrl');
    expect(source).toContain("status: 'unavailable', payload: null");
    expect(source).toMatch(/learningLibraryRetry,\s+assetFetchTimeoutMs,/);
  });
});
