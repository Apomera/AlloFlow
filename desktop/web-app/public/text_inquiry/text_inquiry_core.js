/* Deterministic, dependency-free analysis core for Text Inquiry Studio. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AlloFlowTextInquiryCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var CORE_VERSION = '1.0.0';
  var STOPWORDS = ('a an and are as at be been being but by can could did do does for from had has have he her hers him his how i if in into is it its may might more most must my no not of on one or our ours she should so than that the their theirs them then there these they this those to too us was we were what when where which who why will with would you your yours').split(' ');

  function cleanText(value, limit) {
    return String(value == null ? '' : value).replace(/\r\n?/g, '\n').replace(/[\t ]+/g, ' ').trim().slice(0, limit || 50000);
  }

  function tokenize(value) {
    var text = cleanText(value).toLowerCase();
    try { return text.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) || []; }
    catch (_) { return text.match(/[a-z0-9]+(?:['’][a-z0-9]+)*/g) || []; }
  }

  function splitSentences(value, segmenter) {
    var text = cleanText(value);
    if (typeof segmenter === 'function') {
      try {
        var enhanced = segmenter(text);
        if (Array.isArray(enhanced) && enhanced.length) return enhanced.map(function (sentence) { return cleanText(sentence, 800); }).filter(Boolean);
      } catch (_) {}
    }
    return (text.match(/[^.!?\n]+(?:[.!?]+|$)/g) || [text]).map(function (sentence) { return cleanText(sentence, 800); }).filter(Boolean);
  }

  function frequency(items) {
    var counts = Object.create(null);
    items.forEach(function (item) { counts[item] = (counts[item] || 0) + 1; });
    return Object.keys(counts).map(function (item) { return { term: item, count: counts[item] }; }).sort(function (a, b) { return b.count - a.count || a.term.localeCompare(b.term); });
  }

  function analyzeText(value, options) {
    options = options || {};
    var text = cleanText(value, options.maxCharacters || 50000);
    var tokens = tokenize(text);
    var stopwords = Object.create(null);
    (options.stopwords || STOPWORDS).forEach(function (word) { stopwords[String(word).toLowerCase()] = true; });
    var contentTokens = tokens.filter(function (token) { return token.length > 1 && !stopwords[token] && !/^\d+$/.test(token); });
    var bigrams = [];
    for (var i = 0; i < contentTokens.length - 1; i++) bigrams.push(contentTokens[i] + ' ' + contentTokens[i + 1]);
    var sentences = splitSentences(text, options.sentenceSegmenter);
    return {
      coreVersion: CORE_VERSION,
      characterCount: text.length,
      wordCount: tokens.length,
      uniqueWordCount: Object.keys(tokens.reduce(function (acc, token) { acc[token] = true; return acc; }, Object.create(null))).length,
      sentenceCount: sentences.length,
      lexicalDiversity: tokens.length ? Math.round((Object.keys(tokens.reduce(function (acc, token) { acc[token] = true; return acc; }, Object.create(null))).length / tokens.length) * 1000) / 1000 : 0,
      topTerms: frequency(contentTokens).slice(0, options.topTermLimit || 20),
      topBigrams: frequency(bigrams).filter(function (row) { return row.count > 1; }).slice(0, options.bigramLimit || 12),
      sentences: sentences
    };
  }

  function concordance(analysis, term, limit) {
    var query = cleanText(term, 80).toLowerCase();
    if (!query || !analysis || !Array.isArray(analysis.sentences)) return [];
    var escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var matcher = new RegExp('(^|[^\\p{L}\\p{N}])' + escaped + '([^\\p{L}\\p{N}]|$)', 'iu');
    var rows = [];
    analysis.sentences.some(function (sentence, index) {
      if (matcher.test(sentence)) rows.push({ sentenceIndex: index + 1, excerpt: cleanText(sentence, 360) });
      return rows.length >= (limit || 10);
    });
    return rows;
  }

  function stableSourceId(parts) {
    var value = (parts || []).map(function (part) { return cleanText(part, 300).toLowerCase(); }).join('|');
    var hash = 2166136261;
    for (var i = 0; i < value.length; i++) { hash ^= value.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return 'text-' + (hash >>> 0).toString(16).padStart(8, '0');
  }

  return { version: CORE_VERSION, stopwords: STOPWORDS.slice(), cleanText: cleanText, tokenize: tokenize, splitSentences: splitSentences, analyzeText: analyzeText, concordance: concordance, stableSourceId: stableSourceId };
});
