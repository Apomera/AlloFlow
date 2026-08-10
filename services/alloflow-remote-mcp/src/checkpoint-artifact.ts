import type { JobCheckpoint } from "./job-store";

function checksumHex(value: ArrayBuffer | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  return Array.from(new Uint8Array(value), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export type CheckpointObjectMetadata = Pick<
  R2Object,
  "size" | "checksums" | "httpMetadata" | "customMetadata"
>;

/**
 * Verifies the immutable R2 object against the fenced D1 pointer. The runner's
 * JSON envelope is checked separately after decompression; this boundary makes
 * sure the bytes served are exactly the bytes D1 committed.
 */
export function checkpointObjectMatches(
  jobId: string,
  checkpoint: JobCheckpoint,
  object: CheckpointObjectMetadata,
): boolean {
  const metadata = object.customMetadata;
  return (
    object.size === checkpoint.sizeBytes &&
    object.httpMetadata?.contentType === "application/gzip" &&
    object.httpMetadata.cacheControl === "no-store" &&
    checksumHex(object.checksums.sha256) === checkpoint.sha256 &&
    metadata?.artifact === "checkpoint" &&
    metadata.jobId === jobId &&
    metadata.sequence === String(checkpoint.seq) &&
    metadata.stage === checkpoint.stage &&
    metadata.schema === checkpoint.schema &&
    metadata.inputSha256 === checkpoint.inputSha256 &&
    metadata.optionsSha256 === checkpoint.optionsSha256 &&
    metadata.engineSha256 === checkpoint.engineSha256
  );
}
