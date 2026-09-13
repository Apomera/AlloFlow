/* Browser review of the ten tools in the Math Fundamentals menu. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const OUT = path.join(ROOT, 'reports/basic-math-ux-2026-09-12', process.argv.includes('--compact') ? 'compact' : process.argv.includes('--before') ? 'before' : 'after');
const requested = (process.argv.find(a=>a.startsWith('--only='))||'').slice(7).split(',').filter(Boolean);
const tools = ['numberline', 'areamodel', 'arithmetic', 'fractions', 'manipulatives', 'multtable', 'ratios', 'money', 'unitconvert', 'timeschedule'].filter(t=>!requested.length||requested.includes(t));
const gate = read('dev-tools/check_stem_layout_defects.cjs');
const shellStart = gate.indexOf('const SHELL = `') + 'const SHELL = `'.length;
let shell = gate.slice(shellStart, gate.indexOf('`;\n', shellStart));
shell = shell.replace('cfg.render(ctx)', 'window.StemLab.renderTool(id, ctx)');
const mirrorStart = shell.indexOf('    // Mirror the host');
const mirrorEnd = shell.indexOf('\n  };', mirrorStart);
shell = shell.slice(0, mirrorStart) + '    return rendered;' + shell.slice(mirrorEnd);
shell = shell.replace("var Icons = new Proxy({}, { get: function () { return function () { return React.createElement('span'); }; } });", "var Icons = new Proxy({}, { get: function (_, name) { return function () { return React.createElement('span', {'aria-hidden': true}, name === 'ArrowLeft' ? '←' : ''); }; } });");
shell = shell.replace('var ctx = { React:', 'window.__reviewState = pair[0]; var ctx = { React:');
shell = shell.replace('if (fb != null) return fb;', "var value = k.split('.').reduce(function(o, key) { return o && o[key]; }, window.__reviewStrings); if (typeof value === 'string') return value; if (fb != null) return fb;");
const styles = read('app_styles_module.js');
const paletteStart = styles.indexOf(':root, .theme-default {');
const paletteEnd = styles.indexOf('}', styles.indexOf('--allo-stem-button-border', styles.indexOf('.theme-contrast {', paletteStart)));
const palette = styles.slice(paletteStart, paletteEnd + 1);
const hostStart = gate.indexOf('function extractHostThemeRules(theme) {');
const hostEnd = gate.indexOf('\n}\n', hostStart) + 2;
const hostCss = new Function('read', 'return ' + gate.slice(hostStart, hostEnd))(read);
async function inspect(page, file, view, theme, width) {
  const data = await page.evaluate(async (textSpacing) => {
    const root = document.getElementById('slot');
    const visible = el => el.checkVisibility({checkVisibilityCSS:true}) && el.getBoundingClientRect().width > 0;
    const controls = [...root.querySelectorAll('button,input,select,textarea,summary')].filter(visible).map(el => ({tag:el.tagName,label:el.getAttribute('aria-label') || el.innerText || el.labels?.[0]?.textContent || '',type:el.type,role:el.getAttribute('role'),font:parseFloat(getComputedStyle(el).fontSize),width:Math.round(el.getBoundingClientRect().width),height:Math.round(el.getBoundingClientRect().height)}));
    const a11y = await axe.run(root, {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});
    let textSpacingOverflow = false;
    if(textSpacing){const style=document.createElement('style');style.textContent='#slot *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}#slot p{margin-bottom:2em!important}';document.head.appendChild(style);textSpacingOverflow=document.documentElement.scrollWidth>innerWidth+1;style.remove();}
    return {textSpacingOverflow,text:root.innerText, controls, overflow:document.documentElement.scrollWidth > innerWidth + 1, violations:a11y.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,html:n.html,summary:n.failureSummary}))}))};
  }, process.argv.includes('--compact'));
  return {file,view,theme,width,...data};
}
(async () => {
  fs.mkdirSync(OUT,{recursive:true});
  const browser = await chromium.launch({headless:true});
  const previous = requested.length && fs.existsSync(path.join(OUT,'review.json')) ? JSON.parse(fs.readFileSync(path.join(OUT,'review.json'),'utf8')) : {results:[],errors:[]};
  const results = previous.results.filter(r=>!tools.includes(r.file));
  const errors = previous.errors.filter(r=>!tools.includes(r.file));
  try {
    for (const file of tools) {
      const page = await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'});
      page.on('pageerror', e => errors.push({file,message:e.message}));
      await page.setContent('<!doctype html><html lang="en"><head><title>Basic math review</title><style>' + read('dev-tools/.cache/sweep-tailwind.css') + '</style><style>' + palette + '</style><style id="host-theme"></style><style>body{margin:0;font-family:system-ui}button:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible{outline:3px solid #2563eb;outline-offset:3px}</style></head><body><main id="slot" class="theme-default"></main></body></html>');
      await page.evaluate(strings => { window.__reviewStrings = strings; }, JSON.parse(read('ui_strings.js')));
      for (const p of ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','stem_lab/stem_lab_module.js','stem_lab/stem_tool_' + file + '.js']) await page.addScriptTag({content:read(p)});
      await page.addScriptTag({content:read('node_modules/axe-core/axe.min.js')});
      await page.addScriptTag({content:shell});
      const id = await page.evaluate(() => Object.keys(StemLab._registry)[0]);
      await page.evaluate(id => __mount(id,false,{},false), id);
      await page.waitForTimeout(150);
      for (const width of [1280,process.argv.includes('--compact')?320:375]) {
        await page.setViewportSize({width,height:1000});
        const result = await inspect(page,file,'default','light',width);
        results.push(result);
        await page.screenshot({path:path.join(OUT,file+'-'+width+'.png'),fullPage:true});
      }
      await page.setViewportSize({width:1280,height:1000});
      if (process.argv.includes('--deep')) {
        const showAll = page.getByRole('button', {name:/Show all activities/});
        if (await showAll.count()) await showAll.click();
        const modes = file==='manipulatives' ? await page.locator('nav select option').evaluateAll(els=>els.map(e=>({value:e.value,label:e.textContent}))) : [];
        const tabs = await page.locator('[role="tab"]').evaluateAll(els=>els.filter(e=>e.checkVisibility()&&!e.id.startsWith('fraction-mode-')).map(e=>({id:e.id,label:e.textContent.trim()})));
        for (const next of [...modes,...tabs]) {
          if(next.value) {
            await page.evaluate(id=>{ReactDOM.unmountComponentAtNode(document.getElementById('slot'));__mount(id,false,{},false);},id);
            await page.locator('nav select').selectOption(next.value);
          }
          else await page.locator('[id="'+next.id+'"]').click();
          const exploration=page.locator('[data-ratio-exploration]');
          if(await exploration.count()) await exploration.locator(':scope > summary').click();
          await page.waitForTimeout(80);
          for (const width of [1280,process.argv.includes('--compact')?320:375]) {
            await page.setViewportSize({width,height:1000});
            const review = await inspect(page,file,next.label,'light',width);
            results.push(review);
            if(width===375 && (review.overflow || review.violations.length)) await page.screenshot({path:path.join(OUT,file+'-'+next.label.replace(/[^a-z0-9]/gi,'_')+'-finding.png'),fullPage:true});
            fs.writeFileSync(path.join(OUT,'review.json'),JSON.stringify({results,errors},null,2));
          }
        }
      }
      for (const theme of ['dark','contrast']) {
        await page.setViewportSize({width:1280,height:1000});
        await page.evaluate(({id,theme,css}) => { ReactDOM.unmountComponentAtNode(document.getElementById('slot')); document.getElementById('slot').className='theme-'+theme; document.getElementById('host-theme').textContent=css; __mount(id,theme==='dark',{},theme==='contrast'); }, {id,theme,css:theme==='contrast'?hostCss('contrast'):''});
        results.push(await inspect(page,file,'default',theme,1280));
        await page.screenshot({path:path.join(OUT,file+'-'+theme+'.png'),fullPage:true});
      }
      await page.close();
      fs.writeFileSync(path.join(OUT,'review.json'),JSON.stringify({results,errors},null,2));
      console.log(file+': '+results.filter(r=>r.file===file).length+' views; '+results.filter(r=>r.file===file&&r.overflow).length+' overflow; '+results.filter(r=>r.file===file).reduce((n,r)=>n+r.violations.length,0)+' axe findings');
    }
  } finally { await browser.close(); }
  console.log('Review saved to '+OUT+'; runtime errors: '+errors.length);
})().catch(e=>{console.error(e);process.exitCode=1;});
