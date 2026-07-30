import {
  REQUIRED_PILOT_ACCEPTANCE_VERSION,
  pilotReadiness,
  type PilotEnv,
} from "./pilot-env";

export const REMOTE_MCP_VERSION = "0.3.0";

export const PILOT_TOOL_NAMES = [
  "remediation_capabilities",
  "create_document_upload",
  "start_remediation",
  "get_remediation_status",
  "get_remediation_report",
  "get_remediation_result",
  "cancel_remediation",
  "delete_remediation",
] as const;

export type RemoteCapabilities = {
  protocolReady: true;
  documentRemediationConfigured: boolean;
  documentToolsEnabled: boolean;
  transport: "streamable-http";
  protocolState: "stateless";
  serviceStage:
    | "gateway-contract"
    | "institution-pilot-configured"
    | "institution-pilot-accepted";
  authentication:
    | "not-configured"
    | "cloudflare-access-oauth-configured";
  documentIntake:
    | "not-configured"
    | "private-one-time-upload-configured";
  jobStorage: "not-configured" | "d1-r2-workflows-configured";
  remediationRunner:
    | "not-configured"
    | "isolated-per-job-container-configured";
  acceptanceGate: {
    requiredVersion: string;
    configuredVersion: string | null;
    passed: boolean;
  };
  implementedTools: readonly string[];
  remediationCoverage: {
    effortProfiles: readonly ["standard", "thorough"];
    ocrLanguage: string;
    privacySafeReportTool: true;
    independentPdfUaValidation: false;
  };
  admissionControl:
    "d1-backed-owner-and-institution-quotas";
  localCompanion: {
    available: true;
    transport: "stdio";
    advertisedTools: 27;
    note: string;
  };
  dataHandling: string;
  nextMilestone: string;
  note: string;
};

const REMEDIATION_COVERAGE: RemoteCapabilities["remediationCoverage"] = {
  effortProfiles: ["standard", "thorough"],
  ocrLanguage:
    "Optional supported lower-case language tag such as en, es, or zh-hant.",
  privacySafeReportTool: true,
  independentPdfUaValidation: false,
};
const ADMISSION_CONTROL =
  "d1-backed-owner-and-institution-quotas" as const;

export function getRemoteCapabilities(env: PilotEnv): RemoteCapabilities {
  const readiness = pilotReadiness(env);
  if (readiness.configured) {
    return {
      protocolReady: true,
      documentRemediationConfigured: true,
      documentToolsEnabled: readiness.accepted,
      transport: "streamable-http",
      protocolState: "stateless",
      serviceStage: readiness.accepted
        ? "institution-pilot-accepted"
        : "institution-pilot-configured",
      authentication: "cloudflare-access-oauth-configured",
      documentIntake: "private-one-time-upload-configured",
      jobStorage: "d1-r2-workflows-configured",
      remediationRunner: "isolated-per-job-container-configured",
      implementedTools: readiness.accepted
        ? PILOT_TOOL_NAMES
        : ["remediation_capabilities"],
      remediationCoverage: REMEDIATION_COVERAGE,
      admissionControl: ADMISSION_CONTROL,
      acceptanceGate: {
        requiredVersion: REQUIRED_PILOT_ACCEPTANCE_VERSION,
        configuredVersion: env.PILOT_ACCEPTANCE_VERSION || null,
        passed: readiness.accepted,
      },
      localCompanion: {
        available: true,
        transport: "stdio",
        advertisedTools: 27,
        note: "The local MCPB remains available for on-device workflows.",
      },
      dataHandling:
        "The institution document path is configured but synthetic-only. When manually accepted, PDFs use private object storage and the remediation container sends document-derived content to the institution-approved Gemini project.",
      nextMilestone:
        readiness.accepted
          ? "Synthetic pilot tools are enabled with bounded standard/thorough remediation and privacy-safe reports. Package an independently licensed offline PDF/UA validator before claiming PDF/UA conformance."
          : `Complete synthetic staging acceptance, then set PILOT_ACCEPTANCE_VERSION=${REQUIRED_PILOT_ACCEPTANCE_VERSION}. This does not authorize real documents.`,
      note:
        "Configured means required bindings and values passed local validation; it is not an operational-health claim. MCP transport remains stateless while application state is durable.",
    };
  }

  return {
    protocolReady: true,
    documentRemediationConfigured: false,
    documentToolsEnabled: false,
    transport: "streamable-http",
    protocolState: "stateless",
    serviceStage: "gateway-contract",
    authentication: "not-configured",
    documentIntake: "not-configured",
    acceptanceGate: {
      requiredVersion: REQUIRED_PILOT_ACCEPTANCE_VERSION,
      configuredVersion: env.PILOT_ACCEPTANCE_VERSION || null,
      passed: false,
    },
    jobStorage: "not-configured",
    remediationRunner: "not-configured",
    implementedTools: ["remediation_capabilities"],
    remediationCoverage: REMEDIATION_COVERAGE,
    admissionControl: ADMISSION_CONTROL,
    localCompanion: {
      available: true,
      transport: "stdio",
      advertisedTools: 27,
      note: "The local MCPB remains the working full-pipeline connector for Claude Desktop.",
    },
    dataHandling:
      "This deployment accepts and retains no documents until the complete institution pilot configuration is enabled.",
    nextMilestone:
      "Provision the institution-owned OAuth, KV, D1, private R2, Workflow, Container, and model secrets; then enable PILOT_ENABLED.",
    note: readiness.enabled
      ? "The institution pilot is intentionally fail-closed because one or more required bindings or secrets are absent."
      : "The pilot implementation is present but intentionally disabled.",
  };
}

