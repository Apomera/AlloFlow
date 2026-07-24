import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'stem_lab', 'stem_tool_geologyexplorer.js');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_geologyexplorer.js');
const source = fs.readFileSync(sourcePath, 'utf8');

describe('Geology Explorer reduced-motion accessibility', () => {
  it('disables every utility pulse when reduced motion is requested', () => {
    const pulseLines = source.split('\n').filter((line) => line.includes('animate-pulse'));

    expect(pulseLines).toHaveLength(1);
    expect(pulseLines[0]).toContain('motion-reduce:animate-none');
  });

  it('retains the existing reduced-motion gate for first-person movement', () => {
    expect(source).toContain("window.matchMedia('(prefers-reduced-motion: reduce)').matches");
    expect(source).toContain('E.setFirstPerson(fpOn, { reduced: reduced })');
  });

  it('keeps the source and deploy copies identical', () => {
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(source);
  });
});
