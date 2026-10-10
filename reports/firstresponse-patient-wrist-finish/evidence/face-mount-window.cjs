// Extend only the existing mount waits; predicates and arguments are forwarded unchanged.
async function runMountWithWaitWindow(page,mount){
  const original=page.waitForFunction,adjusted=[];
  page.waitForFunction=function(predicate,arg,options){
    const next=options&&options.timeout===30000?{...options,timeout:120000}:options;
    if(next!==options)adjusted.push({beforeMs:options.timeout,afterMs:next.timeout});
    return original.call(this,predicate,arg,next);
  };
  try{await mount();return {adjustedWaits:adjusted.length,waits:adjusted,waitPredicateUnchanged:true};}
  finally{page.waitForFunction=original;}
}
module.exports={runMountWithWaitWindow};
