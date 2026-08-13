import { describe, expect, it } from "vitest";

import {
  completionNeedsReview,
  type RemediationVerificationState,
} from "../src/job-store";

describe("public remediation completion status", () => {
  it.each(["review-required", "partial", "unavailable"] as const)(
    "maps %s verification to completed_with_review",
    (verificationState) =>
      expect(completionNeedsReview(verificationState)).toBe(true),
  );

  it.each(["complete", "complete-for-tested-scope"] as const)(
    "keeps %s verification as completed",
    (verificationState: RemediationVerificationState) =>
      expect(completionNeedsReview(verificationState)).toBe(false),
  );

  it("fails closed for a legacy completed row with no verification state", () => {
    expect(completionNeedsReview(null)).toBe(true);
  });

  it("keeps the additive public mapping explicit", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("../src/pilot-operations.ts", import.meta.url), "utf8"),
    );
    expect(source).toContain('"completed_with_review"');
    expect(source).toContain("completionNeedsReview(job.verification_state)");
    expect(source).toContain("job.verification_state ??");
    expect(source).toContain("requiresReview,");
  });
});
