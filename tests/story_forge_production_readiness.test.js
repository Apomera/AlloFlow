import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'story_forge_source.jsx'), 'utf8');
const built = readFileSync(resolve(process.cwd(), 'story_forge_module.js'), 'utf8');
const deployed = readFileSync(resolve(process.cwd(), 'desktop/web-app/public/story_forge_module.js'), 'utf8');

describe('Story Forge production readiness', () => {
  it('marks page-composer edits dirty immediately', () => {
    expect(source).toContain('const updateComicPanelsPerPage = (value) =>');
    expect(source).toContain('setComicPageComposer(prev => sanitizeComicPageComposer({ ...prev, panelsPerPage }));');
    expect(source).toContain('const updateComicPageMeta = (pageNo, field, value) =>');
    expect(source).toContain('return sanitizeComicPageComposer({ ...clean, pages });');
    expect(source).toContain('setIsDirty(true);');
  });

  it('surfaces comic alt-text coverage in export preflight', () => {
    expect(source).toContain("const comicAltCoverageLabel = layoutMode === 'comic'");
    expect(source).toContain('grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-1 text-[10px] font-bold text-slate-600');
    expect(source).toContain('<span>Alt <strong className="text-slate-900">{comicAltCoverageLabel}</strong></span>');
    expect(deployed).toBe(built);
  });
});