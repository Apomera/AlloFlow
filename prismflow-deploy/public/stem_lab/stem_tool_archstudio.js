/**
 * stem_tool_archstudio.js — Architecture Studio / Brick Builder
 *
 * 3D building simulator with shapes, materials, STL export,
 * blueprint SVG export, structural analysis, and progressive coach tips.
 *
 * Registered tool ID: "archStudio"
 * Registry: window.StemLab.registerTool()
 */
(function () {
  'use strict';
  if (!window.StemLab || typeof window.StemLab.registerTool !== 'function') return;

  window.StemLab.registerTool('archStudio', {
    name: 'Architecture Studio',
    icon: '\uD83C\uDFD7\uFE0F',
    category: 'explore',
    render: function (ctx) {
    var React = ctx.React;
    var d = (ctx.toolData && ctx.toolData.archStudio) || {};
    var upd = function (key, val) {
      if (typeof key === 'object') {
        ctx.updateMulti('archStudio', key);
      } else {
        ctx.update('archStudio', key, val);
      }
    };

    var blocks = d.blocks || [];
    var activeShape = d.activeShape || 'block';
    var activeMaterial = d.activeMaterial || 'stone';
    var activeColor = d.activeColor || '#94a3b8';
    var mode = d.mode || 'place';
    var styleMode = d.styleMode || 'architect';
    var blueprintView = d.blueprintView || false;
    var showAnalysis = d.showAnalysis || false;
    var showChallenges = d.showChallenges || false;
    var activeChallenge = d.activeChallenge != null ? d.activeChallenge : -1;
    var completedChallenges = d.completedChallenges || {};
    var threeReady = ctx.toolData && ctx.toolData._threeLoaded;

    // ── Shape definitions (12 shapes) ──
    var shapes = [
      { id: 'block', icon: '\uD83D\uDFE6', label: 'Block', vol: 1 },
      { id: 'slab', icon: '\uD83D\uDCCF', label: 'Slab', vol: 0.5 },
      { id: 'ramp', icon: '\uD83C\uDFD4\uFE0F', label: 'Ramp', vol: 0.5 },
      { id: 'column', icon: '\uD83C\uDFDB\uFE0F', label: 'Column', vol: 0.385 },
      { id: 'arch', icon: '\uD83C\uDF09', label: 'Arch', vol: 0.24 },
      { id: 'roof', icon: '\uD83D\uDCD0', label: 'Roof', vol: 0.35 },
      { id: 'pyramid', icon: '\uD83D\uDD3A', label: 'Pyramid', vol: 0.26 },
      { id: 'dome', icon: '\uD83D\uDD35', label: 'Dome', vol: 0.26 },
      { id: 'cylinder', icon: '\uD83D\uDEE2\uFE0F', label: 'Cylinder', vol: 0.785 },
      { id: 'lbeam', icon: '\uD83D\uDD29', label: 'L-Beam', vol: 0.75 },
      { id: 'window', icon: '\uD83E\uDE9F', label: 'Window', vol: 0.3 },
      { id: 'door', icon: '\uD83D\uDEAA', label: 'Door', vol: 0.4 }
    ];

    // ── Material definitions ──
    var materials = [
      { id: 'stone', label: 'Stone', color: '#94a3b8', icon: '\uD83E\uDEA8', weight: 2.3 },
      { id: 'brick', label: 'Brick', color: '#b45309', icon: '\uD83E\uDDF1', weight: 1.9 },
      { id: 'wood', label: 'Wood', color: '#92400e', icon: '\uD83E\uDEB5', weight: 0.6 },
      { id: 'glass', label: 'Glass', color: '#38bdf8', icon: '\uD83E\uDE9F', weight: 2.5 },
      { id: 'marble', label: 'Marble', color: '#f1f5f9', icon: '\u26AA', weight: 2.7 },
      { id: 'metal', label: 'Metal', color: '#cbd5e1', icon: '\u2699\uFE0F', weight: 7.8 }
    ];

    // ── Tool modes ──
    var modes = [
      { id: 'place', label: 'Place', icon: '\u2795' },
      { id: 'erase', label: 'Erase', icon: '\u274C' },
      { id: 'paint', label: 'Paint', icon: '\uD83C\uDFA8' }
    ];

    // ── Lookups ──
    var volLookup = {};
    shapes.forEach(function (s) { volLookup[s.id] = s.vol; });
    var matColorLookup = {};
    var matWeightLookup = {};
    materials.forEach(function (m) { matColorLookup[m.id] = m.color; matWeightLookup[m.id] = m.weight; });

    // ── Basic Stats ──
    var totalBlocks = blocks.length;
    var totalVolume = blocks.reduce(function (sum, b) { return sum + (volLookup[b.shape || 'block'] || 1); }, 0).toFixed(2);

    // Footprint = unique (x,z) cells
    var footprintSet = {};
    blocks.forEach(function (b) { footprintSet[b.x + ',' + b.z] = true; });
    var footprint = Object.keys(footprintSet).length;

    // Surface area (rough estimate: 6 faces per block - 2 per shared face)
    var blockMap = {};
    blocks.forEach(function (b) { blockMap[b.x + ',' + b.y + ',' + b.z] = true; });
    var surfaceArea = 0;
    blocks.forEach(function (b) {
      var neighbors = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
      neighbors.forEach(function (n) {
        if (!blockMap[(b.x + n[0]) + ',' + (b.y + n[1]) + ',' + (b.z + n[2])]) surfaceArea += 1;
      });
    });

    // Bounding box dimensions
    var buildW = 0, buildD = 0, buildH = 0;
    var minX = 0, maxX = 0, minY = 0, maxY = 0, minZ = 0, maxZ = 0;
    if (blocks.length > 0) {
      minX = Infinity; maxX = -Infinity; minY = Infinity; maxY = -Infinity; minZ = Infinity; maxZ = -Infinity;
      blocks.forEach(function (b) {
        if (b.x < minX) minX = b.x; if (b.x > maxX) maxX = b.x;
        if (b.y < minY) minY = b.y; if (b.y > maxY) maxY = b.y;
        if (b.z < minZ) minZ = b.z; if (b.z > maxZ) maxZ = b.z;
      });
      buildW = maxX - minX + 1; buildD = maxZ - minZ + 1; buildH = maxY - minY + 1;
    }

    // ══════════════════════════════════════════════════════════════
    // ── UPGRADE 3: Structural Analysis Engine ──
    // ══════════════════════════════════════════════════════════════
    var analysis = { cogX: 0, cogY: 0, cogZ: 0, stability: 0, stabilityLabel: 'N/A', stabilityEmoji: '\u2B1C',
      supportedPct: 100, unsupported: 0, materialCount: 0, symmetry: 0, totalWeight: 0, tip: '' };

    if (totalBlocks > 0) {
      // Center of gravity (volume-weighted)
      var sumWX = 0, sumWY = 0, sumWZ = 0, sumW = 0;
      var matSet = {};
      blocks.forEach(function (b) {
        var w = (volLookup[b.shape || 'block'] || 1) * (matWeightLookup[b.material || 'stone'] || 2.0);
        sumWX += b.x * w; sumWY += b.y * w; sumWZ += b.z * w; sumW += w;
        matSet[b.material || 'stone'] = true;
      });
      analysis.cogX = sumW > 0 ? (sumWX / sumW).toFixed(1) : 0;
      analysis.cogY = sumW > 0 ? (sumWY / sumW).toFixed(1) : 0;
      analysis.cogZ = sumW > 0 ? (sumWZ / sumW).toFixed(1) : 0;
      analysis.totalWeight = sumW.toFixed(1);
      analysis.materialCount = Object.keys(matSet).length;

      // Unsupported blocks (no block below and not on ground level)
      var groundY = minY;
      var floating = 0;
      blocks.forEach(function (b) {
        if (b.y > groundY && !blockMap[b.x + ',' + (b.y - 1) + ',' + b.z]) floating++;
      });
      analysis.unsupported = floating;
      analysis.supportedPct = totalBlocks > 0 ? Math.round(((totalBlocks - floating) / totalBlocks) * 100) : 100;

      // Stability score: ratio of footprint width to CoG height
      // Higher footprint relative to CoG = more stable
      var cogHeight = parseFloat(analysis.cogY) - minY;
      var footprintWidth = Math.max(buildW, buildD);
      var rawStability = footprintWidth > 0 && cogHeight >= 0 ? Math.min(100, Math.round((footprintWidth / (cogHeight + 1)) * 30)) : 100;
      // Penalize floating blocks
      var floatPenalty = Math.round((floating / Math.max(1, totalBlocks)) * 40);
      analysis.stability = Math.max(0, Math.min(100, rawStability - floatPenalty));

      if (analysis.stability >= 70) { analysis.stabilityLabel = 'Stable'; analysis.stabilityEmoji = '\uD83D\uDFE2'; }
      else if (analysis.stability >= 40) { analysis.stabilityLabel = 'Moderate'; analysis.stabilityEmoji = '\uD83D\uDFE1'; }
      else { analysis.stabilityLabel = 'Unstable'; analysis.stabilityEmoji = '\uD83D\uDD34'; }

      // Symmetry score: compare left vs right halves
      var midX = (minX + maxX) / 2;
      var leftCount = 0, rightCount = 0, mirroredCount = 0;
      blocks.forEach(function (b) {
        if (b.x < midX) { leftCount++; var mirrorX = Math.round(midX + (midX - b.x)); if (blockMap[mirrorX + ',' + b.y + ',' + b.z]) mirroredCount++; }
        else if (b.x > midX) { rightCount++; }
        else { leftCount++; rightCount++; mirroredCount++; }
      });
      analysis.symmetry = leftCount > 0 ? Math.round((mirroredCount / leftCount) * 100) : 100;

      // Adaptive structural analysis tip
      if (floating > 0 && floating > totalBlocks * 0.3) {
        analysis.tip = '\u26A0\uFE0F ' + floating + ' blocks are floating! In real architecture, gravity pulls unsupported blocks down. Add supports below them.';
      } else if (analysis.stability < 40) {
        analysis.tip = '\uD83C\uDFD7\uFE0F Your center of gravity is high (' + analysis.cogY + '). Try widening the base \u2014 pyramids are the most stable shape because their wide base keeps the CoG low!';
      } else if (analysis.symmetry < 50) {
        analysis.tip = '\uD83C\uDFDB\uFE0F Your structure is asymmetric (symmetry: ' + analysis.symmetry + '%). Classical buildings use symmetry for both beauty and even load distribution.';
      } else if (analysis.materialCount === 1) {
        analysis.tip = '\uD83C\uDFA8 Try mixing materials! Real buildings use stone foundations, wooden frames, and glass windows for different structural purposes.';
      } else {
        analysis.tip = '\u2705 Excellent structure! Stability: ' + analysis.stability + '%, Symmetry: ' + analysis.symmetry + '%. You\'re building like a real architect!';
      }
    }

    // ══════════════════════════════════════════════════════════════
    // ── CHALLENGE SYSTEM (10 progressive challenges) ──
    // ══════════════════════════════════════════════════════════════
    var shapeCount = {};
    blocks.forEach(function (b) { var sid = b.shape || 'block'; shapeCount[sid] = (shapeCount[sid] || 0) + 1; });
    var uniqueShapeCount = Object.keys(shapeCount).length;
    var volToSurf = surfaceArea > 0 ? (parseFloat(totalVolume) / surfaceArea) : 0;

    var challenges = [
      { id: 0, title: 'First Wall', icon: '\uD83E\uDDF1', desc: 'Build a wall: 3+ wide, 3+ tall', xp: 10,
        check: function () { return buildW >= 3 && buildH >= 3; },
        fact: 'The earliest known brick wall dates to ~7500 BCE in Jericho. Sun-dried mud bricks were the first manufactured building material!' },
      { id: 1, title: 'Stable Tower', icon: '\uD83C\uDFD7\uFE0F', desc: 'Build 6+ blocks high with stability > 60%', xp: 15,
        check: function () { return buildH >= 6 && analysis.stability > 60; },
        fact: 'The Leaning Tower of Pisa has a 3.97\u00B0 lean because its foundation is only 3 meters deep on soft clay soil. Engineers in 2001 removed soil to stabilize it!' },
      { id: 2, title: 'Material Mix', icon: '\uD83C\uDFA8', desc: 'Use 3+ different materials', xp: 10,
        check: function () { return analysis.materialCount >= 3; },
        fact: 'The Parthenon in Athens used Pentelic marble, limestone, and iron clamps. Different materials serve different structural purposes!' },
      { id: 3, title: 'Roman Arch', icon: '\uD83C\uDFDB\uFE0F', desc: 'Use 2+ arches and 2+ columns', xp: 20,
        check: function () { return (shapeCount.arch || 0) >= 2 && (shapeCount.column || 0) >= 2; },
        fact: 'Roman arches distribute weight outward to columns, allowing buildings to span wide openings. The Colosseum has 80 arched entrances!' },
      { id: 4, title: 'Symmetry Master', icon: '\u2696\uFE0F', desc: 'Build with symmetry score > 80%', xp: 15,
        check: function () { return totalBlocks >= 6 && analysis.symmetry > 80; },
        fact: 'The Taj Mahal is perfectly symmetrical along its central axis. Symmetry in architecture creates visual harmony and distributes loads evenly.' },
      { id: 5, title: 'Bridge Builder', icon: '\uD83C\uDF09', desc: 'Span 4+ wide, 3+ high, no floaters', xp: 25,
        check: function () { return buildW >= 4 && buildH >= 3 && analysis.unsupported === 0; },
        fact: 'The longest bridge span is the 1915 \u00C7anakkale Bridge in Turkey at 2,023 meters. Suspension bridges use cables to distribute the load!' },
      { id: 6, title: 'Efficient Design', icon: '\uD83D\uDCCA', desc: '20+ blocks, vol/surface ratio > 0.5', xp: 20,
        check: function () { return totalBlocks >= 20 && volToSurf > 0.5; },
        fact: 'A sphere has the best volume-to-surface ratio. Igloos use dome shapes to minimize heat loss through their surface!' },
      { id: 7, title: 'Skyscraper', icon: '\uD83C\uDFD9\uFE0F', desc: '10+ height with stability > 50%', xp: 25,
        check: function () { return buildH >= 10 && analysis.stability > 50; },
        fact: 'The Burj Khalifa (828m) uses a Y-shaped floor plan to reduce wind forces. Skyscrapers need deep foundations and a wide base!' },
      { id: 8, title: 'The Pyramid', icon: '\uD83D\uDD3A', desc: 'Use pyramid/ramp shapes, stability > 90%', xp: 20,
        check: function () { return ((shapeCount.pyramid || 0) + (shapeCount.ramp || 0)) >= 3 && analysis.stability > 90; },
        fact: 'The Great Pyramid of Giza contains 2.3 million stone blocks. Its wide base and low center of gravity make it incredibly stable \u2014 it\'s survived 4,500 years!' },
      { id: 9, title: 'Dream Home', icon: '\uD83C\uDFE0', desc: '30+ blocks, 4+ materials, use doors & windows', xp: 30,
        check: function () { return totalBlocks >= 30 && analysis.materialCount >= 4 && (shapeCount.door || 0) >= 1 && (shapeCount.window || 0) >= 1; },
        fact: 'A well-designed home balances form and function. Architects consider light, ventilation, structural integrity, and aesthetics all at once!' }
    ];

    // Evaluate active challenge
    var challengeProgress = null;
    var justCompleted = false;
    if (activeChallenge >= 0 && activeChallenge < challenges.length) {
      var ch = challenges[activeChallenge];
      var passed = ch.check();
      challengeProgress = { challenge: ch, passed: passed };
      if (passed && !completedChallenges[ch.id]) {
        justCompleted = true;
      }
    }
    var completedCount = Object.keys(completedChallenges).length;

    // Auto-complete handler
    var completeChallenge = function () {
      if (!challengeProgress || !challengeProgress.passed) return;
      var ch = challengeProgress.challenge;
      var newCompleted = Object.assign({}, completedChallenges);
      newCompleted[ch.id] = Date.now();
      upd('completedChallenges', newCompleted);
      if (ctx.awardXP) ctx.awardXP('archStudio_challenge_' + ch.id, ch.xp, 'Challenge: ' + ch.title);
      if (ctx.addToast) ctx.addToast('\uD83C\uDFC6 Challenge Complete: ' + ch.title + '! +' + ch.xp + ' XP', 'success');
    };

    // ══════════════════════════════════════════════════════════════
    // ── STL export ──
    // ══════════════════════════════════════════════════════════════
    var exportSTL = function () {
      if (!window.THREE || !window._archScene || blocks.length === 0) return;
      var THREE = window.THREE;
      var geos = [];
      window._archScene.blockMeshes.forEach(function (m) {
        var g = m.geometry.clone();
        g.applyMatrix4(m.matrixWorld);
        geos.push(g);
      });
      if (geos.length === 0) return;
      var positions = [];
      var normals = [];
      geos.forEach(function (g) {
        var idx = g.index;
        var pos = g.getAttribute('position');
        var nrm = g.getAttribute('normal');
        if (idx) {
          for (var i = 0; i < idx.count; i++) {
            var vi = idx.getX(i);
            positions.push(pos.getX(vi), pos.getY(vi), pos.getZ(vi));
            if (nrm) normals.push(nrm.getX(vi), nrm.getY(vi), nrm.getZ(vi));
            else normals.push(0, 1, 0);
          }
        } else {
          for (var j = 0; j < pos.count; j++) {
            positions.push(pos.getX(j), pos.getY(j), pos.getZ(j));
            if (nrm) normals.push(nrm.getX(j), nrm.getY(j), nrm.getZ(j));
            else normals.push(0, 1, 0);
          }
        }
      });
      var triCount = positions.length / 9;
      var bufLen = 84 + triCount * 50;
      var buf = new ArrayBuffer(bufLen);
      var dv = new DataView(buf);
      for (var h = 0; h < 80; h++) dv.setUint8(h, 0);
      dv.setUint32(80, triCount, true);
      var offset = 84;
      for (var t = 0; t < triCount; t++) {
        var ni = t * 9;
        dv.setFloat32(offset, normals[ni], true);
        dv.setFloat32(offset + 4, normals[ni + 1], true);
        dv.setFloat32(offset + 8, normals[ni + 2], true);
        offset += 12;
        for (var v = 0; v < 3; v++) {
          var pi = t * 9 + v * 3;
          dv.setFloat32(offset, positions[pi], true);
          dv.setFloat32(offset + 4, positions[pi + 1], true);
          dv.setFloat32(offset + 8, positions[pi + 2], true);
          offset += 12;
        }
        dv.setUint16(offset, 0, true);
        offset += 2;
      }
      var blob = new Blob([buf], { type: 'application/octet-stream' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'architecture_studio_' + Date.now() + '.stl';
      a.click();
      URL.revokeObjectURL(url);
      if (ctx.addToast) ctx.addToast('\uD83C\uDFD7\uFE0F Building exported as STL!', 'success');
    };

    // ══════════════════════════════════════════════════════════════
    // ── UPGRADE 2: Blueprint SVG Export ──
    // ══════════════════════════════════════════════════════════════
    var exportBlueprint = function () {
      if (blocks.length === 0) return;

      var cellSize = 40;
      var padding = 60;
      var legendH = 80;
      var svgW = buildW * cellSize + padding * 2;
      var svgH = buildD * cellSize + padding * 2 + legendH;

      // Group blocks by Y-level; show top-down view of the highest Y at each (x,z)
      var topView = {};
      blocks.forEach(function (b) {
        var key = b.x + ',' + b.z;
        if (!topView[key] || b.y > topView[key].y) {
          topView[key] = b;
        }
      });

      // Shape icon lookup
      var shapeIconLookup = {};
      shapes.forEach(function (s) { shapeIconLookup[s.id] = s.icon; });

      var svg = '';
      svg += '<svg xmlns="http://www.w3.org/2000/svg" width="' + svgW + '" height="' + svgH + '" viewBox="0 0 ' + svgW + ' ' + svgH + '">\n';
      svg += '<style>text{font-family:Arial,Helvetica,sans-serif;}</style>\n';
      svg += '<rect width="' + svgW + '" height="' + svgH + '" fill="#0f172a"/>\n';

      // Title
      svg += '<text x="' + (svgW / 2) + '" y="28" text-anchor="middle" fill="#f8fafc" font-size="16" font-weight="bold">';
      svg += (styleMode === 'bricks' ? 'Brick Builder' : 'Architecture Studio') + ' \u2014 Floor Plan</text>\n';
      svg += '<text x="' + (svgW / 2) + '" y="46" text-anchor="middle" fill="#64748b" font-size="11">';
      svg += buildW + '\u00D7' + buildD + '\u00D7' + buildH + ' \u2022 ' + totalBlocks + ' blocks \u2022 Vol: ' + totalVolume + ' u\u00B3</text>\n';

      // Grid
      var gridOffX = padding;
      var gridOffY = padding;
      for (var gx = 0; gx <= buildW; gx++) {
        svg += '<line x1="' + (gridOffX + gx * cellSize) + '" y1="' + gridOffY + '" x2="' + (gridOffX + gx * cellSize) + '" y2="' + (gridOffY + buildD * cellSize) + '" stroke="#334155" stroke-width="0.5"/>\n';
      }
      for (var gz = 0; gz <= buildD; gz++) {
        svg += '<line x1="' + gridOffX + '" y1="' + (gridOffY + gz * cellSize) + '" x2="' + (gridOffX + buildW * cellSize) + '" y2="' + (gridOffY + gz * cellSize) + '" stroke="#334155" stroke-width="0.5"/>\n';
      }

      // Axis labels
      for (var lx = 0; lx < buildW; lx++) {
        svg += '<text x="' + (gridOffX + lx * cellSize + cellSize / 2) + '" y="' + (gridOffY - 6) + '" text-anchor="middle" fill="#475569" font-size="9">' + (minX + lx) + '</text>\n';
      }
      for (var lz = 0; lz < buildD; lz++) {
        svg += '<text x="' + (gridOffX - 8) + '" y="' + (gridOffY + lz * cellSize + cellSize / 2 + 3) + '" text-anchor="end" fill="#475569" font-size="9">' + (minZ + lz) + '</text>\n';
      }

      // Blocks (top-down view)
      var usedMaterials = {};
      Object.keys(topView).forEach(function (key) {
        var b = topView[key];
        var bx = (b.x - minX) * cellSize + gridOffX;
        var bz = (b.z - minZ) * cellSize + gridOffY;
        var fillColor = b.color || matColorLookup[b.material || 'stone'] || '#94a3b8';
        var matId = b.material || 'stone';
        usedMaterials[matId] = fillColor;

        svg += '<rect x="' + (bx + 1) + '" y="' + (bz + 1) + '" width="' + (cellSize - 2) + '" height="' + (cellSize - 2) + '" fill="' + fillColor + '" fill-opacity="0.7" stroke="' + fillColor + '" stroke-width="1.5" rx="3"/>\n';

        // Shape icon
        var icon = shapeIconLookup[b.shape || 'block'] || '\uD83D\uDFE6';
        svg += '<text x="' + (bx + cellSize / 2) + '" y="' + (bz + cellSize / 2 - 2) + '" text-anchor="middle" font-size="14" dominant-baseline="middle">' + icon + '</text>\n';

        // Y-level label
        svg += '<text x="' + (bx + cellSize - 5) + '" y="' + (bz + cellSize - 5) + '" text-anchor="end" fill="#fff" font-size="8" font-weight="bold" opacity="0.8">y' + b.y + '</text>\n';
      });

      // Legend
      var legendY = gridOffY + buildD * cellSize + 20;
      svg += '<text x="' + gridOffX + '" y="' + legendY + '" fill="#94a3b8" font-size="10" font-weight="bold">MATERIALS</text>\n';
      var legendIdx = 0;
      Object.keys(usedMaterials).forEach(function (matId) {
        var lx = gridOffX + legendIdx * 90;
        svg += '<rect x="' + lx + '" y="' + (legendY + 6) + '" width="12" height="12" fill="' + usedMaterials[matId] + '" rx="2"/>\n';
        svg += '<text x="' + (lx + 16) + '" y="' + (legendY + 16) + '" fill="#cbd5e1" font-size="10">' + matId.charAt(0).toUpperCase() + matId.slice(1) + '</text>\n';
        legendIdx++;
      });

      // Stability stamp
      svg += '<text x="' + (svgW - padding) + '" y="' + legendY + '" text-anchor="end" fill="#64748b" font-size="10">';
      svg += 'Stability: ' + analysis.stabilityEmoji + ' ' + analysis.stability + '% \u2022 CoG: (' + analysis.cogX + ',' + analysis.cogY + ',' + analysis.cogZ + ')</text>\n';

      svg += '</svg>';

      var blob = new Blob([svg], { type: 'image/svg+xml' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'blueprint_' + Date.now() + '.svg';
      a.click();
      URL.revokeObjectURL(url);
      if (ctx.addToast) ctx.addToast('\uD83D\uDCD0 Blueprint exported as SVG!', 'success');
    };

    // ── Undo ──
    var undoBlock = function () {
      ctx.setToolData(function (p) {
        var a = Object.assign({}, p.archStudio || {});
        var nb = (a.blocks || []).slice(0, -1);
        return Object.assign({}, p, { archStudio: Object.assign({}, a, { blocks: nb }) });
      });
    };

    // ── Clear all ──
    var clearAll = function () {
      ctx.setToolData(function (p) {
        var a = Object.assign({}, p.archStudio || {});
        return Object.assign({}, p, { archStudio: Object.assign({}, a, { blocks: [] }) });
      });
    };

    // ── Coach tips (challenge-aware → analysis-aware → progressive) ──
    var coachTip;
    if (justCompleted && challengeProgress) {
      coachTip = '\uD83C\uDFC6 ' + challengeProgress.challenge.title + ' complete! ' + challengeProgress.challenge.fact;
    } else if (challengeProgress && !challengeProgress.passed) {
      coachTip = '\uD83C\uDFAF ' + challengeProgress.challenge.icon + ' ' + challengeProgress.challenge.desc + ' \u2014 keep building!';
    } else if (showAnalysis && analysis.tip) {
      coachTip = analysis.tip;
    } else if (totalBlocks === 0) {
      coachTip = '\uD83C\uDFD7\uFE0F Click on the grid to place your first block! Try the \uD83C\uDFC6 Challenges for guided building!';
    } else if (totalBlocks < 5) {
      coachTip = '\uD83D\uDCA1 Tip: Click on the side of an existing block to stack blocks upward. Try building a simple wall!';
    } else if (totalBlocks < 15) {
      coachTip = '\uD83C\uDFDB\uFE0F Try adding columns and arches to give your structure a classical look. Ancient Greeks used columns to support roofs.';
    } else if (totalBlocks < 30) {
      coachTip = '\uD83C\uDFE0 Great progress! Mix materials for visual contrast \u2014 try a stone foundation with wooden walls and a brick chimney.';
    } else if (totalBlocks < 50) {
      coachTip = '\uD83C\uDF09 Fun fact: The Roman Colosseum used 80 arched entrances. Try adding arches to your design!';
    } else {
      coachTip = '\uD83C\uDFF0 You\'re an architect! The Great Wall of China used over 3.8 billion bricks. How big can you build?';
    }

    // ── Render Helpers ──
    var el = React.createElement;

    // Analysis bar renderer helper
    var analysisBar = function (label, value, max, color, suffix) {
      var pct = max > 0 ? Math.round((value / max) * 100) : 0;
      return el('div', { style: { marginBottom: 8 } },
        el('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 2 } },
          el('span', { style: { fontSize: 10, color: '#94a3b8', fontWeight: 600 } }, label),
          el('span', { style: { fontSize: 10, color: color, fontWeight: 700 } }, value + (suffix || ''))
        ),
        el('div', { style: { height: 6, background: '#1e293b', borderRadius: 3, overflow: 'hidden' } },
          el('div', { style: { height: '100%', width: Math.min(100, pct) + '%', background: color, borderRadius: 3, transition: 'width 0.3s ease' } })
        )
      );
    };

    // ══════════════════════════════════════════════════════════════
    // ── RENDER ──
    // ══════════════════════════════════════════════════════════════
    return el('div', { key: 'archStudio', style: { display: 'flex', flexDirection: 'column', height: '100%', background: '#0f172a', borderRadius: 16, overflow: 'hidden' } },
      // ── Header bar ──
      el('div', { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'linear-gradient(90deg,#1e293b,#0f172a)', borderBottom: '1px solid #334155', flexWrap: 'wrap' } },
        el('button', { onClick: function () { ctx.setStemLabTool(''); }, style: { background: 'rgba(71,85,105,.5)', border: 'none', color: '#e2e8f0', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 } }, '\u2190 Back'),
        el('span', { style: { fontSize: 20 } }, styleMode === 'bricks' ? '\uD83E\uDDF1' : '\uD83C\uDFD7\uFE0F'),
        el('span', { style: { fontWeight: 700, fontSize: 17, color: '#f8fafc', letterSpacing: 0.5 } }, styleMode === 'bricks' ? 'Brick Builder' : 'Architecture Studio'),
        el('span', { style: { fontSize: 11, color: '#64748b', marginLeft: 4 } }, blocks.length + ' blocks'),
        // Style mode toggle
        el('button', { onClick: function () { upd('styleMode', styleMode === 'architect' ? 'bricks' : 'architect'); }, style: { background: styleMode === 'bricks' ? 'rgba(239,68,68,.2)' : 'rgba(99,102,241,.15)', border: '1px solid ' + (styleMode === 'bricks' ? '#f87171' : '#6366f1'), color: styleMode === 'bricks' ? '#fca5a5' : '#a5b4fc', borderRadius: 20, padding: '4px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 700 } }, styleMode === 'bricks' ? '\uD83E\uDDF1 Bricks' : '\uD83C\uDFDB\uFE0F Architect'),
        // Blueprint toggle
        el('button', { onClick: function () { upd('blueprintView', !blueprintView); }, style: { background: blueprintView ? 'rgba(34,211,238,.2)' : 'rgba(71,85,105,.3)', border: '1px solid ' + (blueprintView ? '#22d3ee' : '#475569'), color: blueprintView ? '#67e8f9' : '#94a3b8', borderRadius: 20, padding: '4px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 700 } }, blueprintView ? '\uD83D\uDCD0 Blueprint' : '\uD83C\uDFD7\uFE0F 3D View'),
        // Challenges toggle
        el('button', { onClick: function () { upd('showChallenges', !showChallenges); }, style: { background: showChallenges ? 'rgba(245,158,11,.2)' : 'rgba(71,85,105,.3)', border: '1px solid ' + (showChallenges ? '#f59e0b' : '#475569'), color: showChallenges ? '#fbbf24' : '#94a3b8', borderRadius: 20, padding: '4px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 700 } }, '\uD83C\uDFC6 Challenges' + (completedCount > 0 ? ' ' + completedCount + '/10' : '')),
        // Analysis toggle
        el('button', { onClick: function () { upd('showAnalysis', !showAnalysis); }, style: { background: showAnalysis ? 'rgba(168,85,247,.2)' : 'rgba(71,85,105,.3)', border: '1px solid ' + (showAnalysis ? '#a855f7' : '#475569'), color: showAnalysis ? '#c084fc' : '#94a3b8', borderRadius: 20, padding: '4px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 700 } }, '\uD83D\uDCD0 Analysis'),
        el('div', { style: { flex: 1 } }),
        el('button', { onClick: undoBlock, disabled: blocks.length === 0, style: { background: 'rgba(71,85,105,.5)', border: 'none', color: blocks.length ? '#e2e8f0' : '#475569', borderRadius: 8, padding: '6px 12px', cursor: blocks.length ? 'pointer' : 'default', fontSize: 12, fontWeight: 600 } }, '\u21A9 Undo'),
        el('button', { onClick: clearAll, disabled: blocks.length === 0, style: { background: blocks.length ? 'rgba(239,68,68,.3)' : 'rgba(71,85,105,.3)', border: blocks.length ? '1px solid rgba(239,68,68,.4)' : '1px solid transparent', color: blocks.length ? '#fca5a5' : '#475569', borderRadius: 8, padding: '6px 12px', cursor: blocks.length ? 'pointer' : 'default', fontSize: 12, fontWeight: 600 } }, '\uD83D\uDDD1\uFE0F Clear'),
        el('button', { onClick: exportBlueprint, disabled: blocks.length === 0, style: { background: blocks.length ? 'rgba(34,211,238,.2)' : 'rgba(71,85,105,.3)', border: blocks.length ? '1px solid #22d3ee' : '1px solid transparent', color: blocks.length ? '#67e8f9' : '#475569', borderRadius: 8, padding: '6px 14px', cursor: blocks.length ? 'pointer' : 'default', fontSize: 12, fontWeight: 700 } }, '\uD83D\uDCD0 Blueprint SVG'),
        el('button', { onClick: exportSTL, disabled: blocks.length === 0, style: { background: blocks.length ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'rgba(71,85,105,.3)', border: 'none', color: blocks.length ? '#fff' : '#475569', borderRadius: 8, padding: '6px 14px', cursor: blocks.length ? 'pointer' : 'default', fontSize: 12, fontWeight: 700 } }, '\uD83D\uDCE5 Export STL')
      ),
      // ── Main content: sidebar + viewport ──
      el('div', { style: { display: 'flex', flex: 1, overflow: 'hidden' } },
        // ── Left sidebar ──
        el('div', { style: { width: 180, background: '#1e293b', padding: '12px 10px', overflowY: 'auto', borderRight: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: 14 } },
          // Tool mode selector
          el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 } }, 'Mode'),
            el('div', { style: { display: 'flex', gap: 4 } },
              modes.map(function (m) {
                return el('button', {
                  key: m.id,
                  onClick: function () { upd('mode', m.id); },
                  style: {
                    flex: 1, padding: '6px 4px', fontSize: 11, fontWeight: 600, border: mode === m.id ? '2px solid #f59e0b' : '1px solid #475569',
                    borderRadius: 8, background: mode === m.id ? 'rgba(245,158,11,.15)' : 'rgba(30,41,59,.8)', color: mode === m.id ? '#fbbf24' : '#94a3b8',
                    cursor: 'pointer', textAlign: 'center'
                  }
                }, m.icon + ' ' + m.label);
              })
            )
          ),
          // Shape palette (12 shapes, 2-col grid)
          el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 } }, 'Shapes'),
            el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 } },
              shapes.map(function (s) {
                return el('button', {
                  key: s.id,
                  onClick: function () { upd('activeShape', s.id); },
                  style: {
                    padding: '8px 4px', fontSize: 11, fontWeight: 600, border: activeShape === s.id ? '2px solid #60a5fa' : '1px solid #334155',
                    borderRadius: 8, background: activeShape === s.id ? 'rgba(96,165,250,.12)' : 'transparent', color: activeShape === s.id ? '#93c5fd' : '#94a3b8',
                    cursor: 'pointer', textAlign: 'center', lineHeight: 1.2
                  }
                }, el('div', { style: { fontSize: 18 } }, s.icon), s.label);
              })
            )
          ),
          // Material palette
          el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 } }, 'Materials'),
            el('div', { style: { display: 'flex', flexDirection: 'column', gap: 3 } },
              materials.map(function (m) {
                return el('button', {
                  key: m.id,
                  onClick: function () { upd({ activeMaterial: m.id, activeColor: m.color }); },
                  style: {
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', fontSize: 11, fontWeight: 600,
                    border: activeMaterial === m.id ? '2px solid ' + m.color : '1px solid #334155',
                    borderRadius: 8, background: activeMaterial === m.id ? 'rgba(255,255,255,.06)' : 'transparent',
                    color: activeMaterial === m.id ? '#f8fafc' : '#94a3b8', cursor: 'pointer', textAlign: 'left'
                  }
                },
                  el('span', { style: { width: 18, height: 18, borderRadius: 4, background: m.color, display: 'inline-block', flexShrink: 0, border: '1px solid rgba(255,255,255,.15)' } }),
                  m.icon + ' ' + m.label
                );
              })
            )
          ),
          // Custom Color Palette
          el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 } }, '\uD83C\uDFA8 Custom Color'),
            el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
              ['#ef4444','#f97316','#f59e0b','#eab308','#84cc16','#22c55e','#14b8a6','#06b6d4','#3b82f6','#6366f1','#8b5cf6','#a855f7','#ec4899','#f43f5e','#f8fafc','#94a3b8','#64748b','#1e293b'].map(function (c) {
                return el('button', {
                  key: c,
                  onClick: function () { upd('activeColor', c); },
                  title: c,
                  style: {
                    width: 22, height: 22, borderRadius: 6, background: c, cursor: 'pointer',
                    border: activeColor === c ? '3px solid #fff' : '1px solid rgba(255,255,255,.2)',
                    boxShadow: activeColor === c ? '0 0 8px ' + c + '88' : 'none',
                    transform: activeColor === c ? 'scale(1.15)' : 'scale(1)',
                    transition: 'all 0.15s ease'
                  }
                });
              })
            ),
            el('div', { style: { marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 } },
              el('span', { style: { width: 16, height: 16, borderRadius: 4, background: activeColor, display: 'inline-block', border: '1px solid rgba(255,255,255,.3)' } }),
              el('span', { style: { fontSize: 10, color: '#94a3b8' } }, 'Active: ' + activeColor)
            )
          ),
          // ── Challenge Panel (sidebar) ──
          showChallenges && el('div', null,
            el('div', { style: { fontSize: 10, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 } }, '\uD83C\uDFC6 Challenges (' + completedCount + '/10)'),
            el('div', { style: { display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 240, overflowY: 'auto' } },
              challenges.map(function (ch) {
                var done = !!completedChallenges[ch.id];
                var isActive = activeChallenge === ch.id;
                var passed = isActive && challengeProgress && challengeProgress.passed;
                return el('button', {
                  key: ch.id,
                  onClick: function () {
                    if (done) return;
                    upd('activeChallenge', isActive ? -1 : ch.id);
                  },
                  style: {
                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', fontSize: 10, fontWeight: 600,
                    border: done ? '1px solid #22c55e' : isActive ? '2px solid #f59e0b' : '1px solid #334155',
                    borderRadius: 8,
                    background: done ? 'rgba(34,197,94,.1)' : isActive ? 'rgba(245,158,11,.1)' : 'transparent',
                    color: done ? '#4ade80' : isActive ? '#fbbf24' : '#94a3b8',
                    cursor: done ? 'default' : 'pointer', textAlign: 'left', width: '100%',
                    opacity: done ? 0.7 : 1
                  }
                },
                  el('span', { style: { fontSize: 14, flexShrink: 0 } }, done ? '\u2705' : ch.icon),
                  el('div', { style: { flex: 1, minWidth: 0 } },
                    el('div', { style: { fontWeight: 700, fontSize: 10, lineHeight: 1.2 } }, ch.title),
                    el('div', { style: { fontSize: 9, color: done ? '#22c55e' : '#64748b', lineHeight: 1.2, marginTop: 1 } }, done ? 'Completed!' : ch.desc)
                  ),
                  el('span', { style: { fontSize: 9, color: done ? '#22c55e' : '#f59e0b', fontWeight: 700, flexShrink: 0 } }, done ? '\u2605' : '+' + ch.xp)
                );
              })
            ),
            // Active challenge completion button
            justCompleted && challengeProgress && el('button', {
              onClick: completeChallenge,
              style: {
                marginTop: 8, width: '100%', padding: '8px 12px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff',
                fontWeight: 700, fontSize: 11, cursor: 'pointer',
                animation: 'pulse 1.5s ease-in-out infinite'
              }
            }, '\uD83C\uDFC6 Claim +' + challengeProgress.challenge.xp + ' XP!')
          )
        ),
        // ── Main viewport area ──
        el('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' } },
          // Three.js canvas
          !threeReady
            ? el('div', { style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 14 } },
              el('div', { style: { textAlign: 'center' } },
                el('div', { style: { fontSize: 32, marginBottom: 8, animation: 'spin 2s linear infinite' } }, '\u2699\uFE0F'),
                'Loading 3D engine...'
              )
            )
            : el('canvas', {
              id: 'arch-studio-canvas',
              style: { flex: 1, width: '100%', display: 'block', cursor: mode === 'place' ? 'crosshair' : mode === 'erase' ? 'not-allowed' : 'pointer' }
            }),
          // Controls overlay
          el('div', { style: { position: 'absolute', top: 10, right: 10, background: 'rgba(15,23,42,.85)', borderRadius: 10, padding: '8px 12px', fontSize: 10, color: '#64748b', lineHeight: 1.5, backdropFilter: 'blur(8px)', border: '1px solid #1e293b' } },
            el('div', null, '\uD83D\uDD04 Drag \u2014 Orbit'),
            el('div', null, '\uD83D\uDD0D Scroll \u2014 Zoom'),
            el('div', null, '\u2747\uFE0F Right-drag \u2014 Pan'),
            el('div', null, '\uD83D\uDC49 Click \u2014 ' + (mode === 'place' ? 'Place block' : mode === 'erase' ? 'Remove block' : 'Paint block'))
          ),
          // Mode indicator overlay
          el('div', { style: { position: 'absolute', top: 10, left: 10, background: mode === 'place' ? 'rgba(34,197,94,.2)' : mode === 'erase' ? 'rgba(239,68,68,.2)' : 'rgba(168,85,247,.2)', border: '1px solid ' + (mode === 'place' ? '#22c55e' : mode === 'erase' ? '#ef4444' : '#a855f7'), borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 700, color: mode === 'place' ? '#4ade80' : mode === 'erase' ? '#f87171' : '#c084fc' } },
            (mode === 'place' ? '\u2795 Place' : mode === 'erase' ? '\u274C Erase' : '\uD83C\uDFA8 Paint') + ' Mode'
          ),

          // ── UPGRADE 3: Structural Analysis Panel (overlay, right side) ──
          showAnalysis && totalBlocks > 0 && el('div', { style: { position: 'absolute', top: 80, right: 10, width: 220, background: 'rgba(15,23,42,.92)', borderRadius: 12, padding: '14px 16px', backdropFilter: 'blur(12px)', border: '1px solid #334155', zIndex: 10 } },
            el('div', { style: { fontSize: 11, fontWeight: 700, color: '#c084fc', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 } },
              '\uD83D\uDCD0 Structural Analysis'
            ),
            // Stability score (big)
            el('div', { style: { textAlign: 'center', marginBottom: 12, padding: '10px 0', background: 'rgba(30,41,59,.6)', borderRadius: 10, border: '1px solid #334155' } },
              el('div', { style: { fontSize: 28, marginBottom: 2 } }, analysis.stabilityEmoji),
              el('div', { style: { fontSize: 22, fontWeight: 800, color: analysis.stability >= 70 ? '#4ade80' : analysis.stability >= 40 ? '#fbbf24' : '#f87171' } }, analysis.stability + '%'),
              el('div', { style: { fontSize: 10, color: '#94a3b8', fontWeight: 600 } }, analysis.stabilityLabel)
            ),
            // Metric bars
            analysisBar('Load Support', analysis.supportedPct, 100, analysis.supportedPct >= 80 ? '#4ade80' : analysis.supportedPct >= 50 ? '#fbbf24' : '#f87171', '%'),
            analysisBar('Symmetry', analysis.symmetry, 100, analysis.symmetry >= 70 ? '#60a5fa' : analysis.symmetry >= 40 ? '#fbbf24' : '#f87171', '%'),
            // Detail rows
            el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 6 } },
              [
                { label: 'CoG', value: '(' + analysis.cogX + ',' + analysis.cogY + ',' + analysis.cogZ + ')', icon: '\u2316' },
                { label: 'Weight', value: analysis.totalWeight + ' t', icon: '\u2696\uFE0F' },
                { label: 'Materials', value: analysis.materialCount, icon: '\uD83C\uDFA8' },
                { label: 'Floating', value: analysis.unsupported, icon: analysis.unsupported > 0 ? '\u26A0\uFE0F' : '\u2705' }
              ].map(function (r) {
                return el('div', { key: r.label, style: { background: 'rgba(30,41,59,.5)', borderRadius: 8, padding: '6px 8px', textAlign: 'center' } },
                  el('div', { style: { fontSize: 9, color: '#64748b', fontWeight: 600 } }, r.icon + ' ' + r.label),
                  el('div', { style: { fontSize: 12, fontWeight: 700, color: r.label === 'Floating' && analysis.unsupported > 0 ? '#f87171' : '#f8fafc' } }, r.value)
                );
              })
            ),
            // Floating blocks warning
            analysis.unsupported > 0 && el('div', { style: { marginTop: 8, padding: '8px 10px', background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 8, fontSize: 10, color: '#fca5a5', lineHeight: 1.4 } },
              '\u26A0\uFE0F ' + analysis.unsupported + ' block' + (analysis.unsupported > 1 ? 's' : '') + ' floating with no support below! Real structures need load paths to the ground.'
            )
          ),

          // ── Bottom stats bar ──
          el('div', { style: { display: 'flex', gap: 16, justifyContent: 'center', padding: '8px 16px', background: 'linear-gradient(0deg,#1e293b,#0f172a)', borderTop: '1px solid #334155', flexWrap: 'wrap' } },
            [
              { label: 'Blocks', value: totalBlocks, icon: '\uD83E\uDDF1' },
              { label: 'Dimensions', value: blocks.length > 0 ? buildW + '\u00D7' + buildD + '\u00D7' + buildH : '\u2014', icon: '\uD83D\uDCCF' },
              { label: 'Volume', value: totalVolume + ' u\u00B3', icon: '\uD83D\uDCE6' },
              { label: 'Footprint', value: footprint + ' u\u00B2', icon: '\uD83D\uDDFA\uFE0F' },
              { label: 'Surface', value: surfaceArea + ' u\u00B2', icon: '\uD83D\uDCC0' },
              { label: 'Stability', value: analysis.stabilityEmoji + ' ' + analysis.stability + '%', icon: '\uD83C\uDFD7\uFE0F' },
              { label: 'Challenges', value: completedCount + '/10', icon: '\uD83C\uDFC6' }
            ].map(function (stat) {
              return el('div', { key: stat.label, style: { textAlign: 'center' } },
                el('div', { style: { fontSize: 11, color: '#64748b', fontWeight: 600 } }, stat.icon + ' ' + stat.label),
                el('div', { style: { fontSize: 16, fontWeight: 700, color: '#f8fafc' } }, stat.value)
              );
            })
          )
        )
      ),
      // ── Coach panel ──
      el('div', { style: { padding: '10px 16px', background: '#1e293b', borderTop: '1px solid #334155', fontSize: 12, color: '#94a3b8', lineHeight: 1.5 } },
        coachTip
      )
    );
  }});
})();
