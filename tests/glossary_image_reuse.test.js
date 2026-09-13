import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

const source = readFileSync('generate_dispatcher_source.jsx', 'utf8');
const factoryCode = source.slice(source.indexOf('function createGlossaryImageReuseCache('), source.indexOf('const glossaryImageReuseCache ='));
const createCache = new Function(factoryCode + '; return createGlossaryImageReuseCache;')();
const context = { sourceText: 'Plants capture sunlight to make food.', style: 'Watercolor', autoRemoveWords: true, imageProvider: 'test', imageModel: 'v1' };
const leaf = { term: 'Leaf', def: 'A plant part that captures light.' };

describe('glossary illustration reuse', () => {
  it('deduplicates simultaneous requests and repeated language passes', async () => {
    const cache = createCache();
    const generate = vi.fn(async () => 'data:image/png;base64,leaf');
    const run = cache.begin(context);
    const images = await Promise.all([
      run.getOrCreate(leaf, generate),
      run.getOrCreate({ ...leaf, term: ' leaf ', translations: { Spanish: 'hoja' } }, generate),
    ]);
    expect(images).toEqual(['data:image/png;base64,leaf', 'data:image/png;base64,leaf']);
    expect(await cache.begin(context).getOrCreate({ ...leaf, translations: { French: 'feuille' } }, generate)).toBe(images[0]);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('allows a paraphrase only when a same-term reference was offered to that run', async () => {
    const cache = createCache();
    await cache.begin(context).getOrCreate(leaf, async () => 'leaf-image');
    const run = cache.begin(context);
    const generate = vi.fn(async () => 'new-image');
    const imageReuseKey = run.references[0].imageReuseKey;
    expect(await run.getOrCreate({ ...leaf, def: 'A flat part of a plant that gathers sunlight.', imageReuseKey }, generate)).toBe('leaf-image');
    expect(generate).not.toHaveBeenCalled();
    expect(await run.getOrCreate({ term: 'Root', def: 'Takes in water.', imageReuseKey }, generate)).toBe('new-image');
    expect(await run.getOrCreate({ ...leaf, def: 'A page in a book.', imageReuseKey: 'unknown' }, generate)).toBe('new-image');
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it('keeps different meanings and base term languages separate', async () => {
    const run = createCache().begin(context);
    const generate = vi.fn().mockResolvedValueOnce('river').mockResolvedValueOnce('money').mockResolvedValueOnce('other-language');
    expect(await run.getOrCreate({ term: 'bank', def: 'The edge of a river.' }, generate)).toBe('river');
    expect(await run.getOrCreate({ term: 'bank', def: 'A financial institution.' }, generate)).toBe('money');
    expect(await run.getOrCreate({ term: 'bank', termLanguage: 'Dutch', def: 'A financial institution.' }, generate)).toBe('other-language');
  });

  it.each([
    { sourceText: 'A book has pages.' }, { style: 'Photograph' }, { autoRemoveWords: false },
    { imageModel: 'v2' }, { imageProvider: 'different' },
  ])('does not reuse across changed illustration context: %j', async change => {
    const cache = createCache();
    await cache.begin(context).getOrCreate(leaf, async () => 'old');
    const run = cache.begin({ ...context, ...change });
    expect(run.references).toEqual([]);
    expect(await run.getOrCreate(leaf, async () => 'new')).toBe('new');
  });

  it('never caches failed or empty image results', async () => {
    const run = createCache().begin(context);
    const generate = vi.fn().mockRejectedValueOnce(new Error('temporary')).mockResolvedValueOnce(null).mockResolvedValueOnce('good');
    await expect(run.getOrCreate(leaf, generate)).rejects.toThrow('temporary');
    expect(await run.getOrCreate(leaf, generate)).toBeNull();
    expect(await run.getOrCreate(leaf, generate)).toBe('good');
    expect(generate).toHaveBeenCalledTimes(3);
  });

  it('discards cancelled work and lets a live waiting run retry', async () => {
    const cache = createCache();
    const controller = new AbortController();
    let finish;
    const first = cache.begin(context).getOrCreate(leaf, () => new Promise(resolve => { finish = resolve; }), controller.signal);
    const rejected = expect(first).rejects.toMatchObject({ name: 'AbortError' });
    const second = cache.begin(context).getOrCreate(leaf, async () => 'live');
    await Promise.resolve();
    controller.abort();
    finish('cancelled');
    await rejected;
    expect(await second).toBe('live');
    expect(await cache.begin(context).getOrCreate(leaf, async () => 'unexpected')).toBe('live');
  });

  it('bounds retained image data', async () => {
    const cache = createCache({ maxEntries: 2, maxChars: 8 });
    const run = cache.begin(context);
    await run.getOrCreate(leaf, async () => '12345');
    await run.getOrCreate({ term: 'Root', def: 'Takes in water.' }, async () => '67890');
    expect(cache.begin(context).references.map(entry => entry.term)).toEqual(['Root']);
  });
});

const branch = source.slice(source.indexOf("      if (type === 'glossary') {"), source.indexOf(" else if (type === 'simplified') {", source.indexOf("      if (type === 'glossary') {")));
const runBranch = new Function('deps', 'glossaryImageReuseCache', 'return (async () => { with (deps) { let content, metaInfo; ' + branch + '; return content; } })();');
function deps(overrides = {}) {
  return {
    type: 'glossary', glossaryTier2Count: 1, glossaryTier3Count: 0, configOverride: {},
    glossaryDefinitionLevel: 'Same as Global Level', effectiveGrade: '5th Grade',
    textToProcess: context.sourceText, glossaryImageStyle: context.style, universalImageStyle: '',
    _generationProviderProfile: { imageProvider: 'test', imageModel: 'v1' },
    leveledTextLanguage: 'All Selected Languages', selectedLanguages: ['Spanish', 'French'],
    _xlate: { enabled: false }, usesLocalTextBackend: false, effectiveLanguage: 'Spanish',
    includeEtymology: false, useEmojis: false, effCustomInstructions: '', standardsDirective: '',
    dokDirective: '', interestsDirective: '', differentiationContext: '', autoRemoveWords: true,
    generationSignal: null, setGenerationStatus: vi.fn(), setIsProcessing: vi.fn(),
    addToast: vi.fn(), t: key => key, warnLog: vi.fn(), debugLog: vi.fn(), cleanJson: value => value,
    callGemini: vi.fn(async () => JSON.stringify([leaf])),
    callImagenWithSignal: vi.fn(async () => 'data:image/png;base64,raw'),
    callGeminiImageEditWithSignal: vi.fn(async () => 'data:image/png;base64,clean'),
    ...overrides,
  };
}

describe('glossary generation uses shared images without changing translations', () => {
  it('reuses the cleaned illustration and offers sense references on later runs', async () => {
    const cache = createCache();
    const first = deps();
    const output = await runBranch(first, cache);
    const second = deps({ callGemini: vi.fn(async prompt => {
      expect(prompt).toContain('Existing illustrations from this same source and style');
      const ref = JSON.parse(prompt.split('reference data only):\n')[1].split('\n')[0])[0];
      return JSON.stringify([{ ...leaf, def: 'A flat plant part that gathers sunlight.', translations: { French: 'Feuille: Une partie de la plante.' }, imageReuseKey: ref.imageReuseKey }]);
    }) });
    const translated = await runBranch(second, cache);
    expect(translated[0]).toMatchObject({ image: output[0].image, translations: { French: 'Feuille: Une partie de la plante.' } });
    expect(translated[0]).not.toHaveProperty('imageReuseKey');
    expect(first.callImagenWithSignal).toHaveBeenCalledTimes(1);
    expect(first.callGeminiImageEditWithSignal).toHaveBeenCalledTimes(1);
    expect(second.callImagenWithSignal).not.toHaveBeenCalled();
    expect(second.callGeminiImageEditWithSignal).not.toHaveBeenCalled();
  });
});
