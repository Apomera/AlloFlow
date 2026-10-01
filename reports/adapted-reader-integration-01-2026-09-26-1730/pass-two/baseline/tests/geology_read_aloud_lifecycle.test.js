import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

let source;
const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'stem_lab', 'stem_tool_geologyexplorer.js');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_geologyexplorer.js');

beforeAll(() => {
  source = fs.readFileSync(sourcePath, 'utf8');
});

describe('Geology Explorer read-aloud lifecycle', () => {
  it('owns generated audio and rejects stale speech sessions', () => {
    expect(source).toContain('function playGeneratedTts(url, text, expectedSession)');
    expect(source).toContain('var ttsSessionRef = React.useRef(0);');
    expect(source).toContain('if (expectedSession != null && expectedSession !== ttsSessionRef.current) return;');
    expect(source).toContain('audio.pause(); audio.currentTime = 0;');
  });

  it('stops speech when the learner changes scene or mode and on unmount', () => {
    expect(source).toContain('if (previous.scene !== scene || previous.mode !== mode) stopReadAloud();');
    expect(source).toContain('return function () { stopReadAloud(); };');
  });

  it('keeps both app mirrors identical', () => {
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(source);
  });
});
