const fs=require('fs');
const replacements=[
["      const iframe = exportPreviewRef.current;\n      const doc = iframe && (iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document));\n      if (!doc || !doc.body || !doc.documentElement) return;", "      const iframe = exportPreviewRef.current;\n      try { iframe?.__alloBuilderFlushDraft?.(); } catch (_) {}\n      const doc = iframe && (iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document));\n      if (!doc || !doc.body || !doc.documentElement) return;"],
["      _syncBuilderEditsToRemediation();\n      if (isCanvas)", "      _syncBuilderEditsToRemediation();\n      _builderDraftOwnerRef.current = null;\n      if (isCanvas)"],
["  const getBuilderGuidedDeliveryContext = () => {",String.raw`  // A distinct owner object fences every open document/mode/History generation.
  // Delayed iframe work must not adopt a newer owner's project attribution.
  const _builderDraftOwnerRef = React.useRef(null);
  const _builderDraftHistorySignature = showExportPreview && exportPreviewSource === 'history' ? _getBuilderHistorySignature() : null;
  const _builderDraftOwnerKey = showExportPreview ? JSON.stringify([exportPreviewSource, exportPreviewMode,
    _builderDraftHistorySignature, builderResourceIds, exportPreviewSource === 'remediation' ? pdfDocumentEpochLive : null]) : null;
  if (!_builderDraftOwnerKey) _builderDraftOwnerRef.current = null;
  else if (_builderDraftOwnerRef.current?.key !== _builderDraftOwnerKey) _builderDraftOwnerRef.current = {
    key: _builderDraftOwnerKey, source: exportPreviewSource, mode: exportPreviewMode,
    historySignature: _builderDraftHistorySignature, resourceIds: builderResourceIds,
  };
  const _captureBuilderDraft = (html, capture) => {
    const owner = capture?.owner;
    const doc = capture?.doc;
    if (!owner || owner !== _builderDraftOwnerRef.current || !showExportPreview
      || exportPreviewRef.current?.contentDocument !== doc || !doc?.body
      || doc.__alloBuilderCaptureToken !== capture.token || typeof html !== 'string' || !html.trim()) return false;
    if (owner.source === 'history') window.__alloBuilderEditedPack = {
      html, at: Date.now(), source: 'history', historySignature: owner.historySignature, resourceIds: owner.resourceIds,
    };
    return true;
  };
  const getBuilderGuidedDeliveryContext = () => {`],
["          exportPreviewSource, builderWorkspaceMode, setBuilderWorkspaceMode,", "          exportPreviewSource, builderWorkspaceMode, setBuilderWorkspaceMode,\n          builderDraftOwner: _builderDraftOwnerRef.current, onBuilderDraftCapture: _captureBuilderDraft,"],
];
for(const file of ['AlloFlowANTI.txt','desktop/web-app/src/AlloFlowANTI.txt','desktop/web-app/src/App.jsx']){
 const original=fs.readFileSync(file,'utf8'),nl=original.includes('\r\n')?'\r\n':'\n';let text=original.replace(/\r\n/g,'\n');
 for(const [before,after]of replacements){if(text.split(before).length!==2)throw Error(file+'missing/nonunique:'+before.slice(0,100));text=text.replace(before,after)}
 const tmp=file+'.builder-draft-'+process.pid+'.tmp';fs.writeFileSync(tmp,text.replace(/\n/g,nl));if(fs.readFileSync(file,'utf8')!==original){fs.unlinkSync(tmp);throw Error('Concurrent change:'+file)}fs.renameSync(tmp,file);console.log('Patched '+file);
}
