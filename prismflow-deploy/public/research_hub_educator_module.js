(function initResearchHubEducator(retriesLeft) {
  "use strict";
  if (window.AlloModules && window.AlloModules.ResearchHubEducator && window.AlloModules.ResearchHubEducator.__tier >= 2) {
    console.log("[CDN] ResearchHubEducator already loaded, skipping");
    return;
  }
  window.AlloModules = window.AlloModules || {};
  if (!window.AlloModules.ResearchHubEducator) window.AlloModules.ResearchHubEducator = { __pending: true };
  if (!window.ResearchHub || typeof window.ResearchHub.registerEducatorView !== "function") {
    if (retriesLeft === void 0) retriesLeft = 50;
    if (retriesLeft <= 0) {
      console.error("[ResearchHubEducator] window.ResearchHub never became available \u2014 giving up");
      return;
    }
    console.warn("[ResearchHubEducator] window.ResearchHub.registerEducatorView not yet available \u2014 deferring");
    setTimeout(function() {
      initResearchHubEducator(retriesLeft - 1);
    }, 200);
    return;
  }
  var React = window.React;
  if (!React) {
    console.error("[ResearchHubEducator] React not found");
    return;
  }
  var useState = React.useState;
  var useMemo = React.useMemo;
  function fmtTime(ts) {
    if (!ts) return "?";
    try {
      return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch (_) {
      return "?";
    }
  }
  function fmtDuration(ms) {
    if (!ms || ms < 0) return "0 min";
    var min = Math.round(ms / 6e4);
    if (min < 60) return min + " min";
    return Math.floor(min / 60) + "h " + min % 60 + "m";
  }
  function laneLabel(id) {
    if (id === "scientific") return "Scientific Inquiry";
    if (id === "engineering") return "Engineering Design";
    if (id === "humanities") return "Humanities & Social Research";
    return id || "no active lane";
  }
  function methodPackLabel(id) {
    var labels = {
      scientific_investigation: "Scientific Investigation",
      engineering_design: "Engineering Design",
      humanistic_interpretation: "Humanistic Interpretation",
      community_qualitative: "Community & Qualitative Inquiry",
      civic_policy: "Civic & Policy Inquiry",
      creative_cultural: "Creative & Cultural Inquiry"
    };
    return labels[id] || id || "no approach selected";
  }
  function clip(s, n) {
    if (!s || typeof s !== "string") return "";
    return s.length <= n ? s : s.slice(0, n) + "\u2026";
  }
  function DashboardHeader(props) {
    var j = props.journal;
    var startMs = j.sessionStartedAt || j.createdAt || Date.now();
    var elapsed = Date.now() - startMs;
    return /* @__PURE__ */ React.createElement("div", { style: {
      padding: "14px 16px",
      borderRadius: "14px",
      background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
      color: "#fff",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "12px",
      flexWrap: "wrap"
    } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: "220px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", opacity: 0.7, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" } }, "Inquiry Health"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "15px", fontWeight: 800, marginTop: "2px" } }, j.questionTitle ? clip(j.questionTitle, 80) : /* @__PURE__ */ React.createElement("em", { style: { opacity: 0.7 } }, "(no question authored yet)")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", opacity: 0.8, marginTop: "4px" } }, "Lane: ", /* @__PURE__ */ React.createElement("strong", null, laneLabel(j.activeLane)), /* @__PURE__ */ React.createElement("span", null, " \xB7 Approach: ", /* @__PURE__ */ React.createElement("strong", null, methodPackLabel(j.activeMethodPack))), j.activeStage && /* @__PURE__ */ React.createElement("span", null, " \xB7 Stage: ", /* @__PURE__ */ React.createElement("strong", null, j.activeStage)), /* @__PURE__ */ React.createElement("span", null, " \xB7 Active: ", /* @__PURE__ */ React.createElement("strong", null, fmtDuration(elapsed))), /* @__PURE__ */ React.createElement("span", null, " \xB7 Loop-backs: ", /* @__PURE__ */ React.createElement("strong", null, (j.loopBacks || []).length)))));
  }
  function GradingPrincipleBanner() {
    return /* @__PURE__ */ React.createElement("div", { style: {
      padding: "12px 14px",
      borderRadius: "12px",
      background: "#ecfdf5",
      border: "1px solid #6ee7b7",
      fontSize: "12px",
      color: "#065f46",
      lineHeight: 1.55
    } }, /* @__PURE__ */ React.createElement("strong", null, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F3AF} "), "Grade FROM the trajectories below."), " ", "A clean walk through every stage with zero loop-backs is", " ", /* @__PURE__ */ React.createElement("strong", null, "worse"), " inquiry than three failure-loops with measured revisions. Polish is not rigor. Loop-backs, qualifier contractions, and source tier downgrades are evidence of real thinking \u2014 never penalize them.");
  }
  function ModelTrajectoryPanel(props) {
    var j = props.journal;
    var snaps = j.modelSnapshots || [];
    var claims = j.claims || [];
    if (snaps.length === 0) {
      return EmptyTrajectory("Model trajectory", "modelSnapshots[] is empty. Student has not saved a model yet.");
    }
    return /* @__PURE__ */ React.createElement(Panel, { title: "Model trajectory", subtitle: snaps.length + " snapshot(s)" }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "6px" } }, snaps.map(function(s, i) {
      var prior = i > 0 ? snaps[i - 1] : null;
      var hasLoopOrigin = !!(s.loopBackOrigin && s.loopBackOrigin.fromStage);
      var confDelta = prior && prior.confidence !== s.confidence ? prior.confidence + " \u2192 " + s.confidence : null;
      return /* @__PURE__ */ React.createElement("div", { key: i, style: {
        flexShrink: 0,
        padding: "8px 10px",
        borderRadius: "10px",
        background: "#fff",
        border: "1px solid " + (hasLoopOrigin ? "#a855f7" : "#cbd5e1"),
        minWidth: "160px",
        maxWidth: "240px"
      } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "10px", color: "#7c3aed", fontWeight: 800 } }, "v", s.v, hasLoopOrigin && /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true", style: { marginLeft: "4px" } }, "\u{1F501}"), /* @__PURE__ */ React.createElement("span", { style: { color: "#64748b", fontWeight: 400, marginLeft: "6px" } }, "\xB7 ", fmtTime(s.ts))), /* @__PURE__ */ React.createElement("div", { style: {
        marginTop: "4px",
        fontSize: "11px",
        color: "#1e293b",
        lineHeight: 1.4,
        display: "-webkit-box",
        WebkitLineClamp: 4,
        WebkitBoxOrient: "vertical",
        overflow: "hidden"
      } }, s.text || ""), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "4px", fontSize: "10px", color: "#475569" } }, "confidence: ", s.confidence || "?", confDelta && /* @__PURE__ */ React.createElement("span", { style: { marginLeft: "6px", color: "#7c3aed", fontStyle: "italic" } }, "(", confDelta, ")")), s.knownUnknowns && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "4px", fontSize: "10px", color: "#475569", fontStyle: "italic" } }, "unknowns: ", clip(s.knownUnknowns, 60)));
    })), claims.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "8px" } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "11px", color: "#475569" } }, "Final claims (", claims.length, "):"), /* @__PURE__ */ React.createElement("ul", { style: { margin: "4px 0 0", paddingLeft: "20px", fontSize: "11px", color: "#1e293b" } }, claims.map(function(c, i) {
      return /* @__PURE__ */ React.createElement("li", { key: i }, clip(c.text, 100), c.label && /* @__PURE__ */ React.createElement("span", { style: { marginLeft: "6px", color: c.staleLabel ? "#b45309" : "#16a34a", fontWeight: 700 } }, "[", c.label, c.staleLabel ? " \u2014 STALE" : "", "]"));
    }))), /* @__PURE__ */ React.createElement(Note, null, "v:1 vs v:N delta is the artifact \u2014 not v:N alone. Confidence movement (high\u2192medium IS revision) and ", "\u{1F501}", " loop-origin badges show real thinking."));
  }
  function BuildTestTrajectoryPanel(props) {
    var j = props.journal;
    var builds = j.buildLog || [];
    var runs = j.testRun || [];
    var failureLog = j.failureLog || [];
    var criteriaWeightLog = j.criteriaWeightLog || [];
    var designClaims = j.designClaims || [];
    if (builds.length === 0) {
      return EmptyTrajectory("Build \xD7 failure trajectory", "buildLog[] is empty. Student has not logged a build yet.");
    }
    var weightGameFlag = criteriaWeightLog.some(function(e) {
      return e.afterMatrixFilled;
    });
    return /* @__PURE__ */ React.createElement(Panel, { title: "Build \xD7 failure trajectory", subtitle: builds.length + " build(s), " + failureLog.length + " failure-loop(s)" }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "6px" } }, builds.map(function(b) {
      var bRuns = runs.filter(function(r) {
        return r.buildLogV === b.v;
      });
      var passes = bRuns.filter(function(r) {
        return r.passed === true;
      }).length;
      var fails = bRuns.filter(function(r) {
        return r.passed === false;
      }).length;
      var hasLoopOrigin = !!(b.loopBackOrigin && b.loopBackOrigin.fromStage);
      var linkedFail = failureLog.filter(function(f) {
        return bRuns.some(function(r) {
          return r.id === f.fromTestRunId;
        });
      }).length;
      return /* @__PURE__ */ React.createElement("div", { key: b.v, style: {
        flexShrink: 0,
        padding: "8px 10px",
        borderRadius: "10px",
        background: "#fff",
        border: "1px solid " + (hasLoopOrigin ? "#b45309" : "#cbd5e1"),
        minWidth: "160px",
        maxWidth: "220px"
      } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "10px", color: "#b45309", fontWeight: 800 } }, "v", b.v, hasLoopOrigin && /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true", style: { marginLeft: "4px" } }, "\u{1F501}"), /* @__PURE__ */ React.createElement("span", { style: { color: "#64748b", fontWeight: 400, marginLeft: "6px" } }, "\xB7 ", fmtTime(b.ts))), /* @__PURE__ */ React.createElement("div", { style: {
        marginTop: "4px",
        fontSize: "11px",
        color: "#1e293b",
        lineHeight: 1.4,
        display: "-webkit-box",
        WebkitLineClamp: 3,
        WebkitBoxOrient: "vertical",
        overflow: "hidden"
      } }, b.buildText || ""), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "4px", display: "flex", gap: "6px", fontSize: "10px" } }, passes > 0 && /* @__PURE__ */ React.createElement("span", { style: { color: "#16a34a", fontWeight: 700 } }, passes, " pass"), fails > 0 && /* @__PURE__ */ React.createElement("span", { style: { color: "#dc2626", fontWeight: 700 } }, fails, " fail"), linkedFail > 0 && /* @__PURE__ */ React.createElement("span", { style: { color: "#b45309", fontWeight: 700 } }, "\u{1F501} " + linkedFail)));
    })), failureLog.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "8px" } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "11px", color: "#475569" } }, "Failure loops (", failureLog.length, "):"), /* @__PURE__ */ React.createElement("ul", { style: { margin: "4px 0 0", paddingLeft: "20px", fontSize: "11px", color: "#1e293b" } }, failureLog.map(function(f, i) {
      var src = (j.testRun || []).filter(function(r) {
        return r.id === f.fromTestRunId;
      })[0];
      var retest = f.retestRunId ? (j.testRun || []).filter(function(r) {
        return r.id === f.retestRunId;
      })[0] : null;
      var deltaText = "";
      if (src && retest && Number.isFinite(src.measured) && Number.isFinite(retest.measured) && src.measured !== 0) {
        var rel = (retest.measured - src.measured) / Math.abs(src.measured);
        deltaText = " \xB7 \u0394 " + (rel * 100).toFixed(1) + "%";
      }
      return /* @__PURE__ */ React.createElement("li", { key: i }, /* @__PURE__ */ React.createElement("em", null, clip(f.modeText, 60)), deltaText, f.predictionVsRealityRadio && /* @__PURE__ */ React.createElement("span", { style: {
        marginLeft: "6px",
        color: f.predictionVsRealityRadio === "confirmed" ? "#16a34a" : f.predictionVsRealityRadio === "refuted" ? "#dc2626" : "#d97706",
        fontWeight: 700
      } }, "[", f.predictionVsRealityRadio, "]"));
    }))), weightGameFlag && /* @__PURE__ */ React.createElement("div", { role: "alert", style: {
      marginTop: "8px",
      padding: "8px 10px",
      borderRadius: "8px",
      background: "#fef3c7",
      border: "1px solid #fbbf24",
      fontSize: "11px",
      color: "#92400e"
    } }, /* @__PURE__ */ React.createElement("strong", null, "\u26A0\uFE0F ", "criteriaWeightLog flag:"), " at least one weight changed AFTER the decision matrix was filled (potential weight-gaming pattern; ask student to walk through why)."), designClaims.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "8px" } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "11px", color: "#475569" } }, "Final design claims (", designClaims.length, "):"), /* @__PURE__ */ React.createElement("ul", { style: { margin: "4px 0 0", paddingLeft: "20px", fontSize: "11px", color: "#1e293b" } }, designClaims.map(function(c, i) {
      return /* @__PURE__ */ React.createElement("li", { key: i }, clip(c.text, 100), c.label && /* @__PURE__ */ React.createElement("span", { style: { marginLeft: "6px", color: c.staleLabel ? "#b45309" : "#16a34a", fontWeight: 700 } }, "[", c.label, c.staleLabel ? " \u2014 STALE" : "", "]"));
    }))), /* @__PURE__ */ React.createElement(Note, null, "Failure loops with predictionVsRealityRadio set to refuted/partially are HONEST RECONCILIATIONS. A clean v:1-meets-all-criteria session is usually the UNDER-iterated submission."));
  }
  function WarrantTrajectoryPanel(props) {
    var j = props.journal;
    var links = j.claimEvidenceLinks || [];
    var sources = j.sources || [];
    var probes = j.framingProbes || [];
    var positionalitySnapshots = j.positionalitySnapshots || [];
    var compositions = j.compositions || [];
    if (links.length === 0 && sources.length === 0) {
      return EmptyTrajectory("Warrant trajectory", "No claim-evidence links or sources yet \u2014 student has not started the humanities lane.");
    }
    var qualifierContractionsTotal = 0;
    var warrantRevisionsTotal = 0;
    links.forEach(function(l) {
      qualifierContractionsTotal += (l.qualifierRevisionLog || []).length;
      warrantRevisionsTotal += (l.warrantRevisionLog || []).length;
    });
    var tierDowngrades = 0, tierPromotions = 0, failedSIFT = 0;
    sources.forEach(function(s) {
      var hist = s.sift && s.sift.tierHistory || [];
      hist.forEach(function(h) {
        var fromRank = ["unvetted", "secondary_uncorroborated", "opinion_disclosed", "secondary_corroborated", "primary_corroborated"].indexOf(h.fromTier || "unvetted");
        var toRank = ["unvetted", "secondary_uncorroborated", "opinion_disclosed", "secondary_corroborated", "primary_corroborated"].indexOf(h.toTier || "unvetted");
        if (h.toTier === "failed_SIFT") failedSIFT++;
        else if (toRank > fromRank) tierPromotions++;
        else if (toRank < fromRank && fromRank >= 0) tierDowngrades++;
      });
    });
    var byVerdict = { warrant_survives: 0, warrant_contracts: 0, warrant_fails: 0 };
    probes.forEach(function(p) {
      if (byVerdict.hasOwnProperty(p.verdict)) byVerdict[p.verdict]++;
    });
    var allSurvivesFlag = probes.length > 0 && probes.every(function(p) {
      return p.verdict === "warrant_survives";
    }) && !probes.every(function(p) {
      return p.allSurvivesJustification && p.allSurvivesJustification.length >= 120;
    });
    return /* @__PURE__ */ React.createElement(Panel, { title: "Warrant trajectory", subtitle: qualifierContractionsTotal + " qualifier contraction(s), " + warrantRevisionsTotal + " warrant revision(s), " + positionalitySnapshots.length + " positionality snapshot(s)" }, /* @__PURE__ */ React.createElement("div", { "data-humanities-source-context-health": "true", style: { marginBottom: "9px", padding: "7px 9px", borderRadius: "8px", background: "#faf5ff", border: "1px solid #d8b4fe", fontSize: "10px", color: "#6b21a8" } }, /* @__PURE__ */ React.createElement("strong", null, "Humanistic source context:"), " ", sources.filter(function(s) {
      var c = s.humanitiesContext || {};
      return c.relationshipType && c.historicalContext;
    }).length, "/", sources.length, " sources identify their relationship and historical/material context; ", sources.filter(function(s) {
      var r = (s.humanitiesContext || {}).inquiryRelationship;
      return r === "challenges" || r === "complicates";
    }).length, " challenge or complicate the current position."), "        ", /* @__PURE__ */ React.createElement("div", { style: { marginBottom: "10px" } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "11px", color: "#475569" } }, "Source tier movement:"), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "4px", display: "flex", flexWrap: "wrap", gap: "4px" } }, /* @__PURE__ */ React.createElement(Pill, { color: "#16a34a", label: tierPromotions + " promotion(s)" }), /* @__PURE__ */ React.createElement(Pill, { color: "#d97706", label: tierDowngrades + " downgrade(s) \u2014 good data" }), /* @__PURE__ */ React.createElement(Pill, { color: "#dc2626", label: failedSIFT + " failed SIFT" })), /* @__PURE__ */ React.createElement(Note, { small: true }, "Downgrades and failed-SIFT entries are the lateral reading working as intended. Never penalize them.")), links.map(function(l) {
      var qLog = l.qualifierRevisionLog || [];
      var wLog = l.warrantRevisionLog || [];
      var linkProbes = probes.filter(function(p) {
        return p.linkId === l.id;
      });
      return /* @__PURE__ */ React.createElement("div", { key: l.id, style: {
        marginBottom: "8px",
        padding: "8px 10px",
        borderRadius: "8px",
        background: "#fdf2f8",
        border: "1px solid #fbcfe8"
      } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", color: "#9d174d", fontWeight: 700 } }, "Link \xB7 warrant: ", clip(l.warrant, 80)), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "4px", display: "flex", gap: "4px", flexWrap: "wrap" } }, qLog.map(function(q, qi) {
        return /* @__PURE__ */ React.createElement(
          Pill,
          {
            key: "q" + qi,
            color: "#d97706",
            label: "qual v" + (qi + 2) + (q.deltaJaccard != null ? " \u0394" + q.deltaJaccard.toFixed(2) : "")
          }
        );
      }), wLog.map(function(w, wi) {
        return /* @__PURE__ */ React.createElement(
          Pill,
          {
            key: "w" + wi,
            color: "#a855f7",
            label: "warrant v" + (wi + 2)
          }
        );
      }), linkProbes.map(function(p, pi) {
        var color = p.verdict === "warrant_survives" ? "#16a34a" : p.verdict === "warrant_contracts" ? "#d97706" : "#dc2626";
        return /* @__PURE__ */ React.createElement(
          Pill,
          {
            key: "p" + pi,
            color,
            label: p.verdict.replace("warrant_", "")
          }
        );
      })));
    }), probes.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "8px" } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "11px", color: "#475569" } }, "Framing probes (", probes.length, "):"), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "4px", display: "flex", gap: "4px", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement(Pill, { color: "#16a34a", label: byVerdict.warrant_survives + " survives" }), /* @__PURE__ */ React.createElement(Pill, { color: "#d97706", label: byVerdict.warrant_contracts + " contracts" }), /* @__PURE__ */ React.createElement(Pill, { color: "#dc2626", label: byVerdict.warrant_fails + " fails" })), allSurvivesFlag && /* @__PURE__ */ React.createElement("div", { role: "alert", style: {
      marginTop: "6px",
      padding: "6px 8px",
      borderRadius: "6px",
      background: "#fef3c7",
      border: "1px solid #fbbf24",
      fontSize: "11px",
      color: "#92400e"
    } }, /* @__PURE__ */ React.createElement("strong", null, "\u26A0\uFE0F ", "All-survives without justification:"), ' Every framing probe verdict is "warrant survives" but no allSurvivesJustification \u2265120c was authored. Frameworks usually contract under at least one alternative \u2014 ask student why theirs did not.')), compositions.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "8px" } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "11px", color: "#475569" } }, "Composition + Foreclosure Coda:"), /* @__PURE__ */ React.createElement("ul", { style: { margin: "4px 0 0", paddingLeft: "20px", fontSize: "11px", color: "#1e293b" } }, compositions.map(function(c, i) {
      var av = j.absentVoices || [];
      var coda = c.foreclosureCodaText || "";
      var avMissing = av.filter(function(a) {
        return a.whoseVoiceText && coda.indexOf(a.whoseVoiceText.slice(0, 20)) === -1;
      }).length;
      return /* @__PURE__ */ React.createElement("li", { key: i }, "v", c.v, " \xB7 genre: ", c.genreChoice, " \xB7", " ", /* @__PURE__ */ React.createElement("span", { style: { color: avMissing > 0 ? "#dc2626" : "#16a34a" } }, "Foreclosure Coda ", avMissing > 0 ? "missing " + avMissing + " absent voice(s)" : "complete"));
    }))), /* @__PURE__ */ React.createElement(Note, null, "qualifierRevisionLog is THE assessment artifact for humanities. Multiple contractions under framing pressure = real warrant work. Source tier downgrades are good data; never penalize."));
  }
  function LoopBackPanel(props) {
    var j = props.journal;
    var loops = j.loopBacks || [];
    if (loops.length === 0) {
      return EmptyTrajectory("Loop-back trajectory", "No loop-backs yet. Loop-backs are how rigor accumulates \u2014 encourage student to revise when evidence demands it.");
    }
    var dist = {};
    loops.forEach(function(l) {
      var c = l.whyChipId || "unspecified";
      dist[c] = (dist[c] || 0) + 1;
    });
    var returnedCount = loops.filter(function(l) {
      return l.returnedToOrigin;
    }).length;
    var chips = Object.keys(dist).sort(function(a, b) {
      return dist[b] - dist[a];
    });
    return /* @__PURE__ */ React.createElement(Panel, { title: "Loop-back trajectory", subtitle: loops.length + " loop-back(s), " + returnedCount + " returned-to-origin" }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: "4px" } }, chips.map(function(c) {
      return /* @__PURE__ */ React.createElement(Pill, { key: c, color: "#7c3aed", label: c + " \xD7 " + dist[c] });
    })), /* @__PURE__ */ React.createElement(Note, null, "returnedToOrigin shows the student came back with revised work \u2014 confirms the loop completed. Frequent chips reveal coaching opportunities."));
  }
  function AiUsagePanel(props) {
    var j = props.journal;
    var hist = j.aiHistory || [];
    if (hist.length === 0) {
      return EmptyTrajectory("AI usage trajectory", "No AI calls yet. Per-session cap is 8. Students who use 0 calls are not worse than students who use 8.");
    }
    var blocked = hist.filter(function(h) {
      return h.blocked;
    }).length;
    var ok = hist.length - blocked;
    var byTp = {};
    hist.forEach(function(h) {
      var k = h.touchpoint || "unknown";
      byTp[k] = byTp[k] || { ok: 0, blocked: 0 };
      if (h.blocked) byTp[k].blocked++;
      else byTp[k].ok++;
    });
    var bypassDist = {};
    hist.forEach(function(h) {
      (h.bypass_signals || []).forEach(function(b) {
        bypassDist[b] = (bypassDist[b] || 0) + 1;
      });
    });
    var topBypass = Object.keys(bypassDist).sort(function(a, b) {
      return bypassDist[b] - bypassDist[a];
    }).slice(0, 4);
    var qFmtRej = hist.reduce(function(sum, h) {
      return sum + (h.qFormatRejected || 0);
    }, 0);
    var pasteEvents = (j.authorshipLog || []).length;
    return /* @__PURE__ */ React.createElement(Panel, { title: "AI usage trajectory", subtitle: ok + " completed, " + blocked + " blocked-by-gate" }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "6px" } }, Object.keys(byTp).sort().map(function(k) {
      var v = byTp[k];
      return /* @__PURE__ */ React.createElement(
        Pill,
        {
          key: k,
          color: "#475569",
          label: k + ": " + v.ok + (v.blocked > 0 ? "/" + v.blocked + " blk" : "")
        }
      );
    })), topBypass.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "6px" } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "11px", color: "#475569" } }, "Top bypass signals (gate-reasons):"), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "4px", display: "flex", flexWrap: "wrap", gap: "4px" } }, topBypass.map(function(b) {
      return /* @__PURE__ */ React.createElement(Pill, { key: b, color: "#d97706", label: b + " \xD7 " + bypassDist[b] });
    }))), qFmtRej > 0 && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "6px", fontSize: "11px", color: "#475569" } }, /* @__PURE__ */ React.createElement("strong", null, "qFormatRejected count:"), " ", qFmtRej, " \u2014 substrate-level question-format validator caught AI output drift. Healthy."), pasteEvents > 0 && /* @__PURE__ */ React.createElement("div", { role: "alert", style: {
      marginTop: "8px",
      padding: "6px 8px",
      borderRadius: "6px",
      background: "#fef3c7",
      border: "1px solid #fbbf24",
      fontSize: "11px",
      color: "#92400e"
    } }, /* @__PURE__ */ React.createElement("strong", null, "authorshipLog: ", pasteEvents, " paste event(s)."), " Worth discussing with student \u2014 where did pasted content come from?"), /* @__PURE__ */ React.createElement(Note, null, "Blocked calls are NOT a problem \u2014 the student-first gates fired. Compare students by trajectory, not aiCallCount."));
  }
  function AntiPatternsBanner() {
    return /* @__PURE__ */ React.createElement("details", { style: {
      padding: "10px 12px",
      borderRadius: "10px",
      background: "#fef2f2",
      border: "1px solid #fecaca"
    } }, /* @__PURE__ */ React.createElement("summary", { style: { cursor: "pointer", fontSize: "11px", fontWeight: 800, color: "#991b1b" } }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F6AB} "), "What NOT to grade on (click to expand)"), /* @__PURE__ */ React.createElement("ul", { style: { margin: "8px 0 0", paddingLeft: "20px", fontSize: "11px", color: "#7f1d1d", lineHeight: 1.6 } }, /* @__PURE__ */ React.createElement("li", null, '"How polished is the op-ed / model / design" \u2014 all three lanes are designed so polish does not require thinking'), /* @__PURE__ */ React.createElement("li", null, "Mark down loop-backs \u2014 they are ", /* @__PURE__ */ React.createElement("em", null, "the"), " signal of real revision"), /* @__PURE__ */ React.createElement("li", null, "Count source tier downgrades as failure \u2014 downgrades = lateral reading working as intended"), /* @__PURE__ */ React.createElement("li", null, "Treat blocked AI calls as student failure \u2014 means the student-first gate enforced thinking-first"), /* @__PURE__ */ React.createElement("li", null, "Read bodyText alone \u2014 the humanities artifact is bodyText + ForeclosureCoda + warrant trajectory + standpoint snapshots ", /* @__PURE__ */ React.createElement("em", null, "together")), /* @__PURE__ */ React.createElement("li", null, "Compare students by aiCallCount \u2014 the cap is per-session; usage is not a quality signal")));
  }
  function Panel(props) {
    return /* @__PURE__ */ React.createElement("div", { style: {
      padding: "12px 14px",
      borderRadius: "12px",
      background: "#fff",
      border: "1px solid #e2e8f0"
    } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("h4", { style: { margin: 0, fontSize: "13px", fontWeight: 800, color: "#1e293b" } }, props.title), props.subtitle && /* @__PURE__ */ React.createElement("span", { style: { fontSize: "10px", color: "#64748b", fontStyle: "italic" } }, props.subtitle)), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "8px" } }, props.children));
  }
  function Pill(props) {
    return /* @__PURE__ */ React.createElement("span", { style: {
      padding: "2px 8px",
      borderRadius: "999px",
      background: props.color + "22",
      color: props.color,
      border: "1px solid " + props.color,
      fontSize: "10px",
      fontWeight: 700
    } }, props.label);
  }
  function Note(props) {
    return /* @__PURE__ */ React.createElement("p", { style: {
      margin: "6px 0 0",
      fontSize: props.small ? "9px" : "10px",
      color: "#64748b",
      fontStyle: "italic",
      lineHeight: 1.5
    } }, props.children);
  }
  function EmptyTrajectory(title, body) {
    return /* @__PURE__ */ React.createElement(Panel, { title }, /* @__PURE__ */ React.createElement("p", { style: { margin: 0, fontSize: "11px", color: "#94a3b8", fontStyle: "italic" } }, body));
  }
  function MethodProvenancePanel(props) {
    var j = props.journal;
    var episodes = j.inquiryEpisodes || [];
    var artifacts = j.capturedArtifacts || [];
    var frame = (j.stageNotes || {}).frame_question || {};
    var qualitative = frame.qualitativeMethod || null;
    var creative = frame.creativeMethod || null;
    return /* @__PURE__ */ React.createElement(Panel, { title: "Method, episodes, and tool provenance" }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", color: "#475569", lineHeight: 1.55 } }, /* @__PURE__ */ React.createElement("strong", null, "Current approach:"), " ", methodPackLabel(j.activeMethodPack), /* @__PURE__ */ React.createElement("span", null, " \xB7 Episodes: ", /* @__PURE__ */ React.createElement("strong", null, episodes.length)), /* @__PURE__ */ React.createElement("span", null, " \xB7 Approved tool artifacts: ", /* @__PURE__ */ React.createElement("strong", null, artifacts.length))), episodes.length > 0 && /* @__PURE__ */ React.createElement("ol", { style: { margin: "9px 0 0", paddingLeft: "20px", fontSize: "10px", color: "#475569" } }, episodes.slice(-8).map(function(episode) {
      return /* @__PURE__ */ React.createElement("li", { key: episode.id }, /* @__PURE__ */ React.createElement("strong", null, methodPackLabel(episode.methodPackId)), " \xB7 ", fmtTime(episode.startedAt), episode.questionAtStart ? " \xB7 \u201C" + clip(episode.questionAtStart, 70) + "\u201D" : "");
    })), artifacts.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "10px", display: "grid", gap: "6px" } }, artifacts.slice(-6).map(function(artifact) {
      return /* @__PURE__ */ React.createElement("div", { key: artifact.id, style: { padding: "8px", borderRadius: "9px", border: "1px solid #cbd5e1", background: "#f8fafc" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "10px", fontWeight: 800, color: "#1e293b" } }, artifact.title), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "9px", color: "#64748b" } }, artifact.sourceToolName || artifact.sourceToolId, " \xB7 ", methodPackLabel(artifact.methodPackId)), artifact.learnerNote && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "3px", fontSize: "10px", color: "#334155" } }, /* @__PURE__ */ React.createElement("strong", null, "Learner interpretation:"), " ", clip(artifact.learnerNote, 220)), artifact.uncertaintyNote && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "3px", fontSize: "10px", color: "#92400e" } }, /* @__PURE__ */ React.createElement("strong", null, "Uncertainty:"), " ", clip(artifact.uncertaintyNote, 220)));
    })), qualitative && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "9px", padding: "8px", borderRadius: "9px", background: "#fdf2f8", fontSize: "10px", color: "#831843" } }, /* @__PURE__ */ React.createElement("strong", null, "Qualitative plan:"), " boundary ", qualitative.evidenceBoundary || "not selected", "; safeguarding ", qualitative.safeguardingAcknowledged ? "acknowledged" : "not yet acknowledged", "; selection rationale ", qualitative.selectionRationale ? "present" : "missing", "; discrepant-case plan ", qualitative.discrepantCasePlan ? "present" : "missing", "."), creative && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "9px", padding: "8px", borderRadius: "9px", background: "#fff7ed", fontSize: "10px", color: "#9a3412" } }, /* @__PURE__ */ React.createElement("strong", null, "Creative/cultural plan:"), " mode ", creative.inquiryMode || "not selected", "; attribution plan ", creative.attributionPlan ? "present" : "missing", "; critique plan ", creative.critiquePlan ? "present" : "missing", "."), !episodes.length && !artifacts.length && !qualitative && !creative && /* @__PURE__ */ React.createElement("p", { style: { margin: "8px 0 0", fontSize: "10px", color: "#64748b", fontStyle: "italic" } }, "No method episode or cross-tool provenance has been recorded yet."));
  }
  function IntegrationHealthPanel(props) {
    var artifacts = props.journal.capturedArtifacts || [];
    var helper = window.ResearchHub && window.ResearchHub.helpers && window.ResearchHub.helpers.assessResearchArtifactIntegration;
    if (!artifacts.length) return EmptyTrajectory("Open-source integration health", "No approved tool artifacts yet. Contract, license, citation, and reproducibility checks appear here after capture.");
    var rows = artifacts.map(function(artifact) {
      var health = typeof helper === "function" ? helper(artifact) : artifact.integrationHealth || { status: "needs_review", issues: [] };
      return { artifact, health };
    });
    var healthy = rows.filter(function(row) {
      return row.health.status === "healthy";
    }).length;
    var review = rows.filter(function(row) {
      return row.health.status === "needs_review";
    }).length;
    var action = rows.filter(function(row) {
      return row.health.status === "action_needed";
    }).length;
    return /* @__PURE__ */ React.createElement(Panel, { title: "Open-source integration health", subtitle: healthy + " healthy \xB7 " + review + " review \xB7 " + action + " action needed" }, /* @__PURE__ */ React.createElement("div", { "data-educator-integration-health": "true", style: { display: "grid", gap: "7px" } }, rows.slice(-10).map(function(row) {
      var artifact = row.artifact;
      var contract = artifact.integrationContract || {};
      var receipt = artifact.reproducibilityReceipt || {};
      var color = row.health.status === "healthy" ? "#16a34a" : row.health.status === "action_needed" ? "#dc2626" : "#d97706";
      return /* @__PURE__ */ React.createElement("div", { key: artifact.id, style: { padding: "8px 10px", borderRadius: "9px", border: "1px solid " + color, background: color + "0d" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "10px", color: "#1e293b" } }, artifact.sourceToolName || artifact.sourceToolId, " \xB7 ", artifact.sourceToolVersion || "version unknown"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "9px", fontWeight: 900, color } }, row.health.status.replace("_", " "))), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "3px", fontSize: "9px", color: "#64748b" } }, "Contract v", contract.schemaVersion || "?", " \xB7 license: ", contract.license && (contract.license.spdx || contract.license.name) || "missing", " \xB7 citation: ", contract.citation && contract.citation.text ? "declared" : "missing", " \xB7 reproducibility: ", receipt.status || "missing"), receipt.missingFields && receipt.missingFields.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "3px", fontSize: "9px", color: "#92400e" } }, /* @__PURE__ */ React.createElement("strong", null, "Receipt gaps:"), " ", receipt.missingFields.join(", ")), row.health.issues && row.health.issues.length > 0 && /* @__PURE__ */ React.createElement("ul", { style: { margin: "4px 0 0", paddingLeft: "17px", fontSize: "9px", color: "#475569" } }, row.health.issues.map(function(issue) {
        return /* @__PURE__ */ React.createElement("li", { key: issue.code }, issue.message);
      })));
    })), /* @__PURE__ */ React.createElement(Note, null, "Health reflects declared metadata and portfolio completeness; it does not independently certify a tool\u2019s scientific validity or security."));
  }
  function DashboardRoot(props) {
    var ctx = props.ctx;
    var t = ctx.t;
    var j = ctx.journal;
    var onExit = ctx.onExit;
    var lane = j.activeLane;
    return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } }, /* @__PURE__ */ React.createElement(DashboardHeader, { journal: j }), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: onExit,
        style: {
          alignSelf: "flex-start",
          padding: "4px 12px",
          borderRadius: "999px",
          background: "#f1f5f9",
          color: "#475569",
          border: "none",
          fontSize: "11px",
          fontWeight: 700,
          cursor: "pointer"
        }
      },
      "\u2190 ",
      t("research_hub.educator_view_exit") || "Return to student view"
    ), /* @__PURE__ */ React.createElement(GradingPrincipleBanner, null), /* @__PURE__ */ React.createElement(MethodProvenancePanel, { journal: j }), /* @__PURE__ */ React.createElement(IntegrationHealthPanel, { journal: j }), lane === "scientific" && /* @__PURE__ */ React.createElement(ModelTrajectoryPanel, { journal: j }), lane === "engineering" && /* @__PURE__ */ React.createElement(BuildTestTrajectoryPanel, { journal: j }), lane === "humanities" && /* @__PURE__ */ React.createElement(WarrantTrajectoryPanel, { journal: j }), !lane && /* @__PURE__ */ React.createElement("div", { style: {
      padding: "12px",
      borderRadius: "12px",
      background: "#f8fafc",
      border: "1px solid #cbd5e1",
      fontSize: "11px",
      color: "#475569",
      fontStyle: "italic"
    } }, "No active lane. Cross-lane panels below still show loop-back density and AI usage shape across whichever lanes the student has worked in."), /* @__PURE__ */ React.createElement(LoopBackPanel, { journal: j }), /* @__PURE__ */ React.createElement(AiUsagePanel, { journal: j }), lane !== "scientific" && (j.modelSnapshots || []).length > 0 && /* @__PURE__ */ React.createElement(ModelTrajectoryPanel, { journal: j }), lane !== "engineering" && (j.buildLog || []).length > 0 && /* @__PURE__ */ React.createElement(BuildTestTrajectoryPanel, { journal: j }), lane !== "humanities" && ((j.claimEvidenceLinks || []).length > 0 || (j.sources || []).length > 0) && /* @__PURE__ */ React.createElement(WarrantTrajectoryPanel, { journal: j }), /* @__PURE__ */ React.createElement(AntiPatternsBanner, null));
  }
  window.ResearchHub.registerEducatorView({
    label: "Inquiry Health Dashboard",
    render: function(ctx) {
      return /* @__PURE__ */ React.createElement(DashboardRoot, { ctx });
    },
    __tier: 2
  });
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.ResearchHubEducator = { __tier: 2 };
  console.log("[CDN] ResearchHubEducator loaded (Tier 2)");
})();
