// STEM remediation assessment — drive the pipeline's PURE quality nets against real
// STEM exam PDFs (born-digital NY Regents) and measure false-positive pressure:
//   1. _ocrJunkRatio / _alloOcrAccuracy on math-dense page text (does clean math band 'poor'?)
//   2. _alloOrderTextItems column repair on exam layouts (does it misfire on numbered problems?)
// Functions are regex-extracted from doc_pipeline_source.jsx (same technique as
// tests/reading_order_multicolumn.test.js) so we run the REAL production code.
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync('C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/doc_pipeline_source.jsx', 'utf8');

function extract(name, endMarker) {
  const startRe = new RegExp('var ' + name + ' = function');
  const s = SRC.search(startRe);
  if (s === -1) throw new Error('missing ' + name);
  const e = SRC.indexOf(endMarker, s);
  if (e === -1) throw new Error('missing end for ' + name);
  return SRC.slice(s, e + endMarker.length);
}

// _ocrJunkRatio ends at its own '};'
const junkSrc = extract('_ocrJunkRatio', '\n};');
const commonStart = SRC.indexOf('var _ALLO_OCR_COMMON_EN');
const commonSrc = SRC.slice(commonStart, SRC.indexOf('\n', SRC.indexOf('.filter(Boolean);', commonStart)));
const accSrc = extract('_alloOcrAccuracy', '\n  return _result;\n};');

const factory = new Function(junkSrc + '\n' + commonSrc + '\n' + accSrc + '\n; return { junk: _ocrJunkRatio, acc: _alloOcrAccuracy };');
const { junk, acc } = factory();

// _alloOrderTextItems (same extraction as the vitest suite)
const orderBlock = SRC.match(/function _alloOrderTextItems\(items, opts\) \{[\s\S]*?\n  var _multi = \{ items: out, columns: res\.cols\.length, gutters: res\.gutters, applied: true \};\r?\n  return _multi;\r?\n\}/);
if (!orderBlock) throw new Error('could not extract _alloOrderTextItems');
const order = new Function(orderBlock[0] + '\n; return _alloOrderTextItems;')();

// Recompute the accuracy-internal token shares the metrics object does NOT expose (mash),
// so findings can attribute WHY a page scored poorly. Mirrors _alloOcrAccuracy's token walk.
function tokenShares(s) {
  const rawTokens = String(s || '').split(/[^\p{L}\p{N}']+/u).filter(Boolean);
  const alphaTokens = rawTokens.filter((t) => /[\p{L}]/u.test(t));
  let mash = 0, frag = 0;
  const mashSamples = [], fragSamples = [];
  for (const tok of alphaTokens) {
    const low = tok.toLowerCase();
    if (/[a-z]/i.test(tok) && /[0-9]/.test(tok)) { mash++; if (mashSamples.length < 6) mashSamples.push(tok); }
    if (low.replace(/[^a-z]/g, '').length === 1 && low !== 'a' && low !== 'i') { frag++; if (fragSamples.length < 6) fragSamples.push(tok); }
  }
  const n = alphaTokens.length || 1;
  return { alphaTokens: alphaTokens.length, mashRatio: mash / n, fragmentRatio: frag / n, mashSamples, fragSamples };
}

async function main() {
  const pdfjs = require(path.join(__dirname, 'node_modules/pdfjs-dist/legacy/build/pdf.js'));
  const files = process.argv.slice(2);
  for (const f of files) {
    const data = new Uint8Array(fs.readFileSync(f));
    const doc = await pdfjs.getDocument({ data, useSystemFonts: true, disableFontFace: true }).promise;
    console.log('\n===== ' + path.basename(f) + ' — ' + doc.numPages + ' pages =====');
    let poor = 0, fair = 0, good = 0, unknown = 0, colPages = 0, wouldFlagB5 = 0;
    const worst = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      const ordered = order(tc.items || [], {});
      const items = (ordered && ordered.items) || tc.items || [];
      const text = items.map((it) => it.str).join(' ').replace(/\s+/g, ' ').trim();
      const j = junk(text);
      const a = acc(text);
      const sh = tokenShares(text);
      if (ordered && ordered.applied) colPages++;
      if (a.band === 'poor') poor++; else if (a.band === 'fair') fair++; else if (a.band === 'good') good++; else unknown++;
      // The B5 review-banner accuracy net flags CHOSEN text whose band is 'poor'
      if (a.band === 'poor') wouldFlagB5++;
      worst.push({ p, score: a.score, band: a.band, conf: a.confidence, junk: Math.round(j * 100) / 100, mash: Math.round(sh.mashRatio * 100) / 100, frag: Math.round(sh.fragmentRatio * 100) / 100, dict: a.metrics.dictHitRate, alpha: sh.alphaTokens, cols: ordered && ordered.applied ? ordered.columns : 1, mashS: sh.mashSamples.join(','), fragS: sh.fragSamples.join(','), sample: text.slice(0, 90) });
    }
    worst.sort((x, y) => (x.score == null ? 101 : x.score) - (y.score == null ? 101 : y.score));
    console.log('bands: poor=' + poor + ' fair=' + fair + ' good=' + good + ' unknown=' + unknown + ' | column-repair applied on ' + colPages + ' pages | B5 "review OCR" flags=' + wouldFlagB5);
    console.log('\nWorst 8 pages by accuracy score:');
    for (const w of worst.slice(0, 8)) {
      console.log(`  p${w.p}: score=${w.score} (${w.band}/${w.conf}) junk=${w.junk} mash=${w.mash} frag=${w.frag} dict=${w.dict} alpha=${w.alpha} cols=${w.cols}`);
      if (w.mashS) console.log('      mash tokens: ' + w.mashS);
      if (w.fragS) console.log('      frag tokens: ' + w.fragS);
      console.log('      text: ' + w.sample);
    }
  }
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });
