import * as engine from './lesson_board_engine.js';
import { Amounts } from './lesson_board_play_extras.jsx';
import { tr } from './lesson_board_strings.js';
import {encounterStory} from './lesson_board_encounter_labels.js';
import {EncounterEmblem,EncounterStyles} from './lesson_board_tabletop_encounters.jsx';
import {DestinationReminder,DestinationReceipt,DestinationStyles,destinationName} from './lesson_board_destination_ui.jsx';
import {BarterReceipt} from './lesson_board_barter_ui.jsx';
import {DeliveryReminder,DeliveryReceipt} from './lesson_board_delivery_ui.jsx';
import {VentureReminder,VentureReceipt,VentureOutcome} from './lesson_board_ventures_ui.jsx';
import {RelayReminder,RelayReceipt} from './lesson_board_relays_ui.jsx';
import {CommissionReminder} from './lesson_board_commissions_ui.jsx';
import {EncounterDecision} from './lesson_board_encounter_decision_ui.jsx';
const React = window.React;

function FieldStyles() {
  return <style>{`
.lb .lb-field-card{min-width:0;padding:14px;margin:14px 0;border:2px solid var(--gold);border-radius:14px;background:var(--gold-soft);overflow-wrap:anywhere}
.lb .lb-field-card h4,.lb .lb-field-note h4{margin:0 0 6px}.lb .lb-field-card p{margin:6px 0 10px}.lb .lb-field-card .lb-field-kicker{font-size:.78em;letter-spacing:.05em;text-transform:uppercase;font-weight:750;color:var(--gold)}
.lb .lb-field-story-heading{display:flex;align-items:center;gap:12px;margin-bottom:8px}.lb .lb-field-story-heading>svg{width:64px;height:64px;flex-shrink:0}.lb .lb-field-story-heading h4{margin:0}.lb [data-field-panel]:focus-visible{outline:3px solid var(--accent);outline-offset:4px;border-radius:12px}.lb .lb-field-choices{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(190px,100%),1fr));gap:9px;margin-top:12px}.lb .lb-field-choices button{display:flex;flex-direction:column;align-items:flex-start;text-align:start;gap:7px;white-space:normal;min-height:44px;width:100%;padding:12px;background:var(--panel)}
.lb .lb-field-choices button small{font-size:.85em}.lb .lb-field-card details{font-size:.85em;margin-top:10px}.lb .lb-field-card details p:last-child{margin-bottom:0}
.lb .lb-field-note{min-width:0;margin:12px 0;padding:10px 12px;border-inline-start:4px solid var(--route);border-radius:0 9px 9px 0;background:var(--route-soft);overflow-wrap:anywhere}.lb .lb-field-note p{margin:3px 0 7px}.lb .lb-field-note .lb-tokens{margin-top:6px}
.lb .lb-next-opportunity{padding-top:10px;margin:12px 0;border-top:1px dashed var(--line)}.lb .lb-next-opportunity p{margin:0 0 8px}.lb .lb-next-opportunity .lb-row{align-items:stretch}.lb .lb-next-opportunity button{white-space:normal;text-align:start;flex:1 1 180px;min-height:44px}
@media(forced-colors:active){.lb .lb-field-card{border-color:CanvasText}.lb .lb-field-note{border-color:Highlight}.lb .lb-field-card .lb-field-kicker{color:CanvasText}}
`}</style>;
}

export function FieldEncounter({ board, run, role = 'solo', onChoose, onInspect, locked = false, t }) {
  const cardRef = React.useRef(null), receiptRef = React.useRef(null), focusReceipt = React.useRef(null);
  const active = board.playStyle === 'tabletop' && board.chance === true;
  const step = engine.stepOf(run), progress = active ? engine.derive(board, run) : null;
  const opportunity = active ? engine.fieldOpportunity(board, run) : null;
  const review = step.phase === 'review', card = review ? opportunity : null;
  const preparation = !progress?.complete && !card ? progress?.fieldPreparation : null;
  const venture = !progress?.complete && !card?.selectedVenture ? progress?.fieldVenture : null;
  const crew = !progress?.complete && card?.choice !== 'crew' ? progress?.fieldCrew : null;
  const lead = !progress?.complete && !card?.selectedLead ? progress?.fieldLead : null;
  const dispatch = !progress?.complete && !card?.selectedDelivery ? progress?.fieldDelivery : null;
  const relay = !progress?.complete && !card?.selectedRelay ? progress?.fieldRelay : null;
  const commission = !progress?.complete && !card?.selectedCommission ? progress?.fieldCommission : null;
  const deliveries = review ? (progress?.fieldDeliveries || []).filter(item => item.turn === run.turn) : [];
  React.useLayoutEffect(() => {
    if (card && !card.pending && focusReceipt.current === card.turn) {
      // Shared-class confirmation can arrive later. Respect focus moved outside
      // this card while waiting; a removed choice normally leaves it on body.
      if (document.activeElement === document.body || cardRef.current?.contains(document.activeElement)) receiptRef.current?.focus();
      focusReceipt.current = null;
    }
    else if (focusReceipt.current !== null && focusReceipt.current !== run.turn) focusReceipt.current = null;
  }, [card?.pending, card?.turn, run.turn]);
  if (!active || !card && !preparation && !venture && !crew && !lead && !dispatch && !relay && !commission && !deliveries.length) return null;
  const copy = card ? encounterStory(board, card.id, step.result?.dice, t) : null, disabled = locked || role === 'student' || typeof onChoose !== 'function';
  const choose = choice => {
    if(choice.startsWith('venture:')&&(!card?.canVenture||!card.ventures?.some(offer=>choice===offer.id)))return;
    if(choice.startsWith('relay:')&&(!card?.canRelay||!card.relays?.some(offer=>choice===offer.id)))return;
    if(choice.startsWith('commission:')&&(!card?.canCommission||!card.commissions?.some(offer=>choice==='commission:'+offer.projectId)))return;
    if (disabled || !card?.pending || choice === 'prepare' && !card.canPrepare || choice === 'crew' && !card.canCrew || choice.startsWith('lead:') && (!card.canLead || !card.leads?.some(lead=>choice==='lead:'+lead.targetId)) || choice.startsWith('trade:') && !card.trades?.some(trade=>trade.id===choice&&trade.legal) || choice.startsWith('delivery:') && (!card.canDelivery || !card.deliveries?.some(delivery=>choice==='delivery:'+delivery.targetId))) return;
    focusReceipt.current = cardRef.current?.contains(document.activeElement) ? card.turn : null;
    onChoose(choice);
  };
  return <section data-field-panel tabIndex={-1} aria-label={tr(t,'field_plans_title','Expedition plans')}><FieldStyles/><EncounterStyles/><DestinationStyles/>
    {deliveries.map((delivery, index) => delivery.kind==='venture'?<VentureOutcome key={delivery.originTurn+':'+index} board={board} delivery={delivery} t={t}/>:<div className="lb-field-note" data-field-delivery data-field-delivery-kind={delivery.kind||'investigation'} key={delivery.originTurn + ':' + index} role="status"><h4>{delivery.kind==='relay-stop'?tr(t,'field_relay_handoff_paid','First relay handoff completed'):delivery.kind==='relay'?tr(t,'field_relay_paid','Relay completed'):delivery.kind==='commission'?tr(t,'field_commission_paid','Construction commission completed'):delivery.kind==='delivery'?tr(t,'field_dispatch_paid','Delivery completed'):delivery.kind==='destination'?tr(t,'field_lead_paid','Destination lead completed'):delivery.kind==='construction'?tr(t,'field_crew_paid','Construction crew paid off'):tr(t, 'field_delivery_title', 'Preparation paid off')}</h4><p>{delivery.kind==='relay-stop'?tr(t,'field_relay_handoff_delivery','Your travel ended at {name}. The first handoff reward is now in your balance. Carry the relay to its second station for the final reward; original space supplies were not collected again.',{name:destinationName(board,delivery.targetId)}):delivery.kind==='relay'?tr(t,'field_relay_delivery','Your travel ended at {name} after the first handoff. The final relay reward is now in your balance. Both handoffs are complete; original space supplies were not collected again.',{name:destinationName(board,delivery.targetId)}):delivery.kind==='commission'?tr(t,'field_commission_delivery','You paid the full construction cost of {name}. Its reserved commission reward is now in your balance.',{name:board.projects.find(project=>project.id===delivery.projectId)?.name||''}):delivery.kind==='delivery'?tr(t,'field_dispatch_delivery','Your travel ended at {name}. The one-time delivery reward is now in your balance; the space’s original supplies were not collected again.',{name:destinationName(board,delivery.targetId)}):delivery.kind==='destination'?tr(t,'field_lead_delivery','Your investigation at {name} succeeded. These reserved supplies are now in your balance.',{name:destinationName(board,delivery.targetId)}):delivery.kind==='construction'?tr(t,'field_crew_delivery','You paid the full cost of {name}. Your crew returned these supplies after construction.',{name:board.projects.find(project=>project.id===delivery.projectId)?.name||''}):tr(t, 'field_delivery_help', 'Your next new investigation succeeded. These prepared supplies are now in your balance.')}</p><Amounts board={board} values={delivery.gain} prefix="+"/></div>)}
    {preparation && <aside className="lb-field-note" data-field-preparation aria-label={tr(t, 'field_preparation_title', 'Prepared opportunity')}><strong>{tr(t, 'field_preparation_title', 'Prepared opportunity')}</strong><p>{tr(t, 'field_preparation_help', 'Succeed at a new, unexplored space to collect these extra supplies. Travel, building, and retries keep them ready.')}</p><Amounts board={board} values={preparation.reward} prefix="+"/></aside>}
    {venture && <VentureReminder board={board} venture={venture} t={t}/>}
    {crew && <aside className="lb-field-note" data-field-crew aria-label={tr(t,'field_crew_ready','Construction crew ready')}><strong>{tr(t,'field_crew_ready','Construction crew ready')}</strong><p>{tr(t,'field_crew_ready_help','Build any remaining project to receive these supplies afterward. Pay the full construction cost first. Travel and investigations keep the crew ready.')}</p><Amounts board={board} values={crew.reward} prefix="+"/></aside>}
    {lead && <DestinationReminder board={board} progress={progress} lead={lead} onInspect={onInspect} t={t}/>}
    {dispatch && <DeliveryReminder board={board} progress={progress} delivery={dispatch} onInspect={onInspect} t={t}/>}
    {relay && <RelayReminder board={board} progress={progress} relay={relay} onInspect={onInspect} t={t}/>}
    {commission && <CommissionReminder board={board} progress={progress} commission={commission} onInspect={onInspect} t={t}/>}
    {card && <section ref={cardRef} className="lb-field-card" data-field-encounter={card.id} aria-label={tr(t, 'field_encounter_title', 'Expedition opportunity')}>
      <p className="lb-field-kicker">{tr(t, 'field_encounter_title', 'Expedition opportunity')}</p>
      <div className="lb-field-story-heading"><EncounterEmblem kind={card.id} theme={board.theme}/><h4 data-field-story={copy.variant}>{copy.title}</h4></div>
      {card.pending ? <><p>{copy.text}</p>
        {role === 'student' && <p data-field-teacher-decides>{tr(t, 'field_teacher_decides', 'Discuss the options together. Your teacher chooses for the expedition.')}</p>}
        <EncounterDecision board={board} run={run} progress={progress} card={card} disabled={disabled} onChoose={choose} onInspect={onInspect} t={t}/>
      </> : <div data-field-receipt role="status"><h4 ref={receiptRef} tabIndex={-1}>{card.selectedVenture?tr(t,'field_venture_saved','Exploration venture accepted'):card.selectedRelay?tr(t,'field_relay_saved','Relay accepted'):card.selectedCommission?tr(t,'field_commission_saved','Construction commission accepted'):card.selectedDelivery?tr(t,'field_dispatch_saved','Delivery accepted'):card.selectedTrade?tr(t,'field_trade_saved','Supplies exchanged'):card.selectedLead ? tr(t,'field_lead_saved','Destination lead accepted') : card.choice === 'crew' ? tr(t,'field_crew_reserved','Construction crew equipped') : card.choice === 'prepare' ? tr(t, 'field_prepared', 'Prepared for your next discovery') : tr(t, 'field_collected', 'Bonus collected')}</h4>{card.selectedVenture?<VentureReceipt board={board} venture={card.selectedVenture} t={t}/>:card.selectedRelay?<RelayReceipt board={board} relay={card.selectedRelay} t={t}/>:card.selectedCommission?<CommissionReminder board={board} progress={progress} commission={card.selectedCommission} onInspect={onInspect} receipt t={t}/>:card.selectedDelivery?<DeliveryReceipt board={board} delivery={{...card.selectedDelivery,id:card.id}} t={t}/>:card.selectedTrade?<BarterReceipt board={board} trade={card.selectedTrade} t={t}/>:card.selectedLead?<DestinationReceipt board={board} lead={card.selectedLead} t={t}/>:<><Amounts board={board} values={card.choice === 'crew' ? card.crew : card.choice === 'prepare' ? card.prepared : card.immediate} prefix="+"/><p>{card.choice === 'crew' ? tr(t,'field_crew_receipt','Your crew will return these supplies after your next paid construction. Keep enough to pay the full cost first; the crew cannot fund that payment.') : card.choice === 'prepare' ? tr(t, 'field_prepared_receipt', 'These supplies will arrive after your next successful new investigation. Travel, building, and retries keep your preparation ready.') : tr(t, 'field_collected_receipt', 'These supplies are now included in your balance.')}</p></>}</div>}
      <details data-field-rules><summary>{tr(t, 'field_rules_title', 'How expedition opportunities work')}</summary><p>{tr(t, 'field_rules_cadence', 'Opportunities appear after your 2nd, 5th, and 8th successful new investigations: at most three per expedition.')}</p><p>{tr(t, 'field_rules_odds', 'The first saved fortune die selects the opportunity: 1–5 survey, 6–10 supplies, 11–15 passage, 16–20 rendezvous. Each has a 25% chance, even when momentum rolls a second die.')}</p><p>{tr(t,'field_venture_rules','Survey events may offer an exploration venture instead of a reliable benefit. Choose a resource: the first saved die at your next successful new investigation gives four tokens on 11–20 or none on 1–10, each with a 50% chance. A second momentum die does not change the odds. Travel, construction, and unsuccessful attempts preserve the venture; no base rewards are lost.')}</p><p>{tr(t,'field_rules_dispatch','Survey and passage events may offer deliveries to explored stations. The larger reward costs a later travel move that ends at the station. You can carry one delivery at a time; it is optional and does not block finishing the expedition.')}</p><p>{tr(t,'field_relay_rules','Passage events may offer an optional two-stop relay between explored stations away from home. Choose its order: one token at the first handoff, then three of the other resource at the second. Each handoff requires a later travel move ending at that station in order. Carry one delivery or relay at a time; an unfinished relay never blocks the expedition’s finish.')}</p><p>{tr(t,'field_commission_rules','Supplies and rendezvous events can offer construction commissions. Reserve four tokens for one named project instead of taking another encounter benefit. Pay its full construction cost first; the commission is optional and never blocks the expedition’s finish.')}</p><p>{tr(t, 'field_rules_saved', 'The draw is saved with this investigation. Reopening the card does not reroll it. These are fictional expedition events; your base rewards and lesson answers stay the same.')}</p></details>
    </section>}
  </section>;
}

// Inspecting a newly funded plan never advances a turn or pays for construction.
export function NextOpportunity({ board, run, onInspect, locked = false, t }) {
  if (board.playStyle !== 'tabletop' || engine.stepOf(run).phase !== 'review' || !engine.stepOf(run).result?.success || engine.fieldOpportunity(board, run)?.pending) return null;
  const progress = engine.derive(board, run);
  if (progress.complete || !engine.turnLimit(board, run).canAdvance) return null;
  const before = { ...run, turn: run.turn - 1 };
  const projects = board.projects.filter(project => !progress.built.includes(project.id) && engine.constructionFunding(board, run, project.id).some(option => option.legal) && !engine.constructionFunding(board, before, project.id).some(option => option.legal)).slice(0, 2);
  if (!projects.length) return null;
  return <section className="lb-next-opportunity" data-next-opportunity><FieldStyles/><p><strong>{tr(t, 'field_new_plans', 'New construction options')}</strong><br/><small>{tr(t, 'field_new_plans_help', 'Your supplies can now fund these projects. Inspect the site and payment before deciding where to go next.')}</small></p><div className="lb-row">{projects.map(project => <button type="button" data-next-project={project.id} key={project.id} disabled={locked || typeof onInspect !== 'function'} onClick={() => { if (!locked) onInspect?.(project.id); }}>{tr(t, 'field_inspect_project', 'Inspect {name}', { name: project.name })}</button>)}</div></section>;
}
