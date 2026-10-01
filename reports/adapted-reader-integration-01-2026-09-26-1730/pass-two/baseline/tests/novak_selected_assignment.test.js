import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
import { loadAlloModule } from './setup.js';

let contract, transport, sharedActivity, serialize;
const text = 'Fair is foul.\r\nAnd foul is fair.';
const blockedTypes = ['analysis', 'lesson-plan'];

// Execute the host's real selection callback, then the shipped assignment
// builder and privacy serializer. Only React state and compression are stubs.
function resolver(history, generatedContent = null) {
  const shell = readFileSync('AlloFlowANTI.txt', 'utf8');
  const start = shell.indexOf('  const resolveAssignmentResources = useCallback(');
  const end = shell.indexOf('  // Shared packet builder', start);
  if (start < 0 || end < 0) throw new Error('Assignment resource resolver was not found');
  return new Function('useCallback', 'history', 'generatedContent', '_alloStudentSafeResources', 'window',
    shell.slice(start, end) + '\nreturn resolveAssignmentResources;')(
    callback => callback, history, generatedContent,
    items => transport.studentSafeResources(items, blockedTypes), window);
}

function original(id = 'original-a', family = 'family-a', unit = 'unit-a', sourceText = text) {
  const item = contract.createSupportedReading(sourceText, { id, sourceFamilyId: family, unitId: unit });
  item.readingSupports = contract.validateReadingSupports(item, {
    schemaVersion: 1, sourceFingerprint: item.sourceSnapshot.fingerprint, sourceFamilyId: family, unitId: unit,
    annotations: [
      { id: 'kept', start: 0, end: 4, quote: 'Fair', text: 'Teacher-selected meaning', origin: 'educator', pinned: true, priority: 'essential' },
      { id: 'removed', start: 8, end: 12, quote: 'foul', text: 'REMOVED GLOSS', origin: 'generated' }
    ],
    suppressedAnnotations: [{ start: 8, end: 12, quote: 'foul' }]
  });
  return item;
}

function companion(source, id = 'adapted-a') {
  return {
    id, type: 'simplified', title: 'Selected companion', data: 'Good and bad seem reversed.',
    sourceSnapshot: source.sourceSnapshot, sourceFamilyId: source.sourceFamilyId, unitId: source.unitId,
    instructionalText: { role: 'supplemental', form: 'adapted' },
    sourceInstructionalText: source.sourceInstructionalText
  };
}

async function packet(history, ids, generatedContent = null) {
  const result = await sharedActivity.buildAssignmentPackEncoded({ resourceIds: ids }, {
    resolveAssignmentResources: resolver(history, generatedContent),
    serializeResourceForStudentPack: item => serialize(item, {
      sanitizeHistoryForCloud: window.sanitizeHistoryForCloud, stripUndefined: window.stripUndefined
    }),
    stripUndefined: window.stripUndefined, generateUUID: () => 'assignment-id',
    encodeAlloPack: value => Promise.resolve(value)
  });
  return result ? JSON.parse(result.encoded) : null;
}

beforeAll(() => {
  window.React = React;
  for (const name of ['instructional_context_module.js', 'firestore_sync_module.js', 'session_transport_module.js', 'shared_activity_module.js']) loadAlloModule(name);
  contract = window.AlloModules.InstructionalContext;
  transport = window.AlloModules.SessionTransport;
  sharedActivity = window.AlloModules.SharedActivity;
  const source = readFileSync('live_aac_source.jsx', 'utf8');
  const start = source.indexOf('const _alloSerializeResourceForStudentPack =');
  const end = source.indexOf('const LiveAacBoardDialog =', start);
  serialize = new Function('window', source.slice(start, end) + '\nreturn _alloSerializeResourceForStudentPack;')(window);
});

describe('explicit student reading assignments', () => {
  it('adds the selected companion\'s original with curated supports and preserves its opening resource', async () => {
    const source = original(), adapted = companion(source);
    const otherFamily = original('other-family', 'family-b');
    const otherUnit = original('other-unit', 'family-a', 'unit-b');
    const result = await packet([
      source, adapted, otherFamily, companion(otherFamily, 'adapted-b'), otherUnit,
      { id: 'private-analysis', type: 'analysis', data: { originalText: 'Teacher review' } },
      { id: 'unrelated-quiz', type: 'quiz', data: [] }
    ], [adapted.id]);
    expect(result.resources.map(item => item.id)).toEqual([adapted.id, source.id]);
    expect(result.currentResourceId).toBe(adapted.id);
    expect(result.title).toBe(adapted.title);
    const reopened = window.hydrateHistory(result.resources);
    const received = reopened.find(item => item.id === source.id);
    expect(contract.isSupportedOriginal(received)).toBe(true);
    expect(received.data).toBe(text);
    expect(received.readingSupports.annotations).toEqual([
      expect.objectContaining({ id: 'kept', origin: 'educator', pinned: true, priority: 'essential' })
    ]);
    expect(received.readingSupports.suppressedAnnotations).toEqual([{ start: 8, end: 12, quote: 'foul' }]);
    expect(JSON.stringify(result)).not.toContain('REMOVED GLOSS');
  });

  it('deduplicates an original shared by multiple selected companions', async () => {
    const source = original(), first = companion(source), second = companion(source, 'adapted-second');
    const result = await packet([source, first, second], [first.id, second.id]);
    expect(result.resources.map(item => item.id)).toEqual([first.id, second.id, source.id]);
    const both = await packet([source, first], [source.id, first.id]);
    expect(both.resources.map(item => item.id)).toEqual([source.id, first.id]);
  });

  it('reconstructs the saved source when its original was deleted without taking a same-family revision', async () => {
    const source = original(), adapted = companion(source);
    const revision = original('revised-original', 'family-a', 'unit-a', 'Fair words in a later revision.');
    const result = await packet([revision, adapted], [adapted.id]);
    expect(result.resources).toHaveLength(2);
    expect(result.resources[0].id).toBe(adapted.id);
    expect(result.resources[1].data).toBe(text);
    expect(result.resources[1].id).not.toBe(revision.id);
    expect(result.resources[1].readingSupports?.annotations || []).toEqual([]);
  });

  it('keeps original-only and non-reading selections scoped and empty selections empty', async () => {
    const source = original(), adapted = companion(source), quiz = { id: 'quiz', type: 'quiz', data: [] };
    expect((await packet([source, adapted, quiz], [source.id])).resources.map(item => item.id)).toEqual([source.id]);
    expect((await packet([source, adapted, quiz], [quiz.id])).resources.map(item => item.id)).toEqual([quiz.id]);
    expect(await packet([source, adapted], [])).toBeNull();
    expect(await packet([source, adapted], ['missing'])).toBeNull();
    expect(await packet([source, adapted], ['private-analysis'])).toBeNull();
  });

  it('retains the full-pack and current-resource fallback behavior', async () => {
    const source = original(), adapted = companion(source), quiz = { id: 'quiz', type: 'quiz', data: [] };
    expect((await packet([source, adapted, quiz], null)).resources.map(item => item.id)).toEqual([source.id, adapted.id, quiz.id]);
    const fallback = await packet([], null, adapted);
    expect(fallback.resources).toHaveLength(2);
    expect(fallback.resources.find(item => contract.isSupportedOriginal(item)).data).toBe(text);
  });
});
