// Column-repair spot check: on pages where _alloOrderTextItems engaged, compare the
// question-number sequence read from naive item order vs repaired order. On a correct
// 2-column exam read, question numbers should ascend (down left column, then right).
const fs = require('fs'); const path = require('path');
const SRC = fs.readFileSync('C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/doc_pipeline_source.jsx', 'utf8');
const blk = SRC.match(/function _alloOrderTextItems\(items, opts\) \{[\s\S]*?\n  var _multi = \{ items: out, columns: res\.cols\.length, gutters: res\.gutters, applied: true \};\r?\n  return _multi;\r?\n\}/);
const order = new Function(blk[0] + '\n; return _alloOrderTextItems;')();
const qnums = (t) => {
  const m = t.match(/(?:^|\s)(\d{1,2})\s+(?=[A-Z(])/g) || [];
  return m.map((x) => parseInt(x, 10)).filter((n) => n >= 1 && n <= 85);
};
(async () => {
  const pdfjs = require(path.join(__dirname, 'node_modules/pdfjs-dist/legacy/build/pdf.js'));
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(path.join(__dirname, 'phys62024.pdf'))), useSystemFonts: true, disableFontFace: true }).promise;
  for (let p = 1; p <= doc.numPages; p++) {
    const tc = await (await doc.getPage(p)).getTextContent();
    const o = order(tc.items || [], {});
    if (!o || !o.applied) continue;
    const naive = tc.items.map((i) => i.str).join(' ').replace(/\s+/g, ' ');
    const fixed = o.items.map((i) => i.str).join(' ').replace(/\s+/g, ' ');
    console.log('p' + p + ' cols=' + o.columns + '  naiveQ=[' + qnums(naive).join(',') + ']  orderedQ=[' + qnums(fixed).join(',') + ']');
    console.log('  ordered head: ' + fixed.slice(0, 140));
  }
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
