// Delivery-explanation fixes from the 2026-11-02 keyless corpus re-run (19 documents). Module path overridable
// (ALLO_VERIFICATION_MODULE) so a mutated private copy can be checked against these tests.
import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url);
const V=require(process.env.ALLO_VERIFICATION_MODULE?resolve(process.env.ALLO_VERIFICATION_MODULE):'../desktop/mcp/remediation_verification.cjs');
const ea=(findings)=>({equalAccess:{reviewFindings:findings}});
it('does not count the coverage hold twice in the headline, and drops the bare duplicate line',()=>{
 const out=V.explainDelivery({files:{},deliveryStatus:'review-required',taggedPdfError:'content_coverage_requires_review',
  contentCoverage:{missingWords:[{word:'approvalof',count:2}]},verdictReasons:{review:['Source content coverage requires review'],cautions:[]}});
 expect(out.headline).toBe('No tagged PDF was made for this file. The reason and what to do instead are below.');
 expect(out.needsAPerson).toEqual([]);
 const two=V.explainDelivery({files:{},deliveryStatus:'review-required',taggedPdfError:'content_coverage_requires_review',
  verdictReasons:{review:['the output text runs in a noticeably different order from the source','Source content coverage requires review'],cautions:[]}});
 expect(two.headline).toMatch(/Separately, 1 finding needs a person/);
 expect(two.needsAPerson).toEqual(['the output text runs in a noticeably different order from the source']);
 // activity4h: fidelity + numbers + coverage merge into one coverage line, which is the same finding as the hold.
 const merged=V.explainDelivery({files:{},deliveryStatus:'review-required',taggedPdfError:'content_coverage_requires_review',
  contentCoverage:{missingWords:[{word:'eeo',count:1}]},verdictReasons:{review:['the output text runs in a noticeably different order from the source',
   'content fidelity needs a human check (possible loss or changed values)','numbers may have changed between source and output — verify scores, dates, and percentages','Source content coverage requires review'],cautions:[]}});
 expect(merged.needsAPerson).toHaveLength(2);
 expect(merged.needsAPerson[1]).toMatch(/^Some words or numbers from the original are not in the accessible version/);
 expect(merged.headline).toMatch(/Separately, 1 finding needs a person/);
 // Another withhold reason keeps the coverage line as its own finding.
 const other=V.explainDelivery({files:{},deliveryStatus:'review-required',taggedPdfError:'page_range_tagged_pdf_unsupported',
  verdictReasons:{review:['Source content coverage requires review'],cautions:[]}});
 expect(other.headline).toMatch(/Separately, 1 finding needs a person/);
});
it('says a PDF was made when it shipped as review-required',()=>{
 const out=V.explainDelivery({files:{taggedPdf:'C:/x/doc-tagged-review-required.pdf'},deliveryStatus:'review-required',taggedPdfDelivery:{ok:false,code:'validator-failed'}});
 expect(out.headline).toMatch(/^A tagged PDF was made but did not pass every check/);
 expect(V.explainDelivery({files:{},deliveryStatus:'review-required',taggedPdfDelivery:{ok:false,code:'validator-failed'}}).headline).toMatch(/^No tagged PDF was made/);
});
it('a ready verdict still says when no tagged PDF was made',()=>{
 const out=V.explainDelivery({files:{},deliveryStatus:'complete-for-tested-scope',taggedPdfDelivery:{ok:false,code:'roundtrip-failed'}});
 expect(out.headline).toMatch(/but no tagged PDF was made/);
 expect(V.explainDelivery({files:{},deliveryStatus:'complete-for-tested-scope'}).headline).toBe('Automated checks passed for everything they can test. A person should still read it once before sharing.');
});
it('quotes a doubled checker label once and names the other places as "more"',()=>{
 const out=V.explainDelivery({files:{},verdictReasons:{review:[],cautions:[]},verification:ea([{id:'text_block_heading',nodes:2,
  description:"Confirm this text 'November 7, 2023 November 7, 2023' is used as a heading"}])});
 expect(out.needsAPerson[0]).toBe('Check whether "November 7, 2023" is a heading; if it is, it should be marked as one. (and 1 more place)');
 // A genuinely different phrase is not collapsed.
 const kept=V.explainDelivery({files:{},verdictReasons:{review:[],cautions:[]},verification:ea([{id:'text_block_heading',nodes:1,description:"Confirm this text 'Part A Part B' is used as a heading"}])});
 expect(kept.needsAPerson[0]).toMatch(/"Part A Part B"/);
});
it('blockquote reminders read in plain words, not the checker sentence with a tag in it',()=>{
 const out=V.explainDelivery({files:{},verdictReasons:{review:[],cautions:[]},verification:ea([{id:'blockquote_cite_exists',nodes:5,
  description:"Verify that <blockquote> should have a 'cite' attribute and not be used for indentation only"}])});
 expect(out.needsAPerson[0]).toBe('Check that these indented passages are really quoted from somewhere; text that is only indented for layout should not be marked as a quotation. (5 places)');
 expect(out.needsAPerson[0]).not.toMatch(/<blockquote>/);
});
it('marks a long missing word as cut instead of printing a fragment nobody can find',()=>{
 const word='drilldrinkingstrawnutcrackerpaddlesspearhookcardinalduckwoodpecker';
 const out=V.explainDelivery({files:{},taggedPdfError:'content_coverage_requires_review',contentCoverage:{missingWords:[{word,count:1}]}});
 expect(out.items[0].detail).toContain('"'+word.slice(0,60)+'…"');
});
it('symbol drops in a scan text layer are not blamed on other scripts only, and held findings do not loop on "run again"',()=>{
 const ocr=V.explainDelivery({files:{},taggedPdfError:'tagged_pdf_delivery_unverified (ocr-text-layer-incomplete: 2 OCR character(s) could not be embedded)'});
 expect(ocr.items[0].meaning).toMatch(/some symbols/);
 const held=V.explainDelivery({files:{},taggedPdfError:'distribution_review_required'});
 expect(held.items[0].nextStep).not.toMatch(/then run again/);
 expect(held.items[0].nextStep).toMatch(/running again gives the same result/);
});
