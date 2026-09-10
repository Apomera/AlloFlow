'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const { chromium }=require(path.join(root,'node_modules/playwright'));
const { inspectHtml }=require(path.join(root,'dev-tools/document_export_at_acceptance.cjs'));
const doc=(body,head='')=>'<!doctype html><html lang="en"><head><title>Export probe</title>'+head+'</head><body><main>'+body+'</main></body></html>';
const basic={title:'Export probe',language:'en',headings:[],readingOrder:['Read this.'],tables:[]};
const table=(attributes='',value='Sunlight')=>'<table '+attributes+'><caption>Field study</caption><tr><th scope="col">Area</th><th scope="col">Score</th></tr><tr><td>'+value+'</td><td>95</td></tr></table>';
const tableContract=value=>({...basic,readingOrder:['Field study','Area','Score',value,'95'],tables:[{caption:'Field study',headers:['Area','Score'],rows:[[value,'95']]}]});
const cases=[
 {id:'valid-table-control',html:doc(table()),expected:tableContract('Sunlight')},
 {id:'presentational-table',html:doc(table('role="presentation"')),expected:tableContract('Sunlight')},
 {id:'aria-hidden-table',html:doc(table('aria-hidden="true"')),expected:tableContract('Sunlight')},
 {id:'canonical-table-false-rejection',html:doc(table('', 'Cafe\u0301')),expected:tableContract('Cafe\u0301')},
 {id:'relative-css-background',html:doc('<p>Read this.</p><div id="chart" style="width:200px;height:100px;background-image:url(required-chart.png)"></div>'),expected:basic},
 {id:'inert-xml-data-block',html:doc('<p>Read this.</p><script type="application/xml">window.__inertScriptExecuted = true;</script>'),expected:basic},
];
(async()=>{
 const out=path.join(__dirname,'export-review-probes.json');if(fs.existsSync(out))throw Error('Evidence output exists');
 const browser=await chromium.launch({headless:true}),reports=[];
 try {for(const item of cases){
   const report=await inspectHtml(browser,'synthetic.html',item.expected,Buffer.from(item.html));
   const context=await browser.newContext({javaScriptEnabled:item.id==='inert-xml-data-block',serviceWorkers:'block'});
   let blocked=0;await context.route('**/*',route=>{blocked++;return route.abort('blockedbyclient')});
   let observed;
   try{const page=await context.newPage();await page.setContent(item.html);
     observed={tableRoles:await page.getByRole('table').count(),columnHeaderRoles:await page.getByRole('columnheader').count(),blocked,
       dom:await page.evaluate(()=>({bodyText:document.body.innerText,inertScriptExecuted:window.__inertScriptExecuted===true,background:document.querySelector('#chart')?getComputedStyle(document.querySelector('#chart')).backgroundImage:null}))};
   }finally{await context.close();}
   const result={...item,allChecksPassed:report.checks.every(check=>check.status==='passed'),report,independentBrowser:observed};reports.push(result);
   console.log(JSON.stringify({id:item.id,allChecksPassed:result.allChecksPassed,coverage:report.coverage,resources:report.resources,tableRoles:observed.tableRoles,columnHeaderRoles:observed.columnHeaderRoles,failures:report.checks.filter(c=>c.status!=='passed').map(c=>({id:c.id,status:c.status})),inertScriptExecuted:observed.dom.inertScriptExecuted}));
 }}finally{await browser.close();}
 fs.writeFileSync(out,JSON.stringify({kind:'read-only-export-bug-probes',implementationSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'dev-tools/document_export_at_acceptance.cjs'))).digest('hex'),reports},null,2)+'\n');
})().catch(error=>{console.error(error);process.exitCode=1;});
