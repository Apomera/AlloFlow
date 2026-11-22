import { createHash, randomBytes } from "node:crypto";
import { createReadStream, ReadStream } from "node:fs";
import * as fsp from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { gzipSync } from "node:zlib";
import { afterEach, describe, expect, it } from "vitest";

interface RunnerErrorInstance extends Error {
  code: string;
  status: number;
  retryable: boolean;
}

interface RunnerErrorCtor {
  new (
    code: string,
    status: number,
    retryable?: boolean,
    metadata?: Record<string, unknown>,
  ): RunnerErrorInstance;
}

interface WrittenCheckpointTempFile {
  tempPath: string;
  compressedBytes: number;
  uncompressedBytes: number;
  sha256: string;
}

interface ReadCheckpointStreamResult {
  parsed: unknown;
  compressedBytes: number;
  uncompressedBytes: number;
  compressedSha256: string;
}

interface PdfWriteMetadata {
  size: number;
  sha256: string;
}

interface RunnerServerModule {
  CHECKPOINT_SCHEMA: number;
  MAX_CHECKPOINT_COMPRESSED_BYTES: number;
  MAX_CHECKPOINT_JSON_BYTES: number;
  BASE64_DECODE_CHUNK_CHARS: number;
  RunnerError: RunnerErrorCtor;
  writeGzipCheckpointTempFile: (
    envelope: unknown,
    options?: {
      tempDir?: string;
      filePrefix?: string;
      maxUncompressedBytes?: number;
      maxCompressedBytes?: number;
      level?: number;
      signal?: AbortSignal;
      chunkChars?: number;
    },
  ) => Promise<WrittenCheckpointTempFile>;
  readGzipCheckpointStream: (
    readable: AsyncIterable<Uint8Array | Buffer> | ReadableStream<Uint8Array> | null,
    options?: {
      maxCompressedBytes?: number;
      maxUncompressedBytes?: number;
      expectedCompressedBytes?: number | null;
      expectedSha256?: string | null;
      signal?: AbortSignal;
    },
  ) => Promise<ReadCheckpointStreamResult>;
  writeBase64PdfAtomic: (
    destination: string,
    b64: string,
    maxBytes: number,
    options?: { chunkChars?: number },
  ) => Promise<PdfWriteMetadata>;
  stagePdfFileAtomic: (
    sourcePath: string,
    destination: string,
    maxBytes: number,
  ) => Promise<PdfWriteMetadata>;
  putCheckpoint: (
    fetchImpl: (url: string, init?: Record<string, unknown>) => Promise<Response>,
    url: string,
    jobId: string,
    snapshot: Record<string, unknown>,
    compatibility: {
      inputSha256: string;
      optionsSha256: string;
      engineSha256: string;
    },
    sequence: number,
    signal: AbortSignal,
    options?: {
      tempDir?: string;
      streamBody?: boolean;
      maxUncompressedBytes?: number;
      maxCompressedBytes?: number;
    },
  ) => Promise<{
    saved: boolean;
    sequence: number;
    size: number;
    jsonSize: number;
    stage: string;
    sha256: string;
  }>;
  loadCheckpoint: (
    fetchImpl: (url: string, init?: Record<string, unknown>) => Promise<Response>,
    url: string,
    expected: {
      inputSha256: string;
      optionsSha256: string;
      engineSha256: string;
    },
    signal: AbortSignal,
  ) => Promise<{
    baseSequence: number;
    resumeCheckpoint: Record<string, unknown> | null;
    telemetry?: {
      stage: string;
      sequence: number;
      compressedBytes: number;
      uncompressedBytes: number;
    };
  }>;
  createRunnerServer: (options: Record<string, unknown>) => {
    server: import("node:http").Server;
    shutdown: () => Promise<void>;
  };
}

const require = createRequire(import.meta.url);
const runner = require("../runner/server.cjs") as RunnerServerModule;

const tempDirs: string[] = [];

async function makeTempDir(prefix = "alloflow-stream-mem-"): Promise<string> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function sha256Hex(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function sampleSnapshot(accessibleHtml: string, overrides: Record<string, unknown> = {}) {
  return {
    schema: runner.CHECKPOINT_SCHEMA,
    stage: "primary",
    audit: {
      score: 94,
      documentLanguage: "en",
      requestedAuditors: 3,
      auditorCount: 3,
      sliced: false,
    },
    remediation: {
      accessibleHtml,
    },
    nextRound: 0,
    roundsRun: 0,
    roundLog: [],
    loopState: {
      lastViolations: 0,
      lastDet: 94,
      lastIssues: 0,
      stagnant: 0,
    },
    autoContinueDone: false,
    ...overrides,
  };
}

const COMPATIBILITY = {
  inputSha256: "1".repeat(64),
  optionsSha256: "2".repeat(64),
  engineSha256: "3".repeat(64),
};

async function collectAsyncBody(body: unknown): Promise<Buffer> {
  if (Buffer.isBuffer(body)) return Buffer.from(body);
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function expectRunnerError(
  promise: Promise<unknown>,
  expectedCode: string,
  expectedStatus?: number,
): Promise<RunnerErrorInstance> {
  try {
    await promise;
    throw new Error(`Expected RunnerError(${expectedCode}) but promise resolved`);
  } catch (error) {
    expect(error).toBeInstanceOf(runner.RunnerError);
    const runnerErr = error as RunnerErrorInstance;
    expect(runnerErr.code).toBe(expectedCode);
    if (expectedStatus !== undefined) {
      expect(runnerErr.status).toBe(expectedStatus);
    }
    return runnerErr;
  }
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await fsp.rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }
});

describe("streaming gzip checkpoint write and restore", () => {
  it("streams gzip to a temp file with exact SHA-256 and round-trips through streaming gunzip (including surrogate pairs on chunk boundaries)", async () => {
    const dir = await makeTempDir();
    // Place astral-plane emoji (UTF-16 surrogate pairs) across a tiny 16-char boundary.
    const htmlWithEmoji = `<main>${"A".repeat(15)}😀🎓📘${"B".repeat(40)}🚀✨</main>`;
    const envelope = {
      schema: runner.CHECKPOINT_SCHEMA,
      sequence: 3,
      stage: "primary",
      ...COMPATIBILITY,
      snapshot: sampleSnapshot(htmlWithEmoji),
    };
    const expectedJsonBytes = Buffer.byteLength(JSON.stringify(envelope), "utf8");

    const written = await runner.writeGzipCheckpointTempFile(envelope, {
      tempDir: dir,
      chunkChars: 16,
    });

    try {
      const diskBytes = await fsp.readFile(written.tempPath);
      expect(written.compressedBytes).toBe(diskBytes.length);
      expect(written.uncompressedBytes).toBe(expectedJsonBytes);
      expect(written.sha256).toBe(sha256Hex(diskBytes));

      const restored = await runner.readGzipCheckpointStream(
        createReadStream(written.tempPath),
        {
          expectedCompressedBytes: written.compressedBytes,
          expectedSha256: written.sha256,
        },
      );
      expect(restored.compressedBytes).toBe(written.compressedBytes);
      expect(restored.uncompressedBytes).toBe(expectedJsonBytes);
      expect(restored.compressedSha256).toBe(written.sha256);
      expect(restored.parsed).toEqual(envelope);
    } finally {
      await fsp.rm(written.tempPath, { force: true });
    }
  });

  it("streams putCheckpoint body via fs.ReadStream, preserves exact headers/checksums, and cleans up temp files on success and failure", async () => {
    const dir = await makeTempDir();
    const snap = sampleSnapshot(`<main>${"section ".repeat(2000)}</main>`);

    let observedIsReadStream = false;
    let observedDuplex: unknown = null;
    let observedHeaders: Record<string, string> = {};
    let uploadedBytes: Buffer = Buffer.alloc(0);

    const saved = await runner.putCheckpoint(
      async (_url, init = {}) => {
        observedIsReadStream = init.body instanceof ReadStream;
        observedDuplex = init.duplex;
        observedHeaders = (init.headers || {}) as Record<string, string>;
        uploadedBytes = await collectAsyncBody(init.body);
        return new Response(null, { status: 201 });
      },
      "http://r2.internal/checkpoint",
      "job-stream-put-1",
      snap,
      COMPATIBILITY,
      4,
      new AbortController().signal,
      { tempDir: dir, streamBody: true },
    );

    expect(observedIsReadStream).toBe(true);
    expect(observedDuplex).toBe("half");
    expect(observedHeaders["Content-Type"]).toBe("application/gzip");
    expect(observedHeaders["Content-Length"]).toBe(String(uploadedBytes.length));
    expect(observedHeaders["X-AlloFlow-SHA256"]).toBe(sha256Hex(uploadedBytes));
    expect(observedHeaders["X-AlloFlow-Checkpoint-Schema"]).toBe("1");
    expect(observedHeaders["X-AlloFlow-Checkpoint-Sequence"]).toBe("4");
    expect(observedHeaders["X-AlloFlow-Checkpoint-Stage"]).toBe("primary");
    expect(saved.size).toBe(uploadedBytes.length);
    expect(saved.sha256).toBe(sha256Hex(uploadedBytes));
    expect(await fsp.readdir(dir)).toEqual([]);

    // Now round-trip those streamed bytes back through loadCheckpoint.
    const loaded = await runner.loadCheckpoint(
      async () =>
        new Response(new Uint8Array(uploadedBytes), {
          status: 200,
          headers: {
            "Content-Type": "application/gzip",
            "Content-Length": String(uploadedBytes.length),
            "X-AlloFlow-SHA256": saved.sha256,
            "X-AlloFlow-Checkpoint-Schema": "1",
            "X-AlloFlow-Checkpoint-Sequence": "4",
            "X-AlloFlow-Checkpoint-Stage": "primary",
            "X-AlloFlow-Input-SHA256": COMPATIBILITY.inputSha256,
            "X-AlloFlow-Options-SHA256": COMPATIBILITY.optionsSha256,
            "X-AlloFlow-Engine-SHA256": COMPATIBILITY.engineSha256,
          },
        }),
      "http://r2.internal/checkpoint",
      COMPATIBILITY,
      new AbortController().signal,
    );
    expect(loaded.baseSequence).toBe(4);
    expect(loaded.resumeCheckpoint).toEqual(snap);
    expect(loaded.telemetry).toEqual({
      stage: "primary",
      sequence: 4,
      compressedBytes: saved.size,
      uncompressedBytes: saved.jsonSize,
    });

    // Verify temp file cleanup when storage rejects upload (503).
    await expectRunnerError(
      runner.putCheckpoint(
        async (_url, init = {}) => {
          // Consume only nothing / fail immediately while stream is open.
          expect(init.body instanceof ReadStream).toBe(true);
          return new Response(null, { status: 503 });
        },
        "http://r2.internal/checkpoint",
        "job-stream-put-fail",
        snap,
        COMPATIBILITY,
        5,
        new AbortController().signal,
        { tempDir: dir, streamBody: true },
      ),
      "checkpoint_upload_failed",
      502,
    );
    expect(await fsp.readdir(dir)).toEqual([]);
  });

  it("rejects oversized uncompressed (ASCII and multi-byte UTF-8) and oversized compressed writes while cleaning up temp files", async () => {
    const dir = await makeTempDir();

    // 1. ASCII uncompressed overflow (caught immediately before writing)
    await expectRunnerError(
      runner.writeGzipCheckpointTempFile(
        { payload: "x".repeat(4096) },
        { tempDir: dir, maxUncompressedBytes: 1024, maxCompressedBytes: 4096 },
      ),
      "checkpoint_snapshot_too_large",
      500,
    );
    expect(await fsp.readdir(dir)).toEqual([]);

    // 2. Multi-byte UTF-8 uncompressed overflow (passes string.length <= limit, fails UTF-8 byte count during streaming)
    const multibytePayload = { payload: "中".repeat(400) }; // ~415 chars, >1200 UTF-8 bytes
    await expectRunnerError(
      runner.writeGzipCheckpointTempFile(multibytePayload, {
        tempDir: dir,
        maxUncompressedBytes: 800,
        maxCompressedBytes: 4096,
        chunkChars: 64,
      }),
      "checkpoint_snapshot_too_large",
      500,
    );
    expect(await fsp.readdir(dir)).toEqual([]);

    // 3. Incompressible payload exceeding maxCompressedBytes while under maxUncompressedBytes
    const incompressible = {
      payload: randomBytes(12 * 1024).toString("base64"),
    };
    await expectRunnerError(
      runner.writeGzipCheckpointTempFile(incompressible, {
        tempDir: dir,
        maxUncompressedBytes: 64 * 1024,
        maxCompressedBytes: 4 * 1024,
      }),
      "checkpoint_snapshot_too_large",
      500,
    );
    expect(await fsp.readdir(dir)).toEqual([]);
  });

  it("enforces bounded compressed and uncompressed limits and checksum verification during streaming gunzip restore", async () => {
    // 1. Gzip bomb: tiny compressed bytes, huge uncompressed JSON (> maxUncompressedBytes)
    const bigJson = JSON.stringify({ pad: "a".repeat(256 * 1024) });
    const compressedBomb = gzipSync(Buffer.from(bigJson, "utf8"));
    expect(compressedBomb.length).toBeLessThan(2048);

    await expectRunnerError(
      runner.readGzipCheckpointStream(Readable.from([compressedBomb]), {
        maxCompressedBytes: 16 * 1024,
        maxUncompressedBytes: 32 * 1024,
      }),
      "checkpoint_uncompressed_too_large",
      413,
    );

    // 2. Oversized compressed stream without declared length
    const noisy = gzipSync(Buffer.from(JSON.stringify({ n: randomBytes(8 * 1024).toString("base64") })));
    await expectRunnerError(
      runner.readGzipCheckpointStream(Readable.from([noisy]), {
        maxCompressedBytes: 1024,
        maxUncompressedBytes: 64 * 1024,
      }),
      "checkpoint_compressed_too_large",
      413,
    );

    // 3. SHA-256 mismatch rejected before returning parsed data
    const validGz = gzipSync(Buffer.from(JSON.stringify({ ok: true }), "utf8"));
    await expectRunnerError(
      runner.readGzipCheckpointStream(Readable.from([validGz]), {
        expectedCompressedBytes: validGz.length,
        expectedSha256: "f".repeat(64),
      }),
      "checkpoint_checksum_mismatch",
      422,
    );
  });
});

describe("chunked base64 PDF atomic writer and file-path fast path", () => {
  it("decodes multi-chunk base64 PDF (both default 4 MiB chunks and small chunks with whitespace) with exact SHA-256 and atomic replacement", async () => {
    const dir = await makeTempDir();
    expect(runner.BASE64_DECODE_CHUNK_CHARS).toBe(4 * 1024 * 1024);

    // 1. Exercise real default 4 MiB base64 chunk boundary (>3 MiB decoded => >4 MiB base64, 2 chunks)
    const multiChunkPdf = Buffer.concat([
      Buffer.from("%PDF-1.7\n", "ascii"),
      randomBytes(3_500_000),
      Buffer.from("\n%%EOF\n", "ascii"),
    ]);
    const destLarge = path.join(dir, "tagged-large.pdf");
    const metaLarge = await runner.writeBase64PdfAtomic(
      destLarge,
      multiChunkPdf.toString("base64"),
      10 * 1024 * 1024,
    );

    expect(metaLarge.size).toBe(multiChunkPdf.length);
    expect(metaLarge.sha256).toBe(sha256Hex(multiChunkPdf));
    const diskLarge = await fsp.readFile(destLarge);
    expect(diskLarge.equals(multiChunkPdf)).toBe(true);
    expect(await fsp.readdir(dir)).toEqual(["tagged-large.pdf"]);

    // 2. Exercise whitespace + carry alignment across tiny 16-char chunks
    const smallPdf = Buffer.from("%PDF-1.7\nchunked base64 content with padding!\n%%EOF\n", "utf8");
    const rawB64 = smallPdf.toString("base64");
    // Insert line breaks at odd positions so chunks split across 4-char boundaries
    const wrappedB64 = `${rawB64.slice(0, 7)}\r\n${rawB64.slice(7, 22)} \n${rawB64.slice(22)}`;
    const destSmall = path.join(dir, "tagged-small.pdf");
    const metaSmall = await runner.writeBase64PdfAtomic(
      destSmall,
      wrappedB64,
      1024,
      { chunkChars: 16 },
    );

    expect(metaSmall.size).toBe(smallPdf.length);
    expect(metaSmall.sha256).toBe(sha256Hex(smallPdf));
    expect((await fsp.readFile(destSmall)).equals(smallPdf)).toBe(true);
    expect((await fsp.readdir(dir)).sort()).toEqual(["tagged-large.pdf", "tagged-small.pdf"]);
  });

  it("rejects non-PDF, truncated, empty, and oversized base64 inputs without leaving destination or temp files", async () => {
    const dir = await makeTempDir();

    // Non-PDF bytes
    const nonPdfDest = path.join(dir, "not-a-pdf.pdf");
    await expectRunnerError(
      runner.writeBase64PdfAtomic(
        nonPdfDest,
        Buffer.from("<html><body>Not a PDF</body></html>", "utf8").toString("base64"),
        4096,
      ),
      "tagged_pdf_invalid",
      500,
    );

    // Truncated header (< 5 bytes)
    await expectRunnerError(
      runner.writeBase64PdfAtomic(
        path.join(dir, "short.pdf"),
        Buffer.from("%PDF", "ascii").toString("base64"),
        4096,
      ),
      "tagged_pdf_invalid",
      500,
    );

    // Empty string
    await expectRunnerError(
      runner.writeBase64PdfAtomic(path.join(dir, "empty.pdf"), "", 4096),
      "tagged_pdf_not_produced",
      500,
    );

    // Oversized upfront (base64 length exceeds maximumBase64Length)
    const oversizedPdf = Buffer.concat([
      Buffer.from("%PDF-1.7\n", "ascii"),
      Buffer.alloc(2048, 0x41),
    ]);
    await expectRunnerError(
      runner.writeBase64PdfAtomic(
        path.join(dir, "too-big.pdf"),
        oversizedPdf.toString("base64"),
        1024,
      ),
      "result_too_large",
      413,
    );

    // Oversized decoded bytes within the +4 base64 length slack (maxBytes=10, decoded=12)
    const slackOverflowPdf = Buffer.from("%PDF-1.7\n123", "ascii");
    await expectRunnerError(
      runner.writeBase64PdfAtomic(
        path.join(dir, "slack-overflow.pdf"),
        slackOverflowPdf.toString("base64"),
        10,
      ),
      "result_too_large",
      413,
    );

    expect(await fsp.readdir(dir)).toEqual([]);
  });

  it("supports the taggedPdfFilePath fast path (verifying %PDF-, size cap, streaming SHA-256) and integrates with createRunnerServer", async () => {
    const dir = await makeTempDir();
    const sourcePdf = Buffer.from("%PDF-1.7\nfast path file output\n%%EOF\n", "ascii");
    const sourcePath = path.join(dir, "driver-output.pdf");
    await fsp.writeFile(sourcePath, sourcePdf);

    // Direct helper test: valid file
    const stagedDest = path.join(dir, "staged.pdf");
    const stagedMeta = await runner.stagePdfFileAtomic(sourcePath, stagedDest, 4096);
    expect(stagedMeta.size).toBe(sourcePdf.length);
    expect(stagedMeta.sha256).toBe(sha256Hex(sourcePdf));
    expect((await fsp.readFile(stagedDest)).equals(sourcePdf)).toBe(true);

    // Direct helper test: oversized file
    await expectRunnerError(
      runner.stagePdfFileAtomic(sourcePath, path.join(dir, "oversized.pdf"), 12),
      "result_too_large",
      413,
    );

    // Direct helper test: non-PDF file
    const badPath = path.join(dir, "bad.bin");
    await fsp.writeFile(badPath, "NOTPDF-content");
    await expectRunnerError(
      runner.stagePdfFileAtomic(badPath, path.join(dir, "bad-dest.pdf"), 4096),
      "tagged_pdf_invalid",
      500,
    );

    // End-to-end runner server integration with remediation.taggedPdfFilePath (no taggedPdfB64)
    const stateDir = await makeTempDir("alloflow-runner-filepath-");
    const inputPdf = Buffer.from("%PDF-1.7\ninput\n%%EOF\n", "ascii");
    const uploaded = new Map<string, { body: Buffer; sha256: string }>();
    const token = "streaming-memory-test-token-000000000000000000";

    const app = runner.createRunnerServer({
      token,
      stateDir,
      fetch: async (url: string, init: Record<string, unknown> = {}) => {
        const method = String(init.method || "GET");
        if (method === "GET" && url === "http://r2.internal/input") {
          return new Response(inputPdf, {
            status: 200,
            headers: {
              "Content-Type": "application/pdf",
              "Content-Length": String(inputPdf.length),
            },
          });
        }
        if (method === "PUT") {
          const headers = (init.headers || {}) as Record<string, string>;
          uploaded.set(url, {
            body: await collectAsyncBody(init.body),
            sha256: headers["X-AlloFlow-SHA256"] || "",
          });
          return new Response(null, { status: 204 });
        }
        return new Response(null, { status: 404 });
      },
      createDriver: () => ({
        async remediate() {
          return {
            activeContentScanVerified: true,
            activeContentDetected: false,
            verdict: { level: "ready" },
            verificationState: "complete",
            verificationHtmlBound: true,
            taggedPdfDelivery: { ok: true, code: "verified" },
            taggedPdfExportMode: "original_layout",
            remainingAxeViolations: 0,
            remainingEqualAccessFailures: 0,
            auditCoverage: {
              configuredAuditorCap: 5,
              requestedAuditors: 3,
              completedAuditors: 3,
              sliced: false,
            },
            beforeScore: 50,
            afterScore: 98,
            taggedPdfFilePath: sourcePath,
          };
        },
        async cancelActiveRun() {
          return false;
        },
        async close() {},
      }),
    });

    await new Promise<void>((resolve) => app.server.listen(0, "127.0.0.1", resolve));
    try {
      const address = app.server.address();
      if (!address || typeof address === "string") {
        throw new Error("Expected TCP address");
      }
      const res = await fetch(`http://127.0.0.1:${address.port}/v1/run`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schema: 1,
          jobId: "job-fast-path-pdf",
          input: {
            url: "http://r2.internal/input",
            contentType: "application/pdf",
          },
          output: {
            taggedPdfUrl: "http://r2.internal/output/tagged.pdf",
            reportUrl: "http://r2.internal/output/report.json",
          },
          options: {
            targetScore: 95,
            fixPasses: 2,
            effortProfile: "standard",
            ocrLanguage: "",
            polishPasses: 0,
            taggedPdf: true,
            autoContinue: false,
            autoContinueRounds: 0,
            validateUa: false,
            maxRunMinutes: 20,
          },
        }),
      });
      expect(res.status).toBe(200);
      const taggedUpload = uploaded.get("http://r2.internal/output/tagged.pdf");
      expect(taggedUpload).toBeDefined();
      expect(taggedUpload?.body.equals(sourcePdf)).toBe(true);
      expect(taggedUpload?.sha256).toBe(sha256Hex(sourcePdf));
    } finally {
      await app.shutdown();
    }
  });
});

describe("runner /v1/status localOutputsReady reporting", () => {
  it("reports localOutputsReady: true only when verified tagged.pdf and report.json exist on disk for that job", async () => {
    const stateDir = await makeTempDir("alloflow-runner-status-ready-");
    const inputPdf = Buffer.from("%PDF-1.7\ninput\n%%EOF\n", "ascii");
    const outputPdf = Buffer.from("%PDF-1.7\nverified local output\n%%EOF\n", "ascii");
    const token = "status-local-outputs-test-token-000000000000000";
    let failDriver = false;

    const app = runner.createRunnerServer({
      token,
      stateDir,
      fetch: async (url: string, init: Record<string, unknown> = {}) => {
        const method = String(init.method || "GET");
        if (method === "GET" && url === "http://r2.internal/input") {
          return new Response(inputPdf, {
            status: 200,
            headers: {
              "Content-Type": "application/pdf",
              "Content-Length": String(inputPdf.length),
            },
          });
        }
        if (method === "PUT") {
          await collectAsyncBody(init.body);
          if (url.endsWith("/report.json")) {
            return new Response(null, { status: 503 });
          }
          return new Response(null, { status: 204 });
        }
        return new Response(null, { status: 404 });
      },
      createDriver: () => ({
        async remediate() {
          if (failDriver) {
            throw new Error("API_QUOTA_EXHAUSTED [model_throttled retryAfterMs=1000]");
          }
          return {
            activeContentScanVerified: true,
            activeContentDetected: false,
            verdict: { level: "ready" },
            verificationState: "complete",
            verificationHtmlBound: true,
            taggedPdfDelivery: { ok: true, code: "verified" },
            taggedPdfExportMode: "original_layout",
            remainingAxeViolations: 0,
            remainingEqualAccessFailures: 0,
            auditCoverage: {
              configuredAuditorCap: 5,
              requestedAuditors: 3,
              completedAuditors: 3,
              sliced: false,
            },
            beforeScore: 45,
            afterScore: 97,
            taggedPdfB64: outputPdf.toString("base64"),
          };
        },
        async cancelActiveRun() {
          return false;
        },
        async close() {},
      }),
    });

    await new Promise<void>((resolve) => app.server.listen(0, "127.0.0.1", resolve));
    try {
      const address = app.server.address();
      if (!address || typeof address === "string") {
        throw new Error("Expected TCP address");
      }
      const baseUrl = `http://127.0.0.1:${address.port}`;
      const makePayload = (jobId: string) => ({
        schema: 1,
        jobId,
        input: {
          url: "http://r2.internal/input",
          contentType: "application/pdf",
        },
        output: {
          taggedPdfUrl: "http://r2.internal/output/tagged.pdf",
          reportUrl: "http://r2.internal/output/report.json",
        },
        options: {
          targetScore: 95,
          fixPasses: 2,
          effortProfile: "standard",
          ocrLanguage: "",
          polishPasses: 0,
          taggedPdf: true,
          autoContinue: false,
          autoContinueRounds: 0,
          validateUa: false,
          maxRunMinutes: 20,
        },
      });

      // 1. Retryable upload failure leaves verified local tagged.pdf + report.json -> localOutputsReady: true
      const uploadFailJobId = "job-status-local-ready";
      const firstRun = await fetch(`${baseUrl}/v1/run`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(makePayload(uploadFailJobId)),
      });
      expect(firstRun.status).toBe(502);

      const readyStatusRes = await fetch(
        `${baseUrl}/v1/status?job_id=${encodeURIComponent(uploadFailJobId)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      expect(readyStatusRes.status).toBe(200);
      const readyStatus = (await readyStatusRes.json()) as Record<string, unknown>;
      expect(readyStatus.jobId).toBe(uploadFailJobId);
      expect(readyStatus.status).toBe("retryable");
      expect(readyStatus.active).not.toBe(true);
      expect(readyStatus.localOutputsReady).toBe(true);

      // 2. Corrupting the local tagged.pdf on disk causes verifyLocalArtifact to fail -> localOutputsReady: false
      await fsp.writeFile(
        path.join(stateDir, uploadFailJobId, "tagged.pdf"),
        Buffer.from("%PDF-1.7\ntampered!\n%%EOF\n", "ascii"),
      );
      const tamperedStatusRes = await fetch(
        `${baseUrl}/v1/status?job_id=${encodeURIComponent(uploadFailJobId)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      expect(tamperedStatusRes.status).toBe(200);
      const tamperedStatus = (await tamperedStatusRes.json()) as Record<string, unknown>;
      expect(tamperedStatus.status).toBe("retryable");
      expect(tamperedStatus.localOutputsReady).toBe(false);

      // 3. Retryable failure before outputs exist -> localOutputsReady: false
      failDriver = true;
      const noOutputsJobId = "job-status-no-outputs";
      const throttledRun = await fetch(`${baseUrl}/v1/run`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(makePayload(noOutputsJobId)),
      });
      expect(throttledRun.status).toBe(429);

      const noOutputsStatusRes = await fetch(
        `${baseUrl}/v1/status?job_id=${encodeURIComponent(noOutputsJobId)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      expect(noOutputsStatusRes.status).toBe(200);
      const noOutputsStatus = (await noOutputsStatusRes.json()) as Record<string, unknown>;
      expect(noOutputsStatus.status).toBe("retryable");
      expect(noOutputsStatus.localOutputsReady).toBe(false);
    } finally {
      await app.shutdown();
    }
  });
});
