        function onClick(e){
          if(gameState.paused||gameState.gameOver||inspection.active||capabilities.diet==='detritus')return;
          var rect=canvasEl.getBoundingClientRect();pointerPoint.set((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2);
          targetRay.setFromCamera(pointerPoint,camera);var candidates=preyCandidates();
          var hits=targetRay.intersectObjects(candidates,true);
          if(!hits.length)return;
          var obj=hits[0].object;while(obj.parent && candidates.indexOf(obj)<0)obj=obj.parent;
          selectedPrey=obj;explicitTarget=true;gameState.observationUntil=0;
          updateTrackedPrey();updateMission();clAnnounce(clHuntInputCue('Target selected. Move into range and press E.','Target selected. Move into range and tap Strike / hold.'));canvasEl.focus();
        }
