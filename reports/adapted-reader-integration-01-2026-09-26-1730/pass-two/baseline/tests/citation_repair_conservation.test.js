import fs from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

const source = fs.readFileSync('text_utility_helpers_source.jsx', 'utf8');
const start = source.indexOf('const _extractRepairCitationMarkers');
const end = source.indexOf('\nconst generateHelpfulHint', start);
const repairGeneratedText = new Function(source.slice(start, end) + '\nreturn repairGeneratedText;')();

const cite = (digit, url) => `[\u207d${digit}\u207e](${url})`;

const makeDeps = (callGemini) => ({
  callGemini,
  debugLog: vi.fn(),
  warnLog: vi.fn(),
});

describe('repairGeneratedText citation conservation', () => {
  it('keeps the original text when a repair drops a citation', async () => {
    const c1 = cite('\u00b9', 'https://example.test/a');
    const c2 = cite('\u00b2', 'https://example.test/b');
    const original = `First fact. ${c1} Second fact. ${c2}`;
    const candidate = `First fact with more detail. ${c1} Second fact without its source.`;
    const result = await repairGeneratedText(
      original,
      'too_short',
      100,
      'Grade 6',
      true,
      makeDeps(async () => candidate),
    );
    expect(result).toBe(original);
  });

  it('keeps the original text when a repair reorders citations', async () => {
    const c1 = cite('\u00b9', 'https://example.test/a');
    const c2 = cite('\u00b2', 'https://example.test/b');
    const original = `First. ${c1} Second. ${c2}`;
    const candidate = `Second rewritten. ${c2} First rewritten. ${c1}`;
    const result = await repairGeneratedText(original, 'too_short', 80, 'Grade 6', true, makeDeps(async () => candidate));
    expect(result).toBe(original);
  });

  it('accepts a repair that preserves every exact citation in order', async () => {
    const c1 = cite('\u00b9', 'https://example.test/a');
    const original = `A fact. ${c1}`;
    const candidate = `A clearer and more detailed fact. ${c1}`;
    const result = await repairGeneratedText(original, 'too_short', 80, 'Grade 6', true, makeDeps(async () => candidate));
    expect(result).toBe(candidate);
  });

  it('rejects a changed balanced-parenthesis citation URL', async () => {
    const originalCitation = cite('\u00b9', 'https://example.test/wiki/Topic_(original)');
    const changedCitation = cite('\u00b9', 'https://example.test/wiki/Topic_(changed)');
    const original = `A fact. ${originalCitation}`;
    const candidate = `A rewritten fact. ${changedCitation}`;
    const result = await repairGeneratedText(original, 'too_short', 80, 'Grade 6', true, makeDeps(async () => candidate));
    expect(result).toBe(original);
  });

  it('rejects an invented citation when the original had none', async () => {
    const original = 'A fact without a citation.';
    const candidate = `A rewritten fact. ${cite('\u00b9', 'https://invented.test/source')}`;
    const result = await repairGeneratedText(original, 'too_short', 80, 'Grade 6', true, makeDeps(async () => candidate));
    expect(result).toBe(original);
  });

  it('ignores citation-shaped examples inside fenced code', async () => {
    const original = [
      'A paragraph without a provenance marker.',
      '',
      '```md',
      cite('\u00b9', 'https://example.test/example'),
      '```',
    ].join('\n');
    const candidate = original.replace('A paragraph', 'A clearer paragraph').replace('example.test/example', 'changed.test/example');
    const result = await repairGeneratedText(original, 'too_short', 80, 'Grade 6', true, makeDeps(async () => candidate));
    expect(result).toBe(candidate);
  });
});
