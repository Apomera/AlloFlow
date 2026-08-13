import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const host = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const start = host.indexOf('// BEGIN GENERATION_PERSISTENCE_MIGRATIONS');
const end = host.indexOf('// END GENERATION_PERSISTENCE_MIGRATIONS');
if (start < 0 || end < start) throw new Error('Production migration section was not found');
const source = host.slice(start, end);
const { migrateBlueprint, migrateFullPack } = new Function(`
  const ALLO_BLUEPRINT_STORE_VERSION = 2;
  const ALLO_BLUEPRINT_CAPABILITY_FINGERPRINT = 'blueprint-execution-v2';
  const ALLO_FULL_PACK_STORE_VERSION = 2;
  const ALLO_FULL_PACK_CAPABILITY_FINGERPRINT = 'full-pack-plan-v2';
  ${source}
  return { migrateBlueprint: _migrateBlueprintEnvelope, migrateFullPack: _migrateFullPackEnvelope };
`)();

describe('generation persistence migrations', () => {
  it('upgrades a raw v0 Blueprint plan without losing its resource plan', () => {
    const raw = { resourcePlan: [{ tool: 'quiz', directive: 'legacy', uiId: 'quiz-0' }] };
    const migrated = migrateBlueprint(raw);
    expect(migrated).toMatchObject({
      v: 2,
      migratedFromVersion: 0,
      capabilityFingerprint: 'blueprint-execution-v1',
      plan: raw,
      run: null,
    });
  });

  it('upgrades a v1 Blueprint envelope and preserves settled diagnostics', () => {
    const run = {
      done: true,
      rows: {
        landed: { status: 'landed', resourceId: 'resource-1', elapsedMs: 1200 },
        failed: { status: 'failed', failReason: 'legacy provider error', elapsedMs: 800 },
      },
    };
    const migrated = migrateBlueprint({ v: 1, plan: { resourcePlan: [] }, run });
    expect(migrated.v).toBe(2);
    expect(migrated.migratedFromVersion).toBe(1);
    expect(migrated.run).toEqual(run);
    expect(migrated.capabilityFingerprint).toBe('blueprint-execution-v1');
  });

  it('keeps a current Blueprint envelope current when capability metadata was omitted', () => {
    const migrated = migrateBlueprint({ v: 2, plan: { resourcePlan: [] }, run: null, savedAt: 'now' });
    expect(migrated).toMatchObject({
      v: 2,
      migratedFromVersion: null,
      capabilityFingerprint: 'blueprint-execution-v2',
      savedAt: 'now',
    });
  });

  it('upgrades raw v0 and v1 Full Pack runs while retaining resource diagnostics', () => {
    const rows = Object.fromEntries(Array.from({ length: 300 }, (_, index) => [
      `resource-${index}`,
      { type: index % 2 ? 'quiz' : 'image', status: index % 5 ? 'landed' : 'failed', elapsedMs: index * 10 },
    ]));
    const raw = { status: 'partial', resources: rows, groups: {} };
    const v0 = migrateFullPack(raw);
    const v1 = migrateFullPack({ v: 1, run: raw, savedAt: '2026-08-01T00:00:00.000Z' });
    expect(v0).toMatchObject({ v: 2, migratedFromVersion: 0, capabilityFingerprint: 'full-pack-plan-v1' });
    expect(v1).toMatchObject({ v: 2, migratedFromVersion: 1, capabilityFingerprint: 'full-pack-plan-v1' });
    expect(Object.keys(v0.run.resources)).toHaveLength(300);
    expect(v1.run.resources['resource-295'].status).toBe('failed');
  });

  it('keeps current Full Pack capability metadata and rejects malformed or future data', () => {
    expect(migrateFullPack({ v: 2, run: { status: 'completed', resources: {} } })).toMatchObject({
      v: 2,
      migratedFromVersion: null,
      capabilityFingerprint: 'full-pack-plan-v2',
    });
    expect(migrateBlueprint({ v: 3, plan: {} })).toBeNull();
    expect(migrateFullPack({ v: 3, run: {} })).toBeNull();
    expect(migrateBlueprint({ v: 'broken', plan: {} })).toBeNull();
    expect(migrateBlueprint({ v: '1', plan: {} })).toBeNull();
    expect(migrateFullPack({ v: null, run: {} })).toBeNull();
    expect(migrateFullPack({ v: true, run: {} })).toBeNull();
    expect(migrateFullPack({ v: -1, run: {} })).toBeNull();
    expect(migrateBlueprint({})).toBeNull();
    expect(migrateFullPack({})).toBeNull();
  });
});
