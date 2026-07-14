import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('immersive_reader_source.jsx', 'utf8');
const builder = fs.readFileSync('_build_immersive_reader_module.js', 'utf8');

describe('immersive reader WCAG 2.5.8 target sizes', () => {
  it('uses 24 pixel focus-color buttons', () => {
    expect(source).toContain('className={`w-6 h-6 rounded-full border-2');
  });

  it('uses 24 pixel native background and text color inputs', () => {
    expect(source.match(/className="w-6 h-6 rounded-full border border-slate-400/g)?.length).toBe(2);
    expect(source).not.toContain('w-5 h-5');
  });

  it('identifies the generated accessibility CSS with the current target', () => {
    expect(builder).toContain('// WCAG 2.2 AA: Accessibility CSS');
  });
});
