"""Phase 1a: Expand group schema and add handler functions"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()

# --- CHANGE 1: Expand handleCreateGroup schema ---
old_schema = "            [`groups.${groupId}`]: { name: nameToUse, resourceId: null, language: null }"
new_schema = "            [`groups.${groupId}`]: { name: nameToUse, resourceId: null, language: null, readingLevel: null, ttsSpeed: 1.0, karaokeMode: false, visualDensity: \"normal\", communicationMode: \"verbal\", simplifyLevel: null, dokLevel: null, complexityLevel: null }"

count1 = content.count(old_schema)
if count1 != 1:
    print(f"ERROR: Expected 1 occurrence of old schema, found {count1}")
    sys.exit(1)
content = content.replace(old_schema, new_schema)
print(f"[OK] Expanded group schema in handleCreateGroup")

# --- CHANGE 2: Add handleSetGroupProfile after handleSetGroupLanguage ---
old_handler_end = """  const handleSetGroupLanguage = async (groupId, language) => {
      const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', activeSessionCode);
      try {
        await updateDoc(sessionRef, {
            [`groups.${groupId}.language`]: language || null
        });
      } catch (error) {
          warnLog("Error setting group language:", error);
      }
  };"""

new_handler_block = """  const handleSetGroupLanguage = async (groupId, language) => {
      const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', activeSessionCode);
      try {
        await updateDoc(sessionRef, {
            [`groups.${groupId}.language`]: language || null
        });
      } catch (error) {
          warnLog("Error setting group language:", error);
      }
  };
  const handleSetGroupProfile = async (groupId, field, value) => {
      const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', activeSessionCode);
      try {
        await updateDoc(sessionRef, {
            [`groups.${groupId}.${field}`]: value
        });
      } catch (error) {
          warnLog(`Error setting group ${field}:`, error);
      }
  };"""

count2 = content.count(old_handler_end)
if count2 != 1:
    print(f"ERROR: Expected 1 occurrence of handleSetGroupLanguage block, found {count2}")
    sys.exit(1)
content = content.replace(old_handler_end, new_handler_block)
print(f"[OK] Added handleSetGroupProfile handler")

# Write
open(filepath, 'w', encoding='utf-8').write(content)
print(f"\nAll Phase 1a handler changes applied successfully.")
