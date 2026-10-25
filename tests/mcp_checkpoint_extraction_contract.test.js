import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const servers = ['desktop/mcp/alloflow-remediation-mcp-stdio.cjs', 'services/alloflow-remote-mcp/runner/server.cjs'];
function extractionValidator(file) {
  const source = readFileSync(file, 'utf8');
  const functions = ['isPlainObject', 'hasExactKeys', 'checkpointExtraction'].map(name => {
    const match = source.match(new RegExp('(?:^|\\n)function ' + name + '\\([^]*?\\n\\}'));
    if (!match) throw new Error('Missing checkpoint boundary: ' + name);
    return match[0];
  });
  return runInNewContext(functions.join('\n') + '\ncheckpointExtraction', { Object, Array });
}
function fixture(extra = {}) {
  return { fileName: 'input.pdf', documentDigest: 'sha256:' + 'a'.repeat(64), text: 'Readable extracted text',
    groundTruthCharCount: 23, groundTruthMethod: null, groundTruthPages: null, ocrMethod: null,
    ocrTesseractText: '', ocrVisionText: '', ocrDisagreements: [], ocrPageErrors: [], ocrLowConfidencePages: [],
    detectedFolios: [], ocrDupeCollapses: [], ocrColumnReorders: [], strippedEdgeLines: [], visionStripTrail: [], ...extra };
}

describe.each(servers)('%s extraction checkpoint boundary', file => {
  const validate = extractionValidator(file);
  it('accepts legacy snapshots and preserves current OCR alignment evidence', () => {
    const legacy = fixture();
    const current = fixture({ ocrVisionAlignments: [{ page: 1, alignedWords: 3 }] });
    expect(validate(legacy)).toBe(legacy);
    expect(validate(current)).toBe(current);
    expect(validate(current).ocrVisionAlignments).toEqual(current.ocrVisionAlignments);
  });
  it('continues rejecting unknown fields and malformed alignment collections', () => {
    expect(validate(fixture({ unexpected: [] }))).toBeNull();
    for (const malformed of [null, undefined, {}, 'aligned', 1]) {
      expect(validate(fixture({ ocrVisionAlignments: malformed }))).toBeNull();
    }
  });
});

it('restores alignment evidence into the real driver resume seed, with a legacy empty default', () => {
  const driver = readFileSync('desktop/mcp/remediation_headless_driver.cjs', 'utf8');
  const seed = driver.match(/window\.__resumeExtractedText = (\{[^]*?\n\s*\});/);
  expect(seed).not.toBeNull();
  const restore = extraction => runInNewContext('(' + seed[1] + ')', { extraction, Array });
  const current = fixture({ ocrVisionAlignments: [{ page: 1, alignedWords: 3 }] });
  expect(restore(current).ocrVisionAlignments).toEqual(current.ocrVisionAlignments);
  expect(restore(fixture()).ocrVisionAlignments).toEqual([]);
});
