import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const file = process.env.SCALE_DNA_SOURCE || 'stem_lab/stem_tool_scaleexplorer.js';
const source = fs.readFileSync(file, 'utf8');
const sandbox = { window: { StemLab: { registerTool() {} } }, console: { log() {} } };
vm.runInNewContext(source.replace("  window.StemLab.registerTool('scaleExplorer', {", "  window.dnaChecks = { data: DNA_STRUCTURE, number: dnaPairNumber, detail: dnaDetailPair, view: dnaPairView, details: atlasDetails, observations: readObservations, drafts: readObservationDrafts, items: ITEMS };\n  window.StemLab.registerTool('scaleExplorer', {"), sandbox);
const dna = sandbox.window.dnaChecks;
const data = dna.data;
const plain = v => JSON.parse(JSON.stringify(v));
const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
const details = id => dna.details(id, (key, fallback) => fallback);

describe('Scale Explorer experimental DNA atlas', () => {
  it('keeps the recorded heavy atoms, residue sequence, and structure provenance offline', () => {
    expect(data.id).toBe('1BNA');
    expect(data.atoms).toHaveLength(486);
    expect(data.bonds).toHaveLength(544);
    expect(data.hydrogenBonds).toHaveLength(32);
    expect(data.residues).toHaveLength(24);
    expect(data.pairs).toHaveLength(12);
    expect(data.sequence).toBe('CGCGAATTCGCG');
    expect(data.residues.filter(r => r.chain === 'A').map(r => r.base).join('')).toBe(data.sequence);
    expect(data.residues.filter(r => r.chain === 'B').map(r => r.base).join('')).toBe(data.sequence);
    expect(data.provenance.structureUrl).toBe('https://www.rcsb.org/structure/1BNA');
    expect(data.provenance.pdbSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(data.provenance.resolutionAngstrom).toBe(1.9);
    expect(data.provenance.excluded).toContain('waters');
  });

  it('has finite coordinates, complete atom ownership, and explicit display radii', () => {
    const owned = [];
    data.residues.forEach((r, residue) => {
      r.atoms.forEach(i => {
        owned.push(i);
        const atom = data.atoms[i];
        expect(atom[2]).toBe(residue);
        expect(r.atomNames[atom[0]]).toBe(i);
      });
    });
    expect(owned.sort((a, b) => a - b)).toEqual(Array.from({ length: 486 }, (_, i) => i));
    data.atoms.forEach(atom => {
      expect(['C', 'N', 'O', 'P']).toContain(atom[1]);
      expect(atom.slice(3).every(Number.isFinite)).toBe(true);
      expect(data.displayRadii[atom[1]]).toBeGreaterThan(0);
    });
  });

  it('normalizes transverse atom bounds to one while keeping the atlas reference at 2.4 nm', () => {
    const low = Math.min(...data.atoms.map(a => a[3] - data.displayRadii[a[1]]));
    const high = Math.max(...data.atoms.map(a => a[3] + data.displayRadii[a[1]]));
    expect(low).toBeCloseTo(-.5, 5);
    expect(high).toBeCloseTo(.5, 5);
    expect(high - low).toBeCloseTo(1, 5);
    expect(data.transform.angstromToModel * data.transform.rawDisplayedWidthAngstrom).toBeCloseTo(1, 4);
    expect(dna.items.find(i => i.id === 'dna').size).toBe(2.4e-9);
  });

  it('keeps unique short covalent links within residues or adjacent same-chain phosphates', () => {
    const seen = new Set();
    data.bonds.forEach(([a, b]) => {
      expect(a).toBeGreaterThanOrEqual(0); expect(b).toBeLessThan(data.atoms.length); expect(a).toBeLessThan(b);
      const key = a + ':' + b; expect(seen.has(key)).toBe(false); seen.add(key);
      const one = data.atoms[a], two = data.atoms[b];
      const length = distance(one.slice(3), two.slice(3)) / data.transform.angstromToModel;
      expect(length).toBeGreaterThan(.8);
      expect(length).toBeLessThanOrEqual(one[1] === 'P' || two[1] === 'P' ? 2.101 : 1.901);
      if (one[2] !== two[2]) {
        const r1 = data.residues[one[2]], r2 = data.residues[two[2]];
        expect(r1.chain).toBe(r2.chain); expect(Math.abs(r1.number - r2.number)).toBe(1);
        expect([one[0], two[0]].sort()).toEqual(["O3'", 'P']);
      }
    });
  });

  it('pairs complementary antiparallel residues and labels hydrogen contacts as illustrative', () => {
    data.pairs.forEach((pair, i) => {
      expect(pair.a).toBe(i); expect(pair.b).toBe(23 - i);
      const a = data.residues[pair.a], b = data.residues[pair.b];
      expect(['AT', 'TA', 'CG', 'GC']).toContain(a.base + b.base);
      expect(pair.hydrogenBonds).toHaveLength(a.base === 'C' || a.base === 'G' ? 3 : 2);
      pair.hydrogenBonds.forEach(index => {
        const bond = data.hydrogenBonds[index];
        expect(bond.pair).toBe(i); expect(bond.illustrative).toBe(true);
        expect([pair.a, pair.b]).toContain(data.atoms[bond.a][2]);
        expect([pair.a, pair.b]).toContain(data.atoms[bond.b][2]);
        expect(data.atoms[bond.a][2]).not.toBe(data.atoms[bond.b][2]);
        expect(distance(data.atoms[bond.a].slice(3), data.atoms[bond.b].slice(3)) / data.transform.angstromToModel).toBeCloseTo(bond.distanceAngstrom, 3);
      });
    });
  });

  it('follows distinct backbone chains and gives each route stop finite normalized view vectors', () => {
    expect(data.backbones.map(b => b.chain)).toEqual(['A', 'B']);
    data.backbones.forEach(backbone => {
      expect(new Set(backbone.atomIndices).size).toBe(backbone.atomIndices.length);
      backbone.atomIndices.forEach(i => expect(data.residues[data.atoms[i][2]].chain).toBe(backbone.chain));
    });
    data.pairs.forEach(p => {
      expect(p.center.every(Number.isFinite)).toBe(true);
      expect(Math.hypot(...p.viewVector)).toBeCloseTo(1, 5);
      expect(Math.hypot(...p.sideViewVector)).toBeCloseTo(1, 5);
    });
    expect(data.pairs[11].center[1]).toBeGreaterThan(data.pairs[0].center[1]);
  });

  it('strictly bounds numeric pair choices and rejects malformed detail IDs', () => {
    expect([0, 1, 5.49, 5.5, 12, 100].map(dna.number)).toEqual([1, 1, 5, 6, 12, 12]);
    expect([undefined, null, '7', {}, NaN, Infinity, -Infinity].map(dna.number)).toEqual([6, 6, 6, 6, 6, 6, 6]);
    expect(Array.from({ length: 12 }, (_, i) => dna.detail('base-pair-' + String(i + 1).padStart(2, '0')))).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
    expect(['base-pair-00', 'base-pair-13', 'base-pair-1', 'base-pair-01x', ' base-pair-01', 'BASE-pair-01', 7, null].map(dna.detail)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('returns detached route views without allowing callers to mutate molecular data', () => {
    const pair = dna.view(7), original = plain(dna.view(7));
    expect(pair).toMatchObject({ n: 7, id: 'base-pair-07', a: 'T', b: 'A' });
    expect(pair.at).toEqual(data.pairs[6].center);
    expect(pair.view.every(Number.isFinite)).toBe(true);
    expect(Math.hypot(...pair.view)).toBeCloseTo(1, 5);
    pair.at[0] = 99; pair.view[0] = 99; pair.a = 'G';
    expect(plain(dna.view(7))).toEqual(original);
    expect(dna.view(Infinity).n).toBe(6);
  });

  it('preserves legacy landmarks and adds twelve individually addressable route stops', () => {
    const all = details('dna');
    expect(all.slice(0, 2).map(d => d.id)).toEqual(['backbone', 'bases']);
    const stops = all.filter(d => d.dnaPair);
    expect(stops).toHaveLength(12);
    stops.forEach((d, i) => {
      expect(d.id).toBe('base-pair-' + String(i + 1).padStart(2, '0'));
      expect(d.marker).toBe(false); expect(d.at).toEqual(data.pairs[i].center);
      expect(d.source).toBe(data.provenance.structureUrl); expect(d.zoom).toBeGreaterThan(1);
    });
    expect(details('ecoli').find(d => d.id === 'nucleoid').visit).toBe('dna');
  });

  it('restores exact paired-base notes using the existing detail ID schema', () => {
    const raw = [{ itemId: 'dna', detailId: 'base-pair-01', zoom: 2.2, note: 'C pairs with G.' },
      { itemId: 'dna', detailId: 'base-pair-12', yaw: -.3, pitch: .4 },
      { itemId: 'dna', detailId: 'base-pair-13' }, { itemId: 'dna', detailId: 'base-pair-1' },
      { itemId: 'dna', detailId: 'bases', note: 'Older notes remain valid.' }];
    const notes = plain(dna.observations(raw));
    expect(notes.map(n => n.detailId)).toEqual(['base-pair-01', 'base-pair-12', 'bases']);
    expect(notes[0]).toMatchObject({ size: 2.4e-9, zoom: 2.2, note: 'C pairs with G.' });
    expect(notes[1].yaw).toBeCloseTo(-.3, 12);
    expect(notes[1].pitch).toBe(.4);
    expect(notes[0].dnaPair).toBeUndefined();
    expect(plain(dna.drafts({ 'dna:base-pair-07': 'Selected T–A.', 'dna:base-pair-13': 'Invalid', 'dna:backbone': 'Legacy.' }))).toEqual({ 'dna:base-pair-07': 'Selected T–A.', 'dna:backbone': 'Legacy.' });
  });

  it('retains a deep molecular magnification without widening other objects’ limits', () => {
    const notes = dna.observations([{ itemId: 'dna', detailId: 'base-pair-07', zoom: 4 },
      { itemId: 'dna', detailId: 'base-pair-08', zoom: 999 }, { itemId: 'earth', zoom: 4 }]);
    expect(notes[0].zoom).toBe(4);
    expect(notes[1].zoom).toBeGreaterThanOrEqual(4); expect(notes[1].zoom).toBeLessThanOrEqual(8);
    expect(notes[2].zoom).toBe(2.5);
  });
});
