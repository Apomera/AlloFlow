import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const workflow = readFileSync(resolve('.github/workflows/mcpb-release.yml'), 'utf8');

describe('MCPB release workflow triggers', () => {
  it('nests manual, tag, and pull-request triggers under on', () => {
    expect(workflow).toMatch(/^on:\r?\n  workflow_dispatch:\r?\n  push:\r?\n    tags:/m);
    expect(workflow).toMatch(/^  pull_request:\r?\n    branches: \[main\]/m);
    expect(workflow).not.toMatch(/^workflow_dispatch:/m);
  });

  it('runs when the hardened MCP regression suites change', () => {
    for (const path of [
      'tests/mcp_remediation_stdio_smoke.test.js',
      'tests/mcp_agent_bridge_e2e.test.js',
      'tests/desktop_mcp_durable_jobs.test.js',
      'tests/desktop_mcp_residual_hardening.test.js',
      'tests/desktop_mcp_runtime_build_drift.test.js',
      'tests/desktop_mcp_completion_manifest_race.test.js',
      'tests/batch_checkpoint_boundary_commit.test.js',
      'tests/doc_pipeline_build_parity.test.js',
      'tests/mcp_verifier_packaging_hardening.test.js',
      'tests/mcp_call_cli.test.js',
      'tests/mcpb_release_workflow.test.js',
    ]) {
      expect(workflow).toContain(`- '${path}'`);
    }
    for (const path of [
      'doc_pipeline_source.jsx',
      'doc_pipeline_module.js',
      '_build_doc_pipeline_module.js',
    ]) {
      expect(workflow).toContain("- '" + path + "'");
    }
  });

  it('executes the hardening suites before packaging', () => {
    const testStep = workflow.indexOf('Verify MCP durability, cancellation, packaging, and release triggers');
    const buildStep = workflow.indexOf('Build, officially validate, extract, and boot-check the exact MCPB');
    expect(testStep).toBeGreaterThan(-1);
    expect(buildStep).toBeGreaterThan(testStep);
    for (const path of [
      'tests/desktop_mcp_durable_jobs.test.js',
      'tests/desktop_mcp_residual_hardening.test.js',
      'tests/desktop_mcp_runtime_build_drift.test.js',
      'tests/desktop_mcp_completion_manifest_race.test.js',
      'tests/batch_checkpoint_boundary_commit.test.js',
      'tests/doc_pipeline_build_parity.test.js',
      'tests/mcp_verifier_packaging_hardening.test.js',
      'tests/mcp_call_cli.test.js',
      'tests/mcpb_release_workflow.test.js',
      'tests/mcp_agent_bridge_e2e.test.js',
    ]) {
      expect(workflow.indexOf(path, testStep)).toBeLessThan(buildStep);
    }
  });
});
