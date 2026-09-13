import { conceptPriorities } from './lesson_board_learning.js';
import { useBoardEscape } from './lesson_board_accessibility.js';
import { tr } from './lesson_board_strings.js';
import { roleAssignments } from './lesson_board_roles.js';
import { learningReport, readReports, saveReport, removeReport, downloadReport } from './lesson_board_results.js';
const React = window.React;
const { useState, useEffect, useRef } = React;
export const practiceReason = (t, reason) => reason === 'revisit' ? tr(t, 'practice_reason_revisit', 'Latest response needs review') : reason === 'unattempted' ? tr(t, 'practice_reason_unattempted', 'No recorded response yet') : tr(t, 'practice_reason_strengthen', 'Reinforce improvement after review');
export function CoveragePanel({ coverage, t, compact = false }) {
  const [filter, setFilter] = useState('all'), [page, setPage] = useState(0), [search, setSearch] = useState('');
  useEffect(() => setPage(0), [filter, search, coverage]);
  const items = (coverage?.items || []).filter(item => (filter === 'all' || (filter === 'linked') === !!item.locations.length) && (item.label + ' ' + item.index).toLowerCase().includes(search.toLowerCase()));
  const pages = Math.max(1, Math.ceil(items.length / 25)), currentPage = Math.min(page, pages - 1), displayed = items.slice(currentPage * 25, currentPage * 25 + 25);
  return <details data-board-coverage><summary>{tr(t, 'coverage_title', 'Assessment coverage')}</summary><p>{tr(t, 'coverage_boundary', 'Full expedition covers every board location. It does not automatically cover the entire original assessment.')}</p>
    {!coverage?.total ? <p>{tr(t, 'coverage_unavailable', 'The original assessment is not attached here. Item coverage cannot be established from the board alone.')}</p> : <><p data-coverage-count>{tr(t, 'coverage_counts', '{linked} of {total} assessment items have an exact lesson-excerpt link to this board.', coverage)}</p><p className="lb-muted">{tr(t, 'coverage_method', 'Links show shared lesson evidence, not equivalent questions or proof that every skill is assessed. Items without a link need teacher review.')}</p>
      {!compact && <><label>{tr(t, 'coverage_filter', 'Show assessment items')}<select data-coverage-filter value={filter} onChange={event => setFilter(event.target.value)}><option value="all">{tr(t, 'coverage_all', 'All original items')}</option><option value="linked">{tr(t, 'coverage_linked', 'With an excerpt link')}</option><option value="unlinked">{tr(t, 'coverage_unlinked', 'Without a confirmed link')}</option></select></label><label>{tr(t, 'coverage_search', 'Find an item')}<input data-coverage-search value={search} onChange={event => setSearch(event.target.value)}/></label></>}
      <ol start={currentPage * 25 + 1}>{displayed.map(item => <li key={item.index} data-coverage-item={item.index}><strong>{tr(t, 'coverage_item', 'Item {index}: {label}', item)}</strong><p>{item.locations.length ? item.locations.map(node => node.name).join(' · ') : tr(t, 'coverage_no_link', 'No confirmed excerpt link')}</p></li>)}</ol>{!displayed.length && <p>{tr(t, 'coverage_no_matches', 'No items match this view.')}</p>}
      {pages > 1 && <div className="lb-row"><button type="button" data-coverage-prev disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>{tr(t, 'previous_page', 'Previous page')}</button><span role="status">{tr(t, 'coverage_page', 'Page {page} of {pages}', { page: currentPage + 1, pages })}</span><button type="button" data-coverage-next disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}>{tr(t, 'next_page', 'Next page')}</button></div>}
      {compact && coverage.listed < coverage.linked && <p>{tr(t, 'coverage_compact', 'This report lists the first {count} linked items. Open board setup with the original assessment for the full item list.', { count: coverage.listed })}</p>}
    </>}
  </details>;
}
export function ClassroomRoles({ config, roster, run, uid, teacher, onToggle, busy, t }) {
  const [open, setOpen] = useState(!!config?.enabled);
  useEffect(() => { if (config?.enabled) setOpen(true); }, [config?.enabled]);
  const assignments = roleAssignments(config, roster, run.turn), own = assignments.filter(item => item.uid === uid);
  if (!teacher && !config?.enabled) return null;
  return <details data-board-roles open={open} onToggle={event => setOpen(event.currentTarget.open)}><summary>{tr(t, 'roles_title', 'Classroom roles')}</summary>{teacher && <label className="lb-row"><input style={{ width: 'auto' }} type="checkbox" data-toggle-board-roles checked={!!config?.enabled} disabled={busy} onChange={onToggle}/>{tr(t, 'roles_toggle', 'Use rotating classroom roles')}</label>}
    {config?.enabled && <><p>{tr(t, 'roles_help', 'Roles rotate when a new move opens. A retry keeps the same roles. Everyone can propose moves and answer every activity; learners may share or pass a responsibility.')}</p><div className="lb-form">{(teacher ? assignments : own).map(item => <section className="lb-panel" key={item.id} data-class-role={item.id}><h4>{tr(t, item.key, item.label)}</h4>{teacher && <strong>{roster[item.uid]?.name || item.uid}</strong>}<p>{tr(t, item.helpKey, item.help)}</p></section>)}</div>{!assignments.length && <p>{tr(t, 'roles_waiting', 'Roles will appear when learners join.')}</p>}{!teacher && !own.length && <p>{tr(t, 'roles_contributor', 'You are a contributing explorer this move. Offer a proposal, examine the evidence, and submit your response.')}</p>}</>}
  </details>;
}
export function ConceptReview({ report, t }) {
  const concepts = conceptPriorities(report);
  const groups = [
    {id:'revisit',key:'concept_group_revisit',label:'Review the latest response',helpKey:'concept_group_revisit_help',help:'Use lesson evidence to explain the latest response, then try again.'},
    {id:'missing',key:'concept_group_missing',label:'Collect a missing response',helpKey:'concept_group_missing_help',help:'Offer a chance to respond to these reviewed activities.'},
    {id:'strengthen',key:'concept_group_strengthen',label:'Reinforce improvement',helpKey:'concept_group_strengthen_help',help:'Ask learners to explain what changed between their first and latest responses.'}
  ];
  return <section data-concept-priorities><h3>{tr(t,'concept_review','Concept review')}</h3><p className="lb-muted">{tr(t,'concept_review_basis',"Across recorded activities and suggested practice, compare each learner's first and latest response. Additional retries do not increase these totals. A learner may appear in more than one practice group.")}</p>
    {concepts.map(concept => <details key={concept.id} data-concept-priority={concept.id}><summary>{concept.name}{concept.reviewed > 0 ? ' · ' + (concept.attempted ? tr(t,'concept_latest_counts','Latest responses correct: {correct}/{total}.',{correct:concept.latestCorrect,total:concept.attempted}) : tr(t,'no_responses','No recorded responses')) : ''}</summary>
      {!concept.reviewed ? <p>{tr(t,'concept_not_reviewed','No locations reviewed for this concept yet.')}</p> : <>{concept.attempted > 0 && <p>{tr(t,'concept_first_counts','First responses correct: {correct}/{total}.',{correct:concept.firstCorrect,total:concept.attempted})}</p>}
      {groups.map(group => concept[group.id].length > 0 && <section key={group.id} data-concept-group={group.id}><h4>{tr(t,group.key,group.label)} ({concept[group.id].length})</h4><p>{tr(t,group.helpKey,group.help)}</p><ul>{concept[group.id].map(learner => <li key={learner.uid}><strong>{learner.name}</strong>: {learner.locations.map(node => node.name).join(' · ')}</li>)}</ul></section>)}
      {!groups.some(group => concept[group.id].length) && <p>{tr(t,'concept_extend','Latest recorded responses are correct. Invite learners to explain a connection or apply the idea in another example.')}</p>}</>}
    </details>)}
  </section>;
}

export function ReportPreview({ report, t }) {
  return <><p>{report.boardTitle} · {new Date(report.savedAt).toLocaleString()}</p><p>{report.complete ? tr(t, 'report_complete', 'Mission complete') : tr(t, 'report_in_progress', 'Progress snapshot')}</p><p className="lb-muted">{tr(t, 'report_interpretation', 'Results describe these board activities. Missing responses are separate from incorrect responses; practice here does not change the recorded results.')}</p>
    <ConceptReview report={report} t={t}/>{report.learners.map(learner => <details key={learner.uid} data-report-learner><summary>{learner.name}</summary><p>{tr(t, 'personal_progress', 'First responses correct: {first}. Latest responses correct: {latest}. Locations attempted: {total}.', { first: learner.firstCorrectCount, latest: learner.latestCorrectCount, total: learner.attemptedLocations })}</p><h4>{tr(t, 'report_practice', 'Suggested practice')}</h4>{learner.practice.length ? <ul>{learner.practice.map(item => <li key={item.id}>{item.name}: {practiceReason(t, item.reason)}</li>)}</ul> : <p>{tr(t, 'report_no_practice', 'No review priorities are identified in the resolved activities so far.')}</p>}</details>)}<CoveragePanel coverage={report.coverage} compact t={t}/></>;
}
export function ReportActions({ board, run, roster, context = {}, t }) {
  const [message, setMessage] = useState(''), [error, setError] = useState('');
  useEffect(() => { setMessage(''); setError(''); }, [board, run, context.attemptId, context.owner]);
  const report = learningReport(board, run, roster, context), hasEvidence = report.learners.some(item => item.answered);
  const perform = fn => { try { setError(''); fn(); } catch (failure) { setError(failure.message || tr(t, 'report_failed', 'The report could not be saved or downloaded.')); } };
  return <details data-board-report><summary>{tr(t, 'report_title', 'Save or export learning results')}</summary><p>{tr(t, 'report_storage_help', 'Saved reports stay on this device under the current account. They are available from board setup. Downloads include the learner names shown in this review.')}</p>{!hasEvidence && <p>{tr(t, 'report_wait', 'Resolve an activity to create a learning report.')}</p>}
    <div className="lb-row"><button type="button" data-save-board-report disabled={!hasEvidence || context.preview} onClick={() => perform(() => { saveReport(localStorage, context.appId, context.owner, report); setMessage(tr(t, 'report_saved', 'Learning report saved on this device.')); })}>{tr(t, 'report_save', 'Save learning report')}</button><button type="button" data-export-board-report="csv" disabled={!hasEvidence} onClick={() => perform(() => downloadReport(report, 'csv'))}>{tr(t, 'report_csv', 'Download results CSV')}</button><button type="button" data-export-board-report="json" disabled={!hasEvidence} onClick={() => perform(() => downloadReport(report))}>{tr(t, 'report_json', 'Download full report')}</button></div>
    {context.preview && <p>{tr(t, 'report_preview_notice', 'Preview results can be downloaded but are not saved as a learner report.')}</p>}{message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}{hasEvidence && <ReportPreview report={report} t={t}/>}</details>;
}
export function ReportLibrary({ appId, owner, t }) {
  const scope = JSON.stringify([appId || 'alloflow-local',owner || 'local']), [loadedScope,setLoadedScope] = useState(null);
  const [reports, setReports] = useState([]), [error, setError] = useState(''), [removing, setRemoving] = useState(null), cancel = useRef(null), group = useRef(null), summary = useRef(null), trigger = useRef(null);
  const dismiss = () => { setRemoving(null); trigger.current?.focus(); };
  useBoardEscape(group, dismiss, !!removing);
  const refresh = () => { try { setReports(readReports(localStorage, appId, owner)); setError(''); } catch (failure) { setReports([]); setError(failure.message); } finally {setLoadedScope(scope);} };
  useEffect(() => { setRemoving(null); refresh(); }, [appId, owner]);
  useEffect(() => { if (removing) cancel.current?.focus(); }, [removing]);
  const action = fn => { try { fn(); setError(''); } catch (failure) { setError(failure.message); } };
  const visibleReports = loadedScope === scope ? reports : [];
  return <details data-board-report-library onToggle={event => { if (event.currentTarget.open) refresh(); }}><summary ref={summary}>{tr(t, 'reports_library', 'Saved learning reports')} ({visibleReports.length}/12)</summary><p>{tr(t, 'reports_scope', 'Reports saved by this account on this device. Export a copy before removing a report you want to keep.')}</p>{error && <p role="alert">{error}</p>}{!visibleReports.length && !error && <p>{tr(t, 'reports_empty', 'No learning reports have been saved yet.')}</p>}
    {visibleReports.map(report => <details key={report.id}><summary>{report.boardTitle} · {new Date(report.savedAt).toLocaleString()}</summary><ReportPreview report={report} t={t}/><div className="lb-row"><button type="button" onClick={() => action(() => downloadReport(report, 'csv'))}>{tr(t, 'report_csv', 'Download results CSV')}</button><button type="button" onClick={() => action(() => downloadReport(report))}>{tr(t, 'report_json', 'Download full report')}</button><button type="button" data-remove-board-report={report.id} onClick={event => { trigger.current = event.currentTarget; setRemoving(report); }}>{tr(t, 'report_remove', 'Remove saved report')}</button></div></details>)}
    {loadedScope === scope && removing && <div ref={group} role="group" className="lb-notice" aria-label={tr(t, 'report_remove_title', 'Remove this learning report?')}><p>{tr(t, 'report_remove_help', 'Remove this saved report from this device? The board and saved game are kept.')}</p><button type="button" onClick={() => action(() => { setReports(removeReport(localStorage, appId, owner, removing)); setRemoving(null); summary.current?.focus(); })}>{tr(t, 'report_remove_confirm', 'Remove report')}</button><button type="button" ref={cancel} onClick={dismiss}>{tr(t, 'cancel', 'Cancel')}</button></div>}
  </details>;
}
