import { tr } from './lesson_board_strings.js';
import { learningSummary, moveDetails, proposalSummary } from './lesson_board_insights.js';
const React = window.React;

export function MovePreview({ board, run, target, t }) {
  const detail = moveDetails(board, run, target.id);
  const amounts = values => values.map((value, index) => value + ' ' + board.resources[index]).join(' · ');
  return <div data-move-preview>
    {target.cost ? <>
      <p>{tr(t, 'cost', 'Cost: {cost}', { cost: amounts(target.cost) })}</p>
      {!detail.complete && !detail.built && (detail.affordable ? <p>{tr(t, 'balance_after', 'Resources after building: {balance}', { balance: amounts(detail.after) })}</p> : <p>{tr(t, 'missing_resources', 'Still needed: {resources}', { resources: amounts(detail.shortfall) })}</p>)}
      {target.effect.kind === 'path' && detail.pathAlreadyOpen && !detail.built && !detail.complete && <p>{tr(t, 'path_open_already', 'That destination is already open. This still counts as a construction, but will not unlock a new location.')}</p>}
    </> : <>
      <p>{tr(t, 'concept_label', 'Lesson concept: {concept}', { concept: detail.concept?.name })} <strong>{detail.newConcept ? tr(t, 'new_concept', 'Still to explore') : tr(t, 'concept_covered', 'Already explored together')}</strong></p>
      {!detail.complete && !detail.explored && <p>{tr(t, 'reward', 'Successful exploration earns: {reward}', { reward: amounts(detail.reward) })}</p>}
      {!detail.complete && detail.opens.length > 0 && !detail.explored && <p>{tr(t, 'opens_locations', 'Successful exploration opens: {locations}', { locations: detail.opens.map(node => node.name).join(', ') })}</p>}
      {detail.connections.length > 0 && <p className="lb-muted">{tr(t, 'connected_locations', 'Connected locations: {locations}', { locations: detail.connections.map(node => node.name).join(', ') })}</p>}
    </>}
  </div>;
}

export function ClassProposals({ board, run, roster, onSelect, t }) {
  const proposals = proposalSummary(board, run, roster), total = proposals.reduce((sum, item) => sum + item.count, 0);
  return <section className="lb-panel" style={{ marginTop: 14 }} aria-label={tr(t, 'class_proposals', 'Class proposals')} data-class-proposals>
    <h3>{tr(t, 'class_proposals', 'Class proposals')}</h3>
    <p>{tr(t, 'proposal_total', '{count}/{total} learners have proposed an available move. Select a proposal to inspect it before choosing.', { count: total, total: Object.keys(roster).length })}</p>
    <div className="lb-row">{proposals.map(item => <button type="button" key={item.id} data-proposal-target={item.id} onClick={() => onSelect(item.id)}>{tr(t, 'proposal_option', '{name} — proposals: {count}', item)}</button>)}</div>
  </section>;
}

export function TeacherLearningReview({ board, run, roster, t }) {
  const summary = learningSummary(board, run, roster);
  return <details data-board-learning><summary>{tr(t, 'class_learning', 'Class learning review')}</summary>
    <p>{tr(t, 'learning_explanation', 'These records include resolved activities only. A successful shared move does not mean everyone answered correctly. Missing responses are kept separate; counts include retries.')}</p>
    <h3>{tr(t, 'concept_review', 'Concept review')}</h3>
    <ul>{summary.concepts.map(concept => <li key={concept.id}><strong>{concept.name}</strong>: {tr(t, 'concept_demonstrated', '{demonstrated}/{responded} responding learners demonstrated this idea at least once.', concept)} {tr(t, 'concept_missing', 'Learners without a recorded response for this idea: {count}.', { count: summary.learners.length - concept.responded })}</li>)}</ul>
    <h3>{tr(t, 'learner_review', 'Learner review')}</h3>
    {summary.learners.length === 0 && <p>{tr(t, 'no_learners', 'No learners have joined this session yet.')}</p>}
    {summary.learners.map(learner => <details key={learner.uid} data-learning-uid={learner.uid}><summary>{learner.name} — {learner.answered ? tr(t, 'recorded_count', '{correct}/{answered} recorded responses correct', learner) : tr(t, 'no_responses', 'No recorded responses')}</summary><ul>{learner.concepts.map(concept => <li key={concept.id}>{concept.name}: {concept.answered ? tr(t, 'recorded_count', '{correct}/{answered} recorded responses correct', concept) : tr(t, 'no_responses', 'No recorded responses')}</li>)}</ul></details>)}
  </details>;
}
