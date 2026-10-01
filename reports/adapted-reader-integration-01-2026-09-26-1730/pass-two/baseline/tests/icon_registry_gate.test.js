// Icon registry gate (2026-07-02).
// CDN view modules resolve icons via _lazyIcon('Name') → window.AlloIcons[name],
// which silently renders NOTHING when the name is missing from the registry —
// that's how Bold/Italic/Highlighter (and 28 more: FileText, Info, Copy, Save,
// Wand2, …) shipped as invisible buttons. This gate makes the failure loud:
//   1. Every _lazyIcon('X') literal used by any root *_module.js must exist in
//      window.AlloIcons in AlloFlowANTI.txt.
//   2. The two registry copies in ANTI (sync block + effect backstop) must be
//      IDENTICAL sets — a name added to only one copy resurfaces the bug on
//      hot-reload boundaries.
//   3. Every registry identifier must be imported from lucide-react in ANTI —
//      an unimported identifier is a fatal ReferenceError, not a blank icon.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const anti = readFileSync(resolve(ROOT, 'AlloFlowANTI.txt'), 'utf8');

const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');

const usedIconNames = () => {
  const names = new Set();
  for (const f of readdirSync(ROOT)) {
    if (!f.endsWith('_module.js')) continue;
    const src = stripComments(readFileSync(resolve(ROOT, f), 'utf8'));
    for (const m of src.matchAll(/_lazyIcon\('([A-Za-z0-9]+)'\)/g)) names.add(m[1]);
  }
  return names;
};

const registryCopies = () => {
  const copies = [];
  for (const m of anti.matchAll(/window\.AlloIcons = \{([\s\S]*?)\};/g)) {
    copies.push(new Set([...m[1].matchAll(/[A-Za-z0-9]+/g)].map(x => x[0])));
  }
  return copies;
};

const lucideImports = () => {
  const names = new Set();
  for (const m of anti.matchAll(/import \{([\s\S]*?)\} from 'lucide-react'/g)) {
    for (const part of m[1].split(',')) {
      const p = part.trim();
      if (!p) continue;
      const alias = p.match(/^([A-Za-z0-9]+)\s+as\s+([A-Za-z0-9]+)$/);
      names.add(alias ? alias[2] : p);
    }
  }
  return names;
};

describe('window.AlloIcons registry gate', () => {
  const used = usedIconNames();
  const copies = registryCopies();
  const imports = lucideImports();

  it('found the expected structures', () => {
    expect(used.size).toBeGreaterThan(80);
    expect(copies.length).toBe(2);
    expect(imports.size).toBeGreaterThan(100);
  });

  it('every _lazyIcon name used by a module is in the registry (no invisible icons)', () => {
    const missing = [...used].filter(n => !copies[0].has(n));
    expect(missing, `missing from AlloIcons: ${missing.join(', ')}`).toEqual([]);
  });

  it('both registry copies are identical sets', () => {
    const a = [...copies[0]].sort();
    const b = [...copies[1]].sort();
    expect(a).toEqual(b);
  });

  it('every registry identifier is imported from lucide-react (no ReferenceError)', () => {
    const unimported = [...copies[0]].filter(n => !imports.has(n));
    expect(unimported, `in registry but not imported: ${unimported.join(', ')}`).toEqual([]);
  });
});
