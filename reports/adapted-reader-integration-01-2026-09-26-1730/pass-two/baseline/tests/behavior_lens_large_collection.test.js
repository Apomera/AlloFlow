import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const workspaceSource = readFileSync(resolve(process.cwd(), 'behavior_lens_workspace_module.js'), 'utf8');
const appSource = readFileSync(resolve(process.cwd(), 'behavior_lens_module.js'), 'utf8');

beforeAll(() => {
  // eslint-disable-next-line no-new-func
  new Function(workspaceSource)();
});

describe('Behavior Lens large ABC collection pagination', () => {
  it('clamps invalid pages and never returns more than the safe page maximum', () => {
    const runtime = window.AlloModules.BehaviorLensWorkspace;
    const entries = Array.from({ length: 250 }, (_, index) => ({ id: index + 1 }));

    expect(runtime.paginateCollection(entries, 99, 1000)).toMatchObject({
      totalItems: 250,
      pageIndex: 2,
      pageNumber: 3,
      pageSize: 100,
      pageCount: 3,
      startIndex: 201,
      endIndex: 250,
      hasPrevious: true,
      hasNext: false
    });
    expect(runtime.paginateCollection(entries, -2, 0)).toMatchObject({
      pageIndex: 0,
      pageSize: 50,
      startIndex: 1,
      endIndex: 50,
      hasPrevious: false,
      hasNext: true
    });
  });

  it('returns stable empty and middle-page metadata without mutating the collection', () => {
    const runtime = window.AlloModules.BehaviorLensWorkspace;
    const entries = Array.from({ length: 123 }, (_, index) => ({ id: index + 1 }));
    const before = entries.slice();

    const middle = runtime.paginateCollection(entries, 1, 50);
    const empty = runtime.paginateCollection([], 8, 25);

    expect(middle.items.map((entry) => entry.id)).toEqual(Array.from({ length: 50 }, (_, index) => index + 51));
    expect(middle).toMatchObject({ pageNumber: 2, pageCount: 3, startIndex: 51, endIndex: 100 });
    expect(empty).toMatchObject({
      items: [], totalItems: 0, pageIndex: 0, pageNumber: 1,
      pageCount: 1, startIndex: 0, endIndex: 0,
      hasPrevious: false, hasNext: false
    });
    expect(entries).toEqual(before);
  });

  it('renders only the current page while retaining full filtered totals and page-scoped selection', () => {
    const panel = appSource.slice(
      appSource.indexOf('const ABCDataPanel ='),
      appSource.indexOf('const LiveObsOverlay =')
    );

    expect(panel).toContain('const visibleEntries = page.items;');
    expect(panel).toContain('visibleEntries.map((entry, idx) =>');
    expect(panel).not.toContain('sorted.map((entry, idx) =>');
    expect(panel).toContain("'Showing ' + page.startIndex + '–' + page.endIndex + ' of ' + page.totalItems + ' matching entries'");
    expect(panel).toContain("'aria-label': 'ABC entry pages'");
    expect(panel).toContain("'aria-label': 'Select all entries on this page'");
    expect(panel).toContain("'aria-label': 'ABC rows per page'");
    expect(panel).toContain("'aria-label': 'Previous ABC entries page'");
    expect(panel).toContain("'aria-label': 'Next ABC entries page'");
    expect(panel).toContain('const hasPhases = useMemo(() => entries.some(e => e.phase), [entries]);');
    expect(panel.split('entries.some(e => e.phase)').length - 1).toBe(1);
  });


  it('bounds behavior suggestions and exposes keyboard-operable sorting semantics', () => {
    const panel = appSource.slice(
      appSource.indexOf('const ABCDataPanel ='),
      appSource.indexOf('const LiveObsOverlay =')
    );

    expect(panel).toContain('const behaviorSuggestions = useMemo(() => {');
    expect(panel).toContain('if (suggestions.length >= 50) break;');
    expect(panel).toContain("'aria-label': 'Filter ABC entries by behavior'");
    expect(panel).toContain("String(e.behavior || '').toLowerCase().includes(behaviorQuery)");
    expect(panel).not.toContain('uniqueBehaviors.map');
    expect(panel).not.toContain("setFilterBehavior('all')");
    expect(panel).toContain("'aria-sort': activeSort ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'");
    expect(panel).toContain("'aria-label': 'Sort ABC entries by ' + columnLabel");
    expect(panel).toContain("h('caption', { className: 'sr-only' }, 'ABC entries, page '");
  });

  it('keeps canonical and deployment modules byte-identical', () => {
    expect(appSource).toBe(readFileSync(resolve(process.cwd(), 'desktop/web-app/public/behavior_lens_module.js'), 'utf8'));
    expect(workspaceSource).toBe(readFileSync(resolve(process.cwd(), 'desktop/web-app/public/behavior_lens_workspace_module.js'), 'utf8'));
  });
});
