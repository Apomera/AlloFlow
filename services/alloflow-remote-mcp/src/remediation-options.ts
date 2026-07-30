import type { RemediationJobOptions } from "./job-store";
import { PilotError } from "./security";

const SUPPORTED_OCR_LANGUAGE_BASES = new Set([
  "en", "es", "fr", "de", "it", "pt", "nl", "ru", "uk", "pl",
  "tr", "sv", "da", "nb", "no", "fi", "cs", "sk", "ro", "hu", "el", "bg",
  "hr", "sr", "he", "ar", "fa", "ps", "ur", "hi", "bn", "pa", "gu", "ta",
  "te", "kn", "ml", "th", "lo", "km", "my", "vi", "id", "ms", "tl", "ja",
  "ko", "am", "ti", "sw", "so", "ht", "zh",
]);
const OCR_LANGUAGE_TAG_RE = /^[a-z]{2}(?:-[a-z]{2,4})?$/u;

export function isSupportedOcrLanguage(value: unknown): value is string {
  if (value === "") return true;
  if (
    typeof value !== "string" ||
    value.length > 12 ||
    !OCR_LANGUAGE_TAG_RE.test(value)
  ) return false;
  return SUPPORTED_OCR_LANGUAGE_BASES.has(value.slice(0, 2));
}

export type RemediationOptionInput = {
  targetScore?: number;
  fixPasses?: number;
  effort: "standard" | "thorough";
  ocrLanguage?: string;
};

export function resolveRemediationOptions(
  input: RemediationOptionInput,
): RemediationJobOptions {
  const thorough = input.effort === "thorough";
  const targetScore = input.targetScore ?? 95;
  const fixPasses = input.fixPasses ?? (thorough ? 3 : 2);
  const ocrLanguage = input.ocrLanguage ?? "";
  if (
    (input.effort !== "standard" &&
      input.effort !== "thorough") ||
    !Number.isInteger(targetScore) ||
    targetScore < 80 ||
    targetScore > 100 ||
    !Number.isInteger(fixPasses) ||
    fixPasses < 1 ||
    fixPasses > 3 ||
    !isSupportedOcrLanguage(ocrLanguage)
  ) {
    throw new PilotError("invalid_remediation_options", 400);
  }
  return {
    targetScore,
    fixPasses,
    effortProfile: input.effort,
    ocrLanguage,
    polishPasses: thorough ? 1 : 0,
    autoContinueRounds: thorough ? 2 : 0,
  };
}
