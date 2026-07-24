import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const host = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');

describe('host Gemini credential transport', () => {
  it('never interpolates a Gemini or Imagen API key into a Google request URL', () => {
    const googleUrlLines = host.split(/\r?\n/).filter((line) => (
      line.includes('generativelanguage.googleapis.com')
      || line.includes('imagen-4.0-generate-001:predict')
    ));
    expect(googleUrlLines.length).toBeGreaterThanOrEqual(3);
    for (const line of googleUrlLines) {
      expect(line).not.toMatch(/[?&]key=|encodeURIComponent\([^)]*(?:apiKey|Key)/i);
    }
  });

  it('uses the supported API-key header for audio, translation, and Imagen', () => {
    const headerUses = host.match(/['"]x-goog-api-key['"]/g) || [];
    expect(headerUses.length).toBeGreaterThanOrEqual(3);
    expect(host).toContain("'x-goog-api-key': effectiveApiKey");
    expect(host).toContain("'x-goog-api-key': apiKey");
    expect(host).toContain("'x-goog-api-key': effectiveImagenKey");
  });
});
