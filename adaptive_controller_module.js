(function() {
'use strict';
if (window.AlloModules && window.AlloModules.AdaptiveControllerModule) { console.log('[CDN] AdaptiveControllerModule already loaded, skipping'); return; }
// adaptive_controller_source.jsx - global gamepad / adaptive controller support.
// Extracted from AlloFlowANTI.txt on 2026-04-24 (Phase D-light of CDN modularization).
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
// This runs globally — works in STEM Lab, SEL Hub, BehaviorLens, and the main app.
if (!window._alloGamepadGlobal) {
  window._alloGamepadGlobal = true;
  const _gpad = { prev: {}, axisKeys: {}, deadzone: 0.2, connected: false, scrollAccum: 0,
    cursorMode: false, cursorX: 0, cursorY: 0, cursorSpeed: 8, lastHovered: null };

  // ── Visible cursor reticle for spatial pointing ──
  const _gpadCur = document.createElement('div');
  _gpadCur.id = 'alloflow-gpad-cursor';
  _gpadCur.setAttribute('aria-hidden', 'true');
  _gpadCur.style.cssText = 'position:fixed;width:28px;height:28px;border-radius:50%;border:2px solid #6366f1;background:rgba(99,102,241,0.12);pointer-events:none;z-index:99999;display:none;box-shadow:0 0 8px rgba(99,102,241,0.3);transform:translate(-50%,-50%);transition:width 0.1s,height 0.1s';
  const _gpadDot = document.createElement('div');
  _gpadDot.style.cssText = 'position:absolute;top:50%;left:50%;width:4px;height:4px;background:#6366f1;border-radius:50%;transform:translate(-50%,-50%)';
  _gpadCur.appendChild(_gpadDot);
  document.body.appendChild(_gpadCur);

  function _gpadShowCursor() {
    if (!_gpad.cursorMode) { _gpad.cursorMode = true; _gpad.cursorX = window.innerWidth / 2; _gpad.cursorY = window.innerHeight / 2; _gpadCur.style.display = 'block'; }
  }
  function _gpadHideCursor() {
    _gpad.cursorMode = false; _gpadCur.style.display = 'none';
    if (_gpad.lastHovered) { try { _gpad.lastHovered.style.outline = ''; } catch(e) {} _gpad.lastHovered = null; }
  }
  // ── Haptic feedback (vibration) ──
  // Works on Xbox, PlayStation, Switch Pro controllers. Gracefully no-ops on unsupported hardware.
  window._alloHaptic = function(type) {
    try {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      let gp = null;
      for (let i = 0; i < gamepads.length; i++) { if (gamepads[i]) { gp = gamepads[i]; break; } }
      if (!gp || !gp.vibrationActuator) return;
      const va = gp.vibrationActuator;
      switch (type) {
        case 'tap':       va.playEffect('dual-rumble', { duration: 50,  strongMagnitude: 0.2, weakMagnitude: 0.4 }); break;
        case 'click':     va.playEffect('dual-rumble', { duration: 30,  strongMagnitude: 0.1, weakMagnitude: 0.3 }); break;
        case 'bump':      va.playEffect('dual-rumble', { duration: 120, strongMagnitude: 0.7, weakMagnitude: 0.3 }); break;
        case 'place':     va.playEffect('dual-rumble', { duration: 40,  strongMagnitude: 0.15, weakMagnitude: 0.3 }); break;
        case 'break':     va.playEffect('dual-rumble', { duration: 80,  strongMagnitude: 0.5, weakMagnitude: 0.2 }); break;
        case 'correct':   va.playEffect('dual-rumble', { duration: 60,  strongMagnitude: 0.2, weakMagnitude: 0.5 });
                          setTimeout(() => { try { va.playEffect('dual-rumble', { duration: 60, strongMagnitude: 0.2, weakMagnitude: 0.5 }); } catch(e){} }, 120); break;
        case 'wrong':     va.playEffect('dual-rumble', { duration: 200, strongMagnitude: 0.4, weakMagnitude: 0.1 }); break;
        case 'achieve':   [0,120,240].forEach((d2) => { setTimeout(() => { try { va.playEffect('dual-rumble', { duration: 80, strongMagnitude: 0.15 + d2/800, weakMagnitude: 0.4 + d2/600 }); } catch(e){} }, d2); }); break;
        case 'launch':    va.playEffect('dual-rumble', { duration: 500, strongMagnitude: 0.6, weakMagnitude: 0.3 }); break;
        case 'echo':      va.playEffect('dual-rumble', { duration: 30,  strongMagnitude: 0.05, weakMagnitude: 0.15 }); break;
        case 'land':      va.playEffect('dual-rumble', { duration: 150, strongMagnitude: 0.5, weakMagnitude: 0.2 }); break;
        default:          va.playEffect('dual-rumble', { duration: 40,  strongMagnitude: 0.15, weakMagnitude: 0.2 }); break;
      }
    } catch(e) { /* Vibration not supported — graceful no-op */ }
  };

  function _gpadCursorClick() {
    if (!_gpad.cursorMode) return;
    try {
      const el = document.elementFromPoint(_gpad.cursorX, _gpad.cursorY);
      if (!el) return;
      _gpadCur.style.width = '20px'; _gpadCur.style.height = '20px';
      setTimeout(() => { _gpadCur.style.width = '28px'; _gpadCur.style.height = '28px'; }, 120);
      window._alloHaptic('click');
      const target = el.closest('button,a,[role="button"],input,select,textarea,[tabindex]') || el;
      target.focus(); target.click();
      if (window.speechSynthesis) {
        const lbl = target.getAttribute('aria-label') || target.title || (target.textContent||'').trim().substring(0,80);
        if (lbl) { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(lbl); u.rate = 1.1; u.volume = 0.7; window.speechSynthesis.speak(u); }
      }
    } catch(e) {}
  }


  window.addEventListener('gamepadconnected', (e) => {
    _gpad.connected = true;
    console.log('[Gamepad] Connected globally: ' + e.gamepad.id);
  });
  window.addEventListener('gamepaddisconnected', () => { _gpad.connected = false; });

  const _gpadKey = (code, type) => {
    try {
      const ev = new KeyboardEvent(type, { code, key: code.replace('Key', '').toLowerCase(), bubbles: true, cancelable: true });
      document.dispatchEvent(ev);
      if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.dispatchEvent(new KeyboardEvent(type, { code, key: code.replace('Key', '').toLowerCase(), bubbles: true, cancelable: true }));
      }
    } catch(e) {}
  };

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
    requestAnimationFrame(_gpadPoll);
    if (!_gpad.connected) return;
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null;
    for (let i = 0; i < gamepads.length; i++) { if (gamepads[i]) { gp = gamepads[i]; break; } }
    if (!gp) return;

    // Left stick → WASD (3D tools) or focus navigation (UI mode)
    _gpadAxis(gp.axes[1], 'KeyW', 'KeyS', 'ls_y');
    _gpadAxis(gp.axes[0], 'KeyA', 'KeyD', 'ls_x');

    // Right stick: 3D = Arrow keys (camera), UI = cursor mode OR scroll
    const inCanvas3d = document.activeElement && document.activeElement.tagName === 'CANVAS';
    if (gp.axes.length >= 4) {
      const rsX = gp.axes[2], rsY = gp.axes[3];
      const rsActive = Math.abs(rsX) > _gpad.deadzone || Math.abs(rsY) > _gpad.deadzone;

      if (inCanvas3d) {
        // In 3D: arrow keys for camera, no cursor
        _gpadAxis(rsY, 'ArrowUp', 'ArrowDown', 'rs_y');
        _gpadAxis(rsX, 'ArrowLeft', 'ArrowRight', 'rs_x');
        if (_gpad.cursorMode) _gpadHideCursor();
      } else if (_gpad.cursorMode) {
        // Cursor mode: move the visible reticle
        if (rsActive) {
          _gpad.cursorX = Math.max(0, Math.min(window.innerWidth, _gpad.cursorX + rsX * _gpad.cursorSpeed));
          _gpad.cursorY = Math.max(0, Math.min(window.innerHeight, _gpad.cursorY + rsY * _gpad.cursorSpeed));
          _gpadCur.style.left = _gpad.cursorX + 'px';
          _gpadCur.style.top = _gpad.cursorY + 'px';
          // Highlight element under cursor
          try {
            const hoverEl = document.elementFromPoint(_gpad.cursorX, _gpad.cursorY);
            const clickable = hoverEl?.closest('button,a,[role="button"],input,select,textarea,[tabindex]');
            if (clickable !== _gpad.lastHovered) {
              if (_gpad.lastHovered) _gpad.lastHovered.style.outline = '';
              if (clickable) clickable.style.outline = '2px solid #6366f1';
              _gpad.lastHovered = clickable || null;
            }
          } catch(e) {}
        }
        // Suppress arrow key generation in cursor mode
      } else {
        // Tab navigation mode (no cursor): arrow keys + scroll
        _gpadAxis(rsY, 'ArrowUp', 'ArrowDown', 'rs_y');
        _gpadAxis(rsX, 'ArrowLeft', 'ArrowRight', 'rs_x');
        if (Math.abs(rsY) > _gpad.deadzone) {
          _gpad.scrollAccum += rsY * 4;
          if (Math.abs(_gpad.scrollAccum) >= 1) {
            const sa = Math.round(_gpad.scrollAccum); _gpad.scrollAccum -= sa;
            try { (document.activeElement?.closest('[style*="overflow"]') || document.scrollingElement).scrollTop += sa * 8; } catch(e) {}
          }
        }
        // Auto-activate cursor mode when right stick moves significantly in UI
        if (rsActive && (Math.abs(rsX) > 0.5 || Math.abs(rsY) > 0.5)) {
          _gpadShowCursor();
        }
      }
    }

    const btns = gp.buttons;
    if (btns.length >= 4) {
      // A/Cross → cursor click (if cursor mode) OR space/click (otherwise)
      if (_gpadBtnEdge(0, btns[0].pressed)) {
        if (_gpad.cursorMode) {
          _gpadCursorClick();
        } else {
          const ae = document.activeElement;
          if (ae && (ae.tagName === 'BUTTON' || ae.tagName === 'A' || ae.getAttribute('role') === 'button')) {
            ae.click();
          } else {
            _gpadKey('Space', 'keydown');
          setTimeout(() => _gpadKey('Space', 'keyup'), 100);
        }
      }
      // B/Circle → Escape
      if (_gpadBtnEdge(1, btns[1].pressed)) { _gpadKey('Escape', 'keydown'); setTimeout(() => _gpadKey('Escape', 'keyup'), 100); }
      // X/Square → E (interact) OR Tab (focus next in UI)
      if (_gpadBtnEdge(2, btns[2].pressed)) {
        const ae2 = document.activeElement;
        if (ae2 && ae2.tagName === 'CANVAS') {
          _gpadKey('KeyE', 'keydown'); setTimeout(() => _gpadKey('KeyE', 'keyup'), 100);
        } else {
          // Tab to next focusable element
          try {
            const focusables = Array.from(document.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), a[href]'));
            const idx = focusables.indexOf(document.activeElement);
            if (idx >= 0 && idx < focusables.length - 1) focusables[idx + 1].focus();
            else if (focusables.length > 0) focusables[0].focus();
          } catch(e) {}
        }
      }
      // Y/Triangle → M (measure in 3D) OR Shift+Tab (focus previous in UI)
      if (_gpadBtnEdge(3, btns[3].pressed)) {
        const ae3 = document.activeElement;
        if (ae3 && ae3.tagName === 'CANVAS') {
          _gpadKey('KeyM', 'keydown'); setTimeout(() => _gpadKey('KeyM', 'keyup'), 100);
        } else {
          try {
            const focusables2 = Array.from(document.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), a[href]'));
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
      if (_gpadBtnEdge(4, btns[4].pressed)) {
        if (inCanvas) { _gpadKey('KeyQ', 'keydown'); }
        else { window.dispatchEvent(new CustomEvent('alloflow:open-bot')); }
      }
      if (_gpadBtnEdge(5, btns[5].pressed)) _gpadClick(2);                 // RB → right-click
      // LT → Shift (analog threshold)
      if (btns[6].value > 0.3 && !_gpad.axisKeys['lt']) { _gpadKey('ShiftLeft', 'keydown'); _gpad.axisKeys['lt'] = true; }
      if (btns[6].value <= 0.3 && _gpad.axisKeys['lt']) { _gpadKey('ShiftLeft', 'keyup'); _gpad.axisKeys['lt'] = false; }
      if (_gpadBtnEdge(7, btns[7].pressed)) _gpadClick(0);                 // RT → left-click
    }
    if (btns.length >= 10) {
      const inCanvas2 = document.activeElement && document.activeElement.tagName === 'CANVAS';
      // Select: 3D = grid, UI = toggle cursor/tab navigation mode
      if (_gpadBtnEdge(8, btns[8].pressed)) {
        if (inCanvas2) { _gpadKey('KeyG', 'keydown'); }
        else {
          if (_gpad.cursorMode) { _gpadHideCursor(); if (window.speechSynthesis) { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance('Tab navigation'); u.rate = 1.2; window.speechSynthesis.speak(u); } }
          else { _gpadShowCursor(); if (window.speechSynthesis) { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance('Cursor mode'); u.rate = 1.2; window.speechSynthesis.speak(u); } }
        }
      }
      // Start: 3D = fly toggle (F), UI = open AlloBot chat
      if (_gpadBtnEdge(9, btns[9].pressed)) {
        if (inCanvas2) { _gpadKey('KeyF', 'keydown'); }
        else { window.dispatchEvent(new CustomEvent('alloflow:open-bot')); }
      }
    }
    // ── L3 (left stick click, index 10) → Read focused element aloud ──
    // Unlike a full screen reader that reads everything, this speaks ONLY the
    // currently focused element — its aria-label, title, or text content.
    // Perfect for visually impaired users who need on-demand feedback.
    if (btns.length >= 11 && _gpadBtnEdge(10, btns[10].pressed)) {
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
        if (txt && window.speechSynthesis) {
          window.speechSynthesis.cancel();
          const utt = new SpeechSynthesisUtterance(txt);
          utt.rate = 1.0;
          window.speechSynthesis.speak(utt);
        }
      } catch(e) {}
    }
    // ── R3 (right stick click, index 11) → Toggle microphone / dictation ──
    if (btns.length >= 12 && _gpadBtnEdge(11, btns[11].pressed)) {
      try {
        // First try: find an existing mic/dictation button on screen and click it
        const micBtn = document.querySelector('[aria-label*="ictation"], [aria-label*="Mic"], [aria-label*="icrophone"], [aria-label*="Start dictation"], [aria-label*="Stop dictation"]');
        if (micBtn) {
          micBtn.click();
        } else {
          // Fallback: start browser speech recognition directly
          if (!window._gpadSpeechRecog) {
            const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SR) {
              window._gpadSpeechRecog = new SR();
              window._gpadSpeechRecog.continuous = false;
              window._gpadSpeechRecog.interimResults = false;
              window._gpadSpeechRecog.onresult = (e) => {
                const text = e.results[0][0].transcript;
                const target = document.activeElement;
                if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
                  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set || Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
                  if (setter) { setter.call(target, target.value + text); target.dispatchEvent(new Event('input', { bubbles: true })); }
                }
              };
            }
          }
          if (window._gpadSpeechRecog) {
            if (window._gpadSpeechRecogActive) {
              window._gpadSpeechRecog.stop(); window._gpadSpeechRecogActive = false;
              if (window.speechSynthesis) { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance('Microphone off'); u.rate = 1.2; window.speechSynthesis.speak(u); }
            } else {
              window._gpadSpeechRecog.start(); window._gpadSpeechRecogActive = true;
              if (window.speechSynthesis) { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance('Listening'); u.rate = 1.2; window.speechSynthesis.speak(u); }
            }
          }
        }
      } catch(e) {}
    }
    // D-pad: context-aware — block selection in 3D, navigation in UI
    if (btns.length >= 16) {
      const inCanvas = document.activeElement && document.activeElement.tagName === 'CANVAS';
      if (inCanvas) {
        if (_gpadBtnEdge(12, btns[12].pressed)) _gpadKey('Digit1', 'keydown');
        if (_gpadBtnEdge(13, btns[13].pressed)) _gpadKey('Digit2', 'keydown');
        if (_gpadBtnEdge(14, btns[14].pressed)) _gpadKey('Digit3', 'keydown');
        if (_gpadBtnEdge(15, btns[15].pressed)) _gpadKey('Digit4', 'keydown');
      } else {
        // UI mode: D-pad Up/Down scroll, Left/Right move focus
        if (_gpadBtnEdge(12, btns[12].pressed)) { try { (document.activeElement?.closest('[style*="overflow"]') || document.scrollingElement).scrollTop -= 80; } catch(e){} }
        if (_gpadBtnEdge(13, btns[13].pressed)) { try { (document.activeElement?.closest('[style*="overflow"]') || document.scrollingElement).scrollTop += 80; } catch(e){} }
        if (_gpadBtnEdge(14, btns[14].pressed)) { try { const f = Array.from(document.querySelectorAll('button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"]),a[href]')); const i = f.indexOf(document.activeElement); if (i > 0) f[i-1].focus(); } catch(e){} }
        if (_gpadBtnEdge(15, btns[15].pressed)) { try { const f = Array.from(document.querySelectorAll('button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"]),a[href]')); const i = f.indexOf(document.activeElement); if (i < f.length-1) f[i+1].focus(); } catch(e){} }
      }
    }
  };
  _gpadPoll();
  }
}

window.AlloModules = window.AlloModules || {};
window.AlloModules.AdaptiveControllerModule = true;
console.log('[AdaptiveController] global gamepad init complete');
})();
