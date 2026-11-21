/* Shared procedural feather painting and surface grain for both bird labs.
 * Canvas artwork and shader composition: no renderer, GPU resources,
 * flight state or global RNG. Shader hooks belong to the calling material.
 * Every call creates new canvases; each lab owns its resulting GPU textures.
 */
(function (global) {
  'use strict';
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function noise(a, b) { var n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); }
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function optionNumber(options, name, fallback) {
    var value = options[name] === undefined ? fallback : options[name];
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError('AvianFeatherArt ' + name + ' must be finite.');
    return value;
  }

  // Default output: 1024 x 512, with four 256-pixel-wide feather variants.
  // Use variants: 1 for a 256 x 512 feather with unchanged whole-texture UVs.
  function createFlightFeatherCanvas(options) {
    options = options || {};
    var variants = options.variants === undefined ? 4 : options.variants;
    if (variants !== 1 && variants !== 4) throw new RangeError('AvianFeatherArt variants must be 1 or 4.');
    var tail = !!options.tail, contourFeather = !!options.contourFeather;
    // Four independent vanes form the default atlas; a single vane also
    // supports callers whose feather UVs span the entire texture.
    var cv = canvas(variants * 256, 512), ctx = cv.getContext('2d');
    if (!ctx) return cv;
    for (var variant = 0; variant < variants; variant++) {
      ctx.save(); ctx.translate(variant * 256, 0);
      ctx.beginPath(); ctx.rect(0, 0, 256, 512); ctx.clip();
      var grad = ctx.createLinearGradient(0, 0, 256, 0);
      grad.addColorStop(0, '#d5d1c8'); grad.addColorStop(0.24, '#e1ddd3');
      grad.addColorStop(0.45, '#ebe7dd'); grad.addColorStop(0.53, '#e2dfd6');
      grad.addColorStop(0.78, '#ddd9d0'); grad.addColorStop(1, '#d7d3cb');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, 256, 512);
      // Subtle structural iridescent sheen bands along the curved vane surface;
      // kept low-saturation so species pigments remain authentic.
      var irid = ctx.createLinearGradient(16, 84 + variant * 14, 240, 428 - variant * 12);
      irid.addColorStop(0, 'rgba(186,210,214,0)');
      irid.addColorStop(0.30, 'rgba(196,220,224,.065)');
      irid.addColorStop(0.52, 'rgba(232,222,196,.085)');
      irid.addColorStop(0.74, 'rgba(190,206,222,.055)');
      irid.addColorStop(1, 'rgba(186,210,214,0)');
      ctx.fillStyle = irid; ctx.fillRect(0, 0, 256, 512);
      // A broad, soft root shadow suggests the feather overlapping above it;
      // the exposed vane remains matte, without a dark outline at every edge.
      var overlap = ctx.createLinearGradient(0, 0, 0, 168);
      overlap.addColorStop(0, 'rgba(48,38,27,.085)');
      overlap.addColorStop(0.55, 'rgba(48,38,27,.028)'); overlap.addColorStop(1, 'rgba(48,38,27,0)');
      ctx.fillStyle = overlap; ctx.fillRect(0, 0, 256, 168);
      // Soft downy plumulaceous base barbs near the proximal root soften
      // the transition where overlapping covert feathers meet the calamus.
      for (var downY = 6; downY < 112; downY += 3.8 + noise(downY, variant + 51) * 2.2) [-1, 1].forEach(function (side) {
        var dShaftX = 128 + Math.sin(downY * 0.009 + variant) * 1.2;
        var span = 38 + (112 - downY) * 0.55 + noise(downY + side * 3, variant + 63) * 28;
        var lift = 10 + noise(downY * 1.3, variant + side * 5) * 22;
        var wave = (noise(downY, variant + side * 11) - 0.5) * 16;
        ctx.strokeStyle = 'rgba(248,243,230,' + (0.095 + (1 - downY / 112) * 0.11).toFixed(3) + ')';
        ctx.lineWidth = 0.85;
        ctx.beginPath(); ctx.moveTo(dShaftX + side * 2, downY);
        ctx.quadraticCurveTo(dShaftX + side * span * 0.52, downY - lift * 0.4 + wave, dShaftX + side * span, downY - lift);
        ctx.stroke();
      });
      for (var y = -70; y < 590; y += 2.3 + noise(y, variant + 17) * 1.2) [-1, 1].forEach(function (side) {
        var bend = 43 + noise(y + side, variant) * 18, shaftX = 128 + Math.sin(y * 0.009 + variant) * 1.2;
        ctx.strokeStyle = 'rgba(40,32,24,' + (0.055 + noise(y, variant + side) * 0.035) + ')'; ctx.lineWidth = 0.65;
        ctx.beginPath(); ctx.moveTo(shaftX + side, y);
        ctx.bezierCurveTo(shaftX + side * 42, y - bend * 0.27, shaftX + side * 83, y - bend * 0.62, shaftX + side * 130, y - bend); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.075)'; ctx.lineWidth = 0.45;
        ctx.beginPath(); ctx.moveTo(shaftX + side, y + 1);
        ctx.bezierCurveTo(shaftX + side * 42, y + 1 - bend * 0.27, shaftX + side * 83, y + 1 - bend * 0.62, shaftX + side * 130, y + 1 - bend); ctx.stroke();
      });
      // Fine barbule splits and subtle outer-vane notches add organic texture
      // where interlocked hooklets part slightly along the margin.
      for (var notch = 0; notch < 11; notch++) {
        var notchSide = notch % 2 ? 1 : -1;
        var notchY = 148 + noise(notch, variant + 89) * 336;
        var notchDepth = 14 + noise(notch + 3, variant + 41) * 32;
        var notchEdgeX = notchSide > 0 ? 254 : 2;
        var notchTipX = notchEdgeX - notchSide * notchDepth;
        var notchTipY = notchY + notchDepth * 0.34;
        ctx.fillStyle = 'rgba(44,34,24,' + (0.06 + noise(notch + 5, variant) * 0.05).toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(notchEdgeX, notchY - 1.4);
        ctx.quadraticCurveTo(notchEdgeX - notchSide * notchDepth * 0.55, notchY + notchDepth * 0.14, notchTipX, notchTipY);
        ctx.quadraticCurveTo(notchEdgeX - notchSide * notchDepth * 0.55, notchY + notchDepth * 0.20, notchEdgeX, notchY + 1.6);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,251,240,.11)'; ctx.lineWidth = 0.55;
        ctx.beginPath(); ctx.moveTo(notchEdgeX, notchY - 1.6); ctx.lineTo(notchTipX, notchTipY - 0.5); ctx.stroke();
      }
      // Tapered 3D-shaded rachis shaft: recessed trailing shadow groove,
      // smooth keratin taper from calamus to distal tip, and dorsal highlight ridge.
      var shaftPts = [];
      for (var shaftY = 0; shaftY <= 512; shaftY += 16) {
        var frac = shaftY / 512;
        var sx = 128 + Math.sin(shaftY * 0.009 + variant) * 1.2;
        var halfW = 2.75 * (1 - frac * 0.78) + (contourFeather ? -0.35 : 0);
        shaftPts.push({ x: sx, y: shaftY, w: Math.max(0.55, halfW) });
      }
      ctx.strokeStyle = 'rgba(48,37,25,.16)'; ctx.lineWidth = 2.6;
      ctx.beginPath();
      shaftPts.forEach(function (pt, idx) { if (idx) ctx.lineTo(pt.x + 1.35, pt.y); else ctx.moveTo(pt.x + 1.35, pt.y); });
      ctx.stroke();
      var rachisGrad = ctx.createLinearGradient(125, 0, 131, 0);
      rachisGrad.addColorStop(0, '#c8c0b1'); rachisGrad.addColorStop(0.36, '#f6f2e7');
      rachisGrad.addColorStop(0.70, '#ded7c8'); rachisGrad.addColorStop(1, '#a99f8e');
      ctx.fillStyle = rachisGrad;
      ctx.beginPath();
      for (var ri = 0; ri < shaftPts.length; ri++) {
        var rp = shaftPts[ri];
        if (ri) ctx.lineTo(rp.x - rp.w, rp.y); else ctx.moveTo(rp.x - rp.w, rp.y);
      }
      for (var rj = shaftPts.length - 1; rj >= 0; rj--) {
        var rpr = shaftPts[rj];
        ctx.lineTo(rpr.x + rpr.w, rpr.y);
      }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,253,246,.36)'; ctx.lineWidth = 0.85;
      ctx.beginPath();
      shaftPts.forEach(function (pt, idx) {
        var hx = pt.x - pt.w * 0.32;
        if (idx) ctx.lineTo(hx, pt.y); else ctx.moveTo(hx, pt.y);
      });
      ctx.stroke();
      ctx.strokeStyle = 'rgba(65,51,36,.15)'; ctx.lineWidth = 0.75;
      ctx.beginPath();
      shaftPts.forEach(function (pt, idx) {
        var ex = pt.x + pt.w * 0.85;
        if (idx) ctx.lineTo(ex, pt.y); else ctx.moveTo(ex, pt.y);
      });
      ctx.stroke();
      // Fine separated barb tips suggest wear without cutting geometry or
      // introducing transparent edges that flicker at observation distance.
      for (var wear = 0; wear < 17; wear++) {
        var wearY = 180 + noise(wear, variant + 21) * 324, side = wear % 2 ? 1 : -1;
        var wearX = side > 0 ? 249 : 7, reach = 6 + noise(wear + 7, variant) * 17;
        ctx.strokeStyle = 'rgba(245,238,220,.14)'; ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.moveTo(wearX, wearY); ctx.lineTo(wearX - side * reach, wearY + reach * 0.40); ctx.stroke();
      }
      // Low-contrast remex barring and an adult red tail's narrow terminal band.
      if (tail) {
        var band = ctx.createLinearGradient(0, 426, 0, 473);
        band.addColorStop(0, 'rgba(27,22,18,0)'); band.addColorStop(0.25, 'rgba(27,22,18,.71)');
        band.addColorStop(0.70, 'rgba(27,22,18,.71)'); band.addColorStop(1, 'rgba(27,22,18,0)');
        ctx.fillStyle = band; ctx.fillRect(0, 426, 256, 47);
      } else if (!contourFeather) {
        for (var stripe = 1; stripe < 6; stripe++) {
          var bandY = stripe * 79 + (noise(stripe, variant) - 0.5) * 17;
          var stripeGrad = ctx.createLinearGradient(0, bandY - 8, 0, bandY + 11);
          stripeGrad.addColorStop(0, 'rgba(30,28,23,0)'); stripeGrad.addColorStop(0.5, 'rgba(30,28,23,.09)'); stripeGrad.addColorStop(1, 'rgba(30,28,23,0)');
          ctx.fillStyle = stripeGrad; ctx.fillRect(0, bandY - 8, 256, 19);
        }
      }
      ctx.restore();
    }
    return cv;
  }

  // Relief is sampled within each vane tile to avoid normal seams between
  // neighbouring variants. Data pixels are linear; callers set GPU encoding.
  function createVaneDetailCanvases(source, options) {
    options = options || {};
    if (!source || typeof source.getContext !== 'function') throw new TypeError('AvianFeatherArt requires a source canvas.');
    var width = source.width, height = source.height;
    var tileWidth = optionNumber(options, 'tileWidth', 256);
    if (!Number.isInteger(width) || width < 2 || !Number.isInteger(height) || height < 1 ||
        !Number.isInteger(tileWidth) || tileWidth < 2 || width % tileWidth !== 0) {
      throw new RangeError('AvianFeatherArt requires positive canvas dimensions and complete vane tiles of at least 2 pixels.');
    }
    var reliefStrength = optionNumber(options, 'reliefStrength', 1.45);
    var curveStrength = optionNumber(options, 'curveStrength', 0.07);
    var roughnessBase = optionNumber(options, 'roughnessBase', 230);
    var roughnessRange = optionNumber(options, 'roughnessRange', 22);
    var pixels = source.getContext('2d').getImageData(0, 0, width, height).data;
    var normalCanvas = canvas(width, height), roughCanvas = canvas(width, height);
    var nc = normalCanvas.getContext('2d'), rc = roughCanvas.getContext('2d');
    var normals = nc.createImageData(width, height), rough = rc.createImageData(width, height);
    function relief(x, y) { return pixels[(clamp(y, 0, height - 1) * width + clamp(x, 0, width - 1)) * 4] / 255; }
    for (var py = 0; py < height; py++) for (var px = 0; px < width; px++) {
      var index = (py * width + px) * 4, tileStart = Math.floor(px / tileWidth) * tileWidth;
      var nx = (relief(Math.max(tileStart, px - 1), py) - relief(Math.min(tileStart + tileWidth - 1, px + 1), py)) * reliefStrength + Math.sin(((px % tileWidth) / (tileWidth - 1) - 0.5) * Math.PI) * curveStrength;
      var ny = (relief(px, py + 1) - relief(px, py - 1)) * reliefStrength;
      var inv = 1 / Math.sqrt(nx * nx + ny * ny + 1);
      normals.data[index] = Math.round((nx * inv * 0.5 + 0.5) * 255);
      normals.data[index + 1] = Math.round((ny * inv * 0.5 + 0.5) * 255);
      normals.data[index + 2] = Math.round((inv * 0.5 + 0.5) * 255); normals.data[index + 3] = 255;
      rough.data[index] = rough.data[index + 1] = rough.data[index + 2] = Math.round(roughnessBase + (1 - relief(px, py)) * roughnessRange); rough.data[index + 3] = 255;
    }
    nc.putImageData(normals, 0, 0); rc.putImageData(rough, 0, 0);
    return { normal: normalCanvas, roughness: roughCanvas };
  }

  function vaneGrainOptions(options) {
    options = options || {};
    var variants = options.variants === undefined ? 4 : options.variants;
    if (variants !== 1 && variants !== 4) throw new RangeError('AvianFeatherArt variants must be 1 or 4.');
    return { variants: variants, contourFeather: !!options.contourFeather };
  }
  function vaneGrainCacheKey(options) {
    var settings = vaneGrainOptions(options);
    return 'avian-vane-grain-v2-' + settings.variants + (settings.contourFeather ? '-contour' : '-flight');
  }
  // Whole-feather UVs and four-tile atlases share one surface treatment.
  // Pigment hooks can compose around the normal color chunk; no global
  // ShaderChunk changes, uniforms, maps or per-frame updates are needed.
  function applyVaneGrain(shader, options) {
    var settings = vaneGrainOptions(options), key = vaneGrainCacheKey(settings);
    if (!shader || typeof shader.fragmentShader !== 'string') throw new TypeError('AvianFeatherArt requires a fragment shader.');
    var marker = '// avian-vane-grain:' + key;
    if (shader.fragmentShader.indexOf('// avian-vane-grain:') !== -1) {
      if (shader.fragmentShader.indexOf(marker + '\n') !== -1) return shader;
      throw new Error('AvianFeatherArt grain is already applied with different options.');
    }
    if (shader.fragmentShader.indexOf('#include <color_fragment>') === -1) throw new Error('AvianFeatherArt requires the color_fragment shader chunk.');
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n' + [
      marker,
      'float blVane=fract(vUv.x*' + settings.variants + '.0),blAlong=1.0-vUv.y;',
      'float blAcross=abs(blVane-0.5)*2.0;',
      'float blVariant=floor(vUv.x*' + settings.variants + '.0);',
      // Slight curvature and uneven bundle spacing break up machine-ruled
      // stripes. Both frequencies fade when their spacing becomes subpixel.
      'float blBend=sin(blAlong*9.0+blVariant*1.7)*blAcross*0.24;',
      'float blBarb=blAlong*42.0-blAcross*(6.8+blAlong*3.2)+blVariant*0.73+blBend;',
      'float blFine=1.0-smoothstep(0.22,0.65,fwidth(blBarb));',
      'float blBundle=blAlong*11.0-blAcross*2.4+blVariant*0.73+sin(blAlong*7.0+blVariant*2.1)*0.18;',
      'float blBroad=1.0-smoothstep(0.22,0.65,fwidth(blBundle));',
      'float blFiber=sin(blBarb*6.2831853)*blFine*0.045+sin(blBundle*6.2831853)*blBroad*0.028;',
      'float blRoot=smoothstep(0.04,0.22,blAlong);',
      'float blSheen=smoothstep(0.18,0.68,blAlong)*(1.0-smoothstep(0.76,0.98,blAlong))*sin((blAlong*5.0-blAcross*1.8+blVariant*0.9)*3.1415926)*0.5+0.5;',
      'diffuseColor.rgb*=1.0+blFiber*blRoot;',
      'diffuseColor.rgb+=diffuseColor.rgb*vec3(0.014,0.022,0.026)*blSheen*blFine*blRoot;',
      'float blAA=max(fwidth(blAcross),0.012);',
      'float blMargin=smoothstep(0.83-blAA,0.99+blAA,blAcross)*smoothstep(0.24,0.64,blAlong);',
      'float blTip=smoothstep(0.79,0.99,blAlong)*(0.72+0.28*sin(blVane*19.0+blVariant));',
      settings.contourFeather ? [
        'float blShaft=(1.0-smoothstep(0.015,0.065+blAA,blAcross))*blRoot*(1.0-smoothstep(0.70,0.96,blAlong));',
        'diffuseColor.rgb*=1.0-blShaft*0.075;',
        'float blWear=max(blMargin*0.16,blTip*0.25);',
        'diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.45,1.33,1.16),blWear);'
      ].join('\n') : [
        // Neutral worn edges retain each caller's species colors and bands.
        'float blWear=max(blMargin*0.055,blTip*0.035);',
        'diffuseColor.rgb*=1.0+blWear;'
      ].join('\n')
    ].join('\n'));
    return shader;
  }

  global.AvianFeatherArt = {
    version: '1.1.0',
    createFlightFeatherCanvas: createFlightFeatherCanvas,
    createVaneDetailCanvases: createVaneDetailCanvases,
    applyVaneGrain: applyVaneGrain,
    vaneGrainCacheKey: vaneGrainCacheKey
  };
})(typeof window !== 'undefined' ? window : globalThis);
