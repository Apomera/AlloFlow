/**
 * AlloFlow — Learning Hub Modal Module
 *
 * Tool launcher modal: STEAM Lab, Open Groove Studio, StoryForge, LitLab,
 * PoetTree, SEL Hub, AlloHaven.
 * Each button closes this modal and opens the chosen tool.
 *
 * Extracted from AlloFlowANTI.txt lines 23409-23465 (May 2026).
 * 57 lines, 11 deps (mostly navigation setters).
 */
function LearningHubModal(props) {
  const {
    setIsAlloHavenOpen, setIsLinguaPracticeOpen, setIsOpenGrooveOpen, setIsTestPrepHubOpen, setIsTimelineStudioOpen, setSelHubTab, setShowLearningHub, setShowLitLab,
    setShowMindMap, setShowPoetTree, setShowResearchHub, setShowSelHub, setShowStemLab, setShowStoryForge,
    setStemLabTab, setStemLabTool, setLabToolData, showLearningHub,
    // Family Bridge launcher (2026-06-28): opens live two-way translation. Optional
    // default so a host that hasn't wired the setter still renders the hub.
    // BridgeSendModal is teacher-gated, so the card is only shown in teacher mode
    // (default false) to avoid a dead button for student/family entry points.
    setBridgeSendOpen = (() => {}),
    isTeacherMode = false,
    // Reading Library (2026-07-05): StoryWeaver open picture books. Optional —
    // card only renders when the host wires the setter.
    setIsReadingLibraryOpen,
    t,
    userRole = '',
  } = props;
  const dialogRef = React.useRef(null);
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
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setShowLearningHub(false); return; }
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
  }, [setShowLearningHub]);
  const tr = (key, fallback) => {
    try { const value = typeof t === 'function' ? t(key) : ''; return value && value !== key ? value : fallback; }
    catch (_) { return fallback; }
  };
  const [textInquiryLaunchError, setTextInquiryLaunchError] = React.useState('');
  const openTextInquiryStudio = () => {
    let url = 'https://alloflow-cdn.pages.dev/text_inquiry/text_inquiry.html?v=1';
    try {
      const loc = window.location || {};
      const host = loc.hostname || '';
      const pathname = loc.pathname || '';
      const isLocalHost = /^(localhost|127\.0\.0\.1)$/i.test(host);
      const isDesktopBundled = !!window._isDesktopBundledApp || (isLocalHost && pathname.indexOf('/app/') === 0);
      const isAlloHosted = /(^|\.)alloflow/i.test(host) || /(^|\.)web\.app$/i.test(host) || /(^|\.)firebaseapp\.com$/i.test(host);
      if (isDesktopBundled) url = new URL('text_inquiry/text_inquiry.html?v=1', loc.href).toString();
      else if (isLocalHost || isAlloHosted) url = new URL('/text_inquiry/text_inquiry.html?v=1', loc.origin).toString();
    } catch (_) {}
    let popup = null;
    try { popup = window.open(url, 'alloflow-text-inquiry', 'width=1320,height=900'); } catch (_) { popup = null; }
    if (!popup) { setTextInquiryLaunchError('The Text Inquiry Studio window was blocked. Allow pop-ups for this site, then try again.'); return; }
    setTextInquiryLaunchError('');
    setShowLearningHub(false);
  };
  const hubGridRef = React.useRef(null);
  const [hubQuery, setHubQuery] = React.useState('');
  const [hubCards, setHubCards] = React.useState([]);
  const [hubFavoriteIds, setHubFavoriteIds] = React.useState(() => {
    try { const parsed = JSON.parse(localStorage.getItem('alloflow_hub_learning_favorites') || '[]'); return Array.isArray(parsed) ? parsed : []; }
    catch (_) { return []; }
  });
  const [hubRecentIds, setHubRecentIds] = React.useState(() => {
    try { const parsed = JSON.parse(localStorage.getItem('alloflow_hub_learning_recent') || '[]'); return Array.isArray(parsed) ? parsed : []; }
    catch (_) { return []; }
  });
  const [hubFavoritesOnly, setHubFavoritesOnly] = React.useState(false);
  const [hubManageFavorites, setHubManageFavorites] = React.useState(false);
  const [hubVisibleCount, setHubVisibleCount] = React.useState(0);
  const [hubUsageCounts, setHubUsageCounts] = React.useState(() => {
    try { const parsed = JSON.parse(localStorage.getItem('alloflow_hub_learning_usage') || '{}'); return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}; }
    catch (_) { return {}; }
  });
  const [hubCollapsedSections, setHubCollapsedSections] = React.useState(() => {
    try { const parsed = JSON.parse(localStorage.getItem('alloflow_hub_learning_collapsed') || '[]'); return Array.isArray(parsed) ? parsed : []; }
    catch (_) { return []; }
  });
  const [hubRoleOverride, setHubRoleOverride] = React.useState(() => {
    try { const value = localStorage.getItem('alloflow_hub_learning_role'); return typeof value === 'string' ? value : ''; }
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
    try { localStorage.setItem('alloflow_hub_learning_favorites', JSON.stringify(hubFavoriteIds)); } catch (_) {}
  }, [hubFavoriteIds]);
  React.useEffect(() => {
    try { localStorage.setItem('alloflow_hub_learning_recent', JSON.stringify(hubRecentIds)); } catch (_) {}
  }, [hubRecentIds]);
  React.useEffect(() => {
    try { localStorage.setItem('alloflow_hub_learning_usage', JSON.stringify(hubUsageCounts)); } catch (_) {}
  }, [hubUsageCounts]);
  React.useEffect(() => {
    try { localStorage.setItem('alloflow_hub_learning_collapsed', JSON.stringify(hubCollapsedSections)); } catch (_) {}
  }, [hubCollapsedSections]);
  React.useEffect(() => {
    try { localStorage.setItem('alloflow_hub_learning_role', hubRoleOverride); } catch (_) {}
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
  const hubRolePreference = hubRoleOverride || userRole || (isTeacherMode ? 'teacher' : 'student');
  const hubRoleRaw = String(hubRolePreference).toLowerCase();
  const hubRoleKey = hubRoleRaw.includes('family') ? 'family' : (hubRoleRaw.includes('teacher') || hubRoleRaw.includes('educator')) ? 'teacher' : 'student';
  const hubRoleLabel = ({ teacher: 'teachers', student: 'students', family: 'families' }[hubRoleKey] || 'learners');
  const hubRoleRecommendations = { teacher: ['throughline', 'research-hub', 'stem-lab', 'reading-library', 'lumen-study'], student: ['lumen-study', 'reading-library', 'stem-lab', 'text-inquiry', 'test-prep'], family: ['reading-library', 'lingua-practice', 'sel-hub', 'allohaven', 'storyforge'] };
  const hubUsageRankedIds = Object.entries(hubUsageCounts).sort((a, b) => Number(b[1]) - Number(a[1])).map(([id]) => id);
  const hubRecommendedIds = Array.from(new Set([...(hubRoleRecommendations[hubRoleKey] || hubRoleRecommendations.student), ...hubUsageRankedIds])).slice(0, 5);
  const recommendedCards = hubRecommendedIds.map((id) => hubCards.find((card) => card.id === id)).filter(Boolean);
  const quickCards = Array.from(new Set([...hubFavoriteIds, ...hubRecentIds])).map((id) => hubCards.find((card) => card.id === id)).filter(Boolean);
  return (
        <div className="fixed inset-0 z-[260] bg-black/40 flex items-center justify-center overflow-y-auto p-3 sm:p-4" style={{ zIndex: 260 }} role="presentation" onClick={() => setShowLearningHub(false)}>
          {/* allo-docsuite: this modal is a portal rendered OUTSIDE the main .allo-docsuite
              content wrapper, so the theme-dark gradient/text remaps (which are scoped to
              .allo-docsuite) never reached the pastel tool cards — they stayed light-pastel in
              dark mode. Adding the scope class opts the modal into the existing, tested dark
              remap (from-*-50 gradients -> dark tints, text-*-800/600 -> light). No-op in light
              mode: every .allo-docsuite rule is prefixed .theme-dark / .theme-contrast. */}
          <div ref={dialogRef} tabIndex={-1} className="allo-docsuite bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2" style={{ maxHeight: '90vh' }} role="dialog" aria-modal="true" aria-labelledby="learning-hub-title" aria-describedby="learning-hub-subtitle" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 id="learning-hub-title" className="text-xl font-bold text-slate-800 flex items-center gap-2"><span aria-hidden="true">{'\uD83E\uDDE9'}</span> {t('learning_hub.title') || 'Learning Tools'}</h2>
                <p id="learning-hub-subtitle" className="text-sm text-slate-600 mt-1">{t('learning_hub.subtitle') || 'Choose a tool to explore'}</p>
              </div>
              <button type="button" onClick={() => setShowLearningHub(false)} className="min-w-11 min-h-11 p-2 inline-flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors text-xl" aria-label={t('learning_hub.close_aria') || 'Close learning hub'}>{'\u2715'}</button>
            </div>

            <div className="mb-4 space-y-3" role="search" aria-label={tr('hub.search_label', 'Search tools')}>
              <div className="flex flex-col sm:flex-row gap-2">
                <label htmlFor="learning-hub-search" className="sr-only">{tr('hub.search_label', 'Search tools')}</label>
                <input id="learning-hub-search" type="search" value={hubQuery} onChange={(event) => setHubQuery(event.target.value)} placeholder={tr('hub.search_placeholder', 'Search tools by name, purpose, or workflow')} className="min-h-11 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                {hubQuery && <button type="button" onClick={() => setHubQuery('')} className="min-h-11 px-3 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50">{tr('hub.clear_search', 'Clear')}</button>}
                <button type="button" aria-pressed={hubFavoritesOnly} onClick={() => setHubFavoritesOnly((value) => !value)} className="min-h-11 px-3 rounded-xl border border-amber-300 bg-amber-50 text-sm font-bold text-amber-800 hover:bg-amber-100">{hubFavoritesOnly ? '★ ' : '☆ '}{tr('hub.favorites_only', 'Favorites')}</button>
                <button type="button" aria-expanded={hubManageFavorites} onClick={() => setHubManageFavorites((value) => !value)} className="min-h-11 px-3 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50">{tr('hub.manage_favorites', 'Manage favorites')}</button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="learning-hub-role" className="text-xs font-bold text-slate-600">{tr('hub.role_label', 'Recommendations for')}</label>
                <select id="learning-hub-role" value={hubRoleKey} onChange={(event) => setHubRoleOverride(event.target.value)} className="min-h-10 rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="teacher">{tr('hub.role_teacher', 'Teachers')}</option>
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
            <div ref={hubGridRef} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="col-span-full mt-1 mb-[-0.25rem]" data-hub-section-heading="core">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-black uppercase tracking-wide text-indigo-800">{tr('learning_hub.section_core_title', 'Core learning')}</h3>
                    <p className="text-xs text-slate-500 mt-1">{tr('learning_hub.section_core_desc', 'Start with reading, evidence, inquiry, and subject exploration.')}</p>
                  </div>
                  <button type="button" data-hub-section-toggle="core" aria-expanded={!hubCollapsedSections.includes('core')} aria-label={hubCollapsedSections.includes('core') ? tr('hub.expand_section', 'Expand section') : tr('hub.collapse_section', 'Collapse section')} onClick={() => toggleHubSection('core')} className="min-h-11 min-w-11 rounded-lg border border-slate-300 bg-white text-slate-700 text-lg font-black hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubCollapsedSections.includes('core') ? '+' : '-'}</button>
                </div>
              </div>
              {typeof setStemLabTool === 'function' && typeof setLabToolData === 'function' && (
                <div className="relative group" data-hub-id="lumen-study" data-hub-label="Lumen Study" data-hub-section="core">
                  <button type="button" data-hub-launch="true" data-help-key="learning_hub_lumen_card" onClick={() => {
                  setShowLearningHub(false);
                  setLabToolData(prev => ({ ...prev, lumen: { ...((prev && prev.lumen) || {}), mode: 'study' } }));
                  setStemLabTool('lumen');
                  setShowStemLab(true);
                }} className="flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-amber-50 to-blue-50 border border-amber-700 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-center">
                  <span className="text-4xl" aria-hidden="true">💡</span>
                  <div>
                    <h3 className="font-bold text-amber-900">{tr('learning_hub.lumen_title', 'Lumen Study')}</h3>
                    <p className="text-xs text-amber-800 mt-1">{tr('learning_hub.lumen_desc', 'Ask questions, inspect exact supporting passages, and save source-grounded notes.')}</p>
                  </div>
                </button>

                <button type="button" data-hub-favorite="true" aria-pressed={hubFavoriteIds.includes('lumen-study')} aria-label={hubFavoriteIds.includes('lumen-study') ? tr('hub.remove_favorite', 'Remove from favorites') + ': Lumen Study' : tr('hub.add_favorite', 'Add to favorites') + ': Lumen Study'} title={hubFavoriteIds.includes('lumen-study') ? tr('hub.remove_favorite', 'Remove from favorites') : tr('hub.add_favorite', 'Add to favorites')} onClick={(event) => { event.stopPropagation(); toggleHubFavorite('lumen-study'); }} className="absolute top-2 right-2 z-10 min-w-9 min-h-9 rounded-full bg-white/90 border border-slate-300 text-amber-600 text-lg leading-none shadow-sm hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubFavoriteIds.includes('lumen-study') ? '★' : '☆'}</button>
                </div>
              )}
              {typeof setIsReadingLibraryOpen === 'function' && (
                <div className="relative group" data-hub-id="reading-library" data-hub-label="Reading Library" data-hub-section="core">
                  <button type="button" data-hub-launch="true" onClick={() => { setShowLearningHub(false); setIsReadingLibraryOpen(true); }} className="flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-center">
                  <span className="text-4xl" aria-hidden="true">{'📚'}</span>
                  <div>
                    <h3 className="font-bold text-sky-800">{t('learning_hub.reading_library_title') || 'Reading Library'}</h3>
                    <p className="text-xs text-sky-700 mt-1">{t('learning_hub.reading_library_desc') || 'Real picture books in 10 languages — read along, listen, and practice'}</p>
                  </div>
                </button>

                <button type="button" data-hub-favorite="true" aria-pressed={hubFavoriteIds.includes('reading-library')} aria-label={hubFavoriteIds.includes('reading-library') ? tr('hub.remove_favorite', 'Remove from favorites') + ': Reading Library' : tr('hub.add_favorite', 'Add to favorites') + ': Reading Library'} title={hubFavoriteIds.includes('reading-library') ? tr('hub.remove_favorite', 'Remove from favorites') : tr('hub.add_favorite', 'Add to favorites')} onClick={(event) => { event.stopPropagation(); toggleHubFavorite('reading-library'); }} className="absolute top-2 right-2 z-10 min-w-9 min-h-9 rounded-full bg-white/90 border border-slate-300 text-amber-600 text-lg leading-none shadow-sm hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubFavoriteIds.includes('reading-library') ? '★' : '☆'}</button>
                </div>
              )}
              <div className="relative group" data-hub-id="stem-lab" data-hub-label="STEAM Lab" data-hub-section="core">
                <button type="button" data-hub-launch="true" onClick={() => { setShowLearningHub(false); setShowStemLab(true); setStemLabTab('explore'); }} className="flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-indigo-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-center">
                <span className="text-4xl" aria-hidden="true">{'\uD83D\uDD2C'}</span>
                <div>
                  <h3 className="font-bold text-indigo-800">{t('learning_hub.stem_title') || 'STEAM Lab'}</h3>
                  <p className="text-xs text-indigo-600 mt-1">{t('learning_hub.stem_desc') || '100+ interactive math & science explorations'}</p>
                </div>
              </button>

                <button type="button" data-hub-favorite="true" aria-pressed={hubFavoriteIds.includes('stem-lab')} aria-label={hubFavoriteIds.includes('stem-lab') ? tr('hub.remove_favorite', 'Remove from favorites') + ': STEAM Lab' : tr('hub.add_favorite', 'Add to favorites') + ': STEAM Lab'} title={hubFavoriteIds.includes('stem-lab') ? tr('hub.remove_favorite', 'Remove from favorites') : tr('hub.add_favorite', 'Add to favorites')} onClick={(event) => { event.stopPropagation(); toggleHubFavorite('stem-lab'); }} className="absolute top-2 right-2 z-10 min-w-9 min-h-9 rounded-full bg-white/90 border border-slate-300 text-amber-600 text-lg leading-none shadow-sm hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubFavoriteIds.includes('stem-lab') ? '★' : '☆'}</button>
              </div>
              <div className="relative group" data-hub-id="text-inquiry" data-hub-label="Text Inquiry Studio" data-hub-section="core">
                <button type="button" data-hub-launch="true" data-help-key="learning_hub_text_inquiry_card" onClick={openTextInquiryStudio} className="flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-fuchsia-50 to-cyan-50 border border-fuchsia-700 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-center" aria-describedby={textInquiryLaunchError ? 'text-inquiry-launch-error' : undefined}>
                <span className="text-4xl" aria-hidden="true">{'🔎'}</span>
                <div>
                  <h3 className="font-bold text-fuchsia-900">Text Inquiry Studio</h3>
                  <p className="text-xs text-fuchsia-800 mt-1">Inspect frequency and concordance, then test an interpretation against exceptions and context.</p>
                </div>
              </button>

                <button type="button" data-hub-favorite="true" aria-pressed={hubFavoriteIds.includes('text-inquiry')} aria-label={hubFavoriteIds.includes('text-inquiry') ? tr('hub.remove_favorite', 'Remove from favorites') + ': Text Inquiry Studio' : tr('hub.add_favorite', 'Add to favorites') + ': Text Inquiry Studio'} title={hubFavoriteIds.includes('text-inquiry') ? tr('hub.remove_favorite', 'Remove from favorites') : tr('hub.add_favorite', 'Add to favorites')} onClick={(event) => { event.stopPropagation(); toggleHubFavorite('text-inquiry'); }} className="absolute top-2 right-2 z-10 min-w-9 min-h-9 rounded-full bg-white/90 border border-slate-300 text-amber-600 text-lg leading-none shadow-sm hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubFavoriteIds.includes('text-inquiry') ? '★' : '☆'}</button>
              </div>
              {textInquiryLaunchError && <p id="text-inquiry-launch-error" role="alert" className="sm:col-span-3 text-xs font-bold text-red-700 bg-red-50 border border-red-300 rounded-lg p-3">{textInquiryLaunchError}</p>}
                            <div className="col-span-full mt-1 mb-[-0.25rem]" data-hub-section-heading="practice">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-black uppercase tracking-wide text-indigo-800">{tr('learning_hub.section_practice_title', 'Practice and progress')}</h3>
                    <p className="text-xs text-slate-500 mt-1">{tr('learning_hub.section_practice_desc', 'Build fluency, prepare for assessments, and support learner wellbeing.')}</p>
                  </div>
                  <button type="button" data-hub-section-toggle="practice" aria-expanded={!hubCollapsedSections.includes('practice')} aria-label={hubCollapsedSections.includes('practice') ? tr('hub.expand_section', 'Expand section') : tr('hub.collapse_section', 'Collapse section')} onClick={() => toggleHubSection('practice')} className="min-h-11 min-w-11 rounded-lg border border-slate-300 bg-white text-slate-700 text-lg font-black hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubCollapsedSections.includes('practice') ? '+' : '-'}</button>
                </div>
              </div>
              {typeof setIsLinguaPracticeOpen === 'function' && (
                <div className="relative group" data-hub-id="lingua-practice" data-hub-label="Lingua Practice" data-hub-section="practice">
                  <button type="button" data-hub-launch="true" onClick={() => { setShowLearningHub(false); setIsLinguaPracticeOpen(true); }} className="flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-emerald-50 to-cyan-50 border border-emerald-700 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-center">
                  <span className="w-12 h-12 rounded-lg bg-emerald-700 text-white flex items-center justify-center text-sm font-black" aria-hidden="true">A/文</span>
                  <div>
                    <h3 className="font-bold text-emerald-900">{tr('learning_hub.lingua_title', 'Lingua Practice')}</h3>
                    <p className="text-xs text-emerald-800 mt-1">{tr('learning_hub.lingua_desc', 'Build vocabulary, practice speaking, and rehearse real conversations')}</p>
                  </div>
                </button>

                <button type="button" data-hub-favorite="true" aria-pressed={hubFavoriteIds.includes('lingua-practice')} aria-label={hubFavoriteIds.includes('lingua-practice') ? tr('hub.remove_favorite', 'Remove from favorites') + ': Lingua Practice' : tr('hub.add_favorite', 'Add to favorites') + ': Lingua Practice'} title={hubFavoriteIds.includes('lingua-practice') ? tr('hub.remove_favorite', 'Remove from favorites') : tr('hub.add_favorite', 'Add to favorites')} onClick={(event) => { event.stopPropagation(); toggleHubFavorite('lingua-practice'); }} className="absolute top-2 right-2 z-10 min-w-9 min-h-9 rounded-full bg-white/90 border border-slate-300 text-amber-600 text-lg leading-none shadow-sm hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubFavoriteIds.includes('lingua-practice') ? '★' : '☆'}</button>
                </div>
              )}
              {typeof setIsTestPrepHubOpen === 'function' && (
                <div className="relative group" data-hub-id="test-prep" data-hub-label="Test Prep Hub" data-hub-section="practice">
                  <button type="button" data-hub-launch="true" onClick={() => { setShowLearningHub(false); setIsTestPrepHubOpen(true); }} className="flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-700 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-center">
                  <span className="text-4xl" aria-hidden="true">{'\uD83E\uDDED'}</span>
                  <div>
                    <h3 className="font-bold text-indigo-900">{tr('learning_hub.test_prep_title', 'Test Prep Hub')}</h3>
                    <p className="text-xs text-indigo-800 mt-1">{tr('learning_hub.test_prep_desc', 'Accessible practice packs for licensure, vocational, and professional exams')}</p>
                  </div>
                </button>

                <button type="button" data-hub-favorite="true" aria-pressed={hubFavoriteIds.includes('test-prep')} aria-label={hubFavoriteIds.includes('test-prep') ? tr('hub.remove_favorite', 'Remove from favorites') + ': Test Prep Hub' : tr('hub.add_favorite', 'Add to favorites') + ': Test Prep Hub'} title={hubFavoriteIds.includes('test-prep') ? tr('hub.remove_favorite', 'Remove from favorites') : tr('hub.add_favorite', 'Add to favorites')} onClick={(event) => { event.stopPropagation(); toggleHubFavorite('test-prep'); }} className="absolute top-2 right-2 z-10 min-w-9 min-h-9 rounded-full bg-white/90 border border-slate-300 text-amber-600 text-lg leading-none shadow-sm hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubFavoriteIds.includes('test-prep') ? '★' : '☆'}</button>
                </div>
              )}
              <div className="relative group" data-hub-id="sel-hub" data-hub-label="SEL Hub" data-hub-section="practice">
                <button type="button" data-hub-launch="true" onClick={() => { setShowLearningHub(false); setShowSelHub(true); setSelHubTab('explore'); }} className="flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-center">
                <span className="text-4xl" aria-hidden="true">{'\uD83D\uDC96'}</span>
                <div>
                  <h3 className="font-bold text-emerald-800">{t('learning_hub.sel_title') || 'SEL Hub'}</h3>
                  <p className="text-xs text-emerald-600 mt-1">{t('learning_hub.sel_desc') || 'Social-emotional learning for self-awareness & growth'}</p>
                </div>
              </button>

                <button type="button" data-hub-favorite="true" aria-pressed={hubFavoriteIds.includes('sel-hub')} aria-label={hubFavoriteIds.includes('sel-hub') ? tr('hub.remove_favorite', 'Remove from favorites') + ': SEL Hub' : tr('hub.add_favorite', 'Add to favorites') + ': SEL Hub'} title={hubFavoriteIds.includes('sel-hub') ? tr('hub.remove_favorite', 'Remove from favorites') : tr('hub.add_favorite', 'Add to favorites')} onClick={(event) => { event.stopPropagation(); toggleHubFavorite('sel-hub'); }} className="absolute top-2 right-2 z-10 min-w-9 min-h-9 rounded-full bg-white/90 border border-slate-300 text-amber-600 text-lg leading-none shadow-sm hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubFavoriteIds.includes('sel-hub') ? '★' : '☆'}</button>
              </div>
              {/* Screen Coach. Opens the standalone page, always in the LEARNER
                  posture: this is the learner surface, so the card cannot be the
                  way a student reaches the unrestricted coach. It opens in its
                  own window because the site it coaches is not AlloFlow. */}
              <div className="relative group" data-hub-id="screen-coach" data-hub-label="Screen Coach" data-hub-section="practice">
                <button type="button" data-hub-launch="true" onClick={() => { setShowLearningHub(false); try { window.open('https://alloflow-cdn.pages.dev/it_coach/it_coach.html?posture=learner', 'alloflow-it-coach'); } catch (_) {} }} className="flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-sky-50 to-cyan-50 border border-sky-700 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-center">
                <span className="text-4xl" aria-hidden="true">{'🧭'}</span>
                <div>
                  <h3 className="font-bold text-sky-900">{t('learning_hub.screen_coach_title') || 'Screen Coach'}</h3>
                  <p className="text-xs text-sky-800 mt-1">{t('learning_hub.screen_coach_desc') || 'Stuck on a website? Share it and get the next step. It helps you use the site, not answer your work.'}</p>
                </div>
              </button>

                <button type="button" data-hub-favorite="true" aria-pressed={hubFavoriteIds.includes('screen-coach')} aria-label={hubFavoriteIds.includes('screen-coach') ? tr('hub.remove_favorite', 'Remove from favorites') + ': Screen Coach' : tr('hub.add_favorite', 'Add to favorites') + ': Screen Coach'} title={hubFavoriteIds.includes('screen-coach') ? tr('hub.remove_favorite', 'Remove from favorites') : tr('hub.add_favorite', 'Add to favorites')} onClick={(event) => { event.stopPropagation(); toggleHubFavorite('screen-coach'); }} className="absolute top-2 right-2 z-10 min-w-9 min-h-9 rounded-full bg-white/90 border border-slate-300 text-amber-600 text-lg leading-none shadow-sm hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubFavoriteIds.includes('screen-coach') ? '★' : '☆'}</button>
              </div>
                            <div className="col-span-full mt-1 mb-[-0.25rem]" data-hub-section-heading="explore">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-black uppercase tracking-wide text-indigo-800">{tr('learning_hub.section_explore_title', 'Explore and organize')}</h3>
                    <p className="text-xs text-slate-500 mt-1">{tr('learning_hub.section_explore_desc', 'Connect ideas, investigate questions, and make sense of complex material.')}</p>
                  </div>
                  <button type="button" data-hub-section-toggle="explore" aria-expanded={!hubCollapsedSections.includes('explore')} aria-label={hubCollapsedSections.includes('explore') ? tr('hub.expand_section', 'Expand section') : tr('hub.collapse_section', 'Collapse section')} onClick={() => toggleHubSection('explore')} className="min-h-11 min-w-11 rounded-lg border border-slate-300 bg-white text-slate-700 text-lg font-black hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubCollapsedSections.includes('explore') ? '+' : '-'}</button>
                </div>
              </div>
              <div className="relative group" data-hub-id="research-hub" data-hub-label="Research Hub" data-hub-section="explore">
                <button type="button" data-hub-launch="true" onClick={() => { setShowLearningHub(false); if (typeof setShowResearchHub === 'function') setShowResearchHub(true); }} className="flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-700 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-center">
                <span className="text-4xl" aria-hidden="true">{'🔍'}</span>
                <div>
                  <h3 className="font-bold text-indigo-800">{t('learning_hub.research_title') || 'Research Hub'}</h3>
                  <p className="text-xs text-indigo-700 mt-1">{t('learning_hub.research_desc') || 'Scientific Inquiry, Engineering Design, and Humanities research — one inquiry journal, three lanes.'}</p>
                </div>
              </button>

                <button type="button" data-hub-favorite="true" aria-pressed={hubFavoriteIds.includes('research-hub')} aria-label={hubFavoriteIds.includes('research-hub') ? tr('hub.remove_favorite', 'Remove from favorites') + ': Research Hub' : tr('hub.add_favorite', 'Add to favorites') + ': Research Hub'} title={hubFavoriteIds.includes('research-hub') ? tr('hub.remove_favorite', 'Remove from favorites') : tr('hub.add_favorite', 'Add to favorites')} onClick={(event) => { event.stopPropagation(); toggleHubFavorite('research-hub'); }} className="absolute top-2 right-2 z-10 min-w-9 min-h-9 rounded-full bg-white/90 border border-slate-300 text-amber-600 text-lg leading-none shadow-sm hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubFavoriteIds.includes('research-hub') ? '★' : '☆'}</button>
              </div>
              {setShowMindMap && (
                <div className="relative group" data-hub-id="throughline" data-hub-label="Throughline" data-hub-section="explore">
                  <button type="button" data-hub-launch="true" onClick={() => { setShowLearningHub(false); setShowMindMap(true); }} className="flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-center">
                  <span className="text-4xl" aria-hidden="true">🧭</span>
                  <div>
                    <h3 className="font-bold text-amber-800">{t('learning_hub.throughline_title') || 'Throughline'}</h3>
                    <p className="text-xs text-amber-700 mt-1">{t('learning_hub.throughline_desc') || 'Arrange your lessons into a spatial unit: teaching sequence, prerequisites, one exportable file'}</p>
                  </div>
                </button>

                <button type="button" data-hub-favorite="true" aria-pressed={hubFavoriteIds.includes('throughline')} aria-label={hubFavoriteIds.includes('throughline') ? tr('hub.remove_favorite', 'Remove from favorites') + ': Throughline' : tr('hub.add_favorite', 'Add to favorites') + ': Throughline'} title={hubFavoriteIds.includes('throughline') ? tr('hub.remove_favorite', 'Remove from favorites') : tr('hub.add_favorite', 'Add to favorites')} onClick={(event) => { event.stopPropagation(); toggleHubFavorite('throughline'); }} className="absolute top-2 right-2 z-10 min-w-9 min-h-9 rounded-full bg-white/90 border border-slate-300 text-amber-600 text-lg leading-none shadow-sm hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubFavoriteIds.includes('throughline') ? '★' : '☆'}</button>
                </div>
              )}
              {typeof setIsTimelineStudioOpen === 'function' && (
                <div className="relative group" data-hub-id="timeline-studio" data-hub-label="Timeline Studio" data-hub-section="explore">
                  <button type="button" data-hub-launch="true" onClick={() => { setShowLearningHub(false); setIsTimelineStudioOpen(true); }} className="flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-center">
                  <span className="text-4xl" aria-hidden="true">{'\uD83D\uDD70\uFE0F'}</span>
                  <div>
                    <h3 className="font-bold text-rose-800">{t('learning_hub.timeline_studio_title') || 'Timeline Studio'}</h3>
                    <p className="text-xs text-rose-700 mt-1">{t('learning_hub.timeline_studio_desc') || 'Turn readings into interactive timelines, or build one by hand.'}</p>
                  </div>
                </button>

                <button type="button" data-hub-favorite="true" aria-pressed={hubFavoriteIds.includes('timeline-studio')} aria-label={hubFavoriteIds.includes('timeline-studio') ? tr('hub.remove_favorite', 'Remove from favorites') + ': Timeline Studio' : tr('hub.add_favorite', 'Add to favorites') + ': Timeline Studio'} title={hubFavoriteIds.includes('timeline-studio') ? tr('hub.remove_favorite', 'Remove from favorites') : tr('hub.add_favorite', 'Add to favorites')} onClick={(event) => { event.stopPropagation(); toggleHubFavorite('timeline-studio'); }} className="absolute top-2 right-2 z-10 min-w-9 min-h-9 rounded-full bg-white/90 border border-slate-300 text-amber-600 text-lg leading-none shadow-sm hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubFavoriteIds.includes('timeline-studio') ? '★' : '☆'}</button>
                </div>
              )}
                            <div className="col-span-full mt-1 mb-[-0.25rem]" data-hub-section-heading="create">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-black uppercase tracking-wide text-indigo-800">{tr('learning_hub.section_create_title', 'Create and express')}</h3>
                    <p className="text-xs text-slate-500 mt-1">{tr('learning_hub.section_create_desc', 'Use voice, story, music, poetry, and reflection to demonstrate understanding.')}</p>
                  </div>
                  <button type="button" data-hub-section-toggle="create" aria-expanded={!hubCollapsedSections.includes('create')} aria-label={hubCollapsedSections.includes('create') ? tr('hub.expand_section', 'Expand section') : tr('hub.collapse_section', 'Collapse section')} onClick={() => toggleHubSection('create')} className="min-h-11 min-w-11 rounded-lg border border-slate-300 bg-white text-slate-700 text-lg font-black hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubCollapsedSections.includes('create') ? '+' : '-'}</button>
                </div>
              </div>
              <div className="relative group" data-hub-id="storyforge" data-hub-label="StoryForge" data-hub-section="create">
                <button type="button" data-hub-launch="true" onClick={() => { setShowLearningHub(false); setShowStoryForge(true); }} className="flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-center">
                <span className="text-4xl" aria-hidden="true">{'\uD83D\uDCD6'}</span>
                <div>
                  <h3 className="font-bold text-rose-800">{t('learning_hub.storyforge_title') || 'StoryForge'}</h3>
                  <p className="text-xs text-rose-600 mt-1">{t('learning_hub.storyforge_desc') || 'Create illustrated stories with AI writing tools'}</p>
                </div>
              </button>

                <button type="button" data-hub-favorite="true" aria-pressed={hubFavoriteIds.includes('storyforge')} aria-label={hubFavoriteIds.includes('storyforge') ? tr('hub.remove_favorite', 'Remove from favorites') + ': StoryForge' : tr('hub.add_favorite', 'Add to favorites') + ': StoryForge'} title={hubFavoriteIds.includes('storyforge') ? tr('hub.remove_favorite', 'Remove from favorites') : tr('hub.add_favorite', 'Add to favorites')} onClick={(event) => { event.stopPropagation(); toggleHubFavorite('storyforge'); }} className="absolute top-2 right-2 z-10 min-w-9 min-h-9 rounded-full bg-white/90 border border-slate-300 text-amber-600 text-lg leading-none shadow-sm hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubFavoriteIds.includes('storyforge') ? '★' : '☆'}</button>
              </div>
              <div className="relative group" data-hub-id="litlab" data-hub-label="LitLab" data-hub-section="create">
                <button type="button" data-hub-launch="true" onClick={() => { setShowLearningHub(false); setShowLitLab(true); }} className="flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-center">
                <span className="text-4xl" aria-hidden="true">🎭</span>
                <div>
                  <h3 className="font-bold text-violet-800">{t('learning_hub.litlab_title') || 'LitLab'}</h3>
                  <p className="text-xs text-violet-600 mt-1">{t('learning_hub.litlab_desc') || 'Bring stories to life with character voices & literary analysis'}</p>
                </div>
              </button>

                <button type="button" data-hub-favorite="true" aria-pressed={hubFavoriteIds.includes('litlab')} aria-label={hubFavoriteIds.includes('litlab') ? tr('hub.remove_favorite', 'Remove from favorites') + ': LitLab' : tr('hub.add_favorite', 'Add to favorites') + ': LitLab'} title={hubFavoriteIds.includes('litlab') ? tr('hub.remove_favorite', 'Remove from favorites') : tr('hub.add_favorite', 'Add to favorites')} onClick={(event) => { event.stopPropagation(); toggleHubFavorite('litlab'); }} className="absolute top-2 right-2 z-10 min-w-9 min-h-9 rounded-full bg-white/90 border border-slate-300 text-amber-600 text-lg leading-none shadow-sm hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubFavoriteIds.includes('litlab') ? '★' : '☆'}</button>
              </div>
              <div className="relative group" data-hub-id="poettree" data-hub-label="PoetTree" data-hub-section="create">
                <button type="button" data-hub-launch="true" onClick={() => { setShowLearningHub(false); setShowPoetTree(true); }} className="flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-center">
                <span className="text-4xl" aria-hidden="true">🌳</span>
                <div>
                  <h3 className="font-bold text-teal-800">{t('learning_hub.poettree_title') || 'PoetTree'}</h3>
                  <p className="text-xs text-teal-600 mt-1">{t('learning_hub.poettree_desc') || 'Write poems with form scaffolds, rhyme & meter analysis, AI feedback'}</p>
                </div>
              </button>

                <button type="button" data-hub-favorite="true" aria-pressed={hubFavoriteIds.includes('poettree')} aria-label={hubFavoriteIds.includes('poettree') ? tr('hub.remove_favorite', 'Remove from favorites') + ': PoetTree' : tr('hub.add_favorite', 'Add to favorites') + ': PoetTree'} title={hubFavoriteIds.includes('poettree') ? tr('hub.remove_favorite', 'Remove from favorites') : tr('hub.add_favorite', 'Add to favorites')} onClick={(event) => { event.stopPropagation(); toggleHubFavorite('poettree'); }} className="absolute top-2 right-2 z-10 min-w-9 min-h-9 rounded-full bg-white/90 border border-slate-300 text-amber-600 text-lg leading-none shadow-sm hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubFavoriteIds.includes('poettree') ? '★' : '☆'}</button>
              </div>
              {typeof setIsOpenGrooveOpen === 'function' && (
                <div className="relative group" data-hub-id="open-groove" data-hub-label="Open Groove Studio" data-hub-section="create">
                  <button type="button" data-hub-launch="true" onClick={() => { setShowLearningHub(false); setIsOpenGrooveOpen(true); }} className="flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-cyan-50 to-emerald-50 border border-cyan-700 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-center">
                  <span className="text-4xl" aria-hidden="true">{'\uD83C\uDF9B\uFE0F'}</span>
                  <div>
                    <h3 className="font-bold text-cyan-900">{t('learning_hub.open_groove_title') || 'Open Groove Studio'}</h3>
                    <p className="text-xs text-cyan-700 mt-1">{t('learning_hub.open_groove_desc') || 'Make beats, shape synths, and connect patterns to real composition and notation.'}</p>
                  </div>
                </button>

                <button type="button" data-hub-favorite="true" aria-pressed={hubFavoriteIds.includes('open-groove')} aria-label={hubFavoriteIds.includes('open-groove') ? tr('hub.remove_favorite', 'Remove from favorites') + ': Open Groove Studio' : tr('hub.add_favorite', 'Add to favorites') + ': Open Groove Studio'} title={hubFavoriteIds.includes('open-groove') ? tr('hub.remove_favorite', 'Remove from favorites') : tr('hub.add_favorite', 'Add to favorites')} onClick={(event) => { event.stopPropagation(); toggleHubFavorite('open-groove'); }} className="absolute top-2 right-2 z-10 min-w-9 min-h-9 rounded-full bg-white/90 border border-slate-300 text-amber-600 text-lg leading-none shadow-sm hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubFavoriteIds.includes('open-groove') ? '★' : '☆'}</button>
                </div>
              )}
              <div className="relative group" data-hub-id="allohaven" data-hub-label="AlloHaven" data-hub-section="create">
                <button type="button" data-hub-launch="true" onClick={() => { setShowLearningHub(false); setIsAlloHavenOpen(true); }} className="flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-green-50 to-lime-50 border border-green-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-center">
                <span className="text-4xl" aria-hidden="true">🌿</span>
                <div>
                  <h3 className="font-bold text-green-800">AlloHaven</h3>
                  <p className="text-xs text-green-700 mt-1">A cozy room you build by focusing and reflecting. Pomodoro + journal + AI decorations. No leaderboards, no streak guilt.</p>
                </div>
              </button>

                <button type="button" data-hub-favorite="true" aria-pressed={hubFavoriteIds.includes('allohaven')} aria-label={hubFavoriteIds.includes('allohaven') ? tr('hub.remove_favorite', 'Remove from favorites') + ': AlloHaven' : tr('hub.add_favorite', 'Add to favorites') + ': AlloHaven'} title={hubFavoriteIds.includes('allohaven') ? tr('hub.remove_favorite', 'Remove from favorites') : tr('hub.add_favorite', 'Add to favorites')} onClick={(event) => { event.stopPropagation(); toggleHubFavorite('allohaven'); }} className="absolute top-2 right-2 z-10 min-w-9 min-h-9 rounded-full bg-white/90 border border-slate-300 text-amber-600 text-lg leading-none shadow-sm hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{hubFavoriteIds.includes('allohaven') ? '★' : '☆'}</button>
              </div>
            </div>
          </div>
        </div>
  );
}
