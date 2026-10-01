import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const haven = readFileSync('allohaven_module.js', 'utf8');
const modes = [
  ['arcade_mode_realm_builder.js', ['handleStartClassRealm', 'handleJoinClassRealm']],
  ['arcade_mode_boss_encounter.js', ['handleStartClassEncounter', 'handleJoinClassEncounter']],
  ['arcade_mode_concept_atlas.js', ['handleStartClassAtlas', 'handleJoinClassAtlas']],
  ['arcade_mode_modelun.js', ['handleStartClassSession', 'handleJoinClassSession']],
];

function functionBlock(source, name) {
  const start = source.indexOf(`function ${name}`);
  expect(start).toBeGreaterThanOrEqual(0);
  const next = source.indexOf('\n    function ', start + 12);
  return source.slice(start, next < 0 ? start + 1400 : next);
}

describe('hosted arcade classroom entitlement', () => {
  it('provides a no-purchase hosted launcher while keeping solo token charging', () => {
    const hosted = functionBlock(haven, 'launchHostedArcadeMode');
    const solo = functionBlock(haven, 'launchArcadeMode');
    expect(hosted).toContain('classroomHosted: true');
    expect(hosted).toContain('no token cost');
    expect(hosted).not.toContain('state.tokens <');
    expect(hosted).not.toContain('tokens: state.tokens -');
    expect(solo).toContain('state.tokens < tokensNeeded');
    expect(solo).toContain('tokens: state.tokens - tokensNeeded');
    expect(haven).toContain('onLaunchHosted: function(minutes)');
  });

  it.each(modes)('%s routes every hosted start/join through the free classroom path', (path, handlers) => {
    const source = readFileSync(path, 'utf8');
    for (const handler of handlers) {
      expect(functionBlock(source, handler)).toContain('(ctx.onLaunchHosted || ctx.onLaunch)(minutesAsked)');
    }
  });

  it('keeps representative solo launchers on the token-charged path', () => {
    const realm = readFileSync('arcade_mode_realm_builder.js', 'utf8');
    const atlas = readFileSync('arcade_mode_concept_atlas.js', 'utf8');
    const modelUn = readFileSync('arcade_mode_modelun.js', 'utf8');
    expect(functionBlock(realm, 'handleLaunch')).toContain('ctx.onLaunch(minutesAsked)');
    expect(functionBlock(atlas, 'handleLaunch')).toContain('ctx.onLaunch(minutesAsked)');
    expect(functionBlock(modelUn, 'handleSoloLaunch')).toContain('ctx.onLaunch(minutesAsked)');
  });

  it('keeps collaborative Memory Palace free for both teacher and student entry', () => {
    const realm = readFileSync('arcade_mode_realm_builder.js', 'utf8');
    expect(functionBlock(realm, 'launch')).toContain('(ctx.onLaunchHosted || ctx.onLaunch)(minutes)');
    expect(realm).toContain('shared 3D recall walk · no token cost.');
  });
});
