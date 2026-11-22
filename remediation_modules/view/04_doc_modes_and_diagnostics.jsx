// ── Document modes (2026-06-13) ── a GENERIC registry: each mode is just
// data — its formatting CSS, whether it surfaces the academic blocks, and its
// citation/reference conventions. APA is mode #1; MLA, Chicago, and Standard
// are the same shape. Adding a new mode (e.g. a K-2 'Simple' mode) = one entry.
// The CSS rides accessibleHtml, so every export (HTML/print/tagged-PDF) inherits
// it. The mode NEVER fabricates citation content — it reconfigures which blocks
// appear and how the document is formatted; the academic blocks are empty
// teacher-filled templates.
const _DOC_MODE_CSS_BASE = '.prose,main{font-family:"Times New Roman",Times,Georgia,serif;font-size:12pt;line-height:2}.allo-references>.allo-ref-entry,.allo-references li,.allo-footnotes li{padding-left:2.5em;text-indent:-2.5em}.allo-references{margin-top:2em}.allo-footnotes{margin-top:2em}.allo-footnotes hr{border:none;border-top:1px solid #000;width:30%;margin:1em 0}.allo-fn-ref{font-size:0.7em;vertical-align:super;line-height:0}';
/* ──────────────────────────────────────────────────────────────────────
 * Self-contained accessible HTML reader (Document Builder export — Seam B).
 * _wrapAsReaderApp() PREPENDS an accessible reading-control bar and APPENDS a
 * self-contained <style>/<script> to the exported document HTML. Tier 0 only:
 * fully offline, zero-network, device-voice read-aloud. Higher tiers (baked
 * neural audio, Kokoro, AIProvider translate/explain) are deferred — see
 * C:/tmp/accessible_html_reader_export_guide.md.
 *
 * ADDITIVE CONTRACT: the document's own markup is never altered — we only
 * inject before </head>, immediately after <body>, and before </body>. Strip
 * the injected <style>/<script> and it is a valid accessible document again.
 * On ANY failure, or if already wrapped, the input is returned untouched, so
 * deleting the _wrapAsReaderApp() call at the export seam yields a byte-
 * identical export. Theme values mirror the in-app reader (view_header). The
 * control UI is lang="en" (device-local); the document keeps its own lang.
 * ────────────────────────────────────────────────────────────────────── */
const _READER_APP_CSS = `
#allo-reader-bar{position:sticky;top:0;z-index:2147483646;background:#0f172a;color:#fff;font:14px/1.4 system-ui,-apple-system,sans-serif;padding:8px 12px;display:flex;flex-wrap:wrap;gap:10px 14px;align-items:center;box-shadow:0 2px 8px rgba(0,0,0,.25)}
#allo-reader-bar label{display:inline-flex;align-items:center;gap:5px;font-weight:600;white-space:nowrap}
#allo-reader-bar select,#allo-reader-bar input[type=range]{font:inherit;color:#0f172a;background:#fff;border-radius:6px;padding:2px 4px}
#allo-reader-bar input[type=range]{accent-color:#2563eb;padding:0}
#allo-reader-bar button{background:#1e293b;color:#fff;border:1px solid #475569;border-radius:8px;padding:6px 10px;font-weight:700;cursor:pointer}
#allo-reader-bar button:hover{background:#334155}
#allo-reader-bar button:focus-visible,#allo-reader-bar select:focus-visible,#allo-reader-bar input:focus-visible{outline:3px solid #fde047;outline-offset:2px}
#allo-reader-bar button[aria-pressed=true]{background:#2563eb;border-color:#60a5fa}
#allo-reader-panel{display:flex;flex-wrap:wrap;gap:10px 14px;align-items:center}
#allo-reader-panel[hidden]{display:none}
#allo-reader-ruler{position:fixed;left:0;width:100%;height:2.4em;background:rgba(250,204,21,.16);border-top:2px solid rgba(250,204,21,.65);border-bottom:2px solid rgba(250,204,21,.65);pointer-events:none;z-index:2147483645;display:none}
html[data-allo-ruler="1"] #allo-reader-ruler{display:block}
html[data-allo-theme="warm"] body{background:#fef3c7!important;color:#5c4033!important}
html[data-allo-theme="sepia"] body{background:#f4ecd8!important;color:#5c4033!important}
html[data-allo-theme="dark"] body{background:#1a1a2e!important;color:#e2e8f0!important}
html[data-allo-theme="highContrast"] body{background:#000!important;color:#ff0!important}
html[data-allo-theme="blue"] body{background:#d6eaf8!important;color:#1b2631!important}
html[data-allo-theme="green"] body{background:#e8f5e9!important;color:#1b5e20!important}
html[data-allo-theme="rose"] body{background:#fce4ec!important;color:#880e4f!important}
html[data-allo-theme="dyslexia"] body{background:#faf8ef!important;color:#1e293b!important}
@media print{#allo-reader-bar,#allo-reader-ruler{display:none!important}}
`;
const _READER_APP_BAR = `
<div id="allo-reader-bar" lang="en" role="region" aria-label="Reading controls">
<button type="button" id="allo-reader-toggle" aria-expanded="true" aria-controls="allo-reader-panel">&#9881;&#65039; Reading tools</button>
<div id="allo-reader-panel">
<label>Font <select id="allo-rd-font" aria-label="Font family"><option value="">Original</option><option value="system-ui, sans-serif">Sans-serif</option><option value="Georgia, 'Times New Roman', serif">Serif</option><option value="'OpenDyslexic','Comic Sans MS','Trebuchet MS',sans-serif">Dyslexia-friendly</option><option value="ui-monospace,'Courier New',monospace">Monospace</option></select></label>
<label>Size <input type="range" id="allo-rd-size" min="12" max="28" step="1" aria-label="Text size"></label>
<label>Line <input type="range" id="allo-rd-line" min="1" max="2.5" step="0.1" aria-label="Line spacing"></label>
<label>Letter <input type="range" id="allo-rd-letter" min="0" max="0.2" step="0.01" aria-label="Letter spacing"></label>
<label>Theme <select id="allo-rd-theme" aria-label="Reading theme"><option value="default">Default</option><option value="warm">Warm</option><option value="sepia">Sepia</option><option value="dark">Dark</option><option value="highContrast">High contrast</option><option value="blue">Blue</option><option value="green">Green</option><option value="rose">Rose</option><option value="dyslexia">Easy read</option></select></label>
<button type="button" id="allo-rd-ruler" aria-pressed="false">Reading ruler</button>
<span role="group" aria-label="Read aloud"><button type="button" id="allo-rd-play">&#9654; Read aloud</button><button type="button" id="allo-rd-stop">&#9209; Stop</button><label>Speed <input type="range" id="allo-rd-rate" min="0.5" max="1.5" step="0.1" value="1" aria-label="Reading speed"></label></span>
<button type="button" id="allo-rd-reset">Reset</button>
</div>
</div>
<div id="allo-reader-ruler" aria-hidden="true"></div>
`;
const _READER_APP_JS = `
(function(){
var d=document, root=d.documentElement, LS='allo-reader-prefs';
function $(id){return d.getElementById(id);}
var prefs={};
try{prefs=JSON.parse(localStorage.getItem(LS)||'{}')||{};}catch(e){prefs={};}
function save(){try{localStorage.setItem(LS,JSON.stringify(prefs));}catch(e){}}
function apply(){
var b=d.body;
if(b){
b.style.fontFamily=prefs.font||'';
b.style.fontSize=prefs.size?prefs.size+'px':'';
b.style.lineHeight=prefs.line?String(prefs.line):'';
b.style.letterSpacing=prefs.letter?prefs.letter+'em':'';
}
if(prefs.theme&&prefs.theme!=='default')root.setAttribute('data-allo-theme',prefs.theme);else root.removeAttribute('data-allo-theme');
if(prefs.ruler)root.setAttribute('data-allo-ruler','1');else root.removeAttribute('data-allo-ruler');
if($('allo-rd-font'))$('allo-rd-font').value=prefs.font||'';
if($('allo-rd-size'))$('allo-rd-size').value=prefs.size||16;
if($('allo-rd-line'))$('allo-rd-line').value=prefs.line||1.5;
if($('allo-rd-letter'))$('allo-rd-letter').value=prefs.letter||0;
if($('allo-rd-theme'))$('allo-rd-theme').value=prefs.theme||'default';
var rb=$('allo-rd-ruler');if(rb)rb.setAttribute('aria-pressed',prefs.ruler?'true':'false');
}
function on(id,ev,fn){var el=$(id);if(el)el.addEventListener(ev,fn);}
on('allo-rd-font','change',function(e){prefs.font=e.target.value;save();apply();});
on('allo-rd-size','input',function(e){prefs.size=parseInt(e.target.value,10);save();apply();});
on('allo-rd-line','input',function(e){prefs.line=parseFloat(e.target.value);save();apply();});
on('allo-rd-letter','input',function(e){prefs.letter=parseFloat(e.target.value);save();apply();});
on('allo-rd-theme','change',function(e){prefs.theme=e.target.value;save();apply();});
on('allo-rd-ruler','click',function(){prefs.ruler=!prefs.ruler;save();apply();});
on('allo-rd-reset','click',function(){prefs={};save();apply();});
on('allo-reader-toggle','click',function(){var p=$('allo-reader-panel'),t=$('allo-reader-toggle');if(!p||!t)return;if(p.hasAttribute('hidden')){p.removeAttribute('hidden');t.setAttribute('aria-expanded','true');}else{p.setAttribute('hidden','');t.setAttribute('aria-expanded','false');}});
var ruler=$('allo-reader-ruler');
d.addEventListener('mousemove',function(e){if(ruler&&root.getAttribute('data-allo-ruler')==='1')ruler.style.top=(e.clientY-ruler.offsetHeight/2)+'px';});
var synth=window.speechSynthesis;
function bodyText(){var b=d.body?d.body.cloneNode(true):null;if(!b)return '';var x=b.querySelector('#allo-reader-bar');if(x&&x.parentNode)x.parentNode.removeChild(x);var y=b.querySelector('#allo-reader-ruler');if(y&&y.parentNode)y.parentNode.removeChild(y);var hid=b.querySelectorAll('[hidden],[aria-hidden="true"],script,style');for(var h=0;h<hid.length;h++){if(hid[h]&&hid[h].parentNode)hid[h].parentNode.removeChild(hid[h]);}return (b.innerText||b.textContent||'').replace(/_{3,}/g,' blank ').replace(/[\u2702\u2610\u2611\u2713]/g,' ').replace(/\\s+/g,' ').trim();}
function speak(){if(!synth)return;synth.cancel();var txt=bodyText();if(!txt)return;var rate=$('allo-rd-rate');var r=rate?parseFloat(rate.value)||1:1;var lang=(root.getAttribute('lang')||(d.body&&d.body.getAttribute('lang'))||'').trim();var parts=txt.match(/[^.!?]+[.!?]*\\s*/g)||[txt];var buf='',q=[];for(var i=0;i<parts.length;i++){buf+=parts[i];if(buf.length>180){q.push(buf);buf='';}}if(buf)q.push(buf);for(var j=0;j<q.length;j++){var u=new SpeechSynthesisUtterance(q[j]);u.rate=r;if(lang)u.lang=lang;synth.speak(u);}}
on('allo-rd-play','click',speak);
on('allo-rd-stop','click',function(){if(synth)synth.cancel();});
apply();
})();
`;
function _wrapAsReaderApp(html, opts) {
  try {
    if (!html || typeof html !== 'string') return html;
    if (html.indexOf('allo-reader-bar') !== -1) return html; // idempotent — never double-wrap
    const styleTag = '<style id="allo-reader-style">' + _READER_APP_CSS + '</style>';
    const barHtml = _READER_APP_BAR;
    const scriptTag = '<script id="allo-reader-script">' + _READER_APP_JS + '<' + '/script>';
    let out = html;
    if (/<\/head>/i.test(out)) out = out.replace(/<\/head>/i, function () { return styleTag + '</head>'; });
    else out = styleTag + out;
    if (/<body[^>]*>/i.test(out)) out = out.replace(/<body[^>]*>/i, function (m) { return m + barHtml; });
    else out = barHtml + out;
    if (/<\/body>/i.test(out)) out = out.replace(/<\/body>/i, function () { return scriptTag + '</body>'; });
    else out = out + scriptTag;
    return out;
  } catch (e) { return html; }
}

const DOC_MODES = {
  standard: { id: 'standard', label: 'Standard', icon: '📄', blurb: 'Default document formatting — all blocks, no citation style applied.', academic: false, css: '' },
  apa: { id: 'apa', label: 'APA 7', icon: '🎓', blurb: 'APA 7th edition: Times New Roman 12pt, double-spaced, centered bold title, hanging-indent References.', academic: true, refHeading: 'References', citation: '(Author, Year)', css: _DOC_MODE_CSS_BASE + 'main h1{text-align:center;font-weight:bold}main h2{font-weight:bold}' },
  mla: { id: 'mla', label: 'MLA 9', icon: '📝', blurb: 'MLA 9th edition: Times New Roman 12pt, double-spaced, centered Works Cited heading, hanging indent.', academic: true, refHeading: 'Works Cited', citation: '(Author 12)', css: _DOC_MODE_CSS_BASE + 'main h1{text-align:center;font-weight:normal}.allo-references h2{text-align:center;font-weight:normal}' },
  chicago: { id: 'chicago', label: 'Chicago', icon: '📚', blurb: 'Chicago (notes–bibliography): Times New Roman 12pt, double-spaced, footnotes, hanging-indent Bibliography.', academic: true, refHeading: 'Bibliography', citation: '¹', css: _DOC_MODE_CSS_BASE + 'main h1{text-align:center}.allo-references h2{text-align:center}' },
};

async function _buildAccessibleOfficeExport({ html, title, format }) {
  if (!html || typeof html !== 'string') throw new Error('No document content is available.');
  const safeTitle = String(title || 'AlloFlow Document').replace(/[\\/:*?"<>|]+/g, '-').trim().substring(0, 100) || 'AlloFlow Document';
  if (format === 'pptx') {
    const P = await _ensurePptxLib();
    if (!P) throw new Error('The PowerPoint library could not load. Check the connection and try again.');
    const spec = _htmlToDocxSpec(html);
    if (title) spec.title = String(title);
    const deck = _docxSpecToSlides(spec);
    if (!deck.slides.length) throw new Error('The document has no content that can be exported to slides.');
    const blob = await _buildPptxBlobFromSlides(deck, P);
    return { blob, fileName: safeTitle + '.pptx', counts: deck.counts,
      message: 'PowerPoint prepared from the current document. Review slide layout and image descriptions before sharing.' };
  }
  if (format === 'docx') {
    const d = await _ensureDocxLib();
    if (!d) throw new Error('The Word export library could not load. Check the connection and try again.');
    const spec = _htmlToDocxSpec(html);
    const blob = await _buildDocxBlobFromSpec(spec, d, DOC_MODES.standard);
    return {
      blob,
      fileName: safeTitle + '-accessible.docx',
      message: 'Accessible Word file downloaded. Verify it in Word: Review > Check Accessibility.',
      counts: spec.counts,
    };
  }
  if (format !== 'odt') throw new Error('Unsupported Office export format.');
  if (!window.JSZip) throw new Error('The compression library is still loading.');
  const zip = new window.JSZip();
  const odtParts = _htmlToOdtPackageParts(html);
  zip.file('mimetype', 'application/vnd.oasis.opendocument.text', { compression: 'STORE' });
  zip.file('META-INF/manifest.xml', _buildOdtManifestXml(odtParts.images));
  zip.file('content.xml', odtParts.contentXml);
  odtParts.images.forEach((image) => zip.file(image.path, image.base64, { base64: true }));
  const lang = ((html.match(/<html[^>]*lang=["']([^"']+)["']/i) || [])[1] || 'en').trim();
  const parsedOdtLang = _parseOdtBcp47(lang);
  const rtl = /<(?:html|body)[^>]*\bdir=["']rtl/i.test(html);
  let styles = _ODT_STYLES_XML.replace('<style:text-properties style:font-name="Liberation Serif" fo:font-size="12pt"/>', '<style:text-properties style:font-name="Liberation Serif" fo:font-size="12pt" ' + parsedOdtLang.allAttrs + '/>');
  if (rtl) styles = styles.replace('<style:default-style style:family="paragraph">', '<style:default-style style:family="paragraph"><style:paragraph-properties style:writing-mode="rl-tb"/>');
  zip.file('styles.xml', styles);
  zip.file('meta.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<office:document-meta xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0" xmlns:dc="http://purl.org/dc/elements/1.1/" office:version="1.2"><office:meta><meta:generator>AlloFlow</meta:generator><dc:title>' + _expXmlEsc(safeTitle) + '</dc:title><dc:language>' + _expXmlEsc(lang) + '</dc:language></office:meta></office:document-meta>');
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.oasis.opendocument.text' });
  return {
    blob,
    fileName: safeTitle + '-accessible.odt',
    message: 'Accessible OpenDocument file downloaded. Verify it in LibreOffice or Word before distributing.',
  };
}

// Footnote renumber engine (2026-06-13): keeps superscript anchors, the notes
// list, ids, and back-references in sync after any insert/delete/reorder. Each
// ref↔note pair shares a stable data-fn-uid; numbers come from document order
// (the <ol> renders the display number, the <a> shows the inline number).
function _alloRenumberFootnotes(doc) {
  try {
    const refs = Array.from(doc.querySelectorAll('sup.allo-fn-ref'));
    const sec = doc.querySelector('section.allo-footnotes');
    const ol = sec && sec.querySelector('ol');
    if (!ol) return;
    const liByUid = {};
    Array.from(ol.children).forEach((li) => { const u = li.getAttribute('data-fn-uid'); if (u) liByUid[u] = li; });
    const used = {};
    let n = 0;
    refs.forEach((ref, i) => {
      let uid = ref.getAttribute('data-fn-uid');
      if (!uid) { uid = 'fx' + i; ref.setAttribute('data-fn-uid', uid); }
      const li = liByUid[uid];
      if (!li) {
        // Orphan ref (2026-06-14): the note was deleted but the <sup> marker
        // survived in the body text. Numbering + linking it would ship a
        // dangling link to a non-existent #fn-uid in the exported PDF/HTML.
        // Remove the stray marker so refs ↔ notes stay 1:1 (symmetric with the
        // orphan-NOTE prune below). Use a separate counter `n` so removing one
        // doesn't leave a gap in the surviving numbers.
        ref.remove();
        return;
      }
      n++;
      used[uid] = 1;
      const a = ref.querySelector('a') || ref;
      a.textContent = String(n);
      a.setAttribute('href', '#fn-' + uid);
      ref.setAttribute('id', 'fnref-' + uid);
      li.setAttribute('id', 'fn-' + uid);
      ol.appendChild(li);
      const back = li.querySelector('a.allo-fn-back'); if (back) back.setAttribute('href', '#fnref-' + uid);
    });
    // Orphan NOTE (2026-06-15, ed-footnote-delete): the ref/marker was deleted (e.g.
    // backspaced in the body) but the note survives. Do NOT silently drop the
    // user-authored text — move it to a recovery appendix and announce, so it is never
    // lost and we're honest about the change (symmetric with the block-remove announce
    // and the Content Recovery appendix pattern).
    let _recovered = 0;
    Array.from(ol.children).forEach((li) => {
      const u = li.getAttribute('data-fn-uid');
      if (!u || used[u]) return;
      const _txtEl = li.querySelector('.allo-fn-text');
      const _txt = ((_txtEl ? _txtEl.textContent : li.textContent) || '').replace(/↩/g, '').trim();
      if (_txt) {
        let rec = doc.querySelector('section.allo-recovered-footnotes');
        if (!rec) {
          rec = doc.createElement('section');
          rec.className = 'allo-recovered-footnotes';
          rec.setAttribute('aria-label', 'Recovered footnote text');
          const h = doc.createElement('p');
          const b = doc.createElement('strong');
          b.textContent = 'Recovered footnote text (its marker was deleted):';
          h.appendChild(b);
          rec.appendChild(h);
          (doc.querySelector('main') || doc.body).appendChild(rec);
        }
        const p = doc.createElement('p');
        p.className = 'allo-recovered-fn';
        p.textContent = _txt;
        rec.appendChild(p);
        _recovered++;
      }
      li.remove();
    });
    if (!ol.children.length) sec.remove();
    if (_recovered) {
      try {
        const _msg = _recovered + (_recovered === 1 ? ' footnote whose marker was deleted was moved to a Recovered footnote text section.' : ' footnotes whose markers were deleted were moved to a Recovered footnote text section.');
        const _lr = doc.getElementById('allo-blocks-live');
        if (_lr) { _lr.textContent = ''; setTimeout(() => { _lr.textContent = _msg; }, 30); }
        const _w = doc.defaultView;
        if (_w && _w.parent && typeof _w.parent.addToast === 'function') _w.parent.addToast(_msg, 'info');
      } catch (_) {}
    }
  } catch (_) {}
}

// Optional language runs let MCP narration switch voices without changing the
// existing plain-string export used by the app.
function _narrationLanguageOf(node, fallback) {
  if (!node) return fallback || 'en';
  let el=node.nodeType===1?node:node.parentElement;
  while(el){if(el.lang)return el.lang;el=el.parentElement;}
  return fallback || 'en';
}
function _narrationPrepareDocument(doc, options) {
  _alloDedupeVennActivityDom(doc);
  _alloReplaceFormControlsForText(doc, doc.body || doc, ' blank ', true, !(options && options.languageRuns));
  doc.querySelectorAll('button.alloflow-inline-term').forEach((btn) => {
    const span = doc.createElement('span');
    if (btn.lang) span.lang = btn.lang;
    span.textContent = btn.textContent || '';
    btn.replaceWith(span);
  });
  doc.querySelectorAll('script,style,button,input,select,textarea,audio,video,template,[hidden],[aria-hidden="true"],.allo-img-controls,[data-alloflow-picker],[data-alloflow-nomsg],[data-allo-footnote-backlink],details.allo-math-source,#allo-reader-bar,#allo-reader-ruler,.alloflow-reading-tools-shell,.alloflow-hud-bar,#alloflow-term-popover,.alloflow-term-popover,.alloflow-export-prompt-overlay,.alloflow-save-bar,.alloflow-turnin-bar,.alloflow-keycap,.alloflow-inline-chart svg,annotation,annotation-xml,[data-allo-latex-src],del[data-allo-change-id],[data-allo-change-kind="structure-delete"],' + _ALLO_INTERACTIVE_CHROME_SEL).forEach(node=>node.remove());
  doc.querySelectorAll('[style]').forEach(node=>{if(node.style.display==='none'||node.style.visibility==='hidden')node.remove();});
  _replaceAccessibleMathAndSvgForSpeech(doc.body || doc, { doc, includeTeacherOnly: !!(options && options.includeTeacherOnly), preserveLanguageNodes: !!(options && options.languageRuns) });
}
function _narrationTextRuns(node, fallback) {
  const runs=[];
  const visit=n=>{
    if(!n)return;
    const language=_narrationLanguageOf(n,fallback);
    if(n.nodeType===3){runs.push({text:n.textContent,language});return;}
    if(n.nodeType!==1)return;
    if(n.tagName.toLowerCase()==='img'){
      const alt=(n.getAttribute('alt')||'').trim();
      if(alt&&n.getAttribute('role')!=='presentation'&&n.getAttribute('role')!=='none'&&n.getAttribute('aria-hidden')!=='true')runs.push({text:alt+'. ',language});
      return;
    }
    if(/^(math|svg)$/i.test(n.tagName)){
      const tag=n.tagName.toLowerCase();
      if(tag==='svg'&&(n.getAttribute('aria-hidden')==='true'||n.getAttribute('role')==='presentation'||n.getAttribute('role')==='none'||(n.closest&&n.closest('.alloflow-inline-chart'))))return;
      const description=tag==='math'
        ?_alloLinearizeSpeechMath(n)
        :(n.getAttribute('aria-label')||n.getAttribute('alttext')||Array.from(n.querySelectorAll('title,desc')).map(el=>el.textContent.trim()).filter(Boolean).join('. '));
      if(description)runs.push({text:description+'. ',language});
      return;
    }
    Array.from(n.childNodes).forEach(visit);
  };
  visit(node);
  if(runs.length){runs[0].text=runs[0].text.trimStart();runs[runs.length-1].text=runs[runs.length-1].text.trimEnd();}
  return runs;
}
function _narrationMergeRuns(input, natural) {
  if(!Array.isArray(input))return [];
  const runs=[];
  for(const item of input){if(!item||!item.text)continue;const previous=runs[runs.length-1];
    // Punctuation belongs with the preceding phrase, never a separate TTS call.
    if(previous&&(previous.language===item.language||!/[\p{L}\p{N}\p{S}]/u.test(item.text)))previous.text+=item.text;
    else runs.push({...item});
  }
  if(runs.length>1&&!/[\p{L}\p{N}\p{S}]/u.test(runs[0].text)){runs[1].text=runs[0].text+runs[1].text;runs.shift();}
  return runs.map(run=>({...run,text:(natural?run.text.replace(/\s+/g,' ').replace(/\s+([.,;:!?])/g,'$1').replace(/([.!?])\s*\.+/g,'$1').replace(/\.{2,}/g,'.'):run.text).trim()})).filter(run=>run.text);
}
function _srStyleTextFromHtml(html, spokenLabels, narrationOptions) {
  const options=narrationOptions||{};
  const hasOwn=Object.prototype.hasOwnProperty;
  const isSafeKey=k=>typeof k==='string'&&k!=='__proto__'&&k!=='constructor'&&k!=='prototype';
  const say = (node,key,fallback,n) => {
    const primary=_narrationLanguageOf(node,options.language).split('-')[0].toLowerCase();
    const byLang=options.languageRuns&&options.labelsByLanguage&&typeof options.labelsByLanguage==='object'?options.labelsByLanguage:null;
    const local=options.languageRuns
      ?(byLang&&isSafeKey(primary)&&hasOwn.call(byLang,primary)?byLang[primary]:null)
      :(spokenLabels&&typeof spokenLabels==='object'?spokenLabels:null);
    const oneKey=key+'One';
    let phrase=null;
    if(local&&typeof local==='object'){
      if(Number(n)===1&&isSafeKey(oneKey)&&hasOwn.call(local,oneKey)&&typeof local[oneKey]==='string')phrase=local[oneKey];
      else if(isSafeKey(key)&&hasOwn.call(local,key)&&typeof local[key]==='string')phrase=local[key];
    }
    return phrase?phrase.replace(/\{n\}/g,String(n)):fallback;
  };
  const Parser=typeof DOMParser==='function'?DOMParser:(typeof window!=='undefined'&&typeof window.DOMParser==='function'?window.DOMParser:null);
  if(!Parser)return options.languageRuns?[]:'';
  const doc=new Parser().parseFromString(html||'','text/html');
  _narrationPrepareDocument(doc, options);
  const inlineText=(node)=>{
    if(!node)return '';
    if(node.nodeType===3)return node.textContent||'';
    if(node.nodeType!==1)return '';
    if(node.tagName.toLowerCase()==='img'){
      const role=node.getAttribute('role');
      if(role==='presentation'||role==='none'||node.getAttribute('aria-hidden')==='true')return '';
      const alt=(node.getAttribute('alt')||'').trim();
      return alt?(' '+alt+' '):'';
    }
    return Array.from(node.childNodes).map(inlineText).join('');
  };
  const readable=node=>options.languageRuns?_narrationTextRuns(node,options.language).some(run=>run.text.trim()):!!inlineText(node).trim();
  const out=[],runs=[];
  const add=(node,...parts)=>{
    out.push(parts.map(part=>typeof part==='string'?part:inlineText(part).replace(/\s+/g,' ').trim()).join(''));
    if(options.languageRuns){if(runs.length)runs.push({text:'\n\n',language:_narrationLanguageOf(node,options.language)});
      for(const part of parts)runs.push(...(typeof part==='string'?[{text:part,language:_narrationLanguageOf(node,options.language)}]:_narrationTextRuns(part,options.language)));
    }
  };
  const walk=el=>{
    if(!el||!el.childNodes)return;
    for(const node of Array.from(el.childNodes)){
      if(node.nodeType!==1){if(node.nodeType===3&&node.textContent.trim())add(el,node);continue;}
      const tag=node.tagName.toLowerCase(),txt=readable(node);
      if(/^h[1-6]$/.test(tag)){if(txt)add(node,say(node,'heading','Heading level '+tag[1],tag[1])+'. ',node,'.');continue;}
      if(tag==='p'||tag==='blockquote'||tag==='figcaption'){if(txt&&!node.closest('table'))add(node,node);continue;}
      if(tag==='dt'||tag==='dd'||node.classList?.contains('alloflow-cs-strip')||node.classList?.contains('alloflow-tl-strip')){if(txt)add(node,node,'.');continue;}
      if(tag==='ul'||tag==='ol'){
        const emitList=(listEl)=>{
          const lTag=listEl.tagName.toLowerCase();
          const items=Array.from(listEl.children).filter(c=>c.tagName&&c.tagName.toLowerCase()==='li');
          add(listEl,say(listEl,lTag==='ul'?'list':'numbered',(lTag==='ul'?'List, ':'Numbered list, ')+items.length+' item'+(items.length===1?'':'s'),items.length)+'.');
          items.forEach((li,i)=>{
            const prefix=(lTag==='ul'?say(li,'bullet','Bullet'):say(li,'item','Item '+(i+1),i+1))+'. ';
            const nestedLists=Array.from(li.querySelectorAll('ul,ol')).filter(sub=>sub.parentElement&&sub.parentElement.closest('li')===li);
            if(!nestedLists.length){
              if(readable(li))add(li,prefix,li,'.');
              return;
            }
            const ownClone=li.cloneNode(true);
            ownClone.querySelectorAll('ul,ol').forEach(sub=>sub.remove());
            if(readable(ownClone))add(li,prefix,ownClone,'.');
            nestedLists.forEach(emitList);
          });
          add(listEl,say(listEl,'listEnd','List end')+'.');
        };
        emitList(node);continue;
      }
      if(tag==='table'){
        const rows=Array.from(node.querySelectorAll('tr'));
        let cols=0;
        for(let ri=0;ri<rows.length;ri++){
          const rowCols=Array.from(rows[ri].children).reduce((sum,c)=>sum+Math.max(1,parseInt(c.getAttribute&&c.getAttribute('colspan'),10)||1),0);
          if(rowCols>cols)cols=rowCols;
        }
        const cap=node.querySelector('caption');
        add(node,say(node,'table','Table'),...(cap&&cap.textContent.trim()?[', ',cap]:[]),', '+say(node,'rows',rows.length+' row'+(rows.length===1?'':'s'),rows.length)+', '+say(node,'columns',cols+' column'+(cols===1?'':'s'),cols)+'.');
        rows.forEach((row,i)=>{const cells=Array.from(row.children).filter(c=>readable(c));if(cells.length)add(row,say(row,'row','Row '+(i+1),i+1)+'. ',...cells.flatMap((cell,index)=>index?['. ',cell]:[cell]),'.');});
        add(node,say(node,'tableEnd','Table end')+'.');continue;
      }
      if(tag==='img'){const alt=(node.getAttribute('alt')||'').trim();if(node.getAttribute('role')!=='presentation'&&node.getAttribute('role')!=='none'&&alt)add(node,say(node,'image','Image')+'. '+alt+'.');continue;}
      if(options.languageRuns&&(tag==='math'||tag==='svg'||node.getAttribute('data-allo-spoken-media')==='1')){add(node,node);continue;}
      if(tag==='details'){const sum=node.querySelector('summary');if(sum&&sum.textContent.trim())add(node,say(node,'disclosure','Disclosure section')+', ',sum,'.');walk(node);continue;}
      if(tag==='summary'&&node.parentElement?.tagName==='DETAILS')continue;
      walk(node);
    }
  };
  walk(doc.body||doc.documentElement);
  return options.languageRuns?_narrationMergeRuns(runs,false):out.join('\n\n');
}

async function _epubCoreAudioBlob(blob) {
  if (!blob || !blob.size) return null;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const isWav = bytes.length > 44 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45;
  if (!isWav) {
    const isMp3 = /mpeg|mp3/i.test(blob.type || '') || (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
    return isMp3 ? new Blob([bytes], { type: 'audio/mpeg' }) : null;
  }
  let fmt = null, dataStart = 0, dataLen = 0;
  for (let pos = 12; pos + 8 <= bytes.length;) {
    const size = bytes[pos + 4] | (bytes[pos + 5] << 8) | (bytes[pos + 6] << 16) | (bytes[pos + 7] << 24);
    if (bytes[pos] === 0x66 && bytes[pos + 1] === 0x6d && bytes[pos + 2] === 0x74 && bytes[pos + 3] === 0x20 && size >= 16) {
      fmt = { format: bytes[pos + 8] | (bytes[pos + 9] << 8), channels: bytes[pos + 10] | (bytes[pos + 11] << 8),
        sampleRate: bytes[pos + 12] | (bytes[pos + 13] << 8) | (bytes[pos + 14] << 16) | (bytes[pos + 15] << 24),
        bits: bytes[pos + 22] | (bytes[pos + 23] << 8) };
    }
    if (bytes[pos] === 0x64 && bytes[pos + 1] === 0x61 && bytes[pos + 2] === 0x74 && bytes[pos + 3] === 0x61) { dataStart = pos + 8; dataLen = Math.min(size, bytes.length - dataStart); break; }
    pos += 8 + size + (size % 2);
  }
  const encoder = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.AudioHelpers && window.AlloModules.AudioHelpers.pcmToMp3;
  if (!fmt || fmt.format !== 1 || fmt.channels !== 1 || fmt.bits !== 16 || !dataStart || !dataLen || typeof encoder !== 'function') return null;
  const pcmBytes = bytes.slice(dataStart, dataStart + dataLen);
  const pcm = new Int16Array(pcmBytes.buffer, pcmBytes.byteOffset, Math.floor(pcmBytes.byteLength / 2));
  const mp3 = await encoder(pcm, fmt.sampleRate, 64);
  return mp3 && mp3.size ? new Blob([mp3], { type: 'audio/mpeg' }) : null;
}

async function _concatAudioBlobs(blobs) {
  if (!blobs || blobs.length === 0) return null;
  if (blobs.length === 1) return blobs[0];
  const first = new Uint8Array(await blobs[0].arrayBuffer());
  const isWav = first.length > 12 &&
    first[0] === 0x52 && first[1] === 0x49 && first[2] === 0x46 && first[3] === 0x46 &&   // 'RIFF'
    first[8] === 0x57 && first[9] === 0x41 && first[10] === 0x56 && first[11] === 0x45;   // 'WAVE'
  // Never concatenate different containers: a RIFF payload inside an MP3 (or vice versa)
  // produces a download that decoders truncate or reject.
  const formatFlags = [isWav];
  for (let i = 1; i < blobs.length; i++) {
    const head = new Uint8Array(await blobs[i].slice(0, 12).arrayBuffer());
    formatFlags.push(head.length > 11 && head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46 && head[8] === 0x57 && head[9] === 0x41 && head[10] === 0x56 && head[11] === 0x45);
  }
  if (formatFlags.some((flag) => flag !== isWav)) return null;
  if (!isWav) {
    const family = (blob) => /mpeg|mp3/i.test(blob.type || '') ? 'mpeg' : ((blob.type || '').toLowerCase() || 'unknown');
    const firstFamily = family(blobs[0]);
    if (blobs.some((blob) => family(blob) !== firstFamily)) return null;
    return new Blob(blobs, { type: blobs[0].type || 'audio/mpeg' });
  }
  // WAV: two-pass single-allocation stitch (perf-audio-concat) — parse each segment's PCM
  // extent WITHOUT retaining whole buffers (pass 1 sizes + collects rates; pass 2 re-reads
  // and copies, releasing each buffer as it goes), collapsing the old ~3x peak (pcms[] +
  // joined pcm + outBuf) to ~1x outBuf + one transient segment. Byte-identical output.
  const _parsePcm = function (buf) {
    if (buf.length <= 44 || buf[0] !== 0x52 || buf[1] !== 0x49 || buf[2] !== 0x46 || buf[3] !== 0x46 || buf[8] !== 0x57 || buf[9] !== 0x41 || buf[10] !== 0x56 || buf[11] !== 0x45) return null;
    let format = 0, channels = 0, rate = 0, bits = 0, dataStart = 0, dataLen = 0;
    for (let pos = 12; pos + 8 <= buf.length;) {
      const size = (buf[pos + 4] | (buf[pos + 5] << 8) | (buf[pos + 6] << 16) | (buf[pos + 7] << 24)) >>> 0;
      if (pos + 8 + size > buf.length) return null;
      if (buf[pos] === 0x66 && buf[pos + 1] === 0x6d && buf[pos + 2] === 0x74 && buf[pos + 3] === 0x20 && size >= 16) {
        format = buf[pos + 8] | (buf[pos + 9] << 8); channels = buf[pos + 10] | (buf[pos + 11] << 8);
        rate = (buf[pos + 12] | (buf[pos + 13] << 8) | (buf[pos + 14] << 16) | (buf[pos + 15] << 24)) >>> 0;
        bits = buf[pos + 22] | (buf[pos + 23] << 8);
      } else if (buf[pos] === 0x64 && buf[pos + 1] === 0x61 && buf[pos + 2] === 0x74 && buf[pos + 3] === 0x61) {
        dataStart = pos + 8; dataLen = size;
      }
      pos += 8 + size + (size % 2);
    }
    return format && channels && rate && bits && dataStart ? { dataStart, len: dataLen, format, channels, rate, bits } : null;
  };
  // Pass 1: validate every segment and size the output. A single WAV header cannot
  // represent mixed rates/channel layouts, so reject instead of pitch-shifting later parts.
  let total = 0, signature = null;
  for (let i = 0; i < blobs.length; i++) {
    const buf = i === 0 ? first : new Uint8Array(await blobs[i].arrayBuffer());
    const m = _parsePcm(buf);
    if (!m || m.format !== 1 || m.channels !== 1 || m.bits !== 16) return null;
    if (!signature) signature = { rate: m.rate, format: m.format, channels: m.channels, bits: m.bits };
    else if (m.rate !== signature.rate || m.format !== signature.format || m.channels !== signature.channels || m.bits !== signature.bits) return null;
    total += m.len;
  }
  if (!signature || total === 0) return null;
  const sampleRate = signature.rate, numCh = signature.channels, bps = signature.bits;
  const blockAlign = numCh * bps / 8, byteRate = sampleRate * blockAlign;
  const outBuf = new ArrayBuffer(44 + total);
  const dv = new DataView(outBuf);
  const ws = function (o, s) { for (let k = 0; k < s.length; k++) dv.setUint8(o + k, s.charCodeAt(k)); };
  ws(0, 'RIFF'); dv.setUint32(4, 36 + total, true); ws(8, 'WAVE');
  ws(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, numCh, true);
  dv.setUint32(24, sampleRate, true); dv.setUint32(28, byteRate, true);
  dv.setUint16(32, blockAlign, true); dv.setUint16(34, bps, true);
  ws(36, 'data'); dv.setUint32(40, total, true);
  // Pass 2 — re-read each blob (immutable in-memory), copy its PCM into outBuf, release it.
  const outPcm = new Uint8Array(outBuf, 44);
  let poff = 0;
  for (let i = 0; i < blobs.length; i++) {
    const buf = new Uint8Array(await blobs[i].arrayBuffer());
    const m = _parsePcm(buf);
    if (!m) return null;
    outPcm.set(buf.subarray(m.dataStart, m.dataStart + m.len), poff); poff += m.len;
  }
  return new Blob([outBuf], { type: 'audio/wav' });
}

// Derive the DEFAULT tagged-PDF metadata (title, language) the way createTaggedPdf's callers do:
// title from the remediated HTML <title>/<h1> (else the source filename), language from <html lang>
// (else ''). Pure + shared by the editable Document-metadata panel (prefill) and the tagged-PDF
// export call sites (default) — so what the user sees prefilled is exactly what ships if they don't
// edit it. Lets the user FIX the #1 PDF/UA checker failure (filename leaking through as the Title)
// and confirm/correct the auto-detected language before export.
function _deriveDocMeta(accessibleHtml, fileName) {
  let title = '', lang = '';
  try {
    const tmp = new DOMParser().parseFromString(accessibleHtml || '', 'text/html');
    title = (tmp.querySelector('title')?.textContent || tmp.querySelector('h1')?.textContent || '').trim().substring(0, 200);
    const htmlLang = tmp.documentElement?.getAttribute('lang');
    if (htmlLang) lang = htmlLang.substring(0, 10);
  } catch (_) {}
  if (!title) title = (fileName || 'document').replace(/\.pdf$/i, '');
  return { title, lang };
}

// EXACT copy of doc_pipeline_source.jsx TAG_TO_PDF_ROLE (the HTML-tag -> PDF structure-type map
// createTaggedPdf uses). A drift-sentinel test (tests/view_pdf_audit_tagtree.test.js) asserts this
// equals the source map, so the inspector below shows the REAL roles the tagged PDF will carry —
// not a parallel heuristic that could quietly lie.
const _TAG_TO_PDF_ROLE = {
  h1: 'H1', h2: 'H2', h3: 'H3', h4: 'H4', h5: 'H5', h6: 'H6',
  p: 'P', ul: 'L', ol: 'L', li: 'LI', img: 'Figure', figure: 'Figure',
  table: 'Table', tr: 'TR', th: 'TH', td: 'TD', caption: 'Caption',
  thead: 'THead', tbody: 'TBody', tfoot: 'TFoot',
  blockquote: 'BlockQuote', a: 'Link',
  header: 'NonStruct', footer: 'NonStruct',
  section: 'Sect', nav: 'Sect', aside: 'Sect', main: 'Sect',
};

// Read-only "tag tree" inspector: walks the remediated HTML the way createTaggedPdf does and
// returns the block-level outline (role + indent + short text) the tagged PDF will carry, plus
// per-node accessibility WARNINGS (skipped heading level, empty heading, image/figure missing alt,
// table missing header cells / scope). Pure + DOM-based (jsdom-testable). domIndex = position in
// this same walk so the UI can scroll the live preview to a clicked node. Containers (table /
// figure / list) are shown as single summarized nodes; their internals are not surfaced separately.
function _buildTagOutline(html) {
  const out = [];
  let doc;
  try { doc = new DOMParser().parseFromString(html || '', 'text/html'); } catch (_) { return out; }
  const body = doc && doc.body;
  if (!body) return out;
  const SURFACE = 'h1,h2,h3,h4,h5,h6,p,ul,ol,table,figure,img,blockquote,header,footer';
  const els = body.querySelectorAll(SURFACE);
  let prevHeading = 0, curHeading = 0, domIndex = 0;
  const MAX = 1000; // guard against pathologically large docs hanging the render
  for (let i = 0; i < els.length && out.length < MAX; i++) {
    const el = els[i];
    // Skip elements nested inside a container we summarize as ONE node (img-in-figure, p-in-cell,
    // li, nested lists) — keeps the outline a clean block structure.
    if (el.parentElement && el.parentElement.closest('table,figure,ul,ol')) { domIndex++; continue; }
    const tag = el.tagName.toLowerCase();
    const role = _TAG_TO_PDF_ROLE[tag] || 'P';
    const warnings = [];
    let indent = curHeading;
    const hm = /^h([1-6])$/.exec(tag);
    if (hm) {
      const lvl = parseInt(hm[1], 10);
      indent = lvl - 1;
      if (prevHeading > 0 && lvl - prevHeading > 1) warnings.push('Skipped heading level (h' + prevHeading + ' → h' + lvl + ')');
      if (!(el.textContent || '').trim()) warnings.push('Empty heading');
      prevHeading = lvl; curHeading = lvl;
    }
    if (tag === 'img' || tag === 'figure') {
      const img = tag === 'img' ? el : el.querySelector('img');
      const alt = img ? (img.getAttribute('alt') || '') : '';
      const cap = tag === 'figure' && el.querySelector('figcaption');
      if (!alt.trim() && !(cap && cap.textContent.trim())) warnings.push('Missing alt text / caption');
    }
    if (tag === 'table') {
      const ths = el.querySelectorAll('th');
      if (ths.length === 0) warnings.push('No header cells (<th>) — screen readers can\'t associate columns');
      else { let noScope = 0; ths.forEach(th => { if (!th.getAttribute('scope')) noScope++; }); if (noScope) warnings.push(noScope + ' header cell(s) missing scope'); }
    }
    let text;
    if (tag === 'img') text = (el.getAttribute('alt') || '(no alt)');
    else if (tag === 'table') text = el.querySelectorAll('tr').length + ' row(s)';
    else if (tag === 'ul' || tag === 'ol') text = el.querySelectorAll(':scope > li').length + ' item(s)';
    else text = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    out.push({ role, tag, text, indent: Math.max(0, indent), warnings, domIndex });
    domIndex++;
  }
  return out;
}

// Lists AI-reconstructed-from-image tables (data-allo-reconstructed) in the remediated HTML, for the
// human accept/reject gate. Pure + jsdom-testable. The reconstruction (doc_pipeline) is additive —
// the original image is kept beside each table — so rejecting one just removes the table.
function _listReconstructedTables(html, pipeline) {
  const out = [];
  try {
    const doc = new DOMParser().parseFromString(html || '', 'text/html');
    doc.querySelectorAll('table[data-allo-reconstructed]').forEach((t) => {
      const cap = t.querySelector('caption');
      let previewHtml = '';
      try {
        // A project import or model response can forge the reconstruction marker.
        // Sanitize at the live-DOM boundary; leave the source document untouched.
        const clean = _viewSanitizeMarkupForExport(t.outerHTML, pipeline);
        const preview = new DOMParser().parseFromString(clean, 'text/html');
        const table = preview.querySelector('table[data-allo-reconstructed]');
        if (table) {
          // Document CSS must not restyle the surrounding application.
          table.querySelectorAll('style').forEach((node) => node.remove());
          previewHtml = table.outerHTML;
        }
      } catch (_) { /* Keep review/reject controls available without unsafe markup. */ }
      out.push({
        caption: cap ? cap.textContent.replace(/\s+/g, ' ').trim().slice(0, 100) : '',
        rows: t.querySelectorAll('tbody tr').length,
        html: previewHtml,
      });
    });
  } catch (_) {}
  return out;
}

// ── In-app pipeline diagnostics panel (2026-06-18) ──────────────────────────
// Mirrors window.__alloDiagLog (the warnLog/debugLog ring buffer wired in
// AlloFlowANTI.txt ~L494) into a floating, copyable panel. Inside Gemini Canvas
// the app runs in a sandboxed iframe whose browser console the teacher can't
// open, so this panel is the only way to SEE + COPY the pipeline's diagnostics
// from a remediation run without switching to the billed Firebase deploy.
// Self-contained (its own React hooks via window.React, its own t/addToast
// props) so it adds nothing to PdfAuditView's host-supplied prop contract.
function PdfDiagnosticsLog(props) {
  const R = (typeof window !== 'undefined' && window.React) ? window.React : null;
  if (!R) return null; // invariant across renders (window.React never toggles) → hook order stays stable
  const t = (props && props.t) || ((k) => k);
  const addToast = (props && props.addToast) || function () {};
  const docPipeline = (props && props.docPipeline) || null;
  const [open, setOpen] = R.useState(false);
  const [warnOnly, setWarnOnly] = R.useState(true);
  const [bundleBusy, setBundleBusy] = R.useState(false);
  // Inline outcomes (2026-09-13, Aaron: "make it clearer when copy log works"). A toast can sit
  // behind the modal or vanish before it is read; the button itself now says what happened for a
  // few seconds and a status line under the buttons repeats it for screen readers.
  const [copyState, setCopyState] = R.useState('');
  const [cachesState, setCachesState] = R.useState('');
  const [bundleState, setBundleState] = R.useState('');
  const [panelNote, setPanelNote] = R.useState('');
  const [bundleFallback, setBundleFallback] = R.useState('');
  const _flash = (setter, text, ms) => { setter(text); setTimeout(() => { try { setter(''); } catch (_) {} }, ms || 3500); };
  const [, setTick] = R.useState(0);
  const scrollRef = R.useRef(null);
  const stickRef = R.useRef(true); // true = follow the live tail; flips false when the user scrolls up so new lines don't yank them back to the end
  // While open, repaint ~1/s so new log lines from an in-flight run appear live.
  R.useEffect(() => {
    if (!open) return undefined;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [open]);
  const all = (typeof window !== 'undefined' && Array.isArray(window.__alloDiagLog)) ? window.__alloDiagLog : [];
  const rows = warnOnly ? all.filter((e) => e && e.level === 'warn') : all;
  // Auto-scroll to the newest line ONLY when the user is already at the bottom (following the live
  // tail). If they've scrolled up to read earlier entries, leave their position alone — otherwise
  // the ~1/s repaint above yanks them back to the end every second (the reported "can't scroll
  // back" bug). Gated on rows.length/open (new content or open) so a tick-only repaint never re-pins.
  R.useEffect(() => {
    if (open && stickRef.current && scrollRef.current) { try { scrollRef.current.scrollTop = scrollRef.current.scrollHeight; } catch (_) {} }
  }, [rows.length, open]);
  const _time = (e) => { try { return new Date(e.t).toLocaleTimeString(); } catch (_) { return ''; } };
  const _formatRows = (items) => (items || []).map((e) => '[' + _time(e) + '] ' + (e.level === 'warn' ? 'WARN ' : 'debug ') + String(e.msg || '')).join('\n');
  const _copyText = async (text) => {
    let ok = false;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        ok = true;
      }
    } catch (_) { ok = false; }
    if (!ok) {
      try {
        if (typeof document !== 'undefined' && document.execCommand) {
          const ta = document.createElement('textarea');
          ta.setAttribute('aria-label', 'Temporary field for copying PDF diagnostics');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          ok = document.execCommand('copy');
          document.body.removeChild(ta);
        }
      } catch (_) { ok = false; }
    }
    return ok;
  };
  const _digest8 = (value) => {
    let hash = 2166136261;
    const text = String(value || '');
    for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
    return ('00000000' + (hash >>> 0).toString(16)).slice(-8);
  };
  const _diagnosticBundle = async () => {
    if (bundleBusy) return;
    if (!docPipeline || typeof docPipeline.getDiagnosticSnapshot !== 'function') {
      addToast('Diagnostic bundle is unavailable until the pipeline is ready.', 'error');
      return;
    }
    if (typeof window === 'undefined' || !window.JSZip) {
      addToast(t('toasts.zip_library_loading') || 'Compression library loading - try again in a moment.', 'info');
      return;
    }
    setBundleBusy(true);
    try {
      const snapshot = docPipeline.getDiagnosticSnapshot();
      const bundleJson = JSON.stringify(snapshot, null, 2);
      const logText = _formatRows(all);
      const summary = snapshot && snapshot.throttle && snapshot.throttle.summary;
      const readme = [
        '# AlloFlow diagnostic bundle',
        '',
        'Start here: open bundle.json for the structured run, throttle, call-ledger, warning, and heartbeat evidence.',
        'log.txt is the copyable in-app diagnostic tail. README.md explains the bundle layout.',
        '',
        'This bundle contains counts, timings, classifications, statuses, model identifiers, and environment metadata.',
        'It does not contain prompts, responses, or document text.',
        'Throttle rollup captured on demand: ' + (summary ? 'yes' : 'no') + '.',
      ].join('\n');
      const zip = new window.JSZip();
      zip.file('bundle.json', bundleJson);
      zip.file('log.txt', logText);
      zip.file('README.md', readme);
      const blob = await zip.generateAsync({ type: 'blob' });
      const stamp = new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-');
      const fileName = 'alloflow-diag-' + _digest8(bundleJson) + '-' + stamp + '.zip';
      // Inside Gemini Canvas a programmatic download is silently dropped by the sandbox, so the
      // anchor click used to report "downloaded" while nothing was saved. There the clipboard is
      // the only channel; elsewhere the download is tried first.
      const inCanvas = typeof window !== 'undefined' && !!window._isCanvasEnv;
      let downloaded = false;
      if (!inCanvas) try {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => { try { URL.revokeObjectURL(url); } catch (_) {} }, 0);
        downloaded = true;
      } catch (_) { downloaded = false; }
      const copied = await _copyText(bundleJson);
      if (!downloaded && !copied) {
        // Last resort: show the JSON in the panel so it can be selected and copied by hand.
        setBundleFallback(bundleJson);
        throw new Error(inCanvas
          ? 'Canvas cannot save files and the clipboard refused. The bundle is shown below: select all, copy, and paste it into a file named bundle.json.'
          : 'The bundle could not be downloaded or copied. It is shown below: select all, copy, and paste it into a file named bundle.json.');
      }
      setBundleFallback('');
      _flash(setBundleState, downloaded ? '✓ Downloaded' : '✓ Copied');
      _flash(setPanelNote, downloaded
        ? ('Diagnostic bundle downloaded as ' + fileName + (copied ? '; bundle.json is also on the clipboard.' : '.'))
        : ('Diagnostic bundle copied to the clipboard' + (inCanvas ? ' (Canvas cannot save files): paste it into a file named bundle.json and attach that.' : ' (the download was blocked): paste it into a file named bundle.json.')), 12000);
      addToast('Diagnostic bundle ' + (downloaded ? 'downloaded' : 'ready in clipboard') + (copied ? '; bundle.json copied.' : '.'), downloaded ? 'success' : 'info');
    } catch (e) {
      _flash(setBundleState, '✗ Failed');
      _flash(setPanelNote, 'Diagnostic bundle failed: ' + (e && e.message ? e.message : 'unknown error'), 12000);
      addToast('Diagnostic bundle failed: ' + (e && e.message ? e.message : 'unknown error'), 'error');
    } finally {
      setBundleBusy(false);
    }
  };
  const _copy = async () => {
    const text = rows.map((e) => '[' + _time(e) + '] ' + (e.level === 'warn' ? 'WARN ' : 'debug ') + e.msg).join('\n');
    // Try the async Clipboard API, but FALL BACK to textarea+execCommand on REJECTION too — not
    // only when the API is absent. In Gemini's sandboxed Canvas iframe clipboard.writeText can
    // reject (NotAllowedError); the old `else`-gated fallback never ran in that case, so copy
    // "failed" with no fallback. Now ANY clipboard failure drops to the execCommand path.
    let ok = false;
    try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); ok = true; } } catch (_) { ok = false; }
    if (!ok) {
      try { const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('aria-label', 'Temporary field for copying PDF diagnostics'); ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.focus(); ta.select(); ok = document.execCommand('copy'); document.body.removeChild(ta); } catch (_) { ok = false; }
    }
    _flash(setCopyState, ok ? ('✓ Copied ' + rows.length) : '✗ Not copied');
    _flash(setPanelNote, ok ? ((t('pdf_audit.diag.copied') || 'Diagnostics log copied') + ' (' + rows.length + ' ' + (t('pdf_audit.diag.lines') || 'lines') + ')') : (t('pdf_audit.diag.copy_failed') || 'Could not copy — select the text manually.'), ok ? 6000 : 12000);
    addToast(ok ? ((t('pdf_audit.diag.copied') || 'Diagnostics log copied') + ' (' + rows.length + ')') : (t('pdf_audit.diag.copy_failed') || 'Could not copy — select the text manually.'), ok ? 'success' : 'error');
  };
  const _clear = () => { try { if (Array.isArray(window.__alloDiagLog)) window.__alloDiagLog.length = 0; } catch (_) {} setTick((n) => n + 1); };
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        /* Bottom-LEFT (2026-06-19): reading-tools FAB stack owns bottom-right; this log + the error
           badge form a bottom-left diagnostics cluster. bottom-20 keeps it clear of the badge (bottom-4). */
        className="pdf-workspace-log-button px-3 py-2 rounded-full border text-xs font-medium flex items-center gap-1.5"
        aria-label={t('pdf_audit.diag.open_aria') || 'Open pipeline diagnostics log'}
        title={t('pdf_audit.diag.open_title') || 'Pipeline diagnostics log — view + copy the remediation log (works inside Canvas, no browser console needed)'}
      >
        <span aria-hidden="true">🔧</span>
        <span>{t('pdf_audit.diag.label') || 'Log'}</span>
        {all.length > 0 ? <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-slate-600 text-[10px]">{all.length}</span> : null}
      </button>
    );
  }
  return (
    <div
      className="fixed bottom-20 left-4 z-[210] w-[min(92vw,520px)] max-h-[60vh] flex flex-col rounded-xl shadow-2xl border border-slate-700 bg-slate-900 text-slate-100"
      role="region"
      aria-label={t('pdf_audit.diag.region_aria') || 'Pipeline diagnostics log'}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700">
        <span className="text-sm font-semibold flex items-center gap-1.5"><span aria-hidden="true">🔧</span>{t('pdf_audit.diag.title') || 'Pipeline diagnostics'}</span>
        <span className="text-[11px] text-slate-400">{rows.length}{warnOnly ? '' : '/' + all.length} {t('pdf_audit.diag.lines') || 'lines'}</span>
        <label className="ml-auto flex items-center gap-1 text-[11px] text-slate-300 cursor-pointer select-none">
          <input type="checkbox" checked={warnOnly} onChange={(e) => setWarnOnly(e.target.checked)} className="accent-amber-500" />
          {t('pdf_audit.diag.warn_only') || 'Warnings only'}
        </label>
      </div>
      <div ref={scrollRef} onScroll={(e) => { const el = e.currentTarget; try { stickRef.current = (el.scrollHeight - el.scrollTop - el.clientHeight) < 48; } catch (_) {} }} className="flex-1 overflow-y-auto px-3 py-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words">
        {rows.length === 0
          ? <div className="text-slate-500 italic">{t('pdf_audit.diag.empty') || 'No log entries yet — run a remediation and they will appear here live.'}</div>
          : rows.map((e, i) => (
              <div key={i} className={e.level === 'warn' ? 'text-amber-300' : 'text-slate-400'}>
                <span className="text-slate-600">{_time(e)}</span>{' '}{e.msg}
              </div>
            ))}
      </div>
      <div className="flex items-center gap-2 px-3 py-2 border-t border-slate-700">
        <button type="button" onClick={_copy} className={'px-2.5 py-1 rounded text-xs font-medium ' + (copyState ? (copyState.startsWith('✓') ? 'bg-emerald-600' : 'bg-rose-600') : 'bg-indigo-600 hover:bg-indigo-500')}>{copyState || (t('pdf_audit.diag.copy') || 'Copy')}</button>
        <button type="button" onClick={_clear} className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-xs">{t('pdf_audit.diag.clear') || 'Clear'}</button>
        <button
          type="button"
          /* (2026-08-15, Aaron) Cache escape that does NOT require the audit modal: the existing
             Clear-cache button lives inside the cached-result header, which is unreachable when
             the symptom under diagnosis is "the modal never opened". This panel is always
             reachable. Same pipeline export; prefix-scoped, never touches batch-resume stores. */
          onClick={async () => {
            try {
              const _pipe = docPipeline || (typeof window !== 'undefined' && window.AlloModules && window.AlloModules.DocPipelineModule) || null;
              if (!_pipe || typeof _pipe.clearPdfDocumentCaches !== 'function') { addToast(t('pdf_audit.clear_cache_unavailable') || 'Cache clearing is unavailable on this host version.', 'warning'); return; }
              const _res = await _pipe.clearPdfDocumentCaches();
              _flash(setCachesState, '✓ Cleared' + (_res && Number.isFinite(_res.cleared) ? ' ' + _res.cleared : ''));
              _flash(setPanelNote, (t('pdf_audit.diag.caches_cleared') || 'Document caches cleared') + (_res && Number.isFinite(_res.cleared) ? ' (' + _res.cleared + ')' : '') + '. The next run starts fresh.', 6000);
              addToast('🧹 ' + ((t('pdf_audit.diag.caches_cleared') || 'Document caches cleared') + (_res && Number.isFinite(_res.cleared) ? ' (' + _res.cleared + ')' : '')), 'success');
            } catch (e) { _flash(setCachesState, '✗ Failed'); _flash(setPanelNote, 'Cache clear failed: ' + ((e && e.message) || e), 12000); addToast('Cache clear failed: ' + ((e && e.message) || e), 'error'); }
          }}
          className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-xs"
          title={t('pdf_audit.diag.forget_caches_title') || 'Forget cached audit/remediation results so the next run is fully fresh (diagnostics)'}
        >{cachesState || ('🧹 ' + (t('pdf_audit.diag.forget_caches') || 'Forget caches'))}</button>
        <button type="button" onClick={_diagnosticBundle} disabled={bundleBusy} className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-xs" title="Download a privacy-safe developer diagnostic bundle">{bundleBusy ? 'Building...' : (bundleState || 'Diagnostic bundle')}</button>
        <button type="button" onClick={() => setOpen(false)} className="ml-auto px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-xs" aria-label={t('pdf_audit.diag.close_aria') || 'Close diagnostics log'}>{t('pdf_audit.diag.close') || 'Close'}</button>
      </div>
      {(panelNote || bundleFallback) && (
        <div className="px-3 py-2 border-t border-slate-700 text-[11px] text-slate-200" role="status">
          {panelNote}
          {bundleFallback && <textarea readOnly value={bundleFallback} onFocus={(e) => { try { e.target.select(); } catch (_) {} }} aria-label="Diagnostic bundle JSON. Select all and copy." className="mt-1 w-full h-24 text-[10px] font-mono bg-slate-800 text-slate-100 rounded p-1" />}
        </div>
      )}
    </div>
  );
}

