// The PDF audit view's diagnostics panel says what its buttons did (2026-09-13, Aaron: the
// diagnostic bundle button "doesn't seem to do anything" inside Gemini Canvas, and it was not
// clear whether Copy worked). Inside Canvas a programmatic download is silently dropped, so the
// handler must not report a download there; every button flashes its outcome and a status line
// repeats it; when neither download nor clipboard works the bundle JSON is shown for manual copy.
// The "Needs your judgment" queue shows the engines' own snippet of each flagged element.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'view_pdf_audit_source.jsx'), 'utf8');
const built = fs.readFileSync(path.join(ROOT, 'view_pdf_audit_module.js'), 'utf8');
const publicCopy = fs.readFileSync(path.join(ROOT, 'desktop/web-app/public/view_pdf_audit_module.js'), 'utf8');

function panel() {
  const start = source.indexOf('function PdfDiagnosticsLog(props) {');
  const end = source.indexOf('function PdfAuditView(props) {', start);
  expect(start).toBeGreaterThan(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('diagnostics panel feedback', () => {
  it('does not attempt (or claim) a file download inside Gemini Canvas', () => {
    const p = panel();
    expect(p).toContain("const inCanvas = typeof window !== 'undefined' && !!window._isCanvasEnv;");
    expect(p).toContain('if (!inCanvas) try {');
    // The download attempt is the only place `downloaded` becomes true, and it is inside that guard.
    const guard = p.indexOf('if (!inCanvas) try {');
    const flag = p.indexOf('downloaded = true;');
    expect(flag).toBeGreaterThan(guard);
    expect(flag - guard).toBeLessThan(700);
  });

  it('each button flashes its outcome and the status line repeats it', () => {
    const p = panel();
    for (const state of ['copyState', 'cachesState', 'bundleState', 'panelNote']) expect(p).toContain('const [' + state + ', set');
    expect(p).toContain("_flash(setCopyState, ok ? ('✓ Copied ' + rows.length) : '✗ Not copied');");
    expect(p).toContain("_flash(setBundleState, downloaded ? '✓ Downloaded' : '✓ Copied');");
    expect(p).toContain("_flash(setBundleState, '✗ Failed');");
    expect(p).toContain("_flash(setCachesState, '✓ Cleared'");
    expect(p).toContain('{copyState || (t(\'pdf_audit.diag.copy\') || \'Copy\')}');
    expect(p).toContain("{bundleBusy ? 'Building...' : (bundleState || 'Diagnostic bundle')}");
    expect(p).toContain('role="status"');
    expect(p).toContain('{panelNote}');
  });

  it('falls back to a selectable JSON box when neither download nor clipboard worked', () => {
    const p = panel();
    expect(p).toContain('setBundleFallback(bundleJson);');
    expect(p).toContain('paste it into a file named bundle.json');
    expect(p).toContain('<textarea readOnly value={bundleFallback}');
  });

  it('the judgment queue carries the engine snippets as plain text', () => {
    expect(source).toContain("where: (f && Array.isArray(f.details) ? f.details : []).map((d) => d && d.snippet ? String(d.snippet).replace(/<[^>]+>/g, ' ').replace(/\\s+/g, ' ').trim().slice(0, 120) : '').filter(Boolean).slice(0, 3)");
    expect(source).toContain("{(f.where || []).length > 0 && <span className=\"block mt-0.5 font-mono text-[10px] opacity-80\">");
  });

  it('both shipped module copies carry the change', () => {
    for (const text of [built, publicCopy]) {
      expect(text).toContain('window._isCanvasEnv');
      expect(text).toContain('setBundleFallback');
      expect(text).toContain('paste it into a file named bundle.json');
    }
    expect(built).toBe(publicCopy);
  });
});
