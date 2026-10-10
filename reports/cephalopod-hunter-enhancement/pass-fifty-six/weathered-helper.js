        function createCLHuntDenWeatheredGeometry(T,radius,widthSegments,heightSegments,variant){
          // Chamfer the accepted stones inward without changing their support
          // heights, overall boxes, doorway or seeded dive randomness.
          var original=createCLHuntDenRockGeometry(T,radius,widthSegments,heightSegments,variant);
          var source=original.attributes.position,roof=radius===1,bands=roof?3:4,rings=[],positions=[],uvs=[],indices=[];
          function point(index){return [source.getX(index),source.getY(index),source.getZ(index)];}
          for(var row=0;row<=bands;row++){
            var accepted=[],ring=[];
            for(var corner=0;corner<8;corner++)accepted.push(point(row===bands?((bands-1)*8+corner)*4+1:(row*8+corner)*4));
            for(var corner=0;corner<8;corner++){
              var center=accepted[corner],before=accepted[(corner+7)%8],after=accepted[(corner+1)%8];
              var cut=0.20+0.04*Math.sin(variant*1.37+corner*1.79);
              ring.push([center[0]+(before[0]-center[0])*cut,center[1]+(before[1]-center[1])*cut,center[2]+(before[2]-center[2])*cut]);
              ring.push([center[0]+(after[0]-center[0])*cut,center[1]+(after[1]-center[1])*cut,center[2]+(after[2]-center[2])*cut]);
            }
            rings.push(ring);
          }
          function vertex(value,u,v){var id=positions.length/3;positions.push(value[0],value[1],value[2]);uvs.push(u,v);return id;}
          for(var band=0;band<bands;band++)for(var side=0;side<16;side++){
            var next=(side+1)%16,start=positions.length/3;
            vertex(rings[band][side],0,0);vertex(rings[band+1][side],0,1);vertex(rings[band+1][next],1,1);vertex(rings[band][next],1,0);
            indices.push(start,start+1,start+2,start,start+2,start+3);
          }
          var sideCount=positions.length/3;
          for(var cap=0;cap<2;cap++){
            var capRing=rings[cap?bands:0],center=point(bands*32+cap*24);
            for(var face=0;face<16;face++){
              var first=cap?capRing[(face+1)%16]:capRing[face],second=cap?capRing[face]:capRing[(face+1)%16],start=positions.length/3;
              vertex(center,0.5,0.5);vertex(first,first[0]/(2*radius)+0.5,first[2]/(2*radius)+0.5);vertex(second,second[0]/(2*radius)+0.5,second[2]/(2*radius)+0.5);indices.push(start,start+1,start+2);
            }
          }
          // Reuse the original geometry so Three creates exactly the same UUID
          // and consumes the same global random draws as the accepted factory.
          var geometry=original;geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.deleteAttribute('normal');geometry.computeVertexNormals();
          // Only shallow side creases soften. Cap boundaries and pronounced
          // fractures retain their own normals, including each flat sole.
          var p=geometry.attributes.position,n=geometry.attributes.normal,acceptedNormals=n.array.slice(),coincident=Object.create(null),creaseCos=Math.cos(Math.PI/5);
          for(var vertexIndex=0;vertexIndex<sideCount;vertexIndex++){
            var key=p.getX(vertexIndex)+','+p.getY(vertexIndex)+','+p.getZ(vertexIndex);
            if(!coincident[key])coincident[key]=[];coincident[key].push(vertexIndex);
          }
          Object.keys(coincident).forEach(function(key){
            var peers=coincident[key];
            for(var member=0;member<peers.length;member++){
              var index=peers[member],nx=acceptedNormals[index*3],ny=acceptedNormals[index*3+1],nz=acceptedNormals[index*3+2],sx=0,sy=0,sz=0;
              for(var other=0;other<peers.length;other++){
                var at=peers[other]*3,ox=acceptedNormals[at],oy=acceptedNormals[at+1],oz=acceptedNormals[at+2];
                if(nx*ox+ny*oy+nz*oz>=creaseCos){sx+=ox;sy+=oy;sz+=oz;}
              }
              var length=Math.hypot(sx,sy,sz);if(length>0)n.setXYZ(index,sx/length,sy/length,sz/length);
            }
          });
          geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
        }
