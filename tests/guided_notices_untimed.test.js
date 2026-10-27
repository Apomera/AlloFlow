// WCAG 2.2.1 Timing Adjustable: Guided Mode's "Undo" and "Go back" notices stay until
// the teacher dismisses them or moves on. They used to vanish after 10 s and 12 s,
// taking the only Undo with them before a slower reader or a screen-reader user got there.
// ANTI_CANDIDATE=<path> runs the host check against a scratch copy (mutation checks).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const anti = readFileSync(process.env.ANTI_CANDIDATE || 'AlloFlowANTI.txt', 'utf8');
const banner = readFileSync('view_guided_mode_banner_source.jsx', 'utf8');

describe('Guided Mode notices have no time limit', () => {
  it('never clears the Undo or advance notice on a timer', () => {
    expect(anti).not.toMatch(/setTimeout\(\s*\(\)\s*=>\s*setGuidedNavigationUndo\(null\)/);
    expect(anti).not.toMatch(/setTimeout\(\s*\(\)\s*=>\s*setGuidedAdvanceNotice\(null\)/);
  });

  it('still clears both when the teacher exits Guided Mode', () => {
    expect(anti).toContain('setGuidedAdvanceNotice(null); setGuidedNavigationUndo(null);');
  });

  it('gives each notice a dismiss control', () => {
    expect(banner).toMatch(/clearGuidedAdvanceNotice && <button type="button" aria-label=\{t\('common\.dismiss'\) \|\| 'Dismiss'\} onClick=\{clearGuidedAdvanceNotice\}>/);
    expect(banner).toMatch(/clearGuidedNavigationUndo && <button type="button" aria-label=\{t\('common\.dismiss'\) \|\| 'Dismiss'\} onClick=\{clearGuidedNavigationUndo\}>/);
  });
});
