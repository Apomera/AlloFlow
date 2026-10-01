import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const source = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const region = (start, end) => {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  if (a < 0 || b < 0) throw new Error('Missing OCR source boundaries: ' + start);
  return source.slice(a, b);
};
const varFunction = name => {
  const a = source.indexOf('var ' + name + ' = function');
  const b = source.indexOf('\n};', a);
  if (a < 0 || b < 0) throw new Error('Missing OCR helper: ' + name);
  return source.slice(a, b + 3);
};
export const { reconcile, resolveChunk } = new Function('warnLog',
  varFunction('_stripPageEdgeArtifacts') + '\n' + varFunction('_collapseAdjacentDupes') + '\n' +
  region('  const _resolveVisionOcrChunk = ', '  // Lazy-load mammoth.js') +
  '\nreturn {reconcile:reconcileOcrPages,resolveChunk:_resolveVisionOcrChunk};'
)(() => {});

export function makeVisionExtraction(callGeminiVision, { pageCount = 2, range = null } = {}) {
  const runtime = region('        const _visionChunkedExtract = async () => {', '        // ── OCR language resolution');
  return new Function('_resolveVisionOcrChunk', 'callGeminiVision', '_pageRange', 'effectivePageCount', 'numChunks',
    'const _base64="test-pdf", _mimeType="application/pdf", PAGES_PER_CHUNK=2, _pageCountProbeDoc=null;\n' +
    'const warnLog=()=>{}, _safeStripJsonWrapper=text=>({text,stripped:false});\n' +
    runtime + '\nreturn _visionChunkedExtract;'
  )(resolveChunk, callGeminiVision, range, pageCount, Math.ceil(pageCount / 2));
}
