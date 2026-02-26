"""
Escape Room useReducer Migration
- Replace escapeRoomState/setEscapeRoomState + escapeTimeLeft/isEscapeTimerRunning with useReducer
- Insert escapeReducer function before the declarations
- Replace all setEscapeRoomState(prev => ({...prev, X})) with dispatchEscape({type: 'UPDATE', payload: {X}})
- Replace all setEscapeRoomState({...initial}) with dispatchEscape({type: 'RESET'})
- Replace setEscapeTimeLeft with dispatchEscape({type: 'SET_TIME_LEFT', value})  
- Replace isEscapeTimerRunning with escapeRoomState.isTimerRunning
"""
import re

FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

le = '\r\n' if lines[0].endswith('\r\n') else '\n'
changes = []
original = len(lines)

# ====================================================================
# STEP 1: Define initial state and reducer, insert before useState
# ====================================================================
# Find the escapeRoomState useState declaration
escape_line = None
for i, line in enumerate(lines):
    if 'const [escapeRoomState, setEscapeRoomState] = useState({' in line:
        escape_line = i
        break

if escape_line is None:
    print("ERROR: Could not find escapeRoomState useState")
    exit(1)

# Find the end of the useState declaration (closing });)
escape_end = None
for i in range(escape_line, escape_line + 20):
    if '});' in lines[i] and lines[i].strip().startswith('}'):
        escape_end = i
        break

# Find the separate primitives
time_left_line = None
timer_running_line = None
for i in range(escape_end, escape_end + 5):
    if 'escapeTimeLeft' in lines[i] and 'useState' in lines[i]:
        time_left_line = i
    if 'isEscapeTimerRunning' in lines[i] and 'useState' in lines[i]:
        timer_running_line = i

print(f"escapeRoomState: L{escape_line+1}-{escape_end+1}")
print(f"escapeTimeLeft: L{time_left_line+1 if time_left_line else 'NOT FOUND'}")
print(f"isEscapeTimerRunning: L{timer_running_line+1 if timer_running_line else 'NOT FOUND'}")

# Build the initial state constant and reducer
reducer_block = [
    le,
    '  // ═══════════════════════════════════════════════════════════════' + le,
    '  // ESCAPE ROOM STATE MANAGEMENT (useReducer)' + le,
    '  // ═══════════════════════════════════════════════════════════════' + le,
    '  const ESCAPE_ROOM_INITIAL_STATE = {' + le,
    '    isActive: false,' + le,
    '    room: null,' + le,
    '    puzzles: [],' + le,
    '    currentPuzzleIndex: null,' + le,
    '    solvedPuzzles: new Set(),' + le,
    '    totalPuzzles: 8,' + le,
    '    puzzleCount: 8,' + le,
    '    difficulty: \'normal\',' + le,
    '    timeRemaining: 300,' + le,
    '    isEscaped: false,' + le,
    '    isGenerating: false,' + le,
    '    selectedObject: null,' + le,
    '    timeLeft: 300,' + le,
    '    isTimerRunning: false' + le,
    '  };' + le,
    le,
    '  function escapeReducer(state, action) {' + le,
    '    switch (action.type) {' + le,
    '      case \'UPDATE\':' + le,
    '        return { ...state, ...action.payload };' + le,
    '      case \'RESET\':' + le,
    '        return { ...ESCAPE_ROOM_INITIAL_STATE, solvedPuzzles: new Set() };' + le,
    '      case \'SET_TIME_LEFT\':' + le,
    '        return { ...state, timeLeft: action.value };' + le,
    '      case \'SET_TIMER_RUNNING\':' + le,
    '        return { ...state, isTimerRunning: action.value };' + le,
    '      default:' + le,
    '        return state;' + le,
    '    }' + le,
    '  }' + le,
    le,
]

# Insert reducer before the useState, then replace useState with useReducer
# Also remove the comment line before escapeTimeLeft
comment_line = None
for i in range(escape_end, escape_end + 3):
    if 'Separate primitive state' in lines[i]:
        comment_line = i

# What we remove: L escape_line to timer_running_line (inclusive)
remove_end = timer_running_line if timer_running_line else escape_end

# Replace with: reducer_block + useReducer declaration
use_reducer_decl = [
    '  const [escapeRoomState, dispatchEscape] = React.useReducer(escapeReducer, ESCAPE_ROOM_INITIAL_STATE);' + le,
]

# Compute the new block
new_block = reducer_block + use_reducer_decl

# Replace the old declarations
lines[escape_line:remove_end + 1] = new_block
changes.append(f"STEP 1: Replaced useState declarations with useReducer (L{escape_line+1}-{remove_end+1})")

# ====================================================================
# STEP 2: Replace all setEscapeRoomState calls with dispatchEscape
# ====================================================================
# Pattern 1: setEscapeRoomState(prev => ({...prev, KEY: VALUE}))
# → dispatchEscape({type: 'UPDATE', payload: {KEY: VALUE}})
#
# Pattern 2: setEscapeRoomState({ ...initial object }) (reset)  
# → dispatchEscape({type: 'RESET'})
#
# Many of these are multi-line. The safest approach: replace the function name
# and handle the functional updater pattern.

count_replaced = 0
for i in range(len(lines)):
    line = lines[i]
    
    # Pattern: setEscapeRoomState(prev => ({...prev,
    if 'setEscapeRoomState(prev => ({...prev,' in line:
        lines[i] = line.replace('setEscapeRoomState(prev => ({...prev,', 'dispatchEscape({type: \'UPDATE\', payload: {')
        # Find the closing })) and replace with }})
        for j in range(i, min(i + 15, len(lines))):
            if '}))' in lines[j]:
                lines[j] = lines[j].replace('}))', '}})', 1)
                break
        count_replaced += 1
        
    # Pattern: setEscapeRoomState(prev => {  (multi-line function)
    elif 'setEscapeRoomState(prev => {' in line and '({...prev' not in line:
        # This is a complex multi-line updater. Leave as functional dispatch.
        # We'll handle these manually or leave them as-is for now.
        lines[i] = line.replace('setEscapeRoomState(prev => {', 'dispatchEscape({type: \'FUNC_UPDATE\', updater: (prev) => {')
        count_replaced += 1
        
    # Pattern: setEscapeRoomState({  (direct reset/set)
    elif 'setEscapeRoomState({' in line and 'prev' not in line:
        # Check if it's a reset (has isActive: false and room: null)
        # Look ahead for isActive: false
        is_reset = False
        for j in range(i, min(i+5, len(lines))):
            if 'isActive: false' in lines[j]:
                is_reset = True
                break
        
        if is_reset:
            # Find the closing });
            for j in range(i, min(i + 20, len(lines))):
                if '});' in lines[j]:
                    # Replace entire block with dispatch RESET
                    lines[i:j+1] = ['    dispatchEscape({type: \'RESET\'});' + le]
                    count_replaced += 1
                    break
        else:
            lines[i] = line.replace('setEscapeRoomState({', 'dispatchEscape({type: \'UPDATE\', payload: {')
            for j in range(i, min(i + 15, len(lines))):
                if '});' in lines[j]:
                    lines[j] = lines[j].replace('});', '}});', 1)
                    break
            count_replaced += 1

changes.append(f"STEP 2: Replaced {count_replaced} setEscapeRoomState calls with dispatchEscape")

# ====================================================================
# STEP 3: Replace setEscapeTimeLeft with dispatchEscape
# ====================================================================
time_count = 0
for i in range(len(lines)):
    if 'setEscapeTimeLeft(' in lines[i]:
        # Replace setEscapeTimeLeft(X) with dispatchEscape({type: 'SET_TIME_LEFT', value: X})
        match = re.search(r'setEscapeTimeLeft\(([^)]+)\)', lines[i])
        if match:
            value = match.group(1)
            lines[i] = lines[i].replace(f'setEscapeTimeLeft({value})', f'dispatchEscape({{type: \'SET_TIME_LEFT\', value: {value}}})')
            time_count += 1

changes.append(f"STEP 3: Replaced {time_count} setEscapeTimeLeft calls")

# ====================================================================
# STEP 4: Replace isEscapeTimerRunning with escapeRoomState.isTimerRunning
# ====================================================================
timer_count = 0
for i in range(len(lines)):
    if 'setIsEscapeTimerRunning(' in lines[i]:
        match = re.search(r'setIsEscapeTimerRunning\(([^)]+)\)', lines[i])
        if match:
            value = match.group(1)
            lines[i] = lines[i].replace(f'setIsEscapeTimerRunning({value})', f'dispatchEscape({{type: \'SET_TIMER_RUNNING\', value: {value}}})')
            timer_count += 1
    elif 'isEscapeTimerRunning' in lines[i] and 'setIsEscapeTimerRunning' not in lines[i] and 'useState' not in lines[i]:
        lines[i] = lines[i].replace('isEscapeTimerRunning', 'escapeRoomState.isTimerRunning')
        timer_count += 1

# Also replace escapeTimeLeft reads with escapeRoomState.timeLeft 
for i in range(len(lines)):
    if 'escapeTimeLeft' in lines[i] and 'setEscapeTimeLeft' not in lines[i] and 'useState' not in lines[i] and 'dispatchEscape' not in lines[i]:
        lines[i] = lines[i].replace('escapeTimeLeft', 'escapeRoomState.timeLeft')

changes.append(f"STEP 4: Replaced {timer_count} timer state refs")

# ====================================================================
# STEP 5: Add FUNC_UPDATE handler to reducer (for complex updaters)
# ====================================================================
# Find the reducer and add FUNC_UPDATE case
for i in range(len(lines)):
    if "case 'RESET':" in lines[i]:
        # Insert FUNC_UPDATE case before RESET
        lines.insert(i, "      case 'FUNC_UPDATE':" + le)
        lines.insert(i+1, "        return action.updater(state);" + le)
        changes.append("STEP 5: Added FUNC_UPDATE case to reducer")
        break

# Write
f = open(FILE, 'w', encoding='utf-8')
f.write(''.join(lines))
f.close()

print(f"\nApplied {len(changes)} changes:")
for c in changes:
    print(f"  ✅ {c}")
print(f"\nLines: {original} -> {len(lines)} (delta: {len(lines) - original})")
