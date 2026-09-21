import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SOURCE = 'stem_lab/stem_tool_lifeskills.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_lifeskills.js';
const read = (f) => readFileSync(resolve(process.cwd(), f), 'utf8');

/**
 * Bound a `var <name> = [ ... ];` by its terminating `\n  ];`, NOT by brace
 * matching. Adjacent array literals sit 3 lines apart in this file, and a
 * brace matcher silently merges them.
 */
function arrayLiteral(src, name) {
  const start = src.indexOf('var ' + name + ' = [');
  if (start === -1) return null;
  const end = src.indexOf('\n  ];', start);
  if (end === -1) return null;
  return src.slice(src.indexOf('[', start), end + 4);
}
// eslint-disable-next-line no-new-func
const load = (src, n) => new Function('return ' + arrayLiteral(src, n) + ';')();

describe('Life Skills Lab — circuit load and the 80% rule', () => {
  it('warns about a continuous load that does not trip the breaker', () => {
    // THE BUG. The calculator only warned above 100% of the circuit rating, so a
    // 1500W space heater on a 15A/120V circuit — 1500W against the NEC 1440W
    // continuous limit — rendered green with no warning. A space heater is the
    // textbook continuous load and a leading cause of electrical fires, and the
    // breaker does NOT protect you in that band: it is not tripping.
    const src = read(SOURCE);
    expect(src).toContain('var asContinuousW = Math.round(asWatts * 0.8);');
    expect(src).toMatch(/asOverContinuous\s*=\s*totalLoad > asContinuousW && totalLoad <= asWatts/);
    expect(src).toContain('CONTINUOUS_DEVICES');
    expect(src).toContain('asOverContinuous && h(');
  });

  it('puts the space heater in the band it fixes', () => {
    // Guards the premise: if the device list ever changes so that nothing lands
    // between 80% and 100%, this warning becomes unreachable and the test should
    // say so rather than passing vacuously.
    const devices = load(read(SOURCE), 'COMMON_DEVICES');
    const max = 120 * 15;
    const cont = Math.round(max * 0.8);
    const heater = devices.find((d) => d.name === 'Space heater');
    expect(heater, 'Space heater missing from COMMON_DEVICES').toBeTruthy();
    expect(heater.watts).toBeGreaterThan(cont);
    expect(heater.watts).toBeLessThanOrEqual(max);
  });

  it('names the continuous limit on screen, not just in the maths', () => {
    const src = read(SOURCE);
    expect(src).toContain("'W max, but only ' + asContinuousW + 'W for anything running 3+ hours'");
  });

  it('still flags an actual overload', () => {
    // The pre-existing 100% warning must survive the new one.
    expect(read(SOURCE)).toContain('BREAKER WILL TRIP!');
  });

  it('leaves no stray build-script identifier in the shipped file', () => {
    // A scripted edit once leaked a Python variable name (`BS`) into the JS as a
    // free variable. node --check accepts it — it is a valid identifier — so it
    // would only fail at render. Cheap guard against the whole class.
    const src = read(SOURCE);
    expect(src).not.toMatch(/\bBS\s*\+/);
    expect(src).not.toContain("BS+'u");
  });
});

describe('Life Skills Lab — safety-critical reference data', () => {
  it('keeps USDA minimum safe cooking temperatures', () => {
    // Understating any of these is a food-poisoning risk, so they are pinned.
    const fs = load(read(SOURCE), 'FOOD_SAFETY');
    const get = (m) => fs.find((x) => new RegExp(m, 'i').test(x.food));
    expect(get('Poultry').tempF).toBe(165);
    expect(get('Ground meat').tempF).toBe(160);
    expect(get('Beef steaks').tempF).toBe(145);
    expect(get('Pork chops').tempF).toBe(145);
    expect(get('Fish').tempF).toBe(145);
    expect(get('Eggs').tempF).toBe(160);
    expect(get('Leftovers').tempF).toBe(165);
    expect(get('DANGER ZONE').tempF).toBe(40);
  });

  it('routes every emergency scenario to urgent help', () => {
    // A scenario that describes an emergency must not be answerable with
    // "handle it at home". These are the highest-stakes answers in the tool.
    const src = read(SOURCE);
    const med = load(src, 'MED_SCENARIOS');
    const home = load(src, 'HOME_SAFETY_SCENARIOS');
    const dental = load(src, 'DENTAL_SCENARIOS');
    const emergency = [
      [med, /trouble breathing, face swelling, fainting/],
      [home, /unconscious, having trouble breathing, or has a serious injury/],
      [dental, /face swelling, fever, or severe tooth pain/],
      [dental, /permanent tooth is knocked out/],
    ];
    for (const [set, rx] of emergency) {
      const s = set.find((x) => rx.test(x.prompt));
      expect(s, 'scenario missing: ' + rx).toBeTruthy();
      expect(s.best, 'not routed to urgent: ' + s.prompt.slice(0, 50)).toBe('urgent');
    }
  });

  it('never tells a student to mix cleaning products or share a prescription', () => {
    const src = read(SOURCE);
    const home = load(src, 'HOME_SAFETY_SCENARIOS');
    const med = load(src, 'MED_SCENARIOS');
    const mixing = home.find((x) => /mixing products might work faster/.test(x.prompt));
    expect(mixing.best).toBe('prevent');
    expect(mixing.explain).toMatch(/can create dangerous fumes/i);
    const sharing = med.find((x) => /friend has similar symptoms/.test(x.prompt));
    expect(sharing.best).toBe('avoid');
    expect(sharing.explain).toMatch(/do not share/i);
  });

  it('gives every safety scenario an answer that its action list offers', () => {
    // A `best` with no matching action can never be chosen, so the scenario
    // becomes unanswerable — the student can only ever be wrong.
    const src = read(SOURCE);
    for (const [scen, acts] of [
      ['MED_SCENARIOS', 'MED_ACTIONS'],
      ['HOME_SAFETY_SCENARIOS', 'HOME_SAFETY_ACTIONS'],
      ['DENTAL_SCENARIOS', 'DENTAL_ACTIONS'],
    ]) {
      const ids = load(src, acts).map((a) => a.id);
      for (const s of load(src, scen)) {
        expect(ids, `${scen}: "${s.best}" is not an option in ${acts}`).toContain(s.best);
      }
    }
  });

  it('ships the same safety data in the desktop mirror', () => {
    const a = read(SOURCE), b = read(MIRROR);
    for (const n of ['FOOD_SAFETY', 'COMMON_DEVICES', 'MED_SCENARIOS',
                     'HOME_SAFETY_SCENARIOS', 'DENTAL_SCENARIOS']) {
      expect(arrayLiteral(b, n), n + ' missing from mirror').toBe(arrayLiteral(a, n));
    }
  });
});
