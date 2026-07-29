'use strict';

/**
 * Managed, local Grist server used by AlloSheet.
 *
 * The manager deliberately does not know about Electron routes or AlloSheet
 * documents.  It owns only the pinned program, app-private data directories,
 * loopback process lifecycle, and bounded diagnostic logs.  Network, archive
 * extraction, health probing, process spawning, and termination are injectable
 * so this module can be unit-tested without downloading or executing Grist.
 */

const crypto = require('node:crypto');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { spawn: nodeSpawn } = require('node:child_process');

const LOOPBACK_HOST = '127.0.0.1';
const DEFAULT_MAX_ARCHIVE_BYTES = 768 * 1024 * 1024;
const DEFAULT_MAX_EXTRACTED_BYTES = 2 * 1024 * 1024 * 1024;
const DEFAULT_MAX_EXTRACTED_ENTRIES = 150000;
const DEFAULT_MAX_LOG_ENTRIES = 250;
const DEFAULT_PROBE_TIMEOUT_MS = 3000;
const DEFAULT_TERMINATION_TIMEOUT_MS = 3000;
const DEFAULT_AUTH_HANDSHAKE_TIMEOUT_MS = 15000;
const AUTH_MESSAGE_TYPE = 'alloflow-allosheet-grist-auth-v1';
const ELECTRON_KEY_PATTERN = /^[A-Za-z0-9_-]{20,128}$/;
const COOKIE_NAME_PATTERN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]{1,128}$/;
const CHILD_ENV_ALLOWLIST = new Map([
  ['all_proxy', 'ALL_PROXY'],
  ['appdata', 'APPDATA'],
  ['commonprogramfiles', 'CommonProgramFiles'],
  ['commonprogramfiles(x86)', 'CommonProgramFiles(x86)'],
  ['comspec', 'COMSPEC'],
  ['home', 'HOME'],
  ['homedrive', 'HOMEDRIVE'],
  ['homepath', 'HOMEPATH'],
  ['http_proxy', 'HTTP_PROXY'],
  ['https_proxy', 'HTTPS_PROXY'],
  ['lang', 'LANG'],
  ['lc_all', 'LC_ALL'],
  ['localappdata', 'LOCALAPPDATA'],
  ['no_proxy', 'NO_PROXY'],
  ['node_extra_ca_certs', 'NODE_EXTRA_CA_CERTS'],
  ['path', 'PATH'],
  ['pathext', 'PATHEXT'],
  ['programdata', 'PROGRAMDATA'],
  ['programfiles', 'ProgramFiles'],
  ['programfiles(x86)', 'ProgramFiles(x86)'],
  ['ssl_cert_dir', 'SSL_CERT_DIR'],
  ['ssl_cert_file', 'SSL_CERT_FILE'],
  ['systemroot', 'SYSTEMROOT'],
  ['temp', 'TEMP'],
  ['tmp', 'TMP'],
  ['tz', 'TZ'],
  ['userprofile', 'USERPROFILE'],
  ['windir', 'WINDIR'],
]);

const DEFAULT_GRIST_DESKTOP_MANIFEST = deepFreeze({
  product: 'grist-desktop',
  version: '0.3.13',
  license: 'Apache-2.0',
  sourceUrl: 'https://github.com/gristlabs/grist-desktop',
  artifacts: {
    'win32-x64': {
      archiveUrl: 'https://github.com/gristlabs/grist-desktop/releases/download/v0.3.13/grist-desktop-0.3.13-win-x64.zip',
      archiveSha256: 'c85f49625cfd355b9c445a77bc5e4df6a8a6ea2e4c54597ccca3faa322a4b1cc',
      archiveBytes: 387242145,
      archiveFormat: 'zip',
      executablePath: 'Grist Desktop.exe',
      serverEntrypoint: 'resources/app.asar/core/_build/stubs/app/server/server.js',
      // Readiness means the exact REST surface used by the guarded bridge is
      // available, not merely that the HTTP listener has accepted a socket.
      healthPath: '/api/orgs',
    },
  },
});

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function selectChildEnvironment(source) {
  const selected = {};
  for (const [name, value] of Object.entries(isPlainObject(source) ? source : {})) {
    const canonical = CHILD_ENV_ALLOWLIST.get(String(name).toLowerCase());
    if (!canonical || value === undefined || value === null) continue;
    const text = String(value);
    if (text.includes('\0')) continue;
    selected[canonical] = text;
  }
  return selected;
}

function assertSafeSegment(value, label) {
  const text = String(value || '');
  if (
    !text ||
    text.length > 80 ||
    text === '.' ||
    text === '..' ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(text)
  ) {
    throw new Error(`${label} must be a safe path segment.`);
  }
  return text;
}

/**
 * Validate a manifest-owned relative target before joining it to an install
 * directory.  Windows aliases (trailing dots/spaces, drive names, ADS colons)
 * are rejected as well as ordinary absolute/traversal paths.
 */
function validateRelativeTarget(value, label = 'target') {
  if (typeof value !== 'string' || value.length < 1 || value.length > 512 || value.includes('\0')) {
    throw new Error(`${label} must be a non-empty relative path.`);
  }
  const portable = value.replace(/\\/g, '/');
  if (
    portable.startsWith('/') ||
    portable.startsWith('//') ||
    /^[A-Za-z]:/.test(portable) ||
    portable.includes(':')
  ) {
    throw new Error(`${label} must not be absolute.`);
  }
  const segments = portable.split('/');
  if (segments.some((segment) =>
    !segment ||
    segment === '.' ||
    segment === '..' ||
    segment.endsWith('.') ||
    segment.endsWith(' ') ||
    /[<>:"|?*]/.test(segment)
  )) {
    throw new Error(`${label} contains an unsafe path segment.`);
  }
  return segments.join(path.sep);
}

function validateHealthPath(value) {
  const healthPath = String(value || '/status');
  if (
    !healthPath.startsWith('/') ||
    healthPath.startsWith('//') ||
    healthPath.includes('\\') ||
    healthPath.includes('\0') ||
    /[\r\n]/.test(healthPath)
  ) {
    throw new Error('healthPath must be a same-origin absolute URL path.');
  }
  return healthPath;
}

function validateArgv(args) {
  if (args === undefined) return [];
  if (!Array.isArray(args) || args.length > 64) {
    throw new Error('artifact args must be an array with at most 64 entries.');
  }
  return args.map((arg) => {
    if (typeof arg !== 'string' || arg.length > 2048 || arg.includes('\0') || /[\r\n]/.test(arg)) {
      throw new Error('artifact args must contain bounded, single-line strings.');
    }
    return arg;
  });
}

function validateManifest(manifest, platformKey) {
  if (!isPlainObject(manifest)) throw new Error('A Grist Desktop manifest is required.');
  if (manifest.product !== 'grist-desktop') throw new Error('The engine manifest product must be "grist-desktop".');
  if (manifest.license !== 'Apache-2.0') throw new Error('The Grist Desktop manifest must preserve the Apache-2.0 license.');

  const version = assertSafeSegment(manifest.version, 'manifest version');
  const targetKey = assertSafeSegment(platformKey, 'platform key');
  const artifact = manifest.artifacts && manifest.artifacts[targetKey];
  if (!isPlainObject(artifact)) {
    throw new Error(`No pinned Grist Desktop artifact is available for ${targetKey}.`);
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(String(artifact.archiveUrl || ''));
  } catch (_) {
    throw new Error('The Grist Desktop archive URL is invalid.');
  }
  if (
    parsedUrl.protocol !== 'https:' ||
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.hash
  ) {
    throw new Error('The Grist Desktop archive must use an HTTPS URL without credentials or a fragment.');
  }

  const archiveSha256 = String(artifact.archiveSha256 || '').trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(archiveSha256)) {
    throw new Error('The Grist Desktop archive requires a pinned SHA-256 digest.');
  }
  if (artifact.archiveFormat !== 'zip') {
    throw new Error('The managed Grist Desktop artifact must be a portable ZIP.');
  }
  const archiveBytes = Number(artifact.archiveBytes);
  if (!Number.isSafeInteger(archiveBytes) || archiveBytes <= 0) {
    throw new Error('The Grist Desktop archive requires a positive pinned byte size.');
  }

  const executablePath = validateRelativeTarget(artifact.executablePath, 'executablePath');
  const serverEntrypoint = validateRelativeTarget(artifact.serverEntrypoint, 'serverEntrypoint');
  if (!serverEntrypoint.toLowerCase().includes(`${path.sep}app.asar${path.sep}`)) {
    throw new Error('serverEntrypoint must target the pinned server inside resources/app.asar.');
  }

  return Object.freeze({
    product: manifest.product,
    version,
    license: manifest.license,
    sourceUrl: String(manifest.sourceUrl || ''),
    platformKey: targetKey,
    artifact: Object.freeze({
      archiveUrl: parsedUrl.toString(),
      archiveSha256,
      archiveBytes,
      archiveFormat: artifact.archiveFormat,
      executablePath,
      serverEntrypoint,
      healthPath: validateHealthPath(artifact.healthPath),
      args: validateArgv(artifact.args),
    }),
  });
}

function assertAbsoluteAppDataDir(appDataDir) {
  if (
    typeof appDataDir !== 'string' ||
    !path.isAbsolute(appDataDir) ||
    appDataDir.includes('\0')
  ) {
    throw new Error('appDataDir must be an absolute application-owned directory.');
  }
  const resolved = path.resolve(appDataDir);
  if (resolved === path.parse(resolved).root) {
    throw new Error('appDataDir must not be a filesystem root.');
  }
  return resolved;
}

function isPathWithin(root, target, allowRoot = false) {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return (allowRoot && relative === '') ||
    (relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function assertManagedPath(root, target, label, allowRoot = false) {
  if (!isPathWithin(root, target, allowRoot)) {
    throw new Error(`${label} escaped the AlloSheet application-owned directory.`);
  }
  return target;
}

function makePaths(appDataDir, version, platformKey) {
  const ownerRoot = path.join(appDataDir, 'allosheet', 'grist-desktop');
  const versionsDir = path.join(ownerRoot, 'versions');
  const installDir = path.join(versionsDir, version, platformKey);
  const downloadsDir = path.join(ownerRoot, 'downloads');
  const stagingDir = path.join(ownerRoot, 'staging');
  const dataRoot = path.join(ownerRoot, 'data');
  const archivePath = path.join(downloadsDir, `grist-desktop-${version}-${platformKey}.zip`);
  const result = {
    ownerRoot,
    versionsDir,
    installDir,
    downloadsDir,
    stagingDir,
    archivePath,
    markerPath: path.join(installDir, '.allosheet-install.json'),
    dataRoot,
    documentsDir: path.join(dataRoot, 'documents'),
    userRootDir: path.join(dataRoot, 'user'),
    instanceDir: path.join(dataRoot, 'instance'),
    databasePath: path.join(dataRoot, 'landing.db'),
    logDir: path.join(ownerRoot, 'logs'),
  };
  for (const [name, target] of Object.entries(result)) {
    assertManagedPath(ownerRoot, target, name, name === 'ownerRoot');
  }
  return Object.freeze(result);
}

function safeJoin(root, relativeTarget, label) {
  const safeRelative = validateRelativeTarget(relativeTarget, label);
  const target = path.resolve(root, safeRelative);
  return assertManagedPath(root, target, label);
}

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

async function allocateLoopbackPort(options = {}) {
  const host = options.host || LOOPBACK_HOST;
  if (host !== LOOPBACK_HOST) throw new Error('AlloSheet may allocate ports only on IPv4 loopback.');
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once('error', reject);
    server.listen({ host, port: 0, exclusive: true }, () => {
      const address = server.address();
      const port = address && typeof address === 'object' ? address.port : 0;
      server.close((error) => {
        if (error) reject(error);
        else if (!Number.isInteger(port) || port < 1 || port > 65535) reject(new Error('Could not allocate a loopback port.'));
        else resolve(port);
      });
    });
  });
}

function regularFileInfo(filePath) {
  try {
    const info = fs.lstatSync(filePath);
    if (!info.isFile() || info.isSymbolicLink()) return null;
    return info;
  } catch (_) {
    return null;
  }
}

function regularFileSignature(filePath) {
  const info = regularFileInfo(filePath);
  if (!info) return null;
  return [
    info.dev,
    info.ino,
    info.mode,
    info.size,
    info.mtimeMs,
    info.ctimeMs,
  ].join(':');
}

function splitAsarEntrypoint(serverEntrypoint) {
  const parts = validateRelativeTarget(serverEntrypoint, 'serverEntrypoint').split(path.sep);
  const asarIndex = parts.findIndex((part) => part.toLowerCase() === 'app.asar');
  if (asarIndex < 1 || asarIndex >= parts.length - 1) {
    throw new Error('serverEntrypoint must identify a file inside resources/app.asar.');
  }
  return {
    containerRelative: parts.slice(0, asarIndex + 1).join(path.sep),
    insideRelative: parts.slice(asarIndex + 1).join(path.sep),
  };
}

/**
 * Read just Electron's Pickle-wrapped ASAR JSON header and prove the declared
 * server entrypoint is a regular file. This avoids adding an ASAR dependency
 * while ensuring a valid outer filename cannot hide a different package.
 */
function validateAsarEntrypoint(asarPath, relativeEntrypoint) {
  const safeEntrypoint = validateRelativeTarget(relativeEntrypoint, 'ASAR entrypoint');
  const fd = fs.openSync(asarPath, 'r');
  let header;
  try {
    const archiveSize = fs.fstatSync(fd).size;
    if (archiveSize < 16) throw new Error('The Grist ASAR container is truncated.');
    const sizePickle = Buffer.alloc(8);
    if (fs.readSync(fd, sizePickle, 0, 8, 0) !== 8) throw new Error('Could not read the Grist ASAR header.');
    if (sizePickle.readUInt32LE(0) !== 4) throw new Error('The Grist ASAR size header is invalid.');
    const headerSize = sizePickle.readUInt32LE(4);
    if (headerSize < 12 || headerSize > 64 * 1024 * 1024 || headerSize > archiveSize - 8) {
      throw new Error('The Grist ASAR header size is invalid.');
    }
    const headerPickle = Buffer.alloc(headerSize);
    if (fs.readSync(fd, headerPickle, 0, headerSize, 8) !== headerSize) {
      throw new Error('Could not read the complete Grist ASAR header.');
    }
    const payloadSize = headerPickle.readUInt32LE(0);
    const stringBytes = headerPickle.readUInt32LE(4);
    if (
      payloadSize > headerSize - 4 ||
      stringBytes < 2 ||
      stringBytes > payloadSize - 4 ||
      8 + stringBytes > headerSize
    ) {
      throw new Error('The Grist ASAR Pickle payload is invalid.');
    }
    header = JSON.parse(headerPickle.subarray(8, 8 + stringBytes).toString('utf8'));
  } finally {
    fs.closeSync(fd);
  }

  let current = header;
  for (const segment of safeEntrypoint.split(path.sep)) {
    if (
      !isPlainObject(current) ||
      !isPlainObject(current.files) ||
      !Object.prototype.hasOwnProperty.call(current.files, segment)
    ) {
      throw new Error('The Grist ASAR does not contain the expected server entrypoint.');
    }
    current = current.files[segment];
  }
  if (
    !isPlainObject(current) ||
    Object.prototype.hasOwnProperty.call(current, 'link') ||
    !Number.isFinite(current.size) ||
    current.size < 0 ||
    !(typeof current.offset === 'string' || current.unpacked === true)
  ) {
    throw new Error('The expected Grist ASAR server entrypoint is not a regular file.');
  }
  return true;
}

function assertNoSymlinkPath(root, target) {
  assertManagedPath(root, target, 'managed target', true);
  try {
    const rootInfo = fs.lstatSync(root);
    if (rootInfo.isSymbolicLink()) throw new Error('The application data root must not be a symbolic link or junction.');
  } catch (error) {
    if (error && error.code === 'ENOENT') return;
    throw error;
  }
  const relative = path.relative(root, target);
  let current = root;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    let info;
    try {
      info = fs.lstatSync(current);
    } catch (error) {
      if (error && error.code === 'ENOENT') return;
      throw error;
    }
    if (info.isSymbolicLink()) throw new Error('Managed Grist paths must not contain symbolic links or junctions.');
  }
}

function inspectExtractedTree(root, limits) {
  const rootInfo = fs.lstatSync(root);
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) {
    throw new Error('The archive extractor did not create a regular staging directory.');
  }
  let entryCount = 0;
  let extractedBytes = 0;
  const pending = [root];
  while (pending.length) {
    const directory = pending.pop();
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      assertManagedPath(root, target, 'extracted entry');
      const info = fs.lstatSync(target);
      entryCount += 1;
      if (entryCount > limits.maxEntries) throw new Error('The Grist archive contains too many entries.');
      if (info.isSymbolicLink()) throw new Error('The Grist archive contains a symbolic link or junction.');
      if (info.isDirectory()) {
        pending.push(target);
      } else if (info.isFile()) {
        extractedBytes += info.size;
        if (extractedBytes > limits.maxBytes) throw new Error('The extracted Grist archive exceeds its size limit.');
      } else {
        throw new Error('The Grist archive contains an unsupported special file.');
      }
    }
  }
  return { entryCount, extractedBytes };
}

async function defaultDownloadArchive({ url, destinationPath, signal, maxBytes, expectedBytes, onProgress, fetchImpl }) {
  if (typeof fetchImpl !== 'function') throw new Error('No HTTPS download implementation is available.');
  const response = await fetchImpl(url, {
    method: 'GET',
    redirect: 'follow',
    signal,
    headers: { Accept: 'application/zip' },
  });
  if (!response || !response.ok || !response.body) {
    throw new Error(`Grist Desktop download failed (HTTP ${response && response.status ? response.status : 'unknown'}).`);
  }
  if (response.url) {
    const finalUrl = new URL(response.url);
    if (finalUrl.protocol !== 'https:') throw new Error('The Grist Desktop download redirected away from HTTPS.');
  }
  const statedLength = Number(response.headers && response.headers.get && response.headers.get('content-length'));
  if (Number.isFinite(statedLength) && statedLength > maxBytes) {
    throw new Error('The Grist Desktop archive exceeds the download size limit.');
  }

  const handle = await fs.promises.open(destinationPath, 'wx', 0o600);
  let written = 0;
  try {
    for await (const rawChunk of response.body) {
      if (signal && signal.aborted) {
        const aborted = new Error('The Grist Desktop download was cancelled.');
        aborted.name = 'AbortError';
        throw aborted;
      }
      const chunk = Buffer.isBuffer(rawChunk) ? rawChunk : Buffer.from(rawChunk);
      written += chunk.length;
      if (written > maxBytes) throw new Error('The Grist Desktop archive exceeds the download size limit.');
      await handle.write(chunk);
      if (onProgress) onProgress(written, statedLength || expectedBytes || null);
    }
  } finally {
    await handle.close();
  }
  if (written < 1) throw new Error('The Grist Desktop download was empty.');
  if (expectedBytes && written !== expectedBytes) {
    throw new Error(`The Grist Desktop archive size was ${written} bytes; expected ${expectedBytes}.`);
  }
}

function getProbeSetCookieHeaders(headers) {
  if (!headers) return [];
  if (typeof headers.getSetCookie === 'function') {
    const values = headers.getSetCookie();
    return Array.isArray(values) ? values : [];
  }
  const combined = typeof headers.get === 'function' ? headers.get('set-cookie') : '';
  return combined
    ? String(combined).split(/,(?=\s*[!#$%&'*+\-.^_`|~0-9A-Za-z]+=)/g)
    : [];
}

function applyProbeCookies(jar, headers) {
  for (const rawValue of getProbeSetCookieHeaders(headers)) {
    const raw = String(rawValue || '');
    if (!raw || raw.length > 8192 || /[\r\n]/.test(raw)) return false;
    const pair = raw.split(';', 1)[0];
    const separator = pair.indexOf('=');
    const name = separator > 0 ? pair.slice(0, separator).trim() : '';
    const value = separator > 0 ? pair.slice(separator + 1).trim() : '';
    if (
      !/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(name)
      || /[\u0000-\u001f\u007f;]/.test(value)
    ) {
      return false;
    }
    jar.set(name, value);
    if (jar.size > 12) return false;
  }
  return true;
}

function probeCookieHeader(jar) {
  const value = Array.from(jar, ([name, cookie]) => `${name}=${cookie}`).join('; ');
  return value.length <= 8192 ? value : '';
}

async function discardProbeBody(response) {
  if (!response) return;
  if (response.body && typeof response.body.cancel === 'function') {
    try { await response.body.cancel(); } catch (_) {}
    return;
  }
  if (typeof response.text === 'function') {
    try { await response.text(); } catch (_) {}
  }
}

async function defaultHealthProbe({
  baseUrl, healthPath, signal, fetchImpl, electronKey, sessionCookieName,
}) {
  if (typeof fetchImpl !== 'function') return false;
  if (!ELECTRON_KEY_PATTERN.test(String(electronKey || ''))) return false;
  if (!COOKIE_NAME_PATTERN.test(String(sessionCookieName || ''))) return false;
  try {
    const origin = new URL(baseUrl).origin;
    const jar = new Map([['electron_key', electronKey]]);
    let target = new URL('/', `${origin}/`);
    let authenticated = false;
    for (let redirectCount = 0; redirectCount <= 6; redirectCount += 1) {
      const response = await fetchImpl(target, {
        method: 'GET',
        redirect: 'manual',
        signal,
        headers: {
          Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1',
          Cookie: probeCookieHeader(jar),
        },
      });
      if (!response || !applyProbeCookies(jar, response.headers)) return false;
      const location = response.headers && typeof response.headers.get === 'function'
        ? response.headers.get('location')
        : '';
      if (response.status >= 300 && response.status < 400) {
        await discardProbeBody(response);
        if (!location || redirectCount === 6) return false;
        const redirectTarget = new URL(location, target);
        if (redirectTarget.origin !== origin) return false;
        target = redirectTarget;
        continue;
      }
      await discardProbeBody(response);
      authenticated = Boolean(
        response.ok
        && jar.has(sessionCookieName)
        && String(jar.get(sessionCookieName) || '')
      );
      break;
    }
    if (!authenticated) return false;

    const response = await fetchImpl(`${origin}${healthPath}`, {
      method: 'GET',
      redirect: 'manual',
      signal,
      headers: {
        Accept: 'application/json,text/plain;q=0.9,*/*;q=0.1',
        Cookie: probeCookieHeader(jar),
      },
    });
    if (!response || response.status !== 200 || typeof response.json !== 'function') return false;
    const payload = await response.json();
    return Array.isArray(payload);
  } catch (error) {
    if (signal && signal.aborted) throw error;
    return false;
  }
}

function defaultSleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function childHasExited(child) {
  return Boolean(
    !child ||
    child.exitCode !== null && child.exitCode !== undefined ||
    child.signalCode !== null && child.signalCode !== undefined
  );
}

function waitForChildExit(child, timeoutMs) {
  if (childHasExited(child)) return Promise.resolve(true);
  return new Promise((resolve) => {
    let settled = false;
    const done = (exited) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(exited);
    };
    const timer = setTimeout(() => done(false), timeoutMs);
    if (timer.unref) timer.unref();
    child.once('exit', () => done(true));
  });
}

function waitForCommandResult(child, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    const timer = setTimeout(() => {
      try { child.kill(); } catch (_) {}
      done({ timedOut: true, code: null, signal: null, error: null });
    }, timeoutMs);
    if (timer.unref) timer.unref();
    child.once('error', (error) => done({ timedOut: false, code: null, signal: null, error }));
    child.once('exit', (code, signal) => done({ timedOut: false, code, signal, error: null }));
  });
}

async function defaultTerminateProcess(child, context) {
  if (!child || childHasExited(child)) return;
  const timeoutMs = context.terminationTimeoutMs || DEFAULT_TERMINATION_TIMEOUT_MS;
  if (context.platform === 'win32' && Number.isInteger(child.pid) && child.pid > 0) {
    let killer;
    try {
      killer = context.spawnImpl('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
        windowsHide: true,
        shell: false,
        stdio: ['ignore', 'ignore', 'ignore'],
      });
    } catch (error) {
      throw new Error(`Could not launch taskkill for the managed Grist server: ${error.message}`);
    }
    if (!killer || typeof killer.once !== 'function') {
      throw new Error('Could not launch taskkill for the managed Grist server.');
    }
    const result = await waitForCommandResult(killer, timeoutMs);
    if (result.error) {
      throw new Error(`taskkill could not stop the managed Grist server: ${result.error.message}`);
    }
    if (result.timedOut) {
      throw new Error('taskkill timed out while stopping the managed Grist server.');
    }
    if (result.code !== 0) {
      throw new Error(`taskkill failed while stopping the managed Grist server (code ${result.code}).`);
    }
    const exited = await waitForChildExit(child, timeoutMs);
    if (!exited && !childHasExited(child)) {
      throw new Error('The managed Grist server did not exit after taskkill completed.');
    }
    return;
  }
  try { child.kill('SIGTERM'); } catch (_) {}
  let exited = await waitForChildExit(child, timeoutMs);
  if (!exited && !childHasExited(child)) {
    try { child.kill('SIGKILL'); } catch (_) {}
    exited = await waitForChildExit(child, timeoutMs);
  }
  if (!exited && !childHasExited(child)) {
    throw new Error('The managed Grist server did not exit after forced termination.');
  }
}

function resolvePlatformKey(platform, arch, manifest, override) {
  if (override) return String(override);
  const exact = `${platform}-${arch}`;
  if (manifest && manifest.artifacts && manifest.artifacts[exact]) return exact;
  // Grist Desktop v0.3.13 does not publish a Windows ARM64 archive. Windows
  // 11 ARM provides x64 application emulation, so use the pinned x64 portable
  // build instead of making educators install Docker or a second runtime.
  if (platform === 'win32' && arch === 'arm64' && manifest?.artifacts?.['win32-x64']) {
    return 'win32-x64';
  }
  return exact;
}

function createAlloSheetEngineManager(options = {}) {
  const platform = options.platform || process.platform;
  const arch = options.arch || process.arch;
  const rawManifest = options.manifest || DEFAULT_GRIST_DESKTOP_MANIFEST;
  const platformKey = resolvePlatformKey(platform, arch, rawManifest, options.platformKey);
  const manifest = validateManifest(rawManifest, platformKey);
  const appDataDir = assertAbsoluteAppDataDir(options.appDataDir);
  const paths = makePaths(appDataDir, manifest.version, platformKey);
  const bootstrapPath = path.resolve(
    options.bootstrapPath || path.join(__dirname, 'allosheet-grist-bootstrap.cjs')
  );

  const extractArchive = options.extractArchive;
  const fetchImpl = options.fetchImpl === undefined ? globalThis.fetch : options.fetchImpl;
  const spawnImpl = options.spawnImpl || nodeSpawn;
  const allocatePort = options.allocatePort || allocateLoopbackPort;
  const healthProbe = options.healthProbe || ((context) => defaultHealthProbe({ ...context, fetchImpl }));
  const terminateProcess = options.terminateProcess || defaultTerminateProcess;
  const sleep = options.sleep || defaultSleep;
  const nowMs = options.nowMs || Date.now;
  const nowIso = options.nowIso || (() => new Date().toISOString());
  const randomBytes = options.randomBytes || crypto.randomBytes;
  const startupTimeoutMs = positiveBoundedInteger(options.startupTimeoutMs, 60000, 1000, 300000, 'startupTimeoutMs');
  const probeIntervalMs = positiveBoundedInteger(options.probeIntervalMs, 250, 10, 10000, 'probeIntervalMs');
  const probeTimeoutMs = positiveBoundedInteger(
    options.probeTimeoutMs,
    DEFAULT_PROBE_TIMEOUT_MS,
    10,
    30000,
    'probeTimeoutMs'
  );
  const terminationTimeoutMs = positiveBoundedInteger(
    options.terminationTimeoutMs,
    DEFAULT_TERMINATION_TIMEOUT_MS,
    10,
    30000,
    'terminationTimeoutMs'
  );
  const authHandshakeTimeoutMs = positiveBoundedInteger(
    options.authHandshakeTimeoutMs,
    DEFAULT_AUTH_HANDSHAKE_TIMEOUT_MS,
    100,
    60000,
    'authHandshakeTimeoutMs'
  );
  const maxArchiveBytes = positiveBoundedInteger(
    options.maxArchiveBytes,
    DEFAULT_MAX_ARCHIVE_BYTES,
    manifest.artifact.archiveBytes,
    4 * 1024 * 1024 * 1024,
    'maxArchiveBytes'
  );
  const extractionLimits = Object.freeze({
    maxBytes: positiveBoundedInteger(
      options.maxExtractedBytes,
      DEFAULT_MAX_EXTRACTED_BYTES,
      1024,
      8 * 1024 * 1024 * 1024,
      'maxExtractedBytes'
    ),
    maxEntries: positiveBoundedInteger(
      options.maxExtractedEntries,
      DEFAULT_MAX_EXTRACTED_ENTRIES,
      1,
      1000000,
      'maxExtractedEntries'
    ),
  });

  const state = {
    phase: 'idle',
    child: null,
    pid: null,
    port: null,
    startedAt: null,
    stoppedAt: null,
    lastError: null,
    download: null,
    logs: [],
    startPromise: null,
    stopRequested: false,
    abortController: null,
    privateAuth: null,
  };
  let installValidationCache = null;

  function appendLog(stream, value) {
    const cleaned = String(value == null ? '' : value)
      .replace(/[^\x09\x20-\x7E\u00A0-\uFFFF]/g, '')
      .slice(0, 4000);
    if (!cleaned) return;
    state.logs.push({ at: nowIso(), stream, line: cleaned });
    if (state.logs.length > DEFAULT_MAX_LOG_ENTRIES) {
      state.logs.splice(0, state.logs.length - DEFAULT_MAX_LOG_ENTRIES);
    }
  }

  function attachOutput(stream, label) {
    if (!stream || typeof stream.on !== 'function') return;
    let remainder = '';
    stream.on('data', (chunk) => {
      const pieces = (remainder + String(chunk)).split(/\r?\n/);
      remainder = pieces.pop() || '';
      for (const line of pieces) appendLog(label, line);
      if (remainder.length > 4000) {
        appendLog(label, remainder);
        remainder = '';
      }
    });
    stream.on('end', () => {
      if (remainder) appendLog(label, remainder);
      remainder = '';
    });
  }

  function expectedInstallMarker() {
    return {
      product: manifest.product,
      version: manifest.version,
      platformKey,
      archiveUrl: manifest.artifact.archiveUrl,
      archiveSha256: manifest.artifact.archiveSha256,
      executablePath: manifest.artifact.executablePath.split(path.sep).join('/'),
      serverEntrypoint: manifest.artifact.serverEntrypoint.split(path.sep).join('/'),
    };
  }

  function installIsValid() {
    const executable = safeJoin(paths.installDir, manifest.artifact.executablePath, 'executablePath');
    const asarTarget = splitAsarEntrypoint(manifest.artifact.serverEntrypoint);
    const asarContainer = safeJoin(paths.installDir, asarTarget.containerRelative, 'ASAR container');
    const signature = JSON.stringify([
      regularFileSignature(executable),
      regularFileSignature(asarContainer),
      regularFileSignature(paths.markerPath),
    ]);
    if (installValidationCache && installValidationCache.signature === signature) {
      return installValidationCache.valid;
    }
    let valid = false;
    try {
      if (
        !regularFileSignature(executable) ||
        !regularFileSignature(asarContainer) ||
        !regularFileSignature(paths.markerPath)
      ) {
        installValidationCache = { signature, valid: false };
        return false;
      }
      assertNoSymlinkPath(appDataDir, executable);
      assertNoSymlinkPath(appDataDir, asarContainer);
      assertNoSymlinkPath(appDataDir, paths.markerPath);
      validateAsarEntrypoint(asarContainer, asarTarget.insideRelative);
      const actualMarker = JSON.parse(fs.readFileSync(paths.markerPath, 'utf8'));
      const expected = expectedInstallMarker();
      valid = Object.entries(expected).every(([key, value]) => actualMarker[key] === value);
    } catch (_) {
      valid = false;
    }
    installValidationCache = { signature, valid };
    return valid;
  }

  function status() {
    const installed = installIsValid();
    const running = Boolean(
      state.child &&
      state.phase === 'running' &&
      (state.child.exitCode === null || state.child.exitCode === undefined) &&
      !state.child.killed
    );
    return Object.freeze({
      phase: state.phase,
      installed,
      running,
      pid: running ? state.pid : null,
      version: manifest.version,
      platformKey,
      host: LOOPBACK_HOST,
      port: running ? state.port : null,
      baseUrl: running ? `http://${LOOPBACK_HOST}:${state.port}` : null,
      startedAt: state.startedAt,
      stoppedAt: state.stoppedAt,
      lastError: state.lastError,
      download: state.download ? { ...state.download } : null,
    });
  }

  function logs(limit = 100) {
    const count = positiveBoundedInteger(limit, 100, 1, DEFAULT_MAX_LOG_ENTRIES, 'log limit');
    return Object.freeze({ logs: state.logs.slice(-count).map((entry) => ({ ...entry })) });
  }

  async function ensureArchive() {
    fs.mkdirSync(paths.downloadsDir, { recursive: true, mode: 0o700 });
    assertNoSymlinkPath(appDataDir, paths.downloadsDir);

    if (regularFileInfo(paths.archivePath)) {
      const existingDigest = (await sha256File(paths.archivePath)).toLowerCase();
      const existingSize = regularFileInfo(paths.archivePath).size;
      if (existingDigest === manifest.artifact.archiveSha256 && existingSize === manifest.artifact.archiveBytes) {
        appendLog('manager', 'Using the verified cached Grist Desktop archive.');
        return paths.archivePath;
      }
      fs.unlinkSync(paths.archivePath);
      appendLog('manager', 'Discarded an unverified cached Grist Desktop archive.');
    }

    const partialPath = assertManagedPath(
      paths.ownerRoot,
      `${paths.archivePath}.${randomBytes(8).toString('hex')}.partial`,
      'partial archive'
    );
    state.download = { receivedBytes: 0, totalBytes: manifest.artifact.archiveBytes };
    const downloader = options.downloadArchive || ((context) =>
      defaultDownloadArchive({ ...context, fetchImpl }));
    try {
      await downloader({
        url: manifest.artifact.archiveUrl,
        destinationPath: partialPath,
        signal: state.abortController && state.abortController.signal,
        maxBytes: maxArchiveBytes,
        expectedBytes: manifest.artifact.archiveBytes,
        onProgress(receivedBytes, totalBytes) {
          state.download = {
            receivedBytes: Number(receivedBytes) || 0,
            totalBytes: Number(totalBytes) || manifest.artifact.archiveBytes,
          };
        },
      });
      const info = regularFileInfo(partialPath);
      if (!info || info.size > maxArchiveBytes) throw new Error('The downloader did not produce a safe regular ZIP file.');
      if (info.size !== manifest.artifact.archiveBytes) {
        throw new Error(`The Grist Desktop archive size was ${info.size} bytes; expected ${manifest.artifact.archiveBytes}.`);
      }
      const actualDigest = (await sha256File(partialPath)).toLowerCase();
      if (actualDigest !== manifest.artifact.archiveSha256) {
        throw new Error('The Grist Desktop archive failed its pinned SHA-256 integrity check.');
      }
      fs.renameSync(partialPath, paths.archivePath);
      appendLog('manager', 'Verified the pinned Grist Desktop archive.');
      return paths.archivePath;
    } catch (error) {
      try { fs.unlinkSync(partialPath); } catch (_) {}
      throw error;
    } finally {
      state.download = null;
    }
  }

  async function ensureInstalled() {
    if (installIsValid()) return safeJoin(paths.installDir, manifest.artifact.executablePath, 'executablePath');
    if (typeof extractArchive !== 'function') {
      throw new Error('A safe extractArchive implementation is required to install Grist Desktop.');
    }
    state.phase = 'installing';
    fs.mkdirSync(paths.ownerRoot, { recursive: true, mode: 0o700 });
    fs.mkdirSync(paths.stagingDir, { recursive: true, mode: 0o700 });
    fs.mkdirSync(path.dirname(paths.installDir), { recursive: true, mode: 0o700 });
    for (const target of [paths.stagingDir, path.dirname(paths.installDir)]) {
      assertManagedPath(paths.ownerRoot, target, 'managed install directory');
      assertNoSymlinkPath(appDataDir, target);
    }

    const archivePath = await ensureArchive();
    if (state.stopRequested) throw abortError();
    const stage = assertManagedPath(
      paths.ownerRoot,
      path.join(paths.stagingDir, `${manifest.version}-${platformKey}-${randomBytes(8).toString('hex')}`),
      'staging target'
    );
    fs.mkdirSync(stage, { recursive: false, mode: 0o700 });
    try {
      /**
       * Security contract for the supplied extractor:
       * - it must extract ZIP entries only after calling resolveEntryPath;
       * - it must reject links/special files and enforce the supplied limits;
       * - it must never follow pre-existing paths outside destinationDir.
       * The manager independently walks the result before anything is run.
       */
      await extractArchive({
        archivePath,
        destinationDir: stage,
        format: 'zip',
        limits: extractionLimits,
        resolveEntryPath(relativeEntry) {
          return safeJoin(stage, relativeEntry, 'archive entry');
        },
        signal: state.abortController && state.abortController.signal,
      });
      if (state.stopRequested) throw abortError();
      inspectExtractedTree(stage, extractionLimits);

      const stagedExecutable = safeJoin(stage, manifest.artifact.executablePath, 'executablePath');
      const asarTarget = splitAsarEntrypoint(manifest.artifact.serverEntrypoint);
      const asarContainer = safeJoin(stage, asarTarget.containerRelative, 'ASAR container');
      if (!regularFileInfo(stagedExecutable)) {
        throw new Error('The verified Grist Desktop ZIP did not contain the expected executable.');
      }
      if (!regularFileInfo(asarContainer)) {
        throw new Error('The verified Grist Desktop ZIP did not contain the expected resources/app.asar server container.');
      }
      validateAsarEntrypoint(asarContainer, asarTarget.insideRelative);

      fs.writeFileSync(
        path.join(stage, '.allosheet-install.json'),
        `${JSON.stringify({ ...expectedInstallMarker(), installedAt: nowIso() }, null, 2)}\n`,
        { encoding: 'utf8', mode: 0o600 }
      );
      replaceInstallAtomically(stage);
      try { fs.unlinkSync(paths.archivePath); } catch (_) {}
      appendLog('manager', `Installed Grist Desktop ${manifest.version}.`);
      return safeJoin(paths.installDir, manifest.artifact.executablePath, 'executablePath');
    } catch (error) {
      if (fs.existsSync(stage)) fs.rmSync(stage, { recursive: true, force: true });
      throw error;
    }
  }

  function replaceInstallAtomically(stage) {
    installValidationCache = null;
    assertManagedPath(paths.ownerRoot, stage, 'staging target');
    assertManagedPath(paths.ownerRoot, paths.installDir, 'install target');
    const backup = assertManagedPath(
      paths.ownerRoot,
      `${paths.installDir}.previous-${randomBytes(6).toString('hex')}`,
      'install backup'
    );
    let backedUp = false;
    if (fs.existsSync(paths.installDir)) {
      assertNoSymlinkPath(appDataDir, paths.installDir);
      fs.renameSync(paths.installDir, backup);
      backedUp = true;
    }
    try {
      fs.renameSync(stage, paths.installDir);
      if (backedUp) fs.rmSync(backup, { recursive: true, force: true });
    } catch (error) {
      if (backedUp && !fs.existsSync(paths.installDir) && fs.existsSync(backup)) {
        fs.renameSync(backup, paths.installDir);
      }
      throw error;
    } finally {
      installValidationCache = null;
    }
  }

  function ensureDataDirectories() {
    for (const directory of [
      paths.documentsDir,
      paths.userRootDir,
      paths.instanceDir,
      path.dirname(paths.databasePath),
      paths.logDir,
    ]) {
      assertManagedPath(paths.ownerRoot, directory, 'Grist data directory');
      fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
      assertNoSymlinkPath(appDataDir, directory);
    }
    if (fs.existsSync(paths.databasePath)) {
      assertNoSymlinkPath(appDataDir, paths.databasePath);
    }
  }

  function makeLaunch(executable, port) {
    const serverScript = safeJoin(paths.installDir, manifest.artifact.serverEntrypoint, 'serverEntrypoint');
    const asarCore = path.join(paths.installDir, 'resources', 'app.asar', 'core');
    const nodePath = [
      path.join(asarCore, '_build'),
      path.join(asarCore, '_build', 'ext'),
      path.join(asarCore, '_build', 'stubs'),
      path.join(asarCore, 'node_modules'),
      path.join(paths.installDir, 'resources', 'app.asar', 'node_modules'),
    ].join(path.delimiter);
    const baseEnv = isPlainObject(options.env) ? options.env : process.env;
    const baseUrl = `http://${LOOPBACK_HOST}:${port}`;
    const sessionCookieName = `allosheet_${randomBytes(12).toString('hex')}`;
    const environment = {
      ...selectChildEnvironment(baseEnv),
      ELECTRON_RUN_AS_NODE: '1',
      NODE_PATH: nodePath,
      PORT: String(port),
      GRIST_PORT: String(port),
      GRIST_HOST: LOOPBACK_HOST,
      APP_HOME_URL: baseUrl,
      // Grist Core 1.7.16 introduced a first-run boot-key/setup gate. This
      // process is an app-owned, random-port, loopback-only single-user
      // companion whose complete posture is supplied here, so it is already
      // "in service" and must never ask an educator to administer a server.
      GRIST_IN_SERVICE: 'true',
      GRIST_DEFAULT_EMAIL: 'educator@alloflow.local',
      GRIST_ADMIN_EMAIL: 'educator@alloflow.local',
      GRIST_SINGLE_ORG: 'alloflow',
      GRIST_SINGLE_PORT: 'true',
      GRIST_SERVE_SAME_ORIGIN: 'true',
      GRIST_DESKTOP_AUTH: 'strict',
      GRIST_FORCE_LOGIN: 'true',
      GRIST_SANDBOX_FLAVOR: 'pyodide',
      GRIST_DESKTOP_USE_UPDATE: 'false',
      GRIST_ALLOW_AUTOMATIC_VERSION_CHECKING: 'false',
      GRIST_TELEMETRY_LEVEL: 'off',
      GRIST_DATA_DIR: paths.documentsDir,
      GRIST_USER_ROOT: paths.userRootDir,
      GRIST_INST_DIR: paths.instanceDir,
      TYPEORM_DATABASE: paths.databasePath,
      GRIST_SESSION_SECRET: randomBytes(32).toString('hex'),
      GRIST_SESSION_COOKIE: sessionCookieName,
      GRIST_WIDGET_LIST_URL: '',
      ALLOFLOW_GRIST_SERVER_ENTRYPOINT: serverScript,
      NO_PROXY: [baseEnv.NO_PROXY, LOOPBACK_HOST, 'localhost'].filter(Boolean).join(','),
    };
    delete environment.GRIST_ANON_PLAYGROUND;
    delete environment.GRIST_PERSONAL_ORGS;
    delete environment.GRIST_ORG_CREATION_ANYONE;
    delete environment.GRIST_LOGIN_SYSTEM_TYPE;
    return {
      command: executable,
      args: [bootstrapPath, ...manifest.artifact.args],
      options: {
        cwd: paths.installDir,
        env: environment,
        windowsHide: true,
        shell: false,
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      },
      baseUrl,
      sessionCookieName,
    };
  }

  function waitForPrivateAuth(child, baseUrl, sessionCookieName) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (error, auth) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        child.removeListener('message', onMessage);
        child.removeListener('exit', onExit);
        if (error) reject(error);
        else resolve(auth);
      };
      const onMessage = (message) => {
        if (state.child !== child || !message || message.type !== AUTH_MESSAGE_TYPE) return;
        const electronKey = String(message.electronKey || '');
        if (message.version !== 1 || !ELECTRON_KEY_PATTERN.test(electronKey)) {
          finish(new Error('The managed Grist server returned an invalid private authentication handshake.'));
          return;
        }
        const auth = Object.freeze({
          origin: new URL(baseUrl).origin,
          cookieName: 'electron_key',
          electronKey,
          sessionCookieName,
          pid: Number.isInteger(child.pid) ? child.pid : null,
        });
        state.privateAuth = auth;
        finish(null, auth);
      };
      const onExit = () => finish(new Error(
        'The managed Grist server exited before its private authentication handshake.'
      ));
      const timer = setTimeout(() => {
        finish(new Error('The managed Grist server did not provide its private authentication handshake.'));
      }, Math.min(authHandshakeTimeoutMs, startupTimeoutMs));
      if (timer.unref) timer.unref();
      child.on('message', onMessage);
      child.once('exit', onExit);
    });
  }

  async function waitUntilReady(child, baseUrl, privateAuth) {
    const deadline = nowMs() + startupTimeoutMs;
    while (nowMs() < deadline) {
      if (state.stopRequested) throw abortError();
      if (
        child.exitCode !== null &&
        child.exitCode !== undefined
      ) {
        throw new Error(`The managed Grist server exited during startup (code ${child.exitCode}).`);
      }
      const parentSignal = state.abortController && state.abortController.signal;
      const controller = new AbortController();
      const remainingMs = Math.max(1, deadline - nowMs());
      const attemptTimeoutMs = Math.min(probeTimeoutMs, remainingMs);
      let timer = null;
      let onParentAbort = null;
      const timeout = new Promise((resolve) => {
        timer = setTimeout(() => {
          try { controller.abort(); } catch (_) {}
          resolve(false);
        }, attemptTimeoutMs);
      });
      const parentAbort = parentSignal
        ? new Promise((_, reject) => {
          onParentAbort = () => {
            try { controller.abort(); } catch (_) {}
            reject(abortError());
          };
          if (parentSignal.aborted) onParentAbort();
          else parentSignal.addEventListener('abort', onParentAbort, { once: true });
        })
        : new Promise(() => {});
      let ready;
      try {
        const probe = Promise.resolve().then(() => healthProbe({
          baseUrl,
          healthPath: manifest.artifact.healthPath,
          host: LOOPBACK_HOST,
          port: state.port,
          signal: controller.signal,
          timeoutMs: attemptTimeoutMs,
          electronKey: privateAuth.electronKey,
          sessionCookieName: privateAuth.sessionCookieName,
        }));
        ready = await Promise.race([probe, timeout, parentAbort]);
      } catch (error) {
        if (parentSignal && parentSignal.aborted) throw abortError();
        if (controller.signal.aborted) ready = false;
        else throw error;
      } finally {
        if (timer) clearTimeout(timer);
        if (parentSignal && onParentAbort) parentSignal.removeEventListener('abort', onParentAbort);
      }
      if (ready) return;
      const sleepMs = Math.min(probeIntervalMs, Math.max(0, deadline - nowMs()));
      if (sleepMs > 0) await sleep(sleepMs);
    }
    throw new Error('The managed Grist server did not become ready before the startup timeout.');
  }

  function attachChildLifecycle(child) {
    attachOutput(child.stdout, 'stdout');
    attachOutput(child.stderr, 'stderr');
    child.once('error', (error) => {
      if (state.child !== child) return;
      if (state.privateAuth && state.privateAuth.pid === child.pid) state.privateAuth = null;
      state.lastError = error.message;
      appendLog('manager', `Grist spawn error: ${error.message}`);
    });
    child.once('exit', (code, signal) => {
      appendLog('manager', `Grist server exited (${code == null ? signal || 'unknown' : `code ${code}`}).`);
      if (state.child !== child) return;
      const wasStopping = state.stopRequested || state.phase === 'stopping' || state.phase === 'stopped';
      state.child = null;
      if (state.privateAuth && state.privateAuth.pid === child.pid) state.privateAuth = null;
      state.pid = null;
      state.stoppedAt = nowIso();
      if (wasStopping || code === 0) {
        state.phase = 'stopped';
      } else {
        state.phase = 'error';
        state.lastError = state.lastError || `The managed Grist server exited with code ${code}.`;
      }
    });
  }

  async function start() {
    if (state.phase === 'running' && state.child) return status();
    if (state.startPromise) return state.startPromise;
    if (state.child && !childHasExited(state.child)) {
      const error = new Error(
        'A previous managed Grist process is still running. Stop it before retrying startup.'
      );
      throw error;
    }
    if (state.child && childHasExited(state.child)) state.child = null;
    state.stopRequested = false;
    state.lastError = null;
    state.privateAuth = null;
    state.abortController = new AbortController();
    state.startPromise = (async () => {
      try {
        const executable = await ensureInstalled();
        if (state.stopRequested) throw abortError();
        ensureDataDirectories();
        const port = Number(await allocatePort({ host: LOOPBACK_HOST }));
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
          throw new Error('The port allocator did not return a valid loopback port.');
        }
        if (state.stopRequested) throw abortError();
        state.port = port;
        state.phase = 'starting';
        const launch = makeLaunch(executable, port);
        appendLog('manager', `Starting managed Grist Desktop ${manifest.version} on ${LOOPBACK_HOST}:${port}.`);
        const child = spawnImpl(launch.command, launch.args, launch.options);
        if (!child || typeof child.once !== 'function') {
          throw new Error('The process launcher did not return a child process.');
        }
        state.child = child;
        state.pid = Number.isInteger(child.pid) && child.pid > 0 ? child.pid : null;
        const authPromise = waitForPrivateAuth(child, launch.baseUrl, launch.sessionCookieName);
        attachChildLifecycle(child);
        const privateAuth = await authPromise;
        await waitUntilReady(child, launch.baseUrl, privateAuth);
        if (state.child !== child) throw new Error('The managed Grist server exited during startup.');
        state.phase = 'running';
        state.startedAt = nowIso();
        state.stoppedAt = null;
        appendLog('manager', 'Managed Grist server is ready.');
        return status();
      } catch (error) {
        const stopped = state.stopRequested || error.name === 'AbortError';
        if (state.child) {
          const child = state.child;
          try {
            await terminateProcess(child, { platform, spawnImpl, terminationTimeoutMs });
          } catch (terminationError) {
            appendLog('manager', `Could not stop Grist after startup failed: ${terminationError.message}`);
          }
          if (state.child === child && childHasExited(child)) state.child = null;
        }
        state.pid = null;
        state.port = null;
        state.privateAuth = null;
        if (stopped && !state.child) {
          state.phase = 'stopped';
          state.lastError = null;
          appendLog('manager', 'Managed Grist start was cancelled.');
          return status();
        }
        if (stopped && state.child) {
          const terminationError = new Error('The managed Grist server is still running after startup cancellation.');
          state.phase = 'error';
          state.lastError = terminationError.message;
          appendLog('manager', `ERROR: ${terminationError.message}`);
          throw terminationError;
        }
        state.phase = 'error';
        state.lastError = error.message;
        appendLog('manager', `ERROR: ${error.message}`);
        throw error;
      } finally {
        state.abortController = null;
        state.startPromise = null;
      }
    })();
    return state.startPromise;
  }

  async function stop() {
    state.privateAuth = null;
    state.stopRequested = true;
    if (state.abortController) {
      try { state.abortController.abort(); } catch (_) {}
    }
    const child = state.child;
    let terminationError = null;
    if (child) {
      state.phase = 'stopping';
      appendLog('manager', 'Stopping the managed Grist server.');
      try {
        await terminateProcess(child, { platform, spawnImpl, terminationTimeoutMs });
      } catch (error) {
        terminationError = error;
      }
      if (state.child === child && childHasExited(child)) {
        state.child = null;
      }
    }
    if (state.startPromise) {
      try {
        await state.startPromise;
      } catch (error) {
        terminationError = terminationError || error;
      }
    }
    if (state.child && !childHasExited(state.child)) {
      const error = terminationError || new Error('The managed Grist server did not exit during shutdown.');
      state.phase = 'error';
      state.lastError = error.message;
      appendLog('manager', `ERROR: ${error.message}`);
      throw error;
    }
    state.child = null;
    state.pid = null;
    state.port = null;
    state.privateAuth = null;
    state.phase = 'stopped';
    state.lastError = null;
    state.stoppedAt = nowIso();
    return status();
  }

  return Object.freeze({
    start,
    status,
    getStatus: status,
    stop,
    logs,
    getLogs: logs,
    getPaths: () => paths,
    getPrivateAuth: () => state.privateAuth ? { ...state.privateAuth } : null,
    manifest,
  });
}

function positiveBoundedInteger(value, fallback, minimum, maximum, label) {
  const candidate = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(candidate) || candidate < minimum || candidate > maximum) {
    throw new Error(`${label} must be an integer between ${minimum} and ${maximum}.`);
  }
  return candidate;
}

function abortError() {
  const error = new Error('The managed Grist start was cancelled.');
  error.name = 'AbortError';
  return error;
}

module.exports = {
  DEFAULT_GRIST_DESKTOP_MANIFEST,
  LOOPBACK_HOST,
  allocateLoopbackPort,
  createAlloSheetEngineManager,
  sha256File,
  validateAsarEntrypoint,
  validateManifest,
  validateRelativeTarget,
};
