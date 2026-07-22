/**
 * AlloFlow — Research Hub Educator Dashboard (V2)
 *
 * Self-registers via window.ResearchHub.registerEducatorView(...) on load.
 * READ-ONLY by contract: the Hub does not pass setJournal in ctx, so a teacher
 * cannot accidentally mutate a student's session through this view.
 *
 * Implements docs/research_hub_educator_dashboard_spec.md. Grades INQUIRY
 * TRAJECTORIES, not surface artifact polish:
 *   1. Did the model / position / design get narrower under pressure?
 *      (versioned artifacts + revision logs)
 *   2. Did the student loop back when evidence demanded it?
 *      (loopBacks[] count + whyChipId distribution)
 *   3. Did sources fail SIFT or get tier-downgraded?
 *      (sources[].sift.tierHistory[]) — downgrades are GOOD data
 *   4. Did AI usage stay scaffolding-shaped?
 *      (aiHistory[] gate_reasons + per-touchpoint distribution)
 *
 * Renders only what the active lane has data for; empty states explain what
 * the trajectory would show once the student has done work.
 */
(function initResearchHubEducator(retriesLeft) {
  'use strict';
  if (window.AlloModules && window.AlloModules.ResearchHubEducator && window.AlloModules.ResearchHubEducator.__tier >= 2) {
    console.log('[CDN] ResearchHubEducator already loaded, skipping');
    return;
  }
  // Loader visibility: stamp a key immediately (the real { __tier: 2 } lands
  // at registration) so a legitimate defer isn't misread by loadModule() as a
  // failed load — which used to trigger a pointless GitHub-raw double-fetch.
  window.AlloModules = window.AlloModules || {};
  if (!window.AlloModules.ResearchHubEducator) window.AlloModules.ResearchHubEducator = { __pending: true };
  if (!window.ResearchHub || typeof window.ResearchHub.registerEducatorView !== 'function') {
    // The hub and its plugins load concurrently, so completion order is
    // network-dependent. NOTE: this branch used `arguments.callee`, which
    // THROWS in the strict-mode build the moment this file beats the hub —
    // recurse via the named IIFE instead, bounded so a permanently missing
    // hub can't spin forever.
    if (retriesLeft === undefined) retriesLeft = 50; // ≈10s at 200ms
    if (retriesLeft <= 0) {
      console.error('[ResearchHubEducator] window.ResearchHub never became available — giving up');
      return;
    }
    console.warn('[ResearchHubEducator] window.ResearchHub.registerEducatorView not yet available — deferring');
    setTimeout(function () { initResearchHubEducator(retriesLeft - 1); }, 200);
    return;
  }

  var React = window.React;
  if (!React) { console.error('[ResearchHubEducator] React not found'); return; }
  var useState = React.useState;
  var useMemo = React.useMemo;

  // ───────────────────────────────────────────────────────────────────────
  // Small helpers
  // ───────────────────────────────────────────────────────────────────────
  function fmtTime(ts) {
    if (!ts) return '?';
    try { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    catch (_) { return '?'; }
  }
  function fmtDuration(ms) {
    if (!ms || ms < 0) return '0 min';
    var min = Math.round(ms / 60000);
    if (min < 60) return min + ' min';
    return Math.floor(min / 60) + 'h ' + (min % 60) + 'm';
  }
  function laneLabel(id) {
    if (id === 'scientific') return 'Scientific Inquiry';
    if (id === 'engineering') return 'Engineering Design';
    if (id === 'humanities') return 'Humanities & Social Research';
    return id || 'no active lane';
  }
  function methodPackLabel(id) {
    var labels = {
      scientific_investigation: 'Scientific Investigation',
      engineering_design: 'Engineering Design',
      humanistic_interpretation: 'Humanistic Interpretation',
      community_qualitative: 'Community & Qualitative Inquiry',
      civic_policy: 'Civic & Policy Inquiry',
      creative_cultural: 'Creative & Cultural Inquiry',
    };
    return labels[id] || id || 'no approach selected';
  }  function clip(s, n) { if (!s || typeof s !== 'string') return ''; return s.length <= n ? s : s.slice(0, n) + '…'; }

  // ───────────────────────────────────────────────────────────────────────
  // Header — student / question / lane / active time / loop-back count
  // ───────────────────────────────────────────────────────────────────────
  function DashboardHeader(props) {
    var j = props.journal;
    var startMs = j.sessionStartedAt || j.createdAt || Date.now();
    var elapsed = Date.now() - startMs;
    return (
      <div style={{
        padding: '14px 16px', borderRadius: '14px',
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
        color: '#fff',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: '12px', flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: '220px' }}>
          <div style={{ fontSize: '11px', opacity: 0.7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Inquiry Health
          </div>
          <div style={{ fontSize: '15px', fontWeight: 800, marginTop: '2px' }}>
            {j.questionTitle ? clip(j.questionTitle, 80) : <em style={{ opacity: 0.7 }}>(no question authored yet)</em>}
          </div>
          <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '4px' }}>
            Lane: <strong>{laneLabel(j.activeLane)}</strong>
            <span> · Approach: <strong>{methodPackLabel(j.activeMethodPack)}</strong></span>
            {j.activeStage && (<span> · Stage: <strong>{j.activeStage}</strong></span>)}
            <span> · Active: <strong>{fmtDuration(elapsed)}</strong></span>
            <span> · Loop-backs: <strong>{(j.loopBacks || []).length}</strong></span>
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // Grading principle banner — anchors every other panel
  // ───────────────────────────────────────────────────────────────────────
  function GradingPrincipleBanner() {
    return (
      <div style={{
        padding: '12px 14px', borderRadius: '12px',
        background: '#ecfdf5', border: '1px solid #6ee7b7',
        fontSize: '12px', color: '#065f46', lineHeight: 1.55,
      }}>
        <strong>
          <span aria-hidden="true">{'\u{1F3AF} '}</span>
          Grade FROM the trajectories below.
        </strong>{' '}
        A clean walk through every stage with zero loop-backs is{' '}
        <strong>worse</strong> inquiry than three failure-loops with measured revisions. Polish is not rigor.
        Loop-backs, qualifier contractions, and source tier downgrades are evidence of real thinking — never penalize them.
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // Scientific lane — model trajectory
  // ───────────────────────────────────────────────────────────────────────
  function ModelTrajectoryPanel(props) {
    var j = props.journal;
    var snaps = j.modelSnapshots || [];
    var claims = j.claims || [];
    if (snaps.length === 0) {
      return EmptyTrajectory('Model trajectory', 'modelSnapshots[] is empty. Student has not saved a model yet.');
    }
    return (
      <Panel title="Model trajectory" subtitle={snaps.length + ' snapshot(s)'}>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
          {snaps.map(function (s, i) {
            var prior = i > 0 ? snaps[i - 1] : null;
            var hasLoopOrigin = !!(s.loopBackOrigin && s.loopBackOrigin.fromStage);
            var confDelta = prior && prior.confidence !== s.confidence ?
              (prior.confidence + ' → ' + s.confidence) : null;
            return (
              <div key={i} style={{
                flexShrink: 0, padding: '8px 10px', borderRadius: '10px',
                background: '#fff', border: '1px solid ' + (hasLoopOrigin ? '#a855f7' : '#cbd5e1'),
                minWidth: '160px', maxWidth: '240px',
              }}>
                <div style={{ fontSize: '10px', color: '#7c3aed', fontWeight: 800 }}>
                  v{s.v}{hasLoopOrigin && <span aria-hidden="true" style={{ marginLeft: '4px' }}>{'\u{1F501}'}</span>}
                  <span style={{ color: '#64748b', fontWeight: 400, marginLeft: '6px' }}>· {fmtTime(s.ts)}</span>
                </div>
                <div style={{ marginTop: '4px', fontSize: '11px', color: '#1e293b', lineHeight: 1.4,
                  display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {s.text || ''}
                </div>
                <div style={{ marginTop: '4px', fontSize: '10px', color: '#475569' }}>
                  confidence: {s.confidence || '?'}
                  {confDelta && <span style={{ marginLeft: '6px', color: '#7c3aed', fontStyle: 'italic' }}>({confDelta})</span>}
                </div>
                {s.knownUnknowns && (
                  <div style={{ marginTop: '4px', fontSize: '10px', color: '#475569', fontStyle: 'italic' }}>
                    unknowns: {clip(s.knownUnknowns, 60)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {claims.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            <strong style={{ fontSize: '11px', color: '#475569' }}>Final claims ({claims.length}):</strong>
            <ul style={{ margin: '4px 0 0', paddingLeft: '20px', fontSize: '11px', color: '#1e293b' }}>
              {claims.map(function (c, i) {
                return (
                  <li key={i}>
                    {clip(c.text, 100)}
                    {c.label && (<span style={{ marginLeft: '6px', color: c.staleLabel ? '#b45309' : '#16a34a', fontWeight: 700 }}>
                      [{c.label}{c.staleLabel ? ' — STALE' : ''}]
                    </span>)}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <Note>v:1 vs v:N delta is the artifact — not v:N alone. Confidence movement (high→medium IS revision) and {'\u{1F501}'} loop-origin badges show real thinking.</Note>
      </Panel>
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // Engineering lane — build × failure trajectory
  // ───────────────────────────────────────────────────────────────────────
  function BuildTestTrajectoryPanel(props) {
    var j = props.journal;
    var builds = j.buildLog || [];
    var runs = j.testRun || [];
    var failureLog = j.failureLog || [];
    var criteriaWeightLog = j.criteriaWeightLog || [];
    var designClaims = j.designClaims || [];
    if (builds.length === 0) {
      return EmptyTrajectory('Build × failure trajectory', 'buildLog[] is empty. Student has not logged a build yet.');
    }
    var weightGameFlag = criteriaWeightLog.some(function (e) { return e.afterMatrixFilled; });
    return (
      <Panel title="Build × failure trajectory" subtitle={builds.length + ' build(s), ' + failureLog.length + ' failure-loop(s)'}>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
          {builds.map(function (b) {
            var bRuns = runs.filter(function (r) { return r.buildLogV === b.v; });
            var passes = bRuns.filter(function (r) { return r.passed === true; }).length;
            var fails = bRuns.filter(function (r) { return r.passed === false; }).length;
            var hasLoopOrigin = !!(b.loopBackOrigin && b.loopBackOrigin.fromStage);
            var linkedFail = failureLog.filter(function (f) {
              return bRuns.some(function (r) { return r.id === f.fromTestRunId; });
            }).length;
            return (
              <div key={b.v} style={{
                flexShrink: 0, padding: '8px 10px', borderRadius: '10px',
                background: '#fff', border: '1px solid ' + (hasLoopOrigin ? '#b45309' : '#cbd5e1'),
                minWidth: '160px', maxWidth: '220px',
              }}>
                <div style={{ fontSize: '10px', color: '#b45309', fontWeight: 800 }}>
                  v{b.v}{hasLoopOrigin && <span aria-hidden="true" style={{ marginLeft: '4px' }}>{'\u{1F501}'}</span>}
                  <span style={{ color: '#64748b', fontWeight: 400, marginLeft: '6px' }}>· {fmtTime(b.ts)}</span>
                </div>
                <div style={{ marginTop: '4px', fontSize: '11px', color: '#1e293b', lineHeight: 1.4,
                  display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {b.buildText || ''}
                </div>
                <div style={{ marginTop: '4px', display: 'flex', gap: '6px', fontSize: '10px' }}>
                  {passes > 0 && (<span style={{ color: '#16a34a', fontWeight: 700 }}>{passes} pass</span>)}
                  {fails > 0 && (<span style={{ color: '#dc2626', fontWeight: 700 }}>{fails} fail</span>)}
                  {linkedFail > 0 && (<span style={{ color: '#b45309', fontWeight: 700 }}>{'\u{1F501} ' + linkedFail}</span>)}
                </div>
              </div>
            );
          })}
        </div>
        {failureLog.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            <strong style={{ fontSize: '11px', color: '#475569' }}>Failure loops ({failureLog.length}):</strong>
            <ul style={{ margin: '4px 0 0', paddingLeft: '20px', fontSize: '11px', color: '#1e293b' }}>
              {failureLog.map(function (f, i) {
                var src = (j.testRun || []).filter(function (r) { return r.id === f.fromTestRunId; })[0];
                var retest = f.retestRunId ? (j.testRun || []).filter(function (r) { return r.id === f.retestRunId; })[0] : null;
                var deltaText = '';
                if (src && retest && Number.isFinite(src.measured) && Number.isFinite(retest.measured) && src.measured !== 0) {
                  var rel = (retest.measured - src.measured) / Math.abs(src.measured);
                  deltaText = ' · Δ ' + (rel * 100).toFixed(1) + '%';
                }
                return (
                  <li key={i}>
                    <em>{clip(f.modeText, 60)}</em>{deltaText}
                    {f.predictionVsRealityRadio && (
                      <span style={{ marginLeft: '6px',
                        color: f.predictionVsRealityRadio === 'confirmed' ? '#16a34a' :
                               f.predictionVsRealityRadio === 'refuted' ? '#dc2626' : '#d97706',
                        fontWeight: 700 }}>
                        [{f.predictionVsRealityRadio}]
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {weightGameFlag && (
          <div role="alert" style={{ marginTop: '8px', padding: '8px 10px', borderRadius: '8px',
            background: '#fef3c7', border: '1px solid #fbbf24',
            fontSize: '11px', color: '#92400e' }}>
            <strong>{'\u{26A0}\u{FE0F} '}criteriaWeightLog flag:</strong> at least one weight changed AFTER the decision matrix was filled (potential weight-gaming pattern; ask student to walk through why).
          </div>
        )}
        {designClaims.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            <strong style={{ fontSize: '11px', color: '#475569' }}>Final design claims ({designClaims.length}):</strong>
            <ul style={{ margin: '4px 0 0', paddingLeft: '20px', fontSize: '11px', color: '#1e293b' }}>
              {designClaims.map(function (c, i) {
                return (
                  <li key={i}>
                    {clip(c.text, 100)}
                    {c.label && (<span style={{ marginLeft: '6px', color: c.staleLabel ? '#b45309' : '#16a34a', fontWeight: 700 }}>
                      [{c.label}{c.staleLabel ? ' — STALE' : ''}]
                    </span>)}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <Note>Failure loops with predictionVsRealityRadio set to refuted/partially are HONEST RECONCILIATIONS. A clean v:1-meets-all-criteria session is usually the UNDER-iterated submission.</Note>
      </Panel>
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // Humanities lane — warrant trajectory (THE assessment artifact)
  // ───────────────────────────────────────────────────────────────────────
  function WarrantTrajectoryPanel(props) {
    var j = props.journal;
    var links = j.claimEvidenceLinks || [];
    var sources = j.sources || [];
    var probes = j.framingProbes || [];
    var positionalitySnapshots = j.positionalitySnapshots || [];
    var compositions = j.compositions || [];
    if (links.length === 0 && sources.length === 0) {
      return EmptyTrajectory('Warrant trajectory', 'No claim-evidence links or sources yet — student has not started the humanities lane.');
    }
    // Per-link metrics
    var qualifierContractionsTotal = 0;
    var warrantRevisionsTotal = 0;
    links.forEach(function (l) {
      qualifierContractionsTotal += (l.qualifierRevisionLog || []).length;
      warrantRevisionsTotal += (l.warrantRevisionLog || []).length;
    });
    // Source tier movement
    var tierDowngrades = 0, tierPromotions = 0, failedSIFT = 0;
    sources.forEach(function (s) {
      var hist = (s.sift && s.sift.tierHistory) || [];
      hist.forEach(function (h) {
        var fromRank = ['unvetted','secondary_uncorroborated','opinion_disclosed','secondary_corroborated','primary_corroborated'].indexOf(h.fromTier || 'unvetted');
        var toRank = ['unvetted','secondary_uncorroborated','opinion_disclosed','secondary_corroborated','primary_corroborated'].indexOf(h.toTier || 'unvetted');
        if (h.toTier === 'failed_SIFT') failedSIFT++;
        else if (toRank > fromRank) tierPromotions++;
        else if (toRank < fromRank && fromRank >= 0) tierDowngrades++;
      });
    });
    // Framing probe distribution
    var byVerdict = { warrant_survives: 0, warrant_contracts: 0, warrant_fails: 0 };
    probes.forEach(function (p) { if (byVerdict.hasOwnProperty(p.verdict)) byVerdict[p.verdict]++; });
    var allSurvivesFlag = probes.length > 0 && probes.every(function (p) { return p.verdict === 'warrant_survives'; }) &&
      !probes.every(function (p) { return p.allSurvivesJustification && p.allSurvivesJustification.length >= 120; });

    return (
      <Panel title="Warrant trajectory" subtitle={
        qualifierContractionsTotal + ' qualifier contraction(s), ' +
        warrantRevisionsTotal + ' warrant revision(s), ' +
        positionalitySnapshots.length + ' positionality snapshot(s)'}>
        <div data-humanities-source-context-health="true" style={{ marginBottom: '9px', padding: '7px 9px', borderRadius: '8px', background: '#faf5ff', border: '1px solid #d8b4fe', fontSize: '10px', color: '#6b21a8' }}>
          <strong>Humanistic source context:</strong> {sources.filter(function (s) { var c = s.humanitiesContext || {}; return c.relationshipType && c.historicalContext; }).length}/{sources.length} sources identify their relationship and historical/material context; {sources.filter(function (s) { var r = (s.humanitiesContext || {}).inquiryRelationship; return r === 'challenges' || r === 'complicates'; }).length} challenge or complicate the current position.
        </div>        {/* Source tier movement */}
        <div style={{ marginBottom: '10px' }}>
          <strong style={{ fontSize: '11px', color: '#475569' }}>Source tier movement:</strong>
          <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            <Pill color="#16a34a" label={tierPromotions + ' promotion(s)'} />
            <Pill color="#d97706" label={tierDowngrades + ' downgrade(s) — good data'} />
            <Pill color="#dc2626" label={failedSIFT + ' failed SIFT'} />
          </div>
          <Note small>Downgrades and failed-SIFT entries are the lateral reading working as intended. Never penalize them.</Note>
        </div>
        {/* Per-link trajectory */}
        {links.map(function (l) {
          var qLog = l.qualifierRevisionLog || [];
          var wLog = l.warrantRevisionLog || [];
          var linkProbes = probes.filter(function (p) { return p.linkId === l.id; });
          return (
            <div key={l.id} style={{ marginBottom: '8px', padding: '8px 10px',
              borderRadius: '8px', background: '#fdf2f8', border: '1px solid #fbcfe8' }}>
              <div style={{ fontSize: '11px', color: '#9d174d', fontWeight: 700 }}>
                Link · warrant: {clip(l.warrant, 80)}
              </div>
              <div style={{ marginTop: '4px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {qLog.map(function (q, qi) {
                  return <Pill key={'q' + qi} color="#d97706"
                    label={'qual v' + (qi + 2) + (q.deltaJaccard != null ? (' Δ' + (q.deltaJaccard).toFixed(2)) : '')} />;
                })}
                {wLog.map(function (w, wi) {
                  return <Pill key={'w' + wi} color="#a855f7"
                    label={'warrant v' + (wi + 2)} />;
                })}
                {linkProbes.map(function (p, pi) {
                  var color = p.verdict === 'warrant_survives' ? '#16a34a' :
                              p.verdict === 'warrant_contracts' ? '#d97706' : '#dc2626';
                  return <Pill key={'p' + pi} color={color}
                    label={p.verdict.replace('warrant_', '')} />;
                })}
              </div>
            </div>
          );
        })}
        {/* Framing probe distribution */}
        {probes.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            <strong style={{ fontSize: '11px', color: '#475569' }}>Framing probes ({probes.length}):</strong>
            <div style={{ marginTop: '4px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              <Pill color="#16a34a" label={byVerdict.warrant_survives + ' survives'} />
              <Pill color="#d97706" label={byVerdict.warrant_contracts + ' contracts'} />
              <Pill color="#dc2626" label={byVerdict.warrant_fails + ' fails'} />
            </div>
            {allSurvivesFlag && (
              <div role="alert" style={{ marginTop: '6px', padding: '6px 8px', borderRadius: '6px',
                background: '#fef3c7', border: '1px solid #fbbf24',
                fontSize: '11px', color: '#92400e' }}>
                <strong>{'\u{26A0}\u{FE0F} '}All-survives without justification:</strong> Every framing probe verdict is "warrant survives" but no allSurvivesJustification ≥120c was authored. Frameworks usually contract under at least one alternative — ask student why theirs did not.
              </div>
            )}
          </div>
        )}
        {/* Foreclosure Coda completeness */}
        {compositions.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            <strong style={{ fontSize: '11px', color: '#475569' }}>Composition + Foreclosure Coda:</strong>
            <ul style={{ margin: '4px 0 0', paddingLeft: '20px', fontSize: '11px', color: '#1e293b' }}>
              {compositions.map(function (c, i) {
                var av = j.absentVoices || [];
                var coda = c.foreclosureCodaText || '';
                var avMissing = av.filter(function (a) { return a.whoseVoiceText && coda.indexOf(a.whoseVoiceText.slice(0, 20)) === -1; }).length;
                return (
                  <li key={i}>
                    v{c.v} · genre: {c.genreChoice} ·{' '}
                    <span style={{ color: avMissing > 0 ? '#dc2626' : '#16a34a' }}>
                      Foreclosure Coda {avMissing > 0 ? 'missing ' + avMissing + ' absent voice(s)' : 'complete'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <Note>qualifierRevisionLog is THE assessment artifact for humanities. Multiple contractions under framing pressure = real warrant work. Source tier downgrades are good data; never penalize.</Note>
      </Panel>
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // Cross-lane — loop-back density + AI usage shape
  // ───────────────────────────────────────────────────────────────────────
  function LoopBackPanel(props) {
    var j = props.journal;
    var loops = j.loopBacks || [];
    if (loops.length === 0) {
      return EmptyTrajectory('Loop-back trajectory', 'No loop-backs yet. Loop-backs are how rigor accumulates — encourage student to revise when evidence demands it.');
    }
    // Distribution by whyChipId
    var dist = {};
    loops.forEach(function (l) {
      var c = l.whyChipId || 'unspecified';
      dist[c] = (dist[c] || 0) + 1;
    });
    var returnedCount = loops.filter(function (l) { return l.returnedToOrigin; }).length;
    var chips = Object.keys(dist).sort(function (a, b) { return dist[b] - dist[a]; });
    return (
      <Panel title="Loop-back trajectory" subtitle={loops.length + ' loop-back(s), ' + returnedCount + ' returned-to-origin'}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {chips.map(function (c) {
            return <Pill key={c} color="#7c3aed" label={c + ' × ' + dist[c]} />;
          })}
        </div>
        <Note>returnedToOrigin shows the student came back with revised work — confirms the loop completed. Frequent chips reveal coaching opportunities.</Note>
      </Panel>
    );
  }

  function AiUsagePanel(props) {
    var j = props.journal;
    var hist = j.aiHistory || [];
    if (hist.length === 0) {
      return EmptyTrajectory('AI usage trajectory', 'No AI calls yet. Per-session cap is 8. Students who use 0 calls are not worse than students who use 8.');
    }
    var blocked = hist.filter(function (h) { return h.blocked; }).length;
    var ok = hist.length - blocked;
    // Per-touchpoint distribution
    var byTp = {};
    hist.forEach(function (h) {
      var k = h.touchpoint || 'unknown';
      byTp[k] = (byTp[k] || { ok: 0, blocked: 0 });
      if (h.blocked) byTp[k].blocked++; else byTp[k].ok++;
    });
    // Top bypass signals
    var bypassDist = {};
    hist.forEach(function (h) {
      (h.bypass_signals || []).forEach(function (b) {
        bypassDist[b] = (bypassDist[b] || 0) + 1;
      });
    });
    var topBypass = Object.keys(bypassDist).sort(function (a, b) { return bypassDist[b] - bypassDist[a]; }).slice(0, 4);
    var qFmtRej = hist.reduce(function (sum, h) { return sum + (h.qFormatRejected || 0); }, 0);
    var pasteEvents = (j.authorshipLog || []).length;
    return (
      <Panel title="AI usage trajectory" subtitle={ok + ' completed, ' + blocked + ' blocked-by-gate'}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
          {Object.keys(byTp).sort().map(function (k) {
            var v = byTp[k];
            return (
              <Pill key={k} color="#475569"
                label={k + ': ' + v.ok + (v.blocked > 0 ? '/' + v.blocked + ' blk' : '')} />
            );
          })}
        </div>
        {topBypass.length > 0 && (
          <div style={{ marginTop: '6px' }}>
            <strong style={{ fontSize: '11px', color: '#475569' }}>Top bypass signals (gate-reasons):</strong>
            <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {topBypass.map(function (b) {
                return <Pill key={b} color="#d97706" label={b + ' × ' + bypassDist[b]} />;
              })}
            </div>
          </div>
        )}
        {qFmtRej > 0 && (
          <div style={{ marginTop: '6px', fontSize: '11px', color: '#475569' }}>
            <strong>qFormatRejected count:</strong> {qFmtRej} — substrate-level question-format validator caught AI output drift. Healthy.
          </div>
        )}
        {pasteEvents > 0 && (
          <div role="alert" style={{ marginTop: '8px', padding: '6px 8px', borderRadius: '6px',
            background: '#fef3c7', border: '1px solid #fbbf24',
            fontSize: '11px', color: '#92400e' }}>
            <strong>authorshipLog: {pasteEvents} paste event(s).</strong> Worth discussing with student — where did pasted content come from?
          </div>
        )}
        <Note>Blocked calls are NOT a problem — the student-first gates fired. Compare students by trajectory, not aiCallCount.</Note>
      </Panel>
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // Anti-patterns reminder banner
  // ───────────────────────────────────────────────────────────────────────
  function AntiPatternsBanner() {
    return (
      <details style={{ padding: '10px 12px', borderRadius: '10px',
        background: '#fef2f2', border: '1px solid #fecaca' }}>
        <summary style={{ cursor: 'pointer', fontSize: '11px', fontWeight: 800, color: '#991b1b' }}>
          <span aria-hidden="true">{'\u{1F6AB} '}</span>
          What NOT to grade on (click to expand)
        </summary>
        <ul style={{ margin: '8px 0 0', paddingLeft: '20px', fontSize: '11px', color: '#7f1d1d', lineHeight: 1.6 }}>
          <li>"How polished is the op-ed / model / design" — all three lanes are designed so polish does not require thinking</li>
          <li>Mark down loop-backs — they are <em>the</em> signal of real revision</li>
          <li>Count source tier downgrades as failure — downgrades = lateral reading working as intended</li>
          <li>Treat blocked AI calls as student failure — means the student-first gate enforced thinking-first</li>
          <li>Read bodyText alone — the humanities artifact is bodyText + ForeclosureCoda + warrant trajectory + standpoint snapshots <em>together</em></li>
          <li>Compare students by aiCallCount — the cap is per-session; usage is not a quality signal</li>
        </ul>
      </details>
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // Reusable presentational primitives
  // ───────────────────────────────────────────────────────────────────────
  function Panel(props) {
    return (
      <div style={{ padding: '12px 14px', borderRadius: '12px',
        background: '#fff', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>
            {props.title}
          </h4>
          {props.subtitle && (<span style={{ fontSize: '10px', color: '#64748b', fontStyle: 'italic' }}>{props.subtitle}</span>)}
        </div>
        <div style={{ marginTop: '8px' }}>{props.children}</div>
      </div>
    );
  }
  function Pill(props) {
    return (
      <span style={{ padding: '2px 8px', borderRadius: '999px',
        background: props.color + '22', color: props.color, border: '1px solid ' + props.color,
        fontSize: '10px', fontWeight: 700 }}>
        {props.label}
      </span>
    );
  }
  function Note(props) {
    return (
      <p style={{ margin: '6px 0 0', fontSize: props.small ? '9px' : '10px',
        color: '#64748b', fontStyle: 'italic', lineHeight: 1.5 }}>
        {props.children}
      </p>
    );
  }
  function EmptyTrajectory(title, body) {
    return (
      <Panel title={title}>
        <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>{body}</p>
      </Panel>
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // Root — picks panels per active lane
  // ───────────────────────────────────────────────────────────────────────
  function MethodProvenancePanel(props) {
    var j = props.journal;
    var episodes = j.inquiryEpisodes || [];
    var artifacts = j.capturedArtifacts || [];
    var frame = (j.stageNotes || {}).frame_question || {};
    var qualitative = frame.qualitativeMethod || null;
    var creative = frame.creativeMethod || null;
    return (
      <Panel title="Method, episodes, and tool provenance">
        <div style={{ fontSize: '11px', color: '#475569', lineHeight: 1.55 }}>
          <strong>Current approach:</strong> {methodPackLabel(j.activeMethodPack)}
          <span> · Episodes: <strong>{episodes.length}</strong></span>
          <span> · Approved tool artifacts: <strong>{artifacts.length}</strong></span>
        </div>
        {episodes.length > 0 && (
          <ol style={{ margin: '9px 0 0', paddingLeft: '20px', fontSize: '10px', color: '#475569' }}>
            {episodes.slice(-8).map(function (episode) {
              return <li key={episode.id}><strong>{methodPackLabel(episode.methodPackId)}</strong> · {fmtTime(episode.startedAt)}{episode.questionAtStart ? ' · “' + clip(episode.questionAtStart, 70) + '”' : ''}</li>;
            })}
          </ol>
        )}
        {artifacts.length > 0 && (
          <div style={{ marginTop: '10px', display: 'grid', gap: '6px' }}>
            {artifacts.slice(-6).map(function (artifact) {
              return (
                <div key={artifact.id} style={{ padding: '8px', borderRadius: '9px', border: '1px solid #cbd5e1', background: '#f8fafc' }}>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: '#1e293b' }}>{artifact.title}</div>
                  <div style={{ fontSize: '9px', color: '#64748b' }}>{artifact.sourceToolName || artifact.sourceToolId} · {methodPackLabel(artifact.methodPackId)}</div>
                  {artifact.learnerNote && <div style={{ marginTop: '3px', fontSize: '10px', color: '#334155' }}><strong>Learner interpretation:</strong> {clip(artifact.learnerNote, 220)}</div>}
                  {artifact.uncertaintyNote && <div style={{ marginTop: '3px', fontSize: '10px', color: '#92400e' }}><strong>Uncertainty:</strong> {clip(artifact.uncertaintyNote, 220)}</div>}
                </div>
              );
            })}
          </div>
        )}
        {qualitative && <div style={{ marginTop: '9px', padding: '8px', borderRadius: '9px', background: '#fdf2f8', fontSize: '10px', color: '#831843' }}><strong>Qualitative plan:</strong> boundary {qualitative.evidenceBoundary || 'not selected'}; safeguarding {qualitative.safeguardingAcknowledged ? 'acknowledged' : 'not yet acknowledged'}; selection rationale {qualitative.selectionRationale ? 'present' : 'missing'}; discrepant-case plan {qualitative.discrepantCasePlan ? 'present' : 'missing'}.</div>}
        {creative && <div style={{ marginTop: '9px', padding: '8px', borderRadius: '9px', background: '#fff7ed', fontSize: '10px', color: '#9a3412' }}><strong>Creative/cultural plan:</strong> mode {creative.inquiryMode || 'not selected'}; attribution plan {creative.attributionPlan ? 'present' : 'missing'}; critique plan {creative.critiquePlan ? 'present' : 'missing'}.</div>}
        {!episodes.length && !artifacts.length && !qualitative && !creative && <p style={{ margin: '8px 0 0', fontSize: '10px', color: '#64748b', fontStyle: 'italic' }}>No method episode or cross-tool provenance has been recorded yet.</p>}
      </Panel>
    );
  }
  function IntegrationHealthPanel(props) {
    var artifacts = props.journal.capturedArtifacts || [];
    var helper = window.ResearchHub && window.ResearchHub.helpers && window.ResearchHub.helpers.assessResearchArtifactIntegration;
    if (!artifacts.length) return EmptyTrajectory('Open-source integration health', 'No approved tool artifacts yet. Contract, license, citation, and reproducibility checks appear here after capture.');
    var rows = artifacts.map(function (artifact) {
      var health = typeof helper === 'function' ? helper(artifact) : (artifact.integrationHealth || { status: 'needs_review', issues: [] });
      return { artifact: artifact, health: health };
    });
    var healthy = rows.filter(function (row) { return row.health.status === 'healthy'; }).length;
    var review = rows.filter(function (row) { return row.health.status === 'needs_review'; }).length;
    var action = rows.filter(function (row) { return row.health.status === 'action_needed'; }).length;
    return (
      <Panel title="Open-source integration health" subtitle={healthy + ' healthy · ' + review + ' review · ' + action + ' action needed'}>
        <div data-educator-integration-health="true" style={{ display: 'grid', gap: '7px' }}>
          {rows.slice(-10).map(function (row) {
            var artifact = row.artifact;
            var contract = artifact.integrationContract || {};
            var receipt = artifact.reproducibilityReceipt || {};
            var color = row.health.status === 'healthy' ? '#16a34a' : row.health.status === 'action_needed' ? '#dc2626' : '#d97706';
            return (
              <div key={artifact.id} style={{ padding: '8px 10px', borderRadius: '9px', border: '1px solid ' + color, background: color + '0d' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '10px', color: '#1e293b' }}>{artifact.sourceToolName || artifact.sourceToolId} · {artifact.sourceToolVersion || 'version unknown'}</strong>
                  <span style={{ fontSize: '9px', fontWeight: 900, color: color }}>{row.health.status.replace('_', ' ')}</span>
                </div>
                <div style={{ marginTop: '3px', fontSize: '9px', color: '#64748b' }}>
                  Contract v{contract.schemaVersion || '?'} · license: {(contract.license && (contract.license.spdx || contract.license.name)) || 'missing'} · citation: {contract.citation && contract.citation.text ? 'declared' : 'missing'} · reproducibility: {receipt.status || 'missing'}
                </div>
                {receipt.missingFields && receipt.missingFields.length > 0 && <div style={{ marginTop: '3px', fontSize: '9px', color: '#92400e' }}><strong>Receipt gaps:</strong> {receipt.missingFields.join(', ')}</div>}
                {row.health.issues && row.health.issues.length > 0 && <ul style={{ margin: '4px 0 0', paddingLeft: '17px', fontSize: '9px', color: '#475569' }}>{row.health.issues.map(function (issue) { return <li key={issue.code}>{issue.message}</li>; })}</ul>}
              </div>
            );
          })}
        </div>
        <Note>Health reflects declared metadata and portfolio completeness; it does not independently certify a tool’s scientific validity or security.</Note>
      </Panel>
    );
  }
  function DashboardRoot(props) {
    var ctx = props.ctx;
    var t = ctx.t;
    var j = ctx.journal;
    var onExit = ctx.onExit;
    var lane = j.activeLane;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <DashboardHeader journal={j} />
        <button type="button" onClick={onExit}
          style={{ alignSelf: 'flex-start',
            padding: '4px 12px', borderRadius: '999px',
            background: '#f1f5f9', color: '#475569', border: 'none',
            fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
          {'\u{2190} '}{t('research_hub.educator_view_exit') || 'Return to student view'}
        </button>

        <GradingPrincipleBanner />
        <MethodProvenancePanel journal={j} />
        <IntegrationHealthPanel journal={j} />

        {/* Lane-specific trajectory */}
        {lane === 'scientific' && <ModelTrajectoryPanel journal={j} />}
        {lane === 'engineering' && <BuildTestTrajectoryPanel journal={j} />}
        {lane === 'humanities' && <WarrantTrajectoryPanel journal={j} />}
        {!lane && (
          <div style={{ padding: '12px', borderRadius: '12px',
            background: '#f8fafc', border: '1px solid #cbd5e1',
            fontSize: '11px', color: '#475569', fontStyle: 'italic' }}>
            No active lane. Cross-lane panels below still show loop-back density and AI usage shape across whichever lanes the student has worked in.
          </div>
        )}

        {/* Cross-lane panels (always shown) */}
        <LoopBackPanel journal={j} />
        <AiUsagePanel journal={j} />

        {/* If the student worked in multiple lanes, also show the others' headlines */}
        {lane !== 'scientific' && (j.modelSnapshots || []).length > 0 && (
          <ModelTrajectoryPanel journal={j} />
        )}
        {lane !== 'engineering' && (j.buildLog || []).length > 0 && (
          <BuildTestTrajectoryPanel journal={j} />
        )}
        {lane !== 'humanities' && ((j.claimEvidenceLinks || []).length > 0 || (j.sources || []).length > 0) && (
          <WarrantTrajectoryPanel journal={j} />
        )}

        <AntiPatternsBanner />
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // Register
  // ───────────────────────────────────────────────────────────────────────
  window.ResearchHub.registerEducatorView({
    label: 'Inquiry Health Dashboard',
    render: function (ctx) {
      return <DashboardRoot ctx={ctx} />;
    },
    __tier: 2,
  });

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.ResearchHubEducator = { __tier: 2 };

  console.log('[CDN] ResearchHubEducator loaded (Tier 2)');
})();
