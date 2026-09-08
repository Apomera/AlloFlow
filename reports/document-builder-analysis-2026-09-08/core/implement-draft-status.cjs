const fs=require('fs'),file='view_export_preview_source.jsx',original=fs.readFileSync(file,'utf8'),nl=original.includes('\r\n')?'\r\n':'\n';let s=original.replace(/\r\n/g,'\n');
const changes=[
["  const draftDocumentTitle = String((exportConfig &&", "  const draftDocumentTitle = String(previewDocumentTitle || (exportConfig &&"],
["    const capturedAt = Date.now();\n    const clean = getCleanBuilderDocument();\n    if (!clean?.html) return false;\n    if (typeof onBuilderDraftCapture === 'function'\n      && onBuilderDraftCapture(clean.html, { doc, token, owner: builderDraftOwner }) === false) return false;\n    const savedLocally = persistLocalDraft(clean.html, capturedAt, label);\n    setDraftCaptureAt(capturedAt);\n    setDraftCaptureState(savedLocally ? 'saved' : 'captured');\n    return true;",String.raw`    try {
      const capturedAt = Date.now();
      const clean = getCleanBuilderDocument();
      if (!clean?.html || (typeof onBuilderDraftCapture === 'function'
        && onBuilderDraftCapture(clean.html, { doc, token, owner: builderDraftOwner }) === false)) {
        setDraftCaptureState('error');
        return false;
      }
      const savedLocally = persistLocalDraft(clean.html, capturedAt, label);
      setDraftCaptureAt(capturedAt);
      setDraftCaptureState(savedLocally ? 'saved' : 'captured');
      return true;
    } catch (_) {
      setDraftCaptureState('error');
      return false;
    }`],
["  if (!snapshots.length) snapshots.push({ id: `legacy-${currentAt}`, at: currentAt, label: 'Recovered draft', html: candidate.html });", "  if (!snapshots.length) snapshots.push({ id: `legacy-${currentAt}`, at: currentAt, label: 'Recovered draft', html: candidate.html, ...(identity ? { sourceIdentity: identity } : {}) });"],
["      draftCaptureLatestRef.current?.(doc, 'Restored draft', draftContext);\n      setDraftCaptureState('restored');\n      setDraftCaptureAt(Date.now());", "      const captured = draftCaptureLatestRef.current?.(doc, 'Restored draft', draftContext);\n      setDraftCaptureState(captured ? 'restored' : 'error');\n      if (captured) setDraftCaptureAt(Date.now());"],
["      if (mountedRef.current) setDraftCaptureState('restored');", "      if (mountedRef.current && captured) setDraftCaptureState('restored');"],
["                        setDraftCaptureState('ready');\n                        editorSelectionRangeRef", "                        if (doc.body?.getAttribute('data-allo-user-edited') !== '1') {\n                          setDraftCaptureState('ready');\n                          setDraftCaptureAt(null);\n                        }\n                        editorSelectionRangeRef"],
["{draftCaptureState === 'capturing' ? 'Capturing changes…' : draftCaptureState === 'saved' ? 'Saved on this device' : draftCaptureState === 'restored' ? 'Local draft restored' : draftCaptureState === 'captured' ? 'Draft captured in this session' : 'Ready'}", "{_builderSaveStatusLabel(draftCaptureState, draftCaptureAt)}"],
];for(const[b,a]of changes){if(s.split(b).length!==2)throw Error('Missing/nonunique:'+b.slice(0,110));s=s.replace(b,a)}const tmp=file+'.builder-status-'+process.pid+'.tmp';fs.writeFileSync(tmp,s.replace(/\n/g,nl));if(fs.readFileSync(file,'utf8')!==original)throw Error('Concurrent edit');fs.renameSync(tmp,file);console.log('Capture status followups applied');
