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
    expect(viewSrc).toContain('const _safeHtml = String(pdfFixResult.accessibleHtml');
    expect(viewSrc).toContain(".replace(/<script[\\s\\S]*?<\\/script>/gi, '')");
    expect(viewSrc).toContain(".replace(/[\\s/]on[a-z]+\\s*=\\s*(?:\"[^\"]*\"|'[^']*'|[^\\s>]+)/gi, '')");
    expect(viewSrc).toContain(".replace(/(?:javascript|vbscript)\\s*:/gi, '')");
    // and the SANITIZED copy is what gets base64-encoded for the frame
    expect(viewSrc).toContain('btoa(unescape(encodeURIComponent(_safeHtml)))');
  });
});
