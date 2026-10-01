import * as engine from './lesson_board_engine.js';
import { Activity, Icon, tr } from './lesson_board_ui.jsx';
import { Amounts } from './lesson_board_play_extras.jsx';
import { responseText } from './lesson_board_insights.js';
import { SupportImage } from './lesson_board_image.jsx';
import { SymbolCredit } from './lesson_board_map.jsx';
import { safeBoardImage, supportHash } from './lesson_board_support.js';
import { boardQuality, balanceAnswerPositions } from './lesson_board_quality.js';
import { LENGTH_REQUEST, RefineStyles } from './lesson_board_refine.jsx';
import { DiscoveryCard, DiceStyles } from './lesson_board_dice.jsx';
import { symbolSearch, symbolCredit, symbolQueries, findBoardSymbols, withSymbols, withoutSymbols, symbolOf } from './lesson_board_symbols.js';
const React = window.React;
const { useState, useEffect, useRef } = React;
const STOP_PRESETS = [
  { key: 'easier', label: 'Easier', instruction: 'Make this stop easier: simpler words, a clearer question and a more supportive first hint.' },
  { key: 'harder', label: 'More challenging', instruction: 'Make this stop more challenging: ask learners to apply the idea, with closer but still clearly wrong distractors.' },
  { key: 'clearer', label: 'Clearer wording', instruction: 'Rewrite the instruction and options so they are clear and unambiguous for the learner level.' },
  { key: 'distractors', label: 'Better distractors', instruction: 'Write more plausible distractors based on common misconceptions, keeping exactly one correct answer and options of similar length.' },
  { key: 'format', label: 'Different activity type', instruction: 'Change this stop to a different activity format (choice, order or settings) if the lesson supports it.' },
  { key: 'story', label: 'More vivid scene', instruction: 'Make the scene more vivid and fun without adding lesson facts.' }
];
function PreviewStyles() {
  return <style>{`.lb .lb-preview-nav{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;margin:12px 0}.lb .lb-preview-nav label{margin:0;flex:1 1 220px}.lb .lb-preview-stop{border:1px solid var(--line);border-radius:14px;padding:16px;background:var(--bg)}.lb .lb-preview-stop h4{margin:0;font-size:1.15em}.lb .lb-chip{display:inline-block;border:1px solid var(--line);border-radius:999px;padding:2px 10px;font-size:.84em;background:var(--panel)}.lb .lb-answer-key{border-inline-start:4px solid var(--route,#32725e);background:var(--route-soft,#e5f2ea);border-radius:10px;padding:10px 14px;margin:12px 0}.lb .lb-quality li{margin:6px 0}.lb .lb-quality li[data-level=fix]{font-weight:650}.lb .lb-symbol-results{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}.lb .lb-symbol-results button{padding:4px;width:64px;height:64px;background:#fff}.lb .lb-symbol-results img{width:100%;height:100%;object-fit:contain}.lb .lb-preview-check[data-result=correct]{color:var(--route,#32725e);font-weight:700}`}</style>;
}
export function BoardTeacherPreview({ board, source, support, supportReady, language, disabled, stageText, onChange, onRefineStop, onRefineBoard, onSupport, onEditStop, t }) {
  const [index, setIndex] = useState(0), [showKey, setShowKey] = useState(false), [drafts, setDrafts] = useState({}), [checks, setChecks] = useState({}), [request, setRequest] = useState(''), [symbols, setSymbols] = useState({ busy: '', progress: '', message: '', error: '', results: [], query: undefined });
  const heading = useRef(null), controller = useRef(null), latest = useRef({ board, support }); latest.current = { board, support };
  const quality = React.useMemo(() => boardQuality(board, source), [board, source]), stops = board.locations, node = stops[Math.min(index, stops.length - 1)], search = symbolSearch();
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => { setRequest(''); controller.current?.abort(); setSymbols(state => ({ ...state, busy: '', results: [], query: undefined, message: '', error: '' })); }, [node?.id]);
  if (!node) return null;
  const position = stops.indexOf(node), refineStop = (instruction, label) => Promise.resolve(onRefineStop(node.id, instruction, label || instruction)).then(done => { if (done && !label) setRequest(''); });
  const goTo = id => { const next = stops.findIndex(item => item.id === id); if (next >= 0) { setIndex(next); setTimeout(() => heading.current?.focus(), 0); } };
  const draftKey = node.id + ':' + supportHash(JSON.stringify(node)), draft = drafts[draftKey] ?? engine.initialDraft(node), check = checks[draftKey];
  const neighbors = board.edges.filter(edge => edge.includes(node.id)).map(edge => stops.find(item => item.id === (edge[0] === node.id ? edge[1] : edge[0]))?.name).filter(Boolean);
  const shortcuts = board.projects.filter(project => project.effect?.kind === 'path' && project.effect.targetId === node.id).map(project => project.name);
  const stopProblems = quality.filter(item => item.stopId === node.id), answer = responseText(node, engine.solution(node)), symbol = symbolOf(support, node.id), symbolsOn = Object.keys(support?.art?.symbols || {}).length > 0;
  const kinds = { choice: tr(t, 'kind_choice', 'Choice'), order: tr(t, 'kind_order', 'Sequence'), settings: tr(t, 'kind_settings', 'Configuration') };
  const qualityText = item => item.code === 'validation' ? item.message : item.code === 'position' ? tr(t, 'quality_position', 'The correct answer is option {position} in {count} of {total} choice activities. Learners may spot the pattern.', item) : item.code === 'length' ? tr(t, 'quality_length', 'The correct answer is the longest option in {count} of {total} choice activities.', item) : item.code === 'reading' ? tr(t, 'quality_reading', '{count} stops have a lot of reading. Try "Less reading" for younger learners.', item) : tr(t, 'quality_repeat', '{count} stops share the same instruction.', item);
  const runCheck = () => setChecks({ ...checks, [draftKey]: !engine.validValue(node, draft) ? 'incomplete' : draft === engine.solution(node) ? 'correct' : 'incorrect' });
  const finishSymbols = (started, apply, message) => { const current = latest.current; if (JSON.stringify(current.board) !== started || !current.support) { setSymbols(state => ({ ...state, busy: '', message: tr(t, 'symbols_stale', 'The board changed while searching. Search again.') })); return; } onSupport(apply(current.support, current.board)); setSymbols(state => ({ ...state, busy: '', message })); };
  const symbolFailure = error => setSymbols(state => ({ ...state, busy: '', error: error?.code === 'symbol-network' ? tr(t, 'symbols_network', 'Mulberry symbols could not be reached. Check the connection and try again. The board works without them.') : tr(t, 'symbols_failed', 'Picture symbols could not be added. The board works without them.') }));
  const findAll = async () => {
    if (!search || !support || disabled) return;
    controller.current?.abort(); const abort = new AbortController(), started = JSON.stringify(board), total = board.locations.length + board.projects.length; controller.current = abort;
    setSymbols(state => ({ ...state, busy: 'all', progress: '0/' + total, message: '', error: '' }));
    try {
      const found = await findBoardSymbols(board, search, { language, signal: abort.signal }, (done, count) => { if (!abort.signal.aborted) setSymbols(state => ({ ...state, progress: done + '/' + count })); });
      if (!abort.signal.aborted) finishSymbols(started, (value, current) => withSymbols(value, current, found.picks, symbolCredit()), tr(t, 'symbols_found', 'Found symbols for {count} of {total} places. Places without one keep their icon.', { count: Object.keys(found.picks).length, total }));
    } catch (error) { if (!abort.signal.aborted) symbolFailure(error); }
  };
  const defaultQuery = symbolQueries(node, language)[0]?.query || node.name;
  const searchOne = async event => {
    event.preventDefault(); const query = (symbols.query ?? defaultQuery).trim();
    if (!search || !query || disabled) return;
    controller.current?.abort(); const abort = new AbortController(); controller.current = abort;
    setSymbols(state => ({ ...state, busy: 'one', message: '', error: '', results: [] }));
    try {
      let found = [];
      for (const lang of [...new Set([language, 'English'])]) { const result = await search(query, { language: lang, signal: abort.signal }); if (result?.error === 'network') throw Object.assign(Error('symbol-network'), { code: 'symbol-network' }); found = (result?.symbols || []).filter(item => safeBoardImage(item?.svgUrl)).slice(0, 12); if (found.length) break; }
      if (!abort.signal.aborted) setSymbols(state => ({ ...state, busy: '', results: found, message: found.length ? tr(t, 'symbol_results', 'Symbols found: {count}. Choose one.', { count: found.length }) : tr(t, 'symbol_no_results', 'No symbols found. Try a simpler word, such as rain or tree.') }));
    } catch (error) { if (!abort.signal.aborted) symbolFailure(error); }
  };
  const choose = item => { onSupport(withSymbols(support, board, { [node.id]: { src: item.svgUrl, label: item.label } }, symbolCredit())); setSymbols(state => ({ ...state, message: tr(t, 'symbol_chosen', 'Symbol added to {name}.', { name: node.name }) })); };
  return <details className="lb-panel lb-teacher-preview" data-board-teacher-preview open><PreviewStyles/><RefineStyles/>
    <summary>{tr(t, 'preview_title', 'Teacher preview: check every stop')}</summary>
    <p className="lb-muted">{tr(t, 'preview_help', 'See each stop the way learners will, try it, check the answer key, then refine or edit anything before play.')}</p>
    <section className="lb-quality" data-board-quality aria-label={tr(t, 'quality_title', 'Quality checks')}><h4>{tr(t, 'quality_title', 'Quality checks')}</h4>
      {quality.length === 0 ? <p data-quality-clear>{tr(t, 'quality_clear', 'No problems found. Still read each stop: automated checks cannot confirm accuracy or fit for your class.')}</p> : <ul>{quality.map((item, key) => <li key={key} data-quality={item.code} data-level={item.level}>{qualityText(item)} {(item.stopId || item.stops?.[0]) && <button type="button" data-quality-show={item.stopId || item.stops[0]} onClick={() => goTo(item.stopId || item.stops[0])}>{tr(t, 'quality_show', 'Show stop')}</button>} {item.code === 'position' && <button type="button" data-balance-answers disabled={disabled} onClick={() => onChange(balanceAnswerPositions(board), tr(t, 'version_shuffle', 'Before spreading answer positions'))}>{tr(t, 'quality_balance', 'Spread answer positions')}</button>} {item.code === 'length' && onRefineBoard && <button type="button" data-even-lengths disabled={disabled} onClick={() => onRefineBoard(LENGTH_REQUEST, tr(t, 'quality_lengths', 'Ask the AI to even out option lengths'))}>{tr(t, 'quality_lengths', 'Ask the AI to even out option lengths')}</button>}</li>)}</ul>}
    </section>
    <section data-symbol-tools aria-label={tr(t, 'symbols_title', 'Picture symbols')}><h4>{tr(t, 'symbols_title', 'Picture symbols')}</h4>
      {search ? <div className="lb-row"><button type="button" data-find-symbols disabled={disabled || !supportReady || !!symbols.busy} onClick={findAll}>{symbolsOn ? tr(t, 'symbols_refresh', 'Find new Mulberry symbols for every place') : tr(t, 'symbols_add', 'Add Mulberry picture symbols to every place')}</button>{symbolsOn && <button type="button" data-remove-symbols disabled={disabled || !!symbols.busy} onClick={() => onSupport(withoutSymbols(support, board))}>{tr(t, 'symbols_remove_all', 'Remove all symbols')}</button>}{symbols.busy === 'all' && <button type="button" onClick={() => { controller.current?.abort(); setSymbols(state => ({ ...state, busy: '', message: tr(t, 'symbols_cancelled', 'Symbol search cancelled.') })); }}>{tr(t, 'cancel', 'Cancel')}</button>}</div> : <p className="lb-muted" data-symbols-unavailable>{tr(t, 'symbols_unavailable', 'Picture symbol search is not available right now. The board works without symbols.')}</p>}
      <p role="status" data-symbol-status>{symbols.busy === 'all' ? tr(t, 'symbols_progress', 'Finding symbols: {progress}', { progress: symbols.progress }) : symbols.busy === 'one' ? tr(t, 'symbols_searching', 'Searching Mulberry symbols…') : symbols.message}</p>{symbols.error && <p role="alert" className="lb-notice">{symbols.error}</p>}
      <SymbolCredit support={support} t={t}/>
    </section>
    <div className="lb-preview-nav"><button type="button" data-preview-prev disabled={position <= 0} onClick={() => goTo(stops[position - 1].id)}>{tr(t, 'preview_prev', 'Previous stop')}</button><label>{tr(t, 'preview_jump', 'Stop')}<select data-preview-jump value={node.id} onChange={event => goTo(event.target.value)}>{stops.map((item, key) => <option key={item.id} value={item.id}>{key + 1}. {item.name}</option>)}</select></label><button type="button" data-preview-next disabled={position >= stops.length - 1} onClick={() => goTo(stops[position + 1].id)}>{tr(t, 'preview_next', 'Next stop')}</button><label className="lb-row" style={{ flex: '0 0 auto' }}><input type="checkbox" style={{ width: 'auto' }} data-preview-key-toggle checked={showKey} onChange={event => setShowKey(event.target.checked)}/>{tr(t, 'preview_show_key', 'Show answer key')}</label></div>
    <article className="lb-preview-stop" data-preview-stop={node.id}>
      <div className="lb-row">{symbol ? <SupportImage src={symbol} className="lb-symbol" t={t}/> : <Icon name={node.icon}/>}<h4 ref={heading} tabIndex={-1}>{tr(t, 'preview_stop_heading', 'Stop {number}: {name}', { number: position + 1, name: node.name })}</h4></div>
      <p className="lb-row"><span className="lb-chip">{board.concepts.find(concept => concept.id === node.conceptId)?.name || node.conceptId}</span><span className="lb-chip">{kinds[node.kind] || node.kind}</span>{board.starts.includes(node.id) && <span className="lb-chip">{tr(t, 'preview_start', 'Starting place')}</span>}<Amounts board={board} values={node.reward} prefix="+"/></p>
      <p>{node.scene}</p><p className="lb-instruction">{node.instruction}</p>
      <fieldset><legend>{tr(t, 'preview_learner_view', 'What learners answer')}</legend><Activity key={draftKey} node={node} value={draft} support={support} t={t} onChange={value => setDrafts({ ...drafts, [draftKey]: value })}/></fieldset>
      <div className="lb-row"><button type="button" data-preview-check onClick={runCheck}>{tr(t, 'preview_check', 'Check this answer')}</button><span role="status" className="lb-preview-check" data-result={check || ''}>{check === 'correct' ? tr(t, 'preview_correct', 'Correct. Learners would explore this place, collect its reward and roll for fortune if dice are on.') : check === 'incorrect' ? tr(t, 'preview_incorrect', 'Not yet. Learners would review the evidence and can retry without losing anything.') : check === 'incomplete' ? tr(t, 'preview_incomplete', 'Choose a response for every part first.') : ''}</span></div>
      {showKey && <div className="lb-answer-key" data-preview-answer-key><p><strong>{tr(t, 'solution', 'Solution')}: </strong>{answer || tr(t, 'preview_key_invalid', 'This answer key needs fixing. Use Edit by hand.')}</p><p><strong>{tr(t, 'preview_why', 'Why')}: </strong>{node.explanation}</p><blockquote>{node.sourceQuote}</blockquote><ol>{node.hints.map((hint, key) => <li key={key}>{hint}</li>)}</ol><p className="lb-muted">{tr(t, 'preview_links', 'Opens paths to: {names}', { names: neighbors.join(', ') || tr(t, 'preview_none', 'none') })}{shortcuts.length > 0 && ' ' + tr(t, 'preview_shortcut', 'Also reached by the shortcut {names}.', { names: shortcuts.join(', ') })}</p></div>}
      {stopProblems.length > 0 && <div className="lb-notice" data-preview-problems><strong>{tr(t, 'preview_problems', 'Needs fixing before play:')}</strong><ul>{stopProblems.map((item, key) => <li key={key}>{item.message}</li>)}</ul></div>}
      <section data-refine-stop aria-label={tr(t, 'refine_stop_title', 'Improve this stop')}><h5>{tr(t, 'refine_stop_title', 'Improve this stop')}</h5>
        <div className="lb-chips" role="group" aria-label={tr(t, 'refine_ideas', 'Quick ideas')}>{STOP_PRESETS.map(preset => <button type="button" key={preset.key} data-refine-stop-preset={preset.key} disabled={disabled} onClick={() => refineStop(preset.instruction, tr(t, 'stop_' + preset.key, preset.label))}>{tr(t, 'stop_' + preset.key, preset.label)}</button>)}</div>
        <label>{tr(t, 'refine_stop_request', 'Or describe a change to this stop')}<textarea data-refine-stop-request value={request} maxLength={600} disabled={disabled} onChange={event => setRequest(event.target.value)}/></label>
        <div className="lb-row"><button type="button" className="lb-primary" data-refine-stop-submit disabled={disabled || !request.trim()} onClick={() => refineStop(request.trim())}>{tr(t, 'refine_stop_submit', 'Refine this stop with AI')}</button><button type="button" data-edit-stop onClick={() => onEditStop(node.id)}>{tr(t, 'edit_stop', 'Edit by hand')}</button></div>
        {stageText && <p className="lb-muted" aria-hidden="true">{stageText}</p>}
      </section>
      {search && <details data-symbol-editor={node.id}><summary>{tr(t, 'symbol_stop', 'Picture symbol for this stop')}</summary>
        {symbol ? <div className="lb-row"><SupportImage src={symbol} className="lb-symbol lb-symbol-large" t={t}/><button type="button" data-remove-symbol disabled={disabled} onClick={() => onSupport(withoutSymbols(support, board, [node.id]))}>{tr(t, 'symbol_remove', 'Remove symbol')}</button></div> : <p className="lb-muted">{tr(t, 'symbol_none', 'No symbol yet. The icon is shown instead.')}</p>}
        <form onSubmit={searchOne} className="lb-row"><label style={{ flex: '1 1 200px' }}>{tr(t, 'symbol_search', 'Search Mulberry symbols')}<input data-symbol-query value={symbols.query ?? defaultQuery} maxLength={60} onChange={event => setSymbols(state => ({ ...state, query: event.target.value }))}/></label><button type="submit" disabled={disabled || !supportReady || !!symbols.busy}>{tr(t, 'symbol_search_button', 'Search')}</button></form>
        {symbols.results.length > 0 && <div className="lb-symbol-results">{symbols.results.map(item => <button type="button" key={item.id || item.svgUrl} data-symbol-choice={item.svgUrl} aria-label={tr(t, 'symbol_use', 'Use symbol: {label}', { label: item.label || '' })} disabled={disabled || !supportReady} onClick={() => choose(item)}><img src={item.svgUrl} alt="" loading="lazy" referrerPolicy="no-referrer"/></button>)}</div>}
      </details>}
    </article>
    {board.chance === true && <section data-preview-cards aria-label={tr(t, 'preview_cards_title', 'Discovery cards')}><DiceStyles/><h4>{tr(t, 'preview_cards', 'Discovery cards ({count})', { count: board.discoveries?.length || 0 })}</h4>{board.discoveries?.length ? <><div className="lb-discovery-list">{board.discoveries.map(card => <DiscoveryCard key={card.id} card={card} t={t}/>)}</div><p className="lb-muted">{tr(t, 'preview_cards_edit', 'Edit or remove cards in Review and edit the board.')}</p></> : <p className="lb-muted">{tr(t, 'preview_no_cards', 'No discovery cards yet. Lucky rolls give bonus tokens instead. Try Better discovery cards to add some.')}</p>}</section>}
  </details>;
}
