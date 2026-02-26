---
name: alloflow-monolith-dev
description: Development patterns for the AlloFlow monolith (AlloFlowANTI.txt) - auditing, refactoring, feature addition, debugging, and safe editing of the 74K-line single-file React application
---

# AlloFlow Monolith Development Skill

## Architecture Context

AlloFlow is a **74,000+ line single-file React application** (`AlloFlowANTI.txt`) deployed via Gemini Canvas. The monolith constraint is intentional — the entire app must remain in one file for Canvas deployment.

### Key Structural Landmarks
- **L1-18**: License header (AGPL 3.0)
- **L19**: React imports (useState, useEffect, useRef, useCallback, useContext, useMemo, useReducer)
- **L21-31**: Lucide icon imports (5 categorical groups)
- **L38**: Firebase config
- **L43-45**: `DEBUG_LOG` flag and `debugLog()` function
- **L~1040**: `GEMINI_MODELS` config block
- **L~31394+**: Phase 4 reducer definitions (wsReducer, advReducer, quizReducer, glossaryReducer, conceptSortReducer, uiChromeReducer, settingsReducer)
- **L~31460**: `const AlloFlowContent = () => {` — the God Component
- **L~73834**: `export default`

### State Management (Post Phase 4)
- 7 `useReducer` instances manage cohesive subsystems:
  - `wsReducer` (Word Sounds), `advReducer` (Adventure), `quizReducer`, `glossaryReducer`, `conceptSortReducer`, `uiChromeReducer`, `settingsReducer`
- Remaining `useState` hooks: ~246 (Session/Auth, Audio/TTS, Fluency, View State, etc.)
- 4 Word Sounds hooks with `localStorage` lazy initializers remain as `useState`

## Safe Editing Patterns

### File Size Constraint
The file exceeds the 4MB editor tool limit. **Always use Python scripts** for modifications:

```python
with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    text = f.read()
# ... modifications ...
with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(text)
```

### Brace Balance Verification
After every modification, verify brace balance hasn't changed:
```python
open_b = text.count('{')
close_b = text.count('}')
print(f"Brace balance: {open_b} open, {close_b} close, delta = {open_b - close_b}")
```
Expected delta: **-8** (as of Feb 2026)

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
