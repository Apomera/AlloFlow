(function () {
  if (window.AlloModules && window.AlloModules.SymbolStudio) {
    console.log("[CDN] SymbolStudio already loaded, skipping duplicate");
    return;
  }

  // symbol_studio_module.js
  // AI-powered PCS-style symbol generator for visual supports (AAC, schedules, boards)
  // Competes with Boardmaker by generating unlimited custom symbols via Imagen + image-to-image editing
  // Version: 1.0.0 (Mar 2026)

  var warnLog = function () { console.warn.apply(console, ["[SymStudio-WARN]"].concat(Array.prototype.slice.call(arguments))); };
  var debugLog = function () { console.log.apply(console, ["[SymStudio-DBG]"].concat(Array.prototype.slice.call(arguments))); };

  var STORAGE_KEY = 'alloSymbolGallery';

  var STYLE_OPTIONS = [
    { value: '', label: 'Flat Vector (default)' },
    { value: 'simple line art, minimal', label: 'Line Art' },
    { value: 'friendly cartoon style', label: 'Cartoon' },
    { value: 'watercolor illustration', label: 'Watercolor' },
    { value: 'bold comic book style', label: 'Bold Comic' },
    { value: 'realistic detailed illustration', label: 'Realistic' },
  ];

  var BATCH_SIZE = 5;
  var BATCH_DELAY_MS = 600;
  var MAX_RETRIES = 3;

  // ── localStorage helpers ──────────────────────────────────────────────────

  function loadGallery() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch (e) { return []; }
  }

  function saveGallery(items) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
    catch (e) { warnLog("Could not save gallery:", e); }
  }

  // ── Image generation helpers ──────────────────────────────────────────────

  function buildPrompt(label, description, style) {
    var styleInstruction = (style && style.trim())
      ? ('Style: ' + style + '.')
      : 'Simple, clear, flat vector art style.';
    var contextPart = (description && description.trim())
      ? (' (Context: ' + description.trim() + ')')
      : '';
    return 'Icon style illustration of "' + label.trim() + '"' + contextPart + '. '
      + styleInstruction + ' White background. STRICTLY NO TEXT, NO LABELS, NO LETTERS. Visual only. Educational icon.';
  }

  async function generateImage(label, description, style, autoClean, onCallImagen, onCallGeminiImageEdit) {
    var prompt = buildPrompt(label, description, style);
    var imageUrl = await onCallImagen(prompt, 512, 0.85);
    if (autoClean && imageUrl) {
      try {
        var raw = imageUrl.split(',')[1];
        var cleaned = await onCallGeminiImageEdit(
          "Remove all text, labels, letters, and words from the image. Keep the illustration clean.",
          raw
        );
        if (cleaned) imageUrl = cleaned;
      } catch (editErr) {
        warnLog("Auto-clean failed, using original:", editErr);
      }
    }
    return imageUrl;
  }

  async function generateWithRetry(label, description, style, autoClean, onCallImagen, onCallGeminiImageEdit) {
    for (var attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise(function (r) { setTimeout(r, 1000 * Math.pow(2, attempt)); });
        }
        return await generateImage(label, description, style, autoClean, onCallImagen, onCallGeminiImageEdit);
      } catch (e) {
        if (attempt === MAX_RETRIES - 1) throw e;
        warnLog('Retry ' + (attempt + 1) + '/' + MAX_RETRIES + ' for "' + label + '":', e.message);
      }
    }
  }

  // ── SymbolStudio Component ────────────────────────────────────────────────

  var SymbolStudio = React.memo(function SymbolStudio(props) {
    var onCallImagen = props.onCallImagen;
    var onCallGeminiImageEdit = props.onCallGeminiImageEdit;
    var onCallTTS = props.onCallTTS;
    var selectedVoice = props.selectedVoice;
    var addToast = props.addToast;
    var onClose = props.onClose;
    var isOpen = props.isOpen;

    var _gallery = React.useState(loadGallery);
    var gallery = _gallery[0];
    var setGallery = _gallery[1];

    var _selectedId = React.useState(null);
    var selectedId = _selectedId[0];
    var setSelectedId = _selectedId[1];

    var _label = React.useState('');
    var label = _label[0];
    var setLabel = _label[1];

    var _description = React.useState('');
    var description = _description[0];
    var setDescription = _description[1];

    var _style = React.useState('');
    var style = _style[0];
    var setStyle = _style[1];

    var _autoClean = React.useState(true);
    var autoClean = _autoClean[0];
    var setAutoClean = _autoClean[1];

    var _mode = React.useState('single');
    var mode = _mode[0];
    var setMode = _mode[1];

    var _batchText = React.useState('');
    var batchText = _batchText[0];
    var setBatchText = _batchText[1];

    var _loadingIds = React.useState({});
    var loadingIds = _loadingIds[0];
    var setLoadingIds = _loadingIds[1];

    var _refinementInputs = React.useState({});
    var refinementInputs = _refinementInputs[0];
    var setRefinementInputs = _refinementInputs[1];

    var _filterText = React.useState('');
    var filterText = _filterText[0];
    var setFilterText = _filterText[1];

    var selectedItem = gallery.find(function (i) { return i.id === selectedId; }) || null;
    var isAnyLoading = Object.keys(loadingIds).length > 0;

    // ── Actions ────────────────────────────────────────────────────────────

    var generateSingle = React.useCallback(async function () {
      if (!label.trim() || !onCallImagen) return;
      var tempId = 'pending-' + Date.now();
      setLoadingIds(function (p) { var n = Object.assign({}, p); n[tempId] = true; return n; });
      try {
        var imageUrl = await generateWithRetry(label, description, style, autoClean, onCallImagen, onCallGeminiImageEdit);
        var entry = {
          id: (crypto && crypto.randomUUID) ? crypto.randomUUID() : ('sym-' + Date.now() + '-' + Math.random().toString(36).slice(2)),
          label: label.trim(),
          description: description.trim(),
          image: imageUrl,
          style: style || 'flat vector',
          createdAt: Date.now()
        };
        var updated = [entry].concat(gallery);
        setGallery(updated);
        saveGallery(updated);
        setSelectedId(entry.id);
        addToast && addToast({ message: 'Symbol generated!', type: 'success' });
      } catch (e) {
        warnLog("Single generation failed:", e);
        addToast && addToast({ message: 'Generation failed: ' + e.message, type: 'error' });
      } finally {
        setLoadingIds(function (p) { var n = Object.assign({}, p); delete n[tempId]; return n; });
      }
    }, [label, description, style, autoClean, gallery, onCallImagen, onCallGeminiImageEdit, addToast]);

    var generateBatch = React.useCallback(async function () {
      if (!onCallImagen) return;
      var lines = batchText.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
      if (!lines.length) return;
      var newEntries = [];
      for (var i = 0; i < lines.length; i += BATCH_SIZE) {
        var batch = lines.slice(i, i + BATCH_SIZE);
        var results = await Promise.all(batch.map(async function (lbl) {
          var tempId = 'batch-' + lbl + '-' + Date.now();
          setLoadingIds(function (p) { var n = Object.assign({}, p); n[tempId] = true; return n; });
          try {
            var imageUrl = await generateWithRetry(lbl, '', style, autoClean, onCallImagen, onCallGeminiImageEdit);
            return {
              id: (crypto && crypto.randomUUID) ? crypto.randomUUID() : ('sym-' + Date.now() + '-' + Math.random().toString(36).slice(2)),
              label: lbl, description: '', image: imageUrl,
              style: style || 'flat vector', createdAt: Date.now()
            };
          } catch (e) {
            warnLog('Batch failed for "' + lbl + '":', e);
            return null;
          } finally {
            setLoadingIds(function (p) { var n = Object.assign({}, p); delete n[tempId]; return n; });
          }
        }));
        results.filter(Boolean).forEach(function (r) { newEntries.push(r); });
        if (i + BATCH_SIZE < lines.length) {
          await new Promise(function (r) { setTimeout(r, BATCH_DELAY_MS); });
        }
      }
      if (newEntries.length > 0) {
        var updated = newEntries.concat(gallery);
        setGallery(updated);
        saveGallery(updated);
        setSelectedId(newEntries[0].id);
        addToast && addToast({ message: newEntries.length + ' symbol(s) generated!', type: 'success' });
      }
    }, [batchText, style, autoClean, gallery, onCallImagen, onCallGeminiImageEdit, addToast]);

    var regenerateSymbol = React.useCallback(async function (id) {
      if (!onCallImagen) return;
      var item = gallery.find(function (i) { return i.id === id; });
      if (!item) return;
      setLoadingIds(function (p) { var n = Object.assign({}, p); n[id] = true; return n; });
      try {
        var imageUrl = await generateWithRetry(item.label, item.description, item.style, autoClean, onCallImagen, onCallGeminiImageEdit);
        var updated = gallery.map(function (i) { return i.id === id ? Object.assign({}, i, { image: imageUrl }) : i; });
        setGallery(updated);
        saveGallery(updated);
      } catch (e) {
        warnLog("Regeneration failed:", e);
        addToast && addToast({ message: 'Regeneration failed', type: 'error' });
      } finally {
        setLoadingIds(function (p) { var n = Object.assign({}, p); delete n[id]; return n; });
      }
    }, [gallery, autoClean, onCallImagen, onCallGeminiImageEdit, addToast]);

    var refineSymbol = React.useCallback(async function (id, instruction) {
      if (!onCallGeminiImageEdit || !instruction.trim()) return;
      var item = gallery.find(function (i) { return i.id === id; });
      if (!item) return;
      setLoadingIds(function (p) { var n = Object.assign({}, p); n[id] = true; return n; });
      try {
        var raw = item.image.split(',')[1];
        var refined = await onCallGeminiImageEdit(
          'Edit this educational icon. Instruction: ' + instruction + '. Maintain simple, flat vector art style. White background. STRICTLY NO TEXT.',
          raw
        );
        if (refined) {
          var updated = gallery.map(function (i) { return i.id === id ? Object.assign({}, i, { image: refined }) : i; });
          setGallery(updated);
          saveGallery(updated);
          setRefinementInputs(function (p) { var n = Object.assign({}, p); n[id] = ''; return n; });
        }
      } catch (e) {
        warnLog("Refinement failed:", e);
        addToast && addToast({ message: 'Refinement failed', type: 'error' });
      } finally {
        setLoadingIds(function (p) { var n = Object.assign({}, p); delete n[id]; return n; });
      }
    }, [gallery, onCallGeminiImageEdit, addToast]);

    var removeTextFromSymbol = React.useCallback(async function (id) {
      await refineSymbol(id, "Remove all text, labels, letters, and words from the image. Keep the illustration clean.");
    }, [refineSymbol]);

    var deleteSymbol = React.useCallback(function (id) {
      var updated = gallery.filter(function (i) { return i.id !== id; });
      setGallery(updated);
      saveGallery(updated);
      if (selectedId === id) setSelectedId(updated.length > 0 ? updated[0].id : null);
    }, [gallery, selectedId]);

    var downloadSymbol = React.useCallback(function (item) {
      var a = document.createElement('a');
      a.href = item.image;
      a.download = item.label.replace(/\s+/g, '_').toLowerCase() + '.png';
      a.click();
    }, []);

    var downloadAll = React.useCallback(function () {
      gallery.forEach(function (item, i) {
        setTimeout(function () {
          var a = document.createElement('a');
          a.href = item.image;
          a.download = (i + 1) + '_' + item.label.replace(/\s+/g, '_').toLowerCase() + '.png';
          a.click();
        }, i * 200);
      });
    }, [gallery]);

    var speakLabel = React.useCallback(function (text) {
      if (onCallTTS) onCallTTS(text, selectedVoice || 'Kore', 1);
    }, [onCallTTS, selectedVoice]);

    if (!isOpen) return null;

    var filteredGallery = filterText.trim()
      ? gallery.filter(function (i) { return i.label.toLowerCase().includes(filterText.toLowerCase()); })
      : gallery;

    // ── Styles (inline, no Tailwind dependency) ────────────────────────────

    var S = {
      overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' },
      modal: { background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '960px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.35)' },
      header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)', flexShrink: 0 },
      headerTitle: { color: '#fff', fontWeight: 700, fontSize: '17px', margin: 0 },
      headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: '11px', margin: '2px 0 0' },
      closeBtn: { color: '#fff', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '20px', lineHeight: 1 },
      body: { display: 'flex', flex: 1, overflow: 'hidden' },
      leftPanel: { width: '260px', padding: '14px', borderRight: '1px solid #e2e8f0', overflowY: 'auto', background: '#f8fafc', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '10px' },
      rightPanel: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
      label: { fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' },
      input: { width: '100%', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '7px 10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
      select: { width: '100%', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '7px 10px', fontSize: '12px', background: '#fff', outline: 'none', boxSizing: 'border-box' },
      textarea: { width: '100%', height: '90px', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '7px 10px', fontSize: '12px', resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
      modeToggle: { display: 'flex', gap: '4px', background: '#e2e8f0', borderRadius: '8px', padding: '3px' },
      generateBtn: function (disabled) {
        return { width: '100%', padding: '10px', background: disabled ? '#9ca3af' : 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: disabled ? 'not-allowed' : 'pointer', marginTop: '4px' };
      },
      previewArea: { padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#fff', display: 'flex', gap: '18px', alignItems: 'flex-start', flexShrink: 0 },
      galleryArea: { flex: 1, overflowY: 'auto', padding: '14px 18px' },
      galleryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: '8px' },
      cardBase: function (isSelected) {
        return {
          cursor: 'pointer', borderRadius: '8px', border: isSelected ? '2px solid #7c3aed' : '2px solid #e2e8f0',
          background: isSelected ? '#f5f3ff' : '#fafafa', padding: '8px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
          boxShadow: isSelected ? '0 0 0 3px rgba(124,58,237,0.15)' : 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s'
        };
      },
      actionBtn: function (bg, color) {
        return { padding: '5px 9px', background: bg, color: color, border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' };
      },
      refineInput: { flex: 1, border: '1px solid #fbbf24', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', outline: 'none', fontFamily: 'inherit' },
      refineBtn: function (disabled) {
        return { padding: '6px 12px', background: disabled ? '#d1d5db' : '#fbbf24', color: disabled ? '#9ca3af' : '#78350f', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: disabled ? 'not-allowed' : 'pointer' };
      }
    };

    var e = React.createElement;

    // ── Helper: spinner placeholder ────────────────────────────────────────
    function loadingPlaceholder(size) {
      return e('div', { style: { width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', borderRadius: '8px', border: '2px dashed #cbd5e1' } },
        e('span', { style: { fontSize: Math.floor(size / 3) } }, '⏳')
      );
    }

    // ── Mode toggle button ─────────────────────────────────────────────────
    function modeBtn(val, icon, txt) {
      var active = mode === val;
      return e('button', {
        onClick: function () { setMode(val); },
        style: { flex: 1, padding: '6px 4px', borderRadius: '6px', border: 'none', background: active ? '#fff' : 'transparent', fontWeight: active ? 700 : 400, fontSize: '12px', cursor: 'pointer', boxShadow: active ? '0 1px 3px rgba(0,0,0,0.12)' : 'none', color: active ? '#4f46e5' : '#64748b' }
      }, icon + ' ' + txt);
    }

    // ── Current symbol preview section ─────────────────────────────────────
    var previewSection = selectedItem
      ? e('div', { style: S.previewArea },
          // Large image
          e('div', { style: { flexShrink: 0 } },
            loadingIds[selectedItem.id]
              ? loadingPlaceholder(144)
              : e('img', { src: selectedItem.image, alt: selectedItem.label, style: { width: 144, height: 144, objectFit: 'contain', borderRadius: '10px', border: '2px solid #e2e8f0', background: '#fff', padding: '4px', display: 'block' } })
          ),
          // Controls column
          e('div', { style: { flex: 1, minWidth: 0 } },
            e('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' } },
              e('h3', { style: { fontWeight: 700, fontSize: '16px', color: '#1e293b', margin: 0 } }, selectedItem.label),
              selectedItem.description && e('span', { style: { fontSize: '11px', color: '#64748b', fontStyle: 'italic' } }, selectedItem.description)
            ),
            // Action row
            e('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' } },
              e('button', { onClick: function () { regenerateSymbol(selectedItem.id); }, disabled: !!loadingIds[selectedItem.id], style: S.actionBtn('#ede9fe', '#6d28d9') }, loadingIds[selectedItem.id] ? '⏳' : '🔄 Regen'),
              e('button', { onClick: function () { removeTextFromSymbol(selectedItem.id); }, disabled: !!loadingIds[selectedItem.id], style: S.actionBtn('#fee2e2', '#b91c1c') }, '🚫 Remove Text'),
              e('button', { onClick: function () { speakLabel(selectedItem.label); }, style: S.actionBtn('#dcfce7', '#16a34a') }, '🔊 Speak'),
              e('button', { onClick: function () { downloadSymbol(selectedItem); }, style: S.actionBtn('#dbeafe', '#1d4ed8') }, '⬇️ Save PNG'),
              e('button', { onClick: function () { deleteSymbol(selectedItem.id); }, style: S.actionBtn('#fee2e2', '#dc2626') }, '🗑️')
            ),
            // Refinement row
            e('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } },
              e('input', {
                type: 'text',
                value: refinementInputs[selectedItem.id] || '',
                onChange: function (ev) { var v = ev.target.value; setRefinementInputs(function (p) { var n = Object.assign({}, p); n[selectedItem.id] = v; return n; }); },
                onKeyDown: function (ev) { if (ev.key === 'Enter' && refinementInputs[selectedItem.id]) refineSymbol(selectedItem.id, refinementInputs[selectedItem.id]); },
                placeholder: 'Edit: make it a girl, add red X, change color...',
                style: S.refineInput
              }),
              e('button', {
                onClick: function () { if (refinementInputs[selectedItem.id]) refineSymbol(selectedItem.id, refinementInputs[selectedItem.id]); },
                disabled: !refinementInputs[selectedItem.id] || !!loadingIds[selectedItem.id],
                style: S.refineBtn(!refinementInputs[selectedItem.id] || !!loadingIds[selectedItem.id])
              }, loadingIds[selectedItem.id] ? '⏳' : '✏️ Refine')
            ),
            e('p', { style: { fontSize: '10px', color: '#94a3b8', margin: '4px 0 0' } }, 'Image-to-image editing — describe the change, then press Enter or Refine')
          )
        )
      : e('div', { style: { padding: '32px', textAlign: 'center', color: '#94a3b8', background: '#fff', borderBottom: '1px solid #e2e8f0' } },
          e('div', { style: { fontSize: '40px', marginBottom: '8px' } }, '🖼️'),
          e('p', { style: { fontWeight: 600, margin: '0 0 4px' } }, 'No symbol selected'),
          e('p', { style: { fontSize: '12px', margin: 0 } }, gallery.length === 0 ? 'Generate your first symbol using the panel on the left.' : 'Click a symbol in the gallery below to select it.')
        );

    // ── Gallery section ────────────────────────────────────────────────────
    var gallerySection = e('div', { style: S.galleryArea },
      e('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' } },
        e('span', { style: { fontWeight: 600, fontSize: '12px', color: '#374151' } }, 'Gallery (' + gallery.length + ')'),
        gallery.length > 1 && e('button', {
          onClick: downloadAll,
          style: { padding: '3px 8px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '5px', fontSize: '10px', cursor: 'pointer' }
        }, '⬇️ Save All'),
        e('input', {
          type: 'text',
          value: filterText,
          onChange: function (ev) { setFilterText(ev.target.value); },
          placeholder: 'Filter...',
          style: { border: '1px solid #e2e8f0', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', outline: 'none', marginLeft: 'auto', width: '110px' }
        })
      ),
      filteredGallery.length > 0
        ? e('div', { style: S.galleryGrid },
            filteredGallery.map(function (item) {
              return e('div', {
                key: item.id,
                onClick: function () { setSelectedId(item.id); },
                style: S.cardBase(item.id === selectedId)
              },
                loadingIds[item.id]
                  ? loadingPlaceholder(64)
                  : e('img', { src: item.image, alt: item.label, style: { width: 64, height: 64, objectFit: 'contain', borderRadius: '6px', background: '#fff', border: '1px solid #f1f5f9' } }),
                e('span', { style: { fontSize: '10px', color: '#475569', textAlign: 'center', wordBreak: 'break-word', lineHeight: 1.3, maxWidth: '80px' } }, item.label)
              );
            })
          )
        : e('div', { style: { textAlign: 'center', color: '#94a3b8', padding: '32px 0', fontSize: '13px' } },
            gallery.length === 0
              ? 'No symbols yet — generate your first one!'
              : 'No symbols match "' + filterText + '"'
          )
    );

    // ── Render ──────────────────────────────────────────────────────────────
    return e('div', { style: S.overlay, onClick: function (ev) { if (ev.target === ev.currentTarget) onClose && onClose(); } },
      e('div', { style: S.modal, onClick: function (ev) { ev.stopPropagation(); } },
        // Header
        e('div', { style: S.header },
          e('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
            e('span', { style: { fontSize: '22px' } }, '🎨'),
            e('div', null,
              e('h2', { style: S.headerTitle }, 'Symbol Studio'),
              e('p', { style: S.headerSub }, 'AI-generated PCS-style icons for visual supports, AAC boards & schedules')
            )
          ),
          e('button', { onClick: onClose, style: S.closeBtn, 'aria-label': 'Close Symbol Studio' }, '×')
        ),
        // Body
        e('div', { style: S.body },
          // Left panel
          e('div', { style: S.leftPanel },
            // Mode toggle
            e('div', { style: S.modeToggle },
              modeBtn('single', '✏️', 'Single'),
              modeBtn('batch', '📋', 'Batch')
            ),
            // Single inputs
            mode === 'single' && e('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
              e('div', null,
                e('label', { style: S.label }, 'Concept / Label'),
                e('input', {
                  type: 'text', value: label,
                  onChange: function (ev) { setLabel(ev.target.value); },
                  onKeyDown: function (ev) { if (ev.key === 'Enter') generateSingle(); },
                  placeholder: 'e.g. boy washing hands',
                  style: S.input, autoFocus: true
                })
              ),
              e('div', null,
                e('label', { style: S.label }, 'Context (optional)'),
                e('input', {
                  type: 'text', value: description,
                  onChange: function (ev) { setDescription(ev.target.value); },
                  placeholder: 'e.g. morning hygiene routine',
                  style: S.input
                })
              )
            ),
            // Batch input
            mode === 'batch' && e('div', null,
              e('label', { style: S.label }, 'One label per line'),
              e('textarea', {
                value: batchText,
                onChange: function (ev) { setBatchText(ev.target.value); },
                placeholder: 'brush teeth\nget dressed\neat breakfast\nboard the bus',
                style: S.textarea
              }),
              e('p', { style: { fontSize: '10px', color: '#94a3b8', margin: '2px 0 0' } }, batchText.split('\n').filter(function (l) { return l.trim(); }).length + ' symbol(s) queued')
            ),
            // Style selector
            e('div', null,
              e('label', { style: S.label }, 'Art Style'),
              e('select', { value: style, onChange: function (ev) { setStyle(ev.target.value); }, style: S.select },
                STYLE_OPTIONS.map(function (opt) { return e('option', { key: opt.value, value: opt.value }, opt.label); })
              )
            ),
            // Auto-clean toggle
            e('label', { style: { display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', fontSize: '12px', color: '#475569' } },
              e('input', { type: 'checkbox', checked: autoClean, onChange: function (ev) { setAutoClean(ev.target.checked); } }),
              e('span', null, 'Auto-clean text from image')
            ),
            e('p', { style: { fontSize: '10px', color: '#94a3b8', margin: '-4px 0 0' } }, 'Passes image through AI to remove any embedded labels'),
            // Generate button
            e('button', {
              onClick: mode === 'single' ? generateSingle : generateBatch,
              disabled: isAnyLoading || (mode === 'single' ? !label.trim() : !batchText.trim()),
              style: S.generateBtn(isAnyLoading || (mode === 'single' ? !label.trim() : !batchText.trim()))
            }, isAnyLoading ? '⏳ Generating...' : (mode === 'single' ? '✨ Generate Symbol' : '✨ Generate Batch')),
            // Gallery count hint
            gallery.length > 0 && e('p', { style: { fontSize: '11px', color: '#94a3b8', textAlign: 'center', margin: 0 } }, gallery.length + ' symbol' + (gallery.length !== 1 ? 's' : '') + ' saved')
          ),
          // Right panel
          e('div', { style: S.rightPanel },
            previewSection,
            gallerySection
          )
        )
      )
    );
  });

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.SymbolStudio = SymbolStudio;
  debugLog("SymbolStudio loaded and registered");
})();
