/*
 * AlloFlow Sign-up Sheet — transport-neutral contract.
 *
 * docs/availability_poll_spec.md §14. No transport in this file: no Firestore,
 * no mailbox, no network, no storage. It is the one place the rules of a sheet
 * are written down, so the adapters that enforce them have a single reference
 * rather than two reimplementations that drift.
 *
 * A separate contract from the poll rather than a shared one, because the rules
 * genuinely differ. A poll aggregates opinions and can therefore hide a tally
 * until minParticipants; a sheet allocates a scarce thing and is useless if it
 * hides what is left. Folding both into one contract would mean a pile of
 * per-type branches, which is exactly the drift a contract exists to prevent.
 *
 * The rule that matters most: capacity is checked against what OTHER people
 * hold, at the moment of writing. Everything else here is bookkeeping.
 */
(function registerSignupSheetContract(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root) {
        root.AlloModules = root.AlloModules || {};
        root.AlloModules.SignupSheetContract = api;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function createSignupSheetContract() {
    'use strict';

    const VERSION = 1;

    // The mailbox's limits, deliberately: a sheet built to the tighter ceiling
    // runs unmodified on both transports and the reverse silently breaks.
    const LIMITS = Object.freeze({
        OPTIONS: 50,               // MAX_POLL_OPTIONS
        CAPACITY: 500,             // MAX_SIGNUP_CAPACITY
        PARTICIPANTS: 250,         // MAX_ACTIVITY_PARTICIPANTS
        OPTION_LABEL_CHARS: 80,
        NAME_CHARS: 40
    });

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

    function capacityFor(config, optionId) {
        if (!isSafeKey(optionId)) return 0;
        const options = Array.isArray(config && config.options) ? config.options.slice(0, LIMITS.OPTIONS) : [];
        for (let i = 0; i < options.length; i++) {
            if (options[i] && options[i].id === optionId) {
                const parsed = parseInt(options[i].capacity, 10);
                if (!Number.isFinite(parsed)) return 1;
                return Math.min(LIMITS.CAPACITY, Math.max(0, parsed));
            }
        }
        return 0;
    }

    // ── Accounting ───────────────────────────────────────────────────────────
    // exceptUid is load bearing, not an optimisation. Counting a person's own
    // existing claim against them makes editing a claim fail as "full", so a
    // respondent loses their seat to themselves.
    function takenCounts(config, responses, exceptUid) {
        const counts = Object.create(null);
        const options = Array.isArray(config && config.options) ? config.options.slice(0, LIMITS.OPTIONS) : [];
        options.forEach(function (opt) {
            if (opt && isSafeKey(opt.id) && !Object.prototype.hasOwnProperty.call(counts, opt.id)) {
                counts[opt.id] = 0;
            }
        });
        const rows = responses && typeof responses === 'object' && !Array.isArray(responses) ? responses : {};
        Object.keys(rows).slice(0, LIMITS.PARTICIPANTS).forEach(function (uid) {
            if (!isSafeKey(uid)) return;
            if (exceptUid != null && uid === exceptUid) return;
            const claims = rows[uid] && rows[uid].claims;
            if (!Array.isArray(claims)) return;
            const seenForUser = new Set();
            claims.slice(0, LIMITS.OPTIONS).forEach(function (id) {
                if (!isSafeKey(id) || seenForUser.has(id)) return;
                if (Object.prototype.hasOwnProperty.call(counts, id)) {
                    seenForUser.add(id);
                    counts[id]++;
                }
            });
        });
        return counts;
    }

    function remainingFor(config, counts) {
        const safeCounts = counts && typeof counts === 'object' ? counts : Object.create(null);
        const options = Array.isArray(config && config.options) ? config.options.slice(0, LIMITS.OPTIONS) : [];
        const seenIds = Object.create(null);
        const out = [];
        options.forEach(function (opt) {
            if (!opt || typeof opt !== 'object' || !isSafeKey(opt.id) || Object.prototype.hasOwnProperty.call(seenIds, opt.id)) return;
            seenIds[opt.id] = true;
            const cap = capacityFor(config, opt.id);
            const rawTaken = Object.prototype.hasOwnProperty.call(safeCounts, opt.id) ? parseInt(safeCounts[opt.id], 10) : 0;
            const taken = Number.isFinite(rawTaken) && rawTaken > 0 ? rawTaken : 0;
            out.push({
                id: opt.id,
                label: opt.label,
                capacity: cap,
                taken: taken,
                remaining: Math.max(0, cap - taken)
            });
        });
        return out;
    }

    // ── The allocation rule ──────────────────────────────────────────────────
    // Whole-submission semantics: if any requested slot is full the submission
    // is refused and the full ones are named. Partially granting a request would
    // leave somebody believing they hold a seat they do not.
    function evaluateClaim(config, responses, uid, wanted) {
        const requested = Array.isArray(wanted) ? wanted : null;
        if (!requested) return { ok: false, reason: 'bad-claims', full: [] };
        const parsedMax = parseInt(config && config.maxPerPerson, 10);
        const maxPerPerson = Number.isFinite(parsedMax) && parsedMax >= 1 ? Math.min(LIMITS.OPTIONS, parsedMax) : 1;
        if (requested.length > maxPerPerson) {
            return { ok: false, reason: 'too-many', full: [] };
        }
        const seenWanted = new Set();
        for (let i = 0; i < requested.length; i++) {
            const id = requested[i];
            if (!isSafeKey(id) || seenWanted.has(id)) {
                return { ok: false, reason: 'bad-claims', full: [] };
            }
            seenWanted.add(id);
        }
        const counts = takenCounts(config, responses, uid);
        const full = requested.filter(function (id) {
            return !Object.prototype.hasOwnProperty.call(counts, id) || counts[id] >= capacityFor(config, id);
        });
        if (full.length) return { ok: false, reason: 'slot-full', full: full };
        return { ok: true, reason: '', full: [] };
    }

    // ── Visibility ───────────────────────────────────────────────────────────
    // Counts are ALWAYS public. Names follow identity mode and are host-only,
    // and anonymous withholds them from the organizer too, which keeps the
    // sheet usable while keeping the promise.
    function visibilityFor(config, isHost, now) {
        // Retention outranks permission: past deleteAt the names do not exist,
        // so no audience can be shown them however permissive the mode is. The
        // COUNTS survive, which is the whole point of keeping a tally. (Found by
        // the conformance suite, exactly as it was for the poll.)
        const namesExist = !retentionDue(config, now);
        return {
            counts: true,
            who: namesExist && !!isHost && (!config || config.identityMode !== 'anonymous')
        };
    }

    function isClosed(config, now) {
        const closesAt = safeTimestamp(config && config.closesAt);
        return isFinite(closesAt) && resolveNow(now) >= closesAt;
    }

    function retentionDue(config, now) {
        const deleteAt = safeTimestamp(config && config.deleteAt);
        return isFinite(deleteAt) && resolveNow(now) >= deleteAt;
    }

    // ── Conformance ──────────────────────────────────────────────────────────
    const FIXTURES = (function buildFixtures() {
        const base = {
            type: 'signup',
            identityMode: 'real_name',
            maxPerPerson: 1,
            minParticipants: 3,
            closesAt: '',
            deleteAt: '',
            options: [
                { id: 'o1', label: 'Tue 3:15', capacity: 1 },
                { id: 'o2', label: 'Tue 3:45', capacity: 2 },
                { id: 'o3', label: 'Wed 3:15', capacity: 1 }
            ]
        };
        return [
            { name: 'empty sheet', config: base, responses: {}, uid: 'mb-new', wanted: ['o1'] },
            {
                name: 'claim a free slot',
                config: base,
                responses: { 'mb-a': { name: 'Sam', claims: ['o2'] } },
                uid: 'mb-new', wanted: ['o1']
            },
            {
                name: 'LAST SEAT taken by someone else',
                config: base,
                responses: { 'mb-a': { name: 'Sam', claims: ['o1'] } },
                uid: 'mb-new', wanted: ['o1']
            },
            {
                name: 'partly full multi-capacity slot still has room',
                config: base,
                responses: { 'mb-a': { claims: ['o2'] } },
                uid: 'mb-new', wanted: ['o2']
            },
            {
                name: 'multi-capacity slot exhausted',
                config: base,
                responses: { 'mb-a': { claims: ['o2'] }, 'mb-b': { claims: ['o2'] } },
                uid: 'mb-new', wanted: ['o2']
            },
            {
                name: 'RECLAIMING my own seat must succeed',
                config: base,
                responses: { 'mb-me': { name: 'Me', claims: ['o1'] } },
                uid: 'mb-me', wanted: ['o1']
            },
            {
                name: 'releasing a seat',
                config: base,
                responses: { 'mb-me': { claims: ['o1'] } },
                uid: 'mb-me', wanted: []
            },
            {
                name: 'more slots than allowed',
                config: base,
                responses: {},
                uid: 'mb-new', wanted: ['o1', 'o3']
            },
            {
                name: 'two slots when two are allowed',
                config: Object.assign({}, base, { maxPerPerson: 2 }),
                responses: {},
                uid: 'mb-new', wanted: ['o1', 'o3']
            },
            {
                name: 'anonymous hides who, keeps counts',
                config: Object.assign({}, base, { identityMode: 'anonymous' }),
                responses: { 'mb-a': { claims: ['o1'] } },
                uid: 'mb-new', wanted: ['o2']
            },
            {
                name: 'closed sheet',
                config: Object.assign({}, base, { closesAt: '2000-01-01T00:00:00.000Z' }),
                responses: {}, uid: 'mb-new', wanted: ['o1']
            },
            {
                name: 'retention due',
                config: Object.assign({}, base, { deleteAt: '2000-01-01T00:00:00.000Z' }),
                responses: { 'mb-a': { name: 'Sam', claims: ['o1'] } },
                uid: 'mb-new', wanted: ['o2']
            }
        ];
    })();

    function runConformanceSuite(adapter) {
        if (!adapter || typeof adapter !== 'object') {
            return { ok: false, failures: [{ fixture: '*', check: 'adapter', expected: 'object', actual: String(adapter) }], fixtures: FIXTURES.length };
        }
        const failures = [];
        const note = function (fixture, check, expected, actual) {
            failures.push({
                fixture: fixture.name, check: check,
                expected: JSON.stringify(expected), actual: JSON.stringify(actual)
            });
        };
        FIXTURES.forEach(function (fixture) {
            const expectedCounts = takenCounts(fixture.config, fixture.responses, null);
            const actualCounts = adapter.counts(fixture.config, fixture.responses, null);
            if (JSON.stringify(actualCounts) !== JSON.stringify(expectedCounts)) {
                note(fixture, 'counts', expectedCounts, actualCounts);
            }

            const expectedSelf = takenCounts(fixture.config, fixture.responses, fixture.uid);
            const actualSelf = adapter.counts(fixture.config, fixture.responses, fixture.uid);
            if (JSON.stringify(actualSelf) !== JSON.stringify(expectedSelf)) {
                note(fixture, 'counts(excluding self)', expectedSelf, actualSelf);
            }

            const expectedRemaining = remainingFor(fixture.config, expectedCounts);
            const actualRemaining = adapter.remaining(fixture.config, actualCounts);
            if (JSON.stringify(actualRemaining) !== JSON.stringify(expectedRemaining)) {
                note(fixture, 'remaining', expectedRemaining, actualRemaining);
            }

            const expectedClaim = evaluateClaim(fixture.config, fixture.responses, fixture.uid, fixture.wanted);
            const actualClaim = adapter.evaluateClaim(fixture.config, fixture.responses, fixture.uid, fixture.wanted);
            if (JSON.stringify(actualClaim) !== JSON.stringify(expectedClaim)) {
                note(fixture, 'evaluateClaim', expectedClaim, actualClaim);
            }

            [true, false].forEach(function (isHost) {
                const expectedVis = visibilityFor(fixture.config, isHost);
                const actualVis = adapter.visibility(fixture.config, isHost);
                if (JSON.stringify(actualVis) !== JSON.stringify(expectedVis)) {
                    note(fixture, 'visibility(isHost=' + isHost + ')', expectedVis, actualVis);
                }
            });

            const expectedClosed = isClosed(fixture.config, null);
            if (adapter.isClosed(fixture.config) !== expectedClosed) {
                note(fixture, 'isClosed', expectedClosed, adapter.isClosed(fixture.config));
            }
            const expectedDue = retentionDue(fixture.config, null);
            if (adapter.retentionDue(fixture.config) !== expectedDue) {
                note(fixture, 'retentionDue', expectedDue, adapter.retentionDue(fixture.config));
            }
        });
        return { ok: failures.length === 0, failures: failures, fixtures: FIXTURES.length };
    }

    Object.freeze(FIXTURES);
    return Object.freeze({
        VERSION: VERSION,
        LIMITS: LIMITS,
        capacityFor: capacityFor,
        takenCounts: takenCounts,
        remainingFor: remainingFor,
        evaluateClaim: evaluateClaim,
        visibilityFor: visibilityFor,
        isClosed: isClosed,
        retentionDue: retentionDue,
        FIXTURES: FIXTURES,
        runConformanceSuite: runConformanceSuite
    });
});
