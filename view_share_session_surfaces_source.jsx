// Auto-extracted cold-path view source. Edit this file, then rebuild its CDN module.

// Extracted from AlloFlowANTI.txt (homework-qr).
function HomeworkQrDialogView(props) {
  const { BookOpen, ClipboardList, Copy, ExternalLink, Printer, Share2, SharedAssignmentActivityPanel, Trash2, X, addToast, copyToClipboard, createSelfContainedHomeworkLink, homeworkQrDialogRef, hostPackOnMailbox, mbBusy, mbConfig, printQrSheet, qrShareError, qrShareModal, qrShareSvg, revokeHomeworkAssignment, setQrShareModal, t, testHomeworkAsStudent } = props;
  return (
<div ref={homeworkQrDialogRef} tabIndex={-1} className="bg-gradient-to-b from-violet-50 to-white rounded-3xl shadow-2xl border border-violet-200 p-6 text-center max-w-md w-full relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <button onClick={() => setQrShareModal(null)} className="absolute top-3 right-3 p-2 rounded-full text-slate-600 hover:bg-slate-100" aria-label={t('common.close') || 'Close'}><X size={20}/></button>
            <div className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-violet-700 text-white flex items-center justify-center shadow-lg shadow-violet-200"><ClipboardList size={28}/></div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-amber-900 mb-2"><BookOpen size={13}/> {t('share_collect.take_home_assignment') || 'Take-home assignment'}</div>
            <h2 id="alloflow-homework-qr-title" className="text-2xl font-black text-slate-900 mb-1">{qrShareModal.type === 'assignment-pack-hosted' ? 'Hosted homework assignment' : qrShareModal.type === 'assignment-pack' ? 'Self-contained homework assignment' : 'Homework assignment ready'}</h2>
            <p id="alloflow-homework-qr-description" className="text-sm font-bold text-violet-900 mb-1">{qrShareModal.title}</p>
            <p className="text-xs text-slate-600 mb-4">{((qrShareModal.resourceCount || 1) === 1 ? (t('share_collect.teacher_prepared_resource_one') || '{count} teacher-prepared resource') : (t('share_collect.teacher_prepared_resource_many') || '{count} teacher-prepared resources')).replace('{count}', String(qrShareModal.resourceCount || 1))} &middot; {qrShareModal.aiPolicy === 'student-byok' ? (t('share_collect.personal_ai_optional') || 'Personal AI optional') : (t('share_collect.student_ai_off') || 'Student AI off')} &middot; {t('share_collect.no_live_session') || 'No live session'}</p>
            {!qrShareModal.noQr && (
            <div className="flex justify-center mb-4">
              <div className="bg-white border-2 border-violet-300 rounded-2xl p-3 w-52 h-52 flex items-center justify-center shadow-sm" aria-label={t('share_collect.qr_aria') || 'Homework assignment QR code'}>
                {qrShareSvg
                  ? <div className="w-full h-full [&_svg]:w-full [&_svg]:h-full" dangerouslySetInnerHTML={{ __html: qrShareSvg }} />
                  : <span className="text-xs font-bold text-violet-700 text-center">{qrShareError ? 'QR unavailable - copy the homework link below' : 'Preparing homework QR...'}</span>}
              </div>
            </div>
            )}
            {qrShareModal.noQr && (
              <div className="mb-4 bg-amber-50 p-3 rounded-xl border border-amber-200 text-left">
                <p className="text-xs text-amber-900 text-center">{t('share_collect.this_activity_is_too_large_for') || 'This activity is too large for a scannable QR code. The link was copied — paste it into Google Classroom, email, or any message.'}</p>
              </div>
            )}
            {Array.isArray(qrShareModal.resourceTitles) && qrShareModal.resourceTitles.length > 0 && (
              <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3 text-left">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">{t('share_collect.assignment_contents') || 'Assignment contents'}</p>
                <ul className="text-xs text-slate-800 space-y-1">{qrShareModal.resourceTitles.slice(0, 5).map((name, index) => <li key={index} className="truncate">{index + 1}. {name}</li>)}</ul>
                {qrShareModal.resourceTitles.length > 5 && <p className="text-[11px] text-slate-500 mt-1">+{qrShareModal.resourceTitles.length - 5} {t('share_collect.more_resources') || 'more resources'}</p>}
              </div>
            )}
            <div className="mb-3 rounded-xl bg-violet-100 border border-violet-200 px-3 py-2 text-left">
              <p className="text-xs font-black text-violet-950">{t('share_collect.students_scan_to_open_the_assignment') || 'Students scan to open the assignment on their own time.'}</p>
              <p className="text-[11px] text-violet-800 mt-0.5">{t('share_collect.this_qr_does_not_join_your') || 'This QR does not join your class, show a session code, or connect to live pacing.'}</p>
            </div>
            {qrShareModal.type === 'assignment-pack-hosted' && qrShareModal.sharedActivity && (
              <details className="mb-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-left">
                <summary className="cursor-pointer text-xs font-black text-sky-900">{t('share_collect.manage_shared') || 'Manage shared'} {qrShareModal.sharedActivity.type === 'rating' ? 'class rating' : qrShareModal.sharedActivity.type === 'survey' ? 'survey' : 'class Word Cloud'}</summary>
                <p className="mt-2 text-[11px] leading-relaxed text-sky-800">{qrShareModal.sharedActivity.type === 'rating' ? 'Students rate on their own time. Only the anonymous distribution appears after the participation threshold.' : 'Students contribute on their own time. Open this section later from Recent homework links to approve or hide entries.'}</p>
                <div className="mt-3">
                  <SharedAssignmentActivityPanel
                    mode="teacher"
                    activity={qrShareModal.sharedActivity}
                    mailbox={{ url: mbConfig?.url, id: qrShareModal.packId, secret: qrShareModal.packSecret }}
                    admin={mbConfig?.admin || ''}
                    addToast={addToast}
                  />
                </div>
              </details>
            )}
            <p className="text-[11px] text-slate-500 mb-3">{qrShareSvg ? (t('share_collect.ready_to_scan') || 'Ready to scan') : qrShareError ? (t('share_collect.qr_unavailable_use_link') || 'QR unavailable - use the link below') : (t('share_collect.validating_qr_code') || 'Validating QR code...')} &middot; {(t('share_collect.expires_on') || 'Expires {date}.').replace('{date}', qrShareModal.expiresAt ? new Date(qrShareModal.expiresAt).toLocaleDateString() : (t('share_collect.expires_default_window') || '14 days after creation'))}</p>
            <div className="mb-2 grid grid-cols-2 gap-2">
              <button onClick={testHomeworkAsStudent} className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-2 text-xs font-bold text-emerald-900 hover:border-emerald-500">
                {t('share_collect.test_as_student') || 'Test as student'} <ExternalLink size={12}/>
              </button>
              <button onClick={() => printQrSheet(qrShareSvg, 'AlloFlow homework assignment', qrShareModal.title, `Teacher-prepared resources · ${qrShareModal.aiPolicy === 'student-byok' ? 'Personal AI optional' : 'Student AI off'} · No live session`)} disabled={!qrShareSvg} className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white p-2 text-xs font-bold text-slate-800 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50">
                {t('share_collect.print_qr') || 'Print QR'} <Printer size={12}/>
              </button>
            </div>
            <button onClick={() => copyToClipboard(qrShareModal.url)} className="w-full flex items-center justify-center gap-2 text-xs font-bold text-violet-900 hover:text-violet-950 bg-violet-100 border border-violet-300 hover:border-violet-500 rounded-lg p-2 transition-all break-all">
              {qrShareModal.type === 'assignment-pack-hosted' ? 'Copy hosted homework link' : qrShareModal.type === 'assignment-pack' ? 'Copy self-contained link' : 'Copy homework link'} <Copy size={12}/>
            </button>
            <input aria-label={t('share_collect.link_aria') || 'Selectable homework link'} readOnly value={qrShareModal.url || ''} onFocus={event => event.target.select()} className="mt-2 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-violet-500" />
            {qrShareModal.type !== 'assignment-pack' && (
              <button onClick={revokeHomeworkAssignment} className="w-full mt-2 flex items-center justify-center gap-2 text-xs font-bold text-red-800 bg-red-50 border border-red-300 hover:border-red-500 rounded-lg p-2 transition-all">
                {t('share_collect.revoke_homework_link') || 'Revoke homework link'} <Trash2 size={12}/>
              </button>
            )}
            {qrShareModal.type === 'assignment-pack' && <p className="text-[11px] text-amber-800 mt-2">{t('share_collect.self_contained_links_cannot_be_remotely') || 'Self-contained links cannot be remotely revoked; their built-in expiration still applies.'}</p>}
            {qrShareModal.type === 'assignment' && (
              <button onClick={() => { createSelfContainedHomeworkLink(); }} className="w-full mt-2 flex items-center justify-center gap-2 text-xs font-bold text-emerald-800 hover:text-emerald-900 bg-emerald-50 border border-emerald-300 hover:border-emerald-400 rounded-lg p-2 transition-all">
                {t('share_collect.make_self_contained_version_no_accounts') || 'Make self-contained version (no accounts needed)'} <Share2 size={12}/>
              </button>
            )}
            {(qrShareModal.type === 'assignment' || qrShareModal.type === 'assignment-pack') && (
              <button onClick={() => { hostPackOnMailbox(); }} disabled={mbBusy} className="w-full mt-2 flex items-center justify-center gap-2 text-xs font-bold text-indigo-800 hover:text-indigo-900 bg-indigo-50 border border-indigo-300 hover:border-indigo-400 rounded-lg p-2 transition-all disabled:opacity-60">
                {mbBusy ? 'Uploading to your mailbox…' : 'Host on Class Mailbox (small QR, images OK)'} <Share2 size={12}/>
              </button>
            )}
            {qrShareModal.type === 'assignment-pack-hosted' ? (
              <p className="text-[11px] text-slate-500 mt-3">{t('share_collect.the_activity_images_included_is_stored') || 'The activity (images included) is stored in YOUR Google Drive via your Class Mailbox — students need no account, and'} {qrShareModal.aiPolicy === 'student-byok' ? 'may connect their own AI provider for that tab' : 'AI stays off'}. Delete it any time from the "AlloFlow Class Mailbox" Drive folder.</p>
            ) : qrShareModal.type === 'assignment-pack' ? (
              <p className="text-[11px] text-slate-500 mt-3">{t('share_collect.the_whole_activity_travels_inside_the') || 'The whole activity travels inside the link — students need no account, nothing is stored online, and'} {qrShareModal.aiPolicy === 'student-byok' ? 'they may connect their own AI provider for that tab' : 'AI stays off'}.{typeof qrShareModal.sizeChars === 'number' ? ` Link size ~${Math.max(1, Math.round(qrShareModal.sizeChars / 1024))} KB${qrShareModal.sizeChars > 8000 ? ' — very long links can be truncated by some apps; Google Classroom and email handle them well.' : '.'}` : ''}</p>
            ) : (
              <p className="text-[11px] text-slate-500 mt-3">{qrShareModal.aiPolicy === 'student-byok' ? 'Students open teacher-prepared resources and may connect their own AI provider for that tab.' : 'Students open teacher-prepared resources with AI generation off.'}</p>
            )}
          </div>
  );
}
// Extracted from AlloFlowANTI.txt (class-mailbox-setup).
function ClassMailboxSetupView(props) {
  const { ClipboardList, Copy, ExternalLink, Eye, EyeOff, FolderDown, Maximize, Printer, Sparkles, X, addDirectionsToPack, alloPersistMailboxConfig, closeAllMailboxSessions, connectMailbox, copyMailboxScriptSource, copyToClipboard, deriveDirectionsDraft, directionsDeriving, exportMailboxConfig, importMailboxConfig, mailboxScriptState, mbAdminInput, mbBusy, mbConfig, mbDirectionsDraft, mbHwEvidence, mbLive, mbMode, mbNow, mbQrSvg, mbResumable, mbRoster, mbShowAdmin, mbStatus, mbUrlInput, openStudentQrPreview, printQrSheet, requestEndLiveSession, resumeMailboxLiveSession, retryMailboxScriptSource, rotateMailboxAdmin, sendPackHome, setMbAdminInput, setMbConfig, setMbDirectionsDraft, setMbMode, setMbPanelOpen, setMbResumable, setMbShowAdmin, setMbStatus, setMbUrlInput, setShowDirectionsComposer, setShowSessionModal, shareFullPackToMailbox, startMailboxLiveSession, t } = props;
  return (
<div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full relative text-left max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <button onClick={() => setMbPanelOpen(false)} className="absolute top-3 right-3 p-2 rounded-full text-slate-600 hover:bg-slate-100" aria-label={t('common.close') || 'Close'}><X size={20}/></button>
            <h2 className="text-xl font-black text-slate-900 mb-1">{t('mailbox.live_class_without_accounts') || 'Live class without accounts'} <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 rounded px-1.5 py-0.5 align-middle">beta</span></h2>
            <p className="text-xs text-slate-600 mb-3">{t('mailbox.runs_from_a_google_apps_script') || 'Runs from a Google Apps Script project that you create and control. Students use codenames and scan a QR without signing into Google. Live state is temporary; hosted homework and completed mailbox submissions are saved in your private Drive folder.'}</p>
            <div className="space-y-2 mb-4">
              <details className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
                <summary className="cursor-pointer font-black">{t('mailbox.why_might_google_say_unverified_app') || 'Why might Google say “unverified app” or “unsafe”?'}</summary>
                <div className="mt-2 space-y-2 leading-relaxed">
                  <p>{t('mailbox.google_can_show_this_warning_because') || 'Google can show this warning because a script you create for yourself is an unpublished OAuth app, not because Google has identified this mailbox as malware. The warning is still meaningful: continue only when'} <b>{t('mailbox.you_created_this_apps_script_project') || 'you created this Apps Script project'}</b>{t('mailbox.pasted_code_from_the_alloflow_copy') || ', pasted code from the AlloFlow copy shown here, and recognize the Google account and project name. Cancel if the prompt is unexpected or belongs to someone else.'}</p>
                  <p>{t('mailbox.the_script_requests_google_drive_access') || 'The script requests Google Drive access to create the private “AlloFlow Class Mailbox” folder for hosted activities, admin-token recovery, and student submissions. You can review the code before authorizing and revoke access later from your Google Account connections.'}</p>
                  <a href="https://developers.google.com/apps-script/guides/services/authorization" target="_blank" rel="noopener noreferrer" className="font-bold text-amber-900 underline underline-offset-2">{t('mailbox.google_s_apps_script_authorization_explanation') || 'Google’s Apps Script authorization explanation'}</a>
                </div>
              </details>
              <details className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-950">
                <summary className="cursor-pointer font-black">{t('mailbox.k_12_privacy_ferpa_checklist_is') || 'K–12 privacy / FERPA checklist: is this appropriate for my class?'}</summary>
                <div className="mt-2 space-y-2 leading-relaxed">
                  <p><b>{t('mailbox.a_google_account_alone_does_not') || 'A Google account alone does not make a workflow FERPA-compliant.'}</b> {t('mailbox.use_a_school_managed_google_workspace') || 'Use a school-managed Google Workspace for Education account when available, confirm that Apps Script and this workflow are approved by your school or district, and follow local consent, records, security, and retention policies. If your administrator blocks “Anyone” web apps, ask IT rather than bypassing that control with a personal account.'}</p>
                  <ul className="list-disc ml-4 space-y-1">
                    <li>{t('mailbox.use_student_codenames_do_not_ask') || 'Use student codenames; do not ask students to enter names, emails, disability information, or other unnecessary identifiers.'}</li>
                    <li>{t('mailbox.treat_each_qr_link_as_a') || 'Treat each QR/link as a classroom invitation: anyone who receives it can attempt to join or submit until it expires.'}</li>
                    <li>{t('mailbox.keep_the_admin_token_private_rotate') || 'Keep the admin token private, rotate it if exposed, and delete submission/homework files from Drive according to district retention rules.'}</li>
                    <li>{t('mailbox.use_only_for_students_and_purposes') || 'Use only for students and purposes approved by your school. This checklist is practical guidance, not a legal determination.'}</li>
                  </ul>
                  <a href="https://studentprivacy.ed.gov/frequently-asked-questions" target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-900 underline underline-offset-2">{t('mailbox.u_s_department_of_education_student') || 'U.S. Department of Education student-privacy FAQ'}</a>
                </div>
              </details>
              <details className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">
                <summary className="cursor-pointer font-black">{t('mailbox.what_is_stored_where_and_for') || 'What is stored, where, and for how long?'}</summary>
                <ul className="mt-2 list-disc ml-4 space-y-1 leading-relaxed">
                  <li>{t('mailbox.live_messages_and_class_state_bounded') || 'Live messages and class state: bounded Apps Script cache, normally expiring within 45 minutes to 6 hours and eligible for earlier eviction.'}</li>
                  <li>{t('mailbox.session_recovery_marker_and_random_secret') || 'Session recovery marker and random secret: Script Properties for at most 6 hours.'}</li>
                  <li>{t('mailbox.hosted_homework_and_completed_mailbox_submission') || 'Hosted homework and completed mailbox submissions: ordinary files in your private “AlloFlow Class Mailbox” Drive folder until you delete them.'}</li>
                  <li>{t('mailbox.admin_token_recovery_note_the_same') || 'Admin-token recovery note: the same private Drive folder. It is never placed in a student QR.'}</li>
                  <li>{t('mailbox.no_mailbox_content_is_stored_on') || 'No mailbox content is stored on an AlloFlow-operated server.'}</li>
                </ul>
              </details>
<details className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-950">
                <summary className="cursor-pointer font-black">{t('mailbox.how_do_student_saving_and_submissions') || 'How do student saving and submissions work in each mode?'}</summary>
                <ul className="mt-2 list-disc ml-4 space-y-1 leading-relaxed">
                  <li><b>{t('mailbox.mailbox_live_session_or_mailbox_hosted') || 'Mailbox live session or mailbox-hosted homework:'}</b> {t('mailbox.save_submit_uploads_json') || 'Save & Submit uploads the complete student-work JSON automatically to your private Drive mailbox folder. If delivery fails, the student receives a backup download instead.'}</li>
                  <li><b>{t('mailbox.standard_firebase_live_session') || 'Standard Firebase live session:'}</b> {t('mailbox.live_quiz_answer_content_travels_peer') || 'live quiz answer content travels peer-to-peer to the teacher. If that connection is unavailable, only a content-free submission receipt syncs and the answer remains unscored. Progress signals and supported activity metadata sync during the session; the complete portfolio is not retained as a permanent Firebase record.'}</li>
                  <li><b>{t('mailbox.self_contained_non_live_homework') || 'Self-contained/non-live homework:'}</b> {t('mailbox.work_stays_on_the_student_device') || 'work stays on the student device until they download the submission file and send it through your approved LMS, email, or other school workflow.'}</li>
                  <li><b>{t('mailbox.teacher_review') || 'Teacher review:'}</b> {t('mailbox.open_drive_alloflow_class_mailbox_download') || 'open Drive → “AlloFlow Class Mailbox,” download the submission JSON files, then use AlloFlow’s Submission Inbox to import, review, and grade them.'}</li>
                </ul>
              </details>
            </div>
            {!mbConfig && (
              <div>
<p className="text-xs text-slate-700 mb-2 font-bold">{t('mailbox.one_time_setup_about_3_5') || 'One-time setup (about 3–5 minutes):'}</p>
                <ol className="text-xs text-slate-600 list-decimal ml-4 space-y-1.5 mb-3">
                  <li>{t('mailbox.sign_into_the') || 'Sign into the'} <b>{t('mailbox.school_managed_google_account') || 'school-managed Google account'}</b> {t('mailbox.that_should_own_the_mailbox_and') || 'that should own the mailbox and confirm this use is allowed by your school or district.'}</li>
                  <li>{t('mailbox.copy_and_review_the_mailbox_script') || 'Copy and review the mailbox script:'} <button type="button" onClick={copyMailboxScriptSource} disabled={mailboxScriptState.status !== 'ready'} aria-busy={mailboxScriptState.status === 'loading'} className="font-bold text-indigo-700 underline underline-offset-2 disabled:cursor-wait disabled:text-slate-500">{mailboxScriptState.status === 'loading' ? 'preparing script code…' : mailboxScriptState.status === 'error' ? 'script unavailable' : 'copy script code'}</button>{mailboxScriptState.status === 'error' && <> (<button type="button" onClick={retryMailboxScriptSource} className="font-bold text-indigo-700 underline underline-offset-2">{t('mailbox.retry_loading') || 'retry loading'}</button>)</>} {t('mailbox.or') || '(or'} <a href="https://alloflow-cdn.pages.dev/apps_script/session_mailbox/Code.gs" target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-700 underline underline-offset-2">{t('mailbox.view_the_same_source_online') || 'view the same source online'}</a>).</li>
                  <li>{t('mailbox.open') || 'Open'} <a href="https://script.new" target="_blank" rel="noopener noreferrer" className="font-mono font-bold text-indigo-700 underline underline-offset-2">script.new</a>{t('mailbox.paste_over_the_starter_code_name') || ', paste over the starter code, name it “AlloFlow Class Mailbox,” and save.'}</li>
                  <li>{t('mailbox.choose_deploy_new_deployment_web_app') || 'Choose Deploy → New deployment → Web app → Execute as'} <b>Me</b> {t('mailbox.access') || '→ access'} <b>{t('mailbox.anyone') || 'Anyone'}</b> {t('mailbox.deploy_review_the_authorization_prompt_if') || '→ Deploy. Review the authorization prompt; if Google shows the unpublished-app warning, use the explanation above before deciding whether to continue.'}</li>
                  <li>{t('mailbox.copy_the_web_app_url_ending') || 'Copy the web app URL ending in'} <b>/exec</b>{t('mailbox.paste_it_below_then_run_the') || ', paste it below, then run the self-test.'}</li>
                </ol>
                <input value={mbUrlInput} onChange={e => setMbUrlInput(e.target.value)} placeholder="https://script.google.com/macros/s/…/exec" className="w-full text-xs border border-slate-300 rounded-lg p-2 mb-2 font-mono" aria-label={t('mailbox.webapp_url_aria') || 'Class Mailbox web app URL'} />
                <input value={mbAdminInput} onChange={e => setMbAdminInput(e.target.value)} placeholder={t('mailbox.admin_token_placeholder') || 'Admin token (only when reconnecting from a new device)'} className="w-full text-xs border border-slate-200 rounded-lg p-2 mb-2 font-mono" aria-label={t('mailbox.admin_token_aria') || 'Class Mailbox admin token (optional)'} />
                <button onClick={connectMailbox} disabled={mbBusy} className="w-full flex items-center justify-center gap-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg p-2.5 transition-all disabled:opacity-60">
                  {mbBusy ? 'Testing…' : 'Connect & self-test'}
                </button>
              </div>
            )}
            {/* Script freshness: the server reports its VERSION on the connect
                self-test; older deployments keep working (resource push +
                hand-raise) but lack the session-doc store that powers polls,
                quiz, groups and Pictionary — tell the teacher how to update
                (same URL, ~1 minute). */}
            {mbConfig && Number(mbConfig.v) > 0 && Number(mbConfig.v) < 19 && (
              <div className="mb-3 bg-amber-50 border-2 border-amber-200 rounded-xl p-3">
                <p className="text-xs font-bold text-amber-800 mb-2">{t('mailbox.your_mailbox_script_is_v') || 'Your mailbox script is v'}{mbConfig.v}. Update it to v18 for current surveys, assignments, live visual-organizer readiness, secure live tools, and automatic student submissions (about 1 minute, the URL stays the same):</p>
                <ol className="list-decimal list-inside text-xs text-amber-900 space-y-1">
                  <li><button type="button" onClick={copyMailboxScriptSource} disabled={mailboxScriptState.status !== 'ready'} aria-busy={mailboxScriptState.status === 'loading'} className="font-bold underline underline-offset-2 disabled:cursor-wait disabled:text-amber-700">{mailboxScriptState.status === 'loading' ? 'Preparing the updated script…' : mailboxScriptState.status === 'error' ? 'Updated script unavailable' : 'Copy the updated script'}</button>{mailboxScriptState.status === 'error' && <> (<button type="button" onClick={retryMailboxScriptSource} className="font-bold underline underline-offset-2">{t('mailbox.retry_loading') || 'retry loading'}</button>)</>} {t('mailbox.and_paste_it_over_the_old') || 'and paste it over the old code in your Apps Script project (script.google.com → your AlloFlow Class Mailbox).'}</li>
                  <li>{t('mailbox.deploy_manage_deployments_pencil_icon_version') || 'Deploy → Manage deployments → pencil icon → Version:'} <b>{t('mailbox.new_version') || 'New version'}</b> {t('mailbox.deploy') || '→ Deploy.'}</li>
                  <li>{t('mailbox.press_connect_self_test_again') || 'Press "Connect & self-test" here again — this notice disappears at v13.'}</li>
                </ol>
              </div>
            )}
            {mbConfig && !mbLive && mbResumable.length > 0 && (
              <div className="mb-3 bg-emerald-50 border-2 border-emerald-200 rounded-xl p-3">
                <p className="text-xs font-bold text-emerald-800 mb-2">{mbResumable.length === 1 ? 'A live session is still running:' : mbResumable.length + ' live sessions are still running:'}</p>
                {mbResumable.map(s => (
                  <button key={s.c} onClick={() => resumeMailboxLiveSession(s)} className="w-full flex items-center justify-between gap-2 text-sm font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg p-2.5 transition-all mb-1">
                    <span>{t('mailbox.resume_class') || 'Resume class'} {String(s.c).toUpperCase()}</span>
                    <span aria-hidden="true">↻</span>
                  </button>
                ))}
                <button onClick={() => setMbResumable([])} className="w-full text-[11px] font-bold text-slate-500 hover:text-slate-700 underline underline-offset-2 mt-1">{t('mailbox.start_a_new_session_instead') || 'Start a new session instead'}</button>
              </div>
            )}
            {mbConfig && !mbLive && (
              <div>
                <div className="mb-2 text-[11px] text-slate-500">
                  <p className="break-all">{t('mailbox.connected_mailbox') || 'Connected mailbox:'} <span className="font-mono">{mbConfig.url}</span></p>
                  <p className="mt-1 font-semibold text-emerald-700">{t('mailbox.script_v') || 'Script v'}{mbConfig.v || '?'} · {mbConfig.latencyMs || '?'}{t('mailbox.ms_round_trip_security_check_ready') || 'ms round trip · security check ready'}</p>
                </div>
                {mbConfig.admin && (
                  <div className="mb-3 bg-slate-50 border border-slate-200 rounded-lg p-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{t('mailbox.admin_token_save_it_like_a') || 'Admin token — save it like a password'}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-700 truncate flex-1" title={mbShowAdmin ? mbConfig.admin : 'Hidden'}>
                        {mbShowAdmin ? mbConfig.admin : '••••••••••••••••••••••••'}
                      </span>
                      <button onClick={() => setMbShowAdmin(v => !v)} className="p-1.5 text-slate-600 hover:text-slate-900" title={mbShowAdmin ? 'Hide admin token' : 'Reveal admin token'} aria-label={mbShowAdmin ? 'Hide admin token' : 'Reveal admin token'}>
                        {mbShowAdmin ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                      <button onClick={() => copyToClipboard(mbConfig.admin)} className="p-1.5 text-indigo-700 hover:text-indigo-900" title={t('mailbox.copy_admin_token') || 'Copy admin token'} aria-label={t('mailbox.copy_admin_token') || 'Copy admin token'}>
                        <Copy size={15} />
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">{t('mailbox.students_never_receive_this_token_the') || 'Students never receive this token. The QR contains only a one-session join secret.'}</p>
                    <div className="flex gap-2 mt-2">
                      <button onClick={rotateMailboxAdmin} disabled={mbBusy || mbResumable.length > 0} className="flex-1 text-[10px] font-bold border border-slate-300 rounded-md px-2 py-1.5 disabled:opacity-50" title={mbResumable.length ? 'Close active sessions before rotating' : 'Invalidate the old admin token'}>{t('mailbox.rotate_token') || 'Rotate token'}</button>
                      {mbResumable.length > 0 && <button onClick={closeAllMailboxSessions} disabled={mbBusy} className="flex-1 text-[10px] font-bold border border-rose-300 text-rose-700 rounded-md px-2 py-1.5 disabled:opacity-50">{t('mailbox.close_all_sessions') || 'Close all sessions'}</button>}
                    </div>
                  </div>
                )}
<p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-[11px] font-semibold text-emerald-900">{t('mailbox.completed_student_submissions_save_automatically') || 'Completed student submissions save automatically as JSON files in your private Drive mailbox folder. Students receive a local backup download if delivery fails. To review them, download the JSON files from Drive and import them through AlloFlow’s Submission Inbox.'}</p>
                <button onClick={startMailboxLiveSession} disabled={mbBusy} className="w-full flex items-center justify-center gap-2 text-sm font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl p-3 transition-all disabled:opacity-60">
                  {mbBusy ? 'Starting…' : 'Teach live'}
                </button>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button onClick={exportMailboxConfig} className="flex-1 text-[11px] font-bold text-sky-700 underline underline-offset-2 hover:text-sky-900">{t('mailbox.save_setup_to_a_file') || 'Save setup to a file'}</button>
                  <label className="flex-1 cursor-pointer text-center text-[11px] font-bold text-sky-700 underline underline-offset-2 hover:text-sky-900">
                    {t('mailbox.restore_from_a_file') || 'Restore from a file'}
                    <input
                      type="file"
                      accept="application/json,.json"
                      className="sr-only"
                      onChange={(event) => { const file = event.target.files && event.target.files[0]; event.target.value = ''; importMailboxConfig(file); }}
                    />
                  </label>
                </div>
                <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                  {t('mailbox.the_saved_file_holds_an_access') || 'The saved file holds an access key for your mailbox. Keep it somewhere you would keep a password, and it will restore this setup on another device or after storage is cleared.'}
                </p>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => { setMbUrlInput(mbConfig.url); setMbConfig(null); setMbStatus(''); }} className="flex-1 text-[11px] font-bold text-slate-500 hover:text-slate-700 underline underline-offset-2">{t('mailbox.change_mailbox') || 'Change mailbox'}</button>
                  <button onClick={() => { /* Clears the BRIDGE as well as the cache. Without this the hydrate on next load would resurrect a mailbox the teacher just forgot. */ alloPersistMailboxConfig(null); setMbConfig(null); setMbUrlInput(''); setMbStatus('Mailbox forgotten on this device. To reconnect later you may need to reset the admin token (see the setup guide).'); }} className="flex-1 text-[11px] font-bold text-rose-500 hover:text-rose-700 underline underline-offset-2">{t('mailbox.forget_mailbox') || 'Forget mailbox'}</button>
                </div>
              </div>
            )}
            {mbConfig && mbLive && (
              <div>
                <div className="bg-indigo-50 border-2 border-indigo-100 rounded-2xl p-4 mb-3 text-center cursor-pointer" onClick={() => copyToClipboard(mbLive.code)} title={t('mailbox.copy_class_code') || 'Copy class code'}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 mb-1">{t('mailbox.class_code_tap_to_copy') || 'Class code (tap to copy)'}</p>
                  <p className="text-4xl font-black tracking-[0.3em] text-indigo-800">{mbLive.code}</p>
                </div>
                {mbQrSvg ? (
                  <div className="flex justify-center mb-3">
                    <div className="bg-white border border-slate-200 rounded-xl p-3 w-48 h-48 [&_svg]:w-full [&_svg]:h-full shadow-sm" dangerouslySetInnerHTML={{ __html: mbQrSvg }} />
                  </div>
                ) : (
                  <p className="mb-3 text-center text-xs font-bold text-indigo-700">{t('mailbox.validating_live_session_qr') || 'Validating live-session QR...'}</p>
                )}
                <p className="mb-2 text-center text-[11px] text-indigo-800">{mbQrSvg ? `Ready to scan · ${mbLive.aiPolicy === 'student-byok' ? 'Personal AI optional' : 'AI tools off'} · Active until you end the session` : 'The class code remains available while the QR loads.'}</p>
                <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
                  <button onClick={() => copyToClipboard(mbLive.joinUrl)} className="flex min-h-10 items-center justify-center gap-1 rounded-lg border border-indigo-300 bg-white p-2 text-[11px] font-bold text-indigo-800 hover:border-indigo-500">
                    {t('mailbox.copy_link') || 'Copy link'} <Copy size={12}/>
                  </button>
                  <button onClick={() => openStudentQrPreview(mbLive.joinUrl, 'live-session link as a student')} className="flex min-h-10 items-center justify-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 p-2 text-[11px] font-bold text-emerald-900 hover:border-emerald-500">
                    {t('mailbox.test') || 'Test'} <ExternalLink size={12}/>
                  </button>
                  <button onClick={() => printQrSheet(mbQrSvg, 'AlloFlow live session', 'Class code ' + mbLive.code, `Class Mailbox QR join · ${mbLive.aiPolicy === 'student-byok' ? 'Personal AI optional' : 'Student AI off'}`, mbLive.code)} disabled={!mbQrSvg} className="flex min-h-10 items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white p-2 text-[11px] font-bold text-slate-800 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50">
                    {t('mailbox.print') || 'Print'} <Printer size={12}/>
                  </button>
                  <button onClick={() => { setMbPanelOpen(false); setShowSessionModal(true); }} className="flex min-h-10 items-center justify-center gap-1 rounded-lg border border-cyan-300 bg-cyan-50 p-2 text-[11px] font-bold text-cyan-900 hover:border-cyan-500">
                    {t('mailbox.project') || 'Project'} <Maximize size={12}/>
                  </button>
                </div>
                <input aria-label={t('mailbox.join_link_aria') || 'Selectable mailbox live join link'} readOnly value={mbLive.joinUrl || ''} onFocus={event => event.target.select()} className="mb-3 w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" />
                <div className="mb-3 max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{t('mailbox.connected_students') || 'Connected students ('}{Object.keys(mbRoster).length}{(() => { const rt = Object.values(mbRoster).filter(s => s.rtc).length; return rt ? ` · ${rt} real-time ⚡` : ''; })()})</p>
                  {Object.keys(mbRoster).length === 0 && <p className="text-xs text-slate-400">{t('mailbox.waiting_for_students_to_scan') || 'Waiting for students to scan…'}</p>}
                  {Object.entries(mbRoster).map(([uid, s]) => {
                    const stale = mbNow && s.at && (mbNow - s.at > 150000);
                    return (
                      <div key={uid} className={`flex items-center justify-between text-xs py-0.5 ${stale ? 'text-slate-400' : 'text-slate-700'}`}>
                        <span className="font-bold truncate">{s.name}{stale ? ' · away?' : ''}</span>
                        <span className="flex items-center gap-1 shrink-0">
                          {s.rtc && !stale && <span aria-label={t('mailbox.rtc_aria') || 'real-time connection'} title={t('mailbox.rtc_title') || 'Real-time connection'}>⚡</span>}
                          {s.hand && <span aria-label={t('mailbox.hand_aria') || 'hand raised'} title={t('mailbox.hand_title') || 'Hand raised'}>✋</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <button onClick={() => setMbMode(m => m === 'sync' ? 'async' : 'sync')} className={`w-full flex items-center justify-center gap-2 text-xs font-bold rounded-lg p-2 transition-all mb-2 border ${mbMode === 'sync' ? 'text-emerald-800 bg-emerald-50 border-emerald-300' : 'text-sky-800 bg-sky-50 border-sky-300'}`}>
                  {mbMode === 'sync' ? 'Teacher-led: students follow your screen (tap to switch)' : 'Student-paced: students explore independently (tap to switch)'}
                </button>
                <button onClick={shareFullPackToMailbox} disabled={mbBusy} className="w-full flex items-center justify-center gap-2 text-[11px] font-bold text-indigo-800 hover:text-indigo-900 bg-indigo-50 border border-indigo-300 hover:border-indigo-400 rounded-lg p-2 transition-all disabled:opacity-60 mb-2">
                  {t('mailbox.re_send_full_pack_troubleshooting_it') || 'Re-send full pack (troubleshooting — it already syncs automatically)'}
                </button>
                <p className="text-[10px] text-slate-400 mb-2 text-center">{t('mailbox.your_resource_pack_shares_to_the') || 'Your resource pack shares to the class automatically, like a regular live session.'}</p>
                <div className="border-t border-indigo-100 pt-2 mb-2">
                  {mbDirectionsDraft ? (
                    <div className="space-y-1 mb-2">
                      <input value={mbDirectionsDraft.title || ''} onChange={e => setMbDirectionsDraft(p => ({ ...(p || {}), title: e.target.value }))} placeholder={t('directions.title_placeholder') || "Title (e.g. Tonight's homework)"} aria-label={t('directions.title_aria') || 'Directions title'} className="w-full text-[11px] border border-slate-300 rounded p-1.5 bg-white text-slate-800" />
                      <textarea value={mbDirectionsDraft.body || ''} onChange={e => setMbDirectionsDraft(p => ({ ...(p || {}), body: e.target.value }))} placeholder={t('directions.body_placeholder') || 'Directions for students: the steps, and what finished work looks like.'} aria-label={t('directions.body_aria') || 'Directions for students'} rows={3} className="w-full text-[11px] border border-slate-300 rounded p-1.5 bg-white text-slate-800" />
                      <input value={mbDirectionsDraft.due || ''} onChange={e => setMbDirectionsDraft(p => ({ ...(p || {}), due: e.target.value }))} placeholder={t('directions.due_placeholder') || 'Due (optional, e.g. Friday)'} aria-label={t('directions.due_aria') || 'Due date'} className="w-full text-[11px] border border-slate-300 rounded p-1.5 bg-white text-slate-800" />
                      <button onClick={deriveDirectionsDraft} disabled={directionsDeriving} className="w-full flex items-center justify-center gap-1 text-[11px] font-bold text-indigo-800 hover:text-indigo-900 bg-indigo-50 border border-indigo-300 hover:border-indigo-400 rounded-lg p-1.5 transition-all disabled:opacity-60">
                        <Sparkles size={12} /> {directionsDeriving ? (t('directions.drafting') || 'Drafting…') : (t('directions.draft_for_me') || 'Draft for me (from lesson plan + pack)')}
                      </button>
                      <button onClick={() => setShowDirectionsComposer(true)} className="w-full text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:border-amber-400 rounded-lg p-1 transition-all">
                        🎯 {(mbDirectionsDraft?.choiceBoard?.enabled ? 'Edit goals and activity choices (full composer)' : (mbDirectionsDraft?.objectives?.length ? (t('directions.edit_goals_n', { count: mbDirectionsDraft.objectives.length }) || (mbDirectionsDraft.objectives.length + ' goal(s) — edit in full composer')) : (t('directions.add_goals') || 'Add goals or activity choices (full composer)')))}
                      </button>
                      <div className="flex gap-1">
                        <button onClick={addDirectionsToPack} className="flex-1 text-[11px] font-bold text-emerald-800 hover:text-emerald-900 bg-emerald-50 border border-emerald-300 hover:border-emerald-400 rounded-lg p-1.5 transition-all">{t('mailbox.add_to_pack') || 'Add to pack'}</button>
                        <button onClick={() => setMbDirectionsDraft(null)} className="text-[11px] text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-2 transition-all">{t('mailbox.cancel') || 'Cancel'}</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setMbDirectionsDraft({})} className="w-full flex items-center justify-center gap-2 text-[11px] font-bold text-emerald-800 hover:text-emerald-900 bg-emerald-50 border border-emerald-300 hover:border-emerald-400 rounded-lg p-2 transition-all mb-1">
                      <ClipboardList size={13} /> {t('mailbox.write_assignment_directions') || 'Write assignment directions'}
                    </button>
                  )}
                  <button onClick={sendPackHome} disabled={mbBusy} className="w-full flex items-center justify-center gap-2 text-[11px] font-bold text-amber-800 hover:text-amber-900 bg-amber-50 border border-amber-300 hover:border-amber-400 rounded-lg p-2 transition-all disabled:opacity-60">
                    <FolderDown size={13} /> {t('mailbox.send_home_saves_on_student_devices') || 'Send home (saves on student devices)'}
                  </button>
                  <p className="text-[10px] text-slate-400 mt-1 text-center">{t('mailbox.students_keep_the_pack_directions_on') || 'Students keep the pack + directions on their device for homework — no code needed at home.'}</p>
                  {Object.keys(mbHwEvidence).length > 0 && (
                    <div className="border-t border-indigo-100 pt-2 mt-2" role="region" aria-label={t('takehome.evidence_title') || 'Homework check-ins'}>
                      <p className="text-[10px] font-bold text-indigo-700 mb-1">📥 {t('takehome.evidence_title') || 'Homework check-ins'} <span className="font-normal text-slate-400">({t('takehome.evidence_caveat') || 'student-device reported — formative, not a grade'})</span></p>
                      {Object.values(mbHwEvidence).sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 12).map(ev => {
                        // Split the count: goals the device observed vs goals the
                        // student ticked. Both are formative — but "3 of 4 recorded"
                        // and "3 of 4 self-checked" are different claims, and the
                        // panel used to render them identically.
                        const _obs = ev.objectives.filter(o => o.done && o.confirmed).length;
                        const _self = ev.objectives.filter(o => o.done && !o.confirmed).length;
                        return (
                          <p key={ev.uid + '|' + ev.directionsId} className="text-[10px] text-slate-600 truncate" title={ev.objectives.map(o => (o.done ? '✓ ' : '· ') + o.label + (o.done ? (o.confirmed ? ' (recorded on device)' : ' (self-checked)') : '')).join('\n')}>
                            <span className={'font-bold ' + (ev.doneCount >= ev.total && ev.total > 0 ? 'text-emerald-700' : 'text-slate-700')}>{ev.name}</span>
                            {' — ' + ev.doneCount + '/' + ev.total + ' ' + (t('takehome.evidence_goals') || 'goals')}
                            {(_obs > 0 || _self > 0) && (
                              <span className="text-slate-400">
                                {' ('}
                                {_obs > 0 && <span className="text-emerald-700">{_obs + ' ' + (t('takehome.evidence_recorded') || 'recorded')}</span>}
                                {_obs > 0 && _self > 0 ? ', ' : ''}
                                {_self > 0 && <span>{_self + ' ' + (t('takehome.evidence_self') || 'self-checked')}</span>}
                                {')'}
                              </span>
                            )}
                            {ev.xpEarned > 0 ? ' · +' + ev.xpEarned + ' XP' : ''}
                            {' · ' + ev.title}
                          </p>
                        );
                      })}
                    </div>
                  )}
                </div>
                <button onClick={requestEndLiveSession} className="w-full text-xs font-bold text-rose-600 hover:text-rose-800 bg-rose-50 border border-rose-200 rounded-lg p-2 transition-all">{t('mailbox.end_session') || 'End session'}</button>
              </div>
            )}
            {mbStatus && <p className="text-xs text-slate-600 mt-3">{mbStatus}</p>}
          </div>
  );
}
