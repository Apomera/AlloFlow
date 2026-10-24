// The Worker supplies a fresh nonce and matching CSP headers for each response.
// Report data and the access token are fetched/held only in the browser page.
export function renderBugInbox(nonce = '') {
  const safeNonce = String(nonce).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
  return String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow, noarchive">
  <meta name="referrer" content="no-referrer">
  <meta http-equiv="Cache-Control" content="no-store">
  <title>Bug report inbox · AlloFlow</title>
  <style nonce="${safeNonce}">
    :root { color-scheme: light; font-family: system-ui, sans-serif; color: #17243b; background: #f1f5f9; }
    * { box-sizing: border-box; }
    body { margin: 0; }
    [hidden] { display: none !important; }
    main { max-width: 1200px; margin: auto; padding: 24px; }
    h1 { margin: 0; font-size: clamp(1.7rem, 4vw, 2.3rem); }
    h2 { margin-top: 0; font-size: 1.2rem; }
    p { line-height: 1.55; }
    .muted { color: #475569; }
    .heading, .toolbar, .detail-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    .card { background: #fff; border: 1px solid #cbd5e1; border-radius: 14px; padding: 22px; }
    #login-panel { max-width: 480px; margin: 32px auto; }
    label { display: block; font-weight: 650; margin-bottom: 7px; }
    input, button, select, textarea { font: inherit; }
    input, select, textarea { min-height: 44px; width: 100%; border: 1px solid #64748b; border-radius: 7px; padding: 10px 12px; }
    textarea { min-height: 110px; resize: vertical; }
    .check { display: flex; gap: 9px; align-items: center; font-weight: 500; }
    .check input { width: 18px; min-height: 18px; flex-shrink: 0; }
    .filters { display: grid; gap: 14px; margin-top: 16px; }
    .group { padding: 8px; border: 1px solid #cbd5e1; border-radius: 9px; }
    .group summary { padding: 8px; cursor: pointer; overflow-wrap: anywhere; line-height: 1.5; }
    .group ul { list-style: none; display: grid; gap: 8px; padding: 8px 0 0; }
    #review-panel { border-top: 1px solid #cbd5e1; margin-top: 24px; padding-top: 20px; }
    #review-panel label { margin-top: 14px; }
    #review-message { min-height: 1.5em; }
    #review-message[data-error="true"] { color: #a21b25; }
    #review-history { padding-left: 22px; }
    #review-history li { margin: 12px 0; overflow-wrap: anywhere; }
    .note-text { white-space: pre-wrap; margin: 6px 0; }
    button { min-height: 44px; padding: 9px 16px; border: 1px solid #64748b; border-radius: 7px; background: #fff; color: #17243b; cursor: pointer; }
    button:hover { background: #f1f5f9; }
    button.primary { background: #2454a4; border-color: #2454a4; color: #fff; }
    button.primary:hover { background: #1c4283; }
    button:disabled { opacity: .65; cursor: wait; }
    :focus-visible { outline: 3px solid #a34400; outline-offset: 3px; }
    #login-submit { width: 100%; margin-top: 16px; }
    #status { min-height: 1.5em; margin: 16px 0; overflow-wrap: anywhere; }
    #status[data-error="true"] { color: #a21b25; }
    .toolbar { margin: 12px 0 18px; }
    #report-count { margin: 0; font-weight: 650; }
    .inbox-grid { display: grid; grid-template-columns: minmax(260px, 1fr) minmax(0, 1.5fr); gap: 20px; align-items: start; }
    #report-list { list-style: none; padding: 0; margin: 18px 0 0; display: grid; gap: 8px; }
    #report-list button { width: 100%; text-align: left; display: grid; gap: 5px; overflow-wrap: anywhere; }
    #report-list button[aria-pressed="true"] { border: 2px solid #2454a4; background: #edf4ff; }
    .report-summary { font-weight: 650; }
    .report-meta { color: #475569; font-size: .85rem; }
    #load-more { width: 100%; margin-top: 16px; }
    #detail-panel { min-width: 0; }
    #detail-heading { scroll-margin-top: 20px; }
    dl { margin: 16px 0 0; }
    dt { font-weight: 650; margin-top: 20px; }
    dd { margin: 6px 0 0; line-height: 1.55; overflow-wrap: anywhere; white-space: pre-wrap; }
    #detail-id { font-family: ui-monospace, monospace; }
    .help { font-size: .9rem; }
    @media (max-width: 720px) { main { padding: 16px; } .inbox-grid { grid-template-columns: 1fr; } .card { padding: 16px; } }
  </style>
</head>
<body>
<main>
  <header class="heading">
    <div><h1>Bug report inbox</h1><p class="muted">Reports submitted from AlloFlow.</p></div>
    <button id="sign-out" type="button" hidden>Sign out</button>
  </header>
  <p id="status" role="status" aria-live="polite" aria-atomic="true"></p>
  <section id="login-panel" class="card" aria-labelledby="login-heading">
    <h2 id="login-heading">Developer access</h2>
    <form id="login-form" autocomplete="off">
      <label for="access-token">Inbox access token</label>
      <input id="access-token" type="password" required autocomplete="off" autocapitalize="none" spellcheck="false" aria-describedby="token-help">
      <p id="token-help" class="help muted">Your token stays in this page until you sign out or close it.</p>
      <button id="login-submit" class="primary" type="submit">Open inbox</button>
    </form>
  </section>
  <section id="inbox" aria-label="Submitted bug reports" hidden>
    <div class="toolbar"><p id="report-count"></p><button id="refresh" type="button">Refresh reports</button></div>
    <label class="check"><input id="auto-refresh" type="checkbox">Refresh every 30 seconds while this page is visible</label>
    <p id="new-reports" role="status" aria-live="polite"></p>
    <div class="inbox-grid">
      <section class="card" aria-labelledby="reports-heading">
        <h2 id="reports-heading">Reports</h2>
        <label for="report-search">Search loaded reports</label>
        <input id="report-search" type="search" placeholder="Receipt, description, or report type" autocomplete="off" aria-describedby="search-help">
        <p id="search-help" class="help muted">Newest first. Load older reports to search more.</p>
        <div class="filters">
          <div><label for="status-filter">Review status</label><select id="status-filter"><option value="all">All statuses</option><option value="new">New</option><option value="investigating">Investigating</option><option value="resolved">Resolved</option></select></div>
          <label class="check"><input id="group-reports" type="checkbox">Group similar loaded reports</label>
        </div>
        <ul id="report-list" aria-label="Reports, newest first"></ul>
        <p id="empty-list" class="muted" hidden></p>
        <button id="load-more" type="button" hidden>Load older reports</button>
      </section>
      <section id="detail-panel" class="card" aria-labelledby="detail-heading">
        <div class="detail-heading"><h2 id="detail-heading" tabindex="-1">Report details</h2><button id="copy-receipt" type="button" hidden>Copy receipt</button></div>
        <p id="detail-empty" class="muted">Select a report to read its details.</p>
        <dl id="report-details" hidden>
          <dt>Receipt</dt><dd id="detail-id"></dd>
          <dt>Submitted</dt><dd id="detail-submitted"></dd>
          <dt>Report type</dt><dd id="detail-type"></dd>
          <dt>What happened</dt><dd id="detail-what"></dd>
          <dt>Steps to reproduce</dt><dd id="detail-steps"></dd>
          <dt>Browser</dt><dd id="detail-browser"></dd>
          <dt>Page URL</dt><dd id="detail-url"></dd>
        </dl>
        <section id="review-panel" aria-labelledby="review-heading" hidden>
          <h2 id="review-heading">Private review</h2>
          <p id="review-summary" class="muted"></p>
          <form id="review-form">
            <label for="review-status">Status</label>
            <select id="review-status"><option value="new">New</option><option value="investigating">Investigating</option><option value="resolved">Resolved</option></select>
            <label for="review-note">Add a private note</label>
            <textarea id="review-note" maxlength="2000" aria-describedby="review-help" placeholder="Investigation notes, next steps, or resolution"></textarea>
            <p id="review-help" class="help muted">Notes are added to the history. Original reports stay unchanged. Unsaved drafts stay in this page until sign-out or closing.</p>
            <button id="save-review" type="submit" class="primary">Save review</button>
          </form>
          <p id="review-message" role="status" aria-live="polite" aria-atomic="true"></p>
          <h3>Review history</h3>
          <p id="review-empty" class="muted">No saved review events yet.</p>
          <ol id="review-history" aria-label="Review history, newest first"></ol>
          <button id="refresh-review" type="button">Refresh review history</button>
        </section>
      </section>
    </div>
  </section>
  <noscript><p>Enable JavaScript to sign in and read reports.</p></noscript>
</main>
<script nonce="${safeNonce}">
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  let token = '';
  let authenticated = false;
  let reports = [];
  let selectedId = '';
  let cursor = '';
  let busy = false;
  let requestVersion = 0;
  let controller = null;
  let requestTimer = null;
  let sessionVersion = 0;
  let autoTimer = null;
  const reviews = new Map();
  const drafts = new Map();
  const reviewMessages = new Map();
  const pendingSaves = new Set();
  const pendingReads = new Set();
  const reviewRequests = new Set();
  const groupExpanded = new Map();
  const statuses = ['new', 'investigating', 'resolved'];
  const fields = ['id', 'submitted_at', 'type', 'what', 'steps', 'browser', 'url'];
  const detailIds = ['id', 'submitted', 'type', 'what', 'steps', 'browser', 'url'];

  function status(message, error = false) {
    byId('status').textContent = message;
    byId('status').dataset.error = String(error);
  }

  function setBusy(value) {
    busy = value;
    ['login-submit', 'refresh', 'load-more'].forEach(id => { byId(id).disabled = value; });
    byId('access-token').disabled = value;
    byId('inbox').setAttribute('aria-busy', String(value));
  }

  function dateText(value) {
    const date = new Date(value);
    return value && Number.isFinite(date.getTime()) ? date.toLocaleString() : 'Not provided';
  }

  function reviewFor(id) {
    if (!reviews.has(id)) reviews.set(id, { status: 'new', statusOrder: '', updated_at: '', note_count: 0, events: [], loaded: false, acknowledged: new Set() });
    return reviews.get(id);
  }

  function mergeSummary(id, summary) {
    const review = reviewFor(id);
    if (!summary || !statuses.includes(summary.status)) return;
    // A note can be newer than the status change. Only actual status-event
    // position can supersede a status already acknowledged or read here.
    const order = typeof summary.status_updated_at === 'string' && typeof summary.status_event_id === 'string'
      ? summary.status_updated_at + '|' + summary.status_event_id : '';
    if (order && order >= review.statusOrder || !review.statusOrder && !review.loaded) {
      review.status = summary.status;
      review.statusOrder = order;
    }
    if (typeof summary.updated_at === 'string' && summary.updated_at > review.updated_at) review.updated_at = summary.updated_at;
    if (Number.isInteger(summary.note_count)) review.note_count = Math.max(review.note_count, summary.note_count);
  }

  function mergeEvents(id, events, acknowledged = false) {
    const review = reviewFor(id);
    const merged = new Map(review.events.map(event => [event.id, event]));
    events.forEach(event => {
      if (!event || typeof event.id !== 'string' || typeof event.created_at !== 'string') return;
      const clean = { id: event.id, created_at: event.created_at };
      if (statuses.includes(event.status)) clean.status = event.status;
      if (typeof event.note === 'string' && event.note) clean.note = event.note;
      merged.set(clean.id, clean);
      if (acknowledged) review.acknowledged.add(clean.id);
      else review.acknowledged.delete(clean.id);
    });
    review.events = Array.from(merged.values()).sort((a, b) => a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    review.events.forEach(event => {
      const order = event.created_at + '|' + event.id;
      if (event.status && order >= review.statusOrder) { review.status = event.status; review.statusOrder = order; }
    });
    const latestTime = review.events.length ? review.events[review.events.length - 1].created_at : '';
    if (latestTime > review.updated_at) review.updated_at = latestTime;
    const knownNoteCount = review.events.filter(event => event.note).length;
    review.note_count = review.loaded || !acknowledged ? knownNoteCount : Math.max(knownNoteCount, review.note_count);
    if (!acknowledged) review.loaded = true;
  }

  function draftFor(id) {
    if (!drafts.has(id)) drafts.set(id, { status: reviewFor(id).status, note: '', statusEdited: false });
    const draft = drafts.get(id);
    if (!draft.statusEdited) draft.status = reviewFor(id).status;
    return draft;
  }

  function renderReview() {
    const id = selectedId;
    byId('review-panel').hidden = !id;
    if (!id) {
      ['review-note', 'review-status'].forEach(field => { byId(field).value = field === 'review-status' ? 'new' : ''; });
      ['review-summary', 'review-message'].forEach(field => { byId(field).textContent = ''; });
      byId('review-history').replaceChildren();
      return;
    }
    const review = reviewFor(id);
    const draft = draftFor(id);
    if (byId('review-note').value !== draft.note) byId('review-note').value = draft.note;
    byId('review-status').value = draft.status;
    byId('review-summary').textContent = 'Saved status: ' + review.status + ' · ' + review.note_count + (review.note_count === 1 ? ' note' : ' notes');
    byId('save-review').disabled = pendingSaves.has(id);
    byId('save-review').textContent = pendingSaves.has(id) ? 'Saving review…' : 'Save review';
    byId('refresh-review').disabled = pendingReads.has(id);
    const message = reviewMessages.get(id);
    byId('review-message').textContent = message ? message.text : pendingReads.has(id) ? 'Loading review history…' : '';
    byId('review-message').dataset.error = String(Boolean(message && message.error));
    byId('review-history').replaceChildren();
    review.events.slice().reverse().forEach(event => {
      const row = document.createElement('li');
      const meta = document.createElement('div');
      meta.className = 'report-meta';
      meta.textContent = dateText(event.created_at) + (event.status ? ' · Status: ' + event.status : '');
      row.append(meta);
      if (event.note) {
        const note = document.createElement('p');
        note.className = 'note-text';
        note.textContent = event.note;
        row.append(note);
      }
      byId('review-history').append(row);
    });
    byId('review-empty').hidden = review.events.length > 0;
    byId('review-empty').textContent = review.loaded ? 'No saved review events yet.' : 'Review history has not loaded yet.';
  }

  async function reviewRequest(endpoint, options = {}) {
    const session = sessionVersion;
    const request = { controller: new AbortController(), timer: null, cancel: null, active: true };
    reviewRequests.add(request);
    const deadline = new Promise((resolve, reject) => {
      request.cancel = () => reject(new Error('cancelled'));
      request.timer = setTimeout(() => { request.active = false; request.controller.abort(); reject(new Error('timeout')); }, 20000);
    });
    try {
      const operation = (async () => {
        const response = await fetch(endpoint, {
          method: options.method || 'GET',
          headers: { Authorization: 'Bearer ' + token, Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
          ...(options.body ? { body: JSON.stringify(options.body) } : {}),
          cache: 'no-store', credentials: 'omit', redirect: 'error', signal: request.controller.signal,
        });
        if (session !== sessionVersion || !request.active) throw new Error('cancelled');
        if (response.status === 401 || response.status === 403) {
          signOut('Access denied. Enter a valid inbox token to continue.', true);
          throw new Error('cancelled');
        }
        if (!response.ok) throw new Error('request_failed');
        const payload = await response.json();
        if (!payload || payload.ok !== true) throw new Error('invalid_response');
        return payload;
      })();
      const result = await Promise.race([operation, deadline]);
      if (session !== sessionVersion) throw new Error('cancelled');
      return result;
    } finally {
      request.active = false;
      clearTimeout(request.timer);
      reviewRequests.delete(request);
    }
  }

  async function loadReview(id) {
    if (!authenticated || !id || pendingReads.has(id)) return;
    const session = sessionVersion;
    pendingReads.add(id);
    if (selectedId === id) renderReview();
    try {
      const payload = await reviewRequest('/bug-review?id=' + encodeURIComponent(id));
      if (session !== sessionVersion) return;
      if (!payload.review || !Array.isArray(payload.review.events)) throw new Error('invalid_response');
      mergeEvents(id, payload.review.events);
      if (reviewMessages.get(id)?.readError) reviewMessages.delete(id);
      renderList();
    } catch (error) {
      if (session !== sessionVersion) return;
      if (!pendingSaves.has(id)) reviewMessages.set(id, { text: 'Could not load review history. Your draft is unchanged. Try Refresh review history.', error: true, readError: true });
    } finally {
      if (session === sessionVersion) {
        pendingReads.delete(id);
        if (selectedId === id) renderReview();
      }
    }
  }

  async function saveReview() {
    const id = selectedId;
    if (!authenticated || !id || pendingSaves.has(id)) return;
    const draft = draftFor(id);
    const rawNote = draft.note;
    const requestedStatus = draft.status;
    const body = { id };
    if (requestedStatus !== reviewFor(id).status) body.status = requestedStatus;
    if (rawNote.trim()) body.note = rawNote.trim();
    if (!body.status && !body.note) {
      reviewMessages.set(id, { text: 'Choose a different status or add a note before saving.', error: false });
      renderReview();
      return;
    }
    const session = sessionVersion;
    pendingSaves.add(id);
    reviewMessages.set(id, { text: 'Saving review…', error: false });
    renderReview();
    try {
      const payload = await reviewRequest('/bug-review', { method: 'POST', body });
      if (session !== sessionVersion) return;
      if (!payload.event || typeof payload.event.id !== 'string' || typeof payload.event.created_at !== 'string') throw new Error('invalid_response');
      if (body.status && payload.event.status !== body.status || body.note && payload.event.note !== body.note) throw new Error('invalid_response');
      mergeEvents(id, [payload.event], true);
      if (draft.note === rawNote) draft.note = '';
      if (draft.status === requestedStatus) draft.statusEdited = false;
      reviewMessages.set(id, { text: 'Review saved.' + (draft.note || draft.statusEdited ? ' Your newer changes remain unsaved.' : ''), error: false });
      renderList();
    } catch (error) {
      if (session !== sessionVersion) return;
      reviewMessages.set(id, { text: 'Save not confirmed. Your draft is unchanged. Refresh review history before retrying; another save could add a duplicate note.', error: true });
    } finally {
      if (session === sessionVersion) {
        pendingSaves.delete(id);
        if (selectedId === id) renderReview();
      }
    }
  }

  function showDetail(report) {
    selectedId = report ? report.id : '';
    byId('report-details').hidden = !report;
    byId('copy-receipt').hidden = !report;
    byId('detail-empty').hidden = Boolean(report);
    fields.forEach((field, index) => {
      byId('detail-' + detailIds[index]).textContent = report
        ? (field === 'submitted_at' ? dateText(report[field]) : report[field] || 'Not provided')
        : '';
    });
    renderReview();
  }

  function groupingKey(report) {
    // Only volatile timestamps and known stack coordinates are normalized.
    // Error/status codes and other meaningful digits remain part of the key.
    return report.type + '\n' + report.what.replace(/\r\n/g, '\n')
      .replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})\b/g, '[timestamp]')
      .replace(/^(\s*at\s+.+?):\d+:\d+(\)?\s*)$/gm, '$1:[line]:[column]$2').trim();
  }

  function listSummary(report) {
    const text = report.what.replace(/\s+/g, ' ').trim() || 'No description provided';
    return text.length > 180 ? text.slice(0, 177) + '…' : text;
  }

  function reportButton(report) {
    const row = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.receipt = report.id;
    button.setAttribute('aria-pressed', String(report.id === selectedId));
    const summary = document.createElement('span');
    summary.className = 'report-summary';
    summary.textContent = listSummary(report);
    const meta = document.createElement('span');
    meta.className = 'report-meta';
    meta.textContent = reviewFor(report.id).status + ' · ' + (report.type || 'Bug report') + ' · ' + dateText(report.submitted_at);
    const receipt = document.createElement('span');
    receipt.className = 'report-meta';
    receipt.textContent = 'Receipt: ' + report.id;
    button.append(summary, meta, receipt);
    button.addEventListener('click', () => {
      showDetail(report);
      renderList();
      byId('detail-heading').focus();
      void loadReview(report.id);
    });
    row.append(button);
    return row;
  }

  function renderList() {
    const focusedReceipt = byId('report-list').contains(document.activeElement) ? document.activeElement.dataset.receipt : null;
    const focusedGroup = byId('report-list').contains(document.activeElement) && document.activeElement.tagName === 'SUMMARY' ? document.activeElement.dataset.groupKey : null;
    byId('report-list').querySelectorAll('details[data-group-key]').forEach(details => groupExpanded.set(details.dataset.groupKey, details.open));
    const query = byId('report-search').value.trim().toLowerCase();
    const filter = byId('status-filter').value;
    const visible = reports.filter(report => (filter === 'all' || reviewFor(report.id).status === filter) && [report.id, report.what, report.type].some(value => value.toLowerCase().includes(query)));
    byId('report-list').replaceChildren();
    if (byId('group-reports').checked) {
      const groups = new Map();
      visible.forEach(report => {
        const key = groupingKey(report);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(report);
      });
      groups.forEach((group, key) => {
        if (group.length === 1) { byId('report-list').append(reportButton(group[0])); return; }
        const row = document.createElement('li');
        const details = document.createElement('details');
        details.className = 'group';
        details.dataset.groupKey = key;
        details.open = groupExpanded.get(key) !== false;
        const summary = document.createElement('summary');
        summary.dataset.groupKey = key;
        summary.textContent = group.length + ' similar reports among loaded reports: ' + listSummary(group[0]);
        const list = document.createElement('ul');
        group.forEach(report => list.append(reportButton(report)));
        details.append(summary, list);
        row.append(details);
        byId('report-list').append(row);
      });
    } else visible.forEach(report => byId('report-list').append(reportButton(report)));
    byId('report-count').textContent = reports.length + (reports.length === 1 ? ' report loaded' : ' reports loaded') + (query || filter !== 'all' ? ' · ' + visible.length + ' matching among loaded reports' : '');
    byId('empty-list').hidden = visible.length > 0;
    byId('empty-list').textContent = reports.length ? 'No loaded reports match your search and status filter.' : 'No bug reports yet.';
    byId('load-more').hidden = !cursor;
    if (focusedReceipt) Array.from(byId('report-list').querySelectorAll('button')).find(button => button.dataset.receipt === focusedReceipt)?.focus();
    else if (focusedGroup) Array.from(byId('report-list').querySelectorAll('summary')).find(summary => summary.dataset.groupKey === focusedGroup)?.focus();
  }

  function signOut(message = 'Signed out.', error = false, focus = true) {
    sessionVersion += 1;
    reviewRequests.forEach(request => { clearTimeout(request.timer); request.controller.abort(); request.cancel(); });
    reviewRequests.clear();
    reviews.clear(); drafts.clear(); reviewMessages.clear(); pendingSaves.clear(); pendingReads.clear();
    groupExpanded.clear();
    if (autoTimer !== null) clearInterval(autoTimer);
    autoTimer = null;
    byId('auto-refresh').checked = false;
    byId('new-reports').textContent = '';
    byId('status-filter').value = 'all';
    byId('group-reports').checked = false;
    requestVersion += 1;
    if (requestTimer !== null) clearTimeout(requestTimer);
    requestTimer = null;
    if (controller) controller.abort();
    controller = null;
    token = '';
    authenticated = false;
    reports = [];
    cursor = '';
    byId('access-token').value = '';
    byId('report-search').value = '';
    showDetail(null);
    renderList();
    groupExpanded.clear();
    setBusy(false);
    byId('login-panel').hidden = false;
    byId('inbox').hidden = true;
    byId('sign-out').hidden = true;
    status(message, error);
    if (focus) byId('access-token').focus();
  }

  async function loadReports(append = false, automatic = false) {
    if (busy || !token) return;
    const version = ++requestVersion;
    controller = new AbortController();
    const requestController = controller;
    setBusy(true);
    if (!automatic) status(append ? 'Loading older reports…' : 'Loading reports…');
    const timeoutId = setTimeout(() => {
      if (version !== requestVersion) return;
      requestVersion += 1;
      requestController.abort();
      controller = null;
      requestTimer = null;
      setBusy(false);
      if (authenticated) {
        status('Loading timed out. Your loaded reports are still available. Try again.', true);
      } else {
        token = '';
        byId('sign-out').hidden = true;
        status('Opening the inbox timed out. Enter your token and try again.', true);
        byId('access-token').focus();
      }
    }, 20000);
    requestTimer = timeoutId;
    try {
      const endpoint = append && cursor ? '/bugs?cursor=' + encodeURIComponent(cursor) : '/bugs';
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
        cache: 'no-store',
        credentials: 'omit',
        redirect: 'error',
        signal: requestController.signal,
      });
      if (version !== requestVersion) return;
      if (response.status === 401 || response.status === 403) {
        signOut('Access denied. Enter a valid inbox token to continue.', true);
        return;
      }
      if (!response.ok) throw new Error('request_failed');
      const payload = await response.json();
      if (version !== requestVersion) return;
      if (!payload || payload.ok !== true || !Array.isArray(payload.reports)) throw new Error('invalid_response');
      const previousIds = new Set(reports.map(report => report.id));
      const next = new Map(reports.map(report => [report.id, report]));
      let newCount = 0;
      payload.reports.forEach(report => {
        if (!report || typeof report.id !== 'string' || !report.id) return;
        const normalized = {};
        fields.forEach(field => { normalized[field] = typeof report[field] === 'string' ? report[field] : ''; });
        mergeSummary(normalized.id, report.review);
        if (!previousIds.has(normalized.id)) newCount += 1;
        next.set(normalized.id, normalized);
      });
      reports = Array.from(next.values()).sort((a, b) => (Date.parse(b.submitted_at) || 0) - (Date.parse(a.submitted_at) || 0));
      const wasAuthenticated = authenticated;
      const hasOverlap = payload.reports.some(report => report && previousIds.has(report.id));
      // Keep the older-page traversal when a refreshed head overlaps our loaded
      // reports. A non-overlapping burst must remain traversable to fill its gap.
      if (!wasAuthenticated || append || !hasOverlap && typeof payload.cursor === 'string' && payload.cursor) {
        cursor = typeof payload.cursor === 'string' ? payload.cursor : '';
      }
      authenticated = true;
      byId('login-panel').hidden = true;
      byId('inbox').hidden = false;
      byId('sign-out').hidden = false;
      showDetail(reports.find(report => report.id === selectedId) || null);
      renderList();
      if (!automatic) status(append ? 'Older reports loaded.' : 'Reports refreshed.');
      if (wasAuthenticated && !append && newCount > 0) byId('new-reports').textContent = newCount + (newCount === 1 ? ' new report received' : ' new reports received') + ' among loaded reports.';
      if (selectedId) void loadReview(selectedId);
      if (!wasAuthenticated) byId('report-search').focus();
    } catch (error) {
      if (version !== requestVersion) return;
      if (authenticated) {
        status('Could not load reports. Your loaded reports are still available. Try again.', true);
      } else {
        token = '';
        byId('sign-out').hidden = true;
        status('Could not open the inbox. Enter your token and try again.', true);
      }
    } finally {
      clearTimeout(timeoutId);
      if (requestTimer === timeoutId) requestTimer = null;
      if (version === requestVersion) {
        controller = null;
        setBusy(false);
        if (!authenticated) byId('access-token').focus();
      }
    }
  }

  byId('login-form').addEventListener('submit', event => {
    event.preventDefault();
    if (busy) return;
    token = byId('access-token').value.trim();
    byId('access-token').value = '';
    if (!token) { status('Enter your inbox access token.', true); return; }
    byId('sign-out').hidden = false;
    void loadReports();
  });
  byId('refresh').addEventListener('click', () => { void loadReports(); });
  byId('load-more').addEventListener('click', () => { void loadReports(true); });
  byId('sign-out').addEventListener('click', () => signOut());
  byId('report-search').addEventListener('input', renderList);
  byId('status-filter').addEventListener('change', renderList);
  byId('group-reports').addEventListener('change', renderList);
  function markDraftChanged() {
    if (!pendingSaves.has(selectedId)) reviewMessages.set(selectedId, { text: 'Unsaved review changes.', error: false });
    renderReview();
  }
  byId('review-note').addEventListener('input', () => {
    if (!selectedId) return;
    draftFor(selectedId).note = byId('review-note').value;
    markDraftChanged();
  });
  byId('review-status').addEventListener('change', () => {
    if (!selectedId) return;
    const draft = draftFor(selectedId);
    draft.status = byId('review-status').value;
    draft.statusEdited = true;
    markDraftChanged();
  });
  byId('review-form').addEventListener('submit', event => { event.preventDefault(); void saveReview(); });
  byId('refresh-review').addEventListener('click', () => { void loadReview(selectedId); });
  byId('auto-refresh').addEventListener('change', () => {
    if (autoTimer !== null) clearInterval(autoTimer);
    autoTimer = null;
    if (byId('auto-refresh').checked) {
      autoTimer = setInterval(() => {
        if (authenticated && !busy && !pendingSaves.size && document.visibilityState !== 'hidden') void loadReports(false, true);
      }, 30000);
    }
    status(byId('auto-refresh').checked ? 'Automatic refresh is on while this page is visible.' : 'Automatic refresh is off.');
  });
  byId('copy-receipt').addEventListener('click', async () => {
    const receipt = selectedId;
    const version = requestVersion;
    if (!receipt) return;
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('clipboard_unavailable');
      await navigator.clipboard.writeText(receipt);
      if (version === requestVersion && receipt === selectedId) status('Receipt copied.');
    } catch (error) {
      if (version === requestVersion && receipt === selectedId) status('Could not copy the receipt. Select and copy the receipt text in the report details.', true);
    }
  });
  window.addEventListener('pagehide', () => signOut('', false, false));
})();
</script>
</body>
</html>`;
}
