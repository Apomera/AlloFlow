import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const host = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');

describe('host Gemini credential transport', () => {
  it('never interpolates a Gemini image API key into a Google request URL', () => {
    const googleUrlLines = host.split(/\r?\n/).filter((line) => (
      line.includes('generativelanguage.googleapis.com')

    ));
    expect(googleUrlLines.length).toBeGreaterThanOrEqual(2);
    for (const line of googleUrlLines) {
      expect(line).not.toMatch(/[?&]key=|encodeURIComponent\([^)]*(?:apiKey|Key)/i);
    }
  });

  it('uses the supported API-key header for audio, translation, and Gemini image generation', () => {
    const headerUses = host.match(/['"]x-goog-api-key['"]/g) || [];
    expect(headerUses.length).toBeGreaterThanOrEqual(2);
    expect(host).toContain("'x-goog-api-key': effectiveApiKey");
    expect(host).toContain("'x-goog-api-key': apiKey");
    const geminiApi = readFileSync(resolve(process.cwd(), 'gemini_api_module.js'), 'utf8');
    expect(geminiApi).toContain("headers['x-goog-api-key'] = _k");
  });
});
