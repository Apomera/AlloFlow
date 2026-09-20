  function findReadingGlossOccurrences(text, query) {
    const word = String(query || '').trim();
    if (!word || word.length > 160) return [];
    const matches = [];
    let cursor = 0;
    while (cursor < text.length && matches.length < 200) {
      const start = text.indexOf(word, cursor);
      if (start < 0) break;
      const end = start + word.length;
      matches.push({ start, end, quote: text.slice(start, end), context: text.slice(Math.max(0, start - 35), Math.min(text.length, end + 45)).replace(/\s+/g, ' ').trim() });
      cursor = start + 1;
    }
    return matches;
  }

  function ReadingGlossEditor({ item, supports, request, onUpdate, disabled }) {
    const snapshot = getInstructionalContextApi()?.getSourceSnapshot?.(item);
    const sourceText = snapshot?.text || '';
    const sourceKey = String(item?.id || '') + ':' + (snapshot?.fingerprint || '');
    const [open, setOpen] = React.useState(false);
    const [draft, setDraft] = React.useState(null);
    const [notice, setNotice] = React.useState('');
    const [error, setError] = React.useState('');
    const [busy, setBusy] = React.useState(false);
    const sourceKeyRef = React.useRef(sourceKey); sourceKeyRef.current = sourceKey;
    const termRef = React.useRef(null), definitionRef = React.useRef(null), addRef = React.useRef(null);
    const editRefs = React.useRef({});
    const panelId = 'reading-gloss-editor-' + String(item?.id || 'current').replace(/[^a-z0-9_-]/gi, '-');
    const entries = supports?.annotations || [];
    const beginEdit = entry => {
      setOpen(true); setNotice(''); setError('');
      setDraft({ id: entry.id, query: entry.quote, start: String(entry.start), text: entry.definition || entry.explanation || entry.text || '', priority: entry.priority || 'helpful', pinned: entry.pinned === true });
    };
    React.useEffect(() => { setOpen(false); setDraft(null); setNotice(''); setError(''); setBusy(false); }, [sourceKey]);
    React.useEffect(() => {
      if (!request || request.ownerId !== item?.id) return;
      const entry = entries.find(value => value.id === request.id);
      if (entry) beginEdit(entry);
    }, [request]);
    React.useEffect(() => {
      if (draft) (draft.id ? definitionRef.current : termRef.current)?.focus();
    }, [!!draft, draft?.id, request]);
    const matches = React.useMemo(() => {
      const entry = draft?.id && entries.find(value => value.id === draft.id);
      return entry ? [{ ...entry, context: sourceText.slice(Math.max(0, entry.start - 35), Math.min(sourceText.length, entry.end + 45)).replace(/\s+/g, ' ').trim() }] : findReadingGlossOccurrences(sourceText, draft?.query || '');
    }, [sourceText, draft?.query, draft?.id, supports]);
    const selected = draft && (draft.start !== '' ? matches.find(value => String(value.start) === draft.start) : matches.length === 1 ? matches[0] : null);
    const updateDraft = fields => setDraft(previous => ({ ...previous, ...fields }));
    const mutate = async (action, success) => {
      if (disabled || busy || typeof onUpdate !== 'function') return null;
      const key = sourceKeyRef.current;
      setBusy(true); setNotice(''); setError('');
      try {
        const result = await onUpdate(item, action);
        if (sourceKeyRef.current !== key) return null;
        if (!result) throw new Error('The reading changed. Reopen its word supports and try again.');
        setNotice(success);
        return result;
      } catch (failure) {
        if (sourceKeyRef.current === key) setError(failure?.message || 'This word support could not be saved.');
        return null;
      } finally { if (sourceKeyRef.current === key) setBusy(false); }
    };
    const save = async () => {
      if (!selected || !draft?.text.trim()) { setError('Choose the exact word or phrase and enter its explanation.'); return; }
      const annotation = { ...selected, id: draft.id || 'gloss-' + selected.start + '-' + selected.end, text: draft.text.trim(), priority: draft.priority, pinned: draft.pinned };
      delete annotation.context;
      const saved = await mutate({ type: 'upsert', annotation }, 'Word support saved. Your wording will be kept when suggestions are refreshed.');
      if (saved) setDraft(previous => previous && ({ ...previous, id: annotation.id, start: String(selected.start) }));
    };
    const finish = () => { const id = draft?.id; setDraft(null); setError(''); (editRefs.current[id] || addRef.current)?.focus(); };
    return <section data-reading-gloss-editor className="my-4 rounded-xl border border-indigo-200 bg-white p-3 text-sm text-slate-800">
      <button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(value => !value)} className="min-h-11 rounded-lg px-2 text-left font-bold text-indigo-900 focus-visible:ring-2 focus-visible:ring-indigo-600">Review word supports {entries.length ? '(' + entries.length + ')' : ''}</button>
      {open && <div id={panelId} className="mt-2 space-y-3">
        <p className="text-sm leading-relaxed text-slate-600">Add or adjust explanations beside the original words. Teacher edits and removed supports are kept when AI suggestions are refreshed.</p>
        <button ref={addRef} type="button" disabled={disabled || busy} onClick={() => { setDraft({ id: null, query: '', start: '', text: '', priority: 'essential', pinned: false }); setError(''); setNotice(''); }} className="min-h-11 rounded-lg border border-indigo-300 px-3 text-indigo-900 disabled:opacity-50">Add a word or phrase</button>
        {draft && <div data-gloss-draft role="group" aria-label={draft.id ? 'Edit word support' : 'Add word support'} className="space-y-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
          <label className="block font-semibold">Word or phrase from the original<input ref={termRef} type="text" maxLength={160} value={draft.query} readOnly={!!draft.id} onChange={event => updateDraft({ query: event.target.value, start: '' })} className="mt-1 min-h-11 w-full min-w-0 rounded border border-slate-400 bg-white px-2 font-normal" /></label>
          {!draft.id && matches.length > 1 && <label className="block font-semibold">Which occurrence?<select value={draft.start} onChange={event => updateDraft({ start: event.target.value })} className="mt-1 min-h-11 w-full min-w-0 rounded border border-slate-400 bg-white px-2 font-normal"><option value="">Choose the word in context</option>{matches.map((match, index) => <option key={match.start} value={String(match.start)}>{index + 1}. {match.context}</option>)}</select></label>}
          {!!draft.query.trim() && !matches.length && <p role="status" className="text-amber-900">No exact match. Copy the word or phrase as it appears in the original.</p>}
          {selected && <p className="break-words text-slate-600"><span className="font-semibold">In context: </span>{selected.context}</p>}
          <label className="block font-semibold">Explanation<textarea ref={definitionRef} rows={3} maxLength={600} value={draft.text} onChange={event => updateDraft({ text: event.target.value })} className="mt-1 w-full min-w-0 rounded border border-slate-400 bg-white p-2 font-normal" /></label>
          <label className="block font-semibold">Importance<select value={draft.priority} onChange={event => updateDraft({ priority: event.target.value })} className="mt-1 min-h-11 w-full min-w-0 rounded border border-slate-400 bg-white px-2 font-normal"><option value="essential">Essential to understanding this passage</option><option value="helpful">Helpful extra explanation</option></select></label>
          <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={draft.pinned} onChange={event => updateDraft({ pinned: event.target.checked })} />Always show in lighter view</label>
          <div className="flex flex-wrap gap-2"><button type="button" disabled={disabled || busy || !selected || !draft.text.trim()} onClick={save} className="min-h-11 rounded-lg bg-indigo-700 px-3 text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save word support'}</button><button type="button" disabled={busy} onClick={finish} className="min-h-11 rounded-lg border border-slate-300 px-3">Done editing</button></div>
        </div>}
        {error && <p role="alert" className="rounded bg-red-50 p-2 text-red-900">{error}</p>}
        {notice && <p role="status" className="rounded bg-indigo-50 p-2 text-indigo-900">{notice}</p>}
        {!entries.length && !draft && <p className="text-slate-600">No word supports yet. Add your own explanation or generate suggestions.</p>}
        <ul className="space-y-2">{entries.map(entry => <li key={entry.id} className="rounded-lg border border-slate-200 p-3"><p className="break-words"><strong>{entry.quote}</strong> — {entry.definition || entry.explanation || entry.text}</p><p className="mt-1 text-xs text-slate-600">{entry.origin === 'educator' ? 'Teacher edited' : 'Suggested'}{entry.priority === 'essential' ? ' · Essential' : ''}</p><div className="mt-2 flex flex-wrap items-center gap-2"><button ref={element => { editRefs.current[entry.id] = element; }} type="button" disabled={disabled || busy} aria-label={'Edit gloss for ' + entry.quote} onClick={() => beginEdit(entry)} className="min-h-11 rounded-lg border border-indigo-300 px-3 text-indigo-900">Edit</button><button type="button" disabled={disabled || busy} aria-label={'Remove gloss for ' + entry.quote} onClick={async () => { const saved = await mutate({ type: 'remove', id: entry.id }, 'Word support removed. It will stay removed when suggestions are refreshed.'); if (saved) { if (draft?.id === entry.id) setDraft(null); addRef.current?.focus(); } }} className="min-h-11 rounded-lg border border-slate-300 px-3">Remove</button><label className="flex min-h-11 items-center gap-2"><input type="checkbox" aria-label={'Always show gloss for ' + entry.quote + ' in lighter view'} checked={entry.pinned === true} disabled={disabled || busy} onChange={event => mutate({ type: 'pin', id: entry.id, pinned: event.target.checked }, event.target.checked ? 'This support will stay visible in lighter view.' : 'This support now follows the lighter-view selection.')} />Always show in lighter view</label></div></li>)}</ul>
      </div>}
    </section>;
  }
