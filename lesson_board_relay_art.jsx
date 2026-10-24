import { addBoardStyle } from './lesson_board_style.js';
import { tr, arrow, signedAmount } from './lesson_board_strings.js';
import {RelayMiniature,RelayStyles,relayTitle} from './lesson_board_relays_ui.jsx';
const React=window.React;
const stationName=(board,id)=>board.locations.find(node=>node.id===id)?.name||'';
const supplies=(board,reward)=>reward.map((value,index)=>value?signedAmount(value)+' '+board.resources[index]:'').filter(Boolean).join(' · ');

export function relayStopAt(relay,targetId){
  const index=relay?.stops?.findIndex(stop=>stop.targetId===targetId)??-1;
  return index<0?null:{...relay.stops[index],index,status:index<relay.stage?'complete':index===relay.stage?'next':'later'};
}

export function relayStopLabel(stop,t){
  if(!stop)return '';
  const status=stop.status==='complete'?tr(t,'tabletop_relay_stop_complete','Completed'):stop.status==='next'?tr(t,'tabletop_relay_stop_next','Next'):tr(t,'tabletop_relay_stop_later','Later');
  return tr(t,'tabletop_relay_stop_label','Relay stop {number} of 2 · {status}',{number:stop.index+1,status});
}

export function relayStopDescription(board,relay,stop,t){
  if(!stop)return '';
  if(stop.status==='complete')return tr(t,'tabletop_relay_stop_collected','Collected {reward}. This stop will not pay again.',{reward:supplies(board,stop.reward)});
  if(stop.status==='later')return tr(t,'tabletop_relay_stop_waiting','Complete stop 1 at {name} first. Arriving here early or passing through does not pay. Later reward: {reward}.',{name:stationName(board,relay.stops[0].targetId),reward:supplies(board,stop.reward)});
  return tr(t,'tabletop_relay_stop_trigger','Earn {reward} once after a later travel move ends here. Passing through does not complete this stop.',{reward:supplies(board,stop.reward)});
}

// The station button remains the only map action. These numbered pieces tell
// the saved relay's order, independently of space numbers or private priorities.
export function TabletopRelayMarker({stop,theme='river'}){
  if(!stop)return null;
  return <span className="lb-tabletop-relay-marker" data-tabletop-relay-marker={stop.targetId} data-relay-stop={stop.index+1} data-relay-stop-status={stop.status} aria-hidden="true"><span className="lb-relay-station-plinth"/><span className="lb-relay-station-piece"><RelayMiniature theme={theme} stage={stop.status==='complete'?1:0}/><b><small>R</small>{stop.index+1}{stop.status==='complete'&&<i>✓</i>}</b></span></span>;
}

export function TabletopRelaySummary({board,relay,onInspect,t,showHeading=true}){
  if(!relay?.stops?.length)return null;
  return <div className="lb-event-relay" data-tabletop-relay={relay.targetId} data-relay-stage={relay.stage} data-relay-heading={showHeading}>
    <RelayStyles/><RelayTabletopStyles/>
    {showHeading&&<div className="lb-event-relay-heading"><RelayMiniature theme={board.theme} stage={relay.stage}/><strong>{relayTitle(board.theme,t)}</strong></div>}
    <ol className="lb-event-relay-stops" aria-label={tr(t,'tabletop_relay_order','Relay station order')}>{relay.stops.map(stop=>{const item=relayStopAt(relay,stop.targetId);return <li key={stop.targetId} data-tabletop-relay-stage={item.index+1} data-relay-stop-status={item.status}><b aria-hidden="true">{item.status==='complete'?'✓':item.index+1}</b><span><strong>{stationName(board,stop.targetId)}</strong><small>{relayStopLabel(item,t)}</small><small>{item.status==='complete'?tr(t,'tabletop_relay_collected_amount','Collected {reward}',{reward:supplies(board,stop.reward)}):supplies(board,stop.reward)}</small></span></li>;})}</ol>
    <button type="button" data-inspect-tabletop-relay={relay.targetId} disabled={typeof onInspect!=='function'} onClick={()=>onInspect?.(relay.targetId)}>{tr(t,'tabletop_relay_inspect_next','Inspect next relay stop: {name}',{name:stationName(board,relay.targetId)})}<span aria-hidden="true"> {arrow()}</span></button>
    <details data-tabletop-commitment-details="relay"><summary>{tr(t,'tabletop_relay_timing','How the relay pays')}</summary><p>{tr(t,'tabletop_relay_trigger','End separate travel moves at stops 1 and 2, in that order. Each stop pays once. Passing through or reaching stop 2 early does not pay. The first reward can fund later construction.')}</p></details>
  </div>;
}

export function RelayTabletopStyles(){return addBoardStyle(`
.lb .lb-event-relay{margin:7px 0 0;padding:8px;min-width:0;clear:both}.lb .lb-event-relay[data-relay-heading=false]{margin-top:0;padding-top:0}.lb .lb-event-relay-heading{display:flex;align-items:center;gap:9px;min-width:0}.lb .lb-event-relay-heading>.lb-relay-miniature{flex:none;width:40px;height:36px}.lb .lb-event-relay-heading>strong{font-size:.9em;overflow-wrap:anywhere}.lb .lb-event-relay-stops{list-style:none;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:0;margin:7px 0}.lb .lb-event-relay-stops>li{display:flex;align-items:flex-start;gap:6px;min-width:0;border:1px dashed var(--line);border-radius:8px;padding:7px;background:var(--panel)}.lb .lb-event-relay-stops>li[data-relay-stop-status=next]{border:2px solid var(--route);padding:6px;background:var(--route-soft)}.lb .lb-event-relay-stops>li>b{display:grid;place-items:center;flex:none;width:23px;height:23px;border:1px solid var(--line);border-radius:50%;font-size:.78em;background:var(--panel)}.lb .lb-event-relay-stops>li>span{min-width:0;overflow-wrap:anywhere}.lb .lb-event-relay-stops strong{font-size:.8em}.lb .lb-event-relay-stops small{display:block;font-size:.73em;line-height:1.4;margin-top:3px}.lb .lb-event-relay>button{min-height:44px;max-width:100%;font-size:.82em;white-space:normal;text-align:start}.lb .lb-spatial-relay-note{padding:8px 10px;border-inline-start:3px solid var(--route);border-radius:0 7px 7px 0;background:var(--soft)}.lb .lb-spatial-relay-note[data-relay-stop-status=later]{border-inline-start-style:dashed}.lb .lb-spatial-relay-note[data-relay-stop-status=complete]{border-color:var(--muted)}.lb .lb-relay-list-label{color:var(--ink)}
.lb .lb-tabletop-relay-marker{position:absolute;inset:0;pointer-events:none;transform-style:preserve-3d}.lb .lb-relay-station-plinth{position:absolute;inset:-4px -6px -8px;border:2px solid var(--route);border-radius:20px;transform:translateZ(3px);box-shadow:0 3px 0 var(--board-face)}.lb [data-relay-stop-status=later]>.lb-relay-station-plinth{border-style:dashed;border-color:var(--muted);box-shadow:none}.lb [data-relay-stop-status=complete]>.lb-relay-station-plinth{display:none}.lb .lb-relay-station-piece{position:absolute;left:-17px;bottom:-14px;z-index:4;transform:translateZ(24px) rotateY(calc(-1 * var(--camera-turn))) rotateX(calc(-1 * var(--camera-angle)));filter:drop-shadow(0 2px 1px var(--board-shadow))}.lb .lb-relay-station-piece>.lb-relay-miniature{width:30px;height:28px}.lb .lb-relay-station-piece>b{position:absolute;left:-5px;bottom:0;display:inline-flex;align-items:center;justify-content:center;gap:1px;min-width:22px;height:19px;padding:0 2px;border:1px solid var(--route);border-radius:5px;background:var(--panel);color:var(--ink);font-size:11px;line-height:1;font-weight:750}.lb .lb-relay-station-piece>b>small{font-size:7px}.lb .lb-relay-station-piece>b>i{font-size:9px;font-style:normal}.lb [data-relay-stop-status=later]>.lb-relay-station-piece>b{border-style:dashed;border-color:var(--muted)}.lb [data-relay-stop-status=complete]>.lb-relay-station-piece>.lb-relay-miniature{display:none}.lb [data-relay-stop-status=complete]>.lb-relay-station-piece{left:-10px;bottom:-8px}.lb [data-relay-stop-status=complete]>.lb-relay-station-piece>b{position:relative}
@media(max-width:600px){.lb .lb-event-relay{padding:5px 0}.lb .lb-event-relay>button{width:100%}.lb .lb-relay-station-plinth{inset:-3px -4px -7px;border-radius:18px}.lb .lb-relay-station-piece{left:-12px;bottom:-13px}.lb .lb-relay-station-piece>.lb-relay-miniature{width:25px;height:25px}.lb .lb-relay-station-piece>b{font-size:10px;min-width:20px;height:17px}}
@media(max-width:360px){.lb .lb-event-relay-stops{grid-template-columns:minmax(0,1fr)}}
@media(forced-colors:active){.lb .lb-event-relay-stops>li,.lb .lb-event-relay-stops>li>b{background:Canvas;border-color:CanvasText}.lb .lb-event-relay-stops>li[data-relay-stop-status=next],.lb .lb-spatial-relay-note{border-color:Highlight}.lb .lb-relay-station-plinth{border-color:Highlight;box-shadow:none}.lb [data-relay-stop-status=later]>.lb-relay-station-plinth{border-color:CanvasText}.lb .lb-relay-station-piece{filter:none}.lb .lb-relay-station-piece>b{background:Canvas;color:CanvasText;border-color:Highlight}.lb [data-relay-stop-status=later]>.lb-relay-station-piece>b{border-color:CanvasText}}
`);}
