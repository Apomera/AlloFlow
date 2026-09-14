import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const allowlist = JSON.parse(readFileSync(resolve(ROOT, 'desktop/mcp/audit_allowlist.json'), 'utf8'));
const workflow = readFileSync(resolve(ROOT, '.github/workflows/mcpb-release.yml'), 'utf8');
const gate = readFileSync(resolve(ROOT, 'desktop/mcp/audit_bundle_dependencies.cjs'), 'utf8');

describe('MCPB dependency-audit gate', () => {
  it('is what the release workflow runs, at the high level, against the staged bundle', () => {
    expect(workflow).toContain('node desktop/mcp/audit_bundle_dependencies.cjs --prefix desktop/dist/mcpb/staging --level high');
    expect(workflow).not.toMatch(/npm audit --omit=dev --audit-level=high --prefix desktop\/dist\/mcpb\/staging/);
    // The gate must still fail on advisories it has not been told about, and on stale acceptances.
    expect(gate).toContain("not in the allowlist");
    expect(gate).toContain('STALE allowlist entry');
    expect(gate).toContain('allowlist entry expired');
  });

  it('accepts only advisories that carry a reason, a reviewer, and an unexpired re-review date', () => {
    expect(Array.isArray(allowlist.accepted)).toBe(true);
    expect(allowlist.accepted.length).toBeGreaterThan(0);
    const today = Date.now();
    const seen = new Set();
    for (const entry of allowlist.accepted) {
      expect(entry.ghsa).toMatch(/^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/);
      expect(seen.has(entry.ghsa), 'duplicate ' + entry.ghsa).toBe(false);
      seen.add(entry.ghsa);
      expect(entry.package.length).toBeGreaterThan(0);
      // A justification has to say something about reachability or mitigation, not just name the bug.
      expect(entry.reason.length).toBeGreaterThan(120);
      expect(entry.reviewedBy.length).toBeGreaterThan(0);
      expect(Date.parse(entry.reviewedOn)).not.toBeNaN();
      expect(Date.parse(entry.expires)).not.toBeNaN();
      expect(Date.parse(entry.expires), entry.ghsa + ' has expired; re-review it or remove it').toBeGreaterThan(today);
      // At most a year of accepted risk per review.
      expect(Date.parse(entry.expires) - Date.parse(entry.reviewedOn)).toBeLessThanOrEqual(366 * 24 * 3600 * 1000);
    }
  });

  it('documents the accepted advisories where the release notes are published', () => {
    const notes = readFileSync(resolve(ROOT, 'desktop/mcp/MCPB_RELEASE.md'), 'utf8');
    expect(notes).toContain('## Accepted dependency advisories');
    expect(notes).toContain('audit_allowlist.json');
  });
});
