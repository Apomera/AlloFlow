// Survey activity — the multi-question instrument on the class mailbox.
//
// Evaluates the REAL apps_script/session_mailbox/Code.gs (same sandbox pattern
// as tests/class_mailbox.test.js) and drives full lifecycles: host a survey,
// join, answer, change an answer, hit the anonymity floor, read results as
// respondent vs organizer, close, and retention.
//
// Why this type exists: every earlier activity is one prompt with one answer.
// A Likert scale is only a measurement across >=2 items (the router refuses
// single-item routing for the same reason), and pre/post comparison needs the
// same instrument delivered as ONE thing. These tests pin that contract.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const gsSource = fs.readFileSync(path.join(ROOT, 'apps_script', 'session_mailbox', 'Code.gs'), 'utf8');

function makeGsSandbox() {
    const cacheStore = new Map();
    const props = new Map();
    const driveFiles = new Map();
    let uuidCounter = 0;
    const cache = {
        get: k => (cacheStore.has(k) ? cacheStore.get(k) : null),
        put: (k, v) => { cacheStore.set(k, String(v)); },
        getAll: keys => { const o = {}; keys.forEach(k => { if (cacheStore.has(k)) o[k] = cacheStore.get(k); }); return o; },
        remove: k => { cacheStore.delete(k); },
    };
    const fileObj = name => ({
        setContent: c => { driveFiles.set(name, String(c)); },
        getBlob: () => ({ getDataAsString: () => driveFiles.get(name) }),
        setTrashed: () => { driveFiles.delete(name); },
    });
    const folder = {
        getFilesByName: name => {
            let used = false;
            return { hasNext: () => driveFiles.has(name) && !used, next: () => { used = true; return fileObj(name); } };
        },
        createFile: (name, content) => { driveFiles.set(name, String(content)); return fileObj(name); },
    };
    const services = {
        CacheService: { getScriptCache: () => cache },
        PropertiesService: { getScriptProperties: () => ({
            getProperty: k => (props.has(k) ? props.get(k) : null),
            setProperty: (k, v) => props.set(k, String(v)),
            deleteProperty: k => { props.delete(k); },
            getProperties: () => Object.fromEntries(props),
        }) },
        LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
        ContentService: (() => {
            const svc = { MimeType: { JSON: 'json' } };
            svc.createTextOutput = s => { const o = { _c: s, setMimeType: () => o, getContent: () => o._c }; return o; };
            return svc;
        })(),
        DriveApp: { getFoldersByName: () => ({ hasNext: () => true, next: () => folder }), createFolder: () => folder },
        Utilities: {
            getUuid: () => 'aaaaaaaa-bbbb-cccc-dddd-' + String(uuidCounter++).padStart(12, '0'),
            computeHmacSha256Signature: (value, key) => Array.from(Buffer.from((String(key) + '|' + String(value)).repeat(8)).subarray(0, 32)),
            base64EncodeWebSafe: bytes => Buffer.from(bytes).toString('base64url'),
        },
    };
    const factory = new Function(...Object.keys(services), gsSource + '; return { handle: handle };');
    const api = factory(...Object.values(services));
    const call = payload => JSON.parse(api.handle(payload).getContent());
    return { call, driveFiles };
}

const ID = 'PK-52345678-1234-1234-1234-123456789012';
const AID = 'AC-52345678-1234-1234-1234-123456789012';
const SECRET = 'p_secret_p_secret_20';

const SURVEY_ITEMS = [
    { type: 'likert', text: 'I feel confident using this tool', required: true,
      labels: ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'] },
    { type: 'likert', text: 'I would use it again next week', required: true, steps: 5 },
    { type: 'choice', text: 'Which support helped most?', options: ['Read-aloud', 'Glossary', 'Pictures'] },
    { type: 'freetext', text: 'Anything else we should know?' },
    { type: 'numeric', text: 'About how many minutes did homework take?', min: 0, max: 240 },
];

// claim is once-per-deployment, so the admin is minted a single time per
// sandbox and reused across hostSurvey calls (a second claim is refused).
const admins = new WeakMap();
function hostSurvey(call, overrides = {}) {
    if (!admins.has(call)) admins.set(call, call({ a: 'claim' }).admin);
    const admin = admins.get(call);
    const expiresAt = new Date(Date.now() + 86400000).toISOString();
    const survey = {
        activityId: AID,
        type: 'survey',
        prompt: 'How did this week go?',
        identityMode: 'anonymous',
        minParticipants: 3,
        items: SURVEY_ITEMS,
        ...overrides,
    };
    const hosted = call({
        a: 'putpack', admin, id: ID, k: SECRET, part: 1, of: 1, data: 'PACK',
        title: 'Weekly check-in', expiresAt, activities: [survey],
    });
    return { admin, hosted, expiresAt };
}

const join = call => call({ a: 'joinactivity', id: ID, aid: AID, k: SECRET });
const actor = student => ({ id: ID, aid: AID, uid: student.uid, pt: student.pt });
// Item ids are server-generated in authoring order: i1..iN.
const GOOD = { i1: 4, i2: 5, i3: 'o2', i4: 'The glossary really helped my daughter.', i5: 25 };

describe('hosting a survey', () => {
    it('normalizes the config: generated item ids, labels drive steps, options get ids', () => {
        const { call, driveFiles } = makeGsSandbox();
        const { hosted } = hostSurvey(call);
        expect(hosted).toMatchObject({ ok: true, activities: 1 });
        const manifest = JSON.parse(driveFiles.get(`pack-${ID}.json`));
        const config = manifest.activities[0];
        expect(config.type).toBe('survey');
        expect(config.items.map(item => item.id)).toEqual(['i1', 'i2', 'i3', 'i4', 'i5']);
        expect(config.items[0].steps).toBe(5);            // five labels -> five steps
        expect(config.items[0].labels).toHaveLength(5);
        expect(config.items[1].labels).toEqual([]);        // steps without labels is fine
        expect(config.items[2].options.map(o => o.id)).toEqual(['o1', 'o2', 'o3']);
        expect(config.items[4].min).toBe(0);
        expect(config.items[4].max).toBe(240);
    });

    it('rejects a survey without an explicit identity mode — privacy has no default', () => {
        const { call } = makeGsSandbox();
        const { hosted } = hostSurvey(call, { identityMode: '' });
        expect(hosted.e).toBe('bad-activity');
    });

    it('rejects unknown item types loudly instead of shipping a partial form', () => {
        const { call } = makeGsSandbox();
        const { hosted } = hostSurvey(call, { items: [{ type: 'essay', text: 'Write at length' }] });
        expect(hosted.e).toBe('bad-activity');
    });

    it('rejects an empty, oversized, or degenerate instrument', () => {
        const { call } = makeGsSandbox();
        expect(hostSurvey(call, { items: [] }).hosted.e).toBe('bad-activity');
        expect(hostSurvey(call, {
            items: Array.from({ length: 13 }, (_, i) => ({ type: 'freetext', text: `Q${i}` })),
        }).hosted.e).toBe('bad-activity');
        // A 1-step Likert is not a scale, and a choice needs two choices.
        expect(hostSurvey(call, { items: [{ type: 'likert', text: 'Rate', steps: 1 }] }).hosted.e).toBe('bad-activity');
        expect(hostSurvey(call, { items: [{ type: 'choice', text: 'Pick', options: ['Only'] }] }).hosted.e).toBe('bad-activity');
    });

    it('carries the study information sheet to respondents, sanitized and capped', () => {
        // Consent is collected OUTSIDE the app by design; the info sheet is
        // the informational half — who is asking and what answers are for.
        const { call, driveFiles } = makeGsSandbox();
        const { hosted } = hostSurvey(call, {
            info: '  Part of "Pilot A".   Taking part is voluntary. ' + 'x'.repeat(700),
        });
        expect(hosted.ok).toBe(true);
        const manifest = JSON.parse(driveFiles.get(`pack-${ID}.json`));
        const info = manifest.activities[0].info;
        expect(info.startsWith('Part of "Pilot A". Taking part is voluntary.')).toBe(true);
        expect(info.length).toBeLessThanOrEqual(600);
        expect(info).not.toContain('  ');   // whitespace collapsed
        // The respondent-facing summary carries it too.
        const student = join(call);
        const view = call({ a: 'getactivitysummary', ...actor(student) });
        expect(view.info).toBe(info);
    });

    it('advertises the survey capability from hello, so a stale deployment is detectable', () => {
        const { call } = makeGsSandbox();
        const hello = call({ a: 'hello' });
        expect(hello.v).toBeGreaterThanOrEqual(13);
        expect(hello.activities).toContain('survey');
    });
});

describe('answering', () => {
    it('accepts one submission across all items and returns own answers', () => {
        const { call } = makeGsSandbox();
        hostSurvey(call);
        const student = join(call);
        const result = call({ a: 'activityupsert', ...actor(student), answers: JSON.stringify(GOOD) });
        expect(result).toMatchObject({ ok: true, type: 'survey', participantCount: 1, revealed: false });
        expect(result.own.answers).toEqual(GOOD);
    });

    it('rejects a missing required item and every malformed answer shape', () => {
        const { call } = makeGsSandbox();
        hostSurvey(call);
        const student = join(call);
        const submit = answers => call({ a: 'activityupsert', ...actor(student), answers: JSON.stringify(answers) }).e;
        expect(submit({ i3: 'o1' })).toBe('bad-answers');                 // required i1/i2 absent
        expect(submit({ ...GOOD, i1: 6 })).toBe('bad-answers');           // off the scale
        expect(submit({ ...GOOD, i1: 2.5 })).toBe('bad-answers');         // not a tick
        expect(submit({ ...GOOD, i3: 'o9' })).toBe('bad-answers');        // option not on the form
        expect(submit({ ...GOOD, i5: 999 })).toBe('bad-answers');         // outside numeric bounds
        expect(submit({})).toBe('bad-answers');
    });

    it('drops answers to item ids that are not on the form (stale-form tolerance)', () => {
        const { call } = makeGsSandbox();
        hostSurvey(call);
        const student = join(call);
        const result = call({ a: 'activityupsert', ...actor(student), answers: JSON.stringify({ ...GOOD, i99: 3 }) });
        expect(result.ok).toBe(true);
        expect(result.own.answers.i99).toBeUndefined();
    });

    it('a resubmission REPLACES the row instead of inflating the aggregate', () => {
        const { call } = makeGsSandbox();
        hostSurvey(call);
        const student = join(call);
        call({ a: 'activityupsert', ...actor(student), answers: JSON.stringify(GOOD) });
        const changed = call({ a: 'activityupsert', ...actor(student), answers: JSON.stringify({ ...GOOD, i1: 1 }) });
        expect(changed.participantCount).toBe(1);
        expect(changed.own.answers.i1).toBe(1);
    });

    it('refuses answers after closesAt', () => {
        const { call } = makeGsSandbox();
        hostSurvey(call, { closesAt: new Date(Date.now() - 1000).toISOString() });
        const student = join(call);
        expect(call({ a: 'activityupsert', ...actor(student), answers: JSON.stringify(GOOD) }).e).toBe('poll-closed');
    });
});

describe('the anonymity floor', () => {
    it('keeps aggregates hidden below minParticipants, then reveals with correct math', () => {
        const { call } = makeGsSandbox();
        hostSurvey(call);
        const students = [join(call), join(call), join(call)];
        const answers = [
            { i1: 4, i2: 5, i3: 'o2', i5: 30 },
            { i1: 2, i2: 4, i3: 'o2' },
            { i1: 3, i2: 3, i3: 'o1', i4: 'More pictures please', i5: 10 },
        ];
        const second = call({ a: 'activityupsert', ...actor(students[1]), answers: JSON.stringify(answers[1]) });
        expect(second.revealed).toBe(false);
        call({ a: 'activityupsert', ...actor(students[0]), answers: JSON.stringify(answers[0]) });
        const third = call({ a: 'activityupsert', ...actor(students[2]), answers: JSON.stringify(answers[2]) });
        expect(third.revealed).toBe(true);
        const likert = third.items.find(item => item.id === 'i1');
        expect(likert.aggregate.counts).toEqual([0, 1, 1, 1, 0]);
        expect(likert.aggregate.mean).toBe(3);
        const choice = third.items.find(item => item.id === 'i3');
        expect(choice.aggregate.counts).toEqual({ o1: 1, o2: 2, o3: 0 });
        const minutes = third.items.find(item => item.id === 'i5');
        expect(minutes.aggregate).toMatchObject({ n: 2, mean: 20, min: 10, max: 30 });
    });

    it('in anonymous mode the floor gates the ORGANIZER too, and rows never exist', () => {
        const { call } = makeGsSandbox();
        const { admin } = hostSurvey(call);
        const student = join(call);
        call({ a: 'activityupsert', ...actor(student), answers: JSON.stringify(GOOD) });
        const early = call({ a: 'getactivityadmin', admin, id: ID, aid: AID });
        expect(early.rows).toEqual([]);
        expect(early.items.every(item => item.aggregate === undefined)).toBe(true);
        expect(early.items.find(item => item.id === 'i4').texts).toBeUndefined();
        const more = [join(call), join(call)];
        more.forEach((extra, index) => call({
            a: 'activityupsert', ...actor(extra),
            answers: JSON.stringify({ i1: 1 + index, i2: 3, i4: `Note ${index}` }),
        }));
        const after = call({ a: 'getactivityadmin', admin, id: ID, aid: AID });
        expect(after.revealed).toBe(true);
        expect(after.rows).toEqual([]);  // anonymous means anonymous, organizer included
        // Free text reaches the organizer detached from identity, sorted, not in arrival order.
        const texts = after.items.find(item => item.id === 'i4').texts;
        expect(texts).toEqual(['Note 0', 'Note 1', 'The glossary really helped my daughter.']);
    });

    it('real_name mode hands the organizer attributable rows; respondents still get aggregates only', () => {
        const { call } = makeGsSandbox();
        const { admin } = hostSurvey(call, { identityMode: 'real_name', minParticipants: 3 });
        const students = [join(call), join(call)];
        call({ a: 'activityupsert', ...actor(students[0]), answers: JSON.stringify(GOOD), nm: 'Dana P.' });
        call({ a: 'activityupsert', ...actor(students[1]), answers: JSON.stringify({ i1: 2, i2: 2 }), nm: 'Sam R.' });
        const adminView = call({ a: 'getactivityadmin', admin, id: ID, aid: AID });
        // Outside anonymous mode the organizer sees aggregates below the floor
        // (the availability discipline) and the rows they were promised.
        expect(adminView.rows.map(row => row.label).sort()).toEqual(['Dana P.', 'Sam R.']);
        expect(adminView.rows.every(row => row.answers && typeof row.answers === 'object')).toBe(true);
        expect(adminView.items.find(item => item.id === 'i1').aggregate).toBeDefined();
        const respondentView = call({ a: 'getactivitysummary', ...actor(students[0]) });
        expect(respondentView.rows).toEqual([]);
        expect(respondentView.revealed).toBe(false);
    });

    it('ignores a claimed name in anonymous mode — the row must not carry what the mode forbids', () => {
        const { call, driveFiles } = makeGsSandbox();
        hostSurvey(call);
        const student = join(call);
        call({ a: 'activityupsert', ...actor(student), answers: JSON.stringify(GOOD), nm: 'Should Vanish' });
        const state = JSON.parse(driveFiles.get(`activity-${ID}-${AID}.json`));
        expect(JSON.stringify(state)).not.toContain('Should Vanish');
    });
});

describe('retention', () => {
    it('past deleteAt the aggregates survive and the rows — free text included — are erased', () => {
        const { call, driveFiles } = makeGsSandbox();
        const { admin } = hostSurvey(call, { deleteAt: new Date(Date.now() + 50).toISOString() });
        const students = [join(call), join(call), join(call)];
        students.forEach((student, index) => call({
            a: 'activityupsert', ...actor(student),
            answers: JSON.stringify({ i1: 2 + index, i2: 4, i4: 'Sensitive detail ' + index }),
        }));
        // Cross deleteAt, then read: the read itself materialises the tally.
        const start = Date.now();
        while (Date.now() - start < 60) { /* spin past deleteAt */ }
        const after = call({ a: 'getactivityadmin', admin, id: ID, aid: AID });
        expect(after.participantCount).toBe(3);
        expect(after.items.find(item => item.id === 'i1').aggregate.counts).toEqual([0, 1, 1, 1, 0]);
        expect(after.items.find(item => item.id === 'i4').texts).toBeUndefined();
        expect(after.rows).toEqual([]);
        const state = JSON.parse(driveFiles.get(`activity-${ID}-${AID}.json`));
        expect(JSON.stringify(state)).not.toContain('Sensitive detail');
    });
});
