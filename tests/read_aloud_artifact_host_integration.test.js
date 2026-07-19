import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file) => readFileSync(resolve(process.cwd(), file), 'utf8');

describe('read-aloud artifact host integration', () => {
  it('loads the contract, shared audio preparer, and private Persona runtime in both hosts', () => {
    const root = read('AlloFlowANTI.txt');
    const deploy = read('prismflow-deploy/src/AlloFlowANTI.txt');
    expect(root).toContain("loadModule('ReadAloudArtifactContractModule', 'https://alloflow-cdn.pages.dev/read_aloud_artifact_contract_module.js?v=501639a2')");
    expect(root).toContain("loadModule('ReadAloudArtifactAudioModule', 'https://alloflow-cdn.pages.dev/read_aloud_artifact_audio_module.js?v=3a046659')");
    expect(root).toContain("loadModule('PersonaSessionArtifactModule', 'https://alloflow-cdn.pages.dev/persona_session_artifact_module.js?v=f1500f83')");
    expect(deploy).toContain("loadModule('ReadAloudArtifactContractModule', './read_aloud_artifact_contract_module.js')");
    expect(deploy).toContain("loadModule('ReadAloudArtifactAudioModule', './read_aloud_artifact_audio_module.js')");
    expect(deploy).toContain("loadModule('PersonaSessionArtifactModule', './persona_session_artifact_module.js')");
  });

  it('routes explicit artifact narration through the selected voice with Kore as the only host default', () => {
    const host = read('AlloFlowANTI.txt');
    const start = host.indexOf('const prepareReadAloudArtifactAudio = async');
    const end = host.indexOf('_exportLiveRef.current =', start);
    const helper = host.slice(start, end);
    expect(start).toBeGreaterThan(0);
    expect(helper).toContain("defaultVoice: options.defaultVoice || selectedVoice || 'Kore'");
    expect(helper).not.toMatch(/Puck/i);
    expect(host).toContain('handleSavePersonaChat: handleSavePrivatePersonaSession');
    expect(host).toContain("source: 'persona-owner-save'");
  });

  it('keeps private Persona artifacts outside student sharing and strips legacy inline transcripts', () => {
    const host = read('AlloFlowANTI.txt');
    ['persona-transcript', 'persona-reflection', 'persona-summary', 'persona-session', 'persona-session-read-aloud']
      .forEach((type) => expect(host).toContain("'" + type + "'"));

    for (const file of ['personas_source.jsx', 'personas_module.js', 'prismflow-deploy/public/personas_module.js']) {
      const source = read(file);
      expect(source).toContain('chatHistory: _chatHistory');
      expect(source).toContain('savedDialogue: _savedDialogue');
      expect(source).not.toMatch(/chatHistory:\s*(?:persistedChatHistory|finalHistory),\s*\r?\n\s*savedDialogue:\s*(?:persistedChatHistory|finalHistory),/);
    }
  });

  it('shows a visible pending indicator while a private Persona artifact is saving', () => {
    const source = read('view_persona_chat_source.jsx');
    expect(source).toContain('transcriptSavePending ? <RefreshCw size={16}');
    expect(source).toContain('Saving private session...');
    expect(source).toContain("aria-busy={transcriptSavePending ? 'true' : 'false'}");
  });

  it('registers all artifact modules for content-hash pinning', () => {
    const build = read('build.js');
    ['read_aloud_artifact_contract_module.js', 'read_aloud_artifact_audio_module.js', 'persona_session_artifact_module.js']
      .forEach((file) => expect(build).toContain("'" + file + "'"));
  });
});
