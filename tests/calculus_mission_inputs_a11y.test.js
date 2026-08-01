import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_calculus.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_calculus.js');

describe('Calculus guided-mission input accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('names the inline numeric answer fields used by guided missions', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    [
      "'aria-label':'Exact integral value'",
      "'aria-label':'Riemann-sum error at n equals 4'",
      "'aria-label':'Riemann-sum error at n equals 8'",
      "'aria-label':'Predicted error at n equals 16'",
      "'aria-label':'Derivative value at x '+item[0]",
      "'aria-label':'Derivative at x equals 1 for 2x squared'",
      "'aria-label':'Triangle area in meters'",
      "'aria-label':'Definite integral value in meters'",
      "'aria-label':'Predicted distance in 5 seconds in meters'",
    ].forEach((label) => expect(source).toContain(label));
  });
});
