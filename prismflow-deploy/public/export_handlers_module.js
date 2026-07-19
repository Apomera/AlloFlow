// export_handlers_module.js — Phase P of CDN modularization.
// Bundles the four export-flow handlers that previously sat in App scope:
//   · generateExportAudio (TTS-embed for read-aloud audio in exports)
//   · executeExportFromPreview (orchestrates print/zip/slides from preview)
//   · handleExport (top-level export entry: ZIP / print / worksheet)
//   · downloadHtmlBlob (single-file HTML fallback when JSZip unavailable)
//
// All four take a `deps` object as the LAST argument so the App-scope
// callers can stay closure-free. No shared module-scope state — each
// invocation reads everything from deps so a teacher who switches lessons
// mid-session doesn't get a stale snapshot.
//
// Sibling calls inside the module pass `deps` straight through:
//   executeExportFromPreview → generateExportAudio(text, label, deps)
//   handleExport            → downloadHtmlBlob(htmlContent, deps)

(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.ExportHandlersModule) {
    console.log('[CDN] ExportHandlersModule already loaded, skipping');
    return;
  }

  // ── generateExportAudio ──────────────────────────────────────────
  // Renders a small <audio> card for embedded read-aloud playback in
  // the exported HTML. TTS truncated at 3000 chars (provider limit).
  // Returns '' on failure so callers can drop the embed silently.
  const generateExportAudio = async (text, label, deps) => {
    const { callTTS, selectedVoice } = deps || {};
    if (!text || !callTTS) return '';
    try {
      const truncated = text.substring(0, 3000);
      const audioData = await callTTS(truncated, selectedVoice || 'Puck', 1);
      if (audioData && typeof audioData === 'string' && audioData.startsWith('data:')) {
        return '\n          <div style="margin:12px 0;background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:12px 16px;display:flex;align-items:center;gap:10px;">\n            <span style="font-size:1.3em;">🔊</span>\n            <div style="flex:1;">\n              <div style="font-size:0.75em;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Listen: ' + label + '</div>\n              <audio controls src="' + audioData + '" style="width:100%;height:32px;" preload="none"></audio>\n            </div>\n          </div>';
      }
    } catch (e) { console.warn('[Export] TTS generation failed for ' + label, e); }
    return '';
  };

  // ── _alloExportFilename ──────────────────────────────────────────
  // Derive the download filename from the document's own <title> (the export
  // titles are topic-derived: "Photosynthesis — Lesson Pack"), so a teacher's
  // downloads folder reads "photosynthesis.html" instead of N identical
  // "alloflow-export.html" files. Falls back to the localized generic name.
  const _alloExportFilename = (htmlContent, fallback) => {
    try {
      const m = String(htmlContent || '').match(/<title>([^<]{1,160})<\/title>/i);
      let raw = m && m[1] ? m[1] : '';
      raw = raw.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      raw = raw.split('—')[0].trim(); // strip the " — <pageTitle>" suffix
      const slug = raw.replace(/[\\/:*?"<>|#%&{}]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
      if (slug.length >= 3) return slug;
    } catch (_) { /* fall through to the generic name */ }
    return fallback;
  };

  // ── downloadHtmlBlob ─────────────────────────────────────────────
  // Single-file HTML download fallback used when JSZip is unavailable.
  // Routes through the App-scope safeDownloadBlob helper so cross-browser
  // quirks (Safari blob handling, sandbox restrictions) stay centralized.
  const downloadHtmlBlob = (content, deps) => {
    const { safeDownloadBlob, addToast, t } = deps || {};
    const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
    const fname = _alloExportFilename(content, t ? t('export.filenames.html_pack') : 'alloflow-export');
    if (typeof safeDownloadBlob === 'function') {
      safeDownloadBlob(blob, fname + '.html');
    } else {
      // Last-ditch fallback if the helper isn't available — should never
      // happen in practice but better than throwing.
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fname + '.html';
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    if (addToast && t) addToast(t('export_status.html_success'), 'success');
  };

  // ── _alloDownloadFiles ───────────────────────────────────────────
  // Download a small set of files as separate browser downloads instead
  // of bundling them into a zip. Kinder for teachers who find extracting
  // archives confusing — but only used for 2–3 files, since browsers
  // prompt/block once a page fires more than a few downloads. Files are
  // triggered ~300ms apart because some browsers silently drop a second
  // download fired in the same tick.
  const _alloDownloadFiles = async (files) => {
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const url = URL.createObjectURL(f.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = f.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Revoke a beat later so the browser has grabbed the blob first.
      setTimeout((function(u) { return function() { URL.revokeObjectURL(u); }; })(url), 4000);
      if (i < files.length - 1) await new Promise(function(r) { setTimeout(r, 300); });
    }
  };

  // ── executeExportFromPreview ─────────────────────────────────────
  // Orchestrates an export driven by the preview iframe. If the iframe
  // has substantive edited content, that wins; otherwise we regenerate
  // from history. Audio embeds are optional (gated by exportConfig).
  // Slides mode delegates back to the App-scope handleExportSlides
  // because that handler is owned by the doc_pipeline factory binding.
  // ── Read-aloud (karaoke) for HTML export ────────────────────────────
  // Vanilla modal asked at download time (no React), + a DOM pass that turns
  // each [data-ka-readable] passage into inline sentence-karaoke: split into
  // sentences (markdown stripped so the voice never reads symbols), wrap each in
  // a .ka-s span, add a Read-aloud button, and generate one clip per sentence
  // with the selected voice. The doc's highlighter plays them in order, lighting
  // each sentence as its clip plays.
  const _alloNormalizeAudioConfig = (mode) => {
    if (!mode) return null;
    if (typeof mode === 'string') {
      if (mode === 'compressed' || mode === 'embedded') {
        return { quality: mode, variants: ['standard'], inlinePassageAudio: true };
      }
      if (mode === 'structured') return { quality: 'compressed', variants: ['structured'], inlinePassageAudio: false };
      if (mode === 'both') return { quality: 'compressed', variants: ['standard', 'structured'], inlinePassageAudio: true };
      return null;
    }
    const quality = mode.quality === 'embedded' ? 'embedded' : 'compressed';
    let variants = [];
    if (Array.isArray(mode.variants)) variants = mode.variants.slice();
    else if (mode.variant) variants = [mode.variant];
    variants = variants.filter((v, i, a) => (v === 'standard' || v === 'structured') && a.indexOf(v) === i);
    if (!variants.length) variants = ['standard'];
    return {
      quality: quality,
      variants: variants,
      inlinePassageAudio: mode.inlinePassageAudio !== false && variants.indexOf('standard') !== -1
    };
  };
  const _alloReadAloudModal = (canEmbed) => new Promise((resolve) => {
    try {
      const ov = document.createElement('div');
      ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
      ov.style.cssText = 'position:fixed;inset:0;z-index:2147483600;background:rgba(15,23,42,0.55);display:flex;align-items:center;justify-content:center;padding:20px;font-family:system-ui,-apple-system,sans-serif;';
      const box = document.createElement('div');
      box.style.cssText = 'background:#fff;border-radius:16px;max-width:660px;width:100%;padding:24px;box-shadow:0 20px 50px rgba(0,0,0,0.3);';
      const disabled = canEmbed ? '' : 'disabled aria-disabled="true" ';
      const mutedStyle = canEmbed ? '' : 'opacity:.62;';
      box.innerHTML =
        '<h2 style="margin:0 0 8px;font-size:1.2rem;color:#0f172a;">Add read-aloud audio?</h2>' +
        '<p style="margin:0 0 6px;font-size:0.92rem;color:#475569;line-height:1.5;">Use the selected voice to add offline audio to the downloaded HTML. Standard audio is the lean default; structured audio adds screen-reader-style cues for headings, lists, tables, and images.</p>' +
        '<p style="margin:0 0 16px;font-size:0.8rem;color:#64748b;line-height:1.45;">To keep downloads smaller, both audio versions are only included when you choose that option.</p>' +
        '<fieldset style="border:1px solid #cbd5e1;border-radius:12px;padding:12px 14px;margin:0 0 12px;' + mutedStyle + '">' +
          '<legend style="font-weight:800;color:#0f172a;padding:0 6px;">Audio version</legend>' +
          '<label style="display:block;margin:8px 0;color:#0f172a;line-height:1.4;"><input type="radio" name="allo-audio-variant" value="standard" checked ' + disabled + 'style="margin-right:8px;"> <strong>Standard narration</strong><span style="display:block;margin-left:24px;font-size:0.82rem;color:#475569;">Adds inline passage playback with highlighting and one full-document audio download.</span></label>' +
          '<label style="display:block;margin:8px 0;color:#0f172a;line-height:1.4;"><input type="radio" name="allo-audio-variant" value="structured" ' + disabled + 'style="margin-right:8px;"> <strong>Structured audio</strong><span style="display:block;margin-left:24px;font-size:0.82rem;color:#475569;">Creates a screen-reader-style audio file with structural cues. No inline passage clips.</span></label>' +
          '<label style="display:block;margin:8px 0;color:#0f172a;line-height:1.4;"><input type="radio" name="allo-audio-variant" value="both" ' + disabled + 'style="margin-right:8px;"> <strong>Both versions</strong><span style="display:block;margin-left:24px;font-size:0.82rem;color:#475569;">Includes standard playback plus the structured audio file. Largest download.</span></label>' +
        '</fieldset>' +
        '<fieldset style="border:1px solid #cbd5e1;border-radius:12px;padding:12px 14px;margin:0 0 18px;' + mutedStyle + '">' +
          '<legend style="font-weight:800;color:#0f172a;padding:0 6px;">File size</legend>' +
          '<label style="display:block;margin:8px 0;color:#0f172a;line-height:1.4;"><input type="radio" name="allo-audio-quality" value="compressed" checked ' + disabled + 'style="margin-right:8px;"> <strong>Smaller file</strong><span style="display:block;margin-left:24px;font-size:0.82rem;color:#475569;">Keeps the selected voice, then tries to compress generated audio. Smaller download, slightly lower quality.</span></label>' +
          '<label style="display:block;margin:8px 0;color:#0f172a;line-height:1.4;"><input type="radio" name="allo-audio-quality" value="embedded" ' + disabled + 'style="margin-right:8px;"> <strong>Best quality</strong><span style="display:block;margin-left:24px;font-size:0.82rem;color:#475569;">Keeps the original generated audio for maximum compatibility. Larger download.</span></label>' +
        '</fieldset>' +
        (canEmbed ? '' : '<p style="margin:0 0 14px;font-size:0.84rem;color:#9f1239;line-height:1.4;">Selected-voice audio is not available right now.</p>') +
        '<div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;">' +
          '<button type="button" data-r="cancel" style="padding:9px 16px;background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;border-radius:9px;font-weight:600;cursor:pointer;">Cancel</button>' +
          '<button type="button" data-r="no" style="padding:9px 16px;background:#fff;color:#0369a1;border:1px solid #7dd3fc;border-radius:9px;font-weight:700;cursor:pointer;">Without audio</button>' +
          '<button type="button" data-r="continue" ' + (canEmbed ? '' : 'disabled aria-disabled="true" ') + 'style="padding:9px 16px;background:' + (canEmbed ? '#0369a1' : '#94a3b8') + ';color:#fff;border:1px solid ' + (canEmbed ? '#075985' : '#94a3b8') + ';border-radius:9px;font-weight:800;cursor:' + (canEmbed ? 'pointer' : 'not-allowed') + ';">Add audio</button>' +
        '</div>';
      ov.appendChild(box);
      const done = (val) => { try { ov.remove(); } catch (e) {} resolve(val); };
      ov.addEventListener('click', (e) => {
        const b = e.target && e.target.closest && e.target.closest('[data-r]');
        if (b) {
          const r = b.getAttribute('data-r');
          if (r === 'continue') {
            if (!canEmbed) return;
            const v = box.querySelector('input[name="allo-audio-variant"]:checked');
            const q = box.querySelector('input[name="allo-audio-quality"]:checked');
            const variant = v ? v.value : 'standard';
            const quality = q ? q.value : 'compressed';
            done(_alloNormalizeAudioConfig({
              quality: quality,
              variants: variant === 'both' ? ['standard', 'structured'] : [variant],
              inlinePassageAudio: variant !== 'structured'
            }));
          } else {
            done(r === 'no' ? false : null);
          }
          return;
        }
        if (e.target === ov) done(null);
      });
      document.body.appendChild(ov);
      const y = box.querySelector('[data-r="continue"]') || box.querySelector('[data-r="no"]'); if (y) y.focus();
    } catch (e) { resolve(false); }
  });
  const _alloAudioProgress = () => {
    let ov = null, status = null, detail = null, bar = null, pctText = null;
    try {
      ov = document.createElement('div');
      ov.setAttribute('role', 'status');
      ov.setAttribute('aria-live', 'polite');
      ov.style.cssText = 'position:fixed;inset:0;z-index:2147483601;background:rgba(15,23,42,0.62);display:flex;align-items:center;justify-content:center;padding:20px;font-family:system-ui,-apple-system,sans-serif;';
      const box = document.createElement('div');
      box.style.cssText = 'background:#fff;border-radius:16px;max-width:520px;width:100%;padding:22px;box-shadow:0 20px 50px rgba(0,0,0,0.32);';
      box.innerHTML =
        '<h2 style="margin:0 0 8px;font-size:1.15rem;color:#0f172a;">Preparing embedded read-aloud audio</h2>' +
        '<p data-ka-status style="margin:0 0 8px;font-size:0.92rem;color:#475569;line-height:1.45;">Getting passages ready...</p>' +
        '<p data-ka-detail style="margin:0 0 14px;font-size:0.78rem;color:#64748b;line-height:1.35;">This can take a while for long documents. Keep this tab open.</p>' +
        '<div style="width:100%;height:10px;background:#e2e8f0;border-radius:999px;overflow:hidden;"><div data-ka-bar style="height:100%;width:0%;background:#0369a1;transition:width .18s ease;"></div></div>' +
        '<div data-ka-pct style="margin-top:8px;text-align:right;font-size:0.78rem;color:#475569;font-variant-numeric:tabular-nums;">0%</div>';
      ov.appendChild(box);
      document.body.appendChild(ov);
      status = box.querySelector('[data-ka-status]');
      detail = box.querySelector('[data-ka-detail]');
      bar = box.querySelector('[data-ka-bar]');
      pctText = box.querySelector('[data-ka-pct]');
    } catch (e) {}
    return {
      update(done, total, label) {
        const pct = total ? Math.max(0, Math.min(100, Math.round((done / total) * 100))) : 0;
        if (status) status.textContent = label || 'Generating audio...';
        if (detail) detail.textContent = total ? ('Clip ' + Math.min(done + 1, total) + ' of ' + total + '. Keep this tab open until the download starts.') : 'Keep this tab open until the download starts.';
        if (bar) bar.style.width = pct + '%';
        if (pctText) pctText.textContent = pct + '%';
      },
      done(message) {
        if (status && message) status.textContent = message;
        if (bar) bar.style.width = '100%';
        if (pctText) pctText.textContent = '100%';
        setTimeout(() => { try { if (ov) ov.remove(); } catch (e) {} }, 350);
      }
    };
  };
  const _alloAudioMimeForCompression = () => {
    try {
      if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return '';
      const choices = [
        'audio/webm;codecs=opus',
        'audio/ogg;codecs=opus',
        'audio/mp4;codecs=mp4a.40.2',
        'audio/webm',
        'audio/mp4'
      ];
      for (let i = 0; i < choices.length; i++) {
        if (MediaRecorder.isTypeSupported(choices[i])) return choices[i];
      }
    } catch (e) {}
    return '';
  };
  const _alloBlobToDataUrl = (blob) => new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onloadend = () => res(fr.result);
    fr.onerror = () => rej(new Error('read'));
    fr.readAsDataURL(blob);
  });
  const _alloCompressAudioBlob = async (blob) => {
    const mimeType = _alloAudioMimeForCompression();
    const AC = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
    if (!blob || !mimeType || !AC || typeof MediaRecorder === 'undefined') return blob;
    let ctx = null;
    try {
      ctx = new AC();
      const bytes = await blob.arrayBuffer();
      const decoded = await ctx.decodeAudioData(bytes.slice(0));
      const dest = ctx.createMediaStreamDestination();
      const src = ctx.createBufferSource();
      src.buffer = decoded;
      src.connect(dest);
      const chunks = [];
      const recorder = new MediaRecorder(dest.stream, { mimeType: mimeType, audioBitsPerSecond: 32000 });
      const done = new Promise((resolve, reject) => {
        recorder.ondataavailable = (ev) => { if (ev.data && ev.data.size) chunks.push(ev.data); };
        recorder.onerror = (ev) => reject((ev && ev.error) || new Error('encode'));
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      });
      recorder.start();
      src.start();
      await new Promise((resolve) => { src.onended = resolve; });
      if (recorder.state !== 'inactive') recorder.stop();
      const compressed = await done;
      if (compressed && compressed.size > 0 && compressed.size < blob.size * 0.92) return compressed;
    } catch (e) {
      console.warn('[Export] Audio compression skipped:', e && e.message ? e.message : e);
    } finally {
      try { if (ctx && ctx.close) await ctx.close(); } catch (e) {}
    }
    return blob;
  };
  const _alloSpokenText = (txt) => String(txt || '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/([.!?])\s*\.+/g, '$1')
    .replace(/\.{2,}/g, '.')
    .trim();
  const _alloAudioDocRoot = (root) => {
    if (!root) return null;
    const clone = root.cloneNode(true);
    const scoped = (clone.querySelector && (clone.querySelector('body') || clone.querySelector('main'))) || clone;
    try {
      const kill = scoped.querySelectorAll('#allo-reader-bar,#allo-reader-ruler,#allo-reader-style,#allo-reader-script,#allo-ka-style,#allo-ka-script,.allo-ka-bar,.allo-ka-audios,.alloflow-audio-downloads,.alloflow-reading-tools-shell,.alloflow-anno-colors,#alloflow-reader-line,.alloflow-reader-mask,.alloflow-export-save-tools,#alloflow-save-cta,#alloflow-savejson-cta,.allo-img-controls,[data-alloflow-picker],[data-alloflow-nomsg],script,style,button,input,select,textarea,audio,video,noscript');
      for (let i = 0; i < kill.length; i++) kill[i].remove();
      const hidden = scoped.querySelectorAll('[hidden],[aria-hidden="true"]');
      for (let i = 0; i < hidden.length; i++) hidden[i].remove();
      const detailsSummaries = scoped.querySelectorAll('details > summary');
      for (let i = 0; i < detailsSummaries.length; i++) detailsSummaries[i].remove();
      const annotations = scoped.querySelectorAll('annotation, annotation-xml, [data-allo-latex-src]');
      for (let i = 0; i < annotations.length; i++) annotations[i].remove();
    } catch (e) {}
    return scoped;
  };
  const _alloAudioReadyTextFromRoot = (root) => {
    const scoped = _alloAudioDocRoot(root);
    if (!scoped) return '';
    const doc = scoped.ownerDocument || document;
    let preamble = '';
    try {
      const note = scoped.querySelector('[data-allo-translation-note], [data-allo-plain-note]');
      const nt = note && _alloSpokenText(note.textContent || '');
      if (nt) preamble = nt + '. ';
    } catch (e) {}
    try {
      const notes = scoped.querySelectorAll('[data-allo-translation-note], [data-allo-plain-note]');
      for (let i = 0; i < notes.length; i++) notes[i].remove();
      const figures = scoped.querySelectorAll('figure');
      for (let i = 0; i < figures.length; i++) {
        const fig = figures[i];
        const img = fig.querySelector && fig.querySelector('img');
        const cap = fig.querySelector && fig.querySelector('figcaption');
        if (fig.hasAttribute('data-img-placeholder') || (fig.hasAttribute('data-img-idx') && !img)) {
          const d = cap ? _alloSpokenText(cap.textContent || '') : '';
          fig.replaceWith(doc.createTextNode(d ? ('Image: ' + d + '. ') : ''));
          continue;
        }
        if (img) {
          const alt = _alloSpokenText(img.getAttribute('alt') || '');
          const isPres = img.getAttribute('role') === 'presentation' || img.getAttribute('aria-hidden') === 'true';
          const capText = cap ? _alloSpokenText(cap.textContent || '') : '';
          if (cap) cap.remove();
          const say = capText || (isPres ? '' : alt);
          img.replaceWith(doc.createTextNode(say ? ('Image: ' + say + '. ') : ''));
        }
      }
      const looseImgs = scoped.querySelectorAll('img');
      for (let i = 0; i < looseImgs.length; i++) {
        const img = looseImgs[i];
        const alt = _alloSpokenText(img.getAttribute('alt') || '');
        const isPres = img.getAttribute('role') === 'presentation' || img.getAttribute('aria-hidden') === 'true';
        img.replaceWith(doc.createTextNode(!isPres && alt ? ('Image: ' + alt + '. ') : ''));
      }
      const pauses = scoped.querySelectorAll('p,h1,h2,h3,h4,h5,h6,li,blockquote,dd,dt,tr,caption,figcaption');
      for (let i = 0; i < pauses.length; i++) pauses[i].appendChild(doc.createTextNode('. '));
    } catch (e) {}
    return _alloSpokenText(preamble + (scoped.textContent || ''));
  };
  const _alloStructuredAudioTextFromRoot = (root) => {
    const scoped = _alloAudioDocRoot(root);
    if (!scoped) return '';
    const out = [];
    const txt = (el) => _alloSpokenText(el && el.textContent ? el.textContent : '');
    const directText = (el) => {
      try {
        const c = el.cloneNode(true);
        const nested = c.querySelectorAll('ul,ol,table,figure');
        for (let i = 0; i < nested.length; i++) nested[i].remove();
        return txt(c);
      } catch (e) { return txt(el); }
    };
    const walk = (el) => {
      const kids = Array.prototype.slice.call((el && el.children) || []);
      for (let i = 0; i < kids.length; i++) {
        const node = kids[i];
        if (!node.tagName) continue;
        const tag = node.tagName.toLowerCase();
        if (node.hasAttribute('hidden') || node.getAttribute('aria-hidden') === 'true') continue;
        if (/^h[1-6]$/.test(tag)) { const h = txt(node); if (h) out.push('Heading level ' + tag[1] + '. ' + h + '.'); continue; }
        if (tag === 'figure') {
          const img = node.querySelector('img');
          const cap = node.querySelector('figcaption');
          const alt = img ? _alloSpokenText(img.getAttribute('alt') || '') : '';
          const capText = cap ? txt(cap) : '';
          const say = capText || alt;
          if (say) out.push('Figure. ' + say + '.');
          continue;
        }
        if (tag === 'img') {
          const alt = _alloSpokenText(node.getAttribute('alt') || '');
          if (node.getAttribute('role') !== 'presentation' && alt) out.push('Image. ' + alt + '.');
          continue;
        }
        if (tag === 'ul' || tag === 'ol') {
          const items = Array.prototype.slice.call(node.children || []).filter((c) => c.tagName && c.tagName.toLowerCase() === 'li');
          out.push((tag === 'ul' ? 'List, ' : 'Numbered list, ') + items.length + ' item' + (items.length === 1 ? '' : 's') + '.');
          for (let j = 0; j < items.length; j++) {
            const liText = directText(items[j]);
            if (liText) out.push((tag === 'ul' ? 'Bullet. ' : ('Item ' + (j + 1) + '. ')) + liText + '.');
            walk(items[j]);
          }
          out.push('List end.');
          continue;
        }
        if (tag === 'table') {
          const rows = Array.prototype.slice.call(node.querySelectorAll('tr'));
          const cols = rows.length ? Math.max.apply(null, rows.map((r) => r.children.length)) : 0;
          const cap = node.querySelector('caption');
          const capText = cap ? txt(cap) : '';
          out.push('Table' + (capText ? (', ' + capText) : '') + ', ' + rows.length + ' row' + (rows.length === 1 ? '' : 's') + ', ' + cols + ' column' + (cols === 1 ? '' : 's') + '.');
          for (let r = 0; r < rows.length; r++) {
            const cells = Array.prototype.slice.call(rows[r].children || []).map((c) => txt(c)).filter(Boolean);
            if (cells.length) out.push('Row ' + (r + 1) + '. ' + cells.join('. ') + '.');
          }
          out.push('Table end.');
          continue;
        }
        if (tag === 'details') {
          const sum = node.querySelector('summary');
          const st = sum ? txt(sum) : '';
          if (st) out.push('Disclosure section. ' + st + '.');
          walk(node);
          continue;
        }
        if (tag === 'p' || tag === 'blockquote' || tag === 'figcaption') {
          if (!node.closest('table') && !node.closest('figure')) { const p = txt(node); if (p) out.push(p); }
          continue;
        }
        walk(node);
      }
    };
    walk(scoped);
    return out.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  };
  const _alloChunkAudioText = (text, maxLen) => {
    maxLen = maxLen || 1200;
    const chunks = [];
    const raw = _alloSpokenText(text).replace(/\r/g, '');
    if (!raw) return chunks;
    const pieces = raw.match(/[^.!?\u3002\uff01\uff1f]+[.!?\u3002\uff01\uff1f]+["')\]]*|\S[^.!?\u3002\uff01\uff1f]*$/g) || [raw];
    let cur = '';
    const flush = () => { if (cur.trim()) chunks.push(cur.trim()); cur = ''; };
    for (let i = 0; i < pieces.length; i++) {
      let part = pieces[i].trim();
      if (!part) continue;
      while (part.length > maxLen) {
        const cut = part.lastIndexOf(' ', maxLen) > maxLen * 0.55 ? part.lastIndexOf(' ', maxLen) : maxLen;
        if (cur) flush();
        chunks.push(part.slice(0, cut).trim());
        part = part.slice(cut).trim();
      }
      if ((cur + ' ' + part).trim().length > maxLen) flush();
      cur = (cur ? (cur + ' ') : '') + part;
    }
    flush();
    return chunks;
  };
  const _alloAudioLanguageFromRoot = (root) => {
    try {
      const raw = ((root && root.getAttribute && root.getAttribute('lang')) || (root && root.querySelector && root.querySelector('html[lang]') && root.querySelector('html[lang]').getAttribute('lang')) || '').toLowerCase();
      const code = raw.split('-')[0];
      const map = { en: 'English', es: 'Spanish', fr: 'French', de: 'German', pt: 'Portuguese', it: 'Italian', ar: 'Arabic', zh: 'Chinese', ja: 'Japanese', ko: 'Korean', vi: 'Vietnamese', ru: 'Russian', uk: 'Ukrainian', hi: 'Hindi', bn: 'Bengali', ur: 'Urdu', fa: 'Persian', he: 'Hebrew', tr: 'Turkish', pl: 'Polish', nl: 'Dutch', sv: 'Swedish', no: 'Norwegian', da: 'Danish', fi: 'Finnish', el: 'Greek', ro: 'Romanian', id: 'Indonesian', ms: 'Malay', th: 'Thai', tl: 'Tagalog' };
      return map[code] || raw || undefined;
    } catch (e) { return undefined; }
  };
  const _alloFetchAudioBlob = async (audioUrl) => {
    if (!audioUrl || typeof audioUrl !== 'string') return null;
    try {
      const resp = await fetch(audioUrl);
      if (!resp.ok) return null;
      const blob = await resp.blob();
      return blob && blob.size > 0 ? blob : null;
    } catch (e) { return null; }
  };
  const _alloCallExportTTS = async (callTTS, text, voice, language) => {
    try {
      return await callTTS(text, voice, 1, { language: language });
    } catch (e) {
      try { return await callTTS(text, voice, 1, null, language); }
      catch (e2) { return await callTTS(text, voice, 1); }
    }
  };
  const _alloConcatAudioBlobs = async (blobs) => {
    blobs = (blobs || []).filter(Boolean);
    if (!blobs.length) return null;
    if (blobs.length === 1) return blobs[0];
    const first = new Uint8Array(await blobs[0].arrayBuffer());
    const isWav = first.length > 12 &&
      first[0] === 0x52 && first[1] === 0x49 && first[2] === 0x46 && first[3] === 0x46 &&
      first[8] === 0x57 && first[9] === 0x41 && first[10] === 0x56 && first[11] === 0x45;
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
    const parsePcm = (buf) => {
      if (buf.length <= 44 || buf[0] !== 0x52 || buf[1] !== 0x49 || buf[2] !== 0x46 || buf[3] !== 0x46) return null;
      let dataStart = 44, rate = 0;
      for (let j = 12; j < Math.min(buf.length - 8, 256); j++) {
        if (rate === 0 && buf[j] === 0x66 && buf[j + 1] === 0x6d && buf[j + 2] === 0x74 && buf[j + 3] === 0x20) {
          const o = j + 12; rate = buf[o] | (buf[o + 1] << 8) | (buf[o + 2] << 16) | (buf[o + 3] << 24);
        }
        if (buf[j] === 0x64 && buf[j + 1] === 0x61 && buf[j + 2] === 0x74 && buf[j + 3] === 0x61) { dataStart = j + 8; break; }
      }
      return { dataStart: dataStart, len: buf.length - dataStart, rate: rate };
    };
    const rates = [];
    let total = 0, used = 0;
    for (let i = 0; i < blobs.length; i++) {
      const buf = i === 0 ? first : new Uint8Array(await blobs[i].arrayBuffer());
      const m = parsePcm(buf);
      if (!m) continue;
      if (m.rate > 0) rates.push(m.rate);
      total += m.len; used++;
    }
    if (!used) return null;
    const sampleRate = rates[0] || 24000, numCh = 1, bps = 16;
    const blockAlign = numCh * bps / 8, byteRate = sampleRate * blockAlign;
    const outBuf = new ArrayBuffer(44 + total);
    const dv = new DataView(outBuf);
    const ws = (o, s) => { for (let k = 0; k < s.length; k++) dv.setUint8(o + k, s.charCodeAt(k)); };
    ws(0, 'RIFF'); dv.setUint32(4, 36 + total, true); ws(8, 'WAVE');
    ws(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, numCh, true);
    dv.setUint32(24, sampleRate, true); dv.setUint32(28, byteRate, true);
    dv.setUint16(32, blockAlign, true); dv.setUint16(34, bps, true);
    ws(36, 'data'); dv.setUint32(40, total, true);
    const outPcm = new Uint8Array(outBuf, 44);
    let poff = 0;
    for (let i = 0; i < blobs.length; i++) {
      const buf = new Uint8Array(await blobs[i].arrayBuffer());
      const m = parsePcm(buf);
      if (!m) continue;
      outPcm.set(buf.subarray(m.dataStart), poff); poff += m.len;
    }
    return new Blob([outBuf], { type: 'audio/wav' });
  };
  const _alloAudioExtForBlob = (blob) => {
    const type = String((blob && blob.type) || '').toLowerCase();
    if (type.indexOf('webm') !== -1) return 'webm';
    if (type.indexOf('ogg') !== -1 || type.indexOf('opus') !== -1) return 'ogg';
    if (type.indexOf('mp4') !== -1 || type.indexOf('m4a') !== -1) return 'm4a';
    if (type.indexOf('mpeg') !== -1 || type.indexOf('mp3') !== -1) return 'mp3';
    return 'wav';
  };
  const _alloPlanAudioDownloads = (root, config) => {
    const plans = [];
    const variants = (config && config.variants) || [];
    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i];
      const text = variant === 'structured' ? _alloStructuredAudioTextFromRoot(root) : _alloAudioReadyTextFromRoot(root);
      const chunks = _alloChunkAudioText(text, 1200);
      if (!chunks.length) continue;
      plans.push({
        variant: variant,
        label: variant === 'structured' ? 'Structured audio' : 'Standard narration',
        description: variant === 'structured' ? 'Screen-reader-style narration with headings, lists, tables, and image cues.' : 'Plain full-document narration in the selected voice.',
        chunks: chunks
      });
    }
    return plans;
  };
  const _alloBuildAudioDownloadAssets = async (plans, opts, progress, state) => {
    opts = opts || {};
    state = state || { done: 0, total: 0 };
    const out = { assets: [], downloads: [] };
    const callTTS = opts.callTTS, selectedVoice = opts.selectedVoice || 'Puck';
    const compressAudio = opts.quality === 'compressed';
    const singleFile = !!opts.singleFile;
    const language = opts.language;
    for (let i = 0; i < (plans || []).length; i++) {
      const plan = plans[i];
      const blobs = [];
      for (let j = 0; j < plan.chunks.length; j++) {
        if (progress) progress.update(state.done, state.total, 'Generating ' + plan.label.toLowerCase() + ' chunk ' + (j + 1) + ' of ' + plan.chunks.length + '...');
        let au = null;
        try { au = await _alloCallExportTTS(callTTS, plan.chunks[j], selectedVoice, language); } catch (e) { au = null; }
        const blob = await _alloFetchAudioBlob(au);
        if (au && au.indexOf && au.indexOf('blob:') === 0) { try { URL.revokeObjectURL(au); } catch (e) {} }
        if (blob) blobs.push(blob);
        state.done++;
      }
      // Honesty (export-format review R2 #12): a failed TTS chunk is simply
      // absent from `blobs`, so the concatenated file silently drops those
      // audio portions. Track how many are missing so the caller and the on-page
      // download card can say so instead of reporting a clean success.
      const _total = plan.chunks.length;
      const _missing = _total - blobs.length;
      let combined = await _alloConcatAudioBlobs(blobs);
      if (!combined) {
        // Every section of this variant failed — no file to offer; record it.
        out.failedVariants = (out.failedVariants || []).concat(plan.label);
        continue;
      }
      if (_missing > 0) out.anyPartial = true;
      if (compressAudio) {
        if (progress) progress.update(state.done, state.total, 'Compressing ' + plan.label.toLowerCase() + '...');
        combined = await _alloCompressAudioBlob(combined);
      }
      const ext = _alloAudioExtForBlob(combined);
      const filename = 'alloflow-' + plan.variant + '-audio.' + ext;
      const path = 'audio/' + filename;
      let href = path;
      if (singleFile) href = await _alloBlobToDataUrl(combined);
      else out.assets.push({ path: path, blob: combined });
      out.downloads.push({ variant: plan.variant, label: plan.label, description: plan.description, href: href, download: filename, type: combined.type || 'audio/' + ext, size: combined.size || 0, missing: _missing, total: _total });
    }
    return out;
  };
  const _alloInsertAudioDownloads = (root, downloads) => {
    if (!downloads || !downloads.length || !root || !root.ownerDocument) return;
    const doc = root.ownerDocument;
    const target = (root.querySelector && (root.querySelector('main') || root.querySelector('body'))) || root;
    if (!target) return;
    try {
      const prior = target.querySelectorAll && target.querySelectorAll('.alloflow-audio-downloads');
      for (let i = 0; prior && i < prior.length; i++) prior[i].remove();
    } catch (e) {}
    const aside = doc.createElement('aside');
    aside.className = 'alloflow-audio-downloads';
    aside.setAttribute('aria-label', 'Downloadable audio files');
    aside.style.cssText = 'margin:18px 0;padding:14px 16px;border:1px solid #bae6fd;border-radius:12px;background:#f0f9ff;color:#0f172a;';
    const h = doc.createElement('h2');
    h.textContent = 'Download audio';
    h.style.cssText = 'margin:0 0 8px;font-size:1.05rem;color:#0f172a;';
    aside.appendChild(h);
    const p = doc.createElement('p');
    p.textContent = 'Audio files use the selected voice and can be saved separately for offline listening.';
    p.style.cssText = 'margin:0 0 10px;color:#334155;font-size:0.9rem;line-height:1.45;';
    aside.appendChild(p);
    for (let i = 0; i < downloads.length; i++) {
      const item = downloads[i];
      const row = doc.createElement('div');
      row.setAttribute('data-audio-variant', item.variant);
      row.style.cssText = 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:8px 0;';
      const link = doc.createElement('a');
      link.href = item.href;
      link.download = item.download;
      link.textContent = 'Download ' + item.label.toLowerCase();
      link.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:8px 12px;background:#0369a1;color:#fff;text-decoration:none;border-radius:8px;font-weight:800;';
      const desc = doc.createElement('span');
      desc.textContent = item.description;
      desc.style.cssText = 'font-size:0.84rem;color:#475569;line-height:1.35;';
      row.appendChild(link);
      row.appendChild(desc);
      // #12: if some generated audio portions could not be voiced, say so on the card itself so a
      // teacher does not hand out audio that silently skips part of the document.
      if (item.missing > 0 && item.total) {
        const warn = doc.createElement('span');
        warn.setAttribute('role', 'note');
        warn.textContent = '⚠ ' + item.missing + ' of ' + item.total + ' audio portions are missing from this file (audio could not be generated for them).';
        warn.style.cssText = 'flex-basis:100%;font-size:0.82rem;color:#b45309;font-weight:700;line-height:1.35;';
        row.appendChild(warn);
      }
      aside.appendChild(row);
    }
    const st = root.querySelector && root.querySelector('#alloflow-audio-download-style');
    if (!st) {
      const style = doc.createElement('style');
      style.id = 'alloflow-audio-download-style';
      style.textContent = '@media print{.alloflow-audio-downloads{display:none!important;}}';
      const head = root.querySelector && (root.querySelector('head') || root);
      if (head) head.appendChild(style);
    }
    const first = target.firstElementChild;
    if (first && first.nextSibling) target.insertBefore(aside, first.nextSibling);
    else target.insertBefore(aside, target.firstChild);
  };
  const _alloKaClean = (txt) => String(txt || '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1').replace(/__([^_]+)__/g, '$1')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1$2').replace(/(^|[^_])_([^_\n]+)_(?!_)/g, '$1$2')
    .replace(/~~([^~]+)~~/g, '$1').replace(/`([^`\n]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '').replace(/^\s*[-*•]\s+/gm, '').replace(/\s+/g, ' ').trim();
  const _alloKaEsc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const _alloKaSplit = (t) => (String(t).match(/[^.!?]+[.!?]+["')\]]*|\S[^.!?]*$/g) || [t]).map((x) => String(x).trim()).filter(Boolean);
  const _alloKaraokeProcess = async (root, opts) => {
    opts = opts || {};
    const callTTS = opts.callTTS, selectedVoice = opts.selectedVoice, addToast = opts.addToast;
    const audioConfig = _alloNormalizeAudioConfig(opts.mode) || { quality: 'embedded', variants: ['standard'], inlinePassageAudio: true };
    const compressAudio = audioConfig.quality === 'compressed';
    const mode = 'embedded';
    const doc = root.ownerDocument || document;
    const result = { assets: [], downloads: [] };
    if (typeof callTTS !== 'function') {
      if (addToast) addToast('Selected-voice audio is not available right now, so the export will download without audio.', 'info');
      return result;
    }
    const downloadPlans = _alloPlanAudioDownloads(root, audioConfig);
    const docLanguage = opts.language || _alloAudioLanguageFromRoot(root);
    let sections = [];
    if (audioConfig.inlinePassageAudio) {
      sections = root.querySelectorAll('[data-ka-readable]');
    }
    if (audioConfig.inlinePassageAudio && !sections.length) {
      // Fallback (the CDN may still serve an older doc without the tags): detect
      // reading passages by content — .section blocks of real prose with no
      // interactive widgets (quizzes, blanks, tables, visual panels).
      const _all = root.querySelectorAll('.section');
      const _picked = [];
      for (let _qi = 0; _qi < _all.length; _qi++) {
        const _s = _all[_qi];
        if (_s.querySelector('input, textarea, .question, table, .quiz-box, .interactive-textarea, [data-correct], .vp-panel, .allo-ka-passage')) continue;
        const _ps = _s.querySelectorAll('p');
        let _len = 0;
        for (let _pj = 0; _pj < _ps.length; _pj++) _len += (_ps[_pj].textContent || '').trim().length;
        if (_ps.length && _len > 180) _picked.push(_s);
      }
      sections = _picked;
    }
    if (!sections.length && !downloadPlans.length) {
      if (addToast) addToast('No reading passages in this document to read aloud — exporting without audio.', 'info');
      return result;
    }
    if (addToast) addToast(compressAudio ? 'Generating and compressing selected-voice audio... this may take a moment.' : 'Generating read-aloud audio... this may take a moment.', 'info');
    // Self-contained highlighter + CSS — inject so the file works even when the
    // CDN serves an older doc_pipeline that lacks them. Idempotent at runtime via
    // window.__alloKaBound (a freshly-propagated doc highlighter sets it too).
    if (audioConfig.inlinePassageAudio && sections.length) try {
      const _head = root.querySelector('head') || root;
      const _body = root.querySelector('body') || root;
      if (!root.querySelector('#allo-ka-style')) {
        const _st = doc.createElement('style'); _st.id = 'allo-ka-style';
        _st.textContent = '.allo-ka-passage .ka-s{transition:background-color .12s ease,box-shadow .12s ease;border-radius:3px;}.allo-ka-passage .ka-s.ka-on{background-color:#fde047;color:#1e293b;box-shadow:0 0 0 3px #fde047;}html[data-alloflow-theme="dark"] .allo-ka-passage .ka-s.ka-on{background-color:#ca8a04;color:#fff;box-shadow:0 0 0 3px #ca8a04;}.allo-ka-play:hover,.allo-ka-stop:hover{filter:brightness(1.08);}@media print{.allo-ka-bar{display:none !important;}}';
        _head.appendChild(_st);
      }
      if (!root.querySelector('#allo-ka-script')) {
        const _sc = doc.createElement('script'); _sc.id = 'allo-ka-script';
        _sc.textContent = `(function(){if(window.__alloKaBound)return;window.__alloKaBound=true;var active=null;function setBtn(b,t,p){if(!b)return;b.textContent=t;b.setAttribute("aria-pressed",p?"true":"false");b.setAttribute("aria-label",t.replace(/[^\\w\\s-]/g,"").trim()||"Read aloud");}function findBox(id){var boxes=document.querySelectorAll(".allo-ka-audios");for(var i=0;i<boxes.length;i++){if((boxes[i].getAttribute("data-ka-for")||"")===String(id||""))return boxes[i];}return null;}function clearHi(s){for(var i=0;i<s.length;i++)s[i].classList.remove("ka-on");}function ensureStopButton(btn){if(!btn||!btn.parentNode)return null;var ex=btn.parentNode.querySelector(".allo-ka-stop");if(ex)return ex;var s=document.createElement("button");s.type="button";s.className="allo-ka-stop";s.textContent="Stop";s.style.cssText="margin-left:8px;padding:7px 12px;background:#475569;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:.9em;";s.addEventListener("click",function(e){e.preventDefault();e.stopPropagation();stop();});btn.parentNode.insertBefore(s,btn.nextSibling);return s;}function stop(){if(!active)return;try{if(active.mode==="browser"){if(window.speechSynthesis)window.speechSynthesis.cancel();active.utter=null;}else{var a=active.audios[active.idx];if(a){a.pause();a.onended=null;}}}catch(e){}clearHi(active.spans);setBtn(active.btn,"\\u{1F50A} Read aloud",false);if(active.stopBtn){try{active.stopBtn.remove();}catch(e){}}active=null;}function pause(){if(!active||active.paused)return;try{if(active.mode==="browser"){if(window.speechSynthesis)window.speechSynthesis.pause();}else{var a=active.audios[active.idx];if(a)a.pause();}}catch(e){}active.paused=true;setBtn(active.btn,"\\u25B6 Resume",true);}function resume(){if(!active||!active.paused)return;if(active.mode==="browser"){active.paused=false;setBtn(active.btn,"\\u23F8 Pause",true);try{if(window.speechSynthesis)window.speechSynthesis.resume();}catch(e){}return;}var a=active.audios[active.idx];if(!a){step(active,active.idx+1);return;}active.paused=false;setBtn(active.btn,"\\u23F8 Pause",true);var p=a.play();if(p&&p.catch)p.catch(function(){stop();});}function step(state,i){if(!active||active!==state)return;var count=state.mode==="browser"?state.spans.length:state.audios.length;if(i>=count){stop();return;}state.idx=i;state.paused=false;if(state.mode==="browser"){var sp=state.spans[i];if(!sp){step(state,i+1);return;}clearHi(state.spans);sp.classList.add("ka-on");var text=(sp.textContent||"").trim();if(!text){step(state,i+1);return;}if(!window.speechSynthesis||typeof SpeechSynthesisUtterance==="undefined"){alert("Browser read-aloud is not available here.");stop();return;}try{window.speechSynthesis.cancel();}catch(e){}var u=new SpeechSynthesisUtterance(text);state.utter=u;u.rate=1;u.onend=function(){if(active===state&&!state.paused)step(state,i+1);};u.onerror=function(){if(active===state)stop();};setBtn(state.btn,"\\u23F8 Pause",true);try{window.speechSynthesis.speak(u);}catch(e){stop();}return;}var a=state.audios[i];if(!a){step(state,i+1);return;}var sidx=a.getAttribute("data-ka-s");clearHi(state.spans);for(var k=0;k<state.spans.length;k++){if(sidx!==null&&state.spans[k].getAttribute("data-ka-s")===sidx)state.spans[k].classList.add("ka-on");}try{a.currentTime=0;}catch(e){}a.onended=function(){if(active===state&&!state.paused)step(state,i+1);};setBtn(state.btn,"\\u23F8 Pause",true);var p=a.play();if(p&&p.catch)p.catch(function(){stop();});}document.addEventListener("click",function(e){var stopBtn=e.target&&e.target.closest&&e.target.closest(".allo-ka-stop");if(stopBtn){e.preventDefault();stop();return;}var btn=e.target&&e.target.closest&&e.target.closest(".allo-ka-play");if(!btn)return;if(active&&active.btn===btn){if(active.paused)resume();else pause();return;}if(active)stop();var id=btn.getAttribute("data-ka-for");var sec=btn.closest(".section")||document;var spans=Array.prototype.slice.call(sec.querySelectorAll(".ka-s"));var mode=btn.getAttribute("data-ka-mode")||"embedded";var audios=[];if(mode==="browser"){if(!spans.length)return;}else{var box=findBox(id);audios=box?Array.prototype.slice.call(box.querySelectorAll("audio")):[];if(!audios.length||!spans.length)return;}active={mode:mode,audios:audios,spans:spans,idx:0,btn:btn,stopBtn:ensureStopButton(btn),paused:false,utter:null};step(active,0);});})();`;
        _body.appendChild(_sc);
      }
    } catch (e) { /* injection best-effort */ }
    const processed = [];
    const audioJobs = [];
    for (let si = 0; si < sections.length; si++) {
      const sec = sections[si];
      const ps = sec.querySelectorAll('p');
      const targets = ps.length ? ps : [sec];
      const items = [];
      let gi = 0;
      for (let pi = 0; pi < targets.length; pi++) {
        const p = targets[pi];
        const clean = _alloKaClean(p.textContent || '');
        if (!clean) continue;
        const sents = _alloKaSplit(clean);
        p.innerHTML = sents.map((se) => { const idx = gi++; items.push({ idx: idx, text: se }); return '<span class="ka-s" data-ka-s="' + idx + '">' + _alloKaEsc(se) + '</span>'; }).join(' ');
      }
      if (!items.length) continue;
      sec.classList.add('allo-ka-passage');
      const forId = sec.id || ('ka' + si);
      const bar = doc.createElement('div'); bar.className = 'allo-ka-bar'; bar.style.cssText = 'margin:6px 0 10px;';
      const btn = doc.createElement('button'); btn.type = 'button'; btn.className = 'allo-ka-play'; btn.setAttribute('data-ka-for', forId);
      btn.setAttribute('data-ka-mode', mode);
      btn.setAttribute('aria-pressed', 'false');
      btn.style.cssText = 'padding:7px 16px;background:#0369a1;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:0.9em;';
      btn.textContent = '\u{1F50A} Read aloud';
      bar.appendChild(btn);
      let abox = null;
      if (mode === 'embedded') {
        abox = doc.createElement('span'); abox.className = 'allo-ka-audios'; abox.setAttribute('data-ka-for', forId); abox.setAttribute('hidden', '');
      }
      const fe = sec.firstElementChild;
      if (fe && fe.nextSibling) sec.insertBefore(bar, fe.nextSibling); else sec.appendChild(bar);
      if (abox) sec.appendChild(abox);
      for (let k = 0; k < items.length; k++) {
        if (!abox) continue;
        audioJobs.push({ item: items[k], abox: abox });
      }
      processed.push({ bar: bar, abox: abox });
    }
    if (!processed.length && !downloadPlans.length) {
      if (addToast) addToast('No readable passage text was found for read-aloud.', 'info');
      return result;
    }
    const downloadChunkTotal = downloadPlans.reduce((n, p) => n + ((p && p.chunks && p.chunks.length) || 0), 0);
    const progressTotal = audioJobs.length + downloadChunkTotal;
    const progressState = { done: 0, total: progressTotal };
    const progress = _alloAudioProgress();
    let embeddedCount = 0;
    if (progress) progress.update(0, progressTotal, compressAudio ? 'Generating compressed selected-voice audio...' : 'Generating selected-voice audio...');
    for (let k = 0; k < audioJobs.length; k++) {
        const job = audioJobs[k];
        if (progress) progress.update(progressState.done, progressState.total, 'Generating audio for sentence ' + (k + 1) + ' of ' + audioJobs.length + '...');
        let au = null;
        try { au = await _alloCallExportTTS(callTTS, job.item.text, selectedVoice || 'Puck', docLanguage); } catch (e) { au = null; }
        if (!au || typeof au !== 'string') continue;
        let dataUrl = null;
        let _blob = null;
        // callTTS returns a blob: object URL for Gemini/Kokoro/Piper in this app.
        // Fetch it and convert to a base64 data: URL so the clip embeds in the
        // file and plays fully offline after download. data: URLs work too.
        try {
          const _resp = await fetch(au);
          _blob = await _resp.blob();
          if (compressAudio && _blob) {
            if (progress) progress.update(progressState.done, progressState.total, 'Compressing audio for sentence ' + (k + 1) + ' of ' + audioJobs.length + '...');
            _blob = await _alloCompressAudioBlob(_blob);
          }
          dataUrl = await _alloBlobToDataUrl(_blob);
        } catch (e) { dataUrl = au.indexOf('data:') === 0 ? au : null; }
        if (au.indexOf('blob:') === 0) { try { URL.revokeObjectURL(au); } catch (e) {} }
        if (dataUrl && typeof dataUrl === 'string' && dataUrl.indexOf('data:') === 0) {
          const a = doc.createElement('audio'); a.setAttribute('preload', 'none'); a.setAttribute('data-ka-s', String(job.item.idx)); a.src = dataUrl;
          job.abox.appendChild(a);
          embeddedCount++;
        }
        progressState.done++;
        if (progress) progress.update(progressState.done, progressState.total, 'Preparing embedded audio...');
    }
    if (audioJobs.length && !embeddedCount) {
      for (let r = 0; r < processed.length; r++) {
        try { if (processed[r].bar) processed[r].bar.remove(); } catch (e) {}
        try { if (processed[r].abox) processed[r].abox.remove(); } catch (e) {}
      }
      if (addToast) addToast('Could not generate inline passage audio, so that playback control was removed.', 'info');
    } else if (audioJobs.length && embeddedCount < audioJobs.length) {
      // #12: some passages voiced, some did not — the rest still play, but say so.
      if (addToast) addToast('Audio could not be generated for ' + (audioJobs.length - embeddedCount) + ' of ' + audioJobs.length + ' passages; the others play normally.', 'info');
    }
    const built = await _alloBuildAudioDownloadAssets(downloadPlans, { callTTS: callTTS, selectedVoice: selectedVoice, quality: audioConfig.quality, singleFile: !!opts.singleFile, language: docLanguage }, progress, progressState);
    result.assets = built.assets || [];
    result.downloads = built.downloads || [];
    if (result.downloads.length) _alloInsertAudioDownloads(root, result.downloads);
    // #12: never report a clean success when the downloadable audio is incomplete.
    if (addToast && built.failedVariants && built.failedVariants.length) addToast('Some audio versions could not be generated (' + built.failedVariants.join(', ') + ') and were skipped. The exported document still opens normally.', 'error');
    if (addToast && built.anyPartial) addToast('Heads up: the downloadable audio is missing the audio portions that could not be voiced (the download card shows how many).', 'info');
    if (progress) progress.done('Audio ready. Starting download...');
    return result;
  };

  const executeExportFromPreview = async (deps) => {
    const {
      _docPipeline, addToast, t,
      exportPreviewMode, exportPreviewRef,
      generateFullPackHTML, getExportableHistory, getSkippedResources,
      sourceTopic, studentResponses, exportConfig, history,
      callTTS, selectedVoice,
      setShowExportPreview, handleExportSlides
    } = deps || {};
    if (!_docPipeline) {
      if (addToast) addToast((t && t('export_status.pipeline_loading')) || 'Export tools still loading — please try again in a moment.', 'error');
      return;
    }
    const mode = exportPreviewMode;
    const isWorksheet = mode === 'worksheet';
    const _wantSingleFile = mode === 'html' && (!!(exportConfig && exportConfig.singleFileHtml) || !(typeof window !== 'undefined' && window.JSZip));
    // Read-aloud modal — asked at download time for HTML exports. Yes => inline
    // sentence-karaoke on every reading passage (generated on the DOM clone below).
    let _readAloudMode = false;
    if (mode === 'html') {
      const _ans = await _alloReadAloudModal(typeof callTTS === 'function');
      if (_ans === null) return; // cancelled — abort the export entirely
      _readAloudMode = _ans;
    }
    let htmlContent;
    let _audioAssets = [];
    let _readAloudApplied = false;
    const iframe = exportPreviewRef && exportPreviewRef.current;
    const iframeDoc = iframe && iframe.contentDocument;
    const iframeHasRealContent = (function() {
      if (!iframeDoc || !iframeDoc.body) return false;
      const bodyText = iframeDoc.body.textContent || '';
      const sectionCount = iframeDoc.querySelectorAll('.section, .slide, main, article').length;
      const hasSubstantialText = bodyText.trim().length > 200;
      console.log('[Export] iframe content check: ' + bodyText.trim().length + ' chars, ' + sectionCount + ' sections');
      return hasSubstantialText || sectionCount > 0;
    })();
    if (iframeDoc && iframeDoc.documentElement && iframeHasRealContent) {
      iframeDoc.designMode = 'off';
      // Serialize a CLONE with builder/inspector chrome stripped — A11y
      // Inspector badges, inspector + editor CSS, contenteditable attrs and
      // the edit-loss dirty flag previously shipped INSIDE student-facing
      // exports (2026-06-11; the live preview keeps its badges untouched).
      var _exClone = iframeDoc.documentElement.cloneNode(true);
      try {
        var _exKill = _exClone.querySelectorAll('#a11y-inspect-css, #a11y-inspect-styles, #allo-builder-edit-css, .a11y-inspect-badge, [data-allo-crop-ui]');
        for (var _ki = 0; _ki < _exKill.length; _ki++) _exKill[_ki].remove();
        var _exEd = _exClone.querySelectorAll('[contenteditable]');
        for (var _ei = 0; _ei < _exEd.length; _ei++) _exEd[_ei].removeAttribute('contenteditable');
        var _exAll = _exClone.querySelectorAll('*');
        for (var _ai = 0; _ai < _exAll.length; _ai++) {
          var _cl = _exAll[_ai].classList;
          if (!_cl) continue;
          for (var _ci = _cl.length - 1; _ci >= 0; _ci--) {
            var _cn = _cl[_ci];
            if (_cn.indexOf('a11y-inspect') === 0 || _cn.indexOf('a11y-outline') === 0) _cl.remove(_cn);
          }
        }
        var _exCropKeys = _exClone.querySelectorAll('[data-allo-crop-tabindex-added]');
        for (var _cki = 0; _cki < _exCropKeys.length; _cki++) {
          var _exAddedTab = _exCropKeys[_cki].getAttribute('data-allo-crop-tabindex-added') === 'added';
          _exCropKeys[_cki].removeAttribute('data-allo-crop-tabindex-added');
          if (_exAddedTab) _exCropKeys[_cki].removeAttribute('tabindex');
          _exCropKeys[_cki].removeAttribute('aria-keyshortcuts');
        }
        var _exBody = _exClone.querySelector('body');
        if (_exBody) _exBody.removeAttribute('data-allo-user-edited');
      } catch (_exStripErr) { /* strip is best-effort — never block an export */ }
      // Read-aloud: turn every [data-ka-readable] passage into inline
      // sentence-karaoke on the clone (modal-driven, at download time).
      if (_readAloudMode) {
        try {
          const _kaResult = await _alloKaraokeProcess(_exClone, { callTTS: callTTS, selectedVoice: selectedVoice, addToast: addToast, mode: _readAloudMode, singleFile: _wantSingleFile });
          _audioAssets = (_kaResult && _kaResult.assets) || [];
          _readAloudApplied = true;
        }
        catch (_kaErr) { console.warn('[Export] karaoke failed', _kaErr); }
      }
      htmlContent = '<!DOCTYPE html>\n<html' + _exClone.outerHTML.substring(5);
      try { iframeDoc.designMode = 'on'; } catch (_) {}
      console.log('[Export] ✅ Using edited iframe content, chrome stripped (' + htmlContent.length + ' chars)');
    } else {
      console.warn('[Export] ⚠️ Iframe empty or missing — falling back to generateFullPackHTML(history)');
      htmlContent = generateFullPackHTML(getExportableHistory(), sourceTopic, isWorksheet, studentResponses, exportConfig);
      console.log('[Export] ✅ Regenerated from history: ' + htmlContent.length + ' chars, ' + (history ? history.length : 0) + ' history items');
    }
    const _exportMeaningfulText = String(htmlContent || '').replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<style\b[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').trim();
    const _exportHasNonTextContent = /<(?:img|svg|canvas|video|audio|math|table|form|input|textarea|select|hr)\b/i.test(String(htmlContent || ''));
    if (!htmlContent || (!_exportMeaningfulText && !_exportHasNonTextContent)) {
      const exportable = getExportableHistory();
      const skipped = getSkippedResources();
      if (addToast) {
        if (exportable.length === 0 && skipped.length > 0) {
          addToast('No exportable resources — ' + skipped.length + ' interactive resource' + (skipped.length === 1 ? '' : 's') + ' (' + skipped.slice(0, 3).join(', ') + (skipped.length > 3 ? '…' : '') + ') can\'t be exported as static documents.', 'error');
        } else if (exportable.length === 0) {
          addToast('No resources in history to export yet.', 'error');
        } else {
          addToast('Export came back empty — the document pipeline may not be ready. Please try again.', 'error');
        }
      }
      return;
    }

    if (_readAloudMode && !_readAloudApplied && mode === 'html' && typeof DOMParser !== 'undefined') {
      try {
        const _kaDoc = new DOMParser().parseFromString(htmlContent, 'text/html');
        const _kaResult = await _alloKaraokeProcess(_kaDoc.documentElement, { callTTS: callTTS, selectedVoice: selectedVoice, addToast: addToast, mode: _readAloudMode, singleFile: _wantSingleFile });
        _audioAssets = (_kaResult && _kaResult.assets) || [];
        htmlContent = '<!DOCTYPE html>\n' + _kaDoc.documentElement.outerHTML;
        _readAloudApplied = true;
      } catch (_kaFallbackErr) {
        console.warn('[Export] karaoke fallback failed', _kaFallbackErr);
      }
    }

    // Read-aloud audio is handled by the download-time modal above (inline
    // sentence-karaoke on every reading passage), replacing the old per-text toggles.

    // Keep the Builder open until the browser has accepted the export handoff.
    // Failed popups/ZIP generation remain recoverable and preserve the live draft.
    if (mode === 'slides') {
      if (typeof handleExportSlides !== 'function') return false;
      const slideExported = await handleExportSlides();
      if (slideExported === false) return false;
      if (typeof setShowExportPreview === 'function') setShowExportPreview(false);
      return true;
    }
    if (mode === 'print' || mode === 'worksheet') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(function() { printWindow.print(); }, 500);
        if (typeof setShowExportPreview === 'function') setShowExportPreview(false);
        return true;
      }
      if (window.AlloFlowUX) window.AlloFlowUX.toast((t && t('export_status.popup_blocked')) || 'Pop-up blocked — please allow pop-ups for this site to print.', 'error'); else alert((t && t('export_status.popup_blocked')) || 'Pop-up blocked — please allow pop-ups for this site to print.');
      return false;
    } else if (mode === 'html') {
      // Name files after the lesson (from its <title>) so a teacher's
      // downloads folder reads "photosynthesis.html" instead of N identical
      // "index.html" files.
      const _htmlName = _alloExportFilename(htmlContent, 'alloflow-export');
      // Single-file option: skip the zip and download just the self-contained
      // .html (images are base64-inlined), so teachers can email one file that
      // offline students double-click.
      if (window.JSZip && !_wantSingleFile && _audioAssets.length > 0) {
        // Read-aloud attached separate audio files — keep the zip as the
        // container, since that's too many loose files to download one by one.
        if (addToast) addToast((t && t('export_status.bundling_zip')) || 'Bundling export...', 'info');
        const zip = new window.JSZip();
        zip.file(_htmlName + '.html', htmlContent);
        zip.file(_htmlName + '-project.json', JSON.stringify(history, null, 2));
        for (let _aa = 0; _aa < _audioAssets.length; _aa++) {
          const _asset = _audioAssets[_aa];
          if (_asset && _asset.path && _asset.blob) zip.file(_asset.path, _asset.blob);
        }
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = _htmlName + '-' + new Date().toISOString().split('T')[0] + '.zip';
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        URL.revokeObjectURL(url);
        if (addToast) addToast('Export downloaded!', 'success');
      } else if (!_wantSingleFile) {
        // Just the lesson + its data (2 files) — download them separately so
        // teachers never have to extract a zip. Distinct names avoid collisions.
        if (addToast) addToast('Downloading files…', 'info');
        await _alloDownloadFiles([
          { name: _htmlName + '.html', blob: new Blob([htmlContent], { type: 'text/html;charset=utf-8' }) },
          { name: _htmlName + '-project.json', blob: new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' }) }
        ]);
        if (addToast) addToast('Export downloaded!', 'success');
      } else {
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = _alloExportFilename(htmlContent, 'alloflow-export') + '.html';
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        URL.revokeObjectURL(url);
        if (addToast) addToast('HTML export downloaded!', 'success');
      }
      if (typeof setShowExportPreview === 'function') setShowExportPreview(false);
      return true;
    }
    return false;
  };

  // ── handleExport ─────────────────────────────────────────────────
  // Top-level export entry. Skips the preview path: regenerates HTML
  // from history directly, runs WCAG audits in print mode (toasts the
  // results, doesn't block), and routes to print / worksheet / ZIP.
  const handleExport = async (mode, deps) => {
    if (typeof mode === 'undefined') mode = 'html';
    const {
      _docPipeline, addToast, t,
      generateFullPackHTML, getExportableHistory, getSkippedResources,
      sourceTopic, studentResponses, exportConfig, history,
      auditOutputAccessibility, runAxeAudit,
      alloBotRef, warnLog
    } = deps || {};
    if (!_docPipeline) {
      if (addToast) addToast((t && t('export_status.pipeline_loading')) || 'Export tools still loading — please try again in a moment.', 'error');
      return;
    }
    const isWorksheet = mode === 'worksheet';
    const htmlContent = generateFullPackHTML(getExportableHistory(), sourceTopic, isWorksheet, studentResponses, exportConfig);
    const _exportMeaningfulText = String(htmlContent || '').replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<style\b[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').trim();
    const _exportHasNonTextContent = /<(?:img|svg|canvas|video|audio|math|table|form|input|textarea|select|hr)\b/i.test(String(htmlContent || ''));
    if (!htmlContent || (!_exportMeaningfulText && !_exportHasNonTextContent)) {
      const exportable = getExportableHistory();
      const skipped = getSkippedResources();
      if (addToast) {
        if (exportable.length === 0 && skipped.length > 0) {
          addToast('No exportable resources — ' + skipped.length + ' interactive resource' + (skipped.length === 1 ? '' : 's') + ' (' + skipped.slice(0, 3).join(', ') + (skipped.length > 3 ? '…' : '') + ') can\'t be exported as static documents.', 'error');
        } else if (exportable.length === 0) {
          addToast('No resources in history to export yet.', 'error');
        } else {
          addToast('Export came back empty — the document pipeline may not be ready. Please try again.', 'error');
        }
      }
      return;
    }

    if (mode === 'print') {
      try {
        if (typeof auditOutputAccessibility === 'function') {
          auditOutputAccessibility(htmlContent).then(function(outputAudit) {
            if (outputAudit && outputAudit.score >= 0 && addToast) {
              const emoji = outputAudit.score >= 80 ? '✅' : outputAudit.score >= 60 ? '⚠️' : '❌';
              addToast(emoji + ' AI audit: ' + outputAudit.score + '/100 — ' + outputAudit.summary, outputAudit.score >= 60 ? 'success' : 'info');
            }
          }).catch(function() {});
        }
        if (typeof runAxeAudit === 'function') {
          runAxeAudit(htmlContent).then(function(axeResult) {
            if (axeResult && addToast) {
              const emoji = axeResult.totalViolations === 0 ? '✅' : axeResult.totalViolations <= 3 ? '⚠️' : '❌';
              addToast(emoji + ' axe-core: ' + axeResult.totalViolations + ' violation' + (axeResult.totalViolations !== 1 ? 's' : '') + ', ' + axeResult.totalPasses + ' checks passed', axeResult.totalViolations === 0 ? 'success' : 'info');
            }
          }).catch(function() {});
        }
      } catch (_) {}
    }

    if (mode === 'print' || mode === 'worksheet') {
      if (alloBotRef && alloBotRef.current) {
        alloBotRef.current.speak(mode === 'worksheet' ? "Generating a worksheet? I'll make sure it's formatted perfectly for your students!" : "Preparing your document for print. You can select valid pages in the print preview.", 'happy');
      }
      if (addToast && t) addToast(mode === 'worksheet' ? t('export_status.prep_worksheet') : t('export_status.prep_print'), 'info');
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(function() { printWindow.print(); }, 500);
      } else {
        if (window.AlloFlowUX) window.AlloFlowUX.toast((t && t('export_status.popup_blocked')) || 'Pop-up blocked — please allow pop-ups for this site to print.', 'error'); else alert((t && t('export_status.popup_blocked')) || 'Pop-up blocked — please allow pop-ups for this site to print.');
      }
    } else {
      // Direct HTML export (no preview, no read-aloud audio): the lesson plus
      // its source data — two files. Download them separately with distinct,
      // lesson-derived names so teachers never have to extract a zip. The old
      // readme.txt only described the zip's contents, so it's dropped here.
      const _htmlName = _alloExportFilename(htmlContent, (t ? t('export.filenames.html_pack') : 'alloflow-export'));
      try {
        if (addToast) addToast('Downloading files…', 'info');
        await _alloDownloadFiles([
          { name: _htmlName + '.html', blob: new Blob([htmlContent], { type: 'text/html;charset=utf-8' }) },
          { name: _htmlName + '-project.json', blob: new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' }) }
        ]);
        if (addToast && t) addToast(t('export.bundle_downloaded'), 'success');
        if (alloBotRef && alloBotRef.current && t) {
          alloBotRef.current.speak(t('bot_events.feedback_export_complete'), 'happy');
        }
      } catch (err) {
        if (typeof warnLog === 'function') warnLog('Export download failed', err);
        downloadHtmlBlob(htmlContent, deps);
      }
    }
  };

  // ── applyA11yInspector ───────────────────────────────────────────
  // Pure DOM operation: paint (or clear) the accessibility-inspector
  // overlay on whatever iframe document is currently loaded in the export
  // preview. Idempotent — calling repeatedly with the same `enabled` value
  // produces the same final DOM.
  //
  // Lives outside `toggleA11yInspect` so the parent (`updateExportPreview`)
  // can re-apply the overlay after every iframe rewrite. Without this,
  // any state change that re-runs `doc.open(); doc.write(); doc.close()`
  // wipes the inspector's badges/styles, even though the React boolean
  // `a11yInspectMode` stays `true` — which is exactly the "flash and
  // disappear" bug AlloFlow-generated docs hit.
  const applyA11yInspector = (deps) => {
    const { exportPreviewRef, enabled } = deps || {};
    const iframe = exportPreviewRef && exportPreviewRef.current;
    const doc = iframe && iframe.contentDocument;
    if (!doc || !doc.body) return;
    // Always tear down any existing overlay first so this is idempotent.
    const existingStyle = doc.getElementById('a11y-inspect-styles');
    if (existingStyle) existingStyle.remove();
    const existingBadges = doc.querySelectorAll('.a11y-inspect-badge');
    existingBadges.forEach(function(b) { b.remove(); });
    // Outline classes get added to many element types; clean those up too
    // so toggling off doesn't leave stale colored borders.
    const outlinedEls = doc.querySelectorAll('.a11y-inspect-outline');
    outlinedEls.forEach(function(el) {
      el.classList.remove(
        'a11y-inspect-outline',
        'a11y-inspect-outline-heading',
        'a11y-inspect-outline-img',
        'a11y-inspect-outline-aria',
        'a11y-inspect-outline-role',
        'a11y-inspect-outline-table',
        'a11y-inspect-outline-input',
        'a11y-inspect-outline-landmark'
      );
    });
    if (!enabled) return;
    paintA11yInspector(doc);
  };

  // ── toggleA11yInspect ────────────────────────────────────────────
  // Toggles the in-iframe accessibility inspector overlay. Adds outlined
  // badges to headings, images, ARIA labels, roles, tables, inputs, and
  // landmarks; supports click-to-edit on alt text and ARIA attributes.
  // Mutates an iframe-scope <style> tag + DOM nodes — no React state
  // beyond the boolean toggle.
  const toggleA11yInspect = (deps) => {
    const { setA11yInspectMode, exportPreviewRef } = deps || {};
    if (typeof setA11yInspectMode !== 'function') return;
    setA11yInspectMode(function(prev) {
      const next = !prev;
      applyA11yInspector({ exportPreviewRef: exportPreviewRef, enabled: next });
      return next;
    });
  };

  // ── paintA11yInspector ───────────────────────────────────────────
  // Internal helper: assumes the iframe doc is in a clean state (no
  // pre-existing badges/styles) and paints the full inspector overlay.
  // Extracted from the original toggleA11yInspect body verbatim so the
  // visual output is unchanged.
  const paintA11yInspector = (doc) => {
      if (!doc || !doc.head || !doc.body) return;
      const style = doc.createElement('style');
      style.id = 'a11y-inspect-styles';
      style.textContent = '\n        .a11y-inspect-badge { position:absolute; z-index:9999; font-size:10px; font-weight:800; font-family:monospace; padding:2px 6px; border-radius:4px; pointer-events:auto; line-height:1.3; max-width:280px; word-wrap:break-word; box-shadow:0 2px 6px rgba(0,0,0,0.2); cursor:default; }\n        .a11y-inspect-badge[role="button"] { cursor:pointer; }\n        .a11y-inspect-badge[role="button"]:focus-visible { outline:3px solid #ffffff; outline-offset:2px; box-shadow:0 0 0 5px #1e293b; }\n        .a11y-inspect-badge:hover { opacity:1 !important; z-index:10000; box-shadow:0 4px 12px rgba(0,0,0,0.3); }\n        .a11y-badge-heading { background:#7c3aed; color:#fff; }\n        .a11y-badge-img { background:#dc2626; color:#fff; }\n        .a11y-badge-aria { background:#0891b2; color:#fff; }\n        .a11y-badge-role { background:#059669; color:#fff; }\n        .a11y-badge-table { background:#d97706; color:#fff; }\n        .a11y-badge-input { background:#e11d48; color:#fff; }\n        .a11y-badge-link { background:#2563eb; color:#fff; }\n        .a11y-badge-lang { background:#4f46e5; color:#fff; }\n        .a11y-badge-landmark { background:#166534; color:#fff; }\n        .a11y-inspect-outline { outline:3px solid; outline-offset:2px; position:relative; }\n        .a11y-inspect-outline-heading { outline-color:#7c3aed; }\n        .a11y-inspect-outline-img { outline-color:#dc2626; }\n        .a11y-inspect-outline-aria { outline-color:#0891b2; }\n        .a11y-inspect-outline-role { outline-color:#059669; }\n        .a11y-inspect-outline-table { outline-color:#d97706; }\n        .a11y-inspect-outline-input { outline-color:#e11d48; }\n        .a11y-inspect-outline-landmark { outline-color:#166534; }\n      ';
      doc.head.appendChild(style);
      const badge = function(el, cls, text, attrName) {
        el.classList.add('a11y-inspect-outline', 'a11y-inspect-outline-' + cls.replace('a11y-badge-', ''));
        el.style.position = el.style.position || 'relative';
        const b = doc.createElement('span');
        b.className = 'a11y-inspect-badge ' + cls;
        b.textContent = text;
        b.style.position = 'absolute'; b.style.top = '-14px'; b.style.left = '0';
        if (attrName) {
          b.setAttribute('role', 'button');
          b.setAttribute('tabindex', '0');
          b.setAttribute('aria-label', 'Edit ' + attrName + ': ' + (el.getAttribute(attrName) || 'empty'));
          b.title = 'Select to edit ' + attrName;
          const activate = function(ev) {
            ev.stopPropagation();
            const current = el.getAttribute(attrName) || '';
            const newVal = prompt('Edit ' + attrName + ':', current);
            if (newVal !== null) {
              el.setAttribute(attrName, newVal);
              b.textContent = (attrName === 'aria-label' ? 'ARIA: ' : attrName.toUpperCase() + ': ') + (newVal || '(empty)');
              b.setAttribute('aria-label', 'Edit ' + attrName + ': ' + (newVal || 'empty'));
              try { if (doc.body) doc.body.setAttribute('data-allo-user-edited', '1'); doc.body.dispatchEvent(new doc.defaultView.Event('input', { bubbles: true })); } catch (_) {}
            }
          };
          b.addEventListener('click', activate);
          b.addEventListener('keydown', function(ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); activate(ev); } });
        }
        el.appendChild(b);
      };
      doc.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(function(h, i) {
        badge(h, 'a11y-badge-heading', 'H' + h.tagName[1] + ' #' + (i + 1));
      });
      doc.querySelectorAll('img').forEach(function(img, i) {
        const alt = img.getAttribute('alt');
        img.classList.add('a11y-inspect-outline', 'a11y-inspect-outline-img');
        img.style.position = img.style.position || 'relative';
        const b = doc.createElement('span');
        b.className = 'a11y-inspect-badge a11y-badge-img';
        b.dataset.attrName = 'alt';
        b.dataset.attrValue = alt || '';
        b.dataset.prefix = 'ALT: ';
        b.dataset.targetSelector = 'img:nth-of-type(' + (i + 1) + ')';
        b.textContent = alt ? 'ALT: ' + alt : 'ALT: ⚠️ MISSING';
        b.setAttribute('role', 'button');
        b.setAttribute('tabindex', '0');
        b.setAttribute('aria-label', 'Edit image alternative text: ' + (alt || 'missing'));
        b.title = 'Select to edit alt text';
        b.style.cssText = 'position:absolute;top:-14px;left:0;cursor:pointer;';
        const editAlt = function(ev) {
          ev.stopPropagation();
          const currentAlt = img.getAttribute('alt') || '';
          const newAlt = prompt('Edit alt text for this image:', currentAlt);
          if (newAlt !== null) {
            img.setAttribute('alt', newAlt);
            b.textContent = 'ALT: ' + (newAlt || '(empty)');
            b.dataset.attrValue = newAlt;
            b.setAttribute('aria-label', 'Edit image alternative text: ' + (newAlt || 'empty'));
            try { if (doc.body) doc.body.setAttribute('data-allo-user-edited', '1'); doc.body.dispatchEvent(new doc.defaultView.Event('input', { bubbles: true })); } catch (_) {}
          }
        };
        b.addEventListener('click', editAlt);
        b.addEventListener('keydown', function(ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); editAlt(ev); } });
        const wrapper = doc.createElement('span');
        wrapper.style.cssText = 'position:relative;display:inline-block;';
        img.parentNode.insertBefore(wrapper, img);
        wrapper.appendChild(img);
        wrapper.appendChild(b);
      });
      doc.querySelectorAll('[aria-label]:not(.a11y-inspect-badge)').forEach(function(el) {
        const label = el.getAttribute('aria-label');
        badge(el, 'a11y-badge-aria', 'ARIA: ' + label, 'aria-label');
      });
      doc.querySelectorAll('[role]:not(.a11y-inspect-badge)').forEach(function(el) {
        const role = el.getAttribute('role');
        if (role === 'main' || role === 'contentinfo' || role === 'banner' || role === 'navigation') {
          badge(el, 'a11y-badge-landmark', 'LANDMARK: ' + role);
        } else {
          badge(el, 'a11y-badge-role', 'ROLE: ' + role, 'role');
        }
      });
      doc.querySelectorAll('table').forEach(function(tbl) {
        const caption = tbl.querySelector('caption');
        const ths = tbl.querySelectorAll('th[scope]').length;
        const thsTotal = tbl.querySelectorAll('th').length;
        badge(tbl, 'a11y-badge-table', 'TABLE: ' + (caption ? 'caption ✓' : 'no caption') + ' | ' + ths + '/' + thsTotal + ' th with scope');
      });
      doc.querySelectorAll('input,textarea,select').forEach(function(el) {
        if (el.type === 'hidden') return;
        const labelEl = el.id ? doc.querySelector('label[for="' + el.id + '"]') : null;
        const label = el.getAttribute('aria-label') || (labelEl ? labelEl.textContent : '') || '';
        badge(el, 'a11y-badge-input', label ? 'LABEL: ' + label : 'LABEL: ⚠️ MISSING', 'aria-label');
      });
      const html = doc.documentElement;
      const lang = html.getAttribute('lang');
      if (lang) {
        const langBadge = doc.createElement('div');
        langBadge.className = 'a11y-inspect-badge a11y-badge-lang';
        langBadge.textContent = 'LANG: ' + lang + ' | DIR: ' + (html.getAttribute('dir') || 'ltr');
        langBadge.style.cssText = 'position:fixed;top:4px;right:4px;z-index:99999;';
        doc.body.appendChild(langBadge);
      }
      const legend = doc.createElement('div');
      legend.className = 'a11y-inspect-badge';
      legend.style.cssText = 'position:fixed;bottom:8px;left:8px;z-index:99999;background:#1e293b;color:#f1f5f9;padding:8px 12px;border-radius:8px;font-size:11px;max-width:340px;line-height:1.6;';
      legend.innerHTML = '<strong style="display:block;margin-bottom:4px;">♿ A11y Inspector</strong>' +
        '<span style="color:#a78bfa;">■</span> Headings ' +
        '<span style="color:#f87171;">■</span> Images/Alt ' +
        '<span style="color:#22d3ee;">■</span> ARIA Labels ' +
        '<span style="color:#34d399;">■</span> Roles ' +
        '<span style="color:#fbbf24;">■</span> Tables ' +
        '<span style="color:#fb7185;">■</span> Input Labels ' +
        '<span style="color:#818cf8;">■</span> Landmarks' +
        '<br><em style="font-size:10px;opacity:0.7;">Use Enter, Space, or click on ALT, ARIA, role, and label badges to edit</em>';
      doc.body.appendChild(legend);
  };

  // ── getReadableContent ───────────────────────────────────────────
  // Walks the active view + generatedContent and returns an array of
  // {type, text} items for screen-reader read-aloud. Pure function:
  // takes deps, returns array. No mutations, no DOM writes.
  const getReadableContent = (deps) => {
    const { activeView, inputText, generatedContent, filteredGlossaryData } = deps || {};
    const items = [];
    if (activeView === 'input') {
      if (!inputText || !inputText.trim()) {
        items.push({ type: 'status', text: 'Source material panel. No content loaded yet. Paste or type your source text to get started.' });
      } else {
        const wc = inputText.trim().split(/\s+/).filter(function(w) { return w; }).length;
        items.push({ type: 'heading', text: 'Source material loaded. ' + wc + ' words.' });
        const paragraphs = inputText.split(/\n\n+/).filter(function(p) { return p.trim(); });
        paragraphs.slice(0, 6).forEach(function(p) {
          items.push({ type: 'text', text: p.trim().substring(0, 400) + (p.trim().length > 400 ? '...' : '') });
        });
        if (paragraphs.length > 6) items.push({ type: 'status', text: 'Plus ' + (paragraphs.length - 6) + ' more paragraphs.' });
      }
    } else if (activeView === 'glossary' && generatedContent && generatedContent.type === 'glossary') {
      const terms = (generatedContent && generatedContent.data) || [];
      const displayed = filteredGlossaryData || [];
      const tier2 = terms.filter(function(t) { return t.tier === 'Academic'; }).length;
      const tier3 = terms.filter(function(t) { return t.tier === 'Domain-Specific'; }).length;
      items.push({ type: 'heading', text: 'Glossary. ' + terms.length + ' total terms. ' + tier2 + ' academic, ' + tier3 + ' domain-specific.' });
      if (displayed.length !== terms.length) items.push({ type: 'status', text: 'Showing ' + displayed.length + ' filtered terms.' });
      displayed.forEach(function(term, i) {
        items.push({ type: 'term', text: 'Term ' + (i + 1) + ': ' + term.term + '. ' + term.def });
      });
    } else if (activeView === 'quiz' && generatedContent && generatedContent.type === 'quiz') {
      const questions = (generatedContent.data && generatedContent.data.questions) || [];
      items.push({ type: 'heading', text: 'Exit Ticket. ' + questions.length + ' questions.' });
      const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
      questions.forEach(function(q, i) {
        items.push({ type: 'question', text: 'Question ' + (i + 1) + ': ' + q.question });
        if (q.options && Array.isArray(q.options)) {
          q.options.forEach(function(opt, j) {
            items.push({ type: 'option', text: 'Option ' + (letters[j] || j + 1) + ': ' + opt });
          });
        }
      });
    } else if (activeView === 'simplified' && generatedContent && generatedContent.type === 'simplified') {
      const txt = (generatedContent && typeof generatedContent.data === 'string') ? generatedContent.data : '';
      if (txt) {
        const wc = txt.trim().split(/\s+/).filter(function(w) { return w; }).length;
        items.push({ type: 'heading', text: 'Adapted text. ' + wc + ' words.' });
        const paragraphs = txt.split(/\n\n+/).filter(function(p) { return p.trim(); });
        paragraphs.slice(0, 8).forEach(function(p) {
          items.push({ type: 'text', text: p.trim().substring(0, 400) + (p.trim().length > 400 ? '...' : '') });
        });
      } else {
        items.push({ type: 'status', text: 'Adapted text panel. No content generated yet.' });
      }
    } else if (activeView === 'analysis' && generatedContent && generatedContent.type === 'analysis') {
      items.push({ type: 'heading', text: 'Content analysis results.' });
      const d = generatedContent.data;
      if (d && d.accuracy && d.accuracy.discrepancies) items.push({ type: 'status', text: d.accuracy.discrepancies.length + ' accuracy items found.' });
      if (d && d.grammar) items.push({ type: 'status', text: d.grammar.length + ' grammar suggestions.' });
      if (d && d.summary) items.push({ type: 'text', text: typeof d.summary === 'string' ? d.summary : JSON.stringify(d.summary) });
    } else if (activeView === 'sentence-frames' && generatedContent && generatedContent.type === 'sentence-frames') {
      const frames = (generatedContent && generatedContent.data) || [];
      items.push({ type: 'heading', text: 'Sentence frames. ' + (Array.isArray(frames) ? frames.length : 0) + ' frames generated.' });
      if (Array.isArray(frames)) {
        frames.slice(0, 10).forEach(function(f, i) {
          items.push({ type: 'text', text: 'Frame ' + (i + 1) + ': ' + (typeof f === 'string' ? f : (f.frame || f.text || JSON.stringify(f))) });
        });
      }
    } else {
      const main = document.getElementById('main-content');
      if (main) {
        items.push({ type: 'heading', text: 'Current view: ' + activeView + '.' });
        const headings = main.querySelectorAll('h1, h2, h3, h4');
        headings.forEach(function(h) {
          const level = h.tagName.replace('H', '');
          const txt = h.textContent.trim();
          if (txt && txt.length < 200) items.push({ type: 'heading', text: 'Heading level ' + level + ': ' + txt });
        });
        const paras = main.querySelectorAll('p');
        let pCount = 0;
        paras.forEach(function(p) {
          const txt = p.textContent.trim();
          if (txt && pCount < 10) {
            items.push({ type: 'text', text: txt.substring(0, 250) + (txt.length > 250 ? '...' : '') });
            pCount++;
          }
        });
        const btns = main.querySelectorAll('button[aria-label], button[title]');
        if (btns.length > 0) items.push({ type: 'status', text: btns.length + ' interactive controls available.' });
      }
      if (items.length <= 1) items.push({ type: 'status', text: activeView + ' view is active. Generate content to hear it read aloud.' });
    }
    return items;
  };

  // ── handleFormatText ─────────────────────────────────────────────
  // Markdown toolbar ops on a textarea: wraps the selection in bold,
  // italic, highlight, h1, h2, or list markers and bumps the cursor
  // past the inserted markers.
  const handleFormatText = (formatType, overrideRef, overrideText, overrideCallback, deps) => {
    const { textEditorRef, generatedContent, handleSimplifiedTextChange } = deps || {};
    const ref = overrideRef || textEditorRef;
    const textarea = ref && ref.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = overrideText !== undefined ? overrideText : (generatedContent && generatedContent.data) || '';
    const selection = text.substring(start, end);
    const before = text.substring(0, start);
    const after = text.substring(end);
    let newText = '';
    let newCursorPos = end;
    switch (formatType) {
      case 'bold':      newText = before + '**' + selection + '**' + after; newCursorPos = end + 4; break;
      case 'italic':    newText = before + '*'  + selection + '*'  + after; newCursorPos = end + 2; break;
      case 'highlight': newText = before + '==' + selection + '==' + after; newCursorPos = end + 4; break;
      case 'h1':        newText = before + '\n# '  + selection + after; newCursorPos = end + 3; break;
      case 'h2':        newText = before + '\n## ' + selection + after; newCursorPos = end + 4; break;
      case 'h3':        newText = before + '\n### ' + selection + after; newCursorPos = end + 5; break;
      case 'list':      newText = before + '\n- '  + selection + after; newCursorPos = end + 3; break;
      case 'numlist':   newText = before + '\n1. ' + selection + after; newCursorPos = end + 4; break;
      default: return;
    }
    const cb = overrideCallback || handleSimplifiedTextChange;
    if (typeof cb === 'function') cb(newText);
    setTimeout(function() {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // ── adventureImageDB (singleton) ─────────────────────────────────
  // Module-scope cache so every call returns the SAME IDB-handle object.
  // Without the singleton, the App-side useMemo wrapper (or repeated
  // calls) would each get a fresh object with its own dbPromise — the
  // cache would fragment and the IDB connection would re-open.
  // ── Adventure images: device-storage bridge mirror (2026-07-14) ────
  // The local 'allo_adventure_images' IndexedDB is keyed to the app origin,
  // which on Canvas is a new throwaway every session — scene art silently
  // died between sessions unless the teacher opted into the Firestore
  // archive (a FERPA exposure). Canvas surfaces now write scene images
  // through to the device-storage bridge (ns adventure_images, stable
  // alloflow-cdn origin, on-device only) and fall back to it on read
  // misses, backfilling the fast local store. Entries older than 30 days
  // are pruned once per session, mirroring the cloud archive's expiry.
  const _advBridgeWanted = (() => {
    try {
      const host = window.location.hostname || '';
      if ((window.location.href || '').startsWith('blob:')) return true;
      return host.includes('googleusercontent') || host.includes('scf.usercontent') ||
             host.includes('code-server') || host.includes('idx.google') || host.includes('run.app');
    } catch (e) { return false; }
  })();
  let _advBridgePruned = false;
  const _advBridge = () => {
    if (!window.__alloDeviceStoragePromise) {
      window.__alloDeviceStoragePromise = window.alloDeviceStorage
        ? Promise.resolve(window.alloDeviceStorage)
        : new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://alloflow-cdn.pages.dev/allo_device_storage_module.js?v=ds1';
            s.onload = () => {
              if (window.alloDeviceStorage) resolve(window.alloDeviceStorage);
              else reject(new Error('device storage module missing after load'));
            };
            s.onerror = () => reject(new Error('device storage module failed to load'));
            document.head.appendChild(s);
          });
    }
    return window.__alloDeviceStoragePromise.then((ds) => ds.ready().then(() => {
      if (!_advBridgePruned) {
        _advBridgePruned = true;
        const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
        ds.getAll('adventure_images').then((rows) => {
          (rows || []).forEach((r) => {
            if (r && r.value && typeof r.value.timestamp === 'number' && r.value.timestamp < cutoff) {
              ds.remove('adventure_images', r.key).catch(() => {});
            }
          });
        }).catch(() => {});
      }
      return ds;
    }));
  };
  let _adventureImageDBInstance = null;
  const getAdventureImageDB = (deps) => {
    const { warnLog } = deps || {};
    const _warn = typeof warnLog === 'function' ? warnLog : function() {};
    if (_adventureImageDBInstance) return _adventureImageDBInstance;
    _adventureImageDBInstance = {
      dbPromise: null,
      async getDB() {
        if (this.dbPromise) return this.dbPromise;
        if (typeof window === 'undefined' || !window.indexedDB) {
          _warn('IndexedDB not available'); return null;
        }
        this.dbPromise = new Promise(function(resolve) {
          const request = window.indexedDB.open('allo_adventure_images', 1);
          request.onerror = function() { _warn('IndexedDB open failed'); resolve(null); };
          request.onsuccess = function() { resolve(request.result); };
          request.onupgradeneeded = function(e) {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('images')) db.createObjectStore('images', { keyPath: 'turn' });
          };
        });
        return this.dbPromise;
      },
      async storeImage(turnNumber, base64Image) {
        if (_advBridgeWanted) {
          _advBridge().then((ds) => ds.set('adventure_images', String(turnNumber), { image: base64Image, timestamp: Date.now() }))
            .catch((e) => _warn('adventure image bridge mirror failed', e && (e.code || e.message)));
        }
        const db = await this.getDB(); if (!db) return false;
        return new Promise(function(resolve) {
          try {
            const tx = db.transaction('images', 'readwrite');
            tx.objectStore('images').put({ turn: turnNumber, image: base64Image, timestamp: Date.now() });
            tx.oncomplete = function() { resolve(true); };
            tx.onerror = function() { resolve(false); };
          } catch (e) { _warn('IDB store failed', e); resolve(false); }
        });
      },
      async getImage(turnNumber) {
        const db = await this.getDB();
        const local = !db ? null : await new Promise(function(resolve) {
          try {
            const tx = db.transaction('images', 'readonly');
            const request = tx.objectStore('images').get(turnNumber);
            request.onsuccess = function() { resolve((request.result && request.result.image) || null); };
            request.onerror = function() { resolve(null); };
          } catch (e) { resolve(null); }
        });
        if (local || !_advBridgeWanted) return local;
        // Fresh Canvas session: local store is empty but the bridge may hold
        // the scene. Backfill local so later reads hit the fast path.
        try {
          const entry = await _advBridge().then((ds) => ds.get('adventure_images', String(turnNumber)));
          if (entry && entry.image) {
            this.storeImage(turnNumber, entry.image);
            return entry.image;
          }
        } catch (e) { _warn('adventure image bridge read failed', e && (e.code || e.message)); }
        return null;
      },
      async getAllImages() {
        const db = await this.getDB();
        const local = !db ? [] : await new Promise(function(resolve) {
          try {
            const tx = db.transaction('images', 'readonly');
            const request = tx.objectStore('images').getAll();
            request.onsuccess = function() { resolve(request.result || []); };
            request.onerror = function() { resolve([]); };
          } catch (e) { resolve([]); }
        });
        if (!_advBridgeWanted) return local;
        try {
          const bridged = await _advBridge().then((ds) => ds.getAll('adventure_images'));
          const seen = new Set(local.map(function(r) { return String(r.turn); }));
          (bridged || []).forEach(function(r) {
            if (r && r.value && r.value.image && !seen.has(String(r.key))) {
              local.push({ turn: parseInt(r.key, 10), image: r.value.image, timestamp: r.value.timestamp });
            }
          });
        } catch (e) { _warn('adventure image bridge list failed', e && (e.code || e.message)); }
        return local;
      },
      async clearAll() {
        if (_advBridgeWanted) {
          _advBridge().then((ds) => ds.clearNamespace('adventure_images')).catch(() => {});
        }
        const db = await this.getDB(); if (!db) return;
        try { db.transaction('images', 'readwrite').objectStore('images').clear(); }
        catch (e) { _warn('IDB clear failed', e); }
      },
      async downloadAllAsZip() {
        const images = await this.getAllImages();
        if (images.length === 0) { _warn('No adventure images to download'); return false; }
        for (const img of images) {
          try {
            const link = document.createElement('a');
            link.href = img.image; link.download = 'adventure_scene_' + img.turn + '.png';
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
            await new Promise(function(r) { setTimeout(r, 100); });
          } catch (e) { _warn('Failed to download image for turn ' + img.turn, e); }
        }
        return true;
      }
    };
    return _adventureImageDBInstance;
  };

  // ── getChatThemeStyles ───────────────────────────────────────────
  // Pure function: theme + colorOverlay → Tailwind class map for the chat UI.
  const getChatThemeStyles = (deps) => {
    const { theme, colorOverlay } = deps || {};
    if (theme === 'contrast') {
      return {
        container: 'bg-black border-4 border-yellow-400 shadow-none',
        header: 'bg-black border-b-4 border-yellow-400 text-yellow-400',
        body: 'bg-black',
        userBubble: 'bg-black border-2 border-yellow-400 text-yellow-400 rounded-none',
        modelBubble: 'bg-black border-2 border-white text-white rounded-none',
        inputArea: 'bg-black border-t-4 border-yellow-400',
        input: 'bg-black border-2 border-yellow-400 text-yellow-400 placeholder:text-yellow-700 focus:ring-0',
        button: 'bg-yellow-400 text-black font-black border-2 border-yellow-400 hover:bg-yellow-300',
        secondaryButton: 'bg-black text-yellow-400 border-2 border-white hover:bg-white hover:text-black',
        text: 'text-yellow-400', subText: 'text-white'
      };
    }
    if (theme === 'dark') {
      return {
        container: 'bg-slate-900 border border-slate-700 shadow-2xl',
        header: 'bg-slate-800 border-b border-slate-700 text-indigo-200',
        body: 'bg-slate-950',
        userBubble: 'bg-indigo-900 text-indigo-100 border border-indigo-700',
        modelBubble: 'bg-slate-800 text-slate-200 border border-slate-700',
        inputArea: 'bg-slate-900 border-t border-slate-700',
        input: 'bg-slate-800 border-slate-600 text-slate-200 focus:border-indigo-500 placeholder:text-slate-600',
        button: 'bg-indigo-700 text-indigo-100 hover:bg-indigo-600 border border-indigo-600',
        secondaryButton: 'bg-slate-800 text-slate-600 border border-slate-600 hover:bg-slate-700',
        text: 'text-slate-200', subText: 'text-slate-600'
      };
    }
    let bgTint = 'bg-white', bodyTint = 'bg-slate-50';
    let headerColor = 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-900 via-indigo-950 to-slate-900';
    let userBubbleColor = 'bg-indigo-600', accentBorder = 'border-indigo-100';
    if (colorOverlay === 'blue')   { bgTint = 'bg-blue-50';   bodyTint = 'bg-blue-50/30';   headerColor = 'bg-blue-600';   userBubbleColor = 'bg-blue-600';   accentBorder = 'border-blue-200'; }
    else if (colorOverlay === 'peach')  { bgTint = 'bg-orange-50'; bodyTint = 'bg-orange-50/30'; headerColor = 'bg-orange-600'; userBubbleColor = 'bg-orange-600'; accentBorder = 'border-orange-200'; }
    else if (colorOverlay === 'yellow') { bgTint = 'bg-yellow-50'; bodyTint = 'bg-yellow-50/30'; headerColor = 'bg-yellow-600'; userBubbleColor = 'bg-yellow-600'; accentBorder = 'border-yellow-200'; }
    return {
      container: bgTint + ' border ' + accentBorder + ' shadow-2xl',
      header: headerColor + ' text-white shadow-sm',
      body: bodyTint,
      userBubble: userBubbleColor + ' text-white',
      modelBubble: 'bg-white text-slate-700 border border-slate-400',
      inputArea: 'bg-white border-t ' + accentBorder,
      input: 'bg-white border-slate-300 text-slate-800 focus:ring-indigo-200 focus:border-indigo-400',
      button: headerColor + ' text-white hover:opacity-90',
      secondaryButton: 'bg-white border border-slate-400 text-slate-600 hover:bg-slate-50',
      text: 'text-slate-700', subText: 'text-slate-600'
    };
  };

  // ── runGlossaryHealthCheck ───────────────────────────────────────
  // Async glossary review via Gemini — returns a parsed JSON report or
  // sets an error placeholder. State writes go through the deps setters.
  const runGlossaryHealthCheck = async (terms, sourceText, deps) => {
    const { debugLog, warnLog, callGemini, setIsRunningHealthCheck, setShowHealthCheckPanel, setGlossaryHealthCheck } = deps || {};
    const _dbg = typeof debugLog === 'function' ? debugLog : function() {};
    const _warn = typeof warnLog === 'function' ? warnLog : function() {};
    _dbg('🩺 [HealthCheck] runGlossaryHealthCheck called with', terms && terms.length, 'terms');
    if (!terms || terms.length === 0) { _dbg('🩺 [HealthCheck] ABORTED: No terms'); return null; }
    if (typeof setIsRunningHealthCheck === 'function') setIsRunningHealthCheck(true);
    if (typeof setShowHealthCheckPanel === 'function') setShowHealthCheckPanel(true);
    try {
      const termList = terms.map(function(t) {
        const name = t.term || t.word || (typeof t === 'string' ? t : '');
        const def = t.def || t.definition || t.meaning || '';
        const tier = t.tier || '';
        return { term: name, definition: def, tier: tier };
      }).filter(function(t) { return t.term; });
      const prompt = 'You are an expert literacy specialist. Analyze these glossary terms for a K-12 educational tool.\nTERMS:\n'
        + termList.map(function(t, i) { return (i + 1) + '. "' + t.term + '" — ' + (t.definition || '(no definition)') + ' ' + (t.tier ? '[' + t.tier + ']' : ''); }).join('\n')
        + (sourceText ? '\nSOURCE TEXT (excerpt, first 800 chars):\n' + sourceText.substring(0, 800) : '')
        + '\nReturn ONLY valid JSON (no markdown, no code fences):\n{\n  "definitionGradeLevel": "approximate reading level of definitions, e.g. \'3rd-4th grade\'",\n  "gradeAppropriate": true/false,\n  "tierAudit": {\n    "tier2": ["list of academic/Tier 2 terms"],\n    "tier3": ["list of domain-specific/Tier 3 terms"],\n    "notes": ["any observations about tier classification, max 2"]\n  },\n  "coverageGaps": [\n    {"term": "suggested missing term", "reason": "why it should be included (max 15 words)"}\n  ],\n  "conceptConnections": [\n    {"concept": "central concept name", "connectedTerms": ["term1", "term2"], "note": "brief relationship (max 10 words)"}\n  ],\n  "overallScore": 1-5,\n  "summary": "one-sentence overall quality assessment (max 25 words)"\n}\nKeep coverageGaps to max 3 suggestions. Keep conceptConnections to max 2.';
      const result = await callGemini(prompt, true, false, null);
      if (result) {
        let parsed;
        try {
          const cleaned = result.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
          parsed = JSON.parse(cleaned);
        } catch (e) {
          const jsonMatch = result.match(/\{[\s\S]*\}/);
          if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
          else throw new Error('Could not parse health check response');
        }
        if (typeof setGlossaryHealthCheck === 'function') setGlossaryHealthCheck(parsed);
        if (typeof setShowHealthCheckPanel === 'function') setShowHealthCheckPanel(true);
        if (typeof setIsRunningHealthCheck === 'function') setIsRunningHealthCheck(false);
        return parsed;
      }
    } catch (e) {
      _warn('🩺 [HealthCheck] FAILED:', e && e.message || e);
      if (typeof setGlossaryHealthCheck === 'function') setGlossaryHealthCheck({ error: true, summary: 'Analysis could not be completed.' });
    }
    if (typeof setIsRunningHealthCheck === 'function') setIsRunningHealthCheck(false);
    return null;
  };

  // ── getSlidesPreviewHTML ─────────────────────────────────────────
  // Builds a deck of 16:9 slide HTML cards from the current export
  // history (simplified text, glossary, quiz, outline, etc.). Pure.
  const getSlidesPreviewHTML = (deps) => {
    const { sourceTopic, gradeLevel, getExportableHistory } = deps || {};
    const slides = [];
    const themeColor = '#4f46e5';
    slides.push('<div class="slide"><div style="background:' + themeColor + ';color:white;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;border-radius:8px"><h1 style="font-size:28px;margin:0;text-align:center;padding:0 20px">' + (sourceTopic || 'Untitled Presentation') + '</h1><p style="font-size:14px;opacity:0.8;margin-top:8px">' + gradeLevel + ' · ' + new Date().toLocaleDateString() + '</p></div></div>');
    (typeof getExportableHistory === 'function' ? getExportableHistory() : []).forEach(function(item) {
      const title = item.title || item.type;
      if (item.type === 'simplified' && typeof item.data === 'string') {
        const paragraphs = item.data.split(/\n{2,}/);
        let slideContent = ''; let charCount = 0;
        paragraphs.forEach(function(p) {
          const clean = p.replace(/\*\*/g, '').replace(/\[(.*?)\]\(.*?\)/g, '$1').trim();
          if (!clean) return;
          if (charCount + clean.length > 800 && slideContent) {
            slides.push('<div class="slide"><div class="slide-title">' + title + '</div><div class="slide-body">' + slideContent + '</div></div>');
            slideContent = ''; charCount = 0;
          }
          slideContent += '<p>' + clean + '</p>'; charCount += clean.length;
        });
        if (slideContent) slides.push('<div class="slide"><div class="slide-title">' + title + '</div><div class="slide-body">' + slideContent + '</div></div>');
      } else if (item.type === 'glossary' && Array.isArray(item.data)) {
        const TPS = 5;
        for (let i = 0; i < item.data.length; i += TPS) {
          const chunk = item.data.slice(i, i + TPS);
          const rows = chunk.map(function(g) { return '<tr><td style="font-weight:700;color:' + themeColor + ';padding:6px 10px;border-bottom:1px solid #e2e8f0;width:30%">' + (g.term || '') + '</td><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0">' + (g.def || '') + '</td></tr>'; }).join('');
          slides.push('<div class="slide"><div class="slide-title">' + title + (i > 0 ? ' (cont.)' : '') + '</div><div class="slide-body"><table style="width:100%;border-collapse:collapse;font-size:13px"><tbody>' + rows + '</tbody></table></div></div>');
        }
      } else if (item.type === 'quiz' && item.data && item.data.questions) {
        item.data.questions.forEach(function(q, qi) {
          const opts = (q.options || []).map(function(o, oi) { return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0"><span style="background:#e0e7ff;color:' + themeColor + ';width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;flex-shrink:0">' + String.fromCharCode(65 + oi) + '</span><span>' + o + '</span></div>'; }).join('');
          slides.push('<div class="slide"><div class="slide-title">Question ' + (qi + 1) + '</div><div class="slide-body"><p style="font-size:16px;font-weight:600;margin-bottom:16px">' + (q.question || '') + '</p>' + opts + '</div></div>');
        });
      } else if (item.type === 'outline' || item.type === 'timeline') {
        const text = typeof item.data === 'string' ? item.data : JSON.stringify(item.data);
        const lines = text.split(/\n/).filter(function(l) { return l.trim(); });
        let slideContent = ''; let count = 0;
        lines.forEach(function(l) {
          const clean = l.replace(/\*\*/g, '').replace(/^#+\s*/, '').trim();
          if (!clean) return;
          if (count >= 8 && slideContent) {
            slides.push('<div class="slide"><div class="slide-title">' + title + '</div><div class="slide-body">' + slideContent + '</div></div>');
            slideContent = ''; count = 0;
          }
          const isHeading = l.trim().startsWith('#');
          slideContent += isHeading ? '<h3 style="color:' + themeColor + ';margin:8px 0 4px">' + clean + '</h3>' : '<p style="margin:4px 0">' + clean + '</p>';
          count++;
        });
        if (slideContent) slides.push('<div class="slide"><div class="slide-title">' + title + '</div><div class="slide-body">' + slideContent + '</div></div>');
      } else {
        const text = typeof item.data === 'string' ? item.data.substring(0, 1200) : JSON.stringify(item.data).substring(0, 1200);
        const clean = text.replace(/\*\*/g, '').replace(/\[(.*?)\]\(.*?\)/g, '$1').replace(/<[^>]*>/g, '');
        slides.push('<div class="slide"><div class="slide-title">' + title + '</div><div class="slide-body"><p>' + clean.replace(/\n/g, '</p><p>') + '</p></div></div>');
      }
    });
    if (slides.length <= 1) {
      slides.push('<div class="slide"><div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;font-size:14px;text-align:center"><div><div style="font-size:40px;margin-bottom:12px">📊</div>Generate content first, then preview as slides.<br><span style="font-size:12px">Each resource type becomes its own slide(s).</span></div></div></div>');
    }
    return '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>'
      + '* { box-sizing: border-box; margin: 0; padding: 0; }'
      + 'body { font-family: system-ui, sans-serif; background: #1e293b; padding: 24px; display: flex; flex-direction: column; gap: 24px; align-items: center; }'
      + '.slide { width: 100%; max-width: 720px; aspect-ratio: 16/9; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); padding: 32px 40px; overflow: hidden; position: relative; }'
      + '.slide-title { font-size: 18px; font-weight: 800; color: white; background: ' + themeColor + '; margin: -32px -40px 20px; padding: 12px 40px; }'
      + '.slide-body { font-size: 14px; line-height: 1.6; color: #1e293b; overflow: hidden; }'
      + '.slide-body p { margin-bottom: 8px; }'
      + '.slide-body h3 { font-size: 15px; margin: 12px 0 4px; }'
      + '.slide-body table { margin-top: 8px; }'
      + '.slide-num { position: absolute; bottom: 8px; right: 16px; font-size: 10px; color: #94a3b8; font-weight: 600; }'
      + '</style></head><body>'
      + slides.map(function(s, i) { return s.replace('</div></div>', '<div class="slide-num">' + (i + 1) + ' / ' + slides.length + '</div></div></div>'); }).join('\n')
      + '</body></html>';
  };

  // ── getLessonContext ─────────────────────────────────────────────
  // Pulls the latest of each major resource type out of `history` and
  // strings together a context blob the lesson-planner / Socratic chat
  // / scaffold builders consume. No state writes.
  const getLessonContext = (historySource, deps) => {
    const { history, targetStandards, inputText } = deps || {};
    const src = historySource || history || [];
    const findLatest = function(type) { return src.slice().reverse().find(function(h) { return h && h.type === type; }); };
    const analysisItem = findLatest('analysis');
    const alignmentItem = findLatest('alignment-report');
    const simplifiedItem = findLatest('simplified');
    const glossaryItem = findLatest('glossary');
    const imageItem = findLatest('image');
    const quizItem = findLatest('quiz');
    const scaffoldItem = findLatest('sentence-frames');
    const timelineItem = findLatest('timeline');
    const conceptItem = findLatest('concept-sort');
    const adventureItem = findLatest('adventure');
    let context = '';
    if (analysisItem && analysisItem.data) {
      const concepts = Array.isArray(analysisItem.data.concepts) ? analysisItem.data.concepts.join(', ') : 'N/A';
      const level = typeof analysisItem.data.readingLevel === 'object' ? analysisItem.data.readingLevel.range : analysisItem.data.readingLevel;
      context += '\n--- CONTEXT: ANALYSIS ---\nKey Concepts: ' + concepts + '\nDetected Reading Level: ' + level + '\n';
    }
    if (alignmentItem && alignmentItem.data && alignmentItem.data.reports && alignmentItem.data.reports[0]) {
      const std = alignmentItem.data.reports[0].standard;
      const breakdown = alignmentItem.data.reports[0].standardBreakdown ? JSON.stringify(alignmentItem.data.reports[0].standardBreakdown) : 'N/A';
      context += '\n--- CONTEXT: STANDARDS ---\nTarget Standard: ' + std + '\nStandard Breakdown: ' + breakdown + '\n';
    } else if (targetStandards && targetStandards.length > 0) {
      context += '\n--- CONTEXT: STANDARDS ---\nTarget Standard(s): ' + targetStandards.join(', ') + '\n';
    }
    if (simplifiedItem && simplifiedItem.data) {
      const text = typeof simplifiedItem.data === 'string' ? simplifiedItem.data : JSON.stringify(simplifiedItem.data);
      context += '\n--- CONTEXT: CORE TEXT (Leveled Reading) ---\n' + text.substring(0, 2000) + (text.length > 2000 ? '...' : '') + '\n';
    } else if (analysisItem && analysisItem.data && analysisItem.data.originalText) {
      const text = analysisItem.data.originalText;
      context += '\n--- CONTEXT: CORE TEXT (Verified Source) ---\n' + text.substring(0, 2000) + (text.length > 2000 ? '...' : '') + '\n';
    } else if (inputText) {
      context += '\n--- CONTEXT: CORE TEXT ---\n' + inputText.substring(0, 2000) + (inputText.length > 2000 ? '...' : '') + '\n';
    }
    if (glossaryItem && glossaryItem.data) {
      const terms = glossaryItem.data.map(function(t) { return t.term; }).join(', ');
      context += '\n--- CONTEXT: VOCABULARY (Glossary) ---\nKey Terms: ' + terms + '\n';
    }
    if (imageItem && imageItem.data && imageItem.data.prompt) {
      context += '\n--- CONTEXT: VISUAL SUPPORT ---\nAvailable Image: "' + imageItem.data.prompt + '". Use this for the Hook or Visual Anchor.\n';
    }
    if (quizItem && quizItem.data && quizItem.data.questions) {
      context += '\n--- CONTEXT: ASSESSMENT (Exit Ticket) ---\nHas ' + quizItem.data.questions.length + ' Multiple Choice Questions and ' + ((quizItem.data.reflections && quizItem.data.reflections.length) || 0) + ' Reflection prompts. Use this for Closure.\n';
    }
    if (scaffoldItem && scaffoldItem.data) {
      const type = scaffoldItem.data.mode === 'list' ? 'Sentence Starters' : 'Paragraph Frame';
      context += '\n--- CONTEXT: WRITING SCAFFOLDS ---\nType: ' + type + '. Use this for Independent Practice.\n';
    }
    if (timelineItem && timelineItem.data) {
      context += '\n--- CONTEXT: SEQUENCE BUILDER ACTIVITY ---\n' + timelineItem.data.length + ' Events available for sequencing. Use for Guided Practice.\n';
    }
    if (conceptItem && conceptItem.data) {
      context += '\n--- CONTEXT: CONCEPT SORT ---\nCategories: ' + conceptItem.data.categories.map(function(c) { return c.label; }).join(', ') + '. Use for Guided Practice.\n';
    }
    if (adventureItem) {
      context += '\n--- CONTEXT: ADVENTURE MODE ---\nInteractive roleplay available. Use for Engagement/Hook.\n';
    }
    return context;
  };

  // ── handleCopyToClipboard ────────────────────────────────────────
  // Serializes the currently-displayed lesson plan to plain text and
  // pushes it to the clipboard. Toasts success / failure either way.
  const handleCopyToClipboard = async (deps) => {
    const { generatedContent, sourceTopic, gradeLevel, addToast, t, warnLog } = deps || {};
    try {
      if (!generatedContent || !generatedContent.data) {
        if (addToast && t) addToast(t('toasts.nothing_to_copy'), 'warning');
        return;
      }
      const data = generatedContent.data;
      let textContent = (t ? t('lesson_plan.header_title') : 'Lesson Plan') + '\n';
      textContent += (t ? t('lesson_plan.topic_label') : 'Topic') + ': ' + (sourceTopic || 'General') + '\n';
      textContent += (t ? t('lesson_plan.grade_label') : 'Grade') + ': ' + gradeLevel + '\n';
      if (data.objectives && data.objectives.length > 0) {
        textContent += (t ? t('lesson_plan.objectives_header') : 'Objectives') + ':\n';
        data.objectives.forEach(function(obj, i) { textContent += (i + 1) + '. ' + obj + '\n'; });
        textContent += '\n';
      }
      if (data.materialsNeeded && data.materialsNeeded.length > 0) {
        textContent += (t ? t('lesson_plan.materials_header') : 'Materials') + ':\n';
        data.materialsNeeded.forEach(function(mat) { textContent += '• ' + mat + '\n'; });
        textContent += '\n';
      }
      if (data.activities && data.activities.length > 0) {
        textContent += (t ? t('lesson_plan.activities_header') : 'Activities') + ':\n';
        data.activities.forEach(function(act, i) {
          textContent += (i + 1) + '. ' + (act.title || act.name || 'Activity') + '\n';
          if (act.description) textContent += '   ' + act.description + '\n';
          if (act.duration) textContent += '   Duration: ' + act.duration + '\n';
        });
        textContent += '\n';
      }
      if (data.assessmentIdeas && data.assessmentIdeas.length > 0) {
        textContent += (t ? t('lesson_plan.assessment_header') : 'Assessment') + ':\n';
        data.assessmentIdeas.forEach(function(idea) { textContent += '• ' + idea + '\n'; });
      }
      await navigator.clipboard.writeText(textContent);
      if (addToast && t) addToast(t('toasts.copied_to_clipboard'), 'success');
    } catch (err) {
      if (typeof warnLog === 'function') warnLog('Copy to clipboard failed:', err);
      if (addToast && t) addToast(t('toasts.copy_failed'), 'error');
    }
  };

  // ── Register ─────────────────────────────────────────────────────
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.ExportHandlers = {
    generateExportAudio,
    executeExportFromPreview,
    handleExport,
    downloadHtmlBlob,
    toggleA11yInspect,
    applyA11yInspector,
    getReadableContent,
    handleFormatText,
    getAdventureImageDB,
    getChatThemeStyles,
    runGlossaryHealthCheck,
    getSlidesPreviewHTML,
    getLessonContext,
    handleCopyToClipboard
  };
  window.AlloModules.ExportHandlersModule = true;
  console.log('[ExportHandlersModule] 14 handlers registered (Phase P bundle)');
})();
