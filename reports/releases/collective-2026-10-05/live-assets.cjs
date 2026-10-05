#!/usr/bin/env node
'use strict';
const { options, snapshot, getAsset, writeReport } = require('./live-release-lib.cjs');
const report = { at: new Date().toISOString(), ok: false, requests: [], limitations: [
  'Point-in-time GET evidence from one network vantage; no global propagation claim.',
  'Expected bytes come only from explicit final committed Git blobs, never mutable working files.',
  'Changed runtime assets are selected using canonical/public pairs and runtime directories; full app shell is always included.',
  'Exact reader loader pins are covered separately by check_deployed_reader.cjs.',
] };
(async () => {
  const state = snapshot(options(process.argv.slice(2)));
  Object.assign(report, { commit: state.commit, base: state.base, headAtStart: state.head, assets: state.assets,
    skippedChangedPaths: state.skipped, deletedPaths: state.deleted, expectedCacheName: state.cacheName });
  let next = 0;
  const jobs = state.assets.flatMap(asset => ['ordinary', 'revalidate'].map(mode => ({ asset, mode })));
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (next < jobs.length) {
      const job = jobs[next++], result = await getAsset(job.asset, job.mode);
      report.requests.push(result);
      console.log((result.matches ? 'MATCH ' : 'FAIL ') + job.mode + ' ' + job.asset.file);
    }
  }));
  report.headAtEnd = state.headNow();
  report.ok = report.headAtEnd === report.headAtStart && report.requests.every(result => result.matches);
  report.summary = { assets: state.assets.length, requests: report.requests.length, matched: report.requests.filter(value => value.matches).length,
    mismatched: report.requests.filter(value => !value.matches).length, headChanged: report.headAtStart !== report.headAtEnd };
})().catch(error => { report.error = error.stack || error.message; }).finally(() => {
  if (!report.ok) process.exitCode = 1;
  writeReport('live-assets.json', report);
  console.log(JSON.stringify({ ok: report.ok, summary: report.summary, error: report.error }, null, 2));
});
