/** Auto-generated first-wave cold-path CDN module. */
(function() {
'use strict';
if (typeof window === 'undefined') return;
var React = window.React;
if (!React) { console.error('[CanvasRecoveryDialogView] React not found on window'); return; }
window.AlloModules = window.AlloModules || {};
if (window.AlloModules.CanvasRecoveryDialogView) return;
// Auto-extracted cold-path view source. Edit this file, then rebuild its CDN module.

// Extracted from AlloFlowANTI.txt (canvas-recovery-dialog).
function CanvasRecoveryDialogView(props) {
  const {
    ALLO_WORKSPACE_RECOVERY,
    RefreshCw,
    _alloFormatWorkspaceBytes,
    alloModelStatus,
    approveAndRetryCanvasRecoveryStorage,
    canvasRecoveryBusyId,
    canvasRecoveryDecisionMade,
    canvasRecoveryDialogMode,
    canvasRecoveryDialogRef,
    canvasRecoveryEraseId,
    canvasRecoveryError,
    canvasRecoveryErrorCode,
    canvasRecoveryImportInputRef,
    canvasRecoveryRemoveMediaId,
    canvasRecoveryStore,
    canvasRecoveryStoreAuthoritative,
    canvasRecoveryVaultForm,
    canvasRecoveryVaultState,
    closeCanvasRecoveryDialog,
    continueWithoutCanvasRecovery,
    deleteCachedPdfRemediation,
    deleteCachedPdfRemediationEntry,
    deleteDictionaryCache,
    dictionaryCacheSummary,
    downloadKokoroModel,
    downloadWhisperModel,
    eraseCanvasRecoverySnapshot,
    exportCanvasRecoverySnapshot,
    handleCanvasRecoveryImport,
    isCanvas,
    lastPdfAuditResultRef,
    openCachedPdfRemediation,
    openCanvasDocumentHubDraft,
    openCanvasRecoveryManager,
    pdfActiveRemediationStorageKey,
    pdfAuditResult,
    pdfFixResult,
    pdfRemediationCacheEntries,
    pdfRemediationDeleteConfirm,
    refreshStorageManagerInventory,
    removeCanvasRecoverySnapshotMedia,
    renderCanvasRecoveryLockedScreen,
    renderCanvasRecoveryProtectionSection,
    renderEducatorAccessCodeSection,
    requestCanvasRecoveryErase,
    restoreCachedPdfRemediation,
    restoreCanvasWorkspaceSnapshot,
    retryCanvasRecoveryStorage,
    setCanvasRecoveryDialogMode,
    setCanvasRecoveryEraseId,
    setCanvasRecoveryRemoveMediaId,
    setCanvasRecoverySnapshotPinned,
    setPdfRemediationDeleteConfirm,
    setStorageRetentionPolicy,
    startFreshCanvasWorkspace,
    storageManagerInventory,
    t
  } = props;
  // A Deny is remembered for the visit, so a plain retry can no longer ask; offer the approval window.
  const needsStorageApproval = canvasRecoveryErrorCode === 'allo/approval-required' || canvasRecoveryErrorCode === 'allo/approval-denied' || canvasRecoveryErrorCode === 'allo/consent-timeout';
  const _crCopy = (key, fallback) => {
    try {
      const value = typeof t === 'function' ? t(key) : '';
      return value && value !== key ? value : fallback;
    } catch (_) {
      return fallback;
    }
  };
  const _formatSavedDate = (value, fallback) => {
    if (value == null || value === '') return fallback || '';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? fallback || '' : d.toLocaleString();
  };
  const safeRecoverySnapshots = Array.isArray(canvasRecoveryStore?.snapshots) ? canvasRecoveryStore.snapshots : [];
  const safeStorageInventory = storageManagerInventory && typeof storageManagerInventory === 'object' ? storageManagerInventory : {};
  const safeManagedRows = Array.isArray(safeStorageInventory.managed) ? safeStorageInventory.managed : [];
  const safeDeviceNamespaces = Array.isArray(safeStorageInventory.deviceNamespaces) ? safeStorageInventory.deviceNamespaces : [];
  const safePdfCacheEntries = Array.isArray(pdfRemediationCacheEntries) ? pdfRemediationCacheEntries : [];
  const safeModelStatus = alloModelStatus && typeof alloModelStatus === 'object' ? alloModelStatus : {};
  const safeVaultState = canvasRecoveryVaultState && typeof canvasRecoveryVaultState === 'object' ? canvasRecoveryVaultState : {};
  const safeLastPdfAudit = lastPdfAuditResultRef ? lastPdfAuditResultRef.current : null;
  const fallbackRecoveryRef = React.useRef(null);
  const activeRecoveryDialogRef = canvasRecoveryDialogRef || fallbackRecoveryRef;
  const [snapshotQuery, setSnapshotQuery] = React.useState('');
  const [snapshotFilter, setSnapshotFilter] = React.useState('all');
  const [dictionaryDeleteConfirm, setDictionaryDeleteConfirm] = React.useState(false);
  const dictionaryCache = dictionaryCacheSummary && dictionaryCacheSummary.count > 0 ? dictionaryCacheSummary : null;
  React.useEffect(() => {
    if (!dictionaryCache) setDictionaryDeleteConfirm(false);
  }, [Boolean(dictionaryCache)]);
  const _focusRing = 'transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2';
  const recoveryStateRef = React.useRef({
    canvasRecoveryDecisionMade,
    vaultMode: canvasRecoveryVaultForm?.mode,
    canvasRecoveryBusyId,
    closeCanvasRecoveryDialog,
    canvasRecoveryEraseId,
    canvasRecoveryRemoveMediaId,
    pdfRemediationDeleteConfirm,
    setCanvasRecoveryEraseId,
    setCanvasRecoveryRemoveMediaId,
    setPdfRemediationDeleteConfirm,
    snapshotQuery,
    setSnapshotQuery,
    dictionaryDeleteConfirm
  });
  recoveryStateRef.current = {
    canvasRecoveryDecisionMade,
    vaultMode: canvasRecoveryVaultForm?.mode,
    canvasRecoveryBusyId,
    closeCanvasRecoveryDialog,
    canvasRecoveryEraseId,
    canvasRecoveryRemoveMediaId,
    pdfRemediationDeleteConfirm,
    setCanvasRecoveryEraseId,
    setCanvasRecoveryRemoveMediaId,
    setPdfRemediationDeleteConfirm,
    snapshotQuery,
    setSnapshotQuery,
    dictionaryDeleteConfirm
  };
  React.useEffect(() => {
    const dialog = activeRecoveryDialogRef && activeRecoveryDialogRef.current;
    if (!dialog || typeof document === 'undefined') return undefined;
    const trap = {
      root: dialog
    };
    const stack = typeof window !== 'undefined' ? window.__alloFocusTrapStack = window.__alloFocusTrapStack || [] : null;
    const prevFocus = document.activeElement;
    if (stack) stack.push(trap);
    const isTopTrap = () => !stack || stack[stack.length - 1] === trap;
    const isolated = [];
    const seenSiblings = new Set();
    let cursor = dialog;
    while (cursor && cursor.parentElement) {
      const parent = cursor.parentElement;
      Array.from(parent.children).forEach(sibling => {
        if (!sibling || sibling === cursor || seenSiblings.has(sibling) || !sibling.tagName || /^(SCRIPT|STYLE|LINK|TEMPLATE)$/i.test(sibling.tagName) || typeof sibling.matches === 'function' && sibling.matches('[aria-live], [role="status"], [role="alert"], [data-toast-region], [data-allo-consent-frame]')) return;
        seenSiblings.add(sibling);
        isolated.push({
          sibling,
          hadInert: sibling.hasAttribute('inert'),
          prevInert: sibling.inert,
          ariaHidden: sibling.getAttribute('aria-hidden')
        });
        try {
          sibling.inert = true;
        } catch (_) {}
        try {
          sibling.setAttribute('inert', '');
        } catch (_) {}
        try {
          sibling.setAttribute('aria-hidden', 'true');
        } catch (_) {}
      });
      if (parent === document.body) break;
      cursor = parent;
    }
    const body = document.body;
    const scrollLock = typeof window !== 'undefined' ? window.__alloScrollLockState || (window.__alloScrollLockState = {
      count: 0,
      prev: ''
    }) : null;
    let scrollLocked = false;
    try {
      if (body && scrollLock) {
        scrollLocked = true;
        if (++scrollLock.count === 1) {
          scrollLock.prev = body.style.overflow;
          body.style.overflow = 'hidden';
        }
      }
    } catch (_) {}
    const hadTabIndex = dialog.hasAttribute('tabindex');
    if (!hadTabIndex) dialog.setAttribute('tabindex', '-1');
    const getFocusable = () => Array.from(dialog.querySelectorAll('a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), summary, [tabindex]:not([tabindex="-1"])')).filter(el => {
      if (el.disabled || el.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
      let ancestor = el.parentElement;
      while (ancestor && ancestor !== dialog) {
        if (ancestor.matches && ancestor.matches('details:not([open])')) {
          const directSummary = ancestor.querySelector(':scope > summary');
          if (el !== directSummary) return false;
        }
        if (typeof window.getComputedStyle === 'function') {
          const aStyle = window.getComputedStyle(ancestor);
          if (aStyle && (aStyle.display === 'none' || aStyle.visibility === 'hidden')) return false;
        }
        ancestor = ancestor.parentElement;
      }
      const st = typeof window.getComputedStyle === 'function' ? window.getComputedStyle(el) : null;
      return !st || st.display !== 'none' && st.visibility !== 'hidden';
    });
    if (!dialog.contains(document.activeElement)) {
      try {
        (getFocusable()[0] || dialog).focus({
          preventScroll: true
        });
      } catch (_) {}
    }
    const onKeyDown = event => {
      if (event.defaultPrevented) return;
      if (!dialog.isConnected || !isTopTrap()) return;
      if (event.key === 'Escape') {
        if (event.isComposing || event.nativeEvent?.isComposing || event.keyCode === 229 || event.altKey || event.ctrlKey || event.metaKey) return;
        const latest = recoveryStateRef.current;
        if (latest.canvasRecoveryEraseId && typeof latest.setCanvasRecoveryEraseId === 'function') {
          event.preventDefault();
          event.stopPropagation();
          latest.setCanvasRecoveryEraseId(null);
          return;
        }
        if (latest.canvasRecoveryRemoveMediaId && typeof latest.setCanvasRecoveryRemoveMediaId === 'function') {
          event.preventDefault();
          event.stopPropagation();
          latest.setCanvasRecoveryRemoveMediaId(null);
          return;
        }
        if (latest.pdfRemediationDeleteConfirm && typeof latest.setPdfRemediationDeleteConfirm === 'function') {
          event.preventDefault();
          event.stopPropagation();
          latest.setPdfRemediationDeleteConfirm(null);
          return;
        }
        if (latest.dictionaryDeleteConfirm) {
          event.preventDefault();
          event.stopPropagation();
          setDictionaryDeleteConfirm(false);
          return;
        }
        if (latest.snapshotQuery && typeof latest.setSnapshotQuery === 'function') {
          event.preventDefault();
          event.stopPropagation();
          latest.setSnapshotQuery('');
          return;
        }
        if (latest.canvasRecoveryDecisionMade && latest.vaultMode !== 'confirm-recovery-code' && !latest.canvasRecoveryBusyId && typeof latest.closeCanvasRecoveryDialog === 'function') {
          event.preventDefault();
          event.stopPropagation();
          latest.closeCanvasRecoveryDialog();
        }
        return;
      }
      if (event.key !== 'Tab') return;
      const items = getFocusable();
      if (!items.length) {
        event.preventDefault();
        try {
          dialog.focus({
            preventScroll: true
          });
        } catch (_) {}
        return;
      }
      const first = items[0],
        last = items[items.length - 1];
      if (!dialog.contains(document.activeElement) || document.activeElement === dialog) {
        event.preventDefault();
        try {
          (event.shiftKey ? last : first).focus({
            preventScroll: true
          });
        } catch (_) {}
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        try {
          last.focus({
            preventScroll: true
          });
        } catch (_) {}
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        try {
          first.focus({
            preventScroll: true
          });
        } catch (_) {}
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      try {
        if (scrollLocked && body && scrollLock) {
          scrollLock.count = Math.max(0, scrollLock.count - 1);
          if (scrollLock.count === 0) body.style.overflow = scrollLock.prev;
        }
      } catch (_) {}
      isolated.forEach(({
        sibling,
        hadInert,
        prevInert,
        ariaHidden
      }) => {
        if (!sibling || !sibling.isConnected) return;
        if (!hadInert) {
          try {
            sibling.inert = false;
          } catch (_) {}
          try {
            sibling.removeAttribute('inert');
          } catch (_) {}
        } else {
          /* already inert when this dialog opened: leave it as it is now */
        }
        if (ariaHidden == null) {
          try {
            sibling.removeAttribute('aria-hidden');
          } catch (_) {}
        } else {
          try {
            if (ariaHidden !== 'true') sibling.setAttribute('aria-hidden', ariaHidden);
          } catch (_) {}
        }
      });
      if (!hadTabIndex) dialog.removeAttribute('tabindex');
      const wasTopTrap = isTopTrap();
      if (stack) {
        const idx = stack.lastIndexOf(trap);
        if (idx >= 0) stack.splice(idx, 1);
      }
      if (wasTopTrap && prevFocus && prevFocus !== document.body && prevFocus !== document.documentElement && prevFocus.isConnected && typeof prevFocus.focus === 'function') {
        try {
          prevFocus.focus({
            preventScroll: true
          });
        } catch (_) {}
      }
    };
  }, [activeRecoveryDialogRef]);
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/75 p-4",
    role: "presentation"
  }, /*#__PURE__*/React.createElement("div", {
    ref: activeRecoveryDialogRef,
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "canvas-recovery-title",
    "aria-describedby": "canvas-recovery-description",
    className: "allo-docsuite w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-indigo-200 bg-white p-6 text-slate-800 shadow-2xl"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-5 flex items-start justify-between gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "mb-1 text-xs font-black uppercase tracking-[0.18em] text-indigo-600"
  }, t('storage.panel_eyebrow') || 'Storage and recovery'), /*#__PURE__*/React.createElement("h2", {
    id: "canvas-recovery-title",
    className: "text-2xl font-black text-slate-900"
  }, canvasRecoveryDialogMode === 'checking' ? _crCopy('canvas_recovery.title_checking', 'Checking this device…') : canvasRecoveryDialogMode === 'vault-locked' ? _crCopy('canvas_recovery.title_vault_locked', 'Unlock protected saved work') : canvasRecoveryDialogMode === 'error' ? _crCopy('canvas_recovery.title_error', 'Device recovery needs attention') : canvasRecoveryDialogMode === 'manage' ? _crCopy('canvas_recovery.title_manage', 'Storage and recovery manager') : _crCopy('canvas_recovery.title_default', 'Continue where you left off?')), /*#__PURE__*/React.createElement("p", {
    id: "canvas-recovery-description",
    className: "mt-2 text-sm leading-relaxed text-slate-600"
  }, canvasRecoveryDialogMode === 'checking' ? _crCopy('canvas_recovery.desc_checking', 'AlloFlow is securely checking this browser for earlier resource-pack work.') : canvasRecoveryDialogMode === 'vault-locked' ? _crCopy('canvas_recovery.desc_vault_locked', 'Recovery-workspace contents are encrypted on this device. Unlock to restore or save protected work.') : canvasRecoveryDialogMode === 'error' ? _crCopy('canvas_recovery.desc_error', 'No saved work will be overwritten unless AlloFlow can first read the device store.') : canvasRecoveryDialogMode === 'manage' ? _crCopy('canvas_recovery.desc_manage', 'Review approximate usage, choose a retention policy, and manage recoverable work kept by this browser.') : _crCopy('canvas_recovery.desc_default', 'AlloFlow found saved resource history and authoring state from an earlier Gemini Canvas session.'))), canvasRecoveryDecisionMade && canvasRecoveryVaultForm?.mode !== 'confirm-recovery-code' && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => closeCanvasRecoveryDialog(null),
    className: `min-h-11 min-w-11 rounded-xl border border-slate-200 text-xl text-slate-600 hover:bg-slate-100 ${_focusRing}`,
    "aria-label": t('saved_work.close_aria') || 'Close saved work manager'
  }, "\xD7")), canvasRecoveryDialogMode === 'checking' ? /*#__PURE__*/React.createElement("div", {
    className: "rounded-2xl border border-indigo-100 bg-indigo-50 p-6 text-center",
    role: "status",
    "aria-live": "polite"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    className: "mx-auto mb-3 animate-spin motion-reduce:animate-none text-indigo-700",
    size: 30,
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("p", {
    className: "font-bold text-slate-900"
  }, t('storage.checking_title') || 'Checking saved work…'), /*#__PURE__*/React.createElement("p", {
    className: "mt-2 text-sm text-slate-600"
  }, t('storage.checking_canvas_note') || 'This can take a few seconds in Gemini Canvas.')) : canvasRecoveryDialogMode === 'vault-locked' ? typeof renderCanvasRecoveryLockedScreen === 'function' ? renderCanvasRecoveryLockedScreen() : null : canvasRecoveryDialogMode === 'error' ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    role: "alert",
    className: "rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800"
  }, canvasRecoveryError || 'Saved work could not be checked on this device.'), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 grid gap-3 sm:grid-cols-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-recovery-autofocus": "true",
    disabled: Boolean(canvasRecoveryBusyId),
    onClick: needsStorageApproval ? () => void approveAndRetryCanvasRecoveryStorage() : retryCanvasRecoveryStorage,
    className: `min-h-12 rounded-xl bg-indigo-700 px-4 py-3 font-black text-white hover:bg-indigo-800 disabled:opacity-60 ${_focusRing}`
  }, canvasRecoveryBusyId === 'storage-retry' ? 'Checking…' : needsStorageApproval ? 'Open device storage' : 'Retry device recovery'), /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: Boolean(canvasRecoveryBusyId),
    onClick: continueWithoutCanvasRecovery,
    className: `min-h-12 rounded-xl border-2 border-slate-300 px-4 py-3 font-black text-slate-800 hover:bg-slate-100 disabled:opacity-60 ${_focusRing}`
  }, t('storage.work_without_recovery') || 'Work without device recovery')), /*#__PURE__*/React.createElement("p", {
    className: "mt-4 text-xs leading-relaxed text-slate-600"
  }, needsStorageApproval ? 'Gemini Canvas requires a brief device-storage approval window. Continuing leaves unknown saved data untouched and recovery saving paused.' : 'Continuing leaves unknown saved data untouched. AlloFlow will retry reading it before any later device write.')) : canvasRecoveryDialogMode === 'choice' ? (() => {
    const latest = safeRecoverySnapshots[0];
    if (!latest) return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
      className: "rounded-xl bg-slate-50 p-4 text-sm text-slate-700"
    }, t('storage.no_restorable') || 'No restorable workspace was found.'), /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-recovery-autofocus": "true",
      onClick: startFreshCanvasWorkspace,
      className: `mt-4 min-h-11 w-full rounded-xl bg-indigo-700 px-4 py-3 font-bold text-white hover:bg-indigo-800 ${_focusRing}`
    }, t('storage.start_fresh') || 'Start a fresh workspace'));
    const choiceRetention = ALLO_WORKSPACE_RECOVERY.retentionStatus(canvasRecoveryStore);
    const savedDateText = _formatSavedDate(latest.savedAt, 'recently');
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "mb-5 rounded-2xl border border-indigo-100 bg-indigo-50 p-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "font-black text-slate-900"
    }, latest.title), /*#__PURE__*/React.createElement("div", {
      className: "mt-1 text-sm text-slate-600"
    }, latest.resourceCount, " ", latest.resourceCount === 1 ? 'resource' : 'resources', " \xB7 ", t('storage.saved_label') || 'Saved', " ", savedDateText), latest.assetPolicy === 'text-only' && /*#__PURE__*/React.createElement("div", {
      className: "mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900"
    }, t('storage.saved_summary') || 'Resource history and settings are saved.', " ", t('storage.omitted_assets', {
      n: latest.omittedAssets || t('storage.some') || 'Some'
    }) || (latest.omittedAssets || 'Some') + ' media or draft asset(s) were omitted; export to review details.')), /*#__PURE__*/React.createElement("div", {
      className: "grid gap-3 sm:grid-cols-2"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-recovery-autofocus": "true",
      disabled: Boolean(canvasRecoveryBusyId),
      onClick: () => restoreCanvasWorkspaceSnapshot(latest),
      className: `min-h-12 rounded-xl bg-indigo-700 px-4 py-3 font-black text-white hover:bg-indigo-800 disabled:opacity-60 ${_focusRing}`
    }, canvasRecoveryBusyId === latest.id ? 'Restoring…' : 'Continue previous work'), /*#__PURE__*/React.createElement("button", {
      type: "button",
      disabled: Boolean(canvasRecoveryBusyId),
      onClick: startFreshCanvasWorkspace,
      className: `min-h-12 rounded-xl border-2 border-slate-300 px-4 py-3 font-black text-slate-800 hover:bg-slate-100 ${_focusRing}`
    }, t('storage.start_fresh') || 'Start a fresh workspace'), /*#__PURE__*/React.createElement("button", {
      type: "button",
      disabled: Boolean(canvasRecoveryBusyId),
      onClick: openCanvasRecoveryManager,
      className: `min-h-12 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 font-bold text-indigo-800 hover:bg-indigo-100 ${_focusRing}`
    }, t('storage.manage_saved', {
      n: safeRecoverySnapshots.length,
      max: choiceRetention.maxSnapshots
    }) || 'Manage saved work (' + safeRecoverySnapshots.length + ' of ' + choiceRetention.maxSnapshots + ')'), isCanvas && /*#__PURE__*/React.createElement("button", {
      type: "button",
      disabled: Boolean(canvasRecoveryBusyId),
      onClick: () => canvasRecoveryImportInputRef?.current?.click(),
      className: `min-h-12 rounded-xl border border-slate-300 px-4 py-3 text-center font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-60 ${_focusRing}`
    }, t('storage.import_project') || 'Import project file')), /*#__PURE__*/React.createElement("p", {
      className: "mt-3 text-xs text-slate-600"
    }, t('storage.retention_note', {
      max: choiceRetention.maxSnapshots,
      policy: choiceRetention.effectivePolicyId,
      used: _alloFormatWorkspaceBytes(ALLO_WORKSPACE_RECOVERY.totalBytes(canvasRecoveryStore))
    }) || 'AlloFlow keeps up to ' + choiceRetention.maxSnapshots + ' recent device workspaces under the ' + choiceRetention.effectivePolicyId + ' policy (' + _alloFormatWorkspaceBytes(ALLO_WORKSPACE_RECOVERY.totalBytes(canvasRecoveryStore)) + ' used). Saving beyond that removes the oldest, so export anything you want to keep for good.'), /*#__PURE__*/React.createElement("p", {
      className: "mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950"
    }, safeVaultState.enabled ? 'Shared computer? Protected workspace contents are unreadable after you lock this tab or reload. They remain visible while this tab is unlocked.' : 'Shared computer? Saved work can be opened by another person using this browser profile. Enable optional protection or export and erase important work.'));
  })() : /*#__PURE__*/React.createElement(React.Fragment, null, typeof renderCanvasRecoveryProtectionSection === 'function' ? renderCanvasRecoveryProtectionSection() : null, typeof renderEducatorAccessCodeSection === 'function' ? renderEducatorAccessCodeSection() : null, (() => {
    const retention = ALLO_WORKSPACE_RECOVERY.retentionStatus(canvasRecoveryStore);
    const policyOptions = [{
      id: 'automatic',
      name: t('storage.preset_automatic') || 'Automatic',
      detail: t('storage.preset_automatic_detail') || 'Uses Standard normally and Compact when reported storage is under pressure.'
    }, {
      id: 'compact',
      name: t('storage.preset_compact') || 'Compact',
      detail: t('storage.preset_compact_detail') || 'Targets 4 workspaces / 50 MB and 20 offline resources; old unpinned draft-only work may expire after 14 days.'
    }, {
      id: 'standard',
      name: t('storage.preset_standard') || 'Standard',
      detail: t('storage.preset_standard_detail') || 'Current behavior: targets 20 workspaces / 150 MB and 50 offline resources.'
    }];
    const origin = safeStorageInventory.origin || {};
    const deviceFacts = safeStorageInventory.deviceEstimate;
    const physicalFacts = isCanvas ? deviceFacts || {
      persisted: null,
      usage: null,
      quota: null
    } : origin;
    const persistence = physicalFacts.persisted;
    const _rawMax = Number(retention?.maxSnapshots);
    const _rawCount = Number(retention?.count);
    const capacityMax = Number.isFinite(_rawMax) && _rawMax >= 1 ? _rawMax : 1;
    const capacityCurrent = Number.isFinite(_rawCount) && _rawCount >= 0 ? _rawCount : 0;
    const capacityPct = Math.min(100, Math.round(capacityCurrent / capacityMax * 100));
    const capacityNearLimit = retention.overTarget || capacityCurrent >= capacityMax;
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("section", {
      "aria-labelledby": "storage-status-title",
      className: "mb-5 rounded-2xl border border-slate-200 p-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap items-center justify-between gap-3"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
      id: "storage-status-title",
      className: "font-black text-slate-900"
    }, t('storage.status_title') || 'Storage status'), /*#__PURE__*/React.createElement("p", {
      className: "mt-1 text-xs leading-relaxed text-slate-600"
    }, t('storage.status_note') || 'Browser totals are physical estimates. AlloFlow categories and Canvas namespaces are approximate breakdowns and are not added to that total.')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      disabled: safeStorageInventory.loading,
      onClick: () => void refreshStorageManagerInventory(),
      className: `min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-60 ${_focusRing}`
    }, safeStorageInventory.loading || safeModelStatus.loading ? 'Refreshing…' : 'Refresh status')), /*#__PURE__*/React.createElement("div", {
      className: "mt-4 grid gap-3 sm:grid-cols-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "rounded-xl bg-slate-50 p-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-xs font-black uppercase tracking-wide text-slate-600"
    }, isCanvas ? 'Durable device total' : 'Browser-reported total'), /*#__PURE__*/React.createElement("div", {
      className: "mt-1 font-black text-slate-900"
    }, Number.isFinite(physicalFacts.usage) ? _alloFormatWorkspaceBytes(physicalFacts.usage) + (Number.isFinite(physicalFacts.quota) && physicalFacts.quota > 0 ? ' of ' + _alloFormatWorkspaceBytes(physicalFacts.quota) : '') : 'Unavailable')), /*#__PURE__*/React.createElement("div", {
      className: "rounded-xl bg-slate-50 p-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-xs font-black uppercase tracking-wide text-slate-600"
    }, t('storage.persistence_label') || 'Persistence'), /*#__PURE__*/React.createElement("div", {
      className: "mt-1 font-black text-slate-900"
    }, persistence === true ? 'Protected from automatic eviction' : persistence === false ? 'Best effort' : 'Status unavailable')), /*#__PURE__*/React.createElement("div", {
      className: "rounded-xl bg-slate-50 p-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between gap-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-xs font-black uppercase tracking-wide text-slate-600"
    }, t('storage.recovery_workspaces_label') || 'Recovery workspaces'), capacityNearLimit && /*#__PURE__*/React.createElement("span", {
      className: "rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-900"
    }, retention.overTarget ? 'Over target' : 'At target')), /*#__PURE__*/React.createElement("div", {
      className: "mt-1 font-black text-slate-900"
    }, t('storage.recovery_target', {
      count: retention.count,
      max: retention.maxSnapshots,
      bytes: _alloFormatWorkspaceBytes(retention.bytes)
    }) || retention.count + ' / ' + retention.maxSnapshots + ' target · ' + _alloFormatWorkspaceBytes(retention.bytes)), /*#__PURE__*/React.createElement("div", {
      role: "progressbar",
      "aria-label": "Recovery workspace target capacity",
      "aria-valuemin": 0,
      "aria-valuemax": capacityMax,
      "aria-valuenow": Math.min(capacityCurrent, capacityMax),
      "aria-valuetext": `${capacityCurrent} of ${capacityMax} target workspaces (${capacityPct}%)`,
      className: "mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200"
    }, /*#__PURE__*/React.createElement("div", {
      className: `h-full rounded-full transition-all motion-reduce:transition-none ${capacityNearLimit ? 'bg-amber-600' : 'bg-indigo-600'}`,
      style: {
        width: `${capacityPct}%`
      }
    })))), /*#__PURE__*/React.createElement("div", {
      className: "mt-4"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "text-sm font-black text-slate-900"
    }, t('storage.speech_models_title') || 'On-device speech models'), /*#__PURE__*/React.createElement("p", {
      className: "mt-1 text-xs text-slate-600"
    }, t('storage.speech_models_note') || 'Downloaded once, then kept on this device so voice features work without sending audio anywhere. Removing browser data below also removes these.'), /*#__PURE__*/React.createElement("div", {
      className: "mt-2 divide-y divide-slate-200 rounded-xl border border-slate-200"
    }, [{
      key: 'whisper',
      label: t('storage.model_whisper_label') || 'Speech recognition (Whisper)',
      desc: t('storage.model_whisper_desc') || 'Understands what you say, on this device',
      have: safeModelStatus.whisper,
      size: '~40 MB',
      onGet: downloadWhisperModel
    }, {
      key: 'kokoro',
      label: t('storage.model_kokoro_label') || 'Natural voice (Kokoro)',
      desc: t('storage.model_kokoro_desc') || 'Reads text aloud in a natural voice',
      have: safeModelStatus.kokoro,
      size: '~88 MB',
      onGet: downloadKokoroModel
    }].map(m => /*#__PURE__*/React.createElement("div", {
      key: m.key,
      className: "flex items-center justify-between gap-3 px-3 py-2 text-sm"
    }, /*#__PURE__*/React.createElement("span", {
      className: "min-w-0"
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-semibold text-slate-700"
    }, m.label), /*#__PURE__*/React.createElement("span", {
      className: "block text-xs font-normal text-slate-600"
    }, m.desc)), m.have ? /*#__PURE__*/React.createElement("span", {
      className: "shrink-0 rounded-md bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-800"
    }, '✓ ', t('storage.model_on_device') || 'On this device') : /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: m.onGet,
      disabled: !!safeModelStatus.busy,
      className: `shrink-0 min-h-11 rounded-md border border-indigo-300 bg-white px-3 py-2 text-xs font-black text-indigo-800 hover:bg-indigo-50 disabled:opacity-50 ${_focusRing}`
    }, safeModelStatus.busy === m.key ? t('storage.model_downloading') || 'Downloading…' : t('storage.model_download', {
      size: m.size
    }) || 'Download ' + m.size)))), safeModelStatus.bytes > 0 && /*#__PURE__*/React.createElement("p", {
      className: "mt-1 text-xs text-slate-600"
    }, t('storage.model_cache', {
      size: _alloFormatWorkspaceBytes(safeModelStatus.bytes)
    }) || 'Model cache on this device: ~' + _alloFormatWorkspaceBytes(safeModelStatus.bytes))), (safeManagedRows.length > 0 || dictionaryCache) && /*#__PURE__*/React.createElement("div", {
      className: "mt-4"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "text-sm font-black text-slate-900"
    }, t('storage.managed_data_title') || 'AlloFlow-managed browser data'), /*#__PURE__*/React.createElement("div", {
      className: "mt-2 divide-y divide-slate-200 rounded-xl border border-slate-200"
    }, safeManagedRows.map(row => /*#__PURE__*/React.createElement("div", {
      key: row.id,
      className: "flex items-center justify-between gap-3 px-3 py-2 text-sm"
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-semibold text-slate-700"
    }, row.label, " ", /*#__PURE__*/React.createElement("span", {
      className: "text-xs font-normal text-slate-600"
    }, "(", row.count, ")")), /*#__PURE__*/React.createElement("span", {
      className: "font-bold text-slate-900"
    }, "~", _alloFormatWorkspaceBytes(row.approximateBytes)))), dictionaryCache && /*#__PURE__*/React.createElement("div", {
      "data-storage-dictionary-row": "true",
      className: "px-3 py-2 text-sm"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap items-center justify-between gap-3"
    }, /*#__PURE__*/React.createElement("span", {
      className: "min-w-0"
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-semibold text-slate-700"
    }, t('storage.dictionary_cache_label') || 'Word data for glossaries', " ", /*#__PURE__*/React.createElement("span", {
      className: "text-xs font-normal text-slate-600"
    }, "(", dictionaryCache.count, ")")), /*#__PURE__*/React.createElement("span", {
      className: "block text-xs font-normal text-slate-600"
    }, t('storage.dictionary_cache_hint') || 'Word meanings looked up for glossaries, kept so they work offline. Safe to delete; they are fetched again when needed.')), /*#__PURE__*/React.createElement("span", {
      className: "flex shrink-0 flex-wrap items-center justify-end gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-bold text-slate-900"
    }, "~", _alloFormatWorkspaceBytes(dictionaryCache.approximateBytes)), typeof deleteDictionaryCache === 'function' && (dictionaryDeleteConfirm ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-storage-dictionary-confirm": "true",
      onClick: () => {
        deleteDictionaryCache();
        setDictionaryDeleteConfirm(false);
        try {
          activeRecoveryDialogRef.current && activeRecoveryDialogRef.current.focus({
            preventScroll: true
          });
        } catch (_) {}
      },
      className: `min-h-11 rounded-lg bg-red-700 px-3 py-2 text-sm font-black text-white hover:bg-red-800 ${_focusRing}`
    }, t('storage.remediation_delete_confirm_one') || 'Confirm delete'), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => setDictionaryDeleteConfirm(false),
      className: `min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 hover:bg-slate-100 ${_focusRing}`
    }, t('common.cancel') || 'Cancel')) : /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-storage-dictionary-delete": "true",
      onClick: () => setDictionaryDeleteConfirm(true),
      className: `min-h-11 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-bold text-red-800 hover:bg-red-50 ${_focusRing}`
    }, t('storage.remediation_delete') || 'Delete')))), dictionaryDeleteConfirm && /*#__PURE__*/React.createElement("p", {
      role: "alert",
      className: "mt-2 text-xs font-semibold text-red-800"
    }, t('storage.dictionary_cache_delete_warning') || 'Delete the saved word data from this device? Your glossaries are not changed.')))), isCanvas && safeDeviceNamespaces.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "mt-4"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "text-sm font-black text-slate-900"
    }, t('storage.canvas_namespaces_title') || 'Canvas durable-device namespaces'), /*#__PURE__*/React.createElement("div", {
      className: "mt-2 divide-y divide-slate-200 rounded-xl border border-slate-200"
    }, safeDeviceNamespaces.map(row => /*#__PURE__*/React.createElement("div", {
      key: row.ns,
      className: "flex items-center justify-between gap-3 px-3 py-2 text-sm"
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-semibold text-slate-700"
    }, row.ns, " ", /*#__PURE__*/React.createElement("span", {
      className: "text-xs font-normal text-slate-600"
    }, "(", row.count, ")")), /*#__PURE__*/React.createElement("span", {
      className: "font-bold text-slate-900"
    }, "~", _alloFormatWorkspaceBytes(row.bytes)))))), safeStorageInventory.error && /*#__PURE__*/React.createElement("p", {
      role: "alert",
      className: "mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs font-semibold text-amber-900"
    }, safeStorageInventory.error)), /*#__PURE__*/React.createElement("section", {
      "aria-labelledby": "storage-policy-title",
      className: "mb-5 rounded-2xl border border-indigo-100 bg-indigo-50 p-4"
    }, /*#__PURE__*/React.createElement("h3", {
      id: "storage-policy-title",
      className: "font-black text-slate-900"
    }, t('storage.retention_title') || 'Retention policy'), /*#__PURE__*/React.createElement("p", {
      className: "mt-1 text-xs leading-relaxed text-slate-600"
    }, t('storage.retention_intro') || 'Choose a tested policy instead of a manual MB limit. Pinned work and the newest workspace are never automatically removed.'), /*#__PURE__*/React.createElement("div", {
      className: "mt-3 grid gap-2"
    }, policyOptions.map(option => {
      const selected = retention.policyId === option.id;
      return /*#__PURE__*/React.createElement("button", {
        key: option.id,
        type: "button",
        "aria-pressed": selected,
        disabled: Boolean(canvasRecoveryBusyId),
        onClick: () => void setStorageRetentionPolicy(option.id),
        className: `min-h-11 rounded-xl border px-3 py-3 text-left disabled:opacity-60 ${_focusRing} ` + (selected ? 'border-indigo-600 bg-white ring-2 ring-indigo-200' : 'border-indigo-200 bg-indigo-50 hover:bg-white')
      }, /*#__PURE__*/React.createElement("span", {
        className: "block font-black text-slate-900"
      }, option.name, selected && option.id === 'automatic' ? t('storage.retention_currently', {
        policy: retention.effectivePolicyId
      }) || ' (currently ' + retention.effectivePolicyId + ')' : ''), /*#__PURE__*/React.createElement("span", {
        className: "mt-1 block text-xs leading-relaxed text-slate-600"
      }, option.detail));
    })), retention.overTarget && /*#__PURE__*/React.createElement("p", {
      className: "mt-3 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs font-semibold text-amber-950"
    }, t('storage.retention_over_target') || 'Protected work exceeds this policy target. Pinned work and the newest workspace are being kept; unpin, remove embedded media, export, or erase items to reclaim space.')));
  })(), isCanvas && !canvasRecoveryStoreAuthoritative && /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-red-200 bg-red-50 p-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-semibold text-red-800"
  }, t('storage.not_reread') || 'Saved work has not been safely re-read yet.'), /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: Boolean(canvasRecoveryBusyId),
    onClick: retryCanvasRecoveryStorage,
    className: `mt-2 min-h-11 rounded-lg bg-indigo-700 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-800 disabled:opacity-60 ${_focusRing}`
  }, canvasRecoveryBusyId === 'storage-retry' ? t('storage.checking_short') || 'Checking…' : t('storage.retry_device_storage') || 'Retry device storage')), !pdfAuditResult && (safePdfCacheEntries.length > 0 || pdfFixResult || safeLastPdfAudit || safeRecoverySnapshots.some(snapshot => snapshot?.workspace?.builderDraft)) && /*#__PURE__*/React.createElement("section", {
    "aria-labelledby": "storage-local-documents-title",
    className: "mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-start justify-between gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    id: "storage-local-documents-title",
    className: "font-black text-slate-900"
  }, t('storage.local_documents_title') || 'Local documents'), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 max-w-2xl text-xs leading-relaxed text-slate-700"
  }, t('storage.local_documents_hint') || 'Accessibility remediations can be resumed independently below. Document Hub drafts are marked in their saved workspaces and can be opened directly. Nothing new is retained merely by viewing this list.')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2 text-xs font-black uppercase tracking-wide"
  }, (safePdfCacheEntries.length > 0 || pdfFixResult || safeLastPdfAudit) && /*#__PURE__*/React.createElement("span", {
    className: "rounded-full bg-emerald-200 px-2.5 py-1 text-emerald-950"
  }, safePdfCacheEntries.length || 1, " remediation", (safePdfCacheEntries.length || 1) === 1 ? '' : 's'), safeRecoverySnapshots.some(snapshot => snapshot?.workspace?.builderDraft) && /*#__PURE__*/React.createElement("span", {
    className: "rounded-full bg-indigo-100 px-2.5 py-1 text-indigo-900"
  }, safeRecoverySnapshots.filter(snapshot => snapshot?.workspace?.builderDraft).length, " Document Hub draft", safeRecoverySnapshots.filter(snapshot => snapshot?.workspace?.builderDraft).length === 1 ? '' : 's'))), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 space-y-2"
  }, safePdfCacheEntries.map(entry => {
    const isActive = entry.storageKey === pdfActiveRemediationStorageKey && Boolean(pdfFixResult || safeLastPdfAudit);
    return /*#__PURE__*/React.createElement("article", {
      key: entry.storageKey,
      className: "rounded-xl border border-emerald-200 bg-white p-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex flex-col justify-between gap-3 sm:flex-row sm:items-start"
    }, /*#__PURE__*/React.createElement("div", {
      className: "min-w-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap items-center gap-2"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "break-words text-sm font-black text-slate-900"
    }, entry.documentName), isActive && /*#__PURE__*/React.createElement("span", {
      className: "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-black uppercase tracking-wide text-emerald-900"
    }, "Current")), /*#__PURE__*/React.createElement("p", {
      className: "mt-1 text-xs text-slate-600"
    }, _formatSavedDate(entry.savedAt, 'Saved on this device'), entry.pageCount ? ` · ${entry.pageCount} page${entry.pageCount === 1 ? '' : 's'}` : '', entry.approximateBytes > 0 ? ' · ~' + _alloFormatWorkspaceBytes(entry.approximateBytes) : ''), /*#__PURE__*/React.createElement("p", {
      className: "mt-1 text-xs font-semibold text-emerald-900"
    }, Number.isFinite(entry.beforeScore) ? `Audit ${entry.beforeScore}/100` : 'Audit score unavailable', Number.isFinite(entry.afterScore) ? ` → remediation ${entry.afterScore}/100` : ' · verification required')), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-2"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => {
        if (isActive) openCachedPdfRemediation(true);else void restoreCachedPdfRemediation(entry.storageKey, true);
      },
      className: `min-h-11 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-800 ${_focusRing}`
    }, t('storage.remediation_open') || 'Resume'), pdfRemediationDeleteConfirm === entry.storageKey ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => deleteCachedPdfRemediationEntry(entry.storageKey),
      className: `min-h-11 rounded-lg bg-red-700 px-3 py-2 text-sm font-black text-white hover:bg-red-800 ${_focusRing}`
    }, t('storage.remediation_delete_confirm_one') || 'Confirm delete'), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => setPdfRemediationDeleteConfirm(null),
      className: `min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 hover:bg-slate-100 ${_focusRing}`
    }, t('common.cancel') || 'Cancel')) : /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => setPdfRemediationDeleteConfirm(entry.storageKey),
      className: `min-h-11 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-bold text-red-800 hover:bg-red-50 ${_focusRing}`
    }, t('storage.remediation_delete') || 'Delete'))), pdfRemediationDeleteConfirm === entry.storageKey && /*#__PURE__*/React.createElement("p", {
      role: "alert",
      className: "mt-2 text-xs font-semibold text-red-800"
    }, "Delete this remediation from this device? Exported files and other local documents will not be affected."));
  }), safePdfCacheEntries.length === 0 && (pdfFixResult || safeLastPdfAudit) && /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-emerald-200 bg-white p-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-black text-slate-900"
  }, "Current remediation"), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-xs text-slate-600"
  }, "Available in this session; device-cache storage may be unavailable or still updating."), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => openCachedPdfRemediation(true),
    className: `mt-2 min-h-11 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-800 ${_focusRing}`
  }, "Resume")), safePdfCacheEntries.length === 0 && !pdfFixResult && !safeLastPdfAudit && safeRecoverySnapshots.some(snapshot => snapshot?.workspace?.builderDraft) && /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-indigo-200 bg-white p-3 text-xs leading-relaxed text-slate-700"
  }, "Document Hub drafts are stored with their saved workspaces below. Choose ", /*#__PURE__*/React.createElement("strong", null, "Open document"), " to restore that workspace and continue editing its draft.")), safePdfCacheEntries.length > 1 && pdfRemediationDeleteConfirm !== 'all' && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setPdfRemediationDeleteConfirm('all'),
    className: `mt-3 min-h-11 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-bold text-red-800 hover:bg-red-50 ${_focusRing}`
  }, t('storage.remediation_delete_all') || 'Delete all remediations'), pdfRemediationDeleteConfirm === 'all' && /*#__PURE__*/React.createElement("div", {
    role: "alert",
    className: "mt-3 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-950"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-semibold"
  }, t('storage.remediation_delete_warning') || 'Delete every locally cached remediation and clear the current remediation result? Document Hub drafts, workspaces, and exported files will not be affected.'), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 flex flex-wrap gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: deleteCachedPdfRemediation,
    className: `min-h-11 rounded-lg bg-red-700 px-3 py-2 text-sm font-black text-white hover:bg-red-800 ${_focusRing}`
  }, "Delete all remediations"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setPdfRemediationDeleteConfirm(null),
    className: `min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 hover:bg-slate-100 ${_focusRing}`
  }, t('common.cancel') || 'Cancel')))), safeRecoverySnapshots.length > 0 && (() => {
    const retention = ALLO_WORKSPACE_RECOVERY.retentionStatus(canvasRecoveryStore);
    return /*#__PURE__*/React.createElement("p", {
      className: "mb-3 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-700"
    }, "Using ", /*#__PURE__*/React.createElement("strong", null, _alloFormatWorkspaceBytes(retention.bytes)), " across ", retention.count, " saved", retention.count === 1 ? ' workspace' : ' workspaces', "; ", retention.pinnedCount, " pinned. The ", retention.effectivePolicyId, " target is ", retention.maxSnapshots, " workspaces / ", _alloFormatWorkspaceBytes(retention.maxTotalBytes), ". Oldest unpinned work is removed first.");
  })(), (() => {
    const allSnapshots = Array.isArray(canvasRecoveryStore?.snapshots) ? canvasRecoveryStore.snapshots : [];
    const showWorkspaceFilter = allSnapshots.length >= 4;
    const pinnedCount = allSnapshots.filter(item => item?.pinned === true).length;
    const draftCount = allSnapshots.filter(item => Boolean(item?.workspace?.builderDraft)).length;
    const activeFilter = snapshotFilter === 'pinned' && pinnedCount > 0 || snapshotFilter === 'drafts' && draftCount > 0 ? snapshotFilter : 'all';
    const normalizedQuery = showWorkspaceFilter ? snapshotQuery.trim().toLocaleLowerCase() : '';
    const visibleSnapshots = showWorkspaceFilter ? allSnapshots.filter(item => {
      if (activeFilter === 'pinned' && item?.pinned !== true) return false;
      if (activeFilter === 'drafts' && !item?.workspace?.builderDraft) return false;
      if (!normalizedQuery) return true;
      const haystack = `${item?.title || ''} ${item?.workspace?.builderDraft?.title || ''}`.toLocaleLowerCase();
      return haystack.includes(normalizedQuery);
    }) : allSnapshots;
    const isFiltered = showWorkspaceFilter && (activeFilter !== 'all' || Boolean(normalizedQuery));
    return /*#__PURE__*/React.createElement(React.Fragment, null, showWorkspaceFilter && /*#__PURE__*/React.createElement("div", {
      className: "mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5",
      role: "search",
      "aria-label": "Filter saved workspaces"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("label", {
      htmlFor: "canvas-recovery-workspace-search",
      className: "sr-only"
    }, "Search saved workspaces"), /*#__PURE__*/React.createElement("input", {
      id: "canvas-recovery-workspace-search",
      type: "search",
      value: snapshotQuery,
      onChange: event => setSnapshotQuery(event.target.value),
      onKeyDown: event => {
        if (event.key === 'Escape' && snapshotQuery) {
          if (event.isComposing || event.nativeEvent?.isComposing || event.keyCode === 229) return;
          event.preventDefault();
          event.stopPropagation();
          setSnapshotQuery('');
        }
      },
      placeholder: "Search saved workspaces by title\u2026",
      className: "w-full min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-600"
    }), snapshotQuery && /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => setSnapshotQuery(''),
      className: `min-h-11 shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 ${_focusRing}`
    }, "Clear")), (pinnedCount > 0 || draftCount > 0) && /*#__PURE__*/React.createElement("div", {
      role: "group",
      "aria-label": "Filter saved workspaces by type",
      className: "flex flex-wrap gap-1.5"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-recovery-filter": "all",
      "aria-pressed": activeFilter === 'all',
      onClick: () => setSnapshotFilter('all'),
      className: `min-h-11 rounded-full border px-3 py-1.5 text-xs font-bold ${_focusRing} ${activeFilter === 'all' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`
    }, "All (", allSnapshots.length, ")"), pinnedCount > 0 && /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-recovery-filter": "pinned",
      "aria-pressed": activeFilter === 'pinned',
      onClick: () => setSnapshotFilter('pinned'),
      className: `min-h-11 rounded-full border px-3 py-1.5 text-xs font-bold ${_focusRing} ${activeFilter === 'pinned' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`
    }, "Pinned (", pinnedCount, ")"), draftCount > 0 && /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-recovery-filter": "drafts",
      "aria-pressed": activeFilter === 'drafts',
      onClick: () => setSnapshotFilter('drafts'),
      className: `min-h-11 rounded-full border px-3 py-1.5 text-xs font-bold ${_focusRing} ${activeFilter === 'drafts' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`
    }, "Document Hub drafts (", draftCount, ")")), isFiltered && /*#__PURE__*/React.createElement("p", {
      role: "status",
      "aria-live": "polite",
      className: "text-xs font-medium text-slate-600"
    }, "Showing ", visibleSnapshots.length, " of ", allSnapshots.length, " saved workspaces")), /*#__PURE__*/React.createElement("div", {
      className: "space-y-3"
    }, allSnapshots.length === 0 && /*#__PURE__*/React.createElement("p", {
      className: "rounded-xl bg-slate-50 p-4 text-sm text-slate-700"
    }, "No recovery workspaces are listed. Other saved work may still be available in Device storage."), allSnapshots.length > 0 && visibleSnapshots.length === 0 && /*#__PURE__*/React.createElement("div", {
      className: "rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-sm font-bold text-slate-800"
    }, "No saved workspaces match your current filter."), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => {
        setSnapshotQuery('');
        setSnapshotFilter('all');
      },
      className: `mt-3 min-h-11 rounded-lg bg-indigo-700 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-800 ${_focusRing}`
    }, "Reset filters")), visibleSnapshots.map((snapshot, index) => /*#__PURE__*/React.createElement("div", {
      key: snapshot.id,
      className: "rounded-2xl border border-slate-200 p-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex flex-col justify-between gap-3 sm:flex-row sm:items-start"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap items-center gap-2 font-black text-slate-900"
    }, /*#__PURE__*/React.createElement("span", null, snapshot.title), snapshot.pinned && /*#__PURE__*/React.createElement("span", {
      className: "rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-black uppercase tracking-wide text-indigo-800"
    }, "Pinned"), snapshot.resourceCount === 0 && /*#__PURE__*/React.createElement("span", {
      className: "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-black uppercase tracking-wide text-slate-700"
    }, "Draft only"), snapshot?.workspace?.builderDraft && /*#__PURE__*/React.createElement("span", {
      className: "rounded-full bg-violet-100 px-2 py-0.5 text-xs font-black uppercase tracking-wide text-violet-900"
    }, "Document Hub draft")), /*#__PURE__*/React.createElement("div", {
      className: "mt-1 text-xs text-slate-600"
    }, snapshot.resourceCount, " ", snapshot.resourceCount === 1 ? 'resource' : 'resources', " \xB7 ", _formatSavedDate(snapshot.savedAt, 'Saved on this device'), snapshot.approximateBytes > 0 && ' · ' + _alloFormatWorkspaceBytes(snapshot.approximateBytes)), /*#__PURE__*/React.createElement("div", {
      className: 'mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ' + (snapshot.assetPolicy === 'full' ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900')
    }, snapshot.assetPolicy === 'full' ? 'Resource pack saved with supported media' : 'Resource history and settings saved; omissions recorded')), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-2"
    }, snapshot?.workspace?.builderDraft && /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-recovery-autofocus": index === 0 ? 'true' : undefined,
      disabled: Boolean(canvasRecoveryBusyId),
      onClick: () => void openCanvasDocumentHubDraft(snapshot),
      className: `min-h-11 rounded-lg bg-violet-700 px-3 py-2 text-sm font-bold text-white hover:bg-violet-800 disabled:opacity-60 ${_focusRing}`
    }, "Open document"), /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-recovery-autofocus": index === 0 && !snapshot?.workspace?.builderDraft ? 'true' : undefined,
      disabled: Boolean(canvasRecoveryBusyId),
      onClick: () => restoreCanvasWorkspaceSnapshot(snapshot),
      className: `min-h-11 rounded-lg bg-indigo-700 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-800 disabled:opacity-60 ${_focusRing}`
    }, "Restore"), /*#__PURE__*/React.createElement("button", {
      type: "button",
      "aria-pressed": snapshot.pinned === true,
      disabled: Boolean(canvasRecoveryBusyId),
      onClick: () => void setCanvasRecoverySnapshotPinned(snapshot.id, !snapshot.pinned),
      className: `min-h-11 rounded-lg border border-indigo-300 px-3 py-2 text-sm font-bold text-indigo-800 hover:bg-indigo-50 disabled:opacity-60 ${_focusRing}`
    }, snapshot.pinned ? 'Unpin' : 'Pin'), canvasRecoveryRemoveMediaId === snapshot.id ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
      type: "button",
      disabled: Boolean(canvasRecoveryBusyId),
      onClick: () => void removeCanvasRecoverySnapshotMedia(snapshot.id),
      className: `min-h-11 rounded-lg bg-amber-700 px-3 py-2 text-sm font-bold text-white hover:bg-amber-800 disabled:opacity-60 ${_focusRing}`
    }, "Confirm remove media"), /*#__PURE__*/React.createElement("button", {
      type: "button",
      disabled: Boolean(canvasRecoveryBusyId),
      onClick: () => setCanvasRecoveryRemoveMediaId(null),
      className: `min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 ${_focusRing}`
    }, "Cancel")) : /*#__PURE__*/React.createElement("button", {
      type: "button",
      disabled: Boolean(canvasRecoveryBusyId),
      onClick: () => {
        setCanvasRecoveryEraseId(null);
        setCanvasRecoveryRemoveMediaId(snapshot.id);
      },
      className: `min-h-11 rounded-lg border border-amber-300 px-3 py-2 text-sm font-bold text-amber-800 hover:bg-amber-50 ${_focusRing}`
    }, "Remove embedded media"), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => exportCanvasRecoverySnapshot(snapshot),
      className: `min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 ${_focusRing}`
    }, safeVaultState.enabled ? 'Export readable copy' : 'Export'), canvasRecoveryEraseId === snapshot.id ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-recovery-confirm": snapshot.id,
      disabled: Boolean(canvasRecoveryBusyId),
      onClick: () => eraseCanvasRecoverySnapshot(snapshot.id),
      className: `min-h-11 rounded-lg bg-red-700 px-3 py-2 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-60 ${_focusRing}`
    }, "Confirm erase"), /*#__PURE__*/React.createElement("button", {
      type: "button",
      disabled: Boolean(canvasRecoveryBusyId),
      onClick: () => setCanvasRecoveryEraseId(null),
      className: `min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 ${_focusRing}`
    }, "Cancel")) : /*#__PURE__*/React.createElement("button", {
      type: "button",
      disabled: Boolean(canvasRecoveryBusyId),
      onClick: () => requestCanvasRecoveryErase(snapshot.id),
      className: `min-h-11 rounded-lg border border-red-300 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50 ${_focusRing}`
    }, "Erase workspace")))))));
  })(), /*#__PURE__*/React.createElement("div", {
    className: "mt-5 flex flex-col gap-3 sm:flex-row"
  }, !canvasRecoveryDecisionMade ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setCanvasRecoveryDialogMode('choice'),
    className: `min-h-11 flex-1 rounded-xl border border-slate-300 px-4 py-3 font-bold text-slate-700 hover:bg-slate-100 ${_focusRing}`
  }, "Back") : /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => closeCanvasRecoveryDialog(null),
    className: `min-h-11 flex-1 rounded-xl border border-slate-300 px-4 py-3 font-bold text-slate-700 hover:bg-slate-100 ${_focusRing}`
  }, "Close"), isCanvas && /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: Boolean(canvasRecoveryBusyId),
    onClick: () => canvasRecoveryImportInputRef?.current?.click(),
    className: `min-h-11 flex-1 rounded-xl bg-indigo-50 px-4 py-3 text-center font-bold text-indigo-800 hover:bg-indigo-100 disabled:opacity-60 ${_focusRing}`
  }, "Import project file"))), isCanvas && /*#__PURE__*/React.createElement("input", {
    ref: canvasRecoveryImportInputRef,
    type: "file",
    accept: ".json,application/json",
    className: "hidden",
    tabIndex: -1,
    "aria-hidden": "true",
    onChange: handleCanvasRecoveryImport
  }), canvasRecoveryError && canvasRecoveryDialogMode !== 'error' && /*#__PURE__*/React.createElement("p", {
    role: "alert",
    className: "mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800"
  }, canvasRecoveryError)));
}
window.AlloModules.CanvasRecoveryDialogView = CanvasRecoveryDialogView;
window.AlloModules.CanvasRecoveryDialogView = window.AlloModules.CanvasRecoveryDialogView;
console.log('[CDN] CanvasRecoveryDialogView loaded');
})();
