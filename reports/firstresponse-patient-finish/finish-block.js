    if (!api.contrast) {
      // Keep the patient's face and hands on one finish. These viewer lights
      // need quieter skin highlights to retain cheek and finger curvature.
      // Rescuer finishes were cloned above and keep their own settings.
      skin.color.multiplyScalar(0.86);
      if (skin.specular) skin.specular.setHex(0x060606);
    }
