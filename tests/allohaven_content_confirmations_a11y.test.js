import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('AlloHaven content-deletion confirmations accessibility', () => {
  const source = read('allohaven_module.js');

  it('routes seven destructive content actions through the accessible dialog', () => {
    const titles = [
      'Delete story', 'Remove companion', 'Delete goal', 'Clear encounter history',
      'Delete concept atlas', 'Delete realm', 'Delete journal entry',
    ];
    for (const title of titles) expect(source).toContain(`title: '${title}'`);
    expect(source.match(/await askAlloHavenConfirmation\(/g).length).toBeGreaterThanOrEqual(10);
  });

  it('removes the corresponding native confirmation calls', () => {
    const forbidden = [
      "window.confirm('Delete this story?", "window.confirm('Remove your companion?",
      "window.confirm('Delete this goal?", "window.confirm('Clear all '",
      "window.confirm('Delete this atlas?", "window.confirm('Delete this realm?",
      "window.confirm('Delete this entry?",
    ];
    for (const text of forbidden) expect(source).not.toContain(text);
  });

  it('makes every affected callback asynchronous before awaiting consent', () => {
    expect(source).toContain("async function clearAll() {\n        if (!await askAlloHavenConfirmation");
    expect(source.match(/async function confirmDelete\(\)/g)).toHaveLength(2);
    expect(source).toContain("onDelete: async function() {\n                    if (!await askAlloHavenConfirmation");
  });

  it('keeps the deploy mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/allohaven_module.js'));
  });
});

