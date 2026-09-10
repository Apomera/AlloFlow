const fs = require('fs');
const file = 'stem_lab/stem_tool_geometryworld.js';
let source = fs.readFileSync(file, 'utf8');
function replace(old, next) {
  if (!source.includes(old)) throw Error('Missing edit anchor: ' + old.slice(0, 100));
  source = source.replace(old, next);
}
replace('          engine.isLocked = !!document.pointerLockElement;', '          engine.isLocked = document.pointerLockElement === canvas;');
replace(`        document.addEventListener('mousemove', _docH.mousemove = function(ev) {
          if (!engine.isLocked) return;`, `        document.addEventListener('mousemove', _docH.mousemove = function(ev) {
          if (engine._showcase || document.pointerLockElement !== canvas) return;`);
replace('          engine.isLocked = true; // Treat touch as "locked" for rendering purposes\n', '');
replace(`        engine.setTouchControlsEnabled = function(enabled) {
          engine._touchControlsEnabled = enabled !== false;
          resetTouchJoystick();
          resetTouchLookFeedback();
          if (!engine._touchControlsEnabled) {
            engine._touchActive = false;
            engine._touchLookId = null;
            engine._touchMoveId = null;
            engine._touchLookStart = null;
            engine._touchMoveStart = null;
            engine._touchMoveVec = { x: 0, z: 0 };
            if (engine.moveState) {
              engine.moveState.forward = false; engine.moveState.backward = false;
              engine.moveState.left = false; engine.moveState.right = false;
              engine.moveState.flyUp = false; engine.moveState.flyDown = false; engine._jumpLock = false;
            }
          }
        };`, `        // Camera modes take ownership from the previous gesture as a whole.
        engine.releaseInput = function() {
          engine.moveState = { forward:false, backward:false, left:false, right:false, sprint:false, flyUp:false, flyDown:false };
          engine.lookState = { left:false, right:false, up:false, down:false };
          engine._jumpLock = false;
          engine._lastSpaceTime = 0;
          engine._touchActive = false;
          engine._touchLookId = null; engine._touchMoveId = null;
          engine._touchLookStart = null; engine._touchMoveStart = null;
          engine._touchMoveVec = { x:0, z:0 };
          resetTouchJoystick(); resetTouchLookFeedback();
        };
        engine.refreshTouchActivity = function() {
          var movement = engine.moveState || {};
          // The action column and canvas can own different fingers. Releasing a
          // look finger must not interrupt an Up or Down button still held.
          engine._touchActive = engine._touchControlsEnabled !== false && !!(engine._touchMoveId != null || engine._touchLookId != null || movement.flyUp || movement.flyDown);
          return engine._touchActive;
        };
        engine.setTouchControlsEnabled = function(enabled) {
          engine._touchControlsEnabled = enabled !== false;
          resetTouchJoystick(); resetTouchLookFeedback();
          if (!engine._touchControlsEnabled) {
            engine.releaseInput();
            engine.isLocked = document.pointerLockElement === canvas;
          }
        };`);
replace(`          engine.isLocked = false;
          engine._touchActive = false;
          engine._entryAnim = null;
          engine._viewPresetAnim = null;`, `          engine.isLocked = false;
          engine.releaseInput();
          engine._entryAnim = null;
          engine._viewPresetAnim = null;`);
replace(`          engine.moveState.forward = false; engine.moveState.backward = false;
          engine.moveState.left = false; engine.moveState.right = false;
          var focus = getGuidedTourFocus`, `          var focus = getGuidedTourFocus`);
replace(`          engine._touchActive = false;
          if (engine.moveState) {
            engine.moveState.forward = false; engine.moveState.backward = false;
            engine.moveState.left = false; engine.moveState.right = false;
          }
          setGuidedTourActive(false);`, `          engine.releaseInput();
          setGuidedTourActive(false);`);
replace(`          engine.isLocked = false;
          engine._touchActive = false;
          engine._entryAnim = null;
          var THREE = window.THREE;`, `          engine.isLocked = false;
          engine.releaseInput();
          engine._entryAnim = null;
          var THREE = window.THREE;`);
replace('          if (engine._touchMoveId === null && engine._touchLookId === null) engine._touchActive = false;', '          engine.refreshTouchActivity();');
replace(`          engine.moveState.left = false; engine.moveState.right = false;
        }, { passive: false });

        // ── Cached blocks array`, `          engine.moveState.left = false; engine.moveState.right = false;
          engine.refreshTouchActivity();
        }, { passive: false });

        // ── Cached blocks array`);
replace(`        engine.moveState.flyUp = false; engine._jumpLock = false;
      }

      function beginMobileDescent()`, `        engine.moveState.flyUp = false; engine._jumpLock = false;
        if (engine.flyMode && engine.refreshTouchActivity) engine.refreshTouchActivity();
      }

      function beginMobileDescent()`);
replace(`        if (engine && engine.moveState) engine.moveState.flyDown = false;
      }

      function activateMobileDescent()`, `        if (engine && engine.moveState) {
          engine.moveState.flyDown = false;
          if (engine.refreshTouchActivity) engine.refreshTouchActivity();
        }
      }

      function activateMobileDescent()`);
replace(`          engine.moveState.flyUp = false;
          engine._jumpLock = false;
        }, 150);`, `          stopMobileJump();
        }, 150);`);
new Function(source);
for (const target of [file, 'desktop/web-app/public/' + file]) {
  const fd=fs.openSync(target,'r+');fs.writeFileSync(fd,source);fs.ftruncateSync(fd,Buffer.byteLength(source));fs.closeSync(fd);
}
console.log('Applied native pointer ownership, shared input release, and held-flight touch activity; syntax/mirror parity passed.');
