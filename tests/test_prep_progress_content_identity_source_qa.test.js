import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(process.cwd());
const source = fs.readFileSync(path.join(root, 'test_prep_hub_source.jsx'), 'utf8');

describe('Test Prep saved-session revision safety source QA', () => {
  it('retains stale sessions, explains why they cannot resume, and provides explicit discard', () => {
    expect(source).toContain('This unfinished session belongs to an earlier or unidentified content revision and cannot be resumed safely.');
    expect(source).toContain('It remains stored until you discard it or start a new session.');
    expect(source).toMatch(/Discard (?:saved )?(?:practice|session)/);
  });

  it('binds both persisted attempts and active sessions to the selected pack revision', () => {
    expect(source).toContain('packContentFingerprint');
    expect(source).toContain('packVersion');
    expect(source).toMatch(/testPrepContentIdentityStatus\(\s*savedSession\s*,/);
    expect(source).toMatch(/progressAnalytics[\s\S]{0,500}selectedPackContentIdentity|testPrepBuildProgressAnalytics\([\s\S]{0,300}selectedPackContentIdentity/);
  });

  it('surfaces retained historical attempts without mixing them into current metrics', () => {
    expect(source).toContain('retainedAttemptCount');
    expect(source).toMatch(/earlier|unidentified/i);
    expect(source).toMatch(/content revision/i);
  });
});
