import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

function readProjectFile(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("Cloudflare deployment invariants", () => {
  it("builds the runner image from the service root", () => {
    const config = readProjectFile("wrangler.pilot.example.jsonc");

    expect(config).toMatch(
      /"image": "\.\/runner\/Dockerfile",\s*"image_build_context": "\."/u,
    );
  });

  it("sends only staged runner inputs to the container builder", () => {
    const dockerIgnore = readProjectFile(".dockerignore");

    expect(dockerIgnore).toMatch(/^\*\*/mu);
    expect(dockerIgnore).toContain("!runner/package-lock.json");
    expect(dockerIgnore).toContain("!.runner-context/**");
    expect(dockerIgnore).toContain(".dev.vars*");
    expect(dockerIgnore).toContain(".env*");
    expect(dockerIgnore).not.toContain("!node_modules");
  });

  it("keeps staging resources isolated and required secrets declared", () => {
    const config = readProjectFile("wrangler.pilot.example.jsonc");

    expect(config).toContain(
      '"name": "alloflow-remediation-institution-staging"',
    );
    expect(config).toContain(
      '"database_name": "alloflow-institution-pilot-staging"',
    );
    expect(config).toContain(
      '"bucket_name": "alloflow-institution-pilot-staging-documents"',
    );
    expect(config).toContain('"name": "DCR_RATE_LIMITER"');
    expect(config).toContain('"ACCESS_CLIENT_SECRET"');
    expect(config).toContain('"GEMINI_API_KEY"');
    expect(config).toContain('"RELEASE_CANARY_SECRET"');
    expect(config).toContain('"RUNNER_AUTH_SECRET"');
    expect(config).toContain('"CHATGPT_REDIRECT_URI"');
  });

  it("keeps default deployment routes private and local configs ignored", () => {
    const config = readProjectFile("wrangler.jsonc");
    const gitIgnore = readProjectFile(".gitignore");
    const packageJson = JSON.parse(readProjectFile("package.json")) as {
      scripts: Record<string, string>;
    };

    expect(config).toContain('"workers_dev": false');
    expect(config).toContain('"preview_urls": false');
    expect(gitIgnore).toContain("wrangler.pilot.local.jsonc");
    expect(packageJson.scripts.deploy).toBeUndefined();
    expect(packageJson.scripts["runner:stage:check"]).toContain("--check");
    expect(packageJson.scripts.check).toContain("runner:stage:check");
    expect(packageJson.scripts["deploy:staging"]).toContain(
      "preflight:staging",
    );
    expect(packageJson.scripts["deploy:staging"]).toContain(
      "runner:stage",
    );
    expect(packageJson.scripts["deploy:staging"]).toContain(
      "runner:stage:check",
    );
    expect(packageJson.scripts["deploy:staging"]).toContain(
      "runner:canary",
    );
    expect(packageJson.scripts["deploy:staging"]).toContain(
      "lifecycle:apply:staging",
    );
    expect(packageJson.scripts["deploy:staging"]).toContain(
      "canary:staging",
    );
  });

  it("exports the ContainerProxy required by outbound interception", () => {
    const entrypoint = readProjectFile("src/pilot-index.ts");

    expect(entrypoint).toContain(
      'export { ContainerProxy } from "@cloudflare/containers";',
    );
  });

  it("keeps deep readiness authenticated and model-aware", () => {
    const entrypoint = readProjectFile("src/pilot-index.ts");
    const container = readProjectFile("src/remediation-container.ts");

    expect(entrypoint).toContain('url.pathname === "/readyz"');
    expect(entrypoint).toContain("RELEASE_CANARY_SECRET");
    expect(entrypoint).toContain("constantTimeEqual");
    expect(entrypoint).toContain("expectedRunnerBuildForModel(");
    expect(entrypoint).toContain("container.probeRunnerHealth()");
    expect(container).toContain("async probeRunnerHealth()");
    expect(container).toContain("await this.setOutboundByHosts({})");
    expect(container).toContain("await this.setAllowedHosts([])");
    expect(container).toContain("this.enableInternet = false");
  });

  it("allows both internal proxy hostnames before outbound handlers run", () => {
    const source = readProjectFile("src/remediation-container.ts");
    const allowedHosts =
      source.match(/(?:override\s+)?allowedHosts\s*=\s*\[([\s\S]*?)\];/u)?.[1] ||
      "";

    expect(allowedHosts).toContain('"r2.internal"');
    expect(allowedHosts).toContain('"gemini.internal"');
  });

  it("keeps browser assets local to the runner", () => {
    const source = readProjectFile("src/remediation-container.ts");
    const allowedHosts = source.match(/(?:override\s+)?allowedHosts\s*=\s*\[([\s\S]*?)\];/u)?.[1] || "";
    expect(allowedHosts).not.toMatch(/cdn\.jsdelivr|cdnjs\.cloudflare|unpkg/u);
    expect(source).toContain('ALLOFLOW_MCP_OFFLINE_ASSETS: "1"');
  });

  it("uses R2-verified checksums instead of trusting runner metadata", () => {
    const container = readProjectFile("src/remediation-container.ts");
    const workflow = readProjectFile("src/remediation-workflow.ts");

    expect(container).toContain("sha256: declaredSha256");
    expect(container).toContain("stored.checksums.sha256");
    expect(workflow).toContain("pdf.checksums.sha256");
    expect(workflow).not.toContain("pdf.customMetadata?.sha256");
  });

  it("keeps job creation and publication transactional and replay-safe", () => {
    const store = readProjectFile("src/job-store.ts");

    expect(store).toContain("INSERT OR IGNORE INTO jobs");
    expect(store.match(/await db\.batch\(\[/gu)?.length).toBeGreaterThanOrEqual(2);
    expect(store).toContain('current.status === "completed"');
    expect(store).toContain("input_key IS NOT NULL");
  });

  it("rolls out renewable job leases without expiring legacy runs", () => {
    const migration = readProjectFile(
      "migrations/0004_job_attempt_leases.sql",
    );
    const store = readProjectFile("src/job-store.ts");

    expect(migration).toContain("ADD COLUMN attempt_id");
    expect(migration).toContain("ADD COLUMN heartbeat_at");
    expect(migration).toContain("ADD COLUMN lease_expires_at");
    expect(migration).toContain("unixepoch() + 3600");
    expect(store).toContain("RUNNING_JOB_LEASE_SECONDS = 5 * 60");
    expect(store).toContain("const queuedCutoff");
    expect(store).not.toContain("COALESCE(started_at, created_at)");
  });

  it("rolls out attempt-fenced durable checkpoints before runtime use", () => {
    const migration = readProjectFile(
      "migrations/0005_job_checkpoints.sql",
    );
    const store = readProjectFile("src/job-store.ts");
    const container = readProjectFile("src/remediation-container.ts");
    const workflow = readProjectFile("src/remediation-workflow.ts");
    const operations = readProjectFile("src/pilot-operations.ts");

    expect(migration).toContain("ADD COLUMN checkpoint_seq");
    expect(migration).toContain("ADD COLUMN checkpoint_key");
    expect(migration).toContain("ADD COLUMN checkpoint_sha256");
    expect(migration).toContain("jobs_checkpoint_key_idx");
    expect(store).toContain("commitJobCheckpoint");
    expect(store).toContain("AND attempt_id = ?");
    expect(store).toContain("checkpoint_seq = ?");
    expect(container).toContain('url.pathname === "/checkpoint"');
    expect(container).toContain('etagDoesNotMatch: "*"');
    expect(workflow).toContain('"http://r2.internal/checkpoint"');
    expect(workflow).toContain('"remove published checkpoints"');
    expect(operations).toContain("jobCheckpointPrefix(job)");
  });

  it("defers terminal states and input cleanup until shutdown is confirmed", () => {
    const operations = readProjectFile("src/pilot-operations.ts");
    const workflow = readProjectFile("src/remediation-workflow.ts");

    expect(operations).toContain("workflowStopped && containerStopped");
    expect(operations).toContain('deleted: false, status: "deleting"');
    expect(operations).toContain('job.status === "completed"');
    expect(workflow).toContain('"remove published input"');
    expect(workflow).toContain('"successful_input_cleanup_deferred"');
  });
});
