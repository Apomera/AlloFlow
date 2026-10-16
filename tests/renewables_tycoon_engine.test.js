import { createRequire } from 'node:module';
import fs from 'node:fs';
import vm from 'node:vm';
import { describe, it, expect } from 'vitest';

const require = createRequire(import.meta.url);
const engine = require('../stem_lab/renewables_tycoon_engine.js');
const clone = value => JSON.parse(JSON.stringify(value));
// Expose only the private dispatch helper in this isolated fixture so battery
// fleet limits can be stressed above this small campaign's ordinary demand.
const fixtureSource = fs.readFileSync('stem_lab/renewables_tycoon_engine.js', 'utf8')
  .replace('return Object.freeze({ version: VERSION', 'return Object.freeze({ dispatchStorage: dispatchStorage, version: VERSION');
const fixtureContext = { module: { exports: {} } };
vm.runInNewContext(fixtureSource, fixtureContext);
const dispatchStorage = fixtureContext.module.exports.dispatchStorage;
function dispatchFleet(energy, deficit, essentialGap, reserve = 0.5, surplus = 0) {
  const batteries = energy.map((stored, index) => ({ id: 'battery-' + index, stored, power: 0 }));
  const stored = Object.fromEntries(batteries.map(asset => [asset.id, asset.stored]));
  const throughput = Object.fromEntries(batteries.map(asset => [asset.id, 0]));
  const result = dispatchStorage(batteries, stored, throughput, surplus, deficit, essentialGap, reserve);
  return { batteries, stored, throughput, result };
}
const commitEvent = (state, preferred) => {
  const choices = engine.outlook(state).event.choices;
  const selected = choices.find(choice => choice.id === preferred)
    || choices.filter(choice => choice.cost <= state.cash).sort((a, b) => a.cost - b.cost)[0];
  return engine.apply(state, { type: 'event', choiceId: selected.id });
};
const advance = state => engine.apply(commitEvent(state), { type: 'advance' });

function analysisHour(hour, overrides = {}) {
  return { hour, day: Math.floor(hour / 24) + 1, demand: 0, served: 0, unserved: 0,
    generation: 0, solar: 0, wind: 0, charge: 0, discharge: 0, curtailed: 0,
    storageLoss: 0, stored: 0, ...overrides };
}

function sensibleCampaign(seed = 'NORTH-HARBOR') {
  let state = engine.create(seed);
  state = engine.apply(state, { type: 'buy', siteId: 'ridge-wind' });
  state = engine.apply(state, { type: 'buy', siteId: 'school-roofs' });
  state = engine.apply(state, { type: 'policy', reserve: 0.05, flex: true });
  while (state.phase === 'planning') {
    const choices = engine.outlook(state).event.choices;
    const preferred = ['capital', 'insulation', 'standby', 'workshop', 'schedule', 'train', 'customer', 'tour', 'inspect', 'support'];
    const selected = preferred.map(id => choices.find(choice => choice.id === id && choice.cost <= state.cash)).find(Boolean);
    state = commitEvent(state, selected?.id);
    const worn = state.assets.filter(asset => asset.readyMonth <= state.month && (asset.fault || asset.condition < 78))
      .sort((a, b) => Number(b.fault) - Number(a.fault) || a.condition - b.condition)[0];
    if (worn && state.cash >= engine.catalog[worn.type].serviceCost) state = engine.apply(state, { type: 'service', assetId: worn.id });
    if (state.month < 9 && !state.assets.some(asset => asset.siteId === 'civic-store') && state.cash > 17500) {
      state = engine.apply(state, { type: 'buy', siteId: 'civic-store' });
    }
    state = engine.apply(state, { type: 'advance' });
  }
  return state;
}

describe('Renewables Tycoon deterministic campaign', () => {
  it('exports the same engine to browser and CommonJS without external dependencies', () => {
    const context = { Math: Object.create(Math) };
    context.Math.random = () => { throw new Error('Unseeded randomness'); };
    vm.runInNewContext(fs.readFileSync('stem_lab/renewables_tycoon_engine.js', 'utf8'), context);
    expect(context.StemLab.renewablesTycoonEngine.create('classroom').seed).toBe('classroom');
    expect(engine.version).toBe(1);
    expect(engine.sites).toHaveLength(9);
    expect(Object.isFrozen(engine.catalog.solar)).toBe(true);
  });

  it('starts a viable three-asset fleet with no invented stored energy', () => {
    const state = engine.create();
    expect(state.assets.map(asset => asset.type)).toEqual(['solar', 'wind', 'battery']);
    expect(state.assets.every(asset => asset.stored === 0)).toBe(true);
    expect(state.cash).toBe(68000);
    expect(state.history).toEqual([]);
    expect(engine.restore(JSON.stringify(state))).toEqual(state);
  });

  it('uses seeded weather and events independent of preview count', () => {
    const initial = engine.create('shared-classroom');
    const before = JSON.stringify(initial);
    const first = engine.preview(initial);
    engine.preview(engine.create('other-seed'));
    const second = engine.preview(initial);
    expect(first).toEqual(second);
    expect(JSON.stringify(initial)).toBe(before);
    expect(engine.preview(engine.create('different')).hours[12].windSpeed).not.toBe(first.hours[12].windSpeed);
  });

  it('exposes seasonal sun height without confusing cloudy daylight with night', () => {
    const dayLengths = [8.8, 9.8, 11.7, 13.5, 14.8, 15.5, 15.1, 13.9, 12.4, 10.7, 9.2, 8.4];
    const january = engine.create('seasonal-sun-height');
    let june;
    for (let month = 0; month < 12; month += 1) {
      const run = engine.preview({ ...january, month });
      if (month === 5) june = run;
      const sunrise = 12 - dayLengths[month] / 2;
      const sunset = sunrise + dayLengths[month];
      for (const hour of run.hours) {
        expect(hour.sunHeight).toBeGreaterThanOrEqual(0);
        expect(hour.sunHeight).toBeLessThanOrEqual(1);
        if (hour.hourOfDay + 0.5 < sunrise || hour.hourOfDay + 0.5 > sunset) expect(hour.sunHeight).toBe(0);
        if (hour.irradiance > 0) expect(hour.sunHeight).toBeGreaterThan(0);
      }
    }
    expect(engine.preview(january).hours[7].sunHeight).toBe(0);
    expect(june.hours[7].sunHeight).toBeGreaterThan(0);
  });

  it('recomputes visual sun height when replaying an existing terminal save', () => {
    const completed = sensibleCampaign('legacy-sun-height');
    const serialized = JSON.stringify(completed);
    expect(serialized).not.toContain('sunHeight');
    const restored = engine.restore(serialized);
    expect(restored).not.toBeNull();
    expect(restored.phase).toBe('complete');
    expect(restored.version).toBe(1);
    const replay = engine.preview(restored);
    expect(replay.forecast).toBe(false);
    expect(replay.hours).toHaveLength(31 * 24);
    expect(replay.hours[0].sunHeight).toBe(0);
    expect(replay.hours[12].sunHeight).toBeGreaterThan(0);
    expect(replay.totals).toEqual(restored.history.at(-1).totals);
  });

  it('returns an empty dispatch analysis when there are no hourly records', () => {
    for (const run of [null, undefined, {}, { hours: null }, { hours: [] }]) {
      expect(engine.analyze(run)).toEqual({ days: [], gapHours: 0, gapHourIndices: [], peakGapHour: null, peakCurtailmentHour: null });
    }
  });

  it('reconciles every daily dispatch summary with the original monthly energy accounting', () => {
    const run = engine.preview(engine.create('daily-dispatch'));
    const analysis = engine.analyze(run);
    expect(analysis.days).toHaveLength(31);
    for (const key of ['demand', 'served', 'unserved', 'generation', 'solar', 'wind', 'charge', 'discharge', 'curtailed', 'storageLoss']) {
      expect(analysis.days.reduce((total, day) => total + day[key], 0)).toBeCloseTo(run.totals[key], 7);
    }
    for (const day of analysis.days) {
      expect(day.hours).toBe(24);
      expect(day.coverage).toBeCloseTo(day.served / day.demand, 10);
      expect(day.served + day.unserved).toBeCloseTo(day.demand, 8);
      expect(day.generation + day.discharge).toBeCloseTo(day.served + day.charge + day.curtailed, 8);
      expect(day.initialStored + day.charge - day.discharge - day.storageLoss).toBeCloseTo(day.endStored, 8);
    }
    expect(analysis.days[0].initialStored).toBe(run.totals.initialStored);
    expect(analysis.days.at(-1).endStored).toBe(run.totals.endStored);
    const realGaps = run.hours.filter(hour => hour.unserved > 0.001).map(hour => hour.hour);
    expect(analysis.gapHourIndices).toEqual(realGaps);
    expect(analysis.gapHours).toBe(realGaps.length);
    expect(analysis.days.reduce((total, day) => total + day.gapHours, 0)).toBe(realGaps.length);
  });

  it('identifies the earliest equal peak and keeps daily and monthly navigation indices absolute', () => {
    const analysis = engine.analyze({ totals: { initialStored: 0 }, hours: [
      analysisHour(0, { unserved: 3 }),
      analysisHour(1, { unserved: 3, curtailed: 2 }),
      analysisHour(23, { unserved: 0.0005 }),
      analysisHour(24, { unserved: 5, curtailed: 2 })
    ] });
    expect(analysis.gapHourIndices).toEqual([0, 1, 24]);
    expect(analysis.gapHours).toBe(3);
    expect(analysis.peakGapHour).toBe(24);
    expect(analysis.peakCurtailmentHour).toBe(1);
    expect(analysis.days[0].peakGapHour).toBe(0);
    expect(analysis.days[0].peakCurtailmentHour).toBe(1);
    expect(analysis.days[1].peakGapHour).toBe(24);
    expect(analysis.days[1].peakCurtailmentHour).toBe(24);
  });

  it('does not turn negligible numerical residuals into gap or surplus navigation targets', () => {
    const analysis = engine.analyze({ hours: [analysisHour(0, { unserved: 0.001, curtailed: 0.0005 })] });
    expect(analysis.gapHours).toBe(0);
    expect(analysis.gapHourIndices).toEqual([]);
    expect(analysis.peakGapHour).toBeNull();
    expect(analysis.peakCurtailmentHour).toBeNull();
    expect(analysis.days[0].peakGapHour).toBeNull();
    expect(analysis.days[0].peakCurtailmentHour).toBeNull();
    expect(analysis.days[0].unserved).toBe(0.001);
    expect(analysis.days[0].curtailed).toBe(0.0005);
    expect(analysis.days[0].coverage).toBe(1);
  });

  it('carries the preceding hour storage into each daily opening balance', () => {
    const analysis = engine.analyze({ totals: { initialStored: 50 }, hours: [
      analysisHour(0, { stored: 40 }), analysisHour(23, { stored: 22 }), analysisHour(24, { stored: 20 })
    ] });
    expect(analysis.days[0].initialStored).toBe(50);
    expect(analysis.days[0].endStored).toBe(22);
    expect(analysis.days[1].initialStored).toBe(22);
    expect(analysis.days[1].endStored).toBe(20);
  });

  it('keeps dispatch analysis detached from immutable preview records and campaign decisions', () => {
    const state = commitEvent(engine.create('read-only-analysis'));
    const before = clone(state);
    const run = engine.preview(state);
    const original = structuredClone(run);
    function deepFreeze(value) {
      Object.values(value).forEach(child => { if (child && typeof child === 'object') deepFreeze(child); });
      return Object.freeze(value);
    }
    const analysis = engine.analyze(deepFreeze(run));
    expect(engine.analyze(run)).toEqual(analysis);
    analysis.days[0].served = -1;
    analysis.gapHourIndices.push(-1);
    expect(run).toEqual(original);
    expect(state).toEqual(before);
    expect(engine.apply(state, { type: 'advance' })).toEqual(engine.apply(before, { type: 'advance' }));
  });

  it('shows a seeded seasonal event before allowing the month to advance', () => {
    const state = engine.create();
    expect(engine.outlook(state).event.choices.length).toBeGreaterThanOrEqual(2);
    expect(() => engine.apply(state, { type: 'advance' })).toThrow(/event/);
    expect(() => engine.apply(state, { type: 'event', choiceId: 'not-a-choice' })).toThrow(/responses/);
  });

  it('charges or awards the event exactly once and commits the chosen response', () => {
    const original = engine.create();
    const event = engine.outlook(original).event;
    const choice = event.choices[0];
    const chosen = engine.apply(original, { type: 'event', choiceId: choice.id });
    expect(chosen.cash).toBe(original.cash - choice.cost);
    expect(chosen.trust).toBe(Math.min(100, original.trust + choice.trust));
    expect(engine.apply(chosen, { type: 'event', choiceId: choice.id })).toEqual(chosen);
    expect(() => engine.apply(chosen, { type: 'event', choiceId: event.choices[1].id })).toThrow(/committed/);
    expect(original.eventChoice).toBeNull();
  });

  it('keeps acquisition immutable and enforces funds, ownership, and a full construction month', () => {
    const original = engine.create();
    const next = engine.apply(original, { type: 'buy', siteId: 'ridge-wind' });
    expect(original.assets).toHaveLength(3);
    expect(next.cash).toBe(32000);
    const added = next.assets[3];
    expect(added.readyMonth).toBe(1);
    expect(engine.preview(next).hours.every(hour => hour.assets[3].status === 'building' && hour.assets[3].power === 0)).toBe(true);
    expect(() => engine.apply(next, { type: 'buy', siteId: 'ridge-wind' })).toThrow(/already owns/);
    expect(() => engine.apply(next, { type: 'buy', siteId: 'breakwater-wind' })).toThrow(/enough cash/);
    expect(() => engine.apply(next, { type: 'buy', siteId: 'unknown' })).toThrow(/site/);
    const opened = advance(next);
    expect(engine.preview(opened).hours.some(hour => hour.assets[3].power > 0)).toBe(true);
  });

  it('conserves electricity, storage energy, and demand at every hourly step', () => {
    let state = engine.create('accounting');
    state = engine.apply(state, { type: 'buy', siteId: 'school-roofs' });
    state = engine.apply(state, { type: 'buy', siteId: 'ridge-wind' });
    state = advance(state);
    const forecast = engine.preview(state);
    let priorStored = forecast.totals.initialStored;
    for (const row of forecast.hours) {
      expect(row.generation + row.discharge).toBeCloseTo(row.served + row.charge + row.curtailed, 8);
      expect(row.served + row.unserved).toBeCloseTo(row.demand, 8);
      expect(priorStored + row.charge - row.discharge - row.storageLoss).toBeCloseTo(row.stored, 8);
      expect(row.stored).toBeGreaterThanOrEqual(0);
      expect(row.stored).toBeLessThanOrEqual(row.capacity + 1e-8);
      expect(row.charge > 0 && row.discharge > 0).toBe(false);
      expect(row.essentialServed).toBeLessThanOrEqual(row.served + 1e-8);
      for (const battery of row.assets.filter(asset => asset.type === 'battery')) expect(Math.abs(battery.power)).toBeLessThanOrEqual(25);
      priorStored = row.stored;
    }
    expect(forecast.totals.initialStored + forecast.totals.charge - forecast.totals.discharge - forecast.totals.storageLoss).toBeCloseTo(forecast.totals.endStored, 7);
    expect(forecast.totals.storageLoss).toBeGreaterThan(0);
  });

  it('earns revenue only on delivered electricity and balances the monthly ledger', () => {
    const state = commitEvent(engine.create());
    const next = engine.apply(state, { type: 'advance' });
    const totals = next.history[0].totals;
    expect(totals.revenue).toBeCloseTo(totals.served * engine.assumptions.tariff, 8);
    expect(totals.profit).toBeCloseTo(totals.revenue - totals.operatingCost, 8);
    expect(next.cash).toBeCloseTo(state.cash + totals.profit, 8);
    expect(totals.generation).toBeGreaterThan(totals.served);
    expect(totals.curtailed).toBeGreaterThan(0);
  });

  it('shifts flexible demand without reducing daily energy or rerolling the weather', () => {
    const state = engine.create();
    const normal = engine.preview(state);
    const flexible = engine.preview(engine.apply(state, { type: 'policy', reserve: 0.15, flex: true }));
    expect(flexible.totals.demand).toBeCloseTo(normal.totals.demand, 8);
    expect(flexible.hours[18].demand).toBeLessThan(normal.hours[18].demand);
    expect(flexible.hours[12].demand).toBeGreaterThan(normal.hours[12].demand);
    expect(flexible.hours.map(hour => hour.windSpeed)).toEqual(normal.hours.map(hour => hour.windSpeed));
  });

  it('reserves storage for essential demand instead of creating energy', () => {
    const state = advance(engine.apply(engine.create(), { type: 'buy', siteId: 'ridge-wind' }));
    const open = engine.preview(engine.apply(state, { type: 'policy', reserve: 0, flex: false }));
    const protectedStore = engine.preview(engine.apply(state, { type: 'policy', reserve: 0.5, flex: false }));
    expect(protectedStore.hours.some((row, i) => row.stored > open.hours[i].stored + 0.01)).toBe(true);
    expect(protectedStore.hours.some(row => row.stored < 50 && row.discharge > 0)).toBe(true);
    expect(protectedStore.totals.initialStored + protectedStore.totals.charge - protectedStore.totals.discharge - protectedStore.totals.storageLoss).toBeCloseTo(protectedStore.totals.endStored, 7);
  });

  it.each([[40, 100], [100, 40]])('preserves a pack\'s reserve while another pack has ordinary energy: %j', (first, second) => {
    const energy = [first, second];
    const { batteries, result, throughput } = dispatchFleet(energy, 20, 11);
    const protectedPack = batteries[energy.indexOf(40)];
    const ordinaryPack = batteries[energy.indexOf(100)];
    expect(protectedPack.stored).toBe(40);
    expect(protectedPack.power).toBe(0);
    expect(ordinaryPack.power).toBe(20);
    expect(result.deficit).toBe(0);
    expect(result.discharge).toBe(20);
    expect(result.loss).toBeCloseTo(20 / 0.95 - 20, 12);
    expect(Object.values(throughput).reduce((sum, value) => sum + value, 0)).toBe(20);
  });

  it('releases reserve only for the essential gap left after fleet-wide ordinary dispatch', () => {
    const { batteries, result } = dispatchFleet([40, 60], 40, 30);
    expect(batteries[1].power).toBeCloseTo(9.5, 12);
    expect(batteries[1].stored).toBeCloseTo(50, 12);
    expect(batteries[0].power).toBeCloseTo(20.5, 12);
    expect(result.discharge).toBeCloseTo(30, 12);
    expect(result.deficit).toBeCloseTo(10, 12);
    expect(result.loss + result.discharge + batteries.reduce((sum, asset) => sum + asset.stored, 0)).toBeCloseTo(100, 10);
  });

  it('counts both discharge passes against each pack\'s power limit, loss, and throughput once', () => {
    const { batteries, result, throughput } = dispatchFleet([60, 40], 80, 44);
    expect(batteries.map(asset => asset.power)).toEqual([25, 19]);
    expect(result.discharge).toBe(44);
    expect(result.deficit).toBe(36);
    expect(throughput).toEqual({ 'battery-0': 25, 'battery-1': 19 });
    expect(result.loss).toBeCloseTo(44 / 0.95 - 44, 12);
    expect(result.loss + result.discharge + batteries.reduce((sum, asset) => sum + asset.stored, 0)).toBeCloseTo(100, 10);
    const limited = dispatchFleet([60, 40], 100, 60);
    expect(limited.batteries.map(asset => asset.power)).toEqual([25, 25]);
    expect(limited.result.discharge).toBe(50);
    expect(limited.result.deficit).toBe(50);
  });

  it('retains charge power and capacity bounds without discharging during a surplus', () => {
    const { batteries, result, throughput } = dispatchFleet([90, 20], 0, 0, 0.5, 60);
    expect(batteries[0].stored).toBe(100);
    expect(batteries[1].stored).toBeCloseTo(43.75, 12);
    expect(batteries[0].power).toBeCloseTo(-10 / 0.95, 12);
    expect(batteries[1].power).toBe(-25);
    expect(result.discharge).toBe(0);
    expect(result.charge + result.surplus).toBeCloseTo(60, 12);
    expect(result.charge - result.loss + 110).toBeCloseTo(143.75, 12);
    expect(Object.values(throughput).reduce((sum, value) => sum + value, 0)).toBeCloseTo(result.charge, 12);
  });

  it('uses ordinary energy in the later pack before touching the earlier reserve in an actual hourly simulation', () => {
    const state = engine.create('fleet-regression');
    state.assets[0].fault = true;
    state.assets[1].fault = true;
    state.assets[2].stored = 40;
    state.assets.push({ id: 'asset-civic-store', type: 'battery', siteId: 'civic-store', condition: 100, readyMonth: 0, serviceMonth: null, fault: false, stored: 100 });
    state.policy.reserve = 0.5;
    const firstHour = engine.preview(state).hours[0];
    expect(firstHour.generation).toBe(0);
    expect(firstHour.assets[2].power).toBe(0);
    expect(firstHour.assets[2].stored).toBe(40);
    expect(firstHour.assets[3].power).toBeCloseTo(firstHour.demand, 12);
    expect(firstHour.unserved).toBe(0);
  });

  it('uses two days of real service downtime, one crew, and restores faulty equipment', () => {
    const state = engine.create();
    state.assets[1].condition = 30;
    state.assets[1].fault = true;
    const serviced = engine.apply(state, { type: 'service', assetId: state.assets[1].id });
    expect(serviced.cash).toBe(state.cash - 650);
    expect(() => engine.apply(serviced, { type: 'service', assetId: state.assets[0].id })).toThrow(/crew/);
    const forecast = engine.preview(serviced);
    expect(forecast.hours.slice(0, 48).every(hour => hour.assets[1].status === 'service' && hour.assets[1].power === 0)).toBe(true);
    expect(forecast.hours.slice(48).some(hour => hour.assets[1].power > 0)).toBe(true);
    const completed = advance(serviced);
    expect(completed.assets[1].fault).toBe(false);
    expect(completed.assets[1].condition).toBeGreaterThan(94);
    expect(completed.assets[1].serviceMonth).toBeNull();
    expect(state.assets[1].condition).toBe(30);
  });

  it('shows known faults in forecasts but realizes new faults only when advancing', () => {
    let state = engine.create('fault-trial');
    state.assets.forEach(asset => { asset.condition = 10; });
    const forecast = engine.preview(state);
    expect(forecast.faults).toEqual([]);
    state = commitEvent(state);
    const first = engine.apply(state, { type: 'advance' });
    for (let n = 0; n < 4; n += 1) engine.preview(state);
    const second = engine.apply(state, { type: 'advance' });
    expect(first).toEqual(second);
    expect(first.history[0].faults.length).toBeGreaterThan(0);
    const following = engine.preview(first);
    expect(following.faults.length).toBe(first.assets.filter(asset => asset.fault).length);
    expect(following.faults.every(fault => fault.hour === 0 && fault.existing)).toBe(true);
  });

  it('makes wear materially reduce output even before a fault', () => {
    const state = engine.create();
    const healthy = engine.preview(state);
    state.assets[0].condition = 20;
    state.assets[1].condition = 20;
    const worn = engine.preview(state);
    expect(worn.totals.generation).toBeLessThan(healthy.totals.generation * 0.8);
  });

  it('keeps solar dark at night and turbines stopped outside operating limits', () => {
    const state = engine.create('limits');
    const forecast = engine.preview(state);
    expect(forecast.hours.filter(hour => hour.irradiance === 0).every(hour => hour.solar === 0)).toBe(true);
    for (const hour of forecast.hours) {
      if (hour.windSpeed < 3 || hour.windSpeed >= 25) expect(hour.wind).toBe(0);
    }
  });

  it('offers twelve varied events with both positive opportunities and adverse conditions', () => {
    let state = engine.create('event-deck');
    const events = [];
    while (state.phase === 'planning') {
      events.push(engine.outlook(state).event);
      state = advance(state);
    }
    expect(new Set(events.map(event => event.id)).size).toBe(12);
    expect(events.some(event => event.choices.some(choice => choice.cost < 0))).toBe(true);
    expect(events.some(event => event.effects.risk > 1)).toBe(true);
    expect(events.some(event => event.effects.solar < 1)).toBe(true);
  });

  it('supports an achievable twelve-month strategy with maintenance and expansion', () => {
    const state = sensibleCampaign();
    expect(state.phase).toBe('complete');
    expect(state.history).toHaveLength(12);
    expect(state.assets.length).toBeGreaterThanOrEqual(5);
    expect(state.outcome, JSON.stringify({ outcome: state.outcome, months: state.history.map(entry => ({ month: entry.monthName, coverage: entry.totals.coverage, cash: entry.totals.endingCash, faults: entry.faults })) })).toMatchObject({ won: true });
    expect(state.outcome.coverage).toBeGreaterThanOrEqual(0.9);
    expect(state.cash).toBeGreaterThanOrEqual(0);
    expect(state.trust).toBeGreaterThanOrEqual(50);
  });

  it('makes neglect lose the reliability goal without inventing a victory', () => {
    let state = engine.create();
    while (state.phase === 'planning') state = advance(state);
    expect(state.outcome.won).toBe(false);
    expect(state.outcome.coverage).toBeLessThan(0.9);
    expect(state.outcome.reasons.some(reason => reason.includes('reliability'))).toBe(true);
  });

  it('ends an insolvent month and blocks all further operating decisions', () => {
    let state = engine.create('bankrupt');
    state.cash = 0;
    state.assets.forEach(asset => { asset.fault = true; });
    state = commitEvent(state, 'normal');
    // A grant must not mask the deliberately empty operating budget in this case.
    state.cash = 0;
    state = engine.apply(state, { type: 'advance' });
    expect(state.phase).toBe('insolvent');
    expect(state.outcome.won).toBe(false);
    expect(() => engine.apply(state, { type: 'advance' })).toThrow(/ended/);
    expect(engine.restore(JSON.stringify(state))).toEqual(state);
  });

  it('replays the actual final month after completion without simulating a thirteenth month', () => {
    const state = sensibleCampaign();
    const before = JSON.stringify(state);
    const replay = engine.preview(state);
    expect(replay.month).toBe(11);
    expect(replay.monthName).toBe('December');
    expect(replay.forecast).toBe(false);
    expect(replay.hours).toHaveLength(744);
    expect(replay.totals).toEqual(state.history[11].totals);
    expect(JSON.stringify(state)).toBe(before);
    expect(engine.restore(JSON.stringify(state))).toEqual(state);
    expect(JSON.stringify(state).length).toBeLessThan(30000);
  });

  it('rejects a construction order that cannot open before the campaign ends', () => {
    let state = engine.create();
    while (state.month < 11) state = advance(state);
    expect(() => engine.apply(state, { type: 'buy', siteId: 'school-roofs' })).toThrow(/campaign ends/);
    expect(engine.outlook(state).sites.filter(site => !site.owned).every(site => !site.available)).toBe(true);
  });
});

describe('Renewables Tycoon maintenance advice and recorded consequences', () => {
  const assetRow = (state, siteId) => engine.fleet(state).assets.find(asset => asset.siteId === siteId);

  it('handles missing records without inventing a maintenance plan or a completed month', () => {
    for (const state of [null, undefined, {}, { history: [], assets: [] }]) {
      expect(engine.fleet(state)).toMatchObject({ active: false, crewAvailable: false, assets: [] });
      expect(engine.recap(state)).toBeNull();
    }
    expect(engine.recap(engine.create())).toBeNull();
  });

  it('prioritizes actual faults before advisory wear and distinguishes construction from available equipment', () => {
    let state = engine.apply(engine.create(), { type: 'buy', siteId: 'school-roofs' });
    state.assets[0].condition = 77;
    state.assets[1].condition = 99;
    state.assets[1].fault = true;
    const advice = engine.fleet(state);
    expect(advice.serviceThreshold).toBe(78);
    expect(advice.assets.map(asset => [asset.siteId, asset.status])).toEqual([
      ['north-bluff', 'fault'], ['harbor-roofs', 'worn'], ['school-roofs', 'building'], ['harbor-store', 'ready']
    ]);
    expect(assetRow(state, 'north-bluff')).toMatchObject({ canService: true, serviceBlock: null, serviceCost: 650, faultRisk: null });
    expect(assetRow(state, 'school-roofs')).toMatchObject({ canService: false, serviceBlock: 'building', faultRisk: null, readyMonth: 1 });
    state.assets[0].condition = 78;
    expect(assetRow(state, 'harbor-roofs').status).toBe('ready');
  });

  it('respects crew booking and treats a scheduled repair as service instead of an unresolved fault', () => {
    const state = engine.create();
    state.assets[1].fault = true;
    const planned = engine.apply(state, { type: 'service', assetId: state.assets[1].id });
    const advice = engine.fleet(planned);
    expect(advice).toMatchObject({ crewAvailable: false, crewAssetId: 'asset-north-bluff', serviceHours: 48 });
    expect(assetRow(planned, 'north-bluff')).toMatchObject({ status: 'service', canService: false, serviceBlock: 'scheduled', faultRisk: null });
    expect(assetRow(planned, 'harbor-roofs')).toMatchObject({ canService: false, serviceBlock: 'booked' });
    expect(assetRow(planned, 'harbor-store')).toMatchObject({ canService: false, serviceBlock: 'booked' });
    expect(planned.cash).toBe(state.cash - 650);
  });

  it('explains cash and campaign-end service restrictions without blocking affordable jobs', () => {
    const state = engine.create();
    state.cash = 450;
    expect(assetRow(state, 'harbor-roofs').canService).toBe(true);
    expect(assetRow(state, 'harbor-store').canService).toBe(true);
    expect(assetRow(state, 'north-bluff')).toMatchObject({ canService: false, serviceBlock: 'cash' });
    const complete = sensibleCampaign();
    const advice = engine.fleet(complete);
    expect(advice).toMatchObject({ active: false, crewAvailable: false, eventId: null, riskMultiplier: null });
    expect(advice.assets.every(asset => !asset.canService && asset.serviceBlock === 'ended' && asset.faultRisk === null)).toBe(true);
  });

  it('reports generation derating precisely without inventing battery capacity degradation', () => {
    const state = engine.create('condition-advice');
    const healthy = engine.preview(state);
    state.assets.forEach(asset => { asset.condition = 20; });
    const worn = engine.preview(state);
    for (const siteId of ['harbor-roofs', 'north-bluff']) {
      const asset = assetRow(state, siteId);
      expect(asset.outputFactor).toBeCloseTo(0.76, 12);
      const index = state.assets.findIndex(item => item.siteId === siteId);
      const generating = healthy.hours.findIndex(hour => hour.assets[index].power > 0);
      expect(worn.hours[generating].assets[index].power / healthy.hours[generating].assets[index].power).toBeCloseTo(asset.outputFactor, 12);
    }
    expect(assetRow(state, 'harbor-store').outputFactor).toBeNull();
    expect(worn.hours.every(hour => hour.capacity === 100)).toBe(true);
  });

  it('shows only the known monthly fault probability and reflects a committed protective response', () => {
    let state;
    for (let i = 0; i < 30; i += 1) {
      const candidate = engine.create('risk-advice-' + i);
      if (engine.outlook(candidate).event.id === 'storm') { state = candidate; break; }
    }
    expect(state).toBeDefined();
    state.assets[1].condition = 50;
    const before = assetRow(state, 'north-bluff').faultRisk;
    expect(before).toBeCloseTo((0.008 + 0.72 * 0.5 ** 2) * 1.8, 12);
    const protectedState = engine.apply(state, { type: 'event', choiceId: 'standby' });
    expect(assetRow(protectedState, 'north-bluff').faultRisk).toBeCloseTo(before * 0.3, 12);
    expect(engine.fleet(protectedState)).toMatchObject({ eventId: 'storm', choiceId: 'standby', riskMultiplier: 1.8 * 0.3 });
    state.assets[1].condition = 0;
    expect(assetRow(state, 'north-bluff').faultRisk).toBe(0.8);
    expect(engine.preview(state).faults).toEqual([]);
  });

  it('keeps advice detached from state and cannot change realized faults or operating results', () => {
    const state = commitEvent(engine.create('read-only-fleet'));
    const before = clone(state);
    for (let i = 0; i < 5; i += 1) {
      const advice = engine.fleet(state);
      advice.assets[0].condition = -1;
      advice.assets.reverse();
    }
    expect(state).toEqual(before);
    expect(engine.apply(state, { type: 'advance' })).toEqual(engine.apply(before, { type: 'advance' }));
  });

  it('distinguishes newly realized faults and exact timing from faults carried into the month', () => {
    let state = engine.create('fault-trial');
    state.assets.forEach(asset => { asset.condition = 10; });
    state = advance(state);
    const first = engine.recap(state);
    expect(first.newFaults.length).toBeGreaterThan(0);
    expect(first.existingFaults).toEqual([]);
    expect(first.newFaults.map(asset => asset.hour)).toEqual(first.newFaults.map(asset => asset.hour).sort((a, b) => a - b));
    for (const fault of first.newFaults) {
      const recorded = state.history[0].faults.find(item => item.assetId === fault.id);
      expect(fault.hour).toBe(recorded.hour);
      expect((fault.day - 1) * 24 + fault.hourOfDay).toBe(recorded.hour);
      expect(fault.name).toBe(engine.sites.find(site => site.id === fault.siteId).name);
    }
    const next = advance(state);
    expect(engine.recap(next).existingFaults.map(asset => asset.id).sort()).toEqual(first.newFaults.map(asset => asset.id).sort());
    expect(engine.recap(next).existingFaults.every(asset => asset.hour === 0 && asset.day === 1 && asset.hourOfDay === 0)).toBe(true);
  });

  it('records restored equipment, paid maintenance and the next commissioning month from the completed plan', () => {
    let state = engine.create();
    state.assets[1].condition = 30;
    state.assets[1].fault = true;
    state = engine.apply(state, { type: 'buy', siteId: 'ridge-wind' });
    state = engine.apply(state, { type: 'service', assetId: 'asset-north-bluff' });
    state = advance(state);
    const recap = engine.recap(state);
    expect(recap).toMatchObject({ month: 0, monthName: 'January' });
    expect(recap.serviced).toEqual([expect.objectContaining({ id: 'asset-north-bluff', beforeCondition: 30,
      afterCondition: state.history[0].conditionByAsset.find(asset => asset.id === 'asset-north-bluff').condition,
      repaired: true, serviceHours: 48, cost: 650 })]);
    expect(recap.serviced[0].afterCondition).toBeGreaterThan(94);
    expect(recap.serviced[0].afterCondition).toBeLessThan(100);
    expect(recap.commissioned).toEqual([expect.objectContaining({ id: 'asset-ridge-wind', readyMonth: 1, monthName: 'February' })]);
    expect(recap.newFaults.some(asset => asset.id === 'asset-north-bluff')).toBe(false);
    expect(recap.existingFaults.some(asset => asset.id === 'asset-north-bluff')).toBe(false);
  });

  it('uses actual bounded trust changes and reports clamping instead of claiming an unattained reward', () => {
    let state = engine.apply(engine.create(), { type: 'buy', siteId: 'ridge-wind' });
    state = engine.apply(state, { type: 'buy', siteId: 'school-roofs' });
    state = engine.apply(state, { type: 'policy', reserve: 0.05, flex: true });
    let previousTrust = state.trust, sawClamp = false;
    while (state.phase === 'planning') {
      const choice = engine.outlook(state).event.choices.slice().sort((a, b) => b.trust - a.trust)[0];
      state = engine.apply(state, { type: 'event', choiceId: choice.id });
      const beforeOperation = state.trust;
      state = engine.apply(state, { type: 'advance' });
      const recap = engine.recap(state);
      expect(recap.trust).toMatchObject({ start: previousTrust, event: beforeOperation - previousTrust,
        operation: state.history.at(-1).trust - beforeOperation, end: state.history.at(-1).trust,
        total: state.history.at(-1).trust - previousTrust });
      expect(recap.trust.event + recap.trust.operation).toBe(recap.trust.total);
      if (recap.trust.clamped) {
        sawClamp = true;
        expect(Math.abs(recap.trust.event - choice.trust) > 0 || Math.abs(recap.trust.operation - recap.trust.reliability - recap.trust.flex) > 0).toBe(true);
      }
      previousTrust = state.history.at(-1).trust;
    }
    expect(sawClamp).toBe(true);
  });

  it('keeps last-month consequences stable through later purchases, event choices, and service bookings', () => {
    let state = advance(engine.create('stable-recap'));
    const before = engine.recap(state);
    state = engine.apply(state, { type: 'buy', siteId: 'civic-store' });
    state = commitEvent(state);
    state = engine.apply(state, { type: 'service', assetId: 'asset-harbor-store' });
    expect(engine.recap(state)).toEqual(before);
    const restored = engine.restore(JSON.stringify(state));
    expect(engine.recap(restored)).toEqual(before);
    const detached = engine.recap(state);
    detached.trust.total = -999;
    detached.commissioned.push({ name: 'Invented' });
    expect(engine.recap(state)).toEqual(before);
  });

  it('keeps a terminal recap on December without generating another operation', () => {
    const state = sensibleCampaign();
    const before = JSON.stringify(state);
    expect(engine.recap(state)).toMatchObject({ month: 11, monthName: 'December', commissioned: [] });
    expect(engine.recap(engine.restore(before))).toEqual(engine.recap(state));
    expect(JSON.stringify(state)).toBe(before);
  });

  it('can label recorded fault metadata from a bounded older save without assuming every ID was in its snapshot', () => {
    let state = advance(engine.create('metadata-guard'));
    state = engine.apply(state, { type: 'buy', siteId: 'civic-store' });
    state.history[0].faults.push({ assetId: 'asset-civic-store', hour: 100, existing: false });
    const restored = engine.restore(state);
    expect(restored).not.toBeNull();
    expect(() => engine.recap(restored)).not.toThrow();
    expect(engine.recap(restored).newFaults).toContainEqual(expect.objectContaining({ id: 'asset-civic-store', name: 'Civic store', hour: 100 }));
  });
});

describe('Renewables Tycoon pre-booking service impact', () => {
  const windId = 'asset-north-bluff';
  const deepFreeze = value => {
    Object.values(value).forEach(child => { if (child && typeof child === 'object') deepFreeze(child); });
    return Object.freeze(value);
  };

  it('returns an unavailable comparison for an unknown asset or incomplete campaign', () => {
    for (const state of [null, undefined, {}, engine.create()]) {
      expect(engine.servicePlan(state, 'absent')).toMatchObject({ assetId: 'absent', eligible: false,
        serviceBlock: 'unknown', serviceCost: null, current: null, proposed: null, delta: null,
        outage: null, faultRiskAfter: null });
    }
  });

  it('does not forecast unavailable crew, insufficient cash, construction, or a completed campaign', () => {
    const cases = [];
    let state = engine.apply(engine.create(), { type: 'service', assetId: windId });
    cases.push([state, windId, 'scheduled']);
    cases.push([state, 'asset-harbor-roofs', 'booked']);
    state = engine.create();
    state.cash = 649;
    cases.push([state, windId, 'cash']);
    state = engine.apply(engine.create(), { type: 'buy', siteId: 'ridge-wind' });
    cases.push([state, 'asset-ridge-wind', 'building']);
    cases.push([sensibleCampaign(), windId, 'ended']);
    for (const [campaign, assetId, block] of cases) {
      // An unavailable comparison must stop before forecasting. Removing a
      // policy would make preview fail if it were incorrectly invoked here.
      campaign.policy = null;
      expect(engine.servicePlan(campaign, assetId)).toMatchObject({ eligible: false,
        serviceBlock: block, current: null, proposed: null, delta: null, outage: null, faultRiskAfter: null });
    }
  });

  it('projects the actual service booking including its fee exactly once and all monthly deltas', () => {
    const state = commitEvent(engine.create('service-cost-projection'));
    const plan = engine.servicePlan(state, windId);
    const booked = engine.apply(state, { type: 'service', assetId: windId });
    const current = engine.preview(state), proposed = engine.preview(booked);
    expect(plan).toMatchObject({ eligible: true, serviceBlock: null, serviceCost: 650,
      serviceHours: 48, returnHour: 48, conditionBefore: 100, conditionAfterService: 100,
      repairsFault: false, faultRiskAfter: 0 });
    for (const key of ['coverage', 'served', 'unserved', 'generation', 'endingCash']) {
      expect(plan.current[key]).toBe(current.totals[key]);
      expect(plan.proposed[key]).toBe(proposed.totals[key]);
      expect(plan.delta[key]).toBe(proposed.totals[key] - current.totals[key]);
    }
    expect(plan.proposed.endingCash).toBeCloseTo(state.cash - 650 + proposed.totals.profit, 9);
    expect(plan.delta.endingCash).toBeCloseTo(proposed.totals.profit - current.totals.profit - 650, 9);
    expect(state.cash - booked.cash).toBe(650);
  });

  it('shows repair value after the exact 48-hour outage while keeping the faulted baseline offline', () => {
    const state = engine.create('repair-preview');
    state.assets[1].fault = true;
    state.assets[1].condition = 30;
    const plan = engine.servicePlan(state, windId);
    const current = engine.preview(state);
    const proposed = engine.preview(engine.apply(state, { type: 'service', assetId: windId }));
    expect(plan).toMatchObject({ repairsFault: true, conditionBefore: 30, conditionAfterService: 100,
      faultRiskBefore: null, faultRiskAfter: 0, returnHour: 48 });
    expect(current.hours.every(hour => hour.assets[1].status === 'fault' && hour.assets[1].power === 0)).toBe(true);
    expect(proposed.hours.slice(0, 48).every(hour => hour.assets[1].status === 'service' && hour.assets[1].power === 0)).toBe(true);
    expect(proposed.hours[48].assets[1].condition).toBe(100);
    expect(proposed.hours[48].assets[1].status).not.toBe('service');
    expect(proposed.hours.slice(48).some(hour => hour.assets[1].power > 0)).toBe(true);
    expect(plan.outage.delta.generation).toBe(0);
    expect(plan.outage.delta.served).toBe(0);
    expect(plan.delta.generation).toBeGreaterThan(0);
  });

  it('separates the first two days of lost generation from a worn generator\'s later recovery', () => {
    const state = engine.create('worn-service-tradeoff');
    state.assets[1].condition = 20;
    const plan = engine.servicePlan(state, windId);
    const current = engine.preview(state);
    const proposed = engine.preview(engine.apply(state, { type: 'service', assetId: windId }));
    expect(plan.repairsFault).toBe(false);
    expect(plan.outage.hours).toBe(48);
    for (const [label, run] of [['current', current], ['proposed', proposed]]) {
      for (const key of ['demand', 'served', 'unserved', 'generation']) {
        const total = run.hours.slice(0, 48).reduce((sum, hour) => sum + hour[key], 0);
        expect(plan.outage[label][key]).toBe(total);
      }
      expect(plan.outage[label].coverage).toBeCloseTo(plan.outage[label].served / plan.outage[label].demand, 12);
    }
    expect(plan.outage.delta.generation).toBeLessThan(0);
    expect(plan.delta.generation).toBeGreaterThan(0);
    expect(plan.outage.delta.demand).toBe(0);
  });

  it('accounts for a battery outage without losing or creating its stored energy', () => {
    const state = engine.create('battery-service-gap');
    state.assets[0].fault = true;
    state.assets[1].fault = true;
    state.assets[2].stored = 70;
    const plan = engine.servicePlan(state, 'asset-harbor-store');
    const proposed = engine.preview(engine.apply(state, { type: 'service', assetId: 'asset-harbor-store' }));
    expect(plan.serviceCost).toBe(350);
    expect(plan.outage.current.served).toBeGreaterThan(0);
    expect(plan.outage.proposed.served).toBe(0);
    expect(plan.outage.proposed.unserved).toBe(plan.outage.proposed.demand);
    expect(plan.outage.delta.unserved).toBeGreaterThan(0);
    expect(proposed.hours.slice(0, 48).every(hour => hour.stored === 70 && hour.charge === 0 && hour.discharge === 0)).toBe(true);
    expect(proposed.hours[48].discharge).toBeGreaterThan(0);
    expect(proposed.totals.initialStored + proposed.totals.charge - proposed.totals.discharge - proposed.totals.storageLoss).toBeCloseTo(proposed.totals.endStored, 8);
    expect(plan.proposed.served).toBe(proposed.totals.served);
    expect(state.assets[2].stored).toBe(70);
  });

  it('compares known plans without exposing any hidden future fault roll', () => {
    const state = commitEvent(engine.create('fault-trial'));
    state.assets.forEach(asset => { asset.condition = 10; });
    const plan = engine.servicePlan(state, windId);
    const forecast = engine.preview(state);
    expect(forecast.faults).toEqual([]);
    expect(plan.current.generation).toBe(forecast.totals.generation);
    expect(plan.faultRiskBefore).toBeGreaterThan(0);
    const realized = engine.apply(state, { type: 'advance' });
    expect(realized.history[0].faults.length).toBeGreaterThan(0);
    expect(plan.current.generation).toBeGreaterThan(realized.history[0].totals.generation);
    expect(plan).not.toHaveProperty('faults');
    expect(plan).not.toHaveProperty('faultHour');
  });

  it('does not mutate frozen campaign data or alter the later booked outcome', () => {
    const original = commitEvent(engine.create('immutable-service-plan'));
    const snapshot = clone(original);
    deepFreeze(original);
    const plan = engine.servicePlan(original, windId);
    const expected = engine.apply(engine.apply(snapshot, { type: 'service', assetId: windId }), { type: 'advance' });
    for (let i = 0; i < 3; i += 1) expect(engine.servicePlan(original, windId)).toEqual(plan);
    expect(original).toEqual(snapshot);
    expect(engine.apply(engine.apply(original, { type: 'service', assetId: windId }), { type: 'advance' })).toEqual(expected);
    plan.proposed.endingCash = -1;
    plan.outage.current.served = -1;
    const fresh = engine.servicePlan(original, windId);
    expect(fresh.proposed.endingCash).toBeGreaterThan(0);
    expect(fresh.outage.current.served).toBeGreaterThan(0);
    expect(engine.restore(JSON.stringify(original))).toEqual(snapshot);
  });
});

describe('Renewables Tycoon equipment inspection', () => {
  function oneHour(state, type, overrides = {}, equipmentOverrides = {}) {
    const asset = state.assets.find(item => item.type === type);
    const equipment = { id: asset.id, siteId: asset.siteId, type, power: 0, condition: asset.condition,
      available: true, status: 'idle', stored: 0, capacity: engine.catalog[type].capacity, ...equipmentOverrides };
    const frame = { hour: 0, day: 1, hourOfDay: 0, irradiance: 0, sunHeight: 0, windSpeed: 8,
      demand: 20, served: 20, unserved: 0, essentialDemand: 11, essentialServed: 11,
      assets: [equipment], ...overrides };
    return { run: { month: state.month, forecast: true, hours: [frame] }, assetId: equipment.id };
  }
  function freezeDeep(value) {
    Object.values(value).forEach(child => { if (child && typeof child === 'object') freezeDeep(child); });
    return Object.freeze(value);
  }

  it('returns null for missing equipment, frames, policy, or invalid hourly requests', () => {
    const state = engine.create(), run = engine.preview(state), id = state.assets[0].id;
    expect(engine.inspect(null, run, id, 0)).toBeNull();
    expect(engine.inspect(state, null, id, 0)).toBeNull();
    expect(engine.inspect({}, run, id, 0)).toBeNull();
    expect(engine.inspect(state, run, 'absent', 0)).toBeNull();
    for (const hour of [-1, 0.5, 744, NaN]) expect(engine.inspect(state, run, id, hour)).toBeNull();
    expect(engine.inspect(state, { ...run, hours: [] }, id, 0)).toBeNull();
  });

  it('distinguishes solar darkness from daylight and navigates to the next reason change, not a power fluctuation', () => {
    const state = engine.create('solar-inspection'), run = engine.preview(state), id = state.assets[0].id;
    const dawn = run.hours.find(hour => hour.irradiance > 0).hour;
    const dark = engine.inspect(state, run, id, 0);
    expect(dark).toMatchObject({ reason: 'darkness', flow: 'idle', context: 'forecast', nextChangeHour: dawn });
    const light = engine.inspect(state, run, id, dawn);
    const dusk = run.hours.find(hour => hour.hour > dawn && hour.irradiance === 0).hour;
    expect(light).toMatchObject({ reason: 'solar-output', nextChangeHour: dusk });
    expect(light.power).toBe(run.hours[dawn].assets[0].power);
    expect(light.readings).toEqual([
      { id: 'irradiance', label: 'Sunlight at site', value: run.hours[dawn].irradiance * 100, unit: '% reference' },
      { id: 'rated-power', label: 'Rated power', value: 40, unit: 'kW' },
      { id: 'output-factor', label: 'Condition output factor', value: 100, unit: '%' }
    ]);
    expect(engine.inspect(state, run, id, 743)).toMatchObject({ nextChangeHour: null, nextChangeLabel: null });
  });

  it.each([[2.99, 'wind-calm'], [3, 'wind-output'], [11, 'wind-output'], [24.99, 'wind-output'], [25, 'wind-cutout']])(
    'uses the site-adjusted turbine speed at the %s m/s operating boundary', (speed, reason) => {
      const state = engine.create();
      const frame = oneHour(state, 'wind', { windSpeed: speed / 1.1 }, { siteId: 'ridge-wind', id: 'asset-ridge-wind' });
      const diagnostic = engine.inspect(state, frame.run, frame.assetId, 0);
      expect(diagnostic.reason).toBe(reason);
      expect(diagnostic.readings.find(reading => reading.id === 'wind-speed').value).toBeCloseTo(speed, 12);
      expect(diagnostic.readings.find(reading => reading.id === 'cut-in').value).toBe(3);
      expect(diagnostic.readings.find(reading => reading.id === 'cut-out').value).toBe(25);
    }
  );

  it('keeps construction and scheduled outages isolated despite favorable weather or an old fault flag', () => {
    let state = engine.apply(engine.create(), { type: 'buy', siteId: 'school-roofs' });
    state.assets[1].fault = true;
    state = engine.apply(state, { type: 'service', assetId: 'asset-north-bluff' });
    const run = engine.preview(state);
    expect(engine.inspect(state, run, 'asset-school-roofs', 12)).toMatchObject({ reason: 'building', flow: 'isolated', available: false, nextChangeHour: null });
    expect(engine.inspect(state, run, 'asset-north-bluff', 0)).toMatchObject({ reason: 'service', flow: 'isolated', available: false,
      nextChangeHour: 48, nextChangeLabel: 'Inspect return to service' });
    expect(engine.inspect(state, run, 'asset-north-bluff', 47).reason).toBe('service');
    const returned = engine.inspect(state, run, 'asset-north-bluff', 48);
    expect(returned.reason).not.toBe('service');
    expect(returned.reason).not.toBe('fault');
    expect(returned.available).toBe(true);
    expect(returned.condition).toBe(100);
  });

  it('classifies actual charge/discharge before end-of-hour empty or full storage', () => {
    const state = engine.create();
    const charging = oneHour(state, 'battery', {}, { power: -5, stored: 100, status: 'operating' });
    const discharging = oneHour(state, 'battery', {}, { power: 5, stored: 0, status: 'operating' });
    expect(engine.inspect(state, charging.run, charging.assetId, 0)).toMatchObject({ reason: 'charging', flow: 'charge', power: -5 });
    expect(engine.inspect(state, discharging.run, discharging.assetId, 0)).toMatchObject({ reason: 'discharging', flow: 'export', power: 5 });
    for (const [stored, reason] of [[0, 'empty'], [100, 'full'], [40, 'standby']]) {
      const fixture = oneHour(state, 'battery', {}, { stored });
      expect(engine.inspect(state, fixture.run, fixture.assetId, 0)).toMatchObject({ reason, flow: 'idle', available: true });
    }
  });

  it('explains an idle protected reserve only when the remaining shortage is nonessential', () => {
    const state = engine.create();
    state.policy.reserve = 0.5;
    const fixture = oneHour(state, 'battery', { served: 11, unserved: 9 }, { stored: 40 });
    const protectedStore = engine.inspect(state, fixture.run, fixture.assetId, 0);
    expect(protectedStore).toMatchObject({ reason: 'reserve', flow: 'idle' });
    expect(protectedStore.detail).toContain('Reserve can still be released');
    fixture.run.hours[0].essentialServed = 8;
    expect(engine.inspect(state, fixture.run, fixture.assetId, 0).reason).toBe('standby');
    fixture.run.hours[0].essentialServed = 11;
    fixture.run.hours[0].unserved = 0;
    expect(engine.inspect(state, fixture.run, fixture.assetId, 0).reason).toBe('standby');
  });

  it('does not attribute a second pack\'s discharge or reserve behavior to an idle first pack', () => {
    const state = engine.create('fleet-inspection');
    state.assets[0].fault = true;
    state.assets[1].fault = true;
    state.assets[2].stored = 40;
    state.policy.reserve = 0.5;
    state.assets.push({ id: 'asset-civic-store', siteId: 'civic-store', type: 'battery', condition: 100,
      readyMonth: 0, serviceMonth: null, fault: false, stored: 100 });
    const run = engine.preview(state);
    expect(run.hours[0].discharge).toBeGreaterThan(0);
    expect(engine.inspect(state, run, 'asset-harbor-store', 0)).toMatchObject({ reason: 'standby', power: 0, flow: 'idle' });
    expect(engine.inspect(state, run, 'asset-civic-store', 0)).toMatchObject({ reason: 'discharging', flow: 'export' });
    const first = engine.inspect(state, run, 'asset-harbor-store', 0);
    expect(first.readings.find(reading => reading.id === 'stored').value).toBe(40);
    expect(first.readings.find(reading => reading.id === 'reserve').value).toBe(50);
    expect(first.readings.find(reading => reading.id === 'power-limit').value).toBe(25);
  });

  it('uses recorded frame status before a terminal fault and the recorded policy for replay readings', () => {
    let ended;
    for (let i = 0; i < 50 && !ended; i += 1) {
      let state = engine.create('terminal-inspection-' + i);
      state.assets[0].fault = true;
      state.assets[2].fault = true;
      state.assets[1].condition = 0;
      state = commitEvent(state);
      state.cash = 0;
      state = engine.apply(state, { type: 'advance' });
      if (state.phase === 'insolvent' && state.history[0].faults.some(fault => fault.assetId === 'asset-north-bluff' && !fault.existing)) ended = state;
    }
    expect(ended).toBeDefined();
    const run = engine.preview(ended);
    const fault = run.faults.find(item => item.assetId === 'asset-north-bluff' && !item.existing);
    expect(ended.assets[1].fault).toBe(true);
    expect(engine.inspect(ended, run, 'asset-north-bluff', 0).reason).not.toBe('fault');
    const broken = engine.inspect(ended, run, 'asset-north-bluff', fault.hour);
    expect(broken).toMatchObject({ reason: 'fault', context: 'replay', flow: 'isolated', available: false });
    expect(broken.detail).toContain('selected replay hour');
    expect(broken.detail).not.toContain('booking');
    const recordedReserve = ended.lastRun.policy.reserve;
    ended.policy.reserve = recordedReserve === 0.5 ? 0 : 0.5;
    expect(engine.inspect(ended, run, 'asset-harbor-store', 0).readings.find(reading => reading.id === 'reserve').value).toBe(100 * recordedReserve);
  });

  it('finds the next changed reason without wrapping or mistaking power variation for a change', () => {
    const state = engine.create(), fixture = oneHour(state, 'battery', {}, { stored: 20, power: -4, status: 'operating' });
    const original = fixture.run.hours[0];
    fixture.run.hours = [original,
      { ...original, hour: 1, assets: [{ ...original.assets[0], power: -8, stored: 28 }] },
      { ...original, hour: 2, assets: [{ ...original.assets[0], power: 3, stored: 25 }] }
    ];
    expect(engine.inspect(state, fixture.run, fixture.assetId, 0)).toMatchObject({ nextChangeHour: 2, nextChangeLabel: 'Next discharging hour' });
    expect(engine.inspect(state, fixture.run, fixture.assetId, 2)).toMatchObject({ nextChangeHour: null, nextChangeLabel: null });
  });

  it('reads frozen forecasts without revealing future faults or changing the eventual operation', () => {
    const state = commitEvent(engine.create('fault-trial'));
    state.assets.forEach(asset => { asset.condition = 10; });
    const before = clone(state), run = engine.preview(state), beforeRun = structuredClone(run);
    freezeDeep(state); freezeDeep(run);
    for (const hour of [0, 12, 47, 48, 201, 743]) {
      for (const asset of state.assets) {
        const result = engine.inspect(state, run, asset.id, hour);
        expect(result.reason).not.toBe('fault');
        expect(result.nextChangeLabel).not.toBe('Next fault hour');
        expect(result.readings.length).toBeLessThanOrEqual(3);
        result.readings[0].value = -999;
      }
    }
    expect(state).toEqual(before);
    expect(run).toEqual(beforeRun);
    expect(engine.apply(state, { type: 'advance' })).toEqual(engine.apply(before, { type: 'advance' }));
    expect(engine.apply(state, { type: 'advance' }).history[0].faults.some(fault => !fault.existing)).toBe(true);
  });
});

describe('Renewables Tycoon equipment operating records', () => {
  function assertAccounting(record) {
    expect(record.availableHours + record.serviceHours + record.faultHours + record.constructionHours).toBe(record.hours);
    expect(record.segments.reduce((total, segment) => total + segment.endHour - segment.startHour, 0)).toBe(record.hours);
    for (let i = 1; i < record.segments.length; i += 1) {
      expect(record.segments[i].startHour).toBe(record.segments[i - 1].endHour);
      expect(record.segments[i].status).not.toBe(record.segments[i - 1].status);
    }
  }

  it('counts connected idle hours as available and construction as a complete isolated interval', () => {
    const state = engine.apply(engine.create('record-construction'), { type: 'buy', siteId: 'school-roofs' });
    const run = engine.preview(state);
    const solar = engine.equipmentRecord(state, run, 'asset-harbor-roofs');
    expect(run.hours.some(hour => hour.assets[0].status === 'idle')).toBe(true);
    expect(solar).toMatchObject({ name: 'Harbor roofs', context: 'forecast', hours: 744, availableHours: 744,
      serviceHours: 0, faultHours: 0, constructionHours: 0, charge: 0, discharge: 0, conditionHistory: [], currentCondition: 100 });
    expect(solar.segments).toEqual([{ startHour: 0, endHour: 744, status: 'available' }]);
    expect(solar.generation).toBe(run.hours.reduce((sum, hour) => sum + hour.assets[0].power, 0));
    const building = engine.equipmentRecord(state, run, 'asset-school-roofs');
    expect(building).toMatchObject({ availableHours: 0, constructionHours: 744, generation: 0, conditionHistory: [] });
    expect(building.segments).toEqual([{ startHour: 0, endHour: 744, status: 'building' }]);
    assertAccounting(solar); assertAccounting(building);
  });

  it('records exactly 48 service hours and joins all later operating and idle hours into one available interval', () => {
    let state = engine.create('record-service');
    state.assets[1].fault = true;
    state.assets[1].condition = 30;
    state = engine.apply(state, { type: 'service', assetId: 'asset-north-bluff' });
    const run = engine.preview(state), record = engine.equipmentRecord(state, run, 'asset-north-bluff');
    expect(record).toMatchObject({ serviceHours: 48, availableHours: 696, faultHours: 0, currentCondition: 30 });
    expect(record.segments).toEqual([
      { startHour: 0, endHour: 48, status: 'service' }, { startHour: 48, endHour: 744, status: 'available' }
    ]);
    expect(record.generation).toBeGreaterThan(0);
    expect(run.hours[48].assets[1].condition).toBe(100);
    assertAccounting(record);
  });

  it('uses realized fault frames in replay and never substitutes the campaign ending fault for earlier available hours', () => {
    let state = engine.create('fault-trial');
    state.assets.forEach(asset => { asset.condition = 10; });
    state = advance(state);
    const fault = state.history[0].faults.find(item => !item.existing);
    expect(fault).toBeDefined();
    const replay = engine.preview({ ...state, phase: 'complete' });
    const record = engine.equipmentRecord(state, replay, fault.assetId);
    expect(record).toMatchObject({ context: 'replay', month: 0, monthName: 'January', availableHours: fault.hour,
      faultHours: 744 - fault.hour, serviceHours: 0, constructionHours: 0 });
    expect(record.segments).toEqual([
      { startHour: 0, endHour: fault.hour, status: 'available' }, { startHour: fault.hour, endHour: 744, status: 'fault' }
    ]);
    expect(record.conditionHistory).toEqual([expect.objectContaining({ month: 0, fault: true })]);
    const following = engine.equipmentRecord(state, engine.preview(state), fault.assetId);
    expect(following).toMatchObject({ context: 'forecast', faultHours: 672, availableHours: 0 });
    expect(following.segments).toEqual([{ startHour: 0, endHour: 672, status: 'fault' }]);
    assertAccounting(record); assertAccounting(following);
  });

  it('measures each battery independently from its own signed dispatch and reconciles to the network', () => {
    let state = engine.apply(engine.create('record-storage'), { type: 'buy', siteId: 'civic-store' });
    state = engine.apply(state, { type: 'buy', siteId: 'school-roofs' });
    state = advance(state);
    const run = engine.preview(state);
    const records = state.assets.filter(asset => asset.type === 'battery').map(asset => engine.equipmentRecord(state, run, asset.id));
    for (const record of records) {
      const rows = run.hours.map(hour => hour.assets.find(asset => asset.id === record.assetId));
      expect(record.charge).toBe(rows.reduce((sum, row) => sum + Math.max(0, -row.power), 0));
      expect(record.discharge).toBe(rows.reduce((sum, row) => sum + Math.max(0, row.power), 0));
      expect(record.generation).toBe(0);
      assertAccounting(record);
    }
    expect(records.reduce((sum, record) => sum + record.charge, 0)).toBeCloseTo(run.totals.charge, 8);
    expect(records.reduce((sum, record) => sum + record.discharge, 0)).toBeCloseTo(run.totals.discharge, 8);
    expect(records[0].charge).not.toBe(records[1].charge);
    expect(records[0].discharge).not.toBe(records[1].discharge);
  });

  it('excludes purchase and construction months from condition history and keeps recorded values after service', () => {
    let state = engine.apply(engine.create('record-history'), { type: 'buy', siteId: 'ridge-wind' });
    state = advance(state);
    expect(state.history[0].conditionByAsset.some(asset => asset.id === 'asset-ridge-wind')).toBe(true);
    expect(engine.equipmentRecord(state, engine.preview(state), 'asset-ridge-wind').conditionHistory).toEqual([]);
    state = advance(state);
    const firstOperation = state.history[1].conditionByAsset.find(asset => asset.id === 'asset-ridge-wind');
    state = engine.apply(state, { type: 'service', assetId: 'asset-ridge-wind' });
    const beforeResolve = engine.equipmentRecord(state, engine.preview(state), 'asset-ridge-wind');
    expect(beforeResolve.conditionHistory).toEqual([{ month: 1, monthName: 'February', condition: firstOperation.condition, fault: firstOperation.fault }]);
    state = advance(state);
    const record = engine.equipmentRecord(state, engine.preview(state), 'asset-ridge-wind');
    expect(record.conditionHistory.map(item => item.month)).toEqual([1, 2]);
    const march = state.history[2].conditionByAsset.find(asset => asset.id === 'asset-ridge-wind');
    expect(record.conditionHistory[1]).toEqual({ month: 2, monthName: 'March', condition: march.condition, fault: march.fault });
    expect(record.conditionHistory[1]).not.toHaveProperty('serviced');
    expect(record.currentCondition).toBe(state.assets.find(asset => asset.id === 'asset-ridge-wind').condition);
  });

  it('keeps completed records on December and includes its recorded condition without inventing a thirteenth month', () => {
    const state = sensibleCampaign(), run = engine.preview(state);
    const record = engine.equipmentRecord(state, run, 'asset-north-bluff');
    expect(record).toMatchObject({ context: 'replay', month: 11, monthName: 'December', hours: 744 });
    expect(record.conditionHistory).toHaveLength(12);
    expect(record.conditionHistory.at(-1).month).toBe(11);
    expect(record.currentCondition).toBe(state.assets[1].condition);
    assertAccounting(record);
  });

  it('leaves absent legacy condition observations absent and never adds an unresolved current-month sample', () => {
    const state = advance(engine.create('record-missing-history'));
    state.history[0].conditionByAsset = state.history[0].conditionByAsset.filter(asset => asset.id !== 'asset-harbor-roofs');
    state.history.push({ month: state.month, conditionByAsset: [{ id: 'asset-harbor-roofs', condition: 4, fault: true }] });
    expect(engine.equipmentRecord(state, engine.preview(state), 'asset-harbor-roofs').conditionHistory).toEqual([]);
  });

  it('rejects incomplete or contradictory hourly records rather than inventing partial accounting', () => {
    const state = engine.create(), run = engine.preview(state), id = 'asset-harbor-roofs';
    for (const args of [[null, run, id], [state, null, id], [state, run, 'absent'], [state, { ...run, hours: [] }, id],
      [state, { ...run, hours: run.hours.slice(24) }, id], [state, { ...run, hours: run.hours.slice(0, -1) }, id]]) {
      expect(engine.equipmentRecord(...args)).toBeNull();
    }
    for (const change of [
      data => { data.hours[4].assets = data.hours[4].assets.filter(asset => asset.id !== id); },
      data => { data.hours[4].assets.push(data.hours[4].assets[0]); },
      data => { data.hours[4].hour = 6; },
      data => { data.hours[4].assets[0].power = NaN; },
      data => { data.hours[4].assets[0].available = false; },
      data => { data.hours[4].assets[0].status = 'fault'; },
      data => { data.hours[4].assets[0].power = -1; }
    ]) {
      const malformed = structuredClone(run);
      change(malformed);
      expect(engine.equipmentRecord(state, malformed, id)).toBeNull();
    }
  });

  it('reads frozen state and frames without exposing upcoming faults or changing actual outcomes', () => {
    const state = commitEvent(engine.create('fault-trial'));
    state.assets.forEach(asset => { asset.condition = 10; });
    const run = engine.preview(state), beforeState = structuredClone(state), beforeRun = structuredClone(run);
    function freezeDeep(value) {
      Object.values(value).forEach(child => { if (child && typeof child === 'object') freezeDeep(child); });
      return Object.freeze(value);
    }
    freezeDeep(state); freezeDeep(run);
    for (const asset of state.assets) {
      const record = engine.equipmentRecord(state, run, asset.id);
      expect(record.faultHours).toBe(0);
      expect(record.segments).toEqual([{ startHour: 0, endHour: 744, status: 'available' }]);
      record.segments[0].endHour = -1;
      record.conditionHistory.push({ month: 0, condition: 0, fault: true });
    }
    expect(state).toEqual(beforeState);
    expect(run).toEqual(beforeRun);
    expect(engine.apply(state, { type: 'advance' })).toEqual(engine.apply(beforeState, { type: 'advance' }));
    expect(engine.apply(state, { type: 'advance' }).history[0].faults.some(fault => !fault.existing)).toBe(true);
  });
});

describe('Renewables Tycoon acquisition planning', () => {
  it.each(['school-roofs', 'ridge-wind', 'civic-store'])('keeps %s under construction with no immediate energy and charges acquisition once plus construction overhead', siteId => {
    const state = engine.create('acquisition-construction'), plan = engine.acquisitionPlan(state, siteId);
    const site = engine.sites.find(item => item.id === siteId), spec = engine.catalog[site.type];
    expect(plan).toMatchObject({ siteId, type: site.type, name: site.name, eligible: true, acquisitionBlock: null,
      equipmentCost: spec.cost, landCost: site.landCost, totalCost: spec.cost + site.landCost,
      monthlyCost: spec.monthlyCost, constructionCost: spec.monthlyCost * 0.2,
      readyMonth: 1, readyMonthName: 'February', cashAfterPurchase: state.cash - spec.cost - site.landCost });
    expect(plan.currentMonth.delta.generation).toBe(0);
    expect(plan.currentMonth.delta.coverage).toBe(0);
    expect(plan.currentMonth.delta.unserved).toBe(0);
    expect(plan.currentMonth.delta.revenue).toBe(0);
    expect(plan.currentMonth.delta.operatingCost).toBeCloseTo(spec.monthlyCost * 0.2, 10);
    expect(plan.currentMonth.delta.endingCash).toBeCloseTo(-plan.totalCost - plan.constructionCost, 8);
    const booked = engine.apply(state, { type: 'buy', siteId });
    const actualPlan = engine.preview(booked);
    expect(actualPlan.hours.every(hour => hour.assets.at(-1).status === 'building' && hour.assets.at(-1).power === 0)).toBe(true);
    expect(plan.currentMonth.proposed.endingCash).toBe(actualPlan.totals.endingCash);
    expect(booked.assets.at(-1).readyMonth).toBe(1);
  });

  it('separates renewable generator contributions from battery energy transfers in the commissioned-now study', () => {
    const state = engine.create('acquisition-contribution');
    for (const siteId of ['school-roofs', 'ridge-wind']) {
      const plan = engine.acquisitionPlan(state, siteId);
      expect(plan.study.candidate.generation).toBeGreaterThan(0);
      expect(plan.study.candidate.generation).toBeCloseTo(plan.study.delta.generation, 8);
      expect(plan.study.candidate.charge).toBe(0);
      expect(plan.study.candidate.discharge).toBe(0);
    }
    const battery = engine.acquisitionPlan(state, 'civic-store');
    expect(battery.study.candidate.generation).toBe(0);
    expect(battery.study.delta.generation).toBe(0);
    expect(battery.study.candidate.charge).toBeGreaterThan(0);
    expect(battery.study.candidate.discharge).toBeGreaterThan(0);
    expect(battery.study.candidate.discharge).toBeLessThanOrEqual(battery.study.candidate.charge * 0.95 * 0.95 + 1e-8);
    expect(battery.study.delta.served).toBeGreaterThanOrEqual(-1e-8);
    for (const scenario of ['current', 'proposed', 'delta']) expect(battery.study[scenario]).not.toHaveProperty('endingCash');
  });

  it('uses exact current-condition study totals while leaving existing construction, service and known faults in place', () => {
    let state = engine.apply(engine.create('acquisition-existing-plan'), { type: 'buy', siteId: 'school-roofs' });
    state.assets[0].fault = true;
    state = engine.apply(state, { type: 'service', assetId: 'asset-north-bluff' });
    const before = structuredClone(state), plan = engine.acquisitionPlan(state, 'civic-store');
    const studyState = engine.apply(state, { type: 'buy', siteId: 'civic-store' });
    studyState.assets.find(asset => asset.siteId === 'civic-store').readyMonth = state.month;
    const current = engine.preview(state), study = engine.preview(studyState);
    const keys = ['coverage', 'served', 'unserved', 'generation', 'charge', 'discharge', 'curtailed', 'revenue', 'operatingCost', 'profit'];
    expect(Object.keys(plan.study.current)).toEqual(keys);
    for (const key of keys) {
      expect(plan.study.current[key]).toBe(current.totals[key]);
      expect(plan.study.proposed[key]).toBe(study.totals[key]);
      expect(plan.study.delta[key]).toBe(study.totals[key] - current.totals[key]);
    }
    expect(study.hours.every(hour => hour.assets.find(asset => asset.siteId === 'school-roofs').status === 'building')).toBe(true);
    expect(study.hours.every(hour => hour.assets[0].status === 'fault')).toBe(true);
    expect(study.hours.slice(0, 48).every(hour => hour.assets[1].status === 'service')).toBe(true);
    expect(study.hours[48].assets[1].status).not.toBe('service');
    expect(study.hours.map(hour => [hour.windSpeed, hour.irradiance, hour.demand])).toEqual(current.hours.map(hour => [hour.windSpeed, hour.irradiance, hour.demand]));
    expect(study.totals.initialStored).toBe(current.totals.initialStored);
    expect(state).toEqual(before);
  });

  it('does not simulate blocked sites and distinguishes ownership, cash, late construction and terminal phases', () => {
    const cases = [];
    const owned = engine.create(); owned.policy = null;
    cases.push([owned, 'harbor-roofs', 'owned']);
    const poor = engine.create(); poor.cash = 14999; poor.policy = null;
    cases.push([poor, 'civic-store', 'cash']);
    const late = engine.create(); late.month = 11; late.policy = null;
    cases.push([late, 'civic-store', 'late']);
    const complete = engine.create(); complete.month = 12; complete.phase = 'complete'; complete.policy = null;
    cases.push([complete, 'civic-store', 'ended']);
    const insolvent = engine.create(); insolvent.month = 1; insolvent.cash = -1; insolvent.phase = 'insolvent'; insolvent.policy = null;
    cases.push([insolvent, 'civic-store', 'ended']);
    cases.push([null, 'civic-store', 'unknown']);
    cases.push([engine.create(), 'missing-site', 'unknown']);
    for (const [state, siteId, reason] of cases) {
      const before = structuredClone(state);
      expect(engine.acquisitionPlan(state, siteId)).toMatchObject({ eligible: false, acquisitionBlock: reason, currentMonth: null, study: null });
      expect(state).toEqual(before);
    }
  });

  it('allows the exact acquisition budget and the final viable November construction month', () => {
    const state = engine.create(); state.cash = 15000; state.month = 10;
    const plan = engine.acquisitionPlan(state, 'civic-store');
    expect(plan).toMatchObject({ eligible: true, cashAfterPurchase: 0, readyMonth: 11, readyMonthName: 'December' });
    expect(engine.apply(state, { type: 'buy', siteId: 'civic-store' }).cash).toBe(0);
    state.month = 11;
    expect(engine.acquisitionPlan(state, 'civic-store')).toMatchObject({ eligible: false, acquisitionBlock: 'late', readyMonth: null, readyMonthName: null });
  });

  it('never reads a future seasonal event or simulates a future month for the commissioned-now study', () => {
    const guardedSource = fs.readFileSync('stem_lab/renewables_tycoon_engine.js', 'utf8')
      .replace('function eventFor(seed, month) {', 'function eventFor(seed, month) { if (month !== 0) throw new Error("Future event read");')
      .replace('function simulate(state, realize) {', 'function simulate(state, realize) { if (state.month !== 0 || realize) throw new Error("Future or realized simulation");');
    const context = { module: { exports: {} } };
    vm.runInNewContext(guardedSource, context);
    const guarded = context.module.exports;
    const state = guarded.create('current-month-only');
    const plan = guarded.acquisitionPlan(state, 'ridge-wind');
    expect(plan.eligible).toBe(true);
    expect(plan.readyMonth).toBe(1);
    expect(plan.study.candidate.generation).toBeGreaterThan(0);
    expect(state.month).toBe(0);
    expect(state.eventChoice).toBeNull();
  });

  it('does not mutate frozen plans, persist early commissioning or alter later operating outcomes', () => {
    const state = commitEvent(engine.create('acquisition-immutable'));
    const before = structuredClone(state);
    function freezeDeep(value) {
      Object.values(value).forEach(child => { if (child && typeof child === 'object') freezeDeep(child); });
      return Object.freeze(value);
    }
    freezeDeep(state);
    const plan = engine.acquisitionPlan(state, 'ridge-wind');
    plan.currentMonth.current.endingCash = -999;
    plan.study.candidate.generation = -1;
    const repeated = engine.acquisitionPlan(state, 'ridge-wind');
    expect(repeated.currentMonth.current.endingCash).toBeGreaterThan(0);
    expect(repeated.study.candidate.generation).toBeGreaterThan(0);
    expect(state).toEqual(before);
    const purchased = engine.apply(state, { type: 'buy', siteId: 'ridge-wind' });
    expect(purchased.assets.at(-1).readyMonth).toBe(1);
    expect(purchased.assets.at(-1).stored).toBe(0);
    expect(engine.apply(purchased, { type: 'advance' })).toEqual(engine.apply(engine.apply(before, { type: 'buy', siteId: 'ridge-wind' }), { type: 'advance' }));
    expect(engine.restore(JSON.stringify(state))).toEqual(before);
  });
});

describe('Renewables Tycoon hourly dispatch balance', () => {
  it('reconciles every hourly grid route and storage opening, closing, and loss balance', () => {
    let state = engine.apply(engine.create('hour-balance'), { type: 'buy', siteId: 'ridge-wind' });
    state = engine.apply(state, { type: 'buy', siteId: 'school-roofs' });
    state = advance(state);
    const run = engine.preview(state);
    let sawCharge = false, sawDischarge = false, sawFull = false;
    for (const frame of run.hours) {
      const result = engine.dispatchBalance(state, run, frame.hour);
      expect(result).not.toBeNull();
      const { grid, storage, batteries } = result;
      expect(grid.directToLoad).toBe(Math.min(frame.generation, frame.demand));
      expect(grid.generation + grid.discharge).toBeCloseTo(grid.served + grid.charge + grid.curtailed, 9);
      expect(grid.served + grid.unserved).toBeCloseTo(grid.demand, 9);
      expect(storage.start + grid.charge - grid.discharge - storage.loss).toBeCloseTo(storage.end, 9);
      expect(storage.start).toBe(frame.hour ? run.hours[frame.hour - 1].stored : run.totals.initialStored);
      expect(storage.end).toBe(frame.stored);
      expect(storage.loss).toBe(frame.storageLoss);
      for (const battery of batteries) {
        expect(battery.startStored + battery.charge - battery.discharge - battery.loss).toBeCloseTo(battery.endStored, 9);
        expect(battery.ordinaryDischarge + battery.reserveDischarge).toBeCloseTo(battery.discharge, 12);
        expect(battery.charge > 0 && battery.discharge > 0).toBe(false);
        if (battery.charge > 0) sawCharge = true;
        if (battery.discharge > 0) sawDischarge = true;
        if (battery.charge > 0 && battery.endStored === 100) {
          sawFull = true;
          expect(battery.loss).toBeCloseTo(battery.charge * 0.05, 12);
          expect(battery.charge).toBeCloseTo((100 - battery.startStored) / 0.95, 9);
        }
      }
    }
    expect(sawCharge && sawDischarge && sawFull).toBe(true);
  });

  it('keeps another battery\'s ordinary energy separate from an idle pack\'s protected reserve', () => {
    const state = engine.create('balance-fleet-ordinary');
    state.assets[0].fault = true; state.assets[1].fault = true;
    state.assets[2].stored = 40; state.policy.reserve = 0.5;
    state.assets.push({ id: 'asset-civic-store', siteId: 'civic-store', type: 'battery', condition: 100,
      readyMonth: 0, serviceMonth: null, fault: false, stored: 100 });
    const run = engine.preview(state), result = engine.dispatchBalance(state, run, 0);
    const first = result.batteries.find(asset => asset.assetId === 'asset-harbor-store');
    const second = result.batteries.find(asset => asset.assetId === 'asset-civic-store');
    expect(first).toMatchObject({ startStored: 40, endStored: 40, ordinaryDischarge: 0, reserveDischarge: 0, discharge: 0, loss: 0 });
    expect(second.ordinaryDischarge).toBe(result.grid.demand);
    expect(second.reserveDischarge).toBe(0);
    expect(result.grid.unserved).toBe(0);
    expect(result.storage.start).toBe(140);
  });

  it('identifies reserve release only after ordinary fleet energy and only for remaining essential demand', () => {
    const state = engine.create('balance-fleet-reserve');
    state.assets[0].fault = true; state.assets[1].fault = true;
    state.assets[2].stored = 40; state.policy.reserve = 0.5;
    state.assets.push({ id: 'asset-civic-store', siteId: 'civic-store', type: 'battery', condition: 100,
      readyMonth: 0, serviceMonth: null, fault: false, stored: 52 });
    const result = engine.dispatchBalance(state, engine.preview(state), 0);
    const first = result.batteries[0], second = result.batteries[1];
    expect(second.ordinaryDischarge).toBeCloseTo(1.9, 12);
    expect(second.reserveDischarge).toBe(0);
    expect(first.ordinaryDischarge).toBe(0);
    expect(first.reserveDischarge).toBeCloseTo(result.grid.essentialDemand - 1.9, 12);
    expect(result.grid.served).toBeCloseTo(result.grid.essentialDemand, 12);
    expect(result.grid.essentialServed).toBe(result.grid.essentialDemand);
    expect(result.grid.unserved).toBeGreaterThan(0);
  });

  it('retains energy in faulted and serviced packs without inventing flow or losses', () => {
    for (const kind of ['fault', 'service']) {
      let state = engine.create('balance-offline');
      state.assets[0].fault = true; state.assets[1].fault = true;
      state.assets[2].stored = 70;
      if (kind === 'fault') state.assets[2].fault = true;
      else state = engine.apply(state, { type: 'service', assetId: 'asset-harbor-store' });
      const run = engine.preview(state);
      for (const hour of [0, 24, 47]) {
        const result = engine.dispatchBalance(state, run, hour);
        expect(result.batteries[0]).toMatchObject({ status: kind, available: false, startStored: 70, endStored: 70,
          charge: 0, discharge: 0, loss: 0, ordinaryDischarge: 0, reserveDischarge: 0 });
        expect(result.grid.unserved).toBe(result.grid.demand);
      }
      if (kind === 'service') expect(engine.dispatchBalance(state, run, 48).batteries[0].discharge).toBeGreaterThan(0);
    }
    const building = engine.apply(engine.create(), { type: 'buy', siteId: 'civic-store' });
    expect(engine.dispatchBalance(building, engine.preview(building), 12).batteries.find(asset => asset.siteId === 'civic-store'))
      .toMatchObject({ status: 'building', available: false, startStored: 0, endStored: 0, charge: 0, discharge: 0, loss: 0 });
  });

  it('uses the recorded replay opening energy and policy rather than the campaign ending balances', () => {
    const state = sensibleCampaign('dispatch-replay'), run = engine.preview(state);
    const initial = state.lastRun.assets.filter(asset => asset.type === 'battery').reduce((sum, asset) => sum + asset.stored, 0);
    const reserve = state.lastRun.policy.reserve;
    state.policy.reserve = reserve === 0.5 ? 0 : 0.5;
    state.assets.filter(asset => asset.type === 'battery').forEach(asset => { asset.stored = 0; });
    const result = engine.dispatchBalance(state, run, 0);
    expect(result).toMatchObject({ context: 'replay', hour: 0, storage: { start: initial, end: run.hours[0].stored, loss: run.hours[0].storageLoss } });
    for (const battery of result.batteries) expect(battery.reserveFloor).toBe(battery.capacity * reserve);
    const following = engine.dispatchBalance(state, run, 1);
    expect(following.storage.start).toBe(result.storage.end);
    expect(following.context).toBe('replay');
  });

  it('rejects malformed or mismatched data instead of synthesizing balancing energy or losses', () => {
    const state = engine.create(), run = engine.preview(state);
    expect(engine.dispatchBalance(null, run, 0)).toBeNull();
    expect(engine.dispatchBalance(state, null, 0)).toBeNull();
    expect(engine.dispatchBalance(state, run, -1)).toBeNull();
    expect(engine.dispatchBalance(state, run, 744)).toBeNull();
    expect(engine.dispatchBalance({ ...state, month: 1 }, run, 0)).toBeNull();
    expect(engine.dispatchBalance(state, { ...run, forecast: false }, 0)).toBeNull();
    expect(engine.dispatchBalance(state, { ...run, hours: run.hours.slice(1) }, 1)).toBeNull();
    for (const modify of [
      data => { data.hours[0].assets[2].stored += 1; },
      data => { data.hours[0].storageLoss += 1; },
      data => { data.hours[0].assets[2].power = 26; },
      data => { data.hours[0].assets[2].available = false; },
      data => { data.hours[0].assets[2].type = 'missing'; },
      data => { data.hours[0].assets[2] = data.hours[0].assets[0]; },
      data => { data.hours[0].generation += 1; }
    ]) {
      const malformed = structuredClone(run); modify(malformed);
      expect(engine.dispatchBalance(state, malformed, 0)).toBeNull();
    }
  });

  it('returns detached values without changing frozen forecasts or revealing future fault rolls', () => {
    const state = commitEvent(engine.create('fault-trial'));
    state.assets.forEach(asset => { asset.condition = 10; });
    const run = engine.preview(state), originalState = structuredClone(state), originalRun = structuredClone(run);
    function freezeDeep(value) {
      Object.values(value).forEach(child => { if (child && typeof child === 'object') freezeDeep(child); });
      return Object.freeze(value);
    }
    freezeDeep(state); freezeDeep(run);
    for (const hour of [0, 24, 201, 743]) {
      const balance = engine.dispatchBalance(state, run, hour);
      expect(balance.context).toBe('forecast');
      expect(balance.batteries.every(asset => asset.status !== 'fault')).toBe(true);
      balance.grid.generation = -1; balance.storage.end = -1; balance.batteries[0].endStored = -1;
    }
    expect(state).toEqual(originalState); expect(run).toEqual(originalRun);
    expect(engine.apply(state, { type: 'advance' })).toEqual(engine.apply(originalState, { type: 'advance' }));
    expect(engine.apply(state, { type: 'advance' }).history[0].faults.some(fault => !fault.existing)).toBe(true);
  });
});

describe('Renewables Tycoon equipment operating limits', () => {
  // A complete hourly record with deliberately high first-hour dispatch pressure
  // tests converter ceilings that ordinary starter-town demand rarely reaches.
  function batteryRun({ stored = 100, demand = 0, generation = 0, reserve = 0 } = {}) {
    const state = engine.create('constraint-bench');
    state.policy.reserve = reserve;
    state.assets[2].stored = stored;
    const balances = { [state.assets[2].id]: stored }, throughput = { [state.assets[2].id]: 0 };
    const hours = [];
    for (let hour = 0; hour < 744; hour++) {
      const load = hour ? 0 : demand, output = hour ? 0 : generation;
      const solar = Math.min(40, output), wind = output - solar;
      const rows = state.assets.map(asset => ({ id: asset.id, siteId: asset.siteId, type: asset.type,
        power: asset.type === 'solar' ? solar : asset.type === 'wind' ? wind : 0,
        available: true, status: 'idle', condition: 100, stored: balances[asset.id] || 0,
        capacity: engine.catalog[asset.type].capacity }));
      rows.forEach(row => { if (row.power > 0) row.status = 'operating'; });
      const direct = Math.min(load, output), essential = load * 0.55;
      const dispatch = dispatchStorage(rows.filter(row => row.type === 'battery'), balances, throughput,
        output - direct, load - direct, Math.max(0, essential - direct), reserve);
      const served = load - dispatch.deficit;
      const solarSite = engine.sites.find(site => site.id === rows[0].siteId);
      const windSite = engine.sites.find(site => site.id === rows[1].siteId);
      hours.push({ hour, day: Math.floor(hour / 24) + 1, hourOfDay: hour % 24,
        solar, wind, generation: output, demand: load, served, unserved: dispatch.deficit,
        charge: dispatch.charge, discharge: dispatch.discharge, curtailed: dispatch.surplus,
        stored: balances[rows[2].id], capacity: 100, storageLoss: dispatch.loss,
        essentialDemand: essential, essentialServed: Math.min(essential, served),
        irradiance: solar / 40 / solarSite.resource,
        windSpeed: wind ? Math.cbrt(wind / 30 * (1331 - 27) + 27) / windSite.resource : 0,
        sunHeight: solar ? 1 : 0, assets: rows });
    }
    return { state, run: { month: 0, forecast: true, hours }, assetId: state.assets[2].id };
  }

  it('separates the battery converter ceiling from opening-energy and capacity ceilings', () => {
    const cases = [
      [{ stored: 100, demand: 40 }, ['converter'], 25, 100, 95],
      [{ stored: 10, demand: 40 }, ['empty'], 9.5, 10, 9.5],
      [{ stored: 0, generation: 60 }, ['converter'], -25, 0, 0],
      [{ stored: 95, generation: 60 }, ['full'], -5 / 0.95, 95, 90.25]
    ];
    for (const [inputs, binding, power, start, dischargeLimit] of cases) {
      const { state, run, assetId } = batteryRun(inputs);
      const result = engine.equipmentLimits(state, run, assetId, 0);
      expect(result.binding).toEqual(binding);
      expect(result.actualPower).toBeCloseTo(power, 10);
      expect(result.storage.startStored).toBe(start);
      expect(result.storage.dischargeEnergyLimit).toBeCloseTo(dischargeLimit, 10);
      expect(result.storage.chargeEnergyLimit).toBeCloseTo((100 - start) / 0.95, 10);
      expect(result.storage.chargePowerLimit).toBe(25);
      expect(result.storage.dischargePowerLimit).toBe(25);
      expect(result.nextConstrainedHour).toBeNull();
    }
  });

  it('retains simultaneous converter and energy, capacity, or reserve constraints', () => {
    for (const [inputs, bindings] of [
      [{ stored: 25 / 0.95, demand: 50 }, ['converter', 'empty']],
      [{ stored: 100 - 25 * 0.95, generation: 60 }, ['converter', 'full']],
      [{ stored: 50 + 25 / 0.95, demand: 40, reserve: 0.5 }, ['converter', 'reserve']]
    ]) {
      const { state, run, assetId } = batteryRun(inputs);
      expect(engine.equipmentLimits(state, run, assetId, 0).binding).toEqual(bindings);
    }
  });

  it('distinguishes reserve holding from empty storage and respects essential-demand release', () => {
    const { state, run, assetId } = batteryRun({ stored: 40, demand: 40, reserve: 0.5 });
    const result = engine.equipmentLimits(state, run, assetId, 0);
    expect(result).toMatchObject({ pressure: 'shortage', binding: ['reserve'], actualPower: 22,
      storage: { startStored: 40, reserveFloor: 50, ordinaryEnergyLimit: 0, actualDischarge: 22 } });
    expect(result.storage.endStored).toBeCloseTo(40 - 22 / 0.95, 10);
    const empty = batteryRun({ stored: 0, demand: 40, reserve: 0.5 });
    expect(engine.equipmentLimits(empty.state, empty.run, empty.assetId, 0).binding).toEqual(['empty']);
  });

  it('does not blame an idle reserve pack when another pack supplies the whole load', () => {
    const state = engine.create('constraint-fleet');
    state.assets[0].fault = true; state.assets[1].fault = true;
    state.assets[2].stored = 40; state.policy.reserve = 0.5;
    state.assets.push({ id: 'asset-civic-store', siteId: 'civic-store', type: 'battery', condition: 100,
      readyMonth: 0, serviceMonth: null, fault: false, stored: 100 });
    const result = engine.equipmentLimits(state, engine.preview(state), 'asset-harbor-store', 0);
    expect(result).toMatchObject({ pressure: 'balanced', binding: [], actualPower: 0,
      storage: { startStored: 40, endStored: 40, ordinaryEnergyLimit: 0 } });
  });

  it('reports no binding constraints without an unresolved network imbalance', () => {
    for (const stored of [0, 50, 100]) {
      const { state, run, assetId } = batteryRun({ stored, reserve: 0.5 });
      expect(engine.equipmentLimits(state, run, assetId, 0)).toMatchObject({ pressure: 'balanced', binding: [], nextConstrainedHour: null });
    }
    const state = engine.create('constraint-generation');
    state.assets[0].condition = 25; state.assets[1].condition = 25;
    const run = engine.preview(state);
    const hour = run.hours.find(frame => frame.curtailed > 0.01).hour;
    for (const asset of state.assets.filter(asset => asset.type !== 'battery')) {
      const result = engine.equipmentLimits(state, run, asset.id, hour);
      expect(result).toMatchObject({ pressure: 'surplus', binding: [] });
      expect(result.generation.conditionLoss).toBeGreaterThan(0);
    }
  });

  it('reconciles generation potential, condition loss, isolation, and actual power', () => {
    const state = engine.create('constraint-generation-breakdown');
    state.assets[0].condition = 40; state.assets[1].condition = 60;
    const run = engine.preview(state);
    for (const hour of [0, 12, 48, 300, 743]) {
      for (const asset of state.assets.filter(asset => asset.type !== 'battery')) {
        const result = engine.equipmentLimits(state, run, asset.id, hour), breakdown = result.generation;
        expect(breakdown.resourcePower).toBeCloseTo(breakdown.conditionLoss + breakdown.isolationLoss + breakdown.actualPower, 10);
        expect(breakdown.actualPower).toBe(run.hours[hour].assets.find(row => row.id === asset.id).power);
        expect(breakdown.isolationLoss).toBe(0);
        expect(breakdown.conditionLoss).toBeCloseTo(breakdown.resourcePower * (1 - (0.7 + asset.condition * 0.003)), 10);
        if (result.pressure === 'shortage') {
          if (breakdown.resourcePower < result.ratedPower - 0.000001) expect(result.binding).toContain('resource');
          if (breakdown.conditionLoss > 0.000001) expect(result.binding).toContain('condition');
        }
      }
    }
    state.assets[0].fault = true;
    const offlineRun = engine.preview(state);
    const offline = engine.equipmentLimits(state, offlineRun, state.assets[0].id, 12);
    expect(offline.generation.actualPower).toBe(0);
    expect(offline.generation.isolationLoss).toBeGreaterThan(0);
    expect(offline.generation.resourcePower).toBeCloseTo(offline.generation.conditionLoss + offline.generation.isolationLoss, 10);
    expect(offline.binding).toContain('fault');
  });

  it('reports the actual offline status instead of fictitious battery power or reserve limits', () => {
    for (const status of ['fault', 'service', 'building']) {
      let state = engine.create('constraint-offline');
      state.assets[0].fault = true; state.assets[1].fault = true;
      state.assets[2].stored = 70;
      let assetId = 'asset-harbor-store';
      if (status === 'fault') state.assets[2].fault = true;
      if (status === 'service') state = engine.apply(state, { type: 'service', assetId });
      if (status === 'building') {
        state.assets[2].fault = true;
        state = engine.apply(state, { type: 'buy', siteId: 'civic-store' }); assetId = 'asset-civic-store';
      }
      const result = engine.equipmentLimits(state, engine.preview(state), assetId, 0);
      expect(result).toMatchObject({ pressure: 'shortage', available: false, actualPower: 0, binding: [status],
        storage: { actualCharge: 0, actualDischarge: 0 } });
    }
    const state = engine.create('constraint-offline-surplus');
    state.assets[2].fault = true; state.assets[2].stored = 100;
    const run = engine.preview(state), hour = run.hours.find(frame => frame.curtailed > 0.01).hour;
    expect(engine.equipmentLimits(state, run, state.assets[2].id, hour))
      .toMatchObject({ pressure: 'surplus', binding: ['fault'], actualPower: 0 });
  });

  it('uses replay opening energy and reserve policy rather than the campaign ending state', () => {
    const state = sensibleCampaign('constraint-replay'), run = engine.preview(state);
    const original = state.lastRun.assets.find(asset => asset.type === 'battery');
    const reserve = state.lastRun.policy.reserve;
    state.policy.reserve = reserve === 0.5 ? 0 : 0.5;
    state.assets.filter(asset => asset.type === 'battery').forEach(asset => { asset.stored = 0; });
    const result = engine.equipmentLimits(state, run, original.id, 0);
    expect(result.context).toBe('replay');
    expect(result.storage.startStored).toBe(original.stored);
    expect(result.storage.reserveFloor).toBe(reserve * 100);
    expect(result.storage.dischargeEnergyLimit).toBeCloseTo(original.stored * 0.95, 10);
  });

  it('navigates only to a later constrained hour from the supplied record without wrapping', () => {
    const state = engine.create('constraint-navigation'), run = engine.preview(state), assetId = 'asset-harbor-store';
    const expected = run.hours.find(frame => frame.hour > 0 && frame.unserved > 0.000001
      && frame.assets.find(row => row.id === assetId).stored <= 0.000001).hour;
    expect(engine.equipmentLimits(state, run, assetId, 0).nextConstrainedHour).toBe(expected);
    expect(engine.equipmentLimits(state, run, assetId, 743).nextConstrainedHour).toBeNull();
  });

  it('rejects incomplete, mismatched, contradictory, or invalid data', () => {
    const state = engine.create('constraint-invalid'), run = engine.preview(state), assetId = state.assets[0].id;
    expect(engine.equipmentLimits(null, run, assetId, 0)).toBeNull();
    expect(engine.equipmentLimits(state, null, assetId, 0)).toBeNull();
    expect(engine.equipmentLimits(state, run, 'unknown', 0)).toBeNull();
    expect(engine.equipmentLimits(state, run, assetId, -1)).toBeNull();
    expect(engine.equipmentLimits(state, run, assetId, 744)).toBeNull();
    expect(engine.equipmentLimits(state, { ...run, hours: run.hours.slice(0, 5) }, assetId, 0)).toBeNull();
    for (const [hour, modify] of [
      [0, data => { data.hours[0].assets[0].condition = NaN; }],
      [0, data => { data.hours[0].irradiance = 2; }],
      [0, data => { data.hours[0].windSpeed = -1; }],
      [0, data => { data.hours[0].assets[2].stored += 1; }],
      [12, data => { data.hours[12].assets[0].condition = 50; }]
    ]) {
      const malformed = structuredClone(run); modify(malformed);
      expect(engine.equipmentLimits(state, malformed, assetId, hour)).toBeNull();
    }
  });

  it('reads frozen records without mutation, simulation, or hidden fault sampling', () => {
    const state = engine.create('constraint-pure'), run = engine.preview(state);
    const originalState = structuredClone(state), originalRun = structuredClone(run);
    function freezeDeep(value) {
      Object.values(value).forEach(child => { if (child && typeof child === 'object') freezeDeep(child); });
      return Object.freeze(value);
    }
    freezeDeep(state); freezeDeep(run);
    const source = fs.readFileSync('stem_lab/renewables_tycoon_engine.js', 'utf8')
      .replace('function simulate(state, realize) {', 'function simulate(state, realize) { throw new Error("No simulation");')
      .replace('function random(seed, key) {', 'function random(seed, key) { throw new Error("No randomness");');
    const context = { module: { exports: {} } }; vm.runInNewContext(source, context);
    for (const asset of state.assets) {
      const result = context.module.exports.equipmentLimits(state, run, asset.id, 0);
      expect(result).not.toBeNull(); result.binding.push('changed'); result.actualPower = -1;
      if (result.storage) result.storage.startStored = -1;
      if (result.generation) result.generation.resourcePower = -1;
    }
    expect(state).toEqual(originalState); expect(run).toEqual(originalRun);
  });
});

describe('Renewables Tycoon save and action boundaries', () => {
  it('round-trips a partially planned month with paid construction, service, and event decisions', () => {
    let state = engine.create('resume-planning');
    state = engine.apply(state, { type: 'buy', siteId: 'ridge-wind' });
    state = engine.apply(state, { type: 'service', assetId: state.assets[1].id });
    state = commitEvent(state);
    const restored = engine.restore(JSON.stringify(state));
    expect(restored).toEqual(state);
    expect(engine.apply(restored, { type: 'advance' })).toEqual(engine.apply(state, { type: 'advance' }));
    state = engine.apply(state, { type: 'advance' });
    state = engine.apply(state, { type: 'buy', siteId: 'civic-store' });
    expect(engine.restore(JSON.stringify(state))).toEqual(state);
  });

  it.each([
    state => { state.version = 2; },
    state => { state.month = 1; },
    state => { state.month = 12; },
    state => { state.phase = 'complete'; },
    state => { state.cash = NaN; },
    state => { state.cash = '68000'; },
    state => { state.policy.reserve = 2; },
    state => { state.policy.flex = 'yes'; },
    state => { state.assets[0].condition = Infinity; },
    state => { state.assets[0].type = 'nuclear'; },
    state => { state.assets[0].siteId = 'unknown'; },
    state => { state.assets[1] = clone(state.assets[0]); },
    state => { state.assets[2].stored = 101; },
    state => { state.assets[2].stored = 5; },
    state => { state.assets[0].stored = 5; },
    state => { state.assets[0].serviceMonth = -1; },
    state => { state.eventChoice = 'forged'; },
    state => { state.seed = 'x'.repeat(65); }
  ])('rejects malformed or unsupported campaign data %#', mutate => {
    const state = engine.create();
    mutate(state);
    expect(engine.restore(state)).toBeNull();
  });

  it('rejects malformed JSON, excessive input, and forged accounting', () => {
    expect(engine.restore('{')).toBeNull();
    expect(engine.restore(' '.repeat(120001))).toBeNull();
    const state = advance(engine.create());
    state.history[0].totals.served += 20;
    expect(engine.restore(state)).toBeNull();
  });

  it('strips unknown imported fields, including nested prototype-shaped data', () => {
    const state = advance(engine.create());
    state.unknown = 'discard';
    state.assets[0].html = '<script>bad</script>';
    state.history[0].unknown = { __proto__: { poison: true } };
    state.history[0].totals.unknown = 7;
    state.lastRun.assets[0].unknown = 'discard';
    const clean = engine.restore(state);
    expect(clean).not.toBeNull();
    expect(clean.unknown).toBeUndefined();
    expect(clean.assets[0].html).toBeUndefined();
    expect(clean.history[0].unknown).toBeUndefined();
    expect(clean.history[0].totals.unknown).toBeUndefined();
    expect(clean.lastRun.assets[0].unknown).toBeUndefined();
    expect({}.poison).toBeUndefined();
  });

  it('rejects tampered replay snapshots rather than presenting invented historical flows', () => {
    const state = advance(engine.create());
    state.lastRun.assets[1].condition = 5;
    expect(engine.restore(state)).toBeNull();
  });

  it.each([
    { type: 'policy', reserve: -0.01, flex: false },
    { type: 'policy', reserve: NaN, flex: false },
    { type: 'policy', reserve: 0.2, flex: 'false' },
    { type: 'service', assetId: 'absent' },
    { type: 'event', choiceId: 'absent' },
    { type: 'buy', siteId: 'absent' },
    { type: 'teleport' },
    null
  ])('keeps the input unchanged when rejecting an illegal action %#', action => {
    const state = engine.create();
    const before = clone(state);
    expect(() => engine.apply(state, action)).toThrow();
    expect(state).toEqual(before);
  });
});

describe('Renewables Tycoon equipment day', () => {
  it('reads exact signed hourly power and separate daily energy totals from a real forecast', () => {
    const state = engine.create('equipment-day'), run = engine.preview(state);
    for (const original of state.assets) {
      const day = engine.equipmentDay(state, run, original.id, 14);
      expect(day).toMatchObject({ assetId: original.id, siteId: original.siteId, type: original.type,
        context: 'forecast', month: 0, day: 1, startHour: 0, endHour: 23, ratedPower: engine.catalog[original.type].power });
      expect(day.rows).toHaveLength(24);
      const source = run.hours.slice(0, 24).map(frame => frame.assets.find(asset => asset.id === original.id));
      expect(day.rows.map(row => row.power)).toEqual(source.map(row => row.power));
      for (const row of day.rows) {
        const inspected = engine.inspect(state, run, original.id, row.hour);
        expect(row).toMatchObject({ reason: inspected.reason, title: inspected.title, flow: inspected.flow,
          status: inspected.status, available: inspected.available });
      }
      expect(day.totals.generation).toBe(original.type === 'battery' ? 0 : source.reduce((sum, row) => sum + row.power, 0));
      expect(day.totals.charge).toBe(original.type === 'battery' ? source.reduce((sum, row) => sum + Math.max(0, -row.power), 0) : 0);
      expect(day.totals.discharge).toBe(original.type === 'battery' ? source.reduce((sum, row) => sum + Math.max(0, row.power), 0) : 0);
      expect(day.totals.isolatedHours).toBe(0);
      if (original.type === 'battery') {
        expect(day.rows.some(row => row.flow === 'charge')).toBe(true);
        expect(day.rows.some(row => row.flow === 'export')).toBe(true);
        expect(day.rows.map(row => row.stored)).toEqual(source.map(row => row.stored));
        expect(day.rows.every(row => row.capacity === 100)).toBe(true);
      } else expect(day.rows.every(row => !Object.hasOwn(row, 'stored') && !Object.hasOwn(row, 'capacity'))).toBe(true);
    }
  });

  it('uses calendar days without wrapping and preserves generation before network curtailment', () => {
    const state = engine.create('equipment-day-curtailment'), run = engine.preview(state), id = state.assets[0].id;
    const curtailed = run.hours.find(frame => frame.curtailed > 0.001);
    expect(curtailed).toBeDefined();
    const day = engine.equipmentDay(state, run, id, curtailed.hour);
    const source = run.hours.slice(day.startHour, day.endHour + 1);
    expect(day.totals.generation).toBe(source.reduce((sum, frame) => sum + frame.assets[0].power, 0));
    expect(day.rows[curtailed.hourOfDay].power).toBe(curtailed.assets[0].power);
    const final = engine.equipmentDay(state, run, id, 743);
    expect(final).toMatchObject({ day: 31, startHour: 720, endHour: 743 });
    expect(final.rows.map(row => row.hour)).toEqual(Array.from({ length: 24 }, (_, i) => 720 + i));
    expect(engine.equipmentDay(state, { ...run, hours: run.hours.slice(720) }, id, 743)).toEqual(final);
  });

  it('keeps exact small energy exchanges while using the established idle threshold for visual flow', () => {
    const state = engine.create('equipment-day-threshold'), run = engine.preview(state), id = state.assets[2].id;
    run.hours = run.hours.slice(0, 24);
    const powers = [-0.001, 0.001, -0.0011, 0.0011];
    run.hours.forEach((frame, index) => {
      const asset = frame.assets[2]; asset.power = powers[index] || 0; asset.stored = 50;
      asset.status = Math.abs(asset.power) > 0.001 ? 'operating' : 'idle';
      frame.unserved = 0;
    });
    const day = engine.equipmentDay(state, run, id, 0);
    expect(day.rows.slice(0, 4).map(row => row.flow)).toEqual(['idle', 'idle', 'charge', 'export']);
    expect(day.rows.slice(0, 4).map(row => row.reason)).toEqual(['standby', 'standby', 'charging', 'discharging']);
    expect(day.totals).toEqual({ generation: 0, charge: 0.0021000000000000003,
      discharge: 0.0021000000000000003, idleHours: 22, isolatedHours: 0 });
  });

  it('distinguishes darkness, cloudy daylight, calm wind, and high-wind shutdown at zero output', () => {
    const state = engine.create('equipment-day-reasons'), run = engine.preview(state);
    run.hours = run.hours.slice(0, 24);
    const night = run.hours[0], cloudy = run.hours[12];
    night.irradiance = 0; night.sunHeight = 0; night.assets[0].power = 0; night.assets[0].status = 'idle';
    cloudy.irradiance = 0; cloudy.sunHeight = 0.5; cloudy.assets[0].power = 0; cloudy.assets[0].status = 'idle';
    run.hours[0].windSpeed = 2.99; run.hours[1].windSpeed = 25;
    for (const frame of run.hours.slice(0, 2)) { frame.assets[1].power = 0; frame.assets[1].status = 'idle'; }
    const solar = engine.equipmentDay(state, run, state.assets[0].id, 0);
    expect(solar.rows[0]).toMatchObject({ reason: 'darkness', title: 'No daylight', flow: 'idle', power: 0 });
    expect(solar.rows[12]).toMatchObject({ reason: 'solar-output', flow: 'idle', power: 0 });
    const wind = engine.equipmentDay(state, run, state.assets[1].id, 0);
    expect(wind.rows[0]).toMatchObject({ reason: 'wind-calm', flow: 'idle', power: 0 });
    expect(wind.rows[1]).toMatchObject({ reason: 'wind-cutout', title: 'High-wind shutdown', flow: 'idle', power: 0 });
  });

  it('shows service through hour 47, the actual return at hour 48, and construction isolation', () => {
    let state = engine.create('equipment-day-service');
    state = engine.apply(state, { type: 'service', assetId: 'asset-north-bluff' });
    state = engine.apply(state, { type: 'buy', siteId: 'school-roofs' });
    const run = engine.preview(state);
    const service = engine.equipmentDay(state, run, 'asset-north-bluff', 47);
    expect(service).toMatchObject({ day: 2, startHour: 24, endHour: 47,
      totals: { generation: 0, charge: 0, discharge: 0, idleHours: 0, isolatedHours: 24 } });
    expect(service.rows.every(row => row.reason === 'service' && row.flow === 'isolated' && !row.available)).toBe(true);
    const returned = engine.equipmentDay(state, run, 'asset-north-bluff', 48);
    expect(returned).toMatchObject({ day: 3, startHour: 48, endHour: 71, totals: { isolatedHours: 0 } });
    expect(returned.rows[0].available).toBe(true);
    expect(returned.rows[0].reason).toBe(engine.inspect(state, run, 'asset-north-bluff', 48).reason);
    const construction = engine.equipmentDay(state, run, 'asset-school-roofs', 743);
    expect(construction.totals).toEqual({ generation: 0, charge: 0, discharge: 0, idleHours: 0, isolatedHours: 24 });
    expect(construction.rows.every(row => row.reason === 'building' && row.power === 0 && row.flow === 'isolated')).toBe(true);
  });

  it('uses recorded fault timing instead of the ending campaign fault', () => {
    let state = engine.create('fault-trial');
    state.assets.forEach(asset => { asset.condition = 10; });
    state = advance(state);
    const fault = state.history[0].faults.find(item => !item.existing);
    expect(fault).toBeDefined();
    const run = engine.preview({ ...state, phase: 'complete' });
    expect(state.assets.find(asset => asset.id === fault.assetId).fault).toBe(true);
    const first = engine.equipmentDay(state, run, fault.assetId, 0);
    expect(first.rows[0].reason).not.toBe('fault');
    const day = engine.equipmentDay(state, run, fault.assetId, fault.hour);
    expect(day.context).toBe('replay');
    expect(day.totals.isolatedHours).toBe(day.endHour - fault.hour + 1);
    for (const row of day.rows) expect(row.reason === 'fault').toBe(row.hour >= fault.hour);
    expect(day.rows.find(row => row.hour === fault.hour)).toMatchObject({ flow: 'isolated', power: 0, available: false });
  });

  it('classifies reserve using the replay policy while preserving recorded battery energy', () => {
    const state = engine.create('equipment-day-replay-reserve'), run = engine.preview(state), id = state.assets[2].id;
    run.forecast = false; run.hours = run.hours.slice(0, 24);
    run.hours.forEach(frame => {
      Object.assign(frame.assets[2], { power: 0, stored: 20, status: 'idle' });
      Object.assign(frame, { unserved: 1, essentialDemand: 10, essentialServed: 10 });
    });
    state.lastRun = { month: run.month, policy: { reserve: 0.25, flex: false } };
    state.policy.reserve = 0; state.assets[2].stored = 0;
    const day = engine.equipmentDay(state, run, id, 0);
    expect(day.rows.every(row => row.reason === 'reserve' && row.stored === 20 && row.flow === 'idle')).toBe(true);
    state.lastRun.policy.reserve = 0;
    expect(engine.equipmentDay(state, run, id, 0).rows.every(row => row.reason === 'standby')).toBe(true);
  });

  it('rejects invalid, missing, unowned, duplicated, unordered, and contradictory day records', () => {
    const state = engine.create('equipment-day-invalid'), run = engine.preview(state), id = state.assets[2].id;
    for (const hour of [-1, 0.1, 744, NaN, Infinity, '0']) expect(engine.equipmentDay(state, run, id, hour)).toBeNull();
    expect(engine.equipmentDay(null, run, id, 0)).toBeNull();
    expect(engine.equipmentDay(state, null, id, 0)).toBeNull();
    expect(engine.equipmentDay({ ...state, assets: [] }, run, id, 0)).toBeNull();
    expect(engine.equipmentDay(state, run, 'asset-civic-store', 0)).toBeNull();
    expect(engine.equipmentDay(state, { ...run, forecast: undefined }, id, 0)).toBeNull();
    expect(engine.equipmentDay(state, { ...run, month: 12 }, id, 0)).toBeNull();
    const mutators = [
      data => { data.hours.pop(); },
      data => { data.hours[5] = null; },
      data => { data.hours[5].hour = 4; },
      data => { [data.hours[4], data.hours[5]] = [data.hours[5], data.hours[4]]; },
      data => { data.hours.push(clone(data.hours[0])); },
      data => { data.hours[0].hourOfDay = 1; },
      data => { data.hours[0].day = 2; },
      data => { data.hours[0].assets.pop(); },
      data => { data.hours[0].assets.push(clone(data.hours[0].assets[2])); },
      data => { data.hours[0].assets[2].type = 'wind'; },
      data => { data.hours[0].assets[2].siteId = 'civic-store'; },
      data => { data.hours[0].assets[2].power = NaN; },
      data => { data.hours[0].assets[2].power = 26; },
      data => { data.hours[0].assets[2].available = 'true'; },
      data => { data.hours[0].assets[2].condition = -1; },
      data => { data.hours[0].assets[2].status = 'fault'; },
      data => { data.hours[0].assets[2].status = 'operating'; data.hours[0].assets[2].power = 0; },
      data => { Object.assign(data.hours[0].assets[2], { available: false, status: 'fault', power: 1 }); },
      data => { data.hours[0].assets[2].stored = 101; },
      data => { data.hours[0].assets[2].capacity = 99; },
      data => { data.hours[0].essentialServed = data.hours[0].essentialDemand + 1; },
      data => { data.hours[0].unserved = NaN; }
    ];
    for (const mutate of mutators) {
      const malformed = clone({ ...run, hours: run.hours.slice(0, 24) }); mutate(malformed);
      expect(engine.equipmentDay(state, malformed, id, 0)).toBeNull();
    }
    for (const [type, field, value] of [['solar', 'irradiance', NaN], ['solar', 'sunHeight', undefined], ['wind', 'windSpeed', -1]]) {
      const malformed = clone(run); malformed.hours[0][field] = value;
      expect(engine.equipmentDay(state, malformed, state.assets.find(asset => asset.type === type).id, 0)).toBeNull();
    }
    const invalidPolicy = clone(state); invalidPolicy.policy.reserve = NaN;
    expect(engine.equipmentDay(invalidPolicy, run, id, 0)).toBeNull();
  });

  it('reads frozen data without simulating, sampling faults, repeatedly inspecting, or retaining mutable references', () => {
    const state = engine.create('equipment-day-pure'), run = engine.preview(state);
    const before = { state: structuredClone(state), run: structuredClone(run) };
    function freezeDeep(value) {
      Object.values(value).forEach(child => { if (child && typeof child === 'object') freezeDeep(child); });
      return Object.freeze(value);
    }
    freezeDeep(state); freezeDeep(run);
    const source = fs.readFileSync('stem_lab/renewables_tycoon_engine.js', 'utf8')
      .replace('function simulate(state, realize) {', 'function simulate(state, realize) { throw new Error("No simulation");')
      .replace('function random(seed, key) {', 'function random(seed, key) { throw new Error("No randomness");')
      .replace('function inspect(state, run, assetId, hour) {', 'function inspect(state, run, assetId, hour) { throw new Error("No repeated inspection");');
    const context = { module: { exports: {} } }; vm.runInNewContext(source, context);
    for (const asset of state.assets) {
      const day = context.module.exports.equipmentDay(state, run, asset.id, 0);
      expect(day).not.toBeNull();
      day.rows[0].power = -999; day.rows[0].stored = -999; day.totals.generation = -999; day.rows.pop();
    }
    expect(state).toEqual(before.state); expect(run).toEqual(before.run);
  });
});
