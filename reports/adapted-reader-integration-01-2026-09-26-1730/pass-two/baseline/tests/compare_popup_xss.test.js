// Compare popup XSS hardening (audit #3, 2026-06-15). The two-pane Compare popup wrote raw
// pdfFixResult.accessibleHtml (model output, can carry <script>/onerror) into the "after-frame"
// iframe via doc.write — but that frame had NO sandbox and was same-origin (holds the session +
// deploy Gemini key). Every other doc.write path writes internally-escaped report HTML; this one
// writes raw AI output. Fix = sandbox the frame (allow-same-origin, NO allow-scripts → parent's
// bionic/dark/zoom still work via contentDocument, injected scripts can't run) + strip active
// content at the source (defense-in-depth). Anti-drift so neither layer silently regresses.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const viewSrc = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

describe('Compare popup — after-frame is hardened against AI-injected scripts', () => {
  it('the after-frame iframe is sandboxed (allow-same-origin, not allow-scripts)', () => {
    expect(viewSrc).toContain('<iframe id="after-frame" sandbox="allow-same-origin">');
    // allow-scripts would re-open the hole — must NOT be present on this frame
    expect(viewSrc).not.toMatch(/id="after-frame"[^>]*allow-scripts/);
  });

  it('accessibleHtml is stripped of active content before it is written into the frame', () => {
    // The hand-rolled regex chain was replaced by the shared sanitiser, and the
    // regexes should NOT come back: stripping active content by regex is
    // routinely bypassable (nested <scr<script>ipt>, malformed attribute
    // quoting, entity-encoded javascript&#58;), so pinning those three replaces
    // was pinning the weaker mechanism.
    //
    // What matters is unchanged and is asserted directly: the html written into
    // the frame is the SANITISED copy, sanitisation goes through the pipeline's
    // sanitizeRemediationHtml, and the path FAILS CLOSED — if the security
    // module has not loaded, or it returns something non-string/empty, the
    // helper throws, the popup is closed and the user is told, rather than the
    // frame being written with unsanitised markup.
    expect(viewSrc).toContain('_safeCompareAfterHtml = _viewSanitizeMarkupForExport(pdfFixResult.accessibleHtml, _docPipeline);');
    expect(viewSrc).toContain('btoa(unescape(encodeURIComponent(_safeCompareAfterHtml)))');
    expect(viewSrc).toMatch(/function _viewSanitizeMarkupForExport\(html, pipeline\) \{[\s\S]{0,400}if \(typeof helper !== 'function'\) throw new Error\(/);
    expect(viewSrc).toMatch(/if \(typeof clean !== 'string' \|\| !clean\.trim\(\)\) throw new Error\('The markup could not be sanitized safely\.'\);/);
    // the catch must close the window, not fall through to writing the frame
    expect(viewSrc).toMatch(/catch \(error\) \{\s*\n\s*_clearComparePopupCallbacks\(_comparePopupOwnerRef\.current\);\s*\n\s*try \{ if \(!win\.closed\) win\.close\(\); \} catch \(_\) \{\}[\s\S]{0,300}return;/);
  });
});
