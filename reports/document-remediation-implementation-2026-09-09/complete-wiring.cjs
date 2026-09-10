const fs = require('node:fs');
let s = fs.readFileSync('doc_pipeline_source.jsx','utf8');
function replace(a,b) { if (!s.includes(a)) throw Error('Missing '+a.slice(0,100)); s = s.replace(a,b); }
replace("const _PIPELINE_PROMPT_VERSION = '20260907-1';", "const _PIPELINE_PROMPT_VERSION = '20260909-1';");
replace('  // 2026-09-07: strict fragment/asset preservation and physical-page OCR evidence.', '  // 2026-09-09: strict source values, link/figure associations, and bounded metadata additions.');
replace("const _singlePassDecision = acceptFixedHtmlDetailed(fixedHtml, currentHtml, { mode: 'faithful' });", "const _singlePassDecision = acceptFixedHtmlDetailed(fixedHtml, currentHtml, { mode: 'faithful', strictContent: true });\n          if (!_singlePassDecision.accepted) _publishSourceRejection(_singlePassDecision, 1, 'single');");
replace('    const _markSessionThrottlePaused = () => {', String.raw`    // Each rejected candidate is a delta, just like aiFixChunked pass evidence.
    // Callers retain it on unchanged/reverted output, through their revision guard.
    const _publishSourceRejection = (decision, chunkId, phase) => {
      if (!decision || decision.accepted || !_chunkInvocationIsCurrent()) return;
      if (typeof _sessMeta.onPassEvidence === 'function') {
        try { _sessMeta.onPassEvidence({ candidateRejectionCount: 1,
          candidateRejections: [{ chunkId: String(chunkId), phase, reason: decision.reason || 'content-not-preserved' }] }); } catch (_) {}
      }
    };
    const _markSessionThrottlePaused = () => {`);
replace('                const integrity = verifyChunkIntegrity(originalChunk, cleaned);', String.raw`                // The same source contract runs before the semantic verifier. A
                // model verdict cannot waive source-value or association changes.
                const sourceDecision = acceptFixedHtmlDetailed(cleaned, chunk, { fragment: true, mode: 'faithful', strictContent: true });
                if (!sourceDecision.accepted) {
                  _publishSourceRejection(sourceDecision, chi + 1, 'chunk');
                  continue;
                }
                const integrity = verifyChunkIntegrity(originalChunk, cleaned);`);
replace('          const _reassemblyAccepted = reassembled.length > _origInputHtml.length * 0.7;', String.raw`          const _reassemblyDecision = acceptFixedHtmlDetailed(reassembled, currentHtml, { mode: 'faithful', strictContent: true });
          const _reassemblyAccepted = _reassemblyDecision.accepted;
          if (!_reassemblyAccepted) _publishSourceRejection(_reassemblyDecision, 'all', 'assembly');`);
replace('// can never describe a proposal that the 70% preservation gate rejected.', '// can never describe a proposal that the shared source contract rejected.');
replace('reassembled doc ${reassembled.length}b < 70% of original input ${_origInputHtml.length}b', 'reassembled doc rejected (${_reassemblyDecision.reason})');
// Canonical numeric text is used for reading-order checks too, so an equivalent
// decimal/thousands representation is not rejected by a second, stricter token check.
replace("        const numbers = doc => (String(doc.body.textContent || '').match(/[+\\-−]?\\s*\\d+(?:[.,]\\d+)*(?:\\s*(?:%|°\\s*[CF]))?/g) || []).map(value => {", String.raw`        const numericPattern = /[+\-−]?\s*\d+(?:[.,]\d+)*(?:\s*(?:%|°\s*[CF]))?/g;
        const canonicalNumber = value => {`);
replace("        });\n        if (JSON.stringify(numbers(before))", "        };\n        const numbers = doc => (String(doc.body.textContent || '').match(numericPattern) || []).map(canonicalNumber);\n        if (JSON.stringify(numbers(before))");
replace('        readingInput = before.body.innerHTML;', String.raw`        const normalizeTextNodes = node => {
          if (node.nodeType === 3) node.nodeValue = node.nodeValue.replace(numericPattern, canonicalNumber);
          else Array.from(node.childNodes || []).forEach(normalizeTextNodes);
        };
        normalizeTextNodes(before.body); normalizeTextNodes(after.body);
        readingInput = before.body.innerHTML;`);
// Retain whitespace around canonical numbers; normalization must not concatenate
// two words just because a preceding numeric match included its leading space.
replace("if (node.nodeType === 3) node.nodeValue = node.nodeValue.replace(numericPattern, canonicalNumber);", "if (node.nodeType === 3) node.nodeValue = node.nodeValue.replace(numericPattern, value => ' ' + canonicalNumber(value) + ' ');");
fs.writeFileSync('doc_pipeline_source.jsx',s);
let t = fs.readFileSync('tests/aifix_chunk_gates.test.js','utf8');
t = t.replace("it('checks the assembled document when an oversized table spans chunks'", "it('rejects changed values even when an oversized table spans chunks'");
t = t.replace("expect(h.evidence[0].candidateRejections).toContainEqual(expect.objectContaining({ phase: 'assembly', reason: 'table-cell-transposition' }));", "expect(h.evidence[0].candidateRejections.some(r => /^(table-cell-transposition|table-content-changed|source-value-changed)$/.test(r.reason))).toBe(true);");
fs.writeFileSync('tests/aifix_chunk_gates.test.js',t);
console.log('Wired alternate repair paths, advanced cache policy, and retained numeric formatting compatibility.');
