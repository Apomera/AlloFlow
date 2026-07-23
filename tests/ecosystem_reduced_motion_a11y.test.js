import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'stem_lab', 'stem_tool_ecosystem.js');
const deployPath = path.join(root, 'prismflow-deploy', 'public', 'stem_lab', 'stem_tool_ecosystem.js');
const source = fs.readFileSync(sourcePath, 'utf8');

describe('Ecosystem Lab reduced-motion accessibility', () => {
  it('disables every utility pulse when reduced motion is requested', () => {
    const pulseLines = source.split('\n').filter((line) => line.includes('animate-pulse'));

    expect(pulseLines).toHaveLength(2);
    for (const line of pulseLines) {
      expect(line).toContain('motion-reduce:animate-none');
    }
  });

  it('retains the shared reduced-motion stylesheet', () => {
    expect(source).toContain('@media (prefers-reduced-motion: reduce)');
    expect(source).toContain('animation-duration: 0.01ms !important');
    expect(source).toContain('transition-duration: 0.01ms !important');
  });

  it('keeps the source and deploy copies identical', () => {
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(source);
  });
});
