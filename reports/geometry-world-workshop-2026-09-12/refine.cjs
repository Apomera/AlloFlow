const fs=require('fs'),vm=require('vm');
function edit(file,fn){let s=fs.readFileSync(file,'utf8'),crlf=s.includes('\r\n');s=s.replace(/\r\n/g,'\n');const change=(a,b)=>{if(s.split(a).length!==2)throw Error('Anchor '+a.slice(0,90));s=s.replace(a,b);};fn(change,()=>s,(next)=>s=next);new vm.Script(s);const b=Buffer.from(crlf?s.replace(/\n/g,'\r\n'):s),fd=fs.openSync(file,'r+');fs.writeSync(fd,b);fs.ftruncateSync(fd,b.length);fs.closeSync(fd);}
edit('stem_lab/stem_tool_geometryworld_builder.js',(r,get,set)=>{
 r("className:'gwe-details gwe-starter-library gwe-stamp-library'","className:'gwe-details gwe-starter-library'");
 set(get().replaceAll('.gwe-stamp-library .gwe-stamp-card',':is(.gwe-stamp-library,.gwe-starter-library) .gwe-stamp-card'));
 r("if(marquee){marquee.remove();marquee=null;}","if(marquee){marquee.remove();marquee=null;}");
 r("    function wheel(e){",`    var cameraActions={
      zoom:function(factor){var offset=engine.camera.position.clone().sub(target);offset.setLength(Math.max(2,Math.min(140,offset.length()*factor)));engine.camera.position.copy(target).add(offset);look();},
      pan:function(dx,dy){var shift=new THREE.Vector3(dx,dy,0).applyQuaternion(engine.camera.quaternion);target.add(shift);engine.camera.position.add(shift);look();}
    };
    engine._workshopCameraActions=cameraActions;
    function wheel(e){`);
 r("canvas.style.touchAction=oldTouch;canvas.style.cursor=oldCursor;","canvas.style.touchAction=oldTouch;canvas.style.cursor=oldCursor;if(engine._workshopCameraActions===cameraActions)delete engine._workshopCameraActions;");
 r("var canvas=engine.renderer.domElement;if(a[0].indexOf('Pan')===0){var v=new window.THREE.Vector3(a[1],0,0).applyQuaternion(engine.camera.quaternion);engine.camera.position.add(v);}else canvas.dispatchEvent(new WheelEvent('wheel',{deltaY:a[1]*500,cancelable:true}));","var actions=engine._workshopCameraActions;if(actions){if(a[0].indexOf('Pan')===0)actions.pan(a[1],0);else actions.zoom(Math.exp(a[1]));}");
 r("engine._entryAnim=null;engine._viewPresetAnim=null;engine.flyMode=true;","engine._entryAnim=null;engine._viewPresetAnim=null;if(engine._creationFocus)engine._creationFocus.manual=true;engine.flyMode=true;");
});
edit('stem_lab/stem_tool_geometryworld.js',(r)=>{
 r("            // Low greenery ties architecture to the existing distant meadow.",`            // Limestone inlays and warm entry lanterns make the courtyard legible
            // from the first camera view. All detail remains outside the build plot.
            var brass=color(0xd6b571),terracotta=color(0xb57459),ivory=color(0xf4e1b1);
            for(var seam=0;seam<13;seam++)box(timber,cx-6.5+seam,floor+.125,north-1.2,.025,.012,2.1,lightWood);
            [west,east].forEach(function(x,side){
              var entry=z1-1.3;
              box(stone,x-.38,floor+.03,entry,.76,.25,.76,edge);
              box(timber,x-.085,floor+.28,entry+.29,.17,2.5,.17,wood);
              box(timber,x-.29,floor+2.62,entry+.08,.58,.12,.58,brass);
              box(stone,x-.22,floor+2.74,entry+.15,.44,.48,.44,ivory);
              box(timber,x-.30,floor+3.22,entry+.07,.60,.10,.60,wood);
              box(stone,x-.52,floor+.03,z0-1.6,1.04,.5,1.04,terracotta);
              crown(plants,x,floor+.5,z0-1.08,.62,.75,sage,side*.7,9+side);
              for(var joint=0;joint<8;joint++)box(timber,x-1.03,floor+.035,z0+1+joint*(z1-z0-2)/8,2.06,.018,.026,lightWood);
            });
            // Pennants add a warm accent without textures, motion, or extra draws.
            for(var flag=0;flag<5;flag++){
              var fx=cx-4.8+flag*2.4;
              triangle(timber,[fx,floor+3.92,north+.01],[fx+.75,floor+3.92,north+.01],[fx+.375,floor+3.15,north+.01],flag%2?brass:terracotta);
            }
            // Low greenery ties architecture to the existing distant meadow.`);
 r("      + 'The final activity should reuse earlier ideas in a design the student can showcase or send to Print Lab.\\n';",`      + 'From the second activity onward, explicitly reuse one earlier measurement, explanation, or student design decision. Offer a choice between a supported continuation and a stretch redesign; both must remain accessible along the walkable route. '
      + 'Give each stop a visible purpose in the setting: repair a bridge design, plan a garden bed, furnish a market shelter, or extend a lookout. Describe the change through editable student construction, never claim scripted unlocks or automatic gates. '
      + 'Activity markers turn green and gold when the learner records a self-review or meets an explicit numeric check. Explain this as recorded progress, not automatic grading of the whole design. '
      + 'The final activity should reuse earlier ideas in a design the student can showcase or send to Print Lab.\\n';`);
});
console.log('Refined gallery isolation, direct camera behavior, garden art, and lesson continuity.');
