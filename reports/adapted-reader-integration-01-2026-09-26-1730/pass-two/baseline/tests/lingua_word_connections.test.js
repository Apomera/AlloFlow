import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, axe, Lingua, root, host, originalLexicalGraph;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  axe = require(resolve(modulesDir, 'axe-core'));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('lingua_practice_module.js');
  loadAlloModule('lexical_graph_module.js');
  Lingua = window.AlloModules.LinguaPractice;
  originalLexicalGraph = window.AlloModules.LexicalGraph;
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  if (host) { host.remove(); host = null; }
  localStorage.clear();
  if (originalLexicalGraph === undefined) delete window.AlloModules.LexicalGraph;
  else window.AlloModules.LexicalGraph = originalLexicalGraph;
});

async function mount(props = {}) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => {
    root.render(React.createElement(Lingua, { isOpen: true, onClose: () => {}, ...props }));
  });
}

function button(text, scope = host) {
  return Array.from(scope.querySelectorAll('button')).find((node) => node.textContent.includes(text));
}

async function click(node) {
  expect(node).toBeTruthy();
  await act(async () => {
    node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
  });
}

describe('Lingua Word Connections', () => {
  it('adds stable sense-aware lexical IDs and keeps legacy AI roots explicitly suggested', () => {
    const source = {
      term: 'transport', meaning: 'to carry from one place to another', language: 'English',
      etymology: 'Suggested history from an earlier Glossary response.',
      roots: [{ root: 'port', lang: 'Latin', meaning: 'carry' }],
    };
    const first = Lingua._normalizeVocabularyItem(source, 0);
    const second = Lingua._normalizeVocabularyItem(source, 0);
    const otherSense = Lingua._normalizeVocabularyItem({ ...source, meaning: 'a system for moving people or goods' }, 0);

    expect(first.lexical).toMatchObject({
      schemaVersion: 1,
      language: 'English',
      languageTag: 'en-US',
      originNoteVerification: 'ai-suggested',
    });
    expect(first.lexemeId).toBe(second.lexemeId);
    expect(first.senseId).toBe(second.senseId);
    expect(otherSense.lexemeId).toBe(first.lexemeId);
    expect(otherSense.senseId).not.toBe(first.senseId);
    expect(first.lexical.roots[0]).toMatchObject({
      form: 'port', language: 'Latin', meaning: 'carry', verification: 'ai-suggested', provenance: null,
    });
  });

  it('preserves reviewed lexical identity and provenance through practice-set and backup round trips', () => {
    const vocabulary = [{
      id: 'transport-fr', term: 'transporter', meaning: 'to carry',
      lexical: {
        schemaVersion: 1,
        lexemeId: 'lex:fr:transporter:verb',
        senseId: 'sense:fr:transporter:carry',
        senseKey: 'carry',
        language: 'French', languageTag: 'fr-FR', partOfSpeech: 'verb', verification: 'reviewed',
        provenance: { provider: 'AlloFlow pilot', datasetVersion: '1.0', sourceId: 'fr-transporter', license: 'CC0', attribution: 'Reviewed lexical pilot' },
        roots: [{ id: 'morph:latin:port', form: 'port', language: 'Latin', meaning: 'carry', verification: 'reviewed', provenance: { provider: 'AlloFlow pilot', datasetVersion: '1.0', license: 'CC0', attribution: 'Reviewed lexical pilot' } }],
      },
    }];
    const lesson = Lingua._parseLesson(JSON.stringify({ title: 'Transport', vocabulary }));
    const entry = Lingua._savePracticeSet([], 'French', lesson, { level: 'Beginner' }, 100, 'lexical-set')[0];
    const imported = Lingua._parsePracticeSetImport(JSON.stringify(Lingua._createPracticeSetExport(entry, 200)), 300);

    expect(imported.lesson.vocabulary[0]).toMatchObject({
      lexemeId: 'lex:fr:transporter:verb',
      senseId: 'sense:fr:transporter:carry',
      lexical: { language: 'French', languageTag: 'fr-FR', verification: 'reviewed' },
    });
    expect(imported.lesson.vocabulary[0].lexical.roots[0]).toMatchObject({ verification: 'reviewed', provenance: { license: 'CC0' } });

    const backup = Lingua._createBackup(
      { known: 'English', target: 'French', level: 'Beginner' },
      { saved: [{ ...vocabulary[0], language: 'French' }] },
      {}, {}, {}, 400, [entry], {},
    );
    const restored = Lingua._parseBackup(JSON.stringify(backup));
    expect(restored.version).toBe(4);
    expect(restored.progress.saved[0]).toMatchObject({
      id: 'sense:fr:transporter:carry',
      legacyId: 'transport-fr',
      lexemeId: 'lex:fr:transporter:verb',
      senseId: 'sense:fr:transporter:carry',
      lexical: { schemaVersion: 1, provenance: { attribution: 'Reviewed lexical pilot' } },
    });
  });

  it('consumes the LexicalGraph provider and retains precise relationship evidence', () => {
    const calls = [];
    window.AlloModules.LexicalGraph = {
      PILOT_SNAPSHOT: { version: 'alloflow-lexical-snapshot/v1' },
      createLocalProvider(snapshot) {
        calls.push(['create', snapshot.version]);
        return {
          resolveLexeme(term, options) { calls.push(['resolve', term, options.language]); return { id: 'lex:es:transportar:verb' }; },
          getNeighborhood(seed, options) {
            calls.push(['neighborhood', seed, options.maxNodes, options.maxEdges]);
            return {
              version: 'lexical-graph/v1', focusId: seed,
              nodes: [
                { id: seed, type: 'lexeme', label: 'transportar', language: 'es-ES', definition: 'to carry' },
                { id: 'lex:fr:transporter:verb', type: 'lexeme', label: 'transporter', language: 'fr-FR', definition: 'to carry' },
              ],
              edges: [{
                id: 'edge-cognate', fromId: seed, toId: 'lex:fr:transporter:verb', relationType: 'cognate_with',
                direction: 'symmetric', verification: 'reviewed', explanation: 'Both forms continue a reviewed Romance family.',
                evidence: 'Reviewed against the pilot record.',
                provenance: { provider: 'AlloFlow pilot', datasetVersion: '1.0', sourceId: 'family-transport', sourceUrl: 'https://example.test/family-transport', license: 'CC0', attribution: 'Reviewed lexical pilot' },
              }],
            };
          },
        };
      },
    };

    const graph = Lingua._connectionGraphForWord({
      term: 'transportar', meaning: 'to carry', language: 'Spanish',
      lexical: { schemaVersion: 1, language: 'Spanish', languageTag: 'es-ES', senseKey: 'carry' },
    });
    expect(calls).toEqual([
      ['create', 'alloflow-lexical-snapshot/v1'],
      ['resolve', 'transportar', 'es-ES'],
      ['neighborhood', 'lex:es:transportar:verb', 24, 48],
    ]);
    expect(graph).toMatchObject({ version: 'lexical-graph/v1', focusId: 'lex:es:transportar:verb', providerAvailable: true });
    expect(graph.edges[0]).toMatchObject({
      relationType: 'cognate_with', direction: 'symmetric', verification: 'reviewed',
      evidence: 'Reviewed against the pilot record.', provenance: { license: 'CC0', attribution: 'Reviewed lexical pilot' },
    });
    expect(Lingua._connectionModeForRelation('cognate_with')).toBe('cognates');
    expect(Lingua._connectionModeForRelation('translation_equivalent')).toBe('meaning');
  });

  it('resolves a generated Lingua sense through the real reviewed pilot without over-constraining its sense key', () => {
    window.AlloModules.LexicalGraph = originalLexicalGraph;
    const word = Lingua._normalizeVocabularyItem({
      term: 'transportar', meaning: 'to carry', language: 'Spanish', languageTag: 'es-ES',
    }, 0);
    const graph = Lingua._connectionGraphForWord({ ...word, language: 'Spanish' });

    expect(word.lexical.senseKeySource).toBe('generated');
    expect(graph.providerAvailable).toBe(true);
    expect(graph.focusId).toMatch(/^lex:es:transportar:/);
    expect(graph.nodes.length).toBeGreaterThan(3);
    expect(graph.edges.map((edge) => edge.relationType)).toEqual(expect.arrayContaining([
      'has_sense', 'translation_equivalent', 'contains_morpheme', 'derived_from', 'shares_root',
    ]));
    const reviewedSource = graph.edges.find((edge) => edge.relationType === 'derived_from').provenance;
    expect(reviewedSource).toMatchObject({ provider: 'alloflow-reviewed-lexical-pilot', license: 'CC BY-SA 4.0' });
    expect(reviewedSource.sourceIds.length).toBeGreaterThan(0);
    expect(reviewedSource.sourceUrls[0]).toMatch(/^https:/);
    const learningWeb = Lingua._connectionGraphToLearningWeb(graph, { term: 'transportar' });
    expect(learningWeb.meta.lexicalGraph.source.manifest).toEqual({
      provider: 'alloflow-reviewed-lexical-pilot',
      datasetVersion: graph.manifest.datasetVersion,
      snapshotId: graph.manifest.snapshotId,
      license: 'CC BY-SA 4.0',
      attribution: graph.manifest.attribution,
      reviewedAt: graph.manifest.reviewedAt,
    });
    expect(learningWeb.meta.lexicalGraph.source.manifest).not.toHaveProperty('sources');
    expect(learningWeb.edges.find((edge) => edge.relationType === 'derived_from').provenance).toEqual(reviewedSource);
  });

  it('opens a keyboard-contained, language-aware relationship dialog and restores focus', async () => {
    window.AlloModules.LexicalGraph = {
      PILOT_SNAPSHOT: { version: 'alloflow-lexical-snapshot/v1' },
      createLocalProvider: () => ({
        resolveLexeme: () => ({ id: 'lex:es:transportar:verb' }),
        getNeighborhood: () => ({
          version: 'lexical-graph/v1', focusId: 'lex:es:transportar:verb',
          nodes: [
            { id: 'lex:es:transportar:verb', type: 'lexeme', label: 'transportar', language: 'es-ES', definition: 'to carry', partOfSpeech: 'verb' },
            { id: 'lex:fr:transporter:verb', type: 'lexeme', label: 'transporter', language: 'fr-FR', definition: 'to carry' },
          ],
          edges: [{
            id: 'edge-cognate', fromId: 'lex:es:transportar:verb', toId: 'lex:fr:transporter:verb', relationType: 'cognate_with', direction: 'symmetric',
            verification: 'reviewed', explanation: 'These are reviewed cognates.', evidence: 'Reviewed pilot evidence.',
            provenance: { sourceUrl: 'https://example.test/family', license: 'CC0', datasetVersion: '1.0', attribution: 'Reviewed lexical pilot' },
          }],
        }),
      }),
    };
    localStorage.setItem('allo_lingua_profile_v1', JSON.stringify({ known: 'English', target: 'Spanish', level: 'Beginner' }));
    localStorage.setItem('allo_lingua_progress_v1', JSON.stringify({ saved: [{ language: 'Spanish', term: 'transportar', meaning: 'to carry' }] }));
    const registeredGraphs = [];
    await mount({ onRegisterLearningWebGraph: (payload) => { registeredGraphs.push(payload); return true; } });
    await click(button('Saved words'));
    const opener = button('Explore connections');
    await click(opener);

    const dialog = host.querySelector('[role="dialog"][aria-labelledby="lingua-word-connections-title"]');
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('aria-describedby')).toBe('lingua-word-connections-intro');
    expect(dialog.textContent).toContain('is a cognate of');
    expect(dialog.textContent).toContain('Reviewed source');
    expect(dialog.textContent).toContain('Reviewed pilot evidence.');
    expect(dialog.textContent).toContain('CC0');
    expect(dialog.querySelector('bdi[lang="es-ES"]').textContent).toBe('transportar');
    expect(dialog.querySelector('bdi[lang="fr-FR"]').textContent).toBe('transporter');
    expect(dialog.querySelector('a[href="https://example.test/family"]').rel).toContain('noopener');
    expect(registeredGraphs).toHaveLength(1);
    expect(registeredGraphs[0]).toMatchObject({ id: 'lexical-graph:lex:es:transportar:verb', resourceId: 'lingua:lex:es:transportar:verb', graph: { version: 'acg/v1', meta: { domain: 'lexical', lexicalGraph: { focusId: 'lex:es:transportar:verb' } } } });
    expect(registeredGraphs[0].graph.nodes.map((node) => node.lexicalType)).toEqual(['lexeme', 'lexeme']);
    expect(registeredGraphs[0].graph.edges[0]).toMatchObject({ type: 'associates', relationType: 'cognate_with', verification: 'reviewed', provenance: { license: 'CC0' } });
    const outer = host.querySelector('#lingua-title').closest('[role="dialog"]');
    expect(outer.getAttribute('aria-hidden')).toBe('true');
    expect(outer.hasAttribute('inert')).toBe(true);
    expect(document.activeElement).toBe(dialog.querySelector('#lingua-word-connections-title'));
    const audit = await axe.run(dialog, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false }, 'scrollable-region-focusable': { enabled: false } },
    });
    expect(audit.violations.map((violation) => violation.id)).toEqual([]);

    const focusables = Array.from(dialog.querySelectorAll('button:not([disabled]), [href], select:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    await act(async () => {
      dialog.querySelector('#lingua-word-connections-title').dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    });
    expect(document.activeElement).toBe(focusables[focusables.length - 1]);

    await act(async () => {
      dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      await new Promise((resolveTimer) => setTimeout(resolveTimer, 0));
    });
    expect(host.querySelector('[aria-labelledby="lingua-word-connections-title"]')).toBe(null);
    expect(document.activeElement).toBe(opener);
  }, 15000);

  it('invalidates reviewed identity and provenance when an edited term, language, or meaning changes', () => {
    const reviewed = Lingua._normalizeProgress({ saved: [{
      id: 'legacy-transportar', language: 'Spanish', term: 'transportar', meaning: 'to carry', reviewStage: 4, reviews: 7,
      lexical: {
        lexemeId: 'lex:es:transportar:verb', senseId: 'sense:es:transportar:carry', senseKey: 'carry',
        lemma: 'transportar', language: 'Spanish', languageTag: 'es-ES', definition: 'to carry', partOfSpeech: 'verb',
        verification: 'reviewed', provenance: { provider: 'reviewed-test', datasetVersion: '1', sourceIds: ['entry'], sourceUrls: ['https://example.test/entry'], license: 'CC0', attribution: 'Reviewed test', reviewedAt: '2026-08-12' },
        roots: [{ form: 'port', language: 'Latin', meaning: 'carry', verification: 'reviewed', provenance: { provider: 'reviewed-test', sourceIds: ['root'], sourceUrls: ['https://example.test/root'] } }],
        relationships: [{ relationType: 'cognate_with', targetLabel: 'transporter', targetLanguage: 'French', verification: 'reviewed', provenance: { provider: 'reviewed-test', sourceIds: ['family'], sourceUrls: ['https://example.test/family'] } }],
        originNote: 'Reviewed history.', originNoteVerification: 'reviewed',
      },
    }] }).saved[0];
    expect(reviewed.id).toBe('sense:es:transportar:carry');
    const unchanged = Lingua._upsertSavedWord([reviewed], { ...reviewed, pronunciation: 'trahns-por-TAR' }, reviewed.id).word;
    expect(unchanged.lexical).toMatchObject({ senseId: 'sense:es:transportar:carry', verification: 'reviewed', provenance: { reviewedAt: '2026-08-12' } });

    for (const patch of [{ term: 'llevar' }, { language: 'French' }, { meaning: 'to convey an idea' }]) {
      const changed = Lingua._upsertSavedWord([reviewed], { ...reviewed, ...patch }, reviewed.id).word;
      expect(changed.lexical).toMatchObject({ identitySource: 'generated', verification: 'unverified', provenance: null, roots: [], relationships: [], originNote: '' });
      expect(changed.senseId).not.toBe('sense:es:transportar:carry');
      expect(changed.lexemeId).not.toBe('lex:es:transportar:verb');
      expect(changed.id).not.toBe('sense:es:transportar:carry');
      expect(changed.legacyId).not.toBe('sense:es:transportar:carry');
      expect(changed).toMatchObject({ reviewStage: 4, reviews: 7 });
    }
  });

  it('deduplicates reviewed records by sense, then lexeme, while retaining the legacy fallback', () => {
    const entry = (senseId, meaning) => ({
      id: 'legacy-' + senseId, language: 'English', term: 'transport', meaning,
      lexical: { lexemeId: 'lex:en:transport:noun', senseId, senseKey: senseId.split(':').pop(), lemma: 'transport', language: 'English', definition: meaning, verification: 'reviewed', provenance: { provider: 'reviewed-test', sourceIds: [senseId], sourceUrls: ['https://example.test/' + encodeURIComponent(senseId)] } },
    });
    const people = entry('sense:en:transport:people', 'a system for moving people');
    const delight = entry('sense:en:transport:delight', 'a strong emotion of delight');
    const saved = Lingua._normalizeProgress({ saved: [people, { ...people, id: 'duplicate' }, delight] }).saved;
    expect(saved.map((item) => item.id)).toEqual(['sense:en:transport:people', 'sense:en:transport:delight']);
    expect(saved[0].legacyId).toBe('legacy-sense:en:transport:people');

    const lesson = Lingua._parseLesson(JSON.stringify({ vocabulary: [people, { ...people, id: 'duplicate' }, delight] }));
    expect(lesson.vocabulary.map((item) => item.id)).toEqual(['sense:en:transport:people', 'sense:en:transport:delight']);
    expect(Lingua._normalizeProgress({ saved: [{ id: 'Spanish::hola', language: 'Spanish', term: 'hola', meaning: 'hello' }] }).saved[0].id).toBe('Spanish::hola');
  });

  it('prefers an exact stored sense lookup and returns reviewed identity with bounded HTTPS evidence', () => {
    const calls = [];
    const manifest = { provider: 'reviewed-test', datasetVersion: '2026.1', snapshotId: 'pilot', license: 'CC0', attribution: 'Reviewed test', reviewedAt: '2026-08-12' };
    window.AlloModules.LexicalGraph = {
      PILOT_SNAPSHOT: { version: 'snapshot/v1' },
      createLocalProvider: () => ({
        resolveLexeme(query) {
          calls.push(['resolve', query]);
          return { status: 'resolved', id: 'lex:es:transportar:verb', match: { id: 'lex:es:transportar:verb', type: 'lexeme', lemma: 'transportar', label: 'transportar', language: 'es', partOfSpeech: 'verb' }, sense: { id: 'sense:es:transportar:carry', type: 'sense', lexemeId: 'lex:es:transportar:verb', senseKey: 'carry', language: 'es', definition: 'to carry' }, manifest };
        },
        getNeighborhood(seed) {
          calls.push(['neighborhood', seed]);
          return { version: 'lexical-graph/v1', focusId: seed, manifest, nodes: [
            { id: 'sense:es:transportar:carry', type: 'sense', label: 'to carry', lexemeId: 'lex:es:transportar:verb', senseKey: 'carry', language: 'es' },
            { id: 'lex:es:transportar:verb', type: 'lexeme', label: 'transportar', lemma: 'transportar', language: 'es', partOfSpeech: 'verb' },
          ], edges: [{ id: 'has-sense', fromId: 'lex:es:transportar:verb', toId: 'sense:es:transportar:carry', relationType: 'hasSense', direction: 'directed', verification: 'reviewed', provenance: { ...manifest, sourceIds: ['good', 'unsafe', 'second'], sourceUrls: ['https://example.test/good', 'http://example.test/unsafe', 'https://example.test/second'] } }] };
        },
      }),
    };
    const graph = Lingua._connectionGraphForWord({ term: 'transportar', meaning: 'to carry', language: 'Spanish', lexemeId: 'lex:es:transportar:verb', senseId: 'sense:es:transportar:carry', lexical: { identitySource: 'provided', lexemeId: 'lex:es:transportar:verb', senseId: 'sense:es:transportar:carry', language: 'Spanish', languageTag: 'es-ES' } });
    expect(calls).toEqual([['resolve', 'sense:es:transportar:carry'], ['neighborhood', 'sense:es:transportar:carry']]);
    expect(graph).toMatchObject({ providerStatus: 'loaded', resolutionStatus: 'resolved', resolvedQuery: 'sense:es:transportar:carry', resolvedLexical: { identitySource: 'provided', lexemeId: 'lex:es:transportar:verb', senseId: 'sense:es:transportar:carry', verification: 'reviewed', provenance: { reviewedAt: '2026-08-12', sourceIds: ['good', 'second', 'unsafe'], sourceUrls: ['https://example.test/good', 'https://example.test/second'] } } });
  });

  it('distinguishes loaded coverage misses from provider failure and absence', () => {
    window.AlloModules.LexicalGraph = { PILOT_SNAPSHOT: {}, createLocalProvider: () => ({ resolveLexeme: () => ({ status: 'not-found', id: null }), getNeighborhood: () => { throw new Error('should not run'); } }) };
    expect(Lingua._connectionGraphForWord({ term: 'uncovered', meaning: 'unknown', language: 'English' })).toMatchObject({ providerAvailable: true, providerStatus: 'loaded', resolutionStatus: 'not-found' });
    window.AlloModules.LexicalGraph = { PILOT_SNAPSHOT: {}, createLocalProvider: () => { throw new Error('bad snapshot'); } };
    expect(Lingua._connectionGraphForWord({ term: 'uncovered', meaning: 'unknown', language: 'English' })).toMatchObject({ providerAvailable: false, providerStatus: 'failed', resolutionStatus: 'failed' });
    delete window.AlloModules.LexicalGraph;
    expect(Lingua._connectionGraphForWord({ term: 'uncovered', meaning: 'unknown', language: 'English' })).toMatchObject({ providerAvailable: false, providerStatus: 'absent', resolutionStatus: 'absent' });
  });

  it('shows coverage misses and renders reviewed origin status plus every safe source', async () => {
    const reviewedProvenance = { provider: 'reviewed-test', datasetVersion: '1', sourceIds: ['first', 'unsafe', 'second'], sourceUrls: ['https://example.test/first', 'http://example.test/unsafe', 'https://example.test/second'], license: 'CC0', attribution: 'Reviewed entries', reviewedAt: '2026-08-12' };
    localStorage.setItem('allo_lingua_profile_v1', JSON.stringify({ known: 'English', target: 'Spanish', level: 'Beginner' }));
    localStorage.setItem('allo_lingua_progress_v1', JSON.stringify({ saved: [{ language: 'Spanish', term: 'transportar', meaning: 'to carry', lexical: { lexemeId: 'lex:es:transportar:verb', senseId: 'sense:es:transportar:carry', senseKey: 'carry', lemma: 'transportar', language: 'Spanish', definition: 'to carry', verification: 'reviewed', provenance: reviewedProvenance, originNote: 'A reviewed origin note.', originNoteVerification: 'reviewed', relationships: [{ id: 'connection', fromId: 'lex:es:transportar:verb', relationType: 'cognate_with', targetLabel: 'transporter', targetLanguage: 'French', verification: 'reviewed', provenance: reviewedProvenance }] } }] }));
    delete window.AlloModules.LexicalGraph;
    await mount();
    await click(button('Saved words'));
    await click(button('Explore connections'));
    let dialog = host.querySelector('[aria-labelledby="lingua-word-connections-title"]');
    expect(dialog.querySelector('aside').textContent).toContain('Word history');
    expect(dialog.querySelector('aside').textContent).toContain('Reviewed source');
    expect(dialog.querySelector('aside').textContent).not.toContain('AI suggestion');
    expect(Array.from(dialog.querySelectorAll('a')).map((link) => link.href)).toEqual(['https://example.test/first', 'https://example.test/second']);
    expect(dialog.querySelector('time[datetime="2026-08-12"]')).toBeTruthy();
    await click(button('Close word connections', dialog));
    if (root) { act(() => root.unmount()); root = null; }
    if (host) { host.remove(); host = null; }

    window.AlloModules.LexicalGraph = { PILOT_SNAPSHOT: {}, createLocalProvider: () => ({ resolveLexeme: () => ({ status: 'not-found', id: null }), getNeighborhood: () => ({ nodes: [], edges: [] }) }) };
    localStorage.setItem('allo_lingua_progress_v1', JSON.stringify({ saved: [{ language: 'Spanish', term: 'sin-cobertura', meaning: 'not covered' }] }));
    await mount();
    await click(button('Saved words'));
    await click(button('Explore connections'));
    dialog = host.querySelector('[aria-labelledby="lingua-word-connections-title"]');
    expect(dialog.textContent).toContain('does not yet cover this exact word or sense');
  }, 15000);

  it('degrades to saved forms and marks legacy roots as suggestions when no provider is loaded', () => {
    delete window.AlloModules.LexicalGraph;
    const graph = Lingua._connectionGraphForWord({
      term: 'portable', meaning: 'easy to carry', language: 'English',
      etymology: 'A generated origin note.', roots: [{ root: 'port', lang: 'Latin', meaning: 'carry' }],
      forms: [{ id: 'plural', label: 'plural', form: 'portables' }],
    });
    expect(graph.providerAvailable).toBe(false);
    expect(graph.edges.map((edge) => edge.relationType)).toEqual(expect.arrayContaining(['contains_morpheme', 'related_form']));
    expect(graph.edges.find((edge) => edge.relationType === 'contains_morpheme')).toMatchObject({ verification: 'ai-suggested', provenance: null });
    expect(graph.originNoteVerification).toBe('ai-suggested');
    const learningWeb = Lingua._connectionGraphToLearningWeb(graph, { term: 'portable' });
    expect(learningWeb.meta.lexicalGraph).not.toHaveProperty('source');
    expect(learningWeb.meta.lexicalGraph).not.toHaveProperty('provider');
    expect(learningWeb.meta.lexicalGraph).not.toHaveProperty('datasetVersion');
    expect(learningWeb.meta.lexicalGraph).not.toHaveProperty('snapshotId');
    expect(learningWeb.meta.lexicalGraph).not.toHaveProperty('license');
    expect(learningWeb.meta.lexicalGraph).not.toHaveProperty('attribution');
    expect(learningWeb.meta.lexicalGraph).not.toHaveProperty('reviewedAt');
  });
});
