import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
const harnessText = fs.readFileSync('tests/aifix_chunk_gates.test.js', 'utf8');
const make = new Function('fs', 'path', harnessText.slice(harnessText.indexOf('const SRC ='), harnessText.indexOf('const DOC =')) + '\nreturn harness;')(fs, path);
const cases = JSON.parse(fs.readFileSync('tests/fixtures/remediation_table_roles.json', 'utf8'));

describe('table row and data-cell semantics survive remediation', () => {
  for (const entry of cases) it(entry.id, async () => {
    const h = make(() => entry.candidate);
    const result = h.acceptFixedHtmlDetailed(entry.candidate, entry.source, { strictContent: true, mode: 'faithful' });
    expect(result.accepted).toBe(entry.accepted);
    if (!entry.accepted) expect(result.reason).toBe('table-semantics-changed');
    expect(await h.run(entry.source)).toBe(entry.accepted ? entry.candidate : entry.source);
  });
});
