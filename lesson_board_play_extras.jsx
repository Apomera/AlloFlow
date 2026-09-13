import {AdaptiveReplay} from './lesson_board_replay_ui.jsx';
import {practiceVisualSupport} from './lesson_board_visual.js';
import { VocabularyCards } from './lesson_board_support_ui.jsx';
import { projectPlan } from './lesson_board_strategy.js';
import { ProjectForecast, ProjectComparison } from './lesson_board_strategy_ui.jsx';
import { practiceVariant, canMixPractice } from './lesson_board_learning.js';
import { practicePlan } from './lesson_board_results.js';
import { practiceReason } from './lesson_board_followthrough.jsx';
import * as engine from './lesson_board_engine.js';
import { learningSummary, planningSummary, responseText } from './lesson_board_insights.js';
import { tr } from './lesson_board_strings.js';
const React = window.React;
const { useState, useRef, useEffect } = React;

export function Amounts({ board, values, prefix = '', zeros = false }) {
  return <span className="lb-tokens">{values.map((amount, index) => (zeros || amount > 0) && <span className="lb-token" key={index}><span aria-hidden="true">{index ? '◆' : '●'}</span> {prefix}{amount} <span>{board.resources[index]}</span></span>)}</span>;
}

export function MissionDashboard({ board, run, role, t, compact = false }) {
  const progress = engine.derive(board, run), mission = engine.missionProgress(board, run);
  const goals = [
    { label: tr(t, 'mission_concepts', 'Lesson concepts'), count: mission.concepts, total: mission.totalConcepts },
    ...(mission.requiredLocations ? [{ label: tr(t, 'mission_locations', 'Locations explored'), count: mission.explored, total: mission.requiredLocations }] : []),
    { label: tr(t, 'mission_projects', 'Projects built'), count: mission.projects, total: mission.requiredProjects }
  ];
  if (compact) return <section className="lb-focus-summary" data-board-mission aria-label={tr(t, 'mission_checklist', 'Mission checklist')}><p>{goals.map(goal => goal.label + ': ' + goal.count + '/' + goal.total).join(' · ')}</p><p>{role === 'solo' ? tr(t, 'your_resources', 'Your resources') : tr(t, 'resources', 'Shared resources')}</p><Amounts board={board} values={progress.balance} zeros/></section>;
  return <div className="lb-dashboard" data-board-mission>
    <section className="lb-supplies" aria-label={role === 'solo' ? tr(t, 'your_resources', 'Your resources') : tr(t, 'resources', 'Shared resources')}>
      {board.resources.map((name, index) => <div className="lb-supply" key={index}><span className="lb-supply-symbol" aria-hidden="true">{index ? '◆' : '●'}</span><div><strong>{name}: {progress.balance[index]}</strong><small>{progress.bonus[index] > 0 ? tr(t, 'yield_bonus', '+{count} per successful location', { count: progress.bonus[index] }) : tr(t, 'supply_help', 'Earn by exploring. Spend on projects.')}</small></div></div>)}
    </section>
    <section className="lb-mission" aria-label={tr(t, 'mission_checklist', 'Mission checklist')}>
      <h3>{mission.goal === 'expedition' ? tr(t, 'mission_expedition', 'Full expedition') : mission.goal === 'architect' ? tr(t, 'mission_architect', 'Master builder') : tr(t, 'mission_core', 'Core mission')}</h3>
      <div className="lb-goals">{goals.map(goal => <div key={goal.label} className="lb-goal" data-done={goal.count >= goal.total}><span><span aria-hidden="true">{goal.count >= goal.total ? '✓ ' : '○ '}</span>{goal.label}</span><strong>{goal.count}/{goal.total}</strong><div className="lb-progress" role="progressbar" aria-label={goal.label} aria-valuemin={0} aria-valuemax={goal.total} aria-valuenow={Math.min(goal.count, goal.total)}><span style={{ width: Math.min(100, 100 * goal.count / goal.total) + '%' }}/></div></div>)}</div>
    </section>
  </div>;
}

export function RoutePlanner({ board, run, onSelect, goal: requestedGoal, onGoalChange, t }) {
  const [localGoal, setLocalGoal] = useState(''), goal = requestedGoal ?? localGoal, setGoal = value => { setLocalGoal(value); onGoalChange?.(value); };
  const plan = planningSummary(board, run, goal), progress = engine.derive(board, run), remaining = board.projects.filter(project => !progress.built.includes(project.id));
  const forecasts = React.useMemo(() => board.projects.map(project => projectPlan(board,run,project.id)),[board,run]), forecast = forecasts.find(item => item.project.id === plan.project?.id), completedGoal = board.projects.find(item => item.id === goal && progress.built.includes(item.id));
  return <details className="lb-planner" data-board-planner><summary>{tr(t, 'planner', 'Plan a route or project')}</summary>
    <p className="lb-muted">{tr(t, 'planner_help', 'Choose a construction goal to compare useful moves. These suggestions do not choose or spend anything.')}</p>
    {completedGoal && <p className="lb-notice" data-goal-completed>{tr(t,'remembered_goal_built','{name} is built. Choose another goal when you are ready.',{name:completedGoal.name})}</p>}
    {remaining.length > 0 && <label>{tr(t, 'planner_goal', 'Construction goal')}<select data-planner-goal value={plan.project?.id || ''} onChange={event => setGoal(event.target.value)}>{remaining.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>}
    {plan.project && <div className="lb-planning-goal"><strong>{plan.project.name}</strong>{plan.shortfall.some(value => value > 0) ? <><p>{tr(t, 'planner_need', 'Resources still needed')}</p><Amounts board={board} values={plan.shortfall}/></> : <p>{tr(t, 'planner_ready', 'You can afford this project now. Inspect its effect before building.')}</p>}<button type="button" data-planner-project onClick={() => onSelect(plan.project.id)}>{tr(t, 'inspect_project', 'Inspect project')}</button></div>}
    {plan.project && <div className="lb-row"><button type="button" data-remember-project aria-pressed={goal === plan.project.id} onClick={() => setGoal(plan.project.id)}>{tr(t,'remember_project_goal','Remember this goal')}</button>{goal && <button type="button" data-clear-project-goal onClick={() => setGoal('')}>{tr(t,'clear_project_goal','Clear remembered goal')}</button>}</div>}
    <ProjectForecast board={board} plan={forecast} onInspect={onSelect} t={t}/><ProjectComparison board={board} plans={forecasts} goal={goal} onGoal={setGoal} onInspect={onSelect} t={t}/>
    <h4>{tr(t, 'useful_moves', 'Useful locations open now')}</h4>
    <div className="lb-plan-options">{plan.reachable.map(node => <button type="button" key={node.id} data-planner-location={node.id} onClick={() => onSelect(node.id)}><strong>{node.name}</strong><Amounts board={board} values={node.reward} prefix="+"/><small>{node.newConcept ? tr(t, 'planner_new_concept', 'Covers an unexplored concept') : tr(t, 'planner_reinforce', 'Reinforces a concept')}{node.opens.length > 0 ? ' · ' + tr(t, 'planner_opens', 'Opens {count} locations', { count: node.opens.length }) : ''}</small>{node.contribution?.some(value => value > 0) && <small>{tr(t, 'planner_contributes', 'Helps fund the selected project')}</small>}</button>)}</div>
    {!plan.reachable.length && <p>{tr(t, 'no_open_locations', 'All currently reachable locations are explored. Inspect an available construction.')}</p>}
    {plan.routes.length > 0 && <><h4>{tr(t, 'routes_ahead', 'Routes to unexplored locations')}</h4><ul className="lb-route-list">{plan.routes.map(route => <li key={route.id}><button type="button" onClick={() => onSelect(route.id)}>{route.name}</button><small>{route.path.map(node => node.name).join(' → ')}</small></li>)}</ul></>}
  </details>;
}

export function MoveRecap({ board, run, role, uid, t }) {
  const step = engine.stepOf(run), result = step.result, node = board.locations.find(item => item.id === step.targetId), project = board.projects.find(item => item.id === step.targetId);
  if (!result || (!node && !project)) return null;
  const progress = engine.derive(board, run), beforeRun = { ...run, steps: { ...run.steps, ['t' + run.turn]: { ...step, result: undefined } } }, before = engine.derive(board, beforeRun), priorReady = engine.targets(board, beforeRun).map(item => item.id), newlyReady = engine.targets(board, run).filter(item => !item.cost && !priorReady.includes(item.id)), reward = progress.balance.map((value, index) => value - before.balance[index]), personal = result.marks?.[uid];
  return <div data-board-recap>
    <p className="lb-notice">{project ? tr(t, 'project_completed', 'Project built. Its effect now applies to your board.') : result.success ? tr(t, 'location_completed', 'Location explored. Resources collected and connected paths opened.') : tr(t, 'retry_activity_now', 'This idea needs another look. No resources were lost. Review the evidence, then retry or choose another route.')}</p>
    {result.success && <div className="lb-move-rewards" data-board-rewards><h4>{project ? tr(t, 'spent_this_move', 'Spent on this construction') : tr(t, 'earned_this_move', 'Earned this move')}</h4><Amounts board={board} values={project ? project.cost : reward} prefix={project ? '' : '+'}/>{newlyReady.length > 0 && <p>{tr(t, 'new_routes', 'New locations open: {names}', { names: newlyReady.map(item => item.name).join(', ') })}</p>}</div>}
    {node && <><div className="lb-answer-review" data-board-answer-review>{role !== 'teacher' && step.answers?.[uid]?.value && <p><strong>{tr(t, 'response', 'Your response')}: </strong>{responseText(node, step.answers[uid].value)}</p>}<p><strong>{tr(t, 'solution', 'Solution')}: </strong>{responseText(node, engine.solution(node))}</p></div><p>{node.explanation}</p><blockquote>{node.sourceQuote}</blockquote>{typeof personal === 'boolean' && <p>{personal ? tr(t, 'your_correct', 'Your response demonstrated this idea.') : tr(t, 'your_revisit', 'Revisit your response using this explanation.')}</p>}{role === 'teacher' && <p>{tr(t, 'round_learning', '{correct}/{total} submitted responses were correct.', { correct: Object.values(result.marks || {}).filter(Boolean).length, total: Object.keys(result.marks || {}).length })}</p>}</>}
  </div>;
}

export function IndependentPractice({ board, support, showImages, Activity, t, plan = [], restricted = false }) {
  const available = board.locations.filter(node => !restricted || plan.some(item => item.id === node.id));
  const first = available.find(node => node.id === plan[0]?.id) || available[0];
  const [id, setId] = useState(first?.id), [value, setValue] = useState(first ? engine.initialDraft(first) : ''), [checked, setChecked] = useState(false), [focused, setFocused] = useState(false), [reviewed, setReviewed] = useState([]), [round, setRound] = useState(0), [checks, setChecks] = useState({correct:0,total:0}), result = useRef(null), activityHeading = useRef(null);
  const options = focused ? available.filter(node => plan.some(item => item.id === node.id)) : available, original = options.find(item => item.id === id) || options[0], node = original ? practiceVariant(original,round) : null;
  useEffect(() => { if (checked) result.current?.focus(); }, [checked]);
  if (!node) return null;
  const selectNode = next => { if (!next) return; const canonical = available.find(item => item.id === next.id) || next; setId(canonical.id); setRound(0); setValue(engine.initialDraft(canonical)); setChecked(false); };
  const next = plan.find(item => item.id !== node.id && !reviewed.includes(item.id));
  return <details data-board-practice><summary>{restricted ? tr(t, 'practice_targeted', 'Practice your review priorities') : tr(t, 'practice_title', 'Practice any location')}</summary>
    <p>{tr(t, 'practice_help', 'Try any activity again or explore one you missed. Practice stays here and does not change the saved board, resources, or recorded responses.')}</p>
    {checks.total > 0 && <p data-practice-checks role="status">{tr(t, 'practice_check_totals', 'Practice responses correct: {correct}/{total}. These totals belong to this practice session.', checks)}</p>}
    {plan.length > 0 && <section data-practice-plan><h4>{tr(t, 'practice_recommendations', 'Recommended starting points')}</h4><ul>{plan.map(item => <li key={item.id}><button type="button" data-practice-suggestion={item.id} onClick={() => selectNode(available.find(node => node.id === item.id))}>{item.name}</button> {practiceReason(t, item.reason)}</li>)}</ul><p role="status">{tr(t, 'practice_reviewed', 'Reviewed {count} of {total} suggested activities here.', { count: plan.filter(item => reviewed.includes(item.id)).length, total: plan.length })}</p>{!restricted && <label className="lb-row"><input style={{width:'auto'}} type="checkbox" data-practice-focus checked={focused} onChange={event => {setFocused(event.target.checked); selectNode(event.target.checked ? available.find(node => node.id === plan[0].id) : node); }}/>{tr(t, 'practice_focus', 'Show only suggested activities')}</label>}</section>}
    <label>{tr(t, 'practice_location', 'Practice location')}<select data-practice-location value={node.id} onChange={event => selectNode(available.find(item => item.id === event.target.value))}>{options.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    {canMixPractice(original) ? <><button type="button" data-practice-mix onClick={() => { const next = round + 1; setRound(next); setValue(engine.initialDraft(practiceVariant(original,next))); setChecked(false); setTimeout(() => activityHeading.current?.focus(),0); }}>{tr(t, 'practice_mix', 'Change answer order')}</button><p className="lb-muted">{tr(t, 'practice_mix_help', 'Try the same question with choices in a different order. Changing the order clears the current practice response.')}</p></> : <p className="lb-muted" data-practice-fixed-order>{tr(t, 'practice_fixed_order', 'This activity keeps its original answer order because its wording may refer to choice positions.')}</p>}
    <section className="lb-practice-activity" data-practice-activity><h4 ref={activityHeading} tabIndex={-1}>{node.name}</h4><p>{node.scene}</p><p>{node.instruction}</p><VocabularyCards support={support} nodeId={node.id} showImages={showImages} reviewed t={t}/><Activity support={practiceVisualSupport(support,original,node)} showImages={showImages} key={node.id + ':' + round} node={node} value={value} disabled={checked} onChange={setValue} t={t}/><details data-practice-evidence key={'evidence:' + node.id}><summary>{tr(t, 'hints', 'Hints and lesson evidence')}</summary><blockquote>{node.sourceQuote}</blockquote>{node.hints.map((hint, index) => <details key={index}><summary>{tr(t, 'hint', 'Hint {number}', { number: index + 1 })}</summary><p>{hint}</p></details>)}</details>
      {!checked ? <button className="lb-primary" type="button" data-practice-check disabled={!engine.validValue(node, value)} onClick={() => { setChecked(true); setChecks(previous => ({correct:previous.correct + Number(value === engine.solution(node)),total:previous.total + 1})); setReviewed(previous => [...new Set([...previous,node.id])]); }}>{tr(t, 'practice_check', 'Check practice response')}</button> : <div data-practice-result><h4 ref={result} tabIndex={-1}>{value === engine.solution(node) ? tr(t, 'practice_correct', 'Your reasoning fits this activity') : tr(t, 'practice_review', 'Compare your response with the lesson')}</h4><p><strong>{tr(t, 'response', 'Your response')}: </strong>{responseText(node, value)}</p><p><strong>{tr(t, 'solution', 'Solution')}: </strong>{responseText(node, engine.solution(node))}</p><p>{node.explanation}</p><blockquote>{node.sourceQuote}</blockquote><div className="lb-row"><button type="button" onClick={() => selectNode(node)}>{tr(t, 'practice_again', 'Try this activity again')}</button>{next && <button type="button" data-practice-next onClick={() => selectNode(available.find(item => item.id === next.id))}>{tr(t, 'practice_next_suggestion', 'Next suggested activity')}</button>}</div></div>}
    </section>
  </details>;
}

export function LearningJournal({ board, run, support, showImages, role, uid, roster, Activity, replay, onReplayChange, onShare, disabled, t }) {
  const progress = engine.derive(board, run), personal = role === 'teacher' ? null : learningSummary(board, run, { [uid]: roster[uid] || { name: tr(t, 'you', 'You') } }).learners[0];
  const plan = role === 'teacher' ? [] : practicePlan(board,run,uid,roster);
  const reviewAll = progress.complete || engine.turnLimit(board, run).reached && engine.stepOf(run).phase === 'review';
  const moves = Object.entries(run.steps || {}).filter(([, step]) => step.result).sort(([a], [b]) => Number(a.slice(1)) - Number(b.slice(1)));
  return <details data-board-journal open={reviewAll || undefined}><summary>{tr(t, 'learning_trail', 'Learning trail')}</summary>
    {reviewAll&&<AdaptiveReplay onShare={onShare} board={board} run={run} uid={uid} role={role} support={support} showImages={showImages} value={replay} onChange={onReplayChange} disabled={disabled} Activity={Activity} t={t}/>}
    <p>{tr(t, 'journal_help', 'Follow the ideas and decisions behind your route. Shared exploration and personal understanding are recorded separately.')}</p>
    <div className="lb-concept-list">{board.concepts.map(concept => <div key={concept.id}><span aria-hidden="true">{progress.concepts.includes(concept.id) ? '✓' : '○'}</span><strong>{concept.name}</strong><small>{progress.concepts.includes(concept.id) ? tr(t, 'explored', 'Explored') : tr(t, 'not_yet', 'Still to explore')}</small></div>)}</div>
    {personal?.answered > 0 && <section data-personal-learning><h3>{tr(t, 'personal_learning', 'Your learning review')}</h3><p>{tr(t, 'personal_progress', 'First responses correct: {first}. Latest responses correct: {latest}. Locations attempted: {total}.', { first: personal.firstCorrectCount, latest: personal.latestCorrectCount, total: personal.attemptedLocations })}</p><ul>{personal.locations.filter(item => item.answered).map(item => <li key={item.id}><strong>{item.name}</strong>: {item.lastCorrect ? tr(t, 'latest_correct', 'Latest response correct') : tr(t, 'latest_revisit', 'Latest response needs review')}{item.improved && <span> · {tr(t, 'improved', 'Improved after review')}</span>}</li>)}</ul></section>}
    {moves.length > 0 && <details data-board-timeline><summary>{tr(t, 'route_journal', 'Route and construction journal')}</summary><ol className="lb-timeline">{moves.map(([key, step]) => { const node = [...board.locations, ...board.projects].find(item => item.id === step.targetId); return node && <li key={key}><strong>{node.name}</strong><small>{node.cost ? tr(t, 'built', 'Built') : step.result.success ? tr(t, 'explored', 'Explored') : tr(t, 'revisit', 'Needs review')}</small></li>; })}</ol></details>}
    {board.locations.filter(node => reviewAll || progress.visited.includes(node.id)).map(node => <details key={node.id} data-journal-location={node.id}><summary>{node.name} · {progress.visited.includes(node.id) ? tr(t, 'explored', 'Explored') : tr(t, 'not_explored_game', 'Not explored in this game')}</summary><p>{node.instruction}</p><p><strong>{tr(t, 'solution', 'Solution')}: </strong>{responseText(node, engine.solution(node))}</p><p>{node.explanation}</p><blockquote>{node.sourceQuote}</blockquote></details>)}
    {(reviewAll || plan.length > 0) && <IndependentPractice support={support} showImages={showImages} key={reviewAll ? 'full' : plan.map(item=>item.id).join(':')} board={board} Activity={Activity} t={t} plan={plan} restricted={!reviewAll}/> }
  </details>;
}
