import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadAlloModule } from './setup.js';

// Saved-sessions archive (2026-08-23): the persona_artifacts device-storage
// namespace was WRITE-ONLY - artifacts could be saved but never listed,
// reopened, or deleted inside the app. The archive adds list/load/delete in
// the artifact module (every stored record re-validated through the contract)
// and a "Saved sessions" sub-dialog in the persona chat view.

const root = process.cwd();
const viewSource = fs.readFileSync(path.join(root, 'view_persona_chat_source.jsx'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'AlloFlowANTI.txt'), 'utf8');

let Runtime;
beforeAll(() => {
  loadAlloModule('read_aloud_artifact_contract_module.js');
  loadAlloModule('persona_session_artifact_module.js');
  Runtime = window.AlloModules.PersonaSessionArtifact;
});

function fakeStorage(seed) {
  const buckets = new Map(Object.entries(seed || {}));
  return {
    buckets,
    get: (ns, key) => Promise.resolve(buckets.get(`${ns}/${key}`) ?? null),
    set: (ns, key, value) => { buckets.set(`${ns}/${key}`, value); return Promise.resolve({ queued: false }); },
    remove: (ns, key) => { buckets.delete(`${ns}/${key}`); return Promise.resolve(true); },
    list: (ns) => Promise.resolve([...buckets.keys()]
      .filter((k) => k.startsWith(`${ns}/`))
      .map((k) => k.slice(ns.length + 1))),
  };
}

const sessionInput = (sessionId, extraState) => ({
  sessionId,
  resourceId: 'resource-archive',
  language: 'English',
  selectedVoice: 'Kore',
  personaState: {
    mode: 'single',
    selectedCharacter: { id: 'ada-lovelace', name: 'Ada Lovelace' },
    chatHistory: [
      { role: 'user', text: 'What is an algorithm?' },
      { role: 'model', text: 'It is a sequence of operations.' },
    ],
    ...extraState,
  },
});

async function persistOne(storage, sessionId, extraState) {
  const { artifact } = await Runtime.buildPrivateSessionArtifact(sessionInput(sessionId, extraState));
  await Runtime.persistPrivateSessionArtifact(artifact, { deviceStorage: storage });
  return artifact;
}

describe('archive listing (behavioral)', () => {
  it('lists persisted sessions with counts, size, and the question-craft tally', async () => {
    const storage = fakeStorage();
    await persistOne(storage, 'session-a', { questionCraft: { good: 2, neutral: 0, poor: 1, coached: 0, freeform: 0 } });
    await persistOne(storage, 'session-b');
    const { sessions, unreadable } = await Runtime.listPrivateSessionArtifacts({ deviceStorage: storage });
    expect(unreadable).toEqual([]);
    expect(sessions).toHaveLength(2);
    for (const row of sessions) {
      expect(row.title).toBe('Private conversation with Ada Lovelace');
      expect(row.messageCount).toBe(2);
      expect(row.audioClips).toBe(0);
      expect(row.bytes).toBeGreaterThan(100);
      expect(typeof row.key).toBe('string');
    }
    const tallies = sessions.map((row) => row.questionCraft).filter(Boolean);
    expect(tallies).toEqual([{ good: 2, neutral: 0, poor: 1, coached: 0, freeform: 0 }]);
  });

  it('quarantines corrupted or foreign records instead of failing the whole list', async () => {
    const storage = fakeStorage();
    await persistOne(storage, 'session-good');
    storage.buckets.set('persona_artifacts/broken', '{not json');
    storage.buckets.set('persona_artifacts/foreign', JSON.stringify({ hello: 'world' }));
    const { sessions, unreadable } = await Runtime.listPrivateSessionArtifacts({ deviceStorage: storage });
    expect(sessions).toHaveLength(1);
    expect(unreadable.map((entry) => entry.key).sort()).toEqual(['broken', 'foreign']);
    for (const entry of unreadable) expect(typeof entry.code).toBe('string');
  });

  it('requires an injected device-storage adapter', async () => {
    await expect(Runtime.listPrivateSessionArtifacts({})).rejects.toMatchObject({ code: 'device-storage-required' });
  });
});

describe('archive load and delete (behavioral)', () => {
  it('loads a stored artifact back through full contract + privacy validation', async () => {
    const storage = fakeStorage();
    const saved = await persistOne(storage, 'session-load');
    const loaded = await Runtime.loadPrivateSessionArtifact(saved.artifactId, { deviceStorage: storage });
    expect(loaded.artifactId).toBe(saved.artifactId);
    expect(loaded.session.messages).toHaveLength(2);
    expect(loaded.privacy.private).toBe(true);
    expect(loaded.privacy.shareable).toBe(false);
  });

  it('fails closed on a missing id', async () => {
    const storage = fakeStorage();
    await expect(Runtime.loadPrivateSessionArtifact('nope', { deviceStorage: storage }))
      .rejects.toMatchObject({ code: 'artifact-not-found' });
    await expect(Runtime.loadPrivateSessionArtifact('', { deviceStorage: storage }))
      .rejects.toMatchObject({ code: 'artifact-not-found' });
  });

  it('deletes exactly the named record', async () => {
    const storage = fakeStorage();
    const first = await persistOne(storage, 'session-keep');
    const second = await persistOne(storage, 'session-drop');
    await Runtime.deletePrivateSessionArtifact(second.artifactId, { deviceStorage: storage });
    const { sessions } = await Runtime.listPrivateSessionArtifacts({ deviceStorage: storage });
    expect(sessions.map((row) => row.artifactId)).toEqual([first.artifactId]);
  });
});

describe('archive UI wiring (source pins)', () => {
  it('the monolith exposes list/download/delete handlers and passes them to the view', () => {
    expect(appSource).toContain('const handleListPersonaSessionArchive = async () => {');
    expect(appSource).toContain('const handleDownloadPersonaSessionArchive = async (key, format) => {');
    expect(appSource).toContain('const handleDeletePersonaSessionArchive = async (key) => {');
    expect(appSource).toContain('handleListPersonaSessionArchive, handleDownloadPersonaSessionArchive, handleDeletePersonaSessionArchive,');
  });

  it('the archive sub-dialog joins the modal focus/Escape system', () => {
    expect(viewSource).toContain('data-persona-archive-dialog');
    expect(viewSource).toContain("'[data-persona-definition-dialog], [data-persona-reflection-dialog], [data-persona-summary-dialog], [data-persona-archive-dialog]'");
    expect(viewSource).toContain("var scope = dialog.querySelector('[data-persona-archive-dialog]')");
  });

  it('deletion is a two-tap arm, never a one-tap destroy or a window.confirm', () => {
    expect(viewSource).toContain('if (personaArchiveConfirmKey !== row.key) {');
    expect(viewSource).toContain("rowArmed ? t('persona.archive_delete_confirm') : t('persona.archive_delete')");
    expect(viewSource).not.toContain('window.confirm(');
  });

  it('overlays are viewport-fixed and the single-mode toolbar wraps (2026-08-23 visual QA)', () => {
    // absolute inset-0 clipped to the chat column: on a 390px phone the
    // archive/summary dialogs rendered half off-screen. fixed positions
    // against the modal root (its backdrop-filter is the containing block).
    expect((viewSource.match(/className="fixed inset-0 z-\[80\]/g) || []).length).toBe(2);
    expect(viewSource).not.toContain('className="absolute inset-0 z-[80]');
    // The header toolbar overflowed the modal edge before it learned to wrap.
    expect(viewSource).toContain('className="flex flex-wrap items-center justify-end gap-2 min-w-0"');
  });

  it('archive rows surface language and the question-craft tally when present', () => {
    expect(viewSource).toContain("{row.language ? ', ' + row.language : ''}");
    expect(viewSource).toContain('rowCraftTotal > 0 && (');
    expect(viewSource).toContain("t('persona.archive_craft'");
  });

  it('a stale listing response can never overwrite a newer one', () => {
    expect(viewSource).toContain('var seq = ++_archiveRequestSeqRef.current;');
    expect((viewSource.match(/_archiveRequestSeqRef\.current !== seq/g) || []).length).toBe(2);
  });

  it('archive strings ride t() keys present in master and mirror', () => {
    for (const file of ['ui_strings.js', path.join('desktop', 'web-app', 'public', 'ui_strings.js')]) {
      const strings = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
      expect(strings.persona.archive_button).toBe('Saved sessions');
      expect(strings.persona.archive_delete_confirm).toBe('Tap again to delete');
      expect(strings.persona.archive_meta).toContain('{messages}');
    }
  });
});
