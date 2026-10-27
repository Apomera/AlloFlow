import { roomDebrief } from './connected_escape_room_learning.js';
import { readReflection, saveReflection, reflectionKey } from './connected_escape_room_reflection.js';
const React = window.React;
const tr = (t, key, fallback, params = {}) => {
  const full = 'connected_escape.' + key, value = typeof t === 'function' ? t(full, params) : '';
  return Object.entries(params).reduce((s, [k, v]) => s.replaceAll('{' + k + '}', String(v)), typeof value === 'string' && value && value !== full ? value : fallback);
};
function PersonalReflection({room,scope,t}) {
  const storage = () => { try { return window.localStorage; } catch (_) { return null; } };
  const storageKey=reflectionKey(room,scope);
  const [entry] = React.useState(() => readReflection(storage(),room,scope));
  const [text,setText] = React.useState(entry.text);
  const [status,setStatus] = React.useState(entry.status);
  React.useEffect(() => { const next=readReflection(storage(),room,scope);setText(next.text);setStatus(next.status); },[storageKey]);
  const download = () => { const blob=new Blob([room.title+'\n\n'+text],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='escape-room-reflection.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),0); };
  return <section data-room-personal-reflection><h4>{tr(t,'personal_reflection_title','Your explanation')}</h4><p>{tr(t,'personal_reflection_help','Explain how two discoveries connect, then apply the idea to a new example. This response is unscored. Save it on this device or download it to share with your teacher.')}</p><label>{tr(t,'personal_reflection_label','My evidence, connection, and new example')}<textarea maxLength={4000} value={text} onChange={event=>{setText(event.target.value);setStatus('unsaved');}}/></label><div className="cer-row"><button type="button" disabled={!scope} onClick={()=>setStatus(saveReflection(storage(),room,scope,text)?'saved':'unavailable')}>{tr(t,'personal_reflection_save','Save on this device')}</button><button type="button" disabled={!text.trim()} onClick={download}>{tr(t,'personal_reflection_download','Download my explanation')}</button></div><p role="status" className="cer-muted">{status==='saved'?tr(t,'personal_reflection_saved','Saved on this device. This has not been sent to your teacher.'):status==='unavailable'?tr(t,'personal_reflection_unavailable','Device storage is unavailable. Your text remains here; download a copy before leaving.'):status==='preview'?tr(t,'personal_reflection_preview','Preview responses are not saved.'):status==='unsaved'?tr(t,'personal_reflection_unsaved','Changes not yet saved.'):''}</p></section>;
}
export function RoomDebrief({ room, progress, solo = false, teacher = false, onSelect, headingRef, reflectionScope, t }) {
  const recap = roomDebrief(room, progress);
  if (!recap) return null;
  return <section className="cer-panel cer-debrief" data-room-debrief aria-label={tr(t, 'debrief', 'Room debrief')}>
    <h3 ref={headingRef} tabIndex={-1}>{tr(t, 'exit_open', 'The exit is open!')}</h3>
    <p>{room.debrief}</p>
    <p>{solo ? tr(t, 'solo_recap', 'You connected {count} discoveries to open the exit.', { count: recap.discoveries }) : tr(t, 'shared_recap', 'Your team connected {count} discoveries to open the exit.', { count: recap.discoveries })}</p>
    <p className="cer-muted">{solo ? tr(t, 'solo_support_recap', 'Hints revealed: {hints}', { hints: recap.hints }) : tr(t, 'support_recap', 'Hints revealed: {hints} · Objects completed with teacher support: {supported}', { hints: recap.hints, supported: recap.supported })}</p>
    <details data-debrief-trail><summary>{tr(t, 'review_discovery_trail', 'Review how the discoveries fit together')}</summary>
      <p className="cer-muted">{tr(t, 'debrief_trail_help', 'Open an object to connect the evidence you found with its discovery and reasoning.')}</p>
      {recap.objects.map(object => <details key={object.id} data-debrief-object={object.id}><summary>{object.name}</summary>
        {object.objective && <p><strong>{tr(t, 'learning_connection', 'Learning connection: ')}</strong>{object.objective}</p>}
        {object.evidence.length > 0 && <div className="cer-evidence-context"><h4>{tr(t, 'evidence_used', 'Evidence that connected this object')}</h4>{object.evidence.map(item => <div key={item.id}><strong>{item.name}</strong><p>{item.text}</p></div>)}</div>}
        {object.explanation && <><h4>{tr(t, 'why_it_worked', 'Why it worked')}</h4><p>{object.explanation}</p></>}
        {object.sourceQuote && <><h4>{tr(t, 'lesson_connection', 'From the lesson')}</h4><blockquote>{object.sourceQuote}</blockquote></>}
        <p><strong>{object.discovery.name}</strong></p><p>{object.discovery.text}</p>
        {object.supported && <p className="cer-muted">{tr(t, 'teacher_assisted', 'Completed with teacher support')}</p>}
        {onSelect && <button type="button" data-revisit-object={object.id} onClick={() => onSelect(object.id)}>{tr(t, 'revisit_object', 'Revisit {name}', { name: object.name })}</button>}
      </details>)}
    </details>
    <details data-debrief-discussion><summary>{teacher ? tr(t, 'discuss_learning', 'Discuss the learning together') : solo ? tr(t, 'reflect_learning', 'Reflect on what you discovered') : tr(t, 'team_reflect_learning', 'Reflect with your team')}</summary>
      <ul className="cer-facts"><li>{tr(t, 'reflection_clue', 'Which clue helped you most? Explain how it changed your thinking.')}</li><li>{tr(t, 'reflection_connections', 'Choose two discoveries from different parts of the room. How did they work together to open the exit?')}</li><li>{tr(t, 'reflection_transfer', 'Where else could you use an idea from this lesson? Give an example.')}</li></ul>
      <p className="cer-muted">{tr(t, 'reflection_help', 'Use the discovery review as evidence. You can discuss these prompts or reflect quietly at your own pace.')}</p>
    </details>
    {!teacher && <PersonalReflection key={reflectionScope || 'preview'} room={room} scope={reflectionScope} t={t}/>}
  </section>;
}
