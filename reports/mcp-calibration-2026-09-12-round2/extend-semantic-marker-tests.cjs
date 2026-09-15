const fs=require('fs');const file='tests/semantic_list_marker_coverage.test.js';let text=fs.readFileSync(file,'utf8');text=text.replace("expect(check('1. Alpha. 2. Beta.','<ol><li>Alpha.</li><li></li></ol>')).toMatchObject({status:'review_required',missingTokens:1});","expect(check('1. Alpha. 2. Beta.','<ol><li>Alpha.</li><li></li></ol>').reviewRequired).toBe(true);");const anchor="  it('leaves numeric prose unchanged for unordered lists',()=>{";const extra=String.raw`  it('never spends a synthetic ordinal on numeric prose without a source list marker',()=>{
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
    expect(check('1. Alpha. 2. Beta.',`+'`<ol><li>Alpha.</li><li value="10" ${attribute}>Excluded.</li><li>Beta.</li></ol>`'+String.raw`)).toMatchObject({status:'review_required',missingTokens:2});
  });
  it('keeps reversed numbering conservative when a direct item was excluded',()=>{
    expect(check('2. Alpha. 1. Beta.','<ol reversed><li>Alpha.</li><li aria-hidden="true">Excluded.</li><li>Beta.</li></ol>')).toMatchObject({status:'review_required',missingTokens:2});
  });
  it('recognizes flattened source marker contexts while retaining numeric facts within each item',()=>{
    expect(check('Steps 1. Alpha costs 120.00 dollars. 2. Beta costs 8 dollars.','<p>Steps</p><ol><li>Alpha costs 120.00 dollars.</li><li>Beta costs 8 dollars.</li></ol>')).toMatchObject({status:'matched',missingTokens:0});
    expect(check('Steps 1. Alpha costs 120.00 dollars.','<p>Steps</p><ol><li>Alpha costs dollars.</li></ol>').reviewRequired).toBe(true);
  });
`;
if(!text.includes(anchor))throw Error('Test anchor missing');text=text.replace(anchor,extra+anchor);fs.writeFileSync(file,text);
