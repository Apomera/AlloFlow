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
  find_reading: { params: ["topic", "grade", "language", "source", "format", "raw"] },
  open_stem_tool: { params: ["tool", "query", "raw"] },
  send_teacher_signal: {
    demoSafe: false,
    interaction: "external",
    params: ["signal"],
    reason: "Sends one fixed-vocabulary signal to the teacher in an active live session."
  },
  create_activity_rubric: { demoSafe: false, interaction: "guided", reason: "Runs rubric generation for the current activity." },
  open_command_blueprints: { demoSafe: false, interaction: "interactive", terminal: true, reason: "Opens the teacher-owned saved workflow library; selection and approval remain user-controlled." },
  share_assignment: { demoSafe: false, interaction: "external", reason: "Creates a student-facing assignment link after confirmation." },
  preview_assignment_as_student: { demoSafe: false, interaction: "external", reason: "Opens an already-shared student assignment in a new tab." },
  launch_flashcards: { requires: ["glossary"] },
  open_screen_coach: {
    demoSafe: false,
    reason: "Opens the recorder popup that hosts the coach; a demo cannot meaningfully drive it."
  },
  download_voice_models: { demoSafe: false, interaction: "external", reason: "Starts a ~40 MB network download into durable device storage." },
  set_model_download_policy: { params: ["policy"] },
  toggle_wake_word: { demoSafe: false, reason: "Changes when the live microphone routes commands." },
  generate_note_taking: { requires: ["source"], produces: ["note-taking"] },
  generate_anchor_chart: { requires: ["source"], produces: ["anchor-chart"] },
  generate_concept_sort: { requires: ["source"], produces: ["concept-sort"] },
  start_memory_game: { requires: ["glossary"] },
  start_matching_game: { requires: ["glossary"] },
  start_bingo_game: { requires: ["glossary"] },
  start_crossword_game: { requires: ["glossary"] },
  start_word_scramble: { requires: ["glossary"] },
  filter_glossary: { requires: ["glossary"], params: ["tier"] },
  generate_source_text: { params: ["topic"], produces: ["source"] },
  generate_faq: { requires: ["source"], produces: ["faq"] },
  generate_brainstorm: { requires: ["source"], produces: ["brainstorm"] },
  print_page: { demoSafe: false, interaction: "external", reason: "Opens the browser's print dialog over the recorded workflow." },
  export_pack: {
    demoSafe: false,
    requires: ["source"],
    interaction: "external",
    reason: "Starts a file download outside the recorded workflow."
  },
  set_grade_level: { params: ["grade"] },
  set_source_tone: { params: ["tone"] },
  set_source_length: { params: ["length"] },
  set_output_language: { params: ["language"] },
  set_font_size: { params: ["size"] },
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
  "open_history",
  "open_class_session",
  "open_live_session_center",
  "open_live_poll",
  "open_quick_check",
  "open_pictionary_host",
  "open_group_tools",
  "open_student_signal",
  "send_teacher_signal",
  "share_assignment",
  "preview_assignment_as_student",
  "review_teacher_feedback",
  "open_class_analytics",
  "open_share_collect",
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
function _stemToolCatalog() {
  try {
    const idx = typeof window !== "undefined" && window.ALLO_TOOL_INDEX || null;
    if (idx && Array.isArray(idx.tools) && idx.tools.length) {
      return idx.tools.map((tool) => ({
        id: tool.id,
        label: tool.label || tool.id,
        hay: [tool.label, tool.section, tool.desc, (tool.topics || []).join(" "), (tool.keywords || []).join(" ")].join(" ").toLowerCase()
      }));
    }
  } catch (_) {
  }
  try {
    if (typeof window !== "undefined" && Array.isArray(window.STEM_TOOL_REGISTRY)) {
      return window.STEM_TOOL_REGISTRY.map((tool) => ({
        id: tool.id,
        label: tool.name || tool.label || tool.id,
        hay: [tool.name, tool.label, (tool.subjects || []).join(" "), (tool.tags || []).join(" ")].join(" ").toLowerCase()
      }));
    }
  } catch (_) {
  }
  return [];
}
function resolveStemTool(query) {
  const raw = String(query == null ? "" : query).trim();
  if (!raw) return { matches: [] };
  const catalog = _stemToolCatalog();
  if (!catalog.length) return { matches: [], noCatalog: true };
  const q = raw.toLowerCase();
  const exact = catalog.find((tool) => tool.id.toLowerCase() === q || tool.label.toLowerCase() === q);
  if (exact) return { matches: [exact], exact: true };
  const terms = q.match(/[a-z0-9][a-z0-9'-]*/g) || [];
  const scored = [];
  for (const tool of catalog) {
    const label = tool.label.toLowerCase();
    let score = 0;
    if (label.includes(q)) score += 12;
    if (tool.id.toLowerCase().includes(q)) score += 10;
    if (terms.length > 1 && tool.hay.includes(q)) score += 6;
    for (const w of terms) {
      if (w.length < 3) continue;
      if (label.includes(w)) score += 4;
      else if (tool.hay.includes(w)) score += 1;
    }
    if (score > 0) scored.push({ id: tool.id, label: tool.label, score });
  }
  scored.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
  return { matches: scored.slice(0, 5) };
}
function runOpenStemToolCommand(c, params, t) {
  const query = String(params && (params.tool || params.query || params.raw) || "").trim();
  const openLab = () => {
    try {
      c.openStemLab();
    } catch (_) {
    }
  };
  if (typeof c.openStemTool !== "function") {
    openLab();
    return t("cmd.open_stem_tool_unsupported", "STEAM Lab opened. This build cannot jump straight to a named tool.");
  }
  if (!query) {
    openLab();
    return t("cmd.open_stem_tool_none", "STEAM Lab opened. Name a tool and I can go straight to it.");
  }
  const res = resolveStemTool(query);
  if (res.noCatalog) {
    openLab();
    return t("cmd.open_stem_tool_no_index", "STEAM Lab opened. The tool catalog was not available, so browse the list.");
  }
  const best = res.matches[0];
  if (!best) {
    openLab();
    return t("cmd.open_stem_tool_miss", "No STEM tool matched ") + JSON.stringify(query) + t("cmd.open_stem_tool_miss_tail", ". STEAM Lab opened so you can browse.");
  }
  const runnerUp = res.matches[1];
  if (!res.exact && runnerUp && runnerUp.score >= best.score) {
    return t("cmd.open_stem_tool_ambiguous", "More than one tool matches that: ") + res.matches.slice(0, 4).map((m) => m.label).join(", ") + ".";
  }
  c.openStemTool(best.id);
  return t("cmd.open_stem_tool_done", "Opened ") + best.label + ".";
}
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
function _contractPlanParams(p, contract) {
  const clean = _cleanPlanParams(p);
  const allowed = contract && Array.isArray(contract.params) ? contract.params : [];
  if (!allowed.length) return {};
  const out = {};
  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(clean, k)) out[k] = clean[k];
  }
  return out;
}
function sanitizeCommandParams(commandOrId, params) {
  return _contractPlanParams(params, getCommandContract(commandOrId));
}
function getCommandAudience(ctx) {
  const explicit = ctx && ctx.commandAudience;
  if (["teacher", "student", "independent", "parent"].includes(explicit)) return explicit;
  if (ctx && (ctx.isStudentLinkMode || ctx.isTeacherMode === false)) return "student";
  if (ctx && ctx.isIndependentMode) return "independent";
  if (ctx && ctx.isParentMode) return "parent";
  return "teacher";
}
function _commandAllowsAudience(command, audience) {
  const roles = command && command.roles;
  if (roles === "all") return true;
  if (Array.isArray(roles)) return roles.includes(audience) || roles.includes("all");
  return roles === audience;
}
const COMMAND_CAPABILITIES = Object.freeze({
  assignmentDirectionsEditor: {
    test: (c) => !!c.canEditAssignmentDirections && typeof c.editAssignmentDirections === "function",
    reason: "Add assignment directions before editing them."
  },
  assessmentBuilder: {
    test: (c) => typeof c.openAssessmentBuilder === "function",
    reason: "Assessment Builder is not available in this view yet."
  },
  udlGuide: {
    test: (c) => typeof c.openUdlGuide === "function",
    reason: "The UDL Guide is not available in this view yet."
  },
  activityRubricGenerator: {
    test: (c) => !!c.canGenerateCurrentRubric && typeof c.generateCurrentRubric === "function",
    reason: "Open an activity with enough content to create a rubric."
  },
  assignmentSharing: {
    test: (c) => !!c.canShareAssignment && typeof c.shareAssignment === "function",
    reason: "Add at least one shareable assignment resource first."
  },
  studentAssignmentPreview: {
    test: (c) => !!c.canPreviewStudentAssignment && typeof c.previewStudentAssignment === "function",
    reason: "Create a student assignment link before previewing it."
  }
});
function getCommandAvailability(command, ctx) {
  const c = ctx || {};
  const required = Array.isArray(command && command.requiresCapabilities) ? command.requiresCapabilities : [];
  const missingCapabilities = [];
  let reason = "";
  for (const name of required) {
    const capability = COMMAND_CAPABILITIES[name];
    let ready = false;
    try {
      ready = !!(capability && capability.test(c));
    } catch (_) {
      ready = false;
    }
    if (!ready) {
      missingCapabilities.push(name);
      if (!reason && capability && capability.reason) reason = capability.reason;
    }
  }
  let whenReady = true;
  if (!missingCapabilities.length && command && typeof command.when === "function") {
    try {
      whenReady = !!command.when(c);
    } catch (_) {
      whenReady = false;
    }
    if (!whenReady) reason = command.unavailableReason || "This command is not available in the current context.";
  }
  return {
    available: missingCapabilities.length === 0 && whenReady,
    reason,
    missingCapabilities
  };
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
      params: _contractPlanParams(step.params, contract),
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
  const audience = getCommandAudience(ctx || {});
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
    { id: "open_source_input", icon: "\u{1F4DD}", roles: ["teacher", "independent", "parent"], label: t("cmd.open_source_input", "Open source input"), aliases: ["source input", "source material", "input panel", "paste text", "write text", "add source", "new source"], hint: t("cmd.open_source_input_hint", "Paste, write, search, or generate source material"), run: (c) => {
      c.openSourceInput();
      return t("cmd.open_source_input_done", "Source input opened.");
    } },
    { id: "open_source_url", icon: "\u{1F50E}", roles: ["teacher", "independent", "parent"], label: t("cmd.open_source_url", "Find a resource online"), aliases: ["find a resource online", "resource online", "paste a link", "add a link", "url input", "import from url", "web source", "source link"], hint: t("cmd.open_source_url_hint", "Paste a URL or search for a source"), run: (c) => {
      c.openSourceUrl();
      return t("cmd.open_source_url_done", "Resource finder opened.");
    } },
    { id: "open_source_generator", icon: "\u2728", roles: ["teacher", "independent", "parent"], label: t("cmd.open_source_generator", "Generate source from a topic"), aliases: ["generate source", "generate from a topic", "source generator", "write source text", "make source text", "generate reading passage", "ai writes it"], hint: t("cmd.open_source_generator_hint", "Open the topic-to-source generator"), run: (c) => {
      c.openSourceGenerator();
      return t("cmd.open_source_generator_done", "Source generator opened.");
    } },
    { id: "open_history", icon: "\u{1F558}", roles: "all", label: t("cmd.open_history", "Open history"), aliases: ["history", "my history", "saved work", "previous work", "recent lessons", "projects"], hint: t("cmd.open_history_hint", "Browse saved lessons and projects"), run: (c) => {
      c.openHistory();
      return t("cmd.open_history_done", "History opened.");
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
    { id: "open_live_session_center", icon: "\u{1F39B}\uFE0F", roles: "teacher", when: (c) => !!c.activeSessionCode && !!c.openLiveSessionCenter, label: t("cmd.open_live_session_center", "Open Live Session Center"), aliases: ["live session center", "live session", "session center", "classroom controls", "live dock"], hint: t("cmd.open_live_session_center_hint", "Polls, groups, Pictionary, and session controls"), run: (c) => {
      c.openLiveSessionCenter();
      return t("cmd.open_live_session_center_done", "Live Session Center opened.");
    } },
    { id: "open_live_poll", icon: "\u{1F4CA}", roles: "teacher", when: (c) => !!c.activeSessionCode && !!c.openLivePoll, label: t("cmd.open_live_poll", "Start a live poll"), aliases: ["live poll", "poll the class", "class poll", "ask a poll", "student poll"], hint: t("cmd.open_live_poll_hint", "Compose a live poll for the active session"), run: (c) => {
      c.openLivePoll();
      return t("cmd.open_live_poll_done", "Live poll composer opened. Review it, then broadcast from there.");
    } },
    { id: "open_quick_check", icon: "\u26A1", roles: "teacher", when: (c) => !!c.activeSessionCode && !!c.openQuickCheck, label: t("cmd.open_quick_check", "Run a quick check"), aliases: ["quick check", "check understanding", "confused ready", "how is this landing", "ready check"], hint: t("cmd.open_quick_check_hint", "Prepare a 1-3 confused-to-ready check-in"), run: (c) => {
      c.openQuickCheck();
      return t("cmd.open_quick_check_done", "Quick Check opened. Review it, then broadcast from there.");
    } },
    { id: "open_pictionary_host", icon: "\u{1F3A8}", roles: "teacher", when: (c) => !!c.activeSessionCode && !!c.openPictionaryHost, label: t("cmd.open_pictionary_host", "Start Concept Pictionary"), aliases: ["concept pictionary", "pictionary", "drawing game", "draw a concept", "class drawing game"], hint: t("cmd.open_pictionary_host_hint", "Open the teacher host for Concept Pictionary"), run: (c) => {
      c.openPictionaryHost();
      return t("cmd.open_pictionary_host_done", "Concept Pictionary opened. Choose a concept and start the round from there.");
    } },
    { id: "open_group_tools", icon: "\u{1F465}", roles: "teacher", when: (c) => !!c.activeSessionCode && !!c.openGroupTools, label: t("cmd.open_group_tools", "Open group tools"), aliases: ["group tools", "groups", "manage groups", "student groups", "make groups"], hint: t("cmd.open_group_tools_hint", "Manage live-session groups"), run: (c) => {
      c.openGroupTools();
      return t("cmd.open_group_tools_done", "Group tools opened.");
    } },
    { id: "open_student_signal", icon: "\u270B", roles: "student", when: (c) => !!c.activeSessionCode && !c.isTeacherMode && !!c.openStudentSignals, label: t("cmd.open_student_signal", "Send a teacher signal"), aliases: ["signal teacher", "help signal", "quick signal", "i need help", "i am confused", "send signal"], hint: t("cmd.open_student_signal_hint", "Tell the teacher you need help, more time, or are ready"), run: (c) => {
      c.openStudentSignals();
      return t("cmd.open_student_signal_done", "Teacher signal panel opened. Pick one option to send.");
    } },
    { id: "open_class_analytics", opensPanel: "classAnalytics", icon: "\u{1F4C8}", roles: "teacher", label: t("cmd.open_class_analytics", "Open class analytics"), aliases: ["analytics", "class data", "progress data", "research suite", "research dashboard", "embedded research", "study", "irb", "likert", "assessment center", "progress monitoring"], hint: t("cmd.open_class_analytics_hint", "Whole-class progress"), run: (c) => {
      c.setShowClassAnalytics(true);
      return t("cmd.open_class_analytics_done", "Class analytics opened.");
    } },
    { id: "open_share_collect", opensPanel: "recentQrShares", icon: "\u{1F517}", roles: "teacher", label: t("cmd.open_share_collect", "Open Share & Collect"), aliases: ["share and collect", "share collect", "polls", "poll results", "sign-up sheet", "signup results", "survey", "surveys", "send survey", "survey link", "survey results", "collect responses", "availability poll", "parent survey"], hint: t("cmd.open_share_collect_hint", "Polls, sign-ups, surveys and their results"), run: (c) => {
      c.setShowRecentQrShares(true);
      return t("cmd.open_share_collect_done", "Share & Collect opened.");
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
    { id: "edit_assignment_directions", icon: "\u{1F4CB}", roles: "teacher", requiresCapabilities: ["assignmentDirectionsEditor"], label: t("cmd.edit_assignment_directions", "Edit assignment directions"), aliases: ["edit directions", "assignment directions editor", "write directions", "change assignment directions"], hint: t("cmd.edit_assignment_directions_hint", "Open the directions and goals composer"), run: (c) => {
      c.editAssignmentDirections();
      return t("cmd.edit_assignment_directions_done", "Assignment directions editor opened.");
    } },
    { id: "open_assessment_builder", icon: "\u{1F9ED}", roles: "teacher", requiresCapabilities: ["assessmentBuilder"], label: t("cmd.open_assessment_builder", "Open Assessment Builder"), aliases: ["assessment builder", "build assessment", "make an assessment", "assessment tools"], hint: t("cmd.open_assessment_builder_hint", "Design an assessment and supporting activities"), run: (c) => {
      c.openAssessmentBuilder();
      return t("cmd.open_assessment_builder_done", "Assessment Builder opened.");
    } },
    { id: "open_udl_guide", icon: "\u267F", roles: "teacher", requiresCapabilities: ["udlGuide"], label: t("cmd.open_udl_guide", "Open the UDL Guide"), aliases: ["udl guide", "universal design guide", "udl help", "accessibility guide"], hint: t("cmd.open_udl_guide_hint", "Review UDL supports for the current lesson"), run: (c) => {
      c.openUdlGuide();
      return t("cmd.open_udl_guide_done", "UDL Guide opened.");
    } },
    // ── Lesson blueprint commands (2026-07-28) ──
    // Each is gated on the capability the host exposes, so a command that
    // cannot work never appears in the palette. Deliberately NO
    // "save as template" command: saving runs a per-directive review (which
    // instructions suit any topic vs. which describe THIS lesson), and a
    // one-shot command would bypass it and quietly bake the current lesson's
    // content into a reusable template. That is a decision to make while
    // looking at the plan — the button on the card is the right surface.
    {
      id: "run_lesson_blueprint",
      icon: "\u25B6",
      roles: "teacher",
      when: (c) => !!c.hasActiveBlueprint && !!c.runBlueprint,
      label: t("cmd.run_lesson_blueprint", "Generate the lesson plan"),
      aliases: ["generate the plan", "run the blueprint", "build the lesson", "generate the lesson pack", "execute the plan", "make the resources"],
      hint: t("cmd.run_lesson_blueprint_hint", "Generates every resource in the current plan"),
      run: (c) => {
        c.runBlueprint();
        return t("cmd.run_lesson_blueprint_done", "Generating the plan now \u2014 you can watch each step on the card.");
      }
    },
    {
      id: "rebuild_lesson_step",
      icon: "\u{1F501}",
      roles: "teacher",
      when: (c) => !!c.hasActiveBlueprint && !!c.rebuildBlueprintStep,
      label: t("cmd.rebuild_lesson_step", "Rebuild one step of the plan"),
      aliases: ["rebuild step", "regenerate step", "redo step", "rebuild that resource", "try that step again"],
      hint: t("cmd.rebuild_lesson_step_hint", "Regenerates a single resource \u2014 say which step number"),
      run: (c, p) => {
        const steps = typeof c.blueprintStepList === "function" ? c.blueprintStepList() : [];
        const asked = p && (p.step || p.position || p.index || p.number);
        if (!asked) {
          const listed = steps.slice(0, 8).map((s) => `${s.position}. ${s.tool}`).join(", ");
          return t("cmd.rebuild_lesson_step_which", "Which step? ") + (listed || t("cmd.rebuild_lesson_step_none", "the plan has no steps yet."));
        }
        const hit = c.rebuildBlueprintStep(asked);
        return hit === null ? t("cmd.rebuild_lesson_step_missing", "I could not find that step in the plan.") : t("cmd.rebuild_lesson_step_done", "Rebuilding step ") + asked + ".";
      }
    },
    {
      id: "apply_lesson_template",
      icon: "\u{1F4D0}",
      roles: "teacher",
      when: (c) => typeof c.applyLessonTemplateByName === "function" && typeof c.lessonTemplateNames === "function" && c.lessonTemplateNames().length > 0,
      label: t("cmd.apply_lesson_template", "Start from a saved template"),
      aliases: ["use my template", "start from template", "apply template", "load template", "use a saved pattern"],
      hint: t("cmd.apply_lesson_template_hint", "Starts a new plan from one of your saved templates"),
      run: (c, p) => {
        const names = c.lessonTemplateNames();
        const asked = p && (p.name || p.template || p.topic);
        if (!asked) return t("cmd.apply_lesson_template_which", "Which template? ") + names.map((n) => n.name).slice(0, 8).join(", ");
        const hit = c.applyLessonTemplateByName(asked);
        return hit ? t("cmd.apply_lesson_template_done", "Started from ") + '"' + hit.name + '".' : t("cmd.apply_lesson_template_missing", "I could not find a template called ") + '"' + asked + '".';
      }
    },
    { id: "open_command_blueprints", icon: "\u{1F9E9}", roles: "teacher", label: "Saved Command Blueprints", aliases: ["command blueprints", "saved command blueprints", "saved workflows", "workflow library", "saved plans", "command workflow library"], hint: "Open, review, and rerun saved multi-step command workflows", run: (c) => {
      c.openCommandBlueprintLibrary();
      return "Saved Command Blueprints opened in AlloBot.";
    } },
    { id: "create_activity_rubric", icon: "\u{1F4D0}", roles: "teacher", requiresCapabilities: ["activityRubricGenerator"], label: t("cmd.create_activity_rubric", "Create a rubric for this activity"), aliases: ["create rubric", "make a rubric", "generate rubric", "rubric for this activity"], hint: t("cmd.create_activity_rubric_hint", "Generate observable, student-friendly success criteria"), run: (c) => {
      c.generateCurrentRubric();
      return t("cmd.create_activity_rubric_working", "Generating an activity rubric...");
    }, pendingNarration: t("cmd.create_activity_rubric_working", "Generating an activity rubric..."), runAsync: async (c) => {
      const ok = await c.generateCurrentRubric();
      if (ok === false) throw new Error(t("cmd.create_activity_rubric_failed", "The activity rubric could not be created."));
      return t("cmd.create_activity_rubric_done", "Activity rubric created.");
    } },
    { id: "share_assignment", icon: "\u{1F517}", roles: "teacher", destructive: true, requiresCapabilities: ["assignmentSharing"], label: t("cmd.share_assignment", "Share this assignment"), aliases: ["share assignment", "publish assignment", "make homework link", "create student link", "assign this"], hint: t("cmd.share_assignment_hint", "Create a student-facing homework link after confirmation"), confirmMessage: (c) => {
      const count = Math.max(1, Number(c.shareResourceCount) || 1);
      const days = Math.max(1, Number(c.shareExpiryDays) || 1);
      const ai = c.shareStudentAiPolicy === "student-byok" ? t("cmd.share_assignment_confirm_ai_byok", "Students may connect their own AI provider.") : t("cmd.share_assignment_confirm_ai_off", "Student AI will stay off.");
      return t("cmd.share_assignment_confirm", "Create a student link containing {count} resource(s), expiring in {days} day(s). {ai} Press Enter again to confirm.").replace("{count}", count).replace("{days}", days).replace("{ai}", ai);
    }, run: (c) => {
      c.shareAssignment();
      return t("cmd.share_assignment_working", "Creating the student assignment link...");
    }, pendingNarration: t("cmd.share_assignment_working", "Creating the student assignment link..."), runAsync: async (c) => {
      const url = await c.shareAssignment();
      if (!url) throw new Error(t("cmd.share_assignment_failed", "The student assignment link was not created."));
      return t("cmd.share_assignment_done", "Student assignment link created.");
    } },
    { id: "preview_assignment_as_student", icon: "\u{1F440}", roles: "teacher", requiresCapabilities: ["studentAssignmentPreview"], label: t("cmd.preview_assignment_as_student", "Preview the shared assignment as a student"), aliases: ["preview as student", "student preview", "test student link", "view assignment as student"], hint: t("cmd.preview_assignment_as_student_hint", "Open the latest shared link in a separate student tab"), run: (c) => {
      c.previewStudentAssignment();
      return t("cmd.preview_assignment_as_student_done", "Student preview opened in a new tab.");
    } },
    { id: "resume_latest_work", icon: "\u21A9\uFE0F", roles: "all", when: (c) => !!c.hasResumableWork && !!c.resumeLatestWork, label: t("cmd.resume_latest_work", "Resume my latest work"), aliases: ["resume my work", "continue my work", "open latest work", "pick up where i left off"], hint: t("cmd.resume_latest_work_hint", "Open the most recent saved item directly"), run: (c) => {
      const item = c.resumeLatestWork();
      return item ? t("cmd.resume_latest_work_done", "Resumed ") + (item.title || item.type || "your latest work") + "." : t("cmd.resume_latest_work_none", "No saved work is available yet.");
    } },
    // ── Open a tool (added 2026-06-13) — quick-launch the workspaces that normally live behind a
    //    hub card. Each is opensPanel-tagged so launching it CLOSES any open hub / other tool (the
    //    panel-stacking fix) instead of stacking. The ctx open-closures mirror the hub cards. ──
    { id: "open_stem_lab", opensPanel: "stemLab", icon: "\u{1F52C}", roles: "all", label: t("cmd.open_stem_lab", "Open the STEAM Lab"), aliases: ["steam lab", "steam", "stem lab", "stem", "open the stem lab", "open the steam lab", "science lab", "math lab", "simulations", "labs"], hint: t("cmd.open_stem_lab_hint", "Interactive science & math tools"), run: (c) => {
      c.openStemLab();
      return t("cmd.open_stem_lab_done", "STEAM Lab opened.");
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
    { id: "open_allo_studio", opensPanel: "alloStudio", icon: "\u{1F5BC}\uFE0F", roles: "teacher", label: t("cmd.open_allo_studio", "Open Page Designer"), aliases: ["allostudio", "allo studio", "page designer", "design studio", "poster editor", "worksheet editor", "flyer studio", "slide deck", "powerpoint"], hint: t("cmd.open_allo_studio_hint", "Design accessible posters, flyers, worksheets, and slide decks"), run: (c) => {
      c.openAlloStudio();
      return t("cmd.open_allo_studio_done", "Page Designer opened.");
    } },
    { id: "open_accessibility_lab", opensPanel: "accessibilityLab", icon: "\u267F", roles: "teacher", label: t("cmd.open_accessibility_lab", "Open the Accessibility Lab"), aliases: ["accessibility lab", "a11y lab", "accessibility checker", "wcag", "contrast checker"], hint: t("cmd.open_accessibility_lab_hint", "Check & improve accessibility"), run: (c) => {
      c.openAccessibilityLab();
      return t("cmd.open_accessibility_lab_done", "Accessibility Lab opened.");
    } },
    { id: "open_lumen", opensPanel: "stemLab", icon: "\u{1F4A1}", roles: "teacher", label: t("cmd.open_lumen", "Open Lumen (data canvas)"), aliases: ["lumen", "data canvas", "chart data", "graph data", "progress charts", "visualize data"], hint: t("cmd.open_lumen_hint", "Turn assessment data into charts"), run: (c) => {
      c.openLumen();
      return t("cmd.open_lumen_done", "Lumen opened in the STEAM Lab.");
    } },
    { id: "open_free_forms", opensPanel: "stemLab", icon: "\u{1F3DB}\uFE0F", roles: "all", label: t("cmd.open_free_forms", "Open Free Forms"), aliases: ["free forms", "world of forms", "forms", "build a venn", "story mountain", "3d organizer", "build my own organizer"], hint: t("cmd.open_free_forms_hint", "Build your own 3D World of Forms"), run: (c) => {
      c.openFreeForms();
      return t("cmd.open_free_forms_done", "Free Forms opened.");
    } },
    { id: "open_stem_tool", opensPanel: "stemLab", icon: "\u{1F9EA}", roles: "all", label: t("cmd.open_stem_tool", "Open a specific STEM tool"), aliases: ["open stem tool", "launch stem tool", "open simulation", "open simulator", "start stem tool", "open lab tool", "jump to tool"], hint: t("cmd.open_stem_tool_hint", "Name any STEAM Lab tool and go straight to it"), run: (c, params) => runOpenStemToolCommand(c, params || {}, t) },
    // ── Restored to the canonical source (2026-08-04) ──────────────────────
    // These 27 shipped in the BUILT module only (0c8bd276e), so every rebuild
    // deleted them. Ported back verbatim so source is canonical again.
    { id: "cycle_color_overlay", icon: "\u{1F308}", roles: "all", when: (c) => typeof c.cycleColorOverlay === "function", label: t("cmd.cycle_color_overlay", "Change the color overlay"), aliases: ["color overlay", "screen tint", "reading overlay", "colour overlay"], hint: t("cmd.cycle_color_overlay_hint", "Cycles the reading tint: none, blue, peach, yellow"), run: (c) => {
      const next = c.cycleColorOverlay();
      return next === "none" ? t("cmd.cycle_color_overlay_off", "Color overlay off.") : t("cmd.cycle_color_overlay_done", "Color overlay: ") + next + ".";
    } },
    { id: "download_voice_models", icon: "\u2B07\uFE0F", roles: "all", when: () => typeof fetch === "function" && _modelPolicy() !== "off", label: t("cmd.download_voice_models", "Download the on-device speech model"), aliases: ["download voice models", "download whisper", "offline voice", "install speech model", "on device voice"], hint: t("cmd.download_voice_models_hint", "One-time ~40 MB download to this device's durable storage; the on-device recognition engine will use it so no audio has to leave the device"), pendingNarration: t("cmd.download_voice_models_working", "Downloading the on-device speech model \u2014 it goes into this device's durable storage, visible in the Storage manager..."), runAsync: () => modelCache.prefetchWhisper().then((r) => t("cmd.download_voice_models_ready", "On-device speech model cached (") + Math.max(1, Math.round(r.bytes / 1048576)) + t("cmd.download_voice_models_ready2", " MB, in the model_cache storage area). The on-device engine will pick it up automatically once it ships.")) },
    { id: "filter_glossary", icon: "\u{1F50D}", roles: "all", when: (c) => !!c.contentIsGlossary && typeof c.setGlossaryFilterChoice === "function", label: t("cmd.filter_glossary", "Filter glossary terms"), aliases: ["filter terms", "academic words only", "domain words only", "show all terms"], hint: t("cmd.filter_glossary_hint", "Show all terms, academic (Tier 2) only, or domain (Tier 3) only"), run: (c, p) => {
      const tier = ["all", "academic", "domain"].includes(p && p.tier) ? p.tier : "all";
      c.setGlossaryFilterChoice(tier);
      return t("cmd.filter_glossary_done", "Glossary filter: ") + tier + ".";
    } },
    { id: "generate_anchor_chart", icon: "\u{1F4CC}", roles: "teacher", when: (c) => !!c.hasSourceOrAnalysis && typeof c.generateAnchorChart === "function", label: t("cmd.generate_anchor_chart", "Make an anchor chart"), aliases: ["anchor chart", "class poster", "reference chart"], hint: t("cmd.generate_anchor_chart_hint", "Generate an anchor chart from the current content"), runAsync: (c) => Promise.resolve(c.generateAnchorChart()).then(() => t("cmd.generate_anchor_chart_ready", "Anchor chart ready.")) },
    { id: "generate_brainstorm", icon: "\u{1F9E9}", roles: "teacher", when: (c) => !!c.hasSourceOrAnalysis && typeof c.generateBrainstorm === "function", label: t("cmd.generate_brainstorm", "Make a brainstorm web"), aliases: ["brainstorm", "idea web", "mind web", "concept web"], hint: t("cmd.generate_brainstorm_hint", "Generate a brainstorm organizer from the current content"), runAsync: (c) => Promise.resolve(c.generateBrainstorm()).then(() => t("cmd.generate_brainstorm_ready", "Brainstorm web ready.")) },
    { id: "generate_concept_sort", icon: "\u{1F5C2}\uFE0F", roles: "teacher", when: (c) => !!c.hasSourceOrAnalysis && typeof c.generateConceptSort === "function", label: t("cmd.generate_concept_sort", "Make a concept sort"), aliases: ["concept sort", "card sort", "sorting activity"], hint: t("cmd.generate_concept_sort_hint", "Generate a concept-sorting activity from the current content"), runAsync: (c) => Promise.resolve(c.generateConceptSort()).then(() => t("cmd.generate_concept_sort_ready", "Concept sort ready.")) },
    { id: "generate_faq", icon: "\u2753", roles: "teacher", when: (c) => !!c.hasSourceOrAnalysis && typeof c.generateFaq === "function", label: t("cmd.generate_faq", "Make an FAQ list"), aliases: ["faq", "frequently asked questions", "question list"], hint: t("cmd.generate_faq_hint", "Generate an FAQ list from the current content"), runAsync: (c) => Promise.resolve(c.generateFaq()).then(() => t("cmd.generate_faq_ready", "FAQ list ready.")) },
    { id: "generate_note_taking", icon: "\u{1F4DD}", roles: "teacher", when: (c) => !!c.hasSourceOrAnalysis && typeof c.generateNoteTaking === "function", label: t("cmd.generate_note_taking", "Create a note-taking guide"), aliases: ["note taking", "guided notes", "notes template", "cornell notes"], hint: t("cmd.generate_note_taking_hint", "Generate a structured note-taking guide from the current content"), runAsync: (c) => Promise.resolve(c.generateNoteTaking()).then(() => t("cmd.generate_note_taking_ready", "Note-taking guide ready \u2014 it\u2019s in the output panel.")) },
    { id: "generate_source_text", icon: "\u{1F4C4}", roles: "teacher", when: (c) => typeof c.generateSourceText === "function", label: t("cmd.generate_source_text", "Generate source text on a topic"), aliases: ["generate a source", "write a passage about", "make a reading about", "source text on"], hint: t("cmd.generate_source_text_hint", "Writes an original reading passage on your topic to build resources from"), pendingNarration: t("cmd.generate_source_text_working", "Writing a source passage..."), runAsync: (c, p) => Promise.resolve(c.generateSourceText(p && p.topic ? String(p.topic) : "")).then(() => t("cmd.generate_source_text_ready", "Source passage ready \u2014 you can now generate resources from it.")) },
    { id: "open_screen_coach", opensPanel: "videoStudio", icon: "\u{1F9ED}", roles: "teacher", when: (c) => typeof c.openVideoStudio === "function", label: t("cmd.open_screen_coach", "Open the Screen Coach"), aliases: ["screen coach", "coach me", "guide me through", "help me use another site", "watch my screen"], hint: t("cmd.open_screen_coach_hint", "AI guidance over any tab you capture \u2014 it advises with on-screen highlights; you do the clicking"), run: (c) => {
      c.openVideoStudio();
      return t("cmd.open_screen_coach_done", "Opening Video Studio \u2014 the Screen Coach panel is at the top of the Record tab. Use \u201CWatch without recording\u201D to coach without saving anything.");
    } },
    { id: "print_page", icon: "\u{1F5A8}\uFE0F", roles: "all", when: () => typeof window !== "undefined" && typeof window.print === "function", label: t("cmd.print_page", "Print this page"), aliases: ["print", "print it", "printer"], hint: t("cmd.print_page_hint", "Opens the browser print dialog for the current page"), run: () => {
      try {
        window.print();
      } catch (_) {
      }
      return t("cmd.print_page_done", "Opening the print dialog.");
    } },
    { id: "read_page_aloud", icon: "\u{1F508}", roles: "all", when: (c) => typeof c.openReadThisPage === "function", label: t("cmd.read_page_aloud", "Read this page aloud"), aliases: ["read this page", "read aloud", "read it to me", "read the page"], hint: t("cmd.read_page_aloud_hint", "Opens the read-aloud overlay for the current page"), run: (c) => {
      c.openReadThisPage();
      return t("cmd.read_page_aloud_done", "Opening read-aloud for this page.");
    } },
    { id: "set_model_download_policy", icon: "\u2699\uFE0F", roles: "all", when: () => true, label: t("cmd.set_model_download_policy", "Set model download policy"), aliases: ["model download policy", "auto download models", "stop model downloads"], hint: t("cmd.set_model_download_policy_hint", "ask (default), auto (fetch on first voice use), or off"), run: (c, p) => {
      var v = modelCache.setPolicy(p && p.policy);
      return t("cmd.set_model_download_policy_done", "Model downloads: ") + v + ".";
    } },
    { id: "start_bingo_game", icon: "\u{1F3B1}", roles: "all", when: (c) => !!c.contentIsGlossary && typeof c.startBingoGame === "function", label: t("cmd.start_bingo_game", "Play vocabulary bingo"), aliases: ["bingo", "vocab bingo", "vocabulary bingo"], hint: t("cmd.start_bingo_game_hint", "Play bingo with this glossary\u2019s terms"), run: (c) => {
      c.startBingoGame();
      return t("cmd.start_bingo_game_done", "Vocabulary bingo on.");
    } },
    { id: "start_crossword_game", icon: "\u{1F4F0}", roles: "all", when: (c) => !!c.contentIsGlossary && typeof c.startCrosswordGame === "function", label: t("cmd.start_crossword_game", "Play the crossword"), aliases: ["crossword", "crossword puzzle"], hint: t("cmd.start_crossword_game_hint", "Turn this glossary into a crossword puzzle"), run: (c) => {
      c.startCrosswordGame();
      return t("cmd.start_crossword_game_done", "Crossword on \u2014 clues come from the definitions.");
    } },
    { id: "start_matching_game", icon: "\u{1F517}", roles: "all", when: (c) => !!c.contentIsGlossary && typeof c.startMatchingGame === "function", label: t("cmd.start_matching_game", "Play the matching game"), aliases: ["matching game", "match terms"], hint: t("cmd.start_matching_game_hint", "Match glossary terms to their definitions"), run: (c) => {
      c.startMatchingGame();
      return t("cmd.start_matching_game_done", "Matching game on \u2014 drag each term to its definition.");
    } },
    { id: "start_memory_game", icon: "\u{1F9E0}", roles: "all", when: (c) => !!c.contentIsGlossary && typeof c.startMemoryGame === "function", label: t("cmd.start_memory_game", "Play the memory game"), aliases: ["memory game", "concentration game"], hint: t("cmd.start_memory_game_hint", "Study this glossary as a memory matching game"), run: (c) => {
      c.startMemoryGame();
      return t("cmd.start_memory_game_done", "Memory game on \u2014 flip cards to match terms and meanings.");
    } },
    { id: "start_review_game", icon: "\u{1F3AF}", roles: "all", when: (c) => !!c.contentIsQuiz && typeof c.toggleReviewGame === "function", label: t("cmd.start_review_game", "Play the quiz as a review game"), aliases: ["review game", "quiz game", "game mode"], hint: t("cmd.start_review_game_hint", "Turns the current quiz into a review game"), run: (c) => {
      c.toggleReviewGame();
      return t("cmd.start_review_game_done", "Review game toggled.");
    } },
    { id: "start_word_scramble", icon: "\u{1F500}", roles: "all", when: (c) => !!c.contentIsGlossary && typeof c.startWordScrambleGame === "function", label: t("cmd.start_word_scramble", "Play word scramble"), aliases: ["word scramble", "scramble game", "unscramble"], hint: t("cmd.start_word_scramble_hint", "Unscramble this glossary's terms"), run: (c) => {
      c.startWordScrambleGame();
      return t("cmd.start_word_scramble_done", "Word scramble on.");
    } },
    { id: "toggle_content_editing", icon: "\u270F\uFE0F", roles: "teacher", when: (c) => typeof c.toggleContentEditing === "function" && !!c.contentLoaded, label: t("cmd.toggle_content_editing", "Edit this content"), aliases: ["edit this", "edit mode", "let me edit", "stop editing"], hint: t("cmd.toggle_content_editing_hint", "Toggles edit mode on whatever is currently on screen"), run: (c) => {
      const kind = c.toggleContentEditing();
      return kind ? t("cmd.toggle_content_editing_done", "Edit mode toggled for the ") + kind + "." : t("cmd.toggle_content_editing_miss", "This view doesn\u2019t have an edit mode.");
    } },
    { id: "toggle_presentation_mode", icon: "\u{1F4FA}", roles: "teacher", when: (c) => !!c.contentLoaded && typeof c.togglePresentationMode === "function", label: t("cmd.toggle_presentation_mode", "Toggle presentation mode"), aliases: ["presentation mode", "present this", "projector mode", "full screen content"], hint: t("cmd.toggle_presentation_mode_hint", "Large-format view of the current content for projecting"), run: (c) => {
      c.togglePresentationMode();
      return t("cmd.toggle_presentation_mode_done", "Presentation mode toggled.");
    } },
    { id: "toggle_quiz_answers", icon: "\u{1F511}", roles: "teacher", when: (c) => !!c.contentIsQuiz && typeof c.toggleQuizAnswers === "function", label: t("cmd.toggle_quiz_answers", "Show or hide quiz answers"), aliases: ["quiz answers", "show answers", "hide answers", "answer key"], hint: t("cmd.toggle_quiz_answers_hint", "Toggles the answer key on the current quiz (teacher only)"), run: (c) => {
      c.toggleQuizAnswers();
      return t("cmd.toggle_quiz_answers_done", "Quiz answer key toggled.");
    } },
    { id: "toggle_side_by_side", icon: "\u{1F4D1}", roles: "all", when: (c) => !!c.contentIsSimplified && typeof c.toggleSideBySide === "function", label: t("cmd.toggle_side_by_side", "Compare with the original"), aliases: ["side by side", "compare original", "original next to adapted"], hint: t("cmd.toggle_side_by_side_hint", "Shows the adapted text next to the original source"), run: (c) => {
      c.toggleSideBySide();
      return t("cmd.toggle_side_by_side_done", "Side-by-side comparison toggled.");
    } },
    { id: "toggle_voice_replies", icon: "\u{1F50A}", roles: "all", when: (c) => c.voiceAvailable, label: t("cmd.toggle_voice_replies", "Toggle spoken replies"), aliases: ["spoken replies", "speak replies", "voice replies", "talk back"], hint: t("cmd.toggle_voice_replies_hint", "Voice control speaks its answers out loud (on by default)"), run: () => {
      let next = "off";
      try {
        next = localStorage.getItem("allo_voice_speak_replies") === "off" ? "on" : "off";
        localStorage.setItem("allo_voice_speak_replies", next);
      } catch (_) {
      }
      return next === "off" ? t("cmd.voice_replies_off", "Spoken replies off \u2014 answers appear on screen only.") : t("cmd.voice_replies_on", "Spoken replies on \u2014 voice control will answer out loud.");
    } },
    { id: "toggle_wake_word", icon: "\u{1F4E3}", roles: "all", when: (c) => !!c.voiceAvailable, label: t("cmd.toggle_wake_word", "Toggle \u201Chey Allo\u201D standby"), aliases: ["wake word", "hey allo", "standby listening", "wake up word"], hint: t("cmd.toggle_wake_word_hint", "Voice control idles until you say \u201Chey Allo\u201D. Needs the on-device model \u2014 while idling, audio never leaves this device"), run: () => {
      var on = "off";
      try {
        on = localStorage.getItem("allo_voice_standby") === "on" ? "off" : "on";
        localStorage.setItem("allo_voice_standby", on);
      } catch (_) {
      }
      var lp = window.__alloVoiceLoop;
      var live = !!(lp && typeof lp.isActive === "function" && lp.isActive());
      if (on === "on" && live && typeof lp.setStandby === "function" && !lp.setStandby(true)) {
        return t("cmd.toggle_wake_word_needs_model", "\u201CHey Allo\u201D standby is saved, but it needs the on-device speech model \u2014 say \u201Cdownload voice models\u201D first. Until then, tap-to-talk keeps working.");
      }
      if (on === "off" && live && typeof lp.setStandby === "function") lp.setStandby(false);
      return on === "on" ? t("cmd.toggle_wake_word_on", "\u201CHey Allo\u201D standby on \u2014 voice control idles until it hears the wake phrase (applies now if listening, and on every future start).") : t("cmd.toggle_wake_word_off", "Wake-word standby off \u2014 listening handles every utterance again.");
    } },
    { id: "voice_speed_down", icon: "\u23EA", roles: "all", when: (c) => typeof c.adjustVoiceSpeed === "function", label: t("cmd.voice_speed_down", "Speak slower"), aliases: ["slower voice", "slow down voice", "read slower"], hint: t("cmd.voice_speed_down_hint", "Lowers the read-aloud speed"), run: (c) => {
      const next = c.adjustVoiceSpeed(-0.25);
      return t("cmd.voice_speed_done", "Read-aloud speed is now ") + next + "x.";
    } },
    { id: "voice_speed_up", icon: "\u23E9", roles: "all", when: (c) => typeof c.adjustVoiceSpeed === "function", label: t("cmd.voice_speed_up", "Speak faster"), aliases: ["faster voice", "speed up voice", "read faster"], hint: t("cmd.voice_speed_up_hint", "Raises the read-aloud speed"), run: (c) => {
      const next = c.adjustVoiceSpeed(0.25);
      return t("cmd.voice_speed_done", "Read-aloud speed is now ") + next + "x.";
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
    { id: "open_research_hub", opensPanel: "researchHub", icon: "\u{1F50D}", roles: "all", label: t("cmd.open_research_hub", "Open Research Hub"), aliases: ["research hub", "research", "credible sources", "source finder", "find sources", "research tool"], hint: t("cmd.open_research_hub_hint", "Find and organize credible research sources"), run: (c) => {
      c.openResearchHub();
      return t("cmd.open_research_hub_done", "Research Hub opened.");
    } },
    { id: "open_lit_lab", opensPanel: "litLab", icon: "\u{1F4DA}", roles: "all", label: t("cmd.open_lit_lab", "Open Lit Lab"), aliases: ["lit lab", "literature lab", "reading lab", "story lab", "literature tools"], hint: t("cmd.open_lit_lab_hint", "Explore literature and reading activities"), run: (c) => {
      c.openLitLab();
      return t("cmd.open_lit_lab_done", "Lit Lab opened.");
    } },
    { id: "open_mind_map", opensPanel: "mindMap", icon: "\u{1F9ED}", roles: "all", label: t("cmd.open_mind_map", "Open Throughline"), aliases: ["throughline", "mind map", "unit map", "lesson map", "concept map", "visual map"], hint: t("cmd.open_mind_map_hint", "Map concepts, lessons, and unit connections"), run: (c) => {
      c.openMindMap();
      return t("cmd.open_mind_map_done", "Throughline opened.");
    } },
    { id: "open_poet_tree", opensPanel: "poetTree", icon: "\u{1F333}", roles: "all", label: t("cmd.open_poet_tree", "Open Poet Tree"), aliases: ["poet tree", "poetry tree", "poem builder", "poetry lab", "write poetry"], hint: t("cmd.open_poet_tree_hint", "Build poems with guided branches"), run: (c) => {
      c.openPoetTree();
      return t("cmd.open_poet_tree_done", "Poet Tree opened.");
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
    { id: "submit_work", icon: "\u{1F4E8}", roles: "student", when: (c) => !c.isTeacherMode, label: t("cmd.submit_work", "Submit my work"), aliases: ["submit", "submit my work", "hand it in", "turn in"], hint: t("cmd.submit_work_hint", "Send your work to your teacher"), run: (c) => {
      c.submitWork();
      return t("cmd.submit_work_done", "Opening the submit dialog\u2026");
    } },
    { id: "open_assignment_directions", icon: "\u{1F4CB}", roles: "student", when: (c) => !!c.hasAssignmentDirections && !!c.openAssignmentDirections, label: t("directions.title", "Open assignment directions"), aliases: ["assignment directions", "read directions", "show directions", "what do i do", "what am i supposed to do"], hint: t("directions.subtitle", "Open the directions and goals for this assignment"), run: (c) => {
      c.openAssignmentDirections();
      return "Assignment directions opened.";
    } },
    { id: "check_assignment_progress", icon: "\u{1F3AF}", roles: "student", when: (c) => !!c.getAssignmentProgress && !!c.getAssignmentProgress(), label: t("directions.your_goals", "Check assignment progress"), aliases: ["check my progress", "my progress", "how am i doing", "what is left", "goals left"], hint: t("directions.signals_note", "Hear how many assignment goals are complete"), run: (c) => {
      const p = c.getAssignmentProgress();
      return p ? (p.title ? p.title + ": " : "") + p.done + " of " + p.total + " goals complete." : "No assignment progress is available yet.";
    } },
    { id: "save_my_work", icon: "\u{1F4BE}", roles: "student", when: (c) => !!c.canSaveStudentWork && !!c.saveStudentWork, label: t("modals.save_project.title", "Save my work"), aliases: ["save my work", "download my work", "save project", "keep my work"], hint: t("modals.save_project.filename_label", "Save a student work file on this device"), run: (c) => {
      c.saveStudentWork();
      return "Save my work dialog opened.";
    } },
    { id: "next_assignment_step", icon: "\u27A1\uFE0F", roles: "student", when: (c) => !!c.getNextAssignmentStep && !!c.getNextAssignmentStep() && !!c.openNextAssignmentStep, label: t("cmd.next_assignment_step", "What should I do next?"), aliases: ["what should i do next", "next step", "where do i go next", "next activity", "continue assignment"], hint: t("cmd.next_assignment_step_hint", "Open the recommended next activity or goal"), run: (c) => {
      const step = c.openNextAssignmentStep();
      return step ? (step.goalLabel ? step.goalLabel + ": " : "") + "Opening " + (step.title || "your next activity") + "." : t("directions.all_done", "Every assignment goal is complete.");
    } },
    { id: "read_assignment_directions", icon: "\u{1F50A}", roles: "student", when: (c) => !!c.hasAssignmentDirections && !!c.readAssignmentDirections, label: t("cmd.read_assignment_directions", "Read my directions aloud"), aliases: ["read directions aloud", "read my directions", "say the directions", "listen to directions"], hint: t("cmd.read_assignment_directions_hint", "Open the directions and start read-aloud"), run: (c) => {
      c.readAssignmentDirections();
      return t("cmd.read_assignment_directions_done", "Assignment directions opened for read-aloud.");
    } },
    { id: "show_success_criteria", icon: "\u{1F3C1}", roles: "student", when: (c) => !!c.getSuccessCriteria && !!c.getSuccessCriteria(), label: t("cmd.show_success_criteria", "Show the success criteria"), aliases: ["show rubric", "what does success look like", "success criteria", "grading rubric", "how will this be graded"], hint: t("cmd.show_success_criteria_hint", "Hear the assignment goals or current rubric criteria"), run: (c) => {
      const r = c.getSuccessCriteria();
      return r && r.criteria && r.criteria.length ? (r.title ? r.title + ": " : "") + r.criteria.slice(0, 6).join("; ") + "." : t("cmd.show_success_criteria_none", "No success criteria are available yet.");
    } },
    { id: "send_teacher_signal", icon: "\u270B", roles: "student", when: (c) => !!c.activeSessionCode && !c.isTeacherMode && !!c.sendTeacherSignal, label: t("cmd.send_teacher_signal", "Ask my teacher for help"), aliases: ["tell teacher i am stuck", "ask teacher to slow down", "ask teacher to repeat", "tell teacher i am ready"], hint: t("cmd.send_teacher_signal_hint", "Send one private, fixed-choice signal in the live session"), run: (c, p) => {
      const raw = String(p && p.signal || "").toLowerCase();
      const signal = /slow/.test(raw) ? "slow" : /repeat|again/.test(raw) ? "repeat" : /ready|done/.test(raw) ? "ready" : /stuck|help|confus/.test(raw) ? "stuck" : "";
      if (!signal) {
        if (c.openStudentSignals) c.openStudentSignals();
        return t("cmd.open_student_signal_done", "Teacher signal panel opened. Pick one option to send.");
      }
      const sent = c.sendTeacherSignal(signal);
      return sent === false ? t("cmd.send_teacher_signal_failed", "The signal could not be sent. Check the live session and try again.") : t("live_signals.sent", "Signal sent to your teacher.");
    } },
    { id: "review_teacher_feedback", icon: "\u{1F4AC}", roles: "student", when: (c) => !!c.getTeacherFeedback && !!c.getTeacherFeedback(), label: t("cmd.review_teacher_feedback", "Review teacher feedback"), aliases: ["teacher feedback", "review feedback", "what did my teacher say", "returned feedback", "comments from teacher"], hint: t("cmd.review_teacher_feedback_hint", "Hear returned feedback when it is available"), run: (c) => {
      const f = c.getTeacherFeedback();
      return f ? (f.title ? f.title + ": " : "") + f.text : t("cmd.review_teacher_feedback_none", "No returned teacher feedback is available yet.");
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
    { id: "toggle_dictation", icon: "\u{1F3A4}", roles: "all", when: (c) => getCommandAudience(c) !== "student" || c.allowStudentDictation !== false, label: t("cmd.toggle_dictation", "Toggle dictation"), aliases: ["dictation", "speech to text", "type by voice"], hint: t("cmd.toggle_dictation_hint", "Speak instead of typing"), run: (c) => {
      c.toggleDictation();
      return t("cmd.toggle_dictation_done", "Dictation toggled.");
    } },
    { id: "toggle_socratic", icon: "\u{1F4AC}", roles: "student", when: (c) => c.allowStudentSocratic !== false && !c.studentAiFeaturesHidden, label: t("cmd.toggle_socratic", "Toggle the Socratic chat"), aliases: ["socratic", "study chat", "thinking partner"], hint: t("cmd.toggle_socratic_hint", "A question-first study companion"), run: (c) => {
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
    { id: "set_grade_level", icon: "\u{1F39A}\uFE0F", roles: ["teacher", "independent", "parent"], when: (c) => !!c.setSetupGradeLevel, label: t("cmd.set_grade_level", "Set the grade level"), aliases: ["set grade level", "grade level", "target grade", "reading level", "set target level"], hint: t("cmd.set_grade_level_hint", "e.g. set grade level to 5"), run: (c, p) => {
      const v = c.setSetupGradeLevel(p && p.grade);
      return v ? t("cmd.set_grade_level_done", "Grade level set to ") + v + "." : t("cmd.set_grade_level_pick", "Say a grade like grade 5.");
    } },
    { id: "set_source_tone", icon: "\u{1F399}\uFE0F", roles: ["teacher", "independent", "parent"], when: (c) => !!c.setSetupSourceTone, label: t("cmd.set_source_tone", "Set source tone"), aliases: ["set source tone", "source tone", "change tone", "tone to", "make the tone"], hint: t("cmd.set_source_tone_hint", "Informative, narrative, dialogue, persuasive, humorous, or step-by-step"), run: (c, p) => {
      const v = c.setSetupSourceTone(p && p.tone);
      return v ? t("cmd.set_source_tone_done", "Source tone set to ") + v + "." : t("cmd.set_source_tone_pick", "Say a tone like narrative.");
    } },
    { id: "set_source_length", icon: "\u{1F4CF}", roles: ["teacher", "independent", "parent"], when: (c) => !!c.setSetupSourceLength, label: t("cmd.set_source_length", "Set source length"), aliases: ["set source length", "source length", "text length", "reading length", "word count"], hint: t("cmd.set_source_length_hint", "Short, medium, long, or a word count"), run: (c, p) => {
      const v = c.setSetupSourceLength(p && p.length);
      return v ? t("cmd.set_source_length_done", "Source length set to about ") + v + t("cmd.set_source_length_done2", " words.") : t("cmd.set_source_length_pick", "Say a length like 500 words.");
    } },
    { id: "set_output_language", icon: "\u{1F310}", roles: ["teacher", "independent", "parent"], when: (c) => !!c.setSetupLanguage, label: t("cmd.set_output_language", "Set output language"), aliases: ["set output language", "output language", "text language", "reading language", "lesson language", "write in"], hint: t("cmd.set_output_language_hint", "Set the language used for generated resources"), run: (c, p) => {
      const v = c.setSetupLanguage(p && p.language);
      return v ? t("cmd.set_output_language_done", "Output language set to ") + v + "." : t("cmd.set_output_language_pick", "Say a language like Spanish.");
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
      return getCommandAudience(c) === "student" ? t("student.voice_control_on", "Voice control on. Say a command like \u201Cbigger text\u201D or \u201Cread directions\u201D. Say \u201Cstop listening\u201D to finish.") || "Voice control on." : t("cmd.voice_start_done", "Voice control on. Say a command like \u201Cbigger text\u201D or \u201Copen the educator hub\u201D. Say \u201Cstop listening\u201D to finish.");
    } },
    { id: "voice_stop", icon: "\u{1F6D1}", roles: "all", when: (c) => !!c.voiceActive, label: t("cmd.voice_stop", "Stop voice control"), aliases: ["stop listening", "stop voice", "voice off"], hint: t("cmd.voice_stop_hint", "Stops the microphone"), run: (c) => {
      c.stopVoiceLoop();
      return t("cmd.voice_stop_done", "Voice control off \u2014 the microphone is released.");
    } },
    { id: "open_screen_coach", opensPanel: "videoStudio", icon: "\u{1F9ED}", roles: "teacher", when: (c) => typeof c.openVideoStudio === "function", label: t("cmd.open_screen_coach", "Open the Screen Coach"), aliases: ["screen coach", "coach me", "guide me through", "help me use another site", "watch my screen"], hint: t("cmd.open_screen_coach_hint", "AI guidance over any tab you capture \u2014 it advises with on-screen highlights; you do the clicking"), run: (c) => {
      c.openVideoStudio();
      return t("cmd.open_screen_coach_done", "Opening Video Studio \u2014 the Screen Coach panel is at the top of the Record tab. Use \u201CWatch without recording\u201D to coach without saving anything.");
    } },
    { id: "toggle_voice_replies", icon: "\u{1F50A}", roles: "all", when: (c) => c.voiceAvailable, label: t("cmd.toggle_voice_replies", "Toggle spoken replies"), aliases: ["spoken replies", "speak replies", "voice replies", "talk back"], hint: t("cmd.toggle_voice_replies_hint", "Voice control speaks its answers out loud (on by default)"), run: () => {
      let next = "off";
      try {
        next = localStorage.getItem("allo_voice_speak_replies") === "off" ? "on" : "off";
        localStorage.setItem("allo_voice_speak_replies", next);
      } catch (_) {
      }
      return next === "off" ? t("cmd.voice_replies_off", "Spoken replies off \u2014 answers appear on screen only.") : t("cmd.voice_replies_on", "Spoken replies on \u2014 voice control will answer out loud.");
    } },
    { id: "download_voice_models", icon: "\u2B07\uFE0F", roles: "all", when: () => typeof fetch === "function" && _modelPolicy() !== "off", label: t("cmd.download_voice_models", "Download the on-device speech model"), aliases: ["download voice models", "download whisper", "offline voice", "install speech model", "on device voice"], hint: t("cmd.download_voice_models_hint", "One-time ~40 MB download to this device's durable storage; the on-device recognition engine will use it so no audio has to leave the device"), pendingNarration: t("cmd.download_voice_models_working", "Downloading the on-device speech model \u2014 it goes into this device's durable storage, visible in the Storage manager..."), runAsync: () => modelCache.prefetchWhisper().then((r) => t("cmd.download_voice_models_ready", "On-device speech model cached (") + Math.max(1, Math.round(r.bytes / 1048576)) + t("cmd.download_voice_models_ready2", " MB, in the model_cache storage area). The on-device engine will pick it up automatically once it ships.")) },
    { id: "set_model_download_policy", icon: "\u2699\uFE0F", roles: "all", when: () => true, label: t("cmd.set_model_download_policy", "Set model download policy"), aliases: ["model download policy", "auto download models", "stop model downloads"], hint: t("cmd.set_model_download_policy_hint", "ask (default), auto (fetch on first voice use), or off"), run: (c, p) => {
      var v = modelCache.setPolicy(p && p.policy);
      return t("cmd.set_model_download_policy_done", "Model downloads: ") + v + ".";
    } },
    { id: "toggle_wake_word", icon: "\u{1F4E3}", roles: "all", when: (c) => !!c.voiceAvailable, label: t("cmd.toggle_wake_word", "Toggle \u201Chey Allo\u201D standby"), aliases: ["wake word", "hey allo", "standby listening", "wake up word"], hint: t("cmd.toggle_wake_word_hint", "Voice control idles until you say \u201Chey Allo\u201D. Needs the on-device model \u2014 while idling, audio never leaves this device"), run: () => {
      var on = "off";
      try {
        on = localStorage.getItem("allo_voice_standby") === "on" ? "off" : "on";
        localStorage.setItem("allo_voice_standby", on);
      } catch (_) {
      }
      var lp = window.__alloVoiceLoop;
      var live = !!(lp && typeof lp.isActive === "function" && lp.isActive());
      if (on === "on" && live && typeof lp.setStandby === "function" && !lp.setStandby(true)) {
        return t("cmd.toggle_wake_word_needs_model", "\u201CHey Allo\u201D standby is saved, but it needs the on-device speech model \u2014 say \u201Cdownload voice models\u201D first. Until then, tap-to-talk keeps working.");
      }
      if (on === "off" && live && typeof lp.setStandby === "function") lp.setStandby(false);
      return on === "on" ? t("cmd.toggle_wake_word_on", "\u201CHey Allo\u201D standby on \u2014 voice control idles until it hears the wake phrase (applies now if listening, and on every future start).") : t("cmd.toggle_wake_word_off", "Wake-word standby off \u2014 listening handles every utterance again.");
    } },
    { id: "generate_note_taking", icon: "\u{1F4DD}", roles: "teacher", when: (c) => !!c.hasSourceOrAnalysis && typeof c.generateNoteTaking === "function", label: t("cmd.generate_note_taking", "Create a note-taking guide"), aliases: ["note taking", "guided notes", "notes template", "cornell notes"], hint: t("cmd.generate_note_taking_hint", "Generate a structured note-taking guide from the current content"), runAsync: (c) => Promise.resolve(c.generateNoteTaking()).then(() => t("cmd.generate_note_taking_ready", "Note-taking guide ready \u2014 it\u2019s in the output panel.")) },
    { id: "generate_anchor_chart", icon: "\u{1F4CC}", roles: "teacher", when: (c) => !!c.hasSourceOrAnalysis && typeof c.generateAnchorChart === "function", label: t("cmd.generate_anchor_chart", "Make an anchor chart"), aliases: ["anchor chart", "class poster", "reference chart"], hint: t("cmd.generate_anchor_chart_hint", "Generate an anchor chart from the current content"), runAsync: (c) => Promise.resolve(c.generateAnchorChart()).then(() => t("cmd.generate_anchor_chart_ready", "Anchor chart ready.")) },
    { id: "generate_concept_sort", icon: "\u{1F5C2}\uFE0F", roles: "teacher", when: (c) => !!c.hasSourceOrAnalysis && typeof c.generateConceptSort === "function", label: t("cmd.generate_concept_sort", "Make a concept sort"), aliases: ["concept sort", "card sort", "sorting activity"], hint: t("cmd.generate_concept_sort_hint", "Generate a concept-sorting activity from the current content"), runAsync: (c) => Promise.resolve(c.generateConceptSort()).then(() => t("cmd.generate_concept_sort_ready", "Concept sort ready.")) },
    { id: "start_memory_game", icon: "\u{1F9E0}", roles: "all", when: (c) => !!c.contentIsGlossary && typeof c.startMemoryGame === "function", label: t("cmd.start_memory_game", "Play the memory game"), aliases: ["memory game", "concentration game"], hint: t("cmd.start_memory_game_hint", "Study this glossary as a memory matching game"), run: (c) => {
      c.startMemoryGame();
      return t("cmd.start_memory_game_done", "Memory game on \u2014 flip cards to match terms and meanings.");
    } },
    { id: "start_matching_game", icon: "\u{1F517}", roles: "all", when: (c) => !!c.contentIsGlossary && typeof c.startMatchingGame === "function", label: t("cmd.start_matching_game", "Play the matching game"), aliases: ["matching game", "match terms"], hint: t("cmd.start_matching_game_hint", "Match glossary terms to their definitions"), run: (c) => {
      c.startMatchingGame();
      return t("cmd.start_matching_game_done", "Matching game on \u2014 drag each term to its definition.");
    } },
    { id: "start_bingo_game", icon: "\u{1F3B1}", roles: "all", when: (c) => !!c.contentIsGlossary && typeof c.startBingoGame === "function", label: t("cmd.start_bingo_game", "Play vocabulary bingo"), aliases: ["bingo", "vocab bingo", "vocabulary bingo"], hint: t("cmd.start_bingo_game_hint", "Play bingo with this glossary\u2019s terms"), run: (c) => {
      c.startBingoGame();
      return t("cmd.start_bingo_game_done", "Vocabulary bingo on.");
    } },
    { id: "cycle_color_overlay", icon: "\u{1F308}", roles: "all", when: (c) => typeof c.cycleColorOverlay === "function", label: t("cmd.cycle_color_overlay", "Change the color overlay"), aliases: ["color overlay", "screen tint", "reading overlay", "colour overlay"], hint: t("cmd.cycle_color_overlay_hint", "Cycles the reading tint: none, blue, peach, yellow"), run: (c) => {
      const next = c.cycleColorOverlay();
      return next === "none" ? t("cmd.cycle_color_overlay_off", "Color overlay off.") : t("cmd.cycle_color_overlay_done", "Color overlay: ") + next + ".";
    } },
    { id: "voice_speed_up", icon: "\u23E9", roles: "all", when: (c) => typeof c.adjustVoiceSpeed === "function", label: t("cmd.voice_speed_up", "Speak faster"), aliases: ["faster voice", "speed up voice", "read faster"], hint: t("cmd.voice_speed_up_hint", "Raises the read-aloud speed"), run: (c) => {
      const next = c.adjustVoiceSpeed(0.25);
      return t("cmd.voice_speed_done", "Read-aloud speed is now ") + next + "x.";
    } },
    { id: "voice_speed_down", icon: "\u23EA", roles: "all", when: (c) => typeof c.adjustVoiceSpeed === "function", label: t("cmd.voice_speed_down", "Speak slower"), aliases: ["slower voice", "slow down voice", "read slower"], hint: t("cmd.voice_speed_down_hint", "Lowers the read-aloud speed"), run: (c) => {
      const next = c.adjustVoiceSpeed(-0.25);
      return t("cmd.voice_speed_done", "Read-aloud speed is now ") + next + "x.";
    } },
    { id: "start_crossword_game", icon: "\u{1F4F0}", roles: "all", when: (c) => !!c.contentIsGlossary && typeof c.startCrosswordGame === "function", label: t("cmd.start_crossword_game", "Play the crossword"), aliases: ["crossword", "crossword puzzle"], hint: t("cmd.start_crossword_game_hint", "Turn this glossary into a crossword puzzle"), run: (c) => {
      c.startCrosswordGame();
      return t("cmd.start_crossword_game_done", "Crossword on \u2014 clues come from the definitions.");
    } },
    { id: "start_word_scramble", icon: "\u{1F500}", roles: "all", when: (c) => !!c.contentIsGlossary && typeof c.startWordScrambleGame === "function", label: t("cmd.start_word_scramble", "Play word scramble"), aliases: ["word scramble", "scramble game", "unscramble"], hint: t("cmd.start_word_scramble_hint", "Unscramble this glossary's terms"), run: (c) => {
      c.startWordScrambleGame();
      return t("cmd.start_word_scramble_done", "Word scramble on.");
    } },
    { id: "filter_glossary", icon: "\u{1F50D}", roles: "all", when: (c) => !!c.contentIsGlossary && typeof c.setGlossaryFilterChoice === "function", label: t("cmd.filter_glossary", "Filter glossary terms"), aliases: ["filter terms", "academic words only", "domain words only", "show all terms"], hint: t("cmd.filter_glossary_hint", "Show all terms, academic (Tier 2) only, or domain (Tier 3) only"), run: (c, p) => {
      const tier = ["all", "academic", "domain"].includes(p && p.tier) ? p.tier : "all";
      c.setGlossaryFilterChoice(tier);
      return t("cmd.filter_glossary_done", "Glossary filter: ") + tier + ".";
    } },
    { id: "read_page_aloud", icon: "\u{1F508}", roles: "all", when: (c) => typeof c.openReadThisPage === "function", label: t("cmd.read_page_aloud", "Read this page aloud"), aliases: ["read this page", "read aloud", "read it to me", "read the page"], hint: t("cmd.read_page_aloud_hint", "Opens the read-aloud overlay for the current page"), run: (c) => {
      c.openReadThisPage();
      return t("cmd.read_page_aloud_done", "Opening read-aloud for this page.");
    } },
    { id: "toggle_quiz_answers", icon: "\u{1F511}", roles: "teacher", when: (c) => !!c.contentIsQuiz && typeof c.toggleQuizAnswers === "function", label: t("cmd.toggle_quiz_answers", "Show or hide quiz answers"), aliases: ["quiz answers", "show answers", "hide answers", "answer key"], hint: t("cmd.toggle_quiz_answers_hint", "Toggles the answer key on the current quiz (teacher only)"), run: (c) => {
      c.toggleQuizAnswers();
      return t("cmd.toggle_quiz_answers_done", "Quiz answer key toggled.");
    } },
    { id: "toggle_presentation_mode", icon: "\u{1F4FA}", roles: "teacher", when: (c) => !!c.contentLoaded && typeof c.togglePresentationMode === "function", label: t("cmd.toggle_presentation_mode", "Toggle presentation mode"), aliases: ["presentation mode", "present this", "projector mode", "full screen content"], hint: t("cmd.toggle_presentation_mode_hint", "Large-format view of the current content for projecting"), run: (c) => {
      c.togglePresentationMode();
      return t("cmd.toggle_presentation_mode_done", "Presentation mode toggled.");
    } },
    { id: "toggle_side_by_side", icon: "\u{1F4D1}", roles: "all", when: (c) => !!c.contentIsSimplified && typeof c.toggleSideBySide === "function", label: t("cmd.toggle_side_by_side", "Compare with the original"), aliases: ["side by side", "compare original", "original next to adapted"], hint: t("cmd.toggle_side_by_side_hint", "Shows the adapted text next to the original source"), run: (c) => {
      c.toggleSideBySide();
      return t("cmd.toggle_side_by_side_done", "Side-by-side comparison toggled.");
    } },
    { id: "generate_source_text", icon: "\u{1F4C4}", roles: "teacher", when: (c) => typeof c.generateSourceText === "function", label: t("cmd.generate_source_text", "Generate source text on a topic"), aliases: ["generate a source", "write a passage about", "make a reading about", "source text on"], hint: t("cmd.generate_source_text_hint", "Writes an original reading passage on your topic to build resources from"), pendingNarration: t("cmd.generate_source_text_working", "Writing a source passage..."), runAsync: (c, p) => Promise.resolve(c.generateSourceText(p && p.topic ? String(p.topic) : "")).then(() => t("cmd.generate_source_text_ready", "Source passage ready \u2014 you can now generate resources from it.")) },
    { id: "generate_faq", icon: "\u2753", roles: "teacher", when: (c) => !!c.hasSourceOrAnalysis && typeof c.generateFaq === "function", label: t("cmd.generate_faq", "Make an FAQ list"), aliases: ["faq", "frequently asked questions", "question list"], hint: t("cmd.generate_faq_hint", "Generate an FAQ list from the current content"), runAsync: (c) => Promise.resolve(c.generateFaq()).then(() => t("cmd.generate_faq_ready", "FAQ list ready.")) },
    { id: "generate_brainstorm", icon: "\u{1F9E9}", roles: "teacher", when: (c) => !!c.hasSourceOrAnalysis && typeof c.generateBrainstorm === "function", label: t("cmd.generate_brainstorm", "Make a brainstorm web"), aliases: ["brainstorm", "idea web", "mind web", "concept web"], hint: t("cmd.generate_brainstorm_hint", "Generate a brainstorm organizer from the current content"), runAsync: (c) => Promise.resolve(c.generateBrainstorm()).then(() => t("cmd.generate_brainstorm_ready", "Brainstorm web ready.")) },
    { id: "toggle_content_editing", icon: "\u270F\uFE0F", roles: "teacher", when: (c) => typeof c.toggleContentEditing === "function" && !!c.contentLoaded, label: t("cmd.toggle_content_editing", "Edit this content"), aliases: ["edit this", "edit mode", "let me edit", "stop editing"], hint: t("cmd.toggle_content_editing_hint", "Toggles edit mode on whatever is currently on screen"), run: (c) => {
      const kind = c.toggleContentEditing();
      return kind ? t("cmd.toggle_content_editing_done", "Edit mode toggled for the ") + kind + "." : t("cmd.toggle_content_editing_miss", "This view doesn\u2019t have an edit mode.");
    } },
    { id: "start_review_game", icon: "\u{1F3AF}", roles: "all", when: (c) => !!c.contentIsQuiz && typeof c.toggleReviewGame === "function", label: t("cmd.start_review_game", "Play the quiz as a review game"), aliases: ["review game", "quiz game", "game mode"], hint: t("cmd.start_review_game_hint", "Turns the current quiz into a review game"), run: (c) => {
      c.toggleReviewGame();
      return t("cmd.start_review_game_done", "Review game toggled.");
    } },
    { id: "print_page", icon: "\u{1F5A8}\uFE0F", roles: "all", when: () => typeof window !== "undefined" && typeof window.print === "function", label: t("cmd.print_page", "Print this page"), aliases: ["print", "print it", "printer"], hint: t("cmd.print_page_hint", "Opens the browser print dialog for the current page"), run: () => {
      try {
        window.print();
      } catch (_) {
      }
      return t("cmd.print_page_done", "Opening the print dialog.");
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
  return cmds.reduce((visible, command) => {
    if (!_commandAllowsAudience(command, audience)) return visible;
    const availability = getCommandAvailability(command, ctx);
    const decorated = Object.assign({}, command, {
      available: availability.available,
      unavailableReason: availability.reason,
      missingCapabilities: availability.missingCapabilities
    });
    const showUnavailableTeacherCommand = !!opts.includeUnavailable && audience === "teacher" && command.roles === "teacher";
    if (availability.available || opts.includeGated || showUnavailableTeacherCommand) visible.push(decorated);
    return visible;
  }, []);
}
function _throwIfCommandPlanningAborted(signal) {
  if (!signal || !signal.aborted) return;
  const error = new Error("Command planning cancelled.");
  error.name = "AbortError";
  throw error;
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
    { id: "set_grade_level", re: /^(?:set|change|make)\s+(?:the\s+)?(?:grade|grade level|target grade|reading level|level)\s*(?:to|for)?\s*(kindergarten|k|pre[-\s]?k|college|graduate(?: level)?|\d{1,2}(?:st|nd|rd|th)?(?:\s*grade)?)\s*\??$/i, params: (m) => ({ grade: m[1] || null }) },
    { id: "set_source_tone", re: /^(?:set|change|make)\s+(?:the\s+)?(?:source\s+)?tone\s*(?:to)?\s*([a-z -]{3,40})\s*\??$/i, params: (m) => ({ tone: m[1].trim() }) },
    { id: "set_source_length", re: /^(?:set|change|make)\s+(?:the\s+)?(?:source|text|reading|passage)?\s*(?:length|word count)\s*(?:to)?\s*([a-z]+|\d{1,4})(?:\s*words?)?\s*\??$/i, params: (m) => ({ length: m[1] || null }) },
    { id: "set_output_language", re: /^(?:set|change)\s+(?:the\s+)?(?:output|text|reading|lesson|response)\s+language\s*(?:to)?\s+([^?]{2,40})\s*\??$/i, params: (m) => ({ language: m[1].trim() }) },
    { id: "set_output_language", re: /^write\s+(?:this|it|the\s+text|the\s+lesson|resources)?\s*(?:in|into)\s+([^?]{2,40})\s*\??$/i, params: (m) => ({ language: m[1].trim() }) },
    { id: "set_font_size", re: /^(?:set\s+)?(?:the\s+)?(?:text|font)\s*(?:size)?\s*(?:to)?\s*(\d{1,2})\s*\.?$/i, params: (m) => ({ size: m[1] }) },
    { id: "translate_document", re: /^translate\s+(?:this|the\s+document|document|it)?\s*(?:to|into)\s+([a-z\u00C0-\u024F\s()-]{2,40})\??$/i, params: (m) => ({ language: m[1].trim() }) },
    { id: "generate_simplified", re: /^(?:simplify|make (?:this|it) (?:easier|simpler)|lower the (?:reading )?level)(?:\s+(?:this|it))?(?:\s+(?:to|for)?\s*(?:grade\s+)?(\d{1,2})(?:st|nd|rd|th)?(?:\s+grade)?)?\s*\??$/i, params: (m) => ({ grade: m[1] || null }) },
    { id: "send_teacher_signal", re: /^(?:tell|signal|let)\s+(?:my\s+)?teacher\s+(?:that\s+)?(?:i(?:'m| am)\s+)?(stuck|confused|ready|done)\s*\??$/i, params: (m) => ({ signal: m[1] }) },
    { id: "send_teacher_signal", re: /^(?:ask|tell)\s+(?:my\s+)?teacher\s+to\s+(slow down|repeat(?: that)?|say that again)\s*\??$/i, params: (m) => ({ signal: m[1] }) }
  ];
  let commands = buildAlloCommands(ctx);
  if (opts.preview) commands = commands.filter((c) => !c.chatSkip);
  const _runCmd = (cmd, via, params) => {
    const safeParams = sanitizeCommandParams(cmd, params || {});
    if (opts.preview) return { handled: false, preview: true, commandId: cmd.id, label: cmd.label, params: safeParams, via, destructive: !!cmd.destructive, confirmation: cmd.destructive ? _commandConfirmationText(cmd, ctx, t) : "" };
    return executeCommand(ctx, cmd, safeParams, { confirmed: !!opts.confirmed, via });
  };
  for (const g of _grammars) {
    const m = text.match(g.re);
    if (m) {
      const cmd = commands.find((c) => c.id === g.id);
      if (opts.preview && cmd && _deferToPlanner(cmd, text)) return null;
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
  if (opts.preview && bestScore >= 60 && _deferToPlanner(best, text)) return null;
  if (bestScore >= 60 && (!opts.preview || bestScore >= 80 && text.length >= 3)) return _runCmd(best, "deterministic");
  if (!opts.allowAi || typeof ctx.callGemini !== "function") return null;
  if (text.split(/\s+/).length > 14) return null;
  try {
    _throwIfCommandPlanningAborted(opts.signal);
    const menu = commands.map((c) => {
      const contract = getCommandContract(c);
      const notes = contract.params.length ? " [params " + contract.params.join(", ") + "]" : "";
      return c.id + ": " + c.label + (c.aliases && c.aliases.length ? " (" + c.aliases.slice(0, 3).join(", ") + ")" : "") + notes;
    }).join("\n");
    const out = await ctx.callGemini(_intentContextBrief(ctx) + "A user typed a request to an education app's assistant. If it clearly maps to ONE of these app commands, return it; otherwise commandId must be null. Commands:\n" + menu + '\n\nUser: "' + text.replace(/"/g, "'") + '"\n\nReturn ONLY JSON: {"commandId": string | null, "params": object, "confidence": number between 0 and 1}. params carries values the user stated (e.g. {"topic": "photosynthesis", "grade": "5"} or {"size": "20"} or {"language": "Vietnamese"}) \u2014 empty object if none. Use null commandId unless you are confident they want the APP ACTION (not a content question).', false, false, null, null, opts.signal || null);
    _throwIfCommandPlanningAborted(opts.signal);
    const m = String(out || "").match(/\{[\s\S]*\}/);
    const j = JSON.parse(m ? m[0] : String(out));
    if (j && j.commandId && typeof j.confidence === "number" && j.confidence >= 0.7) {
      const cmd = commands.find((c) => c.id === j.commandId);
      if (opts.preview && cmd && _deferToPlanner(cmd, text)) return null;
      if (cmd) return _runCmd(cmd, "ai", j.params || {});
    }
  } catch (error) {
    if (error && error.name === "AbortError") throw error;
  }
  return null;
}
function _commandConfirmationText(command, ctx, t) {
  if (command && typeof command.confirmMessage === "function") {
    try {
      const message = command.confirmMessage(ctx || {});
      if (message) return String(message);
    } catch (_) {
    }
  }
  if (command && command.confirmMessage) return String(command.confirmMessage);
  return t("palette.confirm", "Press Enter again to confirm.");
}
function _emitCommandLifecycle(ctx, command, status, narration, via, notifyUser, metadata) {
  const detail = Object.assign({ commandId: command && command.id, label: command && command.label, status, narration: narration || "", via: via || "confirm", at: Date.now() }, metadata || {});
  try {
    if (ctx && typeof ctx.onCommandState === "function") ctx.onCommandState(detail);
  } catch (_) {
  }
  try {
    if (typeof window !== "undefined" && window.dispatchEvent && window.CustomEvent) window.dispatchEvent(new window.CustomEvent("alloflow:command-state", { detail }));
  } catch (_) {
  }
  if (!notifyUser || !narration || status === "pending") return detail;
  try {
    if (typeof window !== "undefined" && window.alloAnnounce) window.alloAnnounce(narration, status === "error" ? "assertive" : "polite");
  } catch (_) {
  }
  if (status === "error") {
    try {
      if (ctx && ctx.addToast) ctx.addToast(narration, "error");
    } catch (_) {
    }
  }
  return detail;
}
const _activeAsyncCommands = /* @__PURE__ */ new Map();
function _commandExecutionKey(ctx, command) {
  return getCommandAudience(ctx || {}) + ":" + String(command && command.id || "");
}
function _watchCommandStop(ctx, command, entry, shouldStop) {
  if (!entry || typeof shouldStop !== "function") return null;
  let timerId = null;
  const clear = () => {
    const activeTimerId = timerId;
    if (activeTimerId != null) {
      clearInterval(activeTimerId);
      timerId = null;
    }
    if (entry.stopPollId === activeTimerId) entry.stopPollId = null;
  };
  const poll = () => {
    let wanted = false;
    try {
      wanted = !!shouldStop();
    } catch (_) {
    }
    if (!wanted || entry.cancelled) {
      if (entry.cancelled) clear();
      return;
    }
    cancelCommand(ctx, command.id, { startedAt: entry.startedAt });
    clear();
  };
  poll();
  if (entry.cancelled) return null;
  timerId = setInterval(poll, 50);
  return timerId;
}
function _awaitCommandCompletion(completion, timeoutMs, t, command, via) {
  let timerId = null;
  const timer = new Promise((resolve) => {
    timerId = setTimeout(() => resolve({ __alloTimeout: true }), timeoutMs || 18e4);
  });
  const clearTimer = () => {
    if (timerId != null) {
      clearTimeout(timerId);
      timerId = null;
    }
  };
  return Promise.race([completion, timer]).then((result) => {
    clearTimer();
    if (result && result.__alloTimeout) return { handled: true, ok: true, timedOut: true, narration: t("router.still_working", "Still working - it will finish in the background."), commandId: command.id, via };
    return result;
  });
}
function executeCommand(ctx, commandOrId, params, opts = {}) {
  const t = _mkT(ctx && ctx.t);
  const id = String(commandOrId && typeof commandOrId === "object" ? commandOrId.id : commandOrId || "");
  const commands = buildAlloCommands(ctx);
  const cmd = commands.find((c) => c.id === id);
  if (!cmd) return null;
  if (cmd.destructive && !opts.confirmed) return { handled: true, narration: _commandConfirmationText(cmd, ctx, t), commandId: cmd.id, via: "confirm", confirmationRequired: true };
  const safeParams = sanitizeCommandParams(cmd, params || {});
  const via = opts.via || "confirm";
  const stopRequested = typeof opts.shouldStop === "function" ? opts.shouldStop : null;
  if (cmd.opensPanel && ctx && typeof ctx.closeOtherPanels === "function") {
    try {
      ctx.closeOtherPanels(cmd.opensPanel);
    } catch (_) {
    }
  }
  if (typeof cmd.runAsync === "function") {
    const executionKey = _commandExecutionKey(ctx, cmd);
    const active = _activeAsyncCommands.get(executionKey);
    if (active) {
      const shared = { handled: true, ok: true, pending: true, deduplicated: true, narration: active.pendingNarration, commandId: cmd.id, via, completion: active.completion, startedAt: active.startedAt, cancellable: true };
      if (opts.awaitCompletion) {
        const stopPollId = _watchCommandStop(ctx, cmd, active, stopRequested);
        return _awaitCommandCompletion(active.completion, opts.timeoutMs || 18e4, t, cmd, via).then((result) => {
          if (stopPollId != null) clearInterval(stopPollId);
          return result;
        });
      }
      return shared;
    }
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const pendingNarration = cmd.pendingNarration || t("cmd.working", "Working...");
    const startedAt = Date.now();
    let entry = null;
    const commandCtx = Object.assign({}, ctx || {});
    commandCtx.isCommandCancelled = () => !!(entry && entry.cancelled);
    if (controller) {
      commandCtx.signal = controller.signal;
      commandCtx.abortSignal = controller.signal;
    }
    let action;
    try {
      action = Promise.resolve(cmd.runAsync(commandCtx, safeParams, { signal: controller ? controller.signal : null, commandId: cmd.id, startedAt }));
    } catch (error) {
      const narration = t("router.failed", "That did not work: ") + (error && error.message || "unknown");
      _emitCommandLifecycle(ctx, cmd, "error", narration, via, !opts.awaitCompletion, { params: safeParams, retryable: true });
      const failed = { handled: true, ok: false, narration, commandId: cmd.id, via };
      return opts.awaitCompletion ? Promise.resolve(failed) : failed;
    }
    _emitCommandLifecycle(ctx, cmd, "pending", pendingNarration, via, false, { params: safeParams, startedAt, retryable: false, cancellable: true });
    const cancelledResult = () => ({ handled: true, ok: false, cancelled: true, narration: t("cmd.cancelled", "Cancellation requested. The current operation will stop when its provider honors it."), commandId: cmd.id, via, startedAt });
    const completion = action.then((message) => {
      if (entry && entry.cancelled) return cancelledResult();
      const narration = message || t("router.done", "Done.");
      _recordCommandUse(cmd.id);
      _emitCommandLifecycle(ctx, cmd, "success", narration, via, !opts.awaitCompletion, { params: safeParams, startedAt, retryable: false, cancellable: false });
      return { handled: true, ok: true, narration, commandId: cmd.id, via, startedAt };
    }).catch((error) => {
      if (entry && entry.cancelled) return cancelledResult();
      const narration = t("router.failed", "That did not work: ") + (error && error.message || "unknown");
      _emitCommandLifecycle(ctx, cmd, "error", narration, via, !opts.awaitCompletion, { params: safeParams, startedAt, retryable: true, cancellable: false });
      return { handled: true, ok: false, narration, commandId: cmd.id, via, startedAt };
    }).finally(() => {
      if (entry && entry.stopPollId != null) {
        clearInterval(entry.stopPollId);
        entry.stopPollId = null;
      }
      if (_activeAsyncCommands.get(executionKey) === entry) _activeAsyncCommands.delete(executionKey);
    });
    entry = { command: cmd, completion, pendingNarration, startedAt, params: safeParams, via, controller, cancelled: false, stopPollId: null };
    _activeAsyncCommands.set(executionKey, entry);
    if (stopRequested) entry.stopPollId = _watchCommandStop(ctx, cmd, entry, stopRequested);
    if (!opts.awaitCompletion) return { handled: true, ok: true, pending: true, narration: pendingNarration, commandId: cmd.id, via, completion, startedAt, cancellable: true };
    return _awaitCommandCompletion(completion, opts.timeoutMs || 18e4, t, cmd, via).then((result) => {
      if (result && result.timedOut && entry && entry.stopPollId != null) {
        clearInterval(entry.stopPollId);
        entry.stopPollId = null;
      }
      return result;
    });
  }
  try {
    const message = cmd.run(ctx, safeParams);
    _recordCommandUse(cmd.id);
    return { handled: true, narration: message || t("router.done", "Done."), commandId: cmd.id, via };
  } catch (error) {
    return { handled: true, ok: false, narration: t("router.failed", "That did not work: ") + (error && error.message || "unknown"), commandId: cmd.id, via };
  }
}
function cancelCommand(ctx, commandOrId, opts = {}) {
  const t = _mkT(ctx && ctx.t);
  const id = String(commandOrId && typeof commandOrId === "object" ? commandOrId.id : commandOrId || "");
  if (!id) return { handled: false, commandId: id };
  const executionKey = getCommandAudience(ctx || {}) + ":" + id;
  const active = _activeAsyncCommands.get(executionKey);
  const visibleCommand = buildAlloCommands(ctx).find((c) => c.id === id);
  const cmd = active && active.command || visibleCommand;
  if (!cmd || typeof cmd.runAsync !== "function") return { handled: false, commandId: id };
  if (!active || opts.startedAt != null && String(active.startedAt) !== String(opts.startedAt)) return { handled: false, commandId: cmd.id };
  if (active.cancelled) return { handled: true, ok: false, cancelled: true, commandId: cmd.id, completion: active.completion };
  active.cancelled = true;
  if (active.controller) {
    try {
      active.controller.abort();
    } catch (_) {
    }
  }
  const narration = t("cmd.cancelled", "Cancellation requested. The current operation will stop when its provider honors it.");
  _emitCommandLifecycle(ctx, cmd, "cancelled", narration, active.via, true, { params: active.params, startedAt: active.startedAt, retryable: false, cancellable: false, cancelled: true });
  return { handled: true, ok: false, cancelled: true, narration, commandId: cmd.id, via: active.via, completion: active.completion, startedAt: active.startedAt };
}
function runCommandById(ctx, id, params, opts = {}) {
  return executeCommand(ctx, id, params, opts);
}
function _intentRecentCommandIds(limit) {
  try {
    const usage = _readCommandUsage();
    return Object.keys(usage).sort((a, b) => (Number(usage[b] && usage[b].lastUsed) || 0) - (Number(usage[a] && usage[a].lastUsed) || 0)).slice(0, limit || 4);
  } catch (_) {
    return [];
  }
}
function _intentContextBrief(ctx) {
  if (!ctx) return "";
  const lines = [];
  const add = (label, value) => {
    if (value) lines.push(label + ": " + String(value).slice(0, 120));
  };
  try {
    add("Audience", getCommandAudience(ctx));
    const surfaces = [];
    if (ctx.educatorHubOpen) surfaces.push("Educator Hub");
    if (ctx.learningHubOpen) surfaces.push("Learning Hub");
    if (ctx.stemLabOpen) surfaces.push("STEAM Lab" + (ctx.stemLabTool ? " (" + ctx.stemLabTool + ")" : ""));
    if (ctx.symbolStudioOpen) surfaces.push("Symbol Studio");
    if (ctx.behaviorLensOpen) surfaces.push("Behavior Lens");
    if (ctx.pipelineOpen) surfaces.push(ctx.pipelineFixRunning ? "PDF remediation (fixing now)" : "PDF remediation");
    add("Open right now", surfaces.join(", "));
    add("Content loaded", ctx.contentLoaded ? ctx.contentIsGlossary ? "a glossary" : "yes" : "none yet");
    if (ctx.zenActive) add("Display", "zen mode");
    if (ctx.focusActive) add("Display", "focus mode");
    add("Recently ran", _intentRecentCommandIds(4).join(", "));
  } catch (_) {
  }
  if (!lines.length) return "";
  return 'Here is what the user is doing right now. Prefer commands that fit this state, and read vague references like "this" or "here" against it.\n' + lines.join("\n") + "\n\n";
}
function _looksLikeGoal(rawText) {
  const text = String(rawText || "").trim().toLowerCase();
  if (text.length < 10) return false;
  if (!/\b(make|create|build|plan|prepare|prep|design|put together|set up|generate|get me ready)\b/.test(text)) return false;
  if (/\b(comprehensive|complete|full|whole|entire|thorough|everything)\b/.test(text)) return true;
  return /\b(unit|materials|resources|pack|packet|activity set|lesson plans)\b/.test(text);
}
const _INTENT_SEED_COMMANDS = ["create_lesson", "generate_source_text", "generate_outline", "generate_analysis"];
function _deferToPlanner(cmd, text) {
  if (!cmd || !cmd.id) return false;
  if (_INTENT_SEED_COMMANDS.indexOf(cmd.id) < 0) return false;
  return _looksLikeGoal(text);
}
function looksMultiStep(rawText) {
  const text = String(rawText || "").trim();
  if (text.length < 12) return false;
  if (_looksLikeGoal(text)) return true;
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
    _throwIfCommandPlanningAborted(opts.signal);
    const out = await ctx.callGemini(_intentContextBrief(ctx) + "A teacher asked an education app's assistant to do a multi-step task. Break it into an ORDERED list of app commands chosen ONLY from this menu:\n" + menu + '\n\nTask: "' + text.replace(/"/g, "'") + '"\n\nReturn ONLY JSON: {"steps": [{"commandId": string, "params": object, "why": string}], "confidence": number between 0 and 1}. Use 2 to 6 steps. A command with requirements may appear only when the current app state already satisfies them or an EARLIER command explicitly says it produces them. Navigation and guided wizards do not produce content unless their contract says so. A command marked [must be final] cannot have later steps. params carries only values the user stated, using the named params in the menu; use {} if none. "why" is a short phrase. Return {"steps": [], "confidence": 0} unless the task CLEARLY maps to a sequence of these app actions (not a content question).', false, false, null, null, opts.signal || null);
    _throwIfCommandPlanningAborted(opts.signal);
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
    return report.ok ? report.items.map((item) => ({ commandId: item.commandId, params: item.params, why: item.why })) : null;
  } catch (error) {
    if (error && error.name === "AbortError") throw error;
    return null;
  }
}
async function runPlan(ctxOrGet, steps, opts = {}) {
  const getCtx = typeof ctxOrGet === "function" ? ctxOrGet : () => ctxOrGet;
  const t = _mkT((getCtx() || {}).t);
  const list = (Array.isArray(steps) ? steps : []).slice(0, 6);
  const results = [];
  if (!opts.keepPanels) {
    try {
      const _stageCtx = getCtx();
      if (_stageCtx && typeof _stageCtx.closeOtherPanels === "function") _stageCtx.closeOtherPanels(opts.keepPanel || null);
    } catch (_) {
    }
  }
  const stopRequested = opts.signal || typeof opts.shouldStop === "function" ? () => {
    if (opts.signal && opts.signal.aborted) return true;
    if (typeof opts.shouldStop !== "function") return false;
    try {
      return !!opts.shouldStop();
    } catch (_) {
      return false;
    }
  } : null;
  if (!list.length) return { ok: false, failedStep: 0, results, remainingSteps: [], reason: t("plan.empty", "There were no steps to run.") };
  for (let i = 0; i < list.length; i++) {
    if (stopRequested && stopRequested()) return { ok: false, stopped: true, failedStep: i, results, remainingSteps: list.slice(i), reason: t("plan.stopped", "Stopped before step ") + (i + 1) + "." };
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
      r = await runCommandById(ctx, s.commandId, s.params || {}, { confirmed: true, awaitCompletion: true, via: "plan", timeoutMs: opts.timeoutMs, shouldStop: stopRequested });
    } catch (e) {
      r = { handled: false, narration: e && e.message || "unknown" };
    }
    results.push(r);
    if (!r || !r.handled || r.ok === false) {
      const cancelled = !!(r && r.cancelled);
      return { ok: false, stopped: cancelled, cancelled, failedStep: i, results, remainingSteps: list.slice(i), reason: cancelled ? t("plan.stopped", "Stopped before step ") + (i + 1) + "." : r && r.narration || t("plan.step_failed", "That step didn\u2019t work.") };
    }
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
var MODEL_NS = "model_cache";
var MODEL_POLICY_KEY = "allo_model_downloads";
var MODEL_CHUNK_BYTES = 6 * 1024 * 1024;
var DEVICE_STORAGE_URL = "https://alloflow-cdn.pages.dev/allo_device_storage_module.js?v=ds3-storage-manager";
var WHISPER_BASE = "https://huggingface.co/Xenova/whisper-tiny.en/resolve/main/";
var WHISPER_FILES = [
  WHISPER_BASE + "config.json",
  WHISPER_BASE + "generation_config.json",
  WHISPER_BASE + "preprocessor_config.json",
  WHISPER_BASE + "tokenizer.json",
  WHISPER_BASE + "tokenizer_config.json",
  WHISPER_BASE + "onnx/encoder_model_quantized.onnx",
  WHISPER_BASE + "onnx/decoder_model_merged_quantized.onnx"
];
function _modelPolicy() {
  try {
    var v = localStorage.getItem(MODEL_POLICY_KEY);
    return v === "auto" || v === "off" ? v : "ask";
  } catch (_) {
    return "ask";
  }
}
function _deviceStorage() {
  if (window.alloDeviceStorage) {
    var ds0 = window.alloDeviceStorage;
    return Promise.resolve(ds0.ready()).then(function() {
      return ds0;
    });
  }
  if (!window.__alloDeviceStoragePromise) {
    window.__alloDeviceStoragePromise = new Promise(function(resolve, reject) {
      var s = document.createElement("script");
      s.src = DEVICE_STORAGE_URL;
      var settled = false;
      var finish = function(fn, arg) {
        if (settled) return;
        settled = true;
        fn(arg);
      };
      setTimeout(function() {
        finish(reject, new Error("Device storage module timed out."));
      }, 15e3);
      s.onload = function() {
        finish(resolve, window.alloDeviceStorage);
      };
      s.onerror = function() {
        finish(reject, new Error("Device storage module failed to load."));
      };
      document.head.appendChild(s);
    });
    window.__alloDeviceStoragePromise.catch(function() {
      window.__alloDeviceStoragePromise = null;
    });
  }
  return Promise.resolve(window.__alloDeviceStoragePromise).then(function(ds) {
    if (!ds || typeof ds.ready !== "function") throw new Error("Device storage is unavailable.");
    return Promise.resolve(ds.ready()).then(function() {
      return ds;
    });
  });
}
async function _mcStoreBuffer(url, buf, contentType) {
  var ds = await _deviceStorage();
  var chunks = Math.max(1, Math.ceil(buf.byteLength / MODEL_CHUNK_BYTES));
  for (var i = 0; i < chunks; i++) {
    await ds.set(MODEL_NS, "c:" + i + ":" + url, buf.slice(i * MODEL_CHUNK_BYTES, (i + 1) * MODEL_CHUNK_BYTES));
  }
  await ds.set(MODEL_NS, "u:" + url, { bytes: buf.byteLength, chunks, contentType: contentType || "application/octet-stream", storedAt: (/* @__PURE__ */ new Date()).toISOString() });
  return buf.byteLength;
}
async function _mcFetchInto(url, onProgress) {
  var res = await fetch(url);
  if (!res.ok) {
    var httpErr = new Error("HTTP " + res.status + " for " + url);
    httpErr.status = res.status;
    throw httpErr;
  }
  var buf = await res.arrayBuffer();
  var bytes = await _mcStoreBuffer(url, buf, res.headers.get("content-type"));
  if (onProgress) {
    try {
      onProgress(url, bytes);
    } catch (_) {
    }
  }
  return bytes;
}
async function _mcMatch(url) {
  try {
    var ds = await _deviceStorage();
    var meta = await ds.get(MODEL_NS, "u:" + url);
    if (!meta || !meta.chunks) return null;
    var parts = [], total = 0;
    for (var i = 0; i < meta.chunks; i++) {
      var part = await ds.get(MODEL_NS, "c:" + i + ":" + url);
      if (part == null) return null;
      var view = part instanceof ArrayBuffer ? new Uint8Array(part) : new Uint8Array(part.buffer || part);
      parts.push(view);
      total += view.byteLength;
    }
    var merged = new Uint8Array(total);
    var offset = 0;
    for (var j = 0; j < parts.length; j++) {
      merged.set(parts[j], offset);
      offset += parts[j].byteLength;
    }
    return new Response(merged, { status: 200, headers: { "content-type": meta.contentType || "application/octet-stream" } });
  } catch (_) {
    return null;
  }
}
var modelCache = {
  policy: _modelPolicy,
  setPolicy: function(v) {
    var next = v === "auto" || v === "off" ? v : "ask";
    try {
      localStorage.setItem(MODEL_POLICY_KEY, next);
    } catch (_) {
    }
    return next;
  },
  // "Downloaded" = the big decoder is present; configs alone don't count.
  hasWhisper: async function() {
    try {
      var ds = await _deviceStorage();
      return !!await ds.get(MODEL_NS, "u:" + WHISPER_FILES[WHISPER_FILES.length - 1]);
    } catch (_) {
      return false;
    }
  },
  prefetchWhisper: async function(onProgress) {
    var bytes = 0, files = 0;
    for (var i = 0; i < WHISPER_FILES.length; i++) {
      try {
        bytes += await _mcFetchInto(WHISPER_FILES[i], onProgress);
        files++;
      } catch (e) {
        if (!(e && (e.status === 404 || e.status === 403))) throw e;
      }
    }
    if (!files) throw new Error("No model files could be downloaded \u2014 check the connection.");
    return { files, bytes };
  },
  match: _mcMatch,
  // Public store, used by the Kokoro worker proxy: the voice model is fetched
  // INSIDE a Web Worker (which cannot reach the device-storage bridge), so the
  // worker relays bytes here and reads them back through match().
  put: function(url, buf, contentType) {
    return _mcStoreBuffer(url, buf, contentType);
  },
  // Is anything cached whose URL contains this fragment? Used for model
  // presence checks without hardcoding a file list we do not control.
  hasUrlLike: async function(fragment) {
    try {
      var ds = await _deviceStorage();
      var keys = await ds.list(MODEL_NS);
      var needle = String(fragment || "").toLowerCase();
      if (!needle || !Array.isArray(keys)) return false;
      for (var i = 0; i < keys.length; i++) {
        var k = String(keys[i] || "");
        if (k.indexOf("u:") === 0 && k.toLowerCase().indexOf(needle) >= 0) return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  },
  // Kokoro's file set is decided by kokoro-js, not by us, so presence is
  // detected rather than enumerated.
  hasKokoro: function() {
    return modelCache.hasUrlLike("kokoro");
  },
  // Approximate on-device size of the model cache, for the storage manager.
  cachedBytes: async function() {
    try {
      var ds = await _deviceStorage();
      var rows = await ds.getAll(MODEL_NS);
      var total = 0;
      (rows || []).forEach(function(r) {
        var v = r && r.value;
        if (v && typeof v.bytes === "number") total += v.bytes;
      });
      return total;
    } catch (_) {
      return 0;
    }
  },
  clear: async function() {
    var ds = await _deviceStorage();
    return ds.clearNamespace(MODEL_NS);
  },
  // Point transformers.js at this cache instead of the (partitioned,
  // unreliable-in-Canvas) HTTP cache. Cache-API-shaped adapter.
  installTransformersCache: function(env) {
    if (!env) return false;
    env.useBrowserCache = false;
    env.useCustomCache = true;
    env.customCache = {
      match: function(req) {
        return _mcMatch(typeof req === "string" ? req : req && req.url);
      },
      put: async function(req, response) {
        try {
          var url = typeof req === "string" ? req : req && req.url;
          if (!url || !response) return;
          var buf = await response.clone().arrayBuffer();
          await _mcStoreBuffer(url, buf, response.headers && response.headers.get ? response.headers.get("content-type") : null);
        } catch (_) {
        }
      }
    };
    return true;
  }
};
function downsampleAudio(input, fromRate, toRate) {
  toRate = toRate || 16e3;
  if (!input || !input.length || !fromRate || fromRate === toRate || fromRate < toRate) return input || new Float32Array(0);
  var ratio = fromRate / toRate;
  var outLen = Math.floor(input.length / ratio);
  var out = new Float32Array(outLen);
  for (var i = 0; i < outLen; i++) {
    var pos = i * ratio;
    var i0 = Math.floor(pos);
    var i1 = Math.min(input.length - 1, i0 + 1);
    var frac = pos - i0;
    out[i] = input[i0] * (1 - frac) + input[i1] * frac;
  }
  return out;
}
var WAKE_RE = /\b(?:hey|hi|ok|okay)?[,\s]*allo(?:bot|flow)?\b[,.!?:;]*\s*/i;
function detectWakeCommand(text) {
  var s = String(text || "");
  var m = WAKE_RE.exec(s);
  if (!m) return { woke: false, command: "" };
  return { woke: true, command: s.slice(m.index + m[0].length).trim() };
}
function createBargeDetector(opts) {
  opts = opts || {};
  var rmsThreshold = opts.rmsThreshold == null ? 0.045 : opts.rmsThreshold;
  var sustainMs = opts.sustainMs == null ? 260 : opts.sustainMs;
  var graceMs = opts.graceMs == null ? 350 : opts.graceMs;
  var voicedMs = 0, elapsedMs = 0, fired = false;
  return {
    reset: function() {
      voicedMs = 0;
      elapsedMs = 0;
      fired = false;
    },
    elapsed: function() {
      return elapsedMs;
    },
    // True exactly ONCE, when speech-level energy has been sustained past the
    // grace window. Grace exists because the tail of the user's OWN sentence
    // is often still in the room as the reply begins, and cutting on that
    // would make the bot look broken. Sustain exists so a cough, a door, or a
    // keyboard clack cannot chop a reply in half.
    push: function(rms, dtMs) {
      var dt = Math.max(0, Number(dtMs) || 0);
      elapsedMs += dt;
      if (fired || elapsedMs <= graceMs) return false;
      if (!(Number(rms) >= rmsThreshold)) {
        voicedMs = 0;
        return false;
      }
      voicedMs += dt;
      if (voicedMs < sustainMs) return false;
      fired = true;
      return true;
    }
  };
}
function createVadSegmenter(opts) {
  opts = opts || {};
  var sampleRate = opts.sampleRate || 48e3;
  var threshold = opts.threshold || 0.01;
  var minSpeechMs = opts.minSpeechMs || 250;
  var silenceMs = opts.silenceMs || 700;
  var maxMs = opts.maxMs || 1e4;
  var preRollMs = opts.preRollMs || 240;
  var buf = [], bufSamples = 0, speech = false, silentSamples = 0, speechSamples = 0;
  var preRoll = [], preRollSamples = 0;
  function msToSamples(ms) {
    return Math.round(sampleRate * ms / 1e3);
  }
  function reset() {
    buf = [];
    bufSamples = 0;
    speech = false;
    silentSamples = 0;
    speechSamples = 0;
    preRoll = [];
    preRollSamples = 0;
  }
  function push(frame) {
    if (!frame || !frame.length) return null;
    var sum = 0;
    for (var i = 0; i < frame.length; i++) sum += frame[i] * frame[i];
    var voiced = Math.sqrt(sum / frame.length) >= threshold;
    if (!speech) {
      preRoll.push(frame.slice(0));
      preRollSamples += frame.length;
      while (preRollSamples > msToSamples(preRollMs) && preRoll.length > 1) preRollSamples -= preRoll.shift().length;
      if (voiced) {
        speech = true;
        buf = preRoll.slice();
        bufSamples = preRollSamples;
        speechSamples = frame.length;
        silentSamples = 0;
        preRoll = [];
        preRollSamples = 0;
      }
      return null;
    }
    buf.push(frame.slice(0));
    bufSamples += frame.length;
    if (voiced) {
      speechSamples += frame.length;
      silentSamples = 0;
    } else silentSamples += frame.length;
    if (silentSamples < msToSamples(silenceMs) && bufSamples < msToSamples(maxMs)) return null;
    var out = null;
    if (speechSamples >= msToSamples(minSpeechMs)) {
      out = new Float32Array(bufSamples);
      var off = 0;
      for (var j = 0; j < buf.length; j++) {
        out.set(buf[j], off);
        off += buf[j].length;
      }
    }
    reset();
    return out;
  }
  return { push, reset };
}
var TRANSFORMERS_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.1";
var _whisperPipelinePromise = null;
function _getWhisperPipeline() {
  if (!_whisperPipelinePromise) {
    _whisperPipelinePromise = import(TRANSFORMERS_URL).then(function(T) {
      modelCache.installTransformersCache(T.env);
      return T.pipeline("automatic-speech-recognition", "Xenova/whisper-tiny.en", { device: "wasm", dtype: "q8" });
    }).catch(function(e) {
      _whisperPipelinePromise = null;
      throw e;
    });
  }
  return _whisperPipelinePromise;
}
function _voiceStandbyPref() {
  try {
    return localStorage.getItem("allo_voice_standby") === "on";
  } catch (_) {
    return false;
  }
}
function _voiceEnginePref() {
  try {
    return localStorage.getItem("allo_voice_engine") === "webspeech" ? "webspeech" : "auto";
  } catch (_) {
    return "auto";
  }
}
var NAV_READING_RE = /\b(?:book|books|reading|readings|story|stories|article|articles|source|sources|text|texts|passage|poem|video)s?\b/i;
var NAV_INTENT_RE = /^(?:where(?:'s| is| are| do i find| can i find)?|show me where|how do i (?:find|open|get to))\s+(?:the\s+|my\s+|a\s+|is\s+|are\s+)?(.{2,60}?)[?.!\s]*$/i;
function detectNavigationIntent(text) {
  var s = String(text || "").trim();
  if (!s) return { isNav: false, target: "" };
  var m = NAV_INTENT_RE.exec(s);
  if (!m) return { isNav: false, target: "" };
  var target = m[1].trim();
  if (!target || NAV_READING_RE.test(target)) return { isNav: false, target: "" };
  return { isNav: true, target };
}
function createVoiceLoop(getCtx) {
  let rec = null, active = false, errStreak = 0, routeController = null, routeSerial = 0, pageHideHandler = null;
  let whisperState = null, engineName = "webspeech", standby = false, awake = false, awakeTimer = null;
  let paused = false;
  const cancelRoute = () => {
    routeSerial++;
    const controller = routeController;
    routeController = null;
    if (controller) {
      try {
        controller.abort();
      } catch (_) {
      }
    }
  };
  let speaking = false, speakSerial = 0, replyAudio = null;
  let lastSpeechAt = 0, userSpeaking = false, pendingReply = null, pendingTimer = null;
  const QUIET_MS = 800;
  const HOLD_MAX_MS = 8e3;
  const noteUserSpeech = (talking) => {
    lastSpeechAt = Date.now();
    userSpeaking = !!talking;
  };
  const noteUserTurnEnd = () => {
    userSpeaking = false;
    lastSpeechAt = 0;
  };
  const userIsBusy = () => userSpeaking || lastSpeechAt > 0 && Date.now() - lastSpeechAt < QUIET_MS;
  const clearPendingReply = () => {
    pendingReply = null;
    if (pendingTimer) {
      try {
        clearInterval(pendingTimer);
      } catch (_) {
      }
      pendingTimer = null;
    }
  };
  let bargeStream = null, bargeAudioCtx = null, bargeTimer = null, activeResume = null;
  const stopBargeWatch = () => {
    if (bargeTimer) {
      try {
        clearTimeout(bargeTimer);
      } catch (_) {
      }
      bargeTimer = null;
    }
    if (bargeStream) {
      try {
        bargeStream.getTracks().forEach((tr) => tr.stop());
      } catch (_) {
      }
      bargeStream = null;
    }
    if (bargeAudioCtx) {
      try {
        bargeAudioCtx.close();
      } catch (_) {
      }
      bargeAudioCtx = null;
    }
  };
  const cutReply = () => {
    if (!speaking) return;
    try {
      if (replyAudio) replyAudio.pause();
    } catch (_) {
    }
    try {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    } catch (_) {
    }
    noteUserSpeech(true);
    const resumeNow = activeResume;
    stopBargeWatch();
    if (resumeNow) resumeNow();
  };
  const startBargeWatch = () => {
    stopBargeWatch();
    const nav = typeof navigator !== "undefined" ? navigator : null;
    const Ctx = typeof window !== "undefined" ? window.AudioContext || window.webkitAudioContext : null;
    if (!nav || !nav.mediaDevices || typeof nav.mediaDevices.getUserMedia !== "function" || !Ctx) return;
    const detector = createBargeDetector({});
    nav.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).then(function(stream) {
      if (!speaking) {
        try {
          stream.getTracks().forEach((tr) => tr.stop());
        } catch (_) {
        }
        return;
      }
      bargeStream = stream;
      bargeAudioCtx = new Ctx();
      const analyser = bargeAudioCtx.createAnalyser();
      analyser.fftSize = 1024;
      bargeAudioCtx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Float32Array(analyser.fftSize);
      let last = Date.now();
      const tick = function() {
        if (!speaking) {
          stopBargeWatch();
          return;
        }
        analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const now = Date.now();
        const hit = detector.push(Math.sqrt(sum / buf.length), now - last);
        last = now;
        if (hit) {
          cutReply();
          return;
        }
        bargeTimer = setTimeout(tick, 50);
      };
      bargeTimer = setTimeout(tick, 50);
    }).catch(function() {
    });
  };
  const speakReply = (msg, c) => {
    if (!c || c.voiceSpeakReplies === false) return;
    if (userIsBusy()) {
      pendingReply = { msg, c, queuedAt: Date.now() };
      if (!pendingTimer) pendingTimer = setInterval(flushPendingReply, 250);
      return;
    }
    speakNow(msg, c);
  };
  const flushPendingReply = () => {
    if (!pendingReply || !active) {
      clearPendingReply();
      return;
    }
    if (Date.now() - pendingReply.queuedAt >= HOLD_MAX_MS) {
      clearPendingReply();
      return;
    }
    if (userIsBusy()) return;
    const held = pendingReply;
    clearPendingReply();
    speakNow(held.msg, held.c);
  };
  const speakNow = (msg, c) => {
    const my = ++speakSerial;
    const text = String(msg || "").slice(0, 300);
    const resume2 = () => {
      if (speakSerial !== my || !speaking) return;
      speaking = false;
      stopBargeWatch();
      if (active && rec) {
        try {
          rec.start();
        } catch (_) {
        }
      }
    };
    try {
      if (window._kokoroTTS && window._kokoroTTS.ready && typeof window._kokoroTTS.speak === "function") {
        const sel = c && c.selectedVoice;
        const kv = typeof sel === "string" && (sel.indexOf("af_") === 0 || sel.indexOf("am_") === 0) ? sel : "af_heart";
        if (replyAudio) {
          try {
            replyAudio.pause();
          } catch (_) {
          }
          replyAudio = null;
        }
        speaking = true;
        activeResume = resume2;
        startBargeWatch();
        if (active && rec) {
          try {
            rec.stop();
          } catch (_) {
          }
        }
        Promise.resolve(window._kokoroTTS.speak(text, kv, 1)).then((url) => {
          if (speakSerial !== my) return;
          if (!url) {
            resume2();
            return;
          }
          const a = new Audio(url);
          replyAudio = a;
          a.onended = resume2;
          a.onerror = resume2;
          a.onloadedmetadata = () => {
            const ms = isFinite(a.duration) && a.duration > 0 ? a.duration * 1e3 + 1500 : 0;
            if (ms) setTimeout(resume2, ms);
          };
          Promise.resolve(a.play()).catch(resume2);
        }).catch(resume2);
        setTimeout(resume2, 3e4);
        return;
      }
    } catch (_) {
      speaking = false;
    }
    if (!window.speechSynthesis || typeof SpeechSynthesisUtterance !== "function") return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = c && c.voiceLang || "en-US";
      u.onend = resume2;
      u.onerror = resume2;
      speaking = true;
      activeResume = resume2;
      startBargeWatch();
      if (active && rec) {
        try {
          rec.stop();
        } catch (_) {
        }
      }
      window.speechSynthesis.speak(u);
      setTimeout(resume2, 15e3);
    } catch (_) {
      speaking = false;
    }
  };
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
    speakReply(msg, c);
  };
  const stop = (reason) => {
    cancelRoute();
    clearPendingReply();
    if (pageHideHandler) {
      try {
        window.removeEventListener("pagehide", pageHideHandler);
      } catch (_) {
      }
      pageHideHandler = null;
    }
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
    if (whisperState) {
      try {
        whisperState.stream.getTracks().forEach(function(tr) {
          tr.stop();
        });
      } catch (_) {
      }
      try {
        whisperState.proc.disconnect();
      } catch (_) {
      }
      try {
        whisperState.gain.disconnect();
      } catch (_) {
      }
      try {
        whisperState.ac.close();
      } catch (_) {
      }
      whisperState = null;
    }
    engineName = "webspeech";
    standby = false;
    paused = false;
    awake = false;
    if (awakeTimer) {
      clearTimeout(awakeTimer);
      awakeTimer = null;
    }
    if (replyAudio) {
      try {
        replyAudio.pause();
      } catch (_) {
      }
      replyAudio = null;
    }
    const c = getCtx();
    try {
      if (c && c.setVoiceActive) c.setVoiceActive(false);
    } catch (_) {
    }
    if (reason) announce(reason);
  };
  const handleUtterance = async (text) => {
    errStreak = 0;
    text = String(text || "").trim();
    if (!text) return;
    const cc = getCtx();
    if (/^(stop listening|stop voice|voice off)\b/i.test(text)) {
      stop("Voice control off \u2014 the microphone is released.");
      return;
    }
    if (/^(pause listening|pause voice|hold on|one moment|wait a moment)\b/i.test(text)) {
      pause();
      return;
    }
    if (standby && engineName === "whisper") {
      if (!awake) {
        const wk = detectWakeCommand(text);
        if (!wk.woke) return;
        if (!wk.command) {
          awake = true;
          if (awakeTimer) clearTimeout(awakeTimer);
          awakeTimer = setTimeout(() => {
            awake = false;
            awakeTimer = null;
          }, 12e3);
          announce("Listening.");
          return;
        }
        text = wk.command;
      } else {
        awake = false;
        if (awakeTimer) {
          clearTimeout(awakeTimer);
          awakeTimer = null;
        }
      }
    }
    if (routeController) {
      try {
        routeController.abort();
      } catch (_) {
      }
    }
    const currentRouteSerial = ++routeSerial;
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    routeController = controller;
    const signal = controller ? controller.signal : null;
    try {
      const r = await routeUtterance(cc, text, { allowAi: true, signal });
      if (!active || currentRouteSerial !== routeSerial || signal && signal.aborted) return;
      if (r && r.handled) announce(r.narration);
      else announce("Didn\u2019t catch a command in \u201C" + text.slice(0, 60) + "\u201D \u2014 try \u201Cbigger text\u201D or " + (getCommandAudience(cc) === "student" ? "\u201Cread directions\u201D." : "\u201Copen the educator hub\u201D."));
    } catch (error) {
      if (!active || currentRouteSerial !== routeSerial || error && error.name === "AbortError") return;
      announce("Didn\u2019t catch a command in \u201C" + text.slice(0, 60) + "\u201D \u2014 try \u201Cbigger text\u201D or " + (getCommandAudience(cc) === "student" ? "\u201Cread directions\u201D." : "\u201Copen the educator hub\u201D."));
    } finally {
      if (currentRouteSerial === routeSerial) routeController = null;
    }
  };
  const startWhisperEngine = async () => {
    const asr = await _getWhisperPipeline();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    if (!active) {
      try {
        stream.getTracks().forEach(function(tr) {
          tr.stop();
        });
      } catch (_) {
      }
      return;
    }
    const AC2 = window.AudioContext || window.webkitAudioContext;
    const ac = new AC2();
    try {
      await ac.resume();
    } catch (_) {
    }
    const src = ac.createMediaStreamSource(stream);
    const proc = ac.createScriptProcessor(4096, 1, 1);
    const gain = ac.createGain();
    gain.gain.value = 0;
    const seg = createVadSegmenter({ sampleRate: ac.sampleRate });
    let busy = false;
    proc.onaudioprocess = (ev) => {
      if (!active || engineName !== "whisper") return;
      if (paused) {
        seg.reset();
        return;
      }
      if (speaking) {
        seg.reset();
        return;
      }
      const segment = seg.push(ev.inputBuffer.getChannelData(0));
      if (!segment || busy) return;
      busy = true;
      Promise.resolve(asr(downsampleAudio(segment, ac.sampleRate, 16e3))).then((out) => {
        busy = false;
        const text = String(out && out.text || "").trim();
        if (text && !/^[\[(]/.test(text)) handleUtterance(text);
      }).catch(() => {
        busy = false;
      });
    };
    src.connect(proc);
    proc.connect(gain);
    gain.connect(ac.destination);
    whisperState = { stream, ac, proc, gain, seg, src, asr };
  };
  const beginWebSpeech = (c, standbyWanted) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      stop("Voice control isn\u2019t available in this browser.");
      return;
    }
    try {
      engineName = "webspeech";
      standby = false;
      if (standbyWanted) announce("\u201CHey Allo\u201D standby needs the on-device speech model \u2014 say \u201Cdownload voice models\u201D first. Tap-to-talk listening is on instead.");
      rec = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = c && c.voiceLang || "en-US";
      rec.onresult = (ev) => {
        const last = ev.results[ev.results.length - 1];
        if (!last || !last.isFinal) {
          noteUserSpeech(true);
          return;
        }
        noteUserTurnEnd();
        handleUtterance(String(last[0] && last[0].transcript || ""));
      };
      rec.onspeechstart = () => noteUserSpeech(true);
      rec.onspeechend = () => noteUserSpeech(false);
      rec.onerror = (ev) => {
        errStreak++;
        if (ev && (ev.error === "not-allowed" || ev.error === "service-not-allowed")) {
          stop("Microphone permission was denied \u2014 voice control stopped.");
          return;
        }
        if (errStreak >= 3) stop("Voice control stopped after repeated microphone errors.");
      };
      rec.onend = () => {
        if (active && !speaking && !paused) {
          try {
            rec.start();
          } catch (_) {
            stop("Voice control stopped.");
          }
        }
      };
      rec.start();
    } catch (e) {
      stop("Voice control could not start: " + (e && e.message || "unknown"));
    }
  };
  const start = () => {
    const c = getCtx();
    if (active) return true;
    active = true;
    errStreak = 0;
    awake = false;
    try {
      if (c && c.setVoiceActive) c.setVoiceActive(true);
    } catch (_) {
    }
    pageHideHandler = () => stop();
    try {
      window.addEventListener("pagehide", pageHideHandler, { once: true });
    } catch (_) {
      pageHideHandler = null;
    }
    try {
      if (_modelPolicy() === "auto") {
        modelCache.hasWhisper().then(function(has) {
          if (has) return;
          announce("Downloading the on-device speech model in the background (one time).");
          return modelCache.prefetchWhisper().then(function(r) {
            announce("On-device speech model ready \u2014 " + Math.max(1, Math.round(r.bytes / 1048576)) + " MB cached on this device.");
          });
        }).catch(function(_) {
        });
      }
    } catch (_) {
    }
    const standbyWanted = _voiceStandbyPref();
    let engineChosen = false;
    const probeTimer = setTimeout(function() {
      if (engineChosen || !active) return;
      engineChosen = true;
      announce("Using browser speech: the on-device model did not answer in time.");
      beginWebSpeech(c, false);
    }, 2500);
    if (_voiceEnginePref() === "webspeech") {
      beginWebSpeech(c, standbyWanted);
      return true;
    }
    modelCache.hasWhisper().then(function(has) {
      if (!active) return;
      if (engineChosen) return;
      clearTimeout(probeTimer);
      engineChosen = true;
      if (!has) {
        beginWebSpeech(c, standbyWanted);
        return;
      }
      engineName = "whisper";
      standby = standbyWanted;
      return startWhisperEngine().then(function() {
        if (!active) return;
        announce(standby ? "On-device listening in standby \u2014 say \u201Chey Allo\u201D before a command. Audio never leaves this device." : "On-device recognition active \u2014 audio stays on this device.");
      });
    }).catch(function(e) {
      clearTimeout(probeTimer);
      if (engineChosen) return;
      engineChosen = true;
      if (!active) return;
      whisperState = null;
      announce("On-device engine could not start (" + (e && e.message || "unknown") + ") \u2014 using browser speech instead.");
      beginWebSpeech(c, false);
    });
    return true;
  };
  const pause = () => {
    if (!active || paused) return false;
    paused = true;
    cancelRoute();
    try {
      if (rec) rec.stop();
    } catch (_) {
    }
    if (whisperState) {
      try {
        whisperState.stream.getTracks().forEach(function(tr) {
          tr.stop();
        });
      } catch (_) {
      }
      try {
        if (whisperState.src) whisperState.src.disconnect();
      } catch (_) {
      }
      whisperState.stream = null;
      whisperState.src = null;
      try {
        whisperState.seg.reset();
      } catch (_) {
      }
    }
    announce("Paused \u2014 the microphone is off. Resume when you're ready.");
    return true;
  };
  const resume = async () => {
    if (!active || !paused) return false;
    paused = false;
    if (engineName === "whisper" && whisperState) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        if (!active || paused) {
          try {
            stream.getTracks().forEach(function(tr) {
              tr.stop();
            });
          } catch (_) {
          }
          return false;
        }
        const src2 = whisperState.ac.createMediaStreamSource(stream);
        src2.connect(whisperState.proc);
        whisperState.stream = stream;
        whisperState.src = src2;
      } catch (e) {
        paused = true;
        announce("Could not turn the microphone back on: " + (e && e.message || "unknown"));
        return false;
      }
    } else {
      try {
        if (rec) rec.start();
      } catch (_) {
      }
    }
    announce("Listening again.");
    return true;
  };
  return {
    start,
    stop: () => stop("Voice control off \u2014 the microphone is released."),
    pause,
    resume,
    isPaused: () => paused,
    isActive: () => active,
    engine: () => engineName,
    // Live standby switch. Refuses on Web Speech: standby means a hot mic,
    // and a hot mic is only acceptable when transcription is on-device.
    setStandby: (on) => {
      if (on && engineName !== "whisper") return false;
      standby = !!on;
      awake = false;
      if (awakeTimer) {
        clearTimeout(awakeTimer);
        awakeTimer = null;
      }
      return true;
    }
  };
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
  open_source_input: "navigate",
  open_source_url: "navigate",
  open_source_generator: "navigate",
  open_history: "navigate",
  open_document_builder: "navigate",
  open_wizard: "navigate",
  open_notebook: "navigate",
  open_translate: "navigate",
  open_class_session: "navigate",
  open_class_analytics: "navigate",
  open_share_collect: "navigate",
  open_live_session_center: "live",
  open_live_poll: "live",
  open_quick_check: "live",
  open_pictionary_host: "live",
  open_group_tools: "live",
  open_student_signal: "live",
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
  set_grade_level: "create",
  set_source_tone: "create",
  set_source_length: "create",
  set_output_language: "create",
  submit_work: "create",
  open_assignment_directions: "navigate",
  check_assignment_progress: "navigate",
  save_my_work: "navigate",
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
  open_stem_tool: "tools",
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
  open_free_forms: "tools",
  open_community_catalog: "tools",
  open_dynamic_assessment: "tools",
  open_reading_library: "tools",
  open_open_groove: "tools",
  open_timeline_studio: "tools",
  open_lingua_practice: "tools",
  open_test_prep_hub: "tools",
  open_research_hub: "tools",
  open_lit_lab: "tools",
  open_mind_map: "tools",
  open_poet_tree: "tools",
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
  pipeline_new_doc: "pipeline",
  edit_assignment_directions: "create",
  open_assessment_builder: "create",
  open_udl_guide: "help",
  open_command_blueprints: "create",
  run_lesson_blueprint: "create",
  rebuild_lesson_step: "create",
  apply_lesson_template: "create",
  create_activity_rubric: "create",
  share_assignment: "create",
  preview_assignment_as_student: "navigate",
  resume_latest_work: "navigate",
  next_assignment_step: "navigate",
  read_assignment_directions: "accessibility",
  show_success_criteria: "navigate",
  send_teacher_signal: "live",
  review_teacher_feedback: "navigate"
};
const CMD_CONTEXT = {
  pipeline_score: ["pipeline"],
  pipeline_issues: ["pipeline"],
  pipeline_downloads: ["pipeline"],
  pipeline_verification: ["pipeline"],
  pipeline_tour: ["pipeline"],
  translate_document: ["pipeline"],
  open_document_builder: ["educatorHub", "content"],
  open_source_input: ["sourceSetup"],
  open_source_url: ["sourceSetup"],
  open_source_generator: ["sourceSetup"],
  open_history: ["content"],
  open_wizard: ["educatorHub"],
  create_lesson: ["educatorHub"],
  open_translate: ["educatorHub", "content"],
  open_class_session: ["educatorHub", "liveSession"],
  open_class_analytics: ["educatorHub", "behaviorLens"],
  open_share_collect: ["educatorHub"],
  open_live_session_center: ["liveSession"],
  open_live_poll: ["liveSession"],
  open_quick_check: ["liveSession"],
  open_pictionary_host: ["liveSession"],
  open_group_tools: ["liveSession"],
  open_student_signal: ["liveSession"],
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
  open_research_hub: ["learningHub", "content", "researchHub"],
  open_lit_lab: ["learningHub", "litLab"],
  open_mind_map: ["learningHub", "content", "mindMap"],
  open_poet_tree: ["learningHub", "poetTree"],
  set_grade_level: ["sourceSetup"],
  set_source_tone: ["sourceSetup"],
  set_source_length: ["sourceSetup"],
  set_output_language: ["sourceSetup"],
  open_assignment_directions: ["content"],
  check_assignment_progress: ["content"],
  save_my_work: ["content"],
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
  pipeline_new_doc: ["pipeline"],
  edit_assignment_directions: ["content"],
  open_assessment_builder: ["educatorHub", "content"],
  open_udl_guide: ["educatorHub", "content"],
  open_command_blueprints: ["educatorHub", "content"],
  run_lesson_blueprint: ["content"],
  rebuild_lesson_step: ["content"],
  apply_lesson_template: ["content"],
  create_activity_rubric: ["content"],
  share_assignment: ["content"],
  preview_assignment_as_student: ["content"],
  resume_latest_work: ["content"],
  next_assignment_step: ["content"],
  read_assignment_directions: ["content", "reading"],
  show_success_criteria: ["content"],
  send_teacher_signal: ["liveSession"],
  review_teacher_feedback: ["content"]
};
const GROUP_ORDER = ["navigate", "live", "create", "tools", "accessibility", "display", "pipeline", "help", "voice"];
const GROUP_LABEL_FALLBACK = { navigate: "Navigate", live: "Live class", create: "Create from this content", tools: "Open a tool", accessibility: "Reading & access", display: "Display & motion", pipeline: "Pipeline results", help: "Help", voice: "Voice" };
const COMMAND_RECENTS_KEY = "allo_command_recents_v1";
const COMMAND_RECENTS_LIMIT = 5;
const COMMAND_FAVORITES_KEY = "allo_command_favorites_v1";
const COMMAND_FAVORITES_LIMIT = 8;
const COMMAND_USAGE_KEY = "allo_command_usage_v1";
const COMMAND_USAGE_LIMIT = 80;
const ALLO_COMMAND_PALETTE_OPEN_EVENT = "alloflow:open-command-palette";
function _safeCommandId(value) {
  const id = String(value || "");
  return /^[a-z0-9_:-]{1,80}$/.test(id) ? id : "";
}
function _readCommandFavorites() {
  try {
    const saved = JSON.parse(localStorage.getItem(COMMAND_FAVORITES_KEY) || "[]");
    return Array.isArray(saved) ? saved.map(_safeCommandId).filter(Boolean).slice(0, COMMAND_FAVORITES_LIMIT) : [];
  } catch (_) {
    return [];
  }
}
function _readCommandUsage() {
  try {
    const saved = JSON.parse(localStorage.getItem(COMMAND_USAGE_KEY) || "{}");
    return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
  } catch (_) {
    return {};
  }
}
function getLocalCommandInsights() {
  const usage = _readCommandUsage();
  return Object.keys(usage).map((rawId) => {
    const commandId = _safeCommandId(rawId);
    const item = usage[rawId] || {};
    return commandId ? { commandId, count: Math.max(0, Math.floor(Number(item.count) || 0)), lastUsed: Math.max(0, Math.floor(Number(item.lastUsed) || 0)) } : null;
  }).filter((item) => item && item.count > 0).sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed || a.commandId.localeCompare(b.commandId));
}
function _recordCommandUse(commandId) {
  const id = _safeCommandId(commandId);
  if (!id) return;
  try {
    const usage = _readCommandUsage();
    const prior = usage[id] || {};
    usage[id] = { count: Math.max(0, Math.floor(Number(prior.count) || 0)) + 1, lastUsed: Date.now() };
    const entries = Object.entries(usage).sort((a, b) => (Number(b[1] && b[1].lastUsed) || 0) - (Number(a[1] && a[1].lastUsed) || 0)).slice(0, COMMAND_USAGE_LIMIT);
    localStorage.setItem(COMMAND_USAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
    if (typeof window !== "undefined" && window.dispatchEvent && window.CustomEvent) window.dispatchEvent(new window.CustomEvent("alloflow:command-usage", { detail: { commandId: id } }));
  } catch (_) {
  }
}
const CTX_FLAG = { liveSession: "liveSessionActive", pipeline: "pipelineOpen", educatorHub: "educatorHubOpen", learningHub: "learningHubOpen", sourceSetup: "sourceSetupOpen", symbolStudio: "symbolStudioOpen", videoStudio: "videoStudioOpen", alloStudio: "alloStudioOpen", cinematicStudio: "cinematicStudioOpen", stemLab: "stemLabOpen", openGroove: "openGrooveOpen", timelineStudio: "timelineStudioOpen", linguaPractice: "linguaPracticeOpen", testPrepHub: "testPrepHubOpen", researchHub: "researchHubOpen", litLab: "litLabOpen", mindMap: "mindMapOpen", poetTree: "poetTreeOpen", behaviorLens: "behaviorLensOpen", content: "contentLoaded", reading: (c) => !!(c.zenActive || c.focusActive) };
const CTX_PRIORITY = ["sourceSetup", "liveSession", "videoStudio", "alloStudio", "cinematicStudio", "symbolStudio", "stemLab", "openGroove", "timelineStudio", "linguaPractice", "testPrepHub", "researchHub", "litLab", "mindMap", "poetTree", "behaviorLens", "pipeline", "educatorHub", "learningHub", "content", "reading"];
const CONTEXT_LABEL_FALLBACK = { sourceSetup: "Here \u2014 Source setup", liveSession: "Here \u2014 Live session", pipeline: "Here \u2014 Pipeline results", educatorHub: "Here \u2014 Educator Hub", learningHub: "Here \u2014 Learning Hub", symbolStudio: "Here \u2014 Symbol Studio", videoStudio: "Here \u2014 Video Studio", alloStudio: "Here \u2014 Page Designer", cinematicStudio: "Here \u2014 Cinematic Studio", stemLab: "Here \u2014 STEAM Lab", openGroove: "Here \u2014 Open Groove Studio", timelineStudio: "Here \u2014 Timeline Studio", linguaPractice: "Here \u2014 Lingua Practice", testPrepHub: "Here \u2014 Test Prep Hub", researchHub: "Here \u2014 Research Hub", litLab: "Here \u2014 Lit Lab", mindMap: "Here \u2014 Throughline", poetTree: "Here \u2014 Poet Tree", behaviorLens: "Here \u2014 Behavior Lens", content: "Here \u2014 this content", reading: "Here \u2014 Reading mode" };
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
  const [favoriteCommandIds, setFavoriteCommandIds] = useState(_readCommandFavorites);
  const [usageVersion, setUsageVersion] = useState(0);
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
  const commands = useMemo(() => ctx ? buildAlloCommands(ctx, { includeUnavailable: getCommandAudience(ctx) === "teacher" }) : [], [ctx]);
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
    const browseCommands = commands.filter((command) => command.available !== false);
    const acts = _activeContexts(ctx);
    const promotedIds = /* @__PURE__ */ new Set();
    if (getCommandAudience(ctx) === "student") {
      const studentActions = browseCommands.filter((command) => command.roles === "student").slice(0, 6);
      if (studentActions.length) {
        out.push({ kind: "header", label: t("student.actions", "Student actions") });
        studentActions.forEach((command) => {
          promotedIds.add(command.id);
          out.push({ kind: "cmd", c: command });
        });
      }
    }
    const favorites = favoriteCommandIds.map((id) => browseCommands.find((command) => command.id === id)).filter(Boolean);
    if (favorites.length) {
      out.push({ kind: "header", label: "Favorites" });
      favorites.forEach((command) => {
        promotedIds.add(command.id);
        out.push({ kind: "cmd", c: command });
      });
    }
    if (acts.length) {
      const promoted = [];
      for (const c of browseCommands) {
        if (!promotedIds.has(c.id) && (CMD_CONTEXT[c.id] || []).some((x) => acts.indexOf(x) >= 0)) {
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
    const recent = recentCommandIds.map((id) => browseCommands.find((c) => c.id === id)).filter((c) => c && !promotedIds.has(c.id)).slice(0, COMMAND_RECENTS_LIMIT);
    if (recent.length) {
      out.push({ kind: "header", label: t("palette.group.recent", "Recent") });
      recent.forEach((c) => {
        promotedIds.add(c.id);
        out.push({ kind: "cmd", c });
      });
    }
    const frequent = getLocalCommandInsights().map((item) => browseCommands.find((command) => command.id === item.commandId)).filter((command) => command && !promotedIds.has(command.id)).slice(0, 5);
    if (frequent.length) {
      out.push({ kind: "header", label: "Frequently used" });
      frequent.forEach((command) => {
        promotedIds.add(command.id);
        out.push({ kind: "cmd", c: command });
      });
    }
    const PER_GROUP = 6, MAX_ROWS = 40;
    let cmdCount = promotedIds.size;
    for (const g of GROUP_ORDER) {
      if (cmdCount >= MAX_ROWS) break;
      const inGroup = browseCommands.filter((c) => (CMD_GROUP[c.id] || "navigate") === g && !promotedIds.has(c.id));
      const take = inGroup.slice(0, Math.min(PER_GROUP, MAX_ROWS - cmdCount));
      if (!take.length) continue;
      out.push({ kind: "header", label: t("palette.group." + g, GROUP_LABEL_FALLBACK[g]) });
      take.forEach((c) => out.push({ kind: "cmd", c }));
      cmdCount += take.length;
    }
    return out;
  }, [commands, query, ctx, t, recentCommandIds, favoriteCommandIds, usageVersion]);
  const selectable = useMemo(() => {
    const a = [];
    rows.forEach((r, i) => {
      if (r.kind === "cmd" && r.c.available !== false) a.push(i);
    });
    return a;
  }, [rows]);
  const commandRowCount = useMemo(() => rows.filter((row) => row.kind === "cmd").length, [rows]);
  const selectedCommand = rows[sel] && rows[sel].kind === "cmd" ? rows[sel].c : null;
  const selectedCommandId = selectedCommand ? selectedCommand.id : "";
  const selectedIsFavorite = !!selectedCommandId && favoriteCommandIds.includes(selectedCommandId);
  const paletteStatus = (() => {
    if (confirming && selectedCommand && confirming === selectedCommand.id) return _commandConfirmationText(selectedCommand, ctx, t);
    const count = commandRowCount;
    if (!count) return query.trim() ? "No matching commands." : "No commands are available here.";
    const resultText = query.trim() ? count + " matching command" + (count === 1 ? "." : "s.") : count + " command" + (count === 1 ? " shown." : "s shown.");
    const unavailableCount = rows.filter((row) => row.kind === "cmd" && row.c.available === false).length;
    return resultText + (unavailableCount ? " " + unavailableCount + " unavailable in the current context." : "") + (selectedCommand ? " " + selectedCommand.label + " selected." : "");
  })();
  useEffect(() => {
    const rememberCurrentFocus = () => {
      try {
        prevFocusRef.current = document.activeElement;
      } catch (_) {
      }
    };
    const onKey = (e) => {
      const k = (e.key || "").toLowerCase();
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && k === "k" || (e.ctrlKey || e.metaKey) && e.shiftKey && k === "p") {
        e.preventDefault();
        setOpen((v) => {
          if (!v) rememberCurrentFocus();
          return !v;
        });
        setQuery("");
        setConfirming(null);
      }
    };
    const onOpenRequest = (event) => {
      const requested = event && event.detail ? event.detail.query : "";
      const initialQuery = typeof requested === "string" ? requested.trim().slice(0, 160) : "";
      setOpen((wasOpen) => {
        if (!wasOpen) rememberCurrentFocus();
        return true;
      });
      setQuery(initialQuery);
      setSel(0);
      setConfirming(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(ALLO_COMMAND_PALETTE_OPEN_EVENT, onOpenRequest);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(ALLO_COMMAND_PALETTE_OPEN_EVENT, onOpenRequest);
    };
  }, []);
  useEffect(() => {
    const onUsage = () => setUsageVersion((version) => version + 1);
    window.addEventListener("alloflow:command-usage", onUsage);
    return () => window.removeEventListener("alloflow:command-usage", onUsage);
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
  const announce = useCallback((msg, type = "success") => {
    try {
      if (window.alloAnnounce) window.alloAnnounce(msg);
    } catch (_) {
    }
    try {
      if (ctx && ctx.addToast) ctx.addToast(msg, type);
    } catch (_) {
    }
  }, [ctx]);
  const toggleSelectedFavorite = useCallback(() => {
    if (!selectedCommandId || !selectedCommand || selectedCommand.available === false) return;
    setFavoriteCommandIds((previous) => {
      const current = Array.isArray(previous) ? previous : [];
      const next = current.includes(selectedCommandId) ? current.filter((id) => id !== selectedCommandId) : [selectedCommandId].concat(current.filter((id) => id !== selectedCommandId)).slice(0, COMMAND_FAVORITES_LIMIT);
      try {
        localStorage.setItem(COMMAND_FAVORITES_KEY, JSON.stringify(next));
      } catch (_) {
      }
      return next;
    });
  }, [selectedCommandId, selectedCommand]);
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
    if (cmd.available === false) {
      const reason = cmd.unavailableReason || t("palette.unavailable", "This command is not available in the current context.");
      announce(reason, "info");
      return;
    }
    if (cmd.destructive && (!confirming || confirming !== cmd.id)) {
      setConfirming(cmd.id);
      return;
    }
    setConfirming(null);
    const result = executeCommand(ctx, cmd, {}, { confirmed: true, via: "palette" });
    if (!result || !result.handled || result.ok === false) {
      const failure = result && result.narration || t("cmd.failed", "That command is no longer available here.");
      try {
        if (ctx && ctx.addToast) ctx.addToast(failure, "error");
      } catch (_) {
      }
      setOpen(false);
      return;
    }
    rememberCommand(cmd.id);
    setOpen(false);
    if (result.narration) announce(result.narration, result.pending ? "info" : "success");
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
        placeholder: getCommandAudience(ctx) === "student" ? t("student.actions_search") || "Try \u201Cread directions\u201D, \u201Ccheck my progress\u201D, or \u201Csave my work\u201D\u2026" : t("palette.placeholder", "Type a command \u2014 \u201Cbigger text\u201D, \u201Ceducator hub\u201D, \u201Cread this page\u201D\u2026"),
        "aria-label": t("palette.input_aria", "Search commands"),
        role: "combobox",
        "aria-expanded": "true",
        "aria-autocomplete": "list",
        "aria-controls": "allo-palette-list",
        "aria-describedby": "allo-palette-status",
        "aria-activedescendant": selectedCommandId ? "allo-cmd-" + selectedCommandId : void 0,
        className: "flex-1 text-sm outline-none bg-transparent text-slate-800 placeholder:text-slate-500"
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: toggleSelectedFavorite,
        disabled: !selectedCommand || selectedCommand.available === false,
        "aria-pressed": selectedIsFavorite,
        "aria-label": (selectedIsFavorite ? "Remove selected command from favorites" : "Pin selected command to favorites") + (selectedCommand ? ": " + selectedCommand.label : ""),
        title: selectedIsFavorite ? "Remove from favorites" : "Pin to favorites",
        className: "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-lg text-amber-600 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
      },
      /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, selectedIsFavorite ? "\u2605" : "\u2606")
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
    /* @__PURE__ */ React.createElement("ul", { id: "allo-palette-list", role: "listbox", "aria-label": t("palette.list_aria", "Matching commands"), className: "max-h-[46vh] overflow-y-auto py-1" }, commandRowCount === 0 && /* @__PURE__ */ React.createElement("li", { role: "presentation", className: "px-4 py-6 text-center text-xs text-slate-600" }, t("palette.no_match", "No matching command. The bot chat (and soon voice) understands free-form requests.")), rows.map((row, i) => row.kind === "header" ? /* @__PURE__ */ React.createElement("li", { key: "h-" + i, role: "presentation", className: "px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 select-none" }, row.label) : /* @__PURE__ */ React.createElement(
      "li",
      {
        key: row.c.id,
        id: "allo-cmd-" + row.c.id,
        role: "option",
        "aria-selected": i === sel,
        "aria-disabled": row.c.available === false,
        onClick: () => runCmd(row.c),
        onMouseEnter: () => {
          if (row.c.available !== false) setSel(i);
        },
        className: `min-h-11 w-full px-4 py-2.5 text-left flex items-center gap-3 ${row.c.available === false ? "cursor-not-allowed bg-slate-50 opacity-75" : "cursor-pointer"} ${i === sel ? "bg-indigo-50" : ""}`
      },
      /* @__PURE__ */ React.createElement("span", { className: "text-lg shrink-0", "aria-hidden": "true" }, row.c.icon),
      /* @__PURE__ */ React.createElement("span", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("span", { className: `block text-sm font-bold ${i === sel ? "text-indigo-900" : "text-slate-800"}` }, row.c.label), /* @__PURE__ */ React.createElement("span", { className: "block text-[11px] text-slate-600 truncate" }, row.c.available === false ? row.c.unavailableReason : confirming === row.c.id ? _commandConfirmationText(row.c, ctx, t) : row.c.hint)),
      i === sel && /* @__PURE__ */ React.createElement("kbd", { className: "text-[10px] text-indigo-600 border border-indigo-300 rounded px-1.5 py-0.5 shrink-0" }, "\u21B5")
    ))),
    /* @__PURE__ */ React.createElement("div", { className: "px-4 py-2 border-t border-slate-200 text-[10px] text-slate-600 flex items-center gap-3" }, /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("kbd", { className: "border border-slate-300 rounded px-1" }, "\u2191\u2193"), " ", t("palette.nav", "navigate")), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("kbd", { className: "border border-slate-300 rounded px-1" }, "\u21B5"), " ", t("palette.run", "run")), /* @__PURE__ */ React.createElement("span", { className: "ml-auto" }, t("palette.footer", "Every action is announced. Ctrl+K toggles.")))
  ));
};
function mergeCommandProgressItems(previous, detail, limit = 4) {
  if (!detail || !detail.commandId) return Array.isArray(previous) ? previous : [];
  const key = String(detail.commandId) + ":" + String(detail.startedAt || detail.at || "current");
  const item = Object.assign({}, detail, { progressKey: key });
  const rest = (Array.isArray(previous) ? previous : []).filter((entry) => entry && entry.progressKey !== key);
  return [item].concat(rest).slice(0, Math.max(1, limit));
}
const AlloCommandProgress = ({ ctx }) => {
  const [items, setItems] = useState([]);
  const clearTimersRef = useRef(/* @__PURE__ */ new Map());
  const t = _mkT(ctx && ctx.t);
  const dismiss = useCallback((progressKey) => {
    const timer = clearTimersRef.current.get(progressKey);
    if (timer) clearTimeout(timer);
    clearTimersRef.current.delete(progressKey);
    setItems((previous) => previous.filter((entry) => entry && entry.progressKey !== progressKey));
  }, []);
  useEffect(() => {
    const onState = (event) => {
      const detail = event && event.detail;
      if (!detail || !detail.commandId) return;
      const progressKey = String(detail.commandId) + ":" + String(detail.startedAt || detail.at || "current");
      const priorTimer = clearTimersRef.current.get(progressKey);
      if (priorTimer) clearTimeout(priorTimer);
      clearTimersRef.current.delete(progressKey);
      setItems((previous) => mergeCommandProgressItems(previous, detail));
      if (detail.status === "success" || detail.status === "cancelled") {
        const timer = setTimeout(() => {
          clearTimersRef.current.delete(progressKey);
          setItems((previous) => previous.filter((entry) => entry && entry.progressKey !== progressKey));
        }, 4e3);
        clearTimersRef.current.set(progressKey, timer);
      }
    };
    window.addEventListener("alloflow:command-state", onState);
    return () => {
      window.removeEventListener("alloflow:command-state", onState);
      clearTimersRef.current.forEach((timer) => clearTimeout(timer));
      clearTimersRef.current.clear();
    };
  }, []);
  const retry = useCallback((item) => {
    if (!item || item.status !== "error" || !item.retryable) return;
    const result = executeCommand(ctx, item.commandId, item.params || {}, { confirmed: true, via: "retry" });
    if (result && result.handled) dismiss(item.progressKey);
    else setItems((previous) => previous.map((entry) => entry.progressKey === item.progressKey ? Object.assign({}, entry, { narration: t("cmd.failed", "That command is no longer available here."), retryable: false }) : entry));
  }, [ctx, dismiss, t]);
  const cancel = useCallback((item) => {
    if (!item || item.status !== "pending" || !item.cancellable) return;
    const result = cancelCommand(ctx, item.commandId, { startedAt: item.startedAt });
    if (!result || !result.handled) setItems((previous) => previous.map((entry) => entry.progressKey === item.progressKey ? Object.assign({}, entry, { narration: t("cmd.failed", "That command is no longer available here."), cancellable: false }) : entry));
  }, [ctx, t]);
  if (!items.length) return null;
  return /* @__PURE__ */ React.createElement("section", { "aria-label": "Command progress", "data-help-ignore": "true", className: "fixed bottom-4 right-4 z-[11900] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 no-print" }, items.map((item) => {
    const pending = item.status === "pending";
    const failed = item.status === "error";
    const cancelled = item.status === "cancelled";
    const commandLabel = item.label || item.commandId;
    const cancelLabel = (t("cmd.cancel", "Cancel") + " " + commandLabel).trim();
    const retryLabel = (t("cmd.retry", "Retry") + " " + commandLabel).trim();
    return /* @__PURE__ */ React.createElement(
      "article",
      {
        key: item.progressKey,
        role: "status",
        "aria-live": failed ? "assertive" : "polite",
        "aria-atomic": "true",
        className: `rounded-xl border p-3 shadow-xl ${failed ? "border-rose-300 bg-rose-50 text-rose-950" : cancelled ? "border-amber-300 bg-amber-50 text-amber-950" : item.status === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-950" : "border-indigo-300 bg-white text-slate-900"}`
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-3" }, /* @__PURE__ */ React.createElement("span", { className: `mt-0.5 text-lg ${pending ? "animate-pulse" : ""}`, "aria-hidden": "true" }, pending ? "\u23F3" : failed ? "\u26A0\uFE0F" : cancelled ? "\u23F9\uFE0F" : "\u2705"), /* @__PURE__ */ React.createElement("div", { className: "min-w-0 flex-1" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-bold" }, item.label || item.commandId), /* @__PURE__ */ React.createElement("p", { className: "mt-0.5 text-xs leading-5" }, item.narration || (pending ? t("cmd.working", "Working...") : cancelled ? t("cmd.cancelled", "Cancellation requested.") : t("router.done", "Done."))), /* @__PURE__ */ React.createElement("div", { className: "mt-2 flex flex-wrap gap-2" }, pending && item.cancellable && /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => cancel(item), "aria-label": cancelLabel, className: "min-h-9 rounded-lg border border-amber-500 bg-amber-50 px-3 text-xs font-bold text-amber-900 hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700" }, "Cancel"), failed && item.retryable && /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => retry(item), "aria-label": retryLabel, className: "min-h-9 rounded-lg bg-rose-700 px-3 text-xs font-bold text-white hover:bg-rose-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700" }, "Retry"))), !pending && /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => dismiss(item.progressKey), "aria-label": "Dismiss progress for " + (item.label || item.commandId), className: "inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg text-lg hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600" }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\xD7")))
    );
  }));
};

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.AlloCommands = { _voicePure: { downsampleAudio: downsampleAudio, detectWakeCommand: detectWakeCommand, createVadSegmenter: createVadSegmenter, createBargeDetector: createBargeDetector }, detectNavigationIntent: detectNavigationIntent, modelCache: modelCache, AlloCommandPalette: AlloCommandPalette, AlloCommandProgress: AlloCommandProgress, buildAlloCommands: buildAlloCommands, getCommandAudience: getCommandAudience, getCommandAvailability: getCommandAvailability, getLocalCommandInsights: getLocalCommandInsights, mergeCommandProgressItems: mergeCommandProgressItems, scoreCommand: scoreCommand, routeUtterance: routeUtterance, executeCommand: executeCommand, cancelCommand, runCommandById: runCommandById, findReadingMatches: findReadingMatches, normalizeReadingRequest: normalizeReadingRequest, readingMatchReasons: readingMatchReasons, readingMatchWhyText: readingMatchWhyText, createVoiceLoop: createVoiceLoop, looksMultiStep: looksMultiStep, getCommandContract: getCommandContract, sanitizeCommandParams: sanitizeCommandParams, validatePlan: validatePlan, planUtterance: planUtterance, runPlan: runPlan };
  console.log('[CDN] AlloCommands loaded');
})();
