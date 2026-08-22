#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DESKTOP_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(DESKTOP_ROOT, '..');
const DESKTOP_REACT_ENV = Object.freeze({
  REACT_APP_API_KEY: '',
  REACT_APP_API_MODE: 'local',
  REACT_APP_APP_ID: '',
  REACT_APP_AUTH_DOMAIN: '',
  REACT_APP_DATA_BACKEND: 'auto',
  REACT_APP_DESKTOP: '1',
  REACT_APP_DISALLOWED_STUDENT_HOSTS: '',
  REACT_APP_FIREBASE_APP_CHECK_SITE_KEY: '',
  REACT_APP_GEMINI_API_KEY: '',
  REACT_APP_MEASUREMENT_ID: '',
  REACT_APP_MESSAGING_SENDER_ID: '',
  REACT_APP_POCKETBASE_URL: '',
  REACT_APP_PROJECT_ID: '',
  REACT_APP_STORAGE_BUCKET: '',
  REACT_APP_STUDENT_BASE_URL: '',
});

const MODULE_CONTRACTS = [
  {
    file: 'doc_pipeline_module.js',
    source: 'doc_pipeline_source.jsx',
    rebuild: 'node build.js --compile',
    render(source) {
      const trailingNewline = source.endsWith('\n') ? '' : '\n';
      return (
        '(function(){"use strict";\n'
        + 'if(window.AlloModules&&window.AlloModules.DocPipelineModule){console.log("[CDN] DocPipelineModule already loaded, skipping"); return;}\n'
        + source + trailingNewline
        + '})();\n'
      );
    },
  },
  {
    file: 'misc_handlers_module.js',
    source: 'misc_handlers_source.jsx',
    rebuild: 'node _build_misc_handlers_module.js',
    render(source) {
      return `(function() {
'use strict';
if (window.AlloModules && window.AlloModules.MiscHandlersModule) { console.log('[CDN] MiscHandlersModule already loaded, skipping'); return; }
${source}
window.AlloModules.MiscHandlersModule = true;
console.log('[MiscHandlers] 4 handlers registered (handleFileUpload + handleLoadProject + handleRestoreView + detectClimaxArchetype)');
})();
`;
    },
  },
];

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function relativeDisplay(repoRoot, filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function readRequired(filePath, label, errors) {
  try {
    return fs.readFileSync(filePath);
  } catch (error) {
    errors.push(`${label} is missing or unreadable: ${filePath} (${error.message})`);
    return null;
  }
}

function validateModuleContracts({ repoRoot, appBuildDir, contracts = MODULE_CONTRACTS }) {
  const errors = [];

  for (const contract of contracts) {
    const sourcePath = path.join(repoRoot, contract.source);
    const canonicalPath = path.join(repoRoot, contract.file);
    const publicPath = path.join(repoRoot, 'desktop', 'web-app', 'public', contract.file);
    const desktopPath = path.join(appBuildDir, contract.file);
    const source = readRequired(sourcePath, `${contract.file} source`, errors);
    const canonical = readRequired(canonicalPath, `${contract.file} canonical module`, errors);
    const publicMirror = readRequired(publicPath, `${contract.file} public mirror`, errors);
    const desktopArtifact = readRequired(desktopPath, `${contract.file} desktop artifact`, errors);

    if (source && canonical) {
      const expected = Buffer.from(contract.render(source.toString('utf8')), 'utf8');
      if (!expected.equals(canonical)) {
        errors.push(
          `${contract.file} is not built from ${contract.source} `
          + `(expected ${sha256(expected).slice(0, 12)}, found ${sha256(canonical).slice(0, 12)}). `
          + `Run: ${contract.rebuild}`
        );
      }
    }

    if (!canonical) continue;
    for (const [label, candidatePath, candidate] of [
      ['public mirror', publicPath, publicMirror],
      ['desktop artifact', desktopPath, desktopArtifact],
    ]) {
      if (candidate && !candidate.equals(canonical)) {
        errors.push(
          `${contract.file} ${label} differs from the canonical module `
          + `(${sha256(canonical).slice(0, 12)} != ${sha256(candidate).slice(0, 12)}): `
          + relativeDisplay(repoRoot, candidatePath)
        );
      }
    }
  }

  return errors;
}

function normalizeBuildReference(reference) {
  const raw = String(reference || '').replace(/\\/g, '/');
  const withoutPrefix = raw.replace(/^\.\//, '').replace(/^\//, '');
  const normalized = path.posix.normalize(withoutPrefix);
  if (!normalized || normalized === '.' || normalized === '..' || normalized.startsWith('../')) {
    throw new Error(`unsafe build artifact path: ${reference}`);
  }
  return normalized;
}

function resolveBuildReference(appBuildDir, reference) {
  const normalized = normalizeBuildReference(reference);
  const resolved = path.resolve(appBuildDir, ...normalized.split('/'));
  const relative = path.relative(path.resolve(appBuildDir), resolved);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    if (!relative && normalized === 'index.html') return resolved;
    throw new Error(`build artifact escapes desktop/app-build: ${reference}`);
  }
  return resolved;
}

function validateBuildArtifacts({ appBuildDir }) {
  const errors = [];
  const manifestPath = path.join(appBuildDir, 'asset-manifest.json');
  const indexPath = path.join(appBuildDir, 'index.html');
  const workerPath = path.join(appBuildDir, 'sw.js');
  let manifest = null;
  let html = '';
  let worker = '';

  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    errors.push(`asset-manifest.json is missing or invalid JSON (${error.message})`);
  }
  try {
    html = fs.readFileSync(indexPath, 'utf8');
  } catch (error) {
    errors.push(`index.html is missing or unreadable (${error.message})`);
  }
  try {
    worker = fs.readFileSync(workerPath, 'utf8');
  } catch (error) {
    errors.push(`sw.js is missing or unreadable (${error.message})`);
  }

  const requiredManifestKeys = ['main.js', 'main.css', 'index.html'];
  const files = manifest && manifest.files && typeof manifest.files === 'object' ? manifest.files : null;
  if (manifest && !files) errors.push('asset-manifest.json must contain a files object.');

  if (files) {
    for (const key of requiredManifestKeys) {
      if (typeof files[key] !== 'string' || !files[key]) {
        errors.push(`asset-manifest.json is missing files[${JSON.stringify(key)}].`);
      }
    }
    for (const [key, reference] of Object.entries(files)) {
      if (typeof reference !== 'string') {
        errors.push(`asset-manifest.json files[${JSON.stringify(key)}] is not a string.`);
        continue;
      }
      try {
        const artifact = resolveBuildReference(appBuildDir, reference);
        if (!fs.existsSync(artifact) || !fs.statSync(artifact).isFile()) {
          errors.push(`asset-manifest.json references a missing file: ${reference}`);
        }
      } catch (error) {
        errors.push(error.message);
      }
    }

    if (files['main.js'] && !/^\.\/static\/js\/main\.[a-f0-9]{8,}\.js$/.test(files['main.js'])) {
      errors.push(`asset-manifest main.js is not content hashed: ${files['main.js']}`);
    }
    if (files['main.css'] && !/^\.\/static\/css\/main\.[a-f0-9]{8,}\.css$/.test(files['main.css'])) {
      errors.push(`asset-manifest main.css is not content hashed: ${files['main.css']}`);
    }
  }

  const entrypoints = manifest && Array.isArray(manifest.entrypoints) ? manifest.entrypoints : null;
  if (manifest && !entrypoints) errors.push('asset-manifest.json must contain an entrypoints array.');
  if (entrypoints) {
    for (const reference of entrypoints) {
      try {
        const artifact = resolveBuildReference(appBuildDir, reference);
        if (!fs.existsSync(artifact) || !fs.statSync(artifact).isFile()) {
          errors.push(`asset-manifest entrypoint is missing: ${reference}`);
        }
      } catch (error) {
        errors.push(error.message);
      }
    }
  }

  if (files && files['main.js']) {
    try {
      const mainBundle = fs.readFileSync(resolveBuildReference(appBuildDir, files['main.js']), 'utf8');
      const injectedNames = new Set(
        Array.from(mainBundle.matchAll(/\b(REACT_APP_[A-Z0-9_]+):/g), (match) => match[1])
      );
      const injectedValues = new Map();
      for (const match of mainBundle.matchAll(/\b(REACT_APP_[A-Z0-9_]+):("(?:\\.|[^"\\])*")/g)) {
        const values = injectedValues.get(match[1]) || new Set();
        values.add(JSON.parse(match[2]));
        injectedValues.set(match[1], values);
      }
      for (const [name, expected] of Object.entries(DESKTOP_REACT_ENV)) {
        const values = injectedValues.get(name);
        if (!injectedNames.has(name) || !values || values.size !== 1 || !values.has(expected)) {
          errors.push(
            `compiled main bundle must inject ${name}=${JSON.stringify(expected)}; found `
            + (values ? JSON.stringify(Array.from(values)) : 'no deterministic string value')
          );
        }
      }
      for (const name of injectedNames) {
        if (!Object.prototype.hasOwnProperty.call(DESKTOP_REACT_ENV, name)) {
          errors.push(`compiled main bundle contains an unapproved environment value: ${name}`);
        }
      }
      if (/AIza[0-9A-Za-z_-]{20,}/.test(mainBundle)) {
        errors.push('compiled main bundle contains a baked Google API key.');
      }
    } catch (error) {
      errors.push(`compiled main bundle environment could not be verified (${error.message})`);
    }
  }

  if (html) {
    if (!/<div\s+id=["']root["']><\/div>/.test(html)) {
      errors.push('index.html is missing the React root element.');
    }
    if (!/serviceWorker\.register\(["']\.\/sw\.js["']/.test(html)) {
      errors.push('index.html must register the app-scoped ./sw.js service worker.');
    }
    if (files && files['main.js'] && !html.includes(files['main.js'])) {
      errors.push(`index.html does not load manifest main.js: ${files['main.js']}`);
    }
    if (files && files['main.css'] && !html.includes(files['main.css'])) {
      errors.push(`index.html does not load manifest main.css: ${files['main.css']}`);
    }
  }

  if (worker) {
    if (worker.includes('__BUILD_TS__') || worker.includes('__PRECACHE_PATHS__')) {
      errors.push('sw.js still contains an unstamped build placeholder.');
    }
    if (!/const CACHE_NAME = ['"]alloflow-v\d+['"]/.test(worker)) {
      errors.push('sw.js is missing a stamped alloflow-v<timestamp> cache name.');
    }
    if (!/self\.registration\.scope/.test(worker) || !/const SHELL_URL = scopedUrl\(['"]\.\/index\.html['"]\)/.test(worker)) {
      errors.push('sw.js must resolve its shell relative to the desktop app scope.');
    }
    if (/cache\.(?:add|match|put)\(\s*['"]\/index\.html['"]/.test(worker)) {
      errors.push('sw.js must not cache a root-scoped /index.html.');
    }

    const precacheMatch = worker.match(/const PRECACHE_PATHS = (\[[^;\r\n]*\]);/);
    let precache = null;
    if (!precacheMatch) {
      errors.push('sw.js is missing a JSON PRECACHE_PATHS declaration.');
    } else {
      try {
        precache = JSON.parse(precacheMatch[1]);
      } catch (error) {
        errors.push(`sw.js PRECACHE_PATHS is invalid JSON (${error.message}).`);
      }
    }
    if (Array.isArray(precache)) {
      const requiredPrecache = ['./index.html', './alloflow_desktop_bridge.js'];
      if (files && files['main.js']) requiredPrecache.push(files['main.js']);
      if (files && files['main.css']) requiredPrecache.push(files['main.css']);
      for (const reference of requiredPrecache) {
        if (!precache.includes(reference)) errors.push(`sw.js does not precache ${reference}.`);
      }
      for (const reference of precache) {
        try {
          const artifact = resolveBuildReference(appBuildDir, reference);
          if (!fs.existsSync(artifact) || !fs.statSync(artifact).isFile()) {
            errors.push(`sw.js precaches a missing file: ${reference}`);
          }
        } catch (error) {
          errors.push(error.message);
        }
      }
    }
  }

  return errors;
}

function validateDesktopAppBuild(options = {}) {
  const repoRoot = path.resolve(options.repoRoot || REPO_ROOT);
  const appBuildDir = path.resolve(options.appBuildDir || path.join(repoRoot, 'desktop', 'app-build'));
  const errors = [
    ...validateModuleContracts({ repoRoot, appBuildDir, contracts: options.contracts || MODULE_CONTRACTS }),
    ...validateBuildArtifacts({ appBuildDir }),
  ];
  if (errors.length) {
    const detail = errors.map((error) => `  - ${error}`).join('\n');
    throw new Error(`Desktop app-build verification failed:\n${detail}`);
  }
  return {
    appBuildDir,
    modules: (options.contracts || MODULE_CONTRACTS).map((contract) => contract.file),
  };
}

function main() {
  const result = validateDesktopAppBuild();
  console.log(
    '[AlloFlow Desktop] Verified source/public/app-build parity for '
    + result.modules.join(', ')
  );
  console.log('[AlloFlow Desktop] Asset manifest and service-worker precache are internally consistent');
}

module.exports = {
  DESKTOP_REACT_ENV,
  MODULE_CONTRACTS,
  normalizeBuildReference,
  validateBuildArtifacts,
  validateDesktopAppBuild,
  validateModuleContracts,
};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('[AlloFlow Desktop] ' + error.message);
    process.exitCode = 1;
  }
}
