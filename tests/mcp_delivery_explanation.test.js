// 2026-10-25: staff read the connector's report, not its code. Every withhold/review code a
// tagged PDF can end with must come with a plain meaning and a next step (deliveryExplanation),
// a run that simply did not ask for veraPDF must not be called "validator unavailable", and
// veraPDF runs by default (without it a tagged PDF can never leave review).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(__dirname, '..');
const Verification = require(path.join(ROOT, 'desktop/mcp/remediation_verification.cjs'));
const SERVER = fs.readFileSync(path.join(ROOT, 'desktop/mcp/alloflow-remediation-mcp-stdio.cjs'), 'utf8');
const DRIVER = fs.readFileSync(path.join(ROOT, 'desktop/mcp/remediation_headless_driver.cjs'), 'utf8');
const GENERIC = 'The tagged PDF was not delivered.';

const withPdf = (extra) => Object.assign({
  files: { taggedPdf: 'x-tagged.pdf' },
  verdict: { level: 'caution', reviewCount: 0, cautionCount: 1 },
  verificationState: 'complete-for-tested-scope',
  taggedPdfDelivery: { ok: true, code: 'verified' },
}, extra);

describe('deliveryExplanation', () => {
  it('names a run that did not request veraPDF as not-requested, not unavailable', () => {
    const s = withPdf();
    Verification.applyPdfDeliveryEvidence(s, Verification.pdfUaEvidence(null, { hasPdf: true, requested: false }));
    expect(s.taggedPdfDelivery.code).toBe('validator-not-requested');
    expect(Verification.explainDelivery(s).items[0].meaning).toMatch(/turned off/);
  });

  it('turns a missing-Java validator error into an install step and keeps the cause', () => {
    const s = withPdf();
    Verification.applyPdfDeliveryEvidence(s, Verification.pdfUaEvidence({ error: 'Java runtime not found' }, { hasPdf: true, requested: true }));
    const item = Verification.explainDelivery(s).items[0];
    expect(item.code).toBe('validator-error');
    expect(item.nextStep).toMatch(/Java 11/);
    expect(item.detail).toBe('Java runtime not found');
  });

  it('gives Java advice only when the validator error is about Java', () => {
    const run = (error) => {
      const s = withPdf();
      Verification.applyPdfDeliveryEvidence(s, Verification.pdfUaEvidence({ error }, { hasPdf: true, requested: true }));
      return Verification.explainDelivery(s).items[0];
    };
    expect(run('desktop_runtime_build_changed_since_server_start').nextStep).toMatch(/Restart/);
    expect(run('desktop_runtime_build_changed_since_server_start').nextStep).not.toMatch(/Java/);
    expect(run('veraPDF exited with code 3').nextStep).not.toMatch(/Java/);
    expect(run('Java runtime not found').nextStep).toMatch(/Java 11/);
  });

  it('explains every withhold code the driver can throw', () => {
    const codes = [...DRIVER.matchAll(/throw (?:new )?Error\('([a-z_]+)'\)/g)].map((m) => m[1])
      .filter((c) => /_(required|unavailable|review)/.test(c));
    expect(codes.length).toBeGreaterThanOrEqual(5);
    for (const code of new Set(codes)) {
      const out = Verification.explainDelivery({ files: {}, taggedPdfError: code, deliveryStatus: 'review-required' });
      expect(out.items[0].meaning, code).not.toBe(GENERIC);
    }
    const unverified = Verification.explainDelivery({ files: {}, taggedPdfError: 'tagged_pdf_delivery_unverified (roundtrip-failed: x)', taggedPdfDelivery: { ok: false, code: 'roundtrip-failed' } });
    expect(unverified.items).toHaveLength(1);
    expect(unverified.items[0].meaning).not.toBe(GENERIC);
  });

  it('explains every non-verified delivery code the server accepts, and the schema enum matches', () => {
    const set = SERVER.match(/const TAGGED_PDF_DELIVERY_CODES = new Set\(\[([\s\S]*?)\]\)/)[1];
    const codes = [...set.matchAll(/'([a-z-]+)'/g)].map((m) => m[1]).filter((c) => c !== 'verified');
    expect(codes).toContain('validator-not-requested');
    for (const code of codes) {
      const out = Verification.explainDelivery({ files: { taggedPdf: 'x.pdf' }, taggedPdfDelivery: { ok: false, code } });
      expect(out.items[0].meaning, code).not.toBe(GENERIC);
      expect(SERVER.includes(`'${code}'`), code + ' in output schema').toBe(true);
    }
    const schemaEnum = SERVER.match(/enum: \['verified', 'typeset-content-dropped'[^\]]*\]/)[0];
    for (const code of codes) expect(schemaEnum.includes(`'${code}'`), code + ' in schema enum').toBe(true);
  });

  it('does not invent a problem when checks passed', () => {
    const out = Verification.explainDelivery({ files: { taggedPdf: 'x.pdf' }, deliveryStatus: 'complete-for-tested-scope', taggedPdfDelivery: { ok: true, code: 'verified' } });
    expect(out.items).toEqual([]);
    expect(out.headline).toMatch(/passed/);
  });

  it('says WHICH things need a person, from the verdict', () => {
    const out = Verification.explainDelivery({ files: {}, deliveryStatus: 'review-required',
      verdictReasons: { review: ['Equal Access asks a person to confirm a heading'], cautions: ['The AI audit covered 3 of 4 sections'] } });
    expect(out.needsAPerson).toEqual(['Equal Access asks a person to confirm a heading']);
    expect(out.worthAGlance).toEqual(['The AI audit covered 3 of 4 sections']);
    expect(Verification.explainDelivery({ files: {} }).needsAPerson).toEqual([]);
    const jargon = Verification.explainDelivery({ files: {}, verdictReasons: { review: ['WCAG verification is review-required; review the engine coverage and unresolved evidence before distribution'], cautions: [] } });
    expect(jargon.needsAPerson[0]).toMatch(/a person needs to look at/);
    expect(jargon.needsAPerson[0]).not.toMatch(/engine coverage/);
    // The checker items are named, replacing the generic pointer.
    const named = Verification.explainDelivery({ files: {}, verdictReasons: { review: ['WCAG verification is review-required; review the engine coverage and unresolved evidence before distribution'], cautions: [] },
      verification: { equalAccess: { reviewFindings: [{ id: 'text_sensory_misuse', description: "Confirm the word(s) 'above' is used to indicate a logical rather than visual position" }] } } });
    // (2026-10-26) The common reminders read in plain words with the quoted text kept; a multi-element
    // finding says how many places; any other rule keeps the checker's sentence behind the prefix.
    expect(named.needsAPerson).toEqual(['Check that "above" still makes sense without seeing the page (it should point to a place in reading order).']);
    const plain = Verification.explainDelivery({ files: {}, verdictReasons: { review: [], cautions: [] },
      verification: { equalAccess: { reviewFindings: [
        { id: 'text_block_heading', nodes: 3, description: "Confirm this text 'Course Syllabus' is used as a heading and if so, modify to use a heading element or role" },
        { id: 'text_quoted_correctly', nodes: 1, description: 'If the following text is a quotation, mark it as a quotation' }] } } });
    expect(plain.needsAPerson).toEqual([
      'Check whether "Course Syllabus" is a heading; if it is, it should be marked as one. (3 places)',
      'A checker asks a person to confirm: If the following text is a quotation, mark it as a quotation']);
    // An item the AI review judged not-an-issue becomes a quick check with the AI's reasoning (Aaron, 2026-10-25).
    const quick = Verification.explainDelivery({ files: {}, deliveryStatus: 'review-required',
      verdictReasons: { review: ['WCAG verification is review-required; review the engine coverage and unresolved evidence before distribution'], cautions: [] },
      verification: { equalAccess: { reviewFindings: [{ id: 'style_color_misuse', description: 'Verify color is not used as the only visual means of conveying information' }] } },
      reviewTriage: { dispositions: [{ key: 'equalAccess|potential|style_color_misuse', action: 'not-an-issue', reason: 'This style block only draws a focus ring.' }] } });
    expect(quick.needsAPerson).toEqual([]);
    expect(quick.quickChecks).toEqual(['Check that colour is not the only way information is shown. (AI review: This style block only draws a focus ring.)']);
    // A one-sentence AI reason up to 400 characters is shown whole (syllabus_sie's 237-character reason was cut).
    const longReason = 'The flagged style block only defines focus indicators, which use a 2px outline plus a 4px box-shadow (and CanvasText in forced colours), and links in the body are underlined by default, so no information is conveyed by colour alone.';
    const whole = Verification.explainDelivery({ files: {}, verification: { equalAccess: { reviewFindings: [{ id: 'style_color_misuse', nodes: 1, description: 'Verify color' }] } },
      reviewTriage: { dispositions: [{ key: 'equalAccess|potential|style_color_misuse', action: 'not-an-issue', reason: longReason }] } });
    expect(whole.quickChecks[0].endsWith('(AI review: ' + longReason + ')')).toBe(true);
    expect(quick.headline).toMatch(/Only quick checks are left/);
    // The real cause in a delivery_unverified wrapper is explained, not the wrapper (Hebrew UDHR run).
    const ocr = Verification.explainDelivery({ files: {}, taggedPdfError: 'tagged_pdf_delivery_unverified (ocr-text-layer-incomplete: 2781 OCR character(s) could not be embedded; OCR character coverage was 62%)' });
    expect(ocr.items[0].meaning).toMatch(/hidden text layer/);
    expect(ocr.items[0].nextStep).toMatch(/Running again will not change this/);
    expect(ocr.items[0].meaning).toMatch(/Urdu/); // not "for example Hebrew" on an Urdu scan
    expect(ocr.headline).not.toMatch(/check it against/); // the item says "share the HTML"; one instruction
    // AlloFlow's own byte validator inside the wrapper is not veraPDF, and its failed rule is shown (English UDHR).
    const fonts = Verification.explainDelivery({ files: {}, taggedPdfError: 'tagged_pdf_delivery_unverified (validator-failed: All page fonts embedded)' }).items[0];
    expect(fonts.meaning).not.toMatch(/veraPDF/);
    expect(fonts.meaning).toMatch(/fonts that are not stored inside the file/);
    expect(fonts.detail).toBe('All page fonts embedded');
    const own = Verification.explainDelivery({ files: {}, taggedPdfError: 'tagged_pdf_delivery_unverified (validator-failed: Structure tree present)' }).items[0];
    expect(own.meaning).toMatch(/AlloFlow's own PDF check/);
    expect(own.meaning).not.toMatch(/fonts/);
    expect(own.detail).toBe('Structure tree present');
    const orphan = Verification.explainDelivery({ files: {}, taggedPdfError: 'tagged_pdf_delivery_unverified (validator-failed: No orphaned semantic leaves)' }).items[0];
    expect(orphan.meaning).toMatch(/could not be matched to the text on the PDF's pages/);
    expect(orphan.meaning).not.toMatch(/orphan|semantic|leaves/i);
    expect(orphan.nextStep).toMatch(/Running again gives the same result/);
    // The veraPDF path (delivery code, no wrapper) keeps the veraPDF wording.
    expect(Verification.explainDelivery({ files: { taggedPdf: 'x.pdf' }, taggedPdfDelivery: { ok: false, code: 'validator-failed' } }).items[0].meaning).toMatch(/veraPDF/);
    // A reason over 400 characters is cut at a word boundary.
    const overLongReason = 'This style block only draws a focus ring as a white outline plus a black shadow around the focused control and moves the skip link into view on focus, which conveys focus by outline and position change rather than by colour alone, so keyboard users always see where they are on the page, and in forced-colours mode the same ring is drawn in the system highlight colour so it stays visible to people who rely on that setting';
    expect(overLongReason.length).toBeGreaterThan(400);
    const clipped = Verification.explainDelivery({ files: {}, verification: { equalAccess: { reviewFindings: [{ id: 'style_color_misuse', description: 'Verify color' }] } },
      reviewTriage: { dispositions: [{ key: 'equalAccess|potential|style_color_misuse', action: 'not-an-issue', reason: overLongReason }] } }).quickChecks[0];
    expect(clipped).toMatch(/…\)$/);
    const lastWord = clipped.replace(/…\)$/, '').split(/\s+/).pop();
    expect(overLongReason.split(/\s+/)).toContain(lastWord); // a whole word, never a fragment
    // Fillable-form scripts: no advice to strip the form's own formatting.
    const form = Verification.explainDelivery({ files: {}, taggedPdfError: 'active_content_requires_review' });
    expect(form.items[0].nextStep).not.toMatch(/^Remove/);
    expect(SERVER).toContain('verdictReasons: safeVerdictReasons(out.verdict),');
  });

  it('is written onto every report', () => {
    expect(SERVER).toMatch(/applyPdfDeliveryEvidence\(summary, pdfEvidence\);\s*summary\.deliveryExplanation = Verification\.explainDelivery\(summary\);/);
  });
});

describe('connector defaults', () => {
  it('runs veraPDF by default', () => {
    expect(SERVER).toMatch(/validateUa: args\.validate_ua === undefined \? true : args\.validate_ua,/);
  });

  it('never re-ingests its own tagged outputs from a folder', () => {
    const re = new RegExp(SERVER.match(/!\/(-tagged[^/]*\\\.pdf\$)\/i\.test\(e\.name\)/)[1], 'i');
    for (const own of ['a-tagged.pdf', 'a-tagged-review-required.pdf', 'a-tagged-2.pdf', 'a-tagged-review-required-3.pdf']) expect(re.test(own), own).toBe(true);
    for (const input of ['tagged.pdf', 'report-tagged-final.pdf', 'handbook.pdf']) expect(re.test(input), input).toBe(false);
  });
});
