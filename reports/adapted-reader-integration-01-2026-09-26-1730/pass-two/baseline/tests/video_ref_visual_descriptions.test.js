// Video-reference visual descriptions: canonical-source runtime contract.
// The test compiles JSX in memory; it never updates generated deploy modules.

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const { buildVideoRefPlayerModule } = require('../_build_view_video_ref_player_module.js');

let React;
let ReactDOMClient;
let act;
let Overlay;
let root;
let container;
let zipEntries;
let toasts;
let createdBlobs;
let nextUrl;
let createDescriptor;
let revokeDescriptor;

const encode = value => new TextEncoder().encode(value);
const packFile = () => ({
  name: 'reviewed-lesson.allopack',
  arrayBuffer: async () => new Uint8Array([80, 75, 3, 4]).buffer,
});
const blobText = blob => new Promise((resolveText, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolveText(String(reader.result || ''));
  reader.onerror = () => reject(reader.error);
  reader.readAsText(blob);
});
const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await new Promise(resolveWait => window.setTimeout(resolveWait, 0));
  });
};
const render = async () => {
  await act(async () => {
    root.render(React.createElement(Overlay, {
      item: { title: 'Fractions video', data: { title: 'Fractions video', durationSec: 30 } },
      onClose: vi.fn(),
      addToast: (message, kind) => toasts.push({ message, kind }),
      t: () => '',
    }));
  });
};
const attachPack = async () => {
  const input = container.querySelector('input[type=file]');
  Object.defineProperty(input, 'files', { configurable: true, value: [packFile()] });
  await act(async () => {
    input.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
  await flush();
};

beforeAll(() => {
  React = require(resolve(MODULES_DIR, 'react'));
  ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  createDescriptor = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
  revokeDescriptor = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
  window.AlloModules = {
    VideoStudio: { vsReadZip: () => zipEntries },
  };
  const source = readFileSync(resolve(process.cwd(), 'view_video_ref_player_source.jsx'), 'utf8');
  new Function(buildVideoRefPlayerModule(source))();
  Overlay = window.AlloModules.VideoRefPlayer.VideoRefPlayerOverlay;
});

describe('VideoRef invalid description data', () => {
  it('opens the video but fails closed when description JSON is malformed', async () => {
    zipEntries = [
      { name: 'lesson.webm', data: new Uint8Array([9, 8, 7]) },
      { name: 'visual_descriptions.json', data: encode('{not valid json') },
    ];

    await render();
    const fileInput = container.querySelector('input[type=file]');
    const picker = fileInput.parentElement;
    expect(picker.getAttribute('role')).toBe('button');
    expect(picker.tabIndex).toBe(0);
    const inputClick = vi.spyOn(fileInput, 'click').mockImplementation(() => {});
    picker.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(inputClick).toHaveBeenCalledOnce();
    inputClick.mockRestore();
    await attachPack();

    expect(container.querySelector('video')).toBeTruthy();
    expect(container.querySelector('track[kind=descriptions]')).toBeNull();
    expect(container.textContent).not.toContain('Reviewed visual descriptions');
    expect(toasts).toEqual([
      expect.objectContaining({
        kind: 'warning',
        message: expect.stringContaining('visual descriptions were ignored'),
      }),
    ]);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });
});

beforeEach(() => {
  zipEntries = [];
  toasts = [];
  createdBlobs = [];
  nextUrl = 0;
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(blob => {
      createdBlobs.push(blob);
      nextUrl += 1;
      return 'blob:video-ref-' + nextUrl;
    }),
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn(),
  });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = ReactDOMClient.createRoot(container);
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null;
  container.remove();
});

afterAll(() => {
  if (createDescriptor) Object.defineProperty(URL, 'createObjectURL', createDescriptor);
  else delete URL.createObjectURL;
  if (revokeDescriptor) Object.defineProperty(URL, 'revokeObjectURL', revokeDescriptor);
  else delete URL.revokeObjectURL;
});

describe('VideoRef reviewed visual descriptions', () => {
  it('keeps descriptions separate from captions and exposes timed keyboard controls', async () => {
    zipEntries = [
      { name: 'lesson.webm', data: new Uint8Array([1, 2, 3, 4]) },
      { name: 'lesson.vtt', data: encode('WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nCaption') },
      {
        name: 'visual_descriptions.json',
        data: encode(JSON.stringify([
          { start: 2, end: 4, description: 'A <chart>\n rises --> now.', checked: true },
          { start: 5, end: 7, description: 'Unreviewed private draft', checked: false },
          { start: '', end: 9, description: 'Missing timestamp', checked: true },
        ])),
      },
    ];

    await render();
    await attachPack();

    const video = container.querySelector('video');
    expect(video).toBeTruthy();
    expect(video.querySelector('track[kind=captions]')).toBeTruthy();
    expect(video.querySelector('track[kind=descriptions]')).toBeTruthy();
    expect(video.getAttribute('aria-describedby')).toBe('video-ref-description-summary');
    expect(container.textContent).toContain('Reviewed visual descriptions');
    expect(container.textContent).toContain('A <chart> rises --> now.');
    expect(container.textContent).not.toContain('Unreviewed private draft');
    expect(container.textContent).not.toContain('Missing timestamp');

    const descriptionVtt = await blobText(createdBlobs[2]);
    expect(descriptionVtt).toContain('WEBVTT');
    expect(descriptionVtt).toContain('00:00:02.000 --> 00:00:04.000');
    expect(descriptionVtt).toContain('A &lt;chart&gt; rises --&gt; now.');

    const seekButton = Array.from(container.querySelectorAll('button'))
      .find(button => button.textContent.includes('A <chart> rises'));
    await act(async () => {
      seekButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    });
    expect(video.currentTime).toBe(2);
    expect(document.activeElement).toBe(video);

    await act(async () => {
      video.currentTime = 2.5;
      video.dispatchEvent(new window.Event('timeupdate'));
    });
    const status = container.querySelector('[role=status]');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.textContent).toContain('Current visual description');

    await act(async () => root.unmount());
    root = null;
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(3);
  });
});

describe('VideoRef file replacement cleanup', () => {
  it('revokes old URLs and clears stale description semantics', async () => {
    zipEntries = [
      { name: 'first.webm', data: new Uint8Array([1]) },
      {
        name: 'visual_descriptions.json',
        data: encode(JSON.stringify([
          { start: 1, end: 2, description: 'A reviewed diagram.', checked: true },
        ])),
      },
    ];
    await render();
    await attachPack();
    expect(container.querySelector('track[kind=descriptions]')).toBeTruthy();

    zipEntries = [{ name: 'second.webm', data: new Uint8Array([2]) }];
    await attachPack();

    const video = container.querySelector('video');
    expect(video.querySelector('track[kind=descriptions]')).toBeNull();
    expect(video.hasAttribute('aria-describedby')).toBe(false);
    expect(container.textContent).not.toContain('A reviewed diagram.');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:video-ref-1');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:video-ref-2');
  });
});
