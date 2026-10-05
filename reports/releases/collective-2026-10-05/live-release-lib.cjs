'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '../../..');
const ORIGIN = 'https://alloflow-cdn.pages.dev';
const DEFAULT_BASE = '452e7cd230b62f4e192f055826817653d5b997f4';
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const git = args => execFileSync('git', args, { cwd: ROOT, maxBuffer: 128 * 1024 * 1024 });
const textGit = args => git(args).toString('utf8').trim();
function options(args) {
  const out = { base: DEFAULT_BASE };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--commit' && !out.commit) out.commit = args[++i];
    else if (args[i] === '--base') out.base = args[++i];
    else throw Error('Usage: node live-assets.cjs|live-browser.cjs --commit FULL_FINAL_SHA [--base FULL_BASE_SHA]');
  }
  for (const key of ['commit', 'base']) if (!/^[a-f0-9]{40}$/.test(out[key] || '')) throw Error(key + ' must be an explicit full 40-character commit SHA');
  return out;
}
function snapshot(options) {
  const { commit, base } = options;
  for (const ref of [commit, base]) if (textGit(['rev-parse', '--verify', ref + '^{commit}']) !== ref) throw Error('Unresolved exact commit: ' + ref);
  git(['merge-base', '--is-ancestor', base, commit]);
  const head = textGit(['rev-parse', 'HEAD']);
  const tree = new Set(git(['ls-tree', '-r', '--name-only', '-z', commit]).toString('utf8').split('\0').filter(Boolean));
  const changed = git(['diff', '--name-only', '-z', '--diff-filter=ACMRT', base, commit]).toString('utf8').split('\0').filter(Boolean);
  const deleted = git(['diff', '--name-only', '-z', '--diff-filter=D', base, commit]).toString('utf8').split('\0').filter(Boolean);
  const summaries = new Map();
  const bytes = file => {
    if (!tree.has(file) || file.includes('..') || file.startsWith('/')) throw Error('Missing or invalid committed file: ' + file);
    return git(['show', commit + ':' + file]);
  };
  const expected = file => {
    if (!summaries.has(file)) { const b = bytes(file); summaries.set(file, { file, bytes: b.length, sha256: sha256(b) }); }
    return summaries.get(file);
  };
  const publicPrefix = 'desktop/web-app/public/';
  function runtime(file) {
    if (file === 'AlloFlowANTI.txt') return true;
    if (!file.split('/').some(part => part.startsWith('.')) && !path.basename(file).startsWith('_')
      && !/_source\.(?:js|jsx)$/.test(file) && /\.(?:js|json|html|css|wasm|png|jpe?g|gif|svg|webp|woff2?|ttf|mp3|zip)$/.test(file)
      && tree.has(publicPrefix + file)) return true;
    if (/^(?:app|stem_lab|sel_hub|lang|reading_library|test_prep|vendor|fonts|allo_sheet|alphafold_explorer|circuit_shelf|molecule_shelf|sre-assets|sim_shelf|immersive_geometry|life_skills_[^/]+|timeline_studio|verapdf|zoom_gallery|mathlive-assets|apps_script)\//.test(file))
      return !/\.(?:md|patch|log|bak)$/i.test(file) && !file.split('/').some(part => part.startsWith('.'));
    return !file.includes('/') && !file.startsWith('_') && file !== 'build.js'
      && !/_source\.(?:js|jsx)$/.test(file) && /\.(?:js|json|html|css|wasm|png|jpe?g|svg|woff2?|mp3|zip)$/.test(file)
      && tree.has(publicPrefix + file);
  }
  const selected = new Set(['AlloFlowANTI.txt']);
  const skipped = [], localParityErrors = [];
  for (const file of changed) {
    if (file === publicPrefix + 'index.html') { skipped.push(file); continue; }
    const canonical = file.startsWith(publicPrefix) ? file.slice(publicPrefix.length) : file;
    if (tree.has(canonical) && runtime(canonical)) selected.add(canonical);
    else skipped.push(file);
  }
  // /app is a generated, independently transformed shell, not public/index.html.
  for (const file of tree) if (file.startsWith('app/')) selected.add(file);
  for (const file of selected) {
    const mirror = publicPrefix + file;
    if (file !== 'index.html' && tree.has(mirror) && expected(file).sha256 !== expected(mirror).sha256)
      localParityErrors.push({ file, mirror, canonical: expected(file).sha256, mirrorHash: expected(mirror).sha256 });
  }
  if (localParityErrors.length) throw Error('Final commit has root/public differences: ' + JSON.stringify(localParityErrors));
  const manifest = JSON.parse(bytes('app/asset-manifest.json').toString('utf8'));
  for (const entry of [...Object.values(manifest.files || {}), ...(manifest.entrypoints || [])]) {
    if (typeof entry !== 'string' || /^(?:https?:)?\/\//.test(entry)) continue;
    const file = 'app/' + entry.replace(/^\.?\//, '');
    if (!tree.has(file)) throw Error('App manifest points to missing committed file: ' + file);
    selected.add(file);
  }
  const sw = bytes('app/sw.js').toString('utf8');
  const cacheName = sw.match(/const CACHE_NAME\s*=\s*['"]([^'"]+)['"]/);
  const precache = sw.match(/const PRECACHE_PATHS\s*=\s*(\[[^\n]*\]);/);
  if (!cacheName || !precache) throw Error('Current service-worker cache/precache contract needs review');
  const precachePaths = JSON.parse(precache[1]).map(value => {
    const url = new URL(value, ORIGIN + '/app/');
    if (url.origin !== ORIGIN) throw Error('Unexpected external precache URL');
    const file = decodeURIComponent(url.pathname.slice(1));
    if (!tree.has(file)) throw Error('Service worker precache file absent from commit: ' + file);
    selected.add(file); return file;
  });
  const assets = [...selected].sort().map(file => ({ ...expected(file), url: ORIGIN + '/' + file.split('/').map(encodeURIComponent).join('/') }));
  function fileForUrl(value) {
    const url = new URL(value);
    if (url.origin !== ORIGIN) return null;
    const rel = decodeURIComponent(url.pathname.slice(1));
    const alternatives = [rel, rel.endsWith('/') ? rel + 'index.html' : rel + '.html'];
    if (!rel) alternatives.push('index.html');
    return alternatives.find(file => tree.has(file)) || null;
  }
  return { commit, base, head, tree, changed, deleted, skipped, assets, expected, bytes, fileForUrl,
    cacheName: cacheName[1], precachePaths, headNow: () => textGit(['rev-parse', 'HEAD']) };
}
async function getAsset(asset, mode) {
  const controller = new AbortController(), deadline = setTimeout(() => controller.abort(), 45000);
  const record = { file: asset.file, mode, requestedUrl: asset.url, expectedSha256: asset.sha256, expectedBytes: asset.bytes, at: new Date().toISOString(), redirects: [] };
  try {
    let url = asset.url, response;
    for (let redirects = 0; redirects < 6; redirects++) {
      if (new URL(url).origin !== ORIGIN) throw Error('Redirect outside official target refused');
      response = await fetch(url, { method: 'GET', redirect: 'manual', credentials: 'omit', signal: controller.signal,
        headers: mode === 'revalidate' ? { 'Cache-Control': 'no-cache, no-store', Pragma: 'no-cache' } : {} });
      if (response.status < 300 || response.status >= 400) break;
      const location = response.headers.get('location');
      if (!location) throw Error('Redirect without Location');
      const next = new URL(location, url).href;
      record.redirects.push({ status: response.status, from: url, to: next });
      await response.body?.cancel(); url = next; response = null;
    }
    if (!response) throw Error('Too many redirects');
    record.finalUrl = response.url || url; record.status = response.status;
    record.headers = Object.fromEntries(['content-type','content-encoding','etag','age','cache-control','cf-cache-status','cf-ray','last-modified','date'].map(key => [key, response.headers.get(key)]).filter(([, value]) => value !== null));
    if (response.status !== 200) throw Error('Expected HTTP 200');
    let size = 0;
    const hash = crypto.createHash('sha256');
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > Math.max(asset.bytes + 1024 * 1024, 2 * 1024 * 1024)) { controller.abort(); throw Error('Served response exceeds expected bound'); }
      hash.update(chunk);
    }
    record.bytes = size; record.sha256 = hash.digest('hex');
    record.matches = size === asset.bytes && record.sha256 === asset.sha256;
    if (!record.matches) record.error = 'Served bytes differ from final committed blob';
  } catch (error) { record.matches = false; record.error = error.message; }
  finally { clearTimeout(deadline); }
  return record;
}
function writeReport(name, report) { fs.writeFileSync(path.join(__dirname, name), JSON.stringify(report, null, 2) + '\n'); }
module.exports = { ROOT, ORIGIN, sha256, options, snapshot, getAsset, writeReport };
