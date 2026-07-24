// Contract tests for the Agent Core Phase 0 schemas
// (docs/CLAUDE_HANDOFF_FEDERATED_AGENT_2026-07-14.md, Task 2). These pin the
// safety boundary: unknown versions/tools/modes fail closed, unknown fields
// are dropped with a warning (explicit policy), secret-like fields and
// absolute paths are rejected, demo mode cannot advertise privileged
// capabilities, and every MCP tool has a directory-legal name + annotations.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

let C;
beforeAll(() => {
  loadAlloModule('agent_core_contracts_module.js');
  C = window.AlloModules.AgentCoreContracts;
  if (!C) throw new Error('AgentCoreContracts failed to register');
});

const fixture = (name) =>
  JSON.parse(readFileSync(resolve(process.cwd(), 'test_data/agent_core', name), 'utf-8'));

describe('tool classification table', () => {
  it('every tool name is MCP/Claude-API legal (no dots) and titled', () => {
    const report = C.validateToolTable();
    expect(report.errors).toEqual([]);
    expect(report.ok).toBe(true);
    for (const t of C.TOOL_CLASSIFICATION) {
      expect(t.name).toMatch(/^[a-zA-Z0-9_-]{1,64}$/);
      expect(t.name).not.toContain('.');
    }
  });

  it('emits title + readOnlyHint/destructiveHint annotations', () => {
    expect(C.getMcpAnnotations('blueprint_validate')).toEqual({
      title: 'Validate a Blueprint',
      readOnlyHint: true,
      destructiveHint: false,
    });
    expect(C.getMcpAnnotations('media_plan').readOnlyHint).toBe(true);
    expect(C.getMcpAnnotations('blueprint_execute').readOnlyHint).toBe(false);
    expect(C.getMcpAnnotations('nope_not_a_tool')).toBe(null);
  });

  it('first-slice tools are all read-only and demo-safe', () => {
    for (const name of ['capabilities', 'blueprint_validate', 'artifact_validate']) {
      expect(C.getMcpAnnotations(name).readOnlyHint).toBe(true);
      expect(C.isDemoSafeTool(name)).toBe(true);
    }
    expect(C.isDemoSafeTool('blueprint_execute')).toBe(false);
    expect(C.isDemoSafeTool('catalog_stage_submission')).toBe(false);
  });
});

describe('CapabilityManifest', () => {
  it('normalizes a valid desktop manifest predictably', () => {
    const r = C.validateCapabilityManifest(fixture('capability_manifest_desktop.json'));
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.value.imageGeneration).toEqual({ available: true, providers: ['sd-local'] });
    expect(r.value.vision.available).toBe(false);
    expect(r.value.catalog).toEqual({ read: true, stage: false });
  });

  it('fails closed on unknown schema version and deployment mode', () => {
    const bad = { ...fixture('capability_manifest_desktop.json'), schemaVersion: '2.7', deploymentMode: 'saas' };
    const r = C.validateCapabilityManifest(bad);
    expect(r.ok).toBe(false);
    expect(r.value).toBe(null);
    expect(r.errors.map((e) => e.code)).toEqual(
      expect.arrayContaining(['unsupported-version', 'unknown-deployment-mode'])
    );
  });

  it('demo mode cannot advertise privileged permissions or staging', () => {
    const r = C.validateCapabilityManifest(fixture('capability_manifest_demo_privileged.json'));
    expect(r.ok).toBe(false);
    const codes = r.errors.map((e) => e.code);
    expect(codes).toContain('demo-privileged-permission');
    expect(codes).toContain('demo-privileged-capability');
  });

  it('rejects secret-like fields instead of echoing them', () => {
    const leaky = { ...fixture('capability_manifest_desktop.json'), apiKey: 'sk-real-key' };
    const r = C.validateCapabilityManifest(leaky);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === 'secret-like-field')).toBe(true);
  });

  it('drops unknown fields with a warning (explicit additive-field policy)', () => {
    const extra = { ...fixture('capability_manifest_desktop.json'), vendorBlob: { x: 1 } };
    const r = C.validateCapabilityManifest(extra);
    expect(r.ok).toBe(true);
    expect(r.value.vendorBlob).toBeUndefined();
    expect(r.warnings.some((w) => w.code === 'unknown-field-dropped' && w.path === 'vendorBlob')).toBe(true);
  });
});

describe('Blueprint contract + legacy round-trip', () => {
  it('wraps the live Auto-Fill config and re-imposes the ordering invariant', () => {
    const bp = C.fromLegacyConfig(fixture('legacy_config.json'), {
      blueprintId: 'bp-test-1',
      gradeLevel: '5th Grade',
      language: 'English',
      standards: 'NGSS 5-ESS2-1',
    });
    // fixture deliberately lists lesson-plan FIRST; contract restores the invariant
    expect(bp.plan[0].tool).toBe('analysis');
    expect(bp.plan[bp.plan.length - 1].tool).toBe('lesson-plan');
    const r = C.validateBlueprint(bp);
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.value.requiredCapabilities).toEqual(['imageGeneration', 'text']);
  });

  it('round-trips back to the exact legacy shape handleExecuteBlueprint consumes', () => {
    const legacy = fixture('legacy_config.json');
    const bp = C.fromLegacyConfig(legacy, { blueprintId: 'bp-rt' });
    const out = C.toLegacyConfig(bp);
    expect(out.recommendedResources).toEqual(['analysis', 'glossary', 'quiz', 'image', 'lesson-plan']);
    expect(out.resourcePlan.every((r) => typeof r.tool === 'string' && 'directive' in r)).toBe(true);
    expect(out.toolDirectives.quiz).toBe('Test the golden thread.');
    expect(out.lessonDNA).toEqual(legacy.lessonDNA);
    expect(out.glossaryConfig).toEqual(legacy.glossaryConfig);
    expect(out.quizConfig).toEqual(legacy.quizConfig);
  });

  it('is deterministic in shape even when generation content varies', () => {
    const a = C.fromLegacyConfig(fixture('legacy_config.json'), { blueprintId: 'x' });
    const b = C.fromLegacyConfig(
      { recommendedResources: ['quiz'], toolDirectives: { quiz: 'different content entirely' } },
      { blueprintId: 'y' }
    );
    expect(Object.keys(a).sort()).toEqual(Object.keys(b).sort());
  });

  it('fails closed on unknown tools and empty plans', () => {
    const bad = C.fromLegacyConfig({ recommendedResources: ['quiz', 'totally-made-up'] }, { blueprintId: 'bp-bad' });
    const r = C.validateBlueprint(bad);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === 'unknown-tool')).toBe(true);
    const empty = C.validateBlueprint({ schemaVersion: '1.0', blueprintId: 'bp-e', plan: [] });
    expect(empty.ok).toBe(false);
    expect(empty.errors.some((e) => e.code === 'empty-plan')).toBe(true);
  });

  it('distinguishes malformed plan items from a genuinely empty plan', () => {
    const malformed = C.validateBlueprint({
      schemaVersion: '1.0',
      blueprintId: 'bp-malformed-plan',
      plan: [{ step: 'analysis', directive: 'Analyze the source' }],
    });
    expect(malformed.ok).toBe(false);
    expect(malformed.errors.some((e) => e.code === 'invalid-plan-item' && e.path === 'plan[0]')).toBe(true);
    expect(malformed.errors.some((e) => e.code === 'empty-plan')).toBe(false);

    const wrongType = C.validateBlueprint({ schemaVersion: '1.0', blueprintId: 'bp-object-plan', plan: {} });
    expect(wrongType.errors.some((e) => e.code === 'bad-plan')).toBe(true);
    expect(wrongType.errors.some((e) => e.code === 'empty-plan')).toBe(false);
  });

  it('accepts an injected knownTools list (ToolCatalog is the live source)', () => {
    const bp = C.fromLegacyConfig({ recommendedResources: ['custom-tool'] }, { blueprintId: 'bp-c' });
    expect(C.validateBlueprint(bp).ok).toBe(false);
    expect(C.validateBlueprint(bp, { knownTools: ['custom-tool'] }).ok).toBe(true);
  });

  it('rejects absolute filesystem paths in payload values', () => {
    const bp = C.fromLegacyConfig(fixture('legacy_config.json'), { blueprintId: 'bp-p' });
    bp.sourcePolicy = { kind: 'file', ref: 'C:\\Users\\teacher\\Desktop\\roster.csv' };
    const r = C.validateBlueprint(bp);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === 'unsafe-path-value')).toBe(true);

    bp.sourcePolicy = { kind: 'file', ref: '/tmp/roster.csv' };
    const posix = C.validateBlueprint(bp);
    expect(posix.ok).toBe(false);
    expect(posix.errors.some((e) => e.code === 'unsafe-path-value')).toBe(true);
  });

  it('fails closed when a payload exceeds the safety scanner nesting limit', () => {
    const bp = C.fromLegacyConfig(fixture('legacy_config.json'), { blueprintId: 'bp-deep' });
    let cursor = bp.configs;
    for (let i = 0; i < 10; i += 1) {
      cursor.next = {};
      cursor = cursor.next;
    }
    cursor.apiKey = 'must-not-escape-the-scan';
    const r = C.validateBlueprint(bp);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === 'payload-too-deep')).toBe(true);
  });

  it('applies the provenance contract to Blueprints', () => {
    const bp = C.fromLegacyConfig(fixture('legacy_config.json'), {
      blueprintId: 'bp-prov',
      provenance: { provider: 'gemini', prompt: 'hidden prompt' },
    });
    const r = C.validateBlueprint(bp);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === 'forbidden-provenance-field')).toBe(true);
  });
});

describe('CommandWorkflow contract', () => {
  it('normalizes a versioned reviewed workflow without resource-specific reordering', () => {
    const r = C.validateCommandWorkflow({
      schemaVersion: '1.0', workflowId: 'cw-1', kind: 'command-workflow', audience: 'teacher',
      steps: [
        { stepId: 'quiz', commandId: 'generate_quiz', params: {}, onFailure: 'pause' },
        { stepId: 'simplify', commandId: 'generate_simplified', params: { grade: '3' } },
      ], review: { state: 'draft' },
    }, { knownCommandIds: ['generate_quiz', 'generate_simplified'] });
    expect(r.ok).toBe(true);
    expect(r.value.steps.map((step) => step.stepId)).toEqual(['quiz', 'simplify']);
    expect(r.value.review).toEqual({ state: 'draft', reviewer: '' });
  });

  it('fails closed on unknown commands, duplicate steps, nested params, and prompt provenance', () => {
    const r = C.validateCommandWorkflow({
      schemaVersion: '1.0', workflowId: 'cw-bad', kind: 'command-workflow', audience: 'teacher',
      steps: [
        { stepId: 'same', commandId: 'invented', params: { nested: { no: true } } },
        { stepId: 'same', commandId: 'generate_quiz', params: {} },
      ], review: { state: 'draft' }, provenance: { prompt: 'do not store this' },
    }, { knownCommandIds: ['generate_quiz'] });
    expect(r.ok).toBe(false);
    expect(r.errors.map((error) => error.code)).toEqual(expect.arrayContaining([
      'unknown-command', 'duplicate-step-id', 'bad-command-param-value', 'forbidden-provenance-field',
    ]));
  });

  it('caps workflows at eight steps and drops unknown additive fields with warnings', () => {
    const steps = Array.from({ length: 9 }, (_, index) => ({ stepId: 's-' + index, commandId: 'open_learning_hub', params: {} }));
    const r = C.validateCommandWorkflow({ schemaVersion: '1.0', workflowId: 'cw-9', kind: 'command-workflow', audience: 'teacher', steps, extra: true }, { knownCommandIds: ['open_learning_hub'] });
    expect(r.ok).toBe(false);
    expect(r.errors.some((error) => error.code === 'too-many-workflow-steps')).toBe(true);
    expect(r.warnings.some((warning) => warning.path === 'extra')).toBe(true);
  });
});

describe('Artifact contract', () => {
  it('validates a resource artifact envelope and normalizes predictably', () => {
    const r = C.validateArtifact({
      schemaVersion: '1.0', artifactId: 'art-quiz-1', type: 'quiz',
      title: 'Water Cycle Quiz', language: 'English', data: { questions: [] },
    });
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.value.type).toBe('quiz');
    expect(C.validateArtifact({ schemaVersion: '1.0', artifactId: 'p1', type: 'allopack' }).ok).toBe(true);
  });

  it('fails closed on unknown types, oversize payloads, and secret-like fields', () => {
    expect(C.validateArtifact({ schemaVersion: '1.0', artifactId: 'a', type: 'malware' }).errors[0].code)
      .toBe('unknown-artifact-type');
    const big = C.validateArtifact({ schemaVersion: '1.0', artifactId: 'a', type: 'quiz', data: 'x'.repeat(2000001) });
    expect(big.errors.some((e) => e.code === 'data-too-large')).toBe(true);
    const leaky = C.validateArtifact({ schemaVersion: '1.0', artifactId: 'a', type: 'quiz', data: { apiKey: 'sk-x' } });
    expect(leaky.errors.some((e) => e.code === 'secret-like-field')).toBe(true);
  });

  it('rejects provenance that stores prompts', () => {
    const r = C.validateArtifact({
      schemaVersion: '1.0', artifactId: 'a', type: 'quiz',
      provenance: { provider: 'gemini', prompt: 'hidden' },
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === 'forbidden-provenance-field')).toBe(true);
  });

  it('returns only normalized provenance fields', () => {
    const r = C.validateArtifact({
      schemaVersion: '1.0', artifactId: 'a-normalized', type: 'quiz',
      provenance: { provider: 'gemini', rawConversation: 'must be dropped' },
    });
    expect(r.ok).toBe(true);
    expect(r.value.provenance.provider).toBe('gemini');
    expect(r.value.provenance.rawConversation).toBeUndefined();
    expect(r.value.provenance.contractVersion).toBe('1.0');
  });
});

describe('Job and Provenance contracts', () => {
  it('validates a job and clamps progress; result artifacts are IDs only', () => {
    const r = C.validateJob({
      schemaVersion: '1.0', jobId: 'job-1', blueprintId: 'bp-1',
      status: 'running', progress: 3.5, resultArtifactIds: ['art-1'],
    });
    expect(r.ok).toBe(true);
    expect(r.value.progress).toBe(1);
    const bad = C.validateJob({
      schemaVersion: '1.0', jobId: 'j', blueprintId: 'b', status: 'exploded',
      resultArtifactIds: ['x'.repeat(5000)],
    });
    expect(bad.ok).toBe(false);
    expect(bad.errors.map((e) => e.code)).toEqual(
      expect.arrayContaining(['unknown-status', 'bad-result-artifacts'])
    );
  });

  it('provenance never stores prompts or model reasoning', () => {
    const r = C.validateProvenance({ provider: 'gemini', model: 'gemini-3-flash', prompt: 'secret prompt' });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === 'forbidden-provenance-field')).toBe(true);
    const ok = C.validateProvenance({ provider: 'gemini', model: 'gemini-3-flash', generatedAt: '2026-07-14T12:00:00Z' });
    expect(ok.ok).toBe(true);
    expect(ok.value.contractVersion).toBe('1.0');
  });
});
