/**
 * AlloFlow FabStack Module
 * Auto-generated. Source: view_fab_stack_source.jsx
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.FabStack) {
    console.log('[CDN] FabStack already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[FabStack] React not found on window'); return; }

const MAGNIFIER_ZOOMS = [1.5, 2, 3];
const MAGNIFIER_STORAGE_KEY = "allo_magnifier";
const MAGNIFIER_ZOOM_STORAGE_KEY = "allo_magnifier_zoom";
const MAGNIFIER_BOX_LIMIT = 1200;
const MAGNIFIER_LIVE_LIMIT = 6;
const MAGNIFIER_DROP = { AUDIO: 1, SCRIPT: 1, NOSCRIPT: 1, TEMPLATE: 1, STYLE: 1, LINK: 1, META: 1, BASE: 1, TITLE: 1 };
const MAGNIFIER_STAND_IN = { IFRAME: 1, FRAME: 1, OBJECT: 1, EMBED: 1, PORTAL: 1 };
const MAGNIFIER_FLOW_ONLY = /^(inline|contents|table-row|table-row-group|table-header-group|table-footer-group|table-column|table-column-group|table-cell|table-caption)$/;
function readMagnifierPref(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (_) {
    return null;
  }
}
function rememberMagnifierPref(key, value, fallback) {
  try {
    const stored = window.localStorage.getItem(key);
    if (stored === value || stored === null && value === fallback) return;
    window.localStorage.setItem(key, value);
  } catch (_) {
  }
}
function normalizeMagnifierZoom(value) {
  const zoom = Number(value);
  return MAGNIFIER_ZOOMS.indexOf(zoom) !== -1 ? zoom : 2;
}
function formatMagnifierZoom(zoom) {
  try {
    return new Intl.NumberFormat(document.documentElement.lang || void 0).format(zoom) + "\xD7";
  } catch (_) {
    return zoom + "\xD7";
  }
}
function magnifierLensSize(vw, vh) {
  const shortSide = Math.min(vw || 0, vh || 0) || 600;
  return Math.max(120, Math.min(190, Math.round(shortSide * 0.5)));
}
function magnifierLayout({ x, y, zoom, size, touch, vw, vh }) {
  const k = normalizeMagnifierZoom(zoom);
  const half = size / 2;
  let left = x - half;
  let top = y - half;
  if (touch) {
    top = y - half - Math.round(size * 0.75);
    if (top < 0) {
      top = Math.max(0, Math.min(vh - size, y - half));
      left = x > vw / 2 ? x - size * 1.35 : x + size * 0.35;
    }
  }
  return { left: Math.round(left), top: Math.round(top), size, zoom: k, tx: half - x * k, ty: half - y * k };
}
function createPageMagnifier(options) {
  const doc = document;
  const win = window;
  const body = doc.body;
  if (!body || typeof body.attachShadow !== "function") return null;
  const opts = options || {};
  const now = () => win.performance && typeof win.performance.now === "function" ? win.performance.now() : Date.now();
  const raf = typeof win.requestAnimationFrame === "function" ? (cb) => win.requestAnimationFrame(cb) : (cb) => win.setTimeout(cb, 16);
  const caf = typeof win.cancelAnimationFrame === "function" ? (id) => win.cancelAnimationFrame(id) : (id) => win.clearTimeout(id);
  const state = { zoom: normalizeMagnifierZoom(opts.zoom), x: null, y: null, touch: false, hidden: false };
  let destroyed = false;
  const host = doc.createElement("div");
  host.className = "alloflow-magnifier-lens no-print";
  host.setAttribute("data-allo-magnifier", "lens");
  host.setAttribute("aria-hidden", "true");
  host.setAttribute("inert", "");
  host.style.cssText = "position:fixed;left:0;top:0;width:0;height:0;display:none;z-index:2147483600;pointer-events:none;border-radius:50%;overflow:hidden;contain:strict;will-change:transform;transition:none;background-color:#ffffff;";
  const shadow = host.attachShadow({ mode: "open" });
  const styleBox = doc.createElement("div");
  styleBox.setAttribute("data-magnifier-styles", "");
  styleBox.style.display = "none";
  const ownStyle = doc.createElement("style");
  ownStyle.textContent = [
    "*, *::before, *::after { animation: none !important; transition: none !important; pointer-events: none !important; caret-color: transparent !important; }",
    "[data-magnifier-ring] { position: absolute; inset: 0; border-radius: 50%; border: 3px solid #ffffff; box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.55); box-sizing: border-box; }",
    ':host([data-theme="contrast"]) [data-magnifier-ring] { border-color: #ffff00; box-shadow: inset 0 0 0 1px #000000; }',
    "@media (forced-colors: active) { [data-magnifier-ring] { border-color: CanvasText; } }"
  ].join("\n");
  const stage = doc.createElement("div");
  stage.setAttribute("data-magnifier-stage", "");
  stage.style.cssText = "position:absolute;left:0;top:0;width:0;height:0;transform-origin:0 0;";
  const ring = doc.createElement("div");
  ring.setAttribute("data-magnifier-ring", "");
  shadow.appendChild(styleBox);
  shadow.appendChild(ownStyle);
  shadow.appendChild(stage);
  shadow.appendChild(ring);
  body.appendChild(host);
  const viewport = () => ({
    vw: win.innerWidth || doc.documentElement.clientWidth || 0,
    vh: win.innerHeight || doc.documentElement.clientHeight || 0
  });
  const lensSize = () => {
    const { vw, vh } = viewport();
    return magnifierLensSize(vw, vh);
  };
  const emptyRect = (r) => !(r && r.width > 0 && r.height > 0);
  const meets = (r, box) => r.right > box.left && r.left < box.right && r.bottom > box.top && r.top < box.bottom;
  const hitAt = (x, y) => {
    try {
      return typeof doc.elementFromPoint === "function" ? doc.elementFromPoint(x, y) : null;
    } catch (_) {
      return null;
    }
  };
  const inStack = (node) => {
    const stack = typeof opts.getStack === "function" ? opts.getStack() : null;
    return !!(stack && node && node.nodeType && stack.contains(node));
  };
  const styleCopies = /* @__PURE__ */ new Map();
  let stylesDirty = true;
  const styleTextOf = (el) => {
    let text = el.textContent || "";
    if (!text.trim()) {
      try {
        const rules = el.sheet && el.sheet.cssRules;
        if (rules && rules.length) text = Array.from(rules, (rule) => rule.cssText).join("\n");
      } catch (_) {
      }
    }
    return text;
  };
  const syncStyles = () => {
    stylesDirty = false;
    const originals = Array.from(doc.querySelectorAll('style, link[rel~="stylesheet"]'));
    let changed = originals.length !== styleBox.childNodes.length;
    const copies = originals.map((el, index) => {
      const isStyle = el.tagName === "STYLE";
      const key = isStyle ? styleTextOf(el) : [el.href, el.media, el.disabled ? 1 : 0].join("|");
      let entry = styleCopies.get(el);
      if (!entry || entry.key !== key) {
        let copy;
        if (isStyle) {
          copy = doc.createElement("style");
          copy.textContent = key;
          if (el.media) copy.media = el.media;
        } else {
          copy = el.cloneNode(false);
        }
        entry = { key, copy };
        styleCopies.set(el, entry);
        changed = true;
      }
      if (styleBox.childNodes[index] !== entry.copy) changed = true;
      return entry.copy;
    });
    if (changed) styleBox.replaceChildren(...copies);
    styleCopies.forEach((_, el) => {
      if (!el.isConnected) styleCopies.delete(el);
    });
    try {
      if (doc.adoptedStyleSheets && doc.adoptedStyleSheets.length) shadow.adoptedStyleSheets = Array.from(doc.adoptedStyleSheets);
    } catch (_) {
    }
  };
  const pickRegion = (hit, zone) => {
    const { vw, vh } = viewport();
    const want = { left: Math.max(0, zone.left), top: Math.max(0, zone.top), right: Math.min(vw, zone.right), bottom: Math.min(vh, zone.bottom) };
    const chain = [];
    for (let node = hit; node && node !== body && node !== doc.documentElement; node = node.parentElement) chain.push(node);
    const seen = new Array(chain.length);
    let clip = { left: 0, top: 0, right: vw, bottom: vh };
    for (let i = chain.length - 1; i >= 0; i -= 1) {
      const el = chain[i];
      const cs = win.getComputedStyle(el);
      if (cs.position === "fixed") clip = { left: 0, top: 0, right: vw, bottom: vh };
      const r = el.getBoundingClientRect();
      seen[i] = {
        el,
        display: cs.display,
        left: Math.max(r.left, clip.left),
        top: Math.max(r.top, clip.top),
        right: Math.min(r.right, clip.right),
        bottom: Math.min(r.bottom, clip.bottom)
      };
      if (cs.overflowX !== "visible") clip = { left: Math.max(clip.left, r.left), top: clip.top, right: Math.min(clip.right, r.right), bottom: clip.bottom };
      if (cs.overflowY !== "visible") clip = { left: clip.left, top: Math.max(clip.top, r.top), right: clip.right, bottom: Math.min(clip.bottom, r.bottom) };
    }
    for (let i = 0; i < seen.length; i += 1) {
      const box = seen[i];
      if (box.el.ownerSVGElement || MAGNIFIER_FLOW_ONLY.test(box.display)) continue;
      if (box.left <= want.left + 0.5 && box.top <= want.top + 0.5 && box.right >= want.right - 0.5 && box.bottom >= want.bottom - 0.5) return box.el;
    }
    return body;
  };
  const shallow = (o) => {
    const c = o.cloneNode(false);
    if (o.hasAttributes && o.hasAttributes()) {
      for (const attr of Array.from(c.attributes)) {
        const name = attr.name.toLowerCase();
        if (name.indexOf("on") === 0 || name === "autofocus" || name === "loading") c.removeAttribute(attr.name);
      }
    }
    return c;
  };
  const copyLook = (o, n) => {
    const cls = o.getAttribute("class");
    if (cls) n.setAttribute("class", cls);
    const css = o.getAttribute("style");
    if (css) n.setAttribute("style", css);
  };
  const drawFrame = (from, to) => {
    try {
      if (from.tagName === "VIDEO" && (from.readyState < 2 || !from.videoWidth)) return;
      const ctx = to.getContext && to.getContext("2d");
      if (!ctx) return;
      const cw = to.width, ch = to.height;
      if (from.tagName === "VIDEO") {
        const fit = win.getComputedStyle(from).objectFit;
        const vw = from.videoWidth, vh = from.videoHeight;
        ctx.clearRect(0, 0, cw, ch);
        if (fit === "fill") {
          ctx.drawImage(from, 0, 0, cw, ch);
          return;
        }
        const s = fit === "cover" ? Math.max(cw / vw, ch / vh) : Math.min(cw / vw, ch / vh);
        ctx.drawImage(from, (cw - vw * s) / 2, (ch - vh * s) / 2, vw * s, vh * s);
      } else {
        ctx.clearRect(0, 0, cw, ch);
        ctx.drawImage(from, 0, 0, cw, ch);
      }
    } catch (_) {
    }
  };
  const videoStandIn = (o, ctx) => {
    const cv = doc.createElement("canvas");
    cv.setAttribute("aria-hidden", "true");
    copyLook(o, cv);
    const w = o.offsetWidth || 0, h = o.offsetHeight || 0;
    cv.style.setProperty("width", w + "px");
    cv.style.setProperty("height", h + "px");
    cv.style.setProperty("background-color", "#000000");
    const scale = Math.min(3, state.zoom * (win.devicePixelRatio || 1));
    cv.width = Math.max(1, Math.min(2048, Math.round(w * scale)));
    cv.height = Math.max(1, Math.min(2048, Math.round(h * scale)));
    ctx.live.push([o, cv]);
    return cv;
  };
  const frameStandIn = (o) => {
    const box = doc.createElement("div");
    copyLook(o, box);
    box.style.setProperty("width", (o.offsetWidth || 0) + "px");
    box.style.setProperty("height", (o.offsetHeight || 0) + "px");
    box.style.setProperty("background-color", "#cbd5e1");
    if (win.getComputedStyle(o).display === "inline") box.style.setProperty("display", "inline-block");
    return box;
  };
  const copyTree = (o, ctx) => {
    const tag = o.tagName;
    if (o === host || MAGNIFIER_DROP[tag]) {
      return tag === "AUDIO" && o.hasAttribute("controls") ? frameStandIn(o) : null;
    }
    if (tag === "VIDEO") return videoStandIn(o, ctx);
    if (MAGNIFIER_STAND_IN[tag]) return frameStandIn(o);
    ctx.count += 1;
    const c = shallow(o);
    if (o.scrollTop || o.scrollLeft) ctx.scrolls.push([c, o.scrollTop, o.scrollLeft]);
    if (tag === "CANVAS") ctx.live.push([o, c]);
    for (let n = o.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 1) {
        const part = copyTree(n, ctx);
        if (part) c.appendChild(part);
      } else if (n.nodeType === 3) {
        c.appendChild(n.cloneNode(false));
      }
    }
    if (tag === "INPUT") {
      if (o.type !== "file") {
        try {
          c.value = o.value;
        } catch (_) {
        }
      }
      c.checked = o.checked;
    } else if (tag === "TEXTAREA") {
      c.value = o.value;
    } else if (tag === "SELECT") {
      c.selectedIndex = o.selectedIndex;
    }
    return c;
  };
  const pin = (node, rect, origin) => {
    const set = (prop, value) => node.style.setProperty(prop, value, "important");
    set("position", "absolute");
    set("left", rect.left - origin.x + "px");
    set("top", rect.top - origin.y + "px");
    set("right", "auto");
    set("bottom", "auto");
    set("width", rect.width + "px");
    set("height", rect.height + "px");
    set("min-width", "0");
    set("min-height", "0");
    set("max-width", "none");
    set("max-height", "none");
    set("margin", "0");
    set("box-sizing", "border-box");
    set("transform", "none");
    set("translate", "none");
    set("rotate", "none");
    set("scale", "none");
  };
  const buildBox = (el, origin, zone, depth, ctx) => {
    const rect = el.getBoundingClientRect();
    if (emptyRect(rect)) return null;
    let parts = null;
    if (depth < 8 && el.children.length && el.getElementsByTagName("*").length > MAGNIFIER_BOX_LIMIT && !el.ownerSVGElement && el.tagName.toLowerCase() !== "svg") {
      parts = [];
      for (let n = el.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 3) {
          if (n.nodeValue.trim()) {
            parts = null;
            break;
          }
          continue;
        }
        if (n.nodeType !== 1 || n === host || MAGNIFIER_DROP[n.tagName]) continue;
        const r = n.getBoundingClientRect();
        if (emptyRect(r)) {
          if (win.getComputedStyle(n).display === "contents") {
            parts = null;
            break;
          }
          continue;
        }
        if (!meets(r, zone)) continue;
        if (MAGNIFIER_FLOW_ONLY.test(win.getComputedStyle(n).display)) {
          parts = null;
          break;
        }
        parts.push(n);
      }
    }
    let node;
    if (parts) {
      node = shallow(el);
      const cs = win.getComputedStyle(el);
      node.style.setProperty("display", "block", "important");
      node.style.setProperty("overflow", cs.overflowX !== "visible" || cs.overflowY !== "visible" ? "hidden" : "visible", "important");
      const inner = { x: rect.left + el.clientLeft, y: rect.top + el.clientTop };
      for (const child of parts) {
        const part = buildBox(child, inner, zone, depth + 1, ctx);
        if (part) node.appendChild(part);
      }
    } else {
      node = copyTree(el, ctx);
      if (!node) return null;
      ctx.tracked.push({ el, left: rect.left, top: rect.top, width: rect.width, height: rect.height });
    }
    pin(node, rect, origin);
    return node;
  };
  let anchor = null;
  let region = null;
  let tracked = [];
  let live = [];
  let pendingScrolls = [];
  let lastBuild = -Infinity;
  let buildGap = 40;
  let needBuild = true;
  let lastHostCss = "";
  let lastStageCss = "";
  const paintTheme = (probe) => {
    const start2 = probe && probe.nodeType === 1 ? probe : body;
    const root = doc.documentElement;
    const contrast = !!start2.closest(".theme-contrast") || root.classList.contains("theme-contrast") || body.classList.contains("theme-contrast");
    host.setAttribute("data-theme", contrast ? "contrast" : "default");
    let color = "";
    for (let n = start2; n && n.nodeType === 1; n = n.parentElement) {
      const c = win.getComputedStyle(n).backgroundColor;
      if (c && c !== "transparent" && !/^rgba\([^)]*,\s*0\)$/.test(c)) {
        color = c;
        break;
      }
    }
    host.style.backgroundColor = contrast ? "#000000" : "#ffffff";
    host.style.backgroundImage = color ? "linear-gradient(" + color + ", " + color + ")" : "none";
    host.style.boxShadow = contrast ? "0 0 0 2px #000000" : "0 0 0 2px #1e293b, 0 10px 24px rgba(15, 23, 42, 0.35)";
  };
  let buildCount = 0;
  const rebuild = (hit) => {
    const started = now();
    buildCount += 1;
    lastBuild = started;
    needBuild = false;
    if (stylesDirty) syncStyles();
    const reach = lensSize() / state.zoom;
    const zone = { left: state.x - reach, top: state.y - reach, right: state.x + reach, bottom: state.y + reach };
    const probe = hit || body;
    const picked = pickRegion(probe, zone);
    const ctx = { scrolls: [], live: [], tracked: [], count: 0 };
    let top = buildBox(picked, { x: 0, y: 0 }, zone, 0, ctx);
    for (let p = picked.parentElement; p; p = p.parentElement) {
      const shell = shallow(p);
      shell.style.setProperty("display", "contents", "important");
      if (top) shell.appendChild(top);
      top = shell;
    }
    if (top) stage.replaceChildren(top);
    else stage.replaceChildren();
    region = picked;
    tracked = ctx.tracked;
    live = ctx.live.slice(0, MAGNIFIER_LIVE_LIMIT);
    ctx.live.forEach(([from, to]) => drawFrame(from, to));
    pendingScrolls = ctx.scrolls;
    anchor = { x: state.x, y: state.y };
    paintTheme(probe);
    buildGap = Math.max(40, Math.min(400, (now() - started) * 4));
    syncLiveTimer();
  };
  const hide = () => {
    if (host.style.display !== "none") host.style.display = "none";
  };
  const position = () => {
    const { vw, vh } = viewport();
    const size = magnifierLensSize(vw, vh);
    const layout = magnifierLayout({ x: state.x, y: state.y, zoom: state.zoom, size, touch: state.touch, vw, vh });
    const hostCss = size + "|" + layout.left + "|" + layout.top;
    if (hostCss !== lastHostCss) {
      lastHostCss = hostCss;
      host.style.width = size + "px";
      host.style.height = size + "px";
      host.style.transform = "translate(" + layout.left + "px, " + layout.top + "px)";
    }
    const stageCss = "translate(" + layout.tx + "px, " + layout.ty + "px) scale(" + layout.zoom + ")";
    if (stageCss !== lastStageCss) {
      lastStageCss = stageCss;
      stage.style.transform = stageCss;
    }
    if (host.getAttribute("data-magnifier-zoom") !== String(layout.zoom)) host.setAttribute("data-magnifier-zoom", String(layout.zoom));
    if (host.style.display !== "block") host.style.display = "block";
    if (pendingScrolls.length) {
      const scrolls = pendingScrolls;
      pendingScrolls = [];
      scrolls.forEach(([node, scrollTop, scrollLeft]) => {
        node.scrollTop = scrollTop;
        node.scrollLeft = scrollLeft;
      });
    }
  };
  let frame = 0;
  let buildTimer = 0;
  let buildDue = Infinity;
  const runFrame = () => {
    frame = 0;
    if (destroyed) return;
    if (state.x === null || state.hidden || body.classList.contains("alloflow-launchpad-active")) {
      hide();
      return;
    }
    const hit = hitAt(state.x, state.y);
    if (hit && inStack(hit)) {
      hide();
      return;
    }
    const margin = lensSize() / (2 * state.zoom);
    if (!anchor || Math.abs(state.x - anchor.x) > margin || Math.abs(state.y - anchor.y) > margin) needBuild = true;
    if (needBuild) {
      const wait = lastBuild + buildGap - now();
      if (wait <= 0) rebuild(hit);
      else requestBuild(wait);
    }
    position();
  };
  const scheduleFrame = () => {
    if (!frame && !destroyed) frame = raf(runFrame);
  };
  const requestBuild = (delay) => {
    needBuild = true;
    const wait = Math.max(0, delay || 0);
    const due = now() + wait;
    if (buildTimer && due >= buildDue) return;
    if (buildTimer) win.clearTimeout(buildTimer);
    buildDue = due;
    buildTimer = win.setTimeout(() => {
      buildTimer = 0;
      buildDue = Infinity;
      scheduleFrame();
    }, wait);
  };
  let liveTimer = 0;
  const syncLiveTimer = () => {
    if (live.length && !liveTimer) {
      liveTimer = win.setInterval(() => {
        if (host.style.display === "none") return;
        live.forEach(([from, to]) => {
          if (from.isConnected) drawFrame(from, to);
        });
      }, 250);
    } else if (!live.length && liveTimer) {
      win.clearInterval(liveTimer);
      liveTimer = 0;
    }
  };
  let moveTimer = 0;
  const checkMoved = () => {
    moveTimer = 0;
    if (destroyed) return;
    const moved = tracked.some((item) => {
      if (!item.el.isConnected) return true;
      const r = item.el.getBoundingClientRect();
      return Math.abs(r.left - item.left) > 0.5 || Math.abs(r.top - item.top) > 0.5 || Math.abs(r.width - item.width) > 0.5 || Math.abs(r.height - item.height) > 0.5;
    });
    if (moved) requestBuild(0);
  };
  const isStyleNode = (n) => !!n && (n.nodeName === "STYLE" || n.nodeName === "LINK" || n.parentNode && n.parentNode.nodeName === "STYLE");
  const hasStyleNode = (list) => {
    for (let i = 0; i < list.length; i += 1) if (isStyleNode(list[i])) return true;
    return false;
  };
  const touchesCopy = (t) => {
    if (!region || t === region || t.contains && t.contains(region)) return true;
    for (let i = 0; i < tracked.length; i += 1) if (tracked[i].el.contains(t)) return true;
    return false;
  };
  const observer = typeof win.MutationObserver === "function" ? new win.MutationObserver((records) => {
    let rebuildSoon = false;
    let maybeMoved = false;
    for (const rec of records) {
      const t = rec.target;
      if (t === host) continue;
      if (isStyleNode(t) || hasStyleNode(rec.addedNodes) || hasStyleNode(rec.removedNodes)) {
        stylesDirty = true;
        rebuildSoon = true;
      }
      if (touchesCopy(t)) rebuildSoon = true;
      else maybeMoved = true;
    }
    if (rebuildSoon) requestBuild(200);
    else if (maybeMoved && !moveTimer) moveTimer = win.setTimeout(checkMoved, 250);
  }) : null;
  if (observer) {
    observer.observe(body, { subtree: true, childList: true, characterData: true, attributes: true });
    if (doc.head) observer.observe(doc.head, { subtree: true, childList: true, characterData: true, attributes: true });
    observer.observe(doc.documentElement, { attributes: true });
  }
  const moveTo = (x, y, touch) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    state.x = x;
    state.y = y;
    state.touch = !!touch;
    state.hidden = false;
    scheduleFrame();
  };
  const defaultPoint = () => {
    const { vw, vh } = viewport();
    const pane = doc.getElementById("workspace-preview-pane");
    if (pane) {
      const r = pane.getBoundingClientRect();
      const left = Math.max(0, r.left), right = Math.min(vw, r.right), top = Math.max(0, r.top), bottom = Math.min(vh, r.bottom);
      if (right - left > 40 && bottom - top > 40) return { x: (left + right) / 2, y: (top + bottom) / 2 };
    }
    return { x: vw / 2, y: vh / 2 };
  };
  let lastInput = "pointer";
  const hasTouchEvents = typeof win.TouchEvent === "function" || "ontouchstart" in win;
  const onPointer = (event) => {
    if (event.type === "pointerdown" || event.type === "mousedown") lastInput = "pointer";
    if (event.pointerType === "touch" && hasTouchEvents) return;
    moveTo(event.clientX, event.clientY, event.pointerType === "touch");
  };
  const onTouch = (event) => {
    lastInput = "pointer";
    if (!event.touches || event.touches.length !== 1) return;
    moveTo(event.touches[0].clientX, event.touches[0].clientY, true);
  };
  const onMouseOut = (event) => {
    if (!event.relatedTarget && state.x !== null) {
      state.hidden = true;
      scheduleFrame();
    }
  };
  const editable = (t) => !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || ""));
  const modalOpen = () => Array.from(doc.querySelectorAll('[aria-modal=true], dialog[open], [role="alertdialog"]')).some((el) => el.isConnected && !el.closest('[hidden], [aria-hidden="true"], dialog:not([open])'));
  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      if (event.defaultPrevented || event.isComposing || editable(event.target) || modalOpen()) return;
      if (typeof opts.onEscape === "function") opts.onEscape();
      return;
    }
    lastInput = "keyboard";
  };
  const onFocusIn = (event) => {
    const t = event.target;
    if (lastInput !== "keyboard" || !t || t === body || t === doc.documentElement || inStack(t) || typeof t.getBoundingClientRect !== "function") return;
    const r = t.getBoundingClientRect();
    if (emptyRect(r)) return;
    const { vw, vh } = viewport();
    moveTo((Math.max(0, r.left) + Math.min(vw, r.right)) / 2, (Math.max(0, r.top) + Math.min(vh, r.bottom)) / 2, false);
  };
  const onScroll = () => requestBuild(50);
  const onResize = () => {
    requestBuild(0);
    scheduleFrame();
  };
  const pointerEvents = typeof win.PointerEvent === "function";
  const moveType = pointerEvents ? "pointermove" : "mousemove";
  const downType = pointerEvents ? "pointerdown" : "mousedown";
  const passive = { passive: true };
  win.addEventListener(moveType, onPointer, passive);
  win.addEventListener(downType, onPointer, passive);
  win.addEventListener("touchstart", onTouch, passive);
  win.addEventListener("touchmove", onTouch, passive);
  doc.addEventListener("mouseout", onMouseOut, passive);
  win.addEventListener("keydown", onKeyDown);
  win.addEventListener("focusin", onFocusIn);
  win.addEventListener("scroll", onScroll, { capture: true, passive: true });
  win.addEventListener("resize", onResize, passive);
  if (win.visualViewport) win.visualViewport.addEventListener("resize", onResize, passive);
  const start = defaultPoint();
  moveTo(start.x, start.y, false);
  return {
    host,
    builds: () => buildCount,
    setZoom(value) {
      const zoom = normalizeMagnifierZoom(value);
      if (zoom === state.zoom) return;
      state.zoom = zoom;
      requestBuild(0);
      scheduleFrame();
    },
    nudge(dx, dy) {
      const { vw, vh } = viewport();
      const from = state.x === null ? defaultPoint() : { x: state.x, y: state.y };
      moveTo(Math.max(0, Math.min(vw, from.x + dx)), Math.max(0, Math.min(vh, from.y + dy)), false);
    },
    point() {
      return { x: state.x, y: state.y, touch: state.touch, hidden: state.hidden, zoom: state.zoom };
    },
    destroy() {
      destroyed = true;
      if (frame) caf(frame);
      if (buildTimer) win.clearTimeout(buildTimer);
      if (moveTimer) win.clearTimeout(moveTimer);
      if (liveTimer) win.clearInterval(liveTimer);
      if (observer) observer.disconnect();
      win.removeEventListener(moveType, onPointer);
      win.removeEventListener(downType, onPointer);
      win.removeEventListener("touchstart", onTouch);
      win.removeEventListener("touchmove", onTouch);
      doc.removeEventListener("mouseout", onMouseOut);
      win.removeEventListener("keydown", onKeyDown);
      win.removeEventListener("focusin", onFocusIn);
      win.removeEventListener("scroll", onScroll, true);
      win.removeEventListener("resize", onResize);
      if (win.visualViewport) win.visualViewport.removeEventListener("resize", onResize);
      styleCopies.clear();
      host.remove();
    }
  };
}
function FabStack(props) {
  const noop = () => null;
  const AlignJustify = window.AlignJustify || noop;
  const Clock = window.Clock || noop;
  const Eye = window.Eye || noop;
  const Gamepad2 = window.Gamepad2 || noop;
  const HelpCircle = window.HelpCircle || noop;
  const MessageCircleQuestion = window.MessageCircleQuestion || noop;
  const Mic = window.Mic || noop;
  const MicOff = window.MicOff || noop;
  const ScanLine = window.ScanLine || noop;
  const Search = window.Search || noop;
  const ScanSearch = window.ScanSearch || window.Search || noop;
  const Volume2 = window.Volume2 || noop;
  const Wrench = window.Wrench || noop;
  const {
    activeView,
    addToast,
    focusMode,
    generatedContent,
    handleSetIsSyntaxGameToTrue,
    handleSetShowStudyTimerModalToTrue,
    handleToggleFocusMode,
    handleToggleIsFabExpanded,
    handleToggleReadingRuler,
    handleToggleShowSocraticChat,
    handleToggleVisualSupports,
    interactionMode,
    isCompareMode,
    isDictationMode,
    dictationStatus,
    isFabExpanded,
    isFluencyMode,
    isLineFocusMode,
    isStudyTimerRunning,
    isTeacherMode,
    readingRuler,
    runTour,
    setFocusedParagraphIndex,
    setInteractionMode,
    setIsCompareMode,
    setIsDictationMode,
    setIsFluencyMode,
    setIsLineFocusMode,
    setRevisionData,
    setSelectionMenu,
    showSocraticChat,
    showVisualSupports,
    stopPlayback,
    studentProjectSettings,
    studentAiFeaturesHidden,
    t
  } = props;
  const toolLabel = (key, fallback) => {
    const value = t(key);
    return value && value !== key ? value : fallback;
  };
  const toolsTitle = isTeacherMode ? toolLabel("student_tools.teacher_title", "Reading tools") : toolLabel("student_tools.title", "Student tools");
  const toolsOpenLabel = isTeacherMode ? toolLabel("toolbar.reading_tools_open", "Open reading tools") : t("toolbar.student_tools_open");
  const toolsCloseLabel = isTeacherMode ? toolLabel("toolbar.reading_tools_close", "Close reading tools") : t("toolbar.student_tools_close");
  const panelRef = React.useRef(null);
  const toggleRef = React.useRef(null);
  const stackRef = React.useRef(null);
  const [footerClearance, setFooterClearance] = React.useState(0);
  const magnifierSupported = typeof window.Element === "function" && typeof window.Element.prototype.attachShadow === "function";
  const [magnifierOn, setMagnifierOn] = React.useState(() => magnifierSupported && readMagnifierPref(MAGNIFIER_STORAGE_KEY) === "1");
  const [magnifierZoom, setMagnifierZoom] = React.useState(() => normalizeMagnifierZoom(readMagnifierPref(MAGNIFIER_ZOOM_STORAGE_KEY)));
  const magnifierRef = React.useRef(null);
  const magnifierLabel = toolLabel("student_tools.magnifier", "Magnifier");
  const magnifierHint = toolLabel("student_tools.magnifier_hint", "Enlarges what is under your pointer or finger");
  const magnifierZoomLabel = toolLabel("student_tools.magnifier_zoom", "Magnifier strength");
  const magnifierKeysHint = toolLabel("student_tools.magnifier_keys", "With this button focused, arrow keys move the magnifier. Esc turns it off.");
  const dictationPhase = dictationStatus?.state || (isDictationMode ? "listening" : "idle");
  const dictationEngineLabel = dictationStatus?.engineLabel || "";
  const dictationBusy = dictationPhase === "starting" || dictationPhase === "transcribing";
  const dictationAnnouncement = dictationStatus?.message || (dictationPhase !== "idle" ? dictationEngineLabel : "");
  const dictationActionLabel = isDictationMode ? t("toolbar.dictation_stop") : t("toolbar.dictation_start");
  const dictationIsActive = isDictationMode || dictationBusy;
  const showInputAndPractice = !isTeacherMode && !studentAiFeaturesHidden && studentProjectSettings.allowSocraticTutor || activeView === "simplified" && generatedContent || isTeacherMode || studentProjectSettings.allowDictation || dictationStatus && dictationAnnouncement;
  React.useEffect(() => {
    if (!isFabExpanded) return void 0;
    const focusTimer = window.setTimeout(() => {
      const firstTool = panelRef.current?.querySelector('[data-student-tool="true"]:not([disabled])');
      if (firstTool) firstTool.focus();
    }, 0);
    return () => window.clearTimeout(focusTimer);
  }, [isFabExpanded]);
  React.useEffect(() => {
    const workspace = document.getElementById("workspace-preview-pane");
    if (!generatedContent || !workspace) {
      setFooterClearance(0);
      return void 0;
    }
    let frame = 0;
    let footer = null;
    const measure = () => {
      frame = 0;
      const candidate = workspace.querySelector("[data-resource-navigation]") || Array.from(workspace.children).find((node) => node.classList.contains("shrink-0") && node.classList.contains("no-print") && node.querySelectorAll(":scope > button").length === 2);
      if (candidate !== footer) {
        if (footer) observer?.unobserve(footer);
        footer = candidate || null;
        if (footer) observer?.observe(footer);
      }
      const rect = footer?.getBoundingClientRect();
      const stack = stackRef.current?.getBoundingClientRect();
      const viewportBottom = window.innerHeight;
      const overlapsHorizontally = rect && stack && rect.right > stack.left && rect.left < stack.right;
      const visible = rect && rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < viewportBottom;
      const next = visible && overlapsHorizontally ? Math.max(0, Math.ceil(viewportBottom - rect.top + 12)) : 0;
      setFooterClearance((previous) => previous === next ? previous : next);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(schedule) : null;
    observer?.observe(workspace);
    if (stackRef.current) observer?.observe(stackRef.current);
    const mutations = typeof MutationObserver === "function" ? new MutationObserver(schedule) : null;
    mutations?.observe(workspace, { childList: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    window.visualViewport?.addEventListener("resize", schedule);
    measure();
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer?.disconnect();
      mutations?.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      window.visualViewport?.removeEventListener("resize", schedule);
    };
  }, [!!generatedContent, activeView, runTour]);
  React.useEffect(() => {
    const root = document.documentElement;
    const stack = stackRef.current;
    if (!stack) return void 0;
    let frame = 0;
    const publish = () => {
      frame = 0;
      const rect = stack.getBoundingClientRect();
      if (!rect.height) {
        root.style.removeProperty("--alloflow-fab-stack-clear");
        return;
      }
      const rem = parseFloat(window.getComputedStyle(root).fontSize) || 16;
      root.style.setProperty("--alloflow-fab-stack-clear", Math.max(5.5 * rem, Math.ceil(window.innerHeight - rect.top + 12)) + "px");
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(publish);
    };
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(schedule) : null;
    observer?.observe(stack);
    window.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    publish();
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      root.style.removeProperty("--alloflow-fab-stack-clear");
    };
  }, [footerClearance, runTour]);
  React.useEffect(() => {
    rememberMagnifierPref(MAGNIFIER_STORAGE_KEY, magnifierOn ? "1" : "0", "0");
  }, [magnifierOn]);
  React.useEffect(() => {
    rememberMagnifierPref(MAGNIFIER_ZOOM_STORAGE_KEY, String(magnifierZoom), "2");
  }, [magnifierZoom]);
  React.useEffect(() => {
    if (!magnifierOn) return void 0;
    const lens = createPageMagnifier({ zoom: magnifierZoom, getStack: () => stackRef.current, onEscape: () => setMagnifierOn(false) });
    magnifierRef.current = lens;
    return () => {
      if (lens) lens.destroy();
      if (magnifierRef.current === lens) magnifierRef.current = null;
    };
  }, [magnifierOn]);
  React.useEffect(() => {
    if (magnifierRef.current) magnifierRef.current.setZoom(magnifierZoom);
  }, [magnifierZoom]);
  const handleMagnifierKeyDown = (event) => {
    const lens = magnifierRef.current;
    if (!magnifierOn || !lens) return;
    const step = event.shiftKey ? 96 : 24;
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    lens.nudge(move[0], move[1]);
  };
  const closeStudentTools = () => {
    if (!isFabExpanded) return;
    handleToggleIsFabExpanded();
    window.setTimeout(() => toggleRef.current?.focus(), 0);
  };
  const handlePanelKeyDown = (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    closeStudentTools();
  };
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("style", null, `
        body.alloflow-launchpad-active .alloflow-fab-stack,
        body.alloflow-launchpad-active .alloflow-magnifier-lens {
          display: none !important;
        }
        @media print {
          .alloflow-magnifier-lens { display: none !important; }
        }
        .alloflow-magnifier-zoom-option {
          min-width: 44px;
          min-height: 44px;
        }

        .alloflow-fab-stack {
          --alloflow-fab-bottom: max(calc(32px + env(safe-area-inset-bottom, 0px)), var(--alloflow-fab-footer-clearance, 0px), var(--alloflow-host-corner-clear, 0px));
          bottom: var(--alloflow-fab-bottom) !important;
          transition-property: opacity, transform;
        }

        .alloflow-student-tools-panel {
          position: absolute;
          z-index: 2;
          right: 0;
          bottom: 64px;
          width: min(380px, calc(100vw - 32px));
          max-height: min(72vh, 680px, calc(100dvh - var(--alloflow-fab-bottom) - 80px));
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid rgba(148, 163, 184, 0.46);
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.96);
          box-shadow: 0 26px 70px -28px rgba(15, 23, 42, 0.52), 0 12px 28px -18px rgba(79, 70, 229, 0.34);
          transform-origin: bottom right;
        }
        .alloflow-student-tools-handle {
          display: none;
        }
        .alloflow-student-tools-body {
          overflow-y: auto;
          overscroll-behavior: contain;
          scrollbar-gutter: stable;
        }
        .alloflow-student-tools-section + .alloflow-student-tools-section {
          border-top: 1px solid rgba(226, 232, 240, 0.9);
        }
        .alloflow-student-tools-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }
        .alloflow-student-tool {
          width: 100%;
          min-width: 0;
          min-height: 44px;
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid rgba(226, 232, 240, 0.94);
          border-radius: 14px;
          padding: 9px 10px;
          text-align: left;
        }
        .alloflow-student-tool-icon {
          width: 30px;
          height: 30px;
          flex: 0 0 30px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.58);
          box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.18);
        }
        .alloflow-student-tool:focus-visible,
        .alloflow-student-tools-close:focus-visible,
        .alloflow-student-tools-launcher:focus-visible {
          outline: 3px solid #818cf8;
          outline-offset: 3px;
        }
        .alloflow-student-tools-close {
          min-width: 44px;
          min-height: 44px;
        }
        .alloflow-student-tools-launcher {
          position: relative;
          z-index: 1;
          min-width: 48px;
          min-height: 48px;
        }

        @media (max-width: 767px) {
          .alloflow-fab-stack {
            --alloflow-fab-bottom: max(calc(14px + env(safe-area-inset-bottom, 0px)), var(--alloflow-fab-footer-clearance, 0px), var(--alloflow-host-corner-clear, 0px));
            right: calc(12px + env(safe-area-inset-right, 0px)) !important;
          }
          .alloflow-student-tools-panel {
            position: fixed !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100% !important;
            max-height: min(82dvh, 720px) !important;
            border-right: 0 !important;
            border-bottom: 0 !important;
            border-left: 0 !important;
            border-radius: 26px 26px 0 0 !important;
            padding-bottom: max(env(safe-area-inset-bottom, 0px), var(--alloflow-host-corner-clear, 0px));
            transform-origin: bottom center;
          }
          .alloflow-student-tools-handle {
            display: block;
          }
        }

        @media (max-width: 359px) {
          .alloflow-student-tools-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .alloflow-student-tools-panel,
          .alloflow-student-tool,
          .alloflow-student-tools-close,
          .alloflow-student-tools-launcher {
            animation: none !important;
            scroll-behavior: auto !important;
            transition: none !important;
            transform: none !important;
          }
        }

        .theme-dark .alloflow-student-tools-panel { background: rgba(15, 23, 42, 0.97); border-color: #475569; }
        .theme-dark .alloflow-student-tools-section + .alloflow-student-tools-section { border-top-color: #334155; }
        .theme-dark .alloflow-student-tool-icon { background: rgba(30, 41, 59, 0.7); }
        .theme-contrast .alloflow-student-tools-panel { background: #000000; border: 2px solid #ffff00; }
        .theme-contrast .alloflow-student-tools-section + .alloflow-student-tools-section { border-top-color: #ffff00; }
        .theme-contrast .alloflow-student-tool-icon { background: #000000; box-shadow: inset 0 0 0 1px #ffff00; }
        .theme-dark .alloflow-magnifier-zoom { background: rgba(30, 41, 59, 0.7); border-color: #475569; }
        .theme-contrast .alloflow-magnifier-zoom { background: #000000; border-color: #ffff00; }
        @media (forced-colors: active) {
          .alloflow-magnifier-zoom-option[aria-pressed="true"] {
            outline: 2px solid Highlight;
            outline-offset: -3px;
          }
          .alloflow-student-tools-panel,
          .alloflow-student-tools-section,
          .alloflow-student-tool,
          .alloflow-magnifier-zoom,
          .alloflow-magnifier-zoom-option,
          .alloflow-student-tools-close,
          .alloflow-student-tools-launcher {
            border: 1px solid ButtonBorder !important;
            background: Canvas !important;
            color: CanvasText !important;
            box-shadow: none !important;
            forced-color-adjust: auto;
          }
          .alloflow-student-tool[aria-pressed="true"] {
            outline: 2px solid Highlight;
            outline-offset: -3px;
          }
        }
      `), /* @__PURE__ */ React.createElement(
    "div",
    {
      ref: stackRef,
      "data-floating-control": "fab-stack",
      style: { zIndex: 180, "--alloflow-fab-footer-clearance": `${footerClearance}px` },
      className: `alloflow-floating-control alloflow-fab-stack ${isFabExpanded ? "is-expanded" : ""} fixed bottom-24 md:bottom-8 z-[180] flex flex-col items-end no-print transition-all duration-300 motion-reduce:transition-none ${runTour ? "right-[530px]" : "right-6"}`
    },
    isFabExpanded && /* @__PURE__ */ React.createElement(
      "div",
      {
        id: "alloflow-student-tools-panel",
        ref: panelRef,
        role: "dialog",
        "aria-labelledby": "alloflow-student-tools-title",
        onKeyDown: handlePanelKeyDown,
        "data-help-toggle": "true",
        className: "alloflow-student-tools-panel backdrop-blur-xl animate-in slide-in-from-bottom-3 fade-in duration-200 motion-reduce:animate-none"
      },
      /* @__PURE__ */ React.createElement("div", { className: "alloflow-student-tools-handle mx-auto mt-2 h-1 w-10 rounded-full bg-slate-300", "aria-hidden": "true" }),
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 border-b border-slate-200/80 px-4 py-3" }, /* @__PURE__ */ React.createElement("span", { className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-700 shadow-inner", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement(Wrench, { size: 20 })), /* @__PURE__ */ React.createElement("div", { className: "min-w-0 flex-1" }, /* @__PURE__ */ React.createElement("h2", { id: "alloflow-student-tools-title", className: "text-sm font-black text-slate-900" }, toolsTitle), !isTeacherMode && /* @__PURE__ */ React.createElement("p", { className: "mt-0.5 text-xs font-medium text-slate-500" }, t("student_tools.subtitle") || "Read, focus, and practice your way")), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: closeStudentTools,
          className: "alloflow-student-tools-close inline-flex items-center justify-center rounded-xl text-2xl leading-none text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 motion-reduce:transition-none",
          "aria-label": toolsCloseLabel
        },
        /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\xD7")
      )),
      /* @__PURE__ */ React.createElement("div", { className: "alloflow-student-tools-body custom-scrollbar" }, activeView === "simplified" && generatedContent && /* @__PURE__ */ React.createElement("section", { className: "alloflow-student-tools-section px-4 py-3", "aria-labelledby": "alloflow-student-tools-read-heading" }, /* @__PURE__ */ React.createElement("div", { className: "mb-2 flex items-center justify-between gap-3" }, /* @__PURE__ */ React.createElement("h3", { id: "alloflow-student-tools-read-heading", className: "text-[11px] font-black uppercase tracking-[0.16em] text-slate-500" }, t("student_tools.read") || "Read"), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-semibold text-slate-600" }, t("simplified.mode_label"))), /* @__PURE__ */ React.createElement("div", { className: "alloflow-student-tools-grid" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          "data-student-tool": "true",
          onClick: () => {
            setInteractionMode("read");
            stopPlayback();
            setSelectionMenu(null);
            setRevisionData(null);
            setIsFluencyMode(false);
          },
          className: `alloflow-student-tool transition-colors shadow-sm motion-reduce:transition-none ${interactionMode === "read" && !isFluencyMode ? "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500" : "bg-white text-slate-700 hover:bg-slate-50"}`,
          title: t("simplified.tip_read"),
          "aria-label": t("simplified.read_mode"),
          "aria-pressed": interactionMode === "read" && !isFluencyMode,
          "data-help-key": "tool_read_mode"
        },
        /* @__PURE__ */ React.createElement("span", { className: "alloflow-student-tool-icon", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement(Volume2, { size: 18 })),
        /* @__PURE__ */ React.createElement("span", { className: "min-w-0 text-xs font-bold leading-tight" }, t("simplified.read_mode"))
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          "data-student-tool": "true",
          onClick: () => {
            setInteractionMode("define");
            stopPlayback();
            setSelectionMenu(null);
            setRevisionData(null);
          },
          className: `alloflow-student-tool transition-colors shadow-sm motion-reduce:transition-none ${interactionMode === "define" ? "bg-yellow-100 text-yellow-900 ring-2 ring-yellow-500" : "bg-white text-slate-700 hover:bg-slate-50"}`,
          title: t("simplified.tip_define"),
          "aria-label": t("simplified.define_mode"),
          "aria-pressed": interactionMode === "define",
          "data-help-key": "tool_define_mode"
        },
        /* @__PURE__ */ React.createElement("span", { className: "alloflow-student-tool-icon", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement(Search, { size: 18 })),
        /* @__PURE__ */ React.createElement("span", { className: "min-w-0 text-xs font-bold leading-tight" }, t("simplified.define_mode"))
      ), !studentAiFeaturesHidden && /* @__PURE__ */ React.createElement(
        "button",
        {
          "data-student-tool": "true",
          "data-help-toggle": "true",
          onClick: () => {
            setInteractionMode((prev) => prev === "explain" ? "read" : "explain");
            stopPlayback();
          },
          className: `alloflow-student-tool transition-colors shadow-sm motion-reduce:transition-none ${interactionMode === "explain" ? "bg-teal-100 text-teal-900 ring-2 ring-teal-500" : "bg-white text-slate-700 hover:bg-slate-50"}`,
          title: t("simplified.tip_explain"),
          "aria-label": t("simplified.explain_mode"),
          "aria-pressed": interactionMode === "explain",
          "data-help-key": "tool_explain_mode"
        },
        /* @__PURE__ */ React.createElement("span", { className: "alloflow-student-tool-icon", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement(HelpCircle, { size: 18 })),
        /* @__PURE__ */ React.createElement("span", { className: "min-w-0 text-xs font-bold leading-tight" }, t("simplified.explain_mode"))
      ))), /* @__PURE__ */ React.createElement("section", { className: "alloflow-student-tools-section px-4 py-3", "aria-labelledby": "alloflow-student-tools-focus-heading" }, /* @__PURE__ */ React.createElement("h3", { id: "alloflow-student-tools-focus-heading", className: "mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500" }, t("student_tools.focus") || "Focus"), /* @__PURE__ */ React.createElement("div", { className: "alloflow-student-tools-grid" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          "data-student-tool": "true",
          onClick: handleToggleReadingRuler,
          className: `alloflow-student-tool transition-colors shadow-sm motion-reduce:transition-none ${readingRuler ? "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500" : "bg-white text-slate-700 hover:bg-slate-50"}`,
          title: t("a11y.toggle_ruler"),
          "aria-label": t("a11y.toggle_ruler"),
          "aria-pressed": readingRuler,
          "data-help-key": "fab_ruler"
        },
        /* @__PURE__ */ React.createElement("span", { className: "alloflow-student-tool-icon", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement(ScanLine, { size: 18 })),
        /* @__PURE__ */ React.createElement("span", { className: "min-w-0 text-xs font-bold leading-tight" }, t("a11y.toggle_ruler"))
      ), magnifierSupported && /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          "data-student-tool": "true",
          "data-magnifier-toggle": "",
          onClick: () => setMagnifierOn((value) => !value),
          onKeyDown: handleMagnifierKeyDown,
          className: `alloflow-student-tool transition-colors shadow-sm motion-reduce:transition-none ${magnifierOn ? "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500" : "bg-white text-slate-700 hover:bg-slate-50"}`,
          title: magnifierLabel,
          "aria-label": magnifierLabel,
          "aria-pressed": magnifierOn,
          "aria-describedby": magnifierOn ? "student-tools-magnifier-hint student-tools-magnifier-keys" : "student-tools-magnifier-hint"
        },
        /* @__PURE__ */ React.createElement("span", { className: "alloflow-student-tool-icon", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement(ScanSearch, { size: 18 })),
        /* @__PURE__ */ React.createElement("span", { className: "min-w-0 text-xs font-bold leading-tight" }, /* @__PURE__ */ React.createElement("span", { className: "block" }, magnifierLabel), /* @__PURE__ */ React.createElement("span", { id: "student-tools-magnifier-hint", className: "mt-1 block text-[11px] font-normal" }, magnifierHint))
      ), magnifierSupported && magnifierOn && /* @__PURE__ */ React.createElement("div", { className: "alloflow-magnifier-zoom col-span-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2", "data-magnifier-zoom-group": "" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { id: "student-tools-magnifier-zoom-label", className: "text-xs font-bold text-slate-700" }, magnifierZoomLabel), /* @__PURE__ */ React.createElement("div", { role: "group", "aria-labelledby": "student-tools-magnifier-zoom-label", className: "flex gap-1.5" }, MAGNIFIER_ZOOMS.map((zoom) => /* @__PURE__ */ React.createElement(
        "button",
        {
          key: zoom,
          type: "button",
          "data-magnifier-zoom": String(zoom),
          "aria-pressed": magnifierZoom === zoom,
          onClick: () => setMagnifierZoom(zoom),
          className: `alloflow-magnifier-zoom-option rounded-lg border px-2 text-sm font-black transition-colors motion-reduce:transition-none ${magnifierZoom === zoom ? "border-indigo-500 bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"}`
        },
        formatMagnifierZoom(zoom)
      )))), /* @__PURE__ */ React.createElement("p", { id: "student-tools-magnifier-keys", className: "mt-1 text-[11px] text-slate-600" }, magnifierKeysHint)), /* @__PURE__ */ React.createElement(
        "button",
        {
          "data-student-tool": "true",
          onClick: handleSetShowStudyTimerModalToTrue,
          className: `alloflow-student-tool transition-colors shadow-sm motion-reduce:transition-none ${isStudyTimerRunning ? "bg-green-100 text-green-800 ring-2 ring-green-500" : "bg-white text-slate-700 hover:bg-slate-50"}`,
          title: t("a11y.task_timer"),
          "aria-label": t("a11y.task_timer"),
          "aria-pressed": isStudyTimerRunning,
          "data-help-key": "fab_timer"
        },
        /* @__PURE__ */ React.createElement("span", { className: "alloflow-student-tool-icon", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement(Clock, { size: 18 })),
        /* @__PURE__ */ React.createElement("span", { className: "min-w-0 text-xs font-bold leading-tight" }, t("a11y.task_timer"))
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          "data-student-tool": "true",
          onClick: handleToggleFocusMode,
          className: `alloflow-student-tool transition-colors shadow-sm motion-reduce:transition-none ${focusMode ? "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500" : "bg-white text-slate-700 hover:bg-slate-50"}`,
          title: t("settings.text.bionic") || "Bionic Reading Style",
          "aria-label": t("settings.text.bionic") || "Bionic Reading Style",
          "aria-pressed": focusMode,
          "data-help-key": "fab_focus",
          "aria-describedby": "student-tools-bionic-hint"
        },
        /* @__PURE__ */ React.createElement("span", { className: "alloflow-student-tool-icon", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement(Eye, { size: 18 })),
        /* @__PURE__ */ React.createElement("span", { className: "min-w-0 text-xs font-bold leading-tight" }, /* @__PURE__ */ React.createElement("span", { className: "block" }, t("settings.text.bionic") || "Bionic Reading Style"), /* @__PURE__ */ React.createElement("span", { id: "student-tools-bionic-hint", className: "mt-1 block text-[11px] font-normal" }, t("settings.text.bionic_sub") || "Bolds the beginning of each word"))
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          "data-student-tool": "true",
          onClick: handleToggleVisualSupports,
          className: `alloflow-student-tool transition-colors shadow-sm motion-reduce:transition-none ${showVisualSupports ? "bg-purple-100 text-purple-700 ring-2 ring-purple-500" : "bg-white text-slate-700 hover:bg-slate-50"}`,
          title: t("fab.visual_supports") || "Visual Supports",
          "aria-label": t("fab.visual_supports") || "Visual Supports",
          "aria-pressed": showVisualSupports
        },
        /* @__PURE__ */ React.createElement("span", { className: "alloflow-student-tool-icon", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 18, lineHeight: 1 } }, "\u{1F5BC}\uFE0F")),
        /* @__PURE__ */ React.createElement("span", { className: "min-w-0 text-xs font-bold leading-tight" }, t("fab.visual_supports") || "Visual Supports")
      ), activeView === "simplified" && /* @__PURE__ */ React.createElement(
        "button",
        {
          "data-student-tool": "true",
          onClick: () => {
            setIsLineFocusMode(!isLineFocusMode);
            setFocusedParagraphIndex(null);
          },
          className: `alloflow-student-tool transition-colors shadow-sm motion-reduce:transition-none ${isLineFocusMode ? "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500" : "bg-white text-slate-700 hover:bg-slate-50"}`,
          title: t("student_tools.paragraph_focus") || "Paragraph focus",
          "aria-label": t("student_tools.paragraph_focus") || "Paragraph focus",
          "aria-pressed": isLineFocusMode,
          "data-help-key": "fab_line_focus",
          "aria-describedby": "student-tools-paragraph-focus-hint"
        },
        /* @__PURE__ */ React.createElement("span", { className: "alloflow-student-tool-icon", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement(AlignJustify, { size: 18 })),
        /* @__PURE__ */ React.createElement("span", { className: "min-w-0 text-xs font-bold leading-tight" }, /* @__PURE__ */ React.createElement("span", { className: "block" }, t("student_tools.paragraph_focus") || "Paragraph focus"), /* @__PURE__ */ React.createElement("span", { id: "student-tools-paragraph-focus-hint", className: "mt-1 block text-[11px] font-normal" }, t("student_tools.paragraph_focus_hint") || "Keeps the active paragraph clear"))
      ))), showInputAndPractice && /* @__PURE__ */ React.createElement("section", { className: "alloflow-student-tools-section px-4 py-3", "aria-labelledby": "alloflow-student-tools-input-heading" }, /* @__PURE__ */ React.createElement("h3", { id: "alloflow-student-tools-input-heading", className: "mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500" }, t("student_tools.input_practice") || "Input & practice"), /* @__PURE__ */ React.createElement("div", { className: "alloflow-student-tools-grid" }, !isTeacherMode && !studentAiFeaturesHidden && studentProjectSettings.allowSocraticTutor && /* @__PURE__ */ React.createElement(
        "button",
        {
          "data-student-tool": "true",
          onClick: handleToggleShowSocraticChat,
          className: `alloflow-student-tool transition-colors shadow-sm motion-reduce:transition-none ${showSocraticChat ? "bg-teal-700 text-white ring-2 ring-teal-400" : "bg-teal-100 text-teal-800 hover:bg-teal-200"}`,
          title: t("socratic.title"),
          "aria-label": t("socratic.ask_for_help"),
          "aria-pressed": showSocraticChat,
          "data-help-key": "socratic_toggle"
        },
        /* @__PURE__ */ React.createElement("span", { className: "alloflow-student-tool-icon", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement(MessageCircleQuestion, { size: 18 })),
        /* @__PURE__ */ React.createElement("span", { className: "min-w-0 text-xs font-bold leading-tight" }, t("socratic.ask_for_help"))
      ), activeView === "simplified" && generatedContent && /* @__PURE__ */ React.createElement(
        "button",
        {
          "data-student-tool": "true",
          onClick: handleSetIsSyntaxGameToTrue,
          className: "alloflow-student-tool border-orange-200 bg-orange-100 text-orange-900 shadow-sm transition-colors hover:bg-orange-200 motion-reduce:transition-none",
          title: t("simplified.tip_scramble"),
          "aria-label": t("games.syntax.title"),
          "data-help-key": "tool_syntax_game"
        },
        /* @__PURE__ */ React.createElement("span", { className: "alloflow-student-tool-icon", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement(Gamepad2, { size: 18 })),
        /* @__PURE__ */ React.createElement("span", { className: "min-w-0 text-xs font-bold leading-tight" }, t("games.syntax.title"))
      ), (isTeacherMode || studentProjectSettings.allowDictation) && /* @__PURE__ */ React.createElement(
        "button",
        {
          "data-student-tool": "true",
          type: "button",
          onClick: (e) => {
            e.preventDefault();
            const voice = window.AlloFlowVoice;
            const supported = voice && typeof voice.isDictationSupported === "function" ? voice.isDictationSupported() : !!(window.SpeechRecognition || window.webkitSpeechRecognition);
            if (!supported) {
              addToast(t("roles.voice_not_supported"), "error");
              return;
            }
            setIsDictationMode(!isDictationMode);
          },
          disabled: dictationPhase === "transcribing",
          className: `alloflow-student-tool transition-colors shadow-sm disabled:cursor-wait motion-reduce:transition-none ${dictationIsActive ? "bg-red-700 text-white animate-pulse motion-reduce:animate-none shadow-red-500/50" : "bg-white text-slate-700 hover:bg-slate-50"}`,
          title: [t("toolbar.dictation_toggle"), dictationEngineLabel].filter(Boolean).join(" \u2014 "),
          "aria-label": dictationActionLabel,
          "aria-pressed": isDictationMode,
          "aria-busy": dictationBusy,
          "data-dictation-engine": dictationStatus?.engine || "",
          "data-help-key": "fab_dictation"
        },
        /* @__PURE__ */ React.createElement("span", { className: "alloflow-student-tool-icon", "aria-hidden": "true" }, dictationIsActive ? /* @__PURE__ */ React.createElement(Mic, { size: 18 }) : /* @__PURE__ */ React.createElement(MicOff, { size: 18 })),
        /* @__PURE__ */ React.createElement("span", { className: "min-w-0 text-xs font-bold leading-tight" }, dictationActionLabel)
      ), dictationStatus && dictationAnnouncement && /* @__PURE__ */ React.createElement(
        "div",
        {
          role: dictationPhase === "error" ? "alert" : "status",
          "aria-live": dictationPhase === "error" ? "assertive" : "polite",
          "aria-atomic": "true",
          className: `alloflow-student-tools-status col-span-full rounded-xl border px-3 py-2 text-xs leading-snug ${dictationPhase === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-slate-200 bg-slate-50 text-slate-700"}`
        },
        /* @__PURE__ */ React.createElement("div", { className: "font-bold" }, dictationAnnouncement),
        dictationStatus.privacy && /* @__PURE__ */ React.createElement("div", { className: "mt-0.5 text-[11px] text-slate-600" }, dictationStatus.privacy)
      )))),
      !isTeacherMode && window.AlloModules && window.AlloModules.ErrorReporter && typeof window.AlloModules.ErrorReporter.openPanel === "function" && /* @__PURE__ */ React.createElement("div", { className: "border-t border-slate-200/80 px-4 py-1" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          "data-student-report-problem": "",
          onClick: () => {
            closeStudentTools();
            window.setTimeout(() => window.AlloModules.ErrorReporter.openPanel("errors"), 0);
          },
          className: "min-h-11 text-xs font-bold text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
        },
        t("student_tools.report_problem") || "Something not working? Report a problem"
      ))
    ),
    /* @__PURE__ */ React.createElement(
      "button",
      {
        ref: toggleRef,
        type: "button",
        "aria-expanded": isFabExpanded,
        "aria-controls": "alloflow-student-tools-panel",
        "aria-haspopup": "dialog",
        onClick: handleToggleIsFabExpanded,
        className: `alloflow-student-tools-launcher h-12 rounded-2xl px-3.5 text-white shadow-lg flex items-center gap-2.5 transition-all hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transition-none motion-reduce:transform-none ${dictationIsActive ? "bg-gradient-to-br from-rose-600 to-red-700 shadow-rose-600/30" : "bg-gradient-to-br from-indigo-600 to-violet-700 shadow-indigo-600/30 hover:from-indigo-700 hover:to-violet-800"}`,
        "aria-label": isFabExpanded ? toolsCloseLabel : toolsOpenLabel,
        "data-dictation-active": dictationIsActive ? "true" : "false",
        "data-help-key": "fab_toggle"
      },
      /* @__PURE__ */ React.createElement(Wrench, { size: 20, "aria-hidden": "true" }),
      /* @__PURE__ */ React.createElement("span", { className: "text-sm font-black" }, toolsTitle),
      dictationIsActive && /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-[10px] font-black uppercase tracking-wide" }, /* @__PURE__ */ React.createElement("span", { className: "h-1.5 w-1.5 rounded-full bg-white animate-pulse motion-reduce:animate-none", "aria-hidden": "true" }), dictationPhase === "transcribing" ? "Working" : "Listening")
    )
  ));
}
FabStack.magnifierLayout = magnifierLayout;
FabStack.magnifierLensSize = magnifierLensSize;
FabStack.createPageMagnifier = createPageMagnifier;

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.FabStack = { FabStack: FabStack };
  console.log('[CDN] FabStack loaded');
})();
