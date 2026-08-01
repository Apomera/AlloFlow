import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_allobotsage.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_allobotsage.js');

describe('AlloBot Sage inquiry form accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('provides accessible names for inquiry and run-reflection fields', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("'aria-label': t('stem.allobotsage.hypothesis_input', 'AI workload hypothesis')");
    expect(source).toContain("'aria-label': t('stem.allobotsage.explanation_input', 'AI workload explanation')");
    expect(source).toContain("'aria-label': t('stem.allobotsage.run_reflection', 'Run reflection')");
  });
});
