#!/usr/bin/env node
/**
 * Release gate: audit the dependencies actually packaged in the MCPB staging directory.
 *
 *   node desktop/mcp/audit_bundle_dependencies.cjs [--prefix desktop/dist/mcpb/staging] [--level high]
 *
 * Runs `npm audit --omit=dev --json` against the staged bundle and fails on any advisory at or above
 * the level UNLESS that advisory is listed in audit_allowlist.json with a written justification, a
 * reviewer, and an expiry date. An allowlist entry that has expired, or that no longer matches any
 * reported advisory, also fails the gate, so accepted risk cannot go stale silently. Accepted
 * advisories are printed in full so the release log carries the disclosure.
 *
 * This replaces a bare `npm audit --audit-level=high`, which cannot express "known, reviewed,
 * mitigated at the boundary, no upstream fix exists" and therefore blocked every release the day a
 * dependency with an unfixable advisory was added.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const LEVELS = ['info', 'low', 'moderate', 'high', 'critical'];
const argv = process.argv.slice(2);
const arg = (name, fallback) => { const i = argv.indexOf(name); return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback; };
const prefix = path.resolve(arg('--prefix', path.join(__dirname, '..', 'dist', 'mcpb', 'staging')));
const level = arg('--level', 'high');
const allowlistPath = path.resolve(arg('--allowlist', path.join(__dirname, 'audit_allowlist.json')));
const threshold = LEVELS.indexOf(level);
if (threshold < 0) { console.error('[audit-bundle] unknown level: ' + level); process.exit(2); }
if (!fs.existsSync(path.join(prefix, 'package-lock.json'))) { console.error('[audit-bundle] no package-lock.json under ' + prefix); process.exit(2); }

function loadAllowlist() {
  if (!fs.existsSync(allowlistPath)) return [];
  const parsed = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
  const entries = Array.isArray(parsed) ? parsed : parsed.accepted;
  if (!Array.isArray(entries)) throw new Error('audit_allowlist.json must be an array or {accepted:[...]}');
  for (const e of entries) {
    for (const key of ['ghsa', 'package', 'reason', 'reviewedBy', 'reviewedOn', 'expires']) {
      if (typeof e[key] !== 'string' || !e[key].trim()) throw new Error('allowlist entry missing ' + key + ': ' + JSON.stringify(e));
    }
    if (!/^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/.test(e.ghsa)) throw new Error('allowlist entry has a malformed GHSA id: ' + e.ghsa);
    if (Number.isNaN(Date.parse(e.expires))) throw new Error('allowlist entry has an unparseable expiry: ' + e.ghsa);
  }
  return entries;
}

function runAudit() {
  const r = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['audit', '--omit=dev', '--json', '--prefix', prefix],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, shell: process.platform === 'win32' });
  // npm audit exits non-zero whenever vulnerabilities exist; the JSON on stdout is still complete.
  const text = String(r.stdout || '').trim();
  if (!text) { console.error('[audit-bundle] npm audit produced no JSON\n' + String(r.stderr || '')); process.exit(2); }
  return JSON.parse(text);
}

function main() {
  const allowlist = loadAllowlist();
  const audit = runAudit();
  const vulns = audit.vulnerabilities || {};
  const today = new Date();
  // Every advisory (by GHSA id) at or above the threshold, with the packages it reaches.
  const advisories = new Map();
  for (const v of Object.values(vulns)) {
    if (LEVELS.indexOf(v.severity) < threshold) continue;
    for (const via of v.via) {
      if (typeof via !== 'object' || !via.url) continue; // transitive entries name a package, not an advisory
      const ghsa = String(via.url).replace('https://github.com/advisories/', '');
      const rec = advisories.get(ghsa) || { ghsa, severity: via.severity, title: via.title, source: via.name, reached: new Set() };
      rec.reached.add(v.name);
      advisories.set(ghsa, rec);
    }
    // A package that is vulnerable only through another vulnerable package carries that package's
    // advisories; walk to the root advisories so the allowlist keys on real GHSA ids.
    for (const via of v.via) {
      if (typeof via !== 'string') continue;
      const rootOf = (name, seen = new Set()) => {
        const node = vulns[name]; if (!node || seen.has(name)) return []; seen.add(name);
        return node.via.flatMap(x => typeof x === 'object' && x.url ? [x] : rootOf(x, seen));
      };
      for (const adv of rootOf(via)) {
        if (LEVELS.indexOf(adv.severity) < threshold) continue;
        const ghsa = String(adv.url).replace('https://github.com/advisories/', '');
        const rec = advisories.get(ghsa) || { ghsa, severity: adv.severity, title: adv.title, source: adv.name, reached: new Set() };
        rec.reached.add(v.name);
        advisories.set(ghsa, rec);
      }
    }
  }

  const failures = [], accepted = [], stale = [];
  for (const rec of advisories.values()) {
    const entry = allowlist.find(e => e.ghsa === rec.ghsa);
    if (!entry) { failures.push(rec); continue; }
    if (Date.parse(entry.expires) < today.getTime()) { failures.push(Object.assign({ expired: entry.expires }, rec)); continue; }
    accepted.push({ rec, entry });
  }
  for (const entry of allowlist) if (!advisories.has(entry.ghsa)) stale.push(entry);

  const meta = audit.metadata && audit.metadata.vulnerabilities;
  console.log('[audit-bundle] ' + prefix);
  if (meta) console.log('[audit-bundle] npm audit totals: ' + JSON.stringify(meta));
  for (const { rec, entry } of accepted) {
    console.log('[audit-bundle] ACCEPTED ' + rec.ghsa + ' (' + rec.severity + ', ' + rec.source + ': ' + rec.title + ')');
    console.log('               reaches: ' + Array.from(rec.reached).sort().join(', '));
    console.log('               reviewed by ' + entry.reviewedBy + ' on ' + entry.reviewedOn + ', expires ' + entry.expires);
    console.log('               ' + entry.reason);
  }
  for (const entry of stale) console.log('[audit-bundle] STALE allowlist entry no longer reported: ' + entry.ghsa + ' (' + entry.package + ') — remove it');
  for (const rec of failures) {
    console.log('[audit-bundle] FAIL ' + rec.ghsa + ' (' + rec.severity + ', ' + rec.source + ': ' + rec.title + ')' + (rec.expired ? ' — allowlist entry expired ' + rec.expired : ' — not in the allowlist'));
    console.log('               reaches: ' + Array.from(rec.reached).sort().join(', '));
  }
  if (failures.length || stale.length) {
    console.log('[audit-bundle] gate FAILED: ' + failures.length + ' unaccepted advisor' + (failures.length === 1 ? 'y' : 'ies') + ' at or above ' + level + (stale.length ? ', ' + stale.length + ' stale allowlist entr' + (stale.length === 1 ? 'y' : 'ies') : ''));
    process.exit(1);
  }
  console.log('[audit-bundle] gate passed: ' + accepted.length + ' accepted advisor' + (accepted.length === 1 ? 'y' : 'ies') + ' at or above ' + level + ', none unaccepted');
}

main();
