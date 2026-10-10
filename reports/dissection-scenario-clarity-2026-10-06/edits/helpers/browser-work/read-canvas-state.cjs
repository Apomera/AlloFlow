const fs=require('fs'),path=require('path'),src=fs.readFileSync(path.join(__dirname,'../source-work/renderer-next.js'),'utf8'),lines=src.split('\n');
for(const[a,b]of [[8028,8085],[8485,8535],[4740,4775]])console.log(JSON.stringify({lines:[a+1,b],excerpt:lines.slice(a,b).join('\n')}));
for(const needle of ['requestAnimationFrame(function','canvasRefNode =','workspaceMode =','d = canvas._drawD']){const found=lines.map((l,i)=>l.includes(needle)?i:-1).filter(i=>i>=0);for(const i of found)console.log(JSON.stringify({needle,line:i+1,excerpt:lines.slice(Math.max(0,i-3),i+7).join('\n')}));}
