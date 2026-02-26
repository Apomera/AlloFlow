"""Live Session Infrastructure Deep Audit"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')
lines = open('AlloFlowANTI.txt', 'r', encoding='utf-8').readlines()

print("=" * 70)
print("  LIVE SESSION INFRASTRUCTURE AUDIT")
print("=" * 70)

# 1. Session creation and structure
print("\n--- SESSION CREATION ---")
for i, line in enumerate(lines):
    if 'startClassSession' in line or 'generateSessionCode' in line:
        print(f"  L{i+1}: {line.strip()[:130]}")

# 2. Session joining (student side)
print("\n--- SESSION JOINING ---")
for i, line in enumerate(lines):
    if re.search(r'joinSession|handleJoinSession|onJoinSession|activeSessionCode.*set', line, re.IGNORECASE):
        if 'const' in line or 'function' in line or '=>' in line or 'set' in line.lower():
            print(f"  L{i+1}: {line.strip()[:130]}")

# 3. Firestore onSnapshot listeners
print("\n--- FIRESTORE LISTENERS (onSnapshot) ---")
for i, line in enumerate(lines):
    if 'onSnapshot' in line:
        print(f"  L{i+1}: {line.strip()[:130]}")

# 4. Sync mode logic
print("\n--- SYNC MODE ---")
for i, line in enumerate(lines):
    if re.search(r'isSyncMode|syncMode|mode.*sync|forceStatic', line):
        if len(line.strip()) > 5:
            print(f"  L{i+1}: {line.strip()[:130]}")

# 5. Democracy/voting system
print("\n--- DEMOCRACY/VOTING ---")
for i, line in enumerate(lines):
    if re.search(r'democracy|vote|voting', line, re.IGNORECASE):
        if 'const' in line or 'function' in line or '=>' in line or 'handle' in line:
            print(f"  L{i+1}: {line.strip()[:130]}")

# 6. Resource broadcasting
print("\n--- RESOURCE BROADCAST ---")
for i, line in enumerate(lines):
    if re.search(r'currentResourceId|broadcastResource|syncResource', line):
        print(f"  L{i+1}: {line.strip()[:130]}")

# 7. Session data shape
print("\n--- SESSION DATA READS (sessionData.*) ---")
fields = set()
for i, line in enumerate(lines):
    for m in re.finditer(r'sessionData\.(\w+)', line):
        fields.add(m.group(1))
print(f"  Fields accessed: {sorted(fields)}")

# 8. Escape room live session
print("\n--- ESCAPE ROOM SESSION ---")
for i, line in enumerate(lines):
    if 'escapeRoom' in line and ('State' in line or 'session' in line.lower()):
        if 'const' in line or 'await' in line or 'function' in line:
            print(f"  L{i+1}: {line.strip()[:130]}")

# 9. Quiz state sync
print("\n--- QUIZ STATE SYNC ---")
for i, line in enumerate(lines):
    if 'quizState' in line and ('session' in line.lower() or 'firestore' in line.lower() or 'updateDoc' in line.lower() or 'Ref' in line):
        print(f"  L{i+1}: {line.strip()[:130]}")

# 10. Student nickname / codename
print("\n--- STUDENT NICKNAME / CODENAME ---")
for i, line in enumerate(lines):
    if re.search(r'nickname|codename|code.?name|studentNick|animalName|randomName', line, re.IGNORECASE):
        print(f"  L{i+1}: {line.strip()[:130]}")

# 11. Error handling in session operations
print("\n--- SESSION ERROR HANDLING ---")
error_count = 0
fire_forget = 0
for i, line in enumerate(lines):
    if 'sessionRef' in line and 'updateDoc' in line:
        # Check next few lines for catch
        has_catch = False
        for j in range(i, min(i+3, len(lines))):
            if '.catch' in lines[j] or 'try' in lines[max(0,i-3):i+1].__str__():
                has_catch = True
                break
        if not has_catch:
            fire_forget += 1
        error_count += 1
print(f"  Total updateDoc(sessionRef) calls: {error_count}")
print(f"  Potentially missing error handling: {fire_forget}")
