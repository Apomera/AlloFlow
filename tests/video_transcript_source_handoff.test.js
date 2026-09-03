import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const hostFiles = [
  ['main host', readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8')],
  ['deploy host', readFileSync(resolve(process.cwd(), 'desktop/web-app/src/AlloFlowANTI.txt'), 'utf8')],
];
// The host-side Video Studio props (incl. onSendTranscriptToFlow) were extracted from ANTI into the
// host bridge view module. Exact-text pins target the source; the build rewrites arrow functions, so
// the module is pinned on build-stable text and the public mirror on byte identity with the build.
const bridgeSource = readFileSync(resolve(process.cwd(), 'video_studio_host_bridge_source.jsx'), 'utf8');
const bridgeModule = readFileSync(resolve(process.cwd(), 'video_studio_host_bridge_module.js'), 'utf8');
const bridgePublicModule = readFileSync(resolve(process.cwd(), 'desktop/web-app/public/video_studio_host_bridge_module.js'), 'utf8');
const restoreSource = readFileSync(resolve(process.cwd(), 'misc_handlers_source.jsx'), 'utf8');
const restoreModule = readFileSync(resolve(process.cwd(), 'misc_handlers_module.js'), 'utf8');
const restorePublicModule = readFileSync(resolve(process.cwd(), 'desktop/web-app/public/misc_handlers_module.js'), 'utf8');

describe('Video Studio transcript handoff into Source', () => {
  it('restores transcript history items back into the Source panel', () => {
    for (const [name, src] of hostFiles) {
      expect(src, name).toContain("typeof moduleApi.handleRestoreView === 'function'");
      expect(src, name).toContain('moduleApi.handleRestoreView(item, options, _alloMiscHandlersDeps())');
    }
    expect(restoreSource).toContain("item && item.type === 'video-transcript'");
    expect(restoreSource).toContain("setActiveSidebarTab('create')");
    expect(restoreSource).toContain("setExpandedTools(prev => prev.includes('source-input') ? prev : ['source-input', ...prev])");
    expect(restoreSource).toContain("Video transcript loaded into Source");
    expect(restoreModule).toContain("item && item.type === 'video-transcript'");
    expect(restorePublicModule).toBe(restoreModule);
  });

  it('adds transcript-aware shortcuts that reuse existing resource generators', () => {
    for (const [name, src] of hostFiles) {
      expect(src, name).toContain('const videoTranscriptSourceContext = useMemo');
      expect(src, name).toContain('const handleTranscriptSourceAction = useCallback');
      expect(src, name).toContain("handleGenerate('quiz', null, false, context.transcript");
      expect(src, name).toContain("handleGenerate('glossary', null, false, context.transcript");
      expect(src, name).toContain("handleGenerate('note-taking', null, false, context.transcript");
      expect(src, name).toContain("handleGenerate('anchor-chart', null, false, context.transcript");
      expect(src, name).toContain("handleGenerate('simplified', null, false, context.transcript");
    }
  });

  it('sends Video Studio transcripts to history and opens Source for the teacher', () => {
    expect(bridgeSource).toContain('onSendTranscriptToFlow: (resource) =>');
    expect(bridgeSource).toContain("type: 'video-transcript'");
    expect(bridgeSource).toContain('setHistory(prev => [...prev, item])');
    expect(bridgeSource).toContain("Transcript sent to Source");
    expect(bridgeModule).toContain("type: 'video-transcript'");
    expect(bridgeModule).toContain("Transcript sent to Source");
    expect(bridgePublicModule).toBe(bridgeModule);
  });
});
