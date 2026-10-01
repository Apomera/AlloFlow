// The fatal-crash boundary must let a user SAVE the error, and must not destroy evidence to
// do it.
//
// Why this test exists: non-fatal errors were exportable through the in-app diagnostics panel,
// but a fatal crash replaced the whole app - including that panel - with a screen whose only
// button cleared localStorage and deleted every IndexedDB database. The one crash a bug report
// most needs was the one crash you could not report, and pressing the only available button
// destroyed both the user's work and the state that caused it.
//
// These assertions are about affordances and ordering, not styling. If someone rewrites the
// screen, it must still be true that the log is reachable and that wiping data is a deliberate,
// confirmed, secondary choice.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ANTI = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');

// Isolate the class so a match elsewhere in a 44k-line file cannot make a test pass by accident.
const boundary = (() => {
  const start = ANTI.indexOf('class AlloFlowErrorBoundary');
  expect(start, 'AlloFlowErrorBoundary not found in AlloFlowANTI.txt').toBeGreaterThan(-1);
  const next = ANTI.indexOf('\n// ── KokoroOfferModal', start);
  return ANTI.slice(start, next > -1 ? next : start + 20000);
})();

describe('fatal error boundary', () => {
  it('offers a way to save the error log', () => {
    expect(boundary).toMatch(/downloadReport/);
    expect(boundary).toMatch(/Download error log/i);
    expect(boundary).toMatch(/new Blob\(/);
    expect(boundary).toMatch(/\.download\s*=/);
  });

  it('puts the diagnostics ring buffer in the report, not just the error', () => {
    // __alloDiagLog holds the warnLog/debugLog lines from BEFORE the crash, which is usually
    // where the actual cause is. An error message alone rarely identifies the bug.
    expect(boundary).toMatch(/__alloDiagLog/);
  });

  it('captures the component stack, which only componentDidCatch receives', () => {
    expect(boundary).toMatch(/componentStack/);
    expect(boundary).toMatch(/componentDidCatch\s*\(\s*error\s*,\s*errorInfo\s*\)/);
  });

  it('shows the error message on screen without requiring a download', () => {
    // Someone reading it to support over the phone should not have to open a file first.
    expect(boundary).toMatch(/state\.error\s*&&\s*this\.state\.error\.message|error\.message\)\s*\|\|/);
  });

  it('offers a plain reload that does NOT clear data', () => {
    const reloadBtn = boundary.match(/Reload the app/);
    expect(reloadBtn, 'no non-destructive reload option').toBeTruthy();
  });

  // The regression that motivated all of this.
  it('does not clear storage as the primary action, and confirms before doing it at all', () => {
    const clearIdx = boundary.indexOf('localStorage.clear()');
    const downloadIdx = boundary.indexOf('Download error log');
    expect(clearIdx, 'clear-data path missing entirely').toBeGreaterThan(-1);
    expect(downloadIdx, 'download must come before the destructive option').toBeLessThan(clearIdx);
    expect(boundary).toMatch(/window\.confirm\(/);
    // And it must live behind a disclosure rather than sitting as a bare button.
    expect(boundary).toMatch(/<?details|createElement\("details"/);
  });

  it('preserves the crash record across a data wipe', () => {
    // The record is the reason the user is on this screen; clearing it with everything else
    // would throw away the one thing worth keeping.
    expect(boundary).toMatch(/alloflow_last_crash/);
    const wipe = boundary.slice(boundary.indexOf('localStorage.clear()') - 400, boundary.indexOf('localStorage.clear()') + 400);
    expect(wipe).toMatch(/keep/);
  });

  it('persists the crash before any button is pressed', () => {
    // If the tab dies or the user force-quits, the report must still exist on next boot.
    const cdc = boundary.slice(boundary.indexOf('componentDidCatch'), boundary.indexOf('buildReport'));
    expect(cdc).toMatch(/localStorage\.setItem\(\s*'alloflow_last_crash'/);
  });

  it('has a clipboard fallback, because Canvas runs sandboxed and can block downloads', () => {
    expect(boundary).toMatch(/clipboard\.writeText/);
  });

  it('never calls t() — translation is not available when the app has died', () => {
    // A free t() here is the crash-inside-the-crash-handler failure. Hardcoded English is
    // correct in this one place.
    expect(boundary).not.toMatch(/[^.\w]t\(["']/);
  });

  it('is announced to screen readers', () => {
    expect(boundary).toMatch(/role:\s*"alert"/);
  });
});
