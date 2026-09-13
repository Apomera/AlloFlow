import { practicePlan, learningReport } from './lesson_board_results.js';
import { practiceReason, ConceptReview } from './lesson_board_followthrough.jsx';
import { Amounts } from './lesson_board_play_extras.jsx';
import { tr } from './lesson_board_strings.js';
import { learningSummary, moveDetails, proposalSummary } from './lesson_board_insights.js';
const React = window.React;

export function MovePreview({ board, run, target, t }) {
  const detail = moveDetails(board, run, target.id);
  const amounts = values => values.map((value, index) => value + ' ' + board.resources[index]).join(' · ');
  return <div className="lb-move-preview" data-move-preview>
    {target.cost ? <>
      <h4>{tr(t, 'project_cost', 'Construction cost')}</h4><Amounts board={board} values={target.cost}/>
      {!detail.complete && !detail.built && (detail.affordable ? <p>{tr(t, 'balance_after', 'Resources after building: {balance}', { balance: amounts(detail.after) })}</p> : <p>{tr(t, 'missing_resources', 'Still needed: {resources}', { resources: amounts(detail.shortfall) })}</p>)}
      {target.effect.kind === 'yield' && !detail.built && !detail.complete && <p className="lb-muted">{tr(t, 'yield_planning', 'This upgrade could add up to {count} extra {resource} across the {remaining} unexplored locations. Build it early to use more of its benefit.', { count: detail.yieldPotential?.[target.effect.resource] || 0, resource: board.resources[target.effect.resource], remaining: detail.yieldRemaining || 0 })}</p>}
      {target.effect.kind === 'path' && detail.pathAlreadyOpen && !detail.built && !detail.complete && <p>{tr(t, 'path_open_already', 'That destination is already open. This still counts as a construction, but will not unlock a new location.')}</p>}
    </> : <>
      <p>{tr(t, 'concept_label', 'Lesson concept: {concept}', { concept: detail.concept?.name })} <strong>{detail.newConcept ? tr(t, 'new_concept', 'Still to explore') : tr(t, 'concept_covered', 'Already explored together')}</strong></p>
      {!detail.complete && !detail.explored && <div><h4>{tr(t, 'exploration_reward', 'Reward for successful exploration')}</h4><Amounts board={board} values={detail.reward} prefix="+"/></div>}
      {!detail.complete && detail.opens.length > 0 && !detail.explored && <p>{tr(t, 'opens_locations', 'Successful exploration opens: {locations}', { locations: detail.opens.map(node => node.name).join(', ') })}</p>}
      {detail.unlockPath?.length > 1 && !detail.explored && <p>{tr(t, 'unlock_route', 'Route to this location: {route}', { route: detail.unlockPath.map(node => node.name).join(' → ') })}</p>}
      {detail.connections.length > 0 && <p className="lb-muted">{tr(t, 'connected_locations', 'Connected locations: {locations}', { locations: detail.connections.map(node => node.name).join(', ') })}</p>}
    </>}
  </div>;
}

export function ClassProposals({ board, run, roster, onSelect, t }) {
  const proposals = proposalSummary(board, run, roster), total = proposals.reduce((sum, item) => sum + item.count, 0);
  return <section className="lb-panel" style={{ marginTop: 14 }} aria-label={tr(t, 'class_proposals', 'Class proposals')} data-class-proposals>
    <h3>{tr(t, 'class_proposals', 'Class proposals')}</h3>
    <p>{tr(t, 'proposal_total', '{count}/{total} learners have proposed an available move. Select a proposal to inspect it before choosing.', { count: total, total: Object.keys(roster).length })}</p>
    <div className="lb-row">{proposals.slice().sort((a,b) => b.count - a.count).map(item => <button type="button" key={item.id} data-proposal-target={item.id} onClick={() => onSelect(item.id)}>{tr(t, 'proposal_option', '{name}: {count} proposals', item)}</button>)}</div>
  </section>;
}

export function TeacherLearningReview({ board, run, roster, t }) {
  const summary = learningSummary(board, run, roster);
  return <details data-board-learning><summary>{tr(t, 'class_learning', 'Class learning review')}</summary>
    <p>{tr(t, 'learning_explanation', 'These records include resolved activities only. A successful shared move does not mean everyone answered correctly. Missing responses are kept separate; counts include retries.')}</p>
    <ConceptReview report={learningReport(board,run,roster,{mode:'teacher'})} t={t}/>
    <h3>{tr(t, 'learner_review', 'Learner review')}</h3>
    {summary.learners.length === 0 && <p>{tr(t, 'no_learners', 'No learners have joined this session yet.')}</p>}
    {summary.learners.map(learner => <details key={learner.uid} data-learning-uid={learner.uid}><summary>{learner.name}: {learner.answered ? tr(t, 'recorded_count', '{correct}/{answered} recorded responses correct', learner) : tr(t, 'no_responses', 'No recorded responses')}</summary><p>{tr(t, 'personal_progress', 'First responses correct: {first}. Latest responses correct: {latest}. Locations attempted: {total}.', { first: learner.firstCorrectCount, latest: learner.latestCorrectCount, total: learner.attemptedLocations })}</p><ul>{learner.concepts.map(concept => <li key={concept.id}>{concept.name}: {concept.answered ? tr(t, 'recorded_count', '{correct}/{answered} recorded responses correct', concept) : tr(t, 'no_responses', 'No recorded responses')}</li>)}</ul><h4>{tr(t,'report_practice','Suggested practice')}</h4><ul data-learner-practice={learner.uid}>{practicePlan(board,run,learner.uid,roster).map(item=><li key={item.id}>{item.name}: {practiceReason(t,item.reason)}</li>)}</ul></details>)}
  </details>;
}
