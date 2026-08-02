import { isSupportedOcrLanguage } from "./remediation-options";

const SHA256_RE = /^[a-f0-9]{64}$/iu;

export type EffortProfile = "standard" | "thorough";
export type RemediationDistributionLevel = "ready" | "caution";
export type RemediationVerificationState =
  | "complete"
  | "complete-for-tested-scope"
  | "review-required"
  | "partial"
  | "unavailable";
export type TaggedPdfDelivery = "verified";
export type TaggedPdfExportMode = "original_layout";

export interface RemediationAuditCoverage {
  configuredAuditorCap: 5;
  requestedAuditors: number;
  completedAuditors: number;
  sliced: false;
}

export type PdfUaNotRunReason =
  | "disabled_for_institution_pilot"
  | "independent_validator_not_packaged";

export type PdfUaValidation =
  | {
      status: "not_run";
      reason: PdfUaNotRunReason;
    }
  | {
      status: "unavailable";
      reason:
        | "validator_not_available"
        | "validator_timeout"
        | "validator_error";
    }
  | {
      status: "compliant" | "noncompliant";
      validator: "veraPDF";
      profile: "ua1";
      validatorVersion: string | null;
      failedRules: number;
      failedChecks: number;
      passedRules: number;
      passedChecks: number;
    };

export interface RemediationReportExpectation {
  jobId: string;
  resultSizeBytes: number;
  resultSha256: string;
  targetScore: number;
  fixPasses: number;
  effortProfile: EffortProfile;
  ocrLanguage: string;
  polishPasses: number;
  autoContinueRounds: number;
  autoContinueRoundsRun: number;
  beforeScore: number | null;
  afterScore: number | null;
}

export interface PublicRemediationReport {
  schema: 1;
  jobId: string;
  status: "succeeded";
  options: {
    targetScore: number;
    fixPasses: number;
    polishPasses: 0 | 1;
    taggedPdf: true;
    autoContinue: boolean;
    validateUa: false;
    maxRunMinutes: number;
    effortProfile: EffortProfile;
    ocrLanguage: string;
    autoContinueRounds: number;
  };
  summary: {
    beforeScore: number | null;
    afterScore: number | null;
    estimatedMinimumScore: number | null;
    integrityCoverage: number | null;
    aiVerificationIncomplete: boolean;
    autoContinueRoundsRun: number;
    activeContentScanVerified: true;
    activeContentDetected: false;
    distributionLevel: RemediationDistributionLevel;
    verificationState: RemediationVerificationState;
    verificationHtmlBound: true;
    taggedPdfDelivery: TaggedPdfDelivery;
    taggedPdfExportMode: TaggedPdfExportMode;
    remainingAxeViolations: number | null;
    remainingEqualAccessFailures: number | null;
    auditCoverage: RemediationAuditCoverage;
  };
  artifact: {
    kind: "tagged_pdf";
    contentType: "application/pdf";
    size: number;
    sha256: string;
  };
  pdfUaValidation: PdfUaValidation;
}

export type RemediationReportErrorCode =
  | "invalid_report_expectation"
  | "remediation_report_malformed"
  | "remediation_report_job_mismatch"
  | "remediation_report_job_state_mismatch"
  | "remediation_report_artifact_mismatch";

export class RemediationReportError extends Error {
  readonly code: RemediationReportErrorCode;

  constructor(code: RemediationReportErrorCode) {
    super(code);
    this.name = "RemediationReportError";
    this.code = code;
  }
}

function fail(code: RemediationReportErrorCode): never {
  throw new RemediationReportError(code);
}

function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return fail("remediation_report_malformed");
  }
  return value as Record<string, unknown>;
}

function integer(
  value: unknown,
  minimum: number,
  maximum: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    return fail("remediation_report_malformed");
  }
  return value;
}

function scoreOrNull(value: unknown): number | null {
  if (value === null) {
    return null;
  }
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 100
  ) {
    return fail("remediation_report_malformed");
  }
  return value;
}

function boolean(value: unknown): boolean {
  if (typeof value !== "boolean") {
    return fail("remediation_report_malformed");
  }
  return value;
}

function distributionLevel(
  value: unknown,
): RemediationDistributionLevel {
  if (value !== "ready" && value !== "caution") {
    return fail("remediation_report_malformed");
  }
  return value;
}

function verificationState(
  value: unknown,
): RemediationVerificationState {
  if (
    value !== "complete" &&
    value !== "complete-for-tested-scope" &&
    value !== "review-required" &&
    value !== "partial" &&
    value !== "unavailable"
  ) {
    return fail("remediation_report_malformed");
  }
  return value;
}

function requiredTrue(value: unknown): true {
  if (value !== true) {
    return fail("remediation_report_malformed");
  }
  return true;
}

function findingCountOrNull(value: unknown): number | null {
  if (value === null) {
    return null;
  }
  return integer(value, 0, 1_000_000);
}

function auditCoverage(value: unknown): RemediationAuditCoverage {
  const coverage = record(value);
  const configuredAuditorCap = integer(
    coverage.configuredAuditorCap,
    5,
    5,
  );
  const requestedAuditors = integer(coverage.requestedAuditors, 3, 5);
  const completedAuditors = integer(coverage.completedAuditors, 3, 5);
  if (
    completedAuditors < requestedAuditors ||
    coverage.sliced !== false
  ) {
    return fail("remediation_report_malformed");
  }
  return {
    configuredAuditorCap: configuredAuditorCap as 5,
    requestedAuditors,
    completedAuditors,
    sliced: false,
  };
}

function normalizeEffortProfile(value: unknown): EffortProfile {
  if (value === undefined) {
    return "standard";
  }
  if (value !== "standard" && value !== "thorough") {
    return fail("remediation_report_malformed");
  }
  return value;
}

function normalizeOcrLanguage(value: unknown): string {
  if (value === undefined) {
    return "";
  }
  if (typeof value !== "string" || !isSupportedOcrLanguage(value)) {
    return fail("remediation_report_malformed");
  }
  return value;
}

function normalizeRounds(value: unknown): number {
  return value === undefined ? 0 : integer(value, 0, 2);
}

function normalizeSha256(value: unknown): string {
  if (typeof value !== "string" || !SHA256_RE.test(value)) {
    return fail("remediation_report_malformed");
  }
  return value.toLowerCase();
}

function validExpectedScore(value: unknown): value is number | null {
  return (
    value === null ||
    (
      typeof value === "number" &&
      Number.isFinite(value) &&
      value >= 0 &&
      value <= 100
    )
  );
}

function validateExpectation(
  expected: RemediationReportExpectation,
): RemediationReportExpectation & { resultSha256: string } {
  if (
    expected === null ||
    typeof expected !== "object" ||
    typeof expected.jobId !== "string" ||
    expected.jobId.length < 1 ||
    expected.jobId.length > 128 ||
    !Number.isSafeInteger(expected.resultSizeBytes) ||
    expected.resultSizeBytes < 5 ||
    typeof expected.resultSha256 !== "string" ||
    !SHA256_RE.test(expected.resultSha256) ||
    !Number.isSafeInteger(expected.targetScore) ||
    expected.targetScore < 80 ||
    expected.targetScore > 100 ||
    !Number.isSafeInteger(expected.fixPasses) ||
    expected.fixPasses < 1 ||
    expected.fixPasses > 3 ||
    (
      expected.effortProfile !== "standard" &&
      expected.effortProfile !== "thorough"
    ) ||
    !isSupportedOcrLanguage(expected.ocrLanguage) ||
    !Number.isSafeInteger(expected.polishPasses) ||
    expected.polishPasses < 0 ||
    expected.polishPasses > 1 ||
    !Number.isSafeInteger(expected.autoContinueRounds) ||
    expected.autoContinueRounds < 0 ||
    expected.autoContinueRounds > 2 ||
    !Number.isSafeInteger(expected.autoContinueRoundsRun) ||
    expected.autoContinueRoundsRun < 0 ||
    expected.autoContinueRoundsRun > expected.autoContinueRounds ||
    !validExpectedScore(expected.beforeScore) ||
    !validExpectedScore(expected.afterScore)
  ) {
    return fail("invalid_report_expectation");
  }
  const expectedProfileIsValid =
    (
      expected.effortProfile === "standard" &&
      expected.polishPasses === 0 &&
      expected.autoContinueRounds === 0
    ) ||
    (
      expected.effortProfile === "thorough" &&
      expected.polishPasses === 1 &&
      expected.autoContinueRounds === 2
    );
  if (!expectedProfileIsValid) {
    return fail("invalid_report_expectation");
  }
  return {
    ...expected,
    resultSha256: expected.resultSha256.toLowerCase(),
  };
}

/**
 * Converts the private runner report into the only report shape safe to return
 * through MCP. Values not explicitly copied below are intentionally discarded.
 */
export function sanitizeRemediationReport(
  value: unknown,
  expectedValue: RemediationReportExpectation,
): PublicRemediationReport {
  const expected = validateExpectation(expectedValue);
  const report = record(value);

  if (
    report.schema !== 1 ||
    typeof report.jobId !== "string" ||
    report.status !== "succeeded"
  ) {
    return fail("remediation_report_malformed");
  }
  if (report.jobId !== expected.jobId) {
    return fail("remediation_report_job_mismatch");
  }

  const options = record(report.options);
  const targetScore = integer(options.targetScore, 80, 100);
  const fixPasses = integer(options.fixPasses, 1, 3);
  if (options.taggedPdf !== true || options.validateUa !== false) {
    return fail("remediation_report_malformed");
  }
  const polishPasses = integer(options.polishPasses, 0, 1) as 0 | 1;
  const autoContinue = boolean(options.autoContinue);
  const validateUa = false;
  const maxRunMinutes = integer(options.maxRunMinutes, 1, 25);
  const effortProfile = normalizeEffortProfile(options.effortProfile);
  const ocrLanguage = normalizeOcrLanguage(options.ocrLanguage);
  const autoContinueRounds = normalizeRounds(options.autoContinueRounds);
  const standardEffort =
    effortProfile === "standard" &&
    polishPasses === 0 &&
    !autoContinue &&
    autoContinueRounds === 0;
  const thoroughEffort =
    effortProfile === "thorough" &&
    polishPasses === 1 &&
    autoContinue &&
    autoContinueRounds === 2;
  if (!standardEffort && !thoroughEffort) {
    return fail("remediation_report_malformed");
  }
  if (
    targetScore !== expected.targetScore ||
    fixPasses !== expected.fixPasses ||
    effortProfile !== expected.effortProfile ||
    ocrLanguage !== expected.ocrLanguage ||
    polishPasses !== expected.polishPasses ||
    autoContinueRounds !== expected.autoContinueRounds
  ) {
    return fail("remediation_report_job_state_mismatch");
  }

  const summary = record(report.summary);
  const autoContinueRoundsRun = normalizeRounds(
    summary.autoContinueRoundsRun,
  );
  if (autoContinueRoundsRun > autoContinueRounds) {
    return fail("remediation_report_malformed");
  }
  const beforeScore = scoreOrNull(summary.beforeScore);
  const afterScore = scoreOrNull(summary.afterScore);
  const sanitizedDistributionLevel = distributionLevel(
    summary.distributionLevel,
  );
  const sanitizedVerificationState = verificationState(
    summary.verificationState,
  );
  const verificationHtmlBound = requiredTrue(
    summary.verificationHtmlBound,
  );
  if (
    summary.taggedPdfDelivery !== "verified" ||
    summary.activeContentScanVerified !== true ||
    summary.activeContentDetected !== false ||
    summary.taggedPdfExportMode !== "original_layout"
  ) {
    return fail("remediation_report_malformed");
  }
  const remainingAxeViolations = findingCountOrNull(
    summary.remainingAxeViolations,
  );
  const remainingEqualAccessFailures = findingCountOrNull(
    summary.remainingEqualAccessFailures,
  );
  const sanitizedAuditCoverage = auditCoverage(summary.auditCoverage);
  if (
    autoContinueRoundsRun !== expected.autoContinueRoundsRun ||
    beforeScore !== expected.beforeScore ||
    afterScore !== expected.afterScore
  ) {
    return fail("remediation_report_job_state_mismatch");
  }

  const artifact = record(report.artifact);
  if (
    artifact.kind !== "tagged_pdf" ||
    artifact.contentType !== "application/pdf"
  ) {
    return fail("remediation_report_malformed");
  }
  const artifactSize = integer(artifact.size, 5, Number.MAX_SAFE_INTEGER);
  const artifactSha256 = normalizeSha256(artifact.sha256);
  if (
    artifactSize !== expected.resultSizeBytes ||
    artifactSha256 !== expected.resultSha256
  ) {
    return fail("remediation_report_artifact_mismatch");
  }

  const pdfUaValidation = record(report.pdfUaValidation);
  let sanitizedPdfUaValidation: PublicRemediationReport["pdfUaValidation"];
  if (
    pdfUaValidation.status === "compliant" ||
    pdfUaValidation.status === "noncompliant"
  ) {
    if (
      pdfUaValidation.validator !== "veraPDF" ||
      pdfUaValidation.profile !== "ua1"
    ) {
      return fail("remediation_report_malformed");
    }
    const validatorVersion = pdfUaValidation.validatorVersion;
    if (
      validatorVersion !== null &&
      (
        typeof validatorVersion !== "string" ||
        validatorVersion.length > 32
      )
    ) {
      return fail("remediation_report_malformed");
    }
    sanitizedPdfUaValidation = {
      status: pdfUaValidation.status,
      validator: "veraPDF",
      profile: "ua1",
      validatorVersion,
      failedRules: integer(pdfUaValidation.failedRules, 0, 1_000_000),
      failedChecks: integer(pdfUaValidation.failedChecks, 0, 1_000_000),
      passedRules: integer(pdfUaValidation.passedRules, 0, 1_000_000),
      passedChecks: integer(pdfUaValidation.passedChecks, 0, 1_000_000),
    };
  } else if (pdfUaValidation.status === "unavailable") {
    if (
      pdfUaValidation.reason !== "validator_not_available" &&
      pdfUaValidation.reason !== "validator_timeout" &&
      pdfUaValidation.reason !== "validator_error"
    ) {
      return fail("remediation_report_malformed");
    }
    sanitizedPdfUaValidation = {
      status: "unavailable",
      reason: pdfUaValidation.reason,
    };
  } else if (
    pdfUaValidation.status === "not_run" &&
    (
      pdfUaValidation.reason === "disabled_for_institution_pilot" ||
      pdfUaValidation.reason === "independent_validator_not_packaged"
    )
  ) {
    sanitizedPdfUaValidation = {
      status: "not_run",
      reason: pdfUaValidation.reason,
    };
  } else {
    return fail("remediation_report_malformed");
  }

  return {
    schema: 1,
    jobId: report.jobId,
    status: "succeeded",
    options: {
      targetScore,
      fixPasses,
      polishPasses,
      taggedPdf: true,
      autoContinue,
      validateUa,
      maxRunMinutes,
      effortProfile,
      ocrLanguage,
      autoContinueRounds,
    },
    summary: {
      beforeScore,
      afterScore,
      estimatedMinimumScore: scoreOrNull(
        summary.estimatedMinimumScore,
      ),
      integrityCoverage: scoreOrNull(summary.integrityCoverage),
      aiVerificationIncomplete: boolean(
        summary.aiVerificationIncomplete,
      ),
      distributionLevel: sanitizedDistributionLevel,
      activeContentScanVerified: true,
      activeContentDetected: false,
      verificationState: sanitizedVerificationState,
      verificationHtmlBound,
      taggedPdfDelivery: "verified",
      taggedPdfExportMode: "original_layout",
      remainingAxeViolations,
      remainingEqualAccessFailures,
      auditCoverage: sanitizedAuditCoverage,
      autoContinueRoundsRun,
    },
    artifact: {
      kind: "tagged_pdf",
      contentType: "application/pdf",
      size: artifactSize,
      sha256: artifactSha256,
    },
    pdfUaValidation: sanitizedPdfUaValidation,
  };
}
