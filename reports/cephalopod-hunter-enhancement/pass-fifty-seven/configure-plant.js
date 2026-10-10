      function createCLHuntPlantFlex(THREE,mesh,height,surfaceSupported) {
        var motion={value:new THREE.Vector4(0,0,height,0)},finish=surfaceSupported===true;
        if(finish){
          // One immutable scalar buffer distinguishes thin tissue from the independently closed floats.
          var ribbon=new Float32Array(mesh.geometry.attributes.position.count);ribbon.fill(1);
          var floats=mesh.geometry.userData.clKelpBladders;
          if(floats)floats.parts.forEach(function(part){ribbon.fill(0,part.vertexStart,part.vertexStart+part.vertexCount);});
          mesh.geometry.setAttribute('clPlantRibbon',new THREE.Float32BufferAttribute(ribbon,1));
          mesh.material.extensions=Object.assign({},mesh.material.extensions,{derivatives:true});
        }
        mesh.material.onBeforeCompile=function(shader){shader.uniforms.clPlantMotion=motion;shadeCLHuntPlantFlex(shader);if(finish)shadeCLHuntPlantSurface(shader);};
        mesh.material.customProgramCacheKey=function(){return finish?'cl-plant-flex-v57-tissue':'cl-plant-flex-v28-water-pulse';};
        // Grass already disables frustum culling for its distributed instances. Kelp needs
        // a conservative static box/sphere enclosing every possible shader bend.
        if(mesh.frustumCulled){var box=mesh.geometry.boundingBox;box.min.x-=height*0.12;box.max.x+=height*0.12;box.min.z-=height*0.035;box.max.z+=height*0.035;box.getBoundingSphere(mesh.geometry.boundingSphere);}
        return motion;
      }
