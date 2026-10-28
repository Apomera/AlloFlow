import { addBoardStyle } from './lesson_board_style.js';
import {TacticalMoveDetails,TacticsReward} from './lesson_board_tactical_preview.jsx';
import {travelRouteOptions} from './lesson_board_spatial.js';
import {ResourceCounters} from './lesson_board_tokens.jsx';
import * as engine from './lesson_board_engine.js';
import { tr } from './lesson_board_strings.js';
const React = window.React;
// AI text uses the Assess view's light markdown when it is loaded; plain text otherwise.
const lbMd = () => window.AlloModules?.QuizView?.markdown || { inline: v => v == null ? '' : String(v), block: v => v == null || v === '' ? null : React.createElement('p', null, String(v)), plain: v => v == null ? '' : String(v) };

export function TabletopPlayStyles() {
  return addBoardStyle(`
    .lb-dialog[data-play-style=tabletop]{width:min(1360px,100%);position:relative}
    .lb-dialog[data-play-style=tabletop]>.lb-row:first-of-type{position:absolute;right:16px;top:12px}
    .lb-dialog[data-play-style=tabletop]>.lb-row:first-of-type h2{display:none}
    .lb .lb-game-menu{margin:0 0 12px;padding:0 80px 0 0;border:0}
    .lb .lb-game-menu>summary{display:flex;flex-wrap:wrap;gap:4px 14px;align-items:center;font-size:.85em;padding:6px 0;min-height:44px}
    .lb .lb-game-menu>summary:before{content:'▸';color:var(--accent)}
    .lb .lb-game-menu[open]>summary:before{content:'▾'}
    .lb .lb-game-menu>summary [data-solo-save-status]{color:var(--muted);font-size:.9em}
    .lb [data-spatial-play=true] .lb-expedition-header{padding-bottom:10px}
    .lb [data-spatial-play=true] .lb-eyebrow{display:none}
    .lb [data-spatial-play=true] .lb-expedition-header h2{margin:0 0 6px}
    .lb [data-spatial-play=true] .lb-phase-strip{display:none}
    .lb [data-spatial-play=true] .lb-phase-strip li{padding:7px 10px}
    .lb [data-spatial-play=true] [data-board-phase]{margin:6px 0}
    .lb [data-spatial-play=true] .lb-columns{grid-template-columns:minmax(0,1fr) minmax(260px,330px);gap:16px;margin-top:12px}
    .lb [data-spatial-play=true] .lb-current{position:sticky;top:12px;padding:15px}
    .lb [data-spatial-play=true] .lb-current>p{font-size:.92em}
    .lb [data-spatial-play=true] .lb-ready-choices{border:0;margin:0;padding:0}
    .lb [data-spatial-play=true] .lb-ready-choices>.lb-muted{margin:0 0 8px}
    .lb [data-spatial-play=true] .lb-instruction{padding:10px}
    .lb [data-spatial-play=true] .lb-tabletop-tools{margin-top:18px}
    .lb .lb-tabletop-hud{display:flex;justify-content:space-between;gap:8px 18px;flex-wrap:wrap;align-items:center}
    .lb .lb-tabletop-hud p{margin:0}
    .lb .lb-tabletop-resources{display:flex;gap:8px;flex-wrap:wrap;font-size:.9em}
    .lb .lb-tabletop-objective{font-size:.88em;color:var(--muted);margin:6px 0 0}
    .lb .lb-tabletop-preview{display:grid;gap:10px;margin:12px 0}
    .lb .lb-tabletop-preview p{margin:0}
    .lb .lb-tabletop-route{border-inline-start:3px solid var(--route);padding-inline-start:10px;font-size:.9em}
    .lb .lb-tabletop-help{margin:0;padding-top:0;border-top:0}
    .lb .lb-tabletop-help>summary{padding:6px 0;min-height:44px}
    .lb [data-spatial-play=true] .lb-presentation>button:last-child{display:none}
    .lb [data-spatial-play=true] .lb-workshop .lb-projects{grid-template-columns:repeat(3,minmax(0,1fr))}
    @media(min-width:1100px){.lb [data-spatial-play=true][data-play-phase=answer] .lb-columns,.lb [data-spatial-play=true][data-play-phase=review] .lb-columns{grid-template-columns:minmax(0,1.15fr) minmax(0,1fr)}}
    @media(max-width:960px){.lb [data-spatial-play=true] .lb-columns{grid-template-columns:minmax(0,1fr)}.lb [data-spatial-play=true] .lb-current{position:static;grid-row:auto}.lb [data-spatial-play=true] .lb-workshop .lb-projects{grid-template-columns:1fr}}
    @media(max-width:500px){.lb-dialog[data-play-style=tabletop]{padding:12px}.lb [data-spatial-play=true] .lb-eyebrow{display:none}.lb [data-spatial-play=true] .lb-expedition-header h2{font-size:1.2em}.lb [data-spatial-play=true] .lb-phase-strip li>span{display:none}.lb [data-spatial-play=true] .lb-phase-strip li{font-size:.8em;padding:6px}.lb [data-spatial-play=true] .lb-presentation{gap:6px}.lb [data-spatial-play=true] .lb-presentation button{padding:7px 9px;font-size:.85em}.lb .lb-tabletop-hud{gap:6px}.lb .lb-tabletop-objective{font-size:.82em}}
  `);
}

export function TabletopHud({board,run,t}) {
  const p=engine.derive(board,run),m=engine.missionProgress(board,run),position=board.locations.find(n=>n.id===p.position);
  return <div data-board-mission>
    <div className="lb-tabletop-hud"><p><strong>{tr(t,'tabletop_turn','Turn {turn}',{turn:run.turn+1})}</strong> · {position?tr(t,'tabletop_at','Party at {name}',{name:position.name}):tr(t,'tabletop_choose_start','Choose a starting space')}</p><ResourceCounters board={board} values={p.balance} t={t}/></div>
    <p className="lb-tabletop-objective">{p.complete?tr(t,'tabletop_delivered','Expedition complete. Your discoveries are back at camp.'):p.objectiveReady?p.position===board.starts[0]?tr(t,'tabletop_deliver_goal','Your discoveries are ready. Deliver them at camp to finish, or continue exploring.'):tr(t,'tabletop_return_goal','Bring your discoveries back to camp to finish the expedition.'):p.requirementsMet?tr(t,'tabletop_use_goal','Use a built bridge or earn a workshop bonus, then return to camp.'):tr(t,'tabletop_progress','Concepts {concepts}/{totalConcepts} · Builds {projects}/{requiredProjects}',m)}{!p.objectiveReady&&m.requiredLocations>0?' · '+tr(t,'tabletop_explored','Spaces {explored}/{requiredLocations}',m):''}</p>
  </div>;
}

export function tabletopActionLabel(board,run,target,t) {
  const p=engine.derive(board,run);
  if(target.cost)return tr(t,'tabletop_build_here','Build at this site');
  if(p.visited.includes(target.id))return p.objectiveReady&&target.id===board.starts[0]?(p.position===target.id?tr(t,'tabletop_deliver_action','Deliver discoveries'):tr(t,'tabletop_return_camp','Return to camp')):tr(t,'tabletop_travel_here','Travel to this space');
  return p.position===target.id?tr(t,'tabletop_explore_here','Explore this space'):tr(t,'tabletop_move_explore','Move and explore');
}

export function TabletopPreview({board,run,target,funding,route:routeChoice='shortest',onSelect,t}) {
  const p=engine.derive(board,run),name=id=>board.locations.find(n=>n.id===id)?.name||id;
  if(target.cost){
    const site=engine.buildSite(board,target),built=p.built.includes(target.id),options=engine.constructionFunding(board,run,target.id),payment=options.find(option=>option.id===funding)||options.find(option=>option.legal)||options[0],cost=payment?.cost||target.cost,missing=cost.map((v,i)=>Math.max(0,v-p.balance[i]));
    return <div className="lb-tabletop-preview" data-tabletop-preview>
      <p>{tr(t,'tabletop_site','Construction site: {name}',{name:name(site)})}</p>
      <p>{tr(t,'tabletop_cost','Cost: {cost}',{cost:cost.map((v,i)=>v+' '+board.resources[i]).join(' · ')})}</p>
      <p>{target.effect.kind==='path'?tr(t,'tabletop_bridge_effect','Connects {from} directly to {to}.',{from:name(site),to:name(target.effect.targetId)}):tr(t,'yield_effect','Future successful locations earn +1 {resource}.',{resource:board.resources[target.effect.resource]})}</p>
      {!built&&p.position!==site&&<button type="button" data-inspect-build-site={target.id} onClick={()=>onSelect(site)}>{tr(t,'tabletop_find_site','Show construction site')}</button>}
      {!built&&missing.some(v=>v>0)&&<p className="lb-muted">{tr(t,'missing_resources','Still needed: {resources}',{resources:missing.map((v,i)=>v+' '+board.resources[i]).join(' · ')})}</p>}
      {!built&&p.position===site&&!p.visited.includes(site)&&<p>{tr(t,'tabletop_clear_site','Explore this camp before building.')}</p>}<TacticalMoveDetails board={board} run={run} target={target} funding={payment?.id} t={t}/>
    </div>;
  }
  const route=travelRouteOptions(board,p,target.id).find(option=>option.id===routeChoice)?.path||engine.routeTo(board,p,target.id),visited=p.visited.includes(target.id),beyond=!!(board.travelLimit&&route&&route.length-1>board.travelLimit),waypoint=beyond?route[board.travelLimit]:null;
  return <div className="lb-tabletop-preview" data-tabletop-preview>
    {route&&route.length>0&&<p className="lb-tabletop-route">{route.map(name).join(' → ')}</p>}
    {board.travelLimit&&route&&route.length>1&&<p data-travel-distance>{route.length===2?tr(t,'travel_distance_one','Route: 1 segment · Limit: {limit} per turn',{limit:board.travelLimit}):tr(t,'travel_distance','Route: {distance} segments · Limit: {limit} per turn',{distance:route.length-1,limit:board.travelLimit})}</p>}
    {beyond&&<div data-travel-waypoint><p>{tr(t,'travel_waypoint_help','This space is beyond this turn’s travel range. Stop at {name} first, or open a shorter route with a bridge.',{name:name(waypoint)})}</p><button type="button" data-inspect-waypoint={waypoint} onClick={()=>onSelect(waypoint)}>{tr(t,'travel_show_waypoint','Show waypoint: {name}',{name:name(waypoint)})}</button></div>}
    <p>{visited?tr(t,'tabletop_cleared_travel','Travel through cleared spaces without repeating their challenges. Rewards are collected once.'):tr(t,'tabletop_new_encounter','Explore this space to collect its reward and open onward routes.')}</p>
    {!visited&&<p>{tr(t,'tabletop_reward','Reward: {reward}',{reward:target.reward.map((v,i)=>(v+p.bonus[i])+' '+board.resources[i]).join(' · ')})}</p>}
    {!route&&<p>{tr(t,'tabletop_unreachable','Explore an intervening space or build a connecting route to reach this space.')}</p>}
    <TacticalMoveDetails board={board} run={run} target={target} route={routeChoice} t={t}/>{p.objectiveReady&&target.id===board.starts[0]&&<p>{p.position===board.starts[0]?tr(t,'tabletop_deliver_goal','Your discoveries are ready. Deliver them at camp to finish, or continue exploring.'):tr(t,'tabletop_delivery','Return here after using a construction to finish the expedition.')}</p>}
  </div>;
}

export function TabletopTravelRecap({board,run,t}) {
  const step=engine.stepOf(run),before=engine.derive(board,{...run,turn:run.turn-1}),node=board.locations.find(n=>n.id===step.targetId);
  if(!node||!before.visited.includes(node.id)||!step.result?.success)return null;
  const route=engine.routeForStep(board,run)||[],name=id=>board.locations.find(n=>n.id===id)?.name||id;
  if(node.id===board.starts[0]&&before.position===node.id&&before.objectiveReady)return <div data-tabletop-travel-recap><p className="lb-notice">{tr(t,'tabletop_delivery_recap','Discoveries delivered. Your expedition is complete!')}</p></div>;
  return <div data-tabletop-travel-recap><TacticsReward board={board} run={run} t={t}/><p className="lb-notice">{tr(t,'tabletop_arrived','The party arrived at {name}.',{name:node.name})}</p><p className="lb-tabletop-route" data-travel-recap-path>{route.map(name).join(' → ')}</p><p className="lb-muted">{tr(t,'tabletop_travel_no_reward','Explored spaces do not award resources again.')}</p></div>;
}

export function isTabletopTravel(board,run) {
  return board.playStyle==='tabletop'&&engine.derive(board,{...run,turn:run.turn-1}).visited.includes(engine.stepOf(run).targetId);
}

export function TabletopRules({board,t}) {
  return <details className="lb-tabletop-help" data-tabletop-rules><summary>{tr(t,'tabletop_rules','How to play')}</summary><div>{lbMd().block(board.mission)}</div><ol><li>{board.travelLimit?tr(t,'tabletop_rule_tactical','Preview your route, then move up to {limit} segments per turn through cleared spaces. Stop at the first unexplored space. Each bridge counts as one segment.',{limit:board.travelLimit}):tr(t,'tabletop_rule_move','Select a space, preview the route, then move. Cleared spaces can be crossed in one travel turn.')}</li><li>{tr(t,'tabletop_rule_route_choice','When a built bridge offers another route, compare both paths before moving. The selected route determines bridge use and any kit bonus.')}</li><li>{tr(t,'tabletop_rule_explore','Explore a new space to earn supplies. Hints and retries are always available.')}</li>{board.chance&&<li>{tr(t,'tabletop_rule_field_routes','After exploring 2, 5, and 8 new spaces, choose one encounter benefit. Supplies and rendezvous events can offer resource exchanges; survey and passage events can offer deliveries back to explored stations. Deliveries pay once when a later travel move ends there.')}</li>}<li>{tr(t,'tabletop_rule_build','Return to a construction site to build. Bridges add routes and workshops increase future rewards.')}</li><li>{tr(t,'tabletop_rule_finish_delivery','Complete your objectives and use a construction, then return to camp. If you are already there, choose Deliver discoveries to finish.')}</li></ol></details>;
}
