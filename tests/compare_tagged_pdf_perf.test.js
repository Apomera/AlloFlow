// Compare-view tagged PDF (#5, 2026-06-17): "tagging from Downloads takes seconds but Compare takes
// way longer." Root cause (traced read-only): createTaggedPdf does IDENTICAL work in both paths — the
// gap is the Compare POPUP rasterizing every page of the tagged PDF to canvas at scale 1.25 after a
// cold pdf.js bootstrap (Downloads never rasterizes), with the status removed before render so it
// looks frozen. Plus a latent hang: the bridge's `await ensurePdfBase64()` never settles if the
// file-picker fallback's unreliable 'cancel' event doesn't fire (e.g. after re-entry with no bytes).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

describe('#5 Compare tagged PDF — no hang, lighter render with live progress', () => {
  it('the bridge bounds ensurePdfBase64 so the popup spinner can never freeze forever', () => {
    const i = view.indexOf('window.__alloflowCompareGetTagged = async () => {');
    const body = view.slice(i, i + 1100);
    expect(body).toContain('Promise.race([');
    expect(body).toContain('ensurePdfBase64()');
    expect(body).toContain('setTimeout(() => r(null), 30000)');
    // and it still returns a clear error (not undefined) on timeout
    expect(body).toContain('original PDF bytes unavailable');
  });

  it('the popup renders the tagged PDF at the lighter scale 1.0, not 1.25', () => {
    // the eager full-res rasterization was the entire perceived slowness vs Downloads
    expect(view).toContain('page.getViewport({ scale: 1.0 })');
    expect(view).not.toContain('page.getViewport({ scale: 1.25 })');
  });

  it('shows live "page N / M" progress during render (so it reads as working, not stuck)', () => {
    expect(view).toContain("st.textContent = 'Rendering ' + label + '… page ' + n + ' / ' + doc.numPages");
    // the status is removed AT THE END of the render loop, not before it starts — and the loop now also
    // destroys the pdf.js doc on completion (2026-06-22 leak fix) before returning.
    expect(view).toContain('if (n > doc.numPages) { if (st) { try { st.remove(); } catch (_) {} } try { doc.destroy(); } catch (_) {} if (_cmpPdfDoc === doc) _cmpPdfDoc = null; return; }');
  });
});
