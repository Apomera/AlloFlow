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
    input, button { font: inherit; }
    input { min-height: 44px; width: 100%; border: 1px solid #64748b; border-radius: 7px; padding: 10px 12px; }
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
    <div class="inbox-grid">
      <section class="card" aria-labelledby="reports-heading">
        <h2 id="reports-heading">Reports</h2>
        <label for="report-search">Search loaded reports</label>
        <input id="report-search" type="search" placeholder="Receipt, description, or report type" autocomplete="off" aria-describedby="search-help">
        <p id="search-help" class="help muted">Newest first. Load older reports to search more.</p>
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
  }

  function renderList() {
    const query = byId('report-search').value.trim().toLowerCase();
    const visible = reports.filter(report => [report.id, report.what, report.type].some(value => value.toLowerCase().includes(query)));
    byId('report-list').replaceChildren();
    visible.forEach(report => {
      const row = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-pressed', String(report.id === selectedId));
      const summary = document.createElement('span');
      summary.className = 'report-summary';
      summary.textContent = report.what || 'No description provided';
      const meta = document.createElement('span');
      meta.className = 'report-meta';
      meta.textContent = (report.type || 'Bug report') + ' · ' + dateText(report.submitted_at);
      const receipt = document.createElement('span');
      receipt.className = 'report-meta';
      receipt.textContent = 'Receipt: ' + report.id;
      button.append(summary, meta, receipt);
      button.addEventListener('click', () => {
        showDetail(report);
        renderList();
        byId('detail-heading').focus();
      });
      row.append(button);
      byId('report-list').append(row);
    });
    byId('report-count').textContent = reports.length + (reports.length === 1 ? ' report loaded' : ' reports loaded');
    byId('empty-list').hidden = visible.length > 0;
    byId('empty-list').textContent = reports.length ? 'No loaded reports match your search.' : 'No bug reports yet.';
    byId('load-more').hidden = !cursor;
  }

  function signOut(message = 'Signed out.', error = false, focus = true) {
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
    setBusy(false);
    byId('login-panel').hidden = false;
    byId('inbox').hidden = true;
    byId('sign-out').hidden = true;
    status(message, error);
    if (focus) byId('access-token').focus();
  }

  async function loadReports(append = false) {
    if (busy || !token) return;
    const version = ++requestVersion;
    controller = new AbortController();
    const requestController = controller;
    setBusy(true);
    status(append ? 'Loading older reports…' : 'Loading reports…');
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
      const next = new Map(append ? reports.map(report => [report.id, report]) : []);
      payload.reports.forEach(report => {
        if (!report || typeof report.id !== 'string' || !report.id) return;
        const normalized = {};
        fields.forEach(field => { normalized[field] = typeof report[field] === 'string' ? report[field] : ''; });
        next.set(normalized.id, normalized);
      });
      reports = Array.from(next.values()).sort((a, b) => (Date.parse(b.submitted_at) || 0) - (Date.parse(a.submitted_at) || 0));
      cursor = typeof payload.cursor === 'string' ? payload.cursor : '';
      const wasAuthenticated = authenticated;
      authenticated = true;
      byId('login-panel').hidden = true;
      byId('inbox').hidden = false;
      byId('sign-out').hidden = false;
      showDetail(reports.find(report => report.id === selectedId) || null);
      renderList();
      status(append ? 'Older reports loaded.' : 'Reports refreshed.');
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
