const fs = require('fs');
const { execFileSync } = require('child_process');
const { JSDOM } = require('jsdom');
global.window = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' }).window;
global.document = window.document;
(async () => {
  const { resetStemLab, renderTool } = await import('../../tests/helpers/stem_widgets_smoke_harness.js');
  resetStemLab();
  new Function(execFileSync('git', ['show', '75bbb4026:stem_lab/stem_tool_machinelab.js'], { encoding: 'utf8' }))();
  const html = renderTool('machineLab', { machineLab: { view: 'machines', bench: 'lever', bandOverride: 'g68' } });
  const result = { commit: '75bbb4026', workIn: html.includes('Work in:'), workOut: html.includes('Work out:'), obsoleteIdenticalCopy: html.includes('identical') };
  fs.writeFileSync(__dirname + '/baseline-check.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  window.close();
})();
