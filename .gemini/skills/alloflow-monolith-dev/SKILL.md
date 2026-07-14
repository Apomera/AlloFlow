---
name: alloflow-monolith-dev
description: Development patterns for the AlloFlow monolith (AlloFlowANTI.txt) - auditing, refactoring, feature addition, debugging, and safe editing of the ~29K-line single-file React application
---

# AlloFlow Monolith Development Skill

## Architecture Context

AlloFlow is a **~29,000-line single-file React application** (`AlloFlowANTI.txt`,
~1.5 MB) deployed via Gemini Canvas. The monolith constraint is intentional — the
entire app must remain in one file for Canvas deployment. It used to be ~74K
lines; it shrank as heavy features were extracted into ~250 CDN modules.

### Key Structural Landmarks
**Line numbers drift constantly as modules are extracted — always `grep` for the
symbol rather than jumping to a fixed line.** Current approximate anchors:
- License header (AGPL 3.0) + React/Lucide imports at the top
- `const DEBUG_LOG` + `debugLog()` — search `DEBUG_LOG` (~L504)
- `GEMINI_MODELS` config — search `GEMINI_MODELS` (near the top, ~L260)
- Phase 4 reducers (`wsReducer`, `advReducer`, `quizReducer`, `glossaryReducer`,
  `conceptSortReducer`, `uiChromeReducer`, `settingsReducer`) — search the
  reducer name (e.g. `function wsReducer` ~L3070)
- `AlloFlowContent` — the God Component; search `AlloFlowContent`
- `export default function WrappedApp()` — the end of the component tree (~L29030)

### State Management (Post Phase 4)
- 7 `useReducer` instances manage cohesive subsystems:
  - `wsReducer` (Word Sounds), `advReducer` (Adventure), `quizReducer`, `glossaryReducer`, `conceptSortReducer`, `uiChromeReducer`, `settingsReducer`
- Remaining `useState` hooks: ~246 (Session/Auth, Audio/TTS, Fluency, View State, etc.)
- 4 Word Sounds hooks with `localStorage` lazy initializers remain as `useState`

## Safe Editing Patterns

### File Size
The file is ~1.5 MB — the `Edit`/`Write` tools handle it directly. Python or
Node scripts are optional for large scripted/bulk edits, not required:

```python
with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    text = f.read()
# ... modifications ...
with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(text)
```

### Brace Balance Verification
After every modification, verify the brace delta is **unchanged** from before
your edit (the absolute value drifts over time — don't anchor on a fixed number;
as of this writing it is -2):
```python
open_b = text.count('{')
close_b = text.count('}')
print(f"Brace balance: {open_b} open, {close_b} close, delta = {open_b - close_b}")
```

### useReducer Migration Pattern
When migrating `useState` to `useReducer`, use the **thin setter wrapper** pattern:
```javascript
// Reducer defined OUTSIDE the component
const FOO_INITIAL_STATE = { bar: 0, baz: false };
function fooReducer(state, action) {
  if (action.type === 'FOO_SET') {
    const val = typeof action.value === 'function' ? action.value(state[action.field]) : action.value;
    return { ...state, [action.field]: val };
  }
  return state;
}

// INSIDE the component — destructure + thin setter wrappers
const [fooState, fooDispatch] = useReducer(fooReducer, FOO_INITIAL_STATE);
const { bar, baz } = fooState;
const setBar = (v) => fooDispatch({ type: 'FOO_SET', field: 'bar', value: v });
const setBaz = (v) => fooDispatch({ type: 'FOO_SET', field: 'baz', value: v });
```
This preserves all existing call sites — zero downstream changes needed.

## Debugging Workflow
1. Check console errors for the component and line number
2. Map blob line numbers to local file by searching for surrounding code patterns
3. Use `debugLog()` (gated by `DEBUG_LOG` flag) for development logging
4. Always archive helper scripts to `_archive/` after use

## Testing Priorities
1. **Core navigation**: Dashboard, sidebar, theme toggle
2. **Word Sounds**: Full session flow (setup → play → review)
3. **Adventure**: Start/resume, difficulty, language mode
4. **Glossary**: Add/edit/delete terms, health check, image generation
5. **UI Chrome**: Modals, toasts, export menu
