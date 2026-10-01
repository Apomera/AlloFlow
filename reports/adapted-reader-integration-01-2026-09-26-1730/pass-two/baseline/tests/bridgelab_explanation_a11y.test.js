import { describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const files = [
  path.resolve(process.cwd(), 'stem_lab/stem_tool_bridgelab.js'),
  path.resolve(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_bridgelab.js'),
];

describe('BridgeLab explanation accessibility parity', () => {
  it('names the conditional learner explanation textarea', () => {
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      const anchor = "iq.understood && h('textarea'";
      const index = source.indexOf(anchor);
      expect(index, `${file} should contain the conditional explanation`).toBeGreaterThan(-1);
      const block = source.slice(index, index + 260);
      expect(block).toContain("'aria-label': __alloT('stem.bridgelab.explanation_input', 'Bridge design explanation')");
    }
  });

  it('keeps source and public bundles byte-identical', () => {
    const hashes = files.map((file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'));
    expect(hashes[0]).toBe(hashes[1]);
  });
});
