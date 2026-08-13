import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync('AlloFlowANTI.txt', 'utf8');

describe('main-app Voice Access host integration', () => {
  it('uses the singleton coordinator for honest onboarding status', () => {
    expect(source).toContain("voice.subscribeToVoiceSessionStatus");
    expect(source).toContain("status.owner === 'agent-command' && status.state === 'listening'");
    expect(source).toContain('enableVoiceAccess: enableGlobalVoiceAccess');
    expect(source).toContain('voiceAccessActive: alloVoiceAccessListening');
    expect(source).toContain('onStartVoiceAccess={enableGlobalVoiceAccess}');
  });

  it('preserves protected-role validation and exposes semantic navigation', () => {
    const roleBlock = source.slice(source.indexOf('const chooseOnboardingRole'), source.indexOf('const describeCurrentScreen'));
    expect(roleBlock).toContain("['teacher', 'parent', 'independent'].includes(choice)");
    expect(roleBlock.indexOf('setIsGateOpen(true)')).toBeLessThan(roleBlock.indexOf('executeRoleSelect(choice)'));
    expect(source).toContain("onboardingStage: !hasSelectedMode ? 'path' : (!hasSelectedRole ? 'role' : null)");
    const semanticBlock = source.slice(source.indexOf('// @section VOICE_SEMANTIC_HOST'), source.indexOf('const ctx = {', source.indexOf('// @section VOICE_SEMANTIC_HOST')));
    expect(semanticBlock).toContain('describeCurrentScreen');
    expect(semanticBlock).toContain('listCurrentActions');
    expect(semanticBlock).toContain('closeCurrentSurface');
    expect(semanticBlock).not.toMatch(/\.click\s*\(/);
  });

  it('passes configured speech preferences to command replies', () => {
    expect(source).toMatch(/voiceAvailable:[\s\S]{0,300}selectedVoice,[\s\S]{0,120}voiceSpeed,[\s\S]{0,120}voiceVolume,/);
  });
});
