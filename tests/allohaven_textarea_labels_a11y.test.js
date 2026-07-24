import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'allohaven_module.js'), 'utf8');
const mirror = fs.readFileSync(path.join(root, 'desktop/web-app/public/allohaven_module.js'), 'utf8');

describe('AlloHaven textarea labels', () => {
  it('keeps source and deploy mirror byte-identical', () => {
    expect(mirror).toBe(source);
  });

  it('names the journal editor by its editing purpose', () => {
    expect(source).toContain("'aria-label': 'Edit journal entry'");
  });

  it('names the three-emoji writing response by its prompt relationship', () => {
    expect(source).toContain("'aria-label': 'Sentence using all three emoji prompts'");
  });
});
