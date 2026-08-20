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
    expect(palace.groups).toEqual([{ id: 'whole-class', title: 'Whole class' }]);
    expect(palace.rooms).toHaveLength(8);
    expect(palace.loci).toHaveLength(48);
    expect(palace.loci[0].roomId).toBe('r0');
  });

  it('keeps group palaces separate and auto-balances participant roles', () => {
    const { helpers } = loadPlugin();
    const raw = {
      status: 'open',
      title: 'Cell Systems',
      groups: [{ id: 'g1', title: 'Mito Team' }, { id: 'g2', title: 'Nucleus Team' }],
      rooms: [
        { id: 'g1-r1', groupId: 'g1', title: 'Power Station' },
        { id: 'g2-r1', groupId: 'g2', title: 'Archive' }
      ],
      loci: [
        { id: 'l1', roomId: 'g1-r1', label: 'Turbine', mnemonic: 'ATP stores usable energy.' },
        { id: 'l2', roomId: 'g2-r1', label: 'Blueprint', mnemonic: 'DNA stores instructions.' }
      ],
      participants: {}
    };
    for (let i = 1; i <= 4; i += 1) {
      const assignment = helpers.assignParticipant(raw, `student-${i}`, `Student ${i}`);
      raw.participants[assignment.participantId] = assignment;
    }
    const normalized = helpers.normalize(raw);
    expect(Object.values(normalized.participants).filter(item => item.groupId === 'g1')).toHaveLength(2);
    expect(Object.values(normalized.participants).filter(item => item.groupId === 'g2')).toHaveLength(2);
    expect(Object.values(normalized.participants).map(item => item.role)).toEqual(['architect', 'architect', 'anchor', 'anchor']);
    expect(helpers.buildData(raw, 'g1').branches.map(room => room.title)).toEqual(['Power Station']);
    expect(helpers.buildData(raw, 'g2').branches.map(room => room.title)).toEqual(['Archive']);
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
      roomId: 'r1', groupId: 'g1', participantId: 'student-1', label: 'Red kettle', mnemonic: 'Heat drives evaporation', role: 'architect', nickname: 'Bright Owl', status: 'returned', feedback: 'Make the heat connection more vivid.'
    })).toMatchObject({
      roomId: 'r1', groupId: 'g1', participantId: 'student-1', label: 'Red kettle', mnemonic: 'Heat drives evaporation', role: 'architect', contributorNickname: 'Bright Owl', status: 'returned', feedback: 'Make the heat connection more vivid.'
    });
    expect(helpers.getRoles().map(role => role.id)).toEqual(['architect', 'anchor', 'connector', 'reviewer']);
  });

  it('bounds session history while preserving actionable submissions and class capacity', () => {
    const { helpers } = loadPlugin();
    const submissions = {};
    for (let i = 0; i < 180; i += 1) {
      submissions[`approved-${i}`] = {
        id: `approved-${i}`, roomId: 'r1', groupId: 'g1', participantId: `student-${i}`,
        label: `Approved ${i}`, mnemonic: `Memory ${i}`, status: 'approved', approvedAt: `2026-08-20T10:${String(i % 60).padStart(2, '0')}:00.000Z`
      };
    }
    for (let i = 0; i < 4; i += 1) {
      submissions[`pending-${i}`] = {
        id: `pending-${i}`, roomId: 'r1', groupId: 'g1', participantId: `pending-student-${i}`,
        label: `Pending ${i}`, mnemonic: `Needs review ${i}`, status: 'pending'
      };
    }
    const normalized = helpers.normalize({
      groups: [{ id: 'g1', title: 'Group 1' }], rooms: [{ id: 'r1', groupId: 'g1', title: 'Entrance' }], submissions
    });
    expect(Object.keys(normalized.submissions)).toHaveLength(helpers.getLimits().submissions);
    expect(Object.values(normalized.submissions).filter(item => item.status === 'pending')).toHaveLength(4);

    const fullParticipants = Object.fromEntries(Array.from({ length: helpers.getLimits().participants }, (_, i) => [
      `student-${i}`, { participantId: `student-${i}`, nickname: `Student ${i}`, groupId: 'g1', role: 'anchor' }
    ]));
    expect(helpers.assignParticipant({
      groups: [{ id: 'g1', title: 'Group 1' }], rooms: [{ id: 'r1', groupId: 'g1', title: 'Entrance' }], participants: fullParticipants
    }, 'student-over-capacity', 'Late Student')).toBeNull();
    expect(helpers.getLimits().pendingPerParticipant).toBe(3);
  });

  it('pins teacher setup, moderated contributions, 3D reuse, and remote close wiring', () => {
    const plugin = fs.readFileSync(pluginPath, 'utf8');
    const haven = fs.readFileSync(havenPath, 'utf8');
    expect(plugin).toContain("registerMode('class-memory-palace'");
    expect(plugin).toContain("id: 'cmp-title'");
    expect(plugin).toContain("id: 'cmp-topic'");
    expect(plugin).toContain("id: 'cmp-rooms'");
    expect(plugin).toContain("id: 'cmp-groups'");
    expect(plugin).toContain("id: 'cmp-teacher-group'");
    expect(plugin).toContain('createPalaceParticipantAssignment');
    expect(plugin).toContain('Return with feedback');
    expect(plugin).toContain('Revise and resubmit');
    expect(plugin).toContain("'Your contribution status'");
    expect(plugin).toContain('CMP_MAX_PENDING_PER_PARTICIPANT');
    expect(plugin).toContain('CMP_MAX_SUBMISSIONS');
    expect(plugin).toContain('That contribution is already awaiting teacher review.');
    expect(plugin).toContain('Waiting for teacher review');
    expect(plugin).toContain('disabled: contributionDisabled');
    expect(plugin).toContain('updateParticipant(key, { groupId: e.target.value })');
    expect(plugin).toContain('fields.submissions[submissionKey] = sub');
    expect(plugin).toContain("'Contribution approved into the palace.'");
    expect(plugin).toContain("write({ status: 'closed'");
    expect(plugin).toContain("ctx.onEndSession('closed')");
    expect(plugin).toContain('ctx.openMemoryPalaceWalk(buildClassPalaceData(palace, activeGroupId)');
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
