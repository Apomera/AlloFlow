// In-app pipeline diagnostics log (2026-06-18). User ask: inside Gemini Canvas the browser console
// is unreachable, so the pipeline's warnLog/debugLog diagnostics (visible via F12 on the Firebase
// build) can't be seen — and the Firebase build costs money to exercise. Mirror every log line into a
// capped window ring buffer and surface a floating, copyable panel in the PDF audit view so a teacher
// can read + share a remediation run's log from inside Canvas, for free. UI/host wiring can't be
// unit-executed here, so we pin the load-bearing structure by source.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const host = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

describe('host capture — warnLog/debugLog mirror into a capped ring buffer on window', () => {
  it('defines a bounded buffer + push helper on window.__alloDiagLog', () => {
    expect(host).toContain('window.__alloDiagLog = window.__alloDiagLog || []');
    expect(host).toContain('const __alloPushLog = (level, args) =>');
    expect(host).toContain('if (__alloDiagLog.length > __ALLO_LOG_MAX)'); // capped (no unbounded growth)
  });
  it('BOTH warnLog and debugLog feed the buffer (so the in-app log is as rich as the console)', () => {
    expect(host).toContain("const warnLog = (...args) => { __alloPushLog('warn', args); console.warn(...args); };");
    expect(host).toContain("const debugLog = (...args) => { __alloPushLog('debug', args); if (DEBUG_LOG) console.log(...args); };");
  });
  it('serializes Errors and objects (not "[object Object]") so stack traces survive', () => {
    expect(host).toContain('a instanceof Error');
    expect(host).toContain('JSON.stringify(a)');
  });
});

describe('view panel — floating, copyable, live, self-contained', () => {
  it('defines PdfDiagnosticsLog and renders it inside the audit modal', () => {
    expect(view).toContain('function PdfDiagnosticsLog(props) {');
    expect(view).toContain('<PdfDiagnosticsLog t={t} addToast={addToast} />');
  });
  it('reads the host buffer and supports warnings-only filtering', () => {
    expect(view).toContain('Array.isArray(window.__alloDiagLog)');
    expect(view).toContain("rows = warnOnly ? all.filter((e) => e && e.level === 'warn') : all");
  });
  it('repaints live while open and copies the log to the clipboard (execCommand fallback)', () => {
    expect(view).toContain('setInterval(() => setTick((n) => n + 1), 1000)');
    expect(view).toContain('navigator.clipboard.writeText(text)');
    expect(view).toContain("document.execCommand('copy')");
  });
  it('uses window.React hooks so it works at module scope regardless of the build bind', () => {
    expect(view).toContain('const R = (typeof window !== \'undefined\' && window.React) ? window.React : null;');
    expect(view).toContain('R.useState');
    expect(view).toContain('R.useEffect');
  });
});
