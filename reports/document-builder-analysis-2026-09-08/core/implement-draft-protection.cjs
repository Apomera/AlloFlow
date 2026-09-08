const fs=require('fs');
const edits=[];
function edit(file, replacements){const original=fs.readFileSync(file,'utf8');const nl=original.includes('\r\n')?'\r\n':'\n';let text=original.replace(/\r\n/g,'\n');for(const [before,after] of replacements){if(text.split(before).length!==2)throw Error(file+' nonunique/missing patch '+before.slice(0,100));text=text.replace(before,after);}if(fs.readFileSync(file,'utf8')!==original)throw Error('Concurrent change: '+file);fs.writeFileSync(file,text.replace(/\n/g,nl));edits.push(file);}
const helpers=String.raw`function _builderDraftContext({ source, mode, history, resourceIds, documentDigest }) {
  const kind = source === 'remediation' ? 'remediation' : 'history';
  const digest = typeof documentDigest === 'string' ? documentDigest.trim() : '';
  // A filename or extracted text cannot distinguish two different source assets.
  if (kind === 'remediation' && !digest) return null;
  try {
    return JSON.stringify({ version: 3, source: kind, mode: mode || 'print',
      resourceIds: kind === 'history' && Array.isArray(resourceIds) ? resourceIds : null,
      document: kind === 'remediation' ? digest : (Array.isArray(history) ? history : []) });
  } catch (_) { return null; }
}
async function _builderDraftIdentity(context, cryptoApi = globalThis.crypto) {
  if (typeof context !== 'string' || !context || !cryptoApi?.subtle?.digest) return null;
  try {
    const digest = await cryptoApi.subtle.digest('SHA-256', new TextEncoder().encode(context));
    const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    return hash.length === 64 ? 'alloflow-builder-draft-v3:' + hash : null;
  } catch (_) { return null; }
}
function _builderCreateDraftCapture({ capture, isCurrent, schedule = setTimeout, unschedule = clearTimeout }) {
  let timer = null;
  let cancelled = false;
  const clear = () => { if (timer !== null) unschedule(timer); timer = null; };
  const flush = () => {
    clear();
    if (cancelled || !isCurrent()) return false;
    return capture();
  };
  return {
    schedule() { clear(); if (!cancelled && isCurrent()) timer = schedule(flush, 800); },
    flush,
    cancel() { cancelled = true; clear(); },
  };
}

`;
edit('view_export_preview_source.jsx',[
["    entries,\n    headings:","    entries,\n    revision: doc.body.innerHTML,\n    headings:"],
["    _builderFinalizeDocumentForExport(doc);\n    doc.querySelectorAll('.allo-block-controls", "    _builderFinalizeDocumentForExport(doc);\n    doc.querySelectorAll('[data-allo-semantic-selected]').forEach(node => node.removeAttribute('data-allo-semantic-selected'));\n    doc.querySelectorAll('.allo-block-controls"],
["    changed: added + removed + modified,\n    excerpts,", "    changed: added + removed + modified,\n    comparedBefore: rows, comparedAfter: columns,\n    totalBefore: beforeBlocks.length, totalAfter: afterBlocks.length,\n    contentWindowTruncated: beforeBlocks.length > limit || afterBlocks.length > limit,\n    excerptWindowTruncated: added + removed + modified > excerpts.length,\n    excerpts,"],
["    beforeTag: Number.isInteger(excerpt.beforeIndex)","    sourceRevision: before.revision, targetRevision: after.revision,\n    beforeHtml: before.entries[excerpt.beforeIndex]?.html || '',\n    afterHtml: after.entries[excerpt.afterIndex]?.html || '',\n    beforeTag: Number.isInteger(excerpt.beforeIndex)"],
["  const snapshotDocument = _builderPrepareComparableDocument(snapshotHtml, currentDocument);\n  const sourceBlock =",String.raw`  const before = _builderComparableDocument(snapshotHtml, currentDocument);
  const after = _builderComparableDocument(currentDocument, currentDocument);
  const stale = () => ({ ok: false, reason: 'stale-comparison', error: 'The document or saved version changed. Compare again before restoring a block.' });
  if (!before || !after || typeof excerpt.targetRevision !== 'string'
    || excerpt.sourceRevision !== before.revision || excerpt.targetRevision !== after.revision
    || before.entries[beforeIndex]?.html !== excerpt.beforeHtml || after.entries[afterIndex]?.html !== excerpt.afterHtml) return stale();
  if (before.entries.filter(entry => entry.html === excerpt.beforeHtml).length !== 1
    || after.entries.filter(entry => entry.html === excerpt.afterHtml).length !== 1) {
    return { ok: false, reason: 'ambiguous-block', error: 'This block is not unique. Restore the full version or edit the intended block directly.' };
  }
  const snapshotDocument = _builderPrepareComparableDocument(snapshotHtml, currentDocument);
  const sourceBlock =`],
["  const replacement = currentDocument.importNode(sourceBlock, true);",String.raw`  // The finalized comparison can omit pending deletions. Confirm the live index
  // still names the exact compared block before any mutation, including table cells.
  const targetWrapper = currentDocument.createElement('div');
  targetWrapper.appendChild(targetBlock.cloneNode(true));
  _builderFinalizeDocumentForExport(targetWrapper);
  targetWrapper.querySelectorAll('[data-allo-semantic-selected]').forEach(node => node.removeAttribute('data-allo-semantic-selected'));
  targetWrapper.querySelectorAll('.allo-block-controls,.allo-block-remove,.a11y-inspect-badge,[data-allo-crop-ui],script,style').forEach(node => node.remove());
  if (targetWrapper.firstElementChild?.outerHTML !== excerpt.afterHtml) return stale();
  const replacement = currentDocument.importNode(sourceBlock, true);`],
["function _normalizeBuilderLocalDraft(candidate) {",helpers+"function _normalizeBuilderLocalDraft(candidate, identity = null) {"],
["  const currentAt = Number(candidate.at) || Date.now();", "  if (identity && (candidate.version !== 3 || candidate.sourceIdentity !== identity)) return null;\n  const currentAt = Number(candidate.at) || Date.now();"],
["  return { ...candidate, version: 2, at: currentAt, snapshots };", "  return { ...candidate, version: identity ? 3 : 2, at: currentAt, snapshots };"],
["    builderResourceIds = null,", "    builderResourceIds = null, builderDraftOwner = null, onBuilderDraftCapture,"],
["  const [draftCaptureState, setDraftCaptureState] = React.useState('ready');", "  const [draftCaptureState, setDraftCaptureState] = React.useState('ready');\n  const [draftCaptureAt, setDraftCaptureAt] = React.useState(null);"],
["  const draftIdentitySeed = Array.isArray(history)\n    ? `${history.length}:${history[0]?.id || history[0]?.type || ''}:${history[history.length - 1]?.id || history[history.length - 1]?.type || ''}`\n    : 'empty';\n  const draftStorageKey = React.useMemo(() => `alloflow-builder-draft-v1:${encodeURIComponent([exportPreviewSource || 'generated', exportPreviewMode || 'print', draftDocumentTitle, draftIdentitySeed].join('|')).substring(0, 220)}`, [exportPreviewSource, exportPreviewMode, draftDocumentTitle, draftIdentitySeed]);",String.raw`  const draftContext = _builderDraftContext({ source: exportPreviewSource, mode: exportPreviewMode,
    history, resourceIds: builderResourceIds, documentDigest: pdfFixResult?.documentDigest });
  const [draftIdentityState, setDraftIdentityState] = React.useState(null);
  const draftStorageKey = draftIdentityState?.context === draftContext ? draftIdentityState.key : null;
  const draftCaptureRef = React.useRef(null);
  const draftCaptureLatestRef = React.useRef(null);
  const draftContextRef = React.useRef(draftContext);
  draftContextRef.current = draftContext;
  React.useEffect(() => {
    let current = true;
    _builderDraftIdentity(draftContext).then(key => { if (current) setDraftIdentityState({ context: draftContext, key }); });
    return () => { current = false; };
  }, [draftContext]);`],
["    mountedRef.current = false;\n    imageInsertRunRef.current", "    mountedRef.current = false;\n    draftCaptureRef.current?.cancel();\n    imageInsertRunRef.current"],
["      const rawDraft = window.localStorage.getItem(draftStorageKey);\n      return _normalizeBuilderLocalDraft(rawDraft ? JSON.parse(rawDraft) : null);", "      if (!draftStorageKey) return null;\n      const rawDraft = window.localStorage.getItem(draftStorageKey);\n      return _normalizeBuilderLocalDraft(rawDraft ? JSON.parse(rawDraft) : null, draftStorageKey);"],
["    if (typeof html !== 'string' || html.length < 100) return false;\n    try {\n      const existing = readLocalDraftStore();", "    if (!draftStorageKey || draftContextRef.current !== draftContext || typeof html !== 'string' || html.length < 100) return false;\n    try {\n      const existing = readLocalDraftStore();"],
["      const store = { version: 2, title: draftDocumentTitle, html, at, snapshots };", "      const store = { version: 3, sourceIdentity: draftStorageKey, source: exportPreviewSource, title: draftDocumentTitle, html, at, snapshots };"],
["      setVersionHistory(store.snapshots);\n      setDraftRecovery(null);", "      setVersionHistory(store.snapshots);\n      setDraftRecovery(null);\n      setDraftCaptureAt(at);"],
["  }, [readLocalDraftStore, draftStorageKey, draftDocumentTitle]);",String.raw`  }, [readLocalDraftStore, draftStorageKey, draftDocumentTitle, draftContext, exportPreviewSource]);

  const captureBuilderDraftDocument = React.useCallback((doc, label = 'Auto-save', context = draftContext, token = doc?.__alloBuilderCaptureToken) => {
    if (!mountedRef.current || !showExportPreview || draftContextRef.current !== context
      || exportPreviewRef.current?.contentDocument !== doc || !doc?.documentElement
      || doc.__alloBuilderCaptureToken !== token) return false;
    const capturedAt = Date.now();
    const clean = getCleanBuilderDocument();
    if (!clean?.html) return false;
    if (typeof onBuilderDraftCapture === 'function'
      && onBuilderDraftCapture(clean.html, { doc, token, owner: builderDraftOwner }) === false) return false;
    const savedLocally = persistLocalDraft(clean.html, capturedAt, label);
    setDraftCaptureAt(capturedAt);
    setDraftCaptureState(savedLocally ? 'saved' : 'captured');
    return true;
  }, [showExportPreview, draftContext, exportPreviewRef, getCleanBuilderDocument, onBuilderDraftCapture, builderDraftOwner, persistLocalDraft]);
  draftCaptureLatestRef.current = captureBuilderDraftDocument;`],
["    if (!showExportPreview) {\n      setDraftRecovery(null);\n      setVersionHistory([]);", "    if (!showExportPreview) {\n      draftCaptureRef.current?.cancel();\n      setDraftRecovery(null);\n      setVersionHistory([]);"],
["        if (!liveDoc?.body) return;\n        liveDoc.body.setAttribute('data-allo-user-edited', '1');\n        window.__alloBuilderEditedPack = { html: '<!DOCTYPE html>\\n' + liveDoc.documentElement.outerHTML, at: Date.now() };", "        if (!mountedRef.current || liveDoc !== doc || !liveDoc?.body || draftContextRef.current !== draftContext) return;\n        liveDoc.body.setAttribute('data-allo-user-edited', '1');\n        if (!draftCaptureLatestRef.current?.(liveDoc, 'Restored draft', draftContext)) return;"],
["  }, [exportPreviewRef, refreshDocumentStats, refreshReviewComments, refreshTrackedChanges, refreshActiveHeading, refreshPageMetrics, refreshFormattingState, addToast]);", "  }, [exportPreviewRef, draftContext, refreshDocumentStats, refreshReviewComments, refreshTrackedChanges, refreshActiveHeading, refreshPageMetrics, refreshFormattingState, addToast]);"],
["      : 'The current document matches that version.'", "      : 'The compared text matches that version; images, links and formatting are not compared.'"],
["                    <span>Saved {draftRecovery.at ? new Date(draftRecovery.at).toLocaleString() : 'recently'} on this device.</span>", "                    <span>{draftRecovery.title || draftDocumentTitle} · Saved {draftRecovery.at ? new Date(draftRecovery.at).toLocaleString() : 'recently'} on this device.</span>"],
["<h4 className=\"font-black\">Compared with {versionComparison.label}</h4>","<h4 className=\"font-black\">Text compared with {versionComparison.label}</h4>"],
["The current document matches this saved version.</p>","The compared text matches this saved version. Images, links and formatting are not compared.</p>"],
["                        {versionComparison.truncated && <p className=\"mt-1 text-violet-700\">Showing the first 24 changed blocks. The summary counts include the full comparison window.</p>}","                        {versionComparison.contentWindowTruncated && <p className=\"mt-1 text-violet-700\">Compared {versionComparison.comparedBefore} of {versionComparison.totalBefore} saved text blocks and {versionComparison.comparedAfter} of {versionComparison.totalAfter} current text blocks. Later blocks are not compared.</p>}\n                        {versionComparison.excerptWindowTruncated && <p className=\"mt-1 text-violet-700\">Showing the first 24 changed text blocks in the comparison window.</p>}\n                        <p className=\"mt-1 text-slate-600\">Text comparison excludes images, link destinations, formatting and other non-text changes.</p>"],
["                          window.__alloBuilderEditedPack = { html: '<!DOCTYPE html>\\n' + doc.documentElement.outerHTML, at: Date.now() };", "                          draftCaptureLatestRef.current?.(doc, 'Workbench edit');"],
["                        let _capT = null;\n                        const _captureEdits = () => {\n                          try {\n                            const capturedAt = Date.now();\n                            const liveHtml = '<!DOCTYPE html>\\n' + doc.documentElement.outerHTML;\n                            const clean = getCleanBuilderDocument();\n                            const fullHtml = clean?.html || liveHtml;\n                            window.__alloBuilderEditedPack = { html: fullHtml, at: capturedAt };\n                            const savedLocally = persistLocalDraft(fullHtml, capturedAt, 'Auto-save');\n                            if (mountedRef.current) {\n                              setDraftCaptureState(savedLocally ? 'saved' : 'captured');\n                            }\n                          } catch (_) {}\n                        };",String.raw`                        draftCaptureRef.current?.cancel();
                        const captureToken = {};
                        doc.__alloBuilderCaptureToken = captureToken;
                        const captureContext = draftContext;
                        const captureController = _builderCreateDraftCapture({
                          isCurrent: () => mountedRef.current && exportPreviewRef.current?.contentDocument === doc
                            && doc.__alloBuilderCaptureToken === captureToken && draftContextRef.current === captureContext,
                          capture: () => draftCaptureLatestRef.current?.(doc, 'Auto-save', captureContext, captureToken) || false,
                        });
                        draftCaptureRef.current = captureController;
                        exportPreviewRef.current.__alloBuilderFlushDraft = captureController.flush;`],
["                            if (_capT) clearTimeout(_capT);\n                            _capT = setTimeout(_captureEdits, 800);", "                            captureController.schedule();"],
]);
console.log('Patched '+edits.join(', '));
