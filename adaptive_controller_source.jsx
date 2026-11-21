// adaptive_controller_source.jsx - global gamepad / adaptive controller support
// Extracted from AlloFlowANTI.txt 2026-04-24 (Phase D-light of CDN modularization).
//
// Pure side-effect initialization. Maps Xbox Adaptive Controller,
// Quadstick, switch interfaces, and standard gamepads to keyboard/mouse
// events so existing AlloFlow UI components work without modification.
// Includes visible cursor reticle, haptic feedback, context-aware D-pad
// routing, L3 read-aloud, R3 speech recognition.
//
// Self-contained: no React hooks, no closures over component state, only
// uses DOM APIs + browser globals + window event dispatch. Init is guarded
// by `window._alloGamepadGlobal` so loading twice is safe.
//
// No factory needed - the IIFE wrapper in the build script runs this code
// once the module loads. If the module fails to load, gamepad simply
// does not work (graceful degradation, no app crash).

// Enables Xbox Adaptive Controller, Quadstick, switch interfaces, and standard
// gamepads to control the entire AlloFlow UI. Maps controller inputs to keyboard
// and mouse events so all existing components work without modification.
// This runs globally — works in STEAM Lab, SEL Hub, BehaviorLens, and the main app.
if (!window._alloGamepadGlobal) {
  window._alloGamepadGlobal = true;
  const _gpad = { prev: {}, axisKeys: {}, deadzone: 0.2, connected: false, rafId: 0, scrollAccum: 0,
    cursorMode: false, cursorX: 0, cursorY: 0, cursorSpeed: 8, lastHovered: null, lastHoveredOutline: '' };
  const _gpadReducedMotion = () => {
    try { return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  };
  const _gpadSpeak = (text, rate, volume) => {
    try {
      const muted = typeof window.__alloIsGlobalMuted === 'function' ? window.__alloIsGlobalMuted() : !!window._alloGlobalMute;
      if (muted || !text || !window.speechSynthesis || typeof SpeechSynthesisUtterance !== 'function') return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text));
      if (Number.isFinite(rate)) u.rate = rate;
      if (Number.isFinite(volume)) u.volume = volume;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  };
  const _gpadAxisVal = (axes, idx) => {
    const v = axes && axes.length > idx ? Number(axes[idx]) : 0;
    return Number.isFinite(v) ? Math.max(-1, Math.min(1, v)) : 0;
  };
  const _gpadBtnPressed = (btns, idx) => Boolean(btns && btns[idx] && btns[idx].pressed);
  const _gpadBtnValue = (btns, idx) => {
    const v = btns && btns[idx] ? Number(btns[idx].value) : 0;
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
  };
  const _gpadClearHover = () => {
    if (_gpad.lastHovered) {
      try { _gpad.lastHovered.style.outline = _gpad.lastHoveredOutline || ''; } catch (e) {}
      _gpad.lastHovered = null;
      _gpad.lastHoveredOutline = '';
    }
  };

  // ── Visible cursor reticle for spatial pointing ──
  const _gpadCur = document.createElement('div');
  _gpadCur.id = 'alloflow-gpad-cursor';
  _gpadCur.setAttribute('aria-hidden', 'true');
  _gpadCur.style.cssText = 'position:fixed;width:28px;height:28px;border-radius:50%;border:2px solid #6366f1;background:rgba(99,102,241,0.12);pointer-events:none;z-index:99999;display:none;box-shadow:0 0 8px rgba(99,102,241,0.3);transform:translate(-50%,-50%);' + (_gpadReducedMotion() ? '' : 'transition:width 0.1s,height 0.1s');
  const _gpadDot = document.createElement('div');
  _gpadDot.style.cssText = 'position:absolute;top:50%;left:50%;width:4px;height:4px;background:#6366f1;border-radius:50%;transform:translate(-50%,-50%)';
  _gpadCur.appendChild(_gpadDot);
  const _gpadMountCursor = () => {
    if (document.body && !_gpadCur.parentNode) document.body.appendChild(_gpadCur);
  };
  if (document.body) _gpadMountCursor();
  else if (document.addEventListener) document.addEventListener('DOMContentLoaded', _gpadMountCursor, { once: true });

  function _gpadReleaseRightStickKeys() {
    const rsMap = { rs_y_n: 'ArrowUp', rs_y_p: 'ArrowDown', rs_x_n: 'ArrowLeft', rs_x_p: 'ArrowRight' };
    Object.keys(rsMap).forEach((k) => {
      if (_gpad.axisKeys[k]) { _gpadKey(rsMap[k], 'keyup'); _gpad.axisKeys[k] = false; }
    });
  }
  function _gpadShowCursor() {
    if (!_gpad.cursorMode) {
      _gpad.cursorMode = true;
      _gpadReleaseRightStickKeys();
      _gpad.cursorX = window.innerWidth / 2;
      _gpad.cursorY = window.innerHeight / 2;
      _gpadCur.style.left = _gpad.cursorX + 'px';
      _gpadCur.style.top = _gpad.cursorY + 'px';
      _gpadCur.style.display = 'block';
    }
  }
  function _gpadHideCursor() {
    _gpad.cursorMode = false; _gpadCur.style.display = 'none';
    _gpadClearHover();
  }
  // ── Haptic feedback (vibration) ──
  // Works on Xbox, PlayStation, Switch Pro controllers. Gracefully no-ops on unsupported hardware.
  const _gpadRumble = (va, params) => {
    try {
      if (!va || typeof va.playEffect !== 'function') return;
      const res = va.playEffect('dual-rumble', params);
      if (res && typeof res.catch === 'function') res.catch(() => {});
    } catch (_) {}
  };
  const _gpadFindScrollable = (startEl) => {
    try {
      let cur = startEl && startEl.nodeType === 1 ? startEl : null;
      while (cur && cur !== document.body && cur !== document.documentElement) {
        const st = typeof window.getComputedStyle === 'function' ? window.getComputedStyle(cur) : null;
        if (st && /(auto|scroll|overlay)/.test(st.overflowY || '') && cur.scrollHeight > cur.clientHeight) {
          return cur;
        }
        cur = cur.parentElement;
      }
    } catch (_) {}
    return document.scrollingElement || document.documentElement;
  };
  window._alloHaptic = function(type) {
    try {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      let gp = null;
      for (let i = 0; i < gamepads.length; i++) { if (gamepads[i] && gamepads[i].connected !== false) { gp = gamepads[i]; break; } }
      if (!gp || !gp.vibrationActuator) return;
      const va = gp.vibrationActuator;
      switch (type) {
        case 'tap':       _gpadRumble(va, { duration: 50,  strongMagnitude: 0.2, weakMagnitude: 0.4 }); break;
        case 'click':     _gpadRumble(va, { duration: 30,  strongMagnitude: 0.1, weakMagnitude: 0.3 }); break;
        case 'bump':      _gpadRumble(va, { duration: 120, strongMagnitude: 0.7, weakMagnitude: 0.3 }); break;
        case 'place':     _gpadRumble(va, { duration: 40,  strongMagnitude: 0.15, weakMagnitude: 0.3 }); break;
        case 'break':     _gpadRumble(va, { duration: 80,  strongMagnitude: 0.5, weakMagnitude: 0.2 }); break;
        case 'correct':   _gpadRumble(va, { duration: 60,  strongMagnitude: 0.2, weakMagnitude: 0.5 });
                          setTimeout(() => _gpadRumble(va, { duration: 60, strongMagnitude: 0.2, weakMagnitude: 0.5 }), 120); break;
        case 'wrong':     _gpadRumble(va, { duration: 200, strongMagnitude: 0.4, weakMagnitude: 0.1 }); break;
        case 'achieve':   [0,120,240].forEach((d2) => { setTimeout(() => _gpadRumble(va, { duration: 80, strongMagnitude: 0.15 + d2/800, weakMagnitude: 0.4 + d2/600 }), d2); }); break;
        case 'launch':    _gpadRumble(va, { duration: 500, strongMagnitude: 0.6, weakMagnitude: 0.3 }); break;
        case 'echo':      _gpadRumble(va, { duration: 30,  strongMagnitude: 0.05, weakMagnitude: 0.15 }); break;
        case 'land':      _gpadRumble(va, { duration: 150, strongMagnitude: 0.5, weakMagnitude: 0.2 }); break;
        default:          _gpadRumble(va, { duration: 40,  strongMagnitude: 0.15, weakMagnitude: 0.2 }); break;
      }
    } catch(e) { /* Vibration not supported — graceful no-op */ }
  };

  function _gpadCursorClick() {
    if (!_gpad.cursorMode) return;
    try {
      const el = document.elementFromPoint(_gpad.cursorX, _gpad.cursorY);
      if (!el) return;
      if (!_gpadReducedMotion()) {
        _gpadCur.style.width = '20px'; _gpadCur.style.height = '20px';
        setTimeout(() => { _gpadCur.style.width = '28px'; _gpadCur.style.height = '28px'; }, 120);
      }
      window._alloHaptic('click');
      const target = el.closest('button,a,[role="button"],input,select,textarea,[tabindex]') || el;
      if (!target || target.disabled || target.closest?.('[hidden], [inert], [aria-hidden="true"]')) return;
      if (typeof target.focus === 'function') target.focus();
      if (typeof target.click === 'function') target.click();
      const lbl = target.getAttribute('aria-label') || target.title || (target.textContent || '').trim().substring(0, 80);
      if (lbl) _gpadSpeak(lbl, 1.1, 0.7);
    } catch(e) {}
  }

  const _gpadHasConnectedPad = () => {
    try {
      const gps = navigator.getGamepads ? navigator.getGamepads() : [];
      for (let i = 0; i < gps.length; i++) {
        if (gps[i] && gps[i].connected !== false) return true;
      }
    } catch (e) {}
    return false;
  };
  const _gpadFocusableElements = () => {
    try {
      const stack = Array.isArray(window.__alloFocusTrapStack) ? window.__alloFocusTrapStack : [];
      let root = null;
      for (let i = stack.length - 1; i >= 0; i--) {
        const entry = stack[i];
        const cand = entry && (entry.root || entry.container || entry.element || entry);
        if (cand && typeof cand.querySelectorAll === 'function' && cand.isConnected === true && !cand.closest?.('[hidden], [inert], [aria-hidden="true"]')) {
          root = cand;
          break;
        }
      }
      if (!root) {
        const modals = Array.from(document.querySelectorAll('[aria-modal="true"]')).filter((m) => (
          m && m.isConnected !== false && !m.closest('[hidden], [inert], [aria-hidden="true"]')
        ));
        if (modals.length > 0) root = modals[modals.length - 1];
      }
      const queryRoot = root || document;
      const layoutProbe = root || document.body;
      const hasLayout = Boolean(layoutProbe && typeof layoutProbe.getClientRects === 'function' && layoutProbe.getClientRects().length > 0);
      return Array.from(queryRoot.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), a[href], summary')).filter((el) => {
        if (!el || el.disabled) return false;
        if (el.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
        const closedDetails = el.closest('details:not([open])');
        if (closedDetails && !(el.tagName === 'SUMMARY' && el.parentElement === closedDetails)) return false;
        if (typeof window.getComputedStyle === 'function') {
          let cur = el;
          while (cur && cur.nodeType === 1) {
            const st = window.getComputedStyle(cur);
            if (st && (st.display === 'none' || st.visibility === 'hidden')) return false;
            if (cur === root) break;
            cur = cur.parentElement;
          }
        }
        if (hasLayout && typeof el.getClientRects === 'function' && el.getClientRects().length === 0) return false;
        return true;
      });
    } catch (e) {
      return [];
    }
  };
  const _gpadOpenBot = () => {
    try {
      const qrMode = window.__alloQrStudentMode;
      const qrBlocked = qrMode === true || (qrMode && typeof qrMode === 'object' && (qrMode.aiDisabled === true || qrMode.aiPolicy === 'off'));
      if (window.__alloStudentAiDisabled === true || window.__alloAiSecretsLocked === true || window._alloQrBlocked === true || qrBlocked) return;
      if (typeof window.__alloAiUsable === 'function' && !window.__alloAiUsable('text')) {
        if (!qrMode && typeof window.__alloAiSetupDoorway === 'function') {
          const door = window.__alloAiSetupDoorway('text');
          if (door && typeof door.onDoorway === 'function') door.onDoorway();
        }
        return;
      }
      window.dispatchEvent(new CustomEvent('alloflow:open-bot'));
    } catch (e) {}
  };

  const _gpadCodeToKey = (code) => {
    if (code === 'Space') return ' ';
    if (code === 'Escape' || code.startsWith('Arrow')) return code;
    if (code === 'ShiftLeft' || code === 'ShiftRight') return 'Shift';
    if (code.startsWith('Key')) return code.slice(3).toLowerCase();
    if (code.startsWith('Digit')) return code.slice(5);
    return code;
  };

  const _gpadKey = (code, type) => {
    try {
      const key = _gpadCodeToKey(code);
      const target = (document.activeElement && document.activeElement !== document.body) ? document.activeElement : document;
      target.dispatchEvent(new KeyboardEvent(type, { code, key, bubbles: true, cancelable: true }));
    } catch(e) {}
  };

  const _gpadTapKey = (code) => {
    _gpadKey(code, 'keydown');
    setTimeout(() => _gpadKey(code, 'keyup'), 100);
  };

  const _gpadReleaseAllKeys = () => {
    const map = {
      ls_y_n: 'KeyW', ls_y_p: 'KeyS', ls_x_n: 'KeyA', ls_x_p: 'KeyD',
      rs_y_n: 'ArrowUp', rs_y_p: 'ArrowDown', rs_x_n: 'ArrowLeft', rs_x_p: 'ArrowRight',
      lt: 'ShiftLeft'
    };
    Object.keys(map).forEach((k) => {
      if (_gpad.axisKeys[k]) { _gpadKey(map[k], 'keyup'); _gpad.axisKeys[k] = false; }
    });
    _gpad.prev = {};
    _gpad.scrollAccum = 0;
  };

  window.addEventListener('gamepadconnected', (e) => {
    _gpad.connected = true;
    _gpadMountCursor();
    if (e && e.gamepad && e.gamepad.id) console.log('[Gamepad] Connected globally: ' + e.gamepad.id);
    _gpadStartPoll();
  });
  window.addEventListener('gamepaddisconnected', () => {
    if (_gpadHasConnectedPad()) return;
    if (_gpad.rafId) { cancelAnimationFrame(_gpad.rafId); _gpad.rafId = 0; }
    _gpad.connected = false;
    _gpadReleaseAllKeys();
    _gpadHideCursor();
  });

  const _gpadClick = (button) => {
    try {
      const target = document.activeElement || document.querySelector('canvas') || document.body;
      const rect = target.getBoundingClientRect();
      const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
      target.dispatchEvent(new MouseEvent('mousedown', { button, clientX: cx, clientY: cy, bubbles: true }));
      setTimeout(() => target.dispatchEvent(new MouseEvent('mouseup', { button, clientX: cx, clientY: cy, bubbles: true })), 50);
    } catch(e) {}
  };

  const _gpadBtnEdge = (idx, pressed) => {
    const was = !!_gpad.prev[idx];
    _gpad.prev[idx] = pressed;
    return pressed && !was;
  };

  const _gpadAxis = (val, negKey, posKey, id) => {
    const neg = val < -_gpad.deadzone, pos = val > _gpad.deadzone;
    if (neg && !_gpad.axisKeys[id+'_n']) _gpadKey(negKey, 'keydown');
    if (!neg && _gpad.axisKeys[id+'_n']) _gpadKey(negKey, 'keyup');
    if (pos && !_gpad.axisKeys[id+'_p']) _gpadKey(posKey, 'keydown');
    if (!pos && _gpad.axisKeys[id+'_p']) _gpadKey(posKey, 'keyup');
    _gpad.axisKeys[id+'_n'] = neg;
    _gpad.axisKeys[id+'_p'] = pos;
  };

  const _gpadPoll = () => {
    _gpad.rafId = 0;
    if (!_gpad.connected) return;
    _gpad.rafId = requestAnimationFrame(_gpadPoll);
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null;
    for (let i = 0; i < gamepads.length; i++) { if (gamepads[i] && gamepads[i].connected !== false) { gp = gamepads[i]; break; } }
    if (!gp) return;

    const deadzone = Math.max(0.05, Math.min(0.9, Number(_gpad.deadzone) || 0.2));
    const cursorSpeed = Math.max(1, Math.min(40, Number(_gpad.cursorSpeed) || 8));
    _gpad.deadzone = deadzone;
    _gpad.cursorSpeed = cursorSpeed;

    // Left stick → WASD (3D tools) or focus navigation (UI mode)
    _gpadAxis(_gpadAxisVal(gp.axes, 1), 'KeyW', 'KeyS', 'ls_y');
    _gpadAxis(_gpadAxisVal(gp.axes, 0), 'KeyA', 'KeyD', 'ls_x');

    // Right stick: 3D = Arrow keys (camera), UI = cursor mode OR scroll
    const inCanvas3d = document.activeElement && document.activeElement.tagName === 'CANVAS';
    if (gp.axes && gp.axes.length >= 4) {
      const rsX = _gpadAxisVal(gp.axes, 2), rsY = _gpadAxisVal(gp.axes, 3);
      const rsActive = Math.abs(rsX) > deadzone || Math.abs(rsY) > deadzone;

      if (inCanvas3d) {
        // In 3D: arrow keys for camera, no cursor
        _gpadAxis(rsY, 'ArrowUp', 'ArrowDown', 'rs_y');
        _gpadAxis(rsX, 'ArrowLeft', 'ArrowRight', 'rs_x');
        if (_gpad.cursorMode) _gpadHideCursor();
      } else if (_gpad.cursorMode) {
        // Cursor mode: move the visible reticle
        if (rsActive) {
          const curX = Number.isFinite(_gpad.cursorX) ? _gpad.cursorX : window.innerWidth / 2;
          const curY = Number.isFinite(_gpad.cursorY) ? _gpad.cursorY : window.innerHeight / 2;
          _gpad.cursorX = Math.max(0, Math.min(window.innerWidth, curX + rsX * cursorSpeed));
          _gpad.cursorY = Math.max(0, Math.min(window.innerHeight, curY + rsY * cursorSpeed));
          _gpadCur.style.left = _gpad.cursorX + 'px';
          _gpadCur.style.top = _gpad.cursorY + 'px';
          // Highlight element under cursor
          try {
            const hoverEl = document.elementFromPoint(_gpad.cursorX, _gpad.cursorY);
            const rawClickable = hoverEl?.closest('button,a,[role="button"],input,select,textarea,[tabindex]');
            const clickable = rawClickable && !rawClickable.disabled && !rawClickable.closest?.('[hidden], [inert], [aria-hidden="true"]') ? rawClickable : null;
            if (clickable !== _gpad.lastHovered) {
              _gpadClearHover();
              if (clickable) {
                _gpad.lastHoveredOutline = clickable.style.outline || '';
                clickable.style.outline = '2px solid #6366f1';
                _gpad.lastHovered = clickable;
              }
            }
          } catch(e) {}
        }
        // Suppress arrow key generation in cursor mode
      } else {
        // Tab navigation mode (no cursor): arrow keys + scroll
        _gpadAxis(rsY, 'ArrowUp', 'ArrowDown', 'rs_y');
        _gpadAxis(rsX, 'ArrowLeft', 'ArrowRight', 'rs_x');
        if (Math.abs(rsY) > deadzone) {
          _gpad.scrollAccum = (Number.isFinite(_gpad.scrollAccum) ? _gpad.scrollAccum : 0) + rsY * 4;
          if (Math.abs(_gpad.scrollAccum) >= 1) {
            const sa = Math.round(_gpad.scrollAccum); _gpad.scrollAccum -= sa;
            try { const scroller = _gpadFindScrollable(document.activeElement); if (scroller) scroller.scrollTop += sa * 8; } catch(e) {}
          }
        }
        // Auto-activate cursor mode when right stick moves significantly in UI
        if (rsActive && (Math.abs(rsX) > 0.5 || Math.abs(rsY) > 0.5)) {
          _gpadShowCursor();
        }
      }
    }

    const btns = gp.buttons || [];
    if (btns.length >= 4) {
      // A/Cross → cursor click (if cursor mode) OR space/click (otherwise)
      if (_gpadBtnEdge(0, _gpadBtnPressed(btns, 0))) {
        if (_gpad.cursorMode) {
          _gpadCursorClick();
        } else {
          const ae = document.activeElement;
          if (ae && (ae.tagName === 'BUTTON' || ae.tagName === 'A' || ae.getAttribute('role') === 'button')) {
            ae.click();
          } else {
            _gpadTapKey('Space');
          }
        }
      }
      // B/Circle → Escape
      if (_gpadBtnEdge(1, _gpadBtnPressed(btns, 1))) { _gpadTapKey('Escape'); }
      // X/Square → E (interact) OR Tab (focus next in UI)
      if (_gpadBtnEdge(2, _gpadBtnPressed(btns, 2))) {
        const ae2 = document.activeElement;
        if (ae2 && ae2.tagName === 'CANVAS') {
          _gpadTapKey('KeyE');
        } else {
          // Tab to next focusable element
          try {
            const focusables = _gpadFocusableElements();
            const idx = focusables.indexOf(document.activeElement);
            if (idx >= 0 && idx < focusables.length - 1) focusables[idx + 1].focus();
            else if (focusables.length > 0) focusables[0].focus();
          } catch(e) {}
        }
      }
      // Y/Triangle → M (measure in 3D) OR Shift+Tab (focus previous in UI)
      if (_gpadBtnEdge(3, _gpadBtnPressed(btns, 3))) {
        const ae3 = document.activeElement;
        if (ae3 && ae3.tagName === 'CANVAS') {
          _gpadTapKey('KeyM');
        } else {
          try {
            const focusables2 = _gpadFocusableElements();
            const idx2 = focusables2.indexOf(document.activeElement);
            if (idx2 > 0) focusables2[idx2 - 1].focus();
            else if (focusables2.length > 0) focusables2[focusables2.length - 1].focus();
          } catch(e) {}
        }
      }
    }
    if (btns.length >= 8) {
      const inCanvas = document.activeElement && document.activeElement.tagName === 'CANVAS';
      // LB: 3D = cycle tool (Q), UI = open AlloBot chat
      if (_gpadBtnEdge(4, _gpadBtnPressed(btns, 4))) {
        if (inCanvas) { _gpadTapKey('KeyQ'); }
        else { _gpadOpenBot(); }
      }
      if (_gpadBtnEdge(5, _gpadBtnPressed(btns, 5))) _gpadClick(2);                 // RB → right-click
      // LT → Shift (analog threshold)
      const ltVal = _gpadBtnValue(btns, 6);
      if (ltVal > 0.3 && !_gpad.axisKeys['lt']) { _gpadKey('ShiftLeft', 'keydown'); _gpad.axisKeys['lt'] = true; }
      if (ltVal <= 0.3 && _gpad.axisKeys['lt']) { _gpadKey('ShiftLeft', 'keyup'); _gpad.axisKeys['lt'] = false; }
      if (_gpadBtnEdge(7, _gpadBtnPressed(btns, 7))) _gpadClick(0);                 // RT → left-click
    }
    if (btns.length >= 10) {
      const inCanvas2 = document.activeElement && document.activeElement.tagName === 'CANVAS';
      // Select: 3D = grid, UI = toggle cursor/tab navigation mode
      if (_gpadBtnEdge(8, _gpadBtnPressed(btns, 8))) {
        if (inCanvas2) { _gpadTapKey('KeyG'); }
        else {
          if (_gpad.cursorMode) { _gpadHideCursor(); _gpadSpeak('Tab navigation', 1.2); }
          else { _gpadShowCursor(); _gpadSpeak('Cursor mode', 1.2); }
        }
      }
      // Start: 3D = fly toggle (F), UI = open AlloBot chat
      if (_gpadBtnEdge(9, _gpadBtnPressed(btns, 9))) {
        if (inCanvas2) { _gpadTapKey('KeyF'); }
        else { _gpadOpenBot(); }
      }
    }
    // ── L3 (left stick click, index 10) → Read focused element aloud ──
    // Unlike a full screen reader that reads everything, this speaks ONLY the
    // currently focused element — its aria-label, title, or text content.
    // Perfect for visually impaired users who need on-demand feedback.
    if (btns.length >= 11 && _gpadBtnEdge(10, _gpadBtnPressed(btns, 10))) {
      try {
        const ae = document.activeElement;
        let txt = '';
        if (ae) {
          txt = ae.getAttribute('aria-label') || ae.getAttribute('title') || '';
          if (!txt) {
            // Read visible text, but prioritize short label over entire container
            const innerText = (ae.textContent || '').trim();
            txt = innerText.length <= 200 ? innerText : innerText.substring(0, 200) + '...';
          }
          // Add context: element type
          if (ae.tagName === 'BUTTON') txt = 'Button: ' + txt;
          else if (ae.tagName === 'INPUT') txt = 'Input: ' + (ae.getAttribute('placeholder') || txt || ae.type);
          else if (ae.tagName === 'SELECT') txt = 'Dropdown: ' + (txt || ae.options?.[ae.selectedIndex]?.text || '');
          else if (ae.tagName === 'TEXTAREA') txt = 'Text area: ' + (txt || ae.getAttribute('placeholder') || '');
          else if (ae.tagName === 'A') txt = 'Link: ' + txt;
          else if (ae.getAttribute('role') === 'button') txt = 'Button: ' + txt;
        }
        if (!txt) {
          const heading = document.querySelector('h1, h2, h3, [role="heading"]');
          if (heading) txt = 'Page: ' + heading.textContent.trim();
        }
        if (txt) _gpadSpeak(txt, 1.0);
      } catch(e) {}
    }
    // ── R3 (right stick click, index 11) → Toggle microphone / dictation ──
    if (btns.length >= 12 && _gpadBtnEdge(11, _gpadBtnPressed(btns, 11))) {
      try {
        // First try: find an active, visible mic/dictation button in the current modal/view
        const micBtn = _gpadFocusableElements().find((el) => /ictation|mic|icrophone/i.test(el.getAttribute('aria-label') || ''));
        if (micBtn) {
          micBtn.click();
        } else {
          // Phase 3v.M — gamepad fallback dictation routes through
          // window.AlloFlowVoice.initWebSpeechCapture when available.
          const speechLang = (typeof window.getSpeechLangCode === 'function' && window.getSpeechLangCode())
            || (document.documentElement && document.documentElement.lang)
            || 'en-US';
          const handleTranscript = (text) => {
            const target = document.activeElement;
            if (!target || target.disabled || target.readOnly) return;
            if (target.tagName === 'INPUT') {
              const inputType = String(target.type || 'text').toLowerCase();
              if (!['text', 'search', 'url', 'tel', 'email'].includes(inputType)) return;
            }
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
              const proto = target.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
              const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
              if (setter) {
                setter.call(target, target.value + String(text || ''));
                target.dispatchEvent(new Event('input', { bubbles: true }));
              }
            }
          };
          if (!window._gpadSpeechRecog) {
            if (window.AlloFlowVoice && typeof window.AlloFlowVoice.initWebSpeechCapture === 'function') {
              const ctrl = window.AlloFlowVoice.initWebSpeechCapture({
                lang: speechLang,
                continuous: false,
                interimResults: false,
                onTranscript: (text) => handleTranscript(text),
                onError: () => { window._gpadSpeechRecogActive = false; },
                onEnd: () => { window._gpadSpeechRecogActive = false; }
              });
              if (ctrl && ctrl.supported) {
                window._gpadSpeechRecog = ctrl;
              }
            } else {
              const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
              if (SR) {
                window._gpadSpeechRecog = new SR();
                window._gpadSpeechRecog.lang = speechLang;
                window._gpadSpeechRecog.continuous = false;
                window._gpadSpeechRecog.interimResults = false;
                window._gpadSpeechRecog.onresult = (e) => {
                  const t = e && e.results && e.results[0] && e.results[0][0] && e.results[0][0].transcript;
                  if (t) handleTranscript(t);
                };
                window._gpadSpeechRecog.onerror = () => { window._gpadSpeechRecogActive = false; };
                window._gpadSpeechRecog.onend = () => { window._gpadSpeechRecogActive = false; };
              }
            }
          }
          if (window._gpadSpeechRecog) {
            if (window._gpadSpeechRecogActive) {
              window._gpadSpeechRecog.stop(); window._gpadSpeechRecogActive = false;
              _gpadSpeak('Microphone off', 1.2);
            } else {
              try { if ('lang' in window._gpadSpeechRecog) window._gpadSpeechRecog.lang = speechLang; } catch (_) {}
              try { if (window.speechSynthesis && typeof window.speechSynthesis.cancel === 'function') window.speechSynthesis.cancel(); } catch (_) {}
              const started = window._gpadSpeechRecog.start();
              if (started !== false) {
                window._gpadSpeechRecogActive = true;
                window._alloHaptic('tap');
              }
            }
          }
        }
      } catch(e) {}
    }
    // D-pad: context-aware — block selection in 3D, navigation in UI
    if (btns.length >= 16) {
      const inCanvas = document.activeElement && document.activeElement.tagName === 'CANVAS';
      if (inCanvas) {
        if (_gpadBtnEdge(12, _gpadBtnPressed(btns, 12))) _gpadTapKey('Digit1');
        if (_gpadBtnEdge(13, _gpadBtnPressed(btns, 13))) _gpadTapKey('Digit2');
        if (_gpadBtnEdge(14, _gpadBtnPressed(btns, 14))) _gpadTapKey('Digit3');
        if (_gpadBtnEdge(15, _gpadBtnPressed(btns, 15))) _gpadTapKey('Digit4');
      } else {
        // UI mode: D-pad Up/Down scroll, Left/Right move focus
        if (_gpadBtnEdge(12, _gpadBtnPressed(btns, 12))) { try { const scroller = _gpadFindScrollable(document.activeElement); if (scroller) scroller.scrollTop -= 80; } catch(e){} }
        if (_gpadBtnEdge(13, _gpadBtnPressed(btns, 13))) { try { const scroller = _gpadFindScrollable(document.activeElement); if (scroller) scroller.scrollTop += 80; } catch(e){} }
        if (_gpadBtnEdge(14, _gpadBtnPressed(btns, 14))) { try { const f = _gpadFocusableElements(); const i = f.indexOf(document.activeElement); if (i > 0) f[i-1].focus(); else if (f.length > 0 && i === -1) f[f.length - 1].focus(); } catch(e){} }
        if (_gpadBtnEdge(15, _gpadBtnPressed(btns, 15))) { try { const f = _gpadFocusableElements(); const i = f.indexOf(document.activeElement); if (i >= 0 && i < f.length-1) f[i+1].focus(); else if (f.length > 0 && i === -1) f[0].focus(); } catch(e){} }
      }
    }
  };
  function _gpadStartPoll() {
    if (!_gpad.rafId && _gpad.connected) {
      _gpad.rafId = requestAnimationFrame(_gpadPoll);
    }
  }
  if (_gpadHasConnectedPad()) {
    _gpad.connected = true;
    _gpadStartPoll();
  }
}
