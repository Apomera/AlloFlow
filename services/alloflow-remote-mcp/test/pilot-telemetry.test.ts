import { afterEach, describe, expect, it, vi } from "vitest";

import type { PilotEnv } from "../src/pilot-env";
import {
  emitPilotMetric,
  workerRelease,
} from "../src/pilot-telemetry";

describe("pilot telemetry", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes a privacy-safe, fixed-order analytics point", () => {
    const points: AnalyticsEngineDataPoint[] = [];
    const env: PilotEnv = {
      INSTITUTION_ID: "opaque_institution_01",
      CF_VERSION_METADATA: {
        id: "version-abc",
        tag: "staging",
        timestamp: "2026-08-09T12:00:00Z",
      },
      PILOT_METRICS: {
        writeDataPoint(point) {
          points.push(point ?? {});
        },
      },
    };
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    emitPilotMetric(env, "checkpoint_resumed", {
      outcome: "success",
      stage: "accepted_round",
      bytes: 4096,
      checkpointSequence: 3,
      jobId: "job_opaque_123",
      attemptId: "attempt_opaque_456",
    });

    expect(workerRelease(env)).toBe("version-abc");
    expect(points).toHaveLength(1);
    expect(points[0]?.indexes).toEqual(["opaque_institution_01"]);
    expect(points[0]?.blobs).toEqual([
      "checkpoint_resumed",
      "success",
      "accepted_round",
      "version-abc",
    ]);
    expect(points[0]?.blobs).not.toContain("job_opaque_123");
    expect(points[0]?.doubles).toEqual([
      1, 0, 4096, 0, 0, 0, 3, 0,
    ]);
    expect(info).toHaveBeenCalledOnce();
    expect(info.mock.calls[0]?.[0]).toContain('"jobId":"job_opaque_123"');
  });

  it("remains useful without the optional analytics binding", () => {
    const env: PilotEnv = {};
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => {
      emitPilotMetric(env, "cleanup failed!", {
        outcome: "failed",
        durationMs: Number.NaN,
      });
    }).not.toThrow();
    expect(error.mock.calls[0]?.[0]).toContain('"event":"cleanup_failed_"');
  });

  it("uses warning severity for throttling and deferred work", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    emitPilotMetric({}, "model_throttled", { outcome: "retrying" });
    expect(warn).toHaveBeenCalledOnce();
  });

  it("cannot turn an Analytics Engine outage into an operation failure", () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    expect(() =>
      emitPilotMetric(
        {
          PILOT_METRICS: {
            writeDataPoint() {
              throw new Error("binding unavailable");
            },
          },
        },
        "release_canary",
        { outcome: "success" },
      ),
    ).not.toThrow();
  });
});
