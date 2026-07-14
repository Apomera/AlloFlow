import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(process.cwd(), 'export_handlers_module.js'), 'utf8');

describe('HTML export read-aloud download options', () => {
  it('offers standard, structured, and both-audio variants with size controls', () => {
    expect(source).toContain('name="allo-audio-variant" value="standard"');
    expect(source).toContain('name="allo-audio-variant" value="structured"');
    expect(source).toContain('name="allo-audio-variant" value="both"');
    expect(source).toContain('name="allo-audio-quality" value="compressed"');
    expect(source).toContain('name="allo-audio-quality" value="embedded"');
    expect(source).toContain('Structured audio');
    expect(source).toContain('Smaller file');
    expect(source).toContain('Best quality');
    expect(source).toContain('both audio versions are only included when you choose that option');
  });

  it('shows progress for embedded audio generation', () => {
    expect(source).toContain('const _alloAudioProgress');
    expect(source).toContain('Preparing embedded read-aloud audio');
    expect(source).toContain('Generating audio for sentence');
    expect(source).toContain('Generating \' + plan.label.toLowerCase() + \' chunk');
    expect(source).toContain('Audio ready. Starting download...');
  });

  it('compresses selected-model audio when the smaller-file option is chosen', () => {
    expect(source).toContain('const _alloCompressAudioBlob');
    expect(source).toContain('MediaRecorder');
    expect(source).toContain('audioBitsPerSecond: 32000');
    expect(source).toContain("audioConfig.quality === 'compressed'");
    expect(source).toContain('Compressing audio for sentence');
    expect(source).toContain('Compressing \' + plan.label.toLowerCase()');
  });

  it('passes the selected read-aloud mode through both preview and regenerated export paths', () => {
    expect(source).toContain('let _readAloudMode = false');
    expect(source).toContain('mode: _readAloudMode');
    expect(source).toContain('singleFile: _wantSingleFile');
    expect(source).toContain('parseFromString(htmlContent, \'text/html\')');
    expect(source).toContain('_readAloudApplied');
  });

  it('builds downloadable standard and structured audio assets for HTML export', () => {
    expect(source).toContain('const _alloAudioReadyTextFromRoot');
    expect(source).toContain('const _alloStructuredAudioTextFromRoot');
    expect(source).toContain('const _alloPlanAudioDownloads');
    expect(source).toContain('const _alloBuildAudioDownloadAssets');
    expect(source).toContain("const filename = 'alloflow-' + plan.variant + '-audio.' + ext;");
    expect(source).toContain('alloflow-audio-downloads');
    expect(source).toContain('data-audio-variant');
  });

  it('strips export toolbar chrome before generating audio-only text', () => {
    expect(source).toContain('.alloflow-reading-tools-shell');
    expect(source).toContain('#alloflow-reader-line');
    expect(source).toContain('.alloflow-reader-mask');
    expect(source).toContain('#alloflow-savejson-cta');
  });

  it('keeps ZIP audio files external and single-file exports self-contained', () => {
    expect(source).toContain('const _wantSingleFile = mode === \'html\'');
    expect(source).toContain('href = await _alloBlobToDataUrl(combined)');
    expect(source).toContain("path = 'audio/' + filename");
    expect(source).toContain('zip.file(_asset.path, _asset.blob)');
  });

  it('keeps playback mode metadata in fallback downloaded HTML', () => {
    expect(source).toContain('data-ka-mode');
    expect(source).toContain('findBox(id)');
    expect(source).toContain('allo-ka-audios');
  });
});
