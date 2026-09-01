import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('view_gemini_bridge_source.jsx', 'utf8');

describe('Family Bridge responsive accessibility', () => {
  it('stacks selectors and status summaries before their content can widen a narrow dialog', () => {
    expect((source.match(/gridTemplateColumns:'repeat\(auto-fit, minmax\(160px, 1fr\)\)'/g) || [])).toHaveLength(3);
    expect(source).toContain("gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))'");
    expect(source).not.toContain("gridTemplateColumns:'repeat(3, 1fr)'");
    expect(source).not.toContain("gridTemplateColumns:'1fr 1fr'");
    expect((source.match(/width:'100%',minWidth:0,maxWidth:'100%'/g) || [])).toHaveLength(5);
    expect((source.match(/style=\{\{flex:1,minWidth:0,/g) || [])).toHaveLength(2);
  });

  it('keeps the generated root and public modules identical', () => {
    expect(readFileSync('desktop/web-app/public/view_gemini_bridge_module.js', 'utf8'))
      .toBe(readFileSync('view_gemini_bridge_module.js', 'utf8'));
  });
});
