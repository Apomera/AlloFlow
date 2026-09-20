// The per-tool landing pages must match the registry they are generated from (2026-09-20).
//
// dev-tools/build_tool_pages.cjs writes one static page per STEM tool on the Pages host, and
// it already had a --check mode that exits 1 when a published page or the sitemap block has
// drifted from tool_index.json. Nothing ran it. So a tool could be renamed, or its
// description rewritten, and the 125 published pages would keep serving the old text to
// search engines and to anyone who followed the link, with nothing in the repo objecting.
//
// This runs that gate, and then proves the gate is capable of failing: a green from a check
// that cannot go red teaches people to trust nothing.
import { describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// The generator reads a 149-entry registry and 125 pages from OneDrive-synced storage.
vi.setConfig({ testTimeout: 180000 });

const GATE = resolve(process.cwd(), 'dev-tools/build_tool_pages.cjs');

function runCheck() {
  try {
    return { code: 0, out: execFileSync(process.execPath, [GATE, '--check'], { encoding: 'utf8' }) };
  } catch (error) {
    return { code: error.status ?? 1, out: String(error.stdout || '') + String(error.stderr || '') };
  }
}

describe('published tool pages match the registry', () => {
  it('reports no stale page or sitemap block', () => {
    const { code, out } = runCheck();
    expect(out, 'gate output').toMatch(/eligible, \d+ published/);
    expect(code, 'run `node dev-tools/build_tool_pages.cjs` to regenerate:\n' + out).toBe(0);
  });

  it('fails when a published page drifts from the registry', () => {
    const page = resolve(process.cwd(), 'tool-water-cycle.html');
    const original = readFileSync(page, 'utf8');
    expect(original).toContain('Water Cycle');
    try {
      writeFileSync(page, original.replace('Water Cycle', 'Water Cycle (drifted)'), 'utf8');
      const { code, out } = runCheck();
      expect(code, 'the gate must reject a drifted page').toBe(1);
      expect(out).toContain('tool-water-cycle.html');
    } finally {
      writeFileSync(page, original, 'utf8');
    }
    // and the tree is left exactly as found
    expect(readFileSync(page, 'utf8')).toBe(original);
  });
});

describe('every manual-backed tool page offers its manual', () => {
  const catalog = JSON.parse(readFileSync(resolve(process.cwd(), 'docs/manuals/catalog.json'), 'utf8'));
  const manuals = catalog.items.filter((i) => i.format === 'STEM tool teacher manual');

  it('links the manual from the tool page and the tool page back from the manual', () => {
    expect(manuals.length).toBeGreaterThanOrEqual(5);
    for (const item of manuals) {
      const slug = item.href.replace(/^manual-/, '').replace(/\.html$/, '');
      const toolPage = resolve(process.cwd(), 'tool-' + slug + '.html');
      const page = readFileSync(toolPage, 'utf8');
      expect(page, slug + ' tool page offers the manual').toContain(item.href);
      expect(page, slug + ' tool page says a manual exists').toContain('Teacher manual');
      const manual = readFileSync(resolve(process.cwd(), item.href), 'utf8');
      expect(manual, item.id + ' manual links back to its tool page').toContain('tool-' + slug + '.html');
    }
  });
});

// Orphaned landing pages (2026-09-20). build_promo_tool_directory.cjs decides whether to
// print an "About" link by asking whether tool-<slug>.html exists AT GENERATION TIME, and
// build_tool_pages.cjs decides what to publish from the registry. Run them in the wrong
// order after adding a tool and you get a published, sitemapped, indexable page that the
// directory never links to: exactly what happened to the butterfly page, which existed and
// was in the sitemap while tools.html pointed only at the app. Neither generator's own
// --check can see it, because each is internally consistent.
describe('every published tool page is reachable from the directory', () => {
  it('links each tool-*.html from tools.html', () => {
    const dir = readFileSync(resolve(process.cwd(), 'tools.html'), 'utf8');
    const pages = readdirSync(process.cwd()).filter((f) => /^tool-[a-z0-9-]+\.html$/.test(f));
    expect(pages.length).toBeGreaterThan(100);
    const orphans = pages.filter((f) => !dir.includes('"' + f + '"'));
    expect(orphans, 'run `node dev-tools/build_promo_tool_directory.cjs` after generating pages').toEqual([]);
  });

  it('does not advertise a page that was never published', () => {
    const dir = readFileSync(resolve(process.cwd(), 'tools.html'), 'utf8');
    const linked = [...dir.matchAll(/href="(tool-[a-z0-9-]+\.html)"/g)].map((m) => m[1]);
    const missing = [...new Set(linked)].filter((f) => !existsSync(resolve(process.cwd(), f)));
    expect(missing, 'tools.html links a landing page that does not exist').toEqual([]);
  });
});
