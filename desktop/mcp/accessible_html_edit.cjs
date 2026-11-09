'use strict';
// Structure-only edits to an accessible HTML document, for a person who tells an agent what to change ("make that an
// H3", "that picture is decorative", "move this paragraph up"). 2026-11-08.
//
// accessibleHtmlTool(html, mode, payload, DOMParserCtor) is ONE self-contained function with no closure over this
// module: the headless driver sends its source text into a bare browser page, and the tests call it with jsdom's
// DOMParser. Keep it that way (helpers nested inside it, no require, no module-level constants).
//
// It never changes the WORDS of a document. Rewording is not an operation: for a born-digital PDF the printed words
// cannot change, and a reworded paragraph fails the tagged PDF's own byte check. Deleting an element is the only way
// words leave, and the result says how many.
//
//   mode 'outline' payload { kinds?, textContains?, maxItems? } -> { document, items, matching, truncated }
//   mode 'edit'    payload { operations: [...] }                  -> { ok, html?, results, ... }  (all-or-nothing)
function accessibleHtmlTool(html, mode, payload, DOMParserCtor) {
  const Parser = DOMParserCtor || DOMParser;
  const doc = new Parser().parseFromString(String(html), 'text/html');
  const root = doc.documentElement;
  const body = doc.body;
  if (!root || !body) throw new Error('accessible_html_unreadable');

  const words = (s) => { const m = String(s == null ? '' : s).match(/\S+/g); return m ? m.length : 0; };
  // Counted text node by text node, so minified markup ("</p><p>") cannot glue two words together and the count does
  // not depend on the order of the blocks.
  const wordsIn = (node) => { let n = 0; const w = doc.createTreeWalker(node, 4); while (w.nextNode()) n += words(w.currentNode.nodeValue); return n; };
  const textOf = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim();
  const clip = (s, n) => { const t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t; };
  const tag = (el) => String(el.tagName || '').toUpperCase();
  const isHeading = (el) => /^H[1-6]$/.test(tag(el));
  const levelOf = (el) => Number(tag(el).charAt(1));

  // Ids are positions in document order under <body>: stable for one file, which is why the outline reports the file's
  // sha-256 and the edit tool can check it.
  const all = Array.from(body.querySelectorAll('*'));
  const idByEl = new Map();
  const elById = new Map();
  all.forEach((el, i) => { const id = 'e' + (i + 1); idByEl.set(el, id); elById.set(id, el); });

  const headingSkips = () => {
    const out = [];
    let prev = 0;
    for (const h of Array.from(body.querySelectorAll('h1,h2,h3,h4,h5,h6'))) {
      const l = levelOf(h);
      if (prev && l > prev + 1) out.push({ id: idByEl.get(h) || null, text: clip(textOf(h), 80), from: prev, to: l });
      prev = l;
    }
    return out;
  };

  if (mode === 'outline') {
    const p = payload || {};
    const needle = typeof p.textContains === 'string' && p.textContains.trim() ? p.textContains.trim().toLowerCase() : '';
    const wanted = new Set(Array.isArray(p.kinds) && p.kinds.length ? p.kinds : ['heading', 'image', 'table', 'landmark']);
    if (needle) { wanted.add('heading'); wanted.add('paragraph'); wanted.add('list-item'); }
    const max = Math.max(1, Math.min(2000, Number(p.maxItems) || 300));
    const LANDMARK = new Set(['MAIN', 'NAV', 'HEADER', 'FOOTER', 'ASIDE', 'FORM']);
    const counts = {};
    const items = [];
    let prevLevel = 0;
    for (const el of all) {
      const t = tag(el);
      let item = null;
      if (isHeading(el)) {
        const l = levelOf(el);
        item = { kind: 'heading', level: l, text: clip(textOf(el), 160) };
        if (prevLevel && l > prevLevel + 1) item.skipsFrom = prevLevel;
        prevLevel = l;
      } else if (t === 'IMG' || (el.getAttribute('role') === 'img' && t !== 'IMG')) {
        if (t === 'IMG') {
          const alt = el.hasAttribute('alt') ? el.getAttribute('alt') : null;
          const src = el.getAttribute('src') || '';
          item = { kind: 'image', alt, decorative: alt === '' || /^(presentation|none)$/.test(el.getAttribute('role') || ''), source: /^data:/i.test(src) ? 'embedded image' : clip(src.split(/[?#]/)[0].split('/').pop(), 60) };
        } else {
          item = { kind: 'image', alt: el.getAttribute('aria-label') || null, decorative: false, source: t.toLowerCase() + ' with role="img"' };
        }
        const fig = el.closest('figure');
        const cap = fig ? fig.querySelector('figcaption') : null;
        if (cap) item.caption = clip(textOf(cap), 100);
      } else if (t === 'TABLE') {
        const rows = Array.from(el.rows || []);
        const cellsOf = (r) => Array.from(r.cells || []);
        const first = rows[0];
        const cols = rows.reduce((m, r) => Math.max(m, cellsOf(r).length), 0);
        const headerRow = !!first && cellsOf(first).length > 0 && cellsOf(first).every((c) => tag(c) === 'TH');
        const rest = rows.slice(headerRow ? 1 : 0);
        const headerColumn = rest.length > 0 && rest.every((r) => cellsOf(r).length > 0 && tag(cellsOf(r)[0]) === 'TH');
        const cap = el.querySelector('caption');
        item = { kind: 'table', rows: rows.length, columns: cols, headerRow, headerColumn, headerCells: el.querySelectorAll('th').length, firstRow: first ? clip(cellsOf(first).map(textOf).join(' | '), 160) : '' };
        if (cap) item.caption = clip(textOf(cap), 100);
      } else if (LANDMARK.has(t) || (t === 'SECTION' && el.getAttribute('aria-label'))) {
        item = { kind: 'landmark', tag: t.toLowerCase(), label: el.getAttribute('aria-label') || '' };
      } else if (t === 'P') {
        item = { kind: 'paragraph', text: clip(textOf(el), 200) };
      } else if (t === 'LI') {
        item = { kind: 'list-item', text: clip(textOf(el), 200) };
      } else if (el.hasAttribute('lang')) {
        item = { kind: 'language', tag: t.toLowerCase(), text: clip(textOf(el), 120) };
      }
      if (!item) continue;
      if (el.hasAttribute('lang')) item.lang = el.getAttribute('lang');
      item = Object.assign({ id: idByEl.get(el) }, item);
      // (2026-11-09) internal: the whole text, for matching a PDF comment to its element (pdf_read_annotations)
      if (p.fullText === true) item.full = clip(textOf(el), 5000);
      // (2026-11-09) internal: where a figure's picture was cropped from the page (fractions, origin top-left), so a PDF
      // comment placed on the picture can be matched to it.
      if (p.fullText === true && item.kind === 'image') {
        const fig = el.closest('figure');
        let c = null, n;
        const a1 = fig && fig.getAttribute('data-allo-source-crop'), a2 = fig && fig.getAttribute('data-crop');
        if (a1) { n = a1.trim().split(/ +/).map(Number); if (n.length === 5 && n.every(isFinite)) c = { page: n[0], x0: n[1], y0: n[2], x1: n[3], y1: n[4] }; }
        else if (a2) { try { n = JSON.parse(a2); } catch (_) { n = null; } if (n && n.canvasW > 0 && n.canvasH > 0) c = { page: n.page, x0: n.x / n.canvasW, y0: n.y / n.canvasH, x1: (n.x + n.w) / n.canvasW, y1: (n.y + n.h) / n.canvasH }; }
        if (c && c.page >= 1 && c.x1 > c.x0 && c.y1 > c.y0) item.crop = c;
      }
      counts[item.kind] = (counts[item.kind] || 0) + 1;
      if (!(wanted.has(item.kind) || (wanted.has('language') && item.lang))) continue;
      if (needle) {
        const hay = [item.text, item.alt, item.caption, item.firstRow, item.label].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(needle)) continue;
      }
      items.push(item);
    }
    return {
      document: { title: clip(doc.title, 200), lang: root.getAttribute('lang') || null, elements: all.length, counts, headingSkips: headingSkips() },
      items: items.slice(0, max), matching: items.length, truncated: items.length > max,
    };
  }

  if (mode !== 'edit') throw new Error('accessible_html_mode_unknown');

  // ── edit ────────────────────────────────────────────────────────────────────
  const ops = Array.isArray(payload && payload.operations) ? payload.operations : [];
  const results = [];
  const warnings = [];
  let failed = 0;
  let removedWords = 0, addedWords = 0;
  const wordsBefore = wordsIn(body);

  const copyInto = (from, to) => { for (const a of Array.from(from.attributes)) to.setAttribute(a.name, a.value); while (from.firstChild) to.appendChild(from.firstChild); };
  const retag = (el, newTag) => {
    const n = doc.createElement(newTag);
    copyInto(el, n);
    const id = idByEl.get(el);
    el.replaceWith(n);
    if (id) { idByEl.delete(el); idByEl.set(n, id); elById.set(id, n); }
    return n;
  };
  const setCell = (cell, newTag, scope) => {
    let c = cell;
    if (tag(cell) !== newTag.toUpperCase()) { c = doc.createElement(newTag); copyInto(cell, c); cell.replaceWith(c); }
    if (scope) c.setAttribute('scope', scope); else c.removeAttribute('scope');
    return c;
  };
  const kindName = (el) => {
    const t = tag(el);
    if (isHeading(el)) return 'level ' + levelOf(el) + ' heading';
    return ({ P: 'paragraph', LI: 'list item', TABLE: 'table', IMG: 'image', UL: 'list', OL: 'list', DL: 'list', FIGURE: 'figure', BLOCKQUOTE: 'quotation', SECTION: 'section', ARTICLE: 'article', ASIDE: 'aside', NAV: 'navigation', HEADER: 'header', FOOTER: 'footer', DIV: 'block', TR: 'table row', PRE: 'preformatted block' })[t] || t.toLowerCase();
  };
  const label = (el) => { const x = clip(textOf(el), 60); return kindName(el) + (x ? ' "' + x + '"' : ''); };
  const target = (id) => {
    if (typeof id !== 'string' || !/^e\d+$/.test(id)) throw new Error('an element id from outline_accessible_html is needed here (for example "e12")');
    const el = elById.get(id);
    if (!el) throw new Error('there is no element ' + id + ' in this document (ids come from outline_accessible_html on this same file)');
    if (!body.contains(el)) throw new Error('element ' + id + ' was already removed or replaced by an earlier operation in this call');
    return el;
  };
  const BLOCK = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'DL', 'TABLE', 'FIGURE', 'BLOCKQUOTE', 'SECTION', 'ARTICLE', 'ASIDE', 'NAV', 'HEADER', 'FOOTER', 'MAIN', 'DIV', 'PRE', 'HR', 'FORM', 'DETAILS']);

  ops.forEach((op, i) => {
    try {
      if (!op || typeof op !== 'object') throw new Error('each operation must be an object with an "op" name');
      let summary = '';
      let changed = true;
      if (op.op === 'set_heading_level') {
        if (!Number.isInteger(op.level) || op.level < 1 || op.level > 6) throw new Error('"level" must be a whole number from 1 to 6');
        const el = target(op.id);
        if (!(isHeading(el) || tag(el) === 'P')) throw new Error('that is a ' + kindName(el) + ', not a heading or a paragraph. Only headings and paragraphs can be given a heading level');
        if (!textOf(el)) throw new Error('that ' + kindName(el) + ' has no text, so it cannot be a heading');
        if (isHeading(el) && levelOf(el) === op.level) { changed = false; summary = 'The ' + label(el) + ' was already level ' + op.level + ' (no change)'; }
        else {
          const before = isHeading(el) ? 'level ' + levelOf(el) + ' heading' : 'paragraph';
          const n = retag(el, 'h' + op.level);
          summary = 'Changed the ' + before + ' "' + clip(textOf(n), 60) + '" to a level ' + op.level + ' heading';
        }
      } else if (op.op === 'make_paragraph') {
        const el = target(op.id);
        if (!isHeading(el)) throw new Error('that is a ' + kindName(el) + ', not a heading');
        const n = retag(el, 'p');
        summary = 'Changed the heading "' + clip(textOf(n), 60) + '" into an ordinary paragraph';
      } else if (op.op === 'set_alt_text') {
        const el = target(op.id);
        const dec = op.decorative === true;
        const has = typeof op.alt === 'string';
        if (dec === has) throw new Error('give exactly one of "alt" (the description) or "decorative": true');
        if (has && !op.alt.trim()) throw new Error('"alt" is empty. For a picture that needs no description use "decorative": true');
        if (has && op.alt.length > 500) throw new Error('"alt" is longer than 500 characters. Alternative text should be short; put long descriptions in the page text');
        const t = tag(el);
        if (t === 'IMG') {
          if (dec) { el.setAttribute('alt', ''); summary = 'Marked the image ' + (el.getAttribute('src') && !/^data:/i.test(el.getAttribute('src')) ? '"' + clip(el.getAttribute('src').split(/[?#]/)[0].split('/').pop(), 40) + '" ' : '') + 'as decorative (empty alternative text)'; }
          else { el.setAttribute('alt', op.alt.trim()); summary = 'Set the image alternative text to "' + clip(op.alt, 80) + '"'; }
        } else if (el.getAttribute('role') === 'img') {
          if (dec) throw new Error('"decorative" only works on an <img>; give "alt" for this ' + t.toLowerCase() + ' with role="img"');
          el.setAttribute('aria-label', op.alt.trim());
          summary = 'Set the label of the ' + t.toLowerCase() + ' image to "' + clip(op.alt, 80) + '"';
        } else throw new Error('that is a ' + kindName(el) + ', not an image');
        if (has && op.alt.trim().length > 150) warnings.push('Operation ' + (i + 1) + ': the alternative text is ' + op.alt.trim().length + ' characters; under about 150 reads better.');
      } else if (op.op === 'set_table_header') {
        const el = target(op.id);
        if (tag(el) !== 'TABLE') throw new Error('that is a ' + kindName(el) + ', not a table');
        const fr = op.first_row;
        const fc = op.first_column;
        if (typeof fr !== 'boolean' && typeof fc !== 'boolean') throw new Error('give "first_row" and/or "first_column" as true or false');
        if (fr !== undefined && typeof fr !== 'boolean') throw new Error('"first_row" must be true or false');
        if (fc !== undefined && typeof fc !== 'boolean') throw new Error('"first_column" must be true or false');
        const rows = Array.from(el.rows || []);
        if (!rows.length) throw new Error('the table has no rows');
        const said = [];
        if (typeof fr === 'boolean') {
          Array.from(rows[0].cells).forEach((c) => setCell(c, fr ? 'th' : 'td', fr ? 'col' : null));
          said.push(fr ? 'the first row as column headers' : 'the first row as ordinary cells');
        }
        if (typeof fc === 'boolean') {
          const head = Array.from(rows[0].cells);
          const headRow = head.length > 0 && head.every((c) => tag(c) === 'TH');
          rows.forEach((r, ri) => { if (ri === 0 && headRow) return; const c = r.cells[0]; if (c) setCell(c, fc ? 'th' : 'td', fc ? 'row' : null); });
          said.push(fc ? 'the first column as row headers' : 'the first column as ordinary cells');
        }
        summary = 'Marked ' + said.join(' and ') + ' in the table (' + rows.length + ' rows)';
        if (el.querySelector('[colspan],[rowspan]')) warnings.push('Operation ' + (i + 1) + ': this table has merged cells, so check that each header still reads correctly for the cells under it.');
      } else if (op.op === 'set_language') {
        if (!/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8}){0,3}$/.test(String(op.lang || ''))) throw new Error('"lang" must be a language code such as "en", "es" or "pt-BR"');
        if (op.id === undefined) { root.setAttribute('lang', op.lang); summary = 'Set the language of the whole document to ' + op.lang; }
        else { const el = target(op.id); el.setAttribute('lang', op.lang); summary = 'Set the language of the ' + label(el) + ' to ' + op.lang; }
      } else if (op.op === 'move_element') {
        const el = target(op.id);
        const hasB = typeof op.before_id === 'string';
        const hasA = typeof op.after_id === 'string';
        if (hasB === hasA) throw new Error('give exactly one of "before_id" or "after_id"');
        const ref = target(hasB ? op.before_id : op.after_id);
        if (el === ref || el.contains(ref)) throw new Error('an element cannot be moved next to itself or into its own contents');
        const te = tag(el);
        const tr = tag(ref);
        const compatible = (te === 'LI' && tr === 'LI') || (te === 'TR' && tr === 'TR') || (BLOCK.has(te) && BLOCK.has(tr));
        if (!compatible) throw new Error('only whole blocks can be moved (paragraphs, headings, lists, tables, figures, sections), and a list item or table row only next to another list item or row');
        const was = label(el);
        const refName = label(ref);
        if (hasB) ref.before(el); else ref.after(el);
        summary = 'Moved the ' + was + ' to just ' + (hasB ? 'before' : 'after') + ' the ' + refName;
      } else if (op.op === 'delete_element') {
        const el = target(op.id);
        if (tag(el) === 'MAIN') throw new Error('the main landmark cannot be deleted');
        const w = wordsIn(el);
        if (w > 400 && op.allow_large !== true) throw new Error('that ' + kindName(el) + ' holds ' + w + ' words. Check it is the right element, then repeat the operation with "allow_large": true');
        const was = label(el);
        removedWords += w;
        el.remove();
        summary = 'Removed the ' + was + ' (' + w + ' word' + (w === 1 ? '' : 's') + ')';
      } else if (op.op === 'set_table_caption') {
        // (2026-11-09) The one place words are ADDED: a caption names the table for a screen reader. Hidden visually unless
        // "visible" is true, as the pipeline's own captions are, and counted in words.added.
        const el = target(op.id);
        if (tag(el) !== 'TABLE') throw new Error('that is a ' + kindName(el) + ', not a table');
        if (typeof op.text !== 'string' || !op.text.trim()) throw new Error('"text" (the caption) is needed');
        if (op.text.length > 300) throw new Error('"text" is longer than 300 characters. A caption is a short title for the table');
        if (op.visible !== undefined && typeof op.visible !== 'boolean') throw new Error('"visible" must be true or false');
        let cap = Array.from(el.children).find((c) => tag(c) === 'CAPTION');
        const had = cap ? textOf(cap) : '';
        if (cap) removedWords += wordsIn(cap); else { cap = doc.createElement('caption'); el.insertBefore(cap, el.firstChild); }
        cap.textContent = op.text.replace(/\s+/g, ' ').trim();
        if (op.visible === true) { cap.classList.remove('sr-only'); if (!cap.getAttribute('class')) cap.removeAttribute('class'); } else cap.classList.add('sr-only');
        addedWords += wordsIn(cap);
        summary = (had ? 'Changed the table caption from "' + clip(had, 60) + '" to "' : 'Gave the table the caption "') + clip(op.text, 80) + '"' + (op.visible === true ? '' : ' (read by screen readers, not shown)');
      } else if (op.op === 'set_title') {
        if (typeof op.text !== 'string' || !op.text.trim()) throw new Error('"text" (the document title) is needed');
        if (op.text.length > 200) throw new Error('"text" is longer than 200 characters');
        let head = doc.head;
        if (!head) { head = doc.createElement('head'); root.insertBefore(head, root.firstChild); }
        let t = head.querySelector('title');
        const had = t ? textOf(t) : '';
        if (!t) { t = doc.createElement('title'); head.appendChild(t); }
        const next = op.text.replace(/\s+/g, ' ').trim();
        if (had === next) { changed = false; summary = 'The document title was already "' + clip(next, 80) + '" (no change)'; }
        else { t.textContent = next; summary = 'Set the document title to "' + clip(next, 80) + '"' + (had ? ' (it was "' + clip(had, 60) + '")' : ''); }
      } else if (op.op === 'make_list') {
        if (!Array.isArray(op.ids) || op.ids.length < 1 || op.ids.length > 200) throw new Error('"ids" must list 1 to 200 paragraph ids, in order');
        if (op.ordered !== undefined && typeof op.ordered !== 'boolean') throw new Error('"ordered" must be true or false');
        if (op.strip_markers !== undefined && typeof op.strip_markers !== 'boolean') throw new Error('"strip_markers" must be true or false');
        const els = op.ids.map(target);
        els.forEach((el, k) => {
          if (tag(el) !== 'P') throw new Error('element ' + op.ids[k] + ' is a ' + kindName(el) + '; only paragraphs can become list items');
          if (k > 0 && els[k - 1].nextElementSibling !== el) throw new Error('the paragraphs must follow one another directly, in the order given (' + op.ids[k - 1] + ' is not followed by ' + op.ids[k] + ')');
        });
        const list = doc.createElement(op.ordered === true ? 'ol' : 'ul');
        els[0].before(list);
        const marker = /^\s*(?:[•●○▪◦‣⁃·*–—-]|\(?\d{1,3}[.)]|\(?[A-Za-z][.)])\s+/;
        let stripped = 0;
        els.forEach((el) => {
          if (op.strip_markers === true) {
            const first = doc.createTreeWalker(el, 4).nextNode();
            if (first && marker.test(first.nodeValue)) { const before = words(first.nodeValue); first.nodeValue = first.nodeValue.replace(marker, ''); stripped += before - words(first.nodeValue); }
          }
          const li = retag(el, 'li');
          list.appendChild(li);
        });
        removedWords += stripped;
        summary = 'Made ' + els.length + ' paragraph' + (els.length === 1 ? '' : 's') + ' into ' + (op.ordered === true ? 'a numbered' : 'a bulleted') + ' list, starting "' + clip(textOf(list.firstElementChild), 50) + '"'
          + (stripped ? ' (' + stripped + ' typed bullet or number marker' + (stripped === 1 ? '' : 's') + ' removed)' : '');
      } else if (op.op === 'list_to_paragraphs') {
        const el = target(op.id);
        if (!/^(?:UL|OL)$/.test(tag(el))) throw new Error('that is a ' + kindName(el) + ', not a list');
        const lis = Array.from(el.children);
        if (!lis.length || lis.some((c) => tag(c) !== 'LI')) throw new Error('that list has something other than list items directly inside it');
        if (lis.some((li) => li.querySelector('ul,ol,table,p,h1,h2,h3,h4,h5,h6'))) throw new Error('an item of that list holds another list, a table or a block; only a simple list can become paragraphs');
        const firstText = clip(textOf(lis[0]), 50);
        lis.forEach((li) => { el.before(retag(li, 'p')); });
        el.remove();
        summary = 'Changed a list of ' + lis.length + ' item' + (lis.length === 1 ? '' : 's') + ' into ' + (lis.length === 1 ? 'a paragraph' : 'paragraphs') + ', starting "' + firstText + '"';
      } else {
        throw new Error('unknown operation "' + String(op.op) + '"');
      }
      results.push({ index: i + 1, op: op.op, id: typeof op.id === 'string' ? op.id : null, ok: true, changed, summary });
    } catch (e) {
      failed++;
      results.push({ index: i + 1, op: op && typeof op.op === 'string' ? op.op : null, id: op && typeof op.id === 'string' ? op.id : null, ok: false, error: String((e && e.message) || e) });
    }
  });

  if (failed) return { ok: false, results, applied: 0, failed };
  const wordsAfter = wordsIn(body);
  // The safety net behind "never changes the words": only delete_element may take words away, and nothing adds any.
  if (wordsAfter !== wordsBefore - removedWords + addedWords) throw new Error('accessible_html_text_changed: the edit would have changed the document text (' + wordsBefore + ' words before, ' + wordsAfter + ' after, ' + removedWords + ' removed on purpose). Nothing was written');
  return {
    ok: true, html: '<!DOCTYPE html>\n' + root.outerHTML + '\n', results, applied: results.filter((r) => r.changed).length, failed: 0,
    words: { before: wordsBefore, after: wordsAfter, removed: removedWords, ...(addedWords ? { added: addedWords } : {}) }, headingSkips: headingSkips(), warnings,
  };
}

module.exports = {
  accessibleHtmlTool,
  OPERATION_NAMES: Object.freeze(['set_heading_level', 'make_paragraph', 'set_alt_text', 'set_table_header', 'set_table_caption', 'set_title', 'set_language', 'make_list', 'list_to_paragraphs', 'move_element', 'delete_element']),
  OPERATION_KEYS: Object.freeze({
    set_heading_level: ['op', 'id', 'level'],
    make_paragraph: ['op', 'id'],
    set_alt_text: ['op', 'id', 'alt', 'decorative'],
    set_table_header: ['op', 'id', 'first_row', 'first_column'],
    set_table_caption: ['op', 'id', 'text', 'visible'],
    set_title: ['op', 'text'],
    make_list: ['op', 'ids', 'ordered', 'strip_markers'],
    list_to_paragraphs: ['op', 'id'],
    set_language: ['op', 'id', 'lang'],
    move_element: ['op', 'id', 'before_id', 'after_id'],
    delete_element: ['op', 'id', 'allow_large'],
  }),
  OUTLINE_KINDS: Object.freeze(['heading', 'image', 'table', 'landmark', 'paragraph', 'list-item', 'language']),
};
