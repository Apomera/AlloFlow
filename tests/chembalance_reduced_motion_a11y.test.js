import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'stem_lab', 'stem_tool_chembalance.js');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_chembalance.js');

describe('ChemBalance reduced-motion accessibility', () => {
  const source = fs.readFileSync(sourcePath, 'utf8');

  it('disables the bonus pulse when the user requests reduced motion', () => {
    expect(source).toContain(
      "className: 'text-[11px] font-bold text-fuchsia-600 animate-pulse motion-reduce:animate-none'",
    );
  });

  it('keeps the source and deploy copies identical', () => {
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(source);
  });
});
