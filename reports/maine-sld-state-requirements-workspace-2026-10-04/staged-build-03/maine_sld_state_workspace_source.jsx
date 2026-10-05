const STATE_REQUIREMENTS_STYLE = `
.msld-state{margin-top:22px;min-width:0}.msld-state[hidden]{display:none!important}.msld-state>summary{min-height:44px;cursor:pointer;font-weight:750;line-height:1.5;padding:3px 0}.msld-state summary:focus-visible,.msld-state [tabindex]:focus-visible{outline:3px solid var(--accent);outline-offset:3px}.msld-state-body{padding-top:16px;display:flex;flex-direction:column;gap:18px;min-width:0}.msld-state p,.msld-state h3,.msld-state h4{overflow-wrap:anywhere}.msld-state-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px}.msld-state-panel{border:1px solid var(--line);border-radius:10px;background:var(--paper);padding:16px;min-width:0}.msld-state-panel h3{margin-bottom:10px}.msld-state-fields{display:flex;flex-direction:column;gap:12px}.msld-state-fields label{font-size:13px;display:flex;flex-direction:column;gap:6px;font-weight:650}.msld-state-fields label>span{font-weight:400}.msld-state input:not([type=checkbox]),.msld-state select,.msld-state textarea{width:100%;min-width:0;max-width:100%}.msld-state input:not([type=checkbox]),.msld-state select{min-height:44px}.msld-state textarea{min-height:110px;line-height:1.5;resize:vertical;overflow-wrap:anywhere}.msld-state .msld-state-excerpt{min-height:180px}.msld-state-check{display:flex!important;flex-direction:row!important;align-items:flex-start;min-height:44px;gap:10px!important;line-height:1.5;font-weight:400!important}.msld-state-check input{width:22px;height:22px;min-height:22px;flex-shrink:0;margin-top:2px}.msld-state-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.msld-state-actions .msld-button{min-height:44px}.msld-state-meta>span{min-width:0;max-width:100%;overflow-wrap:anywhere}.msld-state-meta{display:flex;flex-wrap:wrap;gap:6px 15px;font-size:12px;line-height:1.5;color:var(--muted);margin-top:8px}.msld-state-list{display:flex;flex-direction:column;gap:12px}.msld-state-source{border:1px solid var(--line);border-radius:9px;padding:14px;min-width:0}.msld-state-source h4{font-size:14px;margin:0 0 8px;line-height:1.5}.msld-state-source a{overflow-wrap:anywhere}.msld-state-source summary{min-height:44px;cursor:pointer;padding:10px 0;font-size:13px;font-weight:650}.msld-state-text{white-space:pre-wrap;overflow-wrap:anywhere;word-break:normal;font:inherit;line-height:1.6;background:var(--soft);padding:12px;border:1px solid var(--line);border-radius:8px;max-height:320px;overflow:auto;min-width:0}.msld-state-feedback{font-size:13px;line-height:1.5;overflow-wrap:anywhere}.msld-state-error{border:1px solid var(--line);border-left:4px solid var(--accent);padding:12px;border-radius:7px;background:var(--soft)}.msld-state-inline-note{font-size:12px;line-height:1.6;color:var(--muted)}.msld-state-limit{font-size:12px;font-weight:400;color:var(--muted)}.msld-state-hidden{display:none!important}
@media(max-width:760px){.msld-state-grid{grid-template-columns:minmax(0,1fr)}.msld-state-panel{padding:13px}.msld-state-source{padding:12px}}
@media(forced-colors:active){.msld-state,.msld-state-panel,.msld-state-source,.msld-state-text,.msld-state-error{background:Canvas;color:CanvasText;border-color:CanvasText}.msld-state input,.msld-state textarea,.msld-state select{background:Field;color:FieldText;border-color:FieldText}.msld-state button{background:ButtonFace;color:ButtonText;border-color:ButtonText}.msld-state a{color:LinkText}.msld-state summary:focus-visible,.msld-state button:focus-visible,.msld-state input:focus-visible,.msld-state textarea:focus-visible,.msld-state select:focus-visible,.msld-state [tabindex]:focus-visible{outline:3px solid Highlight;outline-offset:3px}.msld-state-inline-note,.msld-state-meta,.msld-state-limit{color:CanvasText}}
`;

function MaineSldStateRequirements(props) {
  props = props || {};
  const MState = window.AlloSldStateReferenceCore;
  const initialRef = React.useRef(null);
  if (!initialRef.current) {
    let workspace = MState.emptyWorkspace(), warning = '';
    try {
      const saved = window.sessionStorage.getItem(MState.STORAGE_KEY);
      if (saved) workspace = MState.parseWorkspace(saved);
    } catch (error) { warning = 'Saved state references could not be opened. Your practice worksheet is still available. Restore a reference backup or start a new reference; the old stored data has not been replaced.'; }
    initialRef.current = { workspace, warning };
  }
  const [workspace, setWorkspace] = React.useState(initialRef.current.workspace);
  const [draft, setDraft] = React.useState(() => MState.emptySource());
  const [draftDirty, setDraftDirty] = React.useState(false);
  const [results, setResults] = React.useState([]);
  const [busy, setBusy] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [error, setError] = React.useState('');
  const [saveWarning, setSaveWarning] = React.useState(initialRef.current.warning);
  const importRef = React.useRef(null), restoreRef = React.useRef(null), newDraftRef = React.useRef(null), titleRef = React.useRef(null), summaryRef = React.useRef(null);
  const operationRef = React.useRef(0), timerRef = React.useRef(null), aliveRef = React.useRef(true), lastWorkspaceRef = React.useRef(workspace), allowPersistRef = React.useRef(!initialRef.current.warning);
  const visible = props.visible !== false, open = !!props.open;
  const contextRef = React.useRef(null);
  contextRef.current = { visible, open, state: workspace.activeState };
  const state = workspace.activeState, sources = MState.getSources(workspace, state);
  const totalSources = Object.values(workspace.byState).reduce((count, record) => count + record.sources.length, 0);
  const retire = message => {
    operationRef.current += 1;
    if (timerRef.current) { window.clearTimeout(timerRef.current); timerRef.current = null; }
    if (aliveRef.current) { setBusy(''); if (message) setStatus(message); }
  };
  const currentOperation = (token, selectedState) => aliveRef.current && operationRef.current === token && contextRef.current.visible && contextRef.current.open && contextRef.current.state === selectedState;
  const showError = failure => setError(failure && failure.message ? failure.message : String(failure || 'This action could not be completed. Your current references are unchanged.'));
  const persist = (next, requested) => {
    if (!allowPersistRef.current && !requested) return false;
    if (requested) allowPersistRef.current = true;
    try {
      window.sessionStorage.setItem(MState.STORAGE_KEY, MState.serializeWorkspace(next));
      setSaveWarning('');
      if (requested) setStatus('Your saved references are retained in this tab.');
      return true;
    } catch (failure) {
      setSaveWarning('Tab saving is unavailable for state references. Your saved references remain available in this open lab. Download saved references before closing or refreshing.');
      return false;
    }
  };
  React.useEffect(() => {
    if (lastWorkspaceRef.current === workspace) return;
    lastWorkspaceRef.current = workspace;
    persist(workspace, false);
  }, [workspace]);
  React.useEffect(() => { if (!visible || !open) retire(); }, [visible, open]);
  React.useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; operationRef.current += 1; if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, []);
  const deferFocus = action => { const selectedState = state, origin = document.activeElement; window.requestAnimationFrame(() => { if (!aliveRef.current || !contextRef.current.visible || !contextRef.current.open || contextRef.current.state !== selectedState) return; if (document.activeElement !== origin && !(origin && !origin.isConnected && document.activeElement === document.body)) return; action(); }); };
  const focusTitle = () => deferFocus(() => { if (titleRef.current && titleRef.current.getClientRects().length) { titleRef.current.scrollIntoView({ block: 'center' }); titleRef.current.focus({ preventScroll: true }); } });
  const canReplaceDraft = () => !draftDirty || window.confirm('Replace this unsaved reference draft? Its edits have not been saved. Your saved references will stay intact.');
  const replaceDraft = (next, dirty) => { retire(); setDraft(next); setDraftDirty(!!dirty); setError(''); focusTitle(); };
  const editDraft = patch => {
    const wasBusy = busy;
    retire(); setDraft(previous => MState.editSource(previous, patch)); setDraftDirty(true); setError('');
    if (wasBusy) setStatus('Stopped waiting for the previous operation because this draft changed. Your edits are retained.');
  };
  const runOperation = (kind, operation, accept) => {
    retire(); setError(''); setStatus('');
    const token = ++operationRef.current, selectedState = state;
    setBusy(kind);
    timerRef.current = window.setTimeout(() => {
      if (!currentOperation(token, selectedState)) return;
      retire(); setError('Stopped waiting after 20 seconds. Your saved references and draft are unchanged. You can try again; underlying document or search work may still finish, and its late result will be ignored.');
    }, 20000);
    Promise.resolve().then(operation).then(result => {
      if (!currentOperation(token, selectedState)) return;
      if (timerRef.current) { window.clearTimeout(timerRef.current); timerRef.current = null; }
      setBusy(''); accept(result);
    }).catch(failure => {
      if (!currentOperation(token, selectedState)) return;
      retire(); showError(failure);
    });
  };
  const changeState = event => {
    const wanted = event.target.value;
    if (wanted === state) return;
    if (!canReplaceDraft()) { event.target.value = state; return; }
    retire(); setWorkspace(previous => MState.selectState(previous, wanted)); setDraft(MState.emptySource()); setDraftDirty(false); setResults([]); setError('');
    setStatus('Showing saved references for ' + wanted + '. Your practice cases still use the Maine form.');
  };
  const newManual = () => {
    if (!canReplaceDraft()) return;
    replaceDraft(MState.emptySource(), false); setStatus('New manual source draft. Paste exact wording and record its source before saving.');
  };
  const importDocument = event => {
    const file = event.target.files && event.target.files[0]; event.target.value = '';
    if (!file || !canReplaceDraft()) return;
    if (!window.AlloSldStateDocuments || typeof window.AlloSldStateDocuments.extract !== 'function') { setError('Document import is unavailable. You can paste source wording into a manual reference.'); return; }
    runOperation('import', () => window.AlloSldStateDocuments.extract(file, { root: window }), result => {
      const next = MState.fromDocument(result); replaceDraft(next, true);
      setStatus('Document text opened as a draft. Inspect the extraction, enter the relevant excerpt and metadata, then save the reference.');
    });
  };
  const research = () => {
    const provider = window.WebSearchProvider;
    if (!provider || typeof provider.search !== 'function') { setError('Search is unavailable here. Open the public search link or add an official source manually.'); return; }
    const query = MState.searchQuery(state);
    runOperation('research', () => provider.search(query, 10, query), response => {
      const next = MState.normalizeSearchResults(response); setResults(next);
      setStatus(next.length ? next.length + ' source links found. Inspect each source before using it.' : 'No usable source links were returned. Try the public search link or add a source manually.');
    });
  };
  const useResult = result => {
    if (!canReplaceDraft()) return;
    try { replaceDraft(MState.fromSearchResult(result), true); setStatus('Source link opened as an unreviewed draft. Read the linked source and enter an exact excerpt and date checked.'); } catch (failure) { showError(failure); }
  };
  const saveReference = () => {
    retire();
    try {
      if (!draft.title.trim()) throw new Error('Add a source title before saving this reference.');
      const next = MState.upsertSource(workspace, state, draft), saved = MState.getSources(next, state).find(source => source.id === draft.id);
      allowPersistRef.current = true; setWorkspace(next); setDraft(saved); setDraftDirty(false); setError('');
      setStatus('Reference saved for ' + state + '. It does not change the practice case or Maine form.');
      deferFocus(() => { const target = document.getElementById('msld-state-source-' + saved.id); if (target) { target.scrollIntoView({ block: 'nearest' }); target.focus({ preventScroll: true }); } });
    } catch (failure) { showError(failure); }
  };
  const editReference = source => { if (!canReplaceDraft()) return; replaceDraft(source, false); setStatus('Editing your saved reference. Save reference to keep changes.'); };
  const removeReference = source => {
    if (!window.confirm('Remove "' + source.title + '" from your saved references for ' + state + '? Download saved references first if you want a backup.')) return;
    if (draft.id === source.id && draftDirty && !canReplaceDraft()) return;
    retire();
    try {
      const next = MState.removeSource(workspace, state, source.id); setWorkspace(next);
      if (draft.id === source.id) { setDraft(MState.emptySource()); setDraftDirty(false); }
      setError(''); setStatus('Reference removed. Your practice worksheet is unchanged.');
      deferFocus(() => { if (newDraftRef.current) newDraftRef.current.focus(); });
    } catch (failure) { showError(failure); }
  };
  const download = () => {
    try {
      const blob = new Blob([MState.serializeWorkspace(workspace)], { type: 'application/json' });
      const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = 'SLD-State-References.json'; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setError(''); setStatus('Saved references download started.' + (draftDirty ? ' Your unsaved draft is not included.' : ''));
    } catch (failure) { showError(failure); }
  };
  const restoreReferences = event => {
    const file = event.target.files && event.target.files[0]; event.target.value = '';
    if (!file) return;
    if (file.size > MState.LIMITS.json * 4 + 3) { setError('This reference JSON file exceeds the workspace limit. Your current references are unchanged.'); return; }
    runOperation('restore', () => file.text(), text => {
      const restored = MState.parseWorkspace(text);
      if (!window.confirm('Replace all saved state references in this tab with this reference file?' + (draftDirty ? ' This also replaces your unsaved reference draft.' : '') + ' Your practice worksheet will stay intact.')) { setStatus('Reference restore canceled. Your current references and draft are retained.'); return; }
      retire(); allowPersistRef.current = true; setWorkspace(restored); setDraft(MState.emptySource()); setDraftDirty(false); setResults([]); setError(''); setStatus('State references restored. Your practice worksheet is unchanged.');
      deferFocus(() => { if (summaryRef.current) { summaryRef.current.scrollIntoView({ block: 'nearest' }); summaryRef.current.focus(); } });
    });
  };
  const toggleReview = event => {
    if (event.target.checked && (!draft.title.trim() || !draft.excerpt.trim() || !draft.checkedDate)) { setError('Enter the source title, exact excerpt and date checked before marking this reference reviewed.'); return; }
    editDraft({ reviewed: event.target.checked });
  };
  const link = (url, label) => MState.safeUrl(url) ? <a href={MState.safeUrl(url)} target="_blank" rel="noopener noreferrer">{label}<span className="msld-hidden"> (opens in a new tab)</span></a> : null;
  return <details className="msld-card msld-state" data-testid="state-requirements-workspace" hidden={!visible} open={open} onToggle={event => { const next = event.currentTarget.open; if (!next) retire(); if (typeof props.onOpenChange === 'function') props.onOpenChange(next); }}>
    <style>{STATE_REQUIREMENTS_STYLE}</style>
    <summary ref={summaryRef} data-testid="state-requirements-summary">State requirements workspace</summary>
    <div className="msld-state-body">
      <p className="msld-description">Bring your state’s public rules and forms into a separate reference workspace. These references help you plan what to verify; the fictional cases and practice questions continue to use Maine’s form.</p>
      <div className="msld-state-fields"><label>State or District of Columbia<select data-testid="state-reference-state" value={state} onChange={changeState}>{MState.STATES.map(name => <option key={name} value={name}>{name}</option>)}</select></label></div>
      <div className="msld-state-actions"><button type="button" className="msld-button" ref={newDraftRef} data-testid="state-new-manual" onClick={newManual}>New manual source</button><button type="button" className="msld-button" data-testid="state-import-document" onClick={() => { retire(); importRef.current.click(); }}>Import PDF, Word or text</button><button type="button" className="msld-button" data-testid="state-download-references" onClick={download}>Download saved references</button><button type="button" className="msld-button" data-testid="state-restore-references" onClick={() => { retire(); restoreRef.current.click(); }}>Restore references</button></div>
      <p className="msld-state-inline-note">Saved references use separate tab storage and a separate download. A reference download contains source records, including any saved extracted text. It does not contain your practice worksheet.{draftDirty && ' Your current draft has unsaved changes and is not included in the download.'}</p>
      {saveWarning && <div className="msld-state-error" data-testid="state-reference-save-warning" role="group" aria-label="State reference saving"><p>{saveWarning}</p><div className="msld-state-actions" style={{ marginTop: 10 }}><button type="button" className="msld-button" onClick={download}>Download saved references</button><button type="button" className="msld-button" data-testid="state-retry-save" onClick={() => persist(workspace, true)}>Try saving references again</button></div></div>}
      <section className="msld-state-panel" aria-labelledby="msld-state-research-title"><h3 id="msld-state-research-title">Find public sources for {state}</h3><p className="msld-small">Research sends a fixed public query for the selected state. It does not send your imported text, notes or practice worksheet. Inspect the issuing agency, effective date and wording before marking a reference reviewed.</p><div className="msld-state-actions" style={{ marginTop: 12 }}><button type="button" className="msld-button msld-primary" data-testid="state-research" onClick={research}>Research this state</button>{link(MState.externalSearchUrl(state), 'Open public search')}</div>
        {!!results.length && <div className="msld-state-list" style={{ marginTop: 16 }} data-testid="state-search-results">{results.map((result, index) => <article className="msld-state-source" key={result.url}><h4>{link(result.url, result.title)}</h4>{result.snippet && <p className="msld-small">{result.snippet}</p>}<p className="msld-state-inline-note" style={{ marginTop: 8 }}>{result.url}</p><button type="button" className="msld-button" style={{ marginTop: 10 }} data-testid={'state-use-result-' + index} onClick={() => useResult(result)}>Use source as draft</button></article>)}</div>}
      </section>
      {busy && <div className="msld-state-actions" data-testid="state-operation-pending"><p className="msld-small">{busy === 'import' ? 'Opening document text…' : busy === 'restore' ? 'Reading reference file…' : 'Finding public source links…'}</p><button type="button" className="msld-button" data-testid="state-cancel-operation" onClick={() => retire('Stopped waiting. Your current references and draft are retained; late results will be ignored.')}>Cancel waiting</button></div>}
      <div className="msld-state-feedback" data-testid="state-reference-feedback" role="status" aria-live="polite" aria-atomic="true">{status}</div>
      {error && <div className="msld-state-error msld-state-feedback" data-testid="state-reference-error" role="alert">{error}</div>}
      <div className="msld-state-grid">
        <section className="msld-state-panel" aria-labelledby="msld-state-draft-title"><h3 id="msld-state-draft-title">Source draft for {state}</h3><p className="msld-small">Record exact wording from the source and your transfer notes. Saving a reference does not verify the rule or change eligibility decisions.</p>
          {draft.fileName && <div className="msld-state-meta" data-testid="state-import-provenance"><span>File: {draft.fileName}</span><span>Format: {draft.fileFormat || 'Not supplied'}</span><span>Extraction: {draft.extractionMethod || 'Not supplied'}</span>{draft.documentPartCount > 0 && <span>{draft.documentPartCount} document parts</span>}{draft.fileContentHash && <span>File fingerprint: {draft.fileContentHash}</span>}{draft.fileLastModified > 0 && <span>File modified: {new Date(draft.fileLastModified).toLocaleString()}</span>}</div>}
          {draft.content && draft.importMethod === 'local-file' && <details data-testid="state-document-preview"><summary>Inspect full extracted text</summary><pre className="msld-state-text" tabIndex={0} aria-label={'Extracted source text from ' + draft.fileName}>{draft.content}</pre><p className="msld-state-inline-note">Check extraction against the original file, especially layout, tables and page references. Copy only the relevant wording into the excerpt field.</p></details>}
          <div className="msld-state-fields" style={{ marginTop: 16 }}>
            <label>Source title<input ref={titleRef} data-testid="state-source-title" value={draft.title} onChange={event => editDraft({ title: event.target.value })}/></label>
            <label>Official source URL<span className="msld-small">Leave blank for a local document with no public link.</span><input type="url" data-testid="state-source-url" value={draft.url} onChange={event => editDraft({ url: event.target.value })}/></label>
            <label>Effective date<span className="msld-small">Leave blank if the source does not establish it.</span><input type="date" data-testid="state-source-effective-date" value={draft.effectiveDate} onChange={event => editDraft({ effectiveDate: event.target.value })}/></label>
            <label>Date you checked this source<input type="date" data-testid="state-source-checked-date" value={draft.checkedDate} onChange={event => editDraft({ checkedDate: event.target.value })}/></label>
            <label>Page or section<input data-testid="state-source-page-section" value={draft.pageSection} onChange={event => editDraft({ pageSection: event.target.value })}/></label>
            <label>Exact source excerpt<textarea className="msld-state-excerpt" data-testid="state-source-excerpt" value={draft.excerpt} onChange={event => editDraft({ excerpt: event.target.value })}/><span className="msld-state-limit">{draft.excerpt.length.toLocaleString()} / {MState.LIMITS.excerpt.toLocaleString()} characters</span></label>
            <label>Your transfer notes<span className="msld-small">What could you carry into practice, and which state requirements still need checking?</span><textarea data-testid="state-source-transfer-notes" value={draft.transferNotes} onChange={event => editDraft({ transferNotes: event.target.value })}/><span className="msld-state-limit">{draft.transferNotes.length.toLocaleString()} / {MState.LIMITS.notes.toLocaleString()} characters</span></label>
            <details data-testid="state-comparison-prompts"><summary>Compare requirements before transferring the practice</summary><ul className="msld-list"><li>Which SLD criteria and decision process does this state require?</li><li>What language and assessment-validity information must the team consider?</li><li>How should intervention response and classroom observation be documented?</li><li>Which exclusionary factors must be addressed?</li><li>How is the need for special education considered separately?</li><li>Which forms, documentation and timelines apply?</li></ul><p className="msld-state-inline-note">These are comparison prompts. Record the state’s actual wording and any question that still needs verification.</p></details>
            {draft.importMethod === 'manual' && <details><summary>Paste additional source text for local reference</summary><label>Source text<textarea data-testid="state-manual-content" value={draft.content} onChange={event => editDraft({ content: event.target.value })}/><span className="msld-state-limit">{draft.content.length.toLocaleString()} / {MState.LIMITS.content.toLocaleString()} characters</span></label></details>}
            <label className="msld-state-check"><input type="checkbox" data-testid="state-source-reviewed" checked={draft.reviewed} onChange={toggleReview}/><span>I checked this source and the excerpt against the issuing agency’s current requirements. <span className="msld-small">Editing the source or notes clears this mark.</span></span></label>
          </div>
          <p className="msld-state-inline-note" style={{ marginTop: 12 }}>{draft.reviewed ? 'Participant review recorded ' + draft.reviewedAt + '.' : 'Not marked reviewed. You may save a reference to revisit later.'}</p>
          <div className="msld-state-actions" style={{ marginTop: 12 }}><button type="button" className="msld-button msld-primary" data-testid="state-save-reference" onClick={saveReference}>Save reference</button>{draftDirty && <span className="msld-state-inline-note" data-testid="state-draft-unsaved">Unsaved draft</span>}</div>
        </section>
        <section className="msld-state-panel" aria-labelledby="msld-state-saved-title"><h3 id="msld-state-saved-title">Saved references for {state}</h3><p className="msld-state-inline-note">{sources.length} / {MState.LIMITS.sourcesPerState} for this state · {totalSources} / {MState.LIMITS.sourcesTotal} across the workspace.</p>{!sources.length ? <p className="msld-small" style={{ marginTop: 14 }}>No saved references for this state yet. Import a document, paste wording or inspect a public source link, then save your reference.</p> : <div className="msld-state-list" style={{ marginTop: 14 }} data-testid="state-saved-sources">{sources.map(source => <article className="msld-state-source" key={source.id} data-testid={'state-saved-source-' + source.id}><h4 id={'msld-state-source-' + source.id} tabIndex={-1}>{source.title}</h4><p className="msld-state-inline-note">{source.reviewed ? 'Participant marked reviewed ' + source.reviewedAt : 'Not marked reviewed'}</p><div className="msld-state-meta"><span>Effective: {source.effectiveDate || 'Not supplied'}</span><span>Checked: {source.checkedDate || 'Not supplied'}</span>{source.pageSection && <span>Page/section: {source.pageSection}</span>}{source.fileName && <span>File: {source.fileName}</span>}</div>{source.url && <p className="msld-small" style={{ marginTop: 10 }}>{link(source.url, 'Open source')}</p>}<details><summary>Review saved excerpt and notes</summary><p className="msld-small"><strong>Exact source excerpt</strong></p><pre className="msld-state-text" tabIndex={0} aria-label={'Saved excerpt from ' + source.title}>{source.excerpt || 'No excerpt recorded.'}</pre><p className="msld-small" style={{ marginTop: 10 }}><strong>Your transfer notes</strong></p><pre className="msld-state-text" tabIndex={0} aria-label={'Transfer notes for ' + source.title}>{source.transferNotes || 'No transfer notes recorded.'}</pre>{source.content && <p className="msld-state-inline-note">Full source text is retained in this reference. Use Edit reference to inspect it.</p>}</details><div className="msld-state-actions"><button type="button" className="msld-button" data-testid={'state-edit-source-' + source.id} onClick={() => editReference(source)}>Edit reference</button><button type="button" className="msld-button" data-testid={'state-remove-source-' + source.id} onClick={() => removeReference(source)}>Remove reference</button></div></article>)}</div>}</section>
      </div>
      <input ref={importRef} className="msld-state-hidden" type="file" accept=".pdf,.docx,.txt,.md,.markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown" onChange={importDocument} tabIndex={-1} aria-label="Import a public state requirements document" data-testid="state-document-file"/>
      <input ref={restoreRef} className="msld-state-hidden" type="file" accept=".json,application/json" onChange={restoreReferences} tabIndex={-1} aria-label="Restore a saved State references JSON file" data-testid="state-references-file"/>
    </div>
  </details>;
}
