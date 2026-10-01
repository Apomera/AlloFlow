import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let model, observation;
beforeEach(() => { resetStemLab(); localStorage.clear(); loadTool('stem_lab/stem_tool_evolab.js', 'evoLab'); model = window.StemLab.evoIslandModel; observation = window.StemLab.evoIslandObservation; });
function expedition() {
  let world = { ...model.create(2026), living: false };
  world = model.step(model.step(world));
  world = model.step(model.step({ ...world, habitat: 'snow' }));
  world = model.step({ ...world, selection: false });
  world = model.step(model.step({ ...world, habitat: 'drought' }));
  return { ...world, habitat: 'forest', selection: true };
}

describe('recorded habitat chapters', () => {
  it('groups consecutive rounds by their recorded habitat and selection, excluding queued future settings', () => {
    const world = expedition(), trail = observation.habitatTrail(world);
    expect(trail.seed).toBe(world.seed);
    expect(trail.chapters.map(c => [c.start, c.end, c.habitat, c.selection])).toEqual([[1, 2, 'meadow', true], [3, 4, 'snow', true], [5, 5, 'snow', false], [6, 7, 'drought', false]]);
    expect(trail.chapters.some(c => c.habitat === 'forest')).toBe(false);
    expect(trail.chapters.flatMap(c => c.rounds.map(r => r.generation))).toEqual([1, 2, 3, 4, 5, 6, 7]);
    for (const chapter of trail.chapters) {
      expect(chapter.before.generation).toBe(chapter.start - 1); expect(chapter.after.generation).toBe(chapter.end);
      chapter.rounds.forEach(row => expect(row).toEqual({ generation: row.generation, parents: world.history[row.generation - 1].population.length, survivors: world.history[row.generation].survivors.length, offspring: world.history[row.generation].population.length }));
    }
  });

  it('reads actual inherited traits at both boundaries without changing genes, chronology or future replay', () => {
    const world = expedition(); world.history[2].stats.means.fur = .99999;
    const original = JSON.stringify(world), next = model.step(world), trail = observation.habitatTrail(world);
    for (const chapter of trail.chapters) for (const row of [chapter.before, chapter.after]) {
      const residents = world.history[row.generation].population;
      expect(row.population).toBe(residents.length);
      for (const trait of model.traits) expect(row.means[trait]).toBe(residents.length ? residents.reduce((sum, o) => sum + model.value(o, trait), 0) / residents.length : null);
    }
    expect(trail.chapters[0].after.means.fur).not.toBe(.99999);
    expect(JSON.stringify(world)).toBe(original); expect(model.step(world)).toEqual(next);
  });

  it('preserves a valid zero-valued founding population and undefined offspring means after extinction', () => {
    let world;
    for (let seed = 1; seed < 100; seed++) {
      const candidate = model.create(seed); candidate.living = false; candidate.selection = false;
      candidate.history[0].population = candidate.history[0].population.slice(0, 2); candidate.history[0].population.forEach(o => { o.genes.fur = [0, 0]; });
      candidate.history[0].stats = model.stats(candidate.history[0].population); candidate.nextId = 3;
      const next = model.step(candidate); if (next.history[1].survivors.length === 1) { world = next; break; }
    }
    expect(world).toBeDefined(); const trail = observation.habitatTrail(world), chapter = trail.chapters[0];
    expect(chapter.before.means.fur).toBe(0); expect(chapter.after.means.fur).toBeNull();
    expect(chapter.rounds).toEqual([{ generation: 1, parents: 2, survivors: 1, offspring: 0 }]);
    expect(chapter.after.population).toBe(0); expect(chapter.start).toBe(1); expect(chapter.end).toBe(1);
  });

  it('keeps arrival outside survival chapters and handles one-round and full-length histories', () => {
    const arrival = observation.habitatTrail(model.create(2026));
    expect(arrival.arrival.generation).toBe(0); expect(arrival.arrival.population).toBe(36); expect(arrival.chapters).toEqual([]);
    let world = { ...model.create(2026), living: false, selection: false };
    for (let i = 0; i < 60; i++) world = model.step(world);
    expect(world.generation).toBe(60); const trail = observation.habitatTrail(world);
    expect(trail.chapters).toHaveLength(1); expect(trail.chapters[0].rounds).toHaveLength(60);
    expect(trail.chapters[0].before.generation).toBe(0); expect(trail.chapters[0].after.generation).toBe(60);
  });

  it('rejects missing, sparse, inconsistent or unrecorded history metadata', () => {
    const world = model.step(model.create(1));
    for (const invalid of [null, {}, { ...world, generation: -1 }, { ...world, generation: .5 }, { ...world, generation: 61 }, { ...world, history: [] }, { ...world, history: Array(2) }]) expect(observation.habitatTrail(invalid)).toBeNull();
    for (const change of [{ generation: 7 }, { habitat: 'unknown' }, { habitat: '__proto__' }, { selection: 1 }, { population: null }, { survivors: null }]) {
      const copy = { ...world, history: world.history.slice() }; copy.history[1] = { ...copy.history[1], ...change }; expect(observation.habitatTrail(copy)).toBeNull();
    }
  });

  it('offers a report shortcut and keeps the chapter controls optional until opened', () => {
    const html = renderTool('evoLab', { evoLab: { view: 'livingIsland', island: expedition() } });
    const doc = new DOMParser().parseFromString(html, 'text/html'), trail = doc.querySelector('[data-habitat-trail]');
    expect(trail.tagName).toBe('DETAILS'); expect(trail.hasAttribute('open')).toBe(false);
    expect(trail.querySelector('summary').textContent).toBe('Follow the changing habitat');
    expect(trail.querySelectorAll('[data-habitat-chapter]')).toHaveLength(0);
    expect([...doc.querySelectorAll('.ei-field-report button')].some(button => button.textContent === 'Follow this habitat chapter')).toBe(true);
  });
});
