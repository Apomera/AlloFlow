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
  var _ALLO_INTERACTIVE_CHROME_SEL = ".alloflow-cloze-controls,.alloflow-cs-controls,.alloflow-cs-actions,.alloflow-venn-controls,.alloflow-venn-status,.alloflow-venn-place-button,.alloflow-venn-screen-instructions,.alloflow-tl-controls,.alloflow-tl-arrows,.alloflow-glossary-controls,.alloflow-glossary-card-controls,.alloflow-glossary-card-actions,.alloflow-glossary-card-status,.alloflow-gm-controls,.alloflow-gm-status,.alloflow-faq-controls,.alloflow-dir-controls,.alloflow-cornell-controls,.alloflow-ws-controls,.alloflow-quiz-feedback,.alloflow-quiz-check-btn,.alloflow-math-symbolbar,.alloflow-math-symbar,.alloflow-math-controls,.alloflow-dbq-evidence-tracker,.alloflow-export-save-tools,.alloflow-save-status";
  function _alloChosenSelectText(sel) {
    if (!sel) return "";
    const opts = sel.options ? Array.from(sel.options) : Array.from(sel.querySelectorAll("option"));
    const selOpt = sel.selectedOptions && sel.selectedOptions[0];
    const hasVal = (o) => o && !o.disabled && String(o.getAttribute && o.getAttribute("value") != null ? o.getAttribute("value") : o.value != null ? o.value : o.textContent || "").trim() !== "";
    const chosen = (hasVal(selOpt) ? selOpt : null) || opts.find((o) => (o.selected || o.hasAttribute("selected")) && hasVal(o)) || null;
    return chosen ? String(chosen.textContent || chosen.value || "").replace(/\s+/g, " ").trim() : "";
  }
  function _alloDedupeVennActivityDom(root) {
    if (!root || !root.querySelectorAll) return;
    const doc = root.ownerDocument || root;
    root.querySelectorAll(".alloflow-venn-activity").forEach((act) => {
      if (act.querySelector(".alloflow-venn-card")) {
        act.querySelectorAll(".alloflow-venn-print-only, .alloflow-venn-screen-instructions").forEach((el) => el.remove());
        act.querySelectorAll(".alloflow-venn-card").forEach((card) => {
          const btn = card.querySelector("button.alloflow-venn-card-button");
          if (!btn) return;
          const sel = card.querySelector("select.alloflow-venn-response");
          const chosenText = _alloChosenSelectText(sel);
          const p = doc.createElement("p");
          p.className = "alloflow-venn-card-text";
          p.textContent = (btn.textContent || "").replace(/\s+/g, " ").trim() + (chosenText ? " \u2014 " + chosenText : "");
          btn.replaceWith(p);
          if (sel) sel.remove();
        });
      }
    });
  }
  function _alloReplaceFormControlsForText(doc, root, blankToken, alloFieldsOnly, emitEmptyBlank) {
    if (!doc || !root || !root.querySelectorAll) return;
    const alloSel = "input[data-allo-field],textarea[data-allo-field],select[data-allo-field],input[data-allo-response-key],textarea[data-allo-response-key],select[data-allo-response-key],.alloflow-response-input,.alloflow-response-select,.interactive-blank,.interactive-textarea,.alloflow-cs-response,.alloflow-venn-response";
    root.querySelectorAll("input,textarea,select").forEach((el) => {
      const tag = (el.tagName || "").toLowerCase();
      const isHidden = el.hasAttribute("hidden") || el.getAttribute("aria-hidden") === "true" || el.style && (el.style.display === "none" || el.style.visibility === "hidden");
      const isAlloField = !alloFieldsOnly || typeof el.matches === "function" && el.matches(alloSel);
      if (emitEmptyBlank === false && !isAlloField) {
        el.remove();
        return;
      }
      if (tag === "input") {
        const type = String(el.getAttribute("type") || "text").toLowerCase();
        if (type === "hidden" || type === "button" || type === "submit" || type === "reset") {
          el.remove();
          return;
        }
        if (type === "radio" || type === "checkbox") {
          if (isHidden) {
            el.remove();
            return;
          }
          const checked = el.checked || el.hasAttribute("checked");
          if (!alloFieldsOnly) el.replaceWith(doc.createTextNode(checked ? "[x] " : "[ ] "));
          else el.remove();
          return;
        }
        if (isHidden) {
          el.remove();
          return;
        }
        const val = String(el.value || el.getAttribute("value") || "").trim();
        if (val) el.replaceWith(doc.createTextNode(val));
        else if (emitEmptyBlank !== false && isAlloField) el.replaceWith(doc.createTextNode(blankToken));
        else el.remove();
        return;
      }
      if (tag === "textarea") {
        if (isHidden) {
          el.remove();
          return;
        }
        const val = String(el.value || el.textContent || "").trim();
        const outTxt = val || (emitEmptyBlank !== false && isAlloField ? blankToken : "");
        if (!outTxt) {
          el.remove();
          return;
        }
        if (el.closest && el.closest("p,h1,h2,h3,h4,h5,h6,li,blockquote,figcaption,caption,dt,dd,th,td")) {
          el.replaceWith(doc.createTextNode(outTxt));
        } else {
          const p = doc.createElement("p");
          p.textContent = outTxt;
          el.replaceWith(p);
        }
        return;
      }
      if (tag === "select") {
        const chosenTxt = _alloChosenSelectText(el);
        if (isHidden) {
          if (chosenTxt && typeof el.matches === "function" && el.matches("select.alloflow-cs-response, select.alloflow-venn-response")) {
            el.replaceWith(doc.createTextNode(" \u2014 " + chosenTxt));
          } else {
            el.remove();
          }
          return;
        }
        if (chosenTxt) el.replaceWith(doc.createTextNode(chosenTxt));
        else if (emitEmptyBlank !== false && isAlloField) el.replaceWith(doc.createTextNode(blankToken));
        else el.remove();
      }
    });
  }
  var _ALLO_TEACHER_ONLY_SEL = ".teacher-view, [data-allo-teacher-only], [data-teacher-only], .teacher-only, .answer-key, .alloflow-teacher-copy-banner, .alloflow-cs-answer-key, .alloflow-glossary-worksheet-key, .alloflow-math-solution, .alloflow-fluency-key, .alloflow-teacher-plan, .alloflow-teacher-annotations, .alloflow-teacher-annotations-by-resource, .alloflow-gm-check-btn, .alloflow-gm-feedback, .alloflow-match-check-btn, .alloflow-match-feedback, .alloflow-teacher-notes, .alloflow-rubric-key, .alloflow-model-answer, .alloflow-sample-response, .alloflow-scoring-guide, #alloflow-interactive-object-profile, [data-teacher-note], [data-answer-key]";
  function _alloLinearizeSpeechMath(mathEl) {
    if (!mathEl) return "";
    const cleanSp = (s) => String(s == null ? "" : s).replace(/\s+/g, " ").trim();
    const explicit = cleanSp(mathEl.getAttribute && (mathEl.getAttribute("aria-label") || mathEl.getAttribute("alttext")) || "");
    if (explicit) return explicit;
    const mathAtom = (s) => /^[A-Za-z0-9.]+$/.test(s) ? s : "(" + s + ")";
    const mathBase = (s) => /^[A-Za-z0-9.]+$/.test(s) || Array.from(s).length === 1 ? s : "(" + s + ")";
    const mathScript = (s) => /^-?[A-Za-z0-9]+$/.test(s) ? s : "(" + s + ")";
    const OVER_ACCENT = { "\xAF": "bar", "\u203E": "bar", "\u02C9": "bar", "_": "bar", "^": "hat", "\u02C6": "hat", "~": "tilde", "\u02DC": "tilde", "\u2192": "vec", "\u20D7": "vec", "\u02D9": "dot", "\xA8": "ddot" };
    const walkMath = (node, depth = 0) => {
      if (!node || depth > 64) return "";
      if (node.nodeType === 3) return String(node.nodeValue || node.textContent || "");
      if (node.nodeType !== 1) return "";
      const nextDepth = depth + 1;
      const t = String(node.tagName || "").toLowerCase();
      if (t === "annotation" || t === "annotation-xml") return "";
      if (t === "mspace") return " ";
      const ch = Array.from(node.children || []);
      if (t === "mfrac" && ch.length >= 2) {
        const num = cleanSp(walkMath(ch[0], nextDepth));
        const den = cleanSp(walkMath(ch[1], nextDepth));
        return num || den ? "(" + num + ")/(" + den + ")" : "";
      }
      if (t === "msup" && ch.length >= 2) {
        const b = cleanSp(walkMath(ch[0], nextDepth));
        const e = cleanSp(walkMath(ch[1], nextDepth));
        return b ? mathAtom(b) + "^" + mathScript(e) : e;
      }
      if (t === "msub" && ch.length >= 2) {
        const b = cleanSp(walkMath(ch[0], nextDepth));
        const s = cleanSp(walkMath(ch[1], nextDepth));
        return b ? mathAtom(b) + "_" + mathScript(s) : s;
      }
      if (t === "msubsup" && ch.length >= 3) {
        const b = cleanSp(walkMath(ch[0], nextDepth));
        const s = cleanSp(walkMath(ch[1], nextDepth));
        const e = cleanSp(walkMath(ch[2], nextDepth));
        return b ? mathAtom(b) + "_" + mathScript(s) + "^" + mathScript(e) : "";
      }
      if (t === "munderover" && ch.length >= 3) {
        const b = cleanSp(walkMath(ch[0], nextDepth));
        const u = cleanSp(walkMath(ch[1], nextDepth));
        const o = cleanSp(walkMath(ch[2], nextDepth));
        return b ? mathBase(b) + (u ? "_" + mathScript(u) : "") + (o ? "^" + mathScript(o) : "") : cleanSp(u + " " + o);
      }
      if (t === "munder" && ch.length >= 2) {
        const b = cleanSp(walkMath(ch[0], nextDepth));
        const u = cleanSp(walkMath(ch[1], nextDepth));
        return b && u ? mathBase(b) + "_" + mathScript(u) : b || u;
      }
      if (t === "mover" && ch.length >= 2) {
        const b = cleanSp(walkMath(ch[0], nextDepth));
        const o = cleanSp(walkMath(ch[1], nextDepth));
        if (b && Object.prototype.hasOwnProperty.call(OVER_ACCENT, o)) return OVER_ACCENT[o] + "(" + b + ")";
        return b && o ? mathBase(b) + "^" + mathScript(o) : b || o;
      }
      if (t === "mtable") {
        const rows = ch.map((row) => {
          const rt = String(row.tagName || "").toLowerCase();
          if (rt === "mtr" || rt === "mlabeledtr") {
            const cells = Array.from(row.children || []).map((c) => cleanSp(walkMath(c, nextDepth))).filter(Boolean);
            return cells.join(", ");
          }
          return cleanSp(walkMath(row, nextDepth));
        }).filter(Boolean);
        return rows.length ? "[" + rows.join("; ") + "]" : "";
      }
      if (t === "mfenced") {
        const open = node.getAttribute("open") != null ? node.getAttribute("open") : "(";
        const close = node.getAttribute("close") != null ? node.getAttribute("close") : ")";
        const seps = Array.from(String(node.getAttribute("separators") != null ? node.getAttribute("separators") : ",").replace(/\s+/g, ""));
        const parts = ch.map((c) => cleanSp(walkMath(c, nextDepth)));
        let out = "";
        for (let i = 0; i < parts.length; i++) {
          if (i > 0) {
            const sep = seps.length ? seps[Math.min(i - 1, seps.length - 1)] : "";
            out += sep ? sep + " " : " ";
          }
          out += parts[i];
        }
        return open + out + close;
      }
      if (t === "msqrt") {
        const inner = cleanSp(Array.from(node.childNodes || []).map((child) => walkMath(child, nextDepth)).join(""));
        return inner ? "sqrt(" + inner + ")" : "";
      }
      if (t === "mroot" && ch.length >= 2) {
        const b = cleanSp(walkMath(ch[0], nextDepth));
        const idx = cleanSp(walkMath(ch[1], nextDepth));
        return b && idx ? "root(" + idx + ", " + b + ")" : b;
      }
      return Array.from(node.childNodes || []).map((child) => walkMath(child, nextDepth)).join("");
    };
    return cleanSp(walkMath(mathEl, 0)) || cleanSp(mathEl.getAttribute && mathEl.getAttribute("data-allo-latex") || "");
  }
  function _replaceAccessibleMathAndSvgForSpeech(root, opts) {
    if (!root || !root.querySelectorAll) return;
    const doc = opts && opts.doc || root.ownerDocument || (typeof document !== "undefined" ? document : null);
    if (!doc) return;
    const includeTeacherOnly = !!(opts && opts.includeTeacherOnly);
    const preserveLanguageNodes = !!(opts && opts.preserveLanguageNodes);
    if (!includeTeacherOnly) {
      root.querySelectorAll(_ALLO_TEACHER_ONLY_SEL).forEach((el) => {
        try {
          el.remove();
        } catch (_) {
        }
      });
    }
    const makeSpokenNode = (sourceEl, labelText) => {
      const clean = String(labelText || "").replace(/\s+/g, " ").trim();
      if (!clean) return doc.createTextNode("");
      if (preserveLanguageNodes) {
        const span = doc.createElement("span");
        span.setAttribute("data-allo-spoken-media", "1");
        const lang = sourceEl && sourceEl.getAttribute && (sourceEl.getAttribute("lang") || sourceEl.getAttribute("xml:lang"));
        if (lang) span.setAttribute("lang", lang);
        span.textContent = " " + clean + " ";
        return span;
      }
      return doc.createTextNode(" " + clean + " ");
    };
    root.querySelectorAll("math").forEach((mathEl) => {
      try {
        if (mathEl.closest && mathEl.closest('[hidden], [aria-hidden="true"]')) {
          mathEl.remove();
          return;
        }
        const readable = _alloLinearizeSpeechMath(mathEl);
        mathEl.replaceWith(makeSpokenNode(mathEl, readable));
      } catch (_) {
      }
    });
    root.querySelectorAll("svg").forEach((svgEl) => {
      try {
        if (svgEl.closest && svgEl.closest(".alloflow-inline-chart")) {
          svgEl.remove();
          return;
        }
        if (svgEl.getAttribute("aria-hidden") === "true" || svgEl.getAttribute("role") === "presentation" || svgEl.getAttribute("role") === "none" || svgEl.closest && svgEl.closest('[hidden], [aria-hidden="true"]')) {
          svgEl.remove();
          return;
        }
        const label = String(
          svgEl.getAttribute("aria-label") || Array.from(svgEl.querySelectorAll("title, desc")).map((n) => (n.textContent || "").trim()).filter(Boolean).join(". ")
        ).replace(/\s+/g, " ").trim();
        if (label) svgEl.replaceWith(makeSpokenNode(svgEl, label));
        else svgEl.remove();
      } catch (_) {
      }
    });
  }
  function _audioReadyText(html, narrationOptions) {
    const options = narrationOptions || {};
    const Parser = typeof DOMParser === "function" ? DOMParser : typeof window !== "undefined" && typeof window.DOMParser === "function" ? window.DOMParser : null;
    if (!Parser) return options.languageRuns ? [] : "";
    const doc = new Parser().parseFromString(html || "", "text/html");
    const root = doc.body || doc.documentElement;
    if (!root) return options.languageRuns ? [] : "";
    let _preamble = "";
    let preambleRuns = [];
    const _noteParts = [];
    root.querySelectorAll("[data-allo-translation-note], [data-allo-plain-note]").forEach((_note) => {
      if (_note.hasAttribute("hidden") || _note.getAttribute("aria-hidden") === "true" || _note.style && (_note.style.display === "none" || _note.style.visibility === "hidden") || _note.closest && _note.closest('[hidden], [aria-hidden="true"]')) return;
      const _clone = _note.cloneNode(true);
      if (_clone.querySelectorAll) {
        _clone.querySelectorAll('script, style, button, input, select, textarea, [hidden], [aria-hidden="true"]').forEach((el) => el.remove());
        _clone.querySelectorAll("[style]").forEach((el) => {
          if (el.style.display === "none" || el.style.visibility === "hidden") el.remove();
        });
        if (!options.includeTeacherOnly) {
          _clone.querySelectorAll(_ALLO_TEACHER_ONLY_SEL).forEach((el) => el.remove());
        }
      }
      const _nt = (_clone.textContent || "").replace(/\s+/g, " ").trim();
      if (_nt) {
        const _punct = /[.!?]$/.test(_nt) ? " " : ". ";
        _noteParts.push(_nt + _punct);
        if (options.languageRuns) {
          const _noteLang = _narrationLanguageOf(_note, options.language);
          preambleRuns.push(..._narrationTextRuns(_clone, _noteLang), { text: _punct, language: _noteLang });
        }
      }
    });
    _preamble = _noteParts.join("");
    _narrationPrepareDocument(doc, options);
    root.querySelectorAll("[data-allo-translation-note], [data-allo-plain-note], details.allo-chart-data > summary, details.allo-image-desc > summary").forEach((el) => el.remove());
    if (!options.languageRuns) {
      root.querySelectorAll("details em, figcaption em").forEach((el) => {
        if (/verify|AI-estimated|AI-generated|Transcribed from the image/i.test(el.textContent || "")) el.remove();
      });
    }
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
        const role = img.getAttribute("role");
        const isPres = role === "presentation" || role === "none" || img.getAttribute("aria-hidden") === "true";
        const capText = cap ? cap.textContent.trim() : "";
        if (options.languageRuns) {
          if (capText && alt && alt.replace(/\s+/g, " ").toLowerCase() === capText.replace(/\s+/g, " ").toLowerCase()) {
            img.remove();
          }
          return;
        }
        const say = capText || (isPres ? "" : alt);
        const replacement = doc.createTextNode(say ? "Image: " + say + ". " : "");
        if (cap) cap.remove();
        img.replaceWith(replacement);
      }
    });
    root.querySelectorAll("img").forEach((img) => {
      const role = img.getAttribute("role");
      const isPres = role === "presentation" || role === "none" || img.getAttribute("aria-hidden") === "true";
      const alt = isPres ? "" : (img.getAttribute("alt") || "").trim();
      img.replaceWith(options.languageRuns ? imageText(img, null, alt) : doc.createTextNode(alt ? "Image: " + alt + ". " : ""));
    });
    root.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li, blockquote, dd, dt, tr, caption, figcaption, summary, .alloflow-cs-strip, .alloflow-tl-strip").forEach((el) => {
      el.appendChild(doc.createTextNode(". "));
    });
    if (options.languageRuns) return _narrationMergeRuns([...preambleRuns, ..._narrationTextRuns(root, options.language)], true);
    return _preamble + (root.textContent || "").replace(/\s+/g, " ").replace(/\s+([.,;:!?])/g, "$1").replace(/([.!?])\s*\.+/g, "$1").replace(/\.{2,}/g, ".").trim();
  }
  function _narrationLanguageOf(node, fallback) {
    if (!node) return fallback || "en";
    let el = node.nodeType === 1 ? node : node.parentElement;
    while (el) {
      const l = (el.lang || el.getAttribute && (el.getAttribute("lang") || el.getAttribute("xml:lang")) || "").trim();
      if (l) return l;
      el = el.parentElement;
    }
    return fallback || "en";
  }
  function _narrationPrepareDocument(doc, options) {
    _alloDedupeVennActivityDom(doc);
    _alloReplaceFormControlsForText(doc, doc.body || doc, " blank ", true, !(options && options.languageRuns));
    doc.querySelectorAll("button.alloflow-inline-term").forEach((btn) => {
      const span = doc.createElement("span");
      if (btn.lang) span.lang = btn.lang;
      span.textContent = btn.textContent || "";
      btn.replaceWith(span);
    });
    doc.querySelectorAll('script,style,button,input,select,textarea,audio,video,template,[hidden],[aria-hidden="true"],.allo-img-controls,[data-alloflow-picker],[data-alloflow-nomsg],[data-allo-footnote-backlink],details.allo-math-source,#allo-reader-bar,#allo-reader-ruler,.alloflow-reading-tools-shell,.alloflow-hud-bar,#alloflow-term-popover,.alloflow-term-popover,.alloflow-export-prompt-overlay,.alloflow-save-bar,.alloflow-turnin-bar,.alloflow-keycap,.alloflow-inline-chart svg,annotation,annotation-xml,[data-allo-latex-src],del[data-allo-change-id],[data-allo-change-kind="structure-delete"],' + _ALLO_INTERACTIVE_CHROME_SEL).forEach((node) => node.remove());
    doc.querySelectorAll("[style]").forEach((node) => {
      if (node.style.display === "none" || node.style.visibility === "hidden") node.remove();
    });
    _replaceAccessibleMathAndSvgForSpeech(doc.body || doc, { doc, includeTeacherOnly: !!(options && options.includeTeacherOnly), preserveLanguageNodes: !!(options && options.languageRuns) });
  }
  function _narrationTextRuns(node, fallback) {
    const runs = [];
    const visit = (n, depth = 0) => {
      if (!n || depth > 64) return;
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
        const tag = n.tagName.toLowerCase();
        if (tag === "svg" && (n.getAttribute("aria-hidden") === "true" || n.getAttribute("role") === "presentation" || n.getAttribute("role") === "none" || n.closest && n.closest(".alloflow-inline-chart"))) return;
        const description = tag === "math" ? _alloLinearizeSpeechMath(n) : n.getAttribute("aria-label") || n.getAttribute("alttext") || Array.from(n.querySelectorAll("title,desc")).map((el) => el.textContent.trim()).filter(Boolean).join(". ");
        if (description) runs.push({ text: description + ". ", language });
        return;
      }
      Array.from(n.childNodes).forEach((child) => visit(child, depth + 1));
    };
    visit(node, 0);
    if (runs.length) {
      runs[0].text = runs[0].text.trimStart();
      runs[runs.length - 1].text = runs[runs.length - 1].text.trimEnd();
    }
    return runs;
  }
  function _narrationMergeRuns(input, natural) {
    if (!Array.isArray(input)) return [];
    const runs = [];
    for (const item of input) {
      if (!item || !item.text) continue;
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
    const hasOwn = Object.prototype.hasOwnProperty;
    const isSafeKey = (k) => typeof k === "string" && k !== "__proto__" && k !== "constructor" && k !== "prototype";
    const say = (node, key, fallback, n) => {
      const primary = _narrationLanguageOf(node, options.language).split("-")[0].toLowerCase();
      const byLang = options.languageRuns && options.labelsByLanguage && typeof options.labelsByLanguage === "object" ? options.labelsByLanguage : null;
      const local = options.languageRuns ? byLang && isSafeKey(primary) && hasOwn.call(byLang, primary) ? byLang[primary] : null : spokenLabels && typeof spokenLabels === "object" ? spokenLabels : null;
      const oneKey = key + "One";
      let phrase = null;
      if (local && typeof local === "object") {
        if (Number(n) === 1 && isSafeKey(oneKey) && hasOwn.call(local, oneKey) && typeof local[oneKey] === "string") phrase = local[oneKey];
        else if (isSafeKey(key) && hasOwn.call(local, key) && typeof local[key] === "string") phrase = local[key];
      }
      return phrase ? n !== void 0 ? phrase.replace(/\{n\}/g, String(n)) : phrase : fallback;
    };
    const Parser = typeof DOMParser === "function" ? DOMParser : typeof window !== "undefined" && typeof window.DOMParser === "function" ? window.DOMParser : null;
    if (!Parser) return options.languageRuns ? [] : "";
    const doc = new Parser().parseFromString(html || "", "text/html");
    _narrationPrepareDocument(doc, options);
    const inlineText = (node, depth = 0) => {
      if (!node || depth > 64) return "";
      if (node.nodeType === 3) return node.textContent || "";
      if (node.nodeType !== 1) return "";
      if (node.tagName.toLowerCase() === "img") {
        const role = node.getAttribute("role");
        if (role === "presentation" || role === "none" || node.getAttribute("aria-hidden") === "true") return "";
        const alt = (node.getAttribute("alt") || "").trim();
        return alt ? " " + alt + " " : "";
      }
      return Array.from(node.childNodes).map((child) => inlineText(child, depth + 1)).join("");
    };
    const readable = (node) => options.languageRuns ? _narrationTextRuns(node, options.language).some((run) => run.text.trim()) : !!inlineText(node, 0).trim();
    const out = [], runs = [];
    const add = (node, ...parts) => {
      out.push(parts.map((part) => typeof part === "string" ? part : inlineText(part, 0).replace(/\s+/g, " ").trim()).join(""));
      if (options.languageRuns) {
        if (runs.length) runs.push({ text: "\n\n", language: _narrationLanguageOf(node, options.language) });
        for (const part of parts) runs.push(...typeof part === "string" ? [{ text: part, language: _narrationLanguageOf(node, options.language) }] : _narrationTextRuns(part, options.language));
      }
    };
    const walk = (el, depth = 0) => {
      if (!el || !el.childNodes || depth > 64) return;
      for (const node of Array.from(el.childNodes)) {
        if (node.nodeType !== 1) {
          if (node.nodeType === 3 && node.textContent.trim()) add(el, node);
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
        if (tag === "dt" || tag === "dd" || node.classList?.contains("alloflow-cs-strip") || node.classList?.contains("alloflow-tl-strip")) {
          if (txt) add(node, node, ".");
          continue;
        }
        if (tag === "ul" || tag === "ol") {
          const emitList = (listEl, listDepth = 0) => {
            if (!listEl || listDepth > 64) return;
            const lTag = listEl.tagName.toLowerCase();
            const items = Array.from(listEl.children).filter((c) => c.tagName && c.tagName.toLowerCase() === "li");
            add(listEl, say(listEl, lTag === "ul" ? "list" : "numbered", (lTag === "ul" ? "List, " : "Numbered list, ") + items.length + " item" + (items.length === 1 ? "" : "s"), items.length) + ".");
            items.forEach((li, i) => {
              const prefix = (lTag === "ul" ? say(li, "bullet", "Bullet") : say(li, "item", "Item " + (i + 1), i + 1)) + ". ";
              const nestedLists = Array.from(li.querySelectorAll("ul,ol")).filter((sub) => sub.parentElement && sub.parentElement.closest("li") === li);
              if (!nestedLists.length) {
                if (readable(li)) add(li, prefix, li, ".");
                return;
              }
              const ownClone = li.cloneNode(true);
              ownClone.querySelectorAll("ul,ol").forEach((sub) => sub.remove());
              if (readable(ownClone)) add(li, prefix, ownClone, ".");
              nestedLists.forEach((sub) => emitList(sub, listDepth + 1));
            });
            add(listEl, say(listEl, "listEnd", "List end") + ".");
          };
          emitList(node, 0);
          continue;
        }
        if (tag === "table") {
          const rows = Array.from(node.querySelectorAll("tr")).filter((tr) => !tr.closest || tr.closest("table") === node);
          let cols = 0;
          for (let ri = 0; ri < rows.length; ri++) {
            const rowCols = Array.from(rows[ri].children).reduce((sum, c) => sum + Math.min(100, Math.max(1, parseInt(c.getAttribute && c.getAttribute("colspan"), 10) || 1)), 0);
            if (rowCols > cols) cols = rowCols;
          }
          const cap = Array.from(node.children || []).find((c) => c.tagName && c.tagName.toLowerCase() === "caption") || null;
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
        if (options.languageRuns && (tag === "math" || tag === "svg" || node.getAttribute("data-allo-spoken-media") === "1")) {
          add(node, node);
          continue;
        }
        if (tag === "details") {
          const sum = Array.from(node.children || []).find((c) => c.tagName && c.tagName.toLowerCase() === "summary") || null;
          if (sum && sum.textContent.trim()) add(node, say(node, "disclosure", "Disclosure section") + ", ", sum, ".");
          walk(node, depth + 1);
          continue;
        }
        if (tag === "summary" && (node.parentElement?.tagName || "").toLowerCase() === "details") continue;
        walk(node, depth + 1);
      }
    };
    walk(doc.body || doc.documentElement, 0);
    return options.languageRuns ? _narrationMergeRuns(runs, false) : out.join("\n\n");
  }
  return __toCommonJS(tmp_narration_text_exports);
})();
