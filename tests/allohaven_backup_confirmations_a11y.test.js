import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('AlloHaven backup confirmations accessibility', () => {
  const source = read('allohaven_module.js');

  it('uses the accessible dialog for FERPA-sensitive voice backups', () => {
    expect(source).toContain("title: 'Download confidential backup'");
    expect(source).toContain("confirmText: 'Download backup'");
    expect(source).toContain('FERPA-protected student data');
    expect(source).toContain('onClick: async function()');
  });

  it('uses the accessible dialog before replacing all restored state', () => {
    expect(source).toContain('reader.onload = async function(e)');
    expect(source).toContain("title: 'Restore AlloHaven backup'");
    expect(source).toContain("confirmText: 'Replace all data'");
    expect(source).toContain('This cannot be undone.');
  });

  it('contains no native confirm calls anywhere in AlloHaven', () => {
    expect(source).not.toMatch(/(?<![\w.])(?:window\.)?confirm\s*\(/);
  });

  it('keeps the deploy mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/allohaven_module.js'));
  });
});

