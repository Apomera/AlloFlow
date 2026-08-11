#!/usr/bin/env node
'use strict';

const { execFileSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const LOADER_FILES = Object.freeze([
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx'
]);
const CDN_BASE = 'https://alloflow-cdn.pages.dev';

function usage() {
  return [
    'Usage:',
    '  node dev-tools/cache_bust_module_urls.cjs --hash=<commit> [--dry-run] <module.js> [module.js ...]',
    '',
    'Example:',
    '  node dev-tools/cache_bust_module_urls.cjs --hash=ecd0de779 --dry-run view_pdf_audit_module.js view_export_preview_module.js',
    '',
    'The hash must name a commit in the local repository, and each selected working',
    'module must match that commit. Only exact loadModule() URLs for root-level',
    '*_module.js files are changed. The canonical loader and both generated loader',
    'mirrors must agree before any file is written.'
  ].join('\n');
}

function normalizeCommitHash(value) {
  const hash = String(value || '').trim().toLowerCase();
  if (!/^[0-9a-f]{7,40}$/.test(hash)) {
    throw new Error('Expected --hash to be a 7-40 character hexadecimal commit hash.');
  }
  return hash;
}

function normalizeModuleName(value) {
  const moduleName = String(value || '').trim();
  if (!/^[a-z0-9][a-z0-9_-]*_module\.js$/.test(moduleName)) {
    throw new Error(`Invalid module selector "${moduleName}". Use a root-level lowercase *_module.js filename.`);
  }
  return moduleName;
}

function parseArgs(argv) {
  let hashValue = '';
  let dryRun = false;
  const modules = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--hash') {
      index += 1;
      if (index >= argv.length) throw new Error('--hash requires a value.');
      hashValue = argv[index];
    } else if (arg.startsWith('--hash=')) {
      hashValue = arg.slice('--hash='.length);
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      modules.push(normalizeModuleName(arg));
    }
  }

  if (!hashValue) throw new Error('--hash is required.');
  if (modules.length === 0) throw new Error('Select at least one module filename.');

  return {
    hash: normalizeCommitHash(hashValue),
    dryRun,
    modules: [...new Set(modules)]
  };
}

function verifyCommitHash(hash, root = REPO_ROOT) {
  let resolved;
  try {
    resolved = execFileSync('git', ['rev-parse', '--verify', `${hash}^{commit}`], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim().toLowerCase();
  } catch (_) {
    throw new Error(`Hash ${hash} does not resolve to a commit in this repository.`);
  }

  if (!/^[0-9a-f]{40}$/.test(resolved) || !resolved.startsWith(hash)) {
    throw new Error(`Hash ${hash} did not resolve unambiguously to the expected commit.`);
  }
  return resolved;
}

function verifySelectedModulesAtCommit(resolvedCommit, modules, root = REPO_ROOT) {
  for (const moduleName of modules) {
    try {
      execFileSync('git', ['cat-file', '-e', `${resolvedCommit}:${moduleName}`], {
        cwd: root,
        stdio: ['ignore', 'ignore', 'pipe']
      });
    } catch (_) {
      throw new Error(`${moduleName} does not exist at commit ${resolvedCommit.slice(0, 12)}.`);
    }

    try {
      execFileSync('git', ['diff', '--quiet', '--no-ext-diff', resolvedCommit, '--', moduleName], {
        cwd: root,
        stdio: ['ignore', 'ignore', 'pipe']
      });
    } catch (error) {
      if (error && error.status === 1) {
        throw new Error(`Working module ${moduleName} does not match commit ${resolvedCommit.slice(0, 12)}; commit or restore that exact module before stamping its URL.`);
      }
      throw new Error(`Could not compare working module ${moduleName} with commit ${resolvedCommit.slice(0, 12)}.`);
    }
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stampModuleVersion(content, moduleName, hash) {
  const escapedName = escapeRegex(moduleName);
  const pattern = new RegExp(
    `(loadModule\\(\\s*['"][^'"]+['"]\\s*,\\s*['"]${escapeRegex(CDN_BASE)}/${escapedName}\\?v=)([^'"\\s&]+)(['"]\\s*\\))`,
    'g'
  );
  const matches = [...content.matchAll(pattern)];
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one CDN loadModule() URL for ${moduleName}; found ${matches.length}.`);
  }

  const previousHash = matches[0][2];
  return {
    content: content.replace(pattern, `$1${hash}$3`),
    previousHash,
    changed: previousHash !== hash
  };
}

function createStampPlan(root, modules, hash) {
  const files = LOADER_FILES.map((relativePath) => ({
    relativePath,
    absolutePath: path.join(root, relativePath),
    content: fs.readFileSync(path.join(root, relativePath), 'utf8')
  }));
  const canonical = files[0].content;

  for (const mirror of files.slice(1)) {
    if (mirror.content !== canonical) {
      throw new Error(`${mirror.relativePath} differs from ${LOADER_FILES[0]}; run the canonical build/mirror repair before cache-busting.`);
    }
  }

  let nextContent = canonical;
  const changes = [];
  for (const moduleName of modules) {
    const result = stampModuleVersion(nextContent, moduleName, hash);
    nextContent = result.content;
    changes.push({ moduleName, previousHash: result.previousHash, hash, changed: result.changed });
  }

  return { files, changes, nextContent, changed: nextContent !== canonical };
}
function removeTemporaryFile(io, filePath, errors) {
  try {
    io.unlinkSync(filePath);
  } catch (error) {
    if (!error || error.code !== 'ENOENT') {
      errors.push(`${path.basename(filePath)}: ${error.message}`);
    }
  }
}

function atomicWriteLoaderFiles(files, nextContent, options = {}) {
  const io = options.fs || fs;
  const token = options.token || `${process.pid}-${Date.now()}-${randomBytes(6).toString('hex')}`;
  const prepared = files.map((file) => {
    const directory = path.dirname(file.absolutePath);
    const basename = path.basename(file.absolutePath);
    return {
      ...file,
      tempPath: path.join(directory, `.${basename}.cache-bust-${token}.tmp`),
      backupPath: path.join(directory, `.${basename}.cache-bust-${token}.bak`),
      replaced: false
    };
  });
  const cleanupErrors = [];

  try {
    for (const item of prepared) {
      const mode = io.statSync(item.absolutePath).mode & 0o777;
      io.writeFileSync(item.tempPath, nextContent, { encoding: 'utf8', flag: 'wx', mode });
      if (io.readFileSync(item.tempPath, 'utf8') !== nextContent) {
        throw new Error(`Prepared loader content verification failed for ${item.relativePath}.`);
      }
      io.copyFileSync(item.absolutePath, item.backupPath, fs.constants.COPYFILE_EXCL);
    }

    for (const item of prepared) {
      io.renameSync(item.tempPath, item.absolutePath);
      item.replaced = true;
    }
  } catch (error) {
    const rollbackErrors = [];
    for (const item of [...prepared].reverse()) {
      if (!item.replaced) continue;
      try {
        io.copyFileSync(item.backupPath, item.absolutePath);
      } catch (rollbackError) {
        rollbackErrors.push(`${item.relativePath}: ${rollbackError.message}`);
      }
    }
    for (const item of prepared) {
      removeTemporaryFile(io, item.tempPath, cleanupErrors);
      removeTemporaryFile(io, item.backupPath, cleanupErrors);
    }
    const recoveryErrors = [...rollbackErrors, ...cleanupErrors];
    const recoveryDetail = recoveryErrors.length ? ` Recovery issues: ${recoveryErrors.join('; ')}` : '';
    const failure = new Error(`Atomic loader update failed: ${error.message}.${recoveryDetail}`);
    failure.cause = error;
    throw failure;
  }

  for (const item of prepared) {
    removeTemporaryFile(io, item.tempPath, cleanupErrors);
    removeTemporaryFile(io, item.backupPath, cleanupErrors);
  }
  if (cleanupErrors.length) {
    throw new Error(`Loader URLs were updated, but temporary cleanup failed: ${cleanupErrors.join('; ')}`);
  }

  return prepared.map(({ relativePath, absolutePath }) => ({ relativePath, absolutePath }));
}


function run(options = {}) {
  const argv = options.argv || process.argv.slice(2);
  const root = path.resolve(options.root || REPO_ROOT);
  const log = options.log || console.log;
  const commitVerifier = options.verifyCommit || verifyCommitHash;
  const moduleVerifier = options.verifyModules || verifySelectedModulesAtCommit;
  const loaderWriter = options.writeLoaders || atomicWriteLoaderFiles;
  const args = parseArgs(argv);
  const resolvedCommit = commitVerifier(args.hash, root);

  if (!String(resolvedCommit).toLowerCase().startsWith(args.hash)) {
    throw new Error(`Hash ${args.hash} did not resolve to the expected commit.`);
  }
  moduleVerifier(resolvedCommit, args.modules, root);

  const plan = createStampPlan(root, args.modules, args.hash);
  for (const change of plan.changes) {
    log(`${change.moduleName}: ${change.previousHash} -> ${change.hash}${change.changed ? '' : ' (already current)'}`);
  }

  if (args.dryRun) {
    log(`Dry run: would update ${plan.changed ? LOADER_FILES.length : 0} loader file(s); no files written.`);
    return { ...plan, dryRun: true };
  }

  if (plan.changed) {
    loaderWriter(plan.files, plan.nextContent, options.atomicOptions);
    log(`Updated ${LOADER_FILES.length} loader files.`);
  } else {
    log('All selected module URLs already use the requested hash; no files written.');
  }
  return { ...plan, dryRun: false };
}

if (require.main === module) {
  if (process.argv.slice(2).some((arg) => arg === '--help' || arg === '-h')) {
    console.log(usage());
  } else {
    try {
      run();
    } catch (error) {
      console.error(`Error: ${error.message}`);
      console.error('');
      console.error(usage());
      process.exitCode = 1;
    }
  }
}

module.exports = {
  CDN_BASE,
  LOADER_FILES,
  atomicWriteLoaderFiles,
  createStampPlan,
  normalizeCommitHash,
  normalizeModuleName,
  parseArgs,
  run,
  stampModuleVersion,
  usage,
  verifyCommitHash,
  verifySelectedModulesAtCommit
};
