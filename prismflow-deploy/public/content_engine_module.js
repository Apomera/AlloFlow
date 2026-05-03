(function(){"use strict";
if(window.AlloModules&&window.AlloModules.ContentEngineModule){console.log("[CDN] ContentEngineModule already loaded, skipping"); return;}
// content_engine_source.jsx — Content Generation + Text Revision handlers
// Pure function extraction — no hooks. Uses factory + window state bag pattern.

var warnLog = window.warnLog || function() { console.warn.apply(console, arguments); };
var cleanJson = window.__alloUtils && window.__alloUtils.cleanJson;
if (!cleanJson) cleanJson = function(t) { try { return JSON.parse(t); } catch(e) { return null; } };
var processGrounding = window.__alloUtils && window.__alloUtils.processGrounding;
if (!processGrounding) processGrounding = function(t) { return t; };

var createContentEngine = function(deps) {
  var callGemini = deps.callGemini;
  var addToast = deps.addToast;
  var t = deps.t;
  var getBilingualPromptInstruction = deps.getBilingualPromptInstruction || function() { return ''; };
  var flyToElement = deps.flyToElement || function() {};
  var callTTS = deps.callTTS || function() { return Promise.resolve(); };
  var toSuperscript = function(num) {
    var map = {'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
    return num.toString().split('').map(function(d) { return map[d] || d; }).join('');
  };
  var ensureTitleHeading = function(text) {
    if (!text) return text;
    var lines = text.split('\n');
    var firstNonEmptyIdx = lines.findIndex(function(l) { return l.trim().length > 0; });
    if (firstNonEmptyIdx === -1) return text;
    var firstLine = lines[firstNonEmptyIdx].trim();
    if (/^#{1,6}\s/.test(firstLine)) return text;
    if (firstLine.length > 120) return text;
    if (lines.filter(function(l) { return l.trim().length > 0; }).length < 2) return text;
    var titlePrefixMatch = firstLine.match(/^Title:\s*(.+)/i);
    if (titlePrefixMatch) { lines[firstNonEmptyIdx] = '# ' + titlePrefixMatch[1]; }
    else { lines[firstNonEmptyIdx] = '# ' + firstLine; }
    return lines.join('\n');
  };
  // Rebuild each [⁽N⁾](url) using the canonical URI from the (already-reordered)
  // groundingChunks. N is a deterministic index into chunks — after the LLM cleanup
  // round-trip, the citation NUMBER is trustworthy even when the URL inside is
  // truncated, rewritten, space-padded, or otherwise mangled by Gemini.
  //
  // This catches ALL forms of URL corruption (mid-URL truncation, dropped protocol,
  // "webmd. com" space injection, trailing-paren drop) in one deterministic pass,
  // not the heuristic repair rules in sanitizeTruncatedCitations which can only
  // handle known shapes.
  var restoreCanonicalCitationUrls = function(text, chunks) {
    if (!text || !chunks || !chunks.length) return text;
    var superMap = {'\u2070':'0','\u00b9':'1','\u00b2':'2','\u00b3':'3','\u2074':'4','\u2075':'5','\u2076':'6','\u2077':'7','\u2078':'8','\u2079':'9'};
    var decodeSuper = function(s) {
      var n = '';
      for (var i = 0; i < s.length; i++) { n += superMap[s[i]] || ''; }
      return n;
    };
    var fixed = 0;
    var total = 0;
    // Widened regex: opening ⁽ optional and closing ) optional so we can also rebuild
    // citations that Gemini produced in a broken shape (missing ⁽ or trailing )).
    var result = text.replace(/\[\u207d?([\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079]+)\u207e\]\(([^)\n]*)\)?/g, function(match, supDigits, currentUrl) {
      total++;
      var n = parseInt(decodeSuper(supDigits), 10);
      if (!n || n < 1 || n > chunks.length) return match;
      var chunk = chunks[n - 1];
      var canonical = chunk && chunk.web && chunk.web.uri;
      if (!canonical) return match;
      if (currentUrl !== canonical) fixed++;
      return '[\u207d' + supDigits + '\u207e](' + canonical + ')';
    });
    if (fixed > 0) {
      warnLog('[Citations] restored ' + fixed + '/' + total + ' corrupt URLs from canonical grounding metadata');
    }
    return result;
  };
  // Belt-and-suspenders defensive second pass, called AFTER restoreCanonicalCitationUrls.
  // The primary function uses a strict regex that requires `\u207d`/`\u207e` superscript
  // brackets and matches `[⁽N⁾](url)` with optional closing paren. Several look-alike
  // chars (ASCII `(` / `)`, or no bracket at all around the digit) slip past it. This
  // second pass accepts a more permissive bracket set, still keyed by the superscript
  // digit, and forces a rebuild when the URL doesn't match the canonical chunk URL.
  // Idempotent: when the citation is already well-formed with the canonical URL, the
  // replacement callback returns the match unchanged so no churn.
  var defensiveLastCitationRepair = function(text, chunks) {
    if (!text || !chunks || !chunks.length) return text;
    var superMap = {'\u2070':'0','\u00b9':'1','\u00b2':'2','\u00b3':'3','\u2074':'4','\u2075':'5','\u2076':'6','\u2077':'7','\u2078':'8','\u2079':'9'};
    var decodeSup = function(s) { var n = ''; for (var i = 0; i < s.length; i++) n += superMap[s[i]] || ''; return n; };
    var rewrites = 0;
    var out = text.replace(/\[(?:[\u207d(]?)([\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079]+)(?:[\u207e)]?)\]\(([^)\n]*)(\))?/g, function(match, digits, urlInMatch, closing) {
      var n = parseInt(decodeSup(digits), 10);
      if (!n || n < 1 || n > chunks.length) return match;
      var canonical = chunks[n - 1] && chunks[n - 1].web && chunks[n - 1].web.uri;
      if (!canonical) return match;
      if (closing === ')' && urlInMatch === canonical) return match;
      rewrites++;
      return '[\u207d' + digits + '\u207e](' + canonical + ')';
    });
    if (rewrites > 0) warnLog('[Citations] defensive pass rebuilt ' + rewrites + ' citation(s) (primary restoreCanonicalCitationUrls missed them — likely bracket variant or truncated URL without closing paren)');
    return out;
  };
  var repairSourceMarkdown = function(rawText) {
    if (!rawText) return rawText;

    // ── Fix broken/truncated citations (Gemini systematically drops characters in the
    // last citation of any generated text, regardless of length — missing ⁽ and/or closing ). ──
    // The `⁽?` makes the opening superscript-paren optional so malformed [N⁾](url) also matches.
    // 1. Remove truncated citation links: [⁽¹⁸⁾](https://partial.url  (no closing paren).
    //    Char-class is [^)\n] (not [^)\s\n]) so trailing whitespace before the newline is
    //    consumed — Gemini sometimes emits "...sleepfoundation.  \n" and the old regex failed
    //    to match because it stopped at the space and then needed $ immediately after.
    rawText = rawText.replace(/\[⁽?[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\([^)\n]*$/gm, '');
    // 2. Remove truncated citations at end of text (URL cut off mid-string, no closing paren)
    rawText = rawText.replace(/\[⁽?[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\([^)]{0,200}$/, '');
    // 3. Fix citation links missing closing paren: [⁽¹⁾](url  → [⁽¹⁾](url)
    rawText = rawText.replace(/(\[⁽?[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\(https?:\/\/[^\s)]+)(\s)/g, '$1)$2');
    // 4. Remove orphan superscript citations with no link: ⁽¹⁸⁾ at end of line with no []() wrapper
    rawText = rawText.replace(/\s*\[?⁽?[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]?\s*$/gm, function(match, offset) {
      // Only strip if it's truly orphaned (not part of a [⁽N⁾](url) pattern)
      var before = rawText.substring(Math.max(0, offset - 5), offset);
      if (before.includes('](')) return match; // it's inside a proper link
      return '';
    });
    // 5. Remove stray lone # (orphaned heading markers from truncation)
    rawText = rawText.replace(/\n\s*#\s*$/gm, '');
    rawText = rawText.replace(/\n\s*#\s*\n/g, '\n');
    // 6. Restore missing opening ⁽ in otherwise-complete citations: [N⁾](url) → [⁽N⁾](url)
    //    (must come AFTER rules 1-2 so we don't restore the opening on a citation we just stripped)
    rawText = rawText.replace(/\[([⁰¹²³⁴⁵⁶⁷⁸⁹]+)⁾\]\(([^)]+)\)/g, '[⁽$1⁾]($2)');

    var bibMatch = rawText.match(/(\n---\n|\n#{2,3} Source Text References)/s);
    var body = bibMatch ? rawText.substring(0, bibMatch.index) : rawText;
    var bib = bibMatch ? rawText.substring(bibMatch.index) : '';
    var trimmedBody = body.trimEnd();
    if (trimmedBody.length > 50) {
      // Mask markdown link tokens [text](url) with spaces of equal length so
      // lastIndexOf('.') can only find sentence-ending periods in PROSE, not
      // domain-name dots inside citation URLs (e.g., the '.' in
      // 'online.utpb.edu'). Without this mask: when Gemini emits the last
      // sentence without a terminal '.', the trim below would locate a URL
      // domain dot as the "last sentence end" and truncate the body mid-URL —
      // the exact symptom that has persisted through every prior citation fix.
      // Length-preserving replacement so positions still map 1:1 to trimmedBody.
      var bodyForSearch = trimmedBody.replace(/\[[^\]]*\]\([^)]*\)/g, function(m) { return ' '.repeat(m.length); });
      var lastSentenceEnd = Math.max(bodyForSearch.lastIndexOf('.'), bodyForSearch.lastIndexOf('!'), bodyForSearch.lastIndexOf('?'));
      if (lastSentenceEnd > 0 && (trimmedBody.length - lastSentenceEnd) < 120) {
        var afterPunctuation = trimmedBody.substring(lastSentenceEnd + 1).trim();
        if (afterPunctuation.length > 5 && !/[.!?]/.test(afterPunctuation)) body = trimmedBody.substring(0, lastSentenceEnd + 1);
      }
    }
    // Terminal-punctuation safety net: if body ends with a well-formed citation
    // or plain prose letter but lacks terminal punctuation, append '.'. Covers
    // Gemini's occasional habit of emitting the final sentence without a period
    // (the upstream cause of every "last sentence looks truncated" report).
    // Regex guard restricts to endings that plausibly need a period: closing
    // paren ')' (end of citation link), superscript digit + ')' (bare citation),
    // or a letter (raw prose). Avoids appending to lists, headings, or code.
    var _tailCheck = body.trimEnd();
    if (_tailCheck.length > 50 && !/[.!?]\s*$/.test(_tailCheck) && /(?:\)|[\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079]\u207e|[a-zA-Z])\s*$/.test(_tailCheck)) {
      body = _tailCheck + '.';
    }
    rawText = body + bib;
    // Ensure headings always start on a new line with a blank line before them
    // Handle cases where citations appear between text and heading:
    // "...text. [⁽⁷⁾](url) [⁽⁸⁾](url) ### Heading" → "...text. [⁽⁷⁾](url) [⁽⁸⁾](url)\n\n### Heading"
    rawText = rawText.replace(/([.!?])(\s*(?:\[⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\([^)]*\)\s*)*)\s*(#{1,6}\s+)/g, '$1$2\n\n$3');
    // Also catch headings directly after any text (no punctuation)
    rawText = rawText.replace(/([^\n])\n?(#{1,6}\s+)/g, '$1\n\n$2');
    var lines = rawText.split('\n');
    var titleProcessed = false;
    var repairedLines = lines.map(function(line, index) {
      var trimmed = line.trim();
      if (!titleProcessed && trimmed.length > 0) {
        if (/^Title:\s*/i.test(trimmed)) { titleProcessed = true; return trimmed.replace(/^Title:\s*/i, '# '); }
        if (!/^[#\-*]/.test(trimmed) && !/^\*\*/.test(trimmed) && !/^\[/.test(trimmed) && !/^\d+\.\s/.test(trimmed) && trimmed.length < 80 && index < 3) { titleProcessed = true; return '# ' + trimmed; }
      }
      if (!titleProcessed && trimmed.length >= 80) titleProcessed = true;
      if (/^#{1,6}\s+/.test(trimmed) && trimmed.length > 150) return line.replace(/^#{1,6}\s+/, '');
      return line;
    });
    var finalLines = [];
    for (var i = 0; i < repairedLines.length; i++) {
      var line = repairedLines[i];
      if (/^#{1,6}\s+/.test(line.trim()) && i > 0) {
        var prevLine = finalLines[finalLines.length - 1];
        if (prevLine && prevLine.trim().length > 0) finalLines.push('');
      }
      finalLines.push(line);
    }
    return finalLines.join('\n');
  };
  // Citation utilities
  var renumberCitations = function(text, originalChunks) {
    if (!text || !originalChunks || originalChunks.length === 0) return { renumberedText: text, reorderedChunks: originalChunks || [] };
    var reverseMap = {'⁰':0,'¹':1,'²':2,'³':3,'⁴':4,'⁵':5,'⁶':6,'⁷':7,'⁸':8,'⁹':9};
    var decodeSuperscript = function(str) { return parseInt(str.split('').map(function(c){return reverseMap[c];}).join(''), 10); };
    // Normalize URL for dedupe: lowercase host, strip trailing slash, #hash, ?query (grounding
    // sometimes appends tracking params that vary across Gemini passes for the same source).
    var normalizeUrl = function(u) { return String(u || '').trim().toLowerCase().replace(/[#?].*$/, '').replace(/\/+$/, ''); };
    var newChunksMap = new Map();           // oldIdx -> newIdx (caches per-old-chunk lookup)
    var urlToNewIdx = new Map();            // normalized URL -> newIdx (dedupe key)
    var reorderedChunks = [];
    var nextIndex = 1;
    var renumberedText = text.replace(/⁽([⁰¹²³⁴⁵⁶⁷⁸⁹]+)⁾/g, function(match, digits) {
      var oldIdx = decodeSuperscript(digits) - 1;
      if (!originalChunks[oldIdx]) return match;
      var newIdx;
      if (newChunksMap.has(oldIdx)) {
        newIdx = newChunksMap.get(oldIdx);
      } else {
        // Multi-section generations (e.g. two Gemini passes concatenated) often re-ground
        // the same source as a fresh chunk. Collapse by URL so the bibliography and in-body
        // markers both converge on the first occurrence's number.
        var u = normalizeUrl(originalChunks[oldIdx].web && originalChunks[oldIdx].web.uri);
        if (u && urlToNewIdx.has(u)) {
          newIdx = urlToNewIdx.get(u);
          newChunksMap.set(oldIdx, newIdx);
        } else {
          newIdx = nextIndex++;
          newChunksMap.set(oldIdx, newIdx);
          if (u) urlToNewIdx.set(u, newIdx);
          reorderedChunks.push(originalChunks[oldIdx]);
        }
      }
      return '⁽' + toSuperscript(newIdx) + '⁾';
    });
    return reorderedChunks.length === 0 ? { renumberedText: text, reorderedChunks: [] } : { renumberedText: renumberedText, reorderedChunks: reorderedChunks };
  };
  var validateAndRepairCitations = function(text, groundingChunks) {
    if (!text || !groundingChunks || groundingChunks.length === 0) return text;
    var reverseMap = {'⁰':0,'¹':1,'²':2,'³':3,'⁴':4,'⁵':5,'⁶':6,'⁷':7,'⁸':8,'⁹':9};
    var decodeSuperscript = function(str) { return parseInt(str.split('').map(function(c){return reverseMap[c];}).join(''), 10); };
    var usedCitations = new Set();
    var repairedText = text.replace(/(\[)?⁽([⁰¹²³⁴⁵⁶⁷⁸⁹]+)⁾(\]\([^)]+\))?/g, function(match, bracket, digits, linkPart) {
      var citNum = decodeSuperscript(digits); usedCitations.add(citNum);
      if (bracket && linkPart) return match;
      var chunk = groundingChunks[citNum - 1];
      return (chunk && chunk.web && chunk.web.uri) ? '[⁽' + digits + '⁾](' + chunk.web.uri + ')' : '⁽' + digits + '⁾';
    });
    return repairedText;
  };
  // Filter non-educational sources (YouTube music, IMDB, Rotten Tomatoes, social media, shopping)
  var _rejectSourceUrl = [/youtube\.com\/watch/i, /youtu\.be\//i, /imdb\.com/i, /spotify\.com/i, /tiktok\.com/i, /instagram\.com/i, /facebook\.com/i, /twitter\.com|x\.com/i, /reddit\.com/i, /pinterest\.com/i, /amazon\.com\/(?!science)/i, /ebay\.com/i, /yelp\.com/i, /tripadvisor\.com/i, /rottentomatoes\.com/i, /fandom\.com/i, /letterboxd\.com/i];
  var _rejectSourceTitle = [/official\s*(music\s*)?video/i, /\(official\s*video\)/i, /\blyrics?\b/i, /\bremaster(ed)?\b/i, /\bmovie\s*trailer\b/i, /\bfull\s*movie\b/i];
  var filterSources = function(chunks) {
    if (!chunks || !Array.isArray(chunks)) return chunks;
    return chunks.filter(function(c) {
      var uri = (c && c.web && c.web.uri) || '';
      var title = (c && c.web && c.web.title) || '';
      for (var i = 0; i < _rejectSourceUrl.length; i++) { if (_rejectSourceUrl[i].test(uri)) return false; }
      for (var j = 0; j < _rejectSourceTitle.length; j++) { if (_rejectSourceTitle[j].test(title)) return false; }
      return true;
    });
  };
  var generateBibliographyString = function(metadata, citationStyle, title) {
    citationStyle = citationStyle || 'Links Only'; title = title || 'Verified Sources';
    if (!metadata || !metadata.groundingChunks || metadata.groundingChunks.length === 0) return "";
    var chunks = filterSources(metadata.groundingChunks);
    if (chunks.length === 0) return "";
    var bib = '\n\n### ' + title + '\n\n';
    chunks.forEach(function(chunk, i) { var t = (chunk.web && chunk.web.title) || "Unknown Source"; var u = (chunk.web && chunk.web.uri) || "#"; bib += (i+1) + '. [' + t + '](' + u + ')\n\n'; });
    return bib;
  };
  var sanitizeRawUrls = function(text) {
    if (!text) return text;
    var linkPlaceholders = [];
    var protectedText = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function(match) { var ph = '__LINK_PLACEHOLDER_' + linkPlaceholders.length + '__'; linkPlaceholders.push(match); return ph; });
    protectedText = protectedText.replace(/https?:\/\/[^\s<>\[\]()'"]+/gi, '');
    protectedText = protectedText.replace(/\s{2,}/g, ' ').replace(/\s+([.,;:!?])/g, '$1');
    linkPlaceholders.forEach(function(link, idx) { protectedText = protectedText.replace('__LINK_PLACEHOLDER_' + idx + '__', link); });
    return protectedText;
  };
  var cleanSourceMetaCommentary = function(text) {
    if (!text) return text;
    var cleaned = text;
    cleaned = cleaned.replace(/\n*\s*\*\((?:Word Count|Note|Target|Revised|Total)[^)]{5,}\)\*\s*\n*/gi, '\n');
    var revisedMatch = cleaned.match(/^(###?\s*Revised\s+(?:Content|Version)[^\n]*\n)/mi);
    if (revisedMatch) { var revisedIdx = cleaned.indexOf(revisedMatch[0]); if (revisedIdx > 0) cleaned = cleaned.substring(revisedIdx + revisedMatch[0].length); }
    cleaned = cleaned.replace(/^(?:Note that |The research confirms |I (?:will|must|should) (?:now )?(?:write|increase|revise|ensure)|This (?:is|meets|exceeds) (?:within|significantly|the target)|Aiming for \d+ words)[^\n]*\n*/gmi, '');
    cleaned = cleaned.replace(/\n---\n\s*\n/g, '\n\n');
    cleaned = cleaned.replace(/([^\n])\n(#{1,4}\s)/g, '$1\n\n$2');
    cleaned = cleaned.replace(/(#{1,4}\s[^\n]+)\n([^#\n])/g, '$1\n\n$2');
    var lines = cleaned.split('\n');
    var nonEmptyLines = lines.filter(function(l) { return l.trim().length > 0; });
    var headerLines = nonEmptyLines.filter(function(l) { return /^#{1,4}\s/.test(l.trim()); });
    var headerRatio = nonEmptyLines.length > 3 ? headerLines.length / nonEmptyLines.length : 0;
    if (headerRatio > 0.4) {
      var prevWasHeader = false;
      cleaned = lines.map(function(line, idx) {
        var trimmed = line.trim();
        var headerMatch = trimmed.match(/^(#{1,4})\s+(.*)/);
        if (!headerMatch) { prevWasHeader = false; return line; }
        var headerText = headerMatch[2]; var headerLevel = headerMatch[1].length;
        if (idx === lines.findIndex(function(l) { return l.trim().length > 0; })) { prevWasHeader = true; return line; }
        if (headerText.length <= 80 && !prevWasHeader && headerLevel <= 3) { prevWasHeader = true; return line; }
        prevWasHeader = false; return headerText;
      }).join('\n');
    } else {
      cleaned = cleaned.replace(/^(#{1,4})\s+(.{150,})$/gm, function(match, hashes, text) { return text; });
    }
    cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n');
    return cleaned.trim();
  };
  var getStructureForLength = function(lengthInput) {
    var length = parseInt(lengthInput) || 0;
    if (length <= 350) return "Structure: Write exactly 2 paragraphs. Do not use section headers.";
    if (length <= 650) return "Structure: Write exactly 4 sections. Each section must have a header and exactly 2 paragraphs.";
    if (length <= 1000) return "Structure: Write exactly 6 sections. Each section must have a header and 2-3 paragraphs.";
    return "Structure: Write exactly 8 sections. Each section must have a header and 3 paragraphs.";
  };
  var _s = function() { return window.__contentEngineState || {}; };
  var _bindState;
  var inputText, gradeLevel, sourceTopic, generatedContent,
      leveledTextLanguage, selectedLanguages, studentInterests, selectedConcepts,
      conceptInput, interestInput, languageInput, activeView, showSourceGen,
      generationStep, isGeneratingSource, selectionMenu, phonicsData,
      sourceCustomInstructions, sourceLength, sourceLevel, sourceTone,
      sourceVocabulary, resourceCount, targetStandards, dokLevel,
      selectedFont, includeSourceCitations,
      interactionMode, revisionData, standardsPromptString,
      ai, webSearchProvider,
      selectedVoice, voiceSpeed,
      setActiveView, setConceptInput, setError, setGeneratedContent,
      setGenerationStep, setInputText, setInterestInput, setIsGeneratingSource,
      setLanguageInput, setLeveledTextLanguage, setSelectedConcepts,
      setSelectedLanguages, setShowSourceGen, setStudentInterests,
      setCustomReviseInstruction, setDefinitionData, setIsCustomReviseOpen,
      setPhonicsData, setRevisionData, setSelectionMenu,
      setPlayingContentId, setPlaybackState;
  var alloBotRef = { current: null };
  var isBotVisible = false;
  var isPlayingRef = { current: false };
  var isSystemAudioActiveRef = { current: false };
  var currentAudioRef = { current: null };
  var _phonicsReqId = 0;
  _bindState = function() {
    var s = _s();
    inputText = s.inputText; gradeLevel = s.gradeLevel;
    sourceTopic = s.sourceTopic; generatedContent = s.generatedContent;
    leveledTextLanguage = s.leveledTextLanguage;
    selectedLanguages = s.selectedLanguages; studentInterests = s.studentInterests;
    selectedConcepts = s.selectedConcepts; conceptInput = s.conceptInput;
    interestInput = s.interestInput; languageInput = s.languageInput;
    activeView = s.activeView; showSourceGen = s.showSourceGen;
    generationStep = s.generationStep; isGeneratingSource = s.isGeneratingSource;
    selectionMenu = s.selectionMenu; phonicsData = s.phonicsData;
    sourceCustomInstructions = s.sourceCustomInstructions;
    sourceLength = s.sourceLength; sourceLevel = s.sourceLevel;
    sourceTone = s.sourceTone; sourceVocabulary = s.sourceVocabulary;
    resourceCount = s.resourceCount; targetStandards = s.targetStandards;
    dokLevel = s.dokLevel; selectedFont = s.selectedFont;
    includeSourceCitations = s.includeSourceCitations;
    interactionMode = s.interactionMode;
    revisionData = s.revisionData;
    standardsPromptString = s.standardsPromptString || '';
    ai = s.ai || null;
    webSearchProvider = s.webSearchProvider || null;
    selectedVoice = s.selectedVoice || 'Puck';
    voiceSpeed = s.voiceSpeed || 1;
    alloBotRef = s.alloBotRef || { current: null };
    isBotVisible = s.isBotVisible || false;
    isPlayingRef = s.isPlayingRef || { current: false };
    isSystemAudioActiveRef = s.isSystemAudioActiveRef || { current: false };
    currentAudioRef = s.currentAudioRef || { current: null };
    setActiveView = s.setActiveView; setConceptInput = s.setConceptInput;
    setError = s.setError; setGeneratedContent = s.setGeneratedContent;
    setGenerationStep = s.setGenerationStep; setInputText = s.setInputText;
    setInterestInput = s.setInterestInput; setIsGeneratingSource = s.setIsGeneratingSource;
    setLanguageInput = s.setLanguageInput; setLeveledTextLanguage = s.setLeveledTextLanguage;
    setSelectedConcepts = s.setSelectedConcepts; setSelectedLanguages = s.setSelectedLanguages;
    setShowSourceGen = s.setShowSourceGen; setStudentInterests = s.setStudentInterests;
    setCustomReviseInstruction = s.setCustomReviseInstruction;
    setDefinitionData = s.setDefinitionData; setIsCustomReviseOpen = s.setIsCustomReviseOpen;
    setPhonicsData = s.setPhonicsData; setRevisionData = s.setRevisionData;
    setSelectionMenu = s.setSelectionMenu;
    setPlayingContentId = s.setPlayingContentId; setPlaybackState = s.setPlaybackState;
  };

  const handleGenerateSource = async (overrides = {}, switchView = true) => {
    // Guard: if called from onClick, first arg is an event — ignore it
    if (overrides && overrides.nativeEvent) { overrides = {}; }
    const effTopic = (overrides && typeof overrides.topic === 'string') ? overrides.topic : sourceTopic;
    const effGrade = (overrides && typeof overrides.grade === 'string') ? overrides.grade : sourceLevel;
    const effStandards = (overrides && typeof overrides.standards === 'string') ? overrides.standards : standardsPromptString;
    const effIncludeCitations = (overrides && typeof overrides.includeCitations === 'boolean') ? overrides.includeCitations : includeSourceCitations;
    const effLength = (overrides && overrides.length) ? overrides.length : sourceLength;
    const effTone = (overrides && overrides.tone) ? overrides.tone : sourceTone;
    const effDokLevel = (overrides && overrides.dokLevel) ? overrides.dokLevel : dokLevel;
    const effVocabulary = (overrides && overrides.vocabulary) ? overrides.vocabulary : sourceVocabulary;
    const effCustomInstructions = (overrides && overrides.customInstructions) ? overrides.customInstructions : sourceCustomInstructions;
    const effectiveLanguage = leveledTextLanguage;
    if (!effTopic.trim() && (!effStandards || effStandards.length === 0)) return;
    const dialectInstruction = effectiveLanguage !== 'English'
        ? "STRICT DIALECT ADHERENCE: If a specific dialect is named (e.g. 'Brazilian Portuguese' vs 'European Portuguese'), explicitly use that region's vocabulary, spelling, and grammar conventions."
        : "";
    console.error('[CE-TRACE] About to setIsGeneratingSource. typeof:', typeof setIsGeneratingSource);
    setIsGeneratingSource(true);
    setGenerationStep(t('status_steps.generating_source'));
    setError(null);
    console.error('[CE-TRACE] State setters called. About to call Gemini...');
    if (switchView) {
        setGeneratedContent(null);
        setActiveView('input');
    }
    addToast(t('input.status_generating'), "info");
    const targetWords = parseInt(effLength) || 250;
    const chunkCapacity = 600;
    const numChunks = Math.ceil(targetWords / chunkCapacity);
    const isShortText = numChunks <= 1;
    // Tone checks hoisted up so the multi-chunk gate below can read them.
    // Dialogue mode uses a bespoke JSON output schema + dialogue-plan pre-step
    // (see single-call path below) and cannot route through the multi-chunk
    // pipeline. Narrative (prose) has no such constraint — it rides along.
    const isDialogueMode = effTone === 'Narrative';
    const isNarrativeMode = effTone === 'Narrative' || effTone === 'Engaging Narrative';
    // Prompt helpers hoisted up: the single-section (N=1) branch of the
    // multi-chunk pipeline merges these into its section prompt to preserve
    // the reading-level / tone / structure guidance that previously only
    // lived in the legacy single-call path.
    const complexityGuard = `
        - HANDLING COMPLEX TOPICS: If the topic involves abstract, religious, or advanced scientific concepts (e.g. Shintoism, Quantum Mechanics), do NOT use high-level academic definitions.
        - ANALOGY REQUIREMENT: You MUST explain every abstract concept using a concrete analogy relatable to a ${effGrade} student immediately.
        - VOCABULARY GUARD: If you use a domain-specific term (Tier 3), define it simply in the same sentence.
      `;
    const structureInstruction = getStructureForLength(targetWords);
    try {
      let researchContext = "";
      if (effIncludeCitations) {
          setGenerationStep(t('status_steps.researching_topic'));
          try {
              const isLocalBackend = ai?.backend === 'ollama' || ai?.backend === 'localai';

              if (isLocalBackend) {
                  // ── For local backends: web search + LLM research ──
                  let searchContext = '';
                  try {
                      const searchResults = await webSearchProvider.search(`${effTopic} ${effGrade} facts statistics`);
                      if (searchResults && searchResults.length > 0) {
                          searchContext = searchResults.slice(0, 8).map((r, i) =>
                              `[${i+1}] ${r.title}\n${r.snippet}\nURL: ${r.url}`
                          ).join('\n\n');
                      }
                  } catch (searchErr) {
                      warnLog('[Research] Web search failed:', searchErr.message);
                  }
                  const localResearchPrompt = `
                      Research brief for educational content creation.
                      Topic: "${effTopic}" | Audience: ${effGrade}
                      ${effStandards ? `Standard: "${effStandards}"` : ''}
                      ${searchContext ? `\nWEB SEARCH RESULTS:\n${searchContext}\n` : ''}
                      Extract 8-12 key facts, vocabulary terms, and important points from the search results above.
                      Return a structured research brief with clear bullet points. Do NOT write the article itself.
                  `;
                  researchContext = await ai.generateText(localResearchPrompt, { temperature: 0.2 });
              } else {
                  // ── For Gemini: use Google Search grounding as before ──
                  const researchPrompt = `
                      Research the following topic for educational content creation.
                      Topic: "${effTopic}"
                      Target Audience: ${effGrade}
                      ${effStandards ? `Academic Standard: "${effStandards}"` : ''}
                      ${effDokLevel ? `Depth of Knowledge: ${effDokLevel}` : ''}
                      Task:
                      1. Use Google Search to find key facts, dates, statistics, and terminology.
                      2. Identify ${numChunks <= 1 ? '12-16' : '8-12'} most important factual points appropriate for the audience.
                      3. Note any common misconceptions or outdated information to avoid.
                      4. Gather vocabulary terms appropriate for the grade level.
                      5. Identify reliable sources for the claims.
                      Return a structured research brief with clear bullet points. Do NOT write the article itself.
                  `;
                  // Retry loop for Google Search grounding (transient failures are common)
                  const maxResearchRetries = 2;
                  let researchSuccess = false;
                  for (let rAttempt = 0; rAttempt <= maxResearchRetries && !researchSuccess; rAttempt++) {
                      try {
                          if (rAttempt > 0) console.log(`[Research] 🔄 Grounding retry ${rAttempt + 1}/${maxResearchRetries + 1}...`);
                          const researchResult = await callGemini(researchPrompt, false, true);
                          if (typeof researchResult === 'object' && researchResult?.text) {
                              researchContext = researchResult.text;
                          } else if (researchResult) {
                              researchContext = String(researchResult);
                          }
                          researchSuccess = true;
                          if (rAttempt > 0) console.log(`[Research] ✅ Grounding succeeded on attempt ${rAttempt + 1}`);
                      } catch (rErr) {
                          console.warn(`[Research] ⚠️ Grounding attempt ${rAttempt + 1} failed:`, rErr?.message);
                          if (rAttempt < maxResearchRetries) {
                              await new Promise(r => setTimeout(r, 2000));
                          } else {
                              throw rErr;
                          }
                      }
                  }
              }
              if (!researchContext || researchContext.length < 50) {
                  researchContext = "";
                  warnLog("Research phase returned insufficient data");
              }
          } catch (researchErr) {
              warnLog("Research phase failed, proceeding with standard generation", researchErr);
              researchContext = "";
          }
      }
      // Show toast only when research context is truly empty (not on transient errors)
      if (effIncludeCitations && !researchContext) {
          addToast(t('toasts.research_skipped'), "info");
      }
      // targetWords, chunkCapacity, numChunks, isShortText are declared above (before the research block)
      // Gate: route everything except Dialogue mode through the multi-chunk pipeline
      // (even for N=1). Dialogue mode uses a bespoke JSON output schema and must stay
      // on the single-call path below. This unifies short + long text behind the
      // multi-chunk post-processing infrastructure (URL repair, source filter,
      // out-of-range citation strip, validateAndRepairCitations) that the legacy
      // short path was missing — fixes the mid-URL-truncated refs bug.
      if (!isDialogueMode) {
           let sections = [];
           if (numChunks === 1) {
               // Single-section shortcut: no outline call needed.
               // Use the topic itself as the section title.
               sections = [effTopic];
           } else {
               setGenerationStep(t('status_steps.designing_structure'));
               const outlinePrompt = `
                 You are an expert curriculum designer.
                 Plan a comprehensive educational article.
                 Topic: "${effTopic}"
                 Target Audience: ${effGrade}
                 Total Target Word Count: ${targetWords} words.
                 Task: Create a structured outline with exactly ${numChunks} distinct section headings that cover the topic in depth.
                 Return ONLY a JSON array of strings (the headings).
                 Example: ${JSON.stringify(Array.from({length: numChunks}, (_, i) => `Section ${i+1} Title`))}
               `;
               const outlineResult = await callGemini(outlinePrompt, true);
               try {
                   sections = JSON.parse(cleanJson(outlineResult));
                   if (!Array.isArray(sections) || sections.length === 0) throw new Error("Invalid outline");
               } catch (e) {
                   sections = Array.from({length: numChunks}, (_, i) => `Part ${i+1}`);
               }
           }
           let fullDocument = `Title: ${effTopic}\n\n`;
           const wordsPerSection = Math.ceil(targetWords / sections.length);
           let allGroundingChunks = [];
           let currentCitationOffset = 0;
           // Track per-section text so each subsequent prompt can include a recap of
           // what's already been written. Without this, Gemini sees only the section
           // title + the same research brief every chunk — the result is near-
           // identical chunks that each re-establish the introduction, definitions,
           // and high-level framing instead of continuing the article.
           const sectionTexts = [];
           setInputText(fullDocument);
           for (let i = 0; i < sections.length; i++) {
               const sectionTitle = sections[i];
               setGenerationStep(t('status_steps.writing_part', { current: i + 1, total: sections.length, title: sectionTitle }));
               const bilingualInstruction = getBilingualPromptInstruction(effectiveLanguage);
               // Build an outline snapshot Gemini can orient against and a trimmed
               // prior-content recap (~250 words per prior section, tail-biased so
               // the model sees how each section ENDED — the most useful continuity
               // signal). Citations in the prior text are stripped so superscript
               // numbers don't carry over and conflict with the current section's
               // grounding offsets.
               const outlineSnapshot = sections.map((st, idx) => {
                   const marker = idx < i ? 'DONE' : idx === i ? 'WRITING NOW' : 'upcoming';
                   return `  ${idx + 1}. ${st}  ← ${marker}`;
               }).join('\n');
               const _trimPrior = (text, maxWords) => {
                   const stripped = String(text || '')
                       .replace(/\[⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\([^)]+\)/g, '')
                       .replace(/⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾/g, '')
                       .replace(/\s+/g, ' ')
                       .trim();
                   const words = stripped.split(' ');
                   if (words.length <= maxWords) return stripped;
                   return '… ' + words.slice(-maxWords).join(' ');
               };
               const priorRecap = i === 0
                   ? ''
                   : sectionTexts.map((st, idx) => `===== SECTION ${idx + 1}: ${sections[idx]} =====\n${_trimPrior(st, 250)}`).join('\n\n');
               // Single-section (N=1) path takes a different prompt shape:
               // no section-N-of-M framing, no "## SectionTitle" header (would
               // duplicate the topic as a redundant subheading), combined
               // first+final instructions, and the reading-level / tone /
               // structure guidance that used to live on the legacy single-call
               // path is merged in here so short text doesn't lose quality.
               const isSingleSection = sections.length === 1;
               const toneSpecificInstruction = (effTone === 'Persuasive' || effTone === 'Persuasive / Opinion')
                   ? 'Write a compelling argumentative piece with clear claims, evidence, and a call to action.'
                   : (effTone === 'Humorous' || effTone === 'Humorous / Engaging')
                   ? 'Use humor, jokes, and entertaining analogies while maintaining educational accuracy.'
                   : (effTone === 'Procedural' || effTone === 'Step-by-Step / Procedural')
                   ? 'Write clear step-by-step instructions with numbered steps and helpful tips.'
                   : isNarrativeMode
                   ? 'Write an engaging narrative article that weaves facts into a story-like flow while staying factually accurate.'
                   : 'Write in a formal, expository textbook style. Focus on factual presentation with clear definitions and explanations. Avoid narrative hooks, storytelling elements, or conversational language. Present information directly and academically.';
               const readingLevelGuidance = `
                   STRICT READING LEVEL GUIDELINES (COMPENSATION FOR AI BIAS):
                   - AI models typically write 1-2 grades higher than requested. You MUST compensate for this.
                   - If "Kindergarten" or "1st Grade": Target Pre-K complexity. Use extremely short sentences (3-5 words). No compound sentences.
                   - If "2nd Grade" or "3rd Grade": Target 1st Grade complexity. Use short, declarative sentences. High-frequency vocabulary only.
                   - If "4th Grade" or "5th Grade": Target 3rd Grade complexity. Mostly simple sentences, limited compound sentences.
                   - If "6th Grade" to "8th Grade": Target 5th Grade complexity. Straightforward syntax, avoid dense academic language.
                   - If "9th Grade" to "12th Grade": Target 8th Grade complexity. Clear, standard English without unnecessary jargon.
                   - GENERAL RULE: If in doubt, simplify further. Shorter sentences. Simpler words.
               `;
               const sectionPrompt = isSingleSection ? `
                   Write a self-contained educational article about "${effTopic}".
                   Target Audience: ${effGrade}
                   Tone: ${effTone}
                   Target Length: approximately ${wordsPerSection} words (keep within 10%).
                   ${researchContext ? `
                   --- RESEARCH BRIEF (BACKGROUND CONTEXT ONLY) ---
                   The following background information is available:
                   """
                   ${researchContext}
                   """
                   ------------------------------------------------
                   IMPORTANT: This brief is for context. You MUST still use Google Search independently to verify and cite every fact you write.
                   ` : ''}
                   This is a single self-contained article — write an engaging opening AND a summary conclusion. No section heading — the article stands on its own.
                   STRICT INSTRUCTIONS:
                   ${effIncludeCitations ? `
                   1. CITATION REQUIREMENT: Include inline citations throughout. Every paragraph should have at least one citation.
                   2. Major facts, statistics, and claims require source attribution.
                   3. Verify claims with web sources before including them.
                   ` : ''}
                   4. Write in PROSE PARAGRAPHS. Do NOT use numbered lists or bullet points for the main content. Do NOT summarize.
                   5. Do NOT include a "Sources", "References", "Works Cited", or "Bibliography" section — the citation list is appended automatically from grounding metadata.
                   6. Do NOT emit a "## ${effTopic}" heading or any other top-level heading — begin directly with the article prose.
                   ${structureInstruction}
                   ${toneSpecificInstruction}
                   ${effVocabulary ? `Key Vocabulary to Include: ${effVocabulary}` : ''}
                   ${effCustomInstructions ? `Custom Instructions: ${effCustomInstructions}` : ''}
                   ${readingLevelGuidance}
                   ${complexityGuard}
                   ${dialectInstruction}
                   ${bilingualInstruction}
                   Return ONLY the article text. Do not wrap in markdown code blocks.
               ` : `
                   Write the section "${sectionTitle}" for an educational article about "${effTopic}".
                   Target Audience: ${effGrade}
                   Tone: ${effTone}
                   Target Length for this section: ~${wordsPerSection} words.
                   You are writing section ${i + 1} of ${sections.length}. Full outline:
${outlineSnapshot}
                   ${researchContext ? `
                   --- RESEARCH BRIEF (BACKGROUND CONTEXT ONLY) ---
                   The following background information is available:
                   """
                   ${researchContext}
                   """
                   ------------------------------------------------
                   IMPORTANT: This brief is for context. You MUST still use Google Search independently to verify and cite every fact you write.
                   ` : ''}
                   ${i === 0 ? 'This is the FIRST section. Write an engaging opening that sets up the article.' : `
--- PREVIOUSLY WRITTEN SECTIONS (READ CAREFULLY — DO NOT REPEAT) ---
${priorRecap}
---------------------------------------------------------------
CRITICAL: The sections above are already written. You MUST NOT:
  • Re-introduce the topic, re-define terms, or restate background
  • Repeat facts, examples, or analogies already covered
  • Start with framing like "In this article we will explore..."
You MUST:
  • Continue naturally from where section ${i} ended
  • Cover genuinely NEW ground specific to "${sectionTitle}"
  • Assume the reader has just finished reading the prior sections
`}
                   STRICT INSTRUCTIONS:
                   ${effIncludeCitations ? `
                   1. CITATION REQUIREMENT (section ${i + 1} of ${sections.length}): Include inline citations throughout this section.
                   2. Every paragraph should have at least one citation. Major facts, statistics, and claims require source attribution.
                   3. Do not defer citations to later sections - cite facts as you introduce them.
                   4. Verify claims with web sources before including them.
                   ` : ''}
                   5. Write detailed, rigorous paragraphs. Do NOT summarize.
                   6. Include a header "## ${sectionTitle}".
                   7. ${i === sections.length - 1 ? 'This IS the final section — end with a conclusion paragraph.' : 'Do NOT write a conclusion; more sections follow.'}
                   ${dialectInstruction}
                   ${bilingualInstruction}
                   Return ONLY the section text. Do not wrap in markdown code blocks.
               `;
               let result;
               let groundingSuccess = false;
               const maxGroundingRetries = 2;
               for (let attempt = 0; attempt <= maxGroundingRetries && !groundingSuccess; attempt++) {
                   try {
                       result = await callGemini(sectionPrompt, false, effIncludeCitations);
                       groundingSuccess = true;
                   } catch (sectionErr) {
                       if (attempt < maxGroundingRetries && effIncludeCitations) {
                           warnLog(`Section ${i + 1} grounding attempt ${attempt + 1} failed, retrying...`, sectionErr.message);
                           await new Promise(r => setTimeout(r, 1500));
                       } else {
                           warnLog(`[Citations] ⚠️ Section ${i + 1}/${sections.length} ("${sectionTitle}") grounding failed after ${attempt + 1} attempts, falling back to no-grounding. Citations for this section will be missing.`);
                           result = await callGemini(sectionPrompt, false, false);
                       }
                   }
               }
               let sectionText = "";
               if (typeof result === 'object' && result !== null) {
                   const rawSection = result.text || "";
                   if (effIncludeCitations && rawSection) {
                                                 const cleanedSection = rawSection.replace(/\[cite:\s*[^\]]*\]\.?\s*/gi, '').replace(/,?\s*\d+\s+in\s+step\s+\d+/gi, '').trim();
                        let processedSection = processGrounding(cleanedSection, result.groundingMetadata, 'Links Only', false, false);
                        if (result.groundingMetadata?.groundingChunks) {
                             const chunkCount = result.groundingMetadata.groundingChunks.length;
                             processedSection = processedSection.replace(/⁽([⁰¹²³⁴⁵⁶⁷⁸⁹]+)⁾/g, (match, digits) => {
                                 const reverseMap = { '⁰':0, '¹':1, '²':2, '³':3, '⁴':4, '⁵':5, '⁶':6, '⁷':7, '⁸':8, '⁹':9 };
                                 const val = parseInt(digits.split('').map(d => reverseMap[d]).join(''), 10);
                                 const newVal = val + currentCitationOffset;
                                 return `⁽${toSuperscript(newVal)}⁾`;
                             });
                             // Convert [Source N], [Source N, M], Source N, M] etc. to clickable superscript links
                             const sectionChunks = result.groundingMetadata.groundingChunks;
                             processedSection = processedSection.replace(/\[?Sources?\s+([\d,\s]+(?:and\s+\d+)?)\]?/gi, (match, numsPart) => {
                                 const nums = numsPart.replace(/and/gi, ',').split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n));
                                 if (nums.length === 0) return '';
                                 const converted = nums.map(num => {
                                     const localIdx = num - 1;
                                     if (localIdx >= 0 && localIdx < sectionChunks.length) {
                                         const globalIdx = localIdx + currentCitationOffset + 1;
                                         const uri = sectionChunks[localIdx]?.web?.uri;
                                         const label = `⁽${toSuperscript(globalIdx)}⁾`;
                                         return uri ? `[${label}](${uri})` : label;
                                     }
                                     return '';
                                 }).filter(Boolean);
                                 return converted.length > 0 ? ' ' + converted.join(' ') : '';
                             });
                             allGroundingChunks = [...allGroundingChunks, ...result.groundingMetadata.groundingChunks];
                             currentCitationOffset += chunkCount;
                        }
                        // Sanitize orphan brackets that could break markdown link rendering
                        processedSection = processedSection
                            .replace(/\[(⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾)(?!\]\()/g, '$1')   // [⁽³⁾ → ⁽³⁾ (but not [⁽³⁾](url) links)
                            .replace(/(⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾)\](?!\()/g, '$1')   // ⁽³⁾] → ⁽³⁾ (but not ⁾](url) links)
                            .replace(/\[?Sources?\s+[\d,\s]+(?:and\s+\d+)?\]?/gi, '');   // any remaining Source refs
                        // Move citations before punctuation to after (same fix as short-text L37182)
                        processedSection = processedSection.replace(/(\[⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\([^)]+\))\s*([.!?])/g, '$2 $1');
                        sectionText = processedSection;
                   } else {
                        sectionText = rawSection;
                   }
               } else {
                   sectionText = String(result || "");
               }
               sectionText = sectionText.replace(/^```[a-zA-Z]*\n/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
               sectionTexts.push(sectionText);
               fullDocument += sectionText + "\n\n";
               setInputText(fullDocument);
               if (i < sections.length - 1) await new Promise(r => setTimeout(r, 1000));
           }
           if (effIncludeCitations && allGroundingChunks.length > 0) {
                // Strip any LLM-emitted bibliography trailer BEFORE we do citation
                // repair.  Despite the prompt forbidding it, Gemini occasionally emits
                // its own "## Source Text References\n\n1. [Title](url)..." section at
                // the end of the generated text — and when it hits the token limit
                // partway through, the trailer (and any inline citation near it) gets
                // truncated mid-URL.  The authoritative bibliography is appended below
                // via generateBibliographyString from grounding metadata, so we can
                // safely drop Gemini's version.  Lookahead-gated by "\d+. [Title](" so
                // it only strips actual numbered-link lists, never body prose that
                // happens to contain the word "Sources" or "References".
                fullDocument = fullDocument.replace(
                    /(?:\n|^)\s*(?:#{1,4}\s*)?(?:\*+\s*)?(?:Source\s+Text\s+References|Accuracy\s+Check\s+References|Verified\s+Sources|Works?\s+Cited|Bibliography|Citations)(?:\*+)?[\s:]*(?=\s*\d+\.\s*\[[^\]]+\]\()[\s\S]*$/i,
                    ''
                );
                // Strip hallucinated citations whose index is outside the collected chunks.
                // These happen when a later section's Gemini emits a higher N than that
                // section's chunk count — the offset then pushes it past the end of
                // allGroundingChunks. Three passes to avoid a greedy over-match:
                //   1. well-formed links  [⁽N⁾](url)  with a closing ).
                //   2. truncated links    [⁽N⁾](url-cut-off  at end of line (no closing ).
                //   3. bare citations     ⁽N⁾  that aren't part of a link.
                //
                // ALSO strip body citations whose target chunk will be rejected by
                // filterSources (YouTube music, Spotify, social, shopping). Previously these
                // orphaned the body citation: bibliography dropped the YouTube entry but the
                // inline ⁽N⁾ stayed, leaving a broken reference. Compute the rejected index
                // set here so _keepInRange can match both out-of-range and rejected cases.
                var _maxIdx = allGroundingChunks.length;
                var _rejectedIdx = new Set();
                var _kept = filterSources(allGroundingChunks);
                var _keptSet = new Set(_kept);
                allGroundingChunks.forEach(function(ch, i) { if (!_keptSet.has(ch)) _rejectedIdx.add(i + 1); });
                var _superMap = {'\u2070':0,'\u00b9':1,'\u00b2':2,'\u00b3':3,'\u2074':4,'\u2075':5,'\u2076':6,'\u2077':7,'\u2078':8,'\u2079':9};
                var _decodeSup = function(s) { var n = 0; for (var i = 0; i < s.length; i++) { n = n * 10 + (_superMap[s[i]] || 0); } return n; };
                var _keepInRange = function(match, digits) {
                    var n = _decodeSup(digits);
                    if (n < 1 || n > _maxIdx) return '';
                    if (_rejectedIdx.has(n)) return ''; // source will be filtered from bibliography — don't leave a dangling inline cit
                    return match;
                };
                // Pass 1: well-formed [⁽N⁾](url)
                fullDocument = fullDocument.replace(
                    /\[\u207d?([\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079]+)\u207e\]\([^)\n]*\)/g,
                    _keepInRange
                );
                // Pass 2: truncated [⁽N⁾](url-without-close) at end of line
                fullDocument = fullDocument.replace(
                    /\[\u207d?([\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079]+)\u207e\]\([^)\n]*$/gm,
                    _keepInRange
                );
                // Pass 3: bare ⁽N⁾ not followed by ]( (i.e., not inside a surviving link)
                fullDocument = fullDocument.replace(
                    /\u207d([\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079]+)\u207e(?!\])/g,
                    _keepInRange
                );

                // Renumber body citations 1..N in order of first appearance and get
                // chunks reordered to match that sequence. This aligns body numbers
                // with bibliography numbers — they'll both run 1..N in the same order.
                var _renum = renumberCitations(fullDocument, allGroundingChunks);
                fullDocument = _renum.renumberedText;

                // Diagnostic: capture the document tail + last-3 citation parses BEFORE
                // canonical URL repair runs. If the "last .com stripped" bug persists
                // after the defensive pass below, this log tells us whether the truncated
                // shape is even present at this stage (vs. corrupted later).
                try {
                  var _tail = fullDocument.slice(-400);
                  var _citRegex = /\[(?:[\u207d(]?)([\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079]+)(?:[\u207e)]?)\]\(([^)\n]*)(\))?/g;
                  var _lastCites = (_tail.match(_citRegex) || []).slice(-3);
                  warnLog('[Citations pre-repair] tail(-120) ends: ' + JSON.stringify(_tail.slice(-120)) + ' | last citations: ' + JSON.stringify(_lastCites));
                } catch (_diagErr) { /* non-fatal */ }
                // Restore any URLs Gemini corrupted (truncation at end of section,
                // space injection at dots like "webmd. com", dropped https://) using
                // the canonical URIs from the reordered chunks. Deterministic because
                // after renumber, citation N is exactly reorderedChunks[N-1].
                fullDocument = restoreCanonicalCitationUrls(fullDocument, _renum.reorderedChunks);
                // Belt-and-suspenders: catch citations with look-alike brackets or
                // truncated URLs that the primary regex missed.
                fullDocument = defensiveLastCitationRepair(fullDocument, _renum.reorderedChunks);

                // Generate bibliography from reordered chunks so its numbers match body.
                var masterMetadata = { groundingChunks: _renum.reorderedChunks };
                fullDocument += generateBibliographyString(masterMetadata, 'Links Only', "Source Text References");
                fullDocument = validateAndRepairCitations(fullDocument, _renum.reorderedChunks);
                // Citation spacing normalization (mirrors the former short-path cleanup).
                // Multi-chunk per-section processing only moved trailing periods; it did
                // NOT split adjacent citations or clean up stray whitespace. Result: text
                // like "asleep  . [⁽¹⁾](url)" (double-space before period) and
                // "[⁽²⁾](url) . [⁽³⁾](url)" (period floating between two citations).
                // This pass normalizes the citation group into its canonical form:
                // "sentence. [⁽A⁾](url), [⁽B⁾](url)" — period before the group, comma
                // between adjacent citations, no double spaces. The patterns only match
                // superscript-containing links (body citations); bibliography entries
                // don't have superscripts so they are never affected.
                fullDocument = fullDocument
                    // 1. Strip stray tabs/spaces immediately before punctuation —
                    //    catches "asleep  . [cite]" → "asleep. [cite]".
                    .replace(/[ \t]+([.,;:!?])/g, '$1')
                    // 2. Drop interstitial periods between adjacent citations —
                    //    "[cite1] . [cite2]" is formatting junk (both citations support
                    //    the same claim, the period is a scrambled sentence-end
                    //    artifact). Replace with comma-separator, using lookahead so
                    //    chains of 3+ citations collapse in one pass.
                    .replace(/(\[⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\([^)]+\))\s*[.!?]\s+(?=\[⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\()/g, '$1, ')
                    // 3. Adjacent citation comma separator — no-space variant that
                    //    Gemini sometimes emits ("[cite1][cite2]").
                    .replace(/(\[⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\([^)]+\))(?=\[⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\()/g, '$1, ')
                    // 4. Adjacent citation comma separator — space-separated variant.
                    //    Lookahead lets chains collapse in one pass.
                    .replace(/(\[⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\([^)]+\))[ \t]+(?=\[⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\()/g, '$1, ')
                    // 5. Final collapse of 2+ tabs/spaces (preserve newlines).
                    .replace(/[ \t]{2,}/g, ' ');
           }
           if (effIncludeCitations) {
                const finalCitCount = (fullDocument.match(/\[⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\(/g) || []).length;

                const hasBiblio = /Source Text References/i.test(fullDocument);

                const sourceCount = (fullDocument.match(/^\d+\.\s+\[/gm) || []).length;

                console.log(`[Citations] 📊 Multi-chunk pipeline summary: ${finalCitCount} inline citations across ${sections.length} sections, bibliography=${hasBiblio}, ${sourceCount} sources listed, ${allGroundingChunks.length} total grounding chunks collected`);

                const hasCitationMarkers = finalCitCount > 0 || hasBiblio;

               if (!hasCitationMarkers) {
                   warnLog("Multi-chunk citation verification: No citation markers found despite setting enabled");
                   addToast(t('toasts.citations_unavailable'), "info");
               }
           }
           fullDocument = cleanSourceMetaCommentary(fullDocument);
           fullDocument = repairSourceMarkdown(fullDocument);
           setInputText(fullDocument);
           setShowSourceGen(false);
           addToast(t('input.success_long_form'), "success");
           setIsGeneratingSource(false);
           flyToElement('tour-source-input');
           return;
      }
      const minParagraphs = Math.max(3, Math.ceil(targetWords / 60));
      const minSections = Math.max(3, Math.ceil(targetWords / 250));
      // complexityGuard, structureInstruction, isDialogueMode, isNarrativeMode
      // are hoisted to the top of the function so the multi-chunk gate above
      // can reference them for the N=1 single-section prompt.
      let storyOutline = '';
      if (isDialogueMode) {
        addToast(t('input.drafting_story_outline') || "Planning dialogue structure...", "info");
        const outlinePrompt = `
You are designing an educational dialogue scene.
TOPIC TO TEACH: "${effTopic}"
TARGET READER AGE: ${effGrade}
${effStandards ? `KEY CONCEPTS TO INCLUDE: "${effStandards}"` : ''}
${researchContext ? `FACTUAL INFORMATION TO WEAVE IN:\n${researchContext}` : ''}
Create a DIALOGUE DISCOVERY PLAN with these sections:
## CHARACTERS
Define exactly 2 characters:
**THE LEARNER** (curious, asks questions):
- Name:
- Age/Role: (should be relatable to ${effGrade} readers)
- Personality: (curious? skeptical? impatient? nervous?)
- Why do they care about this topic? (personal motivation)
**THE GUIDE** (knowledgeable, explains through conversation):
- Name:
- Role: (grandparent, mentor, teacher, older sibling, expert friend)
- Teaching style: (uses analogies? asks guiding questions? tells stories from experience?)
## SETTING
- Location: (be specific - "the kitchen table" not "home")
- What brings them together? (natural reason for conversation)
- Any props or objects that can demonstrate concepts?
## THE HOOK
Write the opening 2-3 lines of dialogue that spark the conversation.
The Learner should ask a question or make an observation that launches the discussion.
## KEY QUESTIONS & DISCOVERIES
List 4-6 question → answer pairs that will form the backbone of the dialogue:
1. LEARNER asks: [specific question about ${effTopic}]
   GUIDE explains: [key concept, using analogy or example]
   LEARNER reacts: [shows understanding, asks follow-up, or pushes back]
2. (continue for each major concept)
## DEMONSTRATION MOMENT
Identify ONE hands-on moment where the Guide shows rather than tells:
- What object or action illustrates the concept?
- What does the Learner notice or discover?
## CLOSING EXCHANGE
How does the dialogue end? The Learner should:
- Summarize understanding in their own words
- Connect it to something in their life
- Express emotion (excitement, surprise, satisfaction)
IMPORTANT: Plan for DIALOGUE, not narration. 70%+ should be spoken lines.
        `;
        try {
          const outlineResult = await callGemini(outlinePrompt, false, false, 1.6);
          storyOutline = typeof outlineResult === 'object' ? (outlineResult.text || '') : String(outlineResult || '');
          storyOutline = storyOutline.replace(/^```[a-zA-Z]*\n/i, '').replace(/```\s*$/, '').trim();
        } catch (outlineErr) {
          warnLog("Dialogue plan generation failed, proceeding without plan:", outlineErr);
          storyOutline = '';
        }
      }
      const bilingualInstruction = getBilingualPromptInstruction(effectiveLanguage);
      const prompt = isDialogueMode ? `
You are generating an EDUCATIONAL DIALOGUE between two characters who explore a topic through natural conversation.
Topic: "${effTopic}"
Target reader level: ${effGrade}
${effDokLevel ? `Depth of complexity: ${effDokLevel}` : ''}
${effStandards ? `Concepts to weave in: "${effStandards}"` : ''}
Target length: approximately ${targetWords} words total
${storyOutline ? `
========== DIALOGUE PLAN TO FOLLOW ==========
${storyOutline}
========== END PLAN ==========
` : ''}
${researchContext ? `
Factual details to weave into the conversation:
${researchContext}
` : ''}
${effVocabulary ? `Key vocabulary to introduce naturally: ${effVocabulary}` : ''}
${effCustomInstructions ? `Special instructions: ${effCustomInstructions}` : ''}
========== OUTPUT FORMAT ==========
Return a JSON object with this exact structure:
{
  "title": "A catchy title for this dialogue",
  "setting": "Brief description of where/when this takes place (1 sentence)",
  "characters": {
    "learner": { "name": "Name", "description": "Brief personality" },
    "guide": { "name": "Name", "description": "Brief role/personality" }
  },
  "dialogue": [
    { "speaker": "learner", "action": "(optional action/emotion)", "line": "What the character says" },
    { "speaker": "guide", "action": "(smiling)", "line": "Response here" },
    { "speaker": "learner", "line": "Follow-up question without action" }
  ]
}
========== DIALOGUE QUALITY RULES ==========
✓ 80%+ of content should be in the dialogue lines, not narration
✓ Learner asks genuine questions a ${effGrade} student would ask
✓ Guide uses analogies and examples, NOT textbook definitions
✓ Include "Wait, so..." and "But why..." follow-up questions
✓ Learner has "aha!" moments and makes connections
✓ End with Learner summarizing understanding in their own words
✗ Guide should NOT give lectures or long uninterrupted explanations
✗ NO textbook-style definitions like "X is defined as..."
✗ Actions are optional - only include when they add meaning
========== READING LEVEL GUIDANCE ==========
${effGrade === 'Kindergarten' || effGrade === '1st Grade' ? 'Use very simple words. Short sentences. Learner asks basic "what" and "why" questions.' : ''}
${effGrade === '2nd Grade' || effGrade === '3rd Grade' ? 'Simple vocabulary. Learner is curious and asks lots of follow-ups. Guide uses kid-friendly comparisons.' : ''}
${effGrade === '4th Grade' || effGrade === '5th Grade' ? 'Natural conversation flow. Can introduce vocabulary with immediate explanation in dialogue.' : ''}
${effGrade === '6th Grade' || effGrade === '7th Grade' || effGrade === '8th Grade' ? 'More sophisticated dialogue. Learner can push back, express skepticism, ask deeper questions.' : ''}
${complexityGuard}
Return ONLY the JSON object. Do not include any preamble, markdown code blocks, or explanation.
      ` : `
        You are writing PART 1 of 1 of an educational text — a single self-contained segment that will be used as source material. Treat this as a segment rewrite, NOT as authoring a complete document with a bibliography at the end. The citation list will be generated automatically from grounding metadata and appended by the system.
        Topic: "${effTopic}"
        Target Reading Level: ${effGrade}
        Tone/Style: ${effTone}
        ${effDokLevel ? `Webb's Depth of Knowledge (DOK) Target: ${effDokLevel}` : ''}
        ${effStandards ? `Target Standard: "${effStandards}"` : ''}
        --- LENGTH REQUIREMENT: ${targetWords} WORDS ---
        Target approximately ${targetWords} words.
        IMPORTANT: Do not generate significantly more than ${targetWords} words. Keep it within 10% of the target.
        ${structureInstruction}
        ${targetWords >= 1000 ? 'EXPANSION STRATEGY: To reach this word count, you must "over-explain" concepts. Use multiple examples, detailed scenarios, and step-by-step breakdowns for every point. Do not summarize.' : 'Focus on clarity and conciseness to meet the word count without fluff.'}
        ${effVocabulary ? `Key Vocabulary to Include: ${effVocabulary}` : ''}
        ${effCustomInstructions ? `Custom Instructions: ${effCustomInstructions}` : ''}
        ${researchContext && !isShortText ? `
        --- RESEARCH BRIEF (USE AS FACTUAL FOUNDATION) ---
        The following key facts have been verified via web research.
        Base your content primarily on this information:
        """
        ${researchContext}
        """
        ------------------------------------------------
        VERIFICATION REQUIRED: Also use Google Search to verify facts and gather additional sources.
        SYNTHESIS INSTRUCTION: Use these verified facts to write a detailed, long-form original ${isNarrativeMode ? 'narrative article' : 'informational article'}. Weave them into a full lesson text.
        CRITICAL FORMAT RULES:
        - Write in PROSE PARAGRAPHS. Do NOT use numbered lists or bullet points for the main content. Use flowing text with complete paragraphs.
        - Do NOT include any "Sources", "References", "Works Cited", "Bibliography", or similar sections. I will automatically append verified sources at the end.
        - SPECIFICALLY FORBIDDEN: Do not write a "Source Text References" heading or any numbered list of citations like "1. [Title](url) 2. [Title](url)". These will be generated from my grounding metadata — any you write will be discarded.
        ` : (effIncludeCitations ? `
        CRITICAL: You MUST use Google Search to find, verify, and cite facts about "${effTopic}".
        Search for key facts, statistics, dates, and claims relevant to this topic. Every paragraph must include at least one cited source.
        ${isShortText ? `CITATION DENSITY (SHORT TEXT): This is a concise document. You MUST include at least 1 citation per paragraph. Every major factual claim needs a cited source. Err on the side of MORE citations, not fewer.` : ''}
        SYNTHESIS: Write a detailed, original ${isNarrativeMode ? 'narrative article' : 'informational article'}. Weave verified facts into a full lesson text. Do not produce a list of facts.
        CRITICAL FORMAT RULES:
        - Write in PROSE PARAGRAPHS. Do NOT use numbered lists or bullet points for the main content. Use flowing text with complete paragraphs.
        - Do NOT include any "Sources", "References", "Works Cited", "Bibliography", or similar sections. I will automatically append verified sources at the end.
        - SPECIFICALLY FORBIDDEN: Do not write a "Source Text References" heading or any numbered list of citations like "1. [Title](url) 2. [Title](url)". These will be generated from my grounding metadata — any you write will be discarded.
        ` : '')}
        STRICT READING LEVEL GUIDELINES (COMPENSATION FOR AI BIAS):
        - AI models typically write 1-2 grades higher than requested. You MUST compensate for this.
        - If "Kindergarten" or "1st Grade": Target Pre-K complexity. Use extremely short sentences (3-5 words). No compound sentences.
        - If "2nd Grade" or "3rd Grade": Target 1st Grade complexity. Use short, declarative sentences. High-frequency vocabulary only.
        - If "4th Grade" or "5th Grade": Target 3rd Grade complexity. Mostly simple sentences, limited compound sentences.
        - If "6th Grade" to "8th Grade": Target 5th Grade complexity. Straightforward syntax, avoid dense academic language.
        - If "9th Grade" to "12th Grade": Target 8th Grade complexity. Clear, standard English without unnecessary jargon.
        - GENERAL RULE: If in doubt, simplify further. Shorter sentences. Simpler words.
        ${complexityGuard}
        Instructions:
        - Write a well-structured text suitable for a classroom setting.
        - Ensure factual accuracy and clarity.
        - ${effTone === 'Persuasive' || effTone === 'Persuasive / Opinion' ? 'Write a compelling argumentative piece with clear claims, evidence, and a call to action.' : effTone === 'Humorous' || effTone === 'Humorous / Engaging' ? 'Use humor, jokes, and entertaining analogies while maintaining educational accuracy.' : effTone === 'Procedural' || effTone === 'Step-by-Step / Procedural' ? 'Write clear step-by-step instructions with numbered steps and helpful tips.' : 'Write in a formal, expository textbook style. Focus on factual presentation with clear definitions and explanations. Avoid narrative hooks, storytelling elements, or conversational language. Present information directly and academically.'}
        - Do not include any intro/outro conversational text (like "Here is the text"). Just provide the content.
        ${dialectInstruction}
        ${bilingualInstruction}
      `;
      const shouldUseJsonMode = false;
      const creativeTemperature = isNarrativeMode ? 1.6 : null;
      const useSearchForThisCall = effIncludeCitations;
      let result;
      let groundingSuccess = false;
      const maxGroundingRetries = 2;
      for (let attempt = 0; attempt <= maxGroundingRetries && !groundingSuccess; attempt++) {
          try {
              result = await callGemini(prompt, shouldUseJsonMode, useSearchForThisCall, creativeTemperature);
              groundingSuccess = true;
          } catch (apiError) {
              if (attempt < maxGroundingRetries && effIncludeCitations) {
                  warnLog(`Short text grounding attempt ${attempt + 1} failed, retrying...`, apiError.message);
                  await new Promise(r => setTimeout(r, 1500));
              } else if (effIncludeCitations) {
                  warnLog(`Short text grounding failed after ${attempt + 1} attempts, falling back to no-grounding`);
                  addToast(t('toasts.verification_unavailable'), "info");
                  try {
                      result = await callGemini(prompt, shouldUseJsonMode, false, creativeTemperature);
                  } catch (fallbackErr) {
                      warnLog(`[Citations] Fallback no-grounding call also failed:`, fallbackErr.message);
                      result = { text: "", groundingMetadata: null };
                  }
              } else {
                  throw apiError;
              }
          }
      }
      let text = '';
      if (typeof result === 'object' && result !== null && 'text' in result) {
          const rawText = result.text || "";
          if (effIncludeCitations && rawText) {
              const cleanedRawText = rawText.replace(/\[cite:\s*[\d,\s]+(?:in step \d+)?\]\.?\s*/gi, '');
              const rawWithCitations = processGrounding(cleanedRawText, result.groundingMetadata, 'Links Only', false, false);
              // Gate narrowed: non-dialogue short text now routes through the
              // multi-chunk pipeline (see !isDialogueMode branch above). Only
              // dialogue-mode single-call output reaches this path — and only
              // when it's short. The deterministic cleanup below is kept
              // intact for that case; LLM-cleanup branch below handles the
              // non-dialogue fallback if dialogue ever gets pushed into the
              // long-form path.
              if (isShortText && isDialogueMode) {
                  // ── Short text: deterministic citation cleanup (no lossy LLM round-trip) ──
                  setGenerationStep(t('status_steps.optimizing_citations'));
                  let processedText = rawWithCitations
                      // Move citations before punctuation to after: "fact [⁽¹⁾](url)." → "fact. [⁽¹⁾](url)"
                      .replace(/(\[⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\([^)]+\))\s*([.!?])/g, '$2 $1')
                      // Separate adjacent citations with comma
                      .replace(/(\[⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\([^)]+\))(\[⁽)/g, '$1, $2')
                      // Strip any Sources/References/Bibliography trailer at end of text
                      // (auto-generated later by generateBibliographyString). Lookahead-gated:
                      // only strips when the header is followed by at least one numbered
                      // markdown link. This prevents false matches on legitimate body content
                      // that happens to contain the word "References" or "Sources" — the
                      // over-match that tanked the earlier simplified-pipeline strip attempt.
                      // Supersedes the old `\s*[\n\r]+` requirement that failed when Gemini
                      // emitted refs as a flat one-line trailer.
                      .replace(/(?:\n|^)\s*(?:#{1,4}\s*)?(?:\*+\s*)?(?:Source\s+Text\s+References|Accuracy\s+Check\s+References|Verified\s+Sources|Works?\s+Cited|Bibliography|Citations)(?:\*+)?[\s:]*(?=\s*\d+\.\s*\[[^\]]+\]\()[\s\S]*$/i, '')
                      // Clean orphan brackets around citations
                      .replace(/\[(⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾)(?!\]\()/g, '$1')
                      .replace(/(⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾)\](?!\()/g, '$1')
                      // Remove remaining Source N references
                      .replace(/\[?Sources?\s+[\d,\s]+(?:and\s+\d+)?\]?/gi, '');
                  text = processedText.trim();
                  if (result.groundingMetadata?.groundingChunks) {
                      const { renumberedText, reorderedChunks } = renumberCitations(text, result.groundingMetadata.groundingChunks);
                      text = restoreCanonicalCitationUrls(renumberedText, reorderedChunks);
                      text = defensiveLastCitationRepair(text, reorderedChunks);
                      const tempMeta = { ...result.groundingMetadata, groundingChunks: reorderedChunks };
                      text += generateBibliographyString(tempMeta, 'Links Only', "Source Text References");
                  } else {
                      text += generateBibliographyString(result.groundingMetadata, 'Links Only', "Source Text References");
                  }
              } else {
              // ── Long text: LLM-based citation cleanup (existing behavior) ──
              setGenerationStep(t('status_steps.optimizing_citations') || 'Optimizing citations...');
              const cleanupPrompt = `
                You are a meticulous text editor. The text below contains citation links (e.g. [⁽¹⁾](url)).
                Task:
                1. Move the citation markers to the most appropriate location (usually the end of the sentence or clause, after punctuation).
                2. Ensure the Markdown Link syntax remains EXACTLY intact (do not break the URL or brackets).
                3. SEPARATE adjacent citations (e.g., transform "[⁽¹⁾](...)[⁽²⁾](...)" into "[⁽¹⁾](...), [⁽²⁾](...)"). Do NOT merge them into one number like "12".
                4. DEDUPLICATE: If the same source number appears multiple times in a single sentence, keep only the last one (e.g., "Facts [1] are facts [1]." -> "Facts are facts [1].").
                5. REMOVE any "Sources", "References", "Works Cited", "Bibliography" sections (these are auto-generated later). Look for headings like "Sources", "References", etc. followed by numbered lists and remove the entire section.
                6. Do not otherwise change the content text.
                Text to Fix:
                ${rawWithCitations}
              `;
              try {
                  const timeoutPromise = new Promise((_, reject) =>
                      setTimeout(() => reject(new Error("Optimization timed out")), 60000)
                  );
                  const cleaned = await Promise.race([
                      callGemini(cleanupPrompt),
                      timeoutPromise
                  ]);
                  if (!cleaned) throw new Error("Cleanup returned empty");
                  const rawCitCount = (rawWithCitations.match(/\[⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\(/g) || []).length;
                  const cleanedCitCount = (cleaned.match(/\[⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\(/g) || []).length;
                  if (rawCitCount > 0 && cleanedCitCount < rawCitCount * 0.5) {
                      warnLog(`Citation validation: cleanup lost ${rawCitCount - cleanedCitCount}/${rawCitCount} citations. Falling back to raw.`);
                      throw new Error("Citation loss detected - using raw grounding");
                  }
                  let strippedText = cleaned.replace(/(?:\n|^)\s*(?:#{1,4}\s*)?(?:\*+\s*)?(?:Source\s+Text\s+References|Accuracy\s+Check\s+References|Verified\s+Sources|Works?\s+Cited|Bibliography|Citations)(?:\*+)?[\s:]*(?=\s*\d+\.\s*\[[^\]]+\]\()[\s\S]*$/i, '\n');
                  text = strippedText.trim();
                  if (result.groundingMetadata?.groundingChunks) {
                      const { renumberedText, reorderedChunks } = renumberCitations(text, result.groundingMetadata.groundingChunks);
                      // CANONICAL URL VALIDATION: the cleanup round-trip above can corrupt URLs
                      // (truncate mid-domain, drop the closing paren, space-pad at dots, drop
                      // the protocol). Rebuild every [⁽N⁾](url) using the canonical web.uri
                      // from reorderedChunks[N-1] — after renumber, N is a deterministic index.
                      text = restoreCanonicalCitationUrls(renumberedText, reorderedChunks);
                      text = defensiveLastCitationRepair(text, reorderedChunks);
                      const tempMeta = { ...result.groundingMetadata, groundingChunks: reorderedChunks };
                      text += generateBibliographyString(tempMeta, 'Links Only', "Source Text References");
                  } else {
                      text += generateBibliographyString(result.groundingMetadata, 'Links Only', "Source Text References");
                  }
              } catch (cleanupErr) {
                  warnLog("Citation placement optimization skipped (Timeout or Error):", cleanupErr);
                  const cleanedFallback = rawText.replace(/\[cite:\s*[\d,\s]+(?:in step \d+)?\]\.?\s*/gi, '');
                  let fallbackText = processGrounding(cleanedFallback, result.groundingMetadata, 'Links Only', false, false);
                  fallbackText = fallbackText.replace(/(?:\n|^)\s*(?:#{1,4}\s*)?(?:\*+\s*)?(?:Source\s+Text\s+References|Accuracy\s+Check\s+References|Verified\s+Sources|Works?\s+Cited|Bibliography|Citations)(?:\*+)?[\s:]*(?=\s*\d+\.\s*\[[^\]]+\]\()[\s\S]*$/i, '\n').trim();
                  if (result.groundingMetadata?.groundingChunks) {
                      const { renumberedText, reorderedChunks } = renumberCitations(fallbackText, result.groundingMetadata.groundingChunks);
                      fallbackText = restoreCanonicalCitationUrls(renumberedText, reorderedChunks);
                      fallbackText = defensiveLastCitationRepair(fallbackText, reorderedChunks);
                      const tempMeta = { ...result.groundingMetadata, groundingChunks: reorderedChunks };
                      fallbackText += generateBibliographyString(tempMeta, 'Links Only', "Source Text References");
                  } else {
                      fallbackText += generateBibliographyString(result.groundingMetadata, 'Links Only', "Source Text References");
                  }
                  text = fallbackText;
                  if (cleanupErr.message === "Optimization timed out") {
                      addToast(t('input.error_optimization_timeout'), "info");
                  }
              }
              }
          } else {
              text = rawText;
          }
      } else {
          text = String(result || "");
      }
      if (isDialogueMode && text) {
        try {
          const dialogueData = safeJsonParse(text);
          if (dialogueData && dialogueData.dialogue && Array.isArray(dialogueData.dialogue)) {
            let formattedScript = '';
            if (dialogueData.title) {
              formattedScript += `# ${dialogueData.title}\n\n`;
            }
            if (dialogueData.setting) {
              formattedScript += `*${dialogueData.setting}*\n\n`;
            }
            const learnerName = dialogueData.characters?.learner?.name || 'LEARNER';
            const guideName = dialogueData.characters?.guide?.name || 'GUIDE';
            for (const line of dialogueData.dialogue) {
              const speakerName = line.speaker === 'learner' ? learnerName.toUpperCase() : guideName.toUpperCase();
              const action = line.action ? ` ${line.action}` : '';
              formattedScript += `**${speakerName}:**${action} ${line.line}\n\n`;
            }
            text = formattedScript.trim();
          }
        } catch (parseErr) {
          warnLog("Dialogue JSON parsing failed, using raw text:", parseErr);
        }
      }
      if (effIncludeCitations && text) {
          text = sanitizeRawUrls(text);
          if (result?.groundingMetadata?.groundingChunks) {
              text = validateAndRepairCitations(text, result.groundingMetadata.groundingChunks);
          }
          const hasCitationMarkers = /\[⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\(/.test(text) || /Source Text References/i.test(text);
          if (!hasCitationMarkers && isShortText) {
              // Short text citation density retry: regenerate once if zero citations
              warnLog("[Citations] Short text got 0 citations, retrying generation once...");
              try {
                  setGenerationStep(t('status_steps.retrying_citations') || 'Retrying for better citations...');
                  const retryResult = await callGemini(prompt, shouldUseJsonMode, useSearchForThisCall, creativeTemperature);
                  if (typeof retryResult === 'object' && retryResult !== null && retryResult.text) {
                      const retryRaw = retryResult.text.replace(/\[cite:\s*[\d,\s]+(?:in step \d+)?\]\.?\s*/gi, '');
                      let retryText = processGrounding(retryRaw, retryResult.groundingMetadata, 'Links Only', false, false);
                      // Apply deterministic cleanup
                      retryText = retryText
                          .replace(/(\[⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\([^)]+\))\s*([.!?])/g, '$2 $1')
                          .replace(/(\[⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\([^)]+\))(\[⁽)/g, '$1, $2')
                          .replace(/(?:\n|^)\s*(?:#{1,4}\s*)?(?:\*+\s*)?(?:Source\s+Text\s+References|Accuracy\s+Check\s+References|Verified\s+Sources|Works?\s+Cited|Bibliography|Citations)(?:\*+)?[\s:]*(?=\s*\d+\.\s*\[[^\]]+\]\()[\s\S]*$/i, '\n')
                          .replace(/\[(⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾)(?!\]\()/g, '$1')
                          .replace(/(⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾)\](?!\()/g, '$1')
                          .replace(/\[?Sources?\s+[\d,\s]+(?:and\s+\d+)?\]?/gi, '')
                          .trim();
                      if (retryResult.groundingMetadata?.groundingChunks) {
                          const { renumberedText, reorderedChunks } = renumberCitations(retryText, retryResult.groundingMetadata.groundingChunks);
                          retryText = restoreCanonicalCitationUrls(renumberedText, reorderedChunks);
                          retryText = defensiveLastCitationRepair(retryText, reorderedChunks);
                          const tempMeta = { ...retryResult.groundingMetadata, groundingChunks: reorderedChunks };
                          retryText += generateBibliographyString(tempMeta, 'Links Only', "Source Text References");
                      }
                      const retryCitCount = (retryText.match(/\[⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\(/g) || []).length;
                      if (retryCitCount > 0) {
                          text = retryText;
                          warnLog(`[Citations] Retry succeeded: ${retryCitCount} citations recovered`);
                      } else {
                          warnLog("[Citations] Retry also yielded 0 citations");
                          addToast(t('toasts.citations_unavailable'), "info");
                      }
                  }
              } catch (retryErr) {
                  warnLog("[Citations] Retry failed:", retryErr.message);
                  addToast(t('toasts.citations_unavailable'), "info");
              }
          } else if (!hasCitationMarkers) {
              warnLog("Citation verification: No citation markers found despite setting enabled");
              addToast(t('toasts.citations_unavailable'), "info");
          }
      }
      text = cleanSourceMetaCommentary(text);
      text = ensureTitleHeading(text);
      text = repairSourceMarkdown(text);
      setInputText(text);
      setShowSourceGen(false);
    } catch (err) {
      console.error('[CE-TRACE] CAUGHT ERROR in handleGenerateSource:', err);
      if (!err.message?.includes("401")) {
          warnLog("Unhandled error:", err);
      }
      const errMsg = err.message?.includes("Blocked") ? "Content blocked by safety filters." :
                     err.message?.includes("Stopped") ? "Generation stopped by AI model." :
                     err.message?.includes("401") ? "Daily Usage Limit Reached. Please try again later." :
                     "Error generating content. Please try again.";
      setError(errMsg);
      addToast(errMsg, "error");
      if (isBotVisible && alloBotRef.current) {
          alloBotRef.current.speak(t('bot_events.feedback_error_apology'), 'confused');
      }
    } finally {
      setIsGeneratingSource(false);
      flyToElement('tour-source-input');
    }
  };
  const addLanguage = () => {
    if (languageInput.trim() && !selectedLanguages.includes(languageInput.trim()) && selectedLanguages.length < 4) {
      setSelectedLanguages([...selectedLanguages, languageInput.trim()]);
      setLanguageInput('');
    }
  };
  const addInterest = () => {
    if (interestInput.trim() && !studentInterests.includes(interestInput.trim()) && studentInterests.length < 5) {
      setStudentInterests([...studentInterests, interestInput.trim()]);
      setInterestInput('');
    }
  };
  const removeInterest = (interest) => {
    setStudentInterests(studentInterests.filter(i => i !== interest));
  };
  const handleInterestKeyDown = (e) => {
    if (e.key === 'Enter') addInterest();
  };
  const removeLanguage = (lang) => {
    const newLangs = selectedLanguages.filter(l => l !== lang);
    setSelectedLanguages(newLangs);
    if (leveledTextLanguage === lang) setLeveledTextLanguage('English');
    if (leveledTextLanguage === 'All Selected Languages' && newLangs.length === 0) setLeveledTextLanguage('English');
  };
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') addLanguage();
  };
  const addConcept = () => {
    if (conceptInput.trim() && !selectedConcepts.includes(conceptInput.trim()) && selectedConcepts.length < 5) {
      setSelectedConcepts([...selectedConcepts, conceptInput.trim()]);
      setConceptInput('');
    }
  };
  const removeConcept = (concept) => {
    setSelectedConcepts(selectedConcepts.filter(c => c !== concept));
  };
  const handleConceptKeyDown = (e) => {
      if (e.key === 'Enter') addConcept();
  };
  const handleDownloadImage = () => {
    if (generatedContent?.type !== 'image' || !generatedContent?.data?.imageUrl) return;
    const downloadWithLabels = (imgUrl, labels, filename) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            if (labels && labels.length > 0) {
                ctx.font = 'bold 14px Inter, Segoe UI, system-ui, sans-serif';
                ctx.textAlign = 'center';
                labels.forEach(label => {
                    const x = (label.x / 100) * canvas.width;
                    const y = (label.y / 100) * canvas.height;
                    const text = label.text || '';
                    const metrics = ctx.measureText(text);
                    const pad = 6;
                    ctx.fillStyle = 'rgba(30, 27, 75, 0.85)';
                    const rx = x - metrics.width / 2 - pad;
                    const ry = y - 10;
                    const rw = metrics.width + pad * 2;
                    const rh = 20;
                    ctx.beginPath();
                    ctx.roundRect(rx, ry, rw, rh, 4);
                    ctx.fill();
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(text, x, y + 4);
                });
            }
            canvas.toBlob(blob => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 'image/png');
        };
        img.onerror = () => {
            const link = document.createElement('a');
            link.href = imgUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };
        img.src = imgUrl;
    };
    if (generatedContent?.data.visualPlan && generatedContent?.data.visualPlan.panels.length > 1) {
        const labelsHidden = document.querySelector('[data-labels-hidden]');
        generatedContent?.data.visualPlan.panels.forEach((panel, idx) => {
            if (!panel.imageUrl) return;
            const labels = !labelsHidden ? (panel.labels || []) : [];
            setTimeout(() => {
                downloadWithLabels(panel.imageUrl, labels, `udl-visual-panel-${idx + 1}-${Date.now()}.png`);
            }, idx * 500);
        });
        addToast(t('visual_director.panels_downloaded') || `${generatedContent?.data.visualPlan.panels.length} panels downloaded!`, "success");
    } else {
        downloadWithLabels(generatedContent?.data.imageUrl, [], `udl-visual-support-${Date.now()}.png`);
        addToast(t('toasts.image_saved'), "success");
    }
  };
  const handleDeleteImage = () => {
    if (generatedContent) {
      setGeneratedContent(function(prev) { return prev ? Object.assign({}, prev, { data: Object.assign({}, prev.data, { imageUrl: null, visualPlan: null }) }) : null; });
    }
  };

  // ── Text Revision + Selection handlers ──
  const handleTextMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.toString().trim().length === 0) {
          return;
      }
      const text = selection.toString().trim();
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (interactionMode === 'explain' || interactionMode === 'revise' || interactionMode === 'define' || interactionMode === 'add-glossary') {
          setSelectionMenu({
              x: rect.left + (rect.width / 2),
              y: rect.top,
              text: text
          });
      }
  };
  // Citation-restore helper. If the model dropped [⁽N⁾](url) wrappers from
  // the original and emitted bare URLs, put the wrappers back so the
  // simplified-view renderer turns them into numbered chips instead of raw
  // URL text. Also strips bare URLs that were NOT in the original (likely
  // hallucinated citations).
  const _restoreCitations = (result, original) => {
      if (!result || !original || typeof result !== 'string' || typeof original !== 'string') return result;
      const citRegex = /\[(⁽[0-9⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾)\]\(([^)]+)\)/g;
      const urlToMarker = new Map();
      let m;
      while ((m = citRegex.exec(original)) !== null) {
          urlToMarker.set(m[2], m[1]);
      }
      let fixed = result;
      // Re-wrap known bare URLs
      urlToMarker.forEach((marker, url) => {
          const urlEsc = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          // If the URL is already inside a markdown link in the result, skip.
          const alreadyLinked = new RegExp('\\]\\(' + urlEsc + '\\)');
          if (alreadyLinked.test(fixed)) return;
          // Replace the bare URL (not already inside ](...)) with a citation.
          const bareUrl = new RegExp('(^|[^(\\[])' + urlEsc, 'g');
          fixed = fixed.replace(bareUrl, '$1[' + marker + '](' + url + ')');
      });
      return fixed;
  };
  const handleReviseSelection = async (action, customInstruction = '') => {
      if (!selectionMenu || !selectionMenu.text) return;
      const originalText = selectionMenu.text;
      if (action === 'custom-input') {
          setIsCustomReviseOpen(true);
          return;
      }
      setSelectionMenu(null);
      setIsCustomReviseOpen(false);
      setRevisionData({
          type: action,
          original: originalText,
          result: null,
          x: selectionMenu.x,
          y: selectionMenu.y
      });
      try {
          const currentFullText = typeof generatedContent?.data === 'string' ? generatedContent?.data : '';
          const isBilingual = currentFullText.includes("--- ENGLISH TRANSLATION ---");
          if (isBilingual && (action === 'simplify' || action === 'custom')) {
               const prompt = `
                You are an expert educational editor helping a teacher revise a bilingual text.
                Goal: ${action === 'simplify' ? `Simplify the selected text for ${gradeLevel}.` : `Revise based on: "${customInstruction}".`}
                Context:
                The document contains a text in a target language and its English translation, separated by "--- ENGLISH TRANSLATION ---".
                Full Document:
                """${currentFullText}""",
                Selected Text to Revise: "${originalText}",
                Task:
                1. Identify if the "Selected Text" comes from the English section or the Target Language section.
                2. Revise the "Selected Text" according to the goal.
                3. Locate the corresponding equivalent segment in the OTHER language section.
                4. Revise that corresponding segment so it accurately reflects the changes made to the selected text (maintaining meaning and complexity alignment).
                Output JSON ONLY:
                {
                    "primaryRevision": "The revised version of the selected text",
                    "replacements": [
                        { "original": "The exact string of the selected text found in the document", "new": "The revised version" },
                        { "original": "The exact string of the corresponding segment found in the other language", "new": "The revised equivalent" }
                    ]
                }
               `;
               const jsonStr = await callGemini(prompt, true);
               try {
                   const data = JSON.parse(cleanJson(jsonStr));
                   setRevisionData(prev => ({
                       ...prev,
                       result: data.primaryRevision,
                       replacements: data.replacements
                   }));
                   return;
               } catch (jsonErr) {
                   warnLog("Bilingual revision JSON parse failed, falling back to standard revision.", jsonErr);
                   addToast(t('toasts.complex_revision_fallback'), "info");
               }
          }
          let prompt;
          const outputLang = leveledTextLanguage === 'All Selected Languages' ? 'English' : leveledTextLanguage;
          const dialectInstruction = outputLang !== 'English' ? `STRICT DIALECT ADHERENCE: If a specific dialect is named (e.g. 'Brazilian Portuguese' vs 'European Portuguese'), explicitly use that region's vocabulary, spelling, and grammar conventions.` : '';
          // Shared preservation rules injected into Revise/Simplify prompts so
          // Gemini keeps citation chips like [⁽1⁾](url) and markdown structure
          // intact. Without this, the model drops citation wrappers and
          // re-emits raw URLs inline, breaking the simplified view's renderer.
          const preservationRules = `
                PRESERVATION RULES (follow EXACTLY):
                1. If the input contains citation markers in the form [⁽N⁾](url)
                   (e.g. [⁽1⁾](https://example.com)), keep EACH ONE VERBATIM in
                   your output at the appropriate place in the new sentence.
                   Do not re-number them, drop the superscript wrapper, or
                   convert them into plain URLs.
                2. NEVER emit a bare URL (e.g. "https://example.com") anywhere
                   in your output. URLs must only appear inside a
                   [⁽N⁾](url) markdown link.
                3. Preserve markdown structure from the input: keep bullet
                   points (- or *), numbered lists, bold (**...**), headers
                   (#, ##, ###), and paragraph breaks exactly where they are.
              `;
          if (action === 'simplify') {
              prompt = `
                Simplify this specific sentence/phrase for a ${gradeLevel} student.
                Keep the meaning but make it easier to read.
                Context Topic: ${sourceTopic || "General"}.
                Text to simplify: "${originalText}",
                CRITICAL: Output the simplified text in the SAME language as the input "Text to simplify".
                ${preservationRules}
                ${dialectInstruction}
                Return ONLY the simplified text. No quotes or labels.
              `;
          } else if (action === 'custom') {
              prompt = `
                Revise the following text based on these instructions: "${customInstruction}",
                Text to revise: "${originalText}"
                Context Topic: ${sourceTopic || "General"}.
                Target Audience: ${gradeLevel}.
                CRITICAL: Output the revised text in the SAME language as the input "Text to revise" unless the instructions explicitly ask to translate.
                ${preservationRules}
                ${dialectInstruction}
                Return ONLY the revised text. No quotes, no conversational filler.
              `;
          } else {
              prompt = `
                Explain the meaning of this phrase for a ${gradeLevel} student.
                Provide a short, clear explanation or definition.
                Context Topic: ${sourceTopic || "General"}.
                Phrase: "${originalText}",
                Output Language: ${outputLang}.
                ${outputLang !== 'English' ? `Provide the explanation in ${outputLang} first. Then add a new line with "**English:**" followed by the English explanation.` : ''}
                IMPORTANT: Do NOT include bare URLs in your explanation. Reference sources only by name.
                ${dialectInstruction}
                Return ONLY the explanation.
              `;
          }
          const result = await callGemini(prompt);
          // Safety net: if Gemini still dropped citation wrappers and emitted
          // bare URLs that were cited in the original, re-wrap them as [⁽N⁾](url).
          const restoredResult = _restoreCitations(result, originalText);
          setRevisionData(prev => ({
              ...prev,
              result: restoredResult
          }));
      } catch (err) {
          warnLog("Unhandled error:", err);
          setRevisionData(null);
          addToast(t('toasts.revision_failed'), "error");
      } finally {
      }
  };
  const handleWordClick = async (rawWord, e) => {
      if (interactionMode !== 'define') return;
      e.stopPropagation();
      const word = rawWord.replace(/[^a-zA-ZÀ-ÿ0-9-\s]/g, "").trim();
      if (!word || word.length < 2) return;
      const x = e.clientX;
      const y = e.clientY;
      setDefinitionData({
          word,
          text: null,
          x,
          y
      });
      try {
          const outputLang = leveledTextLanguage === 'All Selected Languages' ? 'English' : leveledTextLanguage;
          const prompt = `
            Define the word "${word}" for a ${gradeLevel} student.
            Context Topic: ${sourceTopic || "General"}.
            Output Language: ${outputLang}.
            ${outputLang !== 'English' ? `Provide the definition in ${outputLang} first. Then add a new line with "**English:**" followed by the English definition.` : ''}
            ${outputLang !== 'English' ? `STRICT DIALECT ADHERENCE: If a specific dialect is named (e.g. 'Brazilian Portuguese'), use that region's conventions.` : ''}
            IMPORTANT: Do NOT include bare URLs in your definition. Reference sources only by name.
            Return ONLY the definition. Keep it concise (1-2 sentences).
          `;
          const result = await callGemini(prompt);
          setDefinitionData(prev => ({
              ...prev,
              text: result
          }));
      } catch (err) {
          warnLog("Unhandled error:", err);
          setDefinitionData(null);
          addToast(t('toasts.definition_failed'), "error");
      } finally {
      }
  };
  const handlePhonicsClick = async (rawWord, e = null) => {
      // Use a Unicode property class so non-Latin scripts (Cyrillic, Greek, Arabic, Hebrew,
      // Han, Hiragana/Katakana, Hangul, Devanagari, etc.) survive the character scrub.
      // Previously the regex was /[^a-zA-ZÀ-ÿ0-9-\s]/g which kept only Latin + Latin-Extended-A,
      // so a click on any non-Latin word produced an empty string and silently did nothing.
      const word = rawWord.replace(/[^\p{L}\p{N}\s-]/gu, "").trim();
      if (!word) return;
      if (e) e.stopPropagation();
      const reqId = ++_phonicsReqId;
      setPhonicsData({
          word,
          data: null,
          isLoading: true,
          x: e ? e.clientX : 0,
          y: e ? e.clientY : 0
      });
      // Resolve the active content language. "All Selected Languages" is a UI pseudo-value
      // that means "generate in every selected language"; for phonics of a specific word,
      // fall back to English as the analysis language in that ambiguous case.
      const _phLang = (leveledTextLanguage && leveledTextLanguage !== 'All Selected Languages')
          ? leveledTextLanguage : 'English';
      try {
          const prompt = _phLang === 'English'
              ? `Analyze the English word: '${word}'. Return ONLY JSON: { "ipa": "International Phonetic Alphabet representation", "phoneticSpelling": "Simple phonetic spelling (e.g. cat -> kat)", "syllables": ["syl", "la", "bles"] }.`
              : `Analyze the ${_phLang} word: '${word}'. Return IPA and syllables appropriate to ${_phLang} phonology — NOT English. Return ONLY JSON: { "ipa": "IPA in the ${_phLang} phoneme system", "phoneticSpelling": "Simple phonetic spelling a ${_phLang} reader would understand", "syllables": ["syl","la","bles"] }.`;
          const result = await callGemini(prompt, true);
          if (reqId !== _phonicsReqId) return;
          let data;
          try {
              data = JSON.parse(cleanJson(result));
          } catch (jsonError) {
              warnLog("Phonics JSON Parse Error:", jsonError);
              if (reqId !== _phonicsReqId) return;
              setPhonicsData(null);
              addToast(t('toasts.phonics_parse_failed'), "error");
              return;
          }
          setPhonicsData(prev => (reqId === _phonicsReqId && prev ? {
              ...prev,
              data: data,
              isLoading: false
          } : prev));
          try {
              // Pass the active language so callTTS can (a) swap Kokoro for a multilingual
              // Gemini voice when content is non-English, and (b) include a language-hint
              // prefix in the TTS prompt so Gemini uses the right phonology.
              const audioUrl = await callTTS(word, selectedVoice, voiceSpeed || 1, 2, _phLang);
              if (reqId !== _phonicsReqId) return;
              if (audioUrl) {
                  const audio = new Audio(audioUrl);
                  audio.playbackRate = voiceSpeed;
                  await audio.play();
                  if (reqId !== _phonicsReqId) return;
                  setPhonicsData(prev => (reqId === _phonicsReqId && prev ? {
                      ...prev,
                      audioUrl: audioUrl
                  } : prev));
              }
          } catch (audioError) {
              warnLog("Phonics audio error:", audioError);
              if (reqId === _phonicsReqId) addToast(t('toasts.phonics_audio_failed'), "error");
          }
      } catch (error) {
          warnLog("Phonics Error:", error);
          if (reqId !== _phonicsReqId) return;
          addToast(t('toasts.phonics_analyze_failed'), "error");
          setPhonicsData(null);
      }
  };
  const applyTextRevision = async () => {
      if (!revisionData || !revisionData.result || !generatedContent) return;
      const currentFullText = typeof generatedContent?.data === 'string' ? generatedContent?.data : '';
      let newFullText = currentFullText;
      // Track the (original → replacement) pairs we actually applied, so the bilingual
      // sync step below can translate the same edits into the other-language block.
      const _appliedEdits = [];
      if (revisionData.replacements && Array.isArray(revisionData.replacements)) {
          let notFoundCount = 0;
          revisionData.replacements.forEach(rep => {
              if (newFullText.includes(rep.original)) {
                  newFullText = newFullText.replace(rep.original, rep.new);
                  _appliedEdits.push({ original: rep.original, result: rep.new });
              } else {
                  notFoundCount++;
              }
          });
          if (notFoundCount === revisionData.replacements.length) {
               addToast(t('toasts.text_not_found'), "error");
               return;
          }
      } else {
          const after = currentFullText.replace(revisionData.original, revisionData.result);
          if (after === currentFullText) {
              addToast(t('toasts.text_exact_not_found'), "error");
              return;
          }
          newFullText = after;
          _appliedEdits.push({ original: revisionData.original, result: revisionData.result });
      }
      handleSimplifiedTextChange(newFullText);
      setRevisionData(null);
      window.getSelection().removeAllRanges();
      addToast(t('toasts.text_updated'), "success");

      // ── Bidirectional bilingual sync ───────────────────────────────────────────
      // If the document has a "--- ENGLISH TRANSLATION ---" delimiter, try to keep
      // the paired sentence in the OTHER block consistent with the edit we just
      // applied. For each applied edit we:
      //   1. Determine whether it landed in the target-language half or the English
      //      half (by substring position relative to the delimiter).
      //   2. Find the counterpart sentence in the other half at the same sentence
      //      index within its paragraph (best-effort — bilingual output from
      //      generateBilingualText preserves paragraph + sentence parity).
      //   3. Ask Gemini to translate the NEW version (one short call per edit)
      //      into the other language, then replace just that counterpart sentence.
      // This is best-effort: if the counterpart can't be found, or translation
      // fails, we silently skip — the primary edit is already committed.
      const BILINGUAL_DELIMITER = '--- ENGLISH TRANSLATION ---';
      const _biIdx = newFullText.indexOf(BILINGUAL_DELIMITER);
      if (_biIdx === -1 || _appliedEdits.length === 0 || !callGemini) return;
      const targetLang = (leveledTextLanguage && leveledTextLanguage !== 'All Selected Languages' && leveledTextLanguage !== 'English')
          ? leveledTextLanguage : null;
      if (!targetLang) return; // no meaningful paired language
      const _splitIntoSentences = (txt) => {
          // Mirror the splitTextToSentences heuristic used in the renderer so indices line up.
          const m = (txt || '').match(/[^.!?…]+[.!?…]+\s*/g);
          return m ? m.map(s => s.trim()).filter(Boolean) : (txt ? [txt.trim()] : []);
      };
      let resultText = newFullText;
      let syncedCount = 0;
      for (const edit of _appliedEdits) {
          // Where did the EDITED sentence land? Search the NEW text for the replacement.
          const editPos = resultText.indexOf(edit.result);
          if (editPos === -1) continue;
          const biIdxNow = resultText.indexOf(BILINGUAL_DELIMITER);
          const editInTarget = editPos < biIdxNow;
          const sourceSentences = editInTarget ? _splitIntoSentences(resultText.substring(0, biIdxNow))
                                               : _splitIntoSentences(resultText.substring(biIdxNow + BILINGUAL_DELIMITER.length));
          const pairedSentences = editInTarget ? _splitIntoSentences(resultText.substring(biIdxNow + BILINGUAL_DELIMITER.length))
                                               : _splitIntoSentences(resultText.substring(0, biIdxNow));
          const editedSentenceIdx = sourceSentences.findIndex(s => s.includes(edit.result.trim().split(/[.!?…]/)[0].slice(0, 40)));
          if (editedSentenceIdx === -1 || editedSentenceIdx >= pairedSentences.length) continue;
          const counterpart = pairedSentences[editedSentenceIdx];
          if (!counterpart) continue;
          const translatePrompt = editInTarget
              ? `Translate this ${targetLang} sentence into English, preserving meaning, tone, and any citation markers like ⁽¹⁾:\n"${edit.result}"\nReturn ONLY the English translation — no quotes, no explanation.`
              : `Translate this English sentence into ${targetLang}, preserving meaning, tone, and any citation markers like ⁽¹⁾:\n"${edit.result}"\nReturn ONLY the ${targetLang} translation — no quotes, no explanation.`;
          try {
              const translation = await callGemini(translatePrompt);
              const cleanTranslation = String(translation || '').trim().replace(/^["""'']|["""''.]$/g, '').trim();
              if (!cleanTranslation) continue;
              if (resultText.includes(counterpart)) {
                  resultText = resultText.replace(counterpart, cleanTranslation);
                  syncedCount++;
              }
          } catch (e) {
              warnLog('Bilingual sync translation failed for an edit:', e?.message || e);
          }
      }
      if (syncedCount > 0 && resultText !== newFullText) {
          handleSimplifiedTextChange(resultText);
          addToast((t('toasts.bilingual_synced') || 'Paired translation updated.') + ' (' + syncedCount + ')', 'info');
      }
  };
  const closeRevision = () => {
      setRevisionData(null);
      setSelectionMenu(null);
      setIsCustomReviseOpen(false);
      setCustomReviseInstruction('');
      window.getSelection().removeAllRanges();
  };
  const closeDefinition = () => setDefinitionData(null);
  const closePhonics = () => {
      if (phonicsData?.audioUrl) {
          URL.revokeObjectURL(phonicsData.audioUrl);
      }
      setPhonicsData(null);
      stopPlayback();
  };
  const handleDefineSelection = async () => {
      if (!selectionMenu || !selectionMenu.text) return;
      const word = selectionMenu.text.trim();
      const x = selectionMenu.x;
      const y = selectionMenu.y;
      setDefinitionData({
          word,
          text: null,
          x,
          y
      });
      setSelectionMenu(null);
      try {
          const outputLang = leveledTextLanguage === 'All Selected Languages' ? 'English' : leveledTextLanguage;
          const prompt = `
            Define the word or phrase "${word}" for a ${gradeLevel} student.
            Context Topic: ${sourceTopic || "General"}.
            Output Language: ${outputLang}.
            ${outputLang !== 'English' ? `Provide the definition in ${outputLang} first. Then add a new line with "**English:**" followed by the English definition.` : ''}
            ${outputLang !== 'English' ? `STRICT DIALECT ADHERENCE: If a specific dialect is named (e.g. 'Brazilian Portuguese'), use that region's conventions.` : ''}
            Return ONLY the definition. Keep it concise (1-2 sentences).
          `;
          const result = await callGemini(prompt);
          setDefinitionData(prev => ({
              ...prev,
              text: result
          }));
      } catch (err) {
          warnLog("Unhandled error:", err);
          setDefinitionData(null);
          addToast(t('toasts.definition_failed'), "error");
      } finally {
      }
  };
  const stopPlayback = () => {
    // Read refs from window state bag (they're React refs in the main component)
    var _state = window.__contentEngineState || window.__docPipelineState || {};
    var _playbackRef = _state.playbackSessionRef || (typeof playbackSessionRef !== 'undefined' ? playbackSessionRef : null);
    var _audioRef = _state.audioRef || (typeof audioRef !== 'undefined' ? audioRef : null);
    var _blobUrlsRef = _state.activeBlobUrlsRef || (typeof activeBlobUrlsRef !== 'undefined' ? activeBlobUrlsRef : null);
    // Invalidate the current playback session so any in-flight playSequence
    // chain stops at its next iteration check
    if (_playbackRef) _playbackRef.current = -1;
    if (_audioRef && _audioRef.current) {
        const currentSrc = _audioRef.current.src;
        _audioRef.current.pause();
        _audioRef.current.onended = null; // prevent chained playback
        if (currentSrc && currentSrc.startsWith('blob:') && _blobUrlsRef) {
             URL.revokeObjectURL(currentSrc);
             _blobUrlsRef.current.delete(currentSrc);
        }
        _audioRef.current = null;
    }
    // Stop any Kokoro streaming queue
    if (window._kokoroTTS && window._kokoroTTS.stop) {
        try { window._kokoroTTS.stop(); } catch(e) {}
    }
    // Cancel any browser speechSynthesis
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    // Clear any pending playback timeout
    var _timeoutRef = _state.playbackTimeoutRef || null;
    if (_timeoutRef && _timeoutRef.current) {
        clearTimeout(_timeoutRef.current);
        _timeoutRef.current = null;
    }
    if (typeof setIsPlaying === 'function') setIsPlaying(false);
    else if (_state.setIsPlaying) _state.setIsPlaying(false);
    if (typeof setIsPaused === 'function') setIsPaused(false);
    else if (_state.setIsPaused) _state.setIsPaused(false);
    if (typeof setPlayingContentId === 'function') setPlayingContentId(null);
    if (typeof setPlaybackState === 'function') setPlaybackState({ sentences: [], currentIdx: -1 });
    if (isPlayingRef) isPlayingRef.current = false;
    if (isSystemAudioActiveRef) isSystemAudioActiveRef.current = false;
  };

  var _wrap = function(fn) { return function() { _bindState(); return fn.apply(this, arguments); }; };
  var _wrapAsync = function(fn) { return async function() { _bindState(); return fn.apply(this, arguments); }; };
  return {
    handleGenerateSource: _wrapAsync(handleGenerateSource),
    addLanguage: _wrap(addLanguage),
    addInterest: _wrap(addInterest),
    removeInterest: _wrap(removeInterest),
    handleInterestKeyDown: _wrap(handleInterestKeyDown),
    removeLanguage: _wrap(removeLanguage),
    handleKeyDown: _wrap(handleKeyDown),
    addConcept: _wrap(addConcept),
    removeConcept: _wrap(removeConcept),
    handleConceptKeyDown: _wrap(handleConceptKeyDown),
    handleDownloadImage: _wrap(handleDownloadImage),
    handleDeleteImage: _wrap(handleDeleteImage),
    // downloadWithLabels is internal to handleDownloadImage, not exported
    handleTextMouseUp: _wrap(handleTextMouseUp),
    handleReviseSelection: _wrapAsync(handleReviseSelection),
    handleWordClick: _wrapAsync(handleWordClick),
    handlePhonicsClick: _wrapAsync(handlePhonicsClick),
    applyTextRevision: _wrap(applyTextRevision),
    closeRevision: _wrap(closeRevision),
    closeDefinition: _wrap(closeDefinition),
    closePhonics: _wrap(closePhonics),
    handleDefineSelection: _wrapAsync(handleDefineSelection),
    stopPlayback: _wrap(stopPlayback),
  };
}; // end createContentEngine

window.AlloModules = window.AlloModules || {};
window.AlloModules.createContentEngine = createContentEngine;
window.AlloModules.ContentEngineModule = true;
console.log('[ContentEngineModule] Content engine factory registered');
})();
