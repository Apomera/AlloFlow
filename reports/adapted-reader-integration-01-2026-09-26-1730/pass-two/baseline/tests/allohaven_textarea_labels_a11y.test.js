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
    // Went through the translator on 2026-09-21: a bare literal has no key, so
    // no translator is ever shown it and it ships English in all 63 packs.
    // Assert both halves -- the key, and the English a screen reader falls back to.
    expect(source).toContain("'aria-label': __alloT('allohaven.edit_journal_entry','Edit journal entry')");
  });

  it('names the three-emoji writing response by its prompt relationship', () => {
    // Went through the translator on 2026-09-21: a bare literal has no key, so
    // no translator is ever shown it and it ships English in all 63 packs.
    // Assert both halves -- the key, and the English a screen reader falls back to.
    expect(source).toContain("'aria-label': __alloT('allohaven.sentence_using_all_three_emoji_prompts','Sentence using all three emoji prompts')");
  });
});
