// B1 (audit batch, 2026-06-28): the auto-continue abort flag (pdfAutoContinueAbortRef.current) is set to
// true by the Stop button but was NEVER reset to false anywhere in the view. So after a user pressed Stop,
// a fresh "Make Accessible" click saw _stopped()===true and SKIPPED both auto-continue loops — one pass,
// then a silent stop, losing the auto-continue-to-target promise. The handler now clears the flag at entry.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

describe('B1: Make-Accessible clears the auto-continue abort flag at the start of each run', () => {
  it('the reset ships and runs BEFORE the _stopped()-gated loops', () => {
    expect(view).toContain('pdfAutoContinueAbortRef.current = false;');
    const resetIdx = view.indexOf('pdfAutoContinueAbortRef.current = false;');
    const stoppedIdx = view.indexOf('const _stopped = () =>');
    expect(resetIdx).toBeGreaterThan(-1);
    expect(stoppedIdx).toBeGreaterThan(-1);
    expect(resetIdx).toBeLessThan(stoppedIdx); // cleared before _stopped() is even defined/used in the handler
  });
});
