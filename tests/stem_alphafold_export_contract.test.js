import crypto from 'node:crypto';
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const SOURCE = 'stem_lab/stem_tool_alphafold.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_alphafold.js';

describe('AlphaFold cross-scale evidence exports', () => {
  it('uses the shared artifact schema and keeps sequence data out of downloads', () => {
    const source = fs.readFileSync(SOURCE, 'utf8');
    const mirror = fs.readFileSync(MIRROR, 'utf8');
    expect(source).toContain("schemaVersion: 'cell-atlas-artifact/v1'");
    expect(source).toContain("artifactType: 'alphafold-cross-scale-evidence'");
    expect(source).toContain('function alphaFoldExportArtifact()');
    expect(source).toContain("application/json;charset=utf-8");
    expect(source).toContain('No protein sequence is included in this artifact.');
    expect(source).toContain('Download evidence record (.md)');
    expect(source).toContain('Download evidence record (.json)');
    expect(source).not.toContain('record.sequence');
    expect(crypto.createHash('sha256').update(source).digest('hex')).toBe(
      crypto.createHash('sha256').update(mirror).digest('hex'),
    );
  });
});
