(function () {
  'use strict';

  var MAX_RESULTS = 25;

  function normalize(value) {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function tokenize(query) {
    return normalize(query)
      .split(/[^a-z0-9]+/)
      .filter(function (token, index, tokens) {
        return token && tokens.indexOf(token) === index;
      });
  }

  function clearNode(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function safeResultUrl(value) {
    var url = String(value || '').trim();
    if (!url || url.indexOf('\\') >= 0 || url.indexOf('//') === 0) return '';
    if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return '';
    if (/[\u0000-\u001f\u007f]/.test(url)) return '';
    return url;
  }

  function validRecord(record) {
    return record
      && typeof record.title === 'string'
      && typeof record.chapter === 'string'
      && typeof record.text === 'string'
      && Boolean(safeResultUrl(record.url));
  }

  function recordHaystack(record) {
    return normalize(record.title + ' ' + record.chapter + ' ' + record.text);
  }

  function scoreRecord(record, tokens) {
    var title = normalize(record.title);
    var chapter = normalize(record.chapter);
    var body = normalize(record.text);
    var haystack = title + ' ' + chapter + ' ' + body;
    if (!tokens.every(function (token) { return haystack.indexOf(token) >= 0; })) return -1;

    return tokens.reduce(function (score, token) {
      if (title === token) return score + 18;
      if (title.indexOf(token) === 0) return score + 12;
      if (title.indexOf(token) >= 0) return score + 8;
      if (chapter.indexOf(token) >= 0) return score + 4;
      if (body.indexOf(token) >= 0) return score + 1;
      return score;
    }, 0);
  }

  function findResults(records, query) {
    var tokens = tokenize(query);
    if (!tokens.length) return [];
    return records
      .map(function (record) {
        return { record: record, score: scoreRecord(record, tokens) };
      })
      .filter(function (item) { return item.score >= 0; })
      .sort(function (first, second) {
        if (first.score !== second.score) return second.score - first.score;
        var chapterOrder = first.record.chapter.localeCompare(second.record.chapter);
        if (chapterOrder !== 0) return chapterOrder;
        return first.record.title.localeCompare(second.record.title);
      });
  }

  function excerpt(record, query) {
    var text = String(record.text || '').replace(/\s+/g, ' ').trim();
    if (!text) return 'Open this section for guidance.';
    var normalizedText = normalize(text);
    var tokens = tokenize(query);
    var firstIndex = tokens.reduce(function (best, token) {
      var index = normalizedText.indexOf(token);
      if (index < 0) return best;
      return best < 0 || index < best ? index : best;
    }, -1);
    var start = Math.max(0, (firstIndex < 0 ? 0 : firstIndex) - 55);
    var end = Math.min(text.length, start + 190);
    var value = text.slice(start, end).trim();
    if (start > 0) value = '...' + value;
    if (end < text.length) value += '...';
    return value;
  }

  function resultItem(item, query) {
    var record = item.record;
    var listItem = document.createElement('li');
    listItem.className = 'guide-search__result';

    var link = document.createElement('a');
    link.href = safeResultUrl(record.url);
    link.textContent = record.title;
    listItem.appendChild(link);

    var chapter = document.createElement('small');
    chapter.textContent = record.chapter;
    listItem.appendChild(chapter);

    var summary = document.createElement('p');
    summary.textContent = excerpt(record, query);
    listItem.appendChild(summary);
    return listItem;
  }

  function render(panel, records, query) {
    var status = panel.querySelector('[data-guide-search-status]');
    var output = panel.querySelector('[data-guide-search-results]');
    clearNode(output);

    var tokens = tokenize(query);
    if (!tokens.length) {
      status.textContent = 'Type one or more words to search every chapter.';
      return;
    }

    var matches = findResults(records, query);
    if (!matches.length) {
      status.textContent = 'No guide sections matched "' + query.trim() + '". Try fewer or different words.';
      return;
    }

    var shown = matches.slice(0, MAX_RESULTS);
    status.textContent = matches.length > MAX_RESULTS
      ? 'Showing the first ' + MAX_RESULTS + ' of ' + matches.length + ' matching sections.'
      : matches.length + (matches.length === 1 ? ' matching section.' : ' matching sections.');

    var list = document.createElement('ol');
    shown.forEach(function (item) {
      list.appendChild(resultItem(item, query));
    });
    output.appendChild(list);
  }

  function embeddedRecords() {
    var data = document.getElementById('guide-search-data');
    if (!data) return null;
    try {
      var parsed = JSON.parse(data.textContent || '[]');
      return Array.isArray(parsed) ? parsed.filter(validRecord) : [];
    } catch (_error) {
      return [];
    }
  }

  function loadRecords(panel) {
    var embedded = embeddedRecords();
    if (embedded) return Promise.resolve(embedded);
    var source = panel.getAttribute('data-search-index') || 'search-index.json';
    return window.fetch(source, { credentials: 'same-origin' })
      .then(function (response) {
        if (!response.ok) throw new Error('Search index request failed.');
        return response.json();
      })
      .then(function (records) {
        if (!Array.isArray(records)) throw new Error('Search index is not an array.');
        return records.filter(validRecord);
      });
  }

  function queryFromLocation() {
    try {
      return new URL(window.location.href).searchParams.get('q') || '';
    } catch (_error) {
      return '';
    }
  }

  function syncLocation(query) {
    try {
      var url = new URL(window.location.href);
      if (query.trim()) url.searchParams.set('q', query.trim());
      else url.searchParams.delete('q');
      window.history.replaceState(null, '', url.href);
    } catch (_error) {
      return;
    }
  }

  function setupPanel(panel) {
    var form = panel.querySelector('[data-guide-search-form]');
    var input = panel.querySelector('[data-guide-search-input]');
    var status = panel.querySelector('[data-guide-search-status]');
    if (!form || !input || !status) return;

    loadRecords(panel).then(function (records) {
      var initialQuery = queryFromLocation();
      input.value = initialQuery;
      render(panel, records, initialQuery);

      form.addEventListener('submit', function (event) {
        event.preventDefault();
        render(panel, records, input.value);
        syncLocation(input.value);
      });

      input.addEventListener('input', function () {
        render(panel, records, input.value);
      });

      window.addEventListener('popstate', function () {
        input.value = queryFromLocation();
        render(panel, records, input.value);
      });
    }).catch(function () {
      status.textContent = 'Search is unavailable in this copy. Use the chapter navigation to browse the guide.';
    });
  }

  function start() {
    document.querySelectorAll('[data-guide-search]').forEach(setupPanel);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
}());

/* Read aloud, per section (2026-08-17).
 *
 * Why the device voice and not Kokoro: AlloFlow ships Kokoro for high-quality
 * on-device speech INSIDE the app, but it is an ~88MB ONNX model plus a
 * transformers runtime cached in OPFS and driven by a worker. A guide page
 * whose job is to be readable instantly cannot justify that download, and it
 * would inherit the truncated-model failure mode. The shipped HTML handouts
 * already read with window.speechSynthesis for the same reason; this matches.
 *
 * Progressive enhancement: no speech API, no buttons, unchanged page.
 */
(function () {
  'use strict';
  if (!window.speechSynthesis || typeof window.SpeechSynthesisUtterance !== 'function') return;
  var article = document.querySelector('article.guide-article');
  if (!article) return;
  var synth = window.speechSynthesis;
  var current = null;

  function blocksFor(h2) {
    var out = [];
    var n = h2.nextElementSibling;
    while (n && n.tagName !== 'H2') {
      if (/^(P|LI|DT|DD|H3|H4|TD|TH|BLOCKQUOTE|FIGCAPTION)$/.test(n.tagName)) out.push(n);
      else Array.prototype.push.apply(out, n.querySelectorAll('p, li, dt, dd, h3, h4'));
      n = n.nextElementSibling;
    }
    return out.filter(function (el) { return (el.textContent || '').trim().length > 1; });
  }

  function stop() {
    if (!current) return;
    try { synth.cancel(); } catch (e) {}
    current.blocks.forEach(function (b) { b.classList.remove('is-reading'); });
    current.btn.textContent = '🔊 Listen';
    current.btn.setAttribute('aria-label', 'Read this section aloud');
    current = null;
  }

  function speakFrom(state) {
    if (!current || current !== state) return;
    if (state.idx >= state.blocks.length) { stop(); return; }
    var el = state.blocks[state.idx];
    state.blocks.forEach(function (b) { b.classList.remove('is-reading'); });
    el.classList.add('is-reading');
    var utter = new window.SpeechSynthesisUtterance((el.textContent || '').trim());
    utter.onend = function () { state.idx += 1; speakFrom(state); };
    utter.onerror = function () { stop(); };
    try { synth.speak(utter); } catch (e) { stop(); }
  }

  Array.prototype.forEach.call(article.querySelectorAll('h2'), function (h2) {
    // Prose sections only. The in-page search panel is an h2 inside the same
    // article, and a "Listen" button on a search box reads the form labels
    // aloud — caught by listing which headings got buttons, 2026-08-17.
    if (h2.closest('.guide-search, nav, form, [data-guide-search]')) return;
    var blocks = blocksFor(h2);
    if (!blocks.length) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'listen-btn no-print';
    btn.textContent = '🔊 Listen';
    btn.setAttribute('aria-label', 'Read this section aloud');
    btn.addEventListener('click', function () {
      var wasThis = current && current.btn === btn;
      stop();
      if (wasThis) return;
      current = { btn: btn, blocks: blocks, idx: 0 };
      btn.textContent = '⏹ Stop';
      btn.setAttribute('aria-label', 'Stop reading this section');
      speakFrom(current);
    });
    h2.appendChild(btn);
  });

  window.addEventListener('beforeunload', function () { try { synth.cancel(); } catch (e) {} });
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); });
}());
