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
    showEducatorHub,
    t,
    setPdfBatchFiles = (() => {
    })
  } = props;
  return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4", onClick: () => setShowEducatorHub(false), role: "button", tabIndex: 0, onKeyDown: (e) => {
    if (e.key === "Escape") setShowEducatorHub(false);
  } }, /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8", role: "dialog", "aria-modal": "true", "aria-label": "Educator Tools", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-6" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-bold text-slate-800 flex items-center gap-2" }, "\u{1F6E0}\uFE0F ", t("educator_hub.title") || "Educator Tools"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-slate-600 mt-1" }, t("educator_hub.subtitle") || "Professional tools for educators and clinicians")), /* @__PURE__ */ React.createElement("button", { onClick: () => setShowEducatorHub(false), className: "text-slate-600 hover:text-slate-600 text-xl", "aria-label": "Close educator tools" }, "\u2715")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4" }, /* @__PURE__ */ React.createElement("button", { onClick: () => {
    setShowEducatorHub(false);
    setShowBehaviorLens(true);
  }, className: "flex items-start gap-3 p-4 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-left" }, /* @__PURE__ */ React.createElement("span", { className: "text-3xl mt-1" }, "\u{1F9E0}"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-indigo-800" }, t("educator_hub.behavior_lens_title") || "BehaviorLens"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-indigo-600 mt-1" }, t("educator_hub.behavior_lens_desc") || "FBA/BIP behavioral observation, ABC data collection, and 60+ clinical tools"))), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    setShowEducatorHub(false);
    setShowReportWriter(true);
  }, className: "flex items-start gap-3 p-4 bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-left" }, /* @__PURE__ */ React.createElement("span", { className: "text-3xl mt-1" }, "\u{1F4DD}"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-violet-800" }, t("educator_hub.report_writer_title") || "Report Writer"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-violet-600 mt-1" }, t("educator_hub.report_writer_desc") || "AI-powered clinical report generation with fact-chunks, accuracy audit, and developmental norms"))), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    setShowEducatorHub(false);
    setIsSymbolStudioOpen(true);
  }, className: "flex items-start gap-3 p-4 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-left" }, /* @__PURE__ */ React.createElement("span", { className: "text-3xl mt-1" }, "\u{1F3A8}"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-purple-800" }, "Symbol Studio"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-purple-600 mt-1" }, "AI-generated PCS-style icons for visual supports, AAC boards, and schedules \u2014 powered by image-to-image editing"))), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    setShowEducatorHub(false);
    openExportPreview("print");
  }, className: "flex items-start gap-3 p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-left" }, /* @__PURE__ */ React.createElement("span", { className: "text-3xl mt-1" }, "\u{1F4C4}"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-emerald-800" }, "Document Hub"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-emerald-600 mt-1" }, "Document builder with themes, WYSIWYG editing, accessibility audit, and multi-format export (PDF, HTML, worksheet, slides)"))), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    setShowEducatorHub(false);
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/pdf,.pdf,image/*,.docx,.pptx";
    input.multiple = true;
    input.onchange = (e) => {
      const files = [...e.target.files];
      if (files.length === 0) return;
      const pdfFiles = files.filter((f) => f.type === "application/pdf" || f.name.endsWith(".pdf"));
      if (pdfFiles.length === 1 && files.length === 1) {
        const file = pdfFiles[0];
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result.split(",")[1];
          setPendingPdfBase64(base64);
          setPendingPdfFile(file);
          setPdfAuditResult({ _choosing: true, fileName: file.name, fileSize: file.size });
        };
        reader.readAsDataURL(file);
      } else if (pdfFiles.length > 1) {
        const batchFiles = [];
        let loaded = 0;
        pdfFiles.forEach((file) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            batchFiles.push({ name: file.name, base64: reader.result.split(",")[1], size: file.size });
            loaded++;
            if (loaded === pdfFiles.length) {
              setPdfBatchFiles(batchFiles);
              setPdfBatchMode(true);
              setPdfAuditResult({ _choosing: true, fileName: pdfFiles.length + " files", fileSize: pdfFiles.reduce((s, f) => s + f.size, 0) });
            }
          };
          reader.readAsDataURL(file);
        });
      } else {
        handleFileUpload(e);
      }
    };
    input.click();
  }, className: "flex items-start gap-3 p-4 bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-left" }, /* @__PURE__ */ React.createElement("span", { className: "text-3xl mt-1" }, "\u267F"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-teal-800" }, "PDF Accessibility"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-teal-600 mt-1" }, "Upload PDFs for WCAG accessibility audit & remediation with axe-core verification"))), pdfFixResult && !pdfFixLoading && !pdfAuditResult && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        setPdfAuditResult({ _restored: true });
      },
      className: "flex items-center justify-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold transition-all col-span-full md:col-span-2",
      title: "Re-open the last PDF audit \u2014 view the diff, verification, and remediated HTML without re-running the pipeline"
    },
    "\u{1F4CA} ",
    t("pdf_audit.view_last_audit") || "View Last Audit",
    pdfFixResult._userEditedAt && /* @__PURE__ */ React.createElement("span", { className: "opacity-70 text-[10px]" }, "\xB7 edited")
  ), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    setShowEducatorHub(false);
    setIsCommunityCatalogOpen(true);
  }, className: "flex items-start gap-3 p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-left" }, /* @__PURE__ */ React.createElement("span", { className: "text-3xl mt-1", role: "img", "aria-label": "books" }, "\u{1F4DA}"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-amber-800" }, "Community Catalog"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-amber-700 mt-1" }, "Browse open-licensed lessons from the AlloFlow community, or submit your own for review"))), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    setShowEducatorHub(false);
    setIsAccessibilityLabOpen(true);
  }, className: "flex items-start gap-3 p-4 bg-gradient-to-br from-rose-50 to-amber-50 border border-rose-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-left" }, /* @__PURE__ */ React.createElement("span", { className: "text-3xl mt-1", role: "img", "aria-label": "magnifying glass" }, "\u{1F50D}"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-rose-800" }, "Accessibility Lab"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-rose-700 mt-1" }, "Verify the student experience: preview as student, keyboard-only tour, live WCAG audit (axe-core) with violations framed by student impact, screen-reader announcement preview, and disability simulators (low-vision, color-blindness, dyslexia, motor delay)."))))));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.EducatorHubModal = { EducatorHubModal: EducatorHubModal };
  console.log('[CDN] EducatorHubModal loaded');
})();
