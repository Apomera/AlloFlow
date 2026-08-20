import fs from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

const readJson = (path) => JSON.parse(fs.readFileSync(resolve(process.cwd(), path), 'utf8'));
const rawPack = readJson('test_prep/ap_psychology_pilot.json');
const learningLibrary = readJson('test_prep/ap_psychology_pilot_learning_library.json');
let Hub, pack;

beforeAll(() => {
  window.React = window.React || {
    useState: (value) => [typeof value === 'function' ? value() : value, () => {}],
    useEffect: () => {},
    useRef: () => ({ current: null }),
    createElement: () => null,
    Fragment: 'fragment',
  };
  loadAlloModule('test_prep_hub_module.js');
  Hub = window.AlloModules.TestPrepHub;
  pack = Hub.normalizePack(rawPack);
});

describe('AP Psychology practiceId skill targeting', () => {
  it('preserves raw practiceId metadata while exposing an explicit normalized practice skill tag', () => {
    const rawP1 = rawPack.items.find((item) => item.practiceId === 'P1');
    const normalizedP1 = pack.items.find((item) => item.id === rawP1.id);

    expect(rawP1.practiceId).toBe('P1');
    expect(normalizedP1.practiceId).toBe('P1');
    expect(normalizedP1.skillIds).toEqual(['p1']);
    expect(Hub.itemSkillIds(normalizedP1)).toEqual(['p1']);
  });

  it('finds the exact P1 set and reports it in skill analytics before loading the full learning library', () => {
    const p1Items = pack.items.filter((item) => Hub.itemSkillIds(item).includes('p1'));
    const rawP1Ids = rawPack.items.filter((item) => item.practiceId === 'P1').map((item) => item.id);

    expect(p1Items.map((item) => item.id)).toEqual(rawP1Ids);
    expect(p1Items).toHaveLength(325);
    const score = Hub.scoreAttempt(pack, {});
    expect(score.bySkill.p1).toMatchObject({ correct: 0, total: 325 });
    const diagnostic = Hub.buildBatchDiagnostic(pack, {}, {}, 1);
    expect(diagnostic.skillRows.find((row) => row.id === 'p1')).toMatchObject({ correct: 0, total: 13 });
  });

  it('uses lightweight humanized labels first and upgrades them from reviewed library metadata', () => {
    const fallback = Hub.packSkillCatalog(pack, null);
    const reviewed = Hub.packSkillCatalog(pack, learningLibrary);

    expect(fallback.find((skill) => skill.id === 'p1')).toMatchObject({
      label: 'P1',
      domain: 'Across domains',
    });
    expect(reviewed.find((skill) => skill.id === 'p1')).toMatchObject({
      label: 'Concept Understanding',
      domain: 'Across domains',
    });
    expect(reviewed.find((skill) => skill.id === 'p4')).toMatchObject({
      label: 'Argumentation',
    });
  });
});
