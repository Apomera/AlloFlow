// Unit tests for window.AlloOnboarding.previewScrub (onboarding_helpers_module.js).
//
// previewScrub is the FERPA guardrail that detects + redacts student PII from
// free text before it could ever be sent to an LLM. A miss = student data
// leaking. The allowlist (so "Abraham Lincoln" isn't treated as a student) is
// exactly the kind of logic that breaks silently, so it's worth pinning.
// previewScrub is a thin cache over the pure scanQuestion scanner.

import { describe, it, expect, beforeAll } from 'vitest';
import { loadAlloModule } from './setup.js';

let OB;
beforeAll(() => {
  loadAlloModule('onboarding_helpers_module.js');
  OB = window.AlloOnboarding;
  if (!OB || typeof OB.previewScrub !== 'function') throw new Error('AlloOnboarding.previewScrub failed to register');
});

describe('previewScrub (FERPA PII scrub)', () => {
  it('redacts an SSN as [SSN] at high risk', () => {
    const r = OB.previewScrub('SSN 123-45-6789');
    expect(r.riskLevel).toBe('high');
    expect(r.scrubbed).toContain('[SSN]');
    expect(r.scrubbed).not.toContain('123-45-6789');
  });

  it('redacts an email as [EMAIL] at high risk', () => {
    const r = OB.previewScrub('email me at jane.doe@school.org');
    expect(r.riskLevel).toBe('high');
    expect(r.scrubbed).toContain('[EMAIL]');
    expect(r.scrubbed).not.toContain('jane.doe@school.org');
  });

  it('redacts a possessive student name at high risk (determiner is case-insensitive)', () => {
    // possessive_name matches the determiner case-insensitively, so BOTH a mid-sentence
    // "my student …" and a sentence-initial "My student …" are caught. (The [A-Z] name
    // capture stays case-sensitive, so "my student is here" is NOT a false positive.)
    for (const input of ['my student Lisa is struggling', 'My student Lisa is struggling']) {
      const r = OB.previewScrub(input);
      expect(r.riskLevel).toBe('high');
      expect(r.scrubbed).toContain('[STUDENT]');
      expect(r.scrubbed).not.toContain('Lisa');
    }
  });

  it('does not false-positive on "my student" without a capitalized name', () => {
    const r = OB.previewScrub('my student is doing fine today');
    expect(r.riskLevel).toBe('none');
    expect(r.flags).toEqual([]);
  });

  it('redacts a role+name (Ms Garcia) at high risk', () => {
    const r = OB.previewScrub('please email Ms Garcia today');
    expect(r.riskLevel).toBe('high');
    expect(r.scrubbed).toContain('[STUDENT]');
    expect(r.scrubbed).not.toContain('Garcia');
  });

  it('does NOT flag allowlisted historical figures', () => {
    const r = OB.previewScrub('How do I teach about Abraham Lincoln?');
    expect(r.riskLevel).toBe('none');
    expect(r.flags).toEqual([]);
    expect(r.scrubbed).toContain('Abraham Lincoln');
  });

  it('flags a non-allowlisted capitalized name pair at low risk', () => {
    const r = OB.previewScrub('Talk to Jordan Rivers tomorrow');
    expect(r.riskLevel).toBe('low');
    expect(r.scrubbed).toContain('[STUDENT]');
    expect(r.scrubbed).not.toContain('Jordan Rivers');
  });

  it('does not flag ordinary lesson text', () => {
    const r = OB.previewScrub('the cell membrane regulates transport');
    expect(r.riskLevel).toBe('none');
    expect(r.flags).toEqual([]);
  });

  it('handles empty / non-string input', () => {
    expect(OB.previewScrub('')).toEqual({ flags: [], scrubbed: '', riskLevel: 'none' });
    expect(OB.previewScrub(null)).toEqual({ flags: [], scrubbed: '', riskLevel: 'none' });
  });

  it('is idempotent for repeated identical input', () => {
    const a = OB.previewScrub('my student Devon needs help');
    const b = OB.previewScrub('my student Devon needs help');
    expect(b).toEqual(a);
  });
});
