function appliedChallengeEvidenceLinks(evidence) {
  return normalizeAppliedChallengeSearchResults({ results: _apsString(evidence, 2200).split(/\r?\n/).map(line => line.trim()).filter(line => /^https?:\/\/\S+$/i.test(line)).map(url => ({ url })) }, '');
}

function appliedChallengeAttachReference(rows, result, rowId, newId, t) {
  const clean = normalizeAppliedChallengeSearchResults({ results: [result] }, result?.foundAt)[0];
  const reference = clean && appliedChallengeOutsideReference(clean, t);
  if (!reference) return { ok: false, reason: 'invalid' };
  const existing = rowId ? rows.find(row => row.id === rowId) : null;
  if (rowId && !existing) return { ok: false, reason: 'missing' };
  if ((existing ? [existing] : rows).some(row => appliedChallengeEvidenceLinks(row.evidence).some(link => link.url === clean.url))) return { ok: false, reason: 'duplicate' };
  if (!existing && rows.length >= 12) return { ok: false, reason: 'capacity' };
  const evidence = existing?.evidence ? existing.evidence + '\n\n' + reference : reference;
  if (evidence.length > 2200) return { ok: false, reason: 'length' };
  const id = existing?.id || newId;
  return { ok: true, id, rows: existing ? rows.map(row => row.id === id ? { ...row, evidence, status: 'needs-check' } : row) : rows.concat({ id, claim: '', evidence, tradeoff: '', status: 'needs-check' }) };
}

function AppliedChallengeEvidenceSources({ evidence, rowId, t, editable = false }) {
  const links = appliedChallengeEvidenceLinks(evidence);
  if (!links.length) return null;
  const tx = (key, fallback) => _apsT(t, 'applied_challenge.source_review.' + key, fallback);
  return <div className='min-w-0 space-y-2 lg:col-span-2'>
    <ul className='space-y-1'>{links.map(link => <li key={link.url}><a href={link.url} target='_blank' rel='noopener noreferrer' className='inline-block min-h-11 break-all py-2 text-sm font-semibold text-blue-800 underline'>{_apsFill(tx('open', 'Open source: {domain}'), { domain: new URL(link.url).hostname })}<span className='sr-only'> {tx('new_tab', '(opens in a new tab)')}</span></a></li>)}</ul>
    {editable && <details className='applied-challenge-no-print rounded-xl bg-slate-50 px-3 text-sm text-slate-700'>
      <summary className='min-h-11 cursor-pointer font-semibold'>{tx('heading', 'Review this source before using it')}</summary>
      <ol className='list-decimal space-y-2 pb-3 pl-5'>
        <li>{tx('author', 'Who wrote it, and what makes them a useful source for this question?')}</li>
        <li>{tx('date', 'When was it published or updated? Does that date matter here? If you cannot find it, say so.')}</li>
        <li>{tx('connection', 'What does it actually show, and how does that support or challenge your claim?')}</li>
        <li>{tx('limits', 'What does it leave uncertain? Does it apply to this situation, or do you need another source or a local check?')}</li>
      </ol>
      <p className='pb-3'>{tx('write', 'Record your source check in the evidence field in your own words. Opening a link does not verify a claim.')}</p>
      <button type='button' className='aps-button mb-3' onClick={() => document.getElementById('aps-ledger-evidence-' + rowId)?.focus()}>{tx('action', 'Write my source check')}</button>
    </details>}
  </div>;
}

function AppliedChallengeSourceSearch({ t, searchWeb, disabled, rows, onAddReference, session }) {
  const tx = (key, fallback) => _apsT(t, 'applied_challenge.search.' + key, fallback);
  const idle = () => ({ status: 'idle', results: [], query: '', source: '' });
  const cached = session?.current;
  const [query, setQuery] = React.useState(() => cached?.query || '');
  const [state, setState] = React.useState(() => cached?.state?.status === 'loading' ? { ...idle(), status: 'interrupted' } : cached?.state || idle());
  const [expanded, setExpanded] = React.useState(() => !!cached?.expanded);
  const [targetRow, setTargetRow] = React.useState(() => cached?.targetRow || '');
  const token = React.useRef(0);
  const mounted = React.useRef(false);
  const available = !disabled && typeof searchWeb?.search === 'function';
  const allowed = React.useRef(available);
  allowed.current = available;
  const selectedRow = rows.find(row => row.id === targetRow);
  const destination = selectedRow?.id || '';
  React.useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; token.current++; };
  }, []);
  React.useEffect(() => {
    token.current++;
    if (!available) { setQuery(''); setState(idle()); setExpanded(false); setTargetRow(''); }
  }, [available]);
  React.useEffect(() => {
    if (session) session.current = { ...session.current, query: available ? query : '', state: available ? state : idle(), expanded: available && expanded, targetRow: available ? destination : '' };
  }, [query, state, expanded, destination, available, session]);
  const search = async () => {
    const submitted = query.trim().slice(0, 200);
    if (!available || submitted.length < 3 || state.status === 'loading') return;
    const request = ++token.current;
    setState({ status: 'loading', results: [], query: submitted, source: '' });
    let timer;
    try {
      const response = await Promise.race([
        searchWeb.search(submitted, 5, submitted),
        new Promise((_, reject) => { timer = setTimeout(() => reject(Error('timeout')), 25000); }),
      ]);
      if (!mounted.current || !allowed.current || request !== token.current) return;
      const now = new Date();
      const day = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
      const results = normalizeAppliedChallengeSearchResults(response, day);
      const source = ['Serper', 'Serper (direct)'].includes(response?.source) ? tx('google_provider', 'Google results via Serper') : ['SearXNG', 'DuckDuckGo'].includes(response?.source) ? response.source : tx('web_provider', 'Web search');
      setState({ status: response?.offline ? 'offline' : response?.noTransport ? 'unavailable' : results.length ? 'done' : 'empty', results, query: submitted, source });
    } catch (_) {
      if (mounted.current && allowed.current && request === token.current) setState({ status: 'error', results: [], query: submitted, source: '' });
    } finally { clearTimeout(timer); }
  };
  const clearSearch = () => { token.current++; setQuery(''); setState(idle()); setTargetRow(''); document.getElementById('aps-source-query')?.focus(); };
  const message = !available ? tx('unavailable', 'Web search is unavailable in this view. You can still add a source you have checked to your evidence.')
    : state.status === 'loading' ? tx('busy', 'Looking for sources…')
    : state.status === 'interrupted' ? tx('interrupted', 'The unfinished search stopped when you left this step. Your query is ready to try again.')
    : state.status === 'offline' ? tx('offline', 'You are offline. Reconnect to search, or continue with your lesson evidence.')
    : state.status === 'unavailable' ? tx('connection', 'Search is not connected. Continue with your lesson evidence or try again after connecting search.')
    : state.status === 'error' ? tx('error', 'Search did not finish. Try again, or continue with your lesson evidence.')
    : state.status === 'empty' ? tx('empty', 'No usable source links were returned. Try a more specific topic. An empty search does not settle the question.') : '';
  return <details open={expanded} onToggle={event => setExpanded(event.currentTarget.open)} className='applied-challenge-no-print rounded-xl border border-slate-200 bg-white px-3'>
    <summary className='min-h-11 cursor-pointer text-sm font-semibold'>{tx('heading', 'Find outside evidence')}</summary>
    <div className='space-y-3 pb-3'>
      <p className='text-sm text-slate-700'>{tx('purpose', 'Use this when an option depends on a missing fact or current information. For a question about values, sources can inform your reasons; they cannot decide your position.')}</p>
      <label className='block text-sm font-bold' htmlFor='aps-source-query'>{tx('query', 'Topic or factual question to search')}</label>
      <input id='aps-source-query' type='search' value={query} maxLength={200} disabled={!available || state.status === 'loading'} aria-describedby='aps-source-privacy' onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); search(); } }} className='min-h-11 w-full rounded-xl border border-slate-300 p-3 text-base' />
      <p id='aps-source-privacy' className='text-sm text-slate-600'>{tx('privacy', 'Only this query is sent to the search service. Leave out names and personal details.')}</p>
      <div className='flex flex-wrap gap-2'><button type='button' className='aps-button' disabled={!available || query.trim().length < 3 || state.status === 'loading'} onClick={search}>{tx('action', 'Search for sources')}</button>{available && (query || state.status !== 'idle') && <button type='button' className='aps-button' onClick={clearSearch}>{tx('clear', 'Clear this search')}</button>}</div>
      <p role='status' className='text-sm text-slate-700'>{message || (state.status === 'done' ? _apsFill(tx('results', 'Sources to review for “{query}”'), { query: state.query }) : '')}</p>
      {available && state.status === 'done' && <>
        <p className='text-sm text-slate-600'>{state.source} · {tx('snippet_note', 'Search snippets are previews. Open the source and check its author, date, and relevance before using it. “Found on” is the search date, not the publication date.')}</p>
        {onAddReference && rows.length > 0 && <label className='block text-sm font-bold'>{tx('destination', 'Add the reference to')}<select value={destination} onChange={event => setTargetRow(event.target.value)} className='mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white p-2 text-sm'><option value='' disabled={rows.length >= 12}>{tx('new_row', 'A new evidence row')}</option>{rows.map((row, index) => <option key={row.id} value={row.id}>{_apsFill(tx('existing_row', 'Row {n}: {claim}'), { n: index + 1, claim: _apsString(row.claim, 80).trim() || tx('unnamed', 'No claim written yet') })}</option>)}</select></label>}
        <ul className='space-y-3'>{state.results.map(result => {
          const check = appliedChallengeAttachReference(rows, result, destination, 'search-preview', t);
          const added = check.reason === 'duplicate';
          return <li key={result.url} className='min-w-0 rounded-xl border border-slate-200 p-3'>
            <a href={result.url} target='_blank' rel='noopener noreferrer' className='inline-block min-h-11 break-words text-sm font-bold text-blue-800 underline'>{result.title}<span className='sr-only'> {tx('new_tab', '(opens in a new tab)')}</span></a>
            <p className='break-all text-xs text-slate-600'>{new URL(result.url).hostname} · {tx('found', 'Found on')} {result.foundAt}</p>
            {result.snippet && <p className='mt-2 text-sm text-slate-700'><strong>{tx('snippet', 'Search snippet:')}</strong> {result.snippet}</p>}
            {onAddReference && <><button type='button' className='aps-button mt-3' disabled={!check.ok} onClick={() => onAddReference(result, destination)}>{added ? tx('added', 'Reference added') : tx('add', 'Add reference to my evidence')}</button>{check.reason === 'length' && <p className='mt-2 text-sm text-amber-900'>{tx('length', 'This row has too much writing to add the full reference. Choose another row, create a new one, or edit it first.')}</p>}</>}
          </li>;
        })}</ul>
        {onAddReference && <p className='text-sm text-slate-600'>{!destination && rows.length >= 12 ? tx('full', 'Your evidence table has 12 rows. Choose an existing row above to add a reference.') : tx('reference_note', 'Adding a reference leaves it marked “Needs checking.” Write the claim it informs and explain what you found in your own words.')}</p>}
        <p className='text-xs text-slate-600'>{tx('session', 'You can switch steps and return to these results. Clearing the search, leaving this workspace, or reloading clears them. References you added stay in your writing.')}</p>
      </>}
    </div>
  </details>;
}
