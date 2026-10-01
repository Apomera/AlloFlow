import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'story_forge_source.jsx'), 'utf8');
const built = readFileSync(resolve(process.cwd(), 'story_forge_module.js'), 'utf8');
const deployed = readFileSync(resolve(process.cwd(), 'desktop/web-app/public/story_forge_module.js'), 'utf8');

describe('Story Forge Cast & Continuity export handoff', () => {
  it('renders sanitized reference cards in both comic handoff exports', () => {
    expect(source).toContain('const renderContinuityReferencesHtml =');
    expect(source).toContain('renderContinuityReferencesHtml(continuity.references)');
    expect(source).toContain('Reference art for ${escapeHtml(identity)}');
  });

  it('includes a stable package manifest for handoff inspection', () => {
    expect(source).toContain('const manifest = {');
    expect(source).toContain("format: 'storyforge-project'");
    expect(source).toContain('continuityReferenceCount: continuity.references.length');
    expect(source).toContain('comicStats: snapshot.layoutMode === \'comic\' ? projectReadiness.comicStats : null');
    expect(source).toContain('blockerCount: projectReadiness.blockers.length');
    expect(source).toContain('includeBleed: Boolean(printSafety.includeBleed)');
  });

  it('keeps generated artifacts synchronized after the export enhancement', () => {
    expect(deployed).toBe(built);
    expect(built).toContain('renderContinuityReferencesHtml');
  });
});