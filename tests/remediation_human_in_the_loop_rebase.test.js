import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const pipe = fs.readFileSync(path.join(ROOT, 'doc_pipeline_source.jsx'), 'utf8');
const view = fs.readFileSync(path.join(ROOT, 'view_pdf_audit_source.jsx'), 'utf8');
const host = fs.readFileSync(path.join(ROOT, 'desktop/web-app/src/App.jsx'), 'utf8');
const anti = fs.readFileSync(path.join(ROOT, 'AlloFlowANTI.txt'), 'utf8');

// The rebase reader, lifted out of _runMainFixLoop and exercised directly. This is the gate that
// decides whether ANY of the human-in-the-loop machinery runs, so it is the piece that has to be
// provably inert for the standalone automatic path.
function makeReader(loopCtx) {
  let _readCommitted = typeof loopCtx.readCommittedHtml === 'function' ? loopCtx.readCommittedHtml : null;
  let _externalRevision = null;
  if (_readCommitted) {
    try {
      const _seed = _readCommitted();
      _externalRevision = _seed && Number.isSafeInteger(_seed.revision) ? _seed.revision : null;
    } catch (_) { _externalRevision = null; }
    if (_externalRevision === null) _readCommitted = null;
  }
  return (mine) => {
    if (!_readCommitted) return null;
    let snap = null;
    try { snap = _readCommitted(); } catch (_) { return null; }
    if (!snap || !Number.isSafeInteger(snap.revision) || snap.revision <= _externalRevision) return null;
    _externalRevision = snap.revision;
    const html = typeof snap.html === 'string' ? snap.html : '';
    return (html && html !== mine) ? html : null;
  };
}

describe('human-in-the-loop rebase: the standalone automatic path is unchanged', () => {
  it('no host reader (batch / MCP / portable / tests) never rebases', () => {
    const take = makeReader({});
    expect(take('<p>loop html</p>')).toBeNull();
    expect(take('<p>anything</p>')).toBeNull();
  });

  it('a host that cannot report a revision is demoted to legacy mode, not trusted by bytes', () => {
    // Without a counter there is no way to tell "a human edited" from "the host still holds the
    // previous document" — which is the state at run entry on every single run. Refuse to guess.
    const take = makeReader({ readCommittedHtml: () => ({ html: '<p>some other doc</p>' }) });
    expect(take('<p>loop html</p>')).toBeNull();
  });

  it('a reader that throws is treated as absent, never as an edit', () => {
    const take = makeReader({ readCommittedHtml: () => { throw new Error('host gone'); } });
    expect(take('<p>loop html</p>')).toBeNull();
  });

  it('a stale host document at run entry is NOT adopted (the pass-1 trap)', () => {
    // The host legitimately holds the PREVIOUS document while the loop's html came from extraction.
    // A byte-difference check would adopt those stale bytes on pass 1 and destroy the run.
    let revision = 7;
    const take = makeReader({ readCommittedHtml: () => ({ html: '<p>PREVIOUS document</p>', revision }) });
    expect(take('<p>freshly extracted</p>')).toBeNull();
    expect(take('<p>freshly extracted</p>')).toBeNull();
  });

  it('no human commit means the revision never advances, so nothing fires', () => {
    const state = { html: '<p>v1</p>', revision: 3 };
    const take = makeReader({ readCommittedHtml: () => ({ ...state }) });
    for (let pass = 0; pass < 8; pass++) expect(take('<p>loop working state</p>')).toBeNull();
  });
});

describe('human-in-the-loop rebase: a real human edit is picked up exactly once', () => {
  it('adopts on a revision increase, and does not re-adopt the same edit', () => {
    const state = { html: '<p>v1</p>', revision: 3 };
    const take = makeReader({ readCommittedHtml: () => ({ ...state }) });
    expect(take('<p>v1</p>')).toBeNull();
    state.html = '<p>v1 + human fix</p>';
    state.revision = 4;
    expect(take('<p>v1</p>')).toBe('<p>v1 + human fix</p>');
    // Same revision on the next pass: already adopted, do not adopt again.
    expect(take('<p>v1 + human fix</p>')).toBeNull();
  });

  it('a revision bump whose html matches what the loop already holds is not an edit', () => {
    // This is the pipeline committing its own work back, not a person typing.
    const state = { html: '<p>v1</p>', revision: 3 };
    const take = makeReader({ readCommittedHtml: () => ({ ...state }) });
    state.html = '<p>loop output</p>';
    state.revision = 4;
    expect(take('<p>loop output</p>')).toBeNull();
  });

  it('handles several human edits across a run', () => {
    const state = { html: '<p>v1</p>', revision: 1 };
    const take = makeReader({ readCommittedHtml: () => ({ ...state }) });
    take('<p>v1</p>');
    const seen = [];
    for (const [html, rev] of [['<p>a</p>', 2], ['<p>b</p>', 3], ['<p>c</p>', 4]]) {
      state.html = html; state.revision = rev;
      const got = take('<p>loop state</p>');
      if (got) seen.push(got);
    }
    expect(seen).toEqual(['<p>a</p>', '<p>b</p>', '<p>c</p>']);
  });
});

describe('human-in-the-loop rebase: wiring', () => {
  it('the loop rebases at BOTH the pass boundary and across the AI call', () => {
    // The AI call is the multi-minute window where an edit is most likely to land. Checking only at
    // the pass boundary would let a stale rewrite overwrite the person's change.
    expect(pipe).toContain("const _preEdit = _takeExternalEdit(accessibleHtml);");
    expect(pipe).toContain("const _midEdit = _takeExternalEdit(snapshotHtml);");
  });

  it('adopting a human edit RESETS keep-best, or the ship step would revert it', () => {
    const fn = pipe.slice(pipe.indexOf('const _adoptExternalEdit ='), pipe.indexOf('const _adoptExternalEdit =') + 1400);
    expect(fn).toContain('bestHtml = html;');
    expect(fn).toContain('bestVerification = null;');
    expect(fn).toContain('_bestEvidenceComplete = false;');
  });

  it('a mid-pass edit drops that pass\'s AI output rather than applying it', () => {
    const at = pipe.indexOf("const _midEdit = _takeExternalEdit(snapshotHtml);");
    expect(at).toBeGreaterThan(-1);
    expect(pipe.slice(at, at + 400)).toContain('_aiFixApplied = false;');
  });

  it('the run discloses that it was collaborative, not purely automated', () => {
    expect(pipe).toContain('humanEditsAdopted: _humanEditsAdopted,');
    expect(pipe).toContain('humanEditsAdopted: _humanEditsAdopted }');
  });

  it('the host supplies html AND the monotonic revision counter', () => {
    for (const [name, src] of [['App.jsx', host], ['AlloFlowANTI.txt', anti]]) {
      expect(src, name).toContain('readCommittedHtml: () => {');
      expect(src, name).toContain('revision: pdfHtmlRevisionRef.current,');
    }
  });

  it('the Workbench retires chunk geometry before committing non-chunk-aware HTML', () => {
    // Without this, selectChunkVersion\'s html-mismatch guard silently disables every per-section
    // Reject/Restore for the rest of the session after the first Workbench command.
    expect(view).toContain('const _retired = retireChunkState({ currentHtml: _commandSourceHtml');
    expect(view).toContain('fixIssuesList, generateAuditReportHtml, selectChunkVersion, retireChunkState, getPdfPreviewHtml,');
    for (const [name, src] of [['App.jsx', host], ['AlloFlowANTI.txt', anti]]) {
      expect(src, name).toContain('selectChunkVersion, retireChunkState, getPdfPreviewHtml,');
    }
  });

  it('adopted edits are visible to the person who made them', () => {
    expect(view).toContain("window.addEventListener('alloflow:remediation-human-edit', onHumanEdit);");
    expect(view).toContain("window.removeEventListener('alloflow:remediation-human-edit', onHumanEdit);");
    expect(view).toContain('{_humanEditsAdopted > 0 && (');
  });

  it('the human-edit listener uses the same strict document-epoch gate as the other run events', () => {
    const at = view.indexOf('const onHumanEdit = (ev) => {');
    expect(at).toBeGreaterThan(-1);
    expect(view.slice(at, at + 320)).toContain('detail.documentEpoch !== pdfDocumentEpoch');
  });
});

describe('live collaboration (phases 2-4): section buttons, review queue, watch-live', () => {
  it('Reject and Restore work during the auto-continue loop; Re-fix stays gated', () => {
    // Reject/Restore are deterministic CAS-guarded splices the loop now rebases onto. Re-fix
    // launches a SECOND AI operation, so running it concurrently with an active loop is the
    // two-writer contention the run-ownership work exists to prevent.
    expect(view).toContain('{!isRejected && !pdfFixLoading && (');
    expect(view).toContain('{isRejected && !pdfFixLoading && (');
    const refixGates = view.split('!pdfFixLoading && !pdfAutoContinueRunning && (').length - 1;
    expect(refixGates, 'exactly the Re-fix button keeps the dual gate').toBe(1);
  });

  it('the loop emits the review-findings feed at run entry and at every pass boundary', () => {
    expect(pipe).toContain("_emitReviewFindings(0); // seed the queue from the run-entry audits");
    expect(pipe).toContain('_emitReviewFindings(fixPass + 1);');
    // The feed carries run identity so the view can epoch-gate it like every other run event.
    const at = pipe.indexOf("new CustomEvent('alloflow:remediation-review-findings'");
    expect(at).toBeGreaterThan(-1);
    const emitter = pipe.slice(pipe.indexOf('const _emitReviewFindings ='), at + 200);
    expect(emitter).toContain('documentEpoch: _documentEpoch');
    expect(emitter).toContain('runId: _controlRunId');
  });

  it('the feed is the review tier only - confirmed violations stay in the fix loop', () => {
    const emitter = pipe.slice(pipe.indexOf('const _emitReviewFindings ='), pipe.indexOf("alloflow:remediation-review-findings"));
    expect(emitter).toContain('axeResults.incomplete');
    expect(emitter).toContain('equalAccessResults.potentialFindings');
    expect(emitter).toContain('equalAccessResults.manualFindings');
    expect(emitter).not.toContain('axeResults.critical');
    expect(emitter).not.toContain('equalAccessResults.fails');
  });

  it('the view epoch-gates the feed and resets all collaboration state on a new document', () => {
    const at = view.indexOf('const onReviewFindings = (ev) => {');
    expect(at).toBeGreaterThan(-1);
    expect(view.slice(at, at + 350)).toContain('detail.documentEpoch !== pdfDocumentEpoch');
    // A fresh document must not inherit the previous one's queue, dismissals, or edit counter.
    const reset = view.indexOf('setHumanEditsAdopted(0);');
    expect(reset).toBeGreaterThan(-1);
    expect(view.slice(reset, reset + 200)).toContain('setReviewFindingsLive(null);');
    expect(view.slice(reset, reset + 200)).toContain('setReviewDismissed({});');
  });

  it('the queue renders outside the results panel so it is live during the FIRST run', () => {
    const queueAt = view.indexOf('Needs-human-judgment queue');
    const resultsAt = view.indexOf('{/* ── Fix & Verify Results Panel ── */}');
    expect(queueAt).toBeGreaterThan(-1);
    expect(resultsAt).toBeGreaterThan(-1);
    expect(queueAt, 'queue must precede (not nest inside) the pdfFixResult-gated panel').toBeLessThan(resultsAt);
  });

  it('queue items bridge to the Workbench and can be marked reviewed', () => {
    expect(view).toContain('const _reviewToWorkbench = (f) => {');
    expect(view).toContain("setReviewDismissed((prev) => ({ ...prev, [_k]: _at }));");
  });

  it('watch-live is READ-ONLY: srcDoc-bound, no scripts, and never the editing modal', () => {
    const at = view.indexOf('{_remediationInFlight && _watchLiveOpen && (');
    expect(at).toBeGreaterThan(-1);
    const block = view.slice(at, at + 1800);
    expect(block).toContain('sandbox="allow-same-origin"');
    expect(block).toContain('srcDoc={pdfFixResult.accessibleHtml}');
    expect(block).not.toContain('setPdfPreviewOpen');
    expect(block).not.toContain('contentEditable');
  });

  it('the Preview & Edit modal stays gated during runs - its full-document sync would revert rounds', () => {
    expect(view).toContain('<button onClick={() => { setPdfPreviewOpen(true); setTimeout(updatePdfPreview, 200); }}');
    const at = view.indexOf('<button onClick={() => { setPdfPreviewOpen(true); setTimeout(updatePdfPreview, 200); }}');
    expect(view.slice(at, at + 300)).toContain('disabled={_oneClickOperationBusy}');
  });
});

describe('provenance and queue freshness refinements (2026-08-23)', () => {
  it('the queue derives from COMMITTED audits once a result exists (rounds emit no events)', () => {
    // Auto-continue rounds live in misc_handlers and emit no pass events, so an event-only queue
    // goes stale the moment rounds take over. The committed audits are the same source the
    // engine-evidence panels render, so the two can never disagree.
    expect(view).toContain('Source-of-truth ladder');
    expect(view).toContain('? { committed: true, findings: [].concat(');
    expect(view).toContain("(_reviewFindingsLive ? { committed: false, findings: _reviewFindingsLive.findings, passNumber: _reviewFindingsLive.passNumber } : null)");
  });

  it('a collaborative result stays disclosed AFTER the run: dashboard chip + exported report', () => {
    // The mid-run banner chip disappears with the banner; the result field is forever. Both the
    // results dashboard and the downloadable report must disclose it, because the report is the
    // artifact most likely to travel beyond the person who ran the remediation.
    expect(view).toContain('{Number(pdfFixResult.humanEditsAdopted) > 0 && (');
    expect(pipe).toContain('const _humanEditsRpt = Number(d.humanEditsAdopted || (d.after && d.after.humanEditsAdopted)) || 0;');
    expect(pipe).toContain('<strong>Human-in-the-loop:</strong>');
  });

  it('the round loop already rebases via the revision counter (pre-existing, relied upon)', () => {
    // Documented reliance: misc_handlers runAutoFixLoop captures _roundHtmlRevision at round start
    // and re-reads pdfFixResultRef on any mismatch. If this discipline is ever removed, mid-round
    // human edits during auto-continue would be clobbered again.
    const misc = fs.readFileSync(path.join(ROOT, 'misc_handlers_source.jsx'), 'utf8');
    expect(misc).toContain('const _roundHtmlRevision = pdfHtmlRevisionRef.current;');
    expect(misc).toContain('pdfHtmlRevisionRef.current !== _roundHtmlRevision');
  });
});

describe('reviewed-findings attestation (2026-08-23, #2)', () => {
  it('marking reviewed persists onto the result as metadata only (no html change, no revision bump)', () => {
    const at = view.indexOf("setPdfFixResult((prev) => prev ? { ...prev, reviewedFindings: { ...(prev.reviewedFindings || {}), [_k]: _at } } : prev);");
    expect(at).toBeGreaterThan(-1);
    // Reset clears BOTH layers - session state and the persisted attestations.
    expect(view).toContain("{ setReviewDismissed({}); setPdfFixResult((prev) => prev ? { ...prev, reviewedFindings: null } : prev); }");
    // The panel overlays session clicks on the persisted map, so restored sessions show their attestations.
    expect(view).toContain("const _rfDismissed = { ...((pdfFixResult && pdfFixResult.reviewedFindings) || {}), ..._reviewDismissed };");
  });

  it('provenance survives the project file: save projection + ALL THREE restore projections', () => {
    for (const [name, src] of [['App.jsx', host], ['AlloFlowANTI.txt', anti]]) {
      expect(src, name + ' save').toContain("humanEditsAdopted: Number(cur.humanEditsAdopted) || 0,");
      expect(src, name + ' save').toContain("reviewedFindings: (cur.reviewedFindings && typeof cur.reviewedFindings === 'object') ? cur.reviewedFindings : null,");
      // A new attestation alone must trigger an autosave - the dedupe key has to see it.
      expect(src, name + ' hashKey').toContain("String(cur.reviewedFindings ? Object.keys(cur.reviewedFindings).length : 0)");
      expect(src, name + ' restore').toContain("humanEditsAdopted: Number(project.humanEditsAdopted) || 0,");
    }
    // Both view restore sites (drag-drop loader + continue-previous-session).
    const viewRestores = view.split("reviewedFindings: (project.reviewedFindings && typeof project.reviewedFindings === 'object') ? project.reviewedFindings : null,").length - 1;
    expect(viewRestores, 'both view restore sites carry the field').toBe(2);
  });

  it('the report renders the attestation as human attestation, never automated verification', () => {
    expect(pipe).toContain('<strong>Review findings:</strong>');
    expect(pipe).toContain('Marked-reviewed is a human attestation recorded in AlloFlow, not an automated verification.');
    // Coherence: reviewed keys are intersected against the CURRENT audits, so an attestation for a
    // finding a later pass resolved cannot inflate the tally.
    expect(pipe).toContain('const _reviewedRows = _rptFindingKeys.filter(function (r) { return _reviewedMapRpt && _reviewedMapRpt[r.key]; });');
    // Reviewed does not mean hidden: unreviewed findings are listed right beside the reviewed ones.
    expect(pipe).toContain('not yet reviewed');
  });

  it('attestation keys use the same engine|bucket|id shape as the queue, or they would never match', () => {
    expect(pipe).toContain("'axe|incomplete|' + ((f && f.id) || 'unknown-rule')");
    expect(pipe).toContain("'equalAccess|potential|' + ((f && f.id) || 'unknown-rule')");
    expect(pipe).toContain("'equalAccess|manual|' + ((f && f.id) || 'unknown-rule')");
    expect(view).toContain("const _rfKey = (f) => f.engine + '|' + f.bucket + '|' + f.id;");
  });
});

describe('epoch-mirror self-heal (2026-08-23 field log)', () => {
  it('a live event carrying the authoritative epoch resyncs a lagging render mirror', () => {
    // Third recurrence of the epoch-desync class: the modal owned epoch 0 while the run reported
    // 1, every event was dropped, and the modal sat on "audit running" after the audit finished.
    // The heal is guarded to EXACTLY that desync - an event whose epoch does not match the ref is
    // a genuinely stale run and must stay dropped.
    for (const [name, src] of [['App.jsx', host], ['AlloFlowANTI.txt', anti]]) {
      const at = src.indexOf('const _onEpochHeal = (ev) => {');
      expect(at, name).toBeGreaterThan(-1);
      const block = src.slice(at, at + 900);
      expect(block, name).toContain('_e === pdfDocumentSelectionEpochRef.current');
      expect(block, name).toContain('_e !== pdfDocumentEpochLive');
      expect(block, name).toContain('setPdfDocumentEpochLive(_e);');
      expect(src, name).toContain("window.addEventListener('alloflow:remediation-progress', _onEpochHeal);");
      expect(src, name).toContain("window.removeEventListener('alloflow:remediation-progress', _onEpochHeal);");
    }
  });

  it('the healed value comes from the ref-verified event, never from the event alone', () => {
    // Setting the mirror from an unverified event epoch would let a stale run RESURRECT itself.
    // The guard requires the event to match the authoritative ref before the mirror moves.
    const at = host.indexOf('const _onEpochHeal = (ev) => {');
    const block = host.slice(at, at + 900);
    const guardAt = block.indexOf('_e === pdfDocumentSelectionEpochRef.current');
    const setAt = block.indexOf('setPdfDocumentEpochLive(_e);');
    expect(guardAt).toBeGreaterThan(-1);
    expect(setAt).toBeGreaterThan(guardAt);
  });
});
