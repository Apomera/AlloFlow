import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const exportSrc = readFileSync('export_source.jsx', 'utf8');
const dispatcherSrc = readFileSync('generate_dispatcher_source.jsx', 'utf8');

// Pull the real functions out of the source so the test exercises what ships.
function loadBuilder() {
  const grab = (name) => {
    const i = exportSrc.indexOf(`    const ${name} = `);
    expect(i, `${name} present`).toBeGreaterThan(-1);
    const end = exportSrc.indexOf('\n    };', i);
    expect(end, `${name} terminates`).toBeGreaterThan(i);
    return exportSrc.slice(i, end + '\n    };'.length);
  };
  const code = `${grab('_fnv1a32')}\n${grab('buildProvenanceRecord')}`;
  // eslint-disable-next-line no-new-func
  return new Function(`${code}; return buildProvenanceRecord;`)();
}

const HOSTILE = {
  id: 'r1', type: 'quiz', title: 'Quiz', timestamp: '2026-07-28T12:00:00Z',
  config: {
    grade: '5th Grade', language: 'Spanish', standards: 'RI.5.2', interests: ['soccer'],
    dok: 'Level 3: Strategic Thinking', useEmojis: true, imageStyle: 'watercolor',
    backend: 'local', isolatedContext: true,
    customInstructions: 'Keep it simple for Maria R. who reads below grade level',
    rosterGroupId: 'g3',
    rosterGroupName: 'Maria + Deshawn (below benchmark)',
    rosterGroupColor: '#ff0000',
  },
};

describe('export provenance — the writer records every type', () => {
  it('builds one config through a single shared builder', () => {
    // Regression guard for the 2026-07-28 bug: the rich config literal lived
    // INSIDE the 'simplified' branch while every other type fell through to a
    // four-field literal, so 19 of 20 artifacts recorded a partial record that
    // read as "these settings were not used".
    expect(dispatcherSrc).toContain('const _buildItemConfig = (extra) =>');
    expect(dispatcherSrc).toContain('config: _buildItemConfig()');
    expect(dispatcherSrc).toContain('_buildItemConfig({ citationAudit: citationAuditSnapshot() })');
    // Exactly one place still spells the field list out.
    expect((dispatcherSrc.match(/grade: effectiveGrade,/g) || []).length).toBe(1);
  });

  it('records backend and isolation, which make the other fields interpretable', () => {
    const start = dispatcherSrc.indexOf('const _buildItemConfig = (extra) =>');
    expect(start, 'builder present').toBeGreaterThan(-1);
    // The builder ends where the roster spread begins.
    const end = dispatcherSrc.indexOf('rosterGroupId: configOverride.rosterGroupId', start);
    expect(end, 'builder terminates').toBeGreaterThan(start);
    const body = dispatcherSrc.slice(start, end);
    for (const field of ['grade', 'language', 'standards', 'interests', 'dok',
      'useEmojis', 'customInstructions', 'imageStyle', 'backend', 'isolatedContext']) {
      expect(body, `${field} recorded`).toContain(`${field}:`);
    }
  });
});

describe('export provenance — redaction', () => {
  const build = loadBuilder();

  it('never carries student-identifying free text out of the app', () => {
    const json = JSON.stringify(build(HOSTILE));
    for (const needle of ['Maria', 'Deshawn', 'benchmark', 'reads below grade level', '#ff0000']) {
      expect(json, `must not leak ${JSON.stringify(needle)}`).not.toContain(needle);
    }
  });

  it('drops roster name and colour but keeps the opaque group id', () => {
    const rec = build(HOSTILE);
    expect(rec.rosterGroupId).toBe('g3');
    expect('rosterGroupName' in rec).toBe(false);
    expect('rosterGroupColor' in rec).toBe(false);
  });

  it('replaces instruction prose with a presence/length/equality token', () => {
    const rec = build(HOSTILE);
    expect(rec.customInstructionsPresent).toBe(true);
    expect(rec.customInstructionsLength).toBe(HOSTILE.config.customInstructions.length);
    expect(rec.customInstructionsDigest).toMatch(/^fnv1a32:[0-9a-f]{8}$/);
    expect('customInstructions' in rec).toBe(false);
  });

  it('makes the token usable for equality without being a hash commitment', () => {
    const a = build({ config: { customInstructions: 'focus on causes' } });
    const b = build({ config: { customInstructions: 'focus on causes' } });
    const c = build({ config: { customInstructions: 'focus on Causes' } });
    expect(a.customInstructionsDigest).toBe(b.customInstructionsDigest);
    expect(a.customInstructionsDigest).not.toBe(c.customInstructionsDigest);
    expect(build({ config: {} }).customInstructionsDigest).toBeNull();
  });

  it('preserves the independent variables a study would compare on', () => {
    const rec = build(HOSTILE);
    expect(rec.backend).toBe('local');
    expect(rec.isolatedContext).toBe(true);
    expect(rec.dok).toBe('Level 3: Strategic Thinking');
    expect(rec.grade).toBe('5th Grade');
    expect(rec.interests).toEqual(['soccer']);
  });
});

describe('export provenance — the research bundle carries materials', () => {
  it('exports generated resources alongside the measurement data', () => {
    // The bundle named for research previously carried probe/survey/fidelity
    // data but no record of the artifacts those measures were about.
    expect(exportSrc).toContain('generatedResources: items.map(buildProvenanceRecord)');
    expect(exportSrc).toContain('provenanceSchemaVersion: 1');
    expect(exportSrc).toContain('appBuild: _appBuild()');
    expect(exportSrc).toMatch(/exportVersion: 2/);
  });

  it('reads history from the live ref rather than a stale closure', () => {
    const i = exportSrc.indexOf('const handleExportResearchJSON');
    const block = exportSrc.slice(i, i + 700);
    expect(block).toContain('liveRef.current');
    expect(block).toContain('history');
  });
});
