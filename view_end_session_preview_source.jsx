/**
 * AlloFlow End Session Preview
 *
 * Privacy-limited evidence review shown before a live session is ended. All
 * aggregation, delivery, persistence, and teardown operations remain owned by
 * the host and are injected as callbacks.
 */
function EndSessionPreview({
  preview,
  note,
  dialogRef,
  canSaveSummary,
  groupNamesById,
  copyToClipboard,
  getConnectedCount,
  onFollowUpResourceChange,
  onSendCohort,
  onNoteChange,
  onKeepOpen,
  onComplete,
}) {
  React.useEffect(() => {
    try { if (dialogRef && dialogRef.current) dialogRef.current.focus(); } catch (_) {}
  }, [dialogRef]);

  // Keep the extracted markup readable while exposing only the minimum host
  // controller surface. No roster identities or session transport objects cross
  // this presentation boundary.
  const endSessionPreview = preview;
  const endSessionNote = note;
  const endSessionPreviewRef = dialogRef;
  const setEndSessionNote = onNoteChange;
  const sendEndSessionEvidenceCohort = onSendCohort;
  const completeLiveSessionEnd = onComplete;
  const onKeepSessionOpen = onKeepOpen;
  const rosterKey = canSaveSummary ? {
    groups: Object.fromEntries(Object.entries(groupNamesById || {}).map(([id, name]) => [id, { name }]))
  } : null;
  const resolveEndSessionCohortUids = codenames => ({
    length: Math.max(0, Number(getConnectedCount(codenames)) || 0)
  });
  const setEndSessionPreview = updater => {
    const next = typeof updater === 'function' ? updater(preview) : updater;
    if (next && next.followUpResourceId !== preview.followUpResourceId) {
      onFollowUpResourceChange(next.followUpResourceId || '');
    }
  };

  return (
    <div className="fixed inset-0 z-[10020] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4" role="presentation">
      <div ref={endSessionPreviewRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="end-session-summary-title" className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 border-2 border-indigo-100">
        <h2 id="end-session-summary-title" className="text-xl font-black text-slate-800">End session</h2>
        <p className="text-sm text-slate-600 mt-1">Review the privacy-limited roster summary before temporary live-session data is deleted.</p>
        <div className="grid grid-cols-3 gap-2 my-4">
          <div className="rounded-xl bg-emerald-50 p-3 text-center"><div className="text-2xl font-black text-emerald-700">{Object.keys(endSessionPreview.summary.participants || {}).length}</div><div className="text-[11px] font-bold text-emerald-800">Roster matched</div></div>
          <div className="rounded-xl bg-amber-50 p-3 text-center"><div className="text-2xl font-black text-amber-700">{(endSessionPreview.summary.absentCodenames || []).length}</div><div className="text-[11px] font-bold text-amber-800">Not present</div></div>
          <div className="rounded-xl bg-rose-50 p-3 text-center"><div className="text-2xl font-black text-rose-700">{(endSessionPreview.summary.unmatchedCodenames || []).length}</div><div className="text-[11px] font-bold text-rose-800">Unmatched</div></div>
        </div>
        {endSessionPreview.summary.insightBrief && (
          <section className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 mb-4" aria-labelledby="end-session-insight-title">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 id="end-session-insight-title" className="text-sm font-black text-indigo-950">Insight brief</h3>
                <p className="text-[11px] text-indigo-800 mt-0.5">A device-local summary of participation evidence—not an automated judgment of understanding.</p>
              </div>
              <button type="button" onClick={() => copyToClipboard([
                'Live session insight brief',
                `${endSessionPreview.summary.insightBrief.activityCount || 0} activities · ${endSessionPreview.summary.insightBrief.submissions || 0} submissions · ${endSessionPreview.summary.insightBrief.revisions || 0} revisions`,
                ...(endSessionPreview.summary.insightBrief.nextMoves || []).map(move => `${move.count}: ${move.label}`),
                'Privacy: aggregate participation evidence only; no raw answers or account IDs.',
              ].join('\n'))} className="rounded-lg border border-indigo-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-indigo-800 hover:bg-indigo-100">Copy brief</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
              <div className="rounded-lg bg-white p-2 text-center"><div className="text-lg font-black text-indigo-800">{endSessionPreview.summary.insightBrief.activityCount || 0}</div><div className="text-[10px] font-bold text-slate-600">Activities</div></div>
              <div className="rounded-lg bg-white p-2 text-center"><div className="text-lg font-black text-indigo-800">{endSessionPreview.summary.insightBrief.submissions || 0}</div><div className="text-[10px] font-bold text-slate-600">Submissions</div></div>
              <div className="rounded-lg bg-white p-2 text-center"><div className="text-lg font-black text-indigo-800">{endSessionPreview.summary.insightBrief.revisions || 0}</div><div className="text-[10px] font-bold text-slate-600">Revisions</div></div>
              <div className="rounded-lg bg-white p-2 text-center"><div className="text-lg font-black text-indigo-800">{(endSessionPreview.summary.insightBrief.followUpCodenames || []).length}</div><div className="text-[10px] font-bold text-slate-600">Follow-up</div></div>
            </div>
            {(endSessionPreview.summary.insightBrief.byKind || []).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Activity participation by type">
                {endSessionPreview.summary.insightBrief.byKind.map(item => <span key={item.kind} className="rounded-full border border-indigo-200 bg-white px-2 py-1 text-[10px] font-bold text-indigo-800">{item.kind.replace(/_/g, ' ')} · {item.submitted}/{item.invited}</span>)}
              </div>
            )}
            {(endSessionPreview.summary.insightBrief.evidenceCohorts || []).length > 0 && (
              <div className="mt-3 rounded-xl border border-violet-200 bg-white p-3" aria-label="Evidence cohorts and targeted follow-up">
                <div className="text-[10px] font-black uppercase tracking-wide text-violet-900">Evidence cohorts</div>
                <p className="mt-1 text-[11px] text-slate-600">Participation signals are review suggestions, not automatic mastery or misconception labels.</p>
                {(endSessionPreview.followUpResources || []).length > 0 && (
                  <label className="mt-2 block text-[11px] font-bold text-slate-700">
                    Follow-up resource
                    <select
                      value={endSessionPreview.followUpResourceId || ''}
                      disabled={!!endSessionPreview.followUpBusy}
                      onChange={event => setEndSessionPreview(prev => prev ? { ...prev, followUpResourceId: event.target.value, followUpStatus: '' } : prev)}
                      aria-label="Choose the student-safe resource to send to an evidence cohort"
                      className="mt-1 min-h-11 w-full rounded-lg border border-violet-300 bg-white px-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
                    >
                      {(endSessionPreview.followUpResources || []).map(resource => <option key={resource.id} value={resource.id}>{resource.title}</option>)}
                    </select>
                  </label>
                )}
                <div className="mt-2 space-y-2">
                  {endSessionPreview.summary.insightBrief.evidenceCohorts.map(cohort => {
                    const connectedCount = resolveEndSessionCohortUids(cohort.codenames).length;
                    const supportCohort = cohort.intent === 'support';
                    const sending = endSessionPreview.followUpBusy === cohort.code;
                    return (
                      <div key={cohort.code} className={'rounded-lg border p-2 ' + (supportCohort ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50')}>
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <div className={'text-xs font-black ' + (supportCohort ? 'text-amber-900' : 'text-emerald-900')}>{cohort.label} - {cohort.count}</div>
                            <div className="mt-0.5 text-[10px] text-slate-600">{cohort.recommendedAction}</div>
                          </div>
                          {supportCohort && connectedCount > 0 && (endSessionPreview.followUpResources || []).length > 0 && (
                            <button
                              type="button"
                              disabled={!!endSessionPreview.followUpBusy || endSessionPreview.busy}
                              onClick={() => sendEndSessionEvidenceCohort(cohort)}
                              aria-label={'Send the selected follow-up resource to ' + connectedCount + ' connected learners in ' + cohort.label}
                              className="min-h-11 shrink-0 rounded-lg bg-violet-700 px-2.5 py-1.5 text-[10px] font-black text-white hover:bg-violet-800 disabled:opacity-50"
                            >
                              {sending ? 'Sending...' : 'Send to ' + connectedCount}
                            </button>
                          )}
                        </div>
                        <details className="mt-1">
                          <summary className="cursor-pointer text-[10px] font-bold text-slate-600">Review codenames</summary>
                          <div className="mt-1 text-[10px] text-slate-600">{(cohort.codenames || []).join(', ')}</div>
                        </details>
                      </div>
                    );
                  })}
                </div>
                {endSessionPreview.followUpStatus && <p role="status" aria-live="polite" className="mt-2 rounded-lg bg-violet-50 p-2 text-[11px] font-bold text-violet-900">{endSessionPreview.followUpStatus}</p>}
              </div>
            )}
            {(endSessionPreview.summary.insightBrief.groups || []).some(group => group.followUpCount > 0) && (
              <div className="mt-3">
                <div className="text-[10px] font-black uppercase tracking-wide text-indigo-900">Group patterns</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {endSessionPreview.summary.insightBrief.groups.filter(group => group.followUpCount > 0).map(group => <span key={group.groupId} className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-900">{rosterKey?.groups?.[group.groupId]?.name || group.groupId}: {group.followUpCount} follow-up</span>)}
                </div>
              </div>
            )}
            {(endSessionPreview.summary.insightBrief.nextMoves || []).length > 0 && (
              <div className="mt-3">
                <div className="text-[10px] font-black uppercase tracking-wide text-indigo-900">Suggested next moves</div>
                <ul className="mt-1 space-y-1 text-xs text-slate-700">
                  {endSessionPreview.summary.insightBrief.nextMoves.map(move => <li key={move.code} className="flex gap-2"><span className="font-black text-indigo-700">{move.count}</span><span>{move.label}</span></li>)}
                </ul>
              </div>
            )}
            {(endSessionPreview.summary.insightBrief.followUpCodenames || []).length > 0 && <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] font-semibold text-amber-900">Connections remain active during this review. Use the cohort controls above or the companion view before ending; ending removes temporary student connections.</p>}
          </section>
        )}
        {(endSessionPreview.summary.unmatchedCodenames || []).length > 0 && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 mb-4"><div className="text-xs font-black text-rose-800">Unmatched codenames are not added automatically</div><div className="text-xs text-rose-700 mt-1">{endSessionPreview.summary.unmatchedCodenames.join(', ')}</div></div>}
        {endSessionPreview.deliverySummary?.pending > 0 && (
          <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 mb-4">
            <div className="text-xs font-black text-amber-900">Resource delivery status</div>
            <p className="mt-1 text-xs text-amber-800">{endSessionPreview.deliverySummary.opened} of {endSessionPreview.deliverySummary.assigned} targeted resources have been opened. {endSessionPreview.deliverySummary.pending} remain unconfirmed{endSessionPreview.deliverySummary.loading ? `; ${endSessionPreview.deliverySummary.loading} still loading` : ''}{endSessionPreview.deliverySummary.failed ? `; ${endSessionPreview.deliverySummary.failed} reported a load failure` : ''}.</p>
            <p className="mt-1 text-[11px] text-amber-800">The session can stay open while learners receive the resource. Ending removes temporary connections.</p>
          </div>
        )}
        <details className="rounded-xl border border-slate-200 p-3 mb-4"><summary className="cursor-pointer text-sm font-bold text-slate-700">What will be saved?</summary><p className="text-xs text-slate-600 mt-2">Date, duration, matched codenames, groups, response counts, and whether a resource was opened. Raw answers, account IDs, mailbox tokens, chat, and real names are not saved.</p></details>
        <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="end-session-note">Optional teacher note</label>
        <textarea id="end-session-note" value={endSessionNote} onChange={event => setEndSessionNote(event.target.value.slice(0, 500))} rows={3} placeholder="Example: Small-group review of fractions" className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none" />
        <div className="text-[11px] text-slate-500 text-right">{endSessionNote.length}/500</div>
        {!rosterKey && <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">Create or import a class roster to save longitudinal summaries. You can still end this session normally.</p>}
        <div className="flex flex-col sm:flex-row gap-2 mt-5 justify-end">
          <button type="button" disabled={endSessionPreview.busy || !!endSessionPreview.followUpBusy} onClick={onKeepSessionOpen} className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold disabled:opacity-50">Keep session open</button>
          {endSessionPreview.deliveryGuard ? (
            <>
              <button type="button" disabled={endSessionPreview.busy || !!endSessionPreview.followUpBusy} onClick={() => completeLiveSessionEnd(false, true)} className="px-4 py-2.5 rounded-xl border border-rose-300 bg-rose-100 text-rose-800 font-bold disabled:opacity-50">End without saving anyway</button>
              {rosterKey && <button type="button" disabled={endSessionPreview.busy || !!endSessionPreview.followUpBusy} onClick={() => completeLiveSessionEnd(true, true)} className="px-4 py-2.5 rounded-xl bg-amber-600 text-white font-bold shadow-lg disabled:opacity-50">{endSessionPreview.busy ? 'Ending…' : 'Save summary & end anyway'}</button>}
            </>
          ) : (
            <>
              <button type="button" disabled={endSessionPreview.busy || !!endSessionPreview.followUpBusy} onClick={() => completeLiveSessionEnd(false)} className="px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 font-bold disabled:opacity-50">End without saving</button>
              {rosterKey && <button type="button" disabled={endSessionPreview.busy || !!endSessionPreview.followUpBusy} onClick={() => completeLiveSessionEnd(true)} className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold shadow-lg disabled:opacity-50">{endSessionPreview.busy ? 'Ending…' : 'Save summary & end'}</button>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
