import { describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const fs = require('node:fs');
const { loadConfig, globRegex, publicationPredicate, localTarget, scriptReferences, htmlReferences, sitemapReferences, requiredPublication, publicationInventory, BUDGET_BYTES } = require('../dev-tools/check_pages_publish.cjs');

describe('GitHub Pages promotion publication', () => {
    it('excludes diagnostics and duplicate runtime trees without excluding promotion dependencies', () => {
        const published = publicationPredicate(loadConfig());
        for (const file of [
            'reports/perception-walk/qa-results.json', 'desktop/web-app/public/index.html',
            'tests/pages_publish_boundary.test.js', 'dev-tools/check_pages_publish.cjs',
            'app/index.html', 'lang/french.js', 'reading_library/books/alice/chapter1.json',
            'allopacks/media/water_cycle_grade6/wc-img-puddle-time.png'
        ]) expect(published(file), file).toBe(false);
        for (const file of [
            'index.html', 'tool-water-cycle.html', 'manual-water-cycle.html', 'guide/index.html',
            'docs/manuals/catalog.json', 'docs/google_classroom_import.md', 'assets/alloflow-social-preview.png',
            'examples/water_cycle.json', 'lang/manifest.json', 'allopacks/illustrated/water_cycle_grade6.allopack.json',
            'allopacks/media/water_cycle_grade6/wc-img-puddle-time.webp', 'vendor/lucide.js'
        ]) expect(published(file), file).toBe(true);
    });

    it('keeps all sitemapped pages, guide chapters and their local dependency closure published', () => {
        const result = requiredPublication();
        expect(result.required.length).toBeGreaterThan(180);
        expect(result.errors).toEqual([]);
    }, 180000);

    it('detects a real exclusion of an existing required stylesheet', () => {
        const config = loadConfig();
        config.exclude.push('shared.css');
        const result = requiredPublication(undefined, config);
        expect(result.errors).toContain('shared.css: required promotion dependency is excluded');
    }, 180000);

    it('keeps the selected tracked source comfortably below the Pages size limit', () => {
        const result = publicationInventory();
        expect(result.errors).toEqual([]);
        expect(result.bytes).toBeLessThanOrEqual(BUDGET_BYTES);
        expect(result.files).toContain('index.html');
        expect(result.files).not.toContain('app/index.html');
    }, 180000);

    it('rejects real budget growth rather than raising the publication limit', () => {
        const lstat = fs.lstatSync;
        const spy = vi.spyOn(fs, 'lstatSync').mockImplementation((file, ...args) => {
            const stat = lstat(file, ...args);
            if (/[/\\]allobot\.png$/.test(String(file))) stat.size = BUDGET_BYTES + 1;
            return stat;
        });
        try {
            const result = publicationInventory();
            expect(result.errors.some(error => error.includes('above the 900000000-byte budget'))).toBe(true);
        } finally { spy.mockRestore(); }
    }, 180000);

    it('models Jekyll literal-prefix exclusions and wildcard matches across nested media directories', () => {
        const published = publicationPredicate(loadConfig());
        expect(published('reports-old/logo.png')).toBe(false);
        expect(published('allopacks/media/root.png')).toBe(false);
        expect(published('allopacks/media/nested/deeper/authoring.png')).toBe(false);
        expect(published('allopacks/media/nested/deeper/published.webp')).toBe(true);
        expect(globRegex('allopacks/media/*.png').test('allopacks/media/nested/authoring.png')).toBe(true);
        expect(() => globRegex('reports/{old,new}')).toThrow('Unsupported publication glob');
    });

    it('evaluates includes for each directory entry without reopening an excluded ancestor', () => {
        const published = publicationPredicate({ include: ['.published', 'index.html', 'leaf.js'], exclude: ['.published', 'private'] });
        expect(published('.published/index.html')).toBe(true);
        expect(published('.published/other.html')).toBe(false);
        expect(published('private/leaf.js')).toBe(false);
        expect(published('ordinary/.hidden/leaf.js')).toBe(false);
        expect(published('ordinary/~draft.html')).toBe(false);
    });

    it('checks project-relative routes and static fetch dependencies rather than third-party URLs', () => {
        expect(localTarget('guide/index.html', './search-index.json?version=1')).toBe('guide/search-index.json');
        expect(localTarget('index.html', 'https://alloflow-cdn.pages.dev/app/')).toBe(null);
        expect(() => localTarget('index.html', '../app/')).toThrow('escapes project site');
        expect(() => localTarget('index.html', '/AlloFlow/%2f../private.txt')).toThrow('escapes project site');
        expect(() => localTarget('index.html', '/AlloFlow/..%5cprivate.txt')).toThrow('escapes project site');
        expect(scriptReferences("fetch('release.json?version=' + Date.now()); fetch('https://example.com/data.json')")).toEqual([
            'release.json?version=', 'https://example.com/data.json'
        ]);
        expect(scriptReferences("fetch('guide/' + 'search-index.json'); fetch('images/' + name); import('./helper.js'); export { thing } from './things.js';")).toEqual([
            'guide/search-index.json', './helper.js', './things.js'
        ]);
    });

    it('uses structured HTML and XML parsing for escaped URLs, social images and executable scripts', () => {
        const result = htmlReferences('<meta property="og:image" content="assets/social.png"><img srcset="small.webp 1x, large.webp 2x"><a href="chapter.html?a=1&amp;b=2">Chapter</a><script type="application/ld+json">{"url":"not-a-script.json"}</script><script>fetch("release.json")</script>');
        expect(result.references).toEqual(['assets/social.png', 'small.webp', 'large.webp', 'chapter.html?a=1&b=2']);
        expect(result.scripts).toEqual(['fetch("release.json")']);
        expect(sitemapReferences('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://example.com/?a=1&amp;b=2</loc></url></urlset>')).toEqual(['https://example.com/?a=1&b=2']);
        expect(() => sitemapReferences('<urlset><loc>broken</urlset>')).toThrow();
    });
});
