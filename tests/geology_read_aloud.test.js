import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

let source;
const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'stem_lab', 'stem_tool_geologyexplorer.js');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_geologyexplorer.js');

beforeAll(() => {
  source = fs.readFileSync(sourcePath, 'utf8');
});

describe('Geology Explorer read-aloud controls', () => {
  it('exposes accessible controls for mission, orientation, and remediation text', () => {
    expect(source).toContain("data-geology-read-aloud");
    expect(source).toContain("Read mission aloud");
    expect(source).toContain("Read scene guidance aloud");
    expect(source).toContain("Read targeted feedback aloud");
    expect(source).toContain("Read aloud is not available in this browser.");
  });

  it('keeps both app mirrors identical', () => {
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(source);
  });
});
