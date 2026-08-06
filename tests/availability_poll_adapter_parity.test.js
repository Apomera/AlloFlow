// Backend parity for the availability poll.
//
// A scheduling poll produces a DECISION. Two backends that disagree about who
// won is a bug a user cannot diagnose: both answers look equally authoritative
// and neither is visibly wrong. The mailbox computes summaries server-side in
// Apps Script and Firestore gates documents, so they can never share an
// implementation, only a contract.
//
// availability_poll_contract_module.js is that contract. This runs the SHIPPING
// Apps Script through its conformance suite, so a drift in Code.gs fails here
// rather than in somebody's staff meeting.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import contract from '../availability_poll_contract_module.js';

let mailbox;
beforeAll(() => {
  const src = readFileSync('apps_script/session_mailbox/Code.gs', 'utf8');
  const names = [
    'computeAvailabilityTally',
    'availabilityBestOptionIds',
    'buildAvailabilitySummary',
    'availabilityIsClosed',
    'applyAvailabilityRetention',
    'normalizeAssignmentActivityConfig',
  ];
  // eslint-disable-next-line no-new-func
  const S = new Function(`${src}\n;return {${names.join(',')}};`)();

  // The adapter shape the contract asks for, expressed in terms of what the
  // Apps Script actually exposes. Deliberately thin: any translation done here
  // is translation the conformance suite is no longer checking.
  mailbox = {
    tally: (config, responses) => S.computeAvailabilityTally(config, responses),
    best: (counted) => S.availabilityBestOptionIds(counted),
    visibility: (config, counted, isHost) => {
      const state = {
        activityId: 'AC-x', config, responses: rowsFor(config, counted), version: 1, updatedAt: 1,
      };
      const summary = S.buildAvailabilitySummary(state, isHost);
      return {
        rows: summary.rows.length > 0,
        tally: summary.tally.length > 0,
        revealed: summary.revealed,
      };
    },
    isClosed: (config) => S.availabilityIsClosed(config),
    retentionDue: (config) => {
      const state = { config, responses: { probe: { picks: { o1: 'yes' } } } };
      return S.applyAvailabilityRetention(state);
    },
  };
});

// Rebuild a response set that produces the given counts, so visibility can be
// exercised through the real summary builder rather than a stub.
function rowsFor(config, counted) {
  const rows = {};
  for (let i = 0; i < counted.participantCount; i++) {
    const picks = {};
    counted.options.forEach((opt) => {
      if (i < opt.yes) picks[opt.id] = 'yes';
      else if (i < opt.yes + opt.maybe) picks[opt.id] = 'maybe';
      else if (i < opt.yes + opt.maybe + opt.no) picks[opt.id] = 'no';
    });
    rows[`mb-${i}`] = { name: `Person ${i}`, picks };
  }
  return rows;
}

describe('the contract itself is self-consistent', () => {
  it('never lets a maybe win', () => {
    const config = { options: [{ id: 'o1', label: 'a' }, { id: 'o2', label: 'b' }], minParticipants: 3, identityMode: 'real_name' };
    const counted = contract.tally(config, {
      a: { picks: { o1: 'maybe', o2: 'yes' } },
      b: { picks: { o1: 'maybe', o2: 'no' } },
      c: { picks: { o1: 'maybe', o2: 'no' } },
    });
    // Three maybes versus one yes. If maybe counted as a yes this books a slot
    // nobody committed to.
    expect(contract.bestOptionIds(counted)).toEqual(['o2']);
  });

  it('withholds rows from the organizer in anonymous mode', () => {
    const config = { options: [{ id: 'o1', label: 'a' }], minParticipants: 3, identityMode: 'anonymous' };
    const counted = contract.tally(config, { a: { picks: { o1: 'yes' } } });
    expect(contract.visibilityFor(config, counted, true).rows).toBe(false);
  });

  it('does not count an empty row as a participant', () => {
    const config = { options: [{ id: 'o1', label: 'a' }], minParticipants: 3, identityMode: 'real_name' };
    // Someone who opens the link and leaves must not dilute minParticipants.
    expect(contract.tally(config, { a: { picks: { o1: 'yes' } }, b: {} }).participantCount).toBe(1);
  });
});

describe('the shipping Apps Script conforms to the contract', () => {
  it('agrees on every fixture', () => {
    const report = contract.runConformanceSuite(mailbox);
    // Report the actual disagreement rather than a bare boolean, because "the
    // backends differ" is useless without knowing where.
    expect(report.failures, JSON.stringify(report.failures, null, 2)).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.fixtures).toBeGreaterThan(5);
  });

  it('covers the cases that actually diverge between transports', () => {
    const names = contract.FIXTURES.map((f) => f.name);
    // Each of these is a rule an adapter could plausibly implement differently:
    // aggregation, tie handling, threshold gating, and the two lifecycle dates.
    expect(names).toEqual(expect.arrayContaining([
      'maybes must not win',
      'genuine tie',
      'anonymous below threshold',
      'anonymous at threshold',
      'closed poll',
      'retention due',
    ]));
  });
});

describe('the contract carries no transport', () => {
  it('mentions neither Firestore nor the mailbox in its implementation', () => {
    const src = readFileSync('availability_poll_contract_module.js', 'utf8');
    const body = src
      .slice(src.indexOf('function createAvailabilityPollContract'))
      // Strip comments: the rule is no transport CODE, not never naming a
      // backend. The module has to explain WHICH backends it keeps in step.
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    for (const smell of ['firebase', 'firestore', 'fetch(', 'localStorage', 'UrlFetchApp', 'DriveApp']) {
      expect(body.toLowerCase(), `contract must stay transport-neutral: ${smell}`).not.toContain(smell.toLowerCase());
    }
  });

  it('pins the tighter of the two backends\' limits', () => {
    // A poll built to the mailbox ceiling runs unmodified on both. The reverse
    // silently breaks, which is why these are the mailbox's numbers.
    const code = readFileSync('apps_script/session_mailbox/Code.gs', 'utf8');
    expect(code).toContain(`var MAX_POLL_OPTIONS = ${contract.LIMITS.OPTIONS};`);
  });
});
