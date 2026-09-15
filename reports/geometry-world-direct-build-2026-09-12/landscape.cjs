'use strict';
const fs=require('fs'),vm=require('vm'),file='stem_lab/stem_tool_geometryworld.js',raw=fs.readFileSync(file,'utf8'),crlf=raw.includes('\r\n');let s=raw.replace(/\r\n/g,'\n');
function rep(a,b){if(!s.includes(a)||s.indexOf(a)!==s.lastIndexOf(a))throw Error(a);s=s.replace(a,b);}
rep('elevation = 7 + peak(t, 0.16, 0.35) * 23 + peak(t, 1.85, 0.39) * 28 + peak(t, 3.55, 0.3) * 22 + peak(t, 5.1, 0.38) * 31 + n * 3;', 'elevation = 5 + peak(t, 0.16, 0.52) * 14 + peak(t, 1.85, 0.58) * 17 + peak(t, 3.55, 0.49) * 13 + peak(t, 5.1, 0.56) * 18 + n * 2;');
rep('elevation = 20 + peak(t, 0.9, 0.32) * 29 + peak(t, 2.35, 0.27) * 25 + peak(t, 4.15, 0.33) * 32 + peak(t, 5.65, 0.28) * 23;', 'elevation = 12 + peak(t, 0.9, 0.45) * 20 + peak(t, 2.35, 0.41) * 17 + peak(t, 4.15, 0.49) * 22 + peak(t, 5.65, 0.42) * 16;');
rep("            // A terrace and slender colonnade frame the far end of the lawn.",`            // A shallow planted apron joins the raised plot to the meadow. Its
            // innermost vertices remain outside the editable rectangle.
            var apronTop=color(0x6d8d58),apronLow=color(0x496d46),rings=[.06,1.4,3.2,5.7];
            function apronCorner(index,d){return [[x0-d,z0-d],[x0-d,z1+1+d],[x1+1+d,z1+1+d],[x1+1+d,z0-d]][index];}
            for(var ring=0;ring<rings.length-1;ring++)for(var side=0;side<4;side++){
              var next=(side+1)%4,a=apronCorner(side,rings[ring]),b=apronCorner(next,rings[ring]),c=apronCorner(side,rings[ring+1]),d=apronCorner(next,rings[ring+1]);
              function apronPoint(p,r){var t=r/(rings.length-1),y=(floor-.02)*(1-smooth(t))-.025*smooth(t),tint=apronTop.clone().lerp(apronLow,smooth(t));return [p[0],y,p[1],tint.r,tint.g,tint.b];}
              triangle(stone,apronPoint(a,ring),apronPoint(b,ring),apronPoint(c,ring+1));triangle(stone,apronPoint(b,ring),apronPoint(d,ring+1),apronPoint(c,ring+1));
            }
            // A terrace and slender colonnade frame the far end of the lawn.`);
rep("            // Low greenery ties architecture to the existing distant meadow.",`            // Broad, clustered tree crowns frame the courtyard at human scale.
            // Their trunks and foliage reuse the existing three merged meshes.
            var orchard=[[x0-8,z0-5],[x1+9,z0-5],[x0-8,z1-3],[x1+9,z1-3]],olive=color(0x67875b),goldLeaf=color(0xadb574);
            orchard.forEach(function(p,index){
              var tx=p[0],tz=p[1],height=4.1+(index%2)*.6;
              trunk(timber,tx,-.02,tz,.23,height,wood,index);
              for(var branch=0;branch<(saver?3:5);branch++){
                var angle=branch*Math.PI*2/(saver?3:5)+index*.4,bx=tx+Math.cos(angle)*.8,bz=tz+Math.sin(angle)*.8;
                crown(plants,bx,height-.7,bz,1.55,1.25,leaf,index+branch*.6,index+branch);
                crown(plants,bx+.12,height+.2,bz,1.22,1.05,olive,index+branch*.6,index+branch+1);
              }
              crown(plants,tx,height+.85,tz,1.12,.9,index===1?goldLeaf:sage,index,index+3);
              // Static contact shade remains present in Battery saver.
              var shadow=color(0x3f6144);
              for(var sector=0;sector<12;sector++){var a=sector*Math.PI/6,b=(sector+1)*Math.PI/6;triangle(stone,[tx,-.019,tz],[tx+Math.cos(b)*2.3,-.019,tz+Math.sin(b)*1.6],[tx+Math.cos(a)*2.3,-.019,tz+Math.sin(a)*1.6],shadow);}
            });
            // Low greenery ties architecture to the existing distant meadow.`);
rep('mesh.userData.gwBuilderCourtyard=true;mesh.receiveShadow=true;group.add(mesh);','mesh.userData.gwBuilderCourtyard=true;mesh.receiveShadow=true;mesh.castShadow=true;group.add(mesh);');
new vm.Script(s);fs.writeFileSync(__dirname+'/core-before.js',raw);const out=crlf?s.replace(/\n/g,'\r\n'):s,fd=fs.openSync(file,'r+');fs.writeSync(fd,out);fs.ftruncateSync(fd,Buffer.byteLength(out));fs.closeSync(fd);console.log('Refined ridgelines, meadow apron, orchard, and courtyard shadows.');
