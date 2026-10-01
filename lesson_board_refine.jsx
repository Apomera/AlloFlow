import { tr } from './lesson_board_strings.js';
import { fixGroups } from './lesson_board_quality.js';
const React = window.React;
const { useState } = React;
// Requests are sent to the AI in English; the board keeps its own language.
export const BOARD_PRESETS = [
  { key: 'easier', label: 'Make it easier', instruction: 'Make every activity easier for younger or struggling readers: shorter sentences, simpler words, clearer options and more supportive hints. Keep the same lesson facts.' },
  { key: 'harder', label: 'More challenging', instruction: 'Make the activities more challenging: ask learners to apply and compare ideas, with closer distractors and less direct hints. Keep every answer supported by the lesson.' },
  { key: 'vivid', label: 'More vivid story', instruction: 'Make the world more vivid and fun: give each location a memorable name and scene that fit one story, without adding new lesson facts.' },
  { key: 'shorter', label: 'Less reading', instruction: 'Cut the reading load: one-sentence scenes and short instructions, without removing information learners need to answer.' },
  { key: 'variety', label: 'More variety', instruction: 'Use a better mix of activity formats (choice, order and settings) wherever the lesson supports them.' },
  { key: 'cards', label: 'Better discovery cards', instruction: 'Write three to five discovery cards with surprising, true facts from the lesson, each with an exact lesson quote.' }
];
export const LENGTH_REQUEST = 'Rewrite answer options so learners cannot find the correct answer by its length: keep every option in an activity similar in length and detail.';
export function RefineStyles() {
  return <style>{`.lb .lb-chips{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}.lb .lb-chips button{border-radius:999px;min-height:40px;padding:6px 14px}.lb .lb-refine,.lb .lb-teacher-preview{margin-top:18px;border-top:3px solid var(--accent)}.lb .lb-versions{margin:14px 0}.lb .lb-versions ol{padding-inline-start:20px}.lb .lb-versions li{margin:6px 0}.lb .lb-versions details{margin-top:0;border-top:0;padding-top:0}`}</style>;
}
export function BoardRefine({ disabled, onRefine, t }) {
  const [request, setRequest] = useState('');
  const send = (text, label) => { const value = String(text || '').trim(); if (value && !disabled) Promise.resolve(onRefine(value, label || value)).then(done => { if (done && !label) setRequest(''); }); };
  return <section className="lb-panel lb-refine" data-board-refine aria-label={tr(t, 'refine_title', 'Refine the whole board with AI')}><RefineStyles/>
    <h3>{tr(t, 'refine_title', 'Refine the whole board with AI')}</h3>
    <p className="lb-muted">{tr(t, 'refine_help', 'Pick a quick idea or describe a change. Lesson excerpts stay exact and the board stays playable. Undo restores the previous version.')}</p>
    <div className="lb-chips" role="group" aria-label={tr(t, 'refine_ideas', 'Quick ideas')}>{BOARD_PRESETS.map(preset => <button type="button" key={preset.key} data-refine-board-preset={preset.key} disabled={disabled} onClick={() => send(preset.instruction, tr(t, 'refine_' + preset.key, preset.label))}>{tr(t, 'refine_' + preset.key, preset.label)}</button>)}</div>
    <label>{tr(t, 'refine_request', 'Describe your change')}<textarea data-refine-board-request value={request} maxLength={600} disabled={disabled} placeholder={tr(t, 'refine_placeholder', 'For example: set it on a space station and add two ordering activities')} onChange={event => setRequest(event.target.value)}/></label>
    <button type="button" className="lb-primary" data-refine-board disabled={disabled || !request.trim()} onClick={() => send(request)}>{tr(t, 'refine_submit', 'Refine board')}</button>
  </section>;
}
export function BoardVersions({ versions, onUndo, onRestore, disabled, t }) {
  if (!versions.length) return null;
  return <section className="lb-versions" data-board-versions aria-label={tr(t, 'versions_title', 'Board versions')}><RefineStyles/>
    <div className="lb-row"><button type="button" data-board-undo disabled={disabled} onClick={onUndo}>{tr(t, 'undo_change', 'Undo: {label}', { label: versions[0].label })}</button><span className="lb-muted">{tr(t, 'versions_help', 'Earlier versions last until you close this window. Save the board to keep it.')}</span></div>
    {versions.length > 1 && <details data-board-version-list><summary>{tr(t, 'earlier_versions', 'Earlier versions ({count})', { count: versions.length })}</summary><ol>{versions.map((version, index) => <li key={version.id}><span>{version.label}</span> <button type="button" data-restore-version={index} disabled={disabled} onClick={() => onRestore(index)}>{tr(t, 'restore_version', 'Restore this version')}</button></li>)}</ol></details>}
  </section>;
}
export function GenerationReport({ report, t }) {
  if (!report) return null;
  const groups = fixGroups(report.fixes), changes = report.changes;
  const labels = { reply: tr(t, 'fix_reply', 'Repaired the formatting of the AI reply'), quotes: tr(t, 'fix_quotes', 'Matched lesson excerpts to the exact lesson wording'), activities: tr(t, 'fix_activities', 'Tidied activity formats and answer keys'), map: tr(t, 'fix_map', 'Repaired paths and starting places'), economy: tr(t, 'fix_economy', 'Rebalanced rewards and project costs so every goal is reachable'), details: tr(t, 'fix_details', 'Filled in or shortened small details'), cards: tr(t, 'fix_cards', 'Kept only discovery cards backed by the lesson') };
  const changeText = changes && [changes.changed.length && tr(t, 'report_changed', 'Revised stops: {names}.', { names: changes.changed.join(', ') }), changes.added.length && tr(t, 'report_added', 'New stops: {names}.', { names: changes.added.join(', ') }), changes.removed.length && tr(t, 'report_removed_stops', 'Removed stops: {names}.', { names: changes.removed.join(', ') }), changes.projects && tr(t, 'report_projects', 'Construction projects changed.'), changes.story && tr(t, 'report_story', 'Title, mission or reflection changed.')].filter(Boolean);
  if (!groups.length && report.attempts <= 1 && !report.removed?.length && !changeText) return null;
  return <details className="lb-notice" data-generation-report open={!!changeText}><summary>{report.kind === 'generate' ? tr(t, 'report_generated', 'Board ready. AI requests used: {count}', { count: report.attempts }) : tr(t, 'report_refined', 'Refinement ready. AI requests used: {count}', { count: report.attempts })}</summary>
    {changeText && <p data-report-changes>{changeText.length ? changeText.join(' ') : tr(t, 'report_nothing', 'The AI returned the same board. Try a more specific request.')}</p>}
    {groups.length > 0 && <><p>{tr(t, 'report_fixed', 'Fixed automatically, without inventing lesson facts:')}</p><ul>{groups.map(group => <li key={group} data-fix-group={group}>{labels[group]}</li>)}</ul></>}
    {report.removed?.length > 0 && <p data-report-removed>{tr(t, 'report_removed', 'Removed places the AI could not ground in the lesson: {names}.', { names: report.removed.join(', ') })}</p>}
  </details>;
}
export function DraftRecovery({ failure, onOpen, onAskAI, onDismiss, disabled, t }) {
  if (!failure) return null;
  return <div className="lb-notice" role="group" data-draft-recovery aria-label={tr(t, 'draft_title', 'Recover the AI draft')}>
    <p><strong>{tr(t, 'draft_title', 'Recover the AI draft')}</strong></p>
    <p>{tr(t, 'draft_help', 'The AI draft still has {count} problems. Your current board is unchanged. Open the draft to fix it by hand, or ask the AI to fix only these problems.', { count: failure.errors.length })}</p>
    <ul>{failure.errors.slice(0, 6).map((error, index) => <li key={index}>{error}</li>)}</ul>
    <div className="lb-row"><button type="button" data-open-draft disabled={disabled} onClick={onOpen}>{tr(t, 'draft_open', 'Open the draft to fix by hand')}</button>{onAskAI && <button type="button" data-fix-draft disabled={disabled} onClick={onAskAI}>{tr(t, 'draft_ai', 'Ask the AI to fix these problems')}</button>}<button type="button" data-dismiss-draft disabled={disabled} onClick={onDismiss}>{tr(t, 'draft_dismiss', 'Dismiss')}</button></div>
  </div>;
}
