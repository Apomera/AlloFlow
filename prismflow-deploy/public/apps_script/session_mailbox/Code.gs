/**
 * AlloFlow Class Mailbox — a teacher-owned rendezvous for live sessions and
 * homework packs. Deploy as a Web App (Execute as: Me / Access: Anyone) from
 * your own Google account; AlloFlow talks to the /exec URL. Nothing runs on
 * AlloFlow's servers and no student accounts are involved.
 *
 * What it stores, where:
 *  - Live messages and documents: bounded Apps Script CacheService entries,
 *    eligible for early eviction and expiring within 45 minutes to 6 hours.
 *  - Session markers/secrets: Script Properties for at most 6 hours so a
 *    teacher refresh can recover a class after cache eviction.
 *  - Homework packs and completed submission JSON: files in the owner's
 *    "AlloFlow Class Mailbox" Drive folder. Delete them any time.
 *
 * Access model (capability tokens, no student logins):
 *  - admin token: required for teacher broadcasts, full class state, session
 *    lifecycle, and pack management. It never appears in a student QR.
 *  - session join secret: carried in the QR and accepted only by {a:'join'}.
 *    The server returns a signed participant token bound to a random uid.
 *  - participant token: permits student-up messages, privacy-filtered reads,
 *    own roster/answer/reaction/vote updates, and own signaling only.
 *
 * All requests are POSTed as text/plain JSON (avoids CORS preflight, which
 * Apps Script cannot answer). GET on the /exec URL shows a human status line.
 */

var VERSION = 9;
var SESSION_TTL_SEC = 6 * 60 * 60;      // live session marker + counters
var MESSAGE_TTL_SEC = 45 * 60;          // live messages
var UPLOAD_TTL_SEC = 30 * 60;           // pack upload parts awaiting finalize
var MAX_MSG_CHARS = 90 * 1024;          // CacheService value limit is 100KB
var MAX_DOC_CHARS = 85 * 1024;          // session document / signaling doc ceiling
var MAX_DGET_DOCS = 12;                 // watched docs per poll
var MAX_PACK_CHARS = 8 * 1024 * 1024;   // ~8MB assembled pack ceiling
var GET_PART_CHARS = 150 * 1024;        // pack download slice size
var MAX_RECV_MSGS = 50;                 // per box per poll
var RATE_LIMIT_MSGS = 900;              // teacher sends per box per ~minute
var RATE_LIMIT_TTL_SEC = 60;
var MESSAGE_RING_SIZE = 240;             // hard bound per box; prevents cache-wide eviction
var PARTICIPANT_READS_PER_MIN = 120;
var PARTICIPANT_WRITES_PER_MIN = 120;
var SESSION_READS_PER_MIN = 1800;
var MAX_PATCH_FIELDS = 60;
var MAX_JSON_DEPTH = 12;
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
  return s.length >= (min || 10) && s.length <= (max || 96) && /^[A-Za-z0-9_-]+$/.test(s);
}

function newToken() {
  return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
}

function participantToken(admin, code, uid, secret) {
  var bytes = Utilities.computeHmacSha256Signature(code + '|' + uid + '|' + secret, admin);
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/g, '');
}

function requestActor(p, code, secret, admin) {
  if (admin && String(p.admin || '') === admin) return { role: 'teacher', uid: 'teacher' };
  var uid = String(p.uid || '');
  var pt = String(p.pt || '');
  if (!/^mb-[A-Za-z0-9_-]{8,48}$/.test(uid) || !isToken(pt, 20, 96)) return null;
  var expected = participantToken(admin, code, uid, secret);
  return pt === expected ? { role: 'participant', uid: uid } : null;
}

function rateCheck(cache, key, limit) {
  var used = (parseInt(cache.get(key), 10) || 0) + 1;
  if (used > limit) return false;
  cache.put(key, String(used), RATE_LIMIT_TTL_SEC);
  return true;
}

function actorRateKey(code, actor, kind) {
  return 'r:' + code + ':' + kind + ':' + (actor.role === 'teacher' ? 't' : actor.uid.slice(0, 32));
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
      var token = newToken();
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

  if (a === 'rotateadmin') {
    if (!isAdmin) return out({ ok: false, e: 'not-admin' });
    pruneExpiredSessions(props);
    var active = listSessions(props);
    if (active.length && !p.force) return out({ ok: false, e: 'sessions-active', count: active.length });
    if (active.length) closeAllSessions(cache, props);
    var rotated = newToken();
    props.setProperty('admin', rotated);
    saveTokenNote(rotated);
    return out({ ok: true, admin: rotated, t: Date.now() });
  }
  if (a === 'closeall') {
    if (!isAdmin) return out({ ok: false, e: 'not-admin' });
    return out({ ok: true, closed: closeAllSessions(cache, props), t: Date.now() });
  }

  if (a === 'open') {
    if (!isAdmin) return out({ ok: false, e: 'not-admin' });
    var code = String(p.c || '').toUpperCase();
    if (!/^[A-Z0-9]{4,8}$/.test(code) || !isToken(p.k)) return out({ ok: false, e: 'bad-request' });
    // A reused code must not resurface messages, documents, or signaling from
    // a previous class that happened to use the same short code.
    clearSessionEphemeral(cache, code);
    cache.put('s:' + code, String(p.k), SESSION_TTL_SEC);
    props.setProperty('sess_' + code, String(p.k) + '|' + Date.now());
    pruneExpiredSessions(props);
    return out({ ok: true, t: Date.now() });
  }

  if (a === 'join') {
    var jcode = String(p.c || '').toUpperCase();
    var jsecret = sessionSecretFor(jcode, cache, props);
    if (!jsecret) return out({ ok: false, e: 'no-session' });
    if (String(p.k || '') !== jsecret) return out({ ok: false, e: 'denied' });
    if (!rateCheck(cache, 'r:' + jcode + ':join', 120)) return out({ ok: false, e: 'rate-limited', retryAfterMs: 60000 });
    var juid = 'mb-' + Utilities.getUuid().replace(/-/g, '').slice(-20);
    return out({ ok: true, uid: juid, pt: participantToken(admin, jcode, juid, jsecret), t: Date.now() });
  }

  if (a === 'send' || a === 'recv' || a === 'end') {
    var sc = String(p.c || '').toUpperCase();
    var secret = sessionSecretFor(sc, cache, props);
    if (!secret) return out({ ok: false, e: 'no-session' });
    var actor = requestActor(p, sc, secret, admin);
    if (!actor) return out({ ok: false, e: 'denied' });
    if (a === 'end') {
      if (actor.role !== 'teacher') return out({ ok: false, e: 'not-admin' });
      closeSession(cache, props, sc);
      return out({ ok: true });
    }
    if (a === 'send') return send(cache, sc, p, actor);
    return recv(cache, sc, p, actor);
  }

  // Session document store (v7): teacher and participant capabilities are
  // distinct. Participants see a privacy-filtered session view and may write
  // only their own roster/answer/reaction/vote/signaling surfaces.
  if (a === 'dget' || a === 'dset' || a === 'dpatch' || a === 'ddel') {
    var dcode = String(p.c || '').toUpperCase();
    var dsecret = sessionSecretFor(dcode, cache, props);
    if (!dsecret) return out({ ok: false, e: 'no-session' });
    var dactor = requestActor(p, dcode, dsecret, admin);
    if (!dactor) return out({ ok: false, e: 'denied' });
    if (a === 'dget') return docGet(cache, dcode, p, dactor);
    return docWrite(cache, dcode, a, p, dactor);
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
  if (a === 'putsubmission') return putSubmission(cache, props, p, admin);
  if (a === 'getpack') return getPack(cache, p);
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

function listSessions(props) {
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
  sessions.sort(function(a, b) { return b.at - a.at; });
  return sessions;
}

function removeCacheKeys(cache, keys) {
  if (!keys.length) return;
  if (typeof cache.removeAll === 'function') cache.removeAll(keys);
  else keys.forEach(function(key) { cache.remove(key); });
}

function clearSessionEphemeral(cache, code) {
  var keys = ['d:' + code + ':s', 'dw:' + code, 'n:' + code + ':up', 'n:' + code + ':down'];
  ['up', 'down'].forEach(function(box) {
    for (var i = 0; i < MESSAGE_RING_SIZE; i++) keys.push('m:' + code + ':' + box + ':' + i);
  });
  ['signaling', 'pictionary-signaling', 'quiz-signaling'].forEach(function(sig) {
    var col = 'c:' + sig;
    var env = readDocEnvelope(cache, code, col);
    if (env && env.d && typeof env.d === 'object') {
      Object.keys(env.d).forEach(function(uid) { keys.push('d:' + code + ':g:' + sig + ':' + uid); });
    }
    keys.push('d:' + code + ':' + col);
  });
  removeCacheKeys(cache, keys);
}

function closeSession(cache, props, code) {
  clearSessionEphemeral(cache, code);
  cache.remove('s:' + code);
  try { props.deleteProperty('sess_' + code); } catch (e) {}
}

function closeAllSessions(cache, props) {
  var sessions = listSessions(props);
  sessions.forEach(function(s) { closeSession(cache, props, s.c); });
  return sessions.length;
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

function normalizeParticipantMessage(value, uid) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (value.kind === 'student') {
    return {
      kind: 'student',
      uid: uid,
      name: String(value.name || 'Student').slice(0, 40),
      hand: value.hand === true
    };
  }
  if (value.kind === 'rtc' && value.sdp && value.sdp.type === 'offer'
      && typeof value.sdp.sdp === 'string' && value.sdp.sdp.length <= 70000) {
    return { kind: 'rtc', uid: uid, sdp: { type: 'offer', sdp: value.sdp.sdp } };
  }
  return null;
}
function send(cache, code, p, actor) {
  var box = cleanBox(p.box);
  if (!box) return out({ ok: false, e: 'bad-box' });
  if ((actor.role === 'teacher' && box !== 'down') || (actor.role === 'participant' && box !== 'up')) {
    return out({ ok: false, e: 'denied' });
  }
  var from = actor.role === 'teacher' ? 'teacher' : actor.uid;
  var value = p.v === undefined ? null : p.v;
  if (actor.role === 'participant') {
    value = normalizeParticipantMessage(value, actor.uid);
    if (!value) return out({ ok: false, e: 'denied' });
  }
  if (!validateJsonValue(value, 0)) return out({ ok: false, e: 'bad-data' });
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return out({ ok: false, e: 'busy' });
  try {
    var limit = actor.role === 'teacher' ? RATE_LIMIT_MSGS : PARTICIPANT_WRITES_PER_MIN;
    if (!rateCheck(cache, actorRateKey(code, actor, 'send'), limit)) {
      return out({ ok: false, e: 'rate-limited', retryAfterMs: 60000 });
    }
    var nKey = 'n:' + code + ':' + box;
    var next = (parseInt(cache.get(nKey), 10) || 0) + 1;
    var text = JSON.stringify({ i: next, f: from, t: Date.now(), v: value });
    if (text.length > MAX_MSG_CHARS) return out({ ok: false, e: 'too-big' });
    var slot = next % MESSAGE_RING_SIZE;
    cache.put('m:' + code + ':' + box + ':' + slot, text, MESSAGE_TTL_SEC);
    cache.put(nKey, String(next), SESSION_TTL_SEC);
    return out({ ok: true, i: next });
  } finally { lock.releaseLock(); }
}

function recv(cache, code, p, actor) {
  var requested = String(p.box || '');
  if ((actor.role === 'teacher' && requested !== 'up') || (actor.role === 'participant' && requested !== 'down')) {
    return out({ ok: false, e: 'denied' });
  }
  if (!rateCheck(cache, actorRateKey(code, actor, 'read'), PARTICIPANT_READS_PER_MIN)
      || !rateCheck(cache, 'r:' + code + ':read:all', SESSION_READS_PER_MIN)) {
    return out({ ok: false, e: 'rate-limited', retryAfterMs: 60000 });
  }
  var boxes = requested.split(',');
  var sinceList = String(p.since || '').split(',');
  var result = {};
  for (var bi = 0; bi < boxes.length && bi < 4; bi++) {
    var box = cleanBox(boxes[bi]);
    if (!box) continue;
    var since = parseInt(sinceList[bi], 10) || 0;
    var latest = parseInt(cache.get('n:' + code + ':' + box), 10) || 0;
    if (latest - since > MESSAGE_RING_SIZE) since = latest - MESSAGE_RING_SIZE;
    var keys = [];
    for (var i = since + 1; i <= latest && keys.length < MAX_RECV_MSGS; i++) keys.push('m:' + code + ':' + box + ':' + (i % MESSAGE_RING_SIZE));
    var found = keys.length ? cache.getAll(keys) : {};
    var msgs = [];
    var cursor = since;
    for (var j = 0; j < keys.length; j++) {
      cursor = since + 1 + j;
      var raw = found[keys[j]];
      if (!raw) continue; // expired gap
      try { var parsed = JSON.parse(raw); if (parsed.i === cursor) msgs.push([cursor, parsed]); } catch (err2) {}
    }
    result[box] = { n: Math.max(cursor, since), m: msgs, latest: latest };
  }
  var response = { ok: true, b: result, t: Date.now() };
  // Doc-watch piggyback (additive, same VERSION): clients fold their session
  // document watch list into the poll they already make, halving steady-state
  // request volume. Old clients do not send ps; old servers ignore it and
  // clients fall back to their own dget pump. NOTE: keep backticks out of
  // this file — it ships embedded in the app as a template literal.
  if (Array.isArray(p.ps) && p.ps.length) {
    if (!canReadDocEntries(p.ps, actor)) return out({ ok: false, e: 'denied' });
    response.docs = collectDocEntries(cache, code, p.ps, actor);
  }
  return out(response);
}

// ── Session document store (v7) ─────────────────────────────────────────────

function cleanDocPath(v) {
  var s = String(v || '');
  return /^[A-Za-z0-9_.:-]{1,80}$/.test(s) ? s : '';
}

function isReservedSegment(v) {
  return v === '__proto__' || v === 'prototype' || v === 'constructor';
}

function validateJsonValue(value, depth) {
  if (depth > MAX_JSON_DEPTH) return false;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return isFinite(value);
  if (Array.isArray(value)) {
    if (value.length > 1000) return false;
    for (var i = 0; i < value.length; i++) if (!validateJsonValue(value[i], depth + 1)) return false;
    return true;
  }
  if (!value || typeof value !== 'object') return false;
  var keys = Object.keys(value);
  if (keys.length > 500) return false;
  for (var j = 0; j < keys.length; j++) {
    if (isReservedSegment(keys[j]) || keys[j].length > 120) return false;
    if (!validateJsonValue(value[keys[j]], depth + 1)) return false;
  }
  return true;
}

function validatePatchUpdates(updates) {
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) return false;
  var keys = Object.keys(updates);
  if (keys.length < 1 || keys.length > MAX_PATCH_FIELDS) return false;
  for (var i = 0; i < keys.length; i++) {
    var key = String(keys[i]);
    var segs = key.split('.');
    if (!key || segs.length > MAX_JSON_DEPTH) return false;
    for (var j = 0; j < segs.length; j++) {
      if (!segs[j] || segs[j].length > 80 || isReservedSegment(segs[j])) return false;
    }
    var value = updates[key];
    if (value && typeof value === 'object' && value.__op === 'deleteField') {
      if (Object.keys(value).length !== 1) return false;
    } else if (!validateJsonValue(value, 0)) return false;
  }
  return true;
}

function readDocEnvelope(cache, code, p) {
  var raw = cache.get('d:' + code + ':' + p);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

function writeDocEnvelope(cache, code, p, env) {
  var text = JSON.stringify(env);
  if (text.length > MAX_DOC_CHARS) return false;
  cache.put('d:' + code + ':' + p, text, p === 's' ? SESSION_TTL_SEC : MESSAGE_TTL_SEC);
  return true;
}

function nextDocVersion(cache, code) {
  var key = 'dw:' + code;
  var w = (parseInt(cache.get(key), 10) || 0) + 1;
  cache.put(key, String(w), SESSION_TTL_SEC);
  return w;
}

function peerPathParts(tok) {
  var parts = String(tok || '').split(':');
  if (parts.length !== 3 || parts[0] !== 'g') return null;
  if (!/^(?:[a-z0-9_-]+-)?signaling$/.test(parts[1])) return null;
  if (!/^mb-[A-Za-z0-9_-]{8,48}$/.test(parts[2])) return null;
  return { sig: parts[1], uid: parts[2], col: 'c:' + parts[1] };
}

function canReadDocPath(tok, actor) {
  if (actor.role === 'teacher') return true;
  if (tok === 's') return true;
  var peer = peerPathParts(tok);
  return !!peer && peer.uid === actor.uid;
}

function canReadDocEntries(entries, actor) {
  if (!Array.isArray(entries) || entries.length > MAX_DGET_DOCS) return false;
  for (var i = 0; i < entries.length; i++) {
    var tok = cleanDocPath(entries[i] && entries[i].p);
    if (!tok || !canReadDocPath(tok, actor)) return false;
  }
  return true;
}

function ownMap(map, uid) {
  var outMap = {};
  if (map && typeof map === 'object' && Object.prototype.hasOwnProperty.call(map, uid)) outMap[uid] = map[uid];
  return outMap;
}

function projectSessionForParticipant(data, uid) {
  var copy;
  try { copy = JSON.parse(JSON.stringify(data || {})); } catch (e) { return {}; }
  copy.participantCount = copy.roster && typeof copy.roster === 'object' ? Object.keys(copy.roster).length : 0;
  copy.roster = ownMap(copy.roster, uid);
  if (copy.quizState && typeof copy.quizState === 'object') {
    copy.quizState.allResponses = ownMap(copy.quizState.allResponses, uid);
    copy.quizState.responses = ownMap(copy.quizState.responses, uid);
    copy.quizState.teams = ownMap(copy.quizState.teams, uid);
  }
  copy.bridgeReactions = ownMap(copy.bridgeReactions, uid);
  if (copy.democracy && typeof copy.democracy === 'object') copy.democracy.votes = ownMap(copy.democracy.votes, uid);
  if (copy.escapeRoomState && typeof copy.escapeRoomState === 'object') {
    copy.escapeRoomState.teams = ownMap(copy.escapeRoomState.teams, uid);
  }
  return copy;
}

function applyDocUpdates(target, updates) {
  Object.keys(updates).forEach(function(key) {
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

function bumpDocIndex(cache, code, col, id, w, removed) {
  if (!col || !id) return;
  var env = readDocEnvelope(cache, code, col);
  if (!env || !env.d || typeof env.d !== 'object') env = { w: 0, d: {} };
  if (removed) delete env.d[id];
  else env.d[id] = w;
  env.w = nextDocVersion(cache, code);
  writeDocEnvelope(cache, code, col, env);
}

function collectDocEntries(cache, code, entries, actor) {
  var docs = [];
  for (var i = 0; i < entries.length && i < MAX_DGET_DOCS; i++) {
    var tok = cleanDocPath(entries[i] && entries[i].p);
    if (!tok) continue;
    var known = parseInt(entries[i] && entries[i].w, 10) || 0;
    var env = readDocEnvelope(cache, code, tok);
    if (!env) { docs.push({ p: tok, w: 0, missing: true }); continue; }
    if (env.w > known) {
      var body = actor.role === 'participant' && tok === 's' ? projectSessionForParticipant(env.d, actor.uid) : env.d;
      docs.push({ p: tok, w: env.w, d: body });
    } else docs.push({ p: tok, w: env.w });
  }
  return docs;
}

function docGet(cache, code, p, actor) {
  var entries = Array.isArray(p.ps) ? p.ps : [];
  if (!canReadDocEntries(entries, actor)) return out({ ok: false, e: 'denied' });
  if (!rateCheck(cache, actorRateKey(code, actor, 'dget'), PARTICIPANT_READS_PER_MIN)
      || !rateCheck(cache, 'r:' + code + ':read:all', SESSION_READS_PER_MIN)) {
    return out({ ok: false, e: 'rate-limited', retryAfterMs: 60000 });
  }
  return out({ ok: true, docs: collectDocEntries(cache, code, entries, actor), t: Date.now() });
}

function pathStarts(key, root) {
  return key === root || key.indexOf(root + '.') === 0;
}

function validWsMetricNumber(value, max) {
  return typeof value === 'number' && isFinite(value) && value >= 0 && value <= (max || 100000);
}
// Word Sounds live-progress / probe-result roster leaves (mirror of the shell
// validator in AlloFlowANTI.txt — keep both in sync): structured numbers + an
// activity id from a fixed code-defined set. Every string field is
// pattern-checked, so no free text can travel on these fields.
function validWsProgressValue(value) {
  if (value === null) return true;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  var allowed = { kind: 1, activity: 1, correct: 1, total: 1, goal: 1, done: 1, at: 1 };
  var keys = Object.keys(value);
  for (var i = 0; i < keys.length; i++) { if (!allowed[keys[i]]) return false; }
  if (value.kind != null && value.kind !== 'practice' && value.kind !== 'probe') return false;
  if (value.activity != null && !(typeof value.activity === 'string' && /^[a-z_]{1,32}$/.test(value.activity))) return false;
  if (value.done != null && typeof value.done !== 'boolean') return false;
  if (value.correct != null && !validWsMetricNumber(value.correct)) return false;
  if (value.total != null && !validWsMetricNumber(value.total)) return false;
  if (value.goal != null && !validWsMetricNumber(value.goal)) return false;
  if (value.at != null && !validWsMetricNumber(value.at, 999999999999999)) return false;
  return true;
}
function validWsProbeResultValue(value) {
  if (value === null) return true;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  var allowed = { activity: 1, correct: 1, total: 1, accuracy: 1, itemsPerMin: 1, elapsed: 1, grade: 1, form: 1, at: 1 };
  var keys = Object.keys(value);
  for (var i = 0; i < keys.length; i++) { if (!allowed[keys[i]]) return false; }
  if (value.activity != null && !(typeof value.activity === 'string' && /^[a-z_]{1,32}$/.test(value.activity))) return false;
  if (value.grade != null && !(typeof value.grade === 'string' && /^[A-Za-z0-9 -]{1,16}$/.test(value.grade))) return false;
  if (value.form != null && !(typeof value.form === 'string' && /^[A-Za-z0-9-]{1,8}$/.test(value.form))) return false;
  if (value.correct != null && !validWsMetricNumber(value.correct)) return false;
  if (value.total != null && !validWsMetricNumber(value.total)) return false;
  if (value.accuracy != null && !validWsMetricNumber(value.accuracy)) return false;
  if (value.itemsPerMin != null && !validWsMetricNumber(value.itemsPerMin)) return false;
  if (value.elapsed != null && !validWsMetricNumber(value.elapsed)) return false;
  if (value.at != null && !validWsMetricNumber(value.at, 999999999999999)) return false;
  return true;
}
function validParticipantRosterField(field, value, uid) {
  if (value && typeof value === 'object' && value.__op === 'deleteField') return field !== 'uid';
  if (field === 'uid') return value === uid;
  if (field === 'name') return typeof value === 'string' && value.length <= 40;
  if (field === 'joinedAt') return typeof value === 'string' && value.length <= 40;
  if (field === 'status') return value === 'active';
  if (field === 'xp') return typeof value === 'number' && isFinite(value) && value >= 0 && value <= 10000000;
  if (field === 'signal') return value === null || value === 'stuck' || value === 'slow' || value === 'repeat' || value === 'ready';
  if (field === 'signalAt' || field === 'viewingAt' || field === 'lastSeen') return value === null || (typeof value === 'number' && isFinite(value) && value >= 0); // Presence heartbeat (2026-07-16): lastSeen is a ms timestamp, validated like signalAt/viewingAt
  if (field === 'viewingResourceId') return value === null || (typeof value === 'string' && value.length <= 100);
  if (field === 'wsProgress') return validWsProgressValue(value);
  if (field === 'wsProbeResult') return validWsProbeResultValue(value);
  return false;
}
function participantCanPatchSession(updates, uid) {
  var keys = Object.keys(updates);
  var rosterRoot = 'roster.' + uid;
  var rosterFields = {
    uid: 1, name: 1, joinedAt: 1, status: 1, xp: 1,
    signal: 1, signalAt: 1, viewingResourceId: 1, viewingAt: 1,
    wsProgress: 1, wsProbeResult: 1, lastSeen: 1
  };
  var roots = [
    'quizState.allResponses.' + uid,
    'quizState.responses.' + uid,
    'quizState.teams.' + uid,
    'bridgeReactions.' + uid,
    'democracy.votes.' + uid,
    'escapeRoomState.teams.' + uid,
    'escapeRoomState.teamProgress'
  ];
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (pathStarts(key, rosterRoot)) {
      var rest = key === rosterRoot ? '' : key.slice(rosterRoot.length + 1);
      if (rest) {
        var field = rest.split('.')[0];
        if (!rosterFields[field] || rest.indexOf('.') !== -1 || !validParticipantRosterField(field, updates[key], uid)) return false;
      } else {
        var entry = updates[key];
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false;
        var entryKeys = Object.keys(entry);
        for (var e = 0; e < entryKeys.length; e++) {
          if (!rosterFields[entryKeys[e]] || !validParticipantRosterField(entryKeys[e], entry[entryKeys[e]], uid)) return false;
        }
      }
      continue;
    }
    var allowed = false;
    for (var j = 0; j < roots.length; j++) if (pathStarts(key, roots[j])) { allowed = true; break; }
    if (!allowed) return false;
  }
  return true;
}

function participantCanWritePeer(tok, actor, action, payload) {
  var peer = peerPathParts(tok);
  if (!peer || peer.uid !== actor.uid) return false;
  if (action === 'ddel') return true;
  var allowed = { offer: 1, codename: 1, createdAt: 1, expiresAt: 1, iceFromGuest: 1 };
  var body = action === 'dpatch' ? payload.u : payload.d;
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
  var keys = Object.keys(body);
  for (var i = 0; i < keys.length; i++) {
    var top = String(keys[i]).split('.')[0];
    if (!allowed[top]) return false;
  }
  return true;
}

function docWrite(cache, code, action, p, actor) {
  var tok = cleanDocPath(p.p);
  if (!tok) return out({ ok: false, e: 'bad-path' });
  var updates = p.u;
  if (action === 'dpatch' && !validatePatchUpdates(updates)) return out({ ok: false, e: 'bad-data' });
  if (action === 'dset' && !validateJsonValue(p.d === undefined ? null : p.d, 0)) return out({ ok: false, e: 'bad-data' });

  if (actor.role === 'participant') {
    if (tok === 's') {
      if (action !== 'dpatch' || !participantCanPatchSession(updates, actor.uid)) return out({ ok: false, e: 'denied' });
    } else if (!participantCanWritePeer(tok, actor, action, p)) {
      return out({ ok: false, e: 'denied' });
    }
  }

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return out({ ok: false, e: 'busy' });
  try {
    var limit = actor.role === 'teacher' ? RATE_LIMIT_MSGS : PARTICIPANT_WRITES_PER_MIN;
    if (!rateCheck(cache, actorRateKey(code, actor, 'doc'), limit)) {
      return out({ ok: false, e: 'rate-limited', retryAfterMs: 60000 });
    }
    var current = readDocEnvelope(cache, code, tok);
    if (p.xw !== undefined) {
      var actual = current ? (parseInt(current.w, 10) || 0) : 0;
      if ((parseInt(p.xw, 10) || 0) !== actual) return out({ ok: false, e: 'conflict', w: actual });
    }
    var peer = peerPathParts(tok);
    if (action === 'ddel') {
      cache.remove('d:' + code + ':' + tok);
      if (peer) bumpDocIndex(cache, code, peer.col, peer.uid, 0, true);
      return out({ ok: true, t: Date.now() });
    }
    if (action === 'dset') {
      var data = p.d === undefined ? null : p.d;
      if (p.merge && current && current.d && typeof current.d === 'object' && data && typeof data === 'object') {
        var mergedData = current.d;
        Object.keys(data).forEach(function(k) { mergedData[k] = data[k]; });
        data = mergedData;
      }
      var env = { w: nextDocVersion(cache, code), d: data };
      if (!writeDocEnvelope(cache, code, tok, env)) return out({ ok: false, e: 'too-big' });
      if (peer) bumpDocIndex(cache, code, peer.col, peer.uid, env.w, false);
      return out({ ok: true, w: env.w, t: Date.now() });
    }
    if (!current || !current.d || typeof current.d !== 'object') return out({ ok: false, e: 'no-doc' });
    var patched = applyDocUpdates(current.d, updates);
    var env2 = { w: nextDocVersion(cache, code), d: patched };
    if (!writeDocEnvelope(cache, code, tok, env2)) return out({ ok: false, e: 'too-big' });
    if (peer) bumpDocIndex(cache, code, peer.col, peer.uid, env2.w, false);
    var responseData = actor.role === 'participant' && tok === 's' ? projectSessionForParticipant(env2.d, actor.uid) : env2.d;
    return out({ ok: true, w: env2.w, d: responseData, t: Date.now() });
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

// v7 pack storage: manifests stay small and each download reads only one
// Drive chunk.
function findNamedPackFileV7(name) {
  var it = packFolder().getFilesByName(name);
  return it.hasNext() ? it.next() : null;
}

function packChunkNameV7(id, part) {
  return 'pack-' + id + '-' + part + '.txt';
}

function replacePackFileV7(name, body, mime) {
  var existing = findNamedPackFileV7(name);
  if (existing) existing.setContent(body);
  else packFolder().createFile(name, body, mime);
}

// v8: capability-authenticated student submissions. Live students use their
// signed participant credential; hosted-homework students use the same
// unguessable pack capability already present in their assignment QR. Files
// land in the teacher-owned mailbox Drive folder as ordinary JSON. Uploads
// are chunked so a complete portfolio does not hit Apps Script request/cache
// value limits. No endpoint lists or downloads submissions.
function putSubmission(cache, props, p, admin) {
  var sourceKind = '';
  var sourceId = '';
  var rateIdentity = '';
  if (p.c) {
    var code = String(p.c || '').toUpperCase();
    var secret = sessionSecretFor(code, cache, props);
    if (!secret) return out({ ok: false, e: 'no-session' });
    var actor = requestActor(p, code, secret, admin);
    if (!actor || actor.role !== 'participant') return out({ ok: false, e: 'denied' });
    sourceKind = 'live';
    sourceId = code;
    rateIdentity = actor.uid;
  } else {
    var packId = String(p.id || '');
    if (!/^PK-[0-9a-f-]{36}$/i.test(packId)) return out({ ok: false, e: 'bad-request' });
    var manifest = findPackFile(packId);
    if (!manifest) return out({ ok: false, e: 'no-pack' });
    var packMeta;
    try { packMeta = JSON.parse(manifest.getBlob().getDataAsString()); } catch (e) { return out({ ok: false, e: 'corrupt' }); }
    if (String(p.k || '') !== String(packMeta.k || '')) return out({ ok: false, e: 'denied' });
    if (packMeta.expiresAt && Date.parse(packMeta.expiresAt) <= Date.now()) return out({ ok: false, e: 'expired' });
    sourceKind = 'homework';
    sourceId = packId;
    rateIdentity = packId.slice(-12) + ':' + String(p.k || '').slice(0, 12);
  }
  if (!rateCheck(cache, 'r:submission:' + rateIdentity, 80)) {
    return out({ ok: false, e: 'rate-limited', retryAfterMs: 60000 });
  }
  var sid = String(p.sid || '');
  var part = parseInt(p.part, 10) || 0;
  var of = parseInt(p.of, 10) || 0;
  var data = String(p.data || '');
  if (!/^SUB-[0-9a-f-]{36}$/i.test(sid) || part < 1 || of < 1 || part > of || of > 200
      || !data || data.length > MAX_MSG_CHARS) return out({ ok: false, e: 'bad-part' });
  var receiptKey = 'sr:' + sourceKind + ':' + sourceId + ':' + sid;
  var priorReceipt = cache.get(receiptKey);
  if (priorReceipt) {
    try { return out(JSON.parse(priorReceipt)); } catch (receiptErr) { cache.remove(receiptKey); }
  }
  var cachePrefix = 'su:' + sid + ':';
  cache.put(cachePrefix + part, data, UPLOAD_TTL_SEC);
  if (part < of) return out({ ok: true, part: part });
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return out({ ok: false, e: 'busy' });
  try {
    var keys = [];
    for (var i = 1; i <= of; i++) keys.push(cachePrefix + i);
    var found = cache.getAll(keys);
    var pieces = [];
    for (var j = 1; j <= of; j++) {
      var piece = found[cachePrefix + j];
      if (!piece) return out({ ok: false, e: 'missing-part', part: j });
      pieces.push(piece);
    }
    var assembled = pieces.join('');
    if (assembled.length > MAX_PACK_CHARS) return out({ ok: false, e: 'too-big' });
    var payload;
    try { payload = JSON.parse(assembled); } catch (parseErr) { return out({ ok: false, e: 'bad-data' }); }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)
        || typeof payload.studentName !== 'string' || payload.studentName.length > 80
        || !validateJsonValue(payload, 0)) return out({ ok: false, e: 'bad-data' });
    payload.mailboxReceipt = { sourceKind: sourceKind, sourceId: sourceId, receivedAt: new Date().toISOString() };
    var safeName = String(payload.studentName || 'Student').replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 48) || 'Student';
    var stamp = Utilities.formatDate ? Utilities.formatDate(new Date(), 'UTC', 'yyyyMMdd-HHmmss') : String(Date.now());
    var filename = 'submission-' + safeName + '-' + stamp + '-' + sid.slice(-8) + '.json';
    packFolder().createFile(filename, JSON.stringify(payload, null, 2), 'application/json');
    for (var r = 1; r <= of; r++) cache.remove(cachePrefix + r);
    var receipt = { ok: true, filename: filename, sourceKind: sourceKind, receivedAt: payload.mailboxReceipt.receivedAt };
    cache.put(receiptKey, JSON.stringify(receipt), UPLOAD_TTL_SEC);
    return out(receipt);
  } finally { lock.releaseLock(); }
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

    var oldCount = 0;
    var oldManifest = findPackFile(id);
    if (oldManifest) {
      try { oldCount = parseInt(JSON.parse(oldManifest.getBlob().getDataAsString()).of, 10) || 0; } catch (e) {}
    }
    var downloadParts = Math.max(1, Math.ceil(assembled.length / GET_PART_CHARS));
    for (var d = 1; d <= downloadParts; d++) {
      replacePackFileV7(packChunkNameV7(id, d), assembled.slice((d - 1) * GET_PART_CHARS, d * GET_PART_CHARS), 'text/plain');
    }
    for (var stale = downloadParts + 1; stale <= oldCount; stale++) {
      var staleFile = findNamedPackFileV7(packChunkNameV7(id, stale));
      if (staleFile) staleFile.setTrashed(true);
    }
    replacePackFileV7('pack-' + id + '.json', JSON.stringify({
      v: 2, k: String(p.k), t: Date.now(), title: String(p.title || '').slice(0, 140),
      expiresAt: String(p.expiresAt || ''), chars: assembled.length, of: downloadParts
    }), 'application/json');
    for (var r = 1; r <= of; r++) cache.remove('u:' + id + ':' + r);
    return out({ ok: true, id: id, chars: assembled.length, of: downloadParts });
  } finally { lock.releaseLock(); }
}

function getPack(cache, p) {
  var id = String(p.id || '');
  if (!/^PK-[0-9a-f-]{36}$/i.test(id)) return out({ ok: false, e: 'bad-request' });
  if (!rateCheck(cache, 'r:pack:' + id.slice(-12) + ':' + String(p.k || '').slice(0, 12), PARTICIPANT_READS_PER_MIN)) {
    return out({ ok: false, e: 'rate-limited', retryAfterMs: 60000 });
  }
  var file = findPackFile(id);
  if (!file) return out({ ok: false, e: 'no-pack' });
  var body;
  try { body = JSON.parse(file.getBlob().getDataAsString()); } catch (err) { return out({ ok: false, e: 'corrupt' }); }
  if (String(p.k || '') !== String(body.k || '')) return out({ ok: false, e: 'denied' });
  if (body.expiresAt && Date.parse(body.expiresAt) <= Date.now()) return out({ ok: false, e: 'expired' });
  var part = Math.max(1, parseInt(p.part, 10) || 1);
  if (body.data !== undefined) {
    var legacy = String(body.data || '');
    var legacyOf = Math.max(1, Math.ceil(legacy.length / GET_PART_CHARS));
    if (part > legacyOf) return out({ ok: false, e: 'bad-part' });
    return out({ ok: true, id: id, title: String(body.title || ''), part: part, of: legacyOf,
      chars: legacy.length, data: legacy.slice((part - 1) * GET_PART_CHARS, part * GET_PART_CHARS) });
  }
  var chunkCount = Math.max(1, parseInt(body.of, 10) || 1);
  if (part > chunkCount) return out({ ok: false, e: 'bad-part' });
  var chunk = findNamedPackFileV7(packChunkNameV7(id, part));
  if (!chunk) return out({ ok: false, e: 'corrupt', part: part });
  return out({ ok: true, id: id, title: String(body.title || ''), part: part, of: chunkCount,
    chars: parseInt(body.chars, 10) || 0, data: chunk.getBlob().getDataAsString() });
}

function delPack(p) {
  var id = String(p.id || '');
  var file = findPackFile(id);
  var count = 0;
  if (file) {
    try { count = parseInt(JSON.parse(file.getBlob().getDataAsString()).of, 10) || 0; } catch (e) {}
    file.setTrashed(true);
  }
  for (var i = 1; i <= count; i++) {
    var chunk = findNamedPackFileV7(packChunkNameV7(id, i));
    if (chunk) chunk.setTrashed(true);
  }
  return out({ ok: true });
}