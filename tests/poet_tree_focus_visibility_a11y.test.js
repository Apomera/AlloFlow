import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'poet_tree_module.js'), 'utf8');
const mirror = fs.readFileSync(path.join(root, 'prismflow-deploy/public/poet_tree_module.js'), 'utf8');

describe('Poet Tree focus visibility', () => {
  it('keeps source and deploy mirror byte-identical', () => {
    expect(mirror).toBe(source);
  });

  it('provides a visible focus indicator for every common interactive control', () => {
    expect(source).toContain('.pt-tool button:focus-visible, .pt-tool input:focus-visible');
    expect(source).toContain('outline: 3px solid #0f766e !important');
    expect(source).toContain('@media (forced-colors: active)');
    expect(source).toContain('outline-color: CanvasText !important');
  });

  it('does not suppress inline outlines on focusable panels or inputs', () => {
    expect(source).not.toContain("outline: 'none'");
    expect(source.match(/role: 'tabpanel'[^\r\n]*outline/g)).toBeNull();
  });

  it('keeps erasure-word focus visible without a focus suppression rule', () => {
    expect(source).toContain('.pt-erasure-word:focus-visible { outline: 3px solid #f59e0b; outline-offset: 2px; }');
    expect(source).not.toContain(':focus:not(:focus-visible)');
  });
});
