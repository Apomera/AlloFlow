(function() {
'use strict';
if (window.AlloModules && window.AlloModules.ExportPreviewView) { console.log('[CDN] ViewExportPreviewModule already loaded, skipping'); return; }
var React = window.React || React;
var useState = React.useState;
var useEffect = React.useEffect;
var useRef = React.useRef;
var useMemo = React.useMemo;
var useCallback = React.useCallback;
var useContext = React.useContext;
var Fragment = React.Fragment;
var warnLog = (typeof window !== 'undefined' && window.warnLog) || console.warn.bind(console);
var debugLog = (typeof window !== 'undefined' && (window.__alloDebugLog || window.debugLog)) || function(){};
var _lazyIcon = function (name) {
  return function (props) {
    var I = window.AlloIcons && window.AlloIcons[name];
    return I ? React.createElement(I, props) : null;
  };
};
// Icons referenced inside the Export Preview modal:
var Download = _lazyIcon('Download');
var ImageIcon = _lazyIcon('ImageIcon');
var RefreshCw = _lazyIcon('RefreshCw');
var X = _lazyIcon('X');
let _harperPromise = null;
function _ensureHarper() {
  if (_harperPromise) return _harperPromise;
  _harperPromise = (async () => {
    const _imp = new Function("u", "return import(u)");
    const assetRoot = "https://alloflow-cdn.pages.dev/vendor/harper/2.4.0";
    const mod = await _imp(assetRoot + "/index.js");
    const binary = await mod.createBinaryModuleFromUrl(assetRoot + "/harper_wasm_full_bg.wasm", "full");
    const linter = new mod.LocalLinter({ binary });
    if (linter.setup) await linter.setup();
    if (linter.getLintConfig && linter.setLintConfig) {
      const config = await linter.getLintConfig();
      if (!config || config.SpellCheck !== true) {
        await linter.setLintConfig({ ...config || {}, SpellCheck: true });
      }
    }
    return linter;
  })();
  _harperPromise.catch(() => {
    _harperPromise = null;
  });
  return _harperPromise;
}
function _applyHarperTextReplacement(doc, textNode, localStart, badLength, replacement) {
  if (!doc || !textNode || textNode.nodeType !== 3 || !Number.isInteger(localStart) || !Number.isInteger(badLength)) return false;
  const raw = textNode.textContent || "";
  if (localStart < 0 || badLength < 0 || localStart + badLength > raw.length) return false;
  let applied = false;
  try {
    const range = doc.createRange();
    range.setStart(textNode, localStart);
    range.setEnd(textNode, localStart + badLength);
    const selection = doc.getSelection ? doc.getSelection() : doc.defaultView?.getSelection?.();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
      applied = Boolean(doc.execCommand?.("insertText", false, String(replacement)));
    }
  } catch (_) {
    applied = false;
  }
  if (!applied) {
    textNode.textContent = raw.slice(0, localStart) + String(replacement) + raw.slice(localStart + badLength);
  }
  try {
    doc.body?.setAttribute("data-allo-user-edited", "1");
  } catch (_) {
  }
  return true;
}
function _builderSuggestionPreviewSrcDoc(fragment) {
  return '<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#fff;color:#0f172a;font:14px/1.55 system-ui,sans-serif}body{padding:12px}blockquote{margin:0;padding:.65em .8em;border-left:4px solid #6366f1;background:#eef2ff}ul,ol{padding-left:1.35em}h1,h2,h3,h4,h5,h6{margin:.1em 0 .45em;color:#312e81}a{color:#3730a3;text-decoration:underline}</style></head><body>' + String(fragment || "") + "</body></html>";
}
function _builderFindUniqueSuggestionTarget(doc, original) {
  if (!doc?.body || !original) return { ok: false, reason: "not-found" };
  const matches = Array.from(doc.body.querySelectorAll("*")).filter((element) => {
    try {
      return element.outerHTML === original;
    } catch (_) {
      return false;
    }
  });
  if (matches.length === 1) return { ok: true, element: matches[0] };
  return { ok: false, reason: matches.length > 1 ? "ambiguous" : "not-found" };
}
function _builderReplaceSuggestionHtml(doc, original, replacementHtml) {
  const located = _builderFindUniqueSuggestionTarget(doc, original);
  if (!located.ok) return located;
  const template = doc.createElement("template");
  template.innerHTML = String(replacementHtml || "").trim();
  const nodes = Array.from(template.content.childNodes).filter((node) => node.nodeType !== 3 || String(node.textContent || "").trim());
  if (nodes.length !== 1 || nodes[0].nodeType !== 1) return { ok: false, reason: "invalid-replacement" };
  const beforeHtml = located.element.outerHTML;
  const replacement = nodes[0];
  located.element.replaceWith(replacement);
  return { ok: true, beforeHtml, afterHtml: replacement.outerHTML };
}
function _builderDispatchSuggestionInput(doc) {
  try {
    if (!doc?.body) return;
    doc.body.setAttribute("data-allo-user-edited", "1");
    const EventCtor = doc.defaultView?.InputEvent || doc.defaultView?.Event;
    doc.body.dispatchEvent(new EventCtor("input", { bubbles: true, inputType: "insertReplacementText" }));
  } catch (_) {
  }
}
const _BUILDER_STYLE_GALLERY = Object.freeze([
  { id: "normal", label: "Normal", tag: "p", style: {} },
  { id: "title", label: "Title", tag: "h1", style: { fontSize: "2.25em", lineHeight: "1.1", marginBottom: "0.35em", letterSpacing: "-0.02em" } },
  { id: "subtitle", label: "Subtitle", tag: "p", style: { fontSize: "1.25em", color: "#475569", marginTop: "-0.15em", marginBottom: "1em" } },
  { id: "heading1", label: "Heading 1", tag: "h1", style: {} },
  { id: "heading2", label: "Heading 2", tag: "h2", style: {} },
  { id: "heading3", label: "Heading 3", tag: "h3", style: {} },
  { id: "quote", label: "Quote", tag: "blockquote", style: { borderLeft: "4px solid #94a3b8", color: "#334155", fontStyle: "italic", paddingLeft: "1em" } },
  { id: "caption", label: "Caption", tag: "p", style: { color: "#475569", fontSize: "0.875em", fontStyle: "italic" } },
  { id: "callout", label: "Callout", tag: "blockquote", style: { backgroundColor: "#eef2ff", borderLeft: "4px solid #6366f1", fontStyle: "normal", padding: "0.75em 1em" } }
]);
const _BUILDER_STYLE_PROPERTIES = Object.freeze(["fontSize", "lineHeight", "marginTop", "marginBottom", "letterSpacing", "color", "fontStyle", "fontWeight", "backgroundColor", "borderLeft", "padding", "paddingLeft"]);
const _BUILDER_CUSTOM_STYLES_KEY = "alloflow-builder-custom-styles-v1";
const _BUILDER_CUSTOM_TEMPLATES_KEY = "alloflow-builder-document-templates-v1";
const _BUILDER_DOCUMENT_TEMPLATES = Object.freeze([
  {
    id: "report",
    label: "Professional report",
    description: "Title page structure, summary, findings, and recommendations.",
    html: '<h1 data-allo-style="title">Report title</h1><p data-allo-style="subtitle">Prepared by \xB7 Date</p><h2 data-allo-style="heading2">Executive summary</h2><p>Summarize the purpose, major findings, and recommended action.</p><h2 data-allo-style="heading2">Findings</h2><h3 data-allo-style="heading3">Finding one</h3><p>Describe the evidence and its significance.</p><h2 data-allo-style="heading2">Recommendations</h2><ol><li>State a clear next step.</li><li>Assign ownership and timing.</li></ol>'
  },
  {
    id: "lesson-plan",
    label: "Lesson plan",
    description: "Objectives, materials, learning sequence, and assessment.",
    html: '<h1 data-allo-style="title">Lesson title</h1><p data-allo-style="subtitle">Course \xB7 Grade \xB7 Duration</p><h2 data-allo-style="heading2">Learning objectives</h2><ul><li>Learners will be able to\u2026</li></ul><h2 data-allo-style="heading2">Materials</h2><ul><li>List required materials and accessible alternatives.</li></ul><h2 data-allo-style="heading2">Learning sequence</h2><h3 data-allo-style="heading3">Launch</h3><p>Activate prior knowledge and share the goal.</p><h3 data-allo-style="heading3">Explore</h3><p>Describe learner choices, supports, and activities.</p><h3 data-allo-style="heading3">Reflect and assess</h3><p>Describe evidence of learning and feedback.</p>'
  },
  {
    id: "meeting-notes",
    label: "Meeting notes",
    description: "Agenda, decisions, and an accessible action-item table.",
    html: '<h1 data-allo-style="title">Meeting notes</h1><p data-allo-style="subtitle">Date \xB7 Time \xB7 Location</p><h2 data-allo-style="heading2">Attendees</h2><p>Add names and roles.</p><h2 data-allo-style="heading2">Agenda</h2><ol><li>Topic and desired outcome</li></ol><h2 data-allo-style="heading2">Decisions</h2><ul><li>Record each decision and rationale.</li></ul><h2 data-allo-style="heading2">Action items</h2><table><caption>Action items</caption><thead><tr><th scope="col">Action</th><th scope="col">Owner</th><th scope="col">Due</th></tr></thead><tbody><tr><td>Next step</td><td>Name</td><td>Date</td></tr></tbody></table>'
  },
  {
    id: "accessible-handout",
    label: "Accessible handout",
    description: "A concise heading structure with a callout and checklist.",
    html: '<h1 data-allo-style="title">Handout title</h1><p data-allo-style="subtitle">A short description of this resource</p><h2 data-allo-style="heading2">Key idea</h2><p>Introduce the central concept in plain language.</p><blockquote data-allo-style="callout" style="background-color:#eef2ff;border-left:4px solid #6366f1;font-style:normal;padding:0.75em 1em">Important information or a helpful example.</blockquote><h2 data-allo-style="heading2">What to remember</h2><ul><li>One clear takeaway</li><li>Another practical takeaway</li></ul><h2 data-allo-style="heading2">Next step</h2><p>Explain what the reader should do next.</p>'
  }
]);
function _builderNormalizeCustomStyles(value) {
  if (!Array.isArray(value)) return [];
  const allowedTags = /* @__PURE__ */ new Set(["p", "h1", "h2", "h3", "blockquote"]);
  return value.map((entry, index) => {
    if (!entry || typeof entry !== "object") return null;
    const rawId = String(entry.id || "custom-style-" + (index + 1)).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
    const id = rawId.startsWith("custom-") ? rawId : "custom-" + rawId;
    const label = String(entry.label || "Custom style " + (index + 1)).replace(/\s+/g, " ").trim().slice(0, 60);
    const tag = allowedTags.has(String(entry.tag || "").toLowerCase()) ? String(entry.tag).toLowerCase() : "p";
    if (!label) return null;
    const style = {};
    _BUILDER_STYLE_PROPERTIES.forEach((property) => {
      const propertyValue = String(entry.style?.[property] || "").trim().slice(0, 160);
      if (propertyValue && !/url\s*\(|expression\s*\(|javascript:|[<>]/i.test(propertyValue)) style[property] = propertyValue;
    });
    return { id, label, tag, style, custom: true, createdAt: Number(entry.createdAt) || 0 };
  }).filter(Boolean).slice(0, 12);
}
function _builderNormalizeCustomDocumentTemplates(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry, index) => {
    if (!entry || typeof entry !== "object") return null;
    const html = String(entry.html || "").slice(0, 25e4);
    if (html.replace(/<[^>]*>/g, "").trim().length < 3) return null;
    const rawId = String(entry.id || "custom-template-" + (index + 1)).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
    const id = rawId.startsWith("custom-") ? rawId : "custom-" + rawId;
    const label = String(entry.label || "Custom template " + (index + 1)).replace(/\s+/g, " ").trim().slice(0, 80);
    const description = String(entry.description || "Saved on this device").replace(/\s+/g, " ").trim().slice(0, 160);
    return label ? { id, label, description, html, custom: true, createdAt: Number(entry.createdAt) || 0 } : null;
  }).filter(Boolean).slice(0, 8);
}
function _readBuilderCustomStyles() {
  if (typeof window === "undefined") return [];
  try {
    return _builderNormalizeCustomStyles(JSON.parse(window.localStorage.getItem(_BUILDER_CUSTOM_STYLES_KEY) || "[]"));
  } catch (_) {
    return [];
  }
}
function _readBuilderCustomDocumentTemplates() {
  if (typeof window === "undefined") return [];
  try {
    return _builderNormalizeCustomDocumentTemplates(JSON.parse(window.localStorage.getItem(_BUILDER_CUSTOM_TEMPLATES_KEY) || "[]"));
  } catch (_) {
    return [];
  }
}
const _BUILDER_PAGE_SIZES = Object.freeze({
  letter: { label: "Letter", width: 8.5, height: 11, css: "letter" },
  legal: { label: "Legal", width: 8.5, height: 14, css: "legal" },
  a4: { label: "A4", width: 8.27, height: 11.69, css: "A4" }
});
function _builderPageDimensions(setup) {
  const definition = _BUILDER_PAGE_SIZES[setup?.size] || _BUILDER_PAGE_SIZES.letter;
  const landscape = setup?.orientation === "landscape";
  const width = landscape ? definition.height : definition.width;
  const height = landscape ? definition.width : definition.height;
  return { ...definition, width, height, widthCss: width + "in", heightCss: height + "in", heightPx: height * 96 };
}
function _builderClampEditorZoom(value) {
  return Math.max(50, Math.min(200, Math.round((Number(value) || 100) / 5) * 5));
}
const _BUILDER_SECTION_BREAK_SELECTOR = "[data-allo-section-break]";
function _builderNormalizeSectionName(value, index = 0) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 80) || `Section ${index + 1}`;
}
function _builderSectionBreaks(doc) {
  return doc ? Array.from(doc.querySelectorAll(_BUILDER_SECTION_BREAK_SELECTOR)) : [];
}
function _builderSectionIndexForNode(doc, node) {
  if (!doc?.body || !node) return 0;
  const element = node.nodeType === 3 ? node.parentElement : node;
  if (!element || !doc.body.contains(element)) return 0;
  const following = doc.defaultView?.Node?.DOCUMENT_POSITION_FOLLOWING || 4;
  return _builderSectionBreaks(doc).reduce((index, marker, markerIndex) => marker === element || marker.contains(element) || marker.compareDocumentPosition(element) & following ? markerIndex + 1 : index, 0);
}
function _builderDocumentSections(doc, pageForNode = () => 0) {
  if (!doc?.body) return [{ id: "section-1", index: 0, name: "Section 1", startType: "document", page: 0 }];
  const firstName = _builderNormalizeSectionName(doc.body.getAttribute("data-allo-section-name"), 0);
  const sections = [{ id: "section-1", index: 0, name: firstName, startType: "document", page: 0 }];
  _builderSectionBreaks(doc).forEach((marker, markerIndex) => {
    const index = markerIndex + 1;
    const startType = marker.getAttribute("data-allo-section-break") === "continuous" ? "continuous" : "next-page";
    sections.push({
      id: marker.getAttribute("data-allo-section-id") || `section-${index + 1}`,
      index,
      name: _builderNormalizeSectionName(marker.getAttribute("data-allo-section-name"), index),
      startType,
      page: pageForNode(marker)
    });
  });
  return sections;
}
function _builderSyncBreakFill(doc, pageHeight, zoom = 100, pageView = true) {
  if (!doc?.body) return;
  const scale = Math.max(0.5, (Number(zoom) || 100) / 100);
  const pageAdvance = Math.max(240, Number(pageHeight) || 1080);
  const bodyTop = doc.body.getBoundingClientRect().top;
  Array.from(doc.querySelectorAll('[data-allo-page-break="1"],[data-allo-section-break]')).forEach((marker) => {
    const forcesPage = marker.hasAttribute("data-allo-page-break") || marker.getAttribute("data-allo-section-break") === "next-page";
    let fill = 24;
    if (pageView && forcesPage) {
      const top = Math.max(0, (marker.getBoundingClientRect().top - bodyTop) / scale);
      const phase = (top % pageAdvance + pageAdvance) % pageAdvance;
      const remaining = pageAdvance - phase;
      fill = phase < 1 || remaining < 24 ? 24 : remaining;
    }
    marker.style.setProperty("--allo-break-fill", `${Math.round(fill * 8) / 8}px`);
  });
}
function _builderStripEditorBreakMetadata(root) {
  root?.querySelectorAll?.('[data-allo-page-break="1"],[data-allo-section-break]').forEach((marker) => {
    marker.style?.removeProperty?.("--allo-break-fill");
    if (!marker.getAttribute("style")) marker.removeAttribute("style");
  });
  return root;
}
function _builderInsertDocumentBreak(doc, kind = "page", options = {}) {
  if (!doc?.body || !doc.getSelection?.()?.rangeCount) return null;
  if (doc.body.getAttribute("data-allo-tracked-view") === "original") {
    _builderSetTrackedMarkupView(doc, "all");
    try {
      const hostDoc = doc.defaultView?.parent?.document;
      hostDoc?.dispatchEvent(new doc.defaultView.parent.CustomEvent("alloflow-builder-markup-view", { detail: { view: "all" } }));
    } catch (_) {
    }
  }
  const marker = doc.createElement("div");
  let result = { kind: "page" };
  if (kind === "section") {
    const sectionIndex = _builderSectionBreaks(doc).length + 1;
    const startType = options.startType === "continuous" ? "continuous" : "next-page";
    const id = `section-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const name = _builderNormalizeSectionName(options.name, sectionIndex);
    marker.setAttribute("data-allo-section-break", startType);
    marker.setAttribute("data-allo-section-id", id);
    marker.setAttribute("data-allo-section-name", name);
    marker.setAttribute("role", "separator");
    marker.setAttribute("aria-label", `${startType === "continuous" ? "Continuous" : "Next page"} section break. Starts ${name}.`);
    marker.setAttribute("contenteditable", "false");
    marker.setAttribute("style", startType === "continuous" ? "break-before:auto;page-break-before:auto;height:0;margin:0;border:0;" : "break-before:page;page-break-before:always;height:0;margin:0;border:0;");
    result = { kind: "section", id, name, startType };
  } else {
    marker.setAttribute("data-allo-page-break", "1");
    marker.setAttribute("role", "separator");
    marker.setAttribute("aria-label", "Page break");
    marker.setAttribute("contenteditable", "false");
    marker.setAttribute("style", "break-before:page;page-break-before:always;height:0;margin:0;border:0;");
  }
  if (doc.body.getAttribute("data-allo-track-changes") === "1") {
    const trackedMarker = _builderRecordInsertedStructure(marker, kind === "section" ? "Inserted section break" : "Inserted page break");
    if (trackedMarker) result.changeId = trackedMarker.getAttribute("data-allo-change-id") || "";
  }
  let inserted = false;
  try {
    inserted = Boolean(doc.execCommand("insertHTML", false, marker.outerHTML + "<p><br></p>"));
  } catch (_) {
  }
  if (!inserted) return null;
  doc.body.setAttribute("data-allo-user-edited", "1");
  doc.body.dispatchEvent(new doc.defaultView.Event("input", { bubbles: true, inputType: kind === "section" ? "insertSectionBreak" : "insertPageBreak" }));
  return result;
}
const _BUILDER_PARAGRAPH_BLOCK_SELECTOR = "p,h1,h2,h3,h4,h5,h6,li,blockquote,td,th";
const _BUILDER_PARAGRAPH_DEFAULTS = Object.freeze({
  leftIndent: 0,
  firstLineIndent: 0,
  rightIndent: 0,
  lineSpacing: "normal",
  spaceBefore: 0,
  spaceAfter: 0,
  keepWithNext: false,
  keepLinesTogether: false,
  widowOrphanControl: false,
  tabStops: []
});
function _builderPageContentWidth(setup) {
  const dimensions = _builderPageDimensions(setup);
  const margin = Math.max(0, parseFloat(setup?.margin) || 0);
  return Math.max(2, dimensions.width - margin * 2);
}
function _builderCssLengthInches(value, element) {
  const text = String(value || "").trim().toLowerCase();
  const amount = parseFloat(text);
  if (!Number.isFinite(amount) || amount === 0) return 0;
  if (text.endsWith("in")) return amount;
  if (text.endsWith("pt")) return amount / 72;
  if (text.endsWith("pc")) return amount / 6;
  if (text.endsWith("cm")) return amount / 2.54;
  if (text.endsWith("mm")) return amount / 25.4;
  if (text.endsWith("px")) return amount / 96;
  try {
    const win = element?.ownerDocument?.defaultView;
    const fontPixels = parseFloat(win?.getComputedStyle?.(element)?.fontSize) || 16;
    if (text.endsWith("rem")) {
      const rootPixels = parseFloat(win?.getComputedStyle?.(element.ownerDocument.documentElement)?.fontSize) || 16;
      return amount * rootPixels / 96;
    }
    if (text.endsWith("em")) return amount * fontPixels / 96;
  } catch (_) {
  }
  return 0;
}
function _builderCssLengthPoints(value, element) {
  const text = String(value || "").trim().toLowerCase();
  const amount = parseFloat(text);
  if (!Number.isFinite(amount) || amount === 0) return 0;
  return text.endsWith("pt") ? amount : _builderCssLengthInches(text, element) * 72;
}
function _normalizeBuilderParagraphLayout(candidate, contentWidth = 6.5) {
  const width = Math.max(2, Number(contentWidth) || 6.5);
  const roundInches = (value) => Math.round((Number(value) || 0) * 8) / 8;
  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, Number(value) || 0));
  const leftIndent = roundInches(clamp(candidate?.leftIndent, 0, width - 0.5));
  const rightIndent = roundInches(clamp(candidate?.rightIndent, 0, width - leftIndent - 0.5));
  const firstLineAbsolute = roundInches(clamp(leftIndent + (Number(candidate?.firstLineIndent) || 0), 0, width - rightIndent));
  const lineSpacing = ["normal", "1", "1.15", "1.5", "2"].includes(String(candidate?.lineSpacing)) ? String(candidate.lineSpacing) : "normal";
  const tabStopMap = /* @__PURE__ */ new Map();
  (Array.isArray(candidate?.tabStops) ? candidate.tabStops : []).forEach((tab) => {
    const position = roundInches(clamp(typeof tab === "number" ? tab : tab?.position, 0.125, width - 0.125));
    const alignment = ["left", "center", "right", "decimal"].includes(tab?.alignment) ? tab.alignment : "left";
    const fallbackId = "tab-" + position.toFixed(3).replace(".", "-") + "-" + alignment;
    const sanitizedId = typeof tab === "object" && tab?.id ? String(tab.id).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) : "";
    tabStopMap.set(position.toFixed(3), { id: sanitizedId || fallbackId, position, alignment });
  });
  return {
    leftIndent,
    firstLineIndent: roundInches(firstLineAbsolute - leftIndent),
    rightIndent,
    lineSpacing,
    spaceBefore: Math.round(clamp(candidate?.spaceBefore, 0, 72)),
    spaceAfter: Math.round(clamp(candidate?.spaceAfter, 0, 72)),
    keepWithNext: Boolean(candidate?.keepWithNext),
    keepLinesTogether: Boolean(candidate?.keepLinesTogether),
    widowOrphanControl: Boolean(candidate?.widowOrphanControl),
    tabStops: Array.from(tabStopMap.values()).sort((a, b) => a.position - b.position).slice(0, 16)
  };
}
function _builderParagraphLayoutsEqual(left, right) {
  if (!left || !right) return false;
  return left.leftIndent === right.leftIndent && left.firstLineIndent === right.firstLineIndent && left.rightIndent === right.rightIndent && left.lineSpacing === right.lineSpacing && left.spaceBefore === right.spaceBefore && left.spaceAfter === right.spaceAfter && left.keepWithNext === right.keepWithNext && left.keepLinesTogether === right.keepLinesTogether && left.widowOrphanControl === right.widowOrphanControl && left.tabStops.length === right.tabStops.length && left.tabStops.every((tab, index) => tab.position === right.tabStops[index]?.position && tab.alignment === right.tabStops[index]?.alignment);
}
function _builderSelectedParagraphBlocks(doc) {
  if (!doc?.body) return [];
  const selection = doc.getSelection?.();
  let anchor = selection?.anchorNode;
  if (anchor?.nodeType === 3) anchor = anchor.parentElement;
  const anchorBlock = anchor?.closest?.(_BUILDER_PARAGRAPH_BLOCK_SELECTOR);
  if (!selection?.rangeCount || selection.isCollapsed) return anchorBlock && !anchorBlock.closest("[data-allo-page-element]") ? [anchorBlock] : [];
  const range = selection.getRangeAt(0);
  const candidates = Array.from(doc.querySelectorAll(_BUILDER_PARAGRAPH_BLOCK_SELECTOR)).filter((block) => {
    if (block.closest("[data-allo-page-element]")) return false;
    try {
      return range.intersectsNode(block);
    } catch (_) {
      return false;
    }
  });
  const leafBlocks = candidates.filter((block) => !candidates.some((other) => other !== block && block.contains(other)));
  return leafBlocks.length ? leafBlocks : anchorBlock ? [anchorBlock] : [];
}
function _builderParagraphLayoutFromBlock(block) {
  if (!block) return { ..._BUILDER_PARAGRAPH_DEFAULTS, tabStops: [] };
  let tabStops = [];
  try {
    const parsed = JSON.parse(block.getAttribute("data-allo-tab-stops") || "[]");
    if (Array.isArray(parsed)) tabStops = parsed;
  } catch (_) {
  }
  const style = block.style || {};
  return _normalizeBuilderParagraphLayout({
    leftIndent: _builderCssLengthInches(style.marginLeft, block),
    firstLineIndent: _builderCssLengthInches(style.textIndent, block),
    rightIndent: _builderCssLengthInches(style.marginRight, block),
    lineSpacing: ["1", "1.15", "1.5", "2"].includes(style.lineHeight) ? style.lineHeight : "normal",
    spaceBefore: _builderCssLengthPoints(style.marginTop, block),
    spaceAfter: _builderCssLengthPoints(style.marginBottom, block),
    keepWithNext: block.getAttribute("data-allo-keep-with-next") === "1" || /avoid/.test(style.breakAfter || style.pageBreakAfter || ""),
    keepLinesTogether: block.getAttribute("data-allo-keep-lines") === "1" || /avoid/.test(style.breakInside || style.pageBreakInside || ""),
    widowOrphanControl: block.getAttribute("data-allo-widow-orphan") === "1",
    tabStops
  }, 20);
}
function _builderDocumentContentWidthInches(doc, zoom = 100) {
  if (!doc?.body) return 6.5;
  try {
    const scale = Math.max(0.5, (Number(zoom) || 100) / 100);
    const rect = doc.body.getBoundingClientRect();
    const style = doc.defaultView?.getComputedStyle?.(doc.body);
    const padding = ((parseFloat(style?.paddingLeft) || 0) + (parseFloat(style?.paddingRight) || 0)) / (96 * scale);
    return Math.max(2, rect.width / (96 * scale) - padding);
  } catch (_) {
    return 6.5;
  }
}
function _builderInsertParagraphTab(doc, zoom = 100, contentWidthOverride) {
  if (!doc?.body) return null;
  const selection = doc.getSelection?.();
  if (!selection?.rangeCount) return null;
  let range = selection.getRangeAt(0);
  let selectedNode = selection.anchorNode;
  if (selectedNode?.nodeType === 3) selectedNode = selectedNode.parentElement;
  const activeField = selectedNode?.closest?.("[data-allo-tab-field]");
  if (activeField) {
    range = doc.createRange();
    range.setStartAfter(activeField);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }
  const block = selectedNode?.closest?.(_BUILDER_PARAGRAPH_BLOCK_SELECTOR);
  if (!block || block.closest("[data-allo-page-element]")) return null;
  const layout = _builderParagraphLayoutFromBlock(block);
  const scale = Math.max(0.5, (Number(zoom) || 100) / 100);
  const contentWidth = Math.max(2, Number(contentWidthOverride) || _builderDocumentContentWidthInches(doc, zoom));
  let currentPosition = layout.leftIndent;
  try {
    const caretRect = range.getBoundingClientRect();
    const blockRect = block.getBoundingClientRect();
    if (caretRect && blockRect && Number.isFinite(caretRect.left) && Number.isFinite(blockRect.left)) {
      currentPosition += Math.max(0, (caretRect.left - blockRect.left) / (96 * scale));
    }
  } catch (_) {
  }
  if (activeField) currentPosition = Math.max(currentPosition, parseFloat(activeField.getAttribute("data-tab-stop")) || currentPosition);
  const explicit = layout.tabStops.find((tab2) => tab2.position > currentPosition + 0.05);
  const stop = explicit || { position: Math.min(contentWidth, Math.max(0.5, Math.ceil((currentPosition + 0.05) * 2) / 2)), alignment: "left" };
  const distance = Math.max(0.125, stop.position - currentPosition);
  const tab = doc.createElement("span");
  tab.setAttribute("data-allo-tab", "1");
  tab.setAttribute("data-tab-stop", String(stop.position));
  tab.setAttribute("data-tab-alignment", stop.alignment);
  tab.setAttribute("aria-label", `${stop.alignment} tab to ${stop.position} inches`);
  tab.style.display = "inline-block";
  tab.style.verticalAlign = "baseline";
  tab.style.maxWidth = "100%";
  if (stop.alignment === "left") {
    tab.style.width = distance + "in";
    tab.textContent = "\xA0";
    if (!range.collapsed) range.deleteContents();
    range.insertNode(tab);
    range.setStartAfter(tab);
  } else {
    const available = Math.max(distance, contentWidth - currentPosition);
    const fieldWidth = stop.alignment === "center" ? Math.min(available, distance * 2) : distance;
    tab.setAttribute("data-allo-tab-field", stop.alignment);
    tab.style.width = fieldWidth + "in";
    tab.style.textAlign = stop.alignment === "center" ? "center" : "right";
    tab.style.whiteSpace = "nowrap";
    tab.textContent = "\u200B";
    if (!range.collapsed) range.deleteContents();
    range.insertNode(tab);
    range.selectNodeContents(tab);
    range.collapse(false);
  }
  selection.removeAllRanges();
  selection.addRange(range);
  doc.body.setAttribute("data-allo-user-edited", "1");
  doc.body.dispatchEvent(new doc.defaultView.Event("input", { bubbles: true }));
  return stop;
}
function _builderWordCount(doc) {
  const text = _builderDocumentText(doc);
  return text ? text.split(/\s+/).length : 0;
}
function _builderDocumentText(doc) {
  if (!doc?.body) return "";
  const win = doc.defaultView;
  const NF = win?.NodeFilter || NodeFilter;
  const walker = doc.createTreeWalker(doc.body, NF.SHOW_TEXT);
  const parts = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.parentElement?.closest("script,style,.allo-block-controls,.allo-block-remove,[data-allo-crop-ui],[data-allo-page-element],[data-allo-toc],[data-allo-footnote-ref],[data-allo-footnote-backlink],[data-allo-footnotes-title],[data-allo-citation],del[data-allo-change-id]")) continue;
    if (node.nodeValue) parts.push(node.nodeValue);
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}
function _builderTextStatistics(text) {
  const normalized = String(text || "").replace(/[\u200B\uFEFF]/g, "").replace(/\s+/g, " ").trim();
  const words = normalized ? normalized.split(/\s+/).length : 0;
  let sentences = 0;
  if (normalized) {
    try {
      const Segmenter = typeof Intl !== "undefined" ? Intl.Segmenter : null;
      if (Segmenter) sentences = Array.from(new Segmenter(void 0, { granularity: "sentence" }).segment(normalized)).filter((part) => part.segment.trim()).length;
    } catch (_) {
    }
    if (!sentences) sentences = (normalized.match(/[.!?]+(?:["')\]]+)?(?=\s|$)/g) || []).length || 1;
  }
  return {
    words,
    charactersWithSpaces: Array.from(normalized).length,
    charactersWithoutSpaces: Array.from(normalized.replace(/\s/g, "")).length,
    paragraphs: normalized ? 1 : 0,
    sentences,
    readingMinutes: words ? Math.max(1, Math.ceil(words / 225)) : 0,
    speakingMinutes: words ? Math.max(1, Math.ceil(words / 130)) : 0
  };
}
function _builderDocumentStatistics(doc) {
  const statistics = _builderTextStatistics(_builderDocumentText(doc));
  if (!doc?.body || !statistics.words) return statistics;
  const win = doc.defaultView;
  const NF = win?.NodeFilter || NodeFilter;
  const walker = doc.createTreeWalker(doc.body, NF.SHOW_TEXT);
  const blocks = /* @__PURE__ */ new Set();
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!String(node.nodeValue || "").trim()) continue;
    if (node.parentElement?.closest("script,style,.allo-block-controls,.allo-block-remove,[data-allo-crop-ui],[data-allo-page-element],[data-allo-toc],[data-allo-footnote-ref],[data-allo-footnote-backlink],[data-allo-footnotes-title],[data-allo-citation],del[data-allo-change-id]")) continue;
    const block = node.parentElement?.closest("h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,pre,address,dt,dd,td,th,div");
    if (block && block !== doc.body) blocks.add(block);
  }
  return { ...statistics, paragraphs: blocks.size || 1 };
}
function _builderSelectionStatistics(doc, savedRange) {
  const empty = { active: false, ..._builderTextStatistics("") };
  if (!doc?.body) return empty;
  let range = null;
  try {
    const selection = doc.getSelection?.();
    if (selection?.rangeCount && !selection.isCollapsed) range = selection.getRangeAt(0);
    else if (savedRange && !savedRange.collapsed && savedRange.commonAncestorContainer?.ownerDocument === doc) range = savedRange;
    if (!range || range.collapsed) return empty;
    const container = range.commonAncestorContainer?.nodeType === 1 ? range.commonAncestorContainer : range.commonAncestorContainer?.parentElement;
    if (!container || !doc.body.contains(container) || container.closest?.("del[data-allo-change-id]")) return empty;
    const fragment = range.cloneContents();
    fragment.querySelectorAll?.("del[data-allo-change-id]").forEach((node) => node.remove());
    return { active: true, ..._builderTextStatistics(fragment.textContent || "") };
  } catch (_) {
    return empty;
  }
}
const _BUILDER_COMMENT_SELECTOR = "mark[data-allo-comment-id]";
const _BUILDER_REVIEWER_PALETTE = [
  { accent: "#4f46e5", soft: "#eef2ff", ink: "#312e81" },
  { accent: "#0f766e", soft: "#f0fdfa", ink: "#134e4a" },
  { accent: "#b45309", soft: "#fffbeb", ink: "#78350f" },
  { accent: "#be123c", soft: "#fff1f2", ink: "#881337" },
  { accent: "#7e22ce", soft: "#faf5ff", ink: "#581c87" },
  { accent: "#0369a1", soft: "#f0f9ff", ink: "#0c4a6e" },
  { accent: "#3f6212", soft: "#f7fee7", ink: "#365314" },
  { accent: "#9f1239", soft: "#fff1f2", ink: "#881337" }
];
function _builderNormalizeReviewerName(value, fallback = "Reviewer") {
  return String(value || fallback).replace(/\s+/g, " ").trim().slice(0, 80) || fallback;
}
function _builderReviewerIdentity(value) {
  const name = _builderNormalizeReviewerName(value);
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) hash = (hash << 5) - hash + name.charCodeAt(index) | 0;
  const paletteIndex = Math.abs(hash) % _BUILDER_REVIEWER_PALETTE.length;
  const words = name.split(/\s+/).filter(Boolean);
  const initials = (words.length > 1 ? words[0][0] + words[words.length - 1][0] : name.slice(0, 2)).toUpperCase();
  return { name, initials, key: "reviewer-" + (paletteIndex + 1), ..._BUILDER_REVIEWER_PALETTE[paletteIndex] };
}
function _builderNormalizeCommentMessage(value) {
  return String(value || "").replace(/\n?/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, 1200);
}
function _builderCommentThread(marker) {
  let source = [];
  try {
    const parsed = JSON.parse(marker?.getAttribute?.("data-allo-comment-thread") || "[]");
    if (Array.isArray(parsed)) source = parsed;
  } catch (_) {
  }
  const fallback = _builderNormalizeCommentMessage(marker?.getAttribute?.("data-allo-comment-text"));
  const fallbackAuthor = _builderNormalizeReviewerName(marker?.getAttribute?.("data-allo-comment-author"));
  if (!source.length && fallback) source = [{ text: fallback, at: marker?.getAttribute?.("data-allo-comment-created-at") || "", author: fallbackAuthor }];
  return source.map((entry, index) => ({
    id: String(entry?.id || `message-${index + 1}`).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || `message-${index + 1}`,
    text: _builderNormalizeCommentMessage(entry?.text),
    at: String(entry?.at || "").slice(0, 48),
    author: _builderNormalizeReviewerName(entry?.author || fallbackAuthor)
  })).filter((entry) => entry.text).slice(0, 20);
}
function _builderSetCommentThread(marker, thread) {
  if (!marker) return [];
  const normalized = (Array.isArray(thread) ? thread : []).map((entry, index) => ({
    id: String(entry?.id || `message-${index + 1}`).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || `message-${index + 1}`,
    text: _builderNormalizeCommentMessage(entry?.text),
    at: String(entry?.at || (/* @__PURE__ */ new Date()).toISOString()).slice(0, 48),
    author: _builderNormalizeReviewerName(entry?.author || marker.getAttribute("data-allo-comment-author"))
  })).filter((entry) => entry.text).slice(0, 20);
  marker.setAttribute("data-allo-comment-thread", JSON.stringify(normalized));
  marker.setAttribute("data-allo-comment-text", normalized[0]?.text || "");
  marker.setAttribute("data-allo-comment-author", normalized[0]?.author || "Reviewer");
  const identity = _builderReviewerIdentity(normalized[0]?.author);
  marker.setAttribute("data-allo-comment-author-key", identity.key);
  marker.style.setProperty("--allo-reviewer-accent", identity.accent);
  marker.style.setProperty("--allo-reviewer-soft", identity.soft);
  marker.setAttribute("tabindex", "0");
  const resolved = marker.getAttribute("data-allo-comment-resolved") === "1";
  const summary = (normalized[0]?.text || "Comment").replace(/\s+/g, " ").slice(0, 140);
  marker.setAttribute("aria-label", `${resolved ? "Resolved comment" : "Comment"} by ${identity.name}: ${summary}`);
  marker.setAttribute("title", `${resolved ? "Resolved comment" : "Comment"} by ${identity.name}: ${summary}`);
  return normalized;
}
function _builderCommentEntries(doc) {
  if (!doc?.querySelectorAll) return [];
  return Array.from(doc.querySelectorAll(_BUILDER_COMMENT_SELECTOR)).map((marker, index) => {
    const rawId = marker.getAttribute("data-allo-comment-id") || "";
    const id = rawId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || `comment-${index + 1}`;
    if (id !== rawId) marker.setAttribute("data-allo-comment-id", id);
    const thread = _builderSetCommentThread(marker, _builderCommentThread(marker));
    const createdAt = marker.getAttribute("data-allo-comment-created-at") || thread[0]?.at || "";
    if (createdAt && !marker.getAttribute("data-allo-comment-created-at")) marker.setAttribute("data-allo-comment-created-at", createdAt);
    return {
      id,
      index,
      quote: String(marker.textContent || "").replace(/\s+/g, " ").trim().slice(0, 180) || "Commented text",
      resolved: marker.getAttribute("data-allo-comment-resolved") === "1",
      createdAt,
      thread,
      authors: Array.from(new Set(thread.map((entry) => entry.author))),
      node: marker
    };
  });
}
function _builderInsertReviewComment(doc, savedRange, message, author = "You") {
  const text = _builderNormalizeCommentMessage(message);
  if (!doc?.body || !text) return { ok: false, error: "Write a comment first." };
  try {
    const selection = doc.getSelection?.();
    let range = selection?.rangeCount && !selection.isCollapsed ? selection.getRangeAt(0).cloneRange() : null;
    if (!range && savedRange?.cloneRange && !savedRange.collapsed && savedRange.commonAncestorContainer?.ownerDocument === doc) range = savedRange.cloneRange();
    if (!range || range.collapsed) return { ok: false, error: "Select the text you want to comment on." };
    const startElement = range.startContainer?.nodeType === 1 ? range.startContainer : range.startContainer?.parentElement;
    const endElement = range.endContainer?.nodeType === 1 ? range.endContainer : range.endContainer?.parentElement;
    if (!startElement || !endElement || !doc.body.contains(startElement) || !doc.body.contains(endElement)) return { ok: false, error: "Select text inside the document." };
    if (startElement.closest(_BUILDER_COMMENT_SELECTOR) || endElement.closest(_BUILDER_COMMENT_SELECTOR)) return { ok: false, error: "That text already belongs to a comment." };
    if (startElement.closest("del[data-allo-change-id]") || endElement.closest("del[data-allo-change-id]")) return { ok: false, error: "Accept or reject the deletion before commenting on it." };
    const blockSelector = "p,h1,h2,h3,h4,h5,h6,li,blockquote,figcaption,pre,td,th,div";
    if (startElement.closest(blockSelector) !== endElement.closest(blockSelector)) return { ok: false, error: "Select text within one paragraph or table cell." };
    const fragment = range.cloneContents();
    if (fragment.querySelector?.(_BUILDER_COMMENT_SELECTOR)) return { ok: false, error: "Comments cannot overlap." };
    if (fragment.querySelector?.("p,h1,h2,h3,h4,h5,h6,li,blockquote,figure,figcaption,pre,table,tr,td,th,div")) return { ok: false, error: "Select text within one paragraph or table cell." };
    const quote = range.toString().replace(/\s+/g, " ").trim();
    if (!quote) return { ok: false, error: "Select visible text before adding a comment." };
    const id = `comment-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const at = (/* @__PURE__ */ new Date()).toISOString();
    const marker = doc.createElement("mark");
    marker.setAttribute("data-allo-comment-id", id);
    marker.setAttribute("data-allo-comment-created-at", at);
    marker.setAttribute("data-allo-comment-resolved", "0");
    _builderSetCommentThread(marker, [{ id: `message-${Date.now().toString(36)}`, text, at, author: _builderNormalizeReviewerName(author, "You") }]);
    try {
      range.surroundContents(marker);
    } catch (_) {
      marker.appendChild(range.extractContents());
      range.insertNode(marker);
    }
    const nextRange = doc.createRange();
    nextRange.selectNodeContents(marker);
    selection?.removeAllRanges();
    selection?.addRange(nextRange);
    doc.body.setAttribute("data-allo-user-edited", "1");
    doc.body.dispatchEvent(new doc.defaultView.Event("input", { bubbles: true, inputType: "insertComment" }));
    return { ok: true, id, marker, quote };
  } catch (_) {
    return { ok: false, error: "The comment could not be anchored to that selection." };
  }
}
function _builderClearReviewCommentTransientState(root) {
  root?.querySelectorAll?.(_BUILDER_COMMENT_SELECTOR).forEach((marker) => marker.removeAttribute("data-allo-comment-active"));
  return root;
}
function _builderStripReviewComments(root) {
  if (!root?.querySelectorAll) return root;
  Array.from(root.querySelectorAll(_BUILDER_COMMENT_SELECTOR)).forEach((marker) => marker.replaceWith(...Array.from(marker.childNodes)));
  return root;
}
function _builderSuspendReviewComments(root) {
  if (!root?.querySelectorAll) return () => {
  };
  const records = [];
  Array.from(root.querySelectorAll(_BUILDER_COMMENT_SELECTOR)).forEach((marker) => {
    if (!marker.parentNode) return;
    const children = Array.from(marker.childNodes);
    marker.replaceWith(...children);
    records.push({ marker, children });
  });
  return () => {
    records.reverse().forEach(({ marker, children }) => {
      const first = children.find((node) => node.parentNode);
      const parent = first?.parentNode;
      if (!parent) return;
      parent.insertBefore(marker, first);
      children.forEach((node) => {
        if (node.parentNode === parent) marker.appendChild(node);
      });
    });
  };
}
const _BUILDER_ADVANCED_CHANGE_SELECTOR = "[data-allo-change-kind][data-allo-change-id]";
const _BUILDER_CHANGE_SELECTOR = "ins[data-allo-change-id],del[data-allo-change-id]," + _BUILDER_ADVANCED_CHANGE_SELECTOR;
const _BUILDER_TRACKED_META_ATTRIBUTES = /* @__PURE__ */ new Set([
  "data-allo-change-id",
  "data-allo-change-type",
  "data-allo-change-kind",
  "data-allo-change-at",
  "data-allo-change-author",
  "data-allo-change-author-key",
  "data-allo-change-label",
  "data-allo-change-before",
  "data-allo-change-after",
  "data-allo-change-scopes",
  "data-allo-change-action",
  "data-allo-change-active",
  "data-allo-change-summary",
  "data-allo-change-group",
  "data-allo-change-group-secondary",
  "data-allo-change-tabindex-added",
  "data-allo-change-title-added",
  "data-allo-change-aria-added",
  "data-allo-change-preview-state"
]);
const _BUILDER_REVISION_PRESENTATION_ATTRIBUTES = Object.freeze([
  "style",
  "class",
  "align",
  "data-allo-style",
  "data-allo-paragraph-layout",
  "data-allo-tab-stops",
  "data-allo-keep-with-next",
  "data-allo-keep-lines",
  "data-allo-widow-orphan"
]);
function _builderTrackedChangeType(marker) {
  const explicit = String(marker?.getAttribute?.("data-allo-change-type") || "").toLowerCase();
  if (["insert", "delete", "format", "paragraph", "structure"].includes(explicit)) return explicit;
  return String(marker?.tagName || "").toLowerCase() === "del" ? "delete" : "insert";
}
function _builderCurrentReviewer(doc) {
  return _builderNormalizeReviewerName(doc?.body?.getAttribute?.("data-allo-reviewer-name"), "You");
}
function _builderRevisionSnapshotDecode(value) {
  try {
    const parsed = JSON.parse(String(value || "null"));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (_) {
    return null;
  }
}
function _builderCaptureElementRevision(element, options = {}) {
  if (!element?.attributes) return null;
  const attributeMode = options.attributeMode === "all" ? "all" : options.attributeMode === "none" ? "none" : "presentation";
  const allowed = new Set(_BUILDER_REVISION_PRESENTATION_ATTRIBUTES);
  const attributes = {};
  Array.from(element.attributes).sort((left, right) => left.name.localeCompare(right.name)).forEach((attribute) => {
    const name = attribute.name;
    if (_BUILDER_TRACKED_META_ATTRIBUTES.has(name)) return;
    if (name === "tabindex" && element.getAttribute("data-allo-change-tabindex-added") === "1") return;
    if (name === "title" && element.getAttribute("data-allo-change-title-added") === "1") return;
    if ((name === "aria-label" || name === "aria-description") && element.getAttribute("data-allo-change-aria-added") === "1") return;
    if (attributeMode === "none" || attributeMode === "presentation" && !allowed.has(name)) return;
    attributes[name] = attribute.value;
  });
  const snapshot = {
    tag: String(element.tagName || "span").toLowerCase(),
    attributeMode,
    attributes
  };
  if (options.includeContent) snapshot.html = element.innerHTML;
  return snapshot;
}
function _builderRevisionSnapshotsEqual(left, right) {
  try {
    return JSON.stringify(left || null) === JSON.stringify(right || null);
  } catch (_) {
    return false;
  }
}
function _builderApplyElementRevisionSnapshot(element, snapshot, options = {}) {
  if (!element || !snapshot) return element;
  const attributeMode = snapshot.attributeMode === "all" ? "all" : snapshot.attributeMode === "none" ? "none" : "presentation";
  const allowed = new Set(_BUILDER_REVISION_PRESENTATION_ATTRIBUTES);
  Array.from(element.attributes || []).forEach((attribute) => {
    const name = attribute.name;
    if (_BUILDER_TRACKED_META_ATTRIBUTES.has(name)) return;
    if (attributeMode === "all" || attributeMode === "presentation" && allowed.has(name)) element.removeAttribute(name);
  });
  Object.entries(snapshot.attributes || {}).forEach(([name, value]) => {
    if (!_BUILDER_TRACKED_META_ATTRIBUTES.has(name)) element.setAttribute(name, String(value));
  });
  if (Object.prototype.hasOwnProperty.call(snapshot, "html") && options.content !== false) element.innerHTML = String(snapshot.html || "");
  if (!element.getAttribute("style")) element.removeAttribute("style");
  return element;
}
function _builderReplaceElementTagForRevision(element, snapshot) {
  const tag = String(snapshot?.tag || "").toLowerCase();
  if (!element?.ownerDocument || !/^(p|h1|h2|h3|h4|h5|h6|blockquote|li|div|span|table)$/.test(tag) || String(element.tagName || "").toLowerCase() === tag) {
    return element;
  }
  const replacement = element.ownerDocument.createElement(tag);
  Array.from(element.attributes || []).forEach((attribute) => {
    if (_BUILDER_TRACKED_META_ATTRIBUTES.has(attribute.name)) replacement.setAttribute(attribute.name, attribute.value);
  });
  while (element.firstChild) replacement.appendChild(element.firstChild);
  element.replaceWith(replacement);
  return replacement;
}
function _builderStripAdvancedTrackedMetadata(marker) {
  if (!marker?.removeAttribute) return marker;
  const removeTabindex = marker.getAttribute("data-allo-change-tabindex-added") === "1";
  const removeTitle = marker.getAttribute("data-allo-change-title-added") === "1";
  const removeAria = marker.getAttribute("data-allo-change-aria-added") === "1";
  _BUILDER_TRACKED_META_ATTRIBUTES.forEach((name) => marker.removeAttribute(name));
  if (removeTabindex) marker.removeAttribute("tabindex");
  if (removeTitle) marker.removeAttribute("title");
  if (removeAria) {
    marker.removeAttribute("aria-label");
    marker.removeAttribute("aria-description");
  }
  marker.style?.removeProperty("--allo-reviewer-accent");
  marker.style?.removeProperty("--allo-reviewer-soft");
  marker.style?.removeProperty("--allo-reviewer-ink");
  if (!marker.getAttribute("style")) marker.removeAttribute("style");
  return marker;
}
function _builderUnwrapTrackedContainer(marker) {
  if (!marker?.parentNode) return false;
  marker.replaceWith(...Array.from(marker.childNodes));
  return true;
}
function _builderPrepareTrackedChangeMarker(marker, type, metadata = {}) {
  if (!marker) return null;
  const advanced = marker.hasAttribute?.("data-allo-change-kind");
  const requestedType = String(type || marker.getAttribute?.("data-allo-change-type") || "").toLowerCase();
  const normalizedType = advanced && ["format", "paragraph", "structure"].includes(requestedType) ? requestedType : requestedType === "delete" ? "delete" : "insert";
  const fallbackId = "change-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  const id = String(metadata.id || marker.getAttribute("data-allo-change-id") || fallbackId).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || fallbackId;
  const at = String(metadata.at || marker.getAttribute("data-allo-change-at") || marker.getAttribute("datetime") || (/* @__PURE__ */ new Date()).toISOString()).slice(0, 48);
  const author = String(metadata.author || marker.getAttribute("data-allo-change-author") || _builderCurrentReviewer(marker.ownerDocument)).replace(/\s+/g, " ").trim().slice(0, 80) || "You";
  const defaultLabel = normalizedType === "delete" ? "Deletion" : normalizedType === "insert" ? "Insertion" : normalizedType === "paragraph" ? "Paragraph formatting" : normalizedType === "structure" ? "Structural change" : "Formatting change";
  const label = String(metadata.label || marker.getAttribute("data-allo-change-label") || defaultLabel).replace(/\s+/g, " ").trim().slice(0, 160) || defaultLabel;
  marker.setAttribute("data-allo-change-id", id);
  marker.setAttribute("data-allo-change-type", normalizedType);
  marker.setAttribute("data-allo-change-at", at);
  marker.setAttribute("data-allo-change-author", author);
  const reviewerIdentity = _builderReviewerIdentity(author);
  marker.setAttribute("data-allo-change-author-key", reviewerIdentity.key);
  marker.style.setProperty("--allo-reviewer-accent", reviewerIdentity.accent);
  marker.style.setProperty("--allo-reviewer-soft", reviewerIdentity.soft);
  marker.style.setProperty("--allo-reviewer-ink", reviewerIdentity.ink);
  marker.setAttribute("data-allo-change-label", label);
  if (!marker.hasAttribute("tabindex")) {
    marker.setAttribute("tabindex", "0");
    marker.setAttribute("data-allo-change-tabindex-added", "1");
  }
  const summary = String(marker.textContent || label).replace(/\s+/g, " ").trim().slice(0, 140) || label;
  if (!marker.hasAttribute("title")) {
    marker.setAttribute("title", label + " by " + author + ": " + summary);
    marker.setAttribute("data-allo-change-title-added", "1");
  }
  if (advanced) {
    const reviewDescription = label + " by " + author;
    if (!marker.hasAttribute("aria-description") && String(marker.textContent || "").trim()) {
      marker.setAttribute("aria-description", reviewDescription);
      marker.setAttribute("data-allo-change-aria-added", "1");
    } else if (!marker.hasAttribute("aria-label")) {
      marker.setAttribute("aria-label", reviewDescription);
      marker.setAttribute("data-allo-change-aria-added", "1");
    }
  } else {
    marker.setAttribute("datetime", at);
    if (normalizedType === "delete") marker.setAttribute("contenteditable", "false");
    marker.setAttribute("aria-label", (normalizedType === "delete" ? "Deletion" : "Insertion") + " by " + author + ": " + summary);
  }
  return marker;
}
function _builderCreateTrackedChange(doc, type, content, metadata = {}) {
  if (!doc?.createElement) return null;
  const normalizedType = type === "delete" ? "delete" : "insert";
  const marker = doc.createElement(normalizedType === "delete" ? "del" : "ins");
  _builderPrepareTrackedChangeMarker(marker, normalizedType, metadata);
  if (typeof content === "string") {
    const parts = content.split("\n");
    parts.forEach((part, index) => {
      if (index) marker.appendChild(doc.createElement("br"));
      if (part) marker.appendChild(doc.createTextNode(part));
    });
  } else if (content?.nodeType) marker.appendChild(content);
  return marker;
}
function _builderRecordElementRevision(element, beforeSnapshot, type, label, options = {}) {
  if (!element) return { ok: false, error: "The changed content is no longer available." };
  const existing = element.matches?.(_BUILDER_ADVANCED_CHANGE_SELECTOR);
  const storedBefore = existing ? _builderRevisionSnapshotDecode(element.getAttribute("data-allo-change-before")) : null;
  const originalBefore = storedBefore || beforeSnapshot || _builderCaptureElementRevision(element, options);
  const afterSnapshot = options.afterSnapshot || _builderCaptureElementRevision(element, options);
  if (!originalBefore || !afterSnapshot) return { ok: false, error: "The change could not be recorded." };
  if (_builderRevisionSnapshotsEqual(originalBefore, afterSnapshot)) {
    if (existing) _builderStripAdvancedTrackedMetadata(element);
    return { ok: false, noChange: true, marker: element };
  }
  const kind = String(options.kind || element.getAttribute("data-allo-change-kind") || (type === "paragraph" ? "block-format" : "inline-format"));
  const scopes = new Set(String(element.getAttribute("data-allo-change-scopes") || "").split(",").filter(Boolean));
  scopes.add(type);
  element.setAttribute("data-allo-change-kind", kind);
  element.setAttribute("data-allo-change-scopes", Array.from(scopes).join(","));
  if (options.action) element.setAttribute("data-allo-change-action", String(options.action));
  element.setAttribute("data-allo-change-before", JSON.stringify(originalBefore));
  element.setAttribute("data-allo-change-after", JSON.stringify(afterSnapshot));
  _builderPrepareTrackedChangeMarker(element, type, { label });
  return { ok: true, id: element.getAttribute("data-allo-change-id"), marker: element };
}
function _builderRecordInsertedStructure(marker, label) {
  if (!marker) return null;
  const afterSnapshot = _builderCaptureElementRevision(marker, { attributeMode: "all", includeContent: true });
  marker.setAttribute("data-allo-change-kind", "structure-insert");
  marker.setAttribute("data-allo-change-action", "insert");
  marker.setAttribute("data-allo-change-before", "null");
  marker.setAttribute("data-allo-change-after", JSON.stringify(afterSnapshot));
  _builderPrepareTrackedChangeMarker(marker, "structure", { label: label || "Inserted structure" });
  return marker;
}
function _builderRecordDeletedStructure(marker, label) {
  if (!marker) return null;
  const beforeSnapshot = _builderCaptureElementRevision(marker, { attributeMode: "all", includeContent: true });
  Array.from(marker.attributes || []).forEach((attribute) => marker.removeAttribute(attribute.name));
  marker.innerHTML = "";
  const result = _builderRecordElementRevision(marker, beforeSnapshot, "structure", label || "Deleted structure", {
    kind: "structure-delete",
    action: "delete",
    attributeMode: "all",
    includeContent: true
  });
  return result.ok ? result.marker : null;
}
function _builderTrackInlineFormatting(doc, command, value, label, executor) {
  if (!doc?.body) return { ok: false, error: "The editable document is not ready." };
  const selection = doc.getSelection?.();
  const range = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
  if (!range) return { ok: false, error: "Select text to format first." };
  if (range.collapsed || _builderRangeTrackedChange(range, "insert")) return { ok: false, direct: true };
  if (!_builderTrackedRangeBlock(range)) return { ok: false, blocked: true, error: "Formatting revisions must stay within one paragraph or table cell." };
  if (_builderRangeContainsTrackedChange(range)) return { ok: false, blocked: true, error: "Accept or reject the selected revision before changing its formatting." };
  const marker = doc.createElement("span");
  try {
    try {
      range.surroundContents(marker);
    } catch (_) {
      marker.appendChild(range.extractContents());
      range.insertNode(marker);
    }
    const beforeSnapshot = _builderCaptureElementRevision(marker, { attributeMode: "presentation", includeContent: true });
    marker.setAttribute("data-allo-change-kind", "inline-format");
    _builderPrepareTrackedChangeMarker(marker, "format", { label });
    const markerRange = doc.createRange();
    markerRange.selectNodeContents(marker);
    _builderSetTrackedSelection(doc, markerRange);
    const applied = typeof executor === "function" ? executor() : typeof doc.execCommand === "function" ? doc.execCommand(command, false, value) : false;
    const live = doc.querySelector('[data-allo-change-id="' + marker.getAttribute("data-allo-change-id") + '"]');
    if (!live) return { ok: false, error: "The formatting was applied but could not be recorded." };
    const result = _builderRecordElementRevision(live, beforeSnapshot, "format", label, {
      kind: "inline-format",
      attributeMode: "presentation",
      includeContent: true
    });
    if (!result.ok) {
      _builderStripAdvancedTrackedMetadata(live);
      _builderUnwrapTrackedContainer(live);
      return { ok: false, noChange: true, direct: Boolean(applied) };
    }
    const nextRange = doc.createRange();
    nextRange.selectNodeContents(result.marker);
    _builderSetTrackedSelection(doc, nextRange);
    _builderDispatchTrackedInput(doc, "formatTrackedChange");
    return result;
  } catch (_) {
    if (marker.isConnected) _builderUnwrapTrackedContainer(marker);
    return { ok: false, error: "The formatting change could not be recorded." };
  }
}
function _builderTrackBlockFormattingCommand(doc, command, value, label, executor) {
  const blocksBefore = _builderSelectedParagraphBlocks(doc);
  if (!blocksBefore.length) return { ok: false, direct: true };
  const snapshots = blocksBefore.map((block) => _builderCaptureElementRevision(block, { attributeMode: "presentation" }));
  const applied = typeof executor === "function" ? executor() : typeof doc.execCommand === "function" ? doc.execCommand(command, false, value) : false;
  const blocksAfter = _builderSelectedParagraphBlocks(doc);
  const ids = [];
  blocksAfter.forEach((block, index) => {
    const before = snapshots[Math.min(index, snapshots.length - 1)];
    const result = _builderRecordElementRevision(block, before, "format", label, {
      kind: "block-format",
      attributeMode: "presentation"
    });
    if (result.ok) ids.push(result.id);
  });
  if (ids.length) _builderDispatchTrackedInput(doc, "formatTrackedChange");
  return { ok: ids.length > 0, ids, applied };
}
function _builderTrackStructureReplacementCommand(doc, command, value, label, executor) {
  const blocks = _builderSelectedParagraphBlocks(doc);
  if (!blocks.length) return { ok: false, direct: true };
  const listRoots = Array.from(new Set(blocks.map((block) => block.closest?.("ul,ol")).filter(Boolean)));
  const roots = listRoots.length === 1 && blocks.every((block) => listRoots[0].contains(block)) ? [listRoots[0]] : blocks.filter((block) => !blocks.some((other) => other !== block && other.contains(block)));
  const parent = roots[0]?.parentNode;
  if (!parent || roots.some((root) => root.parentNode !== parent)) return { ok: false, direct: true };
  const start = doc.createComment("allo-change-start");
  const end = doc.createComment("allo-change-end");
  const beforeHtml = roots.map((root) => root.outerHTML).join("");
  parent.insertBefore(start, roots[0]);
  parent.insertBefore(end, roots[roots.length - 1].nextSibling);
  const applied = typeof executor === "function" ? executor() : typeof doc.execCommand === "function" ? doc.execCommand(command, false, value) : false;
  if (!start.parentNode || start.parentNode !== end.parentNode) {
    start.remove();
    end.remove();
    return { ok: false, direct: true, applied };
  }
  const wrapper = doc.createElement("div");
  wrapper.setAttribute("style", "display:contents;");
  start.parentNode.insertBefore(wrapper, start.nextSibling);
  let current = wrapper.nextSibling;
  while (current && current !== end) {
    const next = current.nextSibling;
    wrapper.appendChild(current);
    current = next;
  }
  start.remove();
  end.remove();
  if (!wrapper.childNodes.length) {
    wrapper.remove();
    return { ok: false, direct: true, applied };
  }
  const beforeSnapshot = {
    tag: "div",
    attributeMode: "presentation",
    attributes: { style: "display:contents;" },
    html: beforeHtml
  };
  const result = _builderRecordElementRevision(wrapper, beforeSnapshot, "structure", label, {
    kind: "structure-replace",
    action: "replace",
    attributeMode: "presentation",
    includeContent: true
  });
  if (!result.ok) {
    _builderStripAdvancedTrackedMetadata(wrapper);
    _builderUnwrapTrackedContainer(wrapper);
    return { ok: false, noChange: true, direct: Boolean(applied) };
  }
  _builderDispatchTrackedInput(doc, "structureTrackedChange");
  return result;
}
function _builderRefreshAdvancedAfterSnapshots(root) {
  const body = root?.body || root?.querySelector?.("body") || (String(root?.tagName || "").toLowerCase() === "body" ? root : null);
  if (body?.getAttribute("data-allo-tracked-view") === "original") return;
  const markers = Array.from(root?.querySelectorAll?.(_BUILDER_ADVANCED_CHANGE_SELECTOR) || []);
  markers.reverse().forEach((marker) => {
    const kind = marker.getAttribute("data-allo-change-kind") || "";
    if (kind === "structure-delete") return;
    const before = _builderRevisionSnapshotDecode(marker.getAttribute("data-allo-change-before"));
    if (!before) return;
    const after = _builderCaptureElementRevision(marker, {
      attributeMode: before.attributeMode,
      includeContent: Object.prototype.hasOwnProperty.call(before, "html")
    });
    if (after) marker.setAttribute("data-allo-change-after", JSON.stringify(after));
  });
}
function _builderSetTrackedMarkupView(root, requestedView = "all") {
  const view = ["all", "simple", "none", "original"].includes(requestedView) ? requestedView : "all";
  const body = root?.body || root?.querySelector?.("body") || (String(root?.tagName || "").toLowerCase() === "body" ? root : null);
  if (!body) return view;
  if (body.getAttribute("data-allo-tracked-view") !== "original") _builderRefreshAdvancedAfterSnapshots(root);
  body.setAttribute("data-allo-tracked-view", view);
  body.removeAttribute("data-allo-show-tracked-markup");
  for (let pass = 0; pass < 2; pass += 1) {
    Array.from(root?.querySelectorAll?.(_BUILDER_ADVANCED_CHANGE_SELECTOR) || []).forEach((marker) => {
      const kind = marker.getAttribute("data-allo-change-kind") || "";
      if (kind === "structure-insert" && view === "original") return;
      const snapshot = _builderRevisionSnapshotDecode(marker.getAttribute(view === "original" ? "data-allo-change-before" : "data-allo-change-after"));
      if (snapshot) _builderApplyElementRevisionSnapshot(marker, snapshot, { content: true });
      marker.setAttribute("data-allo-change-preview-state", view === "original" ? "before" : "after");
    });
  }
  if (root?.nodeType === 9 && root.body) {
    _builderRefreshTableOfContents(root);
    _builderRefreshDocumentReferences(root);
  }
  return view;
}
function _builderTrackedChangeEntries(doc) {
  if (!doc?.querySelectorAll) return [];
  const seen = /* @__PURE__ */ new Set();
  return Array.from(doc.querySelectorAll(_BUILDER_CHANGE_SELECTOR)).filter((marker) => !marker.hasAttribute("data-allo-change-group-secondary")).filter((marker) => {
    const type = _builderTrackedChangeType(marker);
    return marker.matches?.(_BUILDER_ADVANCED_CHANGE_SELECTOR) || type === "delete" || String(marker.textContent || "").length || marker.querySelector?.("br,img,svg,math,table");
  }).map((marker, index) => {
    const type = _builderTrackedChangeType(marker);
    _builderPrepareTrackedChangeMarker(marker, type);
    let id = marker.getAttribute("data-allo-change-id") || "change-" + (index + 1);
    if (seen.has(id)) {
      id = (id + "-" + (index + 1)).slice(0, 80);
      marker.setAttribute("data-allo-change-id", id);
    }
    seen.add(id);
    const label = marker.getAttribute("data-allo-change-label") || (type === "delete" ? "Deletion" : type === "insert" ? "Insertion" : type === "paragraph" ? "Paragraph formatting" : type === "structure" ? "Structural change" : "Formatting change");
    return {
      id,
      index,
      type,
      kind: marker.getAttribute("data-allo-change-kind") || (type === "delete" ? "text-delete" : "text-insert"),
      label,
      scopes: String(marker.getAttribute("data-allo-change-scopes") || type).split(",").filter(Boolean),
      action: marker.getAttribute("data-allo-change-action") || "",
      text: _builderCitationPlain(marker.getAttribute("data-allo-change-summary"), 220) || String(marker.textContent || "").replace(/\s+/g, " ").trim().slice(0, 220) || label,
      at: marker.getAttribute("data-allo-change-at") || "",
      author: marker.getAttribute("data-allo-change-author") || "You",
      node: marker
    };
  });
}
function _builderTrackedRangeBoundaryElement(node) {
  return node?.nodeType === 1 ? node : node?.parentElement;
}
function _builderTrackedRangeBlock(range) {
  const selector = "p,h1,h2,h3,h4,h5,h6,li,blockquote,figcaption,pre,address,dt,dd,td,th,div";
  const start = _builderTrackedRangeBoundaryElement(range?.startContainer)?.closest?.(selector);
  const end = _builderTrackedRangeBoundaryElement(range?.endContainer)?.closest?.(selector);
  return start && start === end ? start : null;
}
function _builderRangeTrackedChange(range, type) {
  const start = _builderTrackedRangeBoundaryElement(range?.startContainer)?.closest?.(_BUILDER_CHANGE_SELECTOR);
  const end = _builderTrackedRangeBoundaryElement(range?.endContainer)?.closest?.(_BUILDER_CHANGE_SELECTOR);
  if (!start || start !== end) return null;
  return !type || _builderTrackedChangeType(start) === type ? start : null;
}
function _builderRangeContainsTrackedChange(range) {
  if (!range) return false;
  if (_builderTrackedRangeBoundaryElement(range.startContainer)?.closest?.(_BUILDER_CHANGE_SELECTOR)) return true;
  if (_builderTrackedRangeBoundaryElement(range.endContainer)?.closest?.(_BUILDER_CHANGE_SELECTOR)) return true;
  try {
    return Boolean(range.cloneContents().querySelector?.(_BUILDER_CHANGE_SELECTOR));
  } catch (_) {
    return false;
  }
}
function _builderSetTrackedSelection(doc, range) {
  try {
    const selection = doc?.getSelection?.();
    if (!selection || !range) return false;
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  } catch (_) {
    return false;
  }
}
function _builderAdjacentTrackedTextRange(doc, sourceRange, direction) {
  if (!doc || !sourceRange?.collapsed) return sourceRange?.cloneRange?.() || null;
  const backward = direction !== "forward";
  const block = _builderTrackedRangeBlock(sourceRange);
  if (!block) return null;
  const allowedText = (node) => node?.nodeType === 3 && node.nodeValue && !node.parentElement?.closest("del[data-allo-change-id],script,style,.allo-block-controls,.allo-block-remove,[data-allo-crop-ui],[data-allo-page-element]");
  const descendant = (root, reverse) => {
    if (!root) return null;
    if (allowedText(root)) return root;
    if (root.nodeType !== 1 || root.matches?.("del[data-allo-change-id],script,style,.allo-block-controls,.allo-block-remove,[data-allo-crop-ui],[data-allo-page-element]")) return null;
    const children = Array.from(root.childNodes || []);
    if (reverse) children.reverse();
    for (const child of children) {
      const found = descendant(child, reverse);
      if (found) return found;
    }
    return null;
  };
  const siblingText = (node, reverse) => {
    let current = node;
    while (current && current !== block) {
      let sibling = reverse ? current.previousSibling : current.nextSibling;
      while (sibling) {
        const found = descendant(sibling, reverse);
        if (found) return found;
        sibling = reverse ? sibling.previousSibling : sibling.nextSibling;
      }
      current = current.parentNode;
    }
    return null;
  };
  let textNode = null;
  let offset = 0;
  const container = sourceRange.startContainer;
  if (container?.nodeType === 3) {
    if (backward && sourceRange.startOffset > 0) {
      textNode = container;
      offset = sourceRange.startOffset;
    } else if (!backward && sourceRange.startOffset < String(container.nodeValue || "").length) {
      textNode = container;
      offset = sourceRange.startOffset;
    } else {
      textNode = siblingText(container, backward);
      offset = backward ? String(textNode?.nodeValue || "").length : 0;
    }
  } else if (container?.nodeType === 1) {
    const child = backward ? container.childNodes[sourceRange.startOffset - 1] : container.childNodes[sourceRange.startOffset];
    textNode = descendant(child, backward) || siblingText(container, backward);
    offset = backward ? String(textNode?.nodeValue || "").length : 0;
  }
  if (!allowedText(textNode)) return null;
  const value = String(textNode.nodeValue || "");
  const character = backward ? Array.from(value.slice(0, offset)).pop() : Array.from(value.slice(offset))[0];
  if (!character) return null;
  const range = doc.createRange();
  if (backward) {
    range.setStart(textNode, offset - character.length);
    range.setEnd(textNode, offset);
  } else {
    range.setStart(textNode, offset);
    range.setEnd(textNode, offset + character.length);
  }
  return range;
}
function _builderDispatchTrackedInput(doc, inputType) {
  try {
    const event = new doc.defaultView.Event("input", { bubbles: true });
    try {
      Object.defineProperty(event, "inputType", { value: inputType || "insertTrackedChange" });
    } catch (_) {
    }
    doc.body?.setAttribute("data-allo-user-edited", "1");
    doc.body?.dispatchEvent(event);
  } catch (_) {
  }
}
function _builderReplaceRangeWithTrackedNodes(doc, range, markers, focusMode) {
  if (!doc || !range || !markers?.length) return [];
  const ids = markers.map((marker) => marker.getAttribute("data-allo-change-id"));
  _builderSetTrackedSelection(doc, range);
  let inserted = [];
  try {
    if (typeof doc.execCommand === "function") {
      const holder = doc.createElement("div");
      markers.forEach((marker) => holder.appendChild(marker.cloneNode(true)));
      if (doc.execCommand("insertHTML", false, holder.innerHTML)) {
        inserted = ids.map((id) => Array.from(doc.querySelectorAll(_BUILDER_CHANGE_SELECTOR)).find((marker) => marker.getAttribute("data-allo-change-id") === id)).filter(Boolean);
      }
    }
  } catch (_) {
  }
  if (!inserted.length) {
    try {
      range.deleteContents();
      const fragment = doc.createDocumentFragment();
      markers.forEach((marker) => fragment.appendChild(marker));
      range.insertNode(fragment);
      inserted = markers;
    } catch (_) {
      return [];
    }
  }
  const focusMarker = focusMode === "insert" ? inserted.slice().reverse().find((marker) => _builderTrackedChangeType(marker) === "insert") : inserted[0];
  if (focusMarker) {
    const nextRange = doc.createRange();
    if (focusMode === "insert") {
      nextRange.selectNodeContents(focusMarker);
      nextRange.collapse(false);
    } else {
      nextRange.setStartBefore(focusMarker);
      nextRange.collapse(true);
    }
    _builderSetTrackedSelection(doc, nextRange);
  }
  _builderDispatchTrackedInput(doc, focusMode === "insert" ? "insertTrackedChange" : "deleteTrackedChange");
  return inserted;
}
function _builderTrackTextInsertion(doc, text, suppliedRange) {
  const value = String(text ?? "");
  if (!doc?.body || !value) return { ok: false, error: "There is no text to insert." };
  const selection = doc.getSelection?.();
  const range = suppliedRange?.cloneRange ? suppliedRange.cloneRange() : selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
  if (!range) return { ok: false, error: "Place the caret in the document first." };
  const existingInsertion = _builderRangeTrackedChange(range, "insert");
  if (existingInsertion) {
    try {
      range.deleteContents();
      const marker2 = doc.createTextNode(value);
      range.insertNode(marker2);
      range.setStartAfter(marker2);
      range.collapse(true);
      _builderSetTrackedSelection(doc, range);
      _builderPrepareTrackedChangeMarker(existingInsertion, "insert");
      _builderDispatchTrackedInput(doc, "insertTrackedChange");
      return { ok: true, id: existingInsertion.getAttribute("data-allo-change-id"), marker: existingInsertion };
    } catch (_) {
      return { ok: false, error: "The insertion could not be tracked." };
    }
  }
  if (!_builderTrackedRangeBlock(range)) return { ok: false, blocked: true, error: "Track Changes handles text within one paragraph at a time." };
  if (!range.collapsed && _builderRangeContainsTrackedChange(range)) return { ok: false, blocked: true, error: "Accept or reject the selected revision before replacing it." };
  const markers = [];
  if (!range.collapsed) markers.push(_builderCreateTrackedChange(doc, "delete", range.cloneContents()));
  const insertion = _builderCreateTrackedChange(doc, "insert", value);
  markers.push(insertion);
  const live = _builderReplaceRangeWithTrackedNodes(doc, range, markers, "insert");
  const marker = live.find((item) => _builderTrackedChangeType(item) === "insert") || null;
  return marker ? { ok: true, id: marker.getAttribute("data-allo-change-id"), marker } : { ok: false, error: "The insertion could not be tracked." };
}
function _builderTrackTextDeletion(doc, direction = "backward", suppliedRange) {
  if (!doc?.body) return { ok: false, error: "The editable document is not ready." };
  const selection = doc.getSelection?.();
  let range = suppliedRange?.cloneRange ? suppliedRange.cloneRange() : selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
  if (!range) return { ok: false, error: "Place the caret in the document first." };
  if (range.collapsed) range = _builderAdjacentTrackedTextRange(doc, range, direction);
  if (!range || range.collapsed) return { ok: false, structural: true };
  const existingInsertion = _builderRangeTrackedChange(range, "insert");
  if (existingInsertion) {
    try {
      range.deleteContents();
      _builderSetTrackedSelection(doc, range);
      _builderDispatchTrackedInput(doc, "deleteTrackedInsertion");
      return { ok: true, revertedInsertion: true, id: existingInsertion.getAttribute("data-allo-change-id") || "" };
    } catch (_) {
      return { ok: false, error: "The inserted text could not be removed." };
    }
  }
  if (!_builderTrackedRangeBlock(range)) return { ok: false, blocked: true, error: "Track Changes handles deletions within one paragraph at a time." };
  if (_builderRangeContainsTrackedChange(range)) return { ok: false, blocked: true, error: "Accept or reject the selected revision before deleting it." };
  const deletion = _builderCreateTrackedChange(doc, "delete", range.cloneContents());
  const live = _builderReplaceRangeWithTrackedNodes(doc, range, [deletion], "delete");
  const marker = live[0] || null;
  return marker ? { ok: true, id: marker.getAttribute("data-allo-change-id"), marker } : { ok: false, error: "The deletion could not be tracked." };
}
function _builderHandleTrackedBeforeInput(doc, event) {
  if (!doc?.body || doc.body.getAttribute("data-allo-track-changes") !== "1" || event?.defaultPrevented || event?.isComposing) return { handled: false };
  const inputType = String(event?.inputType || "");
  const selection = doc.getSelection?.();
  const range = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
  if (!range) return { handled: false };
  const insertTypes = ["insertText", "insertReplacementText", "insertFromPaste", "insertFromDrop", "insertFromYank"];
  if (insertTypes.includes(inputType)) {
    const value = event?.data ?? event?.dataTransfer?.getData?.("text/plain") ?? "";
    if (!value) return { handled: false };
    if (_builderRangeTrackedChange(range, "insert")) return { handled: false, tracked: true };
    const result = _builderTrackTextInsertion(doc, value, range);
    if (result.ok || result.blocked) event.preventDefault?.();
    return { handled: Boolean(result.ok || result.blocked), ...result };
  }
  const deleteTypes = ["deleteContentBackward", "deleteContentForward", "deleteByCut", "deleteByDrag"];
  if (deleteTypes.includes(inputType)) {
    const direction = inputType === "deleteContentForward" ? "forward" : "backward";
    const targetRange = range.collapsed ? _builderAdjacentTrackedTextRange(doc, range, direction) : range;
    if (!targetRange) return { handled: false, structural: true };
    if (_builderRangeTrackedChange(targetRange, "insert")) {
      if (range.collapsed) _builderSetTrackedSelection(doc, targetRange);
      return { handled: false, tracked: true };
    }
    const result = _builderTrackTextDeletion(doc, direction, targetRange);
    if (result.ok || result.blocked) event.preventDefault?.();
    return { handled: Boolean(result.ok || result.blocked), ...result };
  }
  return { handled: false, structural: true };
}
function _builderApplyTrackedChange(marker, decision = "accept", options = {}) {
  if (!marker?.parentNode || !marker.matches?.(_BUILDER_CHANGE_SELECTOR)) return false;
  const groupId = marker.getAttribute?.("data-allo-change-group") || "";
  if (groupId && !options.skipGroup) {
    const root = marker.getRootNode?.() || marker.ownerDocument;
    const peers = Array.from(root?.querySelectorAll?.("[data-allo-change-group]") || []).filter((candidate) => candidate.getAttribute("data-allo-change-group") === groupId && candidate.parentNode);
    if (peers.length) {
      let applied = false;
      peers.reverse().forEach((candidate) => {
        applied = _builderApplyTrackedChange(candidate, decision, { skipGroup: true }) || applied;
      });
      return applied;
    }
  }
  const type = _builderTrackedChangeType(marker);
  const advanced = marker.matches?.(_BUILDER_ADVANCED_CHANGE_SELECTOR);
  if (!advanced) {
    const keepContent = type === "insert" && decision === "accept" || type === "delete" && decision === "reject";
    if (keepContent) marker.replaceWith(...Array.from(marker.childNodes));
    else marker.remove();
    return true;
  }
  const kind = marker.getAttribute("data-allo-change-kind") || "";
  const accepting = decision === "accept";
  if (kind === "reference-insert") {
    const snapshot2 = _builderRevisionSnapshotDecode(marker.getAttribute(accepting ? "data-allo-change-after" : "data-allo-change-before"));
    if (snapshot2) _builderApplyElementRevisionSnapshot(marker, snapshot2, { content: true });
    _builderStripAdvancedTrackedMetadata(marker);
    if (!accepting) return marker.childNodes.length ? _builderUnwrapTrackedContainer(marker) : (marker.remove(), true);
    return true;
  }
  if (kind === "reference-remove") {
    const snapshot2 = _builderRevisionSnapshotDecode(marker.getAttribute(accepting ? "data-allo-change-after" : "data-allo-change-before"));
    if (snapshot2) _builderApplyElementRevisionSnapshot(marker, snapshot2, { content: true });
    _builderStripAdvancedTrackedMetadata(marker);
    if (accepting) return marker.childNodes.length ? _builderUnwrapTrackedContainer(marker) : (marker.remove(), true);
    return true;
  }
  if (kind === "structure-insert") {
    if (!accepting) {
      marker.remove();
      return true;
    }
    const unwrapAfterAccept = marker.getAttribute("data-allo-unwrap-on-accept") === "1";
    const after = _builderRevisionSnapshotDecode(marker.getAttribute("data-allo-change-after"));
    if (after) _builderApplyElementRevisionSnapshot(marker, after, { content: true });
    _builderStripAdvancedTrackedMetadata(marker);
    if (unwrapAfterAccept) {
      marker.removeAttribute("data-allo-unwrap-on-accept");
      return _builderUnwrapTrackedContainer(marker);
    }
    return true;
  }
  if (kind === "structure-delete") {
    if (accepting) {
      marker.remove();
      return true;
    }
    const before = _builderRevisionSnapshotDecode(marker.getAttribute("data-allo-change-before"));
    let restored = _builderReplaceElementTagForRevision(marker, before);
    if (before) _builderApplyElementRevisionSnapshot(restored, before, { content: true });
    _builderStripAdvancedTrackedMetadata(restored);
    return true;
  }
  const snapshot = _builderRevisionSnapshotDecode(marker.getAttribute(accepting ? "data-allo-change-after" : "data-allo-change-before"));
  let resolved = marker;
  if (snapshot && !accepting && kind === "block-format") resolved = _builderReplaceElementTagForRevision(marker, snapshot);
  if (snapshot) _builderApplyElementRevisionSnapshot(resolved, snapshot, { content: true });
  _builderStripAdvancedTrackedMetadata(resolved);
  if (kind === "structure-replace") return _builderUnwrapTrackedContainer(resolved);
  if (kind === "inline-format" && String(resolved.tagName || "").toLowerCase() === "span" && !resolved.attributes.length) {
    return _builderUnwrapTrackedContainer(resolved);
  }
  return true;
}
function _builderFinalizeTrackedChanges(root, decision = "accept") {
  if (!root?.querySelectorAll) return root;
  Array.from(root.querySelectorAll(_BUILDER_CHANGE_SELECTOR)).reverse().forEach((marker) => {
    if (marker?.isConnected || marker?.parentNode) _builderApplyTrackedChange(marker, decision);
  });
  const body = root?.body || root?.querySelector?.("body") || (String(root?.tagName || "").toLowerCase() === "body" ? root : null);
  root.removeAttribute?.("data-allo-track-changes");
  body?.removeAttribute("data-allo-track-changes");
  body?.removeAttribute("data-allo-tracked-view");
  body?.removeAttribute("data-allo-review-balloons");
  body?.removeAttribute("data-allo-reviewer-name");
  return root;
}
function _builderRefreshFinalDocumentFields(root) {
  if (!root?.querySelectorAll) return root;
  let scope = root;
  let fieldDocument = root.nodeType === 9 ? root : null;
  if (!fieldDocument) {
    const staging = root.ownerDocument?.implementation?.createHTMLDocument?.("");
    if (!staging) return root;
    const imported = staging.importNode(root, true);
    const tag = String(root.tagName || "").toLowerCase();
    if (tag === "html") staging.replaceChild(imported, staging.documentElement);
    else if (tag === "body") staging.body.replaceWith(imported);
    else staging.body.replaceChildren(imported);
    fieldDocument = staging;
    scope = tag === "html" ? staging.documentElement : tag === "body" ? staging.body : imported;
  }
  _builderRefreshTableOfContents(fieldDocument);
  _builderRefreshDocumentReferences(fieldDocument);
  return scope;
}
function _builderPrepareCitationFieldsForExport(root) {
  if (!root?.querySelectorAll) return root;
  Array.from(root.querySelectorAll(_BUILDER_CITATION_SELECTOR)).forEach((node) => {
    node.removeAttribute("tabindex");
    node.removeAttribute("aria-keyshortcuts");
    node.removeAttribute("aria-haspopup");
    const label = String(node.getAttribute("aria-label") || "").replace(/\.\s*Press Enter to edit\.?$/i, "").replace(/\s*Press Enter to edit\.?$/i, "").trim();
    if (label) node.setAttribute("aria-label", label);
    else node.removeAttribute("aria-label");
    node.setAttribute("title", node.getAttribute("aria-invalid") === "true" ? "Broken citation" : "Citation");
    node.querySelectorAll("[data-allo-citation-link]").forEach((link) => link.removeAttribute("tabindex"));
  });
  return root;
}
function _builderFinalizeDocumentForExport(root) {
  if (!root?.querySelectorAll) return root;
  _builderClearReviewCommentTransientState(root);
  _builderClearTrackedChangeTransientState(root);
  _builderStripReviewComments(root);
  _builderFinalizeTrackedChanges(root, "accept");
  return _builderPrepareCitationFieldsForExport(_builderRefreshFinalDocumentFields(root));
}
function _builderClearTrackedChangeTransientState(root) {
  _builderSetTrackedMarkupView(root, "all");
  root?.querySelectorAll?.(_BUILDER_CHANGE_SELECTOR).forEach((marker) => {
    marker.removeAttribute("data-allo-change-active");
    marker.removeAttribute("data-allo-change-preview-state");
  });
  const body = root?.body || root?.querySelector?.("body") || (String(root?.tagName || "").toLowerCase() === "body" ? root : null);
  root?.removeAttribute?.("data-allo-show-tracked-markup");
  body?.removeAttribute("data-allo-show-tracked-markup");
  body?.removeAttribute("data-allo-tracked-view");
  body?.removeAttribute("data-allo-review-balloons");
  body?.removeAttribute("data-allo-reviewer-name");
  return root;
}
function _builderSuspendTrackedChanges(root) {
  if (!root?.querySelectorAll) return () => {
  };
  const doc = root.ownerDocument || (root.nodeType === 9 ? root : null);
  const advancedRecords = [];
  const topLevelAdvanced = Array.from(root.querySelectorAll(_BUILDER_ADVANCED_CHANGE_SELECTOR)).filter((marker) => !marker.parentElement?.closest?.(_BUILDER_ADVANCED_CHANGE_SELECTOR));
  topLevelAdvanced.forEach((marker, index) => {
    const parent = marker.parentNode;
    if (!parent || !doc?.createComment) return;
    const start = doc.createComment("allo-advanced-change-start-" + index);
    const end = doc.createComment("allo-advanced-change-end-" + index);
    const saved = marker.cloneNode(true);
    parent.insertBefore(start, marker);
    parent.insertBefore(end, marker.nextSibling);
    _builderApplyTrackedChange(marker, "accept");
    const nested = [];
    let current = start.nextSibling;
    while (current && current !== end) {
      if (current.nodeType === 1) {
        if (current.matches?.(_BUILDER_CHANGE_SELECTOR)) nested.push(current);
        nested.push(...Array.from(current.querySelectorAll?.(_BUILDER_CHANGE_SELECTOR) || []));
      }
      current = current.nextSibling;
    }
    nested.reverse().forEach((nestedMarker) => {
      if (nestedMarker.parentNode) _builderApplyTrackedChange(nestedMarker, "accept");
    });
    advancedRecords.push({ start, end, saved });
  });
  const records = [];
  Array.from(root.querySelectorAll("ins[data-allo-change-id],del[data-allo-change-id]")).forEach((marker) => {
    if (!marker.parentNode) return;
    const type = _builderTrackedChangeType(marker);
    if (type === "insert") {
      const children = Array.from(marker.childNodes);
      marker.replaceWith(...children);
      records.push({ type, marker, children });
    } else {
      const parent = marker.parentNode;
      const nextSibling = marker.nextSibling;
      marker.remove();
      records.push({ type, marker, parent, nextSibling });
    }
  });
  return () => {
    records.reverse().forEach((record) => {
      if (record.type === "insert") {
        const first = record.children.find((node) => node.parentNode);
        const parent = first?.parentNode;
        if (!parent) return;
        parent.insertBefore(record.marker, first);
        record.children.forEach((node) => {
          if (node.parentNode === parent) record.marker.appendChild(node);
        });
      } else if (record.parent?.isConnected) {
        const reference = record.nextSibling?.parentNode === record.parent ? record.nextSibling : null;
        record.parent.insertBefore(record.marker, reference);
      }
    });
    advancedRecords.reverse().forEach((record) => {
      const parent = record.start?.parentNode;
      if (!parent || record.end?.parentNode !== parent) return;
      let current = record.start.nextSibling;
      while (current && current !== record.end) {
        const next = current.nextSibling;
        current.remove();
        current = next;
      }
      parent.insertBefore(record.saved, record.end);
      record.start.remove();
      record.end.remove();
    });
  };
}
const _BUILDER_BOOKMARK_SELECTOR = '[data-allo-bookmark="1"][id]';
const _BUILDER_CROSS_REFERENCE_SELECTOR = 'a[data-allo-cross-reference="1"]';
const _BUILDER_FOOTNOTE_REFERENCE_SELECTOR = "sup[data-allo-footnote-ref]";
const _BUILDER_FOOTNOTE_SELECTOR = "li[data-allo-footnote]";
const _BUILDER_FOOTNOTES_SELECTOR = 'section[data-allo-footnotes="1"]';
const _BUILDER_CITATION_STORE_SELECTOR = '[data-allo-citation-store="1"]';
const _BUILDER_CITATION_SELECTOR = 'span[data-allo-citation="1"]';
const _BUILDER_BIBLIOGRAPHY_SELECTOR = 'section[data-allo-bibliography="1"]';
function _builderNormalizeBookmarkName(value) {
  return String(value || "").replace(/[\u200B\uFEFF]/g, "").replace(/\s+/g, " ").trim().slice(0, 80);
}
function _builderReferenceSlug(value, fallback = "reference") {
  return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 56) || fallback;
}
function _builderUniqueReferenceId(doc, prefix, value) {
  const base = String(prefix || "reference").replace(/[^a-zA-Z0-9_-]/g, "") + "-" + _builderReferenceSlug(value, Date.now().toString(36));
  let candidate = base;
  let suffix = 2;
  while (doc?.getElementById?.(candidate)) {
    candidate = base + "-" + suffix;
    suffix += 1;
  }
  return candidate;
}
function _builderReferenceRange(doc, suppliedRange) {
  if (!doc?.body) return null;
  let range = suppliedRange?.cloneRange?.() || null;
  const selection = doc.getSelection?.();
  if (!range && selection?.rangeCount) range = selection.getRangeAt(0).cloneRange();
  if (!range) return null;
  const start = range.startContainer?.nodeType === 1 ? range.startContainer : range.startContainer?.parentElement;
  const end = range.endContainer?.nodeType === 1 ? range.endContainer : range.endContainer?.parentElement;
  if (!start || !end || !doc.body.contains(start) || !doc.body.contains(end)) return null;
  const blocked = [_BUILDER_TOC_SELECTOR, _BUILDER_FOOTNOTES_SELECTOR, _BUILDER_BIBLIOGRAPHY_SELECTOR, _BUILDER_CITATION_SELECTOR, _BUILDER_CITATION_STORE_SELECTOR].join(",");
  if (start.closest?.(blocked) || end.closest?.(blocked)) return null;
  return range;
}
function _builderSetSelectionAfter(doc, node) {
  try {
    const range = doc.createRange();
    range.setStartAfter(node);
    range.collapse(true);
    const selection = doc.getSelection?.();
    selection?.removeAllRanges();
    selection?.addRange(range);
  } catch (_) {
  }
}
const _BUILDER_CITATION_STYLES = [
  { id: "apa", label: "APA 7", bibliographyTitle: "References" },
  { id: "mla", label: "MLA 9", bibliographyTitle: "Works Cited" },
  { id: "chicago", label: "Chicago author-date", bibliographyTitle: "References" }
];
const _BUILDER_CITATION_SOURCE_TYPES = ["book", "journal", "webpage", "report"];
const _BUILDER_CITATION_ITEM_LIMIT = 20;
function _builderCitationPlain(value, limit = 500) {
  return String(value == null ? "" : value).replace(/[\u200B\uFEFF]/g, "").replace(/\s+/g, " ").trim().slice(0, limit);
}
function _builderNormalizeCitationStyle(value) {
  const style = String(value || "").toLowerCase();
  return _BUILDER_CITATION_STYLES.some((entry) => entry.id === style) ? style : "apa";
}
function _builderCitationSourceId(value) {
  const normalized = _builderCitationPlain(value, 80).replace(/[^a-zA-Z0-9_-]/g, "");
  return normalized || "source-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
}
function _builderNormalizeCitationSource(value = {}, index = 0) {
  const type = _BUILDER_CITATION_SOURCE_TYPES.includes(String(value.type || "").toLowerCase()) ? String(value.type).toLowerCase() : "webpage";
  const authors = Array.isArray(value.authors) ? value.authors : String(value.authors || value.author || "").split(";");
  const normalizedAuthors = authors.map((author) => _builderCitationPlain(author, 120)).filter(Boolean).slice(0, 20);
  return {
    id: _builderCitationSourceId(value.id || "source-" + (index + 1)),
    type,
    authors: normalizedAuthors,
    corporateAuthor: _builderCitationPlain(value.corporateAuthor, 160),
    title: _builderCitationPlain(value.title, 300),
    containerTitle: _builderCitationPlain(value.containerTitle || value.websiteTitle || value.journalTitle, 300),
    publisher: _builderCitationPlain(value.publisher, 200),
    year: _builderCitationPlain(value.year, 20),
    volume: _builderCitationPlain(value.volume, 40),
    issue: _builderCitationPlain(value.issue, 40),
    pages: _builderCitationPlain(value.pages, 80),
    url: _builderCitationPlain(value.url || value.URL, 1e3),
    doi: _builderCitationPlain(value.doi || value.DOI, 300).replace(/^(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:\s*)/i, ""),
    accessed: _builderCitationPlain(value.accessed, 80)
  };
}
function _builderNormalizeCitationSources(value) {
  const sources = Array.isArray(value) ? value : [];
  const seen = /* @__PURE__ */ new Set();
  return sources.map((source, index) => _builderNormalizeCitationSource(source, index)).filter((source) => source.title || source.authors.length || source.corporateAuthor).filter((source) => {
    let id = source.id;
    let suffix = 2;
    while (seen.has(id)) {
      id = source.id + "-" + suffix;
      suffix += 1;
    }
    source.id = id;
    seen.add(id);
    return true;
  }).slice(0, 200);
}
function _builderNormalizeCitationItem(value = {}) {
  const rawSourceId = _builderCitationPlain(value.sourceId || value.source || value.id, 80);
  return {
    sourceId: rawSourceId.replace(/[^a-zA-Z0-9_-]/g, ""),
    locator: _builderCitationPlain(value.locator || value.page, 80),
    prefix: _builderCitationPlain(value.prefix, 120),
    suffix: _builderCitationPlain(value.suffix, 120),
    suppressAuthor: value.suppressAuthor === true || value.suppressAuthor === "true" || value.suppressAuthor === 1,
    suppressYear: value.suppressYear === true || value.suppressYear === "true" || value.suppressYear === 1
  };
}
function _builderNormalizeCitationItems(value) {
  const items = Array.isArray(value) ? value : [];
  const seen = /* @__PURE__ */ new Set();
  return items.map((item) => _builderNormalizeCitationItem(item)).filter((item) => item.sourceId && !seen.has(item.sourceId) && seen.add(item.sourceId)).slice(0, _BUILDER_CITATION_ITEM_LIMIT);
}
function _builderCitationItems(node) {
  if (!node?.getAttribute) return [];
  const serialized = node.getAttribute("data-allo-citation-items");
  if (serialized) {
    try {
      const parsed = _builderNormalizeCitationItems(JSON.parse(serialized));
      if (parsed.length) return parsed;
    } catch (_) {
    }
  }
  const sourceId = _builderCitationPlain(node.getAttribute("data-allo-citation-source"), 80).replace(/[^a-zA-Z0-9_-]/g, "");
  return sourceId ? [_builderNormalizeCitationItem({
    sourceId,
    locator: node.getAttribute("data-allo-citation-locator")
  })] : [];
}
function _builderWriteCitationItems(node, value) {
  if (!node?.setAttribute) return [];
  const items = _builderNormalizeCitationItems(value);
  node.setAttribute("data-allo-citation-items", JSON.stringify(items));
  node.setAttribute("data-allo-citation-source", items[0]?.sourceId || "");
  node.setAttribute("data-allo-citation-locator", items[0]?.locator || "");
  return items;
}
function _builderCitationSourceTypeFromImport(value) {
  const type = String(value || "").trim().toLowerCase();
  if (["jour", "jfull", "ejour", "article", "journal-article", "proceedings-article"].includes(type)) return "journal";
  if (["book", "ebook", "inbook", "incollection", "book-chapter", "edited-book", "monograph", "reference-book"].includes(type)) return "book";
  if (["rprt", "report", "techreport", "report-series", "posted-content"].includes(type)) return "report";
  return "webpage";
}
function _builderCitationSourceFromCrossref(message = {}) {
  const authorRecords = Array.isArray(message.author) ? message.author : [];
  const authors = authorRecords.map((author) => {
    const family = _builderCitationPlain(author?.family, 80);
    const given = _builderCitationPlain(author?.given, 100);
    return [family, given].filter(Boolean).join(", ");
  }).filter(Boolean);
  const dateRecord = message.issued || message.published || message["published-print"] || message["published-online"] || {};
  const dateParts = Array.isArray(dateRecord["date-parts"]) ? dateRecord["date-parts"][0] : [];
  const institution = Array.isArray(message.institution) ? message.institution[0] : message.institution;
  return _builderNormalizeCitationSource({
    type: _builderCitationSourceTypeFromImport(message.type),
    authors,
    corporateAuthor: authors.length ? "" : _builderCitationPlain(institution?.name || institution, 160),
    title: Array.isArray(message.title) ? message.title[0] : message.title,
    containerTitle: Array.isArray(message["container-title"]) ? message["container-title"][0] : message["container-title"],
    publisher: message.publisher,
    year: Array.isArray(dateParts) && dateParts[0] ? String(dateParts[0]) : "",
    volume: message.volume,
    issue: message.issue,
    pages: message.page || message["article-number"],
    url: message.URL,
    doi: message.DOI
  });
}
function _builderParseRIS(value) {
  const text = String(value || "").replace(/\r\n?/g, "\n").slice(0, 5e5);
  const records = [];
  let record = {};
  let lastTag = "";
  const addValue = (tag, content) => {
    if (!record[tag]) record[tag] = [];
    record[tag].push(_builderCitationPlain(content, 2e3));
    lastTag = tag;
  };
  const finish = () => {
    if (Object.keys(record).length) records.push(record);
    record = {};
    lastTag = "";
  };
  text.split("\n").slice(0, 1e4).forEach((line) => {
    const match = line.match(/^([A-Z0-9]{2})\s*-\s?(.*)$/i);
    if (!match) {
      const continuation = _builderCitationPlain(line, 1e3);
      if (continuation && lastTag && record[lastTag]?.length) record[lastTag][record[lastTag].length - 1] += " " + continuation;
      return;
    }
    const tag = match[1].toUpperCase();
    if (tag === "TY" && Object.keys(record).length) finish();
    if (tag === "ER") {
      finish();
      return;
    }
    addValue(tag, match[2]);
  });
  finish();
  return records.slice(0, 200).map((entry) => {
    const first = (...tags) => {
      for (const tag of tags) if (entry[tag]?.find(Boolean)) return entry[tag].find(Boolean);
      return "";
    };
    const all = (...tags) => tags.flatMap((tag) => entry[tag] || []).filter(Boolean);
    const published = first("PY", "Y1", "DA");
    const year = String(published || "").match(/(?:19|20)\d{2}/)?.[0] || published;
    const startPage = first("SP");
    const endPage = first("EP");
    return _builderNormalizeCitationSource({
      type: _builderCitationSourceTypeFromImport(first("TY")),
      authors: all("AU", "A1"),
      corporateAuthor: first("A2"),
      title: first("TI", "T1", "CT"),
      containerTitle: first("JF", "JO", "T2", "JA"),
      publisher: first("PB", "IN"),
      year,
      volume: first("VL"),
      issue: first("IS"),
      pages: startPage && endPage && endPage !== startPage ? startPage + "?" + endPage : startPage || endPage,
      url: first("UR", "L1"),
      doi: first("DO"),
      accessed: first("Y2")
    });
  });
}
function _builderBibTeXRawEntries(value) {
  const text = String(value || "").slice(0, 5e5);
  const entries = [];
  let cursor = 0;
  while (cursor < text.length && entries.length < 200) {
    const at = text.indexOf("@", cursor);
    if (at < 0) break;
    const typeMatch = text.slice(at + 1).match(/^\s*([a-zA-Z]+)\s*([({])/);
    if (!typeMatch) {
      cursor = at + 1;
      continue;
    }
    const type = typeMatch[1].toLowerCase();
    const openIndex = at + 1 + typeMatch[0].lastIndexOf(typeMatch[2]);
    const open = typeMatch[2];
    const close = open === "{" ? "}" : ")";
    let depth = 1;
    let quoted = false;
    let escaped = false;
    let end = openIndex + 1;
    for (; end < text.length; end += 1) {
      const char = text[end];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === '"') {
        quoted = !quoted;
        continue;
      }
      if (quoted) continue;
      if (char === open) depth += 1;
      else if (char === close) depth -= 1;
      if (!depth) break;
    }
    if (depth) break;
    if (!["comment", "preamble", "string"].includes(type)) entries.push({ type, body: text.slice(openIndex + 1, end) });
    cursor = end + 1;
  }
  return entries;
}
function _builderBibTeXFields(body) {
  const fields = {};
  let cursor = String(body || "").indexOf(",");
  if (cursor < 0) return fields;
  cursor += 1;
  while (cursor < body.length) {
    while (cursor < body.length && /[\s,]/.test(body[cursor])) cursor += 1;
    const keyMatch = body.slice(cursor).match(/^([a-zA-Z][\w-]*)\s*=\s*/);
    if (!keyMatch) break;
    const key = keyMatch[1].toLowerCase();
    cursor += keyMatch[0].length;
    let raw = "";
    if (body[cursor] === "{") {
      let depth = 1;
      cursor += 1;
      const start = cursor;
      let escaped = false;
      for (; cursor < body.length; cursor += 1) {
        const char = body[cursor];
        if (escaped) {
          escaped = false;
          continue;
        }
        if (char === "\\") {
          escaped = true;
          continue;
        }
        if (char === "{") depth += 1;
        else if (char === "}") depth -= 1;
        if (!depth) break;
      }
      raw = body.slice(start, cursor);
      cursor += 1;
    } else if (body[cursor] === '"') {
      cursor += 1;
      const start = cursor;
      let escaped = false;
      for (; cursor < body.length; cursor += 1) {
        const char = body[cursor];
        if (escaped) {
          escaped = false;
          continue;
        }
        if (char === "\\") {
          escaped = true;
          continue;
        }
        if (char === '"') break;
      }
      raw = body.slice(start, cursor);
      cursor += 1;
    } else {
      const start = cursor;
      while (cursor < body.length && body[cursor] !== ",") cursor += 1;
      raw = body.slice(start, cursor);
    }
    fields[key] = raw.trim();
    while (cursor < body.length && body[cursor] !== ",") cursor += 1;
  }
  return fields;
}
function _builderBibTeXText(value) {
  return _builderCitationPlain(String(value || "").replace(/\\([&%#_$])/g, "$1").replace(/\\"?\s*([a-zA-Z])/g, "$1").replace(/\\[a-zA-Z]+\*?\s*/g, "").replace(/[{}]/g, "").replace(/~/g, " "), 2e3);
}
function _builderParseBibTeX(value) {
  return _builderBibTeXRawEntries(value).map((entry) => {
    const fields = _builderBibTeXFields(entry.body);
    const rawAuthor = fields.author || "";
    const corporate = /^\s*\{[\s\S]*\}\s*$/.test(rawAuthor) && !/\s+and\s+/i.test(rawAuthor);
    const authorText = _builderBibTeXText(rawAuthor);
    const date = _builderBibTeXText(fields.year || fields.date);
    return _builderNormalizeCitationSource({
      type: _builderCitationSourceTypeFromImport(entry.type),
      authors: corporate ? [] : authorText.split(/\s+and\s+/i).filter(Boolean),
      corporateAuthor: corporate ? authorText : "",
      title: _builderBibTeXText(fields.title),
      containerTitle: _builderBibTeXText(fields.journal || fields.booktitle || fields.howpublished),
      publisher: _builderBibTeXText(fields.publisher || fields.institution || fields.organization),
      year: date.match(/(?:19|20)\d{2}/)?.[0] || date,
      volume: _builderBibTeXText(fields.volume),
      issue: _builderBibTeXText(fields.number || fields.issue),
      pages: _builderBibTeXText(fields.pages).replace(/--/g, "?"),
      url: _builderBibTeXText(fields.url),
      doi: _builderBibTeXText(fields.doi),
      accessed: _builderBibTeXText(fields.urldate)
    });
  });
}
function _builderParseCitationImport(value, requestedFormat = "auto") {
  const text = String(value || "").trim().slice(0, 5e5);
  const selected = ["auto", "ris", "bibtex"].includes(String(requestedFormat || "").toLowerCase()) ? String(requestedFormat || "").toLowerCase() : "auto";
  if (!text) return { format: selected, sources: [], warnings: [], errors: ["Paste RIS or BibTeX records first."] };
  const format = selected === "auto" ? /^\s*@\w+\s*[({]/i.test(text) ? "bibtex" : /^\s*TY\s*-/im.test(text) ? "ris" : "" : selected;
  if (!format) return { format: "unknown", sources: [], warnings: [], errors: ["The pasted text does not look like RIS or BibTeX."] };
  const parsed = format === "ris" ? _builderParseRIS(text) : _builderParseBibTeX(text);
  const sources = _builderNormalizeCitationSources(parsed);
  const warnings = [];
  if (parsed.length > sources.length) warnings.push(parsed.length - sources.length + " incomplete record" + (parsed.length - sources.length === 1 ? " was" : "s were") + " skipped.");
  if (sources.length >= 200) warnings.push("Only the first 200 records were read.");
  return { format, sources, warnings, errors: sources.length ? [] : ["No usable source records were found."] };
}
function _builderCitationStore(doc, create = false) {
  if (!doc?.body) return null;
  let store = doc.querySelector(_BUILDER_CITATION_STORE_SELECTOR);
  if (!store && create) {
    store = doc.createElement("script");
    store.setAttribute("type", "application/json");
    store.setAttribute("data-allo-citation-store", "1");
    store.setAttribute("data-allo-citation-style", "apa");
    store.textContent = "[]";
    doc.body.appendChild(store);
  }
  return store;
}
function _builderCitationSources(doc) {
  const store = _builderCitationStore(doc, false);
  if (!store) return [];
  try {
    return _builderNormalizeCitationSources(JSON.parse(store.textContent || "[]"));
  } catch (_) {
    return [];
  }
}
function _builderCitationStyle(doc) {
  return _builderNormalizeCitationStyle(_builderCitationStore(doc, false)?.getAttribute("data-allo-citation-style"));
}
function _builderWriteCitationSources(doc, sources, style = _builderCitationStyle(doc)) {
  const store = _builderCitationStore(doc, true);
  const normalized = _builderNormalizeCitationSources(sources);
  store.setAttribute("data-allo-citation-style", _builderNormalizeCitationStyle(style));
  store.textContent = JSON.stringify(normalized).replace(/<\//g, "<\\/");
  return normalized;
}
function _builderCitationSurname(author) {
  const name = _builderCitationPlain(author, 120);
  if (!name) return "";
  if (name.includes(",")) return _builderCitationPlain(name.split(",")[0], 80);
  const parts = name.split(/\s+/);
  return parts[parts.length - 1] || name;
}
function _builderCitationGivenName(author) {
  const name = _builderCitationPlain(author, 120);
  if (!name) return "";
  if (name.includes(",")) return _builderCitationPlain(name.split(",").slice(1).join(","), 100);
  const parts = name.split(/\s+/);
  return parts.slice(0, -1).join(" ");
}
function _builderCitationTitleFallback(source) {
  const title = source.title || "Untitled source";
  return title.length > 42 ? title.slice(0, 39).trimEnd() + "\u2026" : title;
}
function _builderCitationAuthorKey(source, style = "apa") {
  const names = source.authors.map(_builderCitationSurname).filter(Boolean);
  if (!names.length) return source.corporateAuthor || _builderCitationTitleFallback(source);
  if (names.length === 1) return names[0];
  if (names.length === 2) return names[0] + (style === "apa" ? " & " : " and ") + names[1];
  return names[0] + " et al.";
}
function _builderCitationAuthorList(source, style = "apa") {
  if (!source.authors.length) return source.corporateAuthor || "";
  const display = source.authors.map((author, index) => {
    const surname = _builderCitationSurname(author);
    const given = _builderCitationGivenName(author);
    if (style === "apa") {
      const initials = given.split(/\s+/).filter(Boolean).map((part) => part[0] ? part[0].toUpperCase() + "." : "").join(" ");
      return [surname, initials].filter(Boolean).join(", ");
    }
    if (index === 0) return [surname, given].filter(Boolean).join(", ");
    return [given, surname].filter(Boolean).join(" ");
  });
  if (style === "mla" && display.length > 2) return display[0] + ", et al.";
  if (display.length === 1) return display[0];
  if (display.length === 2) return display[0] + (style === "apa" ? ", & " : ", and ") + display[1];
  return display.slice(0, -1).join(", ") + (style === "apa" ? ", & " : ", and ") + display.at(-1);
}
function _builderFormatCitationItem(source, style = "apa", value = {}) {
  const normalizedStyle = _builderNormalizeCitationStyle(style);
  const item = _builderNormalizeCitationItem(value);
  const author = item.suppressAuthor ? "" : _builderCitationAuthorKey(source, normalizedStyle);
  const year = item.suppressYear || normalizedStyle === "mla" ? "" : source.year || "n.d.";
  const place = item.locator;
  let core = "";
  if (normalizedStyle === "mla") {
    core = [author, place].filter(Boolean).join(" ");
  } else if (normalizedStyle === "chicago") {
    core = [author, year].filter(Boolean).join(" ");
    if (place) core += (core ? ", " : "") + place;
  } else {
    core = [author, year].filter(Boolean).join(", ");
    if (place) {
      const formattedPlace = /^(p{1,2}|para|chap|sec)\.?\s/i.test(place) ? place : "p. " + place;
      core += (core ? ", " : "") + formattedPlace;
    }
  }
  if (!core) core = _builderCitationTitleFallback(source);
  if (item.prefix) core = item.prefix + (/\s$/.test(item.prefix) ? "" : " ") + core;
  if (item.suffix) core += (/^[,.;:)\]]/.test(item.suffix) ? "" : " ") + item.suffix;
  return core;
}
function _builderFormatCitationCluster(value, sources, style = "apa") {
  const items = _builderNormalizeCitationItems(value);
  const sourceMap = sources instanceof Map ? sources : new Map((Array.isArray(sources) ? sources : []).map((source) => [source.id, source]));
  if (!items.length) return "(missing citation)";
  return "(" + items.map((item) => {
    const source = sourceMap.get(item.sourceId);
    if (!source) return (item.prefix ? item.prefix + " " : "") + "missing source" + (item.suffix ? " " + item.suffix : "");
    return _builderFormatCitationItem(source, style, item);
  }).join("; ") + ")";
}
function _builderFormatInlineCitation(source, style = "apa", locator = "") {
  return "(" + _builderFormatCitationItem(source, style, { sourceId: source?.id, locator }) + ")";
}
function _builderCitationLink(source) {
  if (source.doi) return "https://doi.org/" + source.doi;
  return /^https?:\/\//i.test(source.url) ? source.url : "";
}
function _builderSentence(value) {
  const text = _builderCitationPlain(value, 1200);
  return text && !/[.!?]$/.test(text) ? text + "." : text;
}
function _builderFormatBibliographyEntry(source, style = "apa") {
  const normalizedStyle = _builderNormalizeCitationStyle(style);
  const authors = _builderCitationAuthorList(source, normalizedStyle);
  const year = source.year || "n.d.";
  const title = source.title || "Untitled source";
  const container = source.containerTitle;
  const publisher = source.publisher;
  const journalDetail = [source.volume, source.issue ? "(" + source.issue + ")" : ""].join("");
  const pageDetail = source.pages ? (normalizedStyle === "mla" ? "pp. " : "") + source.pages : "";
  const link = _builderCitationLink(source);
  let parts = [];
  if (normalizedStyle === "mla") {
    parts = [_builderSentence(authors), _builderSentence(title), container ? _builderSentence(container) : "", publisher, source.year, journalDetail, pageDetail, link];
  } else if (normalizedStyle === "chicago") {
    parts = [_builderSentence(authors), _builderSentence(year), _builderSentence(title), container ? _builderSentence(container) : "", publisher, journalDetail, pageDetail, link];
  } else {
    parts = [_builderSentence(authors), "(" + year + ").", _builderSentence(title), container ? _builderSentence(container) : "", journalDetail, pageDetail, publisher ? _builderSentence(publisher) : "", link];
  }
  return parts.filter(Boolean).join(" ").replace(/\s+([,.;:])/g, "$1").replace(/\s+/g, " ").trim();
}
function _builderCitationSortKey(source) {
  return (_builderCitationAuthorKey(source, "mla") + " " + source.year + " " + source.title).toLocaleLowerCase();
}
function _builderCitationEntries(doc) {
  if (!doc?.querySelectorAll) return { sources: [], citations: [], bibliography: null, style: "apa", brokenCount: 0, uncitedCount: 0, citedSourceCount: 0 };
  const sources = _builderCitationSources(doc);
  const sourceMap = new Map(sources.map((source) => [source.id, source]));
  const style = _builderCitationStyle(doc);
  const citations = Array.from(doc.querySelectorAll(_BUILDER_CITATION_SELECTOR)).filter((node) => !node.closest('del[data-allo-change-id],[data-allo-change-kind="structure-delete"]')).map((node, index) => {
    const items = _builderCitationItems(node);
    const resolvedItems = items.map((item) => ({ ...item, source: sourceMap.get(item.sourceId) || null }));
    const sourceId = items[0]?.sourceId || "";
    const source = resolvedItems[0]?.source || null;
    const fallbackLabel = _builderFormatCitationCluster(items, sourceMap, style);
    return {
      id: node.getAttribute("data-allo-citation-id") || "citation-" + (index + 1),
      key: "citation:" + (node.getAttribute("data-allo-citation-id") || index + 1),
      sourceId,
      source,
      sourceIds: items.map((item) => item.sourceId),
      sources: resolvedItems.map((item) => item.source).filter(Boolean),
      items,
      resolvedItems,
      locator: items[0]?.locator || "",
      label: _builderCitationPlain(node.textContent, 500) || fallbackLabel,
      broken: !items.length || resolvedItems.some((item) => !item.source),
      brokenItemCount: items.length ? resolvedItems.filter((item) => !item.source).length : 1,
      node
    };
  });
  const citedIds = new Set(citations.flatMap((entry) => entry.resolvedItems.filter((item) => item.source).map((item) => item.sourceId)));
  const bibliography = doc.querySelector(_BUILDER_BIBLIOGRAPHY_SELECTOR);
  return {
    sources,
    citations,
    bibliography,
    style,
    brokenCount: citations.filter((entry) => entry.broken).length,
    uncitedCount: sources.filter((source) => !citedIds.has(source.id)).length,
    citedSourceCount: citedIds.size
  };
}
function _builderRefreshCitationFields(doc) {
  if (!doc?.body) return _builderCitationEntries(doc);
  const initial = _builderCitationEntries(doc);
  const sourceMap = new Map(initial.sources.map((source) => [source.id, source]));
  initial.citations.forEach((entry, index) => {
    const node = entry.node;
    const items = _builderWriteCitationItems(node, entry.items);
    const id = node.getAttribute("data-allo-citation-id") || _builderUniqueReferenceId(doc, "citation", (items[0]?.sourceId || "missing") + "-" + (index + 1));
    node.setAttribute("data-allo-citation-id", id);
    node.setAttribute("contenteditable", "false");
    node.setAttribute("role", "doc-biblioref");
    node.setAttribute("tabindex", "0");
    node.setAttribute("aria-keyshortcuts", "Enter");
    node.setAttribute("aria-haspopup", "dialog");
    node.replaceChildren(doc.createTextNode("("));
    const titles = [];
    let broken = !items.length;
    items.forEach((item, itemIndex) => {
      if (itemIndex) node.appendChild(doc.createTextNode("; "));
      const itemSource = sourceMap.get(item.sourceId) || null;
      if (!itemSource) {
        broken = true;
        const missing = doc.createElement("span");
        missing.setAttribute("data-allo-citation-missing", item.sourceId || "unknown");
        missing.textContent = (item.prefix ? item.prefix + " " : "") + "missing source" + (item.suffix ? " " + item.suffix : "");
        node.appendChild(missing);
        return;
      }
      titles.push(itemSource.title || _builderCitationAuthorKey(itemSource, initial.style));
      const link = doc.createElement("a");
      link.setAttribute("data-allo-citation-link", item.sourceId);
      link.setAttribute("href", "#bibliography-source-" + itemSource.id);
      link.setAttribute("tabindex", "-1");
      link.setAttribute("aria-label", "Go to bibliography entry for " + (itemSource.title || _builderCitationAuthorKey(itemSource, initial.style)));
      link.setAttribute("title", "Go to bibliography entry");
      link.textContent = _builderFormatCitationItem(itemSource, initial.style, item);
      node.appendChild(link);
    });
    node.appendChild(doc.createTextNode(")"));
    if (broken) {
      node.setAttribute("data-allo-reference-broken", "1");
      node.setAttribute("aria-invalid", "true");
      node.setAttribute("aria-label", "Broken citation: one or more sources are missing. Press Enter to edit.");
      node.setAttribute("title", "Broken citation. Click or press Enter to edit.");
    } else {
      node.removeAttribute("data-allo-reference-broken");
      node.removeAttribute("aria-invalid");
      node.setAttribute("aria-label", "Citation to " + titles.join("; ") + ". Press Enter to edit.");
      node.setAttribute("title", "Click or press Enter to edit citation");
    }
  });
  const bibliography = doc.querySelector(_BUILDER_BIBLIOGRAPHY_SELECTOR);
  if (bibliography) {
    const citedOnly = bibliography.getAttribute("data-allo-bibliography-scope") !== "all";
    const citedIds = new Set(_builderCitationEntries(doc).citations.flatMap((entry) => entry.resolvedItems.filter((item) => item.source).map((item) => item.sourceId)));
    const selected = initial.sources.filter((source) => !citedOnly || citedIds.has(source.id)).sort((a, b) => _builderCitationSortKey(a).localeCompare(_builderCitationSortKey(b)));
    bibliography.setAttribute("data-allo-bibliography-style", initial.style);
    bibliography.setAttribute("role", "doc-bibliography");
    let heading = bibliography.querySelector("[data-allo-bibliography-title]");
    if (!heading) {
      heading = doc.createElement("h2");
      heading.setAttribute("data-allo-bibliography-title", "1");
      heading.setAttribute("contenteditable", "false");
      bibliography.prepend(heading);
    }
    heading.textContent = _BUILDER_CITATION_STYLES.find((entry) => entry.id === initial.style)?.bibliographyTitle || "References";
    let list = bibliography.querySelector("[data-allo-bibliography-list]");
    if (!list) {
      list = doc.createElement("div");
      list.setAttribute("data-allo-bibliography-list", "1");
      bibliography.appendChild(list);
    }
    list.replaceChildren();
    selected.forEach((itemSource) => {
      const paragraph = doc.createElement("p");
      paragraph.id = "bibliography-source-" + itemSource.id;
      paragraph.setAttribute("data-allo-bibliography-source", itemSource.id);
      paragraph.setAttribute("contenteditable", "false");
      paragraph.setAttribute("style", "margin:.35em 0;padding-left:.5in;text-indent:-.5in;");
      const formatted = _builderFormatBibliographyEntry(itemSource, initial.style);
      const sourceLink = _builderCitationLink(itemSource);
      if (sourceLink && formatted.endsWith(sourceLink)) {
        paragraph.appendChild(doc.createTextNode(formatted.slice(0, -sourceLink.length)));
        const anchor = doc.createElement("a");
        anchor.href = sourceLink;
        anchor.textContent = sourceLink;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        paragraph.appendChild(anchor);
      } else paragraph.textContent = formatted;
      list.appendChild(paragraph);
    });
    if (!selected.length) {
      const empty = doc.createElement("p");
      empty.setAttribute("data-allo-bibliography-empty", "1");
      empty.setAttribute("contenteditable", "false");
      empty.textContent = citedOnly ? "No cited sources yet." : "No sources yet.";
      list.appendChild(empty);
    }
  }
  const referenceSelector = [_BUILDER_CITATION_SELECTOR, _BUILDER_BIBLIOGRAPHY_SELECTOR].join(",");
  if (doc.body.getAttribute("data-allo-tracked-view") !== "original") {
    Array.from(doc.querySelectorAll('[data-allo-change-kind="structure-insert"][data-allo-change-id],[data-allo-change-kind="reference-update"][data-allo-change-id]')).forEach((marker) => {
      if (!marker.matches?.(referenceSelector) && !marker.querySelector?.(referenceSelector)) return;
      const afterSnapshot = _builderCaptureElementRevision(marker, { attributeMode: "all", includeContent: true });
      if (afterSnapshot) marker.setAttribute("data-allo-change-after", JSON.stringify(afterSnapshot));
    });
  }
  return _builderCitationEntries(doc);
}
function _builderTrackCitationStoreMutation(doc, store, beforeSnapshot, label, summary) {
  if (!store || doc?.body?.getAttribute("data-allo-track-changes") !== "1") return null;
  const result = _builderRecordElementRevision(store, beforeSnapshot, "structure", label, {
    kind: "reference-update",
    action: "update",
    attributeMode: "all",
    includeContent: true
  });
  if (result.ok && summary) result.marker.setAttribute("data-allo-change-summary", _builderCitationPlain(summary, 220));
  return result.ok ? result.marker : null;
}
function _builderCitationSourceFingerprint(value) {
  const source = _builderNormalizeCitationSource(value);
  const compact = (text) => String(text || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (source.doi) return "doi:" + source.doi.toLowerCase();
  if (source.url) return "url:" + source.url.toLowerCase().replace(/[?#].*$/, "").replace(/\/+$/, "");
  return "meta:" + compact(_builderCitationAuthorKey(source, "mla")) + "|" + compact(source.year) + "|" + compact(source.title);
}
function _builderImportCitationSources(doc, value, style = _builderCitationStyle(doc)) {
  if (!doc?.body) return { ok: false, error: "The editable document is not ready." };
  const incoming = _builderNormalizeCitationSources(value);
  if (!incoming.length) return { ok: false, error: "No usable source records were found." };
  const store = _builderCitationStore(doc, true);
  const existing = _builderCitationSources(doc);
  const known = new Map(existing.map((source) => [_builderCitationSourceFingerprint(source), source]));
  const ids = new Set(existing.map((source) => source.id));
  const added = [];
  const duplicates = [];
  let capacitySkipped = 0;
  incoming.forEach((candidate, index) => {
    const fingerprint = _builderCitationSourceFingerprint(candidate);
    if (fingerprint && known.has(fingerprint)) {
      duplicates.push({ source: candidate, existing: known.get(fingerprint) });
      return;
    }
    if (existing.length + added.length >= 200) {
      capacitySkipped += 1;
      return;
    }
    const sourceRecord = _builderNormalizeCitationSource(candidate, existing.length + index);
    const baseId = _builderCitationSourceId(sourceRecord.id || "source-" + (existing.length + added.length + 1));
    let id = baseId;
    let suffix = 2;
    while (ids.has(id)) {
      id = baseId + "-" + suffix;
      suffix += 1;
    }
    sourceRecord.id = id;
    ids.add(id);
    known.set(fingerprint, sourceRecord);
    added.push(sourceRecord);
  });
  if (!added.length) {
    return {
      ok: true,
      added,
      duplicates,
      duplicateCount: duplicates.length,
      capacitySkipped,
      tracked: false,
      citations: _builderRefreshCitationFields(doc),
      references: _builderRefreshDocumentReferences(doc)
    };
  }
  const beforeSnapshot = _builderCaptureElementRevision(store, { attributeMode: "all", includeContent: true });
  const written = _builderWriteCitationSources(doc, [...existing, ...added], style);
  const addedIds = new Set(added.map((sourceRecord) => sourceRecord.id));
  const saved = written.filter((sourceRecord) => addedIds.has(sourceRecord.id));
  const marker = _builderTrackCitationStoreMutation(
    doc,
    store,
    beforeSnapshot,
    "Imported " + saved.length + " source" + (saved.length === 1 ? "" : "s"),
    saved.map((sourceRecord) => sourceRecord.title || _builderCitationAuthorKey(sourceRecord)).slice(0, 3).join("; ")
  );
  doc.body.setAttribute("data-allo-user-edited", "1");
  const citations = _builderRefreshCitationFields(doc);
  return {
    ok: true,
    added: saved,
    duplicates,
    duplicateCount: duplicates.length,
    capacitySkipped,
    marker,
    tracked: Boolean(marker),
    citations,
    references: _builderRefreshDocumentReferences(doc)
  };
}
function _builderUpsertCitationSource(doc, source, style = _builderCitationStyle(doc)) {
  if (!doc?.body) return { ok: false, error: "The editable document is not ready." };
  const normalized = _builderNormalizeCitationSource(source);
  if (!normalized.title && !normalized.authors.length && !normalized.corporateAuthor) return { ok: false, error: "Add a title or author for the source." };
  const store = _builderCitationStore(doc, true);
  const beforeSnapshot = _builderCaptureElementRevision(store, { attributeMode: "all", includeContent: true });
  const sources = _builderCitationSources(doc);
  const index = source?.id ? sources.findIndex((entry) => entry.id === normalized.id) : -1;
  const existing = index >= 0;
  if (existing) sources[index] = normalized;
  else {
    normalized.id = _builderCitationSourceId(source?.id);
    while (sources.some((entry) => entry.id === normalized.id)) normalized.id = _builderCitationSourceId("");
    sources.push(normalized);
  }
  const written = _builderWriteCitationSources(doc, sources, style);
  const saved = written.find((entry) => entry.id === normalized.id) || normalized;
  const marker = _builderTrackCitationStoreMutation(doc, store, beforeSnapshot, (existing ? "Updated source: " : "Added source: ") + (saved.title || _builderCitationAuthorKey(saved)), (saved.title || "Untitled source") + " \u2014 " + (_builderCitationAuthorKey(saved) || "Unknown author") + (saved.year ? " (" + saved.year + ")" : ""));
  doc.body.setAttribute("data-allo-user-edited", "1");
  const citations = _builderRefreshCitationFields(doc);
  return { ok: true, source: saved, marker, citations, references: _builderRefreshDocumentReferences(doc), tracked: Boolean(marker) };
}
function _builderSetCitationStyle(doc, style) {
  if (!doc?.body) return { ok: false, error: "The editable document is not ready." };
  const normalized = _builderNormalizeCitationStyle(style);
  const store = _builderCitationStore(doc, true);
  const beforeSnapshot = _builderCaptureElementRevision(store, { attributeMode: "all", includeContent: true });
  _builderWriteCitationSources(doc, _builderCitationSources(doc), normalized);
  const styleLabel = _BUILDER_CITATION_STYLES.find((entry) => entry.id === normalized)?.label || normalized.toUpperCase();
  const marker = _builderTrackCitationStoreMutation(doc, store, beforeSnapshot, "Changed citation style to " + styleLabel, styleLabel + " citation and bibliography fields");
  doc.body.setAttribute("data-allo-user-edited", "1");
  return { ok: true, style: normalized, marker, citations: _builderRefreshCitationFields(doc), references: _builderRefreshDocumentReferences(doc), tracked: Boolean(marker) };
}
function _builderInsertCitation(doc, sourceIdOrItems, locator = "", savedRange) {
  if (!doc?.body) return { ok: false, error: "The editable document is not ready." };
  const items = _builderNormalizeCitationItems(Array.isArray(sourceIdOrItems) ? sourceIdOrItems : [{ sourceId: sourceIdOrItems, locator }]);
  if (!items.length) return { ok: false, error: "Choose an available source first." };
  const sourceMap = new Map(_builderCitationSources(doc).map((sourceRecord2) => [sourceRecord2.id, sourceRecord2]));
  const missing = items.filter((item) => !sourceMap.has(item.sourceId));
  if (missing.length) return { ok: false, error: "One or more citation sources are no longer available." };
  const range = _builderReferenceRange(doc, savedRange);
  if (!range) return { ok: false, error: "Place the caret in the main document first." };
  range.collapse(false);
  const field = doc.createElement("span");
  field.setAttribute("data-allo-citation", "1");
  field.setAttribute("data-allo-citation-id", _builderUniqueReferenceId(doc, "citation", items[0].sourceId + "-" + Date.now().toString(36)));
  _builderWriteCitationItems(field, items);
  field.setAttribute("contenteditable", "false");
  field.textContent = _builderFormatCitationCluster(items, sourceMap, _builderCitationStyle(doc));
  range.insertNode(field);
  const sources = items.map((item) => sourceMap.get(item.sourceId));
  const sourceRecord = sources[0];
  const tracking = doc.body.getAttribute("data-allo-track-changes") === "1";
  const marker = tracking ? _builderRecordInsertedStructure(field, "Inserted citation: " + sources.map((entry) => entry.title || _builderCitationAuthorKey(entry)).join("; ")) || field : field;
  _builderSetSelectionAfter(doc, field);
  doc.body.setAttribute("data-allo-user-edited", "1");
  const citations = _builderRefreshCitationFields(doc);
  return { ok: true, id: field.getAttribute("data-allo-citation-id"), source: sourceRecord, sources, items, marker, node: field, tracked: tracking, citations, references: _builderRefreshDocumentReferences(doc) };
}
function _builderUpdateCitation(doc, citationId, value) {
  const entry = _builderCitationEntries(doc).citations.find((item) => item.id === citationId);
  const node = entry?.node;
  if (!doc?.body || !node) return { ok: false, error: "That citation is no longer available." };
  if (node.matches(_BUILDER_CHANGE_SELECTOR) || node.querySelector?.(_BUILDER_CHANGE_SELECTOR)) return { ok: false, error: "Accept or reject the pending change on this citation first." };
  const items = _builderNormalizeCitationItems(value);
  if (!items.length) return { ok: false, error: "Keep at least one source in the citation." };
  const sourceMap = new Map(_builderCitationSources(doc).map((sourceRecord) => [sourceRecord.id, sourceRecord]));
  if (items.some((item) => !sourceMap.has(item.sourceId))) return { ok: false, error: "Replace missing sources before saving this citation." };
  const beforeSnapshot = _builderCaptureElementRevision(node, { attributeMode: "all", includeContent: true });
  _builderWriteCitationItems(node, items);
  _builderRefreshCitationFields(doc);
  const sources = items.map((item) => sourceMap.get(item.sourceId));
  let marker = null;
  if (doc.body.getAttribute("data-allo-track-changes") === "1") {
    const revision = _builderRecordElementRevision(node, beforeSnapshot, "structure", "Edited citation: " + sources.map((sourceRecord) => sourceRecord.title || _builderCitationAuthorKey(sourceRecord)).join("; "), {
      kind: "reference-update",
      action: "update",
      attributeMode: "all",
      includeContent: true
    });
    marker = revision.ok ? revision.marker : null;
    if (marker) marker.setAttribute("data-allo-change-summary", _builderFormatCitationCluster(items, sourceMap, _builderCitationStyle(doc)));
  }
  doc.body.setAttribute("data-allo-user-edited", "1");
  const citations = _builderRefreshCitationFields(doc);
  const updated = citations.citations.find((item) => item.id === citationId);
  return { ok: true, id: citationId, source: sources[0], sources, items, marker, node, entry: updated, tracked: Boolean(marker), citations, references: _builderRefreshDocumentReferences(doc) };
}
function _builderInsertOrRefreshBibliography(doc, options = {}) {
  if (!doc?.body) return { ok: false, error: "The editable document is not ready." };
  let section = doc.querySelector(_BUILDER_BIBLIOGRAPHY_SELECTOR);
  const existing = Boolean(section);
  if (!section) {
    section = doc.createElement("section");
    section.setAttribute("data-allo-bibliography", "1");
    section.setAttribute("data-allo-bibliography-scope", options.includeUncited ? "all" : "cited");
    section.setAttribute("style", "margin-top:2em;");
    doc.body.appendChild(section);
  } else if (Object.prototype.hasOwnProperty.call(options, "includeUncited")) section.setAttribute("data-allo-bibliography-scope", options.includeUncited ? "all" : "cited");
  const tracking = doc.body.getAttribute("data-allo-track-changes") === "1";
  const marker = !existing && tracking ? _builderRecordInsertedStructure(section, "Inserted bibliography") || section : null;
  doc.body.setAttribute("data-allo-user-edited", "1");
  const citations = _builderRefreshCitationFields(doc);
  return { ok: true, existing, marker, node: section, tracked: Boolean(marker), citations, references: _builderRefreshDocumentReferences(doc) };
}
function _builderRemoveCitation(doc, citationId) {
  const entry = _builderCitationEntries(doc).citations.find((item) => item.id === citationId);
  const node = entry?.node;
  if (!doc?.body || !node) return { ok: false, error: "That citation is no longer available." };
  if (node.matches(_BUILDER_CHANGE_SELECTOR) || node.querySelector?.(_BUILDER_CHANGE_SELECTOR)) return { ok: false, error: "Accept or reject the pending change on this citation first." };
  const tracking = doc.body.getAttribute("data-allo-track-changes") === "1";
  const marker = tracking ? _builderRecordDeletedStructure(node, "Removed citation") : null;
  if (!tracking) node.remove();
  doc.body.setAttribute("data-allo-user-edited", "1");
  const citations = _builderRefreshCitationFields(doc);
  return { ok: true, id: citationId, marker, tracked: tracking, citations, references: _builderRefreshDocumentReferences(doc) };
}
function _builderRemoveCitationSource(doc, sourceId) {
  if (!doc?.body || !sourceId) return { ok: false, error: "That source is no longer available." };
  const entries = _builderCitationEntries(doc);
  const source = entries.sources.find((entry) => entry.id === sourceId);
  if (!source) return { ok: false, error: "That source is no longer available." };
  if (entries.citations.some((entry) => entry.items.some((item) => item.sourceId === sourceId))) return { ok: false, error: "Remove citations to this source before deleting it." };
  const store = _builderCitationStore(doc, true);
  const beforeSnapshot = _builderCaptureElementRevision(store, { attributeMode: "all", includeContent: true });
  _builderWriteCitationSources(doc, entries.sources.filter((entry) => entry.id !== sourceId), entries.style);
  const marker = _builderTrackCitationStoreMutation(doc, store, beforeSnapshot, "Removed source: " + (source.title || _builderCitationAuthorKey(source)), source.title || _builderCitationAuthorKey(source));
  doc.body.setAttribute("data-allo-user-edited", "1");
  const citations = _builderRefreshCitationFields(doc);
  return { ok: true, source, marker, citations, references: _builderRefreshDocumentReferences(doc), tracked: Boolean(marker) };
}
function _builderDocumentReferenceEntries(doc) {
  if (!doc?.querySelectorAll) return { bookmarks: [], crossReferences: [], footnotes: [], brokenCount: 0 };
  const bookmarks = Array.from(doc.querySelectorAll(_BUILDER_BOOKMARK_SELECTOR)).filter((node) => !node.closest('del[data-allo-change-id],[data-allo-change-kind="structure-delete"]')).map((node, index) => {
    const name = _builderNormalizeBookmarkName(node.getAttribute("data-allo-bookmark-name") || node.id.replace(/^bookmark-/, "") || "Bookmark " + (index + 1));
    const text = String(node.textContent || "").replace(/[\u200B\uFEFF]/g, "").replace(/\s+/g, " ").trim();
    return { id: node.id, key: "bookmark:" + node.id, name, text: text || name, node };
  });
  const bookmarkMap = new Map(bookmarks.map((entry) => [entry.id, entry]));
  const crossReferences = Array.from(doc.querySelectorAll(_BUILDER_CROSS_REFERENCE_SELECTOR)).filter((node) => !node.closest('del[data-allo-change-id],[data-allo-change-kind="structure-delete"]')).map((node, index) => {
    const targetId = String(node.getAttribute("data-allo-reference-target") || node.getAttribute("href") || "").replace(/^#/, "");
    const target = bookmarkMap.get(targetId) || null;
    return {
      id: node.getAttribute("data-allo-cross-reference-id") || "cross-reference-" + (index + 1),
      key: "cross-reference:" + (node.getAttribute("data-allo-cross-reference-id") || index + 1),
      targetId,
      targetName: target?.name || targetId || "Missing target",
      label: String(node.textContent || "").replace(/\s+/g, " ").trim() || target?.text || target?.name || "Cross-reference",
      broken: !target,
      node
    };
  });
  const noteMap = new Map(Array.from(doc.querySelectorAll(_BUILDER_FOOTNOTE_SELECTOR)).filter((node) => !node.closest('del[data-allo-change-id],[data-allo-change-kind="structure-delete"]')).map((node) => [node.getAttribute("data-allo-footnote") || "", node]));
  const references = Array.from(doc.querySelectorAll(_BUILDER_FOOTNOTE_REFERENCE_SELECTOR)).filter((node) => !node.closest('del[data-allo-change-id],[data-allo-change-kind="structure-delete"]'));
  const seenNotes = /* @__PURE__ */ new Set();
  const footnotes = references.map((reference, index) => {
    const id = reference.getAttribute("data-allo-footnote-ref") || "";
    const note = noteMap.get(id) || null;
    if (note) seenNotes.add(id);
    const textNode = note?.querySelector?.("[data-allo-footnote-text]");
    return {
      id,
      key: "footnote:" + (id || index + 1),
      number: index + 1,
      text: String(textNode?.textContent || note?.textContent || "").replace(/[↩↵]\s*$/, "").replace(/\s+/g, " ").trim() || "Empty footnote",
      broken: !id || !note,
      reference,
      note,
      node: note || reference
    };
  });
  noteMap.forEach((note, id) => {
    if (id && !seenNotes.has(id)) {
      const textNode = note.querySelector?.("[data-allo-footnote-text]");
      footnotes.push({ id, key: "footnote:" + id, number: null, text: String(textNode?.textContent || note.textContent || "").replace(/[↩↵]\s*$/, "").replace(/\s+/g, " ").trim() || "Orphaned footnote", broken: true, reference: null, note, node: note });
    }
  });
  const brokenCount = crossReferences.filter((entry) => entry.broken).length + footnotes.filter((entry) => entry.broken).length;
  return { bookmarks, crossReferences, footnotes, brokenCount };
}
function _builderRefreshDocumentReferences(doc) {
  if (!doc?.body) return { bookmarks: [], crossReferences: [], footnotes: [], brokenCount: 0 };
  const initial = _builderDocumentReferenceEntries(doc);
  const bookmarkMap = new Map(initial.bookmarks.map((entry) => [entry.id, entry]));
  initial.bookmarks.forEach((entry) => {
    entry.node.setAttribute("data-allo-bookmark-name", entry.name);
    entry.node.setAttribute("title", "Bookmark: " + entry.name);
  });
  initial.crossReferences.forEach((entry, index) => {
    const node = entry.node;
    const id = node.getAttribute("data-allo-cross-reference-id") || _builderUniqueReferenceId(doc, "cross-reference", String(index + 1) + "-" + Date.now().toString(36));
    const target = bookmarkMap.get(entry.targetId) || null;
    node.setAttribute("data-allo-cross-reference-id", id);
    node.setAttribute("data-allo-reference-target", entry.targetId);
    node.setAttribute("href", "#" + entry.targetId);
    if (target) {
      const mode = node.getAttribute("data-allo-reference-label") === "name" ? "name" : "text";
      node.textContent = mode === "name" ? target.name : target.text;
      node.removeAttribute("data-allo-reference-broken");
      node.removeAttribute("aria-invalid");
      node.setAttribute("aria-label", "Cross-reference to " + target.name);
      node.setAttribute("title", "Go to " + target.name);
    } else {
      node.setAttribute("data-allo-reference-broken", "1");
      node.setAttribute("aria-invalid", "true");
      node.setAttribute("aria-label", "Broken cross-reference to " + (entry.targetId || "missing bookmark"));
      node.setAttribute("title", "Broken cross-reference");
    }
  });
  const notes = new Map(Array.from(doc.querySelectorAll(_BUILDER_FOOTNOTE_SELECTOR)).map((note) => [note.getAttribute("data-allo-footnote") || "", note]));
  const refs = Array.from(doc.querySelectorAll(_BUILDER_FOOTNOTE_REFERENCE_SELECTOR));
  const usedNotes = /* @__PURE__ */ new Set();
  refs.forEach((reference, index) => {
    const number = index + 1;
    const id = reference.getAttribute("data-allo-footnote-ref") || "note-" + Date.now().toString(36) + "-" + number;
    const note = notes.get(id) || null;
    reference.setAttribute("data-allo-footnote-ref", id);
    reference.id = "footnote-ref-" + id;
    reference.setAttribute("data-allo-footnote-number", String(number));
    reference.setAttribute("contenteditable", "false");
    const link = reference.querySelector("a") || reference.appendChild(doc.createElement("a"));
    link.setAttribute("href", "#footnote-" + id);
    link.setAttribute("role", "doc-noteref");
    link.setAttribute("aria-label", "Footnote " + number);
    link.textContent = String(number);
    if (note) {
      usedNotes.add(id);
      reference.removeAttribute("data-allo-reference-broken");
      note.id = "footnote-" + id;
      note.setAttribute("data-allo-footnote", id);
      note.setAttribute("data-allo-footnote-number", String(number));
      note.setAttribute("role", "doc-footnote");
      note.removeAttribute("data-allo-reference-broken");
      note.value = number;
      let backlink = note.querySelector("[data-allo-footnote-backlink]");
      if (!backlink) {
        backlink = doc.createElement("a");
        backlink.setAttribute("data-allo-footnote-backlink", "1");
        note.append(doc.createTextNode(" "), backlink);
      }
      backlink.setAttribute("href", "#footnote-ref-" + id);
      backlink.setAttribute("contenteditable", "false");
      backlink.setAttribute("aria-label", "Return to footnote " + number + " reference");
      backlink.setAttribute("title", "Return to reference");
      backlink.textContent = "\u21A9";
    } else reference.setAttribute("data-allo-reference-broken", "1");
  });
  notes.forEach((note, id) => {
    if (!usedNotes.has(id)) note.setAttribute("data-allo-reference-broken", "1");
  });
  const section = doc.querySelector(_BUILDER_FOOTNOTES_SELECTOR);
  if (section && !section.querySelector(_BUILDER_FOOTNOTE_SELECTOR) && !section.matches(_BUILDER_ADVANCED_CHANGE_SELECTOR) && !section.querySelector(_BUILDER_CHANGE_SELECTOR)) section.remove();
  const referenceSelector = [_BUILDER_BOOKMARK_SELECTOR, _BUILDER_CROSS_REFERENCE_SELECTOR, _BUILDER_FOOTNOTE_REFERENCE_SELECTOR, _BUILDER_FOOTNOTE_SELECTOR, _BUILDER_FOOTNOTES_SELECTOR].join(",");
  if (doc.body.getAttribute("data-allo-tracked-view") !== "original") {
    Array.from(doc.querySelectorAll('[data-allo-change-kind="structure-insert"][data-allo-change-id],[data-allo-change-kind="reference-insert"][data-allo-change-id]')).forEach((marker) => {
      if (!marker.matches?.(referenceSelector) && !marker.querySelector?.(referenceSelector)) return;
      const afterSnapshot = _builderCaptureElementRevision(marker, { attributeMode: "all", includeContent: true });
      if (afterSnapshot) marker.setAttribute("data-allo-change-after", JSON.stringify(afterSnapshot));
    });
  }
  const references = _builderDocumentReferenceEntries(doc);
  const citations = _builderRefreshCitationFields(doc);
  return {
    ...references,
    sources: citations.sources,
    citations: citations.citations,
    bibliography: citations.bibliography,
    citationStyle: citations.style,
    citationBrokenCount: citations.brokenCount,
    uncitedSourceCount: citations.uncitedCount,
    documentBrokenCount: references.brokenCount,
    brokenCount: references.brokenCount + citations.brokenCount
  };
}
function _builderLinkTrackedReferenceMarkers(markers) {
  const live = (Array.isArray(markers) ? markers : []).filter(Boolean);
  if (!live.length) return null;
  const groupId = "reference-group-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
  live.forEach((marker, index) => {
    marker.setAttribute("data-allo-change-group", groupId);
    if (index) marker.setAttribute("data-allo-change-group-secondary", "1");
  });
  return live[0];
}
function _builderInsertBookmark(doc, name, savedRange) {
  const normalizedName = _builderNormalizeBookmarkName(name);
  if (!doc?.body || !normalizedName) return { ok: false, error: "Enter a bookmark name." };
  const existing = _builderDocumentReferenceEntries(doc).bookmarks.find((entry) => entry.name.toLowerCase() === normalizedName.toLowerCase());
  if (existing) return { ok: false, error: "A bookmark with that name already exists." };
  const range = _builderReferenceRange(doc, savedRange);
  if (!range) return { ok: false, error: "Place the caret or select text in the main document first." };
  if (!range.collapsed && !_builderTrackedRangeBlock(range)) return { ok: false, error: "A bookmark selection must stay within one paragraph or table cell." };
  const marker = doc.createElement("span");
  marker.id = _builderUniqueReferenceId(doc, "bookmark", normalizedName);
  marker.setAttribute("data-allo-bookmark", "1");
  marker.setAttribute("data-allo-bookmark-name", normalizedName);
  marker.setAttribute("title", "Bookmark: " + normalizedName);
  const preservesContent = !range.collapsed;
  if (preservesContent) marker.appendChild(range.extractContents());
  else {
    marker.setAttribute("data-allo-bookmark-empty", "1");
    marker.setAttribute("contenteditable", "false");
    marker.setAttribute("aria-label", "Bookmark " + normalizedName);
    marker.setAttribute("style", "display:inline-block;position:relative;width:0;height:1em;overflow:visible;vertical-align:baseline;");
  }
  range.insertNode(marker);
  let trackedMarker = marker;
  const tracking = doc.body.getAttribute("data-allo-track-changes") === "1";
  if (tracking && preservesContent) {
    const beforeSnapshot = { tag: "span", attributeMode: "all", attributes: {}, html: marker.innerHTML };
    const recorded = _builderRecordElementRevision(marker, beforeSnapshot, "structure", "Inserted bookmark: " + normalizedName, { kind: "reference-insert", action: "insert", attributeMode: "all", includeContent: true });
    trackedMarker = recorded.ok ? recorded.marker : marker;
  } else if (tracking) trackedMarker = _builderRecordInsertedStructure(marker, "Inserted bookmark: " + normalizedName) || marker;
  _builderSetSelectionAfter(doc, marker);
  doc.body.setAttribute("data-allo-user-edited", "1");
  const references = _builderRefreshDocumentReferences(doc);
  return { ok: true, id: marker.id, name: normalizedName, marker: trackedMarker, node: marker, tracked: tracking, references };
}
function _builderInsertCrossReference(doc, bookmarkId, labelMode = "text", savedRange) {
  if (!doc?.body) return { ok: false, error: "The editable document is not ready." };
  const target = _builderDocumentReferenceEntries(doc).bookmarks.find((entry) => entry.id === bookmarkId);
  if (!target) return { ok: false, error: "Choose an available bookmark first." };
  const range = _builderReferenceRange(doc, savedRange);
  if (!range) return { ok: false, error: "Place the caret in the main document first." };
  range.collapse(false);
  const link = doc.createElement("a");
  link.setAttribute("data-allo-cross-reference", "1");
  link.setAttribute("data-allo-cross-reference-id", _builderUniqueReferenceId(doc, "cross-reference", target.name + "-" + Date.now().toString(36)));
  link.setAttribute("data-allo-reference-target", target.id);
  link.setAttribute("data-allo-reference-label", labelMode === "name" ? "name" : "text");
  link.setAttribute("href", "#" + target.id);
  link.setAttribute("contenteditable", "false");
  link.textContent = labelMode === "name" ? target.name : target.text;
  range.insertNode(link);
  const tracking = doc.body.getAttribute("data-allo-track-changes") === "1";
  const marker = tracking ? _builderRecordInsertedStructure(link, "Inserted cross-reference to " + target.name) || link : link;
  _builderSetSelectionAfter(doc, link);
  doc.body.setAttribute("data-allo-user-edited", "1");
  const references = _builderRefreshDocumentReferences(doc);
  return { ok: true, id: link.getAttribute("data-allo-cross-reference-id"), targetId: target.id, marker, node: link, tracked: tracking, references };
}
function _builderEnsureFootnotesSection(doc) {
  let section = doc.querySelector(_BUILDER_FOOTNOTES_SELECTOR);
  let created = false;
  if (!section) {
    created = true;
    section = doc.createElement("section");
    section.setAttribute("data-allo-footnotes", "1");
    section.setAttribute("role", "doc-endnotes");
    section.setAttribute("aria-label", "Footnotes");
    section.setAttribute("style", "margin-top:2em;padding-top:.75em;border-top:1px solid #cbd5e1;");
    const title = doc.createElement("p");
    title.setAttribute("data-allo-footnotes-title", "1");
    title.setAttribute("contenteditable", "false");
    title.setAttribute("style", "margin:0 0 .5em;font-weight:700;");
    title.textContent = "Footnotes";
    const list2 = doc.createElement("ol");
    list2.setAttribute("style", "margin:.25em 0 0;padding-left:1.5em;");
    section.append(title, list2);
    doc.body.appendChild(section);
  }
  let list = section.querySelector("ol");
  if (!list) {
    list = doc.createElement("ol");
    section.appendChild(list);
  }
  return { section, list, created };
}
function _builderInsertFootnote(doc, text, savedRange) {
  const noteText = String(text || "").replace(/\s+/g, " ").trim().slice(0, 2e3);
  if (!doc?.body || !noteText) return { ok: false, error: "Write the footnote text first." };
  const range = _builderReferenceRange(doc, savedRange);
  if (!range) return { ok: false, error: "Place the caret in the main document first." };
  range.collapse(false);
  const id = "note-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
  const reference = doc.createElement("sup");
  reference.setAttribute("data-allo-footnote-ref", id);
  reference.setAttribute("contenteditable", "false");
  const link = doc.createElement("a");
  link.setAttribute("href", "#footnote-" + id);
  link.setAttribute("role", "doc-noteref");
  reference.appendChild(link);
  range.insertNode(reference);
  const destination = _builderEnsureFootnotesSection(doc);
  const note = doc.createElement("li");
  note.setAttribute("data-allo-footnote", id);
  note.setAttribute("role", "doc-footnote");
  const body = doc.createElement("span");
  body.setAttribute("data-allo-footnote-text", "1");
  body.textContent = noteText;
  const backlink = doc.createElement("a");
  backlink.setAttribute("data-allo-footnote-backlink", "1");
  backlink.setAttribute("contenteditable", "false");
  backlink.setAttribute("href", "#footnote-ref-" + id);
  backlink.textContent = "\u21A9";
  note.append(body, doc.createTextNode(" "), backlink);
  destination.list.appendChild(note);
  const tracking = doc.body.getAttribute("data-allo-track-changes") === "1";
  let marker = reference;
  if (tracking) {
    const primary = _builderRecordInsertedStructure(reference, "Inserted footnote") || reference;
    const secondaryTarget = destination.created ? destination.section : note;
    const secondary = _builderRecordInsertedStructure(secondaryTarget, "Inserted footnote") || secondaryTarget;
    marker = _builderLinkTrackedReferenceMarkers([primary, secondary]) || primary;
  }
  _builderSetSelectionAfter(doc, reference);
  doc.body.setAttribute("data-allo-user-edited", "1");
  const references = _builderRefreshDocumentReferences(doc);
  const entry = references.footnotes.find((item) => item.id === id);
  return { ok: true, id, number: entry?.number || references.footnotes.length, marker, reference, note, tracked: tracking, references };
}
function _builderRemoveBookmark(doc, bookmarkId) {
  const marker = doc?.getElementById?.(bookmarkId);
  if (!doc?.body || !marker?.matches?.(_BUILDER_BOOKMARK_SELECTOR)) return { ok: false, error: "That bookmark is no longer available." };
  if (marker.matches(_BUILDER_CHANGE_SELECTOR) || marker.querySelector?.(_BUILDER_CHANGE_SELECTOR)) return { ok: false, error: "Accept or reject the pending change on this bookmark first." };
  const name = _builderNormalizeBookmarkName(marker.getAttribute("data-allo-bookmark-name")) || "bookmark";
  const tracking = doc.body.getAttribute("data-allo-track-changes") === "1";
  let changeMarker = null;
  if (tracking) {
    const before = _builderCaptureElementRevision(marker, { attributeMode: "all", includeContent: true });
    marker.removeAttribute("id");
    marker.removeAttribute("data-allo-bookmark");
    marker.removeAttribute("data-allo-bookmark-name");
    marker.removeAttribute("data-allo-bookmark-empty");
    marker.removeAttribute("contenteditable");
    marker.removeAttribute("aria-label");
    marker.removeAttribute("title");
    marker.removeAttribute("style");
    const recorded = _builderRecordElementRevision(marker, before, "structure", "Removed bookmark: " + name, { kind: "reference-remove", action: "delete", attributeMode: "all", includeContent: true });
    changeMarker = recorded.ok ? recorded.marker : null;
  } else if (marker.childNodes.length) _builderUnwrapTrackedContainer(marker);
  else marker.remove();
  doc.body.setAttribute("data-allo-user-edited", "1");
  const references = _builderRefreshDocumentReferences(doc);
  return { ok: true, id: bookmarkId, name, marker: changeMarker, tracked: tracking, references };
}
function _builderRemoveCrossReference(doc, crossReferenceId) {
  const entry = _builderDocumentReferenceEntries(doc).crossReferences.find((item) => item.id === crossReferenceId);
  const node = entry?.node;
  if (!doc?.body || !node) return { ok: false, error: "That cross-reference is no longer available." };
  if (node.matches(_BUILDER_CHANGE_SELECTOR) || node.querySelector?.(_BUILDER_CHANGE_SELECTOR)) return { ok: false, error: "Accept or reject the pending change on this cross-reference first." };
  const tracking = doc.body.getAttribute("data-allo-track-changes") === "1";
  const marker = tracking ? _builderRecordDeletedStructure(node, "Removed cross-reference") : null;
  if (!tracking) node.remove();
  doc.body.setAttribute("data-allo-user-edited", "1");
  const references = _builderRefreshDocumentReferences(doc);
  return { ok: true, id: crossReferenceId, marker, tracked: tracking, references };
}
function _builderRemoveFootnote(doc, footnoteId) {
  if (!doc?.body || !footnoteId) return { ok: false, error: "That footnote is no longer available." };
  const entry = _builderDocumentReferenceEntries(doc).footnotes.find((item) => item.id === footnoteId);
  if (!entry) return { ok: false, error: "That footnote is no longer available." };
  const candidates = [entry.reference, entry.note].filter(Boolean);
  if (candidates.some((node) => node.matches?.(_BUILDER_CHANGE_SELECTOR) || node.querySelector?.(_BUILDER_CHANGE_SELECTOR))) return { ok: false, error: "Accept or reject pending changes in this footnote first." };
  const section = entry.note?.closest?.(_BUILDER_FOOTNOTES_SELECTOR);
  const useSection = section && section.querySelectorAll(_BUILDER_FOOTNOTE_SELECTOR).length === 1;
  const secondaryTarget = useSection ? section : entry.note;
  const tracking = doc.body.getAttribute("data-allo-track-changes") === "1";
  let marker = null;
  if (tracking) {
    const primary = entry.reference ? _builderRecordDeletedStructure(entry.reference, "Removed footnote") : null;
    const secondary = secondaryTarget ? _builderRecordDeletedStructure(secondaryTarget, "Removed footnote") : null;
    marker = _builderLinkTrackedReferenceMarkers([primary, secondary]);
  } else {
    entry.reference?.remove();
    entry.note?.remove();
    if (useSection) section.remove();
  }
  doc.body.setAttribute("data-allo-user-edited", "1");
  const references = _builderRefreshDocumentReferences(doc);
  return { ok: true, id: footnoteId, marker, tracked: tracking, references };
}
const _BUILDER_TOC_SELECTOR = "nav[data-allo-toc]";
const _BUILDER_HEADING_SELECTOR = "h1,h2,h3,h4,h5,h6";
function _builderHeadingLevel(node) {
  return Number(String(node?.tagName || "").substring(1)) || 1;
}
function _builderHeadingNodes(doc) {
  if (!doc?.querySelectorAll) return [];
  return Array.from(doc.querySelectorAll(_BUILDER_HEADING_SELECTOR)).filter((heading) => !heading.closest(_BUILDER_TOC_SELECTOR + "," + _BUILDER_FOOTNOTES_SELECTOR + "," + _BUILDER_BIBLIOGRAPHY_SELECTOR + ",del[data-allo-change-id],[data-allo-page-element]"));
}
function _builderHeadingOutline(doc) {
  const nodes = _builderHeadingNodes(doc);
  const records = nodes.map((heading, index) => ({
    index,
    level: _builderHeadingLevel(heading),
    text: (heading.textContent || "").replace(/\s+/g, " ").trim() || `Untitled heading ${index + 1}`,
    node: heading,
    parentIndex: -1,
    previousIndex: null,
    nextIndex: null,
    movable: heading.getAttribute("data-allo-style") !== "title"
  }));
  const stack = [];
  records.forEach((record) => {
    while (stack.length && stack[stack.length - 1].level >= record.level) stack.pop();
    record.parentIndex = stack.length ? stack[stack.length - 1].index : -1;
    stack.push(record);
  });
  records.forEach((record) => {
    if (!record.movable) return;
    const siblings = records.filter((candidate) => candidate.movable && candidate.level === record.level && candidate.parentIndex === record.parentIndex && candidate.node.parentNode === record.node.parentNode);
    const position = siblings.findIndex((candidate) => candidate.index === record.index);
    record.previousIndex = position > 0 ? siblings[position - 1].index : null;
    record.nextIndex = position >= 0 && position < siblings.length - 1 ? siblings[position + 1].index : null;
  });
  return records;
}
function _builderEnsureHeadingAnchor(doc, heading, index = 0) {
  if (!doc || !heading) return "";
  const existing = String(heading.id || "").trim();
  if (existing && (!doc.getElementById(existing) || doc.getElementById(existing) === heading)) return existing;
  const text = String(heading.textContent || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const base = text.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 56) || "heading-" + (index + 1);
  let candidate = base;
  let suffix = 2;
  while (doc.getElementById(candidate) && doc.getElementById(candidate) !== heading) {
    candidate = base + "-" + suffix;
    suffix += 1;
  }
  heading.id = candidate;
  return candidate;
}
function _builderTableOfContentsEntries(doc, maxLevel = 3) {
  const depth = Math.max(1, Math.min(6, Number(maxLevel) || 3));
  return _builderHeadingNodes(doc).map((heading, index) => ({ heading, index, level: _builderHeadingLevel(heading), text: String(heading.textContent || "").replace(/\s+/g, " ").trim() || `Untitled heading ${index + 1}` })).filter((entry) => entry.level <= depth).map((entry) => ({ id: _builderEnsureHeadingAnchor(doc, entry.heading, entry.index), level: entry.level, text: entry.text, node: entry.heading }));
}
function _builderRefreshTableOfContents(doc, target) {
  const nav = target || doc?.querySelector?.(_BUILDER_TOC_SELECTOR);
  if (!doc || !nav) return { ok: false, count: 0, updated: false };
  const maxLevel = Math.max(1, Math.min(6, Number(nav.getAttribute("data-allo-toc-depth")) || 3));
  const entries = _builderTableOfContentsEntries(doc, maxLevel);
  const title = String(nav.getAttribute("data-allo-toc-title") || "Table of contents").replace(/\s+/g, " ").trim().slice(0, 80) || "Table of contents";
  const shell = doc.createElement("div");
  const titleNode = doc.createElement("p");
  titleNode.setAttribute("style", "margin:0 0 .5em;font-weight:700;");
  titleNode.textContent = title;
  shell.appendChild(titleNode);
  if (entries.length) {
    const list = doc.createElement("ol");
    list.setAttribute("style", "margin:.25em 0 0;padding-left:1.5em;");
    const minimumLevel = Math.min(...entries.map((entry) => entry.level));
    entries.forEach((entry) => {
      const item = doc.createElement("li");
      item.setAttribute("style", "margin:.2em 0 0 " + Math.max(0, entry.level - minimumLevel) * 1.1 + "em;");
      const link = doc.createElement("a");
      link.href = "#" + entry.id;
      link.textContent = entry.text;
      item.appendChild(link);
      list.appendChild(item);
    });
    shell.appendChild(list);
  } else {
    const empty = doc.createElement("p");
    empty.setAttribute("style", "margin:.25em 0;color:#64748b;font-style:italic;");
    empty.textContent = "Add headings to populate this table of contents.";
    shell.appendChild(empty);
  }
  const nextHtml = shell.innerHTML;
  const updated = nav.innerHTML !== nextHtml;
  if (updated) nav.innerHTML = nextHtml;
  nav.setAttribute("data-allo-toc", "1");
  nav.setAttribute("data-allo-toc-depth", String(maxLevel));
  nav.setAttribute("data-allo-toc-title", title);
  nav.setAttribute("data-allo-toc-count", String(entries.length));
  nav.setAttribute("aria-label", title);
  nav.setAttribute("contenteditable", "false");
  if (!nav.getAttribute("style")) nav.setAttribute("style", "margin:1em 0;padding:1em;border:1px solid #cbd5e1;border-radius:.5em;background:#f8fafc;");
  const trackedInsert = nav.closest?.('[data-allo-change-kind="structure-insert"][data-allo-change-id]');
  if (trackedInsert && doc.body?.getAttribute("data-allo-tracked-view") !== "original") {
    const afterSnapshot = _builderCaptureElementRevision(trackedInsert, { attributeMode: "all", includeContent: true });
    if (afterSnapshot) trackedInsert.setAttribute("data-allo-change-after", JSON.stringify(afterSnapshot));
  }
  return { ok: true, count: entries.length, updated, nav, entries };
}
function _builderInsertTableOfContents(doc, options = {}) {
  if (!doc?.body) return { ok: false, error: "The editable document is not ready." };
  const existing = doc.querySelector(_BUILDER_TOC_SELECTOR);
  if (existing) {
    if (options.maxLevel != null) existing.setAttribute("data-allo-toc-depth", String(Math.max(1, Math.min(6, Number(options.maxLevel) || 3))));
    if (options.title != null) existing.setAttribute("data-allo-toc-title", String(options.title || "Table of contents").slice(0, 80));
    return { ..._builderRefreshTableOfContents(doc, existing), existing: true };
  }
  const nav = doc.createElement("nav");
  nav.id = doc.getElementById("table-of-contents") ? "table-of-contents-" + Date.now().toString(36) : "table-of-contents";
  nav.setAttribute("data-allo-toc", "1");
  nav.setAttribute("data-allo-toc-depth", String(Math.max(1, Math.min(6, Number(options.maxLevel) || 3))));
  nav.setAttribute("data-allo-toc-title", String(options.title || "Table of contents").slice(0, 80));
  _builderRefreshTableOfContents(doc, nav);
  const spacer = doc.createElement("p");
  spacer.appendChild(doc.createElement("br"));
  let anchor = null;
  try {
    let selected = doc.getSelection?.()?.anchorNode;
    if (selected?.nodeType === 3) selected = selected.parentElement;
    if (selected && doc.body.contains(selected) && !selected.closest(_BUILDER_TOC_SELECTOR)) {
      anchor = selected;
      while (anchor.parentElement && anchor.parentElement !== doc.body) anchor = anchor.parentElement;
    }
  } catch (_) {
  }
  if (!anchor) {
    const titleHeading = _builderHeadingNodes(doc).find((heading) => heading.getAttribute("data-allo-style") === "title") || doc.body.querySelector(":scope > h1");
    anchor = titleHeading || null;
  }
  const tracking = doc.body.getAttribute("data-allo-track-changes") === "1";
  let marker = nav;
  if (tracking) {
    const container = doc.createElement("div");
    container.setAttribute("style", "display:contents;");
    container.setAttribute("data-allo-unwrap-on-accept", "1");
    container.append(nav, spacer);
    if (anchor?.parentNode === doc.body) anchor.after(container);
    else doc.body.prepend(container);
    marker = _builderRecordInsertedStructure(container, "Inserted automatic table of contents") || container;
  } else if (anchor?.parentNode === doc.body) anchor.after(nav, spacer);
  else doc.body.prepend(nav, spacer);
  doc.body.setAttribute("data-allo-user-edited", "1");
  return { ok: true, existing: false, count: Number(nav.getAttribute("data-allo-toc-count")) || 0, nav, marker, entries: _builderTableOfContentsEntries(doc, options.maxLevel) };
}
function _builderHeadingSectionNodes(record) {
  const heading = record?.node;
  const parent = heading?.parentNode;
  if (!parent) return [];
  const children = Array.from(parent.childNodes);
  const start = children.indexOf(heading);
  if (start < 0) return [];
  let end = children.length;
  for (let index = start + 1; index < children.length; index += 1) {
    const candidate = children[index];
    if (candidate.nodeType === 1 && candidate.matches?.(_BUILDER_HEADING_SELECTOR) && _builderHeadingLevel(candidate) <= record.level) {
      end = index;
      break;
    }
  }
  return children.slice(start, end);
}
function _builderMoveHeadingSection(doc, headingIndex, targetIndex) {
  if (!doc?.body) return { ok: false, error: "The editable document is not ready." };
  const outline = _builderHeadingOutline(doc);
  const current = outline[Number(headingIndex)];
  const target = outline[Number(targetIndex)];
  if (!current || !target || !current.movable || !target.movable) return { ok: false, error: "That outline section cannot be moved." };
  if (current.level !== target.level || current.parentIndex !== target.parentIndex || current.node.parentNode !== target.node.parentNode) return { ok: false, error: "Sections can only be reordered within the same heading level." };
  const parent = current.node.parentNode;
  const currentNodes = _builderHeadingSectionNodes(current);
  const targetNodes = _builderHeadingSectionNodes(target);
  if (!currentNodes.length || !targetNodes.length) return { ok: false, error: "That outline section cannot be moved." };
  const childNodes = Array.from(parent.childNodes);
  const currentStart = childNodes.indexOf(currentNodes[0]);
  const targetStart = childNodes.indexOf(targetNodes[0]);
  const movingDown = currentStart < targetStart;
  const affectedStart = Math.min(currentStart, targetStart);
  const affectedEnd = Math.max(currentStart + currentNodes.length, targetStart + targetNodes.length);
  const affectedNodes = childNodes.slice(affectedStart, affectedEnd);
  const tracking = doc.body.getAttribute("data-allo-track-changes") === "1";
  if (tracking && affectedNodes.some((node) => node.nodeType === 1 && (node.matches?.(_BUILDER_CHANGE_SELECTOR) || node.querySelector?.(_BUILDER_CHANGE_SELECTOR)))) {
    return { ok: false, error: "Accept or reject pending changes in these sections before reordering them." };
  }
  const beforeContainer = doc.createElement("div");
  affectedNodes.forEach((node) => beforeContainer.appendChild(node.cloneNode(true)));
  const beforeHtml = beforeContainer.innerHTML;
  const fragment = doc.createDocumentFragment();
  currentNodes.forEach((node) => fragment.appendChild(node));
  if (movingDown) parent.insertBefore(fragment, targetNodes[targetNodes.length - 1].nextSibling);
  else parent.insertBefore(fragment, targetNodes[0]);
  let marker = current.node;
  if (tracking) {
    const afterChildren = Array.from(parent.childNodes);
    const positions = affectedNodes.map((node) => afterChildren.indexOf(node)).filter((index) => index >= 0);
    const first = Math.min(...positions);
    const last = Math.max(...positions);
    const wrapper = doc.createElement("div");
    wrapper.setAttribute("style", "display:contents;");
    parent.insertBefore(wrapper, afterChildren[first]);
    afterChildren.slice(first, last + 1).forEach((node) => wrapper.appendChild(node));
    const beforeSnapshot = { tag: "div", attributeMode: "presentation", attributes: { style: "display:contents;" }, html: beforeHtml };
    const recorded = _builderRecordElementRevision(wrapper, beforeSnapshot, "structure", "Moved section: " + current.text, {
      kind: "structure-replace",
      action: "reorder",
      attributeMode: "presentation",
      includeContent: true
    });
    if (!recorded.ok) {
      _builderUnwrapTrackedContainer(wrapper);
      return { ok: false, error: "That section order is already current." };
    }
    marker = recorded.marker;
  }
  doc.body.setAttribute("data-allo-user-edited", "1");
  _builderRefreshTableOfContents(doc);
  return { ok: true, tracked: tracking, marker, moved: current.text, before: movingDown ? target.text : current.text, after: movingDown ? current.text : target.text };
}
function _builderSanitizeTemplateHtml(doc, html) {
  if (!doc?.createElement) return "";
  const template = doc.createElement("template");
  template.innerHTML = String(html || "").slice(0, 25e4);
  template.content.querySelectorAll("script,style,iframe,object,embed,link,meta,base,form").forEach((node) => node.remove());
  template.content.querySelectorAll("*").forEach((node) => {
    Array.from(node.attributes || []).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value || "";
      if (/^on/.test(name) || name === "srcdoc" || /^data-allo-(change|comment)-/.test(name)) node.removeAttribute(attribute.name);
      else if ((name === "href" || name === "src") && /^\s*(javascript|vbscript):/i.test(value)) node.removeAttribute(attribute.name);
    });
    node.removeAttribute("contenteditable");
  });
  return template.innerHTML;
}
function _builderApplyDocumentTemplate(doc, templateDefinition) {
  if (!doc?.body || !templateDefinition) return { ok: false, error: "The editable document is not ready." };
  const html = _builderSanitizeTemplateHtml(doc, templateDefinition.html);
  if (!html.replace(/<[^>]*>/g, "").trim()) return { ok: false, error: "That template has no usable content." };
  const tracking = doc.body.getAttribute("data-allo-track-changes") === "1";
  if (tracking && doc.body.querySelector(_BUILDER_CHANGE_SELECTOR)) return { ok: false, error: "Accept or reject pending changes before applying a full document template." };
  const beforeHtml = doc.body.innerHTML;
  let marker = null;
  if (tracking) {
    const wrapper = doc.createElement("div");
    wrapper.setAttribute("style", "display:contents;");
    wrapper.innerHTML = html;
    doc.body.replaceChildren(wrapper);
    const beforeSnapshot = { tag: "div", attributeMode: "presentation", attributes: { style: "display:contents;" }, html: beforeHtml };
    const recorded = _builderRecordElementRevision(wrapper, beforeSnapshot, "structure", "Applied template: " + String(templateDefinition.label || "Document template"), {
      kind: "structure-replace",
      action: "template",
      attributeMode: "presentation",
      includeContent: true
    });
    if (!recorded.ok) {
      _builderUnwrapTrackedContainer(wrapper);
      return { ok: false, error: "This document already matches that template." };
    }
    marker = recorded.marker;
  } else {
    doc.body.innerHTML = html;
  }
  doc.body.setAttribute("data-allo-user-edited", "1");
  _builderRefreshTableOfContents(doc);
  return { ok: true, tracked: tracking, marker };
}
const _BUILDER_COMPARABLE_BLOCK_SELECTOR = "h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,pre,address,dt,dd,td,th";
function _builderPrepareComparableDocument(source, ownerDocument) {
  try {
    const Parser = ownerDocument?.defaultView?.DOMParser || (typeof DOMParser !== "undefined" ? DOMParser : null);
    if (!Parser) return null;
    const html = typeof source === "string" ? source : source?.documentElement?.outerHTML ? "<!DOCTYPE html>" + source.documentElement.outerHTML : source?.outerHTML || "";
    if (!html) return null;
    const doc = new Parser().parseFromString(html, "text/html");
    _builderFinalizeDocumentForExport(doc);
    doc.querySelectorAll(".allo-block-controls,.allo-block-remove,.a11y-inspect-badge,[data-allo-crop-ui],script,style").forEach((node) => node.remove());
    return doc;
  } catch (_) {
    return null;
  }
}
function _builderComparableBlockElements(doc) {
  return Array.from(doc?.body?.querySelectorAll?.(_BUILDER_COMPARABLE_BLOCK_SELECTOR) || []).filter((block) => !block.querySelector(_BUILDER_COMPARABLE_BLOCK_SELECTOR)).filter((block) => !block.closest(".allo-block-controls,.allo-block-remove,[data-allo-crop-ui],[data-allo-toc]")).filter((block) => String(block.textContent || "").replace(/\s+/g, " ").trim());
}
function _builderComparableDocument(source, ownerDocument) {
  const doc = _builderPrepareComparableDocument(source, ownerDocument);
  if (!doc) return null;
  const entries = _builderComparableBlockElements(doc).map((block, index) => ({
    index,
    tag: String(block.tagName || "").toLowerCase(),
    text: String(block.textContent || "").replace(/\s+/g, " ").trim(),
    html: block.outerHTML
  }));
  const blocks = entries.map((entry) => entry.text);
  const text = blocks.join(" ").replace(/\s+/g, " ").trim();
  return {
    blocks,
    entries,
    headings: _builderHeadingNodes(doc).map((heading) => String(heading.textContent || "").replace(/\s+/g, " ").trim()).filter(Boolean),
    statistics: _builderTextStatistics(text)
  };
}
function _builderCompareBlockSequences(beforeBlocks, afterBlocks, limit = 400) {
  const before = (Array.isArray(beforeBlocks) ? beforeBlocks : []).slice(0, limit);
  const after = (Array.isArray(afterBlocks) ? afterBlocks : []).slice(0, limit);
  const rows = before.length;
  const columns = after.length;
  const table = Array.from({ length: rows + 1 }, () => new Uint16Array(columns + 1));
  for (let row2 = rows - 1; row2 >= 0; row2 -= 1) {
    for (let column2 = columns - 1; column2 >= 0; column2 -= 1) {
      table[row2][column2] = before[row2] === after[column2] ? table[row2 + 1][column2 + 1] + 1 : Math.max(table[row2 + 1][column2], table[row2][column2 + 1]);
    }
  }
  const operations = [];
  let row = 0;
  let column = 0;
  while (row < rows || column < columns) {
    if (row < rows && column < columns && before[row] === after[column]) {
      operations.push({ kind: "same", before: before[row], after: after[column], beforeIndex: row, afterIndex: column });
      row += 1;
      column += 1;
    } else if (column < columns && (row >= rows || table[row][column + 1] > table[row + 1][column])) {
      operations.push({ kind: "add", after: after[column], beforeIndex: row, afterIndex: column });
      column += 1;
    } else {
      operations.push({ kind: "remove", before: before[row], beforeIndex: row, afterIndex: column });
      row += 1;
    }
  }
  const excerpts = [];
  let added = 0;
  let removed = 0;
  let modified = 0;
  let unchanged = 0;
  let index = 0;
  while (index < operations.length) {
    if (operations[index].kind === "same") {
      unchanged += 1;
      index += 1;
      continue;
    }
    const deleted = [];
    const inserted = [];
    while (index < operations.length && operations[index].kind !== "same") {
      if (operations[index].kind === "remove") deleted.push(operations[index]);
      else inserted.push(operations[index]);
      index += 1;
    }
    const paired = Math.min(deleted.length, inserted.length);
    modified += paired;
    added += inserted.length - paired;
    removed += deleted.length - paired;
    for (let pair = 0; pair < paired && excerpts.length < 24; pair += 1) {
      excerpts.push({ kind: "modified", before: deleted[pair].before, after: inserted[pair].after, beforeIndex: deleted[pair].beforeIndex, afterIndex: inserted[pair].afterIndex });
    }
    for (let item = paired; item < deleted.length && excerpts.length < 24; item += 1) {
      excerpts.push({ kind: "removed", before: deleted[item].before, after: "", beforeIndex: deleted[item].beforeIndex, afterIndex: deleted[item].afterIndex });
    }
    for (let item = paired; item < inserted.length && excerpts.length < 24; item += 1) {
      excerpts.push({ kind: "added", before: "", after: inserted[item].after, beforeIndex: inserted[item].beforeIndex, afterIndex: inserted[item].afterIndex });
    }
  }
  return {
    added,
    removed,
    modified,
    unchanged,
    changed: added + removed + modified,
    excerpts,
    truncated: beforeBlocks.length > limit || afterBlocks.length > limit || added + removed + modified > excerpts.length
  };
}
function _builderCompareDocumentVersions(currentDocument, snapshotHtml) {
  const before = _builderComparableDocument(snapshotHtml, currentDocument);
  const after = _builderComparableDocument(currentDocument, currentDocument);
  if (!before || !after) return { ok: false, error: "That version could not be compared." };
  const blocks = _builderCompareBlockSequences(before.blocks, after.blocks);
  const excerpts = blocks.excerpts.map((excerpt) => ({
    ...excerpt,
    beforeTag: Number.isInteger(excerpt.beforeIndex) ? before.entries[excerpt.beforeIndex]?.tag || "" : "",
    afterTag: Number.isInteger(excerpt.afterIndex) ? after.entries[excerpt.afterIndex]?.tag || "" : ""
  }));
  return {
    ok: true,
    ...blocks,
    excerpts,
    beforeWords: before.statistics.words,
    afterWords: after.statistics.words,
    wordDelta: after.statistics.words - before.statistics.words,
    beforeHeadings: before.headings.length,
    afterHeadings: after.headings.length,
    headingDelta: after.headings.length - before.headings.length
  };
}
function _builderRestoreVersionBlock(currentDocument, snapshotHtml, excerpt) {
  if (!currentDocument?.body || !snapshotHtml || excerpt?.kind !== "modified") return { ok: false, error: "Only modified blocks can be restored individually." };
  const beforeIndex = Number(excerpt.beforeIndex);
  const afterIndex = Number(excerpt.afterIndex);
  if (!Number.isInteger(beforeIndex) || !Number.isInteger(afterIndex)) return { ok: false, error: "That comparison block is no longer available." };
  const snapshotDocument = _builderPrepareComparableDocument(snapshotHtml, currentDocument);
  const sourceBlock = _builderComparableBlockElements(snapshotDocument)[beforeIndex];
  const targetBlock = _builderComparableBlockElements(currentDocument)[afterIndex];
  if (!sourceBlock || !targetBlock || !targetBlock.parentNode) return { ok: false, error: "That comparison block is no longer available." };
  if (String(sourceBlock.tagName || "").toLowerCase() !== String(targetBlock.tagName || "").toLowerCase()) return { ok: false, error: "Restore the full version to change this block type safely." };
  if (targetBlock.matches(_BUILDER_CHANGE_SELECTOR) || targetBlock.querySelector(_BUILDER_CHANGE_SELECTOR)) return { ok: false, error: "Accept or reject the pending changes in this block before restoring it." };
  const replacement = currentDocument.importNode(sourceBlock, true);
  Array.from(replacement.querySelectorAll("[id]")).concat(replacement.hasAttribute("id") ? [replacement] : []).forEach((node) => {
    const duplicate = currentDocument.getElementById(node.id);
    if (duplicate && !targetBlock.contains(duplicate) && duplicate !== targetBlock) node.removeAttribute("id");
  });
  const tracking = currentDocument.body.getAttribute("data-allo-track-changes") === "1";
  const beforeSnapshot = tracking ? _builderCaptureElementRevision(targetBlock, { attributeMode: "all", includeContent: true }) : null;
  targetBlock.replaceWith(replacement);
  let marker = replacement;
  if (tracking) {
    const recorded = _builderRecordElementRevision(replacement, beforeSnapshot, "structure", "Restored block from version history", {
      kind: "version-block-restore",
      action: "replace",
      attributeMode: "all",
      includeContent: true
    });
    if (!recorded.ok) return { ok: false, error: "The block matched the saved version already." };
    marker = recorded.marker;
  }
  currentDocument.body.setAttribute("data-allo-user-edited", "1");
  return { ok: true, tracked: tracking, marker };
}
function _normalizeBuilderLocalDraft(candidate) {
  if (!candidate || typeof candidate !== "object" || typeof candidate.html !== "string" || candidate.html.length < 100) return null;
  const currentAt = Number(candidate.at) || Date.now();
  const rawSnapshots = Array.isArray(candidate.snapshots) ? candidate.snapshots : [];
  const snapshots = rawSnapshots.filter((item) => item && typeof item.html === "string" && item.html.length > 100).map((item, index) => ({
    id: String(item.id || `snapshot-${item.at || currentAt}-${index}`),
    at: Number(item.at) || currentAt,
    label: String(item.label || "Auto-save").slice(0, 80),
    html: item.html
  })).slice(0, 10);
  if (!snapshots.length) snapshots.push({ id: `legacy-${currentAt}`, at: currentAt, label: "Recovered draft", html: candidate.html });
  return { ...candidate, version: 2, at: currentAt, snapshots };
}
const _BUILDER_VIEW_PREFS_KEY = "alloflow-builder-view-prefs-v1";
const _BUILDER_QUICK_ACCESS_DEFAULT = ["save", "undo", "redo"];
const _BUILDER_QUICK_ACCESS_OPTIONS = [
  { id: "save", label: "Save a local version snapshot", shortLabel: "Save" },
  { id: "undo", label: "Undo", shortLabel: "Undo" },
  { id: "redo", label: "Redo", shortLabel: "Redo" },
  { id: "comments", label: "Open comments", shortLabel: "Comments" },
  { id: "trackChanges", label: "Toggle Track Changes", shortLabel: "Track" },
  { id: "wordCount", label: "Open word count", shortLabel: "Words" },
  { id: "navigation", label: "Toggle document navigation", shortLabel: "Navigate" },
  { id: "footnote", label: "Insert a footnote", shortLabel: "Footnote" },
  { id: "references", label: "Open document references", shortLabel: "References" },
  { id: "updateFields", label: "Update all document fields", shortLabel: "Fields", shortcut: "F9" },
  { id: "focus", label: "Toggle focus mode", shortLabel: "Focus" }
];
function _builderNormalizeQuickAccessItems(value) {
  if (!Array.isArray(value)) return [..._BUILDER_QUICK_ACCESS_DEFAULT];
  const allowed = new Set(_BUILDER_QUICK_ACCESS_OPTIONS.map((option) => option.id));
  return Array.from(new Set(value.map(String).filter((id) => allowed.has(id)))).slice(0, 6);
}
function _readBuilderViewPreferences() {
  const defaults = { zoom: 100, zoomMode: "custom", pageView: true, pageSize: "letter", pageOrientation: "portrait", pageMargin: "1in", navigationPane: false, navigationTab: "headings", navigationWidth: 248, ribbonTab: "home", ribbonCollapsed: false, trackedMarkupView: "all", revisionBalloons: false, reviewerName: "You", quickAccess: [..._BUILDER_QUICK_ACCESS_DEFAULT] };
  if (typeof window === "undefined") return defaults;
  try {
    const stored = JSON.parse(window.localStorage.getItem(_BUILDER_VIEW_PREFS_KEY) || "null") || {};
    return {
      zoom: _builderClampEditorZoom(stored.zoom || defaults.zoom),
      zoomMode: ["custom", "fit-width", "fit-page"].includes(stored.zoomMode) ? stored.zoomMode : defaults.zoomMode,
      pageView: typeof stored.pageView === "boolean" ? stored.pageView : defaults.pageView,
      pageSize: ["letter", "legal", "a4"].includes(stored.pageSize) ? stored.pageSize : defaults.pageSize,
      pageOrientation: ["portrait", "landscape"].includes(stored.pageOrientation) ? stored.pageOrientation : defaults.pageOrientation,
      pageMargin: ["0.5in", "1in", "1.5in"].includes(stored.pageMargin) ? stored.pageMargin : defaults.pageMargin,
      navigationPane: typeof stored.navigationPane === "boolean" ? stored.navigationPane : Boolean(stored.pageThumbnails),
      navigationTab: ["headings", "pages", "sections", "references", "comments", "changes"].includes(stored.navigationTab) ? stored.navigationTab : stored.pageThumbnails ? "pages" : defaults.navigationTab,
      navigationWidth: Math.max(180, Math.min(420, Number(stored.navigationWidth) || defaults.navigationWidth)),
      ribbonTab: ["home", "insert", "layout", "review", "view", "expert"].includes(stored.ribbonTab) ? stored.ribbonTab : defaults.ribbonTab,
      ribbonCollapsed: typeof stored.ribbonCollapsed === "boolean" ? stored.ribbonCollapsed : defaults.ribbonCollapsed,
      trackedMarkupView: ["all", "simple", "none", "original"].includes(stored.trackedMarkupView) ? stored.trackedMarkupView : defaults.trackedMarkupView,
      revisionBalloons: typeof stored.revisionBalloons === "boolean" ? stored.revisionBalloons : defaults.revisionBalloons,
      reviewerName: _builderNormalizeReviewerName(stored.reviewerName, defaults.reviewerName),
      quickAccess: _builderNormalizeQuickAccessItems(stored.quickAccess)
    };
  } catch (_) {
    return defaults;
  }
}
function _builderExportPreflight(doc, mode) {
  const issues = [];
  const add = (severity, code, message, count) => issues.push({ severity, code, message, count: count || 1 });
  if (!doc || !doc.body || !doc.documentElement) {
    add("error", "preview-missing", "The editable preview is not ready.");
    return { issues, errors: 1, warnings: 0, passed: 0 };
  }
  if (doc.body.getAttribute("data-allo-preview-error") === "1") add("error", "preview-error", "The preview contains a render error.");
  const meaningful = _builderDocumentText(doc) || Array.from(doc.body.querySelectorAll("img,svg,math,table,form,input,textarea,select")).some((node) => !node.closest("del[data-allo-change-id]"));
  if (!meaningful) add("error", "empty-document", "The document has no exportable content.");
  if (!(doc.documentElement.getAttribute("lang") || "").trim()) add("warning", "language", "Set the document language for screen readers and spell-checkers.");
  if (!(doc.title || "").trim()) add("warning", "title", "Add a descriptive document title.");
  const headings = _builderHeadingOutline(doc);
  if (!headings.length) add("warning", "headings", "Add headings so readers can navigate the document.");
  let previousLevel = 0;
  let skipped = 0;
  headings.forEach((heading) => {
    if (previousLevel && heading.level > previousLevel + 1) skipped += 1;
    previousLevel = heading.level;
  });
  if (skipped) add("warning", "heading-order", `${skipped} heading level jump${skipped === 1 ? "" : "s"} may make navigation confusing.`, skipped);
  const missingAlt = Array.from(doc.images || []).filter((img) => !img.hasAttribute("alt")).length;
  if (missingAlt) add("error", "image-alt", `${missingAlt} image${missingAlt === 1 ? " is" : "s are"} missing alternative text.`, missingAlt);
  const unlabeled = Array.from(doc.querySelectorAll("input,select,textarea")).filter((control) => {
    if (control.type === "hidden") return false;
    if (control.getAttribute("aria-label") || control.getAttribute("aria-labelledby") || control.closest("label")) return false;
    return !(control.id && Array.from(doc.querySelectorAll("label[for]")).some((label) => label.htmlFor === control.id));
  }).length;
  if (unlabeled) add("error", "form-label", `${unlabeled} form control${unlabeled === 1 ? " has" : "s have"} no accessible label.`, unlabeled);
  const tablesWithoutHeaders = Array.from(doc.querySelectorAll("table")).filter((table) => !table.querySelector("th")).length;
  const tablesWithoutCaptions = Array.from(doc.querySelectorAll("table")).filter((table) => !(table.querySelector("caption")?.textContent || "").trim() && !table.hasAttribute("aria-label") && !table.hasAttribute("aria-labelledby")).length;
  if (tablesWithoutCaptions) add("warning", "table-caption", tablesWithoutCaptions + " table" + (tablesWithoutCaptions === 1 ? " has" : "s have") + " no caption or accessible name.", tablesWithoutCaptions);
  if (tablesWithoutHeaders) add("warning", "table-headers", `${tablesWithoutHeaders} table${tablesWithoutHeaders === 1 ? " has" : "s have"} no header cells.`, tablesWithoutHeaders);
  const unsafeLinks = Array.from(doc.querySelectorAll("a[href]")).filter((a) => /^\s*(javascript|vbscript|data):/i.test(a.getAttribute("href") || "")).length;
  if (unsafeLinks) add("error", "unsafe-links", `${unsafeLinks} unsafe link${unsafeLinks === 1 ? "" : "s"} must be removed.`, unsafeLinks);
  const seenIds = /* @__PURE__ */ new Set();
  let duplicateIds = 0;
  Array.from(doc.querySelectorAll("[id]")).forEach((node) => {
    const id = node.id;
    if (seenIds.has(id)) duplicateIds += 1;
    else seenIds.add(id);
  });
  if (duplicateIds) add("error", "duplicate-ids", `${duplicateIds} duplicate element ID${duplicateIds === 1 ? "" : "s"} can break links and labels.`, duplicateIds);
  const chrome = doc.querySelectorAll(".allo-block-controls,.allo-block-remove,.a11y-inspect-badge,[data-allo-crop-ui]").length;
  if (chrome) add("warning", "editor-chrome", "Editor-only controls will be removed from the exported file.", chrome);
  const references = _builderDocumentReferenceEntries(doc);
  const citationReferences = _builderCitationEntries(doc);
  if (references.brokenCount) add("warning", "broken-references", references.brokenCount + " broken or orphaned document reference" + (references.brokenCount === 1 ? " needs" : "s need") + " attention before export.", references.brokenCount);
  if (citationReferences.brokenCount) add("warning", "broken-citations", citationReferences.brokenCount + " citation" + (citationReferences.brokenCount === 1 ? " points" : "s point") + " to a missing source.", citationReferences.brokenCount);
  if (citationReferences.citations.length && !citationReferences.bibliography) add("warning", "bibliography-missing", "Insert a bibliography so every live citation has a matching source entry.");
  if (citationReferences.bibliography && !citationReferences.citations.length) add("warning", "bibliography-empty", "The bibliography has no cited sources yet.");
  const emptyFootnotes = references.footnotes.filter((entry) => !entry.broken && (!entry.text || entry.text === "Empty footnote")).length;
  if (emptyFootnotes) add("warning", "empty-footnotes", emptyFootnotes + " footnote" + (emptyFootnotes === 1 ? " is" : "s are") + " empty.", emptyFootnotes);
  const pendingChanges = _builderTrackedChangeEntries(doc).length;
  if (pendingChanges) add("warning", "pending-changes", pendingChanges + " pending revision" + (pendingChanges === 1 ? " will" : "s will") + " export using the final accepted view.", pendingChanges);
  if (mode === "slides" && headings.length < 2) add("warning", "slide-structure", "Add section headings so the slide deck can split content into meaningful slides.");
  if (mode === "html") {
    const remoteAssetNodes = Array.from(doc.querySelectorAll('img[src],audio[src],video[src],source[src],object[data],link[rel~="stylesheet"][href],style')).filter((node) => {
      const value = node.tagName === "STYLE" ? node.textContent : node.getAttribute("src") || node.getAttribute("data") || node.getAttribute("href") || "";
      return /https?:\/\//i.test(value || "");
    }).length;
    if (remoteAssetNodes) add("warning", "html-remote-assets", `${remoteAssetNodes} external asset reference${remoteAssetNodes === 1 ? "" : "s"} may need an internet connection when the downloaded HTML is opened.`, remoteAssetNodes);
  }
  if (mode === "print" || mode === "worksheet") {
    const overflowing = Array.from(doc.body.querySelectorAll("*")).filter((node) => {
      if (node.closest("[hidden],.alloflow-reading-tools-shell,.allo-block-controls,.allo-block-remove")) return false;
      const clientWidth = Number(node.clientWidth) || 0;
      const scrollWidth = Number(node.scrollWidth) || 0;
      return clientWidth > 0 && scrollWidth > clientWidth + 4;
    }).length;
    if (overflowing) add("warning", "print-overflow", `${overflowing} element${overflowing === 1 ? "" : "s"} may extend beyond the printable page width.`, overflowing);
    const tallBlocks = Array.from(doc.querySelectorAll('.question,.card,.quiz-box,figure,table,.reflection-block,[style*="break-inside: avoid"],[style*="break-inside:avoid"]')).filter((node) => {
      if (node.closest("[hidden],.alloflow-reading-tools-shell")) return false;
      try {
        return node.getBoundingClientRect().height > 900;
      } catch (_) {
        return false;
      }
    }).length;
    if (tallBlocks) add("warning", "print-tall-blocks", `${tallBlocks} unbreakable content block${tallBlocks === 1 ? "" : "s"} may be clipped or pushed to another page.`, tallBlocks);
  }
  if (mode === "worksheet") {
    const interactiveControls = Array.from(doc.querySelectorAll('input:not([type="hidden"]),textarea,select')).filter((control) => !control.closest("[hidden],.alloflow-reading-tools-shell,.quiz-controls")).length;
    if (interactiveControls) add("warning", "worksheet-controls", `${interactiveControls} interactive control${interactiveControls === 1 ? "" : "s"} should be replaced by a printable line, blank, or choice marker.`, interactiveControls);
    const responseLessQuestions = Array.from(doc.querySelectorAll(".quiz-box .question")).filter((question) => !question.querySelector("[data-allo-print-response],.alloflow-ruled-response,.alloflow-print-bubble,.alloflow-print-box,.alloflow-print-blank")).length;
    if (responseLessQuestions) add("warning", "worksheet-response-space", `${responseLessQuestions} worksheet question${responseLessQuestions === 1 ? "" : "s"} may not provide a clear place for students to respond.`, responseLessQuestions);
  }
  if (mode === "epub") {
    const remoteImages = Array.from(doc.images || []).filter((img) => !/^data:image\//i.test(img.getAttribute("src") || "")).length;
    if (remoteImages) add("warning", "epub-images", `${remoteImages} image${remoteImages === 1 ? "" : "s"} must be fetched and packaged for offline e-readers.`, remoteImages);
    const remoteStyles = Array.from(doc.querySelectorAll('link[rel~="stylesheet"][href],style')).filter((node) => {
      const value = node.tagName === "STYLE" ? node.textContent : node.getAttribute("href");
      return /https?:/i.test(value || "");
    }).length;
    if (remoteStyles) add("warning", "epub-styles", `${remoteStyles} remote stylesheet or font reference${remoteStyles === 1 ? "" : "s"} will be removed for offline reading.`, remoteStyles);
    const remoteMedia = Array.from(doc.querySelectorAll("audio[src],video[src],source[src],object[data]")).filter((node) => /https?:/i.test(node.getAttribute("src") || node.getAttribute("data") || "")).length;
    if (remoteMedia) add("warning", "epub-media", `${remoteMedia} remote media asset${remoteMedia === 1 ? "" : "s"} may still require an internet connection.`, remoteMedia);
  }
  const errors = issues.filter((issue) => issue.severity === "error").length;
  const warnings = issues.filter((issue) => issue.severity === "warning").length;
  return { issues, errors, warnings, passed: Math.max(0, 8 - errors - warnings) };
}
function _builderH5PCompatibility(item) {
  const type = String(item?.type || "").toLowerCase();
  const plain = (value) => String(value == null ? "" : value).trim();
  if (type === "quiz") {
    const questions = Array.isArray(item?.data?.questions) ? item.data.questions : [];
    const allMcq = questions.length > 0 && questions.every((question) => !question?.type || question.type === "mcq");
    let valid = 0;
    let adapted = 0;
    let manualReview = 0;
    questions.forEach((question = {}) => {
      const kind = question.type || "mcq";
      const prompt2 = plain(question.question);
      let ready = false;
      if (kind === "mcq") {
        const options = Array.isArray(question.options) ? question.options.map(plain) : [];
        const key = Number.isInteger(question.correctIndex) ? question.correctIndex : options.indexOf(plain(question.correctAnswer));
        ready = !!prompt2 && options.length >= 2 && (!allMcq || options.length <= 4) && options.every(Boolean) && key >= 0;
      } else if (kind === "multi-select") {
        const options = Array.isArray(question.options) ? question.options.map(plain) : [];
        const keys = Array.isArray(question.correctAnswers) ? question.correctAnswers.map(plain) : [];
        ready = !!prompt2 && options.length >= 2 && keys.length > 0 && keys.every((key) => options.includes(key));
      } else if (kind === "fill-blank") {
        ready = !!prompt2 && !!plain(question.expectedFill);
      } else if (kind === "short-answer" || kind === "self-explanation") {
        ready = !!prompt2;
        if (ready) manualReview += 1;
      } else if (kind === "sequence-sense") {
        ready = !!prompt2 && Array.isArray(question.items) && question.items.length >= 3;
        if (ready) {
          adapted += 1;
          manualReview += 1;
        }
      } else if (kind === "relation-mismatch") {
        const wrong = Number(question.wrongPairIndex);
        ready = !!prompt2 && Array.isArray(question.pairs) && question.pairs.length >= 2 && Number.isInteger(wrong) && wrong >= 0 && wrong < question.pairs.length && Array.isArray(question.candidatePartners) && question.candidatePartners.length >= 2 && question.candidatePartners.includes(question.correctPartnerForWrong);
        if (ready) adapted += 1;
      } else if (kind === "answer-evidence") {
        ready = !!prompt2 && Array.isArray(question.answerOptions) && question.answerOptions.length >= 2 && question.answerOptions.includes(question.correctAnswer) && Array.isArray(question.evidenceOptions) && question.evidenceOptions.length >= 2 && question.evidenceOptions.includes(question.correctEvidence);
        if (ready) adapted += 1;
      } else if (kind === "numeric-response") {
        ready = !!prompt2 && Number.isFinite(Number(question.correctValue));
        if (ready) {
          adapted += 1;
          if (Number(question.tolerance) > 0) manualReview += 1;
        }
      }
      if (ready) valid += 1;
    });
    return {
      type,
      unit: "question",
      library: allMcq ? "Single Choice Set 1.11" : "Question Set 1.21",
      total: questions.length,
      valid,
      omitted: questions.length - valid,
      adapted,
      manualReview,
      embeddedMedia: 0,
      omittedMedia: 0,
      ready: valid > 0
    };
  }
  if (type === "glossary" || type === "flashcards") {
    const rawData = item?.data;
    const cards = Array.isArray(rawData) ? rawData : Array.isArray(rawData?.cards) ? rawData.cards : Array.isArray(rawData?.items) ? rawData.items : [];
    let valid = 0;
    let embeddedMedia = 0;
    let omittedMedia = 0;
    const isEmbeddedImage = (value) => typeof value === "string" && /^data:image\/(png|jpeg|gif);base64,[a-z0-9+/=\s]+$/i.test(value.trim());
    const isEmbeddedAudio = (value) => typeof value === "string" && /^data:audio\/(mpeg|mp4|ogg|wav|x-wav|webm);base64,[a-z0-9+/=\s]+$/i.test(value.trim());
    cards.forEach((card) => {
      const front = plain(type === "glossary" ? card?.term ?? card?.word ?? card?.phrase : card?.front ?? card?.term ?? card?.question);
      const back = plain(type === "glossary" ? card?.def ?? card?.definition ?? card?.meaning : card?.back ?? card?.definition ?? card?.answer);
      if (!front || !back) return;
      valid += 1;
      const image = card?.image ?? card?.imageUrl ?? card?.png;
      const rawAudio = card?.audio ?? card?.audioUrl ?? card?.pronunciationAudio;
      const audio = Array.isArray(rawAudio) ? rawAudio.find((value) => typeof value === "string" && value.trim()) : rawAudio;
      if (image) {
        if (isEmbeddedImage(image)) embeddedMedia += 1;
        else omittedMedia += 1;
      }
      if (audio) {
        if (isEmbeddedAudio(audio)) embeddedMedia += 1;
        else omittedMedia += 1;
      }
    });
    return {
      type,
      unit: "card",
      library: "Dialog Cards 1.9",
      total: cards.length,
      valid,
      omitted: cards.length - valid,
      embeddedMedia,
      omittedMedia,
      ready: valid > 0
    };
  }
  return { type, unit: "item", library: "", total: 0, valid: 0, omitted: 0, embeddedMedia: 0, omittedMedia: 0, ready: false };
}
function ExportPreviewView(props) {
  const {
    BUILT_IN_PRESETS,
    FONT_OPTIONS,
    STYLE_SEEDS,
    _ensureDiffLib,
    a11yInspectMode,
    addToast,
    agentActivityLog,
    agentLogFullView,
    applyExportPreset,
    auditOutputAccessibility,
    customExportCSS,
    deleteExportPreset,
    diffLibReady,
    executeExportFromPreview,
    expertCommandInput,
    exportAuditLoading,
    exportAuditResult,
    exportConfig,
    exportPresets,
    exportPreviewMode,
    exportPreviewRef,
    exportStylePrompt,
    exportTheme,
    generateCustomExportStyle,
    getExportPreviewHTML,
    getSkippedResources,
    history,
    isAgentRunning,
    isGeneratingStyle,
    handleExportH5P,
    handleExportIMS,
    handleExportQTI,
    openInAlloStudio,
    pdfFixResult,
    pptxLoaded,
    processExpertCommand,
    proposeRestyles,
    runAxeAudit,
    saveExportPreset,
    selectedFont,
    setAgentActivityLog,
    setAgentLogFullView,
    setCustomExportCSS,
    setDiffViewOpen,
    setExpertCommandInput,
    setExportAuditLoading,
    setExportAuditResult,
    setExportConfigAndRefresh,
    setExportPreviewMode,
    setExportStylePrompt,
    setExportTheme,
    setIsAgentRunning,
    setShowBrandProfileEditor,
    setShowExportPreview,
    showExportPreview,
    t,
    theme,
    toggleA11yInspect,
    updateExportPreview: updateExportPreview2,
    exportPreviewSource,
    onExportSuccess,
    builderWorkspaceMode = "author",
    setBuilderWorkspaceMode,
    onAdvancedReviewSessionChange
  } = props;
  const isAdvancedReview = builderWorkspaceMode === "advanced-review" && exportPreviewSource === "remediation";
  const [writingCheck, setWritingCheck] = React.useState(null);
  const [blockSuggestions, setBlockSuggestions] = React.useState(null);
  const [blockSuggestionsBusy, setBlockSuggestionsBusy] = React.useState(false);
  const [blockSuggestionError, setBlockSuggestionError] = React.useState("");
  const [blockSuggestionDropped, setBlockSuggestionDropped] = React.useState(0);
  const blockSuggestionRunRef = React.useRef(0);
  const blockSuggestionAbortRef = React.useRef(null);
  const blockSuggestionUndoRef = React.useRef([]);
  const [blockSuggestionUndoCount, setBlockSuggestionUndoCount] = React.useState(0);
  React.useEffect(() => () => {
    blockSuggestionRunRef.current += 1;
    try {
      blockSuggestionAbortRef.current?.abort();
    } catch (_) {
    }
  }, []);
  const [wordGoalProgress, setWordGoalProgress] = React.useState({ count: 0, goal: 0, percent: 0 });
  const [wordCount, setWordCount] = React.useState(0);
  const [wordGoal, setWordGoal] = React.useState(0);
  const [documentStatistics, setDocumentStatistics] = React.useState(() => _builderTextStatistics(""));
  const [selectionStatistics, setSelectionStatistics] = React.useState(() => ({ active: false, ..._builderTextStatistics("") }));
  const [showWordCountDetails, setShowWordCountDetails] = React.useState(false);
  const [headingOutline, setHeadingOutline] = React.useState([]);
  const [activeHeadingIndex, setActiveHeadingIndex] = React.useState(null);
  const [tocDepth, setTocDepth] = React.useState(3);
  const [draggedHeadingIndex, setDraggedHeadingIndex] = React.useState(null);
  const [documentReferences, setDocumentReferences] = React.useState(() => ({
    bookmarks: [],
    crossReferences: [],
    footnotes: [],
    sources: [],
    citations: [],
    bibliography: null,
    citationStyle: "apa",
    citationBrokenCount: 0,
    uncitedSourceCount: 0,
    documentBrokenCount: 0,
    brokenCount: 0
  }));
  const [crossReferenceTarget, setCrossReferenceTarget] = React.useState("");
  const [crossReferenceLabelMode, setCrossReferenceLabelMode] = React.useState("text");
  const [activeDocumentReferenceKey, setActiveDocumentReferenceKey] = React.useState("");
  const [citationStyle, setCitationStyle] = React.useState("apa");
  const [citationSourceTarget, setCitationSourceTarget] = React.useState("");
  const [citationLocator, setCitationLocator] = React.useState("");
  const [showSourceManager, setShowSourceManager] = React.useState(false);
  const [editingCitationSourceId, setEditingCitationSourceId] = React.useState("");
  const [citationSourceDraft, setCitationSourceDraft] = React.useState(() => _builderNormalizeCitationSource({ type: "webpage" }));
  const [citationSourceMode, setCitationSourceMode] = React.useState("manual");
  const [citationImportFormat, setCitationImportFormat] = React.useState("auto");
  const [citationImportText, setCitationImportText] = React.useState("");
  const [citationImportFeedback, setCitationImportFeedback] = React.useState(null);
  const [citationDoiBusy, setCitationDoiBusy] = React.useState(false);
  const [editingCitationId, setEditingCitationId] = React.useState("");
  const [citationItemsDraft, setCitationItemsDraft] = React.useState([]);
  const [citationEditorError, setCitationEditorError] = React.useState("");
  const [bibliographyIncludeUncited, setBibliographyIncludeUncited] = React.useState(false);
  const [customBuilderStyles, setCustomBuilderStyles] = React.useState(() => _readBuilderCustomStyles());
  const [customDocumentTemplates, setCustomDocumentTemplates] = React.useState(() => _readBuilderCustomDocumentTemplates());
  const builderStyleGallery = React.useMemo(() => [..._BUILDER_STYLE_GALLERY, ...customBuilderStyles], [customBuilderStyles]);
  const documentTemplateGallery = React.useMemo(() => [..._BUILDER_DOCUMENT_TEMPLATES, ...customDocumentTemplates], [customDocumentTemplates]);
  const [reviewComments, setReviewComments] = React.useState([]);
  const [activeCommentId, setActiveCommentId] = React.useState("");
  const [showResolvedComments, setShowResolvedComments] = React.useState(false);
  const [commentAuthorFilter, setCommentAuthorFilter] = React.useState("all");
  const [replyingCommentId, setReplyingCommentId] = React.useState("");
  const [commentReplyDraft, setCommentReplyDraft] = React.useState("");
  const [trackedChanges, setTrackedChanges] = React.useState([]);
  const [activeTrackedChangeId, setActiveTrackedChangeId] = React.useState("");
  const [trackChangesEnabled, setTrackChangesEnabled] = React.useState(false);
  const [trackedMarkupView, setTrackedMarkupView] = React.useState(() => _readBuilderViewPreferences().trackedMarkupView);
  const [showRevisionBalloons, setShowRevisionBalloons] = React.useState(() => _readBuilderViewPreferences().revisionBalloons);
  const [reviewerName, setReviewerName] = React.useState(() => _readBuilderViewPreferences().reviewerName);
  const [trackedChangeTypeFilter, setTrackedChangeTypeFilter] = React.useState("all");
  const [trackedChangeAuthorFilter, setTrackedChangeAuthorFilter] = React.useState("all");
  const [trackedChangeDateFilter, setTrackedChangeDateFilter] = React.useState("all");
  const [selectedTrackedChangeIds, setSelectedTrackedChangeIds] = React.useState([]);
  const [findMatchState, setFindMatchState] = React.useState({ count: 0, current: 0 });
  const [draftRecovery, setDraftRecovery] = React.useState(null);
  const [versionHistory, setVersionHistory] = React.useState([]);
  const [versionComparison, setVersionComparison] = React.useState(null);
  const [preflightResult, setPreflightResult] = React.useState(null);
  const [isFocusMode, setIsFocusMode] = React.useState(false);
  const [editorZoom, setEditorZoom] = React.useState(() => _readBuilderViewPreferences().zoom);
  const [editorZoomMode, setEditorZoomMode] = React.useState(() => _readBuilderViewPreferences().zoomMode);
  const [editorPageView, setEditorPageView] = React.useState(() => _readBuilderViewPreferences().pageView);
  const [showNavigationPane, setShowNavigationPane] = React.useState(() => _readBuilderViewPreferences().navigationPane);
  const [navigationPaneTab, setNavigationPaneTab] = React.useState(() => _readBuilderViewPreferences().navigationTab);
  const [navigationPaneWidth, setNavigationPaneWidth] = React.useState(() => _readBuilderViewPreferences().navigationWidth);
  const [activeRibbonTab, setActiveRibbonTab] = React.useState(() => _readBuilderViewPreferences().ribbonTab);
  const [ribbonCollapsed, setRibbonCollapsed] = React.useState(() => _readBuilderViewPreferences().ribbonCollapsed);
  const [quickAccessItems, setQuickAccessItems] = React.useState(() => _readBuilderViewPreferences().quickAccess);
  const [pageMetrics, setPageMetrics] = React.useState({ count: 1, active: 0, sections: [], documentSections: [{ id: "section-1", index: 0, name: "Section 1", startType: "document", page: 0 }], activeSection: 0 });
  const [sectionNameDraft, setSectionNameDraft] = React.useState("Section 1");
  const [draftCaptureState, setDraftCaptureState] = React.useState("ready");
  const [formatState, setFormatState] = React.useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    subscript: false,
    superscript: false,
    fontSize: "3",
    unorderedList: false,
    orderedList: false,
    block: "p",
    namedStyle: "normal",
    alignment: "left",
    paragraphSpacing: "normal"
  });
  const [findQuery, setFindQuery] = React.useState("");
  const [replaceQuery, setReplaceQuery] = React.useState("");
  const [findOptions, setFindOptions] = React.useState({ matchCase: false, wholeWord: false, highlightAll: true });
  const [findDocumentRevision, setFindDocumentRevision] = React.useState(0);
  const [formatPainterActive, setFormatPainterActive] = React.useState(false);
  const [tableInsertConfig, setTableInsertConfig] = React.useState({ rows: 3, columns: 3, headerRow: true, caption: "" });
  const [tableContext, setTableContext] = React.useState({ active: false, rows: 0, columns: 0, hasHeader: false, headerCell: false });
  const [pageSetup, setPageSetup] = React.useState(() => {
    const preferences = _readBuilderViewPreferences();
    return { size: ["letter", "legal", "a4"].includes(exportConfig?.pageSize) ? exportConfig.pageSize : preferences.pageSize, orientation: ["portrait", "landscape"].includes(exportConfig?.pageOrientation) ? exportConfig.pageOrientation : preferences.pageOrientation, margin: ["0.5in", "1in", "1.5in"].includes(exportConfig?.pageMargin) ? exportConfig.pageMargin : preferences.pageMargin };
  });
  const [pageElements, setPageElements] = React.useState({ headerText: "", headerAlignment: "left", footerText: "", pageNumbers: "none" });
  const [paragraphLayout, setParagraphLayout] = React.useState(() => ({ ..._BUILDER_PARAGRAPH_DEFAULTS, tabStops: [] }));
  const [rulerTabAlignment, setRulerTabAlignment] = React.useState("left");
  const [advancedReviewTab, setAdvancedReviewTab] = React.useState("structure");
  const [advancedReviewTree, setAdvancedReviewTree] = React.useState({ roots: [], flat: [], document: { language: "", title: "" } });
  const [advancedReviewSelectedId, setAdvancedReviewSelectedId] = React.useState("");
  const [advancedReviewHistory, setAdvancedReviewHistory] = React.useState([]);
  const [advancedReviewEvidenceStale, setAdvancedReviewEvidenceStale] = React.useState(false);
  const [advancedReviewTreeError, setAdvancedReviewTreeError] = React.useState("");
  const [advancedReviewAltDraft, setAdvancedReviewAltDraft] = React.useState("");
  const [advancedReviewLanguageDraft, setAdvancedReviewLanguageDraft] = React.useState("");
  const [advancedReviewCurrentHtml, setAdvancedReviewCurrentHtml] = React.useState("");
  const unresolvedReviewCommentCount = reviewComments.filter((comment) => !comment.resolved).length;
  const reviewCommentAuthors = Array.from(new Set(reviewComments.flatMap((comment) => comment.authors || comment.thread.map((message) => message.author)).filter(Boolean))).sort((left, right) => left.localeCompare(right));
  const visibleReviewComments = reviewComments.filter((comment) => (showResolvedComments || !comment.resolved) && (commentAuthorFilter === "all" || (comment.authors || []).includes(commentAuthorFilter)));
  const pendingTrackedChangeCount = trackedChanges.length;
  const activeTrackedChange = trackedChanges.find((change) => change.id === activeTrackedChangeId) || null;
  const trackedChangeAuthors = Array.from(new Set(trackedChanges.map((change) => change.author).filter(Boolean))).sort((left, right) => left.localeCompare(right));
  const trackedChangeCutoff = trackedChangeDateFilter === "today" ? Date.now() - 864e5 : trackedChangeDateFilter === "week" ? Date.now() - 6048e5 : 0;
  const visibleTrackedChanges = trackedChanges.filter((change) => {
    const typeMatch = trackedChangeTypeFilter === "all" || trackedChangeTypeFilter === "text" && (change.type === "insert" || change.type === "delete") || change.type === trackedChangeTypeFilter || change.scopes?.includes(trackedChangeTypeFilter);
    const authorMatch = trackedChangeAuthorFilter === "all" || change.author === trackedChangeAuthorFilter;
    const parsedAt = Date.parse(change.at || "");
    const dateMatch = !trackedChangeCutoff || !Number.isNaN(parsedAt) && parsedAt >= trackedChangeCutoff;
    return typeMatch && authorMatch && dateMatch;
  });
  const selectedVisibleTrackedChanges = visibleTrackedChanges.filter((change) => selectedTrackedChangeIds.includes(change.id));
  const trackedChangeSummary = trackedChanges.reduce((summary, change) => {
    const key = change.type === "insert" || change.type === "delete" ? change.type : change.type || "format";
    summary[key] = (summary[key] || 0) + 1;
    return summary;
  }, { insert: 0, delete: 0, format: 0, paragraph: 0, structure: 0 });
  const activeDocumentSection = pageMetrics.documentSections?.[pageMetrics.activeSection] || pageMetrics.documentSections?.[0] || { id: "section-1", index: 0, name: "Section 1", startType: "document", page: 0 };
  React.useEffect(() => {
    setSectionNameDraft(activeDocumentSection.name);
  }, [activeDocumentSection.id, activeDocumentSection.name]);
  const paragraphContentWidth = _builderPageContentWidth(pageSetup);
  const [altExportBusy, setAltExportBusy] = React.useState("");
  const [pendingImageFile, setPendingImageFile] = React.useState(null);
  const qtiAssessments = React.useMemo(() => (Array.isArray(history) ? history : []).map((item, index) => ({ item, key: `${item?.id || "quiz"}:${index}` })).filter(({ item }) => item?.type === "quiz" && Array.isArray(item?.data?.questions)), [history]);
  const [selectedQtiKey, setSelectedQtiKey] = React.useState("");
  React.useEffect(() => {
    if (!qtiAssessments.length) {
      if (selectedQtiKey) setSelectedQtiKey("");
      return;
    }
    if (!qtiAssessments.some((entry) => entry.key === selectedQtiKey)) {
      setSelectedQtiKey(qtiAssessments[qtiAssessments.length - 1].key);
    }
  }, [qtiAssessments, selectedQtiKey]);
  const h5pActivities = React.useMemo(() => (Array.isArray(history) ? history : []).map((item, index) => ({ item, key: `${item?.id || item?.type || "activity"}:${index}` })).filter(({ item }) => ["quiz", "glossary", "flashcards"].includes(item?.type)), [history]);
  const [selectedH5PKey, setSelectedH5PKey] = React.useState("");
  React.useEffect(() => {
    if (!h5pActivities.length) {
      if (selectedH5PKey) setSelectedH5PKey("");
      return;
    }
    if (!h5pActivities.some((entry) => entry.key === selectedH5PKey)) {
      setSelectedH5PKey(h5pActivities[h5pActivities.length - 1].key);
    }
  }, [h5pActivities, selectedH5PKey]);
  const selectedH5PActivity = React.useMemo(() => h5pActivities.find((entry) => entry.key === selectedH5PKey) || h5pActivities[h5pActivities.length - 1] || null, [h5pActivities, selectedH5PKey]);
  const h5pCompatibility = React.useMemo(() => _builderH5PCompatibility(selectedH5PActivity?.item), [selectedH5PActivity]);
  const [imageAltText, setImageAltText] = React.useState("");
  const [imageDecorative, setImageDecorative] = React.useState(false);
  const [imageAltError, setImageAltError] = React.useState("");
  const [imageInsertBusy, setImageInsertBusy] = React.useState(false);
  const [exportActionBusy, setExportActionBusy] = React.useState(false);
  const imageFileInputRef = React.useRef(null);
  const imageAddButtonRef = React.useRef(null);
  const imageOpenerRef = React.useRef(null);
  const imageAltInputRef = React.useRef(null);
  const imageInsertionRangeRef = React.useRef(null);
  const exportDialogRef = React.useRef(null);
  const imageDialogRef = React.useRef(null);
  const wordCountButtonRef = React.useRef(null);
  const wordCountPanelRef = React.useRef(null);
  const wordCountOpenerRef = React.useRef(null);
  const citationEditorRef = React.useRef(null);
  const citationEditorOpenerRef = React.useRef(null);
  const citationDoiRunRef = React.useRef(0);
  const imageInsertRunRef = React.useRef(0);
  const writingCheckRunRef = React.useRef(0);
  const auditRunRef = React.useRef(0);
  const expertRunRef = React.useRef(0);
  const exportActionLockRef = React.useRef(false);
  const mountedRef = React.useRef(true);
  const findCursorRef = React.useRef({ node: null, offset: 0 });
  const editorSelectionRangeRef = React.useRef(null);
  const formatPainterRef = React.useRef(null);
  const rulerRef = React.useRef(null);
  const rulerDragCleanupRef = React.useRef(null);
  const openerRef = React.useRef(null);
  const advancedReviewBaselineRef = React.useRef("");
  const advancedReviewSessionRef = React.useRef(null);
  const advancedReviewSessionOpenRef = React.useRef(false);
  const advancedReviewActiveRef = React.useRef(isAdvancedReview);
  const advancedReviewHistoryRef = React.useRef([]);
  const advancedReviewCommandDispatchRef = React.useRef(false);
  const advancedReviewManualTimerRef = React.useRef(null);
  const draftDocumentTitle = String(exportConfig && (exportConfig.title || exportConfig.docTitle || exportConfig.lessonTitle) || "AlloFlow Document").trim().substring(0, 120) || "AlloFlow Document";
  const draftIdentitySeed = Array.isArray(history) ? `${history.length}:${history[0]?.id || history[0]?.type || ""}:${history[history.length - 1]?.id || history[history.length - 1]?.type || ""}` : "empty";
  const draftStorageKey = React.useMemo(() => `alloflow-builder-draft-v1:${encodeURIComponent([exportPreviewSource || "generated", exportPreviewMode || "print", draftDocumentTitle, draftIdentitySeed].join("|")).substring(0, 220)}`, [exportPreviewSource, exportPreviewMode, draftDocumentTitle, draftIdentitySeed]);
  const promptForBuilderText = React.useCallback(async (message, defaultValue, options) => {
    if (!(window.AlloFlowUX && typeof window.AlloFlowUX.prompt === "function")) {
      addToast && addToast("The text-entry dialog is still loading. Please try again in a moment.", "error");
      return null;
    }
    return window.AlloFlowUX.prompt(message, defaultValue || "", options || {});
  }, [addToast]);
  React.useEffect(() => () => {
    mountedRef.current = false;
    imageInsertRunRef.current += 1;
    writingCheckRunRef.current += 1;
    auditRunRef.current += 1;
    expertRunRef.current += 1;
    citationDoiRunRef.current += 1;
    try {
      rulerDragCleanupRef.current?.();
    } catch (_) {
    }
  }, []);
  React.useEffect(() => {
    if (!showExportPreview) return void 0;
    openerRef.current = document.activeElement;
    return () => {
      const opener = openerRef.current;
      if (opener && opener.isConnected && typeof opener.focus === "function") {
        window.setTimeout(() => opener.focus(), 0);
      }
    };
  }, [showExportPreview]);
  const resetBuilderViewPreferences = React.useCallback(() => {
    setEditorZoom(100);
    setEditorZoomMode("custom");
    setEditorPageView(true);
    setShowNavigationPane(false);
    setNavigationPaneTab("headings");
    setNavigationPaneWidth(248);
    setActiveRibbonTab("home");
    setRibbonCollapsed(false);
    setQuickAccessItems([..._BUILDER_QUICK_ACCESS_DEFAULT]);
    setTrackedMarkupView("all");
    setShowRevisionBalloons(false);
    setTrackedChangeTypeFilter("all");
    setTrackedChangeAuthorFilter("all");
    setTrackedChangeDateFilter("all");
    setSelectedTrackedChangeIds([]);
    addToast && addToast("Builder view reset.", "info");
  }, [addToast]);
  const setBuilderFocusMode = React.useCallback(async (nextValue) => {
    const next = typeof nextValue === "boolean" ? nextValue : !isFocusMode;
    setIsFocusMode(next);
    if (next) {
      try {
        if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch (_) {
      }
    } else if (document.fullscreenElement && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch (_) {
      }
    }
  }, [isFocusMode]);
  const openFindTools = React.useCallback((mode = "find") => {
    setActiveRibbonTab("review");
    setRibbonCollapsed(false);
    try {
      window.setTimeout(() => {
        const tools = document.getElementById("builder-find-tools");
        if (tools) tools.open = true;
        const input = document.getElementById(mode === "replace" ? "builder-replace" : "builder-find");
        if (input) {
          input.focus();
          input.select?.();
        }
      }, 0);
    } catch (_) {
    }
  }, []);
  React.useEffect(() => {
    const root = document.documentElement;
    const active = Boolean(showExportPreview && isFocusMode);
    root.classList.toggle("allo-docbuilder-focus", active);
    if (!showExportPreview && isFocusMode) {
      setIsFocusMode(false);
      if (document.fullscreenElement && document.exitFullscreen) {
        try {
          document.exitFullscreen();
        } catch (_) {
        }
      }
    }
    return () => root.classList.remove("allo-docbuilder-focus");
  }, [showExportPreview, isFocusMode]);
  React.useEffect(() => {
    if (!showExportPreview) return void 0;
    const onFullscreenChange = () => {
      if (!document.fullscreenElement && isFocusMode) setIsFocusMode(false);
    };
    const onFocusExit = () => setBuilderFocusMode(false);
    const onOpenFind = (event) => openFindTools(event?.detail?.mode === "replace" ? "replace" : "find");
    const onShortcut = (event) => {
      const target = event.target;
      const tag = target && target.tagName ? target.tagName.toLowerCase() : "";
      if ((tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable) && !target?.closest?.("#document-builder-preview")) return;
      if ((event.ctrlKey || event.metaKey) && !event.altKey && (event.key === "s" || event.key === "S")) {
        event.preventDefault();
        document.dispatchEvent(new CustomEvent("alloflow-builder-save-snapshot"));
        return;
      }
      if ((event.ctrlKey || event.metaKey) && !event.altKey && (event.key === "f" || event.key === "F")) {
        event.preventDefault();
        openFindTools("find");
        return;
      }
      if ((event.ctrlKey || event.metaKey) && !event.altKey && (event.key === "h" || event.key === "H")) {
        event.preventDefault();
        openFindTools("replace");
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === "Enter") {
        event.preventDefault();
        setBuilderFocusMode();
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("alloflow-builder-exit-focus", onFocusExit);
    document.addEventListener("alloflow-builder-open-find", onOpenFind);
    document.addEventListener("keydown", onShortcut);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("alloflow-builder-exit-focus", onFocusExit);
      document.removeEventListener("alloflow-builder-open-find", onOpenFind);
      document.removeEventListener("keydown", onShortcut);
    };
  }, [showExportPreview, isFocusMode, setBuilderFocusMode, openFindTools]);
  const closeImageDialog = React.useCallback(() => {
    imageInsertRunRef.current += 1;
    setImageInsertBusy(false);
    setPendingImageFile(null);
    setImageAltText("");
    setImageDecorative(false);
    setImageAltError("");
    window.setTimeout(() => (imageOpenerRef.current || imageAddButtonRef.current)?.focus(), 0);
  }, []);
  React.useEffect(() => {
    if (!showExportPreview || pendingImageFile) return void 0;
    const dialog = exportDialogRef.current;
    if (!dialog) return void 0;
    const getFocusable = () => Array.from(dialog.querySelectorAll('button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]):not([tabindex="-1"]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])')).filter((el) => el.getClientRects().length > 0);
    if (!dialog.contains(document.activeElement)) (getFocusable()[0] || dialog).focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setShowExportPreview(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener("keydown", onKeyDown);
    return () => dialog.removeEventListener("keydown", onKeyDown);
  }, [showExportPreview, pendingImageFile, setShowExportPreview]);
  React.useEffect(() => {
    if (!pendingImageFile) return void 0;
    const dialog = imageDialogRef.current;
    if (!dialog) return void 0;
    const timer = window.setTimeout(() => imageAltInputRef.current?.focus(), 0);
    const getFocusable = () => Array.from(dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeImageDialog();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      dialog.removeEventListener("keydown", onKeyDown);
    };
  }, [pendingImageFile, closeImageDialog]);
  const insertPendingImage = React.useCallback(() => {
    if (!pendingImageFile || imageInsertBusy) return;
    const file = pendingImageFile;
    const decorative = imageDecorative;
    const alt = decorative ? "" : imageAltText.trim();
    if (!decorative && !alt) {
      setImageAltError("Describe the image, or mark it as decorative.");
      imageAltInputRef.current?.focus();
      return;
    }
    const runId = ++imageInsertRunRef.current;
    setImageInsertBusy(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (!mountedRef.current || runId !== imageInsertRunRef.current) return;
      const iframe = exportPreviewRef.current;
      const doc = iframe?.contentDocument;
      const dataUrl = ev?.target?.result;
      if (!doc || typeof dataUrl !== "string") {
        setImageInsertBusy(false);
        addToast && addToast("Preview not ready yet.", "error");
        return;
      }
      if (!/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(dataUrl)) {
        setImageInsertBusy(false);
        addToast && addToast("That image format is not supported. Choose PNG, JPEG, GIF, or WebP.", "error");
        return;
      }
      const img = doc.createElement("img");
      img.style.cssText = "max-width:100%;height:auto;border-radius:8px;margin:12px 0;cursor:move;";
      img.alt = alt;
      img.setAttribute("tabindex", "0");
      img.setAttribute("data-allo-crop-tabindex-added", "added");
      img.onload = () => {
        if (!mountedRef.current || runId !== imageInsertRunRef.current) return;
        const pixels = (img.naturalWidth || 0) * (img.naturalHeight || 0);
        if (!img.naturalWidth || img.naturalWidth > 1e4 || img.naturalHeight > 1e4 || pixels > 25e6) {
          img.onload = null;
          setImageInsertBusy(false);
          addToast && addToast("That image is too large to edit safely. Choose an image under 10,000 pixels per side and 25 megapixels.", "error");
          return;
        }
        img.onload = null;
        const savedRange = imageInsertionRangeRef.current;
        if (savedRange && savedRange.startContainer?.ownerDocument === doc && savedRange.startContainer?.isConnected) {
          try {
            savedRange.collapse(false);
            savedRange.insertNode(img);
          } catch (_) {
            (doc.querySelector("main") || doc.body).appendChild(img);
          }
        } else {
          (doc.querySelector("main") || doc.body).appendChild(img);
        }
        try {
          if (doc.body) doc.body.setAttribute("data-allo-user-edited", "1");
          const InputEventCtor = doc.defaultView?.Event || Event;
          doc.body?.dispatchEvent(new InputEventCtor("input", { bubbles: true }));
        } catch (_) {
        }
        imageInsertionRangeRef.current = null;
        closeImageDialog();
        addToast && addToast(decorative ? "Decorative image inserted." : "Image inserted with alternative text.", "success");
      };
      img.onerror = () => {
        if (!mountedRef.current || runId !== imageInsertRunRef.current) return;
        setImageInsertBusy(false);
        addToast && addToast("Could not decode that image.", "error");
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      if (!mountedRef.current || runId !== imageInsertRunRef.current) return;
      setImageInsertBusy(false);
      addToast && addToast("Could not read that image.", "error");
    };
    reader.readAsDataURL(file);
  }, [pendingImageFile, imageInsertBusy, imageDecorative, imageAltText, exportPreviewRef, addToast, closeImageDialog]);
  const applyPageSetup = React.useCallback((nextSetup, options = {}) => {
    const normalized = {
      size: ["letter", "legal", "a4"].includes(nextSetup?.size) ? nextSetup.size : "letter",
      orientation: ["portrait", "landscape"].includes(nextSetup?.orientation) ? nextSetup.orientation : "portrait",
      margin: ["0.5in", "1in", "1.5in"].includes(nextSetup?.margin) ? nextSetup.margin : "1in"
    };
    const dimensions = _builderPageDimensions(normalized);
    setPageSetup((previous) => previous.size === normalized.size && previous.orientation === normalized.orientation && previous.margin === normalized.margin ? previous : normalized);
    try {
      const iframe = exportPreviewRef.current;
      if (iframe) iframe.__alloBuilderPageSetup = normalized;
      const doc = iframe?.contentDocument;
      if (doc?.head) {
        let style = doc.getElementById("allo-page-setup-style") || doc.getElementById("allo-margin-style");
        if (!style) {
          style = doc.createElement("style");
          doc.head.appendChild(style);
        }
        style.id = "allo-page-setup-style";
        style.setAttribute("data-page-size", normalized.size);
        style.setAttribute("data-page-orientation", normalized.orientation);
        style.setAttribute("data-page-margin", normalized.margin);
        style.textContent = [
          "@page { size: " + dimensions.css + " " + normalized.orientation + "; margin: " + normalized.margin + "; }",
          "body { padding-left: " + normalized.margin + "; padding-right: " + normalized.margin + "; }",
          "[data-allo-page-element] { box-sizing:border-box;color:#475569;font:500 10pt/1.35 system-ui,sans-serif; }",
          '[data-allo-section-break="next-page"] { break-before:page;page-break-before:always; }',
          '[data-allo-section-break="continuous"] { break-before:auto;page-break-before:auto; }',
          "[data-allo-page-header] { margin:0 0 .65em;padding:0 0 .35em;border-bottom:1px solid #cbd5e1;text-align:var(--allo-header-align,left); }",
          "[data-allo-page-footer] { position:relative;margin:.85em 0 0;padding:.35em 0 0;min-height:1.35em;border-top:1px solid #cbd5e1; }",
          "[data-allo-page-number] { position:absolute;top:.35em;font-variant-numeric:tabular-nums; }",
          '[data-allo-page-number]::before { content:"Page "; }',
          "[data-allo-header-text],[data-allo-footer-text] { display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }",
          '[data-page-number-position="left"] [data-allo-footer-text] { padding-left:5em; }',
          '[data-page-number-position="center"] [data-allo-footer-text] { max-width:calc(50% - 3em); }',
          '[data-page-number-position="right"] [data-allo-footer-text] { padding-right:5em; }',
          '[data-page-number-position="left"] [data-allo-page-number] { left:0; }',
          '[data-page-number-position="center"] [data-allo-page-number] { left:50%;transform:translateX(-50%); }',
          '[data-page-number-position="right"] [data-allo-page-number] { right:0; }',
          '@media screen { [data-allo-page-number]::after { content:"#"; } }',
          '@media print { body { padding-top:.35in !important;padding-bottom:.35in !important;padding-left:0 !important;padding-right:0 !important; } [data-allo-page-header],[data-allo-page-footer] { position:fixed;left:0;right:0;margin:0;border-color:#94a3b8; } [data-allo-page-header] { top:0; } [data-allo-page-footer] { bottom:0; } [data-allo-page-break="1"],[data-allo-section-break] { height:0 !important;margin:0 !important;border:0 !important;background:none !important; } [data-allo-page-number]::after { content:counter(page); } }'
        ].join("\n");
      }
    } catch (_) {
    }
    if (options?.commit) {
      try {
        const doc = exportPreviewRef.current?.contentDocument;
        if (doc?.body) {
          doc.body.setAttribute("data-allo-user-edited", "1");
          const InputEventCtor = doc.defaultView?.InputEvent || doc.defaultView?.Event;
          doc.body.dispatchEvent(new InputEventCtor("input", { bubbles: true }));
        }
      } catch (_) {
      }
    }
    return normalized;
  }, [exportPreviewRef]);
  const applyPageMargin = React.useCallback((margin) => {
    applyPageSetup({ ...pageSetup, margin }, { commit: true });
  }, [applyPageSetup, pageSetup]);
  React.useEffect(() => {
    applyPageSetup(pageSetup);
  }, [applyPageSetup, pageSetup, showExportPreview]);
  const editorPageCss2 = React.useCallback((enabled) => {
    if (!enabled) return [
      "html { background: transparent !important; }",
      "body { width:auto !important;max-width:none !important;min-height:0 !important;margin:0 !important;background-image:none !important;box-shadow:none !important; }"
    ].join("\n");
    const dimensions = _builderPageDimensions(pageSetup);
    const stripeHeight = dimensions.height + 0.25;
    return [
      "html { background:#e2e8f0 !important; }",
      "body {",
      "width:" + dimensions.widthCss + " !important;",
      "max-width:calc(100% - 2rem) !important;",
      "min-height:" + dimensions.heightCss + " !important;",
      "box-sizing:border-box !important;",
      "margin:1rem auto 2rem !important;",
      "background-color:#fff !important;",
      "background-image: linear-gradient(to bottom,transparent calc(" + dimensions.heightCss + " - 1px),rgba(148,163,184,0.55) calc(" + dimensions.heightCss + " - 1px),rgba(148,163,184,0.55) " + dimensions.heightCss + ",transparent " + dimensions.heightCss + ") !important;",
      "background-size:100% " + stripeHeight + "in !important;",
      "box-shadow:0 0 0 1px rgba(100,116,139,0.3),0 12px 28px rgba(15,23,42,0.15) !important;",
      "}"
    ].join("\n");
  }, [pageSetup.size, pageSetup.orientation]);
  const applyEditorZoom = React.useCallback((zoom) => {
    const value = _builderClampEditorZoom(zoom);
    try {
      const iframe = exportPreviewRef.current;
      if (iframe) iframe.__alloBuilderZoom = value;
      const style = iframe?.contentDocument?.getElementById("allo-builder-edit-css");
      if (!style) return;
      const base = style.getAttribute("data-allo-base-css") || style.textContent.replace(/\n?\s*body\s*\{[^}]*zoom:[^}]*\}\s*$/i, "");
      const pageCss = style.getAttribute("data-allo-page-css") || editorPageCss2(iframe?.__alloBuilderPageView !== false);
      style.setAttribute("data-allo-page-css", pageCss);
      style.textContent = `${base}
${pageCss}
        body { zoom: ${value}%; }`;
    } catch (_) {
    }
  }, [exportPreviewRef, editorPageCss2]);
  const applyEditorPageView = React.useCallback((enabled) => {
    try {
      const iframe = exportPreviewRef.current;
      if (iframe) iframe.__alloBuilderPageView = Boolean(enabled);
      const style = iframe?.contentDocument?.getElementById("allo-builder-edit-css");
      if (!style) return;
      const base = style.getAttribute("data-allo-base-css") || style.textContent.replace(/\n?\s*body\s*\{[^}]*zoom:[^}]*\}\s*$/i, "");
      const pageCss = editorPageCss2(Boolean(enabled));
      const zoom = _builderClampEditorZoom(iframe?.__alloBuilderZoom);
      style.setAttribute("data-allo-page-css", pageCss);
      style.textContent = `${base}
${pageCss}
        body { zoom: ${zoom}%; }`;
    } catch (_) {
    }
  }, [exportPreviewRef, editorPageCss2]);
  const calculateEditorZoomPreset = React.useCallback((mode) => {
    const iframe = exportPreviewRef.current;
    if (!iframe) return 100;
    const dimensions = _builderPageDimensions(pageSetup);
    const availableWidth = Math.max(240, iframe.clientWidth - 48);
    const availableHeight = Math.max(240, iframe.clientHeight - 48);
    const widthScale = availableWidth / (dimensions.width * 96);
    const heightScale = availableHeight / (dimensions.height * 96 + 24);
    const rawZoom = (mode === "fit-page" ? Math.min(widthScale, heightScale) : widthScale) * 100;
    return _builderClampEditorZoom(Math.floor(rawZoom / 5) * 5);
  }, [exportPreviewRef, pageSetup.size, pageSetup.orientation]);
  const useEditorZoomPreset = React.useCallback((mode) => {
    const nextMode = mode === "fit-page" ? "fit-page" : "fit-width";
    setEditorZoomMode(nextMode);
    setEditorPageView(true);
    setEditorZoom(calculateEditorZoomPreset(nextMode));
  }, [calculateEditorZoomPreset]);
  const setCustomEditorZoom = React.useCallback((nextValue) => {
    setEditorZoomMode("custom");
    setEditorZoom((previous) => _builderClampEditorZoom(typeof nextValue === "function" ? nextValue(previous) : nextValue));
  }, []);
  React.useEffect(() => {
    applyEditorZoom(editorZoom);
  }, [applyEditorZoom, editorZoom, showExportPreview]);
  React.useEffect(() => {
    applyEditorPageView(editorPageView);
  }, [applyEditorPageView, editorPageView, showExportPreview]);
  React.useEffect(() => {
    if (!showExportPreview || editorZoomMode === "custom") return void 0;
    const updateFitZoom = () => setEditorZoom(calculateEditorZoomPreset(editorZoomMode));
    const timer = window.setTimeout(updateFitZoom, 0);
    const iframe = exportPreviewRef.current;
    const ResizeObserverCtor = window.ResizeObserver;
    const observer = ResizeObserverCtor && iframe ? new ResizeObserverCtor(updateFitZoom) : null;
    if (observer && iframe) observer.observe(iframe);
    window.addEventListener("resize", updateFitZoom);
    return () => {
      window.clearTimeout(timer);
      observer?.disconnect();
      window.removeEventListener("resize", updateFitZoom);
    };
  }, [showExportPreview, editorZoomMode, calculateEditorZoomPreset]);
  const refreshFormattingState = React.useCallback(() => {
    const doc = exportPreviewRef.current?.contentDocument;
    if (!doc) return;
    const state = (command) => {
      try {
        return Boolean(doc.queryCommandState(command));
      } catch (_) {
        return false;
      }
    };
    const value = (command) => {
      try {
        return String(doc.queryCommandValue(command) || "").toLowerCase();
      } catch (_) {
        return "";
      }
    };
    let block = value("formatBlock").replace(/[<>]/g, "") || "p";
    if (!["h1", "h2", "h3", "p", "blockquote"].includes(block)) block = "p";
    const alignment = state("justifyCenter") ? "center" : state("justifyRight") ? "right" : state("justifyFull") ? "justify" : "left";
    let paragraphSpacing = "normal";
    let nextParagraphLayout = { ..._BUILDER_PARAGRAPH_DEFAULTS, tabStops: [] };
    let namedStyle = block === "h1" ? "heading1" : block === "h2" ? "heading2" : block === "h3" ? "heading3" : block === "blockquote" ? "quote" : "normal";
    try {
      let selectedNode = doc.getSelection?.()?.anchorNode;
      if (selectedNode?.nodeType === 3) selectedNode = selectedNode.parentElement;
      const selectedBlock = selectedNode?.closest?.(_BUILDER_PARAGRAPH_BLOCK_SELECTOR);
      const explicitStyle = selectedBlock?.getAttribute?.("data-allo-style");
      if (builderStyleGallery.some((item) => item.id === explicitStyle)) namedStyle = explicitStyle;
      const inlineMargin = selectedBlock?.style?.marginBottom || "";
      const spacingPoints = _builderCssLengthPoints(inlineMargin, selectedBlock);
      paragraphSpacing = !inlineMargin ? "normal" : spacingPoints <= 6 ? "compact" : spacingPoints >= 20 ? "double" : "relaxed";
      if (selectedBlock && !selectedBlock.closest("[data-allo-page-element]")) {
        nextParagraphLayout = _normalizeBuilderParagraphLayout(_builderParagraphLayoutFromBlock(selectedBlock), paragraphContentWidth);
      }
    } catch (_) {
    }
    const next = {
      bold: state("bold"),
      italic: state("italic"),
      underline: state("underline"),
      strikeThrough: state("strikeThrough"),
      subscript: state("subscript"),
      superscript: state("superscript"),
      fontSize: /^[1-7]$/.test(value("fontSize")) ? value("fontSize") : "3",
      unorderedList: state("insertUnorderedList"),
      orderedList: state("insertOrderedList"),
      block,
      namedStyle,
      alignment,
      paragraphSpacing
    };
    setFormatState((previous) => previous.bold === next.bold && previous.italic === next.italic && previous.underline === next.underline && previous.strikeThrough === next.strikeThrough && previous.subscript === next.subscript && previous.superscript === next.superscript && previous.fontSize === next.fontSize && previous.unorderedList === next.unorderedList && previous.orderedList === next.orderedList && previous.block === next.block && previous.namedStyle === next.namedStyle && previous.alignment === next.alignment && previous.paragraphSpacing === next.paragraphSpacing ? previous : next);
    setParagraphLayout((previous) => _builderParagraphLayoutsEqual(previous, nextParagraphLayout) ? previous : nextParagraphLayout);
  }, [exportPreviewRef, paragraphContentWidth, builderStyleGallery]);
  React.useEffect(() => {
    try {
      window.localStorage.setItem(_BUILDER_VIEW_PREFS_KEY, JSON.stringify({
        version: 1,
        zoom: editorZoom,
        zoomMode: editorZoomMode,
        pageView: editorPageView,
        pageSize: pageSetup.size,
        pageOrientation: pageSetup.orientation,
        pageMargin: pageSetup.margin,
        navigationPane: showNavigationPane,
        navigationTab: navigationPaneTab,
        navigationWidth: navigationPaneWidth,
        ribbonTab: activeRibbonTab,
        ribbonCollapsed,
        quickAccess: quickAccessItems,
        trackedMarkupView,
        revisionBalloons: showRevisionBalloons,
        reviewerName
      }));
    } catch (_) {
    }
  }, [editorZoom, editorZoomMode, editorPageView, pageSetup, showNavigationPane, navigationPaneTab, navigationPaneWidth, activeRibbonTab, ribbonCollapsed, quickAccessItems, trackedMarkupView, showRevisionBalloons, reviewerName]);
  React.useEffect(() => {
    try {
      window.localStorage.setItem(_BUILDER_CUSTOM_STYLES_KEY, JSON.stringify(_builderNormalizeCustomStyles(customBuilderStyles)));
    } catch (_) {
    }
  }, [customBuilderStyles]);
  React.useEffect(() => {
    try {
      window.localStorage.setItem(_BUILDER_CUSTOM_TEMPLATES_KEY, JSON.stringify(_builderNormalizeCustomDocumentTemplates(customDocumentTemplates)));
    } catch (_) {
    }
  }, [customDocumentTemplates]);
  React.useEffect(() => {
    const goal = Number.isFinite(wordGoal) && wordGoal > 0 ? wordGoal : 0;
    setWordGoalProgress({
      count: wordCount,
      goal,
      percent: goal ? Math.min(100, Math.round(wordCount / goal * 100)) : 0
    });
  }, [wordCount, wordGoal]);
  const refreshSelectionStatistics = React.useCallback(() => {
    const doc = exportPreviewRef.current?.contentDocument;
    const next = _builderSelectionStatistics(doc, editorSelectionRangeRef.current);
    setSelectionStatistics((previous) => previous.active === next.active && previous.words === next.words && previous.charactersWithSpaces === next.charactersWithSpaces && previous.charactersWithoutSpaces === next.charactersWithoutSpaces && previous.paragraphs === next.paragraphs && previous.sentences === next.sentences ? previous : next);
    return next;
  }, [exportPreviewRef]);
  const refreshDocumentStats = React.useCallback(() => {
    const doc = exportPreviewRef.current?.contentDocument;
    _builderRefreshTableOfContents(doc);
    const references = _builderRefreshDocumentReferences(doc);
    setDocumentReferences(references);
    setCrossReferenceTarget((current) => references.bookmarks.some((entry) => entry.id === current) ? current : references.bookmarks[0]?.id || "");
    setCitationStyle(references.citationStyle || "apa");
    setCitationSourceTarget((current) => references.sources?.some((entry) => entry.id === current) ? current : references.sources?.[0]?.id || "");
    setBibliographyIncludeUncited(references.bibliography?.getAttribute?.("data-allo-bibliography-scope") === "all");
    setActiveDocumentReferenceKey((current) => {
      const keys = new Set([...references.bookmarks, ...references.crossReferences, ...references.footnotes, ...references.citations || [], ...(references.sources || []).map((source) => ({ key: "source:" + source.id }))].map((entry) => entry.key));
      return keys.has(current) ? current : "";
    });
    const statistics = _builderDocumentStatistics(doc);
    setWordCount(statistics.words);
    setDocumentStatistics(statistics);
    setHeadingOutline(_builderHeadingOutline(doc));
    setPreflightResult(null);
    const selected = _builderSelectionStatistics(doc, editorSelectionRangeRef.current);
    setSelectionStatistics((previous) => previous.active === selected.active && previous.words === selected.words && previous.charactersWithSpaces === selected.charactersWithSpaces && previous.charactersWithoutSpaces === selected.charactersWithoutSpaces && previous.paragraphs === selected.paragraphs && previous.sentences === selected.sentences ? previous : selected);
  }, [exportPreviewRef]);
  const refreshReviewComments = React.useCallback(() => {
    const comments = _builderCommentEntries(exportPreviewRef.current?.contentDocument);
    setReviewComments(comments);
    setActiveCommentId((current) => comments.some((comment) => comment.id === current) ? current : comments.find((comment) => !comment.resolved)?.id || comments[0]?.id || "");
    return comments;
  }, [exportPreviewRef]);
  const refreshTrackedChanges = React.useCallback(() => {
    const doc = exportPreviewRef.current?.contentDocument;
    const changes = _builderTrackedChangeEntries(doc);
    setTrackedChanges(changes);
    setSelectedTrackedChangeIds((selected) => selected.filter((id) => changes.some((change) => change.id === id)));
    setTrackChangesEnabled(doc?.body?.getAttribute("data-allo-track-changes") === "1");
    setActiveTrackedChangeId((current) => changes.some((change) => change.id === current) ? current : changes[0]?.id || "");
    return changes;
  }, [exportPreviewRef]);
  const _getBuilderSuggestionHtml = React.useCallback(() => {
    const doc = exportPreviewRef.current?.contentDocument;
    if (!doc?.documentElement || doc.body?.getAttribute("data-allo-preview-error") === "1") return "";
    return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
  }, [exportPreviewRef]);
  const _suggestBuilderBlocks = React.useCallback(async () => {
    if (blockSuggestionsBusy) return;
    if (typeof proposeRestyles !== "function") {
      setBlockSuggestionError("Block suggestions are still loading. Try again in a moment.");
      return;
    }
    const sourceHtml = _getBuilderSuggestionHtml();
    if (!sourceHtml) {
      setBlockSuggestionError("The live document preview is not ready yet. Wait for it to render, then try again.");
      return;
    }
    try {
      blockSuggestionAbortRef.current?.abort();
    } catch (_) {
    }
    const runId = ++blockSuggestionRunRef.current;
    const controller = typeof AbortController === "function" ? new AbortController() : { signal: null, abort: () => {
    } };
    blockSuggestionAbortRef.current = controller;
    setBlockSuggestionsBusy(true);
    setBlockSuggestionError("");
    setBlockSuggestions(null);
    setBlockSuggestionDropped(0);
    try {
      const result = await proposeRestyles(sourceHtml, { max: 10, signal: controller.signal });
      if (runId !== blockSuggestionRunRef.current) return;
      if (!result) {
        setBlockSuggestionError("The AI could not return suggestions right now. No document content was changed; try again when the AI is available.");
        setBlockSuggestions(null);
        return;
      }
      const proposals = Array.isArray(result.proposals) ? result.proposals : [];
      const dropped = Math.max(0, Number(result.suggested || 0) - proposals.length);
      setBlockSuggestions(proposals);
      setBlockSuggestionDropped(dropped);
      if (!proposals.length) {
        setBlockSuggestionError(dropped ? dropped + " AI suggestion" + (dropped === 1 ? "" : "s") + " was filtered out because it could not be applied safely." : "No structure changes suggested for this document.");
      }
    } catch (error) {
      if (runId !== blockSuggestionRunRef.current || error?.name === "AbortError") return;
      setBlockSuggestionError(String(error?.message || "The AI suggestion request failed. Try again."));
      setBlockSuggestions(null);
    } finally {
      if (runId === blockSuggestionRunRef.current) {
        setBlockSuggestionsBusy(false);
        if (blockSuggestionAbortRef.current === controller) blockSuggestionAbortRef.current = null;
      }
    }
  }, [blockSuggestionsBusy, proposeRestyles, _getBuilderSuggestionHtml]);
  const _applyBuilderBlockSuggestion = React.useCallback((proposal) => {
    if (!proposal?.original || !proposal?.html) return;
    const doc = exportPreviewRef.current?.contentDocument;
    const result = _builderReplaceSuggestionHtml(doc, proposal.original, proposal.html);
    if (!result.ok) {
      setBlockSuggestionError(result.reason === "ambiguous" ? "That block is no longer unique in the live document. Run suggestions again." : "That block changed since the suggestion was generated. Run suggestions again.");
      setBlockSuggestions((current) => current ? current.filter((item) => item !== proposal) : current);
      return;
    }
    blockSuggestionUndoRef.current = [...blockSuggestionUndoRef.current.slice(-9), {
      beforeHtml: result.beforeHtml,
      afterHtml: result.afterHtml,
      label: proposal.kind + ": " + (proposal.preview || "block")
    }];
    setBlockSuggestionUndoCount(blockSuggestionUndoRef.current.length);
    _builderDispatchSuggestionInput(doc);
    refreshFormattingState();
    refreshDocumentStats();
    refreshTrackedChanges();
    setBlockSuggestions((current) => current ? current.filter((item) => item !== proposal) : current);
    setBlockSuggestionError("");
    addToast?.("Applied " + proposal.kind + " suggestion. Use Undo if you want to restore the original block.", "success");
  }, [exportPreviewRef, refreshFormattingState, refreshDocumentStats, refreshTrackedChanges, addToast]);
  const _undoBuilderBlockSuggestion = React.useCallback(() => {
    const entry = blockSuggestionUndoRef.current[blockSuggestionUndoRef.current.length - 1];
    if (!entry) return;
    const doc = exportPreviewRef.current?.contentDocument;
    const result = _builderReplaceSuggestionHtml(doc, entry.afterHtml, entry.beforeHtml);
    if (!result.ok) {
      setBlockSuggestionError("The document changed after that suggestion, so the last Builder suggestion cannot be undone safely.");
      return;
    }
    blockSuggestionUndoRef.current = blockSuggestionUndoRef.current.slice(0, -1);
    setBlockSuggestionUndoCount(blockSuggestionUndoRef.current.length);
    _builderDispatchSuggestionInput(doc);
    refreshFormattingState();
    refreshDocumentStats();
    refreshTrackedChanges();
    setBlockSuggestionError("");
    addToast?.("Last AI block suggestion undone.", "info");
  }, [exportPreviewRef, refreshFormattingState, refreshDocumentStats, refreshTrackedChanges, addToast]);
  const refreshActiveReviewComment = React.useCallback(() => {
    const doc = exportPreviewRef.current?.contentDocument;
    try {
      const selection = doc?.getSelection?.();
      let node = selection?.rangeCount ? selection.anchorNode : null;
      if (node?.nodeType === 3) node = node.parentElement;
      const marker = node?.closest?.(_BUILDER_COMMENT_SELECTOR);
      const id = marker?.getAttribute?.("data-allo-comment-id") || "";
      if (id) setActiveCommentId(id);
    } catch (_) {
    }
  }, [exportPreviewRef]);
  const openReviewComments = React.useCallback((commentId = "") => {
    if (commentId) {
      setActiveCommentId(commentId);
      if (reviewComments.some((comment) => comment.id === commentId && comment.resolved)) setShowResolvedComments(true);
    }
    setActiveRibbonTab("review");
    setRibbonCollapsed(false);
    setNavigationPaneTab("comments");
    setShowNavigationPane(true);
  }, [reviewComments]);
  const openTrackedChanges = React.useCallback((changeId = "") => {
    if (changeId) setActiveTrackedChangeId(changeId);
    setActiveRibbonTab("review");
    setRibbonCollapsed(false);
    setNavigationPaneTab("changes");
    setShowNavigationPane(true);
  }, []);
  const refreshActiveTrackedChange = React.useCallback(() => {
    const doc = exportPreviewRef.current?.contentDocument;
    try {
      const selection = doc?.getSelection?.();
      let node = selection?.rangeCount ? selection.anchorNode : null;
      if (node?.nodeType === 3) node = node.parentElement;
      const marker = node?.closest?.(_BUILDER_CHANGE_SELECTOR);
      const id = marker?.getAttribute?.("data-allo-change-id") || "";
      if (id) setActiveTrackedChangeId(id);
    } catch (_) {
    }
  }, [exportPreviewRef]);
  const handleNavigationTabKeyDown = React.useCallback((event, currentTab) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const tabs = ["headings", "pages", "sections", "references", "comments", "changes"];
    const currentIndex = Math.max(0, tabs.indexOf(currentTab));
    const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : event.key === "ArrowLeft" ? (currentIndex - 1 + tabs.length) % tabs.length : (currentIndex + 1) % tabs.length;
    event.preventDefault();
    const nextTab = tabs[nextIndex];
    setNavigationPaneTab(nextTab);
    window.setTimeout(() => document.getElementById(`builder-navigation-tab-${nextTab}`)?.focus(), 0);
  }, []);
  React.useEffect(() => {
    const doc = exportPreviewRef.current?.contentDocument;
    if (!doc?.querySelectorAll) return;
    doc.querySelectorAll(_BUILDER_COMMENT_SELECTOR).forEach((marker) => {
      if (activeCommentId && marker.getAttribute("data-allo-comment-id") === activeCommentId) marker.setAttribute("data-allo-comment-active", "1");
      else marker.removeAttribute("data-allo-comment-active");
    });
  }, [activeCommentId, reviewComments, exportPreviewRef]);
  React.useEffect(() => {
    const doc = exportPreviewRef.current?.contentDocument;
    if (!doc?.querySelectorAll) return;
    doc.querySelectorAll(_BUILDER_CHANGE_SELECTOR).forEach((marker) => {
      if (activeTrackedChangeId && marker.getAttribute("data-allo-change-id") === activeTrackedChangeId) marker.setAttribute("data-allo-change-active", "1");
      else marker.removeAttribute("data-allo-change-active");
    });
  }, [activeTrackedChangeId, trackedChanges, exportPreviewRef]);
  React.useEffect(() => {
    const doc = exportPreviewRef.current?.contentDocument;
    const body = doc?.body;
    if (!body) return;
    _builderSetTrackedMarkupView(doc, trackedMarkupView);
    const normalizedReviewer = String(reviewerName || "You").replace(/\s+/g, " ").trim().slice(0, 80) || "You";
    body.setAttribute("data-allo-reviewer-name", normalizedReviewer);
    if (showRevisionBalloons) body.setAttribute("data-allo-review-balloons", "1");
    else body.removeAttribute("data-allo-review-balloons");
  }, [trackedMarkupView, showRevisionBalloons, reviewerName, trackedChanges, exportPreviewRef]);
  React.useEffect(() => {
    if (trackedChangeAuthorFilter !== "all" && !trackedChangeAuthors.includes(trackedChangeAuthorFilter)) setTrackedChangeAuthorFilter("all");
  }, [trackedChangeAuthorFilter, trackedChangeAuthors.join("|")]);
  const resumeTrackedEditingView = React.useCallback((announce = false) => {
    const doc = exportPreviewRef.current?.contentDocument;
    if (!doc?.body || doc.body.getAttribute("data-allo-tracked-view") !== "original") return false;
    _builderSetTrackedMarkupView(doc, "all");
    setTrackedMarkupView("all");
    if (announce && addToast) addToast("Switched from Original to All Markup so editing can continue safely.", "info");
    return true;
  }, [exportPreviewRef, addToast]);
  const closeWordCountDetails = React.useCallback((returnFocus = true) => {
    setShowWordCountDetails(false);
    if (returnFocus) {
      const opener = wordCountOpenerRef.current || wordCountButtonRef.current || exportPreviewRef.current;
      window.setTimeout(() => opener?.focus?.(), 0);
    }
  }, [exportPreviewRef]);
  const openWordCountDetails = React.useCallback((event) => {
    const opener = event?.currentTarget;
    wordCountOpenerRef.current = opener?.focus ? opener : exportPreviewRef.current || wordCountButtonRef.current;
    refreshDocumentStats();
    refreshSelectionStatistics();
    setShowWordCountDetails(true);
    window.setTimeout(() => wordCountPanelRef.current?.focus(), 0);
  }, [exportPreviewRef, refreshDocumentStats, refreshSelectionStatistics]);
  React.useEffect(() => {
    if (!showExportPreview) return void 0;
    const onOpenWordCount = (event) => openWordCountDetails(event);
    const onWordCountShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && !event.altKey && (event.key === "g" || event.key === "G")) {
        event.preventDefault();
        openWordCountDetails(event);
      }
    };
    document.addEventListener("alloflow-builder-open-word-count", onOpenWordCount);
    document.addEventListener("keydown", onWordCountShortcut);
    return () => {
      document.removeEventListener("alloflow-builder-open-word-count", onOpenWordCount);
      document.removeEventListener("keydown", onWordCountShortcut);
    };
  }, [showExportPreview, openWordCountDetails]);
  React.useEffect(() => {
    if (!showWordCountDetails) return void 0;
    const onPointerDown = (event) => {
      if (wordCountPanelRef.current?.contains(event.target) || wordCountButtonRef.current?.contains(event.target)) return;
      closeWordCountDetails(false);
    };
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      closeWordCountDetails(true);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [showWordCountDetails, closeWordCountDetails]);
  const restoreEditorSelection = React.useCallback(() => {
    const doc = exportPreviewRef.current?.contentDocument;
    const win = exportPreviewRef.current?.contentWindow;
    if (!doc || !win) return false;
    try {
      const range = editorSelectionRangeRef.current;
      if (range && doc.contains(range.commonAncestorContainer)) {
        const selection = win.getSelection();
        selection.removeAllRanges();
        selection.addRange(range.cloneRange());
      }
      win.focus();
      return true;
    } catch (_) {
      return false;
    }
  }, [exportPreviewRef]);
  const runEditorCommand = React.useCallback((command, value = null) => {
    const doc = exportPreviewRef.current?.contentDocument;
    if (!doc) return;
    try {
      resumeTrackedEditingView(true);
      restoreEditorSelection();
      const tracking = doc.body?.getAttribute("data-allo-track-changes") === "1";
      const inlineCommands = /* @__PURE__ */ new Set(["bold", "italic", "underline", "strikeThrough", "subscript", "superscript", "fontSize", "fontName", "foreColor", "hiliteColor", "removeFormat"]);
      const blockCommands = /* @__PURE__ */ new Set(["justifyLeft", "justifyCenter", "justifyRight", "justifyFull"]);
      const structureCommands = /* @__PURE__ */ new Set(["insertUnorderedList", "insertOrderedList"]);
      const labels = {
        bold: "Bold formatting",
        italic: "Italic formatting",
        underline: "Underline formatting",
        strikeThrough: "Strikethrough formatting",
        subscript: "Subscript formatting",
        superscript: "Superscript formatting",
        fontSize: "Font size changed",
        fontName: "Font family changed",
        foreColor: "Text color changed",
        hiliteColor: "Highlight color changed",
        removeFormat: "Formatting cleared",
        justifyLeft: "Paragraph aligned left",
        justifyCenter: "Paragraph centered",
        justifyRight: "Paragraph aligned right",
        justifyFull: "Paragraph justified",
        insertUnorderedList: "Bulleted list structure changed",
        insertOrderedList: "Numbered list structure changed"
      };
      if (command === "insertText" && tracking) {
        const result = _builderTrackTextInsertion(doc, String(value ?? ""));
        if (!result.ok && result.error) addToast && addToast(result.error, result.blocked ? "info" : "error");
      } else if (tracking && inlineCommands.has(command)) {
        const result = _builderTrackInlineFormatting(doc, command, value, labels[command], () => doc.execCommand(command, false, value));
        if (result.direct) doc.execCommand(command, false, value);
        else if (!result.ok && result.error) addToast && addToast(result.error, result.blocked ? "info" : "error");
      } else if (tracking && blockCommands.has(command)) {
        const result = _builderTrackBlockFormattingCommand(doc, command, value, labels[command], () => doc.execCommand(command, false, value));
        if (result.direct && !result.applied) doc.execCommand(command, false, value);
      } else if (tracking && structureCommands.has(command)) {
        const result = _builderTrackStructureReplacementCommand(doc, command, value, labels[command], () => doc.execCommand(command, false, value));
        if (result.direct && !result.applied) doc.execCommand(command, false, value);
      } else if (tracking && command === "insertHorizontalRule") {
        const rule = doc.createElement("hr");
        _builderRecordInsertedStructure(rule, "Inserted horizontal rule");
        doc.execCommand("insertHTML", false, rule.outerHTML);
        _builderDispatchTrackedInput(doc, "structureTrackedChange");
      } else doc.execCommand(command, false, value);
      exportPreviewRef.current?.contentWindow?.focus();
      refreshFormattingState();
      refreshDocumentStats();
      refreshTrackedChanges();
    } catch (_) {
    }
  }, [exportPreviewRef, resumeTrackedEditingView, restoreEditorSelection, refreshFormattingState, refreshDocumentStats, refreshTrackedChanges, addToast]);
  const applyBuilderStyle = React.useCallback((styleId) => {
    const definition = builderStyleGallery.find((item) => item.id === styleId) || builderStyleGallery[0];
    const doc = exportPreviewRef.current?.contentDocument;
    const win = exportPreviewRef.current?.contentWindow;
    if (!doc || !win) return;
    try {
      resumeTrackedEditingView(true);
      restoreEditorSelection();
      let beforeNode = win.getSelection?.()?.anchorNode;
      if (beforeNode?.nodeType === 3) beforeNode = beforeNode.parentElement;
      const beforeBlock = beforeNode?.closest?.("p,h1,h2,h3,blockquote");
      const beforeSnapshot = beforeBlock ? _builderCaptureElementRevision(beforeBlock, { attributeMode: "presentation" }) : null;
      doc.execCommand("formatBlock", false, "<" + definition.tag + ">");
      let selectedNode = win.getSelection?.()?.anchorNode;
      if (selectedNode?.nodeType === 3) selectedNode = selectedNode.parentElement;
      const block = selectedNode?.closest?.("p,h1,h2,h3,blockquote");
      if (block) {
        _BUILDER_STYLE_PROPERTIES.forEach((property) => {
          block.style.removeProperty(property.replace(/[A-Z]/g, (letter) => "-" + letter.toLowerCase()));
        });
        block.removeAttribute("data-allo-style");
        Object.entries(definition.style).forEach(([property, propertyValue]) => {
          block.style[property] = propertyValue;
        });
        if (definition.id !== "normal") block.setAttribute("data-allo-style", definition.id);
        if (!block.getAttribute("style")) block.removeAttribute("style");
        if (doc.body?.getAttribute("data-allo-track-changes") === "1" && beforeSnapshot) {
          _builderRecordElementRevision(block, beforeSnapshot, "format", "Style changed to " + definition.label, {
            kind: "block-format",
            attributeMode: "presentation"
          });
        }
      }
      doc.body?.dispatchEvent(new win.Event("input", { bubbles: true, inputType: "formatTrackedChange" }));
      refreshFormattingState();
      refreshDocumentStats();
      refreshTrackedChanges();
    } catch (_) {
      addToast && addToast("The selected style could not be applied.", "error");
    }
  }, [exportPreviewRef, resumeTrackedEditingView, restoreEditorSelection, refreshFormattingState, refreshDocumentStats, refreshTrackedChanges, builderStyleGallery, addToast]);
  const saveSelectionAsCustomStyle = React.useCallback(async () => {
    if (customBuilderStyles.length >= 12) {
      addToast && addToast("You can keep up to 12 custom styles on this device. Remove one before saving another.", "info");
      return;
    }
    const doc = exportPreviewRef.current?.contentDocument;
    const win = exportPreviewRef.current?.contentWindow;
    if (!doc || !win) {
      addToast && addToast("The editable document is not ready yet.", "info");
      return;
    }
    restoreEditorSelection();
    let selectedNode = win.getSelection?.()?.anchorNode;
    if (selectedNode?.nodeType === 3) selectedNode = selectedNode.parentElement;
    const block = selectedNode?.closest?.("p,h1,h2,h3,blockquote");
    if (!block) {
      addToast && addToast("Place the caret in a paragraph, heading, quote, or callout first.", "info");
      return;
    }
    const tag = String(block.tagName || "P").toLowerCase();
    const namedStyle = block.getAttribute("data-allo-style") || "normal";
    const baseDefinition = builderStyleGallery.find((item) => item.id === namedStyle) || _BUILDER_STYLE_GALLERY[0];
    const style = { ...baseDefinition?.style || {} };
    _BUILDER_STYLE_PROPERTIES.forEach((property) => {
      const inlineValue = String(block.style?.[property] || "").trim();
      if (inlineValue) style[property] = inlineValue;
    });
    const name = await promptForBuilderText("Name this reusable paragraph style.", baseDefinition?.custom ? baseDefinition.label : "", {
      title: "Save custom style",
      confirmText: "Save style",
      cancelText: "Cancel",
      placeholder: "Style name",
      maxLength: 60,
      validate: (value) => value.trim() ? null : "Enter a style name."
    });
    if (name == null || !String(name).trim()) return;
    const definition = {
      id: "custom-style-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7),
      label: String(name).replace(/\s+/g, " ").trim(),
      tag,
      style,
      custom: true,
      createdAt: Date.now()
    };
    setCustomBuilderStyles((current) => _builderNormalizeCustomStyles([...current, definition]));
    addToast && addToast("Custom style saved on this device.", "success");
  }, [customBuilderStyles.length, exportPreviewRef, restoreEditorSelection, builderStyleGallery, promptForBuilderText, addToast]);
  const deleteCustomBuilderStyle = React.useCallback((styleId) => {
    const definition = customBuilderStyles.find((item) => item.id === styleId);
    if (!definition) return;
    setCustomBuilderStyles((current) => current.filter((item) => item.id !== styleId));
    addToast && addToast("Removed \u201C" + definition.label + "\u201D from your custom styles. Existing document formatting was kept.", "success");
  }, [customBuilderStyles, addToast]);
  const useFormatPainter = React.useCallback(() => {
    const doc = exportPreviewRef.current?.contentDocument;
    const win = exportPreviewRef.current?.contentWindow;
    if (!doc || !win) return;
    try {
      resumeTrackedEditingView(true);
      restoreEditorSelection();
      const selection = win.getSelection?.();
      let selectedNode = selection?.anchorNode;
      if (selectedNode?.nodeType === 3) selectedNode = selectedNode.parentElement;
      const block = selectedNode?.closest?.("p,h1,h2,h3,blockquote");
      const state = (command) => {
        try {
          return Boolean(doc.queryCommandState(command));
        } catch (_) {
          return false;
        }
      };
      const value = (command) => {
        try {
          return String(doc.queryCommandValue(command) || "");
        } catch (_) {
          return "";
        }
      };
      if (!formatPainterRef.current) {
        const blockTag = String(block?.tagName || "P").toLowerCase();
        formatPainterRef.current = {
          blockTag: ["p", "h1", "h2", "h3", "blockquote"].includes(blockTag) ? blockTag : "p",
          blockStyle: block?.getAttribute("style") || "",
          namedStyle: block?.getAttribute("data-allo-style") || "",
          states: {
            bold: state("bold"),
            italic: state("italic"),
            underline: state("underline"),
            strikeThrough: state("strikeThrough"),
            subscript: state("subscript"),
            superscript: state("superscript")
          },
          fontSize: value("fontSize"),
          fontName: value("fontName"),
          foreColor: value("foreColor"),
          hiliteColor: value("hiliteColor"),
          alignment: state("justifyCenter") ? "justifyCenter" : state("justifyRight") ? "justifyRight" : state("justifyFull") ? "justifyFull" : "justifyLeft"
        };
        setFormatPainterActive(true);
        addToast && addToast("Formatting copied. Select the destination, then choose Apply format.", "info");
        return;
      }
      const snapshot = formatPainterRef.current;
      const destinationBefore = block ? _builderCaptureElementRevision(block, { attributeMode: "presentation" }) : null;
      doc.execCommand("formatBlock", false, "<" + snapshot.blockTag + ">");
      Object.entries(snapshot.states).forEach(([command, enabled]) => {
        if (state(command) !== enabled) doc.execCommand(command, false, null);
      });
      if (snapshot.fontSize) doc.execCommand("fontSize", false, snapshot.fontSize);
      if (snapshot.fontName) doc.execCommand("fontName", false, snapshot.fontName);
      if (snapshot.foreColor) doc.execCommand("foreColor", false, snapshot.foreColor);
      if (snapshot.hiliteColor) doc.execCommand("hiliteColor", false, snapshot.hiliteColor);
      doc.execCommand(snapshot.alignment, false, null);
      selectedNode = win.getSelection?.()?.anchorNode;
      if (selectedNode?.nodeType === 3) selectedNode = selectedNode.parentElement;
      const targetBlock = selectedNode?.closest?.("p,h1,h2,h3,blockquote");
      if (targetBlock) {
        if (snapshot.blockStyle) targetBlock.setAttribute("style", snapshot.blockStyle);
        else targetBlock.removeAttribute("style");
        if (snapshot.namedStyle) targetBlock.setAttribute("data-allo-style", snapshot.namedStyle);
        else targetBlock.removeAttribute("data-allo-style");
        if (doc.body?.getAttribute("data-allo-track-changes") === "1" && destinationBefore) {
          _builderRecordElementRevision(targetBlock, destinationBefore, "format", "Format Painter applied", {
            kind: "block-format",
            attributeMode: "presentation"
          });
        }
      }
      doc.body?.dispatchEvent(new win.Event("input", { bubbles: true, inputType: "formatTrackedChange" }));
      formatPainterRef.current = null;
      setFormatPainterActive(false);
      refreshFormattingState();
      refreshDocumentStats();
      refreshTrackedChanges();
      addToast && addToast("Formatting applied.", "success");
    } catch (_) {
      formatPainterRef.current = null;
      setFormatPainterActive(false);
      addToast && addToast("Format Painter could not apply that formatting.", "error");
    }
  }, [exportPreviewRef, resumeTrackedEditingView, restoreEditorSelection, refreshFormattingState, refreshDocumentStats, refreshTrackedChanges, addToast]);
  const cancelFormatPainter = React.useCallback(() => {
    formatPainterRef.current = null;
    setFormatPainterActive(false);
    addToast && addToast("Format Painter cancelled.", "info");
  }, [addToast]);
  React.useEffect(() => {
    if (showExportPreview) return;
    formatPainterRef.current = null;
    setFormatPainterActive(false);
  }, [showExportPreview]);
  const refreshActiveHeading = React.useCallback(() => {
    const doc = exportPreviewRef.current?.contentDocument;
    if (!doc) return;
    try {
      const headings = Array.from(doc.querySelectorAll("h1,h2,h3,h4,h5,h6"));
      const threshold = 96;
      let active = null;
      headings.forEach((node, index) => {
        if (node.getBoundingClientRect().top <= threshold) active = index;
      });
      setActiveHeadingIndex(active);
    } catch (_) {
    }
  }, [exportPreviewRef]);
  const refreshPageMetrics = React.useCallback(() => {
    const iframe = exportPreviewRef.current;
    const doc = iframe?.contentDocument;
    if (!doc?.body) return;
    try {
      const zoom = _builderClampEditorZoom(iframe.__alloBuilderZoom);
      const pageView = iframe.__alloBuilderPageView !== false;
      const pageAdvanceBase = _builderPageDimensions(pageSetup).heightPx + (pageView ? 24 : 0);
      _builderSyncBreakFill(doc, pageAdvanceBase, zoom, pageView);
      const pageHeight = pageAdvanceBase * (zoom / 100);
      const scrollTop = Number(doc.defaultView?.scrollY || doc.documentElement?.scrollTop || doc.body?.scrollTop || 0);
      const bodyTop = doc.body.getBoundingClientRect().top + scrollTop;
      const totalHeight = Math.max(doc.documentElement?.scrollHeight || 0, doc.body?.scrollHeight || 0);
      const count = Math.max(1, Math.min(200, Math.ceil((totalHeight + 12) / pageHeight)));
      const pageForNode = (node) => {
        if (!node?.getBoundingClientRect) return 0;
        const top = node.getBoundingClientRect().top + scrollTop - bodyTop;
        return Math.min(count - 1, Math.max(0, Math.floor(Math.max(0, top) / pageHeight)));
      };
      const sections = Array.from(doc.querySelectorAll("h1,h2,h3,h4,h5,h6")).map((node, index) => ({
        index,
        level: Number(node.tagName.substring(1)) || 1,
        text: (node.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80) || `Untitled heading ${index + 1}`,
        page: pageForNode(node)
      }));
      const documentSections = _builderDocumentSections(doc, pageForNode);
      const selection = doc.getSelection?.();
      let selectedNode = selection?.rangeCount ? selection.anchorNode : null;
      if (selectedNode?.nodeType === 3) selectedNode = selectedNode.parentElement;
      const activeSection = Math.min(documentSections.length - 1, Math.max(0, _builderSectionIndexForNode(doc, selectedNode)));
      const active = selectedNode?.getBoundingClientRect ? pageForNode(selectedNode) : Math.min(count - 1, Math.max(0, Math.floor((scrollTop + 1) / pageHeight)));
      setPageMetrics((previous) => {
        const previousHeadings = previous.sections || [];
        const previousDocumentSections = previous.documentSections || [];
        const sameHeadings = previousHeadings.length === sections.length && previousHeadings.every((item, index) => item.page === sections[index].page && item.level === sections[index].level && item.text === sections[index].text);
        const sameDocumentSections = previousDocumentSections.length === documentSections.length && previousDocumentSections.every((item, index) => item.id === documentSections[index].id && item.name === documentSections[index].name && item.startType === documentSections[index].startType && item.page === documentSections[index].page);
        return previous.count === count && previous.active === active && previous.activeSection === activeSection && sameHeadings && sameDocumentSections ? previous : { count, active, sections, documentSections, activeSection };
      });
    } catch (_) {
    }
  }, [exportPreviewRef, pageSetup.size, pageSetup.orientation, pageSetup.margin]);
  React.useEffect(() => {
    refreshPageMetrics();
  }, [refreshPageMetrics, editorZoom, editorPageView, showExportPreview]);
  const jumpToPage = React.useCallback((pageIndex) => {
    const iframe = exportPreviewRef.current;
    const doc = iframe?.contentDocument;
    if (!doc) return;
    const zoom = _builderClampEditorZoom(iframe.__alloBuilderZoom);
    const pageAdvance = (_builderPageDimensions(pageSetup).heightPx + (iframe.__alloBuilderPageView === false ? 0 : 24)) * (zoom / 100);
    const top = Math.max(0, Number(pageIndex) || 0) * pageAdvance;
    const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    try {
      doc.defaultView?.scrollTo({ top, behavior: reducedMotion ? "auto" : "smooth" });
    } catch (_) {
      try {
        doc.defaultView?.scrollTo(0, top);
      } catch (_2) {
      }
    }
    setPageMetrics((previous) => ({ ...previous, active: Math.max(0, Math.min(previous.count - 1, Number(pageIndex) || 0)) }));
    iframe.focus();
  }, [exportPreviewRef, pageSetup.size, pageSetup.orientation, pageSetup.margin]);
  const jumpToDocumentSection = React.useCallback((sectionIndex) => {
    const iframe = exportPreviewRef.current;
    const doc = iframe?.contentDocument;
    if (!doc?.body) return;
    const sections = pageMetrics.documentSections || [];
    const index = Math.max(0, Math.min(sections.length - 1, Number(sectionIndex) || 0));
    const section = sections[index];
    const markers = _builderSectionBreaks(doc);
    const marker = index > 0 ? markers[index - 1] : null;
    let target = marker?.nextElementSibling || doc.body.firstElementChild;
    while (target && target.matches?.("[data-allo-page-element],script,style,[data-allo-page-break],[data-allo-section-break]")) target = target.nextElementSibling;
    const scrollTarget = marker || target || doc.body;
    const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    try {
      scrollTarget.scrollIntoView({ block: "start", behavior: reducedMotion ? "auto" : "smooth" });
    } catch (_) {
    }
    if (target) {
      try {
        const range = doc.createRange();
        range.selectNodeContents(target);
        range.collapse(true);
        const selection = doc.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        editorSelectionRangeRef.current = range.cloneRange();
      } catch (_) {
      }
    }
    setPageMetrics((previous) => ({ ...previous, active: section?.page || 0, activeSection: index }));
    iframe.focus();
  }, [exportPreviewRef, pageMetrics.documentSections]);
  const commitSectionName = React.useCallback(() => {
    const doc = exportPreviewRef.current?.contentDocument;
    if (!doc?.body) return false;
    resumeTrackedEditingView(true);
    const index = activeDocumentSection.index || 0;
    const normalized = _builderNormalizeSectionName(sectionNameDraft, index);
    const markers = _builderSectionBreaks(doc);
    const marker = index > 0 ? markers[index - 1] : null;
    const currentName = index === 0 ? _builderNormalizeSectionName(doc.body.getAttribute("data-allo-section-name"), 0) : _builderNormalizeSectionName(marker?.getAttribute("data-allo-section-name"), index);
    setSectionNameDraft(normalized);
    if (normalized === currentName) return true;
    const markerBefore = marker && doc.body.getAttribute("data-allo-track-changes") === "1" ? _builderCaptureElementRevision(marker, { attributeMode: "all" }) : null;
    if (index === 0) doc.body.setAttribute("data-allo-section-name", normalized);
    else if (marker) {
      marker.setAttribute("data-allo-section-name", normalized);
      marker.setAttribute("aria-label", `${marker.getAttribute("data-allo-section-break") === "continuous" ? "Continuous" : "Next page"} section break. Starts ${normalized}.`);
    } else return false;
    if (markerBefore) _builderRecordElementRevision(marker, markerBefore, "structure", "Section renamed to " + normalized, { kind: "section-format", attributeMode: "all" });
    doc.body.setAttribute("data-allo-user-edited", "1");
    doc.body.dispatchEvent(new doc.defaultView.Event("input", { bubbles: true, inputType: "formatSection" }));
    refreshTrackedChanges();
    refreshPageMetrics();
    addToast && addToast(`Section renamed to \u201C${normalized}\u201D.`, "success");
    return true;
  }, [exportPreviewRef, activeDocumentSection.index, sectionNameDraft, resumeTrackedEditingView, refreshTrackedChanges, refreshPageMetrics, addToast]);
  const setActiveSectionStartType = React.useCallback((startType) => {
    const doc = exportPreviewRef.current?.contentDocument;
    const index = activeDocumentSection.index || 0;
    if (!doc?.body || index === 0) return false;
    const marker = _builderSectionBreaks(doc)[index - 1];
    if (!marker) return false;
    resumeTrackedEditingView(true);
    const normalized = startType === "continuous" ? "continuous" : "next-page";
    if (marker.getAttribute("data-allo-section-break") === normalized) return true;
    const markerBefore = doc.body.getAttribute("data-allo-track-changes") === "1" ? _builderCaptureElementRevision(marker, { attributeMode: "all" }) : null;
    marker.setAttribute("data-allo-section-break", normalized);
    marker.style.breakBefore = normalized === "continuous" ? "auto" : "page";
    marker.style.pageBreakBefore = normalized === "continuous" ? "auto" : "always";
    const name = _builderNormalizeSectionName(marker.getAttribute("data-allo-section-name"), index);
    if (markerBefore) _builderRecordElementRevision(marker, markerBefore, "structure", normalized === "continuous" ? "Section changed to continuous" : "Section changed to next page", { kind: "section-format", attributeMode: "all" });
    marker.setAttribute("aria-label", `${normalized === "continuous" ? "Continuous" : "Next page"} section break. Starts ${name}.`);
    doc.body.setAttribute("data-allo-user-edited", "1");
    doc.body.dispatchEvent(new doc.defaultView.Event("input", { bubbles: true, inputType: "formatSection" }));
    refreshTrackedChanges();
    refreshPageMetrics();
    addToast && addToast(normalized === "continuous" ? "Section now continues on the same page." : "Section now starts on the next page.", "success");
    return true;
  }, [exportPreviewRef, activeDocumentSection.index, resumeTrackedEditingView, refreshTrackedChanges, refreshPageMetrics, addToast]);
  const insertSectionBreak = React.useCallback((startType = "next-page") => {
    const doc = exportPreviewRef.current?.contentDocument;
    if (!doc) return false;
    resumeTrackedEditingView(true);
    restoreEditorSelection();
    exportPreviewRef.current?.contentWindow?.focus();
    const inserted = _builderInsertDocumentBreak(doc, "section", { startType });
    if (!inserted) {
      addToast && addToast("Place the caret in the document before inserting a section break.", "info");
      return false;
    }
    refreshDocumentStats();
    refreshTrackedChanges();
    window.setTimeout(refreshPageMetrics, 0);
    addToast && addToast(`${inserted.name} inserted${inserted.startType === "continuous" ? " on the same page" : " on the next page"}.`, "success");
    return true;
  }, [exportPreviewRef, resumeTrackedEditingView, restoreEditorSelection, refreshDocumentStats, refreshTrackedChanges, refreshPageMetrics, addToast]);
  const removeActiveSectionBreak = React.useCallback(() => {
    const doc = exportPreviewRef.current?.contentDocument;
    const index = activeDocumentSection.index || 0;
    if (!doc?.body || index === 0) return false;
    const marker = _builderSectionBreaks(doc)[index - 1];
    if (!marker) return false;
    try {
      resumeTrackedEditingView(true);
      const tracking = doc.body.getAttribute("data-allo-track-changes") === "1";
      if (tracking) {
        if (!_builderRecordDeletedStructure(marker, "Deleted section break")) return false;
      } else {
        const selection = doc.getSelection();
        const range = doc.createRange();
        range.selectNode(marker);
        selection.removeAllRanges();
        selection.addRange(range);
        const deleted = Boolean(doc.execCommand("delete", false, null));
        if (!deleted && marker.isConnected) marker.remove();
      }
      doc.body.setAttribute("data-allo-user-edited", "1");
      doc.body.dispatchEvent(new doc.defaultView.Event("input", { bubbles: true, inputType: tracking ? "structureTrackedChange" : "deleteSectionBreak" }));
      refreshDocumentStats();
      refreshTrackedChanges();
      window.setTimeout(refreshPageMetrics, 0);
      addToast && addToast(tracking ? "Section break deletion recorded for review." : "Section break removed; its content was merged with the previous section.", "success");
      return true;
    } catch (_) {
      addToast && addToast("The section break could not be removed.", "error");
      return false;
    }
  }, [exportPreviewRef, activeDocumentSection.index, resumeTrackedEditingView, refreshDocumentStats, refreshTrackedChanges, refreshPageMetrics, addToast]);
  const insertPageBreak = React.useCallback(() => {
    const doc = exportPreviewRef.current?.contentDocument;
    if (!doc) return false;
    try {
      resumeTrackedEditingView(true);
      exportPreviewRef.current?.contentWindow?.focus();
      const inserted = _builderInsertDocumentBreak(doc, "page");
      if (!inserted) {
        addToast && addToast("Place the caret in the document before inserting a page break.", "info");
        return false;
      }
      refreshDocumentStats();
      refreshTrackedChanges();
      window.setTimeout(refreshPageMetrics, 0);
      addToast && addToast("Page break inserted.", "success");
      return true;
    } catch (_) {
      return false;
    }
  }, [exportPreviewRef, resumeTrackedEditingView, refreshDocumentStats, refreshTrackedChanges, refreshPageMetrics, addToast]);
  const syncPageSetupFromDocument = React.useCallback(() => {
    const doc = exportPreviewRef.current?.contentDocument;
    const style = doc?.getElementById("allo-page-setup-style") || doc?.getElementById("allo-margin-style");
    if (!style) {
      applyPageSetup(pageSetup);
      return;
    }
    applyPageSetup({
      size: style.getAttribute("data-page-size") || pageSetup.size,
      orientation: style.getAttribute("data-page-orientation") || pageSetup.orientation,
      margin: style.getAttribute("data-page-margin") || pageSetup.margin
    });
  }, [exportPreviewRef, applyPageSetup, pageSetup]);
  const syncPageElementsFromDocument = React.useCallback(() => {
    const doc = exportPreviewRef.current?.contentDocument;
    if (!doc?.body) return;
    const header = doc.querySelector("header[data-allo-page-header]");
    const footer = doc.querySelector("footer[data-allo-page-footer]");
    const headerAlignment = header?.getAttribute("data-header-alignment");
    const pageNumberPosition = footer?.getAttribute("data-page-number-position");
    const next = {
      headerText: String(header?.querySelector("[data-allo-header-text]")?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120),
      headerAlignment: ["left", "center", "right"].includes(headerAlignment) ? headerAlignment : "left",
      footerText: String(footer?.querySelector("[data-allo-footer-text]")?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 160),
      pageNumbers: ["left", "center", "right"].includes(pageNumberPosition) && footer?.querySelector("[data-allo-page-number]") ? pageNumberPosition : "none"
    };
    setPageElements((previous) => previous.headerText === next.headerText && previous.headerAlignment === next.headerAlignment && previous.footerText === next.footerText && previous.pageNumbers === next.pageNumbers ? previous : next);
  }, [exportPreviewRef]);
  const applyPageElements = React.useCallback((configOverride = pageElements, announce = true) => {
    const doc = exportPreviewRef.current?.contentDocument;
    if (!doc?.body) return false;
    const normalized = {
      headerText: String(configOverride?.headerText || "").replace(/\s+/g, " ").trim().slice(0, 120),
      headerAlignment: ["left", "center", "right"].includes(configOverride?.headerAlignment) ? configOverride.headerAlignment : "left",
      footerText: String(configOverride?.footerText || "").replace(/\s+/g, " ").trim().slice(0, 160),
      pageNumbers: ["left", "center", "right"].includes(configOverride?.pageNumbers) ? configOverride.pageNumbers : "none"
    };
    try {
      let header = doc.querySelector("header[data-allo-page-header]");
      if (normalized.headerText) {
        if (!header) header = doc.createElement("header");
        header.setAttribute("data-allo-page-element", "header");
        header.setAttribute("data-allo-page-header", "1");
        header.setAttribute("data-header-alignment", normalized.headerAlignment);
        header.setAttribute("contenteditable", "false");
        header.setAttribute("aria-label", "Page header");
        header.style.setProperty("--allo-header-align", normalized.headerAlignment);
        header.style.textAlign = normalized.headerAlignment;
        header.replaceChildren();
        const headerText = doc.createElement("span");
        headerText.setAttribute("data-allo-header-text", "1");
        headerText.textContent = normalized.headerText;
        header.appendChild(headerText);
        if (doc.body.firstChild !== header) doc.body.insertBefore(header, doc.body.firstChild);
      } else if (header) {
        header.remove();
      }
      let footer = doc.querySelector("footer[data-allo-page-footer]");
      if (normalized.footerText || normalized.pageNumbers !== "none") {
        if (!footer) footer = doc.createElement("footer");
        footer.setAttribute("data-allo-page-element", "footer");
        footer.setAttribute("data-allo-page-footer", "1");
        footer.setAttribute("data-page-number-position", normalized.pageNumbers);
        footer.setAttribute("contenteditable", "false");
        footer.setAttribute("aria-label", "Page footer");
        footer.replaceChildren();
        if (normalized.footerText) {
          const footerText = doc.createElement("span");
          footerText.setAttribute("data-allo-footer-text", "1");
          footerText.textContent = normalized.footerText;
          footer.appendChild(footerText);
        }
        if (normalized.pageNumbers !== "none") {
          const pageNumber = doc.createElement("span");
          pageNumber.setAttribute("data-allo-page-number", "1");
          pageNumber.setAttribute("aria-label", "Automatic page number");
          footer.appendChild(pageNumber);
        }
        if (footer.parentElement !== doc.body) doc.body.appendChild(footer);
        else if (doc.body.lastChild !== footer) doc.body.appendChild(footer);
      } else if (footer) {
        footer.remove();
      }
      setPageElements(normalized);
      doc.body.setAttribute("data-allo-user-edited", "1");
      const InputEventCtor = doc.defaultView?.InputEvent || doc.defaultView?.Event;
      doc.body.dispatchEvent(new InputEventCtor("input", { bubbles: true }));
      refreshDocumentStats();
      refreshPageMetrics();
      if (announce && addToast) {
        const hasElements = Boolean(normalized.headerText || normalized.footerText || normalized.pageNumbers !== "none");
        addToast(hasElements ? "Header, footer, and page numbering updated." : "Header and footer cleared.", "success");
      }
      return true;
    } catch (_) {
      if (announce && addToast) addToast("Could not update the page header or footer.", "error");
      return false;
    }
  }, [pageElements, exportPreviewRef, refreshDocumentStats, refreshPageMetrics, addToast]);
  const clearPageElements = React.useCallback(() => {
    applyPageElements({ headerText: "", headerAlignment: "left", footerText: "", pageNumbers: "none" });
  }, [applyPageElements]);
  const refreshTableContext = React.useCallback(() => {
    const doc = exportPreviewRef.current?.contentDocument;
    if (!doc) return;
    let selectedNode = doc.getSelection?.()?.anchorNode;
    if (selectedNode?.nodeType === 3) selectedNode = selectedNode.parentElement;
    const cell = selectedNode?.closest?.("td,th") || null;
    const table = cell?.closest?.("table") || null;
    const next = table && cell ? {
      active: true,
      rows: table.rows.length,
      columns: Math.max(0, ...Array.from(table.rows).map((row) => row.cells.length)),
      hasHeader: Boolean(table.tHead?.querySelector("th")),
      headerCell: cell.tagName === "TH"
    } : { active: false, rows: 0, columns: 0, hasHeader: false, headerCell: false };
    setTableContext((previous) => previous.active === next.active && previous.rows === next.rows && previous.columns === next.columns && previous.hasHeader === next.hasHeader && previous.headerCell === next.headerCell ? previous : next);
  }, [exportPreviewRef]);
  const insertAccessibleTable = React.useCallback(() => {
    const doc = exportPreviewRef.current?.contentDocument;
    const win = exportPreviewRef.current?.contentWindow;
    if (!doc || !win) return;
    const bodyRows = Math.max(1, Math.min(20, Number(tableInsertConfig.rows) || 1));
    const columns = Math.max(1, Math.min(10, Number(tableInsertConfig.columns) || 1));
    try {
      resumeTrackedEditingView(true);
      restoreEditorSelection();
      const marker = "allo-builder-table-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
      const table = doc.createElement("table");
      table.setAttribute("data-allo-insert-id", marker);
      table.setAttribute("style", "width:100%;border-collapse:collapse;margin:1em 0;");
      const captionText = String(tableInsertConfig.caption || "").trim().slice(0, 160);
      if (captionText) {
        const caption = doc.createElement("caption");
        caption.textContent = captionText;
        caption.setAttribute("style", "caption-side:top;text-align:left;font-weight:700;padding:0 0 .4em;");
        table.appendChild(caption);
      }
      const cellStyle = "border:1px solid #94a3b8;padding:.5em;vertical-align:top;";
      if (tableInsertConfig.headerRow) {
        const thead = doc.createElement("thead");
        const header = doc.createElement("tr");
        for (let column = 0; column < columns; column += 1) {
          const th = doc.createElement("th");
          th.setAttribute("scope", "col");
          th.setAttribute("style", cellStyle + "background:#f1f5f9;text-align:left;");
          th.textContent = "Column " + (column + 1);
          header.appendChild(th);
        }
        thead.appendChild(header);
        table.appendChild(thead);
      }
      const tbody = doc.createElement("tbody");
      for (let rowIndex = 0; rowIndex < bodyRows; rowIndex += 1) {
        const row = doc.createElement("tr");
        for (let column = 0; column < columns; column += 1) {
          const td = doc.createElement("td");
          td.setAttribute("style", cellStyle);
          td.appendChild(doc.createElement("br"));
          row.appendChild(td);
        }
        tbody.appendChild(row);
      }
      table.appendChild(tbody);
      doc.execCommand("insertHTML", false, table.outerHTML + "<p><br></p>");
      const inserted = doc.querySelector('table[data-allo-insert-id="' + marker + '"]');
      if (inserted) {
        inserted.removeAttribute("data-allo-insert-id");
        if (doc.body?.getAttribute("data-allo-track-changes") === "1") _builderRecordInsertedStructure(inserted, "Inserted accessible table");
        const firstCell = inserted.querySelector("th,td");
        if (firstCell) {
          const range = doc.createRange();
          range.selectNodeContents(firstCell);
          if (firstCell.tagName !== "TH") range.collapse(true);
          const selection = win.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
          editorSelectionRangeRef.current = range.cloneRange();
        }
      }
      doc.body?.dispatchEvent(new win.Event("input", { bubbles: true }));
      refreshDocumentStats();
      refreshTrackedChanges();
      refreshPageMetrics();
      window.setTimeout(refreshTableContext, 0);
      addToast && addToast(doc.body?.getAttribute("data-allo-track-changes") === "1" ? "Accessible table inserted as a tracked structural change." : "Accessible table inserted.", "success");
    } catch (_) {
      addToast && addToast("The table could not be inserted.", "error");
    }
  }, [exportPreviewRef, tableInsertConfig, resumeTrackedEditingView, restoreEditorSelection, refreshDocumentStats, refreshTrackedChanges, refreshPageMetrics, refreshTableContext, addToast]);
  const editSelectedTable = React.useCallback((action) => {
    const doc = exportPreviewRef.current?.contentDocument;
    const win = exportPreviewRef.current?.contentWindow;
    if (!doc || !win) return;
    try {
      resumeTrackedEditingView(true);
      restoreEditorSelection();
      let selectedNode = win.getSelection?.()?.anchorNode;
      if (selectedNode?.nodeType === 3) selectedNode = selectedNode.parentElement;
      const cell = selectedNode?.closest?.("td,th");
      const row = cell?.closest?.("tr");
      const table = cell?.closest?.("table");
      if (!cell || !row || !table) {
        addToast && addToast("Place the caret inside a table cell first.", "info");
        return;
      }
      const cellStyle = "border:1px solid #94a3b8;padding:.5em;vertical-align:top;";
      const columnIndex = cell.cellIndex;
      const trackingTable = doc.body?.getAttribute("data-allo-track-changes") === "1";
      const tableBefore = trackingTable ? _builderCaptureElementRevision(table, { attributeMode: "all", includeContent: true }) : null;
      let targetCell = cell;
      if (action === "add-row") {
        const newRow = doc.createElement("tr");
        const columnCount = Math.max(1, ...Array.from(table.rows).map((item) => item.cells.length));
        for (let index = 0; index < columnCount; index += 1) {
          const td = doc.createElement("td");
          td.setAttribute("style", cellStyle);
          td.appendChild(doc.createElement("br"));
          newRow.appendChild(td);
        }
        if (row.parentElement?.tagName === "THEAD") {
          const body = table.tBodies[0] || table.appendChild(doc.createElement("tbody"));
          body.insertBefore(newRow, body.firstChild);
        } else row.parentElement.insertBefore(newRow, row.nextSibling);
        targetCell = newRow.cells[Math.min(columnIndex, newRow.cells.length - 1)];
      } else if (action === "add-column") {
        Array.from(table.rows).forEach((tableRow) => {
          const header = tableRow.parentElement?.tagName === "THEAD";
          const newCell = doc.createElement(header ? "th" : "td");
          newCell.setAttribute("style", cellStyle + (header ? "background:#f1f5f9;text-align:left;" : ""));
          if (header) {
            newCell.setAttribute("scope", "col");
            newCell.textContent = "Column " + (columnIndex + 2);
          } else newCell.appendChild(doc.createElement("br"));
          tableRow.insertBefore(newCell, tableRow.cells[columnIndex + 1] || null);
        });
        targetCell = row.cells[Math.min(columnIndex + 1, row.cells.length - 1)];
      } else if (action === "remove-row") {
        if (cell.tagName === "TH") {
          addToast && addToast("The header row is kept for accessibility.", "info");
          return;
        }
        const minimumRows = table.tHead ? 2 : 1;
        if (table.rows.length <= minimumRows) {
          addToast && addToast("A table needs at least one data row.", "info");
          return;
        }
        const nextRowIndex = Math.max(0, Math.min(table.rows.length - 2, row.rowIndex));
        row.remove();
        const nextRow = table.rows[nextRowIndex];
        targetCell = nextRow?.cells[Math.min(columnIndex, Math.max(0, nextRow.cells.length - 1))] || null;
      } else if (action === "remove-column") {
        const columnCount = Math.max(0, ...Array.from(table.rows).map((item) => item.cells.length));
        if (columnCount <= 1) {
          addToast && addToast("A table needs at least one column.", "info");
          return;
        }
        Array.from(table.rows).forEach((tableRow) => {
          if (tableRow.cells[columnIndex]) tableRow.deleteCell(columnIndex);
        });
        targetCell = row.cells[Math.min(columnIndex, Math.max(0, row.cells.length - 1))] || null;
      } else return;
      if (trackingTable && tableBefore) {
        const tableLabels = {
          "add-row": "Table row inserted",
          "add-column": "Table column inserted",
          "remove-row": "Table row deleted",
          "remove-column": "Table column deleted"
        };
        _builderRecordElementRevision(table, tableBefore, "structure", tableLabels[action] || "Table structure changed", {
          kind: "table-structure",
          action,
          attributeMode: "all",
          includeContent: true
        });
      }
      if (targetCell?.isConnected) {
        const range = doc.createRange();
        range.selectNodeContents(targetCell);
        range.collapse(true);
        const selection = win.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        editorSelectionRangeRef.current = range.cloneRange();
      }
      doc.body?.dispatchEvent(new win.Event("input", { bubbles: true }));
      refreshDocumentStats();
      refreshTrackedChanges();
      refreshPageMetrics();
      refreshTableContext();
    } catch (_) {
      addToast && addToast("The table could not be updated.", "error");
    }
  }, [exportPreviewRef, resumeTrackedEditingView, restoreEditorSelection, refreshDocumentStats, refreshTrackedChanges, refreshPageMetrics, refreshTableContext, addToast]);
  const openImagePicker = React.useCallback((event) => {
    imageOpenerRef.current = event?.currentTarget || imageAddButtonRef.current;
    restoreEditorSelection();
    const doc = exportPreviewRef.current?.contentDocument;
    const selection = doc?.getSelection();
    imageInsertionRangeRef.current = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
    imageFileInputRef.current?.click();
  }, [exportPreviewRef, restoreEditorSelection]);
  const applyParagraphLayout = React.useCallback((patch = {}, options = {}) => {
    const doc = exportPreviewRef.current?.contentDocument;
    const win = exportPreviewRef.current?.contentWindow;
    if (!doc || !win) return false;
    const contentWidth = _builderPageContentWidth(pageSetup);
    try {
      resumeTrackedEditingView(true);
      if (options.restoreFocus === false) {
        const savedRange = editorSelectionRangeRef.current;
        if (savedRange && doc.contains(savedRange.commonAncestorContainer)) {
          const selection = win.getSelection();
          selection.removeAllRanges();
          selection.addRange(savedRange.cloneRange());
        }
      } else restoreEditorSelection();
      const blocks = _builderSelectedParagraphBlocks(doc);
      if (!blocks.length) {
        if (options.announce !== false && addToast) addToast("Place the caret inside a paragraph first.", "info");
        return false;
      }
      const fields = new Set(options.replace ? Object.keys(_BUILDER_PARAGRAPH_DEFAULTS) : Object.keys(patch));
      const trackingParagraph = doc.body.getAttribute("data-allo-track-changes") === "1";
      const paragraphChangeLabel = options.replace ? "Paragraph layout reset" : "Paragraph layout changed: " + Array.from(fields).map((field) => field.replace(/([A-Z])/g, " $1").toLowerCase()).join(", ");
      blocks.forEach((block) => {
        const beforeRevision = trackingParagraph ? _builderCaptureElementRevision(block, { attributeMode: "presentation" }) : null;
        const current = _builderParagraphLayoutFromBlock(block);
        const next = _normalizeBuilderParagraphLayout(options.replace ? { ..._BUILDER_PARAGRAPH_DEFAULTS, ...patch } : { ...current, ...patch }, contentWidth);
        const namedStyle = builderStyleGallery.find((item) => item.id === block.getAttribute("data-allo-style"));
        const restoreNamedStyle = (property, cssName) => {
          const namedValue = namedStyle?.style?.[property];
          if (namedValue != null && namedValue !== "") block.style[property] = namedValue;
          else block.style.removeProperty(cssName);
        };
        if (fields.has("leftIndent")) {
          if (next.leftIndent) block.style.marginLeft = next.leftIndent + "in";
          else block.style.removeProperty("margin-left");
        }
        if (fields.has("firstLineIndent")) {
          if (next.firstLineIndent) block.style.textIndent = next.firstLineIndent + "in";
          else block.style.removeProperty("text-indent");
        }
        if (fields.has("rightIndent")) {
          if (next.rightIndent) block.style.marginRight = next.rightIndent + "in";
          else block.style.removeProperty("margin-right");
        }
        if (fields.has("lineSpacing")) {
          if (next.lineSpacing === "normal") restoreNamedStyle("lineHeight", "line-height");
          else block.style.lineHeight = next.lineSpacing;
        }
        if (fields.has("spaceBefore")) {
          if (next.spaceBefore) block.style.marginTop = next.spaceBefore + "pt";
          else restoreNamedStyle("marginTop", "margin-top");
        }
        if (fields.has("spaceAfter")) {
          if (next.spaceAfter) block.style.marginBottom = next.spaceAfter + "pt";
          else restoreNamedStyle("marginBottom", "margin-bottom");
        }
        if (fields.has("keepWithNext")) {
          if (next.keepWithNext) {
            block.setAttribute("data-allo-keep-with-next", "1");
            block.style.breakAfter = "avoid-page";
            block.style.pageBreakAfter = "avoid";
          } else {
            block.removeAttribute("data-allo-keep-with-next");
            block.style.removeProperty("break-after");
            block.style.removeProperty("page-break-after");
          }
        }
        if (fields.has("keepLinesTogether")) {
          if (next.keepLinesTogether) {
            block.setAttribute("data-allo-keep-lines", "1");
            block.style.breakInside = "avoid";
            block.style.pageBreakInside = "avoid";
          } else {
            block.removeAttribute("data-allo-keep-lines");
            block.style.removeProperty("break-inside");
            block.style.removeProperty("page-break-inside");
          }
        }
        if (fields.has("widowOrphanControl")) {
          if (next.widowOrphanControl) {
            block.setAttribute("data-allo-widow-orphan", "1");
            block.style.widows = "3";
            block.style.orphans = "3";
          } else {
            block.removeAttribute("data-allo-widow-orphan");
            block.style.removeProperty("widows");
            block.style.removeProperty("orphans");
          }
        }
        if (fields.has("tabStops")) {
          if (next.tabStops.length) block.setAttribute("data-allo-tab-stops", JSON.stringify(next.tabStops));
          else block.removeAttribute("data-allo-tab-stops");
        }
        if (options.replace && _builderParagraphLayoutsEqual(next, { ..._BUILDER_PARAGRAPH_DEFAULTS, tabStops: [] })) block.removeAttribute("data-allo-paragraph-layout");
        else block.setAttribute("data-allo-paragraph-layout", "1");
        if (!block.getAttribute("style")) block.removeAttribute("style");
        if (trackingParagraph && beforeRevision) {
          _builderRecordElementRevision(block, beforeRevision, "paragraph", paragraphChangeLabel, {
            kind: "block-format",
            attributeMode: "presentation"
          });
        }
      });
      const nextUi = _normalizeBuilderParagraphLayout(options.replace ? { ..._BUILDER_PARAGRAPH_DEFAULTS, ...patch } : { ...paragraphLayout, ...patch }, contentWidth);
      setParagraphLayout(nextUi);
      doc.body.setAttribute("data-allo-user-edited", "1");
      doc.body.dispatchEvent(new win.Event("input", { bubbles: true, inputType: "formatParagraph" }));
      refreshFormattingState();
      refreshDocumentStats();
      refreshTrackedChanges();
      refreshPageMetrics();
      if (options.restoreFocus !== false) win.focus();
      if (typeof options.announce === "string" && addToast) addToast(options.announce, "success");
      return true;
    } catch (_) {
      if (options.announce !== false && addToast) addToast("The paragraph layout could not be updated.", "error");
      return false;
    }
  }, [exportPreviewRef, pageSetup, paragraphLayout, resumeTrackedEditingView, restoreEditorSelection, refreshFormattingState, refreshDocumentStats, refreshTrackedChanges, refreshPageMetrics, builderStyleGallery, addToast]);
  const nudgeParagraphIndent = React.useCallback((delta) => {
    applyParagraphLayout({ leftIndent: paragraphLayout.leftIndent + Number(delta || 0) }, { restoreFocus: true, announce: false });
  }, [applyParagraphLayout, paragraphLayout.leftIndent]);
  const resetParagraphLayout = React.useCallback(() => {
    applyParagraphLayout({ ..._BUILDER_PARAGRAPH_DEFAULTS, tabStops: [] }, { replace: true, restoreFocus: true, announce: "Paragraph layout reset." });
  }, [applyParagraphLayout]);
  const addRulerTabStop = React.useCallback((position, alignment = rulerTabAlignment, restoreFocus = false) => {
    const rounded = Math.round(Math.max(0.125, Math.min(paragraphContentWidth - 0.125, Number(position) || 0.5)) * 8) / 8;
    const existing = paragraphLayout.tabStops.find((tab) => Math.abs(tab.position - rounded) <= 0.06);
    const tabs = paragraphLayout.tabStops.filter((tab) => Math.abs(tab.position - rounded) > 0.06);
    tabs.push({ id: existing?.id || `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, position: rounded, alignment });
    return applyParagraphLayout({ tabStops: tabs }, { restoreFocus, announce: false });
  }, [applyParagraphLayout, paragraphContentWidth, paragraphLayout.tabStops, rulerTabAlignment]);
  const addNextRulerTabStop = React.useCallback(() => {
    const maximum = paragraphContentWidth - 0.125;
    const occupied = new Set(paragraphLayout.tabStops.map((tab) => tab.position.toFixed(3)));
    const candidates = [];
    for (let position = 0.5; position <= maximum + 1e-3; position += 0.5) candidates.push(Math.round(position * 8) / 8);
    const next = candidates.find((position) => position > paragraphLayout.leftIndent + 0.05 && !occupied.has(position.toFixed(3))) ?? candidates.find((position) => !occupied.has(position.toFixed(3)));
    if (next == null) {
      addToast && addToast("The ruler already has the maximum number of practical tab stops.", "info");
      return;
    }
    if (addRulerTabStop(next, rulerTabAlignment, false)) addToast && addToast(`${rulerTabAlignment.charAt(0).toUpperCase() + rulerTabAlignment.slice(1)} tab added at ${next} inches.`, "success");
  }, [addRulerTabStop, addToast, paragraphContentWidth, paragraphLayout.leftIndent, paragraphLayout.tabStops, rulerTabAlignment]);
  const clearRulerTabStops = React.useCallback(() => {
    applyParagraphLayout({ tabStops: [] }, { restoreFocus: false, announce: "Tab stops cleared." });
  }, [applyParagraphLayout]);
  const removeRulerTabStop = React.useCallback((index) => {
    applyParagraphLayout({ tabStops: paragraphLayout.tabStops.filter((_, itemIndex) => itemIndex !== index) }, { restoreFocus: false, announce: false });
  }, [applyParagraphLayout, paragraphLayout.tabStops]);
  const paragraphLayoutAtRulerPosition = React.useCallback((kind, position, baseLayout = paragraphLayout) => {
    const positionInches = Math.max(0, Math.min(paragraphContentWidth, Number(position) || 0));
    if (kind === "first") return _normalizeBuilderParagraphLayout({ ...baseLayout, firstLineIndent: positionInches - baseLayout.leftIndent }, paragraphContentWidth);
    if (kind === "hanging") {
      const firstLineAbsolute = baseLayout.leftIndent + baseLayout.firstLineIndent;
      return _normalizeBuilderParagraphLayout({ ...baseLayout, leftIndent: positionInches, firstLineIndent: firstLineAbsolute - positionInches }, paragraphContentWidth);
    }
    if (kind === "left") return _normalizeBuilderParagraphLayout({ ...baseLayout, leftIndent: positionInches }, paragraphContentWidth);
    if (kind === "right") return _normalizeBuilderParagraphLayout({ ...baseLayout, rightIndent: paragraphContentWidth - positionInches }, paragraphContentWidth);
    return baseLayout;
  }, [paragraphContentWidth, paragraphLayout]);
  const applyRulerMarkerLayout = React.useCallback((kind, nextLayout, restoreFocus = false) => {
    const patch = kind === "first" ? { firstLineIndent: nextLayout.firstLineIndent } : kind === "hanging" ? { leftIndent: nextLayout.leftIndent, firstLineIndent: nextLayout.firstLineIndent } : kind === "left" ? { leftIndent: nextLayout.leftIndent } : { rightIndent: nextLayout.rightIndent };
    applyParagraphLayout(patch, { restoreFocus, announce: false });
  }, [applyParagraphLayout]);
  const startRulerMarkerDrag = React.useCallback((kind, event) => {
    const ruler = rulerRef.current;
    if (!ruler) return;
    event.preventDefault();
    event.stopPropagation();
    try {
      rulerDragCleanupRef.current?.();
    } catch (_) {
    }
    const baseLayout = paragraphLayout;
    let liveLayout = baseLayout;
    const update = (clientX) => {
      const rect = ruler.getBoundingClientRect();
      if (!rect.width) return;
      const position = (clientX - rect.left) / rect.width * paragraphContentWidth;
      liveLayout = paragraphLayoutAtRulerPosition(kind, position, baseLayout);
      setParagraphLayout(liveLayout);
    };
    const onMove = (moveEvent) => {
      moveEvent.preventDefault();
      update(moveEvent.clientX);
    };
    const cleanup = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      rulerDragCleanupRef.current = null;
    };
    const onUp = (upEvent) => {
      update(upEvent.clientX);
      cleanup();
      applyRulerMarkerLayout(kind, liveLayout, false);
    };
    rulerDragCleanupRef.current = cleanup;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    window.addEventListener("pointercancel", onUp, { once: true });
    update(event.clientX);
  }, [paragraphLayout, paragraphContentWidth, paragraphLayoutAtRulerPosition, applyRulerMarkerLayout]);
  const handleRulerMarkerKeyDown = React.useCallback((kind, event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const step = event.shiftKey ? 0.5 : 0.125;
    const current = kind === "first" ? paragraphLayout.leftIndent + paragraphLayout.firstLineIndent : kind === "right" ? paragraphContentWidth - paragraphLayout.rightIndent : paragraphLayout.leftIndent;
    const nextPosition = event.key === "Home" ? 0 : event.key === "End" ? paragraphContentWidth : current + (event.key === "ArrowLeft" ? -step : step);
    const nextLayout = paragraphLayoutAtRulerPosition(kind, nextPosition, paragraphLayout);
    setParagraphLayout(nextLayout);
    applyRulerMarkerLayout(kind, nextLayout, false);
  }, [paragraphLayout, paragraphContentWidth, paragraphLayoutAtRulerPosition, applyRulerMarkerLayout]);
  const handleRulerClick = React.useCallback((event) => {
    if (event.target?.closest?.("button,input,select")) return;
    const ruler = rulerRef.current;
    const rect = ruler?.getBoundingClientRect();
    if (!rect?.width) return;
    const position = (event.clientX - rect.left) / rect.width * paragraphContentWidth;
    addRulerTabStop(position, rulerTabAlignment, false);
  }, [addRulerTabStop, paragraphContentWidth, rulerTabAlignment]);
  const handleTabStopKeyDown = React.useCallback((tab, index, event) => {
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      removeRulerTabStop(index);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const alignments = ["left", "center", "right", "decimal"];
      const alignment = alignments[(alignments.indexOf(tab.alignment) + 1) % alignments.length];
      const tabs2 = paragraphLayout.tabStops.map((item, itemIndex) => itemIndex === index ? { ...item, alignment } : item);
      applyParagraphLayout({ tabStops: tabs2 }, { restoreFocus: false, announce: false });
      return;
    }
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const step = event.shiftKey ? 0.5 : 0.125;
    const nextPosition = tab.position + (event.key === "ArrowLeft" ? -step : step);
    const tabs = paragraphLayout.tabStops.filter((_, itemIndex) => itemIndex !== index);
    tabs.push({ ...tab, position: nextPosition });
    applyParagraphLayout({ tabStops: tabs }, { restoreFocus: false, announce: false });
  }, [applyParagraphLayout, paragraphLayout.tabStops, removeRulerTabStop]);
  const startTabStopDrag = React.useCallback((tab, index, event) => {
    const ruler = rulerRef.current;
    if (!ruler) return;
    event.preventDefault();
    event.stopPropagation();
    try {
      rulerDragCleanupRef.current?.();
    } catch (_) {
    }
    const remaining = paragraphLayout.tabStops.filter((_, itemIndex) => itemIndex !== index);
    let liveTabs = paragraphLayout.tabStops;
    const update = (clientX) => {
      const rect = ruler.getBoundingClientRect();
      if (!rect.width) return;
      const position = Math.round(Math.max(0.125, Math.min(paragraphContentWidth - 0.125, (clientX - rect.left) / rect.width * paragraphContentWidth)) * 8) / 8;
      liveTabs = [...remaining, { ...tab, position }].sort((a, b) => a.position - b.position);
      setParagraphLayout((layout) => ({ ...layout, tabStops: liveTabs }));
    };
    const onMove = (moveEvent) => {
      moveEvent.preventDefault();
      update(moveEvent.clientX);
    };
    const cleanup = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      rulerDragCleanupRef.current = null;
    };
    const onUp = (upEvent) => {
      update(upEvent.clientX);
      cleanup();
      applyParagraphLayout({ tabStops: liveTabs }, { restoreFocus: false, announce: false });
    };
    rulerDragCleanupRef.current = cleanup;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    window.addEventListener("pointercancel", onUp, { once: true });
    update(event.clientX);
  }, [paragraphLayout.tabStops, paragraphContentWidth, applyParagraphLayout]);
  const insertParagraphTab = React.useCallback(() => {
    const doc = exportPreviewRef.current?.contentDocument;
    if (!doc) return;
    restoreEditorSelection();
    const stop = _builderInsertParagraphTab(doc, editorZoom, paragraphContentWidth);
    if (!stop) {
      addToast && addToast("Place the caret inside a paragraph first.", "info");
      return;
    }
    exportPreviewRef.current?.contentWindow?.focus();
    refreshDocumentStats();
    refreshPageMetrics();
  }, [exportPreviewRef, editorZoom, paragraphContentWidth, restoreEditorSelection, refreshDocumentStats, refreshPageMetrics, addToast]);
  const applyParagraphSpacing = React.useCallback((spacing) => {
    const values = { normal: 0, compact: 4, relaxed: 12, double: 24 };
    const nextSpacing = Object.prototype.hasOwnProperty.call(values, spacing) ? spacing : "normal";
    applyParagraphLayout({ spaceAfter: values[nextSpacing] }, { restoreFocus: false, announce: false });
  }, [applyParagraphLayout]);
  const jumpToHeading = React.useCallback((heading) => {
    const doc = exportPreviewRef.current?.contentDocument;
    const node = heading?.node;
    if (!doc || !node?.isConnected) return;
    node.scrollIntoView({ behavior: window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    const range = doc.createRange();
    range.selectNodeContents(node);
    range.collapse(false);
    const selection = doc.defaultView?.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    setActiveHeadingIndex(heading.index);
    exportPreviewRef.current?.focus();
    refreshFormattingState();
  }, [exportPreviewRef, refreshFormattingState]);
  const findLiveReviewMarker = React.useCallback((commentId) => {
    const doc = exportPreviewRef.current?.contentDocument;
    if (!doc?.querySelectorAll || !commentId) return null;
    return Array.from(doc.querySelectorAll(_BUILDER_COMMENT_SELECTOR)).find((marker) => marker.getAttribute("data-allo-comment-id") === commentId) || null;
  }, [exportPreviewRef]);
  const commitReviewCommentMutation = React.useCallback((message, tone = "success", dispatchInput = true) => {
    const doc = exportPreviewRef.current?.contentDocument;
    if (doc?.body) {
      doc.body.setAttribute("data-allo-user-edited", "1");
      if (dispatchInput) {
        try {
          doc.body.dispatchEvent(new doc.defaultView.Event("input", { bubbles: true }));
        } catch (_) {
        }
      }
    }
    refreshReviewComments();
    refreshDocumentStats();
    refreshPageMetrics();
    refreshSelectionStatistics();
    if (message) addToast && addToast(message, tone);
  }, [exportPreviewRef, refreshReviewComments, refreshDocumentStats, refreshPageMetrics, refreshSelectionStatistics, addToast]);
  const jumpToReviewComment = React.useCallback((commentId) => {
    const marker = findLiveReviewMarker(commentId);
    const doc = exportPreviewRef.current?.contentDocument;
    if (!marker || !doc) {
      refreshReviewComments();
      addToast && addToast("That comment is no longer in the document.", "info");
      return;
    }
    try {
      const range = doc.createRange();
      range.selectNodeContents(marker);
      const selection = doc.defaultView?.getSelection?.();
      selection?.removeAllRanges();
      selection?.addRange(range);
      editorSelectionRangeRef.current = range.cloneRange();
      marker.scrollIntoView({ behavior: window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
      setActiveCommentId(commentId);
      openReviewComments(commentId);
      exportPreviewRef.current?.focus();
      refreshFormattingState();
      refreshSelectionStatistics();
    } catch (_) {
      addToast && addToast("Could not move to that comment.", "error");
    }
  }, [findLiveReviewMarker, exportPreviewRef, refreshReviewComments, openReviewComments, refreshFormattingState, refreshSelectionStatistics, addToast]);
  const addReviewComment = React.useCallback(async () => {
    const doc = exportPreviewRef.current?.contentDocument;
    if (!doc?.body) {
      addToast && addToast("The editable document is not ready yet.", "info");
      return;
    }
    let savedRange = null;
    try {
      const selection = doc.getSelection?.();
      if (selection?.rangeCount && !selection.isCollapsed) savedRange = selection.getRangeAt(0).cloneRange();
      else if (editorSelectionRangeRef.current && !editorSelectionRangeRef.current.collapsed) savedRange = editorSelectionRangeRef.current.cloneRange();
    } catch (_) {
    }
    if (!savedRange || savedRange.collapsed) {
      addToast && addToast("Select the text you want to comment on, then choose New Comment.", "info");
      exportPreviewRef.current?.focus();
      return;
    }
    editorSelectionRangeRef.current = savedRange.cloneRange();
    const commentText = await promptForBuilderText("Write a comment about the selected text.", "", {
      title: "New comment",
      confirmText: "Add comment",
      multiline: true,
      maxLength: 1200,
      validate: (value) => _builderNormalizeCommentMessage(value) ? null : "Write a comment first."
    });
    if (commentText == null) return;
    const result = _builderInsertReviewComment(doc, savedRange, commentText, reviewerName);
    if (!result.ok) {
      addToast && addToast(result.error || "The comment could not be added.", "error");
      exportPreviewRef.current?.focus();
      return;
    }
    try {
      const selection = doc.getSelection?.();
      if (selection?.rangeCount) editorSelectionRangeRef.current = selection.getRangeAt(0).cloneRange();
    } catch (_) {
    }
    setActiveCommentId(result.id);
    openReviewComments(result.id);
    commitReviewCommentMutation("Comment added.", "success", false);
  }, [exportPreviewRef, promptForBuilderText, openReviewComments, commitReviewCommentMutation, reviewerName, addToast]);
  const replyReviewComment = React.useCallback((commentId) => {
    const marker = findLiveReviewMarker(commentId);
    if (!marker) {
      refreshReviewComments();
      return;
    }
    if (_builderCommentThread(marker).length >= 20) {
      addToast && addToast("This comment thread has reached its 20-message limit.", "info");
      return;
    }
    setActiveCommentId(commentId);
    setReplyingCommentId((current) => current === commentId ? "" : commentId);
    setCommentReplyDraft("");
    openReviewComments(commentId);
    window.setTimeout(() => document.getElementById("builder-comment-reply-" + commentId)?.focus(), 0);
  }, [findLiveReviewMarker, refreshReviewComments, openReviewComments, addToast]);
  const submitReviewCommentReply = React.useCallback((commentId) => {
    const marker = findLiveReviewMarker(commentId);
    const reply = _builderNormalizeCommentMessage(commentReplyDraft);
    if (!marker || !reply) {
      if (!marker) refreshReviewComments();
      else addToast && addToast("Write a reply first.", "info");
      return;
    }
    const thread = _builderCommentThread(marker);
    if (thread.length >= 20) {
      addToast && addToast("This comment thread has reached its 20-message limit.", "info");
      return;
    }
    const at = (/* @__PURE__ */ new Date()).toISOString();
    _builderSetCommentThread(marker, [...thread, { id: `message-${Date.now().toString(36)}`, text: reply, at, author: _builderNormalizeReviewerName(reviewerName, "You") }]);
    marker.setAttribute("data-allo-comment-resolved", "0");
    _builderSetCommentThread(marker, _builderCommentThread(marker));
    setShowResolvedComments(false);
    setActiveCommentId(commentId);
    setReplyingCommentId("");
    setCommentReplyDraft("");
    commitReviewCommentMutation("Reply added and comment reopened.");
  }, [findLiveReviewMarker, refreshReviewComments, commentReplyDraft, reviewerName, commitReviewCommentMutation, addToast]);
  const editReviewComment = React.useCallback(async (commentId) => {
    const marker = findLiveReviewMarker(commentId);
    if (!marker) {
      refreshReviewComments();
      return;
    }
    const thread = _builderCommentThread(marker);
    const firstMessage = thread[0];
    if (!firstMessage) return;
    const updatedText = await promptForBuilderText("Edit the first message in this comment thread.", firstMessage.text, {
      title: "Edit comment",
      confirmText: "Save comment",
      multiline: true,
      maxLength: 1200,
      validate: (value) => _builderNormalizeCommentMessage(value) ? null : "Write a comment first."
    });
    if (updatedText == null) return;
    _builderSetCommentThread(marker, [{ ...firstMessage, text: updatedText }, ...thread.slice(1)]);
    setActiveCommentId(commentId);
    commitReviewCommentMutation("Comment updated.");
  }, [findLiveReviewMarker, refreshReviewComments, promptForBuilderText, commitReviewCommentMutation]);
  const toggleReviewCommentResolved = React.useCallback((commentId) => {
    const marker = findLiveReviewMarker(commentId);
    if (!marker) {
      refreshReviewComments();
      return;
    }
    const resolved = marker.getAttribute("data-allo-comment-resolved") === "1";
    marker.setAttribute("data-allo-comment-resolved", resolved ? "0" : "1");
    if (!resolved && replyingCommentId === commentId) {
      setReplyingCommentId("");
      setCommentReplyDraft("");
    }
    _builderSetCommentThread(marker, _builderCommentThread(marker));
    setActiveCommentId(commentId);
    commitReviewCommentMutation(resolved ? "Comment reopened." : "Comment resolved.");
  }, [findLiveReviewMarker, refreshReviewComments, replyingCommentId, commitReviewCommentMutation]);
  const deleteReviewComment = React.useCallback(async (commentId) => {
    const marker = findLiveReviewMarker(commentId);
    if (!marker) {
      refreshReviewComments();
      return;
    }
    const confirmCommentDelete = window.AlloFlowUX?.confirm;
    if (typeof confirmCommentDelete !== "function") {
      addToast && addToast("The confirmation dialog is still loading. Please try again.", "info");
      return;
    }
    let confirmed = false;
    try {
      confirmed = await Promise.resolve(confirmCommentDelete.call(window.AlloFlowUX, "Delete this comment thread? The selected document text will be kept.", {
        title: "Delete comment?",
        detail: "This removes the discussion only. It does not delete the commented text.",
        confirmText: "Delete comment",
        cancelText: "Keep comment",
        tone: "danger"
      })).then(Boolean, () => false);
    } catch (_) {
    }
    if (!confirmed || !marker.isConnected) return;
    marker.replaceWith(...Array.from(marker.childNodes));
    setActiveCommentId("");
    commitReviewCommentMutation("Comment deleted.", "success");
  }, [findLiveReviewMarker, refreshReviewComments, commitReviewCommentMutation, addToast]);
  React.useEffect(() => {
    if (!showExportPreview) return void 0;
    const onNewComment = () => addReviewComment();
    const onActivateComment = (event) => {
      const commentId = String(event?.detail?.id || "");
      if (commentId) openReviewComments(commentId);
    };
    const onCommentShortcut = (event) => {
      const target = event.target;
      const tag = String(target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable) return;
      if ((event.ctrlKey || event.metaKey) && event.altKey && !event.shiftKey && (event.key === "m" || event.key === "M")) {
        event.preventDefault();
        addReviewComment();
      }
    };
    document.addEventListener("alloflow-builder-new-comment", onNewComment);
    document.addEventListener("alloflow-builder-activate-comment", onActivateComment);
    document.addEventListener("keydown", onCommentShortcut);
    return () => {
      document.removeEventListener("alloflow-builder-new-comment", onNewComment);
      document.removeEventListener("alloflow-builder-activate-comment", onActivateComment);
      document.removeEventListener("keydown", onCommentShortcut);
    };
  }, [showExportPreview, addReviewComment, openReviewComments]);
  const findLiveTrackedChange = React.useCallback((changeId) => {
    const doc = exportPreviewRef.current?.contentDocument;
    if (!doc?.querySelectorAll || !changeId) return null;
    return Array.from(doc.querySelectorAll(_BUILDER_CHANGE_SELECTOR)).find((marker) => marker.getAttribute("data-allo-change-id") === changeId) || null;
  }, [exportPreviewRef]);
  const commitTrackedChangeMutation = React.useCallback((message, tone = "success", dispatchInput = true) => {
    const doc = exportPreviewRef.current?.contentDocument;
    if (doc?.body) {
      doc.body.setAttribute("data-allo-user-edited", "1");
      if (dispatchInput) _builderDispatchTrackedInput(doc, "reviewTrackedChange");
    }
    refreshTrackedChanges();
    refreshDocumentStats();
    refreshPageMetrics();
    refreshSelectionStatistics();
    setFindDocumentRevision((value) => value + 1);
    if (message) addToast && addToast(message, tone);
  }, [exportPreviewRef, refreshTrackedChanges, refreshDocumentStats, refreshPageMetrics, refreshSelectionStatistics, addToast]);
  const insertOrRefreshTableOfContents = React.useCallback(() => {
    const doc = exportPreviewRef.current?.contentDocument;
    if (!doc?.body) {
      addToast && addToast("The editable document is not ready yet.", "info");
      return;
    }
    resumeTrackedEditingView(true);
    restoreEditorSelection();
    const result = _builderInsertTableOfContents(doc, { maxLevel: tocDepth });
    if (!result.ok) {
      addToast && addToast(result.error || "The table of contents could not be updated.", "error");
      return;
    }
    const changeId = (result.marker || result.nav)?.getAttribute?.("data-allo-change-id") || "";
    if (changeId) setActiveTrackedChangeId(changeId);
    setActiveRibbonTab("insert");
    setRibbonCollapsed(false);
    setNavigationPaneTab("headings");
    setShowNavigationPane(true);
    commitTrackedChangeMutation((result.existing ? "Table of contents refreshed with " : "Automatic table of contents inserted with ") + result.count + " heading" + (result.count === 1 ? "." : "s."));
    exportPreviewRef.current?.focus();
  }, [exportPreviewRef, resumeTrackedEditingView, restoreEditorSelection, tocDepth, commitTrackedChangeMutation, addToast]);
  const moveOutlineSection = React.useCallback((headingIndex, targetIndex) => {
    if (headingIndex == null || targetIndex == null || Number(headingIndex) === Number(targetIndex)) {
      setDraggedHeadingIndex(null);
      return;
    }
    const doc = exportPreviewRef.current?.contentDocument;
    if (!doc?.body) {
      setDraggedHeadingIndex(null);
      addToast && addToast("The editable document is not ready yet.", "info");
      return;
    }
    resumeTrackedEditingView(true);
    const result = _builderMoveHeadingSection(doc, headingIndex, targetIndex);
    setDraggedHeadingIndex(null);
    if (!result.ok) {
      addToast && addToast(result.error || "That document section could not be moved.", "info");
      return;
    }
    const changeId = result.marker?.getAttribute?.("data-allo-change-id") || "";
    if (changeId) setActiveTrackedChangeId(changeId);
    setNavigationPaneTab("headings");
    setShowNavigationPane(true);
    commitTrackedChangeMutation("Moved \u201C" + result.moved + "\u201D with its section content" + (result.tracked ? " as a tracked change." : "."));
    exportPreviewRef.current?.focus();
  }, [exportPreviewRef, resumeTrackedEditingView, commitTrackedChangeMutation, addToast]);
  const openDocumentReferences = React.useCallback(() => {
    setActiveRibbonTab("insert");
    setRibbonCollapsed(false);
    setNavigationPaneTab("references");
    setShowNavigationPane(true);
  }, []);
  const captureDocumentReferenceRange = React.useCallback(() => {
    const doc = exportPreviewRef.current?.contentDocument;
    const selection = doc?.getSelection?.();
    try {
      if (selection?.rangeCount) return selection.getRangeAt(0).cloneRange();
      const saved = editorSelectionRangeRef.current;
      if (saved?.cloneRange && saved.commonAncestorContainer?.ownerDocument === doc) return saved.cloneRange();
    } catch (_) {
    }
    return null;
  }, [exportPreviewRef]);
  const finishDocumentReferenceMutation = React.useCallback((result, message, activeKey = "") => {
    if (!result?.ok) {
      addToast && addToast(result?.error || "The document reference could not be updated.", "error");
      return false;
    }
    if (result.references) {
      setDocumentReferences(result.references);
      setCrossReferenceTarget((current) => result.references.bookmarks.some((entry) => entry.id === current) ? current : result.references.bookmarks[0]?.id || "");
      setCitationStyle(result.references.citationStyle || "apa");
      setCitationSourceTarget((current) => result.references.sources?.some((entry) => entry.id === current) ? current : result.references.sources?.[0]?.id || "");
      setBibliographyIncludeUncited(result.references.bibliography?.getAttribute?.("data-allo-bibliography-scope") === "all");
    }
    if (activeKey) setActiveDocumentReferenceKey(activeKey);
    const changeId = result.marker?.getAttribute?.("data-allo-change-id") || "";
    if (changeId) setActiveTrackedChangeId(changeId);
    openDocumentReferences();
    commitTrackedChangeMutation(message + (result.tracked ? " Recorded in Track Changes." : "."));
    exportPreviewRef.current?.focus();
    return true;
  }, [addToast, openDocumentReferences, commitTrackedChangeMutation, exportPreviewRef]);
  const resetCitationSourceDraft = React.useCallback(() => {
    citationDoiRunRef.current += 1;
    setCitationDoiBusy(false);
    setEditingCitationSourceId("");
    setCitationSourceDraft(_builderNormalizeCitationSource({ type: "webpage" }));
    setCitationSourceMode("manual");
    setCitationImportFormat("auto");
    setCitationImportText("");
    setCitationImportFeedback(null);
  }, []);
  const openCitationSourceManager = React.useCallback((source = null, mode = "manual") => {
    if (source?.id) {
      citationDoiRunRef.current += 1;
      setCitationDoiBusy(false);
      setEditingCitationSourceId(source.id);
      setCitationSourceDraft(_builderNormalizeCitationSource(source));
      setCitationSourceMode("manual");
      setCitationImportFeedback(null);
    } else {
      resetCitationSourceDraft();
      setCitationSourceMode(mode === "import" ? "import" : "manual");
    }
    setShowSourceManager(true);
    openDocumentReferences();
  }, [openDocumentReferences, resetCitationSourceDraft]);
  const saveCitationSource = React.useCallback((event) => {
    event?.preventDefault?.();
    const doc = exportPreviewRef.current?.contentDocument;
    if (!doc?.body) {
      addToast && addToast("The editable document is not ready yet.", "info");
      return;
    }
    resumeTrackedEditingView(true);
    const payload = { ...citationSourceDraft, id: editingCitationSourceId || void 0 };
    const result = _builderUpsertCitationSource(doc, payload, citationStyle);
    const label = result.ok ? (editingCitationSourceId ? "Updated source ?" : "Added source ?") + (result.source.title || _builderCitationAuthorKey(result.source)) + "?" : "Source update failed";
    if (finishDocumentReferenceMutation(result, label, result.ok ? "source:" + result.source.id : "")) {
      setCitationSourceTarget(result.source.id);
      setShowSourceManager(false);
      resetCitationSourceDraft();
    }
  }, [exportPreviewRef, citationSourceDraft, editingCitationSourceId, citationStyle, resumeTrackedEditingView, finishDocumentReferenceMutation, resetCitationSourceDraft, addToast]);
  const lookupCitationDoi = React.useCallback(async () => {
    const doi = _builderCitationPlain(citationSourceDraft.doi, 300).replace(/^(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:\s*)/i, "");
    if (!doi) {
      setCitationImportFeedback({ tone: "error", message: "Enter a DOI before looking it up." });
      return;
    }
    if (typeof window.fetch !== "function") {
      setCitationImportFeedback({ tone: "error", message: "DOI lookup is unavailable in this environment. You can still enter the source manually." });
      return;
    }
    const runId = ++citationDoiRunRef.current;
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timeout = window.setTimeout(() => controller?.abort(), 12e3);
    setCitationDoiBusy(true);
    setCitationImportFeedback({ tone: "info", message: "Looking up DOI metadata?" });
    try {
      const response = await window.fetch("https://api.crossref.org/works/" + encodeURIComponent(doi), {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller?.signal
      });
      if (!response.ok) throw new Error(response.status === 404 ? "No Crossref record was found for that DOI." : "Crossref returned HTTP " + response.status + ".");
      const payload = await response.json();
      if (runId !== citationDoiRunRef.current) return;
      const lookedUp = _builderCitationSourceFromCrossref(payload?.message || {});
      if (!lookedUp.title && !lookedUp.authors.length && !lookedUp.corporateAuthor) throw new Error("The DOI record did not include usable title or author metadata.");
      setCitationSourceDraft((current) => _builderNormalizeCitationSource({
        ...lookedUp,
        id: current.id,
        type: lookedUp.type || current.type,
        authors: current.authors?.length ? current.authors : lookedUp.authors,
        corporateAuthor: current.corporateAuthor || lookedUp.corporateAuthor,
        title: current.title || lookedUp.title,
        containerTitle: current.containerTitle || lookedUp.containerTitle,
        publisher: current.publisher || lookedUp.publisher,
        year: current.year || lookedUp.year,
        volume: current.volume || lookedUp.volume,
        issue: current.issue || lookedUp.issue,
        pages: current.pages || lookedUp.pages,
        url: current.url || lookedUp.url,
        doi: lookedUp.doi || doi,
        accessed: current.accessed || lookedUp.accessed
      }));
      setCitationImportFeedback({ tone: "success", message: "Metadata loaded from Crossref. Existing values were kept." });
    } catch (error) {
      if (runId !== citationDoiRunRef.current) return;
      const timedOut = error?.name === "AbortError";
      setCitationImportFeedback({ tone: "error", message: timedOut ? "DOI lookup timed out. Check your connection or enter the source manually." : error?.message || "DOI lookup failed. You can still enter the source manually." });
    } finally {
      window.clearTimeout(timeout);
      if (runId === citationDoiRunRef.current) setCitationDoiBusy(false);
    }
  }, [citationSourceDraft.doi]);
  const importCitationSources = React.useCallback((event) => {
    event?.preventDefault?.();
    const parsed = _builderParseCitationImport(citationImportText, citationImportFormat);
    if (parsed.errors.length) {
      setCitationImportFeedback({ tone: "error", message: parsed.errors.join(" ") });
      return;
    }
    const doc = exportPreviewRef.current?.contentDocument;
    if (!doc?.body) {
      setCitationImportFeedback({ tone: "error", message: "The editable document is not ready yet." });
      return;
    }
    resumeTrackedEditingView(true);
    const result = _builderImportCitationSources(doc, parsed.sources, citationStyle);
    if (!result.ok) {
      setCitationImportFeedback({ tone: "error", message: result.error || "The sources could not be imported." });
      return;
    }
    const addedCount = result.added?.length || 0;
    const duplicateCount = result.duplicateCount || 0;
    const skippedCount = result.capacitySkipped || 0;
    const parts = [
      addedCount + " source" + (addedCount === 1 ? "" : "s") + " added",
      duplicateCount ? duplicateCount + " duplicate" + (duplicateCount === 1 ? "" : "s") + " skipped" : "",
      skippedCount ? skippedCount + " skipped because the 200-source limit was reached" : "",
      ...parsed.warnings || []
    ].filter(Boolean);
    setCitationImportFeedback({ tone: addedCount ? "success" : "info", message: parts.join(" ? ") + "." });
    if (!addedCount) return;
    if (result.references) {
      setDocumentReferences(result.references);
      setCitationStyle(result.references.citationStyle || "apa");
      setBibliographyIncludeUncited(result.references.bibliography?.getAttribute?.("data-allo-bibliography-scope") === "all");
    }
    const firstAdded = result.added[0];
    if (firstAdded) {
      setCitationSourceTarget(firstAdded.id);
      setActiveDocumentReferenceKey("source:" + firstAdded.id);
    }
    const changeId = result.marker?.getAttribute?.("data-allo-change-id") || "";
    if (changeId) setActiveTrackedChangeId(changeId);
    setCitationImportText("");
    commitTrackedChangeMutation("Imported " + addedCount + " citation source" + (addedCount === 1 ? "" : "s") + (result.tracked ? " with Track Changes." : "."), "success");
  }, [citationImportText, citationImportFormat, exportPreviewRef, citationStyle, resumeTrackedEditingView, commitTrackedChangeMutation]);
  const closeCitationEditor = React.useCallback((returnFocus = true) => {
    const opener = citationEditorOpenerRef.current;
    setEditingCitationId("");
    setCitationItemsDraft([]);
    setCitationEditorError("");
    citationEditorOpenerRef.current = null;
    if (returnFocus && opener?.isConnected && typeof opener.focus === "function") window.setTimeout(() => opener.focus(), 0);
  }, []);
  const openCitationEditor = React.useCallback((citationOrId, opener = null) => {
    const doc = exportPreviewRef.current?.contentDocument;
    const citationId = typeof citationOrId === "string" ? citationOrId : citationOrId?.id;
    const entry = _builderCitationEntries(doc).citations.find((item) => item.id === citationId);
    if (!entry?.node) {
      addToast && addToast("That citation is no longer available.", "info");
      return;
    }
    if (entry.node.matches(_BUILDER_CHANGE_SELECTOR) || entry.node.querySelector?.(_BUILDER_CHANGE_SELECTOR)) {
      addToast && addToast("Accept or reject the pending change on this citation before editing it again.", "info");
      return;
    }
    citationEditorOpenerRef.current = opener || entry.node;
    setEditingCitationId(entry.id);
    setCitationItemsDraft(entry.items.map((item) => ({ ...item })));
    setCitationEditorError(entry.broken ? "Replace any missing source before saving." : "");
    setActiveDocumentReferenceKey(entry.key);
    window.setTimeout(() => citationEditorRef.current?.focus(), 0);
  }, [exportPreviewRef, addToast]);
  const updateCitationItemDraft = React.useCallback((index, changes) => {
    setCitationItemsDraft((items) => items.map((item, itemIndex) => itemIndex === index ? _builderNormalizeCitationItem({ ...item, ...changes }) : item));
    setCitationEditorError("");
  }, []);
  const addCitationItemDraft = React.useCallback(() => {
    setCitationItemsDraft((items) => {
      if (items.length >= _BUILDER_CITATION_ITEM_LIMIT) return items;
      const used = new Set(items.map((item) => item.sourceId));
      const source = (documentReferences.sources || []).find((candidate) => !used.has(candidate.id));
      if (!source) return items;
      return [...items, _builderNormalizeCitationItem({ sourceId: source.id })];
    });
    setCitationEditorError("");
  }, [documentReferences.sources]);
  const moveCitationItemDraft = React.useCallback((index, direction) => {
    setCitationItemsDraft((items) => {
      const target = index + direction;
      if (target < 0 || target >= items.length) return items;
      const reordered = [...items];
      [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
      return reordered;
    });
  }, []);
  const removeCitationItemDraft = React.useCallback((index) => {
    setCitationItemsDraft((items) => items.filter((_, itemIndex) => itemIndex !== index));
    setCitationEditorError("");
  }, []);
  const saveCitationEdit = React.useCallback((event) => {
    event?.preventDefault?.();
    if (!citationItemsDraft.length) {
      setCitationEditorError("Keep at least one source in the citation.");
      return;
    }
    const doc = exportPreviewRef.current?.contentDocument;
    resumeTrackedEditingView(true);
    const result = _builderUpdateCitation(doc, editingCitationId, citationItemsDraft);
    if (!result.ok) {
      setCitationEditorError(result.error || "The citation could not be updated.");
      addToast && addToast(result.error || "The citation could not be updated.", "error");
      return;
    }
    const focusTarget = result.node;
    if (result.references) setDocumentReferences(result.references);
    setActiveDocumentReferenceKey("citation:" + result.id);
    const changeId = result.marker?.getAttribute?.("data-allo-change-id") || "";
    if (changeId) setActiveTrackedChangeId(changeId);
    closeCitationEditor(false);
    commitTrackedChangeMutation("Updated citation" + (result.tracked ? " with Track Changes." : "."), "success");
    window.setTimeout(() => focusTarget?.focus?.(), 0);
  }, [citationItemsDraft, editingCitationId, exportPreviewRef, resumeTrackedEditingView, closeCitationEditor, commitTrackedChangeMutation, addToast]);
  React.useEffect(() => {
    if (!editingCitationId) return void 0;
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      closeCitationEditor(true);
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [editingCitationId, closeCitationEditor]);
  const changeCitationStyle = React.useCallback((nextStyle) => {
    const doc = exportPreviewRef.current?.contentDocument;
    resumeTrackedEditingView(true);
    const result = _builderSetCitationStyle(doc, nextStyle);
    const label = _BUILDER_CITATION_STYLES.find((entry) => entry.id === result.style)?.label || String(nextStyle).toUpperCase();
    if (finishDocumentReferenceMutation(result, result.ok ? "Updated all citation fields to " + label : "Citation style update failed")) setCitationStyle(result.style);
  }, [exportPreviewRef, resumeTrackedEditingView, finishDocumentReferenceMutation]);
  const insertDocumentCitation = React.useCallback(() => {
    const doc = exportPreviewRef.current?.contentDocument;
    if (!citationSourceTarget) {
      addToast && addToast("Add or choose a source before inserting a citation.", "info");
      return;
    }
    resumeTrackedEditingView(true);
    const result = _builderInsertCitation(doc, citationSourceTarget, citationLocator, captureDocumentReferenceRange());
    if (finishDocumentReferenceMutation(result, result.ok ? "Inserted live citation" : "Citation insertion failed", result.ok ? "citation:" + result.id : "")) setCitationLocator("");
  }, [exportPreviewRef, citationSourceTarget, citationLocator, captureDocumentReferenceRange, resumeTrackedEditingView, finishDocumentReferenceMutation, addToast]);
  const insertOrRefreshDocumentBibliography = React.useCallback(() => {
    const doc = exportPreviewRef.current?.contentDocument;
    resumeTrackedEditingView(true);
    const result = _builderInsertOrRefreshBibliography(doc, { includeUncited: bibliographyIncludeUncited });
    finishDocumentReferenceMutation(result, result.ok ? result.existing ? "Bibliography updated" : "Bibliography inserted" : "Bibliography update failed", result.ok ? "bibliography" : "");
  }, [exportPreviewRef, bibliographyIncludeUncited, resumeTrackedEditingView, finishDocumentReferenceMutation]);
  const updateAllDocumentFields = React.useCallback(() => {
    const doc = exportPreviewRef.current?.contentDocument;
    if (!doc?.body) {
      addToast && addToast("The editable document is not ready yet.", "info");
      return;
    }
    _builderRefreshTableOfContents(doc);
    const references = _builderRefreshDocumentReferences(doc);
    setDocumentReferences(references);
    setCitationStyle(references.citationStyle || "apa");
    setCitationSourceTarget((current) => references.sources?.some((source) => source.id === current) ? current : references.sources?.[0]?.id || "");
    commitTrackedChangeMutation("Updated table of contents, cross-references, citations, footnotes, and bibliography fields.", "success", false);
  }, [exportPreviewRef, commitTrackedChangeMutation, addToast]);
  React.useEffect(() => {
    if (!showExportPreview) return void 0;
    const onEditCitation = (event) => openCitationEditor(event?.detail?.id || "");
    document.addEventListener("alloflow-builder-edit-citation", onEditCitation);
    return () => document.removeEventListener("alloflow-builder-edit-citation", onEditCitation);
  }, [showExportPreview, openCitationEditor]);
  React.useEffect(() => {
    if (!showExportPreview) return void 0;
    const onUpdateFields = () => updateAllDocumentFields();
    const onUpdateFieldsShortcut = (event) => {
      if (event.key !== "F9" || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      event.preventDefault();
      updateAllDocumentFields();
    };
    document.addEventListener("alloflow-builder-update-fields", onUpdateFields);
    document.addEventListener("keydown", onUpdateFieldsShortcut);
    return () => {
      document.removeEventListener("alloflow-builder-update-fields", onUpdateFields);
      document.removeEventListener("keydown", onUpdateFieldsShortcut);
    };
  }, [showExportPreview, updateAllDocumentFields]);
  const insertDocumentFootnote = React.useCallback(async () => {
    const doc = exportPreviewRef.current?.contentDocument;
    if (!doc?.body) {
      addToast && addToast("The editable document is not ready yet.", "info");
      return;
    }
    const savedRange = captureDocumentReferenceRange();
    const noteText = await promptForBuilderText("Write the footnote text. It will appear in a numbered footnotes section at the end of the document.", "", {
      title: "Insert footnote",
      confirmText: "Insert footnote",
      cancelText: "Cancel",
      placeholder: "Footnote text",
      multiline: true,
      maxLength: 2e3,
      validate: (value) => value.trim() ? null : "Write the footnote text first."
    });
    if (noteText == null) return;
    resumeTrackedEditingView(true);
    const result = _builderInsertFootnote(doc, noteText, savedRange);
    finishDocumentReferenceMutation(result, result.ok ? "Inserted footnote " + result.number : "Footnote insertion failed", result.ok ? "footnote:" + result.id : "");
  }, [exportPreviewRef, captureDocumentReferenceRange, promptForBuilderText, resumeTrackedEditingView, finishDocumentReferenceMutation, addToast]);
  const insertDocumentBookmark = React.useCallback(async () => {
    const doc = exportPreviewRef.current?.contentDocument;
    if (!doc?.body) {
      addToast && addToast("The editable document is not ready yet.", "info");
      return;
    }
    const savedRange = captureDocumentReferenceRange();
    let selectedText = "";
    try {
      selectedText = String(doc.getSelection?.()?.toString() || "").replace(/\s+/g, " ").trim().slice(0, 60);
    } catch (_) {
    }
    const name = await promptForBuilderText("Name this bookmark. Cross-references can use either this name or the bookmarked text.", selectedText, {
      title: "Insert bookmark",
      confirmText: "Add bookmark",
      cancelText: "Cancel",
      placeholder: "Bookmark name",
      maxLength: 80,
      validate: (value) => value.trim() ? null : "Enter a bookmark name."
    });
    if (name == null) return;
    resumeTrackedEditingView(true);
    const result = _builderInsertBookmark(doc, name, savedRange);
    finishDocumentReferenceMutation(result, result.ok ? "Added bookmark \u201C" + result.name + "\u201D" : "Bookmark insertion failed", result.ok ? "bookmark:" + result.id : "");
  }, [exportPreviewRef, captureDocumentReferenceRange, promptForBuilderText, resumeTrackedEditingView, finishDocumentReferenceMutation, addToast]);
  const insertDocumentCrossReference = React.useCallback(() => {
    const doc = exportPreviewRef.current?.contentDocument;
    if (!crossReferenceTarget) {
      addToast && addToast("Add or choose a bookmark before inserting a cross-reference.", "info");
      return;
    }
    resumeTrackedEditingView(true);
    const result = _builderInsertCrossReference(doc, crossReferenceTarget, crossReferenceLabelMode, captureDocumentReferenceRange());
    finishDocumentReferenceMutation(result, result.ok ? "Inserted live cross-reference" : "Cross-reference insertion failed", result.ok ? "cross-reference:" + result.id : "");
  }, [exportPreviewRef, crossReferenceTarget, crossReferenceLabelMode, captureDocumentReferenceRange, resumeTrackedEditingView, finishDocumentReferenceMutation, addToast]);
  const jumpToDocumentReference = React.useCallback((entry) => {
    const doc = exportPreviewRef.current?.contentDocument;
    const node = entry?.node;
    if (!doc || !node?.isConnected) {
      refreshDocumentStats();
      addToast && addToast("That reference is no longer in the document.", "info");
      return;
    }
    try {
      node.scrollIntoView({ behavior: window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
      const range = doc.createRange();
      if (node.childNodes.length) range.selectNodeContents(node);
      else range.selectNode(node);
      _builderSetTrackedSelection(doc, range);
      editorSelectionRangeRef.current = range.cloneRange();
      setActiveDocumentReferenceKey(entry.key || "");
      openDocumentReferences();
      exportPreviewRef.current?.focus();
    } catch (_) {
      addToast && addToast("Could not move to that reference.", "error");
    }
  }, [exportPreviewRef, refreshDocumentStats, openDocumentReferences, addToast]);
  const confirmDocumentReferenceRemoval = React.useCallback(async (message, detail, confirmText) => {
    const confirmReference = window.AlloFlowUX?.confirm;
    if (typeof confirmReference !== "function") {
      addToast && addToast("The confirmation dialog is still loading. Please try again.", "info");
      return false;
    }
    try {
      return await Promise.resolve(confirmReference.call(window.AlloFlowUX, message, {
        title: confirmText + "?",
        detail,
        confirmText,
        cancelText: "Keep reference",
        tone: "danger"
      })).then(Boolean, () => false);
    } catch (_) {
      return false;
    }
  }, [addToast]);
  const removeDocumentCitation = React.useCallback(async (entry) => {
    if (!entry?.id) return;
    const confirmed = await confirmDocumentReferenceRemoval("Remove this citation?", "Only this inline citation field will be removed. The reusable source remains available.", "Remove citation");
    if (!confirmed) return;
    const result = _builderRemoveCitation(exportPreviewRef.current?.contentDocument, entry.id);
    finishDocumentReferenceMutation(result, result.ok ? "Removed citation" : "Citation removal failed");
  }, [confirmDocumentReferenceRemoval, exportPreviewRef, finishDocumentReferenceMutation]);
  const removeCitationSource = React.useCallback(async (source) => {
    if (!source?.id) return;
    const confirmed = await confirmDocumentReferenceRemoval("Delete source \u201C" + (source.title || _builderCitationAuthorKey(source)) + "\u201D?", "Only unused sources can be deleted. Citation fields must be removed first.", "Delete source");
    if (!confirmed) return;
    const result = _builderRemoveCitationSource(exportPreviewRef.current?.contentDocument, source.id);
    finishDocumentReferenceMutation(result, result.ok ? "Deleted source \u201C" + (source.title || _builderCitationAuthorKey(source)) + "\u201D" : "Source deletion failed");
  }, [confirmDocumentReferenceRemoval, exportPreviewRef, finishDocumentReferenceMutation]);
  const removeDocumentBookmark = React.useCallback(async (entry) => {
    if (!entry?.id) return;
    const confirmed = await confirmDocumentReferenceRemoval("Remove bookmark \u201C" + entry.name + "\u201D?", "Bookmarked text will be kept. Any links to this bookmark will be flagged as broken until retargeted or removed.", "Remove bookmark");
    if (!confirmed) return;
    const result = _builderRemoveBookmark(exportPreviewRef.current?.contentDocument, entry.id);
    finishDocumentReferenceMutation(result, result.ok ? "Removed bookmark \u201C" + entry.name + "\u201D" : "Bookmark removal failed");
  }, [confirmDocumentReferenceRemoval, exportPreviewRef, finishDocumentReferenceMutation]);
  const removeDocumentCrossReference = React.useCallback(async (entry) => {
    if (!entry?.id) return;
    const confirmed = await confirmDocumentReferenceRemoval("Remove this cross-reference?", "Only the inserted reference link will be removed. Its bookmark target will be kept.", "Remove cross-reference");
    if (!confirmed) return;
    const result = _builderRemoveCrossReference(exportPreviewRef.current?.contentDocument, entry.id);
    finishDocumentReferenceMutation(result, result.ok ? "Removed cross-reference" : "Cross-reference removal failed");
  }, [confirmDocumentReferenceRemoval, exportPreviewRef, finishDocumentReferenceMutation]);
  const removeDocumentFootnote = React.useCallback(async (entry) => {
    if (!entry?.id) return;
    const confirmed = await confirmDocumentReferenceRemoval("Remove footnote " + (entry.number || "") + "?", "The in-text reference and its matching note will be removed together.", "Remove footnote");
    if (!confirmed) return;
    const result = _builderRemoveFootnote(exportPreviewRef.current?.contentDocument, entry.id);
    finishDocumentReferenceMutation(result, result.ok ? "Removed footnote" : "Footnote removal failed");
  }, [confirmDocumentReferenceRemoval, exportPreviewRef, finishDocumentReferenceMutation]);
  React.useEffect(() => {
    if (!showExportPreview) return void 0;
    const onInsertFootnote = () => insertDocumentFootnote();
    document.addEventListener("alloflow-builder-insert-footnote", onInsertFootnote);
    return () => document.removeEventListener("alloflow-builder-insert-footnote", onInsertFootnote);
  }, [showExportPreview, insertDocumentFootnote]);
  const toggleTrackChanges = React.useCallback((nextValue) => {
    const doc = exportPreviewRef.current?.contentDocument;
    if (!doc?.body) {
      addToast && addToast("The editable document is not ready yet.", "info");
      return;
    }
    const enabled = typeof nextValue === "boolean" ? nextValue : doc.body.getAttribute("data-allo-track-changes") !== "1";
    if (enabled) doc.body.setAttribute("data-allo-track-changes", "1");
    else doc.body.removeAttribute("data-allo-track-changes");
    setTrackChangesEnabled(enabled);
    setActiveRibbonTab("review");
    setRibbonCollapsed(false);
    _builderDispatchTrackedInput(doc, "toggleTrackChanges");
    addToast && addToast(enabled ? "Track Changes is on. Text, formatting, paragraph layout, lists, tables, breaks, and reference changes will be marked." : "Track Changes is off. Existing revisions remain available for review.", "info");
    exportPreviewRef.current?.focus();
  }, [exportPreviewRef, addToast]);
  const filterTrackedChangeSet = React.useCallback((changes) => {
    const cutoff = trackedChangeDateFilter === "today" ? Date.now() - 864e5 : trackedChangeDateFilter === "week" ? Date.now() - 6048e5 : 0;
    return (Array.isArray(changes) ? changes : []).filter((change) => {
      const typeMatch = trackedChangeTypeFilter === "all" || trackedChangeTypeFilter === "text" && (change.type === "insert" || change.type === "delete") || change.type === trackedChangeTypeFilter || change.scopes?.includes(trackedChangeTypeFilter);
      const authorMatch = trackedChangeAuthorFilter === "all" || change.author === trackedChangeAuthorFilter;
      const parsedAt = Date.parse(change.at || "");
      return typeMatch && authorMatch && (!cutoff || !Number.isNaN(parsedAt) && parsedAt >= cutoff);
    });
  }, [trackedChangeTypeFilter, trackedChangeAuthorFilter, trackedChangeDateFilter]);
  const jumpToTrackedChange = React.useCallback((changeId) => {
    const marker = findLiveTrackedChange(changeId);
    const doc = exportPreviewRef.current?.contentDocument;
    if (!marker || !doc) {
      refreshTrackedChanges();
      addToast && addToast("That revision is no longer in the document.", "info");
      return;
    }
    try {
      _builderSetTrackedMarkupView(doc, "all");
      setTrackedMarkupView("all");
      const liveMarker = findLiveTrackedChange(changeId) || marker;
      const range = doc.createRange();
      range.selectNodeContents(liveMarker);
      _builderSetTrackedSelection(doc, range);
      editorSelectionRangeRef.current = range.cloneRange();
      liveMarker.scrollIntoView({ behavior: window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
      setActiveTrackedChangeId(changeId);
      openTrackedChanges(changeId);
      exportPreviewRef.current?.focus();
      refreshFormattingState();
      refreshSelectionStatistics();
    } catch (_) {
      addToast && addToast("Could not move to that revision.", "error");
    }
  }, [findLiveTrackedChange, exportPreviewRef, refreshTrackedChanges, openTrackedChanges, refreshFormattingState, refreshSelectionStatistics, addToast]);
  const navigateTrackedChange = React.useCallback((direction = 1) => {
    const changes = filterTrackedChangeSet(_builderTrackedChangeEntries(exportPreviewRef.current?.contentDocument));
    if (!changes.length) {
      addToast && addToast("There are no changes matching the current filters.", "info");
      return;
    }
    const currentIndex = Math.max(0, changes.findIndex((change) => change.id === activeTrackedChangeId));
    const nextIndex = (currentIndex + (direction < 0 ? -1 : 1) + changes.length) % changes.length;
    jumpToTrackedChange(changes[nextIndex].id);
  }, [exportPreviewRef, activeTrackedChangeId, filterTrackedChangeSet, jumpToTrackedChange, addToast]);
  const applyTrackedChangeDecision = React.useCallback((changeId, decision) => {
    const doc = exportPreviewRef.current?.contentDocument;
    let marker = findLiveTrackedChange(changeId);
    if (!marker || !doc) {
      refreshTrackedChanges();
      return;
    }
    const priorView = trackedMarkupView;
    _builderSetTrackedMarkupView(doc, "all");
    marker = findLiveTrackedChange(changeId);
    if (!marker) {
      refreshTrackedChanges();
      return;
    }
    const changes = filterTrackedChangeSet(_builderTrackedChangeEntries(doc));
    const currentIndex = Math.max(0, changes.findIndex((change) => change.id === changeId));
    const nextId = changes[currentIndex + 1]?.id || changes[currentIndex - 1]?.id || "";
    const entry = changes.find((change) => change.id === changeId) || _builderTrackedChangeEntries(doc).find((change) => change.id === changeId);
    if (!_builderApplyTrackedChange(marker, decision)) return;
    if (priorView === "original") _builderSetTrackedMarkupView(doc, "original");
    setSelectedTrackedChangeIds((selected) => selected.filter((id) => id !== changeId));
    setActiveTrackedChangeId(nextId);
    commitTrackedChangeMutation((decision === "accept" ? "Accepted " : "Rejected ") + String(entry?.label || "change").toLowerCase() + ".");
  }, [findLiveTrackedChange, refreshTrackedChanges, exportPreviewRef, filterTrackedChangeSet, trackedMarkupView, commitTrackedChangeMutation]);
  const applyTrackedChangeSet = React.useCallback(async (decision, requestedIds, scopeLabel) => {
    const doc = exportPreviewRef.current?.contentDocument;
    const allChanges = _builderTrackedChangeEntries(doc);
    const ids = Array.isArray(requestedIds) ? new Set(requestedIds) : null;
    const changes = ids ? allChanges.filter((change) => ids.has(change.id)) : filterTrackedChangeSet(allChanges);
    if (!changes.length) {
      addToast && addToast("There are no changes in that review scope.", "info");
      return;
    }
    const confirmReviewDecision = window.AlloFlowUX?.confirm;
    if (typeof confirmReviewDecision !== "function") {
      addToast && addToast("The confirmation dialog is still loading. Please try again.", "info");
      return;
    }
    const accepting = decision === "accept";
    const scope = scopeLabel || (ids ? "selected" : "visible");
    let confirmed = false;
    try {
      confirmed = await Promise.resolve(confirmReviewDecision.call(
        window.AlloFlowUX,
        (accepting ? "Accept " : "Reject ") + changes.length + " " + scope + " change" + (changes.length === 1 ? "" : "s") + "?",
        {
          title: (accepting ? "Accept " : "Reject ") + scope + " changes?",
          detail: accepting ? "Final text, formatting, paragraph layout, and structures will be kept." : "The original text, formatting, paragraph layout, and structures will be restored.",
          confirmText: (accepting ? "Accept " : "Reject ") + scope,
          cancelText: "Keep reviewing",
          tone: accepting ? "default" : "danger"
        }
      )).then(Boolean, () => false);
    } catch (_) {
    }
    if (!confirmed) return;
    const priorView = trackedMarkupView;
    _builderSetTrackedMarkupView(doc, "all");
    const liveById = new Map(_builderTrackedChangeEntries(doc).map((change) => [change.id, change]));
    changes.slice().reverse().forEach((change) => {
      const live = liveById.get(change.id)?.node;
      if (live?.parentNode) _builderApplyTrackedChange(live, decision);
    });
    if (priorView === "original") _builderSetTrackedMarkupView(doc, "original");
    setSelectedTrackedChangeIds((selected) => selected.filter((id) => !changes.some((change) => change.id === id)));
    setActiveTrackedChangeId("");
    commitTrackedChangeMutation((accepting ? "Accepted " : "Rejected ") + changes.length + " " + scope + " change" + (changes.length === 1 ? "" : "s") + ".");
  }, [exportPreviewRef, filterTrackedChangeSet, trackedMarkupView, commitTrackedChangeMutation, addToast]);
  const applyAllTrackedChanges = React.useCallback((decision) => {
    return applyTrackedChangeSet(decision, null, "visible");
  }, [applyTrackedChangeSet]);
  const applySelectedTrackedChanges = React.useCallback((decision) => {
    return applyTrackedChangeSet(decision, selectedVisibleTrackedChanges.map((change) => change.id), "selected");
  }, [applyTrackedChangeSet, selectedVisibleTrackedChanges]);
  React.useEffect(() => {
    if (!showExportPreview) return void 0;
    const onToggleTrackChanges = () => toggleTrackChanges();
    const onActivateTrackedChange = (event) => {
      const changeId = String(event?.detail?.id || "");
      if (changeId) openTrackedChanges(changeId);
    };
    const onTrackChangesInfo = (event) => {
      const message = String(event?.detail?.message || "");
      if (message) addToast && addToast(message, "info");
    };
    const onMarkupViewChange = (event) => {
      const view = String(event?.detail?.view || "");
      if (["all", "simple", "none", "original"].includes(view)) setTrackedMarkupView(view);
    };
    const onTrackChangesShortcut = (event) => {
      const target = event.target;
      const tag = String(target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable) return;
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && !event.altKey && (event.key === "e" || event.key === "E")) {
        event.preventDefault();
        toggleTrackChanges();
      }
    };
    document.addEventListener("alloflow-builder-toggle-track-changes", onToggleTrackChanges);
    document.addEventListener("alloflow-builder-activate-change", onActivateTrackedChange);
    document.addEventListener("alloflow-builder-track-changes-info", onTrackChangesInfo);
    document.addEventListener("alloflow-builder-markup-view", onMarkupViewChange);
    document.addEventListener("keydown", onTrackChangesShortcut);
    return () => {
      document.removeEventListener("alloflow-builder-toggle-track-changes", onToggleTrackChanges);
      document.removeEventListener("alloflow-builder-activate-change", onActivateTrackedChange);
      document.removeEventListener("alloflow-builder-track-changes-info", onTrackChangesInfo);
      document.removeEventListener("alloflow-builder-markup-view", onMarkupViewChange);
      document.removeEventListener("keydown", onTrackChangesShortcut);
    };
  }, [showExportPreview, toggleTrackChanges, openTrackedChanges, addToast]);
  const runBuilderPreflight = React.useCallback((modeOverride, announce = true) => {
    const result = _builderExportPreflight(exportPreviewRef.current?.contentDocument, modeOverride || exportPreviewMode);
    setPreflightResult(result);
    if (announce && addToast) {
      if (result.errors) addToast(`Export preflight found ${result.errors} blocking issue${result.errors === 1 ? "" : "s"} and ${result.warnings} warning${result.warnings === 1 ? "" : "s"}.`, "error");
      else if (result.warnings) addToast(`Export preflight passed with ${result.warnings} warning${result.warnings === 1 ? "" : "s"} to review.`, "info");
      else addToast("Export preflight passed - no issues found.", "success");
    }
    return result;
  }, [exportPreviewRef, exportPreviewMode, addToast]);
  const collectFindTextNodes = React.useCallback((doc) => {
    if (!doc?.body) return [];
    const win = doc.defaultView;
    const NF = win?.NodeFilter || NodeFilter;
    const walker = doc.createTreeWalker(doc.body, NF.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        return parent && !parent.closest("script,style,.allo-block-controls,.allo-block-remove,[data-allo-crop-ui],[data-allo-page-element],[data-allo-citation],[data-allo-bibliography],del[data-allo-change-id]") && node.nodeValue ? NF.FILTER_ACCEPT : NF.FILTER_REJECT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    return nodes;
  }, []);
  const findMatchesInText = React.useCallback((textValue, needleValue) => {
    const text = String(textValue || "");
    const needle = String(needleValue || "");
    if (!needle) return [];
    const searchableText = findOptions.matchCase ? text : text.toLocaleLowerCase();
    const searchableNeedle = findOptions.matchCase ? needle : needle.toLocaleLowerCase();
    const isWordCharacter = (value) => value ? /[\p{L}\p{N}_]/u.test(value) : false;
    const matches = [];
    let at = 0;
    while ((at = searchableText.indexOf(searchableNeedle, at)) >= 0) {
      const end = at + searchableNeedle.length;
      if (!findOptions.wholeWord || !isWordCharacter(text[at - 1]) && !isWordCharacter(text[end])) matches.push(at);
      at += Math.max(1, searchableNeedle.length);
    }
    return matches;
  }, [findOptions.matchCase, findOptions.wholeWord]);
  const countFindMatches = React.useCallback((doc, needle) => collectFindTextNodes(doc).reduce((total, node) => total + findMatchesInText(node.nodeValue, needle).length, 0), [collectFindTextNodes, findMatchesInText]);
  const clearFindHighlights = React.useCallback((doc) => {
    try {
      doc?.defaultView?.CSS?.highlights?.delete("allo-builder-find");
    } catch (_) {
    }
  }, []);
  const refreshFindHighlights = React.useCallback((doc, needle) => {
    clearFindHighlights(doc);
    if (!findOptions.highlightAll || !doc || !needle) return;
    const win = doc.defaultView;
    const registry = win?.CSS?.highlights;
    if (!registry || typeof win.Highlight !== "function") return;
    const ranges = [];
    collectFindTextNodes(doc).forEach((node) => {
      findMatchesInText(node.nodeValue, needle).forEach((at) => {
        const range = doc.createRange();
        range.setStart(node, at);
        range.setEnd(node, at + needle.length);
        ranges.push(range);
      });
    });
    if (ranges.length) registry.set("allo-builder-find", new win.Highlight(...ranges));
  }, [clearFindHighlights, collectFindTextNodes, findMatchesInText, findOptions.highlightAll]);
  React.useEffect(() => {
    const doc = exportPreviewRef.current?.contentDocument;
    const needle = findQuery.trim();
    const count = needle ? countFindMatches(doc, needle) : 0;
    findCursorRef.current = { node: null, offset: 0 };
    setFindMatchState({ count, current: 0 });
    refreshFindHighlights(doc, needle);
    return () => clearFindHighlights(doc);
  }, [findQuery, findDocumentRevision, exportPreviewRef, countFindMatches, refreshFindHighlights, clearFindHighlights]);
  const findInPreview = React.useCallback((direction = 1) => {
    const needle = findQuery.trim();
    const doc = exportPreviewRef.current?.contentDocument;
    if (!doc || !needle) return;
    const win = doc.defaultView;
    const selection = win?.getSelection();
    const nodes = collectFindTextNodes(doc);
    const totalMatches = countFindMatches(doc, needle);
    if (!selection || !nodes.length || !totalMatches) {
      addToast && addToast("\u201C" + needle + "\u201D was not found.", "info");
      return;
    }
    let startIndex = nodes.indexOf(findCursorRef.current.node);
    let startOffset = Number(findCursorRef.current.offset) || 0;
    if (startIndex < 0) {
      startIndex = selection.anchorNode ? nodes.indexOf(selection.anchorNode) : -1;
      startOffset = startIndex >= 0 ? Math.max(selection.anchorOffset || 0, selection.focusOffset || 0) : direction > 0 ? 0 : Number.MAX_SAFE_INTEGER;
    }
    let foundNode = null;
    let foundAt = -1;
    if (direction > 0) {
      for (let pass = 0; pass < 2 && !foundNode; pass += 1) {
        const first = pass ? 0 : Math.max(0, startIndex);
        for (let i = first; i < nodes.length; i += 1) {
          const from = !pass && i === startIndex ? startOffset : 0;
          const at = findMatchesInText(nodes[i].nodeValue, needle).find((matchAt) => matchAt >= from) ?? -1;
          if (at >= 0) {
            foundNode = nodes[i];
            foundAt = at;
            break;
          }
        }
      }
    } else {
      for (let pass = 0; pass < 2 && !foundNode; pass += 1) {
        const first = pass ? nodes.length - 1 : startIndex >= 0 ? Math.min(nodes.length - 1, startIndex) : nodes.length - 1;
        for (let i = first; i >= 0; i -= 1) {
          const text = String(nodes[i].nodeValue || "");
          const limit = !pass && i === startIndex ? Math.min(text.length, Math.max(0, startOffset - needle.length)) : text.length;
          const candidates = findMatchesInText(text, needle).filter((matchAt) => matchAt < limit);
          const at = candidates.length ? candidates[candidates.length - 1] : -1;
          if (at >= 0) {
            foundNode = nodes[i];
            foundAt = at;
            break;
          }
        }
      }
    }
    if (!foundNode) {
      addToast && addToast("\u201C" + needle + "\u201D was not found.", "info");
      return;
    }
    const range = doc.createRange();
    range.setStart(foundNode, foundAt);
    range.setEnd(foundNode, foundAt + needle.length);
    selection.removeAllRanges();
    selection.addRange(range);
    const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    foundNode.parentElement?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" });
    findCursorRef.current = { node: foundNode, offset: foundAt + needle.length };
    setFindMatchState((previous) => {
      const current = direction > 0 ? previous.current >= totalMatches ? 1 : previous.current + 1 : previous.current <= 1 ? totalMatches : previous.current - 1;
      return { count: totalMatches, current };
    });
  }, [findQuery, exportPreviewRef, addToast, collectFindTextNodes, countFindMatches, findMatchesInText]);
  const findNextInPreview = React.useCallback(() => findInPreview(1), [findInPreview]);
  const findPreviousInPreview = React.useCallback(() => findInPreview(-1), [findInPreview]);
  const replaceCurrentInPreview = React.useCallback(() => {
    const needle = findQuery.trim();
    const doc = exportPreviewRef.current?.contentDocument;
    const win = doc?.defaultView;
    if (!doc || !needle || !win) return;
    resumeTrackedEditingView(true);
    let selection = win.getSelection();
    const selectionIsMatch = () => {
      if (!selection || selection.rangeCount !== 1 || selection.isCollapsed) return false;
      const range = selection.getRangeAt(0);
      if (range.startContainer !== range.endContainer || range.startContainer.nodeType !== 3) return false;
      return range.endOffset - range.startOffset === needle.length && findMatchesInText(range.startContainer.nodeValue, needle).includes(range.startOffset);
    };
    if (!selectionIsMatch()) {
      findInPreview(1);
      selection = win.getSelection();
    }
    if (!selectionIsMatch()) return;
    const tracking = doc.body?.getAttribute("data-allo-track-changes") === "1";
    let replaced = false;
    if (tracking) {
      const selectedRange = selection.getRangeAt(0).cloneRange();
      const result = replaceQuery ? _builderTrackTextInsertion(doc, replaceQuery, selectedRange) : _builderTrackTextDeletion(doc, "backward", selectedRange);
      if (!result.ok) {
        if (result.error) addToast && addToast(result.error, result.blocked ? "info" : "error");
        return;
      }
      replaced = true;
      refreshTrackedChanges();
    } else {
      replaced = doc.execCommand("insertText", false, replaceQuery);
      if (!replaced) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const replacementNode = doc.createTextNode(replaceQuery);
        range.insertNode(replacementNode);
        range.setStartAfter(replacementNode);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        replaced = true;
      }
      try {
        doc.body.dispatchEvent(new win.Event("input", { bubbles: true }));
      } catch (_) {
      }
    }
    if (!replaced) return;
    selection = win.getSelection();
    findCursorRef.current = { node: selection?.anchorNode || null, offset: selection?.anchorOffset || 0 };
    setFindDocumentRevision((value) => value + 1);
    addToast && addToast(tracking ? "Replacement recorded as a tracked change." : "Replaced the current match.", "success");
  }, [findQuery, replaceQuery, exportPreviewRef, resumeTrackedEditingView, addToast, findInPreview, findMatchesInText, refreshTrackedChanges]);
  const replaceAllInPreview = React.useCallback(() => {
    const needle = findQuery.trim();
    const doc = exportPreviewRef.current?.contentDocument;
    if (!doc || !needle) return;
    resumeTrackedEditingView(true);
    const win = doc.defaultView;
    const tracking = doc.body?.getAttribute("data-allo-track-changes") === "1";
    let count = 0;
    collectFindTextNodes(doc).forEach((node) => {
      const before = node.nodeValue || "";
      const matches = findMatchesInText(before, needle);
      if (!matches.length) return;
      if (tracking) {
        matches.slice().reverse().forEach((at) => {
          if (!node.isConnected || at + needle.length > String(node.nodeValue || "").length) return;
          const range = doc.createRange();
          range.setStart(node, at);
          range.setEnd(node, at + needle.length);
          const result = replaceQuery ? _builderTrackTextInsertion(doc, replaceQuery, range) : _builderTrackTextDeletion(doc, "backward", range);
          if (result.ok) count += 1;
        });
      } else {
        let after = before;
        matches.slice().reverse().forEach((at) => {
          after = after.slice(0, at) + replaceQuery + after.slice(at + needle.length);
          count += 1;
        });
        node.nodeValue = after;
      }
    });
    if (count) {
      if (!tracking) {
        try {
          doc.body.dispatchEvent(new (win?.Event || Event)("input", { bubbles: true }));
        } catch (_) {
        }
      } else refreshTrackedChanges();
      setFindDocumentRevision((value) => value + 1);
      setFindMatchState({ count: countFindMatches(doc, needle), current: 0 });
      addToast && addToast(tracking ? "Recorded " + count + " replacement" + (count === 1 ? "" : "s") + " as tracked changes." : "Replaced " + count + " occurrence" + (count === 1 ? "" : "s") + ".", "success");
    } else addToast && addToast("\u201C" + needle + "\u201D was not found.", "info");
  }, [findQuery, replaceQuery, exportPreviewRef, resumeTrackedEditingView, addToast, collectFindTextNodes, countFindMatches, findMatchesInText, refreshTrackedChanges]);
  const getCleanBuilderDocument = React.useCallback((options = {}) => {
    const doc = exportPreviewRef.current?.contentDocument;
    if (!doc?.documentElement) return null;
    let clone = doc.documentElement.cloneNode(true);
    if (options?.forExport) clone = _builderFinalizeDocumentForExport(clone);
    else {
      _builderClearReviewCommentTransientState(clone);
      _builderClearTrackedChangeTransientState(clone);
    }
    clone.querySelectorAll(".allo-block-controls,.allo-block-remove,.a11y-inspect-badge,[data-allo-crop-ui],#a11y-inspect-styles,#allo-builder-edit-css,script:not([data-allo-citation-store])").forEach((node) => node.remove());
    if (options?.forExport) clone.querySelectorAll(_BUILDER_CITATION_STORE_SELECTOR).forEach((node) => node.remove());
    clone.querySelectorAll("[contenteditable]").forEach((node) => node.removeAttribute("contenteditable"));
    clone.querySelectorAll("[data-allo-semantic-selected]").forEach((node) => node.removeAttribute("data-allo-semantic-selected"));
    _builderStripEditorBreakMetadata(clone);
    clone.querySelectorAll("[data-allo-crop-tabindex-added]").forEach((node) => {
      const added = node.getAttribute("data-allo-crop-tabindex-added") === "added";
      node.removeAttribute("data-allo-crop-tabindex-added");
      if (added) node.removeAttribute("tabindex");
      node.removeAttribute("aria-keyshortcuts");
    });
    const title = String(exportConfig && (exportConfig.title || exportConfig.docTitle || exportConfig.lessonTitle) || doc.title || "AlloFlow Document").trim();
    return { doc, clone, title, html: "<!DOCTYPE html>\n" + clone.outerHTML };
  }, [exportPreviewRef, exportConfig]);
  const sanitizeAdvancedReviewSessionHtml = React.useCallback((html) => {
    if (typeof html !== "string" || !html.trim()) return "";
    try {
      const parsed = new DOMParser().parseFromString(html, "text/html");
      parsed.querySelectorAll("#allo-builder-edit-css,.allo-block-controls,.allo-block-remove,.a11y-inspect-badge,[data-allo-crop-ui],#a11y-inspect-styles").forEach((node) => node.remove());
      parsed.querySelectorAll("[data-allo-semantic-selected]").forEach((node) => node.removeAttribute("data-allo-semantic-selected"));
      parsed.body?.removeAttribute("data-allo-user-edited");
      return "<!DOCTYPE html>\n" + parsed.documentElement.outerHTML;
    } catch (_) {
      return html;
    }
  }, []);
  const getAdvancedReviewLiveHtml = React.useCallback(() => {
    const clean = getCleanBuilderDocument();
    if (clean?.html) return sanitizeAdvancedReviewSessionHtml(clean.html);
    const doc = exportPreviewRef.current?.contentDocument;
    return doc?.documentElement ? sanitizeAdvancedReviewSessionHtml("<!DOCTYPE html>\n" + doc.documentElement.outerHTML) : "";
  }, [exportPreviewRef, getCleanBuilderDocument, sanitizeAdvancedReviewSessionHtml]);
  const refreshAdvancedReviewTree = React.useCallback((providedDoc) => {
    if (!advancedReviewActiveRef.current) return null;
    const api = window.AlloModules?.SemanticReview;
    if (!api || typeof api.buildSemanticTree !== "function") {
      if (mountedRef.current) setAdvancedReviewTreeError("Semantic review tools are still loading.");
      return null;
    }
    const doc = providedDoc || exportPreviewRef.current?.contentDocument;
    if (!doc?.documentElement || !doc.body) return null;
    try {
      const liveHtml = "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
      const result = api.buildSemanticTree(liveHtml);
      if (!result?.ok) {
        if (mountedRef.current) setAdvancedReviewTreeError("The document structure could not be read.");
        return null;
      }
      const selector = Object.keys(api.TAG_TO_PDF_ROLE || {}).join(",");
      const liveNodes = selector ? Array.from(doc.body.querySelectorAll(selector)) : [];
      if (doc.body.getAttribute("data-allo-user-edited") === "1") {
        result.flat.forEach((node, index) => {
          if (liveNodes[index] && node?.id) liveNodes[index].setAttribute(api.SEMANTIC_ID_ATTRIBUTE || "data-allo-semantic-id", node.id);
        });
      }
      const treeState = {
        roots: result.roots || [],
        flat: result.flat || [],
        document: result.document || { language: "", title: "" },
        truncated: Boolean(result.truncated)
      };
      if (mountedRef.current) {
        setAdvancedReviewTree(treeState);
        setAdvancedReviewTreeError("");
        setAdvancedReviewSelectedId((currentId) => !currentId || treeState.flat.some((node) => node.id === currentId) ? currentId : "");
      }
      if (!advancedReviewBaselineRef.current) {
        const cleanHtml = getAdvancedReviewLiveHtml();
        advancedReviewBaselineRef.current = cleanHtml;
        if (mountedRef.current) setAdvancedReviewCurrentHtml(cleanHtml);
      }
      return treeState;
    } catch (_) {
      if (mountedRef.current) setAdvancedReviewTreeError("The document structure could not be read.");
      return null;
    }
  }, [exportPreviewRef, getAdvancedReviewLiveHtml]);
  const selectAdvancedReviewNode = React.useCallback((nodeId) => {
    const doc = exportPreviewRef.current?.contentDocument;
    if (!doc) return;
    doc.querySelectorAll("[data-allo-semantic-selected]").forEach((node) => node.removeAttribute("data-allo-semantic-selected"));
    let target = Array.from(doc.querySelectorAll("[data-allo-semantic-id]")).find((node) => node.getAttribute("data-allo-semantic-id") === nodeId);
    if (!target) {
      const api = window.AlloModules?.SemanticReview;
      const selector = Object.keys(api?.TAG_TO_PDF_ROLE || {}).join(",");
      const index = advancedReviewTree.flat.findIndex((node) => node.id === nodeId);
      target = selector && index >= 0 ? Array.from(doc.body.querySelectorAll(selector))[index] : null;
    }
    if (!target) {
      setAdvancedReviewSelectedId("");
      return;
    }
    target.setAttribute("data-allo-semantic-selected", "1");
    setAdvancedReviewSelectedId(nodeId);
    try {
      target.scrollIntoView({ block: "center", behavior: "smooth" });
    } catch (_) {
      target.scrollIntoView?.();
    }
  }, [advancedReviewTree, exportPreviewRef]);
  const publishAdvancedReviewMutation = React.useCallback((html, entry) => {
    if (!entry || !advancedReviewActiveRef.current) return;
    const at = Date.now();
    const normalized = {
      id: entry.id || "review-" + at + "-" + Math.random().toString(36).slice(2, 7),
      at,
      type: entry.type || "manual-edit",
      targetId: entry.targetId || "",
      summary: entry.summary || "Edited document content",
      details: entry.details || {},
      actor: entry.actor || "Specialist"
    };
    const previous = advancedReviewHistoryRef.current;
    const last = previous[previous.length - 1];
    const coalesceManual = normalized.type === "manual-edit" && last?.type === "manual-edit" && at - last.at < 2e3;
    const next = (coalesceManual ? [...previous.slice(0, -1), { ...last, at, summary: normalized.summary }] : [...previous, normalized]).slice(-100);
    advancedReviewHistoryRef.current = next;
    if (mountedRef.current) {
      setAdvancedReviewHistory(next);
      setAdvancedReviewEvidenceStale(true);
      setAdvancedReviewCurrentHtml(html);
    }
    let sessionValue = null;
    try {
      const sessionApi = window.AlloModules?.ReviewDocumentSession;
      if (sessionApi && typeof sessionApi.createSession === "function" && typeof sessionApi.applyCommand === "function") {
        if (!sessionApi.isSession?.(advancedReviewSessionRef.current)) {
          advancedReviewSessionRef.current = sessionApi.createSession({
            workspaceMode: "advanced-review",
            remediationResult: pdfFixResult || null,
            baselineHtml: advancedReviewBaselineRef.current,
            currentHtml: advancedReviewBaselineRef.current || html
          });
        }
        sessionValue = sessionApi.applyCommand(
          advancedReviewSessionRef.current,
          { type: normalized.type, nodeId: normalized.targetId || void 0, summary: normalized.summary, details: normalized.details },
          { ok: true, changed: true, html, summary: normalized.summary, reason: "content-modified-pending-reverification" }
        );
        advancedReviewSessionRef.current = sessionValue;
      }
    } catch (_) {
      sessionValue = null;
    }
    if (typeof onAdvancedReviewSessionChange === "function") {
      try {
        onAdvancedReviewSessionChange(sessionValue || {
          version: 1,
          workspaceMode: "advanced-review",
          source: "remediation",
          baselineHtml: advancedReviewBaselineRef.current,
          currentHtml: html,
          dirty: true,
          evidenceState: "pending-reverification",
          invalidationReason: "content-modified-pending-reverification",
          ledger: next,
          lastMutation: normalized,
          updatedAt: at
        });
      } catch (_) {
      }
    }
  }, [onAdvancedReviewSessionChange, pdfFixResult]);
  const applyAdvancedReviewCommand = React.useCallback((command) => {
    if (!advancedReviewActiveRef.current) return;
    const api = window.AlloModules?.SemanticReview;
    if (!api || typeof api.applySemanticCommand !== "function") {
      addToast && addToast("Semantic review tools are still loading. Please try again.", "error");
      return;
    }
    const doc = exportPreviewRef.current?.contentDocument;
    const sourceHtml = getAdvancedReviewLiveHtml();
    if (!doc?.body || !sourceHtml) return;
    const result = api.applySemanticCommand(sourceHtml, command);
    if (!result?.ok) {
      addToast && addToast("That structure change could not be applied (" + (result?.error || "unknown error") + ").", "error");
      return;
    }
    if (!result.changed) {
      addToast && addToast("The document already has that setting.", "info");
      return;
    }
    try {
      const parsed = new DOMParser().parseFromString(result.html, "text/html");
      doc.body.innerHTML = parsed.body.innerHTML;
      const nextLanguage = parsed.documentElement.getAttribute("lang");
      if (nextLanguage) doc.documentElement.setAttribute("lang", nextLanguage);
      else doc.documentElement.removeAttribute("lang");
      doc.querySelectorAll("[data-allo-semantic-selected]").forEach((node) => node.removeAttribute("data-allo-semantic-selected"));
      const selected = Array.from(doc.querySelectorAll("[data-allo-semantic-id]")).find((node) => node.getAttribute("data-allo-semantic-id") === result.targetId);
      if (selected) selected.setAttribute("data-allo-semantic-selected", "1");
      doc.body.setAttribute("data-allo-user-edited", "1");
      advancedReviewCommandDispatchRef.current = true;
      try {
        doc.body.dispatchEvent(new (doc.defaultView?.Event || Event)("input", { bubbles: true }));
      } finally {
        advancedReviewCommandDispatchRef.current = false;
      }
      const currentHtml = sanitizeAdvancedReviewSessionHtml(result.html);
      publishAdvancedReviewMutation(currentHtml, result.entry || { type: command.type, targetId: result.targetId, summary: result.summary || "Updated document semantics" });
      refreshAdvancedReviewTree(doc);
      if (result.targetId && result.targetId !== "document") selectAdvancedReviewNode(result.targetId);
      addToast && addToast(result.summary || "Document semantics updated.", "success");
    } catch (_) {
      advancedReviewCommandDispatchRef.current = false;
      addToast && addToast("The structure change could not be written to the editable preview.", "error");
    }
  }, [addToast, exportPreviewRef, getAdvancedReviewLiveHtml, publishAdvancedReviewMutation, refreshAdvancedReviewTree, sanitizeAdvancedReviewSessionHtml, selectAdvancedReviewNode]);
  const noteAdvancedReviewManualInput = React.useCallback((doc) => {
    if (!advancedReviewActiveRef.current || advancedReviewCommandDispatchRef.current) return;
    if (mountedRef.current) setAdvancedReviewEvidenceStale(true);
    if (advancedReviewManualTimerRef.current) clearTimeout(advancedReviewManualTimerRef.current);
    advancedReviewManualTimerRef.current = setTimeout(() => {
      advancedReviewManualTimerRef.current = null;
      if (!advancedReviewActiveRef.current) return;
      refreshAdvancedReviewTree(doc);
      const currentHtml = getAdvancedReviewLiveHtml();
      if (!currentHtml) return;
      publishAdvancedReviewMutation(currentHtml, { type: "manual-edit", summary: "Edited document content in the preview" });
    }, 450);
  }, [getAdvancedReviewLiveHtml, publishAdvancedReviewMutation, refreshAdvancedReviewTree]);
  const advancedReviewSelectedNode = React.useMemo(() => advancedReviewTree.flat.find((node) => node.id === advancedReviewSelectedId) || null, [advancedReviewTree, advancedReviewSelectedId]);
  const advancedReviewOutline = React.useMemo(() => {
    const rows = [];
    const walk = (nodes, depth) => (nodes || []).forEach((node) => {
      rows.push({ node, depth });
      walk(node.children, depth + 1);
    });
    walk(advancedReviewTree.roots, 0);
    return rows;
  }, [advancedReviewTree]);
  const advancedReviewIssues = React.useMemo(() => {
    const issues = [];
    const seen = /* @__PURE__ */ new Set();
    const addIssue = (issue, source, index) => {
      if (!issue) return;
      const title = String(issue.title || issue.rule || issue.id || issue.message || "Accessibility finding");
      const message = String(issue.message || issue.description || issue.help || issue.summary || title);
      const key = (source + "|" + title + "|" + message).toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      issues.push({ id: String(issue.id || source + "-" + index), source, title, message, severity: String(issue.severity || issue.impact || issue.priority || "review").toLowerCase() });
    };
    const addList = (value, source) => {
      if (Array.isArray(value)) value.forEach((issue, index) => addIssue(issue, source, index));
    };
    addList(exportAuditResult?.issues, "Current Builder audit");
    addList(pdfFixResult?.issues, "Remediation review");
    addList(pdfFixResult?.remainingIssues, "Remediation review");
    addList(pdfFixResult?.axeAudit?.violations, "axe-core");
    addList(pdfFixResult?.verificationAudit?.issues, "Verification");
    addList(pdfFixResult?.secondEngineAudit?.violations, "Second engine");
    advancedReviewTree.flat.forEach((node) => (node.warnings || []).forEach((warning, index) => addIssue({ id: node.id + "-warning-" + index, title: warning, message: node.text || node.role, severity: "review" }, "Structure review", index)));
    return issues;
  }, [advancedReviewTree, exportAuditResult, pdfFixResult]);
  React.useEffect(() => {
    advancedReviewActiveRef.current = isAdvancedReview;
    if (!showExportPreview) {
      advancedReviewSessionOpenRef.current = false;
      advancedReviewBaselineRef.current = "";
      advancedReviewSessionRef.current = null;
      advancedReviewHistoryRef.current = [];
      if (advancedReviewManualTimerRef.current) clearTimeout(advancedReviewManualTimerRef.current);
      advancedReviewManualTimerRef.current = null;
      setAdvancedReviewHistory([]);
      setAdvancedReviewEvidenceStale(false);
      setAdvancedReviewSelectedId("");
      setAdvancedReviewCurrentHtml("");
      return void 0;
    }
    if (!isAdvancedReview) return void 0;
    if (!advancedReviewSessionOpenRef.current) {
      const baseline = sanitizeAdvancedReviewSessionHtml(pdfFixResult?.accessibleHtml || getAdvancedReviewLiveHtml());
      advancedReviewSessionOpenRef.current = true;
      advancedReviewBaselineRef.current = baseline;
      try {
        const sessionApi = window.AlloModules?.ReviewDocumentSession;
        advancedReviewSessionRef.current = sessionApi?.createSession?.({
          workspaceMode: "advanced-review",
          remediationResult: pdfFixResult || null,
          baselineHtml: baseline,
          currentHtml: baseline
        }) || null;
      } catch (_) {
        advancedReviewSessionRef.current = null;
      }
      advancedReviewHistoryRef.current = [];
      setAdvancedReviewHistory([]);
      setAdvancedReviewEvidenceStale(false);
      setAdvancedReviewSelectedId("");
      setAdvancedReviewCurrentHtml(baseline);
      setAdvancedReviewTab("structure");
    }
    const timer = setTimeout(() => refreshAdvancedReviewTree(), 0);
    return () => clearTimeout(timer);
  }, [getAdvancedReviewLiveHtml, isAdvancedReview, pdfFixResult?.accessibleHtml, refreshAdvancedReviewTree, sanitizeAdvancedReviewSessionHtml, showExportPreview]);
  React.useEffect(() => {
    setAdvancedReviewAltDraft(advancedReviewSelectedNode?.properties?.alt || "");
    setAdvancedReviewLanguageDraft(advancedReviewSelectedNode?.properties?.language || advancedReviewTree.document?.language || "");
  }, [advancedReviewSelectedNode, advancedReviewTree.document]);
  const runAdvancedReviewBuilderAudit = React.useCallback(() => {
    setAdvancedReviewTab("issues");
    const dialog = exportPreviewRef.current?.closest('[role="dialog"]');
    const auditButton = dialog?.querySelector('[data-help-key="doc_builder_wcag_audit_btn"]');
    if (auditButton && !auditButton.disabled) auditButton.click();
    else addToast && addToast("The Builder HTML audit is not available yet.", "info");
  }, [addToast, exportPreviewRef]);
  const readLocalDraftStore = React.useCallback(() => {
    try {
      const rawDraft = window.localStorage.getItem(draftStorageKey);
      return _normalizeBuilderLocalDraft(rawDraft ? JSON.parse(rawDraft) : null);
    } catch (_) {
      return null;
    }
  }, [draftStorageKey]);
  const persistLocalDraft = React.useCallback((html, at = Date.now(), label = "Auto-save") => {
    if (typeof html !== "string" || html.length < 100) return false;
    try {
      const existing = readLocalDraftStore();
      const duplicate = existing?.snapshots?.some((snapshot2) => snapshot2.html === html);
      const snapshot = { id: `snapshot-${at}-${Math.random().toString(36).slice(2, 8)}`, at, label: String(label || "Auto-save").slice(0, 80), html };
      const snapshots = (duplicate ? existing?.snapshots || [] : [snapshot, ...existing?.snapshots || []]).slice(0, 10);
      const store = { version: 2, title: draftDocumentTitle, html, at, snapshots };
      window.localStorage.setItem(draftStorageKey, JSON.stringify(store));
      setVersionHistory(store.snapshots);
      setDraftRecovery(null);
      return true;
    } catch (_) {
      return false;
    }
  }, [readLocalDraftStore, draftStorageKey, draftDocumentTitle]);
  const saveCurrentAsDocumentTemplate = React.useCallback(async () => {
    if (customDocumentTemplates.length >= 8) {
      addToast && addToast("You can keep up to 8 custom templates on this device. Remove one before saving another.", "info");
      return;
    }
    const clean = getCleanBuilderDocument({ forExport: true });
    const bodyHtml = clean?.clone?.querySelector?.("body")?.innerHTML || "";
    const sanitizedHtml = clean?.doc ? _builderSanitizeTemplateHtml(clean.doc, bodyHtml) : "";
    if (!sanitizedHtml.replace(/<[^>]*>/g, "").trim()) {
      addToast && addToast("Add some document content before saving a template.", "info");
      return;
    }
    const name = await promptForBuilderText("Name this reusable document template.", clean?.title || "", {
      title: "Save document template",
      confirmText: "Save template",
      cancelText: "Cancel",
      placeholder: "Template name",
      maxLength: 80,
      validate: (value) => value.trim() ? null : "Enter a template name."
    });
    if (name == null || !String(name).trim()) return;
    const definition = {
      id: "custom-template-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7),
      label: String(name).replace(/\s+/g, " ").trim(),
      description: "Saved from the current document on this device.",
      html: sanitizedHtml,
      custom: true,
      createdAt: Date.now()
    };
    setCustomDocumentTemplates((current) => _builderNormalizeCustomDocumentTemplates([...current, definition]));
    addToast && addToast("Document template saved on this device.", "success");
  }, [customDocumentTemplates.length, getCleanBuilderDocument, promptForBuilderText, addToast]);
  const deleteCustomDocumentTemplate = React.useCallback((templateId) => {
    const definition = customDocumentTemplates.find((item) => item.id === templateId);
    if (!definition) return;
    setCustomDocumentTemplates((current) => current.filter((item) => item.id !== templateId));
    addToast && addToast("Removed \u201C" + definition.label + "\u201D from your templates.", "success");
  }, [customDocumentTemplates, addToast]);
  const applyDocumentTemplate = React.useCallback(async (templateDefinition) => {
    const doc = exportPreviewRef.current?.contentDocument;
    if (!doc?.body || !templateDefinition) {
      addToast && addToast("The editable document is not ready yet.", "info");
      return;
    }
    if (doc.body.getAttribute("data-allo-track-changes") === "1" && doc.body.querySelector(_BUILDER_CHANGE_SELECTOR)) {
      addToast && addToast("Accept or reject pending changes before applying a full document template.", "info");
      return;
    }
    const confirmTemplate = window.AlloFlowUX?.confirm;
    if (typeof confirmTemplate !== "function") {
      addToast && addToast("The confirmation dialog is still loading. Please try again.", "info");
      return;
    }
    let confirmed = false;
    try {
      confirmed = await Promise.resolve(confirmTemplate.call(
        window.AlloFlowUX,
        "Apply \u201C" + templateDefinition.label + "\u201D and replace the current document body?",
        {
          title: "Apply document template?",
          detail: "A local rollback point will be saved first. Page setup and Builder review preferences will be kept.",
          confirmText: "Apply template",
          cancelText: "Keep document",
          tone: "danger"
        }
      )).then(Boolean, () => false);
    } catch (_) {
    }
    if (!confirmed) return;
    const current = getCleanBuilderDocument();
    if (!current?.html) {
      addToast && addToast("The current document could not be saved before applying the template.", "error");
      return;
    }
    const rollbackSaved = persistLocalDraft(current.html, Date.now(), "Before template: " + templateDefinition.label);
    resumeTrackedEditingView(true);
    const result = _builderApplyDocumentTemplate(doc, templateDefinition);
    if (!result.ok) {
      addToast && addToast(result.error || "The document template could not be applied.", "error");
      return;
    }
    const changeId = result.marker?.getAttribute?.("data-allo-change-id") || "";
    if (changeId) setActiveTrackedChangeId(changeId);
    setVersionComparison(null);
    setNavigationPaneTab("headings");
    setShowNavigationPane(true);
    setActiveRibbonTab("insert");
    setRibbonCollapsed(false);
    commitTrackedChangeMutation(result.tracked ? "Applied \u201C" + templateDefinition.label + "\u201D as a tracked structural change." : "Applied \u201C" + templateDefinition.label + "\u201D." + (rollbackSaved ? " A rollback point was saved." : ""));
    exportPreviewRef.current?.focus();
  }, [exportPreviewRef, getCleanBuilderDocument, persistLocalDraft, resumeTrackedEditingView, commitTrackedChangeMutation, addToast]);
  React.useEffect(() => {
    if (!showExportPreview) {
      setDraftRecovery(null);
      setVersionHistory([]);
      return;
    }
    const saved = readLocalDraftStore();
    setDraftRecovery(saved);
    setVersionHistory(saved?.snapshots || []);
  }, [showExportPreview, readLocalDraftStore]);
  const restoreDraftHtml = React.useCallback((html, message = "Local draft restored.") => {
    const doc = exportPreviewRef.current?.contentDocument;
    if (!html || !doc) {
      addToast && addToast("The editable preview is not ready to restore yet.", "info");
      return false;
    }
    try {
      try {
        delete doc.__alloPasteGuard;
      } catch (_) {
      }
      doc.open();
      doc.write(html);
      doc.close();
      setDraftCaptureState("restored");
      window.setTimeout(() => {
        const liveDoc = exportPreviewRef.current?.contentDocument;
        if (!liveDoc?.body) return;
        liveDoc.body.setAttribute("data-allo-user-edited", "1");
        window.__alloBuilderEditedPack = { html: "<!DOCTYPE html>\n" + liveDoc.documentElement.outerHTML, at: Date.now() };
        refreshDocumentStats();
        refreshReviewComments();
        refreshTrackedChanges();
        refreshActiveHeading();
        refreshPageMetrics();
        refreshFormattingState();
        if (mountedRef.current) setDraftCaptureState("restored");
      }, 80);
      addToast && addToast(message, "success");
      return true;
    } catch (_) {
      addToast && addToast("Could not restore that version.", "error");
      return false;
    }
  }, [exportPreviewRef, refreshDocumentStats, refreshReviewComments, refreshTrackedChanges, refreshActiveHeading, refreshPageMetrics, refreshFormattingState, addToast]);
  const restoreLocalDraft = React.useCallback(() => {
    if (restoreDraftHtml(draftRecovery?.html, "Local draft restored.")) setDraftRecovery(null);
  }, [draftRecovery, restoreDraftHtml]);
  const restoreVersionSnapshot = React.useCallback((snapshot) => {
    if (!snapshot?.html) return;
    const current = getCleanBuilderDocument();
    const now = Date.now();
    const rollbackSaved = Boolean(current?.html && current.html !== snapshot.html && persistLocalDraft(current.html, now, "Before version restore"));
    setVersionComparison(null);
    persistLocalDraft(snapshot.html, now + 1, "Restored version");
    restoreDraftHtml(snapshot.html, rollbackSaved ? "Version restored. A rollback point was saved." : "Version restored.");
  }, [getCleanBuilderDocument, persistLocalDraft, restoreDraftHtml]);
  const compareVersionSnapshot = React.useCallback((snapshot) => {
    const doc = exportPreviewRef.current?.contentDocument;
    if (!snapshot?.html || !doc) {
      addToast && addToast("That local version is not available to compare.", "info");
      return;
    }
    const comparison = _builderCompareDocumentVersions(doc, snapshot.html);
    if (!comparison.ok) {
      addToast && addToast(comparison.error || "That version could not be compared.", "error");
      return;
    }
    setVersionComparison({ ...comparison, snapshotId: snapshot.id, label: snapshot.label, at: snapshot.at });
    addToast && addToast(comparison.changed ? "Version comparison ready: " + comparison.changed + " changed block" + (comparison.changed === 1 ? "" : "s") + "." : "The current document matches that version.", comparison.changed ? "info" : "success");
  }, [exportPreviewRef, addToast]);
  const restoreVersionComparisonBlock = React.useCallback((excerpt) => {
    const doc = exportPreviewRef.current?.contentDocument;
    const snapshot = versionHistory.find((item) => item.id === versionComparison?.snapshotId);
    if (!doc || !snapshot) {
      addToast && addToast("That comparison is no longer available.", "info");
      return;
    }
    const restored = _builderRestoreVersionBlock(doc, snapshot.html, excerpt);
    if (!restored.ok) {
      addToast && addToast(restored.error || "That block could not be restored.", "info");
      return;
    }
    if (restored.tracked) setActiveTrackedChangeId(restored.marker?.getAttribute?.("data-allo-change-id") || "");
    restored.marker?.scrollIntoView?.({ behavior: window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    commitTrackedChangeMutation(restored.tracked ? "Saved block applied as a tracked structural change." : "Saved block restored from version history.");
    const refreshed = _builderCompareDocumentVersions(doc, snapshot.html);
    if (refreshed.ok) setVersionComparison({ ...refreshed, snapshotId: snapshot.id, label: snapshot.label, at: snapshot.at });
  }, [exportPreviewRef, versionHistory, versionComparison, commitTrackedChangeMutation, addToast]);
  const saveVersionSnapshot = React.useCallback(() => {
    const clean = getCleanBuilderDocument();
    if (!clean || !persistLocalDraft(clean.html, Date.now(), "Manual snapshot")) {
      addToast && addToast("Could not save a local version snapshot.", "error");
      return;
    }
    setDraftCaptureState("saved");
    addToast && addToast("Version snapshot saved on this device.", "success");
  }, [getCleanBuilderDocument, persistLocalDraft, addToast]);
  const toggleQuickAccessItem = React.useCallback((itemId) => {
    setQuickAccessItems((items) => {
      if (items.includes(itemId)) return items.filter((id) => id !== itemId);
      if (items.length >= 6) {
        addToast && addToast("Quick Access can hold up to six commands.", "info");
        return items;
      }
      return [...items, itemId];
    });
  }, [addToast]);
  const moveQuickAccessItem = React.useCallback((itemId, direction) => {
    setQuickAccessItems((items) => {
      const index = items.indexOf(itemId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= items.length) return items;
      const next = [...items];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }, []);
  const quickAccessActions = {
    save: { action: saveVersionSnapshot },
    undo: { action: () => runEditorCommand("undo") },
    redo: { action: () => runEditorCommand("redo") },
    comments: { action: () => openReviewComments(activeCommentId), pressed: showNavigationPane && navigationPaneTab === "comments" },
    trackChanges: { action: () => toggleTrackChanges(), pressed: trackChangesEnabled },
    wordCount: { action: openWordCountDetails, pressed: showWordCountDetails },
    navigation: { action: () => {
      const active = showNavigationPane && navigationPaneTab === "headings";
      if (active) setShowNavigationPane(false);
      else {
        setNavigationPaneTab("headings");
        setShowNavigationPane(true);
      }
    }, pressed: showNavigationPane && navigationPaneTab === "headings" },
    footnote: { action: insertDocumentFootnote },
    references: { action: openDocumentReferences, pressed: showNavigationPane && navigationPaneTab === "references" },
    updateFields: { action: updateAllDocumentFields },
    focus: { action: () => setBuilderFocusMode(), pressed: isFocusMode }
  };
  React.useEffect(() => {
    if (!showExportPreview) return void 0;
    const onSaveSnapshotRequest = () => saveVersionSnapshot();
    document.addEventListener("alloflow-builder-save-snapshot", onSaveSnapshotRequest);
    return () => document.removeEventListener("alloflow-builder-save-snapshot", onSaveSnapshotRequest);
  }, [showExportPreview, saveVersionSnapshot]);
  const discardLocalDraft = React.useCallback(() => {
    try {
      window.localStorage.removeItem(draftStorageKey);
    } catch (_) {
    }
    setDraftRecovery(null);
    setVersionHistory([]);
    setVersionComparison(null);
  }, [draftStorageKey]);
  const downloadBuilderBlob = React.useCallback((blob, options = {}) => {
    if (!blob) throw new Error("The export did not produce a file.");
    const clean = getCleanBuilderDocument();
    const safeTitle = String(clean?.title || "document").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").substring(0, 60) || "document";
    const extension = String(options.extension || "bin").replace(/^\./, "");
    const fileName = options.fileName || `${safeTitle}${options.suffix || ""}.${extension}`;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1e3);
    try {
      if (typeof onExportSuccess === "function") onExportSuccess({ kind: "file", format: extension, fileName });
    } catch (_) {
    }
    return fileName;
  }, [getCleanBuilderDocument, onExportSuccess]);
  const runPackageExport = React.useCallback(async (kind) => {
    if (altExportBusy) return;
    const handler = kind === "qti" ? handleExportQTI : kind === "h5p" ? handleExportH5P : handleExportIMS;
    if (typeof handler !== "function") {
      addToast && addToast(`${kind.toUpperCase()} export is unavailable right now.`, "error");
      return;
    }
    setAltExportBusy(kind);
    try {
      if (kind === "qti" || kind === "h5p") {
        const activities = kind === "qti" ? qtiAssessments : h5pActivities;
        const selectedKey = kind === "qti" ? selectedQtiKey : selectedH5PKey;
        const selected = activities.find((entry) => entry.key === selectedKey) || activities[activities.length - 1];
        if (!selected) throw new Error(`Choose an activity before exporting ${kind.toUpperCase()}.`);
        const succeeded = await handler({ generatedContent: selected.item });
        if (succeeded === false) return;
      } else {
        const clean = getCleanBuilderDocument({ forExport: true });
        if (!clean) throw new Error("The editable preview is not ready.");
        await handler({ liveHtml: clean.html, liveTitle: clean.title });
      }
      try {
        if (typeof onExportSuccess === "function") onExportSuccess({ kind: "package", format: kind });
      } catch (_) {
      }
    } catch (error) {
      addToast && addToast(`${kind.toUpperCase()} export failed: ${error?.message || "unknown error"}`, "error");
    } finally {
      if (mountedRef.current) setAltExportBusy("");
    }
  }, [altExportBusy, handleExportQTI, handleExportH5P, handleExportIMS, addToast, qtiAssessments, selectedQtiKey, h5pActivities, selectedH5PKey, getCleanBuilderDocument, onExportSuccess]);
  const runOfficeExport = React.useCallback(async (format) => {
    if (altExportBusy) return;
    const doc = exportPreviewRef.current?.contentDocument;
    if (!doc) return;
    const preflight = runBuilderPreflight(format, false);
    if (preflight.errors) {
      addToast && addToast("Office export stopped: fix the blocking preflight issues first.", "error");
      return;
    }
    setAltExportBusy(format);
    try {
      let api = window.AlloModules?.AccessibleOfficeExport;
      if (!api || typeof api.build !== "function") {
        if (typeof window.__alloEnsurePdfAuditView === "function") {
          await window.__alloEnsurePdfAuditView();
        }
        api = window.AlloModules?.AccessibleOfficeExport;
      }
      if (!api || typeof api.build !== "function") {
        addToast && addToast("The accessible Office exporter is still loading. Try again in a moment.", "info");
        return;
      }
      const clean = getCleanBuilderDocument({ forExport: true });
      if (!clean) throw new Error("The editable preview is not ready.");
      const result = await api.build({ html: clean.html, title: clean.title, format });
      downloadBuilderBlob(result.blob, { fileName: result.fileName, extension: format });
      addToast && addToast(result.message, "success");
    } catch (error) {
      addToast && addToast(`${format.toUpperCase()} export failed: ${error?.message || "unknown error"}`, "error");
    } finally {
      if (mountedRef.current) setAltExportBusy("");
    }
  }, [altExportBusy, exportPreviewRef, runBuilderPreflight, addToast, getCleanBuilderDocument, downloadBuilderBlob]);
  const runExportFromPreview = React.useCallback(async () => {
    const preflight = runBuilderPreflight(exportPreviewMode, false);
    if (preflight.errors) {
      addToast && addToast("Export stopped: fix the blocking preflight issues first.", "error");
      return;
    }
    if (exportActionLockRef.current) return;
    exportActionLockRef.current = true;
    setExportActionBusy(true);
    let resumeReviewComments = () => {
    };
    let resumeTrackedChanges = () => {
    };
    try {
      const liveRoot = exportPreviewRef.current?.contentDocument?.documentElement;
      resumeTrackedChanges = _builderSuspendTrackedChanges(liveRoot);
      resumeReviewComments = _builderSuspendReviewComments(liveRoot);
      const exported = await executeExportFromPreview();
      if (exported !== true) return;
      try {
        if (typeof onExportSuccess === "function") onExportSuccess({ kind: "builder", format: exportPreviewMode });
      } catch (_) {
      }
    } catch (error) {
      if (mountedRef.current) addToast && addToast("Export failed. The builder is still open so you can try again.", "error");
    } finally {
      try {
        resumeReviewComments();
      } catch (_) {
      }
      try {
        resumeTrackedChanges();
      } catch (_) {
      }
      refreshTrackedChanges();
      refreshReviewComments();
      refreshDocumentStats();
      exportActionLockRef.current = false;
      if (mountedRef.current) setExportActionBusy(false);
    }
  }, [executeExportFromPreview, exportPreviewRef, runBuilderPreflight, exportPreviewMode, refreshTrackedChanges, refreshReviewComments, refreshDocumentStats, addToast, onExportSuccess]);
  const handleRadioGroupKeyDown = React.useCallback((e) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) return;
    const radios = Array.from(e.currentTarget.querySelectorAll('[role="radio"]:not([disabled])'));
    if (!radios.length) return;
    e.preventDefault();
    const current = Math.max(0, radios.indexOf(document.activeElement));
    let next = current;
    if (e.key === "Home") next = 0;
    else if (e.key === "End") next = radios.length - 1;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (current - 1 + radios.length) % radios.length;
    else next = (current + 1) % radios.length;
    radios[next].focus();
    radios[next].click();
  }, []);
  const brandProfiles = React.useMemo(() => {
    try {
      const bp = window.AlloModules && window.AlloModules.BrandProfile;
      return bp && typeof bp.listBrandProfiles === "function" ? bp.listBrandProfiles() || [] : [];
    } catch (e) {
      return [];
    }
  }, [showExportPreview]);
  const noBrandsYet = brandProfiles.length === 0;
  const openBrandEditor = React.useCallback(() => {
    if (typeof setShowBrandProfileEditor === "function") setShowBrandProfileEditor(true);
  }, [setShowBrandProfileEditor]);
  const hasGlossary = (history || []).some((h) => h && h.type === "glossary");
  const hasTimeline = (history || []).some((h) => h && h.type === "timeline");
  const hasBrainstorm = (history || []).some((h) => h && h.type === "brainstorm");
  const hasConceptSort = (history || []).some((h) => h && h.type === "concept-sort");
  const hasVennDiagram = (history || []).some((h) => h && h.type === "outline" && h.data && h.data.structureType === "Venn Diagram");
  const hasAssessmentContent = (history || []).some((h) => h && (h.type === "quiz" || h.type === "assessment" || h.type === "stem-assessment"));
  const showDisplayModes = hasGlossary || hasTimeline || hasBrainstorm || hasConceptSort || hasVennDiagram;
  const requestedVennExportMode = ["completed", "activity", "both"].includes(exportConfig.vennExportMode) ? exportConfig.vennExportMode : "completed";
  const effectiveVennExportMode = exportConfig.assessmentMode === true ? "activity" : requestedVennExportMode;
  const textAccessExportReview = React.useMemo(() => {
    const source = Array.isArray(history) ? history : [];
    const toggleForType = {
      analysis: "includeAnalysis",
      simplified: "includeSimplified",
      glossary: "includeGlossary",
      quiz: "includeQuiz",
      outline: "includeOutline",
      faq: "includeFaq",
      "sentence-frames": "includeSentenceFrames",
      image: "includeImage",
      math: "includeMath",
      dbq: "includeDbq",
      "lesson-plan": "includeLessonPlan",
      "udl-advice": "includeUdlAdvice",
      brainstorm: "includeBrainstorm"
    };
    const selected = source.filter((item) => {
      if (!item) return false;
      const key = toggleForType[item.type];
      return !key || exportConfig[key] !== false;
    });
    const profileFor = (item) => {
      const config = item && item.config && typeof item.config === "object" ? item.config : {};
      const raw = item && (item.instructionalText || config.instructionalText || item.textProfile || config.textProfile) || {};
      const role = ["primary", "supplemental", "unspecified"].includes(raw.role) ? raw.role : "unspecified";
      const form = ["original", "same-text-supported", "adapted"].includes(raw.form) ? raw.form : item && item.type === "simplified" ? "adapted" : "original";
      const auth = raw.replacementAuthorization && typeof raw.replacementAuthorization === "object" ? raw.replacementAuthorization : {};
      return { role, form, authorized: auth.authorized === true && auth.source === "educator" };
    };
    const validPrimary = selected.filter((item) => {
      const profile = profileFor(item);
      return profile.role === "primary" && (profile.form !== "adapted" || profile.authorized);
    });
    const supplemental = selected.filter((item) => profileFor(item).role === "supplemental");
    const unspecifiedAdapted = selected.filter((item) => {
      const profile = profileFor(item);
      return profile.role === "unspecified" && profile.form === "adapted";
    });
    const unauthorizedPrimaryAdaptations = selected.filter((item) => {
      const profile = profileFor(item);
      return profile.role === "primary" && profile.form === "adapted" && !profile.authorized;
    });
    return {
      primaryCount: validPrimary.length,
      supplementalCount: supplemental.length,
      unspecifiedAdaptedCount: unspecifiedAdapted.length,
      unauthorizedPrimaryAdaptationCount: unauthorizedPrimaryAdaptations.length,
      supplementalWithoutPrimary: supplemental.length > 0 && validPrimary.length === 0,
      unspecifiedAdaptedWithoutPrimary: unspecifiedAdapted.length > 0 && validPrimary.length === 0
    };
  }, [history, exportConfig]);
  if (!showExportPreview) return null;
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      className: `allo-docsuite fixed inset-0 z-[200] bg-black/60 flex items-stretch justify-center ${isFocusMode ? "p-0" : "p-4"}`,
      role: "presentation",
      onClick: (e) => {
        if (e.target === e.currentTarget) setShowExportPreview(false);
      }
    },
    pendingImageFile && /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "allo-docsuite fixed inset-0 z-[210] bg-black/70 flex items-center justify-center p-4",
        role: "presentation",
        onClick: (e) => {
          if (e.target === e.currentTarget) closeImageDialog();
        }
      },
      /* @__PURE__ */ React.createElement("div", { ref: imageDialogRef, tabIndex: -1, className: "w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl focus-visible:outline focus-visible:outline-4 focus-visible:outline-indigo-700 focus-visible:outline-offset-2", role: "dialog", "aria-modal": "true", "aria-labelledby": "image-description-title", "aria-describedby": "image-description-help" }, /* @__PURE__ */ React.createElement("h3", { id: "image-description-title", className: "text-lg font-black text-slate-900" }, "Describe this image"), /* @__PURE__ */ React.createElement("p", { id: "image-description-help", className: "mt-1 text-sm text-slate-700" }, "Alternative text should communicate the image\u2019s purpose to someone who cannot see it."), /* @__PURE__ */ React.createElement("p", { className: "mt-2 text-xs font-medium text-slate-600 truncate", title: pendingImageFile.name }, pendingImageFile.name), /* @__PURE__ */ React.createElement("label", { htmlFor: "builder-image-alt", className: "mt-4 block text-sm font-bold text-slate-800" }, "Alternative text"), /* @__PURE__ */ React.createElement(
        "textarea",
        {
          id: "builder-image-alt",
          ref: imageAltInputRef,
          value: imageAltText,
          disabled: imageDecorative,
          rows: 3,
          onChange: (e) => {
            setImageAltText(e.target.value);
            setImageAltError("");
          },
          "aria-describedby": "builder-image-alt-help builder-image-alt-error",
          "aria-invalid": imageAltError ? "true" : void 0,
          className: "mt-1 w-full rounded-lg border border-slate-400 px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-slate-100"
        }
      ), /* @__PURE__ */ React.createElement("p", { id: "builder-image-alt-help", className: "mt-1 text-xs text-slate-600" }, "Describe what matters in this document, not every visual detail."), /* @__PURE__ */ React.createElement("label", { className: "mt-3 flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 hover:bg-slate-50" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: imageDecorative, onChange: (e) => {
        setImageDecorative(e.target.checked);
        setImageAltError("");
      } }), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("strong", null, "Decorative image"), " \u2014 it adds no information and should be skipped by screen readers.")), /* @__PURE__ */ React.createElement("p", { id: "builder-image-alt-error", className: "mt-2 min-h-5 text-sm font-bold text-red-700", role: "alert" }, imageAltError), /* @__PURE__ */ React.createElement("div", { className: "mt-4 flex justify-end gap-3" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: closeImageDialog, className: "min-h-11 rounded-lg border border-slate-400 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100" }, "Cancel"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: insertPendingImage, disabled: imageInsertBusy, "aria-busy": imageInsertBusy, className: "min-h-11 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-800 disabled:cursor-wait disabled:opacity-60" }, imageInsertBusy ? "Inserting image..." : "Insert image")))
    ),
    /* @__PURE__ */ React.createElement("div", { ref: exportDialogRef, tabIndex: -1, role: "dialog", "aria-modal": "true", "aria-labelledby": "document-builder-title", className: `relative bg-white shadow-2xl flex flex-col lg:flex-row w-full overflow-y-auto lg:overflow-hidden focus-visible:outline focus-visible:outline-4 focus-visible:outline-indigo-700 focus-visible:outline-offset-2 ${isFocusMode ? "rounded-none max-w-none max-h-none h-full" : "rounded-2xl max-w-[95vw] max-h-[95vh]"}`, inert: pendingImageFile ? true : void 0, "aria-hidden": pendingImageFile ? "true" : void 0, onClick: (e) => e.stopPropagation() }, editingCitationId && /* @__PURE__ */ React.createElement("form", { ref: citationEditorRef, id: "builder-citation-editor", "data-builder-citation-editor": "1", tabIndex: -1, role: "dialog", "aria-modal": "false", "aria-labelledby": "builder-citation-editor-title", "aria-describedby": "builder-citation-editor-help", onSubmit: saveCitationEdit, className: "absolute right-3 top-16 z-[190] flex max-h-[calc(100%-5rem)] w-[min(32rem,calc(100%-1.5rem))] flex-col overflow-hidden rounded-xl border border-cyan-400 bg-white text-slate-800 shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-700" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between gap-3 border-b border-cyan-200 bg-cyan-50 px-3 py-2" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { id: "builder-citation-editor-title", className: "text-sm font-black text-cyan-950" }, "Edit citation"), /* @__PURE__ */ React.createElement("p", { id: "builder-citation-editor-help", className: "mt-0.5 text-[10px] leading-snug text-cyan-900" }, "Combine sources, adjust locators, and control how each source appears. Escape cancels.")), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => closeCitationEditor(true), className: "rounded px-1.5 py-0.5 text-lg leading-none text-slate-500 hover:bg-white", "aria-label": "Close citation editor" }, "?")), /* @__PURE__ */ React.createElement("div", { className: "min-h-0 flex-1 space-y-2 overflow-y-auto p-3" }, citationItemsDraft.map((item, index) => {
      const sourceRecord = documentReferences.sources?.find((source) => source.id === item.sourceId);
      return /* @__PURE__ */ React.createElement("fieldset", { key: item.sourceId + "-" + index, className: "rounded-lg border border-slate-300 bg-slate-50 p-2" }, /* @__PURE__ */ React.createElement("legend", { className: "px-1 text-[9px] font-black uppercase tracking-wide text-slate-600" }, "Source ", index + 1), /* @__PURE__ */ React.createElement("div", { className: "mb-2 flex items-center gap-1" }, /* @__PURE__ */ React.createElement("label", { className: "min-w-0 flex-1 text-[9px] font-bold uppercase text-slate-600" }, "Source", /* @__PURE__ */ React.createElement("select", { value: item.sourceId, onChange: (event) => updateCitationItemDraft(index, { sourceId: event.target.value }), className: "mt-0.5 h-8 w-full rounded border border-slate-300 bg-white px-1.5 text-[10px] font-semibold normal-case text-slate-800", "aria-label": "Source " + (index + 1) + " in citation" }, !sourceRecord && /* @__PURE__ */ React.createElement("option", { value: item.sourceId }, "Missing source ? choose a replacement"), (documentReferences.sources || []).map((source) => {
        const alreadyUsed = citationItemsDraft.some((candidate, candidateIndex) => candidateIndex !== index && candidate.sourceId === source.id);
        return /* @__PURE__ */ React.createElement("option", { key: source.id, value: source.id, disabled: alreadyUsed }, source.title || _builderCitationAuthorKey(source, citationStyle), alreadyUsed ? " ? already cited" : "");
      }))), /* @__PURE__ */ React.createElement("div", { className: "mt-3 flex shrink-0", role: "group", "aria-label": "Reorder source " + (index + 1) }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => moveCitationItemDraft(index, -1), disabled: !index, className: "h-8 w-7 rounded-l border border-slate-300 bg-white text-xs font-black text-slate-700 hover:bg-cyan-50 disabled:opacity-30", "aria-label": "Move source " + (index + 1) + " earlier" }, "?"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => moveCitationItemDraft(index, 1), disabled: index === citationItemsDraft.length - 1, className: "h-8 w-7 border-y border-r border-slate-300 bg-white text-xs font-black text-slate-700 hover:bg-cyan-50 disabled:opacity-30", "aria-label": "Move source " + (index + 1) + " later" }, "?"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => removeCitationItemDraft(index), disabled: citationItemsDraft.length === 1, className: "h-8 rounded-r border-y border-r border-slate-300 bg-white px-2 text-[9px] font-bold text-red-700 hover:bg-red-50 disabled:opacity-30", "aria-label": "Remove source " + (index + 1) + " from citation" }, "Remove"))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 gap-1.5 sm:grid-cols-3" }, /* @__PURE__ */ React.createElement("label", { className: "text-[8px] font-bold uppercase text-slate-600" }, "Prefix", /* @__PURE__ */ React.createElement("input", { value: item.prefix, onChange: (event) => updateCitationItemDraft(index, { prefix: event.target.value.slice(0, 120) }), className: "mt-0.5 h-8 w-full rounded border border-slate-300 bg-white px-2 text-[10px] font-medium normal-case text-slate-800", placeholder: "e.g., see" })), /* @__PURE__ */ React.createElement("label", { className: "text-[8px] font-bold uppercase text-slate-600" }, "Page or locator", /* @__PURE__ */ React.createElement("input", { value: item.locator, onChange: (event) => updateCitationItemDraft(index, { locator: event.target.value.slice(0, 80) }), className: "mt-0.5 h-8 w-full rounded border border-slate-300 bg-white px-2 text-[10px] font-medium normal-case text-slate-800", placeholder: "23 or chap. 2" })), /* @__PURE__ */ React.createElement("label", { className: "text-[8px] font-bold uppercase text-slate-600" }, "Suffix", /* @__PURE__ */ React.createElement("input", { value: item.suffix, onChange: (event) => updateCitationItemDraft(index, { suffix: event.target.value.slice(0, 120) }), className: "mt-0.5 h-8 w-full rounded border border-slate-300 bg-white px-2 text-[10px] font-medium normal-case text-slate-800", placeholder: "e.g., emphasis added" }))), /* @__PURE__ */ React.createElement("div", { className: "mt-2 flex flex-wrap gap-2" }, /* @__PURE__ */ React.createElement("label", { className: "inline-flex min-h-7 cursor-pointer items-center gap-1 rounded border border-slate-200 bg-white px-2 text-[9px] font-semibold text-slate-700" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: item.suppressAuthor, onChange: (event) => updateCitationItemDraft(index, { suppressAuthor: event.target.checked }), className: "accent-cyan-800" }), "Suppress author"), /* @__PURE__ */ React.createElement("label", { className: "inline-flex min-h-7 cursor-pointer items-center gap-1 rounded border border-slate-200 bg-white px-2 text-[9px] font-semibold text-slate-700" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: item.suppressYear, onChange: (event) => updateCitationItemDraft(index, { suppressYear: event.target.checked }), className: "accent-cyan-800" }), "Suppress year")));
    }), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: addCitationItemDraft, disabled: citationItemsDraft.length >= _BUILDER_CITATION_ITEM_LIMIT || citationItemsDraft.length >= (documentReferences.sources?.length || 0), className: "h-8 w-full rounded border border-dashed border-cyan-500 bg-cyan-50 px-2 text-[10px] font-bold text-cyan-900 hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-40" }, "+ Add another source"), /* @__PURE__ */ React.createElement("div", { className: "rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-2" }, /* @__PURE__ */ React.createElement("p", { className: "text-[8px] font-black uppercase tracking-wide text-cyan-800" }, "Preview ? ", _BUILDER_CITATION_STYLES.find((style) => style.id === citationStyle)?.label || citationStyle), /* @__PURE__ */ React.createElement("p", { className: "mt-1 break-words text-[11px] font-semibold text-slate-800", "aria-live": "polite" }, _builderFormatCitationCluster(citationItemsDraft, documentReferences.sources || [], citationStyle))), /* @__PURE__ */ React.createElement("p", { className: "min-h-4 text-[10px] font-bold text-red-700", role: "alert" }, citationEditorError)), /* @__PURE__ */ React.createElement("div", { className: "flex justify-end gap-2 border-t border-slate-200 bg-white px-3 py-2" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => closeCitationEditor(true), className: "h-9 rounded border border-slate-300 bg-white px-3 text-[10px] font-bold text-slate-700 hover:bg-slate-50" }, "Cancel"), /* @__PURE__ */ React.createElement("button", { type: "submit", disabled: !citationItemsDraft.length, className: "h-9 rounded bg-cyan-800 px-4 text-[10px] font-bold text-white hover:bg-cyan-900 disabled:opacity-40" }, "Update citation"))), /* @__PURE__ */ React.createElement("div", { className: `${isFocusMode ? "hidden" : "w-full lg:w-72"} shrink-0 bg-gradient-to-b from-slate-50 to-white border-b lg:border-b-0 lg:border-r border-slate-200 overflow-visible lg:overflow-y-auto p-4 space-y-3` }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-1" }, /* @__PURE__ */ React.createElement("h2", { id: "document-builder-title", className: "text-sm font-black text-slate-800 flex items-center gap-2" }, isAdvancedReview ? "Review Studio" : "Document Builder"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement("button", { onClick: () => {
      if (typeof window.AlloToggleTheme === "function") window.AlloToggleTheme();
    }, className: "p-1.5 rounded-full hover:bg-indigo-50 text-slate-600 transition-colors text-sm", "aria-label": t("a11y.toggle_theme") || "Toggle color theme", title: theme === "contrast" ? t("theme.high_contrast") || "High Contrast" : theme === "dark" ? t("theme.dark") || "Dark Mode" : t("theme.light") || "Light Mode" }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, theme === "contrast" ? "\u{1F441}" : theme === "dark" ? "\u{1F319}" : "\u2600\uFE0F")), /* @__PURE__ */ React.createElement("span", { className: "text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono" }, exportPreviewMode === "worksheet" ? "Worksheet" : exportPreviewMode === "html" ? "HTML" : exportPreviewMode === "slides" ? "Slides" : "PDF"), /* @__PURE__ */ React.createElement("button", { onClick: () => setShowExportPreview(false), className: "p-2 ml-1 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors", "data-help-key": "doc_builder_close_btn", "aria-label": t("a11y.close_doc_builder") }, /* @__PURE__ */ React.createElement(X, { size: 20 })))), exportPreviewSource === "remediation" && /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-1 rounded-lg border border-slate-300 bg-slate-100 p-1", role: "group", "aria-label": "Document Builder workspace" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setBuilderWorkspaceMode?.("author"), "aria-pressed": !isAdvancedReview, className: `min-h-9 rounded-md px-2 text-[11px] font-bold ${!isAdvancedReview ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-300" : "text-slate-600 hover:bg-white"}` }, "Standard"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setBuilderWorkspaceMode?.("advanced-review"), "aria-pressed": isAdvancedReview, className: `min-h-9 rounded-md px-2 text-[11px] font-bold ${isAdvancedReview ? "bg-indigo-700 text-white shadow-sm" : "text-indigo-800 hover:bg-white"}` }, "Advanced Review")), /* @__PURE__ */ React.createElement("button", { type: "button", "aria-controls": "document-builder-preview", onClick: () => exportPreviewRef.current?.focus(), className: "sr-only focus:not-sr-only focus:relative focus:z-10 focus:rounded focus:bg-indigo-700 focus:px-3 focus:py-2 focus:text-sm focus:font-bold focus:text-white" }, "Skip to editable preview"), exportPreviewSource === "remediation" && /* @__PURE__ */ React.createElement("div", { className: "bg-emerald-50 border border-emerald-300 rounded-lg px-2.5 py-1.5 text-[11px] text-emerald-800", role: "status" }, /* @__PURE__ */ React.createElement("span", { className: "font-bold" }, "\u267F ", t("export_preview.remediation_banner_title") || "Editing the remediated document."), " ", t("export_preview.remediation_banner_body") || "Your edits here are saved back into it when you close the builder, so the Tagged PDF / Word / PowerPoint downloads include them."), /* @__PURE__ */ React.createElement("h3", { className: "text-[11px] font-black text-indigo-600 uppercase tracking-[2px] flex items-center gap-2 pt-1" }, /* @__PURE__ */ React.createElement("span", { className: "flex-1 h-px bg-indigo-100" }), "Quick Start", /* @__PURE__ */ React.createElement("span", { className: "flex-1 h-px bg-indigo-100" })), typeof proposeRestyles === "function" && /* @__PURE__ */ React.createElement("details", { open: true, className: "rounded-lg border border-indigo-200 bg-indigo-50 overflow-hidden", "data-help-key": "doc_builder_block_suggestions" }, /* @__PURE__ */ React.createElement("summary", { className: "cursor-pointer list-none px-2.5 py-2 text-[11px] font-black uppercase tracking-wide text-indigo-800 hover:bg-indigo-100" }, "AI block suggestions ", Array.isArray(blockSuggestions) && blockSuggestions.length > 0 ? "(" + blockSuggestions.length + ")" : ""), /* @__PURE__ */ React.createElement("div", { className: "space-y-2 px-2.5 pb-2.5" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] leading-relaxed text-indigo-800" }, "Review the live document here. The AI only selects existing blocks; it never rewrites your text."), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-1.5" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: _suggestBuilderBlocks,
        disabled: blockSuggestionsBusy,
        className: "rounded-lg bg-indigo-700 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-indigo-800 disabled:cursor-wait disabled:opacity-50"
      },
      blockSuggestionsBusy ? "Analyzing..." : "Suggest blocks"
    ), blockSuggestionUndoCount > 0 && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: _undoBuilderBlockSuggestion,
        className: "rounded-lg border border-indigo-300 bg-white px-2.5 py-1.5 text-[10px] font-bold text-indigo-800 hover:bg-indigo-100"
      },
      "Undo last"
    )), blockSuggestionError && /* @__PURE__ */ React.createElement("p", { role: "status", "aria-live": "polite", className: "rounded border border-amber-300 bg-amber-50 px-2 py-1.5 text-[10px] text-amber-900" }, blockSuggestionError), Array.isArray(blockSuggestions) && blockSuggestions.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, blockSuggestions.map((proposal, index) => /* @__PURE__ */ React.createElement("article", { key: (proposal.ref ?? index) + ":" + proposal.kind, className: "rounded-lg border border-indigo-200 bg-white p-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "text-[10px] font-black uppercase text-indigo-800" }, proposal.kind === "heading" ? "Heading" : proposal.kind === "callout" ? "Callout" : "List", proposal.level ? " (H" + proposal.level + ")" : ""), /* @__PURE__ */ React.createElement("p", { className: "mt-0.5 text-[10px] leading-relaxed text-slate-700" }, proposal.reason || "This structure may help readers scan the document.")), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => setBlockSuggestions((current) => current ? current.filter((item) => item !== proposal) : current),
        className: "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-500 hover:bg-slate-100",
        "aria-label": "Dismiss this block suggestion"
      },
      "Dismiss"
    )), /* @__PURE__ */ React.createElement("div", { className: "mt-2 grid gap-1.5 sm:grid-cols-2" }, /* @__PURE__ */ React.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "mb-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500" }, "Before"), /* @__PURE__ */ React.createElement("iframe", { title: "Suggested block before", sandbox: "allow-same-origin", srcDoc: _builderSuggestionPreviewSrcDoc(proposal.original), className: "h-24 w-full rounded border border-slate-200 bg-white" })), /* @__PURE__ */ React.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "mb-0.5 text-[9px] font-bold uppercase tracking-wide text-indigo-700" }, "After"), /* @__PURE__ */ React.createElement("iframe", { title: "Suggested block after", sandbox: "allow-same-origin", srcDoc: _builderSuggestionPreviewSrcDoc(proposal.html), className: "h-24 w-full rounded border border-indigo-300 bg-white" }))), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => _applyBuilderBlockSuggestion(proposal),
        className: "mt-1.5 w-full rounded bg-indigo-700 px-2 py-1.5 text-[10px] font-bold text-white hover:bg-indigo-800"
      },
      "Apply to live document"
    )))), Array.isArray(blockSuggestions) && blockSuggestions.length === 0 && !blockSuggestionError && /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-600" }, "No structure changes suggested for this document."), blockSuggestionDropped > 0 && /* @__PURE__ */ React.createElement("p", { className: "text-[9px] italic text-slate-500" }, blockSuggestionDropped, " additional AI suggestion", blockSuggestionDropped === 1 ? "" : "s", " filtered out by the safety gate."))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-slate-600 uppercase mb-1.5" }, "Presets"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-1" }, Object.entries(BUILT_IN_PRESETS).map(([key, preset]) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key,
        onClick: () => applyExportPreset(preset),
        className: "px-2 py-1 bg-white border border-slate-400 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-indigo-50 hover:border-indigo-600 hover:text-indigo-700 transition-all",
        title: `Apply "${preset.name}" preset`
      },
      preset.emoji,
      " ",
      preset.name
    )), Object.entries(exportPresets).map(([key, preset]) => /* @__PURE__ */ React.createElement("div", { key, className: "flex items-center gap-0.5" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => applyExportPreset(preset),
        className: "px-2 py-1 bg-white border border-violet-600 rounded-l-lg text-[11px] font-bold text-violet-600 hover:bg-violet-50 transition-all",
        title: `Apply "${preset.name}" preset`
      },
      preset.emoji,
      " ",
      preset.name
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => deleteExportPreset(key),
        className: "min-w-6 min-h-6 px-1 py-1 bg-white border border-violet-600 border-l-0 rounded-r-lg text-[11px] text-red-700 hover:text-red-800 hover:bg-red-50 transition-all",
        "aria-label": `Delete "${preset.name}" preset`,
        title: `Delete "${preset.name}" preset`
      },
      /* @__PURE__ */ React.createElement(X, { size: 10 })
    )))), /* @__PURE__ */ React.createElement("button", { onClick: async () => {
      const name = await promptForBuilderText("Enter a name for this export preset.", "", {
        title: "Save export preset",
        confirmText: "Save preset",
        cancelText: "Cancel",
        placeholder: "Preset name",
        maxLength: 80,
        validate: (value) => value.trim() ? null : "Enter a preset name."
      });
      if (name && name.trim()) saveExportPreset(name.trim());
    }, className: "mt-1.5 w-full px-2 py-1.5 border border-dashed border-slate-300 rounded-lg text-[11px] font-bold text-slate-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all" }, "+ Save Current as Preset")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-slate-600 uppercase mb-1.5" }, "Format"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-1", role: "radiogroup", "aria-label": "Export format", onKeyDown: handleRadioGroupKeyDown, "aria-describedby": "doc-builder-format-help" }, [["print", "\u{1F4C4} PDF"], ["worksheet", "\u{1F4DD} Worksheet"], ["html", "\u{1F4BB} HTML"], ["slides", "\u{1F4CA} Slides"]].map(([m, label]) => /* @__PURE__ */ React.createElement("button", { key: m, role: "radio", "aria-checked": exportPreviewMode === m, tabIndex: exportPreviewMode === m ? 0 : -1, onClick: () => setExportPreviewMode(m), className: `flex-1 text-xs font-bold py-1.5 rounded-lg transition-all ${exportPreviewMode === m ? "bg-indigo-600 text-white" : "bg-white border border-slate-400 text-slate-600 hover:bg-slate-100"}` }, label))), /* @__PURE__ */ React.createElement("p", { id: "doc-builder-format-help", className: "mt-1.5 text-[11px] leading-snug text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5", role: "status" }, exportPreviewMode === "worksheet" ? t("export_preview.format_help_worksheet") || "A paper copy for students to write on. Answer boxes become ruled lines and answer choices become bubbles to fill in, and a name and date header is added. Opens your print window, where you can print it or save it as a PDF." : exportPreviewMode === "html" ? t("export_preview.format_help_html") || "One web page students open on a device. Highlighting, notes, drawing and typed answers all work, and save on that device." : exportPreviewMode === "slides" ? t("export_preview.format_help_slides") || "A PowerPoint file you can open in PowerPoint, Keynote or Google Slides." : t("export_preview.format_help_print") || "A finished copy to read or hand out, with everything shown as it is. Opens your print window, where you can print it or save it as a PDF. Pick Worksheet instead if students need blank lines to write on.")), /* @__PURE__ */ React.createElement("h3", { className: "text-[11px] font-black text-indigo-600 uppercase tracking-[2px] flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "flex-1 h-px bg-indigo-100" }), "Appearance", /* @__PURE__ */ React.createElement("span", { className: "flex-1 h-px bg-indigo-100" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-slate-600 uppercase mb-1.5 flex items-center justify-between" }, /* @__PURE__ */ React.createElement("span", null, "Style"), setShowBrandProfileEditor && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: openBrandEditor,
        className: "text-[10px] font-semibold text-rose-700 hover:text-rose-800 underline-offset-2 hover:underline normal-case",
        title: "Create, edit, or delete school brand profiles"
      },
      "\u{1F3F7}\uFE0F Manage brand profiles"
    )), noBrandsYet && setShowBrandProfileEditor && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: openBrandEditor,
        className: "w-full mb-1.5 text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-rose-50 to-orange-50 border border-rose-300 text-rose-800 hover:border-rose-400 hover:from-rose-100 hover:to-orange-100 transition-colors"
      },
      "\u{1F3F7}\uFE0F ",
      /* @__PURE__ */ React.createElement("strong", null, "First time?"),
      " Set up your school brand \u2192 colors, fonts, logo for branded exports"
    ), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-1", role: "radiogroup", "aria-label": "Document style", onKeyDown: handleRadioGroupKeyDown }, Object.entries(STYLE_SEEDS).filter(([, s]) => s.cssVars).map(([key, s]) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key,
        role: "radio",
        "aria-checked": exportTheme === key,
        tabIndex: exportTheme === key ? 0 : -1,
        onClick: () => setExportTheme(key),
        className: `text-[11px] font-bold py-1.5 px-2 rounded-lg transition-all ${exportTheme === key ? "bg-indigo-600 text-white ring-2 ring-indigo-300" : "bg-white border border-slate-400 text-slate-600 hover:bg-slate-100"}`
      },
      s.emoji,
      " ",
      s.name
    )), brandProfiles.map((p) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: p.id,
        role: "radio",
        "aria-checked": exportTheme === p.id,
        tabIndex: exportTheme === p.id ? 0 : -1,
        onClick: () => setExportTheme(p.id),
        className: `text-[11px] font-bold py-1.5 px-2 rounded-lg transition-all ${exportTheme === p.id ? "bg-rose-600 text-white ring-2 ring-rose-300" : "bg-white border border-rose-400 text-rose-700 hover:bg-rose-50"}`,
        title: "School brand profile"
      },
      "\u{1F3F7}\uFE0F ",
      p.name || "Brand"
    )))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-slate-600 uppercase mb-1.5" }, "Typography"), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-xs text-slate-700 mb-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-slate-600 shrink-0" }, "Font:"), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: exportConfig.fontId || (exportConfig.useAppFont ? "app" : "theme"),
        onChange: (e) => {
          const v = e.target.value;
          setExportConfigAndRefresh((p) => ({ ...p, fontId: v, useAppFont: v === "app" }));
        },
        className: "flex-1 px-2 py-1 border border-slate-300 rounded text-xs bg-white",
        "data-help-key": "doc_builder_font_select",
        "aria-label": t("a11y.export_font") || "Export font family"
      },
      /* @__PURE__ */ React.createElement("option", { value: "theme" }, "Theme font (default)"),
      /* @__PURE__ */ React.createElement("option", { value: "app" }, "My app font (", FONT_OPTIONS.find((f) => f.id === selectedFont)?.label || "Default", ")"),
      FONT_OPTIONS.filter((f) => f.id !== "default").map((f) => /* @__PURE__ */ React.createElement("option", { key: f.id, value: f.id }, f.label, f.category === "accessibility" ? " \u267F" : ""))
    )), /* @__PURE__ */ React.createElement("label", { className: "flex items-start gap-2 text-[11px] text-slate-700 mb-2 cursor-pointer" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        className: "mt-0.5 accent-indigo-600",
        checked: !!exportConfig.readerWebFonts,
        onChange: (e) => setExportConfigAndRefresh((p) => ({ ...p, readerWebFonts: e.target.checked })),
        "aria-describedby": "doc-builder-readerfonts-help"
      }
    ), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("span", { className: "font-bold" }, "Let readers pick additional web fonts"), /* @__PURE__ */ React.createElement("span", { id: "doc-builder-readerfonts-help", className: "block text-slate-600" }, "Adds accessibility, multilingual, sans-serif, serif and monospace web fonts to the menu inside the exported page. They are downloaded when the page opens, so leave this off for offline use or if your district blocks outside requests. The nine built-in fonts always work offline."))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-slate-600 shrink-0" }, "Size:"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "range",
        min: 12,
        max: 24,
        value: exportConfig.fontSize,
        onChange: (e) => setExportConfigAndRefresh((p) => ({ ...p, fontSize: parseInt(e.target.value) })),
        className: "flex-1 accent-indigo-600",
        "data-help-key": "doc_builder_font_size_slider",
        "aria-label": t("a11y.font_size")
      }
    ), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-mono text-slate-600 w-8" }, exportConfig.fontSize, "px")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mt-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-slate-600 shrink-0" }, "Margins:"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-1 flex-1" }, [
      { label: "Narrow", val: "0.5in" },
      { label: "Normal", val: "1in" },
      { label: "Wide", val: "1.5in" }
    ].map((m) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: m.label,
        type: "button",
        "aria-pressed": pageSetup.margin === m.val,
        onClick: () => {
          applyPageMargin(m.val);
          setExportConfigAndRefresh((p) => ({ ...p, pageMargin: m.val }));
        },
        className: `flex-1 text-[11px] font-bold py-1 border rounded transition-colors ${pageSetup.margin === m.val ? "bg-indigo-600 text-white border-indigo-700" : "text-slate-600 bg-white border-slate-400 hover:bg-indigo-50 hover:text-indigo-700"}`,
        title: `${m.label} margins (${m.val})`,
        "aria-label": `Set ${m.label} page margins`
      },
      m.label
    )))), exportPreviewMode === "worksheet" && /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 mt-2 text-xs text-slate-700", htmlFor: "alloflow-worksheet-response-space" }, /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-slate-600 shrink-0" }, "Writing space:"), /* @__PURE__ */ React.createElement(
      "select",
      {
        id: "alloflow-worksheet-response-space",
        value: ["compact", "standard", "extended"].includes(exportConfig.worksheetResponseSpace) ? exportConfig.worksheetResponseSpace : "standard",
        onChange: (e) => setExportConfigAndRefresh((p) => ({ ...p, worksheetResponseSpace: e.target.value })),
        className: "flex-1 px-2 py-1 border border-slate-300 rounded text-xs bg-white"
      },
      /* @__PURE__ */ React.createElement("option", { value: "compact" }, "Compact \u2014 fewer pages"),
      /* @__PURE__ */ React.createElement("option", { value: "standard" }, "Standard"),
      /* @__PURE__ */ React.createElement("option", { value: "extended" }, "Extended \u2014 more room")
    ))), /* @__PURE__ */ React.createElement("div", { className: "bg-slate-50 rounded-lg border border-slate-400 p-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-1" }, /* @__PURE__ */ React.createElement("span", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Word Count"), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] font-mono text-slate-600", "aria-live": "polite" }, wordCount.toLocaleString(), " words")), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2" }, /* @__PURE__ */ React.createElement("label", { className: "text-[11px] text-slate-600 shrink-0", htmlFor: "word-goal-input" }, "Goal:"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "number",
        id: "word-goal-input",
        min: "0",
        step: "50",
        placeholder: "e.g. 500",
        value: wordGoal || "",
        className: "flex-1 text-[11px] border border-slate-400 rounded px-2 py-1 bg-white",
        "aria-label": t("a11y.target_word_count"),
        onChange: (e) => setWordGoal(Math.max(0, parseInt(e.target.value, 10) || 0))
      }
    )), /* @__PURE__ */ React.createElement("div", { className: "w-full bg-slate-200 rounded-full h-1.5 mt-1.5 overflow-hidden", role: "progressbar", "aria-label": t("a11y.word_count_progress"), "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": wordGoalProgress.percent, "aria-valuetext": wordGoalProgress.goal > 0 ? `${wordGoalProgress.count} of ${wordGoalProgress.goal} words (${wordGoalProgress.percent}%)` : "No word-count goal set" }, /* @__PURE__ */ React.createElement("div", { id: "word-goal-bar", className: "h-full rounded-full transition-all duration-300", style: { width: wordGoalProgress.percent + "%", background: wordGoalProgress.percent >= 100 ? "#16a34a" : wordGoalProgress.percent >= 75 ? "#2563eb" : "#d97706" } })), /* @__PURE__ */ React.createElement("div", { id: "word-goal-label", className: "text-[11px] text-slate-600 mt-0.5" }, wordGoalProgress.goal > 0 ? `${wordGoalProgress.count} / ${wordGoalProgress.goal} (${wordGoalProgress.percent}%)` : ""), /* @__PURE__ */ React.createElement("div", { className: "text-[11px] text-slate-600 mt-1" }, "\u2328 Ctrl+1/2/3 = headings \xB7 Ctrl+K = link \xB7 Ctrl+Shift+L = list")), /* @__PURE__ */ React.createElement("h3", { className: "text-[11px] font-black text-indigo-600 uppercase tracking-[2px] flex items-center gap-2 pt-1" }, /* @__PURE__ */ React.createElement("span", { className: "flex-1 h-px bg-indigo-100" }), "Word Art", /* @__PURE__ */ React.createElement("span", { className: "flex-1 h-px bg-indigo-100" })), /* @__PURE__ */ React.createElement("div", { className: "bg-gradient-to-br from-amber-50 to-rose-50 rounded-lg border border-amber-200 p-2 space-y-2" }, /* @__PURE__ */ React.createElement("input", { type: "text", id: "wordart-text-input", placeholder: t("placeholders.word_art_text_input"), defaultValue: "", className: "w-full text-xs border border-amber-300 rounded px-2 py-1.5 bg-white focus:border-amber-500 outline-none", "aria-label": t("a11y.word_art_text") }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-[10px] font-bold text-slate-600 uppercase mb-1" }, "Style"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-3 gap-1", role: "radiogroup", "aria-label": t("a11y.word_art_style"), onKeyDown: handleRadioGroupKeyDown }, [["goldFoil", "\u2728", "Gold"], ["neonGlow", "\u{1F4A1}", "Neon"], ["retroArcade", "\u{1F579}\uFE0F", "Retro"], ["chalkboard", "\u{1F58D}\uFE0F", "Chalk"], ["embossed", "\u{1F3DB}\uFE0F", "3D"], ["rainbow", "\u{1F308}", "Rainbow"]].map(([key, emoji, label], i) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key,
        type: "button",
        role: "radio",
        "aria-checked": i === 0,
        tabIndex: i === 0 ? 0 : -1,
        "data-wa-preset": key,
        className: "wordart-preset-btn text-[10px] font-bold py-1.5 px-1 rounded-md border text-slate-700 transition-all",
        style: i === 0 ? { background: "#b45309", color: "white", borderColor: "#b45309" } : { background: "white", borderColor: "#fcd34d" },
        onClick: (e) => {
          const parent = e.currentTarget.parentElement;
          if (!parent) return;
          parent.querySelectorAll(".wordart-preset-btn").forEach((b) => {
            b.setAttribute("aria-checked", "false");
            b.tabIndex = -1;
            b.style.background = "white";
            b.style.color = "";
            b.style.borderColor = "#fcd34d";
          });
          e.currentTarget.setAttribute("aria-checked", "true");
          e.currentTarget.tabIndex = 0;
          e.currentTarget.style.background = "#b45309";
          e.currentTarget.style.color = "white";
          e.currentTarget.style.borderColor = "#f59e0b";
        }
      },
      emoji,
      " ",
      label
    )))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "text-[10px] font-bold text-slate-600 uppercase mb-1" }, "Size"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-0.5", role: "radiogroup", "aria-label": t("a11y.word_art_size"), onKeyDown: handleRadioGroupKeyDown }, ["S", "M", "L", "XL"].map((s) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: s,
        type: "button",
        role: "radio",
        "aria-checked": s === "L",
        tabIndex: s === "L" ? 0 : -1,
        "data-wa-size": s,
        className: "wordart-size-btn flex-1 text-[10px] font-bold py-1 rounded border border-slate-400 transition-all",
        style: s === "L" ? { background: "#4f46e5", color: "white", borderColor: "#4f46e5" } : { background: "white", color: "#475569" },
        onClick: (e) => {
          const parent = e.currentTarget.parentElement;
          if (!parent) return;
          parent.querySelectorAll(".wordart-size-btn").forEach((b) => {
            b.setAttribute("aria-checked", "false");
            b.tabIndex = -1;
            b.style.background = "white";
            b.style.color = "#475569";
            b.style.borderColor = "#e2e8f0";
          });
          e.currentTarget.setAttribute("aria-checked", "true");
          e.currentTarget.tabIndex = 0;
          e.currentTarget.style.background = "#4f46e5";
          e.currentTarget.style.color = "white";
          e.currentTarget.style.borderColor = "#4f46e5";
        }
      },
      s
    )))), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "text-[10px] font-bold text-slate-600 uppercase mb-1" }, "Align"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-0.5", role: "radiogroup", "aria-label": t("a11y.word_art_alignment"), onKeyDown: handleRadioGroupKeyDown }, [["left", "\u21E4"], ["center", "\u21D4"], ["right", "\u21E5"]].map(([a, icon]) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: a,
        type: "button",
        role: "radio",
        "aria-checked": a === "center",
        tabIndex: a === "center" ? 0 : -1,
        "data-wa-align": a,
        "aria-label": `Align ${a}`,
        className: "wordart-align-btn flex-1 text-[10px] font-bold py-1 rounded border border-slate-400 transition-all",
        style: a === "center" ? { background: "#4f46e5", color: "white", borderColor: "#4f46e5" } : { background: "white", color: "#475569" },
        onClick: (e) => {
          const parent = e.currentTarget.parentElement;
          if (!parent) return;
          parent.querySelectorAll(".wordart-align-btn").forEach((b) => {
            b.setAttribute("aria-checked", "false");
            b.tabIndex = -1;
            b.style.background = "white";
            b.style.color = "#475569";
            b.style.borderColor = "#e2e8f0";
          });
          e.currentTarget.setAttribute("aria-checked", "true");
          e.currentTarget.tabIndex = 0;
          e.currentTarget.style.background = "#4f46e5";
          e.currentTarget.style.color = "white";
          e.currentTarget.style.borderColor = "#4f46e5";
        }
      },
      icon
    ))))), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => {
          const textInput = document.getElementById("wordart-text-input");
          const text = textInput && textInput.value ? textInput.value.trim() : "";
          if (!text) {
            addToast("Please enter word art text first", "info");
            return;
          }
          const presetBtn = document.querySelector('.wordart-preset-btn[aria-checked="true"]');
          const sizeBtn = document.querySelector('.wordart-size-btn[aria-checked="true"]');
          const alignBtn = document.querySelector('.wordart-align-btn[aria-checked="true"]');
          const preset = presetBtn ? presetBtn.getAttribute("data-wa-preset") : "goldFoil";
          const size = sizeBtn ? sizeBtn.getAttribute("data-wa-size") : "L";
          const align = alignBtn ? alignBtn.getAttribute("data-wa-align") : "center";
          const iframe = exportPreviewRef.current;
          const doc = iframe && iframe.contentDocument;
          if (!doc || !doc.body) {
            addToast("Preview not ready yet", "error");
            return;
          }
          let html = "";
          if (window.AlloWordArt && typeof window.AlloWordArt.render === "function") {
            html = window.AlloWordArt.render(text, preset, size, align);
          } else {
            const P = { goldFoil: "background:linear-gradient(135deg,#b45309 0%,#f59e0b 30%,#fde68a 50%,#f59e0b 70%,#92400e 100%);-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:900;", neonGlow: "color:#0891b2;text-shadow:0 0 4px #06b6d4,0 0 8px #06b6d4,0 0 15px #0e7490;font-weight:900;", retroArcade: "color:#fef2f2;text-shadow:3px 3px 0 #dc2626,6px 6px 0 #1e3a8a;font-weight:900;font-family:Impact,'Arial Black',sans-serif;letter-spacing:0.03em;", chalkboard: "color:#fef3c7;text-shadow:0 0 2px #fbbf24,2px 2px 0 rgba(0,0,0,0.2);font-family:'Caveat','Comic Sans MS',cursive;font-weight:700;letter-spacing:0.05em;", embossed: "color:#475569;text-shadow:-1px -1px 0 rgba(255,255,255,0.8),1px 1px 0 rgba(0,0,0,0.35),2px 2px 4px rgba(0,0,0,0.2);font-weight:900;", rainbow: "background:linear-gradient(90deg,#dc2626,#ea580c,#ca8a04,#16a34a,#0891b2,#4f46e5,#9333ea);-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:900;" };
            const sz = { S: "1.5rem", M: "2.5rem", L: "4rem", XL: "6rem" };
            const safe = String(text).replace(/[<>&]/g, (c) => c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&amp;");
            const inner = '<span style="display:inline-block;font-size:' + (sz[size] || sz.L) + ";line-height:1.1;" + (P[preset] || P.goldFoil) + '">' + safe + "</span>";
            const wrapped = preset === "chalkboard" ? '<span style="display:inline-block;background:#14532d;padding:1rem 1.5rem;border-radius:8px;border:3px solid #78350f;">' + inner + "</span>" : inner;
            html = '<div class="alloflow-wordart" data-wa-preset="' + preset + '" data-wa-size="' + size + '" data-wa-align="' + align + '" role="heading" aria-level="2" style="margin:1.5em 0;text-align:' + align + '">' + wrapped + "</div>";
          }
          if (!html) {
            addToast("Could not render word art", "error");
            return;
          }
          iframe.contentWindow.focus();
          try {
            doc.designMode = "on";
          } catch (e) {
          }
          const sel = doc.getSelection();
          const bodyEl = doc.body;
          const anchor = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).commonAncestorContainer : null;
          const cursorInsideBody = anchor && (anchor === bodyEl || bodyEl.contains && bodyEl.contains(anchor.nodeType === 1 ? anchor : anchor.parentNode));
          if (!cursorInsideBody) {
            const main = doc.querySelector("main") || bodyEl;
            const range = doc.createRange();
            range.selectNodeContents(main);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
          }
          let inserted = false;
          try {
            inserted = doc.execCommand("insertHTML", false, html);
          } catch (e) {
          }
          if (!inserted) {
            const wrap = doc.createElement("div");
            wrap.innerHTML = html;
            const node = wrap.firstChild;
            if (node) doc.body.appendChild(node);
          }
          try {
            if (doc.body) {
              doc.body.setAttribute("data-allo-user-edited", "1");
              doc.body.dispatchEvent(new doc.defaultView.Event("input", { bubbles: true }));
            }
          } catch (_) {
          }
          if (textInput) textInput.value = "";
          addToast("\u2728 Word art inserted", "success");
        },
        className: "w-full px-3 py-2 bg-gradient-to-r from-amber-700 to-rose-700 hover:from-amber-800 hover:to-rose-800 text-white rounded-lg text-[11px] font-bold transition-all shadow-sm hover:shadow-md"
      },
      "\u2728 Insert Word Art"
    )), /* @__PURE__ */ React.createElement("h3", { className: "text-[11px] font-black text-indigo-600 uppercase tracking-[2px] flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "flex-1 h-px bg-indigo-100" }), "Content", /* @__PURE__ */ React.createElement("span", { className: "flex-1 h-px bg-indigo-100" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-1.5" }, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Include Resources"), (() => {
      const resourceKeys = ["includeAnalysis", "includeSimplified", "includeGlossary", "includeQuiz", "includeOutline", "includeFaq", "includeSentenceFrames", "includeImage", "includeMath", "includeDbq", "includeLessonPlan", "includeUdlAdvice", "includeBrainstorm"];
      const allOn = resourceKeys.every((k) => exportConfig[k]);
      return history.some((h) => h) && /* @__PURE__ */ React.createElement("button", { onClick: () => {
        const update = {};
        resourceKeys.forEach((k) => {
          update[k] = !allOn;
        });
        setExportConfigAndRefresh((p) => ({ ...p, ...update }));
      }, className: "text-[11px] font-bold text-indigo-700 hover:text-indigo-800 transition-colors" }, allOn ? "Deselect All" : "Select All");
    })()), /* @__PURE__ */ React.createElement("div", { className: "space-y-1" }, (() => {
      const teacherOnlyDefault = /* @__PURE__ */ new Set(["includeAnalysis", "includeUdlAdvice", "includeBrainstorm"]);
      const available = [
        ["includeAnalysis", "\u{1F4CA} Source Analysis", "analysis"],
        ["includeSimplified", "\u{1F4D6} Adapted Text", "simplified"],
        ["includeGlossary", "\u{1F4DA} Glossary", "glossary"],
        ["includeQuiz", "\u2753 Quiz", "quiz"],
        ["includeOutline", "\u{1F5C2}\uFE0F Graphic Organizer", "outline"],
        ["includeFaq", "\u{1F4AC} FAQ", "faq"],
        ["includeSentenceFrames", "\u270D\uFE0F Sentence Frames", "sentence-frames"],
        ["includeImage", "\u{1F3A8} Visual Support", "image"],
        ["includeMath", "\u{1F522} Math", "math"],
        ["includeDbq", "\u{1F4DC} DBQ", "dbq"],
        ["includeLessonPlan", "\u{1F4CB} Lesson Plan", "lesson-plan"],
        ["includeUdlAdvice", "\u{1F9E9} UDL Advice", "udl-advice"],
        ["includeBrainstorm", "\u{1F4A1} Brainstorm", "brainstorm"]
      ].filter(([, , type]) => history.some((h) => h && h.type === type));
      if (available.length === 0) return /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-600 italic px-1 py-2" }, "No resources generated yet. Generate resources first, then choose which to include in your document.");
      return available.map(([key, label]) => {
        const isTeacherOnly = teacherOnlyDefault.has(key);
        const tooltip = isTeacherOnly ? "Always included in teacher copy. Toggle to also include in student copy." : "";
        const showCloze = key === "includeSimplified" && exportPreviewMode === "worksheet" && exportConfig.includeSimplified && history.some((h) => h && h.type === "glossary");
        return /* @__PURE__ */ React.createElement(React.Fragment, { key }, /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5", title: tooltip }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: exportConfig[key], onChange: (e) => setExportConfigAndRefresh((p) => ({ ...p, [key]: e.target.checked })), className: "rounded" }), /* @__PURE__ */ React.createElement("span", null, label, isTeacherOnly && /* @__PURE__ */ React.createElement("span", { className: "ml-1 text-[11px] text-indigo-700 font-bold" }, "(also in student copy)"))), showCloze && /* @__PURE__ */ React.createElement("label", { className: "flex items-start gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5 ml-5", title: "Blanks out the glossary words in the passage and adds a word bank. The answer key rides with the teacher copy." }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: !!exportConfig.clozeWorksheet, onChange: (e) => setExportConfigAndRefresh((p) => ({ ...p, clozeWorksheet: e.target.checked })), className: "rounded mt-0.5" }), /* @__PURE__ */ React.createElement("span", null, "\u270F\uFE0F Fill in the blanks", /* @__PURE__ */ React.createElement("span", { className: "block text-[11px] text-slate-600 leading-tight" }, "Blanks the glossary words and adds a word bank."))));
      });
    })())), (textAccessExportReview.supplementalWithoutPrimary || textAccessExportReview.unspecifiedAdaptedWithoutPrimary || textAccessExportReview.unauthorizedPrimaryAdaptationCount > 0) && /* @__PURE__ */ React.createElement("div", { className: "rounded-lg border border-amber-300 bg-amber-50 p-2", role: "status", "aria-live": "polite" }, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] font-bold text-amber-950" }, "Text-access review before sharing"), textAccessExportReview.supplementalWithoutPrimary && /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-[11px] leading-snug text-amber-900" }, "The current student selection includes ", textAccessExportReview.supplementalCount, " supplemental text", textAccessExportReview.supplementalCount === 1 ? "" : "s", " but no designated primary text. Confirm that students will receive the intended primary separately, or include it in this export."), textAccessExportReview.unspecifiedAdaptedWithoutPrimary && /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-[11px] leading-snug text-amber-900" }, "The current student selection includes ", textAccessExportReview.unspecifiedAdaptedCount, " adapted text", textAccessExportReview.unspecifiedAdaptedCount === 1 ? "" : "s", " whose instructional role is not set, and no designated primary text. Confirm the intended relationship before distribution."), textAccessExportReview.unauthorizedPrimaryAdaptationCount > 0 && /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-[11px] leading-snug text-amber-900" }, "An adapted text is marked primary without an explicit educator replacement decision. Keep it supplemental or update the designation before distribution."), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-[10px] text-amber-800" }, "This notice is advisory and does not make an IEP or legal-compliance determination.")), (() => {
      const skipped = getSkippedResources();
      if (skipped.length === 0) return null;
      const skippedTypes = new Set((Array.isArray(history) ? history : []).filter((item) => item && (item.type === "adventure" || item.type === "persona")).map((item) => item.type));
      return /* @__PURE__ */ React.createElement("div", { className: "bg-amber-50 border border-amber-200 rounded-lg p-2" }, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] font-bold text-amber-700 mb-1" }, "Interactive resources not included:"), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-amber-600" }, skipped.join(", ")), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-amber-700 mt-1 italic" }, "These are interactive tools that can't be rendered as static documents."), skippedTypes.has("adventure") && /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-amber-800 mt-1" }, "\u{1F4D6} Adventure stories have their own export: open the adventure and use ", /* @__PURE__ */ React.createElement("strong", null, "Export Storybook"), " for a finished, self-contained HTML book (optionally narrated with saved TTS)."), skippedTypes.has("persona") && /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-amber-800 mt-1" }, "\u{1F3AD} Persona conversations: use ", /* @__PURE__ */ React.createElement("strong", null, "Save private session"), " in the persona view \u2014 downloads a private JSON artifact plus a read-anywhere HTML transcript with narration."));
    })(), /* @__PURE__ */ React.createElement("h3", { className: "text-[11px] font-black text-indigo-600 uppercase tracking-[2px] flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "flex-1 h-px bg-indigo-100" }), "Export", /* @__PURE__ */ React.createElement("span", { className: "flex-1 h-px bg-indigo-100" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-slate-600 uppercase mb-1.5" }, "Options"), /* @__PURE__ */ React.createElement("div", { className: "space-y-1" }, /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: exportConfig.includeTeacherKey, onChange: (e) => setExportConfigAndRefresh((p) => ({ ...p, includeTeacherKey: e.target.checked })), className: "rounded" }), "\u{1F4CE} Teacher Answer Key"), exportPreviewMode === "html" && exportConfig.includeTeacherKey && exportConfig.assessmentMode !== true && /* @__PURE__ */ React.createElement("div", { className: "ml-5 rounded-lg border border-emerald-200 bg-emerald-50 p-2" }, /* @__PURE__ */ React.createElement("label", { className: "flex items-start gap-2 text-xs font-semibold text-emerald-950 cursor-pointer" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: exportConfig.separateTeacherStudentFiles !== false, onChange: (e) => setExportConfigAndRefresh((p) => ({ ...p, separateTeacherStudentFiles: e.target.checked })), className: "mt-0.5 rounded" }), /* @__PURE__ */ React.createElement("span", null, "Separate student + teacher files ", /* @__PURE__ */ React.createElement("span", { className: "font-normal" }, "(recommended)"))), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-[10px] leading-snug text-emerald-900" }, "The STUDENT HTML downloads separately with the answer-key appendix removed. Answers stay in a private TEACHER download; project data is included when a private teacher ZIP can be created."), exportConfig.separateTeacherStudentFiles === false && /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-[10px] font-bold leading-snug text-rose-700" }, "The combined HTML will contain answers. Do not share it with students.")), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: exportConfig.includeStudentResponses, onChange: (e) => setExportConfigAndRefresh((p) => ({ ...p, includeStudentResponses: e.target.checked })), className: "rounded" }), "\u{1F4DD} Student Responses"), /* @__PURE__ */ React.createElement("div", { className: "mt-2 rounded-lg border border-indigo-200 bg-indigo-50 p-2" }, /* @__PURE__ */ React.createElement("label", { className: "block text-[11px] font-bold text-indigo-900", htmlFor: "alloflow-export-due-at" }, "Assignment due date and time (optional)"), /* @__PURE__ */ React.createElement("input", { id: "alloflow-export-due-at", type: "datetime-local", value: exportConfig.dueAt ? (() => {
      try {
        const d = new Date(exportConfig.dueAt);
        return Number.isFinite(d.getTime()) ? new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16) : "";
      } catch (_) {
        return "";
      }
    })() : "", onChange: (e) => {
      const raw = String(e.target.value || "").trim();
      if (!raw) {
        setExportConfigAndRefresh((p) => ({ ...p, dueAt: "", dueTimeZone: "" }));
        return;
      }
      const parsed = new Date(raw);
      if (!Number.isFinite(parsed.getTime())) return;
      let zone = "";
      try {
        zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      } catch (_) {
      }
      setExportConfigAndRefresh((p) => ({ ...p, dueAt: parsed.toISOString(), dueTimeZone: zone }));
    }, className: "mt-1 w-full rounded border border-indigo-300 bg-white px-2 py-1.5 text-xs text-slate-800", "aria-describedby": "alloflow-export-due-help" }), /* @__PURE__ */ React.createElement("div", { id: "alloflow-export-due-help", className: "mt-1 text-[10px] leading-snug text-indigo-800" }, "Late status is calculated only when this exact instant and a submission timestamp are available. The browser records your IANA timezone; missing work is never inferred here."), exportConfig.dueAt && /* @__PURE__ */ React.createElement("button", { type: "button", className: "mt-1 text-[10px] font-semibold text-indigo-800 underline", onClick: () => setExportConfigAndRefresh((p) => ({ ...p, dueAt: "", dueTimeZone: "" })) }, "Clear due date")), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5", title: "For graded work: removes the hidden self-check answers and the 'Check my answers' button from the exported file, and leaves the teacher key out even if it's checked above. Students can still fill in and save/submit their answers \u2014 they just can't look up or self-grade against the key." }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: exportConfig.assessmentMode === true, onChange: (e) => setExportConfigAndRefresh((p) => ({ ...p, assessmentMode: e.target.checked })), className: "rounded" }), "\u{1F512} Assessment mode (no embedded answers)"), /* @__PURE__ */ React.createElement("label", { className: `flex items-center gap-2 text-xs text-slate-700 rounded px-1 py-0.5 ${exportPreviewMode === "html" && exportConfig.includeTeacherKey && exportConfig.assessmentMode !== true && exportConfig.separateTeacherStudentFiles !== false ? "opacity-70 cursor-not-allowed" : "cursor-pointer hover:bg-white"}`, title: "Embeds generated read-aloud audio inside the HTML instead of placing audio files beside it." }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: !!exportConfig.singleFileHtml || exportPreviewMode === "html" && exportConfig.includeTeacherKey && exportConfig.assessmentMode !== true && exportConfig.separateTeacherStudentFiles !== false, disabled: exportPreviewMode === "html" && exportConfig.includeTeacherKey && exportConfig.assessmentMode !== true && exportConfig.separateTeacherStudentFiles !== false, onChange: (e) => setExportConfigAndRefresh((p) => ({ ...p, singleFileHtml: e.target.checked })), className: "rounded" }), "\u{1F50A} Embed generated audio in HTML"))), showDisplayModes && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-slate-600 uppercase mb-1.5" }, "Display modes"), hasGlossary && /* @__PURE__ */ React.createElement("div", { className: `mb-2 ${exportConfig.includeGlossary ? "" : "opacity-50"}` }, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-semibold text-slate-700 mb-1 px-1" }, "Glossary"), /* @__PURE__ */ React.createElement("div", { className: "space-y-0.5" }, /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5" }, /* @__PURE__ */ React.createElement("input", { type: "radio", name: "glossaryDisplayMode", checked: (exportConfig.glossaryDisplayMode || "table") === "table", onChange: () => setExportConfigAndRefresh((p) => ({ ...p, glossaryDisplayMode: "table" })), disabled: !exportConfig.includeGlossary }), "Table (default)"), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5" }, /* @__PURE__ */ React.createElement("input", { type: "radio", name: "glossaryDisplayMode", checked: exportConfig.glossaryDisplayMode === "flash-cards", onChange: () => setExportConfigAndRefresh((p) => ({ ...p, glossaryDisplayMode: "flash-cards" })), disabled: !exportConfig.includeGlossary }), "\u{1F0CF} Flash cards (fold-and-cut for paper, flip for digital)"), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5" }, /* @__PURE__ */ React.createElement("input", { type: "radio", name: "glossaryDisplayMode", checked: exportConfig.glossaryDisplayMode === "language-cards", onChange: () => setExportConfigAndRefresh((p) => ({ ...p, glossaryDisplayMode: "language-cards" })), disabled: !exportConfig.includeGlossary }), "\u{1F310} Language cards (emphasizes translations)")), (exportConfig.glossaryDisplayMode || "table") === "table" && /* @__PURE__ */ React.createElement("div", { className: "mt-2 pl-1" }, /* @__PURE__ */ React.createElement("div", { className: "text-[10px] font-semibold text-slate-500 mb-1" }, "Image size"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-1" }, [
      { v: "small", label: "S", px: 40 },
      { v: "medium", label: "M", px: 64 },
      { v: "large", label: "L", px: 96 },
      { v: "xl", label: "XL", px: 140 }
    ].map((opt) => {
      const cur = exportConfig.glossaryImageSize || "medium";
      const isActive = cur === opt.v;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: opt.v,
          type: "button",
          disabled: !exportConfig.includeGlossary,
          onClick: () => setExportConfigAndRefresh((p) => ({ ...p, glossaryImageSize: opt.v })),
          title: opt.label + " (" + opt.px + " px)",
          "aria-label": "Glossary image size " + opt.label + " " + opt.px + " pixels",
          "aria-pressed": isActive,
          className: "px-2 py-0.5 rounded text-[10px] font-bold border transition-colors " + (isActive ? "bg-emerald-600 text-white border-emerald-700" : "bg-white text-slate-600 border-slate-300 hover:bg-emerald-50")
        },
        opt.label
      );
    })))), hasTimeline && /* @__PURE__ */ React.createElement("div", { className: "mb-2" }, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-semibold text-slate-700 mb-1 px-1" }, "Timeline"), /* @__PURE__ */ React.createElement("div", { className: "space-y-0.5" }, /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5" }, /* @__PURE__ */ React.createElement("input", { type: "radio", name: "timelineDisplayMode", checked: (exportConfig.timelineDisplayMode || "list") === "list", onChange: () => setExportConfigAndRefresh((p) => ({ ...p, timelineDisplayMode: "list" })) }), "List (default)"), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5" }, /* @__PURE__ */ React.createElement("input", { type: "radio", name: "timelineDisplayMode", checked: exportConfig.timelineDisplayMode === "cuttable-strips", onChange: () => setExportConfigAndRefresh((p) => ({ ...p, timelineDisplayMode: "cuttable-strips" })) }), "\u2702 Cuttable chronology strips")), /* @__PURE__ */ React.createElement("div", { className: "mt-2 pl-1" }, /* @__PURE__ */ React.createElement("div", { className: "text-[10px] font-semibold text-slate-500 mb-1" }, "Image size"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-1" }, [
      { v: "small", label: "S", px: 48 },
      { v: "medium", label: "M", px: 64 },
      { v: "large", label: "L", px: 96 },
      { v: "xl", label: "XL", px: 140 }
    ].map((opt) => {
      const cur = exportConfig.timelineImageSize || "medium";
      const isActive = cur === opt.v;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: opt.v,
          type: "button",
          onClick: () => setExportConfigAndRefresh((p) => ({ ...p, timelineImageSize: opt.v })),
          title: opt.label + " (" + opt.px + " px)",
          "aria-label": "Timeline image size " + opt.label + " " + opt.px + " pixels",
          "aria-pressed": isActive,
          className: "px-2 py-0.5 rounded text-[10px] font-bold border transition-colors " + (isActive ? "bg-indigo-600 text-white border-indigo-700" : "bg-white text-slate-600 border-slate-300 hover:bg-indigo-50")
        },
        opt.label
      );
    })))), hasBrainstorm && /* @__PURE__ */ React.createElement("div", { className: `mb-2 ${exportConfig.includeBrainstorm ? "" : "opacity-50"}` }, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-semibold text-slate-700 mb-1 px-1" }, "Brainstorm"), /* @__PURE__ */ React.createElement("div", { className: "space-y-0.5" }, /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5" }, /* @__PURE__ */ React.createElement("input", { type: "radio", name: "brainstormDisplayMode", checked: (exportConfig.brainstormDisplayMode || "grid") === "grid", onChange: () => setExportConfigAndRefresh((p) => ({ ...p, brainstormDisplayMode: "grid" })), disabled: !exportConfig.includeBrainstorm }), "Card grid (default)"), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5" }, /* @__PURE__ */ React.createElement("input", { type: "radio", name: "brainstormDisplayMode", checked: exportConfig.brainstormDisplayMode === "mindmap", onChange: () => setExportConfigAndRefresh((p) => ({ ...p, brainstormDisplayMode: "mindmap" })), disabled: !exportConfig.includeBrainstorm }), "\u{1F31F} Mind-map graphic organizer"))), hasVennDiagram && /* @__PURE__ */ React.createElement("div", { className: `mb-2 ${exportConfig.includeOutline ? "" : "opacity-50"}` }, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-semibold text-slate-700 mb-1 px-1" }, "Venn diagram"), /* @__PURE__ */ React.createElement("div", { className: "space-y-0.5" }, [["completed", "\u2705 Completed reference"], ["activity", "\u{1F9E9} Student sorting activity"], ["both", "\u{1F4C4} Both (activity + completed key)"]].map(([value, label]) => {
      const assessmentBlocked = exportConfig.assessmentMode === true && value !== "activity";
      return /* @__PURE__ */ React.createElement("label", { key: value, className: `flex items-center gap-2 text-xs rounded px-1 py-0.5 ${assessmentBlocked || !exportConfig.includeOutline ? "cursor-not-allowed text-slate-400" : "text-slate-700 cursor-pointer hover:bg-white"}` }, /* @__PURE__ */ React.createElement("input", { type: "radio", name: "vennExportMode", checked: effectiveVennExportMode === value, onChange: () => setExportConfigAndRefresh((p) => ({ ...p, vennExportMode: value })), disabled: !exportConfig.includeOutline || assessmentBlocked }), label);
    })), /* @__PURE__ */ React.createElement("div", { className: "mt-1 px-1 text-[10px] leading-snug text-slate-500" }, "HTML uses accessible tap/select placement. PDF and Worksheet exports use blank circles with cut-out cards."), exportConfig.assessmentMode === true && /* @__PURE__ */ React.createElement("div", { className: "mt-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] leading-snug text-amber-900" }, "Assessment mode exports the activity without its completed reference or self-check answers.")), hasConceptSort && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: exportConfig.conceptSortInteractive !== false, onChange: (e) => setExportConfigAndRefresh((p) => ({ ...p, conceptSortInteractive: e.target.checked })), className: "rounded" }), "\u{1F9E9} Concept sort: interactive tap/select sorting"), /* @__PURE__ */ React.createElement("div", { className: "mt-1 pl-1" }, /* @__PURE__ */ React.createElement("div", { className: "text-[10px] font-semibold text-slate-500 mb-1" }, "Sort strip image size"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-1" }, [
      { v: "small", label: "S", px: 56 },
      { v: "medium", label: "M", px: 80 },
      { v: "large", label: "L", px: 110 },
      { v: "xl", label: "XL", px: 150 }
    ].map((opt) => {
      const cur = exportConfig.conceptSortImageSize || "medium";
      const isActive = cur === opt.v;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: opt.v,
          type: "button",
          onClick: () => setExportConfigAndRefresh((p) => ({ ...p, conceptSortImageSize: opt.v })),
          title: opt.label + " (" + opt.px + " px)",
          "aria-label": "Concept sort image size " + opt.label + " " + opt.px + " pixels",
          "aria-pressed": isActive,
          className: "px-2 py-0.5 rounded text-[10px] font-bold border transition-colors " + (isActive ? "bg-rose-600 text-white border-rose-700" : "bg-white text-slate-600 border-slate-300 hover:bg-rose-50")
        },
        opt.label
      );
    }))))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-slate-600 uppercase mb-1.5" }, "\u2728 AI Style Studio"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-1 mb-1.5" }, [
      { label: "\u{1F3A8} Auto-Beautify", prompt: "Make this document visually stunning and professional with a modern color scheme, elegant typography, subtle gradients, well-spaced sections with rounded cards, and a cohesive design system. Use a sophisticated palette." },
      { label: "\u{1F3EB} Academic", prompt: "Professional academic style with serif headings (Georgia or similar), clean layout, navy/gold color scheme, formal table styling, proper margins, and a scholarly appearance suitable for university submissions." },
      { label: "\u{1F308} Elementary", prompt: "Bright, playful, and colorful style for elementary students. Use rounded corners, fun colors (teal, coral, purple), larger friendly fonts, emoji-friendly, card-based layout with soft shadows." },
      { label: "\u{1F319} Dark Mode", prompt: "Elegant dark mode with dark slate/charcoal background, soft white text, indigo/purple accents, subtle borders, and beautiful contrast. Easy on the eyes for screen reading." },
      { label: "\u{1F4F0} Magazine", prompt: "Clean editorial magazine layout with large hero headings, pull quotes with colored left borders, two-column text sections where appropriate, serif body text, and professional photo-story feel." },
      { label: "\u{1F9CA} Minimalist", prompt: "Ultra-minimal Scandinavian design. Lots of whitespace, thin sans-serif font, muted grays and one accent color, hairline borders, understated elegance." }
    ].map((preset) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: preset.label,
        onClick: () => {
          setExportStylePrompt(preset.prompt);
          setTimeout(() => generateCustomExportStyle(), 50);
        },
        disabled: isGeneratingStyle,
        className: "px-2 py-1 bg-slate-50 border border-slate-400 rounded-md text-[11px] font-bold text-slate-600 hover:bg-indigo-50 hover:border-indigo-600 hover:text-indigo-700 disabled:opacity-40 transition-colors"
      },
      preset.label
    ))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-1" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: exportStylePrompt,
        onChange: (e) => setExportStylePrompt(e.target.value),
        onKeyDown: (e) => {
          if (e.key === "Enter" && exportStylePrompt.trim()) generateCustomExportStyle();
        },
        placeholder: t("placeholders.describe_style_preset"),
        className: "flex-1 text-[11px] p-1.5 border border-slate-400 rounded-lg outline-none focus:ring-2 focus:ring-indigo-300",
        "aria-label": t("a11y.custom_export_style")
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: generateCustomExportStyle,
        "aria-label": isGeneratingStyle ? "Generating custom style" : "Generate custom style",
        disabled: !exportStylePrompt.trim() || isGeneratingStyle,
        className: "px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold hover:bg-indigo-200 disabled:opacity-40"
      },
      isGeneratingStyle ? "..." : "\u2728"
    )), customExportCSS && /* @__PURE__ */ React.createElement("div", { role: "status", "aria-live": "polite", className: "flex items-center gap-2 mt-1" }, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] text-green-700 font-medium" }, "\u2713 Custom style active"), /* @__PURE__ */ React.createElement("button", { onClick: () => setCustomExportCSS(""), className: "text-[11px] text-slate-600 hover:text-red-500 font-bold" }, "Reset"))), (() => {
      const wc = writingCheck;
      const _leafBlocks = () => {
        const doc = exportPreviewRef.current && exportPreviewRef.current.contentDocument;
        if (!doc || !doc.body) return null;
        return Array.from(doc.body.querySelectorAll("h1,h2,h3,h4,h5,h6,p,li,td,th,figcaption,blockquote")).filter((el) => !el.closest('section[data-content-recovery="true"]')).filter((el) => !el.querySelector("p,li,td,th,blockquote")).filter((el) => (el.textContent || "").trim().length >= 3);
      };
      const runWritingCheck = async () => {
        const runId = ++writingCheckRunRef.current;
        const sourceDoc = exportPreviewRef.current?.contentDocument;
        const sourceHtml = sourceDoc?.documentElement?.outerHTML || "";
        setWritingCheck({ status: "loading" });
        if (!sourceDoc || !sourceHtml) {
          setWritingCheck({ status: "error", error: t("export_preview.writing.no_preview") || "Preview not ready - wait for it to render." });
          return;
        }
        try {
          const linter = await _ensureHarper();
          if (!mountedRef.current || runId !== writingCheckRunRef.current) return;
          const blocks = _leafBlocks();
          if (!blocks) {
            setWritingCheck({ status: "error", error: t("export_preview.writing.no_preview") || "Preview not ready - wait for it to render." });
            return;
          }
          const items = [];
          let capped = false;
          for (let bi = 0; bi < blocks.length; bi++) {
            if (items.length >= 150) {
              capped = true;
              break;
            }
            const blockText = blocks[bi].textContent || "";
            let lints = [];
            try {
              lints = await linter.lint(blockText, { language: "plaintext" });
            } catch (_) {
              continue;
            }
            if (!mountedRef.current || runId !== writingCheckRunRef.current) return;
            for (const l of lints) {
              try {
                const span = l.span();
                const sugg = (l.suggestions ? l.suggestions() : []).map((s) => s && s.get_replacement_text ? s.get_replacement_text() : null).filter((value, index, all) => value != null && all.indexOf(value) === index).slice(0, 3);
                items.push({ blockIndex: bi, message: l.message ? l.message() : "Possible issue", start: span.start, end: span.end, bad: blockText.slice(span.start, span.end), snippet: (span.start > 20 ? "..." : "") + blockText.slice(Math.max(0, span.start - 20), Math.min(blockText.length, span.end + 24)) + (span.end + 24 < blockText.length ? "..." : ""), suggestions: sugg });
              } catch (_) {
              }
              if (items.length >= 150) {
                capped = true;
                break;
              }
            }
          }
          const currentDoc = exportPreviewRef.current?.contentDocument;
          if (currentDoc !== sourceDoc || currentDoc?.documentElement?.outerHTML !== sourceHtml) {
            if (mountedRef.current && runId === writingCheckRunRef.current) setWritingCheck({ status: "error", error: "The document changed while it was being checked. Run the writing check again for current results." });
            return;
          }
          setWritingCheck({ status: "done", items, capped });
        } catch (e) {
          if (mountedRef.current && runId === writingCheckRunRef.current) setWritingCheck({ status: "error", error: (e && e.message || "The checker failed to load - check the network and try again.").slice(0, 180) });
        }
      };
      const _locate = (item, outline) => {
        const blocks = _leafBlocks();
        const el = blocks && blocks[item.blockIndex];
        if (!el) return null;
        try {
          el.scrollIntoView({ block: "center", behavior: window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
          if (outline) {
            el.style.outline = "3px solid #f59e0b";
            el.style.outlineOffset = "2px";
            setTimeout(() => {
              try {
                el.style.outline = "";
                el.style.outlineOffset = "";
              } catch (_) {
              }
            }, 2200);
          }
        } catch (_) {
        }
        return el;
      };
      const _apply = (item, replacement) => {
        try {
          const el = _locate(item, false);
          const doc = exportPreviewRef.current && exportPreviewRef.current.contentDocument;
          if (!el || !doc) {
            addToast(t("toasts.writing_block_gone") || "That block is no longer in the preview \u2014 re-run the check.", "info");
            return;
          }
          const cur = el.textContent || "";
          if (cur.slice(item.start, item.end) !== item.bad) {
            addToast(t("toasts.writing_text_shifted") || "The text changed since this check ran \u2014 re-run the check to apply safely.", "info");
            return;
          }
          const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
          let node, off = 0, hit = null;
          while (node = walker.nextNode()) {
            const len = node.textContent.length;
            if (item.start >= off && item.end <= off + len) {
              hit = { node, local: item.start - off };
              break;
            }
            off += len;
          }
          if (!hit) {
            _locate(item, true);
            addToast(t("toasts.writing_spans_markup") || "This suggestion spans formatting (a link or bold text) \u2014 fix it by hand at the highlighted spot.", "info");
            return;
          }
          const _badLen = item.end - item.start;
          if (!_applyHarperTextReplacement(doc, hit.node, hit.local, _badLen, replacement)) {
            throw new Error("The correction could not be applied.");
          }
          const _delta = replacement.length - _badLen;
          setWritingCheck((p) => {
            if (!p || !p.items) return p;
            const items = p.items.filter((x) => x !== item).map((x) => {
              if (x.blockIndex !== item.blockIndex || x.end <= item.start) return x;
              if (x.start >= item.end) return { ...x, start: x.start + _delta, end: x.end + _delta };
              return null;
            }).filter(Boolean);
            return { ...p, items };
          });
          addToast('\u2713 "' + item.bad + '" \u2192 "' + replacement + '"', "success");
        } catch (e) {
          addToast("Apply failed: " + (e && e.message || "error"), "error");
        }
      };
      const _dismiss = (item) => {
        setWritingCheck((p) => p && p.items ? { ...p, items: p.items.filter((x) => x !== item) } : p);
      };
      return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-slate-600 uppercase mb-1.5" }, "\u{1F4DD} ", t("export_preview.writing.heading") || "Writing Check"), /* @__PURE__ */ React.createElement("button", { onClick: runWritingCheck, "data-help-key": "doc_builder_writing_check_btn", disabled: wc && wc.status === "loading", "aria-busy": !!(wc && wc.status === "loading"), className: "w-full px-3 py-2 bg-teal-100 text-teal-800 rounded-lg text-xs font-bold hover:bg-teal-200 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5" }, wc && wc.status === "loading" ? t("export_preview.writing.checking") || "\u23F3 Checking\u2026 (first run downloads the checker)" : t("export_preview.writing.run") || "\u{1F4DD} Check spelling & grammar (English)"), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-500 mt-1" }, t("export_preview.writing.disclosure") || "Runs entirely on this device \u2014 no text leaves the browser. English only; the ~18 MB checker downloads on first use, then checks both spelling and grammar."), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-500 mt-1" }, t("export_preview.writing.spell_hint") || "\u{1F4A1} Browser correction menus can be limited in embedded previews. Run Writing Check to see spelling corrections here as Apply buttons."), exportPreviewSource === "remediation" && wc && /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-amber-700 mt-1" }, t("export_preview.writing.remediation_caution") || "\u26A0 This is a remediated document \u2014 its wording comes from the source PDF. Apply spelling or grammar changes thoughtfully; the original author\u2019s phrasing may be intentional."), wc && wc.status === "error" && /* @__PURE__ */ React.createElement("div", { role: "alert", "aria-live": "assertive", className: "mt-1.5 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded p-1.5" }, wc.error), wc && wc.status === "done" && wc.items.length === 0 && /* @__PURE__ */ React.createElement("div", { role: "status", "aria-live": "polite", className: "mt-1.5 text-[11px] text-green-700 bg-green-50 border border-green-200 rounded p-1.5" }, "\u2713 ", t("export_preview.writing.clean") || "No spelling or grammar suggestions found."), wc && wc.status === "done" && wc.items.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "mt-1.5 space-y-1.5 max-h-64 overflow-y-auto" }, /* @__PURE__ */ React.createElement("div", { role: "status", "aria-live": "polite", className: "text-[10px] font-bold text-slate-600" }, wc.items.length, " ", t("export_preview.writing.suggestions") || "suggestion(s)", wc.capped ? " (first 150 shown)" : "", " \u2014 ", t("export_preview.writing.suggestions_note") || "nothing is changed unless you Apply it", ":"), wc.items.map((item, ii) => /* @__PURE__ */ React.createElement("div", { key: ii, className: "bg-white border border-slate-200 rounded-lg p-1.5 text-[11px]" }, /* @__PURE__ */ React.createElement("button", { onClick: () => _locate(item, true), className: "text-left w-full hover:underline", title: t("export_preview.writing.locate_title") || "Scroll the preview to this spot" }, /* @__PURE__ */ React.createElement("span", { className: "text-slate-700" }, item.message), /* @__PURE__ */ React.createElement("span", { className: "block text-slate-500 italic mt-0.5" }, item.snippet)), /* @__PURE__ */ React.createElement("div", { className: "flex gap-1 mt-1 flex-wrap items-center" }, item.suggestions.map((s, si) => /* @__PURE__ */ React.createElement("button", { key: si, onClick: () => _apply(item, s), className: "px-1.5 py-0.5 bg-teal-50 border border-teal-300 text-teal-800 rounded text-[10px] font-bold hover:bg-teal-100", title: (t("export_preview.writing.apply_title") || "Replace") + ' "' + item.bad + '"' }, "\u2192 ", s || (t("export_preview.writing.remove") || "(remove)"))), /* @__PURE__ */ React.createElement("button", { onClick: () => _dismiss(item), className: "px-1.5 py-0.5 bg-slate-50 border border-slate-300 text-slate-600 rounded text-[10px] font-bold hover:bg-slate-100 ml-auto", title: t("export_preview.writing.keep_title") || "Keep the original wording and dismiss this suggestion" }, "\u2713 ", t("export_preview.writing.keep") || "Keep as-is"))))));
    })(), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-slate-600 uppercase mb-1.5" }, "\u267F Accessibility Audit"), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: async () => {
          const runId = ++auditRunRef.current;
          setExportAuditLoading(true);
          setExportAuditResult(null);
          try {
            const iframe = exportPreviewRef.current;
            const sourceDoc = iframe?.contentDocument;
            const html = sourceDoc ? sourceDoc.documentElement.outerHTML : getExportPreviewHTML();
            let _runEA = null;
            try {
              const _mk = window.AlloModules && window.AlloModules.createDocPipeline;
              if (_mk) {
                const _inst = window.__alloAuditPipeline || (window.__alloAuditPipeline = _mk({
                  callGemini: async () => "{}",
                  callGeminiVision: async () => "{}",
                  callImagen: async () => null,
                  addToast: () => {
                  },
                  t: (k) => k,
                  isRtlLang: () => false,
                  updateExportPreview: () => {
                  },
                  getDefaultTitle: () => ""
                }));
                if (_inst && typeof _inst.runEqualAccessAudit === "function") _runEA = _inst.runEqualAccessAudit;
              }
            } catch (_) {
            }
            const [aiResult, axeResult, eaResult] = await Promise.all([
              auditOutputAccessibility(html),
              runAxeAudit(html).catch(() => null),
              _runEA ? _runEA(html).catch(() => null) : Promise.resolve(null)
            ]);
            if (!mountedRef.current || runId !== auditRunRef.current) return;
            const currentDoc = exportPreviewRef.current?.contentDocument;
            if (sourceDoc && (currentDoc !== sourceDoc || currentDoc?.documentElement?.outerHTML !== html)) {
              setExportAuditResult({ score: -2, summary: "The document changed during the audit. Run the audit again for results bound to the current document.", issues: [], passes: [] });
              return;
            }
            const combined = { ...aiResult || { score: 0, summary: "", issues: [], passes: [] } };
            if (axeResult) {
              combined.axeViolations = axeResult.totalViolations;
              combined.axePasses = axeResult.totalPasses;
              combined.axeDetails = axeResult.critical.concat(axeResult.serious).concat(axeResult.moderate);
              combined.summary = (combined.summary || "") + ` | axe-core: ${axeResult.totalViolations} violations, ${axeResult.totalPasses} passed`;
            }
            if (eaResult) {
              combined.eaViolations = eaResult.failViolations;
              combined.eaPotential = eaResult.potentialViolations;
              combined.summary = (combined.summary || "") + ` | IBM Equal Access: ${eaResult.failViolations} violations`;
            }
            if (axeResult && eaResult) combined.deterministicConsensus = axeResult.totalViolations === 0 && eaResult.failViolations === 0 ? "clean" : "issues";
            setExportAuditResult(combined);
          } catch (e) {
            if (mountedRef.current && runId === auditRunRef.current) setExportAuditResult({ score: -1, summary: "Audit failed. Check your connection and try again.", issues: [], passes: [] });
          } finally {
            if (mountedRef.current && runId === auditRunRef.current) setExportAuditLoading(false);
          }
        },
        disabled: exportAuditLoading,
        "data-help-key": "doc_builder_wcag_audit_btn",
        "aria-busy": exportAuditLoading,
        className: "w-full px-3 py-2 bg-violet-100 text-violet-700 rounded-lg text-xs font-bold hover:bg-violet-200 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
      },
      exportAuditLoading ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(RefreshCw, { size: 12, className: "animate-spin motion-reduce:animate-none", "aria-hidden": "true" }), " Auditing...") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u267F"), " Run WCAG Audit")
    ), exportAuditResult && exportAuditResult.score < 0 && /* @__PURE__ */ React.createElement("div", { role: "alert", "aria-live": "assertive", className: "mt-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-[11px] font-bold text-amber-900" }, exportAuditResult.summary), exportAuditResult && exportAuditResult.score >= 0 && /* @__PURE__ */ React.createElement("div", { role: "status", "aria-live": "polite", "aria-atomic": "true", className: "mt-2 space-y-2" }, /* @__PURE__ */ React.createElement("div", { className: `text-center p-3 rounded-xl ${exportAuditResult.score >= 80 ? "bg-green-50 border border-green-200" : exportAuditResult.score >= 60 ? "bg-amber-50 border border-amber-200" : "bg-red-50 border border-red-200"}` }, /* @__PURE__ */ React.createElement("div", { className: `text-2xl font-black ${exportAuditResult.score >= 80 ? "text-green-700" : exportAuditResult.score >= 60 ? "text-amber-700" : "text-red-700"}` }, exportAuditResult.score, "/100"), /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Accessibility Automated Score")), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-600" }, exportAuditResult.summary), exportAuditResult.axeViolations != null && exportAuditResult.eaViolations != null && /* @__PURE__ */ React.createElement("div", { className: `rounded-lg border p-2 text-[11px] ${exportAuditResult.deterministicConsensus === "clean" ? "bg-green-50 border-green-200 text-green-800" : "bg-amber-50 border-amber-200 text-amber-800"}` }, exportAuditResult.deterministicConsensus === "clean" ? "\u2713 Two independent rule engines agree (axe-core + IBM Equal Access): 0 violations." : `Rule engines \u2014 axe-core: ${exportAuditResult.axeViolations}, IBM Equal Access: ${exportAuditResult.eaViolations} violation(s).`, exportAuditResult.eaPotential > 0 && /* @__PURE__ */ React.createElement("span", { className: "block mt-1 text-slate-500" }, "IBM Equal Access also flags ", exportAuditResult.eaPotential, " item(s) for human review.")), exportAuditResult.eaViolations == null && exportAuditResult.axeViolations != null && /* @__PURE__ */ React.createElement("div", { className: "text-[10px] text-slate-500 italic" }, "Second deterministic engine (IBM Equal Access) unavailable \u2014 showing axe-core only."), exportAuditResult.issues?.length > 0 && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-red-600 uppercase mb-1" }, "Issues (", exportAuditResult.issues.length, ")"), exportAuditResult.issues.slice(0, 5).map((issue, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "text-[11px] text-slate-600 mb-1 flex items-start gap-1" }, /* @__PURE__ */ React.createElement("span", { className: "text-red-600 shrink-0" }, "\u25CF"), /* @__PURE__ */ React.createElement("span", null, typeof issue === "string" ? issue : issue.issue, issue.wcag ? ` (${issue.wcag})` : ""))), exportAuditResult.issues.length > 5 && /* @__PURE__ */ React.createElement("div", { className: "text-[11px] text-slate-600 italic" }, "+", exportAuditResult.issues.length - 5, " more")), exportAuditResult.passes?.length > 0 && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-green-700 uppercase mb-1" }, "Passes (", exportAuditResult.passes.length, ")"), exportAuditResult.passes.slice(0, 3).map((pass, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "text-[11px] text-green-700 mb-0.5 flex items-start gap-1" }, /* @__PURE__ */ React.createElement("span", { className: "text-green-500" }, "\u2713"), " ", pass))), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-indigo-700 italic" }, "Use the A11y Inspect toggle above to see and fix issues visually, then re-audit."), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-600 italic" }, "Automated checks (axe-core + IBM Equal Access) find many problems but can\u2019t confirm full WCAG 2.2 AA conformance \u2014 a manual screen-reader, keyboard, zoom/reflow, and forced-colors pass is still needed. The score above includes an AI review and is a guide, not a certification.")))), /* @__PURE__ */ React.createElement("div", { className: `flex-1 flex flex-col min-w-0 ${isFocusMode ? "min-h-0" : "min-h-[60vh] lg:min-h-0"}` }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 border-b border-slate-200 bg-white shrink-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-3" }, /* @__PURE__ */ React.createElement("h3", { className: "text-sm font-bold text-slate-700" }, isFocusMode ? "Document Builder" : "Live Preview"), /* @__PURE__ */ React.createElement("span", { className: "text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono" }, exportPreviewMode === "worksheet" ? "Worksheet" : exportPreviewMode === "html" ? "HTML" : exportPreviewMode === "slides" ? "Slides" : "PDF"), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-indigo-700 font-medium" }, isFocusMode ? "Focus mode \xB7 write without distractions" : "Focus the preview and edit text directly"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: openWordCountDetails, "aria-expanded": showWordCountDetails, "aria-controls": "builder-word-count-panel", "aria-keyshortcuts": "Control+Shift+G", className: "hidden md:inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-indigo-100 hover:text-indigo-800", title: "Open detailed Word Count (Ctrl+Shift+G)" }, selectionStatistics.active ? `Words: ${selectionStatistics.words.toLocaleString()} of ${wordCount.toLocaleString()}` : `Words: ${wordCount.toLocaleString()}`)), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2" }, /* @__PURE__ */ React.createElement("div", { id: "builder-quick-access-toolbar", role: "toolbar", "aria-label": "Quick Access", className: "flex min-h-8 items-center gap-0.5 rounded-lg border border-slate-300 bg-slate-50 p-0.5 shadow-sm" }, quickAccessItems.map((itemId) => {
      const option = _BUILDER_QUICK_ACCESS_OPTIONS.find((item) => item.id === itemId);
      const command = quickAccessActions[itemId];
      if (!option || !command) return null;
      const pressed = typeof command.pressed === "boolean" ? command.pressed : void 0;
      return /* @__PURE__ */ React.createElement("button", { key: itemId, type: "button", onMouseDown: (event) => event.preventDefault(), onClick: command.action, "aria-pressed": pressed, "aria-keyshortcuts": option.shortcut, "aria-label": option.label, title: option.shortcut ? option.label + " (" + option.shortcut + ")" : option.label, className: "h-7 rounded px-2 text-[10px] font-bold transition-colors " + (pressed ? "bg-indigo-700 text-white shadow-inner" : "text-slate-700 hover:bg-indigo-100 hover:text-indigo-800") }, option.shortLabel);
    }), /* @__PURE__ */ React.createElement("details", { id: "builder-quick-access-customize", className: "relative" }, /* @__PURE__ */ React.createElement("summary", { className: "flex h-7 cursor-pointer list-none items-center rounded px-1.5 text-[10px] font-black text-slate-600 hover:bg-slate-200", "aria-label": "Customize Quick Access toolbar", title: "Customize Quick Access toolbar" }, "+"), /* @__PURE__ */ React.createElement("div", { className: "absolute right-0 top-full z-50 mt-1 w-72 rounded-lg border border-slate-300 bg-white p-2 text-left shadow-xl" }, /* @__PURE__ */ React.createElement("div", { className: "mb-2 flex items-center justify-between gap-2" }, /* @__PURE__ */ React.createElement("strong", { className: "text-[11px] text-slate-800" }, "Customize Quick Access"), /* @__PURE__ */ React.createElement("span", { className: "text-[9px] text-slate-500" }, "Up to 6")), /* @__PURE__ */ React.createElement("div", { className: "space-y-1" }, _BUILDER_QUICK_ACCESS_OPTIONS.map((option) => {
      const selected = quickAccessItems.includes(option.id);
      const position = quickAccessItems.indexOf(option.id);
      return /* @__PURE__ */ React.createElement("div", { key: option.id, className: "flex min-h-7 items-center gap-1 rounded px-1 hover:bg-slate-50" }, /* @__PURE__ */ React.createElement("label", { className: "flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-[10px] font-semibold text-slate-700" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: selected, onChange: () => toggleQuickAccessItem(option.id), className: "accent-indigo-700" }), " ", /* @__PURE__ */ React.createElement("span", { className: "truncate" }, option.label)), selected && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { type: "button", disabled: position === 0, onClick: () => moveQuickAccessItem(option.id, -1), className: "h-6 w-6 rounded text-[11px] font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-30", "aria-label": "Move " + option.shortLabel + " left" }, "\u2190"), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: position === quickAccessItems.length - 1, onClick: () => moveQuickAccessItem(option.id, 1), className: "h-6 w-6 rounded text-[11px] font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-30", "aria-label": "Move " + option.shortLabel + " right" }, "\u2192")));
    })), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setQuickAccessItems([..._BUILDER_QUICK_ACCESS_DEFAULT]), className: "mt-2 w-full rounded border border-slate-300 px-2 py-1.5 text-[10px] font-bold text-slate-700 hover:bg-slate-100" }, "Reset Quick Access")))), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => {
          const active = showNavigationPane && navigationPaneTab === "headings";
          if (active) setShowNavigationPane(false);
          else {
            setNavigationPaneTab("headings");
            setShowNavigationPane(true);
          }
        },
        "aria-pressed": showNavigationPane && navigationPaneTab === "headings",
        "aria-controls": "document-builder-navigation",
        className: `text-xs font-bold flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all ${showNavigationPane && navigationPaneTab === "headings" ? "bg-slate-700 text-white shadow-sm" : "text-slate-700 bg-slate-100 hover:bg-slate-200"}`,
        title: showNavigationPane && navigationPaneTab === "headings" ? "Hide navigation" : "Open heading navigation"
      },
      /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u2637"),
      " Navigation"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => setBuilderFocusMode(),
        "aria-pressed": isFocusMode,
        className: `text-xs font-bold flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all ${isFocusMode ? "bg-indigo-700 text-white shadow-sm" : "text-indigo-700 bg-indigo-50 hover:bg-indigo-100"}`,
        title: isFocusMode ? "Exit focus mode and restore the settings panel" : "Hide settings for a distraction-free drafting surface"
      },
      /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, isFocusMode ? "\u2199" : "\u2197"),
      " ",
      isFocusMode ? "Exit focus" : "Focus mode"
    ), /* @__PURE__ */ React.createElement(
      "input",
      {
        ref: imageFileInputRef,
        type: "file",
        accept: "image/png,image/jpeg,image/gif,image/webp",
        className: "sr-only",
        tabIndex: -1,
        "aria-hidden": "true",
        onChange: (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const allowedTypes = /* @__PURE__ */ new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
          if (!allowedTypes.has(String(file.type || "").toLowerCase())) {
            addToast && addToast("Choose a PNG, JPEG, GIF, or WebP image. SVG and other active formats are not supported.", "error");
            return;
          }
          if (file.size > 8 * 1024 * 1024) {
            addToast && addToast("That image is larger than 8 MB. Resize or compress it before inserting.", "error");
            return;
          }
          setImageAltText("");
          setImageDecorative(false);
          setImageAltError("");
          setPendingImageFile(file);
        }
      }
    ), /* @__PURE__ */ React.createElement("button", { ref: imageAddButtonRef, type: "button", onClick: openImagePicker, className: "min-h-8 text-xs font-bold text-slate-700 hover:text-indigo-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100", "aria-label": "Add an image and provide alternative text", title: "Insert image into document" }, /* @__PURE__ */ React.createElement(ImageIcon, { size: 12, "aria-hidden": "true" }), " Add Image"), /* @__PURE__ */ React.createElement("div", { className: "w-px h-5 bg-slate-200" }), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: toggleA11yInspect,
        "aria-pressed": a11yInspectMode,
        className: `text-xs font-bold flex items-center gap-1 px-2 py-1 rounded transition-all ${a11yInspectMode ? "bg-violet-100 text-violet-700 ring-1 ring-violet-300" : "text-slate-600 hover:text-violet-600 hover:bg-slate-100"}`,
        title: "Toggle accessibility inspector \u2014 shows heading hierarchy, alt text, ARIA labels, table structure, and input labels. Editable badges support Enter, Space, and click."
      },
      "\u267F A11y Inspect"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => runBuilderPreflight(exportPreviewMode, true),
        className: `text-xs font-bold flex items-center gap-1 px-2 py-1 rounded transition-all ${preflightResult ? preflightResult.errors ? "bg-red-100 text-red-800 ring-1 ring-red-300" : preflightResult.warnings ? "bg-amber-100 text-amber-800 ring-1 ring-amber-300" : "bg-green-100 text-green-800 ring-1 ring-green-300" : "text-slate-600 hover:text-emerald-700 hover:bg-emerald-50"}`,
        "aria-label": "Run export preflight checks",
        title: "Check this document for blocking export, accessibility, structure, and packaging issues"
      },
      "Preflight",
      preflightResult ? ` (${preflightResult.errors ? preflightResult.errors + " errors" : preflightResult.warnings ? preflightResult.warnings + " warnings" : "passed"})` : ""
    ), pdfFixResult && pdfFixResult.sourceText && pdfFixResult.finalText && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: async () => {
          try {
            if (typeof window !== "undefined") {
              window._diffDiagnostic = window._diffDiagnostic || [];
              window._diffDiagnostic.push({ ts: (/* @__PURE__ */ new Date()).toISOString(), msg: "button clicked", source: "click", diffLibReady, hasWindowDiff: !!window.Diff, hasResult: !!pdfFixResult, srcLen: pdfFixResult && pdfFixResult.sourceText ? pdfFixResult.sourceText.length : null, finLen: pdfFixResult && pdfFixResult.finalText ? pdfFixResult.finalText.length : null });
              console.warn("[Diff] button clicked \u2014 diffLibReady=" + diffLibReady + ", window.Diff=" + !!window.Diff);
            }
          } catch (_) {
          }
          setDiffViewOpen(true);
          const ok = await _ensureDiffLib();
          if (!ok) {
            console.warn("[Diff] _ensureDiffLib returned false \u2014 script load failed");
            if (typeof addToast === "function") addToast("Diff engine failed to load (network blocked?). Check your connection and try again.", "error");
          }
        },
        className: "text-xs font-bold flex items-center gap-1 px-2 py-1 rounded text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-all",
        title: "Open the word-level diff view comparing the source PDF text to the remediated HTML \u2014 see every insertion, deletion, and paraphrase with click-to-reject.",
        "aria-label": "Open word-level diff view between source PDF and remediated HTML"
      },
      "\u{1F4DD} Diff"
    ), /* @__PURE__ */ React.createElement("div", { className: "w-px h-5 bg-slate-200" }), exportAuditResult && exportAuditResult.score >= 0 && /* @__PURE__ */ React.createElement("span", { className: `text-[11px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 ${exportAuditResult.score >= 90 ? "bg-green-100 text-green-700 ring-1 ring-green-300" : exportAuditResult.score >= 70 ? "bg-amber-100 text-amber-700 ring-1 ring-amber-300" : "bg-red-100 text-red-700 ring-1 ring-red-300"}`, title: exportAuditResult.summary || "" }, "\u267F", " ", exportAuditResult.score, "/100"), /* @__PURE__ */ React.createElement("button", { onClick: updateExportPreview2, className: "text-xs font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100" }, /* @__PURE__ */ React.createElement(RefreshCw, { size: 12 }), " Regenerate"), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: runExportFromPreview,
        disabled: exportActionBusy || exportPreviewMode === "slides" && !pptxLoaded,
        "aria-busy": exportActionBusy,
        "aria-label": exportActionBusy ? "Export in progress" : void 0,
        className: "bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed",
        title: exportPreviewMode === "slides" && !pptxLoaded ? "Slides library still loading..." : ""
      },
      /* @__PURE__ */ React.createElement(Download, { size: 14 }),
      " ",
      exportPreviewMode === "worksheet" || exportPreviewMode === "print" ? t("export_preview.action_print_pdf") || "Print / Save as PDF" : exportPreviewMode === "html" ? t("export_preview.action_download_html") || "Download HTML" : exportPreviewMode === "slides" ? pptxLoaded ? t("export_preview.action_export_slides") || "Export Slides" : "Loading..." : t("export_preview.action_print_pdf") || "Print / Save as PDF"
    ), exportPreviewMode === "slides" && typeof openInAlloStudio === "function" && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: openInAlloStudio,
        className: "bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-300 text-xs font-bold px-3 py-2 rounded-lg shadow-sm transition-all flex items-center gap-1.5",
        title: "Open this content in Page Designer as an editable slide deck \u2014 reorder, restyle, and export PowerPoint from there."
      },
      "\u{1F3A8} ",
      t("export_preview.edit_in_page_designer") || "Edit in Page Designer"
    ), /* @__PURE__ */ React.createElement("details", { className: "relative" }, /* @__PURE__ */ React.createElement("summary", { className: "bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold px-2.5 py-2 rounded-lg cursor-pointer flex items-center gap-1 transition-colors list-none" }, "\u267F Alt Formats ", /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-slate-600" }, "\u25BE")), /* @__PURE__ */ React.createElement("div", { className: "absolute right-0 top-full mt-1 bg-white border border-slate-400 rounded-xl shadow-xl p-2 z-50 w-72 space-y-1" }, /* @__PURE__ */ React.createElement("div", { className: "text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 pt-1" }, "Editable documents"), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: !!altExportBusy, onClick: () => runOfficeExport("docx"), className: "w-full text-left px-2 py-1.5 text-[11px] font-medium text-sky-700 hover:bg-sky-50 rounded-lg disabled:opacity-50" }, altExportBusy === "docx" ? "Building Word..." : "Accessible Word (.docx)"), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: !!altExportBusy, onClick: () => runOfficeExport("odt"), className: "w-full text-left px-2 py-1.5 text-[11px] font-medium text-teal-700 hover:bg-teal-50 rounded-lg disabled:opacity-50" }, altExportBusy === "odt" ? "Building ODT..." : "OpenDocument (.odt)"), qtiAssessments.length > 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 pt-1" }, "Assessment packages"), qtiAssessments.length > 1 && /* @__PURE__ */ React.createElement("select", { "aria-label": "Quiz to export as QTI", value: selectedQtiKey, onChange: (event) => setSelectedQtiKey(event.target.value), disabled: !!altExportBusy, className: "w-full border border-slate-300 rounded-md px-2 py-1 text-[11px] bg-white" }, qtiAssessments.map(({ item, key }, index) => /* @__PURE__ */ React.createElement("option", { key, value: key }, item.title || `Quiz ${index + 1}`))), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: !!altExportBusy, onClick: () => runPackageExport("qti"), className: "w-full text-left px-2 py-1.5 text-[11px] font-medium text-violet-700 hover:bg-violet-50 rounded-lg disabled:opacity-50" }, altExportBusy === "qti" ? "Building QTI..." : "QTI quiz package"), /* @__PURE__ */ React.createElement("div", { className: "px-2 text-[10px] leading-tight text-slate-500" }, "QTI uses the selected quiz's structured questions and answers.")), h5pActivities.length > 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 pt-1" }, "Interactive H5P"), h5pActivities.length > 1 && /* @__PURE__ */ React.createElement("select", { "aria-label": "Activity to export as H5P", value: selectedH5PKey, onChange: (event) => setSelectedH5PKey(event.target.value), disabled: !!altExportBusy, className: "w-full border border-slate-300 rounded-md px-2 py-1 text-[11px] bg-white" }, h5pActivities.map(({ item, key }, index) => /* @__PURE__ */ React.createElement("option", { key, value: key }, item.title || `${item.type === "quiz" ? "Quiz" : "Study cards"} ${index + 1}`))), /* @__PURE__ */ React.createElement("button", { type: "button", "aria-describedby": "h5p-compatibility-summary", disabled: !!altExportBusy || !h5pCompatibility.ready, onClick: () => runPackageExport("h5p"), className: "w-full text-left px-2 py-1.5 text-[11px] font-medium text-fuchsia-700 hover:bg-fuchsia-50 rounded-lg disabled:opacity-50" }, altExportBusy === "h5p" ? "Building H5P..." : "H5P interactive activity (.h5p)"), /* @__PURE__ */ React.createElement("div", { id: "h5p-compatibility-summary", role: "status", className: `px-2 text-[10px] leading-tight ${h5pCompatibility.ready ? h5pCompatibility.omitted || h5pCompatibility.omittedMedia ? "text-amber-700" : "text-emerald-700" : "text-red-700"}` }, h5pCompatibility.valid, " of ", h5pCompatibility.total, " ", h5pCompatibility.unit, h5pCompatibility.total === 1 ? "" : "s", " ready for ", h5pCompatibility.library || "H5P", ".", h5pCompatibility.omitted > 0 ? ` ${h5pCompatibility.omitted} incomplete or incompatible.` : "", h5pCompatibility.adapted > 0 ? ` ${h5pCompatibility.adapted} adapted to equivalent H5P interactions.` : "", h5pCompatibility.manualReview > 0 ? ` ${h5pCompatibility.manualReview} ungraded/manual-review.` : "", h5pCompatibility.embeddedMedia > 0 ? ` ${h5pCompatibility.embeddedMedia} embedded media asset(s) will be packaged.` : "", h5pCompatibility.omittedMedia > 0 ? ` ${h5pCompatibility.omittedMedia} external or unsupported media asset(s) will be omitted.` : ""), /* @__PURE__ */ React.createElement("div", { className: "px-2 text-[10px] leading-tight text-slate-500" }, "MCQ-only quizzes export as Single Choice Set. Mixed assessments export as Question Set with Multiple Choice, Fill in the Blanks, and ungraded Essay adaptations. The destination needs the referenced H5P libraries installed.")), /* @__PURE__ */ React.createElement("div", { className: "text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 pt-1" }, "Content package"), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: !!altExportBusy, onClick: () => runPackageExport("ims"), className: "w-full text-left px-2 py-1.5 text-[11px] font-medium text-violet-700 hover:bg-violet-50 rounded-lg disabled:opacity-50" }, altExportBusy === "ims" ? "Building IMS..." : "IMS content package"), /* @__PURE__ */ React.createElement("div", { className: "px-2 text-[10px] leading-tight text-slate-500" }, "IMS includes the current editable Builder document."), /* @__PURE__ */ React.createElement("div", { className: "text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 pt-1" }, "Reading & text"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
      const doc = exportPreviewRef.current?.contentDocument;
      if (!doc) return;
      let text = "";
      try {
        let _tClone = _builderFinalizeDocumentForExport(doc.body.cloneNode(true));
        _tClone.querySelectorAll(".allo-block-controls, .allo-block-remove, .a11y-inspect-badge, [data-allo-crop-ui], #a11y-inspect-styles, script, style").forEach((el) => el.remove());
        _tClone.querySelectorAll("h1,h2,h3,h4,h5,h6,p,li,tr,figcaption,blockquote,div").forEach((el) => {
          try {
            el.appendChild(doc.createTextNode("\n"));
          } catch (_) {
          }
        });
        text = (_tClone.textContent || "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
      } catch (_) {
        text = (doc.body.innerText || doc.body.textContent || "").trim();
      }
      const blob = new Blob([text], { type: "text/plain" });
      downloadBuilderBlob(blob, { extension: "txt" });
      addToast("Plain text downloaded", "success");
    }, className: "w-full text-left px-2 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 rounded-lg" }, "\u{1F4C4} Plain Text (.txt)"), /* @__PURE__ */ React.createElement("button", { onClick: async () => {
      const doc = exportPreviewRef.current?.contentDocument;
      if (!doc) return;
      let html = "";
      try {
        let _mClone = _builderFinalizeDocumentForExport(doc.documentElement.cloneNode(true));
        _mClone.querySelectorAll(".allo-block-controls, .allo-block-remove, .a11y-inspect-badge, [data-allo-crop-ui], #a11y-inspect-styles, #allo-builder-edit-css, script, style").forEach((el) => el.remove());
        _builderStripEditorBreakMetadata(_mClone);
        html = _mClone.outerHTML;
      } catch (_) {
        html = doc.documentElement.outerHTML;
      }
      const _mathBlocks = html.match(/<math\b[\s\S]*?<\/math>/gi) || [];
      let _spokenByBlock = null;
      if (_mathBlocks.length) {
        try {
          if (!window.AlloMathSpeech && window.__alloLoadPlugin) await window.__alloLoadPlugin("sre_loader.js");
          if (window.AlloMathSpeech && typeof window.AlloMathSpeech.toSpeech === "function") {
            _spokenByBlock = await Promise.all(_mathBlocks.map((m) => window.AlloMathSpeech.toSpeech(m, { timeoutMs: 8e3 })));
          }
        } catch (_) {
          _spokenByBlock = null;
        }
      }
      let _mathIdx = 0;
      const _cellTxt = (s) => String(s || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").replace(/\|/g, "\\|").trim();
      html = html.replace(/<table\b[\s\S]*?<\/table>/gi, (tbl) => {
        const rows = (tbl.match(/<tr\b[\s\S]*?<\/tr>/gi) || []).map((tr) => (tr.match(/<t[hd]\b[\s\S]*?<\/t[hd]>/gi) || []).map(_cellTxt));
        if (!rows.length) return "\n";
        const w = Math.max(...rows.map((r) => r.length));
        const line = (r) => "| " + Array.from({ length: w }, (_, i) => r[i] || "").join(" | ") + " |";
        return "\n\n" + line(rows[0]) + "\n|" + Array.from({ length: w }, () => " --- |").join("") + "\n" + rows.slice(1).map(line).join("\n") + "\n\n";
      });
      html = html.replace(/<img\b[^>]*alt=["']([^"']*)["'][^>]*>/gi, (m, alt) => "\n\n![" + String(alt).replace(/\]/g, ")") + "](image)\n\n");
      html = html.replace(/<math\b[\s\S]*?<\/math>/gi, (m) => {
        const _spoken = _spokenByBlock && _spokenByBlock[_mathIdx] ? String(_spokenByBlock[_mathIdx]).trim().replace(/\*/g, "") : "";
        _mathIdx++;
        return "\n\n" + (_spoken ? "*Spoken: " + _spoken + "*\n\n" : "") + "```mathml\n" + m + "\n```\n\n";
      });
      let md = html.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n").replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n").replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n").replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n").replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n").replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**").replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*").replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\n{3,}/g, "\n\n").trim();
      const blob = new Blob([md], { type: "text/markdown" });
      downloadBuilderBlob(blob, { extension: "md" });
      addToast("Markdown downloaded", "success");
    }, className: "w-full text-left px-2 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 rounded-lg" }, "\u{1F4DD} Markdown (.md)"), /* @__PURE__ */ React.createElement("button", { disabled: !!altExportBusy, onClick: async () => {
      if (altExportBusy) return;
      setAltExportBusy("notebooklm");
      try {
        const doc = exportPreviewRef.current?.contentDocument;
        const items = Array.isArray(history) ? history.filter((h) => h && h.data != null) : [];
        const hasLiveEdits = !!(doc?.body?.getAttribute && doc.body.getAttribute("data-allo-user-edited") === "1");
        const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const title = exportConfig && (exportConfig.title || exportConfig.docTitle || exportConfig.lessonTitle) || doc && doc.title || items[0] && items[0].title || "AlloFlow Lesson";
        const esc = (v) => v == null ? "" : String(v);
        const out = ["---", "title: " + esc(title), "source: AlloFlow (Universal Design for Learning toolkit)", "date_exported: " + today, "---", "", "# " + esc(title), ""];
        if (items.length && !hasLiveEdits) {
          items.forEach((it) => {
            const ty = it.type, d = it.data;
            out.push("## " + esc(it.title || (ty ? ty.charAt(0).toUpperCase() + ty.slice(1).replace(/[-_]/g, " ") : "Resource")), "");
            if (typeof d === "string") {
              out.push(d.trim(), "");
            } else if (ty === "glossary" && Array.isArray(d)) {
              d.forEach((g) => {
                if (!g) return;
                out.push("- **" + esc(g.term) + "** \u2014 " + esc(g.def));
                if (g.translations && Object.keys(g.translations).length) out.push("  - _Translations:_ " + Object.values(g.translations).map((t2) => esc(t2)).join(" / "));
                if (g.etymology) out.push("  - _Etymology:_ " + esc(g.etymology));
              });
              out.push("");
            } else if (ty === "quiz" && d && Array.isArray(d.questions)) {
              d.questions.forEach((q, i) => {
                out.push("**Q" + (i + 1) + ". " + esc(q.question) + "**", "");
                (q.options || []).forEach((o, k) => out.push(String.fromCharCode(65 + k) + ". " + esc(o)));
                out.push("");
              });
              if (exportConfig && exportConfig.assessmentMode !== true && (exportConfig.includeAnswerKey === true || exportConfig.includeTeacherKey === true)) {
                out.push("### Answer Key", "");
                d.questions.forEach((q, i) => {
                  const li = Array.isArray(q.options) ? q.options.indexOf(q.correctAnswer) : -1;
                  out.push("- **Q" + (i + 1) + ":** " + (li >= 0 ? String.fromCharCode(65 + li) + ". " : "") + esc(q.correctAnswer));
                  if (q.factCheck) out.push("  - " + esc(q.factCheck));
                });
                out.push("");
              } else {
                out.push('*Answer key omitted from this export (assessment integrity \u2014 anyone with this file can read it). Check "Teacher Answer Key" in Export Options to include it.*', "");
              }
            } else if (ty === "outline" && d && Array.isArray(d.branches)) {
              if (d.main) out.push("**" + esc(d.main) + "**", "");
              d.branches.forEach((b) => {
                if (!b) return;
                out.push("- " + esc(b.title));
                if (Array.isArray(b.items)) b.items.forEach((s) => out.push("  - " + esc(s)));
              });
              out.push("");
            } else if (ty === "timeline" && Array.isArray(d)) {
              d.forEach((e) => {
                if (e) out.push("- **" + esc(e.date) + ":** " + esc(e.event));
              });
              out.push("");
            } else if (ty === "concept-sort" && d && Array.isArray(d.categories)) {
              const its = Array.isArray(d.items) ? d.items : [];
              d.categories.forEach((c) => {
                if (!c) return;
                out.push("### " + esc(c.label));
                its.filter((x) => x && x.categoryId === c.id).forEach((x) => out.push("- " + esc(x.content)));
                out.push("");
              });
            } else if (ty === "memory-aid" && d && Array.isArray(d.cards)) {
              const maRules = typeof window !== "undefined" && window.AlloModules && window.AlloModules.MemoryAid && window.AlloModules.MemoryAid.exportRules || null;
              const maT = (key, fallback) => {
                const fullKey = "memory_aid." + key;
                try {
                  const v = typeof t === "function" ? t(fullKey) : "";
                  if (typeof v === "string" && v && v !== fullKey) return v;
                } catch (_) {
                }
                return fallback;
              };
              if (d.instructions) out.push(esc(d.instructions), "");
              d.cards.slice(0, 8).forEach((c, ci) => {
                if (!c || typeof c !== "object") return;
                out.push("### " + (ci + 1) + ". " + esc(c.target || maT("memory_target", "Memory target")), "");
                const cue = maRules && typeof maRules.practiceCue === "function" ? maRules.practiceCue(c) : String(c.studentDraft || c.aiExample || c.scaffoldStarter || "").trim();
                if (cue) out.push("**" + maT("export_memory_cue_label", "Memory cue:") + "** " + esc(cue), "");
                const verified = !!(maRules && typeof maRules.isCardVerified === "function" && maRules.isCardVerified(c));
                out.push("**" + (verified ? maT("facts_verified", "Teacher-verified facts") : maT("facts_pending", "Facts awaiting teacher review")) + ":**");
                (Array.isArray(c.essentialFacts) ? c.essentialFacts : []).slice(0, 10).forEach((f) => {
                  if (f) out.push("- " + esc(f));
                });
                if (c.mapping) out.push("", "_" + maT("mapping_heading", "How the cue connects") + ":_ " + esc(c.mapping));
                out.push("");
              });
            } else if (ty === "image" && d && d.prompt) {
              out.push("_Image: " + esc(d.prompt) + "_", "");
            } else {
              const tx = d && (d.text || d.content || d.summary) || "";
              if (tx) out.push(esc(tx).trim(), "");
              else if (d && typeof d === "object") {
                const eh = typeof window !== "undefined" && window.AlloModules && window.AlloModules.ExportHandlers || null;
                const lines = eh && typeof eh.summarizeResourceText === "function" ? eh.summarizeResourceText(it, { maxChars: 4e3 }) : [];
                if (lines.length) {
                  lines.forEach((line) => out.push("- " + esc(line)));
                  out.push("");
                } else out.push("_This resource has no text export yet. Use the HTML export for the full resource._", "");
              }
            }
          });
        } else if (doc) {
          let html = "";
          try {
            let _mdClone = _builderFinalizeDocumentForExport(doc.documentElement.cloneNode(true));
            _mdClone.querySelectorAll(".allo-block-controls, .allo-block-remove, .a11y-inspect-badge, [data-allo-crop-ui], #a11y-inspect-styles, #allo-builder-edit-css, script, style").forEach((el) => el.remove());
            _builderStripEditorBreakMetadata(_mdClone);
            html = _mdClone.outerHTML;
          } catch (_) {
            html = doc.documentElement.outerHTML;
          }
          const _cellTxt2 = (s) => String(s || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").replace(/\|/g, "\\|").trim();
          html = html.replace(/<table\b[\s\S]*?<\/table>/gi, (tbl) => {
            const rows = (tbl.match(/<tr\b[\s\S]*?<\/tr>/gi) || []).map((tr) => (tr.match(/<t[hd]\b[\s\S]*?<\/t[hd]>/gi) || []).map(_cellTxt2));
            if (!rows.length) return "\n";
            const w = Math.max(...rows.map((r) => r.length));
            const line = (r) => "| " + Array.from({ length: w }, (_, i) => r[i] || "").join(" | ") + " |";
            return "\n\n" + line(rows[0]) + "\n|" + Array.from({ length: w }, () => " --- |").join("") + "\n" + rows.slice(1).map(line).join("\n") + "\n\n";
          });
          html = html.replace(/<img\b[^>]*alt=["']([^"']*)["'][^>]*>/gi, (m, alt) => "\n\n![" + String(alt).replace(/\]/g, ")") + "](image)\n\n");
          const body = html.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n").replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n").replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n").replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n").replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n").replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**").replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*").replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\n{3,}/g, "\n\n").trim();
          out.push(body);
        } else {
          addToast("Nothing to export yet \u2014 generate a lesson first", "error");
          return;
        }
        const md = out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
        let copied = false;
        try {
          copied = window.alloCopyText ? await window.alloCopyText(md) : false;
        } catch (_) {
        }
        const blob = new Blob([md], { type: "text/markdown" });
        downloadBuilderBlob(blob, { extension: "md", suffix: "-notebooklm" });
        addToast(copied ? "Copied to clipboard + downloaded .md \u2014 paste or upload into NotebookLM as a source" : "Downloaded .md \u2014 upload it into NotebookLM as a source", "success");
      } catch (e) {
        if (addToast) addToast("NotebookLM export failed", "error");
      } finally {
        if (mountedRef.current) setAltExportBusy("");
      }
    }, className: "w-full text-left px-2 py-1.5 text-[11px] font-medium text-indigo-700 hover:bg-indigo-50 rounded-lg disabled:opacity-50" }, altExportBusy === "notebooklm" ? "Building NotebookLM source..." : "\u{1F4D3} Send to NotebookLM (.md)"), /* @__PURE__ */ React.createElement("button", { disabled: !!altExportBusy, onClick: async () => {
      const _preflight = runBuilderPreflight("epub", false);
      if (_preflight.errors) {
        addToast && addToast("ePub export stopped: fix the blocking preflight issues first.", "error");
        return;
      }
      const doc = exportPreviewRef.current?.contentDocument;
      if (!doc || !window.JSZip) {
        addToast("ePub library loading...", "info");
        return;
      }
      if (altExportBusy) return;
      setAltExportBusy("epub");
      try {
        let _clone = doc.documentElement.cloneNode(true);
        try {
          _clone = _builderFinalizeDocumentForExport(_clone);
          _clone.querySelectorAll(".allo-block-controls, .allo-block-remove, .a11y-inspect-badge, [data-allo-crop-ui], #a11y-inspect-styles, #allo-builder-edit-css, script").forEach((el) => el.remove());
          _clone.querySelectorAll("[data-allo-crop-tabindex-added]").forEach((el) => {
            const added = el.getAttribute("data-allo-crop-tabindex-added") === "added";
            el.removeAttribute("data-allo-crop-tabindex-added");
            if (added) el.removeAttribute("tabindex");
            el.removeAttribute("aria-keyshortcuts");
          });
          _clone.querySelectorAll("[contenteditable]").forEach((el) => el.removeAttribute("contenteditable"));
          _builderStripEditorBreakMetadata(_clone);
        } catch (_) {
        }
        const _escXml = (s) => String(s || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
        const title = (exportConfig && (exportConfig.title || exportConfig.docTitle || exportConfig.lessonTitle) || (doc.title || "").trim() || "AlloFlow Document").substring(0, 120);
        _clone.querySelectorAll('link[rel~="stylesheet"][href]').forEach((link) => {
          try {
            if (/^https?:/i.test(new URL(link.getAttribute("href") || "", doc.baseURI).href)) link.remove();
          } catch (_) {
          }
        });
        _clone.querySelectorAll("style").forEach((style) => {
          const css = style.textContent || "";
          style.textContent = css.replace(/@import\s+[^;]+;/gi, "").replace(/@font-face\s*\{[^}]*https?:[^}]*\}/gi, "").replace(/url\(\s*(['"]?)https?:[^)]+\)/gi, "none");
        });
        const _rawLang = (doc.documentElement.getAttribute("lang") || "en").trim().replace(/_/g, "-");
        const lang = /^[a-z]{2,8}(?:-[a-z0-9]{1,8})*$/i.test(_rawLang) ? _rawLang : "en";
        const xmlTitle = _escXml(title);
        const _navItems = [];
        try {
          const _hs = _clone.querySelectorAll("h1, h2, h3");
          for (let _hi = 0; _hi < _hs.length; _hi++) {
            const _h = _hs[_hi];
            const _txt = (_h.textContent || "").replace(/\s+/g, " ").trim().substring(0, 120);
            if (!_txt) continue;
            if (!_h.id) _h.id = "allo-toc-" + _hi;
            _navItems.push('<li><a href="content.xhtml#' + _escXml(_h.id) + '">' + _escXml(_txt) + "</a></li>");
          }
        } catch (_) {
        }
        const _navList = _navItems.length ? _navItems.join("") : '<li><a href="content.xhtml">' + xmlTitle + "</a></li>";
        const zip = new window.JSZip();
        zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
        zip.file("META-INF/container.xml", '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
        const _imageManifest = [];
        let _hasRemoteResources = false;
        let _unavailableRemoteImages = 0;
        const _replaceImageFallback = (img) => {
          const fallback = _clone.ownerDocument.createElement("span");
          fallback.setAttribute("role", "img");
          const alt = (img.getAttribute("alt") || "").trim();
          fallback.setAttribute("aria-label", alt || "Image unavailable in this ePub");
          fallback.textContent = alt ? "[Image: " + alt + "]" : "[Image unavailable]";
          img.replaceWith(fallback);
        };
        const _images = Array.from(_clone.querySelectorAll("img[src]"));
        for (let index = 0; index < _images.length; index++) {
          const img = _images[index];
          const src = img.getAttribute("src") || "";
          const match = src.match(/^data:image\/(png|jpe?g|gif|webp);base64,([a-z0-9+/=\s]+)$/i);
          if (match) {
            const kind = match[1].toLowerCase();
            const ext = kind === "jpeg" || kind === "jpg" ? "jpg" : kind;
            const mediaType = ext === "jpg" ? "image/jpeg" : "image/" + ext;
            const path = "images/image-" + (index + 1) + "." + ext;
            zip.file("OEBPS/" + path, match[2].replace(/\s/g, ""), { base64: true });
            img.setAttribute("src", path);
            _imageManifest.push('<item id="image-' + (index + 1) + '" href="' + path + '" media-type="' + mediaType + '"/>');
            continue;
          }
          try {
            const absolute = new URL(src, doc.baseURI).href;
            if (!/^https?:/i.test(absolute)) {
              _replaceImageFallback(img);
              continue;
            }
            const controller = typeof AbortController === "function" ? new AbortController() : null;
            const timer = window.setTimeout(() => controller?.abort(), 1e4);
            let response;
            try {
              response = await fetch(absolute, { credentials: "omit", signal: controller?.signal });
            } finally {
              window.clearTimeout(timer);
            }
            if (!response.ok) throw new Error(`Image request failed (${response.status})`);
            const mediaType = String(response.headers.get("content-type") || "").split(";")[0].toLowerCase();
            const extensionByType = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp" };
            const ext = extensionByType[mediaType];
            if (!ext) throw new Error("Unsupported remote image type");
            const bytes = await response.arrayBuffer();
            if (bytes.byteLength > 8 * 1024 * 1024) throw new Error("Remote image exceeds 8 MB");
            const path = "images/image-" + (index + 1) + "." + ext;
            zip.file("OEBPS/" + path, bytes);
            img.setAttribute("src", path);
            _imageManifest.push('<item id="image-' + (index + 1) + '" href="' + path + '" media-type="' + mediaType + '"/>');
          } catch (_) {
            _unavailableRemoteImages += 1;
            _replaceImageFallback(img);
          }
        }
        const _uid = "alloflow-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
        try {
          _hasRemoteResources = Array.from(_clone.querySelectorAll("audio[src],video[src],source[src],object[data]")).some((node) => {
            const ref = node.getAttribute("src") || node.getAttribute("data") || "";
            try {
              return /^https?:/i.test(new URL(ref, doc.baseURI).href);
            } catch (_) {
              return false;
            }
          });
        } catch (_) {
        }
        const _contentProps = [];
        try {
          if (_clone.querySelector("svg")) _contentProps.push("svg");
          if (_clone.querySelector("math")) _contentProps.push("mathml");
          if (_hasRemoteResources) _contentProps.push("remote-resources");
        } catch (_) {
        }
        const _contentPropAttr = _contentProps.length ? ' properties="' + _contentProps.join(" ") + '"' : "";
        zip.file("OEBPS/content.opf", `<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="uid">${_uid}</dc:identifier><dc:title>${xmlTitle}</dc:title><dc:language>${_escXml(lang)}</dc:language><meta property="dcterms:modified">${(/* @__PURE__ */ new Date()).toISOString().replace(/\.\d+Z$/, "Z")}</meta></metadata><manifest><item id="content" href="content.xhtml" media-type="application/xhtml+xml"${_contentPropAttr}/><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>${_imageManifest.join("")}</manifest><spine><itemref idref="content"/></spine></package>`);
        let xhtml;
        try {
          xhtml = new XMLSerializer().serializeToString(_clone).replace(/\sxmlns="([^"]+)"(?=[^<>]*\sxmlns="\1")/g, "");
        } catch (_) {
          xhtml = _clone.outerHTML.replace(/<br>/g, "<br/>").replace(/<hr>/g, "<hr/>").replace(/<img([^>]*[^/])>/g, "<img$1/>").replace(/&nbsp;/g, "&#160;");
        }
        if (!/^<html\b[^>]*\sxmlns=/i.test(xhtml)) xhtml = xhtml.replace(/^<html\b/i, '<html xmlns="http://www.w3.org/1999/xhtml"');
        zip.file("OEBPS/content.xhtml", xhtml);
        zip.file("OEBPS/nav.xhtml", `<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${_escXml(lang)}" xml:lang="${_escXml(lang)}"><head><title>${xmlTitle} \u2014 Contents</title></head><body><nav epub:type="toc"><h1>Contents</h1><ol>${_navList}</ol></nav></body></html>`);
        const blob = await zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
        downloadBuilderBlob(blob, { extension: "epub" });
        if (_unavailableRemoteImages) {
          addToast(`${_unavailableRemoteImages} remote image${_unavailableRemoteImages === 1 ? "" : "s"} could not be packaged and were replaced with accessible text.`, "warning");
        } else {
          addToast("ePub downloaded", "success");
        }
      } catch (error) {
        addToast && addToast("ePub export failed: " + (error?.message || "unknown error"), "error");
      } finally {
        if (mountedRef.current) setAltExportBusy("");
      }
    }, className: "w-full text-left px-2 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 rounded-lg disabled:opacity-50" }, altExportBusy === "epub" ? "Building ePub..." : "\u{1F4DA} ePub (e-readers)"), /* @__PURE__ */ React.createElement("button", { disabled: !!altExportBusy, onClick: async () => {
      const doc = exportPreviewRef.current?.contentDocument;
      if (!doc) return;
      if (altExportBusy) return;
      setAltExportBusy("brf");
      try {
        let text = "";
        try {
          const _bClone = doc.body.cloneNode(true);
          _bClone.querySelectorAll(".allo-block-controls, .allo-block-remove, .a11y-inspect-badge, [data-allo-crop-ui], #a11y-inspect-styles, script, style").forEach((el) => el.remove());
          _bClone.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach((el) => {
            try {
              el.insertAdjacentText("beforebegin", "\n\n");
              el.appendChild(doc.createTextNode("\n"));
            } catch (_) {
            }
          });
          _bClone.querySelectorAll("p,li,tr,figcaption,blockquote,div").forEach((el) => {
            try {
              el.appendChild(doc.createTextNode("\n"));
            } catch (_) {
            }
          });
          text = (_bClone.textContent || "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
        } catch (_) {
          text = doc.body.innerText || doc.body.textContent || "";
        }
        const _brfDigit = { "1": "A", "2": "B", "3": "C", "4": "D", "5": "E", "6": "F", "7": "G", "8": "H", "9": "I", "0": "J" };
        const _brfPunct = { ",": "1", ";": "2", ":": "3", ".": "4", "!": "6", "?": "8", "(": '"<', ")": '">', "'": "'", "-": "-", "/": "_/", "*": '"9', "&": "@&", "+": '"6', "=": '"7', "<": "@<", ">": "@>" };
        const _brfSmart = { "\u2018": "'", "\u2019": "'", "\u2013": "-", "\u2014": "-", "\u2026": "...", "\xA0": " ", "\u2022": "*" };
        const _brfOpenQuote = "\uE000", _brfCloseQuote = "\uE001";
        const _brfPrefix = /[#,;@_^".]$/;
        const _brfHardSplit = (word, into, cells) => {
          if (/^#[A-J14]+$/.test(word)) {
            while (word.length > cells) {
              into.push(word.slice(0, cells - 1) + '"');
              word = word.slice(cells - 1);
            }
            if (word) into.push(word);
            return;
          }
          while (word.length > cells) {
            let cut = cells;
            while (cut > 1 && _brfPrefix.test(word.slice(0, cut))) cut--;
            into.push(word.slice(0, cut));
            word = word.slice(cut);
          }
          if (word) into.push(word);
        };
        const _brfWrap = (line, into, cells) => {
          if (line.length <= cells) {
            into.push(line);
            return;
          }
          const words = line.split(" ");
          let cur = "";
          for (let word of words) {
            if (word.length > cells) {
              if (cur) {
                into.push(cur);
                cur = "";
              }
              _brfHardSplit(word, into, cells);
              continue;
            }
            if (!cur) cur = word;
            else if (cur.length + 1 + word.length <= cells) cur += " " + word;
            else {
              into.push(cur);
              cur = word;
            }
          }
          if (cur) into.push(cur);
        };
        const _toBRF = (src, opts) => {
          const cells = opts && opts.cellsPerLine || 40;
          let norm = String(src == null ? "" : src).replace(/[\u201c\u00ab]/g, _brfOpenQuote).replace(/[\u201d\u00bb]/g, _brfCloseQuote);
          norm = norm.replace(/[\u2018\u2019\u2013\u2014\u2026\u00a0\u2022]/g, (c) => _brfSmart[c] || "");
          try {
            norm = norm.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          } catch (_) {
          }
          const out = [];
          let dropped = 0;
          for (const line of norm.replace(/\n?/g, "\n").split("\n")) {
            const chars = Array.from(line);
            let bl = "";
            let numMode = false;
            for (let i = 0; i < chars.length; i++) {
              const ch = chars[i];
              if (ch >= "0" && ch <= "9") {
                if (!numMode) {
                  bl += "#";
                  numMode = true;
                }
                bl += _brfDigit[ch];
                continue;
              }
              if (numMode && (ch === "," || ch === ".")) {
                bl += _brfPunct[ch];
                continue;
              }
              if (numMode && ch >= "a" && ch <= "j") bl += ";";
              numMode = false;
              if (ch >= "a" && ch <= "z") {
                bl += ch.toUpperCase();
                continue;
              }
              if (ch >= "A" && ch <= "Z") {
                let end = i;
                while (end < chars.length && chars[end] >= "A" && chars[end] <= "Z") end++;
                const prevIsLetter = i > 0 && /[A-Za-z]/.test(chars[i - 1]);
                const nextIsLetter = end < chars.length && /[A-Za-z]/.test(chars[end]);
                if (!prevIsLetter && !nextIsLetter && end - i >= 2) {
                  bl += ",," + chars.slice(i, end).join("");
                  i = end - 1;
                } else bl += "," + ch;
                continue;
              }
              if (ch === " " || ch === "	") {
                bl += " ";
                continue;
              }
              if (ch === _brfOpenQuote) {
                bl += "8";
                continue;
              }
              if (ch === _brfCloseQuote) {
                bl += "0";
                continue;
              }
              if (ch === '"') {
                const prev = i > 0 ? chars[i - 1] : "";
                bl += !prev || /\s|[([{]/.test(prev) ? "8" : "0";
                continue;
              }
              if (_brfPunct[ch] !== void 0) {
                bl += _brfPunct[ch];
                continue;
              }
              dropped++;
            }
            _brfWrap(bl, out, cells);
          }
          const brf = out.join("\n");
          return opts && opts.withMeta ? { brf, dropped } : brf;
        };
        const _downloadBRF = (brf) => {
          const blob = new Blob([brf], { type: "application/x-brf" });
          downloadBuilderBlob(blob, { extension: "brf" });
        };
        const _ensureBrailleLoader = window.AlloBraille && typeof window.AlloBraille.toUEB === "function" ? Promise.resolve(true) : window.__alloLoadPlugin ? window.__alloLoadPlugin("liblouis_braille_loader.js") : Promise.resolve(false);
        await Promise.resolve(_ensureBrailleLoader).catch(() => false).then(async () => {
          let _g1Dropped = 0, _grade1;
          if (window.AlloBraille && typeof window.AlloBraille.toGrade1BRF === "function") {
            const _r = window.AlloBraille.toGrade1BRF(text, { withMeta: true });
            _grade1 = _r.brf;
            _g1Dropped = _r.dropped;
          } else {
            const _r = _toBRF(text, { withMeta: true });
            _grade1 = _r.brf;
            _g1Dropped = _r.dropped;
          }
          const _warnDrop = () => {
            if (_g1Dropped > 0 && addToast) addToast(_g1Dropped + " character(s) had no Grade-1 braille equivalent and were skipped. Try the UEB option or check the source.", "info");
          };
          if (window.AlloBraille && typeof window.AlloBraille.toUEB === "function") {
            addToast("Preparing contracted braille (UEB Grade 2)\u2026", "info");
            await Promise.resolve(window.AlloBraille.toUEB(text)).then((ueb) => {
              if (ueb && ueb.replace(/\s/g, "").length) {
                _downloadBRF(ueb);
                addToast("Electronic Braille (UEB Grade 2) downloaded", "success");
              } else {
                _downloadBRF(_grade1);
                _warnDrop();
                addToast("Electronic Braille (Grade 1) downloaded", "success");
              }
            }).catch(() => {
              _downloadBRF(_grade1);
              _warnDrop();
              addToast("Electronic Braille (Grade 1) downloaded", "success");
            });
          } else {
            _downloadBRF(_grade1);
            _warnDrop();
            addToast("Electronic Braille (BRF) downloaded", "success");
          }
        });
      } catch (error) {
        addToast && addToast("Braille export failed: " + (error?.message || "unknown error"), "error");
      } finally {
        if (mountedRef.current) setAltExportBusy("");
      }
    }, className: "w-full text-left px-2 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 rounded-lg disabled:opacity-50" }, altExportBusy === "brf" ? "Building Braille..." : "\u283F Electronic Braille (.brf)"))))), preflightResult && /* @__PURE__ */ React.createElement("div", { className: `border-b px-3 py-2 text-xs ${preflightResult.errors ? "bg-red-50 border-red-300 text-red-900" : preflightResult.warnings ? "bg-amber-50 border-amber-300 text-amber-900" : "bg-green-50 border-green-300 text-green-900"}`, role: "status", "aria-live": "polite" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("strong", null, preflightResult.errors ? "Export blocked by preflight" : preflightResult.warnings ? "Preflight passed with warnings" : "Preflight passed"), /* @__PURE__ */ React.createElement("span", null, preflightResult.errors, " error", preflightResult.errors === 1 ? "" : "s", " / ", preflightResult.warnings, " warning", preflightResult.warnings === 1 ? "" : "s"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setPreflightResult(null), className: "ml-auto underline font-bold" }, "Dismiss")), !!preflightResult.issues.length && /* @__PURE__ */ React.createElement("ul", { className: "mt-1 list-disc pl-5 space-y-0.5" }, preflightResult.issues.map((issue, index) => /* @__PURE__ */ React.createElement("li", { key: issue.code + "-" + index }, /* @__PURE__ */ React.createElement("strong", null, issue.severity === "error" ? "Fix:" : "Review:"), " ", issue.message)))), draftRecovery && /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900", role: "status", "aria-live": "polite" }, /* @__PURE__ */ React.createElement("span", { className: "font-bold" }, "Local draft available"), /* @__PURE__ */ React.createElement("span", null, "Saved ", draftRecovery.at ? new Date(draftRecovery.at).toLocaleString() : "recently", " on this device."), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: restoreLocalDraft, className: "rounded bg-amber-700 px-2 py-1 font-bold text-white hover:bg-amber-800" }, "Restore draft"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: discardLocalDraft, className: "rounded px-2 py-1 font-semibold text-amber-800 underline hover:text-amber-950" }, "Dismiss")), /* @__PURE__ */ React.createElement("div", { className: "flex shrink-0 items-center gap-1 overflow-x-auto border-b border-slate-300 bg-slate-100 px-2 py-1", role: "tablist", "aria-label": "Document Builder ribbon" }, [["home", "Home"], ["insert", "Insert"], ["layout", "Layout"], ["review", "Review"], ["view", "View"], ["expert", isAgentRunning ? "\u{1F916} Expert Workbench \u2022" : "\u{1F916} Expert Workbench"]].map(([tab, label]) => {
      const selected = activeRibbonTab === tab;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: tab,
          id: `builder-ribbon-tab-${tab}`,
          type: "button",
          role: "tab",
          "aria-selected": selected,
          "aria-controls": `builder-ribbon-panel-${tab}`,
          tabIndex: selected ? 0 : -1,
          onClick: () => {
            setActiveRibbonTab(tab);
            setRibbonCollapsed(false);
          },
          onKeyDown: (event) => {
            const tabs = ["home", "insert", "layout", "review", "view", "expert"];
            const current = tabs.indexOf(tab);
            const next = event.key === "ArrowRight" ? (current + 1) % tabs.length : event.key === "ArrowLeft" ? (current - 1 + tabs.length) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1;
            if (next < 0) return;
            event.preventDefault();
            setActiveRibbonTab(tabs[next]);
            setRibbonCollapsed(false);
            window.setTimeout(() => document.getElementById(`builder-ribbon-tab-${tabs[next]}`)?.focus(), 0);
          },
          className: `shrink-0 rounded px-3 py-1.5 text-[11px] font-bold transition-colors ${selected && !ribbonCollapsed ? "bg-white text-indigo-800 shadow-sm ring-1 ring-slate-300" : "text-slate-600 hover:bg-white hover:text-indigo-700"}`
        },
        label
      );
    }), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setRibbonCollapsed((value) => !value), "aria-expanded": !ribbonCollapsed, "aria-controls": `builder-ribbon-panel-${activeRibbonTab}`, className: "ml-auto rounded px-2 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-white hover:text-indigo-700", title: ribbonCollapsed ? "Expand the ribbon" : "Collapse the ribbon" }, ribbonCollapsed ? "Expand ribbon" : "Collapse ribbon")), !ribbonCollapsed && activeRibbonTab === "review" && /* @__PURE__ */ React.createElement("div", { id: "builder-ribbon-panel-review", role: "tabpanel", "aria-labelledby": "builder-ribbon-tab-review", className: "shrink-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-1.5", role: "group", "aria-label": "Review tools" }, /* @__PURE__ */ React.createElement("button", { id: "builder-track-changes", type: "button", onMouseDown: (event) => event.preventDefault(), onClick: () => toggleTrackChanges(), "aria-pressed": trackChangesEnabled, "aria-keyshortcuts": "Control+Shift+E", className: `h-8 rounded px-2.5 text-[11px] font-bold shadow-sm ${trackChangesEnabled ? "bg-violet-700 text-white hover:bg-violet-800" : "border border-violet-500 bg-white text-violet-800 hover:bg-violet-50"}`, title: "Toggle Track Changes (Ctrl+Shift+E)" }, "Track Changes: ", trackChangesEnabled ? "On" : "Off"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => openTrackedChanges(activeTrackedChangeId), "aria-pressed": showNavigationPane && navigationPaneTab === "changes", "aria-controls": "document-builder-navigation", className: "h-8 rounded border border-violet-500 bg-white px-2.5 text-[11px] font-bold text-violet-800 hover:bg-violet-50" }, "Changes (", pendingTrackedChangeCount, ")"), /* @__PURE__ */ React.createElement("label", { className: "sr-only", htmlFor: "builder-ribbon-markup-view" }, "Markup view"), /* @__PURE__ */ React.createElement("select", { id: "builder-ribbon-markup-view", value: trackedMarkupView, onChange: (event) => setTrackedMarkupView(event.target.value), className: "h-8 rounded border border-violet-400 bg-white px-1.5 text-[11px] font-bold text-violet-800", title: "Choose how revisions appear" }, /* @__PURE__ */ React.createElement("option", { value: "simple" }, "Simple Markup"), /* @__PURE__ */ React.createElement("option", { value: "all" }, "All Markup"), /* @__PURE__ */ React.createElement("option", { value: "none" }, "No Markup"), /* @__PURE__ */ React.createElement("option", { value: "original" }, "Original")), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: !activeTrackedChange, onClick: () => activeTrackedChange && applyTrackedChangeDecision(activeTrackedChange.id, "accept"), className: "h-8 rounded border border-emerald-500 bg-white px-2 text-[11px] font-bold text-emerald-800 hover:bg-emerald-50 disabled:opacity-40" }, "Accept"), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: !activeTrackedChange, onClick: () => activeTrackedChange && applyTrackedChangeDecision(activeTrackedChange.id, "reject"), className: "h-8 rounded border border-red-400 bg-white px-2 text-[11px] font-bold text-red-700 hover:bg-red-50 disabled:opacity-40" }, "Reject"), /* @__PURE__ */ React.createElement("span", { className: "mx-0.5 h-6 w-px bg-slate-300", "aria-hidden": "true" }), /* @__PURE__ */ React.createElement("button", { id: "builder-new-comment", type: "button", onMouseDown: (event) => event.preventDefault(), onClick: addReviewComment, "aria-keyshortcuts": "Control+Alt+M", className: "h-8 rounded bg-amber-600 px-2.5 text-[11px] font-bold text-white shadow-sm hover:bg-amber-700", title: "Comment on the selected text (Ctrl+Alt+M)" }, "New Comment"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => openReviewComments(activeCommentId), "aria-pressed": showNavigationPane && navigationPaneTab === "comments", "aria-controls": "document-builder-navigation", className: "h-8 rounded border border-amber-500 bg-white px-2.5 text-[11px] font-bold text-amber-800 hover:bg-amber-50" }, "Comments (", unresolvedReviewCommentCount, ")"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: openWordCountDetails, "aria-expanded": showWordCountDetails, "aria-controls": "builder-word-count-panel", "aria-keyshortcuts": "Control+Shift+G", className: "h-8 rounded border border-indigo-500 bg-white px-2.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50" }, "Word Count"), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-medium text-slate-600" }, pendingTrackedChangeCount ? `${pendingTrackedChangeCount} pending change${pendingTrackedChangeCount === 1 ? "" : "s"}` : selectionStatistics.active ? `${selectionStatistics.words.toLocaleString()} selected / ${wordCount.toLocaleString()} total words` : `${wordCount.toLocaleString()} words`, " \xB7 ", documentStatistics.readingMinutes || 0, " min reading time"), /* @__PURE__ */ React.createElement("span", { className: "ml-auto text-[10px] text-slate-500" }, "Ctrl+Shift+E track \xB7 Ctrl+Alt+M comment \xB7 Ctrl+Alt+F footnote \xB7 Ctrl+Shift+G word count")), /* @__PURE__ */ React.createElement("details", { id: "builder-find-tools", className: "bg-white border-b border-slate-200 shrink-0" }, /* @__PURE__ */ React.createElement("summary", { className: "cursor-pointer px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50" }, "Find / Replace | Heading Outline (", headingOutline.length, ") ", /* @__PURE__ */ React.createElement("span", { className: "font-normal text-slate-500" }, findMatchState.count ? `${findMatchState.current || 0}/${findMatchState.count} matches` : "No matches", " | Ctrl+F / Ctrl+H")), /* @__PURE__ */ React.createElement("div", { className: "grid gap-2 border-t border-slate-200 bg-slate-50 p-2 lg:grid-cols-2" }, /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-1" }, /* @__PURE__ */ React.createElement("label", { htmlFor: "builder-find", className: "sr-only" }, "Find text"), /* @__PURE__ */ React.createElement("input", { id: "builder-find", value: findQuery, onChange: (e) => {
      setFindQuery(e.target.value);
      findCursorRef.current = { node: null, offset: 0 };
    }, onKeyDown: (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.shiftKey ? findPreviousInPreview() : findNextInPreview();
      }
    }, placeholder: "Find", className: "min-w-32 flex-1 rounded border border-slate-400 px-2 py-1 text-xs" }), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: findPreviousInPreview, disabled: !findQuery.trim(), className: "rounded border border-indigo-500 bg-white px-2 py-1 text-xs font-bold text-indigo-700 disabled:opacity-40", "aria-label": "Find previous match" }, "Prev"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: findNextInPreview, disabled: !findQuery.trim(), className: "rounded border border-indigo-500 bg-white px-2 py-1 text-xs font-bold text-indigo-700 disabled:opacity-40", "aria-label": "Find next match" }, "Next"), /* @__PURE__ */ React.createElement("span", { className: "min-w-16 px-1 text-[10px] font-semibold text-slate-500", role: "status", "aria-live": "polite" }, findMatchState.count ? `${findMatchState.current || 0} of ${findMatchState.count}` : "0 matches")), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-1" }, /* @__PURE__ */ React.createElement("label", { htmlFor: "builder-replace", className: "sr-only" }, "Replace with"), /* @__PURE__ */ React.createElement("input", { id: "builder-replace", value: replaceQuery, onChange: (e) => setReplaceQuery(e.target.value), onKeyDown: (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        replaceCurrentInPreview();
      }
    }, placeholder: "Replace with", className: "min-w-32 flex-1 rounded border border-slate-400 px-2 py-1 text-xs" }), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: replaceCurrentInPreview, disabled: !findQuery.trim() || !findMatchState.count, className: "rounded border border-indigo-500 bg-white px-2 py-1 text-xs font-bold text-indigo-700 disabled:opacity-40" }, "Replace current"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: replaceAllInPreview, disabled: !findQuery.trim() || !findMatchState.count, className: "rounded border border-indigo-500 bg-white px-2 py-1 text-xs font-bold text-indigo-700 disabled:opacity-40" }, "Replace all")), /* @__PURE__ */ React.createElement("fieldset", { className: "flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-medium text-slate-600", "aria-label": "Find options" }, /* @__PURE__ */ React.createElement("label", { className: "inline-flex cursor-pointer items-center gap-1" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: findOptions.matchCase, onChange: (e) => setFindOptions((options) => ({ ...options, matchCase: e.target.checked })), className: "accent-indigo-700" }), "Match case"), /* @__PURE__ */ React.createElement("label", { className: "inline-flex cursor-pointer items-center gap-1" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: findOptions.wholeWord, onChange: (e) => setFindOptions((options) => ({ ...options, wholeWord: e.target.checked })), className: "accent-indigo-700" }), "Whole words"), /* @__PURE__ */ React.createElement("label", { className: "inline-flex cursor-pointer items-center gap-1" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: findOptions.highlightAll, onChange: (e) => setFindOptions((options) => ({ ...options, highlightAll: e.target.checked })), className: "accent-indigo-700" }), "Highlight all"))), /* @__PURE__ */ React.createElement("nav", { "aria-label": "Document heading outline", className: "max-h-24 overflow-y-auto rounded border border-slate-300 bg-white p-1" }, headingOutline.length ? headingOutline.map((heading) => /* @__PURE__ */ React.createElement("button", { key: heading.index + "-" + heading.text, type: "button", onClick: () => jumpToHeading(heading), "aria-current": activeHeadingIndex === heading.index ? "location" : void 0, className: `block w-full truncate rounded px-2 py-1 text-left text-[11px] ${activeHeadingIndex === heading.index ? "bg-indigo-100 font-bold text-indigo-800 ring-1 ring-indigo-200" : "text-slate-700 hover:bg-indigo-50"}`, style: { paddingLeft: Math.min(28, 4 + (heading.level - 1) * 6) }, title: heading.text }, "H", heading.level, " - ", heading.text)) : /* @__PURE__ */ React.createElement("span", { className: "block px-2 py-1 text-[11px] text-slate-500" }, "No headings yet.")))), /* @__PURE__ */ React.createElement("details", { id: "builder-version-history", className: "bg-white border-b border-slate-200 shrink-0" }, /* @__PURE__ */ React.createElement("summary", { className: "cursor-pointer px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50" }, "Version History (", versionHistory.length, ") ", /* @__PURE__ */ React.createElement("span", { className: "font-normal text-slate-500" }, "Stored on this device")), /* @__PURE__ */ React.createElement("div", { className: "border-t border-slate-200 bg-slate-50 p-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-[10px] text-slate-500" }, "Recent restore points stay on this device."), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: saveVersionSnapshot, className: "rounded bg-indigo-700 px-2 py-1 text-[11px] font-bold text-white hover:bg-indigo-800" }, "Save snapshot")), /* @__PURE__ */ React.createElement("div", { className: "mt-2 max-h-36 space-y-1 overflow-y-auto" }, versionHistory.length ? versionHistory.map((snapshot) => /* @__PURE__ */ React.createElement("div", { key: snapshot.id, className: "flex items-center gap-2 rounded border border-slate-200 bg-white px-2 py-1" }, /* @__PURE__ */ React.createElement("div", { className: "min-w-0 flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "truncate text-[11px] font-semibold text-slate-700" }, snapshot.label), /* @__PURE__ */ React.createElement("time", { className: "text-[10px] text-slate-500", dateTime: new Date(snapshot.at).toISOString() }, new Date(snapshot.at).toLocaleString())), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => compareVersionSnapshot(snapshot), "aria-pressed": versionComparison?.snapshotId === snapshot.id, className: "rounded border border-violet-400 px-2 py-1 text-[10px] font-bold text-violet-700 hover:bg-violet-50" }, "Compare"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => restoreVersionSnapshot(snapshot), className: "rounded border border-indigo-500 px-2 py-1 text-[10px] font-bold text-indigo-700 hover:bg-indigo-50" }, "Restore"))) : /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-500" }, "No snapshots yet. Editing will save recent versions automatically.")), versionComparison && /* @__PURE__ */ React.createElement("section", { "aria-label": "Version comparison with " + versionComparison.label, className: "mt-2 rounded-lg border border-violet-300 bg-violet-50 p-2 text-[10px] text-violet-950" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-start justify-between gap-2" }, /* @__PURE__ */ React.createElement("div", { role: "status", "aria-live": "polite" }, /* @__PURE__ */ React.createElement("h4", { className: "font-black" }, "Compared with ", versionComparison.label), /* @__PURE__ */ React.createElement("p", { className: "text-violet-700" }, new Date(versionComparison.at).toLocaleString(), " \xB7 ", versionComparison.changed, " changed block", versionComparison.changed === 1 ? "" : "s")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => {
      const snapshot = versionHistory.find((item) => item.id === versionComparison.snapshotId);
      if (snapshot) restoreVersionSnapshot(snapshot);
    }, className: "rounded border border-indigo-400 bg-white px-2 py-1 font-bold text-indigo-800 hover:bg-indigo-50" }, "Restore full version"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setVersionComparison(null), className: "rounded px-1.5 py-1 font-bold text-violet-700 hover:bg-violet-100", "aria-label": "Close version comparison" }, "Close"))), /* @__PURE__ */ React.createElement("div", { className: "mt-2 grid grid-cols-4 gap-1 text-center" }, /* @__PURE__ */ React.createElement("span", { className: "rounded bg-white px-1 py-1" }, /* @__PURE__ */ React.createElement("strong", { className: "block text-emerald-700" }, versionComparison.added), "Added"), /* @__PURE__ */ React.createElement("span", { className: "rounded bg-white px-1 py-1" }, /* @__PURE__ */ React.createElement("strong", { className: "block text-red-700" }, versionComparison.removed), "Removed"), /* @__PURE__ */ React.createElement("span", { className: "rounded bg-white px-1 py-1" }, /* @__PURE__ */ React.createElement("strong", { className: "block text-amber-700" }, versionComparison.modified), "Modified"), /* @__PURE__ */ React.createElement("span", { className: "rounded bg-white px-1 py-1" }, /* @__PURE__ */ React.createElement("strong", { className: "block text-slate-700" }, versionComparison.unchanged), "Unchanged")), /* @__PURE__ */ React.createElement("p", { className: "mt-2 font-semibold" }, "Words: ", versionComparison.beforeWords.toLocaleString(), " \u2192 ", versionComparison.afterWords.toLocaleString(), " (", versionComparison.wordDelta >= 0 ? "+" : "", versionComparison.wordDelta, ") \xB7 Headings: ", versionComparison.beforeHeadings, " \u2192 ", versionComparison.afterHeadings), versionComparison.excerpts.length > 0 ? /* @__PURE__ */ React.createElement("div", { className: "mt-2 overflow-hidden rounded border border-violet-200 bg-white", "aria-label": "Side-by-side version comparison" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 border-b border-violet-200 bg-violet-100 font-black uppercase tracking-wide text-violet-800" }, /* @__PURE__ */ React.createElement("span", { className: "px-2 py-1" }, "Saved version"), /* @__PURE__ */ React.createElement("span", { className: "border-l border-violet-200 px-2 py-1" }, "Current document")), /* @__PURE__ */ React.createElement("ol", { className: "max-h-72 divide-y divide-violet-100 overflow-y-auto" }, versionComparison.excerpts.map((excerpt, index) => {
      const restorable = excerpt.kind === "modified" && excerpt.beforeTag && excerpt.beforeTag === excerpt.afterTag;
      return /* @__PURE__ */ React.createElement("li", { key: excerpt.kind + "-" + excerpt.beforeIndex + "-" + excerpt.afterIndex + "-" + index, className: "p-1.5" }, /* @__PURE__ */ React.createElement("div", { className: "mb-1 flex items-center justify-between gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "rounded px-1.5 py-0.5 text-[8px] font-black uppercase " + (excerpt.kind === "modified" ? "bg-amber-100 text-amber-800" : excerpt.kind === "removed" ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800") }, excerpt.kind), restorable && /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => restoreVersionComparisonBlock(excerpt), className: "rounded border border-indigo-400 bg-white px-2 py-1 text-[9px] font-bold text-indigo-800 hover:bg-indigo-50" }, "Use saved block")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2" }, /* @__PURE__ */ React.createElement("div", { className: "min-h-12 break-words rounded-l bg-red-50 px-2 py-1.5 text-red-950" }, excerpt.before ? /* @__PURE__ */ React.createElement("p", { className: "whitespace-pre-wrap" }, excerpt.before) : /* @__PURE__ */ React.createElement("em", { className: "text-red-500" }, "Not present in saved version")), /* @__PURE__ */ React.createElement("div", { className: "min-h-12 break-words rounded-r border-l border-violet-200 bg-emerald-50 px-2 py-1.5 text-emerald-950" }, excerpt.after ? /* @__PURE__ */ React.createElement("p", { className: "whitespace-pre-wrap" }, excerpt.after) : /* @__PURE__ */ React.createElement("em", { className: "text-emerald-600" }, "Not present in current document"))), excerpt.kind === "modified" && !restorable && /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-[9px] text-slate-500" }, "This block changed type; restore the full version to apply it safely."));
    }))) : /* @__PURE__ */ React.createElement("p", { className: "mt-2 rounded border border-emerald-200 bg-emerald-50 px-2 py-2 font-bold text-emerald-800" }, "The current document matches this saved version."), versionComparison.truncated && /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-violet-700" }, "Showing the first 24 changed blocks. The summary counts include the full comparison window."), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-slate-600" }, "Using a saved block preserves the rest of the document. If Track Changes is on, the restore becomes a reviewable structural change."))))), !ribbonCollapsed && activeRibbonTab === "home" && /* @__PURE__ */ React.createElement("div", { id: "builder-ribbon-panel-home", role: "tabpanel", "aria-labelledby": "builder-ribbon-tab-home", className: "shrink-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1", "aria-label": "Styles and Format Painter" }, /* @__PURE__ */ React.createElement("span", { className: "mr-1 text-[10px] font-black uppercase tracking-wider text-slate-500" }, "Styles"), /* @__PURE__ */ React.createElement("div", { className: "flex min-w-0 flex-1 gap-1 overflow-x-auto py-0.5", role: "toolbar", "aria-label": "Document styles" }, builderStyleGallery.map((styleOption) => {
      const selected = formatState.namedStyle === styleOption.id;
      const previewClass = styleOption.id === "title" ? "text-sm font-black" : styleOption.id.startsWith("heading") ? "font-black" : styleOption.id === "subtitle" ? "text-slate-500" : styleOption.id === "quote" ? "italic" : styleOption.id === "caption" ? "text-[9px] italic" : styleOption.id === "callout" ? "text-indigo-800" : "";
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: styleOption.id,
          type: "button",
          onMouseDown: (e) => e.preventDefault(),
          onClick: () => applyBuilderStyle(styleOption.id),
          "aria-pressed": selected,
          className: "min-h-8 shrink-0 rounded border px-2 py-1 text-[10px] transition-colors " + (selected ? "border-indigo-700 bg-indigo-700 text-white shadow-inner" : "border-slate-300 bg-white text-slate-700 hover:border-indigo-500 hover:bg-indigo-50"),
          title: "Apply " + styleOption.label + " style"
        },
        /* @__PURE__ */ React.createElement("span", { className: previewClass }, styleOption.label)
      );
    })), /* @__PURE__ */ React.createElement("span", { className: "mx-1 h-6 w-px bg-slate-300", "aria-hidden": "true" }), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onMouseDown: (e) => e.preventDefault(),
        onClick: useFormatPainter,
        "aria-pressed": formatPainterActive,
        className: "min-h-8 rounded border px-2 text-[10px] font-bold transition-colors " + (formatPainterActive ? "border-amber-600 bg-amber-100 text-amber-900 ring-2 ring-amber-300" : "border-slate-300 bg-white text-slate-700 hover:border-indigo-500 hover:bg-indigo-50"),
        title: formatPainterActive ? "Apply copied formatting to the current selection" : "Copy formatting from the current selection"
      },
      formatPainterActive ? "Apply format" : "Format Painter"
    ), formatPainterActive && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-medium text-amber-800", role: "status" }, "Select the destination, then choose Apply format."), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: cancelFormatPainter, className: "min-h-8 rounded px-2 text-[10px] font-bold text-slate-600 hover:bg-slate-200", "aria-label": "Cancel Format Painter" }, "Cancel")), /* @__PURE__ */ React.createElement("details", { id: "builder-styles-manager", className: "relative shrink-0" }, /* @__PURE__ */ React.createElement("summary", { className: "flex min-h-8 cursor-pointer list-none items-center rounded border border-slate-300 bg-white px-2 text-[10px] font-bold text-slate-700 hover:border-indigo-500 hover:bg-indigo-50" }, "Manage styles"), /* @__PURE__ */ React.createElement("div", { className: "absolute right-0 top-full z-[80] mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-slate-300 bg-white p-2 shadow-2xl" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between gap-2" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] font-black text-slate-800" }, "Custom styles"), /* @__PURE__ */ React.createElement("p", { className: "text-[9px] text-slate-500" }, "Saved on this device \xB7 ", customBuilderStyles.length, "/12")), /* @__PURE__ */ React.createElement("button", { type: "button", onMouseDown: (event) => event.preventDefault(), onClick: saveSelectionAsCustomStyle, className: "rounded bg-indigo-700 px-2 py-1.5 text-[10px] font-bold text-white hover:bg-indigo-800" }, "Save selection as style")), /* @__PURE__ */ React.createElement("div", { className: "mt-2 max-h-56 space-y-1 overflow-y-auto", "aria-label": "Saved custom styles" }, customBuilderStyles.length ? customBuilderStyles.map((styleOption) => /* @__PURE__ */ React.createElement("div", { key: styleOption.id, className: "flex items-center gap-1 rounded border border-slate-200 bg-slate-50 p-1" }, /* @__PURE__ */ React.createElement("button", { type: "button", onMouseDown: (event) => event.preventDefault(), onClick: () => applyBuilderStyle(styleOption.id), className: "min-w-0 flex-1 truncate rounded px-2 py-1.5 text-left text-[10px] font-bold text-slate-700 hover:bg-indigo-100 hover:text-indigo-800", title: "Apply " + styleOption.label }, styleOption.label), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => deleteCustomBuilderStyle(styleOption.id), className: "rounded px-1.5 py-1 text-[9px] font-bold text-rose-700 hover:bg-rose-100", "aria-label": "Delete custom style " + styleOption.label }, "Delete"))) : /* @__PURE__ */ React.createElement("p", { className: "rounded border border-dashed border-slate-300 p-2 text-[10px] text-slate-500" }, "Place the caret in a styled paragraph or heading, then save it for reuse."))))), "                ", /* @__PURE__ */ React.createElement("div", { className: "px-2 py-1 bg-white border-b border-slate-200 flex items-center gap-0.5 flex-wrap shrink-0", role: "toolbar", "aria-label": t("a11y.text_formatting") }, [
      { cmd: "bold", icon: "B", label: "Bold", style: "font-bold" },
      { cmd: "italic", icon: "I", label: "Italic", style: "italic" },
      { cmd: "underline", icon: "U", label: "Underline", style: "underline" },
      { cmd: "strikeThrough", icon: "S\u0336", label: "Strikethrough", style: "" },
      { cmd: "subscript", icon: "x\u2082", label: "Subscript", style: "" },
      { cmd: "superscript", icon: "x\xB2", label: "Superscript", style: "" }
    ].map((btn) => {
      const active = Boolean(formatState[btn.cmd]);
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: btn.cmd,
          type: "button",
          onMouseDown: (e) => e.preventDefault(),
          onClick: () => runEditorCommand(btn.cmd),
          "aria-pressed": active,
          className: `w-8 h-8 rounded text-xs ${btn.style} transition-colors border ${active ? "bg-indigo-700 text-white border-indigo-700 shadow-inner" : "text-slate-700 border-transparent hover:bg-indigo-100 hover:text-indigo-700 hover:border-indigo-600"}`,
          "aria-label": btn.label,
          title: btn.label
        },
        btn.icon
      );
    }), /* @__PURE__ */ React.createElement("label", { className: "ml-0.5 inline-flex items-center" }, /* @__PURE__ */ React.createElement("span", { className: "sr-only" }, "Text size"), /* @__PURE__ */ React.createElement("select", { value: formatState.fontSize, onChange: (e) => runEditorCommand("fontSize", e.target.value), className: "h-8 rounded border border-slate-400 bg-white px-1 text-[11px] text-slate-700", "aria-label": "Text size", title: "Text size" }, /* @__PURE__ */ React.createElement("option", { value: "1" }, "10 pt"), /* @__PURE__ */ React.createElement("option", { value: "2" }, "12 pt"), /* @__PURE__ */ React.createElement("option", { value: "3" }, "14 pt"), /* @__PURE__ */ React.createElement("option", { value: "4" }, "18 pt"), /* @__PURE__ */ React.createElement("option", { value: "5" }, "24 pt"), /* @__PURE__ */ React.createElement("option", { value: "6" }, "32 pt"), /* @__PURE__ */ React.createElement("option", { value: "7" }, "48 pt"))), /* @__PURE__ */ React.createElement("span", { className: "w-px h-5 bg-slate-200 mx-0.5", "aria-hidden": "true" }), [
      { val: "<h1>", block: "h1", styleId: "heading1", icon: "H1", label: "Heading 1" },
      { val: "<h2>", block: "h2", styleId: "heading2", icon: "H2", label: "Heading 2" },
      { val: "<h3>", block: "h3", styleId: "heading3", icon: "H3", label: "Heading 3" },
      { val: "<p>", block: "p", styleId: "normal", icon: "\xB6", label: "Paragraph" }
    ].map((btn) => {
      const active = formatState.block === btn.block;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: btn.icon,
          type: "button",
          onMouseDown: (e) => e.preventDefault(),
          onClick: () => applyBuilderStyle(btn.styleId),
          "aria-pressed": active,
          className: `min-w-8 h-8 px-1.5 rounded text-[11px] font-bold transition-colors border ${active ? "bg-indigo-700 text-white border-indigo-700 shadow-inner" : "text-slate-600 border-transparent hover:bg-indigo-100 hover:text-indigo-700 hover:border-indigo-600"}`,
          "aria-label": btn.label,
          title: btn.label
        },
        btn.icon
      );
    }), /* @__PURE__ */ React.createElement("span", { className: "w-px h-5 bg-slate-200 mx-0.5", "aria-hidden": "true" }), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onMouseDown: (e) => e.preventDefault(),
        onClick: () => runEditorCommand("insertUnorderedList"),
        "aria-pressed": formatState.unorderedList,
        className: `w-8 h-8 rounded text-xs transition-colors border ${formatState.unorderedList ? "bg-indigo-700 text-white border-indigo-700 shadow-inner" : "text-slate-600 border-transparent hover:bg-indigo-100 hover:text-indigo-700"}`,
        "aria-label": t("a11y.bullet_list"),
        title: "Bullet list"
      },
      "\u2022"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onMouseDown: (e) => e.preventDefault(),
        onClick: () => runEditorCommand("insertOrderedList"),
        "aria-pressed": formatState.orderedList,
        className: `w-8 h-8 rounded text-[11px] font-bold transition-colors border ${formatState.orderedList ? "bg-indigo-700 text-white border-indigo-700 shadow-inner" : "text-slate-600 border-transparent hover:bg-indigo-100 hover:text-indigo-700"}`,
        "aria-label": "Numbered list",
        title: "Numbered list"
      },
      "1."
    ), /* @__PURE__ */ React.createElement("span", { className: "w-px h-5 bg-slate-200 mx-0.5", "aria-hidden": "true" }), [["justifyLeft", "left", "\u2190", "Align left"], ["justifyCenter", "center", "\u2194", "Center align"], ["justifyRight", "right", "\u2192", "Align right"], ["justifyFull", "justify", "\u2630", "Justify text"]].map(([cmd, alignment, icon, label]) => {
      const active = formatState.alignment === alignment;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: cmd,
          type: "button",
          onMouseDown: (e) => e.preventDefault(),
          onClick: () => runEditorCommand(cmd),
          "aria-pressed": active,
          className: `w-8 h-8 rounded text-[13px] font-bold transition-colors border ${active ? "bg-indigo-700 text-white border-indigo-700 shadow-inner" : "text-slate-600 border-transparent hover:bg-indigo-100 hover:text-indigo-700 hover:border-indigo-600"}`,
          "aria-label": label,
          title: label
        },
        icon
      );
    }), /* @__PURE__ */ React.createElement("span", { className: "w-px h-5 bg-slate-200 mx-0.5", "aria-hidden": "true" }), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: async () => {
          const doc = exportPreviewRef.current?.contentDocument;
          if (!doc) return;
          const selection = doc.getSelection?.();
          const savedRange = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
          const url = await promptForBuilderText("Enter the destination for this link.", "", {
            title: "Insert link",
            confirmText: "Insert link",
            cancelText: "Cancel",
            placeholder: "https://example.org or #section",
            inputType: "url",
            maxLength: 2048,
            validate: (value) => {
              const candidate = value.trim();
              if (!candidate) return "Enter a link URL.";
              const scheme = candidate.match(/^\s*([a-zA-Z][a-zA-Z0-9+.-]*)\s*:/);
              return !scheme || ["http", "https", "mailto", "tel"].includes(scheme[1].toLowerCase()) ? null : "Only web (http/https), mailto:, tel:, and internal links are allowed.";
            }
          });
          if (!url) return;
          const _u = url.trim();
          const _schemeMatch = _u.match(/^\s*([a-zA-Z][a-zA-Z0-9+.-]*)\s*:/);
          const _okScheme = !_schemeMatch || ["http", "https", "mailto", "tel"].includes(_schemeMatch[1].toLowerCase());
          if (!_okScheme) return;
          if (savedRange && savedRange.commonAncestorContainer?.isConnected) {
            selection.removeAllRanges();
            selection.addRange(savedRange);
            exportPreviewRef.current?.contentWindow?.focus();
          }
          doc.execCommand("createLink", false, _u);
        },
        className: "w-8 h-8 rounded text-[11px] text-slate-600 hover:bg-indigo-100 transition-colors",
        "aria-label": "Insert link",
        title: "Insert link"
      },
      "\u{1F517}"
    ), /* @__PURE__ */ React.createElement("span", { className: "w-px h-5 bg-slate-200 mx-0.5", "aria-hidden": "true" }), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: async () => {
          const doc = exportPreviewRef.current?.contentDocument;
          if (!doc) return;
          try {
            if (!(window.AlloMathInput && window.AlloMathInput.ready && window.AlloMathInput.ready()) && window.__alloLoadPlugin) {
              addToast("Opening the equation editor\u2026", "info");
              await window.__alloLoadPlugin("mathlive_loader.js");
            }
            if (!(window.AlloMathInput && typeof window.AlloMathInput.promptEquation === "function")) {
              addToast("The equation editor could not load. Check your connection and try again.", "error");
              return;
            }
            const eq = await window.AlloMathInput.promptEquation({ title: "\u2211  Insert an equation" });
            if (!eq || !eq.mathml) return;
            let spoken = eq.spoken || "";
            try {
              if (window.AlloMathSpeech && typeof window.AlloMathSpeech.toSpeech === "function") {
                const s = await window.AlloMathSpeech.toSpeech(eq.mathml, { timeoutMs: 4e3 });
                if (s && s.trim()) spoken = s.trim();
              }
            } catch (_) {
            }
            const escAttr = (s) => String(s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
            let mathHtml = String(eq.mathml).trim();
            const attrs = ' data-allo-latex="' + escAttr(eq.latex) + '"' + (spoken ? ' aria-label="' + escAttr(spoken) + '"' : "") + ' class="allo-math-authored"';
            mathHtml = /^<math[\s>]/i.test(mathHtml) ? mathHtml.replace(/^<math\b/i, "<math" + attrs) : "<math" + attrs + ">" + mathHtml + "</math>";
            doc.execCommand("insertHTML", false, mathHtml + "\u200B");
            addToast("Equation inserted", "success");
          } catch (e) {
            addToast("Could not insert the equation.", "error");
          }
        },
        className: "min-w-8 h-8 px-1.5 rounded text-[13px] font-semibold text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 transition-colors border border-transparent hover:border-indigo-600",
        "aria-label": "Insert an equation (accessible math)",
        title: "Insert an equation (accessible math)"
      },
      "\u2211"
    ), /* @__PURE__ */ React.createElement("span", { className: "w-px h-5 bg-slate-200 mx-0.5", "aria-hidden": "true" }), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onMouseDown: (e) => e.preventDefault(),
        onClick: () => runEditorCommand("removeFormat"),
        className: "w-8 h-8 rounded text-[11px] text-slate-600 hover:bg-indigo-100 transition-colors",
        "aria-label": "Clear formatting",
        title: "Clear formatting"
      },
      "\u2715"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onMouseDown: (e) => e.preventDefault(),
        onClick: () => runEditorCommand("undo"),
        className: "w-8 h-8 rounded text-[11px] text-slate-600 hover:bg-indigo-100 transition-colors",
        "aria-label": "Undo",
        title: "Undo (Ctrl+Z)"
      },
      "\u21A9"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onMouseDown: (e) => e.preventDefault(),
        onClick: () => runEditorCommand("redo"),
        className: "w-8 h-8 rounded text-[11px] text-slate-600 hover:bg-indigo-100 transition-colors",
        "aria-label": "Redo",
        title: "Redo (Ctrl+Y)"
      },
      "\u21AA"
    ), /* @__PURE__ */ React.createElement(
      "select",
      {
        onChange: (e) => {
          if (e.target.value) runEditorCommand("foreColor", e.target.value);
          e.target.value = "";
        },
        className: "h-8 text-[11px] border border-slate-400 rounded px-1 text-slate-600 ml-0.5",
        "aria-label": "Text color",
        defaultValue: ""
      },
      /* @__PURE__ */ React.createElement("option", { value: "", disabled: true }, "Color"),
      /* @__PURE__ */ React.createElement("option", { value: "#000000" }, "\u2B1B Black"),
      /* @__PURE__ */ React.createElement("option", { value: "#1e3a5f" }, "\u{1F7E6} Navy"),
      /* @__PURE__ */ React.createElement("option", { value: "#991b1b" }, "\u{1F7E5} Red"),
      /* @__PURE__ */ React.createElement("option", { value: "#166534" }, "\u{1F7E9} Green"),
      /* @__PURE__ */ React.createElement("option", { value: "#7c3aed" }, "\u{1F7EA} Purple")
    ), /* @__PURE__ */ React.createElement(
      "select",
      {
        onChange: (e) => {
          if (e.target.value) runEditorCommand("hiliteColor", e.target.value);
          e.target.value = "";
        },
        className: "h-8 rounded border border-slate-400 px-1 text-[11px] text-slate-600",
        "aria-label": "Text highlight color",
        defaultValue: ""
      },
      /* @__PURE__ */ React.createElement("option", { value: "", disabled: true }, "Highlight"),
      /* @__PURE__ */ React.createElement("option", { value: "#fef08a" }, "Yellow"),
      /* @__PURE__ */ React.createElement("option", { value: "#bbf7d0" }, "Green"),
      /* @__PURE__ */ React.createElement("option", { value: "#bfdbfe" }, "Blue"),
      /* @__PURE__ */ React.createElement("option", { value: "#fecdd3" }, "Pink"),
      /* @__PURE__ */ React.createElement("option", { value: "transparent" }, "No highlight")
    ))), !ribbonCollapsed && activeRibbonTab === "insert" && /* @__PURE__ */ React.createElement("div", { id: "builder-ribbon-panel-insert", role: "tabpanel", "aria-labelledby": "builder-ribbon-tab-insert", className: "shrink-0 border-b border-slate-200 bg-white" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-stretch gap-2 px-2 py-1.5", "aria-label": "Insert tools" }, /* @__PURE__ */ React.createElement("fieldset", { className: "flex min-w-[22rem] flex-[1.1] flex-wrap items-center gap-1.5 rounded border border-indigo-200 bg-indigo-50/60 px-2 py-1", "aria-describedby": "builder-structure-help" }, /* @__PURE__ */ React.createElement("legend", { className: "px-1 text-[10px] font-black uppercase tracking-wider text-indigo-800" }, "Document structure"), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-1 text-[10px] font-semibold text-slate-700" }, "TOC depth", /* @__PURE__ */ React.createElement("select", { value: tocDepth, onChange: (event) => setTocDepth(Math.max(1, Math.min(6, Number(event.target.value) || 3))), className: "h-7 rounded border border-indigo-300 bg-white px-1.5 text-[10px] text-slate-700", "aria-label": "Table of contents heading depth" }, [1, 2, 3, 4, 5, 6].map((level) => /* @__PURE__ */ React.createElement("option", { key: level, value: level }, "H1\u2013H", level)))), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: insertOrRefreshTableOfContents, className: "h-7 rounded bg-indigo-700 px-2.5 text-[10px] font-bold text-white hover:bg-indigo-800" }, "Insert / refresh TOC"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => {
      setNavigationPaneTab("headings");
      setShowNavigationPane(true);
    }, "aria-pressed": showNavigationPane && navigationPaneTab === "headings", "aria-controls": "document-builder-navigation", className: "h-7 rounded border border-indigo-400 bg-white px-2 text-[10px] font-bold text-indigo-800 hover:bg-indigo-100" }, "Open outline"), /* @__PURE__ */ React.createElement("details", { id: "builder-document-templates", className: "relative" }, /* @__PURE__ */ React.createElement("summary", { className: "flex h-7 cursor-pointer list-none items-center rounded border border-indigo-400 bg-white px-2 text-[10px] font-bold text-indigo-800 hover:bg-indigo-100" }, "Templates"), /* @__PURE__ */ React.createElement("div", { className: "absolute left-0 top-full z-[85] mt-1 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-slate-300 bg-white p-2 shadow-2xl" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between gap-2 border-b border-slate-200 pb-2" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] font-black text-slate-800" }, "Document templates"), /* @__PURE__ */ React.createElement("p", { className: "text-[9px] text-slate-500" }, "Applying one replaces the document after confirmation.")), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: saveCurrentAsDocumentTemplate, className: "rounded bg-indigo-700 px-2 py-1.5 text-[9px] font-bold text-white hover:bg-indigo-800" }, "Save current as template")), /* @__PURE__ */ React.createElement("div", { className: "mt-2 max-h-72 space-y-1.5 overflow-y-auto", "aria-label": "Available document templates" }, documentTemplateGallery.map((templateOption) => /* @__PURE__ */ React.createElement("div", { key: templateOption.id, className: "rounded border border-slate-200 bg-slate-50 p-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "min-w-0 flex-1" }, /* @__PURE__ */ React.createElement("p", { className: "truncate text-[10px] font-black text-slate-800" }, templateOption.label, templateOption.custom ? /* @__PURE__ */ React.createElement("span", { className: "ml-1 rounded bg-indigo-100 px-1 py-0.5 text-[8px] font-bold uppercase text-indigo-700" }, "Custom") : null), /* @__PURE__ */ React.createElement("p", { className: "mt-0.5 text-[9px] leading-snug text-slate-500" }, templateOption.description)), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => applyDocumentTemplate(templateOption), className: "rounded bg-white px-2 py-1 text-[9px] font-bold text-indigo-800 ring-1 ring-indigo-300 hover:bg-indigo-100" }, "Apply")), templateOption.custom ? /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => deleteCustomDocumentTemplate(templateOption.id), className: "mt-1 rounded px-1 py-0.5 text-[8px] font-bold text-rose-700 hover:bg-rose-100", "aria-label": "Delete template " + templateOption.label }, "Delete saved template") : null))), /* @__PURE__ */ React.createElement("p", { className: "mt-2 text-[9px] text-slate-500" }, "Custom templates are saved on this device \xB7 ", customDocumentTemplates.length, "/8"))), /* @__PURE__ */ React.createElement("span", { id: "builder-structure-help", className: "w-full text-[9px] text-slate-500" }, "The automatic table of contents follows live headings. Reorder full sections from the outline pane.")), /* @__PURE__ */ React.createElement("fieldset", { className: "flex min-w-[24rem] flex-1 flex-wrap items-center gap-1.5 rounded border border-cyan-200 bg-cyan-50/60 px-2 py-1", "aria-describedby": "builder-references-help" }, /* @__PURE__ */ React.createElement("legend", { className: "px-1 text-[10px] font-black uppercase tracking-wider text-cyan-900" }, "References"), /* @__PURE__ */ React.createElement("button", { type: "button", onMouseDown: (event) => event.preventDefault(), onClick: insertDocumentFootnote, "aria-keyshortcuts": "Control+Alt+F", className: "h-7 rounded bg-cyan-800 px-2.5 text-[10px] font-bold text-white hover:bg-cyan-900", title: "Insert footnote (Ctrl+Alt+F)" }, "Footnote"), /* @__PURE__ */ React.createElement("button", { type: "button", onMouseDown: (event) => event.preventDefault(), onClick: insertDocumentBookmark, className: "h-7 rounded border border-cyan-500 bg-white px-2 text-[10px] font-bold text-cyan-900 hover:bg-cyan-100" }, "Add bookmark"), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-1 text-[10px] font-semibold text-slate-700" }, "Style", /* @__PURE__ */ React.createElement("select", { value: citationStyle, onChange: (event) => changeCitationStyle(event.target.value), className: "h-7 rounded border border-cyan-300 bg-white px-1.5 text-[10px] text-slate-700", "aria-label": "Citation style" }, _BUILDER_CITATION_STYLES.map((entry) => /* @__PURE__ */ React.createElement("option", { key: entry.id, value: entry.id }, entry.label)))), /* @__PURE__ */ React.createElement("label", { className: "flex min-w-40 flex-1 items-center gap-1 text-[10px] font-semibold text-slate-700" }, "Source", /* @__PURE__ */ React.createElement("select", { value: citationSourceTarget, onChange: (event) => setCitationSourceTarget(event.target.value), disabled: !documentReferences.sources?.length, className: "h-7 min-w-0 flex-1 rounded border border-cyan-300 bg-white px-1.5 text-[10px] text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100", "aria-label": "Citation source" }, !documentReferences.sources?.length && /* @__PURE__ */ React.createElement("option", { value: "" }, "Add a source first"), documentReferences.sources?.map((source) => /* @__PURE__ */ React.createElement("option", { key: source.id, value: source.id }, source.title || _builderCitationAuthorKey(source, citationStyle))))), /* @__PURE__ */ React.createElement("input", { value: citationLocator, onChange: (event) => setCitationLocator(event.target.value.slice(0, 80)), className: "h-7 w-24 rounded border border-cyan-300 bg-white px-1.5 text-[10px] text-slate-700", "aria-label": "Citation page or locator", placeholder: "Page" }), /* @__PURE__ */ React.createElement("button", { type: "button", onMouseDown: (event) => event.preventDefault(), onClick: insertDocumentCitation, disabled: !citationSourceTarget, className: "h-7 rounded bg-cyan-800 px-2 text-[10px] font-bold text-white hover:bg-cyan-900 disabled:cursor-not-allowed disabled:opacity-45" }, "Insert citation"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => openCitationSourceManager(), className: "h-7 rounded border border-cyan-500 bg-white px-2 text-[10px] font-bold text-cyan-900 hover:bg-cyan-100" }, "Source Manager"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => openCitationSourceManager(null, "import"), className: "h-7 rounded px-2 text-[10px] font-bold text-cyan-900 hover:bg-cyan-100" }, "Import sources"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: insertOrRefreshDocumentBibliography, disabled: !documentReferences.sources?.length, className: "h-7 rounded border border-cyan-500 bg-white px-2 text-[10px] font-bold text-cyan-900 hover:bg-cyan-100 disabled:opacity-45" }, "Bibliography"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: updateAllDocumentFields, "aria-keyshortcuts": "F9", title: "Update all document fields (F9)", className: "h-7 rounded px-2 text-[10px] font-bold text-cyan-900 hover:bg-cyan-100" }, "Update fields"), /* @__PURE__ */ React.createElement("label", { className: "flex min-w-40 flex-1 items-center gap-1 text-[10px] font-semibold text-slate-700" }, "Target", /* @__PURE__ */ React.createElement("select", { value: crossReferenceTarget, onChange: (event) => setCrossReferenceTarget(event.target.value), disabled: !documentReferences.bookmarks.length, className: "h-7 min-w-0 flex-1 rounded border border-cyan-300 bg-white px-1.5 text-[10px] text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100", "aria-label": "Cross-reference bookmark target" }, !documentReferences.bookmarks.length && /* @__PURE__ */ React.createElement("option", { value: "" }, "Add a bookmark first"), documentReferences.bookmarks.map((entry) => /* @__PURE__ */ React.createElement("option", { key: entry.id, value: entry.id }, entry.name)))), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-1 text-[10px] font-semibold text-slate-700" }, "Label", /* @__PURE__ */ React.createElement("select", { value: crossReferenceLabelMode, onChange: (event) => setCrossReferenceLabelMode(event.target.value), className: "h-7 rounded border border-cyan-300 bg-white px-1.5 text-[10px] text-slate-700", "aria-label": "Cross-reference label style" }, /* @__PURE__ */ React.createElement("option", { value: "text" }, "Bookmarked text"), /* @__PURE__ */ React.createElement("option", { value: "name" }, "Bookmark name"))), /* @__PURE__ */ React.createElement("button", { type: "button", onMouseDown: (event) => event.preventDefault(), onClick: insertDocumentCrossReference, disabled: !crossReferenceTarget, className: "h-7 rounded border border-cyan-500 bg-white px-2 text-[10px] font-bold text-cyan-900 hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-45" }, "Insert cross-reference"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: openDocumentReferences, "aria-pressed": showNavigationPane && navigationPaneTab === "references", "aria-controls": "document-builder-navigation", className: "h-7 rounded px-2 text-[10px] font-bold text-cyan-900 hover:bg-cyan-100" }, "Manage"), /* @__PURE__ */ React.createElement("span", { id: "builder-references-help", className: "w-full text-[9px] " + (documentReferences.brokenCount ? "font-bold text-red-700" : "text-slate-500") }, documentReferences.citations?.length || 0, " citation", documentReferences.citations?.length === 1 ? "" : "s", " \xB7 ", documentReferences.sources?.length || 0, " source", documentReferences.sources?.length === 1 ? "" : "s", " \xB7 ", documentReferences.footnotes.length, " footnote", documentReferences.footnotes.length === 1 ? "" : "s", " \xB7 ", documentReferences.bookmarks.length, " bookmark", documentReferences.bookmarks.length === 1 ? "" : "s", documentReferences.brokenCount ? " \xB7 " + documentReferences.brokenCount + " broken reference" + (documentReferences.brokenCount === 1 ? "" : "s") : " \xB7 Live fields update together.")), /* @__PURE__ */ React.createElement("fieldset", { className: "flex min-w-0 flex-1 flex-wrap items-center gap-1.5 rounded border border-slate-200 bg-slate-50 px-2 py-1", "aria-describedby": "builder-table-help" }, /* @__PURE__ */ React.createElement("legend", { className: "px-1 text-[10px] font-black uppercase tracking-wider text-slate-600" }, "Table"), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-1 text-[10px] font-semibold text-slate-600" }, "Body rows", /* @__PURE__ */ React.createElement("input", { type: "number", min: "1", max: "20", value: tableInsertConfig.rows, onChange: (e) => setTableInsertConfig((config) => ({ ...config, rows: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })), className: "h-7 w-14 rounded border border-slate-400 bg-white px-1.5 text-xs", "aria-label": "Table body rows" })), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-1 text-[10px] font-semibold text-slate-600" }, "Columns", /* @__PURE__ */ React.createElement("input", { type: "number", min: "1", max: "10", value: tableInsertConfig.columns, onChange: (e) => setTableInsertConfig((config) => ({ ...config, columns: Math.max(1, Math.min(10, Number(e.target.value) || 1)) })), className: "h-7 w-14 rounded border border-slate-400 bg-white px-1.5 text-xs", "aria-label": "Table columns" })), /* @__PURE__ */ React.createElement("label", { className: "flex min-w-36 flex-1 items-center gap-1 text-[10px] font-semibold text-slate-600" }, "Caption", /* @__PURE__ */ React.createElement("input", { value: tableInsertConfig.caption, maxLength: 160, onChange: (e) => setTableInsertConfig((config) => ({ ...config, caption: e.target.value })), placeholder: "Recommended", className: "h-7 min-w-24 flex-1 rounded border border-slate-400 bg-white px-1.5 text-xs", "aria-label": "Table caption" })), /* @__PURE__ */ React.createElement("label", { className: "inline-flex min-h-7 cursor-pointer items-center gap-1 text-[10px] font-semibold text-slate-700" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: tableInsertConfig.headerRow, onChange: (e) => setTableInsertConfig((config) => ({ ...config, headerRow: e.target.checked })), className: "accent-indigo-700" }), "Header row"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: insertAccessibleTable, className: "h-7 rounded bg-indigo-700 px-2.5 text-[11px] font-bold text-white hover:bg-indigo-800" }, "Insert table"), /* @__PURE__ */ React.createElement("span", { id: "builder-table-help", className: "sr-only" }, "Creates semantic table headers and an optional accessible caption.")), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-1 rounded border border-slate-200 px-2 py-1", role: "toolbar", "aria-label": "Insert document elements" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: openImagePicker, className: "h-8 rounded px-2 text-[11px] font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700", "aria-label": "Insert image with alternative text" }, /* @__PURE__ */ React.createElement(ImageIcon, { size: 13, "aria-hidden": "true" }), " ", /* @__PURE__ */ React.createElement("span", { className: "ml-1" }, "Image")), /* @__PURE__ */ React.createElement("button", { type: "button", onMouseDown: (e) => e.preventDefault(), onClick: () => runEditorCommand("insertHorizontalRule"), className: "h-8 rounded px-2 text-[11px] font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700", title: "Insert horizontal rule" }, "Rule"), /* @__PURE__ */ React.createElement("button", { type: "button", onMouseDown: (e) => e.preventDefault(), onClick: () => {
      restoreEditorSelection();
      insertPageBreak();
    }, className: "h-8 rounded px-2 text-[11px] font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700", "aria-label": "Insert page break", "aria-keyshortcuts": "Control+Enter", title: "Insert page break" }, "Page break"), /* @__PURE__ */ React.createElement("label", { className: "inline-flex items-center" }, /* @__PURE__ */ React.createElement("span", { className: "sr-only" }, "Insert symbol"), /* @__PURE__ */ React.createElement("select", { defaultValue: "", onChange: (e) => {
      if (e.target.value) runEditorCommand("insertText", e.target.value);
      e.target.value = "";
    }, className: "h-8 rounded border border-slate-300 bg-white px-1 text-[11px] text-slate-700", "aria-label": "Insert symbol" }, /* @__PURE__ */ React.createElement("option", { value: "", disabled: true }, "Symbol"), /* @__PURE__ */ React.createElement("option", { value: "\u2014" }, "Em dash \u2014"), /* @__PURE__ */ React.createElement("option", { value: "\u2013" }, "En dash \u2013"), /* @__PURE__ */ React.createElement("option", { value: "\xA9" }, "Copyright \xA9"), /* @__PURE__ */ React.createElement("option", { value: "\xB0" }, "Degree \xB0"), /* @__PURE__ */ React.createElement("option", { value: "\xB1" }, "Plus/minus \xB1"), /* @__PURE__ */ React.createElement("option", { value: "\u2192" }, "Arrow \u2192")))), tableContext.active ? /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-2 py-1", role: "toolbar", "aria-label": "Selected table tools" }, /* @__PURE__ */ React.createElement("span", { className: "mr-1 text-[10px] font-black uppercase tracking-wide text-emerald-800" }, "Selected table \xB7 ", tableContext.rows, " rows \xD7 ", tableContext.columns, " columns"), /* @__PURE__ */ React.createElement("button", { type: "button", onMouseDown: (e) => e.preventDefault(), onClick: () => editSelectedTable("add-row"), className: "h-7 rounded border border-emerald-500 bg-white px-2 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100" }, "Add row"), /* @__PURE__ */ React.createElement("button", { type: "button", onMouseDown: (e) => e.preventDefault(), onClick: () => editSelectedTable("add-column"), className: "h-7 rounded border border-emerald-500 bg-white px-2 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100" }, "Add column"), /* @__PURE__ */ React.createElement("button", { type: "button", onMouseDown: (e) => e.preventDefault(), onClick: () => editSelectedTable("remove-row"), disabled: tableContext.headerCell || tableContext.rows <= (tableContext.hasHeader ? 2 : 1), className: "h-7 rounded border border-slate-400 bg-white px-2 text-[10px] font-bold text-slate-700 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40" }, "Remove row"), /* @__PURE__ */ React.createElement("button", { type: "button", onMouseDown: (e) => e.preventDefault(), onClick: () => editSelectedTable("remove-column"), disabled: tableContext.columns <= 1, className: "h-7 rounded border border-slate-400 bg-white px-2 text-[10px] font-bold text-slate-700 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40" }, "Remove column")) : /* @__PURE__ */ React.createElement("div", { className: "flex items-center rounded border border-dashed border-slate-300 px-2 py-1 text-[10px] text-slate-500" }, "Place the caret in a table to edit rows and columns."))), !ribbonCollapsed && activeRibbonTab === "layout" && /* @__PURE__ */ React.createElement("div", { id: "builder-ribbon-panel-layout", role: "tabpanel", "aria-labelledby": "builder-ribbon-tab-layout", className: "shrink-0 border-b border-slate-200 bg-white" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-stretch gap-2 px-2 py-1.5", role: "group", "aria-label": "Document layout tools" }, /* @__PURE__ */ React.createElement("fieldset", { className: "flex min-w-72 flex-1 flex-wrap items-center gap-1.5 rounded border border-slate-200 bg-slate-50 px-2 py-1" }, /* @__PURE__ */ React.createElement("legend", { className: "px-1 text-[10px] font-black uppercase tracking-wider text-slate-600" }, "Page setup"), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-1 text-[10px] font-semibold text-slate-600" }, "Paper size", /* @__PURE__ */ React.createElement("select", { value: pageSetup.size, onChange: (event) => applyPageSetup({ ...pageSetup, size: event.target.value }, { commit: true }), className: "h-7 rounded border border-slate-400 bg-white px-1.5 text-[11px] text-slate-700", "aria-label": "Paper size" }, /* @__PURE__ */ React.createElement("option", { value: "letter" }, "Letter (8.5 x 11 in)"), /* @__PURE__ */ React.createElement("option", { value: "legal" }, "Legal (8.5 x 14 in)"), /* @__PURE__ */ React.createElement("option", { value: "a4" }, "A4 (8.27 x 11.69 in)"))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1", role: "group", "aria-label": "Page orientation" }, /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-semibold text-slate-600" }, "Orientation"), ["portrait", "landscape"].map((orientation) => /* @__PURE__ */ React.createElement("button", { key: orientation, type: "button", onClick: () => applyPageSetup({ ...pageSetup, orientation }, { commit: true }), "aria-pressed": pageSetup.orientation === orientation, className: `h-7 rounded border px-2 text-[10px] font-bold capitalize ${pageSetup.orientation === orientation ? "border-indigo-700 bg-indigo-700 text-white" : "border-slate-400 bg-white text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"}` }, orientation))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1", role: "group", "aria-label": "Page margins" }, /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-semibold text-slate-600" }, "Margins"), [["0.5in", "Narrow"], ["1in", "Normal"], ["1.5in", "Wide"]].map(([margin, label]) => /* @__PURE__ */ React.createElement("button", { key: margin, type: "button", onClick: () => applyPageSetup({ ...pageSetup, margin }, { commit: true }), "aria-pressed": pageSetup.margin === margin, className: `h-7 rounded border px-2 text-[10px] font-bold ${pageSetup.margin === margin ? "border-indigo-700 bg-indigo-700 text-white" : "border-slate-400 bg-white text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"}`, title: `${label} margins (${margin})` }, label))), /* @__PURE__ */ React.createElement("span", { className: "w-full text-[10px] text-slate-500", role: "status", "aria-live": "polite" }, _BUILDER_PAGE_SIZES[pageSetup.size]?.label || "Letter", " \xB7 ", _builderPageDimensions(pageSetup).width, " x ", _builderPageDimensions(pageSetup).height, " in \xB7 ", pageSetup.margin, " margins")), /* @__PURE__ */ React.createElement("fieldset", { className: "flex min-w-80 flex-[1.35] flex-wrap items-center gap-1.5 rounded border border-slate-200 bg-slate-50 px-2 py-1", "aria-describedby": "builder-page-elements-help" }, /* @__PURE__ */ React.createElement("legend", { className: "px-1 text-[10px] font-black uppercase tracking-wider text-slate-600" }, "Header & footer"), /* @__PURE__ */ React.createElement("label", { className: "flex min-w-44 flex-1 items-center gap-1 text-[10px] font-semibold text-slate-600" }, "Header", /* @__PURE__ */ React.createElement("input", { value: pageElements.headerText, maxLength: 120, onChange: (event) => setPageElements((config) => ({ ...config, headerText: event.target.value })), placeholder: "Document title", className: "h-7 min-w-24 flex-1 rounded border border-slate-400 bg-white px-1.5 text-[11px]", "aria-label": "Header text" })), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-1 text-[10px] font-semibold text-slate-600" }, /* @__PURE__ */ React.createElement("span", { className: "sr-only" }, "Header alignment"), /* @__PURE__ */ React.createElement("select", { value: pageElements.headerAlignment, onChange: (event) => setPageElements((config) => ({ ...config, headerAlignment: event.target.value })), className: "h-7 rounded border border-slate-400 bg-white px-1 text-[11px]", "aria-label": "Header alignment" }, /* @__PURE__ */ React.createElement("option", { value: "left" }, "Align left"), /* @__PURE__ */ React.createElement("option", { value: "center" }, "Center"), /* @__PURE__ */ React.createElement("option", { value: "right" }, "Align right"))), /* @__PURE__ */ React.createElement("label", { className: "flex min-w-44 flex-1 items-center gap-1 text-[10px] font-semibold text-slate-600" }, "Footer", /* @__PURE__ */ React.createElement("input", { value: pageElements.footerText, maxLength: 160, onChange: (event) => setPageElements((config) => ({ ...config, footerText: event.target.value })), placeholder: "Optional footer", className: "h-7 min-w-24 flex-1 rounded border border-slate-400 bg-white px-1.5 text-[11px]", "aria-label": "Footer text" })), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-1 text-[10px] font-semibold text-slate-600" }, "Page numbers", /* @__PURE__ */ React.createElement("select", { value: pageElements.pageNumbers, onChange: (event) => setPageElements((config) => ({ ...config, pageNumbers: event.target.value })), className: "h-7 rounded border border-slate-400 bg-white px-1 text-[11px]", "aria-label": "Page numbers" }, /* @__PURE__ */ React.createElement("option", { value: "none" }, "None"), /* @__PURE__ */ React.createElement("option", { value: "left" }, "Bottom left"), /* @__PURE__ */ React.createElement("option", { value: "center" }, "Bottom center"), /* @__PURE__ */ React.createElement("option", { value: "right" }, "Bottom right"))), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => applyPageElements(), className: "h-7 rounded bg-indigo-700 px-2.5 text-[10px] font-bold text-white hover:bg-indigo-800" }, "Apply"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: clearPageElements, className: "h-7 rounded border border-slate-400 bg-white px-2 text-[10px] font-bold text-slate-700 hover:bg-red-50 hover:text-red-700" }, "Clear"), /* @__PURE__ */ React.createElement("span", { id: "builder-page-elements-help", className: "w-full text-[10px] text-slate-500" }, "Headers and footers repeat on printed and PDF pages; automatic page numbers update during print.")), /* @__PURE__ */ React.createElement("fieldset", { className: "flex min-w-80 flex-[1.15] flex-wrap items-center gap-1.5 rounded border border-slate-200 bg-slate-50 px-2 py-1", "aria-describedby": "builder-section-help" }, /* @__PURE__ */ React.createElement("legend", { className: "px-1 text-[10px] font-black uppercase tracking-wider text-slate-600" }, "Sections"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => jumpToDocumentSection(pageMetrics.activeSection - 1), disabled: pageMetrics.activeSection <= 0, className: "h-7 min-w-7 rounded border border-slate-300 bg-white px-1.5 text-[10px] font-bold text-slate-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40", "aria-label": "Previous section" }, "\u2190"), /* @__PURE__ */ React.createElement("span", { className: "min-w-20 text-center text-[10px] font-bold text-slate-700", role: "status" }, "Section ", pageMetrics.activeSection + 1, " of ", pageMetrics.documentSections.length), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => jumpToDocumentSection(pageMetrics.activeSection + 1), disabled: pageMetrics.activeSection >= pageMetrics.documentSections.length - 1, className: "h-7 min-w-7 rounded border border-slate-300 bg-white px-1.5 text-[10px] font-bold text-slate-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40", "aria-label": "Next section" }, "\u2192"), /* @__PURE__ */ React.createElement("label", { className: "flex min-w-48 flex-1 items-center gap-1 text-[10px] font-semibold text-slate-600" }, "Name", /* @__PURE__ */ React.createElement("input", { value: sectionNameDraft, maxLength: 80, onChange: (event) => setSectionNameDraft(event.target.value), onBlur: commitSectionName, onKeyDown: (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        event.currentTarget.blur();
      } else if (event.key === "Escape") {
        event.preventDefault();
        setSectionNameDraft(activeDocumentSection.name);
      }
    }, className: "h-7 min-w-24 flex-1 rounded border border-slate-400 bg-white px-1.5 text-[11px]", "aria-label": "Current section name" })), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-1 text-[10px] font-semibold text-slate-600" }, "Starts", /* @__PURE__ */ React.createElement("select", { value: activeDocumentSection.startType, disabled: activeDocumentSection.index === 0, onChange: (event) => setActiveSectionStartType(event.target.value), className: "h-7 rounded border border-slate-400 bg-white px-1 text-[10px] disabled:cursor-not-allowed disabled:bg-slate-100", "aria-label": "Current section start type" }, /* @__PURE__ */ React.createElement("option", { value: "document" }, "Document start"), /* @__PURE__ */ React.createElement("option", { value: "next-page" }, "Next page"), /* @__PURE__ */ React.createElement("option", { value: "continuous" }, "Same page"))), /* @__PURE__ */ React.createElement("button", { type: "button", onMouseDown: (event) => event.preventDefault(), onClick: () => insertSectionBreak("next-page"), className: "h-7 rounded border border-violet-400 bg-white px-2 text-[10px] font-bold text-violet-800 hover:bg-violet-50" }, "Next-page section"), /* @__PURE__ */ React.createElement("button", { type: "button", onMouseDown: (event) => event.preventDefault(), onClick: () => insertSectionBreak("continuous"), className: "h-7 rounded border border-teal-400 bg-white px-2 text-[10px] font-bold text-teal-800 hover:bg-teal-50" }, "Continuous section"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: removeActiveSectionBreak, disabled: activeDocumentSection.index === 0, className: "h-7 rounded border border-slate-300 bg-white px-2 text-[10px] font-bold text-slate-600 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40", title: "Merge this section into the preceding section" }, "Remove break"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => {
      setNavigationPaneTab("sections");
      setShowNavigationPane(true);
    }, "aria-pressed": showNavigationPane && navigationPaneTab === "sections", "aria-controls": "document-builder-navigation", className: "h-7 rounded px-2 text-[10px] font-bold text-indigo-700 hover:bg-indigo-50" }, "Open sections"), /* @__PURE__ */ React.createElement("span", { id: "builder-section-help", className: "w-full text-[10px] text-slate-500" }, activeDocumentSection.name, " starts ", activeDocumentSection.startType === "document" ? "the document" : activeDocumentSection.startType === "continuous" ? "on the same page" : `on page ${activeDocumentSection.page + 1}`, ".")), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-1 rounded border border-slate-200 px-2 py-1", role: "toolbar", "aria-label": "Pagination tools" }, /* @__PURE__ */ React.createElement("button", { type: "button", onMouseDown: (event) => event.preventDefault(), onClick: () => {
      restoreEditorSelection();
      insertPageBreak();
    }, className: "h-8 rounded px-2 text-[11px] font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700", "aria-label": "Insert page break", "aria-keyshortcuts": "Control+Enter", title: "Insert a page break at the caret" }, "Page break"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => {
      setNavigationPaneTab("pages");
      setShowNavigationPane(true);
    }, "aria-pressed": showNavigationPane && navigationPaneTab === "pages", className: "h-8 rounded px-2 text-[11px] font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700", "aria-controls": "document-builder-navigation" }, "Open pages")))), !ribbonCollapsed && activeRibbonTab === "view" && /* @__PURE__ */ React.createElement("div", { id: "builder-ribbon-panel-view", role: "tabpanel", "aria-labelledby": "builder-ribbon-tab-view", className: "shrink-0 border-b border-slate-200 bg-white" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-1.5 px-2 py-1.5" }, /* @__PURE__ */ React.createElement("div", { className: "flex min-w-0 flex-wrap items-center gap-1.5", role: "group", "aria-label": "Interactive paragraph ruler" }, /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-black uppercase tracking-wider text-slate-500" }, "Ruler"), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-1 text-[10px] font-semibold text-slate-600" }, "Tab", /* @__PURE__ */ React.createElement("select", { value: rulerTabAlignment, onChange: (event) => setRulerTabAlignment(event.target.value), className: "h-7 rounded border border-slate-400 bg-white px-1 text-[10px] text-slate-700", "aria-label": "New tab stop alignment", title: "Choose the kind of tab stop added when you click the ruler" }, /* @__PURE__ */ React.createElement("option", { value: "left" }, "Left"), /* @__PURE__ */ React.createElement("option", { value: "center" }, "Center"), /* @__PURE__ */ React.createElement("option", { value: "right" }, "Right"), /* @__PURE__ */ React.createElement("option", { value: "decimal" }, "Decimal"))), /* @__PURE__ */ React.createElement("div", { ref: rulerRef, role: "group", "aria-describedby": "builder-ruler-help", onClick: handleRulerClick, className: "relative h-9 min-w-64 flex-1 cursor-crosshair select-none overflow-hidden rounded border border-slate-400 bg-white shadow-inner", "aria-label": `Paragraph ruler, ${paragraphContentWidth} inches wide. Click to add a ${rulerTabAlignment} tab stop.`, title: `Click to add a ${rulerTabAlignment} tab stop. Drag indent and tab markers; use arrow keys for precise movement.` }, /* @__PURE__ */ React.createElement("div", { className: "pointer-events-none absolute inset-0 opacity-70", style: { backgroundImage: "linear-gradient(to right,#cbd5e1 1px,transparent 1px)", backgroundSize: `${100 / Math.max(1, paragraphContentWidth * 4)}% 100%` }, "aria-hidden": "true" }), Array.from({ length: Math.floor(paragraphContentWidth) + 1 }, (_, inch) => /* @__PURE__ */ React.createElement("span", { key: "ruler-inch-" + inch, className: "pointer-events-none absolute top-2 -translate-x-1/2 text-[8px] font-mono text-slate-400", style: { left: `${inch / paragraphContentWidth * 100}%` }, "aria-hidden": "true" }, inch)), paragraphLayout.tabStops.map((tab, index) => /* @__PURE__ */ React.createElement("button", { key: tab.id || index, type: "button", role: "slider", "aria-orientation": "horizontal", "aria-describedby": "builder-ruler-help", "aria-label": `${tab.alignment} tab stop`, "aria-valuemin": 0.125, "aria-valuemax": paragraphContentWidth - 0.125, "aria-valuenow": tab.position, "aria-valuetext": `${tab.alignment} tab at ${tab.position} inches`, onPointerDown: (event) => startTabStopDrag(tab, index, event), onKeyDown: (event) => handleTabStopKeyDown(tab, index, event), onDoubleClick: () => removeRulerTabStop(index), className: "absolute top-0 z-30 flex h-3 min-w-3 -translate-x-1/2 items-center justify-center rounded-b border border-violet-800 bg-violet-600 px-0.5 text-[7px] font-black uppercase leading-none text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1", style: { left: `${tab.position / paragraphContentWidth * 100}%` }, title: `${tab.alignment} tab at ${tab.position} in. Drag or use arrows; Enter changes type; Delete removes.` }, tab.alignment.charAt(0))), /* @__PURE__ */ React.createElement("button", { type: "button", role: "slider", "aria-orientation": "horizontal", "aria-describedby": "builder-ruler-help", "aria-label": "First-line indent", "aria-valuemin": 0, "aria-valuemax": paragraphContentWidth - paragraphLayout.rightIndent, "aria-valuenow": paragraphLayout.leftIndent + paragraphLayout.firstLineIndent, "aria-valuetext": `${paragraphLayout.leftIndent + paragraphLayout.firstLineIndent} inches from the left margin`, onPointerDown: (event) => startRulerMarkerDrag("first", event), onKeyDown: (event) => handleRulerMarkerKeyDown("first", event), className: "absolute top-0 z-20 flex h-3 w-3 -translate-x-1/2 items-center justify-center rounded-b border border-indigo-900 bg-indigo-700 text-[7px] font-black leading-none text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1", style: { left: `${(paragraphLayout.leftIndent + paragraphLayout.firstLineIndent) / paragraphContentWidth * 100}%` }, title: "First-line indent: drag or use Left/Right arrows" }, "F"), /* @__PURE__ */ React.createElement("button", { type: "button", role: "slider", "aria-orientation": "horizontal", "aria-describedby": "builder-ruler-help", "aria-label": "Hanging indent", "aria-valuemin": 0, "aria-valuemax": paragraphContentWidth - paragraphLayout.rightIndent - 0.5, "aria-valuenow": paragraphLayout.leftIndent, "aria-valuetext": `${paragraphLayout.leftIndent} inches from the left margin`, onPointerDown: (event) => startRulerMarkerDrag("hanging", event), onKeyDown: (event) => handleRulerMarkerKeyDown("hanging", event), className: "absolute bottom-2 z-20 flex h-3 w-3 -translate-x-1/2 items-center justify-center rounded-t border border-teal-900 bg-teal-700 text-[7px] font-black leading-none text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1", style: { left: `${paragraphLayout.leftIndent / paragraphContentWidth * 100}%` }, title: "Hanging indent: drag or use Left/Right arrows" }, "H"), /* @__PURE__ */ React.createElement("button", { type: "button", role: "slider", "aria-orientation": "horizontal", "aria-describedby": "builder-ruler-help", "aria-label": "Left paragraph indent", "aria-valuemin": 0, "aria-valuemax": paragraphContentWidth - paragraphLayout.rightIndent - 0.5, "aria-valuenow": paragraphLayout.leftIndent, "aria-valuetext": `${paragraphLayout.leftIndent} inches from the left margin`, onPointerDown: (event) => startRulerMarkerDrag("left", event), onKeyDown: (event) => handleRulerMarkerKeyDown("left", event), className: "absolute bottom-0 z-10 flex h-2 w-3 -translate-x-1/2 items-center justify-center rounded-sm border border-indigo-900 bg-indigo-700 text-[6px] font-black leading-none text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1", style: { left: `${paragraphLayout.leftIndent / paragraphContentWidth * 100}%` }, title: "Left indent: moves the whole paragraph" }, "L"), /* @__PURE__ */ React.createElement("button", { type: "button", role: "slider", "aria-orientation": "horizontal", "aria-describedby": "builder-ruler-help", "aria-label": "Right paragraph indent", "aria-valuemin": paragraphLayout.leftIndent + 0.5, "aria-valuemax": paragraphContentWidth, "aria-valuenow": paragraphContentWidth - paragraphLayout.rightIndent, "aria-valuetext": `${paragraphLayout.rightIndent} inches from the right margin`, onPointerDown: (event) => startRulerMarkerDrag("right", event), onKeyDown: (event) => handleRulerMarkerKeyDown("right", event), className: "absolute bottom-0 z-20 flex h-3 w-3 -translate-x-1/2 items-center justify-center rounded-t border border-indigo-900 bg-indigo-700 text-[7px] font-black leading-none text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1", style: { left: `${(paragraphContentWidth - paragraphLayout.rightIndent) / paragraphContentWidth * 100}%` }, title: "Right indent: drag or use Left/Right arrows" }, "R")), /* @__PURE__ */ React.createElement("button", { type: "button", onMouseDown: (event) => event.preventDefault(), onClick: addNextRulerTabStop, "aria-label": `Add ${rulerTabAlignment} tab stop`, "aria-describedby": "builder-ruler-help", className: "h-7 rounded border border-slate-400 bg-white px-2 text-[10px] font-bold text-slate-700 hover:bg-violet-50 hover:text-violet-700" }, "Add tab"), /* @__PURE__ */ React.createElement("button", { type: "button", onMouseDown: (event) => event.preventDefault(), onClick: insertParagraphTab, "aria-keyshortcuts": "Control+Tab", "aria-describedby": "builder-ruler-help", className: "h-7 rounded border border-indigo-500 bg-white px-2 text-[10px] font-bold text-indigo-700 hover:bg-indigo-50", title: "Insert a tab at the next configured stop (Ctrl+Tab)" }, "Insert tab"), /* @__PURE__ */ React.createElement("button", { type: "button", onMouseDown: (event) => event.preventDefault(), onClick: clearRulerTabStops, disabled: !paragraphLayout.tabStops.length, className: "h-7 rounded border border-slate-400 bg-white px-2 text-[10px] font-bold text-slate-700 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40" }, "Clear tabs"), /* @__PURE__ */ React.createElement("span", { id: "builder-ruler-help", className: "basis-full text-[9px] text-slate-500" }, "Drag F/H/L/R markers or use their arrow keys. Click the ruler or choose Add tab. On a tab marker, press Enter to change alignment or Delete to remove it. Ctrl+Tab inserts a tab without trapping normal keyboard focus.")), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-1.5", role: "group", "aria-label": "Paragraph layout controls" }, /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-black uppercase tracking-wider text-slate-500" }, "Paragraph"), /* @__PURE__ */ React.createElement("button", { type: "button", onMouseDown: (event) => event.preventDefault(), onClick: () => nudgeParagraphIndent(-0.25), className: "h-7 rounded border border-slate-300 bg-white px-2 text-[10px] font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700", "aria-label": "Decrease paragraph indent" }, "\u2212 Indent"), /* @__PURE__ */ React.createElement("button", { type: "button", onMouseDown: (event) => event.preventDefault(), onClick: () => nudgeParagraphIndent(0.25), className: "h-7 rounded border border-slate-300 bg-white px-2 text-[10px] font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700", "aria-label": "Increase paragraph indent" }, "+ Indent"), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-1 text-[10px] font-semibold text-slate-600" }, "Left", /* @__PURE__ */ React.createElement("input", { type: "number", min: "0", max: Math.max(0, paragraphContentWidth - paragraphLayout.rightIndent - 0.5), step: "0.125", value: paragraphLayout.leftIndent, onChange: (event) => applyParagraphLayout({ leftIndent: Number(event.target.value) }, { restoreFocus: false, announce: false }), className: "h-7 w-16 rounded border border-slate-400 bg-white px-1 text-[10px]", "aria-label": "Left paragraph indent in inches" })), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-1 text-[10px] font-semibold text-slate-600" }, "First", /* @__PURE__ */ React.createElement("input", { type: "number", min: -paragraphLayout.leftIndent, max: Math.max(0, paragraphContentWidth - paragraphLayout.leftIndent - paragraphLayout.rightIndent), step: "0.125", value: paragraphLayout.firstLineIndent, onChange: (event) => applyParagraphLayout({ firstLineIndent: Number(event.target.value) }, { restoreFocus: false, announce: false }), className: "h-7 w-16 rounded border border-slate-400 bg-white px-1 text-[10px]", "aria-label": "First-line indent in inches; use a negative value for a hanging indent" })), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-1 text-[10px] font-semibold text-slate-600" }, "Right", /* @__PURE__ */ React.createElement("input", { type: "number", min: "0", max: Math.max(0, paragraphContentWidth - paragraphLayout.leftIndent - 0.5), step: "0.125", value: paragraphLayout.rightIndent, onChange: (event) => applyParagraphLayout({ rightIndent: Number(event.target.value) }, { restoreFocus: false, announce: false }), className: "h-7 w-16 rounded border border-slate-400 bg-white px-1 text-[10px]", "aria-label": "Right paragraph indent in inches" })), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-1 text-[10px] font-semibold text-slate-600" }, "Line", /* @__PURE__ */ React.createElement("select", { value: paragraphLayout.lineSpacing, onChange: (event) => applyParagraphLayout({ lineSpacing: event.target.value }, { restoreFocus: false, announce: false }), className: "h-7 rounded border border-slate-400 bg-white px-1 text-[10px]", "aria-label": "Line spacing" }, /* @__PURE__ */ React.createElement("option", { value: "normal" }, "Normal"), /* @__PURE__ */ React.createElement("option", { value: "1" }, "1.0"), /* @__PURE__ */ React.createElement("option", { value: "1.15" }, "1.15"), /* @__PURE__ */ React.createElement("option", { value: "1.5" }, "1.5"), /* @__PURE__ */ React.createElement("option", { value: "2" }, "2.0"))), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-1 text-[10px] font-semibold text-slate-600" }, "Before", /* @__PURE__ */ React.createElement("input", { type: "number", min: "0", max: "72", step: "3", value: paragraphLayout.spaceBefore, onChange: (event) => applyParagraphLayout({ spaceBefore: Number(event.target.value) }, { restoreFocus: false, announce: false }), className: "h-7 w-14 rounded border border-slate-400 bg-white px-1 text-[10px]", "aria-label": "Space before paragraph in points" })), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-1 text-[10px] font-semibold text-slate-600" }, "After", /* @__PURE__ */ React.createElement("input", { type: "number", min: "0", max: "72", step: "3", value: paragraphLayout.spaceAfter, onChange: (event) => applyParagraphLayout({ spaceAfter: Number(event.target.value) }, { restoreFocus: false, announce: false }), className: "h-7 w-14 rounded border border-slate-400 bg-white px-1 text-[10px]", "aria-label": "Space after paragraph in points" })), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => applyParagraphLayout({ keepWithNext: !paragraphLayout.keepWithNext }, { restoreFocus: false, announce: false }), "aria-pressed": paragraphLayout.keepWithNext, className: `h-7 rounded border px-2 text-[10px] font-bold ${paragraphLayout.keepWithNext ? "border-indigo-700 bg-indigo-700 text-white" : "border-slate-400 bg-white text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"}`, title: "Prevent a page break after this paragraph" }, "Keep with next"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => applyParagraphLayout({ keepLinesTogether: !paragraphLayout.keepLinesTogether }, { restoreFocus: false, announce: false }), "aria-pressed": paragraphLayout.keepLinesTogether, className: `h-7 rounded border px-2 text-[10px] font-bold ${paragraphLayout.keepLinesTogether ? "border-indigo-700 bg-indigo-700 text-white" : "border-slate-400 bg-white text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"}`, title: "Keep all lines of this paragraph on one page" }, "Keep lines"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => applyParagraphLayout({ widowOrphanControl: !paragraphLayout.widowOrphanControl }, { restoreFocus: false, announce: false }), "aria-pressed": paragraphLayout.widowOrphanControl, className: `h-7 rounded border px-2 text-[10px] font-bold ${paragraphLayout.widowOrphanControl ? "border-indigo-700 bg-indigo-700 text-white" : "border-slate-400 bg-white text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"}`, title: "Keep at least three lines together at page boundaries" }, "Widow/orphan"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: resetParagraphLayout, className: "h-7 rounded px-2 text-[10px] font-bold text-slate-600 hover:bg-red-50 hover:text-red-700" }, "Reset paragraph")), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-1.5 border-t border-slate-200 pt-1", role: "group", "aria-label": "Page and zoom view controls" }, /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-black uppercase tracking-wider text-slate-500" }, "View"), /* @__PURE__ */ React.createElement("button", { type: "button", onMouseDown: (event) => event.preventDefault(), onClick: () => {
      restoreEditorSelection();
      insertPageBreak();
    }, className: "h-7 rounded border border-slate-300 bg-white px-2 text-[10px] font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700", "aria-label": "Insert page break", "aria-keyshortcuts": "Control+Enter" }, "Page break"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => {
      setNavigationPaneTab("pages");
      setShowNavigationPane(true);
    }, "aria-pressed": showNavigationPane && navigationPaneTab === "pages", "aria-controls": "document-builder-navigation", className: `h-7 rounded px-2 text-[10px] font-bold ${showNavigationPane && navigationPaneTab === "pages" ? "bg-slate-700 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"}` }, "Pages"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => {
      setEditorZoomMode("custom");
      setEditorPageView((value) => !value);
    }, "aria-pressed": editorPageView, className: `h-7 rounded px-2 text-[10px] font-bold ${editorPageView ? "bg-indigo-700 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"}`, title: editorPageView ? "Switch to continuous editor view" : "Switch to paper-like page view" }, editorPageView ? "Page view" : "Continuous"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => useEditorZoomPreset("fit-width"), "aria-pressed": editorZoomMode === "fit-width", className: `h-7 rounded border px-2 text-[10px] font-bold ${editorZoomMode === "fit-width" ? "border-indigo-700 bg-indigo-700 text-white" : "border-slate-400 bg-white text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"}` }, "Fit width"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => useEditorZoomPreset("fit-page"), "aria-pressed": editorZoomMode === "fit-page", className: `h-7 rounded border px-2 text-[10px] font-bold ${editorZoomMode === "fit-page" ? "border-indigo-700 bg-indigo-700 text-white" : "border-slate-400 bg-white text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"}` }, "Fit page"), /* @__PURE__ */ React.createElement("span", { className: "ml-auto text-[9px] text-slate-500", role: "status", "aria-live": "polite" }, "Left ", paragraphLayout.leftIndent, " in \xB7 First ", paragraphLayout.firstLineIndent, " in \xB7 Right ", paragraphLayout.rightIndent, " in \xB7 ", editorZoomMode === "custom" ? `${editorZoom}%` : `${editorZoomMode === "fit-width" ? "Fit width" : "Fit page"} (${editorZoom}%)`)))), !ribbonCollapsed && activeRibbonTab === "expert" && /* @__PURE__ */ React.createElement("div", { id: "builder-ribbon-panel-expert", role: "tabpanel", "aria-labelledby": "builder-ribbon-tab-expert", className: "shrink-0" }, /* @__PURE__ */ React.createElement("p", { className: "bg-slate-900 px-3 py-1.5 text-[11px] leading-snug text-slate-300 border-b border-slate-700" }, /* @__PURE__ */ React.createElement("span", { className: "font-bold text-purple-200" }, "Expert Workbench."), " ", t("export_preview.workbench_help") || 'Describe a change in plain language and the assistant edits this document for you. For example: "make every heading a proper H2", "add alt text to the images", or "fix the color contrast in the table".'), /* @__PURE__ */ React.createElement("details", { open: true, className: "bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-600 group" }, /* @__PURE__ */ React.createElement("summary", { className: "cursor-pointer px-2 py-1.5 flex items-center gap-2 list-none select-none hover:bg-slate-800/50" }, /* @__PURE__ */ React.createElement("span", { className: "inline-block transition-transform group-open:rotate-90 text-slate-300 text-[10px]" }, "\u25B8"), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-purple-200 font-bold shrink-0" }, isAgentRunning ? "\u{1F916} Agent" : "\u2328\uFE0F Command"), isAgentRunning && /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-amber-300 animate-pulse motion-reduce:animate-none" }, "Running..."), /* @__PURE__ */ React.createElement("span", { className: "ml-auto text-[10px] text-slate-300" }, agentActivityLog.length > 0 ? `${agentActivityLog.length} event${agentActivityLog.length === 1 ? "" : "s"}` : "idle")), /* @__PURE__ */ React.createElement("div", { className: "px-2 pb-1.5" }, /* @__PURE__ */ React.createElement("form", { className: "flex-1 flex gap-1", onSubmit: async (e) => {
      e.preventDefault();
      if (!expertCommandInput.trim() || isAgentRunning) return;
      const cmd = expertCommandInput.trim();
      const expertRunId = ++expertRunRef.current;
      setExpertCommandInput("");
      setIsAgentRunning(true);
      console.info("[ExpertWorkbench] start command=" + JSON.stringify(cmd) + " context=export-preview");
      addToast(`\u{1F916} Workbench running: ${cmd}`, "info");
      setAgentActivityLog((prev) => [...prev, { text: "\u25B6 " + cmd, type: "command", time: (/* @__PURE__ */ new Date()).toLocaleTimeString() }]);
      try {
        const iframe = exportPreviewRef.current;
        const doc = iframe?.contentDocument;
        const currentHtml = doc ? "<!DOCTYPE html>\n" + doc.documentElement.outerHTML : getExportPreviewHTML();
        const result = await processExpertCommand(cmd, currentHtml, {
          onProgress: (msg) => {
          },
          onActivity: (entry) => {
            console.info("[ExpertWorkbench] activity type=" + entry.type + " text=" + entry.text);
            if (mountedRef.current && expertRunId === expertRunRef.current) setAgentActivityLog((prev) => [...prev, entry]);
          }
        });
        const liveDoc = exportPreviewRef.current?.contentDocument;
        const liveHtml = liveDoc ? "<!DOCTYPE html>\n" + liveDoc.documentElement.outerHTML : "";
        const resultIsCurrent = mountedRef.current && expertRunId === expertRunRef.current && liveDoc === doc && liveHtml === currentHtml;
        if (!resultIsCurrent) {
          setAgentActivityLog((prev) => [...prev, { text: "Result not applied because the document changed while the command was running.", type: "info", time: (/* @__PURE__ */ new Date()).toLocaleTimeString() }]);
          addToast("The document changed while the Workbench was running, so its older result was not applied.", "info");
        } else if (result && result.html && result.html !== currentHtml && doc) {
          doc.open();
          doc.write(result.html);
          doc.close();
          doc.designMode = "on";
          try {
            if (doc.body) doc.body.setAttribute("data-allo-user-edited", "1");
            window.__alloBuilderEditedPack = { html: "<!DOCTYPE html>\n" + doc.documentElement.outerHTML, at: Date.now() };
          } catch (_) {
          }
          auditRunRef.current += 1;
          writingCheckRunRef.current += 1;
          setExportAuditResult(null);
          setExportAuditLoading(false);
          setWritingCheck(null);
          if (result.score !== void 0) {
            setAgentActivityLog((prev) => [...prev, { text: "\u{1F4CA} Score: " + result.score + "/100", type: "score", time: (/* @__PURE__ */ new Date()).toLocaleTimeString() }]);
          }
          console.info("[ExpertWorkbench] complete command=" + JSON.stringify(cmd) + " score=" + (result.score !== void 0 ? result.score : "n/a"));
          addToast("\u2705 Command applied!", "success");
        } else {
          console.warn("[ExpertWorkbench] noop command=" + JSON.stringify(cmd) + " \u2014 no HTML changes");
          setAgentActivityLog((prev) => [...prev, { text: "\u2139 No changes applied", type: "info", time: (/* @__PURE__ */ new Date()).toLocaleTimeString() }]);
          addToast("\u2139\uFE0F No changes applied", "info");
        }
      } catch (err) {
        console.error("[ExpertWorkbench] error command=" + JSON.stringify(cmd), err);
        setAgentActivityLog((prev) => [...prev, { text: "\u274C " + (err && (err.message || err)), type: "error", time: (/* @__PURE__ */ new Date()).toLocaleTimeString() }]);
        addToast("\u274C Workbench failed: " + (err && (err.message || err) || "unknown error"), "error");
      }
      if (mountedRef.current) setIsAgentRunning(false);
    } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: expertCommandInput,
        onChange: (e) => setExpertCommandInput(e.target.value),
        placeholder: isAgentRunning ? "Agent working..." : "Type command: audit, auto, or natural language...",
        disabled: isAgentRunning,
        "aria-label": "Expert remediation command",
        className: "flex-1 px-2 py-1 bg-slate-700 text-white text-[11px] rounded border border-slate-600 placeholder-slate-500 focus:ring-1 focus:ring-purple-400 focus:outline-none disabled:opacity-50"
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "submit",
        disabled: isAgentRunning || !expertCommandInput.trim(),
        className: "px-2 py-1 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 disabled:opacity-30 transition-colors",
        "aria-label": "Execute command"
      },
      isAgentRunning ? "\u23F3" : "\u25B6"
    )))), agentActivityLog.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "bg-slate-900 border-b border-slate-700" }, /* @__PURE__ */ React.createElement("div", { className: (agentLogFullView ? "max-h-64" : "max-h-24") + " overflow-y-auto px-2 py-1 space-y-0.5 text-[11px] font-mono", "aria-live": "polite", "aria-label": "Agent activity log" }, (agentLogFullView ? agentActivityLog : agentActivityLog.slice(-8)).map((entry, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "flex items-start gap-1 " + (entry.type === "error" ? "text-red-400" : entry.type === "score" ? "text-cyan-300" : entry.type === "success" || entry.type === "complete" ? "text-green-400" : entry.type === "tool" ? "text-amber-300" : entry.type === "command" ? "text-purple-300" : "text-slate-400") }, /* @__PURE__ */ React.createElement("span", { className: "text-slate-400 shrink-0" }, entry.time), /* @__PURE__ */ React.createElement("span", null, entry.text))), isAgentRunning && /* @__PURE__ */ React.createElement("div", { className: "text-purple-400 animate-pulse motion-reduce:animate-none" }, "\u23F3 Processing...")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 px-2 py-1 border-t border-slate-800" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setAgentLogFullView((v) => !v), className: "text-[10px] text-purple-300 hover:text-purple-200 underline" }, agentLogFullView ? "Show recent only" : `Show full log (${agentActivityLog.length})`), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: async (event) => {
      const trigger = event.currentTarget;
      const text = agentActivityLog.map((e) => (e && e.time ? e.time + " " : "") + (e && e.text || "")).join("\n");
      let ok = false;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          ok = true;
        }
      } catch (_) {
        ok = false;
      }
      if (!ok) {
        let ta = null;
        try {
          ta = document.createElement("textarea");
          ta.value = text;
          ta.readOnly = true;
          ta.tabIndex = -1;
          ta.setAttribute("aria-label", "Temporary clipboard helper");
          ta.style.cssText = "position:fixed;left:-10000px;top:0;width:1px;height:1px;opacity:0";
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          ok = document.execCommand("copy");
        } catch (_) {
          ok = false;
        } finally {
          if (ta) ta.remove();
          if (trigger && trigger.isConnected) trigger.focus();
        }
      }
      addToast(ok ? "\u{1F4CB} Log copied (" + agentActivityLog.length + " events)" : "Could not copy \u2014 select the log text manually.", ok ? "success" : "error");
    }, className: "text-[10px] text-cyan-300 hover:text-cyan-200 underline", title: "Copy the full agent/pipeline log to the clipboard" }, "\u{1F4CB} Copy log"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => {
      setAgentActivityLog([]);
      console.info("[ExpertWorkbench] log cleared");
    }, className: "text-[10px] text-slate-300 hover:text-white underline ml-auto" }, "Clear")))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-1 min-h-0 overflow-hidden bg-slate-100" }, showNavigationPane && /* @__PURE__ */ React.createElement("aside", { id: "document-builder-navigation", role: "complementary", "aria-label": "Document navigation", className: "relative flex max-w-[55vw] shrink-0 flex-col border-r border-slate-300 bg-white", style: { width: navigationPaneWidth } }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between border-b border-slate-200 px-3 py-2" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-black uppercase tracking-wider text-slate-700" }, "Navigation"), /* @__PURE__ */ React.createElement("div", { className: "text-[10px] text-slate-500" }, navigationPaneTab === "headings" ? headingOutline.length + " heading" + (headingOutline.length === 1 ? "" : "s") : navigationPaneTab === "sections" ? pageMetrics.documentSections.length + " section" + (pageMetrics.documentSections.length === 1 ? "" : "s") : navigationPaneTab === "references" ? (documentReferences.sources?.length || 0) + " source" + (documentReferences.sources?.length === 1 ? "" : "s") + " \xB7 " + (documentReferences.citations?.length || 0) + " citation" + (documentReferences.citations?.length === 1 ? "" : "s") + (documentReferences.brokenCount ? " \xB7 " + documentReferences.brokenCount + " broken" : "") : navigationPaneTab === "comments" ? unresolvedReviewCommentCount + " open / " + reviewComments.length + " total" : navigationPaneTab === "changes" ? pendingTrackedChangeCount + " pending change" + (pendingTrackedChangeCount === 1 ? "" : "s") : pageMetrics.count + " page" + (pageMetrics.count === 1 ? "" : "s"))), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setShowNavigationPane(false), "aria-label": "Close document navigation", className: "rounded px-1.5 py-0.5 text-lg leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-800" }, "\xD7")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-3 gap-1 border-b border-slate-200 bg-slate-50 p-1", role: "tablist", "aria-label": "Navigation view" }, /* @__PURE__ */ React.createElement("button", { id: "builder-navigation-tab-headings", type: "button", role: "tab", "aria-selected": navigationPaneTab === "headings", "aria-controls": "builder-navigation-panel-headings", tabIndex: navigationPaneTab === "headings" ? 0 : -1, onClick: () => setNavigationPaneTab("headings"), onKeyDown: (event) => handleNavigationTabKeyDown(event, "headings"), className: `rounded px-0.5 py-1.5 text-[9px] font-bold ${navigationPaneTab === "headings" ? "bg-white text-indigo-800 shadow-sm ring-1 ring-slate-300" : "text-slate-600 hover:bg-white"}` }, "Headings"), /* @__PURE__ */ React.createElement("button", { id: "builder-navigation-tab-pages", type: "button", role: "tab", "aria-selected": navigationPaneTab === "pages", "aria-controls": "builder-navigation-panel-pages", tabIndex: navigationPaneTab === "pages" ? 0 : -1, onClick: () => setNavigationPaneTab("pages"), onKeyDown: (event) => handleNavigationTabKeyDown(event, "pages"), className: `rounded px-0.5 py-1.5 text-[9px] font-bold ${navigationPaneTab === "pages" ? "bg-white text-indigo-800 shadow-sm ring-1 ring-slate-300" : "text-slate-600 hover:bg-white"}` }, "Pages"), /* @__PURE__ */ React.createElement("button", { id: "builder-navigation-tab-sections", type: "button", role: "tab", "aria-selected": navigationPaneTab === "sections", "aria-controls": "builder-navigation-panel-sections", tabIndex: navigationPaneTab === "sections" ? 0 : -1, onClick: () => setNavigationPaneTab("sections"), onKeyDown: (event) => handleNavigationTabKeyDown(event, "sections"), className: `rounded px-0.5 py-1.5 text-[9px] font-bold ${navigationPaneTab === "sections" ? "bg-white text-indigo-800 shadow-sm ring-1 ring-slate-300" : "text-slate-600 hover:bg-white"}` }, "Sections"), /* @__PURE__ */ React.createElement("button", { id: "builder-navigation-tab-references", type: "button", role: "tab", "aria-selected": navigationPaneTab === "references", "aria-controls": "builder-navigation-panel-references", tabIndex: navigationPaneTab === "references" ? 0 : -1, onClick: () => setNavigationPaneTab("references"), onKeyDown: (event) => handleNavigationTabKeyDown(event, "references"), className: "rounded px-0.5 py-1.5 text-[9px] font-bold " + (navigationPaneTab === "references" ? "bg-white text-cyan-900 shadow-sm ring-1 ring-cyan-300" : "text-slate-600 hover:bg-white") }, "References"), /* @__PURE__ */ React.createElement("button", { id: "builder-navigation-tab-comments", type: "button", role: "tab", "aria-selected": navigationPaneTab === "comments", "aria-controls": "builder-navigation-panel-comments", tabIndex: navigationPaneTab === "comments" ? 0 : -1, onClick: () => setNavigationPaneTab("comments"), onKeyDown: (event) => handleNavigationTabKeyDown(event, "comments"), className: `rounded px-0.5 py-1.5 text-[9px] font-bold ${navigationPaneTab === "comments" ? "bg-white text-amber-800 shadow-sm ring-1 ring-amber-300" : "text-slate-600 hover:bg-white"}` }, "Comments"), /* @__PURE__ */ React.createElement("button", { id: "builder-navigation-tab-changes", type: "button", role: "tab", "aria-selected": navigationPaneTab === "changes", "aria-controls": "builder-navigation-panel-changes", tabIndex: navigationPaneTab === "changes" ? 0 : -1, onClick: () => setNavigationPaneTab("changes"), onKeyDown: (event) => handleNavigationTabKeyDown(event, "changes"), className: `rounded px-0.5 py-1.5 text-[9px] font-bold ${navigationPaneTab === "changes" ? "bg-white text-violet-800 shadow-sm ring-1 ring-violet-300" : "text-slate-600 hover:bg-white"}` }, "Changes")), navigationPaneTab === "headings" ? /* @__PURE__ */ React.createElement("nav", { id: "builder-navigation-panel-headings", role: "tabpanel", "aria-labelledby": "builder-navigation-tab-headings", "aria-label": "Document heading navigation", className: "min-h-0 flex-1 overflow-y-auto p-2" }, headingOutline.length ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("p", { className: "mb-2 rounded bg-indigo-50 px-2 py-1.5 text-[9px] leading-snug text-indigo-800" }, "Drag headings, or use the arrow buttons, to move a heading and all content beneath it. Nested headings stay with their section."), headingOutline.map((heading) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: heading.index + "-" + heading.text,
        draggable: heading.movable,
        onDragStart: (event) => {
          if (!heading.movable) {
            event.preventDefault();
            return;
          }
          setDraggedHeadingIndex(heading.index);
          if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", String(heading.index));
          }
        },
        onDragEnd: () => setDraggedHeadingIndex(null),
        onDragOver: (event) => {
          if (draggedHeadingIndex != null && heading.movable) {
            event.preventDefault();
            if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
          }
        },
        onDrop: (event) => {
          event.preventDefault();
          const transferred = event.dataTransfer?.getData("text/plain") || "";
          const sourceIndex = draggedHeadingIndex != null ? draggedHeadingIndex : transferred ? Number(transferred) : null;
          moveOutlineSection(sourceIndex, heading.index);
        },
        className: `group mb-1 flex items-center gap-1 rounded-md border p-0.5 ${draggedHeadingIndex === heading.index ? "border-indigo-500 bg-indigo-100 opacity-70" : activeHeadingIndex === heading.index ? "border-indigo-300 bg-indigo-50" : "border-transparent hover:border-slate-200 hover:bg-slate-50"} ${heading.movable ? "cursor-grab active:cursor-grabbing" : ""}`,
        title: heading.movable ? "Drag to reorder this heading section" : "The document title is pinned"
      },
      /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => jumpToHeading(heading),
          "aria-current": activeHeadingIndex === heading.index ? "location" : void 0,
          className: `min-w-0 flex-1 truncate rounded px-1.5 py-1 text-left text-[11px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 ${activeHeadingIndex === heading.index ? "font-bold text-indigo-800" : "text-slate-700 hover:text-indigo-700"}`,
          style: { paddingLeft: Math.min(30, 6 + (heading.level - 1) * 8) }
        },
        /* @__PURE__ */ React.createElement("span", { className: "mr-1 text-[9px] font-bold text-slate-400" }, "H", heading.level),
        heading.text
      ),
      heading.movable ? /* @__PURE__ */ React.createElement("div", { className: "flex shrink-0 items-center", role: "group", "aria-label": "Reorder " + heading.text }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => moveOutlineSection(heading.index, heading.previousIndex), disabled: heading.previousIndex == null, className: "h-6 w-6 rounded text-[11px] font-black text-slate-600 hover:bg-indigo-100 hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-25", "aria-label": "Move " + heading.text + " up", title: "Move section up" }, "\u2191"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => moveOutlineSection(heading.index, heading.nextIndex), disabled: heading.nextIndex == null, className: "h-6 w-6 rounded text-[11px] font-black text-slate-600 hover:bg-indigo-100 hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-25", "aria-label": "Move " + heading.text + " down", title: "Move section down" }, "\u2193")) : /* @__PURE__ */ React.createElement("span", { className: "shrink-0 rounded bg-slate-100 px-1 py-0.5 text-[8px] font-bold uppercase text-slate-500" }, "Pinned")
    ))) : /* @__PURE__ */ React.createElement("p", { className: "px-2 py-3 text-[11px] text-slate-500" }, "Add headings to build a navigable document map.")) : navigationPaneTab === "references" ? /* @__PURE__ */ React.createElement("section", { id: "builder-navigation-panel-references", role: "tabpanel", "aria-labelledby": "builder-navigation-tab-references", "aria-label": "Document references", className: "flex min-h-0 flex-1 flex-col" }, /* @__PURE__ */ React.createElement("div", { className: "space-y-2 border-b border-cyan-200 bg-cyan-50 px-2 py-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-1" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => openCitationSourceManager(), "aria-expanded": showSourceManager, "aria-controls": "builder-source-manager", className: "h-8 rounded bg-cyan-800 px-2.5 text-[10px] font-bold text-white hover:bg-cyan-900" }, "Source Manager"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => openCitationSourceManager(null, "import"), className: "h-8 rounded border border-cyan-500 bg-white px-2.5 text-[10px] font-bold text-cyan-900 hover:bg-cyan-100" }, "Import"), /* @__PURE__ */ React.createElement("button", { type: "button", onMouseDown: (event) => event.preventDefault(), onClick: insertDocumentCitation, disabled: !citationSourceTarget, className: "h-8 rounded border border-cyan-500 bg-white px-2.5 text-[10px] font-bold text-cyan-900 hover:bg-cyan-100 disabled:opacity-45" }, "Insert citation"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: insertOrRefreshDocumentBibliography, disabled: !documentReferences.sources?.length, className: "h-8 rounded border border-cyan-500 bg-white px-2.5 text-[10px] font-bold text-cyan-900 hover:bg-cyan-100 disabled:opacity-45" }, "Bibliography"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: updateAllDocumentFields, "aria-keyshortcuts": "F9", title: "Update all document fields (F9)", className: "h-8 rounded border border-cyan-500 bg-white px-2.5 text-[10px] font-bold text-cyan-900 hover:bg-cyan-100" }, "Update all fields"), /* @__PURE__ */ React.createElement("button", { type: "button", onMouseDown: (event) => event.preventDefault(), onClick: insertDocumentFootnote, "aria-keyshortcuts": "Control+Alt+F", className: "h-8 rounded bg-cyan-800 px-2.5 text-[10px] font-bold text-white hover:bg-cyan-900" }, "Insert footnote"), /* @__PURE__ */ React.createElement("button", { type: "button", onMouseDown: (event) => event.preventDefault(), onClick: insertDocumentBookmark, className: "h-8 rounded border border-cyan-500 bg-white px-2.5 text-[10px] font-bold text-cyan-900 hover:bg-cyan-100" }, "Add bookmark")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-[auto_minmax(0,1fr)] gap-1" }, /* @__PURE__ */ React.createElement("label", { className: "text-[9px] font-bold uppercase tracking-wide text-cyan-900" }, "Citation style", /* @__PURE__ */ React.createElement("select", { value: citationStyle, onChange: (event) => changeCitationStyle(event.target.value), className: "mt-0.5 h-8 w-full rounded border border-cyan-300 bg-white px-1.5 text-[10px] font-semibold normal-case tracking-normal text-slate-700" }, _BUILDER_CITATION_STYLES.map((entry) => /* @__PURE__ */ React.createElement("option", { key: entry.id, value: entry.id }, entry.label)))), /* @__PURE__ */ React.createElement("label", { className: "text-[9px] font-bold uppercase tracking-wide text-cyan-900" }, "Citation source", /* @__PURE__ */ React.createElement("select", { value: citationSourceTarget, onChange: (event) => setCitationSourceTarget(event.target.value), disabled: !documentReferences.sources?.length, className: "mt-0.5 h-8 w-full rounded border border-cyan-300 bg-white px-1.5 text-[10px] font-semibold normal-case tracking-normal text-slate-700 disabled:bg-slate-100" }, !documentReferences.sources?.length && /* @__PURE__ */ React.createElement("option", { value: "" }, "Add a source first"), documentReferences.sources?.map((source) => /* @__PURE__ */ React.createElement("option", { key: source.id, value: source.id }, source.title || _builderCitationAuthorKey(source, citationStyle))))), /* @__PURE__ */ React.createElement("label", { className: "col-span-2 text-[9px] font-bold uppercase tracking-wide text-cyan-900" }, "Page or locator", /* @__PURE__ */ React.createElement("input", { value: citationLocator, onChange: (event) => setCitationLocator(event.target.value.slice(0, 80)), className: "mt-0.5 h-8 w-full rounded border border-cyan-300 bg-white px-2 text-[10px] font-semibold normal-case tracking-normal text-slate-700", placeholder: "Optional: 23, pp. 23\u201325, chap. 2" })), /* @__PURE__ */ React.createElement("label", { className: "col-span-2 inline-flex min-h-7 cursor-pointer items-center gap-1 rounded border border-cyan-200 bg-white px-2 text-[9px] font-semibold text-cyan-900" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: bibliographyIncludeUncited, onChange: (event) => setBibliographyIncludeUncited(event.target.checked), className: "accent-cyan-800" }), "Include uncited sources in bibliography")), "                            ", /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-[minmax(0,1fr)_auto] gap-1" }, /* @__PURE__ */ React.createElement("label", { className: "text-[9px] font-bold uppercase tracking-wide text-cyan-900" }, "Cross-reference target", /* @__PURE__ */ React.createElement("select", { value: crossReferenceTarget, onChange: (event) => setCrossReferenceTarget(event.target.value), disabled: !documentReferences.bookmarks.length, className: "mt-0.5 h-8 w-full rounded border border-cyan-300 bg-white px-1.5 text-[10px] font-semibold normal-case tracking-normal text-slate-700 disabled:bg-slate-100" }, !documentReferences.bookmarks.length && /* @__PURE__ */ React.createElement("option", { value: "" }, "Add a bookmark first"), documentReferences.bookmarks.map((entry) => /* @__PURE__ */ React.createElement("option", { key: entry.id, value: entry.id }, entry.name)))), /* @__PURE__ */ React.createElement("label", { className: "text-[9px] font-bold uppercase tracking-wide text-cyan-900" }, "Label", /* @__PURE__ */ React.createElement("select", { value: crossReferenceLabelMode, onChange: (event) => setCrossReferenceLabelMode(event.target.value), className: "mt-0.5 h-8 rounded border border-cyan-300 bg-white px-1.5 text-[10px] font-semibold normal-case tracking-normal text-slate-700" }, /* @__PURE__ */ React.createElement("option", { value: "text" }, "Text"), /* @__PURE__ */ React.createElement("option", { value: "name" }, "Name"))), /* @__PURE__ */ React.createElement("button", { type: "button", onMouseDown: (event) => event.preventDefault(), onClick: insertDocumentCrossReference, disabled: !crossReferenceTarget, className: "col-span-2 h-8 rounded border border-cyan-500 bg-white px-2.5 text-[10px] font-bold text-cyan-900 hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-45" }, "Insert cross-reference at cursor")), showSourceManager && /* @__PURE__ */ React.createElement("section", { id: "builder-source-manager", className: "space-y-2 rounded border border-cyan-300 bg-white p-2", "aria-label": "Source Manager" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between gap-2" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "text-[10px] font-black text-cyan-950" }, "Source Manager"), /* @__PURE__ */ React.createElement("p", { className: "text-[8px] leading-snug text-slate-500" }, editingCitationSourceId ? "Edit this reusable source." : "Add one source manually or import a group.")), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => {
      setShowSourceManager(false);
      resetCitationSourceDraft();
    }, className: "rounded px-1.5 py-0.5 text-sm leading-none text-slate-500 hover:bg-slate-100", "aria-label": "Close Source Manager" }, "?")), !editingCitationSourceId && /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-1", role: "tablist", "aria-label": "Source Manager mode" }, /* @__PURE__ */ React.createElement("button", { id: "builder-source-mode-manual", type: "button", role: "tab", "aria-selected": citationSourceMode === "manual", "aria-controls": "builder-source-panel-manual", onClick: () => {
      setCitationSourceMode("manual");
      setCitationImportFeedback(null);
    }, className: "h-8 rounded text-[9px] font-bold " + (citationSourceMode === "manual" ? "bg-cyan-800 text-white" : "border border-cyan-300 bg-white text-cyan-900 hover:bg-cyan-50") }, "Add manually"), /* @__PURE__ */ React.createElement("button", { id: "builder-source-mode-import", type: "button", role: "tab", "aria-selected": citationSourceMode === "import", "aria-controls": "builder-source-panel-import", onClick: () => {
      setCitationSourceMode("import");
      setCitationImportFeedback(null);
    }, className: "h-8 rounded text-[9px] font-bold " + (citationSourceMode === "import" ? "bg-cyan-800 text-white" : "border border-cyan-300 bg-white text-cyan-900 hover:bg-cyan-50") }, "Import RIS / BibTeX")), citationSourceMode === "manual" || editingCitationSourceId ? /* @__PURE__ */ React.createElement("form", { id: "builder-source-panel-manual", role: "tabpanel", "aria-labelledby": !editingCitationSourceId ? "builder-source-mode-manual" : void 0, onSubmit: saveCitationSource, className: "space-y-2" }, /* @__PURE__ */ React.createElement("p", { className: "text-[8px] leading-snug text-slate-500" }, "Use semicolons between people and enter each as Last, First. Use Corporate author for organizations."), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-1" }, /* @__PURE__ */ React.createElement("label", { className: "text-[8px] font-bold uppercase text-slate-600" }, "Type", /* @__PURE__ */ React.createElement("select", { value: citationSourceDraft.type, onChange: (event) => setCitationSourceDraft((draft) => ({ ...draft, type: event.target.value })), className: "mt-0.5 h-8 w-full rounded border border-slate-300 px-1.5 text-[10px] font-medium normal-case text-slate-800" }, _BUILDER_CITATION_SOURCE_TYPES.map((type) => /* @__PURE__ */ React.createElement("option", { key: type, value: type }, type[0].toUpperCase() + type.slice(1))))), /* @__PURE__ */ React.createElement("label", { className: "text-[8px] font-bold uppercase text-slate-600" }, "Year", /* @__PURE__ */ React.createElement("input", { value: citationSourceDraft.year, onChange: (event) => setCitationSourceDraft((draft) => ({ ...draft, year: event.target.value.slice(0, 20) })), className: "mt-0.5 h-8 w-full rounded border border-slate-300 px-2 text-[10px] font-medium normal-case text-slate-800", placeholder: "2026 or n.d." })), /* @__PURE__ */ React.createElement("label", { className: "col-span-2 text-[8px] font-bold uppercase text-slate-600" }, "Title", /* @__PURE__ */ React.createElement("input", { required: true, value: citationSourceDraft.title, onChange: (event) => setCitationSourceDraft((draft) => ({ ...draft, title: event.target.value.slice(0, 300) })), className: "mt-0.5 h-8 w-full rounded border border-slate-300 px-2 text-[10px] font-medium normal-case text-slate-800" })), /* @__PURE__ */ React.createElement("label", { className: "col-span-2 text-[8px] font-bold uppercase text-slate-600" }, "Authors", /* @__PURE__ */ React.createElement("input", { value: citationSourceDraft.authors.join("; "), onChange: (event) => setCitationSourceDraft((draft) => ({ ...draft, authors: event.target.value.split(";").map((value) => value.trim()).filter(Boolean).slice(0, 20) })), className: "mt-0.5 h-8 w-full rounded border border-slate-300 px-2 text-[10px] font-medium normal-case text-slate-800", placeholder: "Smith, Jordan; Lee, Morgan" })), /* @__PURE__ */ React.createElement("label", { className: "col-span-2 text-[8px] font-bold uppercase text-slate-600" }, "Corporate author", /* @__PURE__ */ React.createElement("input", { value: citationSourceDraft.corporateAuthor, onChange: (event) => setCitationSourceDraft((draft) => ({ ...draft, corporateAuthor: event.target.value.slice(0, 160) })), className: "mt-0.5 h-8 w-full rounded border border-slate-300 px-2 text-[10px] font-medium normal-case text-slate-800", placeholder: "Optional organization" })), /* @__PURE__ */ React.createElement("label", { className: "col-span-2 text-[8px] font-bold uppercase text-slate-600" }, "Journal, website, or container", /* @__PURE__ */ React.createElement("input", { value: citationSourceDraft.containerTitle, onChange: (event) => setCitationSourceDraft((draft) => ({ ...draft, containerTitle: event.target.value.slice(0, 300) })), className: "mt-0.5 h-8 w-full rounded border border-slate-300 px-2 text-[10px] font-medium normal-case text-slate-800" })), /* @__PURE__ */ React.createElement("label", { className: "col-span-2 text-[8px] font-bold uppercase text-slate-600" }, "Publisher", /* @__PURE__ */ React.createElement("input", { value: citationSourceDraft.publisher, onChange: (event) => setCitationSourceDraft((draft) => ({ ...draft, publisher: event.target.value.slice(0, 200) })), className: "mt-0.5 h-8 w-full rounded border border-slate-300 px-2 text-[10px] font-medium normal-case text-slate-800" })), /* @__PURE__ */ React.createElement("label", { className: "text-[8px] font-bold uppercase text-slate-600" }, "Volume", /* @__PURE__ */ React.createElement("input", { value: citationSourceDraft.volume, onChange: (event) => setCitationSourceDraft((draft) => ({ ...draft, volume: event.target.value.slice(0, 40) })), className: "mt-0.5 h-8 w-full rounded border border-slate-300 px-2 text-[10px] font-medium normal-case text-slate-800" })), /* @__PURE__ */ React.createElement("label", { className: "text-[8px] font-bold uppercase text-slate-600" }, "Issue", /* @__PURE__ */ React.createElement("input", { value: citationSourceDraft.issue, onChange: (event) => setCitationSourceDraft((draft) => ({ ...draft, issue: event.target.value.slice(0, 40) })), className: "mt-0.5 h-8 w-full rounded border border-slate-300 px-2 text-[10px] font-medium normal-case text-slate-800" })), /* @__PURE__ */ React.createElement("label", { className: "col-span-2 text-[8px] font-bold uppercase text-slate-600" }, "Page range", /* @__PURE__ */ React.createElement("input", { value: citationSourceDraft.pages, onChange: (event) => setCitationSourceDraft((draft) => ({ ...draft, pages: event.target.value.slice(0, 80) })), className: "mt-0.5 h-8 w-full rounded border border-slate-300 px-2 text-[10px] font-medium normal-case text-slate-800" })), /* @__PURE__ */ React.createElement("label", { className: "col-span-2 text-[8px] font-bold uppercase text-slate-600" }, "DOI", /* @__PURE__ */ React.createElement("span", { className: "mt-0.5 flex gap-1" }, /* @__PURE__ */ React.createElement("input", { value: citationSourceDraft.doi, onChange: (event) => {
      setCitationSourceDraft((draft) => ({ ...draft, doi: event.target.value.slice(0, 300) }));
      setCitationImportFeedback(null);
    }, className: "h-8 min-w-0 flex-1 rounded border border-slate-300 px-2 text-[10px] font-medium normal-case text-slate-800", placeholder: "10.xxxx/xxxxx" }), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: lookupCitationDoi, disabled: citationDoiBusy || !citationSourceDraft.doi.trim(), "aria-busy": citationDoiBusy, className: "h-8 shrink-0 rounded border border-cyan-400 bg-cyan-50 px-2 text-[9px] font-bold normal-case text-cyan-900 hover:bg-cyan-100 disabled:opacity-40" }, citationDoiBusy ? "Looking up?" : "Look up DOI"))), /* @__PURE__ */ React.createElement("label", { className: "col-span-2 text-[8px] font-bold uppercase text-slate-600" }, "URL", /* @__PURE__ */ React.createElement("input", { type: "url", value: citationSourceDraft.url, onChange: (event) => setCitationSourceDraft((draft) => ({ ...draft, url: event.target.value.slice(0, 1e3) })), className: "mt-0.5 h-8 w-full rounded border border-slate-300 px-2 text-[10px] font-medium normal-case text-slate-800", placeholder: "https://?" })), /* @__PURE__ */ React.createElement("label", { className: "col-span-2 text-[8px] font-bold uppercase text-slate-600" }, "Accessed date", /* @__PURE__ */ React.createElement("input", { value: citationSourceDraft.accessed, onChange: (event) => setCitationSourceDraft((draft) => ({ ...draft, accessed: event.target.value.slice(0, 80) })), className: "mt-0.5 h-8 w-full rounded border border-slate-300 px-2 text-[10px] font-medium normal-case text-slate-800", placeholder: "Optional: August 12, 2026" }))), citationImportFeedback && /* @__PURE__ */ React.createElement("p", { className: "rounded px-2 py-1.5 text-[9px] font-semibold " + (citationImportFeedback.tone === "error" ? "border border-red-300 bg-red-50 text-red-800" : citationImportFeedback.tone === "success" ? "border border-emerald-300 bg-emerald-50 text-emerald-800" : "border border-cyan-200 bg-cyan-50 text-cyan-900"), role: citationImportFeedback.tone === "error" ? "alert" : "status", "aria-live": "polite" }, citationImportFeedback.message), /* @__PURE__ */ React.createElement("div", { className: "flex gap-1" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => {
      setShowSourceManager(false);
      resetCitationSourceDraft();
    }, className: "h-8 flex-1 rounded border border-slate-300 bg-white px-2 text-[10px] font-bold text-slate-700 hover:bg-slate-50" }, "Cancel"), /* @__PURE__ */ React.createElement("button", { type: "submit", className: "h-8 flex-1 rounded bg-cyan-800 px-2 text-[10px] font-bold text-white hover:bg-cyan-900" }, editingCitationSourceId ? "Save source" : "Add source"))) : /* @__PURE__ */ React.createElement("form", { id: "builder-source-panel-import", role: "tabpanel", "aria-labelledby": "builder-source-mode-import", onSubmit: importCitationSources, className: "space-y-2" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-[auto_minmax(0,1fr)] items-end gap-2" }, /* @__PURE__ */ React.createElement("label", { className: "text-[8px] font-bold uppercase text-slate-600" }, "Format", /* @__PURE__ */ React.createElement("select", { value: citationImportFormat, onChange: (event) => {
      setCitationImportFormat(event.target.value);
      setCitationImportFeedback(null);
    }, className: "mt-0.5 h-8 w-full rounded border border-slate-300 bg-white px-1.5 text-[10px] font-semibold normal-case text-slate-800" }, /* @__PURE__ */ React.createElement("option", { value: "auto" }, "Auto-detect"), /* @__PURE__ */ React.createElement("option", { value: "ris" }, "RIS"), /* @__PURE__ */ React.createElement("option", { value: "bibtex" }, "BibTeX"))), /* @__PURE__ */ React.createElement("p", { className: "pb-1 text-[8px] leading-snug text-slate-500" }, "Duplicates are matched by DOI, URL, or author/title/year and skipped.")), /* @__PURE__ */ React.createElement("label", { className: "block text-[8px] font-bold uppercase text-slate-600" }, "Paste source records", /* @__PURE__ */ React.createElement("textarea", { value: citationImportText, onChange: (event) => {
      setCitationImportText(event.target.value.slice(0, 5e5));
      setCitationImportFeedback(null);
    }, rows: 8, spellCheck: false, className: "mt-0.5 w-full resize-y rounded border border-slate-300 bg-white px-2 py-1.5 font-mono text-[9px] font-medium normal-case text-slate-800", placeholder: "RIS example:\\nTY  - JOUR\\nAU  - Smith, Jordan\\nTI  - Article title\\nER  -\\n\\nBibTeX example:\\n@article{key, title={Article title}, author={Smith, Jordan}}" })), /* @__PURE__ */ React.createElement("p", { className: "text-[8px] leading-snug text-slate-500" }, "Up to 200 source records can be stored in a document. Imported source metadata stays with editable drafts and is excluded from final exports."), citationImportFeedback && /* @__PURE__ */ React.createElement("p", { className: "rounded px-2 py-1.5 text-[9px] font-semibold " + (citationImportFeedback.tone === "error" ? "border border-red-300 bg-red-50 text-red-800" : citationImportFeedback.tone === "success" ? "border border-emerald-300 bg-emerald-50 text-emerald-800" : "border border-cyan-200 bg-cyan-50 text-cyan-900"), role: citationImportFeedback.tone === "error" ? "alert" : "status", "aria-live": "polite" }, citationImportFeedback.message), /* @__PURE__ */ React.createElement("div", { className: "flex gap-1" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => {
      setShowSourceManager(false);
      resetCitationSourceDraft();
    }, className: "h-8 flex-1 rounded border border-slate-300 bg-white px-2 text-[10px] font-bold text-slate-700 hover:bg-slate-50" }, "Close"), /* @__PURE__ */ React.createElement("button", { type: "submit", disabled: !citationImportText.trim(), className: "h-8 flex-1 rounded bg-cyan-800 px-2 text-[10px] font-bold text-white hover:bg-cyan-900 disabled:opacity-40" }, "Import sources"))), /* @__PURE__ */ React.createElement("p", { className: "text-[8px] leading-snug text-slate-500" }, "Generated citations cover common cases. Verify specialized legal, archival, translated, media, and institutional requirements against your assigned style guide.")), /* @__PURE__ */ React.createElement("p", { className: "rounded px-2 py-1.5 text-[9px] leading-snug " + (documentReferences.brokenCount ? "border border-red-300 bg-red-50 font-bold text-red-800" : "border border-emerald-200 bg-emerald-50 text-emerald-800"), role: documentReferences.brokenCount ? "alert" : "status" }, documentReferences.brokenCount ? documentReferences.brokenCount + " broken reference" + (documentReferences.brokenCount === 1 ? "" : "s") + " found. Review the red items below before exporting." : "Reference integrity check passed. Citation labels, bibliography entries, footnote numbers, and cross-references are synchronized.")), /* @__PURE__ */ React.createElement("div", { className: "min-h-0 flex-1 space-y-3 overflow-y-auto p-2" }, /* @__PURE__ */ React.createElement("section", { "aria-labelledby": "builder-sources-list-title" }, /* @__PURE__ */ React.createElement("h3", { id: "builder-sources-list-title", className: "mb-1 flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-slate-500" }, /* @__PURE__ */ React.createElement("span", null, "Sources"), /* @__PURE__ */ React.createElement("span", null, documentReferences.sources?.length || 0)), /* @__PURE__ */ React.createElement("div", { className: "space-y-1" }, documentReferences.sources?.length ? documentReferences.sources.map((source) => {
      const usageCount = documentReferences.citations?.filter((citation) => citation.items?.some((item) => item.sourceId === source.id)).length || 0;
      return /* @__PURE__ */ React.createElement("article", { key: source.id, className: "rounded border p-1.5 " + (activeDocumentReferenceKey === "source:" + source.id ? "border-cyan-500 bg-cyan-50 ring-1 ring-cyan-200" : "border-slate-200 bg-white") }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-1" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => {
        setCitationSourceTarget(source.id);
        setActiveDocumentReferenceKey("source:" + source.id);
      }, "aria-current": activeDocumentReferenceKey === "source:" + source.id ? "true" : void 0, className: "min-w-0 flex-1 rounded px-1 text-left hover:bg-cyan-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-700" }, /* @__PURE__ */ React.createElement("span", { className: "block truncate text-[10px] font-black text-cyan-900" }, source.title || "Untitled source"), /* @__PURE__ */ React.createElement("span", { className: "mt-0.5 block truncate text-[9px] text-slate-600" }, _builderCitationAuthorKey(source, citationStyle), source.year ? " \xB7 " + source.year : ""), /* @__PURE__ */ React.createElement("span", { className: "mt-0.5 block text-[8px] font-semibold text-slate-400" }, source.type, " \xB7 ", usageCount, " citation", usageCount === 1 ? "" : "s")), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => openCitationSourceManager(source), className: "shrink-0 rounded px-1.5 py-1 text-[9px] font-bold text-cyan-800 hover:bg-cyan-100", "aria-label": "Edit source " + source.title }, "Edit"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => removeCitationSource(source), disabled: usageCount > 0, className: "shrink-0 rounded px-1.5 py-1 text-[9px] font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-35", "aria-label": "Delete source " + source.title, title: usageCount ? "Remove its citation fields before deleting this source" : "Delete source" }, "Delete")));
    }) : /* @__PURE__ */ React.createElement("p", { className: "rounded border border-dashed border-slate-300 bg-slate-50 px-2 py-3 text-center text-[10px] text-slate-500" }, "Add a reusable source, then insert live citations at the cursor."))), /* @__PURE__ */ React.createElement("section", { "aria-labelledby": "builder-citations-list-title" }, /* @__PURE__ */ React.createElement("h3", { id: "builder-citations-list-title", className: "mb-1 flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-slate-500" }, /* @__PURE__ */ React.createElement("span", null, "Citations"), /* @__PURE__ */ React.createElement("span", null, documentReferences.citations?.length || 0)), /* @__PURE__ */ React.createElement("div", { className: "space-y-1" }, documentReferences.citations?.length ? documentReferences.citations.map((entry) => /* @__PURE__ */ React.createElement("article", { key: entry.key, className: "flex items-start gap-1 rounded border p-1.5 " + (activeDocumentReferenceKey === entry.key ? "border-cyan-500 bg-cyan-50 ring-1 ring-cyan-200" : entry.broken ? "border-red-300 bg-red-50" : "border-slate-200 bg-white") }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => jumpToDocumentReference(entry), "aria-current": activeDocumentReferenceKey === entry.key ? "location" : void 0, className: "min-w-0 flex-1 rounded px-1 text-left hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-700" }, /* @__PURE__ */ React.createElement("span", { className: "block truncate text-[10px] font-black " + (entry.broken ? "text-red-800" : "text-cyan-900") }, entry.label), /* @__PURE__ */ React.createElement("span", { className: "mt-0.5 block truncate text-[9px] text-slate-500" }, entry.items?.length > 1 ? entry.items.length + " sources" : entry.source?.title || "Missing source"), entry.broken && /* @__PURE__ */ React.createElement("span", { className: "mt-0.5 block text-[8px] font-bold uppercase text-red-700" }, "Source missing")), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: (event) => openCitationEditor(entry, event.currentTarget), className: "shrink-0 rounded px-1.5 py-1 text-[9px] font-bold text-cyan-800 hover:bg-cyan-100", "aria-label": "Edit citation " + entry.label }, "Edit"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => removeDocumentCitation(entry), className: "shrink-0 rounded px-1.5 py-1 text-[9px] font-bold text-red-700 hover:bg-red-100", "aria-label": "Remove citation " + entry.label }, "Remove"))) : /* @__PURE__ */ React.createElement("p", { className: "rounded border border-dashed border-slate-300 bg-slate-50 px-2 py-3 text-center text-[10px] text-slate-500" }, "No live citations yet."))), /* @__PURE__ */ React.createElement("section", { "aria-labelledby": "builder-bibliography-status-title" }, /* @__PURE__ */ React.createElement("h3", { id: "builder-bibliography-status-title", className: "mb-1 text-[9px] font-black uppercase tracking-wider text-slate-500" }, "Bibliography"), /* @__PURE__ */ React.createElement("div", { className: "rounded border p-2 text-[10px] " + (documentReferences.bibliography ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-slate-50 text-slate-600") }, /* @__PURE__ */ React.createElement("p", { className: "font-bold" }, documentReferences.bibliography ? "Live bibliography is in the document." : "No bibliography inserted."), /* @__PURE__ */ React.createElement("p", { className: "mt-0.5 text-[9px]" }, documentReferences.bibliography ? (documentReferences.bibliography.getAttribute("data-allo-bibliography-scope") === "all" ? "All sources" : "Cited sources") + " \xB7 " + (_BUILDER_CITATION_STYLES.find((style) => style.id === citationStyle)?.label || citationStyle) : "Insert one to keep source entries synchronized with citation fields."), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: insertOrRefreshDocumentBibliography, disabled: !documentReferences.sources?.length, className: "mt-2 h-7 rounded border border-emerald-400 bg-white px-2 text-[9px] font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-40" }, documentReferences.bibliography ? "Refresh bibliography" : "Insert bibliography"))), /* @__PURE__ */ React.createElement("section", { "aria-labelledby": "builder-footnotes-list-title" }, /* @__PURE__ */ React.createElement("h3", { id: "builder-footnotes-list-title", className: "mb-1 flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-slate-500" }, /* @__PURE__ */ React.createElement("span", null, "Footnotes"), /* @__PURE__ */ React.createElement("span", null, documentReferences.footnotes.length)), /* @__PURE__ */ React.createElement("div", { className: "space-y-1" }, documentReferences.footnotes.length ? documentReferences.footnotes.map((entry) => /* @__PURE__ */ React.createElement("article", { key: entry.key, className: "flex items-start gap-1 rounded border p-1.5 " + (activeDocumentReferenceKey === entry.key ? "border-cyan-500 bg-cyan-50 ring-1 ring-cyan-200" : entry.broken ? "border-red-300 bg-red-50" : "border-slate-200 bg-white") }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => jumpToDocumentReference(entry), "aria-current": activeDocumentReferenceKey === entry.key ? "location" : void 0, className: "min-w-0 flex-1 rounded px-1 text-left hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-700" }, /* @__PURE__ */ React.createElement("span", { className: "mr-1 inline-flex min-w-5 justify-center rounded px-1 py-0.5 text-[9px] font-black " + (entry.broken ? "bg-red-200 text-red-900" : "bg-cyan-100 text-cyan-900") }, entry.number || "!"), /* @__PURE__ */ React.createElement("span", { className: "line-clamp-2 break-words text-[10px] leading-snug text-slate-700" }, entry.text), entry.broken && /* @__PURE__ */ React.createElement("span", { className: "mt-0.5 block text-[8px] font-bold uppercase text-red-700" }, "Broken link pair")), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => removeDocumentFootnote(entry), className: "shrink-0 rounded px-1.5 py-1 text-[9px] font-bold text-red-700 hover:bg-red-100", "aria-label": "Remove footnote " + (entry.number || entry.id) }, "Remove"))) : /* @__PURE__ */ React.createElement("p", { className: "rounded border border-dashed border-slate-300 bg-slate-50 px-2 py-3 text-center text-[10px] text-slate-500" }, "No footnotes yet."))), /* @__PURE__ */ React.createElement("section", { "aria-labelledby": "builder-bookmarks-list-title" }, /* @__PURE__ */ React.createElement("h3", { id: "builder-bookmarks-list-title", className: "mb-1 flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-slate-500" }, /* @__PURE__ */ React.createElement("span", null, "Bookmarks"), /* @__PURE__ */ React.createElement("span", null, documentReferences.bookmarks.length)), /* @__PURE__ */ React.createElement("div", { className: "space-y-1" }, documentReferences.bookmarks.length ? documentReferences.bookmarks.map((entry) => {
      const linkCount = documentReferences.crossReferences.filter((reference) => reference.targetId === entry.id).length;
      return /* @__PURE__ */ React.createElement("article", { key: entry.key, className: "flex items-start gap-1 rounded border p-1.5 " + (activeDocumentReferenceKey === entry.key ? "border-cyan-500 bg-cyan-50 ring-1 ring-cyan-200" : "border-slate-200 bg-white") }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => jumpToDocumentReference(entry), "aria-current": activeDocumentReferenceKey === entry.key ? "location" : void 0, className: "min-w-0 flex-1 rounded px-1 text-left hover:bg-cyan-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-700" }, /* @__PURE__ */ React.createElement("span", { className: "block truncate text-[10px] font-black text-cyan-900" }, entry.name), /* @__PURE__ */ React.createElement("span", { className: "mt-0.5 block line-clamp-2 break-words text-[9px] leading-snug text-slate-600" }, entry.text), /* @__PURE__ */ React.createElement("span", { className: "mt-0.5 block text-[8px] font-semibold text-slate-400" }, linkCount, " cross-reference", linkCount === 1 ? "" : "s")), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => removeDocumentBookmark(entry), className: "shrink-0 rounded px-1.5 py-1 text-[9px] font-bold text-red-700 hover:bg-red-100", "aria-label": "Remove bookmark " + entry.name }, "Remove"));
    }) : /* @__PURE__ */ React.createElement("p", { className: "rounded border border-dashed border-slate-300 bg-slate-50 px-2 py-3 text-center text-[10px] text-slate-500" }, "Select text or place the cursor, then add a bookmark."))), /* @__PURE__ */ React.createElement("section", { "aria-labelledby": "builder-cross-references-list-title" }, /* @__PURE__ */ React.createElement("h3", { id: "builder-cross-references-list-title", className: "mb-1 flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-slate-500" }, /* @__PURE__ */ React.createElement("span", null, "Cross-references"), /* @__PURE__ */ React.createElement("span", null, documentReferences.crossReferences.length)), /* @__PURE__ */ React.createElement("div", { className: "space-y-1" }, documentReferences.crossReferences.length ? documentReferences.crossReferences.map((entry) => /* @__PURE__ */ React.createElement("article", { key: entry.key, className: "flex items-start gap-1 rounded border p-1.5 " + (activeDocumentReferenceKey === entry.key ? "border-cyan-500 bg-cyan-50 ring-1 ring-cyan-200" : entry.broken ? "border-red-300 bg-red-50" : "border-slate-200 bg-white") }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => jumpToDocumentReference(entry), "aria-current": activeDocumentReferenceKey === entry.key ? "location" : void 0, className: "min-w-0 flex-1 rounded px-1 text-left hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-700" }, /* @__PURE__ */ React.createElement("span", { className: "block truncate text-[10px] font-black " + (entry.broken ? "text-red-800" : "text-cyan-900") }, entry.label), /* @__PURE__ */ React.createElement("span", { className: "mt-0.5 block truncate text-[9px] text-slate-500" }, "Target: ", entry.targetName), entry.broken && /* @__PURE__ */ React.createElement("span", { className: "mt-0.5 block text-[8px] font-bold uppercase text-red-700" }, "Bookmark missing")), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => removeDocumentCrossReference(entry), className: "shrink-0 rounded px-1.5 py-1 text-[9px] font-bold text-red-700 hover:bg-red-100", "aria-label": "Remove cross-reference to " + entry.targetName }, "Remove"))) : /* @__PURE__ */ React.createElement("p", { className: "rounded border border-dashed border-slate-300 bg-slate-50 px-2 py-3 text-center text-[10px] text-slate-500" }, "No cross-references yet. Add a bookmark, place the cursor, and insert a live link."))))) : navigationPaneTab === "changes" ? /* @__PURE__ */ React.createElement("section", { id: "builder-navigation-panel-changes", role: "tabpanel", "aria-labelledby": "builder-navigation-tab-changes", "aria-label": "Tracked changes review", className: "flex min-h-0 flex-1 flex-col" }, /* @__PURE__ */ React.createElement("div", { className: "space-y-2 border-b border-violet-200 bg-violet-50 px-2 py-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => toggleTrackChanges(), "aria-pressed": trackChangesEnabled, "aria-keyshortcuts": "Control+Shift+E", className: "h-8 rounded px-2.5 text-[11px] font-bold " + (trackChangesEnabled ? "bg-violet-700 text-white hover:bg-violet-800" : "border border-violet-500 bg-white text-violet-800 hover:bg-violet-100") }, "Tracking ", trackChangesEnabled ? "on" : "off"), /* @__PURE__ */ React.createElement("label", { className: "ml-auto flex items-center gap-1 text-[10px] font-semibold text-violet-900" }, "View", /* @__PURE__ */ React.createElement("select", { value: trackedMarkupView, onChange: (event) => setTrackedMarkupView(event.target.value), className: "h-8 rounded border border-violet-400 bg-white px-1.5 text-[10px] font-bold text-violet-900", "aria-label": "Tracked changes markup view" }, /* @__PURE__ */ React.createElement("option", { value: "simple" }, "Simple Markup"), /* @__PURE__ */ React.createElement("option", { value: "all" }, "All Markup"), /* @__PURE__ */ React.createElement("option", { value: "none" }, "No Markup"), /* @__PURE__ */ React.createElement("option", { value: "original" }, "Original")))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2" }, /* @__PURE__ */ React.createElement("label", { className: "text-[9px] font-bold uppercase tracking-wide text-violet-800" }, "Reviewer", /* @__PURE__ */ React.createElement("input", { value: reviewerName, maxLength: 80, onChange: (event) => setReviewerName(event.target.value.slice(0, 80)), onBlur: () => setReviewerName((value) => String(value || "You").replace(/\s+/g, " ").trim().slice(0, 80) || "You"), className: "mt-0.5 h-8 w-full rounded border border-violet-300 bg-white px-2 text-[11px] font-medium normal-case tracking-normal text-slate-800", "aria-label": "Reviewer name for new tracked changes" })), /* @__PURE__ */ React.createElement("label", { className: "inline-flex h-8 cursor-pointer items-center gap-1 rounded border border-violet-300 bg-white px-2 text-[9px] font-bold text-violet-900" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: showRevisionBalloons, onChange: (event) => setShowRevisionBalloons(event.target.checked), className: "accent-violet-700" }), "Margin detail")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-3 gap-1", "aria-label": "Tracked change filters" }, /* @__PURE__ */ React.createElement("label", { className: "text-[9px] font-bold text-violet-800" }, "Type", /* @__PURE__ */ React.createElement("select", { value: trackedChangeTypeFilter, onChange: (event) => setTrackedChangeTypeFilter(event.target.value), className: "mt-0.5 h-7 w-full rounded border border-violet-300 bg-white px-1 text-[9px] font-semibold text-slate-700" }, /* @__PURE__ */ React.createElement("option", { value: "all" }, "All types"), /* @__PURE__ */ React.createElement("option", { value: "text" }, "Text"), /* @__PURE__ */ React.createElement("option", { value: "format" }, "Formatting"), /* @__PURE__ */ React.createElement("option", { value: "paragraph" }, "Paragraph"), /* @__PURE__ */ React.createElement("option", { value: "structure" }, "Structure"))), /* @__PURE__ */ React.createElement("label", { className: "text-[9px] font-bold text-violet-800" }, "Reviewer", /* @__PURE__ */ React.createElement("select", { value: trackedChangeAuthorFilter, onChange: (event) => setTrackedChangeAuthorFilter(event.target.value), className: "mt-0.5 h-7 w-full rounded border border-violet-300 bg-white px-1 text-[9px] font-semibold text-slate-700" }, /* @__PURE__ */ React.createElement("option", { value: "all" }, "Everyone"), trackedChangeAuthors.map((author) => /* @__PURE__ */ React.createElement("option", { key: author, value: author }, author)))), /* @__PURE__ */ React.createElement("label", { className: "text-[9px] font-bold text-violet-800" }, "When", /* @__PURE__ */ React.createElement("select", { value: trackedChangeDateFilter, onChange: (event) => setTrackedChangeDateFilter(event.target.value), className: "mt-0.5 h-7 w-full rounded border border-violet-300 bg-white px-1 text-[9px] font-semibold text-slate-700" }, /* @__PURE__ */ React.createElement("option", { value: "all" }, "Any time"), /* @__PURE__ */ React.createElement("option", { value: "today" }, "Last 24 hours"), /* @__PURE__ */ React.createElement("option", { value: "week" }, "Last 7 days")))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-1" }, /* @__PURE__ */ React.createElement("button", { type: "button", disabled: !visibleTrackedChanges.length, onClick: () => navigateTrackedChange(-1), className: "h-7 rounded border border-violet-300 bg-white px-2 text-[10px] font-bold text-violet-800 hover:bg-violet-100 disabled:opacity-40", "aria-label": "Previous filtered tracked change" }, "Previous"), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: !visibleTrackedChanges.length, onClick: () => navigateTrackedChange(1), className: "h-7 rounded border border-violet-300 bg-white px-2 text-[10px] font-bold text-violet-800 hover:bg-violet-100 disabled:opacity-40", "aria-label": "Next filtered tracked change" }, "Next"), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: !visibleTrackedChanges.length, onClick: () => setSelectedTrackedChangeIds((selected) => visibleTrackedChanges.every((change) => selected.includes(change.id)) ? selected.filter((id) => !visibleTrackedChanges.some((change) => change.id === id)) : Array.from(/* @__PURE__ */ new Set([...selected, ...visibleTrackedChanges.map((change) => change.id)]))), className: "h-7 rounded border border-violet-300 bg-white px-2 text-[9px] font-bold text-violet-800 hover:bg-violet-100 disabled:opacity-40" }, visibleTrackedChanges.length > 0 && visibleTrackedChanges.every((change) => selectedTrackedChangeIds.includes(change.id)) ? "Clear visible" : "Select visible"), /* @__PURE__ */ React.createElement("span", { className: "ml-auto text-[10px] font-semibold text-violet-800" }, visibleTrackedChanges.length, " of ", pendingTrackedChangeCount)), /* @__PURE__ */ React.createElement("details", { className: "rounded border border-violet-200 bg-white px-2 py-1" }, /* @__PURE__ */ React.createElement("summary", { className: "cursor-pointer text-[9px] font-black uppercase tracking-wide text-violet-800" }, "Revision summary"), /* @__PURE__ */ React.createElement("div", { className: "mt-1 grid grid-cols-5 gap-1 text-center text-[8px] text-slate-600" }, /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("strong", { className: "block text-emerald-700" }, trackedChangeSummary.insert), "Insert"), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("strong", { className: "block text-red-700" }, trackedChangeSummary.delete), "Delete"), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("strong", { className: "block text-sky-700" }, trackedChangeSummary.format), "Format"), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("strong", { className: "block text-amber-700" }, trackedChangeSummary.paragraph), "Paragraph"), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("strong", { className: "block text-violet-700" }, trackedChangeSummary.structure), "Structure")), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-[9px] leading-relaxed text-slate-600" }, trackedChangeAuthors.length || 0, " reviewer", trackedChangeAuthors.length === 1 ? "" : "s", " \xB7 Final exports use the accepted view and omit review markup.")), /* @__PURE__ */ React.createElement("p", { className: "text-[9px] leading-relaxed text-violet-800" }, "Tracks text, inline and named formatting, paragraph layout, lists, table shape, and explicit page or section changes. Original view restores the prior revision state and returns to All Markup when editing resumes.")), /* @__PURE__ */ React.createElement("div", { className: "min-h-0 flex-1 space-y-2 overflow-y-auto p-2", "aria-live": "polite" }, visibleTrackedChanges.length ? visibleTrackedChanges.map((change) => {
      const active = activeTrackedChangeId === change.id;
      const selected = selectedTrackedChangeIds.includes(change.id);
      const insertion = change.type === "insert";
      const deletion = change.type === "delete";
      const category = insertion ? "Insertion" : deletion ? "Deletion" : change.type === "paragraph" ? "Paragraph" : change.type === "structure" ? "Structure" : "Formatting";
      const tone = insertion ? "emerald" : deletion ? "red" : change.type === "paragraph" ? "amber" : change.type === "structure" ? "violet" : "sky";
      const borderClass = active ? "border-violet-500 bg-violet-50 ring-2 ring-violet-200" : tone === "emerald" ? "border-emerald-200 bg-white" : tone === "red" ? "border-red-200 bg-white" : tone === "amber" ? "border-amber-200 bg-white" : tone === "sky" ? "border-sky-200 bg-white" : "border-violet-200 bg-white";
      const headingClass = tone === "emerald" ? "text-emerald-700" : tone === "red" ? "text-red-700" : tone === "amber" ? "text-amber-700" : tone === "sky" ? "text-sky-700" : "text-violet-700";
      const quoteClass = tone === "emerald" ? "bg-emerald-50 text-emerald-900" : tone === "red" ? "bg-red-50 text-red-900 line-through" : tone === "amber" ? "bg-amber-50 text-amber-950" : tone === "sky" ? "bg-sky-50 text-sky-950" : "bg-violet-50 text-violet-950";
      const reviewerIdentity = _builderReviewerIdentity(change.author);
      return /* @__PURE__ */ React.createElement("article", { key: change.id, id: "builder-change-" + change.id, "aria-labelledby": "builder-change-title-" + change.id, className: "rounded-lg border p-2 shadow-sm " + borderClass, style: { borderLeftColor: reviewerIdentity.accent, borderLeftWidth: 4 } }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-1" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: selected, onChange: (event) => setSelectedTrackedChangeIds((ids) => event.target.checked ? Array.from(/* @__PURE__ */ new Set([...ids, change.id])) : ids.filter((id) => id !== change.id)), className: "mt-2 accent-violet-700", "aria-label": "Select " + change.label }), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => jumpToTrackedChange(change.id), "aria-current": active ? "location" : void 0, "aria-label": "Go to " + category.toLowerCase() + ": " + change.text, className: "min-w-0 flex-1 rounded px-1 py-1 text-left hover:bg-violet-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-600" }, /* @__PURE__ */ React.createElement("span", { className: "flex items-center justify-between gap-2" }, /* @__PURE__ */ React.createElement("h3", { id: "builder-change-title-" + change.id, className: "text-[9px] font-black uppercase tracking-wider " + headingClass }, category, " ", change.index + 1), /* @__PURE__ */ React.createElement("time", { className: "text-[9px] font-medium text-slate-500", dateTime: change.at || void 0 }, change.at && !Number.isNaN(Date.parse(change.at)) ? new Date(change.at).toLocaleString() : "Recently")), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-[10px] font-bold text-slate-700" }, change.label), /* @__PURE__ */ React.createElement("blockquote", { className: "mt-1 line-clamp-4 break-words rounded px-2 py-1.5 text-[11px] leading-relaxed " + quoteClass }, '"', change.text, '"'), /* @__PURE__ */ React.createElement("span", { className: "mt-1 flex items-center gap-1 text-[9px] font-semibold", style: { color: reviewerIdentity.ink } }, /* @__PURE__ */ React.createElement("span", { className: "flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-black", style: { backgroundColor: reviewerIdentity.soft, border: "1px solid " + reviewerIdentity.accent }, "aria-hidden": "true" }, reviewerIdentity.initials), "By ", reviewerIdentity.name))), /* @__PURE__ */ React.createElement("div", { className: "mt-2 flex gap-1" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => applyTrackedChangeDecision(change.id, "accept"), className: "flex-1 rounded border border-emerald-400 bg-white px-2 py-1 text-[10px] font-bold text-emerald-800 hover:bg-emerald-50" }, "Accept"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => applyTrackedChangeDecision(change.id, "reject"), className: "flex-1 rounded border border-red-300 bg-white px-2 py-1 text-[10px] font-bold text-red-700 hover:bg-red-50" }, "Reject")));
    }) : /* @__PURE__ */ React.createElement("div", { className: "rounded border border-dashed border-violet-300 bg-violet-50 px-3 py-4 text-center text-[11px] text-violet-900" }, /* @__PURE__ */ React.createElement("p", null, trackedChanges.length ? "No changes match the current filters." : "No pending changes."), trackedChanges.length > 0 && /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => {
      setTrackedChangeTypeFilter("all");
      setTrackedChangeAuthorFilter("all");
      setTrackedChangeDateFilter("all");
    }, className: "mt-2 rounded border border-violet-400 bg-white px-2.5 py-1.5 font-bold text-violet-800 hover:bg-violet-100" }, "Clear filters"), !trackChangesEnabled && !trackedChanges.length && /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => toggleTrackChanges(true), className: "mt-2 rounded bg-violet-700 px-2.5 py-1.5 font-bold text-white hover:bg-violet-800" }, "Turn on Track Changes"))), !!trackedChanges.length && /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-1 border-t border-slate-200 bg-slate-50 p-2" }, /* @__PURE__ */ React.createElement("button", { type: "button", disabled: !selectedVisibleTrackedChanges.length, onClick: () => applySelectedTrackedChanges("accept"), className: "rounded border border-emerald-500 bg-white px-2 py-1.5 text-[9px] font-bold text-emerald-800 hover:bg-emerald-50 disabled:opacity-40" }, "Accept selected (", selectedVisibleTrackedChanges.length, ")"), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: !selectedVisibleTrackedChanges.length, onClick: () => applySelectedTrackedChanges("reject"), className: "rounded border border-red-400 bg-white px-2 py-1.5 text-[9px] font-bold text-red-700 hover:bg-red-50 disabled:opacity-40" }, "Reject selected (", selectedVisibleTrackedChanges.length, ")"), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: !visibleTrackedChanges.length, onClick: () => applyAllTrackedChanges("accept"), className: "rounded border border-emerald-500 bg-white px-2 py-1.5 text-[9px] font-bold text-emerald-800 hover:bg-emerald-50 disabled:opacity-40" }, "Accept visible (", visibleTrackedChanges.length, ")"), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: !visibleTrackedChanges.length, onClick: () => applyAllTrackedChanges("reject"), className: "rounded border border-red-400 bg-white px-2 py-1.5 text-[9px] font-bold text-red-700 hover:bg-red-50 disabled:opacity-40" }, "Reject visible (", visibleTrackedChanges.length, ")"))) : navigationPaneTab === "comments" ? /* @__PURE__ */ React.createElement("section", { id: "builder-navigation-panel-comments", role: "tabpanel", "aria-labelledby": "builder-navigation-tab-comments", "aria-label": "Document comments", className: "flex min-h-0 flex-1 flex-col" }, /* @__PURE__ */ React.createElement("div", { className: "space-y-2 border-b border-slate-200 bg-amber-50 px-2 py-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2" }, /* @__PURE__ */ React.createElement("button", { type: "button", onMouseDown: (event) => event.preventDefault(), onClick: addReviewComment, "aria-keyshortcuts": "Control+Alt+M", className: "h-8 rounded bg-amber-600 px-2.5 text-[11px] font-bold text-white hover:bg-amber-700" }, "New comment"), /* @__PURE__ */ React.createElement("label", { className: "ml-auto inline-flex cursor-pointer items-center gap-1 text-[10px] font-semibold text-amber-900" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: showResolvedComments, onChange: (event) => setShowResolvedComments(event.target.checked), className: "accent-amber-700" }), "Show resolved")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-1" }, /* @__PURE__ */ React.createElement("label", { className: "text-[9px] font-bold uppercase tracking-wide text-amber-900" }, "Posting as", /* @__PURE__ */ React.createElement("input", { value: reviewerName, maxLength: 80, onChange: (event) => setReviewerName(event.target.value.slice(0, 80)), onBlur: () => setReviewerName((value) => _builderNormalizeReviewerName(value, "You")), className: "mt-0.5 h-7 w-full rounded border border-amber-300 bg-white px-2 text-[10px] font-medium normal-case tracking-normal text-slate-800", "aria-label": "Reviewer name for comments" })), /* @__PURE__ */ React.createElement("label", { className: "text-[9px] font-bold uppercase tracking-wide text-amber-900" }, "Reviewer", /* @__PURE__ */ React.createElement("select", { value: commentAuthorFilter, onChange: (event) => setCommentAuthorFilter(event.target.value), className: "mt-0.5 h-7 w-full rounded border border-amber-300 bg-white px-1 text-[10px] font-semibold normal-case tracking-normal text-slate-700", "aria-label": "Filter comments by reviewer" }, /* @__PURE__ */ React.createElement("option", { value: "all" }, "Everyone"), reviewCommentAuthors.map((author) => /* @__PURE__ */ React.createElement("option", { key: author, value: author }, author))))), /* @__PURE__ */ React.createElement("p", { className: "text-[9px] text-amber-800" }, visibleReviewComments.length, " shown \xB7 ", unresolvedReviewCommentCount, " open \xB7 replies automatically reopen resolved threads")), /* @__PURE__ */ React.createElement("div", { className: "min-h-0 flex-1 space-y-2 overflow-y-auto p-2", "aria-live": "polite" }, reviewComments.length ? visibleReviewComments.length ? visibleReviewComments.map((comment) => {
      const active = activeCommentId === comment.id;
      const topicIdentity = _builderReviewerIdentity(comment.thread[0]?.author);
      return /* @__PURE__ */ React.createElement("article", { key: comment.id, id: `builder-comment-${comment.id}`, "aria-labelledby": `builder-comment-title-${comment.id}`, className: `rounded-lg border p-2 shadow-sm ${active ? "border-amber-500 bg-amber-50 ring-2 ring-amber-200" : comment.resolved ? "border-slate-200 bg-slate-50" : "border-amber-200 bg-white"}`, style: { borderLeftColor: topicIdentity.accent, borderLeftWidth: 4 } }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-black", style: { backgroundColor: topicIdentity.soft, color: topicIdentity.ink, border: "1px solid " + topicIdentity.accent }, "aria-hidden": "true" }, topicIdentity.initials), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => jumpToReviewComment(comment.id), "aria-current": active ? "location" : void 0, "aria-label": `Go to commented text: ${comment.quote}`, className: "min-w-0 flex-1 rounded px-1 py-1 text-left hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-600" }, /* @__PURE__ */ React.createElement("h3", { id: `builder-comment-title-${comment.id}`, className: "text-[9px] font-black uppercase tracking-wider text-amber-800" }, comment.resolved ? "Resolved comment" : `Comment ${comment.index + 1}`, " \xB7 ", comment.thread.length, " message", comment.thread.length === 1 ? "" : "s"), /* @__PURE__ */ React.createElement("blockquote", { className: "mt-0.5 line-clamp-3 break-words text-[11px] font-semibold text-slate-700" }, '"', comment.quote, '"')), /* @__PURE__ */ React.createElement("span", { className: `shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${comment.resolved ? "bg-slate-200 text-slate-600" : "bg-amber-100 text-amber-800"}` }, comment.resolved ? "Resolved" : "Open")), /* @__PURE__ */ React.createElement("ol", { className: "mt-2 space-y-1.5" }, comment.thread.map((message, messageIndex) => {
        const identity = _builderReviewerIdentity(message.author);
        return /* @__PURE__ */ React.createElement("li", { key: message.id + "-" + messageIndex, className: "rounded border border-slate-200 bg-white px-2 py-1.5", style: { borderLeftColor: identity.accent, borderLeftWidth: 3 } }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement("span", { className: "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[8px] font-black", style: { backgroundColor: identity.soft, color: identity.ink, border: "1px solid " + identity.accent }, "aria-hidden": "true" }, identity.initials), /* @__PURE__ */ React.createElement("strong", { className: "min-w-0 flex-1 truncate text-[10px]", style: { color: identity.ink } }, identity.name), /* @__PURE__ */ React.createElement("span", { className: "text-[8px] font-black uppercase tracking-wide text-slate-400" }, messageIndex === 0 ? "Topic" : `Reply ${messageIndex}`)), /* @__PURE__ */ React.createElement("p", { className: "mt-1 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-slate-700" }, message.text), /* @__PURE__ */ React.createElement("time", { className: "mt-1 block text-right text-[8px] font-medium text-slate-400", dateTime: message.at || void 0 }, message.at && !Number.isNaN(Date.parse(message.at)) ? new Date(message.at).toLocaleString() : "Recently"));
      })), replyingCommentId === comment.id && /* @__PURE__ */ React.createElement("form", { className: "mt-2 rounded border border-amber-300 bg-amber-50 p-2", onSubmit: (event) => {
        event.preventDefault();
        submitReviewCommentReply(comment.id);
      } }, /* @__PURE__ */ React.createElement("label", { className: "text-[9px] font-black uppercase tracking-wide text-amber-900", htmlFor: `builder-comment-reply-${comment.id}` }, "Reply as ", _builderNormalizeReviewerName(reviewerName, "You")), /* @__PURE__ */ React.createElement("textarea", { id: `builder-comment-reply-${comment.id}`, value: commentReplyDraft, maxLength: 1200, rows: 3, onChange: (event) => setCommentReplyDraft(event.target.value.slice(0, 1200)), className: "mt-1 w-full resize-y rounded border border-amber-300 bg-white p-2 text-[11px] leading-relaxed text-slate-800", placeholder: "Write a reply\u2026" }), /* @__PURE__ */ React.createElement("div", { className: "mt-1 flex items-center gap-1" }, /* @__PURE__ */ React.createElement("span", { className: "text-[8px] text-slate-500" }, commentReplyDraft.length, "/1200"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => {
        setReplyingCommentId("");
        setCommentReplyDraft("");
      }, className: "ml-auto rounded px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-200" }, "Cancel"), /* @__PURE__ */ React.createElement("button", { type: "submit", disabled: !_builderNormalizeCommentMessage(commentReplyDraft), className: "rounded bg-amber-700 px-2 py-1 text-[10px] font-bold text-white hover:bg-amber-800 disabled:opacity-40" }, "Post reply"))), /* @__PURE__ */ React.createElement("div", { className: "mt-2 flex flex-wrap gap-1" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => replyReviewComment(comment.id), "aria-expanded": replyingCommentId === comment.id, "aria-controls": `builder-comment-reply-${comment.id}`, className: "rounded border border-amber-400 bg-white px-2 py-1 text-[10px] font-bold text-amber-800 hover:bg-amber-50" }, replyingCommentId === comment.id ? "Cancel reply" : "Reply"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => editReviewComment(comment.id), className: "rounded border border-slate-300 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-50" }, "Edit topic"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => toggleReviewCommentResolved(comment.id), className: "rounded border border-slate-300 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-50" }, comment.resolved ? "Reopen" : "Resolve"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => deleteReviewComment(comment.id), className: "ml-auto rounded px-2 py-1 text-[10px] font-bold text-red-700 hover:bg-red-50" }, "Delete")));
    }) : /* @__PURE__ */ React.createElement("div", { className: "rounded border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-center text-[11px] text-slate-600" }, /* @__PURE__ */ React.createElement("p", null, commentAuthorFilter !== "all" ? "No comments match this reviewer." : "All comments are resolved."), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => {
      setCommentAuthorFilter("all");
      setShowResolvedComments(true);
    }, className: "mt-2 rounded border border-amber-400 bg-white px-2 py-1 font-bold text-amber-800 hover:bg-amber-50" }, "Show all comments")) : /* @__PURE__ */ React.createElement("p", { className: "rounded border border-dashed border-amber-300 bg-amber-50 px-3 py-4 text-center text-[11px] text-amber-900" }, "Select text in the document, then choose ", /* @__PURE__ */ React.createElement("strong", null, "New comment"), " or press Ctrl+Alt+M."))) : navigationPaneTab === "sections" ? /* @__PURE__ */ React.createElement("nav", { id: "builder-navigation-panel-sections", role: "tabpanel", "aria-labelledby": "builder-navigation-tab-sections", "aria-label": "Document section navigation", className: "min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2" }, pageMetrics.documentSections.map((section) => {
      const active = pageMetrics.activeSection === section.index;
      return /* @__PURE__ */ React.createElement("button", { key: section.id, type: "button", onClick: () => jumpToDocumentSection(section.index), "aria-current": active ? "location" : void 0, className: `block w-full rounded-md border px-2.5 py-2 text-left transition-colors ${active ? "border-violet-300 bg-violet-100 text-violet-900 ring-1 ring-violet-300" : "border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50"}` }, /* @__PURE__ */ React.createElement("span", { className: "flex items-center justify-between gap-2 text-[9px] font-black uppercase tracking-wider" }, /* @__PURE__ */ React.createElement("span", null, "Section ", section.index + 1), /* @__PURE__ */ React.createElement("span", null, "Page ", section.page + 1)), /* @__PURE__ */ React.createElement("span", { className: "mt-0.5 block truncate text-[11px] font-bold", title: section.name }, section.name), /* @__PURE__ */ React.createElement("span", { className: "mt-0.5 block text-[9px] text-slate-500" }, section.startType === "document" ? "Document start" : section.startType === "continuous" ? "Continues on same page" : "Starts on next page"));
    })) : /* @__PURE__ */ React.createElement("nav", { id: "builder-navigation-panel-pages", role: "tabpanel", "aria-labelledby": "builder-navigation-tab-pages", "aria-label": "Page thumbnails", className: "min-h-0 flex-1 space-y-2 overflow-y-auto p-2" }, Array.from({ length: pageMetrics.count }, (_, pageIndex) => {
      const pageHeadings = pageMetrics.sections.filter((section) => section.page === pageIndex);
      const pageDocumentSections = pageMetrics.documentSections.filter((section) => section.page === pageIndex);
      const active = pageMetrics.active === pageIndex;
      return /* @__PURE__ */ React.createElement("button", { key: pageIndex, type: "button", onClick: () => jumpToPage(pageIndex), "aria-current": active ? "page" : void 0, "aria-label": `Go to page ${pageIndex + 1}${pageDocumentSections[0] ? `, ${pageDocumentSections[0].name}` : pageHeadings[0] ? `: ${pageHeadings[0].text}` : ""}`, className: `mx-auto block w-full max-w-28 rounded-md p-1 text-left transition-colors ${active ? "bg-indigo-100 ring-2 ring-indigo-500" : "bg-transparent hover:bg-slate-50 hover:shadow-sm"}` }, /* @__PURE__ */ React.createElement("span", { className: `block text-center text-[9px] font-bold ${active ? "text-indigo-800" : "text-slate-500"}` }, "Page ", pageIndex + 1), /* @__PURE__ */ React.createElement("span", { className: "relative mt-1 block overflow-hidden rounded border border-slate-300 bg-white shadow-sm", style: { aspectRatio: `${_builderPageDimensions(pageSetup).width} / ${_builderPageDimensions(pageSetup).height}` } }, /* @__PURE__ */ React.createElement("span", { className: "absolute inset-2 space-y-1" }, pageDocumentSections.slice(0, 2).map((section) => /* @__PURE__ */ React.createElement("span", { key: section.id, className: `block truncate text-[6px] font-black leading-tight ${section.startType === "continuous" ? "text-teal-700" : "text-violet-700"}` }, "\xA7", section.index + 1, " ", section.name)), /* @__PURE__ */ React.createElement("span", { className: "block h-1 w-3/4 rounded bg-slate-300" }), pageHeadings.slice(0, 3).map((section) => /* @__PURE__ */ React.createElement("span", { key: section.index, className: `block truncate text-[6px] font-bold leading-tight ${section.level === 1 ? "text-indigo-700" : "text-slate-500"}` }, section.text)), /* @__PURE__ */ React.createElement("span", { className: "block h-px w-full bg-slate-200" }), /* @__PURE__ */ React.createElement("span", { className: "block h-px w-5/6 bg-slate-200" }), /* @__PURE__ */ React.createElement("span", { className: "block h-px w-2/3 bg-slate-200" }))));
    })), /* @__PURE__ */ React.createElement(
      "div",
      {
        role: "separator",
        "aria-orientation": "vertical",
        "aria-label": "Resize document navigation",
        "aria-valuemin": 180,
        "aria-valuemax": 420,
        "aria-valuenow": navigationPaneWidth,
        tabIndex: 0,
        onKeyDown: (event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            setNavigationPaneWidth((width) => Math.max(180, Math.min(420, width + (event.key === "ArrowRight" ? 16 : -16))));
          }
        },
        onPointerDown: (event) => {
          event.preventDefault();
          const startX = event.clientX;
          const startWidth = navigationPaneWidth;
          const onMove = (moveEvent) => setNavigationPaneWidth(Math.max(180, Math.min(420, startWidth + moveEvent.clientX - startX)));
          const onUp = () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            window.removeEventListener("pointercancel", onUp);
          };
          window.addEventListener("pointermove", onMove);
          window.addEventListener("pointerup", onUp, { once: true });
          window.addEventListener("pointercancel", onUp, { once: true });
        },
        className: "absolute inset-y-0 right-0 w-2 cursor-col-resize bg-transparent hover:bg-indigo-300 focus:bg-indigo-300 focus:outline-none",
        title: "Drag or use arrow keys to resize navigation"
      }
    )), "                  ", /* @__PURE__ */ React.createElement("div", { className: "min-w-0 flex-1 overflow-hidden bg-slate-100 p-4" }, /* @__PURE__ */ React.createElement(
      "iframe",
      {
        id: "document-builder-preview",
        ref: exportPreviewRef,
        title: "Editable document preview",
        className: "w-full h-full bg-white rounded-lg shadow-inner border border-slate-400",
        sandbox: exportPreviewSource === "remediation" ? "allow-same-origin" : "allow-same-origin allow-scripts allow-forms",
        onLoad: () => {
          console.info("[ExportPreview] iframe loaded");
          try {
            const doc = exportPreviewRef.current?.contentDocument;
            if (!doc || doc.__alloPasteGuard) return;
            doc.__alloPasteGuard = true;
            syncPageSetupFromDocument();
            syncPageElementsFromDocument();
            refreshDocumentStats();
            refreshReviewComments();
            refreshTrackedChanges();
            refreshActiveHeading();
            refreshPageMetrics();
            applyEditorZoom(editorZoom);
            if (advancedReviewActiveRef.current) refreshAdvancedReviewTree(doc);
            setDraftCaptureState("ready");
            editorSelectionRangeRef.current = null;
            formatPainterRef.current = null;
            setFormatPainterActive(false);
            const _rememberSelection = () => {
              try {
                const selection = doc.getSelection?.();
                if (selection?.rangeCount) editorSelectionRangeRef.current = selection.getRangeAt(0).cloneRange();
              } catch (_) {
              }
              refreshFormattingState();
              refreshTableContext();
              refreshPageMetrics();
              refreshSelectionStatistics();
              refreshActiveReviewComment();
              refreshActiveTrackedChange();
            };
            const _syncFormatting = () => refreshFormattingState();
            const _syncActiveHeading = () => refreshActiveHeading();
            const _syncPageMetrics = () => {
              refreshActiveHeading();
              refreshPageMetrics();
            };
            const _activateReviewMarker = (event) => {
              try {
                const hostDoc = window.parent && window.parent.document;
                const commentMarker = event.target?.closest?.(_BUILDER_COMMENT_SELECTOR);
                const commentId = commentMarker?.getAttribute?.("data-allo-comment-id") || "";
                if (commentId) {
                  setActiveCommentId(commentId);
                  hostDoc?.dispatchEvent(new window.parent.CustomEvent("alloflow-builder-activate-comment", { detail: { id: commentId } }));
                }
                const changeMarker = event.target?.closest?.(_BUILDER_CHANGE_SELECTOR);
                const changeId = changeMarker?.getAttribute?.("data-allo-change-id") || "";
                if (changeId) {
                  setActiveTrackedChangeId(changeId);
                  hostDoc?.dispatchEvent(new window.parent.CustomEvent("alloflow-builder-activate-change", { detail: { id: changeId } }));
                }
                const citationField = event.target?.closest?.(_BUILDER_CITATION_SELECTOR);
                const citationId = citationField?.getAttribute?.("data-allo-citation-id") || "";
                if (citationId && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
                  event.preventDefault();
                  hostDoc?.dispatchEvent(new window.parent.CustomEvent("alloflow-builder-edit-citation", { detail: { id: citationId } }));
                }
              } catch (_) {
              }
            };
            doc.addEventListener("selectionchange", _rememberSelection);
            doc.addEventListener("click", _activateReviewMarker);
            doc.addEventListener("keyup", _syncFormatting);
            doc.addEventListener("mouseup", _syncFormatting);
            doc.addEventListener("scroll", _syncPageMetrics, true);
            doc.defaultView?.addEventListener("scroll", _syncPageMetrics, { passive: true });
            window.setTimeout(_syncFormatting, 0);
            const _sanitizeFragment = (html) => {
              try {
                const p = new DOMParser().parseFromString("<body>" + String(html || "") + "</body>", "text/html");
                p.querySelectorAll("script,style,iframe,object,embed,link,meta,base,form").forEach((el) => el.remove());
                p.querySelectorAll("*").forEach((el) => {
                  for (const a of Array.from(el.attributes)) {
                    const n = a.name.toLowerCase(), v = String(a.value || "");
                    if (n.startsWith("on")) el.removeAttribute(a.name);
                    else if ((n === "href" || n === "src" || n === "xlink:href" || n === "formaction" || n === "action") && /^\s*(javascript|vbscript|data)\s*:/i.test(v) && !/^\s*data:image\/(png|jpe?g|gif|webp)/i.test(v)) el.removeAttribute(a.name);
                  }
                });
                return p.body.innerHTML;
              } catch (_) {
                return String(html || "").replace(/</g, "&lt;");
              }
            };
            const _insertSanitized = (e, dt) => {
              const html = dt && dt.getData && dt.getData("text/html");
              const plain = dt && dt.getData && dt.getData("text/plain");
              if (doc.body?.getAttribute("data-allo-track-changes") === "1") {
                let value = String(plain || "");
                if (!value && html) {
                  try {
                    value = new DOMParser().parseFromString("<body>" + _sanitizeFragment(html) + "</body>", "text/html").body.textContent || "";
                  } catch (_) {
                  }
                }
                if (!value) {
                  if (html) {
                    e.preventDefault();
                    try {
                      doc.execCommand("insertHTML", false, _sanitizeFragment(html));
                    } catch (_) {
                    }
                  }
                  return;
                }
                e.preventDefault();
                const result = _builderTrackTextInsertion(doc, value);
                if (!result.ok && result.error) {
                  const hostDoc = window.parent && window.parent.document;
                  hostDoc?.dispatchEvent(new window.parent.CustomEvent("alloflow-builder-track-changes-info", { detail: { message: result.error } }));
                }
                return;
              }
              if (!html) return;
              e.preventDefault();
              try {
                doc.execCommand("insertHTML", false, _sanitizeFragment(html));
              } catch (_) {
              }
            };
            doc.addEventListener("paste", (e) => {
              try {
                _insertSanitized(e, e.clipboardData);
              } catch (_) {
              }
            }, true);
            doc.addEventListener("drop", (e) => {
              try {
                _insertSanitized(e, e.dataTransfer);
              } catch (_) {
              }
            }, true);
            doc.addEventListener("beforeinput", (event) => {
              try {
                if (doc.body?.getAttribute("data-allo-tracked-view") === "original") {
                  _builderSetTrackedMarkupView(doc, "all");
                  const hostDoc = window.parent && window.parent.document;
                  hostDoc?.dispatchEvent(new window.parent.CustomEvent("alloflow-builder-markup-view", { detail: { view: "all" } }));
                }
                const result = _builderHandleTrackedBeforeInput(doc, event);
                if (result.blocked && result.error) {
                  const hostDoc = window.parent && window.parent.document;
                  hostDoc?.dispatchEvent(new window.parent.CustomEvent("alloflow-builder-track-changes-info", { detail: { message: result.error } }));
                }
              } catch (_) {
              }
            }, true);
            let _capT = null;
            const _captureEdits = () => {
              try {
                const capturedAt = Date.now();
                const liveHtml = "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
                const clean = getCleanBuilderDocument();
                const fullHtml = clean?.html || liveHtml;
                window.__alloBuilderEditedPack = { html: fullHtml, at: capturedAt };
                const savedLocally = persistLocalDraft(fullHtml, capturedAt, "Auto-save");
                if (mountedRef.current) {
                  setDraftCaptureState(savedLocally ? "saved" : "captured");
                }
              } catch (_) {
              }
            };
            doc.addEventListener("input", () => {
              try {
                _builderRefreshAdvancedAfterSnapshots(doc);
                if (doc.body) doc.body.setAttribute("data-allo-user-edited", "1");
                noteAdvancedReviewManualInput(doc);
                if (mountedRef.current) setDraftCaptureState("capturing");
                refreshFormattingState();
                writingCheckRunRef.current += 1;
                auditRunRef.current += 1;
                expertRunRef.current += 1;
                if (mountedRef.current) {
                  setWritingCheck(null);
                  setExportAuditResult(null);
                  setExportAuditLoading(false);
                }
                refreshDocumentStats();
                refreshReviewComments();
                refreshTrackedChanges();
                refreshActiveHeading();
                refreshPageMetrics();
                refreshTableContext();
                setFindDocumentRevision((value) => value + 1);
                if (_capT) clearTimeout(_capT);
                _capT = setTimeout(_captureEdits, 800);
              } catch (_) {
              }
            }, true);
          } catch (_) {
          }
        }
      }
    )), isAdvancedReview && /* @__PURE__ */ React.createElement("aside", { id: "document-builder-advanced-review", role: "complementary", "aria-labelledby": "advanced-review-heading", className: "flex w-[22rem] max-w-[44vw] shrink-0 flex-col border-l border-slate-300 bg-white" }, /* @__PURE__ */ React.createElement("div", { className: "border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-sky-50 px-3 py-2.5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between gap-2" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { id: "advanced-review-heading", className: "text-xs font-black text-slate-900" }, "Advanced Review"), /* @__PURE__ */ React.createElement("p", { className: "mt-0.5 text-[9px] leading-snug text-slate-600" }, "Specialist review of the remediated HTML structure used by AlloFlow exports. This is not a native arbitrary-PDF tag editor.")), /* @__PURE__ */ React.createElement("span", { role: "status", className: `shrink-0 rounded-full px-2 py-1 text-[9px] font-black ${advancedReviewEvidenceStale ? "bg-amber-100 text-amber-900 ring-1 ring-amber-300" : "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300"}` }, advancedReviewEvidenceStale ? "Reverify" : "Evidence current"))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-5 border-b border-slate-200 bg-slate-50", role: "tablist", "aria-label": "Advanced Review tools" }, [
      ["structure", "Structure"],
      ["issues", "Issues"],
      ["properties", "Properties"],
      ["history", "History"],
      ["compare", "Compare"]
    ].map(([tabId, label]) => /* @__PURE__ */ React.createElement("button", { key: tabId, id: `advanced-review-tab-${tabId}`, type: "button", role: "tab", "aria-selected": advancedReviewTab === tabId, "aria-controls": `advanced-review-panel-${tabId}`, tabIndex: advancedReviewTab === tabId ? 0 : -1, onClick: () => setAdvancedReviewTab(tabId), className: `min-h-10 border-b-2 px-1 text-[9px] font-bold ${advancedReviewTab === tabId ? "border-indigo-700 bg-white text-indigo-800" : "border-transparent text-slate-600 hover:bg-white hover:text-slate-900"}` }, label, tabId === "issues" && advancedReviewIssues.length ? ` (${advancedReviewIssues.length})` : ""))), /* @__PURE__ */ React.createElement("div", { className: "min-h-0 flex-1 overflow-y-auto" }, advancedReviewTab === "structure" && /* @__PURE__ */ React.createElement("section", { id: "advanced-review-panel-structure", role: "tabpanel", "aria-labelledby": "advanced-review-tab-structure", className: "p-2.5" }, /* @__PURE__ */ React.createElement("div", { className: "mb-2 flex items-center justify-between gap-2" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-[10px] font-black uppercase tracking-wide text-slate-700" }, "Semantic structure"), /* @__PURE__ */ React.createElement("div", { className: "text-[9px] text-slate-500" }, advancedReviewTree.flat.length, " tagged source node", advancedReviewTree.flat.length === 1 ? "" : "s")), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => refreshAdvancedReviewTree(), className: "min-h-8 rounded border border-slate-300 bg-white px-2 text-[9px] font-bold text-slate-700 hover:bg-slate-50" }, "Refresh")), advancedReviewTreeError && /* @__PURE__ */ React.createElement("p", { role: "alert", className: "mb-2 rounded border border-amber-300 bg-amber-50 p-2 text-[10px] font-semibold text-amber-900" }, advancedReviewTreeError), advancedReviewTree.truncated && /* @__PURE__ */ React.createElement("p", { className: "mb-2 rounded bg-amber-50 p-2 text-[9px] text-amber-900" }, "The outline is capped for responsiveness."), /* @__PURE__ */ React.createElement("div", { role: "tree", "aria-label": "Document semantic structure", className: "space-y-0.5" }, advancedReviewOutline.map(({ node, depth }) => /* @__PURE__ */ React.createElement("button", { key: node.id, type: "button", role: "treeitem", "aria-selected": advancedReviewSelectedId === node.id, "aria-level": depth + 1, onClick: () => selectAdvancedReviewNode(node.id), onDoubleClick: () => {
      selectAdvancedReviewNode(node.id);
      setAdvancedReviewTab("properties");
    }, style: { paddingLeft: Math.min(48, 6 + depth * 12) }, className: `flex min-h-8 w-full items-center gap-1.5 rounded pr-2 text-left text-[10px] ${advancedReviewSelectedId === node.id ? "bg-sky-100 text-sky-950 ring-1 ring-sky-400" : "text-slate-700 hover:bg-slate-100"}` }, /* @__PURE__ */ React.createElement("span", { className: "w-9 shrink-0 rounded bg-slate-200 px-1 py-0.5 text-center font-black text-slate-700" }, node.role), /* @__PURE__ */ React.createElement("span", { className: "min-w-0 flex-1 truncate" }, node.text || "(empty)"), node.warnings?.length > 0 && /* @__PURE__ */ React.createElement("span", { className: "h-2 w-2 shrink-0 rounded-full bg-amber-500", "aria-label": `${node.warnings.length} warning${node.warnings.length === 1 ? "" : "s"}`, title: node.warnings.join("; ") }))), !advancedReviewOutline.length && !advancedReviewTreeError && /* @__PURE__ */ React.createElement("p", { className: "rounded bg-slate-50 p-3 text-center text-[10px] text-slate-500" }, "No semantic source nodes found.")), /* @__PURE__ */ React.createElement("p", { className: "mt-3 text-[9px] leading-snug text-slate-500" }, "Select a node to highlight it in the preview. Double-click to open its properties.")), advancedReviewTab === "issues" && /* @__PURE__ */ React.createElement("section", { id: "advanced-review-panel-issues", role: "tabpanel", "aria-labelledby": "advanced-review-tab-issues", className: "p-2.5" }, advancedReviewEvidenceStale && /* @__PURE__ */ React.createElement("div", { role: "status", className: "mb-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-[10px] leading-snug text-amber-950" }, /* @__PURE__ */ React.createElement("strong", null, "Content changed."), " Findings from the prior remediation run no longer prove the edited version. Run the Builder audit for quick HTML feedback, then reverify through the remediation pipeline before claiming a verified result."), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: runAdvancedReviewBuilderAudit, disabled: exportAuditLoading, "aria-busy": exportAuditLoading, className: "mb-3 min-h-9 w-full rounded-lg bg-indigo-700 px-3 text-[10px] font-bold text-white hover:bg-indigo-800 disabled:cursor-wait disabled:opacity-60" }, exportAuditLoading ? "Running Builder audit..." : "Run Builder HTML audit"), /* @__PURE__ */ React.createElement("p", { className: "mb-2 text-[9px] leading-snug text-slate-500" }, "This in-editor audit is a useful review aid; it does not replace final tagged-PDF verification."), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, advancedReviewIssues.map((issue) => /* @__PURE__ */ React.createElement("article", { key: issue.source + "-" + issue.id, className: "rounded-lg border border-slate-200 bg-white p-2 shadow-sm" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between gap-2" }, /* @__PURE__ */ React.createElement("h4", { className: "text-[10px] font-black text-slate-800" }, issue.title), /* @__PURE__ */ React.createElement("span", { className: `rounded px-1.5 py-0.5 text-[8px] font-bold uppercase ${["critical", "serious", "high"].includes(issue.severity) ? "bg-red-100 text-red-800" : ["moderate", "medium"].includes(issue.severity) ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700"}` }, issue.severity)), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-[9px] leading-snug text-slate-600" }, issue.message), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-[8px] font-bold uppercase tracking-wide text-slate-400" }, issue.source))), !advancedReviewIssues.length && /* @__PURE__ */ React.createElement("div", { className: "rounded-lg border border-slate-200 bg-slate-50 p-3 text-center text-[10px] text-slate-600" }, "No findings are available in the current review data. Run the Builder audit for this HTML version."))), advancedReviewTab === "properties" && /* @__PURE__ */ React.createElement("section", { id: "advanced-review-panel-properties", role: "tabpanel", "aria-labelledby": "advanced-review-tab-properties", className: "space-y-3 p-2.5" }, advancedReviewSelectedNode ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "rounded-lg border border-sky-200 bg-sky-50 p-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "rounded bg-sky-700 px-1.5 py-0.5 text-[9px] font-black text-white" }, advancedReviewSelectedNode.role), /* @__PURE__ */ React.createElement("strong", { className: "min-w-0 flex-1 truncate text-[10px] text-slate-900" }, advancedReviewSelectedNode.text || "(empty node)")), /* @__PURE__ */ React.createElement("code", { className: "mt-1 block truncate text-[8px] text-slate-500" }, advancedReviewSelectedNode.id)), ["p", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote"].includes(advancedReviewSelectedNode.tag) && /* @__PURE__ */ React.createElement("label", { className: "block text-[9px] font-black uppercase tracking-wide text-slate-600" }, "Semantic role", /* @__PURE__ */ React.createElement("select", { value: advancedReviewSelectedNode.tag, onChange: (event) => applyAdvancedReviewCommand({ type: "retag", nodeId: advancedReviewSelectedNode.id, tag: event.target.value }), className: "mt-1 min-h-9 w-full rounded border border-slate-300 bg-white px-2 text-[11px] font-semibold normal-case text-slate-900" }, /* @__PURE__ */ React.createElement("option", { value: "p" }, "Paragraph"), /* @__PURE__ */ React.createElement("option", { value: "h1" }, "Heading 1"), /* @__PURE__ */ React.createElement("option", { value: "h2" }, "Heading 2"), /* @__PURE__ */ React.createElement("option", { value: "h3" }, "Heading 3"), /* @__PURE__ */ React.createElement("option", { value: "h4" }, "Heading 4"), /* @__PURE__ */ React.createElement("option", { value: "h5" }, "Heading 5"), /* @__PURE__ */ React.createElement("option", { value: "h6" }, "Heading 6"), /* @__PURE__ */ React.createElement("option", { value: "blockquote" }, "Block quote"))), /* @__PURE__ */ React.createElement("fieldset", null, /* @__PURE__ */ React.createElement("legend", { className: "text-[9px] font-black uppercase tracking-wide text-slate-600" }, "Reading order"), /* @__PURE__ */ React.createElement("div", { className: "mt-1 grid grid-cols-2 gap-2" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => applyAdvancedReviewCommand({ type: "move", nodeId: advancedReviewSelectedNode.id, direction: "up" }), className: "min-h-9 rounded border border-slate-300 bg-white text-[10px] font-bold text-slate-700 hover:bg-slate-50" }, "Move earlier"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => applyAdvancedReviewCommand({ type: "move", nodeId: advancedReviewSelectedNode.id, direction: "down" }), className: "min-h-9 rounded border border-slate-300 bg-white text-[10px] font-bold text-slate-700 hover:bg-slate-50" }, "Move later"))), ["img", "figure"].includes(advancedReviewSelectedNode.tag) && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("label", { className: "block text-[9px] font-black uppercase tracking-wide text-slate-600" }, "Alternative text", /* @__PURE__ */ React.createElement("textarea", { rows: 3, value: advancedReviewAltDraft, onChange: (event) => setAdvancedReviewAltDraft(event.target.value), className: "mt-1 w-full rounded border border-slate-300 p-2 text-[10px] font-medium normal-case text-slate-900" })), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => applyAdvancedReviewCommand({ type: "set-alt", nodeId: advancedReviewSelectedNode.id, alt: advancedReviewAltDraft }), className: "min-h-9 w-full rounded bg-sky-700 px-2 text-[10px] font-bold text-white hover:bg-sky-800" }, "Apply alternative text"), /* @__PURE__ */ React.createElement("label", { className: "flex min-h-10 cursor-pointer items-center gap-2 rounded border border-slate-300 px-2 text-[10px] font-semibold text-slate-800" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: Boolean(advancedReviewSelectedNode.properties?.artifact), onChange: (event) => applyAdvancedReviewCommand({ type: "set-artifact", nodeId: advancedReviewSelectedNode.id, artifact: event.target.checked }) }), "Artifact / decorative image")), advancedReviewSelectedNode.tag === "table" && /* @__PURE__ */ React.createElement("fieldset", null, /* @__PURE__ */ React.createElement("legend", { className: "text-[9px] font-black uppercase tracking-wide text-slate-600" }, "Table headers"), /* @__PURE__ */ React.createElement("div", { className: "mt-1 grid grid-cols-3 gap-1" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => applyAdvancedReviewCommand({ type: "set-table-headers", nodeId: advancedReviewSelectedNode.id, mode: "first-row" }), className: "min-h-10 rounded border border-slate-300 bg-white px-1 text-[9px] font-bold text-slate-700 hover:bg-slate-50" }, "First row"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => applyAdvancedReviewCommand({ type: "set-table-headers", nodeId: advancedReviewSelectedNode.id, mode: "first-column" }), className: "min-h-10 rounded border border-slate-300 bg-white px-1 text-[9px] font-bold text-slate-700 hover:bg-slate-50" }, "First column"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => applyAdvancedReviewCommand({ type: "set-table-headers", nodeId: advancedReviewSelectedNode.id, mode: "both" }), className: "min-h-10 rounded border border-slate-300 bg-white px-1 text-[9px] font-bold text-slate-700 hover:bg-slate-50" }, "Both")))) : /* @__PURE__ */ React.createElement("p", { className: "rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-[10px] leading-snug text-slate-600" }, "Select a node in Structure to edit its role, order, image semantics, language, or table headers."), /* @__PURE__ */ React.createElement("fieldset", { className: "rounded-lg border border-slate-200 p-2" }, /* @__PURE__ */ React.createElement("legend", { className: "px-1 text-[9px] font-black uppercase tracking-wide text-slate-600" }, advancedReviewSelectedNode ? "Selected node language" : "Document language"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-1" }, /* @__PURE__ */ React.createElement("input", { value: advancedReviewLanguageDraft, onChange: (event) => setAdvancedReviewLanguageDraft(event.target.value), placeholder: "en-US", "aria-label": advancedReviewSelectedNode ? "Selected node language" : "Document language", className: "min-h-9 min-w-0 flex-1 rounded border border-slate-300 px-2 text-[10px] text-slate-900" }), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => applyAdvancedReviewCommand({ type: "set-language", nodeId: advancedReviewSelectedNode?.id, language: advancedReviewLanguageDraft }), className: "min-h-9 rounded bg-indigo-700 px-2 text-[9px] font-bold text-white hover:bg-indigo-800" }, "Apply")))), advancedReviewTab === "history" && /* @__PURE__ */ React.createElement("section", { id: "advanced-review-panel-history", role: "tabpanel", "aria-labelledby": "advanced-review-tab-history", className: "p-2.5" }, /* @__PURE__ */ React.createElement("h4", { className: "text-[10px] font-black uppercase tracking-wide text-slate-700" }, "Review ledger"), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-[9px] leading-snug text-slate-500" }, "Only actual content mutations appear here. Opening or inspecting the structure does not invalidate evidence."), /* @__PURE__ */ React.createElement("ol", { className: "mt-3 space-y-2" }, advancedReviewHistory.slice().reverse().map((entry) => /* @__PURE__ */ React.createElement("li", { key: entry.id, className: "rounded-lg border border-slate-200 bg-white p-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between gap-2" }, /* @__PURE__ */ React.createElement("strong", { className: "text-[10px] text-slate-800" }, entry.summary), /* @__PURE__ */ React.createElement("time", { className: "shrink-0 text-[8px] text-slate-400" }, new Date(entry.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))), /* @__PURE__ */ React.createElement("div", { className: "mt-1 text-[8px] uppercase tracking-wide text-slate-500" }, entry.type, entry.targetId ? ` - ${entry.targetId}` : ""))), !advancedReviewHistory.length && /* @__PURE__ */ React.createElement("li", { className: "rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-center text-[10px] text-slate-500" }, "No specialist mutations in this session."))), advancedReviewTab === "compare" && /* @__PURE__ */ React.createElement("section", { id: "advanced-review-panel-compare", role: "tabpanel", "aria-labelledby": "advanced-review-tab-compare", className: "p-2.5" }, /* @__PURE__ */ React.createElement("h4", { className: "text-[10px] font-black uppercase tracking-wide text-slate-700" }, "Session comparison"), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-[9px] leading-snug text-slate-500" }, "Compare the remediation HTML as it entered this session with the current edited HTML. This is not a visual reconstruction of the original PDF."), /* @__PURE__ */ React.createElement("div", { className: "mt-3 space-y-3" }, /* @__PURE__ */ React.createElement("figure", null, /* @__PURE__ */ React.createElement("figcaption", { className: "mb-1 text-[9px] font-black text-slate-700" }, "Session baseline"), /* @__PURE__ */ React.createElement("iframe", { title: "Advanced Review session baseline", sandbox: "", srcDoc: advancedReviewBaselineRef.current, className: "h-52 w-full rounded border border-slate-300 bg-white" })), /* @__PURE__ */ React.createElement("figure", null, /* @__PURE__ */ React.createElement("figcaption", { className: "mb-1 text-[9px] font-black text-slate-700" }, "Current edited HTML"), /* @__PURE__ */ React.createElement("iframe", { title: "Advanced Review current document", sandbox: "", srcDoc: advancedReviewCurrentHtml || advancedReviewBaselineRef.current, className: "h-52 w-full rounded border border-slate-300 bg-white" }))))))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-1.5 text-[11px] text-slate-600 shrink-0", "aria-label": "Document status bar" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-x-3 gap-y-1" }, /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-slate-700" }, isFocusMode ? "Focus mode" : "Editing enabled"), /* @__PURE__ */ React.createElement("span", { role: "status", "aria-live": "polite", className: `inline-flex items-center gap-1 font-medium ${draftCaptureState === "capturing" ? "text-amber-700" : ["saved", "restored", "captured"].includes(draftCaptureState) ? "text-emerald-700" : "text-slate-500"}` }, /* @__PURE__ */ React.createElement("span", { className: `h-1.5 w-1.5 rounded-full ${draftCaptureState === "capturing" ? "bg-amber-500 animate-pulse motion-reduce:animate-none" : ["saved", "restored", "captured"].includes(draftCaptureState) ? "bg-emerald-600" : "bg-slate-400"}`, "aria-hidden": "true" }), draftCaptureState === "capturing" ? "Capturing changes\u2026" : draftCaptureState === "saved" ? "Saved on this device" : draftCaptureState === "restored" ? "Local draft restored" : draftCaptureState === "captured" ? "Draft captured in this session" : "Ready"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => openTrackedChanges(activeTrackedChangeId), "aria-controls": "document-builder-navigation", className: `rounded px-1.5 py-1 font-semibold ${trackChangesEnabled ? "bg-violet-100 text-violet-800 hover:bg-violet-200" : pendingTrackedChangeCount ? "bg-amber-100 text-amber-800 hover:bg-amber-200" : "text-slate-500 hover:bg-slate-200"}`, title: "Open tracked changes review" }, "Track: ", trackChangesEnabled ? "On" : "Off", " \xB7 ", pendingTrackedChangeCount, " change", pendingTrackedChangeCount === 1 ? "" : "s"), /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement("button", { ref: wordCountButtonRef, type: "button", onClick: (event) => showWordCountDetails ? closeWordCountDetails(true) : openWordCountDetails(event), "aria-expanded": showWordCountDetails, "aria-controls": "builder-word-count-panel", "aria-keyshortcuts": "Control+Shift+G", className: "rounded px-1.5 py-1 font-semibold text-slate-700 hover:bg-indigo-100 hover:text-indigo-800", title: "Open detailed Word Count (Ctrl+Shift+G)" }, selectionStatistics.active ? `Words: ${selectionStatistics.words.toLocaleString()} of ${wordCount.toLocaleString()}` : `Words: ${wordCount.toLocaleString()}`), showWordCountDetails && /* @__PURE__ */ React.createElement("section", { ref: wordCountPanelRef, id: "builder-word-count-panel", tabIndex: -1, role: "dialog", "aria-modal": "false", "aria-labelledby": "builder-word-count-title", "aria-describedby": "builder-word-count-description", className: "absolute bottom-full left-0 z-[90] mb-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-300 bg-white p-3 text-slate-700 shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between gap-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h4", { id: "builder-word-count-title", className: "text-sm font-black text-slate-900" }, "Word Count"), /* @__PURE__ */ React.createElement("p", { id: "builder-word-count-description", className: "text-[10px] text-slate-500" }, "Live statistics for this document", selectionStatistics.active ? " and the selected text" : "", ".")), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => closeWordCountDetails(true), className: "min-h-8 rounded px-2 text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800", "aria-label": "Close Word Count details" }, "Close")), /* @__PURE__ */ React.createElement("div", { className: "mt-2 overflow-hidden rounded-lg border border-slate-200" }, /* @__PURE__ */ React.createElement("table", { className: "w-full border-collapse text-[11px]" }, /* @__PURE__ */ React.createElement("caption", { className: "sr-only" }, "Document and selection statistics"), /* @__PURE__ */ React.createElement("thead", { className: "bg-slate-100 text-[9px] font-black uppercase tracking-wider text-slate-500" }, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { scope: "col", className: "px-2 py-1 text-left" }, "Statistic"), /* @__PURE__ */ React.createElement("th", { scope: "col", className: "px-2 py-1 text-right" }, "Document"), selectionStatistics.active && /* @__PURE__ */ React.createElement("th", { scope: "col", className: "px-2 py-1 text-right" }, "Selection"))), /* @__PURE__ */ React.createElement("tbody", null, [
      ["Pages", pageMetrics.count, null],
      ["Words", documentStatistics.words, selectionStatistics.words],
      ["Characters (no spaces)", documentStatistics.charactersWithoutSpaces, selectionStatistics.charactersWithoutSpaces],
      ["Characters (with spaces)", documentStatistics.charactersWithSpaces, selectionStatistics.charactersWithSpaces],
      ["Paragraphs", documentStatistics.paragraphs, selectionStatistics.paragraphs],
      ["Sentences", documentStatistics.sentences, selectionStatistics.sentences]
    ].map(([label, documentValue, selectionValue]) => /* @__PURE__ */ React.createElement("tr", { key: label, className: "border-t border-slate-100" }, /* @__PURE__ */ React.createElement("th", { scope: "row", className: "px-2 py-1 text-left font-semibold text-slate-600" }, label), /* @__PURE__ */ React.createElement("td", { className: "px-2 py-1 text-right tabular-nums" }, Number(documentValue || 0).toLocaleString()), selectionStatistics.active && /* @__PURE__ */ React.createElement("td", { className: "px-2 py-1 text-right tabular-nums" }, selectionValue == null ? /* @__PURE__ */ React.createElement("span", { "aria-label": "Not applicable" }, "\u2014") : Number(selectionValue || 0).toLocaleString())))))), /* @__PURE__ */ React.createElement("dl", { className: "mt-2 grid grid-cols-2 gap-2 text-[10px]" }, /* @__PURE__ */ React.createElement("div", { className: "rounded-lg bg-indigo-50 px-2 py-1.5" }, /* @__PURE__ */ React.createElement("dt", { className: "font-bold text-indigo-800" }, "Reading time"), /* @__PURE__ */ React.createElement("dd", null, documentStatistics.readingMinutes || 0, " min at 225 wpm")), /* @__PURE__ */ React.createElement("div", { className: "rounded-lg bg-violet-50 px-2 py-1.5" }, /* @__PURE__ */ React.createElement("dt", { className: "font-bold text-violet-800" }, "Speaking time"), /* @__PURE__ */ React.createElement("dd", null, documentStatistics.speakingMinutes || 0, " min at 130 wpm"))), /* @__PURE__ */ React.createElement("div", { className: "mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("label", { htmlFor: "builder-word-count-goal", className: "text-[10px] font-bold text-slate-600" }, "Word goal"), /* @__PURE__ */ React.createElement("input", { id: "builder-word-count-goal", type: "number", min: "0", step: "50", value: wordGoal || "", onChange: (event) => setWordGoal(Math.max(0, parseInt(event.target.value, 10) || 0)), placeholder: "None", className: "h-7 w-24 rounded border border-slate-400 bg-white px-1.5 text-[11px]" }), /* @__PURE__ */ React.createElement("span", { className: "ml-auto text-[10px] font-semibold text-slate-600" }, wordGoalProgress.goal > 0 ? `${wordGoalProgress.percent}%` : "No goal")), /* @__PURE__ */ React.createElement("div", { className: "mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200", role: "progressbar", "aria-label": "Word-count goal progress", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": wordGoalProgress.percent, "aria-valuetext": wordGoalProgress.goal > 0 ? `${wordGoalProgress.count} of ${wordGoalProgress.goal} words` : "No word-count goal set" }, /* @__PURE__ */ React.createElement("div", { className: "h-full rounded-full bg-indigo-600 transition-all motion-reduce:transition-none", style: { width: `${wordGoalProgress.percent}%` } }))), /* @__PURE__ */ React.createElement("p", { className: "mt-2 text-[9px] leading-snug text-slate-500" }, "Counts exclude headers, footers, page controls, and other editor-only interface text."))), /* @__PURE__ */ React.createElement("span", null, headingOutline.length, " heading", headingOutline.length === 1 ? "" : "s"), /* @__PURE__ */ React.createElement("span", null, "Page ", pageMetrics.active + 1, " of ", pageMetrics.count), /* @__PURE__ */ React.createElement("span", null, "Section ", pageMetrics.activeSection + 1, " of ", pageMetrics.documentSections.length, ": ", activeDocumentSection.name)), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-slate-500" }, "Ctrl+Enter page break \xB7 Ctrl+Alt+F footnote \xB7 F9 update fields \xB7 Ctrl+Shift+Enter ", isFocusMode ? "exits focus mode" : "opens focus mode", " \xB7 Ctrl+Shift+G word count \xB7 Ctrl+Z undo"), /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline-block h-4 w-px bg-slate-300", "aria-hidden": "true" }), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1", "aria-label": "Editor zoom controls" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setCustomEditorZoom((value) => value - 5), className: "h-7 min-w-7 rounded border border-slate-300 bg-white px-1.5 font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700", "aria-label": "Zoom out", title: "Zoom out" }, "\u2212"), /* @__PURE__ */ React.createElement("input", { type: "range", min: "50", max: "200", step: "5", value: editorZoom, onChange: (event) => setCustomEditorZoom(Number(event.target.value)), className: "w-24 accent-indigo-600", "aria-label": "Editor zoom", "aria-valuetext": `${editorZoomMode === "custom" ? "" : editorZoomMode === "fit-width" ? "Fit width, " : "Fit page, "}${editorZoom} percent` }), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setCustomEditorZoom((value) => value + 5), className: "h-7 min-w-7 rounded border border-slate-300 bg-white px-1.5 font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700", "aria-label": "Zoom in", title: "Zoom in" }, "+"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setCustomEditorZoom(100), className: "min-w-12 rounded px-1.5 py-1 font-semibold text-indigo-700 hover:bg-indigo-100", "aria-label": "Reset editor zoom to 100 percent", title: "Reset editor zoom" }, editorZoom, "%"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: resetBuilderViewPreferences, className: "rounded px-1.5 py-1 font-semibold text-slate-600 hover:bg-indigo-100 hover:text-indigo-700", "aria-label": "Reset Builder view preferences", title: "Reset zoom, page view, ribbon, navigation, and review display" }, "Reset view"))))))
  );
}
async function updateExportPreview(deps) {
  const {
    exportPreviewRef,
    _exportPreviewErrorRef,
    _builderRecoverySaveTimerRef,
    getExportPreviewHTML,
    t,
    addToast,
    warnLog,
    setCanvasRecoveryRevision,
    isCanvas,
    a11yInspectMode
  } = deps;
  if (!exportPreviewRef.current) return;
  const iframe = exportPreviewRef.current;
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;
  const _refreshRequest = (iframe.__alloPreviewRefreshRequest || 0) + 1;
  iframe.__alloPreviewRefreshRequest = _refreshRequest;
  try {
    if (doc.body && doc.body.getAttribute && doc.body.getAttribute("data-allo-user-edited") === "1") {
      let _confirmation = iframe.__alloPreviewConfirmation;
      if (!_confirmation) {
        const _uxConfirm = typeof window !== "undefined" && window.AlloFlowUX && window.AlloFlowUX.confirm;
        const _dialogModule = typeof window !== "undefined" && window.AlloModules && window.AlloModules.ConfirmDialog && window.AlloModules.ConfirmDialog.ConfirmDialog;
        if (typeof _uxConfirm !== "function" || typeof _dialogModule !== "function") {
          addToast && addToast(t("toasts.builder_confirmation_unavailable") || "Kept your manual edits because the confirmation dialog is not ready. Try again in a moment.", "info");
          return;
        }
        let _requestedConfirmation = false;
        try {
          _requestedConfirmation = _uxConfirm.call(
            window.AlloFlowUX,
            t("export_preview.rerender_confirm") || "Re-rendering the preview will replace your manual edits with freshly generated content.",
            {
              title: t("export_preview.rerender_confirm_title") || "Discard manual edits?",
              detail: t("export_preview.rerender_confirm_detail") || "Cancel keeps your edits. Export or close the builder to save them before changing settings.",
              confirmText: t("export_preview.rerender_confirm_action") || "Discard edits and re-render",
              cancelText: t("export_preview.rerender_cancel_action") || "Keep edits",
              tone: "danger"
            }
          );
        } catch (_) {
        }
        _confirmation = Promise.resolve(_requestedConfirmation).then(Boolean, () => false);
        iframe.__alloPreviewConfirmation = _confirmation;
      }
      const _proceed = await _confirmation;
      if (iframe.__alloPreviewConfirmation === _confirmation) iframe.__alloPreviewConfirmation = null;
      if (exportPreviewRef.current !== iframe || iframe.__alloPreviewRefreshRequest !== _refreshRequest) return;
      if (!_proceed) {
        addToast && addToast(t("toasts.builder_edits_preserved") || "Kept your manual edits - the preview was not re-rendered. Export or close the builder to save them, then change settings.", "info");
        return;
      }
    }
  } catch (_) {
    addToast && addToast(t("toasts.builder_edits_preserved") || "Kept your manual edits because confirmation could not be completed.", "info");
    return;
  }
  let html;
  try {
    html = getExportPreviewHTML();
    _exportPreviewErrorRef.current = null;
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    warnLog("[Export preview] getExportPreviewHTML threw:", err);
    if (_exportPreviewErrorRef.current !== msg) {
      _exportPreviewErrorRef.current = msg;
      addToast && addToast(t("toasts.preview_failed_render_document_pipeline"), "error");
    }
    const escapedMsg = msg.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]);
    html = `<!DOCTYPE html><html><body data-allo-preview-error="1" style="font-family:system-ui;padding:2rem;color:#991b1b;background:#fef2f2"><h2>Preview error</h2><pre style="white-space:pre-wrap;font-size:12px">${escapedMsg}</pre><p style="font-size:12px;color:#7f1d1d;margin-top:1rem">If this persists, the CDN-loaded doc pipeline likely needs a redeploy with the latest fix.</p></body></html>`;
  }
  doc.open();
  doc.write(html);
  doc.close();
  try {
    doc.designMode = "on";
    if (doc.body) doc.body.spellcheck = true;
    const _wireBuilderCropImage = (img) => {
      if (!img || img.hasAttribute("data-allo-crop-tabindex-added")) return;
      const hadTabindex = img.hasAttribute("tabindex");
      if (!hadTabindex) img.setAttribute("tabindex", "0");
      img.setAttribute("data-allo-crop-tabindex-added", hadTabindex ? "preserved" : "added");
      img.setAttribute("aria-keyshortcuts", "Enter Space");
    };
    doc.querySelectorAll("img").forEach(_wireBuilderCropImage);
    try {
      doc.addEventListener("input", function() {
        try {
          if (doc.body) doc.body.setAttribute("data-allo-user-edited", "1");
        } catch (_) {
        }
        if (isCanvas) {
          if (_builderRecoverySaveTimerRef.current) clearTimeout(_builderRecoverySaveTimerRef.current);
          _builderRecoverySaveTimerRef.current = setTimeout(() => {
            _builderRecoverySaveTimerRef.current = null;
            setCanvasRecoveryRevision((value) => value + 1);
          }, 500);
        }
      });
    } catch (_) {
    }
    const editStyle = doc.createElement("style");
    editStyle.id = "allo-builder-edit-css";
    const _baseEditCss = `
        [contenteditable]:focus, *:focus { outline: 2px solid #6366f1 !important; outline-offset: 2px; border-radius: 4px; }
        [data-allo-semantic-selected="1"] { outline: 4px solid #0ea5e9 !important; outline-offset: 4px !important; background-color: rgba(224,242,254,.42) !important; scroll-margin: 7rem; }
        img { cursor: move; transition: outline 0.2s; }
        img:hover { outline: 2px dashed #6366f1; }
        [data-allo-page-break="1"], [data-allo-section-break] { position:relative;display:block;height:var(--allo-break-fill,24px) !important;margin:0 !important;border:0 !important;border-top:2px dashed #94a3b8 !important;background:linear-gradient(to bottom,transparent 0,transparent 11px,rgba(148,163,184,0.12) 11px,rgba(148,163,184,0.12) 13px,transparent 13px) !important; }
        [data-allo-page-break="1"]::after, [data-allo-section-break]::after { position:absolute;top:5px;right:0;padding:0 4px;color:#64748b;background:#f8fafc;font:700 9px/14px system-ui,sans-serif;letter-spacing:.04em;text-transform:uppercase; }
        [data-allo-page-break="1"]::after { content:'Page break'; }
        [data-allo-section-break="next-page"] { border-top-color:#7c3aed !important; }
        [data-allo-section-break="next-page"]::after { content:attr(data-allo-section-name) ' \xB7 Next page section';color:#6d28d9; }
        [data-allo-section-break="continuous"] { border-top-style:dotted !important;border-top-color:#0f766e !important; }
        [data-allo-section-break="continuous"]::after { content:attr(data-allo-section-name) ' \xB7 Continuous section';color:#0f766e; }
        @media print { [data-allo-page-break="1"],[data-allo-section-break] { height:0 !important;margin:0 !important;border:0 !important;background:none !important; } [data-allo-page-break="1"]::after,[data-allo-section-break]::after { display:none !important; } }
        [data-allo-tab="1"] { min-height:1em;border-bottom:1px dotted rgba(99,102,241,.45); }
        [data-allo-tab-field] { min-width:.25in; }
        [data-allo-bookmark="1"] { scroll-margin-top:5rem; }
        [data-allo-bookmark="1"]:not([data-allo-bookmark-empty]) { box-shadow:inset 0 -2px 0 rgba(8,145,178,.45); }
        [data-allo-bookmark-empty]::before { content:'BM';position:absolute;left:-1px;bottom:.9em;padding:1px 3px;border:1px solid #0891b2;border-radius:3px;background:#ecfeff;color:#155e75;font:800 7px/1 system-ui,sans-serif;letter-spacing:.03em;white-space:nowrap; }
        [data-allo-cross-reference="1"] { color:#0e7490;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:2px;scroll-margin-top:5rem; }
        [data-allo-citation="1"] { padding:0 .08em;border-radius:2px;background:rgba(8,145,178,.08);box-shadow:inset 0 -1px 0 rgba(8,145,178,.42);scroll-margin-top:5rem; }
        [data-allo-citation="1"] > a { color:inherit;text-decoration:none; }
        [data-allo-citation="1"]:hover { background:rgba(8,145,178,.16); }
        [data-allo-citation="1"]:focus-visible { outline:2px solid #0e7490;outline-offset:2px;background:rgba(8,145,178,.16); }
        [data-allo-bibliography="1"],[data-allo-bibliography-source] { scroll-margin-top:5rem; }
        [data-allo-bibliography-title] { break-after:avoid;page-break-after:avoid; }
        [data-allo-footnote-ref] { color:#0e7490;font-weight:700;scroll-margin-top:5rem; }
        [data-allo-footnotes="1"] { margin-top:2em;padding-top:.75em;border-top:1px solid #cbd5e1; }
        [data-allo-footnote] { scroll-margin-top:5rem; }
        [data-allo-reference-broken="1"] { outline:2px dashed #dc2626 !important;outline-offset:2px;background:#fef2f2 !important;color:#991b1b !important; }
        ::selection { background: #c7d2fe; }
        ::highlight(allo-builder-find) { background: #fde68a; color: #713f12; }
        mark[data-allo-comment-id] { padding:0;background:var(--allo-reviewer-soft,#fef3c7);color:inherit;border-bottom:2px solid var(--allo-reviewer-accent,#d97706);border-radius:2px;cursor:pointer; }
        mark[data-allo-comment-resolved="1"] { background:#f1f5f9;border-bottom:1px dotted var(--allo-reviewer-accent,#64748b); }
        mark[data-allo-comment-active="1"] { background:var(--allo-reviewer-soft,#fde68a);box-shadow:0 0 0 2px var(--allo-reviewer-accent,#f59e0b); }
        ins[data-allo-change-id] { padding:0 .05em;background:#dcfce7;color:#166534;border-bottom:2px solid var(--allo-reviewer-accent,#16a34a);text-decoration:none;border-radius:2px;cursor:pointer; }
        del[data-allo-change-id] { padding:0 .05em;background:#fee2e2;color:#b91c1c;text-decoration:line-through 2px;border-bottom:2px dotted var(--allo-reviewer-accent,#dc2626);border-radius:2px;cursor:pointer; }
        [data-allo-change-kind][data-allo-change-id] { position:relative;cursor:pointer;border-radius:2px; }
        [data-allo-change-type="format"],[data-allo-change-type="paragraph"],[data-allo-change-type="structure"] { outline:2px dashed var(--allo-reviewer-accent,#7c3aed);outline-offset:2px; }
        body:not([data-allo-tracked-view="original"]) [data-allo-change-kind="structure-delete"] { display:block !important;min-height:1.4em !important;height:1.4em !important;margin:.35em 0 !important;border:2px dashed #dc2626 !important;background:#fee2e2 !important;break-before:auto !important;page-break-before:auto !important; }
        body:not([data-allo-tracked-view="original"]) [data-allo-change-kind="structure-delete"]::before { content:attr(data-allo-change-label);display:block;padding:0 .35em;color:#991b1b;font:700 9px/1.4em system-ui,sans-serif;text-transform:uppercase;letter-spacing:.04em; }
        [data-allo-change-active="1"] { box-shadow:0 0 0 3px var(--allo-reviewer-accent,#7c3aed) !important;position:relative;z-index:2; }
        body[data-allo-review-balloons="1"] [data-allo-change-active="1"]::after { content:attr(data-allo-change-label) ' \xB7 ' attr(data-allo-change-author);position:absolute;left:calc(100% + .75rem);top:0;z-index:10;width:9rem;max-width:9rem;padding:.35rem .45rem;border:1px solid var(--allo-reviewer-accent,#c4b5fd);border-radius:.4rem;background:var(--allo-reviewer-soft,#f5f3ff);color:var(--allo-reviewer-ink,#4c1d95);box-shadow:0 4px 12px rgba(76,29,149,.18);font:700 9px/1.25 system-ui,sans-serif;text-decoration:none;white-space:normal; }
        body[data-allo-tracked-view="simple"] ins[data-allo-change-id] { padding:0;background:transparent;color:inherit;border-bottom:1px dotted #7c3aed;box-shadow:none; }
        body[data-allo-tracked-view="simple"] del[data-allo-change-id] { display:none; }
        body[data-allo-tracked-view="simple"] [data-allo-change-kind][data-allo-change-id] { outline:0;box-shadow:inset 3px 0 0 #7c3aed; }
        body[data-allo-tracked-view="none"] ins[data-allo-change-id] { padding:0;background:transparent;color:inherit;border:0;box-shadow:none;text-decoration:none; }
        body[data-allo-tracked-view="none"] del[data-allo-change-id] { display:none; }
        body[data-allo-tracked-view="none"] [data-allo-change-kind][data-allo-change-id] { outline:0;box-shadow:none;cursor:inherit; }
        body[data-allo-tracked-view="none"] [data-allo-change-kind][data-allo-change-id]::before,body[data-allo-tracked-view="none"] [data-allo-change-kind][data-allo-change-id]::after { display:none; }
        body[data-allo-tracked-view="original"] ins[data-allo-change-id],body[data-allo-tracked-view="original"] [data-allo-change-kind="structure-insert"] { display:none; }
        body[data-allo-tracked-view="original"] del[data-allo-change-id] { padding:0;background:transparent;color:inherit;border:0;box-shadow:none;text-decoration:none; }
        body[data-allo-tracked-view="original"] [data-allo-change-kind][data-allo-change-id] { outline:1px dotted #94a3b8;outline-offset:2px;box-shadow:none; }
        @media print { [data-allo-bookmark-empty]::before { display:none !important; } [data-allo-bookmark="1"],[data-allo-citation="1"],[data-allo-reference-broken="1"] { outline:0 !important;box-shadow:none !important;background:transparent !important;color:inherit !important; } }
        @media print { mark[data-allo-comment-id],ins[data-allo-change-id],[data-allo-change-kind][data-allo-change-id] { padding:0 !important;background:transparent !important;color:inherit !important;border:0 !important;outline:0 !important;box-shadow:none !important;text-decoration:none !important; } del[data-allo-change-id],[data-allo-change-kind="structure-delete"] { display:none !important; } [data-allo-change-kind][data-allo-change-id]::before,[data-allo-change-kind][data-allo-change-id]::after { display:none !important; } }
      `;
    editStyle.setAttribute("data-allo-base-css", _baseEditCss);
    const _editorZoom = _builderClampEditorZoom(iframe.__alloBuilderZoom);
    const _pageCss = editorPageCss(iframe.__alloBuilderPageView !== false);
    editStyle.setAttribute("data-allo-page-css", _pageCss);
    editStyle.textContent = `${_baseEditCss}
${_pageCss}
        body { zoom: ${_editorZoom}%; }`;
    doc.head.appendChild(editStyle);
    doc.addEventListener("keydown", function(e) {
      const _citationField = e.target?.closest?.(_BUILDER_CITATION_SELECTOR);
      if (_citationField && (e.key === "Enter" || e.key === " ") && !e.altKey && !e.ctrlKey && !e.metaKey) {
        try {
          e.preventDefault();
          const _hostDoc = window.parent && window.parent.document;
          const _citationId = _citationField.getAttribute("data-allo-citation-id") || "";
          if (_hostDoc && _citationId) _hostDoc.dispatchEvent(new window.parent.CustomEvent("alloflow-builder-edit-citation", { detail: { id: _citationId } }));
        } catch (_) {
        }
        return;
      }
      if (e.key === "F9" && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        try {
          e.preventDefault();
          const _hostDoc = window.parent && window.parent.document;
          if (_hostDoc) _hostDoc.dispatchEvent(new window.parent.CustomEvent("alloflow-builder-update-fields"));
        } catch (_) {
        }
        return;
      }
      if (e.key === "Escape") {
        try {
          e.preventDefault();
          const _parentDoc = window.parent && window.parent.document;
          if (_parentDoc && _parentDoc.documentElement.classList.contains("allo-docbuilder-focus")) {
            if (_parentDoc.fullscreenElement && _parentDoc.exitFullscreen) _parentDoc.exitFullscreen().catch(() => {
            });
            window.parent.dispatchEvent(new window.parent.CustomEvent("alloflow-builder-exit-focus"));
            return;
          }
          const _cb = _parentDoc && _parentDoc.querySelector('[aria-label="' + (t("a11y.close_doc_builder") || "Close document builder") + '"]');
          if (_cb && _cb.focus) _cb.focus();
        } catch (_) {
        }
        return;
      }
      if (e.key === "Tab") {
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
          const insertedTab = _builderInsertParagraphTab(doc, _editorZoom);
          if (insertedTab) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
        }
        try {
          let selectedNode = doc.getSelection?.()?.anchorNode;
          if (selectedNode?.nodeType === 3) selectedNode = selectedNode.parentElement;
          const cell = selectedNode?.closest?.("td,th");
          const table = cell?.closest?.("table");
          if (cell && table) {
            let cells = Array.from(table.querySelectorAll("th,td"));
            const current = cells.indexOf(cell);
            let target = cells[current + (e.shiftKey ? -1 : 1)] || null;
            if (!target && !e.shiftKey) {
              const body = table.tBodies[0] || table.appendChild(doc.createElement("tbody"));
              const row = doc.createElement("tr");
              const columnCount = Math.max(1, ...Array.from(table.rows).map((item) => item.cells.length));
              for (let index = 0; index < columnCount; index += 1) {
                const td = doc.createElement("td");
                td.setAttribute("style", "border:1px solid #94a3b8;padding:.5em;vertical-align:top;");
                td.appendChild(doc.createElement("br"));
                row.appendChild(td);
              }
              body.appendChild(row);
              target = row.cells[0];
              cells = Array.from(table.querySelectorAll("th,td"));
              doc.body?.dispatchEvent(new doc.defaultView.Event("input", { bubbles: true }));
            }
            if (target) {
              e.preventDefault();
              const range = doc.createRange();
              range.selectNodeContents(target);
              range.collapse(true);
              const selection = doc.getSelection();
              selection.removeAllRanges();
              selection.addRange(range);
              target.scrollIntoView({ block: "nearest" });
              return;
            }
          }
        } catch (_) {
        }
        try {
          const inner = Array.from(doc.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter((el) => el.getClientRects().length > 0 && !el.closest('[aria-hidden="true"]'));
          const active = doc.activeElement;
          const atStart = !inner.length || active === doc.body || active === inner[0];
          const atEnd = !inner.length || active === doc.body || active === inner[inner.length - 1];
          if (e.shiftKey && atStart || !e.shiftKey && atEnd) {
            const frame = exportPreviewRef.current;
            const dialog = frame && frame.closest('[role="dialog"]');
            const outer = dialog ? Array.from(dialog.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),iframe,[tabindex]:not([tabindex="-1"])')).filter((el) => el.getClientRects().length > 0) : [];
            const frameIndex = outer.indexOf(frame);
            const target = e.shiftKey ? outer[Math.max(0, frameIndex - 1)] : outer[0];
            if (target && target.focus) {
              e.preventDefault();
              target.focus();
              return;
            }
          }
        } catch (_) {
        }
      }
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key === "Enter") {
        const insertedBreak = _builderInsertDocumentBreak(doc, "page");
        if (insertedBreak) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && (e.key === "e" || e.key === "E")) {
        try {
          e.preventDefault();
          const _hostDoc = window.parent && window.parent.document;
          if (_hostDoc) _hostDoc.dispatchEvent(new window.parent.CustomEvent("alloflow-builder-toggle-track-changes"));
        } catch (_) {
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.altKey && !e.shiftKey && (e.key === "m" || e.key === "M")) {
        try {
          e.preventDefault();
          const _hostDoc = window.parent && window.parent.document;
          if (_hostDoc) _hostDoc.dispatchEvent(new window.parent.CustomEvent("alloflow-builder-new-comment"));
        } catch (_) {
        }
        return;
      }
      const _focusedComment = e.target?.closest?.(_BUILDER_COMMENT_SELECTOR);
      if ((e.key === "Enter" || e.key === " ") && _focusedComment) {
        try {
          e.preventDefault();
          e.stopPropagation();
          const _hostDoc = window.parent && window.parent.document;
          const _commentId = _focusedComment.getAttribute("data-allo-comment-id") || "";
          if (_hostDoc && _commentId) _hostDoc.dispatchEvent(new window.parent.CustomEvent("alloflow-builder-activate-comment", { detail: { id: _commentId } }));
        } catch (_) {
        }
        return;
      }
      const _focusedChange = e.target?.closest?.(_BUILDER_CHANGE_SELECTOR);
      if ((e.key === "Enter" || e.key === " ") && _focusedChange) {
        try {
          e.preventDefault();
          e.stopPropagation();
          const _hostDoc = window.parent && window.parent.document;
          const _changeId = _focusedChange.getAttribute("data-allo-change-id") || "";
          if (_hostDoc && _changeId) _hostDoc.dispatchEvent(new window.parent.CustomEvent("alloflow-builder-activate-change", { detail: { id: _changeId } }));
        } catch (_) {
        }
        return;
      }
      if ((e.key === "Enter" || e.key === " ") && e.target && (e.target.tagName || "").toUpperCase() === "IMG") {
        e.preventDefault();
        e.stopPropagation();
        _openBuilderCropModal(e.target);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.altKey && !e.shiftKey && (e.key === "f" || e.key === "F")) {
        try {
          e.preventDefault();
          const _hostDoc = window.parent && window.parent.document;
          if (_hostDoc) _hostDoc.dispatchEvent(new window.parent.CustomEvent("alloflow-builder-insert-footnote"));
        } catch (_) {
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && (e.key === "g" || e.key === "G")) {
        try {
          e.preventDefault();
          const _hostDoc = window.parent && window.parent.document;
          if (_hostDoc) _hostDoc.dispatchEvent(new window.parent.CustomEvent("alloflow-builder-open-word-count"));
        } catch (_) {
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === "f" || e.key === "F" || e.key === "h" || e.key === "H")) {
        try {
          e.preventDefault();
          const _hostDoc = window.parent && window.parent.document;
          if (_hostDoc) _hostDoc.dispatchEvent(new window.parent.CustomEvent("alloflow-builder-open-find", { detail: { mode: e.key === "h" || e.key === "H" ? "replace" : "find" } }));
        } catch (_) {
        }
        return;
      }
      if (e.ctrlKey || e.metaKey) {
        const _resumeKeyboardReviewView = () => {
          if (doc.body?.getAttribute("data-allo-tracked-view") !== "original") return;
          _builderSetTrackedMarkupView(doc, "all");
          try {
            const _hostDoc = window.parent && window.parent.document;
            _hostDoc?.dispatchEvent(new window.parent.CustomEvent("alloflow-builder-markup-view", { detail: { view: "all" } }));
          } catch (_) {
          }
        };
        const _runKeyboardFormat = (command, value, label, mode) => {
          _resumeKeyboardReviewView();
          const tracking = doc.body?.getAttribute("data-allo-track-changes") === "1";
          if (!tracking) return doc.execCommand(command, false, value);
          const result = mode === "structure" ? _builderTrackStructureReplacementCommand(doc, command, value, label, () => doc.execCommand(command, false, value)) : mode === "block" ? _builderTrackBlockFormattingCommand(doc, command, value, label, () => doc.execCommand(command, false, value)) : _builderTrackInlineFormatting(doc, command, value, label, () => doc.execCommand(command, false, value));
          if (result.direct && !result.applied) return doc.execCommand(command, false, value);
          return result.ok;
        };
        if (!e.altKey && (e.key === "s" || e.key === "S")) {
          e.preventDefault();
          try {
            window.parent.document.dispatchEvent(new window.parent.CustomEvent("alloflow-builder-save-snapshot"));
          } catch (_) {
          }
        } else if (!e.altKey && (e.key === "z" || e.key === "Z")) {
          e.preventDefault();
          doc.execCommand(e.shiftKey ? "redo" : "undo");
        } else if (!e.altKey && (e.key === "y" || e.key === "Y")) {
          e.preventDefault();
          doc.execCommand("redo");
        } else if (!e.altKey && !e.shiftKey && (e.key === "b" || e.key === "B")) {
          e.preventDefault();
          _runKeyboardFormat("bold", null, "Bold formatting", "inline");
        } else if (!e.altKey && !e.shiftKey && (e.key === "i" || e.key === "I")) {
          e.preventDefault();
          _runKeyboardFormat("italic", null, "Italic formatting", "inline");
        } else if (!e.altKey && !e.shiftKey && (e.key === "u" || e.key === "U")) {
          e.preventDefault();
          _runKeyboardFormat("underline", null, "Underline formatting", "inline");
        } else if (e.key === "1") {
          e.preventDefault();
          _runKeyboardFormat("formatBlock", "<h1>", "Style changed to Heading 1", "block");
        } else if (e.key === "2") {
          e.preventDefault();
          _runKeyboardFormat("formatBlock", "<h2>", "Style changed to Heading 2", "block");
        } else if (e.key === "3") {
          e.preventDefault();
          _runKeyboardFormat("formatBlock", "<h3>", "Style changed to Heading 3", "block");
        } else if (e.key === "0") {
          e.preventDefault();
          _runKeyboardFormat("formatBlock", "<p>", "Style changed to Normal", "block");
        } else if (e.key === "k" || e.key === "K") {
          e.preventDefault();
          var url = prompt(t("toasts.link_url_prompt") || "Enter link URL:");
          if (url) _runKeyboardFormat("createLink", url, "Hyperlink changed", "inline");
        } else if (e.shiftKey && (e.key === "l" || e.key === "L")) {
          e.preventDefault();
          _runKeyboardFormat("insertUnorderedList", null, "Bulleted list structure changed", "structure");
        } else if (e.shiftKey && (e.key === "o" || e.key === "O")) {
          e.preventDefault();
          _runKeyboardFormat("insertOrderedList", null, "Numbered list structure changed", "structure");
        }
      }
    });
    const _cropOrigStore = () => {
      if (!window.__alloBuilderCropOriginals) window.__alloBuilderCropOriginals = { map: {}, order: [] };
      return window.__alloBuilderCropOriginals;
    };
    const _openBuilderCropModal = (img) => {
      try {
        const _old = doc.getElementById("allo-crop-overlay");
        if (_old) _old.remove();
      } catch (_) {
      }
      const returnFocus = img;
      const store = _cropOrigStore();
      const keyExisting = img.getAttribute("data-allo-crop-id");
      const srcFull = keyExisting && store.map[keyExisting] || img.src;
      const overlay = doc.createElement("div");
      overlay.id = "allo-crop-overlay";
      overlay.setAttribute("data-allo-crop-ui", "1");
      overlay.setAttribute("contenteditable", "false");
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.setAttribute("aria-label", t("export_preview.crop_dialog") || "Crop image");
      overlay.setAttribute("aria-describedby", "allo-crop-instructions");
      overlay.setAttribute("tabindex", "-1");
      overlay.style.cssText = "position:fixed;inset:0;z-index:2147483000;background:rgba(15,23,42,0.78);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:1rem;font-family:system-ui,sans-serif";
      const header = doc.createElement("div");
      header.id = "allo-crop-instructions";
      header.style.cssText = "color:#fff;font-size:13px;font-weight:700;margin-bottom:8px;text-align:center;max-width:86vw";
      header.textContent = t("export_preview.crop_instructions") || "Drag to select the part to keep \u2014 arrow keys nudge the selection, Shift+arrows resize it. Apply replaces the image in every export.";
      overlay.appendChild(header);
      const wrapper = doc.createElement("div");
      wrapper.style.cssText = "position:relative;max-width:90vw;max-height:66vh;overflow:auto;background:#1e293b;border-radius:8px;border:2px solid #64748b;cursor:crosshair;touch-action:none";
      overlay.appendChild(wrapper);
      const pic = doc.createElement("img");
      pic.alt = "";
      pic.draggable = false;
      pic.style.cssText = "display:block;max-width:86vw;max-height:62vh;user-select:none;-webkit-user-drag:none";
      pic.src = srcFull;
      wrapper.appendChild(pic);
      const sel = doc.createElement("div");
      sel.style.cssText = "position:absolute;border:2px dashed #60a5fa;background:rgba(37,99,235,0.18);pointer-events:none;display:none";
      wrapper.appendChild(sel);
      const statusEl = doc.createElement("div");
      statusEl.setAttribute("role", "status");
      statusEl.style.cssText = "color:#fde68a;font-size:12px;font-weight:600;min-height:16px;margin-top:6px;text-align:center;max-width:86vw";
      const _status = (msg) => {
        statusEl.textContent = msg || "";
      };
      pic.onload = () => {
        try {
          const prev = JSON.parse(img.getAttribute("data-allo-crop") || "null");
          if (prev && prev.nw === pic.naturalWidth && prev.nh === pic.naturalHeight) {
            const kx = pic.clientWidth / prev.nw, ky = pic.clientHeight / prev.nh;
            sel.style.left = prev.x * kx + "px";
            sel.style.top = prev.y * ky + "px";
            sel.style.width = prev.w * kx + "px";
            sel.style.height = prev.h * ky + "px";
            sel.style.display = "block";
          }
        } catch (_) {
        }
      };
      pic.onerror = () => {
        _status(t("export_preview.crop_load_failed") || "The image failed to load \u2014 close this and try again.");
      };
      let _dragging = false, _startX = 0, _startY = 0;
      wrapper.addEventListener("pointerdown", (e) => {
        if (e.target !== pic && e.target !== wrapper) return;
        const r = pic.getBoundingClientRect();
        _startX = Math.max(0, Math.min(e.clientX - r.left, pic.clientWidth));
        _startY = Math.max(0, Math.min(e.clientY - r.top, pic.clientHeight));
        _dragging = true;
        try {
          wrapper.setPointerCapture(e.pointerId);
        } catch (_) {
        }
        sel.style.left = _startX + "px";
        sel.style.top = _startY + "px";
        sel.style.width = "0";
        sel.style.height = "0";
        sel.style.display = "block";
        _status("");
        e.preventDefault();
      });
      wrapper.addEventListener("pointermove", (e) => {
        if (!_dragging) return;
        const r = pic.getBoundingClientRect();
        const cx = Math.max(0, Math.min(e.clientX - r.left, pic.clientWidth));
        const cy = Math.max(0, Math.min(e.clientY - r.top, pic.clientHeight));
        sel.style.left = Math.min(_startX, cx) + "px";
        sel.style.top = Math.min(_startY, cy) + "px";
        sel.style.width = Math.abs(cx - _startX) + "px";
        sel.style.height = Math.abs(cy - _startY) + "px";
      });
      wrapper.addEventListener("pointerup", () => {
        _dragging = false;
      });
      const _close = () => {
        try {
          overlay.remove();
        } catch (_) {
        }
        try {
          if (returnFocus && returnFocus.isConnected && returnFocus.focus) returnFocus.focus();
          else if (doc.body && doc.body.focus) doc.body.focus();
        } catch (_) {
        }
      };
      overlay.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          _close();
          return;
        }
        if (e.key === "Tab") {
          const controls = Array.from(overlay.querySelectorAll('button:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter((el) => el.getClientRects().length > 0);
          if (!controls.length) {
            e.preventDefault();
            overlay.focus();
            return;
          }
          const first = controls[0], last = controls[controls.length - 1];
          if (e.shiftKey && doc.activeElement === first) {
            e.preventDefault();
            last.focus();
            return;
          }
          if (!e.shiftKey && doc.activeElement === last) {
            e.preventDefault();
            first.focus();
            return;
          }
        }
        const moves = { ArrowLeft: [-4, 0], ArrowRight: [4, 0], ArrowUp: [0, -4], ArrowDown: [0, 4] };
        const d = moves[e.key];
        if (!d || sel.style.display === "none") return;
        e.preventDefault();
        e.stopPropagation();
        let L = parseFloat(sel.style.left) || 0, T = parseFloat(sel.style.top) || 0;
        let W = parseFloat(sel.style.width) || 0, H = parseFloat(sel.style.height) || 0;
        if (e.shiftKey) {
          W = Math.max(8, Math.min(pic.clientWidth - L, W + d[0]));
          H = Math.max(8, Math.min(pic.clientHeight - T, H + d[1]));
        } else {
          L = Math.max(0, Math.min(pic.clientWidth - W, L + d[0]));
          T = Math.max(0, Math.min(pic.clientHeight - H, T + d[1]));
        }
        sel.style.left = L + "px";
        sel.style.top = T + "px";
        sel.style.width = W + "px";
        sel.style.height = H + "px";
      });
      const btnRow = doc.createElement("div");
      btnRow.style.cssText = "display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;justify-content:center";
      const _mkBtn = (label, bg, border) => {
        const b = doc.createElement("button");
        b.type = "button";
        b.textContent = label;
        b.style.cssText = "padding:8px 20px;background:" + bg + ";color:#fff;border:1px solid " + border + ";border-radius:8px;font-weight:700;font-size:13px;cursor:pointer";
        btnRow.appendChild(b);
        return b;
      };
      const applyBtn = _mkBtn(t("export_preview.crop_apply") || "Apply Crop", "#2563eb", "#1e3a8a");
      applyBtn.onclick = () => {
        if (sel.style.display === "none") {
          _status(t("export_preview.crop_none") || "Drag a selection first.");
          return;
        }
        if (!pic.naturalWidth || !pic.clientWidth) {
          _status(t("export_preview.crop_load_failed") || "The image failed to load \u2014 close this and try again.");
          return;
        }
        const kx = pic.naturalWidth / pic.clientWidth, ky = pic.naturalHeight / pic.clientHeight;
        let sx = (parseFloat(sel.style.left) || 0) * kx, sy = (parseFloat(sel.style.top) || 0) * ky;
        let sw = (parseFloat(sel.style.width) || 0) * kx, sh = (parseFloat(sel.style.height) || 0) * ky;
        sx = Math.max(0, Math.min(sx, pic.naturalWidth - 1));
        sy = Math.max(0, Math.min(sy, pic.naturalHeight - 1));
        sw = Math.min(sw, pic.naturalWidth - sx);
        sh = Math.min(sh, pic.naturalHeight - sy);
        if (sw < 8 || sh < 8) {
          _status(t("export_preview.crop_too_small") || "That selection is too small \u2014 drag a larger area.");
          return;
        }
        const c = doc.createElement("canvas");
        c.setAttribute("aria-hidden", "true");
        c.width = Math.round(sw);
        c.height = Math.round(sh);
        let out;
        try {
          c.getContext("2d").drawImage(pic, sx, sy, sw, sh, 0, 0, c.width, c.height);
          const asJpeg = /^data:image\/jpe?g/i.test(srcFull) || /\.jpe?g([?#]|$)/i.test(srcFull);
          out = c.toDataURL(asJpeg ? "image/jpeg" : "image/png", 0.92);
        } catch (_taintErr) {
          _status(t("export_preview.crop_blocked") || "This image comes from another website, so the browser blocks cropping it here. Save it to your device, upload it, then crop.");
          return;
        }
        let key = img.getAttribute("data-allo-crop-id");
        if (!key) {
          window.__alloBuilderCropSeq = (window.__alloBuilderCropSeq || 0) + 1;
          key = "c" + window.__alloBuilderCropSeq;
          img.setAttribute("data-allo-crop-id", key);
        }
        if (!store.map[key]) {
          store.map[key] = srcFull;
          store.order.push(key);
          while (store.order.length > 30) delete store.map[store.order.shift()];
        }
        img.src = out;
        img.setAttribute("data-allo-crop", JSON.stringify({ x: Math.round(sx), y: Math.round(sy), w: Math.round(sw), h: Math.round(sh), nw: pic.naturalWidth, nh: pic.naturalHeight }));
        try {
          if (doc.body) {
            doc.body.setAttribute("data-allo-user-edited", "1");
            doc.body.dispatchEvent(new doc.defaultView.Event("input", { bubbles: true }));
          }
        } catch (_) {
        }
        _close();
        addToast(t("toasts.image_cropped") || "\u2702\uFE0F Image cropped \u2014 the change rides every export. Click the image again to re-crop or restore the original.", "success");
      };
      if (keyExisting && store.map[keyExisting]) {
        const resetBtn = _mkBtn(t("export_preview.crop_reset") || "Restore original", "#b45309", "#92400e");
        resetBtn.onclick = () => {
          img.src = store.map[keyExisting];
          img.removeAttribute("data-allo-crop");
          img.removeAttribute("data-allo-crop-id");
          try {
            if (doc.body) {
              doc.body.setAttribute("data-allo-user-edited", "1");
              doc.body.dispatchEvent(new doc.defaultView.Event("input", { bubbles: true }));
            }
          } catch (_) {
          }
          _close();
          addToast(t("toasts.image_crop_reset") || "\u21A9\uFE0F Original image restored.", "success");
        };
      }
      const cancelBtn = _mkBtn(t("export_preview.crop_cancel") || "Cancel", "#64748b", "#475569");
      cancelBtn.onclick = _close;
      overlay.appendChild(btnRow);
      overlay.appendChild(statusEl);
      doc.body.appendChild(overlay);
      try {
        applyBtn.focus();
      } catch (_) {
      }
    };
    const _dismissCropBtn = () => {
      try {
        const b = doc.getElementById("allo-crop-btn");
        if (b) b.remove();
      } catch (_) {
      }
    };
    doc.addEventListener("scroll", _dismissCropBtn, true);
    doc.addEventListener("click", (ev) => {
      try {
        const el = ev.target;
        if (el && el.closest && el.closest("[data-allo-crop-ui]")) return;
        _dismissCropBtn();
        if (!el || (el.tagName || "").toUpperCase() !== "IMG") return;
        if (!el.src || !el.naturalWidth || el.naturalWidth < 16 || el.naturalHeight < 16) return;
        const btn = doc.createElement("button");
        btn.id = "allo-crop-btn";
        btn.type = "button";
        btn.setAttribute("data-allo-crop-ui", "1");
        btn.setAttribute("contenteditable", "false");
        btn.textContent = "\u2702 " + (t("export_preview.crop_button") || "Crop");
        btn.title = t("export_preview.crop_button_title") || "Crop this image (persists in every export)";
        const r = el.getBoundingClientRect();
        const w = doc.defaultView;
        btn.style.cssText = "position:absolute;z-index:2147482000;left:" + Math.max(0, r.left + (w ? w.pageXOffset : 0) + 6) + "px;top:" + Math.max(0, r.top + (w ? w.pageYOffset : 0) + 6) + "px;padding:5px 12px;background:#4f46e5;color:#fff;border:1px solid #3730a3;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(15,23,42,0.35);font-family:system-ui,sans-serif";
        btn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          _dismissCropBtn();
          _openBuilderCropModal(el);
        };
        doc.body.appendChild(btn);
        setTimeout(() => {
          try {
            if (btn.parentNode) btn.remove();
          } catch (_) {
          }
        }, 1e4);
      } catch (_) {
      }
    });
  } catch (_editorErr) {
    warnLog("[Export preview] failed to initialize editor in iframe:", _editorErr);
  }
  if (a11yInspectMode) {
    try {
      const _eh = window.AlloModules && window.AlloModules.ExportHandlers;
      if (_eh && typeof _eh.applyA11yInspector === "function") {
        _eh.applyA11yInspector({ exportPreviewRef, enabled: true });
      }
    } catch (_inspErr) {
      warnLog("[Export preview] applyA11yInspector failed:", _inspErr);
    }
  }
}
window.AlloModules = window.AlloModules || {};
window.AlloModules.ExportPreviewView = (typeof ExportPreviewView !== 'undefined') ? ExportPreviewView : null;
window.AlloModules.ExportPreviewHelpers = (typeof updateExportPreview !== 'undefined') ? { updateExportPreview: updateExportPreview } : null;
window.AlloModules.ViewExportPreviewModule = true;
console.log('[CDN] ViewExportPreviewModule loaded — ExportPreviewView registered');
})();
