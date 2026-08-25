/**
 * AlloFlow — Leadership Hub (admin tools container) — Aug 2026.
 *
 * One entry point for the school-leadership tool suite, mirroring the
 * STEAM Lab / SEL Hub container pattern: the Educator Hub shows ONE
 * "Leadership Hub" card, and this shell's grid lazy-opens the individual
 * admin tools (each stays its own CDN module with its own tests + pin).
 *
 * The suite covenant is stated ONCE here instead of per-tool: aggregate
 * or de-identified data, computed on this device, descriptive and
 * growth-framed — never an automated verdict about a teacher or student.
 */

/**
 * Backup manifest (2026-08-17): every localStorage namespace the hub's tools
 * write, by PREFIX so version bumps (…_v2) stay covered. Enumerated from the
 * sources and pinned by tests/leadership_hub_backup.test.js, which fails if a
 * tool ever writes an allo_* key outside this list. Diagnosis & Eligibility
 * keeps no local storage (reference tool) — nothing to back up there.
 * SECURITY: restore writes ONLY keys matching these prefixes — a crafted
 * backup file must never be able to write outside the hub's namespace.
 */
const ADMIN_HUB_STORAGE_MANIFEST = [
  { prefix: 'allo_udlwalk_', tool: 'UDL Walkthrough' },                 // config, roster, sessions, draft
  { prefix: 'allo_wcop_', tool: 'Walkthrough Copilot' },                // delivery log
  { prefix: 'allo_dispro_', tool: 'Disproportionality Analyzer' },      // analyses, draft
  { prefix: 'allo_mtss_', tool: 'MTSS Triage' },                        // datasets, groups
  { prefix: 'allo_sped_', tool: 'SpEd Timelines' },                     // cases, config
  { prefix: 'allo_meetdocs_', tool: 'Meeting Documentation' },          // meetings, templates, draft
  { prefix: 'allo_famann_', tool: 'Family Announcements' },             // saved, config, draft
  { prefix: 'allo_educator_evaluation_', tool: 'Educator Evaluation' }, // local workspace, onboarding
];
// ONE structure feeds both the security check and the restore breakdown: a
// parallel label map would be free to drift from the prefixes that actually
// gate writes, which is exactly the class of bug this repo keeps re-learning.
const ADMIN_HUB_STORAGE_PREFIXES = ADMIN_HUB_STORAGE_MANIFEST.map((entry) => entry.prefix);
const ADMIN_HUB_BACKUP_FORMAT = 'alloflow-leadership-hub-backup';

/** Group backup keys by the tool that owns them, for an honest confirmation. */
function _adminHubGroupByTool(keys) {
  const counts = [];
  for (const entry of ADMIN_HUB_STORAGE_MANIFEST) {
    const n = keys.filter((k) => k.indexOf(entry.prefix) === 0).length;
    if (n > 0) counts.push({ tool: entry.tool, count: n });
  }
  return counts;
}

function _adminHubKeyAllowed(key) {
  return typeof key === 'string' && ADMIN_HUB_STORAGE_PREFIXES.some((p) => key.indexOf(p) === 0);
}

function _adminHubCollectBackup() {
  const keys = {};
  let count = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!_adminHubKeyAllowed(key)) continue;
    const value = localStorage.getItem(key);
    if (typeof value === 'string') { keys[key] = value; count++; }
  }
  return { format: ADMIN_HUB_BACKUP_FORMAT, version: 1, exportedAt: new Date().toISOString(), keyCount: count, keys };
}

/**
 * Drive auto-backup (2026-08-17, Aaron's design): the connection config lives
 * under a prefix that is DELIBERATELY absent from ADMIN_HUB_STORAGE_PREFIXES,
 * so the backup file never carries the write token — on a new device the
 * leader reconnects by hand (the Class Mailbox "setup file" lesson, inverted).
 * The account is the leader's school-managed Education account, covered by
 * the district's DPA; handing records to the official store stays a manual
 * download-and-share, never something this code does.
 */
const ADMIN_HUB_DRIVE_CFG_KEY = 'allo_adminhubdrive_config_v1';

function _adminHubDriveCfg() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ADMIN_HUB_DRIVE_CFG_KEY) || 'null');
    return parsed && typeof parsed === 'object' && typeof parsed.url === 'string' && typeof parsed.token === 'string' ? parsed : null;
  } catch (_) { return null; }
}

function _adminHubHash(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) { h = ((h << 5) + h + text.charCodeAt(i)) | 0; }
  return String(h);
}

async function _adminHubDrivePost(url, body) {
  // String body on purpose: text/plain avoids a CORS preflight the Apps
  // Script web app cannot answer (the Class Mailbox transport pattern).
  const res = await fetch(url, { method: 'POST', body: JSON.stringify(body) });
  return res.json();
}

/**
 * The one Drive-save path, at module level so it can run when the HUB IS NOT
 * MOUNTED: the data changes inside the tools, so the host calls this (via
 * window.AlloModules.AdminHub.maybeDriveBackup) whenever a hub tool closes.
 * Hash-gated — unchanged data never uploads. Never throws; returns
 * {status: 'no-config'|'empty'|'unchanged'|'saved'|'error', ...} so callers
 * decide what deserves a toast. `force` skips the hash gate (the manual
 * "Back up to Drive now" button).
 */
async function _adminHubMaybeDriveBackup(opts) {
  const force = !!(opts && opts.force);
  try {
    const cfg = _adminHubDriveCfg();
    if (!cfg) return { status: 'no-config' };
    const backup = _adminHubCollectBackup();
    if (backup.keyCount === 0) return { status: 'empty' };
    const hash = _adminHubHash(JSON.stringify(backup.keys));
    if (!force && cfg.lastHash === hash) return { status: 'unchanged', lastSavedAt: cfg.lastSavedAt };
    const reply = await _adminHubDrivePost(cfg.url, { token: cfg.token, action: 'save', payload: backup });
    if (!reply || reply.ok !== true) return { status: 'error', error: String((reply && reply.error) || 'save-failed') };
    const next = { ...cfg, lastSavedAt: new Date().toISOString(), lastHash: hash };
    try { localStorage.setItem(ADMIN_HUB_DRIVE_CFG_KEY, JSON.stringify(next)); } catch (_) {}
    return { status: 'saved', keyCount: backup.keyCount, lastSavedAt: next.lastSavedAt };
  } catch (err) {
    return { status: 'error', error: String((err && err.message) || err) };
  }
}

function AdminHubDriveBackup({ tt, addToast }) {
  const [cfg, setCfg] = React.useState(() => _adminHubDriveCfg());
  const [setupOpen, setSetupOpen] = React.useState(false);
  const [urlInput, setUrlInput] = React.useState('');
  const [tokenInput, setTokenInput] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [autoNote, setAutoNote] = React.useState('');

  const writeCfg = (next) => {
    try {
      if (next) localStorage.setItem(ADMIN_HUB_DRIVE_CFG_KEY, JSON.stringify(next));
      else localStorage.removeItem(ADMIN_HUB_DRIVE_CFG_KEY);
    } catch (_) {}
    setCfg(next);
  };

  // One save path for every trigger (module-level _adminHubMaybeDriveBackup —
  // also called by the host when a hub TOOL closes, since that is when the
  // data actually changes). This wrapper maps outcomes to UI.
  const saveToDrive = React.useCallback(async ({ auto, force } = {}) => {
    const result = await _adminHubMaybeDriveBackup({ force: !!force });
    if (result.status === 'saved') {
      setCfg(_adminHubDriveCfg());
      setAutoNote('');
      if (!auto) addToast(tt('adminhub.drive_saved', 'Backup saved to your school Drive ({count} items).').replace('{count}', String(result.keyCount)), 'success');
    } else if (result.status === 'unchanged') {
      if (auto) setAutoNote(tt('adminhub.drive_unchanged', 'No changes since the last Drive backup.'));
    } else if (result.status === 'empty') {
      if (!auto) addToast(tt('adminhub.backup_empty', 'Nothing to back up yet — the hub tools have no saved data on this device.'), 'info');
    } else if (result.status === 'error') {
      addToast((auto
        ? tt('adminhub.drive_auto_failed', 'Automatic Drive backup failed: ')
        : tt('adminhub.drive_save_failed', 'Drive backup failed: ')) + result.error, 'error');
    }
    return result;
  }, [addToast, tt]);

  // Visible auto-save: runs when the hub opens, skips when nothing changed,
  // and reports failure loudly. The status line below is the visibility.
  React.useEffect(() => {
    if (!_adminHubDriveCfg()) return;
    saveToDrive({ auto: true });
  }, [saveToDrive]);

  if (!cfg) {
    return (
      <div className="mt-2 border-t border-slate-200 pt-2" data-help-key="adminhub_drive_section">
        {!setupOpen ? (
          <button type="button" data-help-key="adminhub_drive_setup_open" onClick={() => setSetupOpen(true)}
            className="text-[11px] font-bold text-indigo-700 underline underline-offset-2 hover:text-indigo-900">
            {tt('adminhub.drive_setup_open', 'Set up automatic Drive backup (school Google account)')}
            <span aria-hidden="true">{' →'}</span>
          </button>
        ) : (
          <div>
            <p className="text-[11px] text-slate-600">{tt('adminhub.drive_setup_intro', 'A 3-minute script on your school-managed Google account saves this hub to your Drive automatically — covered by your district’s data agreement. Follow the setup steps in the leader’s guide, then paste the web-app URL and token here.')}</p>
            {/* Visible <label for>, not placeholder-only naming: this form is
                filled once, under mild stress, from a README in another window
                — and a placeholder disappears the moment typing starts. */}
            <div className="mt-2 flex flex-col sm:flex-row gap-2 sm:items-end">
              <div className="flex-1 min-w-0">
                <label htmlFor="adminhub-drive-url" className="block text-[11px] font-bold text-slate-700 mb-0.5">
                  {tt('adminhub.drive_url_label', 'Web app URL')}
                </label>
                <input id="adminhub-drive-url" type="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
                  placeholder={tt('adminhub.drive_url_placeholder', 'Web app URL ending in /exec')}
                  className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs" />
              </div>
              <div className="w-full sm:w-40">
                <label htmlFor="adminhub-drive-token" className="block text-[11px] font-bold text-slate-700 mb-0.5">
                  {tt('adminhub.drive_token_label', 'Backup token')}
                </label>
                <input id="adminhub-drive-token" type="password" value={tokenInput} onChange={(e) => setTokenInput(e.target.value)}
                  placeholder={tt('adminhub.drive_token_placeholder', 'From setup()')}
                  className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs" />
              </div>
              <button type="button" data-help-key="adminhub_drive_connect" disabled={busy || !urlInput.trim() || !tokenInput.trim()}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const url = urlInput.trim();
                    const reply = await _adminHubDrivePost(url, { token: tokenInput.trim(), action: 'ping' });
                    if (!reply || reply.ok !== true) throw new Error((reply && reply.error) || 'no-reply');
                    const next = { url, token: tokenInput.trim(), folder: String(reply.folder || ''), lastSavedAt: null, lastHash: null };
                    writeCfg(next);
                    setSetupOpen(false); setUrlInput(''); setTokenInput('');
                    addToast(tt('adminhub.drive_connected', 'Drive backup connected. Saving a first backup now…'), 'success');
                    await saveToDrive({ force: true });
                  } catch (err) {
                    addToast(tt('adminhub.drive_connect_failed', 'Could not connect: ') + String((err && err.message) || err) + tt('adminhub.drive_connect_hint', ' — check the URL ends in /exec, the token matches setup(), and the deployment allows Anyone.'), 'error');
                  } finally { setBusy(false); }
                }}
                className="min-h-10 px-3 rounded-lg border border-indigo-300 bg-white text-xs font-bold text-indigo-800 hover:bg-indigo-50 disabled:opacity-50">
                {busy ? tt('adminhub.drive_connecting', 'Connecting…') : tt('adminhub.drive_connect', 'Connect & test')}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-2 border-t border-slate-200 pt-2 flex flex-wrap items-center justify-between gap-2" data-help-key="adminhub_drive_section">
      {/* role=status + polite: a backup that happens silently is invisible to
          a screen-reader user, who otherwise has no way to know the save
          occurred. The text changes, so the change is the announcement. */}
      <p role="status" aria-live="polite" className="text-[11px] text-slate-600 min-w-0" data-help-key="adminhub_drive_status">
        <span className="font-bold text-emerald-800">{tt('adminhub.drive_on', 'Drive auto-backup on')}</span>
        {cfg.folder ? ' · ' + cfg.folder : ''}
        {' · '}
        {cfg.lastSavedAt
          ? tt('adminhub.drive_last_saved', 'last saved {time}').replace('{time}', new Date(cfg.lastSavedAt).toLocaleString())
          : tt('adminhub.drive_not_yet', 'no backup saved yet')}
        {autoNote ? ' · ' + autoNote : ''}
      </p>
      <div className="flex gap-2 shrink-0">
        <button type="button" data-help-key="adminhub_drive_save_now" disabled={busy}
          onClick={async () => {
            setBusy(true);
            try { await saveToDrive({ force: true }); } finally { setBusy(false); }
          }}
          className="min-h-10 px-3 rounded-lg border border-emerald-300 bg-white text-[11px] font-bold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">
          {busy ? tt('adminhub.drive_saving', 'Saving…') : tt('adminhub.drive_save_now', 'Back up to Drive now')}
        </button>
        <button type="button" data-help-key="adminhub_drive_disconnect"
          onClick={() => {
            if (window.confirm(tt('adminhub.drive_disconnect_confirm', 'Stop backing up to Drive? Existing backups stay in your Drive folder; only the connection on this device is removed.'))) {
              writeCfg(null);
              addToast(tt('adminhub.drive_disconnected', 'Drive backup disconnected.'), 'info');
            }
          }}
          className="min-h-10 px-3 rounded-lg border border-slate-300 bg-white text-[11px] font-bold text-slate-600 hover:bg-slate-100">
          {tt('adminhub.drive_disconnect', 'Disconnect')}
        </button>
      </div>
    </div>
  );
}

function AdminHubPanel(props) {
  const { onClose, t, openTool = (() => {}), addToast = (() => {}) } = props;
  const tt = React.useCallback((key, fallback) => {
    if (typeof t === 'function') {
      try { const v = t(key); if (v) return v; } catch (_) {}
    }
    return fallback;
  }, [t]);
  const openHubTool = React.useCallback((toolId) => {
    if (toolId !== 'rewards') { openTool(toolId); return; }
    let portalUrl = '';
    try {
      const candidate = new URL(String(window.localStorage.getItem('allo_school_rewards_portal_url_v1') || '').trim());
      if (candidate.protocol === 'https:' && candidate.hostname === 'script.google.com' && !candidate.port && !candidate.username && !candidate.password && !candidate.search && !candidate.hash && /^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(candidate.pathname)) portalUrl = candidate.origin + candidate.pathname;
    } catch (_) {}
    if (!portalUrl) {
      addToast(tt('adminhub.rewards_connect_first', 'Connect School Rewards in Project Settings first.'), 'info');
      return;
    }
    try {
      const popup = window.open(portalUrl, '_blank', 'noopener,noreferrer');
      if (!popup) { addToast(tt('adminhub.rewards_popup_blocked', 'School Rewards was blocked. Allow pop-ups and try again.'), 'error'); return; }
      popup.opener = null;
      onClose();
    } catch (_) { addToast(tt('adminhub.rewards_open_failed', 'School Rewards could not open.'), 'error'); }
  }, [addToast, onClose, openTool, tt]);
  const dialogRef = React.useRef(null);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const previousFocus = document.activeElement;
    const trapStack = window.__alloFocusTrapStack || (window.__alloFocusTrapStack = []);
    const trap = { root: dialog };
    trapStack.push(trap);
    const isTopTrap = () => trapStack[trapStack.length - 1] === trap;
    const getFocusable = () => Array.from(dialog.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
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

  const TOOLS = [
    {
      id: 'mtss', icon: '🧮',
      title: tt('adminhub.mtss_title', 'MTSS Triage'),
      desc: tt('adminhub.mtss_desc', 'Screening scores against YOUR benchmark cut points: suggested risk bands for team review (never automatic placement), intervention grouping, and window-over-window progress.'),
      accent: 'from-violet-50 to-purple-50 border-violet-600', titleCls: 'text-violet-800', descCls: 'text-violet-700',
    },
    {
      id: 'announcements', icon: '📣',
      title: tt('adminhub.announcements_title', 'Family Announcements'),
      desc: tt('adminhub.announcements_desc', 'One announcement, every family language: AI-translated with human review, exported as accessible lang-tagged documents with a translation disclosure — the whole-building packet the Bridge’s live messaging doesn’t cover.'),
      accent: 'from-emerald-50 to-lime-50 border-emerald-700', titleCls: 'text-emerald-900', descCls: 'text-emerald-800',
    },
    {
      id: 'evaluation', icon: '\u2705',
      title: tt('adminhub.evaluation_title', 'Educator Evaluation'),
      desc: tt('adminhub.evaluation_desc', 'Opens your connected district evaluation portal; otherwise your private on-device workspace — completion and weighting views, walkthroughs, formal observations, SPM / SLO, dialogue, receipts, and audit history, with framework profiles for PA Act 13 and Maine PEPG.'),
      accent: 'from-blue-50 to-indigo-50 border-blue-700', titleCls: 'text-blue-900', descCls: 'text-blue-800',
    },
    {
      id: 'rewards', icon: '\uD83C\uDF9F\uFE0F',
      title: tt('adminhub.rewards_title', 'School Rewards & Store'),
      desc: tt('adminhub.rewards_desc', 'Open the connected Google Education rewards ledger for staff recognition, private student balance emails, prize previews, and locked trimester store checkout.'),
      accent: 'from-emerald-50 to-teal-50 border-emerald-700', titleCls: 'text-emerald-900', descCls: 'text-emerald-800',
    },
    {
      id: 'walkthrough', icon: '🚪',
      title: tt('adminhub.walkthrough_title', 'UDL Walkthrough'),
      desc: tt('adminhub.walkthrough_desc', 'Growth-framed classroom visits scored against UDL 3.0 look-fors — feedback cards for teachers, a building heatmap, trends, and inter-rater checks for research use.'),
      accent: 'from-cyan-50 to-sky-50 border-cyan-600', titleCls: 'text-cyan-800', descCls: 'text-cyan-700',
    },
    {
      id: 'walkthroughCopilot', icon: '📝',
      title: tt('adminhub.walkthrough_copilot_title', 'Walkthrough Copilot'),
      desc: tt('adminhub.walkthrough_copilot_desc', 'Turn shorthand walkthrough notes into evidence-based coaching feedback you write and approve — every claim cited back to your own notes, with practice scenarios for building the habit. Formative coaching only; never rates anyone.'),
      accent: 'from-teal-50 to-emerald-50 border-teal-600', titleCls: 'text-teal-800', descCls: 'text-teal-700',
    },
    {
      id: 'dispro', icon: '⚖️',
      title: tt('adminhub.dispro_title', 'Disproportionality Analyzer'),
      desc: tt('adminhub.dispro_desc', 'Risk indexes, risk ratios, and composition from aggregate discipline or identification counts — stability cautions, alternate ratios for small groups, multi-year trends.'),
      accent: 'from-slate-50 to-indigo-50 border-slate-600', titleCls: 'text-slate-800', descCls: 'text-slate-600',
    },
    {
      id: 'timelines', icon: '⏰',
      title: tt('adminhub.timelines_title', 'SpEd Timelines'),
      desc: tt('adminhub.timelines_desc', 'Evaluation clocks, IEP annuals, and triennials on one urgency dashboard with per-provider caseloads — student codes only; due dates are editable prefills you confirm against your state rule.'),
      accent: 'from-amber-50 to-orange-50 border-amber-600', titleCls: 'text-amber-800', descCls: 'text-amber-700',
    },
    {
      id: 'diagnosisEligibility', icon: '🧩',
      title: tt('adminhub.eligibility_title', 'Diagnosis, Evaluation & School Eligibility'),
      desc: tt('adminhub.eligibility_desc', 'Compare clinical diagnosis, IDEA, and Section 504; follow the evaluation path; review federal definitions, safeguards, and timelines; explore open-question cases; and build a privacy-safe meeting-preparation guide. Never decides eligibility, services, or placement.'),
      accent: 'from-fuchsia-50 to-violet-50 border-fuchsia-700', titleCls: 'text-fuchsia-900', descCls: 'text-fuchsia-800',
    },
    {
      id: 'meetings', icon: '📋',
      title: tt('adminhub.meetings_title', 'Meeting Documentation'),
      desc: tt('adminhub.meetings_desc', 'Turn notes or a transcript into your district’s meeting format — SST, IEP team, 504, and custom templates — with source-anchored decisions, an action-item tracker, and local name masking before any AI call.'),
      accent: 'from-emerald-50 to-teal-50 border-emerald-600', titleCls: 'text-emerald-800', descCls: 'text-emerald-700',
    },
  ];

  return (
    <div className="fixed inset-0 z-[260] bg-black/40 flex items-center justify-center overflow-y-auto p-3 sm:p-4" style={{ zIndex: 260 }} role="presentation" onClick={onClose}>
      <div ref={dialogRef} tabIndex={-1} data-help-key="adminhub_panel" className="allo-docsuite bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-5 sm:p-8 max-h-[90vh] overflow-y-auto focus:outline-none focus:ring-2 focus:ring-indigo-500" style={{ maxHeight: '90vh' }} role="dialog" aria-modal="true" aria-labelledby="adminhub-title" aria-describedby="adminhub-subtitle" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 id="adminhub-title" className="text-xl font-bold text-slate-800 flex items-center gap-2"><span aria-hidden="true">🏛️</span> {tt('adminhub.title', 'Leadership Hub')}</h2>
            <p id="adminhub-subtitle" className="text-sm text-slate-600 mt-1">{tt('adminhub.subtitle', 'Tools for principals, coaches, and student-services leaders')}</p>
          </div>
          <button type="button" onClick={onClose} className="min-w-11 min-h-11 p-2 inline-flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors text-xl" aria-label={tt('adminhub.close_aria', 'Close Leadership Hub')}>✕</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TOOLS.map((tool) => (
            <button key={tool.id} type="button" data-help-key="adminhub_tool_card"
              onClick={() => openHubTool(tool.id)}
              className={'flex items-start gap-3 p-4 bg-gradient-to-br border rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all motion-reduce:transform-none motion-reduce:transition-none text-left ' + tool.accent}>
              <span className="text-3xl mt-1" aria-hidden="true">{tool.icon}</span>
              <div>
                <h3 className={'font-bold ' + tool.titleCls}>{tool.title}</h3>
                <p className={'text-xs mt-1 ' + tool.descCls}>{tool.desc}</p>
              </div>
            </button>
          ))}
        </div>
        {/* Backup & restore (2026-08-17): nine tools' data lives in ONE
            browser's storage — a lost or reimaged laptop was a lost
            walkthrough year. One file out, one file in. */}
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3" data-help-key="adminhub_backup_section">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-xs font-black uppercase tracking-wide text-slate-700">{tt('adminhub.backup_title', 'Back up this hub')}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">{tt('adminhub.backup_desc', 'Everything above lives only in this browser. Download one file with all of it, and restore on a new device or after a wipe.')}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button type="button" data-help-key="adminhub_backup_export"
                onClick={() => {
                  try {
                    const backup = _adminHubCollectBackup();
                    if (backup.keyCount === 0) { addToast(tt('adminhub.backup_empty', 'Nothing to back up yet — the hub tools have no saved data on this device.'), 'info'); return; }
                    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'alloflow-leadership-hub-backup-' + backup.exportedAt.slice(0, 10) + '.json';
                    document.body.appendChild(a); a.click(); a.remove();
                    setTimeout(() => { try { URL.revokeObjectURL(url); } catch (_) {} }, 5000);
                    addToast(tt('adminhub.backup_done', 'Backup downloaded ({count} saved items). Keep it where you keep confidential files.').replace('{count}', String(backup.keyCount)), 'success');
                  } catch (err) { addToast(tt('adminhub.backup_failed', 'Backup failed: ') + String((err && err.message) || err), 'error'); }
                }}
                className="min-h-10 px-3 rounded-lg border border-indigo-300 bg-white text-xs font-bold text-indigo-800 hover:bg-indigo-50">
                {tt('adminhub.backup_export', 'Download backup')}
              </button>
              <button type="button" data-help-key="adminhub_backup_restore"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'application/json,.json';
                  input.onchange = () => {
                    const file = input.files && input.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      try {
                        const data = JSON.parse(String(reader.result || ''));
                        if (!data || data.format !== ADMIN_HUB_BACKUP_FORMAT || typeof data.keys !== 'object' || data.keys === null) {
                          addToast(tt('adminhub.restore_not_backup', 'That file is not a Leadership Hub backup.'), 'error'); return;
                        }
                        const entries = Object.entries(data.keys).filter(([k, v]) => _adminHubKeyAllowed(k) && typeof v === 'string');
                        const rejected = Object.keys(data.keys).length - entries.length;
                        if (entries.length === 0) { addToast(tt('adminhub.restore_empty', 'The backup contains no hub data.'), 'error'); return; }
                        const stamp = typeof data.exportedAt === 'string' ? data.exportedAt.slice(0, 10) : '?';
                        // Name what is about to be overwritten, per tool: a bare
                        // count asks the leader to take a leap of faith about
                        // their own records.
                        const breakdown = _adminHubGroupByTool(entries.map(([k]) => k))
                          .map((g) => '· ' + g.tool + ': ' + g.count
                            + ' ' + (g.count === 1 ? tt('adminhub.restore_item_one', 'item') : tt('adminhub.restore_item_many', 'items')))
                          .join('\n');
                        const ok = window.confirm(
                          tt('adminhub.restore_confirm', 'Restore this backup, dated {date}?')
                            .replace('{date}', stamp)
                          + '\n\n' + breakdown + '\n\n'
                          + tt('adminhub.restore_confirm_effect', 'Data for these tools on this device will be replaced by the backup. Tools not listed are left alone, and nothing outside the Leadership Hub is touched.'));
                        if (!ok) return;
                        for (const [k, v] of entries) localStorage.setItem(k, v);
                        addToast(
                          (rejected > 0
                            ? tt('adminhub.restore_done_skipped', 'Restored {count} items; {skipped} entries outside the hub were ignored. Reopen a tool to see its data.').replace('{skipped}', String(rejected))
                            : tt('adminhub.restore_done', 'Restored {count} items. Reopen a tool to see its data.'))
                            .replace('{count}', String(entries.length)),
                          'success');
                      } catch (err) { addToast(tt('adminhub.restore_failed', 'Restore failed: ') + String((err && err.message) || err), 'error'); }
                    };
                    reader.readAsText(file);
                  };
                  input.click();
                }}
                className="min-h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100">
                {tt('adminhub.backup_restore', 'Restore from backup')}
              </button>
            </div>
          </div>
          <p className="text-[11px] text-amber-800 mt-2">{tt('adminhub.backup_caveat', 'The file contains whatever the tools store — codes, notes, and settings. Treat it like the confidential records it may describe, and delete old copies per your retention policy.')}</p>
          <AdminHubDriveBackup tt={tt} addToast={addToast} />
        </div>
        <p className="mt-3 text-[11px] text-slate-500 border-t border-slate-200 pt-3">
          {/* Revised 2026-08-17 (Aaron's call, and he is right): the old text
              forbade real personnel or student information on-device. That was
              written as if the risk were a shared machine. On a managed 1:1
              fleet it is not — browser storage is scoped to the signed-in
              profile, the OS encrypts that profile at rest, and nothing here
              is uploaded at all, which is a stronger posture than most cloud
              vendors offer. What actually remains is records MANAGEMENT
              (retention, discoverability, continuity), not confidentiality —
              so the covenant now says that instead of pretending otherwise.
              The one honest caveat kept: AlloFlow adds no encryption of its
              own; it inherits the device's. */}
          {tt('adminhub.covenant', 'How this suite handles information: analysis tools use aggregate counts or de-identified codes. Everything you enter stays in your signed-in profile on this device and is never uploaded, protected by your device sign-in rather than by separate encryption. Connecting a district portal adds shared, authenticated records staff can see and acknowledge. Apply your district’s retention rules, and keep a backup so a lost device is not a lost year. Human review stays in control—never an automated verdict about a teacher or student.')}
        </p>
        {/* The written manual for this suite (2026-08-17): per-tool first
            sessions, the integrity boundaries, and a year-rhythm. Absolute URL
            on purpose — the guide lives at the origin root, the app under
            /app/, and the desktop build serves neither (it_coach precedent). */}
        <p className="mt-2 text-[11px]">
          <a href="https://alloflow-cdn.pages.dev/guide/for-school-leaders.html" target="_blank" rel="noopener noreferrer"
            data-help-key="adminhub_guide_link"
            /* The accessible name says where it goes: a link that silently
               opens a new tab disorients screen-reader and magnifier users. */
            aria-label={tt('adminhub.guide_link_aria', 'Leader’s guide: how to use these tools (opens in a new tab)')}
            className="font-bold text-indigo-700 underline underline-offset-2 hover:text-indigo-900">
            {tt('adminhub.guide_link', 'Leader’s guide: how to use these tools')}
            {/* Non-breaking space binds the arrow to the last word: on a phone
                it otherwise wrapped alone onto its own line (caught by a
                screenshot, 2026-08-17). Decorative, so hidden from readers. */}
            <span aria-hidden="true">{' →'}</span>
          </a>
        </p>
      </div>
    </div>
  );
}
