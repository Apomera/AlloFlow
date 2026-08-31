// Auto-extracted cold-path view source. Edit this file, then rebuild its CDN module.

// Extracted from AlloFlowANTI.txt (live-session-dock).
function LiveSessionDockView(props) {
  const { ALLOHAVEN_CLASSROOM_REWARD_REASONS, ALLOHAVEN_RECOGNITION_CAPS, CLASS_GOAL_TEMPLATES, LIVE_SIGNAL_FRESH_MS, TEACHER_ONLY_TYPES, _alloMbBridgeActive, _alloStudentSafeResources, activeSessionCode, activeSignals, activeUnitId, activeView, addToast, adventureState, broadcastInteractiveOrganizer, checklistMarks, classGoalDraft, classifyLiveRosterPresence, clearSignal, dockCardStyle, dockGroupLabel, dockNow, evaluateClassGoalProgress, formatTime, generatedContent, getAlloHavenSessionRecognitionTokens, getDefaultTitle, getFilteredHistory, getIconForType, getWordSoundsPortableAudioCoverage, handleAwardClassGoal, handleAwardIndependentGoal, handleRecognizeStudent, handleRecognizeStudents, handleReleaseStudentResources, handleRestoreView, handleSetGroupResource, handleSetIsZenModeToTrue, handleSetShowGroupModalToTrue, handleSetShowStudyTimerModalToTrue, handleSetStudentResource, handleSetStudentsResource, handleUpdateHavenRecognitionConfig, havenConfigBusy, havenRecognitionConfig, havenRewardAmount, havenRewardBusy, havenRewardDraftsRef, havenRewardReasonId, havenRewardReceipt, history, interactiveOrganizerRetrying, interactiveOrganizerSync, isStudyTimerRunning, launchPreparedLiveInteraction, liveActivitySnapshots, liveAudioStatusNow, liveDockPanelRef, liveOrganizer, liveOrganizerSummary, livePresenterCuesByResourceId, liveSessionQaEnabled, normalizeClassGoal, normalizeClassGoals, normalizeLiveOrganizerProgress, openChecklistGoalId, openLiveActivityDashboard, recentHavenRecognition, resolveClassGoalTeamUids, resolveLiveStudentResourceTarget, resolveWordSoundsAudioDeliveryState, retryInteractiveOrganizerStudents, retryableLiveOrganizerUids, rosterEntries, rosterKey, sessionData, setActiveView, setChecklistMarks, setClassGoalDraft, setHavenRewardAmount, setHavenRewardReasonId, setIsWordSoundsMode, setLivePollPreset, setLiveSessionQaEnabled, setOpenChecklistGoalId, setPictionaryInitialMode, setPictionaryPreparedInteraction, setRosterKey, setShowHavenRewardAudit, setShowLiveDock, setShowLivePollingPanel, setShowPictionaryHost, setShowSessionModal, setWordSoundsAutoReview, showHavenRewardAudit, signalMeta, studyTimeLeft, t, toggleSessionMode, units, updateLivePresenterCue } = props;
  return (
<div ref={liveDockPanelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={t('live_dock.title') || 'Live Dashboard'} style={{width:'min(1180px, calc(100vw - 2rem))',maxHeight:'calc(100dvh - 2rem)',boxSizing:'border-box',overflowY:'auto',background:'white',borderRadius:16,border:'1px solid #cbd5e1',boxShadow:'0 24px 72px rgba(15,23,42,0.42)',padding:'1.1rem'}}>
                <div style={{position:'sticky',top:'-1.1rem',zIndex:4,display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,margin:'-1.1rem -1.1rem 0.7rem',padding:'0.9rem 1.1rem',background:'rgba(255,255,255,0.97)',borderBottom:'1px solid #e2e8f0',borderRadius:'16px 16px 0 0'}}>
                  <div style={{fontWeight:800,color:'#0f172a',fontSize:'0.95rem'}}>{t('live_dock.title') || 'Live Dashboard'}</div>
                  <button onClick={() => setShowLiveDock(false)} aria-label={t('common.close') || 'Close'} style={{minWidth:44,minHeight:44,background:'#f1f5f9',border:'none',borderRadius:6,padding:'0.15rem 0.5rem',cursor:'pointer',fontWeight:700}}>✕</button>
                </div>
                <button onClick={() => { setShowLiveDock(false); setShowSessionModal(true); }} style={{background:'none',border:'none',padding:0,cursor:'pointer',fontFamily:'monospace',fontWeight:800,color:'#1e3a8a',fontSize:'0.85rem'}} aria-label={t('live_dock.session_code_aria') || 'Show session code and projection screen'}>
                  {(t('live_dock.code_label') || 'Code:') + ' ' + activeSessionCode}
                </button>
                {(() => {
                  // At-a-glance session health (2026-07-20): the question a
                  // teacher actually has mid-lesson is 'are students getting
                  // what I share?' — answered from the live roster + the
                  // session-sync trace, one tap from the full Session log.
                  try {
                    const rosterCount = Object.keys((sessionData && sessionData.roster) || {}).length;
                    const transportLabel = _alloMbBridgeActive() ? (t('live_dock.transport_mailbox') || 'Class Mailbox') : 'Firebase';
                    const trace = (typeof window !== 'undefined' && window.__alloSessionSyncTrace) || [];
                    let lastSync = null; let lastProblem = null;
                    for (let i = trace.length - 1; i >= 0; i--) {
                      const ev = trace[i];
                      if (!lastSync && (ev.event === 'sync:write-ok' || ev.event === 'mailbox:pack-cycle')) lastSync = ev;
                      if (!lastProblem && /REFUSED|write-failed|transport-unavailable/.test(ev.event)) lastProblem = ev;
                      if (lastSync && lastProblem) break;
                    }
                    const problemIsCurrent = lastProblem && (!lastSync || lastProblem.at > lastSync.at);
                    const ageSec = lastSync ? Math.max(0, Math.round((Date.now() - lastSync.at) / 1000)) : null;
                    return (
                      <button type="button" onClick={() => { try { if (window.__alloOpenDiagnosticsLog) window.__alloOpenDiagnosticsLog('session'); } catch (e) {} }}
                        aria-label={t('live_dock.health_aria') || 'Session health — open the session log'}
                        style={{display:'flex',alignItems:'center',gap:6,width:'100%',textAlign:'left',padding:'0.4rem 0.55rem',marginBottom:6,borderRadius:8,cursor:'pointer',fontSize:'0.72rem',fontWeight:700,fontFamily:'inherit',border:'1px solid ' + (problemIsCurrent ? '#fecaca' : '#bbf7d0'),background:problemIsCurrent ? '#fef2f2' : '#f0fdf4',color:problemIsCurrent ? '#991b1b' : '#166534'}}>
                        <span aria-hidden="true">{problemIsCurrent ? '⚠️' : '🟢'}</span>
                        <span>{rosterCount + ' ' + (rosterCount === 1 ? (t('live_dock.student') || 'student') : (t('live_dock.students') || 'students')) + ' · ' + transportLabel}</span>
                        <span style={{marginLeft:'auto',fontWeight:600,opacity:0.85}}>
                          {problemIsCurrent ? (t('live_dock.sync_problem') || 'sync problem — tap') : (lastSync ? ((t('live_dock.synced') || 'synced') + ' ' + (ageSec < 90 ? ageSec + 's' : Math.round(ageSec / 60) + 'm') + ' ' + (t('live_dock.ago') || 'ago')) : (t('live_dock.no_sync_yet') || 'no sync yet'))}
                        </span>
                      </button>
                    );
                  } catch (e) { return null; }
                })()}
                {liveOrganizer && (() => {
                  const organizerResource = [generatedContent]
                    .concat(Array.isArray(history) ? history : [])
                    .concat(Array.isArray(sessionData?.resources) ? sessionData.resources : [])
                    .find(item => item && String(item.id || '') === String(liveOrganizer.resourceId || '')) || null;
                  const countBadges = [
                    { key: 'complete', label: 'complete', color: '#166534', background: '#dcfce7', border: '#86efac' },
                    { key: 'attempted', label: 'attempted', color: '#9a3412', background: '#ffedd5', border: '#fdba74' },
                    { key: 'ready', label: 'ready', color: '#3730a3', background: '#e0e7ff', border: '#a5b4fc' },
                    { key: 'working', label: 'working', color: '#6d28d9', background: '#f5f3ff', border: '#c4b5fd' },
                    { key: 'loading', label: 'loading', color: '#0e7490', background: '#ecfeff', border: '#67e8f9' },
                    { key: 'failed', label: 'failed', color: '#b91c1c', background: '#fee2e2', border: '#fca5a5' },
                    { key: 'pending', label: 'waiting', color: '#475569', background: '#f1f5f9', border: '#cbd5e1' },
                  ].filter(item => liveOrganizerSummary[item.key] > 0);
                  return (
                    <>
                      <div style={dockGroupLabel}>Live organizer activity</div>
                      <section role="status" aria-live="polite" aria-label="Live visual organizer activity status" style={{padding:'0.65rem',border:'1px solid #a5b4fc',borderRadius:10,background:'#eef2ff',color:'#312e81'}}>
                        <div style={{display:'flex',alignItems:'flex-start',gap:8,flexWrap:'wrap'}}>
                          <span aria-hidden="true" style={{fontSize:'1.1rem'}}>🧩</span>
                          <div style={{flex:'1 1 180px',minWidth:0}}>
                            <div style={{fontSize:'0.8rem',fontWeight:900}}>{liveOrganizer.structureType || 'Visual organizer'} is live</div>
                            <div style={{fontSize:'0.65rem',marginTop:2,color:'#4f46e5'}}>
                              {liveOrganizerSummary.total
                                ? `${liveOrganizerSummary.total} student${liveOrganizerSummary.total === 1 ? '' : 's'} in session`
                                : 'Waiting for students to join'}
                            </div>
                          </div>
                          <div style={{display:'flex',gap:5,flexWrap:'wrap',justifyContent:'flex-end'}}>
                            <button type="button" disabled={!organizerResource} onClick={() => {
                              if (!organizerResource) return;
                              handleRestoreView(organizerResource, { suppressLiveFollow: true });
                              setShowLiveDock(false);
                            }} style={{border:'1px solid #818cf8',borderRadius:7,background:'white',color:'#3730a3',padding:'0.3rem 0.5rem',fontSize:'0.68rem',fontWeight:900,cursor:organizerResource?'pointer':'not-allowed',opacity:organizerResource?1:0.55}}>
                              Open activity
                            </button>
                            {retryableLiveOrganizerUids.length > 0 && (
                              <button type="button" disabled={interactiveOrganizerRetrying} onClick={() => retryInteractiveOrganizerStudents(retryableLiveOrganizerUids)} style={{border:'1px solid #f59e0b',borderRadius:7,background:'#fffbeb',color:'#92400e',padding:'0.3rem 0.5rem',fontSize:'0.68rem',fontWeight:900,cursor:interactiveOrganizerRetrying?'wait':'pointer',opacity:interactiveOrganizerRetrying?0.65:1}}>
                                {interactiveOrganizerRetrying ? 'Retrying…' : `Retry waiting/failed (${retryableLiveOrganizerUids.length})`}
                              </button>
                            )}
                            <button type="button" disabled={interactiveOrganizerSync.status === 'stopping'} onClick={() => broadcastInteractiveOrganizer(null)} style={{border:'1px solid #fca5a5',borderRadius:7,background:'#fff1f2',color:'#b91c1c',padding:'0.3rem 0.5rem',fontSize:'0.68rem',fontWeight:900,cursor:interactiveOrganizerSync.status === 'stopping'?'wait':'pointer',opacity:interactiveOrganizerSync.status === 'stopping'?0.65:1}}>
                              {interactiveOrganizerSync.status === 'stopping' ? 'Stopping…' : 'Stop for students'}
                            </button>
                          </div>
                        </div>
                        {countBadges.length > 0 && (
                          <div aria-label="Student activity launch summary" style={{display:'flex',gap:5,flexWrap:'wrap',marginTop:8}}>
                            {countBadges.map(item => (
                              <span key={item.key} style={{border:'1px solid '+item.border,borderRadius:999,background:item.background,color:item.color,padding:'0.12rem 0.38rem',fontSize:'0.64rem',fontWeight:900}}>
                                {liveOrganizerSummary[item.key]} {item.label}
                              </span>
                            ))}
                          </div>
                        )}
                        {interactiveOrganizerSync.error && <p style={{margin:'0.4rem 0 0',fontSize:'0.64rem',color:'#991b1b'}}>The previous activity change failed; this activity remains live.</p>}
                      </section>
                    </>
                  );
                })()}
                {window.AlloModules
                  && window.AlloModules.LiveLessonRun
                  && window.AlloModules.LiveLessonRun.LiveLessonRunPanel
                  && React.createElement(window.AlloModules.LiveLessonRun.LiveLessonRunPanel, {
                    history: getFilteredHistory(),
                    getStudentSafeResources: _alloStudentSafeResources,
                    currentItemId: generatedContent && generatedContent.id,
                    currentResourceId: sessionData && sessionData.currentResourceId,
                    sessionMode: sessionData && sessionData.mode,
                    groups: (sessionData && sessionData.groups) || {},
                    roster: rosterEntries,
                    activeUnitLabel: activeUnitId === 'all'
                      ? (t('history.all_units') || 'All resources')
                      : activeUnitId === 'uncategorized'
                        ? (t('history.uncategorized') || 'Uncategorized')
                        : (((Array.isArray(units) ? units : []).find(unit => unit.id === activeUnitId) || {}).name || (t('common.unit') || 'Unit')),
                    getTitle: item => String(item.title || item.label || getDefaultTitle(item.type)),
                    getIcon: getIconForType,
                    onOpenResource: item => {
                      handleRestoreView(item);
                      setShowLiveDock(false);
                    },
                    onSendToGroup: (groupId, item) => handleSetGroupResource(groupId, item.id),
                    onSendToStudent: (uid, item) => handleSetStudentResource(uid, item.id),
                    onSendToStudents: (uids, item) => handleSetStudentsResource(uids, item.id),
                    onReleaseStudentResources: handleReleaseStudentResources,
                    activitySnapshots: liveActivitySnapshots,
                    onOpenActivity: openLiveActivityDashboard,
                    presenterCuesByResourceId: livePresenterCuesByResourceId,
                    onChangePresenterCue: updateLivePresenterCue,
                    onLaunchPreparedInteraction: launchPreparedLiveInteraction,
                    now: dockNow,
                    signalFreshMs: LIVE_SIGNAL_FRESH_MS,
                    t,
                  })}
                <div style={dockGroupLabel}>{t('live_dock.group_run') || 'Run'}</div>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  <button style={{...dockCardStyle,border:'1px solid #a5b4fc',background:'#eef2ff',color:'#3730a3'}} onClick={() => {
                    const adventureVoteOptions = activeView === 'adventure'
                      ? Array.from(new Set((adventureState?.currentScene?.options || [])
                          .map(option => String(typeof option === 'object' && option?.action ? option.action : option || '').replace(/\s+/g, ' ').trim().slice(0, 180))
                          .filter(Boolean))).slice(0, 12)
                      : [];
                    setLivePollPreset({
                      type: 'mcq',
                      prompt: activeView === 'adventure'
                        ? (t('adventure.class_outcome_vote_prompt') || 'Which outcome should the class choose next?')
                        : (t('live_dock.call_vote_prompt') || 'Which outcome should we choose?'),
                      options: adventureVoteOptions.length >= 2 ? adventureVoteOptions.join('\n') : 'Option A\nOption B',
                      afterSubmitMode: 'wait',
                    });
                    setShowLivePollingPanel(true); setShowLiveDock(false);
                  }}>
                    <span aria-hidden="true">🗳️</span>{t('live_dock.call_vote') || 'Vote on outcomes'}
                    <span style={{marginLeft:'auto',fontSize:'0.65rem',fontWeight:800,color:'#4f46e5'}}>{activeView === 'adventure' && (adventureState?.currentScene?.options || []).length >= 2 ? (t('live_dock.current_outcomes') || 'current outcomes') : (t('live_dock.edit_choices') || 'edit choices')}</span>
                  </button>
                  <button style={dockCardStyle} onClick={() => { setLivePollPreset(null); setShowLivePollingPanel(true); setShowLiveDock(false); }}>
                    <span aria-hidden="true">📊</span>{t('live_dock.poll') || 'Poll'}
                  </button>
                  <div style={{...dockCardStyle,cursor:'default',padding:'0.4rem 0.5rem'}}>
                    <label style={{display:'flex',alignItems:'center',gap:8,minHeight:32,flex:1,cursor:'pointer'}}>
                      <input
                        type="checkbox"
                        checked={liveSessionQaEnabled}
                        onChange={(event) => {
                          const enabled = event.target.checked;
                          setLiveSessionQaEnabled(enabled);
                          if (enabled) {
                            setLivePollPreset(null);
                            setShowLivePollingPanel(true);
                            setShowLiveDock(false);
                          }
                        }}
                        aria-label={t('live_dock.moderated_qa') || 'Moderated live Q&A'}
                      />
                      <span aria-hidden="true">❓</span>
                      <span>{t('live_dock.moderated_qa') || 'Moderated live Q&A'}</span>
                      <span style={{fontSize:'0.65rem',fontWeight:800,color:liveSessionQaEnabled?'#15803d':'#64748b'}}>{liveSessionQaEnabled ? (t('common.on') || 'on') : (t('common.off') || 'off')}</span>
                    </label>
                    {liveSessionQaEnabled && <button type="button" onClick={() => { setLivePollPreset(null); setShowLivePollingPanel(true); setShowLiveDock(false); }} aria-label={t('live_dock.moderate_qa') || 'Open Q&A moderation'} style={{border:'1px solid #7dd3fc',borderRadius:6,background:'#f0f9ff',color:'#075985',padding:'0.3rem 0.45rem',fontSize:'0.64rem',fontWeight:900,cursor:'pointer'}}>{t('live_dock.moderate') || 'Moderate'}</button>}
                  </div>
                  <button style={dockCardStyle} onClick={() => {
                    setLivePollPreset({
                      type: 'rating',
                      prompt: t('live_dock.quick_check_prompt') || 'How is this landing for you right now?',
                      ratingMin: 1, ratingMax: 3,
                      ratingLabels: (t('live_dock.quick_check_labels') || '1 = Confused\n2 = Okay\n3 = Ready'),
                      afterSubmitMode: 'dismiss',
                    });
                    setShowLivePollingPanel(true); setShowLiveDock(false);
                  }}>
                    <span aria-hidden="true">⚡</span>{t('live_dock.quick_check') || 'Check understanding'}
                  </button>
                  <button style={dockCardStyle} onClick={() => {
                    setLivePollPreset({
                      type: 'wordcloud',
                      prompt: t('live_dock.word_cloud_prompt') || 'What word or short phrase best captures your thinking?',
                      afterSubmitMode: 'wait',
                    });
                    setShowLivePollingPanel(true); setShowLiveDock(false);
                  }}>
                    <span aria-hidden="true">☁️</span>{t('live_dock.word_cloud') || 'Word Cloud'}
                  </button>
                  <button style={dockCardStyle} onClick={() => {
                    setLivePollPreset({
                      type: 'freetext',
                      prompt: t('live_dock.feedback_response_prompt') || 'Explain your thinking using evidence from the lesson.',
                      afterSubmitMode: 'wait',
                      feedbackEnabled: true,
                      feedbackCriteria: t('live_dock.feedback_response_criteria') || 'Identify one accurate idea, explain it clearly, and support it with relevant evidence.',
                      feedbackAudienceMode: 'class',
                    });
                    setShowLivePollingPanel(true); setShowLiveDock(false);
                  }}>
                    <span aria-hidden="true">✍️</span>{t('live_dock.feedback_response') || 'Feedback Response'}
                  </button>
                  <button style={dockCardStyle} onClick={() => { setPictionaryPreparedInteraction(null); setPictionaryInitialMode('pictionary'); setShowPictionaryHost(true); setShowLiveDock(false); }}>
                    <span aria-hidden="true">🎨</span>{t('pictionary.button') || 'Concept Pictionary'}
                  </button>
                  <button style={dockCardStyle} onClick={() => { setPictionaryPreparedInteraction(null); setPictionaryInitialMode('sketch'); setShowPictionaryHost(true); setShowLiveDock(false); }}>
                    <span aria-hidden="true">✏️</span>{t('live_dock.sketch_response') || 'Sketch Response'}
                  </button>
                </div>
                <div style={dockGroupLabel}>{t('live_dock.group_guide') || 'Guide'}</div>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  <button type="button" disabled={!generatedContent} style={{...dockCardStyle,opacity:generatedContent?1:0.55,cursor:generatedContent?'pointer':'not-allowed'}} onClick={() => { if (!generatedContent) return; setShowLiveDock(false); handleSetIsZenModeToTrue(); }}>
                    <span aria-hidden="true">🖥️</span>{t('live_dock.focus_display') || 'Present to class'}
                    <span style={{marginLeft:'auto',fontSize:'0.65rem',fontWeight:700,color:'#1d4ed8'}}>{t('live_dock.current_view') || 'current view'}</span>
                  </button>
                  <button type="button" style={dockCardStyle} onClick={() => { setShowLiveDock(false); handleSetShowStudyTimerModalToTrue(); }}>
                    <span aria-hidden="true">⏱️</span>{t('a11y.task_timer') || 'Class timer'}
                    {isStudyTimerRunning ? <span style={{marginLeft:'auto',fontSize:'0.68rem',fontWeight:800,color:'#15803d',fontVariantNumeric:'tabular-nums'}}>{formatTime(studyTimeLeft)}</span> : null}
                  </button>
                  <button style={dockCardStyle} onClick={() => toggleSessionMode()}>
                    <span aria-hidden="true">{sessionData && sessionData.mode === 'sync' ? '🧑‍🏫' : '\uD83C\uDF92'}</span>
                    {(sessionData && sessionData.mode === 'sync') ? (t('session.teacher_paced') || 'Teacher-led') : (t('session.student_paced') || 'Student-paced')}
                    <span style={{marginLeft:'auto',fontSize:'0.68rem',fontWeight:700,color:'#1d4ed8'}}>{t('live_dock.toggle') || 'toggle'}</span>
                  </button>
                  <button style={dockCardStyle} onClick={() => { setShowLiveDock(false); handleSetShowGroupModalToTrue(); }}>
                    <span aria-hidden="true">👥</span>{t('groups.manage_button') || 'Groups'}
                  </button>
                </div>
                <div style={dockGroupLabel}>Recognize</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:6,padding:'0.45rem',background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:9}}>
                  <div style={{gridColumn:'1 / -1',display:'grid',gridTemplateColumns:'1fr auto',gap:6,padding:'0.4rem',borderRadius:7,background:'white',border:'1px solid #86efac'}}>
                    <button type="button" role="switch" aria-checked={havenRecognitionConfig.enabled} disabled={havenConfigBusy || havenRewardBusy} onClick={() => handleUpdateHavenRecognitionConfig({ enabled: !havenRecognitionConfig.enabled })} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,border:'none',background:'transparent',padding:0,color:'#14532d',fontSize:'0.7rem',fontWeight:900,cursor:havenConfigBusy?'wait':'pointer'}}>
                      <span>{havenRecognitionConfig.enabled ? 'Recognition enabled' : 'Recognition off'}</span>
                      <span aria-hidden="true" style={{width:30,height:17,borderRadius:999,background:havenRecognitionConfig.enabled?'#16a34a':'#cbd5e1',padding:2,display:'flex',justifyContent:havenRecognitionConfig.enabled?'flex-end':'flex-start'}}><span style={{width:13,height:13,borderRadius:'50%',background:'white',display:'block'}}></span></span>
                    </button>
                    <label style={{display:'flex',alignItems:'center',gap:4,fontSize:'0.66rem',fontWeight:800,color:'#166534'}}>
                      Session cap
                      <select value={havenRecognitionConfig.perStudentTokenCap} disabled={!havenRecognitionConfig.enabled || havenConfigBusy || havenRewardBusy} onChange={(event) => handleUpdateHavenRecognitionConfig({ perStudentTokenCap: Number(event.target.value) })} aria-label={t('allohaven.token_cap_aria') || 'AlloHaven per-student session token cap'} style={{border:'1px solid #86efac',borderRadius:6,background:'white',color:'#14532d',padding:'0.2rem',fontSize:'0.68rem'}}>
                        {ALLOHAVEN_RECOGNITION_CAPS.map(cap => <option key={cap} value={cap}>{cap}</option>)}
                      </select>
                    </label>
                    <p style={{gridColumn:'1 / -1',margin:0,fontSize:'0.61rem',lineHeight:1.35,color:'#4d7c0f'}}>{havenRecognitionConfig.enabled ? ('Each student can receive up to ' + havenRecognitionConfig.perStudentTokenCap + ' tokens in this session.') : 'Opt in to use recognition in this session. It remains off by default.'}</p>
                  </div>
                  <label style={{display:'flex',flexDirection:'column',gap:3,fontSize:'0.68rem',fontWeight:800,color:'#166534'}}>
                    Positive progress
                    <select
                      value={havenRewardReasonId}
                      onChange={(event) => setHavenRewardReasonId(event.target.value)}
                      disabled={!havenRecognitionConfig.enabled || havenConfigBusy || havenRewardBusy}
                      aria-label={t('allohaven.reason_aria') || 'AlloHaven recognition reason'}
                      style={{minWidth:0,width:'100%',border:'1px solid #86efac',borderRadius:6,background:'white',color:'#14532d',padding:'0.3rem',fontSize:'0.72rem'}}
                    >
                      {ALLOHAVEN_CLASSROOM_REWARD_REASONS.filter(reason => reason.id !== 'group_goal').map(reason => (
                        <option key={reason.id} value={reason.id}>{reason.label}</option>
                      ))}
                    </select>
                  </label>
                  <label style={{display:'flex',flexDirection:'column',gap:3,fontSize:'0.68rem',fontWeight:800,color:'#166534'}}>
                    Tokens
                    <select
                      value={havenRewardAmount}
                      onChange={(event) => setHavenRewardAmount(Number(event.target.value) === 2 ? 2 : 1)}
                      disabled={!havenRecognitionConfig.enabled || havenConfigBusy || havenRewardBusy}
                      aria-label={t('allohaven.token_amount_aria') || 'AlloHaven token amount'}
                      style={{border:'1px solid #86efac',borderRadius:6,background:'white',color:'#14532d',padding:'0.3rem',fontSize:'0.72rem'}}
                    >
                      <option value={1}>+1</option>
                      <option value={2}>+2</option>
                    </select>
                  </label>
                  <p style={{gridColumn:'1 / -1',margin:0,fontSize:'0.64rem',lineHeight:1.35,color:'#3f6212'}}>
                    Choose a reason, then use the leaf button beside a student. Awards are private; no behavior notes are synced.
                  </p>
                  <div style={{gridColumn:'1 / -1',display:'flex',flexWrap:'wrap',gap:5}}>
                    <button
                      type="button"
                      disabled={!havenRecognitionConfig.enabled || havenConfigBusy || havenRewardBusy || Object.keys(rosterEntries).length === 0}
                      onClick={() => handleRecognizeStudents(Object.keys(rosterEntries), 'students')}
                      aria-label={'Recognize all connected students with ' + havenRewardAmount + ' AlloHaven token' + (havenRewardAmount === 1 ? '' : 's') + ' each'}
                      style={{border:'1px solid #15803d',borderRadius:7,background:'#166534',color:'white',padding:'0.3rem 0.48rem',fontSize:'0.68rem',fontWeight:800,cursor:havenRewardBusy?'wait':'pointer',opacity:havenRewardBusy?0.65:1}}
                    >
                      {havenRewardBusy ? 'Sending…' : '🌿 Recognize class'}
                    </button>
                    {Object.entries((sessionData && sessionData.groups) || {}).map(([groupId, group]) => {
                      const groupUids = Object.keys(rosterEntries).filter(uid => rosterEntries[uid] && rosterEntries[uid].groupId === groupId);
                      if (!groupUids.length) return null;
                      const groupLabel = (group && group.name) || 'Group';
                      return (
                        <button
                          key={'haven-group-' + groupId}
                          type="button"
                          disabled={!havenRecognitionConfig.enabled || havenConfigBusy || havenRewardBusy}
                          onClick={() => handleRecognizeStudents(groupUids, 'students in ' + groupLabel)}
                          aria-label={'Recognize ' + groupLabel + ' group, ' + groupUids.length + ' students, with ' + havenRewardAmount + ' AlloHaven token' + (havenRewardAmount === 1 ? '' : 's') + ' each'}
                          style={{border:'1px solid #86efac',borderRadius:7,background:'white',color:'#166534',padding:'0.3rem 0.48rem',fontSize:'0.68rem',fontWeight:800,cursor:havenRewardBusy?'wait':'pointer',opacity:havenRewardBusy?0.65:1}}
                        >
                          {groupLabel + ' (' + groupUids.length + ')'}
                        </button>
                      );
                    })}
                  </div>
                  {havenRewardReceipt ? (
                    <div role="status" aria-live="polite" aria-atomic="true" style={{gridColumn:'1 / -1',padding:'0.38rem 0.45rem',borderRadius:7,background:havenRewardReceipt.partial?'#fffbeb':'#dcfce7',border:'1px solid '+(havenRewardReceipt.partial?'#fde68a':'#86efac'),fontSize:'0.66rem',lineHeight:1.4,color:havenRewardReceipt.partial?'#92400e':'#14532d'}}>
                      <strong>{havenRewardReceipt.partial ? 'Partial delivery' : 'Last delivery confirmed'}</strong>
                      {' · ' + havenRewardReceipt.count + ' ' + havenRewardReceipt.scopeLabel}
                      {' · +' + havenRewardReceipt.amount + ' each · ' + havenRewardReceipt.reasonLabel}
                      {havenRewardReceipt.skippedCount ? ' · ' + havenRewardReceipt.skippedCount + ' skipped at session cap' : ''}
                      {' · ' + new Date(havenRewardReceipt.at).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}
                    </div>
                  ) : null}
                  {recentHavenRecognition.length > 0 ? (
                    <div style={{gridColumn:'1 / -1'}}>
                      <button
                        type="button"
                        onClick={() => setShowHavenRewardAudit(value => !value)}
                        aria-expanded={showHavenRewardAudit}
                        aria-controls="allohaven-recognition-delivery-audit"
                        style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',border:'none',background:'transparent',padding:'0.15rem 0',fontSize:'0.66rem',fontWeight:800,color:'#166534',cursor:'pointer'}}
                      >
                        <span>Recent private deliveries ({recentHavenRecognition.length})</span>
                        <span aria-hidden="true">{showHavenRewardAudit ? '▴' : '▾'}</span>
                      </button>
                      {showHavenRewardAudit ? (
                        <ol id="allohaven-recognition-delivery-audit" aria-label={t('allohaven.recent_deliveries_aria') || 'Recent private AlloHaven recognition deliveries'} style={{listStyle:'none',margin:'0.3rem 0 0',padding:0,display:'flex',flexDirection:'column',gap:3,maxHeight:130,overflowY:'auto'}}>
                          {recentHavenRecognition.map(event => (
                            <li key={event.id} style={{display:'grid',gridTemplateColumns:'1fr auto',gap:4,padding:'0.3rem 0.38rem',borderRadius:6,background:'white',border:'1px solid #bbf7d0',fontSize:'0.64rem',color:'#365314'}}>
                              <span style={{fontWeight:800,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{event.studentName + ' · ' + event.reasonLabel}</span>
                              <span style={{fontWeight:900}}>+{event.amount}</span>
                              <time dateTime={new Date(event.at).toISOString()} style={{gridColumn:'1 / -1',color:'#64748b'}}>{new Date(event.at).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}</time>
                            </li>
                          ))}
                        </ol>
                      ) : null}
                      <p style={{margin:'0.3rem 0 0',fontSize:'0.6rem',lineHeight:1.35,color:'#4d7c0f'}}>Teacher-only delivery audit. No balances, rankings, or behavior notes.</p>
                    </div>
                  ) : null}
                </div>
                <div style={dockGroupLabel}>Class Goals</div>
                {(() => {
                  // Class Goals (docs/GROUP_CONTINGENCY_DESIGN.md, Ring A):
                  // whole-class interdependent contingencies, earn-only,
                  // teacher-observed. "Met" fans out ONE private group_goal
                  // recognition to every connected student through the same
                  // capped path as Recognize. Goal names never leave this
                  // device — students only ever see "Class goal achieved."
                  const goals = normalizeClassGoals(rosterKey && rosterKey.classGoals);
                  const activeGoals = goals.filter(goal => goal.active);
                  const saveGoals = (next) => setRosterKey(prev => ({ ...(prev || { groups: {}, students: {} }), classGoals: next }));
                  const draft = classGoalDraft;
                  const goalBtnDisabled = !havenRecognitionConfig.enabled || havenConfigBusy || havenRewardBusy || Object.keys(rosterEntries).length === 0;
                  return (
                    <div style={{display:'flex',flexDirection:'column',gap:6,padding:'0.45rem',background:'#f0f9ff',border:'1px solid #bae6fd',borderRadius:9}}>
                      <p style={{margin:0,fontSize:'0.61rem',lineHeight:1.35,color:'#0c4a6e'}}>
                        Whole-class goals, earn-only. Goal names stay on this device; students privately receive “Class goal achieved.”
                        {!havenRecognitionConfig.enabled ? ' Enable recognition above to award.' : ''}
                      </p>
                      {activeGoals.map(goal => {
                        const teamUids = resolveClassGoalTeamUids(goal, rosterEntries, rosterKey);
                        const progress = evaluateClassGoalProgress(goal, teamUids, rosterEntries, sessionData);
                        const teamLabel = goal.team === 'class' ? null
                          : goal.team.indexOf('group:') === 0
                            ? (((rosterKey && rosterKey.groups && rosterKey.groups[goal.team.slice(6)]) || {}).name || 'Group')
                            : 'Pod ' + goal.team.slice(4);
                        const independent = goal.mode === 'independent';
                        const checklistOpen = independent && openChecklistGoalId === goal.id;
                        const markedUids = checklistOpen ? teamUids.filter(uid => checklistMarks[uid]) : [];
                        const awardDisabled = goalBtnDisabled || teamUids.length === 0;
                        return (
                          <div key={goal.id} style={{display:'flex',flexDirection:'column',gap:4,padding:'0.32rem 0.4rem',borderRadius:7,background:'white',border:'1px solid ' + (progress && progress.met ? '#0284c7' : '#bae6fd'),boxShadow:progress && progress.met ? '0 0 0 1px #0284c7' : 'none'}}>
                            <div style={{display:'grid',gridTemplateColumns:'1fr auto auto',gap:5,alignItems:'center'}}>
                              <span style={{fontSize:'0.66rem',fontWeight:800,color:'#0c4a6e',overflow:'hidden',textOverflow:'ellipsis'}}>
                                {goal.label}
                                <span style={{fontWeight:600,color:'#0369a1'}}>
                                  {(teamLabel ? ' · ' + teamLabel : '')
                                    + (independent ? ' · each student' : '')
                                    + (goal.allowance && !independent ? ' · ok with up to ' + goal.allowance + ' exception' + (goal.allowance === 1 ? '' : 's') : '')
                                    + (goal.metCount ? ' · met ×' + goal.metCount : '')}
                                </span>
                                {progress ? (
                                  <span style={{display:'block',fontWeight:700,color:progress.met ? '#0369a1' : '#64748b'}}>
                                    {progress.label + (progress.met ? ' · criterion met — your call' : '')}
                                  </span>
                                ) : null}
                              </span>
                              {independent ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (checklistOpen) { setOpenChecklistGoalId(null); return; }
                                    const seeded = {};
                                    teamUids.forEach(uid => { seeded[uid] = !!(progress && progress.perStudentMet && progress.perStudentMet[uid]); });
                                    setChecklistMarks(seeded);
                                    setOpenChecklistGoalId(goal.id);
                                  }}
                                  aria-expanded={checklistOpen}
                                  aria-label={'Open per-student checklist for goal ' + goal.label}
                                  style={{border:'1px solid #0369a1',borderRadius:7,background:checklistOpen?'#e0f2fe':'#0284c7',color:checklistOpen?'#0369a1':'white',padding:'0.28rem 0.45rem',fontSize:'0.66rem',fontWeight:800,cursor:'pointer'}}
                                >☑ Checklist</button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={awardDisabled}
                                  onClick={() => handleAwardClassGoal(goal.id)}
                                  title={havenRecognitionConfig.enabled ? 'Criterion met — privately award +' + goal.tokens + ' AlloHaven token' + (goal.tokens === 1 ? '' : 's') + ' to each student on this team.' : 'Enable recognition above first.'}
                                  aria-label={'Goal met: ' + goal.label + ' — award ' + goal.tokens + ' token' + (goal.tokens === 1 ? '' : 's') + ' to each of ' + teamUids.length + ' students'}
                                  style={{border:'1px solid #0369a1',borderRadius:7,background:'#0284c7',color:'white',padding:'0.28rem 0.45rem',fontSize:'0.66rem',fontWeight:800,cursor:awardDisabled?'not-allowed':'pointer',opacity:awardDisabled?0.55:1}}
                                >
                                  🎯 Met · +{goal.tokens}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => { saveGoals(goals.filter(item => item.id !== goal.id)); if (openChecklistGoalId === goal.id) setOpenChecklistGoalId(null); }}
                                aria-label={'Remove goal ' + goal.label}
                                style={{border:'none',background:'transparent',color:'#64748b',fontSize:'0.72rem',fontWeight:900,cursor:'pointer',padding:'0.1rem 0.2rem'}}
                              >✕</button>
                            </div>
                            {checklistOpen ? (
                              <div style={{display:'flex',flexDirection:'column',gap:4,paddingTop:2,borderTop:'1px dashed #bae6fd'}}>
                                <p style={{margin:0,fontSize:'0.6rem',color:'#0369a1'}}>
                                  {progress ? 'Pre-checked from live progress — adjust before awarding.' : 'Mark each student who met this goal.'}
                                </p>
                                <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                                  {teamUids.map(uid => {
                                    const marked = !!checklistMarks[uid];
                                    const sName = (rosterEntries[uid] && rosterEntries[uid].name) || 'Student';
                                    return (
                                      <button
                                        key={goal.id + '-' + uid}
                                        type="button"
                                        role="checkbox"
                                        aria-checked={marked}
                                        aria-label={sName + (marked ? ' — marked as met' : ' — not marked')}
                                        onClick={() => setChecklistMarks(prev => ({ ...prev, [uid]: !prev[uid] }))}
                                        style={{border:'1px solid ' + (marked ? '#0369a1' : '#cbd5e1'),borderRadius:999,background:marked?'#e0f2fe':'white',color:marked?'#0c4a6e':'#64748b',padding:'0.2rem 0.45rem',fontSize:'0.63rem',fontWeight:800,cursor:'pointer'}}
                                      >{(marked ? '☑ ' : '☐ ') + sName}</button>
                                    );
                                  })}
                                  {teamUids.length === 0 ? <span style={{fontSize:'0.62rem',color:'#64748b',fontStyle:'italic'}}>No connected students on this team.</span> : null}
                                </div>
                                <button
                                  type="button"
                                  disabled={goalBtnDisabled || markedUids.length === 0}
                                  onClick={() => { handleAwardIndependentGoal(goal.id, markedUids); setOpenChecklistGoalId(null); }}
                                  aria-label={'Award ' + goal.tokens + ' token' + (goal.tokens === 1 ? '' : 's') + ' to each of ' + markedUids.length + ' marked students'}
                                  style={{alignSelf:'flex-end',border:'1px solid #0369a1',borderRadius:7,background:'#0284c7',color:'white',padding:'0.26rem 0.5rem',fontSize:'0.66rem',fontWeight:800,cursor:(goalBtnDisabled || markedUids.length === 0)?'not-allowed':'pointer',opacity:(goalBtnDisabled || markedUids.length === 0)?0.55:1}}
                                >🎯 Award {markedUids.length} · +{goal.tokens} each</button>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                      {activeGoals.length === 0 && !draft ? (
                        <p style={{margin:0,fontSize:'0.62rem',color:'#64748b',fontStyle:'italic'}}>No class goals yet — add one to recognize whole-class accomplishments.</p>
                      ) : null}
                      {draft ? (
                        <div style={{display:'flex',flexDirection:'column',gap:4,padding:'0.4rem',borderRadius:7,background:'white',border:'1px solid #bae6fd'}}>
                          <label style={{display:'flex',flexDirection:'column',gap:2,fontSize:'0.64rem',fontWeight:800,color:'#0c4a6e'}}>
                            Starting point
                            <select
                              value={draft.templateId}
                              onChange={(event) => {
                                const template = CLASS_GOAL_TEMPLATES.find(item => item.id === event.target.value) || CLASS_GOAL_TEMPLATES[0];
                                setClassGoalDraft({ ...draft, templateId: template.id, label: template.id === 'custom' ? '' : template.label });
                              }}
                              aria-label={t('class_goals.template_aria') || 'Class goal starting template'}
                              style={{border:'1px solid #bae6fd',borderRadius:6,background:'white',color:'#0c4a6e',padding:'0.25rem',fontSize:'0.68rem'}}
                            >
                              {CLASS_GOAL_TEMPLATES.map(template => <option key={template.id} value={template.id}>{template.label}</option>)}
                            </select>
                          </label>
                          <label style={{display:'flex',flexDirection:'column',gap:2,fontSize:'0.64rem',fontWeight:800,color:'#0c4a6e'}}>
                            Goal name (stays on this device)
                            <input
                              type="text"
                              value={draft.label}
                              maxLength={80}
                              onChange={(event) => setClassGoalDraft({ ...draft, label: event.target.value })}
                              placeholder={t('class_goals.name_placeholder') || 'e.g., Lined up ready in under 2 minutes'}
                              aria-label={t('class_goals.name_aria') || 'Class goal name, kept on this device only'}
                              style={{border:'1px solid #bae6fd',borderRadius:6,padding:'0.28rem',fontSize:'0.68rem',color:'#0c4a6e'}}
                            />
                          </label>
                          <div style={{display:'flex',gap:6}}>
                            <label style={{flex:1,display:'flex',flexDirection:'column',gap:2,fontSize:'0.64rem',fontWeight:800,color:'#0c4a6e'}}>
                              How it's earned
                              <select value={draft.mode} onChange={(event) => setClassGoalDraft({ ...draft, mode: event.target.value === 'independent' ? 'independent' : 'interdependent' })} aria-label={t('class_goals.mode_aria') || 'Whole team together, or each student individually'} style={{border:'1px solid #bae6fd',borderRadius:6,background:'white',color:'#0c4a6e',padding:'0.25rem',fontSize:'0.68rem'}}>
                                <option value="interdependent">Team together</option>
                                <option value="independent">Each student</option>
                              </select>
                            </label>
                            <label style={{flex:1,display:'flex',flexDirection:'column',gap:2,fontSize:'0.64rem',fontWeight:800,color:'#0c4a6e'}}>
                              Team
                              <select
                                value={draft.team}
                                onChange={(event) => setClassGoalDraft({ ...draft, team: event.target.value })}
                                aria-label={t('class_goals.scope_aria') || 'Which students this goal covers'}
                                style={{border:'1px solid #bae6fd',borderRadius:6,background:'white',color:'#0c4a6e',padding:'0.25rem',fontSize:'0.68rem'}}
                              >
                                <option value="class">Whole class</option>
                                {Object.keys((rosterKey && rosterKey.groups) || {}).map(gid => (
                                  <option key={'goal-team-' + gid} value={'group:' + gid}>{(rosterKey.groups[gid] && rosterKey.groups[gid].name) || 'Group'}</option>
                                ))}
                                {(() => {
                                  const SC = window.AlloModules && window.AlloModules.SeatingChart;
                                  if (!SC || typeof SC.listPods !== 'function') return null;
                                  let pods = [];
                                  try { pods = SC.listPods(rosterKey); } catch(_) { pods = []; }
                                  return pods.map(pod => <option key={'goal-pod-' + pod.index} value={'pod:' + pod.index}>{pod.label}</option>);
                                })()}
                              </select>
                            </label>
                          </div>
                          {(!(window.AlloModules && window.AlloModules.SeatingChart) && rosterKey && rosterKey.seating) ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (typeof window.__alloLazySeatingChart === 'function') { try { window.__alloLazySeatingChart(); } catch(_) {} }
                                window.setTimeout(() => setClassGoalDraft(current => current ? { ...current } : current), 900);
                              }}
                              style={{alignSelf:'flex-start',border:'1px dashed #7dd3fc',borderRadius:6,background:'white',color:'#0369a1',padding:'0.2rem 0.4rem',fontSize:'0.6rem',fontWeight:800,cursor:'pointer'}}
                            >Load seating pods as teams…</button>
                          ) : null}
                          <div style={{display:'flex',gap:6}}>
                            <label style={{flex:1,display:'flex',flexDirection:'column',gap:2,fontSize:'0.64rem',fontWeight:800,color:'#0c4a6e'}}>
                              Tokens
                              <select value={draft.tokens} onChange={(event) => setClassGoalDraft({ ...draft, tokens: Number(event.target.value) === 2 ? 2 : 1 })} aria-label={t('class_goals.tokens_aria') || 'Tokens awarded per student when this goal is met'} style={{border:'1px solid #bae6fd',borderRadius:6,background:'white',color:'#0c4a6e',padding:'0.25rem',fontSize:'0.68rem'}}>
                                <option value={1}>+1</option>
                                <option value={2}>+2</option>
                              </select>
                            </label>
                            <label style={{flex:1,display:'flex',flexDirection:'column',gap:2,fontSize:'0.64rem',fontWeight:800,color:'#0c4a6e'}} title={t('class_goals.allowance_help') || 'Good Behavior Game-style allowance: the goal still counts as met with up to this many exceptions. No student is ever named as the exception.'}>
                              Allowance
                              <select value={draft.allowance} onChange={(event) => setClassGoalDraft({ ...draft, allowance: Math.max(0, Math.min(5, Number(event.target.value) || 0)) })} aria-label={t('class_goals.allowance_aria') || 'Exceptions allowed while still meeting the goal'} style={{border:'1px solid #bae6fd',borderRadius:6,background:'white',color:'#0c4a6e',padding:'0.25rem',fontSize:'0.68rem'}}>
                                {[0,1,2,3,4,5].map(n => <option key={n} value={n}>{n === 0 ? 'None' : 'Up to ' + n}</option>)}
                              </select>
                            </label>
                          </div>
                          <div style={{display:'flex',gap:6}}>
                            <label style={{flex:1.4,display:'flex',flexDirection:'column',gap:2,fontSize:'0.64rem',fontWeight:800,color:'#0c4a6e'}} title={t('class_goals.criteria_help') || 'App-tracked criteria show live progress and prompt you when met. Awarding is always your tap, never automatic.'}>
                              Progress signal
                              <select
                                value={draft.trackedMetric}
                                onChange={(event) => {
                                  const metric = event.target.value;
                                  setClassGoalDraft({ ...draft, trackedMetric: metric, trackedThreshold: metric === 'xp_total' ? 500 : 1 });
                                }}
                                aria-label={t('class_goals.criteria_aria') || 'Optional app-tracked progress signal for this goal'}
                                style={{border:'1px solid #bae6fd',borderRadius:6,background:'white',color:'#0c4a6e',padding:'0.25rem',fontSize:'0.68rem'}}
                              >
                                <option value="none">Teacher observed (none)</option>
                                <option value="xp_total">Team session XP reaches…</option>
                                <option value="responded_each">Everyone responds ≥…</option>
                              </select>
                            </label>
                            {draft.trackedMetric !== 'none' ? (
                              <label style={{flex:0.6,display:'flex',flexDirection:'column',gap:2,fontSize:'0.64rem',fontWeight:800,color:'#0c4a6e'}}>
                                {draft.trackedMetric === 'xp_total' ? 'XP' : 'Responses'}
                                <input
                                  type="number"
                                  min={1}
                                  max={1000000}
                                  value={draft.trackedThreshold}
                                  onChange={(event) => setClassGoalDraft({ ...draft, trackedThreshold: Math.max(1, Math.min(1000000, Math.floor(Number(event.target.value) || 1))) })}
                                  aria-label={draft.trackedMetric === 'xp_total' ? 'XP threshold for this goal' : 'Responses required per student'}
                                  style={{border:'1px solid #bae6fd',borderRadius:6,padding:'0.25rem',fontSize:'0.68rem',color:'#0c4a6e'}}
                                />
                              </label>
                            ) : null}
                          </div>
                          <div style={{display:'flex',gap:6,justifyContent:'flex-end'}}>
                            <button type="button" onClick={() => setClassGoalDraft(null)} style={{border:'1px solid #cbd5e1',borderRadius:7,background:'white',color:'#475569',padding:'0.26rem 0.5rem',fontSize:'0.66rem',fontWeight:800,cursor:'pointer'}}>Cancel</button>
                            <button
                              type="button"
                              disabled={!draft.label.trim()}
                              onClick={() => {
                                const label = draft.label.trim().slice(0, 80);
                                if (!label) return;
                                const requestedGroupId = typeof draft.team === 'string' && draft.team.indexOf('group:') === 0 ? draft.team.slice(6) : '';
                                const goalTeam = requestedGroupId && !(rosterKey && rosterKey.groups && rosterKey.groups[requestedGroupId])
                                  ? 'class' : draft.team;
                                const goal = normalizeClassGoal({
                                  id: 'goal-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
                                  label,
                                  templateId: draft.templateId,
                                  tokens: draft.tokens,
                                  allowance: draft.allowance,
                                  mode: draft.mode,
                                  team: goalTeam,
                                  tracked: draft.trackedMetric !== 'none' ? { metric: draft.trackedMetric, threshold: draft.trackedThreshold } : null,
                                  active: true,
                                });
                                if (goal) saveGoals(goals.concat([goal]).slice(0, 20));
                                setClassGoalDraft(null);
                              }}
                              style={{border:'1px solid #0369a1',borderRadius:7,background:'#0284c7',color:'white',padding:'0.26rem 0.5rem',fontSize:'0.66rem',fontWeight:800,cursor:'pointer',opacity:!draft.label.trim()?0.5:1}}
                            >Add goal</button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setClassGoalDraft({ templateId: 'transition_smooth', label: 'Smooth transition', tokens: 1, allowance: 1, mode: 'interdependent', team: 'class', trackedMetric: 'none', trackedThreshold: 1 })}
                          style={{alignSelf:'flex-start',border:'1px dashed #7dd3fc',borderRadius:7,background:'white',color:'#0369a1',padding:'0.28rem 0.5rem',fontSize:'0.66rem',fontWeight:800,cursor:'pointer'}}
                        >＋ Add class goal</button>
                      )}
                    </div>
                  );
                })()}
                {(() => {
                  // Students: delivery status (which resource each student is
                  // actually viewing vs their target) + per-student push of the
                  // teacher's currently open resource. Precedence for target:
                  // individual > group > class (sync mode only for class).
                  const studentUids = Object.keys(rosterEntries);
                  if (studentUids.length === 0) return null;
                  const titleFor = (id) => {
                    if (!id) return null;
                    const h = (history || []).find(x => x && x.id === id);
                    return h ? (h.title || getDefaultTitle(h.type)) : null;
                  };
                  const targetFor = (entry) => resolveLiveStudentResourceTarget({
                    entry,
                    groups: sessionData && sessionData.groups,
                    currentResourceId: sessionData && sessionData.currentResourceId,
                    sessionMode: sessionData && sessionData.mode,
                  });
                  const canPushCurrent = !!(generatedContent && generatedContent.id && !TEACHER_ONLY_TYPES.includes(generatedContent.type));
                  const rows = studentUids
                    .map(uid => ({ uid, entry: rosterEntries[uid] || {} }))
                    .sort((a, b) => String(a.entry.name || '').localeCompare(String(b.entry.name || '')));
                  return (
                    <>
                      <div style={dockGroupLabel}>{(t('live_dock.group_students') || 'Students') + ' (' + rows.length + ')'}</div>
                      <div style={{display:'flex',flexDirection:'column',gap:4,maxHeight:170,overflowY:'auto'}}>
                        {rows.map(({ uid, entry }) => {
                          const target = targetFor(entry);
                          const targetId = target && target.resourceId;
                          const targetAt = target ? Number(target.resourceAt) : NaN;
                          const viewing = entry.viewingResourceId || null;
                          const assigned = !!(targetId && Number.isFinite(targetAt) && targetAt > 0);
                          const hasAssignmentAck = Object.prototype.hasOwnProperty.call(entry, 'viewingResourceAt');
                          const onTarget = !!(targetId && viewing === targetId && (!assigned
                            || (hasAssignmentAck
                              ? Number(entry.viewingResourceAt) === targetAt
                              : Number(entry.viewingAt) >= targetAt)));
                          const deliveryStatusMatches = assigned && Number(entry.viewingResourceAt) === targetAt;
                          const deliveryStatus = deliveryStatusMatches ? entry.viewingResourceStatus : null;
                          const statusDot = !targetId
                            ? { glyph: '.', color: '#94a3b8', label: t('live_dock.status_free') || 'no target' }
                            : deliveryStatus === 'failed'
                              ? { glyph: '!', color: '#dc2626', label: 'resource load failed' }
                              : deliveryStatus === 'loading'
                                ? { glyph: '~', color: '#0891b2', label: 'resource loading' }
                                : assigned && onTarget
                              ? { glyph: 'O', color: '#16a34a', label: t('live_dock.status_opened') || 'opened' }
                              : assigned && viewing
                                ? { glyph: 'o', color: '#b45309', label: t('live_dock.status_assigned_elsewhere') || 'assigned · elsewhere' }
                                : assigned
                                  ? { glyph: '-', color: '#b45309', label: t('live_dock.status_assigned_pending') || 'assigned · not opened' }
                                  : onTarget
                                    ? { glyph: 'O', color: '#16a34a', label: t('live_dock.status_on') || 'on it' }
                                    : viewing
                                      ? { glyph: 'o', color: '#b45309', label: t('live_dock.status_elsewhere') || 'elsewhere' }
                                      : { glyph: '-', color: '#94a3b8', label: t('live_dock.status_unknown') || 'no signal' };
                          const viewingTitle = titleFor(viewing);
                          // Presence (2026-07-16): from roster.{uid}.lastSeen heartbeats. Bands are
                          // generous vs the ~60s beat (>=2 missed = quiet, >=3 = likely gone).
                          // Freshness re-evaluates whenever any snapshot re-renders the dock —
                          // heartbeats themselves arrive as snapshots, so it stays current.
                          const presenceState = classifyLiveRosterPresence({ entry, now: dockNow });
                          const presence = presenceState.status === 'connected'
                            ? { color: '#16a34a', label: t('live_dock.presence_here') || 'connected' }
                            : presenceState.status === 'quiet'
                              ? { color: '#b45309', label: t('live_dock.presence_quiet') || 'quiet for 2+ min' }
                              : presenceState.status === 'disconnected'
                                ? { color: '#dc2626', label: t('live_dock.presence_gone') || 'disconnected?' }
                                : { color: '#94a3b8', label: t('live_dock.presence_unknown') || 'presence unknown (older app version)' };
                          const rewardTokensUsed = getAlloHavenSessionRecognitionTokens(entry, havenRewardDraftsRef.current[uid]);
                          const rewardTokensRemaining = Math.max(0, havenRecognitionConfig.perStudentTokenCap - rewardTokensUsed);
                          const canRecognizeStudent = havenRecognitionConfig.enabled && rewardTokensRemaining >= havenRewardAmount && !havenConfigBusy && !havenRewardBusy;
                          const wsAudioState = resolveWordSoundsAudioDeliveryState({ progress: entry.wsProgress, targetAt: assigned ? targetAt : null, now: liveAudioStatusNow });
                          const wsAudioStatus = wsAudioState.status;
                          const wsAudioNeedsAttention = wsAudioState.needsAttention;
                          const wsAudioStalled = wsAudioState.stalled;
                          const wsAudioBusy = wsAudioState.busy;
                          const wsAudioLabel = wsAudioStalled ? (t('word_sounds.audio_status_no_response') || 'No audio response — resend')
                            : wsAudioStatus === 'requested' ? (t('word_sounds.audio_status_requested') || 'Resend requested')
                              : wsAudioStatus === 'resending' ? (t('word_sounds.audio_status_resending') || 'Resending audio...')
                                : wsAudioStatus === 'checking' ? (t('word_sounds.audio_status_checking', { ready: entry.wsProgress?.audioReady || 0, total: entry.wsProgress?.audioTotal || 0 }) || ('Checking audio ' + (entry.wsProgress?.audioReady || 0) + '/' + (entry.wsProgress?.audioTotal || 0)))
                                  : wsAudioStatus === 'blocked' ? (t('word_sounds.audio_status_blocked') || 'Playback blocked — student must tap')
                                    : wsAudioStatus === 'unsupported' ? (t('word_sounds.audio_status_unsupported') || 'Audio unsupported')
                                      : wsAudioStatus === 'damaged' ? (t('word_sounds.audio_status_damaged') || 'Audio damaged')
                                        : (t('word_sounds.audio_status_missing', { ready: entry.wsProgress?.audioReady || 0, total: entry.wsProgress?.audioTotal || 0 }) || ('Audio missing ' + (entry.wsProgress?.audioReady || 0) + '/' + (entry.wsProgress?.audioTotal || 0)));
                          const wsAudioPrimaryLabel = wsAudioStatus === 'damaged' ? (t('word_sounds.audio_resend') || 'Resend audio') : wsAudioLabel;
                          const activeOrganizer = sessionData?.interactiveOrganizer;
                          const organizerProgress = normalizeLiveOrganizerProgress(entry.organizerProgress);
                          const organizerProgressIsCurrent = !!(activeOrganizer?.activityId
                            && organizerProgress?.activityId === activeOrganizer.activityId);
                          const organizerProgressLabel = !organizerProgressIsCurrent ? null
                            : organizerProgress.status === 'complete'
                              ? `Organizer complete${organizerProgress.total ? ` ${organizerProgress.correct}/${organizerProgress.total}` : ''}`
                              : organizerProgress.status === 'attempted'
                                ? `Organizer attempt${organizerProgress.total ? ` ${organizerProgress.correct}/${organizerProgress.total}` : ''}`
                                : organizerProgress.status === 'failed'
                                  ? 'Organizer failed to open'
                                  : organizerProgress.status === 'ready'
                                    ? 'Organizer ready'
                                    : organizerProgress.status === 'loading'
                                      ? 'Organizer loading'
                                      : 'Organizer working';
                          return (
                            <div key={uid} style={{display:'flex',alignItems:'center',gap:6,padding:'0.3rem 0.45rem',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,fontSize:'0.75rem'}}>
                              <span role="img" aria-label={presence.label} title={presence.label} style={{width:8,height:8,borderRadius:'50%',background:presence.color,flexShrink:0,display:'inline-block'}}></span>
                              <span aria-hidden="true" style={{color:statusDot.color,fontWeight:900}}>{statusDot.glyph}</span>
                              <span style={{fontWeight:700,color:'#0f172a',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:86}}>{entry.name || 'Student'}</span>
                              <span style={{color:'#64748b',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',flex:1}}>
                                {statusDot.label}{viewingTitle ? ' · ' + viewingTitle : ''}
                              </span>
                              {entry.wsProgress && entry.wsProgress.total ? (
                                <span
                                  title={(t('live_dock.ws_progress_title') || 'Word Sounds practice') + (entry.wsProgress.activity ? ' · ' + entry.wsProgress.activity : '')}
                                  style={{whiteSpace:'nowrap',fontWeight:800,fontSize:'0.68rem',color: entry.wsProgress.done ? '#15803d' : '#6d28d9', background: entry.wsProgress.done ? '#dcfce7' : '#ede9fe', border:'1px solid ' + (entry.wsProgress.done ? '#86efac' : '#ddd6fe'), borderRadius:6, padding:'0.05rem 0.3rem'}}
                                >🎵 {entry.wsProgress.correct}/{entry.wsProgress.total}{entry.wsProgress.done ? ' ✓' : ''}</span>
                              ) : null}
                              {organizerProgressLabel ? (
                                <span
                                  title={`Live ${activeOrganizer.structureType || 'visual organizer'} activity`}
                                  style={{whiteSpace:'nowrap',fontWeight:800,fontSize:'0.68rem',color:organizerProgress.status === 'complete'?'#15803d':organizerProgress.status === 'attempted'?'#9a3412':organizerProgress.status === 'failed'?'#b91c1c':organizerProgress.status === 'loading'?'#475569':'#3730a3',background:organizerProgress.status === 'complete'?'#dcfce7':organizerProgress.status === 'attempted'?'#ffedd5':organizerProgress.status === 'failed'?'#fee2e2':organizerProgress.status === 'loading'?'#f1f5f9':'#e0e7ff',border:'1px solid '+(organizerProgress.status === 'complete'?'#86efac':organizerProgress.status === 'attempted'?'#fdba74':organizerProgress.status === 'failed'?'#fca5a5':organizerProgress.status === 'loading'?'#cbd5e1':'#a5b4fc'),borderRadius:6,padding:'0.05rem 0.3rem'}}
                                >{organizerProgressLabel}</span>
                              ) : null}
                              {entry.wsProgress && wsAudioNeedsAttention ? (
                                <span style={{display:'inline-flex',alignItems:'center',gap:4}}>
                                <button
                                  type="button"
                                  disabled={wsAudioBusy}
                                  aria-label={t('word_sounds.audio_manage_for_student', { student: entry.name || 'student' }) || ('Manage Word Sounds audio for ' + (entry.name || 'student'))}
                                  title={wsAudioStatus === 'unsupported'
                                    ? (t('word_sounds.audio_teacher_unsupported_title') || "This learner's browser cannot play the prepared format. Open audio review and regenerate compatible clips.")
                                    : wsAudioStatus === 'blocked' && !wsAudioStalled
                                      ? (t('word_sounds.audio_teacher_blocked_title') || 'The learner must tap Try sound again on their device.')
                                      : (t('word_sounds.audio_teacher_resend_title') || 'Resend prepared audio to this learner, or open audio review if the source pack is incomplete.')}
                                  onClick={async () => {
                                    const resourceId = entry.viewingResourceId || entry.resourceId || sessionData?.currentResourceId || null;
                                    const resource = (generatedContent?.id === resourceId ? generatedContent : history.find(item => item && item.id === resourceId)) || null;
                                    if (!resource || resource.type !== 'word-sounds') {
                                      addToast(t('word_sounds.audio_open_resource_missing_toast') || 'Open the Word Sounds resource, then review its missing audio.', 'info');
                                      return;
                                    }
                                    const coverage = getWordSoundsPortableAudioCoverage(resource);
                                    if (coverage && coverage.complete && wsAudioStatus !== 'unsupported') {
                                      const resendAt = Date.now();
                                      await handleSetStudentResource(uid, resource.id, {
                                        allowIncompleteAudio: true,
                                        resourceAt: resendAt,
                                        wsProgress: { ...entry.wsProgress, audioStatus: 'resending', audioDeliveryAt: resendAt, at: resendAt },
                                      });
                                      return;
                                    }
                                    handleRestoreView(resource, { suppressLiveFollow: true });
                                    setTimeout(() => {
                                      setWordSoundsAutoReview(true);
                                      setIsWordSoundsMode(true);
                                      setActiveView('word-sounds');
                                    }, 0);
                                  }}
                                  style={{whiteSpace:'nowrap',fontWeight:800,fontSize:'0.68rem',color:wsAudioBusy?'#1d4ed8':'#9a3412',background:wsAudioBusy?'#dbeafe':'#ffedd5',border:'1px solid '+(wsAudioBusy?'#93c5fd':'#fdba74'),borderRadius:6,padding:'0.05rem 0.3rem',cursor:wsAudioBusy?'wait':'pointer'}}
                                >{wsAudioPrimaryLabel}</button>
                                {wsAudioStatus === 'damaged' ? (
                                  <button
                                    type="button"
                                    aria-label={t('word_sounds.audio_review_repair_aria', { student: entry.name || 'student' }) || ('Review and repair audio for ' + (entry.name || 'student'))}
                                    title={t('word_sounds.audio_review_repair_title') || 'Open the Word Sounds audio review to replace a persistently damaged clip.'}
                                    onClick={() => {
                                      const resourceId = entry.viewingResourceId || entry.resourceId || sessionData?.currentResourceId || null;
                                      const resource = (generatedContent?.id === resourceId ? generatedContent : history.find(item => item && item.id === resourceId)) || null;
                                      if (!resource || resource.type !== 'word-sounds') {
                                        addToast(t('word_sounds.audio_open_resource_review_toast') || 'Open the Word Sounds resource, then review its audio.', 'info');
                                        return;
                                      }
                                      handleRestoreView(resource, { suppressLiveFollow: true });
                                      setTimeout(() => {
                                        setWordSoundsAutoReview(true);
                                        setIsWordSoundsMode(true);
                                        setActiveView('word-sounds');
                                      }, 0);
                                    }}
                                    style={{whiteSpace:'nowrap',fontWeight:800,fontSize:'0.68rem',color:'#6d28d9',background:'#f5f3ff',border:'1px solid #c4b5fd',borderRadius:6,padding:'0.05rem 0.3rem',cursor:'pointer'}}
                                  >{t('word_sounds.audio_review') || 'Review audio'}</button>
                                ) : null}
                                </span>
                              ) : null}
                              {entry.wsProbeResult && entry.wsProbeResult.total ? (
                                <span
                                  title={(t('live_dock.ws_probe_title') || 'Word Sounds probe result (saved to records)') + (entry.wsProbeResult.activity ? ' · ' + entry.wsProbeResult.activity : '')}
                                  style={{whiteSpace:'nowrap',fontWeight:800,fontSize:'0.68rem',color:'#9a3412',background:'#ffedd5',border:'1px solid #fed7aa',borderRadius:6,padding:'0.05rem 0.3rem'}}
                                >📊 {entry.wsProbeResult.correct}/{entry.wsProbeResult.total}</span>
                              ) : null}
                              {entry.resourceId ? (
                                <button
                                  onClick={() => handleSetStudentResource(uid, null)}
                                  aria-label={(t('live_dock.clear_student_resource_aria') || 'Clear individual resource for') + ' ' + (entry.name || 'student')}
                                  title={t('live_dock.clear_student_resource') || 'Clear individual resource'}
                                  style={{background:'white',border:'1px solid #fca5a5',borderRadius:6,padding:'0.05rem 0.35rem',cursor:'pointer',fontSize:'0.68rem',fontWeight:700,color:'#b91c1c'}}
                                >✕</button>
                              ) : null}
                              <button
                                onClick={() => handleRecognizeStudent(uid)}
                                disabled={!canRecognizeStudent}
                                aria-label={'Recognize ' + (entry.name || 'student') + ' with ' + havenRewardAmount + ' AlloHaven token' + (havenRewardAmount === 1 ? '' : 's')}
                                title={canRecognizeStudent ? (rewardTokensRemaining + ' session recognition tokens remaining') : 'Session recognition is off or the selected amount would exceed this student’s cap'}
                                style={{background:canRecognizeStudent?'#166534':'#cbd5e1',color:canRecognizeStudent?'white':'#64748b',border:'none',borderRadius:6,padding:'0.05rem 0.38rem',cursor:canRecognizeStudent?'pointer':'not-allowed',fontSize:'0.72rem',fontWeight:800}}
                              >
                                <span aria-hidden="true">🌿</span>+{havenRewardAmount}
                              </button>
                              <button
                                onClick={() => canPushCurrent && handleSetStudentResource(uid, generatedContent.id)}
                                disabled={!canPushCurrent}
                                aria-label={(t('live_dock.push_student_resource_aria') || 'Send the current resource to') + ' ' + (entry.name || 'student')}
                                title={canPushCurrent ? (t('live_dock.push_student_resource') || 'Send current resource to this student') : (t('live_dock.push_student_resource_none') || 'Open a student-facing resource first')}
                                style={{background: canPushCurrent ? '#1e3a8a' : '#e2e8f0', color: canPushCurrent ? 'white' : '#94a3b8', border:'none', borderRadius:6, padding:'0.05rem 0.45rem', cursor: canPushCurrent ? 'pointer' : 'default', fontSize:'0.7rem', fontWeight:800}}
                              >→</button>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
                <div style={dockGroupLabel}>{(t('live_dock.group_signals') || 'Signals') + (activeSignals.length > 0 ? ' (' + activeSignals.length + ')' : '')}</div>
                {activeSignals.length === 0 ? (
                  <p style={{fontSize:'0.75rem',color:'#64748b',fontStyle:'italic',margin:'0 0 0.2rem 0'}}>{t('live_dock.no_signals') || 'No signals right now.'}</p>
                ) : (
                  <div style={{display:'flex',flexDirection:'column',gap:4}}>
                    {activeSignals.map(({ uid, entry }) => {
                      const meta = signalMeta(entry.signal);
                      return (
                        <div key={uid} style={{display:'flex',alignItems:'center',gap:6,padding:'0.35rem 0.5rem',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:8,fontSize:'0.78rem'}}>
                          <span aria-hidden="true">{meta.emoji}</span>
                          <span style={{fontWeight:700,color:'#0f172a'}}>{entry.name || 'Student'}</span>
                          <span style={{color:'#475569'}}>{t('live_signals.' + entry.signal) || meta.label}</span>
                          <button onClick={() => clearSignal(uid)} aria-label={(t('live_dock.clear_signal_aria') || 'Clear signal from') + ' ' + (entry.name || 'student')} style={{marginLeft:'auto',background:'white',border:'1px solid #e2e8f0',borderRadius:6,padding:'0.05rem 0.4rem',cursor:'pointer',fontSize:'0.7rem',fontWeight:700,color:'#475569'}}>✓</button>
                        </div>
                      );
                    })}
                    <button onClick={() => activeSignals.forEach(({ uid }) => clearSignal(uid))} style={{background:'none',border:'none',color:'#1d4ed8',cursor:'pointer',fontSize:'0.72rem',fontWeight:700,textAlign:'right',padding:'0.1rem 0'}}>
                      {t('live_dock.clear_all_signals') || 'Clear all'}
                    </button>
                  </div>
                )}
                <p style={{fontSize:'0.68rem',color:'#64748b',margin:'0.7rem 0 0 0',lineHeight:1.35}}>
                  {t('live_dock.privacy_note') || 'Privacy: Poll answers, feedback, drawings and guesses are not written to the live session. Quiz answer content travels peer-to-peer; a degraded connection records submission status only and leaves the answer unscored. Activity Pulse keeps status/count metadata in teacher memory only. Generating feedback sends the selected response without a codename to your configured AI provider. Signals share only a codename + a preset phrase.'}
                </p>
              </div>
  );
}
