import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(ROOT, 'AlloFlowANTI.txt'), 'utf8');
// The Live Dock (where Call a vote lives) was extracted from ANTI into its own CDN view module.
const liveDock = fs.readFileSync(path.join(ROOT, 'view_live_session_dock_source.jsx'), 'utf8');
const shellCopies = [
  source,
  fs.readFileSync(path.join(ROOT, 'desktop', 'web-app', 'src', 'AlloFlowANTI.txt'), 'utf8'),
  fs.readFileSync(path.join(ROOT, 'desktop', 'web-app', 'src', 'App.jsx'), 'utf8'),
];

function loadPayloadBuilder() {
  const start = source.indexOf('function _alloSanitizeLiveAdventureValue');
  const end = source.indexOf('// Privacy-by-design, FERPA-aligned', start);
  if (start < 0 || end < 0) throw new Error('Live Adventure payload helper markers are missing');
  // eslint-disable-next-line no-new-func
  return new Function(source.slice(start, end) + '\nreturn _alloBuildLiveAdventurePayload;')();
}

describe('live Adventure presentation payload', () => {
  it('is revisioned, JSON-safe, and strips inline media from the session document', () => {
    const build = loadPayloadBuilder();
    const original = {
      currentScene: {
        text: 'The class reaches the bridge.',
        options: [
          { action: 'Cross it', audio: 'data:audio/mp3;base64,AAAA' },
          { action: 'Find another route', imageUrl: 'data:image/png;base64,BBBB' },
        ],
      },
      sceneImage: 'https://cdn.example/scene.webp',
      inventory: [{ id: 1, name: 'Map', image: 'data:image/png;base64,CCCC' }],
      level: 2,
      xp: 40,
      xpToNextLevel: 100,
      energy: 85,
      gold: 3,
      turnCount: 4,
    };
    const payload = build(original, { inputMode: 'choice' }, 12345, 12340);

    expect(payload).toMatchObject({
      currentResourceId: 'adventure-sync',
      activeAdventureRevision: 12345,
      activeAdventureUpdatedAt: 12340,
      activeAdventureState: { revision: 12345, turnCount: 4 },
    });
    expect(JSON.stringify(payload)).not.toContain('data:audio');
    expect(JSON.stringify(payload)).not.toContain('data:image');
    expect(payload.activeAdventureScene.options.map(option => option.action)).toEqual(['Cross it', 'Find another route']);
    expect(original.currentScene.options[0].audio).toContain('data:audio');
  });
});

describe('live Adventure delivery wiring', () => {
  it('serializes teacher broadcasts and makes students reject stale revisions', () => {
    shellCopies.forEach(copy => {
      expect(copy).toContain('liveAdventureBroadcastQueueRef.current = liveAdventureBroadcastQueueRef.current');
      expect(copy).toContain("_alloSessionSyncTrace('sync:adventure-state-ok'");
      expect(copy).toContain('incomingRevision > priorAdventureSync.revision');
      expect(copy).toContain('if (!revisionIsFresh) return prev;');
    });
  });

  it('offers a universal Call a vote action with current Adventure outcomes', () => {
    [liveDock].forEach(copy => {
      expect(copy).toContain("t('live_dock.call_vote') || 'Vote on outcomes'");
      expect(copy).toContain("type: 'mcq'");
      expect(copy).toContain("options: adventureVoteOptions.length >= 2 ? adventureVoteOptions.join('\\n') : 'Option A\\nOption B'");
    });
  });
});
