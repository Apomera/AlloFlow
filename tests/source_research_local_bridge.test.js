import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';

function installBridge(file, generateText) {
  const source = readFileSync(file, 'utf8');
  const start = source.indexOf('function _installLocalTextBridge(');
  const end = source.indexOf('function _installLocalTextBridgeFromStorage(', start);
  if (start < 0 || end < 0) throw new Error('Local bridge boundary not found in ' + file);
  const host = {};
  const install = new Function('window', '_usesLocalTextBackend', '_alloWrapCallGeminiForProvenance',
    '_installQrStudentAiGuard', '_installQrStudentAiCapabilityGuards', 'warnLog',
    'let callGemini, callGeminiSingleAttempt;\n' + source.slice(start, end) + '\nreturn _installLocalTextBridge;')(
    host, () => true, value => value, () => {}, () => {}, () => {});
  expect(install({ generateText }, { backend: 'ollama' })).toBe(true);
  return host.callGemini;
}

describe.each(['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'])('research local bridge in %s', file => {
  it('carries an explicit topic without changing cancellation or constrained output', async () => {
    const generateText = vi.fn().mockResolvedValue('Grounded response');
    const call = installBridge(file, generateText);
    const signal = new AbortController().signal;
    const schema = { type: 'object', properties: { answer: { type: 'string' } } };
    await expect(call('Private instructional context', true, true, 0.2, 'How clouds form', signal,
      { schema }, { operation: 'research' }, { intent: 'user-topic' })).resolves.toBe('Grounded response');
    expect(generateText).toHaveBeenCalledWith('Private instructional context', {
      json: true, search: true, searchQuery: 'How clouds form', searchIntent: 'user-topic',
      temperature: 0.2, signal, schema
    });
  });

  it('keeps ordinary contextual callers on the restricted search path', async () => {
    const generateText = vi.fn().mockResolvedValue('Reference response');
    const call = installBridge(file, generateText);
    await call('A classroom question', false, true, null, 'retrieval practice');
    expect(generateText.mock.calls[0][1]).toMatchObject({ search: true, searchQuery: 'retrieval practice', searchIntent: undefined });
    await call('A classroom question', false, true, null, null, null, null, null, { intent: 'unknown' });
    expect(generateText.mock.calls[1][1]).toMatchObject({ searchQuery: null, searchIntent: undefined });
  });
});
