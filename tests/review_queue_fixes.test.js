// Deferred-queue fixes from the 2-day review (2026-06-21): critic gap #1 (issue-resolution key drops
// .description/.text issues + 40-char-prefix collisions), critic gap #3 (veraPDF verdict survives a Tier-B
// re-tag → report claims an ISO verdict for un-validated bytes), ocr-fidelity-5 (AutoRestore adjacency
// raw-substring false-skip), tagging-pdfua-1 (pdf.js worker-doc leak), tagging-pdfua-2 (blank scanned page
// tagged /P instead of /Artifact — a PDF/UA §7.1 failure).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pipe = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

// ── critic #1: mirror of the issue-resolution key ──
const keyOf = (i) => { const t = ((i && (i.issue || i.description || i.text)) || '').toLowerCase().trim(); return t ? (t.substring(0, 80) + '|' + ((i && i.wcag) || '')) : ''; };

describe('critic #1: the issue-resolution key handles all text fields + avoids prefix collisions', () => {
  it('an issue whose text is in .description / .text is NOT keyed to "" (so it is not silently dropped)', () => {
    expect(keyOf({ description: 'Image missing alt text', wcag: '1.1.1' })).not.toBe('');
    expect(keyOf({ text: 'Heading skips a level', wcag: '1.3.1' })).not.toBe('');
    expect(keyOf({})).toBe('');
  });
  it('two issues sharing a 40-char boilerplate prefix but different WCAG get DIFFERENT keys', () => {
    const a = { issue: 'Heading levels should only increase by one — section 2', wcag: '1.3.1' };
    const b = { issue: 'Heading levels should only increase by one — section 9', wcag: '2.4.6' };
    expect(keyOf(a)).not.toBe(keyOf(b)); // 80-char window + wcag separates them (40-char prefix would collapse)
  });
});

// ── ocr-fidelity-5: mirror of the whole-token adjacency check ──
const normTok = (s) => String(s || '').toLowerCase().replace(/[‘’ʼ´`]/g, "'").replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, '');
const adjacentPresent = (orig, origCursor, origWord) => {
  const ow = normTok(origWord);
  const left = normTok((orig.slice(0, origCursor).match(/[\p{L}\p{N}'‘’ʼ]+$/u) || [''])[0]);
  const right = normTok((orig.slice(origCursor).match(/^[\p{L}\p{N}'‘’ʼ]+/u) || [''])[0]);
  return !!(ow && (ow === left || ow === right));
};

describe('ocr-fidelity-5: adjacency is a WHOLE-token match, not a substring', () => {
  it('a genuinely-missing short word that is a SUBSTRING of a neighbor is NOT falsely skipped', () => {
    // "art" missing before "started" — the old indexOf-window saw "art" inside "started" and skipped it.
    expect(adjacentPresent('we started here', 3, 'art')).toBe(false); // → it WILL be restored
    expect(adjacentPresent('the category list', 4, 'cat')).toBe(false);
  });
  it('a word that truly abuts the splice point IS skipped (no duplication)', () => {
    expect(adjacentPresent('we art here', 3, 'art')).toBe(true);
  });
  it('curly/straight apostrophe normalization catches the present-word case ("isn’t" vs "isn\'t")', () => {
    expect(adjacentPresent('isn’t here', 0, "isn't")).toBe(true);
  });
});

describe('anti-drift: critic #1 + ocr-fidelity-5 ship in the source', () => {
  it('_keyOf reads .issue/.description/.text + widens to 80 + folds in wcag', () => {
    expect(pipe).toMatch(/var _keyOf = function\(i\)\{ var t = \(\(i && \(i\.issue \|\| i\.description \|\| i\.text\)\)/);
    expect(pipe).toMatch(/t\.substring\(0, 80\) \+ '\|' \+ \(\(i && i\.wcag\) \|\| ''\)/);
    expect(pipe).not.toMatch(/\(s \|\| ''\)\.toLowerCase\(\)\.substring\(0, 40\)/);
  });
  it('the adjacency guard compares whole normalized tokens, not a raw substring window', () => {
    expect(pipe).toMatch(/if \(_ow && \(_ow === _leftTok \|\| _ow === _rightTok\)\)/);
    expect(pipe).not.toMatch(/_adjWin\.indexOf\(origWord\.toLowerCase\(\)\) !== -1/);
  });
});

describe('anti-drift: critic #3 — veraPDF verdict cannot survive a re-tag', () => {
  it('the Tier-B re-tag drops the stale veraPdf and re-points the bytes ref', () => {
    expect(view).toMatch(/if \(!\(_reBytes instanceof Uint8Array\)\) throw new Error\('Restored tagged export returned no byte buffer'\)/);
    expect(view).toMatch(/const _restoredArtifact = _selectTaggedArtifact\(_reBytes\);\s*\n\s*setLastTaggedValidation\(null\);\s*\n\s*setVeraPdfResult\(null\);/);
    expect(view).toMatch(/pdfUa1Checks: _re\.pdfUa1Checks \|\| null/);
    expect(view).toMatch(/veraPdf: null,[\s\S]{0,80}veraPdfAt: null,[\s\S]{0,80}veraPdfBytesHash: null/);
    expect(view).toMatch(/if \(!_taggedArtifactTicketIsCurrent\(_restoredArtifact\)\) return;/);
    expect(view).toMatch(/if \(String\(\(pdfFixResultRef\.current[\s\S]{0,180}!== String\(html \|\| ''\)\) \{/);
    expect(view).toMatch(/_viewAttachTaggedArtifactProof\(_restoredValidation, _restoredArtifact\)/);
  });
  it('the report only claims green ISO-verified when there IS a current tagged PDF (hasChecks) AND the self-check agrees (no "Mostly")', () => {
    // hardened 2026-06-23 (Canvas test): also require hasChecks, so a stale compliant veraPDF result can't
    // upgrade "Awaiting Tagged PDF" (0 self-check rules) to a green "Conformant (veraPDF verified)" claim.
    expect(pipe).toMatch(/_vera\.compliant === true && hasChecks && conformanceLabel\.indexOf\('Non-Conformant'\) === -1 && conformanceLabel\.indexOf\('Mostly'\) === -1/);
  });
});

describe('anti-drift: tagging-pdfua-1 + -2', () => {
  it('the pdf.js tagging doc is destroyed after its last use', () => {
    expect(pipe).toMatch(/if \(pdfjsDocForTagging\) \{ await pdfjsDocForTagging\.destroy\(\); pdfjsDocForTagging = null; \}/);
  });
  it('a blank scanned page wraps the image as /Artifact (not /P) and emits no StructElem', () => {
    expect(pipe).toMatch(/\} else if \(isScanned && _origContentCount > 0\) \{/);
    expect(pipe).toMatch(/newArr = \[_mkCS\('\/Artifact BMC\\n'\)\]\.concat\(_contentRefs\)\.concat\(\[_mkCS\(' EMC\\n'\)\]\);\s*\n\s*_pageArtifactOnly = true;/);
    expect(pipe).toMatch(/if \(!_pageArtifactOnly\) node\.set\(PDFName\.of\('StructParents'\)/);
    expect(pipe).toMatch(/if \(!_pageArtifactOnly\) try \{/);
  });
});
