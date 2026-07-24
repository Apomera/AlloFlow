import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

let Contract;
const b64 = (value) => Buffer.from(value).toString('base64');
const read = (file) => readFileSync(resolve(process.cwd(), file), 'utf8');

beforeAll(() => {
  loadAlloModule('read_aloud_artifact_contract_module.js');
  Contract = window.AlloModules.ReadAloudArtifactContract;
  if (!Contract) throw new Error('ReadAloudArtifactContract did not register');
});

const vettedAudio = (label = 'clip') => ({
  encoding: 'base64',
  mime: 'audio/mpeg',
  base64: b64(label),
  source: 'ai-played',
  vetted: true,
  vettingMethod: 'teacher-reviewed',
  synthesisProfile: {
    voice: 'Kore', language: 'English', provider: 'gemini',
    synthesisRate: 1, voiceResolverVersion: 2,
  },
});

function adventureInput() {
  return {
    storyId: 'story-water-cycle',
    resourceId: 'resource-water-cycle',
    title: 'The Water Cycle',
    language: 'English',
    scenes: [{
      sceneId: 'scene-rain',
      order: 1,
      title: 'Rain',
      segments: [{ segmentId: 'rain-narration', order: 0, text: 'Rain falls.', audio: vettedAudio('rain') }],
    }, {
      sceneId: 'scene-cloud',
      order: 0,
      title: 'Cloud',
      segments: [{ segmentId: 'cloud-narration', order: 0, text: 'A cloud forms.', speaker: 'Narrator' }],
    }],
  };
}

function personaInput() {
  return {
    sessionId: 'session-ada-001',
    title: 'Conversation with Ada',
    language: 'English',
    persona: {
      personaId: 'ada-lovelace',
      profileId: 'historical-stem-v1',
      resourceId: 'persona-resource-ada',
      name: 'Ada Lovelace',
    },
    messages: [{
      messageId: 'message-learner-1',
      order: 0,
      role: 'user',
      text: 'What is an algorithm?',
    }, {
      messageId: 'message-persona-1',
      order: 1,
      role: 'assistant',
      speaker: 'Ada',
      chunks: [{
        chunkId: 'message-persona-1:chunk-1',
        order: 0,
        text: 'It is a sequence of operations.',
        audio: vettedAudio('answer'),
      }],
    }],
  };
}

describe('ReadAloudArtifactContract Adventure Storybook contract', () => {
  it('builds a versioned scene/transcript artifact with optional vetted audio', () => {
    const artifact = Contract.buildAdventureStorybookArtifact(adventureInput());
    expect(artifact).toMatchObject({
      schema: 'alloflow.read-aloud-artifact',
      schemaVersion: '1.0',
      artifactType: 'adventure-storybook-read-aloud',
      story: { storyId: 'story-water-cycle', resourceId: 'resource-water-cycle' },
      privacy: { private: false, shareable: true, containsConversation: false },
      transcript: { sceneCount: 2, segmentCount: 2 },
    });
    expect(artifact.scenes.map((scene) => scene.sceneId)).toEqual(['scene-cloud', 'scene-rain']);
    expect(artifact.transcript.text).toBe('Narrator: A cloud forms.\n\nRain falls.');
    expect(artifact.scenes[1].segments[0].audio).toMatchObject({
      encoding: 'base64', mime: 'audio/mpeg', byteLength: 4, vetted: true,
    });
    expect(artifact.artifactId).toMatch(/^adventure-storybook-audio-/);
  });

  it('serializes canonically and independently of object insertion order', () => {
    const first = Contract.buildAdventureStorybookArtifact(adventureInput());
    const reordered = adventureInput();
    reordered.scenes = reordered.scenes.slice().reverse();
    reordered.scenes[0] = {
      segments: reordered.scenes[0].segments,
      title: reordered.scenes[0].title,
      order: reordered.scenes[0].order,
      sceneId: reordered.scenes[0].sceneId,
    };
    const second = Contract.buildAdventureStorybookArtifact(reordered);
    expect(Contract.serializeReadAloudArtifact(first)).toBe(Contract.serializeReadAloudArtifact(second));
    expect(Contract.canonicalStringify({ z: 1, a: { y: 2, b: 3 } }))
      .toBe('{"a":{"b":3,"y":2},"z":1}');
    expect(Contract.VETTING_METHODS).toContain('owner-approved');
  });

  it('requires explicit stable scene and segment ids', () => {
    const input = adventureInput();
    delete input.scenes[0].segments[0].segmentId;
    expect(() => Contract.buildAdventureStorybookArtifact(input)).toThrowError(
      expect.objectContaining({ code: 'invalid-adventure-artifact' })
    );
    try { Contract.buildAdventureStorybookArtifact(input); } catch (error) {
      expect(error.errors.map((entry) => entry.code)).toContain('missing-stable-id');
    }
  });
});

describe('ReadAloudArtifactContract private Persona contract', () => {
  it('creates message/chunk persistence with immutable private routing flags', () => {
    const artifact = Contract.buildPrivatePersonaSessionArtifact(personaInput());
    expect(artifact.privacy).toEqual({
      policyVersion: '1.0',
      classification: 'private-session',
      private: true,
      shareable: false,
      localOnly: true,
      includeInResourceExports: false,
      includeInMailbox: false,
      containsConversation: true,
      ownerExportAllowed: true,
    });
    expect(artifact.session.messages[0]).toMatchObject({
      messageId: 'message-learner-1', role: 'learner',
      chunks: [{ chunkId: 'message-learner-1:chunk-1', text: 'What is an algorithm?' }],
    });
    expect(artifact.session.messages[1].role).toBe('persona');
    expect(artifact.transcript).toMatchObject({ messageCount: 2, chunkCount: 2 });
    expect(artifact.transcript.text).toBe('learner: What is an algorithm?\nAda: It is a sequence of operations.');
  });

  it('fails closed if a serialized Persona artifact is made shareable', () => {
    const artifact = Contract.buildPrivatePersonaSessionArtifact(personaInput());
    artifact.privacy.shareable = true;
    const result = Contract.validateReadAloudArtifact(artifact);
    expect(result.ok).toBe(false);
    expect(result.errors.map((entry) => entry.code)).toContain('persona-artifact-must-remain-private');
    expect(() => Contract.serializeReadAloudArtifact(artifact)).toThrowError(
      expect.objectContaining({ code: 'invalid-read-aloud-artifact' })
    );
  });

  it('does not persist system prompts as Persona session messages', () => {
    const input = personaInput();
    input.messages[0].role = 'system';
    expect(() => Contract.buildPrivatePersonaSessionArtifact(input)).toThrowError(
      expect.objectContaining({ code: 'invalid-persona-artifact' })
    );
    try { Contract.buildPrivatePersonaSessionArtifact(input); } catch (error) {
      expect(error.errors.map((entry) => entry.code)).toContain('system-message-not-persistable');
    }
  });
});

describe('ReadAloudArtifactContract validation and transport safety', () => {
  it.each([
    ['data URL', { ...vettedAudio(), base64: 'data:audio/mpeg;base64,' + b64('surprise') }, 'data-url-not-allowed'],
    ['malformed base64', { ...vettedAudio(), base64: '***' }, 'invalid-base64'],
    ['unvetted clip', { ...vettedAudio(), vetted: false }, 'audio-not-vetted'],
    ['unsupported MIME', { ...vettedAudio(), mime: 'text/html' }, 'unsupported-audio-mime'],
  ])('rejects %s audio', (_label, audio, expectedCode) => {
    const input = adventureInput();
    input.scenes[0].segments[0].audio = audio;
    try {
      Contract.buildAdventureStorybookArtifact(input);
      throw new Error('expected artifact rejection');
    } catch (error) {
      expect(error.errors.map((entry) => entry.code)).toContain(expectedCode);
    }
  });

  it('enforces per-clip, total-audio, and whole-artifact limits before persistence', () => {
    const input = adventureInput();
    expect(() => Contract.buildAdventureStorybookArtifact(input, { maxClipBytes: 2 }))
      .toThrowError(expect.objectContaining({ code: 'invalid-adventure-artifact' }));
    expect(() => Contract.buildAdventureStorybookArtifact(input, { maxTotalAudioBytes: 3 }))
      .toThrowError(expect.objectContaining({ code: 'invalid-adventure-artifact' }));
    expect(() => Contract.buildAdventureStorybookArtifact(input, { maxArtifactBytes: 200 }))
      .toThrowError(expect.objectContaining({ code: 'invalid-adventure-artifact' }));
  });

  it('round-trips canonical JSON and rejects unknown fields and transcript tampering', () => {
    const artifact = Contract.buildPrivatePersonaSessionArtifact(personaInput());
    const serialized = Contract.serializeReadAloudArtifact(artifact);
    expect(Contract.parseReadAloudArtifact(serialized)).toEqual(artifact);

    const unknown = structuredClone(artifact);
    unknown.session.messages[0].secretUrl = 'data:audio/mpeg;base64,AAAA';
    expect(Contract.validateReadAloudArtifact(unknown).errors.map((entry) => entry.code))
      .toContain('unknown-field');

    const tampered = structuredClone(artifact);
    tampered.transcript.text = 'Altered transcript';
    expect(Contract.validateReadAloudArtifact(tampered).errors.map((entry) => entry.code))
      .toContain('transcript-mismatch');
  });

  it('has no persistence, clock, randomness, or network side effects', () => {
    const source = read('read_aloud_artifact_contract_source.jsx');
    expect(source).not.toMatch(/\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b|\bfetch\s*\(|\bXMLHttpRequest\b/);
    expect(source).not.toMatch(/\bDate\s*\(|\bDate\.now\b|\bMath\.random\b/);
  });

  it('keeps generated and deployed modules byte-identical', () => {
    const built = read('read_aloud_artifact_contract_module.js');
    const deployed = read('desktop/web-app/public/read_aloud_artifact_contract_module.js');
    expect(deployed).toBe(built);
    expect(built).toContain('ReadAloudArtifactContractModule');
    expect(createHash('sha256').update(built).digest('hex')).toHaveLength(64);
  });
});
