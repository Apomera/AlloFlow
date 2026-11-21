/* eslint-disable */
// stem_tool_accesslens.js — Access Lens (learner accessibility camera kit)
// ---------------------------------------------------------------------------
// A student points their camera at the world and gets four kinds of access:
//   • Describe   — factual scene description for students who are blind or
//                  have low vision, with read-aloud.
//   • Read       — OCR of any text in the photo, re-rendered in a large-print,
//                  spacing-adjustable reader panel, with read-aloud.
//   • Translate  — text in the photo transcribed and translated into the
//                  student's chosen language.
//   • Investigate— Socratic mode: the AI states only what it can SEE, asks
//                  noticing/testing questions, and offers its identification
//                  strictly labeled as a guess with a confidence level. It
//                  never appraises value and never presents guesses as fact.
//
// Capture paths (in order of preference):
//   1. <input type="file" accept="image/*" capture="environment"> — works in
//      the Gemini Canvas iframe with zero camera permissions (Story Forge
//      "Snap Your Writing" precedent); on phones this opens the rear camera.
//   2. In-app getUserMedia live preview when the embedding context allows it.
//   3. Pop-out companion window (same escape-hatch pattern as Video Studio:
//      a real top-level browsing context where camera permission prompts
//      work even when the Canvas iframe denies them). Photo returns via
//      postMessage with an ack handshake; only the chosen JPEG crosses.
//
// Privacy invariants (FERPA):
//   - The photo lives ONLY in component state (in-memory object URL/data URL).
//     It is NEVER written to ctx.toolData / saved projects / exports.
//   - Quest slice '_accessLens' persists booleans and counters only.
//   - Zero AI traffic when ctx.aiHintsEnabled is off (house AI-gating rule);
//     every analysis is user-initiated, nothing auto-fires.
//   - UI reminds students to photograph things, not people.
//
// Architecture matches the STEAM Lab plugin contract (see stem_tool_cellular.js):
// registerTool + render(ctx) + hooks-only state + SSR-safe first render (no
// effects, no navigator/document access during render).
(function () {
  'use strict';
  if (!window.StemLab || !window.StemLab.registerTool) {
    console.warn('[StemLab] stem_tool_accesslens.js loaded before StemLab registry — bailing');
    return;
  }

  if (typeof document !== 'undefined' && !document.getElementById('accesslens-css')) {
    var _st = document.createElement('style');
    _st.id = 'accesslens-css';
    _st.textContent = [
      '.accesslens-tab, .accesslens-btn, .accesslens-chip { transition: transform 120ms ease, background-color 140ms ease, border-color 140ms ease, box-shadow 140ms ease; }',
      '.accesslens-tab:focus-visible, .accesslens-btn:focus-visible, .accesslens-chip:focus-visible { outline: 3px solid #0ea5e9; outline-offset: 2px; }',
      '.accesslens-btn:not([disabled]):not([aria-disabled="true"]):hover, .accesslens-chip:hover { transform: translateY(-1px); }',
      '@keyframes accesslens-pulse { 0% { opacity: 0.55; } 50% { opacity: 1; } 100% { opacity: 0.55; } }',
      '@keyframes accesslens-scan { 0% { transform: translateY(-18px); opacity: 0.35; } 50% { transform: translateY(18px); opacity: 0.92; } 100% { transform: translateY(-18px); opacity: 0.35; } }',
      '@keyframes accesslens-ring { 0% { opacity: 0.45; } 50% { opacity: 0.95; } 100% { opacity: 0.45; } }',
      '.accesslens-busy { animation: accesslens-pulse 1.2s ease-in-out infinite; }',
      '.accesslens-scan-beam { animation: accesslens-scan 3.4s ease-in-out infinite; }',
      '.accesslens-ring-pulse { animation: accesslens-ring 2.6s ease-in-out infinite; }',
      '@media (prefers-reduced-motion: reduce) { .accesslens-tab, .accesslens-btn, .accesslens-chip { transition: none !important; } .accesslens-busy, .accesslens-scan-beam, .accesslens-ring-pulse { animation: none !important; } }',
      '@media (max-width: 720px) { [data-accesslens-columns] { grid-template-columns: 1fr !important; } }'
    ].join('\n');
    if (document.head) document.head.appendChild(_st);
  }

  // Companion window (camera fallback outside the Canvas iframe). Same CDN
  // hosting pattern as video_studio/video_studio.html.
  // v=2: the window now sends the photo only to an opener that answered its
  // nonce handshake (see access_lens.html), so it needs this tool's reply.
  var LENS_URL = 'https://alloflow-cdn.pages.dev/access_lens/access_lens.html?v=2';
  var LENS_ORIGIN = 'https://alloflow-cdn.pages.dev';

  // English names stay the PROMPT value (the model is instructed in English);
  // the code drives the voice and the lang attribute of translated text.
  var TARGET_LANGS = [
    'Spanish', 'French', 'Portuguese', 'Arabic', 'Somali', 'Vietnamese',
    'Chinese (Simplified)', 'Haitian Creole', 'Russian', 'Ukrainian',
    'Swahili', 'Farsi', 'Pashto', 'Khmer', 'Tagalog', 'English'
  ];
  var LANG_CODES = Object.assign(Object.create(null), {
    'Spanish': 'es', 'French': 'fr', 'Portuguese': 'pt', 'Arabic': 'ar', 'Somali': 'so', 'Vietnamese': 'vi',
    'Chinese (Simplified)': 'zh-CN', 'Haitian Creole': 'ht', 'Russian': 'ru', 'Ukrainian': 'uk',
    'Swahili': 'sw', 'Farsi': 'fa', 'Pashto': 'ps', 'Khmer': 'km', 'Tagalog': 'tl', 'English': 'en'
  });
  function langCodeOf(name) {
    return (name && Object.prototype.hasOwnProperty.call(LANG_CODES, name)) ? LANG_CODES[name] : '';
  }
  function langSlug(name) { return String(name).toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_|_$/g, ''); }
  // The page language, as an English language name the prompt can use. A
  // blind English learner otherwise got every description in English. Returns
  // '' for English or unknown, which keeps the prompt unchanged.
  function uiLanguageName(code) {
    var c = String(code || '').trim();
    if (!c || /^en\b/i.test(c)) return '';
    var base = c.toLowerCase();
    for (var name in LANG_CODES) {
      if (Object.prototype.hasOwnProperty.call(LANG_CODES, name) && LANG_CODES[name].toLowerCase() === base) return name;
    }
    var short = base.split(/[-_]/)[0];
    for (var n2 in LANG_CODES) {
      if (Object.prototype.hasOwnProperty.call(LANG_CODES, n2) && LANG_CODES[n2].toLowerCase().split('-')[0] === short) return n2;
    }
    try {
      if (typeof Intl !== 'undefined' && Intl.DisplayNames) {
        var dn = new Intl.DisplayNames(['en'], { type: 'language' }).of(c);
        if (dn && dn.toLowerCase() !== base) return dn;
      }
    } catch (_) {}
    return '';
  }
  function languageRule(lang) {
    return lang ? '\nWrite every text value in ' + lang + ' (keep the JSON keys in English).' : '';
  }
  // Spoken strings are built outside the component, so they take the
  // component's translator; without one they fall back to English.
  function plainTr(k, fb) { return fb; }

  // ═══════════════════════════════════════════════════════════════════════
  //  PURE HELPERS (no React, no DOM) — prompt builders + parsers
  // ═══════════════════════════════════════════════════════════════════════
  function bandPhrase(band) {
    if (band === 'k2') return 'a young student in kindergarten to grade 2; use very simple words and short sentences';
    if (band === 'g35') return 'a student in grades 3 to 5; use clear, friendly language';
    if (band === 'g912') return 'a high school student; normal vocabulary is fine';
    return 'a middle school student; keep language clear and concrete';
  }

  function describePrompt(band, lang) {
    return 'You are describing a photo for a student who is blind or has low vision. The student took this photo themselves and cannot see it. Audience: ' + bandPhrase(band) + '.\n' +
      'Describe only what is actually visible:\n' +
      '1. One short overview sentence first.\n' +
      '2. Then the layout: what is on the left, center, right, near, and far.\n' +
      '3. Objects with their colors, rough sizes, and textures.\n' +
      '4. Read out text you can see, word for word, except the personal details in rule 7.\n' +
      '5. If a person appears, say only "a person" plus clothing color and where they are. Never guess identity, age, gender, or feelings.\n' +
      '6. Never say that a path, road, doorway, area, or object is safe, clear, or free of obstacles, and never say that nothing is in the way. Describe what you see; the student decides with someone they trust.\n' +
      '7. If the photo shows a document, a screen, mail, an ID card, or a gradebook, say what kind it is and read its headings, but do not read out people\'s names, addresses, phone numbers, ID numbers, or grades. Say the student can use Read mode for the full text.\n' +
      'Never guess brands, prices, or value. ' +
      'Respond with STRICT JSON only (no markdown fences, no extra text):\n' +
      '{"photo":{"usable":true,"problem":""},' +
      '"description":"the description, following steps 1 to 5 above, as plain sentences",' +
      '"unsure":["anything you could not make out, one short phrase each; empty array if none"]}\n' +
      'Set photo.usable to false and fill photo.problem when the photo is too dark, too blurry, ' +
      'mostly covered, or aimed at nothing identifiable. Say which, in one short sentence the student ' +
      'can act on, such as "too dark" or "the lens looks covered". The student cannot see the photo, ' +
      'so this is the only way they learn to retake it. Put anything you are unsure of in unsure, ' +
      'never hedged inside the description.' + languageRule(lang);
  }

  function readPrompt() {
    return 'Transcribe ALL text visible in this photo, exactly as written, in natural reading order (top to bottom, left to right, or right to left if the language reads that way). Keep line breaks. ' +
      'If a word is too blurry to read, write [unclear] in its place. ' +
      'Output ONLY the transcribed text with no commentary. ' +
      'If there is no readable text at all, output exactly: NO_TEXT_FOUND';
  }

  function translatePrompt(lang) {
    return 'This photo contains text. Do two things:\n' +
      '1. Transcribe the text exactly as written, in reading order. Use [unclear] for unreadable words.\n' +
      '2. Translate that text into ' + lang + '. Keep the meaning natural, not word for word.\n' +
      'Format your answer EXACTLY like this, with these two markers on their own lines:\n' +
      'ORIGINAL:\n(the transcribed text)\n' +
      'TRANSLATION:\n(the translation into ' + lang + ')\n' +
      'If there is no readable text, output exactly: NO_TEXT_FOUND';
  }

  // The never-list is spelled out because "touching safely" left it to the
  // model, and the headline user explores by touch.
  var INQUIRE_NEVER = 'Never suggest tasting, licking, or smelling anything. Never suggest touching, picking up, or handling unknown plants, mushrooms or other fungi, chemicals or powders, animals or insects, batteries or electrical items, or anything that may be sharp or hot. If the object might be one of these, say so and tell the student to ask an adult before touching it.';
  function inquirePrompt(band, lang) {
    return 'You are a Socratic science guide looking at a photo a student just took of an object they are curious about. Audience: ' + bandPhrase(band) + '. The student may be blind or have low vision.\n' +
      'Your job is NOT to lecture or identify with false confidence. Respond with STRICT JSON only (no markdown fences, no extra text):\n' +
      '{"observations":["2 or 3 things you can literally SEE in the photo (colors, shapes, textures, markings)"],' +
      '"questions":["3 short questions that push the student to notice, compare, or test something about the object; each answerable WITHOUT seeing it, by touching it gently, listening to it, weighing or measuring it, comparing it with something familiar, or asking someone; at most one question may need eyesight; never by memorized trivia"],' +
      '"guess":{"what":"your best guess at what the object is","confidence":"low|medium|high","why":"the visible evidence for the guess and what evidence would change your mind"},' +
      '"tryThis":"one safe, concrete way the student could test whether the guess is right, using touch, sound, or measuring where possible"}\n' +
      'Rules: observations must be visible facts only. Never state a price or value. Never present the guess as certain. If the photo is too unclear, use low confidence and say why in the why field. ' +
      INQUIRE_NEVER + ' These safety rules apply to the questions and to tryThis.' + languageRule(lang);
  }

  // Describe mode is the one a blind student lives in, so it must never lose
  // the description to a parsing problem: if the JSON does not arrive, the raw
  // text IS the description and the photo is simply unreported. Mirrors
  // parseInquire's fence-stripping.
  // Read-aloud is how this mode is actually consumed, so the photo problem and
  // the hedges have to be spoken too. Putting the problem FIRST means a student
  // hears "this may not have come out" before a description built on a bad shot.
  function describeSpeech(out, tr) {
    tr = tr || plainTr;
    if (!out) return '';
    var parts = [];
    if (!out.usable) {
      var why = out.problem || tr('stem.accessLens.speech_unclear', 'the picture is unclear');
      why = why.replace(/[.!?]+$/, '');
      parts.push(tr('stem.accessLens.speech_photo_problem', 'This photo may not have come out:') + ' ' + why + '.');
    }
    if (out.description) parts.push(out.description);
    if (out.unsure && out.unsure.length) parts.push(tr('stem.accessLens.unsure_title', 'The AI was not sure about:') + ' ' + out.unsure.join('; ') + '.');
    return parts.join(' ');
  }
  // The transcription prompts tell the model to write [unclear] where a word
  // could not be read. That marker was rendered as ordinary text, so at 44px a
  // gap in a medication label or a lab safety instruction looked exactly like
  // the words that WERE read. Split it out so it can be marked visually and
  // spoken as a gap rather than as the literal word "unclear".
  // Two modes tested the same sentinel two different ways, and both were wrong.
  // Read used strict equality, so "NO_TEXT_FOUND." rendered the raw token at
  // 44px to a low-vision student. Translate used indexOf, so a sign that really
  // contains that token was misreported as having no text at all.
  //
  // One rule: the sentinel counts only when it is the WHOLE reply, allowing for
  // surrounding whitespace and trailing punctuation the model may add.
  // "Analysis ready." told a blind student that something had happened, then
  // left them to find it with a virtual cursor. The result IS the answer, so
  // the announcement carries it -- capped, because a live region should not
  // read three paragraphs before the student can stop it. The full text stays
  // on screen and in Read aloud.
  var ANNOUNCE_CAP = 240;
  function announceCap(text) {
    var t = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
    if (t.length <= ANNOUNCE_CAP) return t;
    var cut = t.slice(0, ANNOUNCE_CAP);
    var lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
    if (lastStop > ANNOUNCE_CAP * 0.5) return cut.slice(0, lastStop + 1);
    var lastSpace = cut.lastIndexOf(' ');
    return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut) + '\u2026';
  }
  function resultAnnouncement(mode, value, noTextMsg, moreMsg, tr) {
    tr = tr || plainTr;
    if (mode === 'describe') {
      if (!value) return '';
      var lead = value.usable ? '' : (tr('stem.accessLens.speech_photo_problem', 'This photo may not have come out:') + ' ' + (value.problem || tr('stem.accessLens.speech_unclear', 'the picture is unclear')) + '. ');
      return announceCap(lead + (value.description || ''));
    }
    if (mode === 'read') {
      if (isNoTextReply(value)) return noTextMsg;
      var gaps = countUnclear(value);
      var gapNote = gaps ? (gaps === 1 ? tr('stem.accessLens.gap_one', '1 word could not be read. ') : gaps + tr('stem.accessLens.gap_many', ' words could not be read. ')) : '';
      return announceCap(gapNote + speechWithGaps(value, tr));
    }
    if (mode === 'translate') {
      if (!value || value.none) return noTextMsg;
      return announceCap(value.translated || '');
    }
    if (mode === 'inquire') {
      if (!value) return '';
      if (value.raw) return announceCap(value.raw);
      // The guess stays hidden until the student asks for it, so the arrival
      // announcement must not give it away; guessAnnouncement speaks it then.
      return announceCap(tr('stem.accessLens.sr_inquire_ready', 'The AI shared what it can notice and asked you some questions. Its guess stays hidden until you choose Show the AI\'s guess.') + ' ' + (moreMsg || ''));
    }
    return '';
  }
  // Spoken when the student reveals the guess. Never bare: a guess heard
  // without its confidence is heard as a fact.
  function guessAnnouncement(guess, tr) {
    tr = tr || plainTr;
    var g = guess || {};
    return announceCap(tr('stem.accessLens.sr_guess_prefix', 'The AI\'s guess, as a') + ' ' + confidenceLabel(g.confidence, tr) + ': ' + (g.what || '') + '.');
  }
  // A label token counts as decorative when it is made only of symbol
  // characters: emoji (surrogate pairs), arrows, and misc symbols. Built from
  // code points rather than a literal class, because a literal emoji range in
  // this source has been mangled by tooling before. Letters and digits never
  // match, so a real word is never hidden from a screen reader.
  var DECORATIVE_LEAD = (function () {
    function r(a, b) { return String.fromCharCode(a) + '-' + String.fromCharCode(b); }
    return new RegExp('^[' + r(0xD800, 0xDFFF) + r(0x2190, 0x21FF) + r(0x2300, 0x27BF) +
      r(0x2B00, 0x2BFF) + String.fromCharCode(0xFE0F) + String.fromCharCode(0x200D) + ']+$');
  })();
  var NO_TEXT_SENTINEL = 'NO_TEXT_FOUND';
  function isNoTextReply(text) {
    if (text == null) return false;
    var t = String(text).trim();
    if (!t) return false;
    // Strip trailing punctuation and quotes the model sometimes appends.
    t = t.replace(/^["'`]+/, '').replace(/["'`.!?\s]+$/, '');
    return t.toUpperCase() === NO_TEXT_SENTINEL;
  }
  var UNCLEAR_TOKEN = '[unclear]';
  function splitUnclear(text) {
    if (text == null) return [];
    var raw = String(text);
    if (!raw) return [];
    var parts = [], rest = raw, at = rest.toLowerCase().indexOf(UNCLEAR_TOKEN);
    while (at !== -1) {
      if (at > 0) parts.push({ unclear: false, text: rest.slice(0, at) });
      parts.push({ unclear: true, text: UNCLEAR_TOKEN });
      rest = rest.slice(at + UNCLEAR_TOKEN.length);
      at = rest.toLowerCase().indexOf(UNCLEAR_TOKEN);
    }
    if (rest) parts.push({ unclear: false, text: rest });
    return parts;
  }
  function countUnclear(text) {
    return splitUnclear(text).filter(function (p) { return p.unclear; }).length;
  }
  // Speech: "unclear" on its own is heard as a word in the sentence. Saying
  // what it means keeps the gap audible.
  function speechWithGaps(text, tr) {
    tr = tr || plainTr;
    if (text == null) return '';
    var gap = ' (' + tr('stem.accessLens.speech_gap', 'one word could not be read') + ') ';
    return splitUnclear(text).map(function (p) {
      return p.unclear ? gap : p.text;
    }).join('').replace(/\s{2,}/g, ' ').trim();
  }
  function parseDescribe(text) {
    if (!text || typeof text !== 'string') return null;
    var raw = String(text).trim();
    if (!raw) return null;
    var fallback = { description: raw, usable: true, problem: '', unsure: [], structured: false };
    var s = raw.replace(/```json/gi, '```').split('```').join('');
    var a = s.indexOf('{'), b = s.lastIndexOf('}');
    if (a === -1 || b === -1 || b <= a) return fallback;
    var obj;
    try { obj = JSON.parse(s.slice(a, b + 1)); } catch (e) { return fallback; }
    if (!obj || typeof obj !== 'object') return fallback;
    var description = obj.description == null ? '' : String(obj.description).trim();
    var photo = obj.photo && typeof obj.photo === 'object' ? obj.photo : {};
    // A black or covered photo can come back with nothing to describe. Falling
    // back there read the raw JSON aloud and lost the retake message.
    if (!description && photo.usable !== false) return fallback;
    var unsure = Array.isArray(obj.unsure)
      ? obj.unsure.slice(0, 6).map(function (u) { return String(u).trim(); }).filter(Boolean)
      : [];
    return {
      description: description,
      // Only an explicit false means unusable; a missing field must not accuse
      // a good photo of being bad.
      usable: photo.usable !== false,
      problem: photo.problem == null ? '' : String(photo.problem).trim(),
      unsure: unsure,
      structured: true
    };
  }
  // Robust JSON extraction: strips code fences, grabs first {...last}.
  function parseInquire(text) {
    if (!text || typeof text !== 'string') return null;
    var s = text.replace(/```json/gi, '```').split('```').join('');
    var a = s.indexOf('{'), b = s.lastIndexOf('}');
    if (a === -1 || b === -1 || b <= a) return null;
    var obj;
    try { obj = JSON.parse(s.slice(a, b + 1)); } catch (e) { return null; }
    if (!obj || !obj.guess || !Array.isArray(obj.questions) || !Array.isArray(obj.observations)) return null;
    obj.questions = obj.questions.slice(0, 4).map(String);
    obj.observations = obj.observations.slice(0, 4).map(String);
    obj.tryThis = obj.tryThis ? String(obj.tryThis) : '';
    obj.guess = {
      what: String(obj.guess.what || ''),
      confidence: /^(low|medium|high)$/i.test(String(obj.guess.confidence)) ? String(obj.guess.confidence).toLowerCase() : 'low',
      why: String(obj.guess.why || '')
    };
    return obj;
  }

  function parseTranslation(text) {
    if (!text || typeof text !== 'string') return null;
    if (isNoTextReply(text)) return { none: true };
    var oi = text.indexOf('ORIGINAL:'), ti = text.indexOf('TRANSLATION:');
    if (oi === -1 || ti === -1 || ti <= oi) return { original: '', translated: text.trim() };
    return {
      original: text.slice(oi + 9, ti).trim(),
      translated: text.slice(ti + 12).trim()
    };
  }

  // getUserMedia failures are not interchangeable. Telling a student on a
  // laptop with no rear camera to allow permissions, and offering a pop-out
  // window that will fail the same way, is wrong advice three times out of
  // four. Names come from the Media Capture spec; older engines used the
  // legacy aliases, so both are mapped.
  function cameraFailureReason(error) {
    var name = error && (error.name || error.code);
    name = typeof name === 'string' ? name : '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') return 'denied';
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') return 'none';
    if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') return 'inuse';
    if (name === 'TypeError') return 'unsupported';
    return 'other';
  }
  function splitDataUrl(dataUrl) {
    if (typeof dataUrl !== 'string') return null;
    var m = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
    if (!m) return null;
    return { mime: m[1], base64: m[2] };
  }

  function confidenceLabel(c, tr) {
    tr = tr || plainTr;
    if (c === 'high') return tr('stem.accessLens.conf_high', 'fairly confident, but still a guess');
    if (c === 'medium') return tr('stem.accessLens.conf_medium', 'somewhat confident guess');
    return tr('stem.accessLens.conf_low', 'low-confidence guess');
  }
  // A request that never answers left every Analyze button disabled for good.
  var VISION_TIMEOUT_MS = 60000;
  function withTimeout(promise, ms) {
    var timer = null;
    var limit = new Promise(function (_, reject) {
      timer = setTimeout(function () { var e = new Error('timeout'); e.accessLensTimeout = true; reject(e); }, ms);
    });
    return Promise.race([Promise.resolve(promise), limit]).then(
      function (v) { clearTimeout(timer); return v; },
      function (e) { clearTimeout(timer); throw e; });
  }
  function isHeicFile(f) {
    if (!f) return false;
    return /^image\/hei[cf]/i.test(String(f.type || '')) || /\.hei[cf]$/i.test(String(f.name || ''));
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  COMPONENT
  // ═══════════════════════════════════════════════════════════════════════
  function AccessLens(props) {
    var ctx = props.ctx;
    var React = ctx.React;
    var h = React.createElement;
    var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef, useCallback = React.useCallback;
    var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
    var _t = function (k, fb) { var v = __alloT(k, fb); return (v == null || v === k) ? fb : v; };

    var ctxRef = useRef(ctx); ctxRef.current = ctx;
    var aiOn = !!ctx.aiHintsEnabled;
    // Host says vision AI is usable (text too: results are read through it); else the analyze actions hide.
    var vision = (ctx.aiAvailable !== false && ctx.aiVisionAvailable !== false && typeof ctx.callGeminiVision === 'function') ? ctx.callGeminiVision : null;
    var canAnalyze = aiOn && !!vision;

    // ── theme ──
    var dark = !!ctx.isDark, contrast = !!ctx.isContrast;
    var C = {
      bg: contrast ? '#000000' : (dark ? '#0b1220' : '#f4f7fb'),
      panel: contrast ? '#000000' : (dark ? '#0f172a' : '#ffffff'),
      border: contrast ? '#ffff00' : (dark ? '#1e293b' : '#cbd5e1'),
      soft: contrast ? '#000000' : (dark ? '#111827' : '#f1f5f9'),
      text: contrast ? '#ffffff' : (dark ? '#e2e8f0' : '#0f172a'),
      sub: contrast ? '#ffff00' : (dark ? '#94a3b8' : '#475569'),
      accent: contrast ? '#ffff00' : (dark ? '#38bdf8' : '#0369a1'),
      // Filled (primary/pressed) buttons use a fixed sky-700 so white text
      // clears 4.5:1 in BOTH themes (the lighter dark-mode accent is 2.1:1).
      btnBg: contrast ? '#000000' : '#0369a1',
      btnText: contrast ? '#ffff00' : '#ffffff',
      btnBorder: contrast ? '#00ff00' : '#0369a1',
      accentBg: contrast ? '#000000' : (dark ? '#082f49' : '#e0f2fe'),
      warnBg: contrast ? '#000000' : (dark ? '#422006' : '#fef3c7'),
      warnBorder: contrast ? '#ffff00' : (dark ? '#d97706' : '#d97706'),
      okBg: contrast ? '#000000' : (dark ? '#052e16' : '#dcfce7'),
      okBorder: contrast ? '#00ff00' : (dark ? '#16a34a' : '#16a34a'),
      shadow: contrast ? 'none' : (dark ? '0 4px 16px rgba(2,6,23,0.45)' : '0 2px 10px rgba(15,23,42,0.06)')
    };

    // Hostile-toolData guard for quest/telemetry readout
    var lensMeta = (ctx && ctx.toolData && typeof ctx.toolData === 'object' && ctx.toolData._accessLens && typeof ctx.toolData._accessLens === 'object')
      ? ctx.toolData._accessLens : {};
    var lensesExploredCount = (lensMeta.described ? 1 : 0) + (lensMeta.readText ? 1 : 0) + (lensMeta.translated ? 1 : 0) + (lensMeta.inquired ? 1 : 0);

    // ── state (photo is in-memory ONLY; never persisted) ──
    var sMode = useState('describe'); var mode = sMode[0], setMode = sMode[1];
    var sPhoto = useState(null); var photo = sPhoto[0], setPhoto = sPhoto[1]; // {dataUrl, width, height, source}
    var sBusy = useState(''); var busy = sBusy[0], setBusy = sBusy[1];        // '' | mode id
    var sErr = useState(''); var err = sErr[0], setErr = sErr[1];
    var sResults = useState({}); var results = sResults[0], setResults = sResults[1];
    var sCam = useState('idle'); var camState = sCam[0], setCamState = sCam[1]; // idle|starting|live|denied
    var sCamWhy = useState(''); var camReason = sCamWhy[0], setCamReason = sCamWhy[1]; // '' | denied | none | inuse | unsupported | other
    var sLang = useState('Spanish'); var targetLang = sLang[0], setTargetLang = sLang[1];
    var sReaderPx = useState(24); var readerPx = sReaderPx[0], setReaderPx = sReaderPx[1];
    var sReaderSurface = useState('default'); var readerSurface = sReaderSurface[0], setReaderSurface = sReaderSurface[1]; // default | warm | high
    var sAnswers = useState({}); var answers = sAnswers[0], setAnswers = sAnswers[1];
    var sSpeaking = useState(false); var speaking = sSpeaking[0], setSpeaking = sSpeaking[1];
    var sLive = useState(''); var liveMsg = sLive[0], setLiveMsg = sLive[1];
    var sGuess = useState(false); var guessShown = sGuess[0], setGuessShown = sGuess[1];
    var sCustomLang = useState(false); var customLang = sCustomLang[0], setCustomLang = sCustomLang[1];

    // Focus targets. A screen-reader user whose button just vanished (Clear
    // photo, Live camera, Snap) was dropped at the top of the page every time;
    // each action now names where focus goes next, applied after the render
    // that creates that control.
    var takeBtnRef = useRef(null);
    var liveBtnRef = useRef(null);
    var snapBtnRef = useRef(null);
    var analyzeBtnRef = useRef(null);
    var resultRef = useRef(null);
    var langInputRef = useRef(null);
    var pendingFocusRef = useRef('');
    // The speech request in flight (or playing): bumping the token makes a
    // late answer harmless, the controller aborts the request, and the timer
    // ends the "speaking" state when the host gives no end event.
    var speechTokenRef = useRef(0);
    var speechCtlRef = useRef(null);
    var speechTimerRef = useRef(null);

    var fileRef = useRef(null);
    var videoRef = useRef(null);
    var streamRef = useRef(null);
    var camTokenRef = useRef(0);
    var lensWinRef = useRef(null);
    var lensNonceRef = useRef('');
    var busyRef = useRef(''); busyRef.current = busy;
    // Which photo an in-flight analysis belongs to. Without this, clearing or
    // replacing a photo mid-analysis still let the old result land: the student
    // got an authoritative description of a photo that is no longer there. For
    // a blind student -- this tool's headline user -- there is no visual cue
    // that the description is stale, so it is the worst failure mode here.
    var photoTokenRef = useRef(0);

    // aria-live fires on a TEXT CHANGE, so announcing the same string twice in
    // a row is silent: analysing two photos in a row said "Analysis ready."
    // once, and a student retrying a bad photo three times heard one error.
    // A trailing run of zero-width spaces changes the text without changing
    // what is read aloud.
    var liveSeqRef = useRef(0);
    // ONE channel. Writing the local region AND the host's made a screen reader
    // read every result twice (up to 240 characters, twice). The host region
    // is used when the host offers one; the local region is the fallback.
    var announce = useCallback(function (m) {
      var text = String(m || '');
      var cx = ctxRef.current;
      if (cx && typeof cx.announceToSR === 'function') {
        try { cx.announceToSR(text); return; } catch (_) {}
      }
      liveSeqRef.current = (liveSeqRef.current + 1) % 4;
      setLiveMsg(text ? text + '\u200B'.repeat(liveSeqRef.current) : '');
    }, []);

    // Apply a requested focus move once its target exists (runs after every
    // render; never during SSR).
    useEffect(function () {
      var want = pendingFocusRef.current;
      if (!want) return;
      var el = want === 'take' ? takeBtnRef.current
        : want === 'live' ? liveBtnRef.current
        : want === 'snap' ? snapBtnRef.current
        : want === 'analyze' ? analyzeBtnRef.current
        : want === 'result' ? resultRef.current
        : want === 'lang' ? langInputRef.current
        : null;
      if (!el) return;
      pendingFocusRef.current = '';
      try { el.focus(); } catch (_) {}
    });

    // ── quest persistence: booleans/counters only, NEVER the photo ──
    var markQuest = useCallback(function (flag) {
      var cx = ctxRef.current;
      if (!cx || typeof cx.setToolData !== 'function') return;
      cx.setToolData(function (prev) {
        var cur = Object.assign({}, (prev && prev._accessLens) || {});
        if (cur[flag]) return prev;
        cur[flag] = true;
        var n = Object.assign({}, prev); n._accessLens = cur; return n;
      });
    }, []);

    // ── live camera stream attach/detach ──
    useEffect(function () {
      if (camState === 'live' && videoRef.current && streamRef.current) {
        try {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.play().catch(function () {});
        } catch (_) {}
      }
      return function () {};
    }, [camState]);

    // stop stream + speech + in-flight requests on unmount
    useEffect(function () {
      return function () {
        camTokenRef.current++;
        photoTokenRef.current++;
        stopStream();
        stopSpeech();
        try { if (lensWinRef.current && !lensWinRef.current.closed) lensWinRef.current.close(); } catch (_) {}
      };
    }, []);

    // ── companion-window handshake (Video Studio pattern: trust only our
    //    own window reference, ack every photo) ──
    useEffect(function () {
      if (typeof window === 'undefined') return undefined;
      function onMsg(ev) {
        if (!lensWinRef.current || ev.source !== lensWinRef.current) return;
        if (ev.origin !== LENS_ORIGIN) return;
        var d = ev.data || {};
        if (d.type === 'allolens-ready') {
          // The window sends a photo only to an opener that proves it opened
          // it (this nonce), and only to the origin that answered.
          try { lensWinRef.current.postMessage({ type: 'allolens-hello', nonce: lensNonceRef.current }, LENS_ORIGIN); } catch (_) {}
        } else if (d.type === 'allolens-photo' && d.payload && typeof d.payload.dataUrl === 'string') {
          acceptPhoto(d.payload.dataUrl, 'companion window');
          try { lensWinRef.current.postMessage({ type: 'allolens-photo-ack' }, LENS_ORIGIN); } catch (_) {}
        } else if (d.type === 'allolens-closed') {
          lensWinRef.current = null;
        }
      }
      window.addEventListener('message', onMsg);
      return function () { window.removeEventListener('message', onMsg); };
    }, []);

    function stopStream() {
      var s = streamRef.current;
      if (s && s.getTracks) { try { s.getTracks().forEach(function (tr) { tr.stop(); }); } catch (_) {} }
      streamRef.current = null;
    }

    // Stop meant only the browser voice. The app voice (ctx.callTTS) plays in
    // the host, so Stop, Clear photo and switching tabs left it talking, and a
    // second press started another copy over it. A blind student who cleared a
    // photo kept hearing the old photo described.
    function stopSpeech() {
      speechTokenRef.current++;
      if (speechCtlRef.current) { try { speechCtlRef.current.abort(); } catch (_) {} speechCtlRef.current = null; }
      if (speechTimerRef.current) { clearTimeout(speechTimerRef.current); speechTimerRef.current = null; }
      var cx = ctxRef.current;
      if (cx && typeof cx.stopTTS === 'function') { try { cx.stopTTS(); } catch (_) {} }
      try { if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel(); } catch (_) {}
      setSpeaking(false);
    }

    // ── photo intake: everything funnels through here; downscale to <=1024px
    //    JPEG so the AI payload stays small ──
    function acceptPhoto(dataUrl, sourceLabel, heic) {
      // Claim this decode. A later photo bumps the token and wins.
      var token = ++photoTokenRef.current;
      var loadErr = heic
        ? _t('stem.accessLens.err_heic', 'This looks like an iPhone HEIC photo, which this browser cannot open. Take the photo with the Take or choose a photo button instead, or set the iPhone camera format to Most Compatible.')
        : _t('stem.accessLens.err_photo', 'That photo could not be loaded. Please try another one.');
      var img = new Image();
      img.onload = function () {
        if (token !== photoTokenRef.current) return;
        try {
          var maxDim = 1024;
          var w = img.width, hgt = img.height;
          var scale = Math.min(1, maxDim / Math.max(w, hgt));
          var cw = Math.max(1, Math.round(w * scale)), chg = Math.max(1, Math.round(hgt * scale));
          var cv = document.createElement('canvas');
      cv.setAttribute('aria-hidden', 'true');
          cv.width = cw; cv.height = chg;
          var cvCtx = cv.getContext('2d');
          if (!cvCtx) throw new Error('no 2d context');
          cvCtx.drawImage(img, 0, 0, cw, chg);
          var out = cv.toDataURL('image/jpeg', 0.85);
          setPhoto({ dataUrl: out, width: cw, height: chg, source: sourceLabel || '' });
          busyRef.current = '';
          setResults({}); setAnswers({}); setErr(''); setBusy(''); setGuessShown(false);
          stopSpeech();
          markQuest('captured');
          pendingFocusRef.current = 'analyze';
          announce(_t('stem.accessLens.sr_photo_ready', 'Photo ready. Choose a lens mode and press Analyze.'));
        } catch (e) {
          setErr(loadErr);
        }
      };
      img.onerror = function () {
        if (token !== photoTokenRef.current) return;
        setErr(loadErr);
      };
      img.src = dataUrl;
    }

    function onFileChosen(e) {
      var f = e.target && e.target.files && e.target.files[0];
      if (e.target) e.target.value = '';
      if (!f) return;
      if (f.type && (f.type.indexOf('image/') !== 0 || /svg/i.test(f.type))) {
        setErr(_t('stem.accessLens.err_not_image', 'Please choose a photo (image file).'));
        return;
      }
      if (Number(f.size) > 20 * 1024 * 1024) {
        setErr(_t('stem.accessLens.err_photo', 'That photo exceeds the 20 MB limit. Please choose a smaller photo.'));
        return;
      }
      var heic = isHeicFile(f);
      var fr = new FileReader();
      fr.onload = function () { acceptPhoto(String(fr.result), 'file', heic); };
      fr.onerror = function () { setErr(_t('stem.accessLens.err_photo', 'That photo could not be loaded. Please try another one.')); };
      fr.readAsDataURL(f);
    }

    function startLiveCamera() {
      setErr('');
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCamReason('unsupported');
        setCamState('denied');
        return;
      }
      var tok = ++camTokenRef.current;
      stopStream();
      // The Live camera button is replaced by Snap as soon as this renders.
      pendingFocusRef.current = 'snap';
      setCamState('starting');
      navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false })
        .then(function (stream) {
          if (tok !== camTokenRef.current) {
            if (stream && stream.getTracks) { try { stream.getTracks().forEach(function (tr) { tr.stop(); }); } catch (_) {} }
            return;
          }
          streamRef.current = stream;
          setCamReason('');
          pendingFocusRef.current = 'snap';
          setCamState('live');
          announce(_t('stem.accessLens.sr_cam_live', 'Live camera started. Press Snap photo when ready.'));
        })
        .catch(function (error) {
          if (tok !== camTokenRef.current) return;
          // The error was discarded, so a laptop with no rear camera, a camera
          // already in use, and a real permission refusal all told the student
          // the same thing: that the camera is blocked and to try the pop-out
          // window, which fails identically for three of the four.
          setCamReason(cameraFailureReason(error));
          pendingFocusRef.current = 'take';
          setCamState('denied');
        });
    }

    function snapFromLive() {
      var v = videoRef.current;
      if (!v || !v.videoWidth) {
        announce(_t('stem.accessLens.sr_cam_not_ready', 'The camera is not ready yet. Wait a moment, then press Snap photo again.'));
        return;
      }
      var cv = document.createElement('canvas');
      cv.setAttribute('aria-hidden', 'true');
      cv.width = v.videoWidth; cv.height = v.videoHeight;
      var snapCtx = cv.getContext('2d');
      if (!snapCtx) return;
      snapCtx.drawImage(v, 0, 0);
      var url = cv.toDataURL('image/jpeg', 0.9);
      camTokenRef.current++;
      stopStream();
      // Snap disappears with the live view; land on the photo button until the
      // decoded photo moves focus on to Analyze.
      pendingFocusRef.current = 'take';
      setCamState('idle');
      acceptPhoto(url, 'live camera');
    }

    function cancelLive() { camTokenRef.current++; stopStream(); pendingFocusRef.current = 'live'; setCamState('idle'); }

    function openLensWindow() {
      setErr('');
      var w = null;
      var nonce = '';
      try {
        var bytes = new Uint8Array(16);
        (window.crypto || {}).getRandomValues(bytes);
        nonce = Array.prototype.map.call(bytes, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
      } catch (_) { nonce = String(Math.random()).slice(2) + String(Date.now()); }
      lensNonceRef.current = nonce;
      try { w = window.open(LENS_URL + '&nonce=' + nonce, 'alloflow-access-lens', 'width=980,height=760'); } catch (_) { w = null; }
      if (!w) {
        setErr(_t('stem.accessLens.err_popup', 'The camera window was blocked. Allow pop-ups for this page, or use Take or choose a photo instead.'));
        return;
      }
      lensWinRef.current = w;
      announce(_t('stem.accessLens.sr_popup', 'Camera window opened. Take a photo there and it will appear here.'));
    }

    function clearPhoto() {
      photoTokenRef.current++;
      busyRef.current = '';
      setPhoto(null); setResults({}); setAnswers({}); setErr(''); setBusy(''); setGuessShown(false);
      stopSpeech();
      pendingFocusRef.current = 'take';
      announce(_t('stem.accessLens.sr_cleared', 'Photo cleared. Nothing was saved.'));
    }

    // ── analysis (all user-initiated; hard-gated on aiHintsEnabled) ──
    function analyze(m) {
      if (!photo || !canAnalyze || busyRef.current) return;
      var parts = splitDataUrl(photo.dataUrl);
      if (!parts) { setErr(_t('stem.accessLens.err_photo', 'That photo could not be loaded. Please try another one.')); return; }
      var band = ctx.gradeBand || 'g68';
      var uiLang = '';
      try { uiLang = uiLanguageName(document.documentElement && document.documentElement.lang); } catch (_) {}
      var prompt =
        m === 'describe' ? describePrompt(band, uiLang) :
        m === 'read' ? readPrompt() :
        m === 'translate' ? translatePrompt(targetLang || 'Spanish') :
        inquirePrompt(band, uiLang);
      busyRef.current = m;
      setBusy(m); setErr('');
      if (m === 'inquire') setGuessShown(false);
      var token = photoTokenRef.current;
      announce(_t('stem.accessLens.sr_analyzing', 'Analyzing your photo.'));
      withTimeout(vision(prompt, parts.base64, parts.mime), VISION_TIMEOUT_MS).then(function (text) {
        // The photo this describes is gone or replaced; saying anything now
        // would attach it to whatever is on screen instead.
        if (token !== photoTokenRef.current) return;
        busyRef.current = '';
        setBusy('');
        if (!text) {
          setErr(_t('stem.accessLens.err_ai', 'The AI could not answer right now. Please try again.'));
          return;
        }
        // Parse ONCE, before storing. Reading the value back out of the
        // setResults updater would depend on React running it before this
        // continues, which under batching it may not -- the announcement would
        // silently fall back to "Analysis ready."
        var parsed =
          m === 'translate' ? parseTranslation(text) :
          m === 'inquire' ? (parseInquire(text) || { raw: String(text) }) :
          m === 'describe' ? (parseDescribe(text) || { description: String(text).trim(), usable: true, problem: '', unsure: [], structured: false }) :
          String(text).trim();
        // The language this translation is IN, fixed at request time, so a later
        // change of the list cannot read it with the wrong voice.
        if (m === 'translate' && parsed && !parsed.none) parsed.lang = targetLang || 'Spanish';
        setResults(function (r) {
          var n = Object.assign({}, r);
          n[m] = parsed;
          return n;
        });
        if (m === 'describe') markQuest('described');
        else if (m === 'read') markQuest('readText');
        else if (m === 'translate') markQuest('translated');
        else markQuest('inquired');
        var spoken = resultAnnouncement(m, parsed,
          _t('stem.accessLens.no_text', 'No readable text was found in this photo. Try getting closer or adding more light.'),
          _t('stem.accessLens.sr_more_below', 'The observations, questions and a way to test the guess are below.'), _t);
        announce(spoken || _t('stem.accessLens.sr_done', 'Analysis ready.'));
        // Move to the result only if the student is still on the Analyze
        // button (or focus was lost); never pull them away from somewhere else.
        try {
          var active = document.activeElement;
          if (!active || active === document.body || active === analyzeBtnRef.current) pendingFocusRef.current = 'result';
        } catch (_) {}
      }).catch(function (e) {
        if (token !== photoTokenRef.current) return;
        busyRef.current = '';
        setBusy('');
        setErr(e && e.accessLensTimeout
          ? _t('stem.accessLens.err_timeout', 'The AI took too long to answer. Check the internet connection and press Analyze again.')
          : _t('stem.accessLens.err_ai', 'The AI could not answer right now. Please try again.'));
      });
    }

    // ── read-aloud: prefer the app TTS (user-initiated, so force:true past the
    //    header mute), fall back to the browser's built-in voice ──
    // lang: an English language name (Translate) so the right voice reads it.
    function speak(text, lang) {
      if (!text) return;
      stopSpeech();
      var token = speechTokenRef.current;
      var cx = ctxRef.current;
      if (cx && typeof cx.callTTS === 'function') {
        setSpeaking(true);
        var opts = { force: true };
        if (lang) opts.language = lang;
        if (typeof AbortController !== 'undefined') {
          try { speechCtlRef.current = new AbortController(); opts.signal = speechCtlRef.current.signal; } catch (_) {}
        }
        Promise.resolve(cx.callTTS(text, null, null, opts)).then(function (url) {
          if (token !== speechTokenRef.current) return;
          speechCtlRef.current = null;
          if (url) {
            // The host plays the audio and reports no end, so Stop stays
            // available for about as long as the speech should last.
            speechTimerRef.current = setTimeout(function () {
              speechTimerRef.current = null;
              if (token === speechTokenRef.current) setSpeaking(false);
            }, Math.max(2500, Math.round(String(text).length * 75)));
            return;
          }
          browserSpeak(text, lang, token);
        }).catch(function () { if (token === speechTokenRef.current) browserSpeak(text, lang, token); });
        return;
      }
      browserSpeak(text, lang, token);
    }
    function browserSpeak(text, lang, token) {
      if (typeof window === 'undefined' || !window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') {
        setSpeaking(false); return;
      }
      try {
        var u = new SpeechSynthesisUtterance(text);
        u.rate = 0.95;
        var code = langCodeOf(lang);
        if (code) u.lang = code;
        var done = function () { if (token === undefined || token === speechTokenRef.current) setSpeaking(false); };
        u.onend = done;
        u.onerror = done;
        setSpeaking(true);
        // One voice at a time: a device voice the host may have started is replaced, not doubled.
        try { window.speechSynthesis.cancel(); } catch (_) {}
        window.speechSynthesis.speak(u);
      } catch (_) { setSpeaking(false); }
    }

    // ════════════════════ UI helpers ════════════════════
    function btn(label, onClick, opts) {
      opts = opts || {};
      // ariaDisabled keeps the button focusable (a disabled button drops focus
      // and is skipped by Tab, so its reason was unreachable); clicks are ignored.
      var off = !!opts.disabled || !!opts.ariaDisabled;
      var activeFill = !!opts.pressed || !!opts.primary;
      return h('button', {
        key: opts.key, type: 'button', className: 'accesslens-btn', ref: opts.ref,
        onClick: opts.ariaDisabled ? function (e) { if (e && e.preventDefault) e.preventDefault(); } : onClick,
        disabled: !!opts.disabled,
        'aria-disabled': opts.ariaDisabled ? 'true' : undefined,
        'aria-describedby': opts.describedBy || undefined,
        'aria-expanded': opts.expanded === undefined ? undefined : (opts.expanded ? 'true' : 'false'),
        'aria-controls': opts.controls || undefined,
        'aria-pressed': opts.pressed === undefined ? undefined : !!opts.pressed,
        title: opts.title || undefined,
        style: Object.assign({
          padding: '8px 14px', borderRadius: '10px', cursor: off ? 'not-allowed' : 'pointer',
          fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap',
          border: (contrast ? '2px solid ' : '1px solid ') + (activeFill ? C.btnBorder : C.border),
          background: activeFill ? C.btnBg : C.panel,
          color: activeFill ? C.btnText : C.text,
          opacity: off ? 0.55 : 1,
          boxShadow: activeFill && !contrast ? '0 2px 6px rgba(3,105,161,0.22)' : 'none'
        }, opts.style || {})
      }, splitButtonLabel(label));
    }

    // Every button label was a flat string beginning with a decorative emoji,
    // so a screen reader announced "speaker with three sound waves Read aloud"
    // and "wastebasket Clear photo". The tab strip already hides its icons
    // (aria-hidden on the icon span); the buttons did not. Splitting here fixes
    // all of them at once, and leaves a label with no emoji untouched.
    function splitButtonLabel(label) {
      if (typeof label !== 'string') return label;
      var space = label.indexOf(' ');
      if (space <= 0) return label;
      var lead = label.slice(0, space);
      if (!DECORATIVE_LEAD.test(lead)) return label;
      var rest = label.slice(space + 1);
      if (!rest) return label;
      return [
        h('span', { key: 'i', 'aria-hidden': 'true' }, lead + ' '),
        h('span', { key: 't' }, rest)
      ];
    }

    function card(children, style) {
      return h('div', {
        style: Object.assign({
          background: C.panel,
          border: (contrast ? '2px solid ' : '1px solid ') + C.border,
          borderRadius: '14px',
          padding: '14px 16px',
          boxShadow: C.shadow,
          minWidth: 0
        }, style || {})
      }, children);
    }

    // Offline synthetic practice photo generator (100% local in-memory canvas, FERPA safe)
    function loadPracticeScene(kind) {
      if (typeof document === 'undefined') return;
      try {
        var cv = document.createElement('canvas');
        cv.setAttribute('aria-hidden', 'true');
        cv.width = 720; cv.height = 460;
        var g = cv.getContext('2d');
        if (!g) return;
        var hasLin = typeof g.createLinearGradient === 'function';
        var hasRad = typeof g.createRadialGradient === 'function';
        var fillRoundRect = function (x, y, w, hgt, r) {
          var rad = Math.min(r, w / 2, hgt / 2);
          g.beginPath();
          g.moveTo(x + rad, y);
          g.lineTo(x + w - rad, y);
          g.quadraticCurveTo(x + w, y, x + w, y + rad);
          g.lineTo(x + w, y + hgt - rad);
          g.quadraticCurveTo(x + w, y + hgt, x + w - rad, y + hgt);
          g.lineTo(x + rad, y + hgt);
          g.quadraticCurveTo(x, y + hgt, x, y + hgt - rad);
          g.lineTo(x, y + rad);
          g.quadraticCurveTo(x, y, x + rad, y);
          g.closePath();
        };
        if (kind === 'handout') {
          if (hasLin) {
            var bgH = g.createLinearGradient(0, 0, 720, 460);
            bgH.addColorStop(0, '#eef4f9'); bgH.addColorStop(0.5, '#f8fafc'); bgH.addColorStop(1, '#e2ebf4');
            g.fillStyle = bgH;
          } else { g.fillStyle = '#f8fafc'; }
          g.fillRect(0, 0, 720, 460);
          // Subtle lab-sheet card elevation shadow
          g.fillStyle = 'rgba(15,23,42,0.08)';
          fillRoundRect(30, 26, 666, 412, 12); g.fill();
          g.fillStyle = '#ffffff';
          fillRoundRect(26, 20, 668, 414, 12); g.fill();
          g.strokeStyle = '#cbd5e1'; g.lineWidth = 1.5; g.stroke();
          // Header banner with subtle optical sheen
          if (hasLin) {
            var hdrH = g.createLinearGradient(36, 32, 684, 104);
            hdrH.addColorStop(0, '#0c4a6e'); hdrH.addColorStop(0.55, '#0369a1'); hdrH.addColorStop(1, '#0284c7');
            g.fillStyle = hdrH;
          } else { g.fillStyle = '#0369a1'; }
          fillRoundRect(36, 32, 648, 72, 8); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.12)';
          fillRoundRect(36, 32, 648, 28, 8); g.fill();
          g.fillStyle = '#ffffff'; g.font = 'bold 30px sans-serif';
          g.fillText('SCIENCE LAB STATION 4', 60, 78);
          // Ruled horizontal notebook guides
          g.strokeStyle = 'rgba(148,163,184,0.22)'; g.lineWidth = 1;
          for (var ly = 170; ly <= 316; ly += 46) {
            g.beginPath(); g.moveTo(56, ly); g.lineTo(664, ly); g.stroke();
          }
          g.fillStyle = '#0f172a'; g.font = 'bold 24px sans-serif';
          g.fillText('Today\'s Investigation Steps:', 56, 152);
          g.font = '22px sans-serif';
          g.fillText('1. Measure 50 mL of warm water in the beaker.', 56, 204);
          g.fillText('2. Place one sugar cube in the dish.', 56, 250);
          g.fillText('3. Record the time until it dissolves.', 56, 296);
          if (hasLin) {
            var boxH = g.createLinearGradient(56, 340, 664, 414);
            boxH.addColorStop(0, '#e0f2fe'); boxH.addColorStop(1, '#bae6fd');
            g.fillStyle = boxH;
          } else { g.fillStyle = '#e0f2fe'; }
          fillRoundRect(56, 340, 608, 74, 8); g.fill();
          g.strokeStyle = '#0284c7'; g.lineWidth = 3; g.stroke();
          g.fillStyle = '#0c4a6e'; g.font = 'bold 20px sans-serif';
          g.fillText('Remember: Rinse glassware and return goggles to Tray B.', 74, 384);
        } else if (kind === 'leaf') {
          if (hasLin) {
            var bgL = g.createLinearGradient(0, 0, 720, 460);
            bgL.addColorStop(0, '#ecfdf5'); bgL.addColorStop(1, '#d1fae5');
            g.fillStyle = bgL;
          } else { g.fillStyle = '#ecfdf5'; }
          g.fillRect(0, 0, 720, 460);
          // Specimen mounting board with soft inner shadow
          g.fillStyle = 'rgba(6,78,59,0.10)';
          fillRoundRect(44, 44, 640, 380, 12); g.fill();
          g.fillStyle = '#f0fdf4';
          fillRoundRect(40, 40, 640, 380, 12); g.fill();
          g.strokeStyle = '#059669'; g.lineWidth = 3.5; g.stroke();
          // Subtle botanical grid lines
          g.strokeStyle = 'rgba(5,150,105,0.11)'; g.lineWidth = 1;
          for (var gx = 80; gx < 660; gx += 40) { g.beginPath(); g.moveTo(gx, 46); g.lineTo(gx, 414); g.stroke(); }
          for (var gy = 80; gy < 400; gy += 40) { g.beginPath(); g.moveTo(46, gy); g.lineTo(674, gy); g.stroke(); }
          // Soft leaf cast shadow
          g.fillStyle = 'rgba(6,78,59,0.18)';
          g.beginPath();
          g.moveTo(190, 330);
          g.quadraticCurveTo(220, 120, 470, 130);
          g.quadraticCurveTo(440, 320, 190, 330);
          g.fill();
          // Stylized botanical leaf specimen with chlorophyll gradient
          if (hasLin) {
            var leafGrad = g.createLinearGradient(180, 320, 460, 120);
            leafGrad.addColorStop(0, '#166534'); leafGrad.addColorStop(0.5, '#15803d'); leafGrad.addColorStop(1, '#22c55e');
            g.fillStyle = leafGrad;
          } else { g.fillStyle = '#15803d'; }
          g.beginPath();
          g.moveTo(180, 320);
          g.quadraticCurveTo(210, 110, 460, 120);
          g.quadraticCurveTo(430, 310, 180, 320);
          g.fill();
          g.strokeStyle = '#14532d'; g.lineWidth = 2; g.stroke();
          // Central midrib & lateral veins
          g.strokeStyle = '#bbf7d0'; g.lineWidth = 4; g.lineCap = 'round';
          g.beginPath(); g.moveTo(156, 340); g.lineTo(445, 130); g.stroke();
          g.lineWidth = 2.5;
          g.beginPath(); g.moveTo(250, 270); g.lineTo(240, 195); g.moveTo(310, 228); g.lineTo(300, 160); g.moveTo(368, 188); g.lineTo(360, 138); g.stroke();
          g.beginPath(); g.moveTo(265, 258); g.lineTo(335, 265); g.moveTo(325, 215); g.lineTo(395, 220); g.stroke();
          // Glossy dewdrop highlight on leaf blade
          if (hasRad) {
            var dew = g.createRadialGradient(342, 194, 1, 345, 197, 8);
            dew.addColorStop(0, 'rgba(255,255,255,0.92)'); dew.addColorStop(0.5, 'rgba(187,247,208,0.55)'); dew.addColorStop(1, 'rgba(21,128,61,0)');
            g.fillStyle = dew;
            g.beginPath(); g.arc(345, 197, 8, 0, Math.PI * 2); g.fill();
          }
          // Specimen placard
          g.fillStyle = 'rgba(255,255,255,0.88)';
          fillRoundRect(442, 260, 218, 118, 8); g.fill();
          g.strokeStyle = '#6ee7b7'; g.lineWidth = 1.5; g.stroke();
          g.fillStyle = '#064e3b'; g.font = 'bold 23px sans-serif';
          g.fillText('Specimen Card #12', 454, 290);
          g.font = '18px sans-serif';
          g.fillText('Serrated margin, net veins', 454, 324);
          g.fillText('Collected: Courtyard Oak', 454, 356);
        } else {
          if (hasLin) {
            var bgS = g.createLinearGradient(0, 0, 720, 460);
            bgS.addColorStop(0, '#fffbeb'); bgS.addColorStop(1, '#fef3c7');
            g.fillStyle = bgS;
          } else { g.fillStyle = '#fffbeb'; }
          g.fillRect(0, 0, 720, 460);
          // Placard frame shadow & bevel
          g.fillStyle = 'rgba(30,41,59,0.10)';
          fillRoundRect(38, 34, 648, 396, 14); g.fill();
          g.fillStyle = '#fffdf7';
          fillRoundRect(34, 30, 650, 396, 14); g.fill();
          g.strokeStyle = '#d97706'; g.lineWidth = 2; g.stroke();
          if (hasLin) {
            var hdrS = g.createLinearGradient(48, 44, 672, 136);
            hdrS.addColorStop(0, '#1e3a8a'); hdrS.addColorStop(0.5, '#1d4ed8'); hdrS.addColorStop(1, '#2563eb');
            g.fillStyle = hdrS;
          } else { g.fillStyle = '#1d4ed8'; }
          fillRoundRect(48, 44, 624, 92, 10); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.12)';
          fillRoundRect(48, 44, 624, 34, 10); g.fill();
          g.fillStyle = '#ffffff'; g.font = 'bold 34px sans-serif';
          g.fillText('COMMUNITY LIBRARY HOURS', 100, 102);
          g.fillStyle = '#1e293b'; g.font = 'bold 24px sans-serif';
          g.fillText('Monday - Thursday: 8:00 AM to 5:30 PM', 84, 200);
          g.fillText('Friday: 8:00 AM to 3:30 PM', 84, 252);
          if (hasLin) {
            var callS = g.createLinearGradient(84, 298, 636, 390);
            callS.addColorStop(0, '#fef3c7'); callS.addColorStop(1, '#fde68a');
            g.fillStyle = callS;
          } else { g.fillStyle = '#fef3c7'; }
          fillRoundRect(84, 298, 552, 92, 8); g.fill();
          g.strokeStyle = '#d97706'; g.lineWidth = 3; g.stroke();
          g.fillStyle = '#92400e'; g.font = 'bold 22px sans-serif';
          g.fillText('Quiet study tables are on the second floor.', 110, 340);
          g.fillText('Ask at the front desk for Braille or audio books.', 110, 374);
        }
        // Subtle optical camera-lens corner vignette on the synthetic capture
        if (hasRad) {
          var vig = g.createRadialGradient(360, 230, 190, 360, 230, 440);
          vig.addColorStop(0, 'rgba(15,23,42,0)');
          vig.addColorStop(1, 'rgba(15,23,42,0.12)');
          g.fillStyle = vig;
          g.fillRect(0, 0, 720, 460);
        }
        acceptPhoto(cv.toDataURL('image/jpeg', 0.88), 'practice scene');
      } catch (_) {}
    }

    // ════════════════════ Interactive Optical Viewfinder & Pipeline SVG ════════════════════
    function renderOpticalStage() {
      var strokePrimary = contrast ? '#ffff00' : (dark ? '#38bdf8' : '#0ea5e9');
      var strokeSecondary = contrast ? '#00ff00' : (dark ? '#34d399' : '#10b981');
      var strokeAmber = contrast ? '#ffff00' : '#fbbf24';
      var strokeMuted = contrast ? '#ffffff' : (dark ? '#334155' : '#475569');
      var bgStage = contrast ? '#000000' : (dark ? '#050b16' : '#0b1324');
      var cardStage = contrast ? '#000000' : (dark ? '#0c182c' : '#132038');
      var txtMain = contrast ? '#ffff00' : '#f8fafc';
      var txtSub = contrast ? '#ffffff' : '#cbd5e1';

      var hasPhoto = !!photo;
      var hasResult = !!results[mode];
      var step1Done = hasPhoto;
      var step2Done = hasResult;
      var step3Done = speaking || lensesExploredCount > 0 || hasResult;

      var modeTitle = mode === 'describe' ? _t('stem.accessLens.stage_describe', 'Spatial Scene + Audio')
        : mode === 'read' ? _t('stem.accessLens.stage_read', 'Large-Print OCR Reader')
        : mode === 'translate' ? _t('stem.accessLens.stage_translate', 'Bilingual Text Bridge')
        : _t('stem.accessLens.stage_inquire', 'Socratic Inquiry Lens');

      var modeDetail = mode === 'describe' ? _t('stem.accessLens.stage_describe_sub', 'Left / Center / Right layout')
        : mode === 'read' ? _t('stem.accessLens.stage_read_sub', 'Magnify 16px to 96px')
        : mode === 'translate' ? _t('stem.accessLens.stage_translate_sub', 'Target: ') + String(targetLang || 'Spanish').slice(0, 18)
        : _t('stem.accessLens.stage_inquire_sub', 'Observe first, guess later');

      // Mode-specific viewfinder center artwork
      var lensGraphic = mode === 'describe'
        ? h('g', null,
            h('line', { x1: 118, y1: 40, x2: 118, y2: 138, stroke: strokeMuted, strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.75 }),
            h('line', { x1: 212, y1: 40, x2: 212, y2: 138, stroke: strokeMuted, strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.75 }),
            h('text', { x: 74, y: 54, fill: txtSub, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', textAnchor: 'middle' }, 'LEFT'),
            h('text', { x: 165, y: 54, fill: strokePrimary, fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', textAnchor: 'middle' }, 'CENTER'),
            h('text', { x: 256, y: 54, fill: txtSub, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', textAnchor: 'middle' }, 'RIGHT'),
            // Optical lens bezel with subtle refraction glow
            h('circle', { cx: 165, cy: 95, r: 30, fill: contrast ? 'none' : 'url(#al-lens-glass)', stroke: strokePrimary, strokeWidth: 1.4, opacity: 0.9 }),
            h('circle', { cx: 165, cy: 95, r: 23, fill: 'none', stroke: strokePrimary, strokeWidth: 2, filter: contrast ? undefined : 'url(#al-glow)' }),
            h('circle', { cx: 165, cy: 95, r: 14, fill: 'none', stroke: strokeSecondary, strokeWidth: 1.2, strokeDasharray: '3 3', opacity: 0.8 }),
            h('circle', { cx: 165, cy: 95, r: 7.5, fill: strokePrimary, opacity: 0.9 }),
            // Specular glass highlight crescent
            !contrast ? h('path', { d: 'M146 80 A23 23 0 0 1 174 73', fill: 'none', stroke: '#ffffff', strokeWidth: 2, strokeLinecap: 'round', opacity: 0.55 }) : null,
            // Acoustic read-aloud emission arcs
            h('path', { className: 'accesslens-ring-pulse', d: 'M203 82 Q216 95 203 108', fill: 'none', stroke: strokeSecondary, strokeWidth: 2.3, strokeLinecap: 'round', filter: contrast ? undefined : 'url(#al-glow)' }),
            h('path', { className: 'accesslens-ring-pulse', d: 'M213 73 Q231 95 213 117', fill: 'none', stroke: strokeSecondary, strokeWidth: 1.8, strokeLinecap: 'round', opacity: 0.72 }),
            h('path', { d: 'M127 84 Q116 95 127 106', fill: 'none', stroke: strokePrimary, strokeWidth: 1.5, strokeLinecap: 'round', opacity: 0.5 })
          )
        : mode === 'read'
        ? h('g', null,
            h('rect', { x: 56, y: 48, width: 218, height: 82, rx: 8, fill: cardStage, stroke: strokePrimary, strokeWidth: 1.4 }),
            // Split-comparison loupe divider (Left: raw fine print, Right: magnified high-legibility OCR)
            h('rect', { x: 64, y: 60, width: 78, height: 5, rx: 2.5, fill: txtSub, opacity: 0.45 }),
            h('rect', { x: 64, y: 71, width: 70, height: 5, rx: 2.5, fill: txtSub, opacity: 0.35 }),
            h('rect', { x: 64, y: 82, width: 74, height: 5, rx: 2.5, fill: txtSub, opacity: 0.4 }),
            h('rect', { x: 64, y: 93, width: 64, height: 5, rx: 2.5, fill: txtSub, opacity: 0.32 }),
            h('rect', { x: 64, y: 104, width: 72, height: 5, rx: 2.5, fill: txtSub, opacity: 0.38 }),
            // Right magnified optical pane
            h('rect', { x: 154, y: 50, width: 118, height: 78, rx: 6, fill: contrast ? '#000000' : 'rgba(14,165,233,0.12)' }),
            h('text', { x: 164, y: 84, fill: strokePrimary, fontSize: 22, fontWeight: 800, filter: contrast ? undefined : 'url(#al-glow)' }, 'Aa'),
            h('rect', { x: 202, y: 66, width: 60, height: 8, rx: 4, fill: txtMain, opacity: 0.95 }),
            h('rect', { x: 202, y: 81, width: 48, height: 8, rx: 4, fill: strokeSecondary, opacity: 0.88 }),
            h('rect', { x: 164, y: 102, width: 96, height: 8, rx: 4, fill: txtSub, opacity: 0.82 }),
            // Crisp vertical split-comparison loupe rail + specular handle
            h('line', { x1: 154, y1: 42, x2: 154, y2: 136, stroke: strokeSecondary, strokeWidth: 2.2, filter: contrast ? undefined : 'url(#al-glow)' }),
            h('circle', { cx: 154, cy: 89, r: 9.5, fill: cardStage, stroke: strokeSecondary, strokeWidth: 2 }),
            h('path', { d: 'M151 86 L148.5 89 L151 92 M157 86 L159.5 89 L157 92', fill: 'none', stroke: txtMain, strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }),
            // Animated optical OCR scan beam (reduced-motion gated)
            h('line', { className: 'accesslens-scan-beam', x1: 58, y1: 89, x2: 272, y2: 89, stroke: strokePrimary, strokeWidth: 1.5, strokeDasharray: '5 4', opacity: 0.78 })
          )
        : mode === 'translate'
        ? h('g', null,
            h('rect', { x: 50, y: 54, width: 90, height: 68, rx: 8, fill: cardStage, stroke: strokeMuted, strokeWidth: 1.5 }),
            h('line', { x1: 62, y1: 66, x2: 128, y2: 66, stroke: strokeMuted, strokeWidth: 1.5, opacity: 0.45 }),
            h('text', { x: 95, y: 87, fill: txtMain, fontSize: 13.5, fontWeight: 800, textAnchor: 'middle' }, 'TEXT'),
            h('text', { x: 95, y: 107, fill: txtSub, fontSize: 9.5, fontWeight: 700, textAnchor: 'middle' }, 'SOURCE'),
            // Luminous optical translation bridge arcs
            h('path', { d: 'M144 82 Q165 68 186 82', fill: 'none', stroke: strokePrimary, strokeWidth: 2, strokeLinecap: 'round', filter: contrast ? undefined : 'url(#al-glow)' }),
            h('path', { d: 'M146 92 L182 92 M176 86 L183 92 L176 98', fill: 'none', stroke: strokeSecondary, strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' }),
            h('circle', { className: 'accesslens-ring-pulse', cx: 165, cy: 75, r: 3, fill: strokeAmber }),
            h('rect', { x: 188, y: 54, width: 94, height: 68, rx: 8, fill: contrast ? '#000000' : 'url(#al-card-tint)', stroke: strokePrimary, strokeWidth: 2 }),
            h('text', { x: 235, y: 86, fill: strokePrimary, fontSize: 13.5, fontWeight: 800, textAnchor: 'middle' }, String(langCodeOf(targetLang) || 'LANG').toUpperCase()),
            h('text', { x: 235, y: 107, fill: txtSub, fontSize: 9.5, fontWeight: 700, textAnchor: 'middle' }, String(targetLang || 'Target').slice(0, 10))
          )
        : h('g', null,
            // Incident beam + glass optical dispersion prism + luminous spectral response curves
            h('line', { x1: 58, y1: 88, x2: 136, y2: 88, stroke: txtMain, strokeWidth: 2.2, strokeDasharray: '5 3', opacity: 0.9 }),
            h('polygon', { points: '165,46 118,128 212,128', fill: contrast ? '#000000' : 'url(#al-lens-glass)', stroke: strokePrimary, strokeWidth: 2.2, strokeLinejoin: 'round' }),
            !contrast ? h('line', { x1: 165, y1: 52, x2: 130, y2: 118, stroke: '#ffffff', strokeWidth: 1.4, opacity: 0.42 }) : null,
            h('text', { x: 165, y: 109, fill: strokeSecondary, fontSize: 23, fontWeight: 800, textAnchor: 'middle' }, '?'),
            // Refracted spectral curves (S / M / L luminous optical bands)
            h('path', { d: 'M194 78 Q228 62 272 64', fill: 'none', stroke: strokePrimary, strokeWidth: 2.4, strokeLinecap: 'round', filter: contrast ? undefined : 'url(#al-glow)' }),
            h('path', { d: 'M198 94 Q232 90 272 92', fill: 'none', stroke: strokeSecondary, strokeWidth: 2.4, strokeLinecap: 'round', filter: contrast ? undefined : 'url(#al-glow)' }),
            h('path', { d: 'M202 110 Q234 120 272 122', fill: 'none', stroke: strokeAmber, strokeWidth: 2.2, strokeLinecap: 'round' })
          );

      var stepFill = function (done, active) {
        if (done) return strokeSecondary;
        if (active) return strokePrimary;
        return strokeMuted;
      };
      var progressX = step3Done ? 590 : (step2Done ? 533 : (step1Done ? 477 : 364));

      return h('div', {
        style: {
          borderRadius: '12px',
          overflow: 'hidden',
          border: (contrast ? '2px solid ' : '1px solid ') + (contrast ? '#ffff00' : (dark ? '#1e3a5f' : '#1e293b')),
          background: bgStage,
          boxShadow: contrast ? 'none' : 'inset 0 1px 0 rgba(186,230,253,0.14), 0 6px 18px rgba(2,6,23,0.28)'
        }
      },
        h('svg', {
          viewBox: '0 0 640 176',
          width: '100%',
          style: { display: 'block', maxHeight: '196px' },
          role: 'img',
          'aria-label': _t('stem.accessLens.stage_aria', 'Optical viewfinder and 3-step accessibility workflow diagram for ') + modeTitle
        },
          !contrast ? h('defs', null,
            h('radialGradient', { id: 'al-stage-bg', cx: '26%', cy: '50%', r: '78%' },
              h('stop', { offset: '0%', stopColor: dark ? '#0f2544' : '#142a4a' }),
              h('stop', { offset: '65%', stopColor: bgStage }),
              h('stop', { offset: '100%', stopColor: '#030712' })
            ),
            h('radialGradient', { id: 'al-lens-glass', cx: '36%', cy: '32%', r: '68%' },
              h('stop', { offset: '0%', stopColor: 'rgba(186,230,253,0.34)' }),
              h('stop', { offset: '55%', stopColor: 'rgba(14,165,233,0.14)' }),
              h('stop', { offset: '100%', stopColor: 'rgba(2,132,199,0.03)' })
            ),
            h('linearGradient', { id: 'al-card-tint', x1: '0%', y1: '0%', x2: '100%', y2: '100%' },
              h('stop', { offset: '0%', stopColor: 'rgba(56,189,248,0.18)' }),
              h('stop', { offset: '100%', stopColor: 'rgba(15,23,42,0.88)' })
            ),
            h('linearGradient', { id: 'al-bezel-sheen', x1: '0%', y1: '0%', x2: '100%', y2: '100%' },
              h('stop', { offset: '0%', stopColor: 'rgba(186,230,253,0.52)' }),
              h('stop', { offset: '45%', stopColor: 'rgba(56,189,248,0.16)' }),
              h('stop', { offset: '100%', stopColor: 'rgba(52,211,153,0.38)' })
            ),
            h('filter', { id: 'al-glow', x: '-25%', y: '-25%', width: '150%', height: '150%' },
              h('feGaussianBlur', { stdDeviation: '2.2', result: 'blur' }),
              h('feMerge', null, h('feMergeNode', { in: 'blur' }), h('feMergeNode', { in: 'SourceGraphic' }))
            )
          ) : null,
          // Atmospheric optical chamber backdrop
          h('rect', { x: 0, y: 0, width: 640, height: 176, fill: contrast ? bgStage : 'url(#al-stage-bg)' }),
          // Calibrated micro-grid inside optical bench
          !contrast ? h('g', { stroke: '#38bdf8', strokeWidth: 0.6, opacity: 0.09 },
            [60, 120, 180, 240, 300, 360, 420, 480, 540, 600].map(function (gx) {
              return h('line', { key: 'gx' + gx, x1: gx, y1: 0, x2: gx, y2: 176 });
            }),
            [44, 88, 132].map(function (gy) {
              return h('line', { key: 'gy' + gy, x1: 0, y1: gy, x2: 640, y2: gy });
            })
          ) : null,
          // Left viewfinder glass bezel housing
          h('rect', { x: 20, y: 12, width: 290, height: 152, rx: 13, fill: 'none', stroke: contrast ? strokeMuted : 'url(#al-bezel-sheen)', strokeWidth: 1.6 }),
          h('rect', { x: 24, y: 16, width: 282, height: 144, rx: 10, fill: cardStage, stroke: strokeMuted, strokeWidth: 1.1 }),
          // Specular upper glass reflection across viewfinder
          !contrast ? h('path', { d: 'M30 22 L300 22 L300 44 Q165 30 30 44 Z', fill: 'rgba(224,242,254,0.06)' }) : null,
          // Optical calibration tick marks along top & bottom edges
          h('g', { stroke: strokeMuted, strokeWidth: 1, opacity: 0.65 },
            [85, 125, 165, 205, 245].map(function (tx) {
              return h('g', { key: 'tk' + tx },
                h('line', { x1: tx, y1: 18, x2: tx, y2: tx === 165 ? 25 : 22 }),
                h('line', { x1: tx, y1: tx === 165 ? 151 : 154, x2: tx, y2: 158 })
              );
            })
          ),
          // Precision corner reticle brackets
          h('path', { d: 'M36 42 L36 26 L52 26 M278 26 L294 26 L294 42 M36 134 L36 150 L52 150 M278 150 L294 150 L294 134', fill: 'none', stroke: hasPhoto ? strokeSecondary : strokePrimary, strokeWidth: 2.5, strokeLinecap: 'round', filter: contrast ? undefined : 'url(#al-glow)' }),
          lensGraphic,
          h('text', { x: 165, y: 150, fill: hasPhoto ? strokeSecondary : txtSub, fontSize: 10.2, fontWeight: 800, letterSpacing: '0.06em', textAnchor: 'middle' },
            hasPhoto ? _t('stem.accessLens.stage_locked', 'IMAGE READY IN MEMORY') : _t('stem.accessLens.stage_standby', 'VIEWFINDER STANDBY')),
          // Right pipeline panel
          h('text', { x: 332, y: 33, fill: strokePrimary, fontSize: 11, fontWeight: 800, letterSpacing: '0.05em' }, modeTitle.toUpperCase()),
          h('text', { x: 332, y: 49, fill: txtSub, fontSize: 11 }, modeDetail),
          // Calibrated optical signal / contrast meter bar
          h('rect', { x: 332, y: 58, width: 282, height: 4, rx: 2, fill: strokeMuted, opacity: 0.45 }),
          h('rect', { x: 332, y: 58, width: Math.max(46, Math.round(((lensesExploredCount + (hasPhoto ? 1 : 0)) / 5) * 282)), height: 4, rx: 2, fill: hasPhoto ? strokeSecondary : strokePrimary }),
          // Connector track (base dashed + active luminous progress rail)
          h('line', { x1: 364, y1: 94, x2: 590, y2: 94, stroke: strokeMuted, strokeWidth: 2, strokeDasharray: '4 4' }),
          progressX > 364 ? h('line', { x1: 364, y1: 94, x2: progressX, y2: 94, stroke: strokeSecondary, strokeWidth: 2.6, strokeLinecap: 'round', filter: contrast ? undefined : 'url(#al-glow)' }) : null,
          // Step 1
          h('circle', { cx: 364, cy: 94, r: 20, fill: 'none', stroke: stepFill(step1Done, !step1Done), strokeWidth: 1, opacity: 0.35 }),
          h('circle', { cx: 364, cy: 94, r: 16, fill: cardStage, stroke: stepFill(step1Done, !step1Done), strokeWidth: 2.5 }),
          h('text', { x: 364, y: 98, fill: txtMain, fontSize: 12, fontWeight: 800, textAnchor: 'middle' }, step1Done ? 'OK' : '1'),
          h('text', { x: 364, y: 128, fill: txtMain, fontSize: 11, fontWeight: 700, textAnchor: 'middle' }, _t('stem.accessLens.step_capture', 'Capture')),
          h('text', { x: 364, y: 143, fill: txtSub, fontSize: 10, textAnchor: 'middle' }, hasPhoto ? _t('stem.accessLens.step_done', 'Loaded') : _t('stem.accessLens.step_local', 'Local only')),
          // Step 2
          h('circle', { cx: 477, cy: 94, r: 20, fill: 'none', stroke: stepFill(step2Done, step1Done && !step2Done), strokeWidth: 1, opacity: 0.35 }),
          h('circle', { cx: 477, cy: 94, r: 16, fill: cardStage, stroke: stepFill(step2Done, step1Done && !step2Done), strokeWidth: 2.5 }),
          h('text', { x: 477, y: 98, fill: txtMain, fontSize: 12, fontWeight: 800, textAnchor: 'middle' }, step2Done ? 'OK' : '2'),
          h('text', { x: 477, y: 128, fill: txtMain, fontSize: 11, fontWeight: 700, textAnchor: 'middle' }, _t('stem.accessLens.step_lens', 'Analyze')),
          h('text', { x: 477, y: 143, fill: txtSub, fontSize: 10, textAnchor: 'middle' }, busy ? _t('stem.accessLens.step_working', 'Working') : (step2Done ? _t('stem.accessLens.step_ready', 'Ready') : _t('stem.accessLens.step_user', 'On click'))),
          // Step 3
          h('circle', { cx: 590, cy: 94, r: 20, fill: 'none', stroke: stepFill(step3Done, step2Done), strokeWidth: 1, opacity: 0.35 }),
          h('circle', { cx: 590, cy: 94, r: 16, fill: cardStage, stroke: stepFill(step3Done, step2Done), strokeWidth: 2.5 }),
          h('text', { x: 590, y: 98, fill: txtMain, fontSize: 12, fontWeight: 800, textAnchor: 'middle' }, step3Done ? 'OK' : '3'),
          h('text', { x: 590, y: 128, fill: txtMain, fontSize: 11, fontWeight: 700, textAnchor: 'middle' }, _t('stem.accessLens.step_access', 'Access')),
          h('text', { x: 590, y: 143, fill: txtSub, fontSize: 10, textAnchor: 'middle' }, speaking ? _t('stem.accessLens.step_speaking', 'Speaking') : _t('stem.accessLens.step_audio', 'Audio / Print'))
        )
      );
    }

    // The old wording was 11px in the faintest palette colour and told the
    // reader to 'check it against what you can observe yourself' -- advice a
    // blind student, the headline user of this tool, cannot act on. It now
    // names checks that do not require sight, and uses the warn palette at
    // body size so it is legible to the low-vision students who need it.
    function aiDisclaimer() {
      return h('div', { role: 'note', style: { fontSize: '13px', color: C.text, background: C.warnBg, border: '1px solid ' + C.warnBorder, borderRadius: '8px', padding: '8px 10px', marginTop: '8px', lineHeight: 1.5 } },
        _t('stem.accessLens.disclaimer', 'This is an AI guess and it can be confidently wrong. It can miss things that are there and describe things that are not. Ask someone you trust, take another photo from a different angle, or check another way before you rely on it.'));
    }

    function speakBtn(text, lang) {
      return btn(speaking ? '⏹ ' + _t('stem.accessLens.stop_audio', 'Stop') : '🔊 ' + _t('stem.accessLens.read_aloud', 'Read aloud'),
        function () { if (speaking) stopSpeech(); else { speak(text, lang); markQuest('listened'); } },
        { title: _t('stem.accessLens.read_aloud_title', 'Hear this text spoken out loud') });
    }
    // Focus target for a result that just arrived.
    function resultHeading(text) {
      return h('h3', { key: 'rh', ref: resultRef, tabIndex: -1, style: { margin: '0 0 8px', fontSize: '14px', fontWeight: 800, color: C.text, outline: 'none' } }, text);
    }

    // Shared by the photo preview and the Describe panel.
    var describeOut = results.describe && typeof results.describe === 'object' ? results.describe : null;

    // ════════════════════ capture panel ════════════════════
    function renderCapture() {
      var kids = [];
      kids.push(h('div', { key: 'notices', 'data-accesslens-columns': 'true', style: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' } },
        h('div', { key: 'privacy', style: { display: 'flex', gap: '8px', alignItems: 'flex-start', background: C.accentBg, border: '1px solid ' + C.accent, borderRadius: '10px', padding: '9px 11px', minWidth: 0 } },
          h('span', { 'aria-hidden': 'true', style: { fontSize: '15px', flexShrink: 0 } }, '🔒'),
          h('div', { style: { fontSize: '12px', color: C.text, lineHeight: 1.5, minWidth: 0 } },
            h('strong', null, _t('stem.accessLens.privacy_title', 'Your photo stays yours.')), ' ',
            _t('stem.accessLens.privacy_body', 'Photos are never saved by AlloFlow and are only sent to the AI when you press an Analyze button. Please point your camera at things, not at people.'))),
        // Scene-description models miss things that are present and invent things
        // that are not. Every mainstream tool in this category ships this warning,
        // because a student who learns here that 'it describes what is in front of
        // me' will use it outside the classroom. It sits in the capture panel, next
        // to the privacy notice, so it is read BEFORE the first photo rather than
        // under a result. role=note keeps it out of the way of repeat users.
        h('div', { key: 'safety', role: 'note', style: { display: 'flex', gap: '8px', alignItems: 'flex-start', background: C.warnBg, border: '1px solid ' + C.warnBorder, borderRadius: '10px', padding: '9px 11px', minWidth: 0 } },
          h('span', { 'aria-hidden': 'true', style: { fontSize: '15px', flexShrink: 0 } }, '⚠️'),
          h('div', { style: { fontSize: '12.5px', color: C.text, lineHeight: 1.5, minWidth: 0 } },
            h('strong', null, _t('stem.accessLens.safety_title', 'This is for learning, not for staying safe.')), ' ',
            _t('stem.accessLens.safety_body', 'Do not use Access Lens to cross a road, to check whether a path is clear, to identify medicine, to tell if food is safe to eat, or to read a warning label. It can miss a hazard completely. For anything where being wrong would hurt, ask a person.')))));

      kids.push(h('div', { key: 'stage' }, renderOpticalStage()));

      if (camState === 'live' || camState === 'starting') {
        kids.push(h('div', { key: 'live', style: { display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' } },
          h('video', {
            ref: videoRef, muted: true, playsInline: true, autoPlay: true,
            'aria-label': _t('stem.accessLens.live_preview', 'Live camera preview'),
            style: { width: '100%', maxWidth: '440px', borderRadius: '10px', border: '1px solid ' + C.border, background: '#000', minHeight: '120px' }
          }),
          h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
            btn('📸 ' + _t('stem.accessLens.snap', 'Snap photo'), snapFromLive, { primary: true, ariaDisabled: camState !== 'live', ref: snapBtnRef }),
            btn(_t('stem.accessLens.cancel', 'Cancel'), cancelLive))));
      } else {
        var row = [
          h('button', {
            key: 'file', type: 'button', className: 'accesslens-btn', ref: takeBtnRef,
            onClick: function () { if (fileRef.current) fileRef.current.click(); },
            style: { padding: '10px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 800, border: (contrast ? '2px solid ' : '1px solid ') + C.btnBorder, background: C.btnBg, color: C.btnText, boxShadow: contrast ? 'none' : '0 2px 8px rgba(3,105,161,0.28)' }
          }, splitButtonLabel('📷 ' + _t('stem.accessLens.take_photo', 'Take or choose a photo'))),
          btn('🎥 ' + _t('stem.accessLens.live_camera', 'Live camera'), startLiveCamera, { key: 'livecam', ref: liveBtnRef, title: _t('stem.accessLens.live_camera_title', 'Show a live preview and snap from it') })
        ];
        if (camState === 'denied' && camReason !== 'none' && camReason !== 'unsupported') {
          row.push(btn('🪟 ' + _t('stem.accessLens.popout', 'Open camera window'), openLensWindow, { key: 'popout', title: _t('stem.accessLens.popout_title', 'Opens a separate window where the camera is allowed') }));
        }
        kids.push(h('div', { key: 'row', style: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' } }, row));
        // Practice sample chips so desktop/no-camera learners can test immediately
        kids.push(h('div', { key: 'samples', style: { display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', paddingTop: '2px' } },
          h('span', { style: { fontSize: '11.5px', fontWeight: 700, color: C.sub } }, _t('stem.accessLens.try_sample', 'No camera handy? Try a practice image:')),
          [
            { id: 'handout', label: _t('stem.accessLens.sample_handout', 'Lab Station Card') },
            { id: 'leaf', label: _t('stem.accessLens.sample_leaf', 'Leaf Specimen') },
            { id: 'sign', label: _t('stem.accessLens.sample_sign', 'Library Hours Sign') }
          ].map(function (sp) {
            return h('button', {
              key: sp.id, type: 'button', className: 'accesslens-chip',
              onClick: function () { loadPracticeScene(sp.id); },
              style: {
                padding: '5px 10px', borderRadius: '999px', cursor: 'pointer', fontSize: '11.5px', fontWeight: 700,
                border: '1px solid ' + C.border, background: C.soft, color: C.text
              }
            }, sp.label);
          })
        ));
        if (camState === 'denied') {
          kids.push(h('div', { key: 'denied', role: 'status', style: { fontSize: '13px', color: C.text, background: C.warnBg, border: '1px solid ' + C.warnBorder, borderRadius: '8px', padding: '8px 10px', lineHeight: 1.5 } },
            camReason === 'none' ? _t('stem.accessLens.denied_none', 'This device does not have a camera this app can use. The photo button above still works: you can choose a picture that is already on the device.')
            : camReason === 'inuse' ? _t('stem.accessLens.denied_inuse', 'Another app is using the camera right now. Close the other app, such as a video call, and press Live camera again. The photo button above still works meanwhile.')
            : camReason === 'unsupported' ? _t('stem.accessLens.denied_unsupported', 'This browser will not give the page a live camera. The photo button above still works: you can take or choose a picture with it.')
            : camReason === 'denied' ? _t('stem.accessLens.denied_perm', 'Camera permission was refused. You can allow it in the browser address bar and press Live camera again, open the camera window, or use the photo button above.')
            : _t('stem.accessLens.denied_note', 'The live camera did not start. The photo button above still works everywhere, or try the camera window.')));
        }
      }

      kids.push(h('input', {
        key: 'input', ref: fileRef, type: 'file', accept: 'image/*', capture: 'environment',
        onChange: onFileChosen, 'aria-label': _t('stem.accessLens.take_photo', 'Take or choose a photo'), tabIndex: -1,
        style: { position: 'absolute', width: '1px', height: '1px', opacity: 0, overflow: 'hidden', clip: 'rect(0 0 0 0)' }
      }));

      if (photo) {
        kids.push(h('div', { key: 'preview', style: { display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap', padding: '10px 12px', borderRadius: '12px', background: C.soft, border: '1px solid ' + C.border } },
          h('img', {
            src: photo.dataUrl,
            // The description is the visible result right below this image, so
            // repeating 300 characters of it here made a screen reader say the
            // opening twice. What a blind photographer needs from the image
            // itself is whether the shot came out.
            alt: describeOut
              ? (describeOut.usable
                  ? _t('stem.accessLens.photo_alt_ok', 'Your photo. The description is below.')
                  : _t('stem.accessLens.photo_alt_problem', 'Your photo. It may not have come out: ') + (describeOut.problem || _t('stem.accessLens.photo_alt_unclear', 'the picture is unclear.')))
              : _t('stem.accessLens.photo_alt', 'The photo you captured. It is not saved anywhere.'),
            style: { width: '172px', height: 'auto', borderRadius: '10px', border: '2px solid ' + (describeOut && !describeOut.usable ? C.warnBorder : C.accent) }
          }),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px', flex: '1 1 200px', minWidth: 0 } },
            h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' } },
              h('span', { style: { fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '999px', background: C.okBg, border: '1px solid ' + C.okBorder, color: C.text } },
                _t('stem.accessLens.badge_in_memory', 'In-Memory Only')),
              (photo.width && photo.height) ? h('span', { style: { fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: C.panel, border: '1px solid ' + C.border, color: C.sub } }, photo.width + ' × ' + photo.height + ' px') : null,
              describeOut ? h('span', { style: { fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '999px', background: describeOut.usable ? C.okBg : C.warnBg, border: '1px solid ' + (describeOut.usable ? C.okBorder : C.warnBorder), color: C.text } },
                describeOut.usable ? _t('stem.accessLens.shot_clear', 'Shot Clear') : _t('stem.accessLens.shot_retake', 'Retake Suggested')) : null
            ),
            h('div', { style: { fontSize: '12.5px', color: C.text, lineHeight: 1.45 } }, _t('stem.accessLens.photo_ready', 'Photo ready. Pick a mode below, then press Analyze.')),
            h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
              btn('🗑 ' + _t('stem.accessLens.clear_photo', 'Clear photo'), clearPhoto)))));
      }

      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } }, kids);
    }

    // ════════════════════ mode panels ════════════════════
    function analyzeButton(m, label) {
      // No usable vision AI: hide the action, keep one short neutral note.
      if (!vision) return h('div', { role: 'note', style: { fontSize: '11.5px', color: C.sub, lineHeight: 1.5 } }, _t('stem.accessLens.ai_unavailable', 'AI vision is not available in this setup.'));
      var offMsg = !aiOn
        ? _t('stem.accessLens.ai_off', 'AI is turned off. Ask your teacher to switch on AI features in the STEAM Lab header.')
        : (!vision ? _t('stem.accessLens.ai_unavailable', 'AI vision is not available in this setup.') : '');
      var whyId = 'accesslens-analyze-why-' + m;
      var blocked = !photo || !canAnalyze || !!busy;
      // The reason the button cannot be pressed, linked to it so a screen
      // reader says it on focus. Exactly one of these renders while blocked.
      var whyNode = !blocked ? null
        : offMsg ? h('div', { id: whyId, role: 'note', style: { fontSize: '11.5px', color: C.text, background: C.warnBg, border: '1px solid ' + C.warnBorder, borderRadius: '8px', padding: '6px 9px', lineHeight: 1.5 } }, offMsg)
        : !photo ? h('span', { id: whyId, style: { fontSize: '11.5px', color: C.sub } }, _t('stem.accessLens.need_photo', 'Capture a photo first.'))
        : busy === m ? h('span', { id: whyId, style: { fontSize: '11.5px', color: C.sub } }, _t('stem.accessLens.busy_this', 'Working on it. The answer will be read out when it arrives.'))
        : h('span', { id: whyId, style: { fontSize: '11.5px', color: C.sub } }, _t('stem.accessLens.busy_other', 'Another analysis is still running. Wait for it to finish.'));
      // An AI-off message always means blocked, so it is the reason (a block note).
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
        h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' } },
          btn(busy === m ? '⏳ ' + _t('stem.accessLens.analyzing', 'Analyzing…') : '✨ ' + label,
            function () { analyze(m); },
            { primary: true, ariaDisabled: blocked, describedBy: blocked ? whyId : undefined, ref: m === mode ? analyzeBtnRef : undefined }),
          offMsg ? null : whyNode),
        offMsg ? whyNode : null);
    }

    function renderDescribe() {
      var out = describeOut;
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
        h('p', { style: { margin: 0, fontSize: '12.5px', color: C.sub, lineHeight: 1.5 } },
          _t('stem.accessLens.describe_intro', 'Get a spoken picture of what is in front of you: layout, objects, colors, and any text. Made for students who are blind or have low vision.')),
        analyzeButton('describe', _t('stem.accessLens.describe_cta', 'Describe my photo')),
        out ? card([
          resultHeading(_t('stem.accessLens.result_describe', 'Description')),
          // A student who cannot see the photo cannot tell a bad PHOTO from a
          // bad description. Reported first, and announced, so the fix (retake
          // it) is obvious rather than inferred from a vague description.
          !out.usable ? h('div', {
            key: 'quality', role: 'status',
            style: { marginBottom: '10px', fontSize: '13px', lineHeight: 1.5, color: C.text, background: C.warnBg, border: '1px solid ' + C.warnBorder, borderRadius: '8px', padding: '8px 10px' }
          }, h('strong', null, _t('stem.accessLens.photo_problem_title', 'This photo may not have come out. ')),
             out.problem || _t('stem.accessLens.photo_problem_generic', 'The picture is unclear. Try taking it again.')) : null,
          h('div', { key: 'txt', dir: 'auto', style: { fontSize: '15px', lineHeight: 1.75, color: C.text, whiteSpace: 'pre-wrap', padding: '10px 12px', borderRadius: '10px', background: C.soft, border: '1px solid ' + C.border } }, out.description),
          // Hedges belong in their own list, not buried mid-sentence where a
          // listener loses them.
          out.unsure && out.unsure.length ? h('div', { key: 'unsure', style: { marginTop: '10px', fontSize: '13px', lineHeight: 1.6, color: C.text, padding: '8px 10px', borderRadius: '8px', background: C.warnBg, border: '1px solid ' + C.warnBorder } },
            h('strong', null, _t('stem.accessLens.unsure_title', 'The AI was not sure about:')),
            h('ul', { style: { margin: '4px 0 0', paddingLeft: '20px' } },
              out.unsure.map(function (u, i) { return h('li', { key: i }, u); }))) : null,
          h('div', { key: 'act', style: { marginTop: '10px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } },
            speakBtn(describeSpeech(out, _t)),
            speaking ? h('span', { style: { fontSize: '11.5px', fontWeight: 700, color: C.accent } }, _t('stem.accessLens.audio_active', 'Audio playback active')) : null),
          h('div', { key: 'disc' }, aiDisclaimer())
        ]) : null);
    }

    function renderRead() {
      var out = results.read;
      var noText = isNoTextReply(out);
      var surfaceBg = contrast ? '#000000' : (readerSurface === 'warm' ? '#fef9e7' : (readerSurface === 'high' ? '#0f172a' : C.soft));
      var surfaceFg = contrast ? '#ffff00' : (readerSurface === 'warm' ? '#1c1917' : (readerSurface === 'high' ? '#fef08a' : C.text));
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
        h('p', { style: { margin: 0, fontSize: '12.5px', color: C.sub, lineHeight: 1.5 } },
          _t('stem.accessLens.read_intro', 'Point at a worksheet, a whiteboard, a sign, or a label. The text is re-typed here in large print you can resize and listen to.')),
        analyzeButton('read', _t('stem.accessLens.read_cta', 'Read the text')),
        out ? (noText
          ? card([resultHeading(_t('stem.accessLens.result_read', 'Text from your photo')),
              h('div', { key: 'nt', style: { fontSize: '13px', color: C.sub } }, _t('stem.accessLens.no_text', 'No readable text was found in this photo. Try getting closer or adding more light.'))])
          : card([
            resultHeading(_t('stem.accessLens.result_read', 'Text from your photo')),
            h('div', { key: 'ctrl', style: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '10px' } },
              h('label', { style: { fontSize: '12px', color: C.sub, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' } },
                _t('stem.accessLens.text_size', 'Text size'),
                // 44px was small for many low-vision readers; 96 matches a magnifier at about 4x body text.
                h('input', {
                  type: 'range', min: 16, max: 96, step: 2, value: readerPx,
                  'aria-label': _t('stem.accessLens.text_size', 'Text size'),
                  'aria-valuetext': _t('stem.accessLens.text_size_value', '{n} pixels').replace('{n}', String(readerPx)),
                  onChange: function (e) { setReaderPx(parseInt(e.target.value, 10) || 24); },
                  style: { width: '150px' }
                }),
                h('span', { style: { fontSize: '11.5px', fontWeight: 800, color: C.accent, minWidth: '42px' } }, readerPx + 'px')),
              h('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap' } },
                [18, 28, 44, 72].map(function (sz) {
                  var isSel = readerPx === sz;
                  return h('button', {
                    key: sz, type: 'button', className: 'accesslens-chip',
                    'aria-pressed': isSel ? 'true' : 'false',
                    onClick: function () { setReaderPx(sz); },
                    style: {
                      padding: '4px 8px', borderRadius: '8px', cursor: 'pointer', fontSize: '11.5px', fontWeight: 700,
                      border: '1px solid ' + (isSel ? C.btnBorder : C.border),
                      background: isSel ? C.btnBg : C.panel,
                      color: isSel ? C.btnText : C.text
                    }
                  }, sz + 'px');
                })),
              !contrast ? h('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap' } },
                [
                  { id: 'default', label: _t('stem.accessLens.surface_default', 'Standard') },
                  { id: 'warm', label: _t('stem.accessLens.surface_warm', 'Warm Paper') },
                  { id: 'high', label: _t('stem.accessLens.surface_high', 'Yellow on Dark') }
                ].map(function (sf) {
                  var isSel = readerSurface === sf.id;
                  return h('button', {
                    key: sf.id, type: 'button', className: 'accesslens-chip',
                    'aria-pressed': isSel ? 'true' : 'false',
                    onClick: function () { setReaderSurface(sf.id); },
                    style: {
                      padding: '4px 8px', borderRadius: '8px', cursor: 'pointer', fontSize: '11.5px', fontWeight: 700,
                      border: '1px solid ' + (isSel ? C.btnBorder : C.border),
                      background: isSel ? C.btnBg : C.panel,
                      color: isSel ? C.btnText : C.text
                    }
                  }, sf.label);
                })) : null,
              speakBtn(speechWithGaps(out, _t))),
            // Announced before the text: a gap count is the difference between
            // "this is what the label says" and "this is most of what it says".
            countUnclear(out) ? h('div', {
              key: 'gaps', role: 'status',
              style: { marginBottom: '10px', fontSize: '13px', lineHeight: 1.5, color: C.text, background: C.warnBg, border: '1px solid ' + C.warnBorder, borderRadius: '8px', padding: '8px 10px' }
            }, h('strong', null, countUnclear(out) === 1
                 ? _t('stem.accessLens.gap_one', '1 word could not be read. ')
                 : countUnclear(out) + _t('stem.accessLens.gap_many', ' words could not be read. ')),
               _t('stem.accessLens.gap_advice', 'Each gap is marked below. If this text matters, take the photo again with more light or move closer, or ask someone to check it.')) : null,
            h('div', {
              key: 'reader', dir: 'auto',
              style: {
                fontSize: readerPx + 'px', lineHeight: 1.8, letterSpacing: '0.02em', wordSpacing: '0.12em',
                color: surfaceFg, background: surfaceBg, border: '1px solid ' + C.border, borderRadius: '10px', padding: '14px 16px',
                whiteSpace: 'pre-wrap', maxWidth: '46ch', overflowWrap: 'break-word'
              }
            }, splitUnclear(out).map(function (part, i) {
              // A gap is marked, not styled like the words that were read.
              return part.unclear
                ? h('span', {
                    key: i,
                    style: { background: C.warnBg, border: '1px dashed ' + C.warnBorder, borderRadius: '4px', padding: '0 4px', fontStyle: 'italic', fontWeight: 700, color: C.text }
                  }, _t('stem.accessLens.unclear_inline', '[could not read]'))
                : h('span', { key: i }, part.text);
            })),
            h('div', { key: 'disc' }, aiDisclaimer())
          ])) : null);
    }

    function renderTranslate() {
      var out = results.translate;
      var quickLangs = ['Spanish', 'French', 'Arabic', 'Chinese (Simplified)', 'Vietnamese'];
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
        h('p', { style: { margin: 0, fontSize: '12.5px', color: C.sub, lineHeight: 1.5 } },
          _t('stem.accessLens.translate_intro', 'Photograph text in one language and read it in yours. Great for signs, notes home, and classroom handouts.')),
        h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' } },
          h('span', { style: { fontSize: '11.5px', fontWeight: 700, color: C.sub } }, _t('stem.accessLens.quick_langs', 'Quick pick:')),
          quickLangs.map(function (ql) {
            var activeL = !customLang && targetLang === ql;
            return h('button', {
              key: ql, type: 'button', className: 'accesslens-chip',
              'aria-pressed': activeL ? 'true' : 'false',
              onClick: function () { setCustomLang(false); setTargetLang(ql); },
              style: {
                padding: '4px 10px', borderRadius: '999px', cursor: 'pointer', fontSize: '11.5px', fontWeight: 700,
                border: '1px solid ' + (activeL ? C.btnBorder : C.border),
                background: activeL ? C.btnBg : C.panel,
                color: activeL ? C.btnText : C.text
              }
            }, _t('stem.accessLens.lang_' + langSlug(ql), ql));
          })),
        h('label', { style: { fontSize: '12.5px', color: C.text, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
          _t('stem.accessLens.translate_into', 'Translate into'),
          h('select', {
            value: (customLang || TARGET_LANGS.indexOf(targetLang) === -1) ? '_custom' : targetLang,
            // "Other…" snapped straight back to the previous language with no
            // cue; it now hands the student to the language-name box.
            onChange: function (e) {
              if (e.target.value === '_custom') {
                setCustomLang(true);
                pendingFocusRef.current = 'lang';
                announce(_t('stem.accessLens.sr_other_language', 'Type the name of the language in the box next to this list.'));
              } else { setCustomLang(false); setTargetLang(e.target.value); }
            },
            'aria-label': _t('stem.accessLens.translate_into', 'Translate into'),
            style: { padding: '7px 9px', borderRadius: '8px', border: '1px solid ' + C.border, background: C.panel, color: C.text, fontSize: '13px', fontWeight: 700 }
          },
            TARGET_LANGS.map(function (l) { return h('option', { key: l, value: l }, _t('stem.accessLens.lang_' + langSlug(l), l)); }),
            h('option', { value: '_custom' }, _t('stem.accessLens.other_language', 'Other…'))),
          h('input', {
            type: 'text', value: targetLang, ref: langInputRef,
            'aria-label': _t('stem.accessLens.language_name', 'Language name'),
            onChange: function (e) { setTargetLang(e.target.value); },
            style: { padding: '7px 9px', borderRadius: '8px', border: '1px solid ' + C.border, background: C.panel, color: C.text, fontSize: '13px', width: '150px' }
          })),
        analyzeButton('translate', _t('stem.accessLens.translate_cta', 'Translate the text')),
        out ? (out.none
          ? card([resultHeading(_t('stem.accessLens.result_translate', 'Translation of your photo')),
              h('div', { key: 'nt', style: { fontSize: '13px', color: C.sub } }, _t('stem.accessLens.no_text', 'No readable text was found in this photo. Try getting closer or adding more light.'))])
          : card([
            resultHeading(_t('stem.accessLens.result_translate', 'Translation of your photo')),
            h('div', { key: 'cols', 'data-accesslens-columns': 'true', style: { display: 'grid', gridTemplateColumns: out.original ? 'repeat(2, minmax(0, 1fr))' : '1fr', gap: '10px' } },
              out.original ? h('div', { key: 'orig', style: { padding: '10px 12px', borderRadius: '10px', background: C.soft, border: '1px solid ' + C.border, minWidth: 0 } },
                h('div', { style: { fontSize: '10.5px', fontWeight: 800, color: C.sub, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' } }, _t('stem.accessLens.original', 'Original')),
                h('div', { dir: 'auto', style: { fontSize: '13.5px', lineHeight: 1.6, color: C.text, whiteSpace: 'pre-wrap' } }, splitUnclear(out.original).map(function (part, i) {
                  return part.unclear
                    ? h('span', { key: i, style: { background: C.warnBg, border: '1px dashed ' + C.warnBorder, borderRadius: '4px', padding: '0 3px', fontStyle: 'italic', fontWeight: 700 } }, _t('stem.accessLens.unclear_inline', '[could not read]'))
                    : h('span', { key: i }, part.text);
                }))) : null,
              h('div', { key: 'trans', style: { padding: '10px 12px', borderRadius: '10px', background: C.accentBg, border: '1px solid ' + C.accent, minWidth: 0 } },
                h('div', { style: { fontSize: '10.5px', fontWeight: 800, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' } }, _t('stem.accessLens.translation', 'Translation') + (out.lang ? ' (' + out.lang + ')' : '')),
                // lang picks the right font and voice; dir=auto lays out Arabic, Farsi and Pashto right to left.
                h('div', { dir: 'auto', lang: langCodeOf(out.lang) || undefined, style: { fontSize: '16px', lineHeight: 1.7, color: C.text, whiteSpace: 'pre-wrap' } }, out.translated))),
            countUnclear(out.original) ? h('div', { key: 'gaps', role: 'status', style: { marginTop: '10px', fontSize: '12.5px', lineHeight: 1.5, color: C.text, background: C.warnBg, border: '1px solid ' + C.warnBorder, borderRadius: '8px', padding: '8px 10px' } },
              _t('stem.accessLens.translate_gap', 'Some words in the original could not be read, so the translation is missing part of the text. Take the photo again with more light if this matters.')) : null,
            h('div', { key: 'mt', role: 'note', style: { marginTop: '10px', fontSize: '13px', lineHeight: 1.5, color: C.text } },
              _t('stem.accessLens.translate_machine_note', 'This is a machine translation. For important school notices, ask an interpreter or a bilingual staff member.')),
            h('div', { key: 'act', style: { marginTop: '10px', display: 'flex', gap: '8px' } }, speakBtn(out.translated, out.lang)),
            h('div', { key: 'disc' }, aiDisclaimer())
          ])) : null);
    }

    function renderInquire() {
      var out = results.inquire;
      var body = null;
      if (out && out.raw) {
        body = card([
          resultHeading(_t('stem.accessLens.result_inquire', 'Your investigation')),
          h('div', { key: 'raw', dir: 'auto', style: { fontSize: '13px', lineHeight: 1.6, color: C.text, whiteSpace: 'pre-wrap' } }, out.raw),
          h('div', { key: 'disc' }, aiDisclaimer())
        ]);
      } else if (out) {
        var answeredCnt = out.questions.filter(function (_, idx) { return answers[idx] && String(answers[idx]).trim().length > 2; }).length;
        var confLevel = out.guess && out.guess.confidence === 'high' ? 3 : (out.guess && out.guess.confidence === 'medium' ? 2 : 1);
        body = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
          card([
            resultHeading(_t('stem.accessLens.result_inquire', 'Your investigation')),
            h('div', { key: 'hd', style: { fontSize: '11px', fontWeight: 800, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' } },
              h('span', { 'aria-hidden': 'true' }, '👀 '), _t('stem.accessLens.observations', 'What the AI can see')),
            h('ul', { key: 'ls', style: { margin: 0, paddingLeft: '18px', fontSize: '13.5px', lineHeight: 1.7, color: C.text } },
              out.observations.map(function (o, i) { return h('li', { key: i }, o); }))
          ]),
          card([
            h('div', { key: 'hd', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' } },
              h('div', { style: { fontSize: '11px', fontWeight: 800, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.05em' } },
                h('span', { 'aria-hidden': 'true' }, '🤔 '), _t('stem.accessLens.questions', 'Your investigation questions')),
              h('span', { style: { fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '999px', background: C.accentBg, border: '1px solid ' + C.accent, color: C.accent } },
                answeredCnt + ' / ' + out.questions.length + ' ' + _t('stem.accessLens.answered_count', 'answered'))),
            h('div', { key: 'qs', style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
              out.questions.map(function (q, i) {
                return h('div', { key: i },
                  h('label', { htmlFor: 'accesslens-q' + i, style: { display: 'block', fontSize: '13.5px', fontWeight: 700, color: C.text, marginBottom: '4px', lineHeight: 1.5 } }, (i + 1) + '. ' + q),
                  h('textarea', {
                    id: 'accesslens-q' + i, rows: 2, value: answers[i] || '',
                    placeholder: _t('stem.accessLens.answer_placeholder_any', 'Feel, listen, measure, or look, then type what you notice…'),
                    onChange: function (e) {
                      var v = e.target.value;
                      setAnswers(function (a) { var n = Object.assign({}, a); n[i] = v; return n; });
                      if (v && v.length > 3) markQuest('answered');
                    },
                    style: { width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '8px', border: '1px solid ' + C.border, background: C.soft, color: C.text, fontSize: '13px', lineHeight: 1.5, resize: 'vertical' }
                  }));
              }))
          ]),
          // The guess sat beside the questions, so it was read before the
          // student had thought about any of them. It now waits behind a button.
          card([
            h('div', { key: 'hd', style: { fontSize: '11px', fontWeight: 800, color: C.sub, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' } },
              h('span', { 'aria-hidden': 'true' }, '🧪 '), _t('stem.accessLens.guess_title', 'The AI\'s guess (not a fact)')),
            h('div', { key: 'tog', style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } },
              btn(guessShown ? _t('stem.accessLens.hide_guess', 'Hide the AI\'s guess') : _t('stem.accessLens.show_guess', 'Show the AI\'s guess'),
                function () {
                  var next = !guessShown;
                  setGuessShown(next);
                  if (next) announce(guessAnnouncement(out.guess, _t));
                },
                { expanded: guessShown, controls: 'accesslens-guess' }),
              guessShown ? null : h('span', { style: { fontSize: '12px', color: C.sub } }, _t('stem.accessLens.guess_wait', 'Try answering the questions first, then compare with the AI.'))),
            h('div', { key: 'guess', id: 'accesslens-guess', hidden: !guessShown },
              guessShown ? [
                h('div', { key: 'what', dir: 'auto', style: { marginTop: '10px', fontSize: '15px', fontWeight: 800, color: C.text } }, out.guess.what),
                h('div', { key: 'confrow', style: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '6px' } },
                  h('div', { key: 'conf', style: { display: 'inline-block', fontSize: '11px', fontWeight: 800, padding: '3px 9px', borderRadius: '999px', background: C.warnBg, border: '1px solid ' + C.warnBorder, color: C.text } },
                    confidenceLabel(out.guess.confidence, _t)),
                  h('div', { key: 'meter', 'aria-hidden': 'true', style: { display: 'flex', gap: '4px', alignItems: 'center' } },
                    [1, 2, 3].map(function (seg) {
                      return h('span', { key: seg, style: { display: 'inline-block', width: '22px', height: '8px', borderRadius: '4px', background: seg <= confLevel ? C.warnBorder : C.soft, border: '1px solid ' + C.border } });
                    }))),
                out.guess.why ? h('div', { key: 'why', dir: 'auto', style: { marginTop: '8px', fontSize: '12.5px', lineHeight: 1.6, color: C.sub } }, out.guess.why) : null,
                out.tryThis ? h('div', { key: 'try', dir: 'auto', style: { marginTop: '8px', fontSize: '13px', lineHeight: 1.6, color: C.text, background: C.okBg, border: '1px solid ' + C.okBorder, borderRadius: '8px', padding: '8px 10px' } },
                  h('strong', null, _t('stem.accessLens.try_this', 'Test it: ')), out.tryThis) : null
              ] : null),
            h('div', { key: 'disc' }, aiDisclaimer())
          ]));
      }
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
        h('p', { style: { margin: 0, fontSize: '12.5px', color: C.sub, lineHeight: 1.5 } },
          _t('stem.accessLens.inquire_intro', 'Curious what something is? The AI will tell you what it can see, ask YOU the next questions, and share its best guess clearly labeled as a guess. Real scientists check; they do not just believe.')),
        analyzeButton('inquire', _t('stem.accessLens.inquire_cta', 'Investigate this object')),
        body);
    }

    // ════════════════════ shell ════════════════════
    var MODES = [
      { id: 'describe', icon: '👁️', label: _t('stem.accessLens.tab_describe', 'Describe') },
      { id: 'read', icon: '📖', label: _t('stem.accessLens.tab_read', 'Read') },
      { id: 'translate', icon: '🌍', label: _t('stem.accessLens.tab_translate', 'Translate') },
      { id: 'inquire', icon: '🔬', label: _t('stem.accessLens.tab_inquire', 'Investigate') }
    ];
    var panel = mode === 'describe' ? renderDescribe()
      : mode === 'read' ? renderRead()
      : mode === 'translate' ? renderTranslate()
      : renderInquire();
    var accessLensTabKeyDown = function (e, index) {
      var nextIndex = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIndex = (index + 1) % MODES.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIndex = (index + MODES.length - 1) % MODES.length;
      else if (e.key === 'Home') nextIndex = 0;
      else if (e.key === 'End') nextIndex = MODES.length - 1;
      if (nextIndex < 0) return;
      e.preventDefault();
      var tabs = e.currentTarget && e.currentTarget.parentNode
        ? e.currentTarget.parentNode.querySelectorAll('[role="tab"]')
        : [];
      var nextTab = tabs[nextIndex];
      if (nextTab) {
        nextTab.focus();
        nextTab.click();
      }
    };

    var activeModeObj = MODES.filter(function (m) { return m.id === mode; })[0] || MODES[0];
    var heroStyle = contrast
      ? { padding: '14px 16px', borderRadius: '14px', background: '#000000', border: '2px solid #ffff00', color: '#ffff00' }
      : { padding: '14px 16px', borderRadius: '14px', background: dark ? 'linear-gradient(135deg, #082f49 0%, #0c4a6e 55%, #0b1220 100%)' : 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 55%, #0f172a 100%)', border: '1px solid rgba(125,211,252,0.32)', color: '#ffffff', boxShadow: '0 8px 24px rgba(3,105,161,0.22)' };
    var pillStyle = contrast
      ? { fontSize: '11px', fontWeight: 800, padding: '3px 9px', borderRadius: '999px', background: '#000000', border: '1px solid #ffff00', color: '#ffff00' }
      : { fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '999px', background: 'rgba(15,23,42,0.48)', border: '1px solid rgba(186,230,253,0.35)', color: '#f0f9ff' };

    return h('div', { 'data-accesslens-tool': 'true', 'data-accesslens-theme': contrast ? 'contrast' : (dark ? 'dark' : 'light'), style: { display: 'flex', flexDirection: 'column', gap: '14px', color: C.text, fontFamily: 'inherit', background: C.bg, borderRadius: '16px', padding: '14px', border: (contrast ? '2px solid ' : '1px solid ') + C.border, minWidth: 0 } },
      // Bespoke Optical / Sensory Lens Hero Workbench Header
      h('div', { style: heroStyle },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: '1 1 240px' } },
            // Bespoke Optical Aperture + Soundwave SVG Emblem
            h('div', { 'aria-hidden': 'true', style: { width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: contrast ? '#000000' : 'radial-gradient(circle at 32% 28%, rgba(125,211,252,0.28), rgba(15,23,42,0.45))', border: contrast ? '2px solid #ffff00' : '1px solid rgba(186,230,253,0.42)', boxShadow: contrast ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.24)' } },
              h('svg', { viewBox: '0 0 40 40', width: 32, height: 32, 'aria-hidden': 'true' },
                !contrast ? h('defs', null,
                  h('radialGradient', { id: 'al-emblem-glass', cx: '35%', cy: '30%', r: '70%' },
                    h('stop', { offset: '0%', stopColor: 'rgba(186,230,253,0.48)' }),
                    h('stop', { offset: '100%', stopColor: 'rgba(14,165,233,0.08)' })
                  )
                ) : null,
                h('circle', { cx: 18, cy: 20, r: 12.5, fill: contrast ? 'none' : 'url(#al-emblem-glass)', stroke: contrast ? '#ffff00' : '#7dd3fc', strokeWidth: 2 }),
                h('circle', { cx: 18, cy: 20, r: 7, fill: 'none', stroke: contrast ? '#00ff00' : '#ffffff', strokeWidth: 1.8 }),
                h('path', { d: 'M18 11 L21 15 M26 20 L22 23 M18 29 L15 25 M10 20 L14 17', fill: 'none', stroke: contrast ? '#ffff00' : '#bae6fd', strokeWidth: 1.1, strokeLinecap: 'round', opacity: 0.72 }),
                h('circle', { cx: 18, cy: 20, r: 2.6, fill: contrast ? '#ffff00' : '#38bdf8' }),
                !contrast ? h('path', { d: 'M11.5 14 A10 10 0 0 1 20 10.5', fill: 'none', stroke: '#ffffff', strokeWidth: 1.6, strokeLinecap: 'round', opacity: 0.7 }) : null,
                h('path', { d: 'M31 14 Q36 20 31 26', fill: 'none', stroke: contrast ? '#00ff00' : '#34d399', strokeWidth: 2.2, strokeLinecap: 'round' }),
                h('path', { d: 'M34.5 10.5 Q40 20 34.5 29.5', fill: 'none', stroke: contrast ? '#ffff00' : '#bae6fd', strokeWidth: 1.8, strokeLinecap: 'round' })
              )
            ),
            h('div', { style: { minWidth: 0 } },
              h('div', { style: { fontSize: '10px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: contrast ? '#00ff00' : '#bae6fd', marginBottom: '2px' } },
                _t('stem.accessLens.badge_subject', 'Technology • Assistive Sensory Lens')),
              h('h2', { style: { margin: 0, fontSize: '18px', fontWeight: 800, color: contrast ? '#ffff00' : '#ffffff', lineHeight: 1.2 } }, _t('stem.accessLens.title', 'Access Lens')),
              h('div', { style: { fontSize: '12px', color: contrast ? '#ffffff' : '#e0f2fe', marginTop: '2px', lineHeight: 1.4 } }, _t('stem.accessLens.subtitle', 'Point, snap, and understand: describe, read, translate, investigate')))),
          (ctx.setStemLabTool ? h('button', {
            type: 'button', className: 'accesslens-btn', onClick: function () { ctx.setStemLabTool(''); },
            'aria-label': _t('stem.accessLens.back', 'Back to STEAM Lab'),
            style: { padding: '6px 12px', borderRadius: '9px', border: contrast ? '2px solid #ffff00' : '1px solid rgba(186,230,253,0.45)', background: contrast ? '#000000' : 'rgba(15,23,42,0.55)', color: contrast ? '#ffff00' : '#ffffff', cursor: 'pointer', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap' }
          }, splitButtonLabel('← ' + _t('stem.accessLens.back_short', 'Back'))) : null)),
        // Live Telemetry Pills
        h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' } },
          h('span', { style: pillStyle },
            _t('stem.accessLens.pill_status', 'Capture: ') + (camState === 'live' ? _t('stem.accessLens.pill_live', 'Live Camera') : photo ? _t('stem.accessLens.pill_loaded', 'Photo Loaded') : _t('stem.accessLens.pill_ready', 'Ready'))),
          h('span', { style: pillStyle },
            _t('stem.accessLens.pill_mode', 'Lens: ') + activeModeObj.label),
          h('span', { style: pillStyle },
            _t('stem.accessLens.pill_explored', 'Lenses Used: ') + lensesExploredCount + '/4'),
          h('span', { style: pillStyle },
            _t('stem.accessLens.pill_privacy', 'Privacy: Local-Only')))),
      card(renderCapture(), { background: C.panel }),
      h('div', { role: 'tablist', 'aria-label': _t('stem.accessLens.tabs_label', 'Access Lens modes'), style: { display: 'flex', gap: '6px', flexWrap: 'wrap', borderBottom: (contrast ? '2px solid ' : '1px solid ') + C.border, paddingBottom: '8px' } },
        MODES.map(function (m, tabIndex) {
          var active = mode === m.id;
          var hasDone = !!results[m.id];
          var tabBorder = active ? (contrast ? '#00ff00' : C.accent) : C.border;
          return h('button', {
            key: m.id, type: 'button', className: 'accesslens-tab', role: 'tab',
            id: 'accesslens-tab-' + m.id, 'aria-controls': 'accesslens-panel', 'aria-selected': active ? 'true' : 'false',
            tabIndex: active ? 0 : -1,
            onKeyDown: function (e) { accessLensTabKeyDown(e, tabIndex); },
            onClick: function () { setMode(m.id); stopSpeech(); announce(m.label); },
            style: {
              padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 800,
              borderTop: (contrast ? '2px solid ' : '1px solid ') + tabBorder,
              borderLeft: (contrast ? '2px solid ' : '1px solid ') + tabBorder,
              borderRight: (contrast ? '2px solid ' : '1px solid ') + tabBorder,
              borderBottom: (contrast ? '2px solid ' : '1px solid ') + tabBorder,
              background: active ? (contrast ? '#000000' : C.btnBg) : C.panel,
              color: active ? (contrast ? '#00ff00' : '#ffffff') : C.text
            }
          }, h('span', { 'aria-hidden': 'true' }, m.icon + ' '), m.label,
             hasDone ? h('span', { 'aria-hidden': 'true', style: { marginLeft: '5px', fontSize: '11px', opacity: 0.9 } }, '•') : null);
        })),
      h('div', { id: 'accesslens-panel', role: 'tabpanel', tabIndex: 0, 'aria-labelledby': 'accesslens-tab-' + mode, 'aria-busy': busy ? 'true' : 'false', className: busy ? 'accesslens-busy' : undefined }, panel),
      err ? h('div', { role: 'alert', style: { fontSize: '12.5px', color: C.text, background: C.warnBg, border: '1px solid ' + C.warnBorder, borderRadius: '10px', padding: '9px 12px', lineHeight: 1.5 } }, err) : null,
      h('div', { 'aria-live': 'polite', 'aria-atomic': 'true', style: { position: 'absolute', width: '1px', height: '1px', margin: '-1px', padding: 0, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 } }, liveMsg)
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  REGISTER
  // ═══════════════════════════════════════════════════════════════════════
  // WCAG 1.4.3 high contrast (generated by gen_hc.cjs)
  (function() {
    if (typeof document === 'undefined' || !document.head || document.getElementById('allo-accesslens-hc-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-accesslens-hc-css';
    st.textContent = ".theme-contrast [data-stem-tool-shell=\"accessLens\"] [style]:is([style*=\"background: rgb(248, 250, 252)\"],[style*=\"background-color: rgb(248, 250, 252)\"],[style*=\"background: rgb(255, 255, 255)\"],[style*=\"background-color: rgb(255, 255, 255)\"],[style*=\"background: rgb(241, 245, 249)\"],[style*=\"background-color: rgb(241, 245, 249)\"],[style*=\"background: rgb(224, 242, 254)\"],[style*=\"background-color: rgb(224, 242, 254)\"],[style*=\"background: rgb(254, 243, 199)\"],[style*=\"background-color: rgb(254, 243, 199)\"],[style*=\"background: rgb(220, 252, 231)\"],[style*=\"background-color: rgb(220, 252, 231)\"]):not(:empty):not(svg,canvas,video,iframe,object){background-color:#000!important}.theme-contrast [data-stem-tool-shell=\"accessLens\"] [style]:is([style^=\"color: rgb(30, 41, 59)\"],[style*=\"; color: rgb(30, 41, 59)\"],[style^=\"color: rgb(7, 89, 133)\"],[style*=\"; color: rgb(7, 89, 133)\"],[style^=\"color: rgb(3, 105, 161)\"],[style*=\"; color: rgb(3, 105, 161)\"]){color:#ffff00!important}.theme-contrast [data-stem-tool-shell=\"accessLens\"] [style]:not(#hc-k):not(#hc-k):not(#hc-k):is([style^=\"color: rgb(30, 41, 59)\"],[style*=\"; color: rgb(30, 41, 59)\"],[style^=\"color: rgb(7, 89, 133)\"],[style*=\"; color: rgb(7, 89, 133)\"],[style^=\"color: rgb(3, 105, 161)\"],[style*=\"; color: rgb(3, 105, 161)\"]):is([style*=\"background: rgb\"],[style*=\"background-color: rgb\"],[style*=\"background: linear\"]):not([style*=\"background: rgba(\"],[style*=\"background-color: rgba(\"]):not(:is([style*=\"background: rgb(248, 250, 252)\"],[style*=\"background-color: rgb(248, 250, 252)\"],[style*=\"background: rgb(255, 255, 255)\"],[style*=\"background-color: rgb(255, 255, 255)\"],[style*=\"background: rgb(241, 245, 249)\"],[style*=\"background-color: rgb(241, 245, 249)\"],[style*=\"background: rgb(224, 242, 254)\"],[style*=\"background-color: rgb(224, 242, 254)\"],[style*=\"background: rgb(254, 243, 199)\"],[style*=\"background-color: rgb(254, 243, 199)\"],[style*=\"background: rgb(220, 252, 231)\"],[style*=\"background-color: rgb(220, 252, 231)\"])):not(button:not(:hover)){color:#000!important}.theme-contrast [data-stem-tool-shell=\"accessLens\"] a:not([style*=\"background\"]):not([class*=\"bg-\"]:not([class*=\"-50\"],[class*=\"-100\"],[class*=\"bg-white\"])){color:#ffff00!important}.theme-contrast [data-stem-tool-shell=\"accessLens\"] button:hover:not(#hc-h):not(#hc-h):not(#hc-h):not(#hc-h){background-color:#00ff00!important;background-image:none!important;color:#000!important;-webkit-text-fill-color:#000!important}.theme-contrast [data-stem-tool-shell=\"accessLens\"] button:hover:not(#hc-h):not(#hc-h):not(#hc-h):not(#hc-h) *{color:#000!important;-webkit-text-fill-color:#000!important}.theme-contrast [data-stem-tool-shell=\"accessLens\"] button:hover:not(#hc-h):not(#hc-h):not(#hc-h):not(#hc-h) *:not(:empty):not(svg,svg *,canvas,img,video){background-color:#00ff00!important;background-image:none!important}";
    document.head.appendChild(st);
  })();
  // end WCAG 1.4.3 high contrast
  window.StemLab.registerTool('accessLens', {
    icon: '📷',
    label: 'Access Lens',
    desc: 'Point your camera at the world: get a scene description read aloud (built for students who are blind or have low vision), re-read any text in large print, translate signs and handouts into your language, or investigate an object Socratic-style with an AI that asks questions instead of pronouncing answers.',
    color: 'sky',
    category: 'accessibility',
    aliases: ['camera', 'photo description', 'OCR', 'low vision'],
    questHooks: [
      { id: 'lens_photo', label: 'Capture or choose a photo', icon: '📷',
        check: function (d) { return !!(d && d.captured); },
        progress: function (d) { return (d && d.captured) ? '✓' : 'pending'; } },
      { id: 'lens_describe', label: 'Get a scene description', icon: '👁️',
        check: function (d) { return !!(d && d.described); },
        progress: function (d) { return (d && d.described) ? '✓' : 'pending'; } },
      { id: 'lens_read', label: 'Read text from the world', icon: '📖',
        check: function (d) { return !!(d && d.readText); },
        progress: function (d) { return (d && d.readText) ? '✓' : 'pending'; } },
      { id: 'lens_translate', label: 'Translate something you found', icon: '🌍',
        check: function (d) { return !!(d && d.translated); },
        progress: function (d) { return (d && d.translated) ? '✓' : 'pending'; } },
      { id: 'lens_inquire', label: 'Investigate an object like a scientist', icon: '🔬',
        check: function (d) { return !!(d && d.inquired); },
        progress: function (d) { return (d && d.inquired) ? '✓' : 'pending'; } },
      { id: 'lens_answer', label: 'Answer an investigation question yourself', icon: '✍️',
        check: function (d) { return !!(d && d.answered); },
        progress: function (d) { return (d && d.answered) ? '✓' : 'pending'; } }
    ],
    render: function (ctx) {
      return ctx.React.createElement(AccessLens, { ctx: ctx });
    }
  });

  // Exposed so the camera-failure mapping can be tested directly. A test that
  // only greps the source proves the names are spelled, not that they map.
  if (typeof window !== 'undefined') {
    window.AccessLensPure = window.AccessLensPure || {};
    window.AccessLensPure.cameraFailureReason = cameraFailureReason;
    window.AccessLensPure.parseDescribe = parseDescribe;
    window.AccessLensPure.describeSpeech = describeSpeech;
    window.AccessLensPure.splitUnclear = splitUnclear;
    window.AccessLensPure.countUnclear = countUnclear;
    window.AccessLensPure.speechWithGaps = speechWithGaps;
    window.AccessLensPure.isNoTextReply = isNoTextReply;
    window.AccessLensPure.announceCap = announceCap;
    window.AccessLensPure.resultAnnouncement = resultAnnouncement;
    window.AccessLensPure.isDecorativeLead = function (t) { return DECORATIVE_LEAD.test(t); };
    window.AccessLensPure.guessAnnouncement = guessAnnouncement;
    window.AccessLensPure.confidenceLabel = confidenceLabel;
    window.AccessLensPure.describePrompt = describePrompt;
    window.AccessLensPure.inquirePrompt = inquirePrompt;
    window.AccessLensPure.uiLanguageName = uiLanguageName;
    window.AccessLensPure.withTimeout = withTimeout;
    window.AccessLensPure.isHeicFile = isHeicFile;
    window.AccessLensPure.LENS_ORIGIN = LENS_ORIGIN;
  }
})();
