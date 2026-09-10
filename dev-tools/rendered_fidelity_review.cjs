'use strict';

// This renderer never embeds document HTML, executable data, or resource URLs.
// Report values appear only in escaped text nodes; DOM IDs are generated locally.
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const list = value => Array.isArray(value) ? value : [];
function text(value) {
  if (value === undefined) return 'Not recorded';
  if (typeof value === 'string') return escapeHtml(value);
  return escapeHtml(JSON.stringify(value, null, 2));
}
function status(value) {
  const styles = { passed: 'passed', failed: 'failed', 'review-required': 'failed', unavailable: 'unavailable', observed: 'passed' };
  const css = Object.prototype.hasOwnProperty.call(styles, value) ? styles[value] : 'unavailable';
  return `<strong class="status ${css}">${value === undefined ? 'unavailable (status not recorded)' : text(value)}</strong>`;
}
function coverage(value) {
  const info = object(value);
  return `<p class="coverage ${info.complete === true ? '' : 'incomplete'}"><strong>Coverage: ${info.complete === true ? 'complete for selected checkpoints' : 'incomplete'}</strong>. Inspected ${text(info.inspected)} of ${text(info.requested)} requested checkpoints. Whole-document assessment was not performed.</p>${list(info.reasons).length ? `<div class="incomplete"><strong>Coverage limitations:</strong><ul>${info.reasons.map(reason => `<li>${text(reason)}</li>`).join('')}</ul></div>` : ''}`;
}
function field(label, value) {
  return `<div><dt>${escapeHtml(label)}</dt><dd><pre>${text(value)}</pre></dd></div>`;
}
function observation(side, value) {
  if (value === undefined) return '';
  const info = object(value);
  const label = side === 'source' ? 'Source' : 'Candidate';
  return `<div class="observation"><h5>${label} observation</h5>${info.status !== undefined ? `<p>Status: ${status(info.status)}</p>` : ''}${info.reason !== undefined ? `<p><strong>Unavailable reason:</strong> ${text(info.reason)}</p>` : ''}<pre>${text(value)}</pre></div>`;
}
function checkpoint(value, index, prefix) {
  const check = object(value), properties = list(check.properties);
  const rows = properties.map(entry => {
    const prop = object(entry);
    return `<tr><th scope="row">${text(prop.property)}</th><td><pre>${text(prop.source)}</pre></td><td><pre>${text(prop.candidate)}</pre></td><td>${status(prop.status)}${prop.reason !== undefined ? `<p>Unavailable reason: ${text(prop.reason)}</p>` : ''}</td></tr>`;
  }).join('');
  return `<section class="checkpoint" aria-labelledby="${prefix}-check-${index}">
<h4 id="${prefix}-check-${index}">Checkpoint ${index + 1}: ${text(check.id)}</h4>
<p>Checkpoint status: ${status(check.status)}</p>
<dl>${field('Source selector', check.sourceSelector)}${field('Candidate selector', check.candidateSelector)}</dl>
${check.reason !== undefined ? `<p><strong>Unavailable reason:</strong> ${text(check.reason)}</p>` : ''}
${check.message !== undefined ? `<p>${text(check.message)}</p>` : ''}
${rows ? `<div class="table-container" role="region" aria-label="Checkpoint ${index + 1} property comparison" tabindex="0"><table><caption>Selected properties for checkpoint ${index + 1}</caption><thead><tr><th scope="col">Property</th><th scope="col">Source value</th><th scope="col">Candidate value</th><th scope="col">Status</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p>No property comparisons were recorded for this checkpoint.</p>'}
${observation('source', check.source)}${observation('candidate', check.candidate)}
</section>`;
}
function profile(value, index, reportIndex, legacy) {
  const info = object(value), prefix = `report-${reportIndex}-profile-${index}`;
  const checks = list(info.checks);
  const name = legacy ? 'Default profile (legacy report)' : info.name ?? info.id ?? `Profile ${index + 1}`;
  return `<section class="profile" aria-labelledby="${prefix}">
<h3 id="${prefix}">${text(name)}</h3>
${!legacy && info.id !== undefined && info.name !== undefined ? `<p>Profile ID: <code>${text(info.id)}</code></p>` : ''}
<p>Profile status: ${status(info.status)}</p>${coverage(info.coverage)}
<dl>${field('Viewport', info.viewport)}${field('Media', info.media ?? (legacy ? 'screen' : undefined))}${info.browserVersion !== undefined ? field('Browser version', info.browserVersion) : ''}${info.durationMs !== undefined ? field('Duration (ms)', info.durationMs) : ''}</dl>
${info.reason !== undefined ? `<p><strong>Unavailable reason:</strong> ${text(info.reason)}</p>` : ''}
${info.message !== undefined ? `<p>${text(info.message)}</p>` : ''}
${info.resources !== undefined ? `<details open><summary>Resource and script diagnostics</summary><pre>${text(info.resources)}</pre></details>` : ''}
${checks.length ? checks.map((check, checkIndex) => checkpoint(check, checkIndex, prefix)).join('') : '<p class="incomplete">No checkpoint comparisons were recorded for this profile.</p>'}
</section>`;
}
function report(value, index) {
  const info = object(value), source = object(info.source), candidate = object(info.candidate);
  const hasProfiles = Array.isArray(info.profiles), profiles = hasProfiles ? info.profiles : [info];
  return `<article aria-labelledby="report-${index}">
<h2 id="report-${index}">Report ${index + 1}${info.id !== undefined ? `: ${text(info.id)}` : ''}</h2>
<p>Report status: ${status(info.status)}</p>${coverage(info.coverage)}
${info.artifactChanged ? '<p class="incomplete"><strong>Artifacts changed during inspection.</strong> The recorded evidence cannot establish fidelity for the current files.</p>' : ''}
<dl>${field('Source SHA-256', source.sha256)}${field('Candidate SHA-256', candidate.sha256)}${source.path !== undefined ? field('Source path (text only)', source.path) : ''}${candidate.path !== undefined ? field('Candidate path (text only)', candidate.path) : ''}${source.bytes !== undefined ? field('Source bytes', source.bytes) : ''}${candidate.bytes !== undefined ? field('Candidate bytes', candidate.bytes) : ''}${info.browserVersion !== undefined ? field('Browser version', info.browserVersion) : ''}</dl>
${list(info.limitations).length ? `<details open><summary>Assessment limitations</summary><ul>${info.limitations.map(item => `<li>${text(item)}</li>`).join('')}</ul></details>` : ''}
${profiles.length ? profiles.map((item, profileIndex) => profile(item, profileIndex, index, !hasProfiles)).join('') : '<p class="incomplete">No rendering profiles were recorded. Coverage is incomplete.</p>'}
</article>`;
}
function renderReview(reportOrBundle) {
  if (!reportOrBundle || typeof reportOrBundle !== 'object' || Array.isArray(reportOrBundle)) throw new TypeError('Expected a rendered fidelity report or a bundle of reports.');
  const reports = Array.isArray(reportOrBundle.reports) ? reportOrBundle.reports : [reportOrBundle];
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>Rendered fidelity review</title>
<style>
:root { color-scheme: light; font-family: system-ui, sans-serif; line-height: 1.5; color: #17212b; background: #fff; }
body { max-width: 76rem; margin: 0 auto; padding: 1.5rem; }
h1, h2, h3, h4, h5 { line-height: 1.25; overflow-wrap: anywhere; }
h2 { border-top: 3px solid #34495e; padding-top: 1.5rem; margin-top: 2.5rem; }
h3 { margin-top: 2rem; } h5 { font-size: 1rem; }
article, section { min-width: 0; } .checkpoint { border: 1px solid #8493a1; padding: 1rem; margin: 1.25rem 0; }
.status { display: inline-block; border: 1px solid currentColor; border-radius: .2rem; padding: .1rem .45rem; overflow-wrap: anywhere; }
.passed { color: #185329; background: #edf8ee; } .failed { color: #862525; background: #fff0f0; } .unavailable { color: #674009; background: #fff5dc; }
.incomplete { border-left: .3rem solid #80520b; padding: .7rem; background: #fff5dc; }
dl { margin: 1rem 0; } dl > div { margin: .65rem 0; } dt { font-weight: 600; } dd { margin: .2rem 0 0; }
pre, code { font-family: ui-monospace, monospace; font-size: .9rem; white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; }
pre { margin: 0; } .table-container { overflow-x: auto; } table { width: 100%; border-collapse: collapse; table-layout: fixed; }
caption { text-align: left; font-weight: 600; margin-bottom: .5rem; } th, td { text-align: left; vertical-align: top; border: 1px solid #8493a1; padding: .6rem; overflow-wrap: anywhere; } thead { background: #eef2f5; }
details { margin: 1rem 0; padding: .75rem; border: 1px solid #8493a1; } summary { cursor: pointer; font-weight: 600; } details > pre, details > ul { margin-top: .75rem; }
:focus-visible { outline: 3px solid #005fcc; outline-offset: 3px; } a { color: #0052a3; }
@media (max-width: 40rem) { body { padding: .75rem; } .checkpoint { padding: .65rem; } table { min-width: 34rem; } }
@media print { body { max-width: none; padding: 0; } .table-container { overflow: visible; } table { min-width: 0; } .checkpoint { break-inside: avoid; } }
</style></head><body><a href="#review-main">Skip to review</a><main id="review-main" tabindex="-1"><h1>Rendered fidelity review</h1>
<p>This review covers selected checkpoints and properties only. It is not a whole-document accessibility assessment. Human validation has not been run; browser observations do not establish screen-reader acceptance.</p>
<p>Compare source and candidate values below. A passed checkpoint does not make incomplete coverage complete. Source document markup and paths are displayed as text only.</p>
${reports.length ? reports.map(report).join('') : '<p class="incomplete"><strong>Coverage is incomplete.</strong> No reports were supplied.</p>'}
</main></body></html>`;
}

module.exports = { renderReview };
