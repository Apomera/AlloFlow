// Reliability quick-wins (2026-06-20) — from the pipeline-enhancement workflow.
// (1) Zombie-run guard: the 8-min dead-man watchdog cleared the UI but never invalidated the
//     stalled run, so a late-resolving promise could stomp the teacher's NEXT document. A run
//     captures a generation token at start; the watchdog bumps it; the completion write is dropped
//     if the token no longer matches.
// (2) pdf.js doc leak: ~per-doc getDocument() handles were never .destroy()'d → accumulated over a
//     batch (mid-batch crash). The high-traffic extraction fns now free the doc in a finally.
// (3) Scanned-branch page count: adopt the real det.pageCount instead of a base64-size estimate so
//     OCR chunking doesn't silently drop trailing pages.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pipeSrc = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const hostSrc = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');

// ── Mirror of the completion-write generation guard ──
const shouldWriteResult = (myGen, currentGen) => currentGen === myGen;

describe('zombie-run guard — a stalled run cannot stomp a newer one', () => {
  it('a normal run (no watchdog) writes its result', () => {
    expect(shouldWriteResult(5, 5)).toBe(true);
  });
  it('after the watchdog bumps the generation, the stalled run is discarded', () => {
    const myGen = 5; // captured at start
    const afterWatchdog = 6; // fire() bumped it
    expect(shouldWriteResult(myGen, afterWatchdog)).toBe(false);
  });
  it('the NEW run writes, the OLD zombie still does not', () => {
    const current = 6; // new run bumped to 6 and captured 6
    expect(shouldWriteResult(6, current)).toBe(true);  // new run
    expect(shouldWriteResult(5, current)).toBe(false); // old zombie
  });
});

describe('anti-drift: zombie-run guard wired end-to-end', () => {
  it('the pipeline captures a generation at run start', () => {
    expect(pipeSrc).toMatch(/_myRunGen = \(window\.__alloPdfRunGen = \(window\.__alloPdfRunGen \|\| 0\) \+ 1\)/);
  });
  it('the completion write checks the generation and discards a stale result', () => {
    expect(pipeSrc).toMatch(/window\.__alloPdfRunGen !== _myRunGen/);
  });
  it('the watchdog fire() bumps the generation + aborts the auto-continue controller', () => {
    expect(hostSrc).toMatch(/window\.__alloPdfRunGen = \(window\.__alloPdfRunGen \|\| 0\) \+ 1/);
    expect(hostSrc).toMatch(/Dead-man switch fired[\s\S]{0,400}pdfAutoContinueAbortCtrlRef\.current\.abort\(\)/);
  });
});

describe('anti-drift: pdf.js docs are freed on the high-traffic extraction paths', () => {
  it('declares let pdf = null on at least the 3 fixed extraction fns', () => {
    expect((pipeSrc.match(/let pdf = null;/g) || []).length).toBeGreaterThanOrEqual(3);
  });
  it('frees the doc in a finally (destroy on success AND error)', () => {
    expect((pipeSrc.match(/finally \{ if \(pdf\) \{ try \{ pdf\.destroy\(\); \} catch \(_\) \{\} \} \}/g) || []).length).toBeGreaterThanOrEqual(3);
  });
});

describe('anti-drift: scanned branch adopts the real page count', () => {
  it('uses det.pageCount for effectivePageCount on the scanned path', () => {
    expect(pipeSrc).toMatch(/if \(det\.pageCount > 0\) effectivePageCount = det\.pageCount;/);
  });
});
