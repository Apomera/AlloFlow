import fs from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const PANEL_SOURCE = fs.readFileSync('educator_evaluation_source.jsx', 'utf8');
const SHARE_HELPER_SOURCE = fs.readFileSync('apps_script/educator_evaluation_share/Code.gs', 'utf8');

function functionDeclaration(source, name) {
  const start = source.indexOf('function ' + name + '(');
  if (start === -1) throw new Error('Missing function: ' + name);
  const end = source.indexOf('\n}', start);
  if (end === -1) throw new Error('Unterminated function: ' + name);
  return source.slice(start, end + 2);
}

function constantDeclaration(source, name) {
  const start = source.indexOf('const ' + name + ' = ');
  if (start === -1) throw new Error('Missing constant: ' + name);
  const end = source.indexOf(';', start);
  if (end === -1) throw new Error('Unterminated constant: ' + name);
  return source.slice(start, end + 1);
}

const packetConstants = [
  'AE_PACKET_PROFILE_FIELDS', 'AE_PACKET_WALKTHROUGH_FIELDS',
  'AE_PACKET_OBSERVATION_BASE_FIELDS', 'AE_PACKET_PREWORK_FIELDS',
  'AE_PACKET_DOMAIN_FIELDS', 'AE_PACKET_SPM_BASE_FIELDS',
  'AE_PACKET_SPM_PLAN_FIELDS', 'AE_PACKET_COMMENT_FIELDS',
].map((name) => constantDeclaration(PANEL_SOURCE, name));

const exporter = new Function([
  "const AE_PACKET_KIND='alloflow-educator-evaluation-packet';",
  ...packetConstants,
  "let sequence=0; const aeId=(prefix)=>prefix+'-'+(++sequence); const aeNow=()=>'2026-08-25T12:00:00.000Z';",
  functionDeclaration(PANEL_SOURCE, 'aePacketPick'),
  functionDeclaration(PANEL_SOURCE, 'aeEducatorPacket'),
  'return aeEducatorPacket;',
].join('\n'))();

function shareHelper() {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(SHARE_HELPER_SOURCE, sandbox);
  return sandbox;
}

function htmlFor(packet) {
  return '<!doctype html><html><body><script type="application/json" id="allo-evaluation-packet">'
    + JSON.stringify(packet).replaceAll('<', '\\u003c')
    + '</script></body></html>';
}

function workspace(teacherOverrides = {}) {
  return {
    config: {
      organization: 'Example District', academicYear: '2026-27',
      evaluatorName: 'A. Principal', frameworkProfile: 'pa_act13',
    },
    teachers: [{
      id: 'teacher-01', code: 'T-01', name: 'Dana Reyes',
      finalizedAt: '2026-08-24T12:00:00.000Z', finalScore: 3,
      ratings: { domains: { d1: 3, d2: 3, d3: 3, d4: 3 } },
      ...teacherOverrides,
    }],
    walkthroughs: [{
      id: 'walk-1', teacherId: 'teacher-01', date: '2026-05-01',
      subject: 'Mathematics', publishedAt: '2026-05-02T12:00:00.000Z',
    }],
    observations: [], spms: [], comments: [],
  };
}

function exportAndValidate(source) {
  const packet = exporter(source, 'teacher-01', { includeNames: false });
  return { packet, accepted: shareHelper().eePacketPayload_(htmlFor(packet)) };
}

describe('educator packet to share-helper annual provenance compatibility', () => {
  it('omits normalized empty annual maps from a historical finalized export and accepts it', () => {
    const { packet, accepted } = exportAndValidate(workspace({
      annualRationales: { d1: '', d2: '', d3: '', d4: '' },
      annualEvidenceRefs: { d1: [], d2: [], d3: [], d4: [] },
    }));

    expect(packet.teachers[0]).not.toHaveProperty('annualRationales');
    expect(packet.teachers[0]).not.toHaveProperty('annualEvidenceRefs');
    expect(accepted.teachers[0]).not.toHaveProperty('annualRationales');
    expect(accepted.teachers[0]).not.toHaveProperty('annualEvidenceRefs');
  });

  it('retains a complete modern annual provenance pair and accepts it', () => {
    const refs = { d1: ['walkthrough:walk-1'], d2: ['walkthrough:walk-1'], d3: ['walkthrough:walk-1'], d4: ['walkthrough:walk-1'] };
    const rationales = { d1: 'Rationale one', d2: 'Rationale two', d3: 'Rationale three', d4: 'Rationale four' };
    const { packet, accepted } = exportAndValidate(workspace({
      annualRationales: rationales,
      annualEvidenceRefs: refs,
    }));

    expect(packet.teachers[0].annualRationales).toEqual(rationales);
    expect(packet.teachers[0].annualEvidenceRefs).toEqual(refs);
    expect(accepted.teachers[0].annualRationales).toEqual(rationales);
    expect(accepted.teachers[0].annualEvidenceRefs).toEqual(refs);
  });

  it('rejects a partially populated non-empty provenance pair', () => {
    const packet = exporter(workspace({
      annualRationales: { d1: 'Only domain one is documented' },
      annualEvidenceRefs: { d1: ['walkthrough:walk-1'] },
    }), 'teacher-01', { includeNames: false });

    expect(packet.teachers[0]).toHaveProperty('annualRationales');
    expect(packet.teachers[0]).toHaveProperty('annualEvidenceRefs');
    expect(() => shareHelper().eePacketPayload_(htmlFor(packet)))
      .toThrow(/Annual rationale is required for every rated domain/);
  });
});
