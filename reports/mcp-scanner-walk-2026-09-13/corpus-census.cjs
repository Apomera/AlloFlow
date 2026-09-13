// Before/after Document Safety census over the MCP testing corpus.
// "before" = the scanner extracted from git HEAD's doc_pipeline_source.jsx;
// "after"  = the scanner extracted from the working tree. Both run on the same
// parsed pdf-lib document, and the object table is snapshotted around each
// scan to prove neither scanner mutates the PDF.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = process.cwd();
const PDF = require(path.join(root, 'desktop/mcp/vendor/pdf-lib.min.js'));
const outFile = process.argv[2];
function extract(text) {
  const b = text.indexOf('function _alloScanActiveContent(pdfDoc, PDFLibNS)');
  const e = text.indexOf('// ── S7', b);
  if (b < 0 || e < 0) throw new Error('scanner not found');
  return new Function(text.slice(b, e) + '\nreturn _alloScanActiveContent;')();
}
const headSource = execFileSync('git', ['show', 'HEAD:doc_pipeline_source.jsx'], { cwd: root, maxBuffer: 64 * 1024 * 1024 }).toString('utf8');
const workSource = fs.readFileSync(path.join(root, 'doc_pipeline_source.jsx'), 'utf8');
const before = extract(headSource), after = extract(workSource);
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const manifest = require(path.join(root, 'mcp-testing/corpus/MANIFEST.json'));
const snapshot = (doc) => { let h = crypto.createHash('sha256'); for (const [ref, obj] of doc.context.enumerateIndirectObjects()) h.update(ref.toString()).update(obj.toString()); return h.digest('hex'); };
(async () => {
  const rows = [];
  for (const d of manifest.documents) {
    const rel = 'mcp-testing/corpus/' + (d.file || d.path || d.id);
    const p = path.join(root, rel);
    if (!fs.existsSync(p)) { rows.push({ file: rel, error: 'missing' }); continue; }
    const bytes = fs.readFileSync(p);
    const row = { file: rel, bytes: bytes.length, sha256: sha(bytes) };
    const t0 = Date.now();
    try {
      const doc = await PDF.PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
      const s0 = snapshot(doc);
      row.before = before(doc, PDF);
      row.after = after(doc, PDF);
      row.mutated = snapshot(doc) !== s0;
      row.ms = Date.now() - t0;
      row.deliverableBefore = !!(row.before && row.before.complete && !row.before.any);
      row.deliverableAfter = !!(row.after && row.after.complete && !row.after.any);
    } catch (e) { row.error = String(e && e.message || e).slice(0, 200); row.ms = Date.now() - t0; }
    rows.push(row);
    console.log(rel.padEnd(62), row.error ? 'ERROR ' + row.error : ('before: complete=' + row.before.complete + ' any=' + row.before.any + ' unex=' + row.before.unexaminedStructures + '  after: complete=' + row.after.complete + ' any=' + row.after.any + ' unex=' + row.after.unexaminedStructures + ' findings=' + row.after.findings.map(f => f.type + 'x' + f.count).join(',') + '  mutated=' + row.mutated + ' ' + row.ms + 'ms'));
  }
  const ok = rows.filter(r => !r.error);
  const summary = { generatedAt: new Date().toISOString(), headCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root }).toString().trim(), workingSourceSha256: sha(Buffer.from(workSource, 'utf8')), documents: rows.length, scanned: ok.length, deliverableBefore: ok.filter(r => r.deliverableBefore).length, deliverableAfter: ok.filter(r => r.deliverableAfter).length, mutatedAny: ok.some(r => r.mutated), rows };
  console.log('\nSUMMARY scanned=' + summary.scanned + '/' + summary.documents + ' deliverable(complete && !any): before=' + summary.deliverableBefore + ' after=' + summary.deliverableAfter + ' mutatedAny=' + summary.mutatedAny);
  if (outFile) fs.writeFileSync(outFile, JSON.stringify(summary, null, 2) + '\n');
})().catch(e => { console.error('CENSUS FAILED', e); process.exit(1); });
