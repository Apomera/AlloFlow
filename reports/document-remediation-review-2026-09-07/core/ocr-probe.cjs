const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const src = fs.readFileSync(path.join(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
function region(begin, end) {
  const a = src.indexOf(begin), b = src.indexOf(end, a + begin.length);
  if (a < 0 || b < 0) throw new Error('Missing source anchor: ' + begin);
  return src.slice(a, b);
}
function decl(anchor) {
  const at = src.indexOf(anchor);
  if (at < 0) throw new Error('Missing ' + anchor);
  const open = src.indexOf('{', at);
  let d = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') d++;
    else if (src[i] === '}' && --d === 0) return src.slice(at, i+1) + ';';
  }
  throw new Error('Unbalanced ' + anchor);
}
const declarations = [
  decl('var _ocrJunkRatio = function'),
  region('var _stripPageEdgeArtifacts = function', 'var _alloOcrQualityUaVerdict = function'),
  region('const reconcileOcrPages = ', '  // Lazy-load mammoth.js'),
];
const messages = [];
const reconcile = new Function('warnLog', declarations.join('\n') + '\nreturn reconcileOcrPages;')((...args) => messages.push(args.join(' ')));
const tests = [];
function run(name, tess, vision) {
  messages.length = 0;
  const result = reconcile(tess, vision);
  const out = { name, tesseract: tess, vision, result, logs: messages.slice() };
  tests.push(out);
  return out;
}
run('equal-length-score-conflict',
  [{pageNum:1,text:'Vocabulary 95. Block Design 102.'}],
  [{pageNum:1,text:'Vocabulary 96. Block Design 103.'}]);
run('two-page-vision-omits-second-page',
  [{pageNum:1,text:'First page content.'},{pageNum:2,text:'Second page essential instruction: complete experiment B.'}],
  [{pageNum:1,text:'First page content with heading and some additional details.'}]);
// The Vision fallback currently divides a chunk at half its character length when
// PAGE BREAK delimiters are absent, regardless of actual page lengths (27026-27030).
const page1 = 'First page contains the instructions to observe the sunlight and write the answer. '.repeat(12);
const page2 = 'Second page final instruction: Submit worksheet.';
const whole = page1 + '\n' + page2;
const per = Math.floor(whole.length/2);
run('equal-character-fallback-with-uneven-pages',
  [{pageNum:1,text:page1},{pageNum:2,text:page2}],
  [{pageNum:1,text:whole.slice(0,per).trim()},{pageNum:2,text:whole.slice(per).trim()}]);
const evidence = {source:'doc_pipeline_source.jsx', sourceSha256:crypto.createHash('sha256').update(src).digest('hex'),
  environment:'Actual source OCR reconciliation and quality helpers; synthetic per-engine text, no network', tests};
fs.writeFileSync(path.join(__dirname, 'ocr-probe-results.json'), JSON.stringify(evidence,null,2));
console.log(JSON.stringify(tests.map(test=>({name:test.name, sourceChars:test.tesseract.reduce((n,p)=>n+p.text.length,0), outputChars:test.result.fullText.length, disagreements:test.result.disagreements.length, lowConfidence:test.result.lowConfidence, sources:test.result.pages.map(p=>p.source), outputContainsSecondPage:test.result.fullText.includes('Second page'), fullText:test.result.fullText.slice(0,250)})),null,2));