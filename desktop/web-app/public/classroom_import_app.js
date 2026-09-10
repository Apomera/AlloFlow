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
      const converted = service.convertSnapshot(snapshot, { destinationRoster: null });
      if (epoch !== generation) return;
      result = converted;
      missingNames = converted.preview.some(student => typeof student.fullName !== 'string' || !student.fullName.trim());
      for (const student of converted.preview) {
        const row = document.createElement('tr');
        for (const value of [student.fullName && student.fullName.trim() ? student.fullName : 'Name unavailable — verify in Classroom', student.codename]) {
          const cell = document.createElement('td'); cell.textContent = value; row.appendChild(cell);
        }
        $('roster-preview').appendChild(row);
      }
      $('preview-count').textContent = converted.studentCount + ' students read. Compare this list with the selected Classroom roster.';
      $('preview-section').hidden = false;
      $('missing-name-warning').hidden = !missingNames;
      say(missingNames ? 'Some Classroom names are unavailable. Download is blocked until you resolve these identities in Classroom and read the roster again.' : 'The private preview is ready. Confirm the list and new-class destination before downloading.');
      $('confirm-new-class').focus();
    } catch (_) {
      if (epoch === generation) {
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
