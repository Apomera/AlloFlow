function AllobotContextControls({ messages, busy, setInput, clearChat, t, theme = 'light', taskActive = false }) {
  const tx = (key, fallback) => { const value = typeof t === 'function' ? t(key) : ''; return value && value !== key ? value : fallback; };
  const privacy = window.AlloFlowChatPrivacy;
  const [choice, setChoice] = React.useState(() => privacy.get());
  const [topic, setTopic] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [panel, setPanel] = React.useState('');
  const panelId = React.useId();
  React.useEffect(() => { const update = () => setChoice(privacy.get()); window.addEventListener('alloflow:chat-context', update); return () => window.removeEventListener('alloflow:chat-context', update); }, []);
  const [, refreshDestination] = React.useState(0);
  React.useEffect(() => {
    const refresh = () => refreshDestination(value => value + 1);
    window.addEventListener('alloflow:ai-config-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => { window.removeEventListener('alloflow:ai-config-changed', refresh); window.removeEventListener('storage', refresh); };
  }, []);
  const destination = privacy.destination();
  const hasContext = choice.recent || Boolean(choice.excerpt);
  const recent = privacy.recentMessages(messages);
  const surface = theme === 'dark' ? 'border-slate-600 bg-slate-900 text-slate-100' : theme === 'contrast' ? 'border-white bg-black text-white' : 'border-slate-300 bg-white text-slate-900';
  const field = theme === 'dark' ? 'border-slate-500 bg-slate-800 text-slate-100' : theme === 'contrast' ? 'border-white bg-black text-white' : 'border-slate-400 bg-white text-slate-900';
  const button = 'min-h-11 border rounded px-2 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 ' + field;
  const sections = [
    ['context', hasContext ? tx('chat_guide.extra_context_added', 'Context added') : tx('chat_guide.add_context', 'Add context')],
    ['search', tx('chat_guide.web_search', 'Web search')],
    ['privacy', tx('chat_guide.privacy_details', 'Privacy')],
  ];
  return <section aria-label={tx('chat_guide.send_privacy', 'AI destination and context')} className={'border-t p-3 text-sm shrink-0 min-w-0 ' + surface}>
    <p className="break-words">{destination.active ? tx('chat_guide.reply_ai', 'Replying with') : tx('chat_guide.selected_ai', 'Selected AI')}: <strong>{destination.label}</strong></p>
    <p className="mt-1 mb-2" role="status">{taskActive ? tx('chat_guide.task_context_summary', 'Lesson plans and app actions use the information needed for that task.') : hasContext ? tx('chat_guide.next_chat_with_context', 'Next chat reply: your message + added context.') : tx('chat_guide.next_chat_message_only', 'Next chat reply: only your message is included.')}</p>
    <div className="flex flex-wrap gap-2">
      {sections.map(([name, label]) => <button key={name} type="button" aria-expanded={panel === name} aria-controls={panelId + '-' + name} onClick={() => { setPanel(panel === name ? '' : name); setNotice(''); }} className={button + (panel === name ? ' font-bold underline' : '')}>
        <span aria-hidden="true">{panel === name ? '− ' : '+ '}</span>{label}
      </button>)}
    </div>
    <div hidden={!panel} className="mt-2 overflow-y-auto overscroll-contain" style={{ maxHeight: 'min(16rem, 30vh)' }}>
      <div id={panelId + '-context'} hidden={panel !== 'context'}>
        <p className="my-2">{tx('chat_guide.extra_context_help', 'Want to refer to an earlier reply or a piece of text? Choose what the AI can use below. These choices apply to one chat request, then clear.')}</p>
        <label className="flex gap-2 items-start my-2 min-h-11"><input type="checkbox" checked={choice.recent} disabled={busy} onChange={e => privacy.set({ ...choice, recent: e.target.checked })} className="mt-1 h-4 w-4 shrink-0" /><span>{tx('chat_guide.include_recent_chat', 'Include recent chat messages')}<span className="block mt-1">{tx('chat_guide.recent_chat_limit', 'Up to 4 messages, shortened to 500 characters each. Preview below.')}</span></span></label>
        {choice.recent && <pre className={'whitespace-pre-wrap break-words border rounded p-2 font-sans ' + field} aria-label={tx('chat_guide.context_preview', 'Recent-message preview')}>{recent.length ? recent.map(m => `${m.role === 'user' ? tx('chat_guide.context_you', 'You') : 'Allobot'}: ${m.text}`).join('\n') : tx('chat_guide.no_recent_chat', 'No earlier chat messages to include yet.')}</pre>}
        <label className="block my-2">{tx('chat_guide.paste_background', 'Paste background text (optional)')}<textarea rows={2} maxLength={1500} value={choice.excerpt} disabled={busy} onChange={e => privacy.set({ ...choice, excerpt: e.target.value })} placeholder={tx('chat_guide.background_example', 'For example, a paragraph you want help adapting.')} className={'block w-full min-w-0 border rounded p-2 mt-1 ' + field} /></label>
        <p className="my-2">{tx('chat_guide.background_limit', 'Up to 1,500 characters. Added context goes to your selected AI, never to web search.')}</p>
        {hasContext && <button type="button" disabled={busy} onClick={() => privacy.clear()} className={button}>{tx('chat_guide.remove_extra_context', 'Remove added context')}</button>}
      </div>
      <div id={panelId + '-search'} hidden={panel !== 'search'}>
        <p className="my-2">{tx('chat_guide.web_search_help', 'Look up public sources about a general topic. Add the search to your message, review it, then send. Keep names and student details out of the topic.')}</p>
        <label className="block my-2">{tx('chat_guide.public_topic', 'Topic to search')}<input type="text" maxLength={200} value={topic} disabled={busy} onChange={e => setTopic(e.target.value)} placeholder={tx('chat_guide.research_topic_hint', 'For example: causes of the American Revolution')} className={'block w-full min-w-0 border rounded p-2 mt-1 ' + field} /></label>
        <button type="button" disabled={busy || !topic.trim()} onClick={() => { setInput(`Search for ${topic.trim()}`); setNotice(tx('chat_guide.research_topic_ready', 'Search placed in the message box. Review it, then send.')); }} className={button}>{tx('chat_guide.draft_web_search', 'Add search to message')}</button>
        <p className="my-2">{tx('chat_guide.search_context_separate', 'Web search receives the public topic, not your added context. Availability depends on your AI and search settings.')}</p>
      </div>
      <div id={panelId + '-privacy'} hidden={panel !== 'privacy'}>
        <p className="my-2">{tx('chat_guide.chat_sharing_help', 'Chat replies use your message and any context you choose. Lesson plans and app actions also use the inputs needed for that task. Some questions may look up public references.')}</p>
        <p className="my-2">{tx('chat_guide.student_data_connection', 'Use a district-approved AI connection before including student information.')}</p>
        <details className="my-2">
          <summary className="cursor-pointer min-h-11 py-2">{tx('chat_guide.connection_details', 'AI connection details')}</summary>
          <p className="my-2">{tx('chat_guide.connection_address_help', 'This is the technical address the app uses to contact the AI. It is not a webpage to open.')}</p>
          <p className="break-words"><strong>{tx('chat_guide.connection_address', 'Service address')}:</strong> <code style={{ overflowWrap: 'anywhere' }}>{destination.origin || tx('chat_guide.address_not_available', 'Not available')}</code></p>
          {destination.managed && <p className="my-2">{tx('chat_guide.managed_checks', 'Managed connection checks are enabled. This label does not verify district approval.')}</p>}
        </details>
        <details className="my-2">
          <summary className="cursor-pointer min-h-11 py-2">{tx('chat_guide.chat_storage_details', 'Chat history and saved copies')}</summary>
          <p className="my-2">{tx('chat_guide.chat_storage', 'Live chat stays in this session until you clear it or reload. Saving chat or advice adds a separate item to History and its configured storage or sync. Delete saved items in History. Recovery snapshots and exported files can retain separate copies; manage those separately. Clearing here does not delete saved copies or provider records.')}</p>
          <button type="button" disabled={busy} onClick={() => { privacy.clear(); clearChat(); setNotice(tx('chat_guide.chat_cleared', 'Live conversation and pending context cleared. Saved History items are unchanged.')); }} className={button}>{tx('chat_guide.clear_live_chat', 'Clear live conversation')}</button>
        </details>
      </div>
      <p role="status" className={notice ? 'my-2' : ''}>{notice}</p>
    </div>
  </section>;
}

function AllobotAdviceSave({ text, question, evidence, save, busy, t, className = '' }) {
  const tx = (key, fallback) => { const value = typeof t === 'function' ? t(key) : ''; return value && value !== key ? value : fallback; };
  const [includeQuestion, setIncludeQuestion] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [notice, setNotice] = React.useState('');
  const pending = React.useRef(false);
  React.useEffect(() => { setIncludeQuestion(false); setNotice(''); }, [text, question]);
  const saveAdvice = async () => {
    if (pending.current || busy) return;
    pending.current = true; setSaving(true); setNotice('');
    try {
      const result = await save(text, includeQuestion ? question : '', evidence);
      setNotice(result?.ok === false ? tx('chat_guide.save_failed', 'Advice could not be saved. Try again.') : tx('chat_guide.saved_without_ai', 'Advice copied to History without another AI request.'));
      if (result?.ok !== false) setIncludeQuestion(false);
    } catch (_) { setNotice(tx('chat_guide.save_failed', 'Advice could not be saved. Try again.')); }
    finally { pending.current = false; setSaving(false); }
  };
  return <section className="mt-2 text-xs" aria-label={tx('chat_guide.save_advice_options', 'Save advice options')}>
    <p>{tx('chat_guide.save_as_shown', 'Copies this answer and its source links to History as shown. No additional AI request.')}</p>
    {question && <label className="flex items-start gap-2 my-2"><input type="checkbox" checked={includeQuestion} disabled={busy || saving} onChange={event => { setIncludeQuestion(event.target.checked); setNotice(''); }} />{tx('chat_guide.save_include_question', 'Also save my preceding question')}</label>}
    {includeQuestion && <pre className="whitespace-pre-wrap break-words max-h-32 overflow-auto border p-2" aria-label={tx('chat_guide.save_question_preview', 'Question to be saved')}>{question}</pre>}
    <button type="button" onClick={saveAdvice} data-help-key="chat_save_advice_btn" disabled={busy || saving} className={'min-h-11 px-3 rounded border ' + className}>{saving ? tx('chat_guide.saving_advice', 'Saving…') : tx('chat_guide.save_advice_history', 'Save advice to History')}</button>
    <p role="status">{notice}</p>
  </section>;
}
