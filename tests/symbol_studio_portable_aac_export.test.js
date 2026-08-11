import fs from 'node:fs';
import path from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync(path.join(process.cwd(), 'symbol_studio_module.js'), 'utf8');

function portableHelpers() {
  const start = source.indexOf('function portablePackImage(value)');
  const end = source.indexOf('function packAttributionForShare(attribution)', start);
  if (start < 0 || end < 0) throw new Error('Portable AAC helper section is missing');
  const helperSource = source.slice(start, end);
  const escapeHtml = (value) => String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/'/g, '&#39;').replace(/\u0022/g, '&quot;');
  return new Function(
    'window', 'escHtml', 'CAT_COLORS', 'CAT_BORDER',
    helperSource + '\nreturn { buildPortableAACPackage, buildStandaloneAACHTML, portableAACAudio };',
  )(
    window,
    escapeHtml,
    { noun: '#fef9c3', verb: '#dcfce7', adjective: '#dbeafe', other: '#f3f4f6' },
    { noun: '#ca8a04', verb: '#16a34a', adjective: '#1d4ed8', other: '#6b7280' },
  );
}

function boardFixture() {
  return {
    id: 'board-a',
    title: 'Requests',
    language: 'ar',
    profileId: 'private-student',
    speechAudioRef: { namespace: 'device-only', key: 'private-key' },
    communicationLog: [{ student: 'private' }],
    pages: [{
      id: 'page-a',
      title: 'Main',
      cols: 6,
      words: [
        {
          id: 'custom',
          label: 'Help',
          translatedLabel: 'مساعدة',
          vocalLabel: 'أحتاج إلى مساعدة',
          description: 'Ask for help',
          category: 'verb',
          image: 'data:image/png;base64,QQ==',
          audioData: 'data:audio/webm;base64,Q1VTVE9N',
        },
        {
          id: 'prepared',
          label: 'Drink',
          category: 'noun',
          image: 'https://example.test/not-offline.png',
        },
        { id: 'fallback', label: 'More', category: 'other' },
        {},
        { id: 'later', label: 'Later', category: 'other' },
      ],
    }, {
      id: 'page-empty',
      title: 'Empty page',
      cols: 2,
      words: [{}, {}],
    }],
  };
}

function preparedRecords() {
  return [{
    target: {
      scopeId: 'board:board-a:page:page-a',
      segmentId: 'cell:prepared',
      spokenText: 'Drink',
    },
    data: 'data:audio/mpeg;base64,UFJFUEFSRUQ=',
    mime: 'audio/mpeg',
    profile: {
      voice: 'Kore',
      language: 'ar',
      synthesisRate: 1,
      provider: 'gemini',
      apiKey: 'must-not-travel',
    },
  }];
}

describe('Symbol Studio portable AAC package', () => {
  it('preserves stable slots and strips private or nonportable resources by default', () => {
    const { buildPortableAACPackage } = portableHelpers();
    const result = buildPortableAACPackage(boardFixture(), {
      preparedAudioRecords: preparedRecords(),
      preparedAudioExpected: true,
      now: 0,
    });

    expect(result).toMatchObject({
      format: 'alloflow.aac-board',
      version: 1,
      exportedAt: '1970-01-01T00:00:00.000Z',
      board: { id: 'board-a', title: 'Requests', locale: 'ar', direction: 'rtl' },
    });
    expect(result.pages.map((page) => page.id)).toEqual(['page-a', 'page-empty']);
    expect(result.pages[0].cells).toHaveLength(5);
    expect(result.pages[0].cells.map((cell) => [cell.index, cell.row, cell.col])).toEqual([
      [0, 0, 0], [1, 0, 1], [2, 0, 2], [3, 0, 3], [4, 0, 4],
    ]);
    expect(result.pages[0].cells[0]).toMatchObject({
      displayLabel: 'مساعدة',
      vocalLabel: 'أحتاج إلى مساعدة',
      originalLabel: 'Help',
      image: 'data:image/png;base64,QQ==',
    });
    expect(result.pages[0].cells[1].image).toBeNull();
    expect(result.pages[0].cells.every((cell) => !Object.hasOwn(cell, 'audio'))).toBe(true);
    expect(result.metadata).toMatchObject({
      privacy: { customAudioIncluded: false, preparedAudioIncluded: false },
      omittedNonportableImages: 1,
      omittedCustomAudio: 1,
      omittedPreparedAudio: 1,
    });
    const serialized = JSON.stringify(result);
    for (const privateValue of ['private-student', 'private-key', 'communicationLog', 'audioData', 'apiKey']) {
      expect(serialized).not.toContain(privateValue);
    }
  });

  it('includes only explicitly consented portable audio with custom audio taking priority', () => {
    const { buildPortableAACPackage } = portableHelpers();
    const result = buildPortableAACPackage(boardFixture(), {
      includeCustomAudio: true,
      includePreparedAudio: true,
      preparedAudioRecords: preparedRecords(),
      now: 0,
    });
    expect(result.pages[0].cells[0].audio).toEqual({
      kind: 'custom',
      mime: 'audio/webm',
      data: 'data:audio/webm;base64,Q1VTVE9N',
    });
    expect(result.pages[0].cells[1].audio).toMatchObject({
      kind: 'prepared',
      mime: 'audio/mpeg',
      data: 'data:audio/mpeg;base64,UFJFUEFSRUQ=',
      profile: { voice: 'Kore', language: 'ar', provider: 'gemini' },
    });
    expect(result.pages[0].cells[1].audio.profile).not.toHaveProperty('apiKey');
    expect(result.metadata.privacy).toEqual({
      customAudioIncluded: true,
      preparedAudioIncluded: true,
    });

    const preparedOnly = buildPortableAACPackage(boardFixture(), {
      includeCustomAudio: false,
      includePreparedAudio: true,
      preparedAudioRecords: preparedRecords(),
      now: 0,
    });
    expect(preparedOnly.pages[0].cells[0]).not.toHaveProperty('audio');
    expect(preparedOnly.pages[0].cells[1].audio.kind).toBe('prepared');
    expect(preparedOnly.metadata.privacy).toEqual({
      customAudioIncluded: false,
      preparedAudioIncluded: true,
    });
  });
});

describe('Symbol Studio standalone AAC HTML', () => {
  it('is offline, preserves every slot, uses saved locale, and avoids certification claims', () => {
    const { buildPortableAACPackage, buildStandaloneAACHTML } = portableHelpers();
    const portablePackage = buildPortableAACPackage(boardFixture(), {
      includeCustomAudio: true,
      includePreparedAudio: true,
      preparedAudioRecords: preparedRecords(),
      now: 0,
    });
    const html = buildStandaloneAACHTML(portablePackage);
    const document = new window.DOMParser().parseFromString(html, 'text/html');

    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.querySelectorAll('.board-slot')).toHaveLength(7);
    expect(document.querySelectorAll('[role=gridcell]')).toHaveLength(4);
    expect(document.querySelectorAll('.empty-slot')).toHaveLength(3);
    expect(document.querySelector('.text-only-mark')).not.toBeNull();
    expect(document.querySelector('#export-warnings').textContent).toContain('not portable');
    expect(document.querySelectorAll('script[src],link[rel=stylesheet]')).toHaveLength(0);
    const loadBearingUrls = Array.from(document.querySelectorAll('img,audio,source'))
      .flatMap((node) => [node.getAttribute('src')]).filter(Boolean);
    expect(loadBearingUrls.every((url) => !/^(?:https?:|blob:)/i.test(url))).toBe(true);
    expect(html).toContain('Designed for WCAG 2.2 AA accessibility');
    expect(html).not.toContain('WCAG 2.1 AA');
  });

  it('executes bundled audio before browser speech and keeps scanning safe around blanks', async () => {
    const { buildPortableAACPackage, buildStandaloneAACHTML } = portableHelpers();
    const portablePackage = buildPortableAACPackage(boardFixture(), {
      includeCustomAudio: true,
      includePreparedAudio: true,
      preparedAudioRecords: preparedRecords(),
      now: 0,
    });
    const plays = [];
    const utterances = [];
    const runtimeErrors = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', (error) => runtimeErrors.push(error));
    const dom = new JSDOM(buildStandaloneAACHTML(portablePackage), {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://example.test/aac-board.html',
      virtualConsole,
      beforeParse(runtimeWindow) {
        runtimeWindow.Audio = class FakeAudio {
          constructor(src) { this.src = src; }
          play() { plays.push(this.src); return Promise.resolve(); }
          pause() {}
        };
        runtimeWindow.SpeechSynthesisUtterance = class FakeUtterance {
          constructor(text) { this.text = text; }
        };
        runtimeWindow.speechSynthesis = {
          cancel() {},
          speak(utterance) {
            utterances.push({ text: utterance.text, lang: utterance.lang });
            if (utterance.onend) utterance.onend();
          },
        };
      },
    });
    await new Promise((resolve) => dom.window.setTimeout(resolve, 0));
    const document = dom.window.document;
    const firstPageCells = Array.from(document.querySelector('#page-0').querySelectorAll('[role=gridcell]'));

    firstPageCells[0].click();
    firstPageCells[1].click();
    firstPageCells[2].click();

    expect(plays).toEqual([
      'data:audio/webm;base64,Q1VTVE9N',
      'data:audio/mpeg;base64,UFJFUEFSRUQ=',
    ]);
    expect(utterances).toEqual([{ text: 'More', lang: 'ar' }]);
    expect(document.querySelectorAll('.strip-word')).toHaveLength(3);

    const scanButton = document.querySelector('[data-scan-switch=true]');
    scanButton.focus();
    scanButton.click();
    const modeButton = document.getElementById('scan-mode-btn');
    modeButton.focus();
    modeButton.click();
    document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    expect(document.querySelectorAll('.strip-word')).toHaveLength(4);
    dom.window.AlloFlowAACViewer.toggleScan();

    firstPageCells[2].focus();
    const towardBlank = new dom.window.KeyboardEvent('keydown', {
      key: 'ArrowLeft',
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(towardBlank);
    expect(towardBlank.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(firstPageCells[3]);

    dom.window.AlloFlowAACViewer.switchPage(1);
    expect(() => dom.window.AlloFlowAACViewer.toggleScan()).not.toThrow();
    expect(document.querySelectorAll('#page-1 .scan-hl')).toHaveLength(0);
    expect(runtimeErrors).toEqual([]);
    dom.window.close();
  });

  it('keeps optional lesson and QR callbacks accessible with visible failure handling', () => {
    expect(source).toContain('onSaveAACResource');
    expect(source).toContain('onShareAACResource');
    expect(source).toContain('Save this portable board to a lesson');
    expect(source).toContain('Share this portable board with a QR code');
    expect(source).toContain('Include prepared speech in this QR board');
    expect(source).toContain('includeCustomAudio: false');
    expect(source).toContain('includePreparedAudio: includePreparedAudio === true');
    expect(source).toContain('The board could not be saved to the lesson.');
    expect(source).toContain('The board could not be shared.');
  });

  it('pushes the default portable package to live students without reconstructing a legacy text-only board', () => {
    const liveActionStart = source.indexOf('Push board to student screens');
    const liveActionEnd = source.indexOf('deleteSavedBoard', liveActionStart);
    expect(liveActionStart).toBeGreaterThan(-1);
    expect(liveActionEnd).toBeGreaterThan(liveActionStart);

    const liveAction = source.slice(liveActionStart, liveActionEnd);
    expect(liveAction).toContain('liveSession.push(buildPortableAACPackage(b))');
    expect(liveAction).not.toContain('includeCustomAudio');
    expect(liveAction).not.toContain('includePreparedAudio');
    expect(liveAction).not.toContain('livePages');

    const { buildPortableAACPackage } = portableHelpers();
    const livePayload = buildPortableAACPackage(boardFixture(), { now: 0 });
    expect(livePayload.board).toMatchObject({ locale: 'ar', direction: 'rtl' });
    expect(livePayload.pages.map((page) => page.id)).toEqual(['page-a', 'page-empty']);
    expect(livePayload.pages[0].cells[0].image).toBe('data:image/png;base64,QQ==');
    expect(livePayload.pages[0].cells[3]).toMatchObject({ index: 3, displayLabel: '', image: null });
    expect(livePayload.pages.flatMap((page) => page.cells).every((cell) => !Object.hasOwn(cell, 'audio'))).toBe(true);
    expect(JSON.stringify(livePayload)).not.toContain('private-student');
  });
});
