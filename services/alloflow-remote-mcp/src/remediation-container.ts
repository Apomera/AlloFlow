import {
  Container,
  type OutboundHandlerContext,
} from "@cloudflare/containers";

import {
  clearJobCheckpoint,
  commitJobCheckpoint,
  getInternalJob,
  getJobCheckpoint,
  jobCheckpointKey,
  type JobCheckpoint,
  type JobCheckpointCommit,
  type JobRow,
} from "./job-store";
import { checkpointObjectMatches } from "./checkpoint-artifact";
import {
  getPilotConfig,
  type PilotEnv,
} from "./pilot-env";
import {
  PilotError,
  isOpaqueId,
  jsonError,
  noStoreHeaders,
  sha256Base64Url,
} from "./security";

type JobOutboundParams = {
  jobId: string;
  attemptId: string;
};

const MAX_CHECKPOINT_BYTES = 32 * 1024 * 1024;
const SHA256_HEX_RE = /^[0-9a-f]{64}$/u;
const CHECKPOINT_STAGES = new Set(["extraction", "primary", "round"]);

function runnerEnvironment(
  env: PilotEnv,
  runnerToken: string,
): Record<string, string> {
  const config = getPilotConfig(env);
  return {
    ALLOFLOW_RUNNER_TOKEN: runnerToken,
    ALLOFLOW_MCP_NO_KEY_FILES: "1",
    ALLOFLOW_MCP_OFFLINE_ASSETS: "1",
    ALLOFLOW_MCP_GEMINI_BASE:
      "http://gemini.internal/v1beta/models",
    ALLOFLOW_MCP_GEMINI_MODEL: env.GEMINI_MODEL || "",
    ALLOFLOW_MCP_GEMINI_FALLBACK_MODEL: env.GEMINI_MODEL || "",
    ALLOFLOW_MCP_MAX_RUN_MINUTES: String(
      config.remediationMaxRunMinutes,
    ),
    ALLOFLOW_MCP_GEMINI_KEY: "alloflow-container-placeholder",
    GEMINI_API_KEY: "alloflow-container-placeholder",
    NODE_ENV: "production",
  };
}

function contentLength(request: Request, maximum: number): number {
  const value = request.headers.get("Content-Length");
  if (!value || !/^[0-9]+$/u.test(value)) {
    throw new PilotError("content_length_required", 411);
  }
  const size = Number(value);
  if (!Number.isSafeInteger(size) || size < 1 || size > maximum) {
    throw new PilotError("payload_size_not_allowed", 413);
  }
  return size;
}

function checksumHex(value: ArrayBuffer | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  return Array.from(new Uint8Array(value), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function checkpointNotFound(): Response {
  return new Response(null, {
    status: 404,
    headers: noStoreHeaders(),
  });
}

function checkpointHeader(
  request: Request,
  name: string,
  maximumLength: number,
): string {
  const value = request.headers.get(name);
  if (
    !value ||
    value.length > maximumLength ||
    value !== value.trim() ||
    value.includes(",")
  ) {
    throw new PilotError("runner_checkpoint_invalid", 400);
  }
  return value;
}

function checkpointCommitFromRequest(
  request: Request,
  job: JobRow,
): JobCheckpointCommit {
  const sequenceText = checkpointHeader(
    request,
    "X-AlloFlow-Checkpoint-Sequence",
    12,
  );
  if (!/^[1-9][0-9]{0,6}$/u.test(sequenceText)) {
    throw new PilotError("runner_checkpoint_invalid", 400);
  }
  const seq = Number(sequenceText);
  if (!Number.isSafeInteger(seq) || seq > 1_000_000) {
    throw new PilotError("runner_checkpoint_invalid", 400);
  }
  const sha256 = checkpointHeader(
    request,
    "X-AlloFlow-SHA256",
    64,
  ).toLowerCase();
  const inputSha256 = checkpointHeader(
    request,
    "X-AlloFlow-Input-SHA256",
    64,
  ).toLowerCase();
  const optionsSha256 = checkpointHeader(
    request,
    "X-AlloFlow-Options-SHA256",
    64,
  ).toLowerCase();
  const engineSha256 = checkpointHeader(
    request,
    "X-AlloFlow-Engine-SHA256",
    64,
  ).toLowerCase();
  if (
    !SHA256_HEX_RE.test(sha256) ||
    !SHA256_HEX_RE.test(inputSha256) ||
    !SHA256_HEX_RE.test(optionsSha256) ||
    !SHA256_HEX_RE.test(engineSha256)
  ) {
    throw new PilotError("runner_checkpoint_invalid", 400);
  }
  const stage = checkpointHeader(
    request,
    "X-AlloFlow-Checkpoint-Stage",
    64,
  );
  const schema = checkpointHeader(
    request,
    "X-AlloFlow-Checkpoint-Schema",
    128,
  );
  if (!CHECKPOINT_STAGES.has(stage) || schema !== "1") {
    throw new PilotError("runner_checkpoint_invalid", 400);
  }
  return {
    seq,
    key: jobCheckpointKey(job, seq, sha256),
    sha256,
    sizeBytes: contentLength(request, MAX_CHECKPOINT_BYTES),
    stage,
    schema,
    inputSha256,
    optionsSha256,
    engineSha256,
  };
}

function checkpointResponseHeaders(checkpoint: JobCheckpoint): Headers {
  return noStoreHeaders({
    "Content-Type": "application/gzip",
    "Content-Length": String(checkpoint.sizeBytes),
    "X-AlloFlow-SHA256": checkpoint.sha256,
    "X-AlloFlow-Checkpoint-Sequence": String(checkpoint.seq),
    "X-AlloFlow-Checkpoint-Stage": checkpoint.stage,
    "X-AlloFlow-Checkpoint-Schema": checkpoint.schema,
    "X-AlloFlow-Input-SHA256": checkpoint.inputSha256,
    "X-AlloFlow-Options-SHA256": checkpoint.optionsSha256,
    "X-AlloFlow-Engine-SHA256": checkpoint.engineSha256,
  });
}

async function storageOutbound(
  request: Request,
  env: PilotEnv,
  context: OutboundHandlerContext<JobOutboundParams>,
): Promise<Response> {
  try {
    const jobId = context.params.jobId;
    const attemptId = context.params.attemptId;
    if (
      !isOpaqueId(jobId, "job") ||
      !attemptId ||
      attemptId.length > 255 ||
      !env.DOCUMENTS
    ) {
      throw new PilotError("runner_storage_denied", 403);
    }
    const job = await getInternalJob(env, jobId);
    if (
      job.status !== "running" ||
      job.attempt_id !== attemptId
    ) {
      throw new PilotError("runner_storage_denied", 403);
    }
    const url = new URL(request.url);

    if (
      request.method === "GET" &&
      url.pathname === "/input" &&
      !url.search
    ) {
      if (!job.input_key) {
        throw new PilotError("runner_input_missing", 404);
      }
      const object = await env.DOCUMENTS.get(job.input_key);
      if (!object) {
        throw new PilotError("runner_input_missing", 404);
      }
      return new Response(object.body, {
        headers: noStoreHeaders({
          "Content-Type": "application/pdf",
          "Content-Length": String(object.size),
        }),
      });
    }

    if (
      request.method === "GET" &&
      url.pathname === "/checkpoint" &&
      !url.search
    ) {
      const checkpoint = await getJobCheckpoint(env, jobId);
      if (!checkpoint) {
        return checkpointNotFound();
      }
      const object = await env.DOCUMENTS.get(checkpoint.key);
      if (
        !object ||
        !checkpointObjectMatches(jobId, checkpoint, object)
      ) {
        const cleared = await clearJobCheckpoint(
          env,
          jobId,
          attemptId,
          checkpoint,
        );
        if (!cleared) {
          // The same attempt may have advanced the pointer after this GET
          // observed it. Never turn that race into a false empty checkpoint;
          // make the caller retry and load the newer pointer.
          if (await getJobCheckpoint(env, jobId)) {
            throw new PilotError("job_checkpoint_conflict", 409);
          }
          return checkpointNotFound();
        }
        await env.DOCUMENTS.delete(cleared.key);
        console.warn(
          JSON.stringify({ event: "job_checkpoint_self_healed", jobId }),
        );
        return checkpointNotFound();
      }
      const current = await getInternalJob(env, jobId);
      if (
        current.status !== "running" ||
        current.attempt_id !== attemptId ||
        current.checkpoint_seq !== checkpoint.seq ||
        current.checkpoint_key !== checkpoint.key
      ) {
        throw new PilotError("runner_storage_denied", 403);
      }
      return new Response(object.body, {
        headers: checkpointResponseHeaders(checkpoint),
      });
    }

    if (
      request.method === "PUT" &&
      url.pathname === "/checkpoint" &&
      !url.search
    ) {
      if (
        request.headers.get("Content-Type") !== "application/gzip" ||
        request.headers.get("Content-Encoding") ||
        request.headers.get("X-AlloFlow-Job-Id") !== jobId ||
        !request.body
      ) {
        throw new PilotError("runner_checkpoint_invalid", 400);
      }
      const checkpoint = checkpointCommitFromRequest(request, job);
      let object = await env.DOCUMENTS.put(
        checkpoint.key,
        request.body,
        {
          onlyIf: { etagDoesNotMatch: "*" },
          httpMetadata: {
            contentType: "application/gzip",
            cacheControl: "no-store",
          },
          sha256: checkpoint.sha256,
          customMetadata: {
            artifact: "checkpoint",
            jobId,
            sequence: String(checkpoint.seq),
            stage: checkpoint.stage,
            schema: checkpoint.schema,
            inputSha256: checkpoint.inputSha256,
            optionsSha256: checkpoint.optionsSha256,
            engineSha256: checkpoint.engineSha256,
          },
        },
      );
      if (!object) {
        object = await env.DOCUMENTS.head(checkpoint.key);
      }
      const candidate: JobCheckpoint = {
        ...checkpoint,
        createdAt: 1,
      };
      if (
        !object ||
        !checkpointObjectMatches(jobId, candidate, object)
      ) {
        const current = await getInternalJob(env, jobId);
        if (
          current.status === "running" &&
          current.attempt_id === attemptId
        ) {
          await env.DOCUMENTS.delete(checkpoint.key);
        }
        throw new PilotError("runner_checkpoint_invalid", 400);
      }
      const committed = await commitJobCheckpoint(
        env,
        jobId,
        attemptId,
        checkpoint,
      );
      if (
        committed.supersededCheckpoint &&
        committed.supersededCheckpoint.key !== committed.checkpoint.key
      ) {
        await env.DOCUMENTS.delete(
          committed.supersededCheckpoint.key,
        );
      }
      return Response.json(
        { ok: true, sequence: committed.checkpoint.seq },
        { status: 201, headers: noStoreHeaders() },
      );
    }

    if (
      request.method === "PUT" &&
      url.pathname === "/output/tagged.pdf" &&
      !url.search
    ) {
      if (
        !job.result_key ||
        request.headers.get("Content-Type") !== "application/pdf" ||
        !request.body
      ) {
        throw new PilotError("runner_output_invalid", 400);
      }
      const requestJobId = request.headers.get("X-AlloFlow-Job-Id");
      const sha256 = request.headers.get("X-AlloFlow-SHA256");
      if (
        requestJobId !== jobId ||
        !sha256 ||
        !/^[A-Fa-f0-9]{64}$/u.test(sha256)
      ) {
        throw new PilotError("runner_output_invalid", 400);
      }
      const size = contentLength(request, 64 * 1024 * 1024);
      const declaredSha256 = sha256.toLowerCase();
      const stored = await env.DOCUMENTS.put(job.result_key, request.body, {
        httpMetadata: {
          contentType: "application/pdf",
          cacheControl: "no-store",
        },
        sha256: declaredSha256,
        customMetadata: {
          jobId,
          attemptId,
          artifact: "tagged_pdf",
        },
      });
      if (
        stored.size !== size ||
        checksumHex(stored.checksums.sha256) !== declaredSha256
      ) {
        await env.DOCUMENTS.delete(job.result_key);
        throw new PilotError("runner_output_invalid", 400);
      }
      const current = await getInternalJob(env, jobId);
      if (
        current.status !== "running" ||
        current.attempt_id !== attemptId
      ) {
        await env.DOCUMENTS.delete(job.result_key);
        throw new PilotError("runner_storage_denied", 403);
      }
      return Response.json(
        { ok: true, size },
        { status: 201, headers: noStoreHeaders() },
      );
    }

    if (
      request.method === "PUT" &&
      url.pathname === "/output/report.json" &&
      !url.search
    ) {
      if (
        !job.report_key ||
        request.headers.get("Content-Type") !== "application/json" ||
        !request.body
      ) {
        throw new PilotError("runner_output_invalid", 400);
      }
      const requestJobId = request.headers.get("X-AlloFlow-Job-Id");
      const sha256 = request.headers.get("X-AlloFlow-SHA256");
      if (
        requestJobId !== jobId ||
        !sha256 ||
        !/^[A-Fa-f0-9]{64}$/u.test(sha256)
      ) {
        throw new PilotError("runner_output_invalid", 400);
      }
      const size = contentLength(request, 2 * 1024 * 1024);
      const declaredSha256 = sha256.toLowerCase();
      const stored = await env.DOCUMENTS.put(job.report_key, request.body, {
        httpMetadata: {
          contentType: "application/json",
          cacheControl: "no-store",
        },
        sha256: declaredSha256,
        customMetadata: {
          jobId,
          attemptId,
          artifact: "report",
        },
      });
      if (
        stored.size !== size ||
        checksumHex(stored.checksums.sha256) !== declaredSha256
      ) {
        await env.DOCUMENTS.delete(job.report_key);
        throw new PilotError("runner_output_invalid", 400);
      }
      const current = await getInternalJob(env, jobId);
      if (
        current.status !== "running" ||
        current.attempt_id !== attemptId
      ) {
        await env.DOCUMENTS.delete(job.report_key);
        throw new PilotError("runner_storage_denied", 403);
      }
      return Response.json(
        { ok: true, size },
        { status: 201, headers: noStoreHeaders() },
      );
    }

    throw new PilotError("runner_storage_denied", 403);
  } catch (error) {
    return jsonError(error);
  }
}

async function geminiOutbound(
  request: Request,
  env: PilotEnv,
  context: OutboundHandlerContext<JobOutboundParams>,
): Promise<Response> {
  try {
    const jobId = context.params.jobId;
    const attemptId = context.params.attemptId;
    const model = env.GEMINI_MODEL;
    if (
      !isOpaqueId(jobId, "job") ||
      !attemptId ||
      attemptId.length > 255 ||
      !env.GEMINI_API_KEY ||
      !model ||
      !/^[A-Za-z0-9._-]{2,100}$/u.test(model)
    ) {
      throw new PilotError("model_not_configured", 503);
    }
    const job = await getInternalJob(env, jobId);
    if (
      job.status !== "running" ||
      job.attempt_id !== attemptId
    ) {
      throw new PilotError("model_request_denied", 403);
    }
    const incoming = new URL(request.url);
    const expectedPath = `/v1beta/models/${model}:generateContent`;
    if (
      request.method !== "POST" ||
      incoming.pathname !== expectedPath ||
      request.headers.get("Content-Type")?.split(";", 1)[0] !==
        "application/json" ||
      !request.body
    ) {
      throw new PilotError("model_request_denied", 403);
    }
    contentLength(request, 20 * 1024 * 1024);

    const upstream = await fetch(
      `https://generativelanguage.googleapis.com${expectedPath}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY,
        },
        body: request.body,
        redirect: "error",
      },
    );
    const headers = noStoreHeaders({
      "Content-Type":
        upstream.headers.get("Content-Type") || "application/json",
    });
    const upstreamLength = upstream.headers.get("Content-Length");
    if (upstreamLength) {
      headers.set("Content-Length", upstreamLength);
    }
    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export class RemediationContainer extends Container<PilotDeploymentEnv> {
  defaultPort = 8080;
  requiredPorts = [8080];
  sleepAfter = "2m";
  enableInternet = false;
  allowedHosts = [
    "r2.internal",
    "gemini.internal",
  ];

  static override outboundHandlers = {
    jobStorage: storageOutbound,
    gemini: geminiOutbound,
  };

  async configureJob(
    jobId: string,
    attemptId: string,
    runnerToken: string,
  ): Promise<void> {
    if (
      !isOpaqueId(jobId, "job") ||
      !attemptId ||
      attemptId.length > 255 ||
      !/^[A-Za-z0-9_-]{43}$/u.test(runnerToken)
    ) {
      throw new PilotError("invalid_runner_configuration", 400);
    }
    const job = await getInternalJob(this.env, jobId);
    if (
      job.status !== "running" ||
      job.attempt_id !== attemptId
    ) {
      throw new PilotError("job_not_runnable", 409);
    }
    this.envVars = runnerEnvironment(this.env, runnerToken);
    this.enableInternet = false;
    await this.setOutboundByHosts({
      "r2.internal": {
        method: "jobStorage",
        params: { jobId, attemptId },
      },
      "gemini.internal": {
        method: "gemini",
        params: { jobId, attemptId },
      },
    });
  }

  async probeRunnerHealth(): Promise<unknown> {
    if (
      !this.env.RUNNER_AUTH_SECRET ||
      this.env.RUNNER_AUTH_SECRET.length < 32
    ) {
      throw new PilotError("runner_not_configured", 503);
    }
    const probeToken = await sha256Base64Url(
      `alloflow-release-canary:${this.env.RUNNER_AUTH_SECRET}`,
    );
    this.envVars = runnerEnvironment(this.env, probeToken);
    this.enableInternet = false;
    // The reserved readiness container never needs storage or provider
    // egress. Clear any runtime overrides before starting it.
    await this.setOutboundByHosts({});
    await this.setAllowedHosts([]);
    const response = await this.containerFetch(
      new Request("http://container.internal/healthz", {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(60_000),
      }),
    );
    const body = await response.text();
    if (!response.ok || body.length > 64 * 1024) {
      throw new PilotError("runner_not_ready", 503);
    }
    try {
      return JSON.parse(body) as unknown;
    } catch {
      throw new PilotError("runner_health_invalid", 503);
    }
  }
}
