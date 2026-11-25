// Shared between Canvas and standalone AI backend settings.
function AllobotSearchSettings({ t }) {
  const tx = (key, fallback) => { const value = typeof t === 'function' ? t(key) : ''; return value && value !== key ? value : fallback; };
  const isLocked = () => typeof window !== 'undefined' && (
    window.__alloAiSecretsLocked === true
    || window.__alloQrStudentMode === true
    || window._alloQrBlocked === true
    || window.__alloStudentAiDisabled === true
    || window.__alloOfflineOnly === true
    || Boolean(window.AlloModules && window.AlloModules.StudentPolicy && (window.AlloModules.StudentPolicy.aiDisabled === true || window.AlloModules.StudentPolicy.aiEnabled === false))
  );
  const [locked, setLocked] = React.useState(isLocked);
  const read = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}', (k, v) => (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (_) { return {}; }
  };
  const managed = typeof window !== 'undefined' ? window.ALLOFLOW_MANAGED_AI_POLICY : null;
  const managedSearchOff = managed != null && (managed.enabled === false || managed.version !== 1 || !Array.isArray(managed.connections) || managed.allowExternalSearch !== true);
  const [key, setKey] = React.useState(() => isLocked() ? '' : String(read().serperApiKey || ''));
  const [hasSavedKey, setHasSavedKey] = React.useState(() => !isLocked() && Boolean(String(read().serperApiKey || '').trim()));
  const [enabled, setEnabled] = React.useState(() => {
    if (isLocked()) return false;
    const cfg = read();
    return cfg.allobotWebSearch === true || (cfg.allobotWebSearch !== false && (!cfg.backend || cfg.backend === 'gemini'));
  });
  const [saved, setSaved] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => {
    const sync = () => {
      const nextLocked = isLocked();
      setLocked(nextLocked);
      if (nextLocked) {
        setKey(''); setHasSavedKey(false); setEnabled(false); setSaved(false); setFailed(false);
      } else {
        const cfg = read();
        const savedKey = String(cfg.serperApiKey || '');
        setKey(savedKey);
        setHasSavedKey(Boolean(savedKey.trim()));
        setEnabled(cfg.allobotWebSearch === true || (cfg.allobotWebSearch !== false && (!cfg.backend || cfg.backend === 'gemini')));
      }
    };
    const events = ['alloflow:ai-key-lock-changed', 'alloflow:student-ai-config-changed', 'alloflow:ai-config-changed', 'storage'];
    events.forEach(ev => window.addEventListener(ev, sync));
    return () => { events.forEach(ev => window.removeEventListener(ev, sync)); };
  }, []);
  React.useEffect(() => {
    if (locked) { setKey(''); setHasSavedKey(false); setSaved(false); setFailed(false); }
  }, [locked]);
  if (locked) return null;
  const save = patch => {
    if (isLocked()) return;
    try {
      const next = { ...read(), ...patch };
      localStorage.setItem('alloflow_ai_config', JSON.stringify(next));
      setHasSavedKey(Boolean(String(next.serperApiKey || '').trim()));
      setSaved(true); setFailed(false);
      try { window.dispatchEvent(new Event('alloflow:ai-config-changed')); } catch (_) {}
    }
    catch (_) { setFailed(true); setSaved(false); }
  };
  const helpId = React.useId();
  const focusBtn = 'min-h-11 px-3 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  return <section aria-label={tx('chat_guide.search_settings', 'Allobot web sources')} className="border-t border-slate-200 pt-4 space-y-2 text-slate-800">
    {managed != null && <p role="status" aria-live="polite" className="text-xs">{tx('chat_guide.managed_policy', 'Managed AI restrictions are active. Requests to unapproved endpoints or credentials are blocked. This policy currently permits approved text connections only; media generation is disabled. Your administrator controls external research access.')}</p>}
    <h3 className="font-bold text-sm">{tx('chat_guide.search_settings', 'Allobot web sources')}</h3>
    <label className="flex min-h-11 items-start gap-2 py-1 text-sm cursor-pointer">
      <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" checked={!managedSearchOff && enabled} disabled={managedSearchOff} onChange={event => { setEnabled(event.target.checked); save({ allobotWebSearch: event.target.checked }); }} />
      {tx('chat_guide.search_enabled', 'Look up public sources for UDL, standards and research questions')}
    </label>
    <label className="block text-sm">
      <span className="block font-medium mb-1">{tx('chat_guide.personal_serper', 'Your Serper API key (optional)')}</span>
      <input type="password" autoComplete="off" spellCheck={false} value={key} placeholder="serper.dev" disabled={managedSearchOff} aria-describedby={helpId + '-key'}
        onChange={event => { setKey(event.target.value); setSaved(false); }}
        onKeyDown={event => { if ((event.nativeEvent && event.nativeEvent.isComposing) || event.isComposing || event.keyCode === 229 || event.ctrlKey || event.metaKey || event.altKey) return; if (event.key === 'Enter' && !managedSearchOff) { event.preventDefault(); save({ serperApiKey: key.trim() }); } }}
        className="min-h-11 w-full min-w-0 rounded-lg border border-slate-300 p-2 text-slate-900 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:opacity-50" />
    </label>
    <div className="flex flex-wrap gap-2">
      <button type="button" className={focusBtn} disabled={managedSearchOff} onClick={() => save({ serperApiKey: key.trim() })}>{tx('chat_guide.save_search_key', 'Save search key')}</button>
      <button type="button" className={focusBtn} disabled={!hasSavedKey && !key.trim()} onClick={() => { setKey(''); save({ serperApiKey: '' }); }}>{tx('chat_guide.remove_search_key', 'Remove personal key')}</button>
    </div>
    <p role={failed ? 'alert' : 'status'} aria-live={failed ? 'assertive' : 'polite'} aria-atomic="true" className={'text-xs ' + (failed ? 'font-semibold text-red-700' : 'text-slate-700')}>{failed ? tx('chat_guide.search_save_failed', 'Could not save these settings in this browser.') : saved ? tx('chat_guide.search_saved', 'Search settings saved.') : ''}</p>
    <p id={helpId + '-key'} className="text-xs leading-relaxed">{tx('chat_guide.search_key_help', 'Leave blank to use the configured search service or Gemini Google grounding when available. A saved personal key takes priority for Allobot lookups and Serper searches. It is stored in this browser and can be read by code running in the app; use a personal key, not a shared district secret.')}</p>
    <p className="text-xs leading-relaxed">{tx('chat_guide.search_privacy_help', 'Serper is outside your district Google environment. Any topic can be searched. A search that looks like it contains an email address, phone number or ID number is not sent, with or without a personal key. Ordinary Allobot replies send your current question; you can include recent messages or a reviewed excerpt for one reply. Other generation workflows use their task inputs. Use a district-approved connection for student information. A Gemini API key alone does not establish district coverage. Local AI requires this lookup option to be enabled.')}</p>
  </section>;
}
