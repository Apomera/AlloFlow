function AllobotContextControls({ messages, busy, setInput, clearChat, t }) {
  const tx = (key, fallback) => { const value = typeof t === 'function' ? t(key) : ''; return value && value !== key ? value : fallback; };
  const privacy = window.AlloFlowChatPrivacy;
  const [choice, setChoice] = React.useState(() => privacy.get());
  const [topic, setTopic] = React.useState('');
  const [notice, setNotice] = React.useState('');
  React.useEffect(() => { const update = () => setChoice(privacy.get()); window.addEventListener('alloflow:chat-context', update); return () => window.removeEventListener('alloflow:chat-context', update); }, []);
  const topics = window.WebSearchProvider?.publicSearchQuery?.topics || [];
  return <details className="border-t border-slate-300 bg-white text-slate-900 p-2 text-xs shrink-0">
    <summary className="cursor-pointer min-h-6">{tx('chat_guide.context_controls', 'Privacy and public research')}</summary>
    <div className="max-h-64 overflow-y-auto" role="region" aria-label={tx('chat_guide.privacy_choices', 'Privacy choices')} tabIndex={0}>
    <p className="my-2">{tx('chat_guide.context_default', 'Ordinary replies send your current question only. The options below add context to the next reply, then reset. Lesson-generation and command workflows use the inputs needed for those actions.')}</p>
    <label className="flex gap-2 items-start my-2"><input type="checkbox" checked={choice.recent} disabled={busy} onChange={e => privacy.set({ ...choice, recent: e.target.checked })} />{tx('chat_guide.context_recent', 'Include up to 4 recent messages (500 characters each)')}</label>
    {choice.recent && <pre className="whitespace-pre-wrap break-words max-h-32 overflow-auto border p-2" aria-label={tx('chat_guide.context_preview', 'Recent-message preview')}>{privacy.recentMessages(messages).map(m => `${m.role === 'user' ? 'You' : 'Allobot'}: ${m.text}`).join('\n')}</pre>}
    <label className="block my-2">{tx('chat_guide.context_excerpt', 'Excerpt to include with the next reply (optional)')}<textarea rows={3} maxLength={1500} value={choice.excerpt} disabled={busy} onChange={e => privacy.set({ ...choice, excerpt: e.target.value })} className="block w-full min-w-0 border border-slate-400 rounded p-2 bg-white text-slate-900" /></label>
    <p>{tx('chat_guide.context_destination', 'Included context goes to your selected AI, never to the public-topic picker. Use a district-approved connection for student information.')}</p>
    <label className="block my-2">{tx('chat_guide.public_topic', 'Public research topic')}<select aria-label={tx('chat_guide.public_topic', 'Public research topic')} value={topic} onChange={e => setTopic(e.target.value)} className="block w-full min-w-0 border border-slate-400 rounded p-2 bg-white text-slate-900"><option value="">{tx('chat_guide.choose_public_topic', 'Choose a public topic')}</option>{topics.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
    <button type="button" disabled={busy || !topic} onClick={() => { setInput(`Search for ${topic}`); setNotice(tx('chat_guide.public_topic_ready', 'Public query placed in the message box. Review it, then send.')); }} className="min-h-11 border border-slate-400 rounded px-3 my-2">{tx('chat_guide.use_public_topic', 'Replace message with public query')}</button>
    <p className="my-2">{tx('chat_guide.chat_storage', 'Live chat stays in this session until you clear it or reload. Saving chat or advice adds a separate item to History and its configured storage or sync. Delete saved items in History; clearing here does not delete them or provider records.')}</p>
    <button type="button" disabled={busy} onClick={() => { privacy.clear(); clearChat(); setNotice(tx('chat_guide.chat_cleared', 'Live conversation and pending context cleared. Saved History items are unchanged.')); }} className="min-h-11 border border-slate-400 rounded px-3">{tx('chat_guide.clear_live_chat', 'Clear live conversation')}</button>
    <p role="status" className="my-2">{notice}</p>
    </div>
  </details>;
}
