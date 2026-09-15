  // Canvas guide graphics share a palette and vector symbols. Repainting an
  // existing CanvasTexture keeps selection, export and NPC disposal unchanged.
  function geometryGuideState(data, answered, waypoint) {
    return { kind: data && data.question ? (answered ? 'complete' : 'question') : 'discovery',
      tracked: !!(data && waypoint && waypoint.npcName === data.name) };
  }

  function geometryGuideLabelParts(data) {
    var name = String(data && data.name || 'Guide');
    var split = name.match(/^(.*?)\s[-–—]\s(.+)$/);
    return { name: split ? split[1] : name,
      detail: split ? split[2] : (data && data.question ? 'Activity guide' : 'Discovery guide') };
  }

  function geometryGuideContrast(engine) {
    var now = Date.now();
    if (engine._guideContrastAt && now - engine._guideContrastAt < 500) return engine._guideContrast;
    engine._guideContrastAt = now;
    engine._guideTouch = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    var surface = engine.renderer && engine.renderer.domElement;
    engine._guideContrast = !!(surface && surface.closest && surface.closest('.theme-contrast, [data-stem-theme="contrast"]'));
    if (!engine._guideContrast && window.matchMedia) engine._guideContrast = window.matchMedia('(forced-colors: active)').matches;
    return engine._guideContrast;
  }

  function geometryGuidePalette(contrast) {
    return contrast ? { ink: '#000000', cream: '#ffffff', sage: '#ffffff', amber: '#ffff00', soft: '#000000' }
      : { ink: '#183a34', cream: '#f5eedb', sage: '#c7deca', amber: '#e5bd6b', soft: '#48665a' };
  }

  function geometryGuideBox(ctx, x, y, width, height, radius, fill, stroke, lineWidth) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, width, height, radius); else ctx.rect(x, y, width, height);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth || 1; ctx.stroke(); }
  }

  function geometryGuideSymbol(ctx, x, y, radius, kind, ink) {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = ink; ctx.fillStyle = ink;
    ctx.lineWidth = Math.max(1.3, radius * 0.22); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    if (kind === 'complete') {
      ctx.moveTo(-radius * 0.55, 0); ctx.lineTo(-radius * 0.12, radius * 0.42); ctx.lineTo(radius * 0.6, -radius * 0.48); ctx.stroke();
    } else if (kind === 'discovery') {
      ctx.moveTo(0, -radius * 0.72); ctx.lineTo(radius * 0.56, 0); ctx.lineTo(0, radius * 0.72); ctx.lineTo(-radius * 0.56, 0); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, Math.max(0.8, radius * 0.1), 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.moveTo(-radius * 0.4, -radius * 0.35);
      ctx.bezierCurveTo(-radius * 0.4, -radius * 0.95, radius * 0.65, -radius * 0.95, radius * 0.43, -radius * 0.25);
      ctx.bezierCurveTo(radius * 0.36, -radius * 0.05, 0, -radius * 0.03, 0, radius * 0.23); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, radius * 0.65, radius * 0.12, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function geometryGuideFitText(ctx, text, x, y, width, size, weight) {
    ctx.font = (weight || '600') + ' ' + size + 'px system-ui, sans-serif';
    while (size > 21 && ctx.measureText(text).width > width) {
      size--; ctx.font = (weight || '600') + ' ' + size + 'px system-ui, sans-serif';
    }
    if (ctx.measureText(text).width > width) {
      while (text.length > 1 && ctx.measureText(text + '…').width > width) text = text.slice(0, -1);
      text += '…';
    }
    ctx.fillText(text, x, y);
  }

  function geometryPaintGuideCanvas(canvas, part, data, state, contrast) {
    var ctx = canvas.getContext('2d'); if (!ctx) return;
    var p = geometryGuidePalette(contrast), w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    if (part === 'label') {
      var lines = geometryGuideLabelParts(data);
      geometryGuideBox(ctx, 8, 8, w - 16, h - 16, 25, p.cream, p.ink, 5);
      if (state.tracked) geometryGuideBox(ctx, 15, 15, w - 30, h - 30, 20, null, p.amber, 8);
      ctx.fillStyle = state.tracked ? p.amber : p.sage;
      ctx.beginPath(); ctx.arc(67, h / 2, 34, 0, Math.PI * 2); ctx.fill();
      geometryGuideSymbol(ctx, 67, h / 2, 24, state.kind, p.ink);
      ctx.fillStyle = p.ink; geometryGuideFitText(ctx, lines.name, 121, 61, w - 151, 40, '750');
      ctx.fillStyle = p.soft; geometryGuideFitText(ctx, lines.detail, 121, 108, w - 151, 27, '550');
    } else if (part === 'prompt') {
      geometryGuideBox(ctx, 7, 7, w - 14, h - 14, 23, p.ink, p.cream, 4);
      if (state.touch) { ctx.textAlign = 'center'; ctx.fillStyle = p.cream; ctx.font = '650 32px system-ui, sans-serif'; ctx.fillText('Tap Talk', w / 2, h / 2); return; }
      geometryGuideBox(ctx, 22, 21, 51, 54, 10, p.cream);
      ctx.textAlign = 'center'; ctx.fillStyle = p.ink; ctx.font = '750 32px system-ui, sans-serif'; ctx.fillText('E', 47, 49);
      ctx.fillStyle = p.cream; ctx.font = '650 32px system-ui, sans-serif'; ctx.fillText('Talk', 187, 49);
    } else if (part === 'marker') {
      ctx.fillStyle = state.tracked ? p.amber : p.cream;
      ctx.beginPath(); ctx.arc(w / 2, h / 2, 49, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = p.ink; ctx.lineWidth = 6; ctx.stroke();
      geometryGuideSymbol(ctx, w / 2, h / 2, 32, state.kind, p.ink);
    } else if (part === 'speech') {
      geometryGuideBox(ctx, 10, 10, w - 20, h - 20, 22, p.ink, p.sage, 3);
      ctx.fillStyle = p.cream; ctx.textAlign = 'center';
      geometryGuideFitText(ctx, String(data.dialogue || ''), w / 2, h / 2, w - 48, 29, '500');
    }
  }

  function geometryRefreshGuideSprites(engine, npc, index, contrast) {
    var state = geometryGuideState(npc.data, !!(engine._answeredRef || {})[index], engine._activityWaypoint);
    state.contrast = !!contrast; state.touch = !!engine._guideTouch;
    var signature = [state.kind, state.tracked, state.contrast, state.touch, npc.data.name, npc.data.dialogue, !!npc._speechBubble].join('|');
    if (npc._guideVisualSignature === signature) return;
    npc._guideVisualSignature = signature;
    [['label', npc.label], ['prompt', npc.prompt], ['marker', npc.qMark], ['speech', npc._speechBubble]].forEach(function(entry) {
      var sprite = entry[1], texture = sprite && sprite.material && sprite.material.map;
      if (!texture || !texture.image) return;
      geometryPaintGuideCanvas(texture.image, entry[0], npc.data, state, contrast);
      texture.needsUpdate = true;
      sprite.material.toneMapped = false; sprite.material.depthWrite = false;
      sprite.userData.geometryGuideState = { kind: state.kind, tracked: state.tracked, contrast: state.contrast };
    });
  }

  function geometryGuideCameraBasis(camera) {
    camera.updateWorldMatrix(true, false);
    var e = camera.matrixWorld.elements, fx = -e[8], fz = -e[10];
    var length = Math.sqrt(fx * fx + fz * fz);
    // The camera pitch is limited, but retaining a deterministic heading also
    // keeps preview/test cameras looking exactly down from producing NaN.
    if (length < 0.00001) return { fx: 0, fz: -1 };
    return { fx: fx / length, fz: fz / length };
  }

  function geometryGuideBearing(basis, dx, dz) {
    return Math.atan2(dx * -basis.fz + dz * basis.fx, dx * basis.fx + dz * basis.fz);
  }

  function geometryPaintGuideCompass(ctx, w, h, engine, contrast) {
    var p = geometryGuidePalette(contrast), basis = geometryGuideCameraBasis(engine.camera), half = Math.PI / 2;
    ctx.clearRect(0, 0, w, h);
    geometryGuideBox(ctx, 0.5, 0.5, w - 1, h - 1, 16, p.ink, p.sage, 1);
    ctx.fillStyle = p.amber; ctx.beginPath(); ctx.moveTo(w / 2, 4); ctx.lineTo(w / 2 - 3, 8); ctx.lineTo(w / 2 + 3, 8); ctx.closePath(); ctx.fill();
    ctx.font = '650 8px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    [['N', 0, -1], ['E', 1, 0], ['S', 0, 1], ['W', -1, 0]].forEach(function(cardinal) {
      var angle = geometryGuideBearing(basis, cardinal[1], cardinal[2]);
      if (Math.abs(angle) > half) return;
      var x = w / 2 + angle / half * (w / 2 - 18);
      ctx.fillStyle = p.sage; ctx.fillText(cardinal[0], x, 11);
    });
    var answered = engine._answeredRef || {}, trackedName = '';
    var markers = engine.npcs.filter(function(npc) { return npc && npc.body; }).map(function(npc) {
      var i = engine.npcs.indexOf(npc), dx = npc.body.position.x - engine.camera.position.x, dz = npc.body.position.z - engine.camera.position.z;
      var state = geometryGuideState(npc.data, !!answered[i], engine._activityWaypoint);
      if (state.tracked) trackedName = npc.data.name;
      return { state: state, distance: dx * dx + dz * dz, angle: geometryGuideBearing(basis, dx, dz) };
    });
    // Distant guides are painted first, then nearby guides, then the pinned guide.
    // This preserves exact bearings while ensuring the intended destination wins
    // when multiple guides happen to line up in the same direction.
    markers.sort(function(a, b) { return Number(a.state.tracked) - Number(b.state.tracked) || b.distance - a.distance; });
    markers.forEach(function(marker) {
      var state = marker.state, off = Math.abs(marker.angle) > half;
      var x = off ? (marker.angle > 0 ? w - 9 : 9) : w / 2 + marker.angle / half * (w / 2 - 18);
      var fill = state.tracked ? p.amber : state.kind === 'question' ? p.cream : p.sage;
      if (off) {
        var direction = marker.angle > 0 ? 1 : -1;
        ctx.fillStyle = fill; ctx.strokeStyle = p.ink; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + direction * 4, 21); ctx.lineTo(x - direction * 3, 16); ctx.lineTo(x - direction * 3, 26); ctx.closePath(); ctx.fill(); ctx.stroke();
        if (state.tracked) { ctx.strokeStyle = p.amber; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, 21, 8, 0, Math.PI * 2); ctx.stroke(); }
        return;
      }
      var radius = state.tracked ? 7 : 5.5;
      ctx.fillStyle = fill; ctx.strokeStyle = p.ink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, 21, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      geometryGuideSymbol(ctx, x, 21, radius * 0.74, state.kind, p.ink);
      if (state.tracked) { ctx.strokeStyle = p.amber; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, 21, 9, 0, Math.PI * 2); ctx.stroke(); }
    });
    return trackedName;
  }

