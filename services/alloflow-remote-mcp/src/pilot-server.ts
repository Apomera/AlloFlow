import { McpServer } from "@modelcontextprotocol/server";
import { env as runtimeEnv } from "cloudflare:workers";
import * as z from "zod/v4";

import {
  installToolSecuritySchemesWireCompatibility,
  pilotToolFailure,
  toolSecurityMeta,
} from "./chatgpt-auth";
import {
  REMOTE_MCP_VERSION,
  getRemoteCapabilities,
} from "./pilot-capabilities";
import {
  isPilotEnabled,
  pilotReadiness,
  type PilotEnv,
  type PilotPrincipal,
  type PilotScope,
} from "./pilot-env";
import {
  cancelRemediation,
  createDocumentUpload,
  deleteRemediation,
  remediationReport,
  remediationResult,
  remediationStatus,
  startRemediation,
} from "./pilot-operations";
import { requirePrincipal } from "./principal";
import { isSupportedOcrLanguage } from "./remediation-options";

const capabilitiesOutputSchema = z.object({
  protocolReady: z.literal(true),
  documentRemediationConfigured: z.boolean(),
  documentToolsEnabled: z.boolean(),
  transport: z.literal("streamable-http"),
  protocolState: z.literal("stateless"),
  serviceStage: z.enum([
    "gateway-contract",
    "institution-pilot-configured",
    "institution-pilot-accepted",
  ]),
  authentication: z.enum([
    "not-configured",
    "cloudflare-access-oauth-configured",
  ]),
  documentIntake: z.enum([
    "not-configured",
    "private-one-time-upload-configured",
  ]),
  jobStorage: z.enum(["not-configured", "d1-r2-workflows-configured"]),
  remediationRunner: z.enum([
    "not-configured",
    "isolated-per-job-container-configured",
  ]),
  implementedTools: z.array(z.string()),
  remediationCoverage: z.object({
    effortProfiles: z.array(
      z.enum(["standard", "thorough"]),
    ).length(2),
    ocrLanguage: z.string(),
    privacySafeReportTool: z.literal(true),
    independentPdfUaValidation: z.literal(false),
  }),
  admissionControl: z.literal(
    "d1-backed-owner-and-institution-quotas",
  ),
  acceptanceGate: z.object({
    requiredVersion: z.string(),
    configuredVersion: z.string().nullable(),
    passed: z.boolean(),
  }),
  localCompanion: z.object({
    available: z.literal(true),
    transport: z.literal("stdio"),
    advertisedTools: z.literal(27),
    note: z.string(),
  }),
  dataHandling: z.string(),
  nextMilestone: z.string(),
  note: z.string(),
});

function env(): PilotEnv {
  return runtimeEnv;
}

function success(value: Record<string, unknown>) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2),
      },
    ],
    structuredContent: value,
  };
}

async function authenticatedToolCall(
  requiredScope: PilotScope,
  callback: (
    currentEnv: PilotEnv,
    principal: PilotPrincipal,
  ) => Promise<Record<string, unknown>>,
) {
  const currentEnv = env();
  try {
    const principal = await requirePrincipal(
      requiredScope,
      currentEnv,
    );
    return success(await callback(currentEnv, principal));
  } catch (error) {
    return pilotToolFailure(error, currentEnv, [requiredScope]);
  }
}

function registerPilotTools(server: McpServer): void {
  server.registerTool(
    "create_document_upload",
    {
      title: "Create a private PDF upload",
      description:
        "Create a short-lived one-time upload page for one PDF. AlloFlow stores only the grant hash, but the full fragment URL is visible to Claude. Redemption also requires the matching institution Access identity; the original filename is not retained.",
      inputSchema: z.object({}),
      _meta: toolSecurityMeta("create_document_upload"),
      annotations: {
        title: "Create a private PDF upload",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async () =>
      authenticatedToolCall(
        "documents:upload",
        async (currentEnv, principal) =>
          createDocumentUpload(currentEnv, principal),
      ),
  );

  server.registerTool(
    "start_remediation",
    {
      title: "Start PDF accessibility remediation",
      description:
        "Start an asynchronous, isolated audit-repair-verify-tag job for a completed upload. Standard effort is the existing bounded pipeline; thorough effort adds one polish pass and at most two auto-continue rounds. Repeating the same options for one upload returns the same job; changed options are rejected.",
      inputSchema: z.object({
        uploadId: z.string().regex(/^upl_[0-9a-f]{32}$/u),
        effort: z.enum(["standard", "thorough"]).default("standard"),
        targetScore: z.number().int().min(80).max(100).optional(),
        fixPasses: z.number().int().min(1).max(3).optional(),
        ocrLanguage: z.string().max(12).refine(
          isSupportedOcrLanguage,
          {
            message:
              "Use a supported lower-case language tag such as en, es, or zh-hant.",
          },
        ).default("").describe(
          "Optional supported ISO 639-1 language tag with one optional BCP 47 subtag.",
        ),
      }),
      _meta: toolSecurityMeta("start_remediation"),
      annotations: {
        title: "Start PDF accessibility remediation",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ uploadId, effort, targetScore, fixPasses, ocrLanguage }) =>
      authenticatedToolCall(
        "documents:remediate",
        async (currentEnv, principal) =>
          startRemediation(currentEnv, principal, {
            uploadId,
            targetScore,
            fixPasses,
            effort,
            ocrLanguage,
          }),
      ),
  );

  server.registerTool(
    "get_remediation_status",
    {
      title: "Get remediation status",
      description:
        "Read the stable public state of an owned remediation job without exposing internal errors or infrastructure details.",
      inputSchema: z.object({
        jobId: z.string().regex(/^job_[0-9a-f]{32}$/u),
      }),
      _meta: toolSecurityMeta("get_remediation_status"),
      annotations: {
        title: "Get remediation status",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ jobId }) =>
      authenticatedToolCall(
        "documents:read",
        async (currentEnv, principal) =>
          remediationStatus(currentEnv, principal, jobId),
      ),
  );

  server.registerTool(
    "get_remediation_report",
    {
      title: "Get a privacy-safe remediation report",
      description:
        "Return an integrity-checked, owner-bound quality summary for a completed job. Unknown and document-derived fields are stripped before the report enters the MCP transcript. Independent PDF/UA validation is reported honestly as not run.",
      inputSchema: z.object({
        jobId: z.string().regex(/^job_[0-9a-f]{32}$/u),
      }),
      _meta: toolSecurityMeta("get_remediation_report"),
      annotations: {
        title: "Get a privacy-safe remediation report",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ jobId }) =>
      authenticatedToolCall(
        "documents:read",
        async (currentEnv, principal) =>
          remediationReport(currentEnv, principal, jobId),
      ),
  );

  server.registerTool(
    "get_remediation_result",
    {
      title: "Get a remediated PDF",
      description:
        "Create a short-lived one-time download page for a completed owned job. The full fragment URL is visible to Claude, and redemption also requires the matching institution Access identity. The result remains private until cleanup eligibility.",
      inputSchema: z.object({
        jobId: z.string().regex(/^job_[0-9a-f]{32}$/u),
      }),
      _meta: toolSecurityMeta("get_remediation_result"),
      annotations: {
        title: "Get a remediated PDF",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ jobId }) =>
      authenticatedToolCall(
        "documents:read",
        async (currentEnv, principal) =>
          remediationResult(currentEnv, principal, jobId),
      ),
  );

  server.registerTool(
    "cancel_remediation",
    {
      title: "Cancel remediation",
      description:
        "Cancel an owned queued or running job, hard-stop its isolated container, and delete its input and partial outputs.",
      inputSchema: z.object({
        jobId: z.string().regex(/^job_[0-9a-f]{32}$/u),
      }),
      _meta: toolSecurityMeta("cancel_remediation"),
      annotations: {
        title: "Cancel remediation",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ jobId }) =>
      authenticatedToolCall(
        "documents:remediate",
        async (currentEnv, principal) =>
          cancelRemediation(currentEnv, principal, jobId),
      ),
  );

  server.registerTool(
    "delete_remediation",
    {
      title: "Delete a remediation job",
      description:
        "Delete an owned job's uploaded document, result, report, and active execution. Minimal pseudonymous metadata is later purged on the pilot retention schedule.",
      inputSchema: z.object({
        jobId: z.string().regex(/^job_[0-9a-f]{32}$/u),
      }),
      _meta: toolSecurityMeta("delete_remediation"),
      annotations: {
        title: "Delete a remediation job",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ jobId }) =>
      authenticatedToolCall(
        "documents:delete",
        async (currentEnv, principal) =>
          deleteRemediation(currentEnv, principal, jobId),
      ),
  );
}

export function createServer(): McpServer {
  const server = new McpServer({
    name: "alloflow-remediation",
    version: REMOTE_MCP_VERSION,
  });
  installToolSecuritySchemesWireCompatibility(server);

  server.registerTool(
    "remediation_capabilities",
    {
      title: "Check AlloFlow remote remediation capabilities",
      description:
        "Report which AlloFlow remote components are configured and whether the manual synthetic acceptance gate enables document tools. This is not an operational-health claim.",
      inputSchema: z.object({}),
      outputSchema: capabilitiesOutputSchema,
      _meta: toolSecurityMeta("remediation_capabilities"),
      annotations: {
        title: "Check AlloFlow remote remediation capabilities",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      const capabilities = getRemoteCapabilities(env());
      return success(capabilities);
    },
  );

  const currentEnv = env();
  if (isPilotEnabled(currentEnv) && pilotReadiness(currentEnv).ready) {
    registerPilotTools(server);
  }
  return server;
}

