// Auto-extracted cold-path view source. Edit this file, then rebuild its CDN module.

// Extracted from AlloFlowANTI.txt (canvas-recovery-dialog).
function CanvasRecoveryDialogView(props) {
  const { ALLO_WORKSPACE_RECOVERY, RefreshCw, _alloFormatWorkspaceBytes, alloModelStatus, approveAndRetryCanvasRecoveryStorage, canvasRecoveryBusyId, canvasRecoveryDecisionMade, canvasRecoveryDialogMode, canvasRecoveryDialogRef, canvasRecoveryEraseId, canvasRecoveryError, canvasRecoveryErrorCode, canvasRecoveryImportInputRef, canvasRecoveryRemoveMediaId, canvasRecoveryStore, canvasRecoveryStoreAuthoritative, canvasRecoveryVaultForm, canvasRecoveryVaultState, closeCanvasRecoveryDialog, continueWithoutCanvasRecovery, deleteCachedPdfRemediation, deleteCachedPdfRemediationEntry, downloadKokoroModel, downloadWhisperModel, eraseCanvasRecoverySnapshot, exportCanvasRecoverySnapshot, handleCanvasRecoveryImport, isCanvas, lastPdfAuditResultRef, openCachedPdfRemediation, openCanvasDocumentHubDraft, openCanvasRecoveryManager, pdfActiveRemediationStorageKey, pdfAuditResult, pdfFixResult, pdfRemediationCacheEntries, pdfRemediationDeleteConfirm, refreshStorageManagerInventory, removeCanvasRecoverySnapshotMedia, renderCanvasRecoveryLockedScreen, renderCanvasRecoveryProtectionSection, renderEducatorAccessCodeSection, requestCanvasRecoveryErase, restoreCachedPdfRemediation, restoreCanvasWorkspaceSnapshot, retryCanvasRecoveryStorage, setCanvasRecoveryDialogMode, setCanvasRecoveryEraseId, setCanvasRecoveryRemoveMediaId, setCanvasRecoverySnapshotPinned, setPdfRemediationDeleteConfirm, setStorageRetentionPolicy, startFreshCanvasWorkspace, storageManagerInventory, t } = props;
  return (
<div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/75 p-4"
          role="presentation">
          <div ref={canvasRecoveryDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="canvas-recovery-title"
            aria-describedby="canvas-recovery-description"
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-indigo-200 bg-white p-6 text-slate-800 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="mb-1 text-xs font-black uppercase tracking-[0.18em] text-indigo-600">{t('storage.panel_eyebrow') || 'Storage and recovery'}</p>
                <h2 id="canvas-recovery-title" className="text-2xl font-black text-slate-900">
                  {canvasRecoveryDialogMode === 'checking' ? 'Checking this device…'
                    : canvasRecoveryDialogMode === 'vault-locked' ? 'Unlock protected saved work'
                    : canvasRecoveryDialogMode === 'error' ? 'Device recovery needs attention'
                    : canvasRecoveryDialogMode === 'manage' ? 'Storage and recovery manager'
                    : 'Continue where you left off?'}
                </h2>
                <p id="canvas-recovery-description" className="mt-2 text-sm leading-relaxed text-slate-600">
                  {canvasRecoveryDialogMode === 'checking'
                    ? 'AlloFlow is securely checking this browser for earlier resource-pack work.'
                    : canvasRecoveryDialogMode === 'vault-locked'
                      ? 'Recovery-workspace contents are encrypted on this device. Unlock to restore or save protected work.'
                      : canvasRecoveryDialogMode === 'error'
                        ? 'No saved work will be overwritten unless AlloFlow can first read the device store.'
                        : canvasRecoveryDialogMode === 'manage'
                          ? 'Review approximate usage, choose a retention policy, and manage recoverable work kept by this browser.'
                          : 'AlloFlow found saved resource history and authoring state from an earlier Gemini Canvas session.'}
                </p>
              </div>
              {canvasRecoveryDecisionMade && canvasRecoveryVaultForm.mode !== 'confirm-recovery-code' && (
                <button type="button" onClick={() => closeCanvasRecoveryDialog(null)}
                  className="min-h-11 min-w-11 rounded-xl border border-slate-200 text-xl text-slate-600 hover:bg-slate-100"
                  aria-label={t('saved_work.close_aria') || 'Close saved work manager'}>×</button>
              )}
            </div>

            {canvasRecoveryDialogMode === 'checking' ? (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-6 text-center" role="status" aria-live="polite">
                <RefreshCw className="mx-auto mb-3 animate-spin text-indigo-700" size={30} aria-hidden="true" />
                <p className="font-bold text-slate-900">{t('storage.checking_title') || 'Checking saved work…'}</p>
                <p className="mt-2 text-sm text-slate-600">{t('storage.checking_canvas_note') || 'This can take a few seconds in Gemini Canvas.'}</p>
              </div>
            ) : canvasRecoveryDialogMode === 'vault-locked' ? (
              renderCanvasRecoveryLockedScreen()
            ) : canvasRecoveryDialogMode === 'error' ? (
              <div>
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
                  {canvasRecoveryError || 'Saved work could not be checked on this device.'}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button type="button" data-recovery-autofocus="true"
                    disabled={Boolean(canvasRecoveryBusyId)}
                    onClick={canvasRecoveryErrorCode === 'allo/approval-required'
                      ? () => void approveAndRetryCanvasRecoveryStorage()
                      : retryCanvasRecoveryStorage}
                    className="min-h-12 rounded-xl bg-indigo-700 px-4 py-3 font-black text-white hover:bg-indigo-800 disabled:opacity-60">
                    {canvasRecoveryBusyId === 'storage-retry' ? 'Checking…' : (canvasRecoveryErrorCode === 'allo/approval-required' ? 'Open device storage' : 'Retry device recovery')}
                  </button>
                  <button type="button" disabled={Boolean(canvasRecoveryBusyId)}
                    onClick={continueWithoutCanvasRecovery}
                    className="min-h-12 rounded-xl border-2 border-slate-300 px-4 py-3 font-black text-slate-800 hover:bg-slate-100 disabled:opacity-60">
                    {t('storage.work_without_recovery') || 'Work without device recovery'}
                  </button>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-slate-600">
                  {canvasRecoveryErrorCode === 'allo/approval-required'
                    ? 'Gemini Canvas requires a brief device-storage approval window. Continuing leaves unknown saved data untouched and recovery saving paused.'
                    : 'Continuing leaves unknown saved data untouched. AlloFlow will retry reading it before any later device write.'}
                </p>
              </div>
            ) : canvasRecoveryDialogMode === 'choice' ? (() => {
              const latest = canvasRecoveryStore.snapshots[0];
              if (!latest) return (
                <div>
                  <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">{t('storage.no_restorable') || 'No restorable workspace was found.'}</p>
                  <button type="button" data-recovery-autofocus="true" onClick={startFreshCanvasWorkspace}
                    className="mt-4 min-h-11 w-full rounded-xl bg-indigo-700 px-4 py-3 font-bold text-white hover:bg-indigo-800">
                    {t('storage.start_fresh') || 'Start a fresh workspace'}
                  </button>
                </div>
              );
              const choiceRetention = ALLO_WORKSPACE_RECOVERY.retentionStatus(canvasRecoveryStore);
              const savedDate = new Date(latest.savedAt);
              return (
                <>
                  <div className="mb-5 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                    <div className="font-black text-slate-900">{latest.title}</div>
                    <div className="mt-1 text-sm text-slate-600">
                      {latest.resourceCount} {latest.resourceCount === 1 ? 'resource' : 'resources'} · {t('storage.saved_label') || 'Saved'} {savedDate.toLocaleString()}
                    </div>
                    {latest.assetPolicy === 'text-only' && (
                      <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                        {t('storage.saved_summary') || 'Resource history and settings are saved.'} {t('storage.omitted_assets', { n: latest.omittedAssets || (t('storage.some') || 'Some') }) || ((latest.omittedAssets || 'Some') + ' media or draft asset(s) were omitted; export to review details.')}
                      </div>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button type="button" data-recovery-autofocus="true"
                      disabled={Boolean(canvasRecoveryBusyId)}
                      onClick={() => restoreCanvasWorkspaceSnapshot(latest)}
                      className="min-h-12 rounded-xl bg-indigo-700 px-4 py-3 font-black text-white hover:bg-indigo-800 disabled:opacity-60">
                      {canvasRecoveryBusyId === latest.id ? 'Restoring…' : 'Continue previous work'}
                    </button>
                    <button type="button" disabled={Boolean(canvasRecoveryBusyId)} onClick={startFreshCanvasWorkspace}
                      className="min-h-12 rounded-xl border-2 border-slate-300 px-4 py-3 font-black text-slate-800 hover:bg-slate-100">
                      {t('storage.start_fresh') || 'Start a fresh workspace'}
                    </button>
                    <button type="button" disabled={Boolean(canvasRecoveryBusyId)} onClick={openCanvasRecoveryManager}
                      className="min-h-12 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 font-bold text-indigo-800 hover:bg-indigo-100">
                      {t('storage.manage_saved', { n: canvasRecoveryStore.snapshots.length, max: choiceRetention.maxSnapshots }) || ('Manage saved work (' + canvasRecoveryStore.snapshots.length + ' of ' + choiceRetention.maxSnapshots + ')')}
                    </button>
                    <button type="button" disabled={Boolean(canvasRecoveryBusyId)}
                      onClick={() => canvasRecoveryImportInputRef.current?.click()}
                      className="min-h-12 rounded-xl border border-slate-300 px-4 py-3 text-center font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-60">
                      {t('storage.import_project') || 'Import project file'}
                    </button>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    {t('storage.retention_note', { max: choiceRetention.maxSnapshots, policy: choiceRetention.effectivePolicyId, used: _alloFormatWorkspaceBytes(ALLO_WORKSPACE_RECOVERY.totalBytes(canvasRecoveryStore)) })
                      || ('AlloFlow keeps up to ' + choiceRetention.maxSnapshots + ' recent device workspaces under the ' + choiceRetention.effectivePolicyId + ' policy (' + _alloFormatWorkspaceBytes(ALLO_WORKSPACE_RECOVERY.totalBytes(canvasRecoveryStore)) + ' used). Saving beyond that removes the oldest, so export anything you want to keep for good.')}
                  </p>
                  <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">
                    {canvasRecoveryVaultState.enabled
                      ? 'Shared computer? Protected workspace contents are unreadable after you lock this tab or reload. They remain visible while this tab is unlocked.'
                      : 'Shared computer? Saved work can be opened by another person using this browser profile. Enable optional protection or export and erase important work.'}
                  </p>
                </>
              );
            })() : (
              <>
                {renderCanvasRecoveryProtectionSection()}
                {renderEducatorAccessCodeSection()}
                {(() => {
                  const retention = ALLO_WORKSPACE_RECOVERY.retentionStatus(canvasRecoveryStore);
                  const policyOptions = [
                    {
                      id: 'automatic',
                      name: t('storage.preset_automatic') || 'Automatic',
                      detail: t('storage.preset_automatic_detail') || 'Uses Standard normally and Compact when reported storage is under pressure.'
                    },
                    {
                      id: 'compact',
                      name: t('storage.preset_compact') || 'Compact',
                      detail: t('storage.preset_compact_detail') || 'Targets 4 workspaces / 50 MB and 20 offline resources; old unpinned draft-only work may expire after 14 days.'
                    },
                    {
                      id: 'standard',
                      name: t('storage.preset_standard') || 'Standard',
                      detail: t('storage.preset_standard_detail') || 'Current behavior: targets 20 workspaces / 150 MB and 50 offline resources.'
                    }
                  ];
                  const origin = storageManagerInventory.origin || {};
                  const deviceFacts = storageManagerInventory.deviceEstimate;
                  const physicalFacts = isCanvas
                    ? (deviceFacts || { persisted: null, usage: null, quota: null })
                    : origin;
                  const persistence = physicalFacts.persisted;
                  return (
                    <>
                      <section aria-labelledby="storage-status-title" className="mb-5 rounded-2xl border border-slate-200 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 id="storage-status-title" className="font-black text-slate-900">{t('storage.status_title') || 'Storage status'}</h3>
                            <p className="mt-1 text-xs leading-relaxed text-slate-600">
                              {t('storage.status_note') || 'Browser totals are physical estimates. AlloFlow categories and Canvas namespaces are approximate breakdowns and are not added to that total.'}
                            </p>
                          </div>
                          <button type="button" disabled={storageManagerInventory.loading}
                            onClick={() => void refreshStorageManagerInventory()}
                            className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-60">
                            {storageManagerInventory.loading || alloModelStatus.loading ? 'Refreshing…' : 'Refresh status'}
                          </button>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <div className="rounded-xl bg-slate-50 p-3">
                            <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">{isCanvas ? 'Durable device total' : 'Browser-reported total'}</div>
                            <div className="mt-1 font-black text-slate-900">
                              {Number.isFinite(physicalFacts.usage)
                                ? _alloFormatWorkspaceBytes(physicalFacts.usage) + (Number.isFinite(physicalFacts.quota) && physicalFacts.quota > 0 ? ' of ' + _alloFormatWorkspaceBytes(physicalFacts.quota) : '')
                                : 'Unavailable'}
                            </div>
                          </div>
                          <div className="rounded-xl bg-slate-50 p-3">
                            <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">{t('storage.persistence_label') || 'Persistence'}</div>
                            <div className="mt-1 font-black text-slate-900">
                              {persistence === true ? 'Protected from automatic eviction'
                                : persistence === false ? 'Best effort'
                                : 'Status unavailable'}
                            </div>
                          </div>
                          <div className="rounded-xl bg-slate-50 p-3">
                            <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">{t('storage.recovery_workspaces_label') || 'Recovery workspaces'}</div>
                            <div className="mt-1 font-black text-slate-900">
                              {t('storage.recovery_target', { count: retention.count, max: retention.maxSnapshots, bytes: _alloFormatWorkspaceBytes(retention.bytes) }) || (retention.count + ' / ' + retention.maxSnapshots + ' target · ' + _alloFormatWorkspaceBytes(retention.bytes))}
                            </div>
                          </div>
                        </div>
                        <div className="mt-4">
                          <h4 className="text-sm font-black text-slate-900">{t('storage.speech_models_title') || 'On-device speech models'}</h4>
                          <p className="mt-1 text-xs text-slate-600">{t('storage.speech_models_note') || 'Downloaded once, then kept on this device so voice features work without sending audio anywhere. Removing browser data below also removes these.'}</p>
                          <div className="mt-2 divide-y divide-slate-200 rounded-xl border border-slate-200">
                            {[
                              { key: 'whisper', label: t('storage.model_whisper_label') || 'Speech recognition (Whisper)', desc: t('storage.model_whisper_desc') || 'Understands what you say, on this device', have: alloModelStatus.whisper, size: '~40 MB', onGet: downloadWhisperModel },
                              { key: 'kokoro', label: t('storage.model_kokoro_label') || 'Natural voice (Kokoro)', desc: t('storage.model_kokoro_desc') || 'Reads text aloud in a natural voice', have: alloModelStatus.kokoro, size: '~88 MB', onGet: downloadKokoroModel }
                            ].map(m => (
                              <div key={m.key} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                                <span className="min-w-0">
                                  <span className="font-semibold text-slate-700">{m.label}</span>
                                  <span className="block text-xs font-normal text-slate-500">{m.desc}</span>
                                </span>
                                {m.have ? (
                                  <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-800">{'✓ '}{t('storage.model_on_device') || 'On this device'}</span>
                                ) : (
                                  <button type="button" onClick={m.onGet} disabled={!!alloModelStatus.busy}
                                    className="shrink-0 rounded-md border border-indigo-300 bg-white px-2 py-1 text-xs font-black text-indigo-800 disabled:opacity-50">
                                    {alloModelStatus.busy === m.key
                                      ? (t('storage.model_downloading') || 'Downloading…')
                                      : ((t('storage.model_download', { size: m.size }) || ('Download ' + m.size)))}
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                          {alloModelStatus.bytes > 0 && (
                            <p className="mt-1 text-[11px] text-slate-500">{t('storage.model_cache', { size: _alloFormatWorkspaceBytes(alloModelStatus.bytes) }) || ('Model cache on this device: ~' + _alloFormatWorkspaceBytes(alloModelStatus.bytes))}</p>
                          )}
                        </div>
                        {storageManagerInventory.managed.length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-sm font-black text-slate-900">{t('storage.managed_data_title') || 'AlloFlow-managed browser data'}</h4>
                            <div className="mt-2 divide-y divide-slate-200 rounded-xl border border-slate-200">
                              {storageManagerInventory.managed.map(row => (
                                <div key={row.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                                  <span className="font-semibold text-slate-700">{row.label} <span className="text-xs font-normal text-slate-500">({row.count})</span></span>
                                  <span className="font-bold text-slate-900">~{_alloFormatWorkspaceBytes(row.approximateBytes)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {isCanvas && storageManagerInventory.deviceNamespaces.length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-sm font-black text-slate-900">{t('storage.canvas_namespaces_title') || 'Canvas durable-device namespaces'}</h4>
                            <div className="mt-2 divide-y divide-slate-200 rounded-xl border border-slate-200">
                              {storageManagerInventory.deviceNamespaces.map(row => (
                                <div key={row.ns} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                                  <span className="font-semibold text-slate-700">{row.ns} <span className="text-xs font-normal text-slate-500">({row.count})</span></span>
                                  <span className="font-bold text-slate-900">~{_alloFormatWorkspaceBytes(row.bytes)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {storageManagerInventory.error && (
                          <p role="status" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs font-semibold text-amber-900">
                            {storageManagerInventory.error}
                          </p>
                        )}
                      </section>

                      <section aria-labelledby="storage-policy-title" className="mb-5 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                        <h3 id="storage-policy-title" className="font-black text-slate-900">{t('storage.retention_title') || 'Retention policy'}</h3>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">
                          {t('storage.retention_intro') || 'Choose a tested policy instead of a manual MB limit. Pinned work and the newest workspace are never automatically removed.'}
                        </p>
                        <div className="mt-3 grid gap-2">
                          {policyOptions.map(option => {
                            const selected = retention.policyId === option.id;
                            return (
                              <button key={option.id} type="button" aria-pressed={selected}
                                disabled={Boolean(canvasRecoveryBusyId)}
                                onClick={() => void setStorageRetentionPolicy(option.id)}
                                className={'min-h-11 rounded-xl border px-3 py-3 text-left disabled:opacity-60 ' +
                                  (selected ? 'border-indigo-600 bg-white ring-2 ring-indigo-200' : 'border-indigo-200 bg-indigo-50 hover:bg-white')}>
                                <span className="block font-black text-slate-900">
                                  {option.name}{selected && option.id === 'automatic' ? (t('storage.retention_currently', { policy: retention.effectivePolicyId }) || (' (currently ' + retention.effectivePolicyId + ')')) : ''}
                                </span>
                                <span className="mt-1 block text-xs leading-relaxed text-slate-600">{option.detail}</span>
                              </button>
                            );
                          })}
                        </div>
                        {retention.overTarget && (
                          <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs font-semibold text-amber-950">
                            {t('storage.retention_over_target') || 'Protected work exceeds this policy target. Pinned work and the newest workspace are being kept; unpin, remove embedded media, export, or erase items to reclaim space.'}
                          </p>
                        )}
                      </section>
                    </>
                  );
                })()}
                  {isCanvas && !canvasRecoveryStoreAuthoritative && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                      <p className="text-sm font-semibold text-red-800">{t('storage.not_reread') || 'Saved work has not been safely re-read yet.'}</p>
                      <button type="button" disabled={Boolean(canvasRecoveryBusyId)} onClick={retryCanvasRecoveryStorage}
                        className="mt-2 min-h-11 rounded-lg bg-indigo-700 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-800 disabled:opacity-60">
                        {canvasRecoveryBusyId === 'storage-retry' ? (t('storage.checking_short') || 'Checking…') : (t('storage.retry_device_storage') || 'Retry device storage')}
                      </button>
                    </div>
                  )}
                {/* Unified inventory over content that was already retained: remediation
                    cache entries live in localStorage; Document Hub drafts live inside the
                    recovery workspaces below. This view does not broaden automatic retention. */}
                {!pdfAuditResult && (
                  pdfRemediationCacheEntries.length > 0
                  || pdfFixResult
                  || lastPdfAuditResultRef.current
                  || canvasRecoveryStore.snapshots.some(snapshot => snapshot?.workspace?.builderDraft)
                ) && (
                  <section aria-labelledby="storage-local-documents-title" className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 id="storage-local-documents-title" className="font-black text-slate-900">{t('storage.local_documents_title') || 'Local documents'}</h3>
                        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-700">
                          {t('storage.local_documents_hint') || 'Accessibility remediations can be resumed independently below. Document Hub drafts are marked in their saved workspaces and can be opened directly. Nothing new is retained merely by viewing this list.'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wide">
                        {(pdfRemediationCacheEntries.length > 0 || pdfFixResult || lastPdfAuditResultRef.current) && (
                          <span className="rounded-full bg-emerald-200 px-2.5 py-1 text-emerald-950">{pdfRemediationCacheEntries.length || 1} remediation{(pdfRemediationCacheEntries.length || 1) === 1 ? '' : 's'}</span>
                        )}
                        {canvasRecoveryStore.snapshots.some(snapshot => snapshot?.workspace?.builderDraft) && (
                          <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-indigo-900">
                            {canvasRecoveryStore.snapshots.filter(snapshot => snapshot?.workspace?.builderDraft).length} Document Hub draft{canvasRecoveryStore.snapshots.filter(snapshot => snapshot?.workspace?.builderDraft).length === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      {pdfRemediationCacheEntries.map(entry => {
                        const isActive = entry.storageKey === pdfActiveRemediationStorageKey && Boolean(pdfFixResult || lastPdfAuditResultRef.current);
                        return (
                          <article key={entry.storageKey} className="rounded-xl border border-emerald-200 bg-white p-3">
                            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="break-words text-sm font-black text-slate-900">{entry.documentName}</h4>
                                  {isActive && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-900">Current</span>}
                                </div>
                                <p className="mt-1 text-xs text-slate-600">
                                  {entry.savedAt ? new Date(entry.savedAt).toLocaleString() : 'Saved on this device'}
                                  {entry.pageCount ? ` · ${entry.pageCount} page${entry.pageCount === 1 ? '' : 's'}` : ''}
                                  {entry.approximateBytes > 0 ? ' · ~' + _alloFormatWorkspaceBytes(entry.approximateBytes) : ''}
                                </p>
                                <p className="mt-1 text-xs font-semibold text-emerald-900">
                                  {Number.isFinite(entry.beforeScore) ? `Audit ${entry.beforeScore}/100` : 'Audit score unavailable'}
                                  {Number.isFinite(entry.afterScore) ? ` → remediation ${entry.afterScore}/100` : ' · verification required'}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <button type="button" onClick={() => {
                                  if (isActive) openCachedPdfRemediation(true);
                                  else void restoreCachedPdfRemediation(entry.storageKey, true);
                                }} className="min-h-11 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-800">
                                  {t('storage.remediation_open') || 'Resume'}
                                </button>
                                {pdfRemediationDeleteConfirm === entry.storageKey ? (
                                  <>
                                    <button type="button" onClick={() => deleteCachedPdfRemediationEntry(entry.storageKey)}
                                      className="min-h-11 rounded-lg bg-red-700 px-3 py-2 text-sm font-black text-white hover:bg-red-800">
                                      {t('storage.remediation_delete_confirm_one') || 'Confirm delete'}
                                    </button>
                                    <button type="button" onClick={() => setPdfRemediationDeleteConfirm(null)}
                                      className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 hover:bg-slate-100">
                                      {t('common.cancel') || 'Cancel'}
                                    </button>
                                  </>
                                ) : (
                                  <button type="button" onClick={() => setPdfRemediationDeleteConfirm(entry.storageKey)}
                                    className="min-h-11 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-bold text-red-800 hover:bg-red-50">
                                    {t('storage.remediation_delete') || 'Delete'}
                                  </button>
                                )}
                              </div>
                            </div>
                            {pdfRemediationDeleteConfirm === entry.storageKey && (
                              <p role="alert" className="mt-2 text-xs font-semibold text-red-800">Delete this remediation from this device? Exported files and other local documents will not be affected.</p>
                            )}
                          </article>
                        );
                      })}
                      {pdfRemediationCacheEntries.length === 0 && (pdfFixResult || lastPdfAuditResultRef.current) && (
                        <div className="rounded-xl border border-emerald-200 bg-white p-3">
                          <p className="text-sm font-black text-slate-900">Current remediation</p>
                          <p className="mt-1 text-xs text-slate-600">Available in this session; device-cache storage may be unavailable or still updating.</p>
                          <button type="button" onClick={() => openCachedPdfRemediation(true)} className="mt-2 min-h-11 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-800">Resume</button>
                        </div>
                      )}
                      {pdfRemediationCacheEntries.length === 0 && !pdfFixResult && !lastPdfAuditResultRef.current && canvasRecoveryStore.snapshots.some(snapshot => snapshot?.workspace?.builderDraft) && (
                        <div className="rounded-xl border border-indigo-200 bg-white p-3 text-xs leading-relaxed text-slate-700">
                          Document Hub drafts are stored with their saved workspaces below. Choose <strong>Open document</strong> to restore that workspace and continue editing its draft.
                        </div>
                      )}
                    </div>
                    {pdfRemediationCacheEntries.length > 1 && pdfRemediationDeleteConfirm !== 'all' && (
                      <button type="button" onClick={() => setPdfRemediationDeleteConfirm('all')}
                        className="mt-3 min-h-11 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-bold text-red-800 hover:bg-red-50">
                        {t('storage.remediation_delete_all') || 'Delete all remediations'}
                      </button>
                    )}
                    {pdfRemediationDeleteConfirm === 'all' && (
                      <div role="alert" className="mt-3 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-950">
                        <p className="font-semibold">{t('storage.remediation_delete_warning') || 'Delete every locally cached remediation and clear the current remediation result? Document Hub drafts, workspaces, and exported files will not be affected.'}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button type="button" onClick={deleteCachedPdfRemediation} className="min-h-11 rounded-lg bg-red-700 px-3 py-2 text-sm font-black text-white hover:bg-red-800">Delete all remediations</button>
                          <button type="button" onClick={() => setPdfRemediationDeleteConfirm(null)} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 hover:bg-slate-100">{t('common.cancel') || 'Cancel'}</button>
                        </div>
                      </div>
                    )}
                  </section>
                )}
                {canvasRecoveryStore.snapshots.length > 0 && (() => {
                  const retention = ALLO_WORKSPACE_RECOVERY.retentionStatus(canvasRecoveryStore);
                  return (
                    <p className="mb-3 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-700">
                      Using <strong>{_alloFormatWorkspaceBytes(retention.bytes)}</strong> across {retention.count} saved
                      {retention.count === 1 ? ' workspace' : ' workspaces'}; {retention.pinnedCount} pinned.
                      The {retention.effectivePolicyId} target is {retention.maxSnapshots} workspaces / {_alloFormatWorkspaceBytes(retention.maxTotalBytes)}.
                      Oldest unpinned work is removed first.
                    </p>
                  );
                })()}
                <div className="space-y-3">
                  {canvasRecoveryStore.snapshots.length === 0 && (
                    <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">No saved work remains on this device.</p>
                  )}
                  {canvasRecoveryStore.snapshots.map((snapshot, index) => (
                    <div key={snapshot.id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 font-black text-slate-900">
                            <span>{snapshot.title}</span>
                            {snapshot.pinned && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-indigo-800">Pinned</span>}
                            {snapshot.resourceCount === 0 && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-700">Draft only</span>}
                            {snapshot?.workspace?.builderDraft && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-violet-900">Document Hub draft</span>}
                          </div>
                          <div className="mt-1 text-xs text-slate-600">
                            {snapshot.resourceCount} {snapshot.resourceCount === 1 ? 'resource' : 'resources'} · {new Date(snapshot.savedAt).toLocaleString()}
                            {snapshot.approximateBytes > 0 && (' · ' + _alloFormatWorkspaceBytes(snapshot.approximateBytes))}
                          </div>
                          <div className={'mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ' + (snapshot.assetPolicy === 'full' ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900')}>
                            {snapshot.assetPolicy === 'full' ? 'Resource pack saved with supported media' : 'Resource history and settings saved; omissions recorded'}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {snapshot?.workspace?.builderDraft && (
                            <button type="button" data-recovery-autofocus={index === 0 ? 'true' : undefined}
                              disabled={Boolean(canvasRecoveryBusyId)}
                              onClick={() => void openCanvasDocumentHubDraft(snapshot)}
                              className="min-h-11 rounded-lg bg-violet-700 px-3 py-2 text-sm font-bold text-white hover:bg-violet-800 disabled:opacity-60">
                              Open document
                            </button>
                          )}
                          <button type="button" data-recovery-autofocus={index === 0 && !snapshot?.workspace?.builderDraft ? 'true' : undefined}
                            disabled={Boolean(canvasRecoveryBusyId)}
                            onClick={() => restoreCanvasWorkspaceSnapshot(snapshot)}
                            className="min-h-11 rounded-lg bg-indigo-700 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-800 disabled:opacity-60">
                            Restore
                          </button>
                          <button type="button" aria-pressed={snapshot.pinned === true}
                            disabled={Boolean(canvasRecoveryBusyId)}
                            onClick={() => void setCanvasRecoverySnapshotPinned(snapshot.id, !snapshot.pinned)}
                            className="min-h-11 rounded-lg border border-indigo-300 px-3 py-2 text-sm font-bold text-indigo-800 hover:bg-indigo-50 disabled:opacity-60">
                            {snapshot.pinned ? 'Unpin' : 'Pin'}
                          </button>
                          {canvasRecoveryRemoveMediaId === snapshot.id ? (
                            <>
                              <button type="button" disabled={Boolean(canvasRecoveryBusyId)}
                                onClick={() => void removeCanvasRecoverySnapshotMedia(snapshot.id)}
                                className="min-h-11 rounded-lg bg-amber-600 px-3 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-60">
                                Confirm remove media
                              </button>
                              <button type="button" disabled={Boolean(canvasRecoveryBusyId)}
                                onClick={() => setCanvasRecoveryRemoveMediaId(null)}
                                className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button type="button" disabled={Boolean(canvasRecoveryBusyId)}
                              onClick={() => { setCanvasRecoveryEraseId(null); setCanvasRecoveryRemoveMediaId(snapshot.id); }}
                              className="min-h-11 rounded-lg border border-amber-300 px-3 py-2 text-sm font-bold text-amber-800 hover:bg-amber-50">
                              Remove embedded media
                            </button>
                          )}
                          <button type="button" onClick={() => exportCanvasRecoverySnapshot(snapshot)}
                            className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">
                            {canvasRecoveryVaultState.enabled ? 'Export readable copy' : 'Export'}
                          </button>
                          {canvasRecoveryEraseId === snapshot.id ? (
                            <>
                              <button type="button" data-recovery-confirm={snapshot.id}
                                disabled={Boolean(canvasRecoveryBusyId)}
                                onClick={() => eraseCanvasRecoverySnapshot(snapshot.id)}
                                className="min-h-11 rounded-lg bg-red-700 px-3 py-2 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-60">
                                Confirm erase
                              </button>
                              <button type="button" disabled={Boolean(canvasRecoveryBusyId)} onClick={() => setCanvasRecoveryEraseId(null)}
                                className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button type="button" disabled={Boolean(canvasRecoveryBusyId)}
                              onClick={() => requestCanvasRecoveryErase(snapshot.id)}
                              className="min-h-11 rounded-lg border border-red-300 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50">
                              Erase workspace
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  {!canvasRecoveryDecisionMade ? (
                    <button type="button" onClick={() => setCanvasRecoveryDialogMode('choice')}
                      className="min-h-11 flex-1 rounded-xl border border-slate-300 px-4 py-3 font-bold text-slate-700 hover:bg-slate-100">
                      Back
                    </button>
                  ) : (
                    <button type="button" onClick={() => closeCanvasRecoveryDialog(null)}
                      className="min-h-11 flex-1 rounded-xl border border-slate-300 px-4 py-3 font-bold text-slate-700 hover:bg-slate-100">
                      Close
                    </button>
                  )}
                  {isCanvas && (
                  <button type="button" disabled={Boolean(canvasRecoveryBusyId)}
                    onClick={() => canvasRecoveryImportInputRef.current?.click()}
                    className="min-h-11 flex-1 rounded-xl bg-indigo-50 px-4 py-3 text-center font-bold text-indigo-800 hover:bg-indigo-100 disabled:opacity-60">
                    Import project file
                  </button>
                  )}
                </div>
              </>
            )}
            {isCanvas && (
            <input ref={canvasRecoveryImportInputRef} type="file" accept=".json,application/json"
              className="hidden" tabIndex={-1} aria-hidden="true" onChange={handleCanvasRecoveryImport} />
            )}
            {canvasRecoveryError && canvasRecoveryDialogMode !== 'error' && (
              <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
                {canvasRecoveryError}
              </p>
            )}
          </div>
        </div>
  );
}
