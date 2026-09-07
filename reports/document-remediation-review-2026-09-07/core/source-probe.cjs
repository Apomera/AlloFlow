// Read-only application-source probes. Run with: node reports/document-remediation-review-2026-09-07/core/source-probe.cjs
// These compile the current source functions verbatim; only transport/logging and unused
// provider controls are stubbed. Application files are never modified and no AI calls run.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { JSDOM } = require('jsdom');
const root = process.cwd();
const src = fs.readFileSync(path.join(root, 'doc_pipeline_source.jsx'), 'utf8');
const dom = new JSDOM('');
global.DOMParser = dom.window.DOMParser;
global.NodeFilter = dom.window.NodeFilter;
function section(begin, end) {
  const a = src.indexOf(begin), b = src.indexOf(end, a + begin.length);
  if (a < 0 || b < 0) throw new Error('Source anchor missing: ' + begin);
  return src.slice(a, b);
}
function arrow(name) {
  const at = src.indexOf('const ' + name + ' = ');
  if (at < 0) throw new Error('Missing ' + name);
  const brace = src.indexOf('{', src.indexOf('=>', at));
  let depth = 0;
  for (let i = brace; i < src.length; i++) {
    if (src[i] === '{') depth++;
    if (src[i] === '}' && --depth === 0) return src.slice(at, i + 1) + ';';
  }
  throw new Error('Unbalanced ' + name);
}
const logs = [];
let responder = () => { throw new Error('No response fixture'); };
const decls = [
  arrow('textCharCount'), arrow('detectFabrication'), arrow('acceptFixedHtmlDetailed'), arrow('acceptFixedHtml'),
  section('function _alloTableCellDrift(', '// ── Issue-resolution diff'),
  section('function checkReadingOrderPreserved(', 'function collectTaggedTreeReferenceOrder('),
];
// Function boundary is anchored on the next actual declaration, avoiding copied acceptance logic.
const splitStart = src.indexOf('const splitHtmlOnTagBoundary = ');
const splitEnd = src.indexOf('\n  };', splitStart) + 5;
decls.push(src.slice(splitStart, splitEnd));
decls.push(section('const aiFixChunked = ', '  // Strip Markdown triple-backtick code fences'));
const harness = new Function('callGemini', 'warnLog', 'addToast', 'DOMParser', `
  const HTML_FIX_CHUNK = 16000;
  const _neutralizePromptFence = s => s, _restoreNeutralizedPromptFences = s => s, stripFence = s => s;
  const _isJsonWrapped = () => false, _tryUnwrapJsonHtml = () => null, _isThrottleErr = () => false;
  const _usesLocalTextBackend = () => false, _geminiRateWindowMs = 0, _geminiRateMaxStarts = 0;
  const _geminiThrottleInfo = () => ({ storming: false }), _pipeLog = () => {};
  ${decls.join('\n')}
  return { aiFixChunked, acceptFixedHtmlDetailed, tableCellDrift: _alloTableCellDrift, splitHtmlOnTagBoundary, textCharCount };
`)((...args) => responder(...args), (...args) => logs.push(args.join(' ')), (...args) => logs.push(args.join(' ')), DOMParser);
const doc = content => '<!DOCTYPE html><html lang="en"><body><main>' + content + '</main></body></html>';
const table = '<table><tr><th>Subtest</th><th>Score</th></tr><tr><td>Vocabulary</td><td>95</td></tr><tr><td>Block Design</td><td>102</td></tr></table>';
const swapScores = html => html.replace('<td>95</td>', '<td>TEMP</td>').replace('<td>102</td>', '<td>95</td>').replace('<td>TEMP</td>', '<td>102</td>');
const paragraph = '<p>' + 'Original educational material preserves all instructions and activities. '.repeat(15) + '</p>';
function getPromptHtml(prompt) {
  const match = prompt.match(/UNTRUSTED HTML (?:FRAGMENT )?DATA:\n"""\n([\s\S]*?)\n"""/);
  if (!match) throw new Error('Cannot locate fixture HTML');
  return match[1];
}
async function probe(name, input, response) {
  logs.length = 0;
  let calls = 0;
  responder = async prompt => { calls++; return response(getPromptHtml(prompt), prompt, calls); };
  const output = await harness.aiFixChunked(input, 'Mark table headers and maintain every source value.', name);
  return { name, inputChars: input.length, calls, outputChanged: output !== input,
    textRatio: harness.textCharCount(output) / harness.textCharCount(input),
    drift: harness.tableCellDrift(input, output), logs: logs.slice(), input, output };
}
(async () => {
  const results = [];
  const short = doc(table + paragraph);
  const long = doc(table + paragraph.repeat(36));
  results.push(await probe('short-document-score-swap', short, swapScores));
  results.push(await probe('multi-chunk-score-swap', long, swapScores));
  const images = doc('<p>Two diagrams are required in the following worksheet. These diagrams show different experiments.</p>' +
    '<img src="__ALLOFLOW_DATAURL_FINAL_1__" alt="First experiment"><img src="__ALLOFLOW_DATAURL_FINAL_2__" alt="Second experiment">' + paragraph);
  const imageResult = await probe('equal-count-image-identity-replacement', images, html => html.replace('__ALLOFLOW_DATAURL_FINAL_2__', '__ALLOFLOW_DATAURL_FINAL_1__'));
  imageResult.originalSecondImageMissing = !imageResult.output.includes('__ALLOFLOW_DATAURL_FINAL_2__');
  results.push(imageResult);
  const dataImage = 'data:image/png;base64,' + 'A'.repeat(300);
  const restoredImage = doc('<img src="' + dataImage + '" alt="Source experiment">' + paragraph.repeat(2));
  const dataResult = await probe('restored-data-image-token-replacement', restoredImage, html => html.replace('__IMG_DATA_1__', 'image-removed'));
  dataResult.originalDataImageMissing = !dataResult.output.includes(dataImage);
  results.push(dataResult);
  const retryInput = doc('<img src="__ALLOFLOW_DATAURL_FINAL_1__" alt="Experiment">' + paragraph.repeat(120));
  const retryResult = await probe('image-retry-bypasses-text-floor', retryInput, (html, prompt) => {
    if (!html.includes('__ALLOFLOW_DATAURL_FINAL_1__')) return html;
    if (prompt.startsWith('Re-fix this HTML fragment.')) return '<img src="__ALLOFLOW_DATAURL_FINAL_1__" alt="Experiment"><div aria-hidden="true" data-padding="' + 'x'.repeat(html.length) + '"></div>';
    return html.replace('__ALLOFLOW_DATAURL_FINAL_1__', 'missing-image');
  });
  results.push(retryResult);
  const summary = results.map(({ input, output, ...result }) => result);
  const evidence = { source: 'doc_pipeline_source.jsx', sourceSha256: crypto.createHash('sha256').update(src).digest('hex'),
    environment: 'Actual source function extraction, jsdom DOMParser, mocked AI, production 16000-char chunk budget', results: summary };
  fs.writeFileSync(path.join(__dirname, 'source-probe-results.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
