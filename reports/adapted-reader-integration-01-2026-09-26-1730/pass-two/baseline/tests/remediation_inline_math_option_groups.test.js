import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const harnessText = fs.readFileSync('tests/aifix_chunk_gates.test.js', 'utf8');
const make = new Function('fs', 'path', harnessText.slice(harnessText.indexOf('const SRC ='), harnessText.indexOf('const DOC =')) + '\nreturn harness;')(fs, path);
const wrap = body => '<!doctype html><html lang="en"><body><main>' + body + '<p>' + 'Read the original instruction and record observations in your notebook. '.repeat(8) + '</p></main></body></html>';
const select = '<select name="region"><option selected value="north">North</option><optgroup id="other" label="Other"><option value="south">South</option><option value="east">East</option></optgroup></select>';
const decision = (source, candidate) => make(() => candidate).acceptFixedHtmlDetailed(candidate, source, { strictContent: true, mode: 'faithful' });

describe('HTML superscript and subscript source semantics', () => {
  it.each([
    ['caption Unicode exponent becomes baseline digit', '<figure><figcaption>Area in m²</figcaption></figure>', s => s.replace('m²', 'm2'), 'image-association-changed'],
    ['Unicode exponent becomes baseline digit', '<p>Compute x² for this expression.</p>', s => s.replace('x²', 'x2'), 'source-value-changed'],
    ['Unicode exponent value changes', '<p>Compute x² for this expression.</p>', s => s.replace('x²', 'x³'), 'source-reading-order-changed'],
    ['linked exponent becomes subscript', '<p>Compute <a href="https://school.example/expression">x<sup>2</sup></a> for this expression.</p>', s => s.replace('<sup>2</sup>', '<sub>2</sub>'), 'math-content-changed'],
    ['existing caption exponent becomes subscript', '<figure><figcaption>Area in m<sup>2</sup></figcaption></figure>', s => s.replace('<sup>2</sup>', '<sub>2</sub>'), 'math-content-changed'],
    ['exponent becomes subscript', '<p>Compute x<sup>2</sup> for this expression.</p>', s => s.replace('<sup>2</sup>', '<sub>2</sub>'), 'math-content-changed'],
    ['chemical subscript becomes exponent', '<p>Record H<sub>2</sub>O in the notebook.</p>', s => s.replace('<sub>2</sub>', '<sup>2</sup>'), 'math-content-changed'],
    ['exponent markup removed', '<p>Compute x<sup>2</sup> for this expression.</p>', s => s.replace('<sup>2</sup>', '2'), 'math-content-changed'],
    ['exponent moves to another variable', '<p>Compute x<sup>2</sup> plus y2 for this expression.</p>', s => s.replace('x<sup>2</sup> plus y2', 'x2 plus y<sup>2</sup>'), 'source-reading-order-changed'],
    ['script nesting changes', '<p>Record x<sup>n<sub>i</sub></sup> for the expression.</p>', s => s.replace('<sup>n<sub>i</sub></sup>', '<sup>n</sup><sub>i</sub>'), 'math-content-changed'],
  ])('rejects %s and retains the original through the repair path', async (_, body, change, reason) => {
    const source = wrap(body), candidate = change(source), h = make(change);
    expect(decision(source, candidate)).toEqual(expect.objectContaining({ accepted: false, reason }));
    expect(await h.run(source)).toBe(source);
    expect(h.evidence[0].candidateRejections).toContainEqual(expect.objectContaining({ reason }));
  });

  it.each([
    ['linked exponent wrapper', '<p>Compute <a href="https://school.example/expression">x<sup>2</sup></a> for this expression.</p>', s => s.replace('<sup>2</sup>', '<sup><span>2</span></sup>')],
    ['new caption with an exponent', '<figure></figure>', s => s.replace('<figure></figure>', '<figure><figcaption>Area in m<sup>2</sup></figcaption></figure>')],
    ['canonically equivalent caption text', '<figure><figcaption>Cafe\u0301 area in m²</figcaption></figure>', s => s.replace('Cafe\u0301', 'Caf\u00e9')],
    ['inline wrapper', '<p>Compute x<sup>2</sup> for this expression.</p>', s => s.replace('<sup>2</sup>', '<sup><span lang="en">2</span></sup>')],
    ['surrounding wrapper', '<p>Compute x<sup>2</sup> for this expression.</p>', s => s.replace('x<sup>2</sup>', '<strong>x<sup>2</sup></strong>')],
    ['equivalent numeric typography', '<p>Compute x<sup>3.50</sup> for this expression.</p>', s => s.replace('3.50', '3.5')],
    ['nested inline wrapper', '<p>Record x<sup>n<sub>i</sub></sup> for the expression.</p>', s => s.replace('<sub>i</sub>', '<sub><span>i</span></sub>')],
    ['footnote link improvement', '<p>Read the definition<sup><a href="https://school.example/note">note</a></sup> before continuing.</p>', s => s.replace('>note</a>', '>Read the source note</a>')],
  ])('accepts %s without exposing internal markers', async (_, body, change) => {
    const source = wrap(body), candidate = change(source), h = make(change);
    expect(decision(source, candidate).accepted).toBe(true);
    expect(await h.run(source)).toBe(candidate);
    expect(h.evidence[0].candidateRejectionCount).toBe(0);
    expect(candidate).not.toContain('alloflowpreservation');
  });
});

describe('select option groups preserve effective choice state', () => {
  it.each([
    ['an unselected group becomes disabled', select, s => s.replace('id="other"', 'id="other" disabled')],
    ['group meaning changes', select, s => s.replace('label="Other"', 'label="Excluded"')],
    ['an option loses its group', select, s => s.replace('<option value="south">South</option>', '').replace('</optgroup>', '</optgroup><option value="south">South</option>')],
    ['an option moves between otherwise identical groups', '<select><optgroup label="Other"><option value="north">North</option><option value="south">South</option></optgroup><optgroup label="Other"><option value="east">East</option></optgroup></select>', s => s.replace('<option value="south">South</option></optgroup><optgroup label="Other">', '</optgroup><optgroup label="Other"><option value="south">South</option>')],
  ])('rejects %s', async (_, body, change) => {
    const source = wrap(body), candidate = change(source), h = make(change);
    expect(decision(source, candidate)).toEqual(expect.objectContaining({ accepted: false, reason: 'form-state-changed', sourceLocation: 'control:1' }));
    expect(await h.run(source)).toBe(source);
    expect(h.evidence[0].candidateRejections).toContainEqual(expect.objectContaining({ reason: 'form-state-changed' }));
  });

  it.each([
    ['group ID rename', select, s => s.replace('id="other"', 'id="renamed"')],
    ['new select accessible name', select, s => s.replace('<select ', '<select aria-label="Region" ')],
    ['missing group label', select.replace('label="Other"', 'label=""'), s => s.replace('label=""', 'label="Other"')],
    ['equivalent disabled choices', select.replace('id="other"', 'id="other" disabled'), s => s.replace('id="other" disabled', 'id="other"').replace('<option value="south">', '<option disabled value="south">').replace('<option value="east">', '<option disabled value="east">')],
  ])('accepts %s', (_, body, change) => {
    const source = wrap(body);
    expect(decision(source, change(source)).accepted).toBe(true);
  });

  it('retains the existing constrained table-scope correction', () => {
    const source = wrap('<table><tr><th scope="row">Group</th><th scope="row">Score</th></tr><tr><td>North</td><td>95</td></tr></table>');
    expect(decision(source, source.replace(/scope="row"/g, 'scope="col"')).accepted).toBe(true);
  });
});
