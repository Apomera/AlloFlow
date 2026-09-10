import { Activity, tr } from './lesson_board_ui.jsx';
import { validateBoard } from './lesson_board_engine.js';
const React = window.React;

export function BoardAuthoring({ board, source, disabled, onChange, t }) {
  const errors = validateBoard(board, source);
  const edit = (id, patch) => onChange({ ...board, locations: board.locations.map(node => node.id === id ? { ...node, ...patch } : node) });
  const controlEdit = (node, index, patch) => edit(node.id, { controls: node.controls.map((control, i) => i === index ? { ...control, ...patch } : control) });
  const textField = (label, value, limit, onChange, data = {}) => <label>{label}<textarea {...data} value={value} maxLength={limit} disabled={disabled} onChange={event => onChange(event.target.value)}/></label>;
  return <details data-board-editor><summary>{tr(t, 'edit_board', 'Review and edit the board')}</summary>
    <p>{tr(t, 'editor_help', 'Review every option, solution, hint and source excerpt. Edits apply to this board before play; saved copies stay unchanged until you save again.')}</p>
    {errors.length > 0 && <div className="lb-notice" role="status" data-board-validation><strong>{tr(t, 'editor_fix', 'Fix these items before saving or playing:')}</strong><ul>{errors.map((error, index) => <li key={index}>{error}</li>)}</ul></div>}
    <label>{tr(t, 'board_title', 'Board title')}<input maxLength={120} value={board.title} disabled={disabled} onChange={event => onChange({ ...board, title: event.target.value })}/></label>
    {textField(tr(t, 'mission', 'Mission'), board.mission, 1200, value => onChange({ ...board, mission: value }))}
    {textField(tr(t, 'debrief', 'Closing reflection'), board.debrief, 1200, value => onChange({ ...board, debrief: value }))}
    {board.locations.map(node => <details key={node.id} data-edit-location={node.id}><summary>{node.name} · {board.concepts.find(concept => concept.id === node.conceptId)?.name}</summary>
      {textField(tr(t, 'scene', 'Location description'), node.scene, 450, value => edit(node.id, { scene: value }))}
      {textField(tr(t, 'instruction', 'Activity instruction'), node.instruction, 900, value => edit(node.id, { instruction: value }))}
      <fieldset disabled={disabled}><legend>{tr(t, 'options_key', 'Response options and answer key')}</legend>
        {node.kind === 'choice' && <>{node.options.map((option, index) => textField(tr(t, 'option_number', 'Option {number}', { number: index + 1 }), option, 220, value => edit(node.id, { options: node.options.map((old, i) => i === index ? value : old) }), { key: index, 'data-edit-option': index }))}<label>{tr(t, 'correct_option', 'Correct option')}<select data-edit-answer value={node.answer} onChange={event => edit(node.id, { answer: Number(event.target.value) })}>{node.options.map((option, index) => <option key={index} value={index}>{index + 1}. {option}</option>)}</select></label></>}
        {node.kind === 'order' && <>{node.items.map((item, index) => textField(tr(t, 'item_number', 'Item {number}', { number: index + 1 }), item, 180, value => edit(node.id, { items: node.items.map((old, i) => i === index ? value : old) }), { key: index, 'data-edit-item': index }))}<p>{tr(t, 'correct_order', 'Arrange the correct order with the up and down buttons.')}</p><Activity node={node} value={node.order.join(',')} disabled={disabled} t={t} onChange={value => edit(node.id, { order: value.split(',').map(Number) })}/></>}
        {node.kind === 'settings' && node.controls.map((control, index) => <fieldset key={index} data-edit-control={index}><legend>{tr(t, 'control_number', 'Setting {number}', { number: index + 1 })}</legend><label>{tr(t, 'control_label', 'Setting label')}<input maxLength={100} value={control.label} onChange={event => controlEdit(node, index, { label: event.target.value })}/></label>{control.options.map((option, item) => textField(tr(t, 'option_number', 'Option {number}', { number: item + 1 }), option, 160, value => controlEdit(node, index, { options: control.options.map((old, i) => i === item ? value : old) }), { key: item, 'data-edit-option': item }))}<label>{tr(t, 'correct_option', 'Correct option')}<select data-edit-answer value={control.answer} onChange={event => controlEdit(node, index, { answer: Number(event.target.value) })}>{control.options.map((option, item) => <option key={item} value={item}>{item + 1}. {option}</option>)}</select></label></fieldset>)}
      </fieldset>
      {textField(tr(t, 'explanation', 'Explanation'), node.explanation, 1000, value => edit(node.id, { explanation: value }))}
      {node.hints.map((hint, index) => textField(tr(t, 'hint', 'Hint {number}', { number: index + 1 }), hint, 400, value => edit(node.id, { hints: node.hints.map((old, i) => i === index ? value : old) }), { key: index, 'data-edit-hint': index }))}
      {textField(tr(t, 'source_excerpt', 'Exact lesson excerpt'), node.sourceQuote, 650, value => edit(node.id, { sourceQuote: value }), { 'data-edit-quote': true })}
    </details>)}
    {board.projects.map(project => <details key={project.id}><summary>{project.name}</summary><p>{project.description}</p><p>{project.cost.map((value, index) => value + ' ' + board.resources[index]).join(' · ')}</p><p>{project.effect.kind === 'yield' ? tr(t, 'yield_effect', 'Future successful locations earn +1 {resource}.', { resource: board.resources[project.effect.resource] }) : tr(t, 'path_effect', 'Opens a direct path to {location}.', { location: board.locations.find(node => node.id === project.effect.targetId)?.name })}</p></details>)}
  </details>;
}
