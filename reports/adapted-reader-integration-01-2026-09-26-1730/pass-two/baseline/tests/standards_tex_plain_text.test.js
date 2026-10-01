// 84 of the 2,345 shipped standards carry TeX, and it was reaching the screen
// raw: "3.NF.A.1 · Understand a fraction $\frac{1}{b}$ as the quantity for".
// These tests pin the mapper that fixes it, and — more importantly — pin the
// two properties that make a regex mapper safe here at all.
import { describe, expect, it, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const SNAPSHOTS = ['ccss-ela', 'ccss-math', 'ma-science-grade-5'];
const loadSnapshot = (name) => JSON.parse(read(path.join('standards_snapshots', `${name}.json`)));

let toPlainMath;
beforeAll(() => {
  const root = {};
  // eslint-disable-next-line no-new-func
  new Function('window', 'self', 'globalThis', read('standards_provider_module.js')).call(root, root, root, root);
  toPlainMath = root.AlloModules.StandardsProvider.toPlainMath;
});

describe('the assumption that makes a regex mapper safe', () => {
  it('has no standard with an odd number of "$"', () => {
    // An odd count would mean a literal dollar sign somewhere, and stripping
    // delimiters would eat it. If this ever fails, the mapper needs a real
    // parser rather than a tweak.
    const odd = [];
    for (const name of SNAPSHOTS) {
      for (const record of loadSnapshot(name).standards) {
        const body = `${record.label || ''} ${record.text || ''}`;
        if ((body.match(/\$/g) || []).length % 2 === 1) odd.push(record.code);
      }
    }
    expect(odd).toEqual([]);
  });
});

describe('mapping', () => {
  it('renders fractions as plain division', () => {
    expect(toPlainMath('$\\frac{1}{2}$')).toBe('1/2');
    expect(toPlainMath('$\\frac{a}{b}$')).toBe('a/b');
  });

  it('parenthesises a compound numerator instead of losing precedence', () => {
    expect(toPlainMath('$\\frac{a+b}{c}$')).toBe('(a+b)/c');
  });

  it('maps the operators and symbols the corpus actually uses', () => {
    expect(toPlainMath('$56 \\div 8$')).toBe('56 ÷ 8');
    expect(toPlainMath('$5 \\times 7$')).toBe('5 × 7');
    expect(toPlainMath('$\\sqrt{2}$')).toBe('√2');
    expect(toPlainMath('a $\\theta$ and a $\\Box$')).toBe('a θ and a □');
    expect(toPlainMath('$x \\neq y$')).toBe('x ≠ y');
  });

  it('leaves ordinary prose byte-identical', () => {
    let drifted = 0;
    for (const name of SNAPSHOTS) {
      for (const record of loadSnapshot(name).standards) {
        const raw = record.label || '';
        if (/[$\\]/.test(raw)) continue;
        if (toPlainMath(raw) !== raw) drifted += 1;
      }
    }
    expect(drifted).toBe(0);
  });

  it('leaves no TeX behind anywhere in the shipped corpus', () => {
    const survivors = [];
    let checked = 0;
    for (const name of SNAPSHOTS) {
      for (const record of loadSnapshot(name).standards) {
        for (const field of ['label', 'text']) {
          const raw = record[field] || '';
          if (!/[$\\]/.test(raw)) continue;
          checked += 1;
          if (/[$\\]/.test(toPlainMath(raw))) survivors.push(`${record.code}: ${toPlainMath(raw).slice(0, 70)}`);
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
    expect(survivors).toEqual([]);
  });

  it('handles empty and null without throwing', () => {
    expect(toPlainMath(null)).toBe('');
    expect(toPlainMath(undefined)).toBe('');
    expect(toPlainMath('')).toBe('');
  });
});

describe('the display path truncates AFTER mapping', () => {
  // Slicing raw TeX is what put a dangling "$\frac{1}{b}$" on screen: the cut
  // landed inside a command. Mapping first makes the slice safe.
  it('maps before slicing in the panel', () => {
    const misc = read('view_misc_panels_module.js');
    expect(misc).toContain('function plainStandardText(value, limit)');
    expect(misc).toContain('plainStandardText(candidate.label || candidate.text, 60)');
    expect(misc).not.toContain('String(candidate.label || candidate.text || "").slice(0, 60)');
  });

  it('maps before slicing in the prompt the model receives', () => {
    const sidebar = read('view_sidebar_panels_module.js');
    expect(sidebar).toContain('api.toPlainMath(rec.label || rec.text)');
    expect(sidebar).toContain('body.slice(0, 160)');
  });
});
