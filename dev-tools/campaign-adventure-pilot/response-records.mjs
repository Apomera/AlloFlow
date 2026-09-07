export function responseText(value){
  if(typeof value!=='string'||!value.trim()||value.trim().length>1200)throw Error('Write a response of 1 to 1,200 characters.');
  return value.trim();
}
export function validateResponses(raw,commands){
  if(!Array.isArray(raw)||raw.length>100)throw Error('Invalid saved written responses.');
  let prior=0,total=0;
  const responses=raw.map(r=>{
    if(!r||!Number.isInteger(r.revision)||r.revision<=prior||r.revision>commands.length||r.actionId!==commands[r.revision-1])throw Error('Written response does not match its saved decision.');
    const text=responseText(r.text);prior=r.revision;total+=text.length;
    return {revision:r.revision,actionId:r.actionId,text};
  });
  if(total>36000)throw Error('This journey has reached its written-response limit. Download the journal or continue using choices.');
  return responses;
}
