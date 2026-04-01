---
name: stem-plugin-extraction
description: How to safely extract an inline STEM Lab tool from stem_lab_module.js into a standalone plugin file using window.StemLab.registerTool
---

# STEM Lab Plugin Extraction Skill

## When to Use
Use this skill when extracting an inline tool definition from `stem_lab_module.js` into a standalone `stem_tool_*.js` plugin file that registers via `window.StemLab.registerTool()`.

> [!CAUTION]
> Extraction scripts that match on string patterns can accidentally consume adjacent IIFE closures.
> This caused a real production outage on 2026-03-24 when a missing `})()),` collapsed 43,000 lines.
> **Always run `node -c` syntax verification after extraction.**

## Architecture

STEM Lab tools come in two flavors:
1. **Inline tools**: Defined directly inside `stem_lab_module.js` as conditional branches of the `StemLabModal` component
2. **Plugin tools**: Standalone files that register via `window.StemLab.registerTool('toolName', { render: fn })` and are loaded by the plugin fallback renderer

The plugin registry (`_pluginFallback`) provides a bridge context object (`ctx`) containing React, hooks, state, and utility functions.

## Step-by-Step Extraction

### Step 1: Identify the Inline Tool Boundaries

Search for the tool's inline definition in `stem_lab_module.js`:

```javascript
// The inline tool is typically guarded by a condition like:
stemLabTool === 'codingPlayground' && (() => {
  // ... tool body (can be 500-2000 lines) ...
})(),
```

Note the **start line** (the condition) and **end line** (the `})(),` closure).

### Step 2: Check for Hoisted React Hooks

> [!IMPORTANT]
> This is the #1 cause of post-extraction crashes. React hooks cannot be called conditionally,
> so they are often hoisted to the `StemLabModal` top level — outside the tool's inline body.

Search for hooks that reference your tool name:
```bash
# Find hooks that may be hoisted outside the tool body
python -c "
lines = open('stem_lab/stem_lab_module.js', encoding='utf-8').readlines()
for i, l in enumerate(lines):
    if '_codingCanvas' in l or '_yourToolRef' in l:
        print(f'{i}: {l.strip()}')"
```

Common hoisted patterns:
- `var _codingCanvasRef = React.useRef(null);`
- `React.useEffect(function() { ... codingPlayground ... });`

These hooks must be **injected into the `ctx` bridge** (see Step 5).

### Step 3: Create the Plugin File

Create `stem_lab/stem_tool_<name>.js` with this structure:

```javascript
window.StemLab.registerTool('toolName', {
    icon: '🔬',
    label: 'toolName',
    desc: '',
    color: 'slate',
    category: 'creative',  // or 'science', 'math', etc.
    render: function(ctx) {
      // ── Aliases — map ctx properties to original variable names ──
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var addToast = ctx.addToast;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var awardStemXP = ctx.awardXP;
      var stemCelebrate = ctx.celebrate;
      var callGemini = ctx.callGemini;
      // ... add any hoisted hooks ...
      var _myToolRef = ctx._myToolRef;

      // ── Tool body ──
      return (function() {
        // ... paste extracted inline body here ...
      })();
    }
});
```

### Step 4: Remove the Inline Copy

Delete the inline tool body from `stem_lab_module.js`. **Be extremely careful with closing brackets.**

Verification after deletion:
```bash
node -c stem_lab/stem_lab_module.js
```

If this fails with `SyntaxError: Unexpected token ')'` or `Unexpected end of input`, you removed too many or too few closing brackets.

### Step 5: Bridge Hoisted Hooks

In `stem_lab_module.js`, find the `_ctx` object in `_pluginFallback` and add any hoisted hooks:

```javascript
var _ctx = {
  // ... existing properties ...
  _myToolRef: typeof _myToolRef !== 'undefined' ? _myToolRef : null,
};
```

### Step 6: Register as Plugin-Only

Add the tool to the `_pluginOnlyTools` object in `_pluginFallback`:

```javascript
var _pluginOnlyTools = {
  // ... existing tools ...
  myToolName: true,
};
```

### Step 7: Add to AlloFlowANTI.txt

Add a `<script>` tag for the new plugin file in the `<!-- STEM Lab Plugins -->` section:

```html
<script src="$CDN_BASE/stem_lab/stem_tool_<name>.js"></script>
```

### Step 8: Validate and Deploy

```bash
# 1. Syntax check ALL modified files
node -c stem_lab/stem_lab_module.js
node -c stem_lab/stem_tool_<name>.js

# 2. Check for orphaned brackets
python -c "
src = open('stem_lab/stem_lab_module.js', encoding='utf-8').read()
print('Open parens:', src.count('('), 'Close:', src.count(')'))
print('Open braces:', src.count('{'), 'Close:', src.count('}'))
print('Open brackets:', src.count('['), 'Close:', src.count(']'))"

# 3. Follow /deploy workflow
```

## Post-Extraction Checklist

- [ ] `node -c` passes for monolith AND new plugin file
- [ ] Bracket counts are balanced in the monolith
- [ ] Hoisted React hooks are injected into `ctx`
- [ ] Tool removed from monolith inline list
- [ ] Tool added to `_pluginOnlyTools`
- [ ] Script tag added to AlloFlowANTI.txt
- [ ] Browser test: tool loads via plugin renderer
- [ ] Browser test: all interactive features work
- [ ] `git status --short` shows clean working tree before deploy

## Known Pitfalls

1. **Closing bracket consumption**: Python `str.replace()` can match the IIFE closure of the *next* tool if boundaries aren't precise
2. **Hoisted hooks**: React hooks must be at the top level of a component — they can't be nested inside the plugin's render function. Pass them through `ctx`.
3. **Variable shadowing**: The inline version may reference variables (`addToast`, `ArrowLeft`) that are in scope in the monolith but not in the plugin. Always alias from `ctx`.
4. **Dual definitions**: If both an inline and plugin version exist, the inline wins (it renders first). Always delete the inline version after extraction.
