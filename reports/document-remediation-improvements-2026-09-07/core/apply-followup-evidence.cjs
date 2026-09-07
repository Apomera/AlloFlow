const fs = require('fs');
function patchFile(file, edits) {
 const bytes = fs.readFileSync(file, 'utf8'), crlf = bytes.includes('\r\n'); let src = bytes.replace(/\r\n/g, '\n');
 for (const [before, after] of edits) { if (src.split(before).length !== 2) throw Error('Anchor not unique: ' + file + ': ' + before.slice(0,100)); src = src.replace(before, after); }
 if (fs.readFileSync(file, 'utf8') !== bytes) throw Error('Concurrent change: '+file);
 fs.writeFileSync(file, crlf ? src.replace(/\n/g, '\r\n') : src); console.log('Patched '+file);
}
patchFile('misc_handlers_source.jsx', [
 [`        let result;\n        let _roundThrottleDeferred = false;`, `        let result;
        let _roundThrottleDeferred = false;
        // Candidate rejection evidence describes attempts, including rounds whose HTML is
        // kept or later reverted. Persist it before re-verification can stop the round.
        const _roundSourceHtml = cur.accessibleHtml;
        const _captureFixPassEvidence = (meta) => {
          if (!_canPublish() || pdfHtmlRevisionRef.current !== _roundHtmlRevision) return;
          const live = pdfFixResultRef.current;
          if (!live || live.accessibleHtml !== _roundSourceHtml) return;
          const boundedCount = (value) => Number.isFinite(Number(value))
            ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(Number(value)))) : 0;
          const incoming = (meta && Array.isArray(meta.candidateRejections) ? meta.candidateRejections : [])
            .filter((entry) => entry && typeof entry === 'object').slice(0, 100);
          const addedCount = Math.max(boundedCount(meta && meta.candidateRejectionCount), incoming.length);
          if (!addedCount) return;
          const prior = (Array.isArray(live.candidateRejections) ? live.candidateRejections : [])
            .filter((entry) => entry && typeof entry === 'object').slice(0, 100);
          const records = prior.concat(incoming.map((entry) => ({ ...entry, pass: round + 1 }))).slice(0, 100)
            .map((entry) => ({
              pass: boundedCount(entry.pass),
              chunkId: String(entry.chunkId || '').slice(0, 80),
              phase: String(entry.phase || '').slice(0, 40),
              reason: String(entry.reason || '').slice(0, 120),
            }));
          cur = { ...live,
            candidateRejectionCount: Math.min(Number.MAX_SAFE_INTEGER,
              Math.max(boundedCount(live.candidateRejectionCount), prior.length) + addedCount),
            candidateRejections: records,
          };
          // The host setter synchronously updates the ref and preserves same-HTML proof.
          setPdfFixResult(cur);
        };`],
 [`            owner: _loopOwner, // M20: heartbeats carry this loop's identity\n            onThrottleDeferred: () => { _roundThrottleDeferred = true; },`, `            owner: _loopOwner, // M20: heartbeats carry this loop's identity
            onPassEvidence: _captureFixPassEvidence,
            onThrottleDeferred: () => { _roundThrottleDeferred = true; },`],
 [`            owner: _loopOwner,\n            onThrottleDeferred: () => { _roundThrottleDeferred = true; },`, `            owner: _loopOwner,
            onPassEvidence: _captureFixPassEvidence,
            onThrottleDeferred: () => { _roundThrottleDeferred = true; },`],
]);
patchFile('doc_pipeline_source.jsx', [[`                owner: _sessMeta.owner || null,\n                onThrottleDeferred: _markSessionThrottlePaused,`, `                owner: _sessMeta.owner || null,
                onPassEvidence: _sessMeta.onPassEvidence,
                onThrottleDeferred: _markSessionThrottlePaused,`]]);
