import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

let P;
const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'stem_lab', 'stem_tool_geologyexplorer.js');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_geologyexplorer.js');

beforeAll(() => {
  window.StemLab = { registerTool() {}, isRegistered() { return false; } };
  delete window.__alloGeologyPure;
  // eslint-disable-next-line no-new-func
  new Function(fs.readFileSync(sourcePath, 'utf8'))();
  P = window.__alloGeologyPure;
  if (!P) throw new Error('geology pure hook not exposed');
});

beforeEach(() => {
  P.setScene('crust');
  P.setGrid('standard');
});

describe('Geology Explorer Evidence Map', () => {
  it('defines the three reasoning roles used by the Assess workflow', () => {
    expect(P.evidenceMapRoles().map((role) => role.id)).toEqual(['observation', 'process', 'outcome']);
  });

  it('reports mapped, unassigned, and missing reasoning roles', () => {
    const evidence = [
      { id: 'one', label: 'Layer one' },
      { id: 'two', label: 'Process two' },
      { id: 'three', label: 'Result three' },
      { id: 'four', label: 'Extra detail' }
    ];
    const partial = P.evidenceMapStatus(evidence, {
      one: 'observation',
      two: 'process',
      stale: 'outcome',
      four: 'invalid'
    });
    expect(partial.assigned).toBe(2);
    expect(partial.mappedRoleCount).toBe(2);
    expect(partial.unassigned).toBe(2);
    expect(partial.missingRoles).toEqual(['outcome']);
    expect(partial.ready).toBe(false);

    const complete = P.evidenceMapStatus(evidence, {
      one: 'observation',
      two: 'process',
      three: 'outcome'
    });
    expect(complete.counts).toEqual({ observation: 1, process: 1, outcome: 1 });
    expect(complete.assigned).toBe(3);
    expect(complete.mappedRoleCount).toBe(3);
    expect(complete.unassigned).toBe(1);
    expect(complete.missingRoles).toEqual([]);
    expect(complete.ready).toBe(true);

    const repeated = P.evidenceMapStatus(evidence, { one: 'observation', two: 'observation', three: 'observation' });
    expect(repeated.assigned).toBe(3);
    expect(repeated.mappedRoleCount).toBe(1);
    expect(repeated.ready).toBe(false);
  });

  it('scopes saved role assignments to the active scene', () => {
    const map = {
      crust: { 'crust:observation:soil': 'observation' },
      geode: { 'geode:observation:agate': 'observation' }
    };
    expect(P.evidenceMapForScene(map, 'crust')).toEqual(map.crust);
    expect(P.evidenceMapForScene(map, 'deepEarth')).toEqual({});
    expect(P.evidenceMapForScene(null, 'crust')).toEqual({});
  });

  it('keeps both app mirrors identical', () => {
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });
});
