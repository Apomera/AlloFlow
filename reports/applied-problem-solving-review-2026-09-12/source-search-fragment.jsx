// Search results are suggestions to inspect. Only an explicitly chosen reference
// enters the existing learner evidence ledger; no snippet becomes a lesson fact.
function normalizeAppliedChallengeSearchResults(response, foundAt) {
  const seen = new Set();
  const day = /^\d{4}-\d{2}-\d{2}$/.test(foundAt) ? foundAt : '';
  return (Array.isArray(response?.results) ? response.results : []).flatMap(item => {
    const url = appliedChallengeSafeUrl(item?.url || item?.uri || item?.link);
    if (!url || seen.has(url)) return [];
    try { const parsed = new URL(url); if (parsed.username || parsed.password) return []; } catch (_) { return []; }
    seen.add(url);
    return [{ url, title: _apsString(item?.title, 300) || new URL(url).hostname, snippet: _apsString(item?.snippet, 1000), foundAt: day }];
  }).slice(0, 5);
}

function appliedChallengeOutsideReference(result, t) {
  const clean = normalizeAppliedChallengeSearchResults({ results: [result] }, result?.foundAt)[0];
  if (!clean) return '';
  return _apsT(t, 'applied_challenge.search.reference', 'Outside source — not checked') + ': ' + clean.title + '\n' + clean.url + (clean.foundAt ? '\n' + _apsT(t, 'applied_challenge.search.found', 'Found on') + ': ' + clean.foundAt : '');
}

function AppliedChallengeSourceSearch({ t, searchWeb, disabled, rows, onAddReference }) {
  const tx = (key, fallback) => _apsT(t, 'applied_challenge.search.' + key, fallback);
  const [query, setQuery] = React.useState('');
  const [state, setState] = React.useState({ status: 'idle', results: [], query: '', source: '' });
  const token = React.useRef(0);
  const mounted = React.useRef(false);
  const available = !disabled && typeof searchWeb?.search === 'function';
  const allowed = React.useRef(available);
  allowed.current = available;
  React.useEffect(() => {
    mounted.current = true;
    token.current++;
    setState({ status: 'idle', results: [], query: '', source: '' });
    return () => { mounted.current = false; token.current++; };
  }, [available]);
  const search = async () => {
    const submitted = query.trim().slice(0, 240);
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
      const results = normalizeAppliedChallengeSearchResults(response, new Date().toISOString().slice(0, 10));
      const source = ['Serper', 'Serper (direct)'].includes(response?.source) ? tx('google_provider', 'Google results via Serper') : ['SearXNG', 'DuckDuckGo'].includes(response?.source) ? response.source : tx('web_provider', 'Web search');
      setState({ status: response?.offline ? 'offline' : response?.noTransport ? 'unavailable' : results.length ? 'done' : 'empty', results, query: submitted, source });
    } catch (_) {
      if (mounted.current && allowed.current && request === token.current) setState({ status: 'error', results: [], query: submitted, source: '' });
    } finally { clearTimeout(timer); }
  };
  const message = !available ? tx('unavailable', 'Web search is unavailable in this view. You can still add a source you have checked to your evidence.')
    : state.status === 'loading' ? tx('busy', 'Looking for sources…')
    : state.status === 'offline' ? tx('offline', 'You are offline. Reconnect to search, or continue with your lesson evidence.')
    : state.status === 'unavailable' ? tx('connection', 'Search is not connected. Continue with your lesson evidence or try again after connecting search.')
    : state.status === 'error' ? tx('error', 'Search did not finish. Try again, or continue with your lesson evidence.')
    : state.status === 'empty' ? tx('empty', 'No usable source links were returned. Try a more specific topic. An empty search does not settle the question.') : '';
  return <details className='applied-challenge-no-print rounded-xl border border-slate-200 bg-white px-3'>
    <summary className='min-h-11 cursor-pointer text-sm font-semibold'>{tx('heading', 'Find outside evidence')}</summary>
    <div className='space-y-3 pb-3'>
      <p className='text-sm text-slate-700'>{tx('purpose', 'Use this when an option depends on a missing fact or current information. For a question about values, sources can inform your reasons; they cannot decide your position.')}</p>
      <label className='block text-sm font-bold' htmlFor='aps-source-query'>{tx('query', 'Topic or factual question to search')}</label>
      <input id='aps-source-query' type='search' value={query} maxLength={240} disabled={!available || state.status === 'loading'} aria-describedby='aps-source-privacy' onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); search(); } }} className='min-h-11 w-full rounded-xl border border-slate-300 p-3 text-base' />
      <p id='aps-source-privacy' className='text-sm text-slate-600'>{tx('privacy', 'Only this query is sent to the search service. Leave out names and personal details.')}</p>
      <button type='button' className='aps-button' disabled={!available || query.trim().length < 3 || state.status === 'loading'} onClick={search}>{tx('action', 'Search for sources')}</button>
      <p role='status' className='text-sm text-slate-700'>{message || (state.status === 'done' ? _apsFill(tx('results', 'Sources to review for “{query}”'), { query: state.query }) : '')}</p>
      {available && state.status === 'done' && <>
        <p className='text-sm text-slate-600'>{state.source} · {tx('snippet_note', 'Search snippets are previews. Open the source and check its author, date, and relevance before using it. “Found on” is the search date, not the publication date.')}</p>
        <ul className='space-y-3'>{state.results.map(result => {
          const added = rows.some(row => row.evidence.includes(result.url));
          return <li key={result.url} className='min-w-0 rounded-xl border border-slate-200 p-3'>
            <a href={result.url} target='_blank' rel='noopener noreferrer' className='inline-block min-h-11 break-words text-sm font-bold text-blue-800 underline'>{result.title}<span className='sr-only'> {tx('new_tab', '(opens in a new tab)')}</span></a>
            <p className='break-all text-xs text-slate-600'>{new URL(result.url).hostname} · {tx('found', 'Found on')} {result.foundAt}</p>
            {result.snippet && <p className='mt-2 text-sm text-slate-700'><strong>{tx('snippet', 'Search snippet:')}</strong> {result.snippet}</p>}
            {onAddReference && <button type='button' className='aps-button mt-3' disabled={added || rows.length >= 12} onClick={() => onAddReference(result)}>{added ? tx('added', 'Reference added') : tx('add', 'Add reference to my evidence')}</button>}
          </li>;
        })}</ul>
        {onAddReference && <p className='text-sm text-slate-600'>{rows.length >= 12 ? tx('full', 'Your evidence table has 12 rows. Edit or remove a row before adding another reference.') : tx('reference_note', 'Adding a reference leaves it marked “Needs checking.” Write the claim it informs and explain what you found in your own words.')}</p>}
      </>}
    </div>
  </details>;
}
