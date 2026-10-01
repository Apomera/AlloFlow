// Bundled with own_sources_module.js so citation inspection is available wherever
// the document library is loaded. Snapshots describe the passage supplied at generation.
(function(root) {
  'use strict';
  if (!root || root.AlloResearchEvidence) return;
  var prefix = '#allo-doc-';
  var storagePrefix = 'alloflow.research-evidence.v1.';
  var memory = Object.create(null);
  var closeViewer = null;
  var sequence = 0;
  function escapeMarkdown(value) {
    return String(value || '').replace(/[\\`*_{}\[\]()<>#!|~&]/g, '\\$&');
  }
  function passage(row) { return String(row && row.snippet || '').slice(0, 1200); }
  function snapshot(evidence) {
    var run = Date.now().toString(36) + '-' + (++sequence).toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    return (evidence || []).map(function(row, index) {
      var item = {
        id: run + '-' + (index + 1), sourceId: String(row.sourceId || ''),
        evidenceId: String(row.evidenceId || ''), title: String(row.title || 'Imported document'),
        locatorLabel: String(row.locatorLabel || ''), version: row.version || null,
        passage: passage(row), suppliedAt: new Date().toISOString()
      };
      return item;
    });
  }
  function remember(items) {
    var persisted = true;
    (items || []).forEach(function(item) {
      if (!item || !/^[a-z0-9-]+$/.test(item.id || '')) return;
      var copy = JSON.parse(JSON.stringify(item));
      memory[copy.id] = copy;
      try { root.localStorage.setItem(storagePrefix + copy.id, JSON.stringify(copy)); }
      catch (_) { persisted = false; }
    });
    return persisted;
  }
  function lookup(id) {
    if (!/^[a-z0-9-]+$/.test(id || '')) return null;
    if (memory[id]) return JSON.parse(JSON.stringify(memory[id]));
    try {
      var value = JSON.parse(root.localStorage.getItem(storagePrefix + id));
      if (value && value.id === id && typeof value.passage === 'string') return value;
    } catch (_) {}
    return null;
  }
  function cite(text, items) {
    return String(text || '').replace(/\s*\[Your document (\d+)\]/gi, function(_, n) {
      var item = items && items[Number(n) - 1];
      return item ? ' [Document ' + n + '](' + prefix + item.id + ')' : '';
    });
  }
  function used(text, items) {
    return (items || []).filter(function(item) { return String(text || '').indexOf('](' + prefix + item.id + ')') !== -1; });
  }
  function finish(text, items) {
    if (!items || !items.length) return { text: text, evidence: null };
    var body = cite(text, items);
    var cited = used(body, items);
    var persisted = remember(cited);
    var documents = function(rows) { return new Set(rows.map(function(row) { return row.sourceId; })).size; };
    var summary = documents(items) + ' document(s) supplied (' + items.length + ' passages); ' + documents(cited) + ' document(s) cited (' + cited.length + ' passages).';
    body += '\n\n### Your Document References\n\n' + summary;
    if (cited.length) {
      body += '\n\nOpen a Document link to inspect the passage supplied to the model. A citation does not by itself verify the generated claim. The exact supplied passages are also saved below for export and review.';
      cited.forEach(function(item) {
        var index = items.indexOf(item) + 1;
        body += '\n\n**Document ' + index + ': ' + escapeMarkdown(item.title + (item.locatorLabel ? ', ' + item.locatorLabel : '')) + '**\n\n'
          + item.passage.split(/\r?\n/).map(function(line) { return '> ' + escapeMarkdown(line); }).join('\n');
      });
    } else body += '\n\nNo document citation was present in the generated text.';
    if (!persisted) body += '\n\nThe citation viewer could not save its local copy. The passages below remain part of this text.';
    return { text: body, evidence: { version: 1, supplied: items, citedIds: cited.map(function(item) { return item.id; }), persisted: persisted } };
  }
  // The model chooses excerpts; it does not write the output. Reject the entire
  // selection if ANY quote is altered, invented, empty, or attributed incorrectly.
  function exactExcerpts(response, items, topic) {
    var data = response;
    if (data && typeof data === 'object' && typeof data.text === 'string') data = data.text;
    if (typeof data === 'string') {
      data = data.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      try { data = JSON.parse(data); } catch (_) { return null; }
    }
    if (!data || !Array.isArray(data.excerpts) || !data.excerpts.length || data.excerpts.length > 6) return null;
    var seen = new Set();
    var rendered = [];
    for (var i = 0; i < data.excerpts.length; i++) {
      var excerpt = data.excerpts[i];
      var number = excerpt && excerpt.document;
      var item = Number.isInteger(number) && items[number - 1];
      var quote = excerpt && excerpt.quote;
      if (!item || typeof quote !== 'string' || quote.trim().length < 20 || item.passage.indexOf(quote) < 0) return null;
      var key = number + '|' + quote;
      if (seen.has(key)) continue;
      seen.add(key);
      rendered.push(quote.split(/\r?\n/).map(function(line) { return '> ' + escapeMarkdown(line); }).join('\n') + '\n\n[Your document ' + number + ']');
    }
    if (!rendered.length) return null;
    return '# ' + escapeMarkdown(String(topic || 'Selected document excerpts').replace(/[\r\n]+/g, ' '))
      + '\n\n*Documents only: exact excerpts selected from your documents. Reading level, tone, and length do not rewrite these passages. No web search or additional factual prose was used.*\n\n'
      + rendered.join('\n\n');
  }
  function show(id, trigger) {
    if (!root.document || !root.document.body) return;
    if (closeViewer) closeViewer();
    var doc = root.document;
    var previous = trigger || doc.activeElement;
    var item = lookup(id);
    var overlay = doc.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(15,23,42,.65);display:flex;align-items:center;justify-content:center;padding:24px';
    var panel = doc.createElement('section');
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'allo-document-evidence-title');
    panel.style.cssText = 'background:#fff;color:#172033;border-radius:12px;padding:24px;max-width:720px;width:100%;max-height:85vh;overflow:auto;box-shadow:0 20px 70px #0006;font:16px/1.6 system-ui';
    var title = doc.createElement('h2'); title.id = 'allo-document-evidence-title'; title.textContent = item ? item.title : 'Document passage unavailable';
    var location = doc.createElement('p');
    location.textContent = item ? (item.locatorLabel || 'Location not recorded') + (item.version ? ' · Saved document version ' + item.version : '') : 'This device does not have the saved citation snapshot. Check Your Document References in the source text for the exact passage.';
    var note = doc.createElement('p'); note.textContent = 'This is the passage supplied at generation time. Check whether it supports the claim; the link itself is not verification.';
    var quote = doc.createElement('blockquote'); quote.style.cssText = 'white-space:pre-wrap;border-left:4px solid #7c3aed;padding-left:16px;margin:16px 0'; quote.textContent = item ? item.passage : '';
    var button = doc.createElement('button'); button.type = 'button'; button.textContent = 'Close passage'; button.style.cssText = 'padding:10px 18px;background:#5b21b6;color:white;border:0;border-radius:6px;cursor:pointer;font:inherit';
    function close() {
      doc.removeEventListener('keydown', keydown, true); overlay.remove(); closeViewer = null;
      if (previous && previous.isConnected && typeof previous.focus === 'function') previous.focus();
    }
    function keydown(event) {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
      if (event.key === 'Tab') { event.preventDefault(); event.stopPropagation(); button.focus(); }
    }
    closeViewer = close;
    button.addEventListener('click', close);
    overlay.addEventListener('click', function(event) { if (event.target === overlay) close(); });
    panel.appendChild(title); panel.appendChild(location);
    if (item) { panel.appendChild(note); panel.appendChild(quote); }
    panel.appendChild(button); overlay.appendChild(panel); doc.body.appendChild(overlay);
    doc.addEventListener('keydown', keydown, true); button.focus();
  }
  if (root.document) root.document.addEventListener('click', function(event) {
    var anchor = event.target && event.target.closest && event.target.closest('a');
    var href = anchor && anchor.getAttribute('href');
    if (!href || !/^#allo-doc-[a-z0-9-]+$/.test(href)) return;
    event.preventDefault(); event.stopPropagation(); show(href.slice(prefix.length), anchor);
  }, true);
  root.AlloResearchEvidence = { snapshot: snapshot, remember: remember, lookup: lookup, cite: cite, finish: finish, exactExcerpts: exactExcerpts, show: show, passage: passage };
})(typeof window !== 'undefined' ? window : null);
