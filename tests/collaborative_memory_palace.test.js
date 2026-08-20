import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

const pluginPath = path.join(process.cwd(), 'arcade_mode_realm_builder.js');
const havenPath = path.join(process.cwd(), 'allohaven_module.js');

function loadPlugin() {
  const registry = {};
  global.window = {
    AlloHavenArcade: {
      registerMode(id, config) { registry[id] = config; },
      isRegistered(id) { return !!registry[id]; }
    }
  };
  new Function(fs.readFileSync(pluginPath, 'utf8'))();
  return { registry, helpers: window.AlloHavenArcade.classMemoryPalaceHelpers };
}

describe('AlloHaven collaborative Memory Palace', () => {
  beforeEach(() => {
    delete global.window;
  });

  it('registers a separate ready class activity without replacing Realm Builder', () => {
    const { registry } = loadPlugin();
    expect(registry['realm-builder']).toMatchObject({ ready: true });
    expect(registry['class-memory-palace']).toMatchObject({
      label: 'Class Memory Palace',
      ready: true,
      partnerRequired: true
    });
  });

  it('normalizes and bounds session-authored rooms and loci', () => {
    const { helpers } = loadPlugin();
    const palace = helpers.normalize({
      status: 'open',
      title: '  Cell   City  ',
      rooms: Array.from({ length: 20 }, (_, i) => ({ id: `r${i}`, title: `Room ${i}` })),
      loci: Array.from({ length: 120 }, (_, i) => ({
        id: `l${i}`,
        roomId: i === 0 ? 'missing' : `r${i % 12}`,
        label: `Anchor ${i}`,
        mnemonic: `Memory ${i}`
      }))
    });
    expect(palace.title).toBe('Cell City');
    expect(palace.rooms).toHaveLength(12);
    expect(palace.loci).toHaveLength(96);
    expect(palace.loci[0].roomId).toBe('r0');
  });

  it('turns the approved shared state into the existing MemoryPalace contract', () => {
    const { helpers } = loadPlugin();
    const data = helpers.buildData({
      status: 'open',
      title: 'Water Cycle Palace',
      rooms: [
        { id: 'cloud', title: 'Cloud Room' },
        { id: 'river', title: 'River Room' }
      ],
      loci: [
        { id: 'l1', roomId: 'cloud', label: 'Cold mirror', mnemonic: 'Condensation collects as droplets.', role: 'connector', contributorNickname: 'Clever Dolphin' },
        { id: 'l2', roomId: 'river', label: 'Moving belt', mnemonic: 'Runoff moves downhill.', contributorNickname: 'Kind Badger' }
      ]
    });
    expect(data).toMatchObject({ main: 'Water Cycle Palace', structureType: 'Memory Palace' });
    expect(data.branches.map(room => room.title)).toEqual(['Cloud Room', 'River Room']);
    expect(data.branches[0].items).toEqual(['Cold mirror']);
    expect(data.branches[0].mnemonics[0]).toContain('Connector · Clever Dolphin');
  });

  it('rejects incomplete contributions before they reach the shared queue', () => {
    const { helpers } = loadPlugin();
    expect(helpers.normalizeSubmission({ roomId: 'r1', label: 'Anchor only' })).toBeNull();
    expect(helpers.normalizeSubmission({
      roomId: 'r1', label: 'Red kettle', mnemonic: 'Heat drives evaporation', role: 'architect', nickname: 'Bright Owl'
    })).toMatchObject({
      roomId: 'r1', label: 'Red kettle', mnemonic: 'Heat drives evaporation', role: 'architect', contributorNickname: 'Bright Owl'
    });
    expect(helpers.getRoles().map(role => role.id)).toEqual(['architect', 'anchor', 'connector', 'reviewer']);
  });

  it('pins teacher setup, moderated contributions, 3D reuse, and remote close wiring', () => {
    const plugin = fs.readFileSync(pluginPath, 'utf8');
    const haven = fs.readFileSync(havenPath, 'utf8');
    expect(plugin).toContain("registerMode('class-memory-palace'");
    expect(plugin).toContain("id: 'cmp-title'");
    expect(plugin).toContain("id: 'cmp-topic'");
    expect(plugin).toContain("id: 'cmp-rooms'");
    expect(plugin).toContain('submissions[sub.id] = sub');
    expect(plugin).toContain("'Contribution approved into the palace.'");
    expect(plugin).toContain("write({ status: 'closed'");
    expect(plugin).toContain("ctx.onEndSession('closed')");
    expect(plugin).toContain('ctx.openMemoryPalaceWalk(buildClassPalaceData(palace)');
    expect(plugin).toContain("id: 'cmp-role'");
    expect(plugin).toContain('voice.initWebSpeechCapture({');
    expect(plugin).toContain("'aria-pressed': voiceMode === 'listening'");
    expect(plugin).toContain('stopVoiceContribution();');
    expect(haven).toContain('openMemoryPalaceWalk: function(data, options)');
    expect(haven).toContain('return openHavenWalk3D(null, {');
    expect(haven).toContain("modeId === 'class-memory-palace'");
    expect(haven).toContain("collaborativeMemoryPalace: { status: 'closed'");
  });
});
