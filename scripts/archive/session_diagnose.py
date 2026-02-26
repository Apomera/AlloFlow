"""Diagnose session start failure: add detailed console.log statements to 
startClassSession and uploadSessionAssets to capture the exact error and data sizes.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()
changes = 0

# --- CHANGE 1: Add diagnostic logging to the catch block in startClassSession ---
old_catch = """    } catch (e) {
        warnLog("Session Start Error:", e);
        // Fallback: Create local mock session for Canvas edit mode development"""

new_catch = """    } catch (e) {
        warnLog("Session Start Error:", e);
        console.error("[SESSION DEBUG] Full error object:", e);
        console.error("[SESSION DEBUG] Error name:", e?.name);
        console.error("[SESSION DEBUG] Error code:", e?.code);
        console.error("[SESSION DEBUG] Error message:", e?.message);
        console.error("[SESSION DEBUG] Resources count:", resourcesToUpload?.length);
        try {
            const payloadTest = JSON.stringify(lightweightResources);
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
        }
        // Fallback: Create local mock session for Canvas edit mode development"""

count = content.count(old_catch)
if count != 1:
    print(f"ERROR: catch block match count: {count}")
    sys.exit(1)
content = content.replace(old_catch, new_catch)
changes += 1
print(f"[OK] Added diagnostic logging to catch block")

# --- CHANGE 2: Add diagnostic logging inside uploadSessionAssets ---
old_upload_start = """const uploadSessionAssets = async (appId, resources) => {
    const safeResources = structuredClone(resources);"""

new_upload_start = """const uploadSessionAssets = async (appId, resources) => {
    console.log("[SESSION DEBUG] uploadSessionAssets called, resources:", resources?.length);
    // Pre-check: detect non-cloneable data before structuredClone crashes
    try {
        resources.forEach((r, i) => {
            try { 
                structuredClone(r);
            } catch (cloneErr) {
                console.error(`[SESSION DEBUG] Resource ${i} (${r?.type}/${r?.title}) CANNOT be cloned:`, cloneErr?.message);
                // Log which keys are problematic
                if (r && typeof r === 'object') {
                    Object.keys(r).forEach(key => {
                        try { structuredClone(r[key]); } catch(keyErr) {
                            console.error(`[SESSION DEBUG]   Key "${key}" is NOT cloneable:`, keyErr?.message, typeof r[key]);
                            if (key === 'data' && r[key] && typeof r[key] === 'object') {
                                Object.keys(r[key]).forEach(subKey => {
                                    try { structuredClone(r[key][subKey]); } catch(subErr) {
                                        console.error(`[SESSION DEBUG]     data.${subKey} is NOT cloneable:`, subErr?.message, typeof r[key][subKey]);
                                    }
                                });
                            }
                        }
                    });
                }
            }
        });
    } catch(preCheckErr) {
        console.error("[SESSION DEBUG] Pre-check error:", preCheckErr);
    }
    const safeResources = structuredClone(resources);"""

count = content.count(old_upload_start)
if count != 1:
    print(f"ERROR: uploadSessionAssets start match count: {count}")
    sys.exit(1)
content = content.replace(old_upload_start, new_upload_start)
changes += 1
print(f"[OK] Added diagnostic pre-check to uploadSessionAssets")

# --- CHANGE 3: Add data size estimation before the setDoc call ---
old_setdoc = """        const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', code);
        await setDoc(sessionRef, {
            resources: lightweightResources, 
            mode: 'sync',"""

new_setdoc = """        const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', code);
        // Session payload size check
        const sessionPayload = {
            resources: lightweightResources, 
            mode: 'sync',
            currentResourceId: null,
            createdAt: new Date().toISOString(),
            hostId: user?.uid,
        };
        try {
            const payloadStr = JSON.stringify(sessionPayload);
            const payloadSizeKB = Math.round(payloadStr.length / 1024);
            console.log(`[SESSION DEBUG] Session payload size: ${payloadSizeKB}KB (${payloadStr.length} chars). Firestore limit is ~1MB.`);
            if (payloadSizeKB > 800) {
                console.warn(`[SESSION DEBUG] ⚠️ Payload is ${payloadSizeKB}KB — dangerously close to Firestore 1MB limit!`);
            }
        } catch(sizeErr) {
            console.error("[SESSION DEBUG] Cannot serialize payload:", sizeErr?.message);
        }
        await setDoc(sessionRef, {
            resources: lightweightResources, 
            mode: 'sync',"""

count = content.count(old_setdoc)
if count != 1:
    print(f"ERROR: setDoc match count: {count}")
    sys.exit(1)
content = content.replace(old_setdoc, new_setdoc)
changes += 1
print(f"[OK] Added payload size estimation before setDoc")

# Write
open(filepath, 'w', encoding='utf-8').write(content)
print(f"\nAll {changes} diagnostic changes applied successfully.")
print("User should now reproduce the error and check browser console for [SESSION DEBUG] messages.")
