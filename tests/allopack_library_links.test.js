import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
const require = createRequire(import.meta.url);
const links = require('../dev-tools/build_allopack_links.cjs');
const manifest = JSON.parse(fs.readFileSync('catalog/index.json', 'utf8'));
const html = fs.readFileSync('library.html', 'utf8');
const script = fs.readFileSync('allopack-library.js', 'utf8');
const entries = links.packEntries(manifest);
const shell = { window: { React: { createElement() {} } }, console: { log() {}, error() {} } };
vm.createContext(shell);
vm.runInContext(fs.readFileSync('catalog_module.js', 'utf8'), shell);
const catalog = shell.window.AlloModules.CommunityCatalog;
function render(url = 'https://alloflow.dev/library') {
  const dom = new JSDOM(html, { url, runScripts: 'outside-only' });
  dom.window.eval(script);
  return dom;
}

describe('separate review and reuse presentation', () => {
  it('shows review placeholders as review status, never a license', () => {
    const result = links.renderReviewAndReuse({license:'Teacher review required'});
    expect(result.review).toContain('Educator review pending');
    expect(result.reuse).toContain('Reuse terms not specified');
    expect(result.reuse).not.toContain('pack-license');
  });
  it('keeps an explicit license distinct from a pending educator review', () => {
    const result = links.renderReviewAndReuse({license:'CC-BY-4.0',review_status:'AI content and structural checks; educator review pending'});
    expect(result.review).toContain('Educator review pending');
    expect(result.reuse).toContain('Reuse terms: <span class="pack-license">CC-BY-4.0</span>');
  });
  it('escapes unknown statuses and terms without inferring approval or permission', () => {
    const result = links.renderReviewAndReuse({license:'<custom terms>',review_status:'Awaiting <author>'});
    expect(result.review).toContain('Review status: Awaiting &lt;author&gt;');
    expect(result.reuse).toContain('&lt;custom terms&gt;');
    expect(links.renderReviewAndReuse({license:'Not specified'}).review).toBe('');
  });
});

describe('complete, generated AlloPack library', () => {
  it('covers every repository pack and every version imports through the native boundary', () => {
    const files = ['', 'illustrated/'].flatMap(dir => fs.readdirSync('allopacks/' + dir).filter(f => f.endsWith('.allopack.json')).map(f => 'allopacks/' + dir + f));
    expect(entries.map(e => e.path).sort()).toEqual(files.sort());
    for (const entry of entries) {
      const pack = JSON.parse(fs.readFileSync(entry.path, 'utf8').replace(/^\uFEFF/, ''));
      expect(catalog._parseCatalogLesson(pack, entry)).toBe(pack);
    }
  });
  it('is current and identical on both deployment surfaces', () => {
    expect(() => links.writeArtifacts(manifest, true)).not.toThrow();
    for (const name of ['library.html', '_redirects', 'allopack-library.js', 'allopack-library.css', 'catalog_module.js']) expect(fs.readFileSync('desktop/web-app/public/' + name, 'utf8')).toBe(fs.readFileSync(name, 'utf8'));
  });
  it('gives every version a distinct static redirect without changing catalog ids', () => {
    const rules = fs.readFileSync('_redirects', 'utf8');
    for (const entry of entries) expect(rules).toContain('/p/' + entry.share_slug + ' /app/?lesson=' + entry.slug + ' 302');
    expect(rules).toContain('/packs /library.html 302');
    expect(rules).toContain('/water-cycle /app/?tool=waterCycle 302');
    const katie = entries.find(e => e.share_slug === 'reading-space');
    expect(katie.slug).toBe('academic-discourse-reading-space-grade6');
    expect(catalog._catalogLessonPermalink(katie.slug, katie.share_slug)).toBe('https://alloflow.dev/p/reading-space');
    expect(catalog._catalogLessonPermalink(katie.slug)).toContain('/app/?lesson=academic-discourse-reading-space-grade6');
    expect(catalog._catalogLessonPermalink(katie.slug, '../unsafe')).toContain('/app/?lesson=');
  });
  it('fails instead of silently omitting files or publishing ambiguous aliases', () => {
    expect(() => links.packEntries({entries: entries.slice(1)})).toThrow(/missing from catalog/);
    const duplicate = structuredClone(manifest); duplicate.entries[1].share_slug = duplicate.entries[0].share_slug;
    expect(() => links.packEntries(duplicate)).toThrow(/Duplicate share alias/);
    const unsafe = structuredClone(manifest); unsafe.entries[0].share_slug = '../bad';
    expect(() => links.packEntries(unsafe)).toThrow(/Invalid catalog id or share alias/);
  });
  it('groups versions without hiding any links from a no-JavaScript visitor', () => {
    const dom = new JSDOM(html), d = dom.window.document;
    expect(d.querySelectorAll('.pack-topic').length).toBe(links.groupsFor(entries).length);
    expect(d.querySelectorAll('[data-pack-id]').length).toBe(entries.length);
    for (const link of d.querySelectorAll('[data-pack-download]')) {
      expect(link.getAttribute('href')).toBe('./' + link.dataset.packDownload);
      expect(fs.existsSync(link.dataset.packDownload)).toBe(true);
    }
    expect(d.querySelector('[data-pack-id="academic-discourse-reading-space-grade6"] h4').textContent).toBe('Illustrated pack');
    expect(d.querySelectorAll('#cards-container .lesson-card').length).toBe(3);
    expect(d.querySelector('link[rel="canonical"]').href).toBe('https://alloflow.dev/packs');
    dom.window.close();
  });
  it('serves bounded lazy previews as separate files and labels each exact version', () => {
    const dom = new JSDOM(html), d = dom.window.document;
    const previews = [...d.querySelectorAll('.pack-preview img')];
    expect(previews.length).toBeGreaterThan(0);
    for (const image of previews) {
      const rel = image.getAttribute('src').replace(/^\.\//, '');
      expect(rel).toMatch(/^assets\/allopack-previews\/[a-f0-9]+\.(webp|png|jpg)$/);
      expect(fs.statSync(rel).size).toBeLessThanOrEqual(160000);
      expect(image.loading || image.getAttribute('loading')).toBe('lazy');
      expect(image.alt).toBeTruthy();
    }
    for (const e of entries) {
      const card = [...d.querySelectorAll('[data-pack-id]')].find(card => card.dataset.packId === e.slug);
      expect(card.querySelector('.pack-resource-count').textContent).toContain(e.resource_count + ' resources');
    }
    const katie = d.querySelector('[data-pack-id="academic-discourse-reading-space-grade6"]');
    expect(katie.querySelector('.pack-core-route').textContent).toBe('Start with 5 core resources; supports included.');
    expect(katie.querySelector('.pack-sources a').href).toBe('https://www.novakeducation.com/blog/how-to-teach-academic-discourse-and-collaboration');
    expect(katie.querySelector('.pack-date').textContent).toContain('Pack updated');
    expect(html).not.toContain('data:image/');
    dom.window.close();
  });
  it('omits unsafe and oversized preview data and escapes source labels', () => {
    for (const imageUrl of ['https://example.test/image.webp','data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=','data:image/webp;base64,AAAA', 'data:image/webp;base64,'+'A'.repeat(230000)]) {
      expect(links.previewForPack({history:[{type:'image',data:{imageUrl}}]})).toBeNull();
    }
    expect(links.renderProvenance({submitted_at:'2026-01-01',source_links:[{url:'javascript:alert(1)',title:'Bad'},{url:'https://example.test/',title:'<script>bad</script>'}]})).toContain('&lt;script&gt;');
    expect(links.renderProvenance({submitted_at:'2026-01-01'})).toBe('');
    for (const core_resource_count of [undefined, 0, -1, 3, '1']) {
      expect(links.renderResourceDetails({resource_count:2,resource_types:[{type:'quiz',count:2}],core_resource_count})).not.toContain('pack-core-route');
    }
  });
  it('filters by words, subject, and overlapping grade; reset restores all versions', () => {
    const dom = render(), d = dom.window.document, event = () => d.getElementById('pack-search').dispatchEvent(new dom.window.Event('input', {bubbles:true}));
    d.getElementById('pack-search').value = 'water memory aid'; event();
    expect(d.querySelectorAll('.pack-topic:not([hidden])').length).toBe(1);
    d.getElementById('pack-subject').value = 'Math'; event();
    expect(d.getElementById('pack-empty').hidden).toBe(false);
    d.getElementById('pack-filters').reset();
    d.getElementById('pack-search').value = 'crew'; d.getElementById('pack-grade').value = '7'; event();
    expect(d.querySelectorAll('.pack-topic:not([hidden])').length).toBeGreaterThan(0);
    d.getElementById('pack-filters').reset();
    expect(d.querySelectorAll('.pack-topic:not([hidden])').length).toBe(links.groupsFor(entries).length);
    dom.window.close();
  });
  it('preserves existing Pages app storage origin while copying canonical links', async () => {
    const dom = render('https://alloflow-cdn.pages.dev/library'), d = dom.window.document;
    expect(d.querySelector('[data-pack-alias="reading-space"]').href).toBe('https://alloflow-cdn.pages.dev/p/reading-space');
    let copied;
    dom.window.navigator.clipboard = { writeText: async text => { copied = text; } };
    d.querySelector('[data-copy-pack="https://alloflow.dev/p/reading-space"]').click();
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(copied).toBe('https://alloflow.dev/p/reading-space');
    expect(d.getElementById('pack-copy-status').textContent).toBe('Pack link copied.');
    dom.window.close();
  });
  it('offers a focused, selectable link when clipboard permission is unavailable', async () => {
    const dom = render(), d = dom.window.document;
    const button = d.querySelector('[data-copy-pack="https://alloflow.dev/p/reading-space"]');
    button.click(); await new Promise(resolve => setTimeout(resolve, 10));
    const field = button.closest('.pack-version').querySelector('.pack-copy-fallback input');
    expect(field.parentElement.hidden).toBe(false); expect(d.activeElement).toBe(field);
    expect(field.selectionEnd).toBe(field.value.length);
    dom.window.close();
  });
  it('downloads bytes as a file and rejects an HTML shell before using the raw fallback', async () => {
    const dom = render(), w = dom.window, d = w.document, requests = [], payload = {allopack:{title:'Pack'},history:[]};
    w.TextDecoder = TextDecoder; let blob;
    w.URL.createObjectURL = value => { blob = value; return 'blob:https://alloflow.dev/test'; };
    w.URL.revokeObjectURL = () => {};
    const originalClick = w.HTMLAnchorElement.prototype.click;
    w.HTMLAnchorElement.prototype.click = function () { if (this.href.startsWith('blob:')) return; return originalClick.call(this); };
    w.fetch = async url => { requests.push(url); return {ok:true,arrayBuffer:async () => new TextEncoder().encode(requests.length === 1 ? '<html>App shell</html>' : JSON.stringify(payload)).buffer}; };
    d.querySelector('[data-pack-download]').click();
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(requests).toHaveLength(2); expect(requests[1]).toMatch(/^https:\/\/raw.githubusercontent.com\/Apomera\/AlloFlow\/main\/allopacks\//);
    expect(blob.type).toBe('application/json'); expect(d.getElementById('pack-copy-status').textContent).toContain('download started');
    dom.window.close();
  });
});
