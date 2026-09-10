const fs=require('node:fs');
let s=fs.readFileSync('doc_pipeline_source.jsx','utf8');
function edit(a,b){if(!s.includes(a))throw Error('Missing '+a.slice(0,100));s=s.replace(a,b);}
edit("    // Each rejected candidate is a delta, just like aiFixChunked pass evidence.", "    let _sourceRejectionCount = 0;\n    const _sourceRejections = [];\n    // Each rejected candidate is a delta, just like aiFixChunked pass evidence.");
edit("      if (!decision || decision.accepted || !_chunkInvocationIsCurrent()) return;", "      if (!decision || decision.accepted || !_chunkInvocationIsCurrent()) return;\n      _sourceRejectionCount++;\n      if (_sourceRejections.length < 100) _sourceRejections.push({ chunkId: String(chunkId), phase, reason: decision.reason || 'content-not-preserved' });");
edit("        stale: !_chunkResultIsCurrent,", "        candidateRejectionCount: _chunkResultIsCurrent ? _sourceRejectionCount : 0,\n        candidateRejections: _chunkResultIsCurrent ? _sourceRejections : [],\n        stale: !_chunkResultIsCurrent,");
edit("    // ── AI fix with retry ──\n    let accepted = null;", "    // ── AI fix with retry ──\n    let accepted = null;\n    const _refixSourceRejections = [];");
edit("        // Integrity check against original\n        const integrity = verifyChunkIntegrity(originalChunk, cleaned);", `        // A section re-fix cannot weaken the full-document source contract.
        const sourceDecision = acceptFixedHtmlDetailed(cleaned, chunk, { fragment: true, mode: 'faithful', strictContent: true });
        if (!sourceDecision.accepted) {
          const record = { chunkId: String(chunkIndex + 1), phase: 'chunk', reason: sourceDecision.reason };
          _refixSourceRejections.push(record);
          try { if (typeof options.onPassEvidence === 'function') options.onPassEvidence({ candidateRejectionCount: 1, candidateRejections: [record] }); } catch (_) {}
          continue;
        }
        // Integrity check against original
        const integrity = verifyChunkIntegrity(originalChunk, cleaned);`);
edit("      chunkIndex,\n      chunkResult: accepted,", "      chunkIndex,\n      candidateRejectionCount: _refixSourceRejections.length,\n      candidateRejections: _refixSourceRejections,\n      chunkResult: accepted,");
fs.writeFileSync('doc_pipeline_source.jsx',s);
let view=fs.readFileSync('view_pdf_audit_source.jsx','utf8');
const anchor='        onProgress: (message) => _setRemediationOperationStep(operationTicket, message),';
if(!view.includes(anchor))throw Error('Missing refix view anchor');
view=view.replace(anchor,anchor+`
        onPassEvidence: delta => {
          if (!_remediationOperationIsCurrent(operationTicket)) return;
          const review = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.RemediationReview;
          if (review) _commitAsyncHtmlIfCurrent(operationTicket.htmlToken, prev => ({ ...prev, ...review.mergeEvidence(prev, delta) }));
        },`);
fs.writeFileSync('view_pdf_audit_source.jsx',view);
console.log('Section refix now preserves source facts and retains evidence even if later auditing fails.');
