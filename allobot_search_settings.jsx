// Shared between Canvas and standalone AI backend settings.
function AllobotSearchSettings({ t }) {
  const tx = (key, fallback) => { const value = typeof t === 'function' ? t(key) : ''; return value && value !== key ? value : fallback; };
  const read = () => { try { return JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}'); } catch (_) { return {}; } };
  const managed = window.ALLOFLOW_MANAGED_AI_POLICY;
  const managedSearchOff = managed != null && (managed.version !== 1 || managed.allowExternalSearch !== true);
  const [key, setKey] = React.useState(() => String(read().serperApiKey || ''));
  const [enabled, setEnabled] = React.useState(() => read().allobotWebSearch === true || (read().allobotWebSearch !== false && (!read().backend || read().backend === 'gemini')));
  const [saved, setSaved] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const save = patch => {
    try { localStorage.setItem('alloflow_ai_config', JSON.stringify({ ...read(), ...patch })); setSaved(true); setFailed(false); }
    catch (_) { setFailed(true); setSaved(false); }
  };
  return <section aria-label={tx('chat_guide.search_settings', 'Allobot web sources')} className="border-t border-slate-200 pt-4 space-y-2 text-slate-800">
    {managed != null && <p role="status" className="text-xs">{tx('chat_guide.managed_policy', 'Managed AI restrictions are active. Requests to unapproved endpoints or credentials are blocked. This policy currently permits approved text connections only; media generation is disabled. Your administrator controls external research access.')}</p>}
    <h3 className="font-bold text-sm">{tx('chat_guide.search_settings', 'Allobot web sources')}</h3>
    <label className="flex items-start gap-2 text-sm">
      <input type="checkbox" className="mt-1" checked={!managedSearchOff && enabled} disabled={managedSearchOff} onChange={event => { setEnabled(event.target.checked); save({ allobotWebSearch: event.target.checked }); }} />
      {tx('chat_guide.search_enabled', 'Look up public sources for UDL, standards and research questions')}
    </label>
    <label className="block text-sm">
      <span className="block font-medium mb-1">{tx('chat_guide.personal_serper', 'Your Serper API key (optional)')}</span>
      <input type="password" autoComplete="off" spellCheck={false} value={key} placeholder="serper.dev"
        onChange={event => { setKey(event.target.value); setSaved(false); }}
        className="w-full min-w-0 rounded-lg border border-slate-300 p-2 text-slate-900 bg-white" />
    </label>
    <div className="flex flex-wrap gap-2">
      <button type="button" className="min-h-11 px-3 rounded-lg border border-slate-300 bg-white text-sm" onClick={() => save({ serperApiKey: key.trim() })}>{tx('chat_guide.save_search_key', 'Save search key')}</button>
      <button type="button" className="min-h-11 px-3 rounded-lg border border-slate-300 bg-white text-sm" onClick={() => { setKey(''); save({ serperApiKey: '' }); }}>{tx('chat_guide.remove_search_key', 'Remove personal key')}</button>
    </div>
    <p role="status" className="text-xs">{failed ? tx('chat_guide.search_save_failed', 'Could not save these settings in this browser.') : saved ? tx('chat_guide.search_saved', 'Search settings saved.') : ''}</p>
    <p className="text-xs leading-relaxed">{tx('chat_guide.search_key_help', 'Leave blank to use the configured search service or Gemini Google grounding when available. A saved personal key takes priority for Allobot lookups and Serper searches. It is stored in this browser and can be read by code running in the app; use a personal key, not a shared district secret.')}</p>
    <p className="text-xs leading-relaxed">{tx('chat_guide.search_privacy_help', 'Serper is outside your district Google environment. External search accepts approved public topics and standard codes only; other queries are blocked. A personal key does not change this restriction. Ordinary Allobot replies send your current question; you can include recent messages or a reviewed excerpt for one reply. Other generation workflows use their task inputs. Use a district-approved connection for student information. A Gemini API key alone does not establish district coverage. Local AI requires this lookup option to be enabled.')}</p>
  </section>;
}
