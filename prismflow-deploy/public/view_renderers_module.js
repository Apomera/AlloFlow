(function() {
'use strict';
if (window.AlloModules && window.AlloModules.ViewRenderersModule) { console.log('[CDN] ViewRenderersModule already loaded, skipping'); return; }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
var useState = React.useState;
var useEffect = React.useEffect;
var useRef = React.useRef;
var useMemo = React.useMemo;
var useCallback = React.useCallback;
var Fragment = React.Fragment;
// _lazyIcon: defers icon resolution to call-time so we don't depend on
// window.AlloIcons being populated at module load.
var _lazyIcon = function (name) {
  return function (props) {
    var I = window.AlloIcons && window.AlloIcons[name];
    return I ? React.createElement(I, props) : null;
  };
};
var AlertCircle = _lazyIcon('AlertCircle');
var ArrowDown = _lazyIcon('ArrowDown');
var ArrowRight = _lazyIcon('ArrowRight');
var CheckCircle2 = _lazyIcon('CheckCircle2');
var Gamepad2 = _lazyIcon('Gamepad2');
var Layout = _lazyIcon('Layout');
var List = _lazyIcon('List');
var ListOrdered = _lazyIcon('ListOrdered');
var Lock = _lazyIcon('Lock');
var Plus = _lazyIcon('Plus');
var RefreshCw = _lazyIcon('RefreshCw');
var Sparkles = _lazyIcon('Sparkles');
var Unlock = _lazyIcon('Unlock');
var Unplug = _lazyIcon('Unplug');
const renderFormattedText = (text, enableGlossary = true, isDarkBg = false, deps) => {
  const { sanitizeTruncatedCitations, warnLog, SimpleBarChart, SimpleDonutChart, formatInlineText, normalizeResourceLinks, t } = deps;
  const _t = t || ((k) => null);
  try {
    if (window._DEBUG_VIEW_RENDERERS) console.log("[ViewRenderers] renderFormattedText fired");
  } catch (_) {
  }
  if (!text) return null;
  if (typeof text !== "string") {
    return /* @__PURE__ */ React.createElement("div", { className: "text-red-500 text-xs" }, _t("renderers.error_invalid_text_format") || "Error: Invalid text format");
  }
  text = sanitizeTruncatedCitations(text);
  const processedText = normalizeResourceLinks(text);
  const isSingleParagraph = !processedText.includes("\n\n") && processedText.length < 500 && !processedText.includes("|");
  let normalizedText = processedText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  normalizedText = normalizedText.replace(/([^\n])[^\S\n]*(#{2,6}\s)/g, "$1\n\n$2");
  normalizedText = normalizedText.replace(/\n(#{2,6}\s)/g, "\n\n$1");
  normalizedText = normalizedText.replace(/([^\n])\s+(#\s+[A-Z])/g, "$1\n\n$2");
  normalizedText = normalizedText.replace(/^(#{1,6}\s[^\n]+)\n(?!\n|#{1,6}\s|$)/gm, "$1\n\n");
  normalizedText = normalizedText.replace(/\n{3,}/g, "\n\n");
  normalizedText = normalizedText.replace(/^Title:\s*(.+)/m, "# $1");
  const lines = normalizedText.split("\n");
  const elements = [];
  let tableBuffer = [];
  let inTable = false;
  let minHeaderLevel = 6;
  let hasHeaders = false;
  lines.forEach((line) => {
    const match = line.match(/^(#+)\s/);
    if (match) {
      hasHeaders = true;
      minHeaderLevel = Math.min(minHeaderLevel, match[1].length);
    }
    const htmlMatch = line.match(/^<h([1-6])/i);
    if (htmlMatch) {
      hasHeaders = true;
      minHeaderLevel = Math.min(minHeaderLevel, parseInt(htmlMatch[1]));
    }
  });
  const headerOffset = hasHeaders ? 2 - minHeaderLevel : 0;
  const getHeaderClasses = (level) => {
    switch (level) {
      case 2:
        return "text-2xl font-black text-indigo-900 mt-6 mb-3 border-b border-indigo-100 pb-2";
      case 3:
        return "text-xl font-bold text-indigo-900 mt-5 mb-2";
      case 4:
        return "text-lg font-bold text-indigo-800 mt-4 mb-1";
      case 5:
        return "text-base font-bold text-indigo-800 mt-3 mb-1";
      default:
        return "text-sm font-bold text-indigo-800 mt-3 mb-1 uppercase tracking-wide";
    }
  };
  const flushTable = (keyPrefix) => {
    if (tableBuffer.length === 0) return null;
    const headers = [];
    const rows = [];
    tableBuffer.forEach((line) => {
      const content = line.trim();
      if (!content) return;
      const cells = content.split("|").map((c) => c.trim());
      if (cells.length > 0 && cells[0] === "") cells.shift();
      if (cells.length > 0 && cells[cells.length - 1] === "") cells.pop();
      if (cells.every((c) => c.match(/^[-:\s]+$/))) return;
      if (headers.length === 0) {
        headers.push(...cells);
      } else {
        rows.push(cells);
      }
    });
    return /* @__PURE__ */ React.createElement("div", { key: `${keyPrefix}-table`, className: "overflow-x-auto my-4 border rounded-lg border-slate-200 shadow-sm" }, /* @__PURE__ */ React.createElement("table", { className: "w-full text-sm text-left text-slate-600" }, /* @__PURE__ */ React.createElement("thead", { className: "text-xs text-slate-700 uppercase bg-slate-50" }, /* @__PURE__ */ React.createElement("tr", null, headers.map((h, i) => /* @__PURE__ */ React.createElement("th", { key: i, className: "px-6 py-3 border-b border-slate-200 font-bold" }, h)))), /* @__PURE__ */ React.createElement("tbody", null, rows.map((row, rI) => /* @__PURE__ */ React.createElement("tr", { key: rI, className: "bg-white border-b border-slate-100 hover:bg-slate-50 last:border-none" }, row.map((cell, cI) => /* @__PURE__ */ React.createElement("td", { key: cI, className: "px-6 py-4 align-top" }, formatInlineText(cell, enableGlossary, isDarkBg))))))));
  };
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const chartMatch = line.trim().match(/^\[\[CHART:\s*({.*})\]\]$/);
    if (chartMatch) {
      try {
        const chartData = JSON.parse(chartMatch[1]);
        if (chartData.type === "bar") {
          elements.push(
            /* @__PURE__ */ React.createElement("div", { key: `chart-${lineIdx}`, className: "my-6 p-4 border border-slate-400 rounded-xl bg-white shadow-sm max-w-md mx-auto" }, chartData.title && /* @__PURE__ */ React.createElement("h4", { className: "text-center font-bold text-slate-700 mb-4 text-sm uppercase tracking-wider" }, chartData.title), /* @__PURE__ */ React.createElement(SimpleBarChart, { data: chartData.data, color: "indigo" }))
          );
        } else if (chartData.type === "donut") {
          elements.push(
            /* @__PURE__ */ React.createElement("div", { key: `chart-${lineIdx}`, className: "my-6 p-4 border border-slate-400 rounded-xl bg-white shadow-sm max-w-xs mx-auto flex flex-col items-center" }, chartData.title && /* @__PURE__ */ React.createElement("h4", { className: "text-center font-bold text-slate-700 mb-4 text-sm uppercase tracking-wider" }, chartData.title), /* @__PURE__ */ React.createElement(SimpleDonutChart, { percentage: chartData.percentage, label: chartData.label, color: "indigo" }))
          );
        }
        continue;
      } catch (e) {
        warnLog("Chart parse error", e);
      }
    }
    if (line.trim().startsWith("|")) {
      inTable = true;
      tableBuffer.push(line);
      continue;
    } else if (inTable) {
      elements.push(flushTable(lineIdx));
      tableBuffer = [];
      inTable = false;
    }
    if (line.trim() === "") {
      elements.push(/* @__PURE__ */ React.createElement("div", { key: lineIdx, className: "h-2" }));
      continue;
    }
    const trimmedLine = line.trim();
    const headerMatch = trimmedLine.match(/^(#{1,6})\s+(.*)/);
    if (headerMatch) {
      const originalLevel = headerMatch[1].length;
      const content = headerMatch[2];
      const newLevel = Math.min(6, Math.max(2, originalLevel + headerOffset));
      const Tag = `h${newLevel}`;
      elements.push(
        /* @__PURE__ */ React.createElement(Tag, { key: lineIdx, className: getHeaderClasses(newLevel) }, formatInlineText(content, enableGlossary, isDarkBg))
      );
      continue;
    }
    const htmlHeaderMatch = line.match(/^<h([1-6]).*?>(.*?)<\/h\1>/i);
    if (htmlHeaderMatch) {
      const originalLevel = parseInt(htmlHeaderMatch[1]);
      const content = htmlHeaderMatch[2];
      const newLevel = Math.min(6, Math.max(2, originalLevel + headerOffset));
      const Tag = `h${newLevel}`;
      elements.push(
        /* @__PURE__ */ React.createElement(Tag, { key: lineIdx, className: getHeaderClasses(newLevel) }, formatInlineText(content, enableGlossary, isDarkBg))
      );
      continue;
    }
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ") || line.trim().startsWith("\u2022 ")) {
      const content = line.trim().replace(/^[-*•]\s+/, "");
      elements.push(
        /* @__PURE__ */ React.createElement("div", { key: lineIdx, className: "flex items-start gap-2 mb-1 ml-2" }, /* @__PURE__ */ React.createElement("div", { className: "w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-2" }), /* @__PURE__ */ React.createElement("div", { className: "text-sm" }, formatInlineText(content, enableGlossary, isDarkBg)))
      );
      continue;
    }
    const numMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      const number = numMatch[1];
      const content = numMatch[2];
      elements.push(
        /* @__PURE__ */ React.createElement("div", { key: lineIdx, className: "flex items-start gap-2 mb-1 ml-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-sm font-bold text-indigo-500 min-w-[1.2em] text-right" }, number, "."), /* @__PURE__ */ React.createElement("div", { className: "text-sm" }, formatInlineText(content, enableGlossary, isDarkBg)))
      );
      continue;
    }
    elements.push(
      /* @__PURE__ */ React.createElement("div", { key: lineIdx, className: "mb-1 text-sm" }, formatInlineText(line, enableGlossary, isDarkBg))
    );
  }
  if (inTable) {
    elements.push(flushTable("end"));
  }
  return elements;
};
const VISUAL_ORGANIZER_SECTION_SPECS = {
  "Venn Diagram": ["set-a", "set-b", "shared"],
  "T-Chart": ["left", "right"],
  "Frayer Model": ["definition", "characteristics", "examples", "non-examples"],
  "KWL Chart": ["know", "want", "learned"],
  "Claim-Evidence-Reasoning": ["claim", "evidence", "reasoning"],
  "Story Map": ["exposition", "rising-action", "climax", "falling-action", "resolution"],
  "See-Think-Wonder": ["see", "think", "wonder"]
};
const normalizeVisualOrganizerData = (input, typeOverride = "") => {
  const source = input && typeof input === "object" ? input : {};
  const structureType = typeOverride || source.structureType || "Structured Outline";
  const rawBranches = Array.isArray(source.branches) ? source.branches : [];
  const repairs = [];
  const issues = [];
  const branches = rawBranches.map((rawBranch, index) => {
    const branch = rawBranch && typeof rawBranch === "object" ? { ...rawBranch } : {};
    if (!branch.title) {
      branch.title = `Step ${index + 1}`;
      repairs.push(`branch-${index}-title`);
    } else {
      branch.title = String(branch.title);
    }
    if (!Array.isArray(branch.items)) {
      branch.items = branch.items == null ? [] : [String(branch.items)];
      repairs.push(`branch-${index}-items`);
    }
    return branch;
  });
  const sectionRoles = VISUAL_ORGANIZER_SECTION_SPECS[structureType];
  if (sectionRoles) {
    if (branches.length !== sectionRoles.length) {
      issues.push({ code: "branch-count", expected: sectionRoles.length, actual: branches.length });
    } else {
      branches.forEach((branch, index) => {
        if (!branch.sectionRole) {
          branch.sectionRole = sectionRoles[index];
          repairs.push(`branch-${index}-section-role`);
        }
      });
    }
  }
  if (structureType === "Cause and Effect") {
    branches.forEach((branch, index) => {
      const semanticText = `${branch.title || ""} ${branch.title_en || ""}`.toLowerCase();
      let role = String(branch.role || branch.semanticRole || "").trim().toLowerCase();
      if (!["cause", "effect", "chain"].includes(role)) {
        if (semanticText.includes("cause")) role = "cause";
        else if (semanticText.includes("effect") || semanticText.includes("consequence")) role = "effect";
        else if (semanticText.includes("chain") || semanticText.includes("sequence")) role = "chain";
        else role = index === 0 ? "cause" : index === 1 ? "effect" : "chain";
        repairs.push(`branch-${index}-cause-effect-role`);
      }
      branch.role = role;
    });
  }
  if (structureType === "Flow Chart" || structureType === "Process Flow / Sequence") {
    branches.forEach((branch, sourceIndex) => {
      const hasConnections = Array.isArray(branch.connections);
      const hasLegacyTargets = Array.isArray(branch.connectsTo);
      const rawConnections = hasConnections ? branch.connections : hasLegacyTargets ? branch.connectsTo.map((target) => ({ target })) : [];
      const seen = /* @__PURE__ */ new Set();
      const connections = rawConnections.reduce((valid, rawConnection) => {
        const connection = rawConnection && typeof rawConnection === "object" ? rawConnection : { target: rawConnection };
        const target = Number(connection.target ?? connection.to ?? connection.index);
        if (!Number.isInteger(target) || target < 0 || target >= branches.length || target === sourceIndex || seen.has(target)) {
          repairs.push(`branch-${sourceIndex}-invalid-connection`);
          return valid;
        }
        seen.add(target);
        valid.push({ target, label: String(connection.label || connection.condition || "").trim() });
        return valid;
      }, []);
      if (!hasConnections && !hasLegacyTargets && sourceIndex < branches.length - 1) {
        connections.push({ target: sourceIndex + 1, label: "" });
        repairs.push(`branch-${sourceIndex}-linear-connection`);
      }
      branch.connections = connections;
      branch.connectsTo = connections.map((connection) => connection.target);
    });
  }
  const main = source.main == null || source.main === "" ? "Main Topic" : String(source.main);
  if (main !== source.main) repairs.push("main");
  return {
    ...source,
    main,
    branches,
    structureType,
    schemaValidation: {
      valid: issues.length === 0,
      issues,
      repaired: repairs.length > 0,
      repairs
    }
  };
};
const _loadOrganizerHtml2Canvas = /* @__PURE__ */ (() => {
  let pending = null;
  return () => {
    if (typeof window === "undefined") return Promise.reject(new Error("no window"));
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    if (pending) return pending;
    pending = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
      script.async = true;
      script.crossOrigin = "anonymous";
      script.onload = () => window.html2canvas ? resolve(window.html2canvas) : reject(new Error("html2canvas unavailable"));
      script.onerror = () => {
        pending = null;
        reject(new Error("html2canvas failed to load"));
      };
      document.head.appendChild(script);
    });
    return pending;
  };
})();
const _organizerSlugify = (value) => String(value || "flow-chart").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "flow-chart";
const _downloadOrganizerBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1e3);
};
const FlowTopologyBoard = ({ branches, t, isEditingOutline, handleOutlineChange, leveledTextLanguage, topicTitle }) => {
  const viewportRef = React.useRef(null);
  const boardRef = React.useRef(null);
  const nodeRefs = React.useRef({});
  const [edgeGeometry, setEdgeGeometry] = React.useState([]);
  const [zoom, setZoom] = React.useState(1);
  const [collapsedNodes, setCollapsedNodes] = React.useState(() => /* @__PURE__ */ new Set());
  const [exportState, setExportState] = React.useState("idle");
  const [toolbarMessage, setToolbarMessage] = React.useState("");
  const markerToken = React.useId().replace(/:/g, "");
  const connectionKey = React.useMemo(() => JSON.stringify(branches.map((branch) => ({
    title: branch.title,
    items: branch.items,
    connections: branch.connections
  }))), [branches]);
  const topology = React.useMemo(() => {
    const nodeCount = branches.length;
    const indegree = Array(nodeCount).fill(0);
    branches.forEach((branch) => {
      (branch.connections || []).forEach((connection) => {
        if (connection.target >= 0 && connection.target < nodeCount) indegree[connection.target] += 1;
      });
    });
    let startNodes = indegree.map((count, index) => count === 0 ? index : null).filter((index) => index !== null);
    if (startNodes.length === 0 && nodeCount > 0) startNodes = [0];
    const ranks = Array(nodeCount).fill(null);
    startNodes.forEach((index) => {
      ranks[index] = 0;
    });
    for (let pass = 0; pass < nodeCount; pass++) {
      branches.forEach((branch, sourceIndex) => {
        if (ranks[sourceIndex] == null) return;
        (branch.connections || []).forEach((connection) => {
          if (connection.target <= sourceIndex) return;
          const proposed = Math.min(nodeCount - 1, ranks[sourceIndex] + 1);
          ranks[connection.target] = Math.max(ranks[connection.target] == null ? 0 : ranks[connection.target], proposed);
        });
      });
    }
    branches.forEach((branch, index) => {
      if (ranks[index] == null) ranks[index] = index === 0 ? 0 : Math.min(nodeCount - 1, (ranks[index - 1] == null ? index - 1 : ranks[index - 1]) + 1);
    });
    const groups = [];
    ranks.forEach((rank, index) => {
      if (!groups[rank]) groups[rank] = [];
      groups[rank].push(index);
    });
    const compactGroups = groups.filter(Boolean);
    const leafNodes = branches.map((branch, index) => (branch.connections || []).length === 0 ? index : null).filter((index) => index !== null);
    return { groups: compactGroups, startNodes, leafNodes, indegree, ranks };
  }, [connectionKey, branches.length]);
  const collapsedKey = Array.from(collapsedNodes).sort((a, b) => a - b).join(",");
  const layoutKey = connectionKey + "|" + (isEditingOutline ? "edit" : "view") + "|" + zoom + "|" + collapsedKey;
  React.useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board || typeof window === "undefined") return void 0;
    let frame = null;
    const measure = () => {
      const boardRect = board.getBoundingClientRect();
      const getRect = (key) => {
        const element = nodeRefs.current[key];
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return {
          left: (rect.left - boardRect.left) / zoom,
          right: (rect.right - boardRect.left) / zoom,
          top: (rect.top - boardRect.top) / zoom,
          bottom: (rect.bottom - boardRect.top) / zoom,
          width: rect.width / zoom,
          height: rect.height / zoom
        };
      };
      const logicalEdges = [];
      topology.startNodes.forEach((target) => logicalEdges.push({ from: "start", to: target, label: "", synthetic: true }));
      branches.forEach((branch, sourceIndex) => {
        (branch.connections || []).forEach((connection) => logicalEdges.push({
          from: sourceIndex,
          to: connection.target,
          label: connection.label || "",
          synthetic: false
        }));
      });
      topology.leafNodes.forEach((source) => logicalEdges.push({ from: source, to: "end", label: "", synthetic: true }));
      const geometry = logicalEdges.map((edge, edgeIndex) => {
        const sourceRect = getRect(edge.from);
        const targetRect = getRect(edge.to);
        if (!sourceRect || !targetRect) return null;
        const sourceRank = edge.from === "start" ? -1 : topology.ranks[edge.from];
        const targetRank = edge.to === "end" ? topology.groups.length : topology.ranks[edge.to];
        const isBackEdge = targetRank <= sourceRank;
        let path;
        let labelX;
        let labelY;
        if (isBackEdge) {
          const startX = sourceRect.right;
          const startY = sourceRect.top + sourceRect.height / 2;
          const endX = targetRect.right;
          const endY = targetRect.top + targetRect.height / 2;
          const loopX = Math.max(startX, endX) + 44 + edgeIndex % 3 * 18;
          path = ["M", startX, startY, "C", loopX, startY, loopX, endY, endX, endY].join(" ");
          labelX = loopX - 4;
          labelY = (startY + endY) / 2;
        } else {
          const startX = sourceRect.left + sourceRect.width / 2;
          const startY = sourceRect.bottom;
          const endX = targetRect.left + targetRect.width / 2;
          const endY = targetRect.top;
          const midY = (startY + endY) / 2;
          path = ["M", startX, startY, "C", startX, midY, endX, midY, endX, endY].join(" ");
          labelX = (startX + endX) / 2;
          labelY = midY;
        }
        return { ...edge, path, labelX, labelY, isBackEdge };
      }).filter(Boolean);
      setEdgeGeometry(geometry);
    };
    const scheduleMeasure = () => {
      if (frame != null) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };
    scheduleMeasure();
    const resizeObserver = window.ResizeObserver ? new window.ResizeObserver(scheduleMeasure) : null;
    if (resizeObserver) {
      resizeObserver.observe(board);
      Object.values(nodeRefs.current).forEach((element) => element && resizeObserver.observe(element));
    }
    window.addEventListener("resize", scheduleMeasure);
    return () => {
      if (frame != null) window.cancelAnimationFrame(frame);
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
    };
  }, [layoutKey, topology]);
  const updateConnection = (sourceIndex, targetIndex, enabled) => {
    const current = Array.isArray(branches[sourceIndex]?.connections) ? branches[sourceIndex].connections : [];
    const next = enabled ? current.filter((connection) => connection.target !== targetIndex).concat([{ target: targetIndex, label: "" }]) : current.filter((connection) => connection.target !== targetIndex);
    handleOutlineChange(sourceIndex, "connections", next);
  };
  const updateConnectionLabel = (sourceIndex, targetIndex, label) => {
    const current = Array.isArray(branches[sourceIndex]?.connections) ? branches[sourceIndex].connections : [];
    handleOutlineChange(sourceIndex, "connections", current.map(
      (connection) => connection.target === targetIndex ? { ...connection, label } : connection
    ));
  };
  const maxLaneCount = Math.max(1, ...topology.groups.map((group) => group.length));
  const minBoardWidth = Math.max(700, maxLaneCount * 300 + 80);
  const setNodeRef = (key) => (element) => {
    if (element) nodeRefs.current[key] = element;
    else delete nodeRefs.current[key];
  };
  const clampZoom = (value) => Math.min(1.6, Math.max(0.5, Math.round(value * 10) / 10));
  const changeZoom = (delta) => {
    setZoom((current) => {
      const next = clampZoom(current + delta);
      setToolbarMessage((t("outline.zoom_changed") || "Zoom") + ": " + Math.round(next * 100) + "%");
      return next;
    });
  };
  const fitToScreen = () => {
    const viewportWidth = viewportRef.current?.clientWidth || minBoardWidth;
    const next = clampZoom(Math.min(1, (viewportWidth - 24) / minBoardWidth));
    setZoom(next);
    setToolbarMessage((t("outline.fit_complete") || "Fit to screen") + ": " + Math.round(next * 100) + "%");
  };
  const toggleNodeCollapsed = (index) => {
    setCollapsedNodes((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };
  const setAllCollapsed = (shouldCollapse) => {
    setCollapsedNodes(shouldCollapse ? new Set(branches.map((branch, index) => index)) : /* @__PURE__ */ new Set());
    setToolbarMessage(shouldCollapse ? t("outline.all_nodes_collapsed") || "All flow nodes collapsed" : t("outline.all_nodes_expanded") || "All flow nodes expanded");
  };
  const buildExportSvg = () => {
    const board = boardRef.current;
    if (!board || typeof window === "undefined") throw new Error("Flow chart is not ready to export");
    const clone = board.cloneNode(true);
    const sourceElements = [board].concat(Array.from(board.querySelectorAll("*")));
    const clonedElements = [clone].concat(Array.from(clone.querySelectorAll("*")));
    sourceElements.forEach((sourceElement, index) => {
      const cloneElement = clonedElements[index];
      if (!cloneElement || !(cloneElement instanceof Element)) return;
      const computed = window.getComputedStyle(sourceElement);
      const declarations = [];
      for (let propertyIndex = 0; propertyIndex < computed.length; propertyIndex++) {
        const property = computed[propertyIndex];
        if (property === "zoom") continue;
        declarations.push(property + ":" + computed.getPropertyValue(property));
      }
      cloneElement.setAttribute("style", declarations.join(";"));
    });
    Array.from(board.querySelectorAll("input")).forEach((input, index) => {
      const cloneInput = clone.querySelectorAll("input")[index];
      if (!cloneInput) return;
      cloneInput.setAttribute("value", input.value || "");
      if (input.checked) cloneInput.setAttribute("checked", "checked");
      else cloneInput.removeAttribute("checked");
    });
    clone.style.zoom = "1";
    clone.style.transform = "none";
    const boardRect = board.getBoundingClientRect();
    const width = Math.ceil(Math.max(board.scrollWidth, boardRect.width / zoom));
    const height = Math.ceil(Math.max(board.scrollHeight, boardRect.height / zoom));
    return '<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + " " + height + '"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="width:' + width + "px;height:" + height + 'px;background:#f8fafc;">' + clone.outerHTML + "</div></foreignObject></svg>";
  };
  const exportFilenameBase = "flow-chart-" + _organizerSlugify(topicTitle) + "-" + (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const handleDownloadSvg = () => {
    try {
      setExportState("rendering");
      const svg = buildExportSvg();
      _downloadOrganizerBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), exportFilenameBase + ".svg");
      setExportState("idle");
      setToolbarMessage(t("outline.svg_exported") || "SVG downloaded");
    } catch (error) {
      setExportState("error");
      setToolbarMessage(t("outline.export_failed") || "Export failed. Please try again.");
      window.setTimeout(() => setExportState("idle"), 2500);
    }
  };
  const handleDownloadPng = async () => {
    if (exportState === "rendering") return;
    const board = boardRef.current;
    if (!board) return;
    setExportState("rendering");
    let exportClone = null;
    try {
      if (document.fonts?.ready) {
        try {
          await document.fonts.ready;
        } catch (_) {
        }
      }
      const html2canvas = await _loadOrganizerHtml2Canvas();
      exportClone = board.cloneNode(true);
      exportClone.style.zoom = "1";
      exportClone.style.position = "fixed";
      exportClone.style.left = "-100000px";
      exportClone.style.top = "0";
      exportClone.style.pointerEvents = "none";
      exportClone.style.background = "#f8fafc";
      document.body.appendChild(exportClone);
      const canvas = await html2canvas(exportClone, {
        backgroundColor: "#f8fafc",
        useCORS: true,
        scale: 2,
        logging: false
      });
      const blob = await new Promise((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("PNG encoding failed")), "image/png"));
      _downloadOrganizerBlob(blob, exportFilenameBase + ".png");
      setExportState("idle");
      setToolbarMessage(t("outline.png_exported") || "PNG downloaded");
    } catch (error) {
      setExportState("error");
      setToolbarMessage(t("outline.png_export_failed") || "PNG export is unavailable. SVG and Print still work offline.");
      window.setTimeout(() => setExportState("idle"), 3e3);
    } finally {
      if (exportClone?.parentNode) exportClone.parentNode.removeChild(exportClone);
    }
  };
  const handlePrintFlow = () => {
    try {
      const svg = buildExportSvg().replace(/^<\?xml[^>]*>\s*/, "");
      const printWindow = window.open("", "_blank", "width=1200,height=800");
      if (!printWindow) throw new Error("Print window blocked");
      const safeTitle = String(topicTitle || "Flow Chart").replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]);
      printWindow.document.open();
      printWindow.document.write(
        '<!doctype html><html><head><meta charset="utf-8"><title>' + safeTitle + "</title><style>html,body{margin:0;background:white}body{padding:20px}svg{display:block;max-width:100%;height:auto;margin:auto}@page{size:landscape;margin:.35in}</style></head><body>" + svg + "<script>window.onload=function(){setTimeout(function(){window.print();},100);};<\/script></body></html>"
      );
      printWindow.document.close();
      setToolbarMessage(t("outline.print_opened") || "Print or Save as PDF opened");
    } catch (error) {
      setExportState("error");
      setToolbarMessage(t("outline.print_failed") || "Print could not be opened. Check pop-up permissions.");
      window.setTimeout(() => setExportState("idle"), 2500);
    }
  };
  return /* @__PURE__ */ React.createElement("section", { className: "rounded-3xl border border-slate-200 bg-white shadow-sm", "aria-label": t("outline.flow_topology") || "Flow chart topology" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-3" }, /* @__PURE__ */ React.createElement("div", { role: "toolbar", "aria-label": t("outline.flow_view_controls") || "Flow chart view controls", className: "flex flex-wrap items-center gap-1.5" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => changeZoom(-0.1), disabled: zoom <= 0.5, className: "min-h-11 min-w-11 rounded-lg border border-slate-300 bg-white px-3 font-black text-slate-800 hover:bg-slate-100 disabled:opacity-40", "aria-label": t("outline.zoom_out") || "Zoom out", title: t("outline.zoom_out") || "Zoom out" }, "?"), /* @__PURE__ */ React.createElement("span", { className: "min-w-14 text-center text-xs font-black tabular-nums text-slate-700", "aria-label": (t("outline.current_zoom") || "Current zoom") + " " + Math.round(zoom * 100) + "%" }, Math.round(zoom * 100), "%"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => changeZoom(0.1), disabled: zoom >= 1.6, className: "min-h-11 min-w-11 rounded-lg border border-slate-300 bg-white px-3 font-black text-slate-800 hover:bg-slate-100 disabled:opacity-40", "aria-label": t("outline.zoom_in") || "Zoom in", title: t("outline.zoom_in") || "Zoom in" }, "+"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: fitToScreen, className: "min-h-11 rounded-lg border border-indigo-300 bg-indigo-50 px-3 text-xs font-black text-indigo-800 hover:bg-indigo-100" }, t("outline.fit_to_screen") || "Fit"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setAllCollapsed(collapsedNodes.size !== branches.length), className: "min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-100" }, collapsedNodes.size === branches.length ? t("outline.expand_all") || "Expand all" : t("outline.collapse_all") || "Collapse all")), /* @__PURE__ */ React.createElement("div", { role: "toolbar", "aria-label": t("outline.flow_export_controls") || "Flow chart export controls", className: "flex flex-wrap items-center gap-1.5" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: handleDownloadSvg, disabled: exportState === "rendering", className: "min-h-11 rounded-lg border border-violet-300 bg-violet-50 px-3 text-xs font-black text-violet-800 hover:bg-violet-100 disabled:opacity-50", "aria-label": t("outline.download_svg") || "Download flow chart as SVG" }, "SVG"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: handleDownloadPng, disabled: exportState === "rendering", className: "min-h-11 rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-xs font-black text-emerald-800 hover:bg-emerald-100 disabled:opacity-50", "aria-busy": exportState === "rendering", "aria-label": t("outline.download_png") || "Download flow chart as PNG" }, exportState === "rendering" ? t("outline.rendering") || "Rendering?" : "PNG"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: handlePrintFlow, className: "min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-xs font-black text-slate-800 hover:bg-slate-100", "aria-label": t("outline.print_pdf") || "Print or save flow chart as PDF" }, t("outline.print") || "Print / PDF")), /* @__PURE__ */ React.createElement("div", { className: "sr-only", role: "status", "aria-live": "polite" }, toolbarMessage)), /* @__PURE__ */ React.createElement("div", { ref: viewportRef, className: "overflow-auto rounded-b-3xl bg-slate-50/70" }, /* @__PURE__ */ React.createElement("div", { ref: boardRef, className: "relative p-8 md:p-10", style: { minWidth: minBoardWidth + "px", zoom } }, /* @__PURE__ */ React.createElement("svg", { className: "absolute inset-0 z-0 h-full w-full overflow-visible pointer-events-none", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("marker", { id: "flow-arrow-" + markerToken, viewBox: "0 0 10 10", refX: "8", refY: "5", markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse" }, /* @__PURE__ */ React.createElement("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "#4f46e5" })), /* @__PURE__ */ React.createElement("marker", { id: "flow-loop-arrow-" + markerToken, viewBox: "0 0 10 10", refX: "8", refY: "5", markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse" }, /* @__PURE__ */ React.createElement("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "#b45309" }))), edgeGeometry.map((edge, index) => {
    const displayLabel = edge.label.length > 28 ? edge.label.slice(0, 25) + "..." : edge.label;
    const labelWidth = Math.max(44, Math.min(210, displayLabel.length * 7 + 18));
    const markerId = edge.isBackEdge ? "flow-loop-arrow-" + markerToken : "flow-arrow-" + markerToken;
    return /* @__PURE__ */ React.createElement("g", { key: [edge.from, edge.to, index].join("-") }, /* @__PURE__ */ React.createElement(
      "path",
      {
        d: edge.path,
        fill: "none",
        stroke: edge.isBackEdge ? "#b45309" : "#4f46e5",
        strokeWidth: edge.synthetic ? 2 : 2.5,
        strokeDasharray: edge.isBackEdge ? "7 5" : void 0,
        markerEnd: "url(#" + markerId + ")"
      }
    ), displayLabel && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("rect", { x: edge.labelX - labelWidth / 2, y: edge.labelY - 12, width: labelWidth, height: "24", rx: "12", fill: "white", stroke: edge.isBackEdge ? "#f59e0b" : "#a5b4fc" }), /* @__PURE__ */ React.createElement("text", { x: edge.labelX, y: edge.labelY + 4, textAnchor: "middle", fill: edge.isBackEdge ? "#92400e" : "#3730a3", fontSize: "11", fontWeight: "800" }, displayLabel)));
  })), /* @__PURE__ */ React.createElement("div", { ref: setNodeRef("start"), className: "relative z-10 mx-auto mb-12 w-fit rounded-full border-2 border-indigo-300 bg-indigo-700 px-8 py-3 text-sm font-black uppercase tracking-widest text-white shadow-md" }, t("outline.labels.start") || "Start"), /* @__PURE__ */ React.createElement("div", { role: "list", className: "relative z-10 space-y-16" }, topology.groups.map((group, levelIndex) => /* @__PURE__ */ React.createElement("div", { key: levelIndex, className: "grid items-start gap-8", style: { gridTemplateColumns: "repeat(" + group.length + ", minmax(15rem, 1fr))" } }, group.map((branchIndex) => {
    const branch = branches[branchIndex];
    const outgoing = branch.connections || [];
    const isDecision = outgoing.length > 1;
    const isMerge = (topology.indegree[branchIndex] || 0) > 1;
    const isCollapsed = collapsedNodes.has(branchIndex);
    const badgeText = isDecision ? t("outline.decision_point") || "Decision point" : isMerge ? t("outline.paths_merge_here") || "Paths merge here" : (t("outline.step") || "Step") + " " + (branchIndex + 1);
    return /* @__PURE__ */ React.createElement(
      "section",
      {
        key: branchIndex,
        ref: setNodeRef(branchIndex),
        role: "listitem",
        className: "relative rounded-2xl border-2 bg-white p-5 shadow-lg " + (isDecision ? "border-amber-400 ring-4 ring-amber-100" : isMerge ? "border-teal-400 ring-4 ring-teal-100" : "border-indigo-200")
      },
      /* @__PURE__ */ React.createElement("div", { className: "absolute -top-4 left-4 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white " + (isDecision ? "bg-amber-600" : isMerge ? "bg-teal-700" : "bg-indigo-600") }, badgeText),
      /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => toggleNodeCollapsed(branchIndex),
          "aria-expanded": !isCollapsed,
          "aria-label": (isCollapsed ? t("outline.expand_step") || "Expand step" : t("outline.collapse_step") || "Collapse step") + " " + (branchIndex + 1),
          className: "absolute right-3 top-3 flex min-h-11 min-w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-lg font-black text-slate-700 shadow-sm hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-indigo-500"
        },
        /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, isCollapsed ? "+" : "?")
      ),
      /* @__PURE__ */ React.createElement("div", { className: "mt-2 pr-10" }, isEditingOutline ? /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          "aria-label": (t("common.enter_branch") || "Enter branch") + " " + (branchIndex + 1),
          value: branch.title,
          onChange: (event) => handleOutlineChange(branchIndex, "title", event.target.value),
          className: "w-full rounded-lg border border-indigo-300 px-3 py-2 font-black text-indigo-950 focus:ring-2 focus:ring-indigo-300"
        }
      ), (branch.title_en || leveledTextLanguage !== "English") && /* @__PURE__ */ React.createElement(
        "input",
        {
          "aria-label": t("common.common_placeholder_title_trans") || "Translated title",
          value: branch.title_en || "",
          onChange: (event) => handleOutlineChange(branchIndex, "title", event.target.value, null, true),
          className: "w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 focus:ring-2 focus:ring-indigo-200"
        }
      )) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("h4", { className: "text-lg font-black text-indigo-950" }, branch.title), branch.title_en && /* @__PURE__ */ React.createElement("p", { className: "text-xs italic text-slate-600" }, "(", branch.title_en, ")"))),
      /* @__PURE__ */ React.createElement("ul", { className: (isCollapsed ? "hidden " : "") + "mt-3 space-y-2" }, (branch.items || []).map((item, itemIndex) => {
        const itemText = typeof item === "object" ? item?.text || "" : String(item || "");
        return /* @__PURE__ */ React.createElement("li", { key: itemIndex, className: "flex items-start gap-2 text-sm text-slate-700" }, /* @__PURE__ */ React.createElement("span", { className: "mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-400", "aria-hidden": "true" }), isEditingOutline ? /* @__PURE__ */ React.createElement(
          "input",
          {
            "aria-label": (t("common.enter_item") || "Enter item") + " " + (itemIndex + 1),
            value: itemText,
            onChange: (event) => handleOutlineChange(branchIndex, "item", event.target.value, itemIndex),
            className: "w-full rounded-md border border-slate-300 px-2 py-1 focus:ring-2 focus:ring-indigo-200"
          }
        ) : /* @__PURE__ */ React.createElement("span", null, itemText));
      })),
      !isCollapsed && outgoing.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "mt-4 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3", "aria-label": t("outline.outgoing_paths") || "Outgoing paths" }, outgoing.map((connection) => /* @__PURE__ */ React.createElement("span", { key: connection.target, className: "rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-800" }, (connection.label ? connection.label + ": " : "") + (t("outline.step") || "Step") + " " + (connection.target + 1)))),
      isEditingOutline && !isCollapsed && /* @__PURE__ */ React.createElement("details", { className: "mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3" }, /* @__PURE__ */ React.createElement("summary", { className: "cursor-pointer text-xs font-black text-amber-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-600" }, t("outline.edit_paths") || "Edit paths and labels"), /* @__PURE__ */ React.createElement("div", { className: "mt-3 space-y-2" }, branches.map((targetBranch, targetIndex) => {
        if (targetIndex === branchIndex) return null;
        const connection = outgoing.find((candidate) => candidate.target === targetIndex);
        const checkboxId = ["flow-path", markerToken, branchIndex, targetIndex].join("-");
        return /* @__PURE__ */ React.createElement("div", { key: targetIndex, className: "rounded-lg border border-amber-200 bg-white p-2" }, /* @__PURE__ */ React.createElement("label", { htmlFor: checkboxId, className: "flex min-h-11 cursor-pointer items-center gap-2 text-xs font-bold text-slate-800" }, /* @__PURE__ */ React.createElement(
          "input",
          {
            id: checkboxId,
            type: "checkbox",
            checked: !!connection,
            onChange: (event) => updateConnection(branchIndex, targetIndex, event.target.checked),
            className: "h-5 w-5 rounded border-slate-400 text-indigo-600 focus:ring-indigo-500"
          }
        ), /* @__PURE__ */ React.createElement("span", null, (t("outline.connect_to") || "Connect to") + " " + (targetIndex + 1) + ": " + targetBranch.title)), connection && /* @__PURE__ */ React.createElement("label", { className: "mt-1 block text-[11px] font-bold text-slate-600" }, t("outline.path_label") || "Path label (for example: Yes or No)", /* @__PURE__ */ React.createElement(
          "input",
          {
            value: connection.label || "",
            maxLength: 40,
            onChange: (event) => updateConnectionLabel(branchIndex, targetIndex, event.target.value),
            className: "mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm font-normal text-slate-800 focus:ring-2 focus:ring-indigo-200",
            placeholder: t("outline.path_label_placeholder") || "Optional condition"
          }
        )));
      })))
    );
  })))), /* @__PURE__ */ React.createElement("div", { ref: setNodeRef("end"), className: "relative z-10 mx-auto mt-12 w-fit rounded-full border-4 border-white bg-slate-800 px-8 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg" }, t("outline.labels.end") || "End"), /* @__PURE__ */ React.createElement("ul", { className: "sr-only" }, branches.flatMap((branch, sourceIndex) => (branch.connections || []).map((connection) => {
    const routeText = (t("outline.step") || "Step") + " " + (sourceIndex + 1) + ", " + branch.title + ", " + (t("outline.connects_to") || "connects to") + " " + (t("outline.step") || "step") + " " + (connection.target + 1) + ", " + (branches[connection.target]?.title || "") + (connection.label ? ", " + (t("outline.path_label") || "path label") + " " + connection.label : "") + ".";
    return /* @__PURE__ */ React.createElement("li", { key: [sourceIndex, connection.target].join("-") }, routeText);
  }))))));
};
const KwlResponseBoard = ({ main, branches, t }) => {
  const storageKey = React.useMemo(() => {
    const seed = [main || "", ...Array.isArray(branches) ? branches.slice(0, 3).map((branch) => branch?.title || "") : []].join("|");
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = (hash << 5) - hash + seed.charCodeAt(i) | 0;
    return `alloflow_kwl_notes_${Math.abs(hash)}`;
  }, [main, branches]);
  const loadValues = (key) => {
    if (typeof window === "undefined" || !window.localStorage) return ["", "", ""];
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) || "null");
      if (Array.isArray(parsed) && parsed.length === 3) return parsed.map((value) => String(value || ""));
    } catch (_) {
    }
    return ["", "", ""];
  };
  const [entry, setEntry] = React.useState(() => ({ key: storageKey, values: loadValues(storageKey) }));
  React.useEffect(() => {
    if (entry.key !== storageKey) setEntry({ key: storageKey, values: loadValues(storageKey) });
  }, [storageKey, entry.key]);
  React.useEffect(() => {
    if (entry.key !== storageKey) return;
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(entry.values));
    } catch (_) {
    }
  }, [entry, storageKey]);
  const labels = [0, 1, 2].map((index) => branches?.[index]?.title || [
    t("outline.kwl_know") || "Know",
    t("outline.kwl_want") || "Want to Know",
    t("outline.kwl_learned") || "Learned"
  ][index]);
  const updateValue = (index, value) => {
    setEntry((current) => {
      const values = [...current.values];
      values[index] = value;
      return { ...current, values };
    });
  };
  const clearValues = () => setEntry((current) => ({ ...current, values: ["", "", ""] }));
  return /* @__PURE__ */ React.createElement("section", { className: "mt-5 rounded-2xl border-2 border-emerald-200 bg-emerald-50/40 p-4", "aria-label": t("outline.kwl_personal_notes") || "My KWL notes" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-3 mb-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h4", { className: "font-black text-emerald-900" }, t("outline.kwl_personal_notes") || "My KWL notes"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-emerald-800" }, t("outline.kwl_saved_locally") || "Your responses are saved only on this device.")), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: clearValues, className: "min-h-11 px-4 py-2 rounded-full text-xs font-bold text-emerald-900 bg-white border border-emerald-300 hover:bg-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2" }, t("outline.kwl_clear_notes") || "Clear my notes")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3" }, labels.map((label, index) => /* @__PURE__ */ React.createElement("label", { key: index, className: "block text-xs font-bold text-slate-700" }, /* @__PURE__ */ React.createElement("span", { className: "block mb-1" }, label), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      value: entry.values[index],
      onChange: (event) => updateValue(index, event.target.value),
      maxLength: 2e3,
      rows: 5,
      className: "w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-normal text-slate-800 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200",
      "aria-label": `${label}: ${t("outline.kwl_personal_response") || "personal response"}`,
      placeholder: index === 2 ? t("outline.kwl_learned_response_placeholder") || "What did you learn?" : t("outline.kwl_response_placeholder") || "Add your thinking\u2026"
    }
  )))));
};
const renderOutlineContent = (deps) => {
  const { ErrorBoundary, KeyConceptMapView, VennGame, generatedContent, isInteractiveVenn, isProcessing, isTeacherMode, isVennPlaying, leveledTextLanguage, outlineTranslationMode, vennGameData, vennInputs, isEditingOutline, isMapLocked, setOutlineTranslationMode, setVennInputs, closeVenn, handleAddVennItem, handleGameCompletion, handleGameScoreUpdate, handleGenerateOutcome, handleInitializeVenn, handleOutlineChange, handleRemoveVennItem, handleSetIsVennPlayingToTrue, playSound, t, isCESortPlaying, ceGameData, closeCESort, setIsCESortPlaying, setCeGameData, isPipelinePlaying, setIsPipelinePlaying, closePipeline, isTChartPlaying, setIsTChartPlaying, closeTChart, isConceptMapSortPlaying, setIsConceptMapSortPlaying, closeConceptMapSort, isOutlineSortPlaying, setIsOutlineSortPlaying, closeOutlineSort, isFishboneSortPlaying, setIsFishboneSortPlaying, closeFishboneSort, isProblemSolutionSortPlaying, setIsProblemSolutionSortPlaying, closeProblemSolutionSort, isFrayerSortPlaying, setIsFrayerSortPlaying, closeFrayerSort, isSeeThinkWonderSortPlaying, setIsSeeThinkWonderSortPlaying, closeSeeThinkWonderSort, isStoryMapSortPlaying, setIsStoryMapSortPlaying, closeStoryMapSort, isInteractiveTChart, setIsInteractiveTChart, isInteractiveCESort, setIsInteractiveCESort, isInteractivePipeline, setIsInteractivePipeline, isInteractiveConceptMapSort, setIsInteractiveConceptMapSort, isInteractiveOutlineSort, setIsInteractiveOutlineSort, isInteractiveFishboneSort, setIsInteractiveFishboneSort, isInteractiveProblemSolutionSort, setIsInteractiveProblemSolutionSort, isInteractiveFrayerSort, setIsInteractiveFrayerSort, isInteractiveSeeThinkWonderSort, setIsInteractiveSeeThinkWonderSort, isInteractiveStoryMapSort, setIsInteractiveStoryMapSort, isInteractiveStrandChallenge, setIsInteractiveStrandChallenge, isInteractivePalaceRecall, setIsInteractivePalaceRecall, broadcastInteractiveOrganizer } = deps;
  const _broadcastInteractiveOrganizer = broadcastInteractiveOrganizer || (() => {
  });
  const _GameLoadingFallback = () => React.createElement(
    "div",
    { className: "p-8 flex flex-col items-center justify-center gap-3 text-center", role: "status", "aria-live": "polite" },
    React.createElement("div", { className: "w-10 h-10 rounded-full border-[3px] border-indigo-100 border-t-indigo-500 motion-safe:animate-spin", "aria-hidden": "true" }),
    React.createElement("div", { className: "text-sm font-bold text-slate-500" }, t("common.loading") || "Loading the activity\u2026")
  );
  const CauseEffectSortGame = window.AlloModules && window.AlloModules.CauseEffectSortGame ? window.AlloModules.CauseEffectSortGame : _GameLoadingFallback;
  const PipelineBuilderGame = window.AlloModules && window.AlloModules.PipelineBuilderGame ? window.AlloModules.PipelineBuilderGame : _GameLoadingFallback;
  const TChartSortGame = window.AlloModules && window.AlloModules.TChartSortGame ? window.AlloModules.TChartSortGame : _GameLoadingFallback;
  const ConceptMapSortGame = window.AlloModules && window.AlloModules.ConceptMapSortGame ? window.AlloModules.ConceptMapSortGame : _GameLoadingFallback;
  const OutlineSortGame = window.AlloModules && window.AlloModules.OutlineSortGame ? window.AlloModules.OutlineSortGame : _GameLoadingFallback;
  const FishboneSortGame = window.AlloModules && window.AlloModules.FishboneSortGame ? window.AlloModules.FishboneSortGame : _GameLoadingFallback;
  const ProblemSolutionSortGame = window.AlloModules && window.AlloModules.ProblemSolutionSortGame ? window.AlloModules.ProblemSolutionSortGame : _GameLoadingFallback;
  const FrayerSortGame = window.AlloModules && window.AlloModules.FrayerSortGame ? window.AlloModules.FrayerSortGame : _GameLoadingFallback;
  const SeeThinkWonderSortGame = window.AlloModules && window.AlloModules.SeeThinkWonderSortGame ? window.AlloModules.SeeThinkWonderSortGame : _GameLoadingFallback;
  const StoryMapSortGame = window.AlloModules && window.AlloModules.StoryMapSortGame ? window.AlloModules.StoryMapSortGame : _GameLoadingFallback;
  const handleGenerateFrayerImage = deps.handleGenerateFrayerImage;
  const handleRemoveFrayerImage = deps.handleRemoveFrayerImage;
  try {
    if (window._DEBUG_VIEW_RENDERERS) console.log("[ViewRenderers] renderOutlineContent fired");
  } catch (_) {
  }
  if (!generatedContent || generatedContent.type !== "outline" || !generatedContent?.data) return null;
  const requestedType = generatedContent?.data?.structureType || "Structured Outline";
  const organizerData = normalizeVisualOrganizerData(generatedContent?.data, requestedType);
  const { main, main_en, branches, structureType } = organizerData;
  const type = structureType || "Structured Outline";
  const MIN_GAME_ITEMS = 4;
  const totalBranchItems = branches.reduce((s, b) => s + (b.items || []).filter((it) => typeof it === "object" ? it.text : it).length, 0);
  const showGameButton = totalBranchItems >= MIN_GAME_ITEMS && branches.length >= 2;
  const GameButtonHint = () => /* @__PURE__ */ React.createElement("p", { id: "game-btn-hint", className: "sr-only" }, t("games.button_hint") || "Practice what you just learned with a quick drag-and-drop sorting game. Keyboard friendly: press Enter to select an item, then choose a destination.");
  const MainTitle = () => /* @__PURE__ */ React.createElement("div", { className: "text-center mb-8" }, isEditingOutline ? /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-2 max-w-md mx-auto" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.enter_main"),
      value: main,
      onChange: (e) => handleOutlineChange(null, "main", e.target.value),
      className: "text-2xl font-black text-center text-slate-800 bg-white border border-indigo-200 rounded p-1 focus:ring-2 focus:ring-indigo-400 w-full"
    }
  ), (main_en || leveledTextLanguage !== "English") && /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.common_placeholder_translation"),
      value: main_en || "",
      onChange: (e) => handleOutlineChange(null, "main", e.target.value, null, true),
      className: "text-sm text-center text-slate-600 bg-white border border-slate-400 rounded p-1 focus:ring-2 focus:ring-indigo-400 w-full",
      placeholder: t("common.placeholder_translation")
    }
  )) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("h3", { className: "text-2xl font-black text-slate-800" }, main), main_en && /* @__PURE__ */ React.createElement("p", { className: "text-sm text-slate-600 italic" }, "(", main_en, ")")));
  const renderOrganizerFallback = (title, description, detail = "") => /* @__PURE__ */ React.createElement("div", { className: "max-w-2xl mx-auto px-4 py-8" }, /* @__PURE__ */ React.createElement(MainTitle, null), /* @__PURE__ */ React.createElement("div", { role: "status", className: "bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 text-center" }, /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-black text-amber-900 mb-2" }, title), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-amber-800" }, description), detail && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-amber-700 mt-3" }, detail)));
  const BranchItem = React.memo(({ branch, bIdx, minimal = false, colorClass = "bg-white" }) => /* @__PURE__ */ React.createElement("div", { className: `${colorClass} p-5 rounded-2xl border-2 shadow-sm transition-all h-full ${bIdx % 2 === 0 ? "border-indigo-100" : "border-teal-100"} ${minimal ? "p-3" : ""} hover:shadow-md relative z-10` }, /* @__PURE__ */ React.createElement("div", { className: "mb-3 pb-2 border-b border-black/5" }, isEditingOutline ? /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-1" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.enter_branch"),
      value: branch.title,
      onChange: (e) => handleOutlineChange(bIdx, "title", e.target.value),
      className: "font-bold text-lg text-indigo-900 w-full bg-transparent border-b border-dashed border-indigo-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded px-1"
    }
  ), (branch.title_en || leveledTextLanguage !== "English") && /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.common_placeholder_title_trans"),
      value: branch.title_en || "",
      onChange: (e) => handleOutlineChange(bIdx, "title", e.target.value, null, true),
      className: "text-xs text-slate-600 w-full bg-transparent border-b border-dashed border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 rounded px-1",
      placeholder: t("common.placeholder_title_trans")
    }
  )) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("h4", { className: "font-bold text-lg text-indigo-900" }, branch.title), branch.title_en && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-600 italic" }, "(", branch.title_en, ")"))), /* @__PURE__ */ React.createElement("ul", { className: "space-y-2" }, branch.items && branch.items.map((item, iIdx) => /* @__PURE__ */ React.createElement("li", { key: iIdx, className: "flex items-start gap-2 text-sm text-slate-700" }, /* @__PURE__ */ React.createElement("div", { className: `w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${bIdx % 2 === 0 ? "bg-indigo-400" : "bg-teal-400"}` }), /* @__PURE__ */ React.createElement("div", { className: "w-full" }, isEditingOutline ? /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-1" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.enter_item"),
      value: item,
      onChange: (e) => handleOutlineChange(bIdx, "item", e.target.value, iIdx),
      className: "w-full bg-white/50 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-300 border border-transparent focus:border-indigo-200"
    }
  ), (branch.items_en?.[iIdx] || leveledTextLanguage !== "English") && /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.common_placeholder_item_trans"),
      value: branch.items_en?.[iIdx] || "",
      onChange: (e) => handleOutlineChange(bIdx, "item", e.target.value, iIdx, true),
      className: "w-full bg-white/50 rounded px-2 py-0.5 text-xs text-slate-600 italic focus:ring-2 focus:ring-indigo-300",
      placeholder: t("common.placeholder_item_trans")
    }
  )) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", null, item), branch.items_en?.[iIdx] && /* @__PURE__ */ React.createElement("div", { className: "text-xs text-slate-600 italic" }, "(", branch.items_en[iIdx], ")"))))))));
  if (type === "Flow Chart" || type === "Process Flow / Sequence") {
    if (isPipelinePlaying || isInteractivePipeline && !isTeacherMode) {
      const stepData = branches.map((branch) => ({
        title: branch.title,
        items: branch.items || [],
        connections: branch.connections || [],
        connectsTo: (branch.connections || []).map((connection) => connection.target)
      }));
      return /* @__PURE__ */ React.createElement(ErrorBoundary, { fallbackMessage: "Pipeline Builder encountered an error." }, /* @__PURE__ */ React.createElement(
        PipelineBuilderGame,
        {
          data: { steps: stepData },
          onClose: closePipeline,
          playSound,
          topicTitle: main || "",
          onScoreUpdate: handleGameScoreUpdate,
          onGameComplete: handleGameCompletion
        }
      ));
    }
    return /* @__PURE__ */ React.createElement("div", { className: "mx-auto max-w-7xl" }, showGameButton && /* @__PURE__ */ React.createElement("div", { className: "mb-4 flex justify-center" }, /* @__PURE__ */ React.createElement(GameButtonHint, null), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setIsInteractivePipeline(true);
          setIsPipelinePlaying(true);
          _broadcastInteractiveOrganizer("pipeline");
        },
        className: "flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2 text-sm font-bold text-white shadow-md transition-all hover:scale-105 hover:shadow-lg motion-safe:animate-[pulse_3s_ease-in-out_infinite]",
        "aria-describedby": "game-btn-hint",
        "aria-label": t("games.pipeline.title") || "Pipeline Builder"
      },
      /* @__PURE__ */ React.createElement(Gamepad2, { size: 16 }),
      " ",
      t("games.pipeline.play_btn") || "Build the Flow"
    ), isInteractivePipeline && isTeacherMode && /* @__PURE__ */ React.createElement("div", { className: "ml-2 flex items-center gap-2", role: "status", "aria-live": "polite" }, /* @__PURE__ */ React.createElement("span", { className: "rounded-full border border-amber-300 bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800" }, "?? ", t("outline.live_for_students") || "Live for students"), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setIsInteractivePipeline(false);
          _broadcastInteractiveOrganizer(null);
        },
        className: "rounded-full border border-red-300 bg-red-50 px-2 py-1 text-xs font-bold text-red-700 hover:bg-red-100",
        "aria-label": t("a11y.stop_interactive_activity")
      },
      "? ",
      t("outline.stop_activity") || "Stop Activity"
    ))), /* @__PURE__ */ React.createElement(MainTitle, null), React.createElement(FlowTopologyBoard, {
      branches,
      t,
      isEditingOutline,
      handleOutlineChange,
      leveledTextLanguage,
      topicTitle: main
    }));
  }
  if (type === "Venn Diagram") {
    if (!Array.isArray(branches) || branches.length < 3) {
      return /* @__PURE__ */ React.createElement("div", { className: "max-w-2xl mx-auto px-4 py-8" }, /* @__PURE__ */ React.createElement("div", { className: "bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 text-center" }, /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-black text-amber-800 mb-2" }, t("outline.venn_fallback_title") || "This concept did not produce a complete Venn diagram"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-amber-700" }, t("outline.venn_fallback_desc") || "Venn diagrams need two distinct categories plus their shared traits. Try regenerating, or pick a different organizer type.")));
    }
    const setA = branches[0] || { title: "Set A", items: [] };
    const setB = branches[1] || { title: "Set B", items: [] };
    const shared = branches[2] || { title: "Shared / Overlap", items: [] };
    const isNonEnglish = leveledTextLanguage !== "English";
    const showEnglish = !isNonEnglish || outlineTranslationMode === "bilingual";
    const renderVennItems = (items, items_en, branchIndex) => {
      return items.slice(0, 5).map((it, i) => /* @__PURE__ */ React.createElement("li", { key: i }, isEditingOutline ? /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-1 mb-2" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          "aria-label": t("common.enter_it"),
          value: it,
          onChange: (e) => handleOutlineChange(branchIndex, "item", e.target.value, i),
          onClick: (e) => e.stopPropagation(),
          className: "w-full bg-white/50 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-300 border border-transparent focus:border-indigo-200 text-xs font-bold"
        }
      ), showEnglish && isNonEnglish && (items_en?.[i] || items_en?.[i] === "") && /* @__PURE__ */ React.createElement(
        "input",
        {
          "aria-label": t("common.enter_items_en"),
          value: items_en[i] || "",
          onChange: (e) => handleOutlineChange(branchIndex, "item", e.target.value, i, true),
          onClick: (e) => e.stopPropagation(),
          className: "w-full bg-white/50 rounded px-2 py-0.5 text-[0.8em] opacity-80 font-normal focus:ring-2 focus:ring-indigo-300 border border-transparent focus:border-indigo-200",
          placeholder: t("common.placeholder_item_trans")
        }
      )) : /* @__PURE__ */ React.createElement(React.Fragment, null, "\u2022 ", it, showEnglish && isNonEnglish && items_en?.[i] && /* @__PURE__ */ React.createElement("div", { className: "text-[0.8em] opacity-80 font-normal mt-0.5" }, "(", items_en[i], ")"))));
    };
    const renderVennTitle = (title, title_en, branchIndex) => /* @__PURE__ */ React.createElement(React.Fragment, null, isEditingOutline ? /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-1 min-w-[120px]", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement(
      "input",
      {
        "aria-label": t("common.enter_title"),
        value: title,
        onChange: (e) => handleOutlineChange(branchIndex, "title", e.target.value),
        className: "font-black text-center bg-transparent border-b border-dashed border-indigo-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded px-1 w-full"
      }
    ), showEnglish && isNonEnglish && (title_en || title_en === "") && /* @__PURE__ */ React.createElement(
      "input",
      {
        "aria-label": t("common.common_placeholder_title_trans"),
        value: title_en || "",
        onChange: (e) => handleOutlineChange(branchIndex, "title", e.target.value, null, true),
        className: "text-[0.6em] text-center opacity-80 font-normal uppercase tracking-normal bg-transparent border-b border-dashed border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 rounded px-1 w-full",
        placeholder: t("common.placeholder_title_trans")
      }
    )) : /* @__PURE__ */ React.createElement(React.Fragment, null, title, showEnglish && isNonEnglish && title_en && /* @__PURE__ */ React.createElement("div", { className: "text-[0.6em] opacity-80 font-normal mt-1 uppercase tracking-normal" }, "(", title_en, ")")));
    if (isVennPlaying || isInteractiveVenn && !isTeacherMode) {
      const vennTitles = { setA: { text: setA.title, trans: setA.title_en }, setB: { text: setB.title, trans: setB.title_en } };
      return /* @__PURE__ */ React.createElement(ErrorBoundary, { fallbackMessage: "Venn Game encountered an error." }, /* @__PURE__ */ React.createElement(
        VennGame,
        {
          data: vennGameData,
          onClose: closeVenn,
          playSound,
          titles: vennTitles,
          primaryLanguage: leveledTextLanguage,
          onScoreUpdate: handleGameScoreUpdate,
          onGameComplete: handleGameCompletion
        }
      ));
    }
    if (isInteractiveVenn) {
      return /* @__PURE__ */ React.createElement("div", { className: "max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4" }, /* @__PURE__ */ React.createElement("div", { className: "text-center mb-8" }, /* @__PURE__ */ React.createElement("h3", { className: "text-2xl font-black text-indigo-900 flex items-center justify-center gap-2" }, /* @__PURE__ */ React.createElement(Layout, { size: 24, className: "text-purple-500" }), " ", t("concept_map.venn.setup_title")), /* @__PURE__ */ React.createElement("p", { className: "text-slate-600 text-sm" }, t("concept_map.venn.setup_desc"))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6 mb-8" }, /* @__PURE__ */ React.createElement("div", { className: "bg-rose-50 rounded-xl border-2 border-rose-200 p-4 flex flex-col" }, /* @__PURE__ */ React.createElement("h4", { className: "font-bold text-rose-800 mb-3 text-center uppercase tracking-wider" }, setA.title), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 mb-3" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          "aria-label": t("common.enter_venn_inputs"),
          type: "text",
          value: vennInputs.setA,
          onChange: (e) => setVennInputs({ ...vennInputs, setA: e.target.value }),
          onKeyDown: (e) => e.key === "Enter" && handleAddVennItem("setA"),
          placeholder: t("concept_map.venn.add_item_placeholder"),
          className: "flex-grow text-xs p-2 rounded border border-rose-200 focus:ring-2 focus:ring-rose-400"
        }
      ), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => handleAddVennItem("setA"), className: "min-h-11 min-w-11 bg-rose-200 hover:bg-rose-300 text-rose-800 p-2 rounded transition-colors focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2", "aria-label": `${t("common.add")}: ${setA.title}` }, /* @__PURE__ */ React.createElement(Plus, { size: 14 }))), /* @__PURE__ */ React.createElement("div", { className: "space-y-2 flex-grow overflow-y-auto max-h-60 custom-scrollbar pr-1" }, vennGameData.setA.map((item, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "bg-white p-2 rounded shadow-sm border border-rose-100 text-xs flex justify-between items-center group" }, /* @__PURE__ */ React.createElement("span", null, typeof item === "object" ? item.text : item), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => handleRemoveVennItem("setA", i), className: "min-h-11 min-w-11 text-rose-700 hover:text-rose-500 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity rounded focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2", "aria-label": `${t("common.remove")}: ${typeof item === "object" ? item.text : item}` }, /* @__PURE__ */ React.createElement(X, { size: 12 })))), vennGameData.setA.length === 0 && /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-rose-700 italic text-center" }, t("concept_sort.no_items")))), /* @__PURE__ */ React.createElement("div", { className: "bg-purple-50 rounded-xl border-2 border-purple-200 p-4 flex flex-col" }, /* @__PURE__ */ React.createElement("h4", { className: "font-bold text-purple-800 mb-3 text-center uppercase tracking-wider" }, shared.title || "Shared"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 mb-3" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          "aria-label": t("common.enter_venn_inputs"),
          type: "text",
          value: vennInputs.shared,
          onChange: (e) => setVennInputs({ ...vennInputs, shared: e.target.value }),
          onKeyDown: (e) => e.key === "Enter" && handleAddVennItem("shared"),
          placeholder: t("concept_map.venn.add_item_placeholder"),
          className: "flex-grow text-xs p-2 rounded border border-purple-200 focus:ring-2 focus:ring-purple-400"
        }
      ), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => handleAddVennItem("shared"), className: "min-h-11 min-w-11 bg-purple-200 hover:bg-purple-300 text-purple-800 p-2 rounded transition-colors focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2", "aria-label": `${t("common.add")}: ${shared.title || "Shared"}` }, /* @__PURE__ */ React.createElement(Plus, { size: 14 }))), /* @__PURE__ */ React.createElement("div", { className: "space-y-2 flex-grow overflow-y-auto max-h-60 custom-scrollbar pr-1" }, vennGameData.shared.map((item, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "bg-white p-2 rounded shadow-sm border border-purple-100 text-xs flex justify-between items-center group" }, /* @__PURE__ */ React.createElement("span", null, typeof item === "object" ? item.text : item), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => handleRemoveVennItem("shared", i), className: "min-h-11 min-w-11 text-purple-700 hover:text-purple-500 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity rounded focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2", "aria-label": `${t("common.remove")}: ${typeof item === "object" ? item.text : item}` }, /* @__PURE__ */ React.createElement(X, { size: 12 })))), vennGameData.shared.length === 0 && /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-purple-700 italic text-center" }, t("concept_sort.no_items")))), /* @__PURE__ */ React.createElement("div", { className: "bg-blue-50 rounded-xl border-2 border-blue-200 p-4 flex flex-col" }, /* @__PURE__ */ React.createElement("h4", { className: "font-bold text-blue-800 mb-3 text-center uppercase tracking-wider" }, setB.title), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 mb-3" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          "aria-label": t("common.enter_venn_inputs"),
          type: "text",
          value: vennInputs.setB,
          onChange: (e) => setVennInputs({ ...vennInputs, setB: e.target.value }),
          onKeyDown: (e) => e.key === "Enter" && handleAddVennItem("setB"),
          placeholder: t("concept_map.venn.add_item_placeholder"),
          className: "flex-grow text-xs p-2 rounded border border-blue-200 focus:ring-2 focus:ring-blue-400"
        }
      ), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => handleAddVennItem("setB"), className: "min-h-11 min-w-11 bg-blue-200 hover:bg-blue-300 text-blue-800 p-2 rounded transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2", "aria-label": `${t("common.add")}: ${setB.title}` }, /* @__PURE__ */ React.createElement(Plus, { size: 14 }))), /* @__PURE__ */ React.createElement("div", { className: "space-y-2 flex-grow overflow-y-auto max-h-60 custom-scrollbar pr-1" }, vennGameData.setB.map((item, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "bg-white p-2 rounded shadow-sm border border-blue-100 text-xs flex justify-between items-center group" }, /* @__PURE__ */ React.createElement("span", null, typeof item === "object" ? item.text : item), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => handleRemoveVennItem("setB", i), className: "min-h-11 min-w-11 text-blue-700 hover:text-blue-500 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity rounded focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2", "aria-label": `${t("common.remove")}: ${typeof item === "object" ? item.text : item}` }, /* @__PURE__ */ React.createElement(X, { size: 12 })))), vennGameData.setB.length === 0 && /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-blue-700 italic text-center" }, t("concept_sort.no_items"))))), /* @__PURE__ */ React.createElement(
        "button",
        {
          "aria-label": t("common.start_game"),
          className: "w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-xl shadow-lg hover:bg-indigo-700 hover:scale-[1.02] transition-all flex items-center justify-center gap-2",
          onClick: handleSetIsVennPlayingToTrue
        },
        /* @__PURE__ */ React.createElement(Gamepad2, { size: 24, className: "fill-current text-yellow-700" }),
        " ",
        t("concept_map.venn.start_game")
      ));
    }
    return /* @__PURE__ */ React.createElement("div", { className: "max-w-3xl mx-auto py-8" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-center mb-8 gap-3" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        "aria-label": t("common.start_game"),
        onClick: handleInitializeVenn,
        className: "flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full font-bold text-sm transition-colors border border-indigo-200 shadow-sm"
      },
      /* @__PURE__ */ React.createElement(Gamepad2, { size: 16 }),
      " ",
      t("concept_map.venn.interactive_mode")
    ), isNonEnglish && /* @__PURE__ */ React.createElement(
      "select",
      {
        "aria-label": t("common.selection"),
        value: outlineTranslationMode,
        onChange: (e) => setOutlineTranslationMode(e.target.value),
        className: "text-xs border border-indigo-200 rounded-full px-3 py-2 bg-white text-indigo-700 font-bold focus:ring-2 focus:ring-indigo-200 shadow-sm cursor-pointer"
      },
      /* @__PURE__ */ React.createElement("option", { value: "bilingual" }, leveledTextLanguage, " + ", t("languages.english")),
      /* @__PURE__ */ React.createElement("option", { value: "target" }, leveledTextLanguage, " Only")
    )), /* @__PURE__ */ React.createElement(MainTitle, null), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center space-y-[-40px]" }, /* @__PURE__ */ React.createElement("div", { className: "w-full max-w-lg z-10" }, /* @__PURE__ */ React.createElement("div", { className: "bg-blue-50 border-4 border-blue-200 rounded-[50px] p-10 pb-16 text-center shadow-sm relative" }, /* @__PURE__ */ React.createElement("h4", { className: "font-black text-blue-800 text-xl uppercase tracking-wider mb-3 bg-white/50 inline-block px-6 py-2 rounded-full" }, renderVennTitle(setB.title, setB.title_en, 1)), /* @__PURE__ */ React.createElement("ul", { className: "text-sm font-bold text-blue-900 space-y-2" }, renderVennItems(setB.items, setB.items_en, 1)))), /* @__PURE__ */ React.createElement("div", { className: "w-full max-w-md z-20" }, /* @__PURE__ */ React.createElement("div", { className: "bg-purple-50 border-4 border-purple-300 rounded-[60px] p-12 text-center shadow-xl transform hover:scale-105 transition-transform" }, /* @__PURE__ */ React.createElement("h4", { className: "font-black text-purple-800 text-sm uppercase tracking-wider mb-3 border-b-2 border-purple-200 pb-1 inline-block" }, renderVennTitle(shared.title || "Shared", shared.title_en, 2)), /* @__PURE__ */ React.createElement("ul", { className: "text-xs font-black text-purple-900 space-y-2" }, renderVennItems(shared.items, shared.items_en, 2)))), /* @__PURE__ */ React.createElement("div", { className: "w-full max-w-lg z-10" }, /* @__PURE__ */ React.createElement("div", { className: "bg-rose-50 border-4 border-rose-200 rounded-[50px] p-10 pt-16 text-center shadow-sm relative" }, /* @__PURE__ */ React.createElement("ul", { className: "text-sm font-bold text-rose-900 space-y-2 mb-3" }, renderVennItems(setA.items, setA.items_en, 0)), /* @__PURE__ */ React.createElement("h4", { className: "font-black text-rose-800 text-xl uppercase tracking-wider bg-white/50 inline-block px-6 py-2 rounded-full" }, renderVennTitle(setA.title, setA.title_en, 0))))));
  }
  if (type === "T-Chart") {
    if (!Array.isArray(branches) || branches.length < 2) {
      return /* @__PURE__ */ React.createElement("div", { className: "max-w-2xl mx-auto px-4 py-8" }, /* @__PURE__ */ React.createElement("div", { className: "bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 text-center" }, /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-black text-amber-800 mb-2" }, t("outline.tchart_fallback_title") || "This concept did not divide cleanly into two columns"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-amber-700" }, t("outline.tchart_fallback_desc") || "Try regenerating, refining your input text to highlight a clear contrast, or pick a different organizer type.")));
    }
    const left = branches[0] || { title: "Column A", items: [] };
    const right = branches[1] || { title: "Column B", items: [] };
    const itemText = (it) => typeof it === "object" ? it?.text || "" : String(it);
    const leftItems = (left.items || []).map(itemText).filter(Boolean);
    const rightItems = (right.items || []).map(itemText).filter(Boolean);
    const showBilingual = leveledTextLanguage !== "English" || left.title_en || right.title_en;
    if (isTChartPlaying || isInteractiveTChart && !isTeacherMode) {
      return /* @__PURE__ */ React.createElement(ErrorBoundary, { fallbackMessage: "T-Chart Sort encountered an error." }, /* @__PURE__ */ React.createElement(
        TChartSortGame,
        {
          data: { leftTitle: left.title, rightTitle: right.title, leftItems, rightItems },
          onClose: closeTChart,
          playSound,
          topicTitle: main || "",
          onScoreUpdate: handleGameScoreUpdate,
          onGameComplete: handleGameCompletion
        }
      ));
    }
    const renderTChartColumn = (branch, branchIdx, color, fallbackTitle) => {
      const colorClasses = color === "cyan" ? { panel: "bg-gradient-to-b from-cyan-50/60 to-white", header: "text-cyan-800 bg-cyan-100/80 border-cyan-200", chip: "text-cyan-900 border-cyan-300", dot: "text-cyan-500", input: "focus:border-cyan-400 focus:ring-cyan-200 border-cyan-200" } : { panel: "bg-gradient-to-b from-indigo-50/60 to-white", header: "text-indigo-800 bg-indigo-100/80 border-indigo-200", chip: "text-indigo-900 border-indigo-300", dot: "text-indigo-500", input: "focus:border-indigo-400 focus:ring-indigo-200 border-indigo-200" };
      const items = branch.items || [];
      return /* @__PURE__ */ React.createElement("div", { className: `p-6 ${branchIdx === 0 ? "border-b md:border-b-0 md:border-r border-slate-300" : ""} ${colorClasses.panel}` }, isEditingOutline ? /* @__PURE__ */ React.createElement("div", { className: "mb-3 space-y-2" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          "aria-label": t("common.enter_branch") || "Column heading",
          value: branch.title || "",
          onChange: (e) => handleOutlineChange(branchIdx, "title", e.target.value),
          className: `w-full font-black text-lg uppercase tracking-wider text-center px-3 py-2 rounded-lg border-2 focus:ring-2 ${colorClasses.input} ${colorClasses.header.split(" ").filter((c) => c.startsWith("text-")).join(" ")} bg-white`,
          placeholder: fallbackTitle
        }
      ), showBilingual && /* @__PURE__ */ React.createElement(
        "input",
        {
          "aria-label": t("common.placeholder_translation") || "Translation",
          value: branch.title_en || "",
          onChange: (e) => handleOutlineChange(branchIdx, "title", e.target.value, null, true),
          className: "w-full text-xs italic text-center px-2 py-1 rounded border border-slate-300 focus:ring-2 focus:ring-slate-200 bg-white text-slate-600",
          placeholder: t("common.placeholder_translation") || "Translation (optional)"
        }
      )) : /* @__PURE__ */ React.createElement("h4", { className: `font-black text-lg uppercase tracking-wider mb-3 text-center rounded-lg py-2 border ${colorClasses.header}` }, branch.title || fallbackTitle, branch.title_en && /* @__PURE__ */ React.createElement("div", { className: "text-xs italic font-normal opacity-80 normal-case tracking-normal" }, "(", branch.title_en, ")")), /* @__PURE__ */ React.createElement("ul", { className: "space-y-2" }, items.map((it, k) => {
        const text = itemText(it);
        const trans = typeof it === "object" && it?.text_en || (Array.isArray(branch.items_en) ? branch.items_en[k] : null);
        return /* @__PURE__ */ React.createElement("li", { key: `tc-${branchIdx}-${k}`, className: `flex items-start gap-2 text-sm bg-white px-3 py-2 rounded-lg border-l-4 shadow-sm ${colorClasses.chip}` }, /* @__PURE__ */ React.createElement("span", { className: `mt-0.5 ${colorClasses.dot}`, "aria-hidden": "true" }, "\u25CF"), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, isEditingOutline ? /* @__PURE__ */ React.createElement("div", { className: "space-y-1" }, /* @__PURE__ */ React.createElement(
          "input",
          {
            "aria-label": t("common.enter_item") || "Item text",
            value: text,
            onChange: (e) => handleOutlineChange(branchIdx, "item", e.target.value, k),
            className: "w-full text-sm bg-transparent border-b border-dashed border-slate-300 focus:border-slate-500"
          }
        ), showBilingual && /* @__PURE__ */ React.createElement(
          "input",
          {
            "aria-label": t("common.placeholder_translation") || "Translation",
            value: trans || "",
            onChange: (e) => handleOutlineChange(branchIdx, "item", e.target.value, k, true),
            className: "w-full text-xs italic text-slate-600 bg-transparent border-b border-dashed border-slate-200 focus:border-slate-400",
            placeholder: t("common.placeholder_translation") || "Translation"
          }
        )) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", null, text), trans && /* @__PURE__ */ React.createElement("div", { className: "text-xs italic opacity-75 mt-0.5" }, "(", trans, ")"))));
      }), items.length === 0 && /* @__PURE__ */ React.createElement("li", { className: "text-xs italic text-slate-600 text-center py-4" }, t("outline.no_items") || "No items")));
    };
    return /* @__PURE__ */ React.createElement("div", { className: "max-w-5xl mx-auto px-2" }, /* @__PURE__ */ React.createElement(MainTitle, null), showGameButton && /* @__PURE__ */ React.createElement("div", { className: "flex justify-center mb-4" }, /* @__PURE__ */ React.createElement(GameButtonHint, null), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setIsInteractiveTChart(true);
          setIsTChartPlaying(true);
          _broadcastInteractiveOrganizer("tchart");
        },
        className: "flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-indigo-500 text-white px-5 py-2 rounded-full font-bold text-sm shadow-md hover:shadow-lg hover:scale-105 transition-all motion-safe:animate-[pulse_3s_ease-in-out_infinite]",
        "aria-describedby": "game-btn-hint",
        "aria-label": t("games.tchart_sort.play_btn") || "Play T-Chart Sort Game"
      },
      /* @__PURE__ */ React.createElement(Gamepad2, { size: 16 }),
      " ",
      t("games.tchart_sort.play_btn") || "Sort Into Columns"
    ), isInteractiveTChart && isTeacherMode && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 ml-2", role: "status", "aria-live": "polite" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-1 rounded-full" }, "\u{1F3AF} Live for students"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
      setIsInteractiveTChart(false);
      _broadcastInteractiveOrganizer(null);
    }, className: "text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-300 px-2 py-1 rounded-full", "aria-label": t("a11y.stop_interactive_activity") }, "\u23F9 Stop Activity"))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-0 bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden" }, renderTChartColumn(left, 0, "cyan", t("outline.tchart_left_default") || "Column A"), renderTChartColumn(right, 1, "indigo", t("outline.tchart_right_default") || "Column B")));
  }
  if (type === "Fishbone") {
    if (!Array.isArray(branches) || branches.length < 2) {
      return /* @__PURE__ */ React.createElement("div", { className: "max-w-2xl mx-auto px-4 py-8" }, /* @__PURE__ */ React.createElement("div", { className: "bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 text-center" }, /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-black text-amber-800 mb-2" }, t("outline.fishbone_fallback_title") || "This concept needs at least 2 cause categories"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-amber-700" }, t("outline.fishbone_fallback_desc") || "Try regenerating with text that has multiple distinct causes, or pick a different organizer type.")));
    }
    const itemText = (it) => typeof it === "object" ? it?.text || "" : String(it);
    const showBilingual = leveledTextLanguage !== "English" || branches.some((b) => b.title_en);
    if (isFishboneSortPlaying || isInteractiveFishboneSort && !isTeacherMode) {
      return /* @__PURE__ */ React.createElement(ErrorBoundary, { fallbackMessage: "Fishbone Sort encountered an error." }, /* @__PURE__ */ React.createElement(
        FishboneSortGame,
        {
          data: { branches, mainTopic: main || "" },
          onClose: closeFishboneSort,
          playSound,
          topicTitle: main || "",
          onScoreUpdate: handleGameScoreUpdate,
          onGameComplete: handleGameCompletion
        }
      ));
    }
    const VIEW_W = 900, VIEW_H = 360;
    const SPINE_Y = VIEW_H / 2;
    const HEAD_X = VIEW_W - 130;
    const TAIL_X = 50;
    const boneSlots = branches.slice(0, 6).map((b, i) => {
      const isTop = i % 2 === 0;
      const slotIdx = Math.floor(i / 2);
      const slotCount = Math.ceil(Math.min(branches.length, 6) / 2);
      const xFrac = (slotIdx + 1) / (slotCount + 1);
      const startX = TAIL_X + 60 + (HEAD_X - TAIL_X - 100) * xFrac;
      const endX = startX - 40;
      const endY = isTop ? 60 : VIEW_H - 60;
      const labelX = endX - 6;
      const labelY = isTop ? endY - 8 : endY + 16;
      return { branch: b, idx: i, isTop, startX, endX, endY, labelX, labelY };
    });
    return /* @__PURE__ */ React.createElement("div", { className: "max-w-6xl mx-auto px-2" }, /* @__PURE__ */ React.createElement(MainTitle, null), showGameButton && /* @__PURE__ */ React.createElement("div", { className: "flex justify-center mb-4" }, /* @__PURE__ */ React.createElement(GameButtonHint, null), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setIsInteractiveFishboneSort(true);
          setIsFishboneSortPlaying(true);
          _broadcastInteractiveOrganizer("fishbone");
        },
        className: "flex items-center gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white px-5 py-2 rounded-full font-bold text-sm shadow-md hover:shadow-lg hover:scale-105 transition-all motion-safe:animate-[pulse_3s_ease-in-out_infinite]",
        "aria-describedby": "game-btn-hint",
        "aria-label": t("games.fishbone_sort.play_btn") || "Play Fishbone Sort Game"
      },
      /* @__PURE__ */ React.createElement(Gamepad2, { size: 16 }),
      " ",
      t("games.fishbone_sort.play_btn") || "Sort Causes Onto Bones"
    ), isInteractiveFishboneSort && isTeacherMode && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 ml-2", role: "status", "aria-live": "polite" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-1 rounded-full" }, "\u{1F3AF} Live for students"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
      setIsInteractiveFishboneSort(false);
      _broadcastInteractiveOrganizer(null);
    }, className: "text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-300 px-2 py-1 rounded-full", "aria-label": t("a11y.stop_interactive_activity") }, "\u23F9 Stop Activity"))), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-2xl shadow-md border border-slate-200 p-4 overflow-x-auto" }, /* @__PURE__ */ React.createElement(
      "svg",
      {
        "aria-hidden": "true",
        focusable: "false",
        viewBox: `0 0 ${VIEW_W} ${VIEW_H}`,
        className: "w-full h-auto min-w-[640px]",
        xmlns: "http://www.w3.org/2000/svg"
      },
      /* @__PURE__ */ React.createElement("polygon", { points: `${TAIL_X},${SPINE_Y - 20} ${TAIL_X + 30},${SPINE_Y} ${TAIL_X},${SPINE_Y + 20}`, fill: "#a78bfa", opacity: "0.5" }),
      /* @__PURE__ */ React.createElement("line", { x1: TAIL_X + 30, y1: SPINE_Y, x2: HEAD_X, y2: SPINE_Y, stroke: "#7c3aed", strokeWidth: "6", strokeLinecap: "round" }),
      /* @__PURE__ */ React.createElement("rect", { x: HEAD_X, y: SPINE_Y - 40, width: "120", height: "80", rx: "12", fill: "#7c3aed" }),
      /* @__PURE__ */ React.createElement("foreignObject", { x: HEAD_X, y: SPINE_Y - 40, width: "120", height: "80" }, /* @__PURE__ */ React.createElement("div", { xmlns: "http://www.w3.org/1999/xhtml", style: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: "12px", textAlign: "center", padding: "6px", boxSizing: "border-box", overflow: "hidden" } }, main || "Effect")),
      boneSlots.map((slot) => /* @__PURE__ */ React.createElement("g", { key: slot.idx }, /* @__PURE__ */ React.createElement("line", { x1: slot.startX, y1: SPINE_Y, x2: slot.endX, y2: slot.endY, stroke: "#a78bfa", strokeWidth: "3", strokeLinecap: "round" }), /* @__PURE__ */ React.createElement("circle", { cx: slot.endX, cy: slot.endY, r: "6", fill: "#7c3aed" }), /* @__PURE__ */ React.createElement("text", { x: slot.labelX, y: slot.labelY, textAnchor: "end", fill: "#5b21b6", fontWeight: "800", fontSize: "13", fontFamily: "Inter, sans-serif" }, slot.branch.title || `Category ${slot.idx + 1}`)))
    )), /* @__PURE__ */ React.createElement("div", { className: "mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" }, branches.map((branch, branchIdx) => {
      const items = branch.items || [];
      return /* @__PURE__ */ React.createElement("div", { key: branchIdx, className: "bg-white rounded-xl border-2 border-violet-200 shadow-sm overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "bg-gradient-to-r from-violet-100 to-fuchsia-100 px-4 py-2 border-b-2 border-violet-200" }, isEditingOutline ? /* @__PURE__ */ React.createElement("div", { className: "space-y-1" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          "aria-label": t("common.enter_branch") || "Category name",
          value: branch.title || "",
          onChange: (e) => handleOutlineChange(branchIdx, "title", e.target.value),
          className: "w-full font-black text-violet-900 text-sm uppercase tracking-wider bg-white px-2 py-1 rounded border border-violet-300 focus:ring-2 focus:ring-violet-300",
          placeholder: `Category ${branchIdx + 1}`
        }
      ), showBilingual && /* @__PURE__ */ React.createElement(
        "input",
        {
          "aria-label": t("common.placeholder_translation") || "Translation",
          value: branch.title_en || "",
          onChange: (e) => handleOutlineChange(branchIdx, "title", e.target.value, null, true),
          className: "w-full text-xs italic text-violet-700 bg-white px-2 py-0.5 rounded border border-violet-200 focus:ring-2 focus:ring-violet-200",
          placeholder: t("common.placeholder_translation") || "Translation (optional)"
        }
      )) : /* @__PURE__ */ React.createElement("h4", { className: "font-black text-violet-900 text-sm uppercase tracking-wider" }, branch.title || `Category ${branchIdx + 1}`, branch.title_en && /* @__PURE__ */ React.createElement("div", { className: "text-xs italic font-normal opacity-80 normal-case tracking-normal" }, "(", branch.title_en, ")"))), /* @__PURE__ */ React.createElement("ul", { className: "p-3 space-y-2" }, items.map((it, k) => {
        const text = itemText(it);
        const trans = typeof it === "object" && it?.text_en || (Array.isArray(branch.items_en) ? branch.items_en[k] : null);
        return /* @__PURE__ */ React.createElement("li", { key: `fb-${branchIdx}-${k}`, className: "flex items-start gap-2 text-sm text-violet-900 bg-violet-50/50 px-2 py-1.5 rounded border-l-3 border-violet-300" }, /* @__PURE__ */ React.createElement("span", { className: "mt-0.5 text-violet-500", "aria-hidden": "true" }, "\u25B8"), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, isEditingOutline ? /* @__PURE__ */ React.createElement("div", { className: "space-y-1" }, /* @__PURE__ */ React.createElement(
          "input",
          {
            "aria-label": t("common.enter_item") || "Cause text",
            value: text,
            onChange: (e) => handleOutlineChange(branchIdx, "item", e.target.value, k),
            className: "w-full text-sm bg-transparent border-b border-dashed border-slate-300 focus:border-slate-500"
          }
        ), showBilingual && /* @__PURE__ */ React.createElement(
          "input",
          {
            "aria-label": t("common.placeholder_translation") || "Translation",
            value: trans || "",
            onChange: (e) => handleOutlineChange(branchIdx, "item", e.target.value, k, true),
            className: "w-full text-xs italic text-slate-600 bg-transparent border-b border-dashed border-slate-200 focus:border-slate-400",
            placeholder: t("common.placeholder_translation") || "Translation"
          }
        )) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", null, text), trans && /* @__PURE__ */ React.createElement("div", { className: "text-xs italic opacity-75 mt-0.5" }, "(", trans, ")"))));
      }), items.length === 0 && /* @__PURE__ */ React.createElement("li", { className: "text-xs italic text-slate-600 text-center py-2" }, t("outline.no_items") || "No causes in this category")));
    })));
  }
  if (type === "Cause and Effect") {
    const semanticText = (branch) => `${branch?.title || ""} ${branch?.title_en || ""}`.toLowerCase();
    const semanticRole = (branch) => String(branch?.role || branch?.semanticRole || "").trim().toLowerCase();
    let causes = branches.filter((branch) => semanticRole(branch) === "cause" || semanticRole(branch) === "causes" || semanticText(branch).includes("cause"));
    let effects = branches.filter((branch) => ["effect", "effects", "consequence", "consequences"].includes(semanticRole(branch)) || semanticText(branch).includes("effect") || semanticText(branch).includes("consequence"));
    let chains = branches.filter((branch) => ["chain", "sequence"].includes(semanticRole(branch)) || semanticText(branch).includes("chain") || semanticText(branch).includes("sequence"));
    if (causes.length === 0 && effects.length === 0 && branches.length >= 2) {
      causes = [branches[0]];
      effects = [branches[1]];
      chains = branches.slice(2);
    }
    const isLegacy = causes.length === 0 && effects.length === 0 && chains.length === 0;
    if (isCESortPlaying || isInteractiveCESort && !isTeacherMode) {
      const causeItems = [];
      const effectItems = [];
      if (isLegacy) {
        branches.forEach((b) => {
          causeItems.push(b.title);
          (b.items || []).forEach((it) => effectItems.push(it));
        });
      } else {
        causes.forEach((b) => {
          (b.items || []).forEach((it) => causeItems.push(it));
        });
        effects.forEach((b) => {
          (b.items || []).forEach((it) => effectItems.push(it));
        });
      }
      return /* @__PURE__ */ React.createElement(ErrorBoundary, { fallbackMessage: "Cause & Effect Sort encountered an error." }, /* @__PURE__ */ React.createElement(
        CauseEffectSortGame,
        {
          data: { causes: causeItems, effects: effectItems },
          onClose: closeCESort,
          playSound,
          topicTitle: main || "",
          onScoreUpdate: handleGameScoreUpdate,
          onGameComplete: handleGameCompletion
        }
      ));
    }
    if (isLegacy) {
      return /* @__PURE__ */ React.createElement("div", { className: "max-w-4xl mx-auto px-2" }, showGameButton && /* @__PURE__ */ React.createElement("div", { className: "flex justify-center mb-4" }, /* @__PURE__ */ React.createElement(GameButtonHint, null), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => {
            setIsInteractiveCESort(true);
            setIsCESortPlaying(true);
            _broadcastInteractiveOrganizer("cesort");
          },
          className: "flex items-center gap-2 bg-gradient-to-r from-orange-500 to-teal-500 text-white px-5 py-2 rounded-full font-bold text-sm shadow-md hover:shadow-lg hover:scale-105 transition-all motion-safe:animate-[pulse_3s_ease-in-out_infinite]",
          "aria-describedby": "game-btn-hint",
          "aria-label": t("games.ce_sort.title") || "Sort Causes and Effects"
        },
        /* @__PURE__ */ React.createElement(Gamepad2, { size: 16 }),
        " ",
        t("games.ce_sort.play_btn") || "Sort Causes & Effects"
      ), isInteractiveCESort && isTeacherMode && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 ml-2", role: "status", "aria-live": "polite" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-1 rounded-full" }, "\u{1F3AF} Live for students"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
        setIsInteractiveCESort(false);
        _broadcastInteractiveOrganizer(null);
      }, className: "text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-300 px-2 py-1 rounded-full", "aria-label": t("a11y.stop_interactive_activity") }, "\u23F9 Stop Activity"))), /* @__PURE__ */ React.createElement(MainTitle, null), /* @__PURE__ */ React.createElement("div", { className: "space-y-6" }, branches.map((b, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "relative pl-4 md:pl-0 group" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col md:flex-row items-stretch gap-0 bg-white rounded-2xl border border-slate-400 shadow-md overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1 p-6 bg-orange-50 border-r border-orange-100 relative" }, /* @__PURE__ */ React.createElement("div", { className: "absolute top-0 left-0 bg-orange-200 text-orange-800 text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-br-lg" }, t("outline.labels.cause")), /* @__PURE__ */ React.createElement("div", { className: "pt-2 h-full flex items-center" }, isEditingOutline ? /* @__PURE__ */ React.createElement(
        "textarea",
        {
          "aria-label": t("outline.edit_cause") || "Edit cause",
          value: b.title,
          onChange: (e) => handleOutlineChange(i, "title", e.target.value),
          className: "w-full bg-transparent focus:ring-2 focus:ring-orange-400 text-orange-900 font-bold resize-none h-full"
        }
      ) : /* @__PURE__ */ React.createElement("h4", { className: "font-bold text-orange-900 text-lg" }, b.title))), /* @__PURE__ */ React.createElement("div", { className: "bg-white flex items-center justify-center w-full md:w-12 py-2 md:py-0 border-y md:border-y-0 md:border-r border-slate-100 relative overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 bg-slate-50 opacity-50" }), /* @__PURE__ */ React.createElement(ArrowRight, { size: 24, className: "text-slate-600 rotate-90 md:rotate-0 relative z-10", strokeWidth: 3 })), /* @__PURE__ */ React.createElement("div", { className: "flex-1 p-6 bg-teal-50 relative" }, /* @__PURE__ */ React.createElement("div", { className: "absolute top-0 left-0 bg-teal-200 text-teal-800 text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-br-lg" }, t("outline.labels.effect")), /* @__PURE__ */ React.createElement("div", { className: "pt-4 h-full" }, /* @__PURE__ */ React.createElement("ul", { className: "list-disc list-inside text-teal-900 space-y-2 marker:text-teal-400" }, b.items.map((item, k) => /* @__PURE__ */ React.createElement("li", { key: k, className: "text-sm font-medium leading-relaxed" }, item))))))))));
    }
    return /* @__PURE__ */ React.createElement("div", { className: "max-w-6xl mx-auto px-4 py-8" }, showGameButton && /* @__PURE__ */ React.createElement("div", { className: "flex justify-center mb-6" }, /* @__PURE__ */ React.createElement(GameButtonHint, null), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setIsInteractiveCESort(true);
          setIsCESortPlaying(true);
          _broadcastInteractiveOrganizer("cesort");
        },
        className: "flex items-center gap-2 bg-gradient-to-r from-orange-500 to-teal-500 text-white px-5 py-2 rounded-full font-bold text-sm shadow-md hover:shadow-lg hover:scale-105 transition-all motion-safe:animate-[pulse_3s_ease-in-out_infinite]",
        "aria-describedby": "game-btn-hint",
        "aria-label": t("games.ce_sort.title") || "Sort Causes and Effects"
      },
      /* @__PURE__ */ React.createElement(Gamepad2, { size: 16 }),
      " ",
      t("games.ce_sort.play_btn") || "Sort Causes & Effects"
    ), isInteractiveCESort && isTeacherMode && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 ml-2", role: "status", "aria-live": "polite" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-1 rounded-full" }, "\u{1F3AF} Live for students"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
      setIsInteractiveCESort(false);
      _broadcastInteractiveOrganizer(null);
    }, className: "text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-300 px-2 py-1 rounded-full", "aria-label": t("a11y.stop_interactive_activity") }, "\u23F9 Stop Activity"))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 mb-16" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1 flex flex-col gap-6 w-full lg:items-end" }, causes.map((branch, i) => /* @__PURE__ */ React.createElement("div", { key: `c-${i}`, className: "bg-orange-50 border-l-4 border-orange-400 p-5 rounded-r-xl shadow-sm w-full max-w-md relative group hover:shadow-md transition-shadow" }, /* @__PURE__ */ React.createElement("h4", { className: "font-black text-orange-800 text-xs uppercase tracking-wider mb-3 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "w-2 h-2 rounded-full bg-orange-400" }), " ", t("outline.labels.causes")), /* @__PURE__ */ React.createElement("ul", { className: "space-y-2" }, branch.items.map((it, k) => /* @__PURE__ */ React.createElement("li", { key: k, className: "text-slate-700 font-medium text-sm flex items-start gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "w-1.5 h-1.5 rounded-full bg-orange-300 mt-1.5 shrink-0" }), it)))))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center justify-center gap-4 z-10" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white p-3 rounded-full border-2 border-slate-200 shadow-sm" }, /* @__PURE__ */ React.createElement(ArrowRight, { size: 32, className: "text-slate-600 rotate-90 lg:rotate-0", strokeWidth: 3 }))), /* @__PURE__ */ React.createElement("div", { className: "flex-1 flex flex-col gap-6 w-full lg:items-start" }, effects.map((branch, i) => /* @__PURE__ */ React.createElement("div", { key: `e-${i}`, className: "bg-teal-50 border-r-4 border-teal-400 p-5 rounded-l-xl shadow-sm w-full max-w-md relative group hover:shadow-md transition-shadow text-right lg:text-left" }, /* @__PURE__ */ React.createElement("h4", { className: "font-black text-teal-800 text-xs uppercase tracking-wider mb-3 flex items-center gap-2 justify-end lg:justify-start" }, t("outline.labels.effects"), " ", /* @__PURE__ */ React.createElement("div", { className: "w-2 h-2 rounded-full bg-teal-400" })), /* @__PURE__ */ React.createElement("ul", { className: "space-y-2" }, branch.items.map((it, k) => /* @__PURE__ */ React.createElement("li", { key: k, className: "text-slate-700 font-medium text-sm flex items-start gap-2 justify-end lg:justify-start" }, it, /* @__PURE__ */ React.createElement("div", { className: "w-1.5 h-1.5 rounded-full bg-teal-300 mt-1.5 shrink-0 order-first lg:order-last" })))))))));
  }
  if (type === "Problem Solution") {
    const outcomeIndex = branches.findIndex(
      (b) => b.title.toLowerCase().includes("outcome") || b.title.toLowerCase().includes("result") || b.title.toLowerCase().includes("evaluation")
    );
    const outcomeBranch = outcomeIndex !== -1 ? branches[outcomeIndex] : null;
    const solutionBranches = branches.filter((_, i) => i !== outcomeIndex);
    const totalSolutionItems = solutionBranches.reduce((s, b) => s + (b.items || []).filter((it) => typeof it === "object" ? it.text : it).length, 0);
    const showPSGame = totalSolutionItems >= 6;
    if (isProblemSolutionSortPlaying || isInteractiveProblemSolutionSort && !isTeacherMode) {
      return /* @__PURE__ */ React.createElement(ErrorBoundary, { fallbackMessage: "Solution Prioritize encountered an error." }, /* @__PURE__ */ React.createElement(
        ProblemSolutionSortGame,
        {
          data: { branches: solutionBranches },
          onClose: closeProblemSolutionSort,
          playSound,
          topicTitle: main || "",
          onScoreUpdate: handleGameScoreUpdate,
          onGameComplete: handleGameCompletion
        }
      ));
    }
    return /* @__PURE__ */ React.createElement("div", { className: "max-w-5xl mx-auto px-4 py-12" }, showPSGame && /* @__PURE__ */ React.createElement("div", { className: "flex justify-center mb-6" }, /* @__PURE__ */ React.createElement(GameButtonHint, null), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setIsInteractiveProblemSolutionSort(true);
          setIsProblemSolutionSortPlaying(true);
          _broadcastInteractiveOrganizer("problemsolution");
        },
        className: "flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white px-5 py-2 rounded-full font-bold text-sm shadow-md hover:shadow-lg hover:scale-105 transition-all motion-safe:animate-[pulse_3s_ease-in-out_infinite]",
        "aria-describedby": "game-btn-hint",
        "aria-label": t("games.problem_solution_sort.play_btn") || "Prioritize the Solutions"
      },
      /* @__PURE__ */ React.createElement(Gamepad2, { size: 16 }),
      " ",
      t("games.problem_solution_sort.play_btn") || "Prioritize the Solutions"
    ), isInteractiveProblemSolutionSort && isTeacherMode && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 ml-2", role: "status", "aria-live": "polite" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-1 rounded-full" }, "\u{1F3AF} Live for students"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
      setIsInteractiveProblemSolutionSort(false);
      _broadcastInteractiveOrganizer(null);
    }, className: "text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-300 px-2 py-1 rounded-full", "aria-label": t("a11y.stop_interactive_activity") }, "\u23F9 Stop Activity"))), /* @__PURE__ */ React.createElement("div", { className: "relative z-10 mb-16" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white border-l-8 border-red-500 rounded-r-3xl shadow-xl p-8 relative transform transition-transform hover:scale-[1.01] max-w-3xl mx-auto" }, /* @__PURE__ */ React.createElement("div", { className: "absolute -left-6 top-6 bg-red-700 text-white p-3 rounded-full shadow-md border-4 border-white" }, /* @__PURE__ */ React.createElement(AlertCircle, { size: 32 })), /* @__PURE__ */ React.createElement("div", { className: "pl-8" }, /* @__PURE__ */ React.createElement("h4", { className: "text-xs font-black text-red-500 uppercase tracking-widest mb-2 opacity-70 flex items-center gap-2" }, t("outline.labels.problem")), /* @__PURE__ */ React.createElement(MainTitle, null)), /* @__PURE__ */ React.createElement("div", { className: "absolute -bottom-24 left-1/2 -translate-x-1/2 flex flex-col items-center h-24 w-8 justify-end" }, /* @__PURE__ */ React.createElement("div", { className: "h-full w-1 bg-slate-200" }), /* @__PURE__ */ React.createElement("div", { className: "w-4 h-4 rounded-full bg-slate-300 border-4 border-white shadow-sm -mb-2" })))), /* @__PURE__ */ React.createElement("div", { className: "relative mb-16" }, /* @__PURE__ */ React.createElement("div", { className: "absolute top-[-2rem] left-[10%] right-[10%] h-1 bg-slate-200 rounded-full hidden md:block" }), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" }, solutionBranches.map((b, i) => {
      const originalIndex = branches.indexOf(b);
      return /* @__PURE__ */ React.createElement("div", { key: i, className: "flex flex-col relative group" }, /* @__PURE__ */ React.createElement("div", { className: "absolute -top-8 left-1/2 -translate-x-1/2 h-8 w-1 bg-slate-200 hidden md:block group-hover:bg-green-300 transition-colors" }), /* @__PURE__ */ React.createElement("div", { className: "relative bg-white rounded-2xl border-t-8 border-green-500 shadow-md hover:shadow-xl transition-all duration-300 flex-grow p-6 flex flex-col h-full" }, /* @__PURE__ */ React.createElement("div", { className: "absolute -top-5 left-1/2 -translate-x-1/2 bg-green-100 text-green-800 px-4 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border border-green-200 whitespace-nowrap shadow-sm z-10" }, "Solution Path ", i + 1), /* @__PURE__ */ React.createElement("div", { className: "mt-4 flex-grow" }, /* @__PURE__ */ React.createElement(BranchItem, { branch: b, bIdx: originalIndex, colorClass: "bg-transparent border-none shadow-none p-0" }))), /* @__PURE__ */ React.createElement("div", { className: "absolute -bottom-8 left-1/2 -translate-x-1/2 h-8 w-1 bg-slate-200 hidden md:block group-hover:bg-blue-300 transition-colors" }));
    })), /* @__PURE__ */ React.createElement("div", { className: "absolute bottom-[-2rem] left-[10%] right-[10%] h-1 bg-slate-200 rounded-full hidden md:block" })), /* @__PURE__ */ React.createElement("div", { className: "relative max-w-3xl mx-auto" }, /* @__PURE__ */ React.createElement("div", { className: "absolute -top-16 left-1/2 -translate-x-1/2 h-16 w-1 bg-slate-200 flex items-end justify-center pb-1" }, /* @__PURE__ */ React.createElement(ArrowDown, { size: 24, className: "text-slate-600" })), /* @__PURE__ */ React.createElement("div", { className: "bg-blue-50 border-2 border-blue-200 rounded-3xl p-8 text-center relative shadow-lg" }, /* @__PURE__ */ React.createElement("div", { className: "inline-flex items-center justify-center p-3 bg-blue-100 text-blue-600 rounded-full mb-4 shadow-sm border border-blue-200" }, /* @__PURE__ */ React.createElement(CheckCircle2, { size: 24 })), outcomeBranch ? /* @__PURE__ */ React.createElement("div", { className: "text-left" }, /* @__PURE__ */ React.createElement(BranchItem, { branch: outcomeBranch, bIdx: outcomeIndex, colorClass: "bg-transparent border-none shadow-none p-0" })) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("h3", { className: "text-xl font-black text-blue-900 mb-2" }, t("outline.labels.outcome")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-blue-800/80 max-w-lg mx-auto leading-relaxed italic" }, "Analyze the results here. Did the proposed solutions effectively address the challenge? What were the trade-offs or final results?"), isTeacherMode && /* @__PURE__ */ React.createElement(
      "button",
      {
        "aria-label": t("common.generate_scenario_outcome"),
        onClick: handleGenerateOutcome,
        disabled: isProcessing,
        className: "mt-4 text-xs font-bold bg-blue-100 text-blue-700 px-4 py-2 rounded-full hover:bg-blue-200 transition-colors flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed disabled:cursor-wait"
      },
      isProcessing ? /* @__PURE__ */ React.createElement(RefreshCw, { size: 14, className: "animate-spin motion-reduce:animate-none" }) : /* @__PURE__ */ React.createElement(Sparkles, { size: 14 }),
      t("outline.labels.generate_outcome") || "Generate Outcome"
    )))));
  }
  if (type === "Key Concept Map" || type === "Mind Map") {
    if (!Array.isArray(branches) || branches.length === 0) {
      return /* @__PURE__ */ React.createElement("div", { className: "max-w-2xl mx-auto px-4 py-8" }, /* @__PURE__ */ React.createElement("div", { className: "bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 text-center" }, /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-black text-amber-800 mb-2" }, t("outline.cmap_fallback_title") || "This concept map came back empty"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-amber-700" }, t("outline.cmap_fallback_desc") || "Try regenerating with more text, or pick a different organizer type.")));
    }
    if (isConceptMapSortPlaying || isInteractiveConceptMapSort && !isTeacherMode) {
      return /* @__PURE__ */ React.createElement(ErrorBoundary, { fallbackMessage: "Concept Map Sort encountered an error." }, /* @__PURE__ */ React.createElement(
        ConceptMapSortGame,
        {
          data: { branches },
          onClose: closeConceptMapSort,
          playSound,
          topicTitle: main || "",
          onScoreUpdate: handleGameScoreUpdate,
          onGameComplete: handleGameCompletion
        }
      ));
    }
    return /* @__PURE__ */ React.createElement("div", null, showGameButton && /* @__PURE__ */ React.createElement("div", { className: "flex justify-center mb-4" }, /* @__PURE__ */ React.createElement(GameButtonHint, null), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setIsInteractiveConceptMapSort(true);
          setIsConceptMapSortPlaying(true);
          _broadcastInteractiveOrganizer("conceptmap");
        },
        className: "flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-5 py-2 rounded-full font-bold text-sm shadow-md hover:shadow-lg hover:scale-105 transition-all motion-safe:animate-[pulse_3s_ease-in-out_infinite]",
        "aria-describedby": "game-btn-hint",
        "aria-label": t("games.concept_map_sort.play_btn") || "Play Concept Map Sort Game"
      },
      /* @__PURE__ */ React.createElement(Gamepad2, { size: 16 }),
      " ",
      t("games.concept_map_sort.play_btn") || "Sort Onto Branches"
    ), isInteractiveConceptMapSort && isTeacherMode && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 ml-2", role: "status", "aria-live": "polite" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-1 rounded-full" }, "\u{1F3AF} Live for students"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
      setIsInteractiveConceptMapSort(false);
      _broadcastInteractiveOrganizer(null);
    }, className: "text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-300 px-2 py-1 rounded-full", "aria-label": t("a11y.stop_interactive_activity") }, "\u23F9 Stop Activity"))), /* @__PURE__ */ React.createElement(KeyConceptMapView, { branches, main, main_en, BranchItem }));
  }
  if (type === "Frayer Model" && !isEditingOutline) {
    if (branches.length !== 4) {
      return renderOrganizerFallback(
        t("outline.frayer_invalid_title") || "This Frayer Model is incomplete",
        t("outline.frayer_invalid_desc") || "A Frayer Model needs Definition, Characteristics, Examples, and Non-Examples. Regenerate it or switch to edit mode to repair the sections."
      );
    }
    const frayerImage = generatedContent?.data?.frayerExampleImage;
    const onGenerateFrayerVisual = async () => {
      if (typeof handleGenerateFrayerImage === "function") await handleGenerateFrayerImage("");
    };
    const onRefineFrayerVisual = async () => {
      const instruction = typeof window !== "undefined" && window.AlloFlowUX && typeof window.AlloFlowUX.prompt === "function" ? await window.AlloFlowUX.prompt(
        'How should the image change? (e.g., "make it more colorful", "show a microscope view")',
        "",
        {
          title: "Refine Frayer model image",
          confirmText: "Refine image",
          cancelText: "Cancel",
          maxLength: 500
        }
      ) : "";
      if (instruction && typeof handleGenerateFrayerImage === "function") {
        await handleGenerateFrayerImage(instruction);
      }
    };
    const onRemoveFrayerVisual = () => {
      if (typeof handleRemoveFrayerImage === "function") handleRemoveFrayerImage();
    };
    if (isFrayerSortPlaying || isInteractiveFrayerSort && !isTeacherMode) {
      return /* @__PURE__ */ React.createElement(ErrorBoundary, { fallbackMessage: "Frayer Sort encountered an error." }, /* @__PURE__ */ React.createElement(
        FrayerSortGame,
        {
          data: generatedContent?.data,
          onClose: closeFrayerSort,
          playSound,
          topicTitle: main || "",
          onScoreUpdate: handleGameScoreUpdate,
          onGameComplete: handleGameCompletion
        }
      ));
    }
    const defBranch = branches[0] || { title: "Definition", items: [] };
    const charBranch = branches[1] || { title: "Characteristics", items: [] };
    const exBranch = branches[2] || { title: "Examples", items: [] };
    const nonExBranch = branches[3] || { title: "Non-Examples", items: [] };
    const itemText = (it) => typeof it === "object" ? it?.text || "" : String(it);
    const QUADRANT_COLORS = {
      indigo: { bg: "bg-indigo-50/70", header: "text-indigo-800", dot: "text-indigo-500" },
      emerald: { bg: "bg-emerald-50/70", header: "text-emerald-800", dot: "text-emerald-500" },
      amber: { bg: "bg-amber-50/70", header: "text-amber-800", dot: "text-amber-500" },
      rose: { bg: "bg-rose-50/70", header: "text-rose-800", dot: "text-rose-500" }
    };
    const renderQuadrant = (branch, colorKey, borders, quadrantLabel, includeImage, isBottomRow) => {
      const items = (branch.items || []).map(itemText).filter(Boolean);
      const c = QUADRANT_COLORS[colorKey];
      const padCls = isBottomRow ? "px-5 pb-5 pt-10" : "p-5";
      return /* @__PURE__ */ React.createElement("div", { className: `${c.bg} ${padCls} ${borders}`, "aria-label": quadrantLabel }, /* @__PURE__ */ React.createElement("h4", { className: `font-black text-sm uppercase tracking-wider mb-3 ${c.header}` }, branch.title), includeImage && frayerImage ? /* @__PURE__ */ React.createElement("div", { className: "mb-3 bg-white rounded-md border border-slate-200 p-2 flex items-center justify-center" }, /* @__PURE__ */ React.createElement("img", { src: frayerImage, alt: `Visual representation of ${main || "the vocabulary term"}`, style: { maxHeight: "120px", objectFit: "contain" } })) : null, /* @__PURE__ */ React.createElement("ul", { className: "space-y-1.5" }, items.length > 0 ? items.map((text, i) => /* @__PURE__ */ React.createElement("li", { key: i, className: "flex items-start gap-2 text-sm text-slate-700 leading-snug" }, /* @__PURE__ */ React.createElement("span", { className: `${c.dot} mt-0.5 flex-shrink-0` }, "\u25CF"), /* @__PURE__ */ React.createElement("span", null, text))) : /* @__PURE__ */ React.createElement("li", { className: "text-xs text-slate-600 italic" }, "\u2014")));
    };
    return /* @__PURE__ */ React.createElement("div", { className: "max-w-4xl mx-auto px-4 py-6 relative" }, showGameButton && /* @__PURE__ */ React.createElement("div", { className: "flex justify-center mb-4" }, /* @__PURE__ */ React.createElement(GameButtonHint, null), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setIsInteractiveFrayerSort(true);
          setIsFrayerSortPlaying(true);
          _broadcastInteractiveOrganizer("frayer");
        },
        className: "flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-emerald-500 text-white px-5 py-2 rounded-full font-bold text-sm shadow-md hover:shadow-lg hover:scale-105 transition-all motion-safe:animate-[pulse_3s_ease-in-out_infinite]",
        "aria-describedby": "game-btn-hint",
        "aria-label": t("games.frayer_sort.play_btn") || "Play Frayer Sort Game"
      },
      /* @__PURE__ */ React.createElement(Gamepad2, { size: 16 }),
      " ",
      t("games.frayer_sort.play_btn") || "Sort into Quadrants"
    ), isInteractiveFrayerSort && isTeacherMode && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 ml-2", role: "status", "aria-live": "polite" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-1 rounded-full" }, "\u{1F3AF} Live for students"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
      setIsInteractiveFrayerSort(false);
      _broadcastInteractiveOrganizer(null);
    }, className: "text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-300 px-2 py-1 rounded-full", "aria-label": t("a11y.stop_interactive_activity") }, "\u23F9 Stop Activity"))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-0 border-2 border-slate-400 rounded-2xl overflow-hidden shadow-lg bg-white relative", style: { minHeight: "460px" } }, renderQuadrant(defBranch, "indigo", "border-r border-b border-slate-300", "Definition", false, false), renderQuadrant(charBranch, "emerald", "border-b border-slate-300", "Characteristics", false, false), renderQuadrant(exBranch, "amber", "border-r border-slate-300", "Examples", true, true), renderQuadrant(nonExBranch, "rose", "", "Non-Examples", false, true), /* @__PURE__ */ React.createElement("div", { className: "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border-4 border-slate-700 rounded-full px-5 py-2 shadow-2xl z-10 max-w-[180px]" }, /* @__PURE__ */ React.createElement("div", { className: "text-center font-black text-base text-slate-800 leading-tight whitespace-normal break-words" }, main || "Vocabulary Term"))), isTeacherMode ? /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 justify-center mt-3" }, frayerImage ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: onRefineFrayerVisual,
        disabled: isProcessing,
        className: "px-3 py-1.5 text-xs font-bold bg-violet-50 text-violet-800 border border-violet-300 rounded-md hover:bg-violet-100 disabled:opacity-50",
        "aria-label": t("outline.frayer_refine_visual_aria") || "Refine the Examples-quadrant visual via image-to-image edit"
      },
      t("outline.frayer_refine_visual_button") || "\u2728 Refine visual"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: onRemoveFrayerVisual,
        disabled: isProcessing,
        className: "px-3 py-1.5 text-xs font-bold bg-white text-slate-700 border border-slate-300 rounded-md hover:bg-slate-100 disabled:opacity-50",
        "aria-label": t("outline.frayer_remove_visual_aria") || "Remove the Examples-quadrant visual"
      },
      t("outline.frayer_remove_visual_button") || "Remove visual"
    )) : /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: onGenerateFrayerVisual,
        disabled: isProcessing,
        className: "px-3 py-1.5 text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 rounded-md hover:bg-amber-100 disabled:opacity-50",
        "aria-label": t("outline.frayer_add_visual_aria") || "Generate an AI visual for the Examples quadrant"
      },
      t("outline.frayer_add_visual_button") || "\u{1F5BC}\uFE0F Add visual to Examples"
    )) : null, /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500 italic text-center mt-3" }, t("outline.frayer_caption") || "Frayer Model: vocabulary term in the center, definition + characteristics + examples + non-examples in the four quadrants."));
  }
  if (type === "See-Think-Wonder" && !isEditingOutline) {
    if (branches.length !== 3) {
      return renderOrganizerFallback(
        t("outline.see_think_wonder_invalid_title") || "This See-Think-Wonder routine is incomplete",
        t("outline.see_think_wonder_invalid_desc") || "This organizer needs exactly three sections: See, Think, and Wonder. Regenerate it or switch to edit mode to repair the sections."
      );
    }
    if (isSeeThinkWonderSortPlaying || isInteractiveSeeThinkWonderSort && !isTeacherMode) {
      return /* @__PURE__ */ React.createElement(ErrorBoundary, { fallbackMessage: "See-Think-Wonder Sort encountered an error." }, /* @__PURE__ */ React.createElement(
        SeeThinkWonderSortGame,
        {
          data: generatedContent?.data,
          onClose: closeSeeThinkWonderSort,
          playSound,
          topicTitle: main || "",
          onScoreUpdate: handleGameScoreUpdate,
          onGameComplete: handleGameCompletion
        }
      ));
    }
    const seeBranch = branches[0] || { title: "See", items: [] };
    const thinkBranch = branches[1] || { title: "Think", items: [] };
    const wonderBranch = branches[2] || { title: "Wonder", items: [] };
    const itemText = (it) => typeof it === "object" ? it?.text || "" : String(it);
    const STW_COLORS = {
      sky: { bg: "bg-sky-50/70", header: "bg-sky-600 text-white", dot: "text-sky-500" },
      violet: { bg: "bg-violet-50/70", header: "bg-violet-600 text-white", dot: "text-violet-500" },
      amber: { bg: "bg-amber-50/70", header: "bg-amber-600 text-white", dot: "text-amber-500" }
    };
    const renderSTWColumn = (branch, colorKey, hint) => {
      const items = (branch.items || []).map(itemText).filter(Boolean);
      const c = STW_COLORS[colorKey];
      return /* @__PURE__ */ React.createElement("div", { className: `${c.bg} flex-1 min-h-[280px]` }, /* @__PURE__ */ React.createElement("h4", { className: `${c.header} font-black text-base uppercase tracking-wide text-center py-3 px-4` }, branch.title), /* @__PURE__ */ React.createElement("div", { className: "px-4 pt-2 pb-1 text-[11px] italic text-slate-500 text-center" }, hint), /* @__PURE__ */ React.createElement("ul", { className: "p-4 pt-2 space-y-2" }, items.length > 0 ? items.map((text, i) => /* @__PURE__ */ React.createElement("li", { key: i, className: "flex items-start gap-2 text-sm text-slate-700 leading-snug" }, /* @__PURE__ */ React.createElement("span", { className: `${c.dot} mt-0.5 flex-shrink-0` }, "\u25CF"), /* @__PURE__ */ React.createElement("span", null, text))) : /* @__PURE__ */ React.createElement("li", { className: "text-xs text-slate-600 italic" }, "\u2014")));
    };
    return /* @__PURE__ */ React.createElement("div", { className: "max-w-5xl mx-auto px-4 py-6" }, /* @__PURE__ */ React.createElement(MainTitle, null), showGameButton && /* @__PURE__ */ React.createElement("div", { className: "flex justify-center mb-4" }, /* @__PURE__ */ React.createElement(GameButtonHint, null), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setIsInteractiveSeeThinkWonderSort(true);
          setIsSeeThinkWonderSortPlaying(true);
          _broadcastInteractiveOrganizer("seethinkwonder");
        },
        className: "flex items-center gap-2 bg-gradient-to-r from-sky-500 to-amber-500 text-white px-5 py-2 rounded-full font-bold text-sm shadow-md hover:shadow-lg hover:scale-105 transition-all motion-safe:animate-[pulse_3s_ease-in-out_infinite]",
        "aria-describedby": "game-btn-hint",
        "aria-label": t("games.see_think_wonder_sort.play_btn") || "Play See-Think-Wonder Sort Game"
      },
      /* @__PURE__ */ React.createElement(Gamepad2, { size: 16 }),
      " ",
      t("games.see_think_wonder_sort.play_btn") || "Sort: Observation, Inference, or Question?"
    ), isInteractiveSeeThinkWonderSort && isTeacherMode && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 ml-2", role: "status", "aria-live": "polite" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-1 rounded-full" }, "\u{1F3AF} Live for students"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
      setIsInteractiveSeeThinkWonderSort(false);
      _broadcastInteractiveOrganizer(null);
    }, className: "text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-300 px-2 py-1 rounded-full", "aria-label": t("a11y.stop_interactive_activity") }, "\u23F9 Stop Activity"))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 border-2 border-slate-400 rounded-2xl overflow-hidden shadow-lg bg-white divide-y md:divide-y-0 md:divide-x divide-slate-200" }, renderSTWColumn(seeBranch, "sky", "What you can directly observe"), renderSTWColumn(thinkBranch, "violet", "What the observations suggest"), renderSTWColumn(wonderBranch, "amber", "Questions you want to explore")), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500 italic text-center mt-3" }, t("outline.see_think_wonder_caption") || "See, Think, Wonder (Harvard Project Zero): observation, inference, and open questioning kept distinct."));
  }
  if (type === "KWL Chart" && !isEditingOutline) {
    if (branches.length !== 3) {
      return renderOrganizerFallback(
        t("outline.kwl_invalid_title") || "This KWL Chart is incomplete",
        t("outline.kwl_invalid_desc") || "A KWL Chart needs exactly three sections: Know, Want to Know, and Learned. Regenerate it or switch to edit mode to repair the sections."
      );
    }
    const knowBranch = branches[0] || { title: "Know", items: [] };
    const wantBranch = branches[1] || { title: "Want to Know", items: [] };
    const learnedBranch = branches[2] || { title: "Learned", items: [] };
    const itemText = (it) => typeof it === "object" ? it?.text || "" : String(it);
    const KWL_COLORS = {
      sky: { bg: "bg-sky-50/70", header: "bg-sky-600 text-white", dot: "text-sky-500" },
      violet: { bg: "bg-violet-50/70", header: "bg-violet-600 text-white", dot: "text-violet-500" },
      emerald: { bg: "bg-emerald-50/70", header: "bg-emerald-600 text-white", dot: "text-emerald-500" }
    };
    const renderColumn = (branch, colorKey, placeholderWhenEmpty) => {
      const items = (branch.items || []).map(itemText).filter(Boolean);
      const c = KWL_COLORS[colorKey];
      return /* @__PURE__ */ React.createElement("div", { className: `${c.bg} flex-1 min-h-[300px]` }, /* @__PURE__ */ React.createElement("h4", { className: `${c.header} font-black text-base uppercase tracking-wide text-center py-3 px-4` }, branch.title), /* @__PURE__ */ React.createElement("ul", { className: "p-4 space-y-2" }, items.length > 0 ? items.map((text, i) => /* @__PURE__ */ React.createElement("li", { key: i, className: "flex items-start gap-2 text-sm text-slate-700 leading-snug" }, /* @__PURE__ */ React.createElement("span", { className: `${c.dot} mt-0.5 flex-shrink-0` }, "\u25CF"), /* @__PURE__ */ React.createElement("span", null, text))) : /* @__PURE__ */ React.createElement("li", { className: "text-xs text-slate-600 italic" }, placeholderWhenEmpty || "\u2014")));
    };
    return /* @__PURE__ */ React.createElement("div", { className: "max-w-5xl mx-auto px-4 py-6" }, /* @__PURE__ */ React.createElement(MainTitle, null), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 border-2 border-slate-400 rounded-2xl overflow-hidden shadow-lg bg-white divide-y md:divide-y-0 md:divide-x divide-slate-200" }, renderColumn(knowBranch, "sky", null), renderColumn(wantBranch, "violet", null), renderColumn(learnedBranch, "emerald", t("outline.kwl_learned_placeholder") || "(students fill this in after the lesson)")), React.createElement(KwlResponseBoard, { main, branches, t }), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500 italic text-center mt-3" }, t("outline.kwl_caption") || "KWL Chart: prior knowledge on the left, anticipated questions in the middle, learning captured on the right after the lesson."));
  }
  if (type === "Claim-Evidence-Reasoning" && !isEditingOutline) {
    if (branches.length !== 3) {
      return renderOrganizerFallback(
        t("outline.cer_invalid_title") || "This CER organizer is incomplete",
        t("outline.cer_invalid_desc") || "A CER organizer needs exactly three sections: Claim, Evidence, and Reasoning. Regenerate it or switch to edit mode to repair the sections."
      );
    }
    const cerStages = [
      { branch: branches[0], label: t("outline.cer_claim") || "Claim", color: "indigo", caption: t("outline.cer_claim_caption") || "The answer or position" },
      { branch: branches[1], label: t("outline.cer_evidence") || "Evidence", color: "sky", caption: t("outline.cer_evidence_caption") || "Specific support from the source" },
      { branch: branches[2], label: t("outline.cer_reasoning") || "Reasoning", color: "emerald", caption: t("outline.cer_reasoning_caption") || "Why the evidence supports the claim" }
    ];
    const cerColors = {
      indigo: { shell: "border-indigo-300 bg-indigo-50/70", badge: "bg-indigo-600", text: "text-indigo-950", dot: "bg-indigo-500" },
      sky: { shell: "border-sky-300 bg-sky-50/70", badge: "bg-sky-600", text: "text-sky-950", dot: "bg-sky-500" },
      emerald: { shell: "border-emerald-300 bg-emerald-50/70", badge: "bg-emerald-600", text: "text-emerald-950", dot: "bg-emerald-500" }
    };
    return /* @__PURE__ */ React.createElement("div", { className: "max-w-6xl mx-auto px-4 py-6" }, /* @__PURE__ */ React.createElement(MainTitle, null), /* @__PURE__ */ React.createElement("div", { className: "mb-5 rounded-2xl border-2 border-slate-300 bg-white px-5 py-4 text-center shadow-sm" }, /* @__PURE__ */ React.createElement("div", { className: "text-[10px] font-black uppercase tracking-[0.18em] text-slate-600" }, t("outline.cer_question") || "Question or phenomenon"), /* @__PURE__ */ React.createElement("div", { className: "mt-1 font-bold text-slate-900" }, main)), /* @__PURE__ */ React.createElement("div", { role: "list", "aria-label": t("outline.cer_flow_aria") || "Claim, Evidence, and Reasoning relationship", className: "flex flex-col md:flex-row items-stretch gap-3" }, cerStages.map((stage, index) => {
      const colors = cerColors[stage.color];
      const items = Array.isArray(stage.branch?.items) ? stage.branch.items : [];
      return /* @__PURE__ */ React.createElement(React.Fragment, { key: stage.label }, /* @__PURE__ */ React.createElement("section", { role: "listitem", className: `flex-1 rounded-2xl border-2 p-4 shadow-sm ${colors.shell}` }, /* @__PURE__ */ React.createElement("div", { className: `inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider text-white ${colors.badge}` }, stage.label), /* @__PURE__ */ React.createElement("p", { className: `mt-2 text-xs font-semibold ${colors.text}` }, stage.caption), /* @__PURE__ */ React.createElement("h4", { className: `mt-3 font-black ${colors.text}` }, stage.branch?.title || stage.label), /* @__PURE__ */ React.createElement("ul", { className: "mt-3 space-y-2" }, items.map((item, itemIndex) => {
        const text = typeof item === "object" ? item?.text || "" : String(item || "");
        return text ? /* @__PURE__ */ React.createElement("li", { key: itemIndex, className: "flex items-start gap-2 rounded-lg bg-white/80 p-2 text-sm text-slate-800" }, /* @__PURE__ */ React.createElement("span", { className: `mt-1.5 h-2 w-2 shrink-0 rounded-full ${colors.dot}`, "aria-hidden": "true" }), /* @__PURE__ */ React.createElement("span", null, text)) : null;
      }))), index < cerStages.length - 1 && /* @__PURE__ */ React.createElement("div", { className: "flex shrink-0 items-center justify-center text-slate-500", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement(ArrowRight, { size: 28, className: "rotate-90 md:rotate-0", strokeWidth: 2.5 })));
    })), /* @__PURE__ */ React.createElement("p", { className: "mt-4 text-center text-xs italic text-slate-600" }, t("outline.cer_caption") || "Evidence becomes persuasive when reasoning clearly connects it to the claim."));
  }
  if (type === "Story Map" && !isEditingOutline) {
    if (branches.length !== 5) {
      const sourceNote = branches[0]?.items?.map((item) => typeof item === "object" ? item?.text || "" : String(item || "")).filter(Boolean).join(" ");
      return renderOrganizerFallback(
        t("outline.story_map_invalid_title") || "This source does not contain a complete narrative arc",
        t("outline.story_map_invalid_desc") || "A Story Map needs Exposition, Rising Action, Climax, Falling Action, and Resolution. Try a narrative source or choose a different organizer.",
        sourceNote || branches[0]?.title || ""
      );
    }
    if (isStoryMapSortPlaying || isInteractiveStoryMapSort && !isTeacherMode) {
      return /* @__PURE__ */ React.createElement(ErrorBoundary, { fallbackMessage: "Story Map Sort encountered an error." }, /* @__PURE__ */ React.createElement(
        StoryMapSortGame,
        {
          data: generatedContent?.data,
          onClose: closeStoryMapSort,
          playSound,
          topicTitle: main || "",
          onScoreUpdate: handleGameScoreUpdate,
          onGameComplete: handleGameCompletion
        }
      ));
    }
    const stages = [
      { branch: branches[0] || { title: "Exposition", items: [] }, x: 60, y: 340, color: "#0891b2", anchor: "start" },
      { branch: branches[1] || { title: "Rising Action", items: [] }, x: 250, y: 220, color: "#7c3aed", anchor: "middle" },
      { branch: branches[2] || { title: "Climax", items: [] }, x: 450, y: 70, color: "#dc2626", anchor: "middle" },
      { branch: branches[3] || { title: "Falling Action", items: [] }, x: 650, y: 220, color: "#7c3aed", anchor: "middle" },
      { branch: branches[4] || { title: "Resolution", items: [] }, x: 840, y: 340, color: "#059669", anchor: "end" }
    ];
    const itemText = (it) => typeof it === "object" ? it?.text || "" : String(it);
    return /* @__PURE__ */ React.createElement("div", { className: "max-w-5xl mx-auto px-4 py-6" }, /* @__PURE__ */ React.createElement(MainTitle, null), showGameButton && /* @__PURE__ */ React.createElement("div", { className: "flex justify-center mb-4" }, /* @__PURE__ */ React.createElement(GameButtonHint, null), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setIsInteractiveStoryMapSort(true);
          setIsStoryMapSortPlaying(true);
          _broadcastInteractiveOrganizer("storymap");
        },
        className: "flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-rose-500 text-white px-5 py-2 rounded-full font-bold text-sm shadow-md hover:shadow-lg hover:scale-105 transition-all motion-safe:animate-[pulse_3s_ease-in-out_infinite]",
        "aria-describedby": "game-btn-hint",
        "aria-label": t("games.story_map_sort.play_btn") || "Play Story Map Sort Game"
      },
      /* @__PURE__ */ React.createElement(Gamepad2, { size: 16 }),
      " ",
      t("games.story_map_sort.play_btn") || "Sort Events Along the Arc"
    ), isInteractiveStoryMapSort && isTeacherMode && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 ml-2", role: "status", "aria-live": "polite" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-1 rounded-full" }, "\u{1F3AF} Live for students"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
      setIsInteractiveStoryMapSort(false);
      _broadcastInteractiveOrganizer(null);
    }, className: "text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-300 px-2 py-1 rounded-full", "aria-label": t("a11y.stop_interactive_activity") }, "\u23F9 Stop Activity"))), /* @__PURE__ */ React.createElement("div", { className: "bg-gradient-to-b from-sky-50/80 via-white to-amber-50/40 border-2 border-slate-300 rounded-2xl p-6 shadow-lg" }, /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 900 400", className: "w-full h-auto", preserveAspectRatio: "xMidYMid meet", role: "img", "aria-label": t("outline.plot_diagram_arc_aria") || "Plot diagram arc showing narrative tension rising to the climax and falling toward resolution" }, /* @__PURE__ */ React.createElement("path", { d: "M 60 340 Q 250 280 450 70 Q 650 280 840 340", fill: "none", stroke: "#94a3b8", strokeWidth: "3", strokeLinecap: "round", strokeDasharray: "6 6" }), stages.map((stage, i) => /* @__PURE__ */ React.createElement("g", { key: i }, /* @__PURE__ */ React.createElement("circle", { cx: stage.x, cy: stage.y, r: "9", fill: stage.color, stroke: "white", strokeWidth: "3" }), /* @__PURE__ */ React.createElement("text", { x: stage.x, y: stage.y - 20, textAnchor: stage.anchor, style: { fontSize: "13px", fontWeight: 900, fill: stage.color, textTransform: "uppercase", letterSpacing: "0.05em" } }, stage.branch.title)))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 mt-6" }, stages.map((stage, i) => {
      const items = (stage.branch.items || []).map(itemText).filter(Boolean);
      return /* @__PURE__ */ React.createElement("div", { key: i, className: "bg-white rounded-lg border border-slate-200 p-3 shadow-sm" }, /* @__PURE__ */ React.createElement("h5", { className: "text-xs font-black uppercase tracking-wider mb-2", style: { color: stage.color } }, stage.branch.title), /* @__PURE__ */ React.createElement("ul", { className: "space-y-1" }, items.length > 0 ? items.map((text, k) => /* @__PURE__ */ React.createElement("li", { key: k, className: "text-xs text-slate-700 leading-snug" }, "\u2022 ", text)) : /* @__PURE__ */ React.createElement("li", { className: "text-xs text-slate-600 italic" }, "\u2014")));
    }))), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500 italic text-center mt-3" }, t("outline.story_map_caption") || "Story Map: tension rises through Rising Action to the Climax, then falls toward Resolution. The arc visualizes the shape of narrative tension."));
  }
  if (type === "Memory Palace" && !isEditingOutline) {
    return /* @__PURE__ */ React.createElement("div", { className: "max-w-6xl mx-auto px-4 py-6" }, /* @__PURE__ */ React.createElement(MainTitle, null), /* @__PURE__ */ React.createElement(ErrorBoundary, { fallbackMessage: "Memory Palace encountered an error." }, /* @__PURE__ */ React.createElement(
      MemoryPalaceView,
      {
        data: generatedContent?.data,
        title: main,
        t,
        addToast: deps.addToast,
        onPersist: deps.handleConceptSpacePersist,
        callImagen: deps.callImagen,
        playSound,
        onScoreUpdate: handleGameScoreUpdate,
        onGameComplete: handleGameCompletion,
        isTeacherMode,
        armed: !!isInteractivePalaceRecall,
        onRecallArm: () => {
          if (setIsInteractivePalaceRecall) setIsInteractivePalaceRecall(true);
          _broadcastInteractiveOrganizer("palacerecall");
        },
        onRecallClose: () => {
          if (!isTeacherMode && setIsInteractivePalaceRecall) setIsInteractivePalaceRecall(false);
        }
      }
    )));
  }
  if (type === "3D Concept Space" && !isEditingOutline) {
    return /* @__PURE__ */ React.createElement("div", { className: "max-w-6xl mx-auto px-4 py-6" }, /* @__PURE__ */ React.createElement(MainTitle, null), /* @__PURE__ */ React.createElement(ErrorBoundary, { fallbackMessage: "3D Concept Space encountered an error." }, /* @__PURE__ */ React.createElement(
      ConceptSpace3DView,
      {
        data: generatedContent?.data,
        title: main,
        t,
        addToast: deps.addToast,
        callImagen: deps.callImagen,
        onPersist: deps.handleConceptSpacePersist,
        playSound,
        onScoreUpdate: handleGameScoreUpdate,
        onGameComplete: handleGameCompletion,
        isTeacherMode,
        armed: !!isInteractiveStrandChallenge,
        onChallengeArm: () => {
          if (setIsInteractiveStrandChallenge) setIsInteractiveStrandChallenge(true);
          _broadcastInteractiveOrganizer("strandchallenge3d");
        },
        onChallengeClose: () => {
          if (!isTeacherMode && setIsInteractiveStrandChallenge) setIsInteractiveStrandChallenge(false);
        }
      }
    )));
  }
  if (type === "Structured Outline") {
    const toRoman = (num) => {
      const lookup = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
      return lookup[num] || num;
    };
    if (isOutlineSortPlaying || isInteractiveOutlineSort && !isTeacherMode) {
      return /* @__PURE__ */ React.createElement(ErrorBoundary, { fallbackMessage: "Outline Sort encountered an error." }, /* @__PURE__ */ React.createElement(
        OutlineSortGame,
        {
          data: { branches },
          onClose: closeOutlineSort,
          playSound,
          topicTitle: main || "",
          onScoreUpdate: handleGameScoreUpdate,
          onGameComplete: handleGameCompletion
        }
      ));
    }
    return /* @__PURE__ */ React.createElement("div", { className: "max-w-4xl mx-auto px-4 py-6" }, /* @__PURE__ */ React.createElement(MainTitle, null), showGameButton && /* @__PURE__ */ React.createElement("div", { className: "flex justify-center mb-4" }, /* @__PURE__ */ React.createElement(GameButtonHint, null), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setIsInteractiveOutlineSort(true);
          setIsOutlineSortPlaying(true);
          _broadcastInteractiveOrganizer("outline");
        },
        className: "flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-5 py-2 rounded-full font-bold text-sm shadow-md hover:shadow-lg hover:scale-105 transition-all motion-safe:animate-[pulse_3s_ease-in-out_infinite]",
        "aria-describedby": "game-btn-hint",
        "aria-label": t("games.outline_sort.play_btn") || "Play Outline Sort Game"
      },
      /* @__PURE__ */ React.createElement(Gamepad2, { size: 16 }),
      " ",
      t("games.outline_sort.play_btn") || "Sort Under Headings"
    ), isInteractiveOutlineSort && isTeacherMode && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 ml-2", role: "status", "aria-live": "polite" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-1 rounded-full" }, "\u{1F3AF} Live for students"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
      setIsInteractiveOutlineSort(false);
      _broadcastInteractiveOrganizer(null);
    }, className: "text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-300 px-2 py-1 rounded-full", "aria-label": t("a11y.stop_interactive_activity") }, "\u23F9 Stop Activity"))), /* @__PURE__ */ React.createElement("div", { className: "relative mt-8 space-y-8 ml-4 md:ml-12" }, /* @__PURE__ */ React.createElement("div", { className: "absolute left-[-24px] top-4 bottom-8 w-0.5 bg-indigo-200/50 rounded-full" }), branches.map((branch, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "relative group animate-in slide-in-from-left-4 duration-500", style: { animationDelay: `${i * 100}ms` } }, /* @__PURE__ */ React.createElement("div", { className: "absolute left-[-29px] top-6 w-3 h-3 rounded-full bg-white border-2 border-indigo-400 z-10 group-hover:scale-125 transition-transform shadow-sm" }), /* @__PURE__ */ React.createElement("div", { className: "absolute left-[-24px] top-[29px] w-6 h-px bg-indigo-300" }), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-r-xl rounded-bl-xl border-l-4 border-l-indigo-500 border-y border-r border-indigo-100 p-5 shadow-sm hover:shadow-md transition-all" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-3 mb-3" }, /* @__PURE__ */ React.createElement("span", { className: "font-serif font-bold text-indigo-200 text-3xl leading-none select-none -mt-1" }, toRoman(i + 1)), /* @__PURE__ */ React.createElement("div", { className: "flex-grow" }, isEditingOutline ? /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-1" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        "aria-label": t("common.enter_branch"),
        value: branch.title,
        onChange: (e) => handleOutlineChange(i, "title", e.target.value),
        className: "font-bold text-lg text-indigo-900 w-full bg-transparent border-b border-dashed border-indigo-200 focus:border-indigo-500"
      }
    ), (branch.title_en || leveledTextLanguage !== "English") && /* @__PURE__ */ React.createElement(
      "input",
      {
        "aria-label": t("common.common_placeholder_translation"),
        value: branch.title_en || "",
        onChange: (e) => handleOutlineChange(i, "title", e.target.value, null, true),
        className: "text-xs text-slate-600 w-full bg-transparent focus:ring-2 focus:ring-indigo-400 border-b border-dashed border-slate-200",
        placeholder: t("common.placeholder_translation")
      }
    )) : /* @__PURE__ */ React.createElement("div", { className: "border-b border-slate-50 pb-2" }, /* @__PURE__ */ React.createElement("h4", { className: "font-bold text-lg text-indigo-900" }, branch.title), branch.title_en && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-600 italic" }, "(", branch.title_en, ")")))), /* @__PURE__ */ React.createElement("ul", { className: "space-y-0 text-sm text-slate-700 bg-slate-50/50 rounded-lg overflow-hidden border border-slate-100" }, branch.items && branch.items.map((item, k) => /* @__PURE__ */ React.createElement("li", { key: k, className: "group/item relative flex items-start gap-3 p-3 border-b border-slate-100 last:border-0 hover:bg-indigo-50/30 transition-colors" }, /* @__PURE__ */ React.createElement("span", { className: "font-mono text-indigo-600 font-bold text-xs mt-0.5 select-none" }, String.fromCharCode(65 + k), "."), /* @__PURE__ */ React.createElement("div", { className: "w-full" }, isEditingOutline ? /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-1" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        "aria-label": t("common.enter_item"),
        value: item,
        onChange: (e) => handleOutlineChange(i, "item", e.target.value, k),
        className: "w-full bg-white rounded px-2 py-1 border border-slate-400 focus:border-indigo-600"
      }
    ), (branch.items_en?.[k] || leveledTextLanguage !== "English") && /* @__PURE__ */ React.createElement(
      "input",
      {
        "aria-label": t("common.common_placeholder_translation"),
        value: branch.items_en?.[k] || "",
        onChange: (e) => handleOutlineChange(i, "item", e.target.value, k, true),
        className: "w-full bg-white rounded px-2 py-0.5 text-xs text-slate-600 italic focus:ring-2 focus:ring-indigo-400 border border-slate-100",
        placeholder: t("common.placeholder_translation")
      }
    )) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { className: "leading-relaxed" }, item), branch.items_en?.[k] && /* @__PURE__ */ React.createElement("div", { className: "text-xs text-slate-600 italic mt-0.5" }, "(", branch.items_en[k], ")")))))))))));
  }
  return /* @__PURE__ */ React.createElement("div", { className: "max-w-5xl mx-auto" }, /* @__PURE__ */ React.createElement(MainTitle, null), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6" }, branches.map((b, i) => /* @__PURE__ */ React.createElement(BranchItem, { key: i, branch: b, bIdx: i }))));
};
var _VO_CG3D_CDN_FALLBACK = "https://alloflow-cdn.pages.dev/";
function _voCg3dSelfBase() {
  try {
    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src || "";
      var idx = src.indexOf("view_renderers_module.js");
      if (idx >= 0) return { base: src.slice(0, idx), query: src.slice(idx + "view_renderers_module.js".length) };
    }
  } catch (e) {
  }
  return { base: _VO_CG3D_CDN_FALLBACK, query: "" };
}
function _voCg3dLoadScript(url) {
  return new Promise(function(resolve, reject) {
    try {
      var ex = document.querySelector('script[data-cg-src="' + url + '"]');
      if (ex) {
        if (ex.getAttribute("data-cg-loaded") === "1") return resolve();
        ex.addEventListener("load", function() {
          resolve();
        });
        ex.addEventListener("error", function() {
          reject(new Error("load failed"));
        });
        return;
      }
      var s = document.createElement("script");
      s.src = url;
      s.async = true;
      s.setAttribute("data-cg-src", url);
      s.onload = function() {
        s.setAttribute("data-cg-loaded", "1");
        resolve();
      };
      s.onerror = function() {
        reject(new Error("load failed: " + url));
      };
      document.head.appendChild(s);
    } catch (e) {
      reject(e);
    }
  });
}
function _voPalaceEnsure() {
  if (window.AlloModules && window.AlloModules.MemoryPalace) return Promise.resolve(true);
  var loc = _voCg3dSelfBase();
  return _voCg3dLoadScript(loc.base + "memory_palace_module.js" + loc.query).then(function() {
    return !!(window.AlloModules && window.AlloModules.MemoryPalace);
  }).catch(function() {
    return false;
  });
}
function _voPrim3dEnsure() {
  if (window.AlloModules && window.AlloModules.Prim3D) return Promise.resolve(true);
  var loc = _voCg3dSelfBase();
  return _voCg3dLoadScript(loc.base + "prim3d_module.js" + loc.query).then(function() {
    return !!(window.AlloModules && window.AlloModules.Prim3D);
  }).catch(function() {
    return false;
  });
}
function _voVoiceEnsure() {
  if (window.AlloFlowVoice || window.AlloModules && window.AlloModules.Voice) return Promise.resolve(true);
  var loc = _voCg3dSelfBase();
  return _voCg3dLoadScript(loc.base + "voice_module.js" + loc.query).then(function() {
    return !!(window.AlloFlowVoice || window.AlloModules && window.AlloModules.Voice);
  }).catch(function() {
    return false;
  });
}
function _voGlbEnsure() {
  if (window.AlloModules && window.AlloModules.GlbLibrary) return Promise.resolve(true);
  var loc = _voCg3dSelfBase();
  return _voCg3dLoadScript(loc.base + "glb_library_module.js" + loc.query).then(function() {
    return !!(window.AlloModules && window.AlloModules.GlbLibrary);
  }).catch(function() {
    return false;
  });
}
function _voCg3dEnsure() {
  if (window.AlloModules && window.AlloModules.ConceptGraph3D && window.AlloModules.ConceptGraphEngine) return Promise.resolve(true);
  var loc = _voCg3dSelfBase();
  return _voCg3dLoadScript(loc.base + "concept_graph_engine_module.js" + loc.query).then(function() {
    return _voCg3dLoadScript(loc.base + "concept_graph_3d_module.js" + loc.query);
  }).then(function() {
    return !!(window.AlloModules && window.AlloModules.ConceptGraph3D && window.AlloModules.ConceptGraphEngine);
  }).catch(function() {
    return false;
  });
}
function openConceptMap3D(opts) {
  opts = opts || {};
  var t = opts.t || function(k) {
    return k;
  };
  var addToast = opts.addToast || function() {
  };
  var nodes = Array.isArray(opts.nodes) ? opts.nodes : [];
  var generated = opts.generated && Array.isArray(opts.generated.branches) && opts.generated.branches.length ? opts.generated : null;
  if (!nodes.length && !generated) {
    addToast(t("concept_map.view_3d_empty") || "Add some concepts first.", "info");
    return function() {
    };
  }
  var previouslyFocused = document.activeElement;
  var overlay = document.createElement("div");
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "vo-cg3d-title");
  overlay.setAttribute("aria-describedby", "vo-cg3d-hint");
  overlay.tabIndex = -1;
  overlay.style.cssText = "position:fixed;inset:0;z-index:1000;background:rgba(2,6,23,0.94);display:flex;flex-direction:column;";
  var header = document.createElement("div");
  header.style.cssText = "display:flex;align-items:center;gap:12px;padding:10px 16px;background:#0b1020;border-bottom:1px solid #1e293b;color:#e2e8f0;";
  var titleWrap = document.createElement("div");
  titleWrap.style.cssText = "flex:1;min-width:0;";
  var title = document.createElement("div");
  title.id = "vo-cg3d-title";
  title.style.cssText = "font-weight:800;font-size:14px;";
  title.textContent = "\u{1F9CA} " + (t("concept_map.view_3d") || "3D concept map");
  var hint = document.createElement("div");
  hint.id = "vo-cg3d-hint";
  hint.style.cssText = "font-size:11px;color:#94a3b8;";
  hint.textContent = t("concept_map.view_3d_controls") || "Drag to orbit \xB7 scroll to zoom \xB7 depth = strand";
  titleWrap.appendChild(title);
  titleWrap.appendChild(hint);
  var closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", t("common.close") || "Close");
  closeBtn.textContent = "\u2715";
  closeBtn.style.cssText = "border:none;background:transparent;color:#cbd5e1;cursor:pointer;font-size:18px;padding:4px;min-width:44px;min-height:44px;";
  header.appendChild(titleWrap);
  header.appendChild(closeBtn);
  var body = document.createElement("div");
  body.style.cssText = "flex:1;position:relative;min-height:0;";
  var status = document.createElement("div");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  status.style.cssText = "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;color:#cbd5e1;font-size:14px;line-height:1.5;";
  status.textContent = "\u{1F9ED} " + (t("concept_map.view_3d_loading") || "Loading the 3D view\u2026");
  body.appendChild(status);
  overlay.appendChild(header);
  overlay.appendChild(body);
  document.body.appendChild(overlay);
  closeBtn.focus();
  var handle = null, aiBtn = null;
  var destroyed = false;
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    try {
      if (handle && handle.destroy) handle.destroy();
    } catch (e) {
    }
    try {
      document.removeEventListener("keydown", onKey, true);
    } catch (e) {
    }
    try {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    } catch (e) {
    }
    try {
      if (previouslyFocused && document.contains(previouslyFocused)) previouslyFocused.focus();
    } catch (e) {
    }
  }
  function onKey(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      destroy();
      return;
    }
    if (e.key !== "Tab") return;
    var focusable = Array.from(overlay.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter(function(el) {
      return el.getClientRects().length > 0;
    });
    if (!focusable.length) {
      e.preventDefault();
      overlay.focus();
      return;
    }
    var first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
  document.addEventListener("keydown", onKey, true);
  closeBtn.onclick = destroy;
  _voCg3dEnsure().then(function(ok) {
    if (!overlay.parentNode) return;
    var E = window.AlloModules && window.AlloModules.ConceptGraphEngine;
    var CG3D = window.AlloModules && window.AlloModules.ConceptGraph3D;
    if (!ok || !E || !CG3D) {
      status.textContent = "\u26A0\uFE0F " + (t("concept_map.view_3d_failed") || "The 3D view could not load here. Open the latest Canvas link and try again \u2014 the outline still works.");
      return;
    }
    var savedStrandZ = !!(opts.arrangement && opts.arrangement.axisValues && Object.keys(opts.arrangement.axisValues).some(function(id) {
      var av = opts.arrangement.axisValues[id];
      return av && typeof av.z === "string";
    }));
    function buildGraph(withShape) {
      var g = nodes.length ? E.fromConceptMap(nodes, Array.isArray(opts.edges) ? opts.edges : [], opts.structureType || null) : E.adaptGenerated(generated);
      if (withShape && !nodes.length && E.applyStructureLayout) g = E.applyStructureLayout(g);
      if (E.ensureDefaultAxisValues) g = E.ensureDefaultAxisValues(g);
      return g;
    }
    var graph = buildGraph(!savedStrandZ);
    if (opts.arrangement && E.applyArrangement) graph = E.applyArrangement(graph, opts.arrangement);
    var canPersist = typeof opts.onArrangementChange === "function";
    function setHint() {
      var shaped = !!(graph && graph.meta && graph.meta.layout);
      if (canPersist) {
        hint.textContent = shaped ? t("concept_map.view_3d_controls_edit_shaped") || "Drag a node to place it \xB7 drag space to orbit \xB7 scroll to zoom \xB7 placement follows the organizer" : t("concept_map.view_3d_controls_edit") || "Drag a node to place it \xB7 drag space to orbit \xB7 scroll to zoom \xB7 depth = strand";
      } else if (shaped) {
        hint.textContent = t("concept_map.view_3d_controls_shaped") || "Drag to orbit \xB7 scroll to zoom \xB7 placement follows the organizer";
      }
    }
    var renderOpts = { t };
    if (canPersist) {
      renderOpts.editable = true;
      renderOpts.onArrangementChange = function(arr) {
        try {
          if (E.applyArrangement) graph = E.applyArrangement(graph, arr);
        } catch (e) {
        }
        try {
          opts.onArrangementChange(arr);
        } catch (e) {
        }
      };
    }
    setHint();
    if (status.parentNode) status.parentNode.removeChild(status);
    var snapBtn = document.createElement("button");
    snapBtn.textContent = "\u{1F4F7} " + (t("concept_map.view_3d_snapshot") || "Snapshot");
    snapBtn.setAttribute("aria-label", t("concept_map.view_3d_snapshot_tip") || "Save a picture of the 3D view");
    snapBtn.title = t("concept_map.view_3d_snapshot_tip") || "Save a picture of the 3D view";
    snapBtn.style.cssText = "font-size:12px;font-weight:700;padding:6px 12px;min-height:44px;border-radius:8px;border:1px solid #334155;white-space:nowrap;background:transparent;color:#cbd5e1;cursor:pointer;";
    header.insertBefore(snapBtn, closeBtn);
    snapBtn.onclick = function() {
      var url = null;
      try {
        url = handle && handle.snapshot ? handle.snapshot() : null;
      } catch (e) {
      }
      if (!url) {
        addToast(t("concept_map.view_3d_snapshot_failed") || "Could not capture the 3D view here.", "error");
        return;
      }
      try {
        var a = document.createElement("a");
        var slug = String(opts.title || "concept-map").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "concept-map";
        a.href = url;
        a.download = slug + "-3d.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        addToast("\u{1F4F7} " + (t("concept_map.view_3d_snapshot_saved") || "Snapshot saved"), "success");
      } catch (e) {
        addToast(t("concept_map.view_3d_snapshot_failed") || "Could not capture the 3D view here.", "error");
      }
    };
    if (canPersist) {
      var resetArrBtn = document.createElement("button");
      resetArrBtn.textContent = "\u21BA " + (t("concept_space.reset") || "Reset arrangement");
      resetArrBtn.style.cssText = "font-size:12px;font-weight:700;padding:6px 12px;min-height:44px;border-radius:8px;border:1px solid #334155;white-space:nowrap;background:transparent;color:#cbd5e1;cursor:pointer;";
      header.insertBefore(resetArrBtn, closeBtn);
      resetArrBtn.onclick = function() {
        try {
          opts.onArrangementChange(null);
        } catch (e) {
        }
        graph = buildGraph(true);
        setHint();
        try {
          if (handle && handle.destroy) handle.destroy();
        } catch (e) {
        }
        handle = CG3D.render(body, graph, renderOpts);
      };
    }
    if (typeof window.callGemini === "function") {
      aiBtn = document.createElement("button");
      aiBtn.textContent = "\u2728 " + (t("concept_map.view_3d_arrange") || "Arrange by meaning");
      aiBtn.style.cssText = "font-size:12px;font-weight:800;padding:6px 12px;min-height:44px;border-radius:8px;border:none;white-space:nowrap;background:linear-gradient(90deg,#7c3aed,#4f46e5);color:#fff;cursor:pointer;";
      header.insertBefore(aiBtn, closeBtn);
      aiBtn.onclick = function() {
        aiBtn.disabled = true;
        var prev = aiBtn.textContent;
        aiBtn.textContent = "\u2026 " + (t("concept_map.view_3d_arranging") || "Arranging");
        E.layoutWithGemini(graph, window.callGemini, { topic: opts.title || "" }).then(function(merged) {
          if (!overlay.parentNode) return;
          graph = merged;
          if (graph.meta && graph.meta.layout) {
            var m2 = Object.assign({}, graph.meta);
            delete m2.layout;
            graph = Object.assign({}, graph, { meta: m2 });
          }
          setHint();
          if (canPersist && E.extractArrangement) {
            try {
              opts.onArrangementChange(E.extractArrangement(graph));
            } catch (e) {
            }
          }
          try {
            if (handle && handle.destroy) handle.destroy();
          } catch (e) {
          }
          handle = CG3D.render(body, graph, renderOpts);
        }).catch(function() {
          addToast(t("concept_map.view_3d_arrange_failed") || "AI arrange failed", "error");
        }).then(function() {
          if (aiBtn) {
            aiBtn.disabled = false;
            aiBtn.textContent = prev;
          }
        });
      };
    }
    handle = CG3D.render(body, graph, renderOpts);
  });
  return destroy;
}
const ConceptSpace3DView = ({ data, title, t, addToast, callImagen, onPersist, playSound, onScoreUpdate, onGameComplete, isTeacherMode, armed, onChallengeArm, onChallengeClose }) => {
  const hasContent = Array.isArray(data?.branches) && data.branches.length > 0;
  const hostRef = React.useRef(null);
  const handleRef = React.useRef(null);
  const graphRef = React.useRef(null);
  const [ready, setReady] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [arranging, setArranging] = React.useState(false);
  const [nonce, setNonce] = React.useState(0);
  const persist = typeof onPersist === "function" ? onPersist : null;
  const canImagen = typeof callImagen === "function";
  const constelWeights = data?.constellation || {};
  const constelRef = React.useRef({});
  constelRef.current = constelWeights;
  const [constelOpen, setConstelOpen] = React.useState(false);
  const [constelMode, setConstelMode] = React.useState("off");
  const [constelA, setConstelA] = React.useState("");
  const [constelB, setConstelB] = React.useState("");
  const [constelW, setConstelW] = React.useState(0.5);
  const [constelWhy, setConstelWhy] = React.useState("");
  const [constelBusy, setConstelBusy] = React.useState(false);
  const [selectedNode, setSelectedNode] = React.useState(null);
  const selectedNodeRef = React.useRef(null);
  const artRef = React.useRef({});
  artRef.current = data?.conceptArt || {};
  const artAliveRef = React.useRef(true);
  React.useEffect(() => () => {
    artAliveRef.current = false;
  }, []);
  const [artType, setArtType] = React.useState("sculpture");
  const [directPrompt, setDirectPrompt] = React.useState("");
  const [directEval, setDirectEval] = React.useState(null);
  const [directBusy, setDirectBusy] = React.useState(null);
  const [refinePrompt, setRefinePrompt] = React.useState("");
  const [refineBusy, setRefineBusy] = React.useState(false);
  const [challenge, setChallenge] = React.useState(null);
  const [placedCount, setPlacedCount] = React.useState(0);
  const placedRef = React.useRef({});
  const attemptsRef = React.useRef(0);
  const startedByArmRef = React.useRef(false);
  const [elapsed, setElapsed] = React.useState(0);
  const elapsedRef = React.useRef(0);
  const [won, setWon] = React.useState(false);
  const [lastScore, setLastScore] = React.useState(null);
  const [hint, setHint] = React.useState(null);
  const [hintLoading, setHintLoading] = React.useState(false);
  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const challengeEligible = React.useMemo(() => {
    const branches = Array.isArray(data?.branches) ? data.branches : [];
    const items = branches.reduce((s, b) => s + (b.items || []).filter((it) => typeof it === "object" ? it.text : it).length, 0);
    return branches.length >= 2 && items >= 4;
  }, [data]);
  const dataKey = JSON.stringify({ m: data?.main, b: (Array.isArray(data?.branches) ? data.branches : []).map((b) => ({ t: b.title, i: b.items })) });
  React.useEffect(() => {
    let alive = true;
    _voCg3dEnsure().then((ok) => {
      if (!alive) return;
      if (!ok) {
        setFailed(true);
        return;
      }
      _voPrim3dEnsure().then(() => {
        if (alive) setReady(true);
      });
    });
    return () => {
      alive = false;
    };
  }, []);
  React.useEffect(() => {
    if (!ready || failed || !hostRef.current || !hasContent) return void 0;
    const E = window.AlloModules && window.AlloModules.ConceptGraphEngine;
    const CG3D = window.AlloModules && window.AlloModules.ConceptGraph3D;
    if (!E || !CG3D) {
      setFailed(true);
      return void 0;
    }
    let graph;
    if (challenge) {
      graph = challenge.graph;
    } else {
      graph = E.adaptGenerated(data || {});
      if (E.ensureDefaultAxisValues) graph = E.ensureDefaultAxisValues(graph);
      if (data?.conceptSpace && E.applyArrangement) graph = E.applyArrangement(graph, data.conceptSpace);
      graphRef.current = graph;
    }
    handleRef.current = CG3D.render(hostRef.current, graph, {
      t,
      autoRotate: false,
      editable: challenge ? true : !!persist,
      // Restore saved art on mount; skipped during a challenge (different graph).
      initialNodeArt: challenge ? {} : data?.conceptArt || {},
      // Selection bridge → React art panel. Clears the in-flight prompt/eval
      // when moving to a different node so stale suggestions don't linger.
      onSelectNode: (id, meta) => {
        selectedNodeRef.current = meta;
        setSelectedNode(meta);
        setDirectEval(null);
        setDirectPrompt("");
        setRefinePrompt("");
      },
      onArrangementChange: challenge ? ((arr) => {
        const placed = {};
        challenge.targets.forEach((id) => {
          if (arr && arr.categories && arr.categories[id]) placed[id] = arr.categories[id];
        });
        placedRef.current = placed;
        setPlacedCount(Object.keys(placed).length);
      }) : persist ? ((arr) => persist(arr, "conceptSpace")) : void 0
    });
    return () => {
      try {
        if (handleRef.current && handleRef.current.destroy) handleRef.current.destroy();
      } catch (e) {
      }
      handleRef.current = null;
    };
  }, [ready, failed, dataKey, nonce, challenge]);
  const _resetRunState = () => {
    placedRef.current = {};
    setPlacedCount(0);
    elapsedRef.current = 0;
    setElapsed(0);
    setWon(false);
    setLastScore(null);
    setHint(null);
  };
  const startChallenge = (viaArm) => {
    const E = window.AlloModules && window.AlloModules.ConceptGraphEngine;
    if (!E || !E.buildStrandChallenge || !graphRef.current) return;
    const ch = E.buildStrandChallenge(graphRef.current);
    if (!ch.targets.length) {
      if (addToast) addToast(t("concept_space.challenge_empty") || "No concepts to sort yet.", "info");
      return;
    }
    _resetRunState();
    attemptsRef.current = 0;
    startedByArmRef.current = viaArm === true;
    setChallenge(ch);
    if (addToast) addToast(t("concept_space.challenge_start") || "\u{1F3AF} Every concept fell off its strand! Click one, then pick its strand.", "info");
    if (isTeacherMode && viaArm !== true && typeof onChallengeArm === "function") {
      try {
        onChallengeArm();
      } catch (e) {
      }
    }
  };
  const exitChallenge = () => {
    setChallenge(null);
    _resetRunState();
    attemptsRef.current = 0;
    startedByArmRef.current = false;
    if (typeof onChallengeClose === "function") {
      try {
        onChallengeClose();
      } catch (e) {
      }
    }
  };
  const retryChallenge = () => {
    _resetRunState();
    setChallenge((c) => c ? { ...c } : c);
  };
  React.useEffect(() => {
    if (!challenge || won) return void 0;
    const iv = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, 1e3);
    return () => clearInterval(iv);
  }, [challenge, won]);
  React.useEffect(() => {
    if (armed && !isTeacherMode && !challenge && ready && !failed && hasContent) startChallenge(true);
    else if (!armed && !isTeacherMode && challenge && startedByArmRef.current) {
      startedByArmRef.current = false;
      exitChallenge();
    }
  }, [armed, isTeacherMode, ready, failed, challenge]);
  const checkChallenge = () => {
    const E = window.AlloModules && window.AlloModules.ConceptGraphEngine;
    if (!E || !challenge || !handleRef.current) return;
    attemptsRef.current += 1;
    const score = E.scoreStrandChallenge(challenge.answerKey, placedRef.current);
    setLastScore(score);
    const summary = (t("concept_space.challenge_result") || "Placed {correct} of {total} correctly.").replace("{correct}", String(score.correct)).replace("{total}", String(score.total));
    if (handleRef.current.flagNodes) handleRef.current.flagNodes(score.results, summary);
    const points = score.correct * 10;
    const labelOf = (id) => {
      const n = (challenge.graph.nodes || []).find((x) => x.id === id);
      return n && n.label || id;
    };
    if (score.complete) {
      setWon(true);
      if (playSound) playSound("correct");
      if (addToast) addToast(t("concept_space.challenge_win") || "\u{1F389} Every concept is on the right strand!", "success");
      if (onScoreUpdate) onScoreUpdate(points, "Strand Challenge Complete");
      if (onGameComplete) onGameComplete("strandChallenge3d", { score: points, correctPlacements: score.correct, totalItems: score.total, isPerfect: true, attempts: attemptsRef.current, bestScore: points, timeSeconds: elapsedRef.current, incorrectPlacements: [] });
    } else {
      if (playSound) playSound("reveal");
      if (addToast) addToast(summary, "info");
      if (onGameComplete) onGameComplete("strandChallenge3dAttempt", {
        score: points,
        correctPlacements: score.correct,
        totalItems: score.total,
        isPerfect: false,
        attempts: attemptsRef.current,
        bestScore: points,
        timeSeconds: elapsedRef.current,
        incorrectPlacements: Object.keys(score.results).filter((id) => score.results[id] !== "correct").map((id) => ({
          itemId: id,
          itemText: labelOf(id),
          placedCategoryLabel: placedRef.current[id] || "unplaced",
          correctCategoryId: challenge.answerKey[id],
          correctCategoryLabel: challenge.answerKey[id]
        }))
      });
    }
  };
  const requestHint = () => {
    const E = window.AlloModules && window.AlloModules.ConceptGraphEngine;
    if (!E || !E.buildStrandHintPrompt || !challenge || !lastScore || typeof window.callGemini !== "function") return;
    const badId = Object.keys(lastScore.results).find((id) => lastScore.results[id] !== "correct");
    if (!badId) return;
    const n = (challenge.graph.nodes || []).find((x) => x.id === badId);
    const prompt = E.buildStrandHintPrompt({
      itemLabel: n && n.label || badId,
      placedStrand: placedRef.current[badId] || null,
      strands: challenge.strands,
      topic: data?.main || title || ""
    });
    setHintLoading(true);
    Promise.resolve(window.callGemini(prompt)).then((res) => {
      const text = typeof res === "string" ? res : res && (res.text || res.output || res.response) || "";
      const clean = String(text).trim().slice(0, 400);
      if (clean) setHint({ label: n && n.label || badId, text: clean });
    }).catch(() => {
      if (addToast) addToast(t("concept_space.hint_failed") || "Could not fetch a hint right now.", "error");
    }).then(() => setHintLoading(false));
  };
  const handleArrange = () => {
    const E = window.AlloModules && window.AlloModules.ConceptGraphEngine;
    const CG3D = window.AlloModules && window.AlloModules.ConceptGraph3D;
    if (!E || !graphRef.current || typeof window.callGemini !== "function") return;
    setArranging(true);
    E.layoutWithGemini(graphRef.current, window.callGemini, { topic: data?.main || title || "" }).then((merged) => {
      graphRef.current = merged;
      if (persist && E.extractArrangement) {
        persist(E.extractArrangement(merged), "conceptSpace");
        setNonce((n) => n + 1);
      } else if (hostRef.current && CG3D) {
        try {
          if (handleRef.current && handleRef.current.destroy) handleRef.current.destroy();
        } catch (e) {
        }
        handleRef.current = CG3D.render(hostRef.current, merged, { t, autoRotate: false });
      }
    }).catch(() => {
      if (addToast) addToast(t("concept_map.view_3d_arrange_failed") || "AI arrange failed", "error");
    }).then(() => setArranging(false));
  };
  const handleFullscreen = () => {
    openConceptMap3D({
      generated: data,
      arrangement: data?.conceptSpace,
      onArrangementChange: persist ? ((arr) => {
        persist(arr, "conceptSpace");
        setNonce((n) => n + 1);
      }) : void 0,
      title: data?.main || title || "",
      t,
      addToast
    });
  };
  const constelNodes = React.useMemo(() => {
    try {
      const CG3D = window.AlloModules && window.AlloModules.ConceptGraph3D;
      if (!CG3D || !hasContent) return [];
      return (CG3D.buildScene(data || {}).nodes || []).map((n) => ({ id: n.id, label: n.label }));
    } catch (e) {
      return [];
    }
  }, [data, hasContent]);
  React.useEffect(() => {
    const H = handleRef.current;
    if (H && H.setConstellation) {
      try {
        H.setConstellation({ weights: constelRef.current, mode: constelMode });
      } catch (e) {
      }
    }
  }, [constelMode, constelWeights, nonce, ready]);
  const _constelApply = (weights, mode) => {
    const H = handleRef.current;
    if (H && H.setConstellation) {
      try {
        H.setConstellation({ weights, mode });
      } catch (e) {
      }
    }
  };
  const saveConstelLink = () => {
    const CG3D = window.AlloModules && window.AlloModules.ConceptGraph3D;
    if (!CG3D || !persist || !constelA || !constelB || constelA === constelB) return;
    const k = CG3D.pairKey(constelA, constelB);
    const prev = constelRef.current[k] || {};
    const next = { ...constelRef.current, [k]: { ...prev, w: constelW, why: constelWhy || prev.why || "" } };
    persist(next, "constellation");
    const mode = constelMode === "off" ? "mine" : constelMode;
    if (constelMode === "off") setConstelMode("mine");
    _constelApply(next, mode);
    setConstelWhy("");
    if (addToast) addToast(t("cg3d.constel_saved") || "\u2728 Link weighted \u2014 your constellation updated.", "success");
  };
  const aiRateConstelLink = () => {
    const CG3D = window.AlloModules && window.AlloModules.ConceptGraph3D;
    if (!CG3D || !persist || !constelA || !constelB || constelA === constelB || typeof window.callGemini !== "function" || constelBusy) return;
    const la = (constelNodes.find((n) => n.id === constelA) || {}).label || constelA;
    const lb = (constelNodes.find((n) => n.id === constelB) || {}).label || constelB;
    setConstelBusy(true);
    Promise.resolve(window.callGemini(CG3D.buildRelatednessPrompt(la, lb, data?.main || title || ""), true)).then((res) => {
      if (!artAliveRef.current) return;
      const parsed = CG3D.parseRelatedness(_gemText(res));
      if (!parsed) {
        if (addToast) addToast(t("cg3d.constel_ai_failed") || "Could not get an AI rating \u2014 try again.", "error");
        return;
      }
      const k = CG3D.pairKey(constelA, constelB);
      const prev = constelRef.current[k] || {};
      const next = { ...constelRef.current, [k]: { ...prev, ai: parsed.score, aiWhy: parsed.why } };
      persist(next, "constellation");
      const mode = constelMode === "off" ? "diff" : constelMode;
      if (constelMode === "off") setConstelMode("diff");
      _constelApply(next, mode);
      if (addToast) addToast((t("cg3d.constel_ai_rated") || "AI rating: {s}. {why}").replace("{s}", String(Math.round(parsed.score * 100) / 100)).replace("{why}", parsed.why || ""), "info");
    }).catch(() => {
      if (addToast) addToast(t("cg3d.constel_ai_failed") || "Could not get an AI rating \u2014 try again.", "error");
    }).then(() => {
      if (artAliveRef.current) setConstelBusy(false);
    });
  };
  const _gemText = (res) => typeof res === "string" ? res : res && (res.text || res.output || res.response) || "";
  const _asDataUrl = (s) => typeof s === "string" && s ? /^data:/i.test(s) ? s : "data:image/png;base64," + s : null;
  const _persistNodeArt = (id, art) => {
    const H = handleRef.current;
    if (H) {
      if (art && art.type === "image" && H.setNodeImage) H.setNodeImage(id, art.dataUrl);
      else if (art && art.type === "sculpture" && H.setNodeObject) H.setNodeObject(id, art.recipe);
      else if (!art && H.clearNodeArt) H.clearNodeArt(id);
    }
    if (persist) {
      const next = { ...artRef.current || {} };
      if (art) next[id] = art;
      else delete next[id];
      persist(next, "conceptArt");
    }
    if (selectedNodeRef.current && selectedNodeRef.current.id === id) {
      const meta = { ...selectedNodeRef.current, artType: art ? art.type : null };
      selectedNodeRef.current = meta;
      setSelectedNode(meta);
    }
  };
  const doSculptFromLabel = () => {
    const P3D = window.AlloModules && window.AlloModules.Prim3D;
    const cur = selectedNodeRef.current;
    if (!P3D || !cur || !persist || directBusy || typeof window.callGemini !== "function") return;
    setDirectBusy("generating");
    Promise.resolve(window.callGemini(P3D.buildRecipePrompt(cur.label), true)).then((res) => {
      if (!artAliveRef.current) return;
      const recipe = P3D.parseRecipe(_gemText(res));
      if (recipe) {
        recipe.name = cur.label;
        _persistNodeArt(cur.id, { type: "sculpture", recipe });
        if (addToast) addToast(t("concept_space.art_placed") || "\u2728 Placed! Refine it, or click another concept.", "success");
      } else if (addToast) addToast(t("concept_space.art_failed") || "Could not create that \u2014 try again.", "error");
    }).catch(() => {
      if (addToast && artAliveRef.current) addToast(t("concept_space.art_failed") || "Could not create that \u2014 try again.", "error");
    }).then(() => {
      if (artAliveRef.current) setDirectBusy(null);
    });
  };
  const handleArtGenerate = (finalPrompt) => {
    const cur = selectedNodeRef.current;
    if (!cur || !persist) return;
    const P3D = window.AlloModules && window.AlloModules.Prim3D;
    setDirectBusy("generating");
    setDirectEval(null);
    const finish = (art) => {
      if (!artAliveRef.current) return;
      if (art) {
        _persistNodeArt(cur.id, art);
        if (addToast) addToast(t("concept_space.art_placed") || "\u2728 Placed! Refine it, or click another concept.", "success");
        setDirectPrompt("");
      } else if (addToast) addToast(t("concept_space.art_failed") || "Could not create that \u2014 try again.", "error");
      setDirectBusy(null);
    };
    if (artType === "sculpture") {
      if (!P3D || typeof window.callGemini !== "function") {
        setDirectBusy(null);
        return;
      }
      Promise.resolve(window.callGemini(P3D.buildRecipePrompt(finalPrompt), true)).then((res) => {
        const r = P3D.parseRecipe(_gemText(res));
        finish(r ? { type: "sculpture", recipe: r } : null);
      }).catch(() => finish(null));
    } else {
      if (!canImagen) {
        setDirectBusy(null);
        if (addToast) addToast(t("concept_space.art_no_imagen") || "Image generation is unavailable here \u2014 try a sculpture.", "info");
        return;
      }
      callImagen("A vivid, memorable, slightly surreal illustration: " + finalPrompt + ". Single clear subject, bright colors, centered composition, storybook style, no text, no words.", 400).then((base64) => finish(_asDataUrl(base64) ? { type: "image", dataUrl: _asDataUrl(base64) } : null)).catch(() => finish(null));
    }
  };
  const handleArtSubmit = () => {
    const cur = selectedNodeRef.current;
    if (!cur || directBusy || typeof window.callGemini !== "function") return;
    const userPrompt = directPrompt.trim();
    if (!userPrompt) return;
    const MP = window.AlloModules && window.AlloModules.MemoryPalace;
    if (!MP || !MP.buildPromptEvalPrompt || !MP.parsePromptEval) {
      handleArtGenerate(userPrompt);
      return;
    }
    setDirectBusy("evaluating");
    setDirectEval(null);
    const prompt = MP.buildPromptEvalPrompt({ userPrompt, itemLabel: cur.label, mnemonic: "", topic: data?.main || title || "", mode: artType });
    Promise.resolve(window.callGemini(prompt, true)).then((res) => {
      if (!artAliveRef.current) return;
      const ev = MP.parsePromptEval(_gemText(res)) || { verdict: "ok", reason: "", enhancedPrompt: userPrompt };
      if (ev.verdict === "ok") handleArtGenerate(ev.enhancedPrompt || userPrompt);
      else {
        setDirectEval(ev);
        setDirectBusy(null);
      }
    }).catch(() => {
      if (artAliveRef.current) {
        setDirectBusy(null);
        handleArtGenerate(userPrompt);
      }
    });
  };
  const handleArtManualTweak = (kind) => {
    const cur = selectedNodeRef.current;
    if (!cur || !persist) return;
    const art = artRef.current && artRef.current[cur.id];
    if (!art || art.type !== "sculpture" || !art.recipe) return;
    const TINTS = ["#f87171", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa", "#f472b6", null];
    const rec = art.recipe;
    const next = { ...rec };
    if (kind === "bigger") next.scale = Math.min(5, (rec.scale || 1) * 1.25);
    else if (kind === "smaller") next.scale = Math.max(0.25, (rec.scale || 1) * 0.8);
    else if (kind === "rotate") next.rotY = ((rec.rotY || 0) + 45) % 360;
    else if (kind === "recolor") {
      const i = TINTS.indexOf(rec.tint || null);
      next.tint = TINTS[(i + 1) % TINTS.length];
    }
    _persistNodeArt(cur.id, { type: "sculpture", recipe: next });
  };
  const handleArtRefine = () => {
    const P3D = window.AlloModules && window.AlloModules.Prim3D;
    const cur = selectedNodeRef.current;
    if (!P3D || !cur || !persist || refineBusy || typeof window.callGemini !== "function") return;
    const art = artRef.current && artRef.current[cur.id];
    const instr = refinePrompt.trim();
    if (!art || art.type !== "sculpture" || !art.recipe || !instr) return;
    const rec = art.recipe;
    setRefineBusy(true);
    Promise.resolve(window.callGemini(P3D.buildRefinePrompt(rec, instr), true)).then((res) => {
      if (!artAliveRef.current) return;
      const newRec = P3D.parseRecipe(_gemText(res));
      if (newRec) {
        _persistNodeArt(cur.id, { type: "sculpture", recipe: { ...newRec, scale: rec.scale, rotY: rec.rotY, tint: rec.tint } });
        setRefinePrompt("");
        if (addToast) addToast(t("concept_space.refine_done") || "\u2728 Refined!", "success");
      } else if (addToast) addToast(t("concept_space.refine_failed") || "Could not refine \u2014 try rephrasing.", "error");
    }).catch(() => {
      if (addToast && artAliveRef.current) addToast(t("concept_space.refine_failed") || "Could not refine \u2014 try rephrasing.", "error");
    }).then(() => {
      if (artAliveRef.current) setRefineBusy(false);
    });
  };
  const handleArtClear = () => {
    const cur = selectedNodeRef.current;
    if (!cur || !persist) return;
    _persistNodeArt(cur.id, null);
    if (addToast) addToast(t("concept_space.art_removed") || "Removed.", "info");
  };
  const nodeArtType = selectedNode && selectedNode.artType || selectedNode && artRef.current[selectedNode.id] && artRef.current[selectedNode.id].type || null;
  return /* @__PURE__ */ React.createElement("div", { className: "max-w-6xl mx-auto" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between gap-2 mb-3 flex-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-slate-500" }, challenge ? t("concept_space.challenge_hint") || "\u{1F3AF} Click a fallen concept, then give it a strand (chips in its panel, or [ and ] keys). Check when ready." : t("concept_space.hint") || "Position carries meaning: left \u2192 right = sequence \xB7 higher = more abstract \xB7 depth = strand."), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, challenge ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-full tabular-nums" }, "\u23F1 ", fmtTime(elapsed), " \xB7 ", (t("concept_space.challenge_progress") || "{placed}/{total} placed").replace("{placed}", String(placedCount)).replace("{total}", String(challenge.targets.length))), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: checkChallenge,
      disabled: placedCount === 0,
      className: "flex items-center gap-1 bg-emerald-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    },
    "\u2714 ",
    t("concept_space.challenge_check") || "Check placements"
  ), lastScore && !lastScore.complete && typeof window.callGemini === "function" && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: requestHint,
      disabled: hintLoading,
      className: "flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-300 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-amber-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
      title: t("concept_space.hint_tooltip") || "Get a nudge about one misplaced concept \u2014 the answer is never given away"
    },
    "\u{1F4A1} ",
    hintLoading ? t("common.loading") || "Loading\u2026" : t("concept_space.hint_button") || "Hint"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: retryChallenge,
      className: "flex items-center gap-1 bg-white text-slate-600 border border-slate-300 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-slate-50 transition-colors"
    },
    "\u21BA ",
    t("concept_space.challenge_retry") || "Retry"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: exitChallenge,
      className: "flex items-center gap-1 bg-white text-slate-600 border border-slate-300 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-slate-50 transition-colors"
    },
    t("concept_space.challenge_exit") || "Exit challenge"
  )) : /* @__PURE__ */ React.createElement(React.Fragment, null, hasContent && challengeEligible && !failed && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => startChallenge(false),
      className: "flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm hover:shadow-md hover:scale-105 transition-all motion-safe:animate-[pulse_3s_ease-in-out_infinite]",
      title: t("concept_space.challenge_tooltip") || "Practice: every concept falls off its strand \u2014 put each one back where it belongs"
    },
    "\u{1F3AF} ",
    t("concept_space.challenge_play") || "Strand Challenge"
  ), hasContent && typeof window.callGemini === "function" && !failed && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleArrange,
      disabled: arranging,
      className: "flex items-center gap-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed",
      title: t("concept_space.arrange_tooltip") || "Ask the AI to score every concept on the sequence, abstraction, and strand axes, then re-project the space"
    },
    "\u2728 ",
    arranging ? t("concept_map.view_3d_arranging") || "Arranging\u2026" : t("concept_map.view_3d_arrange") || "Arrange by meaning"
  ), hasContent && persist && data?.conceptSpace && !failed && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        persist(null, "conceptSpace");
        setNonce((n) => n + 1);
      },
      className: "flex items-center gap-1 bg-white text-slate-600 border border-slate-300 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-slate-50 transition-colors",
      title: t("concept_space.reset_tooltip") || "Discard the saved arrangement and return to the default layout"
    },
    "\u21BA ",
    t("concept_space.reset") || "Reset arrangement"
  ), hasContent && persist && !failed && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setConstelOpen((o) => !o),
      "aria-pressed": constelOpen ? "true" : "false",
      className: `flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-colors border ${constelOpen ? "bg-slate-800 text-indigo-200 border-slate-800" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"}`,
      title: t("cg3d.constel_tooltip") || "Constellation: rate how strongly YOU think two concepts connect \u2014 your weights light up the links"
    },
    "\u{1F30C} ",
    t("cg3d.constel_toggle") || "Constellation"
  ), hasContent && !failed && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleFullscreen,
      className: "flex items-center gap-1 bg-white text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-indigo-50 transition-colors",
      title: t("concept_space.fullscreen_tooltip") || "Open this concept space full screen"
    },
    "\u26F6 ",
    t("concept_space.fullscreen") || "Fullscreen"
  )))), constelOpen && hasContent && persist && !failed && /* @__PURE__ */ React.createElement("div", { className: "mb-3 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 flex-wrap mb-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-indigo-300" }, "\u{1F30C} ", t("cg3d.constel_heading") || "Constellation \u2014 weight the connections yourself"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-0.5 bg-slate-800 rounded-full p-0.5 ml-auto", role: "group", "aria-label": t("cg3d.constel_mode_label") || "Constellation view mode" }, ["off", "mine", "ai", "diff"].map((m) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: m,
      onClick: () => setConstelMode(m),
      "aria-pressed": constelMode === m ? "true" : "false",
      className: `px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${constelMode === m ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-700"}`
    },
    m === "off" ? t("cg3d.constel_mode_off") || "Off" : m === "mine" ? t("cg3d.constel_mode_mine") || "My weights" : m === "ai" ? t("cg3d.constel_mode_ai") || "AI weights" : t("cg3d.constel_mode_diff") || "Compare"
  )))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 flex-wrap" }, /* @__PURE__ */ React.createElement(
    "select",
    {
      value: constelA,
      onChange: (e) => setConstelA(e.target.value),
      "aria-label": t("cg3d.constel_pick_a") || "First concept",
      className: "bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-slate-200 max-w-[180px]"
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, t("cg3d.constel_pick_a") || "First concept", "\u2026"),
    constelNodes.map((n) => /* @__PURE__ */ React.createElement("option", { key: n.id, value: n.id }, n.label))
  ), /* @__PURE__ */ React.createElement("span", { className: "text-slate-500 text-xs" }, "\u{1F517}"), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: constelB,
      onChange: (e) => setConstelB(e.target.value),
      "aria-label": t("cg3d.constel_pick_b") || "Second concept",
      className: "bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-slate-200 max-w-[180px]"
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, t("cg3d.constel_pick_b") || "Second concept", "\u2026"),
    constelNodes.filter((n) => n.id !== constelA).map((n) => /* @__PURE__ */ React.createElement("option", { key: n.id, value: n.id }, n.label))
  ), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-1.5 text-[11px] text-slate-400" }, t("cg3d.constel_weight") || "How related?", /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "range",
      min: "0",
      max: "1",
      step: "0.05",
      value: constelW,
      onChange: (e) => setConstelW(parseFloat(e.target.value)),
      "aria-label": t("cg3d.constel_weight_aria") || "Relatedness weight, 0 to 1",
      "aria-valuetext": `${Math.round(constelW * 100)}%`,
      className: "w-24 accent-indigo-500"
    }
  ), /* @__PURE__ */ React.createElement("span", { className: "tabular-nums font-bold text-indigo-300 w-9" }, Math.round(constelW * 100), "%"))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 flex-wrap mt-2" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      value: constelWhy,
      onChange: (e) => setConstelWhy(e.target.value),
      maxLength: 160,
      placeholder: t("cg3d.constel_why_ph") || "Why? One sentence you could defend from the source\u2026",
      "aria-label": t("cg3d.constel_why_aria") || "Justify your weight",
      className: "flex-1 min-w-[220px] bg-slate-800 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500"
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: saveConstelLink,
      disabled: !constelA || !constelB || constelA === constelB,
      className: "px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
    },
    "\u2B50 ",
    t("cg3d.constel_save") || "Set my weight"
  ), typeof window.callGemini === "function" && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: aiRateConstelLink,
      disabled: !constelA || !constelB || constelA === constelB || constelBusy,
      className: "px-3 py-1.5 rounded-full text-xs font-bold bg-slate-700 text-indigo-200 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed",
      title: t("cg3d.constel_ai_tooltip") || "Ask the AI to rate the same link, then Compare shows where you differ"
    },
    "\u2696 ",
    constelBusy ? t("cg3d.constel_ai_busy") || "Rating\u2026" : t("cg3d.constel_ai") || "AI rating"
  )), constelMode === "diff" && /* @__PURE__ */ React.createElement("div", { className: "text-[11px] text-slate-400 mt-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-indigo-300 font-bold" }, "\u25A0"), " ", t("cg3d.constel_diff_mine") || "you rated it stronger", " \xB7 ", /* @__PURE__ */ React.createElement("span", { className: "text-amber-400 font-bold" }, "\u25A0"), " ", t("cg3d.constel_diff_ai") || "the AI rated it stronger", " \xB7 ", /* @__PURE__ */ React.createElement("span", { className: "text-slate-200 font-bold" }, "\u25A0"), " ", t("cg3d.constel_diff_agree") || "you roughly agree"), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-500 italic mt-2" }, t("cg3d.constel_framing") || "Brightness shows how strongly YOU rated each link. Comparing with the AI shows where your mental maps differ \u2014 a window into weighted connections and semantic similarity (closest to spreading-activation models of memory), not literally \u201Chow neural networks work.\u201D")), hint && /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-2 mb-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm text-amber-900", role: "status", "aria-live": "polite" }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u{1F4A1}"), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("span", { className: "font-bold" }, (t("concept_space.hint_for") || "Thinking about \u201C{label}\u201D:").replace("{label}", hint.label)), " ", hint.text), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setHint(null),
      "aria-label": t("common.close") || "Close",
      className: "text-amber-700 hover:text-amber-900 font-bold px-1"
    },
    "\u2715"
  )), /* @__PURE__ */ React.createElement("div", { className: "relative rounded-2xl overflow-hidden border-2 border-slate-700 shadow-xl", style: { background: "#0b1020", height: "min(64vh, 560px)", minHeight: "380px" } }, !hasContent ? /* @__PURE__ */ React.createElement("div", { className: "h-full flex flex-col items-center justify-center gap-2 text-center p-8", role: "status" }, /* @__PURE__ */ React.createElement("div", { className: "text-3xl", "aria-hidden": "true" }, "\u{1F9CA}"), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-bold text-slate-200" }, t("concept_space.empty_title") || "Nothing to map yet"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-400 max-w-sm" }, t("concept_space.empty_body") || "Generate this organizer from a source text (or add sections in Edit text) and the concepts will appear here as an orbitable 3D space.")) : failed ? /* @__PURE__ */ React.createElement("div", { className: "p-6 text-slate-200 text-sm overflow-auto h-full", role: "status" }, /* @__PURE__ */ React.createElement("p", { className: "mb-3 text-amber-300" }, t("cg3d.load_error") || "The 3D library could not load. Showing the reading-order outline instead."), /* @__PURE__ */ React.createElement("ol", { className: "list-decimal pl-6 space-y-2" }, (Array.isArray(data?.branches) ? data.branches : []).map((b, bi) => /* @__PURE__ */ React.createElement("li", { key: bi }, /* @__PURE__ */ React.createElement("span", { className: "font-bold" }, b.title), Array.isArray(b.items) && b.items.length > 0 && /* @__PURE__ */ React.createElement("ul", { className: "list-disc pl-5 mt-1 space-y-0.5" }, b.items.map((it, ii) => /* @__PURE__ */ React.createElement("li", { key: ii }, typeof it === "object" ? it.text : it))))))) : /* @__PURE__ */ React.createElement("div", { ref: hostRef, className: "absolute inset-0" }), !challenge && persist && selectedNode && !failed && /* @__PURE__ */ React.createElement("div", { className: "absolute left-3 bottom-3 z-10 w-72 max-w-[85%] max-h-[80%] overflow-auto rounded-xl bg-white/95 backdrop-blur border border-fuchsia-300 shadow-xl p-3 text-slate-800", role: "group", "aria-label": t("concept_space.art_panel_aria") || "Concept art" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-1.5" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-extrabold text-fuchsia-700 truncate pr-2" }, "\u{1F3A8} ", selectedNode.label), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    setSelectedNode(null);
    selectedNodeRef.current = null;
  }, "aria-label": t("common.close") || "Close", className: "text-slate-400 hover:text-slate-700 font-bold text-sm leading-none" }, "\u2715")), nodeArtType ? /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] text-slate-500" }, nodeArtType === "sculpture" ? t("concept_space.art_has_sculpture") || "A sculpture floats above this concept." : t("concept_space.art_has_image") || "An image floats above this concept."), nodeArtType === "sculpture" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-1" }, /* @__PURE__ */ React.createElement("button", { onClick: () => handleArtManualTweak("bigger"), className: "px-2 py-1 rounded-full text-[11px] font-bold bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200 hover:bg-fuchsia-100" }, "\u{1F50D}+ ", t("memory_palace.refine_bigger") || "Bigger"), /* @__PURE__ */ React.createElement("button", { onClick: () => handleArtManualTweak("smaller"), className: "px-2 py-1 rounded-full text-[11px] font-bold bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200 hover:bg-fuchsia-100" }, "\u{1F50D}\u2212 ", t("memory_palace.refine_smaller") || "Smaller"), /* @__PURE__ */ React.createElement("button", { onClick: () => handleArtManualTweak("rotate"), className: "px-2 py-1 rounded-full text-[11px] font-bold bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200 hover:bg-fuchsia-100" }, "\u27F3 ", t("memory_palace.refine_rotate") || "Rotate"), /* @__PURE__ */ React.createElement("button", { onClick: () => handleArtManualTweak("recolor"), className: "px-2 py-1 rounded-full text-[11px] font-bold bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200 hover:bg-fuchsia-100" }, "\u{1F3A8} ", t("memory_palace.refine_recolor") || "Recolor")), /* @__PURE__ */ React.createElement("form", { onSubmit: (e) => {
    e.preventDefault();
    handleArtRefine();
  }, className: "flex gap-1" }, /* @__PURE__ */ React.createElement("input", { value: refinePrompt, onChange: (e) => setRefinePrompt(e.target.value), disabled: refineBusy, placeholder: t("concept_space.refine_placeholder") || "Tell the AI what to change\u2026", "aria-label": t("concept_space.refine_placeholder") || "Tell the AI what to change", className: "flex-1 min-w-0 text-xs px-2 py-1.5 rounded-lg border border-fuchsia-200 focus:ring-2 focus:ring-fuchsia-400" }), /* @__PURE__ */ React.createElement("button", { type: "submit", disabled: !refinePrompt.trim() || refineBusy, className: "px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-fuchsia-600 text-white hover:bg-fuchsia-700 disabled:opacity-50" }, "\u2728"))), /* @__PURE__ */ React.createElement("button", { onClick: handleArtClear, className: "w-full px-2 py-1.5 rounded-lg text-[11px] font-bold bg-white text-rose-600 border border-rose-200 hover:bg-rose-50" }, "\u{1F5D1} ", t("concept_space.art_remove") || "Remove art")) : /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, directBusy ? /* @__PURE__ */ React.createElement("div", { className: "text-xs text-fuchsia-700 font-bold py-2 text-center", role: "status" }, directBusy === "evaluating" ? t("concept_space.art_checking") || "\u2026 Checking your idea" : t("concept_space.art_creating") || "\u2026 Creating") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { onClick: doSculptFromLabel, disabled: typeof window.callGemini !== "function", className: "w-full px-2 py-1.5 rounded-lg text-[11px] font-bold bg-fuchsia-600 text-white hover:bg-fuchsia-700 disabled:opacity-50" }, "\u{1F9CA} ", t("concept_space.art_sculpt_auto") || "Sculpt from this concept"), /* @__PURE__ */ React.createElement("div", { className: "text-[11px] text-slate-500 text-center" }, t("concept_space.art_or_direct") || "or describe your own:"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-1" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setArtType("sculpture"), className: `flex-1 px-2 py-1 rounded-full text-[11px] font-bold border ${artType === "sculpture" ? "bg-fuchsia-600 text-white border-fuchsia-600" : "bg-white text-fuchsia-700 border-fuchsia-300"}` }, "\u{1F9CA} ", t("memory_palace.direct_sculpture") || "Sculpture"), /* @__PURE__ */ React.createElement("button", { onClick: () => setArtType("image"), disabled: !canImagen, title: !canImagen ? t("concept_space.art_no_imagen") || "Image generation is unavailable here \u2014 try a sculpture." : void 0, className: `flex-1 px-2 py-1 rounded-full text-[11px] font-bold border disabled:opacity-40 ${artType === "image" ? "bg-fuchsia-600 text-white border-fuchsia-600" : "bg-white text-fuchsia-700 border-fuchsia-300"}` }, "\u{1F5BC} ", t("memory_palace.direct_image") || "Image")), directEval && directEval.verdict === "reject" && /* @__PURE__ */ React.createElement("div", { className: "text-[11px] bg-amber-50 border border-amber-200 rounded-lg p-1.5 text-amber-900" }, /* @__PURE__ */ React.createElement("span", { className: "font-bold" }, t("memory_palace.direct_rejected") || "Let\u2019s adjust:"), " ", directEval.reason), directEval && directEval.verdict === "enhance" && /* @__PURE__ */ React.createElement("div", { className: "text-[11px] bg-fuchsia-50 border border-fuchsia-200 rounded-lg p-1.5" }, directEval.reason && /* @__PURE__ */ React.createElement("div", { className: "mb-1 text-fuchsia-900" }, directEval.reason), directEval.enhancedPrompt && /* @__PURE__ */ React.createElement("div", { className: "italic text-fuchsia-800 mb-1" }, "\u201C", directEval.enhancedPrompt, "\u201D"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-1" }, /* @__PURE__ */ React.createElement("button", { onClick: () => handleArtGenerate(directEval.enhancedPrompt || directPrompt), className: "flex-1 px-2 py-1 rounded-full text-[11px] font-bold bg-fuchsia-600 text-white hover:bg-fuchsia-700" }, "\u2728 ", t("memory_palace.direct_use_enhanced") || "Use the improved version"), /* @__PURE__ */ React.createElement("button", { onClick: () => handleArtGenerate(directPrompt), className: "px-2 py-1 rounded-full text-[11px] font-bold bg-white text-fuchsia-700 border border-fuchsia-300 hover:bg-fuchsia-50" }, t("memory_palace.direct_use_mine") || "Use mine"))), (!directEval || directEval.verdict === "reject") && /* @__PURE__ */ React.createElement("form", { onSubmit: (e) => {
    e.preventDefault();
    handleArtSubmit();
  }, className: "flex gap-1" }, /* @__PURE__ */ React.createElement("input", { value: directPrompt, onChange: (e) => {
    setDirectPrompt(e.target.value);
    if (directEval) setDirectEval(null);
  }, placeholder: t("concept_space.art_prompt_placeholder") || "e.g. a glowing brain with gears", "aria-label": t("concept_space.art_prompt_placeholder") || "Describe the art", className: "flex-1 min-w-0 text-xs px-2 py-1.5 rounded-lg border border-fuchsia-200 focus:ring-2 focus:ring-fuchsia-400" }), /* @__PURE__ */ React.createElement("button", { type: "submit", disabled: !directPrompt.trim(), className: "px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-fuchsia-600 text-white hover:bg-fuchsia-700 disabled:opacity-50" }, "\u2728")))))), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500 italic text-center mt-3" }, t("concept_space.caption") || "Drag to orbit \xB7 scroll to zoom \xB7 click a concept for details. Drag a concept to place it on its strand plane \u2014 position is saved with the resource."));
};
const _MP_STAMPS = [
  { id: "star", e: "\u2B50", label: "Star" },
  { id: "heart", e: "\u2764\uFE0F", label: "Heart" },
  { id: "bolt", e: "\u26A1", label: "Lightning bolt" },
  { id: "flame", e: "\u{1F525}", label: "Flame" },
  { id: "rainbow", e: "\u{1F308}", label: "Rainbow" },
  { id: "dragon", e: "\u{1F409}", label: "Dragon" },
  { id: "trex", e: "\u{1F996}", label: "T-rex" },
  { id: "rocket", e: "\u{1F680}", label: "Rocket" },
  { id: "crown", e: "\u{1F451}", label: "Crown" },
  { id: "music", e: "\u{1F3B5}", label: "Music note" },
  { id: "ice", e: "\u{1F9CA}", label: "Ice cube" },
  { id: "volcano", e: "\u{1F30B}", label: "Volcano" }
];
const _MP_STAMP_THEMES = {
  gallery: { top: "#1e1b4b", bottom: "#0f172a", border: "rgba(129,140,248,0.55)" },
  pasture: { top: "#f0fdf4", bottom: "#dcfce7", border: "rgba(22,163,74,0.55)" },
  space: { top: "#0b1026", bottom: "#020617", border: "rgba(148,163,184,0.6)" }
};
const _mpStampImage = (emoji, theme) => {
  try {
    const c = document.createElement("canvas");
    c.setAttribute("role", "img");
    c.setAttribute("aria-label", "Generated memory palace illustration stamp");
    c.width = 320;
    c.height = 240;
    const g = c.getContext("2d");
    if (!g) return null;
    const pal = _MP_STAMP_THEMES[theme] || _MP_STAMP_THEMES.gallery;
    const grad = g.createLinearGradient(0, 0, 0, 240);
    grad.addColorStop(0, pal.top);
    grad.addColorStop(1, pal.bottom);
    g.fillStyle = grad;
    g.fillRect(0, 0, 320, 240);
    g.strokeStyle = pal.border;
    g.lineWidth = 10;
    g.strokeRect(5, 5, 310, 230);
    g.font = "150px sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(String(emoji || "\u2B50"), 160, 128);
    return c.toDataURL("image/png");
  } catch (e) {
    return null;
  }
};
const _mpEsc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
const MemoryPalaceView = ({ data, title, t, addToast, onPersist, callImagen, playSound, onScoreUpdate, onGameComplete, isTeacherMode, armed, onRecallArm, onRecallClose }) => {
  const hasContent = Array.isArray(data?.branches) && data.branches.length > 0;
  const hostRef = React.useRef(null);
  const handleRef = React.useRef(null);
  const palaceRef = React.useRef(null);
  const [ready, setReady] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [glbReady, setGlbReady] = React.useState(false);
  const [furnishing, setFurnishing] = React.useState(null);
  const [nonce, setNonce] = React.useState(0);
  const [current, setCurrent] = React.useState(null);
  const currentRef = React.useRef(null);
  const mpRef = React.useRef(null);
  mpRef.current = data?.memoryPalace || {};
  const aliveRef = React.useRef(true);
  const finishedRef = React.useRef(false);
  const recallTimersRef = React.useRef([]);
  const genCancelRef = React.useRef(false);
  React.useEffect(() => () => {
    aliveRef.current = false;
    recallTimersRef.current.forEach((id) => {
      try {
        clearTimeout(id);
      } catch (e) {
      }
    });
    recallTimersRef.current = [];
  }, []);
  const _laterRecall = (fn) => {
    const id = setTimeout(() => {
      recallTimersRef.current = recallTimersRef.current.filter((x) => x !== id);
      fn();
    }, 700);
    recallTimersRef.current.push(id);
    return id;
  };
  const persist = typeof onPersist === "function" ? onPersist : null;
  const canImagen = typeof callImagen === "function";
  const images = data?.memoryPalace?.images || {};
  const depths = data?.memoryPalace?.depths || {};
  const [reliefOn, setReliefOn] = React.useState(false);
  const imageCount = Object.keys(images).length;
  const [recall, setRecall] = React.useState(null);
  const recallResultsRef = React.useRef({});
  const attemptsTotalRef = React.useRef(0);
  const startedByArmRef = React.useRef(false);
  const [recallBank, setRecallBank] = React.useState([]);
  const bankRef = React.useRef([]);
  bankRef.current = recallBank;
  const [answered, setAnswered] = React.useState(0);
  const [recallHint, setRecallHint] = React.useState(null);
  const [canReveal, setCanReveal] = React.useState(false);
  const [typedAnswer, setTypedAnswer] = React.useState("");
  const [wrongFlash, setWrongFlash] = React.useState(false);
  const [finished, setFinished] = React.useState(null);
  const [elapsed, setElapsed] = React.useState(0);
  const elapsedRef = React.useRef(0);
  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const totalItems = React.useMemo(() => (Array.isArray(data?.branches) ? data.branches : []).reduce((s, b) => s + (b.items || []).filter((it) => typeof it === "object" ? it.text : it).length, 0), [data]);
  const recallEligible = totalItems >= 4;
  const dataKey = JSON.stringify({
    m: data?.main,
    b: (Array.isArray(data?.branches) ? data.branches : []).map((b) => ({ t: b.title, i: b.items, mn: b.mnemonics })),
    img: data?.memoryPalace?.generatedAt || 0
  });
  const nowISO = React.useMemo(() => (/* @__PURE__ */ new Date()).toISOString(), []);
  const masteryKey = JSON.stringify(data?.memoryPalace?.mastery || {});
  const dueInfo = React.useMemo(() => {
    const MP = window.AlloModules && window.AlloModules.MemoryPalace;
    if (!MP || !MP.dueLoci || !hasContent) return null;
    try {
      return MP.dueLoci(MP.buildPalace(data || {}), data?.memoryPalace?.mastery || {}, nowISO);
    } catch (e) {
      return null;
    }
  }, [dataKey, nowISO, masteryKey]);
  const decorKey = JSON.stringify({ o: data?.memoryPalace?.objects || {}, s: data?.memoryPalace?.stamps || {} });
  const decorLabels = React.useMemo(() => {
    const out = {};
    const objs = data?.memoryPalace?.objects || {};
    const stamps = data?.memoryPalace?.stamps || {};
    const GLB = window.AlloModules && window.AlloModules.GlbLibrary;
    let catalog = [];
    try {
      catalog = GLB && GLB.listCatalog ? GLB.listCatalog() : [];
    } catch (e) {
    }
    Object.keys(objs).forEach((id) => {
      const rec = objs[id];
      if (!rec) return;
      if (rec.glbItem) {
        const item = catalog.filter((c) => c.id === rec.glbItem)[0];
        out[id] = t("memory_palace.collect_" + rec.glbItem) || item && item.label || rec.glbItem;
      } else if (rec.presetId) {
        out[id] = t("memory_palace.preset_" + rec.presetId) || rec.name || (t("memory_palace.decor_sculpture") || "3D decoration");
      } else {
        out[id] = rec.name || (t("memory_palace.decor_sculpture") || "3D decoration");
      }
    });
    Object.keys(stamps).forEach((id) => {
      const lbl = t("memory_palace.stamp_" + stamps[id]) || stamps[id];
      out[id] = out[id] ? out[id] + ", " + lbl : lbl;
    });
    return out;
  }, [decorKey, glbReady]);
  React.useEffect(() => {
    let alive = true;
    _voPalaceEnsure().then((ok) => {
      if (!alive) return;
      if (!ok) {
        setFailed(true);
        return;
      }
      _voPrim3dEnsure().then(() => {
        if (alive) setReady(true);
      });
      _voGlbEnsure().then((g) => {
        if (alive) setGlbReady(!!g);
      });
    });
    return () => {
      alive = false;
    };
  }, []);
  React.useEffect(() => {
    if (!ready || failed || !hostRef.current || !hasContent) return void 0;
    const MP = window.AlloModules && window.AlloModules.MemoryPalace;
    if (!MP) {
      setFailed(true);
      return void 0;
    }
    palaceRef.current = MP.buildPalace(data || {});
    handleRef.current = MP.render(hostRef.current, data, {
      t,
      theme: data?.memoryPalace?.theme || "gallery",
      images: data?.memoryPalace?.images || {},
      depths: data?.memoryPalace?.depths || {},
      objects: data?.memoryPalace?.objects || {},
      decor: decorLabels,
      // screen-reader names for placed decorations (a11y parity)
      mastery: recall ? void 0 : data?.memoryPalace?.mastery || {},
      // recall-driven dimming (study mode only)
      recall: !!recall,
      // In-VR recall bank: the palace spawns the remaining answers as ray-
      // selectable chips; a pick routes through the SAME submitRecallAnswer
      // as a 2D chip click (refs-based, so the once-mounted closure stays live).
      vrRecall: recall ? {
        getBank: () => (bankRef.current || []).map((c) => ({ id: c.id, label: c.label })),
        onPick: (locusId, chip) => {
          if (chip) submitRecallAnswer(chip.label, chip.id);
        }
      } : void 0,
      startAt: recall ? recall.startAt : void 0,
      onLocusChange: (locus, idx, total) => {
        if (!locus) return;
        currentRef.current = locus;
        setCurrent({ id: locus.id, label: locus.label, mnemonic: locus.mnemonic, idx, total: total - 1, entry: locus.id === "__entry" });
        const r = recallResultsRef.current[locus.id];
        setRecallHint(r && r.attempts >= 2 && locus.mnemonic && !r.correct && !r.revealed ? locus.mnemonic : null);
        setCanReveal(!!(r && r.attempts >= 3 && !r.correct && !r.revealed));
        setTypedAnswer("");
      }
    });
    return () => {
      try {
        if (handleRef.current && handleRef.current.destroy) handleRef.current.destroy();
      } catch (e) {
      }
      handleRef.current = null;
    };
  }, [ready, failed, dataKey, nonce, recall, data?.memoryPalace?.theme || "gallery"]);
  React.useEffect(() => {
    try {
      if (handleRef.current && handleRef.current.setDecor) handleRef.current.setDecor(decorLabels);
    } catch (e) {
    }
  }, [decorKey, glbReady, ready]);
  const paletteTheme = data?.memoryPalace?.theme || "gallery";
  const handleSetTheme = (thm) => {
    if (!persist || thm === paletteTheme) return;
    persist({ ...mpRef.current || {}, theme: thm }, "memoryPalace");
  };
  React.useEffect(() => {
    if (!recall || finished) return void 0;
    const iv = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, 1e3);
    return () => clearInterval(iv);
  }, [recall, finished]);
  const _resetRecallRun = () => {
    recallResultsRef.current = {};
    attemptsTotalRef.current = 0;
    finishedRef.current = false;
    recallTimersRef.current.forEach((id) => {
      try {
        clearTimeout(id);
      } catch (e) {
      }
    });
    recallTimersRef.current = [];
    elapsedRef.current = 0;
    setElapsed(0);
    setAnswered(0);
    setFinished(null);
    setRecallHint(null);
    setCanReveal(false);
    setTypedAnswer("");
    setWrongFlash(false);
  };
  const startRecall = (mode, viaArm) => {
    const MP = window.AlloModules && window.AlloModules.MemoryPalace;
    if (!MP || recall) return;
    const palace = MP.buildPalace(data || {});
    const targets = palace.route.filter((id) => id !== "__entry");
    if (targets.length < 2) {
      if (addToast) addToast(t("memory_palace.recall_empty") || "Not enough loci to play yet.", "info");
      return;
    }
    _resetRecallRun();
    const seed = Date.now() % 2147483647 || 7;
    setRecallBank(MP.buildRecallBank(palace, seed));
    startedByArmRef.current = viaArm === true;
    setRecall({ mode: mode === "type" ? "type" : "bank", seed, startAt: targets[0] });
    if (addToast) addToast(t("memory_palace.recall_start") || "\u{1F9E0} The labels are covered. Walk the palace and recall what lives at each locus!", "info");
    if (isTeacherMode && viaArm !== true && typeof onRecallArm === "function") {
      try {
        onRecallArm();
      } catch (e) {
      }
    }
  };
  const exitRecall = () => {
    recallTimersRef.current.forEach((id) => {
      try {
        clearTimeout(id);
      } catch (e) {
      }
    });
    recallTimersRef.current = [];
    setRecall(null);
    _resetRecallRun();
    setRecallBank([]);
    startedByArmRef.current = false;
    if (typeof onRecallClose === "function") {
      try {
        onRecallClose();
      } catch (e) {
      }
    }
  };
  const retryRecall = () => {
    const MP = window.AlloModules && window.AlloModules.MemoryPalace;
    if (!MP || !recall || !palaceRef.current) return;
    const mode = recall.mode;
    const palace = palaceRef.current;
    const targets = palace.route.filter((id) => id !== "__entry");
    _resetRecallRun();
    const seed = Date.now() % 2147483647 || 11;
    setRecallBank(MP.buildRecallBank(palace, seed));
    setRecall({ mode, seed, startAt: targets[0] });
  };
  React.useEffect(() => {
    if (armed && !isTeacherMode && !recall && ready && !failed && hasContent) startRecall("bank", true);
    else if (!armed && !isTeacherMode && recall && startedByArmRef.current) {
      startedByArmRef.current = false;
      exitRecall();
    }
  }, [armed, isTeacherMode, ready, failed, recall, hasContent]);
  const advanceRecall = () => {
    if (!palaceRef.current || !handleRef.current) return;
    const route = palaceRef.current.route;
    const res = recallResultsRef.current;
    const curId = currentRef.current ? currentRef.current.id : route[0];
    const curIdx = Math.max(0, route.indexOf(curId));
    let nextIdx = -1;
    for (let s = 0; s <= route.length; s++) {
      const i = (curIdx + s) % route.length;
      const id = route[i];
      if (id === "__entry") continue;
      const r = res[id];
      if (!r || !r.correct && !r.revealed) {
        nextIdx = i;
        break;
      }
    }
    if (nextIdx < 0) {
      finishRecall();
      return;
    }
    handleRef.current.goTo(nextIdx);
  };
  const finishRecall = () => {
    const MP = window.AlloModules && window.AlloModules.MemoryPalace;
    if (!MP || !palaceRef.current || finishedRef.current) return;
    finishedRef.current = true;
    const targets = palaceRef.current.route.filter((id) => id !== "__entry");
    const res = recallResultsRef.current;
    targets.forEach((id) => {
      if (!res[id]) res[id] = { attempts: 0, correct: false, revealed: true };
    });
    const score = MP.scoreRecall(res);
    setFinished(score);
    const labelOf = (id) => {
      const l = (palaceRef.current.loci || []).find((x) => x.id === id);
      return l && l.label || id;
    };
    const misses = targets.filter((id) => !(res[id].correct && res[id].attempts <= 1)).map((id) => ({
      itemId: id,
      itemText: labelOf(id),
      attempts: res[id].attempts,
      revealed: !!res[id].revealed,
      placedCategoryLabel: res[id].revealed ? "revealed" : "eventual",
      correctCategoryLabel: labelOf(id)
    }));
    if (score.perfect) {
      if (playSound) playSound("correct");
      if (addToast) addToast(t("memory_palace.recall_perfect") || "\u{1F3DB}\u2728 Perfect walk! Every locus recalled on the first try.", "success");
      if (onScoreUpdate) onScoreUpdate(score.points, "Memory Palace Recall");
    } else {
      if (playSound) playSound("reveal");
      if (addToast) addToast((t("memory_palace.recall_summary") || "Recalled {ok} of {total} ({first} on the first try).").replace("{ok}", String(score.firstTry + score.eventual)).replace("{total}", String(score.total)).replace("{first}", String(score.firstTry)), "info");
    }
    if (onGameComplete) onGameComplete(score.perfect ? "palaceRecall" : "palaceRecallAttempt", {
      score: score.points,
      correctPlacements: score.firstTry + score.eventual,
      totalItems: score.total,
      isPerfect: score.perfect,
      attempts: attemptsTotalRef.current,
      bestScore: score.points,
      timeSeconds: elapsedRef.current,
      incorrectPlacements: misses
    });
    if (persist && MP.updateMastery && aliveRef.current) {
      try {
        persist({ ...mpRef.current || {}, mastery: MP.updateMastery(mpRef.current && mpRef.current.mastery || {}, res, (/* @__PURE__ */ new Date()).toISOString()) }, "memoryPalace");
      } catch (e) {
      }
    }
  };
  const submitRecallAnswer = (given, chipId) => {
    const MP = window.AlloModules && window.AlloModules.MemoryPalace;
    const cur = currentRef.current;
    if (!MP || !recall || !cur || cur.id === "__entry" || finished) return;
    const res = recallResultsRef.current;
    const r = res[cur.id] || (res[cur.id] = { attempts: 0, correct: false, revealed: false });
    if (r.correct || r.revealed) return;
    r.attempts += 1;
    attemptsTotalRef.current += 1;
    const ok = chipId ? chipId === cur.id || MP.matchAnswer(cur.label, given) : MP.matchAnswer(cur.label, given);
    if (ok) {
      r.correct = true;
      if (playSound) playSound("correct");
      if (handleRef.current) {
        handleRef.current.revealLocus(cur.id);
        handleRef.current.setLocusStatus(cur.id, "correct");
      }
      setRecallBank((bank) => {
        const i = bank.findIndex((c) => c.id === cur.id);
        const j = i >= 0 ? i : bank.findIndex((c) => MP.matchAnswer(cur.label, c.label));
        if (j < 0) return bank;
        const nb = bank.slice();
        nb.splice(j, 1);
        return nb;
      });
      setRecallHint(null);
      setCanReveal(false);
      setTypedAnswer("");
      setAnswered((n) => n + 1);
      _laterRecall(() => advanceRecall());
    } else {
      if (playSound) playSound("reveal");
      if (handleRef.current) handleRef.current.setLocusStatus(cur.id, "incorrect");
      setWrongFlash(true);
      setTimeout(() => {
        setWrongFlash(false);
        const rr = recallResultsRef.current[cur.id];
        if (handleRef.current && rr && !rr.correct && !rr.revealed) handleRef.current.setLocusStatus(cur.id, null);
      }, 700);
      if (r.attempts >= 2 && cur.mnemonic) setRecallHint(cur.mnemonic);
      if (r.attempts >= 3) setCanReveal(true);
    }
  };
  const revealCurrent = () => {
    const cur = currentRef.current;
    if (!cur || !recall || finished || cur.id === "__entry") return;
    const res = recallResultsRef.current;
    const r = res[cur.id] || (res[cur.id] = { attempts: 0, correct: false, revealed: false });
    if (r.correct || r.revealed) return;
    r.revealed = true;
    if (handleRef.current) {
      handleRef.current.revealLocus(cur.id);
      handleRef.current.setLocusStatus(cur.id, "incorrect");
    }
    setRecallBank((bank) => {
      const i = bank.findIndex((c) => c.id === cur.id);
      if (i < 0) return bank;
      const nb = bank.slice();
      nb.splice(i, 1);
      return nb;
    });
    setRecallHint(null);
    setCanReveal(false);
    setTypedAnswer("");
    setAnswered((n) => n + 1);
    setTimeout(() => advanceRecall(), 700);
  };
  const objects3d = data?.memoryPalace?.objects || {};
  const objectCount = Object.keys(objects3d).length;
  const [sculpting, setSculpting] = React.useState(null);
  const [decorMode, setDecorMode] = React.useState(false);
  const [customizeOpen, setCustomizeOpen] = React.useState(false);
  const handlePrintStudySheet = () => {
    const MP = window.AlloModules && window.AlloModules.MemoryPalace;
    if (!MP || !hasContent) return;
    let palace;
    try {
      palace = MP.buildPalace(data || {});
    } catch (e) {
      return;
    }
    const loci = palace.loci || [];
    const byRoom = {};
    (palace.route || []).forEach((id) => {
      const l = loci.find((x) => x.id === id);
      if (!l || l.id === "__entry") return;
      (byRoom[l.roomIdx] = byRoom[l.roomIdx] || []).push(l);
    });
    let n = 0;
    const roomsHtml = (palace.rooms || []).map((room, ri) => {
      const items = byRoom[ri] || [];
      if (ri === 0 || !items.length) return "";
      const rows = items.map((l) => {
        n += 1;
        const dl = decorLabels[l.id];
        return `<li><span class="num">${n}</span><div class="body"><div class="fact">${_mpEsc(l.label)}</div>` + (l.mnemonic ? `<div class="mnem"><b>${_mpEsc(t("memory_palace.picture_this") || "Picture this:")}</b> ${_mpEsc(l.mnemonic)}</div>` : "") + (dl ? `<div class="decor">${_mpEsc(t("memory_palace.sr_decoration") || "Decoration")}: ${_mpEsc(dl)}</div>` : "") + `</div></li>`;
      }).join("");
      return `<section class="room"><h2 style="border-color:${_mpEsc(room.color)}">${_mpEsc(room.label)}</h2><ol>${rows}</ol></section>`;
    }).join("");
    const sheetTitle = _mpEsc(palace.title || data?.main || title || "Memory Palace");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${sheetTitle}</title><style>body{font-family:system-ui,-apple-system,sans-serif;color:#1e293b;max-width:760px;margin:0 auto;padding:32px 24px;line-height:1.5;}h1{font-size:24px;margin:0 0 4px;}.sub{color:#64748b;font-size:13px;margin:0 0 22px;}.room{page-break-inside:avoid;margin-bottom:20px;}.room h2{font-size:16px;border-left:5px solid #6366f1;padding-left:10px;margin:0 0 8px;}ol{list-style:none;padding:0;margin:0;}li{display:flex;gap:12px;padding:8px 0;border-bottom:1px solid #eef2f7;page-break-inside:avoid;}.num{flex:0 0 28px;height:28px;border-radius:50%;background:#6366f1;color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:13px;}.fact{font-weight:700;}.mnem{font-size:13px;color:#4338ca;margin-top:2px;}.decor{font-size:12px;color:#475569;margin-top:2px;}.method{margin-top:24px;padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;color:#475569;}.no-print{text-align:center;margin-bottom:22px;}button{background:#4f46e5;color:#fff;border:none;padding:10px 20px;font-size:15px;font-weight:700;border-radius:6px;cursor:pointer;}@media print{.no-print{display:none;}}</style></head><body><div class="no-print"><button onclick="window.print()">${_mpEsc(t("common.print") || "Print")}</button></div><h1>${sheetTitle}</h1><p class="sub">${_mpEsc(t("memory_palace.sheet_subtitle") || "Memory palace study sheet \u2014 walk the route in order and picture each image vividly.")}</p>` + roomsHtml + `<div class="method">${_mpEsc(t("memory_palace.caption") || "")}</div></body></html>`;
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    } else if (addToast) addToast(t("memory_palace.sheet_popup") || "Allow pop-ups to open the printable study sheet.", "error");
  };
  const handlePlaceCollectible = (item) => {
    const cur = currentRef.current;
    if (!item || !cur || cur.id === "__entry" || !persist) return;
    _persistObject(cur.id, { glbItem: item.id });
    if (addToast) addToast(t("memory_palace.decorate_placed") || "\u{1F381} Placed! Saved with this palace.", "success");
  };
  const handlePlacePreset = (presetId) => {
    const P3D = window.AlloModules && window.AlloModules.Prim3D;
    const cur = currentRef.current;
    if (!P3D || typeof P3D.getPreset !== "function" || !cur || cur.id === "__entry" || !persist) return;
    const recipe = P3D.getPreset(presetId);
    if (!recipe) {
      if (addToast) addToast(t("memory_palace.decorate_failed") || "Could not place that here \u2014 try another.", "error");
      return;
    }
    recipe.presetId = presetId;
    _persistObject(cur.id, recipe);
    if (addToast) addToast(t("memory_palace.decorate_placed") || "\u{1F381} Placed! Saved with this palace.", "success");
  };
  const handlePlaceStamp = (stamp) => {
    const cur = currentRef.current;
    if (!cur || cur.id === "__entry" || !persist) return;
    const img = _mpStampImage(stamp.e, paletteTheme);
    if (!img) {
      if (addToast) addToast(t("memory_palace.decorate_failed") || "Could not place that here \u2014 try another.", "error");
      return;
    }
    if (handleRef.current && handleRef.current.setLocusImage) handleRef.current.setLocusImage(cur.id, img);
    const nx = { ...mpRef.current || {}, images: { ...mpRef.current && mpRef.current.images || {}, [cur.id]: img } };
    if (nx.depths && nx.depths[cur.id]) {
      const d = { ...nx.depths };
      delete d[cur.id];
      nx.depths = d;
    }
    nx.stamps = { ...mpRef.current && mpRef.current.stamps || {}, [cur.id]: stamp.id };
    persist(nx, "memoryPalace");
    if (addToast) addToast(t("memory_palace.decorate_placed") || "\u{1F381} Placed! Saved with this palace.", "success");
  };
  const handleDecorRemove = () => {
    const cur = currentRef.current;
    if (!cur || cur.id === "__entry" || !persist) return;
    const keep = { ...mpRef.current || {} };
    ["images", "depths", "objects", "stamps"].forEach((k) => {
      if (keep[k] && keep[k][cur.id] !== void 0) {
        const o = { ...keep[k] };
        delete o[cur.id];
        keep[k] = o;
      }
    });
    persist(keep, "memoryPalace");
    if (handleRef.current && handleRef.current.clearLocus) handleRef.current.clearLocus(cur.id);
    if (addToast) addToast(t("memory_palace.decorate_removed") || "Removed \u2014 the locus is back to its numbered card.", "info");
  };
  const [directMode, setDirectMode] = React.useState(false);
  const [directType, setDirectType] = React.useState("image");
  const [directPrompt, setDirectPrompt] = React.useState("");
  const [directEval, setDirectEval] = React.useState(null);
  const [directBusy, setDirectBusy] = React.useState(null);
  const [refinePrompt, setRefinePrompt] = React.useState("");
  const [refineBusy, setRefineBusy] = React.useState(false);
  const [voiceSupported, setVoiceSupported] = React.useState(false);
  const [voiceListening, setVoiceListening] = React.useState(false);
  const [voiceHeard, setVoiceHeard] = React.useState("");
  const voiceCtlRef = React.useRef(null);
  React.useEffect(() => {
    try {
      if (window.SpeechRecognition || window.webkitSpeechRecognition) setVoiceSupported(true);
    } catch (e) {
    }
    return () => {
      try {
        if (voiceCtlRef.current) {
          voiceCtlRef.current.stop();
          voiceCtlRef.current = null;
        }
      } catch (e) {
      }
    };
  }, []);
  const handleVoiceDirect = (transcript) => {
    const text = (transcript || "").trim();
    if (!text) return;
    setDirectPrompt(text);
    handleDirectSubmit(text);
  };
  const toggleVoiceDirect = () => {
    if (voiceListening) {
      try {
        if (voiceCtlRef.current) voiceCtlRef.current.stop();
      } catch (e) {
      }
      setVoiceListening(false);
      return;
    }
    _voVoiceEnsure().then((ok) => {
      const V = window.AlloFlowVoice || window.AlloModules && window.AlloModules.Voice;
      if (!ok || !V || !V.initWebSpeechCapture) {
        if (addToast) addToast(t("memory_palace.voice_unavailable") || "Voice input is unavailable in this browser.", "info");
        return;
      }
      try {
        voiceCtlRef.current = V.initWebSpeechCapture({
          lang: "en-US",
          interimResults: true,
          continuous: false,
          onTranscript: (txt, isFinal) => {
            setVoiceHeard(txt);
            if (isFinal) {
              setVoiceListening(false);
              handleVoiceDirect(txt);
            }
          },
          onEnd: () => setVoiceListening(false)
        });
        if (voiceCtlRef.current && voiceCtlRef.current.start() !== false) {
          setVoiceListening(true);
          setVoiceHeard("");
        }
      } catch (e) {
        setVoiceListening(false);
      }
    });
  };
  const handleSculpt = () => {
    const MP = window.AlloModules && window.AlloModules.MemoryPalace;
    const P3D = window.AlloModules && window.AlloModules.Prim3D;
    if (!MP || !P3D || !persist || sculpting || furnishing || typeof window.callGemini !== "function") return;
    const palace = MP.buildPalace(data || {});
    const targets = palace.loci.filter((l) => l.id !== "__entry" && !objects3d[l.id]);
    if (!targets.length) {
      if (addToast) addToast(t("memory_palace.sculpt_done_already") || "Every locus already has a sculpture.", "info");
      return;
    }
    genCancelRef.current = false;
    setSculpting({ done: 0, total: targets.length });
    let done = 0, failures = 0;
    const step = (i) => {
      if (i >= targets.length || genCancelRef.current || !aliveRef.current) {
        setSculpting(null);
        if (addToast && aliveRef.current) {
          if (genCancelRef.current) addToast((t("memory_palace.gen_stopped") || "Stopped \u2014 {ok} made so far.").replace("{ok}", String(done)), "info");
          else if (failures) addToast((t("memory_palace.sculpt_partial") || "Sculpted {ok} loci; {fail} could not be designed.").replace("{ok}", String(done)).replace("{fail}", String(failures)), "info");
          else addToast(t("memory_palace.sculpt_done") || "\u{1F5FF} Sculptures placed! Walk the route to meet them.", "success");
        }
        return;
      }
      const l = targets[i];
      const subject = l.mnemonic || l.label;
      Promise.resolve(window.callGemini(P3D.buildRecipePrompt(subject), true)).then((res) => {
        if (!aliveRef.current) return;
        const text = typeof res === "string" ? res : res && (res.text || res.output || res.response) || "";
        const recipe = P3D.parseRecipe(text);
        if (recipe) {
          done += 1;
          if (handleRef.current && handleRef.current.setLocusObject) handleRef.current.setLocusObject(l.id, recipe);
          persist({ ...mpRef.current || {}, objects: { ...mpRef.current && mpRef.current.objects || {}, [l.id]: recipe } }, "memoryPalace");
        } else failures += 1;
      }).catch(() => {
        failures += 1;
      }).then(() => {
        if (aliveRef.current) {
          setSculpting({ done: i + 1, total: targets.length });
          step(i + 1);
        }
      });
    };
    step(0);
  };
  const handleDirectSubmit = (promptOverride) => {
    const MP = window.AlloModules && window.AlloModules.MemoryPalace;
    const cur = currentRef.current;
    if (!MP || !MP.buildPromptEvalPrompt || !cur || cur.id === "__entry" || directBusy || typeof window.callGemini !== "function") return;
    const userPrompt = typeof promptOverride === "string" && promptOverride.trim() ? promptOverride.trim() : directPrompt.trim();
    if (!userPrompt) return;
    setDirectBusy("evaluating");
    setDirectEval(null);
    const prompt = MP.buildPromptEvalPrompt({ userPrompt, itemLabel: cur.label, mnemonic: cur.mnemonic, topic: data?.main || title || "", mode: directType });
    Promise.resolve(window.callGemini(prompt, true)).then((res) => {
      if (!aliveRef.current) return;
      const text = typeof res === "string" ? res : res && (res.text || res.output || res.response) || "";
      const ev = MP.parsePromptEval(text) || { verdict: "ok", reason: "", enhancedPrompt: userPrompt };
      if (ev.verdict === "ok") {
        handleDirectGenerate(ev.enhancedPrompt || userPrompt);
      } else {
        setDirectEval(ev);
        setDirectBusy(null);
      }
    }).catch(() => {
      if (aliveRef.current) {
        setDirectBusy(null);
        if (addToast) addToast(t("memory_palace.direct_eval_failed") || "Could not check the prompt \u2014 try again.", "error");
      }
    });
  };
  const handleDirectGenerate = (finalPrompt) => {
    const MP = window.AlloModules && window.AlloModules.MemoryPalace;
    const P3D = window.AlloModules && window.AlloModules.Prim3D;
    const cur = currentRef.current;
    if (!MP || !cur || cur.id === "__entry" || !persist) return;
    setDirectBusy("generating");
    setDirectEval(null);
    const done = (store, key, val, depthVal) => {
      if (!aliveRef.current) return;
      if (val) {
        if (handleRef.current) {
          if (key === "images" && depthVal && handleRef.current.setLocusRelief) handleRef.current.setLocusRelief(cur.id, val, depthVal);
          else if (key === "images" && handleRef.current.setLocusImage) handleRef.current.setLocusImage(cur.id, val);
          else if (key !== "images" && handleRef.current.setLocusObject) handleRef.current.setLocusObject(cur.id, val);
        }
        const nx = { ...mpRef.current || {}, [store]: { ...mpRef.current && mpRef.current[store] || {}, [cur.id]: val } };
        if (key === "images" && depthVal) nx.depths = { ...mpRef.current && mpRef.current.depths || {}, [cur.id]: depthVal };
        if (key === "images" && nx.stamps && nx.stamps[cur.id]) {
          const s = { ...nx.stamps };
          delete s[cur.id];
          nx.stamps = s;
        }
        persist(nx, "memoryPalace");
        if (addToast) addToast(t("memory_palace.direct_placed") || "\u2728 Placed at this locus! Walk on and direct the next.", "success");
        setDirectPrompt("");
      } else if (addToast) addToast(t("memory_palace.direct_gen_failed") || "Generation failed \u2014 try a different prompt.", "error");
      setDirectBusy(null);
    };
    if (directType === "sculpture") {
      if (!P3D || typeof window.callGemini !== "function") {
        setDirectBusy(null);
        return;
      }
      Promise.resolve(window.callGemini(P3D.buildRecipePrompt(finalPrompt), true)).then((res) => {
        const text = typeof res === "string" ? res : res && (res.text || res.output || res.response) || "";
        done("objects", "objects", P3D.parseRecipe(text));
      }).catch(() => done("objects", "objects", null));
    } else {
      if (!canImagen) {
        setDirectBusy(null);
        return;
      }
      callImagen("A vivid, memorable, slightly surreal illustration: " + finalPrompt + ". Single clear subject, bright colors, centered composition, storybook style, no text, no words.", 400).then((base64) => {
        if (base64 && reliefOn && typeof MP.buildDepthPrompt === "function") {
          return callImagen(MP.buildDepthPrompt(finalPrompt), 400).catch(() => null).then((d64) => done("images", "images", base64, d64 || null));
        }
        done("images", "images", base64);
      }).catch(() => done("images", "images", null));
    }
  };
  const _persistObject = (id, recipe) => {
    if (handleRef.current && handleRef.current.replaceLocusObject) handleRef.current.replaceLocusObject(id, recipe);
    persist({ ...mpRef.current || {}, objects: { ...mpRef.current && mpRef.current.objects || {}, [id]: recipe } }, "memoryPalace");
  };
  const handleManualTweak = (kind) => {
    const cur = currentRef.current;
    if (!cur || cur.id === "__entry" || !persist) return;
    const rec = mpRef.current && mpRef.current.objects && mpRef.current.objects[cur.id];
    if (!rec) return;
    const TINTS = ["#f87171", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa", "#f472b6", null];
    const next = { ...rec };
    if (kind === "bigger") next.scale = Math.min(5, (rec.scale || 1) * 1.25);
    else if (kind === "smaller") next.scale = Math.max(0.25, (rec.scale || 1) * 0.8);
    else if (kind === "rotate") next.rotY = ((rec.rotY || 0) + 45) % 360;
    else if (kind === "recolor") {
      const i = TINTS.indexOf(rec.tint || null);
      next.tint = TINTS[(i + 1) % TINTS.length];
    }
    _persistObject(cur.id, next);
  };
  const handleAiRefine = () => {
    const MP = window.AlloModules && window.AlloModules.MemoryPalace;
    const P3D = window.AlloModules && window.AlloModules.Prim3D;
    const cur = currentRef.current;
    if (!MP || !P3D || !cur || cur.id === "__entry" || !persist || refineBusy || typeof window.callGemini !== "function") return;
    const rec = mpRef.current && mpRef.current.objects && mpRef.current.objects[cur.id];
    const instr = refinePrompt.trim();
    if (!rec || !instr || rec.glbItem) return;
    setRefineBusy(true);
    Promise.resolve(window.callGemini(MP.buildRefinePrompt(rec, instr), true)).then((res) => {
      if (!aliveRef.current) return;
      const text = typeof res === "string" ? res : res && (res.text || res.output || res.response) || "";
      const newRec = P3D.parseRecipe(text);
      if (newRec) {
        _persistObject(cur.id, { ...newRec, scale: rec.scale, rotY: rec.rotY, tint: rec.tint });
        setRefinePrompt("");
        if (addToast) addToast(t("memory_palace.refine_done") || "\u2728 Refined!", "success");
      } else if (addToast) addToast(t("memory_palace.refine_failed") || "Could not refine \u2014 try rephrasing.", "error");
    }).catch(() => {
      if (addToast) addToast(t("memory_palace.refine_failed") || "Could not refine \u2014 try rephrasing.", "error");
    }).then(() => {
      if (aliveRef.current) setRefineBusy(false);
    });
  };
  const handleFurnish = () => {
    const MP = window.AlloModules && window.AlloModules.MemoryPalace;
    if (!MP || !canImagen || !persist || furnishing || sculpting) return;
    const palace = MP.buildPalace(data || {});
    const wantRelief = reliefOn && typeof MP.buildDepthPrompt === "function";
    const targets = palace.loci.filter((l) => l.id !== "__entry" && (!images[l.id] || wantRelief && !depths[l.id]));
    if (!targets.length) {
      if (addToast) addToast(t("memory_palace.furnish_done_already") || "Every locus already has an image.", "info");
      return;
    }
    genCancelRef.current = false;
    setFurnishing({ done: 0, total: targets.length });
    let done = 0, failures = 0;
    const step = (i) => {
      if (i >= targets.length || genCancelRef.current || !aliveRef.current) {
        setFurnishing(null);
        if (addToast && aliveRef.current) {
          if (genCancelRef.current) addToast((t("memory_palace.gen_stopped") || "Stopped \u2014 {ok} made so far.").replace("{ok}", String(done)), "info");
          else if (failures) addToast((t("memory_palace.furnish_partial") || "Furnished {ok} loci; {fail} could not be generated.").replace("{ok}", String(done)).replace("{fail}", String(failures)), "info");
          else addToast(t("memory_palace.furnish_done") || "\u{1F5BC} Palace furnished! Walk the route to lock the images in.", "success");
        }
        return;
      }
      const l = targets[i];
      const subject = l.mnemonic || l.label;
      const haveImg = mpRef.current && mpRef.current.images && mpRef.current.images[l.id] || null;
      const finishWith = (base64, depthB64) => {
        if (haveImg && !depthB64) {
          failures += 1;
          return;
        }
        done += 1;
        if (handleRef.current) {
          if (depthB64 && handleRef.current.setLocusRelief) handleRef.current.setLocusRelief(l.id, base64, depthB64);
          else if (!haveImg && handleRef.current.setLocusImage) handleRef.current.setLocusImage(l.id, base64);
        }
        const nx = { ...mpRef.current || {}, images: { ...mpRef.current && mpRef.current.images || {}, [l.id]: base64 } };
        if (depthB64) nx.depths = { ...mpRef.current && mpRef.current.depths || {}, [l.id]: depthB64 };
        if (nx.stamps && nx.stamps[l.id]) {
          const s = { ...nx.stamps };
          delete s[l.id];
          nx.stamps = s;
        }
        persist(nx, "memoryPalace");
      };
      const colorP = haveImg ? Promise.resolve(haveImg) : callImagen("A vivid, memorable, slightly surreal illustration: " + subject + ". Single clear subject, bright colors, centered composition, storybook style, no text, no words.", 400);
      colorP.then((base64) => {
        if (!aliveRef.current || !base64) {
          if (!base64) failures += 1;
          return;
        }
        if (wantRelief) {
          return callImagen(MP.buildDepthPrompt(subject), 400).catch(() => null).then((d64) => {
            if (aliveRef.current) finishWith(base64, d64 || null);
          });
        }
        finishWith(base64, null);
      }).catch(() => {
        failures += 1;
      }).then(() => {
        if (aliveRef.current) {
          setFurnishing({ done: i + 1, total: targets.length });
          step(i + 1);
        }
      });
    };
    step(0);
  };
  return /* @__PURE__ */ React.createElement("div", { className: "max-w-6xl mx-auto" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between gap-2 mb-3 flex-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-slate-500" }, recall ? t("memory_palace.recall_hint") || "\u{1F9E0} The labels are covered \u2014 the image is your cue. Recall what lives at each locus; after two misses the mnemonic appears." : t("memory_palace.hint") || "A memory palace works through repetition: walk the route, picture each mnemonic vividly, then walk it again from memory."), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, recall ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-full tabular-nums" }, "\u23F1 ", fmtTime(elapsed), " \xB7 ", (t("memory_palace.recall_progress") || "{done}/{total} recalled").replace("{done}", String(answered)).replace("{total}", String((palaceRef.current?.route?.length || 1) - 1))), finished && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: retryRecall,
      className: "flex items-center gap-1 bg-white text-slate-600 border border-slate-300 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-slate-50 transition-colors"
    },
    "\u21BA ",
    t("memory_palace.recall_retry") || "Walk it again"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: exitRecall,
      className: "flex items-center gap-1 bg-white text-slate-600 border border-slate-300 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-slate-50 transition-colors"
    },
    t("memory_palace.recall_exit") || "Exit recall"
  )) : /* @__PURE__ */ React.createElement(React.Fragment, null, hasContent && !failed && recallEligible && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => startRecall("bank", false),
      disabled: !!furnishing || !!sculpting,
      className: "flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm hover:shadow-md hover:scale-105 transition-all motion-safe:animate-[pulse_3s_ease-in-out_infinite] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
      title: t("memory_palace.recall_tooltip") || "Practice: the labels are covered \u2014 walk the palace and recall what lives at each locus"
    },
    "\u{1F9E0} ",
    t("memory_palace.recall_play") || "Recall walk"
  ), hasContent && !failed && recallEligible && isTeacherMode && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => startRecall("type", false),
      disabled: !!furnishing || !!sculpting,
      className: "flex items-center gap-1 bg-white text-amber-700 border border-amber-300 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-amber-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
      title: t("memory_palace.recall_expert_tooltip") || "Expert mode: type each answer instead of picking from the bank (stronger retrieval practice; forgiving spelling)"
    },
    "\u2328 ",
    t("memory_palace.recall_expert") || "Expert recall"
  ), hasContent && !failed && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handlePrintStudySheet,
      className: "flex items-center gap-1 bg-white text-slate-700 border border-slate-300 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-slate-50 transition-colors",
      title: t("memory_palace.sheet_tooltip") || "Open a printable study sheet: the route, loci and mnemonics in walking order"
    },
    "\u{1F4C4} ",
    t("memory_palace.sheet") || "Study sheet"
  ), hasContent && !failed && persist && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setCustomizeOpen((o) => !o),
      "aria-expanded": customizeOpen ? "true" : "false",
      className: `flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-colors border ${customizeOpen ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-indigo-700 border-indigo-300 hover:bg-indigo-50"}`,
      title: t("memory_palace.customize_tooltip") || "Decorate the palace: AI images, sculptures, built-in decorations and relief"
    },
    "\u{1F3A8} ",
    t("memory_palace.customize") || "Customize",
    " ",
    /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, customizeOpen ? "\u25B2" : "\u25BC")
  ), (customizeOpen || furnishing || sculpting) && /* @__PURE__ */ React.createElement(React.Fragment, null, hasContent && !failed && persist && typeof window.callGemini === "function" && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        setDirectMode((d) => !d);
        setDirectEval(null);
      },
      className: `flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-colors border ${directMode ? "bg-fuchsia-600 text-white border-fuchsia-600" : "bg-white text-fuchsia-700 border-fuchsia-300 hover:bg-fuchsia-50"}`,
      title: t("memory_palace.direct_tooltip") || "Direct the AI yourself: write the prompt for each locus and the AI checks it before creating"
    },
    "\u270D\uFE0F ",
    t("memory_palace.direct_toggle") || "Direct the AI"
  ), hasContent && !failed && persist && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setDecorMode((d) => !d),
      "aria-pressed": decorMode ? "true" : "false",
      className: `flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-colors border ${decorMode ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50"}`,
      title: t("memory_palace.decorate_tooltip") || "Decorate loci yourself with built-in 3D objects and stamps \u2014 instant, no AI credits needed"
    },
    "\u{1F381} ",
    t("memory_palace.decorate_toggle") || "Decorate"
  ), hasContent && !failed && canImagen && persist && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setReliefOn((r) => !r),
      "aria-pressed": reliefOn ? "true" : "false",
      className: `flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-colors border ${reliefOn ? "bg-stone-700 text-white border-stone-700" : "bg-white text-stone-700 border-stone-300 hover:bg-stone-50"}`,
      title: t("memory_palace.relief_tooltip") || "Relief mode: also generate a depth map per locus so furnished images become 3D bas-reliefs (two images per locus \u2014 uses more image credits and save space)"
    },
    "\u{1F5FF} ",
    t("memory_palace.relief_toggle") || "Relief"
  ), hasContent && !failed && canImagen && persist && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleFurnish,
      disabled: !!furnishing || !!sculpting,
      className: "flex items-center gap-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed",
      title: t("memory_palace.furnish_tooltip") || "Generate one AI illustration per locus from its mnemonic (uses image credits; saved with the resource)"
    },
    "\u{1F5BC} ",
    furnishing ? (t("memory_palace.furnishing") || "Furnishing {done}/{total}\u2026").replace("{done}", String(furnishing.done)).replace("{total}", String(furnishing.total)) : t("memory_palace.furnish") || "Furnish with AI images"
  ), hasContent && !failed && persist && typeof window.callGemini === "function" && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleSculpt,
      disabled: !!sculpting || !!furnishing,
      className: "flex items-center gap-1 bg-gradient-to-r from-slate-600 to-slate-800 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed",
      title: t("memory_palace.sculpt_tooltip") || "AI designs a small primitive-block sculpture of each mnemonic and places it beside the frame (saved with the resource)"
    },
    "\u{1F5FF} ",
    sculpting ? (t("memory_palace.sculpting") || "Sculpting {done}/{total}\u2026").replace("{done}", String(sculpting.done)).replace("{total}", String(sculpting.total)) : t("memory_palace.sculpt") || "Sculpt 3D objects"
  )), hasContent && !failed && persist && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-0.5 bg-slate-100 rounded-full p-0.5 border border-slate-200", role: "group", "aria-label": t("memory_palace.theme_label") || "Palace setting" }, (window.AlloModules && window.AlloModules.MemoryPalace && window.AlloModules.MemoryPalace.THEME_KEYS || ["gallery", "pasture", "space"]).map((thm) => {
    const on = paletteTheme === thm;
    const icon = thm === "gallery" ? "\u{1F3DB}" : thm === "pasture" ? "\u{1F33F}" : "\u{1FA90}";
    const label = thm === "gallery" ? t("memory_palace.theme_gallery") || "Gallery" : thm === "pasture" ? t("memory_palace.theme_pasture") || "Pasture" : t("memory_palace.theme_space") || "Space";
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: thm,
        onClick: () => handleSetTheme(thm),
        "aria-pressed": on ? "true" : "false",
        title: label,
        className: `px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${on ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-200"}`
      },
      icon,
      " ",
      label
    );
  })), (furnishing || sculpting) && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        genCancelRef.current = true;
      },
      className: "flex items-center gap-1 bg-white text-red-600 border border-red-300 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-red-50 transition-colors",
      title: t("memory_palace.gen_stop_tooltip") || "Stop generating \u2014 keep what has been made so far"
    },
    "\u23F9 ",
    t("memory_palace.gen_stop") || "Stop"
  ), hasContent && !failed && persist && (imageCount > 0 || objectCount > 0) && !furnishing && !sculpting && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        const keep = { ...mpRef.current || {} };
        delete keep.images;
        delete keep.objects;
        delete keep.depths;
        delete keep.stamps;
        delete keep.generatedAt;
        persist(Object.keys(keep).length ? keep : null, "memoryPalace");
        setNonce((n) => n + 1);
      },
      className: "flex items-center gap-1 bg-white text-slate-600 border border-slate-300 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-slate-50 transition-colors",
      title: t("memory_palace.clear_generated_tooltip") || "Remove the generated images and sculptures from this palace"
    },
    "\u21BA ",
    t("memory_palace.clear_generated") || "Clear generated art"
  )))), !recall && dueInfo && dueInfo.dueCount > 0 && /* @__PURE__ */ React.createElement("div", { className: "mb-3 flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5", role: "status" }, /* @__PURE__ */ React.createElement("div", { className: "text-sm text-amber-900" }, /* @__PURE__ */ React.createElement("span", { className: "font-bold" }, "\u{1F501} ", (t("memory_palace.review_due") || "{count} loci are ready for review").replace("{count}", String(dueInfo.dueCount))), " ", /* @__PURE__ */ React.createElement("span", { className: "text-amber-800" }, t("memory_palace.review_due_why") || "\u2014 walk the palace again to strengthen the ones fading from memory.")), recallEligible && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => startRecall("bank", false),
      className: "flex-shrink-0 flex items-center gap-1 bg-amber-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm hover:bg-amber-700 transition-colors"
    },
    "\u{1F501} ",
    t("memory_palace.review_now") || "Review now"
  )), /* @__PURE__ */ React.createElement("div", { className: "relative rounded-2xl overflow-hidden border-2 border-slate-700 shadow-xl", style: { background: "#0b1020", height: "min(64vh, 560px)", minHeight: "380px" } }, !hasContent ? /* @__PURE__ */ React.createElement("div", { className: "h-full flex flex-col items-center justify-center gap-2 text-center p-8", role: "status" }, /* @__PURE__ */ React.createElement("div", { className: "text-3xl", "aria-hidden": "true" }, "\u{1F3DB}"), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-bold text-slate-200" }, t("memory_palace.empty_title") || "No palace to walk yet"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-400 max-w-sm" }, t("memory_palace.empty_body") || "Generate this organizer from a source text and the facts will become rooms and loci you can walk through.")) : /* @__PURE__ */ React.createElement("div", { ref: hostRef, className: "absolute inset-0" })), !recall && !directMode && current && !current.entry && /* @__PURE__ */ React.createElement("div", { className: "mt-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-bold text-indigo-700 mb-0.5" }, (t("memory_palace.locus_of") || "Locus {idx} of {total}").replace("{idx}", String(current.idx)).replace("{total}", String(current.total)), " \u2014 ", current.label), current.mnemonic && /* @__PURE__ */ React.createElement("div", { className: "text-sm text-indigo-900" }, /* @__PURE__ */ React.createElement("span", { className: "font-bold" }, t("memory_palace.picture_this") || "Picture this:"), " ", current.mnemonic)), directMode && !recall && hasContent && !failed && /* @__PURE__ */ React.createElement("div", { className: "mt-3 bg-fuchsia-50 border border-fuchsia-200 rounded-xl px-4 py-3" }, !current || current.entry ? /* @__PURE__ */ React.createElement("div", { className: "text-sm text-fuchsia-900" }, t("memory_palace.direct_at_entry") || "\u270D\uFE0F Walk to a locus (\u25B6 or WASD), then direct the AI to create its image or sculpture.") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-bold text-fuchsia-800 mb-1" }, (t("memory_palace.direct_for") || "Direct the AI for: {label}").replace("{label}", current.label)), current.mnemonic && /* @__PURE__ */ React.createElement("div", { className: "text-xs text-fuchsia-700 italic mb-2" }, t("memory_palace.picture_this") || "Picture this:", " ", current.mnemonic), objects3d[current.id] && /* @__PURE__ */ React.createElement("div", { className: "mb-3 pb-3 border-b border-fuchsia-200" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-bold text-fuchsia-800 mb-1.5" }, t("memory_palace.refine_title") || "Refine this sculpture"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-2" }, /* @__PURE__ */ React.createElement("button", { onClick: () => handleManualTweak("bigger"), className: "px-2.5 py-1 rounded-full text-xs font-bold bg-white text-fuchsia-700 border border-fuchsia-300 hover:bg-fuchsia-100" }, "\u{1F50D}+ ", t("memory_palace.refine_bigger") || "Bigger"), /* @__PURE__ */ React.createElement("button", { onClick: () => handleManualTweak("smaller"), className: "px-2.5 py-1 rounded-full text-xs font-bold bg-white text-fuchsia-700 border border-fuchsia-300 hover:bg-fuchsia-100" }, "\u{1F50D}\u2212 ", t("memory_palace.refine_smaller") || "Smaller"), /* @__PURE__ */ React.createElement("button", { onClick: () => handleManualTweak("rotate"), className: "px-2.5 py-1 rounded-full text-xs font-bold bg-white text-fuchsia-700 border border-fuchsia-300 hover:bg-fuchsia-100" }, "\u27F3 ", t("memory_palace.refine_rotate") || "Rotate"), /* @__PURE__ */ React.createElement("button", { onClick: () => handleManualTweak("recolor"), className: "px-2.5 py-1 rounded-full text-xs font-bold bg-white text-fuchsia-700 border border-fuchsia-300 hover:bg-fuchsia-100" }, "\u{1F3A8} ", t("memory_palace.refine_recolor") || "Recolor")), !objects3d[current.id].glbItem && /* @__PURE__ */ React.createElement("form", { onSubmit: (e) => {
    e.preventDefault();
    handleAiRefine();
  }, className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      value: refinePrompt,
      onChange: (e) => setRefinePrompt(e.target.value),
      placeholder: t("memory_palace.refine_placeholder") || "Tell the AI what to change\u2026 (e.g. add a red hat)",
      "aria-label": t("memory_palace.refine_placeholder") || "Tell the AI what to change",
      className: "flex-1 text-sm p-2 rounded-lg border border-fuchsia-300 focus:ring-2 focus:ring-fuchsia-400 bg-white"
    }
  ), /* @__PURE__ */ React.createElement("button", { type: "submit", disabled: !refinePrompt.trim() || refineBusy, className: "px-3 py-2 rounded-lg text-xs font-bold bg-fuchsia-600 text-white hover:bg-fuchsia-700 disabled:opacity-50 disabled:cursor-not-allowed" }, refineBusy ? t("memory_palace.direct_creating") || "Creating\u2026" : "\u2728 " + (t("memory_palace.refine_apply") || "Refine")))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-fuchsia-800" }, t("memory_palace.direct_make") || "Make:"), /* @__PURE__ */ React.createElement("button", { onClick: () => setDirectType("image"), className: `px-2.5 py-1 rounded-full text-xs font-bold border ${directType === "image" ? "bg-fuchsia-600 text-white border-fuchsia-600" : "bg-white text-fuchsia-700 border-fuchsia-300"}` }, "\u{1F5BC} ", t("memory_palace.direct_image") || "Image"), /* @__PURE__ */ React.createElement("button", { onClick: () => setDirectType("sculpture"), className: `px-2.5 py-1 rounded-full text-xs font-bold border ${directType === "sculpture" ? "bg-fuchsia-600 text-white border-fuchsia-600" : "bg-white text-fuchsia-700 border-fuchsia-300"}` }, "\u{1F5FF} ", t("memory_palace.direct_sculpture") || "Sculpture")), directEval && directEval.verdict === "reject" && /* @__PURE__ */ React.createElement("div", { className: "mb-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2", role: "status", "aria-live": "polite" }, /* @__PURE__ */ React.createElement("span", { className: "font-bold" }, t("memory_palace.direct_rejected") || "Let\u2019s adjust:"), " ", directEval.reason), directEval && directEval.verdict === "enhance" && /* @__PURE__ */ React.createElement("div", { className: "mb-2 text-sm text-fuchsia-900 bg-white border border-fuchsia-200 rounded-lg px-3 py-2", role: "status", "aria-live": "polite" }, directEval.reason && /* @__PURE__ */ React.createElement("div", { className: "mb-1" }, directEval.reason), directEval.enhancedPrompt && /* @__PURE__ */ React.createElement("div", { className: "italic text-fuchsia-800 mb-2" }, "\u201C", directEval.enhancedPrompt, "\u201D"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 flex-wrap" }, /* @__PURE__ */ React.createElement("button", { onClick: () => handleDirectGenerate(directEval.enhancedPrompt || directPrompt), disabled: !!directBusy, className: "px-3 py-1.5 rounded-full text-xs font-bold bg-fuchsia-600 text-white hover:bg-fuchsia-700 disabled:opacity-50" }, "\u2728 ", t("memory_palace.direct_use_enhanced") || "Use the improved version"), /* @__PURE__ */ React.createElement("button", { onClick: () => handleDirectGenerate(directPrompt), disabled: !!directBusy, className: "px-3 py-1.5 rounded-full text-xs font-bold bg-white text-fuchsia-700 border border-fuchsia-300 hover:bg-fuchsia-50 disabled:opacity-50" }, t("memory_palace.direct_use_mine") || "Use mine as-is"))), (!directEval || directEval.verdict === "reject") && /* @__PURE__ */ React.createElement("form", { onSubmit: (e) => {
    e.preventDefault();
    handleDirectSubmit();
  } }, /* @__PURE__ */ React.createElement(
    "textarea",
    {
      value: directPrompt,
      onChange: (e) => {
        setDirectPrompt(e.target.value);
        if (directEval) setDirectEval(null);
      },
      placeholder: t("memory_palace.direct_placeholder") || "Describe what the AI should create here\u2026",
      "aria-label": t("memory_palace.direct_placeholder") || "Describe what the AI should create here",
      rows: 2,
      className: "w-full text-sm p-2 rounded-lg border border-fuchsia-300 focus:ring-2 focus:ring-fuchsia-400 bg-white"
    }
  ), /* @__PURE__ */ React.createElement("div", { className: "mt-2 flex items-center gap-2 flex-wrap" }, /* @__PURE__ */ React.createElement("button", { type: "submit", disabled: !directPrompt.trim() || !!directBusy, className: "px-4 py-2 rounded-lg text-xs font-bold bg-fuchsia-600 text-white hover:bg-fuchsia-700 disabled:opacity-50 disabled:cursor-not-allowed" }, directBusy === "evaluating" ? t("memory_palace.direct_checking") || "Checking\u2026" : directBusy === "generating" ? t("memory_palace.direct_creating") || "Creating\u2026" : t("memory_palace.direct_submit") || "Check & create"), voiceSupported && /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: toggleVoiceDirect,
      disabled: !!directBusy,
      "aria-pressed": voiceListening ? "true" : "false",
      title: t("memory_palace.voice_direct_title") || "Speak your prompt for this locus, hands-free",
      className: `px-3 py-2 rounded-lg text-xs font-bold transition-colors ${voiceListening ? "bg-rose-600 text-white animate-pulse motion-reduce:animate-none" : "bg-white text-fuchsia-700 border border-fuchsia-300 hover:bg-fuchsia-50"}`
    },
    voiceListening ? "\u{1F534} " + (t("memory_palace.voice_listening") || "Listening\u2026") : "\u{1F3A4} " + (t("memory_palace.voice_direct") || "Speak")
  ), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-fuchsia-600" }, t("memory_palace.direct_note") || "The AI checks your prompt fits the fact and is school-appropriate before creating."), voiceHeard && /* @__PURE__ */ React.createElement("span", { className: "w-full text-xs text-fuchsia-500 italic" }, "\u201C", voiceHeard, "\u201D"))))), decorMode && !recall && hasContent && !failed && /* @__PURE__ */ React.createElement("div", { className: "mt-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3" }, !current || current.entry ? /* @__PURE__ */ React.createElement("div", { className: "text-sm text-emerald-900" }, t("memory_palace.decorate_at_entry") || "\u{1F381} Walk to a locus (\u25B6 or WASD), then pick a decoration for it.") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-bold text-emerald-800 mb-0.5" }, (t("memory_palace.decorate_for") || "Decorate: {label}").replace("{label}", current.label)), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-emerald-700 mb-2" }, t("memory_palace.decorate_note") || "Built-in decorations \u2014 instant and free. Pick something that helps YOU picture this fact."), !!(window.AlloModules && window.AlloModules.Prim3D && window.AlloModules.Prim3D.PRESETS) && /* @__PURE__ */ React.createElement("div", { className: "mb-2" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-bold text-emerald-800 mb-1.5" }, t("memory_palace.decorate_objects") || "3D decorations (stand beside the frame)"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-1.5" }, window.AlloModules.Prim3D.PRESETS.map((p) => {
    const label = t("memory_palace.preset_" + p.id) || p.label;
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: p.id,
        onClick: () => handlePlacePreset(p.id),
        title: label,
        className: "px-2.5 py-1 rounded-full text-xs font-bold bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-100 transition-colors"
      },
      p.emoji,
      " ",
      label
    );
  }))), glbReady && !!(window.AlloModules && window.AlloModules.GlbLibrary) && /* @__PURE__ */ React.createElement("div", { className: "mb-2" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-bold text-emerald-800 mb-1.5" }, t("memory_palace.decorate_collectibles") || "Collectibles (open 3D library)"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-1.5" }, window.AlloModules.GlbLibrary.listCatalog().filter((it) => it.id !== "trophy").map((it) => {
    const emoji = { sprout: "\u{1F331}", boulder: "\u{1FAA8}", lantern: "\u{1F3EE}", companion: "\u{1F43E}", torch: "\u{1F525}", chest_gold: "\u{1F9F0}", coin_stack: "\u{1FA99}", candles: "\u{1F56F}\uFE0F", key: "\u{1F5DD}\uFE0F", banner: "\u{1F6A9}", crates: "\u{1F4E6}", barrel: "\u{1F6E2}\uFE0F", pillar: "\u{1F3DB}\uFE0F", table: "\u{1FA91}", potion: "\u{1F9EA}" }[it.id] || "\u{1F4E6}";
    const label = t("memory_palace.collect_" + it.id) || it.label;
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: it.id,
        onClick: () => handlePlaceCollectible(it),
        title: label,
        className: "px-2.5 py-1 rounded-full text-xs font-bold bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-100 transition-colors"
      },
      emoji,
      " ",
      label
    );
  })), /* @__PURE__ */ React.createElement("div", { className: "text-[10px] text-emerald-600 mt-1" }, t("memory_palace.decorate_credit") || "3D models: KayKit by Kay Lousberg (CC0)")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-bold text-emerald-800 mb-1.5" }, t("memory_palace.decorate_stamps") || "Frame stamps (fill the picture frame)"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-1.5" }, _MP_STAMPS.map((s) => {
    const label = t("memory_palace.stamp_" + s.id) || s.label;
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: s.id,
        onClick: () => handlePlaceStamp(s),
        title: label,
        "aria-label": label,
        className: "w-9 h-9 flex items-center justify-center rounded-lg text-xl bg-white border border-emerald-300 hover:bg-emerald-100 transition-colors"
      },
      s.e
    );
  }))), (images[current.id] || objects3d[current.id]) && /* @__PURE__ */ React.createElement("div", { className: "mt-2 pt-2 border-t border-emerald-200" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleDecorRemove,
      title: t("memory_palace.decorate_remove_tooltip") || "Clear the image and 3D object at this locus",
      className: "px-2.5 py-1 rounded-full text-xs font-bold bg-white text-slate-600 border border-slate-300 hover:bg-slate-50 transition-colors"
    },
    "\u2716 ",
    t("memory_palace.decorate_remove") || "Remove art at this locus"
  )))), recall && finished && /* @__PURE__ */ React.createElement("div", { className: "mt-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-900", role: "status" }, /* @__PURE__ */ React.createElement("span", { className: "font-bold" }, finished.perfect ? t("memory_palace.recall_perfect") || "\u{1F3DB}\u2728 Perfect walk! Every locus recalled on the first try." : (t("memory_palace.recall_summary") || "Recalled {ok} of {total} ({first} on the first try).").replace("{ok}", String(finished.firstTry + finished.eventual)).replace("{total}", String(finished.total)).replace("{first}", String(finished.firstTry))), " ", "\xB7 \u23F1 ", fmtTime(elapsed), " \xB7 ", (t("memory_palace.recall_points") || "{points} points").replace("{points}", String(finished.points))), recall && !finished && current && (current.entry ? /* @__PURE__ */ React.createElement("div", { className: "mt-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-600" }, t("memory_palace.recall_at_entry") || "Walk forward (\u25B6 or \u2192) to the first locus to begin recalling.") : /* @__PURE__ */ React.createElement("div", { className: `mt-3 rounded-xl px-4 py-3 border transition-colors ${wrongFlash ? "bg-red-50 border-red-300" : "bg-amber-50 border-amber-200"}` }, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-bold text-amber-800 mb-2" }, (t("memory_palace.locus_of") || "Locus {idx} of {total}").replace("{idx}", String(current.idx)).replace("{total}", String(current.total)), " \u2014 ", t("memory_palace.recall_q") || "What belongs at this locus?"), recallResultsRef.current[current.id]?.correct || recallResultsRef.current[current.id]?.revealed ? /* @__PURE__ */ React.createElement("div", { className: "text-sm text-amber-900" }, t("memory_palace.recall_answered") || "Answered \u2014 walk on (\u25B6) or pick another frame.") : recall.mode === "bank" ? /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2" }, recallBank.map((chip) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: chip.id,
      onClick: () => submitRecallAnswer(chip.label, chip.id),
      className: "px-3 py-1.5 rounded-full text-xs font-bold bg-white text-amber-900 border border-amber-300 hover:bg-amber-100 hover:scale-105 transition-all"
    },
    chip.label
  ))) : /* @__PURE__ */ React.createElement("form", { className: "flex gap-2", onSubmit: (e) => {
    e.preventDefault();
    if (typedAnswer.trim()) submitRecallAnswer(typedAnswer, null);
  } }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: typedAnswer,
      onChange: (e) => setTypedAnswer(e.target.value),
      placeholder: t("memory_palace.recall_type_placeholder") || "Type what belongs here\u2026",
      "aria-label": t("memory_palace.recall_q") || "What belongs at this locus?",
      className: "flex-1 text-sm p-2 rounded-lg border border-amber-300 focus:ring-2 focus:ring-amber-400 bg-white"
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "submit",
      disabled: !typedAnswer.trim(),
      className: "px-4 py-2 rounded-lg text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
    },
    t("memory_palace.recall_submit") || "Check"
  )), recallHint && /* @__PURE__ */ React.createElement("div", { className: "mt-2 text-sm text-amber-900", role: "status", "aria-live": "polite" }, "\u{1F4A1} ", /* @__PURE__ */ React.createElement("span", { className: "font-bold" }, t("memory_palace.picture_this") || "Picture this:"), " ", recallHint), canReveal && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: revealCurrent,
      className: "mt-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-red-700 border border-red-300 hover:bg-red-50 transition-colors"
    },
    t("memory_palace.recall_reveal") || "Reveal answer (no points)"
  ))), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500 italic text-center mt-3" }, t("memory_palace.caption") || "Method of loci: a practice strategy with strong evidence for remembering ordered material \u2014 the effect comes from walking the route repeatedly and picturing each image vividly, not from the tool itself."));
};
const renderInteractiveMap = (deps) => {
  const { ConfettiExplosion, STYLE_TEXT_SHADOW_WHITE, VENN_ZONES, activeChallengeMode, challengeFeedback, challengeModeType, generatedContent, isChallengeActive, isCheckingChallenge, isProcessing, isTeacherMode, letterSpacing, nodeInputText, isMapLocked, connectingSourceId, conceptMapNodes, conceptMapEdges, draggedNodeId, setChallengeModeType, setConnectingSourceId, setIsInteractiveMap, setIsInteractiveVenn, setNodeInputText, mapContainerRef, addToast, getElbowPath, handleAddManualNode, handleAutoLayout, handleCheckChallengeRouter, handleClearEdges, handleCreateChallenge, handleDeleteEdge, handleDeleteNode, handleExitChallenge, handleNodeClick, handleNodeMouseDown, handleResetLayout, handleRetryChallenge, handleSetIsConceptMapReadyToFalse, handleToggleIsMapLocked, renderFlowShape, setConceptMapNodes, t } = deps;
  const handleAccessibleNodeKeyDown = (e, node) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleNodeClick(e, node.id);
      return;
    }
    if ((e.key === "Delete" || e.key === "Backspace") && !isChallengeActive && isTeacherMode && !isMapLocked) {
      e.preventDefault();
      e.stopPropagation();
      handleDeleteNode(node.id);
      return;
    }
    const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!delta || isMapLocked) return;
    e.preventDefault();
    e.stopPropagation();
    const step = e.shiftKey ? 25 : 10;
    const width = mapContainerRef.current ? mapContainerRef.current.offsetWidth : 800;
    const height = mapContainerRef.current ? mapContainerRef.current.offsetHeight : 600;
    setConceptMapNodes((nodes) => nodes.map((item) => item.id === node.id ? {
      ...item,
      x: Math.max(0, Math.min(width, item.x + delta[0] * step)),
      y: Math.max(0, Math.min(height, item.y + delta[1] * step))
    } : item));
  };
  try {
    if (window._DEBUG_VIEW_RENDERERS) console.log("[ViewRenderers] renderInteractiveMap fired");
  } catch (_) {
  }
  const isVenn = generatedContent?.data?.structureType === "Venn Diagram";
  const handleVennResetBoard = () => {
    setConceptMapNodes((prev) => prev.map((node) => ({
      ...node,
      x: 100 + Math.random() * 600,
      y: 530 + Math.random() * 50
    })));
    addToast(t("concept_map.venn.toast_reset"), "info");
  };
  const handleVennScrambleBank = () => {
    setConceptMapNodes((prev) => prev.map((node) => {
      if (node.y > 500) {
        return {
          ...node,
          x: 100 + Math.random() * 600,
          y: 530 + Math.random() * 50
        };
      }
      return node;
    }));
    addToast(t("concept_map.venn.toast_scramble"), "info");
  };
  return /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-400 justify-between min-h-[50px]" }, isVenn ? /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-center w-full gap-4" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.reset_venn_diagram"),
      onClick: handleVennResetBoard,
      disabled: isMapLocked,
      className: `flex items-center gap-2 bg-white text-indigo-600 border border-indigo-200 px-4 py-2 rounded-full text-xs font-bold hover:bg-indigo-50 transition-colors shadow-sm ${isMapLocked ? "opacity-50 cursor-not-allowed" : ""}`
    },
    /* @__PURE__ */ React.createElement(RefreshCw, { size: 14 }),
    " ",
    t("concept_map.venn.reset_board")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.reorder_list"),
      onClick: handleVennScrambleBank,
      disabled: isMapLocked,
      className: `flex items-center gap-2 bg-white text-slate-600 border border-slate-400 px-4 py-2 rounded-full text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm ${isMapLocked ? "opacity-50 cursor-not-allowed" : ""}`
    },
    /* @__PURE__ */ React.createElement(ListOrdered, { size: 14 }),
    " ",
    t("concept_map.venn.scramble_bank")
  ), /* @__PURE__ */ React.createElement("div", { className: "w-px h-6 bg-slate-300 mx-2" }), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        setIsInteractiveMap(false);
        setIsInteractiveVenn(false);
      },
      className: "flex items-center gap-1 text-slate-600 hover:text-slate-700 px-3 py-1.5 rounded text-xs font-bold hover:bg-slate-100 transition-colors"
    },
    /* @__PURE__ */ React.createElement(List, { size: 14 }),
    " ",
    t("concept_map.venn.return_list")
  ), /* @__PURE__ */ React.createElement("div", { className: "w-px h-6 bg-slate-300 mx-2" }), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.locked"),
      onClick: handleToggleIsMapLocked,
      className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${isMapLocked ? "bg-green-700 text-white hover:bg-green-700 ring-2 ring-green-200" : "bg-white text-slate-600 border border-slate-400 hover:text-indigo-600 hover:bg-indigo-50"}`,
      title: isMapLocked ? t("concept_map.toolbar.unlock_tooltip") : t("concept_map.toolbar.lock_tooltip")
    },
    isMapLocked ? /* @__PURE__ */ React.createElement(Lock, { size: 14 }) : /* @__PURE__ */ React.createElement(Unlock, { size: 14 }),
    isMapLocked ? t("concept_map.toolbar.locked_label") : t("concept_map.toolbar.unlocked_label")
  )) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, !isChallengeActive && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleSetIsConceptMapReadyToFalse,
      disabled: isMapLocked,
      className: `flex items-center gap-1 text-slate-600 hover:text-indigo-600 px-3 py-1.5 rounded text-xs font-bold hover:bg-indigo-50 transition-colors border border-transparent hover:border-indigo-200 ${isMapLocked ? "opacity-50 cursor-not-allowed" : ""}`,
      title: t("concept_map.toolbar.return_setup_tooltip"),
      "aria-label": t("concept_map.toolbar.return_setup_tooltip")
    },
    /* @__PURE__ */ React.createElement(List, { size: 14 }),
    " ",
    /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline" }, t("concept_map.toolbar.edit_list"))
  ), /* @__PURE__ */ React.createElement("div", { className: "w-px h-6 bg-slate-300 mx-1 hidden sm:block" })), /* @__PURE__ */ React.createElement(
    "input",
    {
      "aria-label": t("common.enter_node_input_text"),
      type: "text",
      value: nodeInputText,
      onChange: (e) => setNodeInputText(e.target.value),
      onKeyDown: (e) => e.key === "Enter" && !isChallengeActive && !isMapLocked && handleAddManualNode(),
      placeholder: t("concept_map.toolbar.add_placeholder"),
      className: `text-xs p-2 rounded border border-slate-400 focus:ring-2 focus:ring-indigo-500 w-32 sm:w-48 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 ${isMapLocked ? "cursor-not-allowed" : ""}`,
      disabled: isChallengeActive || isMapLocked
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.add"),
      onClick: handleAddManualNode,
      disabled: !nodeInputText.trim() || isChallengeActive || isMapLocked,
      className: "bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
    },
    /* @__PURE__ */ React.createElement(Plus, { size: 14 }),
    " ",
    /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline" }, t("concept_map.toolbar.add_concept"))
  ), /* @__PURE__ */ React.createElement("div", { className: "w-px h-6 bg-slate-300 mx-1 hidden sm:block" }), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleResetLayout,
      disabled: isMapLocked,
      className: `flex items-center gap-1 text-slate-600 hover:text-indigo-600 px-3 py-1.5 rounded text-xs font-bold hover:bg-indigo-50 transition-colors ${isMapLocked ? "opacity-50 cursor-not-allowed" : ""}`,
      title: t("concept_map.toolbar.scramble_tooltip"),
      "aria-label": t("concept_map.toolbar.scramble_tooltip")
    },
    /* @__PURE__ */ React.createElement(RefreshCw, { size: 14 }),
    " ",
    /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline" }, t("concept_map.toolbar.scramble"))
  ), !isChallengeActive && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handleAutoLayout(),
      disabled: isProcessing || isMapLocked,
      className: "flex items-center gap-1 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-100",
      title: t("concept_map.toolbar.auto_layout_tooltip"),
      "aria-label": t("concept_map.toolbar.auto_layout_tooltip")
    },
    isProcessing ? /* @__PURE__ */ React.createElement(RefreshCw, { size: 14, className: "animate-spin motion-reduce:animate-none" }) : /* @__PURE__ */ React.createElement(Sparkles, { size: 14 }),
    /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline" }, t("concept_map.toolbar.auto_layout"))
  ), !isChallengeActive && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleClearEdges,
      disabled: isMapLocked,
      className: `flex items-center gap-1 text-slate-600 hover:text-red-500 px-3 py-1.5 rounded text-xs font-bold hover:bg-red-50 transition-colors ${isMapLocked ? "opacity-50 cursor-not-allowed" : ""}`,
      title: t("concept_map.toolbar.clear_links_tooltip"),
      "aria-label": t("concept_map.toolbar.clear_links_tooltip")
    },
    /* @__PURE__ */ React.createElement(Unplug, { size: 14 }),
    " ",
    /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline" }, t("concept_map.toolbar.clear_links"))
  ), /* @__PURE__ */ React.createElement("div", { className: "w-px h-6 bg-slate-300 mx-2" }), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleToggleIsMapLocked,
      className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${isMapLocked ? "bg-green-700 text-white hover:bg-green-700 ring-2 ring-green-200" : "bg-white text-slate-600 border border-slate-400 hover:text-indigo-600 hover:bg-indigo-50"}`,
      title: isMapLocked ? t("concept_map.toolbar.unlock_tooltip") : t("concept_map.toolbar.lock_tooltip"),
      "aria-label": isMapLocked ? t("concept_map.toolbar.unlock_tooltip") : t("concept_map.toolbar.lock_tooltip")
    },
    isMapLocked ? /* @__PURE__ */ React.createElement(Lock, { size: 14 }) : /* @__PURE__ */ React.createElement(Unlock, { size: 14 }),
    isMapLocked ? t("concept_map.toolbar.locked_label") : t("concept_map.toolbar.unlocked_label")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => openConceptMap3D({
        nodes: conceptMapNodes,
        edges: conceptMapEdges,
        structureType: generatedContent?.data?.structureType,
        title: generatedContent?.data?.main || generatedContent?.title || "",
        arrangement: generatedContent?.data?.conceptSpaceLive,
        onArrangementChange: typeof deps.handleConceptSpacePersist === "function" ? ((arr) => deps.handleConceptSpacePersist(arr, "conceptSpaceLive")) : void 0,
        t,
        addToast
      }),
      className: "flex items-center gap-1 bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 px-3 py-1.5 rounded-full text-xs font-bold transition-colors shadow-sm",
      title: t("concept_map.toolbar.view_3d_tooltip") || "See this concept map as an orbitable 3D view (depth = strand)",
      "aria-label": t("concept_map.toolbar.view_3d_tooltip") || "View in 3D"
    },
    "\u{1F9CA} ",
    /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline" }, t("concept_map.toolbar.view_3d") || "View in 3D")
  )), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 border-l border-slate-300 pl-2" }, !isChallengeActive && isTeacherMode ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
    "select",
    {
      "aria-label": t("common.selection"),
      value: challengeModeType,
      onChange: (e) => setChallengeModeType(e.target.value),
      disabled: isMapLocked,
      className: `text-xs font-bold text-slate-600 bg-white border border-slate-400 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-yellow-400 cursor-pointer shadow-sm ${isMapLocked ? "opacity-50 cursor-not-allowed" : ""}`,
      title: t("concept_map.tooltips.select_grading")
    },
    /* @__PURE__ */ React.createElement("option", { value: "strict" }, t("concept_map.challenge.strict_mode")),
    /* @__PURE__ */ React.createElement("option", { value: "ai" }, t("concept_map.challenge.ai_mode"))
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleCreateChallenge,
      disabled: isMapLocked,
      className: `flex items-center gap-1 bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-sm ${isMapLocked ? "opacity-50 cursor-not-allowed" : ""}`,
      title: t("concept_map.tooltips.convert_challenge"),
      "aria-label": t("concept_map.tooltips.convert_challenge")
    },
    /* @__PURE__ */ React.createElement(Gamepad2, { size: 14 }),
    " ",
    t("concept_map.challenge.create")
  )) : isChallengeActive ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, challengeFeedback && (activeChallengeMode === "strict" ? /* @__PURE__ */ React.createElement("span", { className: `text-xs font-black px-2 py-1 rounded ${challengeFeedback.score >= 90 ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}` }, "Score: ", challengeFeedback.score, "%") : /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-end gap-1 max-w-[250px]" }, /* @__PURE__ */ React.createElement("span", { className: `text-xs font-black px-2 py-1 rounded ${challengeFeedback.score >= 90 ? "bg-green-100 text-green-700" : challengeFeedback.score >= 70 ? "bg-yellow-100 text-yellow-800" : "bg-orange-100 text-orange-700"}` }, "AI Score: ", challengeFeedback.score, "%"), challengeFeedback.feedbackText && /* @__PURE__ */ React.createElement("div", { className: "text-[11px] text-slate-600 italic text-right leading-tight bg-white/80 p-1.5 rounded border border-slate-400 shadow-sm animate-in slide-in-from-right-2" }, challengeFeedback.feedbackText))), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleRetryChallenge,
      className: "flex items-center gap-1 bg-white text-slate-600 hover:text-indigo-600 border border-slate-400 hover:border-indigo-600 px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-sm",
      title: t("concept_map.challenge.retry_tooltip"),
      "aria-label": t("concept_map.challenge.retry_tooltip")
    },
    /* @__PURE__ */ React.createElement(RefreshCw, { size: 14 }),
    /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline" }, t("concept_map.challenge.retry"))
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": t("common.check_challenge_answer"),
      onClick: handleCheckChallengeRouter,
      disabled: isCheckingChallenge,
      className: "flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
    },
    isCheckingChallenge ? /* @__PURE__ */ React.createElement(RefreshCw, { size: 14, className: "animate-spin motion-reduce:animate-none" }) : /* @__PURE__ */ React.createElement(CheckCircle2, { size: 14 }),
    isCheckingChallenge ? t("concept_map.challenge.checking") : t("concept_map.challenge.check")
  ), isTeacherMode && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleExitChallenge,
      className: "flex items-center justify-center bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-500 border border-slate-400 hover:border-red-200 w-8 h-8 rounded-full transition-colors",
      title: t("concept_map.challenge.exit"),
      "aria-label": t("concept_map.challenge.exit")
    },
    /* @__PURE__ */ React.createElement(X, { size: 16 })
  ))) : null))), /* @__PURE__ */ React.createElement(
    "div",
    {
      ref: mapContainerRef,
      className: `relative w-full ${isVenn ? "h-[800px]" : "h-[75vh] min-h-[600px]"} bg-white border border-slate-400 rounded-xl overflow-hidden shadow-inner select-none mb-6 ${isMapLocked ? "cursor-default" : "cursor-crosshair"} ${isChallengeActive ? "ring-4 ring-yellow-100" : ""}`,
      onMouseDown: (e) => {
        if (e.target === e.currentTarget && !isMapLocked) setConnectingSourceId(null);
      }
    },
    /* @__PURE__ */ React.createElement("style", null, `
                      @keyframes vo-node-in { from { opacity: 0; } to { opacity: 1; } }
                      .vo-node-anim { animation: vo-node-in 0.35s ease-out both; }
                      @media (prefers-reduced-motion: reduce) { .vo-node-anim { animation: none; } }
                  `),
    !isMapLocked && /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 bg-dot-pattern pointer-events-none z-0" }),
    generatedContent?.data?.structureType === "Cause and Effect" && /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 pointer-events-none z-0 flex" }, /* @__PURE__ */ React.createElement("div", { className: "w-1/2 h-full bg-gradient-to-br from-orange-50/80 to-orange-100/40 border-r-2 border-dashed border-orange-200" }, /* @__PURE__ */ React.createElement("div", { className: "absolute top-3 left-4 text-orange-700 text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement("div", { className: "w-2.5 h-2.5 rounded-full bg-orange-300" }), "CAUSES")), /* @__PURE__ */ React.createElement("div", { className: "w-1/2 h-full bg-gradient-to-bl from-teal-50/80 to-teal-100/40" }, /* @__PURE__ */ React.createElement("div", { className: "absolute top-3 right-4 text-teal-700 text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5" }, "EFFECTS", /* @__PURE__ */ React.createElement("div", { className: "w-2.5 h-2.5 rounded-full bg-teal-300" }))), /* @__PURE__ */ React.createElement("div", { className: "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-600" }, /* @__PURE__ */ React.createElement("svg", { width: "48", height: "48", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "animate-pulse motion-reduce:animate-none" }, /* @__PURE__ */ React.createElement("path", { d: "M5 12h14" }), /* @__PURE__ */ React.createElement("path", { d: "m12 5 7 7-7 7" })))),
    generatedContent?.data?.structureType === "Problem Solution" && /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 pointer-events-none z-0 flex flex-col" }, /* @__PURE__ */ React.createElement("div", { className: "h-[20%] w-full bg-gradient-to-b from-red-50/70 to-transparent border-b-2 border-dashed border-red-200" }, /* @__PURE__ */ React.createElement("div", { className: "absolute top-3 left-4 text-red-600 text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5" }, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "10" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "8", x2: "12", y2: "12" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "16", x2: "12.01", y2: "16" })), "PROBLEM")), /* @__PURE__ */ React.createElement("div", { className: "flex-grow w-full bg-gradient-to-b from-transparent via-green-50/30 to-transparent" }, /* @__PURE__ */ React.createElement("div", { className: "absolute top-[22%] left-4 text-green-700 text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement("div", { className: "w-2.5 h-2.5 rounded-sm bg-green-300 rotate-45" }), "SOLUTIONS")), /* @__PURE__ */ React.createElement("div", { className: "h-[25%] w-full bg-gradient-to-t from-blue-50/60 to-transparent border-t-2 border-dashed border-blue-200" }, /* @__PURE__ */ React.createElement("div", { className: "absolute bottom-3 left-4 text-blue-700 text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5" }, /* @__PURE__ */ React.createElement("path", { d: "M22 11.08V12a10 10 0 1 1-5.93-9.14" }), /* @__PURE__ */ React.createElement("polyline", { points: "22 4 12 14.01 9 11.01" })), "OUTCOME"))),
    /* @__PURE__ */ React.createElement("svg", { className: "absolute inset-0 w-full h-full pointer-events-none z-0", "aria-hidden": "true" }, isVenn ? /* @__PURE__ */ React.createElement("g", null, /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("linearGradient", { id: "vennGradientA", x1: "0%", y1: "0%", x2: "100%", y2: "100%" }, /* @__PURE__ */ React.createElement("stop", { offset: "0%", stopColor: "rgba(244, 63, 94, 0.15)" }), /* @__PURE__ */ React.createElement("stop", { offset: "100%", stopColor: "rgba(244, 63, 94, 0.05)" })), /* @__PURE__ */ React.createElement("linearGradient", { id: "vennGradientB", x1: "0%", y1: "0%", x2: "100%", y2: "100%" }, /* @__PURE__ */ React.createElement("stop", { offset: "0%", stopColor: "rgba(59, 130, 246, 0.15)" }), /* @__PURE__ */ React.createElement("stop", { offset: "100%", stopColor: "rgba(59, 130, 246, 0.05)" })), /* @__PURE__ */ React.createElement("radialGradient", { id: "vennGradientShared", cx: "50%", cy: "50%", r: "50%" }, /* @__PURE__ */ React.createElement("stop", { offset: "0%", stopColor: "rgba(168, 85, 247, 0.2)" }), /* @__PURE__ */ React.createElement("stop", { offset: "100%", stopColor: "rgba(168, 85, 247, 0)" })), /* @__PURE__ */ React.createElement("filter", { id: "vennShadow", x: "-20%", y: "-20%", width: "140%", height: "140%" }, /* @__PURE__ */ React.createElement("feDropShadow", { dx: "0", dy: "4", stdDeviation: "6", floodColor: "rgba(0,0,0,0.08)" }))), /* @__PURE__ */ React.createElement(
      "circle",
      {
        cx: VENN_ZONES.A.x,
        cy: VENN_ZONES.A.y,
        r: VENN_ZONES.A.r,
        fill: "url(#vennGradientA)",
        stroke: "#fda4af",
        strokeWidth: "3",
        filter: "url(#vennShadow)"
      }
    ), /* @__PURE__ */ React.createElement("text", { x: "170", y: "100", textAnchor: "middle", fill: "#be123c", fontSize: "18", fontWeight: "900", opacity: "0.9", style: STYLE_TEXT_SHADOW_WHITE }, generatedContent?.data.branches?.[0]?.title || "Set A"), /* @__PURE__ */ React.createElement(
      "circle",
      {
        cx: VENN_ZONES.B.x,
        cy: VENN_ZONES.B.y,
        r: VENN_ZONES.B.r,
        fill: "url(#vennGradientB)",
        stroke: "#93c5fd",
        strokeWidth: "3",
        filter: "url(#vennShadow)"
      }
    ), /* @__PURE__ */ React.createElement("text", { x: "630", y: "100", textAnchor: "middle", fill: "#1d4ed8", fontSize: "18", fontWeight: "900", opacity: "0.9", style: STYLE_TEXT_SHADOW_WHITE }, generatedContent?.data.branches?.[1]?.title || "Set B"), /* @__PURE__ */ React.createElement("circle", { cx: "400", cy: "250", r: "100", fill: "url(#vennGradientShared)" }), /* @__PURE__ */ React.createElement("text", { x: "400", y: "250", textAnchor: "middle", fill: "#6b21a8", fontSize: "14", fontWeight: "bold", opacity: "0.8", style: { textShadow: "0 1px 2px rgba(255,255,255,0.8)" } }, generatedContent?.data.branches?.[2]?.title || "Shared"), /* @__PURE__ */ React.createElement("line", { x1: "0", y1: "500", x2: "100%", y2: "500", stroke: "#cbd5e1", strokeWidth: "2", strokeDasharray: "6,6" }), /* @__PURE__ */ React.createElement("text", { x: "40", y: "525", fill: "#94a3b8", fontSize: "12", fontWeight: "bold", letterSpacing: "1" }, t("concept_map.venn.item_bank"))) : (challengeFeedback ? challengeFeedback.checkedEdges || [] : conceptMapEdges || []).map((edge) => {
      const fromNode = conceptMapNodes.find((n) => n.id === edge.fromId);
      const toNode = conceptMapNodes.find((n) => n.id === edge.toId);
      if (!fromNode || !toNode) return null;
      let strokeColor = "#818cf8";
      let strokeWidth = "2";
      if (edge.status === "correct") {
        strokeColor = "#22c55e";
        strokeWidth = "4";
      } else if (edge.status === "incorrect") {
        strokeColor = "#ef4444";
        strokeWidth = "3";
      }
      const isFlowChart = fromNode.type && fromNode.type.startsWith("flow-");
      const pathD = isFlowChart ? getElbowPath(fromNode, toNode) : null;
      const _emidX = (fromNode.x + toNode.x) / 2;
      const curvePathD = `M ${fromNode.x} ${fromNode.y} C ${_emidX} ${fromNode.y}, ${_emidX} ${toNode.y}, ${toNode.x} ${toNode.y}`;
      return /* @__PURE__ */ React.createElement(
        "g",
        {
          key: edge.id,
          role: !isMapLocked ? "button" : void 0,
          tabIndex: !isMapLocked ? 0 : void 0,
          focusable: !isMapLocked ? "true" : "false",
          "aria-label": !isMapLocked ? (t("concept_map.tooltips.delete_edge") || "Delete connection") + ": " + fromNode.text + " to " + toNode.text : void 0,
          className: !isMapLocked ? "pointer-events-auto cursor-pointer hover:opacity-70 group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600" : "",
          onClick: () => !isMapLocked && handleDeleteEdge(edge.id),
          onKeyDown: (e) => {
            if (!isMapLocked && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              e.stopPropagation();
              handleDeleteEdge(edge.id);
            }
          }
        },
        /* @__PURE__ */ React.createElement("title", null, t("concept_map.tooltips.delete_edge")),
        isFlowChart ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("path", { d: pathD, stroke: "transparent", strokeWidth: "24", fill: "none" }), /* @__PURE__ */ React.createElement(
          "path",
          {
            d: pathD,
            stroke: strokeColor,
            strokeWidth,
            fill: "none",
            strokeOpacity: edge.status ? "1" : "0.6",
            strokeDasharray: edge.status === "incorrect" || edge.style === "dashed" ? "5,5" : "none",
            markerEnd: "url(#arrowhead)"
          }
        )) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("path", { d: curvePathD, stroke: "transparent", strokeWidth: "24", fill: "none" }), edge.color && !edge.status && /* @__PURE__ */ React.createElement(
          "path",
          {
            d: curvePathD,
            stroke: edge.color,
            strokeWidth: "6",
            fill: "none",
            strokeOpacity: "0.18",
            strokeLinecap: "round",
            filter: "url(#vo-edge-glow)"
          }
        ), /* @__PURE__ */ React.createElement(
          "path",
          {
            d: curvePathD,
            stroke: edge.style === "dashed" ? "#94a3b8" : edge.status ? strokeColor : edge.color || strokeColor,
            strokeWidth,
            fill: "none",
            strokeOpacity: edge.status ? "1" : "0.6",
            strokeLinecap: "round",
            strokeDasharray: edge.status === "incorrect" || edge.style === "dashed" ? "5,5" : "none",
            markerEnd: fromNode.type?.startsWith("cause-") || fromNode.type?.startsWith("ce-") || fromNode.type?.startsWith("ps-") || fromNode.type?.startsWith("chain-") ? "url(#arrowhead)" : void 0
          }
        )),
        !isChallengeActive && !isMapLocked && /* @__PURE__ */ React.createElement("g", { className: "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity" }, /* @__PURE__ */ React.createElement("circle", { cx: (fromNode.x + toNode.x) / 2, cy: (fromNode.y + toNode.y) / 2, r: "8", fill: "#ef4444" }), /* @__PURE__ */ React.createElement("text", { x: (fromNode.x + toNode.x) / 2, y: (fromNode.y + toNode.y) / 2, dy: "3", textAnchor: "middle", fill: "white", fontSize: "10", fontWeight: "bold" }, "\xD7"))
      );
    }), /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("filter", { id: "vo-edge-glow", x: "-50%", y: "-50%", width: "200%", height: "200%" }, /* @__PURE__ */ React.createElement("feGaussianBlur", { stdDeviation: "2" })), /* @__PURE__ */ React.createElement("marker", { id: "arrowhead", markerWidth: "10", markerHeight: "7", refX: "9", refY: "3.5", orient: "auto" }, /* @__PURE__ */ React.createElement("polygon", { points: "0 0, 10 3.5, 0 7", fill: "#818cf8" }))), !isVenn && (conceptMapNodes || []).filter((node) => node.type && node.type.startsWith("flow-")).map((node) => /* @__PURE__ */ React.createElement(React.Fragment, { key: node.id }, renderFlowShape(node, connectingSourceId === node.id))), !isVenn && connectingSourceId && /* @__PURE__ */ React.createElement("rect", { x: "0", y: "0", width: "100%", height: "100%", fill: "rgba(99, 102, 241, 0.05)", className: "pointer-events-none animate-pulse motion-reduce:animate-none" })),
    (conceptMapNodes || []).filter((node) => !node.type || !node.type.startsWith("flow-")).map((node, _nodeIdx) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: node.id,
        style: {
          left: node.x,
          top: node.y,
          transform: "translate(-50%, -50%)",
          transition: draggedNodeId === node.id ? "none" : "left 0.3s ease-out, top 0.3s ease-out, transform 0.2s ease-out",
          // The concept-map centre node gets the static KeyConceptMapView bubble's
          // radial gradient + glow, so the two renderings of the hub read the same.
          ...node.type === "main" ? {
            background: "radial-gradient(circle at 30% 30%, #818cf8 0%, #6366f1 45%, #4338ca 100%)",
            boxShadow: "0 0 45px rgba(99,102,241,0.4), 0 8px 24px rgba(67,56,202,0.22), inset 0 -8px 24px rgba(30,27,75,0.22)"
          } : {},
          // Per-node entrance stagger (bounded by % so a late-added node never waits
          // long). Pairs with the .vo-node-anim class + keyframe above.
          animationDelay: _nodeIdx % 10 * 35 + "ms"
        },
        className: `
                              vo-node-anim absolute z-10 flex items-center justify-center text-center font-bold shadow-md group
                              ${!isMapLocked ? "cursor-grab active:cursor-grabbing" : "cursor-default"}
                              ${node.type === "main" ? "text-white w-40 h-40 rounded-full border-4 border-white text-sm transition-all" : node.type === "branch" ? `bg-white text-${node.colorVariant || "indigo"}-900 w-32 h-32 rounded-full border-2 border-${node.colorVariant || "indigo"}-300 text-xs shadow-sm transition-all hover:shadow-md` : node.type === "venn-token" ? `bg-${node.colorVariant || "slate"}-50 text-slate-800 px-4 py-2 rounded-xl border-b-4 border-${node.colorVariant || "slate"}-200 text-xs hover:border-${node.colorVariant || "slate"}-400 shadow-sm min-w-[80px] max-w-[150px] hover:scale-105 hover:shadow-lg hover:-translate-y-1 active:border-b-0 active:translate-y-0 transition-all` : node.type === "flow-start" || node.type === "flow-end" ? "bg-slate-800 text-white px-6 py-3 rounded-full border-2 border-slate-600 text-xs uppercase tracking-wider" : node.type === "flow-process" ? "bg-white text-indigo-900 w-48 h-20 rounded-lg border-2 border-indigo-200 text-xs shadow-sm flex items-center justify-center px-4" : node.type === "flow-decision" ? "bg-yellow-50 text-yellow-900 w-32 h-32 rotate-45 border-2 border-yellow-400 text-xs shadow-sm flex items-center justify-center" : node.type === "flow-note" ? "bg-yellow-100 text-yellow-800 px-3 py-2 text-[11px] border border-yellow-200 shadow-sm max-w-[150px] rounded-bl-none" : node.type === "outline-main" ? "bg-slate-900 text-white w-60 py-4 px-6 rounded-xl border-2 border-slate-700 shadow-xl text-sm z-20" : node.type === "outline-branch" ? "bg-white text-indigo-900 w-48 py-3 px-4 rounded-lg border-l-8 border-l-indigo-600 border-y border-r border-slate-200 text-xs shadow-md z-10" : node.type === "outline-item" ? "bg-slate-50 text-slate-700 w-40 py-2 px-3 rounded border border-slate-400 text-[11px] shadow-sm hover:bg-white z-0" : node.type === "ce-main" ? "bg-slate-800 text-white w-56 py-4 px-6 rounded-xl border-2 border-slate-600 shadow-xl text-sm z-20" : node.type === "cause-node" ? "bg-orange-50 text-orange-900 w-48 py-3 px-4 rounded-xl border-l-[6px] border-l-orange-400 border-y border-r border-orange-200 text-xs shadow-md hover:shadow-lg hover:border-orange-300 transition-all" : node.type === "effect-node" ? "bg-teal-50 text-teal-900 w-48 py-3 px-4 rounded-xl border-r-[6px] border-r-teal-400 border-y border-l border-teal-200 text-xs shadow-md hover:shadow-lg hover:border-teal-300 transition-all" : node.type === "chain-node" ? "bg-purple-50 text-purple-900 w-44 py-3 px-4 rounded-lg border-2 border-purple-300 text-xs shadow-md hover:shadow-lg transition-all" : node.type === "ps-problem" ? "bg-red-600 text-white w-64 py-5 px-6 rounded-2xl border-4 border-red-300 text-sm shadow-xl shadow-red-200 z-20" : node.type === "ps-solution" ? "bg-white text-green-900 w-48 py-3 px-4 rounded-xl border-t-[6px] border-t-green-500 border-x border-b border-green-200 text-xs shadow-lg hover:shadow-xl hover:scale-105 transition-all" : node.type === "ps-solution-item" ? "bg-green-50 text-green-800 w-40 py-2 px-3 rounded-lg border border-green-300 text-[11px] shadow-sm hover:bg-green-100 transition-colors" : node.type === "ps-outcome" ? "bg-blue-600 text-white w-56 py-4 px-5 rounded-2xl border-4 border-blue-300 text-sm shadow-xl shadow-blue-200 z-20" : node.type === "ps-outcome-item" ? "bg-blue-50 text-blue-800 w-40 py-2 px-3 rounded-lg border border-blue-300 text-[11px] shadow-sm hover:bg-blue-100 transition-colors" : node.type === "item" ? `bg-${node.colorVariant || "slate"}-50 text-${node.colorVariant || "slate"}-900 w-28 h-28 rounded-full border border-${node.colorVariant || "slate"}-300 text-[11px] shadow-sm hover:bg-white hover:shadow-md transition-all` : "bg-slate-50 text-slate-700 w-28 h-28 rounded-full border border-slate-400 text-[11px] hover:bg-white"}
                              ${connectingSourceId === node.id ? "ring-4 ring-yellow-400 ring-offset-2 scale-105" : ""}
                          `,
        onMouseDown: (e) => !isMapLocked && handleNodeMouseDown(e, node.id),
        onClick: (e) => handleNodeClick(e, node.id)
      },
      /* @__PURE__ */ React.createElement(
        "div",
        {
          role: "button",
          tabIndex: 0,
          "aria-label": node.text,
          "aria-pressed": connectingSourceId === node.id,
          onKeyDown: (e) => handleAccessibleNodeKeyDown(e, node),
          className: `w-full h-full px-2 flex items-center justify-center line-clamp-4 select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${node.type === "flow-decision" ? "-rotate-45" : ""}`
        },
        node.text
      ),
      !isChallengeActive && !isMapLocked && /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          "aria-label": (t("concept_map.tooltips.delete_node") || "Delete concept") + ": " + node.text,
          onClick: (e) => {
            e.stopPropagation();
            handleDeleteNode(node.id);
          },
          className: `absolute -top-1 -right-1 min-w-6 min-h-6 bg-red-700 text-white rounded-full p-1 shadow-sm hover:bg-red-600 transition-colors z-20 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:scale-110 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 ${node.type === "flow-decision" ? "-rotate-45 -translate-y-2 translate-x-2" : ""}`,
          title: t("concept_map.tooltips.delete_node")
        },
        /* @__PURE__ */ React.createElement(X, { size: 12 })
      )
    )),
    /* @__PURE__ */ React.createElement("div", { className: "absolute bottom-4 left-4 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full text-[11px] text-slate-600 pointer-events-none border border-slate-400 shadow-sm" }, isVenn ? t("concept_map.overlay.venn_instructions") : isChallengeActive ? t("concept_map.overlay.challenge_instructions") : t("concept_map.overlay.standard_instructions")),
    isChallengeActive && challengeFeedback && challengeFeedback.score === 100 && /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 pointer-events-none flex items-center justify-center z-50" }, /* @__PURE__ */ React.createElement(ConfettiExplosion, null))
  ));
};
window.AlloModules = window.AlloModules || {};
window.AlloModules.ViewRenderers = {
  normalizeVisualOrganizerData,
  renderFormattedText,
  renderOutlineContent,
  renderInteractiveMap,
  openConceptMap3D
  // exported so the static organizer view (view_outline) can open 3D without entering interactive mode
};
window.AlloModules.ViewRenderersModule = true;
console.log('[ViewRenderers] Registered (renderFormattedText, renderOutlineContent, renderInteractiveMap, openConceptMap3D)');
})();
