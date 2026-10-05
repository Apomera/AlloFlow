import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let m;
beforeEach(() => { resetStemLab(); localStorage.clear(); loadTool('stem_lab/stem_tool_evolab.js', 'evoLab'); m = window.StemLab.evoArchipelagoModel; });
const context = extra => ({ seed: 21, batch: 0, generation: 2, species: 'birds', boat: 'small', ...extra });

describe('matched connection experiments and actual inherited-copy evidence', () => {
  it('replays identical founders under closed and open routes and rejects invalid recipes', () => {
    const cases = m.founderConnections(21); expect(cases.batch).toBe(0); expect(m.founderConnections(21, 0)).toEqual(cases);
    for (const boat of ['small', 'large']) { expect(cases.isolated.worlds[boat].history[0]).toEqual(cases.connected.worlds[boat].history[0]); expect(cases.connected.worlds[boat].settings).toMatchObject({ migration: .3, selection: false, mutation: 0 }); expect(cases.isolated.worlds[boat].settings.migration).toBe(0); }
    for (const args of [[-1, 0], [21, -1], [21, .5], [4294967296, 0]]) expect(m.founderConnections(...args)).toBeNull();
    for (const args of [[null, 2, 'birds', 'small'], [cases, 6, 'birds', 'small'], [cases, 2, 'rabbits', 'small'], [cases, 2, 'birds', 'unknown'], [{ isolated: {}, connected: {} }, 2, 'birds', 'small']]) expect(m.founderConnectionComparison(...args)).toBeNull();
  });
  it('keeps founding cohorts separate from birth rounds and conserves both transmitted marker letters and all offspring copies', () => {
    const cases = m.founderConnections(21, 1);
    for (const boat of ['small', 'large']) for (const sp of m.species) {
      const start = m.founderConnectionComparison(cases, 0, sp, boat); expect(start.diversityDifference).toBe(0); expect(start.connected).toMatchObject({ arrivalCount: null, reproducingArrivals: null, incomingCopies: null, localCopies: null, newborns: [], routes: [] });
      for (let g = 1; g <= 5; g++) for (const key of ['isolated', 'connected']) {
        const w = cases[key].worlds[boat], e = m.connectionEvidence(w, g, 2, sp), pop = w.history[g].demes[2][sp], arrivals = w.history[g].round.migrants.filter(a => a.to === 2 && a.species === sp);
        expect(e.totalCopies).toBe(pop.length * 2); expect(e.incomingCopies + e.localCopies).toBe(e.totalCopies); expect(e.arrivalCount).toBe(arrivals.length); expect(e.reproducingArrivals).toBe(arrivals.filter(a => a.gametes > 0).length); expect(e.incomingCopies).toBe(arrivals.reduce((n, a) => n + a.gametes, 0));
        expect(e.routes.reduce((n, r) => n + r.A, 0)).toBe(pop.flatMap(o => o.marker).filter(a => a === 1).length); e.routes.forEach(r => expect(r.A + r.a).toBe(r.copies));
        e.arrivals.forEach(a => { const actual = arrivals.find(r => r.id === a.id); expect(a).toEqual({ id: actual.id, from: actual.from, copies: actual.gametes, A: actual.markerCopies[1], a: actual.markerCopies[0] }); });
        e.newborns.forEach(n => n.copies.forEach((c, i) => { const parent = m.find(w, c.parent), child = pop.find(o => o.id === n.id); expect(c.from).toBe(parent.island); expect(c.marker).toBe(parent.organism.marker[child.inheritance[i].markerCopy]); }));
        const origins = [0, 0, 0]; pop.forEach(o => [0, 1].forEach(copy => origins[m.alleleTrail(w, o.id, copy, 'marker').founder.island]++)); expect(e.origins).toEqual(origins); expect(e.foreignFounderCopies).toBe(origins[0] + origins[1]);
      }
    }
  });
  it('provides real counterexamples to equating arrivals with reproduction, current transmissions with older ancestry, or connection with always higher H', () => {
    let zeroContribution = false, olderAncestry = false, lowerH = false;
    for (let batch = 0; batch < 8 && !(zeroContribution && olderAncestry && lowerH); batch++) {
      const cases = m.founderConnections(21, batch);
      for (const boat of ['small', 'large']) for (const sp of m.species) for (let g = 1; g <= 5; g++) {
        const c = m.founderConnectionComparison(cases, g, sp, boat), e = c.connected;
        zeroContribution ||= e.arrivals.some(a => a.copies === 0); olderAncestry ||= e.foreignFounderCopies > 0 && e.foreignFounderCopies !== e.incomingCopies; lowerH ||= c.diversityDifference < -1e-12;
      }
    }
    expect(zeroContribution).toBe(true); expect(olderAncestry).toBe(true); expect(lowerH).toBe(true);
  });
  it('reconstructs full precision comparisons from the compact recipe without changing the expedition or its next random future', () => {
    const expedition = m.step(m.create(21)), original = JSON.stringify(expedition), future = m.step(expedition), cases = m.founderConnections(expedition.seed, 3), proof = m.founderConnectionComparison(cases, 4, 'plants', 'large');
    const replay = m.founderConnectionComparison(m.founderConnections(21, 3), 4, 'plants', 'large'); expect(replay).toEqual(JSON.parse(JSON.stringify(proof)));
    expect(proof.diversityDifference).toBe(proof.connected.cohort.H - proof.isolated.cohort.H); expect(proof.frequencyDifference).toBe(proof.connected.cohort.p - proof.isolated.cohort.p); expect(JSON.stringify(expedition)).toBe(original); expect(m.step(expedition)).toEqual(future);
    expect(m.connectionEvidence(expedition, 2, 2, 'birds')).toBeNull(); expect(m.connectionEvidence(expedition, 1, 3, 'birds')).toBeNull(); expect(m.connectionEvidence(null, 1, 2, 'birds')).toBeNull();
  });
  it('bounds reflection drafts, preserves only valid case-specific predictions and never trusts saved outcomes', () => {
    const raw = { version: 1, prediction: context({ choice: 'higher', result: 999 }), revealed: context({ fabricated: true }), reflection: 'r'.repeat(5000), worlds: { connected: 'fabricated' } }, restored = m.restoreConnectionDraft(raw);
    expect(restored).toEqual({ version: 1, prediction: context({ choice: 'higher' }), revealed: context(), reflection: 'r'.repeat(4000) }); expect(m.restoreConnectionDraft({ version: 2 })).toBeNull();
    for (const patch of [{ seed: -1 }, { batch: 4294967296 }, { generation: 0 }, { generation: 6 }, { species: 'rabbit' }, { boat: 'tiny' }]) { const r = m.restoreConnectionDraft({ ...raw, prediction: { ...raw.prediction, ...patch }, revealed: { ...raw.revealed, ...patch } }); expect(r.prediction).toBeNull(); expect(r.revealed).toBeNull(); }
    expect(m.restoreConnectionDraft({ ...raw, prediction: context({ choice: 'always beneficial' }) }).prediction).toBeNull();
  });
  it('reveals only a matching saved case and shows no invented outcomes when the generation, boat or species differs', () => {
    localStorage.setItem('evoLab.archipelago.connections.v1', JSON.stringify({ version: 1, prediction: context({ choice: 'lower' }), revealed: context(), reflection: 'My retained notes', outcome: { H: 999 } }));
    const founders = { version: 1, seed: 21, batch: 0, migration: 0, generation: 2, prediction: '', reasoning: '' }, world = m.step(m.create(21)), before = JSON.stringify(world);
    const render = generation => new DOMParser().parseFromString(renderTool('evoLab', { evoLab: { view: 'archipelago', archipelago: world, archipelagoFounders: { ...founders, generation } } }), 'text/html');
    const revealed = render(2); expect(revealed.querySelector('[data-connection-investigation]').getAttribute('data-connection-investigation')).toBe('revealed'); expect(revealed.querySelectorAll('[data-flow-world]')).toHaveLength(2); expect(revealed.querySelector('#ea-flow-reflection').textContent).toBe('My retained notes');
    expect(Number(revealed.querySelector('[data-flow-world=connected]').getAttribute('data-flow-h'))).toBe(m.founderConnectionComparison(m.founderConnections(21), 2, 'birds', 'small').connected.cohort.H);
    const fresh = render(3); expect(fresh.querySelector('[data-connection-investigation]').getAttribute('data-connection-investigation')).toBe('prediction'); expect(fresh.querySelectorAll('[data-flow-world]')).toHaveLength(0); expect(render(0).querySelector('[data-connection-investigation]').textContent).toContain('No dispersal or reproduction round'); expect(JSON.stringify(world)).toBe(before);
  });
});
