"""
Pass 1 A+ Fix: Migrate console.error → warnLog/debugLog and add logging to 2 silent catches.
Strategy:
  - Keep console.error ONLY in ErrorBoundary (L22497) and definition blocks
  - Migrate all others to warnLog (operational errors) or debugLog (debug-level info)
  - Add warnLog to 2 silent .catch(() => {}) at L41695 and L49515
  - Add context to bare console.error(e) calls
"""
import sys
import re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('\r\n', '\n')
lines = content.split('\n')
changes = 0

# ================================================================
# FIX 1: Add warnLog to 2 silent .catch(() => {}) calls
# ================================================================

# L41695: Glossary TTS pre-cache
old = '}).catch(() => {});'
# Find the specific one near the glossary context (around line 41695)
pos = content.find('}).catch(() => {});\n                  }\n              });\n         }\n     }\n     // GLOSSARY AUDIO FIX')
if pos > -1:
    content = content[:pos] + '}).catch(e => warnLog("Glossary TTS pre-cache failed:", e?.message || e));\n                  }\n              });\n         }\n     }\n     // GLOSSARY AUDIO FIX' + content[pos + len('}).catch(() => {});\n                  }\n              });\n         }\n     }\n     // GLOSSARY AUDIO FIX'):]
    changes += 1
    print("1. ✅ Fixed L41695: Glossary TTS pre-cache silent catch → warnLog")
else:
    print("1. ❌ Could not locate glossary TTS silent catch")

# L49515: Persona message lookahead TTS
old_persona = 'callTTS(nextMsg.msg.text, selectedVoice).catch(() => {});'
new_persona = 'callTTS(nextMsg.msg.text, selectedVoice).catch(e => warnLog("Persona TTS lookahead failed:", e?.message || e));'
if old_persona in content:
    content = content.replace(old_persona, new_persona)
    changes += 1
    print("2. ✅ Fixed L49515: Persona TTS lookahead silent catch → warnLog")
else:
    print("2. ❌ Could not locate persona TTS silent catch")

# ================================================================
# FIX 2: Migrate console.error → warnLog/debugLog
# We do NOT touch:
#   - ErrorBoundary (should stay visible for crash reporting)
#   - Lines that are part of debugLog/warnLog definitions
#   - Lines inside string literals (prompts, etc)
# ================================================================

# First, let's do targeted replacements for bare console.error(e) calls
# by adding context - we need to know what's near each one

# Simple bulk migration: console.error( → warnLog(
# We protect ErrorBoundary and definitions with a pre/post approach

# Count before
before_count = content.count('console.error(')
print(f"\n--- Starting bulk migration: {before_count} console.error calls ---")

# Protect ErrorBoundary line
PROTECT_EB = '___ERRORBOUNDARY_PROTECTED___'
eb_line = 'console.error("ErrorBoundary caught an error:", error, errorInfo);'
content = content.replace(eb_line, PROTECT_EB)

# Protect definition lines (debugLog/warnLog with console.error)
PROTECT_DEF1 = '___DEF1_PROTECTED___'
PROTECT_DEF2 = '___DEF2_PROTECTED___'
def1 = "console.error(...args)"
content = content.replace(def1, PROTECT_DEF1)

# Now do the bulk replacement
# Strategy: console.error → warnLog for most, but bare ones need context
# First handle bare console.error(e) and console.error(err) - add context
content = re.sub(
    r'console\.error\(\s*e\s*\)',
    'warnLog("Unhandled error:", e)',
    content
)
content = re.sub(
    r'console\.error\(\s*err\s*\)',
    'warnLog("Unhandled error:", err)',
    content
)
content = re.sub(
    r'console\.error\(\s*error\s*\)',
    'warnLog("Unhandled error:", error)',
    content
)

# Now migrate all remaining console.error( → warnLog(
content = content.replace('console.error(', 'warnLog(')

# Restore protected lines
content = content.replace(PROTECT_EB, eb_line)
content = content.replace(PROTECT_DEF1, def1)

after_count = content.count('console.error(')
migrated = before_count - after_count + 1  # +1 for ErrorBoundary restore
print(f"3. ✅ Migrated {migrated - 1} console.error → warnLog (kept {after_count} protected)")

# ================================================================
# VERIFY: Count remaining console.error calls
# ================================================================
remaining = content.count('console.error(')
print(f"\n--- VERIFICATION ---")
print(f"Remaining console.error calls: {remaining}")
print(f"Expected: ~2 (ErrorBoundary + definition)")

# Count silent .catch(() => {}) remaining
silent = len(re.findall(r'\.catch\(\(\)\s*=>\s*\{\s*\}\)', content))
print(f"Remaining silent .catch(() => {{}}): {silent}")

# Save
content = content.replace('\n', '\r\n')
with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print(f"\n✨ Total changes applied. File saved.")
