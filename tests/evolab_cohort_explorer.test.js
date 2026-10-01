import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let model, observe, study;
beforeEach(() => {
  resetStemLab(); localStorage.clear();
  loadTool('stem_lab/stem_tool_evolab.js', 'evoLab');
  model = window.StemLab.evoIslandModel;
  observe = window.StemLab.evoIslandObservation;
  study = window.StemLab.evoIslandStudy;
});

describe('recorded cohort exploration', () => {
  it('orders real individuals by trait, retains their identities, and leaves biological replay unchanged', () => {
    const world = model.step(model.create(2026)), before = JSON.stringify(world);
    const transition = study.transition(world, 1);
    const evidence = observe.cohorts(transition, 'fur');
    for (const row of evidence.rows) {
      expect(row.members).not.toBe(transition[row.phase]);
      expect(new Set(row.members.map(o => o.id))).toEqual(new Set(transition[row.phase].map(o => o.id)));
      const values = row.members.map(o => (o.genes.fur[0] + o.genes.fur[1]) / 2);
      expect(values).toEqual(values.slice().sort((a, b) => a - b));
      expect(row.mean).toBeCloseTo(values.reduce((sum, value) => sum + value, 0) / values.length, 12);
      row.members.forEach(o => expect(transition[row.phase].find(member => member.id === o.id)).toBe(o));
    }
    evidence.rows[1].members.forEach(o => expect(evidence.rows[0].members.find(parent => parent.id === o.id)).toBe(o));
    expect(JSON.stringify(world)).toBe(before);
    expect(model.step(world)).toEqual(model.step(model.step(model.create(2026))));
  });

  it('adds survival and birth changes to the actual total without claiming a cause', () => {
    for (const selection of [true, false]) for (const mutation of [0, 0.2]) {
      let world = { ...model.create(17), selection, mutation, living: false, habitat: 'snow' };
      for (let round = 0; round < 8 && world.history[world.generation].population.length; round++) {
        world = model.step(world);
        for (const trait of model.traits) {
          const evidence = observe.cohorts(study.transition(world, world.generation), trait);
          const first = evidence.rows[0].mean, last = evidence.rows[2].mean;
          if (last === null) {
            expect(evidence.birth).toBeNull(); expect(evidence.total).toBeNull();
          } else {
            expect(evidence.total).toBeCloseTo((last - first) * 100, 12);
            expect(evidence.survival + evidence.birth).toBeCloseTo(evidence.total, 12);
          }
        }
      }
    }
  });

  it('keeps zero measurements valid and empty cohort means undefined, including a lone survivor', () => {
    const [a, b] = model.create(1).history[0].population;
    a.genes.fur = [0, 0]; b.genes.fur = [1, 1];
    const evidence = observe.cohorts({ parents: [b, a], survivors: [a], offspring: [], means: { parents: { fur: 99 } } }, 'fur');
    expect(evidence.rows.map(row => row.mean)).toEqual([0.5, 0, null]);
    expect(evidence.rows[0].members.map(o => o.id)).toEqual([a.id, b.id]);
    expect(evidence.survival).toBe(-50); expect(evidence.birth).toBeNull(); expect(evidence.total).toBeNull();
    const empty = observe.cohorts({ parents: [a], survivors: [], offspring: [] }, 'fur');
    expect(empty.rows.map(row => row.mean)).toEqual([0, null, null]);
    expect(empty.survival).toBeNull(); expect(empty.birth).toBeNull(); expect(empty.total).toBeNull();
    b.genes.fur = [0, 0];
    expect(observe.cohorts({ parents: [b, a], survivors: [], offspring: [] }, 'fur').rows[0].members.map(o => o.id)).toEqual([a.id, b.id]);
  });

  it('requires an actual transition and a modeled inherited trait', () => {
    for (const data of [null, undefined, {}, { parents: [], survivors: null, offspring: [] }]) expect(observe.cohorts(data, 'fur')).toBeNull();
    const data = study.transition(model.step(model.create(2026)), 1);
    for (const trait of ['survival', 'natural', null, '__proto__']) expect(observe.cohorts(data, trait)).toBeNull();
  });

  it('renders a keyboard entry for each real cohort and explains the limits of the comparison', () => {
    const world = model.step(model.create(2026));
    const html = renderTool('evoLab', { evoLab: { view: 'livingIsland', island: world } });
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const replay = doc.querySelector('.ei-replay');
    expect(replay.querySelectorAll('[data-cohort]')).toHaveLength(3);
    for (const phase of ['parents', 'survivors', 'offspring']) {
      const cohort = replay.querySelector('[data-cohort="' + phase + '"]');
      expect(cohort.querySelectorAll('[data-cohort-dot][tabindex="0"]')).toHaveLength(1);
      expect(cohort.querySelectorAll('[data-cohort-dot]')).toHaveLength(study.transition(world, 1)[phase].length);
    }
    expect(replay.textContent).toContain('do not isolate its cause');
    expect(replay.textContent).toContain('0–100 teaching scale');
  });
});
