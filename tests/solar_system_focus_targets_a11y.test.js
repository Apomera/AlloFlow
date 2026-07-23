import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'stem_lab', 'stem_tool_solarsystem.js');
const deployPath = path.join(root, 'prismflow-deploy', 'public', 'stem_lab', 'stem_tool_solarsystem.js');
const source = fs.readFileSync(sourcePath, 'utf8');

describe('Solar System focus appearance and slider targets', () => {
  it('uses a solid visible focus indicator for custom text controls', () => {
    expect(source).toContain(
      '".orr-input:focus-visible{outline:3px solid " + accent + ";outline-offset:2px;',
    );
    expect(source).not.toContain('.orr-input:focus{outline:none');
  });

  it('provides a 24px slider target with a separate visible focus indicator', () => {
    expect(source).toContain(
      'input[type=range].orr-slider{-webkit-appearance:none;appearance:none;height:24px;',
    );
    expect(source).toContain(
      'input[type=range].orr-slider:focus-visible{outline:3px solid " + accent + ";outline-offset:3px}',
    );
    expect(source).not.toContain('orr-slider{-webkit-appearance:none;appearance:none;height:6px');
  });

  it('keeps the source and deploy copies identical', () => {
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(source);
  });
});
