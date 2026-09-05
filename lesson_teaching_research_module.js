/* Lesson-aware evidence retrieval for teaching scripts.
 * Chooses public What Works Clearinghouse practice guides that match the lesson's subject,
 * topic and grade band, reads the actual guide pages through a bounded allowlisted reader,
 * and keeps only recommendations that appear verbatim in the retrieved text.
 * Retrieved recommendations are not evidence that an AI-written script has been evaluated.
 * No model calls, learner content, persistent cache, or arbitrary URL reads. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) { root.AlloModules = root.AlloModules || {}; root.AlloModules.LessonTeachingResearch = api; root.AlloModules.LessonTeachingResearchModule = true; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function () {
  'use strict';
  var GUIDE_BASE = 'https://ies.ed.gov/ncee/wwc/PracticeGuide/';
  var MAX_BYTES = 100000;
  var READ_TIMEOUT_MS = 20000;
  var SEARCH_TIMEOUT_MS = 10000;
  var MAX_SOURCES = 2;
  var PANEL = 'What Works Clearinghouse practice-guide panel (Institute of Education Sciences)';
  // Grade numbers follow the app's InstructionalContext vocabulary: -1 Pre-K, 0 Kindergarten, 1-12, 13 postsecondary.
  var CATALOG = [
    { id: 'wwc-organizing-instruction-2007', guide: 1, title: 'Organizing Instruction and Study to Improve Student Learning', publishedAt: '2007-09', grades: [0, 13], kind: 'general-practice', subjects: ['mathematics', 'science', 'social-studies', 'reading', 'writing', 'world-languages', 'technology', 'health-pe', 'arts', 'other'], keywords: ['study', 'review', 'quiz', 'retrieval', 'spacing', 'memory', 'worked example', 'representation', 'deep questions'], note: 'General guidance on organizing instruction and study for content-heavy subjects such as social studies, science and mathematics.' },
    { id: 'wwc-math-rti-2009', guide: 2, title: 'Assisting Students Struggling with Mathematics: Response to Intervention (RtI) for Elementary and Middle Schools', publishedAt: '2009-04', grades: [0, 8], kind: 'content-specific', subjects: ['mathematics'], keywords: ['intervention', 'struggling', 'tier', 'fluency', 'word problems', 'visual representation', 'explicit instruction', 'number'], note: 'Mathematics intervention guidance for elementary and middle grades.' },
    { id: 'wwc-reading-rti-2009', guide: 3, title: 'Assisting Students Struggling with Reading: Response to Intervention (RtI) and Multi-Tier Intervention in the Primary Grades', publishedAt: '2009-02', grades: [0, 3], kind: 'content-specific', subjects: ['reading'], keywords: ['intervention', 'struggling', 'tier', 'screening', 'phonics', 'fluency', 'decoding'], note: 'Reading intervention guidance for the primary grades.' },
    { id: 'wwc-behavior-elementary-2008', guide: 4, title: 'Reducing Behavior Problems in the Elementary School Classroom', publishedAt: '2008-09', grades: [0, 5], kind: 'general-practice', subjects: ['other', 'health-pe', 'arts', 'mathematics', 'reading', 'writing', 'science', 'social-studies', 'world-languages', 'technology'], keywords: ['behavior', 'behaviour', 'classroom management', 'routine', 'expectations', 'self-regulation', 'social skills'], note: 'Classroom behavior guidance for elementary classrooms, not subject-content evidence.' },
    { id: 'wwc-girls-math-science-2007', guide: 5, title: 'Encouraging Girls in Math and Science', publishedAt: '2007-09', grades: [0, 12], kind: 'general-practice', subjects: ['mathematics', 'science', 'technology'], keywords: ['girls', 'gender', 'stereotype', 'confidence', 'spatial', 'engineering', 'stem'], note: 'Guidance on encouraging girls in mathematics and science; practice-level, not topic-content evidence.' },
    { id: 'wwc-english-learners-elementary-2007', guide: 6, title: 'Effective Literacy and English Language Instruction for English Learners in the Elementary Grades', publishedAt: '2007-12', grades: [0, 5], kind: 'content-specific', subjects: ['reading', 'writing'], secondarySubjects: ['world-languages', 'science', 'social-studies', 'mathematics', 'other'], requireKeyword: true, keywords: ['english learner', 'english learners', 'multilingual', 'esl', 'ell', 'bilingual', 'academic english', 'newcomer', 'language learners'], note: 'Literacy and English language instruction for English learners in elementary grades.' },
    { id: 'wwc-adolescent-literacy-2008', guide: 8, title: 'Improving Adolescent Literacy: Effective Classroom and Intervention Practices', publishedAt: '2008-08', grades: [4, 12], kind: 'content-specific', subjects: ['reading', 'writing'], secondarySubjects: ['social-studies', 'science', 'other'], keywords: ['comprehension', 'vocabulary', 'discussion', 'text', 'primary source', 'primary sources', 'document', 'reading', 'literacy', 'article', 'passage', 'informational'], note: 'Adolescent literacy practices, including reading and discussing texts in content-area classrooms such as history and science.' },
    { id: 'wwc-reading-comprehension-k3-2010', guide: 14, title: 'Improving Reading Comprehension in Kindergarten Through 3rd Grade', publishedAt: '2010-09', grades: [0, 3], kind: 'content-specific', subjects: ['reading'], keywords: ['comprehension', 'story', 'stories', 'text structure', 'main idea', 'retell', 'discussion', 'read aloud', 'narrative', 'informational'], note: 'Reading comprehension instruction for kindergarten through grade 3.' },
    { id: 'wwc-fractions-2010', guide: 15, title: 'Developing Effective Fractions Instruction for Kindergarten Through 8th Grade', publishedAt: '2010-09', grades: [0, 8], kind: 'content-specific', subjects: ['mathematics'], keywords: ['fraction', 'fractions', 'fracción', 'fracciones', 'bruch', 'brüche', 'numerator', 'denominator', 'equivalent', 'ratio', 'ratios', 'proportion', 'proportions', 'rate', 'number line', 'nf'], requireKeyword: true, note: 'Fractions, ratio, rate and proportion instruction for kindergarten through grade 8.' },
    { id: 'wwc-math-problem-solving-2012', guide: 16, title: 'Improving Mathematical Problem Solving in Grades 4 Through 8', publishedAt: '2012-05', grades: [4, 8], kind: 'content-specific', subjects: ['mathematics'], keywords: ['problem solving', 'problem-solving', 'word problem', 'word problems', 'strategy', 'strategies', 'reasoning', 'model', 'diagram', 'visual', 'equation', 'algebra', 'multiple strategies'], note: 'Mathematical problem-solving instruction for grades 4 through 8.' },
    { id: 'wwc-elementary-writing-2012', guide: 17, title: 'Teaching Elementary School Students to Be Effective Writers', publishedAt: '2012-06', grades: [0, 6], kind: 'content-specific', subjects: ['writing'], keywords: ['writing', 'write', 'draft', 'revise', 'paragraph', 'narrative', 'opinion', 'sentence', 'handwriting', 'spelling', 'escritura', 'escribir', 'schreiben'], note: 'Writing instruction for elementary grades.' },
    { id: 'wwc-early-math-2013', guide: 18, title: 'Teaching Math to Young Children', publishedAt: '2013-11', grades: [-1, 0], kind: 'content-specific', subjects: ['mathematics'], keywords: ['counting', 'number', 'numbers', 'shapes', 'pattern', 'patterns', 'measurement', 'geometry', 'sorting', 'early math'], note: 'Early mathematics instruction for preschool and kindergarten.' },
    { id: 'wwc-english-learners-content-2014', guide: 19, title: 'Teaching Academic Content and Literacy to English Learners in Elementary and Middle School', publishedAt: '2014-04', grades: [0, 8], kind: 'content-specific', subjects: ['reading', 'writing'], secondarySubjects: ['science', 'social-studies', 'mathematics', 'world-languages', 'other'], requireKeyword: true, keywords: ['english learner', 'english learners', 'multilingual', 'esl', 'ell', 'bilingual', 'newcomer', 'language learners', 'academic language', 'academic vocabulary'], note: 'Academic content and literacy instruction for English learners in elementary and middle school.' },
    { id: 'wwc-algebra-2015', guide: 20, title: 'Teaching Strategies for Improving Algebra Knowledge in Middle and High School Students', publishedAt: '2015-04', grades: [6, 12], kind: 'content-specific', subjects: ['mathematics'], requireKeyword: true, keywords: ['algebra', 'álgebra', 'equation', 'equations', 'ecuación', 'ecuaciones', 'expression', 'expressions', 'linear', 'function', 'functions', 'variable', 'variables', 'solve', 'solving', 'worked example', 'worked examples', 'structure'], note: 'Algebra instruction for middle and high school.' },
    { id: 'wwc-foundational-reading-k3-2016', guide: 21, title: 'Foundational Skills to Support Reading for Understanding in Kindergarten Through 3rd Grade', publishedAt: '2016-07', grades: [0, 3], kind: 'content-specific', subjects: ['reading'], keywords: ['phonics', 'phonemic', 'phoneme', 'phonological', 'letter', 'letters', 'sound', 'sounds', 'decoding', 'decode', 'fluency', 'sight words', 'word', 'words', 'blend', 'blending', 'segment', 'segmenting', 'syllable', 'syllables', 'fonética', 'lectura', 'lesen', 'foundational', 'connected text'], note: 'Foundational reading skills instruction for kindergarten through grade 3.' },
    { id: 'wwc-secondary-writing-2016', guide: 22, title: 'Teaching Secondary Students to Write Effectively', publishedAt: '2016-11', grades: [6, 12], kind: 'content-specific', subjects: ['writing'], secondarySubjects: ['social-studies', 'science', 'reading', 'other'], keywords: ['writing', 'write', 'essay', 'argument', 'argumentative', 'claim', 'evidence', 'draft', 'revise', 'revision', 'paragraph', 'thesis', 'analysis', 'escritura', 'ensayo', 'schreiben', 'aufsatz'], note: 'Writing instruction for secondary students, including writing across content areas.' },
    { id: 'wwc-elementary-math-intervention-2021', guide: 26, title: 'Assisting Students Struggling with Mathematics: Intervention in the Elementary Grades', publishedAt: '2021-03', grades: [0, 6], kind: 'content-specific', subjects: ['mathematics'], keywords: ['intervention', 'struggling', 'tier', 'number line', 'number lines', 'representation', 'representations', 'concrete', 'word problems', 'timed activities', 'fluency', 'mathematical language', 'place value', 'whole numbers', 'operations', 'addition', 'subtraction', 'multiplication', 'division'], note: 'Mathematics intervention guidance for elementary grades, including systematic instruction, representations and mathematical language.' },
    { id: 'wwc-reading-interventions-4-9-2022', guide: 29, title: 'Providing Reading Interventions for Students in Grades 4–9', publishedAt: '2022-03', grades: [4, 9], kind: 'content-specific', subjects: ['reading'], keywords: ['intervention', 'struggling', 'decoding', 'multisyllabic', 'fluency', 'comprehension', 'stretch text', 'word reading', 'vocabulary'], note: 'Reading intervention guidance for grades 4 through 9.' },
    { id: 'wwc-preparing-young-children-2022', guide: 30, title: 'Preparing Young Children for School', publishedAt: '2022-07', grades: [-1, -1], kind: 'general-practice', subjects: ['reading', 'writing', 'mathematics', 'science', 'social-studies', 'arts', 'health-pe', 'other', 'world-languages', 'technology'], keywords: ['preschool', 'pre-k', 'early childhood', 'young children', 'play', 'language', 'vocabulary', 'counting', 'self-regulation', 'social', 'emotional'], note: 'Preschool guidance across language, literacy, mathematics and social-emotional development.' },
    { id: 'wwc-teacher-behavioral-interventions-k5', guide: 31, title: 'Teacher-Delivered Behavioral Interventions in Grades K-5', publishedAt: '2024', grades: [0, 5], kind: 'general-practice', subjects: ['other', 'health-pe', 'arts', 'mathematics', 'reading', 'writing', 'science', 'social-studies', 'world-languages', 'technology'], keywords: ['behavior', 'behaviour', 'classroom management', 'expectations', 'routine', 'routines', 'praise', 'self-regulation'], note: 'Teacher-delivered behavioral intervention guidance for grades K-5, not subject-content evidence.' }
  ];
  var SUBJECT_QUERY = { mathematics: 'mathematics instruction', reading: 'reading instruction', writing: 'writing instruction', science: 'science instruction', 'social-studies': 'social studies history instruction', 'world-languages': 'language instruction', arts: 'arts instruction', 'health-pe': 'health education', technology: 'computer science instruction', other: 'instruction' };
  var SUBJECT_LABEL = { mathematics: 'mathematics', reading: 'reading and literacy', writing: 'writing', science: 'science', 'social-studies': 'social studies and history', 'world-languages': 'world languages', arts: 'arts and music', 'health-pe': 'health and physical education', technology: 'technology and computer science', other: 'the stated topic' };
  var GRADE_TERMS = { 'early-childhood': 'preschool kindergarten', primary: 'primary grades', 'upper-elementary': 'elementary', middle: 'middle school', secondary: 'high school', postsecondary: 'postsecondary', unknown: '' };

  function problem(message, name) { var error = new Error(message); error.name = name || 'Error'; return error; }
  function abortError() { return problem('Teaching research was canceled.', 'AbortError'); }
  function checkCanceled(signal) { if (signal && signal.aborted) throw abortError(); }
  function catalogById(id) { for (var i = 0; i < CATALOG.length; i++) if (CATALOG[i].id === id) return CATALOG[i]; return null; }
  function guideUrl(entry) { return GUIDE_BASE + entry.guide; }
  function guideIdFromUrl(value) {
    if (typeof value !== 'string' || !value || /[\u0000-\u0020\\]/.test(value)) return null;
    try {
      var url = new URL(value);
      if (url.protocol !== 'https:' || url.hostname !== 'ies.ed.gov' || url.port || url.username || url.password || url.search) return null;
      var match = /^\/ncee\/wwc\/practiceguide\/(\d{1,3})(?:\/published)?\/?$/i.exec(url.pathname);
      if (!match) return null;
      var guide = Number(match[1]);
      for (var i = 0; i < CATALOG.length; i++) if (CATALOG[i].guide === guide) return guide;
      return null;
    } catch (_) { return null; }
  }
  function isSupportedUrl(value) { return guideIdFromUrl(value) !== null; }
  function safeProxyUrl(value, guide) {
    try {
      var url = new URL(value);
      return url.protocol === 'https:' && url.hostname === 'r.jina.ai' && !url.username && !url.password && !url.port && !url.search
        && guideIdFromUrl(url.pathname.slice(1)) === guide;
    } catch (_) { return false; }
  }
  function abortable(promise, signal) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      function finish(callback, value) {
        if (settled) return; settled = true;
        signal.removeEventListener('abort', onAbort); callback(value);
      }
      function onAbort() { finish(reject, signal.reason instanceof Error ? signal.reason : abortError()); }
      signal.addEventListener('abort', onAbort, { once: true });
      if (signal.aborted) { onAbort(); return; }
      Promise.resolve(promise).then(function (value) { finish(resolve, value); }, function (error) { finish(reject, error); });
    });
  }
  async function bounded(work, duration, externalSignal) {
    checkCanceled(externalSignal);
    var controller = new AbortController();
    var onAbort = function () { controller.abort(abortError()); };
    if (externalSignal) externalSignal.addEventListener('abort', onAbort, { once: true });
    var timer = setTimeout(function () { controller.abort(problem('Public guidance retrieval timed out.', 'TimeoutError')); }, duration);
    try {
      if (externalSignal && externalSignal.aborted) onAbort();
      var result = await abortable(Promise.resolve().then(function () {
        checkCanceled(controller.signal); return work(controller.signal);
      }), controller.signal);
      checkCanceled(externalSignal);
      return result;
    } finally {
      clearTimeout(timer);
      if (externalSignal) externalSignal.removeEventListener('abort', onAbort);
    }
  }
  async function readLimitedBody(response, signal) {
    var length = response.headers && response.headers.get && response.headers.get('content-length');
    if (Number(length) > MAX_BYTES) throw problem('Public guidance exceeds the 100 KB retrieval limit.');
    if (!response.body || typeof response.body.getReader !== 'function') {
      if (typeof response.text !== 'function') throw problem('Public guidance response has no readable body.');
      var fallback = await abortable(response.text(), signal);
      if (typeof fallback !== 'string' || new TextEncoder().encode(fallback).byteLength > MAX_BYTES) throw problem('Public guidance exceeds the 100 KB retrieval limit.');
      return fallback;
    }
    var reader = response.body.getReader();
    var decoder = new TextDecoder();
    var bytes = 0, chunks = [];
    try {
      while (true) {
        var part = await abortable(reader.read(), signal);
        if (part.done) break;
        bytes += part.value.byteLength;
        if (bytes > MAX_BYTES) throw problem('Public guidance exceeds the 100 KB retrieval limit.');
        chunks.push(decoder.decode(part.value, { stream: true }));
      }
      chunks.push(decoder.decode());
      return chunks.join('');
    } catch (error) {
      try { var canceled = reader.cancel(); if (canceled && canceled.catch) canceled.catch(function () {}); } catch (_) {}
      throw error;
    } finally { try { reader.releaseLock(); } catch (_) {} }
  }
  function sourceUrlsFromText(text) {
    var urls = [], match;
    var pattern = /^\s*URL Source:\s*(\S+)\s*$/gim;
    while ((match = pattern.exec(text))) urls.push(match[1]);
    return urls;
  }
  async function readPublicGuidance(url, options) {
    options = options || {};
    checkCanceled(options.signal);
    var guide = guideIdFromUrl(url);
    if (guide === null) throw problem('Teaching research reads only the official WWC practice guides in its catalog.');
    var canonical = GUIDE_BASE + guide;
    var fetchPage = options.fetch || (typeof fetch === 'function' ? fetch : null);
    if (typeof fetchPage !== 'function') throw problem('Public guidance retrieval is unavailable in this environment.');
    // Same Jina reader URL used by UtilsPure, with no proxy chain or AI fallback.
    return bounded(async function (signal) {
      var response = await abortable(fetchPage('https://r.jina.ai/' + canonical, {
        method: 'GET', headers: { Accept: 'text/plain' }, credentials: 'omit', redirect: 'error', signal: signal
      }), signal);
      if (!response || !response.ok) throw problem('The public guidance reader did not return a successful response.');
      if (response.url && !safeProxyUrl(response.url, guide)) throw problem('The public guidance reader returned an unexpected destination.');
      var text = await readLimitedBody(response, signal);
      var urls = sourceUrlsFromText(text);
      if (!urls.length || urls.some(function (value) { return guideIdFromUrl(value) !== guide; })) throw problem('The retrieved page did not confirm the official WWC source URL.');
      if (!/^\s*Markdown Content:\s*$/im.test(text)) throw problem('The public guidance reader did not return page content.');
      checkCanceled(signal);
      return { text: text, url: canonical, finalUrl: canonical, kind: 'retrieved-page', via: 'jina', retrievedAt: new Date().toISOString() };
    }, READ_TIMEOUT_MS, options.signal);
  }
  function plainText(value) {
    return String(value || '')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
      .replace(/<img\b[^>]*\balt\s*=\s*["']([^"']*)["'][^>]*>/gi, ' $1 \n')
      .replace(/<\/(?:p|div|li|h[1-6]|section|article|tr)>|<br\s*\/?\s*>/gi, '\n')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&#(x[0-9a-f]+|\d+);/gi, function (_, code) {
        var number = code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code);
        return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : ' ';
      })
      .replace(/&(amp|nbsp|quot|apos|rsquo|lsquo|ndash|mdash|lt|gt);/gi, function (_, name) {
        return { amp: '&', nbsp: ' ', quot: '"', apos: "'", rsquo: "'", lsquo: "'", ndash: '-', mdash: '-', lt: '<', gt: '>' }[name.toLowerCase()];
      }).replace(/[\u2018\u2019]/g, "'").replace(/\r/g, '');
  }
  function normalize(value) { return plainText(value).replace(/\s+/g, ' ').trim(); }
  function evidenceRating(line) {
    var match = /\b(minimal|moderate|strong)\s+evidence\b/i.exec(line);
    return match ? match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase() : '';
  }
  function isNoiseLine(line) {
    return !line || /^\[?show (more|less)/i.test(line) || /^\[!?\[/.test(line) || /^!\[/.test(line) || /^\[image/i.test(line) || /^learn more about/i.test(line) || /^\*\*/.test(line) || /^[-*]\s/.test(line) || evidenceRating(line) && line.length < 80;
  }
  /* Recommendation blocks on WWC guide pages read: a bare number (2, 5a), an evidence rating image, then the recommendation
   * sentence. Unnumbered recommendations followed by "Learn More About This Recommendation" are also captured. */
  function parseRecommendations(pageText, entry) {
    var lines = pageText.split('\n').map(function (line) { return line.replace(/\s+/g, ' ').trim(); });
    var found = [], seen = {};
    function push(number, rating, sentence, offsetHint) {
      var text = sentence.replace(/\s*\[.*$/, '').trim();
      if (text.length < 25 || text.length > 600 || /https?:\/\//i.test(text)) return;
      var key = text.toLowerCase();
      if (seen[key]) return; seen[key] = true;
      var id = entry.id + '-r' + (number ? String(number).toLowerCase() : 'x' + (found.length + 1));
      if (found.some(function (item) { return item.id === id; })) id += '-' + (found.length + 1);
      found.push({ id: id, number: number, text: text, evidenceLevel: rating ? rating + ' (reported by WWC for Recommendation ' + (number || '(unnumbered)') + ')' : 'Not captured in retrieved text', locator: 'Recommendation ' + (number || '(unnumbered)') + '; retrieved page text offset ' + offsetHint, supportingText: text });
    }
    for (var i = 0; i < lines.length; i++) {
      var numberMatch = /^(\d{1,2}[a-z]?)[.):]?$/i.exec(lines[i]);
      if (numberMatch) {
        var rating = '', sentence = '';
        for (var j = i + 1; j < Math.min(lines.length, i + 6); j++) {
          var candidate = lines[j];
          if (!candidate) continue;
          if (!rating && evidenceRating(candidate) && (candidate.length < 120 || /^\[?!?\[/.test(candidate) || /^\[?image/i.test(candidate))) { rating = evidenceRating(candidate); continue; }
          if (isNoiseLine(candidate)) continue;
          sentence = candidate; break;
        }
        if (sentence) push(numberMatch[1], rating, sentence, i);
      }
    }
    return found;
  }
  function pageGrades(pageText) {
    var grades = [], match, pattern = /gradeLevel=,(PK|K|\d{1,2}|Postsecondary)\b/gi;
    while ((match = pattern.exec(pageText))) {
      var token = match[1].toUpperCase();
      grades.push(token === 'PK' ? -1 : token === 'K' ? 0 : token === 'POSTSECONDARY' ? 13 : Number(token));
    }
    if (!grades.length) {
      var listed = /Grades?\s+((?:(?:PK|K|\d{1,2})\s*,\s*)+(?:PK|K|\d{1,2}))/i.exec(pageText);
      if (listed) listed[1].split(',').forEach(function (token) { token = token.trim().toUpperCase(); grades.push(token === 'PK' ? -1 : token === 'K' ? 0 : Number(token)); });
    }
    return grades.filter(function (value) { return Number.isFinite(value); }).filter(function (value, index, all) { return all.indexOf(value) === index; }).sort(function (a, b) { return a - b; });
  }
  function gradeText(n) { return n === -1 ? 'Pre-K' : n === 0 ? 'K' : n === 13 ? 'postsecondary' : String(n); }
  function extractSource(payload, entry, context) {
    var object = payload && typeof payload === 'object' ? payload : {};
    if (/snippet|search[- ]?result|summary|model|generated/i.test(String(object.kind || object.sourceType || object.retrievalType || '')) || object.isSummary === true || object.fromSearch === true) throw problem('Search snippets and generated summaries cannot supply teaching evidence.');
    ['url', 'finalUrl', 'sourceUrl'].forEach(function (key) { if (object[key] != null && guideIdFromUrl(object[key]) !== entry.guide) throw problem('The source reader returned a URL outside the selected guidance.'); });
    var raw = typeof payload === 'string' ? payload : object.text;
    if (typeof raw !== 'string' || !raw.trim()) throw problem('The source reader did not return actual page text.');
    if (new TextEncoder().encode(raw).byteLength > MAX_BYTES) throw problem('Public guidance exceeds the 100 KB retrieval limit.');
    var embeddedUrls = sourceUrlsFromText(raw);
    if (embeddedUrls.some(function (url) { return guideIdFromUrl(url) !== entry.guide; })) throw problem('Retrieved page metadata points outside the selected guidance.');
    var pageText = plainText(raw);
    var normalized = normalize(pageText);
    if (normalized.length < 250 || !normalized.toLowerCase().includes(entry.title.toLowerCase())) throw problem('The retrieved text did not identify the guide "' + entry.title + '".');
    var recommendations = parseRecommendations(pageText, entry);
    if (!recommendations.length) throw problem('The fetched guide did not contain identifiable recommendation passages.');
    var grades = pageGrades(pageText);
    var range = grades.length ? [grades[0], grades[grades.length - 1]] : entry.grades;
    var gradeNumber = context.gradeNumber;
    var gradeFit;
    if (gradeNumber === null || gradeNumber === undefined) gradeFit = 'The lesson grade or age group "' + context.gradeLabel + '" could not be matched to the guide\'s stated grade range; judge fit yourself.';
    else if (gradeNumber < range[0] || gradeNumber > range[1]) throw problem('The guide\'s stated grades (' + gradeText(range[0]) + ' to ' + gradeText(range[1]) + ') do not include ' + context.gradeLabel + '.');
    else gradeFit = context.gradeLabel + ' is within the stated range; educators must judge fit to the specific learners and objective.';
    var kindText = entry.kind === 'general-practice'
      ? 'General instructional-practice guidance, not content-specific research for ' + (context.topic || SUBJECT_LABEL[context.subject] || 'this topic') + '.'
      : 'Content-specific guidance for ' + (SUBJECT_LABEL[context.subject] || 'this subject') + '; it addresses the practices named in its recommendations, not every objective in this lesson.';
    return { id: entry.id, url: guideUrl(entry), title: entry.title, author: PANEL, publishedAt: entry.publishedAt, retrievedAt: new Date().toISOString(),
      evidenceKind: entry.kind,
      scope: 'WWC practice guide for grades ' + gradeText(range[0]) + ' to ' + gradeText(range[1]) + '. ' + entry.note + ' ' + kindText + ' ' + gradeFit + ' This source does not validate an AI-written script or alignment to a particular standard.',
      evidenceLevel: 'Varies by recommendation; publisher ratings are shown only where captured in the retrieved text.',
      recommendations: recommendations.map(function (item) { return { id: item.id, text: item.text, locator: item.locator, evidenceLevel: item.evidenceLevel, supportingText: item.supportingText }; }) };
  }
  function normalizeGradeNumber(value) {
    var raw = String(value == null ? '' : value).trim().toLowerCase().replace(/[._]/g, ' ').replace(/\s+/g, ' ');
    if (!raw) return null;
    if (/^(pre\s*-?\s*k|prek|pre kindergarten|pre-kindergarten|preschool|pre-school)$/.test(raw)) return -1;
    if (/^(k|kg|grade k|kindergarten)$/.test(raw)) return 0;
    if (/^(college|undergraduate|college level|university|graduate|graduate level|postgraduate)$/.test(raw)) return 13;
    var match = /^(?:grade\s*)?(\d{1,2})(?:st|nd|rd|th)?(?:\s*grade)?$/.exec(raw) || /(?:^|[^a-z0-9])grade\s*(\d{1,2})(?:[^a-z0-9]|$)/.exec(raw);
    var n = match ? Number(match[1]) : NaN;
    return Number.isFinite(n) && n >= 1 && n <= 12 ? n : null;
  }
  function gradeBandOf(n) {
    if (n === null) return 'unknown';
    if (n <= 0) return 'early-childhood';
    if (n <= 2) return 'primary';
    if (n <= 5) return 'upper-elementary';
    if (n <= 8) return 'middle';
    if (n <= 12) return 'secondary';
    return 'postsecondary';
  }
  function keywordHits(haystack, keywords) {
    var lower = String(haystack || '').toLowerCase(), hits = [];
    keywords.forEach(function (keyword) {
      var escaped = keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
      if (new RegExp('(?:^|[^\\p{L}\\p{N}])' + escaped + '(?=$|[^\\p{L}\\p{N}])', 'u').test(lower)) hits.push(keyword);
    });
    return hits;
  }
  function lessonContext(context) {
    context = context || {};
    var subject = Object.prototype.hasOwnProperty.call(SUBJECT_QUERY, context.subject) ? context.subject : 'other';
    var gradeNumber = normalizeGradeNumber(context.grade);
    return {
      subject: subject, gradeNumber: gradeNumber, gradeLabel: String(context.grade == null ? '' : context.grade).trim().slice(0, 80) || 'unspecified', band: gradeBandOf(gradeNumber),
      topic: String(context.topic || '').slice(0, 200),
      localText: [context.topic, context.goal, context.standard].map(function (value) { return String(value || '').slice(0, 2000); }).join('\n')
    };
  }
  /* Only fixed catalog vocabulary leaves the device: subject phrase, grade band, and topic keywords that also appear in the catalog. */
  function buildSearchQuery(context) {
    var lesson = lessonContext(context), vocabulary = [];
    CATALOG.forEach(function (entry) { entry.keywords.forEach(function (keyword) { if (vocabulary.indexOf(keyword) < 0) vocabulary.push(keyword); }); });
    var topicTerms = keywordHits(lesson.topic + '\n' + String(context && context.goal || '').slice(0, 600), vocabulary).slice(0, 3);
    return ('site:ies.ed.gov/ncee/wwc/PracticeGuide ' + SUBJECT_QUERY[lesson.subject] + ' ' + (GRADE_TERMS[lesson.band] || '') + ' ' + topicTerms.join(' ')).replace(/\s+/g, ' ').trim();
  }
  function selectCandidates(context, searchResults) {
    var lesson = lessonContext(context);
    var boosted = {};
    (Array.isArray(searchResults) ? searchResults : []).forEach(function (result) {
      var guide = guideIdFromUrl(result && (result.url || result.link));
      if (guide !== null) boosted[guide] = true;
    });
    var ranked = [];
    CATALOG.forEach(function (entry) {
      if (lesson.gradeNumber !== null && (lesson.gradeNumber < entry.grades[0] || lesson.gradeNumber > entry.grades[1])) return;
      var primaryMatch = entry.subjects.indexOf(lesson.subject) >= 0;
      var secondaryMatch = (entry.secondarySubjects || []).indexOf(lesson.subject) >= 0;
      var hits = keywordHits(lesson.localText, entry.keywords);
      if (entry.requireKeyword && !hits.length) return;
      var score = 0;
      if (entry.kind === 'content-specific') {
        // A guide whose main subject differs from the lesson's (for example a literacy guide for a history lesson)
        // is only relevant when the lesson itself names one of its practices.
        if (primaryMatch) score += 4;
        else if (secondaryMatch && hits.length) score += 2;
        else return;
      } else { if (!primaryMatch) return; score += 1; }
      score += Math.min(hits.length, 3) * 2;
      if (boosted[entry.guide]) score += 2;
      ranked.push({ entry: entry, score: score, hits: hits });
    });
    ranked.sort(function (a, b) { return b.score - a.score || (a.entry.kind === 'content-specific' ? -1 : 1) || b.entry.guide - a.entry.guide; });
    var chosen = [], hasContent = false;
    ranked.forEach(function (item) {
      if (chosen.length >= MAX_SOURCES) return;
      if (item.entry.kind === 'general-practice' && chosen.some(function (c) { return c.entry.kind === 'general-practice'; })) return;
      chosen.push(item);
      if (item.entry.kind === 'content-specific') hasContent = true;
    });
    return { lesson: lesson, candidates: chosen, hasContentSpecific: hasContent };
  }
  async function collect(context, adapters) {
    context = context || {}; adapters = adapters || {};
    checkCanceled(context.signal);
    var lesson = lessonContext(context);
    if (typeof adapters.read !== 'function') return { status: 'unavailable', sources: [], warnings: ['The source-text reader is unavailable. Research support requires reading the actual public guidance.'] };
    var warnings = [], searchResults = [];
    if (typeof adapters.search === 'function') {
      try {
        // Goal text, standard text, lesson resources and learner details never leave the device; see buildSearchQuery.
        var query = buildSearchQuery(context);
        var response = await bounded(function () { return adapters.search(query, 5, query); }, SEARCH_TIMEOUT_MS, context.signal);
        checkCanceled(context.signal);
        searchResults = Array.isArray(response) ? response : Array.isArray(response && response.results) ? response.results : [];
      } catch (error) {
        checkCanceled(context.signal);
        warnings.push('Public-source search was unavailable; matched the evidence catalog directly.');
      }
    }
    var selection = selectCandidates(context, searchResults);
    if (!selection.candidates.length) {
      return { status: 'unavailable', sources: [], warnings: warnings.concat(['No catalogued public practice guide covers ' + SUBJECT_LABEL[lesson.subject] + ' for ' + lesson.gradeLabel + '. The script can be generated without research, or you can add your own sources.']) };
    }
    var sources = [];
    for (var i = 0; i < selection.candidates.length; i++) {
      var entry = selection.candidates[i].entry;
      try {
        var payload = await bounded(function (signal) { return adapters.read(guideUrl(entry), { signal: signal }); }, READ_TIMEOUT_MS, context.signal);
        checkCanceled(context.signal);
        sources.push(extractSource(payload, entry, lesson));
      } catch (error) {
        checkCanceled(context.signal);
        warnings.push('Could not use "' + entry.title + '": ' + (error && error.message ? error.message : 'The source text could not be read.'));
      }
    }
    if (!sources.length) return { status: 'unavailable', sources: [], warnings: warnings.concat(['Research support unavailable: no matching guidance could be read and verified.']) };
    if (sources.some(function (source) { return source.recommendations.some(function (item) { return item.evidenceLevel === 'Not captured in retrieved text'; }); })) warnings.push('Some publisher evidence ratings were not captured in the retrieved text. Open the guide to review those ratings.');
    if (!sources.some(function (source) { return source.evidenceKind === 'content-specific'; })) warnings.push('Only general instructional-practice guidance was found for this lesson; no content-specific practice guide in the catalog covers ' + SUBJECT_LABEL[lesson.subject] + ' at ' + lesson.gradeLabel + '.');
    warnings.push('Retrieved guidance supports the teaching approach; the generated script has not been evaluated as an intervention.');
    return { status: 'retrieved', sources: sources, warnings: warnings };
  }
  function catalog() { return JSON.parse(JSON.stringify(CATALOG)).map(function (entry) { entry.url = guideUrl(entry); return entry; }); }
  return Object.freeze({ collect: collect, readPublicGuidance: readPublicGuidance, isSupportedUrl: isSupportedUrl, buildSearchQuery: buildSearchQuery, selectCandidates: selectCandidates, catalog: catalog, extractSource: extractSource, guideUrl: GUIDE_BASE + '15' });
});
