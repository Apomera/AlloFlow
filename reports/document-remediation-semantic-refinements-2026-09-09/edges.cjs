const fs=require('fs');
let p='doc_pipeline_source.jsx',s=fs.readFileSync(p,'utf8');
s=s.replace("'formenctype'];", "'formenctype','placeholder','aria-checked','aria-valuenow'];");
s=s.replace("return { state: [el.tagName, attrs.map(name => el.getAttribute(name)), owner", "return { accessibleName: el.getAttribute('aria-label') || (el.getAttribute('aria-labelledby') || '').split(/\\s+/).filter(Boolean).map(id => norm(doc.getElementById(id)?.textContent)).join(' '), state: [el.tagName, attrs.map(name => el.getAttribute(name)), owner");
s=s.replace("|| af[i].labels.some(label => !bf[i].labels.includes(label))", "|| (af[i].accessibleName && af[i].accessibleName !== bf[i].accessibleName) || af[i].labels.some(label => !bf[i].labels.includes(label))");
fs.writeFileSync(p,s);
p='tests/remediation_semantic_fidelity.test.js';s=fs.readFileSync(p,'utf8');
s=s.replace(" ['math operator',", " ['ARIA form label', '<input aria-label=\"Student name\" value=\"Ada\">', s => s.replace('Student name', 'Teacher name'), 'form-state-changed'],\n ['select state', '<select><option selected>North</option><option>South</option></select>', s => s.replace('<option selected>North</option><option>', '<option>North</option><option selected>'), 'form-state-changed'],\n ['math operator',");
s+=`
describe('source-location evidence remains bounded and useful', () => {
 it('retains an exact cell location through canonical JSON and review rendering', async () => {
  const h = make(s => s.replace('<td headers="score">95</td>', '<td headers="score">96</td>'));
  await h.run(doc(table));
  const evidence = normalizeCandidateRejectionEvidence(JSON.parse(JSON.stringify(h.evidence[0])));
  expect(evidence.candidateRejections[0].sourceLocation).toBe('table:1/row:2/cell:2');
  expect(Review.reviewItems(evidence, {})[0].locationLabel).toContain('table 1, row 2, cell 2');
 });
 it.each(['PRIVATE', '<img src=x>', 'table:0', 'table:1/row:999999999', 'table:1/cell:2\\nPRIVATE'])('drops malformed location %s', sourceLocation => {
  const input = { candidateRejections: [{ chunkId: '1', phase: 'chunk', reason: 'table-content-changed', sourceLocation }] };
  expect(Review.evidence(input).candidateRejections[0]).not.toHaveProperty('sourceLocation');
  expect(normalizeCandidateRejectionEvidence(input)).toEqual(Review.evidence(input));
 });
});
`;
fs.writeFileSync(p,s);
