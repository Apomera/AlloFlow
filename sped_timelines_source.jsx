/**
 * AlloFlow — SpEd Timelines (Leadership Hub tool) — MVP, Aug 2026.
 *
 * Compliance-deadline tracker for special-education leaders: initial
 * evaluation clocks, IEP annual reviews, and triennial reevaluations,
 * with an urgency dashboard and per-provider caseload rollup. Students
 * are entered as CODES OR INITIALS by design (the UI says so) — no
 * student-record detail lives here, and everything stays on the device.
 *
 * Statutory integrity (deliberate, in-UI): the evaluation clock defaults
 * to the IDEA fallback of 60 CALENDAR days from consent (34 CFR
 * 300.301(c)), but states set their own timeframes — several count SCHOOL
 * days, which no calendar-day computation can reproduce. So the computed
 * due date is a PREFILL, always editable, and the tool never claims a
 * date is "the legal deadline" — your state's rule and calendar govern.
 */

const SPED_CASES_KEY = 'allo_sped_cases_v1';
const SPED_CONFIG_KEY = 'allo_sped_config_v1';

const SPED_TYPES = [
  { id: 'initial_eval', label: 'Initial evaluation', keyLabel: 'Consent received' },
  { id: 'annual', label: 'IEP annual review', keyLabel: 'Last IEP meeting' },
  { id: 'triennial', label: 'Triennial reevaluation', keyLabel: 'Last reevaluation' },
  { id: 'custom', label: 'Other deadline', keyLabel: 'Start date' },
];

function spedLoad(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed == null ? fallback : parsed;
  } catch (_) { return fallback; }
}

function spedStore(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
}

function spedNextId() {
  return 'sc_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

function spedToday() {
  return new Date().toISOString().slice(0, 10);
}

// ── Pure date seams ─────────────────────────────────────────────────

function spedParseDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}

function spedFmt(dt) {
  return dt.toISOString().slice(0, 10);
}

// Same month/day N years later. Feb 29 anchors land on Feb 28 in
// non-leap years (the conservative direction — never later than the
// true anniversary).
function spedAnniversary(dateStr, years) {
  const dt = spedParseDate(dateStr);
  if (!dt) return null;
  const y = dt.getUTCFullYear() + years;
  const mo = dt.getUTCMonth();
  const d = dt.getUTCDate();
  let out = new Date(Date.UTC(y, mo, d));
  if (out.getUTCMonth() !== mo) out = new Date(Date.UTC(y, mo + 1, 0)); // Feb 29 overflow -> last day of Feb
  return spedFmt(out);
}

function spedAddDays(dateStr, days) {
  const dt = spedParseDate(dateStr);
  if (!dt || !Number.isFinite(days)) return null;
  return spedFmt(new Date(dt.getTime() + days * 86400000));
}

// Prefill only — always editable in the UI.
function spedDefaultDue(type, keyDate, evalDays) {
  if (!spedParseDate(keyDate)) return null;
  if (type === 'initial_eval') return spedAddDays(keyDate, Number.isFinite(Number(evalDays)) && Number(evalDays) > 0 ? Number(evalDays) : 60);
  if (type === 'annual') return spedAnniversary(keyDate, 1);
  if (type === 'triennial') return spedAnniversary(keyDate, 3);
  return null; // custom: the user types the due date
}

function spedDaysUntil(dueDate, today) {
  const a = spedParseDate(dueDate), b = spedParseDate(today);
  if (!a || !b) return null;
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

// Urgency bands. Thresholds are working-convention prompts, not law.
function spedBand(c, today) {
  if (c.completedAt) return 'done';
  const days = spedDaysUntil(c.dueDate, today);
  if (days == null) return 'undated';
  if (days < 0) return 'overdue';
  if (days <= 14) return 'urgent';
  if (days <= 30) return 'soon';
  return 'ok';
}

const SPED_BAND_META = {
  overdue: { label: 'Overdue', order: 0, cls: 'bg-rose-100 text-rose-900 border-rose-400' },
  urgent: { label: 'Due in 14 days', order: 1, cls: 'bg-amber-100 text-amber-900 border-amber-400' },
  soon: { label: 'Due in 30 days', order: 2, cls: 'bg-yellow-50 text-yellow-900 border-yellow-300' },
  ok: { label: 'On track', order: 3, cls: 'bg-green-50 text-green-900 border-green-300' },
  undated: { label: 'No due date', order: 4, cls: 'bg-slate-100 text-slate-700 border-slate-300' },
  done: { label: 'Completed', order: 5, cls: 'bg-slate-100 text-slate-500 border-slate-300' },
};

function spedRollup(cases, today) {
  const counts = { overdue: 0, urgent: 0, soon: 0, ok: 0, undated: 0, done: 0 };
  const providerMap = {};
  const banded = (cases || []).map((c) => {
    const band = spedBand(c, today);
    counts[band] += 1;
    const provider = String(c.provider || '').trim() || '(unassigned)';
    const p = providerMap[provider] || (providerMap[provider] = { provider, open: 0, overdue: 0, urgent: 0, done: 0 });
    if (band === 'done') p.done += 1;
    else { p.open += 1; if (band === 'overdue') p.overdue += 1; if (band === 'urgent') p.urgent += 1; }
    return { ...c, band, daysUntil: spedDaysUntil(c.dueDate, today) };
  });
  banded.sort((a, b) => {
    const oa = SPED_BAND_META[a.band].order, ob = SPED_BAND_META[b.band].order;
    if (oa !== ob) return oa - ob;
    return String(a.dueDate || '9999').localeCompare(String(b.dueDate || '9999'));
  });
  const byProvider = Object.values(providerMap).sort((a, b) => (b.overdue - a.overdue) || (b.urgent - a.urgent) || (b.open - a.open));
  return { counts, cases: banded, byProvider };
}

function spedCsv(cases, today) {
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const head = ['student_code', 'type', 'provider', 'key_date', 'due_date', 'days_until_due', 'status', 'completed_at'];
  const lines = [head.join(',')];
  spedRollup(cases, today).cases.forEach((c) => {
    const type = SPED_TYPES.find((t) => t.id === c.type);
    lines.push([
      esc(c.code), esc(type ? type.label : c.type), esc(c.provider || ''),
      esc(c.keyDate || ''), esc(c.dueDate || ''),
      c.daysUntil == null ? '' : c.daysUntil,
      esc(SPED_BAND_META[c.band].label), esc(c.completedAt || ''),
    ].join(','));
  });
  lines.push('');
  lines.push(esc('Exported ' + today + '. Due dates are working prefills (IDEA 60-calendar-day fallback for evaluations; anniversary dates for annual/triennial) — state rules and school calendars govern; verify against your state timeline.'));
  return lines.join('\r\n');
}

function spedDownload(filename, mime, content, addToast, okMsg, failMsg) {
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

function spedAnnounce(message) {
  try {
    const region = document.getElementById('allo-live-spedtl');
    if (region) { region.textContent = ''; region.textContent = message; }
  } catch (_) {}
}

function SpedTimelinesPanel(props) {
  const { onClose, t, addToast = (() => {}) } = props;
  const tt = React.useCallback((key, fallback) => {
    if (typeof t === 'function') {
      try { const v = t(key); if (v) return v; } catch (_) {}
    }
    return fallback;
  }, [t]);

  const [config, setConfig] = React.useState(() => {
    const c = spedLoad(SPED_CONFIG_KEY, {});
    return { evalDays: 60, ...(c && typeof c === 'object' ? c : {}) };
  });
  const [cases, setCases] = React.useState(() => { const v = spedLoad(SPED_CASES_KEY, []); return Array.isArray(v) ? v : []; });
  const [tab, setTab] = React.useState('dashboard');
  const [form, setForm] = React.useState({ code: '', type: 'initial_eval', provider: '', keyDate: '', dueDate: '' });
  const [armDelete, setArmDelete] = React.useState(null);
  const importInputRef = React.useRef(null);
  const dialogRef = React.useRef(null);

  React.useEffect(() => { spedStore(SPED_CASES_KEY, cases); }, [cases]);
  React.useEffect(() => { spedStore(SPED_CONFIG_KEY, config); }, [config]);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const previousFocus = document.activeElement;
    const trapStack = window.__alloFocusTrapStack || (window.__alloFocusTrapStack = []);
    const trap = { root: dialog };
    trapStack.push(trap);
    const isTopTrap = () => trapStack[trapStack.length - 1] === trap;
    const getFocusable = () => Array.from(dialog.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
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

  const today = spedToday();
  const rollup = spedRollup(cases, today);

  const updateForm = (patch) => {
    setForm((f) => {
      const next = { ...f, ...patch };
      // Recompute the prefill when type/keyDate change, UNLESS the user
      // already hand-edited the due date to something else.
      if (patch.type !== undefined || patch.keyDate !== undefined) {
        const oldAuto = spedDefaultDue(f.type, f.keyDate, config.evalDays);
        if (!f.dueDate || f.dueDate === oldAuto) {
          next.dueDate = spedDefaultDue(next.type, next.keyDate, config.evalDays) || '';
        }
      }
      return next;
    });
  };

  const addCase = () => {
    const code = form.code.trim();
    if (!code) { addToast(tt('spedtl.need_code', 'Enter a student code or initials.'), 'warning'); return; }
    if (!spedParseDate(form.dueDate)) { addToast(tt('spedtl.need_due', 'Enter or confirm a due date.'), 'warning'); return; }
    const record = {
      id: spedNextId(), code, type: form.type,
      provider: form.provider.trim(),
      keyDate: spedParseDate(form.keyDate) ? form.keyDate : '',
      dueDate: form.dueDate, completedAt: null,
    };
    setCases((list) => [...list, record]);
    setForm((f) => ({ ...f, code: '', keyDate: '', dueDate: '' }));
    addToast(tt('spedtl.added', 'Timeline added.'), 'success');
  };

  const setDone = (id, done) => {
    setCases((list) => list.map((c) => c.id === id ? { ...c, completedAt: done ? today : null } : c));
  };

  const exportJson = () => {
    const payload = { kind: 'alloflow-sped-timelines', version: 1, exportedAt: new Date().toISOString(), config, cases };
    spedDownload('sped-timelines-' + today + '.json', 'application/json', JSON.stringify(payload, null, 2), addToast,
      tt('spedtl.export_toast', 'Export started — check your downloads.'), tt('spedtl.export_failed', 'Export failed: '));
  };

  const importJson = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!data || data.kind !== 'alloflow-sped-timelines') { addToast(tt('spedtl.import_bad', 'That file is not a SpEd Timelines export.'), 'error'); return; }
        setCases((list) => {
          const have = new Set(list.map((x) => x.id));
          return [...list, ...((data.cases || []).filter((x) => x && x.id && !have.has(x.id)))];
        });
        addToast(tt('spedtl.import_toast', 'Import merged.'), 'success');
      } catch (e) {
        addToast(tt('spedtl.import_failed', 'Import failed: ') + String(e && e.message), 'error');
      }
    };
    reader.onerror = () => addToast(tt('spedtl.import_failed', 'Import failed: ') + 'read error', 'error');
    reader.readAsText(file);
  };

  const tabs = [
    { id: 'dashboard', label: tt('spedtl.tab_dashboard', 'Dashboard'), icon: '⏰' },
    { id: 'cases', label: tt('spedtl.tab_cases', 'Timelines'), icon: '🗂️' },
  ];

  const typeLabel = (id) => (SPED_TYPES.find((x) => x.id === id) || {}).label || id;

  return (
    <div className="fixed inset-0 z-[260] bg-black/40 flex items-center justify-center overflow-y-auto p-2 sm:p-4" style={{ zIndex: 260 }} role="presentation" onClick={onClose}>
      <div ref={dialogRef} tabIndex={-1} data-help-key="spedtl_panel" className="allo-docsuite bg-slate-50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto focus:outline-none focus:ring-2 focus:ring-indigo-500" style={{ maxHeight: '92vh' }} role="dialog" aria-modal="true" aria-labelledby="spedtl-title" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 bg-slate-50/95 border-b border-slate-200 px-4 pt-4 pb-2 rounded-t-2xl">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 id="spedtl-title" className="text-lg font-bold text-slate-800 flex items-center gap-2"><span aria-hidden="true">⏰</span> {tt('spedtl.title', 'SpEd Timelines')}</h2>
              <p className="text-xs text-slate-600">{tt('spedtl.subtitle', 'Evaluation clocks, annuals, and triennials — student codes only, on this device.')}</p>
            </div>
            <button type="button" onClick={onClose} className="min-w-11 min-h-11 p-2 inline-flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 text-xl" aria-label={tt('spedtl.close_aria', 'Close SpEd Timelines')}>✕</button>
          </div>
          <div role="tablist" aria-label={tt('spedtl.tabs_aria', 'Timeline sections')} className="flex gap-1 mt-2">
            {tabs.map((tb, tbIdx) => (
              <button key={tb.id} type="button" role="tab" id={'spedtl-tab-' + tb.id} aria-selected={tab === tb.id}
                aria-controls="spedtl-tabpanel" tabIndex={tab === tb.id ? 0 : -1} data-help-key={'spedtl_tab_' + tb.id}
                onClick={() => setTab(tb.id)}
                onKeyDown={(e) => {
                  let next = null;
                  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (tbIdx + 1) % tabs.length;
                  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (tbIdx - 1 + tabs.length) % tabs.length;
                  else if (e.key === 'Home') next = 0;
                  else if (e.key === 'End') next = tabs.length - 1;
                  if (next == null) return;
                  e.preventDefault();
                  setTab(tabs[next].id);
                  const el = document.getElementById('spedtl-tab-' + tabs[next].id);
                  if (el) el.focus();
                }}
                className={'min-h-11 px-3 py-1.5 rounded-t-lg text-sm font-bold border-b-2 ' + (tab === tb.id ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-100')}
              ><span aria-hidden="true">{tb.icon}</span> {tb.label}</button>
            ))}
          </div>
        </div>

        <div className="p-4" role="tabpanel" id="spedtl-tabpanel" aria-labelledby={'spedtl-tab-' + tab} tabIndex={-1}>
          {tab === 'dashboard' && (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                {['overdue', 'urgent', 'soon', 'ok'].map((band) => (
                  <div key={band} className={'p-3 rounded-xl border text-center ' + SPED_BAND_META[band].cls}>
                    <span className="block text-2xl font-bold">{rollup.counts[band]}</span>
                    <span className="block text-[11px] font-bold">{tt('spedtl.band_' + band, SPED_BAND_META[band].label)}</span>
                  </div>
                ))}
              </div>
              {cases.length === 0 && <p className="text-sm text-slate-600 bg-white border border-slate-300 rounded-xl p-3">{tt('spedtl.empty', 'No timelines yet — add them on the Timelines tab.')}</p>}
              {rollup.cases.filter((c) => c.band !== 'done').length > 0 && (
                <div className="bg-white border border-slate-300 rounded-xl p-2 mb-3 overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <caption className="text-left text-sm font-bold text-slate-700 p-1">{tt('spedtl.open_caption', 'Open timelines, most urgent first')}</caption>
                    <thead>
                      <tr>
                        <th scope="col" className="text-left p-1.5 text-slate-600">{tt('spedtl.col_student', 'Student')}</th>
                        <th scope="col" className="text-left p-1.5 text-slate-600">{tt('spedtl.col_type', 'Type')}</th>
                        <th scope="col" className="text-left p-1.5 text-slate-600">{tt('spedtl.col_provider', 'Provider')}</th>
                        <th scope="col" className="p-1.5 text-slate-600">{tt('spedtl.col_due', 'Due')}</th>
                        <th scope="col" className="p-1.5 text-slate-600">{tt('spedtl.col_days', 'Days')}</th>
                        <th scope="col" className="p-1.5 text-slate-600"><span className="sr-only">{tt('spedtl.col_done', 'Mark complete')}</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rollup.cases.filter((c) => c.band !== 'done').map((c) => (
                        <tr key={c.id} className="border-t border-slate-200">
                          <th scope="row" className="text-left p-1.5 font-bold text-slate-800">{c.code}</th>
                          <td className="p-1.5 text-slate-700">{typeLabel(c.type)}</td>
                          <td className="p-1.5 text-slate-700">{c.provider || '—'}</td>
                          <td className="p-1.5 text-center text-slate-700">{c.dueDate || '—'}</td>
                          <td className="p-1.5 text-center">
                            <span className={'inline-block px-1.5 py-0.5 rounded border text-[10px] font-bold ' + SPED_BAND_META[c.band].cls}>
                              {c.daysUntil == null ? '—' : (c.daysUntil < 0 ? (Math.abs(c.daysUntil) + ' ' + tt('spedtl.days_over', 'over')) : c.daysUntil)}
                            </span>
                          </td>
                          <td className="p-1.5 text-center">
                            <input type="checkbox" checked={false} onChange={() => setDone(c.id, true)}
                              aria-label={tt('spedtl.done_aria', 'Mark complete:') + ' ' + c.code + ' ' + typeLabel(c.type)} className="w-4 h-4" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {rollup.byProvider.length > 0 && (
                <div className="bg-white border border-slate-300 rounded-xl p-3">
                  <h4 className="text-sm font-bold text-slate-700">{tt('spedtl.caseload_title', 'Caseload by provider')}</h4>
                  <ul className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {rollup.byProvider.map((p) => (
                      <li key={p.provider} className={'text-xs p-2 rounded-lg border ' + (p.overdue > 0 ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 border-slate-200')}>
                        <span className="font-bold text-slate-800">{p.provider}</span>{' — '}
                        <span className="text-slate-700">{p.open} {tt('spedtl.open_short', 'open')}{p.overdue > 0 ? (', ' + p.overdue + ' ' + tt('spedtl.overdue_short', 'overdue')) : ''}{p.urgent > 0 ? (', ' + p.urgent + ' ' + tt('spedtl.urgent_short', 'due ≤14d')) : ''}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="mt-3 text-[10px] text-slate-500">
                {tt('spedtl.integrity_note', 'Due dates are working prefills: the evaluation clock uses the IDEA fallback of 60 calendar days from consent (34 CFR 300.301(c)) unless you set a different count, and annual/triennial dates are anniversaries. States set their own timeframes — several count school days, which a calendar can’t compute — so always confirm against your state rule and district calendar. Urgency bands (14/30 days) are working conventions, not legal thresholds.')}
              </p>
            </div>
          )}

          {tab === 'cases' && (
            <div>
              <div className="bg-white border border-slate-300 rounded-xl p-3 mb-3">
                <h3 className="text-sm font-bold text-slate-700 mb-1">{tt('spedtl.add_title', 'Add a timeline')}</h3>
                <p className="text-[10px] text-slate-500 mb-2">{tt('spedtl.code_note', 'Use initials or a code, not full names — this tool needs deadlines, not student records.')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="spedtl-code" className="block text-xs font-bold text-slate-600 mb-1">{tt('spedtl.code_label', 'Student code / initials')}</label>
                    <input id="spedtl-code" type="text" value={form.code} onChange={(e) => updateForm({ code: e.target.value })}
                      className="w-full min-h-11 border border-slate-300 rounded-lg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label htmlFor="spedtl-type" className="block text-xs font-bold text-slate-600 mb-1">{tt('spedtl.type_label', 'Timeline type')}</label>
                    <select id="spedtl-type" value={form.type} onChange={(e) => updateForm({ type: e.target.value })}
                      className="w-full min-h-11 border border-slate-300 rounded-lg px-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      {SPED_TYPES.map((ty) => <option key={ty.id} value={ty.id}>{tt('spedtl.type_' + ty.id, ty.label)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="spedtl-keydate" className="block text-xs font-bold text-slate-600 mb-1">{(SPED_TYPES.find((ty) => ty.id === form.type) || {}).keyLabel || 'Start date'}</label>
                    <input id="spedtl-keydate" type="date" value={form.keyDate} onChange={(e) => updateForm({ keyDate: e.target.value })}
                      className="w-full min-h-11 border border-slate-300 rounded-lg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label htmlFor="spedtl-due" className="block text-xs font-bold text-slate-600 mb-1">{tt('spedtl.due_label', 'Due date (prefilled — confirm against your state rule)')}</label>
                    <input id="spedtl-due" type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                      className="w-full min-h-11 border border-slate-300 rounded-lg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label htmlFor="spedtl-provider" className="block text-xs font-bold text-slate-600 mb-1">{tt('spedtl.provider_label', 'Provider / case manager (optional)')}</label>
                    <input id="spedtl-provider" type="text" value={form.provider} onChange={(e) => updateForm({ provider: e.target.value })}
                      className="w-full min-h-11 border border-slate-300 rounded-lg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="w-28">
                      <label htmlFor="spedtl-evaldays" className="block text-xs font-bold text-slate-600 mb-1">{tt('spedtl.evaldays_label', 'Eval days')}</label>
                      <input id="spedtl-evaldays" type="text" inputMode="numeric" value={config.evalDays}
                        onChange={(e) => setConfig((c) => ({ ...c, evalDays: e.target.value.replace(/[^0-9]/g, '') }))}
                        className="w-full min-h-11 border border-slate-300 rounded-lg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <button type="button" onClick={addCase} className="min-h-11 flex-1 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700">{tt('spedtl.add', 'Add')}</button>
                  </div>
                </div>
              </div>

              <h3 className="text-sm font-bold text-slate-700 mb-1">{tt('spedtl.all_title', 'All timelines')}</h3>
              {cases.length === 0 && <p className="text-sm text-slate-600 bg-white border border-slate-300 rounded-xl p-3">{tt('spedtl.none', 'Nothing tracked yet.')}</p>}
              <ul className="space-y-1">
                {rollup.cases.map((c) => (
                  <li key={c.id} className={'flex items-center gap-2 p-2 rounded-xl border text-xs ' + (c.band === 'overdue' ? 'bg-rose-50 border-rose-300' : 'bg-white border-slate-300')}>
                    <input type="checkbox" checked={!!c.completedAt} onChange={(e) => setDone(c.id, e.target.checked)}
                      aria-label={tt('spedtl.done_aria', 'Mark complete:') + ' ' + c.code + ' ' + typeLabel(c.type)} className="w-4 h-4 shrink-0" />
                    <span className={'min-w-0 flex-1 ' + (c.completedAt ? 'line-through text-slate-400' : 'text-slate-700')}>
                      <span className="font-bold">{c.code}</span> · {typeLabel(c.type)}{c.provider ? (' · ' + c.provider) : ''}
                    </span>
                    <span className="shrink-0 text-[10px] text-slate-500">
                      {c.completedAt ? (tt('spedtl.done_on', 'done') + ' ' + c.completedAt) : ((c.dueDate || '—') + (c.daysUntil != null && c.daysUntil < 0 ? (' · ' + Math.abs(c.daysUntil) + ' ' + tt('spedtl.days_over', 'over')) : ''))}
                    </span>
                    <button type="button"
                      onClick={() => {
                        if (armDelete === c.id) { setCases((list) => list.filter((x) => x.id !== c.id)); setArmDelete(null); addToast(tt('spedtl.deleted', 'Timeline deleted.'), 'info'); }
                        else { setArmDelete(c.id); spedAnnounce(tt('spedtl.delete_arm_announce', 'Activate delete again to permanently remove this timeline.')); }
                      }}
                      aria-label={(armDelete === c.id ? tt('spedtl.delete_confirm_aria', 'Confirm delete') : tt('spedtl.delete_aria', 'Delete')) + ' ' + c.code + ' ' + typeLabel(c.type)}
                      className={'shrink-0 min-w-9 min-h-9 inline-flex items-center justify-center rounded text-[11px] font-bold ' + (armDelete === c.id ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-rose-700 hover:bg-rose-50')}
                    >{armDelete === c.id ? tt('spedtl.delete_confirm_short', 'Sure?') : '✕'}</button>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => spedDownload('sped-timelines-' + today + '.csv', 'text/csv;charset=utf-8', '\uFEFF' + spedCsv(cases, today), addToast, tt('spedtl.export_toast', 'Export started — check your downloads.'), tt('spedtl.export_failed', 'Export failed: '))}
                  className="min-h-11 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-bold hover:bg-slate-100"><span aria-hidden="true">⬇️</span> {tt('spedtl.export_csv', 'Export CSV')}</button>
                <button type="button" onClick={exportJson} className="min-h-11 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-bold hover:bg-slate-100"><span aria-hidden="true">⬇️</span> {tt('spedtl.export_json', 'Export data (JSON)')}</button>
                <button type="button" onClick={() => { if (importInputRef.current) importInputRef.current.click(); }} className="min-h-11 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-bold hover:bg-slate-100"><span aria-hidden="true">⬆️</span> {tt('spedtl.import', 'Import export file')}</button>
                <input ref={importInputRef} type="file" accept="application/json,.json" className="sr-only" aria-label={tt('spedtl.import_aria', 'Choose a SpEd Timelines export file')}
                  onChange={(e) => { const f = e.target.files && e.target.files[0]; try { e.target.value = ''; } catch (_) {} if (f) importJson(f); }} />
              </div>
              <p className="mt-2 text-[10px] text-slate-500">{tt('spedtl.storage_note', 'Timelines live only in this browser’s storage — export after changes (Gemini Canvas may not persist storage between sessions). Imports merge; they never overwrite newer local work.')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
