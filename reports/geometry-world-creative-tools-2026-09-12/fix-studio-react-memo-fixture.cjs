const fs=require('node:fs'),path=require('node:path');const file=path.resolve(__dirname,'../../tests/geometry_world_studio_presentation.test.js');const raw=fs.readFileSync(file,'utf8'),crlf=raw.includes('\r\n');let text=raw.replace(/\r\n/g,'\n');
const anchor='    useState(value){return [value,()=>{}];},useEffect(){},isValidElement(node){return !!node?.props;},';
if(text.indexOf(anchor)<0||text.indexOf(anchor)!==text.lastIndexOf(anchor))throw Error('Expected one Studio React fixture anchor');
text=text.replace(anchor,'    // This fixture performs one render: memo factories run on that initial render.\n    useMemo(factory){return factory();},\n'+anchor);
if(crlf)text=text.replace(/\n/g,'\r\n');const fd=fs.openSync(file,'r+');try{fs.writeSync(fd,text,0,'utf8');fs.ftruncateSync(fd,Buffer.byteLength(text));}finally{fs.closeSync(fd);}console.log('Studio React fixture supports useMemo; production and assertions unchanged.');
