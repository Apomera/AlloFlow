// school_rewards_print_check.cjs
// Print check: generates real Chromium PDFs of the manual and the quick cards and
// reports page counts plus the computed break rule of every block.
// Run from the repository root: node dev-tools/school_rewards_print_check.cjs
// Outputs go to scratch/ (gitignored). Registered in dev-tools/README.md.
// Generates real PDFs with Chromium and reports:
//   - page count per document
//   - any block that straddles a page break (a card, figure, table, or box
//     split across two sheets is the defect this is looking for)
// Letter, 0.5in margins => 7.5in x 10in content box = 720 x 960 CSS px at 96dpi.
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),url=require('url');
const PAGE_W=720,PAGE_H=960;
const DOCS=[
 {file:'school-rewards-quick-cards.html',out:'scratch/school-rewards-quick-cards.pdf',
  blocks:'section.card, section.card > ol > li, footer p',claim:null},
 {file:'school-rewards-manual.html',out:'scratch/school-rewards-manual.pdf',
  blocks:'figure, .tablewrap, .glance, blockquote, .good, h2, dl',claim:14},
];
function pdfPages(file){
 const buf=fs.readFileSync(file);const s=buf.toString('latin1');
 const m=s.match(/\/Type\s*\/Page[^s]/g);
 if(m&&m.length)return m.length;
 const c=s.match(/\/Count\s+(\d+)/);return c?Number(c[1]):null;
}
(async()=>{
 fs.mkdirSync('scratch',{recursive:true});
 const browser=await chromium.launch({headless:true});const report={};
 try{
  for(const doc of DOCS){
   const page=await browser.newPage({viewport:{width:PAGE_W,height:PAGE_H}});
   page.setDefaultTimeout(90000);
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(url.pathToFileURL(path.resolve(doc.file)).href,{waitUntil:'load'});
   await page.emulateMedia({media:'print'});
   // Lazy figures must be decoded before pagination, or the page count moves
   // between runs (measured 18 and 19 for the same file on 2026-09-05).
   await page.evaluate(async()=>{
     const imgs=[...document.images];
     imgs.forEach(i=>{i.loading='eager';if(!i.getAttribute('src'))return});
     await Promise.all(imgs.map(i=>i.complete?Promise.resolve():new Promise(r=>{i.onload=i.onerror=r})));
     await Promise.all(imgs.map(i=>i.decode?i.decode().catch(()=>{}):Promise.resolve()));
     await document.fonts.ready;
   });
   await page.waitForTimeout(300);
   await page.pdf({path:doc.out,format:'Letter',printBackground:true,
     margin:{top:'0.5in',bottom:'0.5in',left:'0.5in',right:'0.5in'}});
   const straddling=await page.evaluate(([sel,H])=>{
     const out=[];
     document.querySelectorAll(sel).forEach(el=>{
       const r=el.getBoundingClientRect();
       const top=r.top+window.scrollY,bottom=r.bottom+window.scrollY;
       if(bottom-top<8)return;
       const first=Math.floor(top/H),last=Math.floor((bottom-1)/H);
       if(first!==last){
         const cs=getComputedStyle(el);
         out.push({tag:el.tagName.toLowerCase()+(el.className&&typeof el.className==='string'?'.'+el.className.trim().split(/\s+/)[0]:''),
           text:(el.textContent||'').trim().replace(/\s+/g,' ').slice(0,60),
           height:Math.round(bottom-top),pages:[first+1,last+1],
           breakInside:cs.breakInside+'/'+cs.pageBreakInside});
       }
     });
     return out;
   },[doc.blocks,PAGE_H]);
   const flow=await page.evaluate(H=>({docHeight:document.documentElement.scrollHeight,estPages:Math.ceil(document.documentElement.scrollHeight/H)}),PAGE_H);
   report[doc.file]={pdfPages:pdfPages(doc.out),estPages:flow.estPages,claim:doc.claim,straddling,errors};
   await page.close();
  }
  console.log(JSON.stringify(report,null,1));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
