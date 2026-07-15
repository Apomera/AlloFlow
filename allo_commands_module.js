/**
 * AlloFlow AlloCommands Module (Agentic AlloBot S0)
 * Auto-generated. Source: allo_commands_source.jsx
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.AlloCommands) {
    console.log('[CDN] AlloCommands already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[AlloCommands] React not found on window'); return; }

const { useState, useEffect, useRef, useMemo, useCallback } = React;
const _mkT = (rawT) => (k, f) => {
  let r = null;
  try {
    r = rawT ? rawT(k) : null;
  } catch (_) {
  }
  return r && r !== k ? r : f || k;
};
const READING_STOPWORDS = new Set("a an and are as at be book books by can for from get give help i in into is it me my of on or read reading readings recommend right show some source sources story stories suggest text texts the to want what with learn about please".split(" "));
const READING_LANGUAGE_HINTS = {
  english: "English",
  spanish: "Spanish",
  french: "French",
  hindi: "Hindi",
  arabic: "Arabic",
  portuguese: "Portuguese",
  vietnamese: "Vietnamese",
  urdu: "Urdu",
  kiswahili: "Kiswahili",
  swahili: "Kiswahili",
  chinese: "Chinese (Simplified)",
  mandarin: "Chinese (Simplified)",
  bengali: "Bengali",
  farsi: "Farsi",
  persian: "Farsi",
  nepali: "Nepali",
  turkish: "Turkish"
};
const READING_SOURCE_HINTS = {
  storyweaver: "storyweaver",
  "story weave": "storyweaver",
  pratham: "storyweaver",
  gutenberg: "gutenberg",
  "project gutenberg": "gutenberg",
  frontiers: "frontiers",
  "frontiers for young minds": "frontiers",
  nasa: "nasa",
  noaa: "noaa",
  usgs: "usgs",
  wikisource: "wikisource",
  "wiki source": "wikisource",
  "library of congress": "loc",
  loc: "loc",
  openstax: "openstax",
  "open stax": "openstax"
};
function _compactReadingText(value) {
  return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
}
function _escapeReadingRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function _stripReadingPhrase(text, phrase) {
  if (!phrase) return text;
  try {
    const re = new RegExp("\\b" + _escapeReadingRegex(phrase).replace(/\s+/g, "\\s+") + "\\b", "ig");
    return _compactReadingText(String(text || "").replace(re, " "));
  } catch (_) {
    return text;
  }
}
function _readingWords(value) {
  return _compactReadingText(value).toLowerCase().replace(/['"]/g, "").split(/[^a-z0-9\u00c0-\u024f]+/i).map((w) => w.trim()).filter((w) => w.length > 1 && !READING_STOPWORDS.has(w));
}
function _readingStem(word) {
  const w = String(word || "").toLowerCase();
  if (w.length > 5 && /(ing|ers|ies|ied)$/.test(w)) return w.replace(/(ing|ers|ies|ied)$/, "");
  if (w.length > 4 && /(ed|es|s)$/.test(w)) return w.replace(/(ed|es|s)$/, "");
  return w;
}
function _readingFieldText(book, fields) {
  return fields.map((f) => {
    const v = book && book[f];
    if (Array.isArray(v)) return v.join(" ");
    if (v && typeof v === "object") return Object.values(v).join(" ");
    return v || "";
  }).join(" ").toLowerCase();
}
function normalizeReadingRequest(params) {
  const p = params && typeof params === "object" ? params : { topic: params };
  let topic = _compactReadingText(p.topic || p.query || p.text || p.rawText || "");
  const raw = topic;
  let grade = p.grade ? String(p.grade).match(/\d{1,2}/) : null;
  grade = grade ? grade[0] : null;
  let language = p.language ? _compactReadingText(p.language) : null;
  let source = p.source ? _compactReadingText(p.source).toLowerCase() : null;
  let format = p.format || p.kind || null;
  let audience = p.audience || null;
  if (!grade) {
    const gm = topic.match(/\b(?:for\s+)?(?:grade|gr\.?)\s*(\d{1,2})(?:st|nd|rd|th)?\b/i) || topic.match(/\b(\d{1,2})(?:st|nd|rd|th)\s+grade\b/i);
    if (gm) {
      grade = gm[1];
      topic = _compactReadingText(topic.replace(gm[0], " "));
    }
  }
  const rawLower = raw.toLowerCase();
  const languageKeys = Object.keys(READING_LANGUAGE_HINTS).sort((a, b) => b.length - a.length);
  for (const key of languageKeys) {
    if (!language && new RegExp("\\b" + _escapeReadingRegex(key).replace(/\s+/g, "\\s+") + "\\b", "i").test(rawLower)) language = READING_LANGUAGE_HINTS[key];
    if (language && READING_LANGUAGE_HINTS[key].toLowerCase() === String(language).toLowerCase()) topic = _stripReadingPhrase(topic, key);
  }
  const sourceKeys = Object.keys(READING_SOURCE_HINTS).sort((a, b) => b.length - a.length);
  for (const key of sourceKeys) {
    if (!source && new RegExp("\\b" + _escapeReadingRegex(key).replace(/\s+/g, "\\s+") + "\\b", "i").test(rawLower)) source = READING_SOURCE_HINTS[key];
    if (source && READING_SOURCE_HINTS[key] === source) topic = _stripReadingPhrase(topic, key);
  }
  if (!format) {
    if (/\b(primary source|primary sources|historical document|historical documents)\b/i.test(raw)) format = "primary_source";
    else if (/\b(nonfiction|non-fiction|informational|informative)\b/i.test(raw)) format = "nonfiction";
    else if (/\b(article|articles|science article|science articles)\b/i.test(raw)) format = "article";
    else if (/\b(story|stories|picture book|picture books|read aloud|read-aloud)\b/i.test(raw)) format = "story";
  }
  if (!audience) {
    if (/\b(older students?|middle school|high school|teen|teens|challenging|chapter book)\b/i.test(raw)) audience = "older";
    else if (/\b(younger students?|young students?|little kids?|early reader|beginner|primary grades?|picture book|read aloud|read-aloud)\b/i.test(raw)) audience = "younger";
  }
  if (!grade && /\bmiddle school\b/i.test(raw)) grade = "6";
  if (!grade && /\bhigh school\b/i.test(raw)) grade = "9";
  if (!grade && /\belementary\b/i.test(raw)) grade = "3";
  topic = _compactReadingText(topic.replace(/(?:\s+\b(?:in|from|for)\b)+\s*$/i, " ").replace(/\b(?:nonfiction|non-fiction|informational|informative|article|articles|primary source|primary sources|picture book|picture books|read aloud|read-aloud|older students?|younger students?|middle school|high school|elementary)\b/ig, " ").replace(/\b(?:book|books|reading|readings|story|stories|source|sources|text|texts|about|on|for|please|some|me|right)\b/ig, " "));
  return { topic, grade, language: language || null, source: source || null, format: format || null, audience: audience || null, raw };
}
function _readingParams(rawTopic, rawGrade) {
  return normalizeReadingRequest({ topic: rawTopic, grade: rawGrade });
}
function _readingLevelForGrade(grade) {
  const g = Number(String(grade || "").match(/\d{1,2}/)?.[0] || 0);
  if (!g) return null;
  if (g <= 1) return 1;
  if (g <= 2) return 2;
  if (g <= 4) return 3;
  if (g <= 5) return 4;
  if (g <= 8) return 5;
  return 6;
}
function _bookReadingLevel(book) {
  const raw = Number(String(book && book.level || "").match(/\d+/)?.[0] || 0);
  if (raw) return raw;
  const wc = Number(book && book.wordCount || 0);
  if (wc > 12e3) return 6;
  if (wc > 3500) return 5;
  if (wc > 1200) return 4;
  if (wc > 500) return 3;
  if (wc > 180) return 2;
  return 1;
}
function _readingSourceLabel(book) {
  if (book && book.source && book.source.name) return String(book.source.name);
  const id = String(book && book.sourceId || "").toLowerCase();
  const labels = {
    storyweaver: "StoryWeaver",
    frontiers: "Frontiers for Young Minds",
    gutenberg: "Project Gutenberg",
    nasa: "NASA",
    noaa: "NOAA",
    usgs: "USGS",
    wikisource: "Wikisource",
    loc: "Library of Congress",
    openstax: "OpenStax"
  };
  return labels[id] || id || "";
}
function _pushUniqueReadingReason(out, text) {
  const s = _compactReadingText(text);
  if (s && out.indexOf(s) < 0) out.push(s);
}
function readingMatchReasons(matchOrBook, params = null) {
  const match = matchOrBook && matchOrBook.book ? matchOrBook : { book: matchOrBook || {}, reasons: {} };
  const book = match.book || {};
  const meta = match.reasons || {};
  const req = normalizeReadingRequest(params || meta.request || {});
  const out = [];
  const level = meta.level || _bookReadingLevel(book);
  const desiredLevel = meta.desiredLevel || _readingLevelForGrade(req.grade);
  const sourceId = String(book.sourceId || "").toLowerCase();
  const contentType = String(book.contentType || "").toLowerCase();
  const sourceLabel = _readingSourceLabel(book);
  if (req.topic && (meta.hits || match.score)) _pushUniqueReadingReason(out, 'matches "' + req.topic + '"');
  if (req.grade) {
    const grade = String(req.grade).match(/\d{1,2}/)?.[0] || String(req.grade);
    if (desiredLevel && level && Math.abs(level - desiredLevel) <= 1) _pushUniqueReadingReason(out, "near grade " + grade);
    else if (level) _pushUniqueReadingReason(out, "reading level " + level);
  } else if (req.audience === "older") {
    _pushUniqueReadingReason(out, level >= 5 ? "good for older students" : "shorter bridge text");
  } else if (req.audience === "younger") {
    _pushUniqueReadingReason(out, level <= 3 ? "good for younger readers" : "supported reading practice");
  }
  if (req.language && book.language) _pushUniqueReadingReason(out, book.language);
  else if (book.language && String(book.language).toLowerCase() !== "english") _pushUniqueReadingReason(out, book.language);
  if (req.source && sourceLabel) _pushUniqueReadingReason(out, sourceLabel);
  if (req.format === "primary_source" || meta.isPrimary) _pushUniqueReadingReason(out, "primary source");
  else if (req.format === "article" || contentType === "article") _pushUniqueReadingReason(out, sourceId === "frontiers" ? "student science article" : "article format");
  else if (req.format === "nonfiction" || meta.isNonfiction) _pushUniqueReadingReason(out, "nonfiction");
  else if (req.format === "story" || contentType === "story") _pushUniqueReadingReason(out, "story format");
  if (!out.length && sourceLabel) _pushUniqueReadingReason(out, sourceLabel);
  return out.slice(0, 4);
}
function readingMatchWhyText(matchOrBook, params = null) {
  return readingMatchReasons(matchOrBook, params).join(", ");
}
function findReadingMatches(catalog, params = {}, opts = {}) {
  const books = Array.isArray(catalog) ? catalog : catalog && Array.isArray(catalog.books) ? catalog.books : [];
  const req = normalizeReadingRequest(params);
  const phrase = _compactReadingText(req.topic).toLowerCase();
  const terms = _readingWords(req.topic);
  const stems = terms.map(_readingStem);
  const desiredLevel = _readingLevelForGrade(req.grade);
  const hasConstraint = !!(terms.length || phrase || req.language || req.source || req.format || req.audience || desiredLevel);
  if (!books.length || !hasConstraint) return [];
  const limit = Math.max(1, Number(opts.limit || 5));
  const out = [];
  for (const book of books) {
    if (!book || !book.title) continue;
    const title = _readingFieldText(book, ["title"]);
    const desc = _readingFieldText(book, ["description"]);
    const subjects = _readingFieldText(book, ["subjects"]);
    const meta = _readingFieldText(book, ["authors", "illustrators", "publisher", "source", "sourceId", "contentType", "language"]);
    const all = title + " " + desc + " " + subjects + " " + meta;
    const allWords = _readingWords(all);
    const allStems = new Set(allWords.map(_readingStem));
    let score = 0, hits = 0;
    if (phrase && title.includes(phrase)) {
      score += 42;
      hits++;
    }
    if (phrase && subjects.includes(phrase)) {
      score += 34;
      hits++;
    }
    if (phrase && desc.includes(phrase)) {
      score += 24;
      hits++;
    }
    if (phrase && meta.includes(phrase)) {
      score += 8;
      hits++;
    }
    stems.forEach((stem, i) => {
      const term = terms[i];
      if (!term) return;
      if (title.includes(term) || allStems.has(stem)) {
        if (title.includes(term)) score += 14;
        if (subjects.includes(term)) score += 12;
        if (desc.includes(term)) score += 7;
        if (meta.includes(term)) score += 3;
        hits++;
      }
    });
    if (req.language) {
      const wanted = String(req.language).toLowerCase();
      const got = String(book.language || book.langCode || "").toLowerCase();
      if (got === wanted || got.includes(wanted) || wanted.includes(got)) score += 22;
      else continue;
    } else if (String(book.langCode || "").toLowerCase() === "en") score += 1;
    if (req.source) {
      if (String(book.sourceId || "").toLowerCase() === req.source) score += 20;
      else continue;
    }
    const sourceId = String(book.sourceId || "").toLowerCase();
    const contentType = String(book.contentType || "").toLowerCase();
    const isStory = sourceId === "storyweaver" || contentType === "story";
    const isScience = ["frontiers", "nasa", "noaa", "usgs", "openstax"].indexOf(sourceId) >= 0 || /\b(science|scientific|biology|earth|space|climate|weather|ocean|animal|energy|ecosystem)\b/.test(all);
    const isPrimary = ["wikisource", "loc"].indexOf(sourceId) >= 0 || /primary source|document|speech|letter|archive/.test(all);
    const isNonfiction = !isStory || isScience || isPrimary;
    if (req.format === "story") score += isStory ? 18 : -12;
    if (req.format === "article") score += isScience ? 18 : -8;
    if (req.format === "nonfiction") score += isNonfiction ? 16 : -12;
    if (req.format === "primary_source") score += isPrimary ? 22 : -10;
    const level = _bookReadingLevel(book);
    if (desiredLevel) score += Math.max(0, 16 - Math.abs(level - desiredLevel) * 5);
    if (req.audience === "older") score += level >= 5 ? 12 : -8;
    if (req.audience === "younger") score += level <= 3 ? 12 : -8;
    if (book.file) score += 3;
    if (book.cover) score += 1;
    if (contentType === "source-card" && req.format !== "primary_source") score -= 2;
    if (terms.length && hits === 0) continue;
    if (score > 0) {
      const reasons = { hits, level, desiredLevel, request: req, isStory, isScience, isPrimary, isNonfiction };
      out.push({ book, score, reasons, why: readingMatchReasons({ book, score, reasons }, req) });
    }
  }
  out.sort((a, b) => b.score - a.score || String(a.book.title || "").localeCompare(String(b.book.title || "")));
  return out.slice(0, limit);
}
function readingRecommendationText(matches, params, t) {
  const req = normalizeReadingRequest(params);
  const topicText = req.topic ? " about " + req.topic : "";
  if (!matches || !matches.length) {
    return t("cmd.find_reading_none", "I opened the Reading Library, but I could not find a strong match yet") + topicText + ".";
  }
  const top = matches[0].book;
  const bits = [String(top.title || "this book")];
  if (top.language) bits.push(top.language);
  if (top.source && top.source.name) bits.push(top.source.name);
  else if (top.sourceId) bits.push(top.sourceId);
  if (top.level) bits.push("level " + top.level);
  let msg = t("cmd.find_reading_done", "I found a good match and opened it") + ': "' + bits[0] + '".';
  const detail = bits.slice(1).join(", ");
  if (detail) msg += " " + detail + ".";
  const why = readingMatchWhyText(matches[0], req);
  if (why) msg += " Why this fits: " + why + ".";
  const alts = matches.slice(1, 4).map((x) => x.book && x.book.title).filter(Boolean);
  if (alts.length) msg += " Other good fits: " + alts.join("; ") + ".";
  return msg;
}
function runFindReadingCommand(c, params, t) {
  if (c && typeof c.findReadingBooks === "function") return c.findReadingBooks(params || {});
  const catalog = c && (c.readingLibraryIndex || c.readingBooks || c.catalog) || [];
  const matches = findReadingMatches(catalog, params || {}, { limit: 4 });
  if (matches.length && c && typeof c.openReadingBook === "function") c.openReadingBook(matches[0].book.slug);
  else if (c && typeof c.openReadingLibrary === "function") c.openReadingLibrary();
  return readingRecommendationText(matches, params || {}, t);
}
const PLAN_CONTRACTS = Object.freeze({
  create_lesson: {
    demoSafe: false,
    interaction: "guided",
    terminal: true,
    params: ["topic", "grade"],
    reason: "Starts an interactive lesson wizard; it does not finish lesson content automatically."
  },
  open_video_studio: {
    demoSafe: false,
    reason: "Opens the recorder/editor itself; compose and run automatic demos from Video Studio instead."
  },
  generate_quiz: { requires: ["source"], produces: ["quiz"] },
  generate_glossary: { requires: ["source"], produces: ["glossary"] },
  generate_simplified: { requires: ["source"], produces: ["source"], params: ["grade"] },
  generate_sentence_frames: { requires: ["source"], produces: ["sentence-frames"] },
  generate_analysis: { requires: ["source"], produces: ["analysis"] },
  generate_outline: { requires: ["source"], produces: ["outline"] },
  launch_flashcards: { requires: ["glossary"] },
  export_pack: {
    demoSafe: false,
    requires: ["source"],
    interaction: "external",
    reason: "Starts a file download outside the recorded workflow."
  },
  translate_document: {
    demoSafe: false,
    requires: ["pipeline"],
    interaction: "interactive",
    params: ["language"],
    reason: "Prepares translation controls but still requires a teacher click and AI quota."
  },
  pipeline_score: { requires: ["pipeline"] },
  pipeline_issues: { requires: ["pipeline"] },
  pipeline_downloads: { requires: ["pipeline"] },
  pipeline_verification: { requires: ["pipeline"] },
  pipeline_tour: { requires: ["pipeline"] },
  pipeline_fix_again: {
    demoSafe: false,
    requires: ["pipeline"],
    reason: "Starts a real remediation pass."
  },
  pipeline_stop: {
    demoSafe: false,
    requires: ["pipeline"],
    reason: "Stops an active remediation pass."
  }
});
const DEMO_BLOCKED_COMMANDS = /* @__PURE__ */ new Set([
  "open_notebook",
  "open_class_session",
  "open_class_analytics",
  "open_ai_settings",
  "open_roster",
  "open_project_settings",
  "open_behavior_lens",
  "open_report_writer",
  "open_dynamic_assessment",
  "open_submission_inbox",
  "submit_work",
  "toggle_dictation",
  "voice_start",
  "voice_stop",
  "toggle_cloud_sync",
  "report_problem",
  "clear_my_answers"
]);
function getCommandContract(commandOrId) {
  const cmd = commandOrId && typeof commandOrId === "object" ? commandOrId : null;
  const id = String(cmd ? cmd.id : commandOrId || "");
  const declared = PLAN_CONTRACTS[id] || {};
  return {
    demoSafe: declared.demoSafe !== false && !DEMO_BLOCKED_COMMANDS.has(id) && !(cmd && cmd.destructive),
    interaction: declared.interaction || "automatic",
    terminal: !!declared.terminal,
    requires: Array.isArray(declared.requires) ? declared.requires.slice() : [],
    produces: Array.isArray(declared.produces) ? declared.produces.slice() : [],
    params: Array.isArray(declared.params) ? declared.params.slice() : [],
    reason: declared.reason || ""
  };
}
function _planCapabilities(ctx) {
  const out = /* @__PURE__ */ new Set();
  if (ctx && ctx.hasSourceOrAnalysis) out.add("source");
  if (ctx && ctx.contentIsGlossary) out.add("glossary");
  if (ctx && ctx.contentLoaded) out.add("content");
  if (ctx && ctx.pipelineOpen) out.add("pipeline");
  return out;
}
function validatePlan(ctx, rawSteps, opts = {}) {
  const list = (Array.isArray(rawSteps) ? rawSteps : []).slice(0, 8);
  const all = buildAlloCommands(ctx || {}, { includeGated: true });
  const liveIds = new Set(buildAlloCommands(ctx || {}).map((c) => c.id));
  const initial = _planCapabilities(ctx || {});
  const capabilities = new Set(initial);
  const items = [];
  for (let i = 0; i < list.length; i++) {
    const step = list[i] || {};
    const cmd = all.find((c) => c.id === step.commandId);
    const contract = getCommandContract(cmd || step.commandId);
    let status = "ready";
    let detail = "";
    if (!cmd) {
      status = "block";
      detail = "This command is not available for the current role.";
    } else if (opts.demoSafeOnly && !contract.demoSafe) {
      status = "block";
      detail = contract.reason || "This command is not allowed in automatic demo recording.";
    } else {
      const missing = contract.requires.filter((name) => !capabilities.has(name));
      if (missing.length) {
        status = "block";
        detail = "Needs " + missing.join(", ") + " before this step.";
      } else if (contract.terminal && i < list.length - 1) {
        status = "block";
        detail = contract.reason || "This interactive command must be the final step.";
      } else if (contract.interaction !== "automatic" && !opts.allowInteractive) {
        status = "block";
        detail = contract.reason || "This step requires teacher interaction.";
      } else if (!liveIds.has(cmd.id)) {
        const unlockedByPlan = contract.requires.length > 0 && contract.requires.every((name) => capabilities.has(name)) && contract.requires.some((name) => !initial.has(name));
        if (!unlockedByPlan) {
          status = "block";
          detail = "This command is not available in the current app state.";
        }
      }
    }
    if (status !== "block") contract.produces.forEach((name) => capabilities.add(name));
    items.push({
      index: i,
      commandId: step.commandId || "",
      label: cmd && cmd.label || step.commandId || "Unknown command",
      params: _cleanPlanParams(step.params),
      why: typeof step.why === "string" ? step.why.slice(0, 120) : "",
      status,
      detail,
      contract
    });
  }
  const blockingCount = items.filter((item) => item.status === "block").length;
  return {
    ok: list.length > 0 && blockingCount === 0,
    items,
    blockingCount,
    warningCount: items.filter((item) => item.status === "warn").length
  };
}
function buildAlloCommands(ctx, opts = {}) {
  const t = _mkT(ctx && ctx.t);
  const cmds = [
    // ── Navigate ──
    { id: "open_educator_hub", opensPanel: "educatorHub", icon: "\u{1F3EB}", roles: "teacher", label: t("cmd.open_educator_hub", "Open the Educator Hub"), aliases: ["educator hub", "teacher hub", "hub", "document pipeline", "remediation pipeline", "make a document accessible", "fix a pdf"], hint: t("cmd.open_educator_hub_hint", "Lesson tools + the Document Pipeline card"), run: (c) => {
      c.setShowEducatorHub(true);
      return t("cmd.open_educator_hub_done", "Educator Hub opened \u2014 the Document Pipeline card is near the top.");
    } },
    { id: "open_learning_hub", opensPanel: "learningHub", icon: "\u{1F393}", roles: "all", label: t("cmd.open_learning_hub", "Open the Learning Hub"), aliases: ["learning hub", "student hub", "games"], hint: t("cmd.open_learning_hub_hint", "Games, practice, and study tools"), run: (c) => {
      c.setShowLearningHub(true);
      return t("cmd.open_learning_hub_done", "Learning Hub opened.");
    } },
    { id: "open_document_builder", opensPanel: "exportPreview", icon: "\u{1F4DD}", roles: "teacher", label: t("cmd.open_document_builder", "Open the Document Builder"), aliases: ["document builder", "builder", "export preview", "differentiate"], hint: t("cmd.open_document_builder_hint", "Build and export differentiated documents"), run: (c) => {
      c.openExportPreview();
      return t("cmd.open_document_builder_done", "Document Builder opened.");
    } },
    { id: "open_wizard", icon: "\u{1FA84}", roles: "teacher", label: t("cmd.open_wizard", "Start the lesson wizard"), aliases: ["wizard", "new lesson", "create lesson", "guided setup"], hint: t("cmd.open_wizard_hint", "Step-by-step lesson creation"), run: (c) => {
      c.setShowWizard(true);
      return t("cmd.open_wizard_done", "Lesson wizard started.");
    } },
    { id: "open_notebook", opensPanel: "notebook", icon: "\u{1F4D3}", roles: "all", label: t("cmd.open_notebook", "Open my notebook"), aliases: ["notebook", "notes"], hint: t("cmd.open_notebook_hint", "Saved notes and entries"), run: (c) => {
      c.setShowNotebook(true);
      return t("cmd.open_notebook_done", "Notebook opened.");
    } },
    { id: "open_translate", icon: "\u{1F310}", roles: "teacher", label: t("cmd.open_translate", "Open translation"), aliases: ["translate", "translation", "language", "translate to", "translate into"], hint: t("cmd.open_translate_hint", "Translate the current content"), run: (c) => {
      c.openTranslateModal();
      return t("cmd.open_translate_done", "Translation dialog opened.");
    } },
    { id: "open_class_session", opensPanel: "sessionModal", icon: "\u{1F465}", roles: "teacher", label: t("cmd.open_class_session", "Open class session"), aliases: ["class session", "session", "live class", "class code"], hint: t("cmd.open_class_session_hint", "Start or join a live class session"), run: (c) => {
      c.setShowSessionModal(true);
      return t("cmd.open_class_session_done", "Class session dialog opened.");
    } },
    { id: "open_class_analytics", opensPanel: "classAnalytics", icon: "\u{1F4C8}", roles: "teacher", label: t("cmd.open_class_analytics", "Open class analytics"), aliases: ["analytics", "class data", "progress data"], hint: t("cmd.open_class_analytics_hint", "Whole-class progress"), run: (c) => {
      c.setShowClassAnalytics(true);
      return t("cmd.open_class_analytics_done", "Class analytics opened.");
    } },
    { id: "open_export_menu", opensPanel: "exportMenu", icon: "\u{1F4E4}", roles: "teacher", label: t("cmd.open_export_menu", "Open the export menu"), aliases: ["export", "download menu", "share"], hint: t("cmd.open_export_menu_hint", "Export the current content"), run: (c) => {
      c.setShowExportMenu(true);
      return t("cmd.open_export_menu_done", "Export menu opened.");
    } },
    { id: "open_ai_settings", icon: "\u{1F916}", roles: "teacher", label: t("cmd.open_ai_settings", "Open AI settings"), aliases: ["ai settings", "ai backend", "api key", "model settings"], hint: t("cmd.open_ai_settings_hint", "Configure the AI backend"), run: (c) => {
      c.setShowAIBackendModal(true);
      return t("cmd.open_ai_settings_done", "AI settings opened.");
    } },
    // ── Navigate (added 2026-06-13: dashboard + roster + project-settings parity) ──
    { id: "go_dashboard", opensPanel: "dashboard", icon: "\u{1F3E0}", roles: "all", label: t("cmd.go_dashboard", "Go to the dashboard"), aliases: ["dashboard", "home", "go home", "main view", "overview"], hint: t("cmd.go_dashboard_hint", "Back to the main lesson view"), run: (c) => {
      c.goToDashboard();
      return t("cmd.go_dashboard_done", "Dashboard.");
    } },
    { id: "open_roster", icon: "\u{1F9D1}\u200D\u{1F91D}\u200D\u{1F9D1}", roles: "teacher", label: t("cmd.open_roster", "Open the class roster"), aliases: ["roster", "manage roster", "class roster", "roster key"], hint: t("cmd.open_roster_hint", "Manage your class groups"), run: (c) => {
      c.openRoster();
      return t("cmd.open_roster_done", "Class roster opened.");
    } },
    { id: "open_project_settings", icon: "\u2699\uFE0F", roles: "teacher", label: t("cmd.open_project_settings", "Open project settings"), aliases: ["project settings", "student settings", "lesson settings", "permissions", "allow ai"], hint: t("cmd.open_project_settings_hint", "Per-project AI, dictation, and Socratic gating"), run: (c) => {
      c.openProjectSettings();
      return t("cmd.open_project_settings_done", "Project settings opened.");
    } },
    // ── Open a tool (added 2026-06-13) — quick-launch the workspaces that normally live behind a
    //    hub card. Each is opensPanel-tagged so launching it CLOSES any open hub / other tool (the
    //    panel-stacking fix) instead of stacking. The ctx open-closures mirror the hub cards. ──
    { id: "open_stem_lab", opensPanel: "stemLab", icon: "\u{1F52C}", roles: "all", label: t("cmd.open_stem_lab", "Open the STEM Lab"), aliases: ["stem lab", "stem", "science lab", "math lab", "simulations", "labs"], hint: t("cmd.open_stem_lab_hint", "Interactive science & math tools"), run: (c) => {
      c.openStemLab();
      return t("cmd.open_stem_lab_done", "STEM Lab opened.");
    } },
    { id: "open_storyforge", opensPanel: "storyForge", icon: "\u270D\uFE0F", roles: "all", label: t("cmd.open_storyforge", "Open StoryForge"), aliases: ["storyforge", "story forge", "creative writing", "write a story"], hint: t("cmd.open_storyforge_hint", "Guided creative writing"), run: (c) => {
      c.openStoryForge();
      return t("cmd.open_storyforge_done", "StoryForge opened.");
    } },
    { id: "open_allohaven", opensPanel: "alloHaven", icon: "\u{1F3DD}\uFE0F", roles: "all", label: t("cmd.open_allohaven", "Open AlloHaven"), aliases: ["allohaven", "allo haven", "haven", "calm space", "regulation space", "break space"], hint: t("cmd.open_allohaven_hint", "A calm, regulating space"), run: (c) => {
      c.openAlloHaven();
      return t("cmd.open_allohaven_done", "AlloHaven opened.");
    } },
    { id: "open_behavior_lens", opensPanel: "behaviorLens", icon: "\u{1F50E}", roles: "teacher", label: t("cmd.open_behavior_lens", "Open the Behavior Lens"), aliases: ["behavior lens", "behaviour lens", "abc data", "behavior data", "fba", "observation"], hint: t("cmd.open_behavior_lens_hint", "Behavior observation & analysis"), run: (c) => {
      c.openBehaviorLens();
      return t("cmd.open_behavior_lens_done", "Behavior Lens opened.");
    } },
    { id: "open_report_writer", opensPanel: "reportWriter", icon: "\u{1F4C4}", roles: "teacher", label: t("cmd.open_report_writer", "Open the Report Writer"), aliases: ["report writer", "write a report", "evaluation report", "psych report", "reports"], hint: t("cmd.open_report_writer_hint", "Draft evaluation reports"), run: (c) => {
      c.openReportWriter();
      return t("cmd.open_report_writer_done", "Report Writer opened.");
    } },
    { id: "open_symbol_studio", opensPanel: "symbolStudio", icon: "\u{1F523}", roles: "teacher", label: t("cmd.open_symbol_studio", "Open Symbol Studio"), aliases: ["symbol studio", "aac", "communication board", "picture symbols", "symbols", "visual schedule"], hint: t("cmd.open_symbol_studio_hint", "AAC boards & visual supports"), run: (c) => {
      c.openSymbolStudio();
      return t("cmd.open_symbol_studio_done", "Symbol Studio opened.");
    } },
    { id: "open_video_studio", opensPanel: "videoStudio", icon: "\u{1F3A5}", roles: "teacher", label: t("cmd.open_video_studio", "Open Video Studio"), aliases: ["video studio", "screen recorder", "record a demo", "demo recorder", "tutorial recorder"], hint: t("cmd.open_video_studio_hint", "Record, caption, and edit walkthroughs"), run: (c) => {
      c.openVideoStudio();
      return t("cmd.open_video_studio_done", "Video Studio opened.");
    } },
    { id: "open_cinematic_studio", opensPanel: "cinematicStudio", icon: "\u{1F3AC}", roles: "teacher", label: t("cmd.open_cinematic_studio", "Open Cinematic Studio"), aliases: ["cinematic studio", "cinematic crawl", "title crawl", "intro video", "video opener"], hint: t("cmd.open_cinematic_studio_hint", "Create cinematic intros and explainers"), run: (c) => {
      c.openCinematicStudio();
      return t("cmd.open_cinematic_studio_done", "Cinematic Studio opened.");
    } },
    { id: "open_allo_studio", opensPanel: "alloStudio", icon: "\u{1F5BC}\uFE0F", roles: "teacher", label: t("cmd.open_allo_studio", "Open AlloStudio"), aliases: ["allostudio", "allo studio", "design studio", "poster editor", "worksheet editor", "flyer studio"], hint: t("cmd.open_allo_studio_hint", "Design accessible posters, flyers, and worksheets"), run: (c) => {
      c.openAlloStudio();
      return t("cmd.open_allo_studio_done", "AlloStudio opened.");
    } },
    { id: "open_accessibility_lab", opensPanel: "accessibilityLab", icon: "\u267F", roles: "teacher", label: t("cmd.open_accessibility_lab", "Open the Accessibility Lab"), aliases: ["accessibility lab", "a11y lab", "accessibility checker", "wcag", "contrast checker"], hint: t("cmd.open_accessibility_lab_hint", "Check & improve accessibility"), run: (c) => {
      c.openAccessibilityLab();
      return t("cmd.open_accessibility_lab_done", "Accessibility Lab opened.");
    } },
    { id: "open_lumen", opensPanel: "stemLab", icon: "\u{1F4A1}", roles: "teacher", label: t("cmd.open_lumen", "Open Lumen (data canvas)"), aliases: ["lumen", "data canvas", "chart data", "graph data", "progress charts", "visualize data"], hint: t("cmd.open_lumen_hint", "Turn assessment data into charts"), run: (c) => {
      c.openLumen();
      return t("cmd.open_lumen_done", "Lumen opened in the STEM Lab.");
    } },
    { id: "open_community_catalog", opensPanel: "communityCatalog", icon: "\u{1F5C2}\uFE0F", roles: "teacher", label: t("cmd.open_community_catalog", "Open the Community Catalog"), aliases: ["community catalog", "catalog", "shared lessons", "browse lessons", "community"], hint: t("cmd.open_community_catalog_hint", "Browse shared community lessons"), run: (c) => {
      c.openCommunityCatalog();
      return t("cmd.open_community_catalog_done", "Community Catalog opened.");
    } },
    { id: "open_dynamic_assessment", opensPanel: "dynamicAssessment", icon: "\u{1F4CA}", roles: "teacher", label: t("cmd.open_dynamic_assessment", "Open Dynamic Assessment"), aliases: ["dynamic assessment", "progress monitoring", "probe", "cbm", "assessment"], hint: t("cmd.open_dynamic_assessment_hint", "Run a dynamic assessment"), run: (c) => {
      c.openDynamicAssessment();
      return t("cmd.open_dynamic_assessment_done", "Dynamic Assessment opened.");
    } },
    { id: "open_reading_library", opensPanel: "readingLibrary", icon: "\u{1F4DA}", roles: "all", label: t("cmd.open_reading_library", "Open the Reading Library"), aliases: ["reading library", "library", "books", "picture books", "storyweaver", "read a book"], hint: t("cmd.open_reading_library_hint", "Browse open picture books in 10 languages"), run: (c) => {
      c.openReadingLibrary();
      return t("cmd.open_reading_library_done", "Reading Library opened.");
    } },
    { id: "open_open_groove", opensPanel: "openGroove", icon: "\u{1F39B}\uFE0F", roles: "all", label: t("cmd.open_open_groove", "Open Open Groove Studio"), aliases: ["open groove", "groove studio", "music studio", "beat maker", "beats", "synth", "composer"], hint: t("cmd.open_open_groove_hint", "Make beats, synth patterns, and notation-aware music"), run: (c) => {
      c.openOpenGroove();
      return t("cmd.open_open_groove_done", "Open Groove Studio opened.");
    } },
    { id: "open_timeline_studio", opensPanel: "timelineStudio", icon: "\u{1F570}\uFE0F", roles: "all", label: t("cmd.open_timeline_studio", "Open Timeline Studio"), aliases: ["timeline studio", "timeline maker", "sequence builder", "chronology", "history timeline"], hint: t("cmd.open_timeline_studio_hint", "Build and verify accessible timelines"), run: (c) => {
      c.openTimelineStudio();
      return t("cmd.open_timeline_studio_done", "Timeline Studio opened.");
    } },
    { id: "open_lingua_practice", opensPanel: "linguaPractice", icon: "A/\u6587", roles: "all", label: t("cmd.open_lingua_practice", "Open Lingua Practice"), aliases: ["lingua practice", "language practice", "practice language", "vocabulary practice", "multilingual practice"], hint: t("cmd.open_lingua_practice_hint", "Practice vocabulary and language from the current source"), run: (c) => {
      c.openLinguaPractice();
      return t("cmd.open_lingua_practice_done", "Lingua Practice opened.");
    } },
    { id: "open_test_prep_hub", opensPanel: "testPrepHub", icon: "\u{1F9ED}", roles: "all", label: t("cmd.open_test_prep_hub", "Open Test Prep Hub"), aliases: ["test prep", "test prep hub", "exam prep", "practice questions", "study exams"], hint: t("cmd.open_test_prep_hub_hint", "Open free practice sets and study tools"), run: (c) => {
      c.openTestPrepHub();
      return t("cmd.open_test_prep_hub_done", "Test Prep Hub opened.");
    } },
    { id: "find_reading", opensPanel: "readingLibrary", icon: "\u{1F4DA}", roles: "all", label: t("cmd.find_reading", "Find the right book"), aliases: ["find a book", "find books about", "recommend a book", "suggest a book", "book about", "books about", "reading about", "learn about", "science article about", "primary source about"], hint: t("cmd.find_reading_hint", "Ask by topic, grade, language, source, or type"), run: (c, params) => runFindReadingCommand(c, params || {}, t) },
    // ── Create from this content (teacher) + submit (student) — added 2026-06-13 (Slice 2) ──
    { id: "generate_quiz", icon: "\u{1F4DD}", roles: "teacher", when: (c) => !!c.hasSourceOrAnalysis, label: t("cmd.generate_quiz", "Make a quiz from this"), aliases: ["make a quiz", "quiz me on this", "create a quiz", "comprehension questions", "generate quiz"], hint: t("cmd.generate_quiz_hint", "Generate a quiz from the current content"), run: (c) => {
      c.generateQuiz();
      return t("cmd.generate_quiz_done", "Generating a quiz from this content\u2026");
    }, runAsync: (c) => Promise.resolve(c.generateQuiz()).then(() => t("cmd.generate_quiz_ready", "Quiz ready \u2014 it\u2019s in the output panel.")) },
    { id: "generate_glossary", icon: "\u{1F4D6}", roles: "teacher", when: (c) => !!c.hasSourceOrAnalysis, label: t("cmd.generate_glossary", "Make a vocabulary glossary"), aliases: ["glossary", "vocabulary", "vocab", "key terms", "word list"], hint: t("cmd.generate_glossary_hint", "Generate a glossary from the current content"), run: (c) => {
      c.generateGlossary();
      return t("cmd.generate_glossary_done", "Generating a glossary\u2026");
    }, runAsync: (c) => Promise.resolve(c.generateGlossary()).then(() => t("cmd.generate_glossary_ready", "Glossary ready.")) },
    { id: "generate_simplified", icon: "\u{1F4C9}", roles: "teacher", when: (c) => !!c.hasSourceOrAnalysis, label: t("cmd.generate_simplified", "Simplify this text"), aliases: ["simplify", "simplify this", "make it easier", "lower the reading level", "leveled text", "easier version"], hint: t("cmd.generate_simplified_hint", "Generate a simpler reading level \u2014 say \u201Cto grade N\u201D for a target"), run: (c, params) => {
      c.generateSimplified(params && params.grade ? { grade: params.grade } : {});
      return t("cmd.generate_simplified_done", "Generating a simpler version\u2026");
    }, runAsync: (c, params) => Promise.resolve(c.generateSimplified(params && params.grade ? { grade: params.grade } : {})).then(() => t("cmd.generate_simplified_ready", "Simpler version ready.")) },
    { id: "generate_sentence_frames", icon: "\u{1F9E9}", roles: "teacher", when: (c) => !!c.hasSourceOrAnalysis, label: t("cmd.generate_sentence_frames", "Make sentence frames"), aliases: ["sentence frames", "sentence starters", "scaffolds", "language support"], hint: t("cmd.generate_sentence_frames_hint", "Generate sentence frames from the current content"), run: (c) => {
      c.generateSentenceFrames();
      return t("cmd.generate_sentence_frames_done", "Generating sentence frames\u2026");
    }, runAsync: (c) => Promise.resolve(c.generateSentenceFrames()).then(() => t("cmd.generate_sentence_frames_ready", "Sentence frames ready.")) },
    { id: "generate_analysis", icon: "\u{1F52C}", roles: "teacher", when: (c) => !!c.hasSourceOrAnalysis, label: t("cmd.generate_analysis", "Analyze this source"), aliases: ["analyze", "analysis", "source analysis", "analyze this"], hint: t("cmd.generate_analysis_hint", "Run a source analysis on the current content"), run: (c) => {
      c.generateAnalysis();
      return t("cmd.generate_analysis_done", "Analyzing this source\u2026");
    }, runAsync: (c) => Promise.resolve(c.generateAnalysis()).then(() => t("cmd.generate_analysis_ready", "Source analysis ready.")) },
    { id: "submit_work", icon: "\u{1F4E8}", roles: "all", when: (c) => !c.isTeacherMode, label: t("cmd.submit_work", "Submit my work"), aliases: ["submit", "submit my work", "hand it in", "turn in"], hint: t("cmd.submit_work_hint", "Send your work to your teacher"), run: (c) => {
      c.submitWork();
      return t("cmd.submit_work_done", "Opening the submit dialog\u2026");
    } },
    // ── Accessibility self-service (available in every mode) ──
    { id: "font_bigger", icon: "\u{1F50D}", roles: "all", label: t("cmd.font_bigger", "Make the text bigger"), aliases: ["bigger text", "larger text", "increase font", "increase text size", "make text bigger", "zoom in text"], hint: t("cmd.font_bigger_hint", "+2 to the reading font size"), run: (c) => {
      const v = c.fontBigger();
      return t("cmd.font_bigger_done", "Text size increased to ") + v + ".";
    } },
    { id: "font_smaller", icon: "\u{1F50E}", roles: "all", label: t("cmd.font_smaller", "Make the text smaller"), aliases: ["smaller text", "decrease font", "reduce text", "make text smaller"], hint: t("cmd.font_smaller_hint", "\u22122 to the reading font size"), run: (c) => {
      const v = c.fontSmaller();
      return t("cmd.font_smaller_done", "Text size decreased to ") + v + ".";
    } },
    { id: "font_reset", icon: "\u21A9\uFE0F", roles: "all", label: t("cmd.font_reset", "Reset the text size"), aliases: ["reset font", "normal text size", "default font"], hint: t("cmd.font_reset_hint", "Back to the default size"), run: (c) => {
      c.resetFontSize();
      return t("cmd.font_reset_done", "Text size reset to default.");
    } },
    { id: "open_text_settings", icon: "\u{1F524}", roles: "all", label: t("cmd.open_text_settings", "Open text settings"), aliases: ["text settings", "font settings", "dyslexia font", "spacing"], hint: t("cmd.open_text_settings_hint", "Font, spacing, and color options"), run: (c) => {
      c.setShowTextSettings(true);
      return t("cmd.open_text_settings_done", "Text settings opened.");
    } },
    { id: "open_voice_settings", icon: "\u{1F5E3}\uFE0F", roles: "all", label: t("cmd.open_voice_settings", "Open voice settings"), aliases: ["voice settings", "speech settings", "tts settings", "speaking voice", "volume", "louder", "quieter"], hint: t("cmd.open_voice_settings_hint", "Voice, speed, and volume"), run: (c) => {
      c.setShowVoiceSettings(true);
      return t("cmd.open_voice_settings_done", "Voice settings opened.");
    } },
    { id: "read_this_page", opensPanel: "readThisPage", icon: "\u{1F4D6}", roles: "all", label: t("cmd.read_this_page", "Read this page to me"), aliases: ["read aloud", "read page", "read it", "listen"], hint: t("cmd.read_this_page_hint", "Opens the page reader"), run: (c) => {
      c.setShowReadThisPage(true);
      return t("cmd.read_this_page_done", "Page reader opened \u2014 choose where to start.");
    } },
    { id: "toggle_focus_mode", icon: "\u{1F3AF}", roles: "all", label: t("cmd.toggle_focus_mode", "Toggle focus mode"), aliases: ["focus mode", "concentrate", "distraction free"], hint: t("cmd.toggle_focus_mode_hint", "Dim everything but the content"), run: (c) => {
      c.handleToggleFocusMode();
      return t("cmd.toggle_focus_mode_done", "Focus mode toggled.");
    } },
    { id: "toggle_reading_ruler", icon: "\u{1F4CF}", roles: "all", label: t("cmd.toggle_reading_ruler", "Toggle the reading ruler"), aliases: ["reading ruler", "line guide", "ruler"], hint: t("cmd.toggle_reading_ruler_hint", "A movable line guide for tracking"), run: (c) => {
      c.handleToggleReadingRuler();
      return t("cmd.toggle_reading_ruler_done", "Reading ruler toggled.");
    } },
    { id: "toggle_help_mode", icon: "\u2753", roles: "all", label: t("cmd.toggle_help_mode", "Toggle help mode"), aliases: ["help mode", "what does this do", "explain buttons"], hint: t("cmd.toggle_help_mode_hint", "Click anything to learn what it does"), run: (c) => {
      c.handleToggleIsHelpMode();
      return t("cmd.toggle_help_mode_done", "Help mode toggled \u2014 click any control to learn about it.");
    } },
    { id: "toggle_bot", icon: "\u{1F916}", roles: "all", chatSkip: true, label: t("cmd.toggle_bot", "Show or hide AlloBot"), aliases: ["allobot", "bot", "assistant", "hide bot", "show bot"], hint: t("cmd.toggle_bot_hint", "The assistant character"), run: (c) => {
      c.handleToggleIsBotVisible();
      return t("cmd.toggle_bot_done", "AlloBot visibility toggled.");
    } },
    { id: "toggle_line_focus", icon: "\u{1F526}", roles: "all", label: t("cmd.toggle_line_focus", "Toggle line focus"), aliases: ["line focus", "focus line", "one line"], hint: t("cmd.toggle_line_focus_hint", "Highlight one line at a time"), run: (c) => {
      c.toggleLineFocus();
      return t("cmd.toggle_line_focus_done", "Line focus toggled.");
    } },
    { id: "toggle_visual_supports", icon: "\u{1F5BC}\uFE0F", roles: "all", label: t("cmd.toggle_visual_supports", "Toggle visual supports"), aliases: ["visual supports", "picture supports", "visuals"], hint: t("cmd.toggle_visual_supports_hint", "Picture cues alongside the text"), run: (c) => {
      c.handleToggleVisualSupports();
      return t("cmd.toggle_visual_supports_done", "Visual supports toggled.");
    } },
    { id: "toggle_dictation", icon: "\u{1F3A4}", roles: "all", label: t("cmd.toggle_dictation", "Toggle dictation"), aliases: ["dictation", "speech to text", "type by voice"], hint: t("cmd.toggle_dictation_hint", "Speak instead of typing"), run: (c) => {
      c.toggleDictation();
      return t("cmd.toggle_dictation_done", "Dictation toggled.");
    } },
    { id: "toggle_socratic", icon: "\u{1F4AC}", roles: "all", label: t("cmd.toggle_socratic", "Toggle the Socratic chat"), aliases: ["socratic", "study chat", "thinking partner"], hint: t("cmd.toggle_socratic_hint", "A question-first study companion"), run: (c) => {
      c.handleToggleShowSocraticChat();
      return t("cmd.toggle_socratic_done", "Socratic chat toggled.");
    } },
    { id: "zen_on", icon: "\u{1F9D8}", roles: "all", when: (c) => !c.zenActive, label: t("cmd.zen_on", "Enter zen mode"), aliases: ["zen", "zen mode", "quiet mode", "minimal"], hint: t("cmd.zen_on_hint", "Hide everything but the content"), run: (c) => {
      c.zenOn();
      return t("cmd.zen_on_done", "Zen mode on \u2014 press Ctrl+K and run \u201Cexit zen\u201D to come back.");
    } },
    { id: "zen_off", icon: "\u{1F519}", roles: "all", when: (c) => !!c.zenActive, label: t("cmd.zen_off", "Exit zen mode"), aliases: ["exit zen", "leave zen", "show interface"], hint: t("cmd.zen_off_hint", "Bring the interface back"), run: (c) => {
      c.zenOff();
      return t("cmd.zen_off_done", "Zen mode off.");
    } },
    // ── Display & motion + report-a-problem (added 2026-06-13: palette parity) ──
    { id: "switch_theme", icon: "\u{1F3A8}", roles: "all", label: t("cmd.switch_theme", "Switch the theme (light / dark / high contrast)"), aliases: ["theme", "dark mode", "light mode", "high contrast", "contrast mode", "night mode"], hint: t("cmd.switch_theme_hint", "Cycle light \u2192 dark \u2192 high contrast"), run: (c) => {
      c.toggleTheme();
      return t("cmd.switch_theme_done", "Theme switched \u2014 cycling light, then dark, then high contrast.");
    } },
    { id: "toggle_color_overlay", icon: "\u{1F308}", roles: "all", label: t("cmd.toggle_color_overlay", "Toggle the color overlay"), aliases: ["color overlay", "overlay", "tint", "color filter", "irlen", "screen tint"], hint: t("cmd.toggle_color_overlay_hint", "Cycle a soft colored tint over the page"), run: (c) => {
      c.toggleOverlay();
      return t("cmd.toggle_color_overlay_done", "Color overlay changed.");
    } },
    { id: "toggle_animations", icon: "\u{1F300}", roles: "all", label: t("cmd.toggle_animations", "Turn animations off (reduced motion)"), aliases: ["disable animations", "reduce motion", "stop animations", "no motion", "calm motion"], hint: t("cmd.toggle_animations_hint", "Reduce on-screen motion"), run: (c) => {
      c.toggleAnimations();
      return t("cmd.toggle_animations_done", "Animations toggled.");
    } },
    { id: "report_problem", icon: "\u{1F41E}", roles: "all", label: t("cmd.report_problem", "Report a problem"), aliases: ["report a problem", "feedback", "bug report", "something is broken", "contact support"], hint: t("cmd.report_problem_hint", "Open the problem reporter"), run: (c) => {
      c.openErrorReporter();
      return t("cmd.report_problem_done", "Problem reporter opened.");
    } },
    // ── Pipeline (only offered while remediation results are open) ──
    { id: "pipeline_score", icon: "\u{1F3AF}", roles: "teacher", when: (c) => !!c.getPipelineScore && !!c.getPipelineScore(), label: t("cmd.pipeline_score", "What\u2019s my accessibility score?"), aliases: ["score", "my score", "accessibility score", "how accessible"], hint: t("cmd.pipeline_score_hint", "Speaks the current before \u2192 after"), run: (c) => {
      const s = c.getPipelineScore();
      return s ? t("cmd.pipeline_score_done", "Score: ") + (s.before != null ? s.before + " before, " : "") + s.after + " of 100 now, target " + s.target + "." : t("cmd.pipeline_score_none", "No remediation run is open.");
    } },
    { id: "pipeline_issues", icon: "\u{1F4CB}", roles: "teacher", when: (c) => !!c.getRemainingIssues && c.getRemainingIssues().length > 0, label: t("cmd.pipeline_issues", "Read the remaining issues"), aliases: ["remaining issues", "issues left", "what is left", "problems"], hint: t("cmd.pipeline_issues_hint", "Speaks the top remaining issues"), run: (c) => {
      const iss = c.getRemainingIssues();
      const top = iss.slice(0, 3).map((x, i) => i + 1 + ". " + (typeof x === "string" ? x : x.issue || x.description || "")).join(" ");
      return t("cmd.pipeline_issues_done", "Remaining issues: ") + iss.length + ". " + top + (iss.length > 3 ? " \u2026" + t("cmd.pipeline_issues_more", "and ") + (iss.length - 3) + t("cmd.pipeline_issues_more2", " more in the Issues panel.") : "");
    } },
    { id: "pipeline_downloads", icon: "\u{1F4E5}", roles: "teacher", when: (c) => !!c.pipelineOpen, label: t("cmd.pipeline_downloads", "Go to pipeline downloads"), aliases: ["downloads", "get my files", "tagged pdf"], hint: t("cmd.pipeline_downloads_hint", "Scrolls to the Downloads section"), run: (c) => {
      return c.jumpToPipelineSection("allo-sec-downloads") ? t("cmd.pipeline_downloads_done", "Downloads section \u2014 the tagged PDF is the share-ready copy.") : t("cmd.pipeline_jump_miss", "That section isn\u2019t on screen right now.");
    } },
    { id: "pipeline_verification", icon: "\u2705", roles: "teacher", when: (c) => !!c.pipelineOpen, label: t("cmd.pipeline_verification", "Go to pipeline verification"), aliases: ["verification", "verify section", "evidence"], hint: t("cmd.pipeline_verification_hint", "Scrolls to the Verification section"), run: (c) => {
      return c.jumpToPipelineSection("allo-sec-verify") ? t("cmd.pipeline_verification_done", "Verification section.") : t("cmd.pipeline_jump_miss", "That section isn\u2019t on screen right now.");
    } },
    // ── Show me how (tours by command) ──
    { id: "app_tour", icon: "\u2728", roles: "all", when: (c) => !!c.startAppTour, label: t("cmd.app_tour", "Show me around the app"), aliases: ["tour", "app tour", "show me around", "how does this work", "walkthrough"], hint: t("cmd.app_tour_hint", "A guided tour of the main features"), run: (c) => {
      c.startAppTour();
      return t("cmd.app_tour_done", "Starting the tour \u2014 use Next to walk through.");
    } },
    { id: "pipeline_tour", icon: "\u{1F9ED}", roles: "teacher", when: (c) => !!c.pipelineOpen && !!c.startPipelineTour, label: t("cmd.pipeline_tour", "Show me around these results"), aliases: ["pipeline tour", "explain this screen", "walk me through the results"], hint: t("cmd.pipeline_tour_hint", "A 60-second tour of the remediation results"), run: (c) => {
      c.startPipelineTour("results");
      return t("cmd.pipeline_tour_done", "Starting the results tour.");
    } },
    // ── Parameter-carrying commands (S3) ──
    { id: "create_lesson", icon: "\u{1F9D1}\u200D\u{1F3EB}", roles: "teacher", when: (c) => !!c.startLessonFlow, label: t("cmd.create_lesson", "Create a lesson (tell me the topic)"), aliases: ["create a lesson", "make a lesson", "new lesson about", "plan a lesson", "lesson about"], hint: t("cmd.create_lesson_hint", "Starts the guided flow \u2014 say a topic and grade"), run: (c, p) => {
      c.startLessonFlow(p || {});
      return p && p.topic ? t("cmd.create_lesson_done", "Starting a lesson flow about \u201C") + p.topic + "\u201D" + (p.grade ? t("cmd.create_lesson_done2", " for grade ") + p.grade : "") + t("cmd.create_lesson_done3", " \u2014 AlloBot will guide the next steps.") : t("cmd.create_lesson_done_blank", "Starting the guided lesson flow \u2014 AlloBot will ask for your topic.");
    } },
    { id: "set_font_size", icon: "\u{1F520}", roles: "all", when: (c) => !!c.setFontSizeTo, label: t("cmd.set_font_size", "Set the text size (say a number)"), aliases: ["set text size", "text size to", "font size to"], hint: t("cmd.set_font_size_hint", "e.g. \u201Cset text size to 20\u201D (10\u201332)"), run: (c, p) => {
      const v = c.setFontSizeTo(p && p.size);
      return t("cmd.set_font_size_done", "Text size set to ") + v + ".";
    } },
    { id: "translate_document", icon: "\u{1F310}", roles: "teacher", when: (c) => !!c.pipelineOpen && !!c.prefillTranslateLang, label: t("cmd.translate_document", "Translate this document (say a language)"), aliases: ["translate this document", "translate document to", "translate to", "translate it into"], hint: t("cmd.translate_document_hint", "Pre-fills the language and points at the button"), run: (c, p) => {
      const lang = p && p.language ? String(p.language).trim() : "";
      if (lang) c.prefillTranslateLang(lang);
      try {
        if (c.whereIs) c.whereIs("translate document");
      } catch (_) {
      }
      return lang ? t("cmd.translate_document_done", "Set the translation language to ") + lang + t("cmd.translate_document_done2", " and spotlighted the button \u2014 press Translate to run it. (Translations use AI quota, so the click stays yours.)") : t("cmd.translate_document_pick", "Spotlighted the translation controls \u2014 pick a language and press Translate.");
    } },
    // ── Voice control (S2) ──
    { id: "voice_start", icon: "\u{1F399}\uFE0F", roles: "all", when: (c) => !c.voiceActive && c.voiceAvailable, label: t("cmd.voice_start", "Start voice control"), aliases: ["voice control", "start listening", "voice mode", "hands free"], hint: t("cmd.voice_start_hint", "AlloBot listens for commands until you stop it"), run: (c) => {
      c.startVoiceLoop();
      return t("cmd.voice_start_done", "Voice control on. Say a command like \u201Cbigger text\u201D or \u201Copen the educator hub\u201D. Say \u201Cstop listening\u201D to finish.");
    } },
    { id: "voice_stop", icon: "\u{1F6D1}", roles: "all", when: (c) => !!c.voiceActive, label: t("cmd.voice_stop", "Stop voice control"), aliases: ["stop listening", "stop voice", "voice off"], hint: t("cmd.voice_stop_hint", "Stops the microphone"), run: (c) => {
      c.stopVoiceLoop();
      return t("cmd.voice_stop_done", "Voice control off \u2014 the microphone is released.");
    } },
    // ── More coverage (2026-06-13, discovery w59vf8skj) — each maps to ONE existing host handler
    //    (verified by symbol in AlloFlowANTI.txt). Grouped via CMD_GROUP / CMD_CONTEXT above. ──
    { id: "stop_reading", icon: "\u23F9\uFE0F", roles: "all", label: t("cmd.stop_reading", "Stop reading aloud"), aliases: ["stop reading", "stop talking", "be quiet", "silence", "stop speech", "stop the voice"], hint: t("cmd.stop_reading_hint", "Interrupt the current text-to-speech"), run: (c) => {
      c.stopReading();
      return t("cmd.stop_reading_done", "Stopped reading aloud.");
    } },
    { id: "toggle_mute", icon: "\u{1F507}", roles: "all", label: t("cmd.toggle_mute", "Mute or unmute all audio"), aliases: ["mute", "unmute", "mute audio", "sound off", "sound on", "silence audio"], hint: t("cmd.toggle_mute_hint", "Toggle all app audio"), run: (c) => {
      const m = c.toggleMute();
      return m ? t("cmd.toggle_mute_on", "Audio muted.") : t("cmd.toggle_mute_off", "Audio unmuted.");
    } },
    { id: "cycle_reading_theme", icon: "\u{1F3A8}", roles: "all", label: t("cmd.cycle_reading_theme", "Change the reading theme"), aliases: ["reading theme", "next reading theme", "sepia", "dyslexia theme", "reading color", "paper color"], hint: t("cmd.cycle_reading_theme_hint", "Cycle warm, sepia, dark, dyslexia-friendly, and more"), run: (c) => {
      const th = c.cycleReadingTheme();
      return t("cmd.cycle_reading_theme_done", "Reading theme: ") + th + ".";
    } },
    { id: "line_spacing_more", icon: "\u2195\uFE0F", roles: "all", label: t("cmd.line_spacing_more", "Increase line spacing"), aliases: ["more line spacing", "increase spacing", "wider lines", "space out lines"], hint: t("cmd.line_spacing_more_hint", "+0.1 to the line height"), run: (c) => {
      const v = c.lineSpacingMore();
      return t("cmd.line_spacing_more_done", "Line spacing set to ") + v + ".";
    } },
    { id: "line_spacing_less", icon: "\u{1F90F}", roles: "all", label: t("cmd.line_spacing_less", "Decrease line spacing"), aliases: ["less line spacing", "decrease spacing", "tighter lines"], hint: t("cmd.line_spacing_less_hint", "\u22120.1 to the line height"), run: (c) => {
      const v = c.lineSpacingLess();
      return t("cmd.line_spacing_less_done", "Line spacing set to ") + v + ".";
    } },
    { id: "open_study_timer", icon: "\u23F2\uFE0F", roles: "all", label: t("cmd.open_study_timer", "Start a study timer"), aliases: ["study timer", "timer", "pomodoro", "focus timer", "countdown"], hint: t("cmd.open_study_timer_hint", "A focus / break timer"), run: (c) => {
      c.openStudyTimer();
      return t("cmd.open_study_timer_done", "Study timer opened.");
    } },
    { id: "open_sel_hub", opensPanel: "selHub", icon: "\u{1F49A}", roles: "all", label: t("cmd.open_sel_hub", "Open the SEL Hub"), aliases: ["sel hub", "social emotional", "feelings", "check in", "emotions", "calm corner"], hint: t("cmd.open_sel_hub_hint", "Social-emotional learning tools"), run: (c) => {
      c.openSelHub();
      return t("cmd.open_sel_hub_done", "SEL Hub opened.");
    } },
    { id: "open_submission_inbox", icon: "\u{1F4E5}", roles: "teacher", label: t("cmd.open_submission_inbox", "Open the submission inbox"), aliases: ["submission inbox", "submissions", "student work", "turned in", "inbox"], hint: t("cmd.open_submission_inbox_hint", "Review work students have submitted"), run: (c) => {
      c.openSubmissionInbox();
      return t("cmd.open_submission_inbox_done", "Submission inbox opened.");
    } },
    { id: "toggle_cloud_sync", icon: "\u2601\uFE0F", roles: "teacher", label: t("cmd.toggle_cloud_sync", "Turn cloud sync on or off"), aliases: ["cloud sync", "sync", "cloud save", "backup", "enable sync"], hint: t("cmd.toggle_cloud_sync_hint", "Sync your work to the cloud (asks consent the first time)"), run: (c) => {
      const r = c.toggleCloudSync();
      return r === "off" ? t("cmd.toggle_cloud_sync_off", "Cloud sync turned off.") : t("cmd.toggle_cloud_sync_consent", "Opening the cloud-sync consent dialog \u2014 confirm there to turn it on.");
    } },
    { id: "generate_outline", icon: "\u{1F5C2}\uFE0F", roles: "teacher", when: (c) => !!c.hasSourceOrAnalysis, label: t("cmd.generate_outline", "Make a concept outline"), aliases: ["outline", "concept outline", "make an outline", "structure", "summary outline"], hint: t("cmd.generate_outline_hint", "Generate an outline from the current content"), run: (c) => {
      c.generateOutline();
      return t("cmd.generate_outline_done", "Generating an outline\u2026");
    } },
    { id: "export_pack", icon: "\u{1F4E6}", roles: "teacher", when: (c) => !!c.hasSourceOrAnalysis, label: t("cmd.export_pack", "Download the lesson pack"), aliases: ["export pack", "download pack", "download lesson", "save lesson", "export html"], hint: t("cmd.export_pack_hint", "Download the lesson as a self-contained file"), run: (c) => {
      c.exportPack();
      return t("cmd.export_pack_done", "Preparing the lesson pack download\u2026");
    } },
    // ── Round-2 coverage (2026-06-14, discovery wfi4bz28q) — each maps to ONE App-scope handler
    //    (verified by symbol). pipeline_* gate on pipelineOpen / pipelineFixRunning. ──
    { id: "launch_flashcards", icon: "\u{1F0CF}", roles: "all", when: (c) => !!c.contentIsGlossary, label: t("cmd.launch_flashcards", "Study with flashcards"), aliases: ["flashcards", "flash cards", "study cards", "review cards", "study mode"], hint: t("cmd.launch_flashcards_hint", "Study this glossary as a flashcard deck"), run: (c) => {
      c.launchFlashcards();
      return t("cmd.launch_flashcards_done", "Flashcards ready.");
    } },
    { id: "open_persona_chat", icon: "\u{1F3AD}", roles: "all", label: t("cmd.open_persona_chat", "Open Persona interview"), aliases: ["persona", "interview", "interview mode", "talk to a character", "role play", "historical figure"], hint: t("cmd.open_persona_chat_hint", "Interview an AI persona about this topic"), run: (c) => {
      c.openPersona();
      return t("cmd.open_persona_chat_done", "Persona interview opened.");
    } },
    { id: "clear_my_answers", icon: "\u{1F9F9}", roles: "all", when: (c) => !!c.contentLoaded, label: t("cmd.clear_my_answers", "Clear my answers (start over)"), aliases: ["clear answers", "reset answers", "start over", "erase my answers", "redo activity"], hint: t("cmd.clear_my_answers_hint", "Reset your responses on this activity"), run: (c) => {
      c.resetScaffolds();
      return t("cmd.clear_my_answers_done", "Confirm in the dialog to clear your answers.");
    } },
    { id: "clear_workspace", icon: "\u{1F5D1}\uFE0F", roles: "teacher", destructive: true, label: t("cmd.clear_workspace", "Clear everything and start fresh"), aliases: ["clear workspace", "clear all", "start fresh", "clear history", "reset everything", "blank slate"], hint: t("cmd.clear_workspace_hint", "Removes the current content and history \u2014 asks first"), run: (c) => {
      c.clearWorkspace();
      return t("cmd.clear_workspace_done", "Workspace cleared.");
    } },
    { id: "undo_settings", icon: "\u23EA", roles: "teacher", label: t("cmd.undo_settings", "Undo my last settings change"), aliases: ["undo settings", "restore settings", "revert settings", "undo that change"], hint: t("cmd.undo_settings_hint", "Restore the previous lesson settings (not generated content)"), run: (c) => {
      c.restoreLastSettings();
      return t("cmd.undo_settings_done", "Restored your previous settings (if there was a change to undo).");
    } },
    { id: "pipeline_fix_again", icon: "\u{1F501}", roles: "teacher", when: (c) => !!c.pipelineOpen && !c.pipelineFixRunning, label: t("cmd.pipeline_fix_again", "Run the accessibility fix again"), aliases: ["fix again", "run again", "keep fixing", "improve the score", "another round"], hint: t("cmd.pipeline_fix_again_hint", "Another remediation pass to push the score higher"), run: (c) => {
      c.rerunPipelineFix();
      return t("cmd.pipeline_fix_again_done", "Running another remediation pass\u2026");
    } },
    { id: "pipeline_stop", icon: "\u{1F6D1}", roles: "teacher", when: (c) => !!c.pipelineFixRunning, label: t("cmd.pipeline_stop", "Stop the running fix"), aliases: ["stop fixing", "stop the fix", "halt remediation", "cancel fix"], hint: t("cmd.pipeline_stop_hint", "Stop after the current round \u2014 keeps what\u2019s done"), run: (c) => {
      c.stopPipelineFix();
      return t("cmd.pipeline_stop_done", "Stopping after the current round.");
    } },
    { id: "set_ui_language", icon: "\u{1F310}", roles: "all", label: t("cmd.set_ui_language", "Change the interface language"), aliases: ["interface language", "app language", "ui language", "menu language", "change interface language", "language of the app", "change language", "switch language", "my language"], hint: t("cmd.set_ui_language_hint", "Jump to the language picker in the header"), run: (c) => {
      return c.spotlightUiLanguage() ? t("cmd.set_ui_language_done", "Pointed you to the language picker in the header \u2014 choose your language there.") : t("cmd.set_ui_language_miss", "The interface-language picker is in the top menu bar.");
    } },
    { id: "pipeline_new_doc", icon: "\u{1F195}", roles: "teacher", destructive: true, when: (c) => !!c.pipelineOpen, label: t("cmd.pipeline_new_doc", "Start over with a new document"), aliases: ["new document", "new pdf", "another document", "clear pipeline", "upload new"], hint: t("cmd.pipeline_new_doc_hint", "Clear this result and upload a new file"), run: (c) => {
      c.startNewPdfAudit();
      return t("cmd.pipeline_new_doc_done", "Cleared \u2014 upload a new document to begin.");
    } }
  ];
  const isStudentish = !!(ctx.isStudentLinkMode || ctx.isIndependentMode);
  return cmds.filter((c) => (c.roles === "all" || !isStudentish) && (opts.includeGated || !c.when || (() => {
    try {
      return !!c.when(ctx);
    } catch (_) {
      return false;
    }
  })()));
}
async function routeUtterance(ctx, rawText, opts = {}) {
  const text = String(rawText || "").trim();
  if (!text || text.length > 200) return null;
  const t = _mkT(ctx && ctx.t);
  const _looksLikeReadingFind = /^(?:find|recommend|suggest|show|get|help me find)\s+(?:me\s+)?(?:a\s+|some\s+|the\s+)?(?:books|book|readings|reading|stories|story|articles|article|sources|source|texts|text)\b/i.test(text);
  const _whereM = text.match(/^(?:where(?:'s| is| are)?|find|locate|show me where)\s+(?:the\s+|my\s+|is\s+|are\s+)?(.{2,60}?)\??$/i);
  if (_whereM && !_looksLikeReadingFind && !opts.preview && typeof ctx.whereIs === "function") {
    const narration = ctx.whereIs(_whereM[1].trim());
    if (narration) return { handled: true, narration, commandId: "where_is", via: "where-is" };
  }
  const _grammars = [
    { id: "find_reading", re: /^(?:find|recommend|suggest|show|get|help me find)\s+(?:me\s+)?(?:a\s+|some\s+|the\s+)?(?:books|book|readings|reading|stories|story|articles|article|sources|source|texts|text)\s*(?:about|on|for)?\s*(.*?)\??$/i, params: (m) => _readingParams(m[1], null) },
    { id: "find_reading", re: /^(?:i\s+want\s+to\s+(?:learn|read)\s+about|i'?m\s+looking\s+for\s+(?:a\s+)?(?:book|source|reading|article|text)\s+about|something\s+about|what\s+can\s+i\s+read\s+about)\s+(.+?)\??$/i, params: (m) => _readingParams(m[1], null) },
    { id: "create_lesson", re: /^(?:create|make|start|build|plan)\s+(?:a\s+|new\s+)?lesson\s*(?:about|on)?\s*(.*?)(?:\s+for\s+(?:grade\s+)?(\d{1,2})(?:st|nd|rd|th)?(?:\s+grade(?:rs)?)?)?\s*\??$/i, params: (m) => ({ topic: (m[1] || "").trim() || null, grade: m[2] || null }) },
    { id: "set_font_size", re: /^(?:set\s+)?(?:the\s+)?(?:text|font)\s*(?:size)?\s*(?:to)?\s*(\d{1,2})\s*\.?$/i, params: (m) => ({ size: m[1] }) },
    { id: "translate_document", re: /^translate\s+(?:this|the\s+document|document|it)?\s*(?:to|into)\s+([a-z\u00C0-\u024F\s()-]{2,40})\??$/i, params: (m) => ({ language: m[1].trim() }) },
    { id: "generate_simplified", re: /^(?:simplify|make (?:this|it) (?:easier|simpler)|lower the (?:reading )?level)(?:\s+(?:this|it))?(?:\s+(?:to|for)?\s*(?:grade\s+)?(\d{1,2})(?:st|nd|rd|th)?(?:\s+grade)?)?\s*\??$/i, params: (m) => ({ grade: m[1] || null }) }
  ];
  let commands = buildAlloCommands(ctx);
  if (opts.preview) commands = commands.filter((c) => !c.chatSkip);
  const _runCmd = (cmd, via, params) => {
    if (opts.preview) return { handled: false, preview: true, commandId: cmd.id, label: cmd.label, params: params || {}, via, destructive: !!cmd.destructive };
    if (cmd.destructive && !opts.confirmed) return { handled: true, narration: t("router.needs_confirm", "That action needs confirmation \u2014 use Ctrl+K to run it."), commandId: cmd.id, via };
    if (cmd.opensPanel && ctx && typeof ctx.closeOtherPanels === "function") {
      try {
        ctx.closeOtherPanels(cmd.opensPanel);
      } catch (_) {
      }
    }
    let msg = null;
    try {
      msg = cmd.run(ctx, params || {});
    } catch (e) {
      return { handled: true, narration: t("router.failed", "That didn\u2019t work: ") + (e && e.message || "unknown"), commandId: cmd.id, via };
    }
    return { handled: true, narration: msg || t("router.done", "Done."), commandId: cmd.id, via };
  };
  for (const g of _grammars) {
    const m = text.match(g.re);
    if (m) {
      const cmd = commands.find((c) => c.id === g.id);
      if (cmd) return _runCmd(cmd, "grammar", g.params(m));
    }
  }
  let best = null, bestScore = 0;
  for (const c of commands) {
    const s = scoreCommand(c, text);
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }
  if (bestScore >= 60 && (!opts.preview || bestScore >= 80 && text.length >= 3)) return _runCmd(best, "deterministic");
  if (!opts.allowAi || typeof ctx.callGemini !== "function") return null;
  if (text.split(/\s+/).length > 14) return null;
  try {
    const menu = commands.map((c) => c.id + ": " + c.label + (c.aliases && c.aliases.length ? " (" + c.aliases.slice(0, 3).join(", ") + ")" : "")).join("\n");
    const out = await ctx.callGemini("A user typed a request to an education app's assistant. If it clearly maps to ONE of these app commands, return it; otherwise commandId must be null. Commands:\n" + menu + '\n\nUser: "' + text.replace(/"/g, "'") + '"\n\nReturn ONLY JSON: {"commandId": string | null, "params": object, "confidence": number between 0 and 1}. params carries values the user stated (e.g. {"topic": "photosynthesis", "grade": "5"} or {"size": "20"} or {"language": "Vietnamese"}) \u2014 empty object if none. Use null commandId unless you are confident they want the APP ACTION (not a content question).');
    const m = String(out || "").match(/\{[\s\S]*\}/);
    const j = JSON.parse(m ? m[0] : String(out));
    if (j && j.commandId && typeof j.confidence === "number" && j.confidence >= 0.7) {
      const cmd = commands.find((c) => c.id === j.commandId);
      if (cmd) return _runCmd(cmd, "ai", j.params || {});
    }
  } catch (_) {
  }
  return null;
}
function runCommandById(ctx, id, params, opts = {}) {
  const t = _mkT(ctx && ctx.t);
  const commands = buildAlloCommands(ctx);
  const cmd = commands.find((c) => c.id === id);
  if (!cmd) return null;
  if (cmd.destructive && !opts.confirmed) return { handled: true, narration: t("router.needs_confirm", "That action needs confirmation \u2014 use Ctrl+K to run it."), commandId: cmd.id, via: "confirm" };
  if (cmd.opensPanel && ctx && typeof ctx.closeOtherPanels === "function") {
    try {
      ctx.closeOtherPanels(cmd.opensPanel);
    } catch (_) {
    }
  }
  if (opts.awaitCompletion && typeof cmd.runAsync === "function") {
    const timeoutMs = opts.timeoutMs || 18e4;
    let p;
    try {
      p = Promise.resolve(cmd.runAsync(ctx, params || {}));
    } catch (e) {
      return Promise.resolve({ handled: true, ok: false, narration: t("router.failed", "That didn\u2019t work: ") + (e && e.message || "unknown"), commandId: cmd.id, via: opts.via || "plan" });
    }
    let timerId = null;
    const timer = new Promise((res) => {
      timerId = setTimeout(() => res({ __alloTimeout: true }), timeoutMs);
    });
    const clearTimer = () => {
      if (timerId != null) {
        clearTimeout(timerId);
        timerId = null;
      }
    };
    return Promise.race([p, timer]).then((msg) => {
      clearTimer();
      return msg && msg.__alloTimeout ? { handled: true, ok: true, timedOut: true, narration: t("router.still_working", "Still working \u2014 it will finish in the background."), commandId: cmd.id, via: opts.via || "plan" } : { handled: true, ok: true, narration: msg || t("router.done", "Done."), commandId: cmd.id, via: opts.via || "plan" };
    }).catch((e) => {
      clearTimer();
      return { handled: true, ok: false, narration: t("router.failed", "That didn\u2019t work: ") + (e && e.message || "unknown"), commandId: cmd.id, via: opts.via || "plan" };
    });
  }
  try {
    const msg = cmd.run(ctx, params || {});
    return { handled: true, narration: msg || t("router.done", "Done."), commandId: cmd.id, via: opts.via || "confirm" };
  } catch (e) {
    return { handled: true, ok: false, narration: t("router.failed", "That didn\u2019t work: ") + (e && e.message || "unknown"), commandId: cmd.id, via: opts.via || "confirm" };
  }
}
function looksMultiStep(rawText) {
  const text = String(rawText || "").trim();
  if (text.length < 12) return false;
  if (/\b(then|after that|and then|followed by|once (?:that|it)'?s? done|next,)\b/i.test(text)) return true;
  if (/^\s*1[.)]/.test(text) && /\n\s*2[.)]/.test(text)) return true;
  if (/\b(and|,)\s/i.test(text)) {
    const verbs = text.match(/\b(make|create|generate|build|simplify|translate|open|start|export|download|analyz[es]|read|quiz|glossary|summari[sz]e)\b/gi);
    if (verbs && verbs.length >= 2) return true;
  }
  return false;
}
function _cleanPlanParams(p) {
  const out = {};
  if (!p || typeof p !== "object" || Array.isArray(p)) return out;
  for (const k of Object.keys(p).slice(0, 8)) {
    const v = p[k];
    if (typeof v === "string") {
      const s = v.trim().slice(0, 200);
      if (s) out[k] = s;
    } else if (typeof v === "number" && isFinite(v)) out[k] = v;
    else if (typeof v === "boolean") out[k] = v;
  }
  return out;
}
async function planUtterance(ctx, rawText, opts = {}) {
  const text = String(rawText || "").trim();
  if (!text || text.length > 400) return null;
  if (!ctx || typeof ctx.callGemini !== "function") return null;
  const commands = buildAlloCommands(ctx, { includeGated: true }).filter((c) => {
    if (c.chatSkip || c.destructive) return false;
    return !opts.demoSafeOnly || getCommandContract(c).demoSafe;
  });
  if (!commands.length) return null;
  const _gatedNow = (c) => {
    if (!c.when) return false;
    try {
      return !c.when(ctx);
    } catch (_) {
      return true;
    }
  };
  const menu = commands.map((c) => {
    const contract = getCommandContract(c);
    const notes = [];
    if (_gatedNow(c)) notes.push("not available in the live state");
    if (contract.requires.length) notes.push("requires " + contract.requires.join(", "));
    if (contract.produces.length) notes.push("produces " + contract.produces.join(", "));
    if (contract.params.length) notes.push("params " + contract.params.join(", "));
    if (contract.interaction !== "automatic") notes.push(contract.interaction);
    if (contract.terminal) notes.push("must be final");
    return c.id + ": " + c.label + (notes.length ? " [" + notes.join("; ") + "]" : "");
  }).join("\n");
  try {
    const out = await ctx.callGemini("A teacher asked an education app's assistant to do a multi-step task. Break it into an ORDERED list of app commands chosen ONLY from this menu:\n" + menu + '\n\nTask: "' + text.replace(/"/g, "'") + '"\n\nReturn ONLY JSON: {"steps": [{"commandId": string, "params": object, "why": string}], "confidence": number between 0 and 1}. Use 2 to 6 steps. A command with requirements may appear only when the current app state already satisfies them or an EARLIER command explicitly says it produces them. Navigation and guided wizards do not produce content unless their contract says so. A command marked [must be final] cannot have later steps. params carries only values the user stated, using the named params in the menu; use {} if none. "why" is a short phrase. Return {"steps": [], "confidence": 0} unless the task CLEARLY maps to a sequence of these app actions (not a content question).');
    const m = String(out || "").match(/\{[\s\S]*\}/);
    const j = JSON.parse(m ? m[0] : String(out));
    if (!j || !Array.isArray(j.steps) || typeof j.confidence !== "number" || j.confidence < 0.7) return null;
    const known = new Set(commands.map((c) => c.id));
    const steps = j.steps.filter((s) => s && typeof s.commandId === "string").slice(0, 6);
    if (steps.length < 2) return null;
    if (steps.some((s) => !known.has(s.commandId))) return null;
    const cleanSteps = steps.map((s) => ({
      commandId: s.commandId,
      params: _cleanPlanParams(s.params),
      why: typeof s.why === "string" ? s.why.slice(0, 120) : ""
    }));
    const report = validatePlan(ctx, cleanSteps, {
      demoSafeOnly: !!opts.demoSafeOnly,
      allowInteractive: !!opts.allowInteractive
    });
    return report.ok ? cleanSteps : null;
  } catch (_) {
    return null;
  }
}
async function runPlan(ctxOrGet, steps, opts = {}) {
  const getCtx = typeof ctxOrGet === "function" ? ctxOrGet : () => ctxOrGet;
  const t = _mkT((getCtx() || {}).t);
  const list = (Array.isArray(steps) ? steps : []).slice(0, 6);
  const results = [];
  if (!list.length) return { ok: false, failedStep: 0, results, remainingSteps: [], reason: t("plan.empty", "There were no steps to run.") };
  for (let i = 0; i < list.length; i++) {
    if (opts.shouldStop && opts.shouldStop()) return { ok: false, stopped: true, failedStep: i, results, remainingSteps: list.slice(i), reason: t("plan.stopped", "Stopped before step ") + (i + 1) + "." };
    const s = list[i] || {};
    const ctx = getCtx();
    const cmd = buildAlloCommands(ctx).find((c) => c.id === s.commandId);
    if (!cmd) return { ok: false, failedStep: i, results, remainingSteps: list.slice(i), reason: t("plan.unavailable", "Step ") + (i + 1) + " (" + (s.commandId || "?") + ")" + t("plan.unavailable2", " isn\u2019t available right now \u2014 it may need something an earlier step didn\u2019t produce.") };
    if (cmd.destructive) {
      let allowed = false;
      if (typeof opts.confirmDestructive === "function") {
        try {
          allowed = !!await opts.confirmDestructive(cmd, s, i);
        } catch (_) {
          allowed = false;
        }
      }
      if (!allowed) return { ok: false, failedStep: i, results, remainingSteps: list.slice(i), reason: (cmd.label || s.commandId) + t("plan.needs_confirm", " needs its own confirmation \u2014 run it from the Ctrl+K menu.") };
    }
    if (typeof opts.onStep === "function") {
      try {
        opts.onStep(i, "start", cmd, null);
      } catch (_) {
      }
    }
    let r = null;
    try {
      r = await runCommandById(ctx, s.commandId, s.params || {}, { confirmed: true, awaitCompletion: true, via: "plan", timeoutMs: opts.timeoutMs });
    } catch (e) {
      r = { handled: false, narration: e && e.message || "unknown" };
    }
    results.push(r);
    if (!r || !r.handled || r.ok === false) return { ok: false, failedStep: i, results, remainingSteps: list.slice(i), reason: r && r.narration || t("plan.step_failed", "That step didn\u2019t work.") };
    if (r.timedOut) return { ok: false, timedOut: true, failedStep: i, results, remainingSteps: list.slice(i + 1), reason: (cmd.label || s.commandId) + t("plan.step_timeout", " is taking a while and is still working in the background. I\u2019ve held the remaining steps \u2014 once it finishes, ask me again for the rest.") };
    if (typeof opts.onStep === "function") {
      try {
        opts.onStep(i, "done", cmd, r.narration);
      } catch (_) {
      }
    }
  }
  return { ok: true, results, remainingSteps: [] };
}
function createVoiceLoop(getCtx) {
  let rec = null, active = false, errStreak = 0;
  const announce = (msg) => {
    const c = getCtx();
    try {
      if (window.alloAnnounce) window.alloAnnounce(msg);
    } catch (_) {
    }
    try {
      if (c && c.addToast) c.addToast(msg, "info");
    } catch (_) {
    }
  };
  const stop = (reason) => {
    if (!active) return;
    active = false;
    try {
      if (rec) {
        rec.onend = null;
        rec.stop();
      }
    } catch (_) {
    }
    rec = null;
    const c = getCtx();
    try {
      if (c && c.setVoiceActive) c.setVoiceActive(false);
    } catch (_) {
    }
    if (reason) announce(reason);
  };
  const start = () => {
    const c = getCtx();
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      announce("Voice control isn\u2019t available in this browser.");
      return false;
    }
    if (active) return true;
    try {
      rec = new SR();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = c && c.voiceLang || "en-US";
      rec.onresult = async (ev) => {
        errStreak = 0;
        const last = ev.results[ev.results.length - 1];
        if (!last || !last.isFinal) return;
        const text = String(last[0] && last[0].transcript || "").trim();
        if (!text) return;
        const cc = getCtx();
        if (/^(stop listening|stop voice|voice off)\b/i.test(text)) {
          stop("Voice control off \u2014 the microphone is released.");
          return;
        }
        const r = await routeUtterance(cc, text, { allowAi: true });
        if (r && r.handled) announce(r.narration);
        else announce("Didn\u2019t catch a command in \u201C" + text.slice(0, 60) + "\u201D \u2014 try \u201Cbigger text\u201D or \u201Copen the educator hub\u201D.");
      };
      rec.onerror = (ev) => {
        errStreak++;
        if (ev && (ev.error === "not-allowed" || ev.error === "service-not-allowed")) {
          stop("Microphone permission was denied \u2014 voice control stopped.");
          return;
        }
        if (errStreak >= 3) stop("Voice control stopped after repeated microphone errors.");
      };
      rec.onend = () => {
        if (active) {
          try {
            rec.start();
          } catch (_) {
            stop("Voice control stopped.");
          }
        }
      };
      rec.start();
      active = true;
      errStreak = 0;
      try {
        if (c && c.setVoiceActive) c.setVoiceActive(true);
      } catch (_) {
      }
      try {
        window.addEventListener("pagehide", () => stop(), { once: true });
      } catch (_) {
      }
      return true;
    } catch (e) {
      announce("Voice control could not start: " + (e && e.message || "unknown"));
      return false;
    }
  };
  return { start, stop: () => stop("Voice control off \u2014 the microphone is released."), isActive: () => active };
}
function scoreCommand(cmd, q) {
  if (!q) return 1;
  const needle = q.toLowerCase().trim();
  let best = 0;
  const texts = [cmd.label].concat(cmd.aliases || []);
  for (const raw of texts) {
    const s = String(raw || "").toLowerCase();
    if (s === needle) best = Math.max(best, 100);
    else if (s.startsWith(needle)) best = Math.max(best, 80);
    else if (s.split(/\s+/).some((w) => w.startsWith(needle))) best = Math.max(best, 60);
    else if (s.includes(needle)) best = Math.max(best, 40);
  }
  if (best < 30 && cmd.hint) {
    const h = String(cmd.hint).toLowerCase();
    if (h.includes(needle) || h.split(/\s+/).some((w) => w.startsWith(needle))) best = 30;
  }
  return best;
}
const CMD_GROUP = {
  open_educator_hub: "navigate",
  open_learning_hub: "navigate",
  open_document_builder: "navigate",
  open_wizard: "navigate",
  open_notebook: "navigate",
  open_translate: "navigate",
  open_class_session: "navigate",
  open_class_analytics: "navigate",
  open_export_menu: "navigate",
  open_ai_settings: "navigate",
  go_dashboard: "navigate",
  open_roster: "navigate",
  open_project_settings: "navigate",
  generate_quiz: "create",
  generate_glossary: "create",
  generate_simplified: "create",
  generate_sentence_frames: "create",
  generate_analysis: "create",
  create_lesson: "create",
  submit_work: "create",
  font_bigger: "accessibility",
  font_smaller: "accessibility",
  font_reset: "accessibility",
  set_font_size: "accessibility",
  open_text_settings: "accessibility",
  open_voice_settings: "accessibility",
  read_this_page: "accessibility",
  toggle_focus_mode: "accessibility",
  toggle_reading_ruler: "accessibility",
  toggle_help_mode: "accessibility",
  toggle_bot: "accessibility",
  toggle_line_focus: "accessibility",
  toggle_visual_supports: "accessibility",
  toggle_dictation: "accessibility",
  toggle_socratic: "accessibility",
  zen_on: "accessibility",
  zen_off: "accessibility",
  switch_theme: "display",
  toggle_color_overlay: "display",
  toggle_animations: "display",
  pipeline_score: "pipeline",
  pipeline_issues: "pipeline",
  pipeline_downloads: "pipeline",
  pipeline_verification: "pipeline",
  translate_document: "pipeline",
  app_tour: "help",
  pipeline_tour: "help",
  report_problem: "help",
  voice_start: "voice",
  voice_stop: "voice",
  open_stem_lab: "tools",
  open_storyforge: "tools",
  open_allohaven: "tools",
  open_behavior_lens: "tools",
  open_report_writer: "tools",
  open_symbol_studio: "tools",
  open_video_studio: "tools",
  open_cinematic_studio: "tools",
  open_allo_studio: "tools",
  open_accessibility_lab: "tools",
  open_lumen: "tools",
  open_community_catalog: "tools",
  open_dynamic_assessment: "tools",
  open_reading_library: "tools",
  open_open_groove: "tools",
  open_timeline_studio: "tools",
  open_lingua_practice: "tools",
  open_test_prep_hub: "tools",
  find_reading: "tools",
  stop_reading: "accessibility",
  toggle_mute: "accessibility",
  line_spacing_more: "accessibility",
  line_spacing_less: "accessibility",
  open_study_timer: "accessibility",
  cycle_reading_theme: "display",
  set_ui_language: "display",
  open_sel_hub: "tools",
  open_submission_inbox: "navigate",
  toggle_cloud_sync: "navigate",
  generate_outline: "create",
  export_pack: "create",
  launch_flashcards: "create",
  clear_my_answers: "create",
  clear_workspace: "create",
  undo_settings: "create",
  open_persona_chat: "navigate",
  pipeline_fix_again: "pipeline",
  pipeline_stop: "pipeline",
  pipeline_new_doc: "pipeline"
};
const CMD_CONTEXT = {
  pipeline_score: ["pipeline"],
  pipeline_issues: ["pipeline"],
  pipeline_downloads: ["pipeline"],
  pipeline_verification: ["pipeline"],
  pipeline_tour: ["pipeline"],
  translate_document: ["pipeline"],
  open_document_builder: ["educatorHub", "content"],
  open_wizard: ["educatorHub"],
  create_lesson: ["educatorHub"],
  open_translate: ["educatorHub", "content"],
  open_class_session: ["educatorHub"],
  open_class_analytics: ["educatorHub", "behaviorLens"],
  open_roster: ["educatorHub"],
  open_project_settings: ["educatorHub"],
  open_notebook: ["learningHub"],
  toggle_socratic: ["learningHub"],
  open_video_studio: ["educatorHub", "videoStudio"],
  open_cinematic_studio: ["educatorHub", "videoStudio", "cinematicStudio"],
  open_allo_studio: ["educatorHub", "alloStudio"],
  open_open_groove: ["learningHub", "openGroove"],
  open_timeline_studio: ["learningHub", "timelineStudio"],
  open_lingua_practice: ["learningHub", "content", "linguaPractice"],
  open_test_prep_hub: ["learningHub", "testPrepHub"],
  generate_quiz: ["content"],
  generate_glossary: ["content"],
  generate_simplified: ["content", "reading"],
  generate_sentence_frames: ["content"],
  generate_analysis: ["content"],
  open_export_menu: ["content"],
  find_reading: ["content", "learningHub", "reading"],
  read_this_page: ["learningHub", "symbolStudio", "stemLab", "content", "reading"],
  font_bigger: ["reading"],
  font_smaller: ["reading"],
  toggle_reading_ruler: ["reading"],
  toggle_line_focus: ["reading"],
  toggle_color_overlay: ["reading"],
  zen_off: ["reading"],
  toggle_visual_supports: ["symbolStudio"],
  open_voice_settings: ["symbolStudio"],
  toggle_focus_mode: ["stemLab"],
  zen_on: ["stemLab"],
  stop_reading: ["reading"],
  line_spacing_more: ["reading"],
  line_spacing_less: ["reading"],
  open_submission_inbox: ["educatorHub"],
  generate_outline: ["content"],
  export_pack: ["content"],
  launch_flashcards: ["content", "learningHub"],
  clear_my_answers: ["content"],
  clear_workspace: ["content"],
  open_persona_chat: ["content"],
  pipeline_fix_again: ["pipeline"],
  pipeline_stop: ["pipeline"],
  pipeline_new_doc: ["pipeline"]
};
const GROUP_ORDER = ["navigate", "create", "tools", "accessibility", "display", "pipeline", "help", "voice"];
const GROUP_LABEL_FALLBACK = { navigate: "Navigate", create: "Create from this content", tools: "Open a tool", accessibility: "Reading & access", display: "Display & motion", pipeline: "Pipeline results", help: "Help", voice: "Voice" };
const COMMAND_RECENTS_KEY = "allo_command_recents_v1";
const COMMAND_RECENTS_LIMIT = 5;
const CTX_FLAG = { pipeline: "pipelineOpen", educatorHub: "educatorHubOpen", learningHub: "learningHubOpen", symbolStudio: "symbolStudioOpen", videoStudio: "videoStudioOpen", alloStudio: "alloStudioOpen", cinematicStudio: "cinematicStudioOpen", stemLab: "stemLabOpen", openGroove: "openGrooveOpen", timelineStudio: "timelineStudioOpen", linguaPractice: "linguaPracticeOpen", testPrepHub: "testPrepHubOpen", behaviorLens: "behaviorLensOpen", content: "contentLoaded", reading: (c) => !!(c.zenActive || c.focusActive) };
const CTX_PRIORITY = ["videoStudio", "alloStudio", "cinematicStudio", "symbolStudio", "stemLab", "openGroove", "timelineStudio", "linguaPractice", "testPrepHub", "behaviorLens", "pipeline", "educatorHub", "learningHub", "content", "reading"];
const CONTEXT_LABEL_FALLBACK = { pipeline: "Here \u2014 Pipeline results", educatorHub: "Here \u2014 Educator Hub", learningHub: "Here \u2014 Learning Hub", symbolStudio: "Here \u2014 Symbol Studio", videoStudio: "Here \u2014 Video Studio", alloStudio: "Here \u2014 AlloStudio", cinematicStudio: "Here \u2014 Cinematic Studio", stemLab: "Here \u2014 STEM Lab", openGroove: "Here \u2014 Open Groove Studio", timelineStudio: "Here \u2014 Timeline Studio", linguaPractice: "Here \u2014 Lingua Practice", testPrepHub: "Here \u2014 Test Prep Hub", behaviorLens: "Here \u2014 Behavior Lens", content: "Here \u2014 this content", reading: "Here \u2014 Reading mode" };
function _activeContexts(ctx) {
  if (!ctx) return [];
  return CTX_PRIORITY.filter((k) => {
    const f = CTX_FLAG[k];
    return typeof f === "function" ? f(ctx) : !!ctx[f];
  });
}
const AlloCommandPalette = ({ ctx }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);
  const [confirming, setConfirming] = useState(null);
  const [recentCommandIds, setRecentCommandIds] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(COMMAND_RECENTS_KEY) || "[]");
      return Array.isArray(saved) ? saved.filter((id) => typeof id === "string").slice(0, COMMAND_RECENTS_LIMIT) : [];
    } catch (_) {
      return [];
    }
  });
  const dialogRef = useRef(null);
  const inputRef = useRef(null);
  const prevFocusRef = useRef(null);
  const t = _mkT(ctx && ctx.t);
  const commands = useMemo(() => ctx ? buildAlloCommands(ctx) : [], [ctx]);
  const rows = useMemo(() => {
    const out = [];
    if (query) {
      const acts2 = _activeContexts(ctx);
      const ctxRank = (c) => (CMD_CONTEXT[c.id] || []).some((x) => acts2.indexOf(x) >= 0) ? 0 : 1;
      const scored = commands.map((c) => ({ c, s: scoreCommand(c, query) })).filter((x) => x.s > 0);
      scored.sort((a, b) => b.s - a.s || ctxRank(a.c) - ctxRank(b.c));
      scored.slice(0, 12).forEach((x) => out.push({ kind: "cmd", c: x.c }));
      return out;
    }
    const acts = _activeContexts(ctx);
    const promotedIds = /* @__PURE__ */ new Set();
    if (acts.length) {
      const promoted = [];
      for (const c of commands) {
        if ((CMD_CONTEXT[c.id] || []).some((x) => acts.indexOf(x) >= 0)) {
          promoted.push(c);
          promotedIds.add(c.id);
          if (promoted.length >= 6) break;
        }
      }
      if (promoted.length) {
        const top = acts[0];
        out.push({ kind: "header", label: t("palette.ctx." + top, CONTEXT_LABEL_FALLBACK[top] || "Here") });
        promoted.forEach((c) => out.push({ kind: "cmd", c }));
      }
    }
    const recent = recentCommandIds.map((id) => commands.find((c) => c.id === id)).filter((c) => c && !promotedIds.has(c.id)).slice(0, COMMAND_RECENTS_LIMIT);
    if (recent.length) {
      out.push({ kind: "header", label: t("palette.group.recent", "Recent") });
      recent.forEach((c) => {
        promotedIds.add(c.id);
        out.push({ kind: "cmd", c });
      });
    }
    const PER_GROUP = 6, MAX_ROWS = 40;
    let cmdCount = promotedIds.size;
    for (const g of GROUP_ORDER) {
      if (cmdCount >= MAX_ROWS) break;
      const inGroup = commands.filter((c) => (CMD_GROUP[c.id] || "navigate") === g && !promotedIds.has(c.id));
      const take = inGroup.slice(0, Math.min(PER_GROUP, MAX_ROWS - cmdCount));
      if (!take.length) continue;
      out.push({ kind: "header", label: t("palette.group." + g, GROUP_LABEL_FALLBACK[g]) });
      take.forEach((c) => out.push({ kind: "cmd", c }));
      cmdCount += take.length;
    }
    return out;
  }, [commands, query, ctx, t, recentCommandIds]);
  const selectable = useMemo(() => {
    const a = [];
    rows.forEach((r, i) => {
      if (r.kind === "cmd") a.push(i);
    });
    return a;
  }, [rows]);
  const selectedCommand = rows[sel] && rows[sel].kind === "cmd" ? rows[sel].c : null;
  const selectedCommandId = selectedCommand ? selectedCommand.id : "";
  const paletteStatus = (() => {
    if (confirming && selectedCommand && confirming === selectedCommand.id) return "Confirmation required for " + selectedCommand.label + ". Press Enter again to confirm.";
    const count = selectable.length;
    if (!count) return query.trim() ? "No matching commands." : "No commands are available here.";
    const resultText = query.trim() ? count + " matching command" + (count === 1 ? "." : "s.") : count + " command" + (count === 1 ? " shown." : "s shown.");
    return resultText + (selectedCommand ? " " + selectedCommand.label + " selected." : "");
  })();
  useEffect(() => {
    const onKey = (e) => {
      const k = (e.key || "").toLowerCase();
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && k === "k" || (e.ctrlKey || e.metaKey) && e.shiftKey && k === "p") {
        e.preventDefault();
        setOpen((v) => {
          if (!v) {
            try {
              prevFocusRef.current = document.activeElement;
            } catch (_) {
            }
          }
          return !v;
        });
        setQuery("");
        setConfirming(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
    if (!open && prevFocusRef.current) {
      const previous = prevFocusRef.current;
      prevFocusRef.current = null;
      try {
        if (previous.isConnected && typeof previous.focus === "function") previous.focus();
      } catch (_) {
      }
    }
  }, [open]);
  useEffect(() => {
    if (!open) return void 0;
    const dialog = dialogRef.current;
    const input = inputRef.current;
    if (!dialog || !input) return void 0;
    const getFocusable = () => Array.from(dialog.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    )).filter((node) => !node.hidden && node.getAttribute("aria-hidden") !== "true");
    const onDocumentKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (confirming) {
          setConfirming(null);
          input.focus();
        } else {
          setOpen(false);
        }
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const onDocumentFocusIn = (event) => {
      if (!dialog.contains(event.target)) input.focus();
    };
    document.addEventListener("keydown", onDocumentKeyDown, true);
    document.addEventListener("focusin", onDocumentFocusIn);
    return () => {
      document.removeEventListener("keydown", onDocumentKeyDown, true);
      document.removeEventListener("focusin", onDocumentFocusIn);
    };
  }, [open, confirming]);
  useEffect(() => {
    if (open) setSel(selectable.length ? selectable[0] : 0);
  }, [open, query]);
  useEffect(() => {
    if (!open) return;
    if (!selectable.length) {
      if (sel !== 0) setSel(0);
      return;
    }
    if (selectable.indexOf(sel) === -1) setSel(selectable[0]);
  }, [open, selectable, sel]);
  useEffect(() => {
    if (!open || !selectedCommandId) return;
    try {
      const option = document.getElementById("allo-cmd-" + selectedCommandId);
      if (option && option.scrollIntoView) option.scrollIntoView({ block: "nearest" });
    } catch (_) {
    }
  }, [open, sel, selectedCommandId]);
  const announce = useCallback((msg) => {
    try {
      if (window.alloAnnounce) window.alloAnnounce(msg);
    } catch (_) {
    }
    try {
      if (ctx && ctx.addToast) ctx.addToast(msg, "success");
    } catch (_) {
    }
  }, [ctx]);
  const rememberCommand = useCallback((id) => {
    if (!id) return;
    setRecentCommandIds((previous) => {
      const next = [id].concat((Array.isArray(previous) ? previous : []).filter((savedId) => savedId !== id)).slice(0, COMMAND_RECENTS_LIMIT);
      try {
        sessionStorage.setItem(COMMAND_RECENTS_KEY, JSON.stringify(next));
      } catch (_) {
      }
      return next;
    });
  }, []);
  const runCmd = useCallback((cmd) => {
    if (!cmd) return;
    if (cmd.destructive && (!confirming || confirming !== cmd.id)) {
      setConfirming(cmd.id);
      return;
    }
    setConfirming(null);
    if (cmd.opensPanel && ctx && typeof ctx.closeOtherPanels === "function") {
      try {
        ctx.closeOtherPanels(cmd.opensPanel);
      } catch (_) {
      }
    }
    let msg = null;
    try {
      msg = cmd.run(ctx);
    } catch (e) {
      try {
        ctx.addToast(t("cmd.failed", "That didn\u2019t work: ") + (e && e.message || "unknown"), "error");
      } catch (_) {
      }
      setOpen(false);
      return;
    }
    rememberCommand(cmd.id);
    setOpen(false);
    if (msg) announce(msg);
  }, [ctx, confirming, announce, rememberCommand, t]);
  if (!open) return null;
  return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-[12000] flex items-start justify-center pt-[14vh] px-4", role: "presentation", onClick: () => setOpen(false) }, /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 bg-slate-900/50", "aria-hidden": "true" }), /* @__PURE__ */ React.createElement(
    "div",
    {
      ref: dialogRef,
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "allo-palette-title",
      tabIndex: -1,
      "data-help-ignore": "true",
      className: "relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-indigo-200 overflow-hidden",
      onClick: (e) => e.stopPropagation()
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 px-4 py-3 border-b border-slate-200" }, /* @__PURE__ */ React.createElement("h2", { id: "allo-palette-title", className: "sr-only" }, t("palette.aria", "AlloFlow command palette")), /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u26A1"), /* @__PURE__ */ React.createElement(
      "input",
      {
        ref: inputRef,
        value: query,
        onChange: (e) => setQuery(e.target.value),
        onKeyDown: (e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setSel((s) => {
              for (const idx of selectable) if (idx > s) return idx;
              return selectable.length ? selectable[selectable.length - 1] : s;
            });
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSel((s) => {
              for (let j = selectable.length - 1; j >= 0; j--) if (selectable[j] < s) return selectable[j];
              return selectable.length ? selectable[0] : s;
            });
          } else if (e.key === "Enter") {
            e.preventDefault();
            const row = rows[sel];
            if (row && row.kind === "cmd") runCmd(row.c);
          }
        },
        placeholder: t("palette.placeholder", "Type a command \u2014 \u201Cbigger text\u201D, \u201Ceducator hub\u201D, \u201Cread this page\u201D\u2026"),
        "aria-label": t("palette.input_aria", "Search commands"),
        role: "combobox",
        "aria-expanded": "true",
        "aria-autocomplete": "list",
        "aria-controls": "allo-palette-list",
        "aria-describedby": "allo-palette-status",
        "aria-activedescendant": selectedCommandId ? "allo-cmd-" + selectedCommandId : void 0,
        className: "flex-1 text-sm outline-none bg-transparent text-slate-800 placeholder:text-slate-500"
      }
    ), /* @__PURE__ */ React.createElement("kbd", { className: "text-[10px] text-slate-500 border border-slate-300 rounded px-1.5 py-0.5" }, "Esc"), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => setOpen(false),
        "aria-label": t("palette.close", "Close command palette"),
        className: "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-xl leading-none text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      },
      /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\xD7")
    )),
    /* @__PURE__ */ React.createElement("div", { id: "allo-palette-status", role: "status", "aria-live": "polite", "aria-atomic": "true", className: "sr-only" }, paletteStatus),
    /* @__PURE__ */ React.createElement("ul", { id: "allo-palette-list", role: "listbox", "aria-label": t("palette.list_aria", "Matching commands"), className: "max-h-[46vh] overflow-y-auto py-1" }, selectable.length === 0 && /* @__PURE__ */ React.createElement("li", { role: "presentation", className: "px-4 py-6 text-center text-xs text-slate-600" }, t("palette.no_match", "No matching command. The bot chat (and soon voice) understands free-form requests.")), rows.map((row, i) => row.kind === "header" ? /* @__PURE__ */ React.createElement("li", { key: "h-" + i, role: "presentation", className: "px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 select-none" }, row.label) : /* @__PURE__ */ React.createElement(
      "li",
      {
        key: row.c.id,
        id: "allo-cmd-" + row.c.id,
        role: "option",
        "aria-selected": i === sel,
        onClick: () => runCmd(row.c),
        onMouseEnter: () => setSel(i),
        className: `min-h-11 w-full cursor-pointer px-4 py-2.5 text-left flex items-center gap-3 ${i === sel ? "bg-indigo-50" : ""}`
      },
      /* @__PURE__ */ React.createElement("span", { className: "text-lg shrink-0", "aria-hidden": "true" }, row.c.icon),
      /* @__PURE__ */ React.createElement("span", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("span", { className: `block text-sm font-bold ${i === sel ? "text-indigo-900" : "text-slate-800"}` }, row.c.label), /* @__PURE__ */ React.createElement("span", { className: "block text-[11px] text-slate-600 truncate" }, confirming === row.c.id ? t("palette.confirm", "\u26A0 Press Enter again to confirm") : row.c.hint)),
      i === sel && /* @__PURE__ */ React.createElement("kbd", { className: "text-[10px] text-indigo-600 border border-indigo-300 rounded px-1.5 py-0.5 shrink-0" }, "\u21B5")
    ))),
    /* @__PURE__ */ React.createElement("div", { className: "px-4 py-2 border-t border-slate-200 text-[10px] text-slate-600 flex items-center gap-3" }, /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("kbd", { className: "border border-slate-300 rounded px-1" }, "\u2191\u2193"), " ", t("palette.nav", "navigate")), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("kbd", { className: "border border-slate-300 rounded px-1" }, "\u21B5"), " ", t("palette.run", "run")), /* @__PURE__ */ React.createElement("span", { className: "ml-auto" }, t("palette.footer", "Every action is announced. Ctrl+K toggles.")))
  ));
};

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.AlloCommands = { AlloCommandPalette: AlloCommandPalette, buildAlloCommands: buildAlloCommands, scoreCommand: scoreCommand, routeUtterance: routeUtterance, runCommandById: runCommandById, findReadingMatches: findReadingMatches, normalizeReadingRequest: normalizeReadingRequest, readingMatchReasons: readingMatchReasons, readingMatchWhyText: readingMatchWhyText, createVoiceLoop: createVoiceLoop, looksMultiStep: looksMultiStep, getCommandContract: getCommandContract, validatePlan: validatePlan, planUtterance: planUtterance, runPlan: runPlan };
  console.log('[CDN] AlloCommands loaded');
})();
