#!/usr/bin/env node
// bump-link.mjs — one-command release script for AlloFlow / PrismFlow.
//
// Usage:
//   node bump-link.mjs <new-canvas-url> "<release notes>" [--force] [--major]
//
// Default behavior bumps MINOR (e.g. 1.1 -> 1.2).
// --major bumps MAJOR and resets MINOR to 0 (e.g. 1.1 -> 2.0).
// --force skips URL regex validation AND the git-cleanliness check.
//
// On success, this script:
//   1. Overwrites desktop/web-app/public/release.json with the new release.
//   2. Prepends a new entry to desktop/web-app/public/releases.json.
//   3. Rewrites the FALLBACK_CANVAS_URL constant in launch.html.
//   4. Rewrites the data-version-label element in index.html (warning-only).
//
// Writes are atomic where reasonable (write .tmp + rename) and ordered so
// that launch.html is rewritten BEFORE the JSON files; if the launch.html
// regex fails, no JSON files are touched.

import { readFile, writeFile, rename, access } from "node:fs/promises";
import { execSync } from "node:child_process";
import path from "node:path";

// ---------- constants -------------------------------------------------------

const REPO_ROOT = "C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated";
const DEPLOY_DIR = path.posix.join(REPO_ROOT, "desktop/web-app");
const PUBLIC_DIR = path.posix.join(DEPLOY_DIR, "public");

// Canonical source-of-truth files live at the repo root (where index.html,
// calculator.html, features.html live) — these are what GitHub Pages serves
// at apomera.github.io/AlloFlow/. They are also mirrored to PUBLIC_DIR at
// deploy time so Firebase (which serves desktop/web-app/build/) sees them
// after the React build copies public/ → build/.
const RELEASE_JSON = path.posix.join(REPO_ROOT, "release.json");
const RELEASES_JSON = path.posix.join(REPO_ROOT, "releases.json");
const LAUNCH_HTML = path.posix.join(REPO_ROOT, "launch.html");
const INDEX_HTML = path.posix.join(REPO_ROOT, "index.html");

const CANVAS_URL_RE = /^https:\/\/gemini\.google\.com\/share\/[a-f0-9]+$/;
const FALLBACK_RE = /const\s+FALLBACK_CANVAS_URL\s*=\s*"[^"]*"\s*;/g;
const VERSION_LABEL_RE =
  /(<[^>]*\bdata-version-label\b[^>]*>)v?\d+\.\d+(<\/[^>]+>)/;

// ---------- tiny helpers ----------------------------------------------------

function die(code, msg) {
  process.stderr.write(`bump-link: ERROR: ${msg}\n`);
  process.exit(code);
}

function info(msg) {
  process.stdout.write(`${msg}\n`);
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function readJson(p) {
  const raw = await readFile(p, "utf8");
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`JSON parse failed for ${p}: ${e.message}`);
  }
}

async function writeAtomic(p, content) {
  const tmp = `${p}.tmp`;
  await writeFile(tmp, content, "utf8");
  await rename(tmp, p);
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function isoCompact(iso) {
  // 2026-05-29T14:00:00.000Z -> 20260529T140000Z
  const d = new Date(iso);
  return (
    `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}` +
    `T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`
  );
}

function makeReleaseId(isoTimestamp, version) {
  const [maj, min] = version.split(".");
  return `rel_${isoCompact(isoTimestamp)}_v${maj}_${min}`;
}

function nextVersion(current, major) {
  const m = /^(\d+)\.(\d+)$/.exec(current);
  if (!m) throw new Error(`current version "${current}" is not MAJOR.MINOR`);
  const maj = Number(m[1]);
  const min = Number(m[2]);
  return major ? `${maj + 1}.0` : `${maj}.${min + 1}`;
}

// ---------- argv parsing ----------------------------------------------------

function parseArgv(argv) {
  const flags = { force: false, major: false };
  const positional = [];
  for (const a of argv) {
    if (a === "--force") flags.force = true;
    else if (a === "--major") flags.major = true;
    else if (a === "--help" || a === "-h") {
      info(
        'Usage: node bump-link.mjs <new-canvas-url> "<release notes>" [--force] [--major]'
      );
      process.exit(0);
    } else if (a.startsWith("--")) {
      die(2, `unknown flag: ${a}`);
    } else {
      positional.push(a);
    }
  }
  return { flags, positional };
}

// ---------- preflight -------------------------------------------------------

function checkGitClean(force) {
  // Refuses if AlloFlowANTI.txt or anything under desktop/web-app/ is dirty.
  let out;
  try {
    out = execSync(
      `git -C "${REPO_ROOT}" status --porcelain -- AlloFlowANTI.txt desktop/web-app/`,
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    );
  } catch (e) {
    // git not installed, not a repo, etc. — warn and continue.
    process.stderr.write(
      `bump-link: WARN: git cleanliness check skipped (${e.message.split("\n")[0]})\n`
    );
    return;
  }
  const dirty = out.trim();
  if (dirty.length > 0) {
    if (force) {
      process.stderr.write(
        `bump-link: WARN: --force overrides dirty working tree:\n${dirty}\n`
      );
      return;
    }
    process.stderr.write(
      `bump-link: ERROR: uncommitted changes in tracked release surface:\n${dirty}\n` +
        `Commit or stash, or pass --force to override.\n`
    );
    process.exit(4);
  }
}

// ---------- launch.html rewrite (done first, can abort cleanly) -------------

async function rewriteLaunchHtml(newUrl) {
  if (!(await exists(LAUNCH_HTML))) {
    die(6, `launch.html not found at ${LAUNCH_HTML}`);
  }
  const original = await readFile(LAUNCH_HTML, "utf8");
  const matches = original.match(FALLBACK_RE);
  if (!matches || matches.length === 0) {
    die(
      6,
      `FALLBACK_CANVAS_URL constant not found in launch.html. ` +
        `Expected exactly one match for: const FALLBACK_CANVAS_URL = "...";`
    );
  }
  if (matches.length > 1) {
    die(
      6,
      `FALLBACK_CANVAS_URL constant matched ${matches.length} times in launch.html; expected exactly 1.`
    );
  }
  const updated = original.replace(
    FALLBACK_RE,
    `const FALLBACK_CANVAS_URL = "${newUrl}";`
  );
  if (updated === original) {
    die(6, `launch.html: replacement produced no change (URL already current?).`);
  }
  await writeAtomic(LAUNCH_HTML, updated);
  info(`  launch.html: FALLBACK_CANVAS_URL -> ${newUrl}`);
}

// ---------- index.html rewrite (warning-only) -------------------------------

async function rewriteIndexHtml(newVersion) {
  if (!(await exists(INDEX_HTML))) {
    process.stderr.write(
      `bump-link: WARN: index.html not found at ${INDEX_HTML}; skipping navbar version bump.\n`
    );
    return;
  }
  const original = await readFile(INDEX_HTML, "utf8");
  if (!VERSION_LABEL_RE.test(original)) {
    process.stderr.write(
      `bump-link: WARN: no element with data-version-label found in index.html; ` +
        `skipping navbar version bump (user may have re-themed the navbar).\n`
    );
    return;
  }
  const updated = original.replace(
    VERSION_LABEL_RE,
    (_full, open, close) => `${open}v${newVersion}${close}`
  );
  if (updated === original) {
    process.stderr.write(
      `bump-link: WARN: index.html navbar version already at v${newVersion}; no change written.\n`
    );
    return;
  }
  await writeAtomic(INDEX_HTML, updated);
  info(`  index.html: navbar version -> v${newVersion}`);
}

// ---------- JSON writes -----------------------------------------------------

async function writeReleaseJson(entry) {
  const body = JSON.stringify(entry, null, 2) + "\n";
  await writeAtomic(RELEASE_JSON, body);
  info(`  release.json: version=${entry.version} canvas_url=${entry.canvas_url}`);
}

async function prependReleasesJson(entry) {
  let arr = [];
  if (await exists(RELEASES_JSON)) {
    try {
      const existing = await readJson(RELEASES_JSON);
      if (!Array.isArray(existing)) {
        throw new Error("releases.json root is not an array");
      }
      arr = existing;
    } catch (e) {
      die(5, e.message);
    }
  }
  arr.unshift(entry);
  const body = JSON.stringify(arr, null, 2) + "\n";
  await writeAtomic(RELEASES_JSON, body);
  info(`  releases.json: prepended id=${entry.id} (total entries=${arr.length})`);
}

// ---------- main ------------------------------------------------------------

async function main() {
  const { flags, positional } = parseArgv(process.argv.slice(2));

  // Step 1: arg validation
  if (positional.length < 2) {
    die(
      2,
      'expected 2 positional args. Usage: node bump-link.mjs <new-canvas-url> "<release notes>" [--force] [--major]'
    );
  }
  const [newUrl, notesRaw] = positional;
  const notes = notesRaw == null ? "" : String(notesRaw);
  if (notes.trim().length === 0) {
    die(2, "release notes must be non-empty.");
  }

  // Step 2: URL regex
  if (!CANVAS_URL_RE.test(newUrl)) {
    if (!flags.force) {
      die(
        3,
        `canvas URL "${newUrl}" does not match ${CANVAS_URL_RE}. Pass --force to override.`
      );
    }
    process.stderr.write(
      `bump-link: WARN: --force overrides URL regex check for "${newUrl}".\n`
    );
  }

  // Step 3: git cleanliness
  checkGitClean(flags.force);

  // Step 4: read current version
  let oldVersion = "1.0";
  if (await exists(RELEASE_JSON)) {
    try {
      const cur = await readJson(RELEASE_JSON);
      if (typeof cur.version !== "string" || !/^\d+\.\d+$/.test(cur.version)) {
        die(5, `release.json has invalid "version" field: ${JSON.stringify(cur.version)}`);
      }
      oldVersion = cur.version;
    } catch (e) {
      die(5, e.message);
    }
  } else {
    process.stderr.write(
      `bump-link: NOTE: release.json not found; defaulting current version to 1.0 ` +
        `(first run will produce ${flags.major ? "2.0" : "1.1"}).\n`
    );
  }

  let newVersion;
  try {
    newVersion = nextVersion(oldVersion, flags.major);
  } catch (e) {
    die(5, e.message);
  }

  const releasedIso = new Date().toISOString();
  const id = makeReleaseId(releasedIso, newVersion);

  const newEntry = {
    id,
    version: newVersion,
    canvas_url: newUrl,
    released: releasedIso,
    notes,
  };

  // release.json shape omits "id"
  const releasePointer = {
    version: newVersion,
    canvas_url: newUrl,
    released: releasedIso,
    notes,
  };

  info(`bump-link: ${oldVersion} -> ${newVersion} (${flags.major ? "major" : "minor"} bump)`);

  // Step 5: rewrite launch.html FIRST so that a regex failure aborts before
  // any JSON files are touched.
  await rewriteLaunchHtml(newUrl);

  // Step 6: JSON writes.
  await writeReleaseJson(releasePointer);
  await prependReleasesJson(newEntry);

  // Step 7: best-effort index.html navbar bump.
  await rewriteIndexHtml(newVersion);

  // Step 8: final summary.
  info("");
  info("RELEASE SUMMARY");
  info(`  old version : ${oldVersion}`);
  info(`  new version : ${newVersion}`);
  info(`  canvas_url  : ${newUrl}`);
  info(`  released    : ${releasedIso}`);
  info(`  release id  : ${id}`);
  info(`  notes       : ${notes.length > 80 ? notes.slice(0, 77) + "..." : notes}`);
  info("");
  info("Next: cd desktop/web-app && ./deploy.sh");
}

main().catch((e) => {
  die(1, e && e.stack ? e.stack : String(e));
});
