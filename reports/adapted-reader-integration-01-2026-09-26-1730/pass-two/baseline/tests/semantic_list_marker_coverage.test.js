import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {assessSourceCoverage}=require('../desktop/mcp/remediation_narration_plan.cjs');
const check=(sourceText,outputHtml)=>assessSourceCoverage({sourceText,outputHtml});

describe('source coverage accounts for semantic decimal list markers',()=>{
  it('preserves source numbering when plain text becomes a default semantic ordered list',()=>{
    expect(check('1. Alpha. 2. Beta.','<ol><li>Alpha.</li><li>Beta.</li></ol>')).toMatchObject({status:'matched',missingTokens:0,sourceTokens:4,outputTokens:4});
  });
  it('credits parenthesized source markers, the UDHR and legal "(1)" convention (Hebrew pilot 2026-09-13)',()=>{
    expect(check('(1) Alpha. (2) Beta. (3) Gamma.','<ol><li>Alpha.</li><li>Beta.</li><li>Gamma.</li></ol>')).toMatchObject({status:'matched',missingTokens:0,sourceTokens:6,outputTokens:6});
    // A literal "(1)" kept inside the item is its own occurrence, not a second credit.
    expect(check('(1) Alpha. (2) Beta.','<ol><li>(1) Alpha.</li><li>(2) Beta.</li></ol>')).toMatchObject({status:'matched',outputTokens:4});
    // Numbering that does not start where the list does is still a mismatch, as in a clause list
    // that begins at (2) after an unnumbered first clause.
    expect(check('(2) Alpha. (3) Beta.','<ol><li>Alpha.</li><li>Beta.</li></ol>')).toMatchObject({status:'review_required',missingTokens:2});
    // A parenthesized number that is not followed by a marker separator is numeric prose.
    expect(check('1. Alpha. Room (12) is closed.','<ol><li>Alpha.</li></ol><p>Room is closed.</p>')).toMatchObject({status:'review_required',missingTokens:1});
  });
  it('honors start and explicit item value, continuing from the reset',()=>{
    expect(check('5. Alpha. 10. Beta. 11. Gamma.','<ol start="5"><li>Alpha.</li><li value="10">Beta.</li><li>Gamma.</li></ol>')).toMatchObject({status:'matched',missingTokens:0});
  });
  it('honors reversed default count and an explicit value reset',()=>{
    expect(check('3. Alpha. 8. Beta. 7. Gamma.','<ol reversed><li>Alpha.</li><li value="8">Beta.</li><li>Gamma.</li></ol>')).toMatchObject({status:'matched',missingTokens:0});
  });
  it('honors an explicit reversed start',()=>{
    expect(check('5. Alpha. 4. Beta.','<ol reversed start="5"><li>Alpha.</li><li>Beta.</li></ol>')).toMatchObject({status:'matched',missingTokens:0});
  });
  it('counts direct children in nested lists and resets independent lists',()=>{
    const html='<ol reversed><li>Outer A.<ol start="5"><li>Inner A.</li><li>Inner B.</li></ol></li><li>Outer B.</li></ol><ol><li>Separate.</li></ol>';
    expect(check('2. Outer A. 5. Inner A. 6. Inner B. 1. Outer B. 1. Separate.',html)).toMatchObject({status:'matched',missingTokens:0,sourceTokens:14,outputTokens:14});
  });
  it('does not count a literal matching marker twice',()=>{
    const html='<ol><li>1. Alpha.</li><li>2. Beta.</li></ol>';
    expect(check('1. Alpha. 2. Beta.',html)).toMatchObject({status:'matched',outputTokens:4});
    expect(check('1. Alpha. 2. Beta. 1.',html)).toMatchObject({status:'review_required',missingTokens:1});
  });
  it('still detects an omitted numeric fact rather than discarding digits',()=>{
    expect(check('1. Alpha. 2. Beta. Total 120.00 dollars.','<ol><li>Alpha.</li><li>Beta.</li></ol><p>Total dollars.</p>')).toMatchObject({status:'review_required',missingTokens:1});
    expect(check('1. Alpha. There is 1 unit.','<ol><li>Alpha.</li></ol><p>There is unit.</p>')).toMatchObject({status:'review_required',missingTokens:1});
  });
  it('still detects changed numbering, missing prose and hidden list content',()=>{
    expect(check('5. Alpha. 6. Beta.','<ol><li>Alpha.</li><li>Beta.</li></ol>')).toMatchObject({status:'review_required',missingTokens:2});
    expect(check('1. Alpha. 2. Beta.','<ol><li>Alpha.</li><li></li></ol>').reviewRequired).toBe(true);
    expect(check('1. Secret.','<ol hidden><li>Secret.</li></ol>')).toMatchObject({status:'review_required',missingTokens:2});
  });
  it.each(['a','A','i','I'])('does not invent decimal markers for type=%s',type=>{
    expect(check('1. Alpha.',`<ol type="${type}"><li>Alpha.</li></ol>`)).toMatchObject({status:'review_required',missingTokens:1});
  });
  it.each([
    '<ol style="list-style-type:none"><li>Alpha.</li></ol>',
    '<ol><li style="list-style:lower-alpha">Alpha.</li></ol>',
    '<style>li::marker{content:"Step "}</style><ol><li>Alpha.</li></ol>',
    '<style>ol{list-style-type:upper-roman}</style><ol><li>Alpha.</li></ol>',
    '<style>li{counter-increment:custom}</style><ol><li>Alpha.</li></ol>',
    '<div style="list-style-type:upper-alpha"><ol><li>Alpha.</li></ol></div>'
  ])('keeps unsupported/custom numbering conservative: %s',html=>{
    expect(check('1. Alpha.',html)).toMatchObject({status:'review_required',missingTokens:1});
  });
  it('never spends a synthetic ordinal on numeric prose without a source list marker',()=>{
    expect(check('There is 1 unit.','<ol><li>There is unit.</li></ol>')).toMatchObject({status:'review_required',missingTokens:1});
    expect(check('There is 1. Unit remains.','<ol><li>There is Unit remains.</li></ol>')).toMatchObject({status:'review_required',missingTokens:1});
  });
  it.each([
    '<style>li{display:block}</style><ol><li>Alpha.</li></ol>',
    '<style>@media print{ol > li{display:none}}</style><ol><li>Alpha.</li></ol>',
    '<link rel="stylesheet" href="unknown.css"><ol><li>Alpha.</li></ol>',
    '<style>@import "unknown.css";</style><ol><li>Alpha.</li></ol>'
  ])('does not credit unavailable or stylesheet-suppressed markers: %s',html=>{
    expect(check('1. Alpha.',html)).toMatchObject({status:'review_required',missingTokens:1});
  });
  it('keeps unrelated stylesheet display rules from disabling proven list markers',()=>{
    expect(check('1. Alpha.','<style>.toolbar{display:none}</style><ol><li>Alpha.</li></ol>')).toMatchObject({status:'matched',missingTokens:0});
  });
  it.each(['hidden','aria-hidden="true"','style="display:none"','style="visibility:hidden"'])('does not invent new ordinals after excluding a value-bearing item: %s',attribute=>{
    expect(check('1. Alpha. 2. Beta.',`<ol><li>Alpha.</li><li value="10" ${attribute}>Excluded.</li><li>Beta.</li></ol>`)).toMatchObject({status:'review_required',missingTokens:2});
  });
  it('keeps reversed numbering conservative when a direct item was excluded',()=>{
    expect(check('2. Alpha. 1. Beta.','<ol reversed><li>Alpha.</li><li aria-hidden="true">Excluded.</li><li>Beta.</li></ol>')).toMatchObject({status:'review_required',missingTokens:2});
  });
  it('recognizes flattened source marker contexts while retaining numeric facts within each item',()=>{
    expect(check('Steps 1. Alpha costs 120.00 dollars. 2. Beta costs 8 dollars.','<p>Steps</p><ol><li>Alpha costs 120.00 dollars.</li><li>Beta costs 8 dollars.</li></ol>')).toMatchObject({status:'matched',missingTokens:0});
    expect(check('Steps 1. Alpha costs 120.00 dollars.','<p>Steps</p><ol><li>Alpha costs dollars.</li></ol>').reviewRequired).toBe(true);
  });
  it('saturates native marker counters at signed integer limits',()=>{
    expect(check('2147483647. Alpha. 2147483647. Beta.','<ol start="2147483647"><li>Alpha.</li><li>Beta.</li></ol>')).toMatchObject({status:'matched',missingTokens:0});
    expect(check('-2147483648. Alpha. -2147483648. Beta.','<ol reversed start="-2147483648"><li>Alpha.</li><li>Beta.</li></ol>')).toMatchObject({status:'matched',missingTokens:0});
  });
  it('does not reuse one source occurrence across duplicate list prose or match ordinal suffixes',()=>{
    expect(check('1. Alpha. There is 1 unit.','<ol><li>Alpha.</li></ol><ol><li>Alpha.</li></ol><p>There is unit.</p>')).toMatchObject({status:'review_required',missingTokens:1});
    expect(check('12. Alpha.','<ol start="2"><li>Alpha.</li></ol>')).toMatchObject({status:'review_required',missingTokens:1});
  });
  it('excludes descendant nested lists from the parent prose anchor',()=>{
    expect(check('1. Outer. 1. Inner.','<ol><li><div>Outer.<ol><li>Inner.</li></ol></div></li></ol>')).toMatchObject({status:'matched',missingTokens:0});
  });
  it.each([
    '<style>ol{display:none}</style><ol><li>Alpha.</li></ol>',
    '<style>main{display:none}</style><main><ol><li>Alpha.</li></ol></main>',
    '<style>main{visibility:hidden}</style><main><ol><li>Alpha.</li></ol></main>',
    '<style>ol{visibility:collapse}</style><ol><li>Alpha.</li></ol>'
  ])('withholds synthetic marker credit from stylesheet-hidden list subtrees: %s',html=>{
    expect(check('1. Alpha.',html)).toMatchObject({status:'review_required',missingTokens:1});
  });
  it('permits ordinary ancestor display:block without changing list numbering',()=>{
    expect(check('1. Alpha.','<style>main{display:block}</style><main><ol><li>Alpha.</li></ol></main>')).toMatchObject({status:'matched',missingTokens:0});
  });
  it.each([
    '<ol style="visibility:collapse"><li>Alpha.</li></ol>',
    '<ol><li style="visibility:collapse">Alpha.</li></ol>'
  ])('withholds synthetic marker credit from inline collapsed items and ancestors: %s',html=>{
    expect(check('1. Alpha.',html)).toMatchObject({status:'review_required',missingTokens:1});
  });
  it('leaves numeric prose unchanged for unordered lists',()=>{
    expect(check('1. Alpha.','<ul><li>Alpha.</li></ul>')).toMatchObject({status:'review_required',missingTokens:1});
    expect(check('120.00 dollars.','<ul><li>120.00 dollars.</li></ul>')).toMatchObject({status:'matched',missingTokens:0});
  });
});
