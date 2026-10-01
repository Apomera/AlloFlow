import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
const cases = JSON.parse(fs.readFileSync('tests/fixtures/remediation_form_native_contract.json', 'utf8'));
const harnessText = fs.readFileSync('tests/aifix_chunk_gates.test.js', 'utf8');
const harness = new Function('fs', 'path', harnessText.slice(harnessText.indexOf('const SRC ='), harnessText.indexOf('const DOC =')) + '\nreturn harness;')(fs, path);

describe('native form contract survives named-property shadowing and encoding changes', () => {
  it.each(cases)('$id', async entry => {
    const h = harness(() => entry.candidate);
    const decision = h.acceptFixedHtmlDetailed(entry.candidate, entry.source, { strictContent: true, mode: 'faithful' });
    expect(decision.accepted).toBe(entry.expected === 'accept');
    if (entry.expected === 'reject') expect(decision.reason).toBe('form-state-changed');
    expect(await h.run(entry.source)).toBe(entry.expected === 'accept' ? entry.candidate : entry.source);
  });
});
