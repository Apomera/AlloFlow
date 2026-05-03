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

  // ── downloadHtmlBlob ─────────────────────────────────────────────
  // Single-file HTML download fallback used when JSZip is unavailable.
  // Routes through the App-scope safeDownloadBlob helper so cross-browser
  // quirks (Safari blob handling, sandbox restrictions) stay centralized.
  const downloadHtmlBlob = (content, deps) => {
    const { safeDownloadBlob, addToast, t } = deps || {};
    const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
    if (typeof safeDownloadBlob === 'function') {
      safeDownloadBlob(blob, (t ? t('export.filenames.html_pack') : 'alloflow-export') + '.html');
    } else {
      // Last-ditch fallback if the helper isn't available — should never
      // happen in practice but better than throwing.
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = (t ? t('export.filenames.html_pack') : 'alloflow-export') + '.html';
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    if (addToast && t) addToast(t('export_status.html_success'), 'success');
  };

  // ── executeExportFromPreview ─────────────────────────────────────
  // Orchestrates an export driven by the preview iframe. If the iframe
  // has substantive edited content, that wins; otherwise we regenerate
  // from history. Audio embeds are optional (gated by exportConfig).
  // Slides mode delegates back to the App-scope handleExportSlides
  // because that handler is owned by the doc_pipeline factory binding.
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
    let htmlContent;
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
      htmlContent = '<!DOCTYPE html>\n<html' + iframeDoc.documentElement.outerHTML.substring(5);
      console.log('[Export] ✅ Using edited iframe content (' + htmlContent.length + ' chars)');
    } else {
      console.warn('[Export] ⚠️ Iframe empty or missing — falling back to generateFullPackHTML(history)');
      htmlContent = generateFullPackHTML(getExportableHistory(), sourceTopic, isWorksheet, studentResponses, exportConfig);
      console.log('[Export] ✅ Regenerated from history: ' + htmlContent.length + ' chars, ' + (history ? history.length : 0) + ' history items');
    }
    if (!htmlContent || htmlContent.trim().length < 200) {
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

    const needsAudio = exportConfig && (exportConfig.includeAudioSource || exportConfig.includeAudioLeveled);
    if (needsAudio && callTTS) {
      if (addToast) addToast('Generating read-aloud audio... this may take a moment.', 'info');
      try {
        if (exportConfig.includeAudioSource) {
          const analysisItem = (history || []).find(function(h) { return h && h.type === 'analysis'; });
          if (analysisItem && analysisItem.data && analysisItem.data.originalText) {
            const audioHtml = await generateExportAudio(analysisItem.data.originalText, 'Source Text Read-Aloud', deps);
            if (audioHtml) htmlContent = htmlContent.replace('</main>', audioHtml + '</main>');
          }
        }
        if (exportConfig.includeAudioLeveled) {
          const simplifiedItem = (history || []).find(function(h) { return h && h.type === 'simplified'; });
          const leveledText = (simplifiedItem && simplifiedItem.data && typeof simplifiedItem.data === 'string') ? simplifiedItem.data : '';
          if (leveledText) {
            const audioHtml = await generateExportAudio(leveledText, 'Leveled Text Read-Aloud', deps);
            if (audioHtml) {
              const insertPoint = htmlContent.indexOf('</div>', htmlContent.indexOf('id="' + simplifiedItem.id + '"'));
              if (insertPoint > 0) {
                htmlContent = htmlContent.substring(0, insertPoint) + audioHtml + htmlContent.substring(insertPoint);
              }
            }
          }
        }
        if (addToast) addToast('Audio embedded successfully!', 'success');
      } catch (e) {
        console.warn('[Export] Audio embedding failed:', e);
        if (addToast) addToast('Audio generation failed — exporting without audio.', 'info');
      }
    }

    if (typeof setShowExportPreview === 'function') setShowExportPreview(false);
    if (mode === 'slides') {
      if (typeof handleExportSlides === 'function') handleExportSlides();
      return;
    }
    if (mode === 'print' || mode === 'worksheet') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(function() { printWindow.print(); }, 500);
      } else {
        alert((t && t('export_status.popup_blocked')) || 'Pop-up blocked — please allow pop-ups for this site to print.');
      }
    } else if (mode === 'html') {
      if (window.JSZip) {
        if (addToast) addToast((t && t('export_status.bundling_zip')) || 'Bundling export...', 'info');
        const zip = new window.JSZip();
        zip.file('index.html', htmlContent);
        zip.file('allo-project.json', JSON.stringify(history, null, 2));
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'alloflow-export-' + new Date().toISOString().split('T')[0] + '.zip';
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        URL.revokeObjectURL(url);
        if (addToast) addToast('Export downloaded!', 'success');
      } else {
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = 'alloflow-export.html';
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        URL.revokeObjectURL(url);
        if (addToast) addToast('HTML export downloaded!', 'success');
      }
    }
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
    if (!htmlContent || htmlContent.trim().length < 200) {
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
        alert((t && t('export_status.popup_blocked')) || 'Pop-up blocked — please allow pop-ups for this site to print.');
      }
    } else {
      if (window.JSZip) {
        if (addToast && t) addToast(t('export_status.bundling_zip'), 'info');
        const zip = new window.JSZip();
        zip.file('index.html', htmlContent);
        const projectJson = JSON.stringify(history, null, 2);
        zip.file('allo-project.json', projectJson);
        const readmeContent = (t ? t('export.readme_title') : 'AlloFlow Export') + '\n'
          + (t ? t('export.readme_generated', { date: new Date().toLocaleString() }) : 'Generated: ' + new Date().toLocaleString()) + '\n'
          + (t ? t('export.readme_topic', { topic: sourceTopic || (t && t('common.untitled')) || 'Untitled' }) : 'Topic: ' + (sourceTopic || 'Untitled')) + '\n'
          + (t ? t('export.readme_contents') : 'Contents:') + '\n'
          + (t ? t('export.readme_html_desc') : '- index.html: rendered lesson') + '\n'
          + (t ? t('export.readme_json_desc') : '- allo-project.json: source data');
        zip.file('readme.txt', readmeContent);
        try {
          const content = await zip.generateAsync({ type: 'blob' });
          const url = URL.createObjectURL(content);
          const link = document.createElement('a');
          link.href = url;
          link.download = (t ? t('export.filenames.zip_pack') : 'alloflow-pack') + '-' + new Date().toISOString().split('T')[0] + '.zip';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          if (addToast && t) addToast(t('export.bundle_downloaded'), 'success');
          if (alloBotRef && alloBotRef.current && t) {
            alloBotRef.current.speak(t('bot_events.feedback_export_complete'), 'happy');
          }
        } catch (err) {
          if (typeof warnLog === 'function') warnLog('Zip generation failed', err);
          if (addToast && t) addToast(t('export_status.zip_error'), 'error');
          downloadHtmlBlob(htmlContent, deps);
        }
      } else {
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
      style.textContent = '\n        .a11y-inspect-badge { position:absolute; z-index:9999; font-size:10px; font-weight:800; font-family:monospace; padding:2px 6px; border-radius:4px; pointer-events:auto; line-height:1.3; max-width:280px; word-wrap:break-word; box-shadow:0 2px 6px rgba(0,0,0,0.2); cursor:pointer; }\n        .a11y-inspect-badge:hover { opacity:1 !important; z-index:10000; transform:scale(1.05); }\n        .a11y-badge-heading { background:#7c3aed; color:#fff; }\n        .a11y-badge-img { background:#dc2626; color:#fff; }\n        .a11y-badge-aria { background:#0891b2; color:#fff; }\n        .a11y-badge-role { background:#059669; color:#fff; }\n        .a11y-badge-table { background:#d97706; color:#fff; }\n        .a11y-badge-input { background:#e11d48; color:#fff; }\n        .a11y-badge-link { background:#2563eb; color:#fff; }\n        .a11y-badge-lang { background:#4f46e5; color:#fff; }\n        .a11y-badge-landmark { background:#166534; color:#fff; }\n        .a11y-inspect-outline { outline:3px solid; outline-offset:2px; position:relative; }\n        .a11y-inspect-outline-heading { outline-color:#7c3aed; }\n        .a11y-inspect-outline-img { outline-color:#dc2626; }\n        .a11y-inspect-outline-aria { outline-color:#0891b2; }\n        .a11y-inspect-outline-role { outline-color:#059669; }\n        .a11y-inspect-outline-table { outline-color:#d97706; }\n        .a11y-inspect-outline-input { outline-color:#e11d48; }\n        .a11y-inspect-outline-landmark { outline-color:#166534; }\n      ';
      doc.head.appendChild(style);
      const badge = function(el, cls, text) {
        el.classList.add('a11y-inspect-outline', 'a11y-inspect-outline-' + cls.replace('a11y-badge-', ''));
        el.style.position = el.style.position || 'relative';
        const b = doc.createElement('span');
        b.className = 'a11y-inspect-badge ' + cls;
        b.textContent = text;
        b.title = 'Click to edit this accessibility attribute';
        b.style.position = 'absolute'; b.style.top = '-14px'; b.style.left = '0';
        b.addEventListener('click', function(ev) {
          ev.stopPropagation();
          const current = b.dataset.attrValue || '';
          const attrName = b.dataset.attrName;
          const target = b.dataset.targetSelector;
          if (attrName && target) {
            const newVal = prompt('Edit ' + attrName + ':', current);
            if (newVal !== null) {
              const targetEl = doc.querySelector(target) || el;
              targetEl.setAttribute(attrName, newVal);
              b.textContent = b.dataset.prefix + (newVal || '(empty)');
              b.dataset.attrValue = newVal;
            }
          }
        });
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
        b.title = 'Click to edit alt text';
        b.style.cssText = 'position:absolute;top:-14px;left:0;cursor:pointer;';
        b.addEventListener('click', function(ev) {
          ev.stopPropagation();
          const newAlt = prompt('Edit alt text for this image:', alt || '');
          if (newAlt !== null) { img.setAttribute('alt', newAlt); b.textContent = 'ALT: ' + (newAlt || '(empty)'); b.dataset.attrValue = newAlt; }
        });
        const wrapper = doc.createElement('span');
        wrapper.style.cssText = 'position:relative;display:inline-block;';
        img.parentNode.insertBefore(wrapper, img);
        wrapper.appendChild(img);
        wrapper.appendChild(b);
      });
      doc.querySelectorAll('[aria-label]').forEach(function(el) {
        const label = el.getAttribute('aria-label');
        badge(el, 'a11y-badge-aria', 'ARIA: ' + label);
      });
      doc.querySelectorAll('[role]').forEach(function(el) {
        const role = el.getAttribute('role');
        if (role === 'main' || role === 'contentinfo' || role === 'banner' || role === 'navigation') {
          badge(el, 'a11y-badge-landmark', 'LANDMARK: ' + role);
        } else {
          badge(el, 'a11y-badge-role', 'ROLE: ' + role);
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
        badge(el, 'a11y-badge-input', label ? 'LABEL: ' + label : 'LABEL: ⚠️ MISSING');
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
        '<br><em style="font-size:10px;opacity:0.7;">Click any badge to edit the attribute</em>';
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
      case 'list':      newText = before + '\n- '  + selection + after; newCursorPos = end + 3; break;
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
        const db = await this.getDB(); if (!db) return null;
        return new Promise(function(resolve) {
          try {
            const tx = db.transaction('images', 'readonly');
            const request = tx.objectStore('images').get(turnNumber);
            request.onsuccess = function() { resolve((request.result && request.result.image) || null); };
            request.onerror = function() { resolve(null); };
          } catch (e) { resolve(null); }
        });
      },
      async getAllImages() {
        const db = await this.getDB(); if (!db) return [];
        return new Promise(function(resolve) {
          try {
            const tx = db.transaction('images', 'readonly');
            const request = tx.objectStore('images').getAll();
            request.onsuccess = function() { resolve(request.result || []); };
            request.onerror = function() { resolve([]); };
          } catch (e) { resolve([]); }
        });
      },
      async clearAll() {
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
