import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

// Capability 5+6 (2026-07-13): veraPDF panel-open pre-warm + self-hosted temml.

const read = (name) => readFileSync(resolve(process.cwd(), name), 'utf8');
const pipe = read('doc_pipeline_source.jsx');
const view = read('view_pdf_audit_source.jsx');

describe('veraPDF panel-open pre-warm', () => {
  it('a mount-only, delayed warm overlaps the first CheerpJ boot with file picking', () => {
    expect(view).toContain('Panel-open pre-warm (2026-07-13)');
    expect(view).toContain('const _warmTimer = setTimeout(() => {');
    expect(view).toContain('return () => clearTimeout(_warmTimer);');
    // Both warms keep the same guards: opt-out + known-blocked embeds untouched.
    const guards = view.match(/pdfAutoVeraPdf && (?:_isPdfIn && )?_veraEmbedPref\(\) !== 'blocked' && !_veraIframeRef\.current\) warmVeraPdfIframe\(\)/g) || [];
    expect(guards.length).toBe(2);
  });
});

describe('self-hosted temml (school-firewall MathML)', () => {
  it('the vendored copy exists, is real code, and is the pinned version', () => {
    const st = statSync(resolve(process.cwd(), 'temml/temml.min.js'));
    expect(st.size).toBeGreaterThan(100 * 1024);
    const temml = read('temml/temml.min.js');
    expect(temml).toContain('0.10.34');
  });
  it('the loader tries alloflow-cdn FIRST, third-party mirrors as fallbacks', () => {
    const at = pipe.indexOf("const urls = ['https://alloflow-cdn.pages.dev/temml/temml.min.js'");
    expect(at).toBeGreaterThan(0);
    expect(pipe.slice(at, at + 300)).toContain('cdn.jsdelivr.net/npm/temml@0.10.34');
    expect(pipe.slice(at, at + 300)).toContain('unpkg.com/temml@0.10.34');
  });
});
