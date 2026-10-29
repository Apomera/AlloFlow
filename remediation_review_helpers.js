(function (root, factory) {
  'use strict';
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) { root.AlloModules = root.AlloModules || {}; root.AlloModules.RemediationReview = api; }
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';
  var MAX_RECORDS = 100, MAX_REFERENCES = 700;
  var reasons = {
    "source-visibility-changed": "The suggestion hid source content from view or assistive technology; the original was retained.",
    "table-semantics-changed": "Existing table headers or associations lost their meaning; the original table was retained.",
    "form-state-changed": "A form value, state, label association, or destination changed; the original form was retained.",
    "math-content-changed": "Mathematical notation or structure changed; the original expression was retained.",
    'no-original': 'The suggestion had no usable source for comparison and was rejected.',
    'empty-output': 'The suggestion was empty; the original content was retained.',
    'no-doc-markers': 'The suggestion did not contain a complete document; the original was retained.',
    'size-shrink': 'The suggestion removed too much document structure; the original was retained.',
    'text-shrink': 'The suggestion omitted too much text; the original was retained.',
    'size-growth-unexpected': 'The suggestion added too much document structure; the original was retained.',
    'text-growth-unexpected': 'The suggestion added too much text; the original was retained.',
    'table-cell-transposition': 'Table values changed position; the original table content was retained.',
    'image-reference-uncheckable': 'The image references could not be verified; the original images were retained.',
    'image-reference-changed': 'Image identity or order changed; the original images were retained.',
    'invalid-json-wrapper': 'The suggestion could not be read as HTML; the original was retained.',
    "table-content-changed": "Table values, cells, or spans changed; the original table was retained.",
    "source-value-changed": "A source number, sign, or unit changed or was added; the original content was retained.",
    "link-destination-changed": "A link destination or link order changed; the original links were retained.",
    "image-association-changed": "An image moved relative to its source content or caption; the original placement was retained.",
    "source-reading-order-changed": "Source wording or reading order changed; the original content was retained.",
    "source-content-added": "The suggestion added unsupported source content; the original was retained.",
    "source-contract-uncheckable": "Source preservation could not be checked; the original content was retained.",
    'content-not-preserved': 'The suggestion did not preserve the document; the original was retained.'
  };
  function count(value) { return Number.isSafeInteger(value) && value >= 0 ? Math.min(value, 1000000) : 0; }
  function records(value) {
    if (!Array.isArray(value)) return [];
    return value.slice(0, MAX_RECORDS).filter(function (r) {
      return r && typeof r === 'object' && !Array.isArray(r) && typeof r.chunkId === 'string'
        && /^(?:all|[0-9]{1,8}(?:\.[0-9]{1,8})?)$/.test(r.chunkId)
        && ['single', 'chunk', 'image-retry', 'half', 'half-assembly', 'assembly'].includes(r.phase)
        && Object.prototype.hasOwnProperty.call(reasons, r.reason);
    }).map(function (r) {
      var item = { chunkId: r.chunkId, phase: r.phase, reason: r.reason };
      if (Number.isSafeInteger(r.pass) && r.pass >= 1 && r.pass <= 1000000) item.pass = r.pass;
      if (typeof r.sourceLocation === 'string' && /^(?:document|(?:table|row|cell|link|figure|control|math):[1-9][0-9]{0,7}(?:\/(?:row|cell):[1-9][0-9]{0,7}){0,2})$/.test(r.sourceLocation)) item.sourceLocation = r.sourceLocation;
      return item;
    });
  }
  function evidence(value) {
    var list = records(value && value.candidateRejections);
    return { candidateRejectionCount: Math.max(count(value && value.candidateRejectionCount), list.length), candidateRejections: list };
  }
  // Each pass callback carries a delta once. Metadata never changes readiness or HTML.
  function mergeEvidence(previous, delta) {
    var a = evidence(previous), b = evidence(delta);
    return { candidateRejectionCount: Math.min(1000000, a.candidateRejectionCount + b.candidateRejectionCount), candidateRejections: a.candidateRejections.concat(b.candidateRejections).slice(0, MAX_RECORDS) };
  }
  function acknowledgments(value) {
    var result = {};
    if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
    Object.keys(value).slice(0, MAX_RECORDS).forEach(function (key) {
      if (/^preservation\|/.test(key) && key.length <= 180 && Number.isSafeInteger(value[key]) && value[key] > 0) result[key] = value[key];
    });
    return result;
  }
  function reviewItems(value, reviewed) {
    return records(value && value.candidateRejections).map(function (r, index) {
      var key = ['preservation', index, r.pass, r.chunkId, r.phase, r.reason].join('|');
      return Object.assign({}, r, { key: key, reviewed: !!(reviewed && reviewed[key]), description: reasons[r.reason] || reasons['content-not-preserved'],
        locationLabel: r.sourceLocation ? 'Location in the input for this attempt: ' + r.sourceLocation.replace(/:/g, ' ').replace(/\//g, ', ') + '.' : '',
        referenceKind: /table/i.test(r.reason) ? 'table' : /image|asset|placeholder/i.test(r.reason) ? 'figure' : null });
    });
  }
  function text(value) { return String(value || '').normalize('NFKC').replace(/\s+/g, ' ').trim(); }
  function documentFor(html, options) {
    var Parser = (options && options.DOMParser) || (root && root.DOMParser);
    if (!Parser) throw new Error('Document references need an HTML parser.');
    return new Parser().parseFromString(String(html || ''), 'text/html');
  }
  async function hash(value, options) {
    if (options && typeof options.digest === 'function') return options.digest(String(value));
    var subtle = root && root.crypto && root.crypto.subtle;
    if (!subtle) throw new Error('Document references need SHA-256 support.');
    var Encoder = root.TextEncoder || globalThis.TextEncoder;
    var bytes = await subtle.digest('SHA-256', new Encoder().encode(String(value)));
    return Array.from(new Uint8Array(bytes)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }
  function ownedRows(table) { return Array.from(table.querySelectorAll('tr')).filter(function (row) { return row.closest('table') === table; }); }
  // This sidecar identifies source elements. It is not accessibility or fidelity proof.
  // No IDs/attributes are injected into the document being verified.
  async function inventory(doc, options) {
    var refs = [], tables = Array.from(doc.querySelectorAll('table')).slice(0, 100), images = Array.from(doc.querySelectorAll('img')).slice(0, 200);
    for (var ti = 0; ti < tables.length && refs.length < MAX_REFERENCES; ti++) {
      var table = tables[ti], rows = ownedRows(table), cellData = [];
      rows.forEach(function (row, ri) {
        Array.from(row.children).filter(function (cell) { return /^(TD|TH)$/.test(cell.tagName); }).forEach(function (cell, ci) {
          cellData.push({ node: cell, row: ri, column: ci, value: text(cell.textContent), rowSpan: cell.rowSpan || 1, colSpan: cell.colSpan || 1 });
        });
      });
      var fingerprint = await hash(JSON.stringify(cellData.map(function (cell) { return [cell.row, cell.column, cell.value, cell.rowSpan, cell.colSpan]; })), options);
      var caption = Array.from(table.children).find(function (child) { return child.tagName === 'CAPTION'; });
      refs.push({ kind: 'table', table: ti, fingerprint: fingerprint, label: 'Table ' + (ti + 1) + (caption ? ': ' + text(caption.textContent).slice(0, 120) : ''), node: table });
      for (var ci = 0; ci < cellData.length && refs.length < MAX_REFERENCES; ci++) {
        var cell = cellData[ci];
        refs.push({ kind: 'cell', table: ti, row: cell.row, column: cell.column, tableFingerprint: fingerprint,
          fingerprint: await hash(JSON.stringify([cell.value, cell.rowSpan, cell.colSpan]), options),
          label: 'Table ' + (ti + 1) + ', row ' + (cell.row + 1) + ', cell ' + (cell.column + 1), node: cell.node });
      }
    }
    for (var ii = 0; ii < images.length && refs.length < MAX_REFERENCES; ii++) {
      var img = images[ii];
      refs.push({ kind: 'figure', index: ii, fingerprint: await hash(JSON.stringify([img.getAttribute('src') || '', img.getAttribute('srcset') || '']), options),
        label: 'Image ' + (ii + 1) + (img.getAttribute('alt') ? ': ' + text(img.getAttribute('alt')).slice(0, 120) : ''), node: img });
    }
    var signature = await hash(JSON.stringify([text(doc.body && doc.body.textContent), refs.map(function (ref) { return [ref.kind, ref.fingerprint]; })]), options);
    return { refs: refs, signature: signature, truncated: refs.length >= MAX_REFERENCES || doc.querySelectorAll('table').length > tables.length || doc.querySelectorAll('img').length > images.length };
  }
  async function createSourceModel(html, options) {
    try {
      var doc = documentFor(html, options), inv = await inventory(doc, options), sourceDigest = await hash(String(html || ''), options);
      return { version: 1, sourceDigest: sourceDigest, signature: inv.signature, truncated: inv.truncated,
        references: inv.refs.map(function (ref, index) {
          var result = Object.assign({}, ref, { id: 'src-' + sourceDigest.slice(0, 16) + '-' + (index + 1) });
          delete result.node;
          return result;
        }) };
    } catch (_) { return null; }
  }
  function normalizeSourceModel(value) {
    if (!value || value.version !== 1 || !/^[a-f0-9]{64}$/.test(value.sourceDigest || '') || !/^[a-f0-9]{64}$/.test(value.signature || '') || !Array.isArray(value.references)) return null;
    var ids = new Set(), refs = [];
    for (var raw of value.references.slice(0, MAX_REFERENCES)) {
      if (!raw || !['table', 'cell', 'figure'].includes(raw.kind) || !new RegExp('^src-' + value.sourceDigest.slice(0, 16) + '-[1-9][0-9]{0,3}$').test(raw.id || '') || ids.has(raw.id) || !/^[a-f0-9]{64}$/.test(raw.fingerprint || '')) return null;
      var ref = { id: raw.id, kind: raw.kind, fingerprint: raw.fingerprint, label: String(raw.label || '').slice(0, 160) };
      var keys = raw.kind === 'figure' ? ['index'] : raw.kind === 'cell' ? ['table', 'row', 'column'] : ['table'];
      for (var key of keys) { if (!Number.isSafeInteger(raw[key]) || raw[key] < 0 || raw[key] > 100000) return null; ref[key] = raw[key]; }
      if (raw.kind === 'cell') { if (!/^[a-f0-9]{64}$/.test(raw.tableFingerprint || '')) return null; ref.tableFingerprint = raw.tableFingerprint; }
      ids.add(ref.id); refs.push(ref);
    }
    return { version: 1, sourceDigest: value.sourceDigest, signature: value.signature, truncated: value.truncated === true || value.references.length >= MAX_REFERENCES, references: refs };
  }
  async function resolveSourceReference(doc, model, id, options) {
    model = normalizeSourceModel(model);
    var ref = model && model.references.find(function (item) { return item.id === id; });
    if (!ref || !doc) return { status: 'unavailable', node: null };
    // An incomplete sidecar or current inventory cannot establish uniqueness: an
    // unseen duplicate may be the surviving element. Never infer identity from a cap.
    if (model.truncated) return { status: 'unavailable', node: null, reason: 'reference-inventory-truncated' };
    var inv;
    try { inv = await inventory(doc, options); } catch (_) { return { status: 'unavailable', node: null }; }
    if (inv.truncated) return { status: 'unavailable', node: null, reason: 'reference-inventory-truncated' };
    var sameIdentity = function (item) {
      return item.kind === ref.kind && item.fingerprint === ref.fingerprint
        && (ref.kind !== 'cell' || (item.tableFingerprint === ref.tableFingerprint && item.row === ref.row && item.column === ref.column));
    };
    var sourceCandidates = model.references.filter(sameIdentity);
    var candidates = inv.refs.filter(sameIdentity);
    if (!candidates.length) return { status: 'changed', node: null };
    // Both sides must identify a unique element. Matching the remaining target
    // alone maps two old IDs onto one survivor after a duplicate is removed.
    // Document signatures and positions do not prove which identical duplicate
    // survived or moved, even if unchanged text makes the signatures equal.
    if (sourceCandidates.length !== 1 || candidates.length !== 1) return { status: 'ambiguous', node: null };
    return { status: 'matched', node: candidates[0].node, reference: ref };
  }
  return { reasons: reasons, acknowledgments: acknowledgments, evidence: evidence, mergeEvidence: mergeEvidence, reviewItems: reviewItems,
    createSourceModel: createSourceModel, normalizeSourceModel: normalizeSourceModel, resolveSourceReference: resolveSourceReference };
});

// Decision guides for the judgment calls a remediation leaves to a person (2026-10-28).
// One guide per KIND of call: what the automated check found, what it cannot know, the question a person
// answers, the usual answers with what each leads to, and a short lesson with examples. The same data feeds
// the app's "Needs your judgment" list, the connector's report (deliveryExplanation.decisions) and, later,
// professional-development modules. Content is written for teachers and staff, not accessibility experts.
// Matching keys: '<source>:<id>' with source equalAccess | axe | ai | fidelity | delivery.
// An option with settles:true needs no change to the document: choosing it marks the finding reviewed. Other options
// record the decision and leave the finding open until a later check no longer flags it.
// Lives in this file because every build path (per-module builder, build.js deploy path, desktop app-build) appends
// it to doc_pipeline_module.js: window.AlloModules.RemediationDecisionGuides in the browser, and
// require('remediation_review_helpers.js').decisionGuides in Node (added to the helpers' exports, not replacing them).
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports && typeof module.exports === 'object') module.exports.decisionGuides = api;
  if (root) { root.AlloModules = root.AlloModules || {}; root.AlloModules.RemediationDecisionGuides = api; }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  var UNSURE = { id: 'unsure', label: 'Not sure', choose: 'You cannot tell from the page, or it depends on how the document will be used.', then: 'Leave it open and ask a colleague who knows the content. It stays in the review list until someone decides.' };
  var GUIDES = [
    {
      id: 'sensory-words', title: 'Words that point by position, shape or colour', wcag: ['1.3.3'],
      match: ['equalAccess:text_sensory_misuse'],
      checkerCannot: 'The checker spots words such as below, above, left, right, round, red or large. It cannot tell whether a reader has to SEE the page to follow the sentence, or whether the word means something else ("your right to appeal", "the largest group").',
      question: 'Could someone who cannot see the layout still follow this sentence?',
      options: [
        { id: 'fine', settles: true, label: 'Fine as written', choose: 'The word is not about position or appearance ("the largest share", "a legal right"), or the thing is also named ("Table 2 below"), or "below" just means the text that comes next.', then: 'Record it as fine. Nothing in the document changes.' },
        { id: 'reword', label: 'Reword it', choose: 'The reader must see where something is or what it looks like ("click the green button", "see the box on the right").', then: 'Name the thing as well: "select Submit (the green button)", "see the Contact box". Edit the sentence, then run the check again.' },
        UNSURE],
      lesson: {
        steps: ['Read the whole sentence aloud without looking at the page.', 'Ask: would I know which thing is meant, or what to do?', 'Position words are fine when the thing is also named, or when "below" simply means "next in the text": a screen reader reaches that text next.'],
        fine: 'The steps below explain how to apply.  /  Hispanic students were the largest group.',
        fix: 'Use the form on the right.  ->  Use the Contact form (on the right).'
      }
    },
    {
      id: 'colour-only', title: 'Colour as the only signal', wcag: ['1.4.1'],
      match: ['equalAccess:style_color_misuse'],
      checkerCannot: 'Equal Access asks this of every document whose styles use colour. It cannot tell whether colour is ever the ONLY way a meaning is shown.',
      question: 'Does any part of this document show meaning by colour alone?',
      options: [
        { id: 'fine', settles: true, label: 'No, colour is never the only signal', choose: 'Colour is decorative, or every coloured meaning is also given in words, symbols, labels or patterns.', then: 'Confirm it for this document. The confirmation is recorded and asked again if the document changes.' },
        { id: 'fix', label: 'Yes, add another signal', choose: 'For example "answers in red", required fields shown only in red, or a chart key that uses colours alone.', then: 'Add a word, symbol or label next to the colour ("(required)", "Correct:", labels on chart slices). Edit, then run the check again.' },
        UNSURE],
      lesson: {
        steps: ['Look for colour keys and legends, coloured words that carry meaning, highlighted rows, and charts.', 'Print preview in grayscale: is anything lost?', 'If every meaning survives without colour, it is fine.'],
        fine: 'Headings are dark blue for style; nothing depends on the colour.',
        fix: 'Overdue items are in red.  ->  Overdue items are marked "Overdue" (and shown in red).'
      }
    },
    {
      id: 'heading-or-emphasis', title: 'Is this bold text a heading?', wcag: ['1.3.1', '2.4.6'],
      match: ['equalAccess:text_block_heading'],
      checkerCannot: 'The checker sees short, bold or large text on its own line. It cannot tell whether the text names a section (a heading) or is emphasis, a label, a caption or a repeated page header.',
      question: 'Does this text introduce the content that follows it?',
      options: [
        { id: 'heading', label: 'Yes, make it a heading', choose: 'It names a section, like "Materials" or "Step 2: Mix the solution".', then: 'Mark it as a heading one level below the section it sits in (use the Workbench or edit it), then run the check again.' },
        { id: 'fine', settles: true, label: 'No, it is not a heading', choose: 'It is emphasis, a label ("Due:"), a caption, or a header repeated on every page.', then: 'Record it as fine.' },
        UNSURE],
      lesson: {
        steps: ['Screen-reader users jump between headings the way sighted readers skim bold titles.', 'Ask: would this line belong in a table of contents?', 'Text shown twice (a caption repeated by the description) is a caption, not a heading.'],
        fine: 'Note: bring a calculator.  (a label inside a paragraph)',
        fix: 'A bold line "Materials" above a list of supplies  ->  heading "Materials".'
      }
    },
    {
      id: 'quotation', title: 'Is this a quotation?', wcag: ['1.3.1'],
      match: ['equalAccess:text_quoted_correctly'],
      checkerCannot: 'The checker sees text in quotation marks. It cannot tell a real quotation (someone\'s words) from a title, a term, a button label, or words printed in a logo.',
      question: 'Is this someone else\'s words being quoted, set apart as a passage?',
      options: [
        { id: 'quote', label: 'Yes, a block quotation', choose: 'A passage quoted from a person or a source, set apart from the text.', then: 'Mark it as a block quotation (Workbench), keeping the source if the page names one.' },
        { id: 'fine', settles: true, label: 'No, leave it', choose: 'A title, a term in quotes, a menu or button label, words in a picture, or a short quote inside a sentence (quotation marks are enough).', then: 'Record it as fine.' },
        UNSURE],
      lesson: {
        steps: ['Only quoted passages set apart from the text need quotation markup.', 'Short quotes inside a sentence are fine with quotation marks.', 'Words shown in a logo or picture are part of its description.'],
        fine: 'Select "Submit".  /  The logo reads "cds".',
        fix: 'A paragraph from the law, indented and in quotes  ->  block quotation.'
      }
    },
    {
      id: 'list-or-paragraphs', title: 'Is this really a list?', wcag: ['1.3.1'],
      match: ['equalAccess:list_markup_review'],
      checkerCannot: 'The checker sees lines that look like a series (numbers, bullets, short repeated lines). It cannot tell whether they belong together as a list or are separate paragraphs, table rows or an address.',
      question: 'Are these related items meant to be read as one group?',
      options: [
        { id: 'list', label: 'Yes, mark it as a list', choose: 'Steps, options, materials, rules: items that belong together.', then: 'Mark it as a list, numbered when the order matters (Workbench or edit).' },
        { id: 'fine', settles: true, label: 'No, leave the paragraphs', choose: 'Separate paragraphs, an address, or a table.', then: 'Record it as fine.' },
        UNSURE],
      lesson: {
        steps: ['A screen reader announces "list, 5 items", so the listener knows how much is coming.', 'Use a numbered list when the order matters (steps), bullets when it does not.'],
        fine: 'A mailing address on three lines.',
        fix: '(1) Shuffle (2) Deal (3) Score  ->  a numbered list.'
      }
    },
    {
      id: 'download-link', title: 'Do the download links work with the keyboard?', wcag: ['2.1.1', '2.4.4'],
      match: ['equalAccess:download_keyboard_controllable'],
      checkerCannot: 'The checker sees a link to a file (PDF, Word, spreadsheet). It cannot press it to find out whether the file opens with the keyboard alone, or whether the link is the one the document meant.',
      question: 'Does each file link open with the keyboard, and point to the right file?',
      options: [
        { id: 'fine', settles: true, label: 'Yes, it works', choose: 'Tab reaches the link, Enter opens the file, and it is the file the original linked.', then: 'Record it as fine.' },
        { id: 'fix', label: 'No, fix or remove it', choose: 'It does not open, opens the wrong file, or was not a link in the original.', then: 'Correct the address from the original document, or remove the link, then run the check again.' },
        UNSURE],
      lesson: {
        steps: ['Press Tab until the link is highlighted, then press Enter.', 'Compare the address with the original document.', 'Good link text says what the file is: "2024 budget (PDF)".'],
        fine: 'Download the application form (PDF).',
        fix: 'A link added to a page footer that was plain text in the original  ->  remove it.'
      }
    },
    {
      id: 'long-image-description', title: 'Image descriptions over 150 characters', wcag: ['1.1.1'],
      match: ['equalAccess:media_alt_brief'],
      checkerCannot: 'The checker counts characters. It cannot judge whether the description gives the point of the image, or whether the long detail belongs in visible text where everyone can read it.',
      question: 'Does the description give the purpose of the image in a sentence or two?',
      options: [
        { id: 'fine', settles: true, label: 'Keep it', choose: 'It is long because the image carries information that is not in the text, and the description stays on point.', then: 'Record it as fine. Consider putting the detail in a visible caption or table as well.' },
        { id: 'shorten', label: 'Shorten it', choose: 'It describes appearance (colours, shapes, layout) rather than what the image is for.', then: 'Rewrite it to the purpose ("Step 1 of 6: choose your assurance level"); keep data in the chart table or text.' },
        UNSURE],
      lesson: {
        steps: ['Start with why the image is there.', 'A screen reader reads the whole description every time: keep it to what the reader needs.', 'Detail that everyone needs belongs in visible text, not hidden in the description.'],
        fine: 'Bar chart: average math scores rose from 240 in 2000 to 282 in 2019.',
        fix: 'A green circle with the number 1 beside a grey rounded label reading...  ->  Step 1: decide which assurance level applies.'
      }
    },
    {
      id: 'blockquote-indent', title: 'An indented block marked as a quotation', wcag: ['1.3.1'],
      match: ['equalAccess:blockquote_cite_exists'],
      checkerCannot: 'The checker sees a block quotation. It cannot tell whether it really is a quotation or was used only to indent text.',
      question: 'Is this indented block a quotation?',
      options: [
        { id: 'fine', settles: true, label: 'Yes, it is a quotation', choose: 'Someone\'s words or a passage from a source.', then: 'Record it as fine; name the source in the text if the page gives one.' },
        { id: 'fix', label: 'No, it is only indented', choose: 'Ordinary text that was indented for looks.', then: 'Make it a normal paragraph (Workbench). Indentation is styling, not meaning.' },
        UNSURE],
      lesson: { steps: ['Quotation markup tells a screen reader "this is quoted".', 'Using it for indentation announces a quotation that is not there.'], fine: 'A quoted paragraph from a court decision.', fix: 'An indented note to parents  ->  a normal paragraph.' }
    },
    {
      id: 'changed-numbers', title: 'Numbers that may have changed', wcag: [],
      match: ['fidelity:numeric'],
      checkerCannot: 'AlloFlow compares every number in the original with the accessible version. A number can be flagged because it was dropped or changed, or harmlessly: a page number, a chart axis label, a list number, or the same value written another way.',
      question: 'Is each listed number either present (perhaps written differently) or harmless?',
      options: [
        { id: 'fine', settles: true, label: 'All accounted for', choose: 'Each one is a page number, an axis label, a list number, a footnote mark, or the same value written differently.', then: 'Record it as checked.' },
        { id: 'fix', label: 'A value is wrong or missing', choose: 'A score, date, amount, count or percentage is missing or different.', then: 'Correct it in the document from the original, then run the check again. Do not share until it is fixed.' },
        UNSURE],
      lesson: {
        steps: ['Check scores, dates, money and percentages first: they matter most.', 'Search the original for each listed number and look at what it was.', 'Harmless: 10, 20, 30... on a chart axis; page numbers; "(1)...(10)" numbering a list.'],
        fine: '16 and 17 were the printed page numbers.',
        fix: 'The original says 32%; the accessible version says 23%  ->  correct it.'
      }
    },
    {
      id: 'missing-words', title: 'Words that may be missing', wcag: [],
      match: ['delivery:content_coverage_requires_review', 'fidelity:coverage'],
      checkerCannot: 'AlloFlow checks that every word of the original appears in the accessible version. A word can be flagged because it was dropped, or because the PDF\'s hidden text split or glued words, repeats a page header, or holds chart labels.',
      question: 'Is each listed word really in the accessible version, or harmless?',
      options: [
        { id: 'fine', settles: true, label: 'Nothing is lost', choose: 'Each word is there (perhaps split, joined or styled differently), or it is a page number, chart label or decoration.', then: 'Record it as checked. The tagged PDF stays held until the check passes on a later run.' },
        { id: 'fix', label: 'Something is missing', choose: 'A sentence, name, heading or answer choice is not in the accessible version.', then: 'Add the missing text in the right place (Workbench or edit), then run the check again.' },
        UNSURE],
      lesson: {
        steps: ['Search the accessible version for each listed word.', 'A run of missing words in one place usually means a passage was dropped: compare that part of the page.', 'Odd fragments ("hey", "2010fall", "http") usually come from how the PDF stores text, not from a loss.'],
        fine: '"Racial/Ethnic" was split across two lines in the PDF.',
        fix: 'The last paragraph of page 3 is not in the accessible version  ->  add it.'
      }
    },
    {
      id: 'reading-order', title: 'Reading order differs from the original', wcag: ['1.3.2'],
      match: ['fidelity:sourceReadingOrder', 'fidelity:sourceReadingOrderRegrouped'],
      checkerCannot: 'AlloFlow measures how far the order of the words moved from the original. It cannot tell whether the new order is better (a two-column form grouped by section) or wrong (columns mixed together, a caption far from its picture).',
      question: 'Reading from top to bottom, does the accessible version make sense in this order?',
      options: [
        { id: 'fine', settles: true, label: 'The order makes sense', choose: 'Sections follow sensibly, and each passage reads in order inside.', then: 'Record it as checked.' },
        { id: 'fix', label: 'Something is out of place', choose: 'Sentences are jumbled, a section is in the wrong place, or instructions come after the fields they describe.', then: 'Move the passage to where it belongs (Workbench or edit), then run the check again.' },
        UNSURE],
      lesson: {
        steps: ['Read the headings in order: do they follow the document\'s logic?', 'Read the first and last sentence of each section.', 'Check that instructions come before the questions they explain, and captions sit next to their pictures.'],
        fine: 'A two-column intake form read section by section (child, then parent).',
        fix: 'Two newsletter columns mixed line by line  ->  restore each article in full.'
      }
    },
    {
      id: 'picture-placement', title: 'Is each picture in the right place?', wcag: ['1.1.1', '1.3.2'],
      match: ['fidelity:imagePairing', 'fidelity:placement'],
      checkerCannot: 'AlloFlow matches pictures to captions by what they describe. When the counts or descriptions disagree, it cannot be sure each picture sits under the right caption, or where a leftover picture belongs.',
      question: 'Is each picture next to the caption and text it belongs to?',
      options: [
        { id: 'fine', settles: true, label: 'All in place', choose: 'Every picture matches its caption and nearby text.', then: 'Record it as checked.' },
        { id: 'fix', label: 'Move or replace a picture', choose: 'A picture is under the wrong caption, or sits in the "review" section at the end.', then: 'Use the image review panel to move or replace it, then run the check again.' },
        UNSURE],
      lesson: { steps: ['Compare each picture with the original page.', 'Pictures gathered at the end (placement review) need a home or can be removed if decorative.'], fine: 'The photo of the launch sits under "Artemis I".', fix: 'A chart of enrollment under the caption for test scores  ->  swap them.' }
    },
    {
      id: 'scan-corrections', title: 'Words corrected in a scanned page', wcag: [],
      match: ['fidelity:ocrVisionAlignment', 'fidelity:lowOcrAccuracy', 'fidelity:lowOcrConfidence'],
      checkerCannot: 'The page is a scan. Text recognition misread some words, and AlloFlow corrected them from a second reading. It cannot be certain every correction matches the paper.',
      question: 'Do the corrected words match the scanned page?',
      options: [
        { id: 'fine', settles: true, label: 'They match', choose: 'The listed corrections match what the scan shows.', then: 'Record it as checked.' },
        { id: 'fix', label: 'A word is wrong', choose: 'A name, number or word does not match the scan.', then: 'Correct it from the scan, then run the check again.' },
        UNSURE],
      lesson: { steps: ['Check names, numbers and dates first.', 'Zoom into the scan where the corrected word sits.'], fine: '"normaI" was corrected to "normal".', fix: 'A corrected date that does not match the scan  ->  fix it.' }
    },
    {
      id: 'fillable-form', title: 'A fillable form became a page you cannot type into', wcag: ['4.1.2'],
      match: ['fidelity:formFields'],
      checkerCannot: 'The original is a fillable PDF form. The accessible HTML shows the questions clearly but cannot be typed into, and AlloFlow cannot know how families will fill it in.',
      question: 'Will people need to fill this in, and how?',
      options: [
        { id: 'reading', settles: true, label: 'Reading copy is enough', choose: 'People read it, or fill in a paper copy, or answer another way.', then: 'Share the accessible HTML as the reading copy.' },
        { id: 'fillable', label: 'A fillable version is needed', choose: 'People must type into it.', then: 'Offer the original fillable PDF as well, or ask whoever owns the form for an accessible fillable version or an online form.' },
        UNSURE],
      lesson: { steps: ['An accessible form needs labelled fields a screen reader announces.', 'The HTML here is a reading version; it does not replace the form itself.'], fine: 'A permission slip families print and sign.', fix: 'An online enrollment form  ->  needs an accessible fillable version.' }
    },
    {
      id: 'active-content', title: 'Scripts or attached files in the original', wcag: [],
      match: ['fidelity:activeContent', 'delivery:active_content_requires_review'],
      checkerCannot: 'The original PDF contains scripts, launch actions or attached files. AlloFlow never runs or opens them, so it cannot say what they do or whether anyone needs them.',
      question: 'Does anyone need what these do?',
      options: [
        { id: 'fine', settles: true, label: 'No, the HTML is enough', choose: 'They are form helpers (date or phone formatting) or extras nobody uses.', then: 'Share the accessible HTML; it carries no active content.' },
        { id: 'fix', label: 'Yes, ask the author', choose: 'The document depends on them (a calculator, an attachment people must open).', then: 'Ask whoever made the PDF for a version without them, or for the attachment as its own file.' },
        UNSURE],
      lesson: { steps: ['Fillable forms often contain small scripts that format dates or phone numbers.', 'Attachments (like printer settings files) are usually leftovers from how the PDF was made.'], fine: 'An embedded "Press Quality.joboptions" printer settings file.', fix: 'A budget workbook attached inside the PDF that people need  ->  share it separately.' }
    },
    {
      id: 'image-description', title: 'Does the image description fit the image?', wcag: ['1.1.1'],
      match: ['ai:alt-quality', 'ai:image-alt', 'fidelity:altQuality'],
      checkerCannot: 'Only someone who knows why the image is in the document can say whether its description gives a reader what they need.',
      question: 'Does the description say what matters about this image for this document?',
      options: [
        { id: 'fine', settles: true, label: 'It fits', choose: 'It says what the image shows that matters here.', then: 'Record it as fine.' },
        { id: 'rewrite', label: 'Rewrite it', choose: 'It is vague ("image"), wrong, or describes looks instead of purpose.', then: 'Rewrite it in the image review panel, then run the check again.' },
        { id: 'decorative', label: 'It is decorative', choose: 'A border, divider or clip art that adds nothing.', then: 'Mark it decorative so screen readers skip it.' },
        UNSURE],
      lesson: { steps: ['Purpose first: why is the image here?', 'Charts: the trend and the key values.', 'Pictures of text: the text itself.', 'Decoration: an empty description, so screen readers skip it.'], fine: 'Photo: students measuring rainfall in a jar.', fix: 'image001.png  ->  Map of the district\'s five school zones.' }
    },
    {
      id: 'link-wording', title: 'Can you tell where a link goes from its words?', wcag: ['2.4.4'],
      match: ['ai:link-text', 'ai:link-purpose', 'fidelity:links'],
      checkerCannot: 'Screen-reader users often list all links on a page. The checker cannot tell whether "click here" or a bare web address makes sense out of context.',
      question: 'Read only the link\'s words: do you know where it goes?',
      options: [
        { id: 'fine', settles: true, label: 'Yes', choose: 'The words name the destination ("Apply for free meals").', then: 'Record it as fine.' },
        { id: 'rewrite', label: 'Reword the link', choose: '"Click here", "more", or a long address with no description.', then: 'Change the link words to name the destination (Workbench or edit), then run the check again.' },
        UNSURE],
      lesson: { steps: ['Read the link words on their own.', 'Name the destination or the action.', 'A printed web address can stay, next to a descriptive link.'], fine: 'Read the full board policy.', fix: 'Click here  ->  Register for the open house.' }
    }
  ];
  // (2026-10-28) WCAG 2.1 success criteria the guides cite: name, level and the W3C "Understanding" page slug. WCAG 2.1 AA is
  // the standard the 2024 ADA Title II rule names for public schools; the URLs match the review list's "Learn more" links.
  var WCAG = {
    '1.1.1': ['Non-text Content', 'A', 'non-text-content'],
    '1.3.1': ['Info and Relationships', 'A', 'info-and-relationships'],
    '1.3.2': ['Meaningful Sequence', 'A', 'meaningful-sequence'],
    '1.3.3': ['Sensory Characteristics', 'A', 'sensory-characteristics'],
    '1.4.1': ['Use of Color', 'A', 'use-of-color'],
    '2.1.1': ['Keyboard', 'A', 'keyboard'],
    '2.4.4': ['Link Purpose (In Context)', 'A', 'link-purpose-in-context'],
    '2.4.6': ['Headings and Labels', 'AA', 'headings-and-labels'],
    '4.1.2': ['Name, Role, Value', 'A', 'name-role-value']
  };
  function wcagRefs(list) {
    return (Array.isArray(list) ? list : []).filter(function (sc) { return WCAG[sc]; }).map(function (sc) {
      return { sc: sc, name: WCAG[sc][0], level: WCAG[sc][1], url: 'https://www.w3.org/WAI/WCAG21/Understanding/' + WCAG[sc][2] + '.html' };
    });
  }
  var ACCURACY = 'Not a WCAG rule. This is about accuracy: an accessible copy has to say what the original says, or the people who rely on it get different information.';
  var NO_WCAG = {
    'changed-numbers': ACCURACY, 'missing-words': ACCURACY, 'scan-corrections': ACCURACY,
    'active-content': 'Not a single WCAG rule. This is about whether the accessible copy can do everything the original does.'
  };
  // Practice items for professional development (catalog/pd, built by dev-tools/build_remediation_judgment_pd.cjs).
  // Each is a short case like the documents seen in real runs; answer is an option id (never 'unsure'), and why is the
  // feedback shown after answering. Keep each guide's answers mixed so "it needs a change" is not always right.
  var PRACTICE = {
    'sensory-words': [
      { scenario: 'A budget summary says: "Special education was the largest share of new spending."', answer: 'fine', why: '"Largest" is about the amount, not how anything looks on the page.' },
      { scenario: 'A worksheet says: "Write your answers in the box on the right."', answer: 'reword', why: 'Someone using a screen reader cannot tell which box is "on the right". Name it: "Write your answers in the Answers box."' },
      { scenario: 'A district notice says: "The steps below explain how to ask for an evaluation."', answer: 'fine', why: '"Below" means the text that comes next, and a screen reader reaches that text next.' }
    ],
    'colour-only': [
      { scenario: 'A quiz key says "Correct answers are shown in green." The answers have no other mark.', answer: 'fix', why: 'Colour is the only signal. Add a word or symbol, such as "(correct)" or a check mark.' },
      { scenario: 'A newsletter prints its section headings in blue. Each heading is also larger, bold, and names the section.', answer: 'fine', why: 'The colour is decoration; the words and the heading structure carry the meaning.' }
    ],
    'heading-or-emphasis': [
      { scenario: 'A lab sheet has the bold line "Materials", followed by a list of supplies.', answer: 'heading', why: 'It names a section, so screen reader users should be able to jump to it like any heading.' },
      { scenario: 'A permission slip has the bold label "Due:" followed by a date on the same line.', answer: 'fine', why: 'It is a label inside a sentence, not the name of a section.' }
    ],
    'quotation': [
      { scenario: 'An English handout sets apart a four-line passage from a novel, with the author named after it.', answer: 'quote', why: 'It is a passage quoted from a source. Marking it as a quotation tells screen reader users where it starts and ends.' },
      { scenario: 'A how-to sheet says: Select "Submit" when you are done.', answer: 'fine', why: 'The quotation marks show a button label, not a quotation.' }
    ],
    'list-or-paragraphs': [
      { scenario: 'A syllabus has five lines that each start with a dash: textbook, calculator, lab notebook, goggles, folder.', answer: 'list', why: 'These items belong together. As a list, a screen reader announces "list, 5 items" and the reader knows what to expect.' },
      { scenario: 'A letter ends with the school address on three short lines.', answer: 'fine', why: 'An address is not a list of items; separate lines are fine.' }
    ],
    'download-link': [
      { scenario: 'In the accessible copy, pressing Enter on "Download the form" opens a "page not found" message.', answer: 'fix', why: 'The link does not work. Correct the address from the original, or remove the link and say where to get the form.' },
      { scenario: 'Tab reaches "Download the permission slip (PDF)" and Enter opens the same file the original linked.', answer: 'fine', why: 'It works with the keyboard and says where it goes.' }
    ],
    'long-image-description': [
      { scenario: 'A 300-character description of the school logo describes its colours, its font and the swirl around the letters.', answer: 'shorten', why: 'A logo needs its name ("Riverside School logo"), not its appearance.' },
      { scenario: 'A 250-character description of a bar chart gives the riders on each of the four bus routes. The numbers appear nowhere else.', answer: 'fine', why: 'The chart carries information that is not in the text, so the long description is doing real work.' }
    ],
    'blockquote-indent': [
      { scenario: 'A paragraph of instructions was indented only to line up with a picture, and it is marked as a quotation.', answer: 'fix', why: 'It is ordinary text. As a quotation, a screen reader announces a quote that is not there.' },
      { scenario: 'An indented paragraph is a passage from the state law, with the citation after it.', answer: 'fine', why: 'Someone else\'s words, set apart from the text: a real quotation.' }
    ],
    'changed-numbers': [
      { scenario: 'The flagged values are 1, 2, 3 and 4. In the original they are the page numbers at the bottom of each page.', answer: 'fine', why: 'Page numbers are left out on purpose; the content did not change.' },
      { scenario: 'The original says the meeting is on March 14. The accessible copy says March 4.', answer: 'fix', why: 'A date changed. Correct it from the original before sharing.' }
    ],
    'missing-words': [
      { scenario: 'The flagged words are "Page 3 of 8", the footer printed on each page of the original.', answer: 'fine', why: 'Page footers are left out on purpose; nothing a reader needs is lost.' },
      { scenario: 'Answer choice B of question 4 ("12 hours") is not in the accessible copy.', answer: 'fix', why: 'A reader would see only three choices. Add the missing choice from the original.' }
    ],
    'reading-order': [
      { scenario: 'The original had two columns. The accessible copy reads the whole left column, then the right, and each article reads in order.', answer: 'fine', why: 'That is the order a sighted reader would follow.' },
      { scenario: 'On a form, the instructions for section B now come after the section B questions.', answer: 'fix', why: 'Someone listening would answer the questions before hearing how. Move the instructions before the questions.' }
    ],
    'picture-placement': [
      { scenario: 'A photo of the science fair winners sits under the caption "Cafeteria menu".', answer: 'fix', why: 'The picture and caption do not match. Move the photo to its own caption.' },
      { scenario: 'Each picture in a recipe handout sits next to the step it shows, and matches its caption.', answer: 'fine', why: 'Every picture is where the original put it.' }
    ],
    'scan-corrections': [
      { scenario: 'The scan shows "Mr. Okafor". The corrected text says "Mr. Okafar".', answer: 'fix', why: 'The correction got a name wrong. Fix it from the scan.' },
      { scenario: 'A correction changed "rn eeting" to "meeting", which matches the scan.', answer: 'fine', why: 'The correction matches what the page shows.' }
    ],
    'fillable-form': [
      { scenario: 'A field trip notice had fillable boxes, but families sign and return a paper copy.', answer: 'reading', why: 'Nobody needs to type into it, so an accessible reading copy is enough.' },
      { scenario: 'Staff must send an absence request by typing into the form and emailing it.', answer: 'fillable', why: 'People must type into it. Offer the original fillable PDF too, or ask whoever owns the form for an accessible fillable version.' }
    ],
    'active-content': [
      { scenario: 'The original PDF has a script that only formats the phone number field as people type.', answer: 'fine', why: 'A formatting helper; the HTML copy does the job without it.' },
      { scenario: 'The original PDF carries an attached spreadsheet that families must fill in and return.', answer: 'fix', why: 'People need the attachment, and the HTML copy does not include it. Ask the author for an accessible version.' }
    ],
    'image-description': [
      { scenario: 'A photo of the new bus loop has the description "image1.png".', answer: 'rewrite', why: 'A file name tells a reader nothing. Say what the photo shows that matters.' },
      { scenario: 'A row of clip-art stars separates two sections of a newsletter.', answer: 'decorative', why: 'It adds nothing a reader needs, so screen readers should skip it.' },
      { scenario: 'A map has the description "Map: the drop-off loop is on Elm Street, behind the gym."', answer: 'fine', why: 'It gives what the map is for: where the drop-off loop is.' }
    ],
    'link-wording': [
      { scenario: 'A notice says: "To apply for free meals, click here."', answer: 'rewrite', why: '"Click here" says nothing when read alone. Make the link words "Apply for free meals".' },
      { scenario: 'A link reads "Free and reduced-price meal application".', answer: 'fine', why: 'The words name where the link goes.' }
    ]
  };
  GUIDES.forEach(function (g) {
    g.wcagRefs = wcagRefs(g.wcag);
    if (NO_WCAG[g.id]) g.wcagNote = NO_WCAG[g.id];
    g.practice = PRACTICE[g.id] || [];
  });
  var BY_KEY = {};
  GUIDES.forEach(function (g) { g.match.forEach(function (k) { BY_KEY[k] = g; }); });
  function guideFor(source, id) { return BY_KEY[String(source) + ':' + String(id)] || null; }
  function guideById(id) { for (var i = 0; i < GUIDES.length; i++) if (GUIDES[i].id === id) return GUIDES[i]; return null; }
  // The guides a finished run needs, each with the findings it covers: ea review rule ids, fidelity note kinds,
  // AI audit rule ids and the tagged-PDF withhold code. Plain data (JSON-safe) for reports.
  function guidesForRun(input) {
    var o = input || {}, out = [], seen = {};
    var add = function (source, id, finding) {
      var g = guideFor(source, id);
      if (!g) return;
      if (!seen[g.id]) { seen[g.id] = { guide: g, findings: [] }; out.push(seen[g.id]); }
      var key = source + ':' + id;
      if (seen[g.id].findings.indexOf(key) === -1) seen[g.id].findings.push(key);
    };
    (o.equalAccess || []).forEach(function (id) { add('equalAccess', id); });
    (o.fidelity || []).forEach(function (id) { add('fidelity', id); });
    (o.ai || []).forEach(function (id) { add('ai', id); });
    if (o.withhold) add('delivery', String(o.withhold).replace(/ \(.*$/, ''));
    return out.map(function (x) { var g = Object.assign({ findings: x.findings }, JSON.parse(JSON.stringify(x.guide))); delete g.practice; return g; });
  }
  // (2026-10-28, phase 3) Where a phrase or number sits in the ORIGINAL: page number and the words around it, so a
  // person sees how the source read without opening it. pages: [{ pageNum, text }] (the run's ground-truth page map).
  // Numbers match whole numbers only ("16" never inside "2016" or "16.5"); words match case-insensitively with
  // whitespace collapsed. Returns up to `limit` hits: { page, before, match, after }.
  function sourceContext(pages, needle, limit) {
    var max = Math.max(1, Math.min(Number(limit) || 2, 5)), out = [];
    var n = String(needle == null ? '' : needle).replace(/\s+/g, ' ').trim();
    if (!Array.isArray(pages) || !n || n.length > 200) return out;
    var esc = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+');
    var re = /^[\d.,%$]+$/.test(n) ? new RegExp('(?<![\\d.,])' + esc + '(?![\\d]|[.,]\\d)', 'g') : new RegExp(esc, 'gi');
    for (var i = 0; i < pages.length && out.length < max; i++) {
      var pg = pages[i], text = String((pg && pg.text) || '').replace(/\s+/g, ' ');
      re.lastIndex = 0;
      var m;
      while (out.length < max && (m = re.exec(text))) {
        var s = Math.max(0, m.index - 70), e = Math.min(text.length, m.index + m[0].length + 70);
        out.push({ page: Number(pg.pageNum) || i + 1, before: (s > 0 ? '\u2026' : '') + text.slice(s, m.index).replace(/^\S*\s/, s > 0 ? '' : '$&'), match: m[0], after: text.slice(m.index + m[0].length, e).replace(/\s\S*$/, e < text.length ? '' : '$&') + (e < text.length ? '\u2026' : '') });
        if (m[0].length === 0) re.lastIndex++;
      }
    }
    return out;
  }
  return { version: 1, guides: GUIDES, guideFor: guideFor, guideById: guideById, guidesForRun: guidesForRun, unsureOption: UNSURE, sourceContext: sourceContext, wcagRefs: wcagRefs };
});
