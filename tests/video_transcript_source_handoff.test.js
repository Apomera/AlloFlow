import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const hostFiles = [
  ['main host', readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8')],
  ['deploy host', readFileSync(resolve(process.cwd(), 'desktop/web-app/src/AlloFlowANTI.txt'), 'utf8')],
];

describe('Video Studio transcript handoff into Source', () => {
  it('restores transcript history items back into the Source panel', () => {
    for (const [name, src] of hostFiles) {
      expect(src, name).toContain("item && item.type === 'video-transcript'");
      expect(src, name).toContain("setActiveSidebarTab('create')");
      expect(src, name).toContain("setExpandedTools(prev => prev.includes('source-input') ? prev : ['source-input', ...prev])");
      expect(src, name).toContain("Video transcript loaded into Source");
    }
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
    for (const [name, src] of hostFiles) {
      expect(src, name).toContain('onSendTranscriptToFlow: (resource) =>');
      expect(src, name).toContain("type: 'video-transcript'");
      expect(src, name).toContain('setHistory(prev => [...prev, item])');
      expect(src, name).toContain("Transcript sent to Source");
    }
  });
});
