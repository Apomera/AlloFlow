    if (api.contrast) {
      // Separate the supporting hand from the cheek and reveal finger curves.
      // Keep the face, clothing, nails and teaching marks on their own finishes.
      var patientArmSkin = skin.clone(), patientContourStrength = { value: 1 };
      patientArmSkin.name = 'fr-patient-arm-skin';
      patientArmSkin.userData.frPatientContourStrength = patientContourStrength;
      patientArmSkin.onBeforeCompile = function (shader) {
        shader.uniforms.frPatientContourStrength = patientContourStrength;
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec3 frPatientSurfaceNormal;\nvarying vec3 frPatientViewPosition;')
          .replace('#include <project_vertex>', '#include <project_vertex>\nfrPatientSurfaceNormal = normalize(normalMatrix * normal);\nfrPatientViewPosition = -mvPosition.xyz;');
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\nvarying vec3 frPatientSurfaceNormal;\nvarying vec3 frPatientViewPosition;\nuniform float frPatientContourStrength;')
          .replace('#include <color_fragment>', '#include <color_fragment>\nfloat frPatientFacing = abs(dot(normalize(frPatientSurfaceNormal), normalize(frPatientViewPosition)));\nfloat frPatientContour = mix(0.08, 1.0, smoothstep(0.34, 0.60, frPatientFacing));\ndiffuseColor.rgb *= mix(1.0, frPatientContour, frPatientContourStrength);');
      };
      patientArmSkin.customProgramCacheKey = function () { return 'fr-patient-arm-contrast-contours-v1'; };
      patientArms.traverse(function (part) {
        if (part.isMesh && part.material === skin) part.material = patientArmSkin;
      });
    }
