import { addBoardStyle } from './lesson_board_style.js';
import * as engine from './lesson_board_engine.js';
import {destinationJourney} from './lesson_board_journey.js';
import { tr, signedAmount } from './lesson_board_strings.js';
const React=window.React;

// A suggestion selects a legal next stop; it never moves or solves a space.
export function nextContractStep(board,run,contract){
  if(!contract||contract.complete)return null;
  const progress=engine.derive(board,run),remaining=new Set(contract.remainingIds),edges=engine.spatialRoutes(board,progress),queue=[[progress.position]],seen=new Set([progress.position]);
  if(progress.complete)return null;
  for(let index=0;index<queue.length;index++){
    const path=queue[index],last=path.at(-1);
    // A home investigation can itself be a contract stop. Leave it until last
    // once ending a move there would finish the whole expedition.
    if(remaining.has(last)&&!(progress.objectiveReady&&last===board.starts[0]&&remaining.size>1)){
      const route=destinationJourney(board,progress,last)?.routes[0];
      if(route){
        // Keep the current investigation as the first stop, unless doing so at
        // home would finish the expedition before this optional destination.
        const next=!progress.visited.includes(progress.position)&&!(progress.objectiveReady&&progress.position===board.starts[0])?progress.position:route.nextId;
        return {id:next,destination:last,path:route.path,via:next!==last};
      }
    }
    const neighbors=edges.flatMap(({from,to})=>from===last?[to]:to===last?[from]:[]).sort();
    for(const id of neighbors)if(!seen.has(id)){seen.add(id);queue.push([...path,id]);}
  }
  return null;
}

export function ContractStyles(){return addBoardStyle(`
.lb .lb-contract-hand{border:1px solid var(--line);border-radius:16px;background:var(--panel);padding:0 14px;margin-top:18px}
.lb .lb-contract-hand>summary{display:flex;justify-content:space-between;align-items:center;gap:12px;min-height:52px}
.lb .lb-contract-hand>summary:before{content:'⚑';color:var(--accent);font-size:1.35em}
.lb .lb-contract-hand>summary>span:first-of-type{flex:1}
.lb .lb-contract-hand>summary small{font-weight:400;white-space:nowrap}
.lb .lb-contract-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:12px 0 16px}
.lb .lb-contract-card{position:relative;min-width:0;padding:16px;border:1px solid var(--line);border-top:5px solid var(--gold);border-radius:12px;background:var(--panel);box-shadow:0 4px 0 var(--gold-soft)}
.lb .lb-contract-card[data-tracked=true]{outline:2px solid var(--accent);outline-offset:2px;background:var(--soft)}
.lb .lb-contract-card[data-complete=true]{border-top-color:var(--route)}
.lb .lb-contract-card h4{margin:0 0 5px;font-size:1em}
.lb .lb-contract-card p{font-size:.88em;margin:6px 0}
.lb .lb-contract-card ul{list-style:none;padding:0;margin:12px 0;display:grid;gap:4px}
.lb .lb-contract-card li{display:flex;align-items:center;gap:8px;font-size:.88em}
.lb .lb-contract-check{display:inline-grid;place-items:center;border:1px solid var(--line);background:var(--panel);border-radius:50%;width:22px;height:22px;flex-shrink:0;font-weight:700;color:var(--route)}
.lb .lb-contract-card .lb-contract-prize{border-top:1px dashed var(--line);padding-top:8px;font-weight:650;color:var(--gold)}
.lb .lb-contract-card button{margin-top:8px;width:100%;font-size:.88em}
.lb .lb-contract-active{display:flex;gap:8px 12px;flex-wrap:wrap;align-items:center;border-inline-start:3px solid var(--gold);padding:6px 10px;margin-top:8px;font-size:.85em}
.lb .lb-contract-active p{margin:0;flex:1;min-width:130px}
.lb .lb-contract-active button{padding:5px 9px;font-size:.9em}
.lb .lb-contract-reward{padding:12px;border:2px solid var(--gold);background:var(--gold-soft);border-radius:12px;margin:12px 0}
.lb .lb-contract-reward h4,.lb .lb-contract-reward p{margin:0 0 5px}
.lb .lb-contract-reward ul{padding-inline-start:20px;margin:4px 0}
.lb .lb-contract-editor{display:grid;gap:8px}.lb .lb-contract-editor fieldset{border:1px solid var(--line);border-radius:12px;padding:12px}.lb .lb-contract-editor .lb-row label{display:flex;align-items:center;gap:6px}.lb .lb-contract-editor input[type=checkbox]{width:auto}
@media(max-width:760px){.lb .lb-contract-cards{grid-template-columns:1fr}.lb .lb-contract-card{padding:12px}.lb .lb-contract-card ul{margin:8px 0}}
@media(forced-colors:active){.lb .lb-contract-card[data-tracked=true]{outline-color:Highlight}.lb .lb-contract-reward{border-color:CanvasText}}
`);}

const prize=(board,reward)=>reward.map((value,index)=>value?signedAmount(value)+' '+board.resources[index]:'').filter(Boolean).join(' · ');

export function ContractHand({board,run,trackedId,onTrack,onInspect,t}){
  const contracts=engine.contractProgress(board,run),progress=engine.derive(board,run);
  if(!contracts.length)return null;
  return <details className="lb-contract-hand" data-contract-hand><ContractStyles/><summary><span>{tr(t,'contracts_title','Expedition contracts')}</span><small>{tr(t,'contracts_count','{done}/{total} complete',{done:contracts.filter(c=>c.complete).length,total:contracts.length})}</small></summary>
    <p className="lb-muted">{tr(t,'contracts_help','Choose which route to work on first. Explore each marked space to collect its bonus supplies once. Contracts are optional; tracking one marks its destinations on your map.')}</p>
    <div className="lb-contract-cards">{contracts.map(contract=>{const next=nextContractStep(board,run,contract);return <article className="lb-contract-card" data-contract={contract.id} data-tracked={trackedId===contract.id} data-complete={contract.complete} key={contract.id}>
      <h4>{contract.complete?'✓ ':''}{contract.title}</h4><p>{contract.description}</p>
      <ul>{contract.locations.map(id=><li key={id}><span className="lb-contract-check" aria-hidden="true">{progress.visited.includes(id)?'✓':'○'}</span><span>{board.locations.find(node=>node.id===id)?.name}<span className="lb-visually-hidden"> · {progress.visited.includes(id)?tr(t,'explored','Explored'):tr(t,'not_yet','Still to explore')}</span></span></li>)}</ul>
      <p className="lb-contract-prize">{contract.complete?tr(t,'contract_collected','Bonus collected: {reward}',{reward:prize(board,contract.reward)}):tr(t,'contract_bonus','Bonus: {reward}',{reward:prize(board,contract.reward)})}</p>
      {!contract.complete&&!progress.complete&&<><button type="button" data-track-contract={contract.id} aria-pressed={trackedId===contract.id} onClick={()=>onTrack(trackedId===contract.id?'':contract.id)}>{trackedId===contract.id?tr(t,'contract_untrack','Stop tracking'):tr(t,'contract_track','Track this route')}</button>{trackedId===contract.id&&next&&<button type="button" data-contract-next={contract.id} onClick={()=>onInspect(next.id)}>{tr(t,'contract_next_step','Show next step: {name}',{name:board.locations.find(node=>node.id===next.id)?.name})}</button>}</>}
    </article>;})}</div>
  </details>;
}

export function TrackedContract({board,run,trackedId,onInspect,onOpen,t}){
  const contract=engine.contractProgress(board,run).find(item=>item.id===trackedId);
  if(!contract)return null;
  const next=nextContractStep(board,run,contract),done=engine.derive(board,run).complete;
  return <div className="lb-contract-active" data-tracked-contract={contract.id}><ContractStyles/><p><strong>{contract.complete?'✓':'⚑'} {contract.title}</strong> · {contract.completed}/{contract.total}{contract.complete?' · '+tr(t,'contract_bonus_collected','Bonus collected'):''}</p>{next&&!done?<button type="button" data-tracked-next onClick={()=>onInspect(next.id)}>{tr(t,'contract_show_next','Show next step')}</button>:<button type="button" onClick={onOpen}>{tr(t,'contract_view_cards','View contracts')}</button>}</div>;
}

export function ContractRewards({board,run,t}){
  if(!board.contracts?.length||engine.stepOf(run).phase!=='review')return null;
  const before=engine.derive(board,{...run,turn:run.turn-1}),now=engine.derive(board,run),earned=board.contracts.filter(contract=>now.completedContracts?.includes(contract.id)&&!before.completedContracts?.includes(contract.id));
  if(!earned.length)return null;
  return <section className="lb-contract-reward" data-contract-reward role="status"><ContractStyles/><h4>{tr(t,'contract_completed','Contract completed!')}</h4><ul>{earned.map(contract=><li key={contract.id}><strong>{contract.title}</strong> · {prize(board,contract.reward)}</li>)}</ul><p>{tr(t,'contract_reward_included','These bonus supplies are included in this move’s rewards.')}</p></section>;
}

export function ContractEditor({board,onChange,disabled,t}){
  if(!board.contracts?.length)return null;
  const edit=(id,patch)=>onChange({...board,contracts:board.contracts.map(contract=>contract.id===id?{...contract,...patch}:contract)});
  return <details data-edit-contracts><ContractStyles/><summary>{tr(t,'contracts_review','Review expedition contracts')}</summary><div className="lb-contract-editor">{board.contracts.map(contract=><fieldset key={contract.id} disabled={disabled}><legend>{contract.title}</legend><label>{tr(t,'contract_title','Contract title')}<input data-contract-title={contract.id} maxLength={80} value={contract.title} onChange={event=>edit(contract.id,{title:event.target.value})}/></label><label>{tr(t,'contract_description','Contract description')}<textarea maxLength={300} value={contract.description} onChange={event=>edit(contract.id,{description:event.target.value})}/></label><p>{tr(t,'contract_locations_help','Choose two or three spaces. Changing a contract changes this board’s saved-game identity.')}</p><div className="lb-row">{board.locations.map(node=><label key={node.id}><input type="checkbox" data-contract-location={contract.id+':'+node.id} checked={contract.locations.includes(node.id)} disabled={disabled||!contract.locations.includes(node.id)&&contract.locations.length>=3} onChange={event=>edit(contract.id,{locations:event.target.checked?[...contract.locations,node.id]:contract.locations.filter(id=>id!==node.id)})}/>{node.name}</label>)}</div><div className="lb-form">{board.resources.map((name,index)=><label key={name}>{tr(t,'contract_reward_resource','Bonus {resource}',{resource:name})}<input type="number" min="0" max="3" step="1" data-contract-reward-input={contract.id+':'+index} value={contract.reward[index]} onChange={event=>edit(contract.id,{reward:contract.reward.map((n,i)=>i===index?Number(event.target.value):n)})}/></label>)}</div><button type="button" data-remove-contract={contract.id} onClick={()=>{const contracts=board.contracts.filter(item=>item.id!==contract.id),{contracts:old,...rest}=board;onChange(contracts.length?{...rest,contracts}:rest);}}>{tr(t,'contract_remove','Remove this contract')}</button></fieldset>)}</div></details>;
}
