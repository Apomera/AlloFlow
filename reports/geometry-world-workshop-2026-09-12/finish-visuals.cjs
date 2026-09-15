const fs=require('fs'),vm=require('vm'),file='stem_lab/stem_tool_geometryworld_builder.js';let s=fs.readFileSync(file,'utf8'),crlf=s.includes('\r\n');s=s.replace(/\r\n/g,'\n');
function r(a,b){if(s.split(a).length!==2)throw Error('Anchor '+a.slice(0,80));s=s.replace(a,b);}
s=s.replaceAll('setProjectNotice(', 'publishProjectNotice(');
r("      var _projectChoice=React.useState('')",`      var projectNoticeRef=React.useRef(projectNotice);
      function publishProjectNotice(message){if(projectNoticeRef.current!==message){projectNoticeRef.current=message;setProjectNotice(message);}}
      var _projectChoice=React.useState('')`);
const a=s.indexOf("      var faces=b.shape==='halfA'?"),b=s.indexOf('\n    });',a);if(a<0||b<a)throw Error('SVG faces');
s=s.slice(0,a)+`      // Include every face before rotation. Choosing visible faces afterwards
      // prevents a rotated roof's hidden end cap painting over its sloping top.
      var faces=b.shape==='halfA'?[
        [[0,0,0],[1,1,0],[1,1,1],[0,0,1]],[[1,0,0],[1,0,1],[1,1,1],[1,1,0]],[[0,0,1],[1,0,1],[1,1,1]],[[0,0,0],[1,1,0],[1,0,0]],[[0,0,0],[1,0,0],[1,0,1],[0,0,1]]
      ]:b.shape==='quarter'?[
        [[0,0,0],[.5,.5,0],[.5,.5,1],[0,0,1]],[[.5,.5,0],[1,0,0],[1,0,1],[.5,.5,1]],[[0,0,1],[1,0,1],[.5,.5,1]],[[0,0,0],[.5,.5,0],[1,0,0]],[[0,0,0],[1,0,0],[1,0,1],[0,0,1]]
      ]:[[[0,height,0],[1,height,0],[1,height,1],[0,height,1]],[[1,0,0],[1,0,1],[1,height,1],[1,height,0]],[[0,0,1],[1,0,1],[1,height,1],[0,height,1]],[[0,0,0],[0,height,0],[0,height,1],[0,0,1]],[[0,0,0],[1,0,0],[1,height,0],[0,height,0]],[[0,0,0],[1,0,0],[1,0,1],[0,0,1]]];
      function rotate(v){var x=v[0]-.5,z=v[2]-.5;for(var turn=0;turn<normalizedRotation(b.rotation);turn++){var old=x;x=z;z=-old;}return [x+.5,v[1],z+.5];}
      var center=rotate([b.shape==='halfA'?2/3:.5,b.shape==='halfA'?1/3:b.shape==='quarter'?1/6:height/2,.5]);
      faces.forEach(function(face){
        var vertices=face.map(rotate),u=vertices[1].map(function(v,i){return v-vertices[0][i];}),v=vertices[2].map(function(v,i){return v-vertices[0][i];}),normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],mid=[0,0,0];
        vertices.forEach(function(p){p.forEach(function(n,i){mid[i]+=n/vertices.length;});});
        if(normal.reduce(function(sum,n,i){return sum+n*(mid[i]-center[i]);},0)<0)normal=normal.map(function(n){return -n;});
        if(normal[0]+normal[1]+normal[2]<=.000001)return;
        projected.push({color:Object.prototype.hasOwnProperty.call(palette,b.type)?palette[b.type]:palette.stone,shade:normal[1]>0?0:normal[0]>0?1:2,points:vertices.map(function(v){return point(b.x+v[0],b.y+v[1],b.z+v[2]);})});
      });`+s.slice(b);
new vm.Script(s);const data=Buffer.from(crlf?s.replace(/\n/g,'\r\n'):s),fd=fs.openSync(file,'r+');fs.writeSync(fd,data);fs.ftruncateSync(fd,data.length);fs.closeSync(fd);console.log('Unchanged save statuses avoid rerenders; rotated shape thumbnails cull hidden faces.');
