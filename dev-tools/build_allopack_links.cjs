#!/usr/bin/env node
'use strict';
// Derive the public directory and Pages routes from the same catalog used by the app.
// --check is read-only. Publication is a separate, explicit repository operation.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { readPack, publicSourceUrl, isoDate, catalogLicense, shortStandardCode } = require('../catalog/allopack_entry');
const ROOT = path.resolve(__dirname, '..');
const MIRROR = path.join(ROOT, 'desktop/web-app/public');
const START = '<!-- ALLOPACK_DIRECTORY_BEGIN -->';
const END = '<!-- ALLOPACK_DIRECTORY_END -->';
const RSTART = '# __ALLO_PACK_LINKS_BEGIN__';
const REND = '# __ALLO_PACK_LINKS_END__';
const ORIGIN = 'https://alloflow.dev';
const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const RESOURCE_LABELS = {
  directions:'Directions', simplified:'Reading companions', image:'Visual activities',
  'note-taking':'Notebooks', faq:'Questions & answers', 'anchor-chart':'Anchor charts',
  quiz:'Checks for understanding', glossary:'Glossaries', 'concept-sort':'Concept sorts',
  'applied-challenge':'Applied challenges', 'lesson-plan':'Teacher plans', 'memory-aid':'Memory aids',
  math:'Math activities', outline:'Outlines', 'sentence-frames':'Sentence frames', timeline:'Timelines',
};
const resourceLabel = type => RESOURCE_LABELS[type] || String(type).replace(/-/g, ' ');

// Reuse an existing small raster image. No remote requests, new AI artwork, SVG execution,
// or embedded image payloads in the directory. Missing/oversized previews are optional.
function previewForPack(pack) {
  const resources = [...pack.history].sort((a, b) => Number(b?.type === 'image') - Number(a?.type === 'image'));
  function find(value, resource) {
    if (!value || typeof value !== 'object') return null;
    for (const key of ['imageUrl', 'image', 'iconUrl']) {
      const raw = value[key];
      if (typeof raw !== 'string' || raw.length > 220000) continue;
      const match = raw.match(/^data:image\/(webp|png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/);
      if (!match) continue;
      const bytes = Buffer.from(match[2], 'base64'), kind = match[1];
      if (bytes.length > 160000 || bytes.length < 16 || bytes.toString('base64') !== match[2]) continue;
      const valid = kind === 'webp' ? bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP'
        : kind === 'png' ? bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
        : bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
      if (!valid) continue;
      return {
        path:'assets/allopack-previews/' + crypto.createHash('sha256').update(bytes).digest('hex').slice(0,24) + '.' + (kind === 'jpeg' ? 'jpg' : kind),
        bytes,
        alt:String(value.alt || value.imageAlt || value.altText || 'Illustration from ' + (resource.title || 'this pack')).slice(0,1000),
        title:String(value.title || resource.title || 'Illustration from this pack').slice(0,200),
      };
    }
    for (const child of Object.values(value)) {
      if (child && typeof child === 'object') { const result = find(child, resource); if (result) return result; }
    }
    return null;
  }
  for (const resource of resources) { const result = find(resource?.data, resource || {}); if (result) return result; }
  return null;
}

function renderResourceDetails(entry) {
  const types = Array.isArray(entry.resource_types) ? entry.resource_types : [];
  if (!Number.isSafeInteger(entry.resource_count) || !types.length) return '';
  return `<p class="pack-resource-count"><strong>${entry.resource_count} resources</strong> · ${types.length} activity types</p>
    ${Number.isSafeInteger(entry.core_resource_count) && entry.core_resource_count > 0 && entry.core_resource_count <= entry.resource_count ? `<p class="pack-core-route">Start with <strong>${entry.core_resource_count} core ${entry.core_resource_count === 1 ? 'resource' : 'resources'}</strong>${entry.core_resource_count < entry.resource_count ? '; supports and later practice included.' : '.'}</p>` : ''}
    <details class="pack-resource-list"><summary>See included resources</summary><ul>${types.map(({type,count}) => `<li>${esc(resourceLabel(type))} <span>(${Number(count) || 0})</span></li>`).join('')}</ul></details>`;
}

function renderProvenance(entry) {
  const sources = (Array.isArray(entry.source_links) ? entry.source_links : []).filter(s => publicSourceUrl(s.url));
  const updated = isoDate(entry.updated_at), created = isoDate(entry.created_at);
  const stamp = updated || created;
  const date = stamp ? `<p class="pack-date">${updated ? 'Pack updated' : 'Pack created'} <time datetime="${stamp}">${new Intl.DateTimeFormat('en-US',{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(stamp))}</time></p>` : '';
  const links = sources.length ? `<div class="pack-sources"><p>Original ${sources.length === 1 ? 'source' : 'sources'}</p><ul>${sources.map(s => `<li><a href="${esc(publicSourceUrl(s.url))}" target="_blank" rel="noopener noreferrer">${esc(s.title)}${s.author ? ' — ' + esc(s.author) : ''}<span class="pack-external-note"> (opens in a new tab)</span></a></li>`).join('')}</ul></div>` : '';
  return links + date;
}

const PENDING_REVIEW_STATUSES = new Set([
  'teacher review required', 'educator review required', 'educator review pending',
  'ai content and structural checks; educator review pending',
  'original illustrated teaching draft for educator feedback',
  'original four-lesson teaching draft; educator review pending',
]);
function renderReviewAndReuse(entry) {
  const status = typeof entry.review_status === 'string' ? entry.review_status.trim() : '';
  const legacyReview = PENDING_REVIEW_STATUSES.has(String(entry.license || '').trim().toLowerCase());
  const pending = PENDING_REVIEW_STATUSES.has(status.toLowerCase()) || (!status && legacyReview);
  const review = pending ? 'Educator review pending' : status ? 'Review status: ' + status : '';
  const license = catalogLicense(entry.license);
  return {
    review: review ? `<span class="pack-review-status">${esc(review)}</span>` : '',
    reuse: `<p class="pack-reuse-terms">${license === 'Not specified' ? 'Reuse terms not specified' : `Reuse terms: <span class="pack-license">${esc(license)}</span>`}</p>`,
  };
}

function packEntries(manifest) {
  const entries = manifest.entries.filter(e => e.path.endsWith('.allopack.json'));
  const aliases = new Set();
  for (const e of entries) {
    if (!/^[a-z0-9][a-z0-9_-]{0,127}$/i.test(e.slug) || !/^[a-z0-9][a-z0-9-]{0,127}$/.test(e.share_slug)) throw new Error('Invalid catalog id or share alias: ' + e.path);
    if (!/^allopacks\/(?:illustrated\/)?[a-z0-9_-]+\.allopack\.json$/i.test(e.path) || !fs.existsSync(path.join(ROOT, e.path))) throw new Error('Invalid or missing pack path: ' + e.path);
    if (aliases.has(e.share_slug)) throw new Error('Duplicate share alias: ' + e.share_slug);
    aliases.add(e.share_slug);
  }
  const files = ['', 'illustrated/'].flatMap(folder => fs.readdirSync(path.join(ROOT, 'allopacks', folder)).filter(f => f.endsWith('.allopack.json')).map(f => 'allopacks/' + folder + f));
  const indexed = new Set(entries.map(e => e.path));
  const missing = files.filter(file => !indexed.has(file));
  if (missing.length) throw new Error('AlloPacks missing from catalog: ' + missing.join(', ') + '. Validate and add them with node dev-tools/build_allopack_catalog_entries.cjs --apply');
  return entries;
}

function groupsFor(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const key = path.basename(entry.path, '.allopack.json');
    if (!groups.has(key)) groups.set(key, { key, entries: [] });
    groups.get(key).entries.push(entry);
  }
  for (const group of groups.values()) {
    const base = group.entries.find(e => !e.path.includes('/illustrated/')) || group.entries[0];
    group.title = base.title;
    group.subject = base.subject;
    group.grade = String(base.grade_level);
    // The illustrated edition is presented first; every version remains available.
    group.entries.sort((a, b) => Number(b.path.includes('/illustrated/')) - Number(a.path.includes('/illustrated/')));
  }
  return [...groups.values()].sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }));
}

function renderVersion(entry, single = false) {
  const label = single ? (entry.tags.includes('illustrated') ? 'Illustrated pack' : 'Resource pack') : entry.path.includes('/illustrated/') ? 'Illustrated edition' : 'Base edition';
  const link = ORIGIN + '/p/' + entry.share_slug;
  const images = entry.tags.includes('illustrated') ? 'Includes images' : 'Text resources';
  const terms = renderReviewAndReuse(entry);
  return `<div class="pack-version" data-pack-id="${esc(entry.slug)}">
    <h4>${label}</h4><p>${images}${terms.review ? ' · ' + terms.review : ''}</p>
    ${entry.audience ? `<p class="pack-audience"><strong>For:</strong> ${esc(entry.audience)}</p>` : ''}
    ${entry.learning_purpose ? `<p class="pack-purpose"><strong>Learning goal:</strong> ${esc(entry.learning_purpose)}</p>` : ''}
    ${(entry.standards || []).length ? `<p class="pack-standards"><strong>Standards:</strong> ${entry.standards.map(s => `<span title="${esc(s.description || s.code)}">${esc(shortStandardCode(s.code))}</span>`).join(', ')}</p>` : ''}
    ${renderResourceDetails(entry)}
    <p class="pack-credit">${esc(entry.credit || 'Review this resource before teaching.')}</p>
    ${terms.reuse}
    ${renderProvenance(entry)}
    <div class="pack-actions"><a class="pack-open" href="${link}" data-pack-alias="${esc(entry.share_slug)}" aria-label="Open ${esc(entry.title)} — ${label}">Open pack</a>
    <button type="button" data-copy-pack="${link}" hidden aria-label="Copy link to ${esc(entry.title)} — ${label}">Copy link</button>
    <a href="./${esc(entry.path)}" data-pack-download="${esc(entry.path)}" download="${esc(path.basename(entry.path))}" aria-label="Download ${esc(entry.title)} — ${label}">Download JSON</a></div>
    <label class="pack-copy-fallback" hidden>Copy this link<input readonly value="${link}"></label>
  </div>`;
}

function renderDirectory(manifest, previewAssets = new Map()) {
  const entries = packEntries(manifest), groups = groupsFor(entries);
  const subjects = [...new Set(groups.map(g => g.subject))].sort();
  const cards = groups.map(g => {
    const hay = [g.title, g.subject, ...g.entries.flatMap(e => [...e.tags, e.audience || '', e.learning_purpose || '', ...(e.resource_types || []).map(r => resourceLabel(r.type)), ...(e.source_links || []).flatMap(s => [s.title,s.author || '']), ...(e.standards || []).flatMap(s => [s.code, shortStandardCode(s.code)])])].join(' ');
    const preview = previewForPack(readPack(ROOT, g.entries[0].path));
    if (preview) previewAssets.set(preview.path, preview.bytes);
    return `<article class="pack-topic" data-pack-search="${esc(hay)}" data-pack-subject="${esc(g.subject)}" data-pack-grade="${esc(g.grade)}">
      ${preview ? `<figure class="pack-preview"><img src="./${esc(preview.path)}" alt="${esc(preview.alt)}" width="480" height="300" loading="lazy" decoding="async"><figcaption>Sample artwork · ${esc(preview.title)}</figcaption></figure>` : ''}
      <p class="pack-topic-meta">${esc(g.subject)} · Grades ${esc(g.grade)}</p><h3>${esc(g.title)}</h3>
      ${renderVersion(g.entries[0], g.entries.length === 1)}
${g.entries.length > 1 ? `      <details class="pack-other-versions"><summary>Other version (${g.entries.length - 1})</summary>${g.entries.slice(1).map(e => renderVersion(e)).join('\n')}</details>` : ''}
    </article>`;
  }).join('\n');
  return `${START}
<section class="section pack-directory" aria-labelledby="pack-directory-title" id="allopacks">
 <div class="section-inner">
  <h2 id="pack-directory-title">Explore the AlloPack library</h2>
  <p>${groups.length} topics · ${entries.length} pack versions. Open a pack to preview it, then choose <strong>Load in AlloFlow</strong>.</p>
  <p class="pack-review-note">These AI-authored resources need educator review before teaching. Base and illustrated editions can contain different activities. Sample artwork is an illustration from the pack, not a preview of every resource. Check the content, answer keys, accessibility, and source credits in the version you choose.</p>
  <details class="pack-gemini-help"><summary>Using these packs in Gemini Canvas</summary><p>Open the <a href="launch.html">current AlloFlow Canvas</a> and find the pack in its Community Catalog, or download the JSON file here and use <strong>Load Project</strong>. Pack links open the browser app; they do not automatically open a particular pack inside Google's shared Canvas.</p></details>
  <form class="pack-filters" id="pack-filters" role="search" hidden>
   <label>Search topics or activities<input id="pack-search" type="search" placeholder="Water cycle, collaboration, memory aid…"></label>
   <label>Subject<select id="pack-subject"><option value="">All subjects</option>${subjects.map(s => `<option>${esc(s)}</option>`).join('')}</select></label>
   <label>Grade<select id="pack-grade"><option value="">All grades</option>${Array.from({length:12}, (_, i) => `<option value="${i+1}">${i+1}</option>`).join('')}</select></label>
   <button type="reset">Clear filters</button>
  </form>
  <p id="pack-results" role="status" aria-live="polite" aria-atomic="true">${groups.length} topics · ${entries.length} pack versions</p>
  <p id="pack-copy-status" role="status" aria-live="polite" aria-atomic="true"></p>
  <div class="pack-grid" id="pack-grid">${cards}</div>
  <p id="pack-empty" hidden>No topics match. Try a different search or clear the filters.</p>
 </div>
</section>
${END}`;
}

function redirectsBlock(manifest) {
  const rows = packEntries(manifest).slice().sort((a, b) => a.share_slug.localeCompare(b.share_slug));
  return [RSTART + ' (generated by dev-tools/build_allopack_links.cjs)', '/packs /library.html 302', '/packs/ /library.html 302', ...rows.map(e => '/p/' + e.share_slug + ' /app/?lesson=' + e.slug + ' 302'), REND].join('\n');
}

function replaceBlock(text, start, end, content) {
  const from = text.indexOf(start), to = text.indexOf(end, from);
  if (from < 0 || to < 0) throw new Error('Missing generated block: ' + start);
  return text.slice(0, from) + content + text.slice(to + end.length);
}

function artifactContents(manifest) {
  const previews = new Map();
  const library = replaceBlock(fs.readFileSync(path.join(ROOT, 'library.html'), 'utf8'), START, END, renderDirectory(manifest, previews));
  const current = fs.readFileSync(path.join(ROOT, '_redirects'), 'utf8');
  const redirects = current.includes(RSTART) ? replaceBlock(current, RSTART, REND, redirectsBlock(manifest)) : current.trimEnd() + '\n' + redirectsBlock(manifest) + '\n';
  return new Map([['library.html', library], ['_redirects', redirects], ...['allopack-library.css', 'allopack-library.js'].map(rel => [rel, fs.readFileSync(path.join(ROOT, rel), 'utf8')]), ...previews]);
}

function writeArtifacts(manifest, check = false) {
  const stale = [];
  for (const [rel, value] of artifactContents(manifest)) {
    for (const base of [ROOT, MIRROR]) {
      const file = path.join(base, rel);
      if (!fs.existsSync(file) || !fs.readFileSync(file).equals(Buffer.isBuffer(value) ? value : Buffer.from(value))) {
        if (check) stale.push(path.relative(ROOT, file)); else { fs.mkdirSync(path.dirname(file), {recursive:true}); fs.writeFileSync(file, value); }
      }
    }
  }
  if (stale.length) throw new Error('Stale AlloPack artifacts: ' + stale.join(', ') + '. Run node dev-tools/build_allopack_links.cjs');
}
if (require.main === module) {
  writeArtifacts(JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog/index.json'), 'utf8')), process.argv.includes('--check'));
  console.log('AlloPack directory and short links are current.');
}
module.exports = { packEntries, groupsFor, renderDirectory, redirectsBlock, writeArtifacts, artifactContents, previewForPack, renderResourceDetails, renderProvenance, renderReviewAndReuse };
