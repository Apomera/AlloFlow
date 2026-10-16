import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/avian_feather_art.js', 'utf8');

// Keep shader composition real in mesh/material tests. Those tests may replace
// canvas painting at its DOM boundary, but never replace the shared GPU hook.
export function loadAvianFeatherArt(document = {
  createElement() { throw new Error('Unexpected canvas allocation in a feather shader test'); },
}) {
  const window = {};
  new Function('window', 'document', source)(window, document);
  return window.AvianFeatherArt;
}
