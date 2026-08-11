import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pilotSource = readFileSync(
  fileURLToPath(
    new URL("../src/pilot-operations.ts", import.meta.url),
  ),
  "utf8",
);
const workflowSource = readFileSync(
  fileURLToPath(
    new URL("../src/remediation-workflow.ts", import.meta.url),
  ),
  "utf8",
);

describe("checkpoint orphan cleanup contracts", () => {
  it("sweeps every paginated object under the tenant/job checkpoint prefix", () => {
    const helperStart = pilotSource.indexOf(
      "async function deleteCheckpointObjects(",
    );
    const deleteStart = pilotSource.indexOf(
      "async function deleteArtifacts(",
      helperStart,
    );
    const helper = pilotSource.slice(helperStart, deleteStart);

    expect(helperStart).toBeGreaterThan(-1);
    expect(helper).toContain("jobCheckpointPrefix(job)");
    expect(helper).toContain("await bucket.list({");
    expect(helper).toContain("prefix,");
    expect(helper).toContain("page.truncated ? page.cursor : undefined");
    expect(helper).toContain("await bucket.delete(");
  });

  it("uses prefix cleanup for cancel, delete, expiry, and completed-job cleanup", () => {
    const deleteStart = pilotSource.indexOf(
      "async function deleteArtifacts(",
    );
    const cancelStart = pilotSource.indexOf(
      "export async function cancelRemediation(",
      deleteStart,
    );
    const deleteArtifacts = pilotSource.slice(deleteStart, cancelStart);
    const scheduledStart = pilotSource.indexOf(
      "export async function cleanupInstitutionPilot(",
    );
    const scheduled = pilotSource.slice(scheduledStart);

    expect(deleteArtifacts).toContain(
      "await deleteCheckpointObjects(env.DOCUMENTS, current)",
    );
    expect(scheduled).toContain("await deleteArtifacts(env, job)");
    expect(scheduled).toContain(
      "await deleteCheckpointObjects(env.DOCUMENTS, current)",
    );
    expect(scheduled).toContain("await clearJobCheckpoint(");
    expect(scheduled).toContain(
      "Always sweep the bounded checkpoint prefix before removing the input",
    );
  });

  it("sweeps crash-before-pointer orphans on both Workflow success and failure", () => {
    const successStart = workflowSource.indexOf(
      '"remove published checkpoints"',
    );
    const inputCleanupStart = workflowSource.indexOf(
      '"remove published input"',
      successStart,
    );
    const success = workflowSource.slice(successStart, inputCleanupStart);
    const failureStart = workflowSource.indexOf(
      '"remove failed artifacts"',
    );
    const failure = workflowSource.slice(failureStart);

    expect(success).toContain("if (!checkpoint)");
    expect(success).toContain("await deleteCheckpointObjects(");
    expect(success).toContain("await clearJobCheckpoint(");

    const fence = failure.indexOf("await failJob(");
    const sweep = failure.indexOf("await deleteCheckpointObjects(");
    expect(fence).toBeGreaterThan(-1);
    expect(fence).toBeLessThan(sweep);
  });

  it("retains the completed input marker until the success prefix sweep finishes", () => {
    const checkpointStart = workflowSource.indexOf(
      "let publishedCheckpointCleanupComplete = false",
    );
    const inputCleanupStart = workflowSource.indexOf(
      '"remove published input"',
      checkpointStart,
    );
    const guardStart = workflowSource.lastIndexOf(
      "if (publishedCheckpointCleanupComplete)",
      inputCleanupStart,
    );
    const deferredEvent = workflowSource.indexOf(
      "successful_input_cleanup_waiting_for_checkpoint_sweep",
      inputCleanupStart,
    );

    expect(checkpointStart).toBeGreaterThan(-1);
    expect(guardStart).toBeGreaterThan(checkpointStart);
    expect(guardStart).toBeLessThan(inputCleanupStart);
    expect(deferredEvent).toBeGreaterThan(inputCleanupStart);
  });
});
