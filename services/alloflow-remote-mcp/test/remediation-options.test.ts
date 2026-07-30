import { describe, expect, it } from "vitest";

import {
  isSupportedOcrLanguage,
  resolveRemediationOptions,
} from "../src/remediation-options";

describe("resolveRemediationOptions", () => {
  it("keeps the existing pipeline as the standard default", () => {
    expect(
      resolveRemediationOptions({
        effort: "standard",
      }),
    ).toEqual({
      targetScore: 95,
      fixPasses: 2,
      effortProfile: "standard",
      ocrLanguage: "",
      polishPasses: 0,
      autoContinueRounds: 0,
    });
  });

  it("maps thorough effort to bounded extra passes and preserves OCR", () => {
    expect(
      resolveRemediationOptions({
        effort: "thorough",
        targetScore: 98,
        ocrLanguage: "es",
      }),
    ).toEqual({
      targetScore: 98,
      fixPasses: 3,
      effortProfile: "thorough",
      ocrLanguage: "es",
      polishPasses: 1,
      autoContinueRounds: 2,
    });
  });

  it.each(["", "en", "es", "pt-br", "zh-hant"])(
    "accepts a supported canonical OCR language tag: %s",
    (value) => {
      expect(isSupportedOcrLanguage(value)).toBe(true);
    },
  );

  it.each([
    { effort: "unknown" },
    { effort: "standard", targetScore: 101 },
    { effort: "standard", fixPasses: 0 },
    { effort: "standard", ocrLanguage: "eng" },
    { effort: "standard", ocrLanguage: "eng+spa" },
    { effort: "standard", ocrLanguage: "zz" },
    { effort: "standard", ocrLanguage: "../../en" },
    { effort: "standard", ocrLanguage: "please use english" },
    { effort: "standard", ocrLanguage: "en-US" },
    { effort: "standard", ocrLanguage: "en-extra" },
  ])("rejects invalid options before D1 persistence: %o", (input) => {
    expect(() =>
      resolveRemediationOptions(
        input as Parameters<typeof resolveRemediationOptions>[0],
      ),
    ).toThrow("invalid_remediation_options");
  });
});
