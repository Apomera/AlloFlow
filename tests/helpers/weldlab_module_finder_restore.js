// Reverse only the local MainMenu finder before historical preservation checks.
// Preserve the caller's line endings so whole-source byte recovery remains useful.
export function stripModuleFinder(source) {
  const crlf = source.includes('\r\n');
  let result = source.replace(/\r\n/g, '\n');
  if (!result.includes('        // BEGIN MODULE FINDER STATE\n')) return source;
  function removeBlock(start, end) {
    if (result.split(start).length !== 2 || result.split(end).length !== 2) throw new Error('Unexpected module finder block count');
    const from = result.indexOf(start), to = result.indexOf(end, from);
    if (to < from) throw new Error('Missing module finder boundary');
    result = result.slice(0, from) + result.slice(to + end.length);
  }
  function replaceOne(from, to = '') {
    if (result.split(from).length !== 2) throw new Error('Unexpected module finder addition: ' + from);
    result = result.replace(from, () => to);
  }
  removeBlock('        // BEGIN MODULE FINDER STATE\n', '        // END MODULE FINDER STATE\n');
  removeBlock('\n        // BEGIN MODULE FINDER HELPERS\n', '        // END MODULE FINDER HELPERS\n');
  replaceOne("          h('div', { 'data-weld-module-workspace': '' },\n");
  replaceOne('          renderModuleFinder(),\n');
  replaceOne('          menuFiltersActive && renderModuleResults(),\n');
  replaceOne("          !menuFiltersActive && menuMode === 'path' && renderPath(),", "          menuMode === 'path' && renderPath(),");
  replaceOne("          !menuFiltersActive && menuMode === 'all' && h('div', null,", "          menuMode === 'all' && h('div', null,");
  replaceOne('          )\n          ),\n          // Count comes from BADGE_IDS', '          ),\n          // Count comes from BADGE_IDS');
  return crlf ? result.replace(/\n/g, '\r\n') : result;
}
