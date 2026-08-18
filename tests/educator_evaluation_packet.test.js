import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// The packet round trip is a security boundary: an educator packet must never carry another
// educator's records, and a returned response must never be able to change ratings or evidence.
// Both helpers are pure, so they are lifted out of the source and exercised directly.
const SOURCE = 'educator_evaluation_source.jsx';
const src = readFileSync(SOURCE, 'utf8');

function grab(name) {
  // Index-based: a RegExp built from a string needs doubled backslashes, and the single-escaped
  // form silently compiles to [sS], which is what this test caught the first time it ran.
  const head = 'function ' + name + '(';
  const at = src.indexOf(head);
  if (at === -1) throw new Error('helper not found in source: ' + name);
  const stop = src.indexOf('\n}', at);
  if (stop === -1) throw new Error('helper not terminated: ' + name);
  return src.slice(at, stop + 2);
}


const api = new Function([
  "const AE_PACKET_KIND='alloflow-educator-evaluation-packet';",
  "const AE_PACKET_SCRIPT_ID='allo-evaluation-packet';",
  "const AE_PACKET_TEACHER_FIELDS=['educatorStatement'];",
  "const AE_PACKET_RECORD_FIELDS=['reflection','reflectionSubmittedAt','teacherAcknowledgedAt'];",
  "let n=0; const aeId=(p)=>p+'-'+(++n); const aeNow=()=>'2026-08-18T12:00:00.000Z';",
  grab('aePacketEmbed'), grab('aePacketExtract'),
  grab('aeEducatorPacket'), grab('aeResponsePacket'), grab('aeMergeResponsePacket'),
  'return { aeEducatorPacket, aeResponsePacket, aeMergeResponsePacket, aePacketEmbed, aePacketExtract };',
].join('\n'))();

const workspace = () => ({
  config: { organization: 'PPS', academicYear: '2026-27', evaluatorName: 'A. Principal' },
  teachers: [
    { id: 't1', code: 'T-01', name: 'Dana Reyes', evaluator: 'A. Principal', ratings: { domains: { d1: 'Proficient' } }, educatorStatement: null },
    { id: 't2', code: 'T-02', name: 'Other Person', evaluator: 'A. Principal', ratings: { domains: { d1: 'Distinguished' } } },
  ],
  walkthroughs: [{ id: 'w1', teacherId: 't1', notes: 'ok', updatedAt: 'A' }, { id: 'w9', teacherId: 't2', notes: 'other' }],
  observations: [{ id: 'o1', teacherId: 't1', rating: 'Proficient', evidence: 'original evidence', updatedAt: 'A' }],
  spms: [],
  comments: [{ id: 'c9', teacherId: 't2', text: 'about other teacher', role: 'Evaluator' }],
});

function respondingTeacher() {
  const packet = api.aeEducatorPacket(workspace(), 't1', { includeNames: true });
  const theirCopy = JSON.parse(JSON.stringify(packet));
  theirCopy.teachers[0].educatorStatement = { text: 'I disagree with domain 1.', updatedAt: 'B' };
  theirCopy.observations[0].reflection = 'Here is my reflection.';
  theirCopy.observations[0].teacherAcknowledgedAt = '2026-08-18T12:00:00.000Z';
  return { packet, response: api.aeResponsePacket(theirCopy, 't1', packet.packetId) };
}

describe('educator packet', () => {
  it('carries the selected educator and no trace of anyone else', () => {
    const packet = api.aeEducatorPacket(workspace(), 't1', { includeNames: true });
    const blob = JSON.stringify(packet);
    expect(packet.teachers.map((t) => t.id)).toEqual(['t1']);
    expect(blob).not.toContain('t2');
    expect(blob).not.toContain('Other Person');
    expect(blob).not.toContain('about other teacher');
    expect(packet.walkthroughs).toHaveLength(1);
  });

  it('withholds names when the evaluator asks for codes only', () => {
    const packet = api.aeEducatorPacket(workspace(), 't1', { includeNames: false });
    expect(packet.teachers[0].name).toBe('T-01');
    expect(packet.teachers[0].evaluator).toBe('Evaluator');
    expect(packet.config.evaluatorName).toBe('Evaluator');
  });

  it('embeds a payload that cannot close its host script element', () => {
    const embedded = api.aePacketEmbed(JSON.stringify({ x: '</scr' + 'ipt><img onerror=alert(1)>' }));
    expect(embedded).not.toContain('</scr' + 'ipt>');
    const html = '<html><script type="application/json" id="allo-evaluation-packet">' + embedded + '</scr' + 'ipt></html>';
    expect(JSON.parse(api.aePacketExtract(html)).x).toBe('</scr' + 'ipt><img onerror=alert(1)>');
  });
});

describe('educator response merge', () => {
  it('applies the educator-owned fields', () => {
    const { response } = respondingTeacher();
    const live = workspace();
    const outcome = api.aeMergeResponsePacket(live, response);
    expect(outcome.ok).toBe(true);
    expect(live.teachers[0].educatorStatement.text).toBe('I disagree with domain 1.');
    expect(live.observations[0].reflection).toBe('Here is my reflection.');
    expect(live.observations[0].teacherAcknowledgedAt).toBeTruthy();
  });

  it('refuses to let a hand-edited response change ratings or evidence', () => {
    const { response } = respondingTeacher();
    response.records[0].rating = 'Distinguished';
    response.records[0].evidence = 'rewritten evidence';
    response.teachers = [{ id: 't1', ratings: { domains: { d1: 'Distinguished' } } }];
    const live = workspace();
    const outcome = api.aeMergeResponsePacket(live, response);
    expect(live.observations[0].rating).toBe('Proficient');
    expect(live.observations[0].evidence).toBe('original evidence');
    expect(live.teachers[0].ratings.domains.d1).toBe('Proficient');
    expect(outcome.ignored).toBeGreaterThanOrEqual(2);
  });

  it('leaves other educators untouched', () => {
    const { response } = respondingTeacher();
    const live = workspace();
    api.aeMergeResponsePacket(live, response);
    expect(live.teachers[1].ratings.domains.d1).toBe('Distinguished');
  });

  it('flags records the evaluator changed after the packet was issued', () => {
    const { response } = respondingTeacher();
    const live = workspace();
    live.observations[0].updatedAt = 'changed-after-issue';
    const outcome = api.aeMergeResponsePacket(live, response);
    expect(outcome.stale).toContain('o1');
    expect(live.observations[0].reflection).toBe('Here is my reflection.');
  });

  it('refuses a response for an educator who is not in this workspace', () => {
    const { response } = respondingTeacher();
    response.teacherId = 'nobody';
    expect(api.aeMergeResponsePacket(workspace(), response).ok).toBe(false);
  });
});
