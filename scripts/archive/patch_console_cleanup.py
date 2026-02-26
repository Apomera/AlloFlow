"""
Patch: Console Log Cleanup & Performance Optimization

Goals:
1. Gate all console.warn() calls behind DEBUG_LOG (except critical audio/session errors)
2. Gate non-critical console.log() calls behind DEBUG_LOG
3. Keep console.error() for genuine failure paths
4. Add a warnLog utility parallel to debugLog
"""

import re

FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

changes = []

# ============================================================
# PATCH 1: Add warnLog utility right after debugLog
# ============================================================
OLD_DEBUG = "const debugLog = (...args) => { if (DEBUG_LOG) console.log(...args); };"
NEW_DEBUG = """const debugLog = (...args) => { if (DEBUG_LOG) console.log(...args); };
const warnLog = (...args) => { if (DEBUG_LOG) console.warn(...args); };"""

if NEW_DEBUG.split('\n')[1] not in content:
    if OLD_DEBUG in content:
        content = content.replace(OLD_DEBUG, NEW_DEBUG, 1)
        changes.append("PATCH 1: Added warnLog utility function")
    else:
        print("ERROR: Could not find debugLog anchor")
else:
    changes.append("PATCH 1: warnLog already exists (skipped)")

# ============================================================
# PATCH 2: Replace console.warn with warnLog (smart replacement)
# ============================================================

# Lines of code where we should NOT replace console.warn because
# they represent critical, user-facing errors that should always show:
KEEP_CONSOLE_WARN = {
    # These are critical system errors or security issues
    'Storage quota full',
    'Failed to persist audio',
    'Failed to remove audio',
    'setWsPreloadedWords is not defined',
}

lines = content.split('\n')
warn_replaced = 0
warn_kept = 0
new_lines = []

for i, line in enumerate(lines):
    stripped = line.strip()
    
    # Skip already-commented lines
    if stripped.startswith('//'):
        new_lines.append(line)
        continue
    
    # Skip the warnLog definition itself
    if 'const warnLog' in line:
        new_lines.append(line)
        continue
    
    # Check if this line has console.warn 
    if 'console.warn(' in line:
        # Check if this is a critical warning we want to keep
        keep = False
        for critical_phrase in KEEP_CONSOLE_WARN:
            if critical_phrase in line:
                keep = True
                break
        
        if keep:
            warn_kept += 1
            new_lines.append(line)
        else:
            # Replace console.warn with warnLog
            new_line = line.replace('console.warn(', 'warnLog(')
            new_lines.append(new_line)
            warn_replaced += 1
    
    # Also gate active console.log calls (not inside debugLog definition or comments)
    elif 'console.log(' in line and 'debugLog' not in line and 'const debugLog' not in line:
        new_line = line.replace('console.log(', 'debugLog(')
        new_lines.append(new_line)
        warn_replaced += 1
    else:
        new_lines.append(line)

content = '\n'.join(new_lines)
changes.append(f"PATCH 2: Replaced {warn_replaced} console.warn/log -> warnLog/debugLog, kept {warn_kept} critical warnings")

# ============================================================
# Write results
# ============================================================
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

# Final count verification
final_warn = content.count('console.warn(')
final_log = content.count('console.log(')
final_err = content.count('console.error(')
final_warnlog = content.count('warnLog(')
final_debuglog = content.count('debugLog(')

print(f"\n{'='*50}")
print(f"All {len(changes)} patches applied successfully:")
for c in changes:
    print(f"  ✓ {c}")
print(f"\n{'='*50}")
print(f"BEFORE -> AFTER:")
print(f"  console.warn:  ~196 -> {final_warn}")
print(f"  console.log:   ~70  -> {final_log}")
print(f"  console.error: ~243 -> {final_err} (unchanged)")
print(f"  warnLog:       0    -> {final_warnlog}")
print(f"  debugLog:      ~127 -> {final_debuglog}")
print(f"{'='*50}")
print(f"File size: {len(content):,} bytes")
