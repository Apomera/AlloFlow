import {
  Container,
  type OutboundHandlerContext,
} from "@cloudflare/containers";

import { getInternalJob } from "./job-store";
import {
  getPilotConfig,
  type PilotEnv,
} from "./pilot-env";
import {
  PilotError,
  isOpaqueId,
  jsonError,
  noStoreHeaders,
} from "./security";

type JobOutboundParams = {
  jobId: string;
};

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

async function storageOutbound(
  request: Request,
  env: PilotEnv,
  context: OutboundHandlerContext<JobOutboundParams>,
): Promise<Response> {
  try {
    const jobId = context.params.jobId;
    if (!isOpaqueId(jobId, "job") || !env.DOCUMENTS) {
      throw new PilotError("runner_storage_denied", 403);
    }
    const job = await getInternalJob(env, jobId);
    if (job.status !== "running") {
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
      if (current.status !== "running") {
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
      if (current.status !== "running") {
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
    const model = env.GEMINI_MODEL;
    if (
      !isOpaqueId(jobId, "job") ||
      !env.GEMINI_API_KEY ||
      !model ||
      !/^[A-Za-z0-9._-]{2,100}$/u.test(model)
    ) {
      throw new PilotError("model_not_configured", 503);
    }
    const job = await getInternalJob(env, jobId);
    if (job.status !== "running") {
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
    "cdn.jsdelivr.net",
    "cdnjs.cloudflare.com",
    "unpkg.com",
  ];

  static override outboundHandlers = {
    jobStorage: storageOutbound,
    gemini: geminiOutbound,
  };

  async configureJob(jobId: string, runnerToken: string): Promise<void> {
    if (
      !isOpaqueId(jobId, "job") ||
      !/^[A-Za-z0-9_-]{43}$/u.test(runnerToken)
    ) {
      throw new PilotError("invalid_runner_configuration", 400);
    }
    const job = await getInternalJob(this.env, jobId);
    if (job.status !== "running") {
      throw new PilotError("job_not_runnable", 409);
    }
    const config = getPilotConfig(this.env);
    this.envVars = {
      ALLOFLOW_RUNNER_TOKEN: runnerToken,
      ALLOFLOW_MCP_NO_KEY_FILES: "1",
      ALLOFLOW_MCP_GEMINI_BASE:
        "http://gemini.internal/v1beta/models",
      ALLOFLOW_MCP_GEMINI_MODEL: this.env.GEMINI_MODEL || "",
      ALLOFLOW_MCP_GEMINI_FALLBACK_MODEL: this.env.GEMINI_MODEL || "",
      ALLOFLOW_MCP_MAX_RUN_MINUTES: String(
        config.remediationMaxRunMinutes,
      ),
      ALLOFLOW_MCP_GEMINI_KEY: "alloflow-container-placeholder",
      GEMINI_API_KEY: "alloflow-container-placeholder",
      NODE_ENV: "production",
    };
    this.enableInternet = false;
    await this.setOutboundByHosts({
      "r2.internal": {
        method: "jobStorage",
        params: { jobId },
      },
      "gemini.internal": {
        method: "gemini",
        params: { jobId },
      },
    });
  }
}

