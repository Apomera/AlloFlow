'use strict';

/**
 * Dependency-free ZIP extraction for the pinned Grist Desktop Windows bundle.
 *
 * The manager verifies the archive's exact byte size and SHA-256 before this
 * runs. We additionally list every entry with Windows' bundled bsdtar, pass
 * every name through the manager's traversal-safe resolver, require an empty
 * regular destination directory, and extract without a shell. The manager
 * independently walks the completed tree and rejects links, special files,
 * excessive entries, and excessive expanded bytes before executing anything.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawn: nodeSpawn } = require('node:child_process');

const MAX_LISTING_BYTES = 32 * 1024 * 1024;
const MAX_ERROR_BYTES = 256 * 1024;

function resolveWindowsTarPath(env = process.env) {
  const windowsRoot = String(env.SystemRoot || env.WINDIR || 'C:\\Windows');
  if (!path.win32.isAbsolute(windowsRoot) || windowsRoot.includes('\0')) {
    throw new Error('The Windows system directory is invalid.');
  }
  return path.win32.join(windowsRoot, 'System32', 'tar.exe');
}

function validateArchiveListing(listing, options = {}) {
  const resolveEntryPath = options.resolveEntryPath;
  const maxEntries = Number(options.maxEntries);
  if (typeof resolveEntryPath !== 'function') {
    throw new Error('A safe archive-entry resolver is required.');
  }
  if (!Number.isSafeInteger(maxEntries) || maxEntries < 1) {
    throw new Error('A positive archive entry limit is required.');
  }

  const entries = String(listing || '')
    .split(/\n/)
    .map((entry) => entry.replace(/\r$/, ''))
    .filter((entry) => entry !== '');
  if (!entries.length) throw new Error('The Grist Desktop archive contains no entries.');
  if (entries.length > maxEntries) throw new Error('The Grist Desktop archive contains too many entries.');

  for (const rawEntry of entries) {
    if (rawEntry.includes('\0') || rawEntry.includes('\r') || rawEntry.includes('\n')) {
      throw new Error('The Grist Desktop archive contains an invalid entry name.');
    }
    const entry = rawEntry.replace(/[\\/]+$/, '');
    if (!entry) throw new Error('The Grist Desktop archive contains an invalid root entry.');
    resolveEntryPath(entry);
  }
  return entries.length;
}

function validateVerboseArchiveListing(verboseListing, maxEntries, maxBytes = null) {
  const lines = String(verboseListing || '')
    .split(/\n/)
    .map((line) => line.replace(/\r$/, ''))
    .filter((line) => line.trim() !== '');
  if (!lines.length) throw new Error('The Grist Desktop archive contains no entries.');
  if (lines.length > maxEntries) throw new Error('The Grist Desktop archive contains too many entries.');
  let totalBytes = 0;
  const enforceBytes = Number.isSafeInteger(Number(maxBytes)) && Number(maxBytes) > 0;
  for (const line of lines) {
    const trimmed = line.trimStart();
    const modeChar = trimmed.charAt(0);
    if ((modeChar !== '-' && modeChar !== 'd') || / -> /.test(line) || /\s+link\s+to\s+/i.test(line)) {
      throw new Error('The Grist Desktop archive contains a link or special file entry, which is not permitted.');
    }
    if (enforceBytes && modeChar === '-') {
      // Standard bsdtar/GNU tar -tvf format: perms links owner group size ...
      // or Windows bsdtar: perms links owner group size month day time/year path
      const parts = trimmed.split(/\s+/);
      const sizeField = parts.length >= 5 && /^\d+$/.test(parts[4])
        ? Number(parts[4])
        : (parts.length >= 3 && /^\d+$/.test(parts[2]) ? Number(parts[2]) : 0);
      if (Number.isFinite(sizeField) && sizeField > 0) {
        totalBytes += sizeField;
        if (totalBytes > Number(maxBytes)) {
          throw new Error('The Grist Desktop archive exceeds the extracted size limit.');
        }
      }
    }
  }
  return lines.length;
}

function runTar(spawnImpl, command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawnImpl(command, args, {
      cwd: options.cwd,
      env: options.env,
      windowsHide: true,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const stdoutChunks = [];
    const stderrChunks = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let settled = false;

    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      if (options.signal) options.signal.removeEventListener('abort', onAbort);
      if (error) reject(error);
      else resolve(result);
    };
    const appendChunk = (chunks, currentBytes, chunk, limit, label) => {
      if (settled) return currentBytes;
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      const nextBytes = currentBytes + buf.length;
      if (nextBytes > limit) {
        try { child.kill(); } catch (_) {}
        finish(new Error(`The archive ${label} exceeded its safety limit.`));
        return nextBytes;
      }
      chunks.push(buf);
      return nextBytes;
    };
    const onAbort = () => {
      try { child.kill(); } catch (_) {}
      const error = new Error('The Grist Desktop extraction was cancelled.');
      error.name = 'AbortError';
      finish(error);
    };

    if (options.signal) {
      if (options.signal.aborted) {
        onAbort();
        return;
      }
      options.signal.addEventListener('abort', onAbort, { once: true });
    }
    if (child.stdout) child.stdout.on('data', (chunk) => {
      stdoutBytes = appendChunk(stdoutChunks, stdoutBytes, chunk, options.maxStdoutBytes || MAX_LISTING_BYTES, 'listing');
    });
    if (child.stderr) child.stderr.on('data', (chunk) => {
      stderrBytes = appendChunk(stderrChunks, stderrBytes, chunk, options.maxStderrBytes || MAX_ERROR_BYTES, 'diagnostic output');
    });
    child.once('error', (error) => finish(error));
    child.once('close', (code) => {
      const stdout = Buffer.concat(stdoutChunks, stdoutBytes);
      const stderr = Buffer.concat(stderrChunks, stderrBytes);
      if (code !== 0) {
        const detail = stderr.toString('utf8').replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, 500);
        finish(new Error(`Grist Desktop archive extraction failed (exit ${code})${detail ? `: ${detail}` : '.'}`));
        return;
      }
      finish(null, { stdout: stdout.toString('utf8'), stderr: stderr.toString('utf8') });
    });
  });
}

function createWindowsZipExtractor(options = {}) {
  const spawnImpl = options.spawnImpl || nodeSpawn;
  const env = options.env || process.env;
  const tarPath = options.tarPath || resolveWindowsTarPath(env);

  return async function extractArchive(context = {}) {
    const {
      archivePath,
      destinationDir,
      format,
      limits,
      resolveEntryPath,
      signal,
    } = context;
    if (format !== 'zip') throw new Error('The AlloSheet extractor accepts ZIP archives only.');
    if (!path.isAbsolute(String(archivePath || '')) || !path.isAbsolute(String(destinationDir || ''))) {
      throw new Error('Archive and destination paths must be absolute.');
    }
    const archiveInfo = fs.lstatSync(archivePath);
    const destinationInfo = fs.lstatSync(destinationDir);
    if (!archiveInfo.isFile() || archiveInfo.isSymbolicLink()) {
      throw new Error('The verified Grist archive is not a regular file.');
    }
    if (!destinationInfo.isDirectory() || destinationInfo.isSymbolicLink()) {
      throw new Error('The Grist staging target is not a regular directory.');
    }
    if (fs.readdirSync(destinationDir).length !== 0) {
      throw new Error('The Grist staging target must be empty before extraction.');
    }
    if (!limits || !Number.isSafeInteger(Number(limits.maxEntries))) {
      throw new Error('Archive extraction limits are required.');
    }

    const listing = await runTar(spawnImpl, tarPath, ['-tf', archivePath], {
      cwd: destinationDir,
      env,
      signal,
      maxStdoutBytes: MAX_LISTING_BYTES,
    });
    validateArchiveListing(listing.stdout, {
      resolveEntryPath,
      maxEntries: Number(limits.maxEntries),
    });
    const verboseListing = await runTar(spawnImpl, tarPath, ['-tvf', archivePath], {
      cwd: destinationDir,
      env,
      signal,
      maxStdoutBytes: MAX_LISTING_BYTES,
    });
    validateVerboseArchiveListing(verboseListing.stdout, Number(limits.maxEntries), limits.maxBytes);
    await runTar(spawnImpl, tarPath, ['-xf', archivePath, '-C', destinationDir], {
      cwd: destinationDir,
      env,
      signal,
      maxStdoutBytes: MAX_ERROR_BYTES,
    });
  };
}

module.exports = {
  createWindowsZipExtractor,
  resolveWindowsTarPath,
  validateArchiveListing,
  validateVerboseArchiveListing,
};
