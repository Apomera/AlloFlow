import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const SOURCE = 'stem_lab/stem_tool_cellatlas.js';

describe('Cell Atlas resume provenance review', () => {
  it('checks imported provenance against known HCA source records', () => {
    const source = fs.readFileSync(SOURCE, 'utf8');
    expect(source).toContain('var knownHcaIds = TISSUES.map');
    expect(source).toContain('var provenanceStatus = provenanceEntries.length');
    expect(source).toContain("next.packetImportProvenance = provenanceStatus");
    expect(source).toContain('pinned HCA source records recognized');
  });

  it('surfaces the saved route snapshot and source-review state', () => {
    const source = fs.readFileSync(SOURCE, 'utf8');
    expect(source).toContain('next.packetImportRouteSummary = savedRoute.total');
    expect(source).toContain("'Saved route: ' + packetImportRouteSummary");
    expect(source).toContain("'Source check: ' + (packetImportSourceSummary || 'not recorded')");
    expect(source).toContain('.cal-import-provenance[data-status=review]');
  });

  it('keeps the provenance review mirrored in the public bundle', () => {
    expect(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_cellatlas.js', 'utf8'))
      .toBe(fs.readFileSync(SOURCE, 'utf8'));
  });
});
