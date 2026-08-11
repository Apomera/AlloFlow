import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const helperStart = source.indexOf(`const ALLO_AAC_BOARD_FORMAT = 'alloflow.aac-board';`);
const helperEnd = source.indexOf('const LiveAacBoardDialog =', helperStart);

if (helperStart < 0 || helperEnd < 0) {
  throw new Error('Live AAC pure helper block was not found in AlloFlowANTI.txt');
}

const helperSource = source.slice(helperStart, helperEnd);
const decodeBase64 = globalThis.atob || ((value) => Buffer.from(value, 'base64').toString('binary'));
const {
  normalizePortable,
  buildLive,
  readLive,
  buildLocal,
} = new Function(
  'atob',
  `${helperSource}\nreturn {
    normalizePortable: _alloNormalizePortableAacBoardPackage,
    buildLive: _alloBuildLiveAacPayload,
    readLive: _alloReadLiveAacPayload,
    buildLocal: _alloBuildLocalAacPayload
  };`,
)(decodeBase64);

const serializerStart = source.indexOf('const _alloSerializeResourceForStudentPack = (item) => {');
const serializerEnd = source.indexOf('const describeSavedFollowUpLiveFailure =', serializerStart);
if (serializerStart < 0 || serializerEnd < 0) {
  throw new Error('AAC student-pack serializer was not found in AlloFlowANTI.txt');
}
const serializerSource = source.slice(serializerStart, serializerEnd);
const stripUndefined = (value) => {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, nested]) => nested !== undefined)
      .map(([key, nested]) => [key, stripUndefined(nested)]),
  );
};
const serializeStudentResource = new Function(
  'atob',
  'stripUndefined',
  'sanitizeHistoryForCloud',
  helperSource + '\n' + serializerSource + '\nreturn _alloSerializeResourceForStudentPack;',
)(
  decodeBase64,
  stripUndefined,
  () => {
    throw new Error('AAC resources must return before the generic cloud sanitizer');
  },
);

const safePng = 'data:image/png;base64,' + 'A'.repeat(96);
const packOnlyPng = 'data:image/png;base64,' + 'D'.repeat(180 * 1024);
const overLivePng = 'data:image/png;base64,' + 'E'.repeat(300 * 1024);
const safeSvg = 'data:image/svg+xml;base64,' + Buffer.from('<svg><path/></svg>').toString('base64');
const maliciousSvg = 'data:image/svg+xml;base64,' + Buffer.from('<svg><script>alert(1)</script></svg>').toString('base64');
const preparedAudio = 'data:audio/webm;base64,' + 'B'.repeat(128);
const customAudio = 'data:audio/ogg;base64,' + 'C'.repeat(128);

const makePortablePackage = () => ({
  format: 'alloflow.aac-board',
  version: 1,
  exportedAt: '2026-08-09T12:00:00.000Z',
  board: {
    id: 'board-1',
    title: 'Communication board',
    locale: 'ar-EG',
    direction: 'rtl',
    profileId: 'private-board-profile',
  },
  pages: [
    {
      id: 'page-1',
      title: 'Core words',
      cols: 2,
      privatePageState: { studentId: 'student-42' },
      cells: [
        {
          id: 'prepared-cell',
          index: 0,
          row: 0,
          col: 0,
          displayLabel: 'Hello',
          vocalLabel: 'Hello',
          originalLabel: 'Hello',
          description: 'A greeting',
          category: 'social',
          image: safePng,
          analytics: { selections: 20 },
          rawCustomRecording: customAudio,
          audio: {
            kind: 'prepared',
            mime: 'audio/webm',
            data: preparedAudio,
            profileId: 'private-audio-profile',
            profile: {
              voice: 'Teacher voice',
              language: 'ar-EG',
              provider: 'local',
              engine: 'browser',
              model: 'prepared-v1',
              synthesisRate: 1.25,
              voiceResolverVersion: '1',
              studentId: 'student-42',
              token: 'secret',
            },
            unknownAudioField: 'remove me',
          },
          unknownCellField: 'remove me',
        },
        {
          id: 'custom-cell',
          index: 1,
          row: 0,
          col: 1,
          displayLabel: 'Help',
          vocalLabel: 'Help me',
          originalLabel: 'Help',
          description: 'Request help',
          category: 'needs',
          image: safeSvg,
          audio: {
            kind: 'custom',
            mime: 'audio/ogg',
            data: customAudio,
            profile: { voice: 'Student voice', studentId: 'student-42' },
          },
        },
      ],
    },
    {
      id: 'page-2',
      title: 'More words',
      cols: 1,
      cells: [{
        id: 'more-cell',
        index: 0,
        row: 0,
        col: 0,
        displayLabel: 'More',
        vocalLabel: 'I want more',
        originalLabel: 'More',
        description: '',
        category: 'needs',
        image: null,
      }],
    },
  ],
  metadata: {
    privacy: {
      customAudioIncluded: true,
      preparedAudioIncluded: true,
      studentId: 'student-42',
    },
    omittedNonportableImages: 0,
    omittedCustomAudio: 0,
    omittedPreparedAudio: 0,
    warnings: ['Portable package'],
    analytics: { usage: 99 },
  },
  logs: [{ studentId: 'student-42', selection: 'Hello' }],
  unknownRootField: 'remove me',
});

describe('Symbol Studio live AAC portable helpers', () => {
  it('normalizes the exact package shape while preserving opted-in portable media only', () => {
    const normalized = normalizePortable(makePortablePackage(), { allowAudio: true });

    expect(normalized.board).toEqual({
      id: 'board-1',
      title: 'Communication board',
      locale: 'ar-EG',
      direction: 'rtl',
    });
    expect(normalized.pages).toHaveLength(2);
    expect(normalized.pages[0].cells[0].image).toBe(safePng);
    expect(normalized.pages[0].cells[1].image).toBe(safeSvg);
    expect(normalized.pages[0].cells[0].audio).toEqual({
      kind: 'prepared',
      mime: 'audio/webm',
      data: preparedAudio,
      profile: {
        voice: 'Teacher voice',
        language: 'ar-EG',
        provider: 'local',
        engine: 'browser',
        model: 'prepared-v1',
        voiceResolverVersion: '1',
        synthesisRate: 1.25,
      },
    });
    expect(normalized.pages[0].cells[1].audio).toMatchObject({
      kind: 'custom',
      mime: 'audio/ogg',
      data: customAudio,
      profile: { voice: 'Student voice' },
    });
    expect(Object.keys(normalized)).toEqual(['format', 'version', 'exportedAt', 'board', 'pages', 'metadata']);
    expect(Object.keys(normalized.pages[0])).toEqual(['id', 'title', 'cols', 'cells']);

    const json = JSON.stringify(normalized);
    expect(json).not.toContain('student-42');
    expect(json).not.toContain('private-board-profile');
    expect(json).not.toContain('private-audio-profile');
    expect(json).not.toContain('secret');
    expect(json).not.toContain('analytics');
    expect(json).not.toContain('logs');
    expect(json).not.toContain('rawCustomRecording');
    expect(json).not.toContain('remove me');
  });

  it('rejects unsafe media, gates audio on privacy flags, and enforces page and cell caps', () => {
    const privatePackage = makePortablePackage();
    privatePackage.metadata.privacy = {
      customAudioIncluded: false,
      preparedAudioIncluded: false,
    };
    privatePackage.pages[0].cells[0].image = maliciousSvg;
    privatePackage.pages[0].cells[1].image = 'data:image/png;base64,' + 'A'.repeat(128 * 1024);

    const privateNormalized = normalizePortable(privatePackage, { allowAudio: true });
    expect(privateNormalized.pages[0].cells[0].image).toBeNull();
    expect(privateNormalized.pages[0].cells[1].image).toBeNull();
    expect(privateNormalized.pages[0].cells[0].audio).toBeUndefined();
    expect(privateNormalized.pages[0].cells[1].audio).toBeUndefined();
    expect(privateNormalized.metadata.privacy).toEqual({
      customAudioIncluded: false,
      preparedAudioIncluded: false,
    });

    const cappedPackage = makePortablePackage();
    cappedPackage.pages = Array.from({ length: 16 }, (_, pageIndex) => ({
      id: `page-${pageIndex}`,
      title: `Page ${pageIndex}`,
      cols: 6,
      cells: Array.from({ length: 70 }, (_, cellIndex) => ({
        id: `cell-${pageIndex}-${cellIndex}`,
        index: cellIndex,
        row: Math.floor(cellIndex / 6),
        col: cellIndex % 6,
        displayLabel: `Word ${pageIndex}-${cellIndex}`,
        vocalLabel: `Word ${pageIndex}-${cellIndex}`,
        originalLabel: `Word ${pageIndex}-${cellIndex}`,
        description: '',
        category: 'other',
        image: null,
      })),
    }));

    const capped = normalizePortable(cappedPackage);
    expect(capped.pages.length).toBeLessThanOrEqual(12);
    expect(capped.pages.flatMap((page) => page.cells)).toHaveLength(256);
    expect(capped.pages.every((page) => page.cells.length <= 64)).toBe(true);
  });

  it('builds a privacy-minimized Teacher envelope with a fresh bounded identity', () => {
    const now = 1_800_000_000_000;
    const first = buildLive(makePortablePackage(), now);
    const second = buildLive(makePortablePackage(), now + 1);

    expect(first).toMatchObject({
      schema: 'alloflow.live-aac',
      version: 2,
      timestamp: now,
      expiresAt: now + 15 * 60 * 1000,
      sender: 'Teacher',
    });
    expect(first.payloadId).toMatch(/^aac-/);
    expect(second.payloadId).not.toBe(first.payloadId);
    expect(first.package.pages[0].cells[0].image).toBe(safePng);
    expect(first.package.pages[0].cells[0].audio).toBeUndefined();
    expect(first.package.pages[0].cells[1].audio).toBeUndefined();
    expect(first.package.metadata.privacy).toEqual({
      customAudioIncluded: false,
      preparedAudioIncluded: false,
    });
    expect(first).not.toHaveProperty('pushedBy');
  });

  it('reads current and legacy payloads while rejecting expired and implausible envelopes', () => {
    const now = 1_800_000_000_000;
    const current = buildLive(makePortablePackage(), now);

    expect(readLive(current, now + 1_000)).toEqual(current);
    expect(readLive(current, current.expiresAt + 1)).toBeNull();
    expect(readLive({ ...current, timestamp: now + 5 * 60 * 1000 + 1 }, now)).toBeNull();
    expect(readLive({ ...current, expiresAt: now + 60 * 60 * 1000 + 1 }, now)).toBeNull();

    const legacyBoard = readLive({
      type: 'board',
      title: 'Legacy board',
      timestamp: now,
      cols: 2,
      words: [
        { label: 'Yes', word: 'Yes', wordType: 'other', image: safePng },
        { label: 'No', word: 'No', wordType: 'other' },
      ],
    }, now + 100);
    expect(legacyBoard).toMatchObject({
      schema: 'alloflow.live-aac',
      version: 2,
      sender: 'Teacher',
      timestamp: now,
    });
    expect(legacyBoard.package.pages[0].cells.map((cell) => cell.displayLabel)).toEqual(['Yes', 'No']);
    expect(legacyBoard.package.pages[0].cells[0].image).toBe(safePng);

    const legacySchedule = readLive({
      type: 'schedule',
      title: 'Morning steps',
      timestamp: now,
      items: [{ label: 'Arrive' }, { label: 'Read' }],
    }, now + 100);
    expect(legacySchedule.package.pages[0].cols).toBe(1);
    expect(legacySchedule.package.pages[0].cells.map((cell) => cell.displayLabel)).toEqual(['Arrive', 'Read']);
    expect(readLive({
      type: 'schedule',
      title: 'Expired steps',
      timestamp: now - 16 * 60 * 1000,
      items: [{ label: 'Arrive' }],
    }, now)).toBeNull();
  });

  it('opens a local History package with opted-in audio and a one-day lifetime', () => {
    const now = 1_800_000_000_000;
    const portable = makePortablePackage();
    portable.pages[1].cells[0].image = packOnlyPng;
    const local = buildLocal(portable, 'resource-1', now);
    const live = buildLive(portable, now);

    expect(local).toMatchObject({
      schema: 'alloflow.live-aac',
      version: 2,
      timestamp: now,
      expiresAt: now + 24 * 60 * 60 * 1000,
      sender: 'Teacher',
      localOnly: true,
    });
    expect(local.payloadId).toMatch(/^history-resource-1-/);
    expect(local.package.pages).toHaveLength(2);
    expect(local.package.pages[0].cells[0].audio.data).toBe(preparedAudio);
    expect(local.package.pages[0].cells[1].audio.data).toBe(customAudio);
    expect(local.package.pages[1].cells[0].image).toBe(packOnlyPng);
    expect(live.package.pages[1].cells[0].image).toBe(packOnlyPng);

    portable.pages[1].cells[0].image = overLivePng;
    expect(buildLive(portable, now + 1).package.pages[1].cells[0].image).toBeNull();
  });
});

describe('Symbol Studio AAC QR and homework serialization', () => {
  const makeResource = (data = makePortablePackage()) => ({
    id: 'aac-board-1',
    type: 'aac-board',
    title: 'Communication board',
    data,
    meta: 'Portable AAC Board',
    timestamp: 1_800_000_000_000,
    source: 'symbol-studio',
    learnerId: 'student-42',
    profile: { id: 'private-profile' },
    logs: [{ learnerId: 'student-42' }],
    privateState: { token: 'secret' },
    unknownTopLevel: 'remove me',
  });

  it('keeps bounded images and consented prepared TTS through the strict portable whitelist', () => {
    const portable = makePortablePackage();
    portable.pages[1].cells[0].image = packOnlyPng;

    const packed = serializeStudentResource(makeResource(portable));

    expect(Object.keys(packed)).toEqual(['id', 'type', 'title', 'data', 'meta', 'timestamp', 'source']);
    expect(packed).toMatchObject({
      id: 'aac-board-1',
      type: 'aac-board',
      title: 'Communication board',
      meta: 'Portable AAC Board',
      timestamp: 1_800_000_000_000,
      source: 'symbol-studio',
    });
    expect(packed.data.pages[0].cells[0].image).toBe(safePng);
    expect(packed.data.pages[0].cells[0].audio).toEqual({
      kind: 'prepared',
      mime: 'audio/webm',
      data: preparedAudio,
    });
    expect(packed.data.pages[1].cells[0].image).toBe(packOnlyPng);
    expect(packed.data.pages[0].cells[1].audio).toBeUndefined();
    expect(packed.data.metadata.privacy).toEqual({
      customAudioIncluded: false,
      preparedAudioIncluded: true,
    });

    const json = JSON.stringify(packed);
    for (const privateValue of [
      'student-42',
      'private-profile',
      'private-board-profile',
      'private-audio-profile',
      'Student voice',
      'Teacher voice',
      'secret',
      'analytics',
      'logs',
      'rawCustomRecording',
      'unknownTopLevel',
      'remove me',
    ]) {
      expect(json).not.toContain(privateValue);
    }
  });

  it('strips prepared TTS when package consent is false and always strips custom recordings', () => {
    const portable = makePortablePackage();
    portable.metadata.privacy.preparedAudioIncluded = false;

    const packed = serializeStudentResource(makeResource(portable));

    expect(packed.data.pages[0].cells[0].audio).toBeUndefined();
    expect(packed.data.pages[0].cells[1].audio).toBeUndefined();
    expect(packed.data.metadata.privacy).toEqual({
      customAudioIncluded: false,
      preparedAudioIncluded: false,
    });
    expect(JSON.stringify(packed)).not.toContain(customAudio);
  });

  it('strips per-item and aggregate-overlimit AAC media without rejecting the board', () => {
    const portable = makePortablePackage();
    portable.pages[0].cells[0].image = 'data:image/png;base64,' + 'A'.repeat(2 * 1024 * 1024 + 4);
    portable.pages[0].cells[0].audio.data = 'data:audio/webm;base64,' + 'B'.repeat(1024 * 1024 + 4);

    const packed = serializeStudentResource(makeResource(portable));

    expect(packed).not.toBeNull();
    expect(packed.data.pages[0].cells[0].image).toBeNull();
    expect(packed.data.pages[0].cells[0].audio).toBeUndefined();
    expect(packed.data.metadata.privacy.preparedAudioIncluded).toBe(false);
    expect(packed.data.metadata.omittedNonportableImages).toBeGreaterThan(0);
    expect(packed.data.metadata.omittedPreparedAudio).toBeGreaterThan(0);
  });
});

describe('Symbol Studio live AAC source contracts', () => {
  it('routes the validated Teacher envelope through the audited session writer', () => {
    const allowlistStart = source.indexOf('const SESSION_TIER1_LEAVES = new Set([');
    const allowlistEnd = source.indexOf(']);', allowlistStart);
    const allowlist = source.slice(allowlistStart, allowlistEnd);
    expect(allowlist).toContain(`'visualSupportsPayload'`);

    const hostAt = source.indexOf('const liveAacPayload = _alloBuildLiveAacPayload(payload, Date.now())');
    expect(hostAt).toBeGreaterThan(0);
    const host = source.slice(hostAt - 500, hostAt + 1_200);
    expect(host).toContain(`activeSessionAppId || appId`);
    expect(host).toContain('writeToSession(sRef, { visualSupportsPayload: liveAacPayload })');
    expect(host).toContain('writeToSession(sRef, { visualSupportsPayload: null })');
    expect(host).not.toContain('updateDoc(');
    expect(host).not.toContain('user?.displayName');
  });

  it('rejects stale reappearance and resets freshness state across sessions', () => {
    const stateAt = source.indexOf('const [visualSupportsPayload, setVisualSupportsPayload] = useState(null)');
    const stateBlock = source.slice(stateAt, stateAt + 2_300);
    expect(stateBlock).toContain('visualSupportsPayloadRef');
    expect(stateBlock).toContain('visualSupportsDismissedIdsRef');
    expect(stateBlock).toContain('visualSupportsLastTimestampRef');
    expect(stateBlock).toContain('visualSupportsSessionRef');
    expect(stateBlock).toContain('visualSupportsDismissedIdsRef.current.add(current.payloadId)');
    expect(stateBlock).toContain('visualSupportsPayload.expiresAt');

    const sessionResetAt = source.indexOf(`const identity = String(activeSessionAppId || appId) + '|'`);
    const sessionReset = source.slice(sessionResetAt, sessionResetAt + 650);
    expect(sessionReset).toContain('visualSupportsDismissedIdsRef.current = new Set()');
    expect(sessionReset).toContain('visualSupportsLastTimestampRef.current = 0');
    expect(sessionReset).toContain('setVisualSupportsPayload(null)');

    const listenerAt = source.indexOf('const incomingAacPayload = _alloReadLiveAacPayload(data.visualSupportsPayload, Date.now())');
    const listener = source.slice(listenerAt, listenerAt + 1_050);
    expect(listener).toContain('visualSupportsDismissedIdsRef.current.has(incomingAacPayload.payloadId)');
    expect(listener).toContain('incomingAacPayload.timestamp >= visualSupportsLastTimestampRef.current');
    expect(listener).toContain('current.payloadId === incomingAacPayload.payloadId ? current : incomingAacPayload');
  });

  it('renders pages, symbols, sentence controls, keyboard input, scanning, and locale direction', () => {
    const dialogStart = source.indexOf('const LiveAacBoardDialog =');
    const dialogEnd = source.indexOf('const AlloFlowContent =', dialogStart);
    const dialog = source.slice(dialogStart, dialogEnd);

    for (const contract of [
      `role='dialog'`,
      `lang={locale}`,
      `dir={direction}`,
      `role='grid'`,
      `role='gridcell'`,
      `aria-label='Sentence strip'`,
      'Previous page',
      'Next page',
      'Speak sentence',
      'Undo',
      'Clear',
      'Start scanning',
      `event.key === 'Escape'`,
      `event.key === 'Backspace'`,
      `event.key === 'ArrowLeft'`,
      `event.key === 'ArrowRight'`,
      `event.key === 'Enter'`,
      'cell.image',
    ]) {
      expect(dialog, contract).toContain(contract);
    }
    expect(dialog).not.toMatch(/[\u2013\u2014]/);
    expect(source).toContain('visualSupportsPayload && (!isTeacherMode || visualSupportsPayload.localOnly)');
    expect(source).toContain('<LiveAacBoardDialog');
  });

  it('restores AAC History resources into the same runtime with the default title and icon', () => {
    const restoreStart = source.indexOf('const handleRestoreView = (item, options = {}) =>');
    const restore = source.slice(restoreStart, restoreStart + 1_350);
    expect(restore).toContain(`item.type === 'aac-board'`);
    expect(restore).toContain('_alloBuildLocalAacPayload(item.data, item.id, Date.now())');
    expect(restore).toContain('setVisualSupportsPayload(localAacPayload)');
    expect(restore).toContain('_alloFollowResourceLive(item)');
    expect(source).toContain(`case 'aac-board': return 'AAC Board';`);
    expect(source).toContain(`case 'aac-board': return <Layout size={16} />;`);
  });
});
