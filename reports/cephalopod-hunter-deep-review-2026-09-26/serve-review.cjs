const path = require('node:path');
const fs = require('node:fs');
const esbuild = require('esbuild');
const out = path.join(__dirname, 'harness.generated.cjs');
esbuild.buildSync({ entryPoints: ['tests/e2e/helpers/stem_gl_harness.ts'], bundle: true, platform: 'node', format: 'cjs', outfile: out, external: ['@playwright/test'] });
const {GlHarness} = require(out);
const h = new GlHarness({toolFile:'stem_lab/stem_tool_cephalopodlab.js',toolId:'cephalopodLab',width:1100,height:1000,layout:'document',probes:`window.addEventListener('load', function(){window.__mount({cephalopodLab:{activeSection:'hunt',hunt3DActive:true,huntSpeciesId:'commonOcto',_threeLoaded:true,huntsAttempted:1}});});`});
h.start().then(()=>{fs.writeFileSync(path.join(__dirname,'review-url.txt'),h.url+'/__harness');console.log(h.url+'/__harness');});
process.on('SIGINT',()=>h.stop().then(()=>process.exit()));
