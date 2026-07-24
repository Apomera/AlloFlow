import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Batch Q (2026-07-13): quick honesty wins from the 7/12 verification-wave review.
// C3 silent no-op downloads, C4 "null issue(s)", C5 web results hijack, C6 audit-only
// axe wipe, A3 futile refresh skip, B4 batch popup split, A1/A2/B2 residuals.

const read = (name) => readFileSync(resolve(process.cwd(), name), 'utf8');
const pipe = read('doc_pipeline_source.jsx');
const view = read('view_pdf_audit_source.jsx');
const host = read('AlloFlowANTI.txt') + read('misc_handlers_source.jsx'); // 2026-07-20: runAutoFixLoop lives in MiscHandlers
const hostMirror = read('prismflow-deploy/src/AlloFlowANTI.txt') + read('misc_handlers_source.jsx'); // 2026-07-20: runAutoFixLoop lives in MiscHandlers
const module_ = read('doc_pipeline_module.js');
const occurrences = (text, needle) => text.split(needle).length - 1;

describe('C3 — stale-download withholding is disclosed, never silent', () => {
  it('all three tagged/typeset stale-HTML guards toast before returning', () => {
    expect(occurrences(view, 'The document changed while this download was being prepared')).toBe(3);
    // The ticket-staleness guard stays SILENT (a newer download of the same kind
    // is in flight and will deliver) — only the html-changed case may toast.
    expect(view).not.toMatch(/_taggedArtifactTicketIsCurrent\([^)]*\)\s*\|\|\s*String\(\(pdfFixResultRef/);
  });
});

describe('C4 — deterministic-only re-audit never renders "null issue(s)"', () => {
  it('toast branches on Number.isFinite(res.issues)', () => {
    expect(view).toContain("Number.isFinite(res.issues) ? (res.issues + ' issue(s) remaining') : 'issue recount unavailable");
    expect(view).not.toContain("res.score + '/100 · ' + res.issues + ' issue(s) remaining'");
  });
});

describe('C5 — web audit-unavailable screen cannot hide remediation results', () => {
  it('the no-score branch yields to pdfFixResult', () => {
    expect(view).toContain("pdfAuditResult._isWebAudit && pdfAuditResult.score == null && !pdfFixResult ?");
  });
});

describe('C6 — audit-only refresh inherits prior deterministic evidence on unchanged bytes', () => {
  it('the inherit rule lives in the canonical reducer; the host delegates the round merge to it (#6-full)', () => {
    // 2026-07-16: the validity-gate + audit-only inheritance moved VERBATIM into
    // finalizeRemediationRound (doc_pipeline) — the host passes raw audits + auditOnly.
    expect(pipe).toContain('((auditOnly && _scored(cur.axeAudit)) ? cur.axeAudit : null)');
    expect(pipe).toContain('((auditOnly && _scored(cur.secondEngineAudit)) ? cur.secondEngineAudit : null)');
    expect(module_).toContain('((auditOnly && _scored(cur.axeAudit)) ? cur.axeAudit : null)');
    for (const src of [host, hostMirror]) {
      expect(src).toContain('auditOnly: !!result._auditOnly,');
      expect(src).toContain('_mergedRound = await _finalizeRound(cur, {');
    }
  });
  it('behavioral mirror: failed refresh no longer nulls det for audit-only rounds', () => {
    const mk = (raw, auditOnly, prior) => {
      const _freshAxeRaw = raw;
      const result = { _auditOnly: auditOnly };
      const cur = { axeAudit: prior };
      return _freshAxeRaw || ((result._auditOnly && cur.axeAudit && typeof cur.axeAudit.score === 'number' && Number.isFinite(cur.axeAudit.score)) ? cur.axeAudit : null);
    };
    expect(mk(null, true, { score: 88 })).toEqual({ score: 88 });   // inherit: same bytes
    expect(mk(null, false, { score: 88 })).toBeNull();              // rewrite round: replace-not-inherit
    expect(mk({ score: 91 }, true, { score: 88 })).toEqual({ score: 91 }); // fresh wins when present
  });
});

describe('A3 — futile verification refresh is skipped when EA is environmentally dead', () => {
  it('pipeline exports equalAccessUnavailable and tracks a load-failure streak', () => {
    expect(pipe).toContain('equalAccessUnavailable: _equalAccessUnavailable');
    expect(pipe).toContain('const _equalAccessUnavailable = () => _eaEngineLoadFailStreak >= 2;');
    expect(module_).toContain('equalAccessUnavailable: _equalAccessUnavailable');
    // Streak increments on BOTH terminal load-failure shapes and resets on success.
    expect(occurrences(pipe, '_eaEngineLoadFailStreak++')).toBe(2);
    expect(pipe).toContain('_eaEngineLoadFailStreak = 0; resolve();');
  });
  it('host skips the refresh only when EA is the sole blocker', () => {
    for (const src of [host, hostMirror]) {
      expect(src).toContain("_eaDead && _covA3.ai === 'complete' && _covA3.axe === 'complete' && _covA3.equalAccess !== 'complete'");
      expect(src).toContain('verification refresh skipped: the Equal Access engine cannot load');
    }
  });
});

describe('B4 — batch HTML dashboard popup tells the verification truth', () => {
  it('cards carry the processed/fully-verified split and a verification section renders the states map', () => {
    expect(view).toContain('${done.length}</div><div class="card-sub">');
    expect(view).toContain('${summary?.fullyVerified ?? 0} fully verified · ${failed.length} failed · ${Math.max(0, queue.length - done.length - failed.length)} pending');
    expect(view).toContain("summary && summary.verificationStates ? '<div class=\"section\"><h2>WCAG Verification");
    expect(view).toContain("['complete', 'review-required', 'partial', 'unavailable'].map");
    expect(view).toContain('${summary?.reviewRequired ?? 0} verification review');
  });
  it('the details table has a per-document Verification column and an honest gain cell', () => {
    expect(view).toContain('<th>Verification</th><th>Status</th>');
    expect(view).toContain("esc((r && r.verificationState) || '—')");
    expect(view).not.toContain("'</td><td>+' + (r ? (r.afterScore - r.beforeScore) : '—')");
  });
});

describe('A1 residual — history CSV carries the verification column', () => {
  it('head and rows include verification, and history rows produce it', () => {
    expect(view).toContain('date,file,outcome,verification,fail_stage');
    expect(view).toContain('_csv(r.verificationState || \'\')');
    expect(host).toContain("verificationState: cur.verificationState || 'unavailable'");
  });
});

describe('A2 residual — verdict bullet renders a sentence, not a machine token', () => {
  const fnStart = pipe.indexOf('function _alloDistributionVerdict');
  const fnEnd = pipe.indexOf('\n}', fnStart) + 2;
  const distributionVerdict = new Function(pipe.slice(fnStart, fnEnd) + '\nreturn _alloDistributionVerdict;')();
  it('maps each expertReviewReason token to teacher-readable text', () => {
    const base = { afterScore: 97, needsExpertReview: true };
    const a = distributionVerdict({ ...base, expertReviewReason: 'accessibility' }, {});
    expect(a.level).toBe('review');
    expect(a.review.join(' ')).toContain('expert pass');
    expect(a.review).not.toContain('accessibility');
    const c = distributionVerdict({ ...base, expertReviewReason: 'content-fidelity' }, {});
    expect(c.review.join(' ')).toContain('human check');
    const b = distributionVerdict({ ...base, expertReviewReason: 'both' }, {});
    expect(b.review.join(' ')).toContain('both need human review');
    // Unknown token still falls back to something visible.
    const u = distributionVerdict({ ...base, expertReviewReason: 'weird-token' }, {});
    expect(u.review.join(' ')).toContain('weird-token');
  });
});

describe('B2 residual — _finalAuditRetryAvailable has a reader', () => {
  it('the verification panel explains the retry when the last audit failed', () => {
    expect(view).toContain("pdfFixResult._finalAuditRetryAvailable && state !== 'complete'");
    expect(view).toContain('The last verification audit could not finish');
  });
});

describe('C7 — "+null" batch average can no longer render', () => {
  it('in-app summary and popup guard avgImprovement with Number.isFinite', () => {
    expect(view).toContain("Number.isFinite(pdfBatchSummary.avgImprovement) ? ((pdfBatchSummary.avgImprovement >= 0 ? '+' : '') + pdfBatchSummary.avgImprovement) : 'n/a'");
    expect(view).toContain("summary && Number.isFinite(summary.avgImprovement) ? ((summary.avgImprovement >= 0 ? '+' : '') + summary.avgImprovement) : 'n/a'");
  });
});
