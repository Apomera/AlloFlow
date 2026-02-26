"""Fix session start bug: Firestore rejects undefined values.
Root cause: history items contain undefined fields (e.g. config.standards, config.interests).
Fix: Add stripUndefined sanitizer before setDoc calls.
Also fixes the diagnostic resourcesToUpload scope error.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()
changes = 0

# --- FIX 1: Add stripUndefined utility right before uploadSessionAssets ---
old_upload_def = "const uploadSessionAssets = async (appId, resources) => {"
new_upload_def = """// Recursively strip undefined values from objects (Firestore rejects undefined)
const stripUndefined = (obj) => {
    if (obj === null || obj === undefined) return null;
    if (Array.isArray(obj)) return obj.map(stripUndefined);
    if (typeof obj === 'object' && !(obj instanceof Date)) {
        return Object.fromEntries(
            Object.entries(obj)
                .filter(([_, v]) => v !== undefined)
                .map(([k, v]) => [k, stripUndefined(v)])
        );
    }
    return obj;
};
const uploadSessionAssets = async (appId, resources) => {"""

count = content.count(old_upload_def)
if count != 1:
    print(f"ERROR: uploadSessionAssets def match count: {count}")
    sys.exit(1)
content = content.replace(old_upload_def, new_upload_def)
changes += 1
print(f"[OK] Added stripUndefined utility")

# --- FIX 2: Apply stripUndefined to the resources before structuredClone ---
# Find the line after the diagnostic pre-check block
old_clone_line = "    const safeResources = structuredClone(resources);"
new_clone_line = "    const safeResources = structuredClone(stripUndefined(resources));"

count = content.count(old_clone_line)
if count != 1:
    print(f"ERROR: structuredClone in uploadSessionAssets match count: {count}")
    sys.exit(1)
content = content.replace(old_clone_line, new_clone_line)
changes += 1
print(f"[OK] Applied stripUndefined to uploadSessionAssets resources")

# --- FIX 3: Apply stripUndefined to the setDoc payload in startClassSession ---
old_setdoc_line = "        await setDoc(sessionRef, {\n            resources: lightweightResources,"
new_setdoc_line = "        await setDoc(sessionRef, stripUndefined({\n            resources: lightweightResources,"

count = content.count(old_setdoc_line)
if count != 1:
    print(f"ERROR: setDoc in startClassSession match count: {count}")
    sys.exit(1)
content = content.replace(old_setdoc_line, new_setdoc_line)
changes += 1
print(f"[OK] Applied stripUndefined to setDoc payload")

# Close the stripUndefined wrapper - find the closing of the setDoc call
old_setdoc_close = """            teams: {} 
            }
        });"""
new_setdoc_close = """            teams: {} 
            }
        }));"""

count = content.count(old_setdoc_close)
if count != 1:
    print(f"ERROR: setDoc close match count: {count}")
    sys.exit(1)
content = content.replace(old_setdoc_close, new_setdoc_close)
changes += 1
print(f"[OK] Closed stripUndefined wrapper on setDoc payload")

# --- FIX 4: Fix the diagnostic resourcesToUpload scope error in catch block ---
old_debug_scope = """        console.error("[SESSION DEBUG] Resources count:", resourcesToUpload?.length);"""
new_debug_scope = """        console.error("[SESSION DEBUG] Resources count:", history?.length, "total history items");"""

count = content.count(old_debug_scope)
if count != 1:
    print(f"ERROR: diagnostic scope fix match count: {count}")
    sys.exit(1)
content = content.replace(old_debug_scope, new_debug_scope)
changes += 1
print(f"[OK] Fixed diagnostic resourcesToUpload scope error")

# --- FIX 5: Also fix the lightweightResources scope reference in the catch ---
old_lw_ref = """            const payloadTest = JSON.stringify(lightweightResources);
            console.error("[SESSION DEBUG] Payload size:", payloadTest?.length, "chars (~", Math.round((payloadTest?.length || 0)/1024), "KB)");
        } catch(jsonErr) {
            console.error("[SESSION DEBUG] JSON.stringify FAILED:", jsonErr?.message);
            console.error("[SESSION DEBUG] This means non-serializable data in resources");
            // Find which resource is problematic
            if (Array.isArray(lightweightResources)) {
                lightweightResources.forEach((r, i) => {
                    try { JSON.stringify(r); } catch(e2) {
                        console.error(`[SESSION DEBUG] Resource ${i} (${r?.type}/${r?.title}) is NOT serializable:`, e2?.message);
                    }
                });
            }
        }"""

new_lw_ref = """            const historyFiltered = history.filter(h => h.id);
            const payloadTest = JSON.stringify(historyFiltered);
            console.error("[SESSION DEBUG] Payload size:", payloadTest?.length, "chars (~", Math.round((payloadTest?.length || 0)/1024), "KB)");
        } catch(jsonErr) {
            console.error("[SESSION DEBUG] JSON.stringify FAILED:", jsonErr?.message);
        }"""

count = content.count(old_lw_ref)
if count != 1:
    print(f"ERROR: lightweightResources in catch match count: {count}")
    sys.exit(1)
content = content.replace(old_lw_ref, new_lw_ref)
changes += 1
print(f"[OK] Fixed lightweightResources scope error in catch block")

# --- FIX 6: Also apply stripUndefined to the sync useEffect that pushes resources ---
old_sync_update = "               await updateDoc(sessionRef, { resources: lightweightResources });"
new_sync_update = "               await updateDoc(sessionRef, stripUndefined({ resources: lightweightResources }));"

count = content.count(old_sync_update)
if count != 1:
    print(f"ERROR: sync updateDoc match count: {count}")
    sys.exit(1)
content = content.replace(old_sync_update, new_sync_update)
changes += 1
print(f"[OK] Applied stripUndefined to resource sync updateDoc")

# --- FIX 7: Also apply to the local mock session setSessionData (for consistency) ---
old_mock = """            setSessionData({
                resources: mockResources,"""
new_mock = """            setSessionData(stripUndefined({
                resources: mockResources,"""

count = content.count(old_mock)
if count != 1:
    print(f"ERROR: mock session match count: {count}")
    sys.exit(1)
content = content.replace(old_mock, new_mock)
changes += 1
print(f"[OK] Applied stripUndefined to mock session data")

# Close the mock session wrapper
old_mock_close = """                quizState: { isActive: false, mode: 'live-pulse', currentQuestionIndex: 0, phase: 'idle', responses: {}, bossStats: { maxHP: 1000, currentHP: 1000, classHP: 100, name: "The Knowledge Keeper", lastDamage: 0 }, teams: {} }
            });"""
new_mock_close = """                quizState: { isActive: false, mode: 'live-pulse', currentQuestionIndex: 0, phase: 'idle', responses: {}, bossStats: { maxHP: 1000, currentHP: 1000, classHP: 100, name: "The Knowledge Keeper", lastDamage: 0 }, teams: {} }
            }));"""

count = content.count(old_mock_close)
if count != 1:
    print(f"ERROR: mock close match count: {count}")
    sys.exit(1)
content = content.replace(old_mock_close, new_mock_close)
changes += 1
print(f"[OK] Closed stripUndefined wrapper on mock session")

# Write
open(filepath, 'w', encoding='utf-8').write(content)
print(f"\nAll {changes} fixes applied successfully.")
print("Root cause: Firestore rejects undefined values in documents.")
print("Fix: stripUndefined() recursively removes undefined from all session payloads.")
