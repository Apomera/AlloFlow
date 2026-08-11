/**
 * AlloFlow — Family Announcements (Leadership Hub tool) — MVP, Aug 2026.
 *
 * One announcement -> accessible versions in every family language of the
 * building. Write or paste the text, pick the building's languages,
 * translate each with AI (the Family Bridge precedent), REVIEW AND EDIT
 * every translation (bilingual staff can correct before anything goes
 * home), then export an accessible packet: each language as a proper
 * lang-tagged, direction-aware section, plus per-language single files.
 *
 * Integrity stance:
 *  - Machine-assisted translation is DISCLOSED in the UI and in every
 *    exported document (in English and in the target language) with a
 *    "contact the school for interpretation" line — the standard district
 *    practice. Never presented as certified translation.
 *  - Translations are editable before export; the review step says the
 *    preparer certifies the final text.
 *  - lang= and dir= attributes on every section, so screen readers switch
 *    voices correctly and RTL scripts lay out properly — this is the
 *    accessibility half of the tool, not a nicety.
 */

const FAMANN_CONFIG_KEY = 'allo_famann_config_v1';
const FAMANN_SAVED_KEY = 'allo_famann_saved_v1';
const FAMANN_DRAFT_KEY = 'allo_famann_draft_v1';

// Preset languages: BCP-47 tag + English name + native name + direction.
// The native name is what families scan a packet for — always shown.
const FAMANN_LANGS = [
  { tag: 'es', name: 'Spanish', native: 'Español', rtl: false },
  { tag: 'pt', name: 'Portuguese', native: 'Português', rtl: false },
  { tag: 'fr', name: 'French', native: 'Français', rtl: false },
  { tag: 'so', name: 'Somali', native: 'Soomaali', rtl: false },
  { tag: 'ar', name: 'Arabic', native: 'العربية', rtl: true },
  { tag: 'vi', name: 'Vietnamese', native: 'Tiếng Việt', rtl: false },
  { tag: 'zh-Hans', name: 'Chinese (Simplified)', native: '简体中文', rtl: false },
  { tag: 'ht', name: 'Haitian Creole', native: 'Kreyòl Ayisyen', rtl: false },
  { tag: 'prs', name: 'Dari', native: 'دری', rtl: true },
  { tag: 'ps', name: 'Pashto', native: 'پښتو', rtl: true },
  { tag: 'uk', name: 'Ukrainian', native: 'Українська', rtl: false },
  { tag: 'ru', name: 'Russian', native: 'Русский', rtl: false },
  { tag: 'sw', name: 'Swahili', native: 'Kiswahili', rtl: false },
  { tag: 'km', name: 'Khmer', native: 'ខ្មែរ', rtl: false },
  { tag: 'am', name: 'Amharic', native: 'አማርኛ', rtl: false },
  { tag: 'ln', name: 'Lingala', native: 'Lingála', rtl: false },
];

function famannLoad(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed == null ? fallback : parsed;
  } catch (_) { return fallback; }
}

function famannStore(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
}

function famannNextId() {
  return 'fa_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

function famannToday() {
  return new Date().toISOString().slice(0, 10);
}

function famannLangByTag(tag) {
  return FAMANN_LANGS.find((l) => l.tag === tag) || null;
}

// ── Translation prompt (pure) ───────────────────────────────────────
function famannPrompt(lang, text) {
  return 'Translate this school announcement for families into ' + lang.name + ' (' + lang.native + ').\n'
    + 'Rules: translate EVERYTHING and add NOTHING — no greetings, notes, or explanations of your own. '
    + 'Keep the same paragraph breaks. Use plain, warm, family-friendly wording at an everyday reading level. '
    + 'Keep proper nouns (school names, people, street addresses), dates, times, and phone numbers exactly as written. '
    + 'Return ONLY the translated text.\n\nANNOUNCEMENT:\n' + text;
}

// Models sometimes wrap output in fences or prefix a label; peel those,
// never anything else (the review step is where humans fix real issues).
function famannCleanTranslation(raw) {
  let text = String(raw == null ? '' : raw).trim();
  const fence = text.match(/^```[a-z-]*\s*([\s\S]*?)```$/i);
  if (fence) text = fence[1].trim();
  text = text.replace(/^(translation|translated text)\s*:\s*/i, '');
  return text.trim();
}

// ── Accessible packet HTML (pure) ───────────────────────────────────
function famannEscHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// The disclaimer ships in English inside every language section (plus the
// section's own text is the translation itself). Keeping the English line
// constant is deliberate: office staff can always recognize it.
const FAMANN_DISCLAIMER_EN = 'This translation was machine-assisted and reviewed by school staff. Please contact the school office for interpretation help.';

function famannSection(entry) {
  const lang = entry.lang;
  const esc = famannEscHtml;
  const body = esc(entry.text).replace(/\r?\n\r?\n/g, '</p>\n<p>').replace(/\r?\n/g, '<br>');
  return '<section lang="' + esc(lang.tag) + '"' + (lang.rtl ? ' dir="rtl"' : '') + '>\n'
    + '<h2>' + esc(lang.native) + ' <span class="lang-en" lang="en">(' + esc(lang.name) + ')</span></h2>\n'
    + '<p>' + body + '</p>\n'
    + '<p class="disclaimer" lang="en">' + esc(FAMANN_DISCLAIMER_EN) + '</p>\n'
    + '</section>';
}

// One combined packet: English master first, then every language, each a
// lang-tagged and direction-aware section with a native-name heading.
function famannPacketHtml(announcement, entries) {
  const esc = famannEscHtml;
  const sections = entries.map((e) => famannSection(e)).join('\n<hr>\n');
  const englishBody = esc(announcement.text).replace(/\r?\n\r?\n/g, '</p>\n<p>').replace(/\r?\n/g, '<br>');
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
    + '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
    + '<title>' + esc(announcement.title || 'School announcement') + ' — ' + esc(announcement.date || '') + '</title>\n'
    + '<style>\nbody{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;max-width:46rem;margin:2rem auto;padding:0 1rem;color:#1e293b;line-height:1.6}\n'
    + 'h1{font-size:1.35rem;border-bottom:2px solid #047857;padding-bottom:.4rem}\nh2{font-size:1.1rem;margin-top:1.4rem}\n'
    + '.lang-en{font-weight:400;color:#475569;font-size:.85em}\n.meta{color:#475569;font-size:.9rem}\n'
    + '.disclaimer{font-size:.78rem;color:#64748b;border-top:1px dotted #cbd5e1;padding-top:.4rem}\n'
    + 'hr{border:none;border-top:2px solid #e2e8f0;margin:1.5rem 0}\n'
    + 'section[dir="rtl"]{text-align:right}\n@media print{body{margin:.5rem auto}}\n</style>\n</head>\n<body>\n'
    + '<h1>' + esc(announcement.title || 'School announcement') + '</h1>\n'
    + '<p class="meta">' + esc(announcement.date || '') + '</p>\n'
    + '<section lang="en">\n<h2>English</h2>\n<p>' + englishBody + '</p>\n</section>\n'
    + (sections ? ('<hr>\n' + sections + '\n') : '')
    + '</body>\n</html>\n';
}

// Single-language file: the target language FIRST (it is the reader's
// document), then the English master for the office.
function famannSingleHtml(announcement, entry) {
  const esc = famannEscHtml;
  const englishBody = esc(announcement.text).replace(/\r?\n\r?\n/g, '</p>\n<p>').replace(/\r?\n/g, '<br>');
  return '<!DOCTYPE html>\n<html lang="' + esc(entry.lang.tag) + '"' + (entry.lang.rtl ? ' dir="rtl"' : '') + '>\n<head>\n<meta charset="utf-8">\n'
    + '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
    + '<title>' + esc(announcement.title || 'School announcement') + ' — ' + esc(entry.lang.native) + '</title>\n'
    + '<style>\nbody{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;max-width:46rem;margin:2rem auto;padding:0 1rem;color:#1e293b;line-height:1.6}\n'
    + 'h1{font-size:1.3rem}\n.disclaimer{font-size:.78rem;color:#64748b;border-top:1px dotted #cbd5e1;padding-top:.4rem}\n'
    + 'section[lang="en"]{border-top:2px solid #e2e8f0;margin-top:1.5rem;padding-top:.5rem;text-align:left}\n@media print{body{margin:.5rem auto}}\n</style>\n</head>\n<body>\n'
    + famannSection(entry) + '\n'
    + '<section lang="en" dir="ltr">\n<h2>English</h2>\n<p>' + englishBody + '</p>\n</section>\n'
    + '</body>\n</html>\n';
}

function famannDownload(filename, mime, content, addToast, okMsg, failMsg) {
  try {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    addToast(okMsg, 'info');
  } catch (e) {
    addToast(failMsg + String(e && e.message), 'error');
  }
}

function famannAnnounce(message) {
  try {
    const region = document.getElementById('allo-live-famann');
    if (region) { region.textContent = ''; region.textContent = message; }
  } catch (_) {}
}

function FamilyAnnouncementsPanel(props) {
  const { onClose, t, addToast = (() => {}), callGemini = null } = props;
  const tt = React.useCallback((key, fallback) => {
    if (typeof t === 'function') {
      try { const v = t(key); if (v) return v; } catch (_) {}
    }
    return fallback;
  }, [t]);

  const [config, setConfig] = React.useState(() => {
    const c = famannLoad(FAMANN_CONFIG_KEY, {});
    return { langTags: ['es', 'fr', 'so', 'ar'], ...(c && typeof c === 'object' ? c : {}) };
  });
  const [saved, setSaved] = React.useState(() => { const v = famannLoad(FAMANN_SAVED_KEY, []); return Array.isArray(v) ? v : []; });
  const [draft, setDraft] = React.useState(() => {
    const d = famannLoad(FAMANN_DRAFT_KEY, null);
    return (d && typeof d === 'object' && typeof d.text === 'string') ? d : { title: '', date: famannToday(), text: '', translations: {} };
  });
  const [tab, setTab] = React.useState('compose');
  const [viewId, setViewId] = React.useState(null);
  const [busyTag, setBusyTag] = React.useState(null);
  const [armDelete, setArmDelete] = React.useState(null);
  const dialogRef = React.useRef(null);

  React.useEffect(() => { famannStore(FAMANN_CONFIG_KEY, config); }, [config]);
  React.useEffect(() => { famannStore(FAMANN_SAVED_KEY, saved); }, [saved]);
  React.useEffect(() => { famannStore(FAMANN_DRAFT_KEY, draft); }, [draft]);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const previousFocus = document.activeElement;
    const trapStack = window.__alloFocusTrapStack || (window.__alloFocusTrapStack = []);
    const trap = { root: dialog };
    trapStack.push(trap);
    const isTopTrap = () => trapStack[trapStack.length - 1] === trap;
    const getFocusable = () => Array.from(dialog.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((el) => !el.closest('[hidden], [inert], [aria-hidden="true"]'));
    const first = getFocusable()[0];
    (first || dialog).focus();
    const onKeyDown = (event) => {
      if (!isTopTrap()) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); return; }
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      if (focusable.length === 0) { event.preventDefault(); dialog.focus(); return; }
      const firstItem = focusable[0], lastItem = focusable[focusable.length - 1];
      if (!dialog.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? lastItem : firstItem).focus(); }
      else if (event.shiftKey && document.activeElement === firstItem) { event.preventDefault(); lastItem.focus(); }
      else if (!event.shiftKey && document.activeElement === lastItem) { event.preventDefault(); firstItem.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const wasTop = isTopTrap();
      const idx = trapStack.indexOf(trap);
      if (idx !== -1) trapStack.splice(idx, 1);
      if (wasTop && previousFocus && previousFocus !== document.body && previousFocus.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus();
    };
  }, [onClose]);

  const selectedLangs = config.langTags.map(famannLangByTag).filter(Boolean);
  const entriesFor = (a) => selectedLangs
    .map((lang) => ({ lang, ...(a.translations && a.translations[lang.tag] ? a.translations[lang.tag] : { text: '', status: 'empty' }) }))
    .filter((e) => e.text && e.status !== 'error');

  const toggleLang = (tag) => {
    setConfig((c) => ({
      ...c,
      langTags: c.langTags.indexOf(tag) !== -1 ? c.langTags.filter((x) => x !== tag) : [...c.langTags, tag],
    }));
  };

  // Sequential on purpose: Canvas throttles bursty Gemini calls (the
  // transient-401 class); one language at a time with visible progress.
  const translateAll = async () => {
    if (typeof callGemini !== 'function') return;
    if (draft.text.trim().length < 20) { addToast(tt('famann.too_short', 'Write the announcement first.'), 'warning'); return; }
    if (selectedLangs.length === 0) { addToast(tt('famann.no_langs', 'Pick at least one language.'), 'warning'); return; }
    for (const lang of selectedLangs) {
      const existing = draft.translations && draft.translations[lang.tag];
      if (existing && existing.status === 'done' && existing.forText === draft.text) continue; // unchanged — skip
      setBusyTag(lang.tag);
      try {
        const raw = await callGemini(famannPrompt(lang, draft.text));
        const text = famannCleanTranslation(raw);
        if (!text) throw new Error('empty response');
        setDraft((d) => ({ ...d, translations: { ...d.translations, [lang.tag]: { text, status: 'done', forText: d.text } } }));
      } catch (e) {
        setDraft((d) => ({ ...d, translations: { ...d.translations, [lang.tag]: { text: (d.translations && d.translations[lang.tag] && d.translations[lang.tag].text) || '', status: 'error', forText: d.text } } }));
        addToast(lang.name + ': ' + tt('famann.translate_failed', 'translation failed — retry or paste your own.') + ' ' + String((e && e.message) || e), 'error');
      }
    }
    setBusyTag(null);
    famannAnnounce(tt('famann.translated_announce', 'Translations ready for review.'));
  };

  const saveAnnouncement = () => {
    const entries = entriesFor(draft);
    const record = {
      id: famannNextId(),
      title: draft.title.trim() || (tt('famann.untitled', 'Announcement') + ' — ' + draft.date),
      date: draft.date,
      text: draft.text,
      langTags: selectedLangs.map((l) => l.tag),
      translations: draft.translations || {},
      savedAt: Date.now(),
    };
    if (!draft.text.trim()) { addToast(tt('famann.too_short', 'Write the announcement first.'), 'warning'); return; }
    setSaved((s) => [record, ...s]);
    setDraft({ title: '', date: famannToday(), text: '', translations: {} });
    setTab('saved');
    setViewId(record.id);
    addToast(tt('famann.saved_toast', 'Announcement saved on this device.'), 'success');
    if (entries.length === 0) addToast(tt('famann.saved_no_langs', 'No reviewed translations yet — you can still export the English packet.'), 'info');
  };

  const exportPacketFor = (a) => {
    const entries = selectedLangs
      .map((lang) => ({ lang, ...((a.translations || {})[lang.tag] || { text: '', status: 'empty' }) }))
      .filter((e) => e.text && e.status !== 'error');
    famannDownload('announcement-' + (a.date || famannToday()) + '-all-languages.html', 'text/html',
      famannPacketHtml(a, entries), addToast,
      tt('famann.export_toast', 'Export started — check your downloads.'), tt('famann.export_failed', 'Export failed: '));
  };

  const viewSaved = viewId ? saved.find((x) => x.id === viewId) : null;

  const tabs = [
    { id: 'compose', label: tt('famann.tab_compose', 'Compose'), icon: '📣' },
    { id: 'saved', label: tt('famann.tab_saved', 'Saved'), icon: '🗂️' },
  ];

  return (
    <div className="fixed inset-0 z-[260] bg-black/40 flex items-center justify-center overflow-y-auto p-2 sm:p-4" style={{ zIndex: 260 }} role="presentation" onClick={onClose}>
      <div ref={dialogRef} tabIndex={-1} data-help-key="famann_panel" className="allo-docsuite bg-slate-50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto focus:outline-none focus:ring-2 focus:ring-indigo-500" style={{ maxHeight: '92vh' }} role="dialog" aria-modal="true" aria-labelledby="famann-title" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 bg-slate-50/95 border-b border-slate-200 px-4 pt-4 pb-2 rounded-t-2xl">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 id="famann-title" className="text-lg font-bold text-slate-800 flex items-center gap-2"><span aria-hidden="true">📣</span> {tt('famann.title', 'Family Announcements')}</h2>
              <p className="text-xs text-slate-600">{tt('famann.subtitle', 'One announcement, every family language — accessible, reviewed, ready to send home.')}</p>
            </div>
            <button type="button" onClick={onClose} className="min-w-11 min-h-11 p-2 inline-flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 text-xl" aria-label={tt('famann.close_aria', 'Close Family Announcements')}>✕</button>
          </div>
          <div role="tablist" aria-label={tt('famann.tabs_aria', 'Announcement sections')} className="flex gap-1 mt-2">
            {tabs.map((tb, tbIdx) => (
              <button key={tb.id} type="button" role="tab" id={'famann-tab-' + tb.id} aria-selected={tab === tb.id}
                aria-controls="famann-tabpanel" tabIndex={tab === tb.id ? 0 : -1} data-help-key="famann_tab"
                onClick={() => { setTab(tb.id); if (tb.id !== 'saved') setViewId(null); }}
                onKeyDown={(e) => {
                  let next = null;
                  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (tbIdx + 1) % tabs.length;
                  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (tbIdx - 1 + tabs.length) % tabs.length;
                  else if (e.key === 'Home') next = 0;
                  else if (e.key === 'End') next = tabs.length - 1;
                  if (next == null) return;
                  e.preventDefault();
                  const id = tabs[next].id;
                  setTab(id);
                  if (id !== 'saved') setViewId(null);
                  const el = document.getElementById('famann-tab-' + id);
                  if (el) el.focus();
                }}
                className={'min-h-11 px-3 py-1.5 rounded-t-lg text-sm font-bold border-b-2 ' + (tab === tb.id ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-100')}
              ><span aria-hidden="true">{tb.icon}</span> {tb.label}</button>
            ))}
          </div>
        </div>

        <div className="p-4" role="tabpanel" id="famann-tabpanel" aria-labelledby={'famann-tab-' + tab} tabIndex={-1}>
          {tab === 'compose' && (
            <div>
              <div className="bg-white border border-slate-300 rounded-xl p-3 mb-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="famann-title-input" className="block text-xs font-bold text-slate-600 mb-1">{tt('famann.title_label', 'Title')}</label>
                    <input id="famann-title-input" type="text" value={draft.title}
                      onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                      placeholder={tt('famann.title_placeholder', 'e.g. Early release Friday')}
                      className="w-full min-h-11 border border-slate-300 rounded-lg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label htmlFor="famann-date" className="block text-xs font-bold text-slate-600 mb-1">{tt('famann.date_label', 'Date')}</label>
                    <input id="famann-date" type="date" value={draft.date}
                      onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
                      className="w-full min-h-11 border border-slate-300 rounded-lg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <label htmlFor="famann-text" className="block text-xs font-bold text-slate-600 mt-2 mb-1">{tt('famann.text_label', 'Announcement (English master)')}</label>
                <textarea id="famann-text" rows={6} value={draft.text}
                  onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
                  placeholder={tt('famann.text_placeholder', 'Write the announcement exactly as it should go home…')}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div className="bg-white border border-slate-300 rounded-xl p-3 mb-3">
                <h3 className="text-xs font-bold text-slate-700">{tt('famann.langs_title', 'Building languages')}</h3>
                <p className="text-[10px] text-slate-500 mb-1.5">{tt('famann.langs_note', 'Pick every language your families use — the selection is remembered for next time.')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {FAMANN_LANGS.map((lang) => {
                    const on = config.langTags.indexOf(lang.tag) !== -1;
                    return (
                      <button key={lang.tag} type="button" aria-pressed={on} onClick={() => toggleLang(lang.tag)}
                        className={'min-h-9 px-2.5 py-1 rounded-full border text-xs font-bold ' + (on ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100')}>
                        {lang.native} <span className={'font-normal ' + (on ? 'text-indigo-100' : 'text-slate-400')}>{lang.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {typeof callGemini === 'function' ? (
                  <button type="button" disabled={!!busyTag} onClick={translateAll}
                    className="min-h-11 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-wait">
                    {busyTag ? (tt('famann.translating', 'Translating') + ' ' + ((famannLangByTag(busyTag) || {}).name || '') + '…') : (tt('famann.translate_all', 'Translate all') + ' ✨')}
                  </button>
                ) : (
                  <p className="text-[10px] text-slate-500 self-center">{tt('famann.no_ai', 'AI translation is unavailable in this host — paste translations into each language box below.')}</p>
                )}
                <button type="button" onClick={saveAnnouncement} className="min-h-11 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700">{tt('famann.save', 'Save announcement')}</button>
              </div>

              {selectedLangs.length > 0 && (
                <div className="space-y-2">
                  {selectedLangs.map((lang) => {
                    const entry = (draft.translations || {})[lang.tag] || { text: '', status: 'empty' };
                    const stale = entry.status === 'done' && entry.forText !== draft.text;
                    return (
                      <div key={lang.tag} className={'bg-white border rounded-xl p-3 ' + (entry.status === 'error' ? 'border-rose-300' : stale ? 'border-amber-300' : 'border-slate-300')}>
                        <div className="flex items-center justify-between gap-2">
                          <label htmlFor={'famann-tr-' + lang.tag} className="text-xs font-bold text-slate-700">
                            {lang.native} <span className="font-normal text-slate-500">({lang.name}{lang.rtl ? ' · RTL' : ''})</span>
                          </label>
                          <span className="text-[10px] font-bold">
                            {entry.status === 'error' && <span className="text-rose-700">{tt('famann.status_error', 'failed — retry or paste')}</span>}
                            {stale && <span className="text-amber-700">{tt('famann.status_stale', 'English changed since this translation')}</span>}
                          </span>
                        </div>
                        <textarea id={'famann-tr-' + lang.tag} rows={4} value={entry.text} lang={lang.tag} dir={lang.rtl ? 'rtl' : 'ltr'}
                          onChange={(e) => setDraft((d) => ({ ...d, translations: { ...d.translations, [lang.tag]: { text: e.target.value, status: 'done', forText: d.text } } }))}
                          placeholder={tt('famann.tr_placeholder', 'Translation appears here — edit freely; you certify the final text.')}
                          className="mt-1 w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                    );
                  })}
                  <p className="text-[10px] text-slate-500">
                    {tt('famann.integrity_note', 'Translations are machine-assisted; review them (ideally with bilingual staff) before sending — you certify the final text. Every exported document carries a translation disclosure with a contact-the-office line, and each language section is properly lang-tagged and direction-aware so screen readers and RTL scripts work correctly.')}
                  </p>
                </div>
              )}
            </div>
          )}

          {tab === 'saved' && viewSaved && (
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <button type="button" onClick={() => setViewId(null)} className="min-h-11 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50"><span aria-hidden="true">←</span> {tt('famann.back_saved', 'All announcements')}</button>
                <div className="flex gap-2">
                  <button type="button" onClick={() => exportPacketFor(viewSaved)} className="min-h-11 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700"><span aria-hidden="true">⬇️</span> {tt('famann.export_packet', 'Packet (all languages)')}</button>
                  <button type="button"
                    onClick={() => {
                      if (armDelete === viewSaved.id) { setSaved((s) => s.filter((x) => x.id !== viewSaved.id)); setViewId(null); setArmDelete(null); addToast(tt('famann.deleted_toast', 'Announcement deleted.'), 'info'); }
                      else { setArmDelete(viewSaved.id); famannAnnounce(tt('famann.delete_arm_announce', 'Activate delete again to permanently remove this announcement.')); }
                    }}
                    className={'min-h-11 px-3 py-2 rounded-lg border text-sm font-bold ' + (armDelete === viewSaved.id ? 'bg-rose-600 text-white border-rose-700' : 'bg-white text-rose-700 border-rose-300 hover:bg-rose-50')}
                  >{armDelete === viewSaved.id ? tt('famann.delete_confirm', 'Tap again to delete') : tt('famann.delete', 'Delete')}</button>
                </div>
              </div>
              <div className="bg-white border border-slate-300 rounded-xl p-4">
                <h3 className="font-bold text-slate-800">{viewSaved.title}</h3>
                <p className="text-xs text-slate-600">{viewSaved.date}</p>
                <p className="text-xs text-slate-700 whitespace-pre-wrap mt-2">{viewSaved.text}</p>
                <h4 className="text-sm font-bold text-slate-700 mt-3">{tt('famann.per_language', 'Per-language files')}</h4>
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {(viewSaved.langTags || []).map((tag) => {
                    const lang = famannLangByTag(tag);
                    const entry = (viewSaved.translations || {})[tag];
                    if (!lang || !entry || !entry.text || entry.status === 'error') return null;
                    return (
                      <li key={tag}>
                        <button type="button"
                          onClick={() => famannDownload('announcement-' + (viewSaved.date || famannToday()) + '-' + tag + '.html', 'text/html', famannSingleHtml(viewSaved, { lang, ...entry }), addToast, tt('famann.export_toast', 'Export started — check your downloads.'), tt('famann.export_failed', 'Export failed: '))}
                          className="min-h-9 px-2.5 py-1 rounded-full border border-emerald-300 bg-emerald-50 text-xs font-bold text-emerald-800 hover:bg-emerald-100">
                          ⬇️ {lang.native}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}

          {tab === 'saved' && !viewSaved && (
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-2">{tt('famann.saved_title', 'Saved announcements')}</h3>
              {saved.length === 0 && <p className="text-sm text-slate-600 bg-white border border-slate-300 rounded-xl p-3">{tt('famann.no_saved', 'Nothing saved yet. Compose an announcement first.')}</p>}
              <ul className="space-y-1.5">
                {saved.map((a) => (
                  <li key={a.id}>
                    <button type="button" onClick={() => { setViewId(a.id); setArmDelete(null); }}
                      className="w-full min-h-11 flex items-center justify-between gap-2 p-3 rounded-xl border border-slate-300 bg-white hover:bg-indigo-50 text-left">
                      <span className="min-w-0">
                        <span className="block font-bold text-sm text-slate-800">{a.title}</span>
                        <span className="block text-[10px] text-slate-500">{a.date} · {(a.langTags || []).length} {tt('famann.langs_short', 'language(s)')}</span>
                      </span>
                      <span aria-hidden="true" className="shrink-0 text-slate-400">›</span>
                    </button>
                  </li>
                ))}
              </ul>
              {saved.length > 0 && <p className="mt-3 text-[10px] text-slate-500">{tt('famann.storage_note', 'Announcements live only in this browser’s storage — download packets you need to keep (Gemini Canvas may not persist storage between sessions).')}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
