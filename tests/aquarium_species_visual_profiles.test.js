import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { parse } from 'acorn';

const source = fs.readFileSync('stem_lab/stem_tool_aquarium.js', 'utf8');
const names = ['getAquariumSpeciesVisualProfile', 'visualProfile', 'organismShape'];
const declarations = {};
let catalogSource;
function walk(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'FunctionDeclaration' && names.includes(node.id?.name)) declarations[node.id.name] = source.slice(node.start, node.end);
  if (node.type === 'VariableDeclarator' && node.id?.name === 'SPECIES_BY_TANK') catalogSource = source.slice(node.init.start, node.init.end);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') walk(value);
  }
}
walk(parse(source, { ecmaVersion: 'latest' }));
for (const name of names) if (!declarations[name]) throw new Error('Missing real source function: ' + name);
const helpers = vm.runInNewContext(names.map(name => declarations[name]).join('\n') + '\n({getAquariumSpeciesVisualProfile,organismShape})');
const catalog = vm.runInNewContext('(' + catalogSource + ')', { __alloT: (_key, fallback) => fallback });
const rows = Object.values(catalog).flat();
const residents = [...new Map(rows.map(row => [row.id, row])).values()];
const profile = helpers.getAquariumSpeciesVisualProfile;

describe('Active Aquarium species visual identity contract', () => {
  it('covers every real catalog identity with inspectable anatomy and honest size metadata', () => {
    expect(rows.length).toBeGreaterThan(residents.length); // shared entries really are exercised
    for (const resident of residents) {
      const visual = profile(resident.id);
      expect(visual, resident.id).toBeTruthy();
      expect(visual.id).toBe(resident.id);
      expect(visual.label.length).toBeGreaterThan(2);
      expect(visual.identification.length).toBeGreaterThan(20);
      expect(['swim', 'crawl', 'sessile']).toContain(visual.locomotion);
      expect(visual.shape).not.toBe('fish');
      expect(Number.isInteger(visual.color)).toBe(true);
      expect(visual.color).toBeGreaterThanOrEqual(0);
      expect(visual.color).toBeLessThanOrEqual(0xffffff);
      expect(visual.scaleNote).toMatch(/not a measured physical length/i);
      if (visual.body) expect(visual.body.every(value => Number.isFinite(value) && value > 0)).toBe(true);
    }
  });

  it('uses stable catalog IDs before misleading names, types or legacy body plans', () => {
    for (const resident of residents) {
      expect(helpers.organismShape({ id: resident.id, name: 'Sea turtle giant kelp neon fish', bodyPlan: 'chelonian', organismType: 'Reptile' })).toBe(profile(resident.id).shape);
    }
    expect(helpers.organismShape({ id: 'legacy-unknown', name: 'Neon tetra', bodyPlan: 'chelonian' })).toBe('turtle');
  });

  it('preserves all nonfish body plans and distinguishes colonies from individuals', () => {
    const expected = {
      nerite: 'snail', dwarffrog: 'frog', shrimp: 'shrimp', anemone: 'anemone', stonycoral: 'coral',
      copepods: 'copepod', pistol: 'shrimp', pederson: 'shrimp', slider: 'turtle', cleaner: 'shrimp',
      urchin: 'urchin', crab: 'hermitcrab', starfish: 'starfish', seastar: 'sunflowerstar', kelp: 'kelp'
    };
    for (const [id, shape] of Object.entries(expected)) expect(profile(id).shape, id).toBe(shape);
    expect(profile('kelp').locomotion).toBe('sessile');
    expect(profile('anemone').locomotion).toBe('sessile');
    expect(profile('stonycoral').locomotion).toBe('sessile');
    expect(profile('urchin').locomotion).toBe('crawl');
    expect(profile('crab').identification).toMatch(/shell/i);
    expect(profile('seastar').variation).toMatch(/twenty arms/i);
    expect(profile('copepods').variation).toMatch(/not a population count/i);
  });

  it('keeps recognizable tetra markings and bottom-fish structures distinct', () => {
    expect(new Set(['neon', 'cardinal', 'rummy'].map(id => profile(id).pattern)).size).toBe(3);
    expect(profile('neon').identification).toMatch(/red.*rear half/i);
    expect(profile('cardinal').identification).toMatch(/red.*lower body/i);
    expect(profile('rummy').identification).toMatch(/red head.*black-and-white tail/i);
    expect(profile('cory').identification).toMatch(/barbels/i);
    for (const id of ['oto', 'pleco']) {
      expect(profile(id).shape).not.toBe(profile('cory').shape);
      expect(profile(id).identification).toMatch(/sucker mouth/i);
    }
    expect(profile('pike').body[0] / profile('pike').body[1]).toBeGreaterThan(profile('oscar').body[0] / profile('oscar').body[1]);
    expect(profile('goldfish').tail).toBe('fork');
    expect(profile('guppy').tail).toBe('fan');
  });

  it('labels broad group names and selected domestic forms as representative', () => {
    const representativeIds = ['rummy', 'cory', 'oto', 'molly', 'platy', 'goby', 'pike', 'pleco', 'rockfish', 'nerite', 'urchin', 'starfish', 'stonycoral', 'cleaner', 'guppy', 'betta', 'angel', 'mudskip'];
    for (const id of representativeIds) expect(profile(id).variation, id).toMatch(/representative/i);
    expect(profile('guppy').variation).toMatch(/male/i);
    expect(profile('betta').variation).toMatch(/male/i);
    expect(profile('molly').variation).toMatch(/not.*sailfin male/i);
  });

  it('rejects unknown and inherited-object IDs and isolates returned body dimensions', () => {
    for (const id of [null, undefined, '', 'missing-species', '__proto__', 'constructor', 'toString']) expect(profile(id), String(id)).toBeNull();
    const first = profile('neon');
    const original = first.body[0];
    first.body[0] = 999;
    first.identification = 'mutated';
    expect(profile('neon').body[0]).toBe(original);
    expect(profile('neon').identification).not.toBe('mutated');
  });
});
