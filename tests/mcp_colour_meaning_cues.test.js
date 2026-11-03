// The real colour question (2026-11-02): quote the places where the document's OWN text uses colour to carry meaning,
// and ask a person to glance at them. IBM's style_color_misuse reminder only ever points at a stylesheet.
// Module path overridable (ALLO_VERIFICATION_MODULE) for mutation checks on private copies.
import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url);
const V=require(process.env.ALLO_VERIFICATION_MODULE?resolve(process.env.ALLO_VERIFICATION_MODULE):'../desktop/mcp/remediation_verification.cjs');
const page=(body)=>'<!doctype html><html lang="en"><head><style>/* a11y-focus-visible */ a:focus-visible{outline:2px solid #ffffff}</style></head><body><main>'+body+'</main></body></html>';
it('quotes the document text that relies on colour, and a printed colour key',()=>{
 const cues=V.colourMeaningCues(page('<p>When you review the calendar, Wednesdays are shaded in blue and marked with an asterisk (*) to indicate early release.</p>'
  +'<figure><figcaption>Key to the September 2026 calendar</figcaption><dl><dt>light orange (peach) shaded row, date 7</dt><dd>7 Labor Day</dd></dl></figure>'));
 expect(cues.map((c)=>c.match)).toEqual(expect.arrayContaining(['shaded in blue','orange (peach) shaded']));
 expect(cues[0].quote).toMatch(/Wednesdays are shaded in blue/);
});
it('also catches "items in red", "(green)" keys and colour-coded wording',()=>{
 expect(V.colourMeaningCues(page('<p>Items in red are due this week.</p>')).length).toBe(1);
 expect(V.colourMeaningCues(page('<ul><li>Govern (yellow)</li></ul>')).length).toBe(1);
 expect(V.colourMeaningCues(page('<p>The schedule is colour-coded by grade.</p>')).length).toBe(1);
});
it('ignores picture and AI chart descriptions, which already put colours into words',()=>{
 const html=page('<figure><img alt="logo"><figcaption><span>Handwritten signature in blue ink above the printed name.</span></figcaption></figure>'
  +'<details class="allo-chart-data"><summary>Chart description (AI-generated)</summary><p>Every Wednesday cell is shaded blue.</p><table><tr><td>18 (red)</td></tr></table></details>');
 expect(V.colourMeaningCues(html)).toEqual([]);
});
it('ignores names and fixed phrases where a colour word means no colour, and stylesheets',()=>{
 const html=page('<p>Donate at the Red Cross drive. The Green Bay trip and Black History Month assembly are next week. Read the white paper.</p>');
 expect(V.colourMeaningCues(html)).toEqual([]);
 // These match a colour pattern ("in black", "in brown") and only the names list keeps them out.
 expect(V.colourMeaningCues(page('<p>The ruling in Brown v. Board of Education is printed in black and white on page 2.</p>'))).toEqual([]);
 expect(V.colourMeaningCues(page('<p>No colours here at all.</p>'))).toEqual([]);
});
it('keeps a reminder AlloFlow\'s own check answered and shows it as checked automatically, not as a quick check',()=>{
 const ev=V.compactVerificationEvidence({secondEngineAudit:{score:98,failViolations:0,potentialViolations:1,manualViolations:0,reviewFindingCount:1,
  potentialFindings:[{id:'text_sensory_misuse',nodes:1,description:"'above'"}],
  answeredByCheck:[{id:'style_color_misuse',nodes:1,description:'Verify color is not used as the only visual means of conveying information',answeredBy:'alloflow-own-style-check',answer:'This reminder points at AlloFlow\'s own accessibility styling (the keyboard focus outline).'}]}});
 expect(ev.equalAccess.answeredByCheck).toEqual([expect.objectContaining({id:'style_color_misuse',answeredBy:'alloflow-own-style-check'})]);
 const out=V.explainDelivery({files:{},deliveryStatus:'review-required',verdictReasons:{review:[],cautions:[]},verification:ev});
 expect(out.checkedAutomatically).toEqual(['This reminder points at AlloFlow\'s own accessibility styling (the keyboard focus outline).']);
 expect(out.quickChecks.join(' ')).not.toMatch(/colour is not the only way/);
 expect(V.explainDelivery({files:{}}).checkedAutomatically).toBeUndefined();
});
it('turns cues into one quoted quick check that names how many places, and adds nothing without cues',()=>{
 const out=V.explainDelivery({files:{},deliveryStatus:'review-required',verdictReasons:{review:[],cautions:[]},
  colourMeaningCues:[{match:'shaded in blue',quote:'Wednesdays are shaded in blue and marked with an asterisk'},{match:'(red)',quote:'18 (red) 19'}]});
 expect(out.quickChecks[0]).toBe('The document uses colour to carry meaning: "Wednesdays are shaded in blue and marked with an asterisk" (and 1 more place). Check that each colour-coded item is also marked another way (a word, symbol or pattern), so a reader who cannot see colour gets the same information.');
 expect(out.headline).toMatch(/Only quick checks are left/);
 expect(V.explainDelivery({files:{},verdictReasons:{review:[],cautions:[]}}).quickChecks).toEqual([]);
});
