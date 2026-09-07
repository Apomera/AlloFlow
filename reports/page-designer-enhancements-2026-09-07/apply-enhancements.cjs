const fs=require('fs'),{parse}=require('@babel/parser'),traverse=require('@babel/traverse').default;
const file='studio_module.js';let s=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
function rep(a,b){if(!s.includes(a))throw Error('Missing anchor: '+a.slice(0,100));s=s.replace(a,b);}
function astEdit(find,build){let node;traverse(parse(s),{enter(p){if(find(p.node))node=p.node;}});if(!node)throw Error('AST target missing');const text=n=>s.slice(n.start,n.end);s=s.slice(0,node.start)+build(node,text)+s.slice(node.end);}
// Put content controls before secondary layout/actions; keep every existing handler.
astEdit(n=>n.type==='AssignmentExpression'&&n.left.name==='propPanel'&&n.right.type==='CallExpression', (n,text)=>{
const a=n.right.arguments.map(text);if(a.length!==20)throw Error('Properties shape changed');
return 'propPanel = h('+[a[0],a[1],a[2],a[12],a[13],a[14],a[15],a[16],a[17],a[18],a[11],a[3],a[4],a[6],a[19],
"h('details', { style: { borderTop: '1px solid ' + C.border, paddingTop: '8px' } }, h('summary', { style: { cursor: 'pointer', fontWeight: 800, padding: '6px 0' } }, TT('studio.layout_more', 'Layout and position')), h('div', { style: { display: 'grid', gap: '6px', paddingTop: '8px' } }, "+[a[7],a[9],a[10]].join(', ')+'))'].join(',\n        ')+')';});
// Group exports by what the recipient needs; keep the detailed checks available.
astEdit(n=>n.type==='ConditionalExpression'&&n.test.name==='exportOpen',(n,text)=>{
const a=n.consequent.arguments.map(text);if(a.length!==16)throw Error('Export shape changed');
const group=(key,label,items)=>"h('fieldset', { style: { border: '1px solid ' + C.exportBorder, borderRadius: '8px', margin: 0, padding: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px', flex: '1 1 220px' } }, h('legend', { style: { fontSize: '12px', fontWeight: 800 } }, TT('studio."+key+"', '"+label+"')), "+items.join(', ')+')';
return "exportOpen ? h('section', { 'aria-label': TT('studio.export_choices', 'Export choices'), style: { padding: '10px 14px', background: C.exportBg, color: C.text, borderBottom: '1px solid ' + C.exportBorder, display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '38dvh', overflowY: 'auto', flexShrink: 0 } }, "+[
group('export_share_group','Share an accessible document',[a[4],a[5]]),group('export_print_group','Print or share an image',[a[8],a[7]]),group('export_edit_group','Edit elsewhere',[a[6],"h('button', { style: S.tool, onClick: saveDoc }, TT('studio.download_project', 'Download project'))"]),
"h('details', { style: { flex: '1 1 100%' } }, h('summary', { style: { cursor: 'pointer', fontWeight: 700, padding: '6px 0' } }, TT('studio.export_advanced', 'Worksheet and teacher files')), h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px', paddingTop: '6px' } }, "+a.slice(9,15).join(', ')+'))',a[15],
"h('details', { style: { flex: '1 1 100%' } }, h('summary', { style: { cursor: 'pointer', fontWeight: 700, padding: '6px 0' } }, TT('studio.export_review_details', 'Format guidance and review details')), "+a[2]+', '+a[3]+')'
].join(',\n          ')+') : null';});
// Header keeps title, undo, status and export visible; less frequent commands live in More.
astEdit(n=>n.type==='CallExpression'&&n.callee.name==='h'&&n.arguments[1]?.type==='ObjectExpression'&&n.arguments[1].properties.some(p=>p.key.name==='style'&&p.value.type==='MemberExpression'&&p.value.object.name==='S'&&p.value.property.name==='header')&&n.arguments.some(a=>s.slice(a.start,a.end).includes("key: 'title-'")),(n,text)=>{
const a=n.arguments.map(text);if(a.length!==19)throw Error('Header shape changed');
const more="h('details', { ref: headerMoreRef, style: { position: 'relative' }, onKeyDown: function (e) { if (e.key === 'Escape' && e.currentTarget.open) { e.preventDefault(); e.stopPropagation(); e.currentTarget.open = false; e.currentTarget.querySelector('summary').focus(); } } }, h('summary', { style: Object.assign({}, S.hBtn, { display: 'flex', alignItems: 'center', listStyle: 'none' }) }, TT('studio.more_actions', 'More')), h('div', { style: { position: layout.stacked ? 'fixed' : 'absolute', top: layout.stacked ? '110px' : '100%', left: layout.stacked ? '16px' : 0, right: layout.stacked ? '16px' : 'auto', width: layout.stacked ? 'auto' : '240px', maxHeight: '60dvh', overflowY: 'auto', padding: '10px', zIndex: 100, display: 'grid', gap: '6px', background: C.headerBg, border: '1px solid ' + C.hBtnBorder, borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,.3)' }, onClick: function (e) { if (e.target.closest('button')) { headerMoreRef.current.open = false; } } }, "+a.slice(5,12).concat([a[16], 'layout.stacked ? '+a[15]+' : null']).join(', ')+'))';
return "h('div', { style: S.header }, "+[a[2],a[3],a[4],more,a[12],a[13],a[14],"h('span', { role: 'status', 'aria-live': 'polite', style: { color: saveState === 'error' ? '#fca5a5' : C.headerText, fontSize: '11px', flex: layout.stacked ? '1 1 100px' : '0 1 150px' } }, saveState === 'error' ? TT('studio.recovery_failed', 'Could not save on this device') : saveState === 'saved' ? TT('studio.recovery_saved', 'Saved on this device') : saveState === 'saving' ? TT('studio.recovery_saving', 'Saving changes...') : TT('studio.recovery_ready', 'Ready'))",'!layout.stacked ? '+a[15]+' : null',a[17],a[18]].join(',\n          ')+')';});
rep("var s = t(k); return s || fb;", "var s = t(k); return s && s !== k ? s : fb;");
rep("    var _canvasZoom = React.useState(null);", `    var _fitMode = React.useState('page'); var fitMode = _fitMode[0], setFitMode = _fitMode[1];
    var _canvasSize = React.useState(null); var canvasSize = _canvasSize[0], setCanvasSize = _canvasSize[1];
    var _mobilePanel = React.useState('canvas'); var mobilePanel = _mobilePanel[0], setMobilePanel = _mobilePanel[1];
    var _inspectorTab = React.useState('properties'); var inspectorTab = _inspectorTab[0], setInspectorTab = _inspectorTab[1];
    var _reviewOverlays = React.useState(false); var reviewOverlays = _reviewOverlays[0], setReviewOverlays = _reviewOverlays[1];
    var _saveState = React.useState('ready'); var saveState = _saveState[0], setSaveState = _saveState[1];
    var headerMoreRef = React.useRef(null);
    var inspectorRef = React.useRef(null);
    var _canvasZoom = React.useState(null);`);
const autoStart=s.indexOf('    // Autosave: debounced snapshot');const autoEnd=s.indexOf('    // In-editor crop:',autoStart);
if(autoStart<0||autoEnd<0)throw Error('Autosave block missing');
s=s.slice(0,autoStart)+`    // Recovery follows document edits, not unrelated panel/selection renders.
    var flushRecovery = React.useCallback(function (updateUi) {
      var liveDoc = _docRef.current;
      if (!liveDoc) return { ok: true };
      var result = stWriteAutosave(liveDoc, Date.now());
      if (updateUi !== false) setSaveState(result.ok ? 'saved' : 'error');
      return result;
    }, []);
    var commitFocusedField = React.useCallback(function () {
      var active = document.activeElement;
      if (active && _shellRef.current && _shellRef.current.contains(active) && /^(INPUT|TEXTAREA)$/.test(active.tagName)) active.blur();
    }, []);
    var requestClose = function () {
      commitFocusedField();
      if (!flushRecovery().ok) {
        addToast(TT('studio.recovery_close_failed', 'Your latest changes could not be saved on this device. Download a project copy before leaving.'), 'error');
        return;
      }
      if (typeof props.onClose === 'function') props.onClose();
    };
    React.useEffect(function () {
      if (!_docRef.current) return undefined;
      setSaveState('saving');
      var timer = setTimeout(function () { flushRecovery(); }, 4000);
      return function () { clearTimeout(timer); };
    }, [_tick[0], flushRecovery]);
    React.useEffect(function () {
      var flush = function () { commitFocusedField(); flushRecovery(false); };
      var onVisibility = function () { if (document.visibilityState === 'hidden') flush(); };
      window.addEventListener('pagehide', flush);
      document.addEventListener('visibilitychange', onVisibility);
      return function () {
        window.removeEventListener('pagehide', flush);
        document.removeEventListener('visibilitychange', onVisibility);
        flushRecovery(false);
      };
    }, [flushRecovery, commitFocusedField]);
`+s.slice(autoEnd);
// Replace existing close sites only (leave the requestClose implementation itself).
s=s.replaceAll('onClick: props.onClose','onClick: requestClose');
s=s.replace("if (ev.key === 'Escape') { ev.preventDefault(); if (typeof props.onClose === 'function') props.onClose(); }", "if (ev.key === 'Escape') { ev.preventDefault(); requestClose(); }");
rep("        if (typeof props.onClose === 'function') props.onClose();\n        return;", "        if (exportOpen) { setExportOpen(false); return; }\n        if (preflightOpen) { setPreflightOpen(false); return; }\n        if (layout.stacked && mobilePanel !== 'canvas') { setMobilePanel('canvas'); return; }\n        requestClose();\n        return;");
rep("      stClearAutosave(); // the work is saved — don't offer a stale \"unsaved work\" restore", "      flushRecovery(); // Retain recovery until the browser's download is safely in the user's hands.");
rep("TT('studio.saved', '💾 Saved. The file includes your full process history — it stays on this device.')", "TT('studio.project_download_started', 'Project download started. Keep this file to reopen and edit your design, including its process history.')");
// An actual viewport fit has separate page and width modes.
rep('  function stSelectionZoomScale(bounds, canvas, viewport, padding) {', `  function stCanvasViewportFitScale(canvas, viewport, mode) {
    var width = Math.max(1, stFiniteNumber(viewport && viewport.w, 640) - 16);
    var height = Math.max(1, stFiniteNumber(viewport && viewport.h, 480) - 16);
    var widthScale = width / Math.max(1, stFiniteNumber(canvas && canvas.w, 816));
    var heightScale = height / Math.max(1, stFiniteNumber(canvas && canvas.h, 1056));
    return Math.max(0.01, Math.min(1.5, mode === 'width' ? widthScale : Math.min(widthScale, heightScale)));
  }

  function stSelectionZoomScale(bounds, canvas, viewport, padding) {`);
rep('    var fitScale = doc ? stCanvasFitScale(doc.canvas, layout, viewport) : layout.canvasScale;', `    React.useEffect(function () {
      var node = canvasViewportRef.current;
      if (!node || view !== 'edit') return undefined;
      var measure = function () {
        var w = node.clientWidth, h = node.clientHeight;
        if (w > 0 && h > 0) setCanvasSize(function (prior) { return prior && prior.w === w && prior.h === h ? prior : { w: w, h: h }; });
      };
      measure();
      var observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
      if (observer) observer.observe(node);
      window.addEventListener('resize', measure);
      return function () { if (observer) observer.disconnect(); window.removeEventListener('resize', measure); };
    }, [view, layout.stacked, mobilePanel, exportOpen, preflightOpen, fullscreen]);
    var fitScale = doc ? (canvasSize ? stCanvasViewportFitScale(doc.canvas, canvasSize, fitMode) : stCanvasFitScale(doc.canvas, layout, viewport)) : layout.canvasScale;`);
rep("    var changeCanvasZoom = function (action) {\n      setCanvasZoom", "    var changeCanvasZoom = function (action) {\n      if (action === 'fit' || action === 'fit-width') { setFitMode(action === 'fit-width' ? 'width' : 'page'); setCanvasZoom(null); return; }\n      setCanvasZoom");
rep('  AlloStudio.stCanvasFitScale = stCanvasFitScale;', '  AlloStudio.stCanvasFitScale = stCanvasFitScale;\n  AlloStudio.stCanvasViewportFitScale = stCanvasViewportFitScale;');
rep("var selectOnly = function (id) { setSelectedId(id || null); setSelectedIds(id ? [id] : []); };", "var selectOnly = function (id) { setSelectedId(id || null); setSelectedIds(id ? [id] : []); if (id) { setInspectorTab('properties'); if (layout.stacked) setMobilePanel('properties'); if (inspectorRef.current) inspectorRef.current.scrollTop = 0; } };");
// All selected surfaces explicitly define their foreground, including header buttons.
s=s.replace(/background: C\.selectedBg(?!, color: C\.text)/g, 'background: C.selectedBg, color: C.text');
rep("readingIndex ? hh('span', { 'aria-hidden': true", "reviewOverlays && readingIndex ? hh('span', { 'aria-hidden': true");
rep("'aria-pressed': canvasZoom === null }, TT('studio.zoom_fit', 'Fit'))", "'aria-pressed': canvasZoom === null && fitMode === 'page' }, TT('studio.zoom_fit_page', 'Fit page'))");
// Fit button's visual state also distinguishes width mode.
s=s.replace("canvasZoom === null ? { border:","canvasZoom === null && fitMode === 'page' ? { border:");
rep("              h('button', { style: Object.assign({}, S.hBtn, canvasZoom === 1", "              h('button', { style: Object.assign({}, S.hBtn, canvasZoom === null && fitMode === 'width' ? { background: C.selectedBg, color: C.text } : null), onClick: function () { changeCanvasZoom('fit-width'); }, 'aria-pressed': canvasZoom === null && fitMode === 'width' }, TT('studio.zoom_fit_width', 'Fit width')),\n              h('button', { style: Object.assign({}, S.hBtn, canvasZoom === 1");
rep("TT('studio.snap_guides', 'Snap'))),", "TT('studio.snap_guides', 'Snap')),\n              h('button', { style: Object.assign({}, S.hBtn, reviewOverlays ? { background: C.selectedBg, color: C.text } : null), 'aria-pressed': reviewOverlays, onClick: function () { setReviewOverlays(!reviewOverlays); }, title: TT('studio.review_overlays_hint', 'Show or hide reading-order numbers without changing the document') }, TT('studio.review_overlays', 'Order numbers'))),");
// Clear labels with fallback for untranslated new keys.
s=s.replaceAll("TT('studio.save', 'Save')", "TT('studio.download_project', 'Download project')");
s=s.replaceAll("TT('studio.template_favorited', 'Saved')", "TT('studio.template_favorited_label', 'Favorited')");
s=s.replaceAll("TT('studio.template_favorite', 'Save')", "TT('studio.template_favorite_label', 'Favorite')");
s=s.replaceAll("TT('studio.templates_favorites', 'Saved')", "TT('studio.templates_favorites_label', 'Favorites')");
s=s.replaceAll("TT('studio.portfolio', 'Portfolio')", "TT('studio.add_portfolio', 'Add to portfolio')");
s=s.replaceAll("TT('studio.save_portfolio', 'Save to Portfolio')", "TT('studio.add_portfolio', 'Add to portfolio')");
// Responsive canvas-first panels and distinct inspector tabs.
rep("canvasWrap: { flex: 1, minHeight: layout.stacked ? '260px' : 0", "canvasWrap: { flex: 1, order: layout.stacked ? 0 : undefined, minHeight: 0");
rep("canvasViewport: { flex: 1, minHeight: 0", "canvasViewport: { flex: 1, minHeight: 0");
rep("      body: { flex: 1, display: 'flex', flexDirection: layout.stacked ? 'column' : 'row', minHeight: 0, overflow: layout.stacked ? 'auto' : 'hidden' },", "      body: { flex: 1, display: 'flex', flexDirection: layout.stacked ? 'column' : 'row', minHeight: 0, overflow: 'hidden' },");
rep("      readingList: { display: 'flex'", "      readingList: { display: 'flex'");
rep("    // Fullscreen: edge-to-edge", `    if (layout.stacked) {
      S.panel = Object.assign({}, S.panel, { display: mobilePanel === 'insert' ? 'flex' : 'none', order: 1, maxHeight: '34dvh', minHeight: 0 });
      S.rpanel = Object.assign({}, S.rpanel, { display: mobilePanel === 'properties' || mobilePanel === 'objects' ? 'flex' : 'none', order: 1, maxHeight: '38dvh', minHeight: 0 });
      S.titleInput = Object.assign({}, S.titleInput, { width: 'auto', flex: '1 1 120px', minWidth: 0 });
      S.header = Object.assign({}, S.header, { flexShrink: 0 });
    }
    // Fullscreen: edge-to-edge`);
rep("        // body\n        h('div', { style: S.body },", `        saveState === 'error' ? h('div', { role: 'alert', style: { padding: '10px', color: errorTone.fg, background: errorTone.bg, flexShrink: 0, display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' } },
          h('span', null, TT('studio.recovery_help', 'Device recovery is unavailable. Download a project copy before leaving.')),
          h('button', { style: S.tool, onClick: function () { commitFocusedField(); flushRecovery(); } }, TT('studio.retry_save', 'Retry save')),
          h('button', { style: S.tool, onClick: saveDoc }, TT('studio.download_project', 'Download project')),
          h('button', { style: S.tool, onClick: function () { if (typeof props.onClose === 'function') props.onClose(); } }, TT('studio.close_without_copy', 'Close without a device copy'))) : null,
        layout.stacked ? h('div', { role: 'group', 'aria-label': TT('studio.workspace_panels', 'Workspace panels'), style: { display: 'flex', gap: '6px', padding: '6px 10px', flexShrink: 0, background: C.panel, borderBottom: '1px solid ' + C.border } },
          [['canvas', TT('studio.canvas', 'Canvas')], ['insert', TT('studio.insert', 'Insert')], ['properties', TT('studio.properties', 'Properties')], ['objects', TT('studio.objects', 'Objects')]].map(function (item) {
            return h('button', { key: item[0], style: Object.assign({}, S.tool, { flex: 1, textAlign: 'center', padding: '6px 4px' }, mobilePanel === item[0] ? { background: C.selectedBg, color: C.text, borderColor: C.accent } : null), 'aria-pressed': mobilePanel === item[0], onClick: function () { setMobilePanel(item[0]); if (item[0] === 'properties' || item[0] === 'objects') setInspectorTab(item[0]); } }, item[1]);
          })) : null,
        // body
        h('div', { style: S.body },`);
rep("          h('div', { style: S.rpanel },\n            h('div', { style: S.label }, '🔊 '", `          h('div', { ref: inspectorRef, style: S.rpanel },
            h('div', { role: 'group', 'aria-label': TT('studio.inspector_tabs', 'Inspector view'), style: { display: 'flex', gap: '6px', flexShrink: 0 } },
              [['properties', TT('studio.properties', 'Properties')], ['objects', TT('studio.objects', 'Objects')]].map(function (item) { return h('button', { key: item[0], style: Object.assign({}, S.tool, { flex: 1, textAlign: 'center' }, inspectorTab === item[0] ? { background: C.selectedBg, color: C.text, borderColor: C.accent } : null), 'aria-pressed': inspectorTab === item[0], onClick: function () { setInspectorTab(item[0]); if (layout.stacked) setMobilePanel(item[0]); } }, item[1]); })),
            inspectorTab === 'properties' ? (propPanel || h('p', { style: { color: C.muted, fontSize: '12px' } }, TT('studio.select_for_properties', 'Select text, an image, or a shape on the page to edit it. Use Objects to find items in the design.'))) : null,
            h('div', { style: { display: inspectorTab === 'objects' ? 'flex' : 'none', flexDirection: 'column', gap: '8px', minHeight: 0 } },
            h('div', { style: S.label }, '🔊 '`);
rep("            propPanel || h('p', { style: { fontSize: '11px', color: C.soft } }, TT('studio.no_selection', 'Select an object on the canvas (or in the list above) to edit its properties.')))),", "            h('p', { style: { fontSize: '11px', color: C.muted } }, TT('studio.object_properties_hint', 'Choose an object to open its properties.'))))),");
// Summaries participate in the dialog's keyboard loop.
s=s.replaceAll("a[href], [tabindex]:not([tabindex=\"-1\"])", "a[href], summary, [tabindex]:not([tabindex=\"-1\"])");
parse(s);fs.writeFileSync(file,s);fs.copyFileSync(file,'desktop/web-app/public/studio_module.js');console.log('Page Designer enhancements applied and mirrored.');
