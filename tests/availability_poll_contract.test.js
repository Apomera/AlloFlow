// Availability poll, server contract (docs/availability_poll_spec.md).
//
// These exercise the functions that actually run inside the organizer's own
// Apps Script deployment, by evaluating Code.gs in a sandbox. The rules worth
// pinning are the ones where a bug is silent: a mode that leaks rows, a tally
// that double-counts, a late vote that lands after a decision was made, or a
// retention pass that erases the answer along with the answerers.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';

let S;
beforeAll(() => {
  const src = readFileSync('apps_script/session_mailbox/Code.gs', 'utf8');
  const names = [
    'normalizeAssignmentActivityConfig',
    'normalizeAvailabilityPicks',
    'computeAvailabilityTally',
    'availabilityBestOptionIds',
    'applyAvailabilityRetention',
    'buildAvailabilitySummary',
    'availabilityIsClosed',
    'availabilityCodename',
  ];
  // eslint-disable-next-line no-new-func
  S = new Function(`${src}\n;return {${names.join(',')}};`)();
});

const ACT_ID = 'AC-11111111-2222-3333-4444-555555555555';
const cfg = (over = {}) => S.normalizeAssignmentActivityConfig({
  activityId: ACT_ID,
  type: 'availability',
  prompt: 'Pick every time you could make the IEP meeting',
  identityMode: 'real_name',
  options: [{ label: 'Tue 3:15pm' }, { label: 'Wed 3:15pm' }, { label: 'Thu 3:15pm' }],
  ...over,
}, '');

const stateWith = (config, responses, extra = {}) => ({
  activityId: ACT_ID, config, responses, version: 1, updatedAt: 1, ...extra,
});

describe('config normalizing', () => {
  it('accepts a well-formed poll and generates its own option ids', () => {
    const c = cfg();
    expect(c).toBeTruthy();
    expect(c.type).toBe('availability');
    // Ids are generated, never accepted from input, so no client can address a
    // slot that is not on the ballot.
    expect(c.options.map((o) => o.id)).toEqual(['o1', 'o2', 'o3']);
    expect(c.options[0].label).toBe('Tue 3:15pm');
  });

  it('refuses a poll with no identity mode', () => {
    // No default on purpose: identity is a privacy decision, and a default is
    // the thing nobody notices.
    expect(cfg({ identityMode: undefined })).toBeNull();
    expect(cfg({ identityMode: 'whatever' })).toBeNull();
  });

  it('refuses a ballot with fewer than two options', () => {
    expect(cfg({ options: [{ label: 'Only one' }] })).toBeNull();
    expect(cfg({ options: [] })).toBeNull();
  });

  it('caps the ballot far above what a free scheduling tool usually allows', () => {
    const many = Array.from({ length: 80 }, (_, i) => ({ label: `Slot ${i + 1}` }));
    expect(cfg({ options: many }).options.length).toBe(50);
  });

  it('ignores a client-supplied option id and drops blank labels', () => {
    const c = cfg({ options: [{ id: 'evil', label: 'Tue' }, { label: '   ' }, { label: 'Wed' }] });
    expect(c.options.map((o) => o.id)).toEqual(['o1', 'o2']);
    expect(c.options.map((o) => o.label)).toEqual(['Tue', 'Wed']);
  });

  it('maps a legacy expiresAt onto closesAt', () => {
    const c = S.normalizeAssignmentActivityConfig({
      activityId: ACT_ID, type: 'availability', prompt: 'p', identityMode: 'anonymous',
      options: [{ label: 'a' }, { label: 'b' }], expiresAt: '2026-09-01T00:00:00.000Z',
    }, '');
    expect(c.closesAt).toBe('2026-09-01T00:00:00.000Z');
  });
});

describe('recording a vote', () => {
  it('keeps only known options and valid marks', () => {
    const c = cfg();
    // A stale ballot should still record the slots that DO still exist rather
    // than failing the whole submission.
    const picks = S.normalizeAvailabilityPicks({ o1: 'yes', o2: 'maybe', o9: 'yes', o3: 'nonsense' }, c);
    expect(picks).toEqual({ o1: 'yes', o2: 'maybe' });
  });

  it('downgrades maybe to yes when the organizer disabled maybe', () => {
    const picks = S.normalizeAvailabilityPicks({ o1: 'maybe' }, cfg({ allowMaybe: false }));
    expect(picks).toEqual({ o1: 'yes' });
  });

  it('rejects multiple yeses in single-choice mode', () => {
    const single = cfg({ multiSelect: false });
    expect(S.normalizeAvailabilityPicks({ o1: 'yes', o2: 'yes' }, single)).toBeNull();
    expect(S.normalizeAvailabilityPicks({ o1: 'yes', o2: 'no' }, single)).toEqual({ o1: 'yes', o2: 'no' });
  });

  it('rejects a submission that marks nothing at all', () => {
    expect(S.normalizeAvailabilityPicks({ o9: 'yes' }, cfg())).toBeNull();
    expect(S.normalizeAvailabilityPicks({}, cfg())).toBeNull();
  });
});

describe('tallying and picking a winner', () => {
  const three = (over) => stateWith(cfg(over), {
    a: { picks: { o1: 'yes', o2: 'no', o3: 'yes' } },
    b: { picks: { o1: 'yes', o2: 'maybe', o3: 'no' } },
    c: { picks: { o1: 'no', o2: 'maybe', o3: 'yes' } },
  });

  it('counts each mark per option', () => {
    const t = S.computeAvailabilityTally(three().config, three().responses);
    expect(t.participantCount).toBe(3);
    expect(t.options[0]).toMatchObject({ id: 'o1', yes: 2, maybe: 0, no: 1 });
    expect(t.options[1]).toMatchObject({ id: 'o2', yes: 0, maybe: 2, no: 1 });
  });

  it('never counts a maybe as a yes', () => {
    const t = S.computeAvailabilityTally(three().config, three().responses);
    // o2 has two maybes and zero yeses. If maybe counted as yes it would tie
    // the winners at 2 and the poll would recommend a slot nobody committed to.
    expect(S.availabilityBestOptionIds(t)).not.toContain('o2');
  });

  it('reports a tie as a tie instead of silently picking the first', () => {
    const st = stateWith(cfg(), {
      a: { picks: { o1: 'yes', o3: 'yes' } },
      b: { picks: { o1: 'yes', o3: 'yes' } },
    });
    const t = S.computeAvailabilityTally(st.config, st.responses);
    expect(S.availabilityBestOptionIds(t).sort()).toEqual(['o1', 'o3']);
  });

  it('breaks a tie on maybe, which is what maybe is for', () => {
    const st = stateWith(cfg(), {
      a: { picks: { o1: 'yes', o2: 'yes' } },
      b: { picks: { o1: 'maybe', o2: 'no' } },
    });
    const t = S.computeAvailabilityTally(st.config, st.responses);
    expect(S.availabilityBestOptionIds(t)).toEqual(['o1']);
  });

  it('names no winner when nobody can make anything', () => {
    const st = stateWith(cfg(), { a: { picks: { o1: 'no', o2: 'no', o3: 'no' } } });
    const t = S.computeAvailabilityTally(st.config, st.responses);
    expect(S.availabilityBestOptionIds(t)).toEqual([]);
  });
});

describe('identity mode is enforced in the data, not the UI', () => {
  const responses = {
    'mb-aaaaaaaa': { name: 'Sam R.', picks: { o1: 'yes' } },
    'mb-bbbbbbbb': { name: 'Jo P.', picks: { o1: 'yes' } },
    'mb-cccccccc': { name: 'Kim L.', picks: { o1: 'no' } },
  };

  it('gives the organizer named rows in real_name mode', () => {
    const out = S.buildAvailabilitySummary(stateWith(cfg(), { ...responses }), true);
    expect(out.rows.map((r) => r.label).sort()).toEqual(['Jo P.', 'Kim L.', 'Sam R.']);
  });

  it('substitutes a stable codename in codename mode, never the typed name', () => {
    const st = stateWith(cfg({ identityMode: 'codename' }), { ...responses });
    const out = S.buildAvailabilitySummary(st, true);
    expect(out.rows.length).toBe(3);
    for (const row of out.rows) {
      expect(row.label).not.toMatch(/Sam|Jo|Kim/);
      expect(row.label).toMatch(/\w+ \w+/);
    }
    // Stable, or a returning voter would appear twice and the tally would lie.
    expect(S.availabilityCodename('mb-aaaaaaaa')).toBe(S.availabilityCodename('mb-aaaaaaaa'));
    expect(S.availabilityCodename('mb-aaaaaaaa')).not.toBe(S.availabilityCodename('mb-bbbbbbbb'));
  });

  it('withholds rows from the ORGANIZER in anonymous mode', () => {
    // The whole point: if the summary can hand back rows, the mode is a promise
    // the data does not keep.
    const st = stateWith(cfg({ identityMode: 'anonymous' }), { ...responses });
    const out = S.buildAvailabilitySummary(st, true);
    expect(out.rows).toEqual([]);
    expect(JSON.stringify(out)).not.toContain('Sam R.');
  });

  it('withholds even the tally in anonymous mode until enough people answer', () => {
    // With two respondents out of a known group, a bare count still fingerprints.
    const st = stateWith(cfg({ identityMode: 'anonymous' }), {
      a: { picks: { o1: 'yes' } }, b: { picks: { o1: 'no' } },
    });
    const out = S.buildAvailabilitySummary(st, true);
    expect(out.revealed).toBe(false);
    expect(out.tally).toEqual([]);
    expect(out.best).toEqual([]);
  });

  it('shows the organizer a running tally in named modes before the threshold', () => {
    // A scheduling poll is useless if the organizer cannot watch it fill up.
    const st = stateWith(cfg(), { a: { picks: { o1: 'yes' } } });
    const out = S.buildAvailabilitySummary(st, true);
    expect(out.tally.length).toBe(3);
  });

  it('never gives a respondent anyone else\'s row', () => {
    const out = S.buildAvailabilitySummary(stateWith(cfg(), { ...responses }), false);
    expect(out.rows).toEqual([]);
  });
});

describe('closing and retention', () => {
  const PAST = '2000-01-01T00:00:00.000Z';
  const FUTURE = '2999-01-01T00:00:00.000Z';

  it('knows when voting has closed', () => {
    expect(S.availabilityIsClosed({ closesAt: PAST })).toBe(true);
    expect(S.availabilityIsClosed({ closesAt: FUTURE })).toBe(false);
    expect(S.availabilityIsClosed({ closesAt: '' })).toBe(false);
  });

  it('keeps results readable after voting closes', () => {
    // closesAt stops collection. It must NOT hide the answer the organizer was
    // collecting, which is the reason it is separate from deleteAt.
    const st = stateWith(cfg({ closesAt: PAST }), {
      a: { picks: { o1: 'yes' } }, b: { picks: { o1: 'yes' } }, c: { picks: { o1: 'yes' } },
    });
    const out = S.buildAvailabilitySummary(st, true);
    expect(out.closed).toBe(true);
    expect(out.tally[0].yes).toBe(3);
    expect(out.best).toEqual(['o1']);
  });

  it('erases rows at deleteAt but keeps the decision', () => {
    const st = stateWith(cfg({ closesAt: PAST, deleteAt: PAST }), {
      a: { name: 'Sam R.', picks: { o1: 'yes' } },
      b: { name: 'Jo P.', picks: { o1: 'yes' } },
      c: { name: 'Kim L.', picks: { o1: 'no' } },
    });
    expect(S.applyAvailabilityRetention(st)).toBe(true);
    expect(st.responses).toEqual({});
    // The tally is MATERIALISED, because after this there are no rows left to
    // recompute it from.
    expect(st.tally.options[0]).toMatchObject({ id: 'o1', yes: 2, no: 1 });
    expect(JSON.stringify(st)).not.toContain('Sam R.');

    const out = S.buildAvailabilitySummary(st, true);
    expect(out.rows).toEqual([]);
    expect(out.best).toEqual(['o1']);
  });

  it('does not erase anything before deleteAt', () => {
    const st = stateWith(cfg({ deleteAt: FUTURE }), { a: { picks: { o1: 'yes' } } });
    expect(S.applyAvailabilityRetention(st)).toBe(false);
    expect(Object.keys(st.responses).length).toBe(1);
  });

  it('leaves polls with no deleteAt alone forever', () => {
    const st = stateWith(cfg(), { a: { picks: { o1: 'yes' } } });
    expect(S.applyAvailabilityRetention(st)).toBe(false);
  });
});
