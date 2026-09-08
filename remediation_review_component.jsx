// Preservation history and source references are navigation metadata, never verification proof.
const _PdfPreservationReview = ({ result, captureToken, commitMetadata, onWorkbench }) => {
  const api = window.AlloModules && window.AlloModules.RemediationReview;
  const [expanded, setExpanded] = React.useState(false);
  const [model, setModel] = React.useState(() => api && api.normalizeSourceModel(result && result.sourceStructure));
  const [selected, setSelected] = React.useState('');
  const [message, setMessage] = React.useState('');
  const frame = React.useRef(null);
  const inspectButton = React.useRef(null);
  const operation = React.useRef(0);
  const focusCleanup = React.useRef(null);
  const returnPreviewFocus = React.useRef(false);
  const [busy, setBusy] = React.useState(false);
  const generation = React.useRef(0);
  const html = String(result && result.accessibleHtml || '');
  React.useLayoutEffect(() => {
    // Cleanup remembers ownership before React replaces the iframe document.
    // Only a surviving instance consumes this flag; document replacement uses a new key.
    const restorePreviewFocus = returnPreviewFocus.current;
    returnPreviewFocus.current = false;
    if (restorePreviewFocus && inspectButton.current && (document.activeElement === document.body || document.activeElement === frame.current)) inspectButton.current.focus();
    generation.current += 1; operation.current += 1;
    setBusy(false);
    setModel(api && api.normalizeSourceModel(result && result.sourceStructure));
    setSelected(''); setMessage(''); setExpanded(false);
    return () => {
      returnPreviewFocus.current = !!(frame.current && document.activeElement === frame.current);
      generation.current += 1; operation.current += 1;
      if (focusCleanup.current) focusCleanup.current();
    };
  }, [html]);
  if (!api || !result || !html) return null;
  const evidence = api.evidence(result);
  const items = api.reviewItems(result, result.preservationAcknowledgments);
  const pending = items.filter(item => !item.reviewed).length;
  const openStructure = async () => {
    const token = captureToken(), run = generation.current, request = ++operation.current;
    const current = () => run === generation.current && request === operation.current;
    setBusy(true);
    try {
      let next = model;
      if (!next) {
        setMessage('Preparing document references…');
        next = await api.createSourceModel(html);
        if (!current()) return;
        if (!next) { setMessage('Document references are unavailable in this browser.'); return; }
        if (!commitMetadata(token, prev => ({ ...prev, sourceStructure: next }))) { setMessage('The document changed. Open its references again.'); return; }
        setModel(next);
      }
      setExpanded(true); setMessage('Choose a table, cell, or image to inspect.');
    } catch (_) {
      if (current()) setMessage('Document references could not be prepared. Try again.');
    } finally { if (current()) setBusy(false); }
  };
  const cancelNavigation = () => {
    operation.current += 1; setBusy(false);
    if (focusCleanup.current) focusCleanup.current();
  };
  const focusReference = async event => {
    const run = generation.current, request = ++operation.current, preview = frame.current;
    const trigger = event.currentTarget;
    const current = () => run === generation.current && request === operation.current && preview === frame.current;
    setBusy(true); setMessage('Locating the selected element…');
    try {
      const doc = preview && preview.contentDocument;
      const found = await api.resolveSourceReference(doc, model, selected);
      if (!current()) return;
      if (!doc || preview.contentDocument !== doc) { setMessage('The preview changed. Try locating the element again.'); return; }
      if (found.reason === 'reference-inventory-truncated') { setMessage('This reference index is incomplete. Inspect the document manually.'); return; }
      if (found.status !== 'matched' || !found.node || !found.node.isConnected || found.node.ownerDocument !== doc) {
        setMessage(found.status === 'ambiguous' ? 'This reference has multiple possible matches. Inspect the document manually.' : 'This reference cannot be matched safely to the current document. Inspect the document manually.');
        return;
      }
      // A delayed hash calculation must not steal focus after the reviewer moves elsewhere.
      if (document.activeElement !== trigger) { setMessage('The element is ready. Choose Locate in preview to move focus.'); return; }
      if (focusCleanup.current) focusCleanup.current();
      const node = found.node, previous = node.getAttribute('tabindex');
      const styles = ['outline', 'outline-offset'].map(name => [name, node.style.getPropertyValue(name), node.style.getPropertyPriority(name)]);
      const restore = () => {
        node.removeEventListener('blur', restore);
        if (previous === null) node.removeAttribute('tabindex'); else node.setAttribute('tabindex', previous);
        styles.forEach(([name, value, priority]) => { if (value) node.style.setProperty(name, value, priority); else node.style.removeProperty(name); });
        if (focusCleanup.current === restore) focusCleanup.current = null;
      };
      focusCleanup.current = restore;
      node.setAttribute('tabindex', '-1');
      node.style.setProperty('outline', '3px solid #1d4ed8', 'important');
      node.style.setProperty('outline-offset', '2px', 'important');
      node.addEventListener('blur', restore, { once: true });
      node.scrollIntoView({ block: 'center' }); node.focus();
      if (doc.activeElement !== node) { restore(); setMessage('The element was located, but could not receive keyboard focus.'); return; }
      setMessage('Located ' + found.reference.label + '.');
    } catch (_) {
      if (current()) setMessage('The reference could not be located. Try again.');
    } finally { if (current()) setBusy(false); }
  };
  return <section aria-label="Preservation review" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-slate-900">
    <h3 className="text-sm font-bold">Preservation review</h3>
    <p className="text-xs mt-1">{evidence.candidateRejectionCount ? `${evidence.candidateRejectionCount} suggestions were rejected to protect the document. ${pending} recorded items need acknowledgment.` : 'Inspect stable references for tables, cells, and images.'} Acknowledging an item does not resolve accessibility findings or change verification.</p>
    {items.length > 0 && <details className="mt-2"><summary className="cursor-pointer text-xs font-semibold">Review rejected suggestions ({items.length})</summary>
      <ol className="mt-2 space-y-2">{items.map(item => <li key={item.key} className="rounded border border-amber-200 bg-white p-2 text-xs">
        <p>{item.description}</p><p className="mt-1 text-slate-600">{item.pass ? `Pass ${item.pass} · ` : ''}{item.chunkId === 'all' ? 'Whole document' : `Section ${item.chunkId}`} · {item.phase}</p>
        <div className="flex flex-wrap gap-2 mt-2">
          <button type="button" className="rounded border px-2 py-1" aria-pressed={item.reviewed} onClick={() => {
            const token = captureToken();
            commitMetadata(token, prev => { const acknowledgments = { ...(prev.preservationAcknowledgments || {}) }; if (acknowledgments[item.key]) delete acknowledgments[item.key]; else acknowledgments[item.key] = Date.now(); return { ...prev, preservationAcknowledgments: acknowledgments }; });
          }}>{item.reviewed ? 'Acknowledged — undo' : 'Acknowledge'}</button>
          <button type="button" className="rounded border px-2 py-1" onClick={() => onWorkbench(`Review accessibility issues in ${item.chunkId === 'all' ? 'the document' : 'section ' + item.chunkId}. A previous suggestion was rejected: ${item.description} Preserve the source wording, table values, and image identity.`)}>Prepare Workbench review</button>
        </div>
      </li>)}</ol>
    </details>}
    {evidence.candidateRejectionCount > items.length && <p className="text-xs mt-2">Showing {items.length} of {evidence.candidateRejectionCount} rejection records. Additional details were not retained.</p>}
    <button ref={inspectButton} type="button" aria-disabled={busy} className="mt-2 rounded border border-amber-500 px-2 py-1 text-xs" onClick={() => { if (!busy) openStructure(); }}>Inspect document references</button>
    <p role="status" className="text-xs mt-1">{message}</p>
    {expanded && model && <div className="mt-2">
      <p className="text-xs mb-2">References describe the document when this index was created. Rejection records identify a section, not an exact affected cell or image. Changed or ambiguous elements cannot be located automatically.</p>
      <label className="text-xs">Document element <select value={selected} onChange={event => { cancelNavigation(); setSelected(event.target.value); setMessage(''); }} className="border rounded max-w-full p-1">
        <option value="">Choose an element</option>{model.references.map(ref => <option key={ref.id} value={ref.id}>{ref.label}</option>)}
      </select></label>
      <button type="button" className="ml-2 rounded border px-2 py-1 text-xs" disabled={!selected || model.truncated} aria-disabled={busy || !selected || model.truncated} onClick={event => { if (!busy) focusReference(event); }}>Locate in preview</button>
      <button type="button" className="ml-2 rounded border px-2 py-1 text-xs" onClick={() => { cancelNavigation(); setExpanded(false); setMessage('Reference preview closed.'); if (inspectButton.current) inspectButton.current.focus(); }}>Close reference preview</button>
      {model.truncated && <p className="text-xs">This reference index is incomplete. Automatic location is unavailable; inspect the preview manually.</p>}
      {!model.references.length && <p className="text-xs">No tables, cells, or images were found.</p>}
      <iframe ref={frame} title="Document preservation review preview" sandbox="allow-same-origin" srcDoc={html} className="mt-2 w-full h-80 border bg-white" />
    </div>}
  </section>;
};
