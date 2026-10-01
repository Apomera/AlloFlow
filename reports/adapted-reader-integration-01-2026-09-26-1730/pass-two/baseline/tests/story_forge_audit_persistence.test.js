import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'story_forge_source.jsx'), 'utf8');
const normalizedSource = source.replace(/\r\n/g, '\n');
const built = readFileSync(resolve(process.cwd(), 'story_forge_module.js'), 'utf8');
const deployed = readFileSync(resolve(process.cwd(), 'desktop/web-app/public/story_forge_module.js'), 'utf8');

describe('Story Forge Comic Flow audit persistence', () => {
  it('bounds report fields before they enter a saved project', () => {
    expect(source).toContain('const sanitizeComicFlowReport = (value) =>');
    expect(source).toContain("if (!value || typeof value !== 'object' || Array.isArray(value)) return null;");
    expect(source).toContain('panelNotes: cleanNotes(source.panelNotes, 8)');
    expect(source).toContain('globalSuggestions: cleanTextList(source.globalSuggestions, 6, 240)');
    expect(source).toContain('metrics.printFormat = cleanString(rawMetrics.printFormat, 80);');
  });

  it('carries audits through browser saves, vault snapshots, restores, and imports', () => {
    expect(normalizedSource).toContain("comicFlowReport: layoutMode === 'comic' ? sanitizeComicFlowReport(comicFlowReport) : null,");
    expect(normalizedSource).toContain("comicFlowReport: draft.artifactType === 'comic' ? sanitizeComicFlowReport(source.comicFlowReport) : null,");
    expect(normalizedSource).toContain('    audioSegments,\n    comicFlowReport,\n  });');
    expect(normalizedSource).toContain('setComicFlowReport(project.comicFlowReport || null);');
    expect(normalizedSource).toContain('comicFlowReport: validated.comicFlowReport,');
    expect(normalizedSource).toContain('const importedComicFlowReport = isStoryForgeRecord(value.comicFlowReport)');
    expect(normalizedSource).toContain('isStoryForgeRecord(snapshot.comicFlowReport)');
    expect(normalizedSource).toContain('isStoryForgeRecord(importedReview.comicFlowReport)');
  });

  it('summarizes audit status in portable handoff metadata and keeps artifacts paired', () => {
    expect(source).toContain("comicFlowScore: snapshot.layoutMode === 'comic' ? (snapshot.comicFlowReport?.score ?? null) : null,");
    expect(source).toContain("comicFlowNoteCount: snapshot.layoutMode === 'comic'");
    expect(deployed).toBe(built);
    expect(built).toContain('sanitizeComicFlowReport');
  });
});
