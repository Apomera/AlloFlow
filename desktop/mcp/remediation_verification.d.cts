export interface CandidateRejectionEvidence {
  candidateRejectionCount: number;
  candidateRejections: Array<{ pass?: number; chunkId: string; phase: string; reason: string }>;
}
export function normalizeCandidateRejectionEvidence(value: unknown): CandidateRejectionEvidence;
export const CANDIDATE_REJECTION_SCHEMA: Record<string, unknown>;
export type PdfUaValidation =
  | { status: 'not_run'; reason: 'disabled_for_institution_pilot' | 'independent_validator_not_packaged' }
  | { status: 'unavailable'; reason: 'validator_not_available' | 'validator_timeout' | 'validator_error' | 'attempt_finalization_reserve' | 'validator_evidence_unbound' }
  | { status: 'compliant' | 'noncompliant'; validator: 'veraPDF'; profile: 'ua1'; validatorVersion: string | null;
      failedRules: number; failedChecks: number; passedRules: number; passedChecks: number;
      inputSha256: string; inputBytes: number; validatedAt: string; validationDurationMs: number };
export function normalizePdfUaValidation(value: unknown, artifact: { sha256: string; size: number }, options?: { allowLegacyUnbound?: boolean }): PdfUaValidation;
export function pdfDeliveryState(input: { hasPdf: boolean; pdfStatus: string; verificationState: string; level: 'ready' | 'caution' | 'review'; taggedPdfVerified: boolean }): {
  verificationState: string; reviewRequired: boolean; distributionLevel: 'ready' | 'caution' | 'review';
  taggedPdfDelivery: 'verified' | 'review-required'; deliveryStatus: 'review-required' | 'complete-for-tested-scope';
};
