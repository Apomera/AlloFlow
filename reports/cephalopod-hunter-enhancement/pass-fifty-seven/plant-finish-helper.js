      // Static ribbon tissue follows authored UVs while the existing shader bends its normals.
      // A scalar mask excludes closed kelp floats. Backlight is an artistic thin-leaf approximation.
      function shadeCLHuntPlantSurface(shader) {
        shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float clPlantRibbon; varying vec3 clPlantTissue;').replace('#include <begin_vertex>','#include <begin_vertex>\nclPlantTissue=vec3(uv,clPlantRibbon);');
        var fields=[
          'varying vec3 clPlantTissue;',
          'float clPlantTissueFilter(float footprint){return 1.0-smoothstep(0.35,1.20,max(0.0,footprint));}'
        ].join('\n');
        var sample=[
          'float clPlantRibbonWeight=clamp(clPlantTissue.z,0.0,1.0);',
          'float clPlantAcross=abs(clPlantTissue.x-0.5);',
          'float clPlantVeinAA=clPlantTissueFilter(fwidth(clPlantTissue.x)/0.057);',
          'float clPlantVein=(1.0-smoothstep(0.018,0.075,clPlantAcross))*clPlantVeinAA;',
          'float clPlantEdge=smoothstep(0.29,0.49,clPlantAcross);',
          'float clPlantGrainPhase=clPlantTissue.x*70.0+sin(clPlantTissue.y*11.0)*0.42;',
          'float clPlantGrainAA=clPlantTissueFilter(fwidth(clPlantGrainPhase));',
          'float clPlantGrain=sin(clPlantGrainPhase)*clPlantGrainAA;',
          'float clPlantTissueTone=1.0-0.070*clPlantVein+0.035*clPlantEdge+0.018*clPlantGrain;',
          'vec3 clPlantTissueTint=vec3(clPlantTissueTone)*(vec3(1.0)+clPlantEdge*vec3(0.020,0.015,-0.025));',
          'diffuseColor.rgb*=mix(vec3(1.0),clPlantTissueTint,clPlantRibbonWeight);'
        ].join('\n');
        var backlight=[
          '#if NUM_DIR_LIGHTS > 0',
          // Three supplies the actual sun colour multiplied by its current intensity in view space.
          // The double-sided normal faces the viewer, so an opposing light reveals the thin ribbon.
          'float clPlantBacklight=max(0.0,-dot(geometry.normal,directionalLights[0].direction));',
          'reflectedLight.directDiffuse+=diffuseColor.rgb*directionalLights[0].color*clPlantRibbonWeight*clPlantBacklight*(0.18+0.08*clPlantEdge);',
          '#endif'
        ].join('\n');
        shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+fields)
          .replace('#include <color_fragment>','#include <color_fragment>\n'+sample)
          .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,clamp(roughnessFactor-0.022+0.012*clPlantVein+0.006*clPlantGrain,0.82,0.98),clPlantRibbonWeight);')
          .replace('#include <lights_fragment_end>','#include <lights_fragment_end>\n'+backlight);
      }
