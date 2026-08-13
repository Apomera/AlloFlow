import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const hostSource = readFileSync('desktop/web-app/src/App.jsx', 'utf8');
const storyForgeStart = hostSource.indexOf('<CDNModuleGate moduleKey="StoryForge"');
const storyForgeEnd = hostSource.indexOf('</CDNModuleGate>', storyForgeStart);
const storyForgeHostSlice = storyForgeStart >= 0 && storyForgeEnd > storyForgeStart
  ? hostSource.slice(storyForgeStart, storyForgeEnd + '</CDNModuleGate>'.length)
  : '';

describe('StoryForge host privacy boundary', () => {
  it('keeps shared-session artifact transport disabled', () => {
    expect(storyForgeStart).toBeGreaterThanOrEqual(0);
    expect(storyForgeEnd).toBeGreaterThan(storyForgeStart);
    expect(storyForgeHostSlice).toContain('liveSession: null');
    expect(storyForgeHostSlice).not.toMatch(/\bpush\s*:/);
    expect(storyForgeHostSlice).not.toMatch(/\bclear\s*:/);
    expect(storyForgeHostSlice).not.toContain('updateDoc(');
    expect(storyForgeHostSlice).not.toContain('deleteField(');
  });

  it('cannot read or write the retired StoryForge session payload anywhere in the host', () => {
    expect(hostSource).not.toContain('storyForgePayload');
  });
});
