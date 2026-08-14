/**
 * AlloFlow — Educator Hub Modal Module
 *
 * Professional tools modal for educators/clinicians. Entry points for
 * AccessibilityLab, CommunityCatalog, SymbolStudio, BehaviorLens,
 * ReportWriter, PDF audit/batch flow.
 *
 * Extracted from AlloFlowANTI.txt lines 23679-23791 (May 2026).
 * ~113 lines, 17 deps.
 */
const _EDUCATOR_BATCH_MAX_FILES = 60;
function _educatorBatchMemoryBudget() {
  // Base64, hashing, and pdf.js can temporarily retain several byte copies.
  const deviceGb = typeof navigator !== 'undefined' && Number.isFinite(Number(navigator.deviceMemory))
    ? Math.max(1, Number(navigator.deviceMemory))
    : 4;
  const totalMb = Math.max(48, Math.min(128, Math.floor(deviceGb * 24)));
  const fileMb = Math.min(64, totalMb);
  return { perFileBytes: fileMb * 1024 * 1024, totalBytes: totalMb * 1024 * 1024 };
}

let _educatorAlloSheetBridgePromise = null;
function _educatorAlloSheetBridgeUrl() {
  const fallback = 'https://alloflow-cdn.pages.dev/allo_sheet/host_bridge.js?v=5';
  try {
    const loc = window.location || {};
    const host = String(loc.hostname || '');
    const pathname = String(loc.pathname || '');
    const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(host);
    const isDesktopBundled = !!window._isDesktopBundledApp || (isLocal && pathname.indexOf('/app/') === 0);
    const isAlloHosted = /(^|\.)alloflow/i.test(host)
      || /(^|\.)web\.app$/i.test(host)
      || /(^|\.)firebaseapp\.com$/i.test(host);
    if (isDesktopBundled || isLocal || isAlloHosted) {
      return new URL('allo_sheet/host_bridge.js?v=5', loc.href).toString();
    }
  } catch (_) {}
  return fallback;
}

function _loadEducatorAlloSheetBridge() {
  if (window.AlloSheetHostBridge && typeof window.AlloSheetHostBridge.open === 'function') {
    return Promise.resolve(window.AlloSheetHostBridge);
  }
  if (_educatorAlloSheetBridgePromise) return _educatorAlloSheetBridgePromise;
  _educatorAlloSheetBridgePromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = _educatorAlloSheetBridgeUrl();
    script.async = true;
    script.dataset.alloSheetBridge = 'true';
    script.onload = () => {
      if (window.AlloSheetHostBridge && typeof window.AlloSheetHostBridge.open === 'function') {
        resolve(window.AlloSheetHostBridge);
      } else {
        reject(new Error('AlloSheet loaded without its host bridge.'));
      }
    };
    script.onerror = () => reject(new Error('AlloSheet could not be loaded.'));
    document.head.appendChild(script);
  }).catch((error) => {
    _educatorAlloSheetBridgePromise = null;
    throw error;
  });
  return _educatorAlloSheetBridgePromise;
}

function _educatorAlloSheetTheme() {
  const root = document.documentElement;
  const body = document.body;
  if ((root && root.classList.contains('theme-contrast')) || (body && body.classList.contains('theme-contrast'))) return 'contrast';
  if ((root && root.classList.contains('theme-light')) || (body && body.classList.contains('theme-light'))) return 'light';
  return 'dark';
}

function EducatorHubModal(props) {
  const {
    handleFileUpload, openExportPreview, pdfAuditResult, pdfFixLoading, pdfFixResult,
    addToast = (() => {}),
    setIsAccessibilityLabOpen, setIsCommunityCatalogOpen, setIsSymbolStudioOpen,
    setPdfAuditResult, setPdfBatchMode, setPendingPdfBase64, setPendingPdfFile,
    setShowBehaviorLens, setShowEducatorHub, setShowMindMap = (() => {}), setShowReportWriter, setShowCinematicStudio = (() => {}), showEducatorHub, t,
    userRole = '',
    setShowRecentQrShares = (() => {}),
    beginPdfDocumentIntake = (() => null),
    isPdfDocumentIntakeCurrent = (() => true),
    // Video Studio launcher (2026-07-02): companion-window screen recorder/editor.
    // Optional default so legacy hosts that haven't wired the setter still render.
    setIsVideoStudioOpen = (() => {}),
    // AlloStudio launcher (2026-07-02): flyer/worksheet/poster editor with
    // born-accessible exports + process provenance (docs/studio_design.md).
    setIsAlloStudioOpen = (() => {}),
    // Phase A.3 polish (May 12 2026): renamed from setPdfBatchFiles (which was
    // never defined in host scope). The real host setter is setPdfBatchQueue,
    // matching the batch-files array shape stored in `pdfBatchQueue` state.
    setPdfBatchQueue = (() => {}),
    setPdfBatchSummary = (() => {}),
    // Dynamic Assessment Studio entry — added May 2026. Optional so legacy
    // hosts that haven't wired the setter still render the rest of the hub.
    setIsDynamicAssessmentOpen = (() => {}),
    // Lumen launcher — opens the STEAM Lab on the Lumen tool (Lumen is plugin-only,
    // so this card is its primary UI entry point). Optional defaults so a host that
    // hasn't wired the STEAM-Lab setters still renders the rest of the hub.
    setShowStemLab = (() => {}),
    setStemLabTool = (() => {}),
    setLabToolData = (() => {}),
    // Lesson-builder card (2026-06-13): opens the AlloBot guided lesson flow. The host
    // passes a closure mirroring startLessonFlow({}) (show bot + trigger Auto-Fill).
    // Optional default so legacy hosts that don't pass it still render the hub.
    startLessonFlow = (() => {}),
    // Family Bridge launcher (2026-06-28): opens the live-translation panel so the
    // bridge feature is reachable from the hub, not only the History sidebar tab.
    // Optional default so a host that hasn't wired the setter still renders the hub.
    setBridgeSendOpen = (() => {}),
    // Leadership Hub launcher (2026-08-03): ONE card for the admin tool suite
    // (walkthrough, dispro analyzer, meeting docs) — the container pattern.
    // The per-tool setters below stay accepted (unused) so hosts that still
    // pass them render unchanged.
    setIsAdminHubOpen = (() => {}),
    setIsUdlWalkthroughOpen = (() => {}),
    setIsDisproAnalyzerOpen = (() => {}),
    // Whiteboard launcher (2026-07-06): the host owns window.open now so it can
    // retain the popup handle for two-way postMessage (Save-to-resources + future
    // AI assist). Optional default so a host that hasn't wired it still renders.
    openWhiteboard = (() => {}),
  } = props;
  const dialogRef = React.useRef(null);
  const pdfBatchIntakeRef = React.useRef(null);
  const educatorHubMountedRef = React.useRef(true);
  const [pdfBatchIntakeProgress, setPdfBatchIntakeProgress] = React.useState(null);
  const _setPdfBatchIntakeProgressIfMounted = (value) => {
    if (educatorHubMountedRef.current) setPdfBatchIntakeProgress(value);
  };
  const _cancelPdfBatchIntake = (notify) => {
    const job = pdfBatchIntakeRef.current;
    if (!job) return;
    job.cancelled = true;
    if (job.reader && typeof job.reader.abort === 'function') {
      try { job.reader.abort(); } catch (_) {}
    }
    if (typeof job.cancelRead === 'function') job.cancelRead();
    if (pdfBatchIntakeRef.current === job) pdfBatchIntakeRef.current = null;
    _setPdfBatchIntakeProgressIfMounted(null);
    if (notify !== false) addToast('PDF batch preparation cancelled.', 'info');
  };
  React.useEffect(function () {
    _loadEducatorAlloSheetBridge().catch(() => {});
  }, []);
  React.useEffect(function () {
    educatorHubMountedRef.current = true;
    return function () {
      educatorHubMountedRef.current = false;
      const job = pdfBatchIntakeRef.current;
      if (!job) return;
      job.cancelled = true;
      if (job.reader && typeof job.reader.abort === 'function') {
        try { job.reader.abort(); } catch (_) {}
      }
      if (typeof job.cancelRead === 'function') job.cancelRead();
      if (pdfBatchIntakeRef.current === job) pdfBatchIntakeRef.current = null;
    };
  }, []);
  React.useEffect(function () {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const previousFocus = document.activeElement;
    const trapStack = window.__alloFocusTrapStack || (window.__alloFocusTrapStack = []);
    const trap = { root: dialog };
    trapStack.push(trap);
    // Ref-counted shared body scroll lock — see window.__alloScrollLockState.
    // Without it the page behind the hub scrolls under a touch drag, which on
    // a phone reads as the tiles sliding away and not coming back.
    const scrollLock = window.__alloScrollLockState || (window.__alloScrollLockState = { count: 0, prev: '' });
    let scrollLocked = false;
    try {
      scrollLocked = true;
      if (++scrollLock.count === 1) { scrollLock.prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
    } catch (_) {}
    const isTopTrap = function () { return trapStack[trapStack.length - 1] === trap; };
    const getFocusable = function () {
      return Array.from(dialog.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [contenteditable="true"], [tabindex]:not([tabindex="-1"])'
      )).filter(function (element) {
        if (element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
        const style = typeof window.getComputedStyle === 'function' ? window.getComputedStyle(element) : null;
        return !style || (style.display !== 'none' && style.visibility !== 'hidden');
      });
    };
    const first = getFocusable()[0];
    (first || dialog).focus();
    const onKeyDown = function (event) {
      if (!isTopTrap()) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setShowEducatorHub(false); return; }
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      if (focusable.length === 0) { event.preventDefault(); dialog.focus(); return; }
      const firstItem = focusable[0], lastItem = focusable[focusable.length - 1];
      if (!dialog.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? lastItem : firstItem).focus(); }
      else if (event.shiftKey && document.activeElement === firstItem) { event.preventDefault(); lastItem.focus(); }
      else if (!event.shiftKey && document.activeElement === lastItem) { event.preventDefault(); firstItem.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return function () {
      document.removeEventListener('keydown', onKeyDown);
      try {
        if (scrollLocked) {
          scrollLock.count = Math.max(0, scrollLock.count - 1);
          if (scrollLock.count === 0) document.body.style.overflow = scrollLock.prev;
        }
      } catch (_) {}
      const wasTopTrap = isTopTrap();
      const trapIndex = trapStack.indexOf(trap);
      if (trapIndex !== -1) trapStack.splice(trapIndex, 1);
      if (wasTopTrap && previousFocus && previousFocus !== document.body && previousFocus.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus();
    };
  }, [setShowEducatorHub]);

  const _openAlloSheet = () => {
    const bridge = window.AlloSheetHostBridge;
    if (!bridge || typeof bridge.open !== 'function') {
      _loadEducatorAlloSheetBridge().catch((error) => {
        addToast(error && error.message ? error.message : 'AlloSheet could not be loaded.', 'error');
      });
      addToast('AlloSheet is loading. Select it again in a moment.', 'info');
      return;
    }
    const popup = bridge.open({ theme: _educatorAlloSheetTheme() });
    if (popup) setShowEducatorHub(false);
  };

  const tr = (key, fallback) => {
    try { const value = typeof t === 'function' ? t(key) : ''; return value && value !== key ? value : fallback; }
    catch (_) { return fallback; }
  };
  const hubGridRef = React.useRef(null);
  const [hubQuery, setHubQuery] = React.useState('');
  const [hubCards, setHubCards] = React.useState([]);
  const [hubFavoriteIds, setHubFavoriteIds] = React.useState(() => {
    try { const parsed = JSON.parse(localStorage.getItem('alloflow_hub_educator_favorites') || '[]'); return Array.isArray(parsed) ? parsed : []; }
    catch (_) { return []; }
  });
  const [hubRecentIds, setHubRecentIds] = React.useState(() => {
    try { const parsed = JSON.parse(localStorage.getItem('alloflow_hub_educator_recent') || '[]'); return Array.isArray(parsed) ? parsed : []; }
    catch (_) { return []; }
  });
  const [hubFavoritesOnly, setHubFavoritesOnly] = React.useState(false);
  const [hubManageFavorites, setHubManageFavorites] = React.useState(false);
  const [hubVisibleCount, setHubVisibleCount] = React.useState(0);
  const [hubUsageCounts, setHubUsageCounts] = React.useState(() => {
    try { const parsed = JSON.parse(localStorage.getItem('alloflow_hub_educator_usage') || '{}'); return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}; }
    catch (_) { return {}; }
  });
  const [hubCollapsedSections, setHubCollapsedSections] = React.useState(() => {
    try { const parsed = JSON.parse(localStorage.getItem('alloflow_hub_educator_collapsed') || '[]'); return Array.isArray(parsed) ? parsed : []; }
    catch (_) { return []; }
  });
  const [hubRoleOverride, setHubRoleOverride] = React.useState(() => {
    try { const value = localStorage.getItem('alloflow_hub_educator_role'); return typeof value === 'string' ? value : ''; }
    catch (_) { return ''; }
  });
  const toggleHubFavorite = (id) => setHubFavoriteIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  const toggleHubSection = (id) => setHubCollapsedSections((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  const activateHubCard = (id) => {
    const grid = hubGridRef.current;
    if (!grid) return;
    const shell = Array.from(grid.querySelectorAll('[data-hub-id]')).find((element) => element.dataset.hubId === id);
    const launch = shell && shell.querySelector('[data-hub-launch]');
    if (launch) launch.click();
  };
  React.useEffect(() => {
    try { localStorage.setItem('alloflow_hub_educator_favorites', JSON.stringify(hubFavoriteIds)); } catch (_) {}
  }, [hubFavoriteIds]);
  React.useEffect(() => {
    try { localStorage.setItem('alloflow_hub_educator_recent', JSON.stringify(hubRecentIds)); } catch (_) {}
  }, [hubRecentIds]);
  React.useEffect(() => {
    try { localStorage.setItem('alloflow_hub_educator_usage', JSON.stringify(hubUsageCounts)); } catch (_) {}
  }, [hubUsageCounts]);
  React.useEffect(() => {
    try { localStorage.setItem('alloflow_hub_educator_collapsed', JSON.stringify(hubCollapsedSections)); } catch (_) {}
  }, [hubCollapsedSections]);
  React.useEffect(() => {
    try { localStorage.setItem('alloflow_hub_educator_role', hubRoleOverride); } catch (_) {}
  }, [hubRoleOverride]);
  React.useEffect(() => {
    const grid = hubGridRef.current;
    if (!grid) return undefined;
    const shells = Array.from(grid.querySelectorAll('[data-hub-id]'));
    setHubCards(shells.map((shell) => ({ id: shell.dataset.hubId, label: shell.dataset.hubLabel, section: shell.dataset.hubSection })));
    const remember = (event) => {
      const launch = event.target && event.target.closest ? event.target.closest('[data-hub-launch]') : null;
      const shell = launch && launch.closest('[data-hub-id]');
      if (!shell || event.target.closest('[data-hub-favorite]')) return;
      const id = shell.dataset.hubId;
      setHubRecentIds((current) => [id, ...current.filter((value) => value !== id)].slice(0, 5));
      setHubUsageCounts((current) => ({ ...current, [id]: (Number(current[id]) || 0) + 1 }));
    };
    grid.addEventListener('click', remember, true);
    return () => grid.removeEventListener('click', remember, true);
  }, []);
  React.useEffect(() => {
    const grid = hubGridRef.current;
    if (!grid) return;
    const query = hubQuery.trim().toLowerCase();
    const shells = Array.from(grid.querySelectorAll('[data-hub-id]'));
    const visibleSections = new Set();
    let count = 0;
    shells.forEach((shell) => {
      const text = (shell.textContent || '').toLowerCase();
      const sectionCollapsed = hubCollapsedSections.includes(shell.dataset.hubSection);
      const visible = (!query || text.includes(query)) && (!hubFavoritesOnly || hubFavoriteIds.includes(shell.dataset.hubId)) && (!sectionCollapsed || query || hubFavoritesOnly);
      shell.hidden = !visible;
      shell.setAttribute('aria-hidden', visible ? 'false' : 'true');
      if (visible) { visibleSections.add(shell.dataset.hubSection); count += 1; }
    });
    Array.from(grid.querySelectorAll('[data-hub-section-heading]')).forEach((heading) => {
      const sectionId = heading.dataset.hubSectionHeading;
      const filtered = Boolean(query || hubFavoritesOnly);
      const visible = !filtered || visibleSections.has(sectionId);
      heading.hidden = !visible;
      const toggle = heading.querySelector('[data-hub-section-toggle]');
      if (toggle) {
        const collapsed = hubCollapsedSections.includes(sectionId);
        const effectiveCollapsed = collapsed && !filtered;
        toggle.setAttribute('aria-expanded', effectiveCollapsed ? 'false' : 'true');
        toggle.textContent = effectiveCollapsed ? '+' : '-';
      }
    });
    setHubVisibleCount(count);
  }, [hubQuery, hubFavoritesOnly, hubFavoriteIds, hubCards, hubCollapsedSections]);
  const hubRolePreference = hubRoleOverride || userRole || 'educator';
  const hubRoleRaw = String(hubRolePreference).toLowerCase();
  const hubRoleKey = hubRoleRaw.includes('clin') ? 'clinician' : (hubRoleRaw.includes('lead') || hubRoleRaw.includes('admin') || hubRoleRaw.includes('principal') || hubRoleRaw.includes('coach')) ? 'leader' : hubRoleRaw.includes('student') ? 'student' : hubRoleRaw.includes('family') ? 'family' : 'educator';
  const hubRoleLabel = ({ educator: 'educators', clinician: 'clinicians', leader: 'leaders', student: 'students', family: 'families' }[hubRoleKey] || 'educators');
  const hubRoleRecommendations = { educator: ['lesson', 'document', 'lumen', 'whiteboard', 'page-designer'], clinician: ['behavior-lens', 'dynamic-assessment', 'report-writer', 'lumen', 'accessibility-lab'], leader: ['leadership-hub', 'community-catalog', 'professional-development', 'document', 'lumen'], student: ['lumen', 'reading-library', 'stem-lab', 'text-inquiry', 'test-prep'], family: ['reading-library', 'lingua-practice', 'sel-hub', 'allohaven', 'storyforge'] };
  const hubUsageRankedIds = Object.entries(hubUsageCounts).sort((a, b) => Number(b[1]) - Number(a[1])).map(([id]) => id);
  const hubRecommendedIds = Array.from(new Set([...(hubRoleRecommendations[hubRoleKey] || hubRoleRecommendations.educator), ...hubUsageRankedIds])).slice(0, 5);
  const recommendedCards = hubRecommendedIds.map((id) => hubCards.find((card) => card.id === id)).filter(Boolean);
  const quickCards = Array.from(new Set([...hubFavoriteIds, ...hubRecentIds])).map((id) => hubCards.find((card) => card.id === id)).filter(Boolean);
  return (
        <div className="fixed inset-0 z-[260] bg-black/40 flex items-center justify-center overflow-y-auto p-3 sm:p-4" style={{ zIndex: 260 }} role="presentation" onClick={() => setShowEducatorHub(false)}>
          {/* allo-docsuite: portal modal rendered OUTSIDE the .allo-docsuite content wrapper,
              so the theme-dark gradient/text remaps never reached its pastel cards. Opting into
              the scope class inherits the existing dark remap (from-*-50 -> dark, text -> light).
              No-op in light mode (all .allo-docsuite rules are .theme-dark / .theme-contrast). */}
          <div ref={dialogRef} tabIndex={-1} data-help-key="educator_hub_modal_panel" className="allo-docsuite bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-5 sm:p-8 max-h-[90vh] overflow-y-auto focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2" style={{ maxHeight: '90vh' }} role="dialog" aria-modal="true" aria-labelledby="educator-hub-title" aria-describedby="educator-hub-subtitle" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 id="educator-hub-title" className="text-xl font-bold text-slate-800 flex items-center gap-2"><span aria-hidden="true">🛠️</span> {t('educator_hub.title') || 'Educator Tools'}</h2>
                <p id="educator-hub-subtitle" className="text-sm text-slate-600 mt-1">{t('educator_hub.subtitle') || 'Professional tools for educators and clinicians'}</p>
              </div>
              <button type="button" onClick={() => setShowEducatorHub(false)} className="min-w-11 min-h-11 p-2 inline-flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors text-xl" aria-label={t('educator_hub.close_aria') || 'Close educator tools'}>✕</button>
            </div>

            <div className="mb-4 space-y-3" role="search" aria-label={tr('hub.search_label', 'Search tools')}>
              <div className="flex flex-col sm:flex-row gap-2">
                <label htmlFor="educator-hub-search" className="sr-only">{tr('hub.search_label', 'Search tools')}</label>
                <input id="educator-hub-search" type="search" value={hubQuery} onChange={(event) => setHubQuery(event.target.value)} placeholder={tr('hub.search_placeholder', 'Search tools by name, purpose, or workflow')} className="min-h-11 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                {hubQuery && <button type="button" onClick={() => setHubQuery('')} className="min-h-11 px-3 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50">{tr('hub.clear_search', 'Clear')}</button>}
                <button type="button" aria-pressed={hubFavoritesOnly} onClick={() => setHubFavoritesOnly((value) => !value)} className="min-h-11 px-3 rounded-xl border border-amber-300 bg-amber-50 text-sm font-bold text-amber-800 hover:bg-amber-100">{hubFavoritesOnly ? '★ ' : '☆ '}{tr('hub.favorites_only', 'Favorites')}</button>
                <button type="button" aria-expanded={hubManageFavorites} onClick={() => setHubManageFavorites((value) => !value)} className="min-h-11 px-3 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50">{tr('hub.manage_favorites', 'Manage favorites')}</button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="educator-hub-role" className="text-xs font-bold text-slate-600">{tr('hub.role_label', 'Recommendations for')}</label>
                <select id="educator-hub-role" value={hubRoleKey} onChange={(event) => setHubRoleOverride(event.target.value)} className="min-h-10 rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="educator">{tr('hub.role_educator', 'Educators')}</option>
                    <option value="clinician">{tr('hub.role_clinician', 'Clinicians')}</option>
                    <option value="leader">{tr('hub.role_leader', 'Leaders')}</option>
                    <option value="student">{tr('hub.role_student', 'Students')}</option>
                    <option value="family">{tr('hub.role_family', 'Families')}</option>
                </select>
              </div>
              {recommendedCards.length > 0 && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3" role="region" aria-label={tr('hub.recommended', 'Recommended tools')}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="text-xs font-black uppercase tracking-wide text-emerald-800">{tr('hub.recommended', 'Recommended tools')}</h3>
                    <span className="text-[11px] text-emerald-700">{tr('hub.recommended_for', 'For')} {hubRoleLabel}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recommendedCards.map((card) => (
                      <button key={card.id} type="button" onClick={() => activateHubCard(card.id)} className="min-h-10 rounded-lg border border-emerald-200 bg-white px-3 text-left text-xs font-bold text-emerald-800 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500">{card.label}</button>
                    ))}
                  </div>
                  <p className="text-[11px] text-emerald-700 mt-2">{tr('hub.recommended_hint', 'Based on your role and local tool use')}</p>
                </div>
              )}
              {hubManageFavorites && hubCards.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3" role="region" aria-label={tr('hub.manage_favorites', 'Manage favorites')}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {hubCards.map((card) => (
                      <div key={card.id} className="flex items-center gap-2 rounded-lg bg-white border border-slate-200 p-2">
                        <button type="button" onClick={() => activateHubCard(card.id)} className="min-h-10 flex-1 text-left text-sm font-semibold text-slate-700 hover:text-indigo-700">{card.label}</button>
                        <button type="button" data-hub-favorite="true" aria-pressed={hubFavoriteIds.includes(card.id)} aria-label={hubFavoriteIds.includes(card.id) ? tr('hub.remove_favorite', 'Remove from favorites') + ': ' + card.label : tr('hub.add_favorite', 'Add to favorites') + ': ' + card.label} onClick={() => toggleHubFavorite(card.id)} className="min-w-9 min-h-9 rounded-full text-amber-600 text-lg hover:bg-amber-50">{hubFavoriteIds.includes(card.id) ? '★' : '☆'}</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {quickCards.length > 0 && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3" role="region" aria-label={tr('hub.quick_access', 'Quick access')}>
                  <div className="flex items-center justify-between gap-2 mb-2"><h3 className="text-xs font-black uppercase tracking-wide text-indigo-800">{tr('hub.quick_access', 'Quick access')}</h3><span className="text-[11px] text-indigo-700">{tr('hub.quick_access_hint', 'Recent and favorite tools')}</span></div>
                  <div className="flex flex-wrap gap-2">
                    {quickCards.map((card) => (
                      <div key={card.id} className="inline-flex items-center rounded-lg border border-indigo-200 bg-white shadow-sm">
                        <button type="button" onClick={() => activateHubCard(card.id)} className="min-h-10 px-3 text-left text-xs font-bold text-indigo-800 hover:bg-indigo-50">{card.label}</button>
                        <button type="button" aria-pressed={hubFavoriteIds.includes(card.id)} aria-label={hubFavoriteIds.includes(card.id) ? tr('hub.remove_favorite', 'Remove from favorites') + ': ' + card.label : tr('hub.add_favorite', 'Add to favorites') + ': ' + card.label} onClick={() => toggleHubFavorite(card.id)} className="min-w-9 min-h-10 border-l border-indigo-200 text-amber-600 text-lg hover:bg-amber-50">{hubFavoriteIds.includes(card.id) ? '★' : '☆'}</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="sr-only" aria-live="polite">{hubVisibleCount} {tr('hub.tools_available', 'tools available')}</p>
            </div>
            <div ref={hubGridRef} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="col-span-full mt-1 mb-[-0.25rem]" data-hub-section-heading="start">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-black uppercase tracking-wide text-indigo-800">{tr('educator_hub.section_start_title', 'Start here')}</h3>
                    <p className="text-xs text-slate-500 mt-1">{tr('educator_hub.section_start_desc', 'Plan the next lesson, gather evidence, and prepare the materials students will use.')}</p>
                  </div>
                  <button type="button" data-hub-section-toggle="start" aria-expanded={!hubCollapsedSections.includes('start')} aria-label={hubCollapsedSections.includes('start') ? tr('hub.expand_section', 'Expand section') : tr('hub.collapse_section', 'Collapse section')} onClick={() => toggleHubSection('start')} className="min-h-11 min-w-11 rounded-lg border border-slate-300 bg-white text-slate-700 text-lg font-black hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubCollapsedSections.includes('start') ? '+' : '-'}</button>
                </div>
              </div>
              <div className="relative group" data-hub-id="lesson" data-hub-label="Help me build a lesson" data-hub-section="start">
                <button type="button" data-hub-launch="true" data-help-key="educator_hub_lesson_builder_card" onClick={() => { setShowEducatorHub(false); startLessonFlow(); }} className="flex items-start gap-3 p-4 bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-left">
                <span className="text-3xl mt-1" aria-hidden="true">🪄</span>
                <div>
                  <h3 className="font-bold text-indigo-800">{t('educator_hub.lesson_builder_title') || 'Help me build a lesson'}</h3>
                  <p className="text-xs text-indigo-600 mt-1">{t('educator_hub.lesson_builder_desc') || "Answer a few questions, then build a differentiated lesson step by step with AlloBot."}</p>
                </div>
              </button>

                <button type="button" data-hub-favorite="true" aria-pressed={hubFavoriteIds.includes('lesson')} aria-label={hubFavoriteIds.includes('lesson') ? tr('hub.remove_favorite', 'Remove from favorites') + ': Help me build a lesson' : tr('hub.add_favorite', 'Add to favorites') + ': Help me build a lesson'} title={hubFavoriteIds.includes('lesson') ? tr('hub.remove_favorite', 'Remove from favorites') : tr('hub.add_favorite', 'Add to favorites')} onClick={(event) => { event.stopPropagation(); toggleHubFavorite('lesson'); }} className="absolute top-2 right-2 z-10 min-w-9 min-h-9 rounded-full bg-white/90 border border-slate-300 text-amber-600 text-lg leading-none shadow-sm hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubFavoriteIds.includes('lesson') ? '★' : '☆'}</button>
              </div>
              <div className="relative group" data-hub-id="lumen" data-hub-label="Lumen" data-hub-section="start">
                <button type="button" data-hub-launch="true" data-help-key="educator_hub_lumen_card" onClick={() => { setShowEducatorHub(false); setLabToolData(prev => ({ ...prev, lumen: { ...((prev && prev.lumen) || {}), mode: 'home' } })); setStemLabTool('lumen'); setShowStemLab(true); }} className="flex items-start gap-3 p-4 bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-left">
                <span className="text-3xl mt-1" aria-hidden="true">💡</span>
                <div>
                  <h3 className="font-bold text-amber-800">{t('educator_hub.lumen_title') || 'Lumen'}</h3>
                  <p className="text-xs text-amber-600 mt-1">{t('educator_hub.lumen_desc') || 'Research sources or explore data in one evidence workspace. Cite exact passages and keep uncertainty and provenance visible.'}</p>
                </div>
              </button>

                <button type="button" data-hub-favorite="true" aria-pressed={hubFavoriteIds.includes('lumen')} aria-label={hubFavoriteIds.includes('lumen') ? tr('hub.remove_favorite', 'Remove from favorites') + ': Lumen' : tr('hub.add_favorite', 'Add to favorites') + ': Lumen'} title={hubFavoriteIds.includes('lumen') ? tr('hub.remove_favorite', 'Remove from favorites') : tr('hub.add_favorite', 'Add to favorites')} onClick={(event) => { event.stopPropagation(); toggleHubFavorite('lumen'); }} className="absolute top-2 right-2 z-10 min-w-9 min-h-9 rounded-full bg-white/90 border border-slate-300 text-amber-600 text-lg leading-none shadow-sm hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubFavoriteIds.includes('lumen') ? '★' : '☆'}</button>
              </div>
              <div className="relative group" data-hub-id="document" data-hub-label="Document Hub" data-hub-section="start">
                <button type="button" data-hub-launch="true" data-help-key="educator_hub_document_hub_card" onClick={() => { setShowEducatorHub(false); openExportPreview('print'); }} className="flex items-start gap-3 p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-left">
                <span className="text-3xl mt-1" aria-hidden="true">📄</span>
                <div>
                  <h3 className="font-bold text-emerald-800">{t('educator_hub.document_hub_title') || 'Document Hub'}</h3>
                  <p className="text-xs text-emerald-600 mt-1">{t('educator_hub.document_hub_desc') || 'Build polished documents, audit accessibility, and export to PDF, HTML, worksheets, or slides.'}</p>
                </div>
              </button>

                <button type="button" data-hub-favorite="true" aria-pressed={hubFavoriteIds.includes('document')} aria-label={hubFavoriteIds.includes('document') ? tr('hub.remove_favorite', 'Remove from favorites') + ': Document Hub' : tr('hub.add_favorite', 'Add to favorites') + ': Document Hub'} title={hubFavoriteIds.includes('document') ? tr('hub.remove_favorite', 'Remove from favorites') : tr('hub.add_favorite', 'Add to favorites')} onClick={(event) => { event.stopPropagation(); toggleHubFavorite('document'); }} className="absolute top-2 right-2 z-10 min-w-9 min-h-9 rounded-full bg-white/90 border border-slate-300 text-amber-600 text-lg leading-none shadow-sm hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubFavoriteIds.includes('document') ? '★' : '☆'}</button>
              </div>
              <div className="relative group" data-hub-id="whiteboard" data-hub-label="Whiteboard" data-hub-section="start">
                <button type="button" data-hub-launch="true" data-help-key="educator_hub_whiteboard_card" onClick={() => { setShowEducatorHub(false); try { openWhiteboard(); } catch (_e) {} }} className="flex items-start gap-3 p-4 bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-left">
                <span className="text-3xl mt-1" aria-hidden="true">✏️</span>
                <div>
                  <h3 className="font-bold text-indigo-800">{t('educator_hub.whiteboard_title') || 'Whiteboard'}</h3>
                  <p className="text-xs text-indigo-600 mt-1">{t('educator_hub.whiteboard_desc') || 'Sketch ideas, build diagrams, and map thinking with graphic organizers and one-click image export.'}</p>
                </div>
              </button>

                <button type="button" data-hub-favorite="true" aria-pressed={hubFavoriteIds.includes('whiteboard')} aria-label={hubFavoriteIds.includes('whiteboard') ? tr('hub.remove_favorite', 'Remove from favorites') + ': Whiteboard' : tr('hub.add_favorite', 'Add to favorites') + ': Whiteboard'} title={hubFavoriteIds.includes('whiteboard') ? tr('hub.remove_favorite', 'Remove from favorites') : tr('hub.add_favorite', 'Add to favorites')} onClick={(event) => { event.stopPropagation(); toggleHubFavorite('whiteboard'); }} className="absolute top-2 right-2 z-10 min-w-9 min-h-9 rounded-full bg-white/90 border border-slate-300 text-amber-600 text-lg leading-none shadow-sm hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubFavoriteIds.includes('whiteboard') ? '★' : '☆'}</button>
              </div>
                            <div className="col-span-full mt-1 mb-[-0.25rem]" data-hub-section-heading="plan">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-black uppercase tracking-wide text-indigo-800">{tr('educator_hub.section_plan_title', 'Plan and create')}</h3>
                    <p className="text-xs text-slate-500 mt-1">{tr('educator_hub.section_plan_desc', 'Turn ideas and evidence into lessons, documents, and accessible learning materials.')}</p>
                  </div>
                  <button type="button" data-hub-section-toggle="plan" aria-expanded={!hubCollapsedSections.includes('plan')} aria-label={hubCollapsedSections.includes('plan') ? tr('hub.expand_section', 'Expand section') : tr('hub.collapse_section', 'Collapse section')} onClick={() => toggleHubSection('plan')} className="min-h-11 min-w-11 rounded-lg border border-slate-300 bg-white text-slate-700 text-lg font-black hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubCollapsedSections.includes('plan') ? '+' : '-'}</button>
                </div>
              </div>
              <div className="relative group" data-hub-id="throughline" data-hub-label="Learning Web: Unit Path" data-hub-section="plan">
                <button type="button" data-hub-launch="true" onClick={() => { setShowEducatorHub(false); setShowMindMap(true); }} className="flex items-start gap-3 p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-left">
                <span className="text-3xl mt-1" aria-hidden="true">{'🗺️'}</span>
                <div>
                  <h3 className="font-bold text-amber-800">{t('educator_hub.throughline_title') || 'Learning Web: Unit Path'}</h3>
                  <p className="text-xs text-amber-700 mt-1">{t('educator_hub.throughline_desc') || 'Arrange lessons into a teachable sequence, then inspect linked standards and evidence in the shared Learning Web.'}</p>
                </div>
              </button>

                <button type="button" data-hub-favorite="true" aria-pressed={hubFavoriteIds.includes('throughline')} aria-label={hubFavoriteIds.includes('throughline') ? tr('hub.remove_favorite', 'Remove from favorites') + ': Learning Web: Unit Path' : tr('hub.add_favorite', 'Add to favorites') + ': Learning Web: Unit Path'} title={hubFavoriteIds.includes('throughline') ? tr('hub.remove_favorite', 'Remove from favorites') : tr('hub.add_favorite', 'Add to favorites')} onClick={(event) => { event.stopPropagation(); toggleHubFavorite('throughline'); }} className="absolute top-2 right-2 z-10 min-w-9 min-h-9 rounded-full bg-white/90 border border-slate-300 text-amber-600 text-lg leading-none shadow-sm hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubFavoriteIds.includes('throughline') ? '★' : '☆'}</button>
              </div>              <div className="relative group" data-hub-id="page-designer" data-hub-label="Page Designer" data-hub-section="plan">
                <button type="button" data-hub-launch="true" data-help-key="educator_hub_allo_studio_card" onClick={() => { setShowEducatorHub(false); setIsAlloStudioOpen(true); }} className="flex items-start gap-3 p-4 bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-left">
                <span className="text-3xl mt-1" aria-hidden="true">🎨</span>
                <div>
                  <h3 className="font-bold text-rose-800">{t('educator_hub.allo_studio_title') || 'Page Designer'}</h3>
                  <p className="text-xs text-rose-600 mt-1">{t('educator_hub.allo_studio_desc') || 'Create flyers, worksheets, posters, and slide decks with accessible exports, reading order, alt text, and a hand/AI process record.'}</p>
                </div>
              </button>

                <button type="button" data-hub-favorite="true" aria-pressed={hubFavoriteIds.includes('page-designer')} aria-label={hubFavoriteIds.includes('page-designer') ? tr('hub.remove_favorite', 'Remove from favorites') + ': Page Designer' : tr('hub.add_favorite', 'Add to favorites') + ': Page Designer'} title={hubFavoriteIds.includes('page-designer') ? tr('hub.remove_favorite', 'Remove from favorites') : tr('hub.add_favorite', 'Add to favorites')} onClick={(event) => { event.stopPropagation(); toggleHubFavorite('page-designer'); }} className="absolute top-2 right-2 z-10 min-w-9 min-h-9 rounded-full bg-white/90 border border-slate-300 text-amber-600 text-lg leading-none shadow-sm hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubFavoriteIds.includes('page-designer') ? '★' : '☆'}</button>
              </div>
              <div className="relative group" data-hub-id="video-studio" data-hub-label="Video Studio" data-hub-section="plan">
                <button type="button" data-hub-launch="true" data-help-key="educator_hub_video_studio_card" onClick={() => { setShowEducatorHub(false); setIsVideoStudioOpen(true); }} className="flex items-start gap-3 p-4 bg-gradient-to-br from-sky-50 to-indigo-50 border border-sky-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-left">
                <span className="text-3xl mt-1" aria-hidden="true">🎥</span>
                <div>
                  <h3 className="font-bold text-sky-800">{t('educator_hub.video_studio_title') || 'Video Studio'}</h3>
                  <p className="text-xs text-sky-600 mt-1">{t('educator_hub.video_studio_desc') || 'Record, trim, caption, and export short videos, with prompt tools for NotebookLM and other AI video tools.'}</p>
                </div>
              </button>

                <button type="button" data-hub-favorite="true" aria-pressed={hubFavoriteIds.includes('video-studio')} aria-label={hubFavoriteIds.includes('video-studio') ? tr('hub.remove_favorite', 'Remove from favorites') + ': Video Studio' : tr('hub.add_favorite', 'Add to favorites') + ': Video Studio'} title={hubFavoriteIds.includes('video-studio') ? tr('hub.remove_favorite', 'Remove from favorites') : tr('hub.add_favorite', 'Add to favorites')} onClick={(event) => { event.stopPropagation(); toggleHubFavorite('video-studio'); }} className="absolute top-2 right-2 z-10 min-w-9 min-h-9 rounded-full bg-white/90 border border-slate-300 text-amber-600 text-lg leading-none shadow-sm hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubFavoriteIds.includes('video-studio') ? '★' : '☆'}</button>
              </div>
              <div className="relative group" data-hub-id="symbol-studio" data-hub-label="Symbol Studio" data-hub-section="plan">
                <button type="button" data-hub-launch="true" data-help-key="educator_hub_symbol_studio_card" onClick={() => { setShowEducatorHub(false); setIsSymbolStudioOpen(true); }} className="flex items-start gap-3 p-4 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-left">
                <span className="text-3xl mt-1" aria-hidden="true">🎨</span>
                <div>
                  <h3 className="font-bold text-purple-800">{t('educator_hub.symbol_studio_title') || 'Symbol Studio'}</h3>
                  <p className="text-xs text-purple-600 mt-1">{t('educator_hub.symbol_studio_desc') || 'Create PCS-style icons for visual supports, AAC boards, and schedules — then edit them with image-to-image tools.'}</p>
                </div>
              </button>

                <button type="button" data-hub-favorite="true" aria-pressed={hubFavoriteIds.includes('symbol-studio')} aria-label={hubFavoriteIds.includes('symbol-studio') ? tr('hub.remove_favorite', 'Remove from favorites') + ': Symbol Studio' : tr('hub.add_favorite', 'Add to favorites') + ': Symbol Studio'} title={hubFavoriteIds.includes('symbol-studio') ? tr('hub.remove_favorite', 'Remove from favorites') : tr('hub.add_favorite', 'Add to favorites')} onClick={(event) => { event.stopPropagation(); toggleHubFavorite('symbol-studio'); }} className="absolute top-2 right-2 z-10 min-w-9 min-h-9 rounded-full bg-white/90 border border-slate-300 text-amber-600 text-lg leading-none shadow-sm hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubFavoriteIds.includes('symbol-studio') ? '★' : '☆'}</button>
              </div>
              <div className="relative group" data-hub-id="allosheet" data-hub-label="AlloSheet" data-hub-section="plan">
                <button type="button" data-hub-launch="true" data-help-key="educator_hub_allosheet_card" onClick={_openAlloSheet} className="flex items-start gap-3 p-4 bg-gradient-to-br from-emerald-50 to-cyan-50 border border-emerald-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-left">
                <span className="text-3xl mt-1" aria-hidden="true">📊</span>
                <div>
                  <h3 className="font-bold text-emerald-800">{t('educator_hub.allosheet_title') || 'AlloSheet (Pilot)'}</h3>
                  <p className="text-xs text-emerald-700 mt-1">{t('educator_hub.allosheet_desc') || 'Explore educator data with agent assistance, review every change before applying it, and run local audits.'}</p>
                </div>
              </button>

                <button type="button" data-hub-favorite="true" aria-pressed={hubFavoriteIds.includes('allosheet')} aria-label={hubFavoriteIds.includes('allosheet') ? tr('hub.remove_favorite', 'Remove from favorites') + ': AlloSheet' : tr('hub.add_favorite', 'Add to favorites') + ': AlloSheet'} title={hubFavoriteIds.includes('allosheet') ? tr('hub.remove_favorite', 'Remove from favorites') : tr('hub.add_favorite', 'Add to favorites')} onClick={(event) => { event.stopPropagation(); toggleHubFavorite('allosheet'); }} className="absolute top-2 right-2 z-10 min-w-9 min-h-9 rounded-full bg-white/90 border border-slate-300 text-amber-600 text-lg leading-none shadow-sm hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubFavoriteIds.includes('allosheet') ? '★' : '☆'}</button>
              </div>
                            <div className="col-span-full mt-1 mb-[-0.25rem]" data-hub-section-heading="teach">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-black uppercase tracking-wide text-indigo-800">{tr('educator_hub.section_teach_title', 'Teach and assess')}</h3>
                    <p className="text-xs text-slate-500 mt-1">{tr('educator_hub.section_teach_desc', 'Run activities, collect evidence, and respond to learner needs.')}</p>
                  </div>
                  <button type="button" data-hub-section-toggle="teach" aria-expanded={!hubCollapsedSections.includes('teach')} aria-label={hubCollapsedSections.includes('teach') ? tr('hub.expand_section', 'Expand section') : tr('hub.collapse_section', 'Collapse section')} onClick={() => toggleHubSection('teach')} className="min-h-11 min-w-11 rounded-lg border border-slate-300 bg-white text-slate-700 text-lg font-black hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubCollapsedSections.includes('teach') ? '+' : '-'}</button>
                </div>
              </div>
              <div className="relative group" data-hub-id="polls-signups" data-hub-label="Polls &amp; Sign-ups" data-hub-section="teach">
                <button type="button" data-hub-launch="true" data-help-key="educator_hub_activities_card" onClick={() => { setShowEducatorHub(false); setShowRecentQrShares(true); }} className="flex items-start gap-3 rounded-xl border border-teal-200 bg-teal-50 p-4 text-left transition-colors hover:bg-teal-100">
                <span className="text-3xl mt-1" aria-hidden="true">🗓️</span>
                <div>
                  <h3 className="font-bold text-teal-800">{t('educator_hub.activities_title') || 'Polls & Sign-ups'}</h3>
                  <p className="text-xs text-teal-600 mt-1">{t('educator_hub.activities_desc') || 'Schedule a meeting, collect sign-ups, or run a quick word cloud or rating. Share by link or QR code — no account required.'}</p>
                </div>
              </button>

                <button type="button" data-hub-favorite="true" aria-pressed={hubFavoriteIds.includes('polls-signups')} aria-label={hubFavoriteIds.includes('polls-signups') ? tr('hub.remove_favorite', 'Remove from favorites') + ': Polls &amp; Sign-ups' : tr('hub.add_favorite', 'Add to favorites') + ': Polls &amp; Sign-ups'} title={hubFavoriteIds.includes('polls-signups') ? tr('hub.remove_favorite', 'Remove from favorites') : tr('hub.add_favorite', 'Add to favorites')} onClick={(event) => { event.stopPropagation(); toggleHubFavorite('polls-signups'); }} className="absolute top-2 right-2 z-10 min-w-9 min-h-9 rounded-full bg-white/90 border border-slate-300 text-amber-600 text-lg leading-none shadow-sm hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubFavoriteIds.includes('polls-signups') ? '★' : '☆'}</button>
              </div>
              <div className="relative group" data-hub-id="dynamic-assessment" data-hub-label="Dynamic Assessment" data-hub-section="teach">
                <button type="button" data-hub-launch="true" data-help-key="educator_hub_dynamic_assessment_card" onClick={() => { setShowEducatorHub(false); setIsDynamicAssessmentOpen(true); }} className="flex items-start gap-3 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-left">
                <span className="text-3xl mt-1" aria-hidden="true">🔬</span>
                <div>
                  <h3 className="font-bold text-blue-800">{t('educator_hub.dynamic_assessment_title') || 'Dynamic Assessment'}</h3>
                  <p className="text-xs text-blue-600 mt-1">{t('educator_hub.dynamic_assessment_desc') || 'Run test-teach-retest probes with graduated prompts, modifiability scoring, IEP goals, and family/teacher handoffs.'}</p>
                </div>
              </button>

                <button type="button" data-hub-favorite="true" aria-pressed={hubFavoriteIds.includes('dynamic-assessment')} aria-label={hubFavoriteIds.includes('dynamic-assessment') ? tr('hub.remove_favorite', 'Remove from favorites') + ': Dynamic Assessment' : tr('hub.add_favorite', 'Add to favorites') + ': Dynamic Assessment'} title={hubFavoriteIds.includes('dynamic-assessment') ? tr('hub.remove_favorite', 'Remove from favorites') : tr('hub.add_favorite', 'Add to favorites')} onClick={(event) => { event.stopPropagation(); toggleHubFavorite('dynamic-assessment'); }} className="absolute top-2 right-2 z-10 min-w-9 min-h-9 rounded-full bg-white/90 border border-slate-300 text-amber-600 text-lg leading-none shadow-sm hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubFavoriteIds.includes('dynamic-assessment') ? '★' : '☆'}</button>
              </div>
              <div className="relative group" data-hub-id="behavior-lens" data-hub-label="BehaviorLens" data-hub-section="teach">
                <button type="button" data-hub-launch="true" data-help-key="educator_hub_behavior_lens_card" onClick={() => { setShowEducatorHub(false); setShowBehaviorLens(true); }} className="flex items-start gap-3 p-4 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-left">
                <span className="text-3xl mt-1" aria-hidden="true">🧠</span>
                <div>
                  <h3 className="font-bold text-indigo-800">{t('educator_hub.behavior_lens_title') || 'BehaviorLens'}</h3>
                  <p className="text-xs text-indigo-600 mt-1">{t('educator_hub.behavior_lens_desc') || 'Collect ABC observations, build FBA/BIP data, and use 60+ tools for behavior support.'}</p>
                </div>
              </button>

                <button type="button" data-hub-favorite="true" aria-pressed={hubFavoriteIds.includes('behavior-lens')} aria-label={hubFavoriteIds.includes('behavior-lens') ? tr('hub.remove_favorite', 'Remove from favorites') + ': BehaviorLens' : tr('hub.add_favorite', 'Add to favorites') + ': BehaviorLens'} title={hubFavoriteIds.includes('behavior-lens') ? tr('hub.remove_favorite', 'Remove from favorites') : tr('hub.add_favorite', 'Add to favorites')} onClick={(event) => { event.stopPropagation(); toggleHubFavorite('behavior-lens'); }} className="absolute top-2 right-2 z-10 min-w-9 min-h-9 rounded-full bg-white/90 border border-slate-300 text-amber-600 text-lg leading-none shadow-sm hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubFavoriteIds.includes('behavior-lens') ? '★' : '☆'}</button>
              </div>
              <div className="relative group" data-hub-id="report-writer" data-hub-label="Report Writer" data-hub-section="teach">
                <button type="button" data-hub-launch="true" data-help-key="educator_hub_report_writer_card" onClick={() => { setShowEducatorHub(false); setShowReportWriter(true); }} className="flex items-start gap-3 p-4 bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-left">
                <span className="text-3xl mt-1" aria-hidden="true">📝</span>
                <div>
                  <h3 className="font-bold text-violet-800">{t('educator_hub.report_writer_title') || 'Report Writer'}</h3>
                  <p className="text-xs text-violet-600 mt-1">{t('educator_hub.report_writer_desc') || 'Draft clinical reports with fact chunks, accuracy checks, and developmental norms.'}</p>
                </div>
              </button>

                <button type="button" data-hub-favorite="true" aria-pressed={hubFavoriteIds.includes('report-writer')} aria-label={hubFavoriteIds.includes('report-writer') ? tr('hub.remove_favorite', 'Remove from favorites') + ': Report Writer' : tr('hub.add_favorite', 'Add to favorites') + ': Report Writer'} title={hubFavoriteIds.includes('report-writer') ? tr('hub.remove_favorite', 'Remove from favorites') : tr('hub.add_favorite', 'Add to favorites')} onClick={(event) => { event.stopPropagation(); toggleHubFavorite('report-writer'); }} className="absolute top-2 right-2 z-10 min-w-9 min-h-9 rounded-full bg-white/90 border border-slate-300 text-amber-600 text-lg leading-none shadow-sm hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubFavoriteIds.includes('report-writer') ? '★' : '☆'}</button>
              </div>
                            <div className="col-span-full mt-1 mb-[-0.25rem]" data-hub-section-heading="access">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-black uppercase tracking-wide text-indigo-800">{tr('educator_hub.section_access_title', 'Access and review')}</h3>
                    <p className="text-xs text-slate-500 mt-1">{tr('educator_hub.section_access_desc', 'Verify that materials work for every learner before sharing them.')}</p>
                  </div>
                  <button type="button" data-hub-section-toggle="access" aria-expanded={!hubCollapsedSections.includes('access')} aria-label={hubCollapsedSections.includes('access') ? tr('hub.expand_section', 'Expand section') : tr('hub.collapse_section', 'Collapse section')} onClick={() => toggleHubSection('access')} className="min-h-11 min-w-11 rounded-lg border border-slate-300 bg-white text-slate-700 text-lg font-black hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubCollapsedSections.includes('access') ? '+' : '-'}</button>
                </div>
              </div>
              <div className="relative group" data-hub-id="pdf-accessibility" data-hub-label="PDF Accessibility" data-hub-section="access">
                <button type="button" data-hub-launch="true" disabled={!!pdfBatchIntakeProgress} data-help-key="educator_hub_pdf_accessibility_card" onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.setAttribute('aria-label', t('educator_hub.pdf_upload_label') || 'Select PDF, DOCX, or PPTX files');
                  // PDF / DOCX / PPTX only. image/* was previously offered here but a lone image
                  // fell through to handleFileUpload's image branch — which OCRs into the
                  // lesson-generator text box, NOT the remediation pipeline (this card promises
                  // "audit & remediation"). The pipeline has no client-side image->document
                  // remediation path, so don't advertise it. (To remediate a photo of a document,
                  // save it into a PDF first — scanned PDFs get the full OCR + tag treatment.)
                  input.accept = 'application/pdf,.pdf,.docx,.pptx';
                  input.multiple = true;
                  input.addEventListener('cancel', () => { input.value = ''; });
                  input.onchange = async (e) => {
                      const target = e && e.target;
                      const files = target && target.files ? Array.from(target.files) : [];
                      // Capture the File objects first; clearing the picker lets the same
                      // document trigger a later change event in every supported browser.
                      try { if (target) target.value = ''; } catch (_) {}
                      if (files.length === 0) return;

                      // Single-document intake must use the host handler. It owns the shared
                      // selection epoch, hard reset, type validation, and initial audit launch.
                      if (files.length === 1) {
                          setShowEducatorHub(false);
                          const singleTarget = { files: [files[0]], value: '' };
                          try {
                              await Promise.resolve(handleFileUpload({ target: singleTarget, currentTarget: singleTarget }));
                          } catch (error) {
                              addToast('Could not open "' + (files[0].name || 'document') + '": ' + String((error && error.message) || error || 'unknown error'), 'error');
                          }
                          return;
                      }

                      const pdfFiles = files.filter((file) => {
                          const mime = String(file && file.type || '').toLowerCase();
                          return mime === 'application/pdf' || /\.pdf$/i.test(String(file && file.name || ''));
                      });
                      if (pdfFiles.length <= 1) {
                          addToast('Select one DOCX or PPTX at a time, or select two or more PDFs for batch remediation.', 'warning');
                          return;
                      }

                      // Match the remediation view's browser-safe queue budgets before
                      // FileReader expands any bytes into base64/UTF-16 strings.
                      const batchBudget = _educatorBatchMemoryBudget();
                      const acceptedPdfFiles = [];
                      const oversizedNames = [];
                      let overCount = 0;
                      let overTotal = 0;
                      let acceptedBytes = 0;
                      for (const file of pdfFiles) {
                          const size = Math.max(0, Number(file && file.size) || 0);
                          if (acceptedPdfFiles.length >= _EDUCATOR_BATCH_MAX_FILES) { overCount += 1; continue; }
                          if (size > batchBudget.perFileBytes) { oversizedNames.push(file.name || 'PDF'); continue; }
                          if (acceptedBytes + size > batchBudget.totalBytes) { overTotal += 1; continue; }
                          acceptedBytes += size;
                          acceptedPdfFiles.push(file);
                      }
                      if (overCount) addToast('Batch limit is 60 PDFs; ' + overCount + ' file(s) were not added. Run them as a second batch.', 'warning');
                      if (oversizedNames.length) addToast('Skipped ' + oversizedNames.length + ' PDF(s) over this device\'s ' + Math.round(batchBudget.perFileBytes / 1048576) + ' MB per-file safety limit: ' + oversizedNames.slice(0, 3).join(', ') + (oversizedNames.length > 3 ? '…' : ''), 'warning');
                      if (overTotal) addToast('This device\'s ' + Math.round(batchBudget.totalBytes / 1048576) + ' MB batch memory budget was reached; ' + overTotal + ' file(s) were not added. Run them as a second batch.', 'warning');
                      if (acceptedPdfFiles.length <= 1) {
                          addToast('At least two PDFs must remain after the batch safety limits are applied.', 'warning');
                          return;
                      }

                      let intakeToken;
                      try {
                          intakeToken = await Promise.resolve(beginPdfDocumentIntake({
                              source: 'educator-hub',
                              mode: 'batch',
                              files: acceptedPdfFiles
                          }));
                      } catch (error) {
                          addToast('Could not start the PDF batch: ' + String((error && error.message) || error || 'unknown error'), 'error');
                          return;
                      }
                      const intakeJob = { token: intakeToken, reader: null, cancelRead: null, cancelled: false };
                      pdfBatchIntakeRef.current = intakeJob;
                      const intakeIsCurrent = () => {
                          if (intakeJob.cancelled || pdfBatchIntakeRef.current !== intakeJob) return false;
                          try { return isPdfDocumentIntakeCurrent(intakeToken); }
                          catch (_) { return false; }
                      };
                      if (!intakeIsCurrent()) {
                          if (pdfBatchIntakeRef.current === intakeJob) pdfBatchIntakeRef.current = null;
                          return;
                      }
                      _setPdfBatchIntakeProgressIfMounted({ completed: 0, total: acceptedPdfFiles.length, currentIndex: 0, currentName: '', totalBytes: acceptedBytes });
                      addToast('Preparing ' + acceptedPdfFiles.length + ' PDFs for batch remediation…', 'info');

                      const skippedCount = files.length - pdfFiles.length;
                      if (skippedCount > 0) {
                          addToast(skippedCount + ' non-PDF file' + (skippedCount === 1 ? ' was' : 's were') + ' skipped; PDF batch remediation accepts PDFs only.', 'warning');
                      }

                      // Read sequentially so selection order is deterministic and only one
                      // large data URL is being materialized by FileReader at a time.
                      const batchFiles = new Array(acceptedPdfFiles.length);
                      for (let index = 0; index < acceptedPdfFiles.length; index += 1) {
                          if (!intakeIsCurrent()) {
                              if (pdfBatchIntakeRef.current === intakeJob) pdfBatchIntakeRef.current = null;
                              _setPdfBatchIntakeProgressIfMounted(null);
                              return;
                          }
                          const file = acceptedPdfFiles[index];
                          _setPdfBatchIntakeProgressIfMounted({ completed: index, total: acceptedPdfFiles.length, currentIndex: index + 1, currentName: file.name || 'PDF', totalBytes: acceptedBytes });
                          const outcome = await new Promise((resolve) => {
                              if (!intakeIsCurrent()) { resolve({ stale: true }); return; }
                              let reader;
                              let staleMonitor = null;
                              let settled = false;
                              const finish = (value) => {
                                  if (settled) return;
                                  settled = true;
                                  if (staleMonitor) clearInterval(staleMonitor);
                                  if (intakeJob.reader === reader) intakeJob.reader = null;
                                  intakeJob.cancelRead = null;
                                  resolve(value);
                              };
                              try {
                                  reader = new FileReader();
                                  intakeJob.reader = reader;
                                  intakeJob.cancelRead = () => finish({ cancelled: true });
                                  staleMonitor = setInterval(() => {
                                      if (!intakeIsCurrent()) {
                                          if (reader && typeof reader.abort === 'function') {
                                              try { reader.abort(); } catch (_) {}
                                          }
                                          finish({ stale: true });
                                      }
                                  }, 200);
                                  reader.onload = () => {
                                      if (!intakeIsCurrent()) { finish({ stale: true }); return; }
                                      const result = reader.result;
                                      const comma = typeof result === 'string' ? result.indexOf(',') : -1;
                                      const base64 = comma >= 0 ? result.slice(comma + 1) : '';
                                      if (!base64) {
                                          finish({ error: new Error('The file was empty or could not be decoded.') });
                                          return;
                                      }
                                      finish({ entry: {
                                          id: Date.now() + index + Math.random(),
                                          fileName: file.name,
                                          fileSize: file.size,
                                          base64,
                                          status: 'pending',
                                          result: null
                                      } });
                                  };
                                  reader.onerror = () => {
                                      if (!intakeIsCurrent()) { finish({ stale: true }); return; }
                                      finish({ error: reader.error || new Error('The browser could not read this file.') });
                                  };
                                  reader.onabort = () => {
                                      if (!intakeIsCurrent() || intakeJob.cancelled) { finish({ cancelled: true }); return; }
                                      finish({ error: new Error('The file read was cancelled.') });
                                  };
                                  reader.readAsDataURL(file);
                              } catch (error) {
                                  if (!intakeIsCurrent()) { finish({ stale: true }); return; }
                                  finish({ error });
                              }
                          });
                          if (!intakeIsCurrent() || outcome.stale || outcome.cancelled) {
                              if (pdfBatchIntakeRef.current === intakeJob) pdfBatchIntakeRef.current = null;
                              _setPdfBatchIntakeProgressIfMounted(null);
                              return;
                          }
                          if (outcome.error) {
                              addToast('Could not read "' + (file.name || 'PDF') + '": ' + String((outcome.error && outcome.error.message) || outcome.error), 'error');
                              _setPdfBatchIntakeProgressIfMounted({ completed: index + 1, total: acceptedPdfFiles.length, currentIndex: index + 1, currentName: file.name || 'PDF', totalBytes: acceptedBytes });
                              continue;
                          }
                          batchFiles[index] = outcome.entry;
                          _setPdfBatchIntakeProgressIfMounted({ completed: index + 1, total: acceptedPdfFiles.length, currentIndex: index + 1, currentName: file.name || 'PDF', totalBytes: acceptedBytes });
                      }

                      if (!intakeIsCurrent()) {
                          if (pdfBatchIntakeRef.current === intakeJob) pdfBatchIntakeRef.current = null;
                          _setPdfBatchIntakeProgressIfMounted(null);
                          return;
                      }
                      const readyFiles = batchFiles.filter(Boolean);
                      if (readyFiles.length === 0) {
                          if (pdfBatchIntakeRef.current === intakeJob) pdfBatchIntakeRef.current = null;
                          _setPdfBatchIntakeProgressIfMounted(null);
                          addToast('None of the selected PDFs could be read.', 'error');
                          return;
                      }
                      if (pdfBatchIntakeRef.current === intakeJob) pdfBatchIntakeRef.current = null;
                      _setPdfBatchIntakeProgressIfMounted(null);
                      setPdfBatchSummary(null);
                      setPdfBatchQueue(readyFiles);
                      setPdfBatchMode(true);
                      setPdfAuditResult({
                          _choosing: true,
                          fileName: readyFiles.length + ' files',
                          fileSize: readyFiles.reduce((sum, file) => sum + file.fileSize, 0)
                      });
                      addToast(readyFiles.length + ' PDFs are ready for batch remediation.', 'success');
                      setShowEducatorHub(false);
                  };
                  input.click();
              }} className="flex items-start gap-3 p-4 bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-left disabled:opacity-60 disabled:cursor-wait disabled:hover:scale-100">
                <span className="text-3xl mt-1" aria-hidden="true">♿</span>
                <div>
                  <h3 className="font-bold text-teal-800">{t('educator_hub.pdf_accessibility_title') || 'PDF Accessibility'}</h3>
                  <p className="text-xs text-teal-600 mt-1">{t('educator_hub.pdf_accessibility_desc') || 'Audit and remediate PDFs for accessibility, then verify the result with axe-core.'}</p>
                </div>
              </button>

                <button type="button" data-hub-favorite="true" aria-pressed={hubFavoriteIds.includes('pdf-accessibility')} aria-label={hubFavoriteIds.includes('pdf-accessibility') ? tr('hub.remove_favorite', 'Remove from favorites') + ': PDF Accessibility' : tr('hub.add_favorite', 'Add to favorites') + ': PDF Accessibility'} title={hubFavoriteIds.includes('pdf-accessibility') ? tr('hub.remove_favorite', 'Remove from favorites') : tr('hub.add_favorite', 'Add to favorites')} onClick={(event) => { event.stopPropagation(); toggleHubFavorite('pdf-accessibility'); }} className="absolute top-2 right-2 z-10 min-w-9 min-h-9 rounded-full bg-white/90 border border-slate-300 text-amber-600 text-lg leading-none shadow-sm hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubFavoriteIds.includes('pdf-accessibility') ? '★' : '☆'}</button>
              </div>
              {pdfBatchIntakeProgress && (
                <div className="col-span-full rounded-xl border border-teal-300 bg-teal-50 p-3" role="status" aria-live="polite" aria-label="PDF batch preparation progress">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-teal-900">Preparing PDF batch: {pdfBatchIntakeProgress.completed}/{pdfBatchIntakeProgress.total}</p>
                      <p className="text-xs text-teal-700 truncate">{pdfBatchIntakeProgress.currentName ? ('Reading ' + pdfBatchIntakeProgress.currentIndex + ' of ' + pdfBatchIntakeProgress.total + ': ' + pdfBatchIntakeProgress.currentName) : 'Starting…'}</p>
                    </div>
                    <button type="button" onClick={() => _cancelPdfBatchIntake(true)} className="min-h-11 px-3 py-2 rounded-lg border border-rose-300 bg-white text-rose-700 text-xs font-bold hover:bg-rose-50">Cancel</button>
                  </div>
                  <progress className="w-full mt-2 accent-teal-600" max={pdfBatchIntakeProgress.total} value={pdfBatchIntakeProgress.completed} aria-label="PDFs prepared" />
                </div>
              )}

              {pdfFixResult && !pdfFixLoading && !pdfAuditResult && (
                <button type="button"
                  onClick={() => { setShowEducatorHub(false); setPdfAuditResult({ _restored: true }); }}
                  className="min-h-11 flex items-center justify-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold transition-all col-span-full md:col-span-2"
                  title={t('educator_hub.view_last_audit_tooltip') || 'Re-open the last PDF audit — view the diff, verification, and remediated HTML without re-running the pipeline'}
                >
                  <span aria-hidden="true">📊</span> {t('pdf_audit.view_last_audit') || 'View Last Audit'}
                  {pdfFixResult._userEditedAt && <span className="opacity-70 text-[10px]">· edited</span>}
                </button>
              )}

              <div className="relative group" data-hub-id="accessibility-lab" data-hub-label="Accessibility Lab" data-hub-section="access">
                <button type="button" data-hub-launch="true" data-help-key="educator_hub_accessibility_lab_card" onClick={() => { setShowEducatorHub(false); setIsAccessibilityLabOpen(true); }} className="flex items-start gap-3 p-4 bg-gradient-to-br from-rose-50 to-amber-50 border border-rose-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-left">
                <span className="text-3xl mt-1" aria-hidden="true">🔍</span>
                <div>
                  <h3 className="font-bold text-rose-800">{t('educator_hub.accessibility_lab_title') || 'Accessibility Lab'}</h3>
                  <p className="text-xs text-rose-700 mt-1">{t('educator_hub.accessibility_lab_desc') || 'Check the student experience with student preview, keyboard and screen-reader checks, a live WCAG audit, and disability simulations.'}</p>
                </div>
              </button>

                <button type="button" data-hub-favorite="true" aria-pressed={hubFavoriteIds.includes('accessibility-lab')} aria-label={hubFavoriteIds.includes('accessibility-lab') ? tr('hub.remove_favorite', 'Remove from favorites') + ': Accessibility Lab' : tr('hub.add_favorite', 'Add to favorites') + ': Accessibility Lab'} title={hubFavoriteIds.includes('accessibility-lab') ? tr('hub.remove_favorite', 'Remove from favorites') : tr('hub.add_favorite', 'Add to favorites')} onClick={(event) => { event.stopPropagation(); toggleHubFavorite('accessibility-lab'); }} className="absolute top-2 right-2 z-10 min-w-9 min-h-9 rounded-full bg-white/90 border border-slate-300 text-amber-600 text-lg leading-none shadow-sm hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubFavoriteIds.includes('accessibility-lab') ? '★' : '☆'}</button>
              </div>
                            <div className="col-span-full mt-1 mb-[-0.25rem]" data-hub-section-heading="extend">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-black uppercase tracking-wide text-indigo-800">{tr('educator_hub.section_extend_title', 'Extend and discover')}</h3>
                    <p className="text-xs text-slate-500 mt-1">{tr('educator_hub.section_extend_desc', 'Find community resources, professional learning, and leadership-level tools.')}</p>
                  </div>
                  <button type="button" data-hub-section-toggle="extend" aria-expanded={!hubCollapsedSections.includes('extend')} aria-label={hubCollapsedSections.includes('extend') ? tr('hub.expand_section', 'Expand section') : tr('hub.collapse_section', 'Collapse section')} onClick={() => toggleHubSection('extend')} className="min-h-11 min-w-11 rounded-lg border border-slate-300 bg-white text-slate-700 text-lg font-black hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubCollapsedSections.includes('extend') ? '+' : '-'}</button>
                </div>
              </div>
              <div className="relative group" data-hub-id="community-catalog" data-hub-label="Community Catalog" data-hub-section="extend">
                <button type="button" data-hub-launch="true" data-help-key="educator_hub_community_catalog_card" onClick={() => { setShowEducatorHub(false); setIsCommunityCatalogOpen(true); }} className="flex items-start gap-3 p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-left">
                <span className="text-3xl mt-1" aria-hidden="true">📚</span>
                <div>
                  <h3 className="font-bold text-amber-800">{t('educator_hub.community_catalog_title') || 'Community Catalog'}</h3>
                  <p className="text-xs text-amber-700 mt-1">{t('educator_hub.community_catalog_desc') || 'Browse open-licensed lessons, or submit your own for community review.'}</p>
                </div>
              </button>

                <button type="button" data-hub-favorite="true" aria-pressed={hubFavoriteIds.includes('community-catalog')} aria-label={hubFavoriteIds.includes('community-catalog') ? tr('hub.remove_favorite', 'Remove from favorites') + ': Community Catalog' : tr('hub.add_favorite', 'Add to favorites') + ': Community Catalog'} title={hubFavoriteIds.includes('community-catalog') ? tr('hub.remove_favorite', 'Remove from favorites') : tr('hub.add_favorite', 'Add to favorites')} onClick={(event) => { event.stopPropagation(); toggleHubFavorite('community-catalog'); }} className="absolute top-2 right-2 z-10 min-w-9 min-h-9 rounded-full bg-white/90 border border-slate-300 text-amber-600 text-lg leading-none shadow-sm hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubFavoriteIds.includes('community-catalog') ? '★' : '☆'}</button>
              </div>
              <div className="relative group" data-hub-id="professional-development" data-hub-label="Professional Development" data-hub-section="extend">
                <button type="button" data-hub-launch="true" data-help-key="educator_hub_professional_dev_card" onClick={() => { setShowEducatorHub(false); try { window.__alloPdIntent = true; localStorage.setItem('alloflow_pd_intent', '1'); } catch (_) {} setIsCommunityCatalogOpen(true); }} className="flex items-start gap-3 p-4 bg-gradient-to-br from-sky-50 to-indigo-50 border border-sky-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-left">
                <span className="text-3xl mt-1" aria-hidden="true">🎓</span>
                <div>
                  <h3 className="font-bold text-sky-800">{t('educator_hub.professional_dev_title') || 'Professional Development'}</h3>
                  <p className="text-xs text-sky-700 mt-1">{t('educator_hub.professional_dev_desc') || 'Work through short, self-paced modules, take a knowledge check, and download a completion record.'}</p>
                </div>
              </button>

                <button type="button" data-hub-favorite="true" aria-pressed={hubFavoriteIds.includes('professional-development')} aria-label={hubFavoriteIds.includes('professional-development') ? tr('hub.remove_favorite', 'Remove from favorites') + ': Professional Development' : tr('hub.add_favorite', 'Add to favorites') + ': Professional Development'} title={hubFavoriteIds.includes('professional-development') ? tr('hub.remove_favorite', 'Remove from favorites') : tr('hub.add_favorite', 'Add to favorites')} onClick={(event) => { event.stopPropagation(); toggleHubFavorite('professional-development'); }} className="absolute top-2 right-2 z-10 min-w-9 min-h-9 rounded-full bg-white/90 border border-slate-300 text-amber-600 text-lg leading-none shadow-sm hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubFavoriteIds.includes('professional-development') ? '★' : '☆'}</button>
              </div>
              <div className="relative group" data-hub-id="leadership-hub" data-hub-label="Leadership Hub" data-hub-section="extend">
                <button type="button" data-hub-launch="true" data-help-key="educator_hub_admin_hub_card" onClick={() => { setShowEducatorHub(false); setIsAdminHubOpen(true); }} className="flex items-start gap-3 p-4 bg-gradient-to-br from-cyan-50 to-indigo-50 border border-cyan-700 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-left">
                <span className="text-3xl mt-1" aria-hidden="true">🏛️</span>
                <div>
                  <h3 className="font-bold text-cyan-900">{t('educator_hub.admin_hub_title') || 'Leadership Hub'}</h3>
                  <p className="text-xs text-cyan-800 mt-1">{t('educator_hub.admin_hub_desc') || 'For leaders: conduct UDL walkthroughs, examine disproportionality patterns, and document meetings with aggregate or de-identified, device-only data. Reports are descriptive, not evaluative.'}</p>
                </div>
              </button>

                <button type="button" data-hub-favorite="true" aria-pressed={hubFavoriteIds.includes('leadership-hub')} aria-label={hubFavoriteIds.includes('leadership-hub') ? tr('hub.remove_favorite', 'Remove from favorites') + ': Leadership Hub' : tr('hub.add_favorite', 'Add to favorites') + ': Leadership Hub'} title={hubFavoriteIds.includes('leadership-hub') ? tr('hub.remove_favorite', 'Remove from favorites') : tr('hub.add_favorite', 'Add to favorites')} onClick={(event) => { event.stopPropagation(); toggleHubFavorite('leadership-hub'); }} className="absolute top-2 right-2 z-10 min-w-9 min-h-9 rounded-full bg-white/90 border border-slate-300 text-amber-600 text-lg leading-none shadow-sm hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubFavoriteIds.includes('leadership-hub') ? '★' : '☆'}</button>
              </div>
            </div>
          </div>
        </div>
  );
}
