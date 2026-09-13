// Attribute the remaining unexamined count: rescan with individual catalog
// entries removed from an in-memory copy (the file is never written).
const fs = require('node:fs'), path = require('node:path');
const root = process.cwd();
const PDF = require(path.join(root, 'desktop/mcp/vendor/pdf-lib.min.js'));
const nm = PDF.PDFName.of;
const source = fs.readFileSync(path.join(root, 'doc_pipeline_source.jsx'), 'utf8');
const b = source.indexOf('function _alloScanActiveContent(pdfDoc, PDFLibNS)'), e = source.indexOf('// ── S7', b);
const scan = new Function(source.slice(b, e) + '\nreturn _alloScanActiveContent;')();
(async () => {
  for (const rel of process.argv.slice(2)) {
    const bytes = fs.readFileSync(path.join(root, rel));
    console.log('\n===', rel);
    for (const drop of [null, 'StructTreeRoot', 'Names', 'Outlines', 'AcroForm']) {
      const doc = await PDF.PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
      if (drop) { if (!doc.catalog.get(nm(drop))) continue; doc.catalog.delete(nm(drop)); }
      const r = scan(doc, PDF);
      console.log((drop ? 'without /' + drop : 'as-is').padEnd(22), 'complete=' + r.complete, 'unex=' + r.unexaminedStructures, 'pageFail=' + r.pageScanFailures, 'any=' + r.any, r.findings.map(f => f.type + 'x' + f.count).join(',') || '-');
    }
    // How big is the structure tree? (objects the structure walk would claim)
    const doc = await PDF.PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    const ctx = doc.context, rr = (o) => (o instanceof PDF.PDFRef ? ctx.lookup(o) : o);
    const seen = new Set(); let maxDepth = 0, nonStruct = new Map();
    const walk = (raw, depth) => { const k = rr(raw); if (!k || seen.has(k)) return; if (depth > maxDepth) maxDepth = depth; if (k instanceof PDF.PDFNumber) return; seen.add(k); if (k instanceof PDF.PDFArray) { for (let i = 0; i < k.size(); i++) walk(k.get(i), depth + 1); return; } if (!k.get) return; const t = String(k.get(nm('Type')) || ''); if (t && t !== '/StructElem' && t !== '/MCR' && t !== '/OBJR') nonStruct.set(t, (nonStruct.get(t) || 0) + 1); if (t === '/MCR' || t === '/OBJR') return; const kids = k.get(nm('K')); if (kids) walk(kids, depth + 1); };
    const st = rr(doc.catalog.get(nm('StructTreeRoot')));
    if (st) { walk(st.get(nm('K')), 1); console.log('struct walk: objects=' + seen.size + ' maxDepth=' + maxDepth + ' non-StructElem types=' + ([...nonStruct].map(([k, v]) => k + 'x' + v).join(',') || 'none')); }
  }
})().catch(err => { console.error('FAILED', err); process.exit(1); });
