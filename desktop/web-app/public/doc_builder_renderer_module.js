(function(){"use strict";
if(window.AlloModules&&window.AlloModules.DocBuilderRendererModule){console.log("[CDN] DocBuilderRendererModule already loaded, skipping"); return;}
// doc_builder_renderer_source.jsx — deterministic structured-block HTML renderer.
// Kept separate from the remediation orchestrator so block rendering has an
// explicit dependency contract and can be exercised without running the PDF pipeline.

function createDocBuilderRenderer(deps) {
  deps = deps || {};
  const {
    docStyle,
    _accessibleHeaderColors,
    _alloCellRichText,
    _emitAccessibleTableHtml,
    _pipeLog,
    _sanitizeRawHtmlBlock,
    _validateTableGrid,
    renderWordArtHtml,
    warnLog,
  } = deps;
  if (!docStyle || typeof docStyle !== 'object') throw new Error('DocBuilderRenderer requires docStyle');
  for (const pair of [
    ['_accessibleHeaderColors', _accessibleHeaderColors],
    ['_alloCellRichText', _alloCellRichText],
    ['_emitAccessibleTableHtml', _emitAccessibleTableHtml],
    ['_pipeLog', _pipeLog],
    ['_sanitizeRawHtmlBlock', _sanitizeRawHtmlBlock],
    ['_validateTableGrid', _validateTableGrid],
    ['renderWordArtHtml', renderWordArtHtml],
  ]) {
    if (typeof pair[1] !== 'function') throw new Error('DocBuilderRenderer requires ' + pair[0]);
  }
const renderJsonToHtml = (blocks) => {
        if (!Array.isArray(blocks)) return '';
        return blocks.map((block, blockIdx) => {
          // Guard: skip invalid blocks
          if (!block || typeof block !== 'object') return '';
          // Operate on a shallow CLONE so this renderer is idempotent: the chunked-generation path
          // re-invokes renderJsonToHtml on the SAME blocks array on retry, and the normalizations below
          // mutate fields in place — double-cleaning a second time corrupted the output. Clone touches
          // only primitive fields + reassigns block.items to a new array, so a shallow copy is safe.
          block = { ...block };
          // ── Normalize alternate schemas ──
          // Gemini sometimes returns {"tag":"p","class":"ds6","content":"..."} or
          // {"element":"p","text":"..."} instead of {"type":"p","text":"..."}.
          // Map all known variants to the canonical {type, text} schema.
          if (!block.type && block.tag) block.type = block.tag;
          if (!block.type && block.element) block.type = block.element;
          if (!block.text && block.content) block.text = block.content;
          if (!block.text && block.value) block.text = block.value;
          if (!block.text && block.body) block.text = block.body;
          // "fixed_html" or "output_html" as raw HTML content
          if (!block.html && block.fixed_html) block.html = block.fixed_html;
          if (!block.html && block.output_html) block.html = block.output_html;
          if (!block.html && block.accessible_html) block.html = block.accessible_html;
          if (!block.type && !block.text && !block.html && !block.title && !block.items) return '';
          if (!block.type && block.text) block.type = 'p';
          if (!block.type && block.title) block.type = 'banner';
          if (!block.type && block.items) block.type = 'ul';
          if (!block.type && block.headers) block.type = 'table';
          if (!block.type && block.html) block.type = 'rawhtml';
          if (!block.type && block.description) block.type = 'image';
          const sanitizeField = (val) => { if (typeof val !== 'string') return String(val || ''); return val.replace(/\\\\n/g, ' ').replace(/\\0/g, '').trim(); };
          // XSS guard: AI-produced block text is interpolated into the HTML templates
          // below. A prompt-injected / compromised model could emit <img onerror=…>,
          // <script>, or event handlers. Escape ALL markup, then re-allow ONLY
          // attribute-less safe inline tags so intended emphasis survives while every
          // scripting vector is neutralized (no attributes can pass the allow-list).
          const escapeTextField = (val) => {
            const s = String(val == null ? '' : val)
              .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            return s
              .replace(/&lt;(\/?(?:strong|em|b|i|u|sub|sup|mark|code|s|small))&gt;/gi, '<$1>')
              .replace(/&lt;br\s*\/?&gt;/gi, '<br>');
          };
          // Only allow safe URL schemes in link hrefs (block javascript:, data:, etc.).
          const safeHref = (u) => { const v = String(u || '').trim(); return /^(https?:|mailto:|tel:|#|\/|\.)/i.test(v) ? v.replace(/"/g, '&quot;') : '#'; };
          try {
          // Clean block text: strip JSON field names, id tags, literal \n, and type labels
          if (block.text) {
            block.text = block.text
              .replace(/\\n/g, ' ')
              .replace(/\n?id:\s*[a-z0-9-]+\n?/gi, '')
              .replace(/^(description|alt|title|subtitle|caption|type|text|items|headers|rows):\s*/gim, '') // strip leaked JSON field names
              .replace(/^(banner|blockquote|image|hr|ul|ol|p|h[1-6])\s*$/gim, '') // strip bare type names on own line
              .replace(/\n{2,}/g, '\n').trim();
          }
          // Clean title/subtitle on banner blocks
          if (block.title) block.title = block.title.replace(/^title:\s*/i, '').replace(/\\n/g, ' ').trim();
          if (block.subtitle) block.subtitle = block.subtitle.replace(/^subtitle:\s*/i, '').replace(/\\n/g, ' ').trim();
          if (block.description) block.description = block.description.replace(/^description:\s*/i, '').replace(/\\n/g, ' ').trim();
          if (block.alt) block.alt = block.alt.replace(/^alt:\s*/i, '').replace(/\\n/g, ' ').trim();
          if (block.caption) block.caption = block.caption.replace(/^caption:\s*/i, '').replace(/\\n/g, ' ').trim();
          // Also clean items arrays (lists)
          if (block.items) {
            block.items = block.items.map(item => (item || '').replace(/\\n/g, ' ').replace(/^(items|text):\s*/i, '').trim());
          }
          // Extract id from text if not in id field (AI sometimes puts "id: slug" in text)
          if (!block.id && block.text) {
            const idMatch = block.text.match(/^id:\s*([a-z0-9-]+)/i);
            if (idMatch) { block.id = idMatch[1]; block.text = block.text.replace(idMatch[0], '').trim(); }
          }
          // XSS: block.id from AI JSON is interpolated into an id="…" attribute; constrain it to an
          // id-safe charset (matches the [a-z0-9-] filter on the text-extraction path above) so a value
          // like '"><img src=x onerror=…>' can't break out of the attribute.
          const _safeId = block.id ? String(block.id).replace(/[^a-zA-Z0-9_-]/g, '') : '';
          const id = _safeId ? ` id="${_safeId}"` : '';
          switch (block.type) {
            case 'h1': return `<h1${id} style="color:${docStyle.headingColor};font-size:1.75rem;font-weight:bold;border-bottom:3px solid ${docStyle.accentColor};padding-bottom:0.5rem;margin:1.5em 0 0.5em">${escapeTextField(block.text)}</h1>`;
            case 'h2': return `<h2${id} style="color:${docStyle.headingColor};font-size:1.35rem;font-weight:bold;margin:1.5em 0 0.5em;${docStyle.hasSidebarAccents ? 'border-left:4px solid ' + docStyle.accentColor + ';padding-left:12px;' : ''}">${escapeTextField(block.text)}</h2>`;
            case 'h3': return `<h3${id} style="color:${docStyle.headingColor};font-size:1.1rem;font-weight:bold;margin:1.2em 0 0.4em">${escapeTextField(block.text)}</h3>`;
            // h4/h5/h6 (2026-06-19): the Vision pass legitimately emits deep headings (a single run logged
            // 11 "unknown block type: h4 — salvaged"), which previously fell to the salvage path and were
            // FLATTENED to plain text — destroying the heading hierarchy the doc actually has. Render them
            // as real headings so the structure survives (the deterministic heading-skip pass still guards
            // against illegal level jumps).
            case 'h4': return `<h4${id} style="color:${docStyle.headingColor};font-size:1rem;font-weight:bold;margin:1em 0 0.3em">${escapeTextField(block.text)}</h4>`;
            case 'h5': return `<h5${id} style="color:${docStyle.headingColor};font-size:0.95rem;font-weight:bold;margin:1em 0 0.3em">${escapeTextField(block.text)}</h5>`;
            case 'h6': return `<h6${id} style="color:${docStyle.headingColor};font-size:0.9rem;font-weight:bold;margin:1em 0 0.3em">${escapeTextField(block.text)}</h6>`;
            case 'p': return `<p style="margin:0.6em 0;line-height:1.7">${escapeTextField(block.text)}</p>`;
            case 'ul': return `<ul style="margin:0.6em 0;padding-left:1.5em">${(Array.isArray(block.items) ? block.items : [block.text || '']).filter(Boolean).map(i => `<li style="margin:0.3em 0">${escapeTextField(sanitizeField(i))}</li>`).join('')}</ul>`;
            case 'ol': return `<ol style="margin:0.6em 0;padding-left:1.5em">${(Array.isArray(block.items) ? block.items : [block.text || '']).filter(Boolean).map(i => `<li style="margin:0.3em 0">${escapeTextField(sanitizeField(i))}</li>`).join('')}</ol>`;
            case 'table': {
              // Reconstructed-from-image tables carry a data-allo-reconstructed attribute so the
              // results-panel review gate can list them for human verify/reject (the original image
              // is kept as a sibling). The inline "AI-reconstructed" caption note was removed
              // 2026-06-16 — it leaked into the exported/saved document and read as unpolished.
              const _recon = !!block._reconstructed;
              // Rich grid path (2026-06-14): when the vision pass filled a neutral
              // grid (per-cell colspan/rowspan/isHeader/scope), validate span
              // consistency and emit accessibility-grade HTML. On ANY validation
              // failure, fall through to the flat headers/rows path below — a broken
              // span grid must never ship as malformed table markup (accept-or-revert).
              if (block.grid && Array.isArray(block.grid.rows)) {
                const _gv = _validateTableGrid(block.grid);
                if (_gv.ok) {
                  // Sampled-from-original header colour (when the vision pass estimated one): keep the
                  // original's look but force the header TEXT to AA contrast on that fill (cosmetic only;
                  // falls back to the doc palette when no/invalid colour).
                  const _hdr = _accessibleHeaderColors(block.headerBg);
                  // XSS: _emitAccessibleTableHtml's `esc` is whatever opts.sanitize is, applied to cell +
                  // caption ELEMENT CONTENT. Passing the bare sanitizeField (which only strips \n/\0)
                  // DISABLED escaping on this rich/grid reconstructed-table path — untrusted vision text
                  // then reached the recon dangerouslySetInnerHTML sink raw. Escape like the flat path.
                  return _emitAccessibleTableHtml(block.grid, {
                    // #G: cell strings carrying list-ish markup / "• " lines become REAL nested lists;
                    // plain cells escape exactly as before (every text run still goes through the escaper).
                    sanitize: (v) => _alloCellRichText(v, (t) => escapeTextField(sanitizeField(t))),
                    tableBorder: docStyle.tableBorder,
                    tableBg: _hdr ? _hdr.bg : docStyle.tableBg,
                    headColor: docStyle.headingColor,
                    thColor: _hdr ? _hdr.fg : undefined,
                    reconAttr: _recon,
                  });
                }
                warnLog('[Table] grid failed span-consistency (' + _gv.reason + ') — flattening grid cells to a flat table (degraded, non-empty)');
                // Render-time recovery: a grid that fails RE-validation here has no
                // image to revert to (the original image is a separate sibling block
                // already emitted), and this block carries NO headers/rows. Falling
                // straight through would emit an EMPTY <table> (latent bug). Flatten the
                // verbatim grid text into the flat headers/rows shape the path below
                // consumes — degraded (scope/spans dropped) but readable and non-empty.
                // Only synthesize when the flat shape is absent (preserve the documented
                // grid+headers/rows backward-compat). (tbl-empty-table-latent)
                if (!Array.isArray(block.headers) && !Array.isArray(block.rows)) {
                  const _gr = block.grid.rows;
                  const _cellTxt = (cells) => (Array.isArray(cells) ? cells : []).map(c => (c && c.text) || '');
                  const _firstAllHeader = _gr[0] && Array.isArray(_gr[0].cells) && _gr[0].cells.length > 0 && _gr[0].cells.every(c => c && c.isHeader);
                  if (_firstAllHeader) {
                    block.headers = _cellTxt(_gr[0].cells);
                    block.rows = _gr.slice(1).map(r => _cellTxt(r && r.cells));
                  } else {
                    block.rows = _gr.map(r => _cellTxt(r && r.cells));
                  }
                }
              }
              // XSS: cell/header/caption text on a reconstructed-from-image table is vision output from
              // an untrusted PDF; it is interpolated into element content here and later re-rendered via
              // dangerouslySetInnerHTML (the recon-table mini-preview). sanitizeField only strips \n/\0 —
              // it does NOT escape markup. Escape like the headings/lists above (attribute-less safe inline
              // tags survive; every scripting vector is neutralized). The grid path is escaped too — it now
              // passes an escaping sanitize closure to _emitAccessibleTableHtml (see the grid branch above).
              const cap = block.caption ? `<caption style="font-weight:bold;text-align:left;margin-bottom:0.5rem;color:${docStyle.headingColor}">`+escapeTextField(sanitizeField(block.caption))+`</caption>` : '';
              const hdrs = Array.isArray(block.headers) ? block.headers : [];
              const hdr = hdrs.length > 0 ? `<thead><tr>`+hdrs.map(h => `<th scope="col" style="background:${docStyle.tableBg};border:1px solid ${docStyle.tableBorder};padding:8px 12px;font-weight:bold;text-align:left">`+escapeTextField(sanitizeField(h))+`</th>`).join('')+`</tr></thead>` : '';
              const rowsArr = Array.isArray(block.rows) ? block.rows : [];
              // #G: same in-cell list net as the grid path — the model has no JSON shape for a bulleted
              // list inside a cell, so literal "<ul><li>" (or "• " lines) in a cell string is rebuilt as a
              // real nested list instead of shipping escaped tags as visible text.
              const _cellEsc = (v) => _alloCellRichText(v, (t) => escapeTextField(sanitizeField(t)));
              const rows = rowsArr.map(row => {
                if (!Array.isArray(row)) return `<tr><td style="border:1px solid ${docStyle.tableBorder};padding:8px 12px">`+_cellEsc(row)+`</td></tr>`;
                return `<tr>`+row.map(cell => `<td style="border:1px solid ${docStyle.tableBorder};padding:8px 12px">`+_cellEsc(cell)+`</td>`).join('')+`</tr>`;
              }).join('');
              return `<table${_recon ? ' data-allo-reconstructed="image"' : ''} style="width:100%;border-collapse:collapse;margin:1em 0">`+cap+hdr+`<tbody>`+rows+`</tbody></table>`;
            }
            case 'definition_list': {
              // Semantic match for legends/keys: each entry pairs a marker description
              // (color/symbol) with its label. SR users navigate <dl> as "term/definition"
              // pairs which is what a legend semantically IS — better than a flat table.
              // Sections (with optional <h4> heading) preserve any visible subgroupings.
              const _legCap = block.caption ? `<figcaption style="font-weight:bold;color:${docStyle.headingColor};margin-bottom:0.5rem;font-size:1em">`+escapeTextField(sanitizeField(block.caption))+`</figcaption>` : '';
              const _legIntro = block.intro ? `<p style="margin:0 0 0.75rem;color:${docStyle.bodyColor};font-size:0.95em;line-height:1.6">`+escapeTextField(sanitizeField(block.intro))+`</p>` : '';
              const _legSections = (Array.isArray(block.sections) ? block.sections : []).map(sec => {
                const _heading = sec && sec.title ? `<h4 style="margin:1em 0 0.4em;color:${docStyle.headingColor};font-size:1em;font-weight:bold">`+escapeTextField(sanitizeField(sec.title))+`</h4>` : '';
                const _entries = (Array.isArray(sec && sec.entries) ? sec.entries : []).map(e => {
                  const _marker = e && e.marker ? escapeTextField(sanitizeField(e.marker)) : '';
                  const _label = e && e.label ? escapeTextField(sanitizeField(e.label)) : '';
                  return `<dt style="font-weight:600;color:${docStyle.bodyColor};margin-top:0.4em">`+_marker+`</dt>`
                       + `<dd style="margin:0 0 0.4em 1.5em;color:${docStyle.bodyColor};line-height:1.5">`+_label+`</dd>`;
                }).join('');
                return _heading + (_entries ? `<dl style="margin:0">`+_entries+`</dl>` : '');
              }).join('');
              return `<figure role="group" aria-label="${(block.caption ? sanitizeField(block.caption).replace(/"/g,'&quot;') : 'Figure legend')}" style="margin:1em 0;padding:1em 1.25em;background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px">`
                + _legCap + _legIntro + _legSections + `</figure>`;
            }
            case 'image': {
              // Uploadable placeholder: even when extractedImages is empty (no extraction happened),
              // users can still upload their own image in the preview. The deferred-image block
              // downstream upgrades the src when a real extracted image is available.
              // Colors chosen for WCAG AA on the #f1f5f9 placeholder bg: #475569 caption (5.35:1),
              // #64748b border (3.92:1 — passes 1.4.11 non-text contrast).
              // Raw description; escaped with escapeTextField at the element-content sink below (its only
              // consumer). Vision-derived text is untrusted — see the table-path XSS note above.
              const _imgDesc = (block.description || block.alt || 'Image');
              const _imgAltSafe = (block.description || block.alt || 'Image').replace(/\\/g, '').replace(/"/g, '').replace(/'/g, ''); // strip backslash too (a trailing \ escapes the JS-string delimiter)
              const _imgId = 'pdf-img-ph-' + (block.id ? String(block.id).replace(/[^a-z0-9]/gi, '') : Math.random().toString(36).slice(2, 8));
              const _captionText = block.description || block.alt || '';
              // Drag-and-drop + pick-extracted support: handlers pull a dataURL from
              // either the drop dataTransfer, a local file picker, or the shared
              // window.__alloflowExtractedImages list populated by the main app on iframe load.
              // FIX: remove any open thumbnail picker FIRST, and scope the <img> lookup
              // to direct children only. Without this, `c.querySelector('img')` finds
              // a thumbnail *inside* the picker (not a real target), and the subsequent
              // child-wipe removes the picker — taking the newly-aliased target with it,
              // so the inserted image appears for one frame then vanishes.
              const _insertFn = `function(c, dataUrl, altText){`
                + `var pk=c.querySelector('[data-alloflow-picker]');if(pk)pk.remove();`
                + `var target=null;var kids=c.children;for(var ii=0;ii<kids.length;ii++){if(kids[ii].tagName==='IMG'){target=kids[ii];break;}}`
                + `if(target){target.src=dataUrl;if(altText)target.alt=altText;}`
                + `else{target=document.createElement('img');target.src=dataUrl;target.alt=altText||'Image';target.style.cssText='max-width:100%;border-radius:8px;border:1px solid #e2e8f0';c.appendChild(target);}`
                + `c.style.background='none';c.style.border='none';c.style.padding='0';c.style.minHeight='0';`
                + `Array.from(c.children).forEach(function(ch){if(ch!==target)ch.remove();});`
                + `c.removeAttribute('ondragover');c.removeAttribute('ondragleave');c.removeAttribute('ondrop');target.style.width='100%';target.style.height='auto';target.setAttribute('width','600');var _bar=document.createElement('div');_bar.className='allo-img-controls';_bar.setAttribute('contenteditable','false');_bar.style.cssText='display:flex;gap:6px;align-items:center;justify-content:center;margin-top:4px;font-size:11px;color:#475569';var _cur=100;var _lab=document.createElement('span');var _apply=function(){target.style.width=_cur+'%';target.setAttribute('width',String(Math.round(_cur*6)));_lab.textContent='size '+_cur+'%';try{if(window.parent&&window.parent.__alloflowOnPdfPreviewMutated)window.parent.__alloflowOnPdfPreviewMutated();}catch(_){}};var _mk=function(l,f){var b=document.createElement('button');b.type='button';b.textContent=l;b.title='Resize image (persists in every export)';b.style.cssText='padding:2px 9px;border:1px solid #cbd5e1;border-radius:6px;background:#f8fafc;cursor:pointer;font-size:11px;font-weight:700';b.onclick=function(ev){ev.preventDefault();f();};return b;};_bar.appendChild(_mk('\u2212',function(){_cur=Math.max(25,_cur-25);_apply();}));_bar.appendChild(_lab);_bar.appendChild(_mk('+',function(){_cur=Math.min(100,_cur+25);_apply();}));_apply();if(target.parentNode===c)c.appendChild(_bar);else if(target.parentNode)target.parentNode.insertBefore(_bar,target.nextSibling);`
                // Notify the parent app that the iframe DOM was mutated so it can
                // sync the new outerHTML into pdfFixResult.accessibleHtml. Without
                // this, image swaps live only in the iframe and get wiped by any
                // updatePdfPreview() call (theme/font/a11y/auto-fix/etc.).
                + `try{if(window.parent&&window.parent.__alloflowOnPdfPreviewMutated)window.parent.__alloflowOnPdfPreviewMutated();}catch(_){}}`;
              const _dragOver = `event.preventDefault();this.style.borderColor='#4f46e5';this.style.background='#eef2ff';`;
              const _dragLeave = `this.style.borderColor='#64748b';this.style.background='#f1f5f9';`;
              const _dropHandler = `(function(c,ev){ev.preventDefault();c.style.borderColor='#64748b';c.style.background='#f1f5f9';try{var raw=ev.dataTransfer.getData('text/x-alloflow-image');if(raw){var d=JSON.parse(raw);if(d&&d.src){(${_insertFn})(c,d.src,d.alt||'${_imgAltSafe}');return;}}var f=ev.dataTransfer.files&&ev.dataTransfer.files[0];if(f){var r=new FileReader();r.onload=function(e){(${_insertFn})(c,e.target.result,'${_imgAltSafe}');};r.readAsDataURL(f);}}catch(_){}})(this,event)`;
              const _uploadHandler = `(function(el){var f=el.files[0];if(!f)return;var r=new FileReader();r.onload=function(e){var c=document.getElementById('${_imgId}-container');(${_insertFn})(c,e.target.result,'${_imgAltSafe}');};r.readAsDataURL(f);})(this)`;
              // IMPORTANT: the handler string ends up inside onclick="..." so literal double
              // quotes inside msg.textContent would prematurely terminate the HTML attribute
              // and silently break the button. Use curly quotes (\u201C \u201D) around the
              // referenced button label — visually identical to the user, safe for HTML attrs.
              const _pickHandler = `(function(btn){var c=document.getElementById('${_imgId}-container');if(!c)return;var _lL=(typeof window!=='undefined'&&window.__alloflowExtractedImages)||null;var _pL=(function(){try{return window.parent&&window.parent.__alloflowExtractedImages;}catch(_){return null;}})();var list=(_pL&&_pL.length)?_pL:((_lL&&_lL.length)?_lL:(_pL||_lL||[]));var prevMsg=c.querySelector('[data-alloflow-nomsg]');if(prevMsg)prevMsg.remove();if(!list.length){var msg=document.createElement('div');msg.setAttribute('data-alloflow-nomsg','true');msg.style.cssText='margin-top:0.5rem;padding:8px 12px;background:#fef3c7;border:1px solid #fcd34d;border-radius:6px;font-size:12px;color:#92400e;max-width:90%';msg.textContent='No extracted images yet. Upload a PDF that contains images, or click the \\u201CUpload image\\u201D button to pick a local file.';c.appendChild(msg);setTimeout(function(){msg.remove();},5000);return;}var ex=c.querySelector('[data-alloflow-picker]');if(ex){ex.remove();return;}var p=document.createElement('div');p.setAttribute('data-alloflow-picker','true');p.style.cssText='margin-top:0.75rem;padding:0.5rem;background:#fff;border:1px solid #cbd5e1;border-radius:6px;display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:4px;width:100%;max-height:220px;overflow-y:auto';list.forEach(function(img,i){if(!img||!img.src)return;var t=document.createElement('img');t.src=img.src;t.alt=img.description||('Image '+(i+1));t.title=img.description||('Image '+(i+1));t.style.cssText='width:100%;height:60px;object-fit:cover;cursor:pointer;border:1px solid #e2e8f0;border-radius:4px';t.onclick=function(){(${_insertFn})(c,img.src,img.description||'${_imgAltSafe}');};p.appendChild(t);});c.appendChild(p);})(this)`;
              // One-click removal (2026-06-11, user report: deleting a
              // placeholder required manual selection — not intuitive).
              return `<figure id="${_imgId}-figure" data-img-placeholder="true" style="position:relative;margin:1em 0">`
                + `<button type="button" contenteditable="false" onclick="(function(){var f=document.getElementById('${_imgId}-figure');if(f)f.remove();try{if(window.parent&&window.parent.__alloflowOnPdfPreviewMutated)window.parent.__alloflowOnPdfPreviewMutated();}catch(_){}})()" aria-label="Remove this image placeholder" title="Remove this image placeholder" style="position:absolute;top:6px;right:6px;z-index:2;width:24px;height:24px;border-radius:50%;background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5;font-weight:700;font-size:14px;line-height:1;cursor:pointer">×</button>`
                + `<div id="${_imgId}-container" style="background:#f1f5f9;border:2px dashed #64748b;border-radius:8px;padding:1rem;text-align:center;min-height:120px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.5rem" ondragover="${_dragOver}" ondragleave="${_dragLeave}" ondrop="${_dropHandler}">`
                + `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#334155" stroke-width="1.5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>`
                + `<span style="font-size:13px;color:#334155;font-weight:600">Image placeholder</span>`
                + `<span style="font-size:12px;color:#475569;max-width:90%">${escapeTextField(_imgDesc.substring(0, 140))}${_imgDesc.length > 140 ? '…' : ''}</span>`
                + `<span style="font-size:11px;color:#64748b;font-style:italic">Drag an extracted image here, or:</span>`
                + `<div style="display:flex;gap:6px;margin-top:0.25rem;flex-wrap:wrap;justify-content:center">`
                + `<label style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:#1d4ed8;color:#ffffff !important;border:1px solid #1e3a8a;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg><span style="color:#ffffff !important">Upload image</span><input type="file" accept="image/*" style="display:none" onchange="${_uploadHandler}"></label>`
                + `<button type="button" onclick="${_pickHandler}" style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:#7c3aed;color:#ffffff !important;border:1px solid #5b21b6;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer" aria-label="Pick from extracted images"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span style="color:#ffffff !important">Pick extracted</span></button>`
                + `</div>`
                + `</div>`
                + (_captionText ? `<figcaption style="font-size:0.9em;color:#475569;font-style:italic;margin-top:0.5rem">${escapeTextField(_captionText)}</figcaption>` : '')
                + `</figure>`;
            }
            case 'link': return `<a href="${safeHref(block.url)}" style="color:${docStyle.accentColor}">${escapeTextField(block.text)}</a>`;
            case 'blockquote': return `<blockquote style="border-left:4px solid ${docStyle.accentColor};padding:12px 16px;margin:1em 0;background:${docStyle.bgColor === '#ffffff' ? '#f8fafc' : docStyle.bgColor};border-radius:0 8px 8px 0;font-style:italic">${escapeTextField(block.text)}</blockquote>`;
            case 'hr': return `<hr style="border:none;border-top:2px solid ${docStyle.sectionBorderColor};margin:2em 0">`;
            case 'wordart': {
              // Decorative stylized text. Renders via the shared WORD_ART_PRESETS so the in-app
              // Document Builder preview and the exported PDF/HTML match exactly.
              return renderWordArtHtml(block.text || block.title || '', block.preset || block.style || 'goldFoil', block.size || 'L', block.align || 'center');
            }
            case 'banner': {
              // Compute an AA-safe text color from the LIGHTEST stop of the header
              // background (solid or gradient). axe-core samples one representative bg
              // color and will fail white-on-yellow even when text-shadow makes it
              // visually readable — so we pick a text color that meets 4.5:1 against
              // the worst-case stop. Dark backgrounds still resolve to white (unchanged).
              const _bTitle = block.title || '';
              const _bSubtitle = block.subtitle || '';
              const _bEyebrow = block.eyebrow || '';
              const _accent = docStyle.accentColor || '#fbbf24';
              const _computeBannerText = (bg) => {
                try {
                  const s = String(bg || '');
                  const stops = [];
                  const hexRe = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
                  let m;
                  while ((m = hexRe.exec(s)) !== null) {
                    let h = m[1];
                    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
                    stops.push([parseInt(h.substr(0,2),16), parseInt(h.substr(2,2),16), parseInt(h.substr(4,2),16)]);
                  }
                  const rgbRe = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g;
                  while ((m = rgbRe.exec(s)) !== null) stops.push([+m[1], +m[2], +m[3]]);
                  if (!stops.length) return '#ffffff'; // unknown → preserve prior visual
                  const srgb = (c) => c <= 0.03928 ? c/12.92 : Math.pow((c + 0.055)/1.055, 2.4);
                  const lumOf = ([r,g,b]) => 0.2126*srgb(r/255) + 0.7152*srgb(g/255) + 0.0722*srgb(b/255);
                  const cr = (a, b) => { const l1 = lumOf(a), l2 = lumOf(b); return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05); };
                  // Worst case for text is whichever stop has MAX luminance (brightest bg).
                  let lightest = stops[0];
                  for (let i = 1; i < stops.length; i++) if (lumOf(stops[i]) > lumOf(lightest)) lightest = stops[i];
                  // If even the lightest stop is dark → safe to keep white.
                  if (lumOf(lightest) < 0.35) return '#ffffff';
                  // Otherwise drive near-black darker until >=4.5:1 against the lightest stop.
                  let r = 31, g = 41, b = 55; // #1f2937
                  for (let i = 0; i < 25 && cr([r,g,b], lightest) < 4.5; i++) {
                    r = Math.max(0, Math.round(r * 0.82));
                    g = Math.max(0, Math.round(g * 0.82));
                    b = Math.max(0, Math.round(b * 0.82));
                  }
                  return '#' + [r,g,b].map(c => c.toString(16).padStart(2,'0')).join('');
                } catch (_) { return '#ffffff'; }
              };
              const _bText = _computeBannerText(docStyle.headerBg);
              // Text-shadow direction is still a nice-to-have even when color already passes;
              // we keep it but flip to a light shadow when text is dark (preserves legibility
              // if the lightest stop is also where the text sits).
              const _isDarkText = _bText !== '#ffffff';
              const _shadow = _isDarkText
                ? '0 1px 2px rgba(255,255,255,0.35)'
                : '0 2px 4px rgba(0,0,0,0.35)';
              const _shadowSm = _isDarkText
                ? '0 1px 1px rgba(255,255,255,0.3)'
                : '0 1px 2px rgba(0,0,0,0.3)';
              // #G (2026-07-05): the title is the ONE block the pipeline itself knows is the document
              // title, yet it shipped as a styled <div> — the source of both Equal Access findings on the
              // 7/5 scanned-book run ("missing h1", "no <header> landmark") and the PDF self-check's
              // "first heading is H2" warning. Emit a real <h1> (same visual styles, margins zeroed) and
              // mark the card data-allo-banner so runDeterministicWcagFixes lifts it into the top-level
              // <header> BEFORE <main> (a header nested inside <main> is not a banner landmark). A
              // chunk-merged doc can render several banner cards: _alloEnsureSingleH1 demotes the extra
              // h1s, and only a card that OPENS the body is lifted, so mid-body cards stay plain divs.
              return `<div data-allo-banner="true" style="position:relative;background:${docStyle.headerBg};color:${_bText} !important;padding:36px 40px;border-radius:14px;margin-bottom:28px;overflow:hidden;border-left:6px solid ${_accent};box-shadow:0 6px 20px rgba(15,23,42,0.18)">`
                + (_bEyebrow ? '<p style="color:' + _bText + ' !important;font-size:0.75em;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;opacity:0.95;margin:0 0 10px;text-shadow:' + _shadowSm + '">' + escapeTextField(_bEyebrow) + '</p>' : '')
                + (_bTitle ? '<h1 style="color:' + _bText + ' !important;font-size:2.1em;font-weight:800;line-height:1.1;letter-spacing:-0.01em;margin:0;text-shadow:' + _shadow + '">' + escapeTextField(_bTitle) + '</h1>' : '')
                + (_bSubtitle ? '<p style="color:' + _bText + ' !important;font-size:1.1em;font-weight:500;margin:10px 0 0;text-shadow:' + _shadowSm + '">' + escapeTextField(_bSubtitle) + '</p>' : '')
                + `</div>`;
            }
            case 'rawhtml': {
              // Sanitize model-supplied / imported HTML before trusting it. Prefer DOMPurify
              // (a real HTML parser — catches mutation-XSS, entity-encoded schemes, and nested
              // polyglots) when it's loaded; otherwise fall through to the regex baseline, which
              // strips scripts/styles, active-content tags (iframe/object/embed/svg/math/link/
              // meta/base), event handlers, and dangerous URL schemes. See _sanitizeRawHtmlBlock.
              return _sanitizeRawHtmlBlock(block.html);
            }
            default: {
              // Unknown block type — salvage any content field we recognize instead of silently dropping it,
              // and log the type so we can extend the switch if Gemini starts emitting new shapes.
              const _salvage = block.text || block.title || block.description || block.caption
                || block.latex || block.value // L5: math/footnote blocks carry their content here, not in .text
                || (Array.isArray(block.items) ? block.items.join(', ') : '');
              if (block.type) _pipeLog('renderJsonToHtml', 'unknown block type: ' + block.type + ' — salvaged ' + _salvage.length + ' chars');
              return `<div style="margin:0.6em 0">${escapeTextField(_salvage)}</div>`;
            }
          }
          } catch (blockRenderErr) {
            console.warn('[PDF Fix] Block ' + blockIdx + ' render error (type=' + (block.type||'?') + '):', blockRenderErr);
            const salvageText = block.text || block.title || block.description || (Array.isArray(block.items) ? block.items.join(', ') : '');
            if (salvageText) return '<p style="margin:0.6em 0;line-height:1.7">' + escapeTextField(sanitizeField(salvageText)) + '</p>';
            return '';
          }
        }).filter(html => html.length > 0).join('\n');
      };
  return renderJsonToHtml;
}

function renderDocBuilderBlocks(blocks, deps) {
  return createDocBuilderRenderer(deps)(blocks);
}

window.AlloModules = window.AlloModules || {};
window.AlloModules.DocBuilderRenderer = {
  createRenderer: createDocBuilderRenderer,
  renderBlocks: renderDocBuilderBlocks,
};
window.AlloModules.DocBuilderRendererModule = true;
})();
