const fs=require('node:fs');
let s=fs.readFileSync('doc_pipeline_source.jsx','utf8');
s=s.replace("return Number.isFinite(Number(clean)) ? (clean[0] === '+' ? '+' : '') + String(Number(clean)) : clean;", "// String normalization avoids rounding large identifiers through IEEE doubles.\n            return clean.includes(',') ? clean : clean.replace(/(\\.\\d*?)0+$/, '$1').replace(/\\.$/, '');");
s=s.replace("        sourceLinks.forEach((anchor, index) => { anchor.textContent = ' alloflowlink' + index + ' '; });\n        outputLinks.forEach((anchor, index) => { anchor.textContent = ' alloflowlink' + index + ' '; });", "        let markerPrefix = 'alloflowpreservation';\n        while (String(original).includes(markerPrefix) || String(fixed).includes(markerPrefix)) markerPrefix += 'x';\n        sourceLinks.forEach((anchor, index) => { anchor.textContent = ' ' + markerPrefix + 'link' + index + ' '; });\n        outputLinks.forEach((anchor, index) => { anchor.textContent = ' ' + markerPrefix + 'link' + index + ' '; });");
s=s.replace("' ALLOFLOWFIGURE' + index + ' '", "' ' + markerPrefix + 'figure' + index + ' '");
s=s.replace("const marker = 'ALLOFLOWFIGURE' + index", "const marker = markerPrefix + 'figure' + index");
fs.writeFileSync('doc_pipeline_source.jsx',s);
let t=fs.readFileSync('tests/aifix_source_associations.test.js','utf8');
t=t.replace("   expect(Review.evidence(h.evidence[0]).candidateRejections)", "   expect(normalizeCandidateRejectionEvidence(JSON.parse(JSON.stringify(h.evidence[0])))).toEqual(Review.evidence(h.evidence[0]));\n   expect(Review.evidence(h.evidence[0]).candidateRejections)");
t += String.raw`
describe('source values remain exact without blocking equivalent typography', () => {
 it.each([['3.50', '3.5'], ['1,234', '1234']])('permits equivalent %s to %s formatting', async (before, after) => {
  const input=doc('<p>Recorded value '+before+' units.</p>'+prose);
  const h=make(s=>s.replace(before,after));
  expect(await h.run(input)).toBe(input.replace(before,after));
  expect(h.evidence[0].candidateRejectionCount).toBe(0);
 });
 it('does not round away changed large identifiers', async () => {
  const input=doc('<p>Record 9007199254740992 identifies this sample.</p>'+prose);
  const h=make(s=>s.replace('9007199254740992','9007199254740993'));
  expect(await h.run(input)).toBe(input);
  expect(h.evidence[0].candidateRejections[0].reason).toBe('source-value-changed');
 });
 it('preserves a preexisting figure caption', async () => {
  const input=doc('<figure>'+img+'<figcaption>Sunlight experiment</figcaption></figure>'+prose);
  const h=make(s=>s.replace('Sunlight experiment','Shaded experiment'));
  expect(await h.run(input)).toBe(input);
  expect(h.evidence[0].candidateRejections[0].reason).toBe('image-association-changed');
 });
});
`;
fs.writeFileSync('tests/aifix_source_associations.test.js',t);
