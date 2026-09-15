const fs=require('fs'),vm=require('vm');
function edit(file,fn){const raw=fs.readFileSync(file,'utf8'),crlf=raw.includes('\r\n');let s=fn(raw.replace(/\r\n/g,'\n'));new vm.Script(s);const out=crlf?s.replace(/\n/g,'\r\n'):s,fd=fs.openSync(file,'r+');fs.writeSync(fd,out);fs.ftruncateSync(fd,Buffer.byteLength(out));fs.closeSync(fd);}
edit('stem_lab/stem_tool_geometryworld.js',s=>{function r(a,b){if(!s.includes(a)||s.indexOf(a)!==s.lastIndexOf(a))throw Error(a);s=s.replace(a,b);}
r('triangle(stone,apronPoint(a,ring),apronPoint(b,ring),apronPoint(c,ring+1));triangle(stone,apronPoint(b,ring),apronPoint(d,ring+1),apronPoint(c,ring+1));','triangle(stone,apronPoint(a,ring),apronPoint(c,ring+1),apronPoint(b,ring));triangle(stone,apronPoint(b,ring),apronPoint(c,ring+1),apronPoint(d,ring+1));');
r('            orchard.forEach(function(p,index){',`            function broadCrown(x,y,z,radius,height,tint,seed){
              var count=saver?6:9,rows=[.10,.62,1,.82,.06],grid=[];
              rows.forEach(function(rad,row){var t=row/(rows.length-1),shade=tint.clone().lerp(sage,t*.28);grid.push(Array.from({length:count},function(_,i){var angle=i/count*Math.PI*2+seed*.2,r=radius*rad*(1+Math.sin(i*1.7+seed)*.12);return [x+Math.cos(angle)*r,y+t*height,z+Math.sin(angle)*r,shade.r,shade.g,shade.b];}));});
              for(var row=0;row<grid.length-1;row++)for(var i=0;i<count;i++){var next=(i+1)%count;triangle(plants,grid[row][i],grid[row+1][i],grid[row][next]);triangle(plants,grid[row][next],grid[row+1][i],grid[row+1][next]);}
            }
            orchard.forEach(function(p,index){`);
r("                crown(plants,bx,height-.7,bz,1.55,1.25,leaf,index+branch*.6,index+branch);\n                crown(plants,bx+.12,height+.2,bz,1.22,1.05,olive,index+branch*.6,index+branch+1);", "                broadCrown(bx,height-1,bz,1.45,2.2,branch%2?olive:leaf,index+branch);");
r("              crown(plants,tx,height+.85,tz,1.12,.9,index===1?goldLeaf:sage,index,index+3);", "              broadCrown(tx,height+.35,tz,1.4,1.9,index===1?goldLeaf:olive,index+3);");return s;});
edit('stem_lab/stem_tool_geometryworld_builder.js',s=>{function r(a,b){if(!s.includes(a)||s.indexOf(a)!==s.lastIndexOf(a))throw Error(a);s=s.replace(a,b);}
r("root.appendChild(svg);document.body.appendChild(root);", "root.appendChild(svg);function attach(){(document.fullscreenElement||document.body).appendChild(root);}attach();document.addEventListener('fullscreenchange',attach);");
r("release();root.remove();events.forEach", "release();root.remove();document.removeEventListener('fullscreenchange',attach);events.forEach");
// Hidden document overlays must not remain keyboard reachable on modal or lesson changes.
r("if(disposed)return;var rect=canvas.getBoundingClientRect();", "if(disposed)return;if(engine._destroyed){root.hidden=true;return;}var rect=canvas.getBoundingClientRect();");
return s;});console.log('Corrected apron faces, rounded orchard crowns, and fullscreen handle ownership.');
