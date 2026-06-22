// Quick correctness bugs from pdf_pipeline_refinement_report + document_builder_refinement_report (2026-06-22):
// DB-B2 (chunk-retry body swap corrupts docs containing $&/$1/$$), PDF-C4 (PDF/UA tile shows NaN% on a
// zero-rules doc), and the timeout/leak trio (extractPdfStructTree, detectPdfBlankFields, the typeset Noto
// font fetch had unbounded pdf.js/fetch awaits + a leaked pdf.js doc). Logic bugs get behavioral mirrors;
// the hang/leak hygiene gets anti-drift on the source (matching the _withTimeout + finally{destroy} pattern).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

describe('DB-B2: chunk-retry body swap treats document text as DATA, not a replace pattern', () => {
  // mirror of the fixed swap (function replacer)
  const swapFixed = (html, body) => html.replace(/<body[^>]*>[\s\S]*<\/body>/, () => '<body>' + body + '</body>');
  // the OLD buggy form (string replacement) — kept to prove the corruption it caused
  const swapBuggy = (html, body) => html.replace(/<body[^>]*>[\s\S]*<\/body>/, '<body>' + body + '</body>');
  const doc = '<html><body>OLD</body></html>';
  const tricky = '<p>Total: $5, ref $1, literal $$ and $& and $`</p>';

  it('preserves $-sequences verbatim (fn replacer)', () => {
    expect(swapFixed(doc, tricky)).toBe('<html><body>' + tricky + '</body></html>');
  });
  it('demonstrates the old string form WOULD have corrupted it', () => {
    expect(swapBuggy(doc, tricky)).not.toContain('$&'); // $& expanded to the whole match → corruption
  });
  it('source uses a function replacer at the body-swap site', () => {
    expect(dp).toMatch(/\.replace\(\/<body\[\^>\]\*>\[\\s\\S\]\*<\\\/body>\/, \(\) => '<body>' \+ bodyContent/);
  });
  it('the deterministic-fix handlers (title/lang/lang-span/svg-desc) also use function replacers', () => {
    // these substitute AI-generated p.title/p.lang/p.text/p.desc — same $-token corruption class
    expect(dp).toMatch(/\.replace\(\/<title>\[\^<\]\*<\\\/title>\/i, \(\) => '<title>' \+ p\.title/);
    expect(dp).toMatch(/\.replace\('<\/head>', \(\) => '<title>' \+ p\.title/);
    expect(dp).toMatch(/\(m, g1\) => '<html' \+ g1 \+ 'lang="' \+ p\.lang/); // $1 capture preserved
    expect(dp).toMatch(/\.replace\(new RegExp\(escapeForRegex\(p\.text\)\), \(\) => '<span lang="/);
    expect(dp).toMatch(/\.replace\(\/<\\\/title>\/i, \(\) => '<\/title><desc>' \+ p\.desc/);
    // no remaining string-concat replacement that interpolates p.title/p.lang/p.text/p.desc
    expect(dp).not.toMatch(/\.replace\([^,]+, '<title>' \+ p\.title/);
    expect(dp).not.toMatch(/\.replace\([^,]+, '<html\$1lang="' \+ p\.lang/);
  });
});

describe('PDF-C4: PDF/UA self-check tile never renders NaN% (zero applicable rules)', () => {
  // mirror of the fixed pct
  const pct = (hasPdfUa, pass, fail) => (hasPdfUa && (pass + fail) > 0) ? Math.round((pass / (pass + fail)) * 100) : null;
  it('0/0 → null (suppressed), not NaN', () => {
    expect(pct(true, 0, 0)).toBe(null);
    expect(Number.isNaN(pct(true, 0, 0))).toBe(false);
  });
  it('normal rules compute the percentage', () => {
    expect(pct(true, 8, 2)).toBe(80);
    expect(pct(true, 10, 0)).toBe(100);
  });
  it('source guards the divisor + the tile/warning suppress on null', () => {
    expect(dp).toMatch(/\(hasPdfUa && \(pdfua\.pass \+ pdfua\.fail\) > 0\)/);
    expect(dp).toMatch(/const pdfuaTile = \(hasPdfUa && pdfuaPct !== null\)/);
    expect(dp).toMatch(/if \(hasPdfUa && pdfuaPct !== null && pdfuaPct < 80/);
  });
});

describe('timeout + leak hygiene (PDF-C1/C2/C3, DB-B1) — matches the codebase _withTimeout + finally{destroy} pattern', () => {
  it('extractPdfStructTree: hoisted pdf + timeouts on every pdf.js await + finally destroy', () => {
    expect(dp).toMatch(/let pdf = null; \/\/ hoisted so finally can always destroy/);
    expect(dp).toMatch(/pdf = await _withTimeout\(window\.pdfjsLib\.getDocument\(\{ data: bytes \}\)\.promise, 60000, 'pdf\.js getDocument \(structTree\)'\)/);
    expect(dp).toMatch(/await _withTimeout\(pdf\.getPage\(p\), 30000, 'getPage \(structTree\)/);
    expect(dp).toMatch(/await _withTimeout\(page\.getStructTree\(\), 30000, 'getStructTree/);
    expect(dp).toMatch(/await _withTimeout\(page\.getTextContent\(\{ includeMarkedContent: true \}\), 30000, 'getTextContent \(structTree\)/);
    // the finally{destroy} appears in this function's tail (StructTree-specific message nearby)
    expect(dp).toMatch(/release the pdf\.js worker doc on every path/);
  });
  it('detectPdfBlankFields: timeouts + try/finally so destroy runs even if the loop throws', () => {
    expect(dp).toMatch(/pdoc = await _withTimeout\(window\.pdfjsLib\.getDocument\(\{ data: bytes\.slice\(\) \}\)\.promise, 60000, 'pdf\.js getDocument \(blank fields\)'\)/);
    expect(dp).toMatch(/await _withTimeout\(pdoc\.getPage\(pi\), 30000, 'getPage \(blank fields\)/);
    expect(dp).toMatch(/await _withTimeout\(page\.getTextContent\(\), 30000, 'getTextContent \(blank fields\)/);
    expect(dp).toMatch(/always release the pdf\.js doc, even if the loop throws/);
  });
  it('typeset Noto font fetch is bounded (fetch AND body read)', () => {
    expect(dp).toMatch(/await _withTimeout\(fetch\(u\), 15000, 'Noto font fetch'\)/);
    expect(dp).toMatch(/await _withTimeout\(r\.arrayBuffer\(\), 15000, 'Noto font bytes'\)/);
  });
  it('axe-core CDN fetch loop is bounded (sibling of DB-B1) — fetch AND body read', () => {
    expect(dp).toMatch(/await _withTimeout\(fetch\(u\), 15000, 'axe-core CDN fetch'\)/);
    expect(dp).toMatch(/await _withTimeout\(r\.text\(\), 15000, 'axe-core CDN body'\)/);
  });
});
