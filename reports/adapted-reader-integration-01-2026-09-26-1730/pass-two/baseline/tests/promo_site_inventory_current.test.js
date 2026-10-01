// The promo site's stated inventory must match the repository (2026-09-20).
//
// dev-tools/audit_promo_site.cjs already checks the published pages and, among other
// things, that README.md's developer inventory names the CURRENT number of STEM plugin
// files and registered tool IDs. It exits 1 when they disagree. It was wired only to the
// manual `npm run audit:promo`, so nothing ran it in the ordinary test pass.
//
// It caught a real drift the moment it was run: recovering sixteen tool descriptions and
// picking up one unregistered tool moved the count from 149 to 150, and the README kept
// telling readers 149 in four places, each with a verification date that made the stale
// number look checked. Published counts are the kind of claim people quote in a grant
// application or a district pitch, so a wrong one is worse than a missing one.
import { describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// The audit reads ten pages plus the registry check over OneDrive-synced storage.
vi.setConfig({ testTimeout: 180000 });

const AUDIT = resolve(process.cwd(), 'dev-tools/audit_promo_site.cjs');

function runAudit() {
  try {
    return { code: 0, out: execFileSync(process.execPath, [AUDIT], { encoding: 'utf8' }) };
  } catch (error) {
    return { code: error.status ?? 1, out: String(error.stdout || '') + String(error.stderr || '') };
  }
}

describe('promo site audit', () => {
  it('passes, so the published pages and the stated inventory agree with the repo', () => {
    const { code, out } = runAudit();
    expect(out, 'audit output').toMatch(/Promotion-site audit: \d+ pages/);
    expect(code, 'run `npm run audit:promo` to see the findings:\n' + out).toBe(0);
  });
});

describe('README inventory matches the tool registry', () => {
  // Asserted directly as well as through the audit: this is the number people quote, and a
  // direct pin says which file to fix without reading the auditor's source.
  const readme = readFileSync(resolve(process.cwd(), 'README.md'), 'utf8');
  const registry = JSON.parse(readFileSync(resolve(process.cwd(), 'tool_index.json'), 'utf8'));

  it('names the registry count, and no longer names a superseded one', () => {
    const count = registry.tools.length;
    expect(count).toBeGreaterThan(100);
    const near = (n, phrase) => new RegExp(String(n) + '[^\\n]{0,40}' + phrase);
    expect(readme, 'README should state ' + count + ' registered STEM tool IDs')
      .toMatch(near(count, 'registered STEM tool IDs'));
    expect(readme, 'README should state ' + count + ' plugin files')
      .toMatch(near(count, 'plugin files'));
    expect(readme, 'a stale count is still in README')
      .not.toMatch(near(count - 1, '(?:plugin files|registered)'));
  });
});

// The same drift reached the public pages (2026-09-20). Twelve numbers across index.html,
// features.html, for-districts.html, students.html and about.html still said 149 — headline
// stats, a diagram label, and body copy. There is a purpose-built syncer that rewrites them
// from the registry and a --check mode that exits 1, and two more audits that noticed; all
// three were manual-only, so all three stayed silent in the ordinary test pass.
describe('published inventory numbers match the registry', () => {
  const run = (script, args) => {
    const file = resolve(process.cwd(), 'dev-tools/' + script);
    try {
      return { code: 0, out: execFileSync(process.execPath, [file, ...args], { encoding: 'utf8' }) };
    } catch (error) {
      return { code: error.status ?? 1, out: String(error.stdout || '') + String(error.stderr || '') };
    }
  };

  it('has no stale number on any published page', () => {
    const { code, out } = run('sync_promo_inventory_counts.cjs', ['--check']);
    expect(code, 'run `node dev-tools/sync_promo_inventory_counts.cjs` to correct them:\n' + out).toBe(0);
  });

  it('keeps the homepage static count synchronized', () => {
    const { code, out } = run('audit_promo_wave3.cjs', []);
    expect(code, out).toBe(0);
  });
});
