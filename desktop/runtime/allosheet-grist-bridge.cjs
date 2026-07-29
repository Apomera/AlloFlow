'use strict';

const DEFAULT_BASE_URL = 'http://127.0.0.1:8484';
const MAX_RECORDS = 200;
const MAX_CHANGES = 100;
const MAX_FIELDS_PER_RECORD = 40;
const MAX_CELL_CHARS = 4000;
const MAX_RESPONSE_BYTES = 4 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 10000;
const BLOCKED_FIELD_NAMES = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_SESSION_REDIRECTS = 5;
const MAX_SESSION_COOKIES = 12;
const MAX_COOKIE_HEADER_CHARS = 8192;
const MANAGED_WORKBOOK_NAME = 'AlloSheet';
const ELECTRON_KEY_PATTERN = /^[A-Za-z0-9_-]{20,128}$/;

class AlloSheetBridgeError extends Error {
  constructor(message, statusCode = 400, code = 'allosheet-request-failed') {
    super(message);
    this.name = 'AlloSheetBridgeError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

function safeMessage(value, maxLength = 300) {
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .slice(0, maxLength);
}

function isLoopbackHostname(hostname) {
  const value = String(hostname || '').toLowerCase();
  return value === 'localhost'
    || value === '127.0.0.1'
    || value === '::1'
    || value === '[::1]';
}

function normalizeBaseUrl(value, allowRemote) {
  let parsed;
  try {
    parsed = new URL(String(value || DEFAULT_BASE_URL));
  } catch (_) {
    throw new AlloSheetBridgeError('ALLOFLOW_GRIST_URL must be a valid HTTP or HTTPS URL.', 500, 'invalid-config');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new AlloSheetBridgeError('ALLOFLOW_GRIST_URL must use HTTP or HTTPS.', 500, 'invalid-config');
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new AlloSheetBridgeError('ALLOFLOW_GRIST_URL cannot contain credentials, a query, or a fragment.', 500, 'invalid-config');
  }
  if (!isLoopbackHostname(parsed.hostname)) {
    if (!allowRemote) {
      throw new AlloSheetBridgeError(
        'Remote Grist hosts are disabled. Set ALLOFLOW_GRIST_ALLOW_REMOTE=1 only for a trusted HTTPS deployment.',
        503,
        'remote-host-disabled'
      );
    }
    if (parsed.protocol !== 'https:') {
      throw new AlloSheetBridgeError('Remote Grist hosts must use HTTPS.', 500, 'invalid-config');
    }
  }
  parsed.pathname = parsed.pathname.replace(/\/+$/, '') + '/';
  return parsed;
}

function requireIdentifier(value, label) {
  const text = String(value == null ? '' : value).trim();
  if (!text || text.length > 180 || /[\/\\\u0000-\u001f\u007f]/.test(text)) {
    throw new AlloSheetBridgeError(`${label} is missing or invalid.`, 400, 'invalid-identifier');
  }
  return text;
}

function requireWorkspaceId(value) {
  const numericId = Number(value);
  if (!Number.isInteger(numericId) || numericId <= 0 || numericId > Number.MAX_SAFE_INTEGER) {
    throw new AlloSheetBridgeError(
      'The managed spreadsheet engine did not return a valid workspace.',
      502,
      'invalid-upstream-response'
    );
  }
  return numericId;
}

function managedDocumentId(document) {
  if (!document || typeof document !== 'object') return '';
  const candidate = document.urlId == null || document.urlId === ''
    ? document.id
    : document.urlId;
  try {
    return requireIdentifier(candidate, 'Document ID');
  } catch (_) {
    return '';
  }
}

function managedWorkbookFromWorkspaces(payload) {
  if (!Array.isArray(payload)) {
    throw new AlloSheetBridgeError(
      'The managed spreadsheet engine returned an unreadable workspace list.',
      502,
      'invalid-upstream-response'
    );
  }
  const usable = payload.filter((workspace) => {
    if (!workspace || typeof workspace !== 'object' || workspace.removedAt) return false;
    const numericId = Number(workspace.id);
    return Number.isInteger(numericId) && numericId > 0 && numericId <= Number.MAX_SAFE_INTEGER;
  });
  if (!usable.length) {
    throw new AlloSheetBridgeError(
      'The managed spreadsheet engine has no available workspace.',
      502,
      'managed-workspace-unavailable'
    );
  }
  const findDocument = (workspace) => (
    Array.isArray(workspace.docs) ? workspace.docs : []
  ).find((item) => (
      item
      && typeof item === 'object'
      && !item.removedAt
      && String(item.name || '').trim() === MANAGED_WORKBOOK_NAME
      && managedDocumentId(item)
    ));
  const home = usable.find((item) => String(item.name || '').trim().toLowerCase() === 'home');
  const orderedWorkspaces = home
    ? [home, ...usable.filter((item) => item !== home)]
    : usable;
  const workspaceWithDocument = orderedWorkspaces.find((item) => findDocument(item));
  const workspace = workspaceWithDocument || home || usable[0];
  const document = findDocument(workspace);
  return {
    workspaceId: requireWorkspaceId(workspace.id),
    docId: managedDocumentId(document)
  };
}

function managedEditorUrl(baseUrl, docId) {
  const safeDocId = requireIdentifier(docId, 'Document ID');
  const relativePath = `doc/${encodeURIComponent(safeDocId)}`;
  const editorUrl = new URL(relativePath, baseUrl);
  if (
    editorUrl.origin !== baseUrl.origin
    || (editorUrl.protocol !== 'http:' && editorUrl.protocol !== 'https:')
  ) {
    throw new AlloSheetBridgeError(
      'The managed spreadsheet engine returned an invalid workbook address.',
      502,
      'invalid-upstream-response'
    );
  }
  return editorUrl.toString();
}

function isScalar(value) {
  return value === null
    || typeof value === 'string'
    || typeof value === 'number'
    || typeof value === 'boolean';
}

function validateFieldName(value) {
  const field = String(value == null ? '' : value).trim();
  if (!field
    || field.length > 160
    || BLOCKED_FIELD_NAMES.has(field)
    || /[\/\\\u0000-\u001f\u007f]/.test(field)) {
    throw new AlloSheetBridgeError('A proposed field name is invalid.', 400, 'invalid-patch');
  }
  return field;
}

function validatePatchRecords(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_CHANGES) {
    throw new AlloSheetBridgeError(
      `A patch must contain between 1 and ${MAX_CHANGES} records.`,
      400,
      'invalid-patch'
    );
  }
  let totalChanges = 0;
  return value.map((record) => {
    const numericId = Number(record && record.id);
    if (!Number.isInteger(numericId) || numericId <= 0 || numericId > Number.MAX_SAFE_INTEGER) {
      throw new AlloSheetBridgeError('Every patch record must have a positive numeric Grist record ID.', 400, 'invalid-patch');
    }
    const sourceFields = record && record.fields;
    if (!sourceFields || typeof sourceFields !== 'object' || Array.isArray(sourceFields)) {
      throw new AlloSheetBridgeError('Every patch record must contain a fields object.', 400, 'invalid-patch');
    }
    const fieldNames = Object.keys(sourceFields);
    if (!fieldNames.length || fieldNames.length > MAX_FIELDS_PER_RECORD) {
      throw new AlloSheetBridgeError(
        `Every patch record must contain between 1 and ${MAX_FIELDS_PER_RECORD} fields.`,
        400,
        'invalid-patch'
      );
    }
    totalChanges += fieldNames.length;
    if (totalChanges > MAX_CHANGES) {
      throw new AlloSheetBridgeError(`A patch cannot contain more than ${MAX_CHANGES} cell changes.`, 400, 'invalid-patch');
    }
    const fields = Object.create(null);
    fieldNames.forEach((rawField) => {
      const field = validateFieldName(rawField);
      const cell = sourceFields[rawField];
      if (!isScalar(cell) || (typeof cell === 'number' && !Number.isFinite(cell))) {
        throw new AlloSheetBridgeError('AlloSheet patches accept only text, numbers, booleans, and blank values.', 400, 'invalid-patch');
      }
      fields[field] = typeof cell === 'string' ? cell.slice(0, MAX_CELL_CHARS) : cell;
    });
    return { id: numericId, fields };
  });
}

function extractUpstreamError(payload, fallback) {
  if (!payload || typeof payload !== 'object') return fallback;
  return safeMessage(payload.error || payload.message || fallback);
}

function getSetCookieHeaders(headers) {
  if (!headers) return [];
  if (typeof headers.getSetCookie === 'function') {
    const values = headers.getSetCookie();
    return Array.isArray(values) ? values.filter((value) => typeof value === 'string') : [];
  }
  const combined = typeof headers.get === 'function' ? headers.get('set-cookie') : '';
  if (!combined) return [];
  return String(combined)
    .split(/,(?=\s*[!#$%&'*+\-.^_`|~0-9A-Za-z]+=)/g)
    .map((value) => value.trim())
    .filter(Boolean);
}

function cookieHeaderFromJar(jar) {
  const header = Array.from(jar, ([name, value]) => `${name}=${value}`).join('; ');
  if (header.length > MAX_COOKIE_HEADER_CHARS) {
    throw new AlloSheetBridgeError(
      'The managed spreadsheet session exceeded its safety limit.',
      502,
      'managed-session-invalid'
    );
  }
  return header;
}

function applySetCookieHeaders(jar, headers) {
  getSetCookieHeaders(headers).forEach((setCookie) => {
    const raw = String(setCookie || '');
    if (!raw || raw.length > MAX_COOKIE_HEADER_CHARS || /[\r\n]/.test(raw)) {
      throw new AlloSheetBridgeError(
        'The managed spreadsheet engine returned an invalid session.',
        502,
        'managed-session-invalid'
      );
    }
    const parts = raw.split(';');
    const pair = parts.shift() || '';
    const separator = pair.indexOf('=');
    const name = separator > 0 ? pair.slice(0, separator).trim() : '';
    const value = separator > 0 ? pair.slice(separator + 1).trim() : '';
    if (
      !/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(name)
      || /[\u0000-\u001f\u007f;]/.test(value)
    ) {
      throw new AlloSheetBridgeError(
        'The managed spreadsheet engine returned an invalid session.',
        502,
        'managed-session-invalid'
      );
    }
    const attributes = parts.join(';').toLowerCase();
    if (/(?:^|;)\s*max-age\s*=\s*0(?:;|$)/.test(attributes)) {
      jar.delete(name);
    } else {
      jar.set(name, value);
    }
    if (jar.size > MAX_SESSION_COOKIES) {
      throw new AlloSheetBridgeError(
        'The managed spreadsheet session exceeded its safety limit.',
        502,
        'managed-session-invalid'
      );
    }
  });
  cookieHeaderFromJar(jar);
}

async function readBoundedResponseText(response) {
  const contentLengthValue = response
    && response.headers
    && typeof response.headers.get === 'function'
    ? response.headers.get('content-length')
    : '';
  const contentLength = Number(contentLengthValue);
  if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
    throw new AlloSheetBridgeError(
      'The Grist response exceeded the AlloSheet safety limit.',
      502,
      'response-too-large'
    );
  }

  if (response && response.body && typeof response.body.getReader === 'function') {
    const reader = response.body.getReader();
    const chunks = [];
    let totalBytes = 0;
    try {
      while (true) {
        const result = await reader.read();
        if (result.done) break;
        const chunk = result.value instanceof Uint8Array
          ? result.value
          : new Uint8Array(result.value || []);
        totalBytes += chunk.byteLength;
        if (totalBytes > MAX_RESPONSE_BYTES) {
          try { await reader.cancel(); } catch (_) {}
          throw new AlloSheetBridgeError(
            'The Grist response exceeded the AlloSheet safety limit.',
            502,
            'response-too-large'
          );
        }
        chunks.push(Buffer.from(chunk));
      }
    } finally {
      try { reader.releaseLock(); } catch (_) {}
    }
    return Buffer.concat(chunks, totalBytes).toString('utf8');
  }

  const raw = await response.text();
  if (Buffer.byteLength(raw, 'utf8') > MAX_RESPONSE_BYTES) {
    throw new AlloSheetBridgeError(
      'The Grist response exceeded the AlloSheet safety limit.',
      502,
      'response-too-large'
    );
  }
  return raw;
}

function createAlloSheetGristBridge(options = {}) {
  const env = options.env || process.env;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const connectionProvider = typeof options.connectionProvider === 'function'
    ? options.connectionProvider
    : null;
  const configuredApiKey = String(env.ALLOFLOW_GRIST_API_KEY || '').trim();
  const allowRemote = String(env.ALLOFLOW_GRIST_ALLOW_REMOTE || '') === '1';
  let managedSessionOrigin = '';
  let managedSessionCredential = '';
  let managedSessionCookies = new Map();
  let managedSessionPromise = null;
  let managedSessionPromiseOrigin = '';
  let managedSessionPromiseCredential = '';
  let managedWorkbookOrigin = '';
  let managedWorkbookCredential = '';
  let managedWorkbookBinding = null;
  let managedWorkbookPromise = null;
  let configuredBaseUrl;
  let configuredError = null;
  try {
    configuredBaseUrl = normalizeBaseUrl(env.ALLOFLOW_GRIST_URL || DEFAULT_BASE_URL, allowRemote);
  } catch (error) {
    configuredError = error;
    configuredBaseUrl = new URL(DEFAULT_BASE_URL + '/');
  }

  function resolveConnection() {
    if (connectionProvider) {
      let provided;
      try {
        provided = connectionProvider();
      } catch (error) {
        return {
          baseUrl: new URL(DEFAULT_BASE_URL + '/'),
          apiKey: '',
          bootstrapSession: false,
          managed: true,
          electronKey: '',
          sessionCookieName: '',
          configError: new AlloSheetBridgeError(
            safeMessage(error && error.message || 'The managed Grist connection is unavailable.'),
            503,
            'managed-engine-unavailable'
          )
        };
      }
      if (provided && provided.baseUrl) {
        try {
          const baseUrl = normalizeBaseUrl(provided.baseUrl, Boolean(provided.allowRemote));
          const bootstrapSession = Boolean(provided.bootstrapSession);
          const electronKey = String(provided.electronKey || '');
          const sessionCookieName = String(provided.sessionCookieName || '');
          if (provided.allowUnauthenticated) {
            throw new AlloSheetBridgeError(
              'Unauthenticated managed Grist access is not supported.',
              500,
              'invalid-config'
            );
          }
          if (bootstrapSession && (!provided.managed || !isLoopbackHostname(baseUrl.hostname))) {
            throw new AlloSheetBridgeError(
              'Managed Grist session bootstrap is allowed only for the Desktop-managed loopback engine.',
              500,
              'invalid-config'
            );
          }
          if (
            bootstrapSession
            && (
              !ELECTRON_KEY_PATTERN.test(electronKey)
              || !/^[!#$%&'*+\-.^_`|~0-9A-Za-z]{1,128}$/.test(sessionCookieName)
            )
          ) {
            throw new AlloSheetBridgeError(
              'The managed Grist private session is unavailable.',
              503,
              'managed-engine-unavailable'
            );
          }
          return {
            baseUrl,
            apiKey: String(provided.apiKey || '').trim(),
            bootstrapSession,
            managed: Boolean(provided.managed),
            electronKey,
            sessionCookieName,
            configError: null
          };
        } catch (error) {
          return {
            baseUrl: new URL(DEFAULT_BASE_URL + '/'),
            apiKey: '',
            bootstrapSession: false,
            managed: Boolean(provided.managed),
            electronKey: '',
            sessionCookieName: '',
            configError: error
          };
        }
      }
    }
    return {
      baseUrl: configuredBaseUrl,
      apiKey: configuredApiKey,
      bootstrapSession: false,
      managed: false,
      electronKey: '',
      sessionCookieName: '',
      configError: configuredError
    };
  }

  function getPublicConfig() {
    const connection = resolveConnection();
    const configured = !connection.configError
      && Boolean(connection.apiKey || connection.bootstrapSession);
    return {
      configured,
      baseUrl: connection.baseUrl.toString().replace(/\/+$/, ''),
      maxRecords: MAX_RECORDS,
      adapter: 'grist-rest-v1',
      managedEngine: connection.managed,
      mode: connection.managed ? 'managed-local' : 'external',
      message: connection.configError
        ? connection.configError.message
        : (!configured
          ? 'The local spreadsheet engine is not running yet.'
          : (connection.managed
            ? 'The private local spreadsheet engine is ready.'
            : 'The server-side Grist adapter is configured.'))
    };
  }

  function privateSessionIdentity(connection) {
    if (!connection || !connection.bootstrapSession) return '';
    return String(connection.electronKey || '')
      + '\u0000'
      + String(connection.sessionCookieName || '');
  }

  function resetManagedSession(origin = '', credential = '') {
    managedSessionOrigin = origin;
    managedSessionCredential = credential;
    managedSessionCookies = new Map();
    managedSessionPromise = null;
    managedSessionPromiseOrigin = '';
    managedSessionPromiseCredential = '';
  }

  async function discardResponseBody(response) {
    if (!response) return;
    if (response.body && typeof response.body.cancel === 'function') {
      try {
        await response.body.cancel();
      } catch (_) {
        // A closed redirect body needs no further cleanup.
      }
      return;
    }
    if (typeof response.text === 'function') {
      try {
        await response.text();
      } catch (_) {
        // A closed redirect body needs no further cleanup.
      }
    }
  }

  async function bootstrapManagedSession(connection) {
    const origin = connection.baseUrl.origin;
    const jar = new Map([['electron_key', connection.electronKey]]);
    let target = new URL('/', connection.baseUrl);

    for (let redirectCount = 0; redirectCount <= MAX_SESSION_REDIRECTS; redirectCount += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      let response;
      try {
        const cookie = cookieHeaderFromJar(jar);
        response = await fetchImpl(target, {
          method: 'GET',
          redirect: 'manual',
          signal: controller.signal,
          headers: {
            Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1',
            ...(cookie ? { Cookie: cookie } : {})
          }
        });
      } catch (error) {
        if (error && error.name === 'AbortError') {
          throw new AlloSheetBridgeError(
            'The managed spreadsheet session timed out.',
            504,
            'managed-session-timeout'
          );
        }
        throw new AlloSheetBridgeError(
          'The managed spreadsheet session could not be established.',
          502,
          'managed-session-failed'
        );
      } finally {
        clearTimeout(timeout);
      }

      applySetCookieHeaders(jar, response.headers);
      const status = Number(response.status);
      const location = response.headers && typeof response.headers.get === 'function'
        ? response.headers.get('location')
        : '';
      if (status >= 300 && status < 400) {
        await discardResponseBody(response);
        if (!location || redirectCount === MAX_SESSION_REDIRECTS) {
          throw new AlloSheetBridgeError(
            'The managed spreadsheet session returned too many redirects.',
            502,
            'managed-session-failed'
          );
        }
        const next = new URL(location, target);
        if (next.origin !== origin) {
          throw new AlloSheetBridgeError(
            'The managed spreadsheet session attempted to leave the local engine.',
            502,
            'managed-session-failed'
          );
        }
        target = next;
        continue;
      }

      await discardResponseBody(response);
      if (!response.ok || jar.size < 2 || !jar.has(connection.sessionCookieName)) {
        throw new AlloSheetBridgeError(
          'The managed spreadsheet session could not be established.',
          502,
          'managed-session-failed'
        );
      }
      return jar;
    }
    throw new AlloSheetBridgeError(
      'The managed spreadsheet session could not be established.',
      502,
      'managed-session-failed'
    );
  }

  async function ensureManagedSession(connection) {
    if (!connection.bootstrapSession) return '';
    const origin = connection.baseUrl.origin;
    const credential = privateSessionIdentity(connection);
    if (managedSessionOrigin !== origin || managedSessionCredential !== credential) {
      resetManagedSession(origin, credential);
    }
    if (managedSessionCookies.size) return cookieHeaderFromJar(managedSessionCookies);
    if (
      managedSessionPromise
      && managedSessionPromiseOrigin === origin
      && managedSessionPromiseCredential === credential
    ) {
      await managedSessionPromise;
      return cookieHeaderFromJar(managedSessionCookies);
    }

    managedSessionPromiseOrigin = origin;
    managedSessionPromiseCredential = credential;
    const pending = bootstrapManagedSession(connection).then((cookies) => {
      if (managedSessionOrigin === origin && managedSessionCredential === credential) {
        managedSessionCookies = cookies;
      }
    });
    managedSessionPromise = pending;
    try {
      await pending;
    } finally {
      if (managedSessionPromise === pending) {
        managedSessionPromise = null;
        managedSessionPromiseOrigin = '';
        managedSessionPromiseCredential = '';
      }
    }
    return cookieHeaderFromJar(managedSessionCookies);
  }

  async function requestGrist(
    relativePath, init = {}, expectedOrigin = '', expectedCredential = ''
  ) {
    const connection = resolveConnection();
    if (connection.configError) throw connection.configError;
    if (
      expectedOrigin
      && (
        connection.baseUrl.origin !== expectedOrigin
        || expectedCredential && privateSessionIdentity(connection) !== expectedCredential
      )
    ) {
      throw new AlloSheetBridgeError(
        'The managed spreadsheet engine changed while the workbook was preparing.',
        503,
        'managed-engine-unavailable'
      );
    }
    if (!connection.apiKey && !connection.bootstrapSession) {
      throw new AlloSheetBridgeError(
        'The local spreadsheet engine is not running and no external Grist connection is configured.',
        503,
        'grist-not-configured'
      );
    }
    if (typeof fetchImpl !== 'function') {
      throw new AlloSheetBridgeError('This desktop runtime cannot make Grist requests.', 500, 'fetch-unavailable');
    }

    const target = new URL(String(relativePath || '').replace(/^\/+/, ''), connection.baseUrl);
    if (target.origin !== connection.baseUrl.origin) {
      throw new AlloSheetBridgeError('The requested Grist route is invalid.', 400, 'invalid-route');
    }
    let response;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const cookie = await ensureManagedSession(connection);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        response = await fetchImpl(target, {
          ...init,
          redirect: 'error',
          signal: controller.signal,
          headers: {
            ...(init.headers || {}),
            Accept: 'application/json',
            ...(connection.apiKey ? { Authorization: `Bearer ${connection.apiKey}` } : {}),
            ...(cookie ? { Cookie: cookie } : {})
          }
        });
      } catch (error) {
        if (error && error.name === 'AbortError') {
          throw new AlloSheetBridgeError('The Grist request timed out.', 504, 'grist-timeout');
        }
        throw new AlloSheetBridgeError('The configured Grist service could not be reached.', 502, 'grist-unreachable');
      } finally {
        clearTimeout(timeout);
      }

      if (
        connection.bootstrapSession
        && attempt === 0
        && (response.status === 401 || response.status === 403)
      ) {
        await discardResponseBody(response);
        resetManagedSession(connection.baseUrl.origin, privateSessionIdentity(connection));
        continue;
      }
      break;
    }

    if (
      connection.bootstrapSession
      && managedSessionOrigin === connection.baseUrl.origin
      && managedSessionCredential === privateSessionIdentity(connection)
    ) {
      applySetCookieHeaders(managedSessionCookies, response.headers);
    }
    const raw = await readBoundedResponseText(response);
    let payload = {};
    if (raw) {
      try {
        payload = JSON.parse(raw);
      } catch (_) {
        throw new AlloSheetBridgeError('Grist returned an unreadable response.', 502, 'invalid-upstream-response');
      }
    }
    if (!response.ok) {
      const upstreamStatus = Number(response.status);
      throw new AlloSheetBridgeError(
        extractUpstreamError(payload, `Grist returned HTTP ${upstreamStatus || 'error'}.`),
        502,
        'grist-upstream-error'
      );
    }
    return payload;
  }

  function requireManagedWorkbookConnection() {
    const connection = resolveConnection();
    if (connection.configError) throw connection.configError;
    if (
      !connection.managed
      || !connection.bootstrapSession
      || !isLoopbackHostname(connection.baseUrl.hostname)
    ) {
      throw new AlloSheetBridgeError(
        'Automatic workbook preparation is available only for the Desktop-managed local engine.',
        503,
        'managed-workbook-unavailable'
      );
    }
    return connection;
  }

  async function provisionManagedWorkbook(connection) {
    const origin = connection.baseUrl.origin;
    const credential = privateSessionIdentity(connection);
    const listWorkspaces = () => requestGrist(
      'api/orgs/current/workspaces', {}, origin, credential
    );
    let selection = managedWorkbookFromWorkspaces(await listWorkspaces());
    if (selection.docId) {
      return {
        docId: selection.docId,
        editorUrl: managedEditorUrl(connection.baseUrl, selection.docId)
      };
    }

    let createdId;
    let createError = null;
    try {
      createdId = requireIdentifier(
        await requestGrist(
          `api/workspaces/${selection.workspaceId}/docs`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: MANAGED_WORKBOOK_NAME, isPinned: true })
          },
          origin,
          credential
        ),
        'Document ID'
      );
    } catch (error) {
      createError = error;
    }

    if (!createdId) {
      selection = managedWorkbookFromWorkspaces(await listWorkspaces());
      if (!selection.docId) throw createError;
      createdId = selection.docId;
    }
    return {
      docId: createdId,
      editorUrl: managedEditorUrl(connection.baseUrl, createdId)
    };
  }

  async function ensureManagedWorkbook() {
    const connection = requireManagedWorkbookConnection();
    const origin = connection.baseUrl.origin;
    const credential = privateSessionIdentity(connection);
    if (managedWorkbookOrigin !== origin || managedWorkbookCredential !== credential) {
      managedWorkbookOrigin = origin;
      managedWorkbookCredential = credential;
      managedWorkbookBinding = null;
      managedWorkbookPromise = null;
    }
    if (managedWorkbookBinding) return { ...managedWorkbookBinding };
    if (managedWorkbookPromise) return { ...(await managedWorkbookPromise) };

    const pending = provisionManagedWorkbook(connection);
    managedWorkbookPromise = pending;
    try {
      const binding = await pending;
      if (
        managedWorkbookOrigin === origin
        && managedWorkbookCredential === credential
      ) {
        managedWorkbookBinding = Object.freeze({ ...binding });
      }
      return { ...binding };
    } finally {
      if (managedWorkbookPromise === pending) managedWorkbookPromise = null;
    }
  }

  async function handleOperation(body) {
    const operation = String(body && body.operation || '');
    if (operation === 'status') {
      await requestGrist('api/orgs');
      const connection = resolveConnection();
      return {
        connected: true,
        baseUrl: connection.baseUrl.toString().replace(/\/+$/, ''),
        managedEngine: connection.managed,
        adapter: 'grist-rest-v1'
      };
    }

    const docId = requireIdentifier(body && body.docId, 'Document ID');
    if (operation === 'listTables') {
      return requestGrist(`api/docs/${encodeURIComponent(docId)}/tables`);
    }

    const tableId = requireIdentifier(body && body.tableId, 'Table ID');
    if (operation === 'readRecords') {
      const requestedLimit = Number(body && body.limit);
      const limit = Number.isFinite(requestedLimit)
        ? Math.max(1, Math.min(MAX_RECORDS, Math.floor(requestedLimit)))
        : MAX_RECORDS;
      return requestGrist(
        `api/docs/${encodeURIComponent(docId)}/tables/${encodeURIComponent(tableId)}/records?limit=${limit}`
      );
    }

    if (operation === 'applyUpdates') {
      const records = validatePatchRecords(body && body.records);
      return requestGrist(
        `api/docs/${encodeURIComponent(docId)}/tables/${encodeURIComponent(tableId)}/records`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ records })
        }
      );
    }

    throw new AlloSheetBridgeError('That AlloSheet operation is not allowed.', 400, 'operation-not-allowed');
  }

  return {
    ensureManagedWorkbook,
    getPublicConfig,
    handleOperation
  };
}

module.exports = {
  AlloSheetBridgeError,
  createAlloSheetGristBridge,
  isLoopbackHostname,
  normalizeBaseUrl,
  validatePatchRecords
};
