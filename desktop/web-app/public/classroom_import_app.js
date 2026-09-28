/* AlloFlow's shipped, teacher-only Google Classroom import page. No persistent personal data. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const service = window.AlloModules && window.AlloModules.GoogleClassroomImport;
  const config = window.ALLOFLOW_CLASSROOM_IMPORT_CONFIG || {};
  const scopes = service && service.READONLY_SCOPES;
  let connector = null, token = '', tokenExpires = 0, timer = null;
  let generation = 0, busy = false, authReady = false, courses = [], result = null;
  let missingNames = false;
  const downloadUrls = new Set();
  // In-app handoff (2026-09-25): when AlloFlow opened this helper as a same-origin window, the
  // codename-only JSON can be posted straight back instead of downloaded. Nothing about the
  // private preview, token or snapshot is ever posted. A cross-origin opener is ignored.
  const handoff = (() => {
    try {
      const opener = window.opener;
      if (!opener || opener === window || opener.closed) return null;
      return opener.location.origin === location.origin ? opener : null;
    } catch (_) { return null; }
  })();
  let handoffEpoch = 0, handoffTimer = null;
  // Linked sync: AlloFlow answers this helper's hello with the class's device-held key. It stays
  // in this tab's memory, is used only to derive IDs, and is never logged, shown or downloaded.
  let linkContext = null;
  const confirmOriginal = $('confirm-text').cloneNode(true);
  function linkMode() { return linkContext ? linkContext.mode : 'replace'; }
  function describeMode() {
    const mode = linkMode();
    $('send-classroom').textContent = mode === 'sync' ? 'Send update to AlloFlow' : mode === 'link' ? 'Send to AlloFlow and link this class' : 'Send to the AlloFlow tab';
    if (mode === 'sync') {
      $('confirm-text').textContent = 'I reviewed the roster. AlloFlow will list every change for my confirmation before anything is updated.';
      $('handoff-note').textContent = 'Opened from a linked AlloFlow class. Returning students keep their codenames; only the codename-only roster goes back to AlloFlow.';
    } else {
      $('confirm-text').replaceChildren(...confirmOriginal.cloneNode(true).childNodes);
      $('handoff-note').textContent = mode === 'link'
        ? 'Opened from AlloFlow. Sending links this class to Google Classroom on that device, so later syncs keep every codename. Only the codename-only roster goes back.'
        : 'This helper was opened from AlloFlow. Sending hands the same codename-only roster to that tab for your confirmation; nothing else leaves this page.';
    }
  }
  const say = message => { $('import-status').textContent = message; };
  function configured() {
    const safeOrigin = location.protocol === 'https:' ||
      (location.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname));
    return window.self === window.top && safeOrigin && service && Array.isArray(scopes) &&
      config && typeof config === 'object' && !Array.isArray(config) &&
      Object.keys(config).every(key => ['enabled', 'reviewedDeployment', 'clientId', 'allowedOrigins', 'allowedAccountIds'].includes(key)) &&
      config.enabled === true && config.reviewedDeployment === true &&
      typeof config.clientId === 'string' && /^[A-Za-z0-9._-]+\.apps\.googleusercontent\.com$/.test(config.clientId) &&
      (config.allowedAccountIds === undefined || (Array.isArray(config.allowedAccountIds) && config.allowedAccountIds.length <= 250 &&
        config.allowedAccountIds.every(id => typeof id === 'string' && /^[A-Za-z0-9_-]{1,160}$/.test(id)))) &&
      Array.isArray(config.allowedOrigins) && config.allowedOrigins.includes(location.origin);
  }
  function controls() {
    $('connect-classroom').disabled = !authReady || busy;
    $('clear-classroom').disabled = !token && !busy && !result;
    $('revoke-classroom').disabled = !token || busy;
    $('classroom-course').disabled = busy;
    $('read-classroom').disabled = busy || !token || !$('classroom-course').value;
    $('cancel-classroom').disabled = !busy;
    $('download-classroom').disabled = busy || !result || missingNames || !$('confirm-new-class').checked;
    $('send-classroom').hidden = !handoff;
    $('handoff-note').hidden = !handoff;
    $('send-classroom').disabled = !handoff || busy || !result || missingNames || !$('confirm-new-class').checked;
    $('download-classroom').hidden = !!linkContext;
    if (linkContext) $('download-classroom').disabled = true;
  }
  function clearPreview() {
    result = null;
    missingNames = false;
    $('roster-preview').replaceChildren();
    $('missing-name-warning').hidden = true;
    $('preview-count').textContent = '';
    $('preview-section').hidden = true;
    $('confirm-new-class').checked = false;
  }
  function clearSession(message) {
    generation++;
    if (timer !== null) clearTimeout(timer);
    timer = null;
    if (connector) connector.dispose();
    connector = null; token = ''; tokenExpires = 0; busy = false; courses = [];
    for (const url of downloadUrls) URL.revokeObjectURL(url);
    downloadUrls.clear();
    clearPreview();
    $('classroom-course').replaceChildren(new Option('Choose a class', ''));
    $('course-section').hidden = true;
    controls();
    if (message) say(message);
  }
  function showCourses(items) {
    courses = items;
    $('classroom-course').replaceChildren(new Option('Choose a class', ''));
    for (const course of courses) {
      $('classroom-course').add(new Option(course.name + (course.section ? ' · ' + course.section : ''), course.id));
    }
    $('course-section').hidden = false;
  }
  async function acceptToken(response, epoch) {
    if (epoch !== generation) return;
    const expires = Number(response && response.expires_in);
    let scopesGranted = false;
    try { scopesGranted = !!response && google.accounts.oauth2.hasGrantedAllScopes(response, ...scopes); } catch (_) { /* Authorization failures stay redacted. */ }
    if (!response || response.error || typeof response.access_token !== 'string' ||
        !response.access_token || !Number.isFinite(expires) || expires <= 10 ||
        !scopesGranted) {
      clearSession('Google authorization was not completed with both read-only permissions. Nothing was imported.');
      return;
    }
    token = response.access_token;
    tokenExpires = Date.now() + Math.min(expires - 10, 3600) * 1000;
    timer = setTimeout(() => clearSession('Google access expired. The private preview was cleared. Connect again to continue.'), tokenExpires - Date.now());
    try {
      connector = service.createConnector({
        fetchImpl: window.fetch.bind(window),
        getAccessToken: () => {
          if (epoch !== generation || !token || Date.now() >= tokenExpires) throw new Error('AUTH_REQUIRED');
          return token;
        },
        ...(Array.isArray(config.allowedAccountIds) && config.allowedAccountIds.length ? { allowedAccountIds: config.allowedAccountIds.slice() } : {})
      });
      say('Loading the classes taught by this account…');
      const listing = await connector.listTeacherCourses();
      if (epoch !== generation) return;
      if (listing.status !== 'complete') throw new Error('INCOMPLETE');
      showCourses(listing.courses);
      say(courses.length ? 'Connected. Choose one class to read its roster.' : 'No eligible classes were returned for this teacher account.');
      if (linkContext && linkContext.mode === 'sync' && courses.length && typeof service.linkedClassIds === 'function') {
        try {
          const ids = await service.linkedClassIds(linkContext.syncKey, courses.map(course => course.id));
          if (epoch !== generation) return;
          const match = courses.find(course => ids[course.id] === linkContext.classId);
          if (match) { $('classroom-course').value = match.id; say('Connected. The Classroom class linked to this AlloFlow class is selected.'); }
          else say('None of the classes this account teaches is the one linked to this AlloFlow class. Sign in with the teacher account that linked it.');
        } catch (_) { /* Selection stays manual; the read still refuses a mismatched class. */ }
      }
      $('classroom-course').focus();
    } catch (_) {
      if (epoch === generation) clearSession('Classroom could not be read. Check school approval, account access and connection, then reconnect. No roster was exported.');
    } finally {
      if (epoch === generation) { busy = false; controls(); }
    }
  }
  $('connect-classroom').onclick = function () {
    if (!authReady || busy) return;
    clearSession();
    busy = true; controls();
    const epoch = generation;
    let callbackHandled = false;
    say('Choose your school teacher account and review Google’s read-only permissions.');
    try {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: config.clientId,
        scope: scopes.join(' '),
        include_granted_scopes: false,
        callback: response => {
          if (callbackHandled || epoch !== generation) return;
          callbackHandled = true;
          void acceptToken(response, epoch);
        },
        error_callback: () => {
          if (callbackHandled || epoch !== generation) return;
          callbackHandled = true;
          clearSession('The Google window was closed or could not open. No roster was read. Connect again when ready.');
        }
      });
      client.requestAccessToken({ prompt: 'select_account' });
    } catch (_) {
      if (epoch === generation) clearSession('Google sign-in could not start. Check this deployment’s settings and allow the sign-in window.');
    }
  };
  $('classroom-course').onchange = function () { clearPreview(); controls(); };
  $('read-classroom').onclick = async function () {
    const courseId = $('classroom-course').value;
    if (busy || !connector || !courses.some(course => course.id === courseId)) return;
    clearPreview(); busy = true; controls();
    const epoch = generation;
    say('Reading every roster page. Nothing will be exported until you review the complete result.');
    try {
      const snapshot = await connector.readSelectedCourse({ courseId });
      if (epoch !== generation) return;
      const mode = linkMode();
      const converted = mode === 'replace' || typeof service.convertLinkedSnapshot !== 'function'
        ? service.convertSnapshot(snapshot, { destinationRoster: null })
        : await service.convertLinkedSnapshot(snapshot, { syncKey: linkContext.syncKey, classId: mode === 'sync' ? linkContext.classId : null, existing: mode === 'sync' ? linkContext.existing : {} });
      if (epoch !== generation) return;
      result = converted;
      missingNames = converted.preview.some(student => typeof student.fullName !== 'string' || !student.fullName.trim());
      for (const student of converted.preview) {
        const row = document.createElement('tr');
        for (const value of [student.fullName && student.fullName.trim() ? student.fullName : 'Name unavailable — verify in Classroom', student.codename + (student.status === 'new' && linkMode() === 'sync' ? ' · new' : '')]) {
          const cell = document.createElement('td'); cell.textContent = value; row.appendChild(cell);
        }
        $('roster-preview').appendChild(row);
      }
      $('preview-count').textContent = linkMode() === 'sync'
        ? converted.studentCount + ' students read: ' + converted.returningCount + ' keep their codenames, ' + converted.newCount + ' new' +
          (converted.absentCount ? ', and ' + converted.absentCount + ' in AlloFlow are no longer in this Classroom class (AlloFlow keeps them).' : '.')
        : converted.studentCount + ' students read. Compare this list with the selected Classroom roster.' +
          (linkMode() === 'link' ? ' Sending links this class so later syncs keep every codename.' : '');
      $('preview-section').hidden = false;
      $('missing-name-warning').hidden = !missingNames;
      say(missingNames ? 'Some Classroom names are unavailable. Download is blocked until you resolve these identities in Classroom and read the roster again.' : 'The private preview is ready. Confirm the list and new-class destination before downloading.');
      $('confirm-new-class').focus();
    } catch (error) {
      if (epoch === generation && error && error.code === 'LINKED_CLASS_MISMATCH') {
        clearPreview();
        say('This AlloFlow class is linked to a different Google Classroom class. Choose the class it was linked to. Nothing was read into AlloFlow.');
      } else if (epoch === generation) {
        clearSession('The selected roster could not be completed or verified. Private data was cleared and nothing was exported. Reconnect to retry.');
      }
    } finally {
      if (epoch === generation) { busy = false; controls(); }
    }
  };
  $('confirm-new-class').onchange = controls;
  $('download-classroom').onclick = function () {
    if (busy || !result || missingNames || !$('confirm-new-class').checked) return;
    let url = null, anchor = null;
    try {
      url = URL.createObjectURL(new Blob([result.json], { type: 'application/json' }));
      downloadUrls.add(url);
      anchor = document.createElement('a');
      anchor.href = url; anchor.download = 'alloflow-classroom-roster.json';
      document.body.appendChild(anchor); anchor.click();
    } catch (_) {
      if (url) { URL.revokeObjectURL(url); downloadUrls.delete(url); }
      say('The download could not start. Your private preview remains available; try downloading again.');
      return;
    } finally { if (anchor) anchor.remove(); }
    setTimeout(() => { if (downloadUrls.delete(url)) URL.revokeObjectURL(url); }, 1000);
    $('confirm-new-class').checked = false; controls();
    say('Codename-only roster downloaded. In AlloFlow, open a new class and choose the replacement roster-file import. Keep this private preview only as long as needed.');
  };
  $('send-classroom').onclick = function () {
    if (!handoff || busy || !result || missingNames || !$('confirm-new-class').checked) return;
    const epoch = ++handoffEpoch;
    try {
      handoff.postMessage({ type: 'alloflow-classroom-roster', json: result.json, mode: linkMode() }, location.origin);
    } catch (_) {
      say('The roster could not be sent to AlloFlow. Download it instead.');
      return;
    }
    $('confirm-new-class').checked = false; controls();
    say(linkMode() === 'sync' ? 'Update sent. Switch to the AlloFlow tab to review and confirm the changes.' : 'Roster sent. Switch to the AlloFlow tab and confirm the replacement there.');
    try { handoff.focus(); } catch (_) {}
    if (handoffTimer) clearTimeout(handoffTimer);
    handoffTimer = setTimeout(() => {
      if (epoch !== handoffEpoch) return;
      say('AlloFlow has not confirmed the roster yet. If nothing appeared there, download the roster instead.');
    }, 20000);
  };
  // Once AlloFlow has the roster this tab's job is done: close it so the teacher
  // lands back in AlloFlow (any review happens there), taking the private preview
  // with it. A browser that will not close the tab gets a plain instruction.
  const returnToAlloFlow = note => {
    clearSession(note + ' Returning you to AlloFlow…');
    setTimeout(() => {
      try { handoff.focus(); } catch (_) {}
      try { window.close(); } catch (_) {}
      setTimeout(() => { if (!window.closed) say(note + ' You can close this tab and go back to AlloFlow.'); }, 400);
    }, 900);
  };
  window.addEventListener('message', event => {
    if (!handoff || event.origin !== location.origin || event.source !== handoff) return;
    const data = event.data;
    if (data && typeof data === 'object' && data.type === 'alloflow-classroom-context') {
      const existing = data.existing;
      const valid = (data.mode === 'link' || data.mode === 'sync') && typeof data.syncKey === 'string' && /^[A-Za-z0-9_-]{43}$/.test(data.syncKey) &&
        existing && typeof existing === 'object' && !Array.isArray(existing) &&
        (data.mode === 'link' ? data.classId === null && Object.keys(existing).length === 0 : typeof data.classId === 'string' && data.classId.length <= 60);
      if (!valid) return;
      linkContext = Object.freeze({ mode: data.mode, syncKey: data.syncKey, classId: data.classId, existing: Object.freeze({ ...existing }) });
      if (result) { clearPreview(); say('AlloFlow updated this helper’s class link. Read the roster again.'); }
      describeMode(); controls();
      return;
    }
    if (!data || typeof data !== 'object' || data.type !== 'alloflow-classroom-roster-received') return;
    if (handoffTimer) { clearTimeout(handoffTimer); handoffTimer = null; }
    const message = String(data.message || '').slice(0, 320);
    if (data.ok) { returnToAlloFlow(data.pending === true ? 'AlloFlow has the roster. Confirm it there.' : (linkMode() === 'sync' ? 'AlloFlow received the update.' : 'AlloFlow imported the roster.')); return; }
    say('AlloFlow did not import the roster. ' + (message || 'Download the roster instead.'));
  });
  $('clear-classroom').onclick = () => clearSession('Session cleared. Local access token and private roster preview were discarded. Google’s authorization grant still exists until revoked.');
  $('cancel-classroom').onclick = () => clearSession('Import cancelled and private data cleared. Late responses cannot restore the preview.');
  $('revoke-classroom').onclick = function () {
    if (!token || busy || !window.confirm('Revoke Google access granted to this AlloFlow import helper?')) return;
    const revokeToken = token;
    clearSession('Cleared this session. Requesting revocation from Google…');
    const epoch = generation;
    try {
      google.accounts.oauth2.revoke(revokeToken, response => {
        if (epoch !== generation) return;
        say(response && response.successful ? 'Google confirmed access was revoked. Session data is cleared.' : 'Session data is cleared, but revocation was not confirmed. Review third-party access in your Google account.');
      });
    } catch (_) { say('Session data is cleared, but revocation was not confirmed. Review third-party access in your Google account.'); }
  };
  window.addEventListener('pagehide', () => clearSession());
  describeMode();
  if (handoff) { try { handoff.postMessage({ type: 'alloflow-classroom-hello' }, location.origin); } catch (_) { /* Download remains available. */ } }
  if (!configured()) {
    say('Not configured for Google access. The AlloFlow helper is installed; school deployment review and an approved OAuth client are still required.');
    controls(); return;
  }
  $('setup-note').textContent = 'This deployment is configured. Continue only with school approval, using your teacher account and a private screen.';
  say('Loading Google’s authorization library…');
  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client'; script.async = true;
  script.onload = () => {
    authReady = !!(window.google && google.accounts && google.accounts.oauth2);
    say(authReady ? 'Ready to connect. No Classroom data has been requested.' : 'Google authorization did not load. No Classroom data was requested.');
    controls();
  };
  script.onerror = () => say('Google authorization could not load. Check the connection and school deployment settings.');
  document.head.appendChild(script);
}());
