import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const workflow = readFileSync(resolve('.github/workflows/mcpb-release.yml'), 'utf8');

describe('MCPB release workflow triggers', () => {
  it('keeps PR builds read-only and attests only verified artifacts from trusted release tags', () => {
    const build = workflow.slice(workflow.indexOf('\n  build:'), workflow.indexOf('\n  attest:'));
    const attest = workflow.slice(workflow.indexOf('\n  attest:'), workflow.indexOf('\n  release:'));
    const release = workflow.slice(workflow.indexOf('\n  release:'));
    expect(workflow).toMatch(/\npermissions:\r?\n  contents: read/);
    expect(build).not.toMatch(/(?:id-token|attestations|contents): write/);
    expect(build).toContain('persist-credentials: false');
    expect(attest).toContain('needs: build');
    for (const job of [attest, release]) {
      expect(job).toContain("github.event_name == 'push'");
      expect(job).toContain("github.repository == 'Apomera/AlloFlow'");
      expect(job).toContain("startsWith(github.ref, 'refs/tags/mcpb-v')");
    }
    expect(attest).not.toMatch(/(?:uses: actions\/checkout|\brun:)/);
    expect(attest).toContain('subject-path: release-assets/alloflow-remediation.mcpb');
    expect(release).toContain('needs: [build, attest]');
  });

  it('requires bundle audit, source integrity, and EPUB safety regressions before packaging', () => {
    const trigger = workflow.slice(workflow.indexOf('  pull_request:'), workflow.indexOf('\npermissions:'));
    const build = workflow.slice(workflow.indexOf('\n  build:'), workflow.indexOf('\n  attest:'));
    const packaging = build.indexOf('      - name: Build, officially validate, extract, and boot-check the exact MCPB');
    for (const file of ['tests/mcp_bundle_audit_security.test.cjs', 'tests/mcp_artifact_source_bytes.test.cjs',
      'tests/mcp_epub_archive_security.test.js', 'tests/mcp_epub_validation.test.js']) {
      expect(trigger).toContain(`- '${file}'`);
      expect(build.indexOf(file)).toBeGreaterThan(-1);
      expect(build.indexOf(file)).toBeLessThan(packaging);
    }
    for (const file of ['dev-tools/security/test-mcp-runtime-dependencies.cjs', 'tests/mcp_ace_browser_security.test.cjs']) {
      expect(trigger).toContain(`- '${file}'`);
    }
    expect(build.slice(0, packaging)).not.toMatch(/continue-on-error:\s*true|\|\|\s*true/);
  });

  it('enables Windows long paths before the build checkout can encounter report artifacts', () => {
    const build = workflow.slice(workflow.indexOf('\n  build:'), workflow.indexOf('\n  release:'));
    const longPaths = build.indexOf('run: git config --global core.longpaths true');
    const checkout = build.indexOf('uses: actions/checkout@');
    expect(longPaths).toBeGreaterThan(-1);
    expect(checkout).toBeGreaterThan(longPaths);
    expect(build.slice(0, checkout)).not.toMatch(/continue-on-error:\s*true/);
  });

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
