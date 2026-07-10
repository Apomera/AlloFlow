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

var VERSION = 2;
var SESSION_TTL_SEC = 6 * 60 * 60;      // live session marker + counters
var MESSAGE_TTL_SEC = 45 * 60;          // live messages
var UPLOAD_TTL_SEC = 30 * 60;           // pack upload parts awaiting finalize
var MAX_MSG_CHARS = 90 * 1024;          // CacheService value limit is 100KB
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
      return out({ ok: true, admin: token, t: Date.now() });
    } finally { lock.releaseLock(); }
  }

  var cache = CacheService.getScriptCache();
  var admin = props.getProperty('admin') || '';
  var isAdmin = admin && String(p.admin || '') === admin;

  // Cheap ownership check so a reconnecting teacher can validate a pasted
  // admin token without side effects.
  if (a === 'auth') return out({ ok: true, admin: !!isAdmin, claimed: !!admin, t: Date.now() });

  if (a === 'open') {
    if (!isAdmin) return out({ ok: false, e: 'not-admin' });
    var code = String(p.c || '').toUpperCase();
    if (!/^[A-Z0-9]{4,8}$/.test(code) || !isToken(p.k)) return out({ ok: false, e: 'bad-request' });
    cache.put('s:' + code, String(p.k), SESSION_TTL_SEC);
    return out({ ok: true, t: Date.now() });
  }

  if (a === 'send' || a === 'recv' || a === 'end') {
    var sc = String(p.c || '').toUpperCase();
    var secret = cache.get('s:' + sc);
    if (!secret) return out({ ok: false, e: 'no-session' });
    if (String(p.k || '') !== secret) return out({ ok: false, e: 'denied' });
    if (a === 'send') return send(cache, sc, p);
    if (a === 'recv') return recv(cache, sc, p);
    cache.remove('s:' + sc);
    return out({ ok: true });
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

function packFolder() {
  var it = DriveApp.getFoldersByName(FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
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
