import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import type { JobCheckpoint } from "../src/job-store";
import { checkpointObjectMatches } from "../src/checkpoint-artifact";

const jobId = "job_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const sha256 = "a".repeat(64);
const inputSha256 = "1".repeat(64);
const optionsSha256 = "2".repeat(64);
const engineSha256 = "3".repeat(64);

const checkpoint: JobCheckpoint = {
  seq: 7,
  key: `tenant/district_opaque_01/checkpoint/${jobId}/` +
    `seq-7-${sha256}.json.gz`,
  sha256,
  sizeBytes: 128,
  stage: "round",
  schema: "1",
  inputSha256,
  optionsSha256,
  engineSha256,
  createdAt: 1,
};

type CheckpointObject = Parameters<typeof checkpointObjectMatches>[2];

function checksum(value: string): ArrayBuffer {
  return Uint8Array.from(
    value.match(/../gu) as string[],
    (byte) => Number.parseInt(byte, 16),
  ).buffer;
}

function object(
  overrides: {
    size?: number;
    sha256?: string;
    contentType?: string;
    cacheControl?: string;
    metadata?: Record<string, string>;
  } = {},
): CheckpointObject {
  return {
    size: overrides.size ?? checkpoint.sizeBytes,
    checksums: {
      sha256: checksum(overrides.sha256 ?? checkpoint.sha256),
    },
    httpMetadata: {
      contentType: overrides.contentType ?? "application/gzip",
      cacheControl: overrides.cacheControl ?? "no-store",
    },
    customMetadata: {
      artifact: "checkpoint",
      jobId,
      sequence: String(checkpoint.seq),
      stage: checkpoint.stage,
      schema: checkpoint.schema,
      inputSha256: checkpoint.inputSha256,
      optionsSha256: checkpoint.optionsSha256,
      engineSha256: checkpoint.engineSha256,
      ...overrides.metadata,
    },
  } as unknown as CheckpointObject;
}

const source = readFileSync(
  fileURLToPath(
    new URL("../src/remediation-container.ts", import.meta.url),
  ),
  "utf8",
);

describe("checkpoint R2 integrity guard", () => {
  it("accepts only an object exactly bound to the D1 pointer", () => {
    expect(checkpointObjectMatches(jobId, checkpoint, object())).toBe(true);

    const mismatches = [
      object({ size: checkpoint.sizeBytes + 1 }),
      object({ sha256: "b".repeat(64) }),
      object({ contentType: "application/json" }),
      object({ cacheControl: "public, max-age=3600" }),
      object({ metadata: { artifact: "report" } }),
      object({ metadata: { jobId: `${jobId}_other` } }),
      object({ metadata: { sequence: "8" } }),
      object({ metadata: { stage: "primary" } }),
      object({ metadata: { schema: "2" } }),
      object({ metadata: { inputSha256: "4".repeat(64) } }),
      object({ metadata: { optionsSha256: "5".repeat(64) } }),
      object({ metadata: { engineSha256: "6".repeat(64) } }),
    ];

    for (const candidate of mismatches) {
      expect(checkpointObjectMatches(jobId, checkpoint, candidate)).toBe(
        false,
      );
    }
  });

  it("self-heals an invalid object instead of serving corrupt bytes", () => {
    const getStart = source.indexOf(
      'request.method === "GET" &&\n      url.pathname === "/checkpoint"',
    );
    const putStart = source.indexOf(
      'request.method === "PUT" &&\n      url.pathname === "/checkpoint"',
      getStart,
    );
    const getBlock = source.slice(getStart, putStart);

    expect(getStart).toBeGreaterThan(-1);
    expect(getBlock.indexOf("checkpointObjectMatches(")).toBeGreaterThan(-1);
    const clear = getBlock.indexOf("await clearJobCheckpoint(");
    expect(clear).toBeGreaterThan(
      getBlock.indexOf("checkpointObjectMatches("),
    );
    expect(
      getBlock.indexOf("return checkpointNotFound()", clear),
    ).toBeGreaterThan(
      clear,
    );
  });

  it("uploads and validates immutable R2 bytes before advancing D1", () => {
    const putStart = source.indexOf(
      'request.method === "PUT" &&\n      url.pathname === "/checkpoint"',
    );
    const outputStart = source.indexOf(
      'url.pathname === "/output/tagged.pdf"',
      putStart,
    );
    const putBlock = source.slice(putStart, outputStart);

    const upload = putBlock.indexOf("await env.DOCUMENTS.put(");
    const validate = putBlock.indexOf("checkpointObjectMatches(");
    const commit = putBlock.indexOf("await commitJobCheckpoint(");
    const deleteSuperseded = putBlock.indexOf(
      "committed.supersededCheckpoint",
    );

    expect(upload).toBeGreaterThan(-1);
    expect(upload).toBeLessThan(validate);
    expect(validate).toBeLessThan(commit);
    expect(commit).toBeLessThan(deleteSuperseded);
    expect(putBlock).toContain('onlyIf: { etagDoesNotMatch: "*" }');
  });
});
