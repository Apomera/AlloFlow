// DAISY 3 (DTBook 2005-3) full-text talking book. Text-only: DAISY readers
// provide their own speech/braille/large-print rendering. (Synced read-aloud
// audio is the separate EPUB3 Media Overlays export.) Builds the nested levelN
// containers DTBook requires from the flat heading sequence.
function _expDtbookRuns(runs) {
  return (runs || []).map((r) => {
    if (!r) return '';
    // Footnote anchor → DTBook noteref (paired with a <note> in the Notes level
    // appended by _htmlToDtbookXml). 2026-06-15 fix: these returned '' so footnotes
    // silently vanished from the DAISY export.
    if (r.footnoteId != null) { const _fid = _expXmlEsc(String(r.footnoteId)); return '<noteref idref="dtbfn' + _fid + '">' + _fid + '</noteref>'; }
    if (r.br) return '<br/>';
    if (r.img) return r.img.alt ? _expXmlEsc('[Image: ' + r.img.alt + ']') : '';
    if (typeof r.text !== 'string') return '';
    let t = _expXmlEsc(r.text);
    if (r.sub) t = '<sub>' + t + '</sub>';
    if (r.sup) t = '<sup>' + t + '</sup>';
    if (r.code) t = '<code>' + t + '</code>';
    if (r.italic) t = '<em>' + t + '</em>';
    if (r.bold) t = '<strong>' + t + '</strong>';
    if (r.lang) t = '<span xml:lang="' + _expXmlEsc(r.lang) + '">' + t + '</span>';
    if (r.link) t = '<a href="' + _expXmlEsc(r.link) + '">' + t + '</a>';
    return t;
  }).join('');
}
function _htmlToDtbookXml(html, lang, uid) {
  const spec = _htmlToDocxSpec(html);
  const L = lang || spec.lang || 'en';
  const title = _expXmlEsc(spec.title || 'Document');
  const out = [];
  let depth = 0;
  let headingSeq = 0; // matches _htmlToDaisyNcx's per-heading index so navPoints resolve (#2)
  const ensureContentLevel = () => { if (depth === 0) { out.push('<level1>'); out.push('<h1>' + title + '</h1>'); depth = 1; } };
  for (const b of (spec.blocks || [])) {
    if (b.type === 'heading') {
      const rawLvl = Math.min(6, Math.max(1, b.level || 1));
      const lvl = Math.min(rawLvl, depth + 1);
      while (depth >= lvl) { out.push('</level' + depth + '>'); depth--; }
      while (depth < lvl) { depth++; out.push('<level' + depth + '>'); }
      const _h = _expDtbookRuns(b.runs);
      // id="hN" so the NCX navPoint content src="dtbook.xml#hN" resolves (was a dangling anchor →
      // every TOC jump landed at page 1). Counter increments ONLY here, matching the NCX which
      // counts only spec.blocks headings — NOT the injected title/Notes <h1>. (#2)
      out.push('<h' + lvl + ' id="h' + (++headingSeq) + '">' + (_h || title) + '</h' + lvl + '>');
    } else if (b.type === 'paragraph') {
      ensureContentLevel();
      out.push('<p>' + _expDtbookRuns(b.runs) + '</p>');
    } else if (b.type === 'list') {
      ensureContentLevel();
      out.push(_buildNestedListXml(b.items,
        (it) => '<list type="' + ((it && it.ordered !== undefined ? it.ordered : b.ordered) ? 'ol' : 'ul') + '">',
        (it) => '<li>' + _expDtbookRuns(it.runs), '</li>', '</list>')); // nested by it.level & per-item ordered
    } else if (b.type === 'table') {
      ensureContentLevel();
      out.push('<table>' + (b.rows || []).map((r) => '<tr>' + (r.cells || []).map((c) => {
        const tg = c.header ? 'th' : 'td';
        const cs = Math.max(1, c.colSpan || 1), rs = Math.max(1, c.rowSpan || 1);
        const sc = c.header && /^(?:row|col|rowgroup|colgroup)$/i.test(String(c.scope || '').trim())
          ? ' scope="' + String(c.scope).trim().toLowerCase() + '"' : '';
        return '<' + tg + sc + (cs > 1 ? ' colspan="' + cs + '"' : '') + (rs > 1 ? ' rowspan="' + rs + '"' : '') + '>' + _expDtbookRuns(c.runs) + '</' + tg + '>';
      }).join('') + '</tr>').join('') + '</table>');
    } else if (b.type === 'image') {
      ensureContentLevel();
      // alt-only degrade as a plain labelled paragraph — a DTBook <imggroup> with no <img> child
      // violates the 2005-3 content model (strict DAISY tools reject it), and no image bytes are
      // packaged in the DAISY zip so a real <img src> would dangle. Mirrors the ODT/DOCX fallback. (#4)
      if (b.alt) out.push('<p>[Image: ' + _expXmlEsc(b.alt) + ']</p>');
    }
  }
  while (depth > 0) { out.push('</level' + depth + '>'); depth--; }
  // Footnotes → a DTBook "Notes" level (2026-06-15 fix): each inline noteref above
  // pairs with a <note> here so footnote text survives the DAISY export.
  const _fnKeys = spec.footnotes ? Object.keys(spec.footnotes) : [];
  if (_fnKeys.length) {
    out.push('<level1><h1>Notes</h1>');
    for (const _k of _fnKeys) {
      const _fid = _expXmlEsc(String(_k));
      out.push('<note id="dtbfn' + _fid + '"><p>' + (_expDtbookRuns(spec.footnotes[_k]) || '') + '</p></note>');
    }
    out.push('</level1>');
  }
  const bodyInner = out.join('\n') || ('<level1><h1>' + title + '</h1></level1>');
  return '<?xml version="1.0" encoding="utf-8"?>\n' +
    '<!DOCTYPE dtbook PUBLIC "-//NISO//DTD dtbook 2005-3//EN" "http://www.daisy.org/z3986/2005/dtbook-2005-3.dtd">\n' +
    '<dtbook xmlns="http://www.daisy.org/z3986/2005/dtbook/" version="2005-3" xml:lang="' + _expXmlEsc(L) + '"' + (spec.rtl ? ' dir="rtl"' : '') + '>\n' +
    '<head>' +
    '<meta name="dc:Title" content="' + title + '"/>' +
    '<meta name="dc:Language" content="' + _expXmlEsc(L) + '"/>' +
    '<meta name="dc:Publisher" content="AlloFlow"/>' +
    '<meta name="dc:Format" content="ANSI/NISO Z39.86-2005"/>' +
    '<meta name="dtb:uid" content="' + _expXmlEsc(uid || 'alloflow-daisy') + '"/>' +
    '</head>\n' +
    '<book><bodymatter>' + bodyInner + '</bodymatter></book>\n' +
    '</dtbook>';
}
// Navigation Control file (NCX) + OPF package for the DAISY book — navPoints
// from the document headings so DAISY players get a real navigable TOC.
function _htmlToDaisyNcx(html, title, uid, lang) {
  const spec = _htmlToDocxSpec(html);
  const L = lang || spec.lang || 'en';
  const heads = (spec.blocks || []).filter((b) => b.type === 'heading');
  const stack = [];
  let maxDepth = 1;
  let i = 0;
  const navChunks = [];
  heads.forEach((h) => {
    i++;
    const rawLvl = Math.min(6, Math.max(1, h.level || 1));
    const curDepth = stack.length ? stack[stack.length - 1] : 0;
    const lvl = Math.min(rawLvl, curDepth + 1);
    while (stack.length && stack[stack.length - 1] >= lvl) {
      stack.pop();
      navChunks.push('</navPoint>');
    }
    if (lvl > maxDepth) maxDepth = lvl;
    const label = _expXmlEsc((h.runs || []).map((r) => r.text || '').join('') || ('Section ' + i));
    navChunks.push('<navPoint id="np' + i + '" playOrder="' + i + '"><navLabel><text>' + label + '</text></navLabel><content src="book.smil#par' + i + '"/>');
    stack.push(lvl);
  });
  while (stack.length) {
    stack.pop();
    navChunks.push('</navPoint>');
  }
  const navPoints = navChunks.join('\n');
  return '<?xml version="1.0" encoding="utf-8"?>\n' +
    '<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">\n' +
    '<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1" xml:lang="' + _expXmlEsc(L) + '"' + (spec.rtl ? ' dir="rtl"' : '') + '>\n' +
    '<head><meta name="dtb:uid" content="' + _expXmlEsc(uid || 'alloflow-daisy') + '"/><meta name="dtb:generator" content="AlloFlow"/><meta name="dtb:depth" content="' + maxDepth + '"/><meta name="dtb:totalPageCount" content="0"/><meta name="dtb:maxPageNumber" content="0"/></head>\n' +
    '<docTitle><text>' + _expXmlEsc(title || spec.title || 'Document') + '</text></docTitle>\n' +
    '<navMap>' + (navPoints || '<navPoint id="np1" playOrder="1"><navLabel><text>' + _expXmlEsc(title || 'Document') + '</text></navLabel><content src="book.smil#par1"/></navPoint>') + '</navMap>\n' +
    '</ncx>';
}
function _htmlToDaisySmil(html, uid) {
  const spec = _htmlToDocxSpec(html);
  const heads = (spec.blocks || []).filter((b) => b.type === 'heading');
  const pars = heads.length
    ? heads.map((_, i) => '<par id="par' + (i + 1) + '"><text src="dtbook.xml#h' + (i + 1) + '"/></par>').join('\n')
    : '<par id="par1"><text src="dtbook.xml"/></par>';
  return '<?xml version="1.0" encoding="utf-8"?>\n' +
    '<!DOCTYPE smil PUBLIC "-//NISO//DTD dtbsmil 2005-2//EN" "http://www.daisy.org/z3986/2005/dtbsmil-2005-2.dtd">\n' +
    '<smil xmlns="http://www.w3.org/2001/SMIL20/"><head><meta name="dtb:uid" content="' + _expXmlEsc(uid || 'alloflow-daisy') +
    // seq id + dtb:generator: both flagged by ZedVal 2.1 (DTD/RNG requires
    // seq@id; generator is a Schematron recommendation). (zedval-2026-07-17)
    '"/><meta name="dtb:generator" content="AlloFlow"/><meta name="dtb:totalElapsedTime" content="0:00:00"/></head><body><seq id="seq1" dur="0:00:00">' + pars + '</seq></body></smil>';
}
const _DAISY_OPF_XML = (title, lang, uid) => '<?xml version="1.0" encoding="utf-8"?>\n' +
  // OEB 1.2 DOCTYPE + dc:Date: ZedVal 2.1 requires the public identifier for
  // its OPF DTD pass and RelaxNG requires dc:Date. (zedval-2026-07-17)
  '<!DOCTYPE package PUBLIC "+//ISBN 0-9673008-1-9//DTD OEB 1.2 Package//EN" "http://openebook.org/dtds/oeb-1.2/oebpkg12.dtd">\n' +
  '<package xmlns="http://openebook.org/namespaces/oeb-package/1.0/" unique-identifier="uid">\n' +
  '<metadata><dc-metadata xmlns:dc="http://purl.org/dc/elements/1.1/">' +
  '<dc:Title>' + _expXmlEsc(title) + '</dc:Title>' +
  '<dc:Date>' + new Date().toISOString().slice(0, 10) + '</dc:Date>' +
  '<dc:Language>' + _expXmlEsc(lang || 'en') + '</dc:Language>' +
  '<dc:Format>ANSI/NISO Z39.86-2005</dc:Format>' +
  '<dc:Identifier id="uid">' + _expXmlEsc(uid || 'alloflow-daisy') + '</dc:Identifier>' +
  '<dc:Publisher>AlloFlow</dc:Publisher>' +
  '</dc-metadata><x-metadata><meta name="dtb:multimediaType" content="textNCX"/><meta name="dtb:multimediaContent" content="text"/><meta name="dtb:totalTime" content="0:00:00"/></x-metadata></metadata>\n' +
  '<manifest>' +
  '<item id="opf" href="package.opf" media-type="text/xml"/>' +
  '<item id="dtbook" href="dtbook.xml" media-type="application/x-dtbook+xml"/>' +
  '<item id="ncx" href="navigation.ncx" media-type="application/x-dtbncx+xml"/>' +
  '<item id="smil" href="book.smil" media-type="application/smil"/>' +
  '</manifest>\n<spine><itemref idref="smil"/></spine>\n</package>';

// ── EPUB3 Media Overlays (read-along) — pure helpers (2026-06-14) ────────────
// True read-along: each spoken text block gets a stable id, one TTS clip, and a
// SMIL <par> linking the id to its clip so a reading system highlights the text
// as the audio plays. These are the PURE pieces (id assignment, SMIL, OPF); the
// async handler generates the per-block audio + measures clip durations.
// Recover a WAV clip's duration from its header bytes when HTMLMediaElement reports
// 0/Infinity (default Gemini WAV: metadata never resolves, so clipEnd would collapse
// to 0s and that block would speak nothing / never highlight). Uses the SAME canonical
// header offsets as _concatAudioBlobs: byteRate@28, 'data' chunk scanned like there.
// Returns seconds (>0) or 0 when the bytes are not a parseable PCM WAV. (exp-clip-duration)
function _wavDurationFromBytes(u8) {
  try {
    if (!u8 || u8.length <= 44) return 0;
    if (!(u8[0]===0x52 && u8[1]===0x49 && u8[2]===0x46 && u8[3]===0x46 && u8[8]===0x57 && u8[9]===0x41 && u8[10]===0x56 && u8[11]===0x45)) return 0; // 'RIFF'....'WAVE'
    const byteRate = (u8[28] | (u8[29]<<8) | (u8[30]<<16) | (u8[31]<<24)) >>> 0;
    if (!(byteRate > 0)) return 0;
    let dataLen = 0;
    for (let j = 12; j < Math.min(u8.length - 8, 256); j++) {
      if (u8[j]===0x64 && u8[j+1]===0x61 && u8[j+2]===0x74 && u8[j+3]===0x61) { // 'data'
        dataLen = (u8[j+4] | (u8[j+5]<<8) | (u8[j+6]<<16) | (u8[j+7]<<24)) >>> 0;
        if (!(dataLen > 0) || dataLen > (u8.length - (j+8))) dataLen = u8.length - (j+8); // honor actual bytes if header size is 0/over-long
        break;
      }
    }
    if (!(dataLen > 0)) return 0;
    const sec = dataLen / byteRate;
    return (isFinite(sec) && sec > 0) ? sec : 0;
  } catch (_) { return 0; }
}

function _moClock(sec) {
  // SMIL clock value in seconds form (e.g. "12.345s") — valid for clipEnd and
  // media:duration. Guards NaN/negatives to 0.
  const s = (typeof sec === 'number' && isFinite(sec) && sec > 0) ? sec : 0;
  return (Math.round(s * 1000) / 1000) + 's';
}
const _ALLO_INTERACTIVE_CHROME_SEL = '.alloflow-cloze-controls,.alloflow-cs-controls,.alloflow-cs-actions,.alloflow-venn-controls,.alloflow-venn-status,.alloflow-venn-place-button,.alloflow-venn-screen-instructions,.alloflow-tl-controls,.alloflow-tl-arrows,.alloflow-glossary-controls,.alloflow-glossary-card-controls,.alloflow-glossary-card-actions,.alloflow-glossary-card-status,.alloflow-gm-controls,.alloflow-gm-status,.alloflow-faq-controls,.alloflow-dir-controls,.alloflow-cornell-controls,.alloflow-ws-controls,.alloflow-quiz-feedback,.alloflow-quiz-check-btn,.alloflow-math-symbolbar,.alloflow-math-symbar,.alloflow-math-controls,.alloflow-dbq-evidence-tracker,.alloflow-export-save-tools,.alloflow-save-status';
function _alloTeacherOnlySel() {
  return typeof _ALLO_TEACHER_ONLY_SEL === 'string'
    ? _ALLO_TEACHER_ONLY_SEL
    : '.teacher-view, [data-allo-teacher-only], [data-teacher-only], .teacher-only, .answer-key, .alloflow-teacher-copy-banner, .alloflow-cs-answer-key, .alloflow-glossary-worksheet-key, .alloflow-math-solution, .alloflow-fluency-key, .alloflow-teacher-plan, .alloflow-teacher-annotations, .alloflow-teacher-annotations-by-resource, .alloflow-gm-check-btn, .alloflow-gm-feedback, .alloflow-match-check-btn, .alloflow-match-feedback, .alloflow-teacher-notes, .alloflow-rubric-key, .alloflow-model-answer, .alloflow-sample-response, .alloflow-scoring-guide, #alloflow-interactive-object-profile, [data-teacher-note], [data-answer-key]';
}
function _alloSpeechMathSvg(root, opts) {
  if (typeof _replaceAccessibleMathAndSvgForSpeech === 'function') {
    _replaceAccessibleMathAndSvgForSpeech(root, opts);
    return;
  }
  if (!root || !root.querySelectorAll) return;
  const doc = (opts && opts.doc) || root.ownerDocument || document;
  if (!(opts && opts.includeTeacherOnly)) {
    root.querySelectorAll(_alloTeacherOnlySel()).forEach((el) => { try { el.remove(); } catch (_) {} });
  }
  const makeNode = (txt) => {
    const clean = String(txt || '').replace(/\s+/g, ' ').trim();
    return doc.createTextNode(clean ? ' ' + clean + ' ' : '');
  };
  root.querySelectorAll('math').forEach((mathEl) => {
    try {
      if (mathEl.closest && mathEl.closest('[hidden], [aria-hidden="true"]')) { mathEl.remove(); return; }
      const readable = typeof _alloLinearizeSpeechMath === 'function'
        ? _alloLinearizeSpeechMath(mathEl)
        : (() => {
            let txt = String(mathEl.getAttribute('aria-label') || mathEl.getAttribute('alttext') || '').replace(/\s+/g, ' ').trim();
            if (!txt) {
              const clone = mathEl.cloneNode(true);
              if (clone.querySelectorAll) clone.querySelectorAll('annotation, annotation-xml').forEach((a) => a.remove());
              txt = String(clone.textContent || '').replace(/\s+/g, ' ').trim() || String(mathEl.getAttribute('data-allo-latex') || '').replace(/\s+/g, ' ').trim();
            }
            return txt;
          })();
      mathEl.replaceWith(makeNode(readable));
    } catch (_) {}
  });
  root.querySelectorAll('svg').forEach((svgEl) => {
    try {
      if (svgEl.closest && svgEl.closest('.alloflow-inline-chart')) { svgEl.remove(); return; }
      if (svgEl.getAttribute('aria-hidden') === 'true' || svgEl.getAttribute('role') === 'presentation' || svgEl.getAttribute('role') === 'none' || (svgEl.closest && svgEl.closest('[hidden], [aria-hidden="true"]'))) {
        svgEl.remove();
        return;
      }
      const label = String(svgEl.getAttribute('aria-label') || Array.from(svgEl.querySelectorAll('title, desc')).map((n) => (n.textContent || '').trim()).filter(Boolean).join('. ')).replace(/\s+/g, ' ').trim();
      if (label) svgEl.replaceWith(makeNode(label));
      else svgEl.remove();
    } catch (_) {}
  });
}
function _alloChosenSelectText(sel) {
  if (!sel) return '';
  const opts = sel.options ? Array.from(sel.options) : Array.from(sel.querySelectorAll('option'));
  const selOpt = sel.selectedOptions && sel.selectedOptions[0];
  const hasVal = (o) => o && !o.disabled && String(o.getAttribute && o.getAttribute('value') != null ? o.getAttribute('value') : (o.value != null ? o.value : o.textContent || '')).trim() !== '';
  const chosen = (hasVal(selOpt) ? selOpt : null) || opts.find((o) => (o.selected || o.hasAttribute('selected')) && hasVal(o)) || null;
  return chosen ? String(chosen.textContent || chosen.value || '').replace(/\s+/g, ' ').trim() : '';
}
function _alloUnwrapInlineTermsToSpan(doc, root) {
  if (!doc || !root || !root.querySelectorAll) return;
  root.querySelectorAll('button.alloflow-inline-term').forEach((btn) => {
    const span = doc.createElement('span');
    span.className = 'alloflow-inline-term';
    if (btn.lang) span.lang = btn.lang;
    if (btn.dir) span.dir = btn.dir;
    ['data-allo-term', 'data-allo-def', 'title'].forEach((attr) => {
      const val = btn.getAttribute(attr);
      if (val) span.setAttribute(attr, val);
    });
    span.textContent = btn.textContent || '';
    btn.replaceWith(span);
  });
}
function _alloDedupeVennActivityDom(root) {
  if (!root || !root.querySelectorAll) return;
  const doc = root.ownerDocument || root;
  root.querySelectorAll('.alloflow-venn-activity').forEach((act) => {
    if (act.querySelector('.alloflow-venn-card')) {
      act.querySelectorAll('.alloflow-venn-print-only, .alloflow-venn-screen-instructions').forEach((el) => el.remove());
      act.querySelectorAll('.alloflow-venn-card').forEach((card) => {
        const btn = card.querySelector('button.alloflow-venn-card-button');
        if (!btn) return;
        const sel = card.querySelector('select.alloflow-venn-response');
        const chosenText = _alloChosenSelectText(sel);
        const p = doc.createElement('p');
        p.className = 'alloflow-venn-card-text';
        p.textContent = (btn.textContent || '').replace(/\s+/g, ' ').trim() + (chosenText ? ' — ' + chosenText : '');
        btn.replaceWith(p);
        if (sel) sel.remove();
      });
    }
  });
}
function _alloReplaceFormControlsForText(doc, root, blankToken, alloFieldsOnly, emitEmptyBlank) {
  if (!doc || !root || !root.querySelectorAll) return;
  const alloSel = 'input[data-allo-field],textarea[data-allo-field],select[data-allo-field],input[data-allo-response-key],textarea[data-allo-response-key],select[data-allo-response-key],.alloflow-response-input,.alloflow-response-select,.interactive-blank,.interactive-textarea,.alloflow-cs-response,.alloflow-venn-response';
  root.querySelectorAll('input,textarea,select').forEach((el) => {
    const tag = (el.tagName || '').toLowerCase();
    const isHidden = el.hasAttribute('hidden') || el.getAttribute('aria-hidden') === 'true' || (el.style && (el.style.display === 'none' || el.style.visibility === 'hidden'));
    const isAlloField = !alloFieldsOnly || (typeof el.matches === 'function' && el.matches(alloSel));
    if (emitEmptyBlank === false && !isAlloField) { el.remove(); return; }
    if (tag === 'input') {
      const type = String(el.getAttribute('type') || 'text').toLowerCase();
      if (type === 'hidden' || type === 'button' || type === 'submit' || type === 'reset') { el.remove(); return; }
      if (type === 'radio' || type === 'checkbox') {
        if (isHidden) { el.remove(); return; }
        const checked = el.checked || el.hasAttribute('checked');
        if (!alloFieldsOnly) el.replaceWith(doc.createTextNode(checked ? '[x] ' : '[ ] '));
        else el.remove();
        return;
      }
      if (isHidden) { el.remove(); return; }
      const val = String(el.value || el.getAttribute('value') || '').trim();
      if (val) el.replaceWith(doc.createTextNode(val));
      else if (emitEmptyBlank !== false && isAlloField) el.replaceWith(doc.createTextNode(blankToken));
      else el.remove();
      return;
    }
    if (tag === 'textarea') {
      if (isHidden) { el.remove(); return; }
      const val = String(el.value || el.textContent || '').trim();
      const outTxt = val || (emitEmptyBlank !== false && isAlloField ? blankToken : '');
      if (!outTxt) { el.remove(); return; }
      if (el.closest && el.closest('p,h1,h2,h3,h4,h5,h6,li,blockquote,figcaption,caption,dt,dd,th,td')) {
        el.replaceWith(doc.createTextNode(outTxt));
      } else {
        const p = doc.createElement('p');
        p.textContent = outTxt;
        el.replaceWith(p);
      }
      return;
    }
    if (tag === 'select') {
      const chosenTxt = _alloChosenSelectText(el);
      if (isHidden) {
        if (chosenTxt && typeof el.matches === 'function' && el.matches('select.alloflow-cs-response, select.alloflow-venn-response')) {
          el.replaceWith(doc.createTextNode(' — ' + chosenTxt));
        } else {
          el.remove();
        }
        return;
      }
      if (chosenTxt) el.replaceWith(doc.createTextNode(chosenTxt));
      else if (emitEmptyBlank !== false && isAlloField) el.replaceWith(doc.createTextNode(blankToken));
      else el.remove();
    }
  });
}
// Assign a stable id to every leaf text block + return the per-block spoken text.
// Reuses existing ids when present so the SMIL references match the xhtml. Strips
// non-spoken editor chrome (same intent as _audioReadyText) so audio == on-screen.
function _collectMoSegments(html, opts) {
  const doc = new DOMParser().parseFromString(html || '', 'text/html');
  const root = doc.body || doc.documentElement;
  const _moLang = (doc.documentElement && doc.documentElement.getAttribute('lang')) || 'en';
  const _moRtl = /<(?:html|body)\b[^>]*\bdir\s*=\s*['"]?rtl\b/i.test(String(html || '')) || /^(?:ar|fa|he|iw|ps|sd|ug|ur|yi)(?:-|$)/i.test(String(_moLang).trim());
  if (!root) return { segments: [], bodyHtml: '', lang: 'en', rtl: _moRtl };
  if (!(opts && opts.includeTeacherOnly)) {
    root.querySelectorAll(_alloTeacherOnlySel()).forEach((el) => el.remove());
  }
  _alloDedupeVennActivityDom(root);
  _alloUnwrapInlineTermsToSpan(doc, root);
  root.querySelectorAll('select[hidden]').forEach((sel) => {
    const chosenTxt = _alloChosenSelectText(sel);
    if (chosenTxt) sel.replaceWith(doc.createTextNode(' \u2014 ' + chosenTxt));
    else sel.remove();
  });
  root.querySelectorAll('.allo-img-controls, [data-alloflow-picker], [data-alloflow-nomsg], annotation, annotation-xml, [data-allo-footnote-backlink], details.allo-math-source, script, style, .allo-block-controls, .allo-block-remove, del[data-allo-change-id],[data-allo-change-kind="structure-delete"], ' + _ALLO_INTERACTIVE_CHROME_SEL).forEach((el) => el.remove());
  const SEL = 'p,h1,h2,h3,h4,h5,h6,li,blockquote,figcaption,caption,dt,dd,th,td,pre,.alloflow-cs-strip,.alloflow-cs-card,.alloflow-tl-strip';
  const segments = [];
  // EPUB requires UNIQUE ids and the read-along SMIL references each segment by id. The AI HTML can
  // carry DUPLICATE ids (a real epubcheck RSC-005 + ambiguous media-overlay), and upstream dedup runs
  // BEFORE the AI passes, so AI-reintroduced dupes survive to here. Keep an id only if it's unique so
  // far; otherwise mint a fresh id that collides with NO existing id (segment or not). (#25)
  const _seen = new Set();
  const _usedIds = new Set(Array.from(root.querySelectorAll('[id]')).map((el) => el.getAttribute('id')).filter(Boolean));
  let _uid = 0;
  const _freshMoId = () => { let _c; do { _uid++; _c = 'mo' + _uid; } while (_seen.has(_c) || _usedIds.has(_c)); return _c; };
  Array.from(root.querySelectorAll(SEL + ',textarea')).forEach((el) => {
    const _tag = (el.tagName || '').toLowerCase();
    if (_tag === 'textarea') {
      if ((el.closest && el.closest(SEL)) || el.hasAttribute('hidden') || el.getAttribute('aria-hidden') === 'true' || (el.style && el.style.display === 'none')) return;
      const taText = String(el.value || el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!taText) return;
      let _id = el.getAttribute('id');
      if (!_id || _seen.has(_id)) { _id = _freshMoId(); el.setAttribute('id', _id); }
      _seen.add(_id);
      segments.push({ id: _id, text: taText });
      return;
    }
    if (el.querySelector(SEL)) return; // only leaf blocks — don't double-speak a wrapper
    const clone = el.cloneNode(true);
    _alloReplaceFormControlsForText(doc, clone, ' blank ', true, true);
    clone.querySelectorAll('[hidden],[aria-hidden="true"],button,input,select,textarea').forEach((n) => n.remove());
    _alloSpeechMathSvg(clone, { doc, includeTeacherOnly: true });
    const text = (clone.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text) return;
    let _id = el.getAttribute('id');
    if (!_id || _seen.has(_id)) { _id = _freshMoId(); el.setAttribute('id', _id); }
    _seen.add(_id);
    segments.push({ id: _id, text });
  });
  // Serialize as XML, not innerHTML: the read-along content.xhtml is application/xhtml+xml and MUST
  // be well-formed. innerHTML leaves void elements unclosed (<input data-allo-field>, <col>, <source>,
  // …) and named entities (&mdash; &copy;) that are undefined in XML, so epubcheck / Apple Books /
  // Thorium reject the WHOLE EPUB with a parse error — while the toast claims success. XMLSerializer
  // self-closes void elements and emits literal chars while preserving foreign-content namespace re-entry. (#1)
  let bodyHtml;
  try {
    const _xs = new XMLSerializer();
    bodyHtml = Array.from(root.childNodes).map((n) => _xs.serializeToString(n)).join('').replace(/\sxmlns="([^"]+)"(?=[^<>]*\sxmlns="\1")/g, '');
  } catch (_) { bodyHtml = root.innerHTML; }
  bodyHtml = bodyHtml.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '');
  return { segments, bodyHtml, lang: _moLang, rtl: _moRtl };
}
// The shared artifact-audio service serializes vetted clips as base64 so an
// export can consume the exact bytes without keeping a live object URL alive.
// PDF Audit still needs a Blob for EPUB packaging, duration measurement, and
// the resumable downloadable-audio job.
function _pdfAuditArtifactAudioEntryToBlob(entry) {
  if (!entry || typeof Blob === 'undefined' || typeof atob !== 'function') return null;
  const encoded = String(entry.base64 || entry.b64 || entry.audio || '')
    .replace(/^data:[^,]*,/, '')
    .replace(/\s+/g, '');
  if (!encoded) return null;
  try {
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: String(entry.mime || 'audio/mpeg') });
  } catch (_) { return null; }
}

function _pdfAuditAudioLanguage(html, fallback) {
  const match = String(html || '').match(/<html\b[^>]*\blang\s*=\s*["']([^"']+)["']/i);
  const raw = (match && match[1] ? match[1] : (fallback || 'English')).trim() || 'English';
  const primary = raw.toLowerCase().split(/[-_]/)[0];
  const languageNames = {
    en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese',
    zh: 'Chinese', ja: 'Japanese', ko: 'Korean', ar: 'Arabic', hi: 'Hindi', bn: 'Bengali',
    pa: 'Punjabi', gu: 'Gujarati', ta: 'Tamil', te: 'Telugu', mr: 'Marathi', ur: 'Urdu',
    ru: 'Russian', uk: 'Ukrainian', pl: 'Polish', nl: 'Dutch', tr: 'Turkish', vi: 'Vietnamese',
    th: 'Thai', id: 'Indonesian', ms: 'Malay', sw: 'Swahili', so: 'Somali', am: 'Amharic',
    he: 'Hebrew', fa: 'Farsi', ps: 'Pashto', km: 'Khmer', my: 'Burmese', tl: 'Tagalog',
  };
  return Object.prototype.hasOwnProperty.call(languageNames, primary) ? languageNames[primary] : raw;
}
// SMIL overlay: one <par> per segment. Per-segment audio files, so each clip is
// 0..duration of its own file. `ext` is the audio extension (mp3 by default;
// the TTS service may return wav, which we pass through honestly rather than
// mislabel as mp3 — most reading systems play wav even though mp3 is the core type).
function _buildMoSmil(segments, durations, ext, hasAudio) {
  const _ext = ext || 'mp3';
  // hasAudio[idx] === false → that block's TTS failed: emit a TEXT-ONLY <par> (no
  // <audio>) instead of referencing a clip that isn't in the zip. A missing audio
  // resource makes the WHOLE EPUB invalid/unopenable (epubcheck RSC-001), so one
  // failed TTS call must NOT poison the file (2026-06-15 review P0 fix). Omitting
  // hasAudio entirely keeps the prior all-present behavior.
  const _has = (i) => !hasAudio || hasAudio[i];
  const pars = (segments || []).map((s, idx) => {
    const text = '<text src="content.xhtml#' + _expXmlEsc(s.id) + '"/>';
    if (!_has(idx)) return '<par id="par' + (idx + 1) + '">' + text + '</par>';
    const dur = (durations && durations[idx]) || 0;
    return '<par id="par' + (idx + 1) + '">' + text +
      '<audio src="audio/seg' + (idx + 1) + '.' + _ext + '" clipBegin="' + _moClock(0) + '" clipEnd="' + _moClock(dur) + '"/></par>';
  }).join('\n');
  return '<?xml version="1.0" encoding="utf-8"?>\n' +
    '<smil xmlns="http://www.w3.org/ns/SMIL" xmlns:epub="http://www.idpf.org/2007/ops" version="3.0">\n' +
    // EPUB 3 Media Overlays requires epub:textref on the seq (epubcheck RSC-005);
    // it points at the content document this overlay narrates.
    '<body><seq epub:textref="content.xhtml">' + pars + '</seq></body>\n</smil>';
}
// OPF for the media-overlay ePub: content references its overlay; manifest lists
// the SMIL + every audio clip; media:duration (global + per-overlay) is required.
function _buildMoOpf(title, lang, segments, totalSec, modifiedIso, ext, mime, hasAudio, contentProperties, opts) {
  const _ext = ext || 'mp3';
  const _mime = mime || 'audio/mpeg';
  const _allowedProps = new Set(['svg', 'mathml', 'remote-resources']);
  const _contentProps = Array.isArray(contentProperties) ? contentProperties.filter((p) => _allowedProps.has(p)) : [];
  const _contentPropAttr = _contentProps.length ? ' properties="' + Array.from(new Set(_contentProps)).join(' ') + '"' : '';
  const _isRtl = !!(opts && opts.rtl) || /^(?:ar|fa|he|iw|ps|sd|ug|ur|yi)(?:-|$)/i.test(String(lang || '').trim());
  // Only manifest the audio clips that actually exist in the zip (a declared item
  // with no file = invalid EPUB). 2026-06-15 review P0 fix.
  const _has = (i) => !hasAudio || hasAudio[i];
  const audioItems = (segments || []).map((s, i) => {
    if (!_has(i)) return '';
    const href = (s && typeof s.audioHref === 'string' && s.audioHref) ? s.audioHref : ('audio/seg' + (i + 1) + '.' + _ext);
    const remoteAttr = (/^(?:https?:)?\/\//i.test(href) || (opts && opts.remoteAudio)) ? ' properties="remote-resources"' : '';
    return '<item id="aud' + (i + 1) + '" href="' + _expXmlEsc(href) + '" media-type="' + _mime + '"' + remoteAttr + '/>';
  }).filter(Boolean).join('\n');
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid" xml:lang="' + _expXmlEsc(lang || 'en') + '"' + (_isRtl ? ' dir="rtl"' : '') + ' prefix="media: http://www.idpf.org/epub/vocab/overlays/#">\n' +
    '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n' +
    '<dc:identifier id="uid">alloflow-mo-' + Date.now() + '</dc:identifier>' +
    '<dc:title>' + _expXmlEsc(title) + '</dc:title>' +
    '<dc:language>' + _expXmlEsc(lang || 'en') + '</dc:language>' +
    '<dc:creator>AlloFlow Document Pipeline</dc:creator>' +
    '<meta property="dcterms:modified">' + _expXmlEsc(modifiedIso || new Date().toISOString().replace(/\.\d+Z/, 'Z')) + '</meta>' +
    '<meta property="media:duration">' + _moClock(totalSec) + '</meta>' +
    '<meta property="media:duration" refines="#smil">' + _moClock(totalSec) + '</meta>' +
    '<meta property="media:active-class">-epub-media-overlay-active</meta>' +
    '<meta property="schema:accessMode">textual</meta>' +
    '<meta property="schema:accessMode">auditory</meta>' +
    '<meta property="schema:accessModeSufficient">textual,auditory</meta>' +
    '<meta property="schema:accessibilityFeature">readingOrder</meta>' +
    '<meta property="schema:accessibilityFeature">synchronizedAudioText</meta>' +
    '<meta property="schema:accessibilityFeature">structuralNavigation</meta>' +
    '<meta property="schema:accessibilityHazard">none</meta>' +
    '<meta property="schema:accessibilitySummary">Read-along ebook: AlloFlow text-to-speech narration synchronized to the text via EPUB3 Media Overlays.</meta>' +
    '</metadata>\n' +
    '<manifest>\n' +
    '<item id="content" href="content.xhtml" media-type="application/xhtml+xml"' + _contentPropAttr + ' media-overlay="smil"/>\n' +
    '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>\n' +
    '<item id="smil" href="content.smil" media-type="application/smil+xml"/>\n' +
    audioItems + '\n' +
    '</manifest>\n<spine' + (_isRtl ? ' page-progression-direction="rtl"' : '') + '><itemref idref="content"/></spine>\n</package>';
}

// In-house EPUB structural self-check (2026-06-22). NOT a substitute for epubcheck — a
// CheerpJ epubcheck spike is risky (EPUB is a ZIP needing reverse seeks vs veraPDF's linear
// byte-stream). This instead validates the package WE just assembled, catching our own export
// bugs before the file ships: a dangling SMIL audio/text ref or a missing manifest file makes
// the WHOLE EPUB unopenable (epubcheck RSC-001/RSC-005), and a not-well-formed content.xhtml
// (AI body HTML) is rejected with a parse error while the toast claims success. Pure JS; takes
// the same path→content map handed to JSZip (audio entries can be any truthy placeholder — only
// existence is checked, not bytes). Uses the global DOMParser when present (browser + jsdom) for
// well-formedness; skips that sub-check where it isn't. Returns { valid, issues:[{severity,code,message}] }.
function validateEpubStructure(files) {
  const issues = [];
  const f = files || {};
  const err = (code, message) => issues.push({ severity: 'error', code, message });
  const warn = (code, message) => issues.push({ severity: 'warning', code, message });
  const has = (p) => p != null && Object.prototype.hasOwnProperty.call(f, p) && f[p] != null;
  const get = (p) => (has(p) ? String(f[p]) : '');
  // Resolve a relative href/src against a base file path (POSIX), dropping any ?query/#fragment and percent-decoding.
  const resolveRel = (base, src) => {
    let clean = String(src || '').replace(/[?#].*$/, '');
    if (!clean) return null;
    try { clean = decodeURIComponent(clean); } catch (_) {}
    const baseDir = base.indexOf('/') >= 0 ? base.replace(/\/[^/]*$/, '') : '';
    const parts = (baseDir ? baseDir.split('/') : []).concat(clean.split('/'));
    const out = [];
    for (const seg of parts) { if (seg === '' || seg === '.') continue; if (seg === '..') out.pop(); else out.push(seg); }
    return out.join('/');
  };
  // XML well-formedness via DOMParser (browser/jsdom); returns an error string or null.
  const xmlError = (p) => {
    if (typeof DOMParser === 'undefined') return null;
    try {
      const d = new DOMParser().parseFromString(get(p), 'application/xml');
      const pe = d.getElementsByTagName('parsererror')[0];
      return pe ? String(pe.textContent || 'XML parse error').replace(/\s+/g, ' ').trim().slice(0, 200) : null;
    } catch (_) { return null; }
  };
  // 1. OCF mimetype.
  if (!has('mimetype')) err('mimetype-missing', "OCF requires a 'mimetype' entry.");
  else if (get('mimetype').trim() !== 'application/epub+zip') err('mimetype-wrong', "mimetype must be exactly 'application/epub+zip'.");
  // 2. container.xml → rootfile OPF.
  const CONTAINER = 'META-INF/container.xml';
  let opfPath = null;
  if (!has(CONTAINER)) err('container-missing', 'META-INF/container.xml is required.');
  else {
    const xe = xmlError(CONTAINER); if (xe) err('container-malformed', 'container.xml is not well-formed XML: ' + xe);
    const m = get(CONTAINER).match(/full-path\s*=\s*"([^"]+)"/);
    if (!m) err('rootfile-missing', 'container.xml declares no rootfile full-path.');
    else { opfPath = m[1]; if (!has(opfPath)) err('rootfile-unresolved', "container rootfile '" + opfPath + "' is not in the package."); }
  }
  // 3. OPF manifest / spine / nav / media-overlay.
  if (opfPath && has(opfPath)) {
    const opf = get(opfPath);
    const xe = xmlError(opfPath); if (xe) err('opf-malformed', 'content.opf is not well-formed XML: ' + xe);
    const items = {};
    let im; const itemRe = /<item\b([^>]*?)\/?>/g;
    while ((im = itemRe.exec(opf))) {
      const a = im[1];
      const id = (a.match(/\bid\s*=\s*"([^"]*)"/) || [])[1];
      const href = (a.match(/\bhref\s*=\s*"([^"]*)"/) || [])[1];
      if (!id || !href) continue;
      const obj = {
        id, href,
        props: (a.match(/\bproperties\s*=\s*"([^"]*)"/) || [])[1] || '',
        mediaType: (a.match(/\bmedia-type\s*=\s*"([^"]*)"/) || [])[1] || '',
        overlay: (a.match(/\bmedia-overlay\s*=\s*"([^"]*)"/) || [])[1] || '',
        resolved: resolveRel(opfPath, href),
      };
      items[id] = obj;
      if (!has(obj.resolved)) err('manifest-href-unresolved', "manifest item '" + id + "' href '" + href + "' is not in the package.");
    }
    let sm, spineCount = 0; const spineRe = /<itemref\b([^>]*?)\/?>/g;
    while ((sm = spineRe.exec(opf))) {
      spineCount++;
      const idref = (sm[1].match(/\bidref\s*=\s*"([^"]*)"/) || [])[1];
      if (!idref || !items[idref]) err('spine-idref-unresolved', "spine itemref '" + (idref || '') + "' has no matching manifest item.");
    }
    if (spineCount === 0) err('spine-empty', 'OPF spine has no itemref.');
    if (!Object.keys(items).some((id) => /\bnav\b/.test(items[id].props))) err('nav-missing', 'OPF manifest has no properties="nav" navigation document.');
    const overlayItems = Object.keys(items).map((id) => items[id]).filter((it) => it.overlay);
    for (const it of overlayItems) {
      const ov = items[it.overlay];
      if (!ov) err('overlay-unresolved', "item '" + it.id + "' media-overlay='" + it.overlay + "' has no matching manifest item.");
      else if (!/smil/i.test(ov.mediaType)) warn('overlay-mediatype', "media-overlay target '" + it.overlay + "' is not application/smil+xml.");
    }
    if (overlayItems.length && !/property\s*=\s*"media:duration"/.test(opf)) err('duration-missing', 'media overlays are declared but no media:duration metadata is present.');
    // XHTML content documents must be well-formed XML — the AI body HTML lands in content.xhtml,
    // and a single undefined entity / unclosed void element makes a reader reject the whole EPUB.
    const manifestByPath = new Set(Object.keys(items).map((k) => items[k].resolved).filter(Boolean));
    for (const id of Object.keys(items)) {
      const it = items[id];
      if (/xhtml\+xml/i.test(it.mediaType) && has(it.resolved)) {
        const xeX = xmlError(it.resolved); if (xeX) err('xhtml-malformed', it.href + ' is not well-formed XML: ' + xeX);
        let imgM; const imgSrcRe = /<img\b[^>]*?\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)')/gi;
        const xhtmlStr = get(it.resolved);
        while ((imgM = imgSrcRe.exec(xhtmlStr))) {
          const imgSrc = String(imgM[1] || imgM[2] || '').trim();
          if (!imgSrc || /^(?:data:|https?:|\/\/)/i.test(imgSrc)) continue;
          const target = resolveRel(it.resolved, imgSrc);
          if (!target || !has(target)) err('xhtml-resource-missing', it.href + " references image '" + imgSrc + "' not in the package.");
          else if (!manifestByPath.has(target)) err('xhtml-resource-unmanifested', it.href + " references image '" + imgSrc + "' missing from OPF manifest.");
        }
      }
    }
    // 4. SMIL cross-checks: text-src ids exist; audio-src files exist; SMIL well-formed.
    const idCache = {};
    const idsOf = (path) => { if (idCache[path]) return idCache[path]; const set = new Set(); let mm; const idRe = /\bid\s*=\s*"([^"]+)"/g; const s = get(path); while ((mm = idRe.exec(s))) set.add(mm[1]); idCache[path] = set; return set; };
    for (const id of Object.keys(items)) {
      const it = items[id];
      if (!/smil/i.test(it.mediaType) || !has(it.resolved)) continue;
      const smil = get(it.resolved);
      const xe2 = xmlError(it.resolved); if (xe2) err('smil-malformed', it.href + ' is not well-formed XML: ' + xe2);
      let tm; const tRe = /<text\b[^>]*?\bsrc\s*=\s*"([^"]+)"/g;
      while ((tm = tRe.exec(smil))) {
        const src = tm[1], hash = src.indexOf('#'), target = resolveRel(it.resolved, src);
        if (!has(target)) { err('smil-text-target-missing', "SMIL text src '" + src + "' points to a file not in the package."); continue; }
        if (hash >= 0) { const frag = src.slice(hash + 1); if (frag && !idsOf(target).has(frag)) err('smil-text-id-missing', "SMIL text src '" + src + "' references id '" + frag + "' absent from " + target + "."); }
      }
      let am; const aRe = /<audio\b[^>]*?\bsrc\s*=\s*"([^"]+)"/g;
      while ((am = aRe.exec(smil))) { const target = resolveRel(it.resolved, am[1]); if (!has(target)) err('smil-audio-missing', "SMIL audio src '" + am[1] + "' is not in the package (a missing clip invalidates the whole EPUB)."); }
    }
  }
  return { valid: issues.filter((i) => i.severity === 'error').length === 0, issues };
}

// ── Alternative-format package builders (2026-07-29) ────────────────────────
// ePub 3, DAISY 3 and BRF generation used to live inside PdfAuditView as download
// handlers, so the only way to produce those formats was to render the React tree.
// That put them out of reach of the MCP connector — the surface agents use to drive
// this pipeline — even though the module ships with the bundle.
//
// The generation itself was never React-dependent, only its packaging was. These take
// an HTML string and return a plain { path: contents } map. The handlers below zip and
// download that map; the connector zips it in Node. Returning a map rather than a Blob
// is deliberate: it is what validateEpubStructure already consumes, it is inspectable in
// a test without a browser, and neither caller owns the format rules any more.

// Document language for export metadata. Three exports read it out of the <html> tag
// with the same regex; a missing lang is a WCAG 3.1.1 failure downstream, so default
// loudly to 'en' in ONE place rather than in each caller.
function _altFmtHtmlLang(html) {
  return ((typeof html === 'string' && html.match(/<html[^>]*lang=["']([^"']+)["']/i)) || [])[1] || 'en';
}
// Package identifier. Injectable so a test can assert byte-identical output twice.
function _altFmtUid(prefix) {
  const rand = (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function')
    ? globalThis.crypto.randomUUID()
    : (Date.now() + '-' + Math.random().toString(16).slice(2));
  return (prefix || 'alloflow-') + rand;
}

// Self-contained base64 data:image/* decoder inside the alt-format slice so standalone
// slice tests (which cut from _ALLO_INTERACTIVE_CHROME_SEL) do not depend on _dataImageInfo.
function _altFmtDecodeDataImage(src) {
  const match = /^data:(image\/(?:png|jpeg|jpg|gif|webp|svg\+xml));base64,([a-z0-9+/=\s]+)$/i.exec(String(src || '').trim());
  if (!match) return null;
  try {
    const mime = match[1].toLowerCase().replace('image/jpg', 'image/jpeg');
    const ext = mime === 'image/jpeg' ? 'jpg' : mime === 'image/svg+xml' ? 'svg' : mime.slice(6);
    const base64 = match[2].replace(/\s+/g, '');
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    if (mime === 'image/svg+xml') {
      const svgText = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8', { fatal: false }).decode(bytes) : bin;
      if (/<(?:script|foreignObject|iframe|object|embed)\b|\bon[a-z]+\s*=|(?:javascript|vbscript)\s*:|data\s*:\s*text\/html/i.test(svgText)) {
        return null;
      }
    }
    return { mime, ext, base64, bytes };
  } catch (_) { return null; }
}

// HTML -> well-formed XHTML. XMLSerializer handles every void element and named entity;
// the fallback covers hosts without DOMParser. The old inline version self-closed only
// <br>/<hr>/<img>, missing <input>/<col>/<source>/<wbr> and &mdash;-style entities that
// are undefined in XML — epubcheck and Apple Books reject the WHOLE book for one of them.
function _altFmtXhtmlFromHtml(html, opts) {
  let xhtml;
  try {
    const d = new DOMParser().parseFromString(String(html), 'text/html');
    if (!(opts && opts.includeTeacherOnly)) {
      d.querySelectorAll(_alloTeacherOnlySel()).forEach((el) => { try { el.remove(); } catch (_) {} });
    }
    _alloDedupeVennActivityDom(d);
    d.querySelectorAll('.alloflow-reading-tools-shell,.alloflow-hud-bar,#alloflow-step-pager,#alloflow-term-popover,.alloflow-term-popover,.alloflow-export-prompt-overlay,.alloflow-save-bar,.alloflow-turnin-bar,.alloflow-keycap,#allo-builder-view-filter,#allo-builder-paper-css,.alloflow-inline-chart svg,annotation,annotation-xml,[data-allo-footnote-backlink],details.allo-math-source,script,iframe,object,embed,base,form,del[data-allo-change-id],[data-allo-change-kind="structure-delete"],' + _ALLO_INTERACTIVE_CHROME_SEL).forEach((el) => el.remove());
    d.querySelectorAll('ins[data-allo-change-id]').forEach((ins) => { const p = ins.parentNode; if (p) { while (ins.firstChild) p.insertBefore(ins.firstChild, ins); p.removeChild(ins); } });
    _alloReplaceFormControlsForText(d, d.body || d, ' ___ ', false, true);
    _alloUnwrapInlineTermsToSpan(d, d);
    d.querySelectorAll('button,select,input,textarea').forEach((el) => el.remove());
    d.querySelectorAll('*').forEach((el) => {
      Array.from(el.attributes || []).forEach((attr) => {
        const name = attr.name.toLowerCase();
        const val = String(attr.value || '').trim();
        const normVal = val.replace(/[\u0000-\u0020]+/g, '');
        if (name.startsWith('on') || name === 'formaction' || name === 'srcdoc') { el.removeAttribute(attr.name); return; }
        if ((name === 'href' || name === 'xlink:href' || name === 'action') && /^(?:javascript|vbscript|data|file):/i.test(normVal)) {
          el.removeAttribute(attr.name);
        } else if (name === 'src') {
          const isSafeRasterData = /^data:image\/(?:png|jpeg|jpg|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(normVal);
          if (/^(?:javascript|vbscript|file):/i.test(normVal) || (/^data:/i.test(normVal) && !isSafeRasterData)) {
            el.removeAttribute(attr.name);
          }
        }
      });
    });
    d.querySelectorAll('link[rel~="stylesheet"][href]').forEach((link) => {
      const href = String(link.getAttribute('href') || '').trim();
      if (/^(?:https?:)?\/\//i.test(href)) link.remove();
    });
    d.querySelectorAll('style').forEach((style) => {
      const css = (style.textContent || '').replace(/[<\\]/g, '');
      style.textContent = css
        .replace(/@import\s+[^;\n}]+;?/gi, '')
        .replace(/@font-face\s*\{[^}]*(?:https?:|\/\/)[^}]*\}/gi, '')
        .replace(/url\(\s*(['"]?)(?:https?:)?\/\/[^)]+\)/gi, 'none')
        .replace(/image-set\s*\([^)]*\)/gi, 'none')
        .replace(/expression\s*\([^)]*\)/gi, 'none')
        .replace(/(?:javascript|vbscript)\s*:/gi, '');
    });
    d.querySelectorAll('svg').forEach((svg) => {
      if ((!svg.namespaceURI || svg.namespaceURI === 'http://www.w3.org/1999/xhtml') && !svg.getAttribute('xmlns')) {
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      }
    });
    if (opts && Array.isArray(opts.imageAssets)) {
      const _seenImg = new Map();
      d.querySelectorAll('img[src]').forEach((img) => {
        const rawSrc = String(img.getAttribute('src') || '').trim();
        if (!/^data:image\//i.test(rawSrc)) return;
        let asset = _seenImg.get(rawSrc);
        if (!asset) {
          const info = _altFmtDecodeDataImage(rawSrc);
          if (!info) return;
          const idx = opts.imageAssets.length + 1;
          const href = 'images/img-' + idx + '.' + info.ext;
          asset = { id: 'img-' + idx, href, path: 'OEBPS/' + href, mime: info.mime, base64: info.base64, bytes: info.bytes };
          opts.imageAssets.push(asset);
          _seenImg.set(rawSrc, asset);
        }
        img.setAttribute('src', asset.href);
      });
    }
    const usedIds = new Set();
    Array.from(d.querySelectorAll('[id]')).forEach((el) => {
      const raw = String(el.getAttribute('id') || '').trim();
      const base = raw.replace(/\s+/g, '-') || 'allo-id';
      let cand = base;
      let dup = 1;
      while (usedIds.has(cand)) { cand = base + '-' + dup; dup += 1; }
      usedIds.add(cand);
      if (cand !== el.getAttribute('id')) el.setAttribute('id', cand);
    });
    let secSeq = 0;
    d.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((h) => {
      if (!h.getAttribute('id')) {
        let candidate;
        do { secSeq += 1; candidate = 'sec-' + secSeq; } while (usedIds.has(candidate));
        h.setAttribute('id', candidate);
        usedIds.add(candidate);
      }
    });
    xhtml = new XMLSerializer().serializeToString(d.documentElement).replace(/\sxmlns="([^"]+)"(?=[^<>]*\sxmlns="\1")/g, '');
  } catch (_) {
    xhtml = String(html).replace(/<br>/g, '<br/>').replace(/<hr>/g, '<hr/>').replace(/<img([^>]*[^/])>/g, '<img$1/>').replace(/&nbsp;/g, '&#160;');
  }
  // ALWAYS restore the XHTML namespace on the ROOT element. The old `!includes('xmlns')`
  // test was defeated by any child xmlns (one MathML or SVG equation), leaving the root
  // in no namespace so readers reject the book.
  if (!/^<html\b[^>]*\sxmlns=/i.test(xhtml)) xhtml = xhtml.replace(/^<html\b/i, '<html xmlns="http://www.w3.org/1999/xhtml"');
  return xhtml.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '');
}

// ePub 3 package as a file map. Caller zips it with 'mimetype' STORED FIRST — that
// ordering is required by the OCF spec and is the caller's one obligation.
function _buildEpubPackageFiles(html, opts) {
  const o = opts || {};
  const title = String(o.title || 'document');
  const lang = o.lang || _altFmtHtmlLang(html);
  const uid = o.uid || _altFmtUid('alloflow-');
  const nowIso = o.modifiedIso || new Date().toISOString();
  const xmlTitle = _expXmlEsc(title);
  const isRtl = /\bdir\s*=\s*['"]?rtl\b/i.test(String(html || '')) || /^(?:ar|fa|he|iw|ps|sd|ug|ur|yi)(?:-|$)/i.test(String(lang || ''));
  const externalizeImages = o.externalizeImages !== false;
  const imageAssets = [];
  let contentXhtml = _altFmtXhtmlFromHtml(html, externalizeImages ? Object.assign({}, o, { imageAssets }) : o);
  // Ensure content.xhtml carries both lang and xml:lang on the <html> root (EPUB Accessibility 1.1 / ACE).
  if (!/^<html\b[^>]*\blang=/i.test(contentXhtml)) {
    contentXhtml = contentXhtml.replace(/^<html\b/i, '<html lang="' + _expXmlEsc(lang) + '"');
  }
  if (!/^<html\b[^>]*\bxml:lang=/i.test(contentXhtml)) {
    contentXhtml = contentXhtml.replace(/^<html\b/i, '<html xml:lang="' + _expXmlEsc(lang) + '"');
  }
  if (isRtl && !/^<html\b[^>]*\bdir=/i.test(contentXhtml)) {
    contentXhtml = contentXhtml.replace(/^<html\b/i, '<html dir="rtl"');
  }
  // Declare svg/mathml/remote-resources from the SERIALIZED contentXhtml only (not raw html):
  // _altFmtXhtmlFromHtml strips chart SVGs / math-source disclosures / teacher-only blocks,
  // and declaring properties="svg" without an <svg> in content.xhtml fails EPUBCheck OPF-015.
  const props = [];
  if (/<svg\b/i.test(String(contentXhtml || ''))) props.push('svg');
  if (/<math\b/i.test(String(contentXhtml || ''))) props.push('mathml');
  if (/<(?:img|audio|video|source|object|iframe)\b[^>]*(?:src|data)\s*=\s*["']?(?:https?:)?\/\//i.test(contentXhtml)) props.push('remote-resources');
  const propAttr = props.length ? ' properties="' + props.join(' ') + '"' : '';
  const imageManifestItems = imageAssets.map((asset) => '    <item id="' + _expXmlEsc(asset.id) + '" href="' + _expXmlEsc(asset.href) + '" media-type="' + _expXmlEsc(asset.mime) + '"/>').join('\n');

  const opf = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid" xml:lang="' + _expXmlEsc(lang) + '"' + (isRtl ? ' dir="rtl"' : '') + '>\n' +
    '  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n' +
    '    <dc:identifier id="uid">' + _expXmlEsc(uid) + '</dc:identifier>\n' +
    '    <dc:title>' + xmlTitle + '</dc:title>\n' +
    '    <dc:language>' + _expXmlEsc(lang) + '</dc:language>\n' +
    '    <dc:creator>AlloFlow Document Pipeline</dc:creator>\n' +
    '    <dc:date>' + nowIso.split('T')[0] + '</dc:date>\n' +
    '    <meta property="dcterms:modified">' + nowIso.replace(/\.\d+Z/, 'Z') + '</meta>\n' +
    '    <meta property="schema:accessMode">textual</meta>\n' +
    '    <meta property="schema:accessMode">visual</meta>\n' +
    '    <meta property="schema:accessModeSufficient">textual</meta>\n' +
    '    <meta property="schema:accessibilityFeature">structuralNavigation</meta>\n' +
    '    <meta property="schema:accessibilityFeature">tableOfContents</meta>\n' +
    '    <meta property="schema:accessibilityFeature">readingOrder</meta>\n' +
    '    <meta property="schema:accessibilityFeature">alternativeText</meta>\n' +
    (props.includes('mathml') ? '    <meta property="schema:accessibilityFeature">MathML</meta>\n' : '') +
    '    <meta property="schema:accessibilityHazard">none</meta>\n' +
    '    <meta property="schema:accessibilitySummary">Document exported by AlloFlow with navigation. Review the content, reading order, descriptions, and verification reports before distributing.</meta>\n' +
    '  </metadata>\n' +
    '  <manifest>\n' +
    '    <item id="content" href="content.xhtml" media-type="application/xhtml+xml"' + propAttr + '/>\n' +
    '    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>\n' +
    (imageManifestItems ? imageManifestItems + '\n' : '') +
    '  </manifest>\n' +
    '  <spine' + (isRtl ? ' page-progression-direction="rtl"' : '') + '><itemref idref="content"/></spine>\n' +
    '</package>';

  // Escape the id AND the heading text into nav.xhtml: an unescaped & produced malformed
  // XML, and a heading starting with an inline tag silently lost its entry. Capture the
  // FULL heading, then strip inline tags. Nest <ol> by clamped heading level so every
  // nested <ol> sits inside a preceding <li><a>...</a><ol>...</ol></li> (EPUB3 Nav valid).
  const decodeXmlEntities = (s) => String(s == null ? '' : s).replace(/&#x([0-9a-f]+);|&#(\d+);|&(quot|apos|lt|gt|amp);/gi, (full, hex, dec, named) => {
    if (hex) { const cp = parseInt(hex, 16); return Number.isFinite(cp) && cp > 0 ? String.fromCodePoint(cp) : full; }
    if (dec) { const cp = parseInt(dec, 10); return Number.isFinite(cp) && cp > 0 ? String.fromCodePoint(cp) : full; }
    const k = String(named || '').toLowerCase();
    return k === 'quot' ? '"' : k === 'apos' ? "'" : k === 'lt' ? '<' : k === 'gt' ? '>' : k === 'amp' ? '&' : full;
  });
  const navEsc = (s) => _expXmlEsc(decodeXmlEntities(s));
  const headings = [...String(contentXhtml).matchAll(/<h([1-6])[^>]*\bid="([^"]*)"[^>]*>([\s\S]*?)<\/h\1>/gi)];
  const navOl = (() => {
    if (!headings.length) return '<ol><li><a href="content.xhtml">Document</a></li></ol>';
    const parts = ['<ol>'];
    const stack = [];
    for (const m of headings) {
      const rawLvl = parseInt(m[1], 10) || 1;
      const curDepth = stack.length;
      const lvl = Math.min(rawLvl, curDepth + 1);
      const href = 'content.xhtml#' + navEsc(m[2]);
      const label = navEsc(m[3].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()) || 'Section';
      if (lvl > curDepth) {
        if (curDepth > 0) parts.push('<ol>');
        parts.push('<li><a href="' + href + '">' + label + '</a>');
        stack.push(lvl);
      } else {
        while (stack.length > lvl) {
          parts.push('</li></ol>');
          stack.pop();
        }
        parts.push('</li>\n<li><a href="' + href + '">' + label + '</a>');
      }
    }
    while (stack.length > 1) {
      parts.push('</li></ol>');
      stack.pop();
    }
    if (stack.length === 1) parts.push('</li>');
    parts.push('</ol>');
    return parts.join('');
  })();

  const files = {
    'mimetype': 'application/epub+zip',
    'META-INF/container.xml': '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
    'OEBPS/content.opf': opf,
    'OEBPS/content.xhtml': contentXhtml,
    'OEBPS/nav.xhtml': '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="' + _expXmlEsc(lang) + '" xml:lang="' + _expXmlEsc(lang) + '"' + (isRtl ? ' dir="rtl"' : '') + '>\n' +
      '<head><title lang="en" dir="ltr">Navigation</title></head>\n' +
      '<body><nav epub:type="toc" role="doc-toc"><h1 lang="en" dir="ltr">Table of Contents</h1>' + navOl + '</nav></body>\n' +
      '</html>',
  };
  const binaryFiles = {};
  for (const asset of imageAssets) {
    files[asset.path] = asset.bytes;
    binaryFiles[asset.path] = asset.base64;
  }
  // Self-check here rather than at each call site, so no caller can skip it. Advisory:
  // a structural warning should surface, not block a download the user asked for.
  let validation = { valid: true, issues: [] };
  try { validation = validateEpubStructure(files); } catch (_) {}
  return { files, binaryFiles, title, lang, uid, headings: headings.length, images: imageAssets.length, validation, storeFirst: 'mimetype' };
}

// DAISY 3 (DTBook 2005-3) full-text talking book as a file map. Text-only by design:
// DAISY readers supply speech, braille or large print themselves. Synced audio is the
// separate read-along ePub.
function _buildDaisyPackageFiles(html, opts) {
  const o = opts || {};
  let cleanHtml = String(html == null ? '' : html);
  if (!(o && o.includeTeacherOnly) && cleanHtml && typeof DOMParser !== 'undefined') {
    try {
      const d = new DOMParser().parseFromString(cleanHtml, 'text/html');
      let removed = false;
      d.querySelectorAll(_alloTeacherOnlySel()).forEach((el) => { try { el.remove(); removed = true; } catch (_) {} });
      if (removed && d.documentElement) cleanHtml = d.documentElement.outerHTML;
    } catch (_) {}
  }
  const title = String(o.title || 'document');
  const lang = o.lang || _altFmtHtmlLang(cleanHtml);
  const uid = o.uid || _altFmtUid('urn:uuid:');
  return {
    files: {
      'dtbook.xml': _htmlToDtbookXml(cleanHtml, lang, uid),
      'navigation.ncx': _htmlToDaisyNcx(cleanHtml, title, uid, lang),
      'book.smil': _htmlToDaisySmil(cleanHtml, uid),
      'package.opf': _DAISY_OPF_XML(title, lang, uid),
    },
    title, lang, uid,
  };
}

// HTML -> the plain text a braille transcriber should see. Drops non-content
// (script/style/head, editor chrome, the AI math/chart source panels), then flattens
// one line per block. The old tag-strip embossed <style> bodies, shattered a line at
// every inline tag, and its greedy &[^;]+; could swallow real text across newlines.
function _alloPrepAltFmtPlainDom(d, opts) {
  d.querySelectorAll('button.alloflow-inline-term').forEach((btn) => { try { btn.replaceWith(d.createTextNode(btn.textContent || '')); } catch (_) {} });
  if (!(opts && opts.includeTeacherOnly)) {
    d.querySelectorAll(_alloTeacherOnlySel()).forEach((el) => { try { el.remove(); } catch (_) {} });
  }
  _alloDedupeVennActivityDom(d);
  _alloReplaceFormControlsForText(d, d.body || d, ' ___ ', false, true);
}
function _altFmtHtmlToPlainText(html, opts) {
  if (!html || typeof html !== 'string') return '';
  try {
    const d = new DOMParser().parseFromString(String(html), 'text/html');
    _alloPrepAltFmtPlainDom(d, opts);
    d.querySelectorAll('script, style, title, head, .allo-block-controls, .allo-block-remove, .a11y-inspect-badge, [data-allo-crop-ui], details.allo-math-source, annotation, annotation-xml, [data-allo-footnote-backlink], .alloflow-reading-tools-shell, .alloflow-hud-bar, #alloflow-step-pager, #alloflow-term-popover, .alloflow-term-popover, .alloflow-export-prompt-overlay, .alloflow-save-bar, .alloflow-turnin-bar, .alloflow-keycap, .alloflow-inline-chart svg, [hidden], [aria-hidden="true"], button, select, input, textarea, del[data-allo-change-id],[data-allo-change-kind="structure-delete"], ' + _ALLO_INTERACTIVE_CHROME_SEL).forEach((el) => { try { el.remove(); } catch (_) {} });
    _alloSpeechMathSvg(d.body || d, { doc: d, includeTeacherOnly: !!(opts && opts.includeTeacherOnly) });
    d.querySelectorAll('img').forEach((img) => {
      try {
        const alt = String(img.getAttribute('alt') || '').replace(/\s+/g, ' ').trim();
        if (alt) img.replaceWith(d.createTextNode(' [Image: ' + alt + '] '));
        else img.remove();
      } catch (_) {}
    });
    d.querySelectorAll('tr').forEach((tr) => {
      try {
        const cells = Array.from(tr.children || []).filter((c) => {
          const t = String(c.tagName || '').toLowerCase();
          return t === 'td' || t === 'th';
        });
        cells.forEach((cell, idx) => {
          if (idx < cells.length - 1) cell.appendChild(d.createTextNode(' | '));
        });
      } catch (_) {}
    });
    d.querySelectorAll('details.allo-chart-data > summary, details.allo-image-desc > summary').forEach((el) => { try { el.remove(); } catch (_) {} });
    d.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((el) => { try { el.insertAdjacentText('beforebegin', '\n\n'); el.appendChild(d.createTextNode('\n')); } catch (_) {} });
    d.querySelectorAll('pre').forEach((el) => { try { el.insertAdjacentText('beforebegin', '\n'); } catch (_) {} });
    d.querySelectorAll('p,li,tr,caption,figcaption,blockquote,div,dt,dd,pre,br').forEach((el) => { try { el.appendChild(d.createTextNode('\n')); } catch (_) {} });
    return ((d.body && d.body.textContent) || '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  } catch (_) {
    return String(html).replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]*>/g, '\n').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&#?[a-z0-9]+;/gi, ' ').replace(/\n{3,}/g, '\n\n').trim();
  }
}

// Real ASCII Braille (BRF), Grade 1 / uncontracted. A .brf must be ASCII braille
// (0x20-0x5F North-American Braille Computer Code), NOT Unicode U+2800 patterns —
// embossers and braille displays read the ASCII bytes, so U+2800 output is
// un-embossable garbage under a "BRF" label. Capital sign (,) before each capital;
// number sign (#) before a 1-0 -> A-J digit run; standard punctuation; 40-cell wrap.
const _BRF_DIGIT = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E', '6': 'F', '7': 'G', '8': 'H', '9': 'I', '0': 'J' };
const _BRF_PUNCT = {
  ',': '1', ';': '2', ':': '3', '.': '4', '!': '6', '?': '8', '(': '"<', ')': '">', "'": "'", '-': '-', '/': '_/',
  '*': '"9', '&': '@&', '+': '"6', '=': '"7', '<': '@<', '>': '@>', '%': '.0', '^': '^', '~': '@9',
  '[': '.<', ']': '.>', '{': '_<', '}': '_>', '_': '..-', '@': '@A', '#': '_?', '$': '$', '\\': '_*'
};
const _BRF_SMART = {
  '\u2018': "'", '\u2019': "'", '\u2013': '-', '\u2014': '-', '\u2011': '-', '\u2026': '...', '\u00a0': ' ',
  '\u202f': ' ', '\u2009': ' ', '\u2002': ' ', '\u2003': ' ', '\u2007': ' ', '\u00ad': '', '\u200b': '', '\ufeff': '',
  '\u2022': '*', '\u00a9': '(c)', '\u00ae': '(R)', '\u2122': '(TM)', '\u00a7': 'sec. ', '\u20ac': 'EUR ', '\u00a3': 'GBP ', '\u00a2': ' cents',
  '\u2032': "'", '\u2033': '"',
  '\u00d7': ' * ', '\u00f7': ' / ', '\u2212': '-', '\u00b1': '+/-', '\u2264': '<=', '\u2265': '>=',
  '\u2260': '!=', '\u2248': '~=', '\u00b0': ' deg', '\u2192': ' -> ', '\u2190': ' <- ',
  '\u2194': ' <-> ', '\u21cc': ' <-> ', '\u21d2': ' => ',
  '\u00b2': '^2', '\u00b3': '^3', '\u00b9': '^1',
  '\u2070': '^0', '\u2074': '^4', '\u2075': '^5', '\u2076': '^6', '\u2077': '^7', '\u2078': '^8', '\u2079': '^9',
  '\u2080': '0', '\u2081': '1', '\u2082': '2', '\u2083': '3', '\u2084': '4',
  '\u2085': '5', '\u2086': '6', '\u2087': '7', '\u2088': '8', '\u2089': '9',
  '\u03b1': 'alpha', '\u03b2': 'beta', '\u03b3': 'gamma', '\u03b4': 'delta', '\u03b5': 'epsilon',
  '\u03b8': 'theta', '\u03bb': 'lambda', '\u03bc': 'mu', '\u03c0': 'pi', '\u03c3': 'sigma',
  '\u03a9': 'Omega', '\u221e': 'infinity', '\u221a': 'sqrt', '\u00bd': '1/2', '\u00bc': '1/4', '\u00be': '3/4'
};
const _BRF_SMART_RE = new RegExp('[' + Object.keys(_BRF_SMART).map((k) => k.replace(/[\\\]^-]/g, '\\$&')).join('') + ']', 'g');
// Private-use sentinels: curly quotes carry openness that a straight " does not, and
// braille distinguishes an opening quote (8) from a closing one (0). Park them out of
// band so the ASCII pass cannot confuse them with a literal quote. Written as escapes,
// never as literals: a re-encode of this file turns a PUA codepoint into a NUL.
const _BRF_OPEN_QUOTE = '\ue000', _BRF_CLOSE_QUOTE = '\ue001';
const _BRF_PREFIX = /[#,;@_^".]$/;
function _brfHardSplit(word, into, cells) {
  if (/^#[A-J14]+$/.test(word)) {
    while (word.length > cells) { into.push(word.slice(0, cells - 1) + '"'); word = word.slice(cells - 1); }
    if (word) into.push(word);
    return;
  }
  while (word.length > cells) {
    let cut = cells;
    // Never end a line on a prefix cell (capital/number/emphasis sign) — it would
    // re-bind to the wrong character on the next line.
    while (cut > 1 && _BRF_PREFIX.test(word.slice(0, cut))) cut--;
    into.push(word.slice(0, cut)); word = word.slice(cut);
  }
  if (word) into.push(word);
}
function _brfWrap(line, into, cells) {
  if (line.length <= cells) { into.push(line); return; }
  const words = line.split(' '); let cur = '';
  for (let word of words) {
    if (word.length > cells) { if (cur) { into.push(cur); cur = ''; } _brfHardSplit(word, into, cells); continue; }
    if (!cur) cur = word;
    else if (cur.length + 1 + word.length <= cells) cur += ' ' + word;
    else { into.push(cur); cur = word; }
  }
  if (cur) into.push(cur);
}
function _altFmtToBRF(src, opts) {
  const cells = (opts && opts.cellsPerLine) || 40;
  let norm = String(src == null ? '' : src).replace(/[\u201c\u00ab]/g, _BRF_OPEN_QUOTE).replace(/[\u201d\u00bb]/g, _BRF_CLOSE_QUOTE);
  norm = norm.replace(_BRF_SMART_RE, (c) => _BRF_SMART[c] || '');
  try { norm = norm.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (_) {}
  const out = []; let dropped = 0;
  for (const line of norm.replace(/\r\n?/g, '\n').split('\n')) {
    const chars = Array.from(line); let bl = ''; let numMode = false;
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      if (ch >= '0' && ch <= '9') { if (!numMode) { bl += '#'; numMode = true; } bl += _BRF_DIGIT[ch]; continue; }
      if (numMode && (ch === ',' || ch === '.')) { bl += _BRF_PUNCT[ch]; continue; }
      if (numMode && ch >= 'a' && ch <= 'j') bl += ';';
      numMode = false;
      if (ch >= 'a' && ch <= 'z') { bl += ch.toUpperCase(); continue; }
      if (ch >= 'A' && ch <= 'Z') {
        let end = i;
        while (end < chars.length && chars[end] >= 'A' && chars[end] <= 'Z') end++;
        const prevIsLetter = i > 0 && /[A-Za-z]/.test(chars[i - 1]);
        const nextIsLetter = end < chars.length && /[A-Za-z]/.test(chars[end]);
        if (!prevIsLetter && !nextIsLetter && end - i >= 2) { bl += ',,' + chars.slice(i, end).join(''); i = end - 1; }
        else bl += ',' + ch;
        continue;
      }
      if (ch === ' ' || ch === '\t') { bl += ' '; continue; }
      if (ch === _BRF_OPEN_QUOTE) { bl += '8'; continue; }
      if (ch === _BRF_CLOSE_QUOTE) { bl += '0'; continue; }
      if (ch === '"') { const prev = i > 0 ? chars[i - 1] : ''; bl += (!prev || /\s|[([{]/.test(prev)) ? '8' : '0'; continue; }
      if (_BRF_PUNCT[ch] !== undefined) { bl += _BRF_PUNCT[ch]; continue; }
      // A character with no Grade-1 equivalent is DROPPED, and the count is returned
      // so a caller can say so. Silent loss in a braille file is unacceptable.
      dropped++;
    }
    _brfWrap(bl, out, cells);
  }
  const brf = out.join('\r\n');
  return (opts && opts.withMeta) ? { brf, dropped } : brf;
}
// HTML straight to Grade-1 BRF, for callers with no braille plugin available.
// The in-app handler still prefers window.AlloBraille (UEB Grade 2 via liblouis) and
// falls back to this; the connector uses this directly and says which grade it used.
function _buildBrailleBrf(html, opts) {
  const text = _altFmtHtmlToPlainText(html, opts);
  const r = _altFmtToBRF(text, Object.assign({ withMeta: true }, opts || {}));
  return { brf: r.brf, dropped: r.dropped, text, grade: 1, code: 'North American Braille Computer Code (uncontracted)' };
}

// _buildDocxBlobFromSpec: map the pure spec onto the docx UMD library (d).
// Accessibility mapping: real HeadingN styles, tableHeader rows, real list
// numbering/bullets, ExternalHyperlink (keeps link semantics), ImageRun with
// altText; an image that can't embed degrades to its alt text, never silence.
async function _buildDocxBlobFromSpec(spec, d, mode) {
  // Document mode (2026-06-13): when an academic mode (APA/MLA/Chicago) is
  // active, the .docx must actually carry the formatting the preview shows —
  // otherwise picking "APA" then downloading Word gives plain Calibri,
  // single-spaced, no hanging indent (the mode looked like a no-op in the
  // format teachers actually submit). All native to docx@8.5.0; no new dep.
  const academic = !!(mode && mode.academic);
  // RTL (export-format review #2): w:bidi on every paragraph + w:rtl on every run when
  // the spec says the document is right-to-left. Word needs BOTH — bidi flips the
  // paragraph direction, rtl marks the runs as complex-script so punctuation and
  // numbers order correctly.
  const _rtl = !!spec.rtl;
  const HEADING = { 1: d.HeadingLevel.HEADING_1, 2: d.HeadingLevel.HEADING_2, 3: d.HeadingLevel.HEADING_3, 4: d.HeadingLevel.HEADING_4, 5: d.HeadingLevel.HEADING_5, 6: d.HeadingLevel.HEADING_6 };
  const runsTo = (runs) => runs.map((r) => {
    if (r.br) return new d.TextRun({ break: 1 });
    if (r.img) {
      const info = _dataImageInfo(r.img.src);
      const _inlineDeco = r.img.decorative === true || r.img.alt === '';
      if (info) {
        try {
          const size = _imageDisplayPx(info, r.img.width, r.img.height), scale = Math.min(1, 160 / Math.max(1, size.width));
          const _inlineAlt = _inlineDeco ? '' : (r.img.alt || 'Image');
          return new d.ImageRun({ data: info.bytes, transformation: { width: Math.round(size.width * scale), height: Math.round(size.height * scale) }, altText: { title: _inlineAlt, description: _inlineAlt, name: (_inlineAlt || 'decorative').slice(0, 60) } });
        } catch (_) { /* alt text below */ }
      }
      return new d.TextRun({ text: (!_inlineDeco && r.img.alt) ? '[Image: ' + r.img.alt + ']' : '', italics: true });
    }
    // Real Word footnote reference (A6) — Word auto-numbers it and links to the
    // definition in document.footnotes. Degrades to a superscript digit only if
    // the lib lacks FootnoteReferenceRun (very old CDN cache).
    if (r.footnoteId) { return (typeof d.FootnoteReferenceRun === 'function') ? new d.FootnoteReferenceRun(r.footnoteId) : new d.TextRun({ text: String(r.footnoteId), superScript: true }); }
    const isExternalLink = !!(r.link && /^(?:https?:|mailto:|tel:)/i.test(String(r.link).trim()));
    const tr = new d.TextRun({ text: r.text, bold: !!r.bold, italics: !!r.italic, underline: r.underline ? {} : undefined, strike: !!r.strike, highlight: r.highlight ? ((d.HighlightColor && d.HighlightColor.YELLOW) || 'yellow') : undefined, font: r.code ? 'Courier New' : undefined, language: r.lang ? { value: r.lang } : undefined, superScript: !!r.sup, subScript: !!r.sub, style: isExternalLink ? 'Hyperlink' : undefined, ...(_rtl ? { rightToLeft: true } : {}) });
    return isExternalLink ? new d.ExternalHyperlink({ link: r.link, children: [tr] }) : tr;
  });
  // Every Paragraph in this builder goes through _P so the bidi flag can't be missed
  // at one of the eight construction sites.
  const _P = (opts) => new d.Paragraph(_rtl ? { bidirectional: true, ...opts } : opts);
  const children = [];
  const _lang = (spec.lang || 'en');
  let _olCount = 0; // each <ol> gets its own numbering reference (allo-ol-N) so it restarts at 1
  for (const b of spec.blocks) {
    if (b.type === 'heading') {
      const hp = { heading: HEADING[b.level] || d.HeadingLevel.HEADING_6, children: runsTo(b.runs) };
      // Center the title: the H1 in an academic mode, OR any heading inside a
      // title-page block (any mode). Word's heading style stays, keeping the
      // doc navigable + tagged on Word's own PDF export.
      if (((academic && b.level === 1) || b.centered) && d.AlignmentType) hp.alignment = d.AlignmentType.CENTER;
      children.push(_P(hp));
    }
    else if (b.type === 'pagebreak') children.push(_P({ children: [new d.PageBreak()] }));
    else if (b.type === 'paragraph') {
      const pp = { children: runsTo(b.runs) };
      // Reference-list hanging indent (0.5"): first line flush, continuation
      // lines indented — required by APA-7 / MLA-9 reference lists.
      if (b.hanging) pp.indent = { left: 720, hanging: 720 };
      else if (b.indented) pp.indent = { left: 720 };
      // Title-page lines (author/affiliation/course) center in any mode.
      if (b.centered && d.AlignmentType) pp.alignment = d.AlignmentType.CENTER;
      children.push(_P(pp));
    }
    else if (b.type === 'list') {
      // Each ordered list or ordered nested sublist gets its own numbering reference
      // (allo-ol-0, allo-ol-1, …) so mixed <ol>/<ul> nesting and separate lists work cleanly.
      const _olRefs = {};
      let _prevOrd = null;
      let _prevLvl = -1;
      for (const it of b.items) {
        const _isOrd = it && it.ordered !== undefined ? !!it.ordered : !!b.ordered;
        const _lvl = it.level || 0;
        if (_isOrd) {
          if (!_olRefs[_lvl] || _lvl > _prevLvl || (_lvl === _prevLvl && !_prevOrd)) {
            _olRefs[_lvl] = 'allo-ol-' + (_olCount++);
          }
          for (const k of Object.keys(_olRefs)) {
            if (Number(k) > _lvl) delete _olRefs[k];
          }
        }
        _prevOrd = _isOrd;
        _prevLvl = _lvl;
        children.push(_P({
          children: runsTo(it.runs),
          ...(_isOrd ? { numbering: { reference: _olRefs[_lvl], level: Math.min(_lvl, 4) } } : { bullet: { level: Math.min(_lvl, 8) } }),
        }));
      }
    } else if (b.type === 'table' && b.rows.length) {
      children.push(new d.Table({
        style: 'TableGrid',
        width: { size: 100, type: d.WidthType.PERCENTAGE },
        // RTL (#2): flip the table's visual column order for right-to-left documents.
        ...(_rtl ? { visuallyRightToLeft: true } : {}),
        rows: b.rows.map((row) => new d.TableRow({
          tableHeader: !!row.header,
          cantSplit: true,
          children: row.cells.map((c) => new d.TableCell({
            // Merged cells (A5): columnSpan → OOXML gridSpan; rowSpan → vMerge chain.
            // The spec's HTML source omits covered cells, matching the docx lib contract.
            ...(c.colSpan > 1 ? { columnSpan: c.colSpan } : {}),
            ...(c.rowSpan > 1 ? { rowSpan: c.rowSpan } : {}),
            children: [_P({ children: runsTo(c.header ? c.runs.map((run) => ({ ...run, bold: true })) : c.runs) })],
          })),
        })),
      }));
    } else if (b.type === 'image') {
      let placed = false;
      if (b.src) {
        try {
          const info = _dataImageInfo(b.src);
          if (!info) throw new Error('Unsupported image data');
          const size = _imageDisplayPx(info, b.width, b.height);
          const _isDecorative = b.decorative === true || b.alt === '';
          const _imgAlt = _isDecorative ? '' : (b.alt || 'Image');
          children.push(_P({ children: [new d.ImageRun({ data: info.bytes, transformation: size, altText: { title: _imgAlt, description: _imgAlt, name: (_imgAlt || 'decorative').slice(0, 60) } })] }));
          placed = true;
        } catch (_) { /* degrade to the alt-text paragraph below */ }
      }
      if (!placed && b.decorative !== true) children.push(_P({ children: [new d.TextRun({ text: '[Image: ' + (b.alt || 'no description available') + ']', italics: true })] }));
      // Word-NATIVE editable math (2026-06-10, item 7): LaTeX → MathML
      // (temml) → OMML (mathml2omml) → ImportedXmlComponent. The equation
      // image stays as visual ground truth; the editable equation follows it.
      // Any failure in the chain → image+spoken-alt alone (prior behavior).
      if (b.latex && typeof _latexToOmml === 'function') {
        try {
          const omml = await _latexToOmml(b.latex);
          if (omml && d.ImportedXmlComponent && typeof d.ImportedXmlComponent.fromXmlString === 'function') {
            children.push(_P({ children: [d.ImportedXmlComponent.fromXmlString(omml)] }));
            children.push(_P({ children: [new d.TextRun({ text: 'Editable equation (AI-transcribed from the image above — verify before reuse).', italics: true, size: 16 })] }));
          }
        } catch (_) { /* fail-soft: image + spoken alt already carry the math */ }
      }
    }
  }
  const _docOpts = {
    title: spec.title,
    creator: 'AlloFlow',
    // One numbering definition per ordered list so each <ol> restarts (see _olCount
    // above); falls back to a single unused definition when there are no <ol>s.
    numbering: { config: Array.from({ length: Math.max(_olCount, 1) }, (_v, _i) => ({ reference: 'allo-ol-' + _i, levels: [0, 1, 2, 3, 4].map((l) => ({ level: l, format: d.LevelFormat.DECIMAL, text: '%' + (l + 1) + '.', alignment: d.AlignmentType.START })) })) },
    // Document default language (w:lang in docDefaults) — Word's Accessibility
    // Checker flags a .docx with no document language. Follows the CONTENT language
    // (spec.lang, read from the source <html lang>), not the UI language.
    styles: { default: { document: { run: { language: { value: _lang } } } } },
    sections: [{
      // Academic modes: 1-inch margins (1440 twips) — APA/MLA/Chicago standard.
      ...(academic ? { properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } } } : {}),
      children: children.length ? children : [new d.Paragraph({ children: [new d.TextRun({ text: ' ' })] })],
    }],
  };
  // Real Word footnotes (A6): map each collected note into the document's footnote
  // store (id → paragraph). The in-text FootnoteReferenceRun(id) links to it, so
  // the .docx gets bottom-of-page footnotes that Word's own PDF export tags /Note
  // — instead of a plain trailing list.
  if (spec.footnotes && Object.keys(spec.footnotes).length && typeof d.FootnoteReferenceRun === 'function') {
    const _fn = {};
    for (const id of Object.keys(spec.footnotes)) {
      try { _fn[id] = { children: [_P({ children: runsTo(spec.footnotes[id]) })] }; } catch (_) {}
    }
    if (Object.keys(_fn).length) _docOpts.footnotes = _fn;
  }
  if (academic) {
    // Document defaults: Times New Roman 12pt (size is in half-points), double
    // spacing (240 twips = single, 480 = double). Rides every body run.
    // Heading overrides: APA-style headings are TNR 12pt bold black — NOT Word's
    // large coloured default. We override only the RUN of each heading style, so
    // they stay REAL Word headings (navigable + tagged on Word's PDF export) but
    // look academic. L1 centering is handled per-block above.
    const _acHead = { font: 'Times New Roman', size: 24, bold: true, color: '000000' };
    _docOpts.styles = { default: {
      document: {
        // academic mode replaces the whole styles block, so re-carry the document
        // language (w:lang) here too — otherwise the academic path drops it.
        run: { font: 'Times New Roman', size: 24, language: { value: _lang } },
        paragraph: { spacing: { line: 480, lineRule: (d.LineRuleType && d.LineRuleType.AUTO) || 'auto' } },
      },
      heading1: { run: _acHead }, heading2: { run: _acHead }, heading3: { run: _acHead },
      heading4: { run: _acHead }, heading5: { run: _acHead }, heading6: { run: _acHead },
    } };
  }
  const docFile = new d.Document(_docOpts);
  return d.Packer.toBlob(docFile);
}

// ── Writing check (Harper) ── (2026-06-13: ported from the export builder so
// grammar checking is reachable in the MAIN document builder, not only the
// export view). Open-source spelling and grammar checker (Rust→WASM,
// Apache-2.0, Automattic)
// that runs ENTIRELY in the browser — no document text ever leaves the device
// (FERPA posture). English-only; first run downloads ~18 MB WASM (browser-cached
// after). Harper's SpellCheck rule is kept explicitly on so corrections remain
// available in AlloFlow when a host iframe does not expose the browser's native
// spelling menu. The pinned ESM + WASM runtime is served as versioned static
// assets from AlloFlow's Pages CDN; the function-wrapped import keeps esbuild
// from resolving it.
let _pdfHarperPromise = null;
function _ensurePdfHarper() {
  if (_pdfHarperPromise) return _pdfHarperPromise;
  _pdfHarperPromise = (async () => {
    const _imp = new Function('u', 'return import(u)');
    const isDesktop = typeof window !== 'undefined' && window._isDesktopBundledApp === true;
    const localRoot = (typeof window !== 'undefined' && window.location && /^https?:$/i.test(window.location.protocol))
      ? new URL('vendor/harper/2.4.0', window.location.href).href.replace(/\/$/, '')
      : '';
    const candidates = isDesktop
      ? (localRoot ? [localRoot] : [])
      : (localRoot ? [localRoot, 'https://alloflow-cdn.pages.dev/vendor/harper/2.4.0'] : ['https://alloflow-cdn.pages.dev/vendor/harper/2.4.0']);
    let lastErr = new Error('Harper offline bundle unavailable in desktop mode.');
    for (const assetRoot of candidates) {
      try {
        const mod = await _imp(assetRoot + '/index.js');
        const binary = await mod.createBinaryModuleFromUrl(assetRoot + '/harper_wasm_full_bg.wasm', 'full');
        const linter = new mod.LocalLinter({ binary });
        if (linter.setup) await linter.setup();
        if (linter.getLintConfig && linter.setLintConfig) {
          const config = await linter.getLintConfig();
          if (!config || config.SpellCheck !== true) {
            await linter.setLintConfig({ ...(config || {}), SpellCheck: true });
          }
        }
        return linter;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr;
  })();
  _pdfHarperPromise.catch(() => { _pdfHarperPromise = null; }); // failed load -> allow retry
  return _pdfHarperPromise;
}
// end _ensurePdfHarper

// Keep this helper byte-for-byte aligned with the export-preview copy. Both
// panels apply suggestions inside an editable iframe and need the same undoable
// insertText path plus a safe direct-write fallback.
function _applyHarperTextReplacement(doc, textNode, localStart, badLength, replacement) {
  if (!doc || !textNode || textNode.nodeType !== 3 || !Number.isInteger(localStart) || !Number.isInteger(badLength)) return false;
  const raw = textNode.textContent || '';
  if (localStart < 0 || badLength < 0 || localStart + badLength > raw.length) return false;
  let applied = false;
  try {
    const range = doc.createRange();
    range.setStart(textNode, localStart);
    range.setEnd(textNode, localStart + badLength);
    const selection = doc.getSelection ? doc.getSelection() : doc.defaultView?.getSelection?.();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
      applied = Boolean(doc.execCommand?.('insertText', false, String(replacement)));
    }
  } catch (_) { applied = false; }
  if (!applied) {
    textNode.textContent = raw.slice(0, localStart) + String(replacement) + raw.slice(localStart + badLength);
  }
  try { doc.body?.setAttribute('data-allo-user-edited', '1'); } catch (_) {}
  return true;
}
// end _applyHarperTextReplacement

// ── Accessible PowerPoint (.pptx) export ────────────────────────────────────
// _ensurePptxLib: lazy-load the pptxgenjs bundle (window.PptxGenJS). Two
// verified mirrors — cdnjs does not carry the 3.12 bundle.
function _ensurePptxLib() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.PptxGenJS) return Promise.resolve(window.PptxGenJS);
  if (document.getElementById('pptxlib-cdn')) {
    return new Promise((resolve) => {
      const t0 = Date.now();
      const t = setInterval(() => {
        if (window.PptxGenJS) { clearInterval(t); resolve(window.PptxGenJS); }
        else if (Date.now() - t0 > 15000) { clearInterval(t); resolve(window.PptxGenJS || null); }
      }, 100);
    });
  }
  if (window._isDesktopBundledApp === true) return Promise.resolve(null);
  const urls = [
    'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js',
    'https://unpkg.com/pptxgenjs@3.12.0/dist/pptxgen.bundle.js',
  ];
  const pptxSri = 'sha384-Cck14aA9cifjYolcnjebXRfWGkz5ltHMBiG4px/j8GS+xQcb7OhNQWZYyWjQ+UwQ';
  return new Promise((resolve) => {
    const tryAt = (i) => {
      if (i >= urls.length) { resolve(null); return; }
      const s = document.createElement('script');
      s.id = 'pptxlib-cdn';
      s.src = urls[i];
      s.integrity = pptxSri;
      s.crossOrigin = 'anonymous';
      s.referrerPolicy = 'no-referrer';
      s.async = true;
      s.onload = () => resolve(window.PptxGenJS || null);
      s.onerror = () => { try { s.remove(); } catch (_) {} tryAt(i + 1); };
      document.head.appendChild(s);
    };
    tryAt(0);
  });
}

// _docxSpecToSlides: pure chunker from the _htmlToDocxSpec block-spec to a
// slide deck spec. h1/h2 start a new slide (its text = the slide TITLE — the
// #1 PowerPoint accessibility-checker item); content overflows onto
// "(cont.)" slides so nothing is silently dropped. Library-free so it stays
// unit-testable — tests/view_pdf_audit_slides_spec.test.js extracts it at
// runtime; keep the "// end _docxSpecToSlides" marker intact.
function _docxSpecToSlides(spec) {
  const slides = [];
  let cur = null;
  const MAX_LINES = 13;
  const runsText = (runs) => (runs || []).map((r) => (r.br ? ' ' : r.img ? (r.img.alt ? '[Image: ' + r.img.alt + ']' : '') : (r.text || ''))).join('').replace(/\s+/g, ' ').trim();
  const cleanTitle = (title) => String(title || '').replace(/ \(cont\.\)$/i, '').trim();
  const newSlide = (title, continuation) => {
    const base = cleanTitle(title || spec.title || 'Document').slice(0, 120) || 'Document';
    cur = { title: continuation ? base + ' (cont.)' : base, items: [], lineEst: 0 };
    slides.push(cur);
  };
  const estimateLines = (text, width) => {
    const chars = Math.max(28, width || 78);
    return Math.max(1, String(text || '').split(/\n/).reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / chars)), 0));
  };
  const splitText = (text, maxChars) => {
    const value = String(text || '').trim();
    if (!value) return [];
    const chunks = [];
    let remaining = value;
    const limit = Math.max(120, maxChars || 650);
    while (remaining.length > limit) {
      let at = remaining.lastIndexOf(' ', limit);
      if (at < Math.floor(limit * 0.55)) at = remaining.indexOf(' ', limit);
      if (at < 1) at = limit;
      chunks.push(remaining.slice(0, at).trim());
      remaining = remaining.slice(at).trim();
    }
    if (remaining) chunks.push(remaining);
    return chunks;
  };
  const pushItem = (item, lines) => {
    const needed = Math.max(1, Math.min(MAX_LINES, lines || 1));
    if (!cur) newSlide(spec.title || 'Document', false);
    if (cur.items.length && cur.lineEst + needed > MAX_LINES) newSlide(cur.title, true);
    cur.items.push(item);
    cur.lineEst += needed;
  };
  let logicalImages = 0, logicalTables = 0, logicalBullets = 0;
  for (const b of (spec.blocks || [])) {
    if (b.type === 'heading') {
      const text = runsText(b.runs);
      if (!text) continue;
      if (b.level <= 2) newSlide(text, false);
      else splitText(text, 420).forEach((part) => pushItem({ kind: 'subhead', text: part }, Math.min(3, estimateLines(part, 70) + 1)));
    } else if (b.type === 'paragraph') {
      const text = runsText(b.runs);
      splitText(text, 650).forEach((part) => pushItem({ kind: 'text', text: part }, estimateLines(part, 76)));
    } else if (b.type === 'list') {
      for (const item of (b.items || [])) {
        const text = runsText(item.runs);
        const parts = splitText(text, 480);
        parts.forEach((part) => {
          pushItem({ kind: 'bullet', text: part, level: Math.min(item.level || 0, 4) }, estimateLines(part, 68 - Math.min(item.level || 0, 4) * 6));
          logicalBullets++;
        });
      }
    } else if (b.type === 'table') {
      const rows = (b.rows || []).map((r) => ({ header: !!r.header, cells: (r.cells || []).map((c) => ({ text: runsText(c.runs), header: !!c.header, scope: c.scope || '', colSpan: c.colSpan || 1, rowSpan: c.rowSpan || 1 })) }));
      if (!rows.length) continue;
      logicalTables++;
      const tableColumns = Math.max(1, ...rows.map((row) => row.cells.length));
      const tableCharsPerLine = Math.max(22, Math.floor(120 / tableColumns));
      const headerRows = [];
      while (headerRows.length < rows.length && rows[headerRows.length].header) headerRows.push(rows[headerRows.length]);
      const bodyRows = rows.slice(headerRows.length);
      const pages = [];
      let page = headerRows.slice(), lineCount = headerRows.reduce((sum, row) => sum + Math.max(1, ...row.cells.map((c) => estimateLines(c.text, tableCharsPerLine))), 0);
      for (const row of bodyRows.length ? bodyRows : (headerRows.length ? [] : rows)) {
        const rowLines = Math.min(5, Math.max(1, ...row.cells.map((c) => estimateLines(c.text, tableCharsPerLine))));
        if (page.length > headerRows.length && lineCount + rowLines > 11) {
          pages.push(page); page = headerRows.slice(); lineCount = headerRows.length;
        }
        page.push(row); lineCount += rowLines;
      }
      if (page.length) pages.push(page);
      pages.forEach((pageRows) => pushItem({ kind: 'table', rows: pageRows, repeatHeader: headerRows.length }, Math.min(10, pageRows.reduce((sum, row) => sum + Math.max(1, ...row.cells.map((c) => estimateLines(c.text, tableCharsPerLine))), 0) + 1)));
    } else if (b.type === 'image') {
      logicalImages++;
      pushItem({ kind: 'image', src: b.src || null, alt: b.alt || '', width: b.width, height: b.height }, 8);
    } else if (b.type === 'pagebreak') {
      if (cur && cur.items.length) newSlide(cur.title, true);
    }
  }
  const counts = { slides: slides.length, images: logicalImages, tables: logicalTables, bullets: logicalBullets, titled: slides.filter((slide) => !!slide.title).length };
  return { title: spec.title, lang: spec.lang, rtl: !!spec.rtl, slides, counts };
}
// end _docxSpecToSlides

// ── Accessible PPTX themes ──
// Every preset text/background pair is >= 4.5:1 (WCAG AA), and
// _sanitizePptxTheme re-enforces that deterministically at build time —
// including on AI-suggested palettes, whose text colors snap to black or
// white if the suggestion is illegible. The AI picks MOOD, never legibility.
const _PPTX_THEMES = {
  classic: { label: 'Classic Light', bg: 'FFFFFF', title: '1F2937', body: '111827', tableHeadFill: 'E5E7EB', tableBorder: 'CBD5E1', font: 'Arial' },
  midnight: { label: 'Midnight', bg: '0F172A', title: 'C7D2FE', body: 'E2E8F0', tableHeadFill: '1E293B', tableBorder: '64748B', font: 'Arial' },
  sunrise: { label: 'Sunrise', bg: 'FFF7ED', title: '7C2D12', body: '431407', tableHeadFill: 'FFEDD5', tableBorder: 'FDBA74', font: 'Georgia' },
  forest: { label: 'Forest', bg: 'F0FDF4', title: '14532D', body: '052E16', tableHeadFill: 'DCFCE7', tableBorder: '4ADE80', font: 'Arial' },
  highcontrast: { label: 'High Contrast', bg: 'FFFFFF', title: '000000', body: '000000', tableHeadFill: 'D4D4D4', tableBorder: '000000', font: 'Arial' },
};
function _pptxHexLum(hex) {
  const h = String(hex || '').replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const f = (i) => { const c = parseInt(h.slice(i, i + 2), 16) / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(0) + 0.7152 * f(2) + 0.0722 * f(4);
}
function _pptxContrast(a, b) {
  const la = _pptxHexLum(a), lb = _pptxHexLum(b);
  if (la == null || lb == null) return 0;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function _sanitizePptxTheme(raw) {
  const base = _PPTX_THEMES.classic;
  const t = { ...base, ...(raw || {}) };
  for (const k of ['bg', 'title', 'body', 'tableHeadFill', 'tableBorder']) {
    t[k] = String(t[k] || base[k]).replace('#', '').toUpperCase();
    if (!/^[0-9A-F]{6}$/.test(t[k])) t[k] = base[k];
  }
  const snapTo = (c, against) => _pptxContrast(c, against) >= 4.5 ? c : (_pptxContrast('000000', against) >= _pptxContrast('FFFFFF', against) ? '000000' : 'FFFFFF');
  t.title = snapTo(t.title, t.bg);
  t.body = snapTo(t.body, t.bg);
  t.tableHeadText = snapTo(t.body, t.tableHeadFill);
  t.font = (typeof t.font === 'string' && t.font.trim()) ? t.font.trim().slice(0, 40) : 'Arial';
  return t;
}
// end _pptx theme helpers

// _buildPptxBlobFromSlides: map the deck spec onto pptxgenjs (P). A11y
// mapping: real slide titles, insertion order = reading order, bullets with
// indent levels, header-styled table rows, images with altText (a data-URL
// image that can't embed degrades to its alt text — never silence).
async function _buildPptxBlobFromSlides(deck, P, theme) {
  const th = _sanitizePptxTheme(theme);
  const p = new P();
  try {
    p.title = deck.title || 'Accessible deck';
    p.subject = 'Slide deck prepared with AlloFlow accessibility tools; not a certification of conformance';
    p.author = 'AlloFlow';
    p.company = 'AlloFlow';
  } catch (_) {}
  try { p.layout = 'LAYOUT_16x9'; } catch (_) {}
  try { p.lang = deck.lang || 'en'; p.rtlMode = !!deck.rtl; } catch (_) {}
  let hasTitleMaster = false;
  try {
    if (typeof p.defineSlideMaster === 'function') {
      p.defineSlideMaster({
        title: 'ALLOFLOW_CONTENT',
        background: { color: th.bg },
        margin: [0.25, 0.5, 0.35, 0.5],
        objects: [
          { placeholder: { options: { name: 'slideTitle', type: 'title', x: 0.5, y: 0.22, w: 8.65, h: 0.72, fontSize: 27, bold: true, color: th.title, fontFace: th.font, fit: 'shrink', margin: 0.02, valign: 'mid', align: deck.rtl ? 'right' : 'left' }, text: '' } },
          { line: { x: 0.5, y: 1.02, w: 9, h: 0, line: { color: th.tableBorder, pt: 1 } } },
          { text: { text: deck.title || 'Accessible deck', options: { x: 0.5, y: 5.28, w: 7.7, h: 0.18, fontSize: 8, color: th.body, transparency: 28, margin: 0, fit: 'shrink' } } },
          { slideNumber: { x: 9.0, y: 5.25, w: 0.45, h: 0.2, fontSize: 9, color: th.body, align: 'right' } },
        ],
      });
      hasTitleMaster = true;
    }
  } catch (_) {}
  for (const s of deck.slides) {
    const slide = hasTitleMaster ? p.addSlide('ALLOFLOW_CONTENT') : p.addSlide();
    try { slide.background = { color: th.bg }; } catch (_) {}
    let y = s.title ? 1.16 : 0.35;
    if (s.title) {
      slide.addText(s.title, hasTitleMaster ? { placeholder: 'slideTitle' } : { x: 0.5, y: 0.22, w: 9, h: 0.72, fontSize: 27, bold: true, color: th.title, fontFace: th.font, fit: 'shrink', margin: 0.02, align: deck.rtl ? 'right' : 'left' });
    }
    let runs = [];
    const estimateRunLines = (run) => {
      const width = 78 - (run.kind === 'bullet' ? Math.min(run.level || 0, 4) * 7 : 0);
      return Math.max(1, Math.ceil(String(run.text || '').length / Math.max(32, width))) + (run.kind === 'subhead' ? 1 : 0);
    };
    const flushText = () => {
      if (!runs.length) return;
      const lineCount = runs.reduce((sum, run) => sum + estimateRunLines(run), 0);
      const available = Math.max(0.45, 5.12 - y);
      const h = Math.min(available, Math.max(0.55, lineCount * 0.27 + 0.12));
      slide.addText(
        runs.map((r) => ({ text: r.text, options: { bullet: r.kind === 'bullet' ? { indent: 16 + Math.min(r.level || 0, 4) * 14 } : undefined, hanging: r.kind === 'bullet' ? 4 : undefined, bold: r.kind === 'subhead', fontSize: r.kind === 'subhead' ? 19 : 15.5, breakLine: true, paraSpaceAfterPt: r.kind === 'subhead' ? 5 : 3 } })),
        { x: 0.55, y, w: 8.9, h, valign: 'top', color: th.body, fontFace: th.font, fit: 'shrink', margin: 0.04, breakLine: false, align: deck.rtl ? 'right' : 'left', rtlMode: !!deck.rtl }
      );
      y += h + 0.08;
      runs = [];
    };
    for (const it of s.items) {
      if (it.kind === 'text' || it.kind === 'bullet' || it.kind === 'subhead') { runs.push(it); continue; }
      flushText();
      if (it.kind === 'table' && it.rows.length) {
        const tableRows = it.rows.map((r) => r.cells.map((c) => {
          const text = (typeof c === 'string') ? c : (c && c.text) || '';
          const colSpan = (c && c.colSpan) || 1, rowSpan = (c && c.rowSpan) || 1;
          return { text, options: { ...((r.header || (c && c.header)) ? { bold: true, fill: th.tableHeadFill, color: th.tableHeadText } : {}), ...(colSpan > 1 ? { colspan: colSpan } : {}), ...(rowSpan > 1 ? { rowspan: rowSpan } : {}), margin: 0.035, valign: 'middle', align: deck.rtl ? 'right' : 'left' } };
        }));
        const columnCount = Math.max(1, ...it.rows.map((row) => row.cells.length));
        const fontSize = Math.max(9, Math.min(12, 13 - Math.max(0, columnCount - 3) * 0.6));
        slide.addTable(tableRows, {
          x: 0.55, y, w: 8.9, fontSize,
          border: { type: 'solid', color: th.tableBorder, pt: 0.6 },
          color: th.body, fontFace: th.font, margin: 0.035,
          autoPage: false,
        });
        const rowLines = it.rows.reduce((sum, row) => sum + Math.max(1, ...row.cells.map((cell) => Math.ceil(String((cell && cell.text) || cell || '').length / Math.max(16, Math.floor(68 / columnCount))))), 0);
        y += Math.min(3.9, Math.max(0.55, rowLines * 0.28)) + 0.15;
      } else if (it.kind === 'image') {
        let placed = false;
        const boxH = Math.max(1.2, Math.min(3.75, 5.1 - y));
        if (it.src && /^data:image\//.test(it.src)) {
          try {
            const data = it.src.replace(/^data:/, '');
            slide.addImage({ data, x: 0.6, y, w: 8.8, h: boxH, sizing: { type: 'contain', x: 0.6, y, w: 8.8, h: boxH }, altText: it.alt || 'Image' });
            y += boxH + 0.12;
            placed = true;
          } catch (_) { /* degrade below */ }
        }
        if (!placed) {
          slide.addText('[Image: ' + (it.alt || 'no description available') + ']', { x: 0.55, y, w: 8.9, h: 0.55, italic: true, fontSize: 13.5, color: th.body, fit: 'shrink', margin: 0.04, align: deck.rtl ? 'right' : 'left' });
          y += 0.62;
        }
      }
    }
    flushText();
  }
  return p.write({ outputType: 'blob' });
}

// Merge multiple TTS audio Blobs into ONE downloadable file.
// callTTS returns a COMPLETE audio file per segment. For WAV (the Gemini TTS path)
// each blob carries its own 44-byte RIFF header, so naively Blob-concatenating them
// embeds extra RIFF headers mid-stream — players stop after the first segment
// (silent/glitchy audio). We strip each WAV down to its PCM data and write ONE header,
// mirroring the working leveled-text path (audio_helpers pcmToWav). MP3 fallback blobs
// (frame-based) concatenate cleanly, so those are left untouched. Self-contained: no
// new props (callTTS already supplies the per-segment WAV); avoids a host prop change.
// _srStyleTextFromHtml (2026-06-11, maintainer ask): serialize the document
// the way a SCREEN READER would announce it — heading levels, list/item
// counts, table dimensions and row-by-row cells, image alts. Lets anyone
// hear the structural experience through plain TTS: sighted teachers
// previewing the SR experience, low-vision users who want structure cues
// without running a screen reader.
// Audio text preparation (2026-06-12, maintainer ask): strip everything a
// LISTENER was never meant to hear — deterministically (it's all markup we
// emit ourselves, so a DOM pass catches it exactly; no AI, no fidelity
// risk, no quota):
//   • editor scaffolding — unfilled image placeholders (collapse to
//     'Image: caption.'), picker grids, sizer bars
//   • reviewer chrome — <details> SUMMARY lines ('Text from this image
//     (AI-transcribed)'); the body content still reads
//   • per-block honesty footnotes + translation/plain banners — they're
//     for the reader's EYES; the listener gets content
//   • LaTeX source beside MathML (TTS would spell \frac{...})
//   • figures WITH images: one spoken 'Image: {caption-or-alt}.' instead
//     of silence (plain textContent skips alt entirely)
// Block boundaries gain sentence pauses so headings/cells don't run
// together. The SR-style serializer is untouched (already curated).
const _ALLO_TEACHER_ONLY_SEL = '.teacher-view, [data-allo-teacher-only], [data-teacher-only], .teacher-only, .answer-key, .alloflow-teacher-copy-banner, .alloflow-cs-answer-key, .alloflow-glossary-worksheet-key, .alloflow-math-solution, .alloflow-fluency-key, .alloflow-teacher-plan, .alloflow-teacher-annotations, .alloflow-teacher-annotations-by-resource, .alloflow-gm-check-btn, .alloflow-gm-feedback, .alloflow-match-check-btn, .alloflow-match-feedback, .alloflow-teacher-notes, .alloflow-rubric-key, .alloflow-model-answer, .alloflow-sample-response, .alloflow-scoring-guide, #alloflow-interactive-object-profile, [data-teacher-note], [data-answer-key]';

function _alloLinearizeSpeechMath(mathEl) {
  if (!mathEl) return '';
  const cleanSp = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const explicit = cleanSp((mathEl.getAttribute && (mathEl.getAttribute('aria-label') || mathEl.getAttribute('alttext'))) || '');
  if (explicit) return explicit;
  const mathAtom = (s) => (/^[A-Za-z0-9.]+$/.test(s) ? s : '(' + s + ')');
  const mathBase = (s) => (/^[A-Za-z0-9.]+$/.test(s) || Array.from(s).length === 1 ? s : '(' + s + ')');
  const mathScript = (s) => (/^-?[A-Za-z0-9]+$/.test(s) ? s : '(' + s + ')');
  const OVER_ACCENT = { '\u00af': 'bar', '\u203e': 'bar', '\u02c9': 'bar', '_': 'bar', '^': 'hat', '\u02c6': 'hat', '~': 'tilde', '\u02dc': 'tilde', '\u2192': 'vec', '\u20d7': 'vec', '\u02d9': 'dot', '\u00a8': 'ddot' };
  const walkMath = (node, depth = 0) => {
    if (!node || depth > 64) return '';
    if (node.nodeType === 3) return String(node.nodeValue || node.textContent || '');
    if (node.nodeType !== 1) return '';
    const nextDepth = depth + 1;
    const t = String(node.tagName || '').toLowerCase();
    if (t === 'annotation' || t === 'annotation-xml') return '';
    if (t === 'mspace') return ' ';
    const ch = Array.from(node.children || []);
    if (t === 'mfrac' && ch.length >= 2) {
      const num = cleanSp(walkMath(ch[0], nextDepth));
      const den = cleanSp(walkMath(ch[1], nextDepth));
      return (num || den) ? '(' + num + ')/(' + den + ')' : '';
    }
    if (t === 'msup' && ch.length >= 2) {
      const b = cleanSp(walkMath(ch[0], nextDepth));
      const e = cleanSp(walkMath(ch[1], nextDepth));
      return b ? mathAtom(b) + '^' + mathScript(e) : e;
    }
    if (t === 'msub' && ch.length >= 2) {
      const b = cleanSp(walkMath(ch[0], nextDepth));
      const s = cleanSp(walkMath(ch[1], nextDepth));
      return b ? mathAtom(b) + '_' + mathScript(s) : s;
    }
    if (t === 'msubsup' && ch.length >= 3) {
      const b = cleanSp(walkMath(ch[0], nextDepth));
      const s = cleanSp(walkMath(ch[1], nextDepth));
      const e = cleanSp(walkMath(ch[2], nextDepth));
      return b ? mathAtom(b) + '_' + mathScript(s) + '^' + mathScript(e) : '';
    }
    if (t === 'munderover' && ch.length >= 3) {
      const b = cleanSp(walkMath(ch[0], nextDepth));
      const u = cleanSp(walkMath(ch[1], nextDepth));
      const o = cleanSp(walkMath(ch[2], nextDepth));
      return b ? mathBase(b) + (u ? '_' + mathScript(u) : '') + (o ? '^' + mathScript(o) : '') : cleanSp(u + ' ' + o);
    }
    if (t === 'munder' && ch.length >= 2) {
      const b = cleanSp(walkMath(ch[0], nextDepth));
      const u = cleanSp(walkMath(ch[1], nextDepth));
      return (b && u) ? mathBase(b) + '_' + mathScript(u) : (b || u);
    }
    if (t === 'mover' && ch.length >= 2) {
      const b = cleanSp(walkMath(ch[0], nextDepth));
      const o = cleanSp(walkMath(ch[1], nextDepth));
      if (b && Object.prototype.hasOwnProperty.call(OVER_ACCENT, o)) return OVER_ACCENT[o] + '(' + b + ')';
      return (b && o) ? mathBase(b) + '^' + mathScript(o) : (b || o);
    }
    if (t === 'mtable') {
      const rows = ch.map((row) => {
        const rt = String(row.tagName || '').toLowerCase();
        if (rt === 'mtr' || rt === 'mlabeledtr') {
          const cells = Array.from(row.children || []).map((c) => cleanSp(walkMath(c, nextDepth))).filter(Boolean);
          return cells.join(', ');
        }
        return cleanSp(walkMath(row, nextDepth));
      }).filter(Boolean);
      return rows.length ? '[' + rows.join('; ') + ']' : '';
    }
    if (t === 'mfenced') {
      const open = node.getAttribute('open') != null ? node.getAttribute('open') : '(';
      const close = node.getAttribute('close') != null ? node.getAttribute('close') : ')';
      const seps = Array.from(String(node.getAttribute('separators') != null ? node.getAttribute('separators') : ',').replace(/\s+/g, ''));
      const parts = ch.map((c) => cleanSp(walkMath(c, nextDepth)));
      let out = '';
      for (let i = 0; i < parts.length; i++) {
        if (i > 0) { const sep = seps.length ? seps[Math.min(i - 1, seps.length - 1)] : ''; out += (sep ? sep + ' ' : ' '); }
        out += parts[i];
      }
      return open + out + close;
    }
    if (t === 'msqrt') {
      const inner = cleanSp(Array.from(node.childNodes || []).map((child) => walkMath(child, nextDepth)).join(''));
      return inner ? 'sqrt(' + inner + ')' : '';
    }
    if (t === 'mroot' && ch.length >= 2) {
      const b = cleanSp(walkMath(ch[0], nextDepth));
      const idx = cleanSp(walkMath(ch[1], nextDepth));
      return (b && idx) ? 'root(' + idx + ', ' + b + ')' : b;
    }
    return Array.from(node.childNodes || []).map((child) => walkMath(child, nextDepth)).join('');
  };
  return cleanSp(walkMath(mathEl, 0)) || cleanSp((mathEl.getAttribute && mathEl.getAttribute('data-allo-latex')) || '');
}

function _replaceAccessibleMathAndSvgForSpeech(root, opts) {
  if (!root || !root.querySelectorAll) return;
  const doc = (opts && opts.doc) || root.ownerDocument || (typeof document !== 'undefined' ? document : null);
  if (!doc) return;
  const includeTeacherOnly = !!(opts && opts.includeTeacherOnly);
  const preserveLanguageNodes = !!(opts && opts.preserveLanguageNodes);
  if (!includeTeacherOnly) {
    root.querySelectorAll(_ALLO_TEACHER_ONLY_SEL).forEach((el) => { try { el.remove(); } catch (_) {} });
  }
  const makeSpokenNode = (sourceEl, labelText) => {
    const clean = String(labelText || '').replace(/\s+/g, ' ').trim();
    if (!clean) return doc.createTextNode('');
    if (preserveLanguageNodes) {
      const span = doc.createElement('span');
      span.setAttribute('data-allo-spoken-media', '1');
      const lang = sourceEl && sourceEl.getAttribute && (sourceEl.getAttribute('lang') || sourceEl.getAttribute('xml:lang'));
      if (lang) span.setAttribute('lang', lang);
      span.textContent = ' ' + clean + ' ';
      return span;
    }
    return doc.createTextNode(' ' + clean + ' ');
  };
  root.querySelectorAll('math').forEach((mathEl) => {
    try {
      if (mathEl.closest && mathEl.closest('[hidden], [aria-hidden="true"]')) { mathEl.remove(); return; }
      const readable = _alloLinearizeSpeechMath(mathEl);
      mathEl.replaceWith(makeSpokenNode(mathEl, readable));
    } catch (_) {}
  });
  root.querySelectorAll('svg').forEach((svgEl) => {
    try {
      if (svgEl.closest && svgEl.closest('.alloflow-inline-chart')) { svgEl.remove(); return; }
      if (svgEl.getAttribute('aria-hidden') === 'true' || svgEl.getAttribute('role') === 'presentation' || svgEl.getAttribute('role') === 'none' || (svgEl.closest && svgEl.closest('[hidden], [aria-hidden="true"]'))) {
        svgEl.remove();
        return;
      }
      const label = String(
        svgEl.getAttribute('aria-label') ||
        Array.from(svgEl.querySelectorAll('title, desc')).map((n) => (n.textContent || '').trim()).filter(Boolean).join('. ')
      ).replace(/\s+/g, ' ').trim();
      if (label) svgEl.replaceWith(makeSpokenNode(svgEl, label));
      else svgEl.remove();
    } catch (_) {}
  });
}

function _audioReadyText(html, narrationOptions) {
  const options = narrationOptions || {};
  const Parser = typeof DOMParser === 'function' ? DOMParser : (typeof window !== 'undefined' && typeof window.DOMParser === 'function' ? window.DOMParser : null);
  if (!Parser) return options.languageRuns ? [] : '';
  const doc = new Parser().parseFromString(html || '', 'text/html');
  const root = doc.body || doc.documentElement;
  if (!root) return options.languageRuns ? [] : '';
  // Speak the AI-translated / AI-simplified disclosure instead of silently
  // dropping it for listeners (audit 2026-06-13 [11]): capture it as a
  // spoken preamble BEFORE removing the visual banner.
  let _preamble = '';
  let preambleRuns = [];
  const _noteParts = [];
  root.querySelectorAll('[data-allo-translation-note], [data-allo-plain-note]').forEach((_note) => {
    if (_note.hasAttribute('hidden') || _note.getAttribute('aria-hidden') === 'true' || (_note.style && (_note.style.display === 'none' || _note.style.visibility === 'hidden')) || (_note.closest && _note.closest('[hidden], [aria-hidden="true"]'))) return;
    const _clone = _note.cloneNode(true);
    if (_clone.querySelectorAll) {
      _clone.querySelectorAll('script, style, button, input, select, textarea, [hidden], [aria-hidden="true"]').forEach((el) => el.remove());
      _clone.querySelectorAll('[style]').forEach((el) => { if (el.style.display === 'none' || el.style.visibility === 'hidden') el.remove(); });
      if (!options.includeTeacherOnly) {
        _clone.querySelectorAll(_ALLO_TEACHER_ONLY_SEL).forEach((el) => el.remove());
      }
    }
    const _nt = (_clone.textContent || '').replace(/\s+/g, ' ').trim();
    if (_nt) {
      const _punct = /[.!?]$/.test(_nt) ? ' ' : '. ';
      _noteParts.push(_nt + _punct);
      if (options.languageRuns) {
        const _noteLang = _narrationLanguageOf(_note, options.language);
        preambleRuns.push(..._narrationTextRuns(_clone, _noteLang), { text: _punct, language: _noteLang });
      }
    }
  });
  _preamble = _noteParts.join('');
  _narrationPrepareDocument(doc, options);
  root.querySelectorAll('[data-allo-translation-note], [data-allo-plain-note], details.allo-chart-data > summary, details.allo-image-desc > summary').forEach((el) => el.remove());
  // Preserve author <em> notes inside captions/details in languageRuns mode (MCP narration contract).
  if (!options.languageRuns) {
    root.querySelectorAll('details em, figcaption em').forEach((el) => { if (/verify|AI-estimated|AI-generated|Transcribed from the image/i.test(el.textContent || '')) el.remove(); });
  }
  const imageText = (node, caption, alt) => {
    if(!options.languageRuns)return doc.createTextNode((caption ? caption.textContent.trim() : alt) ? ('Image: '+(caption ? caption.textContent.trim() : alt)+'. ') : '');
    const span=doc.createElement('span');span.lang=_narrationLanguageOf(caption||node,options.language);
    // Natural reading keeps descriptions without injecting an untranslated cue.
    if(caption){const clone=caption.cloneNode(true);span.append(...Array.from(clone.childNodes));}else span.textContent=alt;
    if(span.textContent.trim())span.append(doc.createTextNode('. '));return span;
  };
  root.querySelectorAll('figure').forEach((fig) => {
    const img = fig.querySelector('img');
    const cap = fig.querySelector('figcaption');
    // Collapse the REAL exported placeholder too (audit 2026-06-13 [14]):
    // it carries data-img-idx with no <img>, not just data-img-placeholder —
    // otherwise the upload-UI button text gets read aloud.
    if (fig.hasAttribute('data-img-placeholder') || (fig.hasAttribute('data-img-idx') && !img)) {
      const d = (cap && cap.textContent.trim()) || '';
      fig.replaceWith(options.languageRuns ? imageText(fig,cap,d) : doc.createTextNode(d ? ('Image: ' + d + '. ') : ''));
      return;
    }
    if (img) {
      const alt = (img.getAttribute('alt') || '').trim();
      // A real author figcaption is content — always read it (audit
      // 2026-06-13 [5]); only the ALT is gated by decorative role.
      const role = img.getAttribute('role');
      const isPres = role === 'presentation' || role === 'none' || img.getAttribute('aria-hidden') === 'true';
      const capText = cap ? cap.textContent.trim() : '';
      if (options.languageRuns) {
        // Preserve distinct image descriptions and caption languages in MCP languageRuns mode,
        // while still deduplicating exact alt===figcaption repeats.
        if (capText && alt && alt.replace(/\s+/g, ' ').toLowerCase() === capText.replace(/\s+/g, ' ').toLowerCase()) {
          img.remove();
        }
        return;
      }
      const say = capText || (isPres ? '' : alt);
      const replacement = doc.createTextNode(say ? ('Image: ' + say + '. ') : '');
      if (cap) cap.remove();
      img.replaceWith(replacement);
    }
  });
  root.querySelectorAll('img').forEach((img) => {
    const role = img.getAttribute('role');
    const isPres = role === 'presentation' || role === 'none' || img.getAttribute('aria-hidden') === 'true';
    const alt = isPres ? '' : (img.getAttribute('alt') || '').trim();
    img.replaceWith(options.languageRuns ? imageText(img, null, alt) : doc.createTextNode(alt ? ('Image: ' + alt + '. ') : ''));
  });
  root.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, dd, dt, tr, caption, figcaption, summary, .alloflow-cs-strip, .alloflow-tl-strip').forEach((el) => { el.appendChild(doc.createTextNode('. ')); });
  if(options.languageRuns)return _narrationMergeRuns([...preambleRuns,..._narrationTextRuns(root,options.language)],true);
  return _preamble + (root.textContent || '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/([.!?])\s*\.+/g, '$1')
    .replace(/\.{2,}/g, '.')
    .trim();
}

