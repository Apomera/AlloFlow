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
 *    own roster/quiz-receipt/team/reaction/vote updates, and own signaling only.
 *
 * All requests are POSTed as text/plain JSON (avoids CORS preflight, which
 * Apps Script cannot answer). GET on the /exec URL shows a human status line.
 */

var VERSION = 12;
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
var MAX_ACTIVITY_PARTICIPANTS = 250;
var MAX_BOARD_ITEM_CHARS = 200;            // one question on a board
var MAX_BOARD_ITEMS_PER_STUDENT = 10;      // hard ceiling; per-board config clamps under it
var MAX_BOARD_ITEMS = 500;                 // absolute board ceiling; byte guard still applies
var MAX_ASSIGNMENT_ACTIVITIES = 8;
var ASYNC_ACTIVITY_CACHE_SEC = 5 * 60;
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
  // only their own roster/quiz-receipt/team/reaction/vote/signaling surfaces.
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
  if (a === 'extendpack') {
    if (!isAdmin) return out({ ok: false, e: 'not-admin' });
    return extendPack(cache, p);
  }
  if (a === 'clonepack') {
    if (!isAdmin) return out({ ok: false, e: 'not-admin' });
    return clonePack(cache, p);
  }
  if (a === 'putsubmission') return putSubmission(cache, props, p, admin);
  if (a === 'getpack') return getPack(cache, p);
  // Durable shared-assignment activities (v10+; plural manifests in v11).
  // These are deliberately
  // separate from the six-hour live-session document store: the teacher does
  // not need to keep a browser open while students complete hosted homework.
  if (a === 'joinactivity') return joinAssignmentActivity(cache, p, admin);
  if (a === 'activityupsert') return upsertAssignmentActivity(cache, p, admin);
  if (a === 'getactivitysummary') return getAssignmentActivitySummary(cache, p, admin);
  if (a === 'getactivityadmin') {
    if (!isAdmin) return out({ ok: false, e: 'not-admin' });
    return getAssignmentActivityAdmin(cache, p);
  }
  if (a === 'moderateactivity') {
    if (!isAdmin) return out({ ok: false, e: 'not-admin' });
    return moderateAssignmentActivity(cache, p);
  }
  if (a === 'delpack') {
    if (!isAdmin) return out({ ok: false, e: 'not-admin' });
    return delPack(cache, p);
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
    copy.quizState.responseReceipts = ownMap(copy.quizState.responseReceipts, uid);
    // Legacy sessions may still contain raw Firestore/mailbox fallbacks.
    // Participants can read only their own legacy entry; writes are denied
    // below so new clients cannot add answer content to the shared document.
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
function validLiveHostPresenceValue(value) {
  if (value === null) return true;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const allowed = { state: 1, heartbeatAt: 1, expiresAt: 1, leaseId: 1 };
  const keys = Object.keys(value);
  for (let i = 0; i < keys.length; i++) if (!allowed[keys[i]]) return false;
  if (value.state !== 'online') return false;
  if (!(typeof value.heartbeatAt === 'number' && isFinite(value.heartbeatAt) && value.heartbeatAt > 0)) return false;
  if (!(typeof value.expiresAt === 'number' && isFinite(value.expiresAt) && value.expiresAt > value.heartbeatAt)) return false;
  if (value.expiresAt - value.heartbeatAt > LIVE_HOST_LEASE_TTL_MS + 10000) return false;
  if (value.leaseId !== null && !(typeof value.leaseId === 'string' && /^[A-Za-z0-9_-]{8,120}$/.test(value.leaseId))) return false;
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
  if (field === 'signalAt' || field === 'viewingAt' || field === 'viewingResourceAt' || field === 'lastSeen') return value === null || (typeof value === 'number' && isFinite(value) && value >= 0); // Presence heartbeat (2026-07-16): lastSeen is a ms timestamp, validated like signalAt/viewingAt
  if (field === 'viewingResourceId') return value === null || (typeof value === 'string' && value.length <= 100);
  if (field === 'viewingResourceStatus') return value === null || value === 'loading' || value === 'ready' || value === 'failed';
  if (field === 'wsProgress') return validWsProgressValue(value);
  if (field === 'wsProbeResult') return validWsProbeResultValue(value);
  return false;
}
function validQuizResponseReceipt(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  var allowed = { activityId: 1, questionIndex: 1, questionIndexes: 1, submittedAt: 1, flow: 1 };
  var keys = Object.keys(value);
  if (keys.length !== 4 && keys.length !== 5) return false;
  for (var i = 0; i < keys.length; i++) if (!allowed[keys[i]]) return false;
  if (!(typeof value.activityId === 'string'
      && value.activityId.length >= 1
      && value.activityId.length <= 120)) return false;
  if (!(typeof value.questionIndex === 'number'
      && isFinite(value.questionIndex)
      && Math.floor(value.questionIndex) === value.questionIndex
      && value.questionIndex >= 0
      && value.questionIndex <= 9999)) return false;
  if (Object.prototype.hasOwnProperty.call(value, 'questionIndexes')) {
    if (!Array.isArray(value.questionIndexes)
        || value.questionIndexes.length < 1
        || value.questionIndexes.length > 128) return false;
    var seen = {};
    for (var q = 0; q < value.questionIndexes.length; q++) {
      var questionIndex = value.questionIndexes[q];
      if (!(typeof questionIndex === 'number'
          && isFinite(questionIndex)
          && Math.floor(questionIndex) === questionIndex
          && questionIndex >= 0
          && questionIndex <= 9999)) return false;
      if (seen[questionIndex]) return false;
      seen[questionIndex] = true;
    }
    if (!seen[value.questionIndex]) return false;
  }
  if (!(typeof value.submittedAt === 'number'
      && isFinite(value.submittedAt)
      && value.submittedAt > 0)) return false;
  return value.flow === 'assessment' || value.flow === 'presentation';
}
function validQuizTeam(value) {
  return value === 'Red' || value === 'Blue' || value === 'Green' || value === 'Yellow';
}
function participantCanPatchSession(updates, uid, sessionData) {
  var keys = Object.keys(updates);
  var rosterRoot = 'roster.' + uid;
  var receiptRoot = 'quizState.responseReceipts.' + uid;
  var teamRoot = 'quizState.teams.' + uid;
  var voteRoot = 'democracy.votes.' + uid;
  var rosterFields = {
    uid: 1, name: 1, joinedAt: 1, status: 1, xp: 1,
    signal: 1, signalAt: 1, viewingResourceId: 1, viewingResourceAt: 1, viewingResourceStatus: 1, viewingAt: 1,
    wsProgress: 1, wsProbeResult: 1, lastSeen: 1
  };
  var roots = [
    'bridgeReactions.' + uid,
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
    if (key === receiptRoot) {
      if (!validQuizResponseReceipt(updates[key])) return false;
      continue;
    }
    // Require one atomic fixed-shape receipt. Nested receipt patches cannot be
    // validated in isolation and raw answer fallbacks are intentionally absent
    // from the allowlist.
    if (pathStarts(key, receiptRoot)) return false;
    if (key === teamRoot) {
      if (!validQuizTeam(updates[key])) return false;
      continue;
    }
    if (key === voteRoot) {
      var democracy = sessionData && sessionData.democracy;
      var vote = updates[key];
      if (!democracy || democracy.isActive !== true || democracy.phase !== 'voting'
          || !Array.isArray(democracy.activeOptions) || typeof vote !== 'string'
          || vote.length < 1 || vote.length > 500 || democracy.activeOptions.indexOf(vote) === -1) return false;
      continue;
    }
    // Democracy votes are one fixed-option leaf; maps and nested patches are denied.
    if (pathStarts(key, voteRoot)) return false;
    // Team claims are one atomic enum leaf; maps and nested patches are denied.
    if (pathStarts(key, teamRoot)) return false;
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
      if (action !== 'dpatch') return out({ ok: false, e: 'denied' });
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
    if (actor.role === 'participant' && tok === 's'
        && !participantCanPatchSession(updates, actor.uid, current && current.d)) {
      return out({ ok: false, e: 'denied' });
    }
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

// v10+: durable, assignment-scoped collaboration sidecars. Word Cloud and
// Rating share the same pseudonymous response map and mailbox lifecycle; neither
// depends on a teacher browser being online.
function normalizeAssignmentRatingLabels(value, minValue, maxValue) {
  var source = value;
  if (typeof source === 'string') {
    try { source = JSON.parse(source); } catch (e) { source = []; }
  }
  var labels = [];
  for (var rating = minValue; rating <= maxValue; rating++) {
    var raw = Array.isArray(source)
      ? source[rating - minValue]
      : (source && typeof source === 'object' ? source[String(rating)] : '');
    labels.push(String(raw || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40));
  }
  return labels;
}

function normalizeAssignmentActivityConfig(value, expiresAt) {
  var source = value;
  if (typeof source === 'string') {
    try { source = JSON.parse(source); } catch (e) { return null; }
  }
  if (!source || typeof source !== 'object' || Array.isArray(source)) return null;
  var activityId = String(source.activityId || '');
  if (!/^AC-[0-9a-f-]{36}$/i.test(activityId)) return null;
  var prompt = String(source.prompt || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 240);
  if (!prompt) return null;
  var minParticipants = Math.max(3, Math.min(10, parseInt(source.minParticipants, 10) || 3));
  if (source.type === 'rating') {
    var minValue = source.minValue == null ? 1 : Number(source.minValue);
    var maxValue = source.maxValue == null ? 5 : Number(source.maxValue);
    if (!isFinite(minValue) || Math.floor(minValue) !== minValue || minValue < 1 || minValue > 9
        || !isFinite(maxValue) || Math.floor(maxValue) !== maxValue || maxValue < 2 || maxValue > 10
        || minValue >= maxValue) return null;
    return {
      v: 1,
      activityId: activityId,
      type: 'rating',
      delivery: 'shared_async',
      prompt: prompt,
      minParticipants: minParticipants,
      responseLimit: 1,
      minValue: minValue,
      maxValue: maxValue,
      labels: normalizeAssignmentRatingLabels(source.labels, minValue, maxValue),
      expiresAt: String(expiresAt || source.expiresAt || '')
    };
  }
  if (source.type === 'signup') {
    // Sign-up sheet: options carry a CAPACITY and claiming is exclusive.
    var suIdMode = String(source.identityMode || '');
    if (suIdMode !== 'anonymous' && suIdMode !== 'codename' && suIdMode !== 'real_name') return null;
    var suRaw = Array.isArray(source.options) ? source.options : [];
    var suOptions = [];
    for (var si = 0; si < suRaw.length && suOptions.length < MAX_POLL_OPTIONS; si++) {
      var suLabel = normalizeAssignmentBoardItemText(suRaw[si] && suRaw[si].label).slice(0, 80);
      if (!suLabel) continue;
      var cap = parseInt(suRaw[si] && suRaw[si].capacity, 10);
      if (!isFinite(cap) || cap < 1) cap = 1;
      cap = Math.min(cap, MAX_SIGNUP_CAPACITY);
      suOptions.push({ id: 'o' + (suOptions.length + 1), label: suLabel, capacity: cap });
    }
    if (!suOptions.length) return null;
    var perPerson = parseInt(source.maxPerPerson, 10);
    if (!isFinite(perPerson) || perPerson < 1) perPerson = 1;
    perPerson = Math.min(perPerson, suOptions.length);
    var suCloses = String(source.closesAt || expiresAt || source.expiresAt || '');
    return {
      v: 1,
      activityId: activityId,
      type: 'signup',
      delivery: 'shared_async',
      prompt: prompt,
      identityMode: suIdMode,
      options: suOptions,
      maxPerPerson: perPerson,
      // A sign-up sheet is USELESS if nobody can see what is left, so unlike
      // the other types remaining counts are public from the first claim.
      minParticipants: minParticipants,
      closesAt: suCloses,
      deleteAt: String(source.deleteAt || ''),
      expiresAt: suCloses
    };
  }
  if (source.type === 'availability') {
    // Scheduling poll (docs/availability_poll_spec.md). Option labels are the
    // organizer's OWN text: no date parsing and no timezones by design (spec §8).
    var idMode = String(source.identityMode || '');
    // No default. Identity is a privacy decision, and a default is the thing
    // nobody notices, so an unset or unknown mode is a rejected config.
    if (idMode !== 'anonymous' && idMode !== 'codename' && idMode !== 'real_name') return null;
    var rawOptions = Array.isArray(source.options) ? source.options : [];
    var options = [];
    for (var oi = 0; oi < rawOptions.length && options.length < MAX_POLL_OPTIONS; oi++) {
      var optLabel = normalizeAssignmentBoardItemText(rawOptions[oi] && rawOptions[oi].label).slice(0, 80);
      if (!optLabel) continue;
      // Ids are GENERATED, never taken from input, so no client can address a
      // slot that is not on the ballot.
      options.push({ id: 'o' + (options.length + 1), label: optLabel });
    }
    if (options.length < 2) return null;
    // Two dates (spec §4): closesAt stops collection, deleteAt erases rows.
    // An incoming expiresAt maps to closesAt for back-compatibility.
    var closesAt = String(source.closesAt || expiresAt || source.expiresAt || '');
    return {
      v: 1,
      activityId: activityId,
      type: 'availability',
      delivery: 'shared_async',
      prompt: prompt,
      identityMode: idMode,
      options: options,
      allowMaybe: source.allowMaybe !== false,
      multiSelect: source.multiSelect !== false,
      minParticipants: minParticipants,
      closesAt: closesAt,
      deleteAt: String(source.deleteAt || ''),
      expiresAt: closesAt
    };
  }
  if (source.type === 'question_board') {
    // Driving Questions Board (DRIVING_QUESTIONS_BOARD_SPEC.md §4). Shares the
    // pseudonymous response map and Drive-backed lifecycle with word_cloud, but
    // a student posts MANY questions across a unit rather than one term, so the
    // row holds an items array instead of a single text field (spec §2.1).
    var boardReveal = source.revealPolicy === 'teacher_review' ? 'teacher_review' : 'auto_publish';
    var perStudent = parseInt(source.itemsPerStudent, 10);
    if (!isFinite(perStudent)) perStudent = 5;
    perStudent = Math.max(1, Math.min(MAX_BOARD_ITEMS_PER_STUDENT, perStudent));
    var boardCap = parseInt(source.boardCap, 10);
    if (!isFinite(boardCap)) boardCap = 400;
    boardCap = Math.max(1, Math.min(MAX_BOARD_ITEMS, boardCap));
    return {
      v: 1,
      activityId: activityId,
      type: 'question_board',
      delivery: 'shared_async',
      prompt: prompt,
      revealPolicy: boardReveal,
      minParticipants: minParticipants,
      itemsPerStudent: perStudent,
      boardCap: boardCap,
      expiresAt: String(expiresAt || source.expiresAt || '')
    };
  }
  if (source.type !== 'word_cloud') return null;
  var revealPolicy = source.revealPolicy === 'auto_publish' ? 'auto_publish' : 'teacher_review';
  return {
    v: 1,
    activityId: activityId,
    type: 'word_cloud',
    delivery: 'shared_async',
    prompt: prompt,
    revealPolicy: revealPolicy,
    minParticipants: minParticipants,
    responseLimit: 1,
    expiresAt: String(expiresAt || source.expiresAt || '')
  };
}

function normalizeAssignmentActivityConfigs(value, expiresAt) {
  var source = value;
  if (typeof source === 'string') {
    try { source = JSON.parse(source); } catch (e) { return null; }
  }
  if (source === undefined || source === null) return [];
  var list = Array.isArray(source) ? source : [source];
  if (list.length > MAX_ASSIGNMENT_ACTIVITIES) return null;
  var seen = {};
  var normalized = [];
  for (var i = 0; i < list.length; i++) {
    var config = normalizeAssignmentActivityConfig(list[i], expiresAt);
    if (!config || seen[config.activityId]) return null;
    seen[config.activityId] = true;
    normalized.push(config);
  }
  return normalized;
}

function assignmentActivitiesFromManifest(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return [];
  if (manifest.activities !== undefined && manifest.activities !== null) {
    return normalizeAssignmentActivityConfigs(manifest.activities, manifest.expiresAt) || [];
  }
  // v10 manifests stored one normalized object under activity.
  return normalizeAssignmentActivityConfigs(manifest.activity, manifest.expiresAt) || [];
}

function assignmentActivityFileName(packId, activityId) {
  return 'activity-' + packId + '-' + activityId + '.json';
}

function findAssignmentActivityFile(packId, activityId) {
  return findNamedPackFileV7(assignmentActivityFileName(packId, activityId));
}

function readPackManifestForActivity(packId) {
  if (!/^PK-[0-9a-f-]{36}$/i.test(packId)) return { error: 'bad-request' };
  var file = findPackFile(packId);
  if (!file) return { error: 'no-pack' };
  var manifest;
  try { manifest = JSON.parse(file.getBlob().getDataAsString()); } catch (e) { return { error: 'corrupt' }; }
  if (manifest.expiresAt && Date.parse(manifest.expiresAt) <= Date.now()) return { error: 'expired' };
  return { manifest: manifest };
}

function assignmentActivityContext(p, requirePackSecret) {
  var packId = String(p.id || '');
  var activityId = String(p.aid || '');
  var found = readPackManifestForActivity(packId);
  if (found.error) return found;
  var manifest = found.manifest;
  if (requirePackSecret && String(p.k || '') !== String(manifest.k || '')) return { error: 'denied' };
  var activities = assignmentActivitiesFromManifest(manifest);
  var config = null;
  for (var i = 0; i < activities.length; i++) {
    if (activities[i].activityId === activityId) {
      config = activities[i];
      break;
    }
  }
  if (!config) return { error: 'no-activity' };
  return { packId: packId, activityId: activityId, manifest: manifest, config: config };
}

function assignmentActivityToken(admin, packId, activityId, uid, packSecret) {
  var bytes = Utilities.computeHmacSha256Signature(
    'assignment|' + packId + '|' + activityId + '|' + uid + '|' + packSecret,
    admin
  );
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/g, '');
}

function assignmentActivityActor(p, context, admin) {
  var uid = String(p.uid || '');
  var pt = String(p.pt || '');
  if (!/^ma-[A-Za-z0-9_-]{8,48}$/.test(uid) || !isToken(pt, 20, 96)) return null;
  var expected = assignmentActivityToken(
    admin,
    context.packId,
    context.activityId,
    uid,
    String(context.manifest.k || '')
  );
  return pt === expected ? { uid: uid } : null;
}

function newAssignmentActivityState(context) {
  return {
    v: 1,
    packId: context.packId,
    activityId: context.activityId,
    config: context.config,
    version: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    responses: {}
  };
}

function readAssignmentActivityState(context) {
  var file = findAssignmentActivityFile(context.packId, context.activityId);
  if (!file) return newAssignmentActivityState(context);
  try {
    var state = JSON.parse(file.getBlob().getDataAsString());
    if (!state || typeof state !== 'object' || Array.isArray(state)
        || !state.responses || typeof state.responses !== 'object' || Array.isArray(state.responses)) {
      return newAssignmentActivityState(context);
    }
    state.config = context.config;
    return state;
  } catch (e) {
    return newAssignmentActivityState(context);
  }
}

function writeAssignmentActivityState(state) {
  replacePackFileV7(
    assignmentActivityFileName(state.packId, state.activityId),
    JSON.stringify(state),
    'application/json'
  );
}

function normalizeAssignmentWordCloudTerm(value) {
  var term = value == null ? '' : String(value);
  try { if (typeof term.normalize === 'function') term = term.normalize('NFKC'); } catch (e) {}
  term = term.replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim();
  term = term.replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, '').trim();
  if (term.length > 60) term = term.slice(0, 60).trim();
  if (!term || term.split(/\s+/).length > 10) return '';
  return term;
}

function normalizeAssignmentBoardItemText(value) {
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_BOARD_ITEM_CHARS);
}

// Board visibility. This is the server-side half of the parity contract in
// question_board_contract_module.js: Firestore will reach the same answer by
// gating whole documents, this reaches it by filtering before sending. The
// two must agree item-for-item (spec §10.2), which the shared conformance
// suite in tests/question_board_mailbox_adapter.test.js checks.
function visibleBoardItemsFor(state, uid, isHost) {
  var responses = state.responses && typeof state.responses === 'object' ? state.responses : {};
  var authors = Object.keys(responses).filter(function(k) {
    var row = responses[k];
    return row && row.items && row.items.length;
  });
  var floorMet = authors.length >= (parseInt(state.config.minParticipants, 10) || 3);
  var outItems = [];
  var stamp = function(author, item) {
    var row = responses[author] || {};
    var copy = { uid: author };
    Object.keys(item).forEach(function(k) { copy[k] = item[k]; });
    copy.uid = author;
    if (row.name) copy.displayName = row.name;
    return copy;
  };
  authors.forEach(function(author) {
    (responses[author].items || []).forEach(function(item) {
      if (isHost) { outItems.push(stamp(author, item)); return; }
      if (author === uid) { outItems.push(stamp(author, item)); return; }
      if (!floorMet) return;
      if (item.status === 'approved') outItems.push(stamp(author, item));
    });
  });
  return outItems;
}

function assignmentTermNeedsReview(term) {
  var lower = String(term || '').toLowerCase();
  // This is intentionally a narrow automatic gate, not a claim of complete
  // content moderation. URLs, contact details, likely phone numbers, and a
  // small obvious-profanity set stay held for teacher review.
  if (/@|https?:|www\.|\.com\b|\.net\b|\.org\b/.test(lower)) return true;
  if ((lower.match(/\d/g) || []).length >= 7) return true;
  var compact = lower.replace(/[^a-z0-9]+/g, '');
  var blocked = ['fuck', 'shit', 'bitch', 'cunt', 'nigger', 'faggot'];
  for (var i = 0; i < blocked.length; i++) if (compact.indexOf(blocked[i]) !== -1) return true;
  return false;
}

// Board summary is per-actor, because what a participant may see depends on
// who they are. word_cloud/rating summaries are actor-independent, so they
// keep the existing shared path.
function buildBoardSummaryFor(state, uid, isHost) {
  var responses = state.responses && typeof state.responses === 'object' ? state.responses : {};
  var authors = Object.keys(responses).filter(function(k) {
    var row = responses[k];
    return row && row.items && row.items.length;
  });
  return {
    ok: true,
    activityId: state.activityId,
    type: 'question_board',
    prompt: state.config.prompt,
    revealPolicy: state.config.revealPolicy,
    minParticipants: state.config.minParticipants,
    itemsPerStudent: state.config.itemsPerStudent,
    // The client needs both ceilings and the close date to explain a refusal
    // BEFORE a student writes a question they cannot post.
    boardCap: state.config.boardCap,
    expiresAt: state.config.expiresAt,
    participantCount: authors.length,
    revealed: authors.length >= (parseInt(state.config.minParticipants, 10) || 3),
    version: parseInt(state.version, 10) || 0,
    updatedAt: parseInt(state.updatedAt, 10) || 0,
    items: visibleBoardItemsFor(state, uid, isHost)
  };
}

// Availability poll helpers (docs/availability_poll_spec.md).
var MAX_POLL_OPTIONS = 50;

// Marks arrive as a map of optionId -> yes|no|maybe. Unknown ids are DROPPED
// rather than rejected, so a client holding a stale ballot can still record
// the slots that do still exist.
function normalizeAvailabilityPicks(value, config) {
  var source = value;
  if (typeof source === 'string') { try { source = JSON.parse(source); } catch (e) { return null; } }
  if (!source || typeof source !== 'object' || Array.isArray(source)) return null;
  var allowed = {};
  for (var ai = 0; ai < config.options.length; ai++) allowed[config.options[ai].id] = true;
  var picks = {};
  var yesCount = 0;
  var keys = Object.keys(source);
  for (var ki = 0; ki < keys.length; ki++) {
    var id = keys[ki];
    if (!allowed[id]) continue;
    var mark = String(source[id] || '');
    if (mark === 'maybe' && !config.allowMaybe) mark = 'yes';
    if (mark !== 'yes' && mark !== 'no' && mark !== 'maybe') continue;
    picks[id] = mark;
    if (mark === 'yes') yesCount++;
  }
  if (!Object.keys(picks).length) return null;
  if (!config.multiSelect && yesCount > 1) return null;
  return picks;
}

// Per-option counts. Materialised into state.tally at deleteAt so the decision
// survives the erasure of the rows it came from (spec §4).
function computeAvailabilityTally(config, responses) {
  var rows = responses && typeof responses === 'object' ? responses : {};
  var byId = {};
  for (var oi = 0; oi < config.options.length; oi++) {
    byId[config.options[oi].id] = { id: config.options[oi].id, label: config.options[oi].label, yes: 0, maybe: 0, no: 0 };
  }
  var uids = Object.keys(rows);
  var participantCount = 0;
  for (var ui = 0; ui < uids.length; ui++) {
    var picks = rows[uids[ui]] && rows[uids[ui]].picks;
    if (!picks || typeof picks !== 'object') continue;
    participantCount++;
    var pk = Object.keys(picks);
    for (var pi = 0; pi < pk.length; pi++) {
      var slot = byId[pk[pi]];
      if (!slot) continue;
      var mark = picks[pk[pi]];
      if (mark === 'yes') slot.yes++;
      else if (mark === 'maybe') slot.maybe++;
      else if (mark === 'no') slot.no++;
    }
  }
  var options = [];
  for (var oj = 0; oj < config.options.length; oj++) options.push(byId[config.options[oj].id]);
  return { options: options, participantCount: participantCount };
}

// Best option: most yes, with maybe ONLY as a tiebreak. A maybe is never
// counted as a yes, and a tie is returned as a tie rather than silently
// resolved to whichever slot happens to be first.
function availabilityBestOptionIds(tally) {
  var best = [];
  var bestYes = -1;
  var bestMaybe = -1;
  for (var i = 0; i < tally.options.length; i++) {
    var opt = tally.options[i];
    if (opt.yes > bestYes || (opt.yes === bestYes && opt.maybe > bestMaybe)) {
      bestYes = opt.yes;
      bestMaybe = opt.maybe;
      best = [opt.id];
    } else if (opt.yes === bestYes && opt.maybe === bestMaybe) {
      best.push(opt.id);
    }
  }
  return bestYes > 0 ? best : [];
}

// Retention (spec §4). Past deleteAt the rows are erased and the tally is kept.
// Materialising here is the whole point: after this runs there are no rows left
// to recompute a tally from.
function applyAvailabilityRetention(state) {
  if (!state || !state.config || state.config.type !== 'availability') return false;
  var deleteAt = Date.parse(state.config.deleteAt);
  if (!isFinite(deleteAt) || Date.now() < deleteAt) return false;
  var responses = state.responses && typeof state.responses === 'object' ? state.responses : {};
  if (!Object.keys(responses).length && state.tally) return false;
  if (!state.tally) state.tally = computeAvailabilityTally(state.config, responses);
  state.responses = {};
  return true;
}

// ── Sign-up sheet helpers ────────────────────────────────────────────────
var MAX_SIGNUP_CAPACITY = 500;

function signupCapacityFor(config, optionId) {
  for (var i = 0; i < config.options.length; i++) {
    if (config.options[i].id === optionId) return parseInt(config.options[i].capacity, 10) || 1;
  }
  return 0;
}

// Claims held by everyone EXCEPT one actor. Excluding them is what lets a
// person resubmit or change their mind without competing against their own
// existing claim for the last seat.
function signupTakenCounts(config, responses, exceptUid) {
  var counts = {};
  for (var i = 0; i < config.options.length; i++) counts[config.options[i].id] = 0;
  var rows = responses && typeof responses === 'object' ? responses : {};
  Object.keys(rows).forEach(function (uid) {
    if (uid === exceptUid) return;
    var claims = rows[uid] && rows[uid].claims;
    if (!Array.isArray(claims)) return;
    claims.forEach(function (id) { if (counts[id] != null) counts[id]++; });
  });
  return counts;
}

// Deduped, known ids only, capped at what one person may hold.
function normalizeSignupClaims(value, config) {
  var source = value;
  if (typeof source === 'string') { try { source = JSON.parse(source); } catch (e) { return null; } }
  if (!Array.isArray(source)) return null;
  var allowed = {};
  for (var i = 0; i < config.options.length; i++) allowed[config.options[i].id] = true;
  var out = [];
  for (var k = 0; k < source.length; k++) {
    var id = String(source[k] || '');
    if (!allowed[id] || out.indexOf(id) >= 0) continue;
    out.push(id);
  }
  // An empty array is legitimate: it is how somebody RELEASES a slot they can
  // no longer make, which matters more here than in a poll.
  if (out.length > (parseInt(config.maxPerPerson, 10) || 1)) return null;
  return out;
}

function buildSignupSummary(state, isHost) {
  var config = state.config;
  applySignupRetention(state);
  var responses = state.responses && typeof state.responses === 'object' ? state.responses : {};
  var counts = state.tally || signupTakenCounts(config, responses, null);
  var slots = [];
  var claimants = {};
  Object.keys(responses).forEach(function (uid) {
    var claims = responses[uid] && responses[uid].claims;
    if (!Array.isArray(claims)) return;
    claims.forEach(function (id) {
      if (!claimants[id]) claimants[id] = [];
      claimants[id].push({
        label: config.identityMode === 'real_name' ? String(responses[uid].name || '') : availabilityCodename(uid)
      });
    });
  });
  for (var i = 0; i < config.options.length; i++) {
    var opt = config.options[i];
    var taken = parseInt(counts[opt.id], 10) || 0;
    slots.push({
      id: opt.id,
      label: opt.label,
      capacity: opt.capacity,
      taken: taken,
      remaining: Math.max(0, opt.capacity - taken),
      // Names attach to a SLOT here rather than a row, because "who has 3:15"
      // is the question a sign-up sheet exists to answer. Anonymous mode still
      // withholds them from everyone, including the organizer.
      who: (isHost && config.identityMode !== 'anonymous') ? (claimants[opt.id] || []) : []
    });
  }
  return {
    ok: true,
    activityId: state.activityId,
    type: 'signup',
    prompt: config.prompt,
    identityMode: config.identityMode,
    maxPerPerson: config.maxPerPerson,
    closesAt: config.closesAt,
    deleteAt: config.deleteAt,
    closed: availabilityIsClosed(config),
    slots: slots,
    version: parseInt(state.version, 10) || 0,
    updatedAt: parseInt(state.updatedAt, 10) || 0
  };
}

// Same bargain as the poll: the counts outlive the people. After deleteAt the
// organizer still knows every slot filled, and no longer knows who took them.
function applySignupRetention(state) {
  if (!state || !state.config || state.config.type !== 'signup') return false;
  var deleteAt = Date.parse(state.config.deleteAt);
  if (!isFinite(deleteAt) || Date.now() < deleteAt) return false;
  var responses = state.responses && typeof state.responses === 'object' ? state.responses : {};
  if (!Object.keys(responses).length && state.tally) return false;
  if (!state.tally) state.tally = signupTakenCounts(state.config, responses, null);
  state.responses = {};
  return true;
}

function availabilityIsClosed(config) {
  var closesAt = Date.parse(config && config.closesAt);
  return isFinite(closesAt) && Date.now() >= closesAt;
}

// Stable per respondent, derived from the uid the deployment already issued, so
// someone who returns keeps their codename and the tally does not count them
// twice (spec §3).
var AVAILABILITY_CODENAME_A = ['Amber', 'Bright', 'Calm', 'Deep', 'Swift', 'Quiet', 'Bold', 'Clear'];
var AVAILABILITY_CODENAME_B = ['Fox', 'Heron', 'Cedar', 'River', 'Falcon', 'Willow', 'Otter', 'Birch'];
function availabilityCodename(uid) {
  var hash = 0;
  var text = String(uid || '');
  for (var i = 0; i < text.length; i++) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  hash = Math.abs(hash);
  return AVAILABILITY_CODENAME_A[hash % AVAILABILITY_CODENAME_A.length]
    + ' ' + AVAILABILITY_CODENAME_B[(hash >> 3) % AVAILABILITY_CODENAME_B.length];
}

// Identity mode is enforced HERE rather than in the UI. If this function can
// hand back rows in anonymous mode then the mode is a promise the data does not
// keep, whatever the screen says (spec §3).
function buildAvailabilitySummary(state, isHost) {
  var config = state.config;
  applyAvailabilityRetention(state);
  var responses = state.responses && typeof state.responses === 'object' ? state.responses : {};
  var tally = state.tally || computeAvailabilityTally(config, responses);
  var participantCount = tally.participantCount;
  var revealed = participantCount >= (parseInt(config.minParticipants, 10) || 3);
  // minParticipants guards the TALLY too, and in anonymous mode it guards it
  // from the organizer as well: with a handful of respondents a bare count can
  // still identify who said what.
  var showTally = config.identityMode === 'anonymous' ? revealed : (isHost || revealed);
  var rows = [];
  if (isHost && config.identityMode !== 'anonymous') {
    var uids = Object.keys(responses);
    for (var i = 0; i < uids.length; i++) {
      var row = responses[uids[i]];
      if (!row || !row.picks) continue;
      rows.push({
        label: config.identityMode === 'real_name' ? String(row.name || '') : availabilityCodename(uids[i]),
        picks: row.picks,
        updatedAt: parseInt(row.updatedAt, 10) || 0
      });
    }
  }
  return {
    ok: true,
    activityId: state.activityId,
    type: 'availability',
    prompt: config.prompt,
    identityMode: config.identityMode,
    options: config.options,
    allowMaybe: config.allowMaybe,
    multiSelect: config.multiSelect,
    minParticipants: config.minParticipants,
    closesAt: config.closesAt,
    deleteAt: config.deleteAt,
    closed: availabilityIsClosed(config),
    participantCount: participantCount,
    revealed: revealed,
    tally: showTally ? tally.options : [],
    best: showTally ? availabilityBestOptionIds(tally) : [],
    rows: rows,
    version: parseInt(state.version, 10) || 0,
    updatedAt: parseInt(state.updatedAt, 10) || 0
  };
}

function buildAssignmentActivityPublicSummary(state) {
  var responses = state.responses && typeof state.responses === 'object' ? state.responses : {};
  if (state.config.type === 'signup') return buildSignupSummary(state, false);
  if (state.config.type === 'availability') return buildAvailabilitySummary(state, false);
  if (state.config.type === 'rating') {
    var counts = {};
    var participantCount = 0;
    for (var rating = state.config.minValue; rating <= state.config.maxValue; rating++) counts[rating] = 0;
    Object.keys(responses).forEach(function(uid) {
      var row = responses[uid];
      var value = row && row.value;
      if (typeof value !== 'number' || !isFinite(value) || Math.floor(value) !== value
          || value < state.config.minValue || value > state.config.maxValue) return;
      counts[value] += 1;
      participantCount += 1;
    });
    var revealed = participantCount >= state.config.minParticipants;
    var distribution = revealed ? Object.keys(counts).map(function(valueKey) {
      var value = parseInt(valueKey, 10);
      return {
        value: value,
        label: state.config.labels[value - state.config.minValue] || String(value),
        count: counts[value],
        percent: participantCount ? Math.round((counts[value] / participantCount) * 100) : 0
      };
    }) : [];
    return {
      ok: true,
      activityId: state.activityId,
      type: 'rating',
      prompt: state.config.prompt,
      minParticipants: state.config.minParticipants,
      participantCount: participantCount,
      revealed: revealed,
      version: parseInt(state.version, 10) || 0,
      updatedAt: parseInt(state.updatedAt, 10) || 0,
      minValue: state.config.minValue,
      maxValue: state.config.maxValue,
      labels: state.config.labels,
      distribution: distribution
    };
  }
  // The public threshold must describe the same approved contributor set that
  // can appear in `terms`. Counting pending/hidden rows here could reveal a
  // single approved learner's term once unrelated held responses brought the
  // total over the anonymity floor.
  var participantCount = 0;
  var buckets = {};
  Object.keys(responses).forEach(function(uid) {
    var row = responses[uid];
    if (!row || row.status !== 'approved') return;
    var label = normalizeAssignmentWordCloudTerm(row.text);
    var key = label.toLowerCase();
    if (!key) return;
    participantCount += 1;
    if (!buckets[key]) buckets[key] = { value: key, label: label, count: 0 };
    buckets[key].count += 1;
  });
  var revealed = participantCount >= state.config.minParticipants;
  var terms = revealed ? Object.keys(buckets).map(function(key) {
    return buckets[key];
  }).sort(function(a, b) {
    return b.count - a.count || a.label.localeCompare(b.label);
  }).slice(0, 100) : [];
  return {
    ok: true,
    activityId: state.activityId,
    type: 'word_cloud',
    prompt: state.config.prompt,
    revealPolicy: state.config.revealPolicy,
    minParticipants: state.config.minParticipants,
    participantCount: participantCount,
    revealed: revealed,
    version: parseInt(state.version, 10) || 0,
    updatedAt: parseInt(state.updatedAt, 10) || 0,
    terms: terms
  };
}

function cacheAssignmentActivitySummary(cache, state) {
  var publicKey = 'as:' + state.packId.slice(-12) + ':' + state.activityId.slice(-12);
  cache.put(publicKey, JSON.stringify(buildAssignmentActivityPublicSummary(state)), ASYNC_ACTIVITY_CACHE_SEC);
  Object.keys(state.responses || {}).forEach(function(uid) {
    cache.put(publicKey + ':o:' + uid.slice(-24), JSON.stringify(state.responses[uid]), ASYNC_ACTIVITY_CACHE_SEC);
  });
}

function assignmentActivitySummaryFor(cache, context, uid) {
  if (context.config.type === 'question_board') {
    // A board summary depends on WHO is asking, so it cannot come from the
    // shared public-summary cache — that cache is actor-independent and would
    // hand one student another student's view of the board.
    var boardState = readAssignmentActivityState(context);
    var boardSummary = buildBoardSummaryFor(boardState, uid, false);
    boardSummary.own = boardState.responses[uid] || null;
    return boardSummary;
  }
  var publicKey = 'as:' + context.packId.slice(-12) + ':' + context.activityId.slice(-12);
  var publicRaw = cache.get(publicKey);
  var ownRaw = cache.get(publicKey + ':o:' + uid.slice(-24));
  if (publicRaw && ownRaw) {
    try {
      var cached = JSON.parse(publicRaw);
      cached.own = JSON.parse(ownRaw);
      return cached;
    } catch (e) {}
  }
  var state = readAssignmentActivityState(context);
  cacheAssignmentActivitySummary(cache, state);
  var summary = buildAssignmentActivityPublicSummary(state);
  summary.own = state.responses[uid] || null;
  return summary;
}

function joinAssignmentActivity(cache, p, admin) {
  var context = assignmentActivityContext(p, true);
  if (context.error) return out({ ok: false, e: context.error });
  if (!rateCheck(cache, 'r:aj:' + context.packId.slice(-12), 120)) {
    return out({ ok: false, e: 'rate-limited', retryAfterMs: 60000 });
  }
  var uid = 'ma-' + Utilities.getUuid().replace(/-/g, '').slice(-20);
  return out({
    ok: true,
    uid: uid,
    pt: assignmentActivityToken(admin, context.packId, context.activityId, uid, String(context.manifest.k || '')),
    activity: context.config,
    t: Date.now()
  });
}

function getAssignmentActivitySummary(cache, p, admin) {
  var context = assignmentActivityContext(p, false);
  if (context.error) return out({ ok: false, e: context.error });
  var actor = assignmentActivityActor(p, context, admin);
  if (!actor) return out({ ok: false, e: 'denied' });
  if (!rateCheck(cache, 'r:ar:' + context.packId.slice(-12) + ':' + actor.uid.slice(-16), 30)) {
    return out({ ok: false, e: 'rate-limited', retryAfterMs: 60000 });
  }
  return out(assignmentActivitySummaryFor(cache, context, actor.uid));
}

function upsertAssignmentActivity(cache, p, admin) {
  var context = assignmentActivityContext(p, false);
  if (context.error) return out({ ok: false, e: context.error });
  var actor = assignmentActivityActor(p, context, admin);
  if (!actor) return out({ ok: false, e: 'denied' });
  if (!rateCheck(cache, 'r:aw:' + context.packId.slice(-12) + ':' + actor.uid.slice(-16), 20)) {
    return out({ ok: false, e: 'rate-limited', retryAfterMs: 60000 });
  }
  var term = '';
  var ratingValue = null;
  var boardText = '';
  var pollPicks = null;
  var signupClaims = null;
  if (context.config.type === 'question_board') {
    boardText = normalizeAssignmentBoardItemText(p.term);
    if (!boardText) return out({ ok: false, e: 'bad-term' });
  } else if (context.config.type === 'signup') {
    if (availabilityIsClosed(context.config)) return out({ ok: false, e: 'poll-closed' });
    signupClaims = normalizeSignupClaims(p.claims, context.config);
    if (!signupClaims) return out({ ok: false, e: 'bad-claims' });
  } else if (context.config.type === 'availability') {
    if (availabilityIsClosed(context.config)) return out({ ok: false, e: 'poll-closed' });
    pollPicks = normalizeAvailabilityPicks(p.picks, context.config);
    if (!pollPicks) return out({ ok: false, e: 'bad-picks' });
  } else if (context.config.type === 'rating') {
    ratingValue = p.value;
    if (typeof ratingValue !== 'number' || !isFinite(ratingValue) || Math.floor(ratingValue) !== ratingValue
        || ratingValue < context.config.minValue || ratingValue > context.config.maxValue) {
      return out({ ok: false, e: 'bad-rating' });
    }
  } else {
    term = normalizeAssignmentWordCloudTerm(p.term);
    if (!term) return out({ ok: false, e: 'bad-term' });
  }
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return out({ ok: false, e: 'busy' });
  try {
    var state = readAssignmentActivityState(context);
    var responses = state.responses || {};
    if (!responses[actor.uid] && Object.keys(responses).length >= MAX_ACTIVITY_PARTICIPANTS) {
      return out({ ok: false, e: 'activity-full' });
    }
    var previous = responses[actor.uid];
    if (context.config.type === 'question_board') {
      // A board row ACCUMULATES items; it does not replace like word_cloud.
      var row = previous && previous.items ? previous : { items: [] };
      if (row.items.length >= context.config.itemsPerStudent) {
        return out({ ok: false, e: 'item-cap' });
      }
      var totalItems = 0;
      Object.keys(responses).forEach(function(k) {
        totalItems += (responses[k] && responses[k].items ? responses[k].items.length : 0);
      });
      if (totalItems >= context.config.boardCap) return out({ ok: false, e: 'board-full' });
      var itemStatus = context.config.revealPolicy === 'auto_publish'
        && !assignmentTermNeedsReview(boardText) ? 'approved' : 'pending';
      row.items.push({
        // The author's uid is part of the id because the timestamp is not
        // enough: two students posting their first question in the same
        // millisecond produced the SAME id, which collides as a React key and
        // makes two questions indistinguishable to anything that looks items up
        // by id alone. uid is unique per participant and the index is unique
        // within a row, so the pair is unique across the board.
        id: 'Q-' + actor.uid.slice(-8) + '-' + Date.now().toString(36) + '-' + row.items.length,
        text: boardText,
        status: itemStatus,
        answered: false,
        createdAt: Date.now()
      });
      var claimedName = normalizeAssignmentBoardItemText(p.nm).slice(0, 40);
      if (claimedName) row.name = claimedName;
      row.updatedAt = Date.now();
      responses[actor.uid] = row;
      // Byte guard BEFORE the write: the 85KB ceiling is the dominant design
      // constraint (spec §3) and a board must refuse rather than truncate.
      var probe = JSON.stringify(responses);
      if (probe.length > MAX_DOC_CHARS) {
        row.items.pop();
        return out({ ok: false, e: 'board-bytes' });
      }
    } else if (context.config.type === 'signup') {
      // The whole point of doing this here: we are inside LockService, so the
      // seat count cannot change between the check and the write. Checking on
      // arrival instead would double-book the last slot under any real load.
      var takenByOthers = signupTakenCounts(context.config, responses, actor.uid);
      var fullSlots = [];
      for (var ci = 0; ci < signupClaims.length; ci++) {
        var claimId = signupClaims[ci];
        if (takenByOthers[claimId] >= signupCapacityFor(context.config, claimId)) fullSlots.push(claimId);
      }
      // Refuse the WHOLE submission and name the full slots, so the client can
      // say which one went rather than silently dropping part of a person's
      // choice.
      if (fullSlots.length) return out({ ok: false, e: 'slot-full', full: fullSlots });
      var suRow = { claims: signupClaims, updatedAt: Date.now() };
      if (context.config.identityMode === 'real_name') {
        var suName = normalizeAssignmentBoardItemText(p.nm).slice(0, 40);
        if (suName) suRow.name = suName;
      }
      responses[actor.uid] = suRow;
    } else if (context.config.type === 'availability') {
      var pollRow = { picks: pollPicks, updatedAt: Date.now() };
      // A name is stored ONLY in real_name mode. If the row carried one in the
      // other modes the mode would be a lie, whatever the UI shows.
      if (context.config.identityMode === 'real_name') {
        var pollName = normalizeAssignmentBoardItemText(p.nm).slice(0, 40);
        if (pollName) pollRow.name = pollName;
      }
      responses[actor.uid] = pollRow;
    } else if (context.config.type === 'rating') {
      // One map row per pseudonymous actor. A retry or deliberate change
      // replaces that row rather than inflating the aggregate.
      responses[actor.uid] = {
        value: ratingValue,
        status: 'recorded',
        updatedAt: Date.now()
      };
    } else {
      var status = context.config.revealPolicy === 'auto_publish' && !assignmentTermNeedsReview(term)
        ? 'approved'
        : 'pending';
      // A student edit cannot silently undo an explicit teacher hide.
      if (previous && previous.status === 'hidden') status = 'pending';
      responses[actor.uid] = {
        text: term,
        status: status,
        updatedAt: Date.now()
      };
    }
    state.responses = responses;
    state.version = (parseInt(state.version, 10) || 0) + 1;
    state.updatedAt = Date.now();
    writeAssignmentActivityState(state);
    cacheAssignmentActivitySummary(cache, state);
    if (context.config.type === 'signup') {
      var claimed = buildSignupSummary(state, false);
      claimed.own = responses[actor.uid] || null;
      return out(claimed);
    }
    if (context.config.type === 'availability') {
      var voted = buildAvailabilitySummary(state, false);
      voted.own = responses[actor.uid] || null;
      return out(voted);
    }
    if (context.config.type === 'question_board') {
      var posted = buildBoardSummaryFor(state, actor.uid, false);
      posted.own = responses[actor.uid];
      return out(posted);
    }
    var summary = buildAssignmentActivityPublicSummary(state);
    summary.own = responses[actor.uid];
    return out(summary);
  } finally { lock.releaseLock(); }
}

function getAssignmentActivityAdmin(cache, p) {
  var context = assignmentActivityContext(p, false);
  if (context.error) return out({ ok: false, e: context.error });
  if (!rateCheck(cache, 'r:aa:' + context.packId.slice(-12), 120)) {
    return out({ ok: false, e: 'rate-limited', retryAfterMs: 60000 });
  }
  var state = readAssignmentActivityState(context);
  if (context.config.type === 'signup') return out(buildSignupSummary(state, true));
  if (context.config.type === 'availability') {
    // The organizer is the audience for a scheduling poll, so rows come back
    // here. buildAvailabilitySummary still withholds them in anonymous mode.
    return out(buildAvailabilitySummary(state, true));
  }
  if (context.config.type === 'question_board') {
    // The host sees every item regardless of status — that is the whole point
    // of a review queue — and moderates per ITEM, so rows are the wrong unit.
    return out(buildBoardSummaryFor(state, '', true));
  }
  var summary = buildAssignmentActivityPublicSummary(state);
  // Ratings are aggregate-only: even the teacher endpoint does not enumerate
  // pseudonymous actors or expose an individual rating.
  summary.responses = context.config.type === 'rating' ? [] : Object.keys(state.responses || {}).map(function(uid) {
    var row = state.responses[uid] || {};
    return {
      uid: uid,
      text: String(row.text || '').slice(0, 60),
      status: row.status === 'approved' || row.status === 'hidden' ? row.status : 'pending',
      updatedAt: parseInt(row.updatedAt, 10) || 0
    };
  }).sort(function(a, b) { return b.updatedAt - a.updatedAt; });
  return out(summary);
}

// Per-ITEM moderation for boards, and the teacher-only 'answered' mark that a
// sticky note cannot do (spec §2.3). Host-only by construction: this is only
// reachable from the admin-authenticated moderate endpoint.
function moderateAssignmentBoardItem(cache, p, context) {
  var uid = String(p.uid || '');
  var itemId = String(p.itemId || '');
  var status = String(p.status || '');
  var wantsAnswered = (p.answered === true || p.answered === false);
  if (!/^ma-[A-Za-z0-9_-]{8,48}$/.test(uid) || !itemId) return out({ ok: false, e: 'bad-request' });
  if (!wantsAnswered && status !== 'pending' && status !== 'approved' && status !== 'hidden') {
    return out({ ok: false, e: 'bad-request' });
  }
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return out({ ok: false, e: 'busy' });
  try {
    var state = readAssignmentActivityState(context);
    var row = state.responses && state.responses[uid];
    if (!row || !row.items) return out({ ok: false, e: 'no-response' });
    var target = null;
    row.items.forEach(function(item) { if (item.id === itemId) target = item; });
    if (!target) return out({ ok: false, e: 'no-response' });
    if (wantsAnswered) {
      target.answered = p.answered === true
        ? { at: Date.now(), note: normalizeAssignmentBoardItemText(p.note) }
        : false;
    } else {
      target.status = status;
    }
    row.updatedAt = Date.now();
    state.version = (parseInt(state.version, 10) || 0) + 1;
    state.updatedAt = Date.now();
    writeAssignmentActivityState(state);
    return out({ ok: true, version: state.version, t: state.updatedAt });
  } finally { lock.releaseLock(); }
}

function moderateAssignmentActivity(cache, p) {
  var context = assignmentActivityContext(p, false);
  if (context.error) return out({ ok: false, e: context.error });
  if (context.config.type === 'question_board') return moderateAssignmentBoardItem(cache, p, context);
  if (context.config.type !== 'word_cloud') return out({ ok: false, e: 'no-moderation' });
  var uid = String(p.uid || '');
  var status = String(p.status || '');
  if (!/^ma-[A-Za-z0-9_-]{8,48}$/.test(uid)
      || (status !== 'pending' && status !== 'approved' && status !== 'hidden')) {
    return out({ ok: false, e: 'bad-request' });
  }
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return out({ ok: false, e: 'busy' });
  try {
    var state = readAssignmentActivityState(context);
    if (!state.responses || !state.responses[uid]) return out({ ok: false, e: 'no-response' });
    state.responses[uid].status = status;
    state.responses[uid].updatedAt = Date.now();
    state.version = (parseInt(state.version, 10) || 0) + 1;
    state.updatedAt = Date.now();
    writeAssignmentActivityState(state);
    cacheAssignmentActivitySummary(cache, state);
    return out({ ok: true, version: state.version, t: state.updatedAt });
  } finally { lock.releaseLock(); }
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
    // v11 clients send activities[]. A singular activity remains accepted so
    // deployed v10 clients can republish without losing their shared sidecar.
    var rawActivities = p.activities !== undefined && p.activities !== null
      ? p.activities
      : (p.activity !== undefined && p.activity !== null ? p.activity : []);
    var packActivities = normalizeAssignmentActivityConfigs(rawActivities, p.expiresAt);
    if (!packActivities) return out({ ok: false, e: 'bad-activity' });

    var oldCount = 0;
    var oldActivities = [];
    var oldManifest = findPackFile(id);
    if (oldManifest) {
      try {
        var oldManifestBody = JSON.parse(oldManifest.getBlob().getDataAsString());
        oldCount = parseInt(oldManifestBody.of, 10) || 0;
        oldActivities = assignmentActivitiesFromManifest(oldManifestBody);
      } catch (e) {}
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
      v: 3, k: String(p.k), t: Date.now(), title: String(p.title || '').slice(0, 140),
      expiresAt: String(p.expiresAt || ''), chars: assembled.length, of: downloadParts,
      activities: packActivities
    }), 'application/json');
    var nextActivityIds = {};
    for (var a = 0; a < packActivities.length; a++) {
      var packActivity = packActivities[a];
      nextActivityIds[packActivity.activityId] = true;
      if (!findAssignmentActivityFile(id, packActivity.activityId)) {
        writeAssignmentActivityState(newAssignmentActivityState({
          packId: id,
          activityId: packActivity.activityId,
          config: packActivity
        }));
      }
    }
    // Re-hosting the same pack id must not leave a removed activity sidecar.
    for (var oa = 0; oa < oldActivities.length; oa++) {
      var oldActivityId = oldActivities[oa].activityId;
      if (nextActivityIds[oldActivityId]) continue;
      var oldActivityFile = findAssignmentActivityFile(id, oldActivityId);
      if (oldActivityFile) oldActivityFile.setTrashed(true);
      cache.remove('as:' + id.slice(-12) + ':' + oldActivityId.slice(-12));
    }
    for (var r = 1; r <= of; r++) cache.remove('u:' + id + ':' + r);
    return out({ ok: true, id: id, chars: assembled.length, of: downloadParts, activities: packActivities.length });
  } finally { lock.releaseLock(); }
}

function futurePackExpiry(value) {
  var parsed = Date.parse(String(value || ''));
  var now = Date.now();
  if (!isFinite(parsed) || parsed <= now || parsed > now + 365 * 24 * 60 * 60 * 1000) return '';
  return new Date(parsed).toISOString();
}

// v12: lifecycle mutations are admin-only and deliberately narrow. Extension
// changes only an ACTIVE manifest's expiration; it never revives an expired
// credential. Cloning copies content into a fresh id/secret and fresh empty
// activity sidecars, so an expired assignment can be reused without carrying
// participants or responses forward.
function extendPack(cache, p) {
  var id = String(p.id || '');
  var expiresAt = futurePackExpiry(p.expiresAt);
  if (!/^PK-[0-9a-f-]{36}$/i.test(id) || !expiresAt) return out({ ok: false, e: 'bad-request' });
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return out({ ok: false, e: 'busy' });
  try {
    var file = findPackFile(id);
    if (!file) return out({ ok: false, e: 'no-pack' });
    var manifest;
    try { manifest = JSON.parse(file.getBlob().getDataAsString()); } catch (e) { return out({ ok: false, e: 'corrupt' }); }
    var currentExpiry = Date.parse(String(manifest.expiresAt || ''));
    if (isFinite(currentExpiry) && currentExpiry <= Date.now()) return out({ ok: false, e: 'expired' });
    var nextExpiry = Date.parse(expiresAt);
    if (isFinite(currentExpiry) && nextExpiry <= currentExpiry) return out({ ok: false, e: 'not-extension' });
    var activities = assignmentActivitiesFromManifest(manifest);
    for (var i = 0; i < activities.length; i++) activities[i].expiresAt = expiresAt;
    manifest.expiresAt = expiresAt;
    manifest.activities = activities;
    delete manifest.activity;
    manifest.t = Date.now();
    file.setContent(JSON.stringify(manifest));
    return out({ ok: true, id: id, expiresAt: expiresAt, activities: activities.length });
  } finally { lock.releaseLock(); }
}

function clonePack(cache, p) {
  var sourceId = String(p.sourceId || '');
  var id = String(p.id || '');
  var secret = String(p.k || '');
  var expiresAt = futurePackExpiry(p.expiresAt);
  if (!/^PK-[0-9a-f-]{36}$/i.test(sourceId)
      || !/^PK-[0-9a-f-]{36}$/i.test(id)
      || sourceId === id || !isToken(secret) || !expiresAt) return out({ ok: false, e: 'bad-request' });
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return out({ ok: false, e: 'busy' });
  try {
    if (findPackFile(id)) return out({ ok: false, e: 'exists' });
    var sourceFile = findPackFile(sourceId);
    if (!sourceFile) return out({ ok: false, e: 'no-pack' });
    var source;
    try { source = JSON.parse(sourceFile.getBlob().getDataAsString()); } catch (e) { return out({ ok: false, e: 'corrupt' }); }
    var parts = [];
    if (source.data !== undefined) {
      var legacy = String(source.data || '');
      for (var offset = 0; offset < legacy.length; offset += GET_PART_CHARS) parts.push(legacy.slice(offset, offset + GET_PART_CHARS));
      if (!parts.length) parts.push('');
    } else {
      var sourceCount = Math.max(1, parseInt(source.of, 10) || 1);
      for (var part = 1; part <= sourceCount; part++) {
        var chunk = findNamedPackFileV7(packChunkNameV7(sourceId, part));
        if (!chunk) return out({ ok: false, e: 'corrupt', part: part });
        parts.push(chunk.getBlob().getDataAsString());
      }
    }
    var chars = parts.reduce(function(sum, value) { return sum + value.length; }, 0);
    if (chars > MAX_PACK_CHARS) return out({ ok: false, e: 'too-big' });
    for (var d = 0; d < parts.length; d++) replacePackFileV7(packChunkNameV7(id, d + 1), parts[d], 'text/plain');
    var activities = assignmentActivitiesFromManifest(source);
    for (var a = 0; a < activities.length; a++) activities[a].expiresAt = expiresAt;
    replacePackFileV7('pack-' + id + '.json', JSON.stringify({
      v: 3, k: secret, t: Date.now(), title: String(source.title || '').slice(0, 140),
      expiresAt: expiresAt, chars: chars, of: parts.length, activities: activities
    }), 'application/json');
    for (var s = 0; s < activities.length; s++) {
      writeAssignmentActivityState(newAssignmentActivityState({
        packId: id, activityId: activities[s].activityId, config: activities[s]
      }));
    }
    return out({ ok: true, id: id, expiresAt: expiresAt, title: String(source.title || '').slice(0, 140), chars: chars, of: parts.length, activities: activities.length });
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

function delPack(cache, p) {
  var id = String(p.id || '');
  var file = findPackFile(id);
  var count = 0;
  var activities = [];
  if (file) {
    try {
      var manifest = JSON.parse(file.getBlob().getDataAsString());
      count = parseInt(manifest.of, 10) || 0;
      activities = assignmentActivitiesFromManifest(manifest);
    } catch (e) {}
    file.setTrashed(true);
  }
  for (var i = 1; i <= count; i++) {
    var chunk = findNamedPackFileV7(packChunkNameV7(id, i));
    if (chunk) chunk.setTrashed(true);
  }
  for (var a = 0; a < activities.length; a++) {
    var activityId = activities[a].activityId;
    var activityFile = findAssignmentActivityFile(id, activityId);
    if (activityFile) activityFile.setTrashed(true);
    cache.remove('as:' + id.slice(-12) + ':' + activityId.slice(-12));
  }

  return out({ ok: true });
}