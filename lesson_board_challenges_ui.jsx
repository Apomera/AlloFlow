import { addBoardStyle } from './lesson_board_style.js';
import { isSpatialChallenge, challengeTargets, challengeValidDraft, challengeInitialDraft, assignChallenge, challengeFeedback } from './lesson_board_challenges.js';
import { visualActivity, activitySignature } from './lesson_board_visual.js';
import { VisualCue, VisualStyles } from './lesson_board_visual_ui.jsx';
import { tr, arrow } from './lesson_board_strings.js';
const React = window.React;

function ChallengeStyles() { return addBoardStyle(`
.lb .lb-manipulative{display:grid;gap:14px;min-width:0}.lb .lb-challenge-heading{display:flex;align-items:center;gap:9px;margin:0;font-size:1em}.lb .lb-family-symbol{display:grid;place-items:center;min-width:34px;height:34px;border:1px solid var(--line);border-radius:9px;background:var(--soft);color:var(--accent);font-size:1.2em}.lb .lb-piece-tray,.lb .lb-destinations{display:grid;gap:10px;min-width:0}.lb .lb-piece-tray{grid-template-columns:repeat(auto-fit,minmax(min(145px,100%),1fr));padding:10px;border:1px solid var(--line);border-radius:12px;background:var(--soft)}.lb .lb-piece{display:flex;flex-direction:column;align-items:flex-start;text-align:start;gap:5px;border-width:2px;box-shadow:0 3px 0 var(--line);overflow-wrap:anywhere}.lb .lb-piece[aria-pressed=true]{outline:2px solid var(--accent);outline-offset:2px;border-color:var(--accent)}.lb .lb-piece[data-assigned=true]{border-style:dashed;box-shadow:none}.lb .lb-piece small{display:block}.lb .lb-piece-label{display:flex;align-items:flex-start;gap:7px}.lb .lb-piece-index{font-size:.78em;line-height:1.6;border:1px solid var(--line);border-radius:4px;padding:0 5px;flex-shrink:0}.lb .lb-destinations{grid-template-columns:repeat(auto-fit,minmax(min(160px,100%),1fr))}.lb .lb-destination{min-width:0;border:2px dashed var(--line);border-radius:12px;background:var(--soft);padding:10px}.lb .lb-destination-button{width:100%;text-align:start;font-weight:650;min-width:0;overflow-wrap:anywhere}.lb .lb-destination .lb-placed-cards{list-style:none;padding:0;margin:10px 0 0;display:grid;gap:7px}.lb .lb-placed-card{padding:8px 10px;background:var(--panel);border:1px solid var(--line);border-radius:7px;font-size:.9em;overflow-wrap:anywhere}.lb .lb-bin{border-style:solid;border-top-width:7px;box-shadow:inset 0 -7px 0 var(--panel);min-height:155px}.lb .lb-bin-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;font-size:.78em;color:var(--muted)}.lb .lb-bin .lb-placed-card{box-shadow:2px 2px 0 var(--line);margin-inline-end:3px}.lb .lb-manipulative[data-kind=connect] .lb-destinations{grid-template-columns:1fr;gap:12px}.lb .lb-connection-pair{display:grid;grid-template-columns:minmax(0,1fr) 42px minmax(0,1fr);align-items:center;gap:0;border:0;padding:0;background:transparent}.lb .lb-connection-card{min-width:0;padding:11px;border:2px solid var(--line);border-radius:10px;background:var(--panel);align-self:stretch;display:flex;align-items:center;overflow-wrap:anywhere}.lb .lb-connection-card[data-empty=true]{border-style:dashed;color:var(--muted);font-size:.85em}.lb .lb-connection-pair .lb-destination-button{border-width:2px;border-radius:10px;align-self:stretch}.lb .lb-connection-wire{width:100%;height:30px;color:var(--line);overflow:visible}.lb .lb-connection-wire path{stroke-dasharray:4 4}.lb .lb-connection-wire[data-connected=true]{color:var(--accent)}.lb .lb-connection-wire[data-connected=true] path{stroke-dasharray:none;stroke-width:3}.lb .lb-connection-wire circle{fill:var(--panel)}.lb .lb-connection-wire[data-connected=true] circle{fill:currentColor}.lb .lb-manipulative[data-kind=place] .lb-piece{border-radius:7px 16px 7px 7px;border-bottom-width:4px}.lb .lb-model-slots{padding:12px;border:2px solid var(--line);border-radius:16px;background:repeating-linear-gradient(135deg,transparent,transparent 16px,var(--soft) 16px,var(--soft) 18px)}.lb .lb-model-slot{border-style:solid;border-bottom-width:5px;background:var(--panel);min-height:150px}.lb .lb-slot-label{display:flex;align-items:flex-start;gap:8px}.lb .lb-slot-number{display:grid;place-items:center;flex-shrink:0;width:28px;height:28px;border:2px solid var(--accent);border-radius:50%;color:var(--accent);font-size:.85em}.lb .lb-model-slot .lb-placed-card{border:2px solid var(--accent);border-radius:7px 15px 7px 7px;background:var(--soft);padding:12px;box-shadow:0 3px 0 var(--line)}.lb .lb-placement-status{border-inline-start:3px solid var(--accent);padding:8px 12px;background:var(--soft);margin:0}.lb .lb-placement-status span{display:block;font-size:.85em;margin-top:4px}.lb .lb-challenge-tools{display:flex;flex-wrap:wrap;gap:8px}.lb .lb-challenge-tools button{flex:1 1 130px}.lb .lb-manipulative details{margin-top:0}.lb .lb-destination [data-empty-slot]{font-size:.85em;color:var(--muted);margin:12px 0 5px;min-height:35px}.lb .lb-pair-review{padding-inline-start:20px}.lb .lb-model-note{font-size:.83em;color:var(--muted);margin:0}@media(max-width:430px){.lb .lb-connection-pair{grid-template-columns:minmax(0,1fr) 28px minmax(0,1fr)}.lb .lb-connection-card,.lb .lb-connection-pair .lb-destination-button{padding:8px}.lb .lb-model-slots{padding:8px}}@media(forced-colors:active){.lb .lb-piece[aria-pressed=true]{outline-color:Highlight}.lb .lb-destination,.lb .lb-connection-card,.lb .lb-model-slots{border-color:CanvasText}.lb .lb-model-slots{background:none}.lb .lb-connection-wire{color:CanvasText}.lb .lb-connection-wire[data-connected=true]{color:Highlight}.lb .lb-piece,.lb .lb-placed-card,.lb .lb-bin{box-shadow:none}}
.lb .lb-piece[draggable=true]{cursor:grab}.lb .lb-piece[data-dragging=true]{opacity:.55;cursor:grabbing}.lb [data-challenge-drop][data-drop-active=true]{outline:3px solid var(--accent);outline-offset:3px;background:var(--soft)}.lb .lb-connection-pair[data-drop-active=true]{border-radius:10px}.lb .lb-piece:disabled{cursor:default}@media(forced-colors:active){.lb [data-challenge-drop][data-drop-active=true]{outline-color:Highlight}}
.lb .lb-drop-hint{pointer-events:none;display:block;font-size:.8em;line-height:1.4;font-weight:600;color:var(--accent);margin-top:7px}.lb .lb-piece-tray>.lb-drop-hint{grid-column:1/-1;margin:0}.lb .lb-destination-button .lb-drop-hint{border-top:1px dashed currentColor;padding-top:7px}@media(max-width:430px){.lb .lb-connection-pair{grid-template-columns:minmax(0,1fr);grid-template-rows:auto 32px auto}.lb .lb-connection-pair .lb-connection-wire{width:42px;height:30px;justify-self:center;transform:rotate(90deg)}.lb .lb-connection-card,.lb .lb-connection-pair .lb-destination-button{padding:10px 12px}.lb .lb-connection-card[data-empty=true]{min-height:44px}}
`); }

export function SpatialChallengeActivity({ node, value, onChange, disabled = false, support, showImages = true, t }) {
  // A changed challenge, even one retaining its location ID, starts a new local
  // manipulation history. Answer drafts remain owned by the parent workspace.
  return <ChallengeWorkspace key={activitySignature(node)} {...{node,value,onChange,disabled,support,showImages,t}}/>;
}

function ChallengeWorkspace({ node, value, onChange, disabled, support, showImages, t }) {
  const [selected, setSelected] = React.useState(0), [notice, setNotice] = React.useState(''), [history, setHistory] = React.useState([]), [dragging, setDragging] = React.useState(null), [dropTarget, setDropTarget] = React.useState(null);
  const id = React.useId(), targets = challengeTargets(node), draft = challengeValidDraft(node, value) ? value : challengeInitialDraft(node), parts = draft.split(','), activity = visualActivity(support, node);
  const expected = React.useRef(draft), drag = React.useRef(null);
  const stopDrag = () => { drag.current = null; setDragging(null); setDropTarget(null); };
  React.useEffect(() => { if (expected.current !== draft) { expected.current = draft; setHistory([]); setNotice(''); stopDrag(); } }, [draft]);
  React.useEffect(() => { if (disabled) stopDrag(); }, [disabled]);
  const cue = key => <VisualCue cue={activity?.cues?.[key]} support={support} showImages={showImages} t={t}/>;
  const targetPrefix = node.kind === 'classify' ? 'category' : node.kind === 'connect' ? 'match' : 'slot';
  const action = node.kind === 'connect' ? tr(t, 'challenge_connect', 'Connect') : node.kind === 'classify' ? tr(t, 'challenge_sort', 'Sort') : tr(t, 'challenge_place', 'Place');
  const family = node.kind === 'classify' ? tr(t,'challenge_sorting_bench','Sorting bench') : node.kind === 'connect' ? tr(t,'challenge_connection_board','Connection board') : tr(t,'challenge_model_workbench','Model workbench');
  const commit = next => {
    if (disabled || next === draft) return false;
    setHistory(previous => [...previous.slice(-49), { value: draft, selected }]);
    expected.current = next; onChange(next); return true;
  };
  const assign = (item, destination) => {
    if (disabled) return;
    const displaced = node.kind !== 'classify' && destination !== '' ? parts.findIndex((part, index) => index !== item && part === String(destination)) : -1;
    const next = assignChallenge(node, draft, item, destination);
    if (!commit(next)) return;
    setNotice((destination === '' ? tr(t, 'challenge_returned', '{item} returned to the tray.', { item: node.items[item] }) : tr(t, 'challenge_assigned', '{item} → {destination}.', { item: node.items[item], destination: targets[destination] })) + (displaced >= 0 ? ' ' + tr(t, 'challenge_returned', '{item} returned to the tray.', { item: node.items[displaced] }) : ''));
    const nextItem = next.split(',').findIndex(part => part === '');
    if (nextItem >= 0) setSelected(nextItem);
  };
  const undo = () => {
    if (disabled || !history.length) return;
    const previous = history.at(-1); expected.current = previous.value; setHistory(history.slice(0,-1)); setSelected(previous.selected); onChange(previous.value);
    setNotice(tr(t,'challenge_undo_done','Last move undone. Your previous arrangement is restored.'));
  };
  const clear = () => { if (commit(challengeInitialDraft(node))) { setSelected(0); setNotice(tr(t,'challenge_clear_done','All items returned to the tray. Use Undo move to restore the arrangement.')); } };
  // A drag belongs to this workspace and the draft it started from. Read the
  // dragged item directly, never the independently selected click-control item.
  const dragStart = (event, item) => {
    if (disabled || !event.dataTransfer) { event.preventDefault(); return; }
    const token = id + ':' + item;
    event.dataTransfer.setData('application/x-allo-board-piece', token);
    event.dataTransfer.effectAllowed = 'move';
    drag.current = { item, token, draft }; setDragging(item); setDropTarget(null);
  };
  const canDrop = () => !disabled && drag.current && drag.current.draft === draft;
  const dropProps = destination => ({
    'data-challenge-drop': destination === '' ? 'tray' : destination,
    'data-drop-active': dropTarget === destination,
    onDragOver: event => { if (canDrop()) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDropTarget(destination); } },
    onDragLeave: event => { if (!event.currentTarget.contains(event.relatedTarget)) setDropTarget(null); },
    onDrop: event => {
      if (!canDrop()) return;
      event.preventDefault();
      const current = drag.current;
      if (event.dataTransfer?.getData('application/x-allo-board-piece') === current.token) assign(current.item, destination);
      stopDrag();
    }
  });
  const dropHint = destination => {
    if (!canDrop() || dropTarget !== destination) return null;
    const item = drag.current.item, letter = String.fromCharCode(65 + item), displaced = node.kind !== 'classify' && destination !== '' ? parts.findIndex((part, index) => index !== item && part === String(destination)) : -1;
    const message = destination === '' ? (parts[item] === '' ? tr(t,'challenge_drop_already_tray','Card {card} is already in the tray.',{card:letter}) : tr(t,'challenge_drop_return','Return card {card} to the tray.',{card:letter})) : parts[item] === String(destination) ? tr(t,'challenge_drop_already_here','Card {card} is already here.',{card:letter}) : displaced >= 0 ? tr(t,'challenge_drop_replace','Drop {card} here; {previous} returns to the tray.',{card:letter,previous:String.fromCharCode(65+displaced)}) : tr(t,'challenge_drop_here','Drop card {card} here.',{card:letter});
    return <span className="lb-drop-hint" data-challenge-drop-hint aria-hidden="true">{message}</span>;
  };
  const destinationButton = (target, index) => <button type="button" className="lb-destination-button" data-challenge-destination={index} disabled={disabled} aria-label={tr(t, 'challenge_move_aria', '{action} {item} to {target}', { action, item: node.items[selected], target })} onClick={() => assign(selected,index)}>{node.kind === 'place' ? <span className="lb-slot-label"><span className="lb-slot-number" aria-hidden="true">{index+1}</span><span>{target}</span></span> : target}{cue(targetPrefix+index)}{dropHint(index)}</button>;
  return <div className="lb-manipulative" data-kind={node.kind} data-board-challenge={node.kind}><ChallengeStyles/><VisualStyles/>{cue('prompt')}
    <h4 className="lb-challenge-heading"><span className="lb-family-symbol" aria-hidden="true">{node.kind==='classify'?'▤':node.kind==='connect'?'↔':'▧'}</span>{family}</h4>
    <p id={id + '-help'}>{node.kind === 'classify' ? tr(t, 'challenge_classify_help', 'Choose a card, then choose its category. A category can hold several cards.') : node.kind === 'connect' ? tr(t, 'challenge_connect_help', 'Choose a card, then connect it to its matching card. Use each match once.') : tr(t, 'challenge_place_help', 'Choose a piece, then place it in the named space that fits the lesson. Each space holds one piece.')}</p>
    <p className="lb-model-note">{tr(t,'challenge_drag_help','You can also drag a card onto a destination, or back to the tray. Buttons and list controls work the same way.')}</p>
    <div className="lb-piece-tray" role="group" aria-describedby={id + '-help'} aria-label={tr(t, 'challenge_tray', 'Cards and pieces')} {...dropProps('')}>{dropHint('')}{node.items.map((item, index) => <button key={index} type="button" className="lb-piece" data-challenge-piece={index} data-assigned={parts[index]!==''} data-dragging={dragging===index} draggable={!disabled} onDragStart={event=>dragStart(event,index)} onDragEnd={stopDrag} aria-pressed={selected === index} disabled={disabled} onClick={() => setSelected(index)}><span className="lb-piece-label"><span className="lb-piece-index" aria-hidden="true">{String.fromCharCode(65+index)}</span><strong>{item}</strong></span>{cue('item' + index)}<small>{parts[index] === '' ? tr(t, 'challenge_unplaced', 'In the tray') : arrow() + ' ' + targets[Number(parts[index])]}</small></button>)}</div>
    <p className="lb-placement-status">{tr(t, 'challenge_selected', 'Selected: {item}', { item: node.items[selected] })} <span>{tr(t, 'challenge_progress', '{done}/{total} placed', { done: parts.filter(Boolean).length, total: node.items.length })}</span></p>
    {node.kind==='place'&&<p className="lb-model-note">{tr(t,'challenge_slot_number_help','Numbers identify the model spaces; they do not prescribe an order.')}</p>}
    <div className={'lb-destinations'+(node.kind==='place'?' lb-model-slots':'')} role="group" aria-label={tr(t, 'challenge_destinations', 'Destinations')}>{targets.map((target, index) => {
      const occupants = node.items.filter((_, item) => parts[item] === String(index));
      if(node.kind==='connect')return <section className="lb-destination lb-connection-pair" data-challenge-pair={index} key={index} {...dropProps(index)}><div className="lb-connection-card" data-empty={!occupants.length}>{occupants[0]||tr(t,'challenge_no_connection','Choose a card to connect')}</div><svg className="lb-connection-wire" data-challenge-wire={index} data-connected={!!occupants.length} viewBox="0 0 42 30" preserveAspectRatio="none" aria-hidden="true"><path d="M4 15H38" fill="none" stroke="currentColor" strokeWidth="2"/><circle cx="4" cy="15" r="3" stroke="currentColor"/><circle cx="38" cy="15" r="3" stroke="currentColor"/></svg>{destinationButton(target,index)}</section>;
      return <section className={'lb-destination '+(node.kind==='classify'?'lb-bin':'lb-model-slot')} data-challenge-bin={node.kind==='classify'?index:undefined} data-challenge-slot={node.kind==='place'?index:undefined} key={index} {...dropProps(index)}>{node.kind==='classify'&&<div className="lb-bin-heading"><span>{tr(t,'challenge_category_bin','Category bin')}</span><span>{tr(t,'challenge_bin_count','{count} cards',{count:occupants.length})}</span></div>}{destinationButton(target,index)}{occupants.length?<ul className="lb-placed-cards">{occupants.map(item=><li className="lb-placed-card" key={item}>{item}</li>)}</ul>:<p data-empty-slot>{node.kind==='classify'?tr(t,'challenge_bin_empty','No cards sorted here yet'):tr(t,'challenge_slot_empty','Place one piece here')}</p>}</section>;
    })}</div>
    <div className="lb-challenge-tools"><button type="button" data-challenge-undo disabled={disabled||!history.length} onClick={undo}>{tr(t,'challenge_undo','Undo move')}</button><button type="button" data-challenge-clear disabled={disabled||!parts.some(Boolean)} onClick={clear}>{tr(t,'challenge_clear','Clear all')}</button><button type="button" data-challenge-return disabled={disabled || parts[selected] === ''} onClick={() => assign(selected, '')}>{tr(t, 'challenge_return', 'Return selected item to tray')}</button></div>
    <p role="status" aria-live="polite" aria-atomic="true">{notice}</p>
    <details><summary>{tr(t, 'challenge_list_controls', 'Use list controls')}</summary>{node.items.map((item, index) => <label key={index}>{item}<select data-challenge-select={index} disabled={disabled} value={parts[index]} onChange={event => assign(index, event.target.value === '' ? '' : Number(event.target.value))}><option value="">{tr(t, 'challenge_unplaced', 'In the tray')}</option>{targets.map((target, destination) => <option key={destination} value={destination}>{target}</option>)}</select></label>)}</details>
  </div>;
}

// Call only from a resolved review; the answer UI never exposes the key.
export function ChallengeReview({ node, value, t }) {
  if (!isSpatialChallenge(node)) return null;
  const feedback = challengeFeedback(node, value);
  if (!feedback) return null;
  return <section data-challenge-feedback><p>{tr(t, 'challenge_feedback_count', '{correct}/{total} relationships fit the lesson.', feedback)}</p><ul className="lb-pair-review">{feedback.entries.map((entry, index) => <li key={index}>{entry.item} {arrow()} {entry.target}: {entry.correct ? tr(t, 'challenge_fit', 'Fits') : tr(t, 'challenge_revisit', 'Revisit this relationship')}</li>)}</ul></section>;
}
