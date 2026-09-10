const fs=require('node:fs');
let s=fs.readFileSync('doc_pipeline_source.jsx','utf8');
function edit(a,b){if(!s.includes(a))throw Error('Missing '+a.slice(0,80));s=s.replace(a,b);}
edit("return clean.includes(',') ? clean : clean.replace(/(\\.\\d*?)0+$/, '$1').replace(/\\.$/, '');", "return /^[-+]?\\d+(?:\\.\\d+)?$/.test(clean) ? clean.replace(/(\\.\\d*?)0+$/, '$1').replace(/\\.$/, '') : clean;");
const start=s.indexOf('        const numericPattern = '),end=s.indexOf('        const numbers = doc =>',start);
if(start<0||end<0)throw Error('Missing numeric helper bounds');
const numericHelpers=s.slice(start,end);s=s.slice(0,start)+s.slice(end);
edit('        const tableGrid = doc =>',numericHelpers+'        const cellText = value => norm(norm(value).replace(numericPattern, value => " " + canonicalNumber(value) + " "));\n        const tableGrid = doc =>');
edit('[norm(cell.textContent), cell.rowSpan, cell.colSpan]', '[cellText(cell.textContent), cell.rowSpan, cell.colSpan]');
// New skip links are allowed even when a normal source link already has the same href.
edit('        const sourceDestinations = new Set(sourceLinks.map(destination));', `        const skipLink = anchor => /^#[^#]+$/.test(destination(anchor))
          && /(?:^|\\s)(?:skip-link|sr-only)(?:\\s|$)/.test(anchor.className || '');
        const sourceSkipCounts = new Map();
        sourceLinks.filter(skipLink).forEach(anchor => sourceSkipCounts.set(destination(anchor), (sourceSkipCounts.get(destination(anchor)) || 0) + 1));`);
edit(`          if (!sourceDestinations.has(href) && /^#[^#]+$/.test(href)
              && /(?:^|\\s)(?:skip-link|sr-only)(?:\\s|$)/.test(anchor.className || '')
              && after.getElementById(href.slice(1))) anchor.remove();`, `          if (skipLink(anchor) && after.getElementById(href.slice(1))) {
            const remaining = sourceSkipCounts.get(href) || 0;
            if (remaining > 0) sourceSkipCounts.set(href, remaining - 1); else anchor.remove();
          }`);
// Collect both this function's rejections and nested aiFixChunked deltas once.
edit('    // Each rejected candidate is a delta, just like aiFixChunked pass evidence.', `    const _sourceEvidenceCallback = _sessMeta.onPassEvidence;
    _sessMeta.onPassEvidence = meta => {
      if (!_chunkInvocationIsCurrent()) return;
      _sourceRejectionCount = Math.min(1000000, _sourceRejectionCount + Math.max(0, Number(meta && meta.candidateRejectionCount) || 0));
      const records = meta && Array.isArray(meta.candidateRejections) ? meta.candidateRejections : [];
      _sourceRejections.push(...records.slice(0, Math.max(0, 100 - _sourceRejections.length)).map(record => ({ chunkId: record.chunkId, phase: record.phase, reason: record.reason })));
      if (typeof _sourceEvidenceCallback === 'function') _sourceEvidenceCallback(meta);
    };
    // Each rejected candidate is a delta, just like aiFixChunked pass evidence.`);
edit("      _sourceRejectionCount++;\n      if (_sourceRejections.length < 100) _sourceRejections.push({ chunkId: String(chunkId), phase, reason: decision.reason || 'content-not-preserved' });\n",'');
fs.writeFileSync('doc_pipeline_source.jsx',s);
let t=fs.readFileSync('tests/aifix_source_associations.test.js','utf8');
t+=String.raw`
describe('formatting and skip-link boundary regressions',()=>{
 it('permits numeric typography inside a source table',async()=>{
  const input=doc(table.replace('<td>95</td>','<td>95.00</td>')+prose);
  const h=make(s=>s.replace('<td>95.00</td>','<td>95</td>'));
  expect(await h.run(input)).toBe(input.replace('<td>95.00</td>','<td>95</td>'));
 });
 it('does not normalize a changed dotted version identifier',async()=>{
  const input=doc('<p>Version 1.2.0 is required for the assignment.</p>'+prose);
  const h=make(s=>s.replace('1.2.0','1.2'));
  expect(await h.run(input)).toBe(input);
 });
 it('allows a skip control when an existing ordinary link shares its target',async()=>{
  const input=doc('<a href="#main">Main section</a>'+prose);
  const h=make(s=>s.replace('<body>','<body><a class="skip-link" href="#main">Skip to content</a>'));
  expect(await h.run(input)).toContain('Skip to content');
  expect(h.evidence[0].candidateRejectionCount).toBe(0);
 });
});
`;
fs.writeFileSync('tests/aifix_source_associations.test.js',t);
console.log('Completed boundary review fixes.');
