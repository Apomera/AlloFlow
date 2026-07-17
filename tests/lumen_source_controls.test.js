import { describe, it, expect, vi } from 'vitest';
import * as EvidenceMod from '../stem_lab/stem_lumen_evidence.js';

const E = EvidenceMod.default || EvidenceMod;

function twoSourceProject() {
  let project = E.makeProject({ id: 'controls', title: 'Source controls', now: '2026-07-16T20:00:00Z' });
  project = E.upsertSource(project, {
    id: 'src_science', title: 'Science reader', labels: ['Science', 'Primary source'],
    content: 'Chlorophyll absorbs red and blue light during photosynthesis. This science passage contains distinctive evidence about plant energy conversion and chloroplasts.',
    now: '2026-07-16T20:00:00Z'
  });
  project = E.upsertSource(project, {
    id: 'src_policy', title: 'Policy memo', labels: ['Policy'],
    content: 'The district policy requires a public review meeting before the board changes the instructional calendar. This policy passage contains distinctive governance evidence.',
    now: '2026-07-16T20:00:00Z'
  });
  return project;
}

describe('Lumen source-control schema and migration', () => {
  it('migrates existing projects with every source active and normalized labels', () => {
    const legacy = twoSourceProject();
    legacy.schemaVersion = 1;
    delete legacy.sources[0].active;
    legacy.sources[0].labels = [' Science ', 'science', '', 'Primary source'];
    legacy.retrievalLabel = 'missing label';
    const migrated = E.migrateProject(legacy);
    expect(migrated.schemaVersion).toBe(3);
    expect(migrated.sources[0]).toMatchObject({ active: true, labels: ['Science', 'Primary source'] });
    expect(migrated.retrievalLabel).toBe('');
  });

  it('sanitizes, de-duplicates and caps labels', () => {
    const labels = E.normalizeSourceLabels([
      ' Research ', 'research', 'Primary source', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'
    ]);
    expect(labels).toEqual(['Research', 'Primary source', 'A', 'B', 'C', 'D', 'E', 'F']);
    expect(labels).toHaveLength(E.MAX_SOURCE_LABELS);
  });

  it('persists active state, labels and retrieval scope through the project store', async () => {
    const memory = new Map();
    const storageDB = {
      get: vi.fn(async key => memory.get(key) || null),
      set: vi.fn(async (key, value) => { memory.set(key, value); return true; })
    };
    const store = E.createProjectStore({ storageDB, scope: 'teacher-source-controls' });
    let project = twoSourceProject();
    project = E.setSourceActive(project, 'src_policy', false, '2026-07-16T20:01:00Z');
    project = E.setSourceLabels(project, 'src_science', 'Science, Core reading', '2026-07-16T20:02:00Z');
    project = E.setRetrievalLabel(project, 'Core reading', '2026-07-16T20:03:00Z');
    await store.save(project);
    const restored = await store.load();
    expect(restored.sources.find(source => source.id === 'src_policy').active).toBe(false);
    expect(restored.sources.find(source => source.id === 'src_science').labels).toEqual(['Science', 'Core reading']);
    expect(restored.retrievalLabel).toBe('Core reading');
  });
});

describe('Lumen retrieval scope enforcement', () => {
  it('excludes inactive sources from retrieval and defensively removes them from prompts', () => {
    let project = twoSourceProject();
    const inactiveNode = project.evidenceNodes.find(node => node.sourceId === 'src_policy');
    const activeNode = project.evidenceNodes.find(node => node.sourceId === 'src_science');
    project = E.setSourceActive(project, 'src_policy', false, '2026-07-16T20:05:00Z');

    expect(E.retrieve(project, 'district policy public review')).toEqual([]);
    expect(E.retrieve(project, 'chlorophyll light')[0].node.sourceId).toBe('src_science');

    const prompt = E.buildGroundedPrompt(project, 'Compare the sources', [{ node: inactiveNode }, { node: activeNode }]);
    expect(prompt).toContain('Chlorophyll absorbs');
    expect(prompt).not.toContain('district policy requires');
    expect(prompt).not.toContain(inactiveNode.id);
  });

  it('applies the selected label to eligible sources and retrieval', () => {
    let project = twoSourceProject();
    project = E.setRetrievalLabel(project, 'Policy', '2026-07-16T20:06:00Z');
    expect(E.eligibleSourceIds(project)).toEqual(['src_policy']);
    expect(E.retrieve(project, 'district policy review')[0].node.sourceId).toBe('src_policy');
    expect(E.retrieve(project, 'chlorophyll photosynthesis')).toEqual([]);
  });

  it('clears a label scope when its final source loses that label', () => {
    let project = E.setRetrievalLabel(twoSourceProject(), 'Policy', '2026-07-16T20:07:00Z');
    project = E.setSourceLabels(project, 'src_policy', ['Governance'], '2026-07-16T20:08:00Z');
    expect(project.retrievalLabel).toBe('');
    expect(E.eligibleSourceIds(project)).toEqual(['src_science', 'src_policy']);
  });

  it('does not stale saved work when a source is merely excluded', () => {
    let project = twoSourceProject();
    const node = project.evidenceNodes.find(candidate => candidate.sourceId === 'src_science');
    project.claims.push({ id: 'claim', evidenceIds: [node.id], stale: false });
    project.artifacts.push({ id: 'note', sourceIds: ['src_science'], claimIds: ['claim'], stale: false });
    project = E.setSourceActive(project, 'src_science', false, '2026-07-16T20:09:00Z');
    expect(project.claims[0].stale).toBe(false);
    expect(project.artifacts[0].stale).toBe(false);
    expect(project.audit.at(-1)).toMatchObject({ action: 'source-deactivated', sourceId: 'src_science' });
  });

  it('preserves source controls when refreshed content creates a new source version', () => {
    let project = twoSourceProject();
    project = E.setSourceActive(project, 'src_science', false, '2026-07-16T20:10:00Z');
    project = E.setSourceLabels(project, 'src_science', ['Science', 'Core'], '2026-07-16T20:11:00Z');
    project = E.upsertSource(project, {
      id: 'src_science', title: 'Science reader',
      content: 'Updated chlorophyll evidence explains how pigments capture light energy and begin photosynthesis in chloroplasts.',
      now: '2026-07-16T20:12:00Z'
    });
    expect(project.sources.find(source => source.id === 'src_science')).toMatchObject({
      active: false, labels: ['Science', 'Core'], version: 2
    });
  });
});
