import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const research = require('../lesson_teaching_research_module.js');
const BASE = 'https://ies.ed.gov/ncee/wwc/PracticeGuide/';
const URL = BASE + '15';
const title = 'Developing Effective Fractions Instruction for Kindergarten Through 8th Grade';
// Federal WWC page passages, read from the official pages on 2026-09-04.
// All network functions below are stubs; no lesson or learner data is transmitted.
const r2 = 'Help students recognize that fractions are numbers and that they expand the number system beyond whole numbers.';
const numberLines = 'Use number lines as a central representational tool in teaching this and other fraction concepts from the early grades onward.';
const r3 = 'Help students understand why procedures for computations with fractions make sense.';
const page = `Title: WWC | ${title}\nURL Source: ${URL}\nMarkdown Content:\n${title}\nReleased: September 2010\n2\n[Image: Moderate Evidence]\n${r2}\nShow More Show Less\n3\n[Image: Moderate Evidence]\n${r3}\nShow More Show Less\n${numberLines}\nPanel: Robert Siegler (Chair)\nGrades K, 1, 2, 3, 4, 5, 6, 7, 8.`;
const catalog = research.catalog();
const entry = guide => catalog.find(item => item.guide === guide);
// Live-page layout: bare number, evidence image link, recommendation sentence, Show More/Less, optional Grades links.
function livePage(guide, recommendations, grades) {
  const item = entry(guide);
  const body = recommendations.map(([number, rating, text], index) => `${number}\n\n[![Image ${index + 1}: ${rating} Evidence](https://ies.ed.gov/ncee/WWC/Images/mod_ev.png)](${item.url})\n\n${text}\n\n[Show More](${item.url})[Show Less](${item.url})`).join('\n\n');
  const gradeLinks = grades ? '\n\n**Grades:**\n\n*   ' + grades.map(value => `[${value}**,**](https://ies.ed.gov/ncee/WWC/Search/Products?gradeLevel=,${value})`).join('') : '';
  return `Title: ${item.title}\n\nURL Source: ${item.url}\n\nMarkdown Content:\nThis practice guide presents recommendations.\n\n${body}${gradeLinks}\n\n**Audience:**\n\n*    Teacher\n\nThis practice guide was prepared for the WWC.`;
}
const PAGES = {
  15: page,
  21: livePage(21, [[1, 'Minimal', 'Teach students academic language skills, including the use of inferential and narrative language, and vocabulary knowledge.'], [2, 'Strong', 'Develop awareness of the segments of sounds in speech and how they link to letters.'], [3, 'Strong', 'Teach students to decode words, analyze word parts, and write and recognize words.']]),
  1: livePage(1, [[4, 'Moderate', 'Connect and integrate abstract and concrete representations of concepts.'], ['5b', 'Strong', 'Use quizzing to promote learning. Use quizzes to re-expose students to key content.']], ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'Postsecondary']),
  8: livePage(8, [[3, 'Moderate', 'Provide opportunities for extended discussion of text meaning and interpretation.'], [5, 'Strong', 'Make available intensive and individualized interventions for struggling readers that can be provided by trained specialists.']], ['4', '5', '6', '7', '8', '9', '10', '11', '12']),
  26: livePage(26, [[3, 'Strong', 'Representations: Use a well-chosen set of concrete and semi-concrete representations to support students learning of mathematical concepts and procedures.'], [4, 'Strong', 'Number Lines: Use the number line to facilitate the learning of mathematical concepts and procedures, build understanding of grade-level material, and prepare students for advanced mathematics.']]),
  16: livePage(16, [[2, 'Strong', 'Assist students in monitoring and reflecting on the problem-solving process.']]),
  22: livePage(22, [[1, 'Strong', 'Explicitly teach appropriate writing strategies using a Model-Practice-Reflect instructional cycle.']]),
};
const byUrl = (pages = PAGES) => vi.fn(async url => { const guide = Number(String(url).split('/').pop()); if (!pages[guide]) throw new Error('No page for guide ' + guide); return { text: pages[guide], finalUrl: BASE + guide, kind: 'retrieved-page' }; });
const context = { grade: '4th Grade', subject: 'mathematics', topic: 'Compare fractions on a number line', goal: 'Compare fractions', standard: '4.NF.A.2' };
const textRead = (text = page, extras = {}) => vi.fn(async () => ({ text, finalUrl: URL, kind: 'retrieved-page', ...extras }));
const response = (text = page, extras = {}) => ({ ok: true, url: 'https://r.jina.ai/' + URL, headers: { get: () => null }, text: async () => text, ...extras });
const ids = result => result.sources.map(source => source.id);
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('LessonTeachingResearch lesson-aware evidence selection', () => {
  it('emits only attributable recommendations found in actual page text for a fractions lesson', async () => {
    const read = byUrl(); const search = vi.fn(async () => ({ results: [{ title: 'Search result', url: URL, snippet: 'A summary' }] }));
    const result = await research.collect(context, { read, search });
    expect(result.status).toBe('retrieved');
    expect(ids(result)).toEqual(['wwc-fractions-2010', 'wwc-elementary-math-intervention-2021']);
    const source = result.sources[0];
    expect(source).toMatchObject({ id: 'wwc-fractions-2010', url: URL, title, publishedAt: '2010-09', evidenceKind: 'content-specific' });
    expect(source.retrievedAt).toMatch(/^\d{4}-\d\d-\d\dT/);
    expect(source.scope).toContain('grades K to 8');
    expect(source.scope).toContain('4th Grade is within the stated range');
    expect(source.recommendations.map(item => item.id)).toEqual(['wwc-fractions-2010-r2', 'wwc-fractions-2010-r3']);
    for (const item of source.recommendations) {
      expect(page).toContain(item.supportingText);
      expect(item.locator).toMatch(/Recommendation [23]; retrieved page text offset \d+/);
      expect(item.evidenceLevel).toMatch(/^Moderate \(reported by WWC/);
    }
    expect(read.mock.calls.map(call => call[0])).toEqual([URL, BASE + '26']);
    expect(search).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('site:ies.ed.gov/ncee/wwc/PracticeGuide mathematics instruction elementary'), 5, expect.any(String));
    expect(JSON.stringify(result)).not.toContain('verified');
    expect(result.warnings.join(' ')).toContain('script has not been evaluated');
  });

  it('captures Strong/Moderate/Minimal ratings from live-page image links and numbered sub-recommendations', async () => {
    const result = await research.collect({ grade: '6th Grade', subject: 'science', topic: 'Photosynthesis', goal: 'Explain energy storage' }, { read: byUrl() });
    expect(result.status).toBe('retrieved');
    expect(ids(result)).toEqual(['wwc-organizing-instruction-2007']);
    expect(result.sources[0].evidenceKind).toBe('general-practice');
    expect(result.sources[0].recommendations.map(item => [item.id, item.evidenceLevel])).toEqual([
      ['wwc-organizing-instruction-2007-r4', 'Moderate (reported by WWC for Recommendation 4)'],
      ['wwc-organizing-instruction-2007-r5b', 'Strong (reported by WWC for Recommendation 5b)']
    ]);
    expect(result.sources[0].scope).toContain('General instructional-practice guidance, not content-specific research for Photosynthesis');
    expect(result.warnings.join(' ')).toContain('Only general instructional-practice guidance was found');
  });

  it('never sends raw goals, standards, lesson text or learner context to search/read', async () => {
    const search = vi.fn(async () => ({ results: [] })); const read = byUrl();
    await research.collect({ ...context, topic: 'PRIVATE class fractions', goal: 'Fractions for PRIVATE learner', standard: 'PRIVATE local standard', priorKnowledge: 'PRIVATE record', resources: [{ text: 'PRIVATE source' }] }, { search, read });
    expect(JSON.stringify(search.mock.calls)).not.toContain('PRIVATE');
    expect(JSON.stringify(read.mock.calls)).not.toContain('PRIVATE');
    expect(search.mock.calls[0][0]).toContain('fractions');
    expect(read.mock.calls[0][0]).toBe(URL);
  });

  it.each([
    ['early reading', { grade: 'Kindergarten', subject: 'reading', topic: 'Letter sounds and blending CVC words', goal: 'Blend three sounds' }, ['wwc-foundational-reading-k3-2016'], 'reading instruction preschool kindergarten'],
    ['secondary history with primary sources', { grade: '10th Grade', subject: 'social-studies', topic: 'Causes of the French Revolution', goal: 'Analyze primary sources about the Estates-General' }, ['wwc-adolescent-literacy-2008', 'wwc-organizing-instruction-2007'], 'social studies history instruction high school'],
    ['non-fraction elementary mathematics', { grade: '4th Grade', subject: 'mathematics', topic: 'Multiplying whole numbers', goal: 'Multiply two-digit numbers using place value' }, ['wwc-elementary-math-intervention-2021', 'wwc-math-problem-solving-2012'], 'mathematics instruction elementary'],
    ['Spanish-language fractions lesson', { grade: '5th Grade', subject: 'mathematics', topic: 'Fracciones equivalentes', goal: 'Comparar fracciones con distinto denominador' }, ['wwc-fractions-2010', 'wwc-elementary-math-intervention-2021'], 'mathematics instruction elementary fracciones'],
  ])('changes the query and the evidence with lesson context: %s', async (_label, input, expected, queryPart) => {
    const search = vi.fn(async () => ({ results: [] })); const read = byUrl();
    const result = await research.collect(input, { read, search });
    expect(result.status).toBe('retrieved');
    expect(ids(result)).toEqual(expected);
    expect(search.mock.calls[0][0]).toContain(queryPart);
    expect(ids(result)).not.toContain(expected.includes('wwc-fractions-2010') ? 'none' : 'wwc-fractions-2010');
  });

  it('rejects the fractions guide for a non-fraction lesson even when search suggests it', async () => {
    const search = vi.fn(async () => ({ results: [{ url: URL, title, snippet: page }] }));
    const result = await research.collect({ grade: '2nd Grade', subject: 'reading', topic: 'Retelling a story', goal: 'Retell with beginning, middle and end' }, { read: byUrl({ ...PAGES, 14: livePage(14, [[3, 'Minimal', 'Guide students through focused, high-quality discussion on the meaning of text.']]) }), search });
    expect(ids(result)[0]).toBe('wwc-reading-comprehension-k3-2010');
    expect(ids(result)).not.toContain('wwc-fractions-2010');
    expect(result.sources.every(source => source.evidenceKind === 'content-specific')).toBe(true);
  });

  it('keeps a custom age label readable but says the grade could not be matched', async () => {
    const result = await research.collect({ grade: 'Adult learners', subject: 'mathematics', topic: 'Fractions review', goal: 'Compare fractions' }, { read: byUrl() });
    expect(result.status).toBe('retrieved');
    expect(result.sources[0].id).toBe('wwc-fractions-2010');
    expect(result.sources[0].scope).toContain('"Adult learners" could not be matched');
  });

  it('skips guides whose catalog range or page-stated grades exclude the lesson grade', async () => {
    const read = byUrl({ ...PAGES, 8: livePage(8, [[3, 'Moderate', 'Provide opportunities for extended discussion of text meaning and interpretation.']], ['4', '5', '6', '7', '8', '9']) });
    const result = await research.collect({ grade: '11th Grade', subject: 'reading', topic: 'Phonics for older readers', goal: 'Decode multisyllabic words' }, { read });
    expect(read.mock.calls.map(call => call[0])).not.toContain(BASE + '21');
    expect(ids(result)).toEqual(['wwc-organizing-instruction-2007']);
    expect(result.warnings.join(' ')).toContain('stated grades (4 to 9) do not include 11th Grade');
  });

  it('falls back to general-practice guidance only, and reports the gap when even that cannot be verified', async () => {
    const search = vi.fn(async () => ({ results: [] }));
    const selection = research.selectCandidates({ grade: 'Graduate Level', subject: 'arts', topic: 'Sculpture', goal: 'Model armatures' }, []);
    expect(selection.candidates.map(item => item.entry.id)).toEqual(['wwc-organizing-instruction-2007']);
    expect(selection.hasContentSpecific).toBe(false);
    const read = byUrl({ 1: 'Title: Organizing Instruction and Study to Improve Student Learning\nURL Source: ' + BASE + '1\nMarkdown Content:\n' + 'This page has no numbered recommendations. '.repeat(12) });
    const result = await research.collect({ grade: '3rd Grade', subject: 'arts', topic: 'Color mixing', goal: 'Mix secondary colors' }, { read, search });
    expect(result).toMatchObject({ status: 'unavailable', sources: [] });
    expect(result.warnings.join(' ')).toContain('Could not use "Organizing Instruction and Study to Improve Student Learning"');
    expect(result.warnings.join(' ')).toContain('Research support unavailable');
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('reads the catalog match when search is absent or fails, without adding intervention extrapolation', async () => {
    const read = byUrl();
    const withoutSearch = await research.collect({ ...context, intervention: true }, { read });
    expect(withoutSearch.status).toBe('retrieved');
    const failedSearch = await research.collect(context, { read, search: async () => { throw new Error('Search offline'); } });
    expect(failedSearch.status).toBe('retrieved');
    expect(failedSearch.warnings.join(' ')).toContain('matched the evidence catalog directly');
  });

  it('does not use snippets when the actual read fails', async () => {
    const search = vi.fn(async () => ({ results: [{ url: URL, snippet: page }] }));
    const read = vi.fn(async () => { throw new Error('No page text'); });
    const result = await research.collect(context, { search, read });
    expect(result).toMatchObject({ status: 'unavailable', sources: [] });
    expect(result.warnings.join(' ')).toContain('No page text');
    expect(search).toHaveBeenCalledTimes(1);
  });

  it.each(['search-snippet', 'model-summary', 'generated'])('rejects an adapter declaring %s content', async kind => {
    expect(await research.collect(context, { read: textRead(page, { kind }) })).toMatchObject({ status: 'unavailable', sources: [] });
  });

  it('rejects snippet-only objects and fetched text with no recommendation anchors', async () => {
    expect((await research.collect(context, { read: async () => ({ snippet: page }) })).status).toBe('unavailable');
    expect((await research.collect(context, { read: textRead(title + '\n' + 'No retrieved recommendation. '.repeat(20)) })).status).toBe('unavailable');
  });

  it('does not invent missing recommendation passages or ratings', async () => {
    const partial = page.replace(r2, '').replace(numberLines, '').replaceAll('Moderate Evidence', '');
    const result = await research.collect(context, { read: byUrl({ 15: partial }) });
    expect(result.status).toBe('retrieved');
    expect(result.sources[0].recommendations.map(item => item.id)).toEqual(['wwc-fractions-2010-r3']);
    expect(result.sources[0].recommendations[0].evidenceLevel).toBe('Not captured in retrieved text');
    expect(result.warnings.join(' ')).toContain('ratings were not captured');
  });

  it('uses page text and image alt ratings while ignoring scripts/comments', async () => {
    const html = `<html><body><h1>${title}</h1><p>Released: September 2010</p><div>2</div><img alt="Moderate Evidence"><p>${r2}</p><p>${numberLines}</p><script>${r3}</script><!-- ${r3} --></body></html>`;
    const result = await research.collect(context, { read: byUrl({ 15: html }) });
    expect(result.status).toBe('retrieved');
    expect(result.sources[0].recommendations).toHaveLength(1);
    expect(result.sources[0].recommendations[0].evidenceLevel).toContain('Moderate');
  });

  it('fails closed when final/source URL metadata points elsewhere', async () => {
    for (const extras of [{ finalUrl: 'https://evil.example/guide' }, { url: BASE + '21' }, { sourceUrl: 'http://ies.ed.gov/ncee/wwc/PracticeGuide/15' }]) {
      expect((await research.collect({ ...context, topic: 'Fractions' }, { read: textRead(page, extras) })).status).toBe('unavailable');
    }
    expect((await research.collect(context, { read: textRead(page.replace('URL Source: ' + URL, 'URL Source: https://evil.example/')) })).status).toBe('unavailable');
  });

  it('rejects an oversized injected reader result', async () => {
    expect((await research.collect(context, { read: textRead(page + 'x'.repeat(100000)) })).status).toBe('unavailable');
  });

  it('honors cancellation before work and while search is pending', async () => {
    const controller = new AbortController(); const read = byUrl(); const search = vi.fn(() => new Promise(() => {}));
    const pending = research.collect({ ...context, signal: controller.signal }, { read, search });
    await Promise.resolve(); controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(read).not.toHaveBeenCalled();
    await expect(research.collect({ ...context, signal: controller.signal }, { read })).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('rejects cancellation while a read is pending instead of returning stale evidence', async () => {
    const controller = new AbortController(); const request = deferred();
    const pending = research.collect({ ...context, signal: controller.signal }, { read: () => request.promise });
    await Promise.resolve(); controller.abort(); request.resolve({ text: page });
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('bounds a stalled search then still reads the catalog source', async () => {
    vi.useFakeTimers();
    const read = byUrl(); const pending = research.collect(context, { search: () => new Promise(() => {}), read });
    await vi.advanceTimersByTimeAsync(10001);
    expect((await pending).status).toBe('retrieved'); expect(read).toHaveBeenCalledTimes(2);
  });

  it('bounds a stalled reader and returns no evidence', async () => {
    vi.useFakeTimers();
    const pending = research.collect({ grade: '3rd Grade', subject: 'arts', topic: 'Color mixing', goal: 'Mix secondary colors' }, { read: () => new Promise(() => {}) });
    await vi.advanceTimersByTimeAsync(20001);
    expect(await pending).toMatchObject({ status: 'unavailable', sources: [] });
  });

  it('exposes a reviewable catalog with real guide URLs and grade ranges', () => {
    expect(catalog.length).toBeGreaterThanOrEqual(18);
    for (const item of catalog) {
      expect(item.url).toBe(BASE + item.guide);
      expect(research.isSupportedUrl(item.url)).toBe(true);
      expect(item.grades[0]).toBeLessThanOrEqual(item.grades[1]);
      expect(['content-specific', 'general-practice']).toContain(item.kind);
    }
    expect(entry(15).title).toBe(title);
  });
});

describe('raw public guidance reader', () => {
  it('uses one raw Jina request and requires matching source metadata', async () => {
    const fetch = vi.fn(async () => response());
    const result = await research.readPublicGuidance(URL, { fetch });
    expect(result).toMatchObject({ text: page, url: URL, finalUrl: URL, kind: 'retrieved-page', via: 'jina' });
    expect(fetch).toHaveBeenCalledExactlyOnceWith('https://r.jina.ai/' + URL, expect.objectContaining({ method: 'GET', redirect: 'error', credentials: 'omit', signal: expect.any(AbortSignal) }));
  });

  it('reads any catalogued guide and returns its canonical URL', async () => {
    const text = PAGES[21];
    const fetch = vi.fn(async () => ({ ok: true, url: 'https://r.jina.ai/' + BASE + '21', headers: { get: () => null }, text: async () => text }));
    const result = await research.readPublicGuidance(BASE + '21/Published', { fetch });
    expect(result).toMatchObject({ url: BASE + '21', finalUrl: BASE + '21' });
    expect(fetch.mock.calls[0][0]).toBe('https://r.jina.ai/' + BASE + '21');
  });

  it.each([
    'http://ies.ed.gov/ncee/wwc/PracticeGuide/15', 'https://ies.ed.gov.evil.example/ncee/wwc/PracticeGuide/15',
    'https://user@ies.ed.gov/ncee/wwc/PracticeGuide/15', 'https://ies.ed.gov/ncee/wwc/PracticeGuide/99',
    'https://ies.ed.gov/ncee/wwc/PracticeGuide/12', 'https://ies.ed.gov/ncee/wwc/PracticeGuides',
    'https://127.0.0.1/ncee/wwc/PracticeGuide/15', 'https://ies.ed.gov/ncee/wwc/PracticeGuide/15?redirect=evil',
    'https://ies.ed.gov/ncee/wwc/PracticeGuide/15/other', 'https://ies.ed.gov\\evil.example/ncee/wwc/PracticeGuide/15',
    'https://ies.ed.gov/ncee/wwc/PracticeGuide/%31%35', 'javascript:alert(1)'
  ])('rejects nonallowlisted destination %s without fetching', async url => {
    const fetch = vi.fn();
    expect(research.isSupportedUrl(url)).toBe(false);
    await expect(research.readPublicGuidance(url, { fetch })).rejects.toThrow(/only the official/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('accepts the canonical Published path and HTTPS fragment without extending the allowed source', () => {
    expect(research.isSupportedUrl('https://ies.ed.gov/ncee/WWC/PracticeGuide/15/Published')).toBe(true);
    expect(research.isSupportedUrl(URL + '#recommendation-2')).toBe(true);
  });

  it.each([
    response(page, { ok: false }),
    response(page, { url: 'https://evil.example/redirect' }),
    response(page, { url: 'https://r.jina.ai/https://evil.example/' }),
    response(page, { url: 'https://r.jina.ai/' + BASE + '21' }),
    response(page.replace('URL Source: ' + URL, 'URL Source: https://evil.example/')),
    response(page.replace('URL Source: ' + URL, 'URL Source: ' + BASE + '21')),
    response(page.replace('URL Source: ' + URL, '')),
    response(page.replace('Markdown Content:', 'Search Snippet:'))
  ])('rejects an unconfirmed reader response', async fake => {
    await expect(research.readPublicGuidance(URL, { fetch: async () => fake })).rejects.toThrow();
  });

  it('enforces byte limits before and during a streamed response', async () => {
    await expect(research.readPublicGuidance(URL, { fetch: async () => response(page, { headers: { get: () => '100001' } }) })).rejects.toThrow('100 KB');
    const reader = { read: vi.fn(async () => ({ done: false, value: new Uint8Array(100001) })), cancel: vi.fn(async () => {}), releaseLock: vi.fn() };
    await expect(research.readPublicGuidance(URL, { fetch: async () => response(page, { body: { getReader: () => reader } }) })).rejects.toThrow('100 KB');
    expect(reader.cancel).toHaveBeenCalled(); expect(reader.releaseLock).toHaveBeenCalled();
  });

  it('rejects multibyte text above the byte limit in an injected nonstreaming response', async () => {
    await expect(research.readPublicGuidance(URL, { fetch: async () => response(page + '😀'.repeat(26000)) })).rejects.toThrow('100 KB');
  });

  it('supports a bounded multi-chunk read', async () => {
    const bytes = new TextEncoder().encode(page); let count = 0;
    const reader = { read: async () => count++ === 0 ? { value: bytes.slice(0, 40), done: false } : count === 2 ? { value: bytes.slice(40), done: false } : { done: true }, releaseLock: vi.fn() };
    expect((await research.readPublicGuidance(URL, { fetch: async () => response('', { body: { getReader: () => reader } }) })).text).toBe(page);
    expect(reader.releaseLock).toHaveBeenCalled();
  });

  it('aborts promptly even when an injected fetch does not honor AbortSignal', async () => {
    const controller = new AbortController(); const fetch = vi.fn(() => new Promise(() => {}));
    const pending = research.readPublicGuidance(URL, { fetch, signal: controller.signal });
    await Promise.resolve(); controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
  });

  it('times out a fetch within twenty seconds', async () => {
    vi.useFakeTimers();
    const pending = research.readPublicGuidance(URL, { fetch: () => new Promise(() => {}) });
    const assertion = expect(pending).rejects.toMatchObject({ name: 'TimeoutError' });
    await vi.advanceTimersByTimeAsync(20001); await assertion;
  });

  it('registers the browser API and keeps the public mirror identical', () => {
    const code = readFileSync('lesson_teaching_research_module.js', 'utf8');
    expect(readFileSync('desktop/web-app/public/lesson_teaching_research_module.js', 'utf8')).toBe(code);
    const window = {};
    new Function('window', code)(window);
    expect(typeof window.AlloModules.LessonTeachingResearch.collect).toBe('function');
    expect(window.AlloModules.LessonTeachingResearchModule).toBe(true);
    expect(typeof window.AlloModules.LessonTeachingResearch.readPublicGuidance).toBe('function');
    expect(typeof window.AlloModules.LessonTeachingResearch.catalog).toBe('function');
  });
});
