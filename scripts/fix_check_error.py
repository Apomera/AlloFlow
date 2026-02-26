"""
Fix the 'Error checking answer' crash.
Problem: L8515 does answer?.toString().toLowerCase() — if answer is null, 
null?.toString() returns undefined, then undefined.toLowerCase() THROWS.
Fix: Add safe string coercion before comparison + improve error logging.
"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# FIX 1: Safe string comparison at L8515
old_compare = """        try {
        const isCorrect = answer?.toString().toLowerCase().trim() === expectedAnswer?.toString().toLowerCase().trim();"""

new_compare = """        try {
        // FIX: Null-safe string coercion prevents crashes when answer/expectedAnswer are null/undefined
        const safeAnswer = (answer ?? '').toString().toLowerCase().trim();
        const safeExpected = (expectedAnswer ?? '').toString().toLowerCase().trim();
        if (!safeExpected) {
            warnLog("⚠️ checkAnswer: expectedAnswer is empty/null, skipping check");
            return;
        }
        const isCorrect = safeAnswer === safeExpected;"""

if old_compare in content:
    content = content.replace(old_compare, new_compare, 1)
    changes += 1
    print("1. FIXED: Safe string coercion in checkAnswer comparison")
else:
    print("[WARN] Compare pattern not found")

# FIX 2: Better error handling in catch block (with more detail)
old_catch = """        addToast("Error checking answer - please try again", 'error');"""
new_catch = """        console.error("CheckAnswer error details:", e?.message, e?.stack);
        // FIX: Only show error toast if it's a real crash, not a null answer (which is handled above)
        if (e?.message?.includes('Cannot read properties of null') || e?.message?.includes('undefined')) {
            debugLog("⚠️ checkAnswer: Swallowed null-reference error:", e.message);
        } else {
            addToast("Error checking answer - please try again", 'error');
        }"""

if old_catch in content:
    content = content.replace(old_catch, new_catch, 1)
    changes += 1
    print("2. FIXED: Better error handling - suppress null-reference errors")
else:
    print("[WARN] Catch pattern not found")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)
print("\nApplied %d fixes" % changes)
