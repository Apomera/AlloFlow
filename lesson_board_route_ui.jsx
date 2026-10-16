import * as engine from './lesson_board_engine.js';
import {travelRouteOptions} from './lesson_board_spatial.js';
import {forecastTabletopMove} from './lesson_board_tactical_preview.jsx';
import {tr} from './lesson_board_strings.js';
const React=window.React;

export function RouteChoice({board,run,target,value='shortest',onChange,disabled=false,role='solo',t}){
  const group=React.useId(),progress=engine.derive(board,run);
  if(board.playStyle!=='tabletop'||target.cost||engine.stepOf(run).phase!=='choose'||progress.complete)return null;
  const options=travelRouteOptions(board,progress,target.id);
  if(options.length<2)return null;
  const name=id=>board.locations.find(node=>node.id===id)?.name||'',amounts=values=>values.map((n,i)=>n?'+'+n+' '+board.resources[i]:'').filter(Boolean).join(' · ');
  return <fieldset className="lb-route-choice" data-route-choice={target.id}><RouteChoiceStyles/><legend>{tr(t,'route_choice_title','Choose how to get there')}</legend><p>{tr(t,'route_choice_help','Compare routes to the same destination. Your choice takes effect only when you confirm the move.')}</p>
    {role==='student'&&<p>{tr(t,'route_choice_teacher','Discuss the routes together. Your teacher chooses the route when moving the party.')}</p>}
    <div className="lb-route-options">{options.map(option=>{
      const forecast=option.legal?forecastTabletopMove(board,run,target.id,'standard',option.id):null;
      const project=board.projects.find(item=>item.id===option.projectId),label=option.id==='shortest'?tr(t,'route_choice_shortest','Shortest open route'):tr(t,'route_choice_bridge','Via {name}',{name:project?.name||''});
      return <label className="lb-route-option" key={option.id} data-route-option={option.id} data-selected={value===option.id}><input type="radio" name={group} value={option.id} checked={value===option.id} disabled={disabled||role==='student'||!option.legal||typeof onChange!=='function'} onChange={()=>onChange?.(option.id)}/><span><strong>{label}</strong><small>{option.segments===1?tr(t,'route_choice_one','1 route segment'):tr(t,'route_choice_segments','{count} route segments',{count:option.segments})}</small><span className="lb-route-stations" data-route-option-path={option.id}>{option.path.map(name).join(' → ')}</span>
        {!option.legal&&<small data-route-unavailable>{tr(t,'route_choice_range','Beyond the travel limit for this turn.')}</small>}
        {forecast?.usedProjects.length>0&&<small data-route-first-use>{tr(t,'route_choice_use','First use of {names}',{names:forecast.usedProjects.map(id=>board.projects.find(item=>item.id===id)?.name).join(', ')})}</small>}
        {forecast?.kitGain.some(Boolean)&&<small data-route-kit>{tr(t,'route_choice_kit','Kit bonus on this route: {reward}',{reward:amounts(forecast.kitGain)})}</small>}
        {forecast?.deliveryGain.some(Boolean)&&<small data-route-delivery>{tr(t,'route_choice_delivery','Delivery reward on arrival: {reward}',{reward:amounts(forecast.deliveryGain)})}</small>}
        {forecast?.complete&&<strong className="lb-route-finishes" data-route-finishes>{tr(t,'route_choice_finishes','Arriving by this route finishes the expedition.')}</strong>}
      </span></label>;
    })}</div>
  </fieldset>;
}

export function RouteChoiceStyles(){return <style>{`
.lb .lb-route-choice{min-width:0;margin:12px 0;padding:12px;border:1px solid var(--route);border-radius:12px;background:var(--route-soft)}.lb .lb-route-choice legend{font-weight:750;padding:0 5px}.lb .lb-route-choice>p{font-size:.88em;margin:0 0 10px}.lb .lb-route-options{display:grid;gap:8px}.lb .lb-route-option{display:flex;align-items:flex-start;gap:9px;min-width:0;padding:11px;border:1px solid var(--line);border-radius:9px;background:var(--panel);cursor:pointer;overflow-wrap:anywhere}.lb .lb-route-option[data-selected=true]{padding:10px;border:2px solid var(--accent);background:var(--soft)}.lb .lb-route-option input{flex:none;width:22px;height:22px;min-width:22px;min-height:22px;margin:0;accent-color:var(--accent)}.lb .lb-route-option>span{min-width:0}.lb .lb-route-option strong,.lb .lb-route-option small,.lb .lb-route-stations{display:block}.lb .lb-route-option small{margin-top:5px;font-size:.83em}.lb .lb-route-stations{font-size:.83em;line-height:1.5;margin-top:6px}.lb .lb-route-finishes{font-size:.85em;border-inline-start:3px solid var(--gold);padding-inline-start:7px;margin-top:8px}.lb .lb-route-option:has(input:focus-visible){outline:3px solid var(--accent);outline-offset:3px}
@media(forced-colors:active){.lb .lb-route-choice,.lb .lb-route-option{border-color:CanvasText}.lb .lb-route-option[data-selected=true],.lb .lb-route-finishes{border-color:Highlight}}
`}</style>;}
