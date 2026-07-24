#!/usr/bin/env python3
# #6-full ANTI half — ONE-SHOT RE-LAND (2026-07-16).
# The engine half (finalizeRemediationRound reducer + parity tests) landed @4aade768e.
# The HOST half (runAutoFixLoop delegates; hand-rolled merge deleted) was re-landed OVER
# twice by a concurrent session force-re-landing its own ANTI hunks from a stale base, so
# it waits for a QUIET WINDOW. To land it:
#   1. Confirm no other session is writing AlloFlowANTI.txt.
#   2. python dev-tools/reland_finalize_round_delegation.py AlloFlowANTI.txt desktop/web-app/src/AlloFlowANTI.txt
#   3. Replace tests/auto_continue_canonical_verification.test.js + tests/batch_q_honesty_fixes.test.js
#      with the .hold copies next to this script (they repoint the moved pins at the reducer).
#   4. npx vitest run tests/finalize_round_reducer.test.js tests/auto_continue_canonical_verification.test.js tests/batch_q_honesty_fixes.test.js
#      (the reducer suite's delegation pins ARM automatically once ANTI contains the call)
#   5. Commit ANTI + mirror + the two test files together, IMMEDIATELY. Aaron re-pastes ANTI into Canvas.
# The script asserts its anchors and refuses to run against an already-delegated or
# half-edited file, so a double-run is safe.
import io, sys

DELEGATION = '''        // #6-full (2026-07-16): ALL round-evidence assembly — scored-audit validity gating,
        // audit-only inheritance (C6), weakest-layer score, fidelity recompute-and-merge,
        // verification snapshot + SHA binding, expert-review base separation — now happens in
        // the engine's ONE canonical reducer (finalizeRemediationRound). The host keeps only
        // loop POLICY: the noise-aware revert, gen guards, proof attachment, and toasts. The
        // reducer returns the merged candidate; a reverted round simply discards it.
        const _finalizeRound = _docPipeline && _docPipeline.finalizeRemediationRound;
        if (typeof _finalizeRound !== 'function') {
          // Module older than this host build (mismatched deploy) — stop improving rather than
          // hand-merge with drift risk; the primary fixAndVerifyPdf result stands untouched.
          warnLog('[AutoContinue] finalizeRemediationRound unavailable (engine module predates this host) — stopping the loop; the primary result stands.');
          break;
        }
        // Recompute Issue-Resolution against THIS round's fresh audit so fixed issues drop off
        // the Newly-Introduced / Remaining lists (baseline rides on cur.issueResolution).
        let _roundIR = cur.issueResolution;
        try { const _r = recomputeIssueResolution(cur.issueResolution, reVerify); if (_r) _roundIR = _r; } catch (_) {}
        let _mergedRound = null;
        try {
          _mergedRound = await _finalizeRound(cur, {
            html: result.html, aiAudit: reVerify, axeAudit: result.axe, eaAudit: _ea,
            auditOnly: !!result._auditOnly, sourceText: cur.sourceText, issueResolution: _roundIR,
            plainText: _plainTextOf(result.html), passes: result.passes || 0,
            chunkState: result.chunkState, chunkWeightedScore: result.chunkWeightedScore,
          });
        } catch (_finErr) {
          warnLog('[AutoContinue] round merge failed (' + ((_finErr && _finErr.message) || _finErr) + ') — preserving prior state and stopping the loop.');
          break;
        }
        const _det = _mergedRound._detScore;
        const newScore = _mergedRound.afterScore;'''

def apply(path):
    s = io.open(path, encoding='utf-8').read()
    # ── Hunk 1: evidence/score computation → reducer delegation ──
    start1 = s.index('        // Only scored fresh audits are retained.')
    end1_anchor = "const newScore = (_det !== null) ? blendAiAxe(reVerify.score, _det) : reVerify.score; // shared weakest-layer (delegates to computeHeadline)"
    end1 = s.index(end1_anchor) + len(end1_anchor)
    assert s.count('        // Only scored fresh audits are retained.') == 1
    s = s[:start1] + DELEGATION + s[end1:]
    # ── Hunk 2: the dead hand-rolled merge (post-revert-check) → commit the reducer result ──
    start2 = s.index('        const _newPlain = _plainTextOf(result.html);')
    end2_anchor = '          chunkWeightedScore: result.chunkWeightedScore || cur.chunkWeightedScore,\n        });'
    end2 = s.index(end2_anchor) + len(end2_anchor)
    assert start2 < end2
    s = s[:start2] + '        // Commit: the reducer already assembled the complete next result for this round.\n        cur = _mergedRound;' + s[end2:]
    # ── Hunk 3: proof line reads the binding off the merged result ──
    s = s.replace('if (_verificationHtmlBinding && !attachVerificationHtmlProof(cur, result.html))',
                  'if (cur.verificationHtmlBinding && !attachVerificationHtmlProof(cur, result.html))')
    # sanity: dead locals gone from the loop
    assert '_nextExpertReviewReason' not in s
    assert '_mergedRound = await _finalizeRound(cur, {' in s
    io.open(path, 'w', encoding='utf-8', newline='').write(s)
    print('applied to', path)

for p in sys.argv[1:]:
    apply(p)
