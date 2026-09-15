const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('ai_backend_module.js','utf8');
const begin=src.indexOf('const SEARCH_TRACE_LIMIT ='),end=src.indexOf('// ─── END WEB SEARCH PROVIDER');
if(begin<0||end<0)throw Error('Search provider boundary missing');
const window={location:{hostname:'test.googleusercontent.com',href:'https://test.googleusercontent.com/',origin:'https://test.googleusercontent.com'},ALLOFLOW_CANVAS_SEARCH_PROXY:'https://alloflow-catalog-submit.aaron-pomeranz.workers.dev/search',localStorage:{getItem:()=>null}};
const requests=[];
const transport=async(url,options)=>{requests.push({url,method:options?.method||'GET'});return fetch(url,options);};
vm.runInNewContext(src.slice(begin,end),{window,console:{log(){},warn(){},error(){}},navigator:{onLine:true},localStorage:window.localStorage,fetch:transport,URL,AbortSignal,AbortController,setTimeout,clearTimeout});
(async()=>{
 const results=[];
 for(const query of ['site.usgs.gov soil infiltration runoff','site:usgs.gov soil infiltration runoff']){
   if(query.startsWith('site.'))continue;
   const value=await window.WebSearchProvider.search(query,3,query);
   results.push({query,source:value.source||null,offline:!!value.offline,noTransport:!!value.noTransport,results:value.results||[]});
 }
 const report={checkedAt:new Date().toISOString(),realNetwork:true,syntheticQueryOnly:true,transport:'existing WebSearchProvider, Canvas compatibility proxy',requests,results,limitations:['This verifies retrieval, not AI generation, classroom usefulness, publication dates, or truth of every search snippet.','Node transport does not verify browser CORS.']};
 fs.writeFileSync(__dirname+'/live-search-results.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({requests:requests.length,sources:results.map(x=>x.source),resultCounts:results.map(x=>x.results.length)}));
})().catch(()=>{console.error('Search check could not complete.');process.exitCode=1;});
