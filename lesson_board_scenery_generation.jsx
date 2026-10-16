import {emptySupport, addSupportImage, saveSupport} from './lesson_board_support.js';
import {generateTabletopScenery} from './lesson_board_scenery_request.js';
import {tr} from './lesson_board_strings.js';
const React=window.React;
const defaultStyle='Hand-painted watercolor tabletop, soft colors and quiet textures';
const defaults=()=>({enabled:true,style:defaultStyle});
function readPreference(key){try{const value=JSON.parse(localStorage.getItem(key));return {enabled:value?.enabled!==false,style:typeof value?.style==='string'&&value.style.trim()?value.style.slice(0,180):defaultStyle};}catch(_){return defaults();}}
export function useSceneryPreference(appId,uid){
  const key='allo-board-scenery-pref-v1:'+encodeURIComponent(appId||'local')+':'+encodeURIComponent(uid||'local');
  const [record,setRecord]=React.useState(()=>({key,value:readPreference(key)})),value=record.key===key?record.value:readPreference(key);
  const update=patch=>{const next={...value,...patch};setRecord({key,value:next});try{localStorage.setItem(key,JSON.stringify(next));}catch(_){}};
  return {value,update};
}
// A fresh-generation ticket is the only trigger. Opening or resuming a board
// never creates one. This hook stays mounted while its board is being played.
export function useBoardScenery(options){
  const {board,scope,supportState,supportBusy}=options,boardScope=scope+':'+JSON.stringify(board);
  const latest=React.useRef(null),intent=React.useRef(null),active=React.useRef(null),mounted=React.useRef(true),serial=React.useRef(0);
  latest.current={...options,boardScope};
  const [version,tick]=React.useState(0),[status,setStatus]=React.useState({phase:'idle'});
  const cancel=(quiet=false)=>{serial.current++;intent.current=null;active.current?.abort.abort();active.current=null;setStatus({scope:latest.current.boardScope,phase:quiet?'idle':'cancelled'});};
  const queue=(next,style)=>{cancel(true);intent.current={id:++serial.current,scope:scope+':'+JSON.stringify(next),board:next,style};setStatus({scope:intent.current.scope,phase:'queued'});tick(n=>n+1);};
  React.useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;serial.current++;intent.current=null;active.current?.abort.abort();active.current=null;};},[]);
  React.useEffect(()=>{
    const ticket=intent.current;
    if(!ticket)return;
    if(ticket.scope!==boardScope){cancel(true);return;}
    if(supportState?.scope!==boardScope||supportBusy)return;
    const current=()=>mounted.current&&intent.current===ticket&&latest.current.boardScope===ticket.scope&&serial.current===ticket.id;
    // A saved picture or a manual replacement wins over a background request.
    if(supportState.value?.art?.tabletop){active.current?.abort.abort();active.current=null;intent.current=null;setStatus({scope:boardScope,phase:'ready'});return;}
    const job=active.current;
    if(job?.image){
      try{
        const value=supportState.value||emptySupport(),next=addSupportImage({...value,art:{...value.art,style:ticket.style}},job.image,'scene:tabletop',board);
        let revision=supportState.revision,unsaved=false;
        const context=latest.current;
        if(context.playing==='solo'||context.library.some(saved=>JSON.stringify(saved)===JSON.stringify(board))){
          try{revision=saveSupport(localStorage,board,context.appId,context.uid,next,revision).revision;}catch(_){unsaved=true;}
        }
        if(current()){context.onSupport(next,revision);setStatus({scope:boardScope,phase:unsaved?'unsaved':'ready'});}
      }catch(_){if(current())setStatus({scope:boardScope,phase:'failed'});}
      active.current=null;intent.current=null;return;
    }
    if(job)return;
    if(typeof options.callImagen!=='function'){intent.current=null;setStatus({scope:boardScope,phase:'unavailable'});return;}
    const abort=new AbortController();active.current={abort};setStatus({scope:boardScope,phase:'generating'});
    generateTabletopScenery(options.callImagen,board,ticket.style,{signal:abort.signal}).then(image=>{
      if(!current())return;active.current.image=image;tick(n=>n+1);
    }).catch(()=>{if(current()){active.current=null;intent.current=null;setStatus({scope:boardScope,phase:'failed'});}});
  },[version,boardScope,supportState,supportBusy]);
  return {queue,cancel,status:status.scope===boardScope?status:{phase:'idle'}};
}
export function BoardSceneryPreference({value,onChange,disabled,available,t}){
  return <section className="lb-panel" data-board-scenery-preference style={{marginTop:14}}><label>{tr(t,'scenery_appearance','Artwork for new boards')}<select data-board-scenery-mode value={value.enabled?'illustrated':'simple'} disabled={disabled} onChange={event=>onChange({enabled:event.target.value==='illustrated'})}><option value="illustrated">{tr(t,'scenery_illustrated','Illustrated tabletop')}</option><option value="simple">{tr(t,'scenery_simple','Simple tabletop')}</option></select></label>{value.enabled&&<><label>{tr(t,'scenery_style','Scenery style')}<input data-board-scenery-style maxLength={180} value={value.style} disabled={disabled} onChange={event=>onChange({style:event.target.value})}/></label><p className="lb-muted">{available?tr(t,'scenery_default_help','New tabletop boards include generated scenery. Start playing while the artwork finishes, or hide pictures during play.'):tr(t,'scenery_default_unavailable','Built-in terrain is ready to play. Connect an image provider to include generated scenery with new boards.')}</p></>}{!value.enabled&&<p className="lb-muted">{tr(t,'scenery_simple_help','Use the built-in terrain without generating images. This preference is remembered on this device.')}</p>}</section>;
}
export function BoardSceneryStatus({status,onCancel,t}){
  const phase=status.phase,pending=phase==='queued'||phase==='generating';
  if(phase==='idle')return null;
  const message=pending?tr(t,'scenery_background','Your board is ready. Finishing its scenery… You can start playing now.'):phase==='ready'?tr(t,'scenery_background_ready','Board scenery is ready.'):phase==='unsaved'?tr(t,'scenery_background_unsaved','Scenery is ready for this game, but could not be saved. Download a board backup to keep it.'):phase==='cancelled'?tr(t,'scenery_background_cancelled','Using built-in terrain. You can generate scenery later in artwork settings.'):tr(t,'scenery_background_fallback','Your board is ready with built-in terrain. Generated scenery is unavailable; you can try again in artwork settings.');
  return <div className="lb-notice" data-board-scenery-status={phase}><p role="status">{message}</p>{pending&&<button type="button" data-cancel-default-scenery onClick={()=>onCancel()}>{tr(t,'scenery_use_simple','Use simple terrain now')}</button>}</div>;
}
