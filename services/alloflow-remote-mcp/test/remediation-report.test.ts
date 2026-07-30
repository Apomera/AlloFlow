import { describe, expect, it } from "vitest";

import {
  RemediationReportError,
  sanitizeRemediationReport,
  type RemediationReportExpectation,
} from "../src/remediation-report";

const JOB_ID = "job_test_01";
const RESULT_SIZE = 1024;
const RESULT_SHA256 = "ab".repeat(32);
const PRIVACY_CANARY =
  "student-name-and-document-text-must-never-leave-private-report";

const expected: RemediationReportExpectation = {
  jobId: JOB_ID,
  resultSizeBytes: RESULT_SIZE,
  resultSha256: RESULT_SHA256,
  targetScore: 95,
  fixPasses: 2,
  effortProfile: "standard",
  ocrLanguage: "",
  polishPasses: 0,
  autoContinueRounds: 0,
  autoContinueRoundsRun: 0,
  beforeScore: 42,
  afterScore: 96,
};

function legacyReport(): Record<string, unknown> {
  return {
    schema: 1,
    jobId: JOB_ID,
    status: "succeeded",
    input: {
      contentType: "application/pdf",
      size: 777,
      originalFileName: PRIVACY_CANARY,
    },
    options: {
      targetScore: 95,
      fixPasses: 2,
      polishPasses: 0,
      taggedPdf: true,
      autoContinue: false,
      validateUa: false,
      maxRunMinutes: 20,
      debugPrompt: PRIVACY_CANARY,
    },
    summary: {
      beforeScore: 42,
      afterScore: 96,
      estimatedMinimumScore: null,
      integrityCoverage: 100,
      aiVerificationIncomplete: false,
      extractedText: PRIVACY_CANARY,
      activeContentScanVerified: true,
      activeContentDetected: false,
      distributionLevel: "ready",
      verificationState: "complete",
      verificationHtmlBound: true,
      taggedPdfDelivery: "verified",
      taggedPdfExportMode: "original_layout",
      remainingAxeViolations: 0,
      remainingEqualAccessFailures: 0,
      auditCoverage: {
        configuredAuditorCap: 5,
        requestedAuditors: 3,
        completedAuditors: 3,
        sliced: false,
      },
    },
    artifact: {
      kind: "tagged_pdf",
      contentType: "application/pdf",
      size: RESULT_SIZE,
      sha256: RESULT_SHA256.toUpperCase(),
      localPath: PRIVACY_CANARY,
    },
    pdfUaValidation: {
      status: "not_run",
      reason: "disabled_for_institution_pilot",
      rawValidatorOutput: PRIVACY_CANARY,
    },
    logs: [PRIVACY_CANARY],
  };
}

function expectCode(
  callback: () => unknown,
  code: RemediationReportError["code"],
): void {
  try {
    callback();
    throw new Error("expected sanitizer to throw");
  } catch (error) {
    expect(error).toBeInstanceOf(RemediationReportError);
    expect((error as RemediationReportError).code).toBe(code);
  }
}

describe("sanitizeRemediationReport", () => {
  it("normalizes a legacy report and strips every unknown privacy field", () => {
    const result = sanitizeRemediationReport(legacyReport(), expected);

    expect(result).toEqual({
      schema: 1,
      jobId: JOB_ID,
      status: "succeeded",
      options: {
        targetScore: 95,
        fixPasses: 2,
        polishPasses: 0,
        taggedPdf: true,
        autoContinue: false,
        validateUa: false,
        maxRunMinutes: 20,
        effortProfile: "standard",
        ocrLanguage: "",
        autoContinueRounds: 0,
      },
      summary: {
        beforeScore: 42,
        afterScore: 96,
        estimatedMinimumScore: null,
        integrityCoverage: 100,
        aiVerificationIncomplete: false,
        autoContinueRoundsRun: 0,
        activeContentScanVerified: true,
        activeContentDetected: false,
        distributionLevel: "ready",
        verificationState: "complete",
        verificationHtmlBound: true,
        taggedPdfDelivery: "verified",
        taggedPdfExportMode: "original_layout",
        remainingAxeViolations: 0,
        remainingEqualAccessFailures: 0,
        auditCoverage: {
          configuredAuditorCap: 5,
          requestedAuditors: 3,
          completedAuditors: 3,
          sliced: false,
        },
      },
      artifact: {
        kind: "tagged_pdf",
        contentType: "application/pdf",
        size: RESULT_SIZE,
        sha256: RESULT_SHA256,
      },
      pdfUaValidation: {
        status: "not_run",
        reason: "disabled_for_institution_pilot",
      },
    });
    expect(JSON.stringify(result)).not.toContain(PRIVACY_CANARY);
    expect(result).not.toHaveProperty("input");
  });

  it("accepts bounded thorough-profile fields without returning extras", () => {
    const report = legacyReport();
    report.options = {
      ...(report.options as Record<string, unknown>),
      autoContinue: true,
      polishPasses: 1,
      effortProfile: "thorough",
      ocrLanguage: "es",
      autoContinueRounds: 2,
    };
    report.summary = {
      ...(report.summary as Record<string, unknown>),
      autoContinueRoundsRun: 1,
    };
    report.pdfUaValidation = {
      status: "not_run",
      reason: "independent_validator_not_packaged",
    };

    const result = sanitizeRemediationReport(report, {
      ...expected,
      effortProfile: "thorough",
      ocrLanguage: "es",
      polishPasses: 1,
      autoContinueRounds: 2,
      autoContinueRoundsRun: 1,
    });

    expect(result.options).toMatchObject({
      effortProfile: "thorough",
      ocrLanguage: "es",
      autoContinue: true,
      autoContinueRounds: 2,
    });
    expect(result.summary.autoContinueRoundsRun).toBe(1);
    expect(result.pdfUaValidation).toEqual({
      status: "not_run",
      reason: "independent_validator_not_packaged",
    });
  });

  it.each([
    [
      "job id",
      { ...expected, jobId: "job_other" },
      "remediation_report_job_mismatch",
    ],
    [
      "artifact size",
      { ...expected, resultSizeBytes: RESULT_SIZE + 1 },
      "remediation_report_artifact_mismatch",
    ],
    [
      "artifact digest",
      { ...expected, resultSha256: "cd".repeat(32) },
      "remediation_report_artifact_mismatch",
    ],
  ] as const)(
    "rejects a mismatched %s",
    (_name, mismatchedExpected, code) => {
      expectCode(
        () => sanitizeRemediationReport(legacyReport(), mismatchedExpected),
        code,
      );
    },
  );

  it("rejects report options and outcomes that disagree with D1 state", () => {
    const optionMismatch = legacyReport();
    optionMismatch.options = {
      ...(optionMismatch.options as Record<string, unknown>),
      targetScore: 94,
    };
    expectCode(
      () => sanitizeRemediationReport(optionMismatch, expected),
      "remediation_report_job_state_mismatch",
    );

    const scoreMismatch = legacyReport();
    scoreMismatch.summary = {
      ...(scoreMismatch.summary as Record<string, unknown>),
      beforeScore: 41,
    };
    expectCode(
      () => sanitizeRemediationReport(scoreMismatch, expected),
      "remediation_report_job_state_mismatch",
    );

    const roundsMismatch = legacyReport();
    roundsMismatch.options = {
      ...(roundsMismatch.options as Record<string, unknown>),
      autoContinue: true,
      polishPasses: 1,
      effortProfile: "thorough",
      ocrLanguage: "es",
      autoContinueRounds: 2,
    };
    roundsMismatch.summary = {
      ...(roundsMismatch.summary as Record<string, unknown>),
      autoContinueRoundsRun: 1,
    };
    expectCode(
      () =>
        sanitizeRemediationReport(roundsMismatch, {
          ...expected,
          effortProfile: "thorough",
          ocrLanguage: "es",
          polishPasses: 1,
          autoContinueRounds: 2,
          autoContinueRoundsRun: 0,
        }),
      "remediation_report_job_state_mismatch",
    );
  });

  it("rejects malformed or dishonest profile and validation metadata", () => {
    const excessiveRounds = legacyReport();
    excessiveRounds.options = {
      ...(excessiveRounds.options as Record<string, unknown>),
      autoContinue: true,
      polishPasses: 1,
      effortProfile: "thorough",
      autoContinueRounds: 1,
    };
    excessiveRounds.summary = {
      ...(excessiveRounds.summary as Record<string, unknown>),
      autoContinueRoundsRun: 2,
    };
    expectCode(
      () => sanitizeRemediationReport(excessiveRounds, expected),
      "remediation_report_malformed",
    );

    const unsupportedValidation = legacyReport();
    unsupportedValidation.pdfUaValidation = {
      status: "passed",
      compliant: true,
      evidence: PRIVACY_CANARY,
    };
    expectCode(
      () => sanitizeRemediationReport(unsupportedValidation, expected),
      "remediation_report_malformed",
    );

    const freeFormOcrLanguage = legacyReport();
    freeFormOcrLanguage.options = {
      ...(freeFormOcrLanguage.options as Record<string, unknown>),
      ocrLanguage: PRIVACY_CANARY,
    };
    expectCode(
      () => sanitizeRemediationReport(freeFormOcrLanguage, expected),
      "remediation_report_malformed",
    );
  });

  it.each([
    ["activeContentScanVerified", false],
    ["activeContentDetected", true],
    ["distributionLevel", "review"],
    ["verificationState", "invented"],
    ["verificationHtmlBound", false],
    ["taggedPdfDelivery", "assumed"],
    ["taggedPdfExportMode", "clean_rebuild"],
    ["remainingAxeViolations", -1],
    ["remainingEqualAccessFailures", 1_000_001],
  ] as const)(
    "rejects invalid quality evidence in %s",
    (field, value) => {
      const report = legacyReport();
      report.summary = {
        ...(report.summary as Record<string, unknown>),
        [field]: value,
      };
      expectCode(
        () => sanitizeRemediationReport(report, expected),
        "remediation_report_malformed",
      );
    },
  );

  it("requires every quality field and accepts only bounded nullable counts", () => {
    const missing = legacyReport();
    const missingSummary = {
      ...(missing.summary as Record<string, unknown>),
    };
    delete missingSummary.taggedPdfDelivery;
    missing.summary = missingSummary;
    expectCode(
      () => sanitizeRemediationReport(missing, expected),
      "remediation_report_malformed",
    );

    const bounded = legacyReport();
    bounded.summary = {
      ...(bounded.summary as Record<string, unknown>),
      distributionLevel: "caution",
      verificationState: "complete-for-tested-scope",
      remainingAxeViolations: null,
      remainingEqualAccessFailures: 1_000_000,
    };
    const result = sanitizeRemediationReport(bounded, expected);
    expect(result.summary).toMatchObject({
      distributionLevel: "caution",
      verificationState: "complete-for-tested-scope",
      verificationHtmlBound: true,
      taggedPdfDelivery: "verified",
      taggedPdfExportMode: "original_layout",
      remainingAxeViolations: null,
      remainingEqualAccessFailures: 1_000_000,
      auditCoverage: {
        configuredAuditorCap: 5,
        requestedAuditors: 3,
        completedAuditors: 3,
        sliced: false,
      },
    });
  });

  it("rejects missing, sliced, or inconsistent adaptive-auditor evidence", () => {
    for (const auditCoverage of [
      undefined,
      {
        configuredAuditorCap: 5,
        requestedAuditors: 3,
        completedAuditors: 3,
        sliced: true,
      },
      {
        configuredAuditorCap: 5,
        requestedAuditors: 5,
        completedAuditors: 4,
        sliced: false,
      },
      {
        configuredAuditorCap: 4,
        requestedAuditors: 3,
        completedAuditors: 3,
        sliced: false,
      },
    ]) {
      const report = legacyReport();
      report.summary = {
        ...(report.summary as Record<string, unknown>),
        auditCoverage,
      };
      expectCode(
        () => sanitizeRemediationReport(report, expected),
        "remediation_report_malformed",
      );
    }
  });

  it("keeps tagged-PDF delivery proof distinct from independent PDF/UA validation", () => {
    const result = sanitizeRemediationReport(legacyReport(), expected);
    expect(result.summary.taggedPdfDelivery).toBe("verified");
    expect(result.pdfUaValidation).toEqual({
      status: "not_run",
      reason: "disabled_for_institution_pilot",
    });
  });
});
