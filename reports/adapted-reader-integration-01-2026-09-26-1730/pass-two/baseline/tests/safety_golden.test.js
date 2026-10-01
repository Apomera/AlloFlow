// SSR crisis-content golden for the SEL "safety" tool (sel_hub/sel_tool_safety.js).
//
// WHY (clinical-high): this is the K-8 body-safety / consent / crisis tool. The most
// important invariant is that the crisis hotline content ALWAYS renders — a refactor
// must never silently drop the "If you need help RIGHT NOW" banner or the 988 /
// Crisis Text Line / Childhelp numbers. The tool just had a first-render crash (the
// aria-label fix) and has render-smoke coverage only; this pins the actual crisis
// CONTENT across grade bands + tabs. Targeted content invariants (not a brittle full
// snapshot) are the right tool here — they survive layout churn but fail loudly if
// the hotline numbers disappear.

import { describe, it, expect, beforeAll } from 'vitest';
import { loadSelTool, renderSelTool } from './helpers/sel_tool_harness.js';

beforeAll(() => { loadSelTool('sel_tool_safety.js'); });

describe('safety — crisis banner is always present on the default (Learn) view', () => {
  it('elementary: renders the crisis banner + all three hotline numbers', () => {
    const html = renderSelTool('safety', { gradeBand: 'elementary' });
    expect(html).toContain('If you need help RIGHT NOW');
    expect(html).toContain('988');                 // 988 Suicide & Crisis Lifeline
    expect(html).toContain('741741');              // Crisis Text Line (Text HOME to 741741)
    expect(html).toContain('1-800-422-4453');      // Childhelp National Child Abuse Hotline
    expect(html).toContain('You will NOT get in trouble');
  });
  it('middle: same crisis hotline content is present', () => {
    const html = renderSelTool('safety', { gradeBand: 'middle' });
    expect(html).toContain('988');
    expect(html).toContain('741741');
    expect(html).toContain('1-800-422-4453');
  });
  it("'high' grade band maps to middle (K-8 tool) and still shows crisis content", () => {
    const html = renderSelTool('safety', { gradeBand: 'high' });
    expect(html).toContain('988');
    expect(html).toContain('If you need help RIGHT NOW');
  });
});

describe('safety — Emergency tab', () => {
  it('renders 911 guidance and the crisis resources', () => {
    const html = renderSelTool('safety', { gradeBand: 'middle', toolData: { safety: { activeTab: 'emergency' } } });
    expect(html).toContain('911');
    expect(html).toContain('988');
  });
});

describe('safety — grade-band branching', () => {
  it('elementary and middle Learn content are not identical (age-appropriate copy differs)', () => {
    const el = renderSelTool('safety', { gradeBand: 'elementary' });
    const mid = renderSelTool('safety', { gradeBand: 'middle' });
    expect(el).not.toBe(mid);
    // both still carry the crisis banner regardless of band
    expect(el).toContain('988');
    expect(mid).toContain('988');
  });
});

describe('safety — renders without crashing (SSR)', () => {
  it('produces non-trivial markup on first open', () => {
    const html = renderSelTool('safety', { gradeBand: 'elementary' });
    expect(html.length).toBeGreaterThan(500);
  });
});
