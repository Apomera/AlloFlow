// Focused DOM diagnosis for the first forced-color fit failure; no assertions weakened.
const fs=require('fs'),path=require('path');
let bootstrap=fs.readFileSync('dev-tools/ml_compound_lab_qa.cjs','utf8');
bootstrap=bootstrap.slice(0,bootstrap.indexOf('  try{')).replaceAll('reports/machinelab-compound-lab-2026-10-11/browser','reports/machinelab-compound-power-2026-10-11/browser/overflow-inspection');
bootstrap+=String.raw`
  try{
    await mount('screw',320,{contrast:true});await open(lab('screw'));await open(comparison('screw'));
    await input('screw','question').selectOption('firstLossPower');await press(action('screw','hint'));await press(action('screw','reveal'));
    await input('screw','answer').fill('55.556');await input('screw','unit').selectOption('W');await press(action('screw','check'));await press(action('screw','save'));
    await input('screw','duration').focus();await pg.keyboard.press('Tab');await pg.keyboard.press('Shift+Tab');
    const widths=await lab('screw').evaluate(el=>({documentWidth:document.documentElement.scrollWidth,viewport:innerWidth,panel:{scroll:el.scrollWidth,client:el.clientWidth},
      overflow:Array.from(el.querySelectorAll('*')).filter(child=>child.scrollWidth>child.clientWidth+1).map(child=>({tag:child.tagName,id:child.id,text:child.textContent.slice(0,100),value:child.value,scroll:child.scrollWidth,client:child.clientWidth,rect:child.getBoundingClientRect().toJSON(),
        styles:{display:getComputedStyle(child).display,whiteSpace:getComputedStyle(child).whiteSpace,overflowWrap:getComputedStyle(child).overflowWrap,width:getComputedStyle(child).width,padding:getComputedStyle(child).padding}}))}));
    widths.sourceSha256=require('crypto').createHash('sha256').update(tool).digest('hex');
    fs.writeFileSync(path.join(OUT,'overflow.json'),JSON.stringify(widths,null,2));console.log(JSON.stringify(widths,null,2));
  }finally{await b.close();}
})();`;
bootstrap+="`;\nvm.runInThisContext('(function(require){'+source+'\\n})',{filename:__filename})(require);";
process.argv[2]='reports/machinelab-compound-power-2026-10-11/browser/overflow-inspection';
new Function('require','__dirname','__filename',bootstrap)(require,path.resolve('dev-tools'),__filename);
