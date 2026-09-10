const fs = require('fs');
const p = 'dev-tools/rendered_document_fidelity.cjs';
const raw = fs.readFileSync(p, 'utf8'); let s = raw.replace(/\r\n/g, '\n');
const replace = (a,b) => { if (!s.includes(a)) throw Error('Missing anchor ' + a.slice(0,80)); s=s.replace(a,b); };
replace('async function snapshot(browser, html, checkpoints, side, viewport)', 'async function snapshot(browser, html, checkpoints, side, viewport, media)');
replace("    await page.goto(entry, { waitUntil: 'load', timeout: 15000 });\n    await page.emulateMedia({ media: 'screen', reducedMotion: 'reduce' });", "    await page.emulateMedia({ media, reducedMotion: 'reduce' });\n    await page.goto(entry, { waitUntil: 'load', timeout: 15000 });");
replace('    return { observations, blockedRequests, scriptsDisabled: scripts, unresolvedResourceReferences: resourceReferences };', `    const activeAnimations = await page.evaluate(() => document.getAnimations().filter(animation => !['finished', 'idle'].includes(animation.playState)).length);
    return { observations, blockedRequests, scriptsDisabled: scripts, unresolvedResourceReferences: resourceReferences, activeAnimations };`);
replace('async function compareRenderedHtml(browser, sourceHtml, candidateHtml, options = {})', 'async function compareProfile(browser, sourceHtml, candidateHtml, options = {})');
replace("  const source = await snapshot(browser, sourceHtml, checkpoints, 'source', viewport);\n  const candidate = await snapshot(browser, candidateHtml, checkpoints, 'candidate', viewport);", "  const media = options.media || 'screen';\n  const source = await snapshot(browser, sourceHtml, checkpoints, 'source', viewport, media);\n  const candidate = await snapshot(browser, candidateHtml, checkpoints, 'candidate', viewport, media);");
replace("  const incomplete = [source, candidate].some(s => s.blockedRequests || s.scriptsDisabled || s.unresolvedResourceReferences) || checks.some(c => c.status === 'unavailable');", `  const reasons = [];
  if ([source, candidate].some(s => s.blockedRequests)) reasons.push('blocked-network-requests');
  if ([source, candidate].some(s => s.scriptsDisabled)) reasons.push('script-dependent-content');
  if ([source, candidate].some(s => s.unresolvedResourceReferences)) reasons.push('unresolved-resources');
  if ([source, candidate].some(s => s.activeAnimations)) reasons.push('active-animations');
  const unavailable = check => check.status === 'unavailable' || (check.properties || []).some(p => p.status === 'unavailable');
  if (checks.some(unavailable)) reasons.push('incomplete-checkpoint');
  const incomplete = reasons.length > 0;`);
replace('browserVersion: browser.version(), viewport, durationMs:', "browserVersion: browser.version(), viewport, media, profileId: options.id || 'default', durationMs:");
replace("coverage: { requested: checkpoints.length, inspected: checks.filter(c => c.status !== 'unavailable').length, complete: !incomplete, wholeDocument: false }", "coverage: { requested: checkpoints.length, inspected: checks.filter(c => !unavailable(c)).length, complete: !incomplete, wholeDocument: false, reasons }");
replace('unresolved: source.unresolvedResourceReferences', 'unresolved: source.unresolvedResourceReferences, animations: source.activeAnimations');
replace('unresolved: candidate.unresolvedResourceReferences', 'unresolved: candidate.unresolvedResourceReferences, animations: candidate.activeAnimations');
replace('async function compareFiles(browser, sourcePath, candidatePath, options)', `function validateProfiles(options = {}) {
  if (options.profiles && (options.viewport || options.media)) throw Error('Specify profiles or a single viewport/media, not both.');
  const profiles = options.profiles || [{ id: 'default', viewport: options.viewport, media: options.media }];
  if (!Array.isArray(profiles) || !profiles.length || profiles.length > 4) throw Error('Provide 1–4 rendering profiles.');
  const ids = new Set();
  return profiles.map(profile => {
    if (!profile || !/^[a-z0-9][a-z0-9._-]{0,39}$/i.test(profile.id || '') || ids.has(profile.id)) throw Error('Rendering profile IDs must be unique bounded identifiers.');
    ids.add(profile.id);
    const viewport = profile.viewport || { width: 1100, height: 800 }, media = profile.media || 'screen';
    if (!['screen', 'print'].includes(media)) throw Error('Only screen and print media are supported.');
    if (!Number.isInteger(viewport.width) || !Number.isInteger(viewport.height) || viewport.width < 320 || viewport.height < 240 || viewport.width > 3840 || viewport.height > 2160) throw Error('Viewport is outside the bounded inspection range.');
    return { id: profile.id, viewport, media };
  });
}
async function compareRenderedHtml(browser, sourceHtml, candidateHtml, options = {}) {
  const started = performance.now(), profiles = validateProfiles(options), checkpoints = validateCheckpoints(options.checkpoints), reports = [];
  for (const profile of profiles) reports.push(await compareProfile(browser, sourceHtml, candidateHtml, { ...profile, checkpoints }));
  if (!options.profiles) return reports[0];
  const incomplete = reports.filter(report => !report.coverage.complete);
  return { schemaVersion: 1, kind: 'rendered-html-fidelity', source: reports[0].source, candidate: reports[0].candidate, browserVersion: browser.version(),
    status: reports.some(r => r.status === 'review-required') ? 'review-required' : reports.some(r => r.status === 'unavailable') ? 'unavailable' : 'passed',
    durationMs: performance.now() - started, profiles: reports.map((report, i) => ({ ...report, id: profiles[i].id })),
    coverage: { requested: reports.reduce((n,r) => n + r.coverage.requested, 0), inspected: reports.reduce((n,r) => n + r.coverage.inspected, 0), complete: !incomplete.length, wholeDocument: false,
      profilesRequested: profiles.length, profilesCompleted: reports.length, reasons: incomplete.flatMap(r => r.coverage.reasons.map(reason => r.profileId + ':' + reason)) },
    checks: reports.flatMap(report => report.checks.map(check => ({ ...check, id: report.profileId + '/' + check.id, checkpointId: check.id, profileId: report.profileId }))),
    humanValidation: 'not-run', limitations: reports[0].limitations };
}
async function compareFiles(browser, sourcePath, candidatePath, options)`);
replace('validateCheckpoints, PROPERTIES };', 'validateCheckpoints, validateProfiles, PROPERTIES };');
fs.writeFileSync(p,s.replace(/\n/g,raw.includes('\r\n')?'\r\n':'\n'));
console.log('Added bounded screen/print profiles and explicit incomplete-coverage reasons.');
