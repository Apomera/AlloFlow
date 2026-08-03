import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

const sliceBetween = (startMarker, endMarker, from = 0) => {
  const start = source.indexOf(startMarker, from);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end <= start) throw new Error('Could not extract ' + startMarker);
  return source.slice(start, end);
};

const imageMimeHarness = () => {
  const helpers = sliceBetween('var _remediationImageMimeFromMetadata =', 'var _makeRunCtx =');
  const atob = (value) => Buffer.from(String(value), 'base64').toString('binary');
  return new Function('atob', helpers + '\nreturn {'
    + 'fromMetadata: _remediationImageMimeFromMetadata,'
    + 'fromMagic: _remediationImageMimeFromMagic,'
    + 'resolve: _resolveRemediationImageMime};')(atob);
};

describe('first-class image remediation core', () => {
  it('classifies PNG, JPEG, and WebP from magic bytes and distrusts mismatched metadata', () => {
    const mime = imageMimeHarness();
    const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB';
    const jpeg = '/9j/4AAQSkZJRgABAQAAAQABAAD';
    const webp = Buffer.from('RIFF1234WEBP', 'binary').toString('base64');
    expect(mime.fromMagic(png)).toBe('image/png');
    expect(mime.fromMagic(jpeg)).toBe('image/jpeg');
    expect(mime.fromMagic(webp)).toBe('image/webp');
    expect(mime.resolve('wrong.png', 'image/png', jpeg)).toBe('image/jpeg');
    expect(mime.resolve('fake.webp', 'image/webp', 'bm90LWFuLWltYWdl')).toBeNull();
    expect(mime.resolve('photo.JPG', '', '')).toBe('image/jpeg');
    expect(mime.fromMetadata('', 'image/jpg')).toBe('image/jpeg');
    expect(mime.fromMetadata('unsupported.gif', 'image/gif')).toBeNull();
  });

  it('uses the classified image MIME for every whole-input audit Vision pass', () => {
    const audit = sliceBetween('const runPdfAccessibilityAudit = async', 'let _activeBatchRun = null;');
    expect(audit).toContain(`const _auditMimeType = _imageInputMime || 'application/pdf';`);
    expect(audit).toContain('callGeminiVision(p, base64Data, _auditMimeType)');
    expect(audit).toContain(`sourceKind: _imageInputMime ? 'image' : 'pdf'`);
    expect(audit).toContain('sourceMimeType: _auditMimeType');
    expect(audit).toContain('_imageInput: !!_imageInputMime');
  });

  it('keeps PDF-only parsing, slicing, OCR, and inventory gates off for image inputs', () => {
    const audit = sliceBetween('const runPdfAccessibilityAudit = async', 'let _activeBatchRun = null;');
    const inventory = sliceBetween('const _extractPdfImages = async', 'const _runExtractionPhase = async');
    const extraction = sliceBetween('const _runExtractionPhase = async', 'const fixAndVerifyPdf = async');
    const fix = source.slice(source.indexOf('const fixAndVerifyPdf = async'));

    expect(audit).toContain(`if (!_imageInputMime && _head && _head.indexOf('%PDF') === -1`);
    expect(audit).toContain('const _sliceCapable = !_imageInputMime');
    expect(extraction).toContain('const isPdf = !isDocx && !isPptx && !isImage;');
    expect(extraction.indexOf('if (isImage) {')).toBeLessThan(extraction.indexOf('} else if (isDocx) {'));
    expect(inventory.indexOf('if (/^image\\/(?:png|jpeg|webp)$/i.test(_mimeType) && imgCtx.sourceImage) {')).toBeLessThan(
      inventory.indexOf(`} else if (_mimeType !== 'application/pdf') {`),
    );
    expect(fix).toContain(`if (_sourceKind === 'pdf' && effectivePageCount <= 1 && _base64) {`);
    expect(fix).toContain(`&& _mimeType === 'application/pdf'`);
  });

  it('preserves the source raster exactly once, with a deterministic fallback splice', () => {
    const inventory = sliceBetween('const _extractPdfImages = async', 'const _runExtractionPhase = async');
    const extraction = sliceBetween('const _runExtractionPhase = async', 'const fixAndVerifyPdf = async');
    const fallback = sliceBetween('Office (DOCX/PPTX) embedded media splice', 'Empty-body honesty guard');
    const dedupe = fallback.match(/!Object\.keys\(_deferredImageMap\)\.some\(\(key\) => _deferredImageMap\[key\] === im\.src\)/g) || [];

    expect(extraction).toContain(`_officeMediaImages = [{ src: _sourceImage.src, alt: imageAlt, slideNum: null, sourceKind: 'image' }];`);
    expect(inventory).toContain('extractedImages = [imgCtx.sourceImage];');
    expect(inventory).toContain(`_pipeLog('Images', 'Image input - seeded the original raster as the source figure');`);
    expect(dedupe).toHaveLength(2);
    expect(fallback).toContain(`const _tok = '__ALLOFLOW_DATAURL_FINAL_' + (_oi + 1) + '__';`);
  });

  it('persists and forwards batch MIME metadata through audit, fix, and image export', () => {
    const persistence = sliceBetween('const _toStatusEntry =', 'const _saveBatchStatus = (');
    const batchRun = sliceBetween('const _runPdfBatchRemediationOwned = async', 'const downloadBatchResults = async');
    const batchExport = sliceBetween('const downloadBatchResults = async', '// == Test-Retest Experiment Mode ==');

    expect(persistence).toContain('mimeType: f.mimeType || null');
    expect(persistence).toContain('fileSize: f.fileSize, mimeType: f.mimeType || null, base64: f.base64');
    expect(batchRun).toContain('runPdfAccessibilityAudit(item.base64, { skipUiUpdates: true, fileName: item.fileName, mimeType: item.mimeType || null');
    expect(batchRun).toMatch(/fixAndVerifyPdf\(\{[\s\S]*?mimeType: item\.mimeType \|\| null,[\s\S]*?auditResult:/);
    expect(batchExport).toContain('const _isImageSource = /^image\\/(?:png|jpeg|webp)$/i.test');
    expect(batchExport).toContain(`f.result.sourceKind === 'image'`);
    expect(batchExport).toContain('const _ts = await createTypesetTaggedPdf(f.result');
    expect(batchExport).toContain('txt|png|jpe?g|webp');
  });

  it('converts WebP for typeset embedding and returns source metadata', () => {
    const typeset = sliceBetween('const createTypesetTaggedPdf = async', 'STEM image intelligence (2026-06-10)');
    const fixStart = source.indexOf('const fixAndVerifyPdf = async');
    const resultStart = source.indexOf('const _result = {', fixStart);
    const result = source.slice(resultStart, resultStart + 650);

    expect(typeset).toContain('const _rasterDataUrlToPngBytes = async (dataUrl) => {');
    expect(typeset).toContain(`canvas.toDataURL('image/png')`);
    expect(typeset).toContain('src.match(/^data:image\\/(png|jpe?g|webp);base64,(.+)$/i)');
    expect(typeset).toContain('await doc.embedPng(await _rasterDataUrlToPngBytes(src))');
    expect(result).toContain('sourceKind: _sourceKind');
    expect(result).toContain('sourceMimeType: _mimeType');
    expect(result).toContain('_imageInput: _sourceKind === ');
  });
});
