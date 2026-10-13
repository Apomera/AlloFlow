/* Shared procedural feather painting for BirdLab and Raptor Lab.
 * Pure canvas artwork: no renderer, GPU resources, flight state or global RNG.
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
    for (var variant = 0; variant < variants; variant++) {
      ctx.save(); ctx.translate(variant * 256, 0);
      ctx.beginPath(); ctx.rect(0, 0, 256, 512); ctx.clip();
      var grad = ctx.createLinearGradient(0, 0, 256, 0);
      grad.addColorStop(0, '#d5d1c8'); grad.addColorStop(0.45, '#e9e5db');
      grad.addColorStop(0.53, '#e2dfd6'); grad.addColorStop(1, '#d9d6ce');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, 256, 512);
      // A broad, soft root shadow suggests the feather overlapping above it;
      // the exposed vane remains matte, without a dark outline at every edge.
      var overlap = ctx.createLinearGradient(0, 0, 0, 168);
      overlap.addColorStop(0, 'rgba(48,38,27,.075)');
      overlap.addColorStop(0.55, 'rgba(48,38,27,.026)'); overlap.addColorStop(1, 'rgba(48,38,27,0)');
      ctx.fillStyle = overlap; ctx.fillRect(0, 0, 256, 168);
      for (var y = -70; y < 590; y += 2.3 + noise(y, variant + 17) * 1.2) [-1, 1].forEach(function (side) {
        var bend = 43 + noise(y + side, variant) * 18, shaftX = 128 + Math.sin(y * 0.009 + variant) * 1.2;
        ctx.strokeStyle = 'rgba(40,32,24,' + (0.055 + noise(y, variant + side) * 0.035) + ')'; ctx.lineWidth = 0.65;
        ctx.beginPath(); ctx.moveTo(shaftX + side, y);
        ctx.bezierCurveTo(shaftX + side * 42, y - bend * 0.27, shaftX + side * 83, y - bend * 0.62, shaftX + side * 130, y - bend); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 0.45;
        ctx.beginPath(); ctx.moveTo(shaftX + side, y + 1);
        ctx.bezierCurveTo(shaftX + side * 42, y + 1 - bend * 0.27, shaftX + side * 83, y + 1 - bend * 0.62, shaftX + side * 130, y + 1 - bend); ctx.stroke();
      });
      ctx.strokeStyle = 'rgba(65,51,36,.17)'; ctx.lineWidth = 1.3; ctx.beginPath();
      for (var shaftY = 0; shaftY < 509; shaftY += 8) {
        var shaftX = 128 + Math.sin(shaftY * 0.009 + variant) * 1.2;
        if (shaftY) ctx.lineTo(shaftX, shaftY); else ctx.moveTo(shaftX, shaftY);
      }
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

  global.AvianFeatherArt = {
    version: '1.0.0',
    createFlightFeatherCanvas: createFlightFeatherCanvas,
    createVaneDetailCanvases: createVaneDetailCanvases
  };
})(typeof window !== 'undefined' ? window : globalThis);
