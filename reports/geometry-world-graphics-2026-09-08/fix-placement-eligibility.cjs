const fs = require('fs');
const file = 'stem_lab/stem_tool_geometryworld.js';
let source = fs.readFileSync(file, 'utf8');
function replace(old, next) {
  if (!source.includes(old)) throw Error('Missing edit anchor: ' + old.slice(0, 120));
  source = source.replace(old, next);
}
replace('        engine.raycaster.far = 8;', `        // The preview, direct creation, and crosshair action share the same rules.
        // Sandbox coordinates match editable-world bounds; authored lessons keep
        // their existing coordinate scope, including their own ground level.
        engine.getPlacementEligibility = function(x, y, z) {
          var cell = { x:x, y:y, z:z }, code = 'ready', reason = 'Ready to build';
          var lesson = engine._currentLesson || {}, ground = lesson.ground || {};
          var floor = typeof ground.y === 'number' && isFinite(ground.y) ? ground.y : 0;
          if (![x,y,z].every(function(v) { return typeof v === 'number' && isFinite(v) && Math.floor(v) === v; })) {
            code = 'out_of_bounds'; reason = 'Choose a whole-number grid cell';
          } else if (!engine._placingLessonBlocks && y < floor) {
            code = 'below_floor'; reason = 'Cannot build below the floor';
          } else if (!engine._placingLessonBlocks && lesson.sandbox && (Math.abs(x) > 64 || Math.abs(z) > 64 || y > 128)) {
            code = 'out_of_bounds'; reason = 'World edge: X and Z must be between -64 and 64, Y at most 128';
          } else if (engine.blocks[x + ',' + y + ',' + z]) {
            code = 'occupied'; reason = 'This cell already has a block';
          } else if ((engine.getBlocksArr ? engine.getBlocksArr().length : Object.keys(engine.blocks).length) >= MAX_BLOCKS) {
            code = 'block_limit'; reason = 'Block limit reached (' + MAX_BLOCKS + '). Remove a block first';
          }
          return { allowed:code === 'ready', code:code, reason:reason, cell:cell };
        };
        engine.placementForHit = function(hit) {
          var cell = engine.placementCellForHit(hit);
          return cell ? engine.getPlacementEligibility(cell.x,cell.y,cell.z) : { allowed:false, code:'no_target', reason:'Aim at a block face to build', cell:null };
        };
        engine.publishPlacementPreview = function(preview) {
          preview = preview || engine.placementForHit(null);
          engine._placementPreview = preview;
          var hint = preview.code !== 'no_target' && !engine._showcase ? { allowed:preview.allowed, code:preview.code, reason:preview.reason } : null;
          var signature = hint ? hint.allowed + '|' + hint.code + '|' + hint.reason : '';
          if (signature !== engine._placementHintSignature) {
            engine._placementHintSignature = signature;
            upd('placementHint', hint);
          }
          return preview;
        };
        engine.publishPlacementPreview(null);

        engine.raycaster.far = 8;`);
replace('        function pushUndo(action) {\n          engine._undoStack.push(action);', '        function pushUndo(action) {\n          if (engine._replayingHistory) return;\n          engine._undoStack.push(action);');
replace(`            engine.placeBlock(a.x, a.y, a.z, a.type, a.shape, a.rotation);
            // Pop the undo entry that placeBlock just added (avoid double-entry)
            engine._undoStack.pop();`, `            var restored;
            engine._replayingHistory = true;
            try { restored = engine.placeBlock(a.x, a.y, a.z, a.type, a.shape, a.rotation); }
            finally { engine._replayingHistory = false; }
            if (!restored) { engine._undoStack.push(a); return false; }`);
replace(`            engine.placeBlock(a.x, a.y, a.z, a.type, a.shape, a.rotation);
            // Pop the undo that placeBlock added (we manage it ourselves)
            engine._undoStack.pop();`, `            var replayed;
            engine._replayingHistory = true;
            try { replayed = engine.placeBlock(a.x, a.y, a.z, a.type, a.shape, a.rotation); }
            finally { engine._replayingHistory = false; }
            if (!replayed) { engine._redoStack.push(a); return false; }`);
replace(`        engine.placeBlock = function(x, y, z, type, shape, rotation) {
          var key = x + ',' + y + ',' + z;
          if (engine.blocks[key]) return;`, `        engine.placeBlock = function(x, y, z, type, shape, rotation) {
          var eligibility = engine.getPlacementEligibility(x, y, z);
          if (!eligibility.allowed) return null;
          var key = x + ',' + y + ',' + z;`);
replace(`            mesh.userData._torchGlow = tGlow;
          }
        };`, `            mesh.userData._torchGlow = tGlow;
          }
          return mesh;
        };`);
replace(`              // Block limit check
              if (Object.keys(engine.blocks).length >= MAX_BLOCKS) {
                if (addToast) addToast('\\u26A0\\uFE0F Block limit reached (' + MAX_BLOCKS + '). Remove blocks first!', 'error');
                return;
              }
              var placement = engine.placementCellForHit(hit);
              if (!placement) return;
              var placeX = placement.x, placeY = placement.y, placeZ = placement.z;`, `              var eligibility = engine.placementForHit(hit);
              engine.publishPlacementPreview(eligibility);
              if (!eligibility.allowed) {
                if (addToast) addToast(eligibility.reason, 'info');
                announceToSR(eligibility.reason);
                return null;
              }
              var placeX = eligibility.cell.x, placeY = eligibility.cell.y, placeZ = eligibility.cell.z;`);
replace(`              engine.placeBlock(placeX, placeY, placeZ, placeType, shapeDef2.id, ps.blockRotation);
              // A short scale-in so the block feels set down rather than switched on.
              var placedMesh = engine.blocks[placeX + ',' + placeY + ',' + placeZ];`, `              var placedMesh = engine.placeBlock(placeX, placeY, placeZ, placeType, shapeDef2.id, ps.blockRotation);
              // Creation is the transaction boundary: a rejected cell never changes
              // counters, rewards, history, particles, or an existing block's scale.
              if (!placedMesh) return null;
              // A short scale-in so the block feels set down rather than switched on.`);
replace(`              if (ps.collabMode) { clearTimeout(engine._collabSyncTimer); engine._collabSyncTimer = setTimeout(syncBlocksToFirestore, 500); }
            }
          }
        };`, `              if (ps.collabMode) { clearTimeout(engine._collabSyncTimer); engine._collabSyncTimer = setTimeout(syncBlocksToFirestore, 500); }
              return placedMesh;
            }
          } else if (action === 'place') {
            engine.publishPlacementPreview(null);
            announceToSR(engine._placementPreview.reason);
          }
          return null;
        };`);
replace(`            engine._crosshairTarget = 'none';
            return;
          }
          engine.raycaster.setFromCamera`, `            engine._crosshairTarget = 'none';
            engine.publishPlacementPreview(null);
            return;
          }
          engine.raycaster.setFromCamera`);
replace(`            var previewCell = engine.placementCellForHit(hits[0]);
            if (!previewCell) { if (engine._ghostMesh) engine._ghostMesh.visible = false; return; }
            var gx = previewCell.x, gy = previewCell.y, gz = previewCell.z;`, `            var preview = engine.placementForHit(hits[0]);
            engine.publishPlacementPreview(preview);
            if (!preview.cell) { if (engine._ghostMesh) engine._ghostMesh.visible = false; return; }
            var gx = preview.cell.x, gy = preview.cell.y, gz = preview.cell.z;`);
replace('              var gMat = new THREE.MeshBasicMaterial({ color: 0xa78bfa,', '              var gMat = new THREE.MeshBasicMaterial({ color: 0x9dddb5,');
replace('new THREE.LineBasicMaterial({ color: 0xc4b5fd, transparent: true, opacity: 0.75, depthWrite: false })', 'new THREE.LineBasicMaterial({ color: 0xd6f4df, transparent: true, opacity: 0.75, depthWrite: false })');
replace(`            engine._ghostMesh.visible = true;
            // Gentle breathing pulse`, `            engine._ghostMesh.visible = true;
            engine._ghostMesh.userData.placementAllowed = preview.allowed;
            engine._ghostMesh.userData.placementReason = preview.reason;
            engine._ghostMesh.material.color.setHex(preview.allowed ? 0x9dddb5 : 0xf16c58);
            if (engine._ghostEdges) {
              engine._ghostEdges.material.color.setHex(preview.allowed ? 0xd6f4df : 0xffbc9e);
              engine._ghostEdges.material.depthTest = preview.allowed;
            }
            // Gentle breathing pulse`);
replace(`            var ghostPulse = 0.5 + Math.sin(ghostT * 2.5) * 0.5; // 0..1`, `            var ghostPulse = !preview.allowed || engine._rmHover || engine._ambientMotionEnabled === false ? 0.35 : 0.5 + Math.sin(ghostT * 2.5) * 0.5; // 0..1`);
replace(`            engine._ghostMesh.material.opacity = measuring ? 0.03 : 0.12 + ghostPulse * 0.14;
            if (engine._ghostEdges) engine._ghostEdges.material.opacity = measuring ? 0.22 : 0.55 + ghostPulse * 0.3;
            var ghostScale = 1 + ghostPulse * 0.02;`, `            engine._ghostMesh.material.opacity = !preview.allowed ? 0.08 : measuring ? 0.03 : 0.10 + ghostPulse * 0.10;
            if (engine._ghostEdges) engine._ghostEdges.material.opacity = !preview.allowed ? 0.95 : measuring ? 0.22 : 0.65 + ghostPulse * 0.2;
            var ghostScale = !preview.allowed || engine._rmHover || engine._ambientMotionEnabled === false ? 1.006 : 1 + ghostPulse * 0.02;`);
replace(`          } else {
            if (engine._ghostMesh) engine._ghostMesh.visible = false;
          }
        }

        // ── Collision helper`, `          } else {
            if (engine._ghostMesh) engine._ghostMesh.visible = false;
            engine.publishPlacementPreview(null);
          }
        }
        engine.updateGhostPreview = updateGhostPreview;

        // ── Collision helper`);
replace('          origPlace.apply(engine, arguments);', '          var placed = origPlace.apply(engine, arguments);');
replace(`            engine.logEvent('block_place', { x: x, y: y, z: z, type: type, shape: shape || 'cube', rotation: rotation || 0 });
          }
        };`, `            engine.logEvent('block_place', { x: x, y: y, z: z, type: type, shape: shape || 'cube', rotation: rotation || 0 });
          }
          return placed;
        };`);
replace('          if (!engine.isInputActive() || !THREE) {', '          if (engine._showcase || !engine.isInputActive() || !THREE) {');
replace('            // Update ghost block preview\n            updateGhostPreview();\n          }', '          }\n          // Run even when focus is lost so previews and accessible hints clear.\n          updateGhostPreview();');
replace('        engine.clearWorld = function() {', '        engine.clearWorld = function() {\n          if (engine.publishPlacementPreview) engine.publishPlacementPreview(null);');
new Function(source);
for (const target of [file, 'desktop/web-app/public/' + file]) {
  const fd=fs.openSync(target,'r+');fs.writeFileSync(fd,source);fs.ftruncateSync(fd,Buffer.byteLength(source));fs.closeSync(fd);
}
console.log('Applied placement eligibility, transactional success, history replay, and blocked ghost; syntax and mirror parity passed.');
