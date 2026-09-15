          // A small architectural foreground gives Free Build a recognizable home.
          // Every vertex stays beyond the editable floor; these merged meshes never
          // enter block maps, hit tests, measurements, saves or printer exports.
          function addBuilderCourtyard(group, x0, x1, z0, z1, floor, saver) {
            if (!engine._currentLesson || !engine._currentLesson.sandbox || engine._currentLesson.builderGarden === false) return;
            var stone=buffer(),timber=buffer(),plants=buffer();
            var limestone=color(0xb9b79a),edge=color(0x8e967d),wood=color(0x77634c),lightWood=color(0xa49068);
            var leaf=color(0x577c5e),sage=color(0x86a27a),soil=color(0x5e6550),bloom=[color(0xd9bc88),color(0xc5a8aa),color(0xd5ddbd)];
            var cx=(x0+x1+1)/2,north=z0-3.9,west=x0-3.3,east=x1+4.3;
            function box(out,x,y,z,w,h,d,tint){
              var p=[[x,y,z],[x+w,y,z],[x+w,y+h,z],[x,y+h,z],[x,y,z+d],[x+w,y,z+d],[x+w,y+h,z+d],[x,y+h,z+d]];
              [[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]].forEach(function(f){triangle(out,p[f[0]],p[f[1]],p[f[2]],tint);triangle(out,p[f[0]],p[f[2]],p[f[3]],tint);});
            }
            function planter(x,z,w,d,seed){
              box(stone,x,floor-.10,z,w,.56,d,limestone);
              box(plants,x+.12,floor+.47,z+.12,w-.24,.04,d-.24,soil);
              var count=saver?4:8;
              for(var i=0;i<count;i++){
                var px=x+.28+(w-.56)*(i+.5)/count,pz=z+d*.5+Math.sin(i*2.3+seed)*Math.max(0,d*.23);
                crown(plants,px,floor+.5,pz,.21,.38,leaf,i,seed+i);
                crown(plants,px+.05,floor+.82,pz,.17,.19,bloom[(i+seed)%3],i+.3,seed+i);
              }
            }
            // A terrace and slender colonnade frame the far end of the lawn.
            box(stone,cx-7.3,floor-.25,north-1.5,14.6,.28,2.7,edge);
            box(stone,cx-7,floor-.02,north-1.25,14,.14,2.25,limestone);
            for(var post=0;post<4;post++){
              var px=cx-5.8+post*3.86;
              box(stone,px-.19,floor+.12,north-.31,.66,.24,.66,edge);
              box(timber,px,floor+.36,north-.12,.28,3.75,.28,wood);
            }
            box(timber,cx-6.3,floor+4,north-.28,12.8,.32,.52,wood);
            box(timber,cx-6.3,floor+4.34,north-1.15,12.8,.12,.18,lightWood);
            var slats=saver?8:16;
            for(var slat=0;slat<slats;slat++)box(timber,cx-6.25+slat*12.5/(slats-1),floor+4.24,north-1.26,.13,.15,2.16,lightWood);
            // A repeated geometric emblem reads as a destination from across the plot.
            box(timber,cx-.9,floor+4.45,north-.05,1.8,.15,.2,wood);
            box(timber,cx-.9,floor+4.45,north-.05,.15,1.5,.2,wood);
            box(timber,cx+.75,floor+4.45,north-.05,.15,1.5,.2,wood);
            box(timber,cx-.9,floor+5.8,north-.05,1.8,.15,.2,wood);
            box(stone,cx-.43,floor+4.85,north+.03,.86,.68,.34,limestone);
            planter(cx-6.8,north+.28,3.1,.82,0);planter(cx+3.7,north+.28,3.1,.82,1);
            // Side walks are deliberately broken into short runs and leave corners open.
            [west,east].forEach(function(x,side){
              box(stone,x-1.05,floor-.13,z0+.8,2.1,.16,z1-z0-1,limestone);
              for(var i=0;i<3;i++){
                var z=z0+2+i*(z1-z0-6)/2;
                planter(x-.85,z,1.7,1.1,side+i+2);
                box(timber,x-.74,floor+.18,z+1.8,1.48,.18,.54,wood);
                box(stone,x-.60,floor-.02,z+1.86,.15,.2,.42,edge);
                box(stone,x+.45,floor-.02,z+1.86,.15,.2,.42,edge);
              }
            });
            // Low greenery ties architecture to the existing distant meadow.
            for(var shrub=0;shrub<(saver?4:8);shrub++){
              var side=shrub%2,x=side?east+1.6:west-1.6,z=z0+1+Math.floor(shrub/2)*5.5;
              crown(plants,x,floor-.08,z,.72,.75,leaf,shrub*.7,shrub);
              crown(plants,x+.16,floor+.30,z,.52,.53,sage,shrub*.7+.3,shrub+2);
            }
            [[stone,'gw-builder-courtyard-stone'],[timber,'gw-builder-courtyard-timber'],[plants,'gw-builder-courtyard-garden']].forEach(function(item){
              var mesh=meshFrom(item[0],item[1],false,false);mesh.userData.gwBuilderCourtyard=true;mesh.receiveShadow=true;group.add(mesh);
            });
            group.userData.builderCourtyard={style:'garden-workshop',drawCalls:3,tier:saver?'saver':'detail',plotClear:true};
          }
