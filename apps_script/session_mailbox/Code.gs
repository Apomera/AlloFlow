/**
 * AlloFlow Class Mailbox — a teacher-owned rendezvous for live sessions and
 * homework packs. Deploy as a Web App (Execute as: Me / Access: Anyone) from
 * your own Google account; AlloFlow talks to the /exec URL. Nothing runs on
 * AlloFlow's servers and no student accounts are involved.
 *
 * What it stores, where:
 *  - Live-session messages: in-memory script cache only (CacheService),
 *    auto-expire <= 45 minutes; session markers <= 6 hours. Never written to
 *    Drive, never persisted.
 *  - Homework packs: single JSON files in a Drive folder named
 *    "AlloFlow Class Mailbox" in the OWNER's Drive. Delete them any time.
 *
 * Access model (capability tokens, no logins):
 *  - admin token: created once via {a:'claim'} the first time AlloFlow
 *    connects, before the URL is ever shared with students. Required to open
 *    live sessions and upload packs. To reset: Apps Script editor > Project
 *    Settings > Script properties > delete "admin", then reconnect.
 *  - session secret / pack secret: random per session/pack, carried only in
 *    the teacher's QR. Required to send/receive/fetch.
 *
 * All requests are POSTed as text/plain JSON (avoids CORS preflight, which
 * Apps Script cannot answer). GET on the /exec URL shows a human status line.
 */

var VERSION = 6;
var SESSION_TTL_SEC = 6 * 60 * 60;      // live session marker + counters
var MESSAGE_TTL_SEC = 45 * 60;          // live messages
var UPLOAD_TTL_SEC = 30 * 60;           // pack upload parts awaiting finalize
var MAX_MSG_CHARS = 90 * 1024;          // CacheService value limit is 100KB
var MAX_DOC_CHARS = 85 * 1024;          // session document / signaling doc ceiling
var MAX_DGET_DOCS = 12;                 // watched docs per poll
var MAX_PACK_CHARS = 8 * 1024 * 1024;   // ~8MB assembled pack ceiling
var GET_PART_CHARS = 150 * 1024;        // pack download slice size
var MAX_RECV_MSGS = 50;                 // per box per poll
var RATE_LIMIT_MSGS = 900;              // sends per box per ~minute (rolling cache window)
var RATE_LIMIT_TTL_SEC = 60;
var FOLDER_NAME = 'AlloFlow Class Mailbox';

function doGet() {
  return out({ ok: true, v: VERSION, service: 'alloflow-class-mailbox', t: Date.now() });
}

function doPost(e) {
  var p = {};
  try { p = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) {}
  try {
    return handle(p || {});
  } catch (err) {
    return out({ ok: false, e: 'server', d: String((err && err.message) || err).slice(0, 200) });
  }
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function isToken(v, min, max) {
  var s = String(v || '');
  return s.length >= (min || 10) && s.length <= (max || 64) && /^[A-Za-z0-9_-]+$/.test(s);
}

function handle(p) {
  var a = String(p.a || '');
  if (a === 'hello') return out({ ok: true, v: VERSION, t: Date.now() });

  var props = PropertiesService.getScriptProperties();
  if (a === 'claim') {
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(5000)) return out({ ok: false, e: 'busy' });
    try {
      if (props.getProperty('admin')) return out({ ok: false, e: 'claimed' });
      var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
      props.setProperty('admin', token);
      saveTokenNote(token);
      return out({ ok: true, admin: token, t: Date.now() });
    } finally { lock.releaseLock(); }
  }

  var cache = CacheService.getScriptCache();
  var admin = props.getProperty('admin') || '';
  var isAdmin = admin && String(p.admin || '') === admin;

  // Cheap ownership check so a reconnecting teacher can validate a pasted
  // admin token. On success it also (re)writes the Drive token note, so
  // deployments claimed before v3 gain the backup file.
  if (a === 'auth') {
    if (isAdmin) saveTokenNote(admin);
    return out({ ok: true, admin: !!isAdmin, claimed: !!admin, t: Date.now() });
  }

  if (a === 'open') {
    if (!isAdmin) return out({ ok: false, e: 'not-admin' });
    var code = String(p.c || '').toUpperCase();
    if (!/^[A-Z0-9]{4,8}$/.test(code) || !isToken(p.k)) return out({ ok: false, e: 'bad-request' });
    cache.put('s:' + code, String(p.k), SESSION_TTL_SEC);
    // A reused code must not resurface a previous class's session document.
    cache.remove('d:' + code + ':s');
    cache.remove('dw:' + code);
    // Durable copy: CacheService is best-effort and can evict a live session
    // marker under memory pressure, kicking the whole class out mid-lesson.
    // PropertiesService survives; lookups rewarm the cache from it.
    props.setProperty('sess_' + code, String(p.k) + '|' + Date.now());
    pruneExpiredSessions(props);
    return out({ ok: true, t: Date.now() });
  }

  if (a === 'send' || a === 'recv' || a === 'end') {
    var sc = String(p.c || '').toUpperCase();
    var secret = sessionSecretFor(sc, cache, props);
    if (!secret) return out({ ok: false, e: 'no-session' });
    if (String(p.k || '') !== secret) return out({ ok: false, e: 'denied' });
    if (a === 'send') return send(cache, sc, p);
    if (a === 'recv') return recv(cache, sc, p);
    cache.remove('s:' + sc);
    cache.remove('d:' + sc + ':s');
    cache.remove('dw:' + sc);
    try { props.deleteProperty('sess_' + sc); } catch (e2) {}
    return out({ ok: true });
  }

  // Session document store (v6): a tiny Firestore stand-in scoped to one live
  // session, so the SAME session UI (roster, polls, quiz, pictionary
  // signaling) runs unchanged over the mailbox. Documents are JSON envelopes
  // {w: version, d: data} under short path tokens the client chooses ('s' =
  // the session doc, 'g:<sig>:<uid>' = a signaling doc, 'c:<sig>' = a
  // collection index of {id: version}). dget doubles as the delta poll: a doc
  // whose version still matches the caller's known one comes back without its
  // body. Everything lives in CacheService only (live-session posture — same
  // as boxes); the teacher client re-seeds the session doc after an eviction.
  if (a === 'dget' || a === 'dset' || a === 'dpatch' || a === 'ddel') {
    var dcode = String(p.c || '').toUpperCase();
    var dsecret = sessionSecretFor(dcode, cache, props);
    if (!dsecret) return out({ ok: false, e: 'no-session' });
    if (String(p.k || '') !== dsecret) return out({ ok: false, e: 'denied' });
    if (a === 'dget') return docGet(cache, dcode, p);
    return docWrite(cache, dcode, a, p);
  }

  // Server-side session recovery (v5): the durable sess_<code> markers ARE
  // the teacher's open-session list (one admin owns this mailbox). Storage is
  // unavailable in the Gemini Canvas iframe, so the client cannot remember a
  // running session locally — it asks the server instead, authenticated by
  // the admin token (recoverable from the Drive backup note). No manual code
  // re-entry needed after a refresh.
  if (a === 'mysessions') {
    if (!isAdmin) return out({ ok: false, e: 'not-admin' });
    pruneExpiredSessions(props);
    var sessions = [];
    try {
      var all = props.getProperties();
      Object.keys(all).forEach(function(key) {
        if (key.indexOf('sess_') !== 0) return;
        var val = all[key];
        var sep = val.indexOf('|');
        sessions.push({ c: key.slice(5), k: sep > -1 ? val.slice(0, sep) : val, at: sep > -1 ? (parseInt(val.slice(sep + 1), 10) || 0) : 0 });
      });
    } catch (e) {}
    sessions.sort(function(a2, b2) { return b2.at - a2.at; });
    return out({ ok: true, sessions: sessions, t: Date.now() });
  }

  if (a === 'putpack') {
    if (!isAdmin) return out({ ok: false, e: 'not-admin' });
    return putPack(cache, p);
  }
  if (a === 'getpack') return getPack(p);
  if (a === 'delpack') {
    if (!isAdmin) return out({ ok: false, e: 'not-admin' });
    return delPack(p);
  }
  return out({ ok: false, e: 'bad-action' });
}

function cleanBox(v) {
  var b = String(v || '');
  return (b === 'up' || b === 'down') ? b : '';
}

// Session secret lookup: cache first, durable PropertiesService fallback
// (rewarming the cache), honoring the same 6h TTL.
function sessionSecretFor(code, cache, props) {
  var secret = cache.get('s:' + code);
  if (secret) return secret;
  var stored = props.getProperty('sess_' + code);
  if (!stored) return null;
  var sep = stored.indexOf('|');
  var key = sep > -1 ? stored.slice(0, sep) : stored;
  var ts = sep > -1 ? parseInt(stored.slice(sep + 1), 10) || 0 : 0;
  if (ts && Date.now() - ts > SESSION_TTL_SEC * 1000) {
    try { props.deleteProperty('sess_' + code); } catch (e) {}
    return null;
  }
  cache.put('s:' + code, key, SESSION_TTL_SEC);
  return key;
}

function pruneExpiredSessions(props) {
  try {
    var all = props.getProperties();
    Object.keys(all).forEach(function(k) {
      if (k.indexOf('sess_') !== 0) return;
      var sep = all[k].indexOf('|');
      var ts = sep > -1 ? parseInt(all[k].slice(sep + 1), 10) || 0 : 0;
      if (!ts || Date.now() - ts > SESSION_TTL_SEC * 1000) props.deleteProperty(k);
    });
  } catch (e) { /* best-effort */ }
}

function send(cache, code, p) {
  var box = cleanBox(p.box);
  if (!box) return out({ ok: false, e: 'bad-box' });
  var text = JSON.stringify({ f: String(p.from || '').slice(0, 60), t: Date.now(), v: p.v === undefined ? null : p.v });
  if (text.length > MAX_MSG_CHARS) return out({ ok: false, e: 'too-big' });
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return out({ ok: false, e: 'busy' });
  try {
    // Rolling ~1-minute flood cap per box: a leaked QR lets a student write
    // to this session, but not drown it. Normal classroom load (heartbeats,
    // hand-raises, chunked pushes, RTC signaling) stays far below this.
    var rKey = 'r:' + code + ':' + box;
    var used = (parseInt(cache.get(rKey), 10) || 0) + 1;
    if (used > RATE_LIMIT_MSGS) return out({ ok: false, e: 'rate-limited' });
    cache.put(rKey, String(used), RATE_LIMIT_TTL_SEC);
    var nKey = 'n:' + code + ':' + box;
    var next = (parseInt(cache.get(nKey), 10) || 0) + 1;
    cache.put('m:' + code + ':' + box + ':' + next, text, MESSAGE_TTL_SEC);
    cache.put(nKey, String(next), SESSION_TTL_SEC);
    return out({ ok: true, i: next });
  } finally { lock.releaseLock(); }
}

function recv(cache, code, p) {
  var boxes = String(p.box || '').split(',');
  var sinceList = String(p.since || '').split(',');
  var result = {};
  for (var bi = 0; bi < boxes.length && bi < 4; bi++) {
    var box = cleanBox(boxes[bi]);
    if (!box) continue;
    var since = parseInt(sinceList[bi], 10) || 0;
    var latest = parseInt(cache.get('n:' + code + ':' + box), 10) || 0;
    if (latest - since > 400) since = latest - 400; // fast-forward long-dead cursors
    var keys = [];
    for (var i = since + 1; i <= latest && keys.length < MAX_RECV_MSGS; i++) keys.push('m:' + code + ':' + box + ':' + i);
    var found = keys.length ? cache.getAll(keys) : {};
    var msgs = [];
    var cursor = since;
    for (var j = 0; j < keys.length; j++) {
      cursor = since + 1 + j;
      var raw = found[keys[j]];
      if (!raw) continue; // expired gap
      try { msgs.push([cursor, JSON.parse(raw)]); } catch (err2) {}
    }
    result[box] = { n: Math.max(cursor, since), m: msgs, latest: latest };
  }
  return out({ ok: true, b: result, t: Date.now() });
}

// ── Session document store (v6) ─────────────────────────────────────────────

function cleanDocPath(v) {
  var s = String(v || '');
  return /^[A-Za-z0-9_.:-]{1,80}$/.test(s) ? s : '';
}

function readDocEnvelope(cache, code, p) {
  var raw = cache.get('d:' + code + ':' + p);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

function writeDocEnvelope(cache, code, p, env) {
  var text = JSON.stringify(env);
  if (text.length > MAX_DOC_CHARS) return false;
  // The session doc lives as long as the session; signaling docs are
  // handshake-transient and ride the message TTL.
  cache.put('d:' + code + ':' + p, text, p === 's' ? SESSION_TTL_SEC : MESSAGE_TTL_SEC);
  return true;
}

function nextDocVersion(cache, code) {
  var key = 'dw:' + code;
  var w = (parseInt(cache.get(key), 10) || 0) + 1;
  cache.put(key, String(w), SESSION_TTL_SEC);
  return w;
}

// Collection membership index: a doc at the collection's own path token whose
// data is {childId: version}. Watching a collection = watching this doc.
function bumpDocIndex(cache, code, col, id, w, removed) {
  if (!col || !id) return;
  var env = readDocEnvelope(cache, code, col);
  if (!env || !env.d || typeof env.d !== 'object') env = { w: 0, d: {} };
  if (removed) delete env.d[id];
  else env.d[id] = w;
  env.w = nextDocVersion(cache, code);
  writeDocEnvelope(cache, code, col, env);
}

// Firestore updateDoc parity: dot-separated paths address nested fields and
// {__op:'deleteField'} removes one. Arrays are replaced wholesale, like
// Firestore.
function applyDocUpdates(target, updates) {
  Object.keys(updates || {}).forEach(function(key) {
    var value = updates[key];
    var segs = String(key).split('.');
    var node = target;
    for (var i = 0; i < segs.length - 1; i++) {
      var s = segs[i];
      if (!node[s] || typeof node[s] !== 'object' || Array.isArray(node[s])) node[s] = {};
      node = node[s];
    }
    var leaf = segs[segs.length - 1];
    if (value && typeof value === 'object' && value.__op === 'deleteField') delete node[leaf];
    else node[leaf] = value;
  });
  return target;
}

function docGet(cache, code, p) {
  var entries = Array.isArray(p.ps) ? p.ps : [];
  var docs = [];
  for (var i = 0; i < entries.length && i < MAX_DGET_DOCS; i++) {
    var tok = cleanDocPath(entries[i] && entries[i].p);
    if (!tok) continue;
    var known = parseInt(entries[i] && entries[i].w, 10) || 0;
    var env = readDocEnvelope(cache, code, tok);
    if (!env) { docs.push({ p: tok, w: 0, missing: true }); continue; }
    if (env.w > known) docs.push({ p: tok, w: env.w, d: env.d });
    else docs.push({ p: tok, w: env.w });
  }
  return out({ ok: true, docs: docs, t: Date.now() });
}

function docWrite(cache, code, action, p) {
  var tok = cleanDocPath(p.p);
  if (!tok) return out({ ok: false, e: 'bad-path' });
  var col = cleanDocPath(p.col);
  var id = String(p.id || '').slice(0, 80);
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return out({ ok: false, e: 'busy' });
  try {
    // Doc writes share the session's flood posture (their own rolling bucket,
    // same ceiling): a leaked QR can scribble on this session, not drown the
    // script.
    var rKey = 'r:' + code + ':doc';
    var used = (parseInt(cache.get(rKey), 10) || 0) + 1;
    if (used > RATE_LIMIT_MSGS) return out({ ok: false, e: 'rate-limited' });
    cache.put(rKey, String(used), RATE_LIMIT_TTL_SEC);
    if (action === 'ddel') {
      cache.remove('d:' + code + ':' + tok);
      bumpDocIndex(cache, code, col, id, 0, true);
      return out({ ok: true, t: Date.now() });
    }
    if (action === 'dset') {
      var data = p.d === undefined ? null : p.d;
      if (p.merge) {
        var prev = readDocEnvelope(cache, code, tok);
        if (prev && prev.d && typeof prev.d === 'object' && data && typeof data === 'object') {
          var mergedData = prev.d;
          Object.keys(data).forEach(function(k2) { mergedData[k2] = data[k2]; });
          data = mergedData;
        }
      }
      var env = { w: nextDocVersion(cache, code), d: data };
      if (!writeDocEnvelope(cache, code, tok, env)) return out({ ok: false, e: 'too-big' });
      bumpDocIndex(cache, code, col, id, env.w, false);
      return out({ ok: true, w: env.w, t: Date.now() });
    }
    // dpatch — rejects on a missing doc, exactly like Firestore updateDoc.
    var existing = readDocEnvelope(cache, code, tok);
    if (!existing || !existing.d || typeof existing.d !== 'object') return out({ ok: false, e: 'no-doc' });
    var patched = applyDocUpdates(existing.d, p.u && typeof p.u === 'object' ? p.u : {});
    var env2 = { w: nextDocVersion(cache, code), d: patched };
    if (!writeDocEnvelope(cache, code, tok, env2)) return out({ ok: false, e: 'too-big' });
    bumpDocIndex(cache, code, col, id, env2.w, false);
    return out({ ok: true, w: env2.w, d: env2.d, t: Date.now() });
  } finally { lock.releaseLock(); }
}

function packFolder() {
  var it = DriveApp.getFoldersByName(FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
}

// Keep a copy of the admin token as a file in the OWNER's Drive folder, so a
// teacher who loses it (new device, fresh Canvas) can always recover it from
// Drive instead of spelunking Script Properties. The file lives in the
// owner's private Drive — the web app never serves it to callers; handing it
// out on request would make the token protect nothing.
function saveTokenNote(token) {
  try {
    var name = 'ADMIN-TOKEN (do not share).txt';
    var body = 'AlloFlow Class Mailbox admin token — treat it like a password:\n\n'
      + token + '\n\n'
      + 'Paste it into AlloFlow (Live class without accounts -> Admin token field)\n'
      + 'when reconnecting from a new device or a fresh Canvas paste.\n\n'
      + 'To invalidate it: Apps Script editor -> Project Settings -> Script\n'
      + 'properties -> delete "admin", then reconnect from AlloFlow.';
    var folder = packFolder();
    var it = folder.getFilesByName(name);
    if (it.hasNext()) it.next().setContent(body);
    else folder.createFile(name, body, 'text/plain');
  } catch (e) { /* best-effort: never block claim/auth on Drive hiccups */ }
}

function findPackFile(id) {
  var it = packFolder().getFilesByName('pack-' + id + '.json');
  return it.hasNext() ? it.next() : null;
}

function putPack(cache, p) {
  var id = String(p.id || '');
  if (!/^PK-[0-9a-f-]{36}$/i.test(id) || !isToken(p.k)) return out({ ok: false, e: 'bad-request' });
  var part = parseInt(p.part, 10) || 0;
  var of = parseInt(p.of, 10) || 0;
  var data = String(p.data || '');
  if (part < 1 || of < 1 || part > of || of > 200 || !data || data.length > MAX_MSG_CHARS) return out({ ok: false, e: 'bad-part' });
  cache.put('u:' + id + ':' + part, data, UPLOAD_TTL_SEC);
  if (part < of) return out({ ok: true, part: part });
  // Final part received: assemble under lock and write one Drive file.
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return out({ ok: false, e: 'busy' });
  try {
    var keys = [];
    for (var i = 1; i <= of; i++) keys.push('u:' + id + ':' + i);
    var found = cache.getAll(keys);
    var pieces = [];
    for (var j = 1; j <= of; j++) {
      var piece = found['u:' + id + ':' + j];
      if (!piece) return out({ ok: false, e: 'missing-part', part: j });
      pieces.push(piece);
    }
    var assembled = pieces.join('');
    if (assembled.length > MAX_PACK_CHARS) return out({ ok: false, e: 'too-big' });
    var body = JSON.stringify({ k: String(p.k), t: Date.now(), title: String(p.title || '').slice(0, 140), data: assembled });
    var existing = findPackFile(id);
    if (existing) existing.setContent(body);
    else packFolder().createFile('pack-' + id + '.json', body, 'application/json');
    for (var r = 1; r <= of; r++) cache.remove('u:' + id + ':' + r);
    return out({ ok: true, id: id, chars: assembled.length });
  } finally { lock.releaseLock(); }
}

function getPack(p) {
  var id = String(p.id || '');
  if (!/^PK-[0-9a-f-]{36}$/i.test(id)) return out({ ok: false, e: 'bad-request' });
  var file = findPackFile(id);
  if (!file) return out({ ok: false, e: 'no-pack' });
  var body;
  try { body = JSON.parse(file.getBlob().getDataAsString()); } catch (err) { return out({ ok: false, e: 'corrupt' }); }
  if (String(p.k || '') !== String(body.k || '')) return out({ ok: false, e: 'denied' });
  var data = String(body.data || '');
  var part = Math.max(1, parseInt(p.part, 10) || 1);
  var of = Math.max(1, Math.ceil(data.length / GET_PART_CHARS));
  if (part > of) return out({ ok: false, e: 'bad-part' });
  return out({
    ok: true,
    id: id,
    title: String(body.title || ''),
    part: part,
    of: of,
    data: data.slice((part - 1) * GET_PART_CHARS, part * GET_PART_CHARS),
  });
}

function delPack(p) {
  var file = findPackFile(String(p.id || ''));
  if (file) file.setTrashed(true);
  return out({ ok: true });
}
