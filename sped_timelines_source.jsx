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

function spedVaultBackend() {
  try {
    const sw = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.SensitiveWorkspace;
    if (!sw || typeof sw.getStatus !== 'function') return { mode: 'local', storage: localStorage };
    const phase = sw.getStatus()?.phase;
    if (phase === 'new') return { mode: 'local', storage: localStorage };
    if (phase === 'ready') {
      const sess = typeof sw.getSession === 'function' ? sw.getSession('sped-timelines') : null;
      if (sess && sess.storage) return { mode: 'vault', storage: sess.storage };
    }
    return { mode: 'locked', storage: null };
  } catch (_) {
    return { mode: 'locked', storage: null };
  }
}

function spedLoad(key, fallback) {
  try {
    const b = spedVaultBackend();
    if (b.mode === 'locked') return fallback;
    let raw = b.mode === 'vault' ? b.storage.getItem(key) : localStorage.getItem(key);
    if (!raw && b.mode === 'vault') {
      try { raw = localStorage.getItem(key); } catch (_) {}
    }
    if (!raw) return fallback;
    const parsed = JSON.parse(raw, (k, v) => (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v);
    return parsed == null ? fallback : parsed;
  } catch (_) { return fallback; }
}

function spedStore(key, value) {
  try {
    const b = spedVaultBackend();
    if (b.mode === 'locked') return;
    const serialized = JSON.stringify(value);
    if (b.mode === 'vault') {
      b.storage.setItem(key, serialized);
      try { localStorage.removeItem(key); } catch (_) {}
    } else {
      localStorage.setItem(key, serialized);
    }
  } catch (_) {}
}

function spedNextId() {
  return 'sc_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

function spedToday() {
  // The LOCAL calendar date. toISOString() is UTC, which in US time zones is
  // already tomorrow by late afternoon (5 pm in Portland in summer).
  // Here a deadline due today read as Overdue every evening.
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
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
  if (!dt || !(dt instanceof Date) || Number.isNaN(dt.getTime())) return null;
  const y = dt.getUTCFullYear();
  if (y < 1 || y > 9999) return null;
  return String(y).padStart(4, '0') + '-' + String(dt.getUTCMonth() + 1).padStart(2, '0') + '-' + String(dt.getUTCDate()).padStart(2, '0');
}

// Same month/day N years later. Feb 29 anchors land on Feb 28 in
// non-leap years (the conservative direction — never later than the
// true anniversary).
function spedAnniversary(dateStr, years) {
  const dt = spedParseDate(dateStr);
  if (!dt || !Number.isFinite(years)) return null;
  const y = dt.getUTCFullYear() + Math.trunc(years);
  if (y < 1 || y > 9999) return null;
  const mo = dt.getUTCMonth();
  const d = dt.getUTCDate();
  let out = new Date(0);
  out.setUTCFullYear(y, mo, d);
  if (Number.isNaN(out.getTime())) return null;
  if (out.getUTCMonth() !== mo) { out = new Date(0); out.setUTCFullYear(y, mo + 1, 0); } // Feb 29 overflow -> last day of Feb
  return spedFmt(out);
}

function spedAddDays(dateStr, days) {
  const dt = spedParseDate(dateStr);
  if (!dt || !Number.isFinite(days)) return null;
  const clamped = Math.max(-36500, Math.min(36500, Math.trunc(days)));
  const out = new Date(dt.getTime() + clamped * 86400000);
  return spedFmt(out);
}

// Prefill only — always editable in the UI.
function spedDefaultDue(type, keyDate, evalDays) {
  if (!spedParseDate(keyDate)) return null;
  const validDays = typeof evalDays !== 'boolean' && typeof evalDays !== 'symbol' && evalDays !== null && String(evalDays).trim() !== ''
    && Number.isFinite(Number(evalDays)) && Number(evalDays) > 0
    ? Number(evalDays) : 60;
  if (type === 'initial_eval') return spedAddDays(keyDate, validDays);
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
  if (!c || typeof c !== 'object') return 'undated';
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
  done: { label: 'Completed', order: 5, cls: 'bg-slate-100 text-slate-600 border-slate-300' },
};

function spedRollup(cases, today) {
  const counts = { overdue: 0, urgent: 0, soon: 0, ok: 0, undated: 0, done: 0 };
  const providerMap = Object.create(null);
  const safeCases = Array.isArray(cases) ? cases.filter((c) => c && typeof c === 'object') : [];
  const banded = safeCases.map((c) => {
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
    const raw = v == null ? '' : String(v);
    const s = (/^[\t\r\n]/.test(raw) || /^\s*[=+\-@|]/.test(raw)) ? "'" + raw : raw;
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
    setTimeout(() => { try { URL.revokeObjectURL(url); } catch (_) {} }, 4000);
    addToast(okMsg, 'info');
  } catch (e) {
    addToast(failMsg + String(e && e.message), 'error');
  }
}

function spedAnnounce(message) {
  try {
    const region = typeof document !== 'undefined' && document.getElementById('allo-live-spedtl');
    if (region) {
      region.textContent = '';
      setTimeout(() => { try { if (region.isConnected) region.textContent = message; } catch (_) {} }, 0);
    }
  } catch (_) {}
}

function SpedTimelinesPanel(props) {
  const { onClose, t, addToast = (() => {}), onOpenEligibility } = props;
  const tt = React.useCallback((key, fallback) => {
    if (typeof t === 'function') {
      try { const v = t(key); if (v) return v; } catch (_) {}
    }
    return fallback;
  }, [t]);

  const [config, setConfig] = React.useState(() => {
    const c = spedLoad(SPED_CONFIG_KEY, {});
    const safeObj = (c && typeof c === 'object' && !Array.isArray(c)) ? c : {};
    const validDays = (typeof safeObj.evalDays === 'number' || typeof safeObj.evalDays === 'string') ? safeObj.evalDays : 60;
    return { ...safeObj, evalDays: validDays };
  });
  const [cases, setCases] = React.useState(() => {
    const v = spedLoad(SPED_CASES_KEY, []);
    return Array.isArray(v) ? v.filter((c) => c && typeof c === 'object') : [];
  });
  const casesDirtyRef = React.useRef(false);
  const configDirtyRef = React.useRef(false);
  const mountedRef = React.useRef(true);
  React.useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  const [tab, setTab] = React.useState('dashboard');
  const [form, setForm] = React.useState({ code: '', type: 'initial_eval', provider: '', keyDate: '', dueDate: '' });
  const [armDelete, setArmDelete] = React.useState(null);
  const importInputRef = React.useRef(null);
  const dialogRef = React.useRef(null);

  React.useEffect(() => { if (casesDirtyRef.current) spedStore(SPED_CASES_KEY, cases); }, [cases]);
  React.useEffect(() => { if (configDirtyRef.current) spedStore(SPED_CONFIG_KEY, config); }, [config]);
  React.useEffect(() => { setArmDelete(null); }, [tab]);

  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || typeof document === 'undefined') return undefined;
    const previousFocus = document.activeElement;
    const trapStack = window.__alloFocusTrapStack || (window.__alloFocusTrapStack = []);
    const trap = { root: dialog };
    trapStack.push(trap);
    const isTopTrap = () => trapStack[trapStack.length - 1] === trap;
    const isolated = [];
    const seenSiblings = new Set();
    let cursor = dialog;
    while (cursor && cursor.parentElement) {
      const parent = cursor.parentElement;
      Array.from(parent.children).forEach((sibling) => {
        if (!sibling || sibling === cursor || seenSiblings.has(sibling) || !sibling.tagName || /^(SCRIPT|STYLE|LINK|TEMPLATE)$/i.test(sibling.tagName) || (typeof sibling.matches === 'function' && sibling.matches('[aria-live], [role="status"], [role="alert"], [data-toast-region]'))) return;
        seenSiblings.add(sibling);
        isolated.push({
          sibling,
          hadInert: sibling.hasAttribute('inert'),
          prevInert: sibling.inert,
          ariaHidden: sibling.getAttribute('aria-hidden'),
        });
        try { sibling.inert = true; } catch (_) {}
        try { sibling.setAttribute('inert', ''); } catch (_) {}
        try { sibling.setAttribute('aria-hidden', 'true'); } catch (_) {}
      });
      if (parent === document.body) break;
      cursor = parent;
    }
    const body = document.body;
    const scrollLock = window.__alloScrollLockState || (window.__alloScrollLockState = { count: 0, prev: '' });
    let scrollLocked = false;
    try {
      if (body) {
        scrollLocked = true;
        if (++scrollLock.count === 1) { scrollLock.prev = body.style.overflow; body.style.overflow = 'hidden'; }
      }
    } catch (_) {}
    const getFocusable = () => Array.from(dialog.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'
    )).filter((el) => {
      if (el.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
      const closedDetails = el.closest('details:not([open])');
      if (closedDetails && !(el.tagName === 'SUMMARY' && el.parentElement === closedDetails)) return false;
      if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
        for (let node = el; node && node !== dialog.parentElement; node = node.parentElement) {
          const st = window.getComputedStyle(node);
          if (st && (st.display === 'none' || st.visibility === 'hidden')) return false;
          if (node === dialog) break;
        }
      }
      return true;
    });
    const first = getFocusable()[0];
    if (!dialog.contains(document.activeElement)) (first || dialog).focus();
    const onKeyDown = (event) => {
      if (event.defaultPrevented || !dialog.isConnected || !isTopTrap()) return;
      if ((event.nativeEvent && event.nativeEvent.isComposing) || event.isComposing || event.keyCode === 229) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (typeof onCloseRef.current === 'function') onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      if (focusable.length === 0) { event.preventDefault(); dialog.focus(); return; }
      const firstItem = focusable[0], lastItem = focusable[focusable.length - 1];
      if (!dialog.contains(document.activeElement) || document.activeElement === dialog) { event.preventDefault(); (event.shiftKey ? lastItem : firstItem).focus(); }
      else if (event.shiftKey && document.activeElement === firstItem) { event.preventDefault(); lastItem.focus(); }
      else if (!event.shiftKey && document.activeElement === lastItem) { event.preventDefault(); firstItem.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      try {
        if (scrollLocked && body) {
          scrollLock.count = Math.max(0, scrollLock.count - 1);
          if (scrollLock.count === 0) body.style.overflow = scrollLock.prev;
        }
      } catch (_) {}
      isolated.forEach(({ sibling, hadInert, prevInert, ariaHidden }) => {
        if (!sibling || !sibling.isConnected) return;
        if (!hadInert) {
          try { sibling.inert = false; } catch (_) {}
          try { sibling.removeAttribute('inert'); } catch (_) {}
        } else {
          /* already inert when this dialog opened: leave it as it is now */
        }
        if (ariaHidden == null) { try { sibling.removeAttribute('aria-hidden'); } catch (_) {} }
        else { try { if (ariaHidden !== 'true') sibling.setAttribute('aria-hidden', ariaHidden); } catch (_) {} }
      });
      const wasTop = isTopTrap();
      const idx = trapStack.lastIndexOf(trap);
      if (idx !== -1) trapStack.splice(idx, 1);
      if (wasTop && previousFocus && previousFocus !== document.body && previousFocus !== document.documentElement && previousFocus.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus();
    };
  }, []);

  const vaultLocked = spedVaultBackend().mode === 'locked';
  const today = spedToday();
  const rollup = React.useMemo(() => spedRollup(cases, today), [cases, today]);

  const [dueDateManual, setDueDateManual] = React.useState(false);
  const dueDateManualRef = React.useRef(false);
  const [dashBandFilter, setDashBandFilter] = React.useState('all');
  const [dashProviderFilter, setDashProviderFilter] = React.useState('');
  const [casesStatusFilter, setCasesStatusFilter] = React.useState('all');
  const [casesQuery, setCasesQuery] = React.useState('');
  const backdropDownRef = React.useRef(false);

  const openCases = rollup.cases.filter((c) => c.band !== 'done');
  const doneCount = rollup.counts.done || 0;
  const filteredOpenCases = openCases.filter((c) => {
    if (dashBandFilter !== 'all' && c.band !== dashBandFilter) return false;
    if (dashProviderFilter) {
      const prov = String(c.provider || '').trim() || '(unassigned)';
      if (prov !== dashProviderFilter) return false;
    }
    return true;
  });
  const hasDashFilter = dashBandFilter !== 'all' || !!dashProviderFilter;
  const normalizedCasesQuery = casesQuery.trim().toLowerCase();
  const filteredAllCases = rollup.cases.filter((c) => {
    if (casesStatusFilter === 'open' && c.band === 'done') return false;
    if (casesStatusFilter === 'done' && c.band !== 'done') return false;
    if (normalizedCasesQuery) {
      const hay = (String(c.code || '') + ' ' + String(c.provider || '') + ' ' + String(c.type || '')).toLowerCase();
      if (hay.indexOf(normalizedCasesQuery) === -1) return false;
    }
    return true;
  });

  const updateForm = (patch) => {
    if (patch.dueDate !== undefined) {
      const manual = !!patch.dueDate;
      dueDateManualRef.current = manual;
      setDueDateManual(manual);
    }
    setForm((f) => {
      const next = { ...f, ...patch };
      // Recompute the prefill when type/keyDate change, UNLESS the user
      // already hand-edited the due date to something else.
      if (patch.type !== undefined || patch.keyDate !== undefined) {
        if (!dueDateManualRef.current || !f.dueDate) {
          next.dueDate = spedDefaultDue(next.type, next.keyDate, config.evalDays) || '';
        }
      }
      return next;
    });
  };

  const addCase = () => {
    if (spedVaultBackend().mode === 'locked') {
      addToast(tt('spedtl.vault_locked', 'Unlock the Sensitive Workspace vault before adding timelines.'), 'warning');
      return;
    }
    const code = form.code.trim();
    if (!code) { addToast(tt('spedtl.need_code', 'Enter a student code or initials.'), 'warning'); return; }
    if (!spedParseDate(form.dueDate)) { addToast(tt('spedtl.need_due', 'Enter or confirm a due date.'), 'warning'); return; }
    const record = {
      id: spedNextId(), code, type: form.type,
      provider: form.provider.trim(),
      keyDate: spedParseDate(form.keyDate) ? form.keyDate : '',
      dueDate: form.dueDate, completedAt: null,
    };
    casesDirtyRef.current = true;
    setCases((list) => [...list, record]);
    dueDateManualRef.current = false;
    setDueDateManual(false);
    setForm((f) => ({ ...f, code: '', keyDate: '', dueDate: '' }));
    addToast(tt('spedtl.added', 'Timeline added.'), 'success');
  };

  const setDone = (id, done) => {
    casesDirtyRef.current = true;
    const nowDay = spedToday();
    setCases((list) => list.map((c) => c.id === id ? { ...c, completedAt: done ? nowDay : null } : c));
  };

  const exportJson = () => {
    const nowDay = spedToday();
    const payload = { kind: 'alloflow-sped-timelines', version: 1, exportedAt: new Date().toISOString(), config, cases };
    spedDownload('sped-timelines-' + nowDay + '.json', 'application/json', JSON.stringify(payload, null, 2), addToast,
      tt('spedtl.export_toast', 'Export started — check your downloads.'), tt('spedtl.export_failed', 'Export failed: '));
  };

  const importJson = (file) => {
    if (spedVaultBackend().mode === 'locked') {
      addToast(tt('spedtl.vault_locked', 'Unlock the Sensitive Workspace vault before importing timelines.'), 'warning');
      return;
    }
    const MAX_SPED_IMPORT_BYTES = 10 * 1024 * 1024;
    if (!file || (typeof file.size === 'number' && file.size > MAX_SPED_IMPORT_BYTES)) {
      addToast(tt('spedtl.import_failed', 'Import failed: ') + 'file exceeds 10 MB safety limit', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (!mountedRef.current) return;
      try {
        const rawText = String(reader.result || '');
        if (rawText.length > MAX_SPED_IMPORT_BYTES) throw new Error('file exceeds 10 MB safety limit');
        const data = JSON.parse(rawText, (k, v) => (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v);
        if (!data || data.kind !== 'alloflow-sped-timelines' || !Array.isArray(data.cases)) { addToast(tt('spedtl.import_bad', 'That file is not a SpEd Timelines export.'), 'error'); return; }
        const sanitized = data.cases
          .filter((x) => x && typeof x === 'object' && typeof x.id === 'string' && x.id.trim())
          .map((x) => {
            const rawType = String(x.type || 'annual');
            const validType = SPED_TYPES.some((ty) => ty.id === rawType) ? rawType : 'annual';
            return {
              id: String(x.id).trim().slice(0, 120),
              code: String(x.code || '').trim().slice(0, 80),
              type: validType,
              provider: String(x.provider || '').trim().slice(0, 120),
              keyDate: spedParseDate(x.keyDate) ? String(x.keyDate) : '',
              dueDate: spedParseDate(x.dueDate) ? String(x.dueDate) : '',
              completedAt: spedParseDate(x.completedAt) ? String(x.completedAt) : null,
            };
          })
          .filter((x) => x.code && x.dueDate);
        casesDirtyRef.current = true;
        setCases((list) => {
          const have = new Set(list.map((x) => x.id));
          const merged = list.slice();
          sanitized.forEach((x) => {
            if (!have.has(x.id)) {
              have.add(x.id);
              merged.push(x);
            }
          });
          return merged;
        });
        addToast(tt('spedtl.import_toast', 'Import merged.'), 'success');
      } catch (e) {
        addToast(tt('spedtl.import_failed', 'Import failed: ') + String(e && e.message), 'error');
      }
    };
    reader.onerror = () => { if (mountedRef.current) addToast(tt('spedtl.import_failed', 'Import failed: ') + 'read error', 'error'); };
    reader.readAsText(file);
  };

  const tabs = [
    { id: 'dashboard', label: tt('spedtl.tab_dashboard', 'Dashboard'), icon: '⏰' },
    { id: 'cases', label: tt('spedtl.tab_cases', 'Timelines'), icon: '🗂️' },
  ];

  const typeLabel = (id) => {
    const found = SPED_TYPES.find((x) => x.id === id);
    return found ? tt('spedtl.type_' + found.id, found.label) : id;
  };

  return (
    <div
      className="fixed inset-0 z-[260] bg-black/40 flex items-center justify-center overflow-y-auto p-2 sm:p-4"
      style={{ zIndex: 260 }}
      role="presentation"
      onMouseDown={(e) => { backdropDownRef.current = (e.target === e.currentTarget); }}
      onClick={(e) => { const allow = backdropDownRef.current; backdropDownRef.current = false; if (allow && e.target === e.currentTarget && typeof onClose === 'function') onClose(); }}
    >
      <div ref={dialogRef} tabIndex={-1} data-help-key="spedtl_panel" className="allo-docsuite bg-slate-50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto focus:outline-none focus:ring-2 focus:ring-indigo-500" style={{ maxHeight: '92vh' }} role="dialog" aria-modal="true" aria-labelledby="spedtl-title" onClick={(e) => e.stopPropagation()}>
        {/* Solid, not /95: the host dark theme restyles bg-slate-50 only, so a translucent header stayed light under light text. */}
        <div className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 px-4 pt-4 pb-2 rounded-t-2xl">
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
                aria-controls="spedtl-tabpanel" tabIndex={tab === tb.id ? 0 : -1} data-help-key="spedtl_tab"
                onClick={() => setTab(tb.id)}
                onKeyDown={(e) => {
                  if ((e.nativeEvent && e.nativeEvent.isComposing) || e.isComposing || e.keyCode === 229) return;
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

          {typeof onOpenEligibility === 'function' && (
            <div className="mt-2 px-4 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => onOpenEligibility('elig-documents-title')}
                className="min-h-11 px-3 py-2 rounded-lg border border-violet-300 bg-violet-50 text-violet-800 text-xs font-bold hover:bg-violet-100">
                {tt('spedtl.eligibility_link', 'Review evaluation, eligibility & safeguards')}
              </button>
              <span className="text-xs text-slate-600">{tt('spedtl.eligibility_link_note', 'Opens the generic guide; no timeline data is transferred.')}</span>
            </div>
          )}
        <div className="p-4" role="tabpanel" id="spedtl-tabpanel" aria-labelledby={'spedtl-tab-' + tab} tabIndex={-1}>
          {vaultLocked && (
            <p role="status" className="text-xs text-amber-900 bg-amber-50 border border-amber-300 rounded-lg p-2 mb-3">
              {tt('spedtl.vault_locked_banner', 'Sensitive Workspace is locked. Unlock it before adding or editing timelines.')}
            </p>
          )}
          {tab === 'dashboard' && (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                {['overdue', 'urgent', 'soon', 'ok'].map((band) => {
                  const activeBand = dashBandFilter === band;
                  return (
                    <button
                      key={band}
                      type="button"
                      data-spedtl-band-filter={band}
                      aria-pressed={activeBand}
                      onClick={() => setDashBandFilter((cur) => (cur === band ? 'all' : band))}
                      className={'min-h-11 p-3 rounded-xl border text-center cursor-pointer transition-all motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1 ' + SPED_BAND_META[band].cls + (activeBand ? ' ring-2 ring-indigo-600 shadow-sm' : ' hover:opacity-90')}
                    >
                      <span className="block text-2xl font-bold tabular-nums">{rollup.counts[band]}</span>
                      <span className="block text-xs font-bold">{tt('spedtl.band_' + band, SPED_BAND_META[band].label)}</span>
                    </button>
                  );
                })}
              </div>
              {hasDashFilter && (
                <div data-spedtl-dash-filter-bar="true" className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs">
                  <span className="font-bold text-indigo-900">
                    {tt('spedtl.showing_prefix', 'Showing')} {filteredOpenCases.length} {tt('spedtl.of_word', 'of')} {openCases.length} {tt('spedtl.open_short', 'open')}
                    {dashBandFilter !== 'all' ? (' · ' + tt('spedtl.band_' + dashBandFilter, SPED_BAND_META[dashBandFilter].label)) : ''}
                    {dashProviderFilter ? (' · ' + dashProviderFilter) : ''}
                  </span>
                  <button
                    type="button"
                    data-spedtl-dash-clear="true"
                    onClick={() => { setDashBandFilter('all'); setDashProviderFilter(''); }}
                    className="min-h-11 px-3 py-1 rounded-lg border border-indigo-300 bg-white text-indigo-800 font-bold hover:bg-indigo-100 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1 transition-colors motion-reduce:transition-none"
                  >
                    {tt('spedtl.clear_filters', 'Clear filters')}
                  </button>
                </div>
              )}
              {cases.length === 0 && <p className="text-sm text-slate-600 bg-white border border-slate-300 rounded-xl p-3">{tt('spedtl.empty', 'No timelines yet — add them on the Timelines tab.')}</p>}
              {openCases.length > 0 && filteredOpenCases.length === 0 && hasDashFilter && (
                <div className="bg-white border border-slate-300 rounded-xl p-3 mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-slate-700">{tt('spedtl.no_matching_open', 'No open timelines match the current filter.')}</p>
                  <button
                    type="button"
                    onClick={() => { setDashBandFilter('all'); setDashProviderFilter(''); }}
                    className="min-h-11 px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-xs font-bold text-slate-800 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1 transition-colors motion-reduce:transition-none"
                  >
                    {tt('spedtl.show_all_open', 'Show all open')}
                  </button>
                </div>
              )}
              {filteredOpenCases.length > 0 && (
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
                      {filteredOpenCases.map((c) => (
                        <tr key={c.id} className="border-t border-slate-200">
                          <th scope="row" className="text-left p-1.5 font-bold text-slate-800">{c.code}</th>
                          <td className="p-1.5 text-slate-700">{typeLabel(c.type)}</td>
                          <td className="p-1.5 text-slate-700">{c.provider || '—'}</td>
                          <td className="p-1.5 text-center text-slate-700">{c.dueDate || '—'}</td>
                          <td className="p-1.5 text-center">
                            <span className={'inline-block px-1.5 py-0.5 rounded border text-xs font-bold ' + SPED_BAND_META[c.band].cls}>
                              {c.daysUntil == null ? '—' : (c.daysUntil < 0 ? (Math.abs(c.daysUntil) + ' ' + tt('spedtl.days_over', 'over')) : c.daysUntil)}
                            </span>
                          </td>
                          <td className="p-1.5 text-center">
                            <label className="min-w-11 min-h-11 inline-flex items-center justify-center cursor-pointer">
                              <input type="checkbox" checked={false} onChange={() => setDone(c.id, true)}
                                aria-label={tt('spedtl.done_aria', 'Mark complete:') + ' ' + c.code + ' ' + typeLabel(c.type)} className="w-4 h-4" />
                            </label>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {rollup.byProvider.length > 0 && (
                <div className="bg-white border border-slate-300 rounded-xl p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-700">{tt('spedtl.caseload_title', 'Caseload by provider')}</h4>
                    <span className="text-xs text-slate-600">{tt('spedtl.caseload_filter_hint', 'Select a provider to filter above')}</span>
                  </div>
                  <ul className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {rollup.byProvider.map((p) => {
                      const activeProv = dashProviderFilter === p.provider;
                      return (
                        <li key={p.provider}>
                          <button
                            type="button"
                            data-spedtl-provider-filter={p.provider}
                            aria-pressed={activeProv}
                            onClick={() => setDashProviderFilter((cur) => (cur === p.provider ? '' : p.provider))}
                            className={'w-full min-h-11 text-left text-xs p-2 rounded-lg border transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1 ' + (activeProv ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : p.overdue > 0 ? 'bg-rose-50 border-rose-300 hover:bg-rose-100' : 'bg-slate-50 border-slate-200 hover:bg-slate-100')}
                          >
                            <span className="font-bold text-slate-800">{p.provider}</span>{' — '}
                            <span className="text-slate-700">{p.open} {tt('spedtl.open_short', 'open')}{p.overdue > 0 ? (', ' + p.overdue + ' ' + tt('spedtl.overdue_short', 'overdue')) : ''}{p.urgent > 0 ? (', ' + p.urgent + ' ' + tt('spedtl.urgent_short', 'due ≤14d')) : ''}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              <p className="mt-3 text-xs text-slate-600">
                {tt('spedtl.integrity_note', 'Due dates are working prefills: the evaluation clock uses the IDEA fallback of 60 calendar days from consent (34 CFR 300.301(c)) unless you set a different count, and annual/triennial dates are anniversaries. States set their own timeframes — several count school days, which a calendar can’t compute — so always confirm against your state rule and district calendar. Urgency bands (14/30 days) are working conventions, not legal thresholds.')}
              </p>
            </div>
          )}

          {tab === 'cases' && (
            <div>
              <div className="bg-white border border-slate-300 rounded-xl p-3 mb-3">
                <h3 className="text-sm font-bold text-slate-700 mb-1">{tt('spedtl.add_title', 'Add a timeline')}</h3>
                <p className="text-xs text-slate-600 mb-2">{tt('spedtl.code_note', 'Use initials or a code, not full names — this tool needs deadlines, not student records.')}</p>
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
                    <label htmlFor="spedtl-keydate" className="block text-xs font-bold text-slate-600 mb-1">{tt('spedtl.keylabel_' + form.type, (SPED_TYPES.find((ty) => ty.id === form.type) || {}).keyLabel || 'Start date')}</label>
                    <input id="spedtl-keydate" type="date" value={form.keyDate} onChange={(e) => updateForm({ keyDate: e.target.value })}
                      className="w-full min-h-11 border border-slate-300 rounded-lg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label htmlFor="spedtl-due" className="block text-xs font-bold text-slate-600 mb-1">{tt('spedtl.due_label', 'Due date (prefilled — confirm against your state rule)')}</label>
                    <input id="spedtl-due" type="date" value={form.dueDate} onChange={(e) => updateForm({ dueDate: e.target.value })}
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
                      <input id="spedtl-evaldays" type="text" inputMode="numeric" maxLength={4} value={config.evalDays}
                        onChange={(e) => {
                          const rawDigits = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                          const nextDays = rawDigits === '' ? '' : String(Math.min(3650, Number(rawDigits)));
                          configDirtyRef.current = true;
                          setConfig((c) => ({ ...c, evalDays: nextDays }));
                          if (!dueDateManualRef.current) {
                            setForm((f) => (f.type === 'initial_eval' && f.keyDate ? { ...f, dueDate: spedDefaultDue(f.type, f.keyDate, nextDays) || '' } : f));
                          }
                        }}
                        className="w-full min-h-11 border border-slate-300 rounded-lg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <button type="button" onClick={addCase} className="min-h-11 flex-1 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700">{tt('spedtl.add', 'Add')}</button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h3 className="text-sm font-bold text-slate-700">{tt('spedtl.all_title', 'All timelines')} ({cases.length})</h3>
                {cases.length >= 4 && (
                  <div data-spedtl-cases-filter="true" className="flex flex-wrap items-center gap-1.5">
                    {[
                      { id: 'all', label: tt('spedtl.filter_all', 'All') + ' (' + cases.length + ')' },
                      { id: 'open', label: tt('spedtl.filter_open', 'Open') + ' (' + openCases.length + ')' },
                      { id: 'done', label: tt('spedtl.filter_done', 'Completed') + ' (' + doneCount + ')' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        data-spedtl-status-filter={opt.id}
                        aria-pressed={casesStatusFilter === opt.id}
                        onClick={() => setCasesStatusFilter(opt.id)}
                        className={'min-h-11 px-2.5 py-1 rounded-full border text-xs font-bold transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1 ' + (casesStatusFilter === opt.id ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100')}
                      >
                        {opt.label}
                      </button>
                    ))}
                    <input
                      id="spedtl-cases-search"
                      type="search"
                      value={casesQuery}
                      onChange={(e) => setCasesQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.nativeEvent && e.nativeEvent.isComposing) || e.isComposing || e.keyCode === 229) return;
                        if (e.key === 'Escape' && casesQuery) { e.preventDefault(); e.stopPropagation(); setCasesQuery(''); }
                      }}
                      aria-label={tt('spedtl.search_aria', 'Filter timelines by student code or provider')}
                      placeholder={tt('spedtl.search_placeholder', 'Find code or provider…')}
                      className="min-h-11 w-44 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus-visible:ring-2 focus-visible:ring-indigo-600"
                    />
                  </div>
                )}
              </div>
              {cases.length === 0 && <p className="text-sm text-slate-600 bg-white border border-slate-300 rounded-xl p-3">{tt('spedtl.none', 'Nothing tracked yet.')}</p>}
              {cases.length > 0 && filteredAllCases.length === 0 && (
                <div className="bg-white border border-slate-300 rounded-xl p-3 mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-slate-700">{tt('spedtl.no_matching_cases', 'No timelines match your filter.')}</p>
                  <button
                    type="button"
                    data-spedtl-cases-clear="true"
                    onClick={() => { setCasesStatusFilter('all'); setCasesQuery(''); }}
                    className="min-h-11 px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-xs font-bold text-slate-800 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1 transition-colors motion-reduce:transition-none"
                  >
                    {tt('spedtl.clear_filters', 'Clear filters')}
                  </button>
                </div>
              )}
              <ul className="space-y-1">
                {filteredAllCases.map((c) => (
                  <li key={c.id} className={'flex items-center gap-2 p-2 rounded-xl border text-xs ' + (c.band === 'overdue' ? 'bg-rose-50 border-rose-300' : 'bg-white border-slate-300')}>
                    <label className="min-w-11 min-h-11 inline-flex items-center justify-center shrink-0 cursor-pointer">
                      <input type="checkbox" checked={!!c.completedAt} onChange={(e) => setDone(c.id, e.target.checked)}
                        aria-label={tt('spedtl.done_aria', 'Mark complete:') + ' ' + c.code + ' ' + typeLabel(c.type)} className="w-4 h-4 shrink-0" />
                    </label>
                    <span className={'min-w-0 flex-1 ' + (c.completedAt ? 'line-through text-slate-600' : 'text-slate-700')}>
                      <span className="font-bold">{c.code}</span> · {typeLabel(c.type)}{c.provider ? (' · ' + c.provider) : ''}
                    </span>
                    <span className="shrink-0 text-xs text-slate-600">
                      {c.completedAt ? (tt('spedtl.done_on', 'done') + ' ' + c.completedAt) : ((c.dueDate || '—') + (c.daysUntil != null && c.daysUntil < 0 ? (' · ' + Math.abs(c.daysUntil) + ' ' + tt('spedtl.days_over', 'over')) : ''))}
                    </span>
                    <button type="button"
                      onClick={() => {
                        if (armDelete === c.id) { casesDirtyRef.current = true; setCases((list) => list.filter((x) => x.id !== c.id)); setArmDelete(null); addToast(tt('spedtl.deleted', 'Timeline deleted.'), 'info'); }
                        else { setArmDelete(c.id); spedAnnounce(tt('spedtl.delete_arm_announce', 'Activate delete again to permanently remove this timeline.')); }
                      }}
                      aria-label={(armDelete === c.id ? tt('spedtl.delete_confirm_aria', 'Confirm delete') : tt('spedtl.delete_aria', 'Delete')) + ' ' + c.code + ' ' + typeLabel(c.type)}
                      className={'shrink-0 min-w-11 min-h-11 inline-flex items-center justify-center rounded text-xs font-bold ' + (armDelete === c.id ? 'bg-rose-600 text-white' : 'text-slate-600 hover:text-rose-700 hover:bg-rose-50')}
                    >{armDelete === c.id ? tt('spedtl.delete_confirm_short', 'Sure?') : '✕'}</button>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => { const nowDay = spedToday(); spedDownload('sped-timelines-' + nowDay + '.csv', 'text/csv;charset=utf-8', '\uFEFF' + spedCsv(cases, nowDay), addToast, tt('spedtl.export_toast', 'Export started — check your downloads.'), tt('spedtl.export_failed', 'Export failed: ')); }}
                  className="min-h-11 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-bold hover:bg-slate-100"><span aria-hidden="true">⬇️</span> {tt('spedtl.export_csv', 'Export CSV')}</button>
                <button type="button" onClick={exportJson} className="min-h-11 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-bold hover:bg-slate-100"><span aria-hidden="true">⬇️</span> {tt('spedtl.export_json', 'Export data (JSON)')}</button>
                <button type="button" onClick={() => { if (importInputRef.current) importInputRef.current.click(); }} className="min-h-11 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-bold hover:bg-slate-100"><span aria-hidden="true">⬆️</span> {tt('spedtl.import', 'Import export file')}</button>
                <input ref={importInputRef} type="file" tabIndex={-1} accept="application/json,.json" className="sr-only" aria-label={tt('spedtl.import_aria', 'Choose a SpEd Timelines export file')}
                  onChange={(e) => { const f = e.target.files && e.target.files[0]; try { e.target.value = ''; } catch (_) {} if (f) importJson(f); }} />
              </div>
              <p className="mt-2 text-xs text-slate-600">{tt('spedtl.storage_note', 'Timelines live only in this browser’s storage — export after changes (Gemini Canvas may not persist storage between sessions). Imports merge; they never overwrite newer local work.')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
