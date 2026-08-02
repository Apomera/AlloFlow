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
    const mod = await _imp("https://cdn.jsdelivr.net/npm/harper.js@2.4.0/+esm");
    const binary = await mod.createBinaryModuleFromUrl("https://cdn.jsdelivr.net/npm/harper.js@2.4.0/dist/harper_wasm_bg.wasm");
    const linter = new mod.LocalLinter({ binary });
    if (linter.setup) await linter.setup();
    return linter;
  })();
  _harperPromise.catch(() => {
    _harperPromise = null;
  });
  return _harperPromise;
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
    if (node.parentElement?.closest("script,style,.allo-block-controls,.allo-block-remove,[data-allo-crop-ui],[data-allo-page-element]")) continue;
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
    if (node.parentElement?.closest("script,style,.allo-block-controls,.allo-block-remove,[data-allo-crop-ui],[data-allo-page-element]")) continue;
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
    if (!container || !doc.body.contains(container)) return empty;
    return { active: true, ..._builderTextStatistics(range.toString()) };
  } catch (_) {
    return empty;
  }
}
const _BUILDER_COMMENT_SELECTOR = "mark[data-allo-comment-id]";
function _builderNormalizeCommentMessage(value) {
  return String(value || "").replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, 1200);
}
function _builderCommentThread(marker) {
  let source = [];
  try {
    const parsed = JSON.parse(marker?.getAttribute?.("data-allo-comment-thread") || "[]");
    if (Array.isArray(parsed)) source = parsed;
  } catch (_) {
  }
  const fallback = _builderNormalizeCommentMessage(marker?.getAttribute?.("data-allo-comment-text"));
  if (!source.length && fallback) source = [{ text: fallback, at: marker?.getAttribute?.("data-allo-comment-created-at") || "" }];
  return source.map((entry, index) => ({
    id: String(entry?.id || `message-${index + 1}`).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || `message-${index + 1}`,
    text: _builderNormalizeCommentMessage(entry?.text),
    at: String(entry?.at || "").slice(0, 48)
  })).filter((entry) => entry.text).slice(0, 20);
}
function _builderSetCommentThread(marker, thread) {
  if (!marker) return [];
  const normalized = (Array.isArray(thread) ? thread : []).map((entry, index) => ({
    id: String(entry?.id || `message-${index + 1}`).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || `message-${index + 1}`,
    text: _builderNormalizeCommentMessage(entry?.text),
    at: String(entry?.at || (/* @__PURE__ */ new Date()).toISOString()).slice(0, 48)
  })).filter((entry) => entry.text).slice(0, 20);
  marker.setAttribute("data-allo-comment-thread", JSON.stringify(normalized));
  marker.setAttribute("data-allo-comment-text", normalized[0]?.text || "");
  marker.setAttribute("tabindex", "0");
  const resolved = marker.getAttribute("data-allo-comment-resolved") === "1";
  const summary = (normalized[0]?.text || "Comment").replace(/\s+/g, " ").slice(0, 140);
  marker.setAttribute("aria-label", `${resolved ? "Resolved comment" : "Comment"}: ${summary}`);
  marker.setAttribute("title", `${resolved ? "Resolved comment" : "Comment"}: ${summary}`);
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
      node: marker
    };
  });
}
function _builderInsertReviewComment(doc, savedRange, message) {
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
    _builderSetCommentThread(marker, [{ id: `message-${Date.now().toString(36)}`, text, at }]);
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
function _builderHeadingOutline(doc) {
  if (!doc) return [];
  return Array.from(doc.querySelectorAll("h1,h2,h3,h4,h5,h6")).map((heading, index) => ({
    index,
    level: Number(heading.tagName.substring(1)) || 1,
    text: (heading.textContent || "").replace(/\s+/g, " ").trim() || `Untitled heading ${index + 1}`,
    node: heading
  }));
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
function _readBuilderViewPreferences() {
  const defaults = { zoom: 100, zoomMode: "custom", pageView: true, pageSize: "letter", pageOrientation: "portrait", pageMargin: "1in", navigationPane: false, navigationTab: "headings", navigationWidth: 248, ribbonTab: "home", ribbonCollapsed: false };
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
      navigationTab: ["headings", "pages", "sections", "comments"].includes(stored.navigationTab) ? stored.navigationTab : stored.pageThumbnails ? "pages" : defaults.navigationTab,
      navigationWidth: Math.max(180, Math.min(420, Number(stored.navigationWidth) || defaults.navigationWidth)),
      ribbonTab: ["home", "insert", "layout", "review", "view", "expert"].includes(stored.ribbonTab) ? stored.ribbonTab : defaults.ribbonTab,
      ribbonCollapsed: typeof stored.ribbonCollapsed === "boolean" ? stored.ribbonCollapsed : defaults.ribbonCollapsed
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
  const meaningful = (doc.body.textContent || "").trim() || doc.body.querySelector("img,svg,math,table,form,input,textarea,select");
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
  if (mode === "slides" && headings.length < 2) add("warning", "slide-structure", "Add section headings so the slide deck can split content into meaningful slides.");
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
    pdfFixResult,
    pptxLoaded,
    processExpertCommand,
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
    onExportSuccess
  } = props;
  const [writingCheck, setWritingCheck] = React.useState(null);
  const [wordGoalProgress, setWordGoalProgress] = React.useState({ count: 0, goal: 0, percent: 0 });
  const [wordCount, setWordCount] = React.useState(0);
  const [wordGoal, setWordGoal] = React.useState(0);
  const [documentStatistics, setDocumentStatistics] = React.useState(() => _builderTextStatistics(""));
  const [selectionStatistics, setSelectionStatistics] = React.useState(() => ({ active: false, ..._builderTextStatistics("") }));
  const [showWordCountDetails, setShowWordCountDetails] = React.useState(false);
  const [headingOutline, setHeadingOutline] = React.useState([]);
  const [activeHeadingIndex, setActiveHeadingIndex] = React.useState(null);
  const [reviewComments, setReviewComments] = React.useState([]);
  const [activeCommentId, setActiveCommentId] = React.useState("");
  const [showResolvedComments, setShowResolvedComments] = React.useState(false);
  const [findMatchState, setFindMatchState] = React.useState({ count: 0, current: 0 });
  const [draftRecovery, setDraftRecovery] = React.useState(null);
  const [versionHistory, setVersionHistory] = React.useState([]);
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
  const unresolvedReviewCommentCount = reviewComments.filter((comment) => !comment.resolved).length;
  const visibleReviewComments = reviewComments.filter((comment) => showResolvedComments || !comment.resolved);
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
      if (_BUILDER_STYLE_GALLERY.some((item) => item.id === explicitStyle)) namedStyle = explicitStyle;
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
  }, [exportPreviewRef, paragraphContentWidth]);
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
        ribbonCollapsed
      }));
    } catch (_) {
    }
  }, [editorZoom, editorZoomMode, editorPageView, pageSetup, showNavigationPane, navigationPaneTab, navigationPaneWidth, activeRibbonTab, ribbonCollapsed]);
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
  const handleNavigationTabKeyDown = React.useCallback((event, currentTab) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const tabs = ["headings", "pages", "sections", "comments"];
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
      restoreEditorSelection();
      doc.execCommand(command, false, value);
      exportPreviewRef.current?.contentWindow?.focus();
      refreshFormattingState();
      refreshDocumentStats();
    } catch (_) {
    }
  }, [exportPreviewRef, restoreEditorSelection, refreshFormattingState, refreshDocumentStats]);
  const applyBuilderStyle = React.useCallback((styleId) => {
    const definition = _BUILDER_STYLE_GALLERY.find((item) => item.id === styleId) || _BUILDER_STYLE_GALLERY[0];
    const doc = exportPreviewRef.current?.contentDocument;
    const win = exportPreviewRef.current?.contentWindow;
    if (!doc || !win) return;
    try {
      restoreEditorSelection();
      doc.execCommand("formatBlock", false, "<" + definition.tag + ">");
      let selectedNode = win.getSelection?.()?.anchorNode;
      if (selectedNode?.nodeType === 3) selectedNode = selectedNode.parentElement;
      const block = selectedNode?.closest?.("p,h1,h2,h3,blockquote");
      if (block) {
        _BUILDER_STYLE_PROPERTIES.forEach((property) => {
          block.style.removeProperty(property.replace(/[A-Z]/g, (letter) => "-" + letter.toLowerCase()));
        });
        block.removeAttribute("data-allo-style");
        Object.entries(definition.style).forEach(([property, value]) => {
          block.style[property] = value;
        });
        if (definition.id !== "normal") block.setAttribute("data-allo-style", definition.id);
        if (!block.getAttribute("style")) block.removeAttribute("style");
      }
      doc.body?.dispatchEvent(new win.Event("input", { bubbles: true }));
      refreshFormattingState();
      refreshDocumentStats();
    } catch (_) {
      addToast && addToast("The selected style could not be applied.", "error");
    }
  }, [exportPreviewRef, restoreEditorSelection, refreshFormattingState, refreshDocumentStats, addToast]);
  const useFormatPainter = React.useCallback(() => {
    const doc = exportPreviewRef.current?.contentDocument;
    const win = exportPreviewRef.current?.contentWindow;
    if (!doc || !win) return;
    try {
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
      }
      doc.body?.dispatchEvent(new win.Event("input", { bubbles: true }));
      formatPainterRef.current = null;
      setFormatPainterActive(false);
      refreshFormattingState();
      refreshDocumentStats();
      addToast && addToast("Formatting applied.", "success");
    } catch (_) {
      formatPainterRef.current = null;
      setFormatPainterActive(false);
      addToast && addToast("Format Painter could not apply that formatting.", "error");
    }
  }, [exportPreviewRef, restoreEditorSelection, refreshFormattingState, refreshDocumentStats, addToast]);
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
    const index = activeDocumentSection.index || 0;
    const normalized = _builderNormalizeSectionName(sectionNameDraft, index);
    const markers = _builderSectionBreaks(doc);
    const marker = index > 0 ? markers[index - 1] : null;
    const currentName = index === 0 ? _builderNormalizeSectionName(doc.body.getAttribute("data-allo-section-name"), 0) : _builderNormalizeSectionName(marker?.getAttribute("data-allo-section-name"), index);
    setSectionNameDraft(normalized);
    if (normalized === currentName) return true;
    if (index === 0) doc.body.setAttribute("data-allo-section-name", normalized);
    else if (marker) {
      marker.setAttribute("data-allo-section-name", normalized);
      marker.setAttribute("aria-label", `${marker.getAttribute("data-allo-section-break") === "continuous" ? "Continuous" : "Next page"} section break. Starts ${normalized}.`);
    } else return false;
    doc.body.setAttribute("data-allo-user-edited", "1");
    doc.body.dispatchEvent(new doc.defaultView.Event("input", { bubbles: true, inputType: "formatSection" }));
    refreshPageMetrics();
    addToast && addToast(`Section renamed to \u201C${normalized}\u201D.`, "success");
    return true;
  }, [exportPreviewRef, activeDocumentSection.index, sectionNameDraft, refreshPageMetrics, addToast]);
  const setActiveSectionStartType = React.useCallback((startType) => {
    const doc = exportPreviewRef.current?.contentDocument;
    const index = activeDocumentSection.index || 0;
    if (!doc?.body || index === 0) return false;
    const marker = _builderSectionBreaks(doc)[index - 1];
    if (!marker) return false;
    const normalized = startType === "continuous" ? "continuous" : "next-page";
    if (marker.getAttribute("data-allo-section-break") === normalized) return true;
    marker.setAttribute("data-allo-section-break", normalized);
    marker.style.breakBefore = normalized === "continuous" ? "auto" : "page";
    marker.style.pageBreakBefore = normalized === "continuous" ? "auto" : "always";
    const name = _builderNormalizeSectionName(marker.getAttribute("data-allo-section-name"), index);
    marker.setAttribute("aria-label", `${normalized === "continuous" ? "Continuous" : "Next page"} section break. Starts ${name}.`);
    doc.body.setAttribute("data-allo-user-edited", "1");
    doc.body.dispatchEvent(new doc.defaultView.Event("input", { bubbles: true, inputType: "formatSection" }));
    refreshPageMetrics();
    addToast && addToast(normalized === "continuous" ? "Section now continues on the same page." : "Section now starts on the next page.", "success");
    return true;
  }, [exportPreviewRef, activeDocumentSection.index, refreshPageMetrics, addToast]);
  const insertSectionBreak = React.useCallback((startType = "next-page") => {
    const doc = exportPreviewRef.current?.contentDocument;
    if (!doc) return false;
    restoreEditorSelection();
    exportPreviewRef.current?.contentWindow?.focus();
    const inserted = _builderInsertDocumentBreak(doc, "section", { startType });
    if (!inserted) {
      addToast && addToast("Place the caret in the document before inserting a section break.", "info");
      return false;
    }
    refreshDocumentStats();
    window.setTimeout(refreshPageMetrics, 0);
    addToast && addToast(`${inserted.name} inserted${inserted.startType === "continuous" ? " on the same page" : " on the next page"}.`, "success");
    return true;
  }, [exportPreviewRef, restoreEditorSelection, refreshDocumentStats, refreshPageMetrics, addToast]);
  const removeActiveSectionBreak = React.useCallback(() => {
    const doc = exportPreviewRef.current?.contentDocument;
    const index = activeDocumentSection.index || 0;
    if (!doc?.body || index === 0) return false;
    const marker = _builderSectionBreaks(doc)[index - 1];
    if (!marker) return false;
    try {
      const selection = doc.getSelection();
      const range = doc.createRange();
      range.selectNode(marker);
      selection.removeAllRanges();
      selection.addRange(range);
      const deleted = Boolean(doc.execCommand("delete", false, null));
      if (!deleted && marker.isConnected) marker.remove();
      doc.body.setAttribute("data-allo-user-edited", "1");
      doc.body.dispatchEvent(new doc.defaultView.Event("input", { bubbles: true, inputType: "deleteSectionBreak" }));
      refreshDocumentStats();
      window.setTimeout(refreshPageMetrics, 0);
      addToast && addToast("Section break removed; its content was merged with the previous section.", "success");
      return true;
    } catch (_) {
      addToast && addToast("The section break could not be removed.", "error");
      return false;
    }
  }, [exportPreviewRef, activeDocumentSection.index, refreshDocumentStats, refreshPageMetrics, addToast]);
  const insertPageBreak = React.useCallback(() => {
    const doc = exportPreviewRef.current?.contentDocument;
    if (!doc) return false;
    try {
      exportPreviewRef.current?.contentWindow?.focus();
      const inserted = _builderInsertDocumentBreak(doc, "page");
      if (!inserted) {
        addToast && addToast("Place the caret in the document before inserting a page break.", "info");
        return false;
      }
      refreshDocumentStats();
      window.setTimeout(refreshPageMetrics, 0);
      addToast && addToast("Page break inserted.", "success");
      return true;
    } catch (_) {
      return false;
    }
  }, [exportPreviewRef, refreshDocumentStats, refreshPageMetrics, addToast]);
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
      refreshPageMetrics();
      window.setTimeout(refreshTableContext, 0);
      addToast && addToast("Accessible table inserted.", "success");
    } catch (_) {
      addToast && addToast("The table could not be inserted.", "error");
    }
  }, [exportPreviewRef, tableInsertConfig, restoreEditorSelection, refreshDocumentStats, refreshPageMetrics, refreshTableContext, addToast]);
  const editSelectedTable = React.useCallback((action) => {
    const doc = exportPreviewRef.current?.contentDocument;
    const win = exportPreviewRef.current?.contentWindow;
    if (!doc || !win) return;
    try {
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
      refreshPageMetrics();
      refreshTableContext();
    } catch (_) {
      addToast && addToast("The table could not be updated.", "error");
    }
  }, [exportPreviewRef, restoreEditorSelection, refreshDocumentStats, refreshPageMetrics, refreshTableContext, addToast]);
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
      blocks.forEach((block) => {
        const current = _builderParagraphLayoutFromBlock(block);
        const next = _normalizeBuilderParagraphLayout(options.replace ? { ..._BUILDER_PARAGRAPH_DEFAULTS, ...patch } : { ...current, ...patch }, contentWidth);
        const namedStyle = _BUILDER_STYLE_GALLERY.find((item) => item.id === block.getAttribute("data-allo-style"));
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
      });
      const nextUi = _normalizeBuilderParagraphLayout(options.replace ? { ..._BUILDER_PARAGRAPH_DEFAULTS, ...patch } : { ...paragraphLayout, ...patch }, contentWidth);
      setParagraphLayout(nextUi);
      doc.body.setAttribute("data-allo-user-edited", "1");
      doc.body.dispatchEvent(new win.Event("input", { bubbles: true, inputType: "formatParagraph" }));
      refreshFormattingState();
      refreshDocumentStats();
      refreshPageMetrics();
      if (options.restoreFocus !== false) win.focus();
      if (typeof options.announce === "string" && addToast) addToast(options.announce, "success");
      return true;
    } catch (_) {
      if (options.announce !== false && addToast) addToast("The paragraph layout could not be updated.", "error");
      return false;
    }
  }, [exportPreviewRef, pageSetup, paragraphLayout, restoreEditorSelection, refreshFormattingState, refreshDocumentStats, refreshPageMetrics, addToast]);
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
    const result = _builderInsertReviewComment(doc, savedRange, commentText);
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
  }, [exportPreviewRef, promptForBuilderText, openReviewComments, commitReviewCommentMutation, addToast]);
  const replyReviewComment = React.useCallback(async (commentId) => {
    const marker = findLiveReviewMarker(commentId);
    if (!marker) {
      refreshReviewComments();
      return;
    }
    const thread = _builderCommentThread(marker);
    if (thread.length >= 20) {
      addToast && addToast("This comment thread has reached its 20-message limit.", "info");
      return;
    }
    const reply = await promptForBuilderText("Add a reply to this comment thread.", "", {
      title: "Reply to comment",
      confirmText: "Reply",
      multiline: true,
      maxLength: 1200,
      validate: (value) => _builderNormalizeCommentMessage(value) ? null : "Write a reply first."
    });
    if (reply == null) return;
    const at = (/* @__PURE__ */ new Date()).toISOString();
    _builderSetCommentThread(marker, [...thread, { id: `message-${Date.now().toString(36)}`, text: reply, at }]);
    marker.setAttribute("data-allo-comment-resolved", "0");
    _builderSetCommentThread(marker, _builderCommentThread(marker));
    setShowResolvedComments(false);
    setActiveCommentId(commentId);
    commitReviewCommentMutation("Reply added and comment reopened.");
  }, [findLiveReviewMarker, refreshReviewComments, promptForBuilderText, commitReviewCommentMutation, addToast]);
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
    _builderSetCommentThread(marker, _builderCommentThread(marker));
    setActiveCommentId(commentId);
    commitReviewCommentMutation(resolved ? "Comment reopened." : "Comment resolved.");
  }, [findLiveReviewMarker, refreshReviewComments, commitReviewCommentMutation]);
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
        return parent && !parent.closest("script,style,.allo-block-controls,.allo-block-remove,[data-allo-crop-ui],[data-allo-page-element]") && node.nodeValue ? NF.FILTER_ACCEPT : NF.FILTER_REJECT;
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
    const replaced = doc.execCommand("insertText", false, replaceQuery);
    if (!replaced) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const replacementNode = doc.createTextNode(replaceQuery);
      range.insertNode(replacementNode);
      range.setStartAfter(replacementNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    try {
      doc.body.dispatchEvent(new win.Event("input", { bubbles: true }));
    } catch (_) {
    }
    findCursorRef.current = { node: selection.anchorNode, offset: selection.anchorOffset };
    setFindDocumentRevision((value) => value + 1);
    addToast && addToast("Replaced the current match.", "success");
  }, [findQuery, replaceQuery, exportPreviewRef, addToast, findInPreview, findMatchesInText]);
  const replaceAllInPreview = React.useCallback(() => {
    const needle = findQuery.trim();
    const doc = exportPreviewRef.current?.contentDocument;
    if (!doc || !needle) return;
    const win = doc.defaultView;
    let count = 0;
    collectFindTextNodes(doc).forEach((node) => {
      const before = node.nodeValue || "";
      const matches = findMatchesInText(before, needle);
      if (!matches.length) return;
      let after = before;
      matches.slice().reverse().forEach((at) => {
        after = after.slice(0, at) + replaceQuery + after.slice(at + needle.length);
        count += 1;
      });
      node.nodeValue = after;
    });
    if (count) {
      try {
        doc.body.dispatchEvent(new (win?.Event || Event)("input", { bubbles: true }));
      } catch (_) {
      }
      setFindDocumentRevision((value) => value + 1);
      setFindMatchState({ count: countFindMatches(doc, needle), current: 0 });
      addToast && addToast("Replaced " + count + " occurrence" + (count === 1 ? "" : "s") + ".", "success");
    } else addToast && addToast("\u201C" + needle + "\u201D was not found.", "info");
  }, [findQuery, replaceQuery, exportPreviewRef, addToast, collectFindTextNodes, countFindMatches, findMatchesInText]);
  const getCleanBuilderDocument = React.useCallback((options = {}) => {
    const doc = exportPreviewRef.current?.contentDocument;
    if (!doc?.documentElement) return null;
    const clone = doc.documentElement.cloneNode(true);
    _builderClearReviewCommentTransientState(clone);
    if (options?.forExport) _builderStripReviewComments(clone);
    clone.querySelectorAll(".allo-block-controls,.allo-block-remove,.a11y-inspect-badge,[data-allo-crop-ui],#a11y-inspect-styles,#allo-builder-edit-css,script").forEach((node) => node.remove());
    clone.querySelectorAll("[contenteditable]").forEach((node) => node.removeAttribute("contenteditable"));
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
  }, [exportPreviewRef, refreshDocumentStats, refreshReviewComments, refreshActiveHeading, refreshPageMetrics, refreshFormattingState, addToast]);
  const restoreLocalDraft = React.useCallback(() => {
    if (restoreDraftHtml(draftRecovery?.html, "Local draft restored.")) setDraftRecovery(null);
  }, [draftRecovery, restoreDraftHtml]);
  const restoreVersionSnapshot = React.useCallback((snapshot) => {
    if (!snapshot?.html) return;
    persistLocalDraft(snapshot.html, Date.now(), "Restored version");
    restoreDraftHtml(snapshot.html, "Version restored.");
  }, [persistLocalDraft, restoreDraftHtml]);
  const saveVersionSnapshot = React.useCallback(() => {
    const clean = getCleanBuilderDocument();
    if (!clean || !persistLocalDraft(clean.html, Date.now(), "Manual snapshot")) {
      addToast && addToast("Could not save a local version snapshot.", "error");
      return;
    }
    setDraftCaptureState("saved");
    addToast && addToast("Version snapshot saved on this device.", "success");
  }, [getCleanBuilderDocument, persistLocalDraft, addToast]);
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
    const api = window.AlloModules?.AccessibleOfficeExport;
    const doc = exportPreviewRef.current?.contentDocument;
    if (!api || typeof api.build !== "function") {
      addToast && addToast("The accessible Office exporter is still loading. Try again in a moment.", "info");
      return;
    }
    if (!doc) return;
    const preflight = runBuilderPreflight(format, false);
    if (preflight.errors) {
      addToast && addToast("Office export stopped: fix the blocking preflight issues first.", "error");
      return;
    }
    setAltExportBusy(format);
    try {
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
    try {
      resumeReviewComments = _builderSuspendReviewComments(exportPreviewRef.current?.contentDocument?.documentElement);
      await executeExportFromPreview();
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
      exportActionLockRef.current = false;
      if (mountedRef.current) setExportActionBusy(false);
    }
  }, [executeExportFromPreview, exportPreviewRef, runBuilderPreflight, exportPreviewMode, addToast, onExportSuccess]);
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
  const hasAssessmentContent = (history || []).some((h) => h && (h.type === "quiz" || h.type === "assessment" || h.type === "stem-assessment"));
  const showDisplayModes = hasGlossary || hasTimeline || hasBrainstorm || hasConceptSort;
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
    /* @__PURE__ */ React.createElement("div", { ref: exportDialogRef, tabIndex: -1, role: "dialog", "aria-modal": "true", "aria-labelledby": "document-builder-title", className: `bg-white shadow-2xl flex flex-col lg:flex-row w-full overflow-y-auto lg:overflow-hidden focus-visible:outline focus-visible:outline-4 focus-visible:outline-indigo-700 focus-visible:outline-offset-2 ${isFocusMode ? "rounded-none max-w-none max-h-none h-full" : "rounded-2xl max-w-[95vw] max-h-[95vh]"}`, inert: pendingImageFile ? true : void 0, "aria-hidden": pendingImageFile ? "true" : void 0, onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: `${isFocusMode ? "hidden" : "w-full lg:w-72"} shrink-0 bg-gradient-to-b from-slate-50 to-white border-b lg:border-b-0 lg:border-r border-slate-200 overflow-visible lg:overflow-y-auto p-4 space-y-3` }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-1" }, /* @__PURE__ */ React.createElement("h2", { id: "document-builder-title", className: "text-sm font-black text-slate-800 flex items-center gap-2" }, "\u{1F6E0}\uFE0F Document Builder"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement("button", { onClick: () => {
      if (typeof window.AlloToggleTheme === "function") window.AlloToggleTheme();
    }, className: "p-1.5 rounded-full hover:bg-indigo-50 text-slate-600 transition-colors text-sm", "aria-label": t("a11y.toggle_theme") || "Toggle color theme", title: theme === "contrast" ? t("theme.high_contrast") || "High Contrast" : theme === "dark" ? t("theme.dark") || "Dark Mode" : t("theme.light") || "Light Mode" }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, theme === "contrast" ? "\u{1F441}" : theme === "dark" ? "\u{1F319}" : "\u2600\uFE0F")), /* @__PURE__ */ React.createElement("span", { className: "text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono" }, exportPreviewMode === "worksheet" ? "Worksheet" : exportPreviewMode === "html" ? "HTML" : exportPreviewMode === "slides" ? "Slides" : "PDF"), /* @__PURE__ */ React.createElement("button", { onClick: () => setShowExportPreview(false), className: "p-2 ml-1 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors", "data-help-key": "doc_builder_close_btn", "aria-label": t("a11y.close_doc_builder") }, /* @__PURE__ */ React.createElement(X, { size: 20 })))), /* @__PURE__ */ React.createElement("button", { type: "button", "aria-controls": "document-builder-preview", onClick: () => exportPreviewRef.current?.focus(), className: "sr-only focus:not-sr-only focus:relative focus:z-10 focus:rounded focus:bg-indigo-700 focus:px-3 focus:py-2 focus:text-sm focus:font-bold focus:text-white" }, "Skip to editable preview"), exportPreviewSource === "remediation" && /* @__PURE__ */ React.createElement("div", { className: "bg-emerald-50 border border-emerald-300 rounded-lg px-2.5 py-1.5 text-[11px] text-emerald-800", role: "status" }, /* @__PURE__ */ React.createElement("span", { className: "font-bold" }, "\u267F ", t("export_preview.remediation_banner_title") || "Editing the remediated document."), " ", t("export_preview.remediation_banner_body") || "Your edits here are saved back into it when you close the builder, so the Tagged PDF / Word / PowerPoint downloads include them."), /* @__PURE__ */ React.createElement("h3", { className: "text-[11px] font-black text-indigo-600 uppercase tracking-[2px] flex items-center gap-2 pt-1" }, /* @__PURE__ */ React.createElement("span", { className: "flex-1 h-px bg-indigo-100" }), "Quick Start", /* @__PURE__ */ React.createElement("span", { className: "flex-1 h-px bg-indigo-100" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-slate-600 uppercase mb-1.5" }, "Presets"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-1" }, Object.entries(BUILT_IN_PRESETS).map(([key, preset]) => /* @__PURE__ */ React.createElement(
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
    }, className: "mt-1.5 w-full px-2 py-1.5 border border-dashed border-slate-300 rounded-lg text-[11px] font-bold text-slate-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all" }, "+ Save Current as Preset")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-slate-600 uppercase mb-1.5" }, "Format"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-1", role: "radiogroup", "aria-label": "Export format", onKeyDown: handleRadioGroupKeyDown }, [["print", "\u{1F4C4} PDF"], ["worksheet", "\u{1F4DD} Worksheet"], ["html", "\u{1F4BB} HTML"], ["slides", "\u{1F4CA} Slides"]].map(([m, label]) => /* @__PURE__ */ React.createElement("button", { key: m, role: "radio", "aria-checked": exportPreviewMode === m, tabIndex: exportPreviewMode === m ? 0 : -1, onClick: () => setExportPreviewMode(m), className: `flex-1 text-xs font-bold py-1.5 rounded-lg transition-all ${exportPreviewMode === m ? "bg-indigo-600 text-white" : "bg-white border border-slate-400 text-slate-600 hover:bg-slate-100"}` }, label)))), /* @__PURE__ */ React.createElement("h3", { className: "text-[11px] font-black text-indigo-600 uppercase tracking-[2px] flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "flex-1 h-px bg-indigo-100" }), "Appearance", /* @__PURE__ */ React.createElement("span", { className: "flex-1 h-px bg-indigo-100" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-slate-600 uppercase mb-1.5 flex items-center justify-between" }, /* @__PURE__ */ React.createElement("span", null, "Style"), setShowBrandProfileEditor && /* @__PURE__ */ React.createElement(
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
    )), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-slate-600 shrink-0" }, "Size:"), /* @__PURE__ */ React.createElement(
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
    ))))), /* @__PURE__ */ React.createElement("div", { className: "bg-slate-50 rounded-lg border border-slate-400 p-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-1" }, /* @__PURE__ */ React.createElement("span", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Word Count"), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] font-mono text-slate-600", "aria-live": "polite" }, wordCount.toLocaleString(), " words")), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2" }, /* @__PURE__ */ React.createElement("label", { className: "text-[11px] text-slate-600 shrink-0", htmlFor: "word-goal-input" }, "Goal:"), /* @__PURE__ */ React.createElement(
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
        ["includeSimplified", "\u{1F4D6} Leveled Text", "simplified"],
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
        return /* @__PURE__ */ React.createElement("label", { key, className: "flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5", title: tooltip }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: exportConfig[key], onChange: (e) => setExportConfigAndRefresh((p) => ({ ...p, [key]: e.target.checked })), className: "rounded" }), /* @__PURE__ */ React.createElement("span", null, label, isTeacherOnly && /* @__PURE__ */ React.createElement("span", { className: "ml-1 text-[11px] text-indigo-700 font-bold" }, "(also in student copy)")));
      });
    })())), (() => {
      const skipped = getSkippedResources();
      if (skipped.length === 0) return null;
      const skippedTypes = new Set((Array.isArray(history) ? history : []).filter((item) => item && (item.type === "adventure" || item.type === "persona")).map((item) => item.type));
      return /* @__PURE__ */ React.createElement("div", { className: "bg-amber-50 border border-amber-200 rounded-lg p-2" }, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] font-bold text-amber-700 mb-1" }, "Interactive resources not included:"), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-amber-600" }, skipped.join(", ")), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-amber-700 mt-1 italic" }, "These are interactive tools that can't be rendered as static documents."), skippedTypes.has("adventure") && /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-amber-800 mt-1" }, "\u{1F4D6} Adventure stories have their own export: open the adventure and use ", /* @__PURE__ */ React.createElement("strong", null, "Export Storybook"), " for a finished, self-contained HTML book (optionally narrated with saved TTS)."), skippedTypes.has("persona") && /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-amber-800 mt-1" }, "\u{1F3AD} Persona conversations: use ", /* @__PURE__ */ React.createElement("strong", null, "Save private session"), " in the persona view \u2014 downloads a private JSON artifact plus a read-anywhere HTML transcript with narration."));
    })(), /* @__PURE__ */ React.createElement("h3", { className: "text-[11px] font-black text-indigo-600 uppercase tracking-[2px] flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "flex-1 h-px bg-indigo-100" }), "Export", /* @__PURE__ */ React.createElement("span", { className: "flex-1 h-px bg-indigo-100" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-slate-600 uppercase mb-1.5" }, "Options"), /* @__PURE__ */ React.createElement("div", { className: "space-y-1" }, /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: exportConfig.includeTeacherKey, onChange: (e) => setExportConfigAndRefresh((p) => ({ ...p, includeTeacherKey: e.target.checked })), className: "rounded" }), "\u{1F4CE} Teacher Answer Key"), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: exportConfig.includeStudentResponses, onChange: (e) => setExportConfigAndRefresh((p) => ({ ...p, includeStudentResponses: e.target.checked })), className: "rounded" }), "\u{1F4DD} Student Responses"), /* @__PURE__ */ React.createElement("div", { className: "mt-2 rounded-lg border border-indigo-200 bg-indigo-50 p-2" }, /* @__PURE__ */ React.createElement("label", { className: "block text-[11px] font-bold text-indigo-900", htmlFor: "alloflow-export-due-at" }, "Assignment due date and time (optional)"), /* @__PURE__ */ React.createElement("input", { id: "alloflow-export-due-at", type: "datetime-local", value: exportConfig.dueAt ? (() => {
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
    }, className: "mt-1 w-full rounded border border-indigo-300 bg-white px-2 py-1.5 text-xs text-slate-800", "aria-describedby": "alloflow-export-due-help" }), /* @__PURE__ */ React.createElement("div", { id: "alloflow-export-due-help", className: "mt-1 text-[10px] leading-snug text-indigo-800" }, "Late status is calculated only when this exact instant and a submission timestamp are available. The browser records your IANA timezone; missing work is never inferred here."), exportConfig.dueAt && /* @__PURE__ */ React.createElement("button", { type: "button", className: "mt-1 text-[10px] font-semibold text-indigo-800 underline", onClick: () => setExportConfigAndRefresh((p) => ({ ...p, dueAt: "", dueTimeZone: "" })) }, "Clear due date")), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5", title: "For graded work: removes the hidden self-check answers and the 'Check my answers' button from the exported file, and leaves the teacher key out even if it's checked above. Students can still fill in and save/submit their answers \u2014 they just can't look up or self-grade against the key." }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: exportConfig.assessmentMode === true, onChange: (e) => setExportConfigAndRefresh((p) => ({ ...p, assessmentMode: e.target.checked })), className: "rounded" }), "\u{1F512} Assessment mode (no embedded answers)"), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: exportConfig.singleFileHtml, onChange: (e) => setExportConfigAndRefresh((p) => ({ ...p, singleFileHtml: e.target.checked })), className: "rounded" }), "\u{1F4C4} Single file (.html, no zip)"))), showDisplayModes && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-slate-600 uppercase mb-1.5" }, "Display modes"), hasGlossary && /* @__PURE__ */ React.createElement("div", { className: `mb-2 ${exportConfig.includeGlossary ? "" : "opacity-50"}` }, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-semibold text-slate-700 mb-1 px-1" }, "Glossary"), /* @__PURE__ */ React.createElement("div", { className: "space-y-0.5" }, /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5" }, /* @__PURE__ */ React.createElement("input", { type: "radio", name: "glossaryDisplayMode", checked: (exportConfig.glossaryDisplayMode || "table") === "table", onChange: () => setExportConfigAndRefresh((p) => ({ ...p, glossaryDisplayMode: "table" })), disabled: !exportConfig.includeGlossary }), "Table (default)"), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5" }, /* @__PURE__ */ React.createElement("input", { type: "radio", name: "glossaryDisplayMode", checked: exportConfig.glossaryDisplayMode === "flash-cards", onChange: () => setExportConfigAndRefresh((p) => ({ ...p, glossaryDisplayMode: "flash-cards" })), disabled: !exportConfig.includeGlossary }), "\u{1F0CF} Flash cards (fold-and-cut for paper, flip for digital)"), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5" }, /* @__PURE__ */ React.createElement("input", { type: "radio", name: "glossaryDisplayMode", checked: exportConfig.glossaryDisplayMode === "language-cards", onChange: () => setExportConfigAndRefresh((p) => ({ ...p, glossaryDisplayMode: "language-cards" })), disabled: !exportConfig.includeGlossary }), "\u{1F310} Language cards (emphasizes translations)")), (exportConfig.glossaryDisplayMode || "table") === "table" && /* @__PURE__ */ React.createElement("div", { className: "mt-2 pl-1" }, /* @__PURE__ */ React.createElement("div", { className: "text-[10px] font-semibold text-slate-500 mb-1" }, "Image size"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-1" }, [
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
    })))), hasBrainstorm && /* @__PURE__ */ React.createElement("div", { className: `mb-2 ${exportConfig.includeBrainstorm ? "" : "opacity-50"}` }, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-semibold text-slate-700 mb-1 px-1" }, "Brainstorm"), /* @__PURE__ */ React.createElement("div", { className: "space-y-0.5" }, /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5" }, /* @__PURE__ */ React.createElement("input", { type: "radio", name: "brainstormDisplayMode", checked: (exportConfig.brainstormDisplayMode || "grid") === "grid", onChange: () => setExportConfigAndRefresh((p) => ({ ...p, brainstormDisplayMode: "grid" })), disabled: !exportConfig.includeBrainstorm }), "Card grid (default)"), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5" }, /* @__PURE__ */ React.createElement("input", { type: "radio", name: "brainstormDisplayMode", checked: exportConfig.brainstormDisplayMode === "mindmap", onChange: () => setExportConfigAndRefresh((p) => ({ ...p, brainstormDisplayMode: "mindmap" })), disabled: !exportConfig.includeBrainstorm }), "\u{1F31F} Mind-map graphic organizer"))), hasConceptSort && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: exportConfig.conceptSortInteractive !== false, onChange: (e) => setExportConfigAndRefresh((p) => ({ ...p, conceptSortInteractive: e.target.checked })), className: "rounded" }), "\u{1F9E9} Concept sort: drag-to-sort on digital"), /* @__PURE__ */ React.createElement("div", { className: "mt-1 pl-1" }, /* @__PURE__ */ React.createElement("div", { className: "text-[10px] font-semibold text-slate-500 mb-1" }, "Sort strip image size"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-1" }, [
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
              lints = await linter.lint(blockText);
            } catch (_) {
              continue;
            }
            if (!mountedRef.current || runId !== writingCheckRunRef.current) return;
            for (const l of lints) {
              try {
                const span = l.span();
                const sugg = (l.suggestions ? l.suggestions() : []).map((s) => s.get_replacement_text ? s.get_replacement_text() : "").filter(Boolean).slice(0, 3);
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
          let _ok = false;
          try {
            const _range = doc.createRange();
            _range.setStart(hit.node, hit.local);
            _range.setEnd(hit.node, hit.local + _badLen);
            const _sel = (doc.defaultView || window).getSelection();
            _sel.removeAllRanges();
            _sel.addRange(_range);
            _ok = doc.execCommand("insertText", false, replacement);
          } catch (_) {
            _ok = false;
          }
          if (!_ok) {
            const raw = hit.node.textContent;
            hit.node.textContent = raw.slice(0, hit.local) + replacement + raw.slice(hit.local + _badLen);
          }
          try {
            if (doc.body) doc.body.setAttribute("data-allo-user-edited", "1");
          } catch (_) {
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
      return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-slate-600 uppercase mb-1.5" }, "\u{1F4DD} ", t("export_preview.writing.heading") || "Writing Check"), /* @__PURE__ */ React.createElement("button", { onClick: runWritingCheck, "data-help-key": "doc_builder_writing_check_btn", disabled: wc && wc.status === "loading", "aria-busy": !!(wc && wc.status === "loading"), className: "w-full px-3 py-2 bg-teal-100 text-teal-800 rounded-lg text-xs font-bold hover:bg-teal-200 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5" }, wc && wc.status === "loading" ? t("export_preview.writing.checking") || "\u23F3 Checking\u2026 (first run downloads the checker)" : t("export_preview.writing.run") || "\u{1F4DD} Check grammar (English)"), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-500 mt-1" }, t("export_preview.writing.disclosure") || "Runs entirely on this device \u2014 no text leaves the browser. English only; the checker is a ~10 MB download on first use (checks are instant once loaded; the download may repeat in a fresh session). Spelling is underlined by your browser as you type."), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-500 mt-1" }, t("export_preview.writing.spell_hint") || "\u{1F4A1} To fix a spelling underline, right-click the word in the preview \u2014 your browser lists corrections."), exportPreviewSource === "remediation" && wc && /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-amber-700 mt-1" }, t("export_preview.writing.remediation_caution") || "\u26A0 This is a remediated document \u2014 its wording comes from the source PDF. Apply grammar changes thoughtfully; the original author\u2019s phrasing may be intentional."), wc && wc.status === "error" && /* @__PURE__ */ React.createElement("div", { role: "alert", "aria-live": "assertive", className: "mt-1.5 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded p-1.5" }, wc.error), wc && wc.status === "done" && wc.items.length === 0 && /* @__PURE__ */ React.createElement("div", { role: "status", "aria-live": "polite", className: "mt-1.5 text-[11px] text-green-700 bg-green-50 border border-green-200 rounded p-1.5" }, "\u2713 ", t("export_preview.writing.clean") || "No grammar suggestions found."), wc && wc.status === "done" && wc.items.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "mt-1.5 space-y-1.5 max-h-64 overflow-y-auto" }, /* @__PURE__ */ React.createElement("div", { role: "status", "aria-live": "polite", className: "text-[10px] font-bold text-slate-600" }, wc.items.length, " ", t("export_preview.writing.suggestions") || "suggestion(s)", wc.capped ? " (first 150 shown)" : "", " \u2014 ", t("export_preview.writing.suggestions_note") || "nothing is changed unless you Apply it", ":"), wc.items.map((item, ii) => /* @__PURE__ */ React.createElement("div", { key: ii, className: "bg-white border border-slate-200 rounded-lg p-1.5 text-[11px]" }, /* @__PURE__ */ React.createElement("button", { onClick: () => _locate(item, true), className: "text-left w-full hover:underline", title: t("export_preview.writing.locate_title") || "Scroll the preview to this spot" }, /* @__PURE__ */ React.createElement("span", { className: "text-slate-700" }, item.message), /* @__PURE__ */ React.createElement("span", { className: "block text-slate-500 italic mt-0.5" }, item.snippet)), /* @__PURE__ */ React.createElement("div", { className: "flex gap-1 mt-1 flex-wrap items-center" }, item.suggestions.map((s, si) => /* @__PURE__ */ React.createElement("button", { key: si, onClick: () => _apply(item, s), className: "px-1.5 py-0.5 bg-teal-50 border border-teal-300 text-teal-800 rounded text-[10px] font-bold hover:bg-teal-100", title: (t("export_preview.writing.apply_title") || "Replace") + ' "' + item.bad + '"' }, "\u2192 ", s || "(remove)")), /* @__PURE__ */ React.createElement("button", { onClick: () => _dismiss(item), className: "px-1.5 py-0.5 bg-slate-50 border border-slate-300 text-slate-600 rounded text-[10px] font-bold hover:bg-slate-100 ml-auto", title: t("export_preview.writing.keep_title") || "Keep the original wording and dismiss this suggestion" }, "\u2713 ", t("export_preview.writing.keep") || "Keep as-is"))))));
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
    ), exportAuditResult && exportAuditResult.score < 0 && /* @__PURE__ */ React.createElement("div", { role: "alert", "aria-live": "assertive", className: "mt-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-[11px] font-bold text-amber-900" }, exportAuditResult.summary), exportAuditResult && exportAuditResult.score >= 0 && /* @__PURE__ */ React.createElement("div", { role: "status", "aria-live": "polite", "aria-atomic": "true", className: "mt-2 space-y-2" }, /* @__PURE__ */ React.createElement("div", { className: `text-center p-3 rounded-xl ${exportAuditResult.score >= 80 ? "bg-green-50 border border-green-200" : exportAuditResult.score >= 60 ? "bg-amber-50 border border-amber-200" : "bg-red-50 border border-red-200"}` }, /* @__PURE__ */ React.createElement("div", { className: `text-2xl font-black ${exportAuditResult.score >= 80 ? "text-green-700" : exportAuditResult.score >= 60 ? "text-amber-700" : "text-red-700"}` }, exportAuditResult.score, "/100"), /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Accessibility Automated Score")), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-600" }, exportAuditResult.summary), exportAuditResult.axeViolations != null && exportAuditResult.eaViolations != null && /* @__PURE__ */ React.createElement("div", { className: `rounded-lg border p-2 text-[11px] ${exportAuditResult.deterministicConsensus === "clean" ? "bg-green-50 border-green-200 text-green-800" : "bg-amber-50 border-amber-200 text-amber-800"}` }, exportAuditResult.deterministicConsensus === "clean" ? "\u2713 Two independent rule engines agree (axe-core + IBM Equal Access): 0 violations." : `Rule engines \u2014 axe-core: ${exportAuditResult.axeViolations}, IBM Equal Access: ${exportAuditResult.eaViolations} violation(s).`, exportAuditResult.eaPotential > 0 && /* @__PURE__ */ React.createElement("span", { className: "block mt-1 text-slate-500" }, "IBM Equal Access also flags ", exportAuditResult.eaPotential, " item(s) for human review.")), exportAuditResult.eaViolations == null && exportAuditResult.axeViolations != null && /* @__PURE__ */ React.createElement("div", { className: "text-[10px] text-slate-500 italic" }, "Second deterministic engine (IBM Equal Access) unavailable \u2014 showing axe-core only."), exportAuditResult.issues?.length > 0 && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-red-600 uppercase mb-1" }, "Issues (", exportAuditResult.issues.length, ")"), exportAuditResult.issues.slice(0, 5).map((issue, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "text-[11px] text-slate-600 mb-1 flex items-start gap-1" }, /* @__PURE__ */ React.createElement("span", { className: "text-red-600 shrink-0" }, "\u25CF"), /* @__PURE__ */ React.createElement("span", null, typeof issue === "string" ? issue : issue.issue, issue.wcag ? ` (${issue.wcag})` : ""))), exportAuditResult.issues.length > 5 && /* @__PURE__ */ React.createElement("div", { className: "text-[11px] text-slate-600 italic" }, "+", exportAuditResult.issues.length - 5, " more")), exportAuditResult.passes?.length > 0 && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-bold text-green-700 uppercase mb-1" }, "Passes (", exportAuditResult.passes.length, ")"), exportAuditResult.passes.slice(0, 3).map((pass, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "text-[11px] text-green-700 mb-0.5 flex items-start gap-1" }, /* @__PURE__ */ React.createElement("span", { className: "text-green-500" }, "\u2713"), " ", pass))), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-indigo-700 italic" }, "Use the A11y Inspect toggle above to see and fix issues visually, then re-audit."), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-600 italic" }, "Automated checks (axe-core + IBM Equal Access) find many problems but can\u2019t confirm full WCAG 2.2 AA conformance \u2014 a manual screen-reader, keyboard, zoom/reflow, and forced-colors pass is still needed. The score above includes an AI review and is a guide, not a certification.")))), /* @__PURE__ */ React.createElement("div", { className: `flex-1 flex flex-col min-w-0 ${isFocusMode ? "min-h-0" : "min-h-[60vh] lg:min-h-0"}` }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 border-b border-slate-200 bg-white shrink-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-3" }, /* @__PURE__ */ React.createElement("h3", { className: "text-sm font-bold text-slate-700" }, isFocusMode ? "Document Builder" : "Live Preview"), /* @__PURE__ */ React.createElement("span", { className: "text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono" }, exportPreviewMode === "worksheet" ? "Worksheet" : exportPreviewMode === "html" ? "HTML" : exportPreviewMode === "slides" ? "Slides" : "PDF"), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-indigo-700 font-medium" }, isFocusMode ? "Focus mode \xB7 write without distractions" : "Focus the preview and edit text directly"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: openWordCountDetails, "aria-expanded": showWordCountDetails, "aria-controls": "builder-word-count-panel", "aria-keyshortcuts": "Control+Shift+G", className: "hidden md:inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-indigo-100 hover:text-indigo-800", title: "Open detailed Word Count (Ctrl+Shift+G)" }, selectionStatistics.active ? `Words: ${selectionStatistics.words.toLocaleString()} of ${wordCount.toLocaleString()}` : `Words: ${wordCount.toLocaleString()}`)), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: saveVersionSnapshot, className: "text-xs font-bold flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100", "aria-label": "Save a local version snapshot", title: "Save a local restore point (Ctrl+S)" }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u25A3"), " Save"), /* @__PURE__ */ React.createElement(
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
      exportPreviewMode === "worksheet" ? "Print Worksheet" : exportPreviewMode === "html" ? "Download HTML" : exportPreviewMode === "slides" ? pptxLoaded ? "Export Slides" : "Loading..." : "Download PDF"
    ), /* @__PURE__ */ React.createElement("details", { className: "relative" }, /* @__PURE__ */ React.createElement("summary", { className: "bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold px-2.5 py-2 rounded-lg cursor-pointer flex items-center gap-1 transition-colors list-none" }, "\u267F Alt Formats ", /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-slate-600" }, "\u25BE")), /* @__PURE__ */ React.createElement("div", { className: "absolute right-0 top-full mt-1 bg-white border border-slate-400 rounded-xl shadow-xl p-2 z-50 w-72 space-y-1" }, /* @__PURE__ */ React.createElement("div", { className: "text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 pt-1" }, "Editable documents"), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: !!altExportBusy, onClick: () => runOfficeExport("docx"), className: "w-full text-left px-2 py-1.5 text-[11px] font-medium text-sky-700 hover:bg-sky-50 rounded-lg disabled:opacity-50" }, altExportBusy === "docx" ? "Building Word..." : "Accessible Word (.docx)"), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: !!altExportBusy, onClick: () => runOfficeExport("odt"), className: "w-full text-left px-2 py-1.5 text-[11px] font-medium text-teal-700 hover:bg-teal-50 rounded-lg disabled:opacity-50" }, altExportBusy === "odt" ? "Building ODT..." : "OpenDocument (.odt)"), qtiAssessments.length > 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 pt-1" }, "Assessment packages"), qtiAssessments.length > 1 && /* @__PURE__ */ React.createElement("select", { "aria-label": "Quiz to export as QTI", value: selectedQtiKey, onChange: (event) => setSelectedQtiKey(event.target.value), disabled: !!altExportBusy, className: "w-full border border-slate-300 rounded-md px-2 py-1 text-[11px] bg-white" }, qtiAssessments.map(({ item, key }, index) => /* @__PURE__ */ React.createElement("option", { key, value: key }, item.title || `Quiz ${index + 1}`))), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: !!altExportBusy, onClick: () => runPackageExport("qti"), className: "w-full text-left px-2 py-1.5 text-[11px] font-medium text-violet-700 hover:bg-violet-50 rounded-lg disabled:opacity-50" }, altExportBusy === "qti" ? "Building QTI..." : "QTI quiz package"), /* @__PURE__ */ React.createElement("div", { className: "px-2 text-[10px] leading-tight text-slate-500" }, "QTI uses the selected quiz's structured questions and answers.")), h5pActivities.length > 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 pt-1" }, "Interactive H5P"), h5pActivities.length > 1 && /* @__PURE__ */ React.createElement("select", { "aria-label": "Activity to export as H5P", value: selectedH5PKey, onChange: (event) => setSelectedH5PKey(event.target.value), disabled: !!altExportBusy, className: "w-full border border-slate-300 rounded-md px-2 py-1 text-[11px] bg-white" }, h5pActivities.map(({ item, key }, index) => /* @__PURE__ */ React.createElement("option", { key, value: key }, item.title || `${item.type === "quiz" ? "Quiz" : "Study cards"} ${index + 1}`))), /* @__PURE__ */ React.createElement("button", { type: "button", "aria-describedby": "h5p-compatibility-summary", disabled: !!altExportBusy || !h5pCompatibility.ready, onClick: () => runPackageExport("h5p"), className: "w-full text-left px-2 py-1.5 text-[11px] font-medium text-fuchsia-700 hover:bg-fuchsia-50 rounded-lg disabled:opacity-50" }, altExportBusy === "h5p" ? "Building H5P..." : "H5P interactive activity (.h5p)"), /* @__PURE__ */ React.createElement("div", { id: "h5p-compatibility-summary", role: "status", className: `px-2 text-[10px] leading-tight ${h5pCompatibility.ready ? h5pCompatibility.omitted || h5pCompatibility.omittedMedia ? "text-amber-700" : "text-emerald-700" : "text-red-700"}` }, h5pCompatibility.valid, " of ", h5pCompatibility.total, " ", h5pCompatibility.unit, h5pCompatibility.total === 1 ? "" : "s", " ready for ", h5pCompatibility.library || "H5P", ".", h5pCompatibility.omitted > 0 ? ` ${h5pCompatibility.omitted} incomplete or incompatible.` : "", h5pCompatibility.adapted > 0 ? ` ${h5pCompatibility.adapted} adapted to equivalent H5P interactions.` : "", h5pCompatibility.manualReview > 0 ? ` ${h5pCompatibility.manualReview} ungraded/manual-review.` : "", h5pCompatibility.embeddedMedia > 0 ? ` ${h5pCompatibility.embeddedMedia} embedded media asset(s) will be packaged.` : "", h5pCompatibility.omittedMedia > 0 ? ` ${h5pCompatibility.omittedMedia} external or unsupported media asset(s) will be omitted.` : ""), /* @__PURE__ */ React.createElement("div", { className: "px-2 text-[10px] leading-tight text-slate-500" }, "MCQ-only quizzes export as Single Choice Set. Mixed assessments export as Question Set with Multiple Choice, Fill in the Blanks, and ungraded Essay adaptations. The destination needs the referenced H5P libraries installed.")), /* @__PURE__ */ React.createElement("div", { className: "text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 pt-1" }, "Content package"), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: !!altExportBusy, onClick: () => runPackageExport("ims"), className: "w-full text-left px-2 py-1.5 text-[11px] font-medium text-violet-700 hover:bg-violet-50 rounded-lg disabled:opacity-50" }, altExportBusy === "ims" ? "Building IMS..." : "IMS content package"), /* @__PURE__ */ React.createElement("div", { className: "px-2 text-[10px] leading-tight text-slate-500" }, "IMS includes the current editable Builder document."), /* @__PURE__ */ React.createElement("div", { className: "text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 pt-1" }, "Reading & text"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
      const doc = exportPreviewRef.current?.contentDocument;
      if (!doc) return;
      let text = "";
      try {
        const _tClone = doc.body.cloneNode(true);
        _builderStripReviewComments(_tClone);
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
        const _mClone = doc.documentElement.cloneNode(true);
        _mClone.querySelectorAll(".allo-block-controls, .allo-block-remove, .a11y-inspect-badge, [data-allo-crop-ui], #a11y-inspect-styles, #allo-builder-edit-css, script, style").forEach((el) => el.remove());
        _builderStripEditorBreakMetadata(_mClone);
        _builderStripReviewComments(_mClone);
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
            } else if (ty === "image" && d && d.prompt) {
              out.push("_Image: " + esc(d.prompt) + "_", "");
            } else {
              const tx = d && (d.text || d.content || d.summary) || "";
              if (tx) out.push(esc(tx).trim(), "");
            }
          });
        } else if (doc) {
          let html = "";
          try {
            const _mdClone = doc.documentElement.cloneNode(true);
            _mdClone.querySelectorAll(".allo-block-controls, .allo-block-remove, .a11y-inspect-badge, [data-allo-crop-ui], #a11y-inspect-styles, #allo-builder-edit-css, script, style").forEach((el) => el.remove());
            _builderStripEditorBreakMetadata(_mdClone);
            _builderStripReviewComments(_mdClone);
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
        const _clone = doc.documentElement.cloneNode(true);
        try {
          _clone.querySelectorAll(".allo-block-controls, .allo-block-remove, .a11y-inspect-badge, [data-allo-crop-ui], #a11y-inspect-styles, #allo-builder-edit-css, script").forEach((el) => el.remove());
          _clone.querySelectorAll("[data-allo-crop-tabindex-added]").forEach((el) => {
            const added = el.getAttribute("data-allo-crop-tabindex-added") === "added";
            el.removeAttribute("data-allo-crop-tabindex-added");
            if (added) el.removeAttribute("tabindex");
            el.removeAttribute("aria-keyshortcuts");
          });
          _clone.querySelectorAll("[contenteditable]").forEach((el) => el.removeAttribute("contenteditable"));
          _builderStripEditorBreakMetadata(_clone);
          _builderStripReviewComments(_clone);
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
          for (const line of norm.replace(/\r\n?/g, "\n").split("\n")) {
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
          const brf = out.join("\r\n");
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
    }, className: "w-full text-left px-2 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 rounded-lg disabled:opacity-50" }, altExportBusy === "brf" ? "Building Braille..." : "\u283F Electronic Braille (.brf)"))))), preflightResult && /* @__PURE__ */ React.createElement("div", { className: `border-b px-3 py-2 text-xs ${preflightResult.errors ? "bg-red-50 border-red-300 text-red-900" : preflightResult.warnings ? "bg-amber-50 border-amber-300 text-amber-900" : "bg-green-50 border-green-300 text-green-900"}`, role: "status", "aria-live": "polite" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("strong", null, preflightResult.errors ? "Export blocked by preflight" : preflightResult.warnings ? "Preflight passed with warnings" : "Preflight passed"), /* @__PURE__ */ React.createElement("span", null, preflightResult.errors, " error", preflightResult.errors === 1 ? "" : "s", " / ", preflightResult.warnings, " warning", preflightResult.warnings === 1 ? "" : "s"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setPreflightResult(null), className: "ml-auto underline font-bold" }, "Dismiss")), !!preflightResult.issues.length && /* @__PURE__ */ React.createElement("ul", { className: "mt-1 list-disc pl-5 space-y-0.5" }, preflightResult.issues.map((issue, index) => /* @__PURE__ */ React.createElement("li", { key: issue.code + "-" + index }, /* @__PURE__ */ React.createElement("strong", null, issue.severity === "error" ? "Fix:" : "Review:"), " ", issue.message)))), draftRecovery && /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900", role: "status", "aria-live": "polite" }, /* @__PURE__ */ React.createElement("span", { className: "font-bold" }, "Local draft available"), /* @__PURE__ */ React.createElement("span", null, "Saved ", draftRecovery.at ? new Date(draftRecovery.at).toLocaleString() : "recently", " on this device."), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: restoreLocalDraft, className: "rounded bg-amber-700 px-2 py-1 font-bold text-white hover:bg-amber-800" }, "Restore draft"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: discardLocalDraft, className: "rounded px-2 py-1 font-semibold text-amber-800 underline hover:text-amber-950" }, "Dismiss")), /* @__PURE__ */ React.createElement("div", { className: "flex shrink-0 items-center gap-1 overflow-x-auto border-b border-slate-300 bg-slate-100 px-2 py-1", role: "tablist", "aria-label": "Document Builder ribbon" }, [["home", "Home"], ["insert", "Insert"], ["layout", "Layout"], ["review", "Review"], ["view", "View"], ["expert", isAgentRunning ? "Expert \u2022" : "Expert"]].map(([tab, label]) => {
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
    }), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setRibbonCollapsed((value) => !value), "aria-expanded": !ribbonCollapsed, "aria-controls": `builder-ribbon-panel-${activeRibbonTab}`, className: "ml-auto rounded px-2 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-white hover:text-indigo-700", title: ribbonCollapsed ? "Expand the ribbon" : "Collapse the ribbon" }, ribbonCollapsed ? "Expand ribbon" : "Collapse ribbon")), !ribbonCollapsed && activeRibbonTab === "review" && /* @__PURE__ */ React.createElement("div", { id: "builder-ribbon-panel-review", role: "tabpanel", "aria-labelledby": "builder-ribbon-tab-review", className: "shrink-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-1.5", role: "group", "aria-label": "Review tools" }, /* @__PURE__ */ React.createElement("button", { id: "builder-new-comment", type: "button", onMouseDown: (event) => event.preventDefault(), onClick: addReviewComment, "aria-keyshortcuts": "Control+Alt+M", className: "h-8 rounded bg-amber-600 px-2.5 text-[11px] font-bold text-white shadow-sm hover:bg-amber-700", title: "Comment on the selected text (Ctrl+Alt+M)" }, "New Comment"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => openReviewComments(activeCommentId), "aria-pressed": showNavigationPane && navigationPaneTab === "comments", "aria-controls": "document-builder-navigation", className: "h-8 rounded border border-amber-500 bg-white px-2.5 text-[11px] font-bold text-amber-800 hover:bg-amber-50" }, "Comments (", unresolvedReviewCommentCount, ")"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: openWordCountDetails, "aria-expanded": showWordCountDetails, "aria-controls": "builder-word-count-panel", "aria-keyshortcuts": "Control+Shift+G", className: "h-8 rounded border border-indigo-500 bg-white px-2.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50" }, "Word Count"), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-medium text-slate-600" }, selectionStatistics.active ? `${selectionStatistics.words.toLocaleString()} selected / ${wordCount.toLocaleString()} total words` : `${wordCount.toLocaleString()} words`, " \xB7 ", documentStatistics.readingMinutes || 0, " min reading time"), /* @__PURE__ */ React.createElement("span", { className: "ml-auto text-[10px] text-slate-500" }, "Ctrl+Alt+M comment \xB7 Ctrl+Shift+G word count")), /* @__PURE__ */ React.createElement("details", { id: "builder-find-tools", className: "bg-white border-b border-slate-200 shrink-0" }, /* @__PURE__ */ React.createElement("summary", { className: "cursor-pointer px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50" }, "Find / Replace | Heading Outline (", headingOutline.length, ") ", /* @__PURE__ */ React.createElement("span", { className: "font-normal text-slate-500" }, findMatchState.count ? `${findMatchState.current || 0}/${findMatchState.count} matches` : "No matches", " | Ctrl+F / Ctrl+H")), /* @__PURE__ */ React.createElement("div", { className: "grid gap-2 border-t border-slate-200 bg-slate-50 p-2 lg:grid-cols-2" }, /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-1" }, /* @__PURE__ */ React.createElement("label", { htmlFor: "builder-find", className: "sr-only" }, "Find text"), /* @__PURE__ */ React.createElement("input", { id: "builder-find", value: findQuery, onChange: (e) => {
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
    }, placeholder: "Replace with", className: "min-w-32 flex-1 rounded border border-slate-400 px-2 py-1 text-xs" }), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: replaceCurrentInPreview, disabled: !findQuery.trim() || !findMatchState.count, className: "rounded border border-indigo-500 bg-white px-2 py-1 text-xs font-bold text-indigo-700 disabled:opacity-40" }, "Replace current"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: replaceAllInPreview, disabled: !findQuery.trim() || !findMatchState.count, className: "rounded border border-indigo-500 bg-white px-2 py-1 text-xs font-bold text-indigo-700 disabled:opacity-40" }, "Replace all")), /* @__PURE__ */ React.createElement("fieldset", { className: "flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-medium text-slate-600", "aria-label": "Find options" }, /* @__PURE__ */ React.createElement("label", { className: "inline-flex cursor-pointer items-center gap-1" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: findOptions.matchCase, onChange: (e) => setFindOptions((options) => ({ ...options, matchCase: e.target.checked })), className: "accent-indigo-700" }), "Match case"), /* @__PURE__ */ React.createElement("label", { className: "inline-flex cursor-pointer items-center gap-1" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: findOptions.wholeWord, onChange: (e) => setFindOptions((options) => ({ ...options, wholeWord: e.target.checked })), className: "accent-indigo-700" }), "Whole words"), /* @__PURE__ */ React.createElement("label", { className: "inline-flex cursor-pointer items-center gap-1" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: findOptions.highlightAll, onChange: (e) => setFindOptions((options) => ({ ...options, highlightAll: e.target.checked })), className: "accent-indigo-700" }), "Highlight all"))), /* @__PURE__ */ React.createElement("nav", { "aria-label": "Document heading outline", className: "max-h-24 overflow-y-auto rounded border border-slate-300 bg-white p-1" }, headingOutline.length ? headingOutline.map((heading) => /* @__PURE__ */ React.createElement("button", { key: heading.index + "-" + heading.text, type: "button", onClick: () => jumpToHeading(heading), "aria-current": activeHeadingIndex === heading.index ? "location" : void 0, className: `block w-full truncate rounded px-2 py-1 text-left text-[11px] ${activeHeadingIndex === heading.index ? "bg-indigo-100 font-bold text-indigo-800 ring-1 ring-indigo-200" : "text-slate-700 hover:bg-indigo-50"}`, style: { paddingLeft: Math.min(28, 4 + (heading.level - 1) * 6) }, title: heading.text }, "H", heading.level, " - ", heading.text)) : /* @__PURE__ */ React.createElement("span", { className: "block px-2 py-1 text-[11px] text-slate-500" }, "No headings yet.")))), /* @__PURE__ */ React.createElement("details", { id: "builder-version-history", className: "bg-white border-b border-slate-200 shrink-0" }, /* @__PURE__ */ React.createElement("summary", { className: "cursor-pointer px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50" }, "Version History (", versionHistory.length, ") ", /* @__PURE__ */ React.createElement("span", { className: "font-normal text-slate-500" }, "Stored on this device")), /* @__PURE__ */ React.createElement("div", { className: "border-t border-slate-200 bg-slate-50 p-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-[10px] text-slate-500" }, "Recent restore points stay on this device."), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: saveVersionSnapshot, className: "rounded bg-indigo-700 px-2 py-1 text-[11px] font-bold text-white hover:bg-indigo-800" }, "Save snapshot")), /* @__PURE__ */ React.createElement("div", { className: "mt-2 max-h-36 space-y-1 overflow-y-auto" }, versionHistory.length ? versionHistory.map((snapshot) => /* @__PURE__ */ React.createElement("div", { key: snapshot.id, className: "flex items-center gap-2 rounded border border-slate-200 bg-white px-2 py-1" }, /* @__PURE__ */ React.createElement("div", { className: "min-w-0 flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "truncate text-[11px] font-semibold text-slate-700" }, snapshot.label), /* @__PURE__ */ React.createElement("time", { className: "text-[10px] text-slate-500", dateTime: new Date(snapshot.at).toISOString() }, new Date(snapshot.at).toLocaleString())), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => restoreVersionSnapshot(snapshot), className: "rounded border border-indigo-500 px-2 py-1 text-[10px] font-bold text-indigo-700 hover:bg-indigo-50" }, "Restore"))) : /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-500" }, "No snapshots yet. Editing will save recent versions automatically."))))), !ribbonCollapsed && activeRibbonTab === "home" && /* @__PURE__ */ React.createElement("div", { id: "builder-ribbon-panel-home", role: "tabpanel", "aria-labelledby": "builder-ribbon-tab-home", className: "shrink-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1", "aria-label": "Styles and Format Painter" }, /* @__PURE__ */ React.createElement("span", { className: "mr-1 text-[10px] font-black uppercase tracking-wider text-slate-500" }, "Styles"), /* @__PURE__ */ React.createElement("div", { className: "flex min-w-0 flex-1 gap-1 overflow-x-auto py-0.5", role: "toolbar", "aria-label": "Document styles" }, _BUILDER_STYLE_GALLERY.map((styleOption) => {
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
    ), formatPainterActive && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-medium text-amber-800", role: "status" }, "Select the destination, then choose Apply format."), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: cancelFormatPainter, className: "min-h-8 rounded px-2 text-[10px] font-bold text-slate-600 hover:bg-slate-200", "aria-label": "Cancel Format Painter" }, "Cancel"))), "                ", /* @__PURE__ */ React.createElement("div", { className: "px-2 py-1 bg-white border-b border-slate-200 flex items-center gap-0.5 flex-wrap shrink-0", role: "toolbar", "aria-label": t("a11y.text_formatting") }, [
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
    ))), !ribbonCollapsed && activeRibbonTab === "insert" && /* @__PURE__ */ React.createElement("div", { id: "builder-ribbon-panel-insert", role: "tabpanel", "aria-labelledby": "builder-ribbon-tab-insert", className: "shrink-0 border-b border-slate-200 bg-white" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-stretch gap-2 px-2 py-1.5", "aria-label": "Insert tools" }, /* @__PURE__ */ React.createElement("fieldset", { className: "flex min-w-0 flex-1 flex-wrap items-center gap-1.5 rounded border border-slate-200 bg-slate-50 px-2 py-1", "aria-describedby": "builder-table-help" }, /* @__PURE__ */ React.createElement("legend", { className: "px-1 text-[10px] font-black uppercase tracking-wider text-slate-600" }, "Table"), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-1 text-[10px] font-semibold text-slate-600" }, "Body rows", /* @__PURE__ */ React.createElement("input", { type: "number", min: "1", max: "20", value: tableInsertConfig.rows, onChange: (e) => setTableInsertConfig((config) => ({ ...config, rows: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })), className: "h-7 w-14 rounded border border-slate-400 bg-white px-1.5 text-xs", "aria-label": "Table body rows" })), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-1 text-[10px] font-semibold text-slate-600" }, "Columns", /* @__PURE__ */ React.createElement("input", { type: "number", min: "1", max: "10", value: tableInsertConfig.columns, onChange: (e) => setTableInsertConfig((config) => ({ ...config, columns: Math.max(1, Math.min(10, Number(e.target.value) || 1)) })), className: "h-7 w-14 rounded border border-slate-400 bg-white px-1.5 text-xs", "aria-label": "Table columns" })), /* @__PURE__ */ React.createElement("label", { className: "flex min-w-36 flex-1 items-center gap-1 text-[10px] font-semibold text-slate-600" }, "Caption", /* @__PURE__ */ React.createElement("input", { value: tableInsertConfig.caption, maxLength: 160, onChange: (e) => setTableInsertConfig((config) => ({ ...config, caption: e.target.value })), placeholder: "Recommended", className: "h-7 min-w-24 flex-1 rounded border border-slate-400 bg-white px-1.5 text-xs", "aria-label": "Table caption" })), /* @__PURE__ */ React.createElement("label", { className: "inline-flex min-h-7 cursor-pointer items-center gap-1 text-[10px] font-semibold text-slate-700" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: tableInsertConfig.headerRow, onChange: (e) => setTableInsertConfig((config) => ({ ...config, headerRow: e.target.checked })), className: "accent-indigo-700" }), "Header row"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: insertAccessibleTable, className: "h-7 rounded bg-indigo-700 px-2.5 text-[11px] font-bold text-white hover:bg-indigo-800" }, "Insert table"), /* @__PURE__ */ React.createElement("span", { id: "builder-table-help", className: "sr-only" }, "Creates semantic table headers and an optional accessible caption.")), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-1 rounded border border-slate-200 px-2 py-1", role: "toolbar", "aria-label": "Insert document elements" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: openImagePicker, className: "h-8 rounded px-2 text-[11px] font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700", "aria-label": "Insert image with alternative text" }, /* @__PURE__ */ React.createElement(ImageIcon, { size: 13, "aria-hidden": "true" }), " ", /* @__PURE__ */ React.createElement("span", { className: "ml-1" }, "Image")), /* @__PURE__ */ React.createElement("button", { type: "button", onMouseDown: (e) => e.preventDefault(), onClick: () => runEditorCommand("insertHorizontalRule"), className: "h-8 rounded px-2 text-[11px] font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700", title: "Insert horizontal rule" }, "Rule"), /* @__PURE__ */ React.createElement("button", { type: "button", onMouseDown: (e) => e.preventDefault(), onClick: () => {
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
    }, "aria-pressed": editorPageView, className: `h-7 rounded px-2 text-[10px] font-bold ${editorPageView ? "bg-indigo-700 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"}`, title: editorPageView ? "Switch to continuous editor view" : "Switch to paper-like page view" }, editorPageView ? "Page view" : "Continuous"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => useEditorZoomPreset("fit-width"), "aria-pressed": editorZoomMode === "fit-width", className: `h-7 rounded border px-2 text-[10px] font-bold ${editorZoomMode === "fit-width" ? "border-indigo-700 bg-indigo-700 text-white" : "border-slate-400 bg-white text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"}` }, "Fit width"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => useEditorZoomPreset("fit-page"), "aria-pressed": editorZoomMode === "fit-page", className: `h-7 rounded border px-2 text-[10px] font-bold ${editorZoomMode === "fit-page" ? "border-indigo-700 bg-indigo-700 text-white" : "border-slate-400 bg-white text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"}` }, "Fit page"), /* @__PURE__ */ React.createElement("span", { className: "ml-auto text-[9px] text-slate-500", role: "status", "aria-live": "polite" }, "Left ", paragraphLayout.leftIndent, " in \xB7 First ", paragraphLayout.firstLineIndent, " in \xB7 Right ", paragraphLayout.rightIndent, " in \xB7 ", editorZoomMode === "custom" ? `${editorZoom}%` : `${editorZoomMode === "fit-width" ? "Fit width" : "Fit page"} (${editorZoom}%)`)))), !ribbonCollapsed && activeRibbonTab === "expert" && /* @__PURE__ */ React.createElement("div", { id: "builder-ribbon-panel-expert", role: "tabpanel", "aria-labelledby": "builder-ribbon-tab-expert", className: "shrink-0" }, /* @__PURE__ */ React.createElement("details", { open: true, className: "bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-600 group" }, /* @__PURE__ */ React.createElement("summary", { className: "cursor-pointer px-2 py-1.5 flex items-center gap-2 list-none select-none hover:bg-slate-800/50" }, /* @__PURE__ */ React.createElement("span", { className: "inline-block transition-transform group-open:rotate-90 text-slate-300 text-[10px]" }, "\u25B8"), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-purple-200 font-bold shrink-0" }, isAgentRunning ? "\u{1F916} Agent" : "\u2328\uFE0F Expert"), isAgentRunning && /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-amber-300 animate-pulse motion-reduce:animate-none" }, "Running..."), /* @__PURE__ */ React.createElement("span", { className: "ml-auto text-[10px] text-slate-300" }, agentActivityLog.length > 0 ? `${agentActivityLog.length} event${agentActivityLog.length === 1 ? "" : "s"}` : "idle")), /* @__PURE__ */ React.createElement("div", { className: "px-2 pb-1.5" }, /* @__PURE__ */ React.createElement("form", { className: "flex-1 flex gap-1", onSubmit: async (e) => {
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
    }, className: "text-[10px] text-slate-300 hover:text-white underline ml-auto" }, "Clear")))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-1 min-h-0 overflow-hidden bg-slate-100" }, showNavigationPane && /* @__PURE__ */ React.createElement("aside", { id: "document-builder-navigation", role: "complementary", "aria-label": "Document navigation", className: "relative flex max-w-[55vw] shrink-0 flex-col border-r border-slate-300 bg-white", style: { width: navigationPaneWidth } }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between border-b border-slate-200 px-3 py-2" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-black uppercase tracking-wider text-slate-700" }, "Navigation"), /* @__PURE__ */ React.createElement("div", { className: "text-[10px] text-slate-500" }, navigationPaneTab === "headings" ? `${headingOutline.length} heading${headingOutline.length === 1 ? "" : "s"}` : navigationPaneTab === "sections" ? `${pageMetrics.documentSections.length} section${pageMetrics.documentSections.length === 1 ? "" : "s"}` : navigationPaneTab === "comments" ? `${unresolvedReviewCommentCount} open / ${reviewComments.length} total` : `${pageMetrics.count} page${pageMetrics.count === 1 ? "" : "s"}`)), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setShowNavigationPane(false), "aria-label": "Close document navigation", className: "rounded px-1.5 py-0.5 text-lg leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-800" }, "\xD7")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-4 gap-1 border-b border-slate-200 bg-slate-50 p-1", role: "tablist", "aria-label": "Navigation view" }, /* @__PURE__ */ React.createElement("button", { id: "builder-navigation-tab-headings", type: "button", role: "tab", "aria-selected": navigationPaneTab === "headings", "aria-controls": "builder-navigation-panel-headings", tabIndex: navigationPaneTab === "headings" ? 0 : -1, onClick: () => setNavigationPaneTab("headings"), onKeyDown: (event) => handleNavigationTabKeyDown(event, "headings"), className: `rounded px-1 py-1.5 text-[10px] font-bold ${navigationPaneTab === "headings" ? "bg-white text-indigo-800 shadow-sm ring-1 ring-slate-300" : "text-slate-600 hover:bg-white"}` }, "Headings"), /* @__PURE__ */ React.createElement("button", { id: "builder-navigation-tab-pages", type: "button", role: "tab", "aria-selected": navigationPaneTab === "pages", "aria-controls": "builder-navigation-panel-pages", tabIndex: navigationPaneTab === "pages" ? 0 : -1, onClick: () => setNavigationPaneTab("pages"), onKeyDown: (event) => handleNavigationTabKeyDown(event, "pages"), className: `rounded px-1 py-1.5 text-[10px] font-bold ${navigationPaneTab === "pages" ? "bg-white text-indigo-800 shadow-sm ring-1 ring-slate-300" : "text-slate-600 hover:bg-white"}` }, "Pages"), /* @__PURE__ */ React.createElement("button", { id: "builder-navigation-tab-sections", type: "button", role: "tab", "aria-selected": navigationPaneTab === "sections", "aria-controls": "builder-navigation-panel-sections", tabIndex: navigationPaneTab === "sections" ? 0 : -1, onClick: () => setNavigationPaneTab("sections"), onKeyDown: (event) => handleNavigationTabKeyDown(event, "sections"), className: `rounded px-1 py-1.5 text-[10px] font-bold ${navigationPaneTab === "sections" ? "bg-white text-indigo-800 shadow-sm ring-1 ring-slate-300" : "text-slate-600 hover:bg-white"}` }, "Sections"), /* @__PURE__ */ React.createElement("button", { id: "builder-navigation-tab-comments", type: "button", role: "tab", "aria-selected": navigationPaneTab === "comments", "aria-controls": "builder-navigation-panel-comments", tabIndex: navigationPaneTab === "comments" ? 0 : -1, onClick: () => setNavigationPaneTab("comments"), onKeyDown: (event) => handleNavigationTabKeyDown(event, "comments"), className: `rounded px-1 py-1.5 text-[10px] font-bold ${navigationPaneTab === "comments" ? "bg-white text-amber-800 shadow-sm ring-1 ring-amber-300" : "text-slate-600 hover:bg-white"}` }, "Comments")), navigationPaneTab === "headings" ? /* @__PURE__ */ React.createElement("nav", { id: "builder-navigation-panel-headings", role: "tabpanel", "aria-labelledby": "builder-navigation-tab-headings", "aria-label": "Document heading navigation", className: "min-h-0 flex-1 overflow-y-auto p-2" }, headingOutline.length ? headingOutline.map((heading) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: heading.index + "-" + heading.text,
        type: "button",
        onClick: () => jumpToHeading(heading),
        "aria-current": activeHeadingIndex === heading.index ? "location" : void 0,
        className: `block w-full truncate rounded-md px-2 py-1.5 text-left text-[11px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 ${activeHeadingIndex === heading.index ? "bg-indigo-100 font-bold text-indigo-800 ring-1 ring-indigo-200" : "text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"}`,
        style: { paddingLeft: Math.min(30, 8 + (heading.level - 1) * 8) },
        title: heading.text
      },
      /* @__PURE__ */ React.createElement("span", { className: "mr-1 text-[10px] font-bold text-slate-400" }, "H", heading.level),
      heading.text
    )) : /* @__PURE__ */ React.createElement("p", { className: "px-2 py-3 text-[11px] text-slate-500" }, "Add headings to build a navigable document map.")) : navigationPaneTab === "comments" ? /* @__PURE__ */ React.createElement("section", { id: "builder-navigation-panel-comments", role: "tabpanel", "aria-labelledby": "builder-navigation-tab-comments", "aria-label": "Document comments", className: "flex min-h-0 flex-1 flex-col" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2 border-b border-slate-200 bg-amber-50 px-2 py-2" }, /* @__PURE__ */ React.createElement("button", { type: "button", onMouseDown: (event) => event.preventDefault(), onClick: addReviewComment, "aria-keyshortcuts": "Control+Alt+M", className: "h-8 rounded bg-amber-600 px-2.5 text-[11px] font-bold text-white hover:bg-amber-700" }, "New comment"), /* @__PURE__ */ React.createElement("label", { className: "ml-auto inline-flex cursor-pointer items-center gap-1 text-[10px] font-semibold text-amber-900" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: showResolvedComments, onChange: (event) => setShowResolvedComments(event.target.checked), className: "accent-amber-700" }), "Show resolved")), /* @__PURE__ */ React.createElement("div", { className: "min-h-0 flex-1 space-y-2 overflow-y-auto p-2", "aria-live": "polite" }, reviewComments.length ? visibleReviewComments.length ? visibleReviewComments.map((comment) => {
      const active = activeCommentId === comment.id;
      return /* @__PURE__ */ React.createElement("article", { key: comment.id, id: `builder-comment-${comment.id}`, "aria-labelledby": `builder-comment-title-${comment.id}`, className: `rounded-lg border p-2 shadow-sm ${active ? "border-amber-500 bg-amber-50 ring-2 ring-amber-200" : comment.resolved ? "border-slate-200 bg-slate-50" : "border-amber-200 bg-white"}` }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-2" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => jumpToReviewComment(comment.id), "aria-current": active ? "location" : void 0, "aria-label": `Go to commented text: ${comment.quote}`, className: "min-w-0 flex-1 rounded px-1 py-1 text-left hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-600" }, /* @__PURE__ */ React.createElement("h3", { id: `builder-comment-title-${comment.id}`, className: "text-[9px] font-black uppercase tracking-wider text-amber-800" }, comment.resolved ? "Resolved comment" : `Comment ${comment.index + 1}`), /* @__PURE__ */ React.createElement("blockquote", { className: "mt-0.5 line-clamp-3 break-words text-[11px] font-semibold text-slate-700" }, '"', comment.quote, '"')), /* @__PURE__ */ React.createElement("span", { className: `shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${comment.resolved ? "bg-slate-200 text-slate-600" : "bg-amber-100 text-amber-800"}` }, comment.resolved ? "Resolved" : "Open")), /* @__PURE__ */ React.createElement("ol", { className: "mt-2 space-y-1.5" }, comment.thread.map((message, messageIndex) => /* @__PURE__ */ React.createElement("li", { key: message.id + "-" + messageIndex, className: "rounded border border-slate-200 bg-white px-2 py-1.5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between gap-2 text-[9px] font-bold uppercase tracking-wide text-slate-500" }, /* @__PURE__ */ React.createElement("span", null, messageIndex === 0 ? "Comment" : `Reply ${messageIndex}`), /* @__PURE__ */ React.createElement("time", { dateTime: message.at || void 0 }, message.at && !Number.isNaN(Date.parse(message.at)) ? new Date(message.at).toLocaleString() : "Recently")), /* @__PURE__ */ React.createElement("p", { className: "mt-1 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-slate-700" }, message.text)))), /* @__PURE__ */ React.createElement("div", { className: "mt-2 flex flex-wrap gap-1" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => replyReviewComment(comment.id), className: "rounded border border-amber-400 bg-white px-2 py-1 text-[10px] font-bold text-amber-800 hover:bg-amber-50" }, "Reply"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => editReviewComment(comment.id), className: "rounded border border-slate-300 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-50" }, "Edit"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => toggleReviewCommentResolved(comment.id), className: "rounded border border-slate-300 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-50" }, comment.resolved ? "Reopen" : "Resolve"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => deleteReviewComment(comment.id), className: "ml-auto rounded px-2 py-1 text-[10px] font-bold text-red-700 hover:bg-red-50" }, "Delete")));
    }) : /* @__PURE__ */ React.createElement("p", { className: "rounded border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-center text-[11px] text-slate-600" }, "All comments are resolved. Turn on ", /* @__PURE__ */ React.createElement("strong", null, "Show resolved"), " to review them.") : /* @__PURE__ */ React.createElement("p", { className: "rounded border border-dashed border-amber-300 bg-amber-50 px-3 py-4 text-center text-[11px] text-amber-900" }, "Select text in the document, then choose ", /* @__PURE__ */ React.createElement("strong", null, "New comment"), " or press Ctrl+Alt+M."))) : navigationPaneTab === "sections" ? /* @__PURE__ */ React.createElement("nav", { id: "builder-navigation-panel-sections", role: "tabpanel", "aria-labelledby": "builder-navigation-tab-sections", "aria-label": "Document section navigation", className: "min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2" }, pageMetrics.documentSections.map((section) => {
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
            refreshActiveHeading();
            refreshPageMetrics();
            applyEditorZoom(editorZoom);
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
            };
            const _syncFormatting = () => refreshFormattingState();
            const _syncActiveHeading = () => refreshActiveHeading();
            const _syncPageMetrics = () => {
              refreshActiveHeading();
              refreshPageMetrics();
            };
            const _activateReviewComment = (event) => {
              try {
                const marker = event.target?.closest?.(_BUILDER_COMMENT_SELECTOR);
                const id = marker?.getAttribute?.("data-allo-comment-id") || "";
                if (!id) return;
                setActiveCommentId(id);
                const hostDoc = window.parent && window.parent.document;
                hostDoc?.dispatchEvent(new window.parent.CustomEvent("alloflow-builder-activate-comment", { detail: { id } }));
              } catch (_) {
              }
            };
            doc.addEventListener("selectionchange", _rememberSelection);
            doc.addEventListener("click", _activateReviewComment);
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
            let _capT = null;
            const _captureEdits = () => {
              try {
                const capturedAt = Date.now();
                const fullHtml = "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
                window.__alloBuilderEditedPack = { html: fullHtml, at: capturedAt };
                const clean = getCleanBuilderDocument();
                const savedLocally = persistLocalDraft(clean?.html || fullHtml, capturedAt, "Auto-save");
                if (mountedRef.current) {
                  setDraftCaptureState(savedLocally ? "saved" : "captured");
                }
              } catch (_) {
              }
            };
            doc.addEventListener("input", () => {
              try {
                if (doc.body) doc.body.setAttribute("data-allo-user-edited", "1");
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
    ))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-1.5 text-[11px] text-slate-600 shrink-0", "aria-label": "Document status bar" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-x-3 gap-y-1" }, /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-slate-700" }, isFocusMode ? "Focus mode" : "Editing enabled"), /* @__PURE__ */ React.createElement("span", { role: "status", "aria-live": "polite", className: `inline-flex items-center gap-1 font-medium ${draftCaptureState === "capturing" ? "text-amber-700" : ["saved", "restored", "captured"].includes(draftCaptureState) ? "text-emerald-700" : "text-slate-500"}` }, /* @__PURE__ */ React.createElement("span", { className: `h-1.5 w-1.5 rounded-full ${draftCaptureState === "capturing" ? "bg-amber-500 animate-pulse motion-reduce:animate-none" : ["saved", "restored", "captured"].includes(draftCaptureState) ? "bg-emerald-600" : "bg-slate-400"}`, "aria-hidden": "true" }), draftCaptureState === "capturing" ? "Capturing changes\u2026" : draftCaptureState === "saved" ? "Saved on this device" : draftCaptureState === "restored" ? "Local draft restored" : draftCaptureState === "captured" ? "Draft captured in this session" : "Ready"), /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement("button", { ref: wordCountButtonRef, type: "button", onClick: (event) => showWordCountDetails ? closeWordCountDetails(true) : openWordCountDetails(event), "aria-expanded": showWordCountDetails, "aria-controls": "builder-word-count-panel", "aria-keyshortcuts": "Control+Shift+G", className: "rounded px-1.5 py-1 font-semibold text-slate-700 hover:bg-indigo-100 hover:text-indigo-800", title: "Open detailed Word Count (Ctrl+Shift+G)" }, selectionStatistics.active ? `Words: ${selectionStatistics.words.toLocaleString()} of ${wordCount.toLocaleString()}` : `Words: ${wordCount.toLocaleString()}`), showWordCountDetails && /* @__PURE__ */ React.createElement("section", { ref: wordCountPanelRef, id: "builder-word-count-panel", tabIndex: -1, role: "dialog", "aria-modal": "false", "aria-labelledby": "builder-word-count-title", "aria-describedby": "builder-word-count-description", className: "absolute bottom-full left-0 z-[90] mb-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-300 bg-white p-3 text-slate-700 shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between gap-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h4", { id: "builder-word-count-title", className: "text-sm font-black text-slate-900" }, "Word Count"), /* @__PURE__ */ React.createElement("p", { id: "builder-word-count-description", className: "text-[10px] text-slate-500" }, "Live statistics for this document", selectionStatistics.active ? " and the selected text" : "", ".")), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => closeWordCountDetails(true), className: "min-h-8 rounded px-2 text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800", "aria-label": "Close Word Count details" }, "Close")), /* @__PURE__ */ React.createElement("div", { className: "mt-2 overflow-hidden rounded-lg border border-slate-200" }, /* @__PURE__ */ React.createElement("table", { className: "w-full border-collapse text-[11px]" }, /* @__PURE__ */ React.createElement("caption", { className: "sr-only" }, "Document and selection statistics"), /* @__PURE__ */ React.createElement("thead", { className: "bg-slate-100 text-[9px] font-black uppercase tracking-wider text-slate-500" }, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { scope: "col", className: "px-2 py-1 text-left" }, "Statistic"), /* @__PURE__ */ React.createElement("th", { scope: "col", className: "px-2 py-1 text-right" }, "Document"), selectionStatistics.active && /* @__PURE__ */ React.createElement("th", { scope: "col", className: "px-2 py-1 text-right" }, "Selection"))), /* @__PURE__ */ React.createElement("tbody", null, [
      ["Pages", pageMetrics.count, null],
      ["Words", documentStatistics.words, selectionStatistics.words],
      ["Characters (no spaces)", documentStatistics.charactersWithoutSpaces, selectionStatistics.charactersWithoutSpaces],
      ["Characters (with spaces)", documentStatistics.charactersWithSpaces, selectionStatistics.charactersWithSpaces],
      ["Paragraphs", documentStatistics.paragraphs, selectionStatistics.paragraphs],
      ["Sentences", documentStatistics.sentences, selectionStatistics.sentences]
    ].map(([label, documentValue, selectionValue]) => /* @__PURE__ */ React.createElement("tr", { key: label, className: "border-t border-slate-100" }, /* @__PURE__ */ React.createElement("th", { scope: "row", className: "px-2 py-1 text-left font-semibold text-slate-600" }, label), /* @__PURE__ */ React.createElement("td", { className: "px-2 py-1 text-right tabular-nums" }, Number(documentValue || 0).toLocaleString()), selectionStatistics.active && /* @__PURE__ */ React.createElement("td", { className: "px-2 py-1 text-right tabular-nums" }, selectionValue == null ? /* @__PURE__ */ React.createElement("span", { "aria-label": "Not applicable" }, "\u2014") : Number(selectionValue || 0).toLocaleString())))))), /* @__PURE__ */ React.createElement("dl", { className: "mt-2 grid grid-cols-2 gap-2 text-[10px]" }, /* @__PURE__ */ React.createElement("div", { className: "rounded-lg bg-indigo-50 px-2 py-1.5" }, /* @__PURE__ */ React.createElement("dt", { className: "font-bold text-indigo-800" }, "Reading time"), /* @__PURE__ */ React.createElement("dd", null, documentStatistics.readingMinutes || 0, " min at 225 wpm")), /* @__PURE__ */ React.createElement("div", { className: "rounded-lg bg-violet-50 px-2 py-1.5" }, /* @__PURE__ */ React.createElement("dt", { className: "font-bold text-violet-800" }, "Speaking time"), /* @__PURE__ */ React.createElement("dd", null, documentStatistics.speakingMinutes || 0, " min at 130 wpm"))), /* @__PURE__ */ React.createElement("div", { className: "mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("label", { htmlFor: "builder-word-count-goal", className: "text-[10px] font-bold text-slate-600" }, "Word goal"), /* @__PURE__ */ React.createElement("input", { id: "builder-word-count-goal", type: "number", min: "0", step: "50", value: wordGoal || "", onChange: (event) => setWordGoal(Math.max(0, parseInt(event.target.value, 10) || 0)), placeholder: "None", className: "h-7 w-24 rounded border border-slate-400 bg-white px-1.5 text-[11px]" }), /* @__PURE__ */ React.createElement("span", { className: "ml-auto text-[10px] font-semibold text-slate-600" }, wordGoalProgress.goal > 0 ? `${wordGoalProgress.percent}%` : "No goal")), /* @__PURE__ */ React.createElement("div", { className: "mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200", role: "progressbar", "aria-label": "Word-count goal progress", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": wordGoalProgress.percent, "aria-valuetext": wordGoalProgress.goal > 0 ? `${wordGoalProgress.count} of ${wordGoalProgress.goal} words` : "No word-count goal set" }, /* @__PURE__ */ React.createElement("div", { className: "h-full rounded-full bg-indigo-600 transition-all motion-reduce:transition-none", style: { width: `${wordGoalProgress.percent}%` } }))), /* @__PURE__ */ React.createElement("p", { className: "mt-2 text-[9px] leading-snug text-slate-500" }, "Counts exclude headers, footers, page controls, and other editor-only interface text."))), /* @__PURE__ */ React.createElement("span", null, headingOutline.length, " heading", headingOutline.length === 1 ? "" : "s"), /* @__PURE__ */ React.createElement("span", null, "Page ", pageMetrics.active + 1, " of ", pageMetrics.count), /* @__PURE__ */ React.createElement("span", null, "Section ", pageMetrics.activeSection + 1, " of ", pageMetrics.documentSections.length, ": ", activeDocumentSection.name)), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-slate-500" }, "Ctrl+Enter page break \xB7 Ctrl+Shift+Enter ", isFocusMode ? "exits focus mode" : "opens focus mode", " \xB7 Ctrl+Shift+G word count \xB7 Ctrl+Z undo"), /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline-block h-4 w-px bg-slate-300", "aria-hidden": "true" }), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1", "aria-label": "Editor zoom controls" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setCustomEditorZoom((value) => value - 5), className: "h-7 min-w-7 rounded border border-slate-300 bg-white px-1.5 font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700", "aria-label": "Zoom out", title: "Zoom out" }, "\u2212"), /* @__PURE__ */ React.createElement("input", { type: "range", min: "50", max: "200", step: "5", value: editorZoom, onChange: (event) => setCustomEditorZoom(Number(event.target.value)), className: "w-24 accent-indigo-600", "aria-label": "Editor zoom", "aria-valuetext": `${editorZoomMode === "custom" ? "" : editorZoomMode === "fit-width" ? "Fit width, " : "Fit page, "}${editorZoom} percent` }), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setCustomEditorZoom((value) => value + 5), className: "h-7 min-w-7 rounded border border-slate-300 bg-white px-1.5 font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700", "aria-label": "Zoom in", title: "Zoom in" }, "+"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setCustomEditorZoom(100), className: "min-w-12 rounded px-1.5 py-1 font-semibold text-indigo-700 hover:bg-indigo-100", "aria-label": "Reset editor zoom to 100 percent", title: "Reset editor zoom" }, editorZoom, "%"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: resetBuilderViewPreferences, className: "rounded px-1.5 py-1 font-semibold text-slate-600 hover:bg-indigo-100 hover:text-indigo-700", "aria-label": "Reset Builder view preferences", title: "Reset zoom, page view, ribbon, and navigation" }, "Reset view"))))))
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
        ::selection { background: #c7d2fe; }
        ::highlight(allo-builder-find) { background: #fde68a; color: #713f12; }
        mark[data-allo-comment-id] { padding:0;background:#fef3c7;color:inherit;border-bottom:2px solid #d97706;border-radius:2px;cursor:pointer; }
        mark[data-allo-comment-resolved="1"] { background:#f1f5f9;border-bottom:1px dotted #64748b; }
        mark[data-allo-comment-active="1"] { background:#fde68a;box-shadow:0 0 0 2px #f59e0b; }
        @media print { mark[data-allo-comment-id] { padding:0 !important;background:transparent !important;color:inherit !important;border:0 !important;box-shadow:none !important; } }
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
      if ((e.key === "Enter" || e.key === " ") && e.target && (e.target.tagName || "").toUpperCase() === "IMG") {
        e.preventDefault();
        e.stopPropagation();
        _openBuilderCropModal(e.target);
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
        } else if (e.key === "1") {
          e.preventDefault();
          doc.execCommand("formatBlock", false, "<h1>");
        } else if (e.key === "2") {
          e.preventDefault();
          doc.execCommand("formatBlock", false, "<h2>");
        } else if (e.key === "3") {
          e.preventDefault();
          doc.execCommand("formatBlock", false, "<h3>");
        } else if (e.key === "0") {
          e.preventDefault();
          doc.execCommand("formatBlock", false, "<p>");
        } else if (e.key === "k" || e.key === "K") {
          e.preventDefault();
          var url = prompt(t("toasts.link_url_prompt") || "Enter link URL:");
          if (url) doc.execCommand("createLink", false, url);
        } else if (e.shiftKey && (e.key === "l" || e.key === "L")) {
          e.preventDefault();
          doc.execCommand("insertUnorderedList", false, null);
        } else if (e.shiftKey && (e.key === "o" || e.key === "O")) {
          e.preventDefault();
          doc.execCommand("insertOrderedList", false, null);
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
