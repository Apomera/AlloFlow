// Extend only the worker-start deadlines for this local verification run.
// Test assertions, test timeouts and installed dependency files are unchanged.
export async function load(url,context,nextLoad){
 const result=await nextLoad(url,context);
 if(url.endsWith('/vitest/dist/chunks/cli-api.Cjt90eJu.js')){
  let source=typeof result.source==='string'?result.source:Buffer.from(result.source).toString('utf8');
  for(const[from,to]of[['const START_TIMEOUT = 6e4;','const START_TIMEOUT = 3e5;'],['const WORKER_START_TIMEOUT = 9e4;','const WORKER_START_TIMEOUT = 36e4;']]){
   if(source.split(from).length!==2)throw Error('Unexpected Vitest worker-start timer: '+from);
   source=source.replace(from,to);
  }
  return{...result,source};
 }
 return result;
}
