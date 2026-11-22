'use strict';

const MAX_INT64_HANDLE = 0x7fffffffffffffffn;

function parseWindowHandle(sourceId) {
  if (typeof sourceId !== 'string') return '';
  const trimmed = sourceId.trim();
  if (!trimmed || trimmed.length > 128) return '';
  const match = /^window:(0x[0-9a-f]+|[0-9]+):[0-9]+$/i.exec(trimmed);
  if (!match) return '';
  try {
    const value = BigInt(match[1]);
    return value > 0n && value <= MAX_INT64_HANDLE ? value.toString(10) : '';
  } catch (_) {
    return '';
  }
}

function normalizeWindowTitle(value) {
  return String(value || '')
    .slice(0, 1024)
    .normalize('NFKC')
    .replace(/[\u0000-\u001F\u007F]+/g, ' ')
    .replace(/^window\s*:\s*(?![0-9]+:)/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function selectUniqueWindowSource(sources, trackLabel) {
  if (typeof trackLabel !== 'string') return null;
  const list = Array.isArray(sources) ? sources : [];
  const directHandle = parseWindowHandle(trackLabel);
  if (directHandle) {
    const matchedDirect = list.find((source) => source && parseWindowHandle(source.id) === directHandle);
    if (!matchedDirect) return null;
    return { handle: directHandle, id: String(matchedDirect.id), name: String(matchedDirect.name || '') };
  }
  const wanted = normalizeWindowTitle(trackLabel);
  if (!wanted) return null;
  const matches = list.filter((source) => (
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
