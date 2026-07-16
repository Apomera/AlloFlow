import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { Blob as NodeBlob } from 'node:buffer';
import { CompressionStream as NodeCompressionStream, DecompressionStream as NodeDecompressionStream } from 'node:stream/web';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const start = source.indexOf('  const BUILDER_PROJECT_DRAFT_MAX_BYTES = 32 * 1024 * 1024;');
const end = source.indexOf('  const getSkippedResources = () => {', start);
if (start < 0 || end < 0) throw new Error('Builder draft codec extraction markers missing');

const codec = new Function(
  source.slice(start, end) + '\nreturn {' +
  ' dedupe: _deduplicateBuilderDraftAssets,' +
  ' restoreAssets: _restoreBuilderDraftAssets,' +
  ' pack: _packBuilderProjectDraft,' +
  ' unpack: _unpackBuilderProjectDraft' +
  ' };'
)();

afterEach(() => vi.unstubAllGlobals());

describe('Document Builder project draft codec', () => {
  it('deduplicates repeated embedded images and round-trips a version-2 envelope', async () => {
    const asset = 'data:image/png;base64,QUJDRA==';
    const html = '<!doctype html><html><body><img src="' + asset + '"><img src="' + asset + '"></body></html>';
    const compact = codec.dedupe(html);

    expect(compact.assets).toEqual([asset]);
    expect(compact.html.match(/allo-builder-asset:0/g)).toHaveLength(2);
    expect(compact.html).not.toContain(asset);

    const packed = await codec.pack({ html }, 'history:abc');
    expect(packed).toMatchObject({
      version: 2,
      source: 'history',
      historySignature: 'history:abc',
      assetCount: 1,
      activeContentRemoved: true,
    });
    expect(['deflate-raw-base64', 'plain-json']).toContain(packed.encoding);
    expect(packed).not.toHaveProperty('html');
    expect(await codec.unpack(packed, 'history:abc')).toBe(html);
  });

  it('uses deflate-raw when browser compression primitives are available', async () => {
    vi.stubGlobal('Blob', NodeBlob);
    vi.stubGlobal('CompressionStream', NodeCompressionStream);
    vi.stubGlobal('DecompressionStream', NodeDecompressionStream);
    const repeated = '<p>Universal Design for Learning</p>'.repeat(300);
    const html = '<!doctype html><html><body>' + repeated + '</body></html>';

    const packed = await codec.pack({ html }, 'compressed:sig');
    expect(packed.encoding).toBe('deflate-raw-base64');
    expect(packed.storedByteLength).toBeLessThan(packed.uncompressedByteLength);
    expect(await codec.unpack(packed, 'compressed:sig')).toBe(html);
  });

  it('restores legacy version-1 drafts but rejects stale and unsafe version-2 assets', async () => {
    const legacyHtml = '<!doctype html><html><body><h1>Legacy</h1></body></html>';
    const legacy = { version: 1, source: 'history', historySignature: 'sig', html: legacyHtml };
    expect(await codec.unpack(legacy, 'sig')).toBe(legacyHtml);
    expect(await codec.unpack(legacy, 'different')).toBeNull();

    const unsafe = {
      version: 2,
      source: 'history',
      historySignature: 'sig',
      encoding: 'plain-json',
      payload: JSON.stringify({ html: '<img src="allo-builder-asset:0">', assets: ['javascript:alert(1)'] }),
    };
    expect(await codec.unpack(unsafe, 'sig')).toBeNull();
  });
});
