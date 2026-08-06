// Backend parity for the sign-up sheet.
//
// A sheet allocates a scarce thing, so two backends disagreeing is worse than
// for a poll: one of them hands out a seat the other already gave away, and the
// person who loses finds out at the door. The mailbox computes allocation
// server-side in Apps Script while Firestore gates documents, so they can never
// share an implementation, only a contract.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import contract from '../signup_sheet_contract_module.js';

const CODE = readFileSync('apps_script/session_mailbox/Code.gs', 'utf8');

let mailbox;
beforeAll(() => {
  const names = [
    'signupTakenCounts',
    'signupCapacityFor',
    'normalizeSignupClaims',
    'buildSignupSummary',
    'availabilityIsClosed',
    'applySignupRetention',
  ];
  // eslint-disable-next-line no-new-func
  const S = new Function(`${CODE}\n;return {${names.join(',')}};`)();

  mailbox = {
    counts: (config, responses, exceptUid) => S.signupTakenCounts(config, responses, exceptUid),
    remaining: (config, counts) => {
      const state = { activityId: 'AC-x', config, responses: {}, tally: counts, version: 1, updatedAt: 1 };
      return S.buildSignupSummary(state, true).slots.map((slot) => ({
        id: slot.id, label: slot.label, capacity: slot.capacity, taken: slot.taken, remaining: slot.remaining,
      }));
    },
    // Mirrors what the submit path does: normalize, then re-check capacity
    // against what OTHERS hold. Kept thin, because translation done here is
    // translation the suite is no longer checking.
    evaluateClaim: (config, responses, uid, wanted) => {
      const claims = S.normalizeSignupClaims(wanted, config);
      if (!claims) {
        const tooMany = Array.isArray(wanted) && wanted.length > (parseInt(config.maxPerPerson, 10) || 1);
        return { ok: false, reason: tooMany ? 'too-many' : 'bad-claims', full: [] };
      }
      const taken = S.signupTakenCounts(config, responses, uid);
      const full = claims.filter((id) => taken[id] == null || taken[id] >= S.signupCapacityFor(config, id));
      if (full.length) return { ok: false, reason: 'slot-full', full };
      return { ok: true, reason: '', full: [] };
    },
    visibility: (config, isHost) => {
      const state = {
        activityId: 'AC-x', config,
        responses: { 'mb-probe': { name: 'Probe', claims: [config.options[0].id] } },
        version: 1, updatedAt: 1,
      };
      const summary = S.buildSignupSummary(state, isHost);
      return {
        counts: summary.slots.length > 0,
        who: summary.slots.some((slot) => slot.who.length > 0),
      };
    },
    isClosed: (config) => S.availabilityIsClosed(config),
    retentionDue: (config) => S.applySignupRetention({ config, responses: { probe: { claims: [config.options[0].id] } } }),
  };
});

describe('the contract states the allocation rule', () => {
  const cfg = contract.FIXTURES[0].config;

  it('refuses a claim on a slot somebody else already filled', () => {
    const out = contract.evaluateClaim(cfg, { 'mb-a': { claims: ['o1'] } }, 'mb-new', ['o1']);
    expect(out).toMatchObject({ ok: false, reason: 'slot-full', full: ['o1'] });
  });

  it('lets a person reclaim the seat they already hold', () => {
    // The failure this prevents: counting your own claim against you, so
    // editing your entry reports the slot as full and you lose your own seat.
    const out = contract.evaluateClaim(cfg, { 'mb-me': { claims: ['o1'] } }, 'mb-me', ['o1']);
    expect(out.ok).toBe(true);
  });

  it('refuses the WHOLE submission when any slot is full', () => {
    // Partially granting would leave someone believing they hold a seat.
    const two = Object.assign({}, cfg, { maxPerPerson: 2 });
    const out = contract.evaluateClaim(two, { 'mb-a': { claims: ['o1'] } }, 'mb-new', ['o1', 'o3']);
    expect(out.ok).toBe(false);
    expect(out.full).toEqual(['o1']);
  });

  it('always publishes counts, and gates only names', () => {
    // A sheet that hides what is left is useless, which is why this differs
    // from the poll's minParticipants gating.
    expect(contract.visibilityFor(cfg, false)).toEqual({ counts: true, who: false });
    expect(contract.visibilityFor(cfg, true)).toEqual({ counts: true, who: true });
    const anon = Object.assign({}, cfg, { identityMode: 'anonymous' });
    expect(contract.visibilityFor(anon, true).who, 'anonymous hides who from the organizer too').toBe(false);
    expect(contract.visibilityFor(anon, true).counts, 'but the sheet still works').toBe(true);
  });
});

describe('the shipping Apps Script conforms', () => {
  it('agrees on every fixture, including the last seat', () => {
    const report = contract.runConformanceSuite(mailbox);
    expect(report.failures, JSON.stringify(report.failures, null, 2)).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it('covers the cases where an allocator can plausibly differ', () => {
    const names = contract.FIXTURES.map((f) => f.name);
    expect(names).toEqual(expect.arrayContaining([
      'LAST SEAT taken by someone else',
      'RECLAIMING my own seat must succeed',
      'multi-capacity slot exhausted',
      'releasing a seat',
      'anonymous hides who, keeps counts',
      'closed sheet',
      'retention due',
    ]));
  });
});

describe('the guarantee the contract cannot express', () => {
  it('re-checks capacity INSIDE the lock, not on arrival', () => {
    // No pure contract can prove atomicity: it is a property of WHERE the check
    // runs. Two parents claiming the last 3:15 at once is decided by this
    // ordering alone, so it is pinned as source structure.
    const lockAt = CODE.indexOf('lock.tryLock');
    const guardAt = CODE.indexOf('var takenByOthers = signupTakenCounts(');
    expect(lockAt).toBeGreaterThan(0);
    expect(guardAt).toBeGreaterThan(lockAt);
  });
});

describe('the contract carries no transport', () => {
  it('names backends only in comments', () => {
    const src = readFileSync('signup_sheet_contract_module.js', 'utf8');
    const body = src
      .slice(src.indexOf('function createSignupSheetContract'))
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    for (const smell of ['firebase', 'firestore', 'fetch(', 'localStorage', 'UrlFetchApp', 'DriveApp', 'LockService']) {
      expect(body.toLowerCase(), `must stay transport-neutral: ${smell}`).not.toContain(smell.toLowerCase());
    }
  });

  it('pins the mailbox ceilings, which are the tighter ones', () => {
    expect(CODE).toContain(`var MAX_SIGNUP_CAPACITY = ${contract.LIMITS.CAPACITY};`);
    expect(CODE).toContain(`var MAX_POLL_OPTIONS = ${contract.LIMITS.OPTIONS};`);
  });
});
