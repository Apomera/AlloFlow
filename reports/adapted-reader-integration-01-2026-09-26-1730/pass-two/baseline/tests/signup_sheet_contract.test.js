// Sign-up sheet, server contract.
//
// The availability poll asks "could you make this". A sign-up sheet asks "take
// this", and a slot can RUN OUT. That single difference carries the whole risk:
// two parents claiming the last 3:15 conference at the same moment must not both
// get it, and a person changing their mind must not lose their seat to
// themselves.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';

let S;
const CODE = readFileSync('apps_script/session_mailbox/Code.gs', 'utf8');
beforeAll(() => {
  const names = [
    'normalizeAssignmentActivityConfig',
    'normalizeSignupClaims',
    'signupTakenCounts',
    'signupCapacityFor',
    'buildSignupSummary',
    'applySignupRetention',
  ];
  // eslint-disable-next-line no-new-func
  S = new Function(`${CODE}\n;return {${names.join(',')}};`)();
});

const ACT_ID = 'AC-22222222-3333-4444-5555-666666666666';
const cfg = (over = {}) => S.normalizeAssignmentActivityConfig({
  activityId: ACT_ID,
  type: 'signup',
  prompt: 'Pick a conference time',
  identityMode: 'real_name',
  options: [
    { label: 'Tue 3:15pm', capacity: 1 },
    { label: 'Tue 3:45pm', capacity: 2 },
    { label: 'Wed 3:15pm' },
  ],
  ...over,
}, '');

const stateWith = (config, responses, extra = {}) => ({
  activityId: ACT_ID, config, responses, version: 1, updatedAt: 1, ...extra,
});

describe('configuring a sheet', () => {
  it('gives every slot a capacity, defaulting to one seat', () => {
    const c = cfg();
    expect(c.options.map((o) => o.capacity)).toEqual([1, 2, 1]);
    expect(c.options.map((o) => o.id)).toEqual(['o1', 'o2', 'o3']);
  });

  it('defaults a person to one slot and never more than there are slots', () => {
    expect(cfg().maxPerPerson).toBe(1);
    expect(cfg({ maxPerPerson: 99 }).maxPerPerson).toBe(3);
    expect(cfg({ maxPerPerson: 0 }).maxPerPerson).toBe(1);
  });

  it('still refuses a sheet with no identity mode', () => {
    expect(cfg({ identityMode: undefined })).toBeNull();
  });

  it('accepts a single-slot sheet, unlike a poll', () => {
    // "Who can bring the projector" is a legitimate one-option sheet, whereas a
    // one-option poll is meaningless.
    expect(cfg({ options: [{ label: 'Bring the projector', capacity: 1 }] })).toBeTruthy();
  });
});

describe('claiming', () => {
  it('keeps known slots, drops duplicates and unknown ids', () => {
    expect(S.normalizeSignupClaims(['o1', 'o1', 'o9'], cfg())).toEqual(['o1']);
  });

  it('treats an empty claim list as RELEASING a slot', () => {
    // Someone who can no longer make it has to be able to give the seat back,
    // which matters far more here than in a poll.
    expect(S.normalizeSignupClaims([], cfg())).toEqual([]);
  });

  it('refuses more slots than one person may hold', () => {
    expect(S.normalizeSignupClaims(['o1', 'o2'], cfg())).toBeNull();
    expect(S.normalizeSignupClaims(['o1', 'o2'], cfg({ maxPerPerson: 2 }))).toEqual(['o1', 'o2']);
  });

  it('refuses junk instead of guessing', () => {
    for (const junk of [null, undefined, 'o1', {}, 5]) {
      expect(S.normalizeSignupClaims(junk, cfg())).toBeNull();
    }
  });
});

describe('capacity accounting', () => {
  const responses = {
    'mb-a': { name: 'Sam', claims: ['o1'] },
    'mb-b': { name: 'Jo', claims: ['o2'] },
    'mb-c': { name: 'Kim', claims: ['o2'] },
  };

  it('counts what everyone else holds', () => {
    const counts = S.signupTakenCounts(cfg(), responses, null);
    expect(counts).toMatchObject({ o1: 1, o2: 2, o3: 0 });
  });

  it('EXCLUDES the person being served, so nobody competes with themselves', () => {
    // Without this, resubmitting or editing a claim looks like the slot is
    // already full and the person loses their own seat.
    const counts = S.signupTakenCounts(cfg(), responses, 'mb-a');
    expect(counts.o1).toBe(0);
  });

  it('reports remaining seats per slot', () => {
    const out = S.buildSignupSummary(stateWith(cfg(), responses), true);
    expect(out.slots.find((s) => s.id === 'o1')).toMatchObject({ capacity: 1, taken: 1, remaining: 0 });
    expect(out.slots.find((s) => s.id === 'o2')).toMatchObject({ capacity: 2, taken: 2, remaining: 0 });
    expect(out.slots.find((s) => s.id === 'o3')).toMatchObject({ capacity: 1, taken: 0, remaining: 1 });
  });

  it('shows remaining counts to respondents immediately, with no threshold', () => {
    // A sign-up sheet that hides what is left is useless. This is a deliberate
    // difference from the poll, where a tally waits for minParticipants.
    const out = S.buildSignupSummary(stateWith(cfg(), { 'mb-a': { claims: ['o1'] } }), false);
    expect(out.slots.find((s) => s.id === 'o1').remaining).toBe(0);
    expect(out.slots.find((s) => s.id === 'o3').remaining).toBe(1);
  });
});

describe('the last seat cannot be double-booked', () => {
  // The concurrency guard is the reason this feature is not trivial, so pin
  // that the check lives INSIDE the lock rather than at request time.
  it('re-checks capacity inside the LockService section', () => {
    const lockAt = CODE.indexOf('lock.tryLock');
    const guardAt = CODE.indexOf('var takenByOthers = signupTakenCounts(');
    expect(lockAt, 'lock exists').toBeGreaterThan(0);
    expect(guardAt, 'capacity guard exists').toBeGreaterThan(0);
    // Checking on arrival would leave a window in which two claims both pass.
    expect(guardAt).toBeGreaterThan(lockAt);
  });

  it('refuses the whole submission and names the full slot', () => {
    // Silently dropping part of somebody's choice would leave them believing
    // they had a seat.
    expect(CODE).toContain("e: 'slot-full', full: fullSlots");
  });
});

describe('identity and retention behave like the poll', () => {
  const responses = {
    'mb-a': { name: 'Sam R.', claims: ['o1'] },
    'mb-b': { name: 'Jo P.', claims: ['o2'] },
  };

  it('tells the organizer WHO has each slot, which is the point of a sheet', () => {
    const out = S.buildSignupSummary(stateWith(cfg(), responses), true);
    expect(out.slots.find((s) => s.id === 'o1').who.map((w) => w.label)).toEqual(['Sam R.']);
  });

  it('substitutes codenames when that is the mode', () => {
    const out = S.buildSignupSummary(stateWith(cfg({ identityMode: 'codename' }), responses), true);
    const who = out.slots.find((s) => s.id === 'o1').who;
    expect(who.length).toBe(1);
    expect(who[0].label).not.toMatch(/Sam/);
  });

  it('withholds names from the ORGANIZER in anonymous mode', () => {
    const out = S.buildSignupSummary(stateWith(cfg({ identityMode: 'anonymous' }), responses), true);
    expect(out.slots.every((s) => s.who.length === 0)).toBe(true);
    expect(JSON.stringify(out)).not.toContain('Sam R.');
    // Counts still work: anonymity must not make the sheet unusable.
    expect(out.slots.find((s) => s.id === 'o1').taken).toBe(1);
  });

  it('never gives a respondent the name list', () => {
    const out = S.buildSignupSummary(stateWith(cfg(), responses), false);
    expect(out.slots.every((s) => s.who.length === 0)).toBe(true);
  });

  it('erases names at deleteAt but keeps which slots filled', () => {
    const st = stateWith(cfg({ deleteAt: '2000-01-01T00:00:00.000Z' }), { ...responses });
    expect(S.applySignupRetention(st)).toBe(true);
    expect(st.responses).toEqual({});
    expect(JSON.stringify(st)).not.toContain('Sam R.');
    const out = S.buildSignupSummary(st, true);
    expect(out.slots.find((s) => s.id === 'o1').taken).toBe(1);
    expect(out.slots.find((s) => s.id === 'o1').who).toEqual([]);
  });
});
