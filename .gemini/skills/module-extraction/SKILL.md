---
name: module-extraction
description: How to extract a React component from AlloFlowANTI.txt into a standalone CDN-loaded module — JSX transpilation, dependency injection, IIFE wrapping, and registration
---

# Module Extraction & Transpilation Skill

## When to Use
Use this skill when extracting a React component section from `AlloFlowANTI.txt` into a standalone `*_module.js` file that loads via `<script>` tag (not bundled by CRA/Webpack).

## Architecture Overview
AlloFlow dynamically loads heavy modules as standalone scripts via `<script>` tags. These scripts:
- Run as **IIFEs** (Immediately Invoked Function Expressions)
- Register themselves on `window.AlloModules.{ModuleName}`
- Cannot use `import`/`export` — they must read everything from `window`
- Must use `React.createElement()` — raw JSX is **not** valid in a `<script>` tag unless Babel standalone is used at runtime

## Step-by-Step Extraction Process

### Step 1: Extract the Component Code
Identify the `// @section` comment boundaries in `AlloFlowANTI.txt`. Extract everything between the section start and end into a new file.

```javascript
// Example section markers in AlloFlowANTI.txt:
// @section STUDENT_ANALYTICS — RTI probes and student analytics
// ... component code ...
// @endsection STUDENT_ANALYTICS
```

### Step 2: Wrap in IIFE + React Bootstrap
The extracted code must be wrapped in an IIFE that reads React from `window`:

```javascript
// ═══════════════════════════════════════════════════════════════
// my_module.js — ModuleName v1.0.0
// Description
// Extracted from AlloFlowANTI.txt for modular CDN loading
// ═══════════════════════════════════════════════════════════════
(function () {
  'use strict';

  // Ensure React and ReactDOM are available
  var React = window.React;
  var ReactDOM = window.ReactDOM;
  if (!React || !ReactDOM) {
    console.error('[ModuleName] React/ReactDOM not found on window');
    return;
  }

  // Re-export React hooks for use in the component
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useRef = React.useRef;
  var useCallback = React.useCallback;
  var useMemo = React.useMemo;
  var memo = React.memo;

  // === DEPENDENCY INJECTION ===
  // (see Step 4 below)

  // ... component code ...

  // Register module
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.ModuleName = MyComponent;
  console.log('[CDN] ModuleName module registered');
})();
```

### Step 3: Transpile JSX → React.createElement

> [!CAUTION]
> Raw JSX in a `<script>` tag causes `SyntaxError: Unexpected token '<'`.
> You **must** transpile before deploying.

Install Babel (if not already):
```bash
npm install --save-dev @babel/cli @babel/core @babel/plugin-transform-react-jsx
```

Transpile the file:
```bash
npx babel my_module.js --plugins=@babel/plugin-transform-react-jsx --out-file my_module_compiled.js
```

Then replace the original with the compiled version:
```bash
copy /Y my_module_compiled.js my_module.js
```

**Verification**: After transpilation, confirm there are zero JSX angle-bracket patterns:
```bash
node -e "const fs=require('fs'); const c=fs.readFileSync('my_module.js','utf8'); const jsx=c.match(/<[A-Z][a-zA-Z]*[\s>]/g); console.log('JSX remnants:', jsx ? jsx.length : 0)"
```
Expected: `JSX remnants: 0`

### Step 4: Inject External Dependencies

> [!IMPORTANT]
> This is the most error-prone step. The extracted component will reference globals
> that exist in `AlloFlowANTI.txt` but are **not** available in the module's IIFE scope.

#### Common Dependencies to Shim

Add these **inside the IIFE, before the component definition**:

```javascript
// ── External dependency shims ──────────────────────────────────

// 1. Utility functions from App.jsx
var safeGetItem = window.safeGetItem || function(key) {
  try { return localStorage.getItem(key); } catch(e) { return null; }
};
var safeSetItem = window.safeSetItem || function(key, val) {
  try { localStorage.setItem(key, val); } catch(e) {}
};
var warnLog = window.warnLog || function() {
  console.warn.apply(console, arguments);
};

// 2. Bot reference (used for alloBotRef.current.speak())
var alloBotRef = window.alloBotRef || { current: null };

// 3. Safety content checker
var SafetyContentChecker = window.SafetyContentChecker || {
  checkContent: function() { return { flagged: false, flags: [] }; }
};

// 4. Data constants (copy from App.jsx if needed)
var GRADE_SUBTEST_BATTERIES = window.GRADE_SUBTEST_BATTERIES || {
  // Paste the full constant from App.jsx here
};

// 5. Firebase references (if the module accesses Firestore)
var db = window.__alloFirestore || null;
var getFirestore = window.firebase?.firestore ? function() { return window.firebase.firestore(); } : function() { return null; };

// 6. Lucide icons (read from window.lucide)
var lucide = window.lucide || {};
var BookOpen = lucide.BookOpen || function() { return null; };
var Download = lucide.Download || function() { return null; };
// ... add each icon actually used in the component
```

#### How to Find Missing Dependencies

1. **Deploy and check console** for `ReferenceError: X is not defined`
2. **Search the module file** for identifiers not declared within its IIFE:
   ```bash
   # Find all undeclared top-level references
   node -e "
     const fs = require('fs');
     const code = fs.readFileSync('my_module.js', 'utf8');
     // Search for common App.jsx globals
     const globals = ['safeGetItem','safeSetItem','warnLog','alloBotRef',
       'SafetyContentChecker','GRADE_SUBTEST_BATTERIES','extractSafetyFlags',
       'db','getFirestore','doc','setDoc','getDoc','collection','addDoc'];
     globals.forEach(g => {
       const re = new RegExp('\\b' + g + '\\b', 'g');
       const matches = code.match(re);
       if (matches) console.log(g + ': ' + matches.length + ' references');
     });
   "
   ```
3. **For each missing reference**, decide:
   - **Props**: If the parent passes it as a prop, no shim needed
   - **Window global**: Add `var X = window.X || fallback;`
   - **Inline copy**: For constants like `GRADE_SUBTEST_BATTERIES`, copy the value from `App.jsx`

### Step 5: Deploy

Follow the `/deploy` workflow:
1. Copy module to `prismflow-deploy/public/`
2. `node build.js --mode=prod`
3. `npm run build` (in `prismflow-deploy/`)
4. Stamp service worker
5. `npx firebase deploy --only hosting`
6. Git commit + push (for CDN cache busting)

### Step 6: Verify

Check the browser console for:
```
[CDN] ModuleName module registered          ← SUCCESS
[CDN-ERROR] ModuleName: ReferenceError: ... ← FAILURE (missing dependency)
[CDN-ERROR] ModuleName: SyntaxError: ...    ← FAILURE (JSX not transpiled)
```

## Module Registration Pattern

Every module **must** end with this pattern inside the IIFE:

```javascript
  // Register module
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.ModuleName = MyComponent;
  console.log('[CDN] ModuleName module registered');
```

The host app (`App.jsx`) loads modules with `loadModule()` which:
1. Creates a `<script>` tag
2. Waits for `onload`
3. Checks `window.AlloModules.ModuleName` exists

## Existing Modules Reference

| Module | File | Registration Key |
|--------|------|------------------|
| STEM Lab | `stem_lab_module.js` | `window.AlloModules.STEMLab` |
| Word Sounds | `word_sounds_module.js` | `window.AlloModules.WordSounds` |
| BehaviorLens | `behavior_lens_module.js` | `window.AlloModules.BehaviorLens` |
| Report Writer | `report_writer_module.js` | `window.AlloModules.ReportWriter` |
| Student Analytics | `student_analytics_module.js` | `window.AlloModules.StudentAnalytics` |
| Math Fluency | `math_fluency_module.js` | `window.AlloModules.MathFluency` |

## Common Gotchas

1. **JSX in script tags**: Raw JSX causes `SyntaxError: Unexpected token '<'` — always transpile with Babel
2. **Missing globals**: The #1 runtime error. Always audit for external references
3. **Template literals**: Babel transpiles these fine, but backtick strings with `${}` inside HTML template strings can confuse the parser — prefer string concatenation in tricky cases
4. **Lucide icons**: AlloFlow loads Lucide via CDN global. Icons used in a module must be read from `window.lucide`
5. **Firebase**: Never `import` Firebase — read from `window.firebase` or the pre-initialized `window.__alloFirestore`
6. **CSS classes**: Modules share `shared.css` and Tailwind classes from the host app — no extra CSS bundling needed
7. **`extractSafetyFlags`**: This utility is defined in App.jsx. If the module uses it, either copy the function inline or add it to `window` in App.jsx
