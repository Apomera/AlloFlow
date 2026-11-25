/**
 * AlloFlow — MTSS Triage (Leadership Hub capstone) — MVP, Aug 2026.
 *
 * Universal-screening triage for building teams: paste one screening
 * window's scores (student code, score), set YOUR measure's benchmark
 * cut points, and get a suggested-risk tier board, intervention grouping,
 * and window-over-window progress — plus a building-context strip that
 * reads the sibling Leadership Hub tools' local data (counts only), which
 * is what makes this the view that sits on top of the suite.
 *
 * Integrity stance (deliberate, in-UI):
 *  - Cut points are USER-ENTERED. Benchmark tables (Acadience, DIBELS 8,
 *    aimsweb...) are publisher-owned and measure/season-specific — the
 *    tool ships none and never pretends to know them.
 *  - A tier here is a SUGGESTED RISK BAND from one screener. The UI says
 *    "flagged for team review": MTSS teams decide tiers with multiple
 *    data sources; a single score never places a student.
 *  - Student codes/initials only, everything on-device, like the rest of
 *    the suite.
 */

const MTSS_DATASETS_KEY = 'allo_mtss_datasets_v1';
const MTSS_GROUPS_KEY = 'allo_mtss_groups_v1';

function mtssVaultBackend() {
  try {
    const sw = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.SensitiveWorkspace;
    if (!sw || typeof sw.getStatus !== 'function') return { mode: 'local', storage: localStorage };
    const phase = sw.getStatus()?.phase;
    if (phase === 'new') return { mode: 'local', storage: localStorage };
    if (phase === 'ready') {
      const sess = typeof sw.getSession === 'function' ? sw.getSession('mtss-triage') : null;
      if (sess && sess.storage) return { mode: 'vault', storage: sess.storage };
    }
    return { mode: 'locked', storage: null };
  } catch (_) {
    return { mode: 'locked', storage: null };
  }
}

function mtssLoad(key, fallback) {
  try {
    const b = mtssVaultBackend();
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

function mtssStore(key, value) {
  try {
    const b = mtssVaultBackend();
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

function mtssNextId(prefix) {
  return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

function mtssToday() {
  // The LOCAL calendar date. toISOString() is UTC, which in US time zones is
  // already tomorrow by late afternoon (5 pm in Portland in summer).
  // Here dates stamped in the evening were a day ahead.
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// ── Pure seams ──────────────────────────────────────────────────────

// Paste parser: "code, score" per line (comma/tab/semicolon). Header rows
// (non-numeric score) are skipped — and an EMPTY numeric cell must be NaN,
// not 0 (the Number('')===0 header-parse bug class from the analyzer).
// Spreadsheet pastes are tab-separated and keep number formatting ("1,080"),
// so a line with a tab splits on tabs only; splitting on the comma too read
// "1,080" as 1. Otherwise ";" then ",", keeping a quoted field ("1,080") whole.
function mtssSplitRow(line) {
  if (line.indexOf('\t') !== -1) {
    return line.split('\t').map((cell) => {
      const trimmed = cell.trim();
      return trimmed.length >= 2 && trimmed[0] === '"' && trimmed[trimmed.length - 1] === '"'
        ? trimmed.slice(1, -1).replace(/""/g, '"')
        : trimmed;
    });
  }
  let hasUnquotedSemi = false;
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === ';' && !inQ) { hasUnquotedSemi = true; break; }
  }
  const sep = hasUnquotedSemi ? ';' : ',';
  const out = [];
  let cur = '';
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') { quoted = !quoted; continue; }
    if (ch === sep && !quoted) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}
function mtssParsePaste(text) {
  const rows = [];
  const skipped = [];
  String(text || '').split(/\r?\n/).forEach((line) => {
    const t = line.trim();
    if (!t) return;
    const parts = mtssSplitRow(t).map((p) => p.trim());
    if (parts.length < 2) { skipped.push(t); return; }
    const code = parts[0];
    const rawScore = String(parts[1]).trim().replace(/%$/, '');
    if (!/^[+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/.test(rawScore)) { skipped.push(t); return; }
    const score = Number(rawScore.replace(/,/g, ''));
    if (!code || !Number.isFinite(score)) { skipped.push(t); return; }
    rows.push({ code, score });
  });
  return { rows, skipped };
}

// Tiering against user cut points.
// higherBetter (e.g. ORF words/min): benchmark = at/above tier2Cut -> T1;
//   at/above tier3Cut but below tier2Cut -> T2; below tier3Cut -> T3.
// !higherBetter (e.g. risk scales): at/below tier2Cut -> T1;
//   at/below tier3Cut but above tier2Cut -> T2; above tier3Cut -> T3.
// "At the cut" always lands on the LESS intensive side — a screener at
// the benchmark line should not flag a student.
// Number('') is 0 — an EMPTY cut field must be missing, not zero (the
// header-parse bug class, now on the input side).
function mtssNum(v) {
  if (v == null || typeof v === 'boolean' || typeof v === 'symbol' || String(v).trim() === '') return NaN;
  return Number(v);
}

function mtssTierOf(score, cutpoints) {
  const t2 = mtssNum(cutpoints && cutpoints.tier2Cut);
  const t3 = mtssNum(cutpoints && cutpoints.tier3Cut);
  if (!Number.isFinite(score) || !Number.isFinite(t2) || !Number.isFinite(t3)) return null;
  if (cutpoints.higherBetter) {
    if (!(t3 < t2)) return null;
    if (score >= t2) return 1;
    if (score >= t3) return 2;
    return 3;
  }
  if (!(t3 > t2)) return null;
  if (score <= t2) return 1;
  if (score <= t3) return 2;
  return 3;
}

// Cut points must be ordered sensibly for the direction; returns an error
// string or null (never throws).
function mtssValidateCuts(cutpoints) {
  const t2 = mtssNum(cutpoints && cutpoints.tier2Cut);
  const t3 = mtssNum(cutpoints && cutpoints.tier3Cut);
  if (!Number.isFinite(t2) || !Number.isFinite(t3)) return 'Enter both cut scores.';
  if (cutpoints.higherBetter && !(t3 < t2)) return 'For a higher-is-better measure, the intensive (Tier 3) cut must be BELOW the benchmark (Tier 2) cut.';
  if (!cutpoints.higherBetter && !(t3 > t2)) return 'For a lower-is-better measure, the intensive (Tier 3) cut must be ABOVE the benchmark (Tier 2) cut.';
  return null;
}

function mtssBoard(dataset) {
  const tiers = { 1: [], 2: [], 3: [] };
  const invalid = [];
  const seen = new Set();
  (dataset && Array.isArray(dataset.rows) ? dataset.rows : []).forEach((r) => {
    const code = String((r && r.code) || '').trim();
    const score = mtssNum(r && r.score);
    if (!code || !Number.isFinite(score)) { invalid.push(r); return; }
    if (seen.has(code)) { invalid.push({ ...r, duplicate: true }); return; }
    seen.add(code);
    const tier = mtssTierOf(score, dataset.cutpoints || {});
    if (tier == null) { invalid.push(r); return; }
    tiers[tier].push({ code, score, tier });
  });
  // Within a tier, most intensive need first (worst score leads).
  const dir = dataset && dataset.cutpoints && dataset.cutpoints.higherBetter ? 1 : -1;
  [1, 2, 3].forEach((tier) => tiers[tier].sort((a, b) => dir * (a.score - b.score)));
  return { tiers, invalid, total: tiers[1].length + tiers[2].length + tiers[3].length };
}

// Window-over-window join for the SAME measure: per-code delta and tier
// movement. Codes present in only one window are reported, never dropped.
function mtssProgress(datasetA, datasetB) {
  const boardA = mtssBoard(datasetA);
  const boardB = mtssBoard(datasetB);
  const byCode = (board) => {
    const map = Object.create(null);
    [1, 2, 3].forEach((tier) => board.tiers[tier].forEach((r) => { map[r.code] = r; }));
    return map;
  };
  const a = byCode(boardA), b = byCode(boardB);
  const higherBetter = !!(datasetA && datasetA.cutpoints && datasetA.cutpoints.higherBetter);
  const joined = [];
  const onlyA = [], onlyB = [];
  Object.keys(a).forEach((code) => {
    if (!b[code]) { onlyA.push(code); return; }
    const delta = Math.round((b[code].score - a[code].score) * 10000) / 10000;
    const improvedScore = higherBetter ? delta > 0 : delta < 0;
    joined.push({
      code,
      from: a[code].score, to: b[code].score, delta,
      fromTier: a[code].tier, toTier: b[code].tier,
      movement: b[code].tier < a[code].tier ? 'less_intensive' : b[code].tier > a[code].tier ? 'more_intensive' : 'same',
      improvedScore,
    });
  });
  Object.keys(b).forEach((code) => { if (!a[code]) onlyB.push(code); });
  joined.sort((x, y) => (y.fromTier - x.fromTier) || x.code.localeCompare(y.code));
  const summary = {
    joined: joined.length,
    lessIntensive: joined.filter((j) => j.movement === 'less_intensive').length,
    moreIntensive: joined.filter((j) => j.movement === 'more_intensive').length,
    same: joined.filter((j) => j.movement === 'same').length,
    improvedScore: joined.filter((j) => j.improvedScore).length,
  };
  return { joined, onlyA, onlyB, summary };
}

// Building-context strip: counts read from the sibling tools' storage.
// Read-only, junk-tolerant, and honest about being counts — codes are not
// joined across tools (they may not match).
function mtssSiblingCounts(storage, options) {
  const sw = options && options.sensitiveWorkspace !== undefined
    ? options.sensitiveWorkspace
    : (typeof window !== 'undefined' && window.AlloModules && window.AlloModules.SensitiveWorkspace) || null;
  let swPhase = null;
  if (sw) {
    try {
      const getter = typeof sw.getStatus === 'function' ? sw.getStatus : (typeof sw.getState === 'function' ? sw.getState : null);
      swPhase = getter ? (getter.call(sw) || {}).phase : 'locked';
    } catch (_) {
      swPhase = 'locked';
    }
    if (swPhase !== 'ready' && swPhase !== 'new') {
      return { walkthroughVisits: 0, disproAnalyses: 0, meetings: 0, spedOpen: 0 };
    }
  }
  const safeParse = (raw) => JSON.parse(raw, (k, v) => (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v);
  const read = (key, targetStorage) => {
    try {
      const src = targetStorage || storage;
      const raw = src && typeof src.getItem === 'function' ? src.getItem(key) : null;
      if (!raw) return 0;
      const v = safeParse(raw);
      return Array.isArray(v) ? v.length : 0;
    } catch (_) { return 0; }
  };
  const spedStorage = (sw && swPhase === 'ready' && typeof sw.getSession === 'function')
    ? ((sw.getSession('sped-timelines') || {}).storage || null)
    : storage;
  return {
    walkthroughVisits: read('allo_udlwalk_sessions_v1'),
    disproAnalyses: read('allo_dispro_analyses_v1'),
    meetings: read('allo_meetdocs_meetings_v1'),
    spedOpen: (() => {
      try {
        const raw = spedStorage && typeof spedStorage.getItem === 'function' ? spedStorage.getItem('allo_sped_cases_v1') : null;
        if (!raw) return 0;
        const v = safeParse(raw);
        return Array.isArray(v) ? v.filter((c) => c && !c.completedAt).length : 0;
      } catch (_) { return 0; }
    })(),
  };
}

function mtssCsv(dataset) {
  const esc = (v) => {
    const raw = v == null ? '' : String(v);
    const s = (/^[\t\r\n]/.test(raw) || /^\s*[=+\-@|]/.test(raw)) ? "'" + raw : raw;
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const board = mtssBoard(dataset);
  const lines = ['student_code,score,suggested_tier'];
  [3, 2, 1].forEach((tier) => board.tiers[tier].forEach((r) => {
    lines.push([esc(r.code), r.score, tier].join(','));
  }));
  const cp = (dataset && dataset.cutpoints) || {};
  lines.push('');
  lines.push(esc('Measure: ' + ((dataset && dataset.label) || '') + ' · Window: ' + ((dataset && dataset.window) || '') + ' · Cuts: T2=' + (cp.tier2Cut ?? '') + ', T3=' + (cp.tier3Cut ?? '') + ' (' + (cp.higherBetter ? 'higher is better' : 'lower is better') + ')'));
  lines.push(esc('Suggested tiers are risk bands from ONE screener against locally entered cut scores — the MTSS team places students using multiple data sources. Computed locally in AlloFlow.'));
  return lines.join('\r\n');
}

function mtssDownload(filename, mime, content, addToast, okMsg, failMsg) {
  try {
    const safeName = String(filename || 'mtss.csv').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-').replace(/\s+/g, '-');
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const a = document.createElement('a');
    a.href = url;
    a.download = safeName;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => { try { URL.revokeObjectURL(url); } catch (_) {} }, 4000);
    addToast(okMsg, 'info');
  } catch (e) {
    addToast(failMsg + String(e && e.message), 'error');
  }
}

function mtssAnnounce(message) {
  try {
    const region = typeof document !== 'undefined' && document.getElementById('allo-live-mtss');
    if (region) {
      region.textContent = '';
      setTimeout(() => { try { if (region.isConnected) region.textContent = message; } catch (_) {} }, 0);
    }
  } catch (_) {}
}

const MTSS_TIER_META = {
  1: { label: 'Tier 1 — at/above benchmark', cls: 'bg-green-50 border-green-300 text-green-900' },
  2: { label: 'Tier 2 — flagged for team review', cls: 'bg-amber-50 border-amber-300 text-amber-900' },
  3: { label: 'Tier 3 — flagged for team review (intensive range)', cls: 'bg-rose-50 border-rose-300 text-rose-900' },
};

function MtssTriagePanel(props) {
  const { onClose, t, addToast = (() => {}) } = props;
  const tt = React.useCallback((key, fallback) => {
    if (typeof t === 'function') {
      try { const v = t(key); if (v) return v; } catch (_) {}
    }
    return fallback;
  }, [t]);

  const [datasets, setDatasets] = React.useState(() => {
    const v = mtssLoad(MTSS_DATASETS_KEY, []);
    return Array.isArray(v) ? v.filter((d) => d && typeof d === 'object') : [];
  });
  const [groups, setGroups] = React.useState(() => {
    const v = mtssLoad(MTSS_GROUPS_KEY, []);
    return Array.isArray(v) ? v.filter((g) => g && typeof g === 'object') : [];
  });
  const datasetsDirtyRef = React.useRef(false);
  const groupsDirtyRef = React.useRef(false);
  const [tab, setTab] = React.useState('screen');
  const [activeId, setActiveId] = React.useState(null);
  const [form, setForm] = React.useState({ label: '', window: '', higherBetter: true, tier2Cut: '', tier3Cut: '', paste: '' });
  const [checked, setChecked] = React.useState(() => Object.create(null));
  const [groupName, setGroupName] = React.useState('');
  const [groupFocus, setGroupFocus] = React.useState('');
  const [progA, setProgA] = React.useState('');
  const [progB, setProgB] = React.useState('');
  const [progFilter, setProgFilter] = React.useState('all');
  const [boardQuery, setBoardQuery] = React.useState('');
  const [armDelete, setArmDelete] = React.useState(null);
  const dialogRef = React.useRef(null);

  React.useEffect(() => { if (datasetsDirtyRef.current) mtssStore(MTSS_DATASETS_KEY, datasets); }, [datasets]);
  React.useEffect(() => { if (groupsDirtyRef.current) mtssStore(MTSS_GROUPS_KEY, groups); }, [groups]);
  React.useEffect(() => { setArmDelete(null); }, [tab, activeId]);

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
        for (let cur = el; cur && cur !== dialog.parentElement; cur = cur.parentElement) {
          const st = window.getComputedStyle(cur);
          if (st && (st.display === 'none' || st.visibility === 'hidden')) return false;
          if (cur === dialog) break;
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

  const isCheckedCode = (map, code) => Object.prototype.hasOwnProperty.call(map, code) && !!map[code];
  const vaultLocked = mtssVaultBackend().mode === 'locked';
  const active = activeId ? datasets.find((d) => d.id === activeId) : null;
  const board = React.useMemo(() => (active ? mtssBoard(active) : null), [active]);
  const context = React.useMemo(() => mtssSiblingCounts(typeof localStorage !== 'undefined' ? localStorage : { getItem: () => null }), [tab, datasets.length]);

  const saveDataset = () => {
    if (mtssVaultBackend().mode === 'locked') {
      addToast(tt('mtss.vault_locked', 'Unlock the Sensitive Workspace vault before saving screening windows.'), 'warning');
      return;
    }
    // Validate the RAW field values (Number('') is 0 — coercing first would
    // let an empty cut field through as zero), then store real numbers.
    const rawCuts = { higherBetter: !!form.higherBetter, tier2Cut: form.tier2Cut, tier3Cut: form.tier3Cut };
    const cutError = mtssValidateCuts(rawCuts);
    const cutpoints = { higherBetter: rawCuts.higherBetter, tier2Cut: Number(form.tier2Cut), tier3Cut: Number(form.tier3Cut) };
    if (!form.label.trim()) { addToast(tt('mtss.need_label', 'Name the measure (e.g. ORF grade 3).'), 'warning'); return; }
    if (cutError) { addToast(cutError, 'warning'); return; }
    const parsed = mtssParsePaste(form.paste);
    if (parsed.rows.length === 0) { addToast(tt('mtss.need_rows', 'Paste at least one "code, score" row.'), 'warning'); return; }
    const record = {
      id: mtssNextId('md'),
      label: form.label.trim(),
      window: form.window.trim() || mtssToday(),
      cutpoints,
      rows: parsed.rows,
      savedAt: Date.now(),
    };
    datasetsDirtyRef.current = true;
    setDatasets((list) => [record, ...list]);
    setActiveId(record.id);
    setChecked(Object.create(null));
    setForm((f) => ({ ...f, paste: '' }));
    const msg = parsed.rows.length + ' ' + tt('mtss.rows_loaded', 'scores loaded.') + (parsed.skipped.length ? (' ' + parsed.skipped.length + ' ' + tt('mtss.rows_skipped', 'lines skipped.')) : '');
    addToast(msg, parsed.skipped.length ? 'warning' : 'success');
  };

  const toggleChecked = (code) => setChecked((c) => {
    const next = Object.assign(Object.create(null), c);
    next[code] = !isCheckedCode(c, code);
    return next;
  });

  const validBoardCodes = React.useMemo(() => {
    if (!board) return new Set();
    return new Set([1, 2, 3].flatMap((tier) => (board.tiers[tier] || []).map((r) => r.code)));
  }, [board]);

  const selectedCount = Object.keys(checked).filter((k) => isCheckedCode(checked, k) && validBoardCodes.has(k)).length;

  const toggleTierSelection = (tier) => {
    if (!board || !board.tiers[tier] || board.tiers[tier].length === 0) return;
    const codes = board.tiers[tier].map((r) => r.code);
    const allSelected = codes.every((code) => isCheckedCode(checked, code));
    setChecked((prev) => {
      const next = Object.assign(Object.create(null), prev);
      codes.forEach((code) => { next[code] = !allSelected; });
      return next;
    });
  };

  const createGroup = () => {
    if (mtssVaultBackend().mode === 'locked') {
      addToast(tt('mtss.vault_locked_group', 'Unlock the Sensitive Workspace vault before saving groups.'), 'warning');
      return;
    }
    if (!active || !board) return;
    const validCodes = new Set([1, 2, 3].flatMap((tier) => (board.tiers[tier] || []).map((r) => r.code)));
    const members = Object.keys(checked).filter((k) => isCheckedCode(checked, k) && validCodes.has(k));
    if (members.length === 0) { addToast(tt('mtss.need_members', 'Check at least one student.'), 'warning'); return; }
    if (!groupName.trim()) { addToast(tt('mtss.need_group_name', 'Name the group.'), 'warning'); return; }
    groupsDirtyRef.current = true;
    setGroups((g) => [{
      id: mtssNextId('mg'),
      name: groupName.trim(),
      focus: groupFocus.trim(),
      measure: active.label,
      window: active.window,
      members,
      createdAt: mtssToday(),
    }, ...g]);
    setChecked(Object.create(null));
    setGroupName('');
    setGroupFocus('');
    setTab('groups');
    addToast(tt('mtss.group_saved', 'Group saved on this device.'), 'success');
  };

  const tabs = [
    { id: 'screen', label: tt('mtss.tab_screen', 'Screen'), icon: '🧮' },
    { id: 'groups', label: tt('mtss.tab_groups', 'Groups'), icon: '👥' },
    { id: 'progress', label: tt('mtss.tab_progress', 'Progress'), icon: '📈' },
  ];

  const dsA = datasets.find((d) => d.id === progA) || null;
  const dsB = datasets.find((d) => d.id === progB) || null;
  const progress = (dsA && dsB && dsA.id !== dsB.id) ? mtssProgress(dsA, dsB) : null;
  const normalizedBoardQuery = boardQuery.trim().toLowerCase();
  const filteredProgressJoined = progress
    ? progress.joined.filter((j) => (progFilter === 'all' ? true : j.movement === progFilter))
    : [];
  const tierPct = (tier) => {
    if (!board || board.total <= 0) return 0;
    return Math.round(((board.tiers[tier] || []).length / board.total) * 100);
  };
  const backdropDownRef = React.useRef(false);

  return (
    <div
      className="fixed inset-0 z-[260] bg-black/40 flex items-center justify-center overflow-y-auto p-2 sm:p-4"
      style={{ zIndex: 260 }}
      role="presentation"
      onMouseDown={(e) => { backdropDownRef.current = (e.target === e.currentTarget); }}
      onClick={(e) => { const allow = backdropDownRef.current; backdropDownRef.current = false; if (allow && e.target === e.currentTarget && typeof onClose === 'function') onClose(); }}
    >
      <div ref={dialogRef} tabIndex={-1} data-help-key="mtss_panel" className="allo-docsuite bg-slate-50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto focus:outline-none focus:ring-2 focus:ring-indigo-500" style={{ maxHeight: '92vh' }} role="dialog" aria-modal="true" aria-labelledby="mtss-title" onClick={(e) => e.stopPropagation()}>
        {/* Solid, not /95: the host dark theme restyles bg-slate-50 only, so a translucent header stayed light under light text. */}
        <div className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 px-4 pt-4 pb-2 rounded-t-2xl">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 id="mtss-title" className="text-lg font-bold text-slate-800 flex items-center gap-2"><span aria-hidden="true">🧮</span> {tt('mtss.title', 'MTSS Triage')}</h2>
              <p className="text-xs text-slate-600">{tt('mtss.subtitle', 'Screening scores in, team-review flags out — your cut scores, your decisions, on this device.')}</p>
            </div>
            <button type="button" onClick={onClose} className="min-w-11 min-h-11 p-2 inline-flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 text-xl" aria-label={tt('mtss.close_aria', 'Close MTSS Triage')}>✕</button>
          </div>
          <div role="tablist" aria-label={tt('mtss.tabs_aria', 'Triage sections')} className="flex gap-1 mt-2">
            {tabs.map((tb, tbIdx) => (
              <button key={tb.id} type="button" role="tab" id={'mtss-tab-' + tb.id} aria-selected={tab === tb.id}
                aria-controls="mtss-tabpanel" tabIndex={tab === tb.id ? 0 : -1} data-help-key="mtss_tab"
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
                  const el = document.getElementById('mtss-tab-' + tabs[next].id);
                  if (el) el.focus();
                }}
                className={'min-h-11 px-3 py-1.5 rounded-t-lg text-sm font-bold border-b-2 ' + (tab === tb.id ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-100')}
              ><span aria-hidden="true">{tb.icon}</span> {tb.label}</button>
            ))}
          </div>
        </div>

        <div className="p-4" role="tabpanel" id="mtss-tabpanel" aria-labelledby={'mtss-tab-' + tab} tabIndex={-1}>
          {vaultLocked && (
            <p role="status" className="text-xs text-amber-900 bg-amber-50 border border-amber-300 rounded-lg p-2 mb-3">
              {tt('mtss.vault_locked_banner', 'Sensitive Workspace is locked. Unlock it before saving or editing MTSS windows and groups.')}
            </p>
          )}
          <p className="text-xs text-slate-600 mb-3">
            {tt('mtss.context_strip', 'Building context (from this device’s Leadership Hub data):')}{' '}
            {context.walkthroughVisits} {tt('mtss.ctx_visits', 'walkthrough visits')} · {context.disproAnalyses} {tt('mtss.ctx_dispro', 'equity analyses')} · {context.spedOpen} {tt('mtss.ctx_sped', 'open SpEd timelines')} · {context.meetings} {tt('mtss.ctx_meetings', 'meeting records')}
          </p>

          {tab === 'screen' && (
            <div>
              <div className="bg-white border border-slate-300 rounded-xl p-3 mb-3">
                <h3 className="text-sm font-bold text-slate-700 mb-1">{tt('mtss.new_dataset', 'New screening window')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="mtss-label" className="block text-xs font-bold text-slate-600 mb-1">{tt('mtss.measure_label', 'Measure (e.g. ORF grade 3)')}</label>
                    <input id="mtss-label" type="text" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                      className="w-full min-h-11 border border-slate-300 rounded-lg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label htmlFor="mtss-window" className="block text-xs font-bold text-slate-600 mb-1">{tt('mtss.window_label', 'Window (e.g. 2026 Fall)')}</label>
                    <input id="mtss-window" type="text" value={form.window} onChange={(e) => setForm((f) => ({ ...f, window: e.target.value }))}
                      className="w-full min-h-11 border border-slate-300 rounded-lg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div className="flex items-end gap-2">
                    <button type="button" aria-pressed={form.higherBetter}
                      onClick={() => setForm((f) => ({ ...f, higherBetter: !f.higherBetter }))}
                      className={'min-h-11 px-3 py-2 rounded-lg border text-xs font-bold ' + (form.higherBetter ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-700 border-slate-300')}
                    >{form.higherBetter ? tt('mtss.higher_better', 'Higher is better (fluency, accuracy)') : tt('mtss.lower_better', 'Lower is better (risk scales, errors)')}</button>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label htmlFor="mtss-t2" className="block text-xs font-bold text-slate-600 mb-1">{tt('mtss.t2_label', 'Benchmark cut (T2 below/above)')}</label>
                      <input id="mtss-t2" type="text" inputMode="decimal" value={form.tier2Cut} onChange={(e) => setForm((f) => ({ ...f, tier2Cut: e.target.value }))}
                        className="w-full min-h-11 border border-slate-300 rounded-lg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div className="flex-1">
                      <label htmlFor="mtss-t3" className="block text-xs font-bold text-slate-600 mb-1">{tt('mtss.t3_label', 'Intensive cut (T3 beyond)')}</label>
                      <input id="mtss-t3" type="text" inputMode="decimal" value={form.tier3Cut} onChange={(e) => setForm((f) => ({ ...f, tier3Cut: e.target.value }))}
                        className="w-full min-h-11 border border-slate-300 rounded-lg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  </div>
                </div>
                <label htmlFor="mtss-paste" className="block text-xs font-bold text-slate-600 mt-2 mb-1">{tt('mtss.paste_label', 'Scores — one line per student: code, score (header rows are skipped)')}</label>
                <textarea id="mtss-paste" rows={5} value={form.paste} onChange={(e) => setForm((f) => ({ ...f, paste: e.target.value }))}
                  placeholder={'Code,Score\nJD,42\nMR,71\nAL,18'}
                  className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <p className="text-xs text-slate-600 mt-1">{tt('mtss.cuts_note', 'Enter YOUR measure’s benchmark cut scores (publisher tables are measure- and season-specific — this tool ships none). "At the cut" counts as the less intensive band.')}</p>
                <button type="button" onClick={saveDataset} className="mt-2 min-h-11 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700">{tt('mtss.save_dataset', 'Save window & triage')}</button>
              </div>

              {datasets.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {datasets.map((d) => (
                    <button key={d.id} type="button" aria-pressed={activeId === d.id}
                      onClick={() => { setActiveId(d.id); setChecked(Object.create(null)); setBoardQuery(''); }}
                      className={'min-h-11 px-3 py-1.5 rounded-full border text-xs font-bold ' + (activeId === d.id ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100')}>
                      {d.label} · {d.window}
                    </button>
                  ))}
                </div>
              )}

              {active && board && (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <p className="text-xs text-slate-600">{board.total} {tt('mtss.students', 'students')}{board.invalid.length > 0 ? (' · ' + board.invalid.length + ' ' + tt('mtss.invalid_rows', 'invalid/duplicate rows ignored')) : ''}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {board.total >= 6 && (
                        <input
                          id="mtss-board-search"
                          type="search"
                          value={boardQuery}
                          onChange={(e) => setBoardQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if ((e.nativeEvent && e.nativeEvent.isComposing) || e.isComposing || e.keyCode === 229) return;
                            if (e.key === 'Escape' && boardQuery) { e.preventDefault(); e.stopPropagation(); setBoardQuery(''); }
                          }}
                          aria-label={tt('mtss.board_search_aria', 'Filter screening board by student code')}
                          placeholder={tt('mtss.board_search_placeholder', 'Find code…')}
                          className="min-h-11 w-36 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus-visible:ring-2 focus-visible:ring-indigo-600"
                        />
                      )}
                      <button type="button" onClick={() => mtssDownload('mtss-' + (active.window || 'window').replace(/\s+/g, '-') + '.csv', 'text/csv;charset=utf-8', '\uFEFF' + mtssCsv(active), addToast, tt('mtss.export_toast', 'Export started — check your downloads.'), tt('mtss.export_failed', 'Export failed: '))}
                        className="min-h-11 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100"><span aria-hidden="true">⬇️</span> {tt('mtss.export_csv', 'CSV')}</button>
                      <button type="button"
                        onClick={() => {
                          if (armDelete === active.id) {
                            datasetsDirtyRef.current = true;
                            setDatasets((l) => l.filter((x) => x.id !== active.id));
                            if (progA === active.id) setProgA('');
                            if (progB === active.id) setProgB('');
                            setActiveId(null);
                            setChecked(Object.create(null));
                            setBoardQuery('');
                            setArmDelete(null);
                            addToast(tt('mtss.dataset_deleted', 'Window deleted.'), 'info');
                          }
                          else { setArmDelete(active.id); mtssAnnounce(tt('mtss.delete_arm_announce', 'Activate delete again to permanently remove this window.')); }
                        }}
                        className={'min-h-11 px-3 py-1.5 rounded-lg border text-xs font-bold ' + (armDelete === active.id ? 'bg-rose-600 text-white border-rose-700' : 'bg-white text-rose-700 border-rose-300 hover:bg-rose-50')}
                      >{armDelete === active.id ? tt('mtss.delete_confirm', 'Tap again to delete') : tt('mtss.delete', 'Delete')}</button>
                    </div>
                  </div>
                  {board.total > 0 && (
                    <div data-mtss-tier-distribution="true" className="mb-2.5 rounded-xl border border-slate-200 bg-white p-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-700 mb-1.5 tabular-nums">
                        <span>{tt('mtss.distribution_title', 'Window distribution')}</span>
                        <span className="flex flex-wrap items-center gap-2 font-semibold">
                          <span className="text-emerald-800">T1: {tierPct(1)}% ({board.tiers[1].length})</span>
                          <span className="text-amber-800">T2: {tierPct(2)}% ({board.tiers[2].length})</span>
                          <span className="text-rose-800">T3: {tierPct(3)}% ({board.tiers[3].length})</span>
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full overflow-hidden bg-slate-100 flex" aria-hidden="true">
                        {board.tiers[1].length > 0 && <div className="bg-emerald-600 h-full transition-all motion-reduce:transition-none" style={{ width: ((board.tiers[1].length / board.total) * 100) + '%' }} />}
                        {board.tiers[2].length > 0 && <div className="bg-amber-500 h-full transition-all motion-reduce:transition-none" style={{ width: ((board.tiers[2].length / board.total) * 100) + '%' }} />}
                        {board.tiers[3].length > 0 && <div className="bg-rose-600 h-full transition-all motion-reduce:transition-none" style={{ width: ((board.tiers[3].length / board.total) * 100) + '%' }} />}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[3, 2, 1].map((tier) => {
                      const tierRows = board.tiers[tier] || [];
                      const visibleRows = normalizedBoardQuery
                        ? tierRows.filter((r) => String(r.code || '').toLowerCase().indexOf(normalizedBoardQuery) !== -1)
                        : tierRows;
                      const allTierSelected = tier !== 1 && tierRows.length > 0 && tierRows.every((r) => isCheckedCode(checked, r.code));
                      return (
                        <div key={tier} className={'rounded-xl border p-2 ' + MTSS_TIER_META[tier].cls}>
                          <div className="flex items-start justify-between gap-1.5">
                            <h4 className="text-xs font-bold leading-snug">{tt('mtss.tier_' + tier, MTSS_TIER_META[tier].label)} ({visibleRows.length}{normalizedBoardQuery ? ('/' + tierRows.length) : ''})</h4>
                            {tier !== 1 && tierRows.length > 0 && (
                              <button
                                type="button"
                                data-mtss-select-tier={tier}
                                aria-pressed={allTierSelected}
                                aria-label={(allTierSelected ? tt('mtss.unselect_tier_aria', 'Unselect all Tier') : tt('mtss.select_tier_aria', 'Select all Tier')) + ' ' + tier}
                                onClick={() => toggleTierSelection(tier)}
                                className={'shrink-0 min-h-11 px-2 py-1 rounded-lg border text-[11px] font-bold transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1 ' + (allTierSelected ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white/90 text-slate-800 border-slate-300 hover:bg-white')}
                              >
                                {allTierSelected ? tt('mtss.unselect_all', 'Unselect') : tt('mtss.select_all', 'Select all')}
                              </button>
                            )}
                          </div>
                          <ul className="mt-1 space-y-0.5">
                            {visibleRows.map((r) => (
                              <li key={r.code} className="flex items-center gap-1.5 text-xs">
                                {tier !== 1 && (
                                  <label className="min-w-11 min-h-11 inline-flex items-center justify-center shrink-0 cursor-pointer -my-2 -ml-2">
                                    <input type="checkbox" checked={isCheckedCode(checked, r.code)} onChange={() => toggleChecked(r.code)}
                                      aria-label={tt('mtss.check_aria', 'Select for grouping:') + ' ' + r.code} className="w-4 h-4 shrink-0" />
                                  </label>
                                )}
                                <span className="font-bold">{r.code}</span>
                                <span className="ml-auto tabular-nums">{r.score}</span>
                              </li>
                            ))}
                            {visibleRows.length === 0 && <li className="text-xs opacity-70">{normalizedBoardQuery ? tt('mtss.no_code_match', 'no match') : tt('mtss.tier_empty', 'none')}</li>}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 bg-white border border-slate-300 rounded-xl p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-700">{tt('mtss.group_title', 'Create an intervention group from checked students')}</h4>
                      {selectedCount > 0 && (
                        <div data-mtss-selected-bar="true" className="flex items-center gap-1.5">
                          <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-800 tabular-nums">
                            {selectedCount} {tt('mtss.selected_short', 'selected')}
                          </span>
                          <button
                            type="button"
                            data-mtss-clear-selected="true"
                            onClick={() => setChecked(Object.create(null))}
                            className="min-h-11 px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1 transition-colors motion-reduce:transition-none"
                          >
                            {tt('mtss.clear_selected', 'Clear')}
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-2 items-end">
                      <div className="flex-1 min-w-40">
                        <label htmlFor="mtss-group-name" className="block text-xs font-bold text-slate-600 mb-0.5">{tt('mtss.group_name', 'Group name')}</label>
                        <input id="mtss-group-name" type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)}
                          className="w-full min-h-11 border border-slate-300 rounded-lg px-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div className="flex-1 min-w-40">
                        <label htmlFor="mtss-group-focus" className="block text-xs font-bold text-slate-600 mb-0.5">{tt('mtss.group_focus', 'Focus (e.g. decoding, fluency)')}</label>
                        <input id="mtss-group-focus" type="text" value={groupFocus} onChange={(e) => setGroupFocus(e.target.value)}
                          className="w-full min-h-11 border border-slate-300 rounded-lg px-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <button type="button" onClick={createGroup} className="min-h-11 px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700">{tt('mtss.create_group', 'Create group')}</button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-600">
                    {tt('mtss.integrity_note', 'Tiers here are suggested risk bands from ONE screener against the cut scores you entered — a flag for team review, never a placement. MTSS teams decide with multiple data sources (progress monitoring, classroom evidence, family input). All computation happens on this device.')}
                  </p>
                </div>
              )}
              {!active && datasets.length === 0 && <p className="text-sm text-slate-600 bg-white border border-slate-300 rounded-xl p-3">{tt('mtss.empty', 'Paste your first screening window above to build the tier board.')}</p>}
            </div>
          )}

          {tab === 'groups' && (
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-2">{tt('mtss.groups_title', 'Intervention groups')}</h3>
              {groups.length === 0 && <p className="text-sm text-slate-600 bg-white border border-slate-300 rounded-xl p-3">{tt('mtss.no_groups', 'No groups yet — check students on the Screen tab and create one.')}</p>}
              <ul className="space-y-1.5">
                {groups.map((g) => (
                  <li key={g.id} className="bg-white border border-slate-300 rounded-xl p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="block font-bold text-sm text-slate-800">{g.name}{g.focus ? <span className="font-normal text-slate-600"> — {g.focus}</span> : null}</span>
                        <span className="block text-xs text-slate-600">{g.measure} · {g.window} · {tt('mtss.started', 'created')} {g.createdAt}</span>
                      </div>
                      <button type="button"
                        aria-label={(armDelete === g.id ? tt('mtss.delete_confirm', 'Tap again to delete') : tt('mtss.delete', 'Delete')) + ' ' + String(g.name || '')}
                        onClick={() => {
                          if (armDelete === g.id) { groupsDirtyRef.current = true; setGroups((l) => l.filter((x) => x.id !== g.id)); setArmDelete(null); addToast(tt('mtss.group_deleted', 'Group deleted.'), 'info'); }
                          else { setArmDelete(g.id); mtssAnnounce(tt('mtss.delete_group_arm_announce', 'Activate delete again to permanently remove this group.')); }
                        }}
                        className={'shrink-0 min-h-11 px-3 py-1.5 rounded-lg border text-xs font-bold ' + (armDelete === g.id ? 'bg-rose-600 text-white border-rose-700' : 'bg-white text-rose-700 border-rose-300 hover:bg-rose-50')}
                      >{armDelete === g.id ? tt('mtss.delete_confirm', 'Tap again to delete') : tt('mtss.delete', 'Delete')}</button>
                    </div>
                    <ul className="mt-1.5 flex flex-wrap gap-1">
                      {(Array.isArray(g.members) ? g.members : []).map((m) => <li key={m} className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">{m}</li>)}
                    </ul>
                  </li>
                ))}
              </ul>
              {groups.length > 0 && (
                <p className="mt-3 text-xs text-slate-600">{tt('mtss.groups_note', 'For delivering interventions, the teacher-facing side of AlloFlow (SEL Hub routines, accessible materials, Take-Home Packs) is the natural next stop — groups here are the roster, not the intervention.')}</p>
              )}
            </div>
          )}

          {tab === 'progress' && (
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-1">{tt('mtss.progress_title', 'Window over window')}</h3>
              <p className="text-xs text-slate-600 mb-2">{tt('mtss.progress_hint', 'Compare two saved windows of the SAME measure (matching student codes). Movement toward less intensive bands is the win condition.')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                {[['A', progA, setProgA], ['B', progB, setProgB]].map(([label, val, setter]) => (
                  <div key={label}>
                    <label htmlFor={'mtss-prog-' + label} className="block text-xs font-bold text-slate-600 mb-0.5">{tt('mtss.window', 'Window')} {label}</label>
                    <select id={'mtss-prog-' + label} value={val} onChange={(e) => setter(e.target.value)}
                      className="w-full min-h-11 border border-slate-300 rounded-lg px-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">{tt('mtss.pick_window', 'Choose…')}</option>
                      {datasets.map((d) => <option key={d.id} value={d.id}>{d.label} · {d.window}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              {dsA && dsB && dsA.id !== dsB.id && dsA.label !== dsB.label && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-2">{tt('mtss.measure_mismatch', 'These windows are different measures — deltas across different measures are not comparable.')}</p>
              )}
              {dsA && dsB && dsA.id !== dsB.id && Boolean(dsA.cutpoints && dsA.cutpoints.higherBetter) !== Boolean(dsB.cutpoints && dsB.cutpoints.higherBetter) && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-2">{tt('mtss.direction_mismatch', 'Window A and Window B have opposite score directions (higher-is-better vs. lower-is-better) — verify your cut-score direction before interpreting deltas.')}</p>
              )}
              {progress && (
                <div>
                  <p className="text-xs font-bold text-slate-800 mb-1.5">
                    {progress.summary.joined} {tt('mtss.matched', 'matched')} · {progress.summary.lessIntensive} {tt('mtss.moved_down', 'to less intensive')} · {progress.summary.moreIntensive} {tt('mtss.moved_up', 'to more intensive')} · {progress.summary.improvedScore} {tt('mtss.improved', 'improved scores')}
                  </p>
                  {progress.joined.length >= 2 && (
                    <div data-mtss-progress-filter="true" className="flex flex-wrap items-center gap-1.5 mb-2">
                      {[
                        { id: 'all', label: tt('mtss.filter_all', 'All') + ' (' + progress.summary.joined + ')' },
                        { id: 'less_intensive', label: tt('mtss.filter_less', 'Less intensive') + ' (' + progress.summary.lessIntensive + ')' },
                        { id: 'more_intensive', label: tt('mtss.filter_more', 'More intensive') + ' (' + progress.summary.moreIntensive + ')' },
                        { id: 'same', label: tt('mtss.filter_same', 'Same band') + ' (' + progress.summary.same + ')' },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          data-mtss-prog-filter={opt.id}
                          aria-pressed={progFilter === opt.id}
                          onClick={() => setProgFilter(opt.id)}
                          className={'min-h-11 px-2.5 py-1 rounded-full border text-xs font-bold transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1 ' + (progFilter === opt.id ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100')}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="overflow-x-auto bg-white border border-slate-300 rounded-xl p-2">
                    <table className="w-full text-xs border-collapse">
                      <caption className="sr-only">{tt('mtss.progress_caption', 'Per-student progress between the two windows')}</caption>
                      <thead>
                        <tr>
                          <th scope="col" className="text-left p-1.5 text-slate-600">{tt('mtss.col_student', 'Student')}</th>
                          <th scope="col" className="p-1.5 text-slate-600">A</th>
                          <th scope="col" className="p-1.5 text-slate-600">B</th>
                          <th scope="col" className="p-1.5 text-slate-600">Δ</th>
                          <th scope="col" className="p-1.5 text-slate-600">{tt('mtss.col_band', 'Band')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProgressJoined.map((j) => (
                          <tr key={j.code} className="border-t border-slate-200">
                            <th scope="row" className="text-left p-1.5 font-bold text-slate-800">{j.code}</th>
                            <td className="p-1.5 text-center text-slate-700 tabular-nums">{j.from}</td>
                            <td className="p-1.5 text-center text-slate-700 tabular-nums">{j.to}</td>
                            <td className={'p-1.5 text-center font-bold tabular-nums ' + (j.improvedScore ? 'text-green-800' : j.delta === 0 ? 'text-slate-600' : 'text-rose-800')}>{j.delta > 0 ? '+' + j.delta : j.delta}</td>
                            <td className="p-1.5 text-center text-slate-700">T{j.fromTier}→T{j.toTier}{j.movement === 'less_intensive' ? ' ✓' : ''}</td>
                          </tr>
                        ))}
                        {filteredProgressJoined.length === 0 && (
                          <tr className="border-t border-slate-200">
                            <td colSpan={5} className="p-2 text-center text-slate-600">
                              {tt('mtss.no_progress_match', 'No students in this movement band.')}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {(progress.onlyA.length > 0 || progress.onlyB.length > 0) && (
                    <p className="mt-1.5 text-xs text-slate-600">
                      {progress.onlyA.length > 0 && (tt('mtss.only_a', 'Only in A:') + ' ' + progress.onlyA.join(', ') + '. ')}
                      {progress.onlyB.length > 0 && (tt('mtss.only_b', 'Only in B:') + ' ' + progress.onlyB.join(', ') + '.')}
                    </p>
                  )}
                </div>
              )}
              {datasets.length < 2 && <p className="text-sm text-slate-600 bg-white border border-slate-300 rounded-xl p-3">{tt('mtss.need_two', 'Save at least two screening windows to compare progress.')}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
