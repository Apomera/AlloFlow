#!/usr/bin/env node
'use strict';

/**
 * One command to change the Gemini Canvas link, and one check to prove it did not drift.
 *
 * The Canvas address changes with every release, and it was living in five places that all had to
 * agree: release.json (what the launcher fetches at runtime), the matching entry in releases.json,
 * the launcher's fallback constant, the launcher's button href (what a visitor gets before any
 * JavaScript runs), and the in-app modal that opens Canvas directly. Updating four of five is
 * silent: the launcher looks right while the in-app button still sends people to a dead release,
 * or a no-JavaScript visitor gets the old link from the raw href.
 *
 * release.json is the source of truth. Everything else is stamped from it.
 *
 *   node dev-tools/set_canvas_url.cjs https://share.gemini.google/XXXX   update everything
 *   node dev-tools/set_canvas_url.cjs --check                            fail if they disagree
 *
 * --check is wired into tests/canvas_url_single_source.test.js so drift fails a run rather than
 * reaching a teacher as a broken link.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MIRROR = path.join(ROOT, 'desktop', 'web-app', 'public');
const CANVAS_PATTERN = /^https:\/\/share\.gemini\.google\/[A-Za-z0-9_-]+$/;

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function firstMatch(text, pattern) {
  const found = text.match(pattern);
  return found ? found[1] : null;
}

/** Every place the link is held, described once so update and check cannot disagree. */
function sites() {
  const releasePath = path.join(ROOT, 'release.json');
  const release = JSON.parse(read(releasePath));
  const version = release.version;
  return [
    {
      label: 'release.json (source of truth)',
      file: releasePath,
      get: (text) => JSON.parse(text).canvas_url || null,
      set: (text, url) => {
        const data = JSON.parse(text);
        data.canvas_url = url;
        return JSON.stringify(data, null, 2) + '\n';
      },
    },
    {
      label: `releases.json (entry for v${version})`,
      file: path.join(ROOT, 'releases.json'),
      get: (text) => {
        const entry = JSON.parse(text).find((item) => item && item.version === version);
        return entry ? entry.canvas_url || null : null;
      },
      set: (text, url) => {
        const list = JSON.parse(text);
        const entry = list.find((item) => item && item.version === version);
        if (entry) entry.canvas_url = url;
        return JSON.stringify(list, null, 2) + '\n';
      },
    },
    {
      label: 'launch.html (fallback constant)',
      file: path.join(ROOT, 'launch.html'),
      get: (text) => firstMatch(text, /FALLBACK_CANVAS_URL\s*=\s*"([^"]+)"/),
      set: (text, url) => text.replace(/(FALLBACK_CANVAS_URL\s*=\s*")[^"]+(")/, `$1${url}$2`),
    },
    {
      label: 'launch.html (button href, what a no-JavaScript visitor gets)',
      file: path.join(ROOT, 'launch.html'),
      get: (text) => firstMatch(text, /id="launch-btn"[^>]*?href="([^"]+)"/s),
      set: (text, url) => text.replace(/(id="launch-btn"[\s\S]*?href=")[^"]+(")/, `$1${url}$2`),
    },
    {
      label: 'view_misc_modals_source.jsx (in-app open-Canvas button)',
      file: path.join(ROOT, 'view_misc_modals_source.jsx'),
      get: (text) => firstMatch(text, /window\.open\('(https:\/\/share\.gemini\.google\/[^']+)'/),
      set: (text, url) => text.replace(/(window\.open\(')https:\/\/share\.gemini\.google\/[^']+(')/, `$1${url}$2`),
    },
  ];
}

function check() {
  const found = sites().map((site) => ({ label: site.label, url: site.get(read(site.file)) }));
  const missing = found.filter((entry) => !entry.url);
  const urls = [...new Set(found.filter((entry) => entry.url).map((entry) => entry.url))];
  found.forEach((entry) => console.log('  ' + (entry.url || '(not found)') + '   ' + entry.label));
  if (missing.length) {
    console.error('\nCANVAS URL: FAIL — could not read the link from ' + missing.length + ' site(s).');
    console.error('A pattern here stopped matching, so an update would silently skip that file.');
    return 1;
  }
  if (urls.length !== 1) {
    console.error('\nCANVAS URL: FAIL — ' + urls.length + ' different links are live at once:');
    urls.forEach((url) => console.error('  ' + url));
    console.error('Run: node dev-tools/set_canvas_url.cjs <url>');
    return 1;
  }
  // The published mirror must agree too, or the CDN app keeps serving the previous link.
  const drifted = ['release.json', 'releases.json', 'launch.html'].filter((name) => {
    const mirrored = path.join(MIRROR, name);
    return fs.existsSync(mirrored) && read(mirrored) !== read(path.join(ROOT, name));
  });
  if (drifted.length) {
    console.error('\nCANVAS URL: FAIL — these differ from their published mirror: ' + drifted.join(', '));
    return 1;
  }
  console.log('\nCANVAS URL: PASS (one link, ' + urls[0] + ', in all ' + found.length + ' places, mirrors in sync)');
  return 0;
}

function update(url) {
  if (!CANVAS_PATTERN.test(url)) {
    console.error('That does not look like a Canvas share link: ' + url);
    console.error('Expected https://share.gemini.google/<id>');
    return 1;
  }
  let changed = 0;
  sites().forEach((site) => {
    const before = read(site.file);
    const after = site.set(before, url);
    if (after === before) {
      console.log('  unchanged  ' + site.label);
      return;
    }
    fs.writeFileSync(site.file, after);
    changed += 1;
    console.log('  updated    ' + site.label);
  });
  ['release.json', 'releases.json', 'launch.html'].forEach((name) => {
    const source = path.join(ROOT, name);
    const mirrored = path.join(MIRROR, name);
    if (!fs.existsSync(mirrored)) return;
    fs.copyFileSync(source, mirrored);
    console.log('  mirrored   desktop/web-app/public/' + name);
  });
  console.log('\n' + changed + ' file(s) changed. Still to do:');
  console.log('  node _build_view_misc_modals_module.js     (the modal lives in a built module)');
  console.log('  git add + commit + push                   (the promo site is Pages off main)');
  console.log('  ./deploy.sh                               (the CDN app copy updates on deploy)');
  return 0;
}

function main() {
  const arg = process.argv[2];
  if (!arg || arg === '--check') {
    process.exitCode = check();
    return;
  }
  process.exitCode = update(arg);
}

module.exports = { check, sites, CANVAS_PATTERN };
if (require.main === module) main();
