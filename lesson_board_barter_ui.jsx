import { addBoardStyle } from './lesson_board_style.js';
import * as engine from './lesson_board_engine.js';
import {Amounts} from './lesson_board_play_extras.jsx';
import { tr, arrow } from './lesson_board_strings.js';
const React=window.React;

export function tradeTitle(theme,t){
  switch(theme){
    case 'garden':return tr(t,'barter_garden','Gardeners’ swap cart');
    case 'workshop':return tr(t,'barter_workshop','Workshop trading bench');
    case 'archive':return tr(t,'barter_archive','Archive supply desk');
    case 'space':return tr(t,'barter_space','Orbital supply dock');
    default:return tr(t,'barter_river','Riverside supply exchange');
  }
}

export function TradeMiniature({theme='river',give=0}){
  const token=(x,y,type,key)=><g key={key} transform={`translate(${x} ${y})`} className="lb-barter-coin" data-resource={type}><ellipse className="lb-barter-coin-edge" cx="0" cy="3" rx="10" ry="6"/><ellipse className="lb-barter-coin-face" cx="0" cy="0" rx="10" ry="6"/>{type===0?<ellipse className="lb-barter-coin-mark" cx="0" cy="0" rx="3" ry="2"/>:<path className="lb-barter-coin-mark" d="m0-4 5 4-5 4-5-4Z"/>}</g>;
  return <svg className="lb-barter-miniature" data-barter-miniature={theme} viewBox="0 0 116 86" aria-hidden="true"><ellipse className="lb-barter-shadow" cx="58" cy="75" rx="49" ry="7"/><path className="lb-barter-board-side" d="m8 45 50-20 50 20v15L58 80 8 60Z"/><path className="lb-barter-board-top" d="m8 43 50-20 50 20-50 20Z"/><path className="lb-barter-canopy-side" d="M12 48V21m92 27V21"/><path className="lb-barter-canopy" d="M5 22 20 5h76l15 17-17 6-18-6-18 6-18-6-18 6Z"/>{theme==='space'?<><ellipse className="lb-barter-insignia" cx="58" cy="15" rx="10" ry="3" transform="rotate(-15 58 15)"/><circle className="lb-barter-insignia" cx="58" cy="15" r="4"/></>:theme==='garden'?<path className="lb-barter-insignia" d="M53 21q-7-14 11-13 0 11-11 13Z"/>:theme==='archive'?<path className="lb-barter-insignia" d="M50 9h16v13l-8-3-8 3Z"/>:theme==='workshop'?<path className="lb-barter-insignia" d="m58 7 9 8-9 8-9-8Z"/>:<path className="lb-barter-insignia" d="M58 7q-12 13 0 16 12-3 0-16Z"/>}{token(31,45,give,'give')}{token(78,42,1-give,'take1')}{token(88,50,1-give,'take2')}<path className="lb-barter-arrow" d="M47 48h18m-5-5 5 5-5 5"/></svg>;
}

function newlyFunded(board,run,trade){
  if(!trade?.legal)return [];
  try{
    const next=engine.merge(run,engine.chooseFieldOpportunity(board,run,trade.id)),progress=engine.derive(board,run);
    return board.projects.filter(project=>!progress.built.includes(project.id)&&!engine.constructionFunding(board,run,project.id).some(option=>option.legal)&&engine.constructionFunding(board,next,project.id).some(option=>option.legal));
  }catch(_){return [];}
}

export function BarterOffer({board,run,card,disabled,onChoose,onInspect,t,choice,onSelect,expanded=false,consequence}){
  const [draft,setDraft]=React.useState(null),group=React.useId();
  const trades=card.trades||[],selected=trades.find(item=>choice!==undefined?choice===item.id:draft?.turn===card.turn&&draft.id===item.id)||trades.find(item=>item.legal)||trades[0];
  if(!trades.length)return null;
  const projects=newlyFunded(board,run,selected),before=engine.derive(board,run).balance;
  const Container=expanded?'section':'details',Title=expanded?'h5':'summary';
  return <Container className="lb-barter-offer" data-field-trade-offer><BarterStyles/><Title>{tr(t,'barter_option','Trade supplies · give 1, receive 2')}</Title>
    <div className="lb-barter-heading"><TradeMiniature theme={board.theme} give={selected?.give}/><div><h5>{tradeTitle(board.theme,t)}</h5><p>{tr(t,'barter_offer_help','Exchange supplies you already own to prepare for your next build. This uses your encounter choice instead of its other benefits, and takes no move.')}</p></div></div>
    <fieldset><legend>{tr(t,'barter_direction','Choose an exchange')}</legend><div className="lb-barter-options">{trades.map(trade=><label className="lb-barter-option" data-selected={selected?.id===trade.id} key={trade.id}><input type="radio" name={group} data-field-trade-option={trade.id} checked={selected?.id===trade.id} disabled={(!onSelect&&disabled)||!trade.legal} onChange={()=>onSelect?onSelect(trade.id):setDraft({turn:card.turn,id:trade.id})}/><span><strong>{tr(t,'barter_give_receive','Give 1 {give} → receive 2 {take}',{give:board.resources[trade.give],take:board.resources[trade.take]})}</strong>{!trade.legal&&<small data-trade-unavailable={trade.id}>{trade.reason==='insufficient'?tr(t,'barter_insufficient','You need one of this resource to exchange.'):tr(t,'barter_reserve','Keep this resource to preserve enough supplies for the remaining required construction.')}</small>}</span></label>)}</div></fieldset>
    {!consequence&&selected?.legal&&<div className="lb-barter-preview" data-field-trade-preview={selected.id}><h5>{tr(t,'barter_balance_after','Your supplies after this exchange')}</h5><dl>{board.resources.map((resource,index)=><div key={index}><dt>{resource}</dt><dd><span>{before[index]}</span><span aria-hidden="true"> {arrow()} </span><span className="lb-sr-only">{' '+tr(t,'barter_becomes','becomes')+' '}</span><strong data-trade-after={index}>{selected.after[index]}</strong></dd></div>)}</dl>{projects.length>0&&<div data-trade-funded><p>{tr(t,'barter_funded','This exchange would fund these construction plans. Inspect a plan to check its site and payment.')}</p>{projects.map(project=><button key={project.id} type="button" data-trade-project={project.id} disabled={typeof onInspect!=='function'} onClick={()=>onInspect?.(project.id)}>{tr(t,'barter_inspect_project','Inspect {name}',{name:project.name})}</button>)}</div>}</div>}
    {consequence}
    <button type="button" className="lb-barter-commit" data-field-choice="trade" data-field-trade-commit disabled={disabled||!selected?.legal} onClick={()=>{if(!disabled&&selected?.legal)onChoose(selected.id);}}>{selected?tr(t,'barter_confirm','Exchange 1 {give} for 2 {take}',{give:board.resources[selected.give],take:board.resources[selected.take]}):tr(t,'barter_option','Trade supplies · give 1, receive 2')}</button>
    <p className="lb-barter-note">{tr(t,'barter_commit_help','Comparing exchanges and inspecting plans do not spend supplies. Confirming pays the one-token cost and adds the two-token reward immediately.')}</p>
  </Container>;
}

export function BarterReceipt({board,trade,t}){
  return <div className="lb-barter-receipt" data-field-trade-receipt><BarterStyles/><TradeMiniature theme={board.theme} give={trade.give}/><div><p>{tr(t,'barter_paid','You exchanged these supplies:')}</p><Amounts board={board} values={trade.cost} prefix="−"/><Amounts board={board} values={trade.gain} prefix="+"/><p>{tr(t,'barter_receipt_help','The exchange is included in your balance. Your dice, turn, and other prepared opportunities are unchanged.')}</p></div></div>;
}

export function BarterStyles(){return addBoardStyle(`
.lb .lb-barter-preview .lb-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.lb .lb-barter-offer{margin:14px 0;padding:12px;border:1px solid var(--gold);border-radius:12px;background:var(--panel);min-width:0}.lb .lb-barter-offer>summary{min-height:44px;align-content:center;font-weight:700;font-size:1.05em}.lb .lb-barter-heading,.lb .lb-barter-receipt{display:flex;align-items:center;gap:12px;min-width:0}.lb .lb-barter-heading>div,.lb .lb-barter-receipt>div{min-width:0}.lb .lb-barter-heading h5,.lb .lb-barter-preview h5{font-size:1em;margin:8px 0}.lb .lb-barter-offer fieldset{border:0;padding:0;margin:12px 0}.lb .lb-barter-options{display:grid;gap:8px}.lb .lb-barter-option{display:flex;align-items:flex-start;gap:8px;padding:11px;border:1px solid var(--line);border-radius:9px;background:var(--panel);cursor:pointer}.lb .lb-barter-option[data-selected=true]{padding:10px;border:2px solid var(--route);background:var(--route-soft)}.lb .lb-barter-option input{width:22px;height:22px;min-width:22px;min-height:22px;accent-color:var(--route);margin:0}.lb .lb-barter-option>span{min-width:0}.lb .lb-barter-option small{display:block;margin-top:6px}.lb .lb-barter-preview{padding:10px;border:1px dashed var(--route);border-radius:9px;margin-bottom:10px}.lb .lb-barter-preview dl{display:grid;gap:6px;margin:0}.lb .lb-barter-preview dl>div{display:flex;flex-wrap:wrap;justify-content:space-between;gap:5px 12px;min-width:0}.lb .lb-barter-preview dt{min-width:0;flex:1 1 120px}.lb .lb-barter-preview dd{margin:0;white-space:nowrap}.lb .lb-barter-preview [data-trade-funded]{border-top:1px solid var(--line);margin-top:9px;padding-top:8px}.lb .lb-barter-preview button,.lb .lb-barter-commit{width:100%;text-align:start;white-space:normal;margin-top:5px}.lb .lb-barter-commit{font-weight:700;border:2px solid var(--route)}.lb .lb-barter-note{font-size:.85em;line-height:1.5;margin:10px 0 0}.lb .lb-barter-receipt .lb-tokens{display:flex;margin:6px 0}
.lb .lb-barter-miniature{--trade-top:#efddb5;--trade-side:#947046;--trade-canopy:#3f7771;--trade-mark:#fff3d1;display:block;width:116px;height:86px;flex:none;filter:drop-shadow(0 2px 1px #382b2820)}.lb .lb-barter-miniature[data-barter-miniature=garden]{--trade-canopy:#527b42}.lb .lb-barter-miniature[data-barter-miniature=workshop]{--trade-canopy:#886038}.lb .lb-barter-miniature[data-barter-miniature=archive]{--trade-canopy:#725b84}.lb .lb-barter-miniature[data-barter-miniature=space]{--trade-top:#d5e1ea;--trade-side:#63768c;--trade-canopy:#405f98}.lb .lb-barter-shadow{fill:#28231722}.lb .lb-barter-board-top{fill:var(--trade-top);stroke:var(--trade-side);stroke-width:1.2}.lb .lb-barter-board-side{fill:var(--trade-side)}.lb .lb-barter-canopy-side{fill:none;stroke:var(--trade-side);stroke-width:4}.lb .lb-barter-canopy{fill:var(--trade-canopy);stroke:var(--trade-side);stroke-width:1}.lb .lb-barter-insignia{fill:none;stroke:var(--trade-mark);stroke-width:1.5}.lb .lb-barter-coin-edge{fill:#8b5b19}.lb .lb-barter-coin-face{fill:#f4c56f;stroke:#775022;stroke-width:1}.lb .lb-barter-coin-mark{fill:#634019}.lb .lb-barter-coin[data-resource="1"] .lb-barter-coin-face{fill:#a8d5ca;stroke:#345d57}.lb .lb-barter-coin[data-resource="1"] .lb-barter-coin-edge{fill:#345d57}.lb .lb-barter-coin[data-resource="1"] .lb-barter-coin-mark{fill:#254d47}.lb .lb-barter-arrow{fill:none;stroke:#4f4535;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}.dark .lb .lb-barter-miniature{filter:drop-shadow(0 2px 1px #0005)}
@media(max-width:480px){.lb .lb-barter-heading,.lb .lb-barter-receipt{align-items:flex-start;flex-direction:column;gap:4px}.lb .lb-barter-miniature{width:93px;height:69px}}
@media(forced-colors:active){.lb .lb-barter-offer{border-color:CanvasText}.lb .lb-barter-option[data-selected=true],.lb .lb-barter-preview,.lb .lb-barter-commit{border-color:Highlight}.lb .lb-barter-miniature{forced-color-adjust:none}}
`);}
