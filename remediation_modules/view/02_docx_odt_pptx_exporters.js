// _htmlToDocxSpec: pure HTML → block-spec transformer. Deliberately free of
// docx-library types so it stays unit-testable headlessly —
// tests/view_pdf_audit_docx_spec.test.js extracts this function at runtime
// (anti-drift pattern); keep the "// end _htmlToDocxSpec" marker intact.
function _htmlToStructuredText(html, markdown) {
  const opts = arguments.length > 2 ? arguments[2] : undefined;
  // Self-contained inside _htmlToStructuredText (extracted standalone by structured_text_export / wave4_6 tests).
  const _chosenSelectText = (sel) => {
    if (!sel) return '';
    const opts = sel.options ? Array.from(sel.options) : Array.from(sel.querySelectorAll('option'));
    const selOpt = sel.selectedOptions && sel.selectedOptions[0];
    const hasVal = (o) => o && !o.disabled && String(o.getAttribute && o.getAttribute('value') != null ? o.getAttribute('value') : (o.value != null ? o.value : o.textContent || '')).trim() !== '';
    const chosen = (hasVal(selOpt) ? selOpt : null) || opts.find((o) => (o.selected || o.hasAttribute('selected')) && hasVal(o)) || null;
    return chosen ? String(chosen.textContent || chosen.value || '').replace(/\s+/g, ' ').trim() : '';
  };
  const _chromeSel = '.alloflow-cloze-controls,.alloflow-cs-controls,.alloflow-cs-actions,.alloflow-venn-controls,.alloflow-venn-status,.alloflow-venn-place-button,.alloflow-venn-screen-instructions,.alloflow-tl-controls,.alloflow-tl-arrows,.alloflow-glossary-controls,.alloflow-glossary-card-controls,.alloflow-glossary-card-actions,.alloflow-glossary-card-status,.alloflow-gm-controls,.alloflow-gm-status,.alloflow-faq-controls,.alloflow-dir-controls,.alloflow-cornell-controls,.alloflow-ws-controls,.alloflow-quiz-feedback,.alloflow-quiz-check-btn,.alloflow-math-symbolbar,.alloflow-math-symbar,.alloflow-math-controls,.alloflow-dbq-evidence-tracker,.alloflow-export-save-tools,.alloflow-save-status';
  const doc = new DOMParser().parseFromString(html || '', 'text/html');
  doc.querySelectorAll('.alloflow-venn-activity').forEach((act) => {
    if (act.querySelector('.alloflow-venn-card')) {
      act.querySelectorAll('.alloflow-venn-print-only, .alloflow-venn-screen-instructions').forEach((el) => el.remove());
      act.querySelectorAll('.alloflow-venn-card').forEach((card) => {
        const btn = card.querySelector('button.alloflow-venn-card-button');
        if (!btn) return;
        const sel = card.querySelector('select.alloflow-venn-response');
        const chosenText = _chosenSelectText(sel);
        const p = doc.createElement('p');
        p.className = 'alloflow-venn-card-text';
        p.textContent = (btn.textContent || '').replace(/\s+/g, ' ').trim() + (chosenText ? ' — ' + chosenText : '');
        btn.replaceWith(p);
        if (sel) sel.remove();
      });
    }
  });
  doc.querySelectorAll('select[hidden]').forEach((sel) => {
    const chosenText = _chosenSelectText(sel);
    if (chosenText) sel.replaceWith(doc.createTextNode(' \u2014 ' + chosenText));
    else sel.remove();
  });
  if (!(opts && opts.includeTeacherOnly)) {
    const _teacherSel = typeof _ALLO_TEACHER_ONLY_SEL === 'string'
      ? _ALLO_TEACHER_ONLY_SEL
      : '.teacher-view,[data-allo-teacher-only],[data-teacher-only],.teacher-only,.answer-key,.alloflow-teacher-copy-banner,.alloflow-cs-answer-key,.alloflow-glossary-worksheet-key,.alloflow-math-solution,.alloflow-fluency-key,.alloflow-teacher-plan,.alloflow-teacher-annotations,.alloflow-teacher-annotations-by-resource,.alloflow-gm-check-btn,.alloflow-gm-feedback,.alloflow-match-check-btn,.alloflow-match-feedback,.alloflow-teacher-notes,.alloflow-rubric-key,.alloflow-model-answer,.alloflow-sample-response,.alloflow-scoring-guide,#alloflow-interactive-object-profile,[data-teacher-note],[data-answer-key]';
    doc.querySelectorAll(_teacherSel).forEach((el) => el.remove());
  }
  doc.querySelectorAll('button.alloflow-inline-term').forEach((btn) => btn.replaceWith(doc.createTextNode(btn.textContent || '')));
  doc.querySelectorAll('.alloflow-reading-tools-shell,.alloflow-hud-bar,#alloflow-step-pager,#alloflow-term-popover,.alloflow-term-popover,.alloflow-export-prompt-overlay,.alloflow-save-bar,.alloflow-turnin-bar,.alloflow-keycap,.alloflow-inline-chart svg,.alloflow-glossary-card-actions,.alloflow-glossary-card-controls,.alloflow-glossary-progress,.alloflow-quiz-feedback,annotation,annotation-xml,[data-allo-footnote-backlink],details.allo-math-source,details.allo-chart-data > summary,details.allo-image-desc > summary,button,[hidden],[aria-hidden="true"],del[data-allo-change-id],[data-allo-change-kind="structure-delete"],' + _chromeSel).forEach((el) => el.remove());
  const _cleanSp = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const _mathAtom = (s) => (/^[A-Za-z0-9.]+$/.test(s) ? s : '(' + s + ')');
  const _mathScript = (s) => (/^-?[A-Za-z0-9]+$/.test(s) ? s : '(' + s + ')');
  const _walkMath = (node) => {
    if (!node) return '';
    if (node.nodeType === 3) return String(node.textContent || '');
    if (node.nodeType !== 1) return '';
    const t = String(node.tagName || '').toLowerCase();
    if (t === 'annotation' || t === 'annotation-xml') return '';
    const ch = Array.from(node.children || []);
    if (t === 'mfrac' && ch.length >= 2) {
      const n = _cleanSp(_walkMath(ch[0]));
      const d = _cleanSp(_walkMath(ch[1]));
      return (n && d) ? _mathAtom(n) + '/' + _mathAtom(d) : _cleanSp(n + ' ' + d);
    }
    if (t === 'msup' && ch.length >= 2) {
      const b = _cleanSp(_walkMath(ch[0]));
      const e = _cleanSp(_walkMath(ch[1]));
      return b ? _mathAtom(b) + '^' + _mathScript(e) : e;
    }
    if (t === 'msub' && ch.length >= 2) {
      const b = _cleanSp(_walkMath(ch[0]));
      const s = _cleanSp(_walkMath(ch[1]));
      return b ? _mathAtom(b) + '_' + _mathScript(s) : s;
    }
    if (t === 'msubsup' && ch.length >= 3) {
      const b = _cleanSp(_walkMath(ch[0]));
      const s = _cleanSp(_walkMath(ch[1]));
      const e = _cleanSp(_walkMath(ch[2]));
      return b ? _mathAtom(b) + '_' + _mathScript(s) + '^' + _mathScript(e) : '';
    }
    if (t === 'msqrt') {
      const inner = _cleanSp(Array.from(node.childNodes || []).map(_walkMath).join(''));
      return inner ? 'sqrt(' + inner + ')' : '';
    }
    if (t === 'mroot' && ch.length >= 2) {
      const b = _cleanSp(_walkMath(ch[0]));
      const idx = _cleanSp(_walkMath(ch[1]));
      return (b && idx) ? 'root(' + idx + ', ' + b + ')' : _cleanSp(b);
    }
    return Array.from(node.childNodes || []).map(_walkMath).join('');
  };
  doc.querySelectorAll('math').forEach((mathEl) => {
    const aria = _cleanSp(mathEl.getAttribute('aria-label') || mathEl.getAttribute('alttext') || '');
    const latex = _cleanSp(mathEl.getAttribute('data-allo-latex') || '');
    const readable = aria || _cleanSp(_walkMath(mathEl)) || latex;
    mathEl.replaceWith(doc.createTextNode(readable ? ' ' + readable + ' ' : ''));
  });
  if (typeof _replaceAccessibleMathAndSvgForSpeech === 'function') {
    _replaceAccessibleMathAndSvgForSpeech(doc.body || doc, { doc, includeTeacherOnly: true });
  } else {
    doc.querySelectorAll('svg').forEach((svgEl) => {
      if (svgEl.closest && svgEl.closest('.alloflow-inline-chart')) { svgEl.remove(); return; }
      if (svgEl.getAttribute('aria-hidden') === 'true' || svgEl.getAttribute('role') === 'presentation' || svgEl.getAttribute('role') === 'none') { svgEl.remove(); return; }
      const label = _cleanSp(svgEl.getAttribute('aria-label') || Array.from(svgEl.querySelectorAll('title, desc')).map((n) => (n.textContent || '').trim()).filter(Boolean).join('. '));
      if (label) svgEl.replaceWith(doc.createTextNode(' ' + label + ' '));
      else svgEl.remove();
    });
  }
  const lines = [];
  const mdTick = String.fromCharCode(96);
  const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const inline = (node) => {
    if (!node) return '';
    if (node.nodeType === 3) return node.textContent || '';
    if (node.nodeType !== 1) return '';
    const tag = node.tagName.toLowerCase();
    if (tag === 'br') return '\n';
    if (tag === 'table' || tag === 'ul' || tag === 'ol') return '';
    if (tag === 'img') {
      const alt = clean(node.getAttribute('alt'));
      return alt ? '[Image: ' + alt + ']' : '';
    }
    if (tag === 'input') {
      const type = (node.getAttribute('type') || 'text').toLowerCase();
      if (type === 'checkbox' || type === 'radio') return node.checked || node.hasAttribute('checked') ? '[x]' : '[ ]';
      return node.value || node.getAttribute('value') || node.getAttribute('placeholder') || '________';
    }
    if (tag === 'textarea') {
      return String(node.value || node.textContent || '').trim() || '________';
    }
    if (tag === 'select') {
      return _chosenSelectText(node) || '________';
    }
    let text = Array.from(node.childNodes || []).map(inline).join('');
    if (tag === 'sup') {
      const st = clean(text);
      return st ? '^' + (/^[A-Za-z0-9]+$/.test(st) ? st : '(' + st + ')') : '';
    }
    if (tag === 'sub') {
      const st = clean(text);
      return st ? '_' + (/^[A-Za-z0-9]+$/.test(st) ? st : '(' + st + ')') : '';
    }
    if (markdown && tag === 'a' && node.getAttribute('href')) {
      const _rawHref = String(node.getAttribute('href') || '').trim();
      const _safeMdHref = /^#[^\s]*$/.test(_rawHref) ? _rawHref : _viewSafeHttpUrl(_rawHref);
      if (_safeMdHref) text = '[' + (text || _safeMdHref) + '](' + _safeMdHref.replace(/([()\\])/g, '\\$1') + ')';
    }
    if (markdown && (tag === 'strong' || tag === 'b')) text = '**' + text + '**';
    if (markdown && (tag === 'em' || tag === 'i')) text = '*' + text + '*';
    if (markdown && tag === 'code') text = mdTick + text.split(mdTick).join('\\' + mdTick) + mdTick;
    if (markdown && (tag === 'del' || tag === 's')) text = '~~' + text + '~~';
    return text;
  };
  const emitTable = (table) => {
    const caption = Array.from(table.children || []).find((node) => node.tagName === 'CAPTION');
    if (caption) lines.push((markdown ? '**' : '') + clean(inline(caption)) + (markdown ? '**' : ''), '');
    const rowNodes = Array.from(table.querySelectorAll('tr')).filter((tr) => tr.closest('table') === table);
    const cellValue = (cell) => {
      let value = String(inline(cell) || '').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, markdown ? '<br>' : ' / ').trim();
      if (markdown) value = value.replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
      return value;
    };
    const rows = rowNodes.map((tr) => Array.from(tr.children).filter((cell) => /^(TH|TD)$/.test(cell.tagName)).map(cellValue));
    if (rows.length && markdown) {
      const hasHeader = Array.from(rowNodes[0].children || []).some((cell) => cell.tagName === 'TH');
      const header = hasHeader ? rows[0] : rows[0].map(() => '');
      lines.push('| ' + header.join(' | ') + ' |', '| ' + header.map(() => '---').join(' | ') + ' |');
      (hasHeader ? rows.slice(1) : rows).forEach((row) => lines.push('| ' + row.join(' | ') + ' |'));
    } else rows.forEach((row) => lines.push(row.join('\t')));
    lines.push('');
    Array.from(table.querySelectorAll('table')).filter((nested) => nested !== table && nested.parentElement.closest('table') === table).forEach(emitTable);
  };
  const emitList = (list, depth) => {
    const ordered = list.tagName === 'OL';
    const startAt = ordered ? (parseInt(list.getAttribute('start'), 10) || 1) : 1;
    const items = Array.from(list.children || []).filter((item) => item.tagName === 'LI');
    items.forEach((item, index) => {
      const own = Array.from(item.childNodes || []).filter((node) => !(node.nodeType === 1 && /^(UL|OL|TABLE)$/.test(node.tagName))).map(inline).join('');
      lines.push('  '.repeat(depth || 0) + (ordered ? (startAt + index) + '. ' : '- ') + clean(own));
      Array.from(item.children || []).filter((node) => /^(UL|OL)$/.test(node.tagName)).forEach((nested) => emitList(nested, (depth || 0) + 1));
      Array.from(item.children || []).filter((node) => node.tagName === 'TABLE').forEach(emitTable);
    });
    if (!(depth || 0)) lines.push('');
  };
  const visit = (child, depth) => {
    if (!child || child.nodeType !== 1) return;
    const tag = child.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style' || tag === 'title') return;
    if (/^h[1-6]$/.test(tag)) lines.push((markdown ? '#'.repeat(Number(tag[1])) + ' ' : '') + clean(inline(child)), '');
    else if (tag === 'p') lines.push(clean(inline(child)), '');
    else if (tag === 'blockquote') lines.push((markdown ? '> ' : '') + clean(inline(child)), '');
    else if (tag === 'figcaption') lines.push((markdown ? '*' : '') + clean(inline(child)) + (markdown ? '*' : ''), '');
    else if (tag === 'summary') lines.push((markdown ? '**' : '') + clean(inline(child)) + (markdown ? '**' : ''), '');
    else if (tag === 'dt') lines.push((markdown ? '**' : '') + clean(inline(child)) + (markdown ? '**' : ''));
    else if (tag === 'dd') lines.push((markdown ? ': ' : '  ') + clean(inline(child)), '');
    else if (tag === 'ul' || tag === 'ol') emitList(child, depth || 0);
    else if (tag === 'table') emitTable(child);
    else if (tag === 'img') { const value = clean(inline(child)); if (value) lines.push(value, ''); }
    else if (tag === 'pre') { const value = String(child.textContent || '').replace(/^\s+|\s+$/g, ''); if (value) lines.push(markdown ? mdTick.repeat(3) + 'text\n' + value + '\n' + mdTick.repeat(3) : value, ''); }
    else if (tag === 'hr') lines.push(markdown ? '---' : '----------', '');
    else if (tag === 'details' && child.classList.contains('allo-math-source')) return;
    else {
      let pending = '';
      const flush = () => { const value = clean(pending); if (value) lines.push(value, ''); pending = ''; };
      for (const node of Array.from(child.childNodes || [])) {
        if (node.nodeType === 1 && /^(H[1-6]|P|BLOCKQUOTE|FIGCAPTION|SUMMARY|DT|DD|UL|OL|TABLE|IMG|PRE|HR|DETAILS|DIV|SECTION|ARTICLE|MAIN|ASIDE|NAV|FIGURE|DL)$/.test(node.tagName)) { flush(); visit(node, depth || 0); }
        else pending += inline(node);
      }
      flush();
    }
  };
  const walk = (node, depth) => {
    let pending = '';
    const flush = () => { const value = clean(pending); if (value) lines.push(value, ''); pending = ''; };
    for (const child of Array.from(node.childNodes || [])) {
      if (child.nodeType === 1) { flush(); visit(child, depth || 0); }
      else pending += child.textContent || '';
    }
    flush();
  };
  walk(doc.body || doc.documentElement, 0);
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
function _htmlToPlainTextExport(html) { return _htmlToStructuredText(html, false); }
function _htmlToMarkdownExport(html) { return _htmlToStructuredText(html, true); }

function _htmlToDocxSpec(html) {
  const _cleanXml = (s) => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '');
  const doc = new DOMParser().parseFromString(html || '', 'text/html');
  const title = _cleanXml(((doc.querySelector('title') || {}).textContent) || ((doc.querySelector('h1') || {}).textContent) || 'Accessible document').trim().slice(0, 200) || 'Accessible document';
  const lang = (doc.documentElement.getAttribute('lang') || 'en').trim() || 'en';
  // RTL capture (export-format review #2, 2026-07-01): the pipeline sets dir="rtl" on the
  // accessible HTML for RTL languages, but the export spec never carried it — Arabic/
  // Hebrew/Urdu DOCX/ODT/DAISY shipped left-to-right (visually inverted, semantically
  // wrong for AT). Prefer the document's explicit dir; fall back to an RTL-language
  // prefix check so a doc whose dir attribute was lost in transit still exports right.
  const _dirAttr = ((doc.documentElement.getAttribute('dir') || (doc.body && doc.body.getAttribute('dir')) || '') + '').toLowerCase();
  const rtl = _dirAttr === 'rtl' || (_dirAttr !== 'ltr' && /^(ar|he|iw|fa|ur|ps|sd|ug|yi|dv|ckb)([-_]|$)/i.test(lang));
  const blocks = [];
  const counts = { headings: 0, paragraphs: 0, images: 0, tables: 0, lists: 0, links: 0 };
  // Footnotes (2026-06-14, A6): each note's data-fn-uid or id → a Word footnote id, plus
  // its definition runs. Populated just before the walk; then the in-text anchors
  // emit a FootnoteReferenceRun instead of a superscript number, and the
  // end-of-doc notes section is skipped (it becomes Word's NATIVE footnote area,
  // not a trailing list). Declared early so inlineRuns can close over the map.
  const _fnIdByUid = {};
  const _fnIdByHref = {};
  const _fnDefs = {};
  const SKIP = { SCRIPT: 1, STYLE: 1, BUTTON: 1, AUDIO: 1, VIDEO: 1, TEMPLATE: 1, NOSCRIPT: 1, IFRAME: 1, CANVAS: 1 };
  const _INLINE_TERM_RE = /\balloflow-inline-term\b/;
  const _isInlineTermBtn = (el) => !!(el && el.tagName === 'BUTTON' && _INLINE_TERM_RE.test((el.className && String(el.className)) || (el.getAttribute && el.getAttribute('class')) || ''));
  const _CHROME_CLS_RE = /allo-block-controls|allo-block-remove|allo-img-controls|allo-file-btn|alloflow-reading-tools-shell|alloflow-hud-bar|alloflow-step-pager|alloflow-term-popover|alloflow-export-prompt-overlay|alloflow-save-bar|alloflow-turnin-bar|alloflow-keycap|alloflow-quiz-feedback|alloflow-quiz-check-btn|alloflow-save-status|alloflow-cloze-controls|alloflow-venn-controls|alloflow-venn-status|alloflow-venn-place-button|alloflow-venn-screen-instructions|alloflow-cs-controls|alloflow-cs-actions|alloflow-tl-controls|alloflow-tl-arrows|alloflow-glossary-controls|alloflow-glossary-card-controls|alloflow-glossary-card-actions|alloflow-glossary-card-status|alloflow-gm-controls|alloflow-gm-status|alloflow-faq-controls|alloflow-dir-controls|alloflow-cornell-controls|alloflow-ws-controls|alloflow-math-symbolbar|alloflow-math-symbar|alloflow-math-controls|alloflow-dbq-evidence-tracker|alloflow-export-save-tools/;
  // Self-contained inside _htmlToDocxSpec (extracted standalone by wave7_10 / wave11_14 tests).
  const _readSelectedOptionText = (sel) => {
    if (!sel) return '';
    const opts = sel.options ? Array.from(sel.options) : Array.from(sel.querySelectorAll('option'));
    const selOpt = sel.selectedOptions && sel.selectedOptions[0];
    const hasVal = (o) => o && !o.disabled && String(o.getAttribute && o.getAttribute('value') != null ? o.getAttribute('value') : (o.value != null ? o.value : o.textContent || '')).trim() !== '';
    const chosen = (hasVal(selOpt) ? selOpt : null) || opts.find((o) => (o.selected || o.hasAttribute('selected')) && hasVal(o)) || null;
    return chosen ? String(chosen.textContent || chosen.value || '').replace(/\s+/g, ' ').trim() : '';
  };
  const _isControlEl = (el) => {
    if (_isInlineTermBtn(el)) return false;
    if (el && el.id === 'alloflow-term-popover') return true;
    const upperTag = String(el.tagName || '').toUpperCase();
    if (upperTag === 'ANNOTATION' || upperTag === 'ANNOTATION-XML') return true;
    if ((upperTag === 'DEL' && el.hasAttribute && el.hasAttribute('data-allo-change-id')) || (el.getAttribute && el.getAttribute('data-allo-change-kind') === 'structure-delete')) return true;
    if (upperTag === 'SELECT' && typeof el.matches === 'function' && el.matches('select.alloflow-cs-response, select.alloflow-venn-response')) return false;
    if (el.hasAttribute && (el.hasAttribute('hidden') || el.hasAttribute('data-allo-page-element') || el.hasAttribute('data-allo-footnote-backlink'))) return true;
    if (el.getAttribute && el.getAttribute('aria-hidden') === 'true') return true;
    if (upperTag === 'INPUT' && String(el.getAttribute('type') || '').toLowerCase() === 'hidden') return true;
    if (upperTag === 'SVG' && el.closest && el.closest('.alloflow-inline-chart')) return true;
    if (SKIP[upperTag]) return true;
    // allo-block editor chrome (controls, remove buttons, upload labels) is
    // interactive scaffolding, not document content.
    if (el.getAttribute && el.getAttribute('contenteditable') === 'false' && !(el.querySelector && el.querySelector('.alloflow-venn-card, .alloflow-cs-strip, input, select, textarea'))) return true;
    const cls = (el.className && String(el.className)) || '';
    return _CHROME_CLS_RE.test(cls);
  };
  const _mathReadableText = (mathEl) => {
    if (!mathEl) return '';
    const _cleanSp = (s) => _cleanXml(String(s || '')).replace(/\s+/g, ' ').trim();
    const spoken = _cleanSp(mathEl.getAttribute('aria-label') || mathEl.getAttribute('alttext') || '');
    if (spoken) return spoken;
    const _mathAtom = (s) => (/^[A-Za-z0-9.]+$/.test(s) ? s : '(' + s + ')');
    const _mathBase = (s) => (/^[A-Za-z0-9.]+$/.test(s) || Array.from(s).length === 1 ? s : '(' + s + ')');
    const _mathScript = (s) => (/^-?[A-Za-z0-9]+$/.test(s) ? s : '(' + s + ')');
    const _OVER_ACCENT = { '\u00af': 'bar', '\u203e': 'bar', '\u02c9': 'bar', '_': 'bar', '^': 'hat', '\u02c6': 'hat', '~': 'tilde', '\u02dc': 'tilde', '\u2192': 'vec', '\u20d7': 'vec', '\u02d9': 'dot', '\u00a8': 'ddot' };
    const walkMath = (node) => {
      if (!node) return '';
      if (node.nodeType === 3) return _cleanXml(node.textContent || '');
      if (node.nodeType !== 1) return '';
      const t = (node.tagName || '').toLowerCase();
      if (t === 'annotation' || t === 'annotation-xml') return '';
      if (t === 'mspace') return ' ';
      const ch = Array.from(node.children || []);
      if (t === 'mfrac' && ch.length >= 2) return '(' + _cleanSp(walkMath(ch[0])) + ')/(' + _cleanSp(walkMath(ch[1])) + ')';
      if (t === 'msup' && ch.length >= 2) {
        const b = _cleanSp(walkMath(ch[0]));
        const e = _cleanSp(walkMath(ch[1]));
        return b ? _mathAtom(b) + '^' + _mathScript(e) : e;
      }
      if (t === 'msub' && ch.length >= 2) {
        const b = _cleanSp(walkMath(ch[0]));
        const s = _cleanSp(walkMath(ch[1]));
        return b ? _mathAtom(b) + '_' + _mathScript(s) : s;
      }
      if (t === 'msubsup' && ch.length >= 3) {
        const b = _cleanSp(walkMath(ch[0]));
        const s = _cleanSp(walkMath(ch[1]));
        const e = _cleanSp(walkMath(ch[2]));
        return b ? _mathAtom(b) + '_' + _mathScript(s) + '^' + _mathScript(e) : '';
      }
      if (t === 'munderover' && ch.length >= 3) {
        const b = _cleanSp(walkMath(ch[0]));
        const u = _cleanSp(walkMath(ch[1]));
        const o = _cleanSp(walkMath(ch[2]));
        return b ? _mathBase(b) + (u ? '_' + _mathScript(u) : '') + (o ? '^' + _mathScript(o) : '') : _cleanSp(u + ' ' + o);
      }
      if (t === 'munder' && ch.length >= 2) {
        const b = _cleanSp(walkMath(ch[0]));
        const u = _cleanSp(walkMath(ch[1]));
        return (b && u) ? _mathBase(b) + '_' + _mathScript(u) : (b || u);
      }
      if (t === 'mover' && ch.length >= 2) {
        const b = _cleanSp(walkMath(ch[0]));
        const o = _cleanSp(walkMath(ch[1]));
        if (b && _OVER_ACCENT[o]) return _OVER_ACCENT[o] + '(' + b + ')';
        return (b && o) ? _mathBase(b) + '^' + _mathScript(o) : (b || o);
      }
      if (t === 'mtable') {
        const rows = ch.map((row) => {
          const rt = (row.tagName || '').toLowerCase();
          if (rt === 'mtr' || rt === 'mlabeledtr') {
            const cells = Array.from(row.children || []).map((c) => _cleanSp(walkMath(c))).filter(Boolean);
            return cells.join(', ');
          }
          return _cleanSp(walkMath(row));
        }).filter(Boolean);
        return rows.length ? '[' + rows.join('; ') + ']' : '';
      }
      if (t === 'mfenced') {
        const open = node.getAttribute('open') != null ? node.getAttribute('open') : '(';
        const close = node.getAttribute('close') != null ? node.getAttribute('close') : ')';
        const seps = Array.from(String(node.getAttribute('separators') != null ? node.getAttribute('separators') : ',').replace(/\s+/g, ''));
        const parts = ch.map((c) => _cleanSp(walkMath(c)));
        let out = '';
        for (let i = 0; i < parts.length; i++) {
          if (i > 0) { const sep = seps.length ? seps[Math.min(i - 1, seps.length - 1)] : ''; out += (sep ? sep + ' ' : ' '); }
          out += parts[i];
        }
        return open + out + close;
      }
      if (t === 'msqrt') {
        const inner = _cleanSp(Array.from(node.childNodes || []).map(walkMath).join(''));
        return inner ? 'sqrt(' + inner + ')' : '';
      }
      if (t === 'mroot' && ch.length >= 2) {
        const b = _cleanSp(walkMath(ch[0]));
        const idx = _cleanSp(walkMath(ch[1]));
        return (b && idx) ? 'root(' + idx + ', ' + b + ')' : b;
      }
      return Array.from(node.childNodes || []).map(walkMath).join('');
    };
    return _cleanSp(walkMath(mathEl)) || _cleanSp(mathEl.getAttribute('data-allo-latex') || '');
  };
  const inlineRuns = (el, fmt) => {
    fmt = fmt || {};
    const ownLang = el && el.getAttribute && (el.getAttribute('lang') || el.getAttribute('xml:lang'));
    if (ownLang && !fmt.lang) fmt = { ...fmt, lang: ownLang };
    let out = [];
    const kids = el.childNodes || [];
    for (let i = 0; i < kids.length; i++) {
      const n = kids[i];
      if (n.nodeType === 3) {
        const txt = _cleanXml(n.textContent || '').replace(/\s+/g, ' ');
        if (txt) out.push({ text: txt, bold: !!fmt.bold, italic: !!fmt.italic, underline: !!fmt.underline, strike: !!fmt.strike, highlight: !!fmt.highlight, code: !!fmt.code, lang: fmt.lang || null, link: fmt.link || null, sup: !!fmt.sup, sub: !!fmt.sub });
        continue;
      }
      if (n.nodeType !== 1 || _isControlEl(n)) continue;
      const tag = String(n.tagName || '').toUpperCase();
      // Footnote anchor (A6): a <sup class="allo-fn-ref"> or [data-allo-footnote-ref] with a mapped note
      // becomes a real Word footnote reference (auto-numbered by Word), not a
      // superscript digit. Falls through to plain superscript if unmapped.
      if (tag === 'SUP' && ((n.classList && n.classList.contains('allo-fn-ref')) || (n.hasAttribute && n.hasAttribute('data-allo-footnote-ref')))) {
        const _fuid = n.getAttribute('data-fn-uid');
        const _hrefEl = n.querySelector && n.querySelector('a[href^="#"]');
        const _fhref = (_hrefEl && _hrefEl.getAttribute('href')) || n.getAttribute('href') || (_fuid ? '#fn-' + _fuid : '');
        const _fid = (_fuid && _fnIdByUid[_fuid]) || (_fhref && _fnIdByHref[_fhref]);
        if (_fid) { out.push({ footnoteId: _fid }); continue; }
      }
      if (tag === 'A') {
        const _ahref = n.getAttribute && n.getAttribute('href');
        if (_ahref && _fnIdByHref[_ahref] && !(n.closest && n.closest('section.allo-footnotes, [data-allo-footnotes="1"]'))) {
          out.push({ footnoteId: _fnIdByHref[_ahref] });
          continue;
        }
      }
      if (tag === 'BR') { out.push({ br: true }); continue; }
      // A picture inside a table cell, list item or heading used to vanish from Word/ODT/DAISY.
      if (tag === 'IMG') {
        const _src = n.getAttribute('src') || '', _rawAlt = n.getAttribute('alt'), _role = (n.getAttribute('role') || '').toLowerCase();
        const _decorative = _role === 'presentation' || _role === 'none' || _rawAlt === '';
        const _alt = _decorative ? '' : _cleanXml(_rawAlt || '').trim(), _data = /^data:image\//.test(_src);
        if (_alt || _data) { out.push({ img: { src: _data ? _src : null, alt: _alt, decorative: _decorative, width: n.getAttribute('width'), height: n.getAttribute('height') } }); counts.images++; }
        continue;
      }
      if (tag === 'MATH') {
        const mText = _mathReadableText(n);
        if (mText) out.push({ text: ' ' + mText + ' ', bold: !!fmt.bold, italic: false, underline: false, code: false, lang: fmt.lang || null, link: null });
        continue;
      }
      // Fillable fields (INPUT/TEXTAREA/SELECT) keep filled values or visible blanks.
      if (tag === 'INPUT') {
        const inType = String(n.getAttribute('type') || 'text').toLowerCase();
        if (inType === 'checkbox' || inType === 'radio') {
          const isChecked = !!(n.checked || n.hasAttribute('checked'));
          out.push({ text: isChecked ? '☑ ' : '☐ ', bold: !!fmt.bold, italic: !!fmt.italic, underline: false, link: null });
        } else {
          const val = _cleanXml((typeof n.value === 'string' && n.value ? n.value : n.getAttribute('value')) || '').trim();
          if (val) {
            out.push({ text: ' ' + val + ' ', bold: !!fmt.bold, italic: !!fmt.italic, underline: true, lang: fmt.lang || null, link: null });
          } else {
            const _wm = (n.getAttribute('style') || '').match(/width:\s*(\d+)ch/);
            const w = Math.max(6, Math.min(40, parseInt((_wm && _wm[1]) || n.getAttribute('size') || '12', 10) || 12));
            out.push({ text: ' ' + '_'.repeat(w) + ' ', bold: false, italic: false, underline: false, link: null });
          }
        }
        continue;
      }
      if (tag === 'TEXTAREA') {
        const val = _cleanXml((typeof n.value === 'string' && n.value ? n.value : n.textContent) || '').trim();
        if (val) {
          const taLines = val.split(/\r?\n/);
          taLines.forEach((line, li) => {
            if (li > 0) out.push({ br: true });
            if (line) out.push({ text: line, bold: !!fmt.bold, italic: false, underline: false, lang: fmt.lang || null, link: null });
          });
        } else {
          out.push({ text: ' ' + '_'.repeat(24) + ' ', bold: false, italic: false, underline: false, link: null });
        }
        continue;
      }
      if (tag === 'SELECT') {
        const chosenText = _cleanXml(_readSelectedOptionText(n));
        const isHid = (n.hasAttribute && n.hasAttribute('hidden')) || (n.getAttribute && n.getAttribute('aria-hidden') === 'true') || !!(n.style && n.style.display === 'none');
        if (isHid) {
          if (chosenText) {
            out.push({ text: ' \u2014 ' + chosenText, bold: !!fmt.bold, italic: !!fmt.italic, underline: true, lang: fmt.lang || null, link: null });
          }
        } else if (chosenText) {
          out.push({ text: ' ' + chosenText + ' ', bold: !!fmt.bold, italic: !!fmt.italic, underline: true, lang: fmt.lang || null, link: null });
        } else {
          out.push({ text: ' ' + '_'.repeat(14) + ' ', bold: false, italic: false, underline: false, link: null });
        }
        continue;
      }
      const _rawAnchorHref = tag === 'A' ? String(n.getAttribute('href') || '').trim() : '';
      const _normAnchorHref = _rawAnchorHref.replace(/[\u0000-\u0020]+/g, '');
      const _safeAnchorHref = _rawAnchorHref && /^(?:https?:|mailto:|#)/i.test(_normAnchorHref) ? _rawAnchorHref : null;
      const isNewLink = !!(_safeAnchorHref && !fmt.link);
      if (isNewLink) counts.links++;
      out = out.concat(inlineRuns(n, {
        bold: fmt.bold || tag === 'B' || tag === 'STRONG',
        italic: fmt.italic || tag === 'I' || tag === 'EM',
        underline: fmt.underline || tag === 'U',
        link: fmt.link || _safeAnchorHref || null,
        // Superscript/subscript (2026-06-13): footnote anchors (<sup>),
        // exponents (x²), ordinals, and chemical formulae (H₂O) were
        // flattening to baseline in docx/pptx. Thread vertical alignment.
        sup: fmt.sup || tag === 'SUP',
        sub: fmt.sub || tag === 'SUB',
        strike: fmt.strike || tag === 'S' || tag === 'DEL',
        highlight: fmt.highlight || tag === 'MARK',
        code: fmt.code || tag === 'CODE' || tag === 'KBD' || tag === 'SAMP',
        lang: (n.getAttribute && (n.getAttribute('lang') || n.getAttribute('xml:lang'))) || fmt.lang || null,
      }));
    }
    return out;
  };
  const _runsText = (runs) => runs.map((r) => r.text || '').join('').trim();
  const pushParagraph = (runs, opts) => { if (_runsText(runs)) { blocks.push({ type: 'paragraph', runs, ...(opts && opts.hanging ? { hanging: true } : {}), ...(opts && opts.centered ? { centered: true } : {}), ...(opts && opts.indented ? { indented: true } : {}) }); counts.paragraphs++; } };
  const pushMixedParagraph = (el, opts) => {
    let pending = [];
    const flush = () => { if (pending.length) { pushParagraph(inlineRuns({ childNodes: pending }, {}), opts); pending = []; } };
    const visit = (parent) => {
      for (const child of Array.from(parent.childNodes || [])) {
        if (child.nodeType === 1 && child.tagName === 'IMG') { flush(); pushImage(child, ''); }
        else if (child.nodeType === 1 && child.querySelector && child.querySelector('img')) { flush(); visit(child); flush(); }
        else pending.push(child);
      }
    };
    visit(el); flush();
  };
  const pushImage = (img, fallbackAlt) => {
    const src = img.getAttribute('src') || '';
    const rawAlt = img.getAttribute('alt');
    const role = (img.getAttribute('role') || '').toLowerCase();
    const decorative = role === 'presentation' || role === 'none' || rawAlt === '';
    const alt = decorative ? '' : _cleanXml(rawAlt || fallbackAlt || '').trim();
    // STEM (2026-06-10): Vision-classified equations carry LaTeX — the docx
    // builder turns it into Word-native editable math (OMML), fail-soft.
    blocks.push({ type: 'image', src: /^data:image\//.test(src) ? src : null, alt, decorative, width: img.getAttribute('width'), height: img.getAttribute('height'), latex: img.getAttribute('data-allo-latex') || null });
    counts.images++;
  };
  const listItems = (listEl, level, items, ordered) => {
    const isOrd = ordered !== undefined ? !!ordered : (String(listEl.tagName || '').toUpperCase() === 'OL');
    const kids = listEl.children || [];
    const blockTags = new Set(['P', 'DIV', 'BLOCKQUOTE', 'PRE']);
    for (let i = 0; i < kids.length; i++) {
      const li = kids[i];
      if (li.tagName !== 'LI' || _isControlEl(li)) continue;
      // inline content + separated block children — nested lists handled recursively below
      const runs = [];
      let inlineBuf = [];
      const flushBuf = (needBr) => {
        if (!inlineBuf.length) return;
        const seg = inlineRuns({ childNodes: inlineBuf }, {});
        inlineBuf = [];
        if (!seg.length) return;
        if (needBr && runs.length && !runs[runs.length - 1].br) runs.push({ br: true });
        runs.push(...seg);
      };
      const liNodes = li.childNodes || [];
      for (let k = 0; k < liNodes.length; k++) {
        const c = liNodes[k];
        if (c.nodeType === 1 && (c.tagName === 'UL' || c.tagName === 'OL')) continue;
        if (c.nodeType === 1 && blockTags.has(String(c.tagName || '').toUpperCase())) {
          flushBuf(true);
          const bSeg = inlineRuns(c, {});
          if (bSeg.length) {
            if (runs.length && !runs[runs.length - 1].br) runs.push({ br: true });
            runs.push(...bSeg);
          }
        } else {
          inlineBuf.push(c);
        }
      }
      flushBuf(runs.length > 0);
      if (_runsText(runs) || runs.some((r) => r.img)) items.push({ runs, level, ordered: isOrd });
      for (let j = 0; j < li.children.length; j++) {
        const chTag = String(li.children[j].tagName || '').toUpperCase();
        if (chTag === 'UL' || chTag === 'OL') listItems(li.children[j], level + 1, items, chTag === 'OL');
      }
    }
  };
  const walk = (el) => {
    // Inline content (text nodes + inline elements) directly inside a container — possibly
    // interleaved with block elements — accumulates here and flushes as ONE paragraph at each block
    // boundary (and at the container's end). BUGFIX (audit #8, 2026-06-15): walk() iterated
    // el.children (elements only), so a container with any block descendant recursed and never
    // visited its own TEXT nodes — '<div>Intro<p>Body</p></div>' silently dropped "Intro". DOCX/ODT/
    // DAISY all share this walk, so loose text between blocks was lost from every Office/DAISY export.
    const _INLINE = { SPAN: 1, B: 1, STRONG: 1, I: 1, EM: 1, U: 1, A: 1, SUP: 1, SUB: 1, CODE: 1, SMALL: 1, MARK: 1, ABBR: 1, CITE: 1, Q: 1, S: 1, DEL: 1, INS: 1, BR: 1, WBR: 1, TIME: 1, BDI: 1, BDO: 1, KBD: 1, SAMP: 1, VAR: 1 };
    let _pending = [];
    const _flushInline = () => { if (_pending.length) { pushParagraph(inlineRuns({ childNodes: _pending }, {})); _pending = []; } };
    const kids = el.childNodes || [];
    for (let i = 0; i < kids.length; i++) {
      const n = kids[i];
      if (n.nodeType === 3) { if ((n.nodeValue || '').trim()) _pending.push(n); continue; } // loose text → accumulate
      if (n.nodeType !== 1 || _isControlEl(n)) continue;
      const tag = n.tagName;
      const upperTag = String(tag || '').toUpperCase();
      if ((upperTag !== 'IMG' && _INLINE[upperTag]) || upperTag === 'INPUT' || upperTag === 'SELECT' || upperTag === 'MATH' || _isInlineTermBtn(n)) { _pending.push(n); continue; } // inline element → accumulate
      _flushInline(); // a block element ends the current inline paragraph
      // Footnotes section (A6): skip it here — its notes are emitted as Word's
      // native footnotes (collected before the walk), so it must NOT also appear
      // as a trailing list in the body.
      if ((n.classList && n.classList.contains('allo-footnotes')) || (n.getAttribute && n.getAttribute('data-allo-footnotes') === '1' && Object.keys(_fnDefs).length > 0)) continue;
      // Page break (2026-06-13 + [data-allo-page-break]): emit a real docx page break.
      if ((n.classList && n.classList.contains('allo-block-pagebreak')) || (n.hasAttribute && n.hasAttribute('data-allo-page-break'))) { blocks.push({ type: 'pagebreak' }); continue; }
      if (upperTag === 'TEXTAREA') { pushParagraph(inlineRuns({ childNodes: [n] }, {})); continue; }
      const _selectedOptionText = (sel) => _readSelectedOptionText(sel);
      if (n.classList && n.classList.contains('alloflow-venn-card')) {
        const btn = n.querySelector('.alloflow-venn-card-button');
        const label = _cleanXml((btn ? btn.textContent : n.textContent) || '').replace(/\s+/g, ' ').trim();
        const placed = _cleanXml(_selectedOptionText(n.querySelector('select.alloflow-venn-response')));
        if (label) pushParagraph([{ text: label + ' — ' + (placed || '_'.repeat(12)) }]);
        continue;
      }
      if (n.classList && n.classList.contains('alloflow-cs-strip')) {
        const clone = n.cloneNode ? n.cloneNode(true) : null;
        if (clone && clone.querySelectorAll) {
          clone.querySelectorAll('.alloflow-cs-controls,.alloflow-cs-actions,select,[hidden],[aria-hidden="true"]').forEach((c) => c.remove());
        }
        const label = _cleanXml((clone ? clone.textContent : n.textContent) || '').replace(/\s+/g, ' ').trim();
        const placed = _cleanXml(_selectedOptionText(n.querySelector('select.alloflow-cs-response, select.alloflow-response-input')));
        if (label) pushParagraph([{ text: label + ' — ' + (placed || '_'.repeat(12)) }]);
        continue;
      }
      if (n.classList && n.classList.contains('alloflow-venn-print-only') && n.closest && n.closest('.alloflow-venn-activity') && n.closest('.alloflow-venn-activity').querySelector('.alloflow-venn-card')) continue;
      const _inTitlePage = n.closest && n.closest('.allo-titlepage');
      const h = /^H([1-6])$/.exec(tag);
      if (h) { const runs = inlineRuns(n, {}); if (_runsText(runs)) { blocks.push({ type: 'heading', level: parseInt(h[1], 10), runs, ...(_inTitlePage ? { centered: true } : {}) }); counts.headings++; } continue; }
      if (tag === 'PRE') {
        const preRaw = _cleanXml(n.textContent || '').replace(/^\n+|\n+$/g, '');
        const preLines = preRaw.split(/\r?\n/);
        const preRuns = [];
        preLines.forEach((line, idx) => {
          if (idx > 0) preRuns.push({ br: true });
          preRuns.push({ text: line || ' ', code: true });
        });
        pushParagraph(preRuns, { centered: !!_inTitlePage });
        continue;
      }
      if (tag === 'P' || tag === 'BLOCKQUOTE' || tag === 'DT' || tag === 'DD' || tag === 'FIGCAPTION' || tag === 'CAPTION') {
        // Reference-list entries (APA/MLA/Chicago) get a hanging indent in docx;
        // title-page lines (title/author/affiliation/course) are centered in any
        // mode — a title page is inherently centered.
        const isRef = (n.classList && n.classList.contains('allo-ref-entry')) || (n.closest && n.closest('.allo-references, [data-allo-bibliography="1"]'));
        const isIndented = !isRef && (tag === 'BLOCKQUOTE' || tag === 'DD' || !!(n.closest && (n.closest('blockquote') || n.closest('dd'))));
        if (tag === 'P' && n.querySelector && n.querySelector('img')) pushMixedParagraph(n, { hanging: !!isRef, centered: !!_inTitlePage, indented: isIndented });
        else pushParagraph(inlineRuns(n, tag === 'DT' ? { bold: true } : {}), { hanging: !!isRef, centered: !!_inTitlePage, indented: isIndented });
        continue;
      }
      if (tag === 'UL' || tag === 'OL') { const items = []; listItems(n, 0, items, tag === 'OL'); if (items.length) { blocks.push({ type: 'list', ordered: tag === 'OL', items }); counts.lists++; } continue; }
      if (tag === 'TABLE') {
        const rows = [];
        const trs = Array.from(n.querySelectorAll('tr')).filter((tr) => tr.closest('table') === n);
        for (let r = 0; r < trs.length; r++) {
          const tr = trs[r];
          const cells = [];
          let allTh = tr.children.length > 0;
          for (let c = 0; c < tr.children.length; c++) {
            const cell = tr.children[c];
            if (cell.tagName !== 'TH' && cell.tagName !== 'TD') continue;
            if (cell.tagName !== 'TH') allTh = false;
            // Merged cells (builder-review A5, 2026-07-01): carry colspan/rowspan into the
            // spec so the DOCX builder can emit real merges. HTML omits cells covered by a
            // rowspan, which is exactly the shape the docx lib's rowSpan expects.
            const cellCopy = cell.cloneNode(true);
            Array.from(cellCopy.querySelectorAll('table')).forEach((nested) => nested.remove());
            cells.push({ runs: inlineRuns(cellCopy, {}), header: cell.tagName === 'TH', scope: (cell.getAttribute('scope') || '').toLowerCase(),
              colSpan: Math.max(1, parseInt(cell.getAttribute('colspan') || '1', 10) || 1),
              rowSpan: Math.max(1, parseInt(cell.getAttribute('rowspan') || '1', 10) || 1) });
          }
          if (cells.length) rows.push({ header: allTh || (tr.parentNode && tr.parentNode.tagName === 'THEAD'), cells });
        }
        if (rows.length) { blocks.push({ type: 'table', rows }); counts.tables++; }
        const cap = Array.from(n.children || []).find((child) => child.tagName === 'CAPTION');
        if (cap) pushParagraph(inlineRuns(cap, { italic: true }));
        Array.from(n.querySelectorAll('table')).filter((nested) => nested !== n && nested.parentElement.closest('table') === n).forEach((nested) => walk({ childNodes: [nested] }));
        continue;
      }
      if (tag === 'IMG') { pushImage(n, ''); continue; }
      if (tag === 'FIGURE') {
        const img = n.querySelector('img');
        const svg = !img ? n.querySelector('svg') : null;
        const cap = n.querySelector('figcaption');
        const tables = Array.from(n.querySelectorAll('table')).filter((tbl) => tbl.closest('figure') === n && tbl.parentElement.closest('table') === null);
        if (img) pushImage(img, cap ? String(cap.textContent || '').trim() : '');
        else if (svg && !(svg.closest && svg.closest('.alloflow-inline-chart'))) {
          const svgLabel = (svg.getAttribute('aria-label') || (svg.querySelector('title') && svg.querySelector('title').textContent) || '').replace(/\s+/g, ' ').trim();
          if (svgLabel) pushParagraph([{ text: '[Diagram: ' + svgLabel + ']', italic: true }]);
        }
        if (cap) pushParagraph(inlineRuns(cap, { italic: true }));
        if (tables.length) tables.forEach((tbl) => walk({ childNodes: [tbl] }));
        continue;
      }
      if (upperTag === 'DL') { walk(n); continue; }
      if (tag === 'HR') continue;
      if (tag === 'DIV' || tag === 'MAIN' || tag === 'SECTION' || tag === 'ARTICLE' || tag === 'HEADER' || tag === 'FOOTER' || tag === 'NAV' || tag === 'ASIDE' || tag === 'FORM') {
        if (n.querySelector && n.querySelector('h1,h2,h3,h4,h5,h6,p,ul,ol,table,figure,img,blockquote,dl,dt,dd,pre,div,section,article,textarea,input,select,math,[data-allo-page-break],.alloflow-venn-card,.alloflow-cs-strip')) walk(n);
        else pushParagraph(inlineRuns(n, {}));
        continue;
      }
      if (tag === 'DETAILS') {
        // AI companion panels (export-format review R2 #9). The old catch-all below
        // fused every text leaf of a <details> into ONE run, gluing adjacent chart
        // cell values together digit-to-digit ("Q1Q2...101520"). allo-math-source is
        // a redundant "show source" panel (the equation is already rendered in the
        // body), so drop it entirely like the audio lane does; other panels keep
        // their CONTENT, walked as real blocks (the data table stays a table). Companion
        // panels strip their toggle <summary>; regular <details> keep <summary> as a bold
        // paragraph and convert direct <math> children to readable text.
        if (n.classList && n.classList.contains('allo-math-source')) continue;
        _flushInline();
        const _isCompanionPanel = !!(n.classList && (n.classList.contains('allo-chart-data') || n.classList.contains('allo-image-desc')));
        const _dk = [];
        const _dkids = n.childNodes || [];
        for (let _di = 0; _di < _dkids.length; _di++) {
          const _dn = _dkids[_di];
          const _tn = (_dn.tagName || '').toUpperCase();
          if (_dn.nodeType === 1 && _tn === 'SUMMARY') {
            if (!_isCompanionPanel) pushParagraph(inlineRuns(_dn, { bold: true }));
            continue;
          }
          if (_dn.nodeType === 1 && _tn === 'MATH') {
            const _mTxt = _mathReadableText(_dn);
            if (_mTxt) pushParagraph([{ text: _mTxt }]);
            continue;
          }
          _dk.push(_dn);
        }
        walk({ childNodes: _dk });
        continue;
      }
      pushParagraph(inlineRuns(n, {}));
    }
    _flushInline(); // trailing inline (container ending with loose text/inline)
  };
  // ── Collect footnote definitions (A6) BEFORE the walk, so the in-text anchors
  // can resolve their ids. Each note's spoken text (minus the ↩ back-link) becomes
  // a Word footnote; document order = id order, matching the on-screen numbering. ──
  try {
    const _fnSec = doc.querySelector('section.allo-footnotes, [data-allo-footnotes="1"]');
    if (_fnSec) {
      let _fnSeq = 0;
      Array.from(_fnSec.querySelectorAll('li[data-fn-uid], li[id]')).forEach((li) => {
        const uid = li.getAttribute('data-fn-uid') || '';
        const lid = li.getAttribute('id') || '';
        if (!uid && !lid) return;
        if ((uid && _fnIdByUid[uid]) || (lid && _fnIdByHref['#' + lid])) return;
        const id = ++_fnSeq;
        if (uid) _fnIdByUid[uid] = id;
        if (lid) _fnIdByHref['#' + lid] = id;
        const _txtEl = li.querySelector('.allo-fn-text') || li;
        const _runs = inlineRuns(_txtEl, {});
        _fnDefs[id] = (_runs && _runs.length) ? _runs : [{ text: _cleanXml(li.textContent || '').replace(/↩/g, '').trim() }];
      });
    }
  } catch (_) {}
  walk(doc.body);
  return { title, lang, rtl, blocks, counts, footnotes: _fnDefs };
}
// end _htmlToDocxSpec

// ── ODT + DAISY exporters (2026-06-14) ──────────────────────────────────────
// Both reuse the SAME tested block model from _htmlToDocxSpec(html) as their
// intermediate representation, then serialize it to OpenDocument Text (ODT) and
// DAISY 3 (DTBook 2005-3). Pure string builders (no JSZip) so they unit-test
// like _htmlToDocxSpec; the zip packaging lives in the export handlers.
function _expXmlEsc(s) {
  return String(s == null ? '' : s)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Serialize a spec run-array to ODF inline markup (nested text:spans so we only
// need single-property styles, all defined in the automatic-styles below).
function _odtLangStyleName(lang) {
  return 'T_Lang_' + String(lang || '').replace(/[^A-Za-z0-9]/g, '_').slice(0, 48);
}
function _odtRuns(runs, footnotes) {
  return (runs || []).map((r) => {
    if (!r) return '';
    // Footnote anchor → a real ODF inline footnote (2026-06-15 fix: these used to
    // return '' so ALL footnotes silently vanished from ODT). Body from spec.footnotes.
    if (r.footnoteId != null) {
      const _fnRuns = (footnotes && footnotes[r.footnoteId]) || [];
      const _body = _odtRuns(_fnRuns, footnotes) || _expXmlEsc(String(r.footnoteId)); // thread footnotes so a footnote-in-footnote ref's text survives (#5)
      const _fid = _expXmlEsc(String(r.footnoteId));
      const _fnSeen = _odtRuns._fnSeen;
      const _fnKey = String(r.footnoteId);
      const _useN = _fnSeen ? ((_fnSeen.get(_fnKey) || 0) + 1) : 1;
      if (_fnSeen) _fnSeen.set(_fnKey, _useN);
      const _noteId = _useN > 1 ? ('ftn' + _fid + '_' + _useN) : ('ftn' + _fid);
      return '<text:note text:id="' + _noteId + '" text:note-class="footnote"><text:note-citation>' + _fid + '</text:note-citation><text:note-body><text:p text:style-name="Standard">' + _body + '</text:p></text:note-body></text:note>';
    }
    if (r.br) return '<text:line-break/>';
    if (r.img) return r.img.alt ? _expXmlEsc('[Image: ' + r.img.alt + ']') : '';
    if (typeof r.text !== 'string') return '';
    let t = _expXmlEsc(r.text);
    if (r.sub) t = '<text:span text:style-name="T_Sub">' + t + '</text:span>';
    if (r.sup) t = '<text:span text:style-name="T_Sup">' + t + '</text:span>';
    if (r.code) t = '<text:span text:style-name="T_Code">' + t + '</text:span>';
    if (r.strike) t = '<text:span text:style-name="T_Strike">' + t + '</text:span>';
    if (r.highlight) t = '<text:span text:style-name="T_Highlight">' + t + '</text:span>';
    if (r.underline) t = '<text:span text:style-name="T_Underline">' + t + '</text:span>';
    if (r.italic) t = '<text:span text:style-name="T_Italic">' + t + '</text:span>';
    if (r.bold) t = '<text:span text:style-name="T_Bold">' + t + '</text:span>';
    if (r.lang) t = '<text:span text:style-name="' + _odtLangStyleName(r.lang) + '">' + t + '</text:span>';
    if (r.link) t = '<text:a xlink:href="' + _expXmlEsc(r.link) + '">' + t + '</text:a>';
    return t;
  }).join('');
}

// content.xml for an ODT. Heading_20_N / Standard map to LibreOffice built-ins;
// the bold/italic/sub/sup + list styles are declared as automatic-styles so the
// file opens cleanly in LibreOffice / Word / Google Docs with no missing-style.

// Rebuild a NESTED list from the flat spec items[] (each carrying it.level). The DOCX/PPTX builders
// honor it.level via numbering/bullet indent, but the ODT + DTBook serializers used to emit every
// item at the top level (audit #24). Shared so both stay consistent. itemOpen(it) returns the item's
// OPEN markup INCLUDING its content but NOT its close, so a child list nests inside it before the close.
function _buildNestedListXml(items, listOpenTag, itemOpen, itemCloseTag, listCloseTag, wrapperItemOpen) {
  let out = '';
  let depth = 0;
  const open = [];
  const closeStack = [];
  const orderedStack = [];
  const openTagFor = (it) => (typeof listOpenTag === 'function' ? listOpenTag(it) : listOpenTag);
  const closeTagFor = (it) => (typeof listCloseTag === 'function' ? listCloseTag(it) : listCloseTag);
  const wrapOpen = wrapperItemOpen || ((itemCloseTag === '</text:list-item>') ? '<text:list-item>' : '<li>');
  for (const it of (items || [])) {
    const L = Math.max(1, (it && it.level || 0) + 1);
    const itOrd = it && it.ordered !== undefined ? !!it.ordered : undefined;
    if (depth === L && itOrd !== undefined && orderedStack[depth] !== undefined && orderedStack[depth] !== itOrd) {
      if (open[depth]) { out += itemCloseTag; open[depth] = false; }
      out += (closeStack[depth] || closeTagFor(it));
      depth--;
    }
    while (depth < L) {
      if (depth > 0 && !open[depth]) {
        out += wrapOpen;
        open[depth] = true;
      }
      out += openTagFor(it);
      depth++;
      closeStack[depth] = closeTagFor(it);
      orderedStack[depth] = itOrd;
      open[depth] = false;
    }
    while (depth > L) {
      if (open[depth]) { out += itemCloseTag; open[depth] = false; }
      out += (closeStack[depth] || closeTagFor(it));
      depth--;
    }
    if (open[depth]) out += itemCloseTag;
    out += itemOpen(it);
    open[depth] = true;
  }
  while (depth > 0) {
    if (open[depth]) { out += itemCloseTag; open[depth] = false; }
    out += (closeStack[depth] || closeTagFor(null));
    depth--;
  }
  return out;
}

const _VIEW_REMEDIATION_IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp']);
function _viewRemediationMimeType(file) {
  let claimed = String((file && (file.mimeType || file.type)) || '').trim().toLowerCase();
  if (claimed === 'image/jpg') claimed = 'image/jpeg';
  if (_VIEW_REMEDIATION_IMAGE_MIMES.has(claimed)) return claimed;
  const name = String((file && (file.name || file.fileName || file.relPath)) || '').toLowerCase();
  if (/\.png$/.test(name)) return 'image/png';
  if (/\.jpe?g$/.test(name)) return 'image/jpeg';
  if (/\.webp$/.test(name)) return 'image/webp';
  return claimed;
}
function _viewIsRemediationImage(file) {
  return _VIEW_REMEDIATION_IMAGE_MIMES.has(_viewRemediationMimeType(file));
}
function _viewRemediationBaseName(name) {
  return String(name || 'document').replace(/\.(?:pdf|docx|pptx|png|jpe?g|webp)$/i, '');
}

function _dataImageInfo(src) {
  const match = /^data:(image\/(?:png|jpeg|jpg|gif|webp));base64,([a-z0-9+/=\r\n]+)$/i.exec(String(src || ''));
  if (!match) return null;
  try {
    const mime = match[1].toLowerCase().replace('image/jpg', 'image/jpeg');
    const base64 = match[2].replace(/\s+/g, '');
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    let width = 0, height = 0;
    if (mime === 'image/png' && bytes.length >= 24 && bytes[0] === 0x89 && bytes[1] === 0x50) {
      width = ((bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19]) >>> 0;
      height = ((bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23]) >>> 0;
    } else if (mime === 'image/gif' && bytes.length >= 10) {
      width = bytes[6] | (bytes[7] << 8); height = bytes[8] | (bytes[9] << 8);
    } else if (mime === 'image/jpeg' && bytes.length > 4) {
      let pos = 2;
      while (pos + 8 < bytes.length) {
        if (bytes[pos] !== 0xff) { pos++; continue; }
        const marker = bytes[pos + 1], size = (bytes[pos + 2] << 8) | bytes[pos + 3];
        if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) {
          height = (bytes[pos + 5] << 8) | bytes[pos + 6]; width = (bytes[pos + 7] << 8) | bytes[pos + 8]; break;
        }
        if (size < 2) break; pos += 2 + size;
      }
    }
    return { mime, ext: mime === 'image/jpeg' ? 'jpg' : mime.slice(6), base64, bytes, width, height };
  } catch (_) { return null; }
}
function _imageDisplayPx(info, widthAttr, heightAttr) {
  const attrW = Math.max(0, parseInt(widthAttr, 10) || 0), attrH = Math.max(0, parseInt(heightAttr, 10) || 0);
  const ratio = info && info.width > 0 && info.height > 0 ? info.width / info.height : 0;
  let width = attrW || ((info && info.width >= 32) ? info.width : 480);
  let height = attrH || (ratio ? Math.round(width / ratio) : Math.round(width * 0.66));
  if (attrH && !attrW && ratio) width = Math.round(height * ratio);
  if (attrW && !attrH && ratio) height = Math.round(width / ratio);
  const scale = Math.min(1, 600 / Math.max(1, width), 720 / Math.max(1, height));
  return { width: Math.max(24, Math.round(width * scale)), height: Math.max(24, Math.round(height * scale)) };
}

const _CJK_LANGS = new Set(['zh', 'ja', 'ko', 'yue', 'wuu']);
const _CTL_LANGS = new Set(['ar', 'fa', 'he', 'iw', 'ps', 'sd', 'ug', 'ur', 'yi', 'hi', 'bn', 'ta', 'te', 'ml', 'kn', 'mr', 'gu', 'pa', 'or', 'si', 'th', 'lo', 'km', 'my', 'bo', 'am', 'ti']);
function _parseOdtBcp47(langTag) {
  const raw = String(langTag || '').trim();
  const parts = raw.split(/[-_]/).filter(Boolean);
  const primary = /^[A-Za-z]{2,3}$/.test(parts[0] || '') ? parts[0].toLowerCase() : 'none';
  const rest = parts.slice(1);
  const scriptPart = rest.find((p) => /^[A-Za-z]{4}$/.test(p));
  const script = scriptPart ? (scriptPart[0].toUpperCase() + scriptPart.slice(1).toLowerCase()) : '';
  const regionPart = rest.find((p) => /^(?:[A-Za-z]{2}|[0-9]{3})$/.test(p));
  const country = regionPart ? regionPart.toUpperCase() : '';
  const foAttrs = 'fo:language="' + _expXmlEsc(primary) + '"'
    + (country ? ' fo:country="' + _expXmlEsc(country) + '"' : '')
    + (script ? ' fo:script="' + _expXmlEsc(script) + '"' : '');
  const asianAttrs = _CJK_LANGS.has(primary)
    ? ' style:language-asian="' + _expXmlEsc(primary) + '"'
      + (country ? ' style:country-asian="' + _expXmlEsc(country) + '"' : '')
      + (script ? ' style:script-asian="' + _expXmlEsc(script) + '"' : '')
    : '';
  const complexAttrs = _CTL_LANGS.has(primary)
    ? ' style:language-complex="' + _expXmlEsc(primary) + '"'
      + (country ? ' style:country-complex="' + _expXmlEsc(country) + '"' : '')
      + (script ? ' style:script-complex="' + _expXmlEsc(script) + '"' : '')
    : '';
  return { raw, primary, script, country, foAttrs, asianAttrs, complexAttrs, allAttrs: foAttrs + asianAttrs + complexAttrs };
}
function _htmlToOdtContentXml(html, imageAssets) {
  const spec = _htmlToDocxSpec(html);
  const _isRtl = !!spec.rtl;
  const body = [];
  const _odtLangs = new Set();
  const _collectLangs = (runs) => (runs || []).forEach((run) => { if (run && run.lang) _odtLangs.add(run.lang); });
  for (const block of (spec.blocks || [])) {
    _collectLangs(block.runs);
    (block.items || []).forEach((item) => _collectLangs(item.runs));
    (block.rows || []).forEach((row) => (row.cells || []).forEach((cell) => _collectLangs(cell.runs)));
  }
  Object.keys(spec.footnotes || {}).forEach((key) => _collectLangs(spec.footnotes[key]));
  const _odtLangStyles = Array.from(_odtLangs).map((language) => {
    const _parsed = _parseOdtBcp47(language);
    return '<style:style style:name="' + _odtLangStyleName(language) + '" style:family="text"><style:text-properties ' + _parsed.allAttrs + '/></style:style>';
  }).join('');
  const imageBySrc = new Map((imageAssets || []).map((asset) => [asset.src, asset]));
  const _prevFnSeen = _odtRuns._fnSeen;
  _odtRuns._fnSeen = new Map();
  let tableSeq = 0, imageFrameSeq = 0;
  const _pStyle = _isRtl ? 'Standard_RTL' : 'Standard';
  const _pIndentStyle = _isRtl ? 'P_Indent_RTL' : 'P_Indent';
  try {
  for (const b of (spec.blocks || [])) {
    if (b.type === 'heading') {
      const lvl = Math.min(6, Math.max(1, b.level || 1));
      const _hStyle = _isRtl ? ('Heading_20_' + lvl + '_RTL') : ('Heading_20_' + lvl);
      body.push('<text:h text:style-name="' + _hStyle + '" text:outline-level="' + lvl + '">' + _odtRuns(b.runs, spec.footnotes) + '</text:h>');
    } else if (b.type === 'paragraph') {
      body.push('<text:p text:style-name="' + (b.indented ? _pIndentStyle : _pStyle) + '">' + _odtRuns(b.runs, spec.footnotes) + '</text:p>');
    } else if (b.type === 'list') {
      body.push(_buildNestedListXml(b.items,
        (it) => '<text:list text:style-name="' + ((it && it.ordered !== undefined ? it.ordered : b.ordered) ? 'L_Number' : 'L_Bullet') + '">',
        (it) => '<text:list-item><text:p text:style-name="' + _pStyle + '">' + _odtRuns(it.runs, spec.footnotes) + '</text:p>',
        '</text:list-item>', '</text:list>')); // nested by it.level & per-item ordered
    } else if (b.type === 'table') {
      // Merge parity (#10): ODF merges = table:number-columns/rows-spanned on the
      // anchor cell + <table:covered-table-cell/> placeholders for every covered
      // position (same-row trailing for colspan; tracked into FOLLOWING rows for
      // rowspan via _pend[col] = remaining covered rows). HTML omits covered
      // cells, so the grid tracker reconstructs the true geometry.
      const _rows0 = b.rows || [];
      const _simPend = [];
      let cols = 1;
      for (const _sr of _rows0) {
        let _sc = 0, _sci = 0;
        const _scells = _sr.cells || [];
        while (_sci < _scells.length || _sc < _simPend.length) {
          if ((_simPend[_sc] || 0) > 0) { _simPend[_sc]--; _sc++; continue; }
          if (_sci >= _scells.length) { _sc++; continue; }
          const _cell = _scells[_sci++];
          const _cs = Math.max(1, _cell.colSpan || 1), _rs = Math.max(1, _cell.rowSpan || 1);
          if (_rs > 1) for (let _k = 0; _k < _cs; _k++) _simPend[_sc + _k] = (_simPend[_sc + _k] || 0) + (_rs - 1);
          _sc += _cs;
        }
        if (_sc > cols) cols = _sc;
      }
      const _pend = [];
      const _odtRow = (r) => {
        let out = '<table:table-row>';
        const cells = r.cells || [];
        let col = 0, ci = 0;
        while (col < cols && (ci < cells.length || (_pend[col] || 0) > 0)) {
          if ((_pend[col] || 0) > 0) { out += '<table:covered-table-cell/>'; _pend[col]--; col++; continue; }
          const c = cells[ci++];
          if (!c) break;
          const cs = Math.max(1, c.colSpan || 1), rs = Math.max(1, c.rowSpan || 1);
          const _cellStyle = c.header ? 'TableHeaderCell' : 'TableCell';
          const _paraStyle = _isRtl ? (c.header ? 'P_TableHeader_RTL' : 'Standard_RTL') : (c.header ? 'P_TableHeader' : 'Standard');
          out += '<table:table-cell table:style-name="' + _cellStyle + '" office:value-type="string"'
            + (cs > 1 ? ' table:number-columns-spanned="' + cs + '"' : '')
            + (rs > 1 ? ' table:number-rows-spanned="' + rs + '"' : '')
            + '><text:p text:style-name="' + _paraStyle + '">' + _odtRuns(c.runs, spec.footnotes) + '</text:p></table:table-cell>';
          if (cs > 1) out += Array(cs - 1).fill('<table:covered-table-cell/>').join('');
          if (rs > 1) for (let k = 0; k < cs; k++) _pend[col + k] = (_pend[col + k] || 0) + (rs - 1);
          col += cs;
        }
        return out + '</table:table-row>';
      };
      const _rows = _rows0;
      const _dataRows = _rows.filter((row) => !row.header);
      let _headerCols = 0;
      if (_dataRows.length) {
        while (_headerCols < cols && _dataRows.every((row) => {
          const cell = (row.cells || [])[_headerCols];
          return !!(cell && cell.header && cell.scope === 'row' && Math.max(1, cell.colSpan || 1) === 1);
        })) _headerCols++;
      }
      const _colXml = (_headerCols > 0
        ? '<table:table-header-columns><table:table-column table:number-columns-repeated="' + _headerCols + '"/></table:table-header-columns>'
        : '') + (cols > _headerCols ? '<table:table-column table:number-columns-repeated="' + (cols - _headerCols) + '"/>' : '');
      // ODF: wrap the leading header row(s) in <table:table-header-rows> so AT announces them as
      // headers (audit #19 — every row used to serialize as a plain table-row, so DOCX/DTBook kept
      // header semantics but ODT alone lost them). r.header is the spec's all-th/<thead> flag.
      let _hdr = 0;
      while (_hdr < _rows.length && _rows[_hdr].header) _hdr++;
      const _hdrXml = _hdr > 0 ? '<table:table-header-rows>' + _rows.slice(0, _hdr).map(_odtRow).join('') + '</table:table-header-rows>' : '';
      body.push('<table:table table:name="Table' + (++tableSeq) + '"' + (_isRtl ? ' table:style-name="Table_RTL"' : '') + '>' +
        _colXml +
        _hdrXml + _rows.slice(_hdr).map(_odtRow).join('') +
        '</table:table>');
    } else if (b.type === 'image') {
      const asset = b.src ? imageBySrc.get(b.src) : null;
      if (asset) {
        const size = _imageDisplayPx(asset, b.width, b.height);
        const widthIn = Math.max(0.25, size.width / 96).toFixed(3);
        const heightIn = Math.max(0.25, size.height / 96).toFixed(3);
        const _isDeco = b.decorative === true || b.alt === '';
        const _altXml = _isDeco ? '' : ('<svg:title>' + _expXmlEsc(b.alt || 'Image') + '</svg:title><svg:desc>' + _expXmlEsc(b.alt || 'Image') + '</svg:desc>');
        body.push('<text:p text:style-name="' + _pStyle + '"><draw:frame draw:name="Image' + (++imageFrameSeq) + '" text:anchor-type="as-char" svg:width="' + widthIn + 'in" svg:height="' + heightIn + 'in" draw:z-index="0">' +
          '<draw:image xlink:href="' + _expXmlEsc(asset.path) + '" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/>' +
          _altXml + '</draw:frame></text:p>');
      } else if (b.alt) body.push('<text:p text:style-name="' + _pStyle + '">[Image: ' + _expXmlEsc(b.alt) + ']</text:p>');
    } else if (b.type === 'pagebreak') {
      body.push('<text:p text:style-name="P_PageBreak"/>');
    }
  }
  } finally { _odtRuns._fnSeen = _prevFnSeen; }
  const _odtRtlStyles = _isRtl
    ? '<style:style style:name="Standard_RTL" style:family="paragraph" style:parent-style-name="Standard"><style:paragraph-properties style:writing-mode="rl-tb" fo:text-align="end"/></style:style>'
      + [1, 2, 3, 4, 5, 6].map((n) => '<style:style style:name="Heading_20_' + n + '_RTL" style:family="paragraph" style:parent-style-name="Heading_20_' + n + '"><style:paragraph-properties style:writing-mode="rl-tb" fo:text-align="end"/></style:style>').join('')
      + '<style:style style:name="P_TableHeader_RTL" style:family="paragraph"><style:paragraph-properties style:writing-mode="rl-tb" fo:text-align="end"/><style:text-properties fo:font-weight="bold"/></style:style>'
      + '<style:style style:name="Table_RTL" style:family="table"><style:table-properties style:writing-mode="rl-tb"/></style:style>'
    : '';
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" office:version="1.2">\n' +
    '<office:automatic-styles>' +
    '<style:style style:name="T_Bold" style:family="text"><style:text-properties fo:font-weight="bold"/></style:style>' +
    '<style:style style:name="T_Italic" style:family="text"><style:text-properties fo:font-style="italic"/></style:style>' +
    '<style:style style:name="T_Sub" style:family="text"><style:text-properties style:text-position="sub 58%"/></style:style>' +
    '<style:style style:name="T_Sup" style:family="text"><style:text-properties style:text-position="super 58%"/></style:style>' +
    '<style:style style:name="T_Code" style:family="text"><style:text-properties style:font-name="Liberation Mono"/></style:style>' +
    '<style:style style:name="T_Strike" style:family="text"><style:text-properties style:text-line-through-style="solid"/></style:style>' +
    '<style:style style:name="T_Highlight" style:family="text"><style:text-properties fo:background-color="#FFF59D"/></style:style>' +
    '<style:style style:name="T_Underline" style:family="text"><style:text-properties style:text-underline-style="solid" style:text-underline-width="auto" style:text-underline-color="font-color"/></style:style>' +
    _odtLangStyles +
    '<style:style style:name="P_TableHeader" style:family="paragraph"><style:text-properties fo:font-weight="bold"/></style:style>' +
    '<style:style style:name="P_Indent" style:family="paragraph" style:parent-style-name="Standard"><style:paragraph-properties fo:margin-left="0.5in"/></style:style>' +
    '<style:style style:name="P_Indent_RTL" style:family="paragraph" style:parent-style-name="Standard_RTL"><style:paragraph-properties fo:margin-right="0.5in" style:writing-mode="rl-tb" fo:text-align="end"/></style:style>' +
    _odtRtlStyles +
    '<style:style style:name="TableCell" style:family="table-cell"><style:table-cell-properties fo:border="0.75pt solid #94A3B8" fo:padding="0.06in"/></style:style>' +
    '<style:style style:name="TableHeaderCell" style:family="table-cell"><style:table-cell-properties fo:background-color="#E2E8F0" fo:border="0.75pt solid #64748B" fo:padding="0.06in"/></style:style>' +
    '<style:style style:name="P_PageBreak" style:family="paragraph"><style:paragraph-properties fo:break-before="page"/></style:style>' +
    '<text:list-style style:name="L_Bullet">' +
    ['•', '◦', '▪', '•', '◦'].map((ch, idx) => '<text:list-level-style-bullet text:level="' + (idx + 1) + '" text:bullet-char="' + ch + '"><style:list-level-properties text:space-before="' + ((idx + 1) * 0.25).toFixed(2) + 'in" text:min-label-width="0.25in"/></text:list-level-style-bullet>').join('') +
    '</text:list-style>' +
    '<text:list-style style:name="L_Number">' +
    [1, 2, 3, 4, 5].map((lvl) => '<text:list-level-style-number text:level="' + lvl + '" style:num-format="1" text:num-suffix="."><style:list-level-properties text:space-before="' + (lvl * 0.25).toFixed(2) + 'in" text:min-label-width="0.25in"/></text:list-level-style-number>').join('') +
    '</text:list-style>' +
    '</office:automatic-styles>\n' +
    '<office:body><office:text>' + body.join('\n') + '</office:text></office:body>\n' +
    '</office:document-content>';
}

// The fixed ODT sidecar files (mimetype must be FIRST + STORED in the zip).
function _htmlToOdtPackageParts(html) {
  const spec = _htmlToDocxSpec(html);
  const images = [], seen = new Map();
  for (const block of (spec.blocks || [])) {
    if (block.type !== 'image' || !block.src || seen.has(block.src)) continue;
    const info = _dataImageInfo(block.src);
    if (!info) continue;
    const asset = { src: block.src, path: 'Pictures/image-' + (images.length + 1) + '.' + info.ext, mime: info.mime, base64: info.base64, width: info.width, height: info.height };
    images.push(asset); seen.set(block.src, asset);
  }
  return { contentXml: _htmlToOdtContentXml(html, images), images };
}
function _buildOdtManifestXml(images) {
  const entries = (images || []).map((image) => '<manifest:file-entry manifest:full-path="' + _expXmlEsc(image.path) + '" manifest:media-type="' + _expXmlEsc(image.mime) + '"/>').join('');
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">' +
    '<manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/>' +
    '<manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>' +
    '<manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>' +
    '<manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>' +
    entries + '</manifest:manifest>';
}

const _ODT_STYLES_XML = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:version="1.2"><office:styles>' +
  '<style:default-style style:family="paragraph"><style:text-properties style:font-name="Liberation Serif" fo:font-size="12pt"/></style:default-style>' +
  '<style:style style:name="Standard" style:family="paragraph" style:class="text"/>' +
  ['1', '2', '3', '4', '5', '6'].map((n) => '<style:style style:name="Heading_20_' + n + '" style:display-name="Heading ' + n + '" style:family="paragraph" style:parent-style-name="Standard" style:class="text"><style:text-properties fo:font-weight="bold" fo:font-size="' + (20 - (n - 1) * 2) + 'pt"/></style:style>').join('') +
  '</office:styles></office:document-styles>';

