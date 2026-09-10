// Review-only probes. Execute the current acceptance code using the existing
// source-backed harness; model responses are deterministic local substitutions.
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { createHash } = require('node:crypto');
const dom = new JSDOM('');
global.DOMParser = dom.window.DOMParser;
global.NodeFilter = dom.window.NodeFilter;
const source = fs.readFileSync('doc_pipeline_source.jsx', 'utf8');
const test = fs.readFileSync('tests/aifix_chunk_gates.test.js', 'utf8');
const harnessSource = test.slice(test.indexOf('const SRC ='), test.indexOf('const DOC ='));
const make = new Function('fs', 'path', harnessSource + '\nreturn harness;')(fs, path);
const doc = s => '<!DOCTYPE html><html lang="en"><body><main>' + s + '</main></body></html>';
const prose = '<p>' + 'Read the instructions carefully and record observations in your science notebook. '.repeat(10) + '</p>';
const table = '<table><tr><td>Group</td><td>Score</td></tr><tr><td>Alpha</td><td>95</td></tr><tr><td>Bravo</td><td>102</td></tr></table>';
const img = '<img src="__ALLOFLOW_DATAURL_FINAL_1__" alt="Seedling">';
const cases = [
  { id: 'legitimate-long-alt-rejected', body: '<img src="__ALLOFLOW_DATAURL_FINAL_1__" alt="">',
    change: s => s.replace('alt=""', 'alt="Two seedlings compare growth: the seedling under sunlight has four leaves and an upright stem; the seedling in shade has two leaves and a bent stem."') },
  { id: 'link-destination-changed', body: '<p><a href="https://school.example/alpha">Assignment resource</a></p>' + prose,
    change: s => s.replace('https://school.example/alpha', 'https://school.example/bravo') },
  { id: 'table-value-substituted', body: table + prose, change: s => s.replace('<td>95</td>', '<td>96</td>') },
  { id: 'table-semantics-removed', body: table + prose,
    change: s => s.replace(/<table>/g, '<div class="grid">').replace(/<\/table>/g, '</div>').replace(/<tr>/g, '<div>').replace(/<\/tr>/g, '</div>').replace(/<td>/g, '<span>').replace(/<\/td>/g, '</span>') },
  { id: 'single-digit-changed', body: '<p>Complete 3 trials for each sample.</p>' + prose, change: s => s.replace('Complete 3', 'Complete 8') },
  { id: 'figure-moved-to-other-section', body: '<section><h2>Sunlight</h2>' + img + '<p>Record growth under sunlight.</p></section><section><h2>Shade</h2><p>Record growth under shade.</p></section>' + prose,
    change: s => s.replace(img, '').replace('<h2>Shade</h2>', '<h2>Shade</h2>' + img) },
  { id: 'added-number-warning', body: '<p>The study enrolled participants over two terms.</p>' + prose,
    change: s => s.replace('enrolled participants', 'enrolled 8742 participants') },
  { id: 'header-promotion-positive-control', body: table + prose,
    change: s => s.replace('<td>Group</td><td>Score</td>', '<th scope="col">Group</th><th scope="col">Score</th>') },
  { id: 'transposition-negative-control', body: table + prose,
    change: s => s.replace('<td>95</td>', '<td>TEMP</td>').replace('<td>102</td>', '<td>95</td>').replace('<td>TEMP</td>', '<td>102</td>') },
];
(async () => {
  const rows = [];
  for (const c of cases) {
    const input = doc(c.body), h = make(c.change);
    const decision = h.acceptFixedHtmlDetailed(c.change(input), input, { mode: 'faithful' });
    const output = await h.run(input);
    rows.push({ id: c.id, candidateAccepted: decision.accepted, decision,
      changedCandidateReturned: output === c.change(input), originalReturned: output === input,
      passEvidence: h.evidence, calls: h.calls.length });
  }
  const result = { createdAt: new Date().toISOString(), sourceSha256: createHash('sha256').update(source).digest('hex'),
    scope: 'Current source acceptance and aiFixChunked only; jsdom; mocked model; no full pipeline or live provider', rows };
  fs.writeFileSync(path.join(__dirname, 'probe-results.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2)); dom.window.close();
})().catch(e => { console.error(e); process.exitCode = 1; });
