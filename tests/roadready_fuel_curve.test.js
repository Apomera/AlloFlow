// The MPG model must agree with what the tool TEACHES about speed and fuel.
//
// RoadReady states in three places that "peak MPG is usually 45-55 mph" and
// that cars "lose efficiency sharply above that". Its instantMPG omitted the
// idle burn (idleGph() existed but was never folded in), so the curve was
// monotonic: the sedan read 86.5 MPG at 25 mph and simply kept improving as it
// slowed. There was no peak at all, and the Hypermiling Lab rewarded crawling.
//
// These tests exercise the tool's OWN exported instantMPG/cruiseMPG rather
// than a replica, so they fail if the model regresses.
import { describe, it, expect, beforeAll } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let RR;

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  if (!RR) throw new Error('roadready did not populate __RR_TEST_EXPORTS__');
});

const vehicleById = (id) => {
  const list = RR.VEHICLES || RR.VEHICLE_TYPES || [];
  const found = list.find((v) => v.id === id);
  if (!found) throw new Error('vehicle not found: ' + id + ' (have: ' +
    list.map((v) => v.id).join(', ') + ')');
  return found;
};

const curve = (veh, from, to, step) => {
  const out = [];
  for (let s = from; s <= to; s += step) {
    out.push({ mph: s, mpg: RR.cruiseMPG(s, veh, 'clear', true, {}) });
  }
  return out;
};

describe('RoadReady fuel-economy curve', () => {
  it('gives gasoline cars a real MPG peak instead of rewarding crawling', () => {
    const sedan = vehicleById('sedan');
    const pts = curve(sedan, 10, 90, 1).filter((p) => p.mpg < 999);
    expect(pts.length).toBeGreaterThan(50);

    const best = pts.reduce((a, b) => (b.mpg > a.mpg ? b : a));

    // The peak must sit at a real cruising speed, not at a crawl. Before the
    // idle burn was folded in, the maximum sampled value sat at the slowest
    // speed tested and the curve never turned over.
    expect(best.mph).toBeGreaterThanOrEqual(25);
    expect(best.mph).toBeLessThanOrEqual(60);

    // And it must genuinely turn over: crawling is worse than the peak.
    const crawl = pts.find((p) => p.mph === 12);
    expect(crawl.mpg).toBeLessThan(best.mpg);
  });

  it('loses efficiency above the peak, as the lesson claims', () => {
    const sedan = vehicleById('sedan');
    const at55 = RR.cruiseMPG(55, sedan, 'clear', true, {});
    const at75 = RR.cruiseMPG(75, sedan, 'clear', true, {});
    const at85 = RR.cruiseMPG(85, sedan, 'clear', true, {});
    expect(at75).toBeLessThan(at55);
    expect(at85).toBeLessThan(at75);
  });

  it('keeps highway cruise inside a believable EPA band', () => {
    // Ideal steady cruise with no drivetrain losses runs a little optimistic,
    // but it should not be double the real figure.
    const sedan = vehicleById('sedan');
    const suv = vehicleById('suv');
    // Real EPA highway: sedan ~32-38, SUV ~26-30. The pre-fix model read 42.6
    // for the sedan — above the top of the real band — because it charged
    // nothing for keeping the engine running.
    const sedan60 = RR.cruiseMPG(60, sedan, 'clear', true, {});
    const suv60 = RR.cruiseMPG(60, suv, 'clear', true, {});
    expect(sedan60).toBeGreaterThan(24);
    expect(sedan60).toBeLessThan(40);
    expect(suv60).toBeGreaterThan(16);
    expect(suv60).toBeLessThan(32);
    expect(suv60).toBeLessThan(sedan60);
  });

  it('still lets an EV do best at low speed, which is correct for electric', () => {
    // EVs have no idle burn, so unlike a gas car they really are most
    // efficient crawling. The fix must not flatten that distinction away.
    const ev = vehicleById('ev');
    const slow = RR.cruiseMPG(20, ev, 'clear', true, {});
    const fast = RR.cruiseMPG(70, ev, 'clear', true, {});
    expect(slow).toBeGreaterThan(fast);
  });

  it('charges gasoline cars for idling but not electrics', () => {
    const sedan = vehicleById('sedan');
    const ev = vehicleById('ev');
    expect(RR.idleGph(sedan)).toBeGreaterThan(0);
    expect(RR.idleGph(ev)).toBe(0);
  });
});
