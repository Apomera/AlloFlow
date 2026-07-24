import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

let Contract;
let Runtime;
const read = (file) => readFileSync(resolve(process.cwd(), file), 'utf8');
const audio = (label = 'clip') => ({
  encoding: 'base64',
  mime: 'audio/mpeg',
  base64: Buffer.from(label).toString('base64'),
  source: 'persona-owner-save',
  vetted: true,
  vettingMethod: 'owner-approved',
  synthesisProfile: { voice: 'Kore', language: 'English', provider: 'gemini', synthesisRate: 1 },
});

beforeAll(() => {
  loadAlloModule('read_aloud_artifact_contract_module.js');
  loadAlloModule('persona_session_artifact_module.js');
  Contract = window.AlloModules.ReadAloudArtifactContract;
  Runtime = window.AlloModules.PersonaSessionArtifact;
});

function singleInput() {
  return {
    sessionId: 'session-ada-001',
    resourceId: 'resource-ada',
    language: 'English',
    selectedVoice: 'Kore',
    personaState: {
      mode: 'single',
      selectedCharacter: { id: 'ada-lovelace', name: 'Ada Lovelace' },
      chatHistory: [
        { role: 'user', text: 'What is an algorithm?' },
        { role: 'model', text: 'It is a sequence of operations.' },
      ],
    },
  };
}

describe('PersonaSessionArtifact normalization', () => {
  it('normalizes current single-persona state into deterministic message and chunk ids', () => {
    const first = Runtime.normalizePersonaSession(singleInput(), { maxChunkChars: 100 });
    const second = Runtime.normalizePersonaSession(singleInput(), { maxChunkChars: 100 });
    expect(first.contractInput).toEqual(second.contractInput);
    expect(first.contractInput.persona).toMatchObject({
      personaId: 'ada-lovelace', resourceId: 'resource-ada', name: 'Ada Lovelace',
    });
    expect(first.contractInput.messages.map((message) => message.role)).toEqual(['learner', 'persona']);
    expect(first.contractInput.messages[1].speaker).toBe('Ada Lovelace');
    expect(first.contractInput.messages[0].messageId).toMatch(/^persona-message-/);
    expect(first.contractInput.messages[0].chunks[0].chunkId).toMatch(/^persona-chunk-/);
  });

  it('handles panel dialogue shapes and excludes non-transcript/system records', () => {
    const result = Runtime.normalizePersonaSession({
      sessionKey: 'panel-lesson-one',
      resourceId: 'panel-resource',
      language: 'Spanish',
      mode: 'panel',
      selectedCharacters: [
        { id: 'frida', name: 'Frida Kahlo' },
        { id: 'diego', name: 'Diego Rivera' },
      ],
      dialogue: [
        { role: 'system', text: 'Hidden orchestration prompt.' },
        { role: 'user', content: '¿Qué piensan?' },
        { speaker: 'Frida Kahlo', response: 'El arte puede contar nuestra historia.' },
        null,
      ],
    });
    expect(result.diagnostics).toMatchObject({ mode: 'panel', sourceMessageCount: 4, normalizedMessageCount: 2 });
    expect(result.contractInput.persona.name).toBe('Frida Kahlo & Diego Rivera');
    expect(result.contractInput.messages[1]).toMatchObject({ role: 'persona', speaker: 'Frida Kahlo' });
    expect(result.contractInput.messages.map((message) => message.chunks.map((chunk) => chunk.text).join(' ')))
      .not.toContain('Hidden orchestration prompt.');
  });

  it('uses the artifact contract as the schema authority and fails closed when it is absent', () => {
    const saved = window.AlloModules.ReadAloudArtifactContract;
    delete window.AlloModules.ReadAloudArtifactContract;
    try {
      expect(() => Runtime.normalizePersonaSession(singleInput())).toThrowError(
        expect.objectContaining({ code: 'contract-unavailable' })
      );
    } finally {
      window.AlloModules.ReadAloudArtifactContract = saved;
    }
  });
});

describe('PersonaSessionArtifact narration preparation', () => {
  it('passes an explicit selected voice/speaker plan and preserves text when a later clip fails', async () => {
    const requests = [];
    const result = await Runtime.buildPrivateSessionArtifact(singleInput(), {
      maxChunkChars: 100,
      prepareNarration: async (request) => {
        requests.push(request);
        if (request.role === 'persona') throw Object.assign(new Error('provider unavailable'), { code: 'provider-down' });
        return audio('learner');
      },
    });
    expect(requests).toHaveLength(2);
    expect(requests.every((request) => request.voice === 'Kore')).toBe(true);
    expect(requests.map((request) => request.speaker)).toEqual(['Learner', 'Ada Lovelace']);
    expect(result.narration).toMatchObject({ attempted: 2, embedded: 1 });
    expect(result.narration.failures).toEqual([
      expect.objectContaining({ code: 'provider-down' }),
    ]);
    expect(result.artifact.session.messages[0].chunks[0].audio).toMatchObject({
      vetted: true, vettingMethod: 'owner-approved', synthesisProfile: { voice: 'Kore' },
    });
    expect(result.artifact.session.messages[1].chunks[0].audio).toBeUndefined();
    expect(Contract.validateReadAloudArtifact(result.artifact).ok).toBe(true);
  });

  it('never invokes narration without an explicitly passed selected/default/plan voice', async () => {
    const input = singleInput();
    delete input.selectedVoice;
    const prepareNarration = vi.fn(async () => audio());
    const result = await Runtime.buildPrivateSessionArtifact(input, { prepareNarration });
    expect(prepareNarration).not.toHaveBeenCalled();
    expect(result.narration.failures).toHaveLength(2);
    expect(result.narration.failures.every((failure) => failure.code === 'explicit-voice-required')).toBe(true);
  });
});

describe('PersonaSessionArtifact private persistence and owner export', () => {
  it('writes canonical full JSON only to the injected persona_artifacts device namespace', async () => {
    const { artifact } = await Runtime.buildPrivateSessionArtifact(singleInput());
    const set = vi.fn(async () => true);
    const saved = await Runtime.persistPrivateSessionArtifact(artifact, { deviceStorage: { set } });
    expect(set).toHaveBeenCalledTimes(1);
    const [namespace, key, serialized, setOptions] = set.mock.calls[0];
    expect(namespace).toBe('persona_artifacts');
    expect(key).toBe(artifact.artifactId);
    expect(setOptions).toEqual({ queue: false });
    expect(Contract.parseReadAloudArtifact(serialized)).toEqual(artifact);
    expect(saved.privacy).toMatchObject({ ownerOnly: true, private: true, localOnly: true, shareable: false });
  });

  it('rejects queued writes because they are not confirmed durable', async () => {
    const { artifact } = await Runtime.buildPrivateSessionArtifact(singleInput());
    await expect(Runtime.persistPrivateSessionArtifact(artifact, {
      deviceStorage: { set: async () => ({ queued: true }) },
    })).rejects.toMatchObject({ code: 'device-storage-not-ready' });
  });

  it('requires an owner gesture and produces a private JSON download', async () => {
    const { artifact } = await Runtime.buildPrivateSessionArtifact(singleInput());
    expect(() => Runtime.downloadOwnerCopy(artifact)).toThrowError(
      expect.objectContaining({ code: 'owner-gesture-required' })
    );
    const anchor = { click: vi.fn(), remove: vi.fn() };
    const fakeDocument = { body: { appendChild: vi.fn() }, createElement: vi.fn(() => anchor) };
    const fakeUrl = { createObjectURL: vi.fn(() => 'blob:private'), revokeObjectURL: vi.fn() };
    const result = Runtime.downloadOwnerCopy(artifact, {
      ownerInitiated: true, document: fakeDocument, URL: fakeUrl, Blob,
    });
    expect(anchor.click).toHaveBeenCalledTimes(1);
    expect(result.filename).toMatch(/\.allopersona\.json$/);
    expect(result.bytes).toBeGreaterThan(0);
  });

  it('builds a self-contained owner HTML page with embedded narration players', async () => {
    const built = await Runtime.buildPrivateSessionArtifact(singleInput(), {
      maxChunkChars: 200,
      prepareNarration: async () => audio('clip'),
    });
    const page = Runtime.buildOwnerHtmlDocument(built.artifact);
    expect(page.stats.messages).toBe(2);
    expect(page.stats.audioClips).toBeGreaterThan(0);
    expect(page.html).toContain('<!DOCTYPE html>');
    expect(page.html).toContain('data:audio/mpeg;base64,');
    expect(page.html).toContain('Ada Lovelace');
    expect(page.html).toContain('What is an algorithm?');
    expect(page.html).toContain('Private owner copy');
    // Self-contained: nothing loads from the network.
    expect(page.html).not.toMatch(/src="https?:/);
    expect(page.html).not.toMatch(/<script src/);
  });

  it('HTML download requires an owner gesture and produces an .html file', async () => {
    const built = await Runtime.buildPrivateSessionArtifact(singleInput(), {
      maxChunkChars: 200,
      prepareNarration: async () => audio('clip'),
    });
    expect(() => Runtime.downloadOwnerHtmlCopy(built.artifact)).toThrowError(
      expect.objectContaining({ code: 'owner-gesture-required' })
    );
    const anchor = { click: vi.fn(), remove: vi.fn() };
    const fakeDocument = { body: { appendChild: vi.fn() }, createElement: vi.fn(() => anchor) };
    const fakeUrl = { createObjectURL: vi.fn(() => 'blob:private-html'), revokeObjectURL: vi.fn() };
    const result = Runtime.downloadOwnerHtmlCopy(built.artifact, {
      ownerInitiated: true, document: fakeDocument, URL: fakeUrl, Blob,
    });
    expect(anchor.click).toHaveBeenCalledTimes(1);
    expect(result.filename).toMatch(/\.html$/);
    expect(result.filename).not.toMatch(/\.allopersona\.json/);
    expect(result.bytes).toBeGreaterThan(0);
    expect(result.stats.audioClips).toBeGreaterThan(0);
  });

  it('contains no fallback voice literal or browser/resource-store persistence path', () => {
    const source = read('persona_session_artifact_source.jsx');
    expect(source).not.toMatch(/\bPuck\b/);
    expect(source).not.toMatch(/\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b/);
    expect(source).not.toMatch(/StudentArtifactStore\s*\.|setHistory\s*\(/);
    expect(read('persona_session_artifact_module.js'))
      .toBe(read('desktop/web-app/public/persona_session_artifact_module.js'));
  });
});
