const fs = require('node:fs');
const file = 'doc_pipeline_source.jsx';
const current = fs.readFileSync(file,'utf8');
const nl = current.includes('\r\n') ? '\r\n' : '\n';
let src = current.replace(/\r\n/g,'\n');
function once(before,after) {
  const at=src.indexOf(before);
  if(at<0 || src.indexOf(before,at+before.length)>=0) throw new Error('Nonunique source anchor: '+before.slice(0,85));
  src=src.slice(0,at)+after+src.slice(at+before.length);
}
once("      if (typeof DOMParser !== 'undefined') {\n        const doc = new DOMParser().parseFromString(clean, 'text/html');", "      if (typeof DOMParser !== 'undefined' && /<(?:img|image|source)\\b/i.test(clean)) {\n        const doc = new DOMParser().parseFromString(clean, 'text/html');");
once("doc.querySelectorAll('img, picture source, svg image')", "doc.querySelectorAll('img, source, image')");
once(String.raw`    let strippedHtml = html.replace(/src="(data:image\/[^"]{100,})"/gi, function(m, dataUrl) {
      const key = '__IMG_DATA_' + (++_imgCounter) + '__';
      _imgDataMap[key] = dataUrl;
      return 'src="' + key + '"';
    });`, String.raw`    let strippedHtml = html.replace(/\ssrc\s*=\s*(?:"(data:image\/[^"]{100,})"|'(data:image\/[^']{100,})')/gi, function(m, dq, sq) {
      const dataUrl = dq || sq;
      const key = '__IMG_DATA_' + (++_imgCounter) + '__';
      _imgDataMap[key] = dataUrl;
      return m.replace(dataUrl, key); // preserve source quote/spacing for exact original fallback
    });`);
once('    let _humanEditsAdopted = 0;', `    let _humanEditsAdopted = 0;
    let _candidateRejectionCount = 0;
    const _candidateRejections = [];`);
once('              onPassEvidence: (meta) => { _fixPassEvidence = meta || null; },', `              onPassEvidence: (meta) => {
                _fixPassEvidence = meta || null;
                _candidateRejectionCount += Math.max(0, Number(meta && meta.candidateRejectionCount) || 0);
                const entries = meta && Array.isArray(meta.candidateRejections) ? meta.candidateRejections : [];
                for (const entry of entries.slice(0, Math.max(0, 100 - _candidateRejections.length))) {
                  _candidateRejections.push({ pass: fixPass + 1, chunkId: entry.chunkId, phase: entry.phase, reason: entry.reason });
                }
              },`);
once('throttlePaused: _throttlePaused, humanEditsAdopted: _humanEditsAdopted };', 'throttlePaused: _throttlePaused, humanEditsAdopted: _humanEditsAdopted, candidateRejectionCount: _candidateRejectionCount, candidateRejections: _candidateRejections };');
once('        humanEditsAdopted: _humanEditsAdopted,\n', `        humanEditsAdopted: _humanEditsAdopted,
        candidateRejectionCount: Number(_loopOut.candidateRejectionCount) || 0,
        candidateRejections: Array.isArray(_loopOut.candidateRejections) ? _loopOut.candidateRejections : [],
`);
if(fs.readFileSync(file,'utf8')!==current) throw new Error('Concurrent update; rerun against current bytes.');
fs.writeFileSync(file,src.replace(/\n/g,nl));
console.log('Saved bounded candidate-rejection evidence on loop and final result; protected both image quote forms.');