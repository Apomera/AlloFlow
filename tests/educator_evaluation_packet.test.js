import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// The packet round trip is a disclosure and mutation boundary. These tests deliberately put
// secrets on every selected-educator record: filtering by teacher id alone is not sufficient.
const SOURCE = 'educator_evaluation_source.jsx';
const src = readFileSync(SOURCE, 'utf8');

function grab(name) {
  const head = 'function ' + name + '(';
  const at = src.indexOf(head);
  if (at === -1) throw new Error('helper not found in source: ' + name);
  const stop = src.indexOf('\n}', at);
  if (stop === -1) throw new Error('helper not terminated: ' + name);
  return src.slice(at, stop + 2);
}

function grabConst(name) {
  const head = 'const ' + name + ' = ';
  const at = src.indexOf(head);
  if (at === -1) throw new Error('constant not found in source: ' + name);
  const stop = src.indexOf(';', at);
  if (stop === -1) throw new Error('constant not terminated: ' + name);
  return src.slice(at, stop + 1);
}

const packetConstants = [
  'AE_PACKET_TEACHER_FIELDS', 'AE_PACKET_STATEMENT_FIELDS', 'AE_PACKET_RECORD_FIELDS', 'AE_PACKET_PROFILE_FIELDS',
  'AE_PACKET_WALKTHROUGH_FIELDS', 'AE_PACKET_OBSERVATION_BASE_FIELDS',
  'AE_PACKET_PREWORK_FIELDS', 'AE_PACKET_DOMAIN_FIELDS', 'AE_PACKET_SPM_BASE_FIELDS',
  'AE_PACKET_SPM_PLAN_FIELDS', 'AE_PACKET_COMMENT_FIELDS', 'AE_PACKET_RESPONSE_COMMENT_FIELDS',
].map(grabConst);

const api = new Function([
  "const AE_PACKET_KIND='alloflow-educator-evaluation-packet';",
  "const AE_PACKET_SCRIPT_ID='allo-evaluation-packet';",
  ...packetConstants,
  "let n=0; const aeId=(p)=>p+'-'+(++n); const aeNow=()=>'2026-08-20T15:30:00.000Z';",
  grab('aePacketPick'), grab('aePacketEmbed'), grab('aePacketExtract'),
  grab('aeEducatorPacket'), grab('aeResponsePacket'), grab('aeMergeResponsePacket'),
  'return { aeEducatorPacket, aeResponsePacket, aeMergeResponsePacket, aePacketEmbed, aePacketExtract };',
].join('\n'))();

const workspace = () => ({
  config: {
    organization: 'PPS', academicYear: '2026-27', evaluatorName: 'A. Principal',
    frameworkProfile: 'pa_act13', privateConfig: 'PRIVATE-CONFIG',
  },
  teachers: [
    {
      id: 't1', code: 'T-01', name: 'Dana Reyes', building: 'Central', assignment: 'Grade 4',
      employeeType: 'professional', evaluator: 'A. Principal', dueDate: '2027-05-01',
      cycleStatus: 'in_progress', frameworkVersion: 'pa-act13-classroom-2021',
      ratings: { domains: { d1: 3, d2: 2, d3: 2, d4: 2 }, building: 2, teacher: 3, lea: 2 },
      educatorStatement: null, releasedDoc: { url: 'PRIVATE-RELEASED-DOC' },
      lastActivityAt: 'PRIVATE-LAST-ACTIVITY', privateDraft: 'PRIVATE-TEACHER-DRAFT',
    },
    { id: 't2', code: 'T-02', name: 'Other Person', evaluator: 'A. Principal', ratings: { domains: { d1: 3 } } },
  ],
  walkthroughs: [
    {
      id: 'w-public', teacherId: 't1', date: '2026-08-10', durationMin: '8',
      announced: 'unannounced', lessonPhase: 'middle', subject: 'Math',
      evidence: 'Dana asked learners to compare two strategies.', interpretation: 'Released feedback.',
      componentTags: ['3B'], publishedAt: '2026-08-10T12:00:00.000Z', updatedAt: 'W-A',
      observer: 'PRIVATE-OBSERVER', privacyChecked: true, evaluatorScratch: 'PRIVATE-WALK-META',
    },
    {
      id: 'w-private', teacherId: 't1', evidence: 'PRIVATE-WALKTHROUGH-DRAFT',
      interpretation: 'PRIVATE-WALKTHROUGH-INTERPRETATION', observer: 'A. Principal',
      createdAt: '2026-08-11T12:00:00.000Z', updatedAt: 'W-PRIVATE',
    },
    { id: 'w-other', teacherId: 't2', evidence: 'OTHER-TEACHER-WALK', publishedAt: '2026-08-10T12:00:00.000Z' },
  ],
  observations: [
    {
      id: 'o-evidence', teacherId: 't1', createdAt: '2026-08-01T12:00:00.000Z',
      observedAt: '2026-08-05T12:00:00.000Z', evidence: 'Released observation evidence.',
      evidencePublishedAt: '2026-08-06T12:00:00.000Z', componentTags: ['2C'], updatedAt: 'O-A',
      prework: { plan: 'Submitted plan', outcomes: 'Submitted outcomes', privateNested: 'PRIVATE-PREWORK-NESTED' },
      preworkSubmittedAt: '2026-08-02T12:00:00.000Z',
      reflection: 'PRIVATE-UNSUBMITTED-REFLECTION',
      ratings: { d1: 3, d2: 3, d3: 3, d4: 3 },
      rationales: { d1: 'PRIVATE-UNSIGNED-RATIONALE' },
      preConferenceNotes: 'PRIVATE-PRE-CONFERENCE', ackChecked: true,
      observedLocal: 'PRIVATE-LOCAL-SCHEDULE', privacyChecked: true,
    },
    {
      id: 'o-signed', teacherId: 't1', createdAt: '2026-07-01T12:00:00.000Z',
      evidence: 'Signed record evidence.', evidencePublishedAt: '2026-07-03T12:00:00.000Z',
      postConferenceNotes: 'Released conference follow-up.', postConferenceAt: '2026-07-05T12:00:00.000Z',
      ratings: { d1: 3, d2: 2, d3: 2, d4: 2 },
      rationales: { d1: 'Released rationale 1.', d2: 'Released rationale 2.', d3: 'Released rationale 3.', d4: 'Released rationale 4.' },
      evaluatorSignedAt: '2026-07-06T12:00:00.000Z', updatedAt: 'O-SIGNED',
      evaluatorPrivateDraft: 'PRIVATE-SIGNED-META',
    },
    { id: 'o-other', teacherId: 't2', evidence: 'OTHER-TEACHER-OBS', evidencePublishedAt: '2026-08-01T12:00:00.000Z' },
  ],
  spms: [
    { id: 's-draft', teacherId: 't1', status: 'draft', context: 'PRIVATE-SPM-DRAFT' },
    {
      id: 's-returned', teacherId: 't1', createdAt: '2026-06-01T12:00:00.000Z', status: 'returned', version: 2,
      context: 'PRIVATE-CURRENT-RETURNED-DRAFT', pendingReturnReason: 'PRIVATE-PENDING-RETURN',
      returnReason: 'Released return reason.', returnedAt: '2026-06-04T12:00:00.000Z', updatedAt: 'S-A',
      revisions: [{ version: 1, submittedAt: '2026-06-02T12:00:00.000Z', context: 'Released submitted context.', baseline: 'Released baseline.', goal: 'Released goal.', measures: 'Released measures.', actionPlan: 'Released action plan.', privateRevision: 'PRIVATE-REVISION-META' }],
      approvedBy: 'PRIVATE-UNRELEASED-APPROVER', firstOpenedAt: 'PRIVATE-OPEN-RECEIPT',
    },
  ],
  comments: [
    { id: 'c-public', teacherId: 't1', recordType: 'walkthrough', recordId: 'w-public', text: 'Shared comment by Dana Reyes.', role: 'Evaluator', author: 'A. Principal', at: '2026-08-10T13:00:00.000Z', version: 1, privateCommentMeta: 'PRIVATE-COMMENT-META' },
    { id: 'c-private', teacherId: 't1', recordType: 'walkthrough', recordId: 'w-private', text: 'PRIVATE-COMMENT-ON-DRAFT', role: 'Evaluator' },
    { id: 'c-other', teacherId: 't2', recordType: 'walkthrough', recordId: 'w-other', text: 'OTHER-TEACHER-COMMENT', role: 'Evaluator' },
  ],
});

function responsePacket() {
  return {
    kind: 'alloflow-educator-evaluation-packet', version: 1, packetType: 'response',
    packetId: 'response-1', sourcePacketId: 'source-1', issuedAt: '1900-01-01T00:00:00.000Z', teacherId: 't1',
    educatorStatement: { text: 'I disagree with domain 1.', updatedAt: '1900-01-01T00:00:00.000Z' },
    records: [
      { collection: 'observations', recordId: 'o-evidence', sourceUpdatedAt: 'O-A', reflection: 'Here is my reflection.' },
      { collection: 'observations', recordId: 'o-signed', sourceUpdatedAt: 'O-SIGNED', acknowledged: true },
      { collection: 'walkthroughs', recordId: 'w-public', sourceUpdatedAt: 'W-A', acknowledged: true },
    ],
    comments: [],
  };
}

describe('educator packet disclosure', () => {
  it('carries the selected educator and no trace of another educator', () => {
    const packet = api.aeEducatorPacket(workspace(), 't1', { includeNames: true });
    const blob = JSON.stringify(packet);
    expect(packet.teachers.map((teacher) => teacher.id)).toEqual(['t1']);
    expect(blob).not.toContain('t2');
    expect(blob).not.toContain('Other Person');
    expect(blob).not.toContain('OTHER-TEACHER');
  });

  it('exports only released states and explicit educator-visible fields', () => {
    const packet = api.aeEducatorPacket(workspace(), 't1', { includeNames: true });
    const blob = JSON.stringify(packet);

    expect(packet.walkthroughs.map((record) => record.id)).toEqual(['w-public']);
    expect(packet.observations.find((record) => record.id === 'o-evidence').evidence).toBe('Released observation evidence.');
    expect(packet.observations.find((record) => record.id === 'o-evidence')).not.toHaveProperty('ratings');
    expect(packet.observations.find((record) => record.id === 'o-signed').ratings.d1).toBe(3);
    expect(packet.spms.map((record) => record.id)).toEqual(['s-returned']);
    expect(packet.spms[0].context).toBe('Released submitted context.');
    expect(packet.comments.map((comment) => comment.id)).toEqual(['c-public']);
    expect(packet.teachers[0]).not.toHaveProperty('ratings');

    [
      'PRIVATE-CONFIG', 'PRIVATE-RELEASED-DOC', 'PRIVATE-LAST-ACTIVITY', 'PRIVATE-TEACHER-DRAFT',
      'PRIVATE-OBSERVER', 'PRIVATE-WALK-META', 'PRIVATE-WALKTHROUGH-DRAFT',
      'PRIVATE-WALKTHROUGH-INTERPRETATION', 'PRIVATE-PREWORK-NESTED',
      'PRIVATE-UNSUBMITTED-REFLECTION', 'PRIVATE-UNSIGNED-RATIONALE', 'PRIVATE-PRE-CONFERENCE',
      'PRIVATE-LOCAL-SCHEDULE', 'PRIVATE-SIGNED-META', 'PRIVATE-SPM-DRAFT',
      'PRIVATE-CURRENT-RETURNED-DRAFT', 'PRIVATE-PENDING-RETURN', 'PRIVATE-REVISION-META',
      'PRIVATE-UNRELEASED-APPROVER', 'PRIVATE-OPEN-RECEIPT', 'PRIVATE-COMMENT-META',
      'PRIVATE-COMMENT-ON-DRAFT',
    ].forEach((secret) => expect(blob, secret).not.toContain(secret));
  });

  it('releases annual ratings only after finalization', () => {
    const live = workspace();
    live.teachers[0].finalizedAt = '2026-08-19T12:00:00.000Z';
    live.teachers[0].finalScore = 2.25;
    const packet = api.aeEducatorPacket(live, 't1', { includeNames: true });
    expect(packet.teachers[0].ratings.domains).toEqual({ d1: 3, d2: 2, d3: 2, d4: 2 });
    expect(packet.teachers[0].finalScore).toBe(2.25);
  });

  it('codes-only mode removes structured names but does not pretend to de-identify free text', () => {
    const packet = api.aeEducatorPacket(workspace(), 't1', { includeNames: false });
    expect(packet.teachers[0].name).toBe('T-01');
    expect(packet.teachers[0].evaluator).toBe('Evaluator');
    expect(packet.config.evaluatorName).toBe('Evaluator');
    expect(packet.comments[0].author).toBe('Evaluator');
    expect(JSON.stringify(packet)).not.toContain('A. Principal');
    expect(JSON.stringify(packet)).toContain('Dana Reyes'); // released free text is unchanged
    expect(src).toContain('Free-text evidence, comments, statements, and reflections are unchanged and may still identify people.');
  });

  it('embeds a payload that cannot close its host script element', () => {
    const embedded = api.aePacketEmbed(JSON.stringify({ x: '</scr' + 'ipt><img onerror=alert(1)>' }));
    expect(embedded).not.toContain('</scr' + 'ipt>');
    const html = '<html><script type="application/json" id="allo-evaluation-packet">' + embedded + '</scr' + 'ipt></html>';
    expect(JSON.parse(api.aePacketExtract(html)).x).toBe('</scr' + 'ipt><img onerror=alert(1)>');
  });
});

describe('educator response merge', () => {
  it('applies educator intent and stamps workflow state at import time', () => {
    const live = workspace();
    const response = responsePacket();
    const outcome = api.aeMergeResponsePacket(live, response);
    expect(outcome.ok).toBe(true);
    expect(live.teachers[0].educatorStatement).toEqual({ text: 'I disagree with domain 1.', updatedAt: '2026-08-20T15:30:00.000Z' });
    expect(live.observations[0].reflection).toBe('Here is my reflection.');
    expect(live.observations[0].reflectionSubmittedAt).toBe('2026-08-20T15:30:00.000Z');
    expect(live.observations[1].teacherAcknowledgedAt).toBe('2026-08-20T15:30:00.000Z');
    expect(live.walkthroughs[0].teacherAcknowledgedAt).toBe('2026-08-20T15:30:00.000Z');
  });

  it('refuses ratings, evidence, imported timestamps, comments, and evaluator metadata', () => {
    const response = responsePacket();
    response.records[0].rating = 3;
    response.records[0].evidence = 'rewritten evidence';
    response.records[0].reflectionSubmittedAt = '1900-01-01T00:00:00.000Z';
    response.records[1].teacherAcknowledgedAt = '1900-01-01T00:00:00.000Z';
    response.teachers = [{ id: 't1', ratings: { domains: { d1: 3 } } }];
    response.comments = [{ id: 'forged', teacherId: 't1', text: 'forged', author: 'Evaluator', at: '1900-01-01T00:00:00.000Z' }];
    const live = workspace();
    const outcome = api.aeMergeResponsePacket(live, response);
    expect(live.observations[0].evidence).toBe('Released observation evidence.');
    expect(live.observations[0].ratings.d1).toBe(3);
    expect(live.observations[0].reflectionSubmittedAt).toBe('2026-08-20T15:30:00.000Z');
    expect(live.comments).toHaveLength(3);
    expect(outcome.ignored).toBeGreaterThanOrEqual(5);
  });

  it('cannot advance a record that has not reached the required release state', () => {
    const response = responsePacket();
    response.records.push({ collection: 'observations', recordId: 'o-evidence', acknowledged: true });
    response.records.push({ collection: 'observations', recordId: 'o-signed', reflection: 'Too late to submit.' });
    response.records.push({ collection: 'walkthroughs', recordId: 'w-private', acknowledged: true });
    const live = workspace();
    const outcome = api.aeMergeResponsePacket(live, response);
    expect(live.observations[0].teacherAcknowledgedAt).toBeUndefined();
    expect(live.observations[1].reflection).toBeUndefined();
    expect(live.walkthroughs[1].teacherAcknowledgedAt).toBeUndefined();
    expect(outcome.ignored).toBeGreaterThanOrEqual(3);
  });

  it('preserves acknowledgement intent from an older v1 response but replaces its timestamp', () => {
    const live = workspace();
    const response = responsePacket();
    response.records = [{
      collection: 'walkthroughs', recordId: 'w-public', sourceUpdatedAt: 'W-A',
      teacherAcknowledgedAt: '1900-01-01T00:00:00.000Z',
    }];
    const outcome = api.aeMergeResponsePacket(live, response);
    expect(live.walkthroughs[0].teacherAcknowledgedAt).toBe('2026-08-20T15:30:00.000Z');
    expect(outcome.ignored).toBeGreaterThanOrEqual(2); // legacy timestamp + statement timestamp
  });

  it('cannot replace the educator statement after the annual cycle is finalized', () => {
    const live = workspace();
    live.teachers[0].finalizedAt = '2026-08-19T12:00:00.000Z';
    live.teachers[0].educatorStatement = { text: 'Final statement', updatedAt: '2026-08-19T11:00:00.000Z' };
    const outcome = api.aeMergeResponsePacket(live, responsePacket());
    expect(live.teachers[0].educatorStatement.text).toBe('Final statement');
    expect(outcome.ignored).toBeGreaterThanOrEqual(1);
  });

  it('accepts only educator comment text and assigns identity and time during import', () => {
    const live = workspace();
    const response = responsePacket();
    response.comments = [{
      id: 'teacher-comment-1', recordType: 'walkthrough', recordId: 'w-public',
      text: 'Please add this context.', role: 'Evaluator', author: 'Forged author', at: '1900-01-01T00:00:00.000Z',
    }];
    const outcome = api.aeMergeResponsePacket(live, response);
    expect(live.comments.at(-1)).toEqual({
      id: 'teacher-comment-1', recordType: 'walkthrough', recordId: 'w-public',
      teacherId: 't1', text: 'Please add this context.', role: 'Teacher',
      author: 'Dana Reyes', at: '2026-08-20T15:30:00.000Z', version: 1,
    });
    expect(outcome.ignored).toBeGreaterThanOrEqual(3);
  });

  it('leaves other educators untouched and rejects mismatched or malformed packets', () => {
    const response = responsePacket();
    const live = workspace();
    api.aeMergeResponsePacket(live, response);
    expect(live.teachers[1].ratings.domains.d1).toBe(3);
    response.teacherId = 'nobody';
    expect(api.aeMergeResponsePacket(workspace(), response).ok).toBe(false);
    response.teacherId = 't1';
    response.kind = 'not-alloflow';
    expect(api.aeMergeResponsePacket(workspace(), response).ok).toBe(false);
  });

  it('flags records the evaluator changed after the packet was issued', () => {
    const response = responsePacket();
    const live = workspace();
    live.observations[0].updatedAt = 'changed-after-issue';
    const outcome = api.aeMergeResponsePacket(live, response);
    expect(outcome.stale).toContain('o-evidence');
  });

  it('exports response intent without trusting client-generated workflow timestamps', () => {
    const educatorCopy = workspace();
    educatorCopy.teachers[0].educatorStatement = { text: 'My statement', updatedAt: 'CLIENT-TIME' };
    educatorCopy.observations[0].reflection = 'My submitted reflection';
    educatorCopy.observations[0].reflectionSubmittedAt = 'CLIENT-TIME';
    educatorCopy.walkthroughs[0].teacherAcknowledgedAt = 'CLIENT-TIME';
    educatorCopy.comments.push({ id: 'teacher-comment-2', teacherId: 't1', recordType: 'walkthrough', recordId: 'w-public', text: 'My shared context', role: 'Teacher', author: 'Dana Reyes', at: 'CLIENT-TIME' });
    const response = api.aeResponsePacket(educatorCopy, 't1', 'source-1');
    expect(response.educatorStatement).toEqual({ text: 'My statement' });
    expect(response.records).toContainEqual(expect.objectContaining({ collection: 'observations', recordId: 'o-evidence', reflection: 'My submitted reflection' }));
    expect(response.records).toContainEqual(expect.objectContaining({ collection: 'walkthroughs', recordId: 'w-public', acknowledged: true }));
    expect(response.comments).toEqual([{ id: 'teacher-comment-2', recordType: 'walkthrough', recordId: 'w-public', text: 'My shared context' }]);
    expect(JSON.stringify(response)).not.toContain('reflectionSubmittedAt');
    expect(JSON.stringify(response)).not.toContain('teacherAcknowledgedAt');
    expect(JSON.stringify(response)).not.toContain('CLIENT-TIME');
  });
});

describe('packet attachment responds without the tool', () => {
  const formJs = src.slice(src.indexOf('const AE_PACKET_FORM_JS = ['), src.indexOf("].join('');", src.indexOf('const AE_PACKET_FORM_JS = [')));
  const exportBody = src.slice(src.indexOf('const exportEducatorPacket = () => {'), src.indexOf('const exportResponsePacket = () => {'));

  it('renders the released evaluation, not only an empty response form', () => {
    expect(exportBody).toContain('Published observation evidence');
    expect(exportBody).toContain('Released evaluator assessment');
    expect(exportBody).toContain('Released SPM rating');
    expect(exportBody).toContain('Shared conversation');
    expect(exportBody).toContain('Finalized annual ratings');
  });

  it('uses a separate acknowledgement beside every eligible record', () => {
    expect(exportBody).toContain('data-ack-record');
    expect(exportBody).toContain("ackControl('walkthroughs'");
    expect(exportBody).toContain("ackControl('observations'");
    expect(exportBody).not.toContain('id="ae-ack"');
    expect(formJs).toContain('querySelectorAll("input[data-ack-record]")');
  });

  it('ships a self-contained response download and never sends anything anywhere', () => {
    expect(src).toContain('AE_PACKET_FORM_JS');
    expect(src).toContain('id="ae-statement"');
    expect(src).toContain('id="ae-send"');
    expect(formJs).toContain('packetType:');
    expect(formJs).toContain('URL.createObjectURL');
    expect(formJs).not.toContain('XMLHttpRequest');
    expect(formJs).not.toContain('navigator.sendBeacon');
    expect(formJs).not.toMatch(/https?:\/\//);
  });

  it('collects only educator-owned intent, never evaluator data or authoritative timestamps', () => {
    ['reflection', 'acknowledged', 'educatorStatement'].forEach((field) => expect(formJs).toContain(field));
    ['rating:', 'evidence:', 'reflectionSubmittedAt', 'teacherAcknowledgedAt'].forEach((field) => expect(formJs).not.toContain(field));
  });

  it('keeps a directly imported educator packet in educator-only mode', () => {
    expect(src).toContain('educatorPacketMode: true');
    expect(src).toContain("workspace.educatorPacketMode ? 'teacher' : 'evaluator'");
    expect(src).toContain('!workspace.educatorPacketMode && <div className="ae-role"');
    expect(src).toContain('Educator-only mode: review the released records and add only your own response.');
  });
});
