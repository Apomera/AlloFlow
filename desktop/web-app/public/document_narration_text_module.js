var AlloNarrationText = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // _tmp_narration_text.jsx
  var tmp_narration_text_exports = {};
  __export(tmp_narration_text_exports, {
    accessibleText: () => _srStyleTextFromHtml,
    naturalText: () => _audioReadyText,
    sanitize: () => _viewSanitizeMarkupForExport
  });
  function _viewSanitizeMarkupForExport(html, pipeline) {
    const factory = typeof window !== "undefined" && window.AlloModules && window.AlloModules.createDocPipeline;
    const helper = pipeline && pipeline.sanitizeRemediationHtml || factory && factory.sanitizeRemediationHtml;
    if (typeof helper !== "function") throw new Error("Remediation security module is still loading. Please retry in a moment.");
    const clean = helper(String(html == null ? "" : html));
    if (typeof clean !== "string" || !clean.trim()) throw new Error("The markup could not be sanitized safely.");
    return clean;
  }
  function _audioReadyText(html, narrationOptions) {
    const options = narrationOptions || {};
    const doc = new DOMParser().parseFromString(html || "", "text/html");
    const root = doc.body || doc.documentElement;
    if (!root) return "";
    if (options.languageRuns) {
      _narrationPrepareDocument(doc);
      root.querySelectorAll("p,h1,h2,h3,h4,h5,h6,li,blockquote,dd,dt,tr,caption,figcaption,summary").forEach((el) => el.appendChild(doc.createTextNode(". ")));
      return _narrationMergeRuns(_narrationTextRuns(root, options.language), true);
    }
    let _preamble = "";
    let preambleRuns = [];
    const _note = root.querySelector("[data-allo-translation-note], [data-allo-plain-note]");
    if (_note) {
      const _nt = (_note.textContent || "").replace(/\s+/g, " ").trim();
      if (_nt) {
        _preamble = _nt + ". ";
        if (options.languageRuns) preambleRuns = [..._narrationTextRuns(_note, options.language), { text: ". ", language: _narrationLanguageOf(_note, options.language) }];
      }
    }
    root.querySelectorAll(".allo-img-controls, [data-alloflow-picker], [data-alloflow-nomsg], [data-allo-translation-note], [data-allo-plain-note], script, style, button, input, select").forEach((el) => el.remove());
    root.querySelectorAll("details > summary").forEach((el) => el.remove());
    root.querySelectorAll("details em, figcaption em").forEach((el) => {
      if (/verify|AI-estimated|AI-generated|Transcribed from the image/i.test(el.textContent || "")) el.remove();
    });
    root.querySelectorAll("annotation, annotation-xml, [data-allo-latex-src]").forEach((el) => el.remove());
    const imageText = (node, caption, alt) => {
      if (!options.languageRuns) return doc.createTextNode((caption ? caption.textContent.trim() : alt) ? "Image: " + (caption ? caption.textContent.trim() : alt) + ". " : "");
      const span = doc.createElement("span");
      span.lang = _narrationLanguageOf(caption || node, options.language);
      if (caption) {
        const clone = caption.cloneNode(true);
        span.append(...Array.from(clone.childNodes));
      } else span.textContent = alt;
      if (span.textContent.trim()) span.append(doc.createTextNode(". "));
      return span;
    };
    root.querySelectorAll("figure").forEach((fig) => {
      const img = fig.querySelector("img");
      const cap = fig.querySelector("figcaption");
      if (fig.hasAttribute("data-img-placeholder") || fig.hasAttribute("data-img-idx") && !img) {
        const d = cap && cap.textContent.trim() || "";
        fig.replaceWith(options.languageRuns ? imageText(fig, cap, d) : doc.createTextNode(d ? "Image: " + d + ". " : ""));
        return;
      }
      if (img) {
        const alt = (img.getAttribute("alt") || "").trim();
        const isPres = img.getAttribute("role") === "presentation" || img.getAttribute("aria-hidden") === "true";
        const capText = cap ? cap.textContent.trim() : "";
        const say = capText || (isPres ? "" : alt);
        const replacement = options.languageRuns ? imageText(img, capText ? cap : null, say) : doc.createTextNode(say ? "Image: " + say + ". " : "");
        if (cap) cap.remove();
        img.replaceWith(replacement);
      }
    });
    root.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li, blockquote, dd, dt, tr, caption, figcaption").forEach((el) => {
      el.appendChild(doc.createTextNode(". "));
    });
    if (options.languageRuns) return _narrationMergeRuns([...preambleRuns, ..._narrationTextRuns(root, options.language)], true);
    return _preamble + (root.textContent || "").replace(/\s+/g, " ").replace(/\s+([.,;:!?])/g, "$1").replace(/([.!?])\s*\.+/g, "$1").replace(/\.{2,}/g, ".").trim();
  }
  function _narrationLanguageOf(node, fallback) {
    let el = node.nodeType === 1 ? node : node.parentElement;
    while (el) {
      if (el.lang) return el.lang;
      el = el.parentElement;
    }
    return fallback || "en";
  }
  function _narrationPrepareDocument(doc) {
    doc.querySelectorAll('script,style,button,input,select,textarea,audio,video,template,[hidden],[aria-hidden="true"],.allo-img-controls,[data-alloflow-picker],[data-alloflow-nomsg],#allo-reader-bar,#allo-reader-ruler,annotation,annotation-xml,[data-allo-latex-src]').forEach((node) => node.remove());
    doc.querySelectorAll("[style]").forEach((node) => {
      if (node.style.display === "none" || node.style.visibility === "hidden") node.remove();
    });
  }
  function _narrationTextRuns(node, fallback) {
    const runs = [];
    const visit = (n) => {
      const language = _narrationLanguageOf(n, fallback);
      if (n.nodeType === 3) {
        runs.push({ text: n.textContent, language });
        return;
      }
      if (n.nodeType !== 1) return;
      if (n.tagName.toLowerCase() === "img") {
        const alt = (n.getAttribute("alt") || "").trim();
        if (alt && n.getAttribute("role") !== "presentation" && n.getAttribute("role") !== "none" && n.getAttribute("aria-hidden") !== "true") runs.push({ text: alt + ". ", language });
        return;
      }
      if (/^(math|svg)$/i.test(n.tagName)) {
        const description = n.getAttribute("aria-label") || n.getAttribute("alttext") || (n.tagName.toLowerCase() === "svg" ? Array.from(n.querySelectorAll("title,desc")).map((el) => el.textContent.trim()).filter(Boolean).join(". ") : "");
        if (description) {
          runs.push({ text: description + ". ", language });
          return;
        }
      }
      Array.from(n.childNodes).forEach(visit);
    };
    visit(node);
    if (runs.length) {
      runs[0].text = runs[0].text.trimStart();
      runs[runs.length - 1].text = runs[runs.length - 1].text.trimEnd();
    }
    return runs;
  }
  function _narrationMergeRuns(input, natural) {
    const runs = [];
    for (const item of input) {
      if (!item.text) continue;
      const previous = runs[runs.length - 1];
      if (previous && (previous.language === item.language || !/[\p{L}\p{N}\p{S}]/u.test(item.text))) previous.text += item.text;
      else runs.push({ ...item });
    }
    if (runs.length > 1 && !/[\p{L}\p{N}\p{S}]/u.test(runs[0].text)) {
      runs[1].text = runs[0].text + runs[1].text;
      runs.shift();
    }
    return runs.map((run) => ({ ...run, text: (natural ? run.text.replace(/\s+/g, " ").replace(/\s+([.,;:!?])/g, "$1").replace(/([.!?])\s*\.+/g, "$1").replace(/\.{2,}/g, ".") : run.text).trim() })).filter((run) => run.text);
  }
  function _srStyleTextFromHtml(html, spokenLabels, narrationOptions) {
    const options = narrationOptions || {};
    const say = (node, key, fallback, n) => {
      const local = options.languageRuns ? options.labelsByLanguage?.[_narrationLanguageOf(node, options.language).split("-")[0]] : spokenLabels;
      const phrase = local && (Number(n) === 1 && local[key + "One"] || local[key]);
      return phrase ? phrase.replace(/\{n\}/g, String(n)) : fallback;
    };
    const doc = new DOMParser().parseFromString(html || "", "text/html");
    if (options.languageRuns) _narrationPrepareDocument(doc);
    const readable = (node) => options.languageRuns ? _narrationTextRuns(node, options.language).some((run) => run.text.trim()) : !!(node.textContent || "").trim();
    const out = [], runs = [];
    const add = (node, ...parts) => {
      out.push(parts.map((part) => typeof part === "string" ? part : (part.textContent || "").trim()).join(""));
      if (options.languageRuns) {
        if (runs.length) runs.push({ text: "\n\n", language: _narrationLanguageOf(node, options.language) });
        for (const part of parts) runs.push(...typeof part === "string" ? [{ text: part, language: _narrationLanguageOf(node, options.language) }] : _narrationTextRuns(part, options.language));
      }
    };
    const walk = (el) => {
      for (const node of Array.from(el.childNodes)) {
        if (node.nodeType !== 1) {
          if (options.languageRuns && node.nodeType === 3 && node.textContent.trim()) add(el, node);
          continue;
        }
        const tag = node.tagName.toLowerCase(), txt = readable(node);
        if (/^h[1-6]$/.test(tag)) {
          if (txt) add(node, say(node, "heading", "Heading level " + tag[1], tag[1]) + ". ", node, ".");
          continue;
        }
        if (tag === "p" || tag === "blockquote" || tag === "figcaption") {
          if (txt && !node.closest("table")) add(node, node);
          continue;
        }
        if (tag === "ul" || tag === "ol") {
          const items = Array.from(node.children).filter((c) => c.tagName && c.tagName.toLowerCase() === "li");
          add(node, say(node, tag === "ul" ? "list" : "numbered", (tag === "ul" ? "List, " : "Numbered list, ") + items.length + " item" + (items.length === 1 ? "" : "s"), items.length) + ".");
          items.forEach((li, i) => {
            if (readable(li)) add(li, (tag === "ul" ? say(li, "bullet", "Bullet") : say(li, "item", "Item " + (i + 1), i + 1)) + ". ", li, ".");
          });
          add(node, say(node, "listEnd", "List end") + ".");
          continue;
        }
        if (tag === "table") {
          const rows = Array.from(node.querySelectorAll("tr")), cols = rows.length ? Math.max.apply(null, rows.map((r) => r.children.length)) : 0, cap = node.querySelector("caption");
          add(node, say(node, "table", "Table"), ...cap && cap.textContent.trim() ? [", ", cap] : [], ", " + say(node, "rows", rows.length + " row" + (rows.length === 1 ? "" : "s"), rows.length) + ", " + say(node, "columns", cols + " column" + (cols === 1 ? "" : "s"), cols) + ".");
          rows.forEach((row, i) => {
            const cells = Array.from(row.children).filter((c) => readable(c));
            if (cells.length) add(row, say(row, "row", "Row " + (i + 1), i + 1) + ". ", ...cells.flatMap((cell, index) => index ? [". ", cell] : [cell]), ".");
          });
          add(node, say(node, "tableEnd", "Table end") + ".");
          continue;
        }
        if (tag === "img") {
          const alt = (node.getAttribute("alt") || "").trim();
          if (node.getAttribute("role") !== "presentation" && node.getAttribute("role") !== "none" && alt) add(node, say(node, "image", "Image") + ". " + alt + ".");
          continue;
        }
        if (options.languageRuns && (tag === "math" || tag === "svg")) {
          add(node, node);
          continue;
        }
        if (tag === "details") {
          const sum = node.querySelector("summary");
          if (sum && sum.textContent.trim()) add(node, say(node, "disclosure", "Disclosure section") + ", ", sum, ".");
          walk(node);
          continue;
        }
        if (tag === "summary" && node.parentElement?.tagName === "DETAILS") continue;
        walk(node);
      }
    };
    walk(doc.body || doc.documentElement);
    return options.languageRuns ? _narrationMergeRuns(runs, false) : out.join("\n\n");
  }
  return __toCommonJS(tmp_narration_text_exports);
})();
