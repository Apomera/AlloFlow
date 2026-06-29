// Cross-cutting audit fixes (2026-06-28): resilience + memory leaks in the PDF-audit view.
//  B2: a malformed .alloflow.json (a multiSession range missing its `pages` array) crashed the project
//      load ("Cannot read property of undefined") and stranded the teacher — now guarded + degrades with a toast.
//  C1: the Compare render-fail fallback link created a blob URL (the whole PDF) that was never revoked,
//      leaking one per failed render until page close — now revoked shortly after a click + a backstop timeout.
//  C2: single-item SR-announcement playback revoked the TTS blob only on 'ended'/'error'; an autoplay-blocked
//      play() rejection fired neither, leaking the URL + listeners — now revoked on the rejection + a timeout.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

describe('B2: multiSession range load guards a malformed pages array', () => {
  it('the sort + lastEnd access no longer dereference range.pages unguarded', () => {
    expect(view).toContain('((a.pages && a.pages[0]) || 0) - ((b.pages && b.pages[0]) || 0)');
    expect(view).toContain('Array.isArray(_lastRange.pages)');
    expect(view).not.toContain('const lastEnd = sortedR[sortedR.length - 1].pages[1];'); // the unguarded access is gone
  });
});

describe('C1 + C2: blob URLs are revoked (no leak)', () => {
  it('C1: the Compare render-fail fallback link revokes its blob URL (click + backstop timeout)', () => {
    expect(view).toContain('var _revokeFailUrl = function () { try { URL.revokeObjectURL(u); } catch (_) {} };');
    expect(view).toContain('setTimeout(_revokeFailUrl, 300000);');
  });
  it('C2: single-item SR playback revokes on a play() rejection + a timeout backstop', () => {
    expect(view).toContain('audio.play().catch(() => { revoke(); });');
    expect(view).toContain('setTimeout(revoke, 120000);');
  });
});
