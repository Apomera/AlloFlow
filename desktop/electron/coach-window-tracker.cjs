'use strict';

function parseWindowHandle(sourceId) {
  const match = /^window:(0x[0-9a-f]+|[0-9]+):[0-9]+$/i.exec(String(sourceId || '').trim());
  if (!match) return '';
  try {
    const value = BigInt(match[1]);
    return value > 0n ? value.toString(10) : '';
  } catch (_) {
    return '';
  }
}

function normalizeWindowTitle(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[\u0000-\u001F\u007F]+/g, ' ')
    .replace(/^window\s*:\s*(?![0-9]+:)/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function selectUniqueWindowSource(sources, trackLabel) {
  const directHandle = parseWindowHandle(trackLabel);
  if (directHandle) return { handle: directHandle, id: String(trackLabel), name: '' };
  const wanted = normalizeWindowTitle(trackLabel);
  if (!wanted) return null;
  const matches = (Array.isArray(sources) ? sources : []).filter((source) => (
    source && parseWindowHandle(source.id) && normalizeWindowTitle(source.name) === wanted
  ));
  if (matches.length !== 1) return null;
  return {
    handle: parseWindowHandle(matches[0].id),
    id: String(matches[0].id),
    name: String(matches[0].name || ''),
  };
}

module.exports = {
  normalizeWindowTitle,
  parseWindowHandle,
  selectUniqueWindowSource,
};
