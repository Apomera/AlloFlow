/*
 * AlloFlow Availability Poll — transport-neutral contract.
 *
 * docs/availability_poll_spec.md. This module deliberately contains NO
 * transport: no Firestore, no mailbox, no network, no storage. It is the one
 * place the rules of a poll are written down, so the adapters that enforce them
 * (Apps Script computing summaries server-side, Firestore gating documents) have
 * a single reference to conform to rather than two reimplementations that drift.
 *
 * Why this matters more here than for a word cloud: a scheduling poll produces a
 * DECISION. Two backends that disagree about who won is a bug a user cannot
 * diagnose, because both answers look equally authoritative and neither is
 * obviously wrong. runConformanceSuite() is what makes that undiagnosable class
 * of bug fail loudly in CI instead.
 */
(function registerAvailabilityPollContract(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root) {
        root.AlloModules = root.AlloModules || {};
        root.AlloModules.AvailabilityPollContract = api;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function createAvailabilityPollContract() {
    'use strict';

    const VERSION = 1;

    // Deliberately the MAILBOX's limits, not Firestore's: a poll built to the
    // tighter ceiling runs unmodified on both transports, and the reverse
    // silently breaks. Sources are apps_script/session_mailbox/Code.gs.
    const LIMITS = Object.freeze({
        OPTIONS: 50,               // MAX_POLL_OPTIONS
        PARTICIPANTS: 250,         // MAX_ACTIVITY_PARTICIPANTS
        OPTION_LABEL_CHARS: 80,
        NAME_CHARS: 40
    });

    const MARKS = Object.freeze(['yes', 'maybe', 'no']);
    const IDENTITY_MODES = Object.freeze(['anonymous', 'codename', 'real_name']);

    function isSafeKey(key) {
        return typeof key === 'string' && key.length > 0 && key !== '__proto__' && key !== 'constructor' && key !== 'prototype';
    }
    function safeTimestamp(val) {
        if (typeof val !== 'string' && typeof val !== 'number') return NaN;
        return Date.parse(val);
    }
    function resolveNow(now) {
        return (typeof now === 'number' && Number.isFinite(now)) ? now : Date.now();
    }

    // ── Tally ────────────────────────────────────────────────────────────────
    // Counts per option. A row with no picks is not a participant: someone who
    // opened the link and left must not dilute minParticipants.
    function tally(config, responses) {
        const rows = responses && typeof responses === 'object' && !Array.isArray(responses) ? responses : {};
        const rawOptions = Array.isArray(config && config.options) ? config.options.slice(0, LIMITS.OPTIONS) : [];
        const byId = Object.create(null);
        const options = [];
        rawOptions.forEach(function (opt) {
            if (!opt || typeof opt !== 'object' || !isSafeKey(opt.id) || Object.prototype.hasOwnProperty.call(byId, opt.id)) return;
            const slot = { id: opt.id, label: opt.label, yes: 0, maybe: 0, no: 0 };
            byId[opt.id] = slot;
            options.push(slot);
        });
        let participantCount = 0;
        Object.keys(rows).slice(0, LIMITS.PARTICIPANTS).forEach(function (uid) {
            if (!isSafeKey(uid)) return;
            const picks = rows[uid] && rows[uid].picks;
            if (!picks || typeof picks !== 'object' || Array.isArray(picks)) return;
            let matchedValid = false;
            Object.keys(picks).slice(0, LIMITS.OPTIONS).forEach(function (optionId) {
                if (!Object.prototype.hasOwnProperty.call(byId, optionId)) return;
                const slot = byId[optionId];
                const mark = picks[optionId];
                if (MARKS.indexOf(mark) >= 0) {
                    slot[mark]++;
                    matchedValid = true;
                }
            });
            if (matchedValid) participantCount++;
        });
        return { options: options, participantCount: participantCount };
    }

    // ── Winner ───────────────────────────────────────────────────────────────
    // Most yes. A MAYBE IS NEVER A YES: it breaks ties and nothing more, because
    // recommending a slot on the strength of maybes books a meeting nobody
    // committed to. A tie is returned as a tie rather than resolved to whichever
    // option happens to sort first.
    function bestOptionIds(counted) {
        let best = [];
        let bestYes = -1;
        let bestMaybe = -1;
        const opts = Array.isArray(counted && counted.options) ? counted.options.slice(0, LIMITS.OPTIONS) : [];
        opts.forEach(function (opt) {
            if (!opt || typeof opt !== 'object' || !isSafeKey(opt.id)) return;
            const yes = Number.isFinite(Number(opt.yes)) ? Math.max(0, Number(opt.yes)) : 0;
            const maybe = Number.isFinite(Number(opt.maybe)) ? Math.max(0, Number(opt.maybe)) : 0;
            if (yes > bestYes || (yes === bestYes && maybe > bestMaybe)) {
                bestYes = yes;
                bestMaybe = maybe;
                best = [opt.id];
            } else if (yes === bestYes && maybe === bestMaybe) {
                best.push(opt.id);
            }
        });
        return bestYes > 0 ? best : [];
    }

    // ── Visibility ───────────────────────────────────────────────────────────
    // The invariant the whole privacy story rests on. Identity mode is a
    // property of the DATA HANDED BACK, not of the screen: if an adapter can
    // return rows in anonymous mode then the mode is a promise the storage does
    // not keep, whatever the UI chooses to render.
    function visibilityFor(config, counted, isHost, now) {
        const parsedMin = parseInt(config && config.minParticipants, 10);
        const minParticipants = Number.isFinite(parsedMin) && parsedMin >= 1 ? parsedMin : 3;
        const rawCount = Number(counted && counted.participantCount);
        const count = Number.isFinite(rawCount) && rawCount > 0 ? rawCount : 0;
        const revealed = count >= minParticipants;
        // Retention outranks permission. Past deleteAt the rows do not exist, so
        // no audience can be shown them however permissive the mode is. The
        // tally survives on purpose: the decision outlives the respondents.
        // (Found by the conformance suite: the contract granted the organizer
        // rows that the Apps Script had already erased.)
        const rowsExist = !retentionDue(config, now);
        if (config && config.identityMode === 'anonymous') {
            // Withheld from the ORGANIZER too, and the tally waits for the
            // threshold even for them: with a handful of respondents a bare
            // count still fingerprints who said what.
            return { rows: false, tally: revealed, revealed: revealed };
        }
        return { rows: rowsExist && !!isHost, tally: !!isHost || revealed, revealed: revealed };
    }

    // ── Lifecycle ────────────────────────────────────────────────────────────
    function isClosed(config, now) {
        const closesAt = safeTimestamp(config && config.closesAt);
        return isFinite(closesAt) && resolveNow(now) >= closesAt;
    }

    // Past deleteAt the rows go and the tally stays. The tally must be
    // MATERIALISED, because afterwards there is nothing left to recompute it
    // from, and the decision has to outlive the people who made it.
    function retentionDue(config, now) {
        const deleteAt = safeTimestamp(config && config.deleteAt);
        return isFinite(deleteAt) && resolveNow(now) >= deleteAt;
    }

    // ── Conformance ──────────────────────────────────────────────────────────
    // An adapter is any object exposing: tally, best, visibility, isClosed,
    // retentionDue. Every backend must return exactly what the functions above
    // return for the same inputs.
    const FIXTURES = (function buildFixtures() {
        const opts = [{ id: 'o1', label: 'Tue' }, { id: 'o2', label: 'Wed' }, { id: 'o3', label: 'Thu' }];
        const base = { type: 'availability', options: opts, minParticipants: 3, identityMode: 'real_name', closesAt: '', deleteAt: '' };
        return [
            {
                name: 'clear winner',
                config: base,
                responses: {
                    a: { picks: { o1: 'yes', o2: 'no', o3: 'yes' } },
                    b: { picks: { o1: 'yes', o2: 'maybe', o3: 'no' } },
                    c: { picks: { o1: 'yes', o2: 'no', o3: 'no' } }
                }
            },
            {
                name: 'maybes must not win',
                config: base,
                responses: {
                    a: { picks: { o1: 'maybe', o2: 'yes' } },
                    b: { picks: { o1: 'maybe', o2: 'no' } },
                    c: { picks: { o1: 'maybe', o2: 'no' } }
                }
            },
            {
                name: 'genuine tie',
                config: base,
                responses: {
                    a: { picks: { o1: 'yes', o3: 'yes' } },
                    b: { picks: { o1: 'yes', o3: 'yes' } }
                }
            },
            {
                name: 'nobody can make anything',
                config: base,
                responses: { a: { picks: { o1: 'no', o2: 'no', o3: 'no' } } }
            },
            {
                name: 'empty row is not a participant',
                config: base,
                responses: { a: { picks: { o1: 'yes' } }, b: {}, c: { picks: null } }
            },
            {
                name: 'anonymous below threshold',
                config: Object.assign({}, base, { identityMode: 'anonymous' }),
                responses: { a: { picks: { o1: 'yes' } }, b: { picks: { o1: 'no' } } }
            },
            {
                name: 'anonymous at threshold',
                config: Object.assign({}, base, { identityMode: 'anonymous' }),
                responses: {
                    a: { picks: { o1: 'yes' } }, b: { picks: { o1: 'no' } }, c: { picks: { o1: 'yes' } }
                }
            },
            {
                name: 'closed poll',
                config: Object.assign({}, base, { closesAt: '2000-01-01T00:00:00.000Z' }),
                responses: { a: { picks: { o1: 'yes' } } }
            },
            {
                name: 'retention due',
                config: Object.assign({}, base, { deleteAt: '2000-01-01T00:00:00.000Z' }),
                responses: { a: { picks: { o1: 'yes' } } }
            }
        ];
    })();

    function runConformanceSuite(adapter) {
        if (!adapter || typeof adapter !== 'object') {
            return { ok: false, failures: [{ fixture: '*', check: 'adapter', expected: 'object', actual: String(adapter) }], fixtures: FIXTURES.length };
        }
        const failures = [];
        const note = function (fixture, what, expected, actual) {
            failures.push({
                fixture: fixture.name,
                check: what,
                expected: JSON.stringify(expected),
                actual: JSON.stringify(actual)
            });
        };
        FIXTURES.forEach(function (fixture) {
            const expectedTally = tally(fixture.config, fixture.responses);
            const actualTally = adapter.tally(fixture.config, fixture.responses);
            if (JSON.stringify(actualTally) !== JSON.stringify(expectedTally)) {
                note(fixture, 'tally', expectedTally, actualTally);
            }
            const expectedBest = bestOptionIds(expectedTally);
            const actualBest = adapter.best(actualTally);
            if (JSON.stringify(actualBest) !== JSON.stringify(expectedBest)) {
                note(fixture, 'best', expectedBest, actualBest);
            }
            [true, false].forEach(function (isHost) {
                const expectedVis = visibilityFor(fixture.config, expectedTally, isHost);
                const actualVis = adapter.visibility(fixture.config, actualTally, isHost);
                if (JSON.stringify(actualVis) !== JSON.stringify(expectedVis)) {
                    note(fixture, 'visibility(isHost=' + isHost + ')', expectedVis, actualVis);
                }
            });
            const expectedClosed = isClosed(fixture.config, null);
            const actualClosed = adapter.isClosed(fixture.config);
            if (actualClosed !== expectedClosed) note(fixture, 'isClosed', expectedClosed, actualClosed);

            const expectedDue = retentionDue(fixture.config, null);
            const actualDue = adapter.retentionDue(fixture.config);
            if (actualDue !== expectedDue) note(fixture, 'retentionDue', expectedDue, actualDue);
        });
        return { ok: failures.length === 0, failures: failures, fixtures: FIXTURES.length };
    }

    Object.freeze(FIXTURES);
    return Object.freeze({
        VERSION: VERSION,
        LIMITS: LIMITS,
        MARKS: Object.freeze(MARKS.slice()),
        IDENTITY_MODES: Object.freeze(IDENTITY_MODES.slice()),
        tally: tally,
        bestOptionIds: bestOptionIds,
        visibilityFor: visibilityFor,
        isClosed: isClosed,
        retentionDue: retentionDue,
        FIXTURES: FIXTURES,
        runConformanceSuite: runConformanceSuite
    });
});
