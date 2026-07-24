// ── School Box LAN session adapter ─────────────────────────────────────────
// INSERTION TARGET: AlloFlowANTI.txt, immediately AFTER the line
//   `let onAuthStateChanged = (auth, cb) => _fbOnAuthStateChanged(auth, cb);`
// (the end of the let-bound Firestore passthroughs), plus ONE extra line inside
// _upgradeAIBackend — see desktop/app-adapter/README.md. Apply to the canonical
// AlloFlowANTI.txt and byte-copy to both desktop/web-app/src mirrors.
//
// WHY THIS EXISTS: Desktop/School Box classrooms run live sessions WITHOUT any
// cloud. The desktop runtime (desktop/runtime/alloflow-desktop-runtime.cjs)
// hosts an in-memory session-document bridge (/api/lan-sessions/{code}
// GET/PATCH/DELETE + SSE /events, plus /api/lan-docs/{key} for chunked session
// assets) and seeds localStorage.alloflow_live_session_config: the command
// center writes it for the teacher (lanApiBase = the private 127.0.0.1 origin)
// and the public /join/{code} page writes it for students (lanApiBase = the
// LAN share origin, plus a scoped token minted after join-PIN validation). When that config selects a
// LAN-backed mode, the wrappers below reroute ONLY classroom session documents
// (artifacts/{appId}/public/data/sessions/{code}) and their chunked assets
// (…/session_assets/{id}) from Firestore to the bridge — every other doc
// (user data, WebRTC signaling, conceptMastery) keeps its normal backend.
// All ~40 session call sites plus the CDN modules (which receive these
// functions as props or read the window.doc/setDoc/getDoc mirrors) inherit
// the reroute because the swap happens at these top-level bindings, exactly
// like _alloShimInit. WebRTC signaling is NOT bridged yet: polling/pictionary
// degrade to their documented fallbacks on cloudless LANs (see
// docs/LIVE_SESSION_PROTOCOL.md §7).
const ALLO_LAN_CONFIG_KEY = 'alloflow_live_session_config';
const _alloLanCfgCache = { at: 0, cfg: null };
function _alloLanConfig() {
  const now = Date.now();
  if (now - _alloLanCfgCache.at < 2000) return _alloLanCfgCache.cfg;
  let cfg = null;
  try {
    const raw = typeof window !== 'undefined' && window.localStorage
      ? window.localStorage.getItem(ALLO_LAN_CONFIG_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      const mode = parsed && parsed.mode;
      const base = parsed && typeof parsed.lanApiBase === 'string'
        ? parsed.lanApiBase.replace(/\/+$/, '') : '';
      // firestoreAllowed !== true keeps explicit cloud opt-ins (byo-firebase,
      // demo cloud) on Firestore even if a stale lanApiBase lingers.
      if ((mode === 'schoolbox-lan' || mode === 'district-server') && base && parsed.firestoreAllowed !== true) {
        cfg = { base, token: typeof parsed.lanToken === 'string' ? parsed.lanToken : '' };
      }
    }
  } catch (_) { cfg = null; }
  _alloLanCfgCache.at = now;
  _alloLanCfgCache.cfg = cfg;
  return cfg;
}
function _alloLanRefFromDocArgs(args) {
  if (!_alloLanConfig() || args.length !== 7) return null;
  if (args[1] !== 'artifacts' || args[3] !== 'public' || args[4] !== 'data') return null;
  const kind = args[5] === 'sessions' ? 'session' : (args[5] === 'session_assets' ? 'asset' : null);
  if (!kind) return null;
  // Session codes are 5-char A-Z/2-9; asset ids come from makeSessionAssetId
  // ([A-Za-z0-9_-], ≤420 chars + _chunk_N). Anything else falls through to the
  // base backend rather than risking a mangled bridge key.
  const id = String(args[6] == null ? '' : args[6]);
  if (!/^[A-Za-z0-9_-]{1,512}$/.test(id)) return null;
  return {
    __alloLanRef: kind,
    id,
    appId: String(args[2] == null ? '' : args[2]),
    path: 'artifacts/' + args[2] + '/public/data/' + args[5] + '/' + id,
  };
}
const _alloLanDocPath = (ref) =>
  (ref.__alloLanRef === 'session' ? '/api/lan-sessions/' : '/api/lan-docs/') + encodeURIComponent(ref.id);
async function _alloLanFetch(pathname, init) {
  const cfg = _alloLanConfig();
  if (!cfg) throw new Error('LAN session bridge is not configured');
  const headers = Object.assign({}, (init && init.headers) || {});
  if (cfg.token) headers.Authorization = 'Bearer ' + cfg.token;
  if (init && init.body) headers['Content-Type'] = 'application/json';
  return fetch(cfg.base + pathname, Object.assign({}, init, { headers }));
}
function _alloLanSnap(ref, payload) {
  // Mimics the Firestore v9 DocumentSnapshot surface the app actually uses:
  // exists() / data() / id / ref. payload is the bridge's {id, data, …} or null.
  return {
    id: ref.id,
    ref,
    exists: () => !!payload,
    data: () => (payload ? payload.data : undefined),
  };
}
function _alloLanIsDeleteSentinel(value) {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return false;
  if (value.__alloLanDelete === true || value.__op === 'deleteField') return true;
  return typeof value._methodName === 'string' && /delete/i.test(value._methodName);
}
function _applyLanSessionAdapter() {
  if (doc.__alloLanWrapped) return;
  const baseDoc = doc, baseGetDoc = getDoc, baseSetDoc = setDoc, baseUpdateDoc = updateDoc,
    baseDeleteDoc = deleteDoc, baseOnSnapshot = onSnapshot, baseDeleteField = deleteField;
  doc = (...args) => _alloLanRefFromDocArgs(args) || baseDoc(...args);
  doc.__alloLanWrapped = true;
  getDoc = async (ref) => {
    if (!ref || !ref.__alloLanRef) return baseGetDoc(ref);
    const res = await _alloLanFetch(_alloLanDocPath(ref), { method: 'GET' });
    if (res.status === 404) return _alloLanSnap(ref, null);
    if (!res.ok) throw new Error('LAN bridge read failed (' + res.status + ')');
    const body = await res.json();
    return _alloLanSnap(ref, body.session || body.doc || null);
  };
  setDoc = async (ref, data, opts) => {
    if (!ref || !ref.__alloLanRef) return baseSetDoc(ref, data, opts);
    const options = { merge: !!(opts && opts.merge) };
    const res = ref.__alloLanRef === 'session'
      ? await _alloLanFetch('/api/lan-sessions', {
          method: 'POST',
          body: JSON.stringify({ code: ref.id, session: data, options }),
        })
      : await _alloLanFetch(_alloLanDocPath(ref), {
          method: 'PUT',
          body: JSON.stringify({ doc: data, options }),
        });
    if (!res.ok) throw new Error('LAN bridge write failed (' + res.status + ')');
    return undefined;
  };
  updateDoc = async (ref, payload) => {
    if (!ref || !ref.__alloLanRef) return baseUpdateDoc(ref, payload);
    const updates = {};
    Object.keys(payload || {}).forEach((key) => {
      const value = payload[key];
      if (value === undefined) return;
      updates[key] = _alloLanIsDeleteSentinel(value) ? { __op: 'deleteField' } : value;
    });
    const res = await _alloLanFetch(_alloLanDocPath(ref), {
      method: 'PATCH',
      body: JSON.stringify({ updates }),
    });
    // 404 = doc gone; Firestore updateDoc rejects on missing docs too.
    if (!res.ok) throw new Error('LAN bridge update failed (' + res.status + ')');
    return undefined;
  };
  deleteDoc = async (ref) => {
    if (!ref || !ref.__alloLanRef) return baseDeleteDoc(ref);
    const res = await _alloLanFetch(_alloLanDocPath(ref), { method: 'DELETE' });
    if (!res.ok) throw new Error('LAN bridge delete failed (' + res.status + ')');
    return undefined;
  };
  deleteField = () => {
    // Tag the real sentinel so the LAN updateDoc can translate it to the
    // bridge's {__op:'deleteField'}; Firestore ignores the extra property.
    let sentinel;
    try { sentinel = baseDeleteField(); } catch (_) { sentinel = null; }
    if (sentinel && (typeof sentinel === 'object' || typeof sentinel === 'function')) {
      try { sentinel.__alloLanDelete = true; } catch (_) { /* frozen: fall through */ }
      if (sentinel.__alloLanDelete === true || !_alloLanConfig()) return sentinel;
    }
    return { __op: 'deleteField' };
  };
  onSnapshot = (ref, cb, errCb) => {
    if (!ref || !ref.__alloLanRef) return baseOnSnapshot(ref, cb, errCb);
    const cfg = _alloLanConfig();
    if (!cfg || ref.__alloLanRef !== 'session') {
      if (errCb) { try { errCb(new Error('LAN session bridge is not configured')); } catch (_) {} }
      return () => {};
    }
    // EventSource cannot send headers, so the scoped token rides as ?token= (the runtime
    // and validates its signature/scope; access logs must redact query args —
    // see docs/SCHOOL_SERVER_ARCHITECTURE.md).
    const tokenQs = cfg.token ? ('?token=' + encodeURIComponent(cfg.token)) : '';
    let closed = false;
    let gotMessage = false;
    const es = new EventSource(cfg.base + '/api/lan-sessions/' + encodeURIComponent(ref.id) + '/events' + tokenQs);
    const handle = (event) => {
      gotMessage = true;
      let payload = null;
      try { payload = JSON.parse(event.data); } catch (_) { payload = null; }
      try { cb(_alloLanSnap(ref, payload)); } catch (e) { console.warn('[LAN] snapshot callback failed', e); }
    };
    es.addEventListener('session', handle);
    es.onerror = () => {
      // Transient drops auto-retry inside EventSource. A hard close before ANY
      // message (wrong PIN, bridge gone) never recovers — surface it once,
      // like a Firestore permission error, so the shell can exit the session.
      if (!closed && !gotMessage && es.readyState === 2) {
        closed = true;
        try { es.close(); } catch (_) {}
        if (errCb) { try { errCb(new Error('LAN session bridge unreachable')); } catch (_) {} }
      }
    };
    return () => { closed = true; try { es.close(); } catch (_) {} };
  };
  // Refresh the window mirrors that CDN modules (module_scope_extras) capture;
  // ANTI's own mirror block only runs once at module scope.
  if (typeof window !== 'undefined' && window.doc) {
    window.doc = doc; window.setDoc = setDoc; window.getDoc = getDoc;
    window._fbDoc = doc; window._fbUpdateDoc = updateDoc;
  }
}
_applyLanSessionAdapter(); // Boot wrap; re-applied after every _alloShimInit upgrade.
