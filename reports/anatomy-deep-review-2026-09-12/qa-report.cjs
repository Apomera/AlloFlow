const fs=require('node:fs'),path=require('node:path');
const file=path.join(__dirname,'report.html');
let html=fs.readFileSync(file,'utf8');
const base='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/';
html=html.replace(/href="(C:\/[^\"]+)"/g,(_,v)=>'href="../../'+v.slice(base.length).replace(/:(\d+)$/,'#L$1')+'"');
fs.writeFileSync(file,html);
(async()=>{
 const browser=await require('playwright').chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:1000}});
 await page.goto(require('url').pathToFileURL(file).href);
 await page.screenshot({path:path.join(__dirname,'report-preview.png')});
 console.log(JSON.stringify({title:await page.title(),images:await page.locator('img').evaluateAll(a=>a.map(i=>({loaded:i.complete&&i.naturalWidth>0,src:i.getAttribute('src')}))),width:await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth}))}));
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
