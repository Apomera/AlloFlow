import { tr } from './lesson_board_strings.js';
import { Amounts } from './lesson_board_play_extras.jsx';
const React = window.React;
export function PlanStatus({ plan, t }) {
  if (!plan) return null;
  const status = plan.status;
  return <p data-project-plan-status={status}>{status === 'ready' ? tr(t,'plan_ready','Ready to build with current resources.') : status === 'funded' ? tr(t,'plan_move_count','{count} successful explorations, then 1 construction.',{count:plan.steps.length}) : status === 'turn-limit' ? tr(t,'plan_turn_limit','This plan needs {needed} moves, but only {remaining} move slots remain.',{needed:plan.moves,remaining:plan.slots}) : status === 'finish-move' ? tr(t,'plan_finish_move','Finish the current move to calculate the next exploration sequence.') : status === 'built' ? tr(t,'already_built','This project is already built.') : status === 'complete' ? tr(t,'plan_complete','The mission is complete. Start another board to try a different construction plan.') : tr(t,'plan_unavailable','No exploration-only plan funds this project before the mission ends. Compare another goal or an income upgrade.')}</p>;
}
function ForecastEffects({ board, plan, t }) {
  if (!['ready','funded'].includes(plan.status)) return null;
  const project = plan.project;
  return <><p>{project.effect.kind === 'yield' ? tr(t, 'yield_effect', 'Future successful locations earn +1 {resource}.', {resource:board.resources[project.effect.resource]}) : tr(t, 'path_effect', 'Opens a direct path to {location}.', {location:board.locations.find(node=>node.id===project.effect.targetId)?.name})}</p>{plan.completesMission && <p data-plan-completes>{tr(t,'plan_completes','Building this project at the end of this plan would complete the mission.')}</p>}
    {project.effect.kind === 'yield' && <p>{tr(t,'plan_income','At most {count} extra {resource} after this plan. Actual gain depends on future successful moves.',{count:plan.bonusPotential,resource:board.resources[project.effect.resource]})}</p>}
    {project.effect.kind === 'path' && !plan.shortcutUseful && <p data-plan-redundant>{tr(t,'plan_shortcut_open','The destination would already be open by the time this plan builds the shortcut. The project still counts toward construction goals.')}</p>}
  </>;
}
export function ProjectForecast({ board, plan, onInspect, t }) {
  if (!plan) return null;
  const useful = ['ready','funded'].includes(plan.status);
  return <section data-project-forecast={plan.project.id}><h4>{tr(t,'plan_steps_title','Suggested exploration sequence')}</h4><PlanStatus plan={plan} t={t}/>
    <p className="lb-muted">{tr(t,'plan_assumptions','Estimates assume each listed activity succeeds and no other project is built first. The plan updates from confirmed progress after each move.')}</p>
    {useful && <>{plan.steps.length > 0 && <ol className="lb-route-list">{plan.steps.map((step,index)=><li key={step.id} data-funding-step={step.id}><strong>{step.name}</strong><Amounts board={board} values={step.reward} prefix="+"/><small>{tr(t,'plan_projected_balance','Projected supplies after this step')}</small><Amounts board={board} values={step.balance} zeros/>{index===0 && <button type="button" data-inspect-planned-move={step.id} onClick={()=>onInspect(step.id)}>{tr(t,'plan_inspect_next','Inspect first planned move')}</button>}</li>)}</ol>}
      <p>{tr(t,'plan_after_build','Projected supplies after construction')}</p><Amounts board={board} values={plan.after} zeros/><ForecastEffects board={board} plan={plan} t={t}/>
    </>}
  </section>;
}
export function ProjectComparison({ board, plans, goal, onGoal, onInspect, t }) {
  return <details data-project-comparison><summary>{tr(t,'compare_projects','Compare construction plans')}</summary><p className="lb-muted">{tr(t,'compare_projects_help','Compare the exploration effort, remaining supplies, and effect of each project. Each estimate starts with the same confirmed progress.')}</p><div className="lb-form">{plans.map(plan=><section className="lb-panel" key={plan.project.id} data-compare-project={plan.project.id}><h4>{plan.project.name}</h4><p>{plan.project.description}</p><p><strong>{tr(t,'project_cost','Construction cost')}</strong></p><Amounts board={board} values={plan.project.cost}/><PlanStatus plan={plan} t={t}/>{['ready','funded'].includes(plan.status) && <><p>{tr(t,'plan_after_build','Projected supplies after construction')}</p><Amounts board={board} values={plan.after} zeros/></>}<ForecastEffects board={board} plan={plan} t={t}/><div className="lb-row"><button type="button" onClick={()=>onInspect(plan.project.id)}>{tr(t,'inspect_project','Inspect project')}</button>{!['built','complete'].includes(plan.status) && <button type="button" data-use-project-goal={plan.project.id} aria-pressed={goal===plan.project.id} onClick={()=>onGoal(plan.project.id)}>{tr(t,'use_project_goal','Use this construction goal')}</button>}</div></section>)}</div></details>;
}
