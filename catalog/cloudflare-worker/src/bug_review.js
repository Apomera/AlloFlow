// Private, append-only review events. Original bug reports remain immutable.
// KV is eventually consistent: a successful append acknowledges that event,
// not an atomic read/modify/write transaction or immediately consistent list.
export const BUG_RECEIPT_PATTERN = /^bug:\d{13}:[a-z0-9]{1,32}$/;
const STATUSES = new Set(['new', 'investigating', 'resolved']);
const NOTE_LIMIT = 2000;
const BODY_LIMIT = 16384;
const REVIEW_RETENTION_SECONDS = 30 * 24 * 60 * 60;
const eventPrefix = receipt => `bug-review:${receipt}:`;
const object = value => !!value && typeof value === 'object' && !Array.isArray(value);
const has = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const only = (value, keys) => object(value) && Object.keys(value).every(key => keys.includes(key));
const validNote = note => typeof note === 'string' && note.length <= NOTE_LIMIT && !!note.trim();
const validReceipt = receipt => typeof receipt === 'string' && receipt === receipt.trim() && BUG_RECEIPT_PATTERN.test(receipt);

function eventIdentity(name, prefix) {
  if (typeof name !== 'string' || !name.startsWith(prefix)) throw new Error('Invalid review key');
  const match = name.slice(prefix.length).match(/^(\d{13}):([a-f0-9]{32})$/);
  if (!match || match[0] !== name.slice(prefix.length)) throw new Error('Invalid review key');
  return { id: match[2], created_at: new Date(Number(match[1])).toISOString(), order: match[0] };
}

function eventFromValue(raw, identity) {
  const event = raw && JSON.parse(raw);
  if (!only(event, ['id', 'created_at', 'status', 'note']) || event.id !== identity.id || event.created_at !== identity.created_at
      || (has(event, 'status') && !STATUSES.has(event.status)) || (has(event, 'note') && !validNote(event.note))
      || (!has(event, 'status') && !has(event, 'note'))) throw new Error('Unavailable review event');
  return event;
}

function eventFromMetadata(metadata, identity) {
  if (!only(metadata, ['schema_version', 'created_at', 'status', 'has_note']) || metadata.schema_version !== 1
      || metadata.created_at !== identity.created_at || typeof metadata.has_note !== 'boolean'
      || (has(metadata, 'status') && !STATUSES.has(metadata.status))
      || (!has(metadata, 'status') && !metadata.has_note)) throw new Error('Invalid review metadata');
  return { ...(has(metadata, 'status') ? { status: metadata.status } : {}), has_note: metadata.has_note };
}

// Empty pages can still have a continuation cursor. Fail rather than report a
// partial history when storage returns an invalid page, cursor, or event.
export async function readBugReview(kv, receipt, includeEvents = true) {
  if (!validReceipt(receipt)) throw new Error('Invalid report receipt');
  const prefix = eventPrefix(receipt);
  const seenCursors = new Set();
  const seenKeys = new Set();
  const events = [];
  let cursor;
  let latest = '';
  let latestStatus = '';
  const review = { status: 'new', updated_at: null, note_count: 0, status_updated_at: null, status_event_id: null };
  while (true) {
    const page = await kv.list({ prefix, limit: 1000, ...(cursor ? { cursor } : {}) });
    if (!page || !Array.isArray(page.keys) || typeof page.list_complete !== 'boolean') throw new Error('Invalid review page');
    for (const key of page.keys) {
      const identity = eventIdentity(key && key.name, prefix);
      if (seenKeys.has(key.name)) continue;
      seenKeys.add(key.name);
      let summary;
      if (!includeEvents && key.metadata != null) {
        summary = eventFromMetadata(key.metadata, identity);
      } else {
        const event = eventFromValue(await kv.get(key.name), identity);
        summary = { ...event, has_note: has(event, 'note') };
        if (includeEvents) events.push(event);
      }
      if (summary.has_note) review.note_count++;
      if (identity.order > latest) { latest = identity.order; review.updated_at = identity.created_at; }
      if (has(summary, 'status') && identity.order > latestStatus) {
        latestStatus = identity.order;
        review.status = summary.status;
        // Notes may arrive before an earlier status update in eventually
        // consistent reads. Keep the exact status position independent of
        // updated_at so a note cannot mask that delayed status event.
        review.status_updated_at = identity.created_at;
        review.status_event_id = identity.id;
      }
    }
    if (page.list_complete) break;
    if (typeof page.cursor !== 'string' || !page.cursor || seenCursors.has(page.cursor)) throw new Error('Invalid review cursor');
    seenCursors.add(page.cursor);
    cursor = page.cursor;
  }
  if (includeEvents) {
    events.sort((a, b) => a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    review.events = events;
  }
  return review;
}

function validatePayload(payload) {
  if (!only(payload, ['id', 'status', 'note'])) return 'Body must contain only id, status, and note.';
  if (!validReceipt(payload.id)) return 'Invalid report receipt.';
  if (has(payload, 'status') && !STATUSES.has(payload.status)) return 'Status must be new, investigating, or resolved.';
  if (has(payload, 'note') && !validNote(payload.note)) return `Note must be a nonblank string up to ${NOTE_LIMIT} characters.`;
  if (!has(payload, 'status') && !has(payload, 'note')) return 'Choose a status or add a note.';
  return null;
}

export async function handleBugReview(request, env, { respond, authorize }) {
  const refusal = await authorize(request, env);
  if (refusal) return refusal;
  if (request.method !== 'GET' && request.method !== 'POST') return respond({ ok: false, error: 'Method not allowed.' }, 405);
  let payload;
  if (request.method === 'POST') {
    if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type') || '')) {
      return respond({ ok: false, error: 'Content-Type must be application/json.' }, 415);
    }
    let raw;
    try { raw = await request.text(); } catch (_) { return respond({ ok: false, error: 'Could not read review.' }, 400); }
    if (raw.length > BODY_LIMIT || new TextEncoder().encode(raw).length > BODY_LIMIT) return respond({ ok: false, error: 'Review body is too large.' }, 413);
    try { payload = JSON.parse(raw); } catch (_) { return respond({ ok: false, error: 'Invalid JSON.' }, 400); }
    const error = validatePayload(payload);
    if (error) return respond({ ok: false, error }, 400);
  } else {
    const params = new URL(request.url).searchParams;
    payload = { id: params.get('id') };
    if (params.getAll('id').length !== 1 || !validReceipt(payload.id)) return respond({ ok: false, error: 'Invalid report receipt.' }, 400);
  }
  try {
    const raw = await env.BUG_REPORTS.get(payload.id);
    if (raw == null) return respond({ ok: false, error: 'Report not found. Refresh the inbox and try again.' }, 404);
    const report = JSON.parse(raw);
    if (!object(report)) throw new Error('Unavailable report');
    const now = Date.now();
    const parentExpiry = report.expires_at == null ? null : Date.parse(report.expires_at);
    if (parentExpiry != null && !Number.isFinite(parentExpiry)) throw new Error('Invalid report retention');
    if (parentExpiry != null && parentExpiry <= now) return respond({ ok: false, error: 'Report not found. Refresh the inbox and try again.' }, 404);
    if (request.method === 'GET') return respond({ ok: true, review: await readBugReview(env.BUG_REPORTS, payload.id) });
    // A new note never renews the parent report. Legacy parents without expiry
    // get a bounded window for NEW events, not a retroactive purge.
    const expiration = Math.floor(Math.min(parentExpiry ?? Infinity, now + REVIEW_RETENTION_SECONDS * 1000) / 1000);
    // KV rejects expiration less than 60 seconds ahead. Refuse a last-minute
    // append instead of extending retention to fit that storage minimum.
    if (expiration - Math.ceil(now / 1000) <= 60) return respond({ ok: false, error: 'The report retention window is ending. No review was saved.' }, 409);
    const event = {
      id: crypto.randomUUID().replace(/-/g, ''),
      created_at: new Date(now).toISOString(),
      ...(has(payload, 'status') ? { status: payload.status } : {}),
      ...(has(payload, 'note') ? { note: payload.note.trim() } : {}),
    };
    // Each submission gets its own random key, so parallel reviewers cannot
    // overwrite one another's notes. Timestamp + id defines status precedence.
    await env.BUG_REPORTS.put(`${eventPrefix(payload.id)}${now}:${event.id}`, JSON.stringify(event), {
      expiration,
      metadata: { schema_version: 1, created_at: event.created_at, ...(has(event, 'status') ? { status: event.status } : {}), has_note: has(event, 'note') },
    });
    return respond({ ok: true, event }, 201);
  } catch (_) {
    return respond({ ok: false, error: request.method === 'GET' ? 'Could not load review. Please try again.' : 'Could not save review. Please try again.' }, 502);
  }
}
