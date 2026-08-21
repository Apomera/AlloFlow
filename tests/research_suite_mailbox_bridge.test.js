// Research Suite ↔ Share & Collect bridge.
//
// The Suite has instruments (three populations, pre/mid/post timepoints,
// custom items with per-label images) and no reach — every store is
// localStorage on the teacher's machine. The v13 mailbox survey activity has
// reach and no instrument. This suite pins the bridge between them:
//
//   dispatch: Suite questions -> wire items (+ the item-id map that keeps CSV
//             columns identical whichever route an answer took)
//   ingest:   the ORGANIZER summary the real Code.gs produces -> Suite
//             response rows, deduped, with choice ids resolved to labels
//
// The ingest tests run the REAL server (same sandbox as class_mailbox_survey)
// end to end: host a survey, answer it, fetch the admin summary, import it.
// A hand-mocked summary would just pin my own assumptions twice.
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const requireCjs = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const gsSource = fs.readFileSync(path.join(ROOT, 'apps_script', 'session_mailbox', 'Code.gs'), 'utf8');
const anti = fs.readFileSync(path.join(ROOT, 'AlloFlowANTI.txt'), 'utf8');
const assignmentCenterSource = fs.readFileSync(path.join(ROOT, 'view_assignment_center_source.jsx'), 'utf8');
const sharedActivitySource = fs.readFileSync(path.join(ROOT, 'shared_activity_source.jsx'), 'utf8');
const suiteSource = fs.readFileSync(path.join(ROOT, 'student_analytics_module.js'), 'utf8');

// ── Evaluate the Suite module for its exported internals ──────────────────
let internals;
beforeAll(() => {
  window.AlloModules = window.AlloModules || {};
  // The module refuses to evaluate without real React + ReactDOM on window
  // (same harness as tests/student_analytics.test.js).
  const React = requireCjs(path.resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  try { window.ReactDOM = requireCjs(path.resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom')); } catch (e) {}
  // eslint-disable-next-line no-new-func
  new Function(suiteSource)();
  internals = window.AlloModules.StudentAnalyticsInternals;
  if (!internals || typeof internals.suiteQuestionsToWireItems !== 'function') {
    throw new Error('bridge internals did not register');
  }
});

// ── Real-server sandbox (same shape as tests/class_mailbox_survey.test.js) ─
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
  // eslint-disable-next-line no-new-func
  const factory = new Function(...Object.keys(services), gsSource + '; return { handle: handle };');
  const api = factory(...Object.values(services));
  return { call: payload => JSON.parse(api.handle(payload).getContent()) };
}

// The Suite's real parent instrument shape (per-label objects, images allowed).
const PARENT_QUESTIONS = [
  { id: 'attitude', text: "Has your child's attitude toward reading changed?",
    labels: ['Much worse', 'Worse', 'Same', 'Better', 'Much better'] },
  { id: 'homeUse', text: 'Does your child practice reading strategies at home?',
    labels: [{ text: 'Never', image: 'data:image/png;base64,AAAA' }, { text: 'Rarely', image: null }, { text: 'Sometimes', image: null }, { text: 'Often', image: null }, { text: 'Daily', image: null }] },
  { id: 'support', text: 'Which support does your child mention most?', type: 'mcq',
    labels: [], options: ['Read-aloud', 'Glossary', 'Pictures'] },
  { id: 'anythingElse', text: 'Anything else we should know?', type: 'freetext', labels: [] },
];

describe('dispatch: Suite questions -> wire items', () => {
  it('converts likert/mcq/freetext, keeps EVERY step label, and maps original ids', () => {
    const wire = internals.suiteQuestionsToWireItems(PARENT_QUESTIONS);
    expect(wire.items.map(item => item.type)).toEqual(['likert', 'likert', 'choice', 'freetext']);
    // Full positional labels — the middles are the point; endpoints-only was
    // the Quiz compromise and a delivered instrument must not inherit it.
    expect(wire.items[0].labels).toEqual(['Much worse', 'Worse', 'Same', 'Better', 'Much better']);
    expect(wire.items[0].steps).toBe(5);
    expect(wire.items[2].options).toEqual([{ label: 'Read-aloud' }, { label: 'Glossary' }, { label: 'Pictures' }]);
    expect(wire.itemKeys).toEqual(['attitude', 'homeUse', 'support', 'anythingElse']);
  });

  it('flags dropped label images instead of losing them silently', () => {
    expect(internals.suiteQuestionsToWireItems(PARENT_QUESTIONS).droppedImages).toBe(true);
    expect(internals.suiteQuestionsToWireItems([PARENT_QUESTIONS[0]]).droppedImages).toBe(false);
  });

  it('skips empty questions and degenerate choices rather than shipping them', () => {
    const wire = internals.suiteQuestionsToWireItems([
      { id: 'blank', text: '   ', labels: ['A', 'B'] },
      { id: 'oneOption', text: 'Pick', type: 'mcq', labels: [], options: ['Only'] },
      PARENT_QUESTIONS[0],
    ]);
    expect(wire.items).toHaveLength(1);
    expect(wire.itemKeys).toEqual(['attitude']);
  });
});

describe('ingest: real server summary -> Suite response rows', () => {
  const ID = 'PK-42345678-1234-1234-1234-123456789012';
  const AID = 'AC-42345678-1234-1234-1234-123456789012';
  const SECRET = 'p_secret_p_secret_20';

  function runDelivery(identityMode) {
    const { call } = makeGsSandbox();
    const admin = call({ a: 'claim' }).admin;
    const wire = internals.suiteQuestionsToWireItems(PARENT_QUESTIONS);
    const expiresAt = new Date(Date.now() + 86400000).toISOString();
    const hosted = call({
      a: 'putpack', admin, id: ID, k: SECRET, part: 1, of: 1, data: 'PACK',
      title: 'Family check-in', expiresAt,
      activities: [{ activityId: AID, type: 'survey', prompt: 'Family check-in (pre)', identityMode, minParticipants: 3, items: wire.items }],
    });
    expect(hosted).toMatchObject({ ok: true, activities: 1 });
    const join = () => call({ a: 'joinactivity', id: ID, aid: AID, k: SECRET });
    const respond = (student, answers, nm) => call({ a: 'activityupsert', id: ID, aid: AID, uid: student.uid, pt: student.pt, answers: JSON.stringify(answers), nm });
    return { call, admin, wire, join, respond };
  }

  it('imports attributed rows with the ORIGINAL question ids as columns', () => {
    localStorage.removeItem('alloflow_survey_responses');
    const { call, admin, wire, join, respond } = runDelivery('real_name');
    respond(join(), { i1: 4, i2: 5, i3: 'o2', i4: 'The glossary helps at home.' }, 'Dana P.');
    respond(join(), { i1: 2, i2: 3, i3: 'o1' }, 'Sam R.');
    const summary = call({ a: 'getactivityadmin', admin, id: ID, aid: AID });
    const meta = { population: 'parent', timepoint: 'pre', studyName: 'Pilot A', itemKeys: wire.itemKeys };

    const result = internals.importMailboxSurveySummary(summary, meta);
    expect(result).toMatchObject({ imported: 2, skipped: 0 });

    const store = JSON.parse(localStorage.getItem('alloflow_survey_responses'));
    const dana = store['parent_Dana P.'][0];
    // Same columns as an in-person response: original ids, not i1/i2.
    expect(dana.attitude).toBe(4);
    expect(dana.homeUse).toBe(5);
    expect(dana.support).toBe('Glossary');          // option id resolved to its label
    expect(dana.anythingElse).toBe('The glossary helps at home.');
    expect(dana).toMatchObject({ type: 'parent', respondent: 'Dana P.', timepoint: 'pre', studyName: 'Pilot A', source: 'mailbox' });
    expect(store['parent_Sam R.'][0].attitude).toBe(2);
  });

  it('re-import only adds NEW responses; unchanged rows are skipped', () => {
    localStorage.removeItem('alloflow_survey_responses');
    const { call, admin, wire, join, respond } = runDelivery('real_name');
    const meta = { population: 'parent', timepoint: 'pre', studyName: 'Pilot A', itemKeys: wire.itemKeys };
    respond(join(), { i1: 4, i2: 5 }, 'Dana P.');
    expect(internals.importMailboxSurveySummary(call({ a: 'getactivityadmin', admin, id: ID, aid: AID }), meta).imported).toBe(1);
    respond(join(), { i1: 1, i2: 1 }, 'Lee K.');
    const second = internals.importMailboxSurveySummary(call({ a: 'getactivityadmin', admin, id: ID, aid: AID }), meta);
    expect(second).toMatchObject({ imported: 1, skipped: 1 });
    const store = JSON.parse(localStorage.getItem('alloflow_survey_responses'));
    expect(store['parent_Dana P.']).toHaveLength(1);
    expect(store['parent_Lee K.']).toHaveLength(1);
  });

  it('codename mode imports pseudonymous rows that stay stable for pairing', () => {
    localStorage.removeItem('alloflow_survey_responses');
    const { call, admin, wire, join, respond } = runDelivery('codename');
    const returning = join();
    respond(returning, { i1: 3, i2: 3 });
    const summary = call({ a: 'getactivityadmin', admin, id: ID, aid: AID });
    const codename = summary.rows[0].label;
    expect(codename).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);   // e.g. "Amber Fox"
    internals.importMailboxSurveySummary(summary, { population: 'parent', timepoint: 'pre', itemKeys: wire.itemKeys });
    // The same respondent updates later (post would be a NEW activity; here we
    // just prove the row key is the stable codename, which is what pairing
    // across timepoints keys on).
    respond(returning, { i1: 5, i2: 5 });
    const after = call({ a: 'getactivityadmin', admin, id: ID, aid: AID });
    expect(after.rows[0].label).toBe(codename);
  });

  it('anonymous mode reports aggregateOnly and fabricates NO respondents', () => {
    localStorage.removeItem('alloflow_survey_responses');
    const { call, admin, wire, join, respond } = runDelivery('anonymous');
    respond(join(), { i1: 4, i2: 4 });
    respond(join(), { i1: 2, i2: 2 });
    respond(join(), { i1: 3, i2: 3 });
    const summary = call({ a: 'getactivityadmin', admin, id: ID, aid: AID });
    expect(summary.revealed).toBe(true);
    expect(summary.rows).toEqual([]);
    const result = internals.importMailboxSurveySummary(summary, { population: 'parent', itemKeys: wire.itemKeys });
    expect(result).toMatchObject({ imported: 0, aggregateOnly: true });
    expect(localStorage.getItem('alloflow_survey_responses')).toBeNull();
  });

  it('falls back to raw item ids when the id map no longer lines up', () => {
    localStorage.removeItem('alloflow_survey_responses');
    const { call, admin, join, respond } = runDelivery('real_name');
    respond(join(), { i1: 4 }, 'Dana P.');
    const summary = call({ a: 'getactivityadmin', admin, id: ID, aid: AID });
    // Teacher edited the drafted items in the dialog: 4 items shipped, but the
    // meta map still lists 2. A misaligned remap would write WRONG columns —
    // raw i1..iN is the honest fallback.
    const result = internals.importMailboxSurveySummary(summary, { population: 'parent', itemKeys: ['attitude', 'homeUse'] });
    expect(result.imported).toBe(1);
    const store = JSON.parse(localStorage.getItem('alloflow_survey_responses'));
    expect(store['parent_Dana P.'][0].i1).toBe(4);
    expect(store['parent_Dana P.'][0].attitude).toBeUndefined();
  });
});

describe('host + Suite wiring pins', () => {
  it('the host listens for the Suite dispatch and hands the teacher the create step', () => {
    expect(anti).toContain("window.addEventListener('alloflow:prepare-shared-survey', onPrepareSharedSurvey);");
    expect(anti).toContain('setShowClassAnalytics(false);');
    expect(anti).toContain("identityMode: '',");   // the draft never picks identity for the teacher
  });

  it('research meta rides the SHARE RECORD, never the respondent packet', () => {
    expect(anti).toContain("researchMeta: (sharedAssignmentActivity && sharedAssignmentActivity._researchMeta) || null,");
    // The packet builder has no researchMeta line — respondents must not
    // receive study bookkeeping.
    const packetStart = anti.indexOf('const packet = stripUndefined({');
    const packetEnd = anti.indexOf('});', packetStart);
    expect(anti.slice(packetStart, packetEnd)).not.toContain('researchMeta');
  });

  it('the import button exists on survey rows and routes through the Suite internals', () => {
    expect(assignmentCenterSource).toContain('Import results to Research Suite');
    expect(anti).toContain('internals.importMailboxSurveySummary(summary, share.researchMeta || {})');
  });

  it('the identity picker states the pairing consequences when a study rides along', () => {
    expect(assignmentCenterSource).toContain("tx('share_collect.identity_anon_short', 'anonymous')");
    expect(assignmentCenterSource).toContain("tx('share_collect.pairing_anon', 'never pairs, so you get group totals only.')");
  });

  it('the packet builder honors full positional labels from a Suite import', () => {
    expect(anti).toContain('if (fullLabels && fullLabels.length === steps && steps >= 2) {');
  });

  it('the Suite offers the three population links and refreshes on import', () => {
    expect(suiteSource).toContain("shareSurveyByLink(population)");
    expect(suiteSource).toContain("window.addEventListener('alloflow:survey-responses-updated', refresh);");
    expect(suiteSource).toContain("'source','importKey'");   // CSV must not grow bookkeeping columns
  });
});

describe('discoverability (Plan 3)', () => {
  const commandsSource = fs.readFileSync(path.join(ROOT, 'allo_commands_source.jsx'), 'utf8');

  it('the research vocabulary reaches the palette', () => {
    // Before this, no command, label, or alias anywhere contained "survey",
    // "study", "research" (outside Research Hub), "Likert", or "IRB".
    expect(commandsSource).toContain("'research suite'");
    expect(commandsSource).toContain("'irb'");
    expect(commandsSource).toContain("'likert'");
    expect(commandsSource).toContain("id: 'open_share_collect'");
    expect(commandsSource).toContain("'parent survey'");
  });

  it('the new command is demo-blocked, grouped, and panel-tagged like its siblings', () => {
    expect(commandsSource).toContain("  'open_share_collect',");
    expect(commandsSource).toContain("open_share_collect:'navigate'");
    expect(commandsSource).toContain("open_share_collect:['educatorHub']");
    expect(commandsSource).toContain("opensPanel: 'recentQrShares'");
  });

  it('the host exposes the setter and the mutual-exclusion closer', () => {
    expect(anti).toContain('      setShowRecentQrShares,');
    expect(anti).toContain('recentQrShares: () => setShowRecentQrShares(false),');
  });

  it('the generated module and its mirror carry the command', () => {
    const module = fs.readFileSync(path.join(ROOT, 'allo_commands_module.js'), 'utf8');
    const mirror = fs.readFileSync(path.join(ROOT, 'desktop/web-app', 'public', 'allo_commands_module.js'), 'utf8');
    expect(module).toContain('open_share_collect');
    expect(mirror).toBe(module);
  });

  it('every language pack carries the three new command keys', () => {
    const langDir = path.join(ROOT, 'lang');
    const packs = fs.readdirSync(langDir).filter((f) => f.endsWith('.js'));
    expect(packs.length).toBeGreaterThanOrEqual(63);
    const missing = [];
    for (const pack of packs) {
      const json = JSON.parse(fs.readFileSync(path.join(langDir, pack), 'utf8'));
      const get = (k) => k.split('.').reduce((a, p) => (a && typeof a === 'object') ? a[p] : undefined, json);
      for (const key of ['cmd.open_share_collect', 'cmd.open_share_collect_hint', 'cmd.open_share_collect_done']) {
        const value = get(key);
        if (!value || !String(value).trim()) missing.push(pack + ':' + key);
      }
    }
    expect(missing).toEqual([]);
  });
});

describe('study info sheet + consent attestation (Plan 4)', () => {
  it('the dialog authors the info sheet and the packet carries it', () => {
    expect(assignmentCenterSource).toContain('About this survey (optional, shown to respondents)');
    expect(anti).toContain("info: sharedActivityType === 'survey' ?");
  });

  it('respondents see the info sheet above the questions', () => {
    expect(sharedActivitySource).toContain("{(summary?.info || effectiveActivity?.info) && (");
  });

  it('the Suite dispatch drafts a neutral, factual template the teacher edits', () => {
    expect(suiteSource).toContain('Taking part is voluntary, and you can skip any question that is not marked required.');
    // The template must never claim outcomes — pin the absence of the word
    // the marketing voice would reach for.
    const templateAt = suiteSource.indexOf('These questions help us understand how the program is working');
    expect(templateAt).toBeGreaterThan(-1);
  });

  it('consent provenance is recorded beside the IRB number and rides every CSV row', () => {
    // Aaron's decision: consent lives OUTSIDE the app. The app records where,
    // and never gates on it.
    expect(suiteSource).toContain('Consent records (kept outside AlloFlow)');
    expect(suiteSource).toContain("'Consent_Provenance'");
    expect(suiteSource).toContain('AlloFlow never collects consent itself.');
  });
});
