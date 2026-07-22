/**
 * AlloFlow EducatorHubModal Module
 * Auto-generated. Source: view_educator_hub_modal_source.jsx
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.EducatorHubModal) {
    console.log('[CDN] EducatorHubModal already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[EducatorHubModal] React not found on window'); return; }

function EducatorHubModal(props) {
  const {
    handleFileUpload,
    openExportPreview,
    pdfAuditResult,
    pdfFixLoading,
    pdfFixResult,
    addToast = (() => {
    }),
    setIsAccessibilityLabOpen,
    setIsCommunityCatalogOpen,
    setIsSymbolStudioOpen,
    setPdfAuditResult,
    setPdfBatchMode,
    setPendingPdfBase64,
    setPendingPdfFile,
    setShowBehaviorLens,
    setShowEducatorHub,
    setShowReportWriter,
    setShowCinematicStudio = (() => {
    }),
    showEducatorHub,
    t,
    beginPdfDocumentIntake = (() => null),
    isPdfDocumentIntakeCurrent = (() => true),
    // Video Studio launcher (2026-07-02): companion-window screen recorder/editor.
    // Optional default so legacy hosts that haven't wired the setter still render.
    setIsVideoStudioOpen = (() => {
    }),
    // AlloStudio launcher (2026-07-02): flyer/worksheet/poster editor with
    // born-accessible exports + process provenance (docs/studio_design.md).
    setIsAlloStudioOpen = (() => {
    }),
    // Phase A.3 polish (May 12 2026): renamed from setPdfBatchFiles (which was
    // never defined in host scope). The real host setter is setPdfBatchQueue,
    // matching the batch-files array shape stored in `pdfBatchQueue` state.
    setPdfBatchQueue = (() => {
    }),
    setPdfBatchSummary = (() => {
    }),
    // Dynamic Assessment Studio entry — added May 2026. Optional so legacy
    // hosts that haven't wired the setter still render the rest of the hub.
    setIsDynamicAssessmentOpen = (() => {
    }),
    // Lumen launcher — opens the STEM Lab on the Lumen tool (Lumen is plugin-only,
    // so this card is its primary UI entry point). Optional defaults so a host that
    // hasn't wired the STEM-Lab setters still renders the rest of the hub.
    setShowStemLab = (() => {
    }),
    setStemLabTool = (() => {
    }),
    setLabToolData = (() => {
    }),
    // Lesson-builder card (2026-06-13): opens the AlloBot guided lesson flow. The host
    // passes a closure mirroring startLessonFlow({}) (show bot + trigger Auto-Fill).
    // Optional default so legacy hosts that don't pass it still render the hub.
    startLessonFlow = (() => {
    }),
    // Family Bridge launcher (2026-06-28): opens the live-translation panel so the
    // bridge feature is reachable from the hub, not only the History sidebar tab.
    // Optional default so a host that hasn't wired the setter still renders the hub.
    setBridgeSendOpen = (() => {
    }),
    // Whiteboard launcher (2026-07-06): the host owns window.open now so it can
    // retain the popup handle for two-way postMessage (Save-to-resources + future
    // AI assist). Optional default so a host that hasn't wired it still renders.
    openWhiteboard = (() => {
    })
  } = props;
  const dialogRef = React.useRef(null);
  React.useEffect(function() {
    const dialog = dialogRef.current;
    if (!dialog) return void 0;
    const previousFocus = document.activeElement;
    const trapStack = window.__alloFocusTrapStack || (window.__alloFocusTrapStack = []);
    const trap = { root: dialog };
    trapStack.push(trap);
    const isTopTrap = function() {
      return trapStack[trapStack.length - 1] === trap;
    };
    const getFocusable = function() {
      return Array.from(dialog.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [contenteditable="true"], [tabindex]:not([tabindex="-1"])'
      )).filter(function(element) {
        if (element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
        const style = typeof window.getComputedStyle === "function" ? window.getComputedStyle(element) : null;
        return !style || style.display !== "none" && style.visibility !== "hidden";
      });
    };
    const first = getFocusable()[0];
    (first || dialog).focus();
    const onKeyDown = function(event) {
      if (!isTopTrap()) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setShowEducatorHub(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const firstItem = focusable[0], lastItem = focusable[focusable.length - 1];
      if (!dialog.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? lastItem : firstItem).focus();
      } else if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return function() {
      document.removeEventListener("keydown", onKeyDown);
      const wasTopTrap = isTopTrap();
      const trapIndex = trapStack.indexOf(trap);
      if (trapIndex !== -1) trapStack.splice(trapIndex, 1);
      if (wasTopTrap && previousFocus && previousFocus !== document.body && previousFocus.isConnected && typeof previousFocus.focus === "function") previousFocus.focus();
    };
  }, [setShowEducatorHub]);
  const [platProbe, setPlatProbe] = React.useState(null);
  const _runPlatformProbe = async () => {
    const rows = [];
    const add = (name, status, detail) => rows.push({ name, status, detail: String(detail || "") });
    try {
      let origin = "unknown";
      try {
        origin = window.location.origin;
      } catch (_) {
      }
      let inFrame = "unknown";
      try {
        inFrame = window.top === window ? "no (top window)" : "yes";
      } catch (_) {
        inFrame = "yes (cross-origin parent)";
      }
      add("Context", "info", "origin: " + origin + " \xB7 in iframe: " + inFrame + " \xB7 secure: " + (typeof isSecureContext !== "undefined" ? isSecureContext : "?"));
    } catch (e) {
      add("Context", "info", "unreadable: " + e.message);
    }
    try {
      const w = window.open("", "_blank", "width=80,height=60");
      if (w) {
        try {
          w.close();
        } catch (_) {
        }
        add("Pop-up windows", "pass", "window.open works \u2014 compare view + Save-as-PDF can open");
      } else add("Pop-up windows", "fail", "window.open returned null \u2014 the compare view and the print flow CANNOT open here");
    } catch (e) {
      add("Pop-up windows", "fail", "window.open threw: " + e.message);
    }
    try {
      new WebAssembly.Module(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]));
      add("WebAssembly", "pass", "compiles \u2014 Writing Check + OCR can run");
    } catch (e) {
      add("WebAssembly", "fail", "cannot compile: " + e.message);
    }
    try {
      const prior = localStorage.getItem("allo_platform_probe_marker");
      localStorage.setItem("allo_platform_probe_marker", (/* @__PURE__ */ new Date()).toISOString());
      if (localStorage.getItem("allo_platform_probe_marker")) {
        add("localStorage (this session)", "pass", "write + read OK");
        add("localStorage (across sessions)", prior ? "pass" : "warn", prior ? "marker from a previous run found (" + prior.slice(0, 19) + ") \u2014 storage persisted" : "no marker from a previous run \u2014 first probe here, or storage was wiped between sessions. Run again in a NEW session to confirm.");
      } else add("localStorage (this session)", "fail", "wrote but could not read back");
    } catch (e) {
      add("localStorage (this session)", "fail", e.message);
    }
    try {
      const idb = await new Promise((resolve) => {
        const to = setTimeout(() => resolve({ status: "fail", detail: "open timed out (3s)" }), 3e3);
        try {
          const req = indexedDB.open("allo_platform_probe", 1);
          req.onupgradeneeded = () => {
            try {
              req.result.createObjectStore("kv");
            } catch (_) {
            }
          };
          req.onerror = () => {
            clearTimeout(to);
            resolve({ status: "fail", detail: "open error: " + (req.error && req.error.message) });
          };
          req.onsuccess = () => {
            try {
              const db = req.result;
              const tx = db.transaction("kv", "readwrite");
              const st = tx.objectStore("kv");
              const get = st.get("marker");
              get.onsuccess = () => {
                const prior = get.result;
                st.put((/* @__PURE__ */ new Date()).toISOString(), "marker");
                tx.oncomplete = () => {
                  clearTimeout(to);
                  try {
                    db.close();
                  } catch (_) {
                  }
                  resolve({ status: "pass", detail: prior ? "works; marker from a previous run found (" + String(prior).slice(0, 19) + ") \u2014 persisted" : "works this session; no prior marker \u2014 first probe here, or wiped between sessions. Re-run in a NEW session to confirm." });
                };
              };
              get.onerror = () => {
                clearTimeout(to);
                resolve({ status: "fail", detail: "read failed" });
              };
            } catch (e) {
              clearTimeout(to);
              resolve({ status: "fail", detail: e.message });
            }
          };
        } catch (e) {
          clearTimeout(to);
          resolve({ status: "fail", detail: e.message });
        }
      });
      add("IndexedDB", idb.status, idb.detail);
    } catch (e) {
      add("IndexedDB", "fail", e.message);
    }
    try {
      const u = URL.createObjectURL(new Blob(["probe"], { type: "text/plain" }));
      const r = await fetch(u);
      const txt = await r.text();
      URL.revokeObjectURL(u);
      add("Blob URLs (same window)", txt === "probe" ? "pass" : "warn", txt === "probe" ? "create + fetch back OK" : "fetched but content mismatched");
    } catch (e) {
      add("Blob URLs (same window)", "fail", e.message);
    }
    try {
      const u = URL.createObjectURL(new Blob(["AlloFlow probe OK"], { type: "text/plain" }));
      const a = document.createElement("a");
      a.href = u;
      a.download = "alloflow-platform-probe.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(u), 4e3);
      add("File downloads", "info", "a tiny test file was triggered \u2014 if alloflow-platform-probe.txt appears in your Downloads, downloads work end-to-end");
    } catch (e) {
      add("File downloads", "fail", e.message);
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText("AlloFlow platform probe");
        add("Clipboard (API)", "pass", "writeText OK");
      } else add("Clipboard (API)", "warn", "navigator.clipboard unavailable");
    } catch (e) {
      add("Clipboard (API)", "warn", "writeText rejected: " + String(e && e.message).slice(0, 120));
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = "AlloFlow probe";
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;left:-9999px;top:0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      add("Clipboard (fallback)", ok ? "pass" : "warn", ok ? "execCommand copy works \u2014 copy buttons function even where the API is blocked" : "execCommand returned false");
    } catch (e) {
      add("Clipboard (fallback)", "fail", String(e && e.message).slice(0, 120));
    }
    add("Dialogs (confirm/prompt)", "info", "typeof confirm = " + typeof window.confirm + ' \u2014 use the "Test dialog" button for the real answer (a sandbox can define it but silently return false)');
    const cdns = [
      ["jsDelivr", "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/package.json"],
      ["unpkg", "https://unpkg.com/pdf-lib@1.17.1/package.json"],
      ["cdnjs", "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"],
      ["Google Fonts", "https://fonts.googleapis.com/css2?family=Lexend&display=swap"]
    ];
    for (const pair of cdns) {
      try {
        const t0 = Date.now();
        const ac = typeof AbortController === "function" ? new AbortController() : null;
        const tid = ac ? setTimeout(() => {
          try {
            ac.abort();
          } catch (_) {
          }
        }, 6e3) : null;
        const r = await fetch(pair[1], ac ? { signal: ac.signal } : void 0);
        if (tid) clearTimeout(tid);
        add("CDN: " + pair[0], r.ok ? "pass" : "warn", "HTTP " + r.status + " in " + (Date.now() - t0) + "ms");
      } catch (e) {
        add("CDN: " + pair[0], "fail", "unreachable: " + (e && e.message));
      }
    }
    try {
      const t0 = Date.now();
      const r = await fetch("https://cdn.jsdelivr.net/npm/harper.js@2.4.0/dist/harper_wasm_bg.wasm", { cache: "force-cache" });
      if (r.ok) {
        await r.arrayBuffer();
        const total = Date.now() - t0;
        add("Writing-Check cache (10 MB WASM)", "info", "fetched in " + total + "ms \u2014 under ~500ms means the HTTP cache held it; re-run in a fresh session to test cross-session caching");
      } else add("Writing-Check cache (10 MB WASM)", "warn", "HTTP " + r.status);
    } catch (e) {
      add("Writing-Check cache (10 MB WASM)", "warn", e.message);
    }
    setPlatProbe({ when: (/* @__PURE__ */ new Date()).toLocaleString(), rows });
  };
  const _probeReportText = () => !platProbe ? "" : "AlloFlow Platform Check \u2014 " + platProbe.when + "\n" + (typeof navigator !== "undefined" ? navigator.userAgent : "") + "\n\n" + platProbe.rows.map((r) => "[" + r.status.toUpperCase() + "] " + r.name + " \u2014 " + r.detail).join("\n");
  return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-[260] bg-black/40 flex items-center justify-center overflow-y-auto p-3 sm:p-4", style: { zIndex: 260 }, role: "presentation", onClick: () => setShowEducatorHub(false) }, /* @__PURE__ */ React.createElement("div", { ref: dialogRef, tabIndex: -1, "data-help-key": "educator_hub_modal_panel", className: "allo-docsuite bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-5 sm:p-8 max-h-[90vh] overflow-y-auto focus:outline-none", style: { maxHeight: "90vh" }, role: "dialog", "aria-modal": "true", "aria-labelledby": "educator-hub-title", "aria-describedby": "educator-hub-subtitle", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-6" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { id: "educator-hub-title", className: "text-xl font-bold text-slate-800 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F6E0}\uFE0F"), " ", t("educator_hub.title") || "Educator Tools"), /* @__PURE__ */ React.createElement("p", { id: "educator-hub-subtitle", className: "text-sm text-slate-600 mt-1" }, t("educator_hub.subtitle") || "Professional tools for educators and clinicians")), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setShowEducatorHub(false), className: "min-w-11 min-h-11 p-2 inline-flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors text-xl", "aria-label": t("educator_hub.close_aria") || "Close educator tools" }, "\u2715")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4" }, /* @__PURE__ */ React.createElement("button", { type: "button", "data-help-key": "educator_hub_behavior_lens_card", onClick: () => {
    setShowEducatorHub(false);
    setShowBehaviorLens(true);
  }, className: "flex items-start gap-3 p-4 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-left" }, /* @__PURE__ */ React.createElement("span", { className: "text-3xl mt-1", "aria-hidden": "true" }, "\u{1F9E0}"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-indigo-800" }, t("educator_hub.behavior_lens_title") || "BehaviorLens"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-indigo-600 mt-1" }, t("educator_hub.behavior_lens_desc") || "FBA/BIP behavioral observation, ABC data collection, and 60+ clinical tools"))), /* @__PURE__ */ React.createElement("button", { type: "button", "data-help-key": "educator_hub_report_writer_card", onClick: () => {
    setShowEducatorHub(false);
    setShowReportWriter(true);
  }, className: "flex items-start gap-3 p-4 bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-left" }, /* @__PURE__ */ React.createElement("span", { className: "text-3xl mt-1", "aria-hidden": "true" }, "\u{1F4DD}"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-violet-800" }, t("educator_hub.report_writer_title") || "Report Writer"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-violet-600 mt-1" }, t("educator_hub.report_writer_desc") || "AI-powered clinical report generation with fact-chunks, accuracy audit, and developmental norms"))), /* @__PURE__ */ React.createElement("button", { type: "button", "data-help-key": "educator_hub_video_studio_card", onClick: () => {
    setShowEducatorHub(false);
    setIsVideoStudioOpen(true);
  }, className: "flex items-start gap-3 p-4 bg-gradient-to-br from-sky-50 to-indigo-50 border border-sky-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-left" }, /* @__PURE__ */ React.createElement("span", { className: "text-3xl mt-1", "aria-hidden": "true" }, "\u{1F3A5}"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-sky-800" }, t("educator_hub.video_studio_title") || "Video Studio"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-sky-600 mt-1" }, t("educator_hub.video_studio_desc") || "Record, trim, caption, and export video demos \u2014 plus prompt tools for NotebookLM and other AI video generators"))), /* @__PURE__ */ React.createElement("button", { type: "button", "data-help-key": "educator_hub_allo_studio_card", onClick: () => {
    setShowEducatorHub(false);
    setIsAlloStudioOpen(true);
  }, className: "flex items-start gap-3 p-4 bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-left" }, /* @__PURE__ */ React.createElement("span", { className: "text-3xl mt-1", "aria-hidden": "true" }, "\u{1F3A8}"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-rose-800" }, t("educator_hub.allo_studio_title") || "AlloStudio"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-rose-600 mt-1" }, t("educator_hub.allo_studio_desc") || "Design flyers, worksheets, and posters that export born-accessible (tagged PDF, real reading order, enforced alt text) \u2014 with a process timeline that shows what was made by hand vs. AI"))), /* @__PURE__ */ React.createElement("button", { type: "button", "data-help-key": "educator_hub_symbol_studio_card", onClick: () => {
    setShowEducatorHub(false);
    setIsSymbolStudioOpen(true);
  }, className: "flex items-start gap-3 p-4 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-left" }, /* @__PURE__ */ React.createElement("span", { className: "text-3xl mt-1", "aria-hidden": "true" }, "\u{1F3A8}"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-purple-800" }, t("educator_hub.symbol_studio_title") || "Symbol Studio"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-purple-600 mt-1" }, t("educator_hub.symbol_studio_desc") || "AI-generated PCS-style icons for visual supports, AAC boards, and schedules \u2014 powered by image-to-image editing"))), /* @__PURE__ */ React.createElement("button", { type: "button", "data-help-key": "educator_hub_whiteboard_card", onClick: () => {
    setShowEducatorHub(false);
    try {
      openWhiteboard();
    } catch (_e) {
    }
  }, className: "flex items-start gap-3 p-4 bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-left" }, /* @__PURE__ */ React.createElement("span", { className: "text-3xl mt-1", "aria-hidden": "true" }, "\u270F\uFE0F"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-indigo-800" }, t("educator_hub.whiteboard_title") || "Whiteboard"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-indigo-600 mt-1" }, t("educator_hub.whiteboard_desc") || "A freehand canvas (Excalidraw) to sketch ideas, build diagrams, and map thinking \u2014 with ready-made graphic organizers (Venn, T-chart, story map, KWL, concept web, number line) and one-click image export."))), /* @__PURE__ */ React.createElement("button", { type: "button", "data-help-key": "educator_hub_dynamic_assessment_card", onClick: () => {
    setShowEducatorHub(false);
    setIsDynamicAssessmentOpen(true);
  }, className: "flex items-start gap-3 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-left" }, /* @__PURE__ */ React.createElement("span", { className: "text-3xl mt-1", "aria-hidden": "true" }, "\u{1F52C}"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-blue-800" }, t("educator_hub.dynamic_assessment_title") || "Dynamic Assessment"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-blue-600 mt-1" }, t("educator_hub.dynamic_assessment_desc") || "Vygotsky/Feuerstein/Lidz test-teach-retest probes with graduated prompt ladders, modifiability scoring, IEP goals, accommodations, and family/teacher handoffs"))), /* @__PURE__ */ React.createElement("button", { type: "button", "data-help-key": "educator_hub_lesson_builder_card", onClick: () => {
    setShowEducatorHub(false);
    startLessonFlow();
  }, className: "flex items-start gap-3 p-4 bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-left" }, /* @__PURE__ */ React.createElement("span", { className: "text-3xl mt-1", "aria-hidden": "true" }, "\u{1FA84}"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-indigo-800" }, t("educator_hub.lesson_builder_title") || "Help me build a lesson"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-indigo-600 mt-1" }, t("educator_hub.lesson_builder_desc") || "I'll ask you a few questions and build a differentiated lesson with you, step by step."))), /* @__PURE__ */ React.createElement("button", { type: "button", "data-help-key": "educator_hub_lumen_card", onClick: () => {
    setShowEducatorHub(false);
    setLabToolData((prev) => ({ ...prev, lumen: { ...prev && prev.lumen || {}, mode: "home" } }));
    setStemLabTool("lumen");
    setShowStemLab(true);
  }, className: "flex items-start gap-3 p-4 bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-left" }, /* @__PURE__ */ React.createElement("span", { className: "text-3xl mt-1", "aria-hidden": "true" }, "\u{1F4A1}"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-amber-800" }, t("educator_hub.lumen_title") || "Lumen"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-amber-600 mt-1" }, t("educator_hub.lumen_desc") || "Study sources or analyze data in one evidence workspace. Grounded answers cite exact passages; data findings keep uncertainty and provenance visible."))), /* @__PURE__ */ React.createElement("button", { type: "button", "data-help-key": "educator_hub_document_hub_card", onClick: () => {
    setShowEducatorHub(false);
    openExportPreview("print");
  }, className: "flex items-start gap-3 p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-left" }, /* @__PURE__ */ React.createElement("span", { className: "text-3xl mt-1", "aria-hidden": "true" }, "\u{1F4C4}"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-emerald-800" }, t("educator_hub.document_hub_title") || "Document Hub"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-emerald-600 mt-1" }, t("educator_hub.document_hub_desc") || "Document builder with themes, WYSIWYG editing, accessibility audit, and multi-format export (PDF, HTML, worksheet, slides)"))), /* @__PURE__ */ React.createElement("button", { type: "button", "data-help-key": "educator_hub_pdf_accessibility_card", onClick: () => {
    setShowEducatorHub(false);
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/pdf,.pdf,.docx,.pptx";
    input.multiple = true;
    input.addEventListener("cancel", () => {
      input.value = "";
    });
    input.onchange = async (e) => {
      const target = e && e.target;
      const files = target && target.files ? Array.from(target.files) : [];
      try {
        if (target) target.value = "";
      } catch (_) {
      }
      if (files.length === 0) return;
      if (files.length === 1) {
        const singleTarget = { files: [files[0]], value: "" };
        try {
          await Promise.resolve(handleFileUpload({ target: singleTarget, currentTarget: singleTarget }));
        } catch (error) {
          addToast('Could not open "' + (files[0].name || "document") + '": ' + String(error && error.message || error || "unknown error"), "error");
        }
        return;
      }
      const pdfFiles = files.filter((file) => {
        const mime = String(file && file.type || "").toLowerCase();
        return mime === "application/pdf" || /\.pdf$/i.test(String(file && file.name || ""));
      });
      if (pdfFiles.length <= 1) {
        addToast("Select one DOCX or PPTX at a time, or select two or more PDFs for batch remediation.", "warning");
        return;
      }
      let intakeToken;
      try {
        intakeToken = await Promise.resolve(beginPdfDocumentIntake({
          source: "educator-hub",
          mode: "batch",
          files: pdfFiles
        }));
      } catch (error) {
        addToast("Could not start the PDF batch: " + String(error && error.message || error || "unknown error"), "error");
        return;
      }
      const intakeIsCurrent = () => {
        try {
          return isPdfDocumentIntakeCurrent(intakeToken);
        } catch (_) {
          return false;
        }
      };
      if (!intakeIsCurrent()) return;
      const skippedCount = files.length - pdfFiles.length;
      if (skippedCount > 0) {
        addToast(skippedCount + " non-PDF file" + (skippedCount === 1 ? " was" : "s were") + " skipped; PDF batch remediation accepts PDFs only.", "warning");
      }
      const batchFiles = new Array(pdfFiles.length);
      for (let index = 0; index < pdfFiles.length; index += 1) {
        if (!intakeIsCurrent()) return;
        const file = pdfFiles[index];
        const outcome = await new Promise((resolve) => {
          if (!intakeIsCurrent()) {
            resolve({ stale: true });
            return;
          }
          let reader;
          let settled = false;
          const finish = (value) => {
            if (settled) return;
            settled = true;
            resolve(value);
          };
          try {
            reader = new FileReader();
            reader.onload = () => {
              if (!intakeIsCurrent()) {
                finish({ stale: true });
                return;
              }
              const result = reader.result;
              const comma = typeof result === "string" ? result.indexOf(",") : -1;
              const base64 = comma >= 0 ? result.slice(comma + 1) : "";
              if (!base64) {
                finish({ error: new Error("The file was empty or could not be decoded.") });
                return;
              }
              finish({ entry: {
                id: Date.now() + index + Math.random(),
                fileName: file.name,
                fileSize: file.size,
                base64,
                status: "pending",
                result: null
              } });
            };
            reader.onerror = () => {
              if (!intakeIsCurrent()) {
                finish({ stale: true });
                return;
              }
              finish({ error: reader.error || new Error("The browser could not read this file.") });
            };
            reader.onabort = () => {
              if (!intakeIsCurrent()) {
                finish({ stale: true });
                return;
              }
              finish({ error: new Error("The file read was cancelled.") });
            };
            reader.readAsDataURL(file);
          } catch (error) {
            if (!intakeIsCurrent()) {
              finish({ stale: true });
              return;
            }
            finish({ error });
          }
        });
        if (!intakeIsCurrent() || outcome.stale) return;
        if (outcome.error) {
          addToast('Could not read "' + (file.name || "PDF") + '": ' + String(outcome.error && outcome.error.message || outcome.error), "error");
          continue;
        }
        batchFiles[index] = outcome.entry;
      }
      if (!intakeIsCurrent()) return;
      const readyFiles = batchFiles.filter(Boolean);
      if (readyFiles.length === 0) {
        addToast("None of the selected PDFs could be read.", "error");
        return;
      }
      setPdfBatchSummary(null);
      setPdfBatchQueue(readyFiles);
      setPdfBatchMode(true);
      setPdfAuditResult({
        _choosing: true,
        fileName: readyFiles.length + " files",
        fileSize: readyFiles.reduce((sum, file) => sum + file.fileSize, 0)
      });
    };
    input.click();
  }, className: "flex items-start gap-3 p-4 bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-left" }, /* @__PURE__ */ React.createElement("span", { className: "text-3xl mt-1", "aria-hidden": "true" }, "\u267F"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-teal-800" }, t("educator_hub.pdf_accessibility_title") || "PDF Accessibility"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-teal-600 mt-1" }, t("educator_hub.pdf_accessibility_desc") || "Upload PDFs for WCAG accessibility audit & remediation with axe-core verification"))), pdfFixResult && !pdfFixLoading && !pdfAuditResult && /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => {
        setShowEducatorHub(false);
        setPdfAuditResult({ _restored: true });
      },
      className: "min-h-11 flex items-center justify-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold transition-all col-span-full md:col-span-2",
      title: t("educator_hub.view_last_audit_tooltip") || "Re-open the last PDF audit \u2014 view the diff, verification, and remediated HTML without re-running the pipeline"
    },
    /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F4CA}"),
    " ",
    t("pdf_audit.view_last_audit") || "View Last Audit",
    pdfFixResult._userEditedAt && /* @__PURE__ */ React.createElement("span", { className: "opacity-70 text-[10px]" }, "\xB7 edited")
  ), /* @__PURE__ */ React.createElement("button", { type: "button", "data-help-key": "educator_hub_community_catalog_card", onClick: () => {
    setShowEducatorHub(false);
    setIsCommunityCatalogOpen(true);
  }, className: "flex items-start gap-3 p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-left" }, /* @__PURE__ */ React.createElement("span", { className: "text-3xl mt-1", "aria-hidden": "true" }, "\u{1F4DA}"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-amber-800" }, t("educator_hub.community_catalog_title") || "Community Catalog"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-amber-700 mt-1" }, t("educator_hub.community_catalog_desc") || "Browse open-licensed lessons from the AlloFlow community, or submit your own for review"))), /* @__PURE__ */ React.createElement("button", { type: "button", "data-help-key": "educator_hub_professional_dev_card", onClick: () => {
    setShowEducatorHub(false);
    try {
      window.__alloPdIntent = true;
      localStorage.setItem("alloflow_pd_intent", "1");
    } catch (_) {
    }
    setIsCommunityCatalogOpen(true);
  }, className: "flex items-start gap-3 p-4 bg-gradient-to-br from-sky-50 to-indigo-50 border border-sky-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-left" }, /* @__PURE__ */ React.createElement("span", { className: "text-3xl mt-1", "aria-hidden": "true" }, "\u{1F393}"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-sky-800" }, t("educator_hub.professional_dev_title") || "Professional Development"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-sky-700 mt-1" }, t("educator_hub.professional_dev_desc") || "Short, self-paced PD modules \u2014 learn, take a knowledge check, and download a completion record"))), /* @__PURE__ */ React.createElement("div", { "data-help-key": "educator_hub_platform_check_card", className: "col-span-full flex flex-col gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 justify-end" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: _runPlatformProbe, className: "min-h-11 px-2 text-[11px] text-slate-600 hover:text-slate-700 underline decoration-dotted", title: t("educator_hub.platform_check_desc") || "Tests what this environment can do \u2014 pop-ups, downloads, storage, WebAssembly, clipboard, CDN reach. For troubleshooting; copy the report when something seems broken." }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F52C}"), " ", t("educator_hub.platform_check_title") || "Platform check (diagnostics)"), /* @__PURE__ */ React.createElement("button", { type: "button", "data-help-ignore": "true", onClick: () => {
    let v = null;
    try {
      v = window.confirm(t("educator_hub.dialog_probe_q") || "Dialog test: click OK.");
    } catch (e) {
      v = "threw: " + e.message;
    }
    setPlatProbe((p) => ({ when: p && p.when || (/* @__PURE__ */ new Date()).toLocaleString(), rows: [...(p && p.rows || []).filter((r) => r.name !== "Dialogs (live test)"), { name: "Dialogs (live test)", status: v === true ? "pass" : v === false ? "warn" : "fail", detail: v === true ? "confirm() returned true after OK \u2014 dialogs work" : v === false ? "confirm() returned FALSE \u2014 either you clicked Cancel, or the sandbox suppressed the dialog (if you never saw one, it is suppressed and confirm-gated flows auto-decline here)" : String(v) }] }));
  }, className: "min-h-11 px-2 text-[11px] text-slate-600 hover:text-slate-700 underline decoration-dotted" }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F9EA}"), " ", t("educator_hub.platform_check_dialog") || "dialog test")), platProbe && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "bg-white border border-slate-300 rounded-lg p-2 text-[11px]", role: "region", "aria-labelledby": "educator-platform-results-title" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-1" }, /* @__PURE__ */ React.createElement("span", { id: "educator-platform-results-title", className: "font-bold text-slate-700" }, t("educator_hub.platform_check_results") || "Results", " \u2014 ", platProbe.when), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: async () => {
    const txt = _probeReportText();
    try {
      await navigator.clipboard.writeText(txt);
    } catch (_) {
      try {
        const ta = document.createElement("textarea");
        ta.value = txt;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      } catch (_2) {
      }
    }
  }, className: "min-h-11 px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold hover:bg-slate-200" }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F4CB}"), " ", t("educator_hub.platform_check_copy") || "Copy report")), /* @__PURE__ */ React.createElement("ul", { className: "space-y-0.5" }, platProbe.rows.map((r, i) => /* @__PURE__ */ React.createElement("li", { key: i, className: "flex gap-1.5" }, /* @__PURE__ */ React.createElement("span", { className: "shrink-0 font-bold " + (r.status === "pass" ? "text-green-700" : r.status === "fail" ? "text-red-700" : r.status === "warn" ? "text-amber-700" : "text-slate-500") }, r.status === "pass" ? "\u2713" : r.status === "fail" ? "\u2717" : r.status === "warn" ? "\u26A0" : "\u2139"), /* @__PURE__ */ React.createElement("span", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("span", { className: "font-bold" }, r.name, ":"), " ", r.detail))))), /* @__PURE__ */ React.createElement("div", { className: "sr-only", role: "status", "aria-live": "polite", "aria-atomic": "true" }, "Platform check complete. ", platProbe.rows.length, " results available."))), /* @__PURE__ */ React.createElement("button", { type: "button", "data-help-key": "educator_hub_accessibility_lab_card", onClick: () => {
    setShowEducatorHub(false);
    setIsAccessibilityLabOpen(true);
  }, className: "flex items-start gap-3 p-4 bg-gradient-to-br from-rose-50 to-amber-50 border border-rose-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-left" }, /* @__PURE__ */ React.createElement("span", { className: "text-3xl mt-1", "aria-hidden": "true" }, "\u{1F50D}"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-rose-800" }, t("educator_hub.accessibility_lab_title") || "Accessibility Lab"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-rose-700 mt-1" }, t("educator_hub.accessibility_lab_desc") || "Verify the student experience: preview as student, keyboard-only tour, live WCAG audit (axe-core) with violations framed by student impact, screen-reader announcement preview, and disability simulators (low-vision, color-blindness, dyslexia, motor delay)."))))));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.EducatorHubModal = { EducatorHubModal: EducatorHubModal };
  console.log('[CDN] EducatorHubModal loaded');
})();
